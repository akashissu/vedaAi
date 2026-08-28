# VedaAI - Processing Orchestrator

Deterministic workflow orchestration for the AI assessment extraction pipeline.

---

## Overview

The orchestrator coordinates the multi-stage AI processing pipeline using **deterministic routing** rather than LLM-controlled orchestration. This provides:

- **Predictable execution paths** — Same inputs always take same route
- **Zero token overhead** — No LLM calls for routing decisions
- **Cost control** — Only AI calls for actual work, not coordination
- **Auditability** — Clear trace of what happened and why
- **Reproducibility** — Re-run produces identical results

---

## Pipeline Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                 DETERMINISTIC ORCHESTRATION                     │
│                    (Zero Token Overhead)                        │
└────────────────────────────────────────────────────────────────┘

INPUT: { sessionId, questionPaperFile, answerSheetFile }

┌─────────────┐
│   START     │
└──────┬──────┘
       │
       ▼
┌──────────────────┐  Error?  ┌─────────────┐
│  VALIDATE FILES  │─────────▶│   FAIL      │
└──────┬───────────┘          └─────────────┘
       │ Valid
       ▼
┌──────────────────┐
│  CONVERT TO      │
│  IMAGES          │  ← Deterministic: Always page-by-page
└──────┬───────────┘
       │
       ├─────────────────────┬──────────────────────┐
       │                     │                      │
       ▼                     ▼                      ▼
┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│  EXTRACT     │    │  DETECT ANSWER  │    │  STORE PAGE  │
│  QUESTIONS   │    │  REGIONS        │    │  IMAGES      │
│  (Gemini)    │    │  (Gemini)       │    │  (Memory)    │
└──────┬───────┘    └────────┬────────┘    └──────────────┘
       │                     │
       └─────────┬───────────┘
                 │ Both complete
                 ▼
       ┌──────────────────┐
       │  MAP ANSWERS     │  ← Deterministic algorithm
       │  TO QUESTIONS    │     (No AI, pure logic)
       └──────┬───────────┘
              │
              ▼
       ┌──────────────────┐  Want grading?  ┌─────────────┐
       │  SHOULD GRADE?   │─────────No─────▶│  COMPLETE   │
       └──────┬───────────┘                  └─────────────┘
              │ Yes
              ▼
       ┌──────────────────┐
       │  GRADE EACH      │  ← Loop over mapped Q+A pairs
       │  ANSWER          │     Sequential, one at a time
       │  (Gemini)        │
       └──────┬───────────┘
              │
              ▼
       ┌──────────────────┐
       │  COMPLETE        │
       │  Return Results  │
       └──────────────────┘
```

---

## Stage Definitions

### Stage 1: File Validation

**Type:** Synchronous, deterministic
**Duration:** < 1 second
**AI Calls:** 0

**Logic:**
```typescript
if (fileSize > MAX_SIZE) → FAIL("File too large")
if (!isPDF && !isImage) → FAIL("Invalid file type")
if (pageCount > MAX_PAGES) → FAIL("Too many pages")
→ PROCEED
```

**Next Stage:** Convert to Images

---

### Stage 2: Convert to Images

**Type:** Sequential, page-by-page
**Duration:** ~500ms per page
**AI Calls:** 0

**Logic:**
```typescript
for each page in PDF:
  renderPage(pageNum, DPI=300) → PNG buffer
  store in memory: images[pageNum] = buffer
```

**Parallelization:** None (sequential to avoid memory pressure)
**Next Stage:** Parallel → Extract Questions + Detect Answers

---

### Stage 3a: Extract Questions

**Type:** Single AI call
**Duration:** 5-15 seconds
**AI Calls:** 1

**Input:** All question paper images
**Gemini Call:**
```typescript
const result = await gemini.extractQuestions(questionImages, {
  systemPrompt: QUESTION_EXTRACTION_PROMPT,
  responseSchema: QuestionSchema,
  temperature: 0.1  // Low for consistency
});
```

**Output:** `ExtractedQuestion[]`

**Next Stage:** Wait for Detect Answers, then Map

---

### Stage 3b: Detect Answer Regions

**Type:** Sequential, page-by-page AI calls
**Duration:** 3-8 seconds per page
**AI Calls:** N (one per answer sheet page)

**Why Sequential?**
- Gemini free tier: 15 RPM limit
- Avoids rate limit errors
- Predictable cost

**Logic:**
```typescript
for each page in answerSheetImages:
  const regions = await gemini.detectAnswerRegions(pageImage, {
    systemPrompt: ANSWER_DETECTION_PROMPT,
    responseSchema: AnswerRegionSchema,
    temperature: 0.1
  });
  allRegions.push(...regions);
  
  // Rate limit protection
  await sleep(1000);  // 1 second between calls
```

**Output:** `AnswerRegion[]`

**Next Stage:** Map Answers to Questions

---

### Stage 4: Map Answers to Questions

**Type:** Deterministic algorithm (no AI)
**Duration:** < 1 second
**AI Calls:** 0

**Algorithm:**
```typescript
1. For each ExtractedQuestion:
   a. Find AnswerRegions where questionNumber matches
   b. If multiple matches → take all (multi-page answer)
   c. If no match → try fuzzy matching by content
   d. If still no match → mark as UNANSWERED

2. For remaining AnswerRegions with no match:
   → Add to orphanAnswers array

3. Return MappedResult[]
```

**Output:** `{ mappings: MappedResult[], orphans: AnswerRegion[] }`

**Next Stage:** Conditional → Grade if enabled

---

### Stage 5: Grade Each Answer (Optional)

**Type:** Sequential AI calls
**Duration:** 3-5 seconds per Q+A pair
**AI Calls:** N (one per mapped answer)

**Condition:**
```typescript
if (config.enableGrading === false) → SKIP to COMPLETE
```

**Logic:**
```typescript
for each mapping in mappings:
  if (mapping.status === 'answered'):
    const grade = await gemini.gradeAnswer(
      mapping.question,
      mapping.answer,
      { systemPrompt: GRADING_PROMPT }
    );
    mapping.grade = grade;
    
    // Rate limit protection
    await sleep(1000);
```

**Output:** Updated `MappedResult[]` with grades

**Next Stage:** Complete

---

## Workflow Configuration

Configuration in `orchestrator/config.yaml`:

```yaml
orchestrator:
  version: "1.0"
  mode: deterministic  # vs "llm-controlled"
  
  stages:
    - name: validate
      timeout: 5s
      retryOnError: false
      
    - name: convert
      timeout: 60s
      retryOnError: true
      maxRetries: 3
      
    - name: extract_questions
      timeout: 30s
      retryOnError: true
      maxRetries: 2
      rateLimit:
        enabled: true
        delayMs: 1000
      
    - name: detect_answers
      timeout: 120s
      retryOnError: true
      maxRetries: 2
      sequential: true  # Process pages one-by-one
      rateLimit:
        enabled: true
        delayMs: 1000
      
    - name: map_answers
      timeout: 10s
      retryOnError: false
      
    - name: grade_answers
      timeout: 180s
      retryOnError: true
      maxRetries: 2
      sequential: true
      rateLimit:
        enabled: true
        delayMs: 1000
      conditional:
        field: config.enableGrading
        equals: true

  errorHandling:
    onStageFail: ABORT_PIPELINE
    notifyUser: true
    preservePartialResults: true

  monitoring:
    emitProgress: SSE
    logLevel: INFO
    auditTrail: enabled
```

---

## Conditional Routing Rules

### Rule 1: Skip Grading

```typescript
// In orchestrator/execute.ts
if (!session.config.enableGrading) {
  skip('grade_answers');
  return completeWithResults(mappings);
}
```

### Rule 2: Handle Empty Question Paper

```typescript
if (extractedQuestions.length === 0) {
  return fail({
    stage: 'extract_questions',
    error: 'No questions found',
    suggestRetry: true
  });
}
```

### Rule 3: All Answers Unanswered

```typescript
const answeredCount = mappings.filter(m => m.status === 'answered').length;
if (answeredCount === 0) {
  // Still complete, but set warning flag
  return complete({
    mappings,
    warnings: ['No answers detected on answer sheet']
  });
}
```

---

## Error Handling Strategy

| Error Type | Action | User Notification |
|------------|--------|-------------------|
| File validation fail | Abort immediately | "Invalid file: {reason}" |
| PDF conversion fail | Retry 3x with exponential backoff | "Converting pages..." |
| Gemini rate limit (429) | Wait 60s, retry | "API busy, retrying..." |
| Gemini timeout | Retry 2x | "Processing taking longer..." |
| Network error | Retry 3x | "Connection issue, retrying..." |
| No questions found | Abort, suggest re-upload | "Could not extract questions" |
| No answers detected | Continue (mark all unanswered) | Warning shown in results |
| Mapping algorithm error | Abort | "Internal error, please retry" |

---

## Progress Streaming (SSE)

The orchestrator emits real-time progress via Server-Sent Events:

```typescript
// Client receives:
{ step: 'validate', progress: 10, status: 'complete' }
{ step: 'convert', progress: 20, status: 'in_progress' }
{ step: 'convert', progress: 30, status: 'in_progress' }
{ step: 'extract_questions', progress: 40, status: 'in_progress' }
{ step: 'extract_questions', progress: 50, status: 'complete', data: { questionCount: 15 } }
{ step: 'detect_answers', progress: 60, status: 'in_progress', data: { page: 1, total: 3 } }
{ step: 'detect_answers', progress: 70, status: 'in_progress', data: { page: 2, total: 3 } }
{ step: 'map_answers', progress: 80, status: 'in_progress' }
{ step: 'grade_answers', progress: 90, status: 'in_progress', data: { current: 5, total: 15 } }
{ step: 'complete', progress: 100, status: 'complete', data: { results } }
```

---

## Implementation

```typescript
// orchestrator/execute.ts
export async function executeAssessmentPipeline(
  session: Session,
  onProgress: (event: ProgressEvent) => void
): Promise<ProcessingResults> {
  
  const context = new OrchestrationContext(session);
  
  try {
    // Stage 1: Validate
    onProgress({ step: 'validate', progress: 10, status: 'in_progress' });
    await stages.validate(context);
    onProgress({ step: 'validate', progress: 10, status: 'complete' });
    
    // Stage 2: Convert
    onProgress({ step: 'convert', progress: 20, status: 'in_progress' });
    await stages.convertToImages(context, (p) => 
      onProgress({ step: 'convert', progress: 20 + p * 0.2, status: 'in_progress' })
    );
    onProgress({ step: 'convert', progress: 40, status: 'complete' });
    
    // Stage 3: Extract & Detect (parallel)
    const [questions, regions] = await Promise.all([
      stages.extractQuestions(context, (p) =>
        onProgress({ step: 'extract_questions', progress: 40 + p * 0.1, status: 'in_progress' })
      ),
      stages.detectAnswers(context, (p) =>
        onProgress({ step: 'detect_answers', progress: 50 + p * 0.2, status: 'in_progress' })
      )
    ]);
    
    // Stage 4: Map
    onProgress({ step: 'map_answers', progress: 80, status: 'in_progress' });
    const mappings = stages.mapAnswersToQuestions(questions, regions);
    onProgress({ step: 'map_answers', progress: 85, status: 'complete' });
    
    // Stage 5: Grade (conditional)
    if (context.config.enableGrading) {
      const graded = await stages.gradeAnswers(context, mappings, (p) =>
        onProgress({ step: 'grade_answers', progress: 85 + p * 0.15, status: 'in_progress' })
      );
      onProgress({ step: 'grade_answers', progress: 100, status: 'complete' });
      return graded;
    }
    
    onProgress({ step: 'complete', progress: 100, status: 'complete' });
    return { questions, mappings, summary: generateSummary(mappings) };
    
  } catch (error) {
    onProgress({ 
      step: context.currentStage, 
      progress: context.progress, 
      status: 'error',
      error: error.message 
    });
    throw error;
  }
}
```

---

## Why Deterministic?

**Alternatives Considered:**
1. **LLM Orchestrator** — Let Gemini decide what to do next
2. **Hybrid** — AI routing with deterministic fallbacks

**Why We Chose Deterministic:**
- ✅ Known structure — Assessment grading has fixed stages
- ✅ Cost — Saves ~10-20 tokens per routing decision
- ✅ Predictability — Same input = same execution path
- ✅ Debugging — Easy to trace what happened
- ✅ Rate limits — Control API call frequency
- ❌ Flexibility — If task structure changes, we update code (acceptable trade-off)

---

## Monitoring & Audit Trail

Every orchestration run creates an audit log:

```json
{
  "sessionId": "abc123",
  "timestamp": "2026-08-28T09:00:00Z",
  "stages": [
    {
      "name": "validate",
      "startTime": "2026-08-28T09:00:00Z",
      "endTime": "2026-08-28T09:00:01Z",
      "status": "success",
      "duration": 1000
    },
    {
      "name": "extract_questions",
      "startTime": "2026-08-28T09:00:05Z",
      "endTime": "2026-08-28T09:00:12Z",
      "status": "success",
      "duration": 7000,
      "aiCalls": 1,
      "tokensUsed": 2500,
      "result": { "questionCount": 15 }
    }
  ],
  "totalDuration": 45000,
  "totalAICalls": 18,
  "totalTokens": 45000,
  "status": "complete"
}
```

---

## References

- [Deterministic vs LLM Orchestration (2026)](https://tianpan.co/blog/2026-04-20-workflow-engines-beat-llm-agents)
- [Microsoft Conductor](https://opensource.microsoft.com/blog/2026/05/14/conductor-deterministic-orchestration-for-multi-agent-ai-workflows/)
- [Workflow Pattern Guide](https://dreaming.press/posts/deterministic-vs-llm-orchestration-for-multi-agent-systems.html)
