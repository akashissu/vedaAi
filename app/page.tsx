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
  answers: Array<{ id: string; boundingBox: [number, number, number, number]; page: number; transcribedText?: string; questionNumber?: string }>;
  mappings: Array<{ questionId: string; answerId: string }>;
  answerSheetImages: string[];
}

export default function HomePage() {
  const [state, setState] = useState<AppState>('upload');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    stage: 'Initializing',
    progress: 0,
    message: 'Starting...',
  });
  const [results, setResults] = useState<Results | null>(null);

  const handleStartProcessing = async (questionPaper: File, answerSheet: File) => {
    setState('processing');

    try {
      setProcessingStatus({ stage: 'Uploading', progress: 10, message: 'Uploading files...' });

      const formData = new FormData();
      formData.append('questionPaper', questionPaper);
      formData.append('answerSheet', answerSheet);

      const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadResponse.ok) throw new Error('Upload failed');

      const { sessionId: sid } = await uploadResponse.json();
      setSessionId(sid);

      setProcessingStatus({ stage: 'Processing', progress: 20, message: 'Extracting questions...' });

      const eventSource = new EventSource(`/api/process?sessionId=${sid}`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.stage === 'complete') {
          eventSource.close();
          fetch(`/api/results?sessionId=${sid}`)
            .then((res) => res.json())
            .then((d) => {
              setResults({
                questions: d.questions ?? [],
                answers: d.answers ?? [],
                mappings: d.mappings ?? [],
                answerSheetImages: d.answerSheetImages?.length
                  ? d.answerSheetImages
                  : d.answerSheetImage
                  ? [d.answerSheetImage]
                  : [],
              });
              setState('results');
            })
            .catch(() => setState('upload'));
        } else if (data.stage === 'error') {
          eventSource.close();
          alert(`Error: ${data.message || 'Processing failed'}`);
          setState('upload');
        } else {
          setProcessingStatus({ stage: data.stage, progress: data.progress, message: data.message });
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        alert('Connection error. Please try again.');
        setState('upload');
      };
    } catch (error) {
      console.error('Processing failed:', error);
      alert('Failed to process files. Please try again.');
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
              sessionId={sessionId!}
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
