// AI Grading Logic

import { openaiClient } from './openai-client';
import { generateGradingPrompt, SYSTEM_PROMPT_GRADING } from './prompts';
import {
  ExtractedQuestion,
  DetectedAnswer,
  GradingResult,
  GradingOutput,
  MappedPair,
} from './types';
import { getAnswerForQuestion } from './mapping';

/**
 * Grade a single question-answer pair
 */
export async function gradeSingleAnswer(
  question: ExtractedQuestion,
  answer: DetectedAnswer,
  customRubric?: string
): Promise<GradingResult> {
  try {
    console.log(`Grading question ${question.number}...`);

    // Use transcribed text or placeholder
    const studentAnswer =
      answer.transcribedText ||
      '[Handwritten answer - transcription not available]';

    // Default max marks if not specified
    const maxMarks = question.marks || 10;

    // Generate prompt
    const prompt = generateGradingPrompt(
      question.text,
      maxMarks,
      studentAnswer,
      customRubric
    );

    // Call OpenAI API
    const response = await openaiClient.chatCompletion(
      [
        {
          role: 'system',
          content: SYSTEM_PROMPT_GRADING,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        responseFormat: 'json_object',
        temperature: 0.2, // Slightly higher for more varied feedback
      }
    );

    // Parse response
    const output = openaiClient.parseJsonResponse<GradingOutput>(response);

    // Validate output
    if (
      output.score === undefined ||
      output.maxScore === undefined ||
      !output.feedback
    ) {
      throw new Error('Invalid grading output');
    }

    // Clamp score to valid range
    const score = Math.max(0, Math.min(output.maxScore, output.score));

    const result: GradingResult = {
      questionId: question.id,
      score,
      maxScore: output.maxScore,
      feedback: output.feedback,
      strengths: output.strengths,
      weaknesses: output.weaknesses,
      suggestions: output.suggestions,
    };

    console.log(`Question ${question.number}: ${score}/${output.maxScore}`);

    return result;
  } catch (error) {
    console.error(`Grading failed for question ${question.number}:`, error);
    throw new Error(`Failed to grade answer: ${(error as Error).message}`);
  }
}

/**
 * Grade multiple answers (sequential to avoid rate limits)
 */
export async function gradeAnswers(
  questions: ExtractedQuestion[],
  answers: DetectedAnswer[],
  mappings: MappedPair[],
  customRubric?: string
): Promise<GradingResult[]> {
  console.log(`Grading ${mappings.length} mapped answer(s)...`);

  const results: GradingResult[] = [];

  for (const mapping of mappings) {
    const question = questions.find((q) => q.id === mapping.questionId);
    const answer = getAnswerForQuestion(mapping.questionId, answers, mappings);

    if (!question || !answer) {
      console.warn(`Skipping mapping with missing question or answer`);
      continue;
    }

    try {
      const result = await gradeSingleAnswer(question, answer, customRubric);
      results.push(result);

      // Delay between grading calls (rate limiting)
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Failed to grade question ${question.number}:`, error);
      // Continue with other questions
    }
  }

  console.log(`Graded ${results.length} answers`);

  return results;
}

/**
 * Calculate total score and percentage
 */
export function calculateTotalScore(
  results: GradingResult[]
): {
  totalScore: number;
  totalMaxScore: number;
  percentage: number;
} {
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const totalMaxScore = results.reduce((sum, r) => sum + r.maxScore, 0);
  const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

  return {
    totalScore,
    totalMaxScore,
    percentage: Math.round(percentage * 100) / 100, // 2 decimal places
  };
}

/**
 * Get grading result for a specific question
 */
export function getGradingResultForQuestion(
  questionId: string,
  results: GradingResult[]
): GradingResult | undefined {
  return results.find((r) => r.questionId === questionId);
}

/**
 * Get grade distribution
 */
export function getGradeDistribution(
  results: GradingResult[]
): {
  excellent: number; // 90-100%
  good: number; // 70-89%
  satisfactory: number; // 50-69%
  poor: number; // 0-49%
} {
  const distribution = {
    excellent: 0,
    good: 0,
    satisfactory: 0,
    poor: 0,
  };

  for (const result of results) {
    const percentage = (result.score / result.maxScore) * 100;

    if (percentage >= 90) {
      distribution.excellent++;
    } else if (percentage >= 70) {
      distribution.good++;
    } else if (percentage >= 50) {
      distribution.satisfactory++;
    } else {
      distribution.poor++;
    }
  }

  return distribution;
}

/**
 * Validate grading results
 */
export function validateGradingResults(
  results: GradingResult[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const result of results) {
    if (result.score < 0) {
      errors.push(
        `Question ${result.questionId} has negative score: ${result.score}`
      );
    }
    if (result.score > result.maxScore) {
      errors.push(
        `Question ${result.questionId} score (${result.score}) exceeds max (${result.maxScore})`
      );
    }
    if (!result.feedback || result.feedback.trim().length === 0) {
      errors.push(`Question ${result.questionId} has no feedback`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
