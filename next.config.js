/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  // Enable experimental features if needed
  experimental: {
    // serverActions: true, // Uncomment if using Server Actions
  },
}

module.exports = nextConfig