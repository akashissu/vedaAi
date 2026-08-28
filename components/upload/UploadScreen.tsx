'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, ArrowRight, FileText } from 'lucide-react';
import { cn } from '@/lib/cn';

interface UploadedFile {
  name: string;
  size: number;
  file: File;
}

interface UploadScreenProps {
  onStart: (questionPaper: File, answerSheet: File) => void;
}

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function UploadCard({
  label,
  file,
  onDrop,
  onRemove,
}: {
  label: string;
  file: UploadedFile | null;
  onDrop: (files: File[]) => void;
  onRemove: () => void;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: 20 * 1024 * 1024,
    multiple: false,
    disabled: !!file,
  });

  if (file) {
    return (
      <div className="flex-1 border border-gray-200 rounded-xl p-4 bg-white flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-white" />
          <span className="sr-only">PDF</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
          <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
        </div>
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex-1 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors min-h-[130px]',
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-gray-300 bg-white hover:border-primary/50 hover:bg-gray-50'
      )}
    >
      <input {...getInputProps()} />
      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
        <Upload className="w-5 h-5 text-gray-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-primary">
          Upload {label}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Max 10MB</p>
      </div>
    </div>
  );
}

export function UploadScreen({ onStart }: UploadScreenProps) {
  const [questionPaper, setQuestionPaper] = useState<UploadedFile | null>(null);
  const [answerSheet, setAnswerSheet] = useState<UploadedFile | null>(null);

  const handleDrop = useCallback(
    (setter: (f: UploadedFile | null) => void) => (files: File[]) => {
      if (files[0]) setter({ name: files[0].name, size: files[0].size, file: files[0] });
    },
    []
  );

  const canStart = !!(questionPaper && answerSheet);

  return (
    <div className="h-full overflow-auto flex flex-col items-center justify-center p-6"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #f5f0eb 0%, #ede8e3 40%, #e8e2db 100%)',
      }}
    >
      <div className="w-full max-w-xl">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            Upload{' '}
            <span className="text-primary">Question Paper &amp; Answer Sheets</span>
          </h1>
          <p className="text-sm text-gray-500 mt-2">Upload both files to get started</p>
        </div>

        {/* Mascot */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-200 to-orange-100 border-4 border-purple-300 flex items-center justify-center text-4xl shadow-lg">
              👩‍🏫
            </div>
            {/* Orbit dots */}
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full opacity-80" />
            <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-primary/60 rounded-full" />
            <span className="absolute top-1/2 -right-3 w-2 h-2 bg-orange-300 rounded-full" />
          </div>
        </div>

        {/* Upload Cards */}
        <div className="flex gap-4 mb-6">
          <UploadCard
            label="Question Paper"
            file={questionPaper}
            onDrop={handleDrop(setQuestionPaper)}
            onRemove={() => setQuestionPaper(null)}
          />
          <UploadCard
            label="Answer Sheet"
            file={answerSheet}
            onDrop={handleDrop(setAnswerSheet)}
            onRemove={() => setAnswerSheet(null)}
          />
        </div>

        {/* Start Button */}
        <div className="flex flex-col items-center gap-3">
          <button
            disabled={!canStart}
            onClick={() => canStart && onStart(questionPaper!.file, answerSheet!.file)}
            className={cn(
              'flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold transition-all',
              canStart
                ? 'bg-gray-900 text-white hover:bg-gray-700 shadow-md hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            Start Mapping
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs text-gray-400 text-center">
            Once both files are uploaded, you&apos;ll be able to map answers with questions.
          </p>
        </div>
      </div>
    </div>
  );
}
