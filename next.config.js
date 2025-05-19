/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Use regular Next.js with server-side rendering in all environments
  // This enables API routes necessary for the database storage
  reactStrictMode: false,
  // Set the base path if using GitHub Pages with a project site
  basePath: process.env.NODE_ENV === 'production' ? '/state_of_solana' : '',
  // Only use static export for production builds (GitHub Pages)
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
    // Images need to be handled differently in static exports
    images: {
      unoptimized: true,
    },
    // Exclude API routes from static export
    experimental: {
      excludeRoutes: [
        '/api/charts/:path*',
        '/api/s3-test',
      ],
    },
  }),
};

module.exports = nextConfig;