# API Change Summary: Google Gemini → OpenAI

**Date:** 2026-08-28  
**Change:** Switched from Google Gemini API to OpenAI API  
**Impact:** Minimal - Core architecture remains the same

---

## What Changed

### API Client

**Before:**
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
```

**After:**
```typescript
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// Use gpt-4o or gpt-4-vision-preview
```

---

### Environment Variables

**Before:**
```bash
GEMINI_API_KEY=your_key_here
```

**After:**
```bash
OPENAI_API_KEY=sk-your_key_here
```

**Get API Key:** https://platform.openai.com/api-keys

---

### API Calls

**Before (Gemini):**
```typescript
const response = await model.generateContent({
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: schema
  }
});
```

**After (OpenAI):**
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ],
  response_format: { type: "json_object" },
  temperature: 0.1
});
```

---

### Vision API Calls

**Before (Gemini):**
```typescript
const response = await model.generateContent({
  contents: [
    { parts: [
      { text: "Analyze this image" },
      { inlineData: { mimeType: "image/png", data: base64Image }}
    ]}
  ]
});
```

**After (OpenAI):**
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "user", content: [
      { type: "text", text: "Analyze this image" },
      { type: "image_url", image_url: { 
        url: `data:image/png;base64,${base64Image}` 
      }}
    ]}
  ]
});
```

---

### Rate Limits

| Tier | Gemini | OpenAI |
|------|--------|--------|
| **Free** | 15 RPM | 3 RPM |
| **Tier 1** | N/A | 500 RPM (~$5 initial payment) |
| **Tier 2** | N/A | 5,000 RPM (~$50 spent) |

**Recommendation:** Start with Tier 1 for production ($5 one-time to unlock)

**Our Implementation:** Sequential processing with 200ms delays (safe for 500 RPM)

---

### Model Comparison

| Feature | Gemini 3.5 Flash | GPT-4o |
|---------|-----------------|---------|
| **Vision** | ✅ Native | ✅ Native |
| **Structured Output** | ✅ response_schema | ✅ JSON mode |
| **Context Window** | 1M tokens | 128K tokens |
| **Speed** | Very fast | Fast |
| **Cost (1M tokens)** | Free tier | ~$2.50-$10 |
| **Reliability** | Good | Excellent |

---

## What Stayed the Same

✅ **Architecture** — Deterministic orchestration  
✅ **Core Logic** — Extraction, detection, mapping, grading  
✅ **UI/UX** — Upload → Processing → Results  
✅ **Bounding Boxes** — Still use `[ymin, xmin, ymax, xmax]` 0-1000  
✅ **Skills** — Same 4 skills (question-extraction, answer-detection, answer-mapping, grading)  
✅ **Guardrails** — Same safety policies  
✅ **Deployment** — Still Vercel + Fluid Compute  

---

## Files Updated

### Documentation
- ✅ `README.md` — Updated tech stack & quick start
- ✅ `ARCHITECTURE.md` — Updated AI integration section
- ✅ `SETUP.md` — Updated API key instructions
- ✅ `AGENTS.md` — Updated AI references
- ✅ `memory-bank/techContext.md` — Updated stack info

### Skills (To Update During Implementation)
- ⏭️ `skills/question-extraction/SKILL.md`
- ⏭️ `skills/answer-detection/SKILL.md`
- ⏭️ `skills/grading/SKILL.md`

### Code (To Implement)
- ⏭️ `lib/openai-client.ts` (was `lib/gemini.ts`)
- ⏭️ `lib/extraction.ts`
- ⏭️ `lib/detection.ts`
- ⏭️ `lib/grading.ts`

---

## Implementation Notes

### Bounding Box Detection

GPT-4o doesn't have native bounding box detection like Gemini, but we can get it via structured outputs:

```typescript
// Define in system prompt:
"Return bounding boxes as [ymin, xmin, ymax, xmax] normalized to 0-1000 scale.
The top-left corner is (0,0). Bottom-right is (1000,1000)."

// Use JSON schema for structured output:
{
  "type": "object",
  "properties": {
    "regions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "questionNumber": { "type": "string" },
          "boundingBox": {
            "type": "array",
            "items": { "type": "number" },
            "minItems": 4,
            "maxItems": 4
          },
          "transcribedText": { "type": "string" }
        }
      }
    }
  }
}
```

---

## Cost Estimate

### Typical Assessment (20 questions, 10-page answer sheet)

**Gemini (Free Tier):**
- Question extraction: ~2,500 tokens
- Answer detection: ~15,000 tokens (10 pages)
- Grading: ~10,000 tokens (20 questions)
- **Total:** ~27,500 tokens → **FREE**

**OpenAI (Tier 1 - GPT-4o):**
- Question extraction: ~2,500 tokens × $0.0025/1K = $0.006
- Answer detection: ~15,000 tokens × $0.0025/1K = $0.038
- Grading: ~10,000 tokens × $0.0075/1K = $0.075
- **Total:** ~$0.12 per assessment

**Monthly (100 assessments):** ~$12/month

**Recommendation:** Very affordable for production use

---

## Migration Checklist

### Before Coding
- [x] Updated all documentation
- [x] Changed environment variable name
- [x] Updated API references
- [x] Reviewed rate limits

### During Implementation
- [ ] Replace `@google/generative-ai` with `openai` in package.json
- [ ] Create `lib/openai-client.ts`
- [ ] Update `lib/extraction.ts` to use OpenAI
- [ ] Update `lib/detection.ts` to use OpenAI
- [ ] Update `lib/grading.ts` to use OpenAI
- [ ] Update prompt templates in `lib/prompts.ts`
- [ ] Test with real PDFs
- [ ] Verify bounding box accuracy

### Testing
- [ ] Test question extraction
- [ ] Test answer detection
- [ ] Test grading
- [ ] Verify rate limiting works
- [ ] Check error handling

---

## Advantages of OpenAI

1. **Industry Standard** — Well-documented, widely used
2. **Reliable** — Stable API, good uptime
3. **Support** — Better community support
4. **SDKs** — Official SDKs for multiple languages
5. **Ecosystem** — More tutorials, examples available

---

## Conclusion

✅ **Change is minimal** — Core logic unchanged  
✅ **Documentation updated** — Ready for implementation  
✅ **Cost is reasonable** — ~$0.12 per assessment  
✅ **Architecture unchanged** — Same pipeline and flow  

**Next Step:** Start implementation with `lib/openai-client.ts`

---

**You're all set to use OpenAI instead of Gemini! 🚀**
