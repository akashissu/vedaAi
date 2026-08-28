'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Question {
  id: string;
  number: string;
  text: string;
  marks?: number;
}

interface Answer {
  id: string;
  boundingBox: [number, number, number, number];
  page: number;
  transcribedText?: string;
  questionNumber?: string;
}

interface Mapping {
  questionId: string;
  answerId: string;
}

interface GradingResult {
  score: number;
  maxScore: number;
  feedback: string;
}

interface ResultsScreenProps {
  sessionId: string;
  questions?: Question[];
  answers?: Answer[];
  mappings?: Mapping[];
  answerSheetImages?: string[];
}

const Q_COLORS = [
  'border-orange-400 bg-orange-400/10 text-orange-600',
  'border-blue-400 bg-blue-400/10 text-blue-600',
  'border-green-400 bg-green-400/10 text-green-600',
  'border-purple-400 bg-purple-400/10 text-purple-600',
  'border-pink-400 bg-pink-400/10 text-pink-600',
  'border-cyan-400 bg-cyan-400/10 text-cyan-600',
];

export function ResultsScreen({
  sessionId,
  questions = [],
  answers = [],
  mappings = [],
  answerSheetImages = [],
}: ResultsScreenProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [gradingResults, setGradingResults] = useState<Record<string, GradingResult>>({});
  const [gradingLoading, setGradingLoading] = useState<Set<string>>(new Set());
  const [gradingAll, setGradingAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [activeTab, setActiveTab] = useState<'questions' | 'sheet'>('questions');

  const totalPages = answerSheetImages.length;

  const getAnswerForQuestion = useCallback(
    (questionId: string) => {
      const mapping = mappings.find((m) => m.questionId === questionId);
      if (!mapping) return null;
      return answers.find((a) => a.id === mapping.answerId) ?? null;
    },
    [mappings, answers]
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (expandedIds.size === questions.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(questions.map((q) => q.id)));
    }
  };

  const gradeOne = async (question: Question): Promise<void> => {
    if (gradingResults[question.id] || gradingLoading.has(question.id)) return;
    setGradingLoading((prev) => new Set(prev).add(question.id));
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, questionId: question.id }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setGradingResults((prev) => ({ ...prev, [question.id]: data.result }));
      }
    } catch {
      // silently fail
    } finally {
      setGradingLoading((prev) => {
        const next = new Set(prev);
        next.delete(question.id);
        return next;
      });
    }
  };

  const gradeAll = async () => {
    if (gradingAll) return;
    setGradingAll(true);
    // Expand all so users can see results appearing
    setExpandedIds(new Set(questions.map((q) => q.id)));
    // Sequential to respect rate limits
    for (const q of questions) {
      if (!gradingResults[q.id]) await gradeOne(q);
    }
    setGradingAll(false);
  };

  // All answers visible on current page
  const pageAnswers = answers.filter((a) => a.page === currentPage);

  // Static index colors (fallback when not graded)
  const questionIndexColorMap = Object.fromEntries(
    questions.map((q, i) => [q.id, Q_COLORS[i % Q_COLORS.length]])
  );

  // Grade-based color: green = full marks, red = partial/wrong, gray = ungraded
  const getBboxColor = (questionId: string) => {
    const grading = gradingResults[questionId];
    if (!grading) return questionIndexColorMap[questionId];
    return grading.score >= grading.maxScore
      ? 'border-green-500 bg-green-500/10 text-green-700'
      : 'border-red-500 bg-red-500/10 text-red-700';
  };

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      {/* Mobile tabs */}
      <div className="md:hidden flex border-b border-gray-200 bg-white shrink-0">
        {(['questions', 'sheet'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-3 text-sm font-medium capitalize transition-colors',
              activeTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500'
            )}
          >
            {tab === 'questions' ? 'Questions' : 'Answer Sheet'}
          </button>
        ))}
      </div>

      {/* Left panel: Questions */}
      <div
        className={cn(
          'md:w-[400px] lg:w-[440px] bg-white border-r border-gray-200 flex flex-col shrink-0',
          activeTab !== 'questions' && 'hidden md:flex'
        )}
      >
        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-gray-900">Extracted Questions</h2>
              <p className="text-xs text-gray-500 mt-0.5">from question paper</p>
            </div>
            <button
              onClick={expandAll}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {expandedIds.size === questions.length ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
          {/* Grade All button */}
          <button
            onClick={gradeAll}
            disabled={gradingAll || questions.every((q) => !!gradingResults[q.id])}
            className={cn(
              'w-full py-2 rounded-lg text-xs font-semibold transition-colors',
              gradingAll || questions.every((q) => !!gradingResults[q.id])
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90'
            )}
          >
            {gradingAll
              ? `Grading… (${Object.keys(gradingResults).length}/${questions.length})`
              : questions.every((q) => !!gradingResults[q.id])
              ? '✓ All Graded'
              : '✦ Grade All Questions'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {questions.map((question, idx) => {
            const answer = getAnswerForQuestion(question.id);
            const isExpanded = expandedIds.has(question.id);
            const grading = gradingResults[question.id];
            const isLoading = gradingLoading.has(question.id);
            const colorClass = getBboxColor(question.id);

            return (
              <div
                key={question.id}
                className={cn(
                  'border-b border-gray-100 transition-colors',
                  isExpanded ? 'bg-orange-50/40' : 'hover:bg-gray-50'
                )}
              >
                <button
                  className="w-full px-4 py-3 flex items-start gap-3 text-left"
                  onClick={() => toggleExpand(question.id)}
                >
                  {/* Number badge */}
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0 mt-0.5">
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-snug line-clamp-2">
                      {question.text}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {/* Marks */}
                    {question.marks && (
                      <span className={cn(
                        'text-xs font-semibold',
                        grading
                          ? grading.score >= grading.maxScore
                            ? 'text-green-600'
                            : 'text-red-500'
                          : 'text-gray-500'
                      )}>
                        {grading ? `${grading.score}/${grading.maxScore}` : `?/${question.marks}`}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pl-13">
                    <div className="ml-9 space-y-3">
                      {/* Answer text preview */}
                      {answer?.transcribedText && (
                        <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">
                          <span className="font-medium text-gray-700">Student answer: </span>
                          {answer.transcribedText}
                        </div>
                      )}

                      {/* AI Feedback */}
                      {grading ? (
                        <div className="bg-white border border-orange-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-primary mb-1.5">AI Feedback</p>
                          <p className="text-xs text-gray-700 leading-relaxed">{grading.feedback}</p>
                          <div className="mt-2 flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                              {grading.score}/{grading.maxScore}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => gradeOne(question)}
                          disabled={isLoading || !answer}
                          className={cn(
                            'text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
                            isLoading || !answer
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-primary/10 text-primary hover:bg-primary/20'
                          )}
                        >
                          {isLoading ? 'Grading…' : answer ? 'Get AI Feedback' : 'No answer mapped'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel: Answer Sheet Viewer */}
      <div
        className={cn(
          'flex-1 flex flex-col bg-gray-100 overflow-hidden',
          activeTab !== 'sheet' && 'hidden md:flex'
        )}
      >
        {/* Toolbar */}
        <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
          <h3 className="text-sm font-semibold text-gray-800">Answer Sheet</h3>

          <div className="flex items-center gap-3">
            {/* Zoom */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5 text-gray-600" />
              </button>
              <span className="text-xs text-gray-600 w-12 text-center font-medium">{zoom}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(200, z + 10))}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5 text-gray-600" />
              </button>
            </div>

            {/* Page nav */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-medium">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Page Image with overlays */}
        <div className="flex-1 overflow-auto p-6 flex justify-center">
          {answerSheetImages[currentPage - 1] ? (
            <div
              className="relative shadow-xl rounded-lg overflow-hidden bg-white"
              style={{ width: `${zoom}%`, maxWidth: '900px', minWidth: '280px' }}
            >
              <img
                src={`data:image/png;base64,${answerSheetImages[currentPage - 1]}`}
                alt={`Answer Sheet Page ${currentPage}`}
                className="w-full h-auto block"
              />

              {/* Bounding box overlays for all answers on this page, largest area rendered first */}
              <div className="absolute inset-0 pointer-events-none">
                {[...pageAnswers]
                  .sort((a, b) => {
                    const areaA = (a.boundingBox[2] - a.boundingBox[0]) * (a.boundingBox[3] - a.boundingBox[1]);
                    const areaB = (b.boundingBox[2] - b.boundingBox[0]) * (b.boundingBox[3] - b.boundingBox[1]);
                    return areaB - areaA; // larger boxes behind smaller ones
                  })
                  .map((answer) => {
                  const mapping = mappings.find((m) => m.answerId === answer.id);
                  if (!mapping) return null;
                  const question = questions.find((q) => q.id === mapping.questionId);
                  if (!question) return null;
                  const colorClass = getBboxColor(question.id);
                  const [ymin, xmin, ymax, xmax] = answer.boundingBox;

                  return (
                    <div
                      key={answer.id}
                      className={cn('absolute border-2 rounded-sm transition-colors duration-500', colorClass)}
                      style={{
                        left: `${xmin / 10}%`,
                        top: `${ymin / 10}%`,
                        width: `${(xmax - xmin) / 10}%`,
                        height: `${(ymax - ymin) / 10}%`,
                      }}
                    >
                      {/* Label sits inside the box at top-left, never bleeds onto adjacent boxes */}
                      <span
                        className={cn(
                          'absolute top-0.5 left-0.5 text-[10px] font-bold px-1 py-0 rounded leading-tight border bg-white/90',
                          colorClass
                        )}
                        style={{ lineHeight: '1.4' }}
                      >
                        Q{answer.questionNumber ?? question.number}
                      </span>
                    </div>
                  );
                  })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No image available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
