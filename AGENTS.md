# AGENTS.md - VedaAI Assessment Extraction

AI agent context file for this project.

---

## Project Overview

**Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, OpenAI API, react-pdf
**Purpose:** AI-powered assessment extraction and answer mapping system for teachers
**Architecture:** Deterministic orchestration + GPT-4o Vision for extraction, detection, and grading

---

## Key Commands

```bash
# Install
npm install

# Development
npm run dev                    # Start dev server (port 3000)
npm run dev -- -p 3001         # Custom port

# Type checking
npm run typecheck              # Check TypeScript
npm run typecheck:watch        # Watch mode

# Linting
npm run lint                   # Run ESLint
npm run lint:fix               # Auto-fix issues

# Building
npm run build                  # Production build
npm start                      # Run production server

# Testing
npm test                       # Run all tests
npm run test:watch             # Watch mode
npm run test:guardrails        # Test guardrails only
```

---

## Project Structure

```
vedaai/
├── app/                     # Next.js App Router
│   ├── api/                # Backend API routes
│   │   ├── upload/        # POST: File upload
│   │   ├── process/       # POST: Trigger AI pipeline (SSE)
│   │   ├── results/       # GET: Fetch results
│   │   ├── page-image/    # GET: Serve page images
│   │   └── grade/         # POST: Grade single question
│   ├── page.tsx           # Main UI (state machine)
│   └── layout.tsx         # Root layout
│
├── components/             # React components
│   ├── ui/                # shadcn/ui primitives
│   ├── upload/            # Upload screen components
│   ├── processing/        # Processing state components
│   ├── results/           # Results display components
│   └── shared/            # Shared utilities
│
├── lib/                   # Core logic
│   ├── openai-client.ts   # OpenAI API client (singleton)
│   ├── extraction.ts      # Question extraction from paper
│   ├── detection.ts       # Answer region detection + bounding boxes
│   ├── mapping.ts         # Question ↔ Answer mapping algorithm
│   ├── grading.ts         # AI grading & feedback
│   ├── pdf-utils.ts       # PDF → image conversion
│   ├── store.ts           # In-memory session store
│   ├── types.ts           # TypeScript interfaces
│   ├── constants.ts       # App constants
│   ├── prompts.ts         # All AI prompt templates
│   └── utils.ts           # General utilities
│
├── hooks/                 # Custom React hooks
│   ├── useProcessing.ts   # SSE connection + progress tracking
│   ├── useHighlight.ts    # Active highlight state management
│   ├── useFileUpload.ts   # File upload + validation logic
│   └── usePdfViewer.ts    # PDF page rendering control
│
├── skills/                # AI agent skills (SKILL.md format)
│   ├── question-extraction/
│   ├── answer-detection/
│   ├── answer-mapping/
│   └── grading/
│
├── orchestrator/          # Workflow coordination
│   └── ORCHESTRATOR.md    # Deterministic pipeline docs
│
├── guardrails/            # Safety policies
│   ├── GUARDRAILS.md      # Policy documentation
│   └── *.yaml             # Rule definitions
│
└── memory-bank/           # Project documentation
    ├── projectbrief.md
    ├── techContext.md
    ├── activeContext.md
    └── progress.md
```

---

## Code Style

### TypeScript Patterns

```typescript
// Named exports only
export function extractQuestions() { }
export const PROMPT_TEMPLATE = "...";

// NO default exports
// ❌ export default function() { }

// Interface naming
export interface ExtractedQuestion {
  id: string;
  number: string;
  text: string;
}

// Type for function params
export async function processFile(
  file: UploadedFile,
  options: ProcessOptions
): Promise<ProcessingResults> {
  // ...
}
```

### React Components

```tsx
// Functional components with TypeScript
export function QuestionItem({ question, onClick }: QuestionItemProps) {
  return (
    <div className="question-item">
      {/* ... */}
    </div>
  );
}

// Props interface above component
interface QuestionItemProps {
  question: ExtractedQuestion;
  onClick: () => void;
}
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `QuestionList.tsx`)
- Utilities: `kebab-case.ts` (e.g., `pdf-utils.ts`)
- Types: `types.ts` or `index.ts`
- API routes: `route.ts` (Next.js convention)

---

## Non-Obvious Patterns

### 1. Bounding Box Coordinates

GPT-4o Vision returns coordinates via structured outputs. We use `[ymin, xmin, ymax, xmax]` format normalized to 0-1000 for consistency.

```typescript
// Define in prompt: return as [ymin, xmin, ymax, xmax] normalized 0-1000
const [ymin, xmin, ymax, xmax] = boundingBox;

// Convert to pixel coordinates
const pixelBox = {
  left: (xmin / 1000) * pageWidth,
  top: (ymin / 1000) * pageHeight,
  width: ((xmax - xmin) / 1000) * pageWidth,
  height: ((ymax - ymin) / 1000) * pageHeight
};
```

### 2. Session Store is In-Memory

No database. All data stored in `Map<sessionId, Session>`.

```typescript
// Auto-cleanup after 30 minutes
sessionStore.set(sessionId, {
  ...data,
  expiresAt: Date.now() + 30 * 60 * 1000
});
```

### 3. Sequential AI Calls (Not Parallel)

To avoid rate limits, process answer sheets one page at a time:

```typescript
// ✅ Correct: Sequential
for (const page of pages) {
  const regions = await openai.detectAnswers(page);
  await sleep(200); // Rate limit protection (500 RPM = ~120ms)
}

// ❌ Wrong: Parallel (hits rate limit)
const allRegions = await Promise.all(
  pages.map(page => openai.detectAnswers(page))
);
```

### 4. SSE Progress Streaming

API route must return `ReadableStream` with `text/event-stream`:

```typescript
export async function POST(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };
      
      // Emit progress events
      send({ step: 'extracting', progress: 40 });
    }
  });
  
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

### 5. PDF Overlay Highlighting

Render PDF page, then overlay absolute-positioned divs:

```tsx
<div className="relative">
  {/* PDF canvas */}
  <Page pageNumber={pageNum} />
  
  {/* Overlay layer */}
  <div className="absolute inset-0 pointer-events-none">
    {highlights.map(box => (
      <div
        key={box.id}
        className="absolute bg-yellow-400/50 border-2 border-yellow-600"
        style={{
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height
        }}
      />
    ))}
  </div>
</div>
```

---

## Testing Rules

- Write tests for all new core logic in `lib/`
- API routes should have integration tests
- Components should have unit tests for complex logic
- Mock Gemini API calls in tests (use `vi.mock`)
- Run `npm test` before marking any task complete

Example:

```typescript
// lib/__tests__/extraction.test.ts
import { vi } from 'vitest';
import { extractQuestions } from '../extraction';

vi.mock('../gemini', () => ({
  geminiClient: {
    generateContent: vi.fn().mockResolvedValue({
      response: { text: () => JSON.stringify([{ number: '1', text: 'Q1' }]) }
    })
  }
}));

describe('extractQuestions', () => {
  it('returns extracted questions', async () => {
    const result = await extractQuestions([mockImage]);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe('1');
  });
});
```

---

## Boundaries

### ✅ Allowed without asking

- Read any file in the project
- List directory contents
- Run lint, typecheck, individual tests
- Add console.log for debugging
- Update component styling
- Refactor code (preserve behavior)
- Add JSDoc comments
- Update types/interfaces

### ⚠️ Ask first

- Install or remove npm packages
- Delete files or directories
- Change API routes signatures
- Modify AI prompts (in `lib/prompts.ts`)
- Change orchestrator workflow order
- Update guardrail rules
- Modify environment variables
- Change folder structure

### 🚫 Never

- Commit `.env` file or secrets
- Push directly to main branch
- Modify `node_modules/`, `.next/`, or `dist/`
- Force push
- Change Next.js version without testing
- Remove error handling
- Disable guardrails
- Skip type checking

---

## Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main UI state machine (upload → processing → results) |
| `app/api/process/route.ts` | Main processing API (SSE streaming) |
| `lib/openai-client.ts` | OpenAI API client (singleton with retry logic) |
| `lib/prompts.ts` | All AI prompt templates (SINGLE SOURCE OF TRUTH) |
| `lib/types.ts` | All TypeScript interfaces |
| `orchestrator/ORCHESTRATOR.md` | Pipeline flow documentation |
| `guardrails/GUARDRAILS.md` | Safety rules documentation |
| `ARCHITECTURE.md` | System architecture overview |
| `DEVELOPMENT_PLAN.md` | Full implementation plan |

---

## Environment Variables

```bash
# .env.local
OPENAI_API_KEY=your_api_key_here       # Required (sk-...)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
MAX_FILE_SIZE_MB=20
SESSION_TTL_MINUTES=30
```

**Never commit `.env.local` or expose `OPENAI_API_KEY` to client!**

---

## Common Tasks

### Add a new AI prompt

1. Open `lib/prompts.ts`
2. Add your prompt as a const string
3. Export it
4. Use in the relevant function (extraction, detection, etc.)

### Add a new API endpoint

1. Create `app/api/[name]/route.ts`
2. Export `GET` or `POST` function
3. Follow existing patterns (use `sessionStore`, error handling)
4. Update types in `lib/types.ts` if needed

### Add a new component

1. Create file in appropriate folder (`components/upload/`, etc.)
2. Use TypeScript + named export
3. Define props interface
4. Use Tailwind classes for styling
5. Import and use in parent component

### Update the orchestrator

1. Read `orchestrator/ORCHESTRATOR.md` first
2. Modify `orchestrator/execute.ts` (when implemented)
3. Update stage definitions
4. Test with real PDFs
5. Update documentation

---

## Debug Tips

### OpenAI API not responding

- Check `.env` has valid `OPENAI_API_KEY` (format: `sk-...`)
- Restart dev server after changing `.env`
- Check rate limits (3 RPM free tier, 500 RPM tier 1)
- Look for 429 errors in console

### Bounding boxes misaligned

- Verify PDF page and image have same dimensions
- Check coordinate conversion (ymin/xmin vs xmin/ymin)
- Ensure page scale factor is applied
- Log actual vs expected coordinates

### SSE not streaming

- Check `Content-Type: text/event-stream` header
- Ensure `data: ` prefix on each message
- Check browser DevTools Network tab
- Look for CORS issues

### Build errors

- Run `npm run typecheck` first
- Check for missing types
- Clear `.next/` folder: `rm -rf .next && npm run dev`
- Verify all imports are correct

---

## Additional Resources

- **Architecture:** See `ARCHITECTURE.md`
- **Setup:** See `SETUP.md`
- **Skills:** See `skills/*/SKILL.md` files
- **Memory Bank:** See `memory-bank/` folder
- **Gemini Docs:** https://ai.google.dev/gemini-api/docs

---

## Agent Skills

This project uses the SKILL.md format for modular AI capabilities. Skills are in `skills/` directory:

- `question-extraction/SKILL.md` - Extract questions from papers
- `answer-detection/SKILL.md` - Detect answer regions with bounding boxes
- `answer-mapping/SKILL.md` - Map answers to questions
- `grading/SKILL.md` - Grade answers and provide feedback

Each skill is progressively loaded:
1. Metadata loaded at startup (~50 tokens)
2. Full instructions loaded when activated
3. References/scripts loaded on demand

---

Version: 1.0
Last Updated: 2026-08-28
