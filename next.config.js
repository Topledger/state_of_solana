/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configuration for GitHub Pages static export
  output: 'export',
  // GitHub Pages deploys to a subdirectory matching the repo name
  basePath: '/state_of_solana',
  // Disable image optimization since it requires a server
  images: {
    unoptimized: true,
  },
  // Use regular Next.js with server-side rendering in all environments
  // This enables API routes necessary for the database storage
  reactStrictMode: false,
  
};

module.exports = nextConfig;