import { FILE_LIMITS, ERROR_CODES } from './constants';
import { getFileExtension } from './utils';
import { resolveMimeType, validatePdf, validateImage } from './pdf-utils';
import type { UploadedFile } from './types';

function isAllowedExtension(ext: string): boolean {
  return FILE_LIMITS.ALLOWED_EXTENSIONS.includes(
    ext as (typeof FILE_LIMITS.ALLOWED_EXTENSIONS)[number]
  );
}

export async function parseUploadedFiles(formData: FormData): Promise<{
  questionPaper: UploadedFile;
  answerSheet: UploadedFile;
}> {
  const questionPaperFile = formData.get('questionPaper') as File | null;
  const answerSheetFile = formData.get('answerSheet') as File | null;

  if (!questionPaperFile || !answerSheetFile) {
    throw new Error('Both question paper and answer sheet are required');
  }

  const qpExt = getFileExtension(questionPaperFile.name);
  const asExt = getFileExtension(answerSheetFile.name);

  if (!isAllowedExtension(qpExt) || !isAllowedExtension(asExt)) {
    throw new Error('Invalid file type. Only PDF, PNG, JPG, and JPEG are allowed');
  }

  if (
    questionPaperFile.size > FILE_LIMITS.MAX_SIZE_BYTES ||
    answerSheetFile.size > FILE_LIMITS.MAX_SIZE_BYTES
  ) {
    throw new Error(`Files must be smaller than ${FILE_LIMITS.MAX_SIZE_MB}MB`);
  }

  const qpBuffer = Buffer.from(await questionPaperFile.arrayBuffer());
  const asBuffer = Buffer.from(await answerSheetFile.arrayBuffer());

  const qpMime = resolveMimeType(questionPaperFile.name, questionPaperFile.type);
  const asMime = resolveMimeType(answerSheetFile.name, answerSheetFile.type);

  if (qpMime === 'application/pdf' && !(await validatePdf(qpBuffer))) {
    throw new Error('Question paper is not a valid PDF');
  }

  if (asMime === 'application/pdf' && !(await validatePdf(asBuffer))) {
    throw new Error('Answer sheet is not a valid PDF');
  }

  if (qpMime.startsWith('image/') && !(await validateImage(qpBuffer))) {
    throw new Error('Question paper is not a valid image');
  }

  if (asMime.startsWith('image/') && !(await validateImage(asBuffer))) {
    throw new Error('Answer sheet is not a valid image');
  }

  const sessionSuffix = Date.now().toString(36);

  return {
    questionPaper: {
      id: `qp_${sessionSuffix}`,
      name: questionPaperFile.name,
      type: qpMime,
      size: questionPaperFile.size,
      buffer: qpBuffer,
      uploadedAt: new Date(),
    },
    answerSheet: {
      id: `as_${sessionSuffix}`,
      name: answerSheetFile.name,
      type: asMime,
      size: answerSheetFile.size,
      buffer: asBuffer,
      uploadedAt: new Date(),
    },
  };
}

export function uploadErrorCode(message: string): string {
  if (message.includes('required')) return ERROR_CODES.NO_FILE_UPLOADED;
  if (message.includes('Invalid file type')) return ERROR_CODES.INVALID_FILE_TYPE;
  if (message.includes('smaller than')) return ERROR_CODES.FILE_TOO_LARGE;
  return ERROR_CODES.INTERNAL_ERROR;
}
