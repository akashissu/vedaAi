// General Utility Functions

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { randomBytes } from 'crypto';

/**
 * Merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate a unique ID with prefix
 */
export function generateId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

/**
 * Sleep for specified milliseconds (for rate limiting)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Validate file extension
 */
export function getFileExtension(filename: string): string {
  const ext = filename.toLowerCase().match(/\.[^.]+$/);
  return ext ? ext[0] : '';
}

/**
 * Parse question number (handles "1", "1a", "1.2", etc.)
 */
export function parseQuestionNumber(num: string): {
  main: number;
  sub?: string;
} {
  const match = num.match(/^(\d+)([a-z])?$/i);
  if (match) {
    return {
      main: parseInt(match[1], 10),
      sub: match[2]?.toLowerCase(),
    };
  }
  // Handle "1.1" format
  const dotMatch = num.match(/^(\d+)\.(\d+)$/);
  if (dotMatch) {
    return {
      main: parseInt(dotMatch[1], 10),
      sub: dotMatch[2],
    };
  }
  // Fallback: try to extract first number
  const numMatch = num.match(/\d+/);
  if (numMatch) {
    return { main: parseInt(numMatch[0], 10) };
  }
  return { main: 0 };
}

/**
 * Compare two question numbers for sorting
 */
export function compareQuestionNumbers(a: string, b: string): number {
  const parsedA = parseQuestionNumber(a);
  const parsedB = parseQuestionNumber(b);
  
  // Compare main numbers
  if (parsedA.main !== parsedB.main) {
    return parsedA.main - parsedB.main;
  }
  
  // Compare sub-parts (a < b < c, or 1 < 2 < 3)
  if (parsedA.sub && parsedB.sub) {
    return parsedA.sub.localeCompare(parsedB.sub);
  }
  
  if (parsedA.sub) return 1; // a has sub, b doesn't
  if (parsedB.sub) return -1; // b has sub, a doesn't
  
  return 0;
}

/**
 * Convert bounding box from normalized (0-1000) to pixel coordinates
 */
export function bboxToPixels(
  bbox: [number, number, number, number],
  pageWidth: number,
  pageHeight: number
): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const [ymin, xmin, ymax, xmax] = bbox;
  return {
    left: (xmin / 1000) * pageWidth,
    top: (ymin / 1000) * pageHeight,
    width: ((xmax - xmin) / 1000) * pageWidth,
    height: ((ymax - ymin) / 1000) * pageHeight,
  };
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError!;
}

/**
 * Sanitize text for safe display
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Calculate progress percentage based on stage weights
 */
export function calculateProgress(
  stage: string,
  stageProgress: number,
  weights: Record<string, number>
): number {
  const stages = Object.keys(weights);
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  
  let completedWeight = 0;
  for (const s of stages) {
    if (s === stage) {
      // Current stage: add partial progress
      completedWeight += weights[s] * (stageProgress / 100);
      break;
    } else {
      // Completed stages: add full weight
      completedWeight += weights[s];
    }
  }
  
  return Math.min(100, Math.round((completedWeight / totalWeight) * 100));
}

/**
 * Validate bounding box coordinates
 */
export function isValidBoundingBox(
  bbox: [number, number, number, number],
  min: number = 0,
  max: number = 1000
): boolean {
  const [ymin, xmin, ymax, xmax] = bbox;
  
  // Check range
  if (
    ymin < min ||
    xmin < min ||
    ymax > max ||
    xmax > max
  ) {
    return false;
  }
  
  // Check order
  if (ymin >= ymax || xmin >= xmax) {
    return false;
  }
  
  // Check minimum size
  if (ymax - ymin < 10 || xmax - xmin < 10) {
    return false;
  }
  
  return true;
}
