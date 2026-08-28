# VedaAI - System Architecture & Folder Structure

---

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
│                                                                             │
│  ┌───────────┐   ┌──────────────┐   ┌──────────────┐   ┌───────────────┐  │
│  │  Upload   │──▶│  Processing  │──▶│   Results    │──▶│   Grading     │  │
│  │  Screen   │   │   Screen     │   │   Screen     │   │   Summary     │  │
│  └───────────┘   └──────────────┘   └──────────────┘   └───────────────┘  │
│       │                 ▲                   │                    │           │
│       │                 │ SSE               │                    │           │
│       ▼                 │ (progress)        ▼                    ▼           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        React State Manager                           │   │
│  │  (useReducer + Context — holds session, questions, answers, grades)  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
└───────│─────────────────────────────────────────────────────────────────────┘
        │  HTTP / SSE
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVER (Next.js API Routes)                         │
│                                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────┐   ┌───────────────┐  │
│  │ POST         │   │ POST         │   │ GET       │   │ POST          │  │
│  │ /api/upload  │   │ /api/process │   │ /api/     │   │ /api/grade    │  │
│  │              │   │              │   │ status    │   │               │  │
│  └──────┬───────┘   └──────┬───────┘   └─────┬─────┘   └───────┬───────┘  │
│         │                  │                  │                  │           │
│         ▼                  ▼                  │                  ▼           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    In-Memory Session Store                           │    │
│  │  Map<sessionId, { files, questions, answers, mappings, grades }>     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│         │                  │                                    │           │
│         ▼                  ▼                                    ▼           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Processing Engine                               │    │
│  │                                                                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │    │
│  │  │  PDF to  │─▶│ Question │─▶│  Answer  │─▶│  Answer  │           │    │
│  │  │  Images  │  │Extraction│  │Detection │  │ Mapping  │           │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │    │
│  │       │              │             │              │                  │    │
│  │       ▼              ▼             ▼              ▼                  │    │
│  │  ┌─────────────────────────────────────────────────────────┐        │    │
│  │  │              Google Gemini API (Vision + JSON)            │        │    │
│  │  │  - gemini-3-flash-preview (free tier)                    │        │    │
│  │  │  - Structured output with response_schema                │        │    │
│  │  │  - Bounding box detection [ymin,xmin,ymax,xmax] 0-1000  │        │    │
│  │  └─────────────────────────────────────────────────────────┘        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW PIPELINE                           │
└─────────────────────────────────────────────────────────────────────┘

 UPLOAD                PROCESS                 DISPLAY              INTERACT
 ──────                ───────                 ───────              ────────

 ┌─────────┐     ┌──────────────┐      ┌─────────────┐     ┌─────────────┐
 │Question │     │  Convert to  │      │  Questions  │     │   Click     │
 │Paper    │────▶│  Images      │─────▶│  List Panel │────▶│   Question  │
 │(PDF)    │     │  (per page)  │      │  (sidebar)  │     │             │
 └─────────┘     └──────┬───────┘      └─────────────┘     └──────┬──────┘
                         │                                         │
                         ▼                                         │
                  ┌──────────────┐                                 │
                  │   Gemini:    │                                 │
                  │   Extract    │                                 │
                  │   Questions  │                                 │
                  └──────────────┘                                 │
                                                                   │
 ┌─────────┐     ┌──────────────┐      ┌─────────────┐           │
 │Answer   │     │  Convert to  │      │Answer Sheet │           │
 │Sheet    │────▶│  Images      │─────▶│  Viewer     │◀──────────┘
 │(PDF)    │     │  (per page)  │      │  + Overlay  │
 └─────────┘     └──────┬───────┘      └──────┬──────┘
                         │                     │
                         ▼                     │
                  ┌──────────────┐             │
                  │   Gemini:    │             ▼
                  │   Detect     │      ┌─────────────┐
                  │   Answer     │─────▶│  Highlight  │
                  │   Regions    │      │  Bounding   │
                  │   + Boxes    │      │  Box Layer  │
                  └──────────────┘      └─────────────┘
                         │
                         ▼
                  ┌──────────────┐      ┌─────────────┐
                  │   Gemini:    │      │  Grading    │
                  │   Map Q→A    │─────▶│  Panel +    │
                  │   + Grade    │      │  Feedback   │
                  └──────────────┘      └─────────────┘
```

---

## 3. Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        COMPONENT TREE                                │
└─────────────────────────────────────────────────────────────────────┘

App (layout.tsx)
│
├── page.tsx (Main Page — state machine: upload → processing → results)
│   │
│   ├── <UploadSection />                    [STATE: upload]
│   │   ├── <FileDropZone type="question" />
│   │   │   └── <ProgressBar />
│   │   ├── <FileDropZone type="answer" />
│   │   │   └── <ProgressBar />
│   │   └── <ProcessButton />
│   │
│   ├── <ProcessingSection />                [STATE: processing]
│   │   ├── <StepIndicator steps={4} />
│   │   │   ├── Step: "Extracting Questions"
│   │   │   ├── Step: "Detecting Answers"
│   │   │   ├── Step: "Mapping Answers"
│   │   │   └── Step: "Generating Grades"
│   │   └── <ProcessingAnimation />
│   │
│   └── <ResultsSection />                   [STATE: results]
│       ├── <SummaryBar />
│       │   ├── Total Questions
│       │   ├── Answered Count
│       │   ├── Unanswered Count
│       │   └── Overall Score
│       │
│       ├── <SplitPanel>
│       │   ├── <QuestionPanel />            [LEFT SIDE - 30%]
│       │   │   ├── <SearchFilter />
│       │   │   └── <QuestionList />
│       │   │       └── <QuestionItem />     (× N questions)
│       │   │           ├── Question Number
│       │   │           ├── Status Icon (✓/✗/⚠)
│       │   │           ├── Score Badge
│       │   │           └── onClick → highlight
│       │   │
│       │   └── <AnswerViewer />             [RIGHT SIDE - 70%]
│       │       ├── <PageNavigation />
│       │       ├── <PDFPageRenderer />
│       │       │   ├── <canvas /> (pdf.js)
│       │       │   └── <HighlightOverlay />
│       │       │       └── <BoundingBox />  (× N regions)
│       │       │           ├── Colored rectangle
│       │       │           ├── Label badge
│       │       │           └── Pulse animation (active)
│       │       └── <ZoomControls />
│       │
│       └── <DetailPanel />                  [BOTTOM]
│           ├── <AnswerTranscription />
│           ├── <GradingResult />
│           │   ├── Score (x/y)
│           │   ├── Correctness indicator
│           │   └── AI Feedback text
│           └── <NavigationButtons />
```

---

## 4. API Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          API ROUTES                                   │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  POST /api/upload                                             │
│  ─────────────────                                            │
│  Input:  FormData { questionPaper: File, answerSheet: File }  │
│  Action: Store files in memory, create session ID             │
│  Output: { sessionId, questionPages: number,                  │
│            answerPages: number }                               │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  POST /api/process                                            │
│  ──────────────────                                           │
│  Input:  { sessionId }                                        │
│  Action: Triggers the full AI pipeline (async, streams SSE)   │
│  Output: Stream (text/event-stream)                           │
│                                                               │
│  Events emitted:                                              │
│    → { step: "converting", progress: 20 }                     │
│    → { step: "extracting_questions", progress: 40 }           │
│    → { step: "detecting_answers", progress: 60 }              │
│    → { step: "mapping", progress: 80 }                        │
│    → { step: "grading", progress: 90 }                        │
│    → { step: "complete", data: { questions, mappings } }      │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  GET /api/results?sessionId=xxx                               │
│  ──────────────────────────────                               │
│  Input:  sessionId (query param)                              │
│  Action: Return processed results from memory                 │
│  Output: {                                                    │
│    questions: ExtractedQuestion[],                             │
│    mappings: MappedResult[],                                  │
│    summary: { total, answered, unanswered, score }            │
│  }                                                            │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  GET /api/page-image?sessionId=xxx&type=answer&page=1         │
│  ────────────────────────────────────────────────             │
│  Input:  sessionId, type (question|answer), page number       │
│  Action: Return the rendered page image                       │
│  Output: image/png (the page rendered as image)               │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  POST /api/grade                                              │
│  ───────────────                                              │
│  Input:  { sessionId, questionId }                            │
│  Action: Grade a specific question using Gemini               │
│  Output: { score, maxScore, feedback, isCorrect }             │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. State Machine Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION STATE MACHINE                          │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────┐    files selected     ┌──────────┐
    │          │ ────────────────────▶  │          │
    │   IDLE   │                        │  READY   │
    │          │ ◀────────────────────  │          │
    └──────────┘    file removed        └────┬─────┘
                                             │
                                             │ click "Process"
                                             ▼
                                        ┌──────────┐
                              ┌─────────│UPLOADING │
                              │         └────┬─────┘
                              │              │ upload complete
                              │              ▼
                              │         ┌──────────────────┐
                              │         │   PROCESSING     │
                              │         │                  │
                              │         │  sub-states:     │
                              │         │  • converting    │
                    error      │         │  • extracting    │
                    ┌─────────│         │  • detecting     │
                    │         │         │  • mapping       │
                    ▼         │         │  • grading       │
               ┌──────────┐  │         └────────┬─────────┘
               │  ERROR    │  │                  │ all steps done
               │           │◀─┘                  ▼
               │  (retry)  │            ┌──────────────────┐
               └──────────┘            │     RESULTS      │
                    │                   │                  │
                    │    retry          │  interactions:   │
                    └──────────────▶    │  • select Q      │
                                        │  • view answer   │
                                        │  • see grade     │
                                        │  • navigate page │
                                        └──────────────────┘
```

---

## 6. Gemini AI Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   GEMINI INTEGRATION LAYER                            │
└─────────────────────────────────────────────────────────────────────┘

                    lib/gemini.ts (Client Singleton)
                    ┌────────────────────────────┐
                    │  GoogleGenerativeAI client  │
                    │  model: gemini-3-flash      │
                    │  + retry logic              │
                    │  + rate limit handling      │
                    └────────────┬───────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                   │
              ▼                  ▼                   ▼
┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ lib/extraction  │  │ lib/detection    │  │ lib/grading      │
│ .ts             │  │ .ts             │  │ .ts              │
├─────────────────┤  ├──────────────────┤  ├──────────────────┤
│                 │  │                  │  │                  │
│ extractQuestions│  │ detectAnswers    │  │ gradeAnswer      │
│ (images[])     │  │ (images[])       │  │ (question,       │
│                 │  │                  │  │  answer)         │
│ Returns:        │  │ Returns:         │  │                  │
│ [{              │  │ [{               │  │ Returns:         │
│   number,       │  │   questionNum,   │  │ {                │
│   text,         │  │   pageIndex,     │  │   score,         │
│   marks         │  │   boundingBox,   │  │   maxScore,      │
│ }]              │  │   transcription  │  │   feedback,      │
│                 │  │ }]               │  │   isCorrect      │
└─────────────────┘  └──────────────────┘  │ }                │
                                            └──────────────────┘
              │                  │                   │
              └──────────────────┼───────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────┐
                    │     lib/mapping.ts          │
                    │                            │
                    │  mapAnswersToQuestions(     │
                    │    questions,              │
                    │    answerRegions           │
                    │  )                         │
                    │                            │
                    │  Logic:                    │
                    │  1. Match by Q number      │
                    │  2. Match by content       │
                    │  3. Flag unmatched         │
                    │  4. Flag unanswered        │
                    │                            │
                    │  Returns: MappedResult[]   │
                    └────────────────────────────┘
```

---

## 7. Bounding Box & Highlighting Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│              BOUNDING BOX COORDINATE SYSTEM                          │
└─────────────────────────────────────────────────────────────────────┘

  Gemini Output (normalized 0-1000):
  
  (0,0) ─────────────────────────── (1000, 0)
  │                                         │
  │    ┌─────────────────────┐              │
  │    │ (ymin=120, xmin=50) │              │
  │    │                     │              │
  │    │   Answer Region     │              │
  │    │                     │              │
  │    │ (ymax=450, xmax=950)│              │
  │    └─────────────────────┘              │
  │                                         │
  (0, 1000) ────────────────────── (1000, 1000)


  Conversion to Pixel Coordinates:
  ┌─────────────────────────────────────────┐
  │                                         │
  │  pixelLeft   = (xmin / 1000) × pageW    │
  │  pixelTop    = (ymin / 1000) × pageH    │
  │  pixelWidth  = ((xmax-xmin)/1000) × pageW│
  │  pixelHeight = ((ymax-ymin)/1000) × pageH│
  │                                         │
  └─────────────────────────────────────────┘


  Rendering (Overlay Layer):
  ┌─────────────────────────────────────────┐
  │  <div style="position: relative">       │
  │    <canvas />  ← PDF page render        │
  │    <div style="position: absolute;      │
  │                inset: 0;                 │
  │                pointer-events: none">    │
  │      ┌───────────────────┐              │
  │      │  <div style="     │              │
  │      │    position: abs  │              │
  │      │    left: pixelL   │              │
  │      │    top: pixelT    │              │
  │      │    width: pixelW  │              │
  │      │    height: pixelH │              │
  │      │    background:    │              │
  │      │      rgba(yellow) │              │
  │      │    border: 2px    │              │
  │      │  " />             │              │
  │      └───────────────────┘              │
  │    </div>                               │
  │  </div>                                 │
  └─────────────────────────────────────────┘
```

---

## 8. Folder Structure

```
vedaai/
│
├── 📁 app/                                 # Next.js App Router
│   ├── layout.tsx                          # Root layout (fonts, metadata, providers)
│   ├── page.tsx                            # Main page (state machine controller)
│   ├── globals.css                         # Global styles + Tailwind directives
│   │
│   └── 📁 api/                             # Backend API routes
│       ├── 📁 upload/
│       │   └── route.ts                    # POST: Accept file uploads, create session
│       ├── 📁 process/
│       │   └── route.ts                    # POST: Trigger AI pipeline (SSE stream)
│       ├── 📁 results/
│       │   └── route.ts                    # GET: Fetch processed results
│       ├── 📁 page-image/
│       │   └── route.ts                    # GET: Serve rendered page images
│       └── 📁 grade/
│           └── route.ts                    # POST: Grade individual question
│
├── 📁 components/                          # React UI Components
│   ├── 📁 ui/                              # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── progress.tsx
│   │   ├── scroll-area.tsx
│   │   ├── separator.tsx
│   │   ├── tooltip.tsx
│   │   └── ...
│   │
│   ├── 📁 upload/                          # Upload section components
│   │   ├── UploadSection.tsx               # Main upload container
│   │   ├── FileDropZone.tsx                # Drag-drop file input
│   │   ├── FilePreview.tsx                 # Show uploaded file info
│   │   └── ProcessButton.tsx              # "Analyze" CTA button
│   │
│   ├── 📁 processing/                     # Processing state components
│   │   ├── ProcessingSection.tsx           # Processing container
│   │   ├── StepIndicator.tsx              # Multi-step progress
│   │   └── ProcessingAnimation.tsx        # Lottie/CSS animation
│   │
│   ├── 📁 results/                        # Results display components
│   │   ├── ResultsSection.tsx             # Results container (split layout)
│   │   ├── SummaryBar.tsx                 # Stats bar (answered/unanswered/score)
│   │   ├── QuestionPanel.tsx              # Left panel with question list
│   │   ├── QuestionItem.tsx               # Individual question card
│   │   ├── AnswerViewer.tsx               # Right panel PDF viewer
│   │   ├── HighlightOverlay.tsx           # Bounding box overlay layer
│   │   ├── BoundingBox.tsx                # Single highlight rectangle
│   │   ├── PageNavigation.tsx             # Prev/Next page controls
│   │   ├── ZoomControls.tsx               # Zoom in/out
│   │   └── DetailPanel.tsx                # Bottom panel (answer + grade)
│   │
│   └── 📁 shared/                         # Shared/utility components
│       ├── Header.tsx                      # App header/navbar
│       ├── ErrorBoundary.tsx              # Error catch wrapper
│       ├── LoadingSkeleton.tsx            # Skeleton loaders
│       └── EmptyState.tsx                 # Empty/placeholder states
│
├── 📁 lib/                                # Core logic & utilities
│   ├── gemini.ts                          # Gemini API client (singleton, retry)
│   ├── extraction.ts                      # Question extraction from paper
│   ├── detection.ts                       # Answer region detection + bounding boxes
│   ├── mapping.ts                         # Question ↔ Answer mapping algorithm
│   ├── grading.ts                         # AI grading & feedback generation
│   ├── pdf-utils.ts                       # PDF → image conversion (sharp + pdf-lib)
│   ├── store.ts                           # In-memory session store (Map)
│   ├── types.ts                           # All TypeScript interfaces/types
│   ├── constants.ts                       # App constants, prompts, config
│   ├── prompts.ts                         # All Gemini prompt templates
│   └── utils.ts                           # General utility functions
│
├── 📁 hooks/                              # Custom React hooks
│   ├── useProcessing.ts                   # SSE connection + progress tracking
│   ├── useHighlight.ts                    # Active highlight state management
│   ├── useFileUpload.ts                   # File upload + validation logic
│   └── usePdfViewer.ts                    # PDF page rendering control
│
├── 📁 types/                              # Additional type definitions
│   └── index.ts                           # Re-export all types
│
├── 📁 public/                             # Static assets
│   ├── logo.svg
│   ├── placeholder-upload.svg
│   └── ...
│
├── 📁 memory-bank/                        # Project documentation (memory bank)
│   ├── projectbrief.md
│   ├── productContext.md
│   ├── techContext.md
│   ├── activeContext.md
│   ├── systemPatterns.md
│   └── progress.md
│
├── .env.local                             # Environment variables (GEMINI_API_KEY)
├── .env.example                           # Example env file for others
├── .gitignore
├── next.config.js                         # Next.js configuration
├── vercel.json                            # Vercel deployment config (Fluid Compute)
├── tailwind.config.ts                     # Tailwind CSS configuration
├── tsconfig.json                          # TypeScript configuration
├── postcss.config.js                      # PostCSS config
├── package.json                           # Dependencies & scripts
├── README.md                              # Project documentation
├── DEVELOPMENT_PLAN.md                    # Full development plan
└── ARCHITECTURE.md                        # This file
```

---

## 9. Data Models & Type System

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TYPE HIERARCHY                                │
└─────────────────────────────────────────────────────────────────────┘

  Session
  ├── sessionId: string
  ├── status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error'
  ├── questionPaper: UploadedFile
  ├── answerSheet: UploadedFile
  ├── results: ProcessingResults
  └── createdAt: Date

  UploadedFile
  ├── name: string
  ├── type: 'pdf' | 'image'
  ├── buffer: Buffer
  ├── pageCount: number
  └── pageImages: Buffer[]              ← rendered as PNG per page

  ExtractedQuestion
  ├── id: string                        ← auto-generated UUID
  ├── number: string                    ← "1", "2(a)", "11(b)"
  ├── text: string                      ← full question text
  ├── marks: number | null              ← marks if visible
  └── parentNumber: string | null       ← "11" if this is "11(a)"

  AnswerRegion
  ├── id: string
  ├── questionNumber: string            ← what student wrote
  ├── pageIndex: number                 ← 0-based page number
  ├── boundingBox: BoundingBox          ← [ymin, xmin, ymax, xmax]
  ├── transcribedText: string           ← OCR'd handwritten text
  ├── continues: boolean                ← spans to next page?
  └── confidence: number                ← 0.0 to 1.0

  BoundingBox = [number, number, number, number]   ← normalized 0-1000

  MappedResult
  ├── question: ExtractedQuestion
  ├── answerRegions: AnswerRegion[]     ← can be multi-page (array)
  ├── status: 'answered' | 'unanswered' | 'partial'
  └── grade: GradeResult | null

  GradeResult
  ├── score: number
  ├── maxScore: number
  ├── percentage: number
  ├── isCorrect: boolean
  ├── feedback: string                  ← AI-generated explanation
  └── suggestions: string[]             ← improvement tips

  ProcessingResults
  ├── questions: ExtractedQuestion[]
  ├── answerRegions: AnswerRegion[]
  ├── mappings: MappedResult[]
  ├── orphanAnswers: AnswerRegion[]     ← answers with no matching Q
  └── summary: Summary

  Summary
  ├── totalQuestions: number
  ├── answeredCount: number
  ├── unansweredCount: number
  ├── partialCount: number
  ├── totalScore: number
  ├── maxPossibleScore: number
  └── percentage: number
```

---

## 10. Processing Pipeline (Sequence Diagram)

```
  Client                    Server                     Gemini API
    │                         │                           │
    │── POST /api/upload ────▶│                           │
    │   (files)               │── store in memory         │
    │◀── { sessionId } ──────│                           │
    │                         │                           │
    │── POST /api/process ───▶│                           │
    │   { sessionId }         │                           │
    │                         │── convert PDF → images    │
    │◀── SSE: converting 20% │                           │
    │                         │                           │
    │                         │── send Q paper images ───▶│
    │◀── SSE: extracting 40% │   (base64 encoded)        │
    │                         │◀── questions JSON ───────│
    │                         │                           │
    │                         │── send answer images ────▶│
    │◀── SSE: detecting 60%  │   (page by page)          │
    │                         │◀── regions + boxes ──────│
    │                         │                           │
    │                         │── run mapping algorithm   │
    │◀── SSE: mapping 80%    │                           │
    │                         │                           │
    │                         │── send Q+A for grading ──▶│
    │◀── SSE: grading 90%    │                           │
    │                         │◀── grades + feedback ────│
    │                         │                           │
    │◀── SSE: complete 100%  │── store results           │
    │   { results }           │                           │
    │                         │                           │
    │── GET /api/results ────▶│                           │
    │◀── full results JSON ──│                           │
    │                         │                           │
```

---

## 11. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VERCEL DEPLOYMENT                              │
└─────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │  Vercel Edge Network (CDN)                                    │
  │  ┌─────────────────────────────────────────────────────────┐  │
  │  │  Static Assets (/_next/static/*)                        │  │
  │  │  - JS bundles, CSS, images                              │  │
  │  │  - Cached globally at edge                              │  │
  │  └─────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────┘
                              │
                              ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  Vercel Serverless Functions (Fluid Compute)                  │
  │                                                              │
  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
  │  │ /api/upload │  │ /api/results│  │ /api/process        │  │
  │  │ timeout: 30s│  │ timeout: 10s│  │ timeout: 300s       │  │
  │  │             │  │             │  │ (Fluid Compute)     │  │
  │  └─────────────┘  └─────────────┘  └──────────┬──────────┘  │
  │                                                │              │
  └────────────────────────────────────────────────│──────────────┘
                                                   │
                                                   ▼
                                    ┌──────────────────────────┐
                                    │  OpenAI API               │
                                    │  (External Service)       │
                                    │                          │
                                    │  gpt-4o or gpt-4-vision   │
                                    │  Tier 1: 500 RPM          │
                                    └──────────────────────────┘

  Configuration (vercel.json):
  {
    "functions": {
      "app/api/process/route.ts": { "maxDuration": 300 }
    }
  }
```

---

## 12. Error Handling Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ERROR HANDLING LAYERS                             │
└─────────────────────────────────────────────────────────────────────┘

  Layer 1: CLIENT
  ├── React Error Boundary (crash recovery)
  ├── File validation (type, size < 20MB)
  ├── Network error handling (fetch retry)
  └── SSE reconnection on disconnect

  Layer 2: API ROUTES
  ├── Input validation (zod schemas)
  ├── Session not found → 404
  ├── File too large → 413
  ├── Invalid file type → 400
  └── Processing failure → 500 + error details

  Layer 3: OPENAI INTEGRATION
  ├── Rate limit (429) → exponential backoff (1s, 2s, 4s, 8s)
  ├── Timeout → retry up to 3 times
  ├── Invalid response → re-prompt with stricter schema
  ├── Empty/null bounding box → mark as low confidence
  └── API key invalid → surface to user immediately

  Layer 4: PROCESSING ENGINE
  ├── PDF conversion failure → fallback to raw upload as image
  ├── No questions found → "Could not extract questions" message
  ├── No answers found → mark all as unanswered
  ├── Mapping conflicts → use confidence scores to resolve
  └── Partial failure → return what succeeded, flag failures
```

---

## 13. Security Considerations

```
  ┌─────────────────────────────────────────────────────────┐
  │  SECURITY MEASURES                                       │
  ├─────────────────────────────────────────────────────────┤
  │                                                         │
  │  • API key stored in env vars (never client-exposed)    │
  │  • File type validation (only PDF, PNG, JPG, JPEG)      │
  │  • File size limit (20MB max)                           │
  │  • Session isolation (UUID-based, no user auth needed)  │
  │  • In-memory store auto-cleans after 30 minutes         │
  │  • No persistent storage of student data                │
  │  • CORS configured for deployment domain only           │
  │  • Rate limiting on upload endpoint                     │
  │                                                         │
  └─────────────────────────────────────────────────────────┘
```

---

## 14. Performance Optimizations

| Optimization | Where | Impact |
|-------------|-------|--------|
| Sequential page processing | OpenAI calls | Avoids rate limits |
| Image compression (300 DPI) | PDF conversion | Reduces API payload |
| SSE streaming | Progress updates | No polling overhead |
| Lazy PDF page rendering | Answer viewer | Only render visible page |
| Memoized highlight calculations | Overlay layer | No re-calc on scroll |
| Session TTL (30 min) | Memory store | Prevents memory leaks |
| Debounced zoom/resize | Viewer controls | Smooth interactions |
| Parallel Q extraction + A detection | After conversion | Saves ~30% time |

---

## 15. Summary

This architecture is designed to be:

- **Simple** — Single Next.js project, no external DB, no queues
- **Fast** — SSE streaming, progressive results, lazy rendering
- **Accurate** — Gemini Vision for both OCR + spatial detection in one pass
- **Deployable** — Zero-config Vercel deployment with Fluid Compute
- **Maintainable** — Clear separation: components / lib / api / hooks / types
