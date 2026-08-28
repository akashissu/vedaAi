import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/store';
import { gradeSingleAnswer } from '@/lib/grading';
import { getAnswerForQuestion } from '@/lib/mapping';
import { ERROR_CODES, HTTP_STATUS } from '@/lib/constants';
import type { DetectedAnswer, ExtractedQuestion } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Grade a single question — stateless (question + answer in body) or via session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, questionId, question, answer, customRubric } = body as {
      sessionId?: string;
      questionId?: string;
      question?: ExtractedQuestion;
      answer?: DetectedAnswer;
      customRubric?: string;
    };

    let questionToGrade: ExtractedQuestion | undefined = question;
    let answerToGrade: DetectedAnswer | undefined = answer;

    // Stateless path — works on Vercel (no session store needed)
    if (questionToGrade && answerToGrade) {
      const result = await gradeSingleAnswer(questionToGrade, answerToGrade, customRubric);
      return NextResponse.json({ success: true, result });
    }

    // Legacy session-based path — local dev only
    if (!sessionId || !questionId) {
      return NextResponse.json(
        {
          error: 'Provide question + answer, or sessionId + questionId',
          code: ERROR_CODES.INVALID_SESSION,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const session = sessionStore.getSession(sessionId);

    if (!session?.results) {
      return NextResponse.json(
        {
          error: 'Session not found. Pass question and answer in the request body on Vercel.',
          code: ERROR_CODES.INVALID_SESSION,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    questionToGrade = session.results.questions.find((q) => q.id === questionId);

    if (!questionToGrade) {
      return NextResponse.json(
        { error: 'Question not found', code: ERROR_CODES.INVALID_SESSION },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    answerToGrade = getAnswerForQuestion(
      questionId,
      session.results.answers,
      session.results.mappings
    );

    if (!answerToGrade) {
      return NextResponse.json(
        { error: 'Answer not found for this question', code: ERROR_CODES.MAPPING_FAILED },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const result = await gradeSingleAnswer(questionToGrade, answerToGrade, customRubric);

    return NextResponse.json({ success: true, result });
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
