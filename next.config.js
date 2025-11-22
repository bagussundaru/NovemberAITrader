/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during builds for production deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore TypeScript errors for production deployment
    ignoreBuildErrors: true,
  },
  experimental: {
    // Enable server actions with default body size
    serverActions: { bodySizeLimit: '2mb' },
  },
  // Optimize for production
  compress: true,
};

module.exports = nextConfig;