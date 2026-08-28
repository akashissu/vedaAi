# UI Design System - VedaAI Assessment Tool

**Based on:** Figma Design (VedaAI Hiring Assignment)  
**Created:** 2026-08-28  
**Design Source:** https://www.figma.com/design/GEjt1rt1s7AXvkcr4t8muE/VedaAI-Hiring-Assignment

---

## Design Overview

The VedaAI Assessment Tool features a clean, modern interface with a focus on clarity and ease of use. The design follows a multi-step extraction flow with clear visual feedback at each stage.

---

## Color Palette

### Primary Colors
```css
--primary-orange: #FF6B4A;      /* Main brand color, CTAs, accents */
--primary-orange-light: #FF8A6B; /* Hover states */
--primary-orange-dark: #E85A39;  /* Active states */
```

### Success/Highlight Colors
```css
--success-green: #4CAF50;        /* Answer highlights, success states */
--success-green-light: #81C784;  /* Light highlights */
--success-green-alpha: rgba(76, 175, 80, 0.2); /* Transparent overlays */
```

### Neutral Colors
```css
--background-main: #FFFFFF;      /* Main background */
--background-gray: #F5F5F5;      /* Secondary background */
--text-primary: #1A1A1A;         /* Main text */
--text-secondary: #666666;       /* Secondary text */
--border-light: #E0E0E0;         /* Borders, dividers */
--shadow: rgba(0, 0, 0, 0.08);   /* Card shadows */
```

---

## Typography

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Type Scale
```css
/* Headings */
--text-h1: 2.5rem;   /* 40px - Page titles */
--text-h2: 2rem;     /* 32px - Section titles */
--text-h3: 1.5rem;   /* 24px - Card titles */
--text-h4: 1.25rem;  /* 20px - Subsections */

/* Body */
--text-body: 1rem;   /* 16px - Main content */
--text-small: 0.875rem; /* 14px - Helper text */
--text-xs: 0.75rem;  /* 12px - Labels, captions */

/* Weight */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## Spacing System

Based on 8px grid:

```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
--space-3xl: 64px;
```

---

## Component Library

### 1. Upload Card Component

**Desktop View:**
```
┌────────────────────────────────────┐
│  📄 VedaAI Logo                    │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  📎 class_10_maths_unit...  │ │
│  │  30kb • 2 pages         ❌  │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  📎 student_1_answer_sheet  │ │
│  │  80kb • 4 pages         ❌  │ │
│  └──────────────────────────────┘ │
│                                    │
│         [ Start Mapping → ]        │
│                                    │
│  As are uploaded, you'll be able   │
│  to map answers with questions     │
└────────────────────────────────────┘
```

**Key Features:**
- Clean white cards with subtle shadow
- File name with ellipsis truncation
- File metadata (size, page count)
- Remove button (X) on hover
- Orange CTA button
- Helper text at bottom
- VedaAI logo/mascot at top

**Component Structure:**
```tsx
<UploadCard>
  <Logo />
  <FileList>
    <FileItem 
      name="class_10_maths_unit_test.pdf"
      size="30kb"
      pages={2}
      onRemove={() => {}}
    />
  </FileList>
  <Button variant="primary">Start Mapping →</Button>
  <HelperText />
</UploadCard>
```

---

### 2. Processing Screen

**Layout:**
```
┌────────────────────────────────────┐
│                                    │
│            ✨                      │
│         (sparkle icon)             │
│                                    │
│         Extracting...              │
│     This may take a while          │
│                                    │
└────────────────────────────────────┘
```

**Key Features:**
- Centered content
- Animated sparkle icon (orange)
- Bold heading
- Subtle subtext
- Optional progress indicator

**Component Structure:**
```tsx
<ProcessingScreen>
  <Icon name="sparkle" color="primary" animated />
  <Heading>Extracting...</Heading>
  <Subtext>This may take a while</Subtext>
</ProcessingScreen>
```

---

### 3. Results/Mapping Screen (Split View)

**Desktop Layout:**
```
┌─────────────────────┬──────────────────────┐
│  Questions List     │  Answer Sheet Viewer │
│  ─────────────────  │  ──────────────────  │
│  1. Question text   │  [PDF Page 1]        │
│     [3 marks]       │  ┌──────────────┐    │
│                     │  │  Green box   │    │
│  2. Question text   │  │  (highlight) │    │
│     [5 marks]       │  └──────────────┘    │
│                     │                      │
│  3. Question text   │  [PDF Page 2]        │
│     [2 marks]       │  ┌──────────────┐    │
│                     │  │  Green box   │    │
│  (scrollable)       │  └──────────────┘    │
│                     │  (scrollable)        │
└─────────────────────┴──────────────────────┘
```

**Left Panel - Questions List:**
- Scrollable list
- Each question shows:
  - Question number
  - Question text (truncated if long)
  - Marks allocation
  - Selection state (highlight when clicked)
- Clickable to highlight corresponding answer

**Right Panel - Answer Sheet:**
- PDF viewer (react-pdf)
- Green bounding boxes overlaid on detected answers
- Clickable boxes to select/map to questions
- Zoom controls
- Page navigation

**Component Structure:**
```tsx
<SplitView>
  <LeftPanel>
    <QuestionsList>
      {questions.map(q => (
        <QuestionItem 
          number={q.number}
          text={q.text}
          marks={q.marks}
          selected={selectedQ === q.id}
          onClick={() => selectQuestion(q.id)}
        />
      ))}
    </QuestionsList>
  </LeftPanel>
  
  <RightPanel>
    <PDFViewer file={answerSheet}>
      {answers.map(a => (
        <HighlightBox 
          bbox={a.boundingBox}
          color="success-green"
          onClick={() => selectAnswer(a.id)}
        />
      ))}
    </PDFViewer>
  </RightPanel>
</SplitView>
```

---

## Responsive Design

### Breakpoints
```css
--breakpoint-sm: 640px;   /* Mobile */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
```

### Mobile Adaptations

**Upload Screen:**
- Stacked layout
- Full-width cards
- Larger touch targets (44px min)
- Bottom sheet for file actions

**Processing Screen:**
- Same centered layout
- Slightly smaller icon
- Adjusted text sizes

**Results Screen:**
- Tabs instead of split view:
  - Tab 1: Questions List
  - Tab 2: Answer Sheet
- Swipe between tabs
- Floating action button for mapping

---

## UI States

### Button States
```css
/* Primary Button */
.btn-primary {
  background: var(--primary-orange);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
}

.btn-primary:hover {
  background: var(--primary-orange-light);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 107, 74, 0.3);
}

.btn-primary:active {
  background: var(--primary-orange-dark);
  transform: translateY(0);
}

.btn-primary:disabled {
  background: #CCCCCC;
  cursor: not-allowed;
}
```

### Card States
```css
.upload-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px var(--shadow);
  transition: all 0.2s ease;
}

.upload-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
```

### Highlight Box States
```css
.highlight-box {
  border: 2px solid var(--success-green);
  background: var(--success-green-alpha);
  cursor: pointer;
  transition: all 0.2s ease;
}

.highlight-box:hover {
  border-width: 3px;
  background: rgba(76, 175, 80, 0.3);
}

.highlight-box.selected {
  border: 3px solid var(--primary-orange);
  background: rgba(255, 107, 74, 0.2);
}
```

---

## Animations

### Loading States
```css
/* Sparkle animation */
@keyframes sparkle {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.1) rotate(5deg); }
}

/* Pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Transitions
```css
/* Smooth page transitions */
.page-enter {
  opacity: 0;
  transform: translateY(10px);
}

.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 0.3s ease;
}
```

---

## Icons

Using a consistent icon system (Lucide React recommended):

```tsx
import { 
  Upload,      // Upload areas
  File,        // File indicators
  X,           // Remove/close
  ArrowRight,  // Navigation
  Sparkles,    // Processing
  CheckCircle, // Success
  AlertCircle, // Warnings
  ZoomIn,      // PDF controls
  ZoomOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
```

---

## Accessibility

### Focus States
```css
*:focus-visible {
  outline: 2px solid var(--primary-orange);
  outline-offset: 2px;
}
```

### ARIA Labels
- All interactive elements have `aria-label`
- File upload areas have proper `role="button"`
- PDF viewer has `aria-label="Answer sheet viewer"`
- Questions list is a semantic `<ol>` with `aria-label="Questions"`

### Keyboard Navigation
- Tab order follows visual flow
- Enter/Space activates buttons
- Arrow keys navigate lists
- Escape closes modals

---

## Design Principles

1. **Clarity First**: Clear visual hierarchy, obvious next steps
2. **Immediate Feedback**: Loading states, success confirmations
3. **Error Prevention**: Validation before processing, confirmation dialogs
4. **Progressive Disclosure**: Show complexity only when needed
5. **Consistent Patterns**: Reuse components, maintain visual language
6. **Mobile-Friendly**: Touch-optimized, responsive layouts

---

## Implementation with shadcn/ui

Map to shadcn components:

| Design Element | shadcn Component |
|----------------|------------------|
| Upload Card | `Card` + `CardContent` |
| Primary Button | `Button` variant="default" |
| File List Item | Custom using `Card` |
| Processing Screen | Custom centered layout |
| Questions List | `ScrollArea` + custom list |
| PDF Viewer | react-pdf + `ScrollArea` |
| Highlight Box | Absolute positioned `div` |
| Tabs (mobile) | `Tabs` component |

---

## Next Steps for Implementation

1. **Setup Tailwind Config** with design tokens
2. **Create Base Components**:
   - `FileUploadCard`
   - `ProcessingScreen`
   - `SplitViewLayout`
   - `QuestionListItem`
   - `PDFViewerWithHighlights`
3. **Implement Responsive Hooks** for layout switching
4. **Add Animations** with Framer Motion
5. **Test Accessibility** with screen readers
6. **Optimize for Performance** (lazy load PDF pages)

---

## Design Assets Required

- [ ] VedaAI logo (SVG)
- [ ] Sparkle/loading icon (animated SVG)
- [ ] Favicon set (16x16, 32x32, etc.)
- [ ] OG image for social sharing
- [ ] Illustrations for empty states

---

## References

- Figma Design: [VedaAI Hiring Assignment](https://www.figma.com/design/GEjt1rt1s7AXvkcr4t8muE/VedaAI-Hiring-Assignment?node-id=0-1)
- shadcn/ui: https://ui.shadcn.com/
- Tailwind CSS: https://tailwindcss.com/
- Lucide Icons: https://lucide.dev/
