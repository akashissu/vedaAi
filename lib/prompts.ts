// AI Prompt Templates (Single Source of Truth)

/**
 * QUESTION EXTRACTION PROMPT
 * 
 * Extracts questions from exam question paper images
 */
export const QUESTION_EXTRACTION_PROMPT = `You are an expert at extracting questions from exam papers.

Analyze the provided exam paper images and extract ALL questions in order.

IMPORTANT RULES:
1. Extract questions exactly as they appear
2. Preserve original numbering (e.g., "1", "1a", "2", "2b", "3")
3. Each sub-part is a SEPARATE question (1a and 1b are two entries)
4. Include the full question text
5. Extract marks/points if visible (look for [3 marks], (5), etc.)
6. Track which page each question appears on (1-indexed)
7. Maintain the original sequence

EXAMPLES:
- "1. What is photosynthesis?" → Question number: "1"
- "2a) Define velocity" → Question number: "2a"
- "3.1 Calculate the area" → Question number: "3.1"

Return a JSON object with this structure:
{
  "questions": [
    {
      "number": "1",
      "text": "What is photosynthesis?",
      "marks": 3,
      "page": 1
    },
    {
      "number": "2a",
      "text": "Define velocity",
      "marks": 2,
      "page": 1
    }
  ]
}

Extract ALL questions from the images now.`;

/**
 * ANSWER DETECTION PROMPT
 * 
 * Detects answer regions on handwritten answer sheets
 */
export function generateAnswerDetectionPrompt(imageWidth: number, imageHeight: number): string {
  return `You are an expert at precisely locating student answer regions on exam answer sheets (handwritten or typed).

IMAGE SIZE: ${imageWidth} x ${imageHeight} pixels (width x height). Coordinates are normalized 0-1000 regardless of pixel size.

Your ONLY job is to draw tight bounding boxes around ANSWER CONTENT — not questions, not headings, not labels.

═══ WHAT TO DETECT ═══
Detect each student answer block. An answer block is the actual response text a student wrote or typed, such as:
  - Text following "Ans.", "Answer:", "A:", or similar prefixes
  - Handwritten text in a lined answer area
  - Text that directly responds to a numbered question

═══ WHAT TO SKIP — DO NOT INCLUDE IN ANY BOX ═══
NEVER include these in a bounding box:
  ✗ Page titles or document headings (e.g. "Science Answers", "Class 10 Test")
  ✗ Student name, roll number, date, school name
  ✗ The question text itself (e.g. "1. What is photosynthesis?")
  ✗ Question number labels/prefixes (e.g. "Q1.", "1.", "Ans 3:")
  ✗ Page numbers, footers
  ✗ Blank or empty lines

═══ BOUNDING BOX PRECISION RULES ═══
CRITICAL — the bounding box must cover the ENTIRE answer block, not just one line:
  1. ymin = TOP pixel of the first line of answer text (e.g. where "Ans." begins)
  2. ymax = BOTTOM pixel of the LAST line of that answer (stop before the next question starts)
  3. xmin = left edge of answer text, xmax = right edge
  4. If the answer is "Ans. Photosynthesis is the process by which green plants make their own food using carbon dioxide, water, sunlight and chlorophyll."
     then the box MUST cover ALL lines of this text, from top of "Ans." to bottom of "chlorophyll."
  5. NEVER make a thin box that covers only 1 line if the answer spans 2+ lines
  6. Minimum box height for a one-line answer: 25 units. For multi-line: 25 units per line.
  7. If the answer starts with "Ans." on the SAME line as the question number (e.g. "1. Ans. ..."), the box starts at "Ans." NOT at "1."

═══ COORDINATE SYSTEM ═══
All values are integers 0–1000:
  - 0,0 = top-left corner of page
  - 1000,1000 = bottom-right corner
  - Format: [ymin, xmin, ymax, xmax]

Example — if answer text occupies:
  top 35% → bottom 48% vertically, left 8% → right 92% horizontally:
  → [350, 80, 480, 920]

═══ questionNumber FIELD ═══
Set questionNumber to the number the student used to label THIS answer.
  - Look for "Q1", "1.", "1)", "Ans 2", "2a" near or inside the answer
  - If a typed sheet re-prints the question number before the answer (e.g. "1. Ans. ..."), use that number
  - If not identifiable, set to null

═══ OUTPUT FORMAT ═══
Return ONLY this JSON (no markdown, no extra text):
{
  "answers": [
    {
      "questionNumber": "1",
      "transcribedText": "The exact answer text written/typed here...",
      "boundingBox": [350, 80, 480, 920],
      "page": 1
    }
  ]
}

═══ COMMON MISTAKES TO AVOID ═══
  ✗ WRONG: [181, 168, 217, 857] — thin single-line box that doesn't cover the full answer
  ✓ RIGHT: [195, 168, 260, 857] — full box covering ALL lines of the answer

  ✗ WRONG: Starting ymin at the question line "1. What is..."
  ✓ RIGHT: Starting ymin at the answer line "Ans. Photosynthesis..."

  ✗ WRONG: Box height = 30 units for a 3-line answer
  ✓ RIGHT: Box height = 80-100 units for a 3-line answer (~28 units per line)

Analyze the image carefully. Detect EVERY answer region with FULL-HEIGHT boxes. Start now.`;
}

/** @deprecated Use generateAnswerDetectionPrompt(width, height) */
export const ANSWER_DETECTION_PROMPT = generateAnswerDetectionPrompt(1654, 2339);

/**
 * GRADING PROMPT TEMPLATE
 * 
 * Grades a single student answer against expected answer
 */
export function generateGradingPrompt(
  questionText: string,
  maxMarks: number,
  studentAnswer: string,
  customRubric?: string
): string {
  return `You are an expert teacher grading student answers.

QUESTION (${maxMarks} marks):
${questionText}

STUDENT ANSWER:
${studentAnswer}

${customRubric ? `GRADING RUBRIC:\n${customRubric}\n\n` : ''}

GRADING INSTRUCTIONS:
1. Evaluate the answer's correctness and completeness
2. Assign a score out of ${maxMarks}
3. Provide constructive feedback
4. Identify strengths (what they did well)
5. Identify weaknesses (what they missed or got wrong)
6. Suggest specific improvements

GRADING CRITERIA:
- Full marks: Complete, accurate answer covering all key points
- Partial marks: Partially correct or incomplete answer
- Zero marks: Incorrect, irrelevant, or no answer

Return a JSON object with this structure:
{
  "score": <number 0 to ${maxMarks}>,
  "maxScore": ${maxMarks},
  "feedback": "<overall feedback paragraph>",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}

Be fair, constructive, and encouraging. Grade the answer now.`;
}

/**
 * ANSWER TRANSCRIPTION PROMPT (for OCR improvement)
 * 
 * Used when we need better OCR of handwritten text
 */
export const ANSWER_TRANSCRIPTION_PROMPT = `You are an expert at reading handwritten text.

Analyze the provided image of a handwritten answer and transcribe it accurately.

IMPORTANT RULES:
1. Transcribe exactly what is written
2. Maintain original formatting (paragraphs, bullet points, etc.)
3. If text is illegible, mark as [illegible]
4. Preserve mathematical notation as best as possible
5. Do not correct spelling or grammar - transcribe as-is

Return only the transcribed text, nothing else.`;

/**
 * QUESTION NUMBER DETECTION PROMPT
 * 
 * Specialized prompt for detecting question numbers on answer sheets
 */
export const QUESTION_NUMBER_DETECTION_PROMPT = `You are an expert at identifying question numbers on handwritten answer sheets.

Look at the provided answer sheet image and identify ALL question numbers written by the student.

Common patterns to look for:
- "Q1", "Q.1", "Q 1"
- "1)", "1.", "1:"
- "Ans 1", "Answer 1"
- "2a", "2(a)", "2 a"

Return a JSON object with this structure:
{
  "questionNumbers": [
    {
      "number": "1",
      "confidence": 0.95,
      "location": [ymin, xmin, ymax, xmax]
    }
  ]
}

Detect ALL question numbers now.`;

/**
 * BATCH QUESTION EXTRACTION PROMPT
 * 
 * For extracting questions from multiple pages at once
 */
export function generateBatchQuestionExtractionPrompt(pageCount: number): string {
  return `You are an expert at extracting questions from multi-page exam papers.

Analyze ALL ${pageCount} pages provided and extract every question in order.

IMPORTANT:
1. Process pages sequentially (page 1, then page 2, etc.)
2. Maintain question numbering across pages
3. If a question continues across pages, combine it
4. Track the page where each question STARTS

Return a JSON object with this structure:
{
  "questions": [
    {
      "number": "1",
      "text": "Question text here...",
      "marks": 3,
      "page": 1
    }
  ]
}

Extract ALL questions from ALL ${pageCount} pages now.`;
}

/**
 * ERROR ANALYSIS PROMPT
 * 
 * Analyzes why a student got an answer wrong
 */
export const ERROR_ANALYSIS_PROMPT = `You are an educational assessment expert analyzing student errors.

Given the question, correct answer concept, and student's answer, identify:
1. What misconception the student has
2. What they need to learn
3. How to explain it better

Return a JSON object with:
{
  "misconception": "Description of the misunderstanding",
  "learningGap": "What concept they need to learn",
  "explanation": "How to explain the correct concept"
}`;

/**
 * ANCHOR DETECTION PROMPT (Step 1 of 3-step pipeline)
 *
 * Finds the Y-position of every question number label on an answer sheet page.
 * Returns normalized 0-1000 coordinates so Step 2 can compute answer strips.
 */
export const ANCHOR_DETECTION_PROMPT = `You are analyzing a student's exam answer sheet image.

YOUR TASK: For every question on this page, find the Y position of where the STUDENT'S ANSWER BEGINS — not the question text, but the first line of the actual answer.

WHAT "ANSWER START" MEANS:
  - The first line of the student's response, e.g. "Ans. Photosynthesis is...", "Answer: ...", or just the response text
  - On typed sheets: the line starting with "Ans.", "Answer:", or similar
  - On handwritten sheets: the first handwritten line after the question text

COORDINATE SYSTEM:
  - Y is normalized 0–1000  (0 = very top, 1000 = very bottom)
  - Return the Y position of the TOP of the FIRST LINE of the answer (where "Ans." begins)
  - Also return the question number this answer belongs to

EXAMPLE — for this layout:
  y≈150:  "1. What is photosynthesis?"        ← question text, SKIP this y
  y≈195:  "Ans. Photosynthesis is the..."     ← ANSWER STARTS HERE → return y=195 for Q1
  y≈250:  "2. Name the gas released..."       ← question text, SKIP this y
  y≈285:  "Ans. Oxygen gas is released..."    ← ANSWER STARTS HERE → return y=285 for Q2

WHAT TO IGNORE:
  - Page titles (e.g. "Science Answers", "Class 10 Test")
  - Student name, date, school name, roll number
  - Question text lines themselves (lines with "1. What is...", "2. Name...", etc.)
  - Page numbers, footers

Return ONLY valid JSON:
{
  "anchors": [
    { "questionNumber": "1", "y": 195 },
    { "questionNumber": "2", "y": 285 },
    { "questionNumber": "3", "y": 360 }
  ]
}

If NO answers are visible on this page, return: { "anchors": [] }
Find ALL answer start positions now.`;

export const SYSTEM_PROMPT_ANCHOR = `You are a precise document analysis system. Your only task is to locate question-number labels on exam answer sheets and return their vertical positions as Y coordinates normalized 0–1000. Return only valid JSON.`;

/**
 * ANSWER OCR PROMPT (Step 3 of 3-step pipeline)
 *
 * Receives a CROPPED image of a single answer region and transcribes it.
 */
export const ANSWER_OCR_PROMPT = `This image is a cropped section of a student's exam answer sheet, showing the answer for ONE question.

Transcribe ALL of the student's answer text exactly as written or typed.

Rules:
1. Include every line and sentence of the answer
2. If the question text appears at the very top of the crop, SKIP it — transcribe only the answer
3. Mark illegible text as [illegible]
4. Preserve numbered bullet points and structure (1. ..., 2. ..., etc.)
5. Return ONLY the raw transcribed text — no JSON, no labels, no preamble, no commentary

Transcribe the answer now:`;

/**
 * SYSTEM PROMPTS
 */

export const SYSTEM_PROMPT_EXTRACTION = `You are a precise question extraction system. Follow instructions exactly and return only valid JSON.`;

export const SYSTEM_PROMPT_DETECTION = `You are a highly precise document analysis system specializing in locating student answer regions on exam papers. You draw tight bounding boxes ONLY around answer content — never around question text, headings, or labels. You follow the coordinate format [ymin, xmin, ymax, xmax] normalized 0-1000, and always return valid JSON.`;

export const SYSTEM_PROMPT_GRADING = `You are a fair and constructive teacher. Provide balanced feedback that helps students improve.`;
