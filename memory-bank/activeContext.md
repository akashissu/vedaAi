# Active Context

## Current State

The application is **fully functional and running** at `http://localhost:3000`.

- Full-stack Next.js 14 app implemented (frontend + backend)
- Upload → Processing (SSE) → Results flow working end-to-end
- PDF upload and multi-page rendering working
- **3-step hybrid answer detection pipeline** implemented and tuned
- AI grading (individual + Grade All) with green/red visual feedback
- UI matches Figma design (sidebar, topbar, upload/processing/results screens)

## Architecture Summary

**Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui  
**AI:** OpenAI GPT-4.1 (anchor detection, Step 1) + GPT-4o (extraction, OCR, grading)  
**PDF:** pdfjs-dist + @napi-rs/canvas (server-side rendering via dynamic imports)  
**Image processing:** sharp  
**Session store:** In-memory Map with 30-min TTL (HMR-safe singleton)  
**Streaming:** SSE via ReadableStream

## Answer Detection Pipeline (3-Step Hybrid)

`lib/detection.ts` now uses a 3-step approach per page:

1. **Step 1 — Anchor Detection (1 AI call):** GPT-4.1 finds the Y-position of where each answer starts (not the question label — the actual "Ans." line). Returns `{ Q1: y=195, Q2: y=285... }`.
2. **Step 2 — Region Construction (pure math):** Builds full-height answer strips between consecutive anchors. No AI error possible.
3. **Step 3 — Answer OCR (1 AI call per answer):** Crops each strip from the page image and sends to GPT-4o for accurate per-answer transcription.

**Result:** One semantically correct full-height bounding box per answer, guaranteed.

## Key Files Changed (Latest Session)

| File | Change |
|---|---|
| `lib/detection.ts` | Complete rewrite — 3-step pipeline |
| `lib/prompts.ts` | Added `ANCHOR_DETECTION_PROMPT`, `SYSTEM_PROMPT_ANCHOR`, `ANSWER_OCR_PROMPT` |
| `lib/detection.ts` | Anchor prompt updated to ask for answer-start Y (not question-label Y) |
| `README.md` | Full rewrite with screenshots, pipeline docs, API reference |
| `docs/screenshots/` | Added `upload-screen.png` and `results-screen.png` |

## Next Steps

1. Test with more varied answer sheet formats (handwritten, different layouts)
2. Add confidence scores to bounding boxes
3. Consider adding a "Re-process" button without full re-upload
4. Improve handling when student skips a question number
5. Optional: export results as PDF/CSV

## Active Decisions

- Detection model: `gpt-4.1` for Step 1 (spatial accuracy)
- OCR model: `gpt-4o` for Step 3 (language quality)
- No database — in-memory sessions only
- Sequential AI calls (rate limit safety)
- Bounding box format: `[ymin, xmin, ymax, xmax]` normalized 0–1000
