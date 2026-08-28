import { NextRequest } from 'next/server';
import { sessionStore } from '@/lib/store';
import { runProcessingPipeline } from '@/lib/run-pipeline';
import { parseUploadedFiles } from '@/lib/upload-validation';
import { generateSessionId } from '@/lib/utils';
import type { ProcessingResults } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function createSseStream(
  run: (
    send: (data: Record<string, unknown>) => void
  ) => Promise<ProcessingResults>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const results = await run(send);

        send({
          stage: 'complete',
          progress: 100,
          message: 'Processing complete!',
          results: {
            questions: results.questions,
            answers: results.answers,
            mappings: results.mappings,
            answerSheetImages: results.answerSheetImages,
          },
        });

        controller.close();
      } catch (error) {
        console.error('Processing error:', error);

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

/**
 * POST /api/process — upload + process in one request (works on Vercel serverless)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { questionPaper, answerSheet } = await parseUploadedFiles(formData);
    const sessionId = generateSessionId();

    return createSseStream(async (send) => {
      return runProcessingPipeline(questionPaper, answerSheet, sessionId, send);
    });
  } catch (error) {
    return new Response((error as Error).message, { status: 400 });
  }
}

/**
 * GET /api/process?sessionId= — legacy path for local dev (in-memory session)
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 });
  }

  const session = sessionStore.getSession(sessionId);
  if (!session) {
    return new Response(
      'Session not found. On Vercel, use POST /api/process with files in one request.',
      { status: 404 }
    );
  }

  if (!session.questionPaper || !session.answerSheet) {
    return new Response('Files not uploaded', { status: 400 });
  }

  const questionPaper = session.questionPaper;
  const answerSheet = session.answerSheet;

  sessionStore.updateStatus(sessionId, 'validating');

  return createSseStream(async (send) => {
    const results = await runProcessingPipeline(
      questionPaper,
      answerSheet,
      sessionId,
      send
    );
    sessionStore.setResults(sessionId, results);
    return results;
  });
}
