# Tech Context

## Stack
- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui
- **AI:** OpenAI GPT-4o / GPT-4 Vision — vision, structured outputs, JSON mode
- **PDF:** react-pdf (viewer), pdf-lib (parsing), sharp (page-to-image)
- **Deployment:** Vercel (Hobby plan + Fluid Compute, 300s timeout)

## Key Technical Details

### OpenAI API
- Model: `gpt-4o` or `gpt-4-vision-preview`
- Capabilities: Vision understanding, structured outputs, JSON mode
- Bounding box format: `[ymin, xmin, ymax, xmax]` normalized to 0-1000 (via prompt)
- Rate limits: 500 RPM (tier 1), 3 RPM (free tier)

### Vercel Deployment
- Enable Fluid Compute for 300s function timeout (free)
- Set `maxDuration: 300` on processing route
- Use SSE for streaming progress to client

### PDF Highlighting
- Convert PDF pages to images for Gemini processing
- Use react-pdf to render pages in browser
- Overlay absolute-positioned divs for highlight boxes
- Scale normalized coords (0-1000) to pixel dimensions

## Dependencies
- next, react, typescript
- openai
- react-pdf, pdfjs-dist
- sharp, pdf-lib
- tailwindcss, shadcn/ui, framer-motion
- react-dropzone, lucide-react
