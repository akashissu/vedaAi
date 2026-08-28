---
name: answer-detection
description: Detect answer regions on handwritten answer sheets using Gemini Vision bounding box detection. Returns precise coordinates, transcribed text, and question number references.
license: MIT
compatibility: Requires Google Gemini API with bounding box support (gemini-3-flash-preview or later)
metadata:
  author: VedaAI
  version: "1.0"
  category: vision-ocr
allowed-tools: gemini read write
---

# Answer Detection Skill

Detect and localize handwritten answers on exam answer sheets with pixel-accurate bounding boxes.

---

## When to Use This Skill

Use this skill when you need to:
- Detect answer regions on handwritten answer sheets
- Get bounding box coordinates for each answer
- Transcribe handwritten text via OCR
- Handle multi-page answer sheets
- Identify which question each answer corresponds to

**Do NOT use this for:**
- Printed question papers (use `question-extraction` instead)
- Blank pages
- Non-educational documents

---

## Required Inputs

| Input | Type | Description |
|-------|------|-------------|
| `answerSheetImages` | `Buffer[]` | Array of PNG/JPEG images (one per page) |
| `options` | `DetectionOptions` | Configuration options (optional) |

### DetectionOptions

```typescript
interface DetectionOptions {
  pageIndex?: number;           // If provided, process only this page
  minConfidence?: number;       // Default: 0.7 (0.0 to 1.0)
  includeTranscription?: boolean;  // Default: true
  detectContinuations?: boolean;   // Default: true (multi-page answers)
  temperature?: number;         // Default: 0.1
}
```

---

## Output Format

Returns `AnswerRegion[]`:

```typescript
interface AnswerRegion {
  id: string;                   // Auto-generated UUID
  questionNumber: string;       // What student wrote (e.g., "3", "Q5")
  pageIndex: number;            // 0-based page number
  boundingBox: [number, number, number, number];  // [ymin, xmin, ymax, xmax] (0-1000)
  transcribedText: string;      // OCR'd handwritten text
  confidence: number;           // 0.0 to 1.0
  continues: boolean;           // True if answer spans to next page
}
```

### Bounding Box Format

**CRITICAL:** Gemini returns `[ymin, xmin, ymax, xmax]` in 0-1000 normalized coordinates.

```
(0,0) ──────────────────── (1000, 0)
  │                              │
  │   ┌─────────────────┐        │
  │   │ (120, 50)       │        │
  │   │   Answer Box    │        │
  │   │       (450, 950)│        │
  │   └─────────────────┘        │
  │                              │
(0, 1000) ────────────── (1000, 1000)
```

Convert to pixels:
```typescript
const [ymin, xmin, ymax, xmax] = boundingBox;
const pixelBox = {
  left: (xmin / 1000) * pageWidth,
  top: (ymin / 1000) * pageHeight,
  width: ((xmax - xmin) / 1000) * pageWidth,
  height: ((ymax - ymin) / 1000) * pageHeight
};
```

---

## Implementation Steps

### Step 1: Prepare Answer Sheet Images

```typescript
import { detectAnswerRegions } from '@/lib/detection';

// Convert PDF to images
const images = await convertPdfToImages(answerSheetPdf, { dpi: 300 });
```

### Step 2: Detect Regions (Sequential)

```typescript
const allRegions: AnswerRegion[] = [];

// Process pages sequentially (avoid rate limits)
for (let i = 0; i < images.length; i++) {
  const regions = await detectAnswerRegions([images[i]], {
    pageIndex: i,
    minConfidence: 0.7
  });
  
  allRegions.push(...regions);
  
  // Rate limit protection: 1 second between calls
  if (i < images.length - 1) {
    await sleep(1000);
  }
}

console.log(`Detected ${allRegions.length} answer regions`);
```

### Step 3: Filter Low-Confidence Detections

```typescript
const highConfidence = allRegions.filter(r => r.confidence >= 0.8);
const lowConfidence = allRegions.filter(r => r.confidence < 0.8);

console.log(`High confidence: ${highConfidence.length}`);
console.log(`Low confidence (review): ${lowConfidence.length}`);
```

---

## Prompt Engineering

The skill uses this system prompt:

```
You are analyzing a handwritten answer sheet page.

TASK: Identify EVERY answer region on this page with precise bounding boxes.

For each answer region, provide:
1. The question number the student wrote (e.g., "1", "Q3", "5(a)")
2. The bounding box [ymin, xmin, ymax, xmax] normalized to 0-1000
3. A transcription of the handwritten text
4. Whether this answer continues to the next page

RULES:
- Include the question number/label if the student wrote one
- The bounding box should tightly encompass the ENTIRE answer
- Include diagrams/figures in the bounding box if part of the answer
- If no question number visible, use empty string ""
- Transcribe as accurately as possible (include [illegible] for unreadable text)

Return JSON array:
[{
  "questionNumber": "3",
  "boundingBox": [120, 50, 450, 950],
  "transcribedText": "Photosynthesis is the process...",
  "continues": false,
  "confidence": 0.9
}]

If page is blank or has no answers, return empty array: []
```

---

## Edge Cases

### 1. Out-of-Order Answers

Student answered Q5 before Q2:

```json
[
  {
    "questionNumber": "5",
    "boundingBox": [100, 50, 300, 950],
    "pageIndex": 0
  },
  {
    "questionNumber": "2",
    "boundingBox": [350, 50, 600, 950],
    "pageIndex": 0
  }
]
```

### 2. Multi-Page Answers

Answer starts on page 1, continues to page 2:

```json
[
  {
    "questionNumber": "10",
    "boundingBox": [100, 50, 950, 950],
    "pageIndex": 0,
    "continues": true,
    "transcribedText": "Part 1 of answer..."
  },
  {
    "questionNumber": "10",
    "boundingBox": [100, 50, 500, 950],
    "pageIndex": 1,
    "continues": false,
    "transcribedText": "...continuation of answer"
  }
]
```

### 3. No Question Number Written

Student forgot to write question number:

```json
{
  "questionNumber": "",
  "boundingBox": [200, 50, 400, 950],
  "transcribedText": "Some answer text...",
  "confidence": 0.75
}
```

This will be handled by the `answer-mapping` skill using content similarity.

### 4. Illegible Handwriting

```json
{
  "questionNumber": "7",
  "boundingBox": [100, 50, 300, 950],
  "transcribedText": "The process of [illegible] involves [illegible]...",
  "confidence": 0.5
}
```

---

## Coordinate Validation

Always validate bounding boxes:

```typescript
function isValidBoundingBox(box: [number, number, number, number]): boolean {
  const [ymin, xmin, ymax, xmax] = box;
  
  return (
    ymin >= 0 && ymin <= 1000 &&
    xmin >= 0 && xmin <= 1000 &&
    ymax >= 0 && ymax <= 1000 &&
    xmax >= 0 && xmax <= 1000 &&
    ymax > ymin &&  // Box has height
    xmax > xmin     // Box has width
  );
}

// Filter invalid boxes
const validRegions = regions.filter(r => isValidBoundingBox(r.boundingBox));
```

---

## Performance

- **Single page:** ~3-8 seconds
- **10-page answer sheet:** ~40-90 seconds (sequential processing)
- **Token usage:** ~1500-2500 tokens per page
- **Rate limit:** 15 RPM (handled via 1-second delays)

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `No regions detected` | Blank page or very light handwriting | Increase image contrast, check DPI |
| `Invalid bounding box` | Gemini returned out-of-range coords | Filter with validation function |
| `Rate limit (429)` | Too many requests | Automatic retry with backoff (already implemented) |
| `Low confidence` | Poor handwriting or image quality | Flag for manual review |

---

## Testing

```typescript
// Test with sample answer sheet
const testImage = Buffer.from('...');  // Page 1

const result = await detectAnswerRegions([testImage], {
  pageIndex: 0,
  minConfidence: 0.7
});

// Assertions
expect(result.length).toBeGreaterThan(0);
expect(result[0].boundingBox).toHaveLength(4);
expect(result[0].questionNumber).toBeTruthy();
expect(result[0].confidence).toBeGreaterThan(0.7);
```

---

## Visualization Helper

```typescript
// lib/visualization.ts
export function drawBoundingBoxes(
  imagePath: string,
  regions: AnswerRegion[],
  outputPath: string
) {
  const image = sharp(imagePath);
  const { width, height } = await image.metadata();
  
  for (const region of regions) {
    const [ymin, xmin, ymax, xmax] = region.boundingBox;
    
    const pixelBox = {
      left: Math.round((xmin / 1000) * width),
      top: Math.round((ymin / 1000) * height),
      width: Math.round(((xmax - xmin) / 1000) * width),
      height: Math.round(((ymax - ymin) / 1000) * height)
    };
    
    // Draw rectangle (using sharp composite)
    // ... implementation
  }
  
  await image.toFile(outputPath);
}
```

---

## References

See `references/bounding-box-format.md` for coordinate system details.

See `references/handwriting-ocr.md` for OCR accuracy tips.

See `scripts/test-detection.ts` for end-to-end test script.

---

## Related Skills

- `question-extraction` — Extract questions to map these answers to
- `answer-mapping` — Map these detected regions to questions
- `grading` — Grade the transcribed answers
