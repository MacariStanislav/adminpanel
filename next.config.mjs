/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // УБРАТЬ basePath и assetPrefix для Render
  // basePath: '/adminpanel',
  // assetPrefix: '/adminpanel/',
}

module.exports = nextConfig