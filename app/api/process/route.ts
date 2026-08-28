import { NextRequest } from 'next/server';
import { sessionStore } from '@/lib/store';
import { fileToBase64Images } from '@/lib/pdf-utils';
import { extractQuestions } from '@/lib/extraction';
import { detectAnswers } from '@/lib/detection';
import { mapAnswersToQuestions } from '@/lib/mapping';
import { ERROR_CODES, STAGE_WEIGHTS } from '@/lib/constants';
import { calculateProgress } from '@/lib/utils';
import type { ProcessingResults } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 });
  }

  // Get session
  const session = sessionStore.getSession(sessionId);
  if (!session) {
    return new Response('Invalid session', { status: 404 });
  }

  if (!session.questionPaper || !session.answerSheet) {
    return new Response('Files not uploaded', { status: 400 });
  }

  const questionPaper = session.questionPaper;
  const answerSheet = session.answerSheet;

  // Setup SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Stage 1: Validating
        sessionStore.updateStatus(sessionId, 'validating');
        send({
          stage: 'validating',
          progress: calculateProgress('validating', 100, STAGE_WEIGHTS),
          message: 'Validating files...',
        });
        await new Promise((r) => setTimeout(r, 500));

        // Stage 2: Converting
        sessionStore.updateStatus(sessionId, 'converting');
        send({
          stage: 'converting',
          progress: calculateProgress('converting', 50, STAGE_WEIGHTS),
          message: 'Converting files to images...',
        });

        const questionImages = await fileToBase64Images(
          questionPaper.buffer,
          questionPaper.type
        );

        send({
          stage: 'converting',
          progress: calculateProgress('converting', 100, STAGE_WEIGHTS),
          message: 'Conversion complete',
        });

        const answerImages = await fileToBase64Images(
          answerSheet.buffer,
          answerSheet.type
        );

        // Stage 3: Extracting Questions
        sessionStore.updateStatus(sessionId, 'extracting');
        send({
          stage: 'extracting',
          progress: calculateProgress('extracting', 30, STAGE_WEIGHTS),
          message: 'Extracting questions from paper...',
        });

        const questions = await extractQuestions(questionImages);

        send({
          stage: 'extracting',
          progress: calculateProgress('extracting', 100, STAGE_WEIGHTS),
          message: `Extracted ${questions.length} questions`,
        });

        // Stage 4: Detecting Answers
        sessionStore.updateStatus(sessionId, 'detecting');
        send({
          stage: 'detecting',
          progress: calculateProgress('detecting', 20, STAGE_WEIGHTS),
          message: 'Detecting answer regions...',
        });

        const answers = await detectAnswers(answerImages);

        send({
          stage: 'detecting',
          progress: calculateProgress('detecting', 100, STAGE_WEIGHTS),
          message: `Detected ${answers.length} answer regions`,
        });

        // Stage 5: Mapping
        sessionStore.updateStatus(sessionId, 'mapping');
        send({
          stage: 'mapping',
          progress: calculateProgress('mapping', 50, STAGE_WEIGHTS),
          message: 'Mapping answers to questions...',
        });

        const mappings = mapAnswersToQuestions(questions, answers);

        send({
          stage: 'mapping',
          progress: calculateProgress('mapping', 100, STAGE_WEIGHTS),
          message: `Mapped ${mappings.length} pairs`,
        });

        // Stage 6: Complete
        const results: ProcessingResults = {
          sessionId,
          questions,
          answers,
          mappings,
          questionPaperImages: questionImages,
          answerSheetImages: answerImages,
          completedAt: new Date(),
        };

        sessionStore.setResults(sessionId, results);

        send({
          stage: 'complete',
          progress: 100,
          message: 'Processing complete!',
        });

        controller.close();
      } catch (error) {
        console.error('Processing error:', error);

        sessionStore.updateStatus(sessionId, 'error');

        send({
          stage: 'error',
          progress: 0,
          message: 'Processing failed',
          error: (error as Error).message,
        });

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
