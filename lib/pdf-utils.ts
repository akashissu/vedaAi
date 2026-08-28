// PDF Processing Utilities

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { PDF_CONFIG } from './constants';

let pdfWorkerConfigured = false;

async function getPdfjsLib() {
  // webpackIgnore prevents webpack from trying to bundle this ESM .mjs package
  const pdfjsLib = await import(/* webpackIgnore: true */ 'pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsLib;
}

async function configurePdfWorker(): Promise<void> {
  if (pdfWorkerConfigured) return;

  const pdfjsLib = await getPdfjsLib();
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')
  ).toString();

  pdfWorkerConfigured = true;
}

/**
 * Convert PDF buffer to array of PNG images (Base64)
 */
export async function pdfToImages(pdfBuffer: Buffer): Promise<string[]> {
  await configurePdfWorker();

  const { createCanvas } = await import(/* webpackIgnore: true */ '@napi-rs/canvas');
  const pdfjsLib = await getPdfjsLib();

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

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

/**
 * Convert image buffer to Base64 PNG
 */
export async function imageToBase64(
  buffer: Buffer,
  _mimeType: string
): Promise<string> {
  try {
    const pngBuffer = await sharp(buffer)
      .png({
        quality: PDF_CONFIG.IMAGE_QUALITY,
        compressionLevel: 6,
      })
      .toBuffer();

    return pngBuffer.toString('base64');
  } catch (error) {
    console.error('Image to Base64 conversion failed:', error);
    throw new Error(`Failed to convert image: ${(error as Error).message}`);
  }
}

/**
 * Get PDF page count
 */
export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error('Failed to get PDF page count:', error);
    throw new Error(`Failed to read PDF: ${(error as Error).message}`);
  }
}

/**
 * Validate PDF file
 */
export async function validatePdf(buffer: Buffer): Promise<boolean> {
  try {
    await PDFDocument.load(buffer);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate image file
 */
export async function validateImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return !!(metadata.width && metadata.height);
  } catch {
    return false;
  }
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  try {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image dimensions');
    }

    return {
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    console.error('Failed to get image dimensions:', error);
    throw new Error(`Failed to read image: ${(error as Error).message}`);
  }
}

/**
 * Resize image if too large (for API limits)
 */
export async function resizeImageIfNeeded(
  buffer: Buffer,
  maxWidth: number = 2048,
  maxHeight: number = 2048
): Promise<Buffer> {
  try {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image');
    }

    if (metadata.width <= maxWidth && metadata.height <= maxHeight) {
      return buffer;
    }

    const resized = await sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png({ quality: PDF_CONFIG.IMAGE_QUALITY })
      .toBuffer();

    console.log(
      `Resized image from ${metadata.width}x${metadata.height} to fit ${maxWidth}x${maxHeight}`
    );

    return resized;
  } catch (error) {
    console.error('Image resize failed:', error);
    throw new Error(`Failed to resize image: ${(error as Error).message}`);
  }
}

/**
 * Resolve MIME type from file metadata or extension
 */
export function resolveMimeType(filename: string, mimeType?: string): string {
  if (mimeType && mimeType !== 'application/octet-stream') {
    return mimeType;
  }

  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    default:
      return mimeType || 'application/octet-stream';
  }
}

/**
 * Convert file to Base64 images array
 * Handles both PDF and image files
 */
export async function fileToBase64Images(
  buffer: Buffer,
  mimeType: string
): Promise<string[]> {
  if (mimeType === 'application/pdf') {
    return pdfToImages(buffer);
  }

  if (mimeType.startsWith('image/')) {
    const resized = await resizeImageIfNeeded(buffer);
    const base64 = await imageToBase64(resized, mimeType);
    return [base64];
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}
