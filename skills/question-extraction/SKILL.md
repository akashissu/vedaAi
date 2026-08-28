---
name: question-extraction
description: Extract questions from exam/assessment question papers (PDF or images) using Gemini Vision. Preserves original numbering, handles sub-parts, and maintains question order.
license: MIT
compatibility: Requires Google Gemini API access (gemini-3-flash-preview or later)
metadata:
  author: VedaAI
  version: "1.0"
  category: document-processing
allowed-tools: gemini read write
---

# Question Extraction Skill

Extract structured questions from educational assessment papers using AI vision.

---

## When to Use This Skill

Use this skill when you need to:
- Extract questions from a PDF question paper
- Parse printed exam questions into structured data
- Handle question papers with sub-parts (e.g., 1a, 1b, 2a)
- Preserve original question numbering
- Extract marks/points associated with questions

**Do NOT use this for:**
- Handwritten answer sheets (use `answer-detection` skill instead)
- Plain text documents (use text parsing)
- Non-educational documents

---

## Required Inputs

| Input | Type | Description |
|-------|------|-------------|
| `questionPaperImages` | `Buffer[]` | Array of PNG/JPEG images (one per page) |
| `options` | `ExtractionOptions` | Configuration options (optional) |

### ExtractionOptions

```typescript
interface ExtractionOptions {
  preserveOriginalNumbering?: boolean;  // Default: true
  extractMarks?: boolean;               // Default: true
  splitSubParts?: boolean;              // Default: true (11a, 11b as separate)
  temperature?: number;                 // Default: 0.1 (low for consistency)
}
```

---

## Output Format

Returns `ExtractedQuestion[]`:

```typescript
interface ExtractedQuestion {
  id: string;              // Auto-generated UUID
  number: string;          // Original numbering: "1", "2(a)", "11(b)"
  text: string;            // Full question text
  marks: number | null;    // Points if visible, else null
  parentNumber: string | null;  // "11" if this is "11(a)", else null
  pageIndex: number;       // 0-based page number where found
}
```

### Example Output

```json
[
  {
    "id": "q-001",
    "number": "1",
    "text": "Define photosynthesis and explain its importance.",
    "marks": 5,
    "parentNumber": null,
    "pageIndex": 0
  },
  {
    "id": "q-002a",
    "number": "2(a)",
    "text": "What is the chemical formula for water?",
    "marks": 2,
    "parentNumber": "2",
    "pageIndex": 0
  },
  {
    "id": "q-002b",
    "number": "2(b)",
    "text": "Explain the water cycle.",
    "marks": 3,
    "parentNumber": "2",
    "pageIndex": 0
  }
]
```

---

## Implementation Steps

### Step 1: Prepare Images

```typescript
import { extractQuestions } from '@/lib/extraction';

// Convert PDF to images (300 DPI recommended)
const images = await convertPdfToImages(questionPaperPdf, { dpi: 300 });
```

### Step 2: Call Extraction

```typescript
const questions = await extractQuestions(images, {
  preserveOriginalNumbering: true,
  splitSubParts: true,
  extractMarks: true
});

console.log(`Extracted ${questions.length} questions`);
```

### Step 3: Validate Output

```typescript
// Check for issues
if (questions.length === 0) {
  throw new Error('No questions found. Check image quality.');
}

// Verify sequential numbering (optional)
const numbers = questions.map(q => q.number);
console.log('Question numbers:', numbers);
```

---

## Prompt Engineering

The skill uses this system prompt structure:

```
You are analyzing an educational assessment question paper.

TASK: Extract ALL questions in their EXACT printed order.

RULES:
1. Each labelled sub-part (e.g., 11(a), 11(b)) is a SEPARATE question entry
2. Preserve the EXACT original numbering format from the paper
3. Include marks/points if visible (e.g., "[5 marks]", "(3 points)")
4. Include any instructions that are part of the question
5. Do NOT include general instructions (e.g., "Section A: Answer all questions")
6. Do NOT invent or renumber questions

Return JSON array with this EXACT structure:
[{
  "number": "1",
  "text": "Full question text...",
  "marks": 5
}, {
  "number": "2(a)",
  "text": "Sub-part question text...",
  "marks": 3
}]
```

---

## Edge Cases

### Multiple Choice Questions

```json
{
  "number": "5",
  "text": "Which is the capital of France? (A) Berlin (B) Paris (C) Rome (D) Madrid",
  "marks": 1
}
```

### Questions with Diagrams

```json
{
  "number": "7",
  "text": "Refer to the diagram below. Calculate the area of the shaded region. [Diagram shows a circle with inner square]",
  "marks": 4
}
```

### Questions Spanning Pages

If a question starts on page 1 and continues on page 2, it will be extracted as a single entry with the full text.

```json
{
  "number": "10",
  "text": "Long question text that spans multiple lines and continues to the next page...",
  "marks": 10,
  "pageIndex": 1
}
```

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `No questions found` | Blank images, poor quality | Check image DPI (use 300+), verify images aren't corrupted |
| `Invalid JSON response` | Gemini returned non-JSON | Retry with stricter prompt, check API response |
| `Duplicate question numbers` | OCR confusion | Manual review, or use fuzzy matching |
| `Missing marks` | Marks not visible in paper | marks field will be `null` |

---

## Performance

- **Single page:** ~5-10 seconds
- **5-page paper:** ~15-25 seconds
- **Token usage:** ~2000-3000 tokens per page
- **Rate limit:** 15 RPM (free tier) — handled automatically

---

## Testing

```typescript
// Test with sample question paper
const testImages = [
  Buffer.from('...'),  // Page 1 image
  Buffer.from('...')   // Page 2 image
];

const result = await extractQuestions(testImages);

// Assertions
expect(result).toHaveLength(15);
expect(result[0].number).toBe('1');
expect(result.every(q => q.text.length > 0)).toBe(true);
```

---

## References

See `references/prompt-templates.md` for full prompt variations.

See `scripts/test-extraction.ts` for end-to-end test script.

---

## Related Skills

- `answer-detection` — Detect answer regions on handwritten sheets
- `answer-mapping` — Map detected answers to these extracted questions
- `grading` — Grade mapped question-answer pairs
