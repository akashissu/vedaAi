// Question Extraction Logic

import { openaiClient } from './openai-client';
import {
  QUESTION_EXTRACTION_PROMPT,
  SYSTEM_PROMPT_EXTRACTION,
  generateBatchQuestionExtractionPrompt,
} from './prompts';
import { ExtractedQuestion, QuestionExtractionOutput } from './types';
import { generateId, compareQuestionNumbers } from './utils';

/**
 * Extract questions from question paper images
 */
export async function extractQuestions(
  imagesBase64: string[]
): Promise<ExtractedQuestion[]> {
  try {
    console.log(`Extracting questions from ${imagesBase64.length} image(s)...`);

    // Create prompt (batch or single)
    const prompt =
      imagesBase64.length > 1
        ? generateBatchQuestionExtractionPrompt(imagesBase64.length)
        : QUESTION_EXTRACTION_PROMPT;

    // Create message with all images
    const message = openaiClient.createMultiImageVisionMessage(
      prompt,
      imagesBase64
    );

    // Call OpenAI API
    const response = await openaiClient.chatCompletion(
      [
        {
          role: 'system',
          content: SYSTEM_PROMPT_EXTRACTION,
        },
        message,
      ],
      {
        responseFormat: 'json_object',
        temperature: 0.1,
      }
    );

    // Parse response
    const output =
      openaiClient.parseJsonResponse<QuestionExtractionOutput>(response);

    if (!output.questions || !Array.isArray(output.questions)) {
      throw new Error('Invalid extraction output: missing questions array');
    }

    // Convert to ExtractedQuestion format
    const questions: ExtractedQuestion[] = output.questions.map((q, index) => ({
      id: generateId('q'),
      number: q.number || `${index + 1}`,
      text: q.text || '',
      marks: q.marks,
      page: q.page || 1,
    }));

    // Sort by question number
    questions.sort((a, b) => compareQuestionNumbers(a.number, b.number));

    console.log(`Extracted ${questions.length} questions`);

    // Log first few for verification
    if (questions.length > 0) {
      console.log('Sample questions:', questions.slice(0, 3));
    }

    return questions;
  } catch (error) {
    console.error('Question extraction failed:', error);
    throw new Error(`Failed to extract questions: ${(error as Error).message}`);
  }
}

/**
 * Validate extracted questions
 */
export function validateExtractedQuestions(
  questions: ExtractedQuestion[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (questions.length === 0) {
    errors.push('No questions extracted');
  }

  for (const q of questions) {
    if (!q.number) {
      errors.push(`Question ${q.id} has no number`);
    }
    if (!q.text || q.text.trim().length < 3) {
      errors.push(`Question ${q.number} has invalid text`);
    }
    if (q.page < 1) {
      errors.push(`Question ${q.number} has invalid page number`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge duplicate questions (same number from multiple extractions)
 */
export function mergeDuplicateQuestions(
  questions: ExtractedQuestion[]
): ExtractedQuestion[] {
  const merged = new Map<string, ExtractedQuestion>();

  for (const q of questions) {
    const existing = merged.get(q.number);
    if (existing) {
      // Keep the one with more text
      if (q.text.length > existing.text.length) {
        merged.set(q.number, q);
      }
    } else {
      merged.set(q.number, q);
    }
  }

  return Array.from(merged.values()).sort((a, b) =>
    compareQuestionNumbers(a.number, b.number)
  );
}
