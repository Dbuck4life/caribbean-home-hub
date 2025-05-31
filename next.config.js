/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  distDir: '.next',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
