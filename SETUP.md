# VedaAI - Development Environment Setup

Quick setup guide to get the project running locally in under 10 minutes.

---

## Environment Overview

**Type:** Native development with Next.js + Node.js
**Why:** Direct access to file system for PDF processing, no container overhead

---

## Prerequisites

| Tool | Required Version | Install Command | Purpose |
|------|-----------------|-----------------|---------|
| Node.js | 20+ | `nvm install 20` or [nodejs.org](https://nodejs.org) | Runtime |
| npm/pnpm | 9+ | Comes with Node.js | Package manager |
| Git | Latest | [git-scm.com](https://git-scm.com) | Version control |
| OpenAI API Key | N/A | Get from [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | GPT-4o Vision |

**Platform Support:** Windows, macOS, Linux

---

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd VedaAi

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Run development server
npm run dev
```

**🎉 Open [http://localhost:3000](http://localhost:3000) to see the app**

---

## Detailed Setup

### Step 1: Clone the Repository (30 seconds)

```bash
git clone <repository-url>
cd VedaAi
```

### Step 2: Install Dependencies (2-3 minutes)

```bash
npm install
```

This installs:
- Next.js 14+ (React framework)
- openai (OpenAI API client)
- react-pdf (PDF viewer)
- sharp (Image processing)
- pdf-lib (PDF manipulation)
- Tailwind CSS + shadcn/ui (UI components)

### Step 3: Configure Environment (1 minute)

```bash
cp .env.example .env
```

Edit `.env` and set:

```bash
# Required
OPENAI_API_KEY=your_api_key_here

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Get your OpenAI API Key:**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in with your OpenAI account
3. Click "Create new secret key"
4. Copy and paste into `.env`

### Step 4: Start Development Server (30 seconds)

```bash
npm run dev
```

The app starts at: **http://localhost:3000**

---

## Verify Everything Works

Run these checks to ensure your setup is correct:

- [ ] **Server starts:** `npm run dev` runs without errors
- [ ] **Homepage loads:** http://localhost:3000 displays the upload screen
- [ ] **TypeScript compiles:** `npm run typecheck` shows no errors
- [ ] **Linting passes:** `npm run lint` shows no errors
- [ ] **Build succeeds:** `npm run build` completes successfully

---

## Project Structure

```
vedaai/
├── app/                  # Next.js App Router
│   ├── api/             # Backend API routes
│   └── page.tsx         # Main UI page
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── upload/         # Upload screen
│   ├── processing/     # Processing state
│   └── results/        # Results display
├── lib/                # Core logic
│   ├── gemini.ts       # AI client
│   ├── extraction.ts   # Question extraction
│   ├── detection.ts    # Answer detection
│   ├── mapping.ts      # Q→A mapping
│   └── grading.ts      # AI grading
├── hooks/              # React hooks
├── types/              # TypeScript types
├── skills/             # AI agent skills
├── orchestrator/       # Workflow coordination
├── guardrails/         # Safety policies
└── memory-bank/        # Project docs
```

---

## Development Workflow

### Running in Development

```bash
npm run dev              # Start dev server (port 3000)
npm run dev -- -p 3001   # Start on custom port
```

### Type Checking

```bash
npm run typecheck        # Check TypeScript
npm run typecheck:watch  # Watch mode
```

### Linting & Formatting

```bash
npm run lint            # Run ESLint
npm run lint:fix        # Auto-fix issues
npm run format          # Format with Prettier
```

### Building for Production

```bash
npm run build           # Create production build
npm start               # Run production server
```

---

## Testing the AI Pipeline

### Test Question Extraction

```bash
# Upload a sample question paper at:
http://localhost:3000

# Check logs for extraction results
```

### Test Answer Detection

```bash
# Upload both question paper + answer sheet
# Monitor SSE stream in browser DevTools
```

### Verify OpenAI API

```bash
# Quick test of OpenAI connection
node -e "
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello' }]
}).then(r => console.log('✓ OpenAI connected'));
"
```

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Kill the process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:3000 | xargs kill -9
```

### Gemini API Errors

**Error: `API key not valid`**
- Check `.env` file has correct `GEMINI_API_KEY`
- Ensure no extra spaces or quotes
- Restart dev server after changing `.env`

**Error: `429 Rate Limit`**
- You've hit the free tier rate limit (15 RPM)
- Wait 1 minute and retry
- Consider sequential processing (already implemented)

### Sharp Installation Issues

**Windows:**
```bash
npm install --include=optional sharp
```

**macOS (Apple Silicon):**
```bash
npm install --platform=darwin --arch=arm64 sharp
```

### PDF.js Worker Not Loading

```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

---

## IDE Configuration

### VS Code (Recommended)

Install extensions:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### Cursor

This project includes:
- `.cursor/rules/` - AI coding guidelines
- `AGENTS.md` - Agent-specific instructions
- Skills in `skills/` directory

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ Yes | N/A | OpenAI API key (sk-...) |
| `NEXT_PUBLIC_APP_URL` | ❌ No | `http://localhost:3000` | App URL for metadata |
| `NODE_ENV` | ❌ No | `development` | Environment mode |
| `MAX_FILE_SIZE_MB` | ❌ No | `20` | Max upload size |
| `SESSION_TTL_MINUTES` | ❌ No | `30` | Session cleanup time |

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel deployment instructions.

Quick deploy:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

## Getting Help

- **Architecture:** See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Development Plan:** See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)
- **Project Context:** See [memory-bank/](./memory-bank/)
- **Issues:** Open a GitHub issue
- **OpenAI API Docs:** [platform.openai.com/docs](https://platform.openai.com/docs)

---

## Next Steps

After setup, check:
1. **Read [ARCHITECTURE.md](./ARCHITECTURE.md)** to understand the system
2. **Review [memory-bank/activeContext.md](./memory-bank/activeContext.md)** for current status
3. **Check [skills/](./skills/)** to understand AI capabilities
4. **Read [AGENTS.md](./AGENTS.md)** if using AI coding assistants

Happy coding! 🚀
