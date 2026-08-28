import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VedaAI - Assessment Extraction & Mapping',
  description: 'AI-powered assessment extraction and answer mapping tool for teachers',
  keywords: ['education', 'AI', 'assessment', 'grading', 'OCR'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-white">
          {children}
        </main>
      </body>
    </html>
  );
}
