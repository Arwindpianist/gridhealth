/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@gridhealth/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
}

module.exports = nextConfig 