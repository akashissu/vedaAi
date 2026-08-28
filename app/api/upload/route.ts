import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/store';
import { FILE_LIMITS, ERROR_CODES, HTTP_STATUS } from '@/lib/constants';
import { getFileExtension } from '@/lib/utils';
import { resolveMimeType, validatePdf, validateImage } from '@/lib/pdf-utils';

export const runtime = 'nodejs';
export const maxDuration = 60;

function isAllowedExtension(ext: string): boolean {
  return FILE_LIMITS.ALLOWED_EXTENSIONS.includes(
    ext as (typeof FILE_LIMITS.ALLOWED_EXTENSIONS)[number]
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const questionPaperFile = formData.get('questionPaper') as File | null;
    const answerSheetFile = formData.get('answerSheet') as File | null;

    if (!questionPaperFile || !answerSheetFile) {
      return NextResponse.json(
        {
          error: 'Both question paper and answer sheet are required',
          code: ERROR_CODES.NO_FILE_UPLOADED,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const qpExt = getFileExtension(questionPaperFile.name);
    const asExt = getFileExtension(answerSheetFile.name);

    if (!isAllowedExtension(qpExt) || !isAllowedExtension(asExt)) {
      return NextResponse.json(
        {
          error: 'Invalid file type. Only PDF, PNG, JPG, and JPEG are allowed',
          code: ERROR_CODES.INVALID_FILE_TYPE,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (
      questionPaperFile.size > FILE_LIMITS.MAX_SIZE_BYTES ||
      answerSheetFile.size > FILE_LIMITS.MAX_SIZE_BYTES
    ) {
      return NextResponse.json(
        {
          error: `Files must be smaller than ${FILE_LIMITS.MAX_SIZE_MB}MB`,
          code: ERROR_CODES.FILE_TOO_LARGE,
        },
        { status: HTTP_STATUS.PAYLOAD_TOO_LARGE }
      );
    }

    const qpBuffer = Buffer.from(await questionPaperFile.arrayBuffer());
    const asBuffer = Buffer.from(await answerSheetFile.arrayBuffer());

    const qpMime = resolveMimeType(questionPaperFile.name, questionPaperFile.type);
    const asMime = resolveMimeType(answerSheetFile.name, answerSheetFile.type);

    if (qpMime === 'application/pdf' && !(await validatePdf(qpBuffer))) {
      return NextResponse.json(
        {
          error: 'Question paper is not a valid PDF',
          code: ERROR_CODES.INVALID_FILE_TYPE,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (asMime === 'application/pdf' && !(await validatePdf(asBuffer))) {
      return NextResponse.json(
        {
          error: 'Answer sheet is not a valid PDF',
          code: ERROR_CODES.INVALID_FILE_TYPE,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (qpMime.startsWith('image/') && !(await validateImage(qpBuffer))) {
      return NextResponse.json(
        {
          error: 'Question paper is not a valid image',
          code: ERROR_CODES.INVALID_FILE_TYPE,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (asMime.startsWith('image/') && !(await validateImage(asBuffer))) {
      return NextResponse.json(
        {
          error: 'Answer sheet is not a valid image',
          code: ERROR_CODES.INVALID_FILE_TYPE,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const sessionId = sessionStore.createSession();

    sessionStore.setQuestionPaper(sessionId, {
      id: `qp_${sessionId}`,
      name: questionPaperFile.name,
      type: qpMime,
      size: questionPaperFile.size,
      buffer: qpBuffer,
      uploadedAt: new Date(),
    });

    sessionStore.setAnswerSheet(sessionId, {
      id: `as_${sessionId}`,
      name: answerSheetFile.name,
      type: asMime,
      size: answerSheetFile.size,
      buffer: asBuffer,
      uploadedAt: new Date(),
    });

    console.log(`Files uploaded for session ${sessionId}`);

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Files uploaded successfully',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload files',
        code: ERROR_CODES.INTERNAL_ERROR,
        details: (error as Error).message,
      },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}
