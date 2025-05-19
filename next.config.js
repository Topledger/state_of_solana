/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Use regular Next.js with server-side rendering in all environments
  // This enables API routes necessary for the database storage
  reactStrictMode: false,
  // Configure for GitHub Pages deployment
  output: 'export',
  // Set the base path if using GitHub Pages with a project site
  basePath: process.env.NODE_ENV === 'production' ? '/state_of_solana' : '',
  // Images need to be handled differently in static exports
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;