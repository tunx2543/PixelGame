/** @type {import('next').NextConfig} */
const appHost = (() => {
  try {
    return process.env.APP_URL ? [new URL(process.env.APP_URL).hostname] : []
  } catch {
    return []
  }
})()

const resolvedBuildId =
  process.env.NEXT_PUBLIC_BUILD_ID ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.WORKERS_CI_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  (process.env.NODE_ENV === 'production' ? `build-${Date.now().toString(36)}` : 'dev-local')

const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_BUILD_ID: resolvedBuildId,
  },
  allowedDevOrigins: [
    '**.run.app',
    '*.run.app',
    '**.aistudio.google.com',
    'localhost',
    '127.0.0.1',
    ...appHost,
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
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
