// Core Types for VedaAI Assessment Tool

/**
 * Uploaded file information
 */
export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  buffer: Buffer;
  uploadedAt: Date;
}

/**
 * Extracted question from question paper
 */
export interface ExtractedQuestion {
  id: string;
  number: string; // e.g., "1", "1a", "2b"
  text: string;
  marks?: number;
  page: number;
}

/**
 * Bounding box coordinates (normalized 0-1000)
 * Format: [ymin, xmin, ymax, xmax]
 */
export type BoundingBox = [number, number, number, number];

/**
 * Detected answer region on answer sheet
 */
export interface DetectedAnswer {
  id: string;
  questionNumber?: string; // Written by student
  transcribedText?: string; // OCR result
  boundingBox: BoundingBox;
  page: number;
  confidence?: number;
}

/**
 * Mapped question-answer pair
 */
export interface MappedPair {
  questionId: string;
  answerId: string;
  confidence: number; // 0-1
  method: 'exact' | 'fuzzy' | 'sequence' | 'manual';
}

/**
 * Grading result for a single question
 */
export interface GradingResult {
  questionId: string;
  score: number;
  maxScore: number;
  feedback: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
}

/**
 * Processing stage status
 */
export type ProcessingStage =
  | 'idle'
  | 'validating'
  | 'converting'
  | 'extracting'
  | 'detecting'
  | 'mapping'
  | 'grading'
  | 'complete'
  | 'error';

/**
 * Processing progress event (for SSE)
 */
export interface ProcessingProgress {
  stage: ProcessingStage;
  progress: number; // 0-100
  message: string;
  details?: string;
  error?: string;
}

/**
 * Complete processing results
 */
export interface ProcessingResults {
  sessionId: string;
  questions: ExtractedQuestion[];
  answers: DetectedAnswer[];
  mappings: MappedPair[];
  grades?: GradingResult[];
  questionPaperImages: string[]; // Base64 or file paths
  answerSheetImages: string[]; // Base64 or file paths
  completedAt: Date;
}

/**
 * Session data stored in memory
 */
export interface Session {
  id: string;
  questionPaper?: UploadedFile;
  answerSheet?: UploadedFile;
  results?: ProcessingResults;
  status: ProcessingStage;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * API error response
 */
export interface APIError {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * File validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * OpenAI structured output schemas
 */

// Question extraction schema
export interface QuestionExtractionOutput {
  questions: Array<{
    number: string;
    text: string;
    marks?: number;
    page: number;
  }>;
}

// Answer detection schema
export interface AnswerDetectionOutput {
  answers: Array<{
    questionNumber?: string;
    transcribedText?: string;
    boundingBox: [number, number, number, number];
    page: number;
  }>;
}

// Grading schema
export interface GradingOutput {
  score: number;
  maxScore: number;
  feedback: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
}

/**
 * Processing options
 */
export interface ProcessingOptions {
  enableGrading?: boolean;
  customRubric?: string;
  maxRetries?: number;
  timeoutMs?: number;
}
