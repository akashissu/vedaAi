'use client';

interface ProcessingScreenProps {
  stage: string;
  progress: number;
  message: string;
}

export function ProcessingScreen({ message }: ProcessingScreenProps) {
  const label = message.toLowerCase().includes('extract')
    ? 'Extracting...'
    : message.toLowerCase().includes('detect')
    ? 'Detecting...'
    : message.toLowerCase().includes('map')
    ? 'Mapping...'
    : message.toLowerCase().includes('upload')
    ? 'Uploading...'
    : message.toLowerCase().includes('convert')
    ? 'Converting...'
    : 'Processing...';

  return (
    <div className="h-full flex flex-col items-center justify-center bg-white">
      {/* Sparkle cluster */}
      <div className="relative w-28 h-28 mb-6">
        {/* Large center star */}
        <svg
          viewBox="0 0 24 24"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 text-primary animate-sparkle"
          fill="currentColor"
        >
          <path d="M12 2 L13.5 9 L20 12 L13.5 15 L12 22 L10.5 15 L4 12 L10.5 9 Z" />
        </svg>
        {/* Small top-right star */}
        <svg
          viewBox="0 0 24 24"
          className="absolute top-1 right-2 w-7 h-7 text-primary animate-pulse"
          fill="currentColor"
          style={{ animationDelay: '0.3s' }}
        >
          <path d="M12 2 L13.5 9 L20 12 L13.5 15 L12 22 L10.5 15 L4 12 L10.5 9 Z" />
        </svg>
        {/* Tiny bottom-left star */}
        <svg
          viewBox="0 0 24 24"
          className="absolute bottom-2 left-2 w-5 h-5 text-primary/70 animate-pulse"
          fill="currentColor"
          style={{ animationDelay: '0.6s' }}
        >
          <path d="M12 2 L13.5 9 L20 12 L13.5 15 L12 22 L10.5 15 L4 12 L10.5 9 Z" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-1">{label}</h2>
      <p className="text-sm text-gray-500">This may take a while</p>
    </div>
  );
}
