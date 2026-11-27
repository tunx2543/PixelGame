import { NextRequest, NextResponse } from 'next/server'
import { resolveBgmManifest } from '@/lib/server/bgm-manifest'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { tracks, mapTracks } = await resolveBgmManifest({
    requestUrl: req.url,
  })

  return NextResponse.json(
    { tracks, mapTracks },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
