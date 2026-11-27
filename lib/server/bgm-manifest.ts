import fs from 'node:fs'
import path from 'node:path'
import {
  BGM_THEMES,
  BGM_TRACK_IDS,
  type BgmTheme,
  type BgmTrackId,
} from '@/lib/game/bgm-tracks'

export interface BgmManifestResponse {
  tracks: Record<BgmTheme, string[]>
  mapTracks: Partial<Record<BgmTrackId, string[]>>
}

export interface AssetsFetcher {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

const AUDIO_EXTS = ['ogg', 'mp3'] as const
const CF_CONTEXT_SYMBOL = Symbol.for('__cloudflare-context__')

export function getBgmCandidatePaths(stems: readonly string[]): string[] {
  const paths: string[] = []
  for (const stem of stems) {
    for (const ext of AUDIO_EXTS) {
      paths.push(`/audio/bgm/${stem}.${ext}`)
    }
  }
  return paths
}

export function getStemsForTrackId(trackId: BgmTrackId): string[] {
  return BGM_THEMES.includes(trackId as BgmTheme)
    ? [trackId]
    : [`map_${trackId}`, trackId]
}

export function buildBgmManifestFromExistingSet(existingPaths: ReadonlySet<string>): BgmManifestResponse {
  const tracks = {} as Record<BgmTheme, string[]>
  const mapTracks: Partial<Record<BgmTrackId, string[]>> = {}

  for (const theme of BGM_THEMES) {
    tracks[theme] = getBgmCandidatePaths([theme]).filter((p) => existingPaths.has(p))
  }

  for (const trackId of BGM_TRACK_IDS) {
    const found = getBgmCandidatePaths(getStemsForTrackId(trackId)).filter((p) => existingPaths.has(p))
    if (found.length > 0) {
      mapTracks[trackId] = found
    }
  }

  return { tracks, mapTracks }
}

export function collectAllCandidateAudioPaths(): string[] {
  const unique = new Set<string>()
  for (const theme of BGM_THEMES) {
    for (const p of getBgmCandidatePaths([theme])) unique.add(p)
  }
  for (const trackId of BGM_TRACK_IDS) {
    for (const p of getBgmCandidatePaths(getStemsForTrackId(trackId))) unique.add(p)
  }
  return [...unique]
}

export function scanNodeBgmDirectory(bgmDir: string): Set<string> | null {
  try {
    if (!fs.existsSync(bgmDir) || !fs.statSync(bgmDir).isDirectory()) {
      return null
    }
  } catch {
    return null
  }

  const found = new Set<string>()
  for (const relPath of collectAllCandidateAudioPaths()) {
    const fileName = relPath.slice('/audio/bgm/'.length)
    const diskPath = path.join(bgmDir, fileName)
    try {
      if (fs.existsSync(diskPath) && fs.statSync(diskPath).isFile()) {
        found.add(relPath)
      }
    } catch {
      // Ignore unreadable filesystem entries
    }
  }
  return found
}

export function getCloudflareAssetsBinding(): AssetsFetcher | null {
  const ctx = (globalThis as Record<symbol, unknown>)[CF_CONTEXT_SYMBOL] as
    | { env?: { ASSETS?: AssetsFetcher } }
    | undefined
  if (ctx?.env?.ASSETS && typeof ctx.env.ASSETS.fetch === 'function') {
    return ctx.env.ASSETS
  }
  return null
}

async function probeAssetExists(assets: AssetsFetcher, assetUrl: string): Promise<boolean> {
  try {
    const headRes = await assets.fetch(new Request(assetUrl, { method: 'HEAD' }))
    if (headRes.ok) {
      await headRes.body?.cancel?.()
      return true
    }
    await headRes.body?.cancel?.()
    if (headRes.status === 405) {
      const getRes = await assets.fetch(new Request(assetUrl, { method: 'GET' }))
      await getRes.body?.cancel?.()
      return getRes.ok
    }
    return false
  } catch {
    return false
  }
}

export async function scanCloudflareAssetsBgm(
  assets: AssetsFetcher,
  requestOrigin: string,
): Promise<Set<string>> {
  const candidates = collectAllCandidateAudioPaths()
  const origin = requestOrigin || 'https://assets.local'
  const checks = await Promise.all(
    candidates.map(async (relPath) => {
      const url = new URL(relPath, origin).toString()
      const exists = await probeAssetExists(assets, url)
      return exists ? relPath : null
    }),
  )
  return new Set(checks.filter((p): p is string => p !== null))
}

export async function resolveBgmManifest(options?: {
  bgmDir?: string
  requestUrl?: string
  assets?: AssetsFetcher | null
}): Promise<BgmManifestResponse> {
  const bgmDir = options?.bgmDir ?? path.join(process.cwd(), 'public', 'audio', 'bgm')
  const nodeFound = scanNodeBgmDirectory(bgmDir)
  if (nodeFound) {
    return buildBgmManifestFromExistingSet(nodeFound)
  }

  const assets = options?.assets !== undefined ? options.assets : getCloudflareAssetsBinding()
  if (assets) {
    let origin = 'https://assets.local'
    if (options?.requestUrl) {
      try {
        origin = new URL(options.requestUrl).origin
      } catch {
        origin = 'https://assets.local'
      }
    }
    const cfFound = await scanCloudflareAssetsBgm(assets, origin)
    return buildBgmManifestFromExistingSet(cfFound)
  }

  return buildBgmManifestFromExistingSet(new Set())
}
