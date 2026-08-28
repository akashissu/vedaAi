// Application Constants

/**
 * File validation limits
 */
export const FILE_LIMITS = {
  MAX_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10),
  MAX_SIZE_BYTES: parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10) * 1024 * 1024,
  ALLOWED_TYPES: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ],
  ALLOWED_EXTENSIONS: ['.pdf', '.png', '.jpg', '.jpeg'],
} as const;

/**
 * Session configuration
 */
export const SESSION_CONFIG = {
  TTL_MINUTES: parseInt(process.env.SESSION_TTL_MINUTES || '30', 10),
  TTL_MS: parseInt(process.env.SESSION_TTL_MINUTES || '30', 10) * 60 * 1000,
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * OpenAI API configuration
 */
export const OPENAI_CONFIG = {
  MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
  VISION_MODEL: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
  /** Best model for bounding-box / spatial detection (gpt-4.1 > gpt-4o for docs) */
  DETECTION_MODEL: process.env.OPENAI_DETECTION_MODEL || 'gpt-4.1',
  TEMPERATURE: 0.1,
  MAX_TOKENS: 4000,
  TIMEOUT_MS: 120000, // 2 minutes
  MAX_RETRIES: 3,
  RATE_LIMIT_RPM: 500, // Tier 1 limit
  MIN_DELAY_MS: 120, // To stay under 500 RPM (60000ms / 500)
} as const;

/**
 * Processing stage progress weights
 */
export const STAGE_WEIGHTS = {
  validating: 5,
  converting: 10,
  extracting: 30,
  detecting: 40,
  mapping: 10,
  grading: 5,
} as const;

/**
 * Bounding box constraints
 */
export const BBOX_CONFIG = {
  MIN_VALUE: 0,
  MAX_VALUE: 1000,
  MIN_WIDTH: 10,
  MIN_HEIGHT: 10,
} as const;

/**
 * PDF processing configuration
 */
export const PDF_CONFIG = {
  IMAGE_FORMAT: 'png' as const,
  IMAGE_QUALITY: 95,
  DPI: 200,
  MAX_PAGES_QUESTION: 20,
  MAX_PAGES_ANSWER: 50,
} as const;

/**
 * Mapping algorithm configuration
 */
export const MAPPING_CONFIG = {
  EXACT_MATCH_THRESHOLD: 1.0,
  FUZZY_MATCH_THRESHOLD: 0.8,
  SEQUENCE_MATCH_THRESHOLD: 0.6,
  MAX_DISTANCE: 3, // For sequence matching
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  // Validation errors
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  NO_FILE_UPLOADED: 'NO_FILE_UPLOADED',
  INVALID_SESSION: 'INVALID_SESSION',
  
  // Processing errors
  EXTRACTION_FAILED: 'EXTRACTION_FAILED',
  DETECTION_FAILED: 'DETECTION_FAILED',
  MAPPING_FAILED: 'MAPPING_FAILED',
  GRADING_FAILED: 'GRADING_FAILED',
  
  // API errors
  OPENAI_ERROR: 'OPENAI_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  NOT_IMPLEMENTED: 501,
} as const;

/**
 * Content types
 */
export const CONTENT_TYPES = {
  JSON: 'application/json',
  SSE: 'text/event-stream',
  PDF: 'application/pdf',
  PNG: 'image/png',
  JPEG: 'image/jpeg',
} as const;
