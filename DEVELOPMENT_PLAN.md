# VedaAI - AI Assessment Extraction & Answer Mapping

## Development Plan

---

## 1. Project Overview

Build a web application where a teacher uploads:
1. A **question paper** (PDF/images)
2. A **student handwritten answer sheet** (PDF/images)

The app extracts questions, maps student answers to them, highlights exact answer regions on the sheet, and optionally grades/provides feedback.

---

## 2. Tech Stack Decision

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js 14+ (App Router)** | Recommended, SSR/API routes in one project |
| Language | **TypeScript** | Type safety for complex data structures |
| UI | **Tailwind CSS + shadcn/ui** | Rapid, beautiful, accessible components |
| AI Model | **Google Gemini 3.5 Flash** (free tier) | Vision + PDF native support, bounding box detection, structured JSON output, 1M token context |
| PDF Rendering | **react-pdf** (pdf.js wrapper) | Render pages as canvas, overlay highlights |
| PDF Processing | **pdf-lib / sharp** | Convert PDF pages to images for Gemini |
| Highlighting | **Custom canvas overlay** | Draw bounding boxes on rendered PDF pages |
| State | **In-memory (React state + API route memory)** | No DB required per spec |
| Deployment | **Vercel** (Hobby plan + Fluid Compute) | Free, up to 300s function timeout |

---

## 3. AI Strategy (Core Architecture)

### 3.1 Why Gemini?

- **Free tier** available (gemini-3-flash-preview)
- **Native PDF understanding** — upload PDFs directly, no OCR preprocessing needed
- **Bounding box detection** — returns coordinates in `[ymin, xmin, ymax, xmax]` format normalized to 0-1000
- **Structured output** — can return JSON schema-validated responses
- **1M token context** — can process full question papers + answer sheets

### 3.2 Processing Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    PROCESSING PIPELINE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: QUESTION EXTRACTION                                 │
│  ─────────────────────────────                               │
│  Input:  Question paper PDF/images                           │
│  Model:  Gemini Vision                                       │
│  Prompt: Extract all questions with numbering                │
│  Output: Array of {id, number, text, marks}                  │
│                                                              │
│  Step 2: ANSWER REGION DETECTION                             │
│  ─────────────────────────────────                           │
│  Input:  Answer sheet PDF/images (page by page)              │
│  Model:  Gemini Vision + Bounding Box                        │
│  Prompt: Identify each answer region with bounding boxes     │
│  Output: Array of {                                          │
│    questionRef,                                              │
│    pageIndex,                                                │
│    boundingBox: [ymin, xmin, ymax, xmax],                   │
│    transcribedText                                           │
│  }                                                           │
│                                                              │
│  Step 3: ANSWER MAPPING                                      │
│  ──────────────────────                                      │
│  Input:  Questions + Detected answer regions                 │
│  Logic:  Match each answer to its question by:               │
│          - Question number written by student                │
│          - Content similarity                                │
│          - Sequential ordering as fallback                   │
│  Output: Mapped pairs + unmatched/unanswered                 │
│                                                              │
│  Step 4: GRADING & FEEDBACK (Optional Enhancement)           │
│  ────────────────────────────────────────────────            │
│  Input:  Question + Mapped Answer text                       │
│  Model:  Gemini                                              │
│  Output: Score, correctness, feedback per question           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Gemini API Usage Details

**Bounding Box Format:**
- Coordinates: `[y_min, x_min, y_max, x_max]`
- Normalized to 0-1000 grid
- Convert to pixel coords: `pixel_x = (x_norm / 1000) * image_width`

**Structured Output Schema:**
```typescript
// Question Extraction Schema
interface ExtractedQuestion {
  id: string;
  number: string;        // "1", "2(a)", "11(b)"
  text: string;
  marks?: number;
  subParts?: string[];
}

// Answer Region Schema  
interface AnswerRegion {
  questionNumber: string;
  pageIndex: number;
  boundingBox: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  transcribedText: string;
  confidence: number;
}

// Mapping Result
interface MappedResult {
  question: ExtractedQuestion;
  answer: AnswerRegion | null;  // null = unanswered
  status: 'answered' | 'unanswered' | 'partial';
  grade?: {
    score: number;
    maxScore: number;
    feedback: string;
    isCorrect: boolean;
  };
}
```

---

## 4. UI/UX Design (Based on Figma Reference)

### 4.1 Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER: VedaAI Assessment Analyzer                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─── UPLOAD STATE ───────────────────────────────────────┐  │
│  │  Drop Zone: Question Paper  │  Drop Zone: Answer Sheet │  │
│  │  [PDF/Image upload]         │  [PDF/Image upload]      │  │
│  │  Progress bar               │  Progress bar            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─── PROCESSING STATE ───────────────────────────────────┐  │
│  │  Step indicator with progress:                         │  │
│  │  [✓] Extracting Questions                              │  │
│  │  [●] Detecting Answers                                 │  │
│  │  [ ] Mapping Answers                                   │  │
│  │  [ ] Generating Feedback                               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─── RESULTS STATE ─────────────────────────────────────┐   │
│  │                                                        │   │
│  │  ┌─────────────┐  ┌──────────────────────────────┐    │   │
│  │  │  QUESTIONS   │  │  ANSWER SHEET VIEWER         │    │   │
│  │  │  PANEL       │  │                              │    │   │
│  │  │  (Sidebar)   │  │  [PDF rendered with          │    │   │
│  │  │              │  │   highlighted regions]        │    │   │
│  │  │  Q1 ✓       │  │                              │    │   │
│  │  │  Q2 ✓       │  │  ┌──────────────────┐        │    │   │
│  │  │  Q3 ✗       │  │  │ HIGHLIGHTED AREA │        │    │   │
│  │  │  Q4 ✓       │  │  │ (yellow overlay) │        │    │   │
│  │  │  Q5(a) ✓    │  │  └──────────────────┘        │    │   │
│  │  │  Q5(b) ✗    │  │                              │    │   │
│  │  │              │  │                              │    │   │
│  │  └─────────────┘  └──────────────────────────────┘    │   │
│  │                                                        │   │
│  │  ┌─── ANSWER DETAIL / GRADING PANEL ──────────────┐   │   │
│  │  │  Question: What is photosynthesis?              │   │   │
│  │  │  Student Answer: [transcribed text]             │   │   │
│  │  │  Score: 3/5  |  AI Feedback: "Partially..."    │   │   │
│  │  └────────────────────────────────────────────────┘   │   │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Interaction Flow

1. **Upload** → Drag & drop or click to upload both files
2. **Processing** → Show real-time progress with streaming updates
3. **Results** → Split-panel: questions list (left) + answer sheet viewer (right)
4. **Click Question** → Scroll to & highlight the answer region on the sheet
5. **Grade View** → Show AI feedback below the viewer

### 4.3 Key UI Components

| Component | Description |
|-----------|-------------|
| `FileUploader` | Drag-drop zone with progress, file type validation |
| `ProcessingStatus` | Step-by-step progress indicator with animations |
| `QuestionList` | Scrollable sidebar with status icons (✓/✗/?) |
| `AnswerSheetViewer` | PDF renderer with overlay highlight layer |
| `HighlightOverlay` | Absolute-positioned colored boxes over PDF pages |
| `GradingPanel` | Expandable section with score + AI feedback |
| `SummaryCard` | Overall stats: answered/unanswered/total score |

---

## 5. Project Structure

```
vedaai/
├── app/
│   ├── layout.tsx              # Root layout with fonts, metadata
│   ├── page.tsx                # Main page (upload + results)
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.ts       # Handle file uploads
│   │   ├── process/
│   │   │   └── route.ts       # Trigger AI processing pipeline
│   │   ├── status/
│   │   │   └── route.ts       # SSE endpoint for progress updates
│   │   └── grade/
│   │       └── route.ts       # Optional: grade a specific question
│   └── globals.css
├── components/
│   ├── ui/                     # shadcn components
│   ├── FileUploader.tsx
│   ├── ProcessingStatus.tsx
│   ├── QuestionList.tsx
│   ├── QuestionItem.tsx
│   ├── AnswerSheetViewer.tsx
│   ├── HighlightOverlay.tsx
│   ├── GradingPanel.tsx
│   └── SummaryCard.tsx
├── lib/
│   ├── gemini.ts              # Gemini API client & helpers
│   ├── pdf-utils.ts           # PDF to image conversion
│   ├── extraction.ts          # Question extraction logic
│   ├── detection.ts           # Answer region detection
│   ├── mapping.ts             # Question-answer mapping
│   ├── grading.ts             # AI grading logic
│   ├── types.ts               # TypeScript interfaces
│   └── store.ts               # In-memory session store
├── public/
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
├── vercel.json
└── .env.local                 # GEMINI_API_KEY
```

---

## 6. Implementation Phases

### Phase 1: Project Setup & UI Shell (Day 1)
- [x] Initialize Next.js project with TypeScript
- [ ] Install dependencies (tailwind, shadcn, react-pdf, pdf-lib, sharp, @google/generative-ai)
- [ ] Setup Tailwind + shadcn/ui
- [ ] Build upload UI with drag-drop zones
- [ ] Build processing status component
- [ ] Build results layout (split panel)

### Phase 2: File Processing Backend (Day 1-2)
- [ ] API route for file upload (store in memory/temp)
- [ ] PDF to image conversion (per page)
- [ ] Gemini API client setup with structured output
- [ ] SSE endpoint for streaming progress updates

### Phase 3: Question Extraction (Day 2)
- [ ] Prompt engineering for question extraction
- [ ] Handle sub-parts (11a, 11b as separate entries)
- [ ] Preserve original numbering
- [ ] Parse Gemini structured response
- [ ] Display extracted questions in sidebar

### Phase 4: Answer Detection & Mapping (Day 2-3)
- [ ] Per-page answer region detection with bounding boxes
- [ ] Handle multi-page answers
- [ ] Map answers to questions (by number reference + content)
- [ ] Handle out-of-order answers
- [ ] Handle unanswered questions
- [ ] Handle orphan answers (no matching question)

### Phase 5: Answer Highlighting (Day 3)
- [ ] Render answer sheet pages with react-pdf
- [ ] Overlay highlight boxes at detected coordinates
- [ ] Click question → scroll to & highlight answer region
- [ ] Handle multi-page spanning
- [ ] Smooth scroll + animation on highlight

### Phase 6: Grading & Feedback (Day 3-4)
- [ ] AI grading per question
- [ ] Score calculation
- [ ] Feedback generation
- [ ] Summary statistics card
- [ ] Overall grade display

### Phase 7: Edge Cases & Polish (Day 4)
- [ ] Empty/invalid file handling
- [ ] Large file handling (pagination)
- [ ] Error states & retry logic
- [ ] Loading skeletons
- [ ] Mobile responsive layout
- [ ] Performance optimization

### Phase 8: Deployment (Day 4)
- [ ] Configure vercel.json (Fluid Compute, maxDuration)
- [ ] Environment variables setup
- [ ] Deploy to Vercel
- [ ] Test with real papers
- [ ] Final polish

---

## 7. Key Technical Decisions

### 7.1 PDF Handling Strategy

**Option A (Chosen): Convert PDF pages to images → Send to Gemini Vision**

Why:
- Gemini's native PDF support works but bounding box detection is more reliable on images
- Images allow consistent coordinate mapping back to the viewer
- Each page = one image = one set of bounding box coordinates
- Easier to overlay highlights on rendered pages

Process:
```
PDF → pdf-lib (get page count) → sharp (render each page as PNG at 300dpi) → Gemini Vision
```

### 7.2 Highlighting Strategy

**Approach: Canvas overlay on react-pdf pages**

1. react-pdf renders each PDF page as a `<canvas>`
2. We overlay an absolute-positioned `<div>` on top
3. Bounding boxes from Gemini (0-1000 normalized) are scaled to page pixel dimensions
4. Highlighted regions = semi-transparent colored rectangles
5. Active highlight = brighter color + animated border

```typescript
// Convert Gemini box to pixel coordinates
function toPixelBox(box: [number, number, number, number], pageWidth: number, pageHeight: number) {
  const [ymin, xmin, ymax, xmax] = box;
  return {
    left: (xmin / 1000) * pageWidth,
    top: (ymin / 1000) * pageHeight,
    width: ((xmax - xmin) / 1000) * pageWidth,
    height: ((ymax - ymin) / 1000) * pageHeight,
  };
}
```

### 7.3 Streaming Progress Updates

Use Server-Sent Events (SSE) for real-time progress:

```typescript
// API Route: /api/status
export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };
      
      send({ step: 'extracting_questions', progress: 0 });
      // ... processing updates
    }
  });
  
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

### 7.4 Handling Multi-Page Answers

When a student's answer spans multiple pages:
- Gemini detects the answer starts on page N and continues on page N+1
- Store as array of regions: `[{pageIndex: 2, box: [...]}, {pageIndex: 3, box: [...]}]`
- When clicked, scroll to first region, show "continues on next page" indicator

### 7.5 Out-of-Order Answer Handling

Strategy:
1. First pass: Detect all answer regions with the question numbers students wrote
2. Second pass: Match by question number (student often writes "Q3" or "3)" before answer)
3. Fallback: Use content similarity matching via Gemini
4. Edge case: If no match found, mark as "Orphan Answer"

---

## 8. Gemini Prompt Engineering

### 8.1 Question Extraction Prompt

```
You are analyzing a question paper. Extract ALL questions in exact order.

Rules:
- Each labelled sub-part (e.g., 11(a), 11(b)) is a SEPARATE question entry
- Preserve the EXACT original numbering format
- Include marks if visible
- Include any instructions that are part of the question

Return as JSON array with this exact structure:
[{
  "number": "1",
  "text": "Full question text...",
  "marks": 5,
  "hasSubParts": false
}, {
  "number": "2(a)", 
  "text": "Sub-part question text...",
  "marks": 3,
  "hasSubParts": false
}]
```

### 8.2 Answer Region Detection Prompt

```
You are analyzing a handwritten answer sheet page. 
Identify EVERY answer region on this page.

For each answer region, provide:
1. The question number the student is answering (as written by them)
2. The bounding box [ymin, xmin, ymax, xmax] normalized 0-1000
3. A transcription of the handwritten text
4. Whether the answer continues on another page

Rules:
- Include the question number/label if the student wrote one
- The bounding box should tightly encompass the ENTIRE answer
- Include diagrams/figures in the bounding box if part of the answer
- If answer continues beyond this page, set "continues": true

Return JSON:
[{
  "questionNumber": "3",
  "boundingBox": [120, 50, 450, 950],
  "transcribedText": "The answer text...",
  "continues": false,
  "confidence": 0.9
}]
```

---

## 9. Edge Case Handling Matrix

| Edge Case | Detection Method | UI Behavior |
|-----------|-----------------|-------------|
| Unanswered question | No matching region found | Red "✗" icon, "Not answered" label |
| Out-of-order answer | Match by question number written | Normal display, sorted by question |
| Multi-page answer | `continues: true` flag | "Continues on page X" indicator |
| Orphan answer (no question match) | No matching question number | "Unmatched Answer" section at bottom |
| Illegible handwriting | Low confidence score | "⚠ Low confidence" warning |
| Sub-parts answered together | Single region, multiple questions | Map region to all relevant sub-parts |
| Blank pages in answer sheet | No regions detected | Skip in display |
| Mixed languages | Gemini handles multilingual | Normal processing |

---

## 10. Deployment Configuration

### vercel.json
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "app/api/process/route.ts": {
      "maxDuration": 300
    }
  }
}
```

### Environment Variables
```
GEMINI_API_KEY=your_api_key_here
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Key Vercel Settings
- Enable **Fluid Compute** (free, extends timeout to 300s)
- Node.js 20 runtime
- Region: auto (closest to user)

---

## 11. Dependencies

```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "typescript": "^5.4",
    "@google/generative-ai": "latest",
    "react-pdf": "^9.0",
    "pdfjs-dist": "^4.0",
    "sharp": "^0.33",
    "pdf-lib": "^1.17",
    "tailwindcss": "^3.4",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "lucide-react": "latest",
    "framer-motion": "latest",
    "react-dropzone": "latest"
  }
}
```

---

## 12. Risk Assessment & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Gemini rate limits on free tier | Processing fails | Implement retry with exponential backoff, process pages sequentially |
| Bounding box inaccuracy | Wrong highlight | Add confidence scores, allow manual adjustment |
| Vercel 300s timeout | Large papers fail | Process in chunks, stream results progressively |
| Handwriting too illegible | Poor transcription | Show confidence warning, fall back to image crop display |
| PDF rendering mismatch | Highlights misaligned | Use same DPI for image extraction and display |
| Large file uploads | Memory issues | Limit file size (20MB), process page-by-page |

---

## 13. Success Metrics (What Evaluators Look For)

1. **Accuracy of question extraction** — All questions including sub-parts
2. **Accuracy of answer mapping** — Correct question-answer pairing
3. **Correct highlighting** — Boxes tightly around actual answers
4. **Edge case handling** — Unanswered, out-of-order, multi-page
5. **Quality of implementation** — Clean code, proper error handling
6. **Product experience** — Smooth UX, clear feedback, intuitive flow

---

## 14. Timeline Estimate

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Setup + UI | 4-5 hrs | Working upload & layout |
| Backend + Gemini | 4-5 hrs | Processing pipeline |
| Question Extraction | 3-4 hrs | Accurate extraction |
| Answer Detection + Mapping | 5-6 hrs | Core feature complete |
| Highlighting | 3-4 hrs | Visual highlighting |
| Grading | 2-3 hrs | AI feedback |
| Polish + Deploy | 3-4 hrs | Live URL |
| **Total** | **~25-30 hrs** | **Full submission** |

---

## 15. Summary

The core insight is using **Gemini's vision + bounding box capabilities** to both read handwritten text AND locate it spatially on the page. This eliminates the need for separate OCR + layout detection pipelines. The single-model approach (Gemini for everything) keeps the architecture simple while leveraging its free tier.

**Key differentiator:** The bounding box detection gives us pixel-accurate answer regions that we can directly overlay on the PDF viewer — making the "click question → see highlighted answer" interaction feel instant and precise.
