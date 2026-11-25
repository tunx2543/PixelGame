import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { BGM_THEMES, type BgmTheme } from '@/lib/game/bgm-tracks'

export const dynamic = 'force-dynamic'

export async function GET() {
  const bgmDir = path.join(process.cwd(), 'public', 'audio', 'bgm')
  const tracks = {} as Record<BgmTheme, string[]>

  for (const theme of BGM_THEMES) {
    const found: string[] = []
    for (const ext of ['ogg', 'mp3'] as const) {
      const filePath = path.join(bgmDir, `${theme}.${ext}`)
      try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          found.push(`/audio/bgm/${theme}.${ext}`)
        }
      } catch {
        // Ignore unreadable filesystem entries
      }
    }
    tracks[theme] = found
  }

  return NextResponse.json(
    { tracks },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
