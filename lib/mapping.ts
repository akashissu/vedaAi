// Answer Mapping Algorithm (Deterministic, No AI)

import { ExtractedQuestion, DetectedAnswer, MappedPair } from './types';
import { parseQuestionNumber } from './utils';
import { MAPPING_CONFIG } from './constants';

/**
 * Calculate similarity between two question numbers
 * Returns 1.0 for exact match, 0.0-0.99 for partial match
 */
function calculateQuestionNumberSimilarity(q1: string, q2: string): number {
  // Exact match
  if (q1 === q2) {
    return 1.0;
  }

  // Normalize (remove spaces, lowercase)
  const n1 = q1.replace(/\s/g, '').toLowerCase();
  const n2 = q2.replace(/\s/g, '').toLowerCase();

  if (n1 === n2) {
    return 0.95;
  }

  // Parse question numbers
  const parsed1 = parseQuestionNumber(q1);
  const parsed2 = parseQuestionNumber(q2);

  // Main numbers must match
  if (parsed1.main !== parsed2.main) {
    return 0.0;
  }

  // Main number matches
  if (!parsed1.sub && !parsed2.sub) {
    return 0.9; // Both have no sub-part
  }

  // One has sub-part, other doesn't (possible match)
  if (!parsed1.sub || !parsed2.sub) {
    return 0.5;
  }

  // Both have sub-parts but different
  return 0.0;
}

/**
 * Map answers to questions using exact/fuzzy matching on question numbers
 */
function mapByQuestionNumber(
  questions: ExtractedQuestion[],
  answers: DetectedAnswer[]
): MappedPair[] {
  const mappings: MappedPair[] = [];
  const usedAnswers = new Set<string>();

  for (const question of questions) {
    let bestMatch: { answer: DetectedAnswer; confidence: number } | null = null;

    for (const answer of answers) {
      // Skip already used answers
      if (usedAnswers.has(answer.id)) {
        continue;
      }

      // Skip answers without question number
      if (!answer.questionNumber) {
        continue;
      }

      const similarity = calculateQuestionNumberSimilarity(
        question.number,
        answer.questionNumber
      );

      if (similarity >= MAPPING_CONFIG.FUZZY_MATCH_THRESHOLD) {
        if (!bestMatch || similarity > bestMatch.confidence) {
          bestMatch = { answer, confidence: similarity };
        }
      }
    }

    if (bestMatch) {
      mappings.push({
        questionId: question.id,
        answerId: bestMatch.answer.id,
        confidence: bestMatch.confidence,
        method: bestMatch.confidence === 1.0 ? 'exact' : 'fuzzy',
      });
      usedAnswers.add(bestMatch.answer.id);
    }
  }

  return mappings;
}

/**
 * Map remaining answers by sequence (position-based)
 * Assumes answers appear in same order as questions
 */
function mapBySequence(
  questions: ExtractedQuestion[],
  answers: DetectedAnswer[],
  existingMappings: MappedPair[]
): MappedPair[] {
  const mappedQuestions = new Set(
    existingMappings.map((m) => m.questionId)
  );
  const mappedAnswers = new Set(existingMappings.map((m) => m.answerId));

  const unmappedQuestions = questions.filter(
    (q) => !mappedQuestions.has(q.id)
  );
  const unmappedAnswers = answers.filter((a) => !mappedAnswers.has(a.id));

  // Sort by position (page, then y-coordinate)
  unmappedAnswers.sort((a, b) => {
    if (a.page !== b.page) {
      return a.page - b.page;
    }
    return a.boundingBox[0] - b.boundingBox[0]; // ymin
  });

  const newMappings: MappedPair[] = [];

  // Map in sequence
  const count = Math.min(unmappedQuestions.length, unmappedAnswers.length);
  for (let i = 0; i < count; i++) {
    newMappings.push({
      questionId: unmappedQuestions[i].id,
      answerId: unmappedAnswers[i].id,
      confidence: MAPPING_CONFIG.SEQUENCE_MATCH_THRESHOLD,
      method: 'sequence',
    });
  }

  return newMappings;
}

/**
 * Main mapping function: Map detected answers to extracted questions
 */
export function mapAnswersToQuestions(
  questions: ExtractedQuestion[],
  answers: DetectedAnswer[]
): MappedPair[] {
  console.log(`Mapping ${answers.length} answers to ${questions.length} questions...`);

  // Step 1: Exact/fuzzy matching on question numbers
  const numberMappings = mapByQuestionNumber(questions, answers);
  console.log(`Mapped ${numberMappings.length} by question number`);

  // Step 2: Sequence-based matching only for orphans (avoid offset from junk detections)
  const answersWithNumbers = answers.filter((a) => a.questionNumber).length;
  const useSequence =
    answersWithNumbers < questions.length * 0.5 &&
    numberMappings.length < questions.length;

  const sequenceMappings = useSequence
    ? mapBySequence(questions, answers, numberMappings)
    : [];
  console.log(`Mapped ${sequenceMappings.length} by sequence`);
  if (!useSequence && getUnmappedQuestions(questions, numberMappings).length > 0) {
    console.log('Skipping sequence mapping — using question-number matches only');
  }

  // Combine all mappings
  const allMappings = [...numberMappings, ...sequenceMappings];

  // Sort by question number for display
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  allMappings.sort((a, b) => {
    const qA = questionMap.get(a.questionId);
    const qB = questionMap.get(b.questionId);
    if (!qA || !qB) return 0;
    return qA.number.localeCompare(qB.number);
  });

  console.log(`Total mappings: ${allMappings.length}`);

  return allMappings;
}

/**
 * Get unmapped questions (no answer found)
 */
export function getUnmappedQuestions(
  questions: ExtractedQuestion[],
  mappings: MappedPair[]
): ExtractedQuestion[] {
  const mappedQuestionIds = new Set(mappings.map((m) => m.questionId));
  return questions.filter((q) => !mappedQuestionIds.has(q.id));
}

/**
 * Get unmapped answers (orphan answers with no matching question)
 */
export function getUnmappedAnswers(
  answers: DetectedAnswer[],
  mappings: MappedPair[]
): DetectedAnswer[] {
  const mappedAnswerIds = new Set(mappings.map((m) => m.answerId));
  return answers.filter((a) => !mappedAnswerIds.has(a.id));
}

/**
 * Get mapping for a specific question
 */
export function getMappingForQuestion(
  questionId: string,
  mappings: MappedPair[]
): MappedPair | undefined {
  return mappings.find((m) => m.questionId === questionId);
}

/**
 * Get answer for a specific question
 */
export function getAnswerForQuestion(
  questionId: string,
  answers: DetectedAnswer[],
  mappings: MappedPair[]
): DetectedAnswer | undefined {
  const mapping = getMappingForQuestion(questionId, mappings);
  if (!mapping) {
    return undefined;
  }
  return answers.find((a) => a.id === mapping.answerId);
}

/**
 * Validate mappings
 */
export function validateMappings(
  questions: ExtractedQuestion[],
  answers: DetectedAnswer[],
  mappings: MappedPair[]
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicate question mappings
  const questionIds = mappings.map((m) => m.questionId);
  const duplicateQuestions = questionIds.filter(
    (id, index) => questionIds.indexOf(id) !== index
  );
  if (duplicateQuestions.length > 0) {
    errors.push(`Duplicate mappings for questions: ${duplicateQuestions.join(', ')}`);
  }

  // Check for duplicate answer mappings
  const answerIds = mappings.map((m) => m.answerId);
  const duplicateAnswers = answerIds.filter(
    (id, index) => answerIds.indexOf(id) !== index
  );
  if (duplicateAnswers.length > 0) {
    errors.push(`Duplicate mappings for answers: ${duplicateAnswers.join(', ')}`);
  }

  // Check for invalid references
  const questionIdSet = new Set(questions.map((q) => q.id));
  const answerIdSet = new Set(answers.map((a) => a.id));

  for (const mapping of mappings) {
    if (!questionIdSet.has(mapping.questionId)) {
      errors.push(`Invalid question ID in mapping: ${mapping.questionId}`);
    }
    if (!answerIdSet.has(mapping.answerId)) {
      errors.push(`Invalid answer ID in mapping: ${mapping.answerId}`);
    }
  }

  // Warnings for unmapped items
  const unmappedQuestions = getUnmappedQuestions(questions, mappings);
  if (unmappedQuestions.length > 0) {
    warnings.push(
      `${unmappedQuestions.length} questions have no answer: ${unmappedQuestions
        .map((q) => q.number)
        .join(', ')}`
    );
  }

  const unmappedAnswers = getUnmappedAnswers(answers, mappings);
  if (unmappedAnswers.length > 0) {
    warnings.push(
      `${unmappedAnswers.length} answers have no matching question`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
