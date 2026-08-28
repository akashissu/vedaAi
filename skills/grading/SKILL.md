---
name: grading
description: Grade student answers using Gemini AI. Provides scores, correctness assessment, constructive feedback, and improvement suggestions based on question-answer pairs.
license: MIT
compatibility: Requires Google Gemini API (gemini-3-flash-preview or later)
metadata:
  author: VedaAI
  version: "1.0"
  category: assessment-ai
allowed-tools: gemini read write
---

# Grading Skill

AI-powered assessment grading with detailed feedback generation.

---

## When to Use This Skill

Use this skill when you have:
- Mapped question-answer pairs (from `answer-mapping` skill)
- Need to provide scores and feedback
- Want constructive, educational feedback
- Need to identify learning gaps

**Do NOT use for:**
- Unanswered questions (no answer to grade)
- Orphan answers with no question context
- Non-educational content

---

## Required Inputs

| Input | Type | Description |
|-------|------|-------------|
| `question` | `ExtractedQuestion` | The original question |
| `answer` | `AnswerRegion` | The student's answer |
| `options` | `GradingOptions` | Configuration (optional) |

### GradingOptions

```typescript
interface GradingOptions {
  rubric?: GradingRubric;        // Custom grading criteria
  strictness?: 'lenient' | 'moderate' | 'strict';  // Default: 'moderate'
  provideSuggestions?: boolean;  // Default: true
  maxFeedbackLength?: number;    // Default: 200 words
  temperature?: number;          // Default: 0.3 (consistent grading)
}

interface GradingRubric {
  criteria: string[];            // What to look for
  pointsDistribution: number[];  // Points per criterion
  acceptPartialCredit: boolean;  // Default: true
}
```

---

## Output Format

Returns `GradeResult`:

```typescript
interface GradeResult {
  score: number;                 // Points earned
  maxScore: number;              // Total possible points
  percentage: number;            // score / maxScore * 100
  isCorrect: boolean;            // true if percentage >= 70%
  feedback: string;              // Constructive feedback (2-4 sentences)
  suggestions: string[];         // Improvement tips
  strengths: string[];           // What student did well
  weaknesses: string[];          // Areas to improve
  gradedAt: string;              // ISO timestamp
}
```

### Example Output

```json
{
  "score": 3,
  "maxScore": 5,
  "percentage": 60,
  "isCorrect": false,
  "feedback": "Your answer correctly identifies photosynthesis as a process involving sunlight and plants, but lacks detail about the chemical reactions and products. The explanation could benefit from mentioning chlorophyll and the production of glucose and oxygen.",
  "suggestions": [
    "Include the chemical equation: 6CO2 + 6H2O + sunlight → C6H12O6 + 6O2",
    "Mention the role of chlorophyll in capturing light energy",
    "Explain where photosynthesis occurs (chloroplasts)"
  ],
  "strengths": [
    "Correctly identified sunlight as essential",
    "Clear and organized answer structure"
  ],
  "weaknesses": [
    "Missing chemical equation",
    "No mention of chlorophyll or chloroplasts",
    "Incomplete explanation of products"
  ],
  "gradedAt": "2026-08-28T09:00:00Z"
}
```

---

## Implementation

### Basic Usage

```typescript
import { gradeAnswer } from '@/lib/grading';

const grade = await gradeAnswer(question, answer, {
  strictness: 'moderate',
  provideSuggestions: true
});

console.log(`Score: ${grade.score}/${grade.maxScore} (${grade.percentage}%)`);
console.log(`Feedback: ${grade.feedback}`);
```

### With Custom Rubric

```typescript
const rubric: GradingRubric = {
  criteria: [
    'Correctly defines photosynthesis',
    'Mentions chlorophyll',
    'Includes chemical equation',
    'Explains importance',
    'Clear and organized'
  ],
  pointsDistribution: [2, 1, 1, 1, 0],  // Total: 5 points
  acceptPartialCredit: true
};

const grade = await gradeAnswer(question, answer, { rubric });
```

### Batch Grading

```typescript
async function gradeAllAnswers(
  mappings: MappedQuestion[]
): Promise<MappedQuestion[]> {
  const graded = [];
  
  for (const mapping of mappings) {
    if (mapping.status === 'answered') {
      const grade = await gradeAnswer(
        mapping.question,
        mapping.answerRegions[0]  // Use first region (primary answer)
      );
      
      graded.push({ ...mapping, grade });
      
      // Rate limit protection
      await sleep(1000);
    } else {
      graded.push(mapping);  // Skip unanswered
    }
  }
  
  return graded;
}
```

---

## Prompt Engineering

The skill uses this system prompt structure:

```
You are an expert educational assessor grading student answers.

CONTEXT:
Question: [question text]
Marks Available: [marks]
Student Answer: [transcribed handwritten text]

TASK: Grade this answer and provide constructive feedback.

GRADING CRITERIA:
{rubric criteria if provided, otherwise:}
- Correctness and accuracy of content
- Completeness of answer
- Clarity of explanation
- Use of appropriate terminology

INSTRUCTIONS:
1. Assign a score out of [maxScore] points
2. Be {strictness} in grading
3. If partial credit is appropriate, award it
4. Provide 2-4 sentences of constructive feedback
5. Suggest 2-3 specific improvements
6. Identify what the student did well (strengths)
7. Identify areas for improvement (weaknesses)

TONE: Encouraging and educational. Focus on learning, not judgment.

Return JSON with EXACT structure:
{
  "score": number,
  "feedback": "string",
  "suggestions": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"]
}
```

---

## Grading Strategies

### 1. Rubric-Based Grading

```typescript
// Example rubric for "Explain photosynthesis" (5 marks)
const rubric = {
  criteria: [
    'Definition of photosynthesis (1 pt)',
    'Mentions chlorophyll/chloroplasts (1 pt)',
    'Includes reactants (CO2, H2O, sunlight) (1 pt)',
    'Includes products (glucose, O2) (1 pt)',
    'Explains importance/purpose (1 pt)'
  ],
  pointsDistribution: [1, 1, 1, 1, 1],
  acceptPartialCredit: true
};

// AI checks answer against each criterion
// Awards points accordingly
```

### 2. Comparative Grading

```typescript
// Provide model answer for comparison
const options = {
  modelAnswer: "Photosynthesis is the process by which plants convert sunlight into chemical energy. It occurs in chloroplasts using chlorophyll. The equation is: 6CO2 + 6H2O + sunlight → C6H12O6 + 6O2.",
  strictness: 'moderate'
};

// AI compares student answer to model answer
const grade = await gradeAnswer(question, answer, options);
```

### 3. Keyword-Based Grading

```typescript
// Specify required keywords
const options = {
  requiredKeywords: ['chlorophyll', 'sunlight', 'glucose', 'oxygen'],
  keywordPoints: 1.25  // 5 marks / 4 keywords
};

// Each keyword found = partial credit
```

---

## Strictness Levels

| Level | Description | Typical Passing % |
|-------|-------------|-------------------|
| **Lenient** | Generous partial credit, focuses on effort | 50%+ |
| **Moderate** | Balanced, standard educational grading | 60-70%+ |
| **Strict** | High standards, minimal partial credit | 80%+ |

```typescript
// Lenient: Award credit for attempting, even if incomplete
{ strictness: 'lenient' }  // Grade: 3/5 (60%) for basic attempt

// Moderate: Standard grading
{ strictness: 'moderate' }  // Grade: 2/5 (40%) for same attempt

// Strict: High expectations
{ strictness: 'strict' }  // Grade: 1/5 (20%) for same attempt
```

---

## Edge Cases

### Case 1: Illegible Answer

```typescript
const answer = {
  transcribedText: "The [illegible] process of [illegible]...",
  confidence: 0.4
};

// Grading result:
{
  score: 0,
  feedback: "Unable to grade due to illegible handwriting. Please rewrite more clearly.",
  suggestions: ["Write more legibly", "Use clear, consistent letter formation"],
  isCorrect: false
}
```

### Case 2: Off-Topic Answer

```typescript
// Question: "Explain photosynthesis"
// Answer: "Mitochondria is the powerhouse of the cell..."

{
  score: 0,
  feedback: "Answer discusses mitochondria (respiration) instead of photosynthesis. Review the question carefully.",
  suggestions: ["Re-read the question before answering"],
  isCorrect: false
}
```

### Case 3: Excellent Answer

```typescript
{
  score: 5,
  maxScore: 5,
  percentage: 100,
  feedback: "Excellent! Your answer covers all key aspects of photosynthesis with accurate detail and clear explanation.",
  suggestions: [],  // No suggestions needed
  strengths: [
    "Complete and accurate definition",
    "Includes chemical equation",
    "Explains importance clearly"
  ],
  weaknesses: [],
  isCorrect: true
}
```

### Case 4: Blank/Empty Answer

```typescript
const answer = {
  transcribedText: "",  // Empty or just whitespace
  confidence: 0
};

// Don't grade, return:
{
  score: 0,
  feedback: "No answer provided.",
  suggestions: ["Attempt the question"],
  isCorrect: false
}
```

---

## Feedback Guidelines

### Good Feedback Characteristics

1. **Specific:** "Include the chemical equation" not "Explain better"
2. **Constructive:** Focus on what to add/improve, not just what's wrong
3. **Educational:** Teach, don't just judge
4. **Encouraging:** Acknowledge strengths before weaknesses
5. **Actionable:** Provide clear next steps

### Feedback Templates

```typescript
// Partial credit (40-60%)
"Your answer {strength}, but {weakness}. To improve, {suggestion}."

// Near-perfect (80-90%)
"Strong answer! You {strength}. Consider adding {minor improvement}."

// Low score (0-30%)
"This answer {issue}. Please review {topic} and focus on {key concepts}."
```

---

## Performance

- **Single grading:** ~3-5 seconds
- **Batch grading (15 Q+A):** ~60-90 seconds (sequential)
- **Token usage:** ~500-1000 tokens per grade
- **Rate limit:** 15 RPM (handled with delays)

---

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `Invalid question` | Missing or malformed question | Validate question structure |
| `Empty answer` | No transcribed text | Return score: 0, skip grading |
| `Rate limit (429)` | Too many requests | Automatic retry with backoff |
| `Invalid score` | AI returned out-of-range score | Clamp to 0-maxScore range |

---

## Testing

```typescript
describe('gradeAnswer', () => {
  it('grades correct answer highly', async () => {
    const question = {
      number: '1',
      text: 'What is 2 + 2?',
      marks: 1
    };
    const answer = {
      transcribedText: '4',
      confidence: 1.0
    };
    
    const grade = await gradeAnswer(question, answer);
    
    expect(grade.score).toBe(1);
    expect(grade.isCorrect).toBe(true);
  });
  
  it('provides feedback for partial answer', async () => {
    const question = {
      number: '2',
      text: 'Explain photosynthesis',
      marks: 5
    };
    const answer = {
      transcribedText: 'Plants use sunlight',
      confidence: 0.9
    };
    
    const grade = await gradeAnswer(question, answer);
    
    expect(grade.score).toBeLessThan(grade.maxScore);
    expect(grade.feedback).toContain('incomplete');
    expect(grade.suggestions.length).toBeGreaterThan(0);
  });
});
```

---

## Analytics

```typescript
// Generate grading statistics
function generateGradingStats(grades: GradeResult[]): GradingStats {
  return {
    totalGraded: grades.length,
    averageScore: average(grades.map(g => g.percentage)),
    median: median(grades.map(g => g.percentage)),
    passRate: grades.filter(g => g.isCorrect).length / grades.length * 100,
    distribution: {
      '0-30%': grades.filter(g => g.percentage < 30).length,
      '30-50%': grades.filter(g => g.percentage >= 30 && g.percentage < 50).length,
      '50-70%': grades.filter(g => g.percentage >= 50 && g.percentage < 70).length,
      '70-90%': grades.filter(g => g.percentage >= 70 && g.percentage < 90).length,
      '90-100%': grades.filter(g => g.percentage >= 90).length
    }
  };
}
```

---

## References

See `references/feedback-templates.md` for more feedback examples.

See `scripts/test-grading.ts` for end-to-end test script.

---

## Related Skills

- `question-extraction` — Provides question context
- `answer-detection` — Provides transcribed answers
- `answer-mapping` — Provides Q+A pairs to grade
