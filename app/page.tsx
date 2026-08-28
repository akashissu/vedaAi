'use client';

import { useState } from 'react';
import { UploadScreen } from '@/components/upload/UploadScreen';
import { ProcessingScreen } from '@/components/processing/ProcessingScreen';
import { ResultsScreen } from '@/components/results/ResultsScreen';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

type AppState = 'upload' | 'processing' | 'results';

interface ProcessingStatus {
  stage: string;
  progress: number;
  message: string;
}

interface Results {
  questions: Array<{ id: string; number: string; text: string; marks?: number }>;
  answers: Array<{
    id: string;
    boundingBox: [number, number, number, number];
    page: number;
    transcribedText?: string;
    questionNumber?: string;
  }>;
  mappings: Array<{ questionId: string; answerId: string }>;
  answerSheetImages: string[];
}

async function processFilesWithStream(
  questionPaper: File,
  answerSheet: File,
  onProgress: (status: ProcessingStatus) => void
): Promise<Results> {
  const formData = new FormData();
  formData.append('questionPaper', questionPaper);
  formData.append('answerSheet', answerSheet);

  const response = await fetch('/api/process', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Processing failed');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream');

  const decoder = new TextDecoder();
  let buffer = '';
  let results: Results | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      const data = JSON.parse(line.slice(6));

      if (data.stage === 'complete') {
        results = {
          questions: data.results?.questions ?? [],
          answers: data.results?.answers ?? [],
          mappings: data.results?.mappings ?? [],
          answerSheetImages: data.results?.answerSheetImages ?? [],
        };
      } else if (data.stage === 'error') {
        throw new Error(data.error || data.message || 'Processing failed');
      } else {
        onProgress({
          stage: data.stage,
          progress: data.progress ?? 0,
          message: data.message ?? '',
        });
      }
    }
  }

  if (!results) throw new Error('Processing finished without results');
  return results;
}

export default function HomePage() {
  const [state, setState] = useState<AppState>('upload');
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    stage: 'Initializing',
    progress: 0,
    message: 'Starting...',
  });
  const [results, setResults] = useState<Results | null>(null);

  const handleStartProcessing = async (questionPaper: File, answerSheet: File) => {
    setState('processing');

    try {
      setProcessingStatus({
        stage: 'Uploading',
        progress: 5,
        message: 'Uploading and starting pipeline...',
      });

      const processed = await processFilesWithStream(
        questionPaper,
        answerSheet,
        setProcessingStatus
      );

      setResults(processed);
      setState('results');
    } catch (error) {
      console.error('Processing failed:', error);
      alert(`Failed to process files: ${(error as Error).message}`);
      setState('upload');
    }
  };

  const isProcessing = state === 'processing';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={isProcessing} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {state !== 'processing' && <TopBar />}

        <main className="flex-1 overflow-hidden">
          {state === 'upload' && <UploadScreen onStart={handleStartProcessing} />}

          {state === 'processing' && (
            <ProcessingScreen
              stage={processingStatus.stage}
              progress={processingStatus.progress}
              message={processingStatus.message}
            />
          )}

          {state === 'results' && results && (
            <ResultsScreen
              questions={results.questions}
              answers={results.answers}
              mappings={results.mappings}
              answerSheetImages={results.answerSheetImages}
            />
          )}
        </main>
      </div>
    </div>
  );
}
