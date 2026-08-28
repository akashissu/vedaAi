# VedaAI - Complete Folder Structure

Generated: 2026-08-28

---

## Visual Tree

```
VedaAi/
│
├── 📄 README.md                          # Project overview
├── 📄 SETUP.md                           # Developer setup guide
├── 📄 ARCHITECTURE.md                    # System architecture documentation
├── 📄 DEVELOPMENT_PLAN.md                # Full implementation plan
├── 📄 UI_DESIGN_SYSTEM.md                # Complete design system & component library
├── 📄 FIGMA_DESIGN_ANALYSIS.md           # Figma design breakdown & insights
├── 📄 FOLDER_STRUCTURE.md                # This file
├── 📄 AGENTS.md                          # AI agent context file
├── 📄 package.json                       # Dependencies & scripts
├── 📄 tsconfig.json                      # TypeScript configuration
├── 📄 next.config.js                     # Next.js configuration
├── 📄 vercel.json                        # Vercel deployment config
├── 📄 tailwind.config.ts                 # Tailwind CSS config
├── 📄 postcss.config.js                  # PostCSS config
├── 📄 .env.local                         # Environment variables (DO NOT COMMIT)
├── 📄 .env.example                       # Example env file
├── 📄 .gitignore                         # Git ignore rules
│
├── 📁 app/                               # Next.js App Router
│   ├── 📄 layout.tsx                     # Root layout (fonts, metadata, providers)
│   ├── 📄 page.tsx                       # Main page (upload → processing → results)
│   ├── 📄 globals.css                    # Global styles + Tailwind directives
│   │
│   └── 📁 api/                           # Backend API routes
│       ├── 📁 upload/
│       │   └── 📄 route.ts               # POST: File upload endpoint
│       ├── 📁 process/
│       │   └── 📄 route.ts               # POST: Trigger AI pipeline (SSE stream)
│       ├── 📁 results/
│       │   └── 📄 route.ts               # GET: Fetch processed results
│       ├── 📁 page-image/
│       │   └── 📄 route.ts               # GET: Serve rendered page images
│       └── 📁 grade/
│           └── 📄 route.ts               # POST: Grade individual question
│
├── 📁 components/                        # React UI Components
│   ├── 📁 ui/                            # shadcn/ui base components
│   │   ├── 📄 button.tsx
│   │   ├── 📄 card.tsx
│   │   ├── 📄 badge.tsx
│   │   ├── 📄 progress.tsx
│   │   ├── 📄 scroll-area.tsx
│   │   ├── 📄 separator.tsx
│   │   ├── 📄 tooltip.tsx
│   │   └── ... (other shadcn components)
│   │
│   ├── 📁 upload/                        # Upload section components
│   │   ├── 📄 UploadSection.tsx          # Main upload container
│   │   ├── 📄 FileDropZone.tsx           # Drag-drop file input
│   │   ├── 📄 FilePreview.tsx            # Show uploaded file info
│   │   └── 📄 ProcessButton.tsx          # "Analyze" CTA button
│   │
│   ├── 📁 processing/                    # Processing state components
│   │   ├── 📄 ProcessingSection.tsx      # Processing container
│   │   ├── 📄 StepIndicator.tsx          # Multi-step progress UI
│   │   └── 📄 ProcessingAnimation.tsx    # Loading animation
│   │
│   ├── 📁 results/                       # Results display components
│   │   ├── 📄 ResultsSection.tsx         # Results container (split layout)
│   │   ├── 📄 SummaryBar.tsx             # Stats bar (answered/unanswered/score)
│   │   ├── 📄 QuestionPanel.tsx          # Left panel with question list
│   │   ├── 📄 QuestionItem.tsx           # Individual question card
│   │   ├── 📄 AnswerViewer.tsx           # Right panel PDF viewer
│   │   ├── 📄 HighlightOverlay.tsx       # Bounding box overlay layer
│   │   ├── 📄 BoundingBox.tsx            # Single highlight rectangle
│   │   ├── 📄 PageNavigation.tsx         # Prev/Next page controls
│   │   ├── 📄 ZoomControls.tsx           # Zoom in/out
│   │   └── 📄 DetailPanel.tsx            # Bottom panel (answer + grade)
│   │
│   └── 📁 shared/                        # Shared/utility components
│       ├── 📄 Header.tsx                 # App header/navbar
│       ├── 📄 ErrorBoundary.tsx          # Error catch wrapper
│       ├── 📄 LoadingSkeleton.tsx        # Skeleton loaders
│       └── 📄 EmptyState.tsx             # Empty/placeholder states
│
├── 📁 lib/                               # Core logic & utilities
│   ├── 📄 gemini.ts                      # Gemini API client (singleton, retry logic)
│   ├── 📄 extraction.ts                  # Question extraction from paper
│   ├── 📄 detection.ts                   # Answer region detection + bounding boxes
│   ├── 📄 mapping.ts                     # Question ↔ Answer mapping algorithm
│   ├── 📄 grading.ts                     # AI grading & feedback generation
│   ├── 📄 pdf-utils.ts                   # PDF → image conversion (sharp + pdf-lib)
│   ├── 📄 store.ts                       # In-memory session store (Map)
│   ├── 📄 types.ts                       # All TypeScript interfaces/types
│   ├── 📄 constants.ts                   # App constants, config values
│   ├── 📄 prompts.ts                     # All Gemini prompt templates
│   └── 📄 utils.ts                       # General utility functions
│
├── 📁 hooks/                             # Custom React hooks
│   ├── 📄 useProcessing.ts               # SSE connection + progress tracking
│   ├── 📄 useHighlight.ts                # Active highlight state management
│   ├── 📄 useFileUpload.ts               # File upload + validation logic
│   └── 📄 usePdfViewer.ts                # PDF page rendering control
│
├── 📁 types/                             # Additional type definitions
│   └── 📄 index.ts                       # Re-export all types
│
├── 📁 public/                            # Static assets
│   ├── 📄 logo.svg
│   ├── 📄 placeholder-upload.svg
│   └── ... (other static files)
│
├── 📁 skills/                            # AI Agent Skills (SKILL.md format)
│   ├── 📁 question-extraction/
│   │   ├── 📄 SKILL.md                   # Skill definition & instructions
│   │   ├── 📁 scripts/
│   │   │   └── 📄 test-extraction.ts     # Test script
│   │   └── 📁 references/
│   │       └── 📄 prompt-templates.md    # Prompt variations
│   │
│   ├── 📁 answer-detection/
│   │   ├── 📄 SKILL.md                   # Skill definition & instructions
│   │   ├── 📁 scripts/
│   │   │   └── 📄 test-detection.ts      # Test script
│   │   └── 📁 references/
│   │       ├── 📄 bounding-box-format.md # Coordinate system docs
│   │       └── 📄 handwriting-ocr.md     # OCR accuracy tips
│   │
│   ├── 📁 answer-mapping/
│   │   ├── 📄 SKILL.md                   # Skill definition & instructions
│   │   └── 📁 scripts/
│   │       └── 📄 test-mapping.ts        # Test script
│   │
│   └── 📁 grading/
│       ├── 📄 SKILL.md                   # Skill definition & instructions
│       ├── 📁 scripts/
│       │   └── 📄 test-grading.ts        # Test script
│       └── 📁 references/
│           └── 📄 feedback-templates.md  # Feedback examples
│
├── 📁 orchestrator/                      # Workflow coordination
│   ├── 📄 ORCHESTRATOR.md                # Orchestrator documentation
│   ├── 📄 config.yaml                    # Pipeline configuration
│   └── 📄 execute.ts                     # Pipeline execution logic
│
├── 📁 guardrails/                        # Safety & compliance
│   ├── 📄 GUARDRAILS.md                  # Guardrails documentation
│   ├── 📄 input-safety.yaml              # File validation rules
│   ├── 📄 prompt-injection.yaml          # Injection prevention
│   ├── 📄 data-privacy.yaml              # FERPA/GDPR compliance
│   ├── 📄 output-validation.yaml         # Response validation
│   ├── 📄 rate-limits.yaml               # Rate limiting rules
│   └── 📄 content-safety.yaml            # Content filtering
│
├── 📁 memory-bank/                       # Project documentation (memory bank)
│   ├── 📄 projectbrief.md                # Core requirements
│   ├── 📄 productContext.md              # Product vision
│   ├── 📄 techContext.md                 # Tech stack decisions
│   ├── 📄 activeContext.md               # Current state & next steps
│   ├── 📄 systemPatterns.md              # Architecture patterns
│   └── 📄 progress.md                    # Progress tracking
│
├── 📁 .cursor/                           # Cursor IDE configuration
│   └── 📁 rules/
│       └── ... (project-specific rules)
│
├── 📁 .next/                             # Next.js build output (gitignored)
├── 📁 node_modules/                      # Dependencies (gitignored)
└── 📁 agent-tools/                       # Temporary tool outputs (gitignored)
```

---

## File Count Summary

| Category | Count | Description |
|----------|-------|-------------|
| **Documentation** | 11 | MD files (README, SETUP, ARCHITECTURE, etc.) |
| **API Routes** | 5 | Next.js API endpoints |
| **Components** | ~25 | React UI components |
| **Core Logic** | 9 | Business logic in `lib/` |
| **Hooks** | 4 | Custom React hooks |
| **Skills** | 4 | AI agent skills with SKILL.md |
| **Guardrails** | 7 | Safety policy YAML files |
| **Config Files** | 7 | tsconfig, next.config, etc. |

**Total:** ~70-80 files (when fully implemented)

---

## Key Directory Purposes

### `/app` - Next.js Application
- **What:** Frontend + backend in one place
- **Entry Points:**
  - `app/page.tsx` — Main UI
  - `app/api/*/route.ts` — API endpoints

### `/components` - React Components
- **Organization:** By feature/section
- **Pattern:** TypeScript + named exports
- **Styling:** Tailwind CSS classes

### `/lib` - Core Business Logic
- **What:** Pure functions, no React
- **Can be:** Tested independently
- **Key Files:** gemini.ts, extraction.ts, detection.ts, mapping.ts, grading.ts

### `/skills` - AI Agent Capabilities
- **Format:** SKILL.md (YAML frontmatter + markdown)
- **Purpose:** Modular, reusable AI workflows
- **Loading:** Progressive (metadata → instructions → resources)

### `/orchestrator` - Workflow Coordination
- **Type:** Deterministic routing (not LLM-controlled)
- **Why:** Predictable, cost-effective, auditable
- **Config:** YAML-based stage definitions

### `/guardrails` - Safety Policies
- **Format:** YAML rules
- **Enforcement:** Pre-flight + post-flight checks
- **Compliance:** FERPA, GDPR, OWASP LLM Top 10

### `/memory-bank` - Project Context
- **For:** AI assistants & developers
- **Pattern:** Layered docs (brief → context → patterns → progress)
- **Updates:** After major changes

---

## Files to Create Next

When implementing, create in this order:

### Phase 1: Core Setup
1. `package.json` — Dependencies
2. `tsconfig.json` — TypeScript config
3. `tailwind.config.ts` — Tailwind setup
4. `.env.example` — Environment template
5. `lib/types.ts` — All interfaces

### Phase 2: Backend
6. `lib/gemini.ts` — AI client
7. `lib/prompts.ts` — Prompt templates
8. `lib/pdf-utils.ts` — PDF processing
9. `lib/store.ts` — Session storage
10. `app/api/upload/route.ts` — Upload endpoint
11. `app/api/process/route.ts` — Processing endpoint

### Phase 3: Core Logic
12. `lib/extraction.ts` — Question extraction
13. `lib/detection.ts` — Answer detection
14. `lib/mapping.ts` — Mapping algorithm
15. `lib/grading.ts` — Grading logic

### Phase 4: Frontend
16. `app/page.tsx` — Main UI
17. `components/upload/*` — Upload components
18. `components/processing/*` — Processing components
19. `components/results/*` — Results components

### Phase 5: Polish
20. `hooks/*` — Custom hooks
21. `guardrails/*` — Safety rules
22. Tests
23. Documentation updates

---

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| React Components | PascalCase | `QuestionList.tsx` |
| Hooks | camelCase with "use" | `useProcessing.ts` |
| Utilities | kebab-case | `pdf-utils.ts` |
| Types/Interfaces | PascalCase | `ExtractedQuestion` |
| API Routes | kebab-case folder | `app/api/page-image/route.ts` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |

---

## Import Paths

```typescript
// Absolute imports (configured in tsconfig.json)
import { ExtractedQuestion } from '@/lib/types';
import { QuestionList } from '@/components/results/QuestionList';
import { extractQuestions } from '@/lib/extraction';

// Relative imports for co-located files
import { Button } from './ui/button';
import { formatDate } from './utils';
```

---

## Environment Variables

```bash
# Required
GEMINI_API_KEY=your_key_here

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
MAX_FILE_SIZE_MB=20
SESSION_TTL_MINUTES=30
LOG_LEVEL=info
```

---

## Git Ignore

```
# Dependencies
node_modules/

# Build outputs
.next/
dist/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.cursor/
.idea/

# Logs
*.log

# OS
.DS_Store
Thumbs.db

# Agent tools
agent-tools/

# Test coverage
coverage/
```

---

## Scripts (package.json)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "format": "prettier --write .",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:guardrails": "vitest --grep guardrails"
  }
}
```

---

## Next Steps

1. ✅ Folder structure created
2. ✅ Documentation written
3. ⏭️ Initialize Next.js project
4. ⏭️ Install dependencies
5. ⏭️ Implement core logic
6. ⏭️ Build UI components
7. ⏭️ Deploy to Vercel

See [SETUP.md](./SETUP.md) for detailed setup instructions.

See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for full implementation plan.

---

Generated on: 2026-08-28
Project: VedaAI Assessment Extraction
Version: 1.0
