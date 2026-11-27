/** @type {import('next').NextConfig} */
const appHost = (() => {
  try {
    return process.env.APP_URL ? [new URL(process.env.APP_URL).hostname] : []
  } catch {
    return []
  }
})()

const nextConfig = {
  allowedDevOrigins: [
    '**.run.app',
    '*.run.app',
    '**.aistudio.google.com',
    'localhost',
    '127.0.0.1',
    ...appHost,
  ],
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/assets/catalog/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
    ]
  },
}

export default nextConfig
