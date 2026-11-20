import catalogAtlasData from './catalog-atlas.json'
import {
  getMonsterCacheRevision,
  invalidateMonsterAssetCache,
  purgeStaleLocalMonsterCaches,
  subscribeMonsterCacheInvalidation,
  withMonsterCacheBust,
} from './monster-cache'
import type { SheetFrameDrawSpec } from './sprite-sheets'
import type { Dir, SpriteAction } from './sprites'

export type CatalogAtlasFrame = [
  pageIdx: number,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
]

export interface CatalogAtlasAnim {
  ms: number
  frames: CatalogAtlasFrame[]
}

export interface CatalogAtlasEntry {
  catId: string
  biome: string
  pages: string[]
  boxW: number
  boxH: number
  footPadFrac: number
  heightWorld: number
  flying: boolean
  anims: Partial<Record<'idle' | 'walk' | 'attack' | 'skill', CatalogAtlasAnim>>
}

interface CatalogAtlasFile {
  version: number
  count: number
  monsters: Record<string, CatalogAtlasEntry>
}

interface CachedCatalogPage {
  revision: string
  img: HTMLImageElement
  failed: boolean
}

const CATALOG_MONSTERS = (catalogAtlasData as unknown as CatalogAtlasFile).monsters

const pageImageCache = new Map<string, CachedCatalogPage>()
const preloadedBiomes = new Set<string>()

subscribeMonsterCacheInvalidation(() => {
  pageImageCache.clear()
  preloadedBiomes.clear()
})

function requestCatalogPageImage(url: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null
  purgeStaleLocalMonsterCaches()
  const revision = getMonsterCacheRevision()
  const existing = pageImageCache.get(url)
  if (existing && existing.revision === revision && !existing.failed) {
    return existing.img.complete && existing.img.naturalWidth > 0 ? existing.img : null
  }

  const img = new Image()
  const entry: CachedCatalogPage = { revision, img, failed: false }
  img.onerror = () => {
    entry.failed = true
  }
  img.src = withMonsterCacheBust(url, revision)
  pageImageCache.set(url, entry)
  return img.complete && img.naturalWidth > 0 ? img : null
}

export function refreshCatalogMonsterSprites(revision?: string): string {
  const nextRev = invalidateMonsterAssetCache(revision)
  pageImageCache.clear()
  preloadedBiomes.clear()
  return nextRev
}

export function hasCatalogMonsterAtlas(defId?: string | null): boolean {
  return Boolean(defId && defId in CATALOG_MONSTERS)
}

export function getCatalogMonsterAtlas(defId?: string | null): CatalogAtlasEntry | null {
  if (!defId) return null
  return CATALOG_MONSTERS[defId] ?? null
}

export function getCatalogMonsterFrameCount(defId: string, action: SpriteAction): number {
  const entry = CATALOG_MONSTERS[defId]
  if (!entry) return action === 'walk' || action === 'run' ? 6 : 4
  const anim =
    action === 'skill'
      ? entry.anims.skill ?? entry.anims.attack ?? entry.anims.walk ?? entry.anims.idle
      : action === 'attack'
        ? entry.anims.attack ?? entry.anims.skill ?? entry.anims.walk ?? entry.anims.idle
        : action === 'walk' || action === 'run'
          ? entry.anims.walk ?? entry.anims.idle ?? entry.anims.attack ?? entry.anims.skill
          : entry.anims.idle ?? entry.anims.walk ?? entry.anims.attack ?? entry.anims.skill
  return anim?.frames.length ?? 4
}

export function preloadMapCatalogSprites(mapId: string, forceRefresh = false): void {
  if (typeof Image === 'undefined') return
  if (forceRefresh) {
    preloadedBiomes.delete(mapId)
  }
  if (preloadedBiomes.has(mapId)) return
  preloadedBiomes.add(mapId)
  for (const entry of Object.values(CATALOG_MONSTERS)) {
    if (entry.biome === mapId) {
      for (const pageUrl of entry.pages) {
        requestCatalogPageImage(pageUrl)
      }
    }
  }
}

export function getCatalogMonsterFrameSpec(
  defId: string | undefined,
  dir: Dir,
  action: SpriteAction,
  frame: number,
  isBoss = false,
): SheetFrameDrawSpec | null {
  if (!defId || typeof document === 'undefined') return null
  const entry = CATALOG_MONSTERS[defId]
  if (!entry) return null

  // Eagerly kick off loading for all atlas pages of this monster (e.g. core + attack page)
  for (const pageUrl of entry.pages) {
    requestCatalogPageImage(pageUrl)
  }

  let anim: CatalogAtlasAnim | undefined
  let forceZeroFrame = false

  if (action === 'skill') {
    anim = entry.anims.skill ?? entry.anims.attack ?? entry.anims.walk ?? entry.anims.idle
  } else if (action === 'attack') {
    anim = entry.anims.attack ?? entry.anims.skill ?? entry.anims.walk ?? entry.anims.idle
  } else if (action === 'walk' || action === 'run') {
    anim = entry.anims.walk ?? entry.anims.idle ?? entry.anims.attack ?? entry.anims.skill
  } else {
    if (entry.anims.idle) {
      anim = entry.anims.idle
    } else if (entry.flying && entry.anims.walk) {
      anim = entry.anims.walk
    } else {
      anim = entry.anims.walk ?? entry.anims.attack ?? entry.anims.skill
      forceZeroFrame = true
    }
  }

  if (!anim || anim.frames.length === 0) return null

  const frameIdx = forceZeroFrame ? 0 : Math.abs(Math.floor(frame)) % anim.frames.length
  let chosen = anim.frames[frameIdx]
  let img = requestCatalogPageImage(entry.pages[chosen[0]] ?? entry.pages[0])

  // Graceful fallback to page-0 core frame while -p1 attack sheet is still downloading
  if (!img) {
    const coreAnim = entry.anims.idle ?? entry.anims.walk ?? anim
    const coreFrame = coreAnim.frames[0]
    const coreImg = coreFrame ? requestCatalogPageImage(entry.pages[coreFrame[0]] ?? entry.pages[0]) : null
    if (!coreImg) return null
    chosen = coreFrame
    img = coreImg
  }

  const [, sx, sy, sw, sh, rx, ry, rw, rh] = chosen
  const desiredWorldH = Math.max(18, Math.min(72, 16 + entry.heightWorld * 0.28))
  const hdScale = Number(((entry.boxH * (isBoss ? 1.65 : 1.05)) / desiredWorldH).toFixed(4))

  return {
    image: img,
    sx,
    sy,
    sw,
    sh,
    flipX: dir === 'right',
    hdScale,
    sheetId: `catalog_${defId}`,
    anchorX: 0.5,
    anchorY: 1 - entry.footPadFrac,
    boxW: entry.boxW,
    boxH: entry.boxH,
    subX: rx,
    subY: ry,
    subW: rw,
    subH: rh,
    footPadFrac: entry.footPadFrac,
  }
}
