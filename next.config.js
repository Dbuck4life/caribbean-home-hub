/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: 'build',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
