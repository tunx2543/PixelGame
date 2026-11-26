import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import {
  BGM_THEMES,
  BGM_TRACK_IDS,
  type BgmTheme,
  type BgmTrackId,
} from '@/lib/game/bgm-tracks'

export const dynamic = 'force-dynamic'

function findExistingAudio(bgmDir: string, stems: readonly string[]): string[] {
  const found: string[] = []
  for (const stem of stems) {
    for (const ext of ['ogg', 'mp3'] as const) {
      const filePath = path.join(bgmDir, `${stem}.${ext}`)
      try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          found.push(`/audio/bgm/${stem}.${ext}`)
        }
      } catch {
        // Ignore unreadable filesystem entries
      }
    }
  }
  return found
}

export async function GET() {
  const bgmDir = path.join(process.cwd(), 'public', 'audio', 'bgm')
  const tracks = {} as Record<BgmTheme, string[]>
  const mapTracks: Partial<Record<BgmTrackId, string[]>> = {}

  for (const theme of BGM_THEMES) {
    tracks[theme] = findExistingAudio(bgmDir, [theme])
  }

  for (const trackId of BGM_TRACK_IDS) {
    const stems = BGM_THEMES.includes(trackId as BgmTheme)
      ? [trackId]
      : [`map_${trackId}`, trackId]
    const found = findExistingAudio(bgmDir, stems)
    if (found.length > 0) {
      mapTracks[trackId] = found
    }
  }

  return NextResponse.json(
    { tracks, mapTracks },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
