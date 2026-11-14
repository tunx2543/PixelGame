/** @type {import('next').NextConfig} */
const appHost = (() => {
  try {
    return process.env.APP_URL ? [new URL(process.env.APP_URL).hostname] : []
  } catch {
    return []
  }
})()

const nextConfig = {
  output: 'standalone',
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
}

export default nextConfig
