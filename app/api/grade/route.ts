import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/store';
import { gradeSingleAnswer } from '@/lib/grading';
import { getAnswerForQuestion } from '@/lib/mapping';
import { ERROR_CODES, HTTP_STATUS } from '@/lib/constants';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Grade a single question (optional endpoint)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, questionId, customRubric } = body;

    if (!sessionId || !questionId) {
      return NextResponse.json(
        {
          error: 'Missing sessionId or questionId',
          code: ERROR_CODES.INVALID_SESSION,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Get session
    const session = sessionStore.getSession(sessionId);

    if (!session || !session.results) {
      return NextResponse.json(
        {
          error: 'Session not found or results not available',
          code: ERROR_CODES.INVALID_SESSION,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Find question
    const question = session.results.questions.find((q) => q.id === questionId);

    if (!question) {
      return NextResponse.json(
        {
          error: 'Question not found',
          code: ERROR_CODES.INVALID_SESSION,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Find answer
    const answer = getAnswerForQuestion(
      questionId,
      session.results.answers,
      session.results.mappings
    );

    if (!answer) {
      return NextResponse.json(
        {
          error: 'Answer not found for this question',
          code: ERROR_CODES.MAPPING_FAILED,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Grade the answer
    const result = await gradeSingleAnswer(question, answer, customRubric);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Grading error:', error);
    return NextResponse.json(
      {
        error: 'Failed to grade answer',
        code: ERROR_CODES.GRADING_FAILED,
        details: (error as Error).message,
      },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}
