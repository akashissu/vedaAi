---
name: answer-mapping
description: Map detected answer regions to extracted questions using deterministic algorithms. Handles out-of-order answers, unanswered questions, and orphan answers without AI.
license: MIT
compatibility: Pure TypeScript algorithm, no external dependencies
metadata:
  author: VedaAI
  version: "1.0"
  category: data-processing
allowed-tools: read write
---

# Answer Mapping Skill

Deterministic algorithm to map student answers to exam questions.

---

## When to Use This Skill

Use this skill when you have:
- Extracted questions from a question paper (`question-extraction` skill)
- Detected answer regions from answer sheet (`answer-detection` skill)
- Need to create question-answer pairs

**This is NOT an AI skill** — it uses deterministic matching logic.

---

## Required Inputs

| Input | Type | Description |
|-------|------|-------------|
| `questions` | `ExtractedQuestion[]` | Questions from paper |
| `answerRegions` | `AnswerRegion[]` | Detected answers from sheet |
| `options` | `MappingOptions` | Configuration (optional) |

### MappingOptions

```typescript
interface MappingOptions {
  fuzzyMatching?: boolean;        // Default: true
  similarityThreshold?: number;   // Default: 0.7 (for fuzzy matching)
  groupMultiPageAnswers?: boolean;  // Default: true
  handleOrphans?: boolean;        // Default: true
}
```

---

## Output Format

Returns `MappingResult`:

```typescript
interface MappingResult {
  mappings: MappedQuestion[];    // Successfully mapped Q+A pairs
  unanswered: ExtractedQuestion[];  // Questions with no answer
  orphans: AnswerRegion[];       // Answers with no matching question
  summary: MappingSummary;
}

interface MappedQuestion {
  question: ExtractedQuestion;
  answerRegions: AnswerRegion[];  // Array (supports multi-page)
  status: 'answered' | 'partial' | 'unanswered';
  matchMethod: 'exact' | 'fuzzy' | 'sequence' | 'none';
  confidence: number;  // 0.0 to 1.0
}

interface MappingSummary {
  totalQuestions: number;
  answered: number;
  unanswered: number;
  partial: number;
  orphaned: number;
  averageConfidence: number;
}
```

---

## Algorithm Overview

```
┌─────────────────────────────────────────────────────────────┐
│           ANSWER MAPPING ALGORITHM (Deterministic)           │
└─────────────────────────────────────────────────────────────┘

INPUT: Questions[], AnswerRegions[]

STEP 1: Exact Number Matching
─────────────────────────────
For each question:
  Find answerRegions where questionNumber === question.number
  If found → CREATE MAPPING (confidence: 1.0)

STEP 2: Normalize & Retry
──────────────────────────
For remaining unmatched questions:
  Normalize question numbers:
    "Q3" → "3"
    "3)" → "3"
    "Question 3" → "3"
  Retry exact matching with normalized numbers

STEP 3: Fuzzy Content Matching (Optional)
──────────────────────────────────────────
For still-unmatched questions:
  For each unmapped answerRegion:
    Calculate text similarity with question.text
    If similarity > threshold → CREATE MAPPING (confidence: similarity)

STEP 4: Group Multi-Page Answers
─────────────────────────────────
For each question:
  Find ALL answerRegions with same questionNumber
  Group into single mapping with multiple regions

STEP 5: Flag Unanswered & Orphans
──────────────────────────────────
Unanswered: Questions with no mapping
Orphans: AnswerRegions with no mapping

OUTPUT: MappingResult
```

---

## Implementation

```typescript
import { mapAnswersToQuestions } from '@/lib/mapping';

const result = await mapAnswersToQuestions(questions, answerRegions, {
  fuzzyMatching: true,
  similarityThreshold: 0.7,
  groupMultiPageAnswers: true
});

console.log(`Mapped: ${result.mappings.length}/${result.summary.totalQuestions}`);
console.log(`Unanswered: ${result.unanswered.length}`);
console.log(`Orphans: ${result.orphans.length}`);
```

---

## Matching Strategies

### 1. Exact Number Matching

```typescript
function exactMatch(
  question: ExtractedQuestion,
  regions: AnswerRegion[]
): AnswerRegion[] {
  return regions.filter(r => r.questionNumber === question.number);
}
```

**Example:**
- Question: `{ number: "3" }`
- Answer: `{ questionNumber: "3" }`
- ✅ Match

### 2. Normalized Matching

```typescript
function normalizeQuestionNumber(num: string): string {
  return num
    .toLowerCase()
    .replace(/^q(uestion)?\.?\s*/i, '')  // Remove "Q" or "Question"
    .replace(/[).:]/g, '')                // Remove punctuation
    .replace(/\s+/g, '')                  // Remove spaces
    .trim();
}

// "Q3" → "3"
// "3)" → "3"
// "Question 3" → "3"
// "3(a)" → "3a"
```

### 3. Fuzzy Content Matching

Uses Levenshtein distance or cosine similarity:

```typescript
function contentSimilarity(
  questionText: string,
  answerText: string
): number {
  // Simple word overlap (can use more sophisticated methods)
  const qWords = new Set(questionText.toLowerCase().split(/\s+/));
  const aWords = new Set(answerText.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...qWords].filter(w => aWords.has(w)));
  const union = new Set([...qWords, ...aWords]);
  
  return intersection.size / union.size;  // Jaccard similarity
}
```

**Example:**
- Question: "Explain photosynthesis"
- Answer transcription: "Photosynthesis is the process by which..."
- Similarity: ~0.8 → Match

### 4. Multi-Page Grouping

```typescript
function groupMultiPageAnswers(
  regions: AnswerRegion[]
): Map<string, AnswerRegion[]> {
  const grouped = new Map<string, AnswerRegion[]>();
  
  for (const region of regions) {
    if (!grouped.has(region.questionNumber)) {
      grouped.set(region.questionNumber, []);
    }
    grouped.get(region.questionNumber)!.push(region);
  }
  
  return grouped;
}
```

**Example:**
- Page 1: `{ questionNumber: "10", pageIndex: 0, continues: true }`
- Page 2: `{ questionNumber: "10", pageIndex: 1, continues: false }`
- Result: Single mapping with 2 regions

---

## Edge Cases

### Case 1: Out-of-Order Answers

Student answered in sequence: 5, 2, 8, 1

```typescript
// Algorithm handles this automatically via number matching
const result = mapAnswersToQuestions(questions, regions);

// result.mappings will be:
// [
//   { question: Q1, answerRegions: [region for Q1] },
//   { question: Q2, answerRegions: [region for Q2] },
//   ...
//   { question: Q5, answerRegions: [region for Q5] },
//   ...
// ]
```

### Case 2: Missing Question Number

Student forgot to write "Q3":

```typescript
// Step 1: No exact match
// Step 3: Fuzzy matching kicks in
const similarity = contentSimilarity(question3.text, region.transcribedText);
if (similarity > 0.7) {
  // Mapped with confidence = similarity
}
```

### Case 3: Sub-Parts Answered Together

Student wrote one answer for "3(a)" and "3(b)" together:

```typescript
// Manual handling required (or configure to allow)
const region = { questionNumber: "3", ... };

// Map to both 3(a) and 3(b)
const mappings = [
  { question: question_3a, answerRegions: [region], status: 'partial' },
  { question: question_3b, answerRegions: [region], status: 'partial' }
];
```

### Case 4: Question Answered Twice

Student answered Q5 twice (mistake):

```typescript
// Keep both regions, flag for review
const mapping = {
  question: question_5,
  answerRegions: [region1, region2],
  status: 'answered',
  warnings: ['Multiple answers detected']
};
```

---

## Confidence Scoring

```typescript
function calculateConfidence(
  question: ExtractedQuestion,
  region: AnswerRegion,
  matchMethod: string
): number {
  switch (matchMethod) {
    case 'exact':
      return 1.0;
    
    case 'normalized':
      return 0.95;
    
    case 'fuzzy':
      return contentSimilarity(question.text, region.transcribedText);
    
    case 'sequence':
      // Fallback: match by position if both are in order
      return 0.5;
    
    default:
      return 0.0;
  }
}
```

---

## Performance

- **Processing time:** < 100ms for 50 questions + 50 answers
- **Complexity:** O(n × m) where n = questions, m = answers
- **No AI calls:** Zero token usage
- **Deterministic:** Same inputs always produce same output

---

## Testing

```typescript
describe('mapAnswersToQuestions', () => {
  it('maps exact matches correctly', () => {
    const questions = [
      { number: '1', text: 'Q1 text' },
      { number: '2', text: 'Q2 text' }
    ];
    const regions = [
      { questionNumber: '1', transcribedText: 'Answer 1' },
      { questionNumber: '2', transcribedText: 'Answer 2' }
    ];
    
    const result = mapAnswersToQuestions(questions, regions);
    
    expect(result.mappings).toHaveLength(2);
    expect(result.unanswered).toHaveLength(0);
  });
  
  it('handles out-of-order answers', () => {
    const questions = [
      { number: '1', text: 'Q1' },
      { number: '2', text: 'Q2' }
    ];
    const regions = [
      { questionNumber: '2', transcribedText: 'Answer 2' },  // Out of order
      { questionNumber: '1', transcribedText: 'Answer 1' }
    ];
    
    const result = mapAnswersToQuestions(questions, regions);
    
    expect(result.mappings[0].question.number).toBe('1');
    expect(result.mappings[1].question.number).toBe('2');
  });
  
  it('identifies unanswered questions', () => {
    const questions = [
      { number: '1', text: 'Q1' },
      { number: '2', text: 'Q2' }
    ];
    const regions = [
      { questionNumber: '1', transcribedText: 'Answer 1' }
      // Q2 not answered
    ];
    
    const result = mapAnswersToQuestions(questions, regions);
    
    expect(result.unanswered).toHaveLength(1);
    expect(result.unanswered[0].number).toBe('2');
  });
  
  it('identifies orphan answers', () => {
    const questions = [
      { number: '1', text: 'Q1' }
    ];
    const regions = [
      { questionNumber: '1', transcribedText: 'Answer 1' },
      { questionNumber: '99', transcribedText: 'Orphan answer' }  // No Q99
    ];
    
    const result = mapAnswersToQuestions(questions, regions);
    
    expect(result.orphans).toHaveLength(1);
    expect(result.orphans[0].questionNumber).toBe('99');
  });
});
```

---

## Visualization

```typescript
// Generate mapping report
function generateMappingReport(result: MappingResult): string {
  let report = `Mapping Summary:\n`;
  report += `─────────────────\n`;
  report += `Total Questions: ${result.summary.totalQuestions}\n`;
  report += `✓ Answered: ${result.summary.answered}\n`;
  report += `✗ Unanswered: ${result.summary.unanswered}\n`;
  report += `⚠ Partial: ${result.summary.partial}\n`;
  report += `? Orphans: ${result.summary.orphaned}\n`;
  report += `Avg Confidence: ${(result.summary.averageConfidence * 100).toFixed(1)}%\n\n`;
  
  // List unanswered
  if (result.unanswered.length > 0) {
    report += `Unanswered Questions:\n`;
    result.unanswered.forEach(q => {
      report += `  - ${q.number}: ${q.text.substring(0, 50)}...\n`;
    });
    report += `\n`;
  }
  
  // List orphans
  if (result.orphans.length > 0) {
    report += `Orphan Answers:\n`;
    result.orphans.forEach(r => {
      report += `  - "${r.questionNumber}" on page ${r.pageIndex + 1}\n`;
    });
  }
  
  return report;
}
```

---

## Error Handling

| Issue | Detection | Resolution |
|-------|-----------|------------|
| No questions provided | `questions.length === 0` | Throw error |
| No answers provided | `regions.length === 0` | Return all questions as unanswered |
| All answers orphaned | `mappings.length === 0` | Flag for manual review |
| Low confidence mappings | `confidence < 0.5` | Mark as 'partial' status |

---

## Optimization Tips

1. **Pre-sort inputs:** Sort questions and regions by number for O(n) matching
2. **Cache similarities:** Memoize content similarity calculations
3. **Early exit:** Stop fuzzy matching once confident match found
4. **Parallel processing:** Map questions in parallel (they're independent)

```typescript
// Parallel mapping
const mappings = await Promise.all(
  questions.map(async q => await findMatchForQuestion(q, regions))
);
```

---

## References

See `scripts/test-mapping.ts` for comprehensive test cases.

---

## Related Skills

- `question-extraction` — Provides questions input
- `answer-detection` — Provides answer regions input
- `grading` — Uses these mappings for grading
