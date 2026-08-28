// PDF Processing Utilities

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { PDF_CONFIG } from './constants';

// ─────────────────────────────────────────────
// pdfjs worker setup
// ─────────────────────────────────────────────

let pdfWorkerConfigured = false;

async function getPdfjsLib() {
  const pdfjsLib = await import(/* webpackIgnore: true */ 'pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsLib;
}

/**
 * Configure the pdfjs GlobalWorkerOptions.workerSrc.
 *
 * On Vercel, node_modules lives at /var/task/node_modules.
 * We use process.cwd() which resolves to /var/task in production.
 * next.config.js `outputFileTracingIncludes` ensures the worker .mjs file
 * is copied into the deployment bundle.
 */
async function configurePdfWorker(): Promise<void> {
  if (pdfWorkerConfigured) return;

  const pdfjsLib = await getPdfjsLib();

  // Prefer the minified worker; fall back to the full worker
  const candidates = [
    path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs'),
    path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs'),
  ];

  let resolved = false;
  for (const candidate of candidates) {
    try {
      // fs.existsSync requires 'node:fs'
      const { existsSync } = await import('node:fs');
      if (existsSync(candidate)) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(candidate).href;
        console.log(`PDF worker: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
        resolved = true;
        break;
      }
    } catch {}
  }

  if (!resolved) {
    // Last resort: require.resolve (works on local dev, may fail on Vercel if file not traced)
    try {
      const { createRequire } = await import('node:module');
      const req = createRequire(import.meta.url);
      const workerPath = req.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
      console.log(`PDF worker (require.resolve): ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
    } catch (e) {
      throw new Error(
        `Could not locate pdfjs worker file. Ensure next.config.js outputFileTracingIncludes covers pdfjs-dist. Error: ${e}`
      );
    }
  }

  pdfWorkerConfigured = true;
}

// ─────────────────────────────────────────────
// PDF → images
// ─────────────────────────────────────────────

/**
 * Convert PDF buffer to an array of PNG images (Base64).
 * Uses pdfjs-dist + @napi-rs/canvas for server-side rendering.
 */
export async function pdfToImages(pdfBuffer: Buffer): Promise<string[]> {
  await configurePdfWorker();

  const { createCanvas } = await import(/* webpackIgnore: true */ '@napi-rs/canvas');
  const pdfjsLib = await getPdfjsLib();

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
    disableFontFace: true,
  } as Parameters<typeof pdfjsLib.getDocument>[0]).promise;

  const pageCount = pdf.numPages;
  console.log(`PDF has ${pageCount} pages`);

  const maxPages = Math.max(PDF_CONFIG.MAX_PAGES_QUESTION, PDF_CONFIG.MAX_PAGES_ANSWER);
  if (pageCount > maxPages) {
    await pdf.destroy();
    throw new Error(`PDF has too many pages (${pageCount}). Maximum is ${maxPages}.`);
  }

  const scale = PDF_CONFIG.DPI / 72;
  const images: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );
    const context = canvas.getContext('2d');

    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    const pngBuffer = await resizeImageIfNeeded(Buffer.from(canvas.toBuffer('image/png')));
    images.push(pngBuffer.toString('base64'));

    page.cleanup();
  }

  await pdf.destroy();
  return images;
}

// ─────────────────────────────────────────────
// Image utilities
// ─────────────────────────────────────────────

export async function imageToBase64(buffer: Buffer, _mimeType: string): Promise<string> {
  try {
    const pngBuffer = await sharp(buffer)
      .png({ quality: PDF_CONFIG.IMAGE_QUALITY, compressionLevel: 6 })
      .toBuffer();
    return pngBuffer.toString('base64');
  } catch (error) {
    throw new Error(`Failed to convert image: ${(error as Error).message}`);
  }
}

export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    return pdfDoc.getPageCount();
  } catch (error) {
    throw new Error(`Failed to read PDF: ${(error as Error).message}`);
  }
}

export async function validatePdf(buffer: Buffer): Promise<boolean> {
  try {
    await PDFDocument.load(buffer);
    return true;
  } catch {
    return false;
  }
}

export async function validateImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return !!(metadata.width && metadata.height);
  } catch {
    return false;
  }
}

export async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) throw new Error('Invalid image dimensions');
    return { width: metadata.width, height: metadata.height };
  } catch (error) {
    throw new Error(`Failed to read image: ${(error as Error).message}`);
  }
}

export async function resizeImageIfNeeded(
  buffer: Buffer,
  maxWidth = 2048,
  maxHeight = 2048
): Promise<Buffer> {
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) throw new Error('Invalid image');

    if (metadata.width <= maxWidth && metadata.height <= maxHeight) return buffer;

    const resized = await sharp(buffer)
      .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: PDF_CONFIG.IMAGE_QUALITY })
      .toBuffer();

    console.log(`Resized image from ${metadata.width}x${metadata.height} to fit ${maxWidth}x${maxHeight}`);
    return resized;
  } catch (error) {
    throw new Error(`Failed to resize image: ${(error as Error).message}`);
  }
}

export function resolveMimeType(filename: string, mimeType?: string): string {
  if (mimeType && mimeType !== 'application/octet-stream') return mimeType;

  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  switch (ext) {
    case '.pdf': return 'application/pdf';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    default: return mimeType || 'application/octet-stream';
  }
}

export async function fileToBase64Images(buffer: Buffer, mimeType: string): Promise<string[]> {
  if (mimeType === 'application/pdf') return pdfToImages(buffer);

  if (mimeType.startsWith('image/')) {
    const resized = await resizeImageIfNeeded(buffer);
    const base64 = await imageToBase64(resized, mimeType);
    return [base64];
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}
