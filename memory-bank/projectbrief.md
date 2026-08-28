# Project Brief - VedaAI Assessment Extraction & Answer Mapping

## What
A web application for teachers to upload question papers and handwritten student answer sheets, then:
- Extract questions from the paper
- Detect and map student answers to questions
- Highlight exact answer regions on the sheet
- Provide AI grading and feedback

## Core Requirements
1. Upload question paper (PDF/images) + answer sheet (PDF/images)
2. Extract every question in printed order (sub-parts as separate entries)
3. Detect each answer region with bounding box coordinates
4. Map answers to questions (handle out-of-order, unanswered, orphans)
5. Highlight exact answer regions when teacher clicks a question
6. Support multi-page answers
7. Show processing progress
8. Deploy to live URL

## Constraints
- Any tech stack (Next.js recommended)
- Any free-tier AI API
- No auth, no DB required
- In-memory storage sufficient
- Must be deployed and accessible

## Goals
A teacher should quickly understand: which question was answered, where the answer is, and which questions were left unanswered.
