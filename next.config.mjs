/** @type {import('next').NextConfig} */
const appHost = [
  process.env.APP_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_GAME_LAUNCHER_URL,
  'https://pixelgame.ffsmilepay53.workers.dev',
].flatMap((candidate) => {
  try {
    return candidate ? [new URL(candidate).hostname] : []
  } catch {
    return []
  }
})

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
    ...Array.from(new Set(appHost)),
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
