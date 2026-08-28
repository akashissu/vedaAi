# Progress

## Completed ✅

### Planning & Architecture
- [x] Deep research on AI approaches (OpenAI GPT-4o/4.1, bounding boxes, OCR)
- [x] Development plan (`DEVELOPMENT_PLAN.md`)
- [x] Architecture document (`ARCHITECTURE.md`)
- [x] Folder structure (`FOLDER_STRUCTURE.md`)
- [x] Setup guide (`SETUP.md`)
- [x] Skills defined (question-extraction, answer-detection, answer-mapping, grading)
- [x] Guardrails documented
- [x] Orchestrator pipeline documented

### Backend
- [x] OpenAI client singleton with retry + rate limiting (`lib/openai-client.ts`)
- [x] Question extraction from paper images (`lib/extraction.ts`)
- [x] **Answer detection — 3-step hybrid pipeline** (`lib/detection.ts`)
  - Step 1: Anchor detection (answer-start Y positions)
  - Step 2: Region construction (pure math)
  - Step 3: Per-answer OCR on cropped regions
- [x] Q ↔ Answer mapping algorithm (`lib/mapping.ts`)
- [x] AI grading + feedback (`lib/grading.ts`)
- [x] PDF → image conversion (pdfjs-dist + @napi-rs/canvas) (`lib/pdf-utils.ts`)
- [x] In-memory session store with TTL + HMR-safe singleton (`lib/store.ts`)
- [x] All TypeScript types (`lib/types.ts`)
- [x] All AI prompt templates (`lib/prompts.ts`)
- [x] Constants and utilities

### API Routes
- [x] `/api/upload` — file upload + PDF/image validation
- [x] `/api/process` — main pipeline with SSE streaming
- [x] `/api/results` — return processed results (multi-page support)
- [x] `/api/grade` — grade single question with AI
- [x] `/api/page-image` — serve rendered page images

### Frontend
- [x] Main page state machine (upload → processing → results) (`app/page.tsx`)
- [x] Sidebar navigation (`components/layout/Sidebar.tsx`)
- [x] Top bar (`components/layout/TopBar.tsx`)
- [x] Upload screen with drag-and-drop (`components/upload/UploadScreen.tsx`)
- [x] Processing screen with animated progress (`components/processing/ProcessingScreen.tsx`)
- [x] Results screen with split-view PDF viewer (`components/results/ResultsScreen.tsx`)
  - Bounding box overlays with Q-labels
  - Green/red color coding based on grade
  - "Get AI Feedback" per question
  - "Grade All Questions" button
  - Multi-page PDF navigation

### Configuration
- [x] Next.js config with `serverComponentsExternalPackages` for native modules
- [x] TypeScript config
- [x] Tailwind + PostCSS
- [x] Environment variables (`OPENAI_DETECTION_MODEL=gpt-4.1`)

### Documentation
- [x] README with screenshots, pipeline docs, API reference
- [x] Screenshots: upload screen + results screen (`docs/screenshots/`)
- [x] Memory bank up to date

## In Progress 🔄

- [ ] Detection precision fine-tuning (currently ~90%, targeting ~98%)
- [ ] Testing with handwritten answer sheets

## Not Started ⏳

- [ ] Export results as PDF/CSV
- [ ] Re-process button (without re-upload)
- [ ] Confidence scores on bounding boxes
- [ ] Bulk session management / history
- [ ] User authentication
- [ ] Database persistence (optional upgrade from in-memory)
- [ ] Automated test suite for detection pipeline

## Known Issues / Limitations

| Issue | Status | Notes |
|---|---|---|
| Detection ~90% accurate on typed sheets | Active tuning | Updated anchor prompt to find answer-start Y |
| Handwritten sheets untested | Pending | 3-step pipeline should handle it better than before |
| Sessions lost on server restart | By design | In-memory only |
| Large PDFs may timeout on Vercel Hobby | Known | Use Fluid Compute or chunked processing |
