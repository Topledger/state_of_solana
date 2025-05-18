/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Only use static export in production
  ...(process.env.NODE_ENV === 'production' ? {
    output: 'export',
    distDir: 'out',
    basePath: '/state_of_solana',
    assetPrefix: '/state_of_solana',
    images: {
      unoptimized: true,
    },
    trailingSlash: true,
  } : {
    // Use standard server mode in development
    distDir: '.next',
  }),
  reactStrictMode: false,
};

module.exports = nextConfig;