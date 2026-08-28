/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  images: {
    remotePatterns: [],
  },

  experimental: {
    serverComponentsExternalPackages: [
      '@napi-rs/canvas',
      'pdfjs-dist',
      'pdfjs-dist/legacy/build/pdf.mjs',
      'sharp',
    ],

    // Ensure pdfjs worker files are included in the Vercel deployment bundle.
    // Vercel's output-file tracer doesn't follow dynamic imports inside node_modules,
    // so we must explicitly declare these files for every route that calls pdfToImages.
    outputFileTracingIncludes: {
      // Use broad patterns so the worker is available for any route
      '/api/process': [
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
        './node_modules/@napi-rs/canvas-linux-x64-gnu/**',
      ],
      '/api/upload': [
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      ],
      '/api/grade': [
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      ],
    },

    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

module.exports = nextConfig;
