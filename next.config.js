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
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

module.exports = nextConfig;
