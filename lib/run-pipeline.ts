import { fileToBase64Images } from './pdf-utils';
import { extractQuestions } from './extraction';
import { detectAnswers } from './detection';
import { mapAnswersToQuestions } from './mapping';
import { STAGE_WEIGHTS } from './constants';
import { calculateProgress } from './utils';
import type { ProcessingResults, UploadedFile } from './types';

export type PipelineProgress = {
  stage: string;
  progress: number;
  message: string;
  error?: string;
};

export async function runProcessingPipeline(
  questionPaper: UploadedFile,
  answerSheet: UploadedFile,
  sessionId: string,
  send: (data: PipelineProgress) => void
): Promise<ProcessingResults> {
  send({
    stage: 'validating',
    progress: calculateProgress('validating', 100, STAGE_WEIGHTS),
    message: 'Validating files...',
  });
  await new Promise((r) => setTimeout(r, 300));

  send({
    stage: 'converting',
    progress: calculateProgress('converting', 30, STAGE_WEIGHTS),
    message: 'Converting files to images...',
  });

  const questionImages = await fileToBase64Images(questionPaper.buffer, questionPaper.type);
  const answerImages = await fileToBase64Images(answerSheet.buffer, answerSheet.type);

  send({
    stage: 'converting',
    progress: calculateProgress('converting', 100, STAGE_WEIGHTS),
    message: 'Conversion complete',
  });

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

  return {
    sessionId,
    questions,
    answers,
    mappings,
    questionPaperImages: questionImages,
    answerSheetImages: answerImages,
    completedAt: new Date(),
  };
}
