import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/store';
import { ERROR_CODES, HTTP_STATUS } from '@/lib/constants';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        {
          error: 'Missing sessionId parameter',
          code: ERROR_CODES.INVALID_SESSION,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Get session
    const session = sessionStore.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        {
          error: 'Session not found or expired',
          code: ERROR_CODES.INVALID_SESSION,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    if (!session.results) {
      return NextResponse.json(
        {
          error: 'Results not available yet',
          code: ERROR_CODES.INTERNAL_ERROR,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Return results
    // Note: We're sending the first answer sheet image for display
    // In a production app, you might want to paginate or optimize this
    return NextResponse.json({
      questions: session.results.questions,
      answers: session.results.answers,
      mappings: session.results.mappings,
      answerSheetImages: session.results.answerSheetImages,
      answerSheetImage: session.results.answerSheetImages[0] || '',
      completedAt: session.results.completedAt,
    });
  } catch (error) {
    console.error('Results fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch results',
        code: ERROR_CODES.INTERNAL_ERROR,
        details: (error as Error).message,
      },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}
