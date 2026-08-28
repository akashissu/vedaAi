// Answer Detection — 3-Step Hybrid Pipeline
//
// Step 1 (AI)  : detectQuestionAnchors   — find Q-number Y positions on the page
// Step 2 (math): buildAnswerRegions      — compute full-height answer strips between anchors
// Step 3 (AI)  : ocrAnswerRegion         — transcribe the cropped strip for each answer
//
// External contract is unchanged: detectAnswers(imagesBase64) → DetectedAnswer[]

import sharp from 'sharp';
import { openaiClient } from './openai-client';
import {
  ANCHOR_DETECTION_PROMPT,
  SYSTEM_PROMPT_ANCHOR,
  ANSWER_OCR_PROMPT,
} from './prompts';
import { DetectedAnswer, BoundingBox } from './types';
import { generateId } from './utils';
import { OPENAI_CONFIG } from './constants';

// ─────────────────────────────────────────────────────────────
// Internal types (pipeline-only, not exported)
// ─────────────────────────────────────────────────────────────

interface QuestionAnchor {
  questionNumber: string;
  y: number; // normalized 0–1000
}

interface AnswerRegion {
  questionNumber: string;
  ymin: number;
  ymax: number;
  xmin: number;
  xmax: number;
}

interface AnchorDetectionOutput {
  anchors: Array<{ questionNumber: string | number; y: number }>;
}

// ─────────────────────────────────────────────────────────────
// Image utilities
// ─────────────────────────────────────────────────────────────

async function getImageDimensions(
  base64: string
): Promise<{ width: number; height: number }> {
  const meta = await sharp(Buffer.from(base64, 'base64')).metadata();
  return { width: meta.width ?? 1654, height: meta.height ?? 2339 };
}

/**
 * Crop a horizontal strip from the page image and return it as base64.
 * yminNorm / ymaxNorm are in normalized 0-1000 space.
 */
async function cropImageStrip(
  base64: string,
  yminNorm: number,
  ymaxNorm: number,
  imgWidth: number,
  imgHeight: number
): Promise<string> {
  const top = Math.max(0, Math.floor((yminNorm / 1000) * imgHeight));
  const bottom = Math.min(imgHeight, Math.ceil((ymaxNorm / 1000) * imgHeight));
  const cropHeight = bottom - top;

  if (cropHeight < 5) {
    throw new Error(`Crop strip too small: ${cropHeight}px`);
  }

  const cropped = await sharp(Buffer.from(base64, 'base64'))
    .extract({ left: 0, top, width: imgWidth, height: cropHeight })
    .png()
    .toBuffer();

  return cropped.toString('base64');
}

// ─────────────────────────────────────────────────────────────
// Step 1 — Question Anchor Detection (1 AI call per page)
// ─────────────────────────────────────────────────────────────

async function detectQuestionAnchors(
  imageBase64: string,
  pageNumber: number
): Promise<QuestionAnchor[]> {
  console.log(`Step 1: Detecting question anchors on page ${pageNumber}...`);

  const message = openaiClient.createVisionMessage(ANCHOR_DETECTION_PROMPT, imageBase64);

  const response = await openaiClient.chatCompletion(
    [{ role: 'system', content: SYSTEM_PROMPT_ANCHOR }, message],
    {
      model: OPENAI_CONFIG.DETECTION_MODEL,
      responseFormat: 'json_object',
      temperature: 0,
    }
  );

  const output = openaiClient.parseJsonResponse<AnchorDetectionOutput>(response);

  const anchors: QuestionAnchor[] = (output.anchors ?? [])
    .filter(
      (a) =>
        a.questionNumber != null &&
        typeof a.y === 'number' &&
        a.y >= 0 &&
        a.y <= 1000
    )
    .map((a) => ({
      questionNumber: String(a.questionNumber).trim(),
      y: Math.round(a.y),
    }))
    .sort((a, b) => a.y - b.y);

  console.log(`  Found ${anchors.length} anchors:`, anchors.map((a) => `Q${a.questionNumber}@y=${a.y}`).join(', '));
  return anchors;
}

// ─────────────────────────────────────────────────────────────
// Step 2 — Answer Region Construction (pure math, no AI)
// ─────────────────────────────────────────────────────────────

function buildAnswerRegions(anchors: QuestionAnchor[]): AnswerRegion[] {
  if (anchors.length === 0) return [];

  const regions: AnswerRegion[] = [];

  for (let i = 0; i < anchors.length; i++) {
    const current = anchors[i];
    const next = anchors[i + 1];

    // Anchors now mark the ANSWER START line directly — no offset needed.
    // A tiny -5 pull-up ensures the top of the "Ans." line is fully inside the box.
    const ymin = Math.max(0, current.y - 5);

    // End just before the next answer starts (which is also before the next question label),
    // or near page bottom for the last answer on the page.
    const ymax = next ? Math.max(next.y - 30, ymin + 20) : 975;

    regions.push({
      questionNumber: current.questionNumber,
      ymin,
      ymax,
      xmin: 15,
      xmax: 985,
    });
  }

  return regions;
}

// ─────────────────────────────────────────────────────────────
// Step 3 — Answer OCR (1 AI call per answer region)
// ─────────────────────────────────────────────────────────────

async function ocrAnswerRegion(
  imageBase64: string,
  region: AnswerRegion,
  imgWidth: number,
  imgHeight: number
): Promise<string> {
  const croppedBase64 = await cropImageStrip(
    imageBase64,
    region.ymin,
    region.ymax,
    imgWidth,
    imgHeight
  );

  const message = openaiClient.createVisionMessage(ANSWER_OCR_PROMPT, croppedBase64);

  const response = await openaiClient.chatCompletion([message], {
    model: OPENAI_CONFIG.VISION_MODEL,
    temperature: 0,
  });

  return openaiClient.extractTextContent(response).trim();
}

// ─────────────────────────────────────────────────────────────
// Main pipeline — single page
// ─────────────────────────────────────────────────────────────

export async function detectAnswersOnPage(
  imageBase64: string,
  pageNumber: number
): Promise<DetectedAnswer[]> {
  console.log(`Detecting answers on page ${pageNumber} (3-step pipeline)...`);

  const { width, height } = await getImageDimensions(imageBase64);

  // Step 1
  const anchors = await detectQuestionAnchors(imageBase64, pageNumber);

  if (anchors.length === 0) {
    console.warn(`  No question anchors found on page ${pageNumber} — skipping`);
    return [];
  }

  // Step 2
  const regions = buildAnswerRegions(anchors);
  console.log(`Step 2: Built ${regions.length} answer regions`);

  // Step 3 — sequential OCR per region
  const answers: DetectedAnswer[] = [];

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];

    if (i > 0) {
      // Small delay between OCR calls to stay within rate limits
      await new Promise((r) => setTimeout(r, 150));
    }

    try {
      const transcribedText = await ocrAnswerRegion(imageBase64, region, width, height);

      answers.push({
        id: generateId('a'),
        questionNumber: region.questionNumber,
        transcribedText: transcribedText || undefined,
        boundingBox: [region.ymin, region.xmin, region.ymax, region.xmax] as BoundingBox,
        page: pageNumber,
      });

      console.log(`  Q${region.questionNumber}: OCR complete (${transcribedText.length} chars)`);
    } catch (err) {
      console.error(`  OCR failed for Q${region.questionNumber}:`, err);
      // Add a box even without text so the UI still shows the region
      answers.push({
        id: generateId('a'),
        questionNumber: region.questionNumber,
        transcribedText: undefined,
        boundingBox: [region.ymin, region.xmin, region.ymax, region.xmax] as BoundingBox,
        page: pageNumber,
      });
    }
  }

  console.log(`Detected ${answers.length} answers on page ${pageNumber}`);
  return answers;
}

// ─────────────────────────────────────────────────────────────
// Main pipeline — all pages (public API, signature unchanged)
// ─────────────────────────────────────────────────────────────

export async function detectAnswers(
  imagesBase64: string[]
): Promise<DetectedAnswer[]> {
  console.log(`Detecting answers on ${imagesBase64.length} page(s)...`);

  const allAnswers: DetectedAnswer[] = [];

  for (let i = 0; i < imagesBase64.length; i++) {
    const pageAnswers = await detectAnswersOnPage(imagesBase64[i], i + 1);
    allAnswers.push(...pageAnswers);

    if (i < imagesBase64.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log(`Detected ${allAnswers.length} total answers`);
  if (allAnswers.length > 0) {
    console.log('Sample answers:', allAnswers.slice(0, 2));
  }

  return allAnswers;
}

// ─────────────────────────────────────────────────────────────
// Utility helpers (public, used by mapping.ts etc.)
// ─────────────────────────────────────────────────────────────

export function validateDetectedAnswers(
  answers: DetectedAnswer[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (answers.length === 0) errors.push('No answers detected');
  for (const a of answers) {
    if (a.page < 1) errors.push(`Answer ${a.id} has invalid page number`);
  }
  return { valid: errors.length === 0, errors };
}

export function filterAnswersByPage(
  answers: DetectedAnswer[],
  page: number
): DetectedAnswer[] {
  return answers.filter((a) => a.page === page);
}

export function getAnswersWithQuestionNumbers(
  answers: DetectedAnswer[]
): DetectedAnswer[] {
  return answers.filter((a) => a.questionNumber !== undefined);
}

export function getOrphanAnswers(answers: DetectedAnswer[]): DetectedAnswer[] {
  return answers.filter((a) => a.questionNumber === undefined);
}
