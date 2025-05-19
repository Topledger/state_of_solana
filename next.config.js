/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Use regular Next.js with server-side rendering in all environments
  // This enables API routes necessary for the database storage
  reactStrictMode: false,
  
};

module.exports = nextConfig;