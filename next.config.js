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
    outputFileTracingIncludes: {
      '/api/process': [
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
      ],
      '/api/upload': [
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
      ],
    },
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

module.exports = nextConfig;
