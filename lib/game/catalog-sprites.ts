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

const WORLD_GOLEM_ID = 'world_golem'
const WORLD_GOLEM_BOX_W = 112
const WORLD_GOLEM_BOX_H = 112
const WORLD_GOLEM_FOOT_PAD_FRAC = 19 / WORLD_GOLEM_BOX_H
const WORLD_GOLEM_HEIGHT_WORLD = 200
const WORLD_GOLEM_STOMP_COUNT = 13
const WORLD_GOLEM_ATTACK_COUNTS: Record<Dir, number> = {
  down: 14,
  up: 17,
  right: 17,
  left: 17,
}

const WORLD_GOLEM_ROTATION_URLS = {
  down: '/assets/world-boss/mech_golem/rotations/south.png',
  up: '/assets/world-boss/mech_golem/rotations/north.png',
  right: '/assets/world-boss/mech_golem/rotations/east.png',
  left: '/assets/world-boss/mech_golem/rotations/west.png',
} as const

const WORLD_GOLEM_STOMP_SOUTH_URLS = Array.from(
  { length: WORLD_GOLEM_STOMP_COUNT },
  (_, idx) => `/assets/world-boss/mech_golem/stomp/south/frame_${String(idx).padStart(3, '0')}.png`,
)

const WORLD_GOLEM_STOMP_EAST_URLS = Array.from(
  { length: WORLD_GOLEM_STOMP_COUNT },
  (_, idx) => `/assets/world-boss/mech_golem/stomp/east/frame_${String(idx).padStart(3, '0')}.png`,
)

const WORLD_GOLEM_ATTACK_URLS: Record<Dir, string[]> = {
  down: Array.from(
    { length: WORLD_GOLEM_ATTACK_COUNTS.down },
    (_, idx) => `/assets/world-boss/mech_golem/attack/south/frame_${String(idx).padStart(3, '0')}.png`,
  ),
  up: Array.from(
    { length: WORLD_GOLEM_ATTACK_COUNTS.up },
    (_, idx) => `/assets/world-boss/mech_golem/attack/north/frame_${String(idx).padStart(3, '0')}.png`,
  ),
  right: Array.from(
    { length: WORLD_GOLEM_ATTACK_COUNTS.right },
    (_, idx) => `/assets/world-boss/mech_golem/attack/east/frame_${String(idx).padStart(3, '0')}.png`,
  ),
  left: Array.from(
    { length: WORLD_GOLEM_ATTACK_COUNTS.left },
    (_, idx) => `/assets/world-boss/mech_golem/attack/west/frame_${String(idx).padStart(3, '0')}.png`,
  ),
}

const WORLD_GOLEM_ALL_URLS = [
  ...Object.values(WORLD_GOLEM_ROTATION_URLS),
  ...WORLD_GOLEM_STOMP_SOUTH_URLS,
  ...WORLD_GOLEM_STOMP_EAST_URLS,
  ...WORLD_GOLEM_ATTACK_URLS.down,
  ...WORLD_GOLEM_ATTACK_URLS.up,
  ...WORLD_GOLEM_ATTACK_URLS.right,
  ...WORLD_GOLEM_ATTACK_URLS.left,
]

const WORLD_GOLEM_PLACEHOLDER_FRAMES: CatalogAtlasFrame[] = Array.from(
  { length: WORLD_GOLEM_STOMP_COUNT },
  () => [0, 0, 0, WORLD_GOLEM_BOX_W, WORLD_GOLEM_BOX_H, 0, 0, 1, 1],
)

const WORLD_GOLEM_ATTACK_PLACEHOLDER_FRAMES: CatalogAtlasFrame[] = Array.from(
  { length: 17 },
  () => [0, 0, 0, WORLD_GOLEM_BOX_W, WORLD_GOLEM_BOX_H, 0, 0, 1, 1],
)

const WORLD_GOLEM_ATLAS_ENTRY: CatalogAtlasEntry = {
  catId: WORLD_GOLEM_ID,
  biome: 'world',
  pages: [WORLD_GOLEM_ROTATION_URLS.down, WORLD_GOLEM_ROTATION_URLS.right],
  boxW: WORLD_GOLEM_BOX_W,
  boxH: WORLD_GOLEM_BOX_H,
  footPadFrac: WORLD_GOLEM_FOOT_PAD_FRAC,
  heightWorld: WORLD_GOLEM_HEIGHT_WORLD,
  flying: false,
  anims: {
    idle: { ms: 160, frames: WORLD_GOLEM_PLACEHOLDER_FRAMES },
    walk: { ms: 90, frames: WORLD_GOLEM_PLACEHOLDER_FRAMES },
    attack: { ms: 65, frames: WORLD_GOLEM_ATTACK_PLACEHOLDER_FRAMES },
    skill: { ms: 65, frames: WORLD_GOLEM_ATTACK_PLACEHOLDER_FRAMES },
  },
}

function preloadWorldGolemAssets(): void {
  for (const url of WORLD_GOLEM_ALL_URLS) {
    requestCatalogPageImage(url)
  }
}

function makeWorldGolemRotationSpec(img: HTMLImageElement, hdScale: number): SheetFrameDrawSpec {
  return {
    image: img,
    sx: 0,
    sy: 0,
    sw: 80,
    sh: 80,
    flipX: false,
    hdScale,
    sheetId: `catalog_${WORLD_GOLEM_ID}`,
    anchorX: 0.5,
    anchorY: 1 - WORLD_GOLEM_FOOT_PAD_FRAC,
    boxW: WORLD_GOLEM_BOX_W,
    boxH: WORLD_GOLEM_BOX_H,
    subX: 16 / WORLD_GOLEM_BOX_W,
    subY: 16 / WORLD_GOLEM_BOX_H,
    subW: 80 / WORLD_GOLEM_BOX_W,
    subH: 80 / WORLD_GOLEM_BOX_H,
    footPadFrac: WORLD_GOLEM_FOOT_PAD_FRAC,
  }
}

export function resolveCatalogMonsterWorldHeight(defId: string, heightWorld: number): number {
  if (defId === WORLD_GOLEM_ID) {
    return 136
  }
  return Math.max(18, Math.min(72, 16 + heightWorld * 0.28))
}

function getWorldGolemFrameSpec(
  dir: Dir,
  action: SpriteAction,
  frame: number,
  isBoss = true,
): SheetFrameDrawSpec | null {
  preloadWorldGolemAssets()
  const desiredWorldH = resolveCatalogMonsterWorldHeight(WORLD_GOLEM_ID, WORLD_GOLEM_HEIGHT_WORLD)
  const hdScale = Number(((WORLD_GOLEM_BOX_H * (isBoss ? 1.65 : 1.05)) / desiredWorldH).toFixed(4))

  if (action === 'attack' || action === 'skill') {
    const urls = WORLD_GOLEM_ATTACK_URLS[dir] ?? WORLD_GOLEM_ATTACK_URLS.down
    const atkIdx = Math.abs(Math.floor(frame)) % urls.length
    const atkImg = requestCatalogPageImage(urls[atkIdx])
    if (atkImg) {
      const isSouth = dir === 'down'
      return {
        image: atkImg,
        sx: 0,
        sy: 0,
        sw: isSouth ? 112 : 108,
        sh: isSouth ? 112 : 108,
        flipX: false,
        hdScale,
        sheetId: `catalog_${WORLD_GOLEM_ID}`,
        anchorX: 0.5,
        anchorY: 1 - WORLD_GOLEM_FOOT_PAD_FRAC,
        boxW: WORLD_GOLEM_BOX_W,
        boxH: WORLD_GOLEM_BOX_H,
        subX: isSouth ? 0 : 2 / WORLD_GOLEM_BOX_W,
        subY: isSouth ? 0 : 2 / WORLD_GOLEM_BOX_H,
        subW: (isSouth ? 112 : 108) / WORLD_GOLEM_BOX_W,
        subH: (isSouth ? 112 : 108) / WORLD_GOLEM_BOX_H,
        footPadFrac: WORLD_GOLEM_FOOT_PAD_FRAC,
      }
    }
  }

  const frameIdx = Math.abs(Math.floor(frame)) % WORLD_GOLEM_STOMP_COUNT

  if (dir === 'up') {
    const northImg =
      requestCatalogPageImage(WORLD_GOLEM_ROTATION_URLS.up) ??
      requestCatalogPageImage(WORLD_GOLEM_ROTATION_URLS.down)
    return northImg ? makeWorldGolemRotationSpec(northImg, hdScale) : null
  }

  if (dir === 'left' || dir === 'right') {
    const stompImg = requestCatalogPageImage(WORLD_GOLEM_STOMP_EAST_URLS[frameIdx])
    if (stompImg) {
      return {
        image: stompImg,
        sx: 0,
        sy: 0,
        sw: 108,
        sh: 108,
        flipX: dir === 'left',
        hdScale,
        sheetId: `catalog_${WORLD_GOLEM_ID}`,
        anchorX: 0.5,
        anchorY: 1 - WORLD_GOLEM_FOOT_PAD_FRAC,
        boxW: WORLD_GOLEM_BOX_W,
        boxH: WORLD_GOLEM_BOX_H,
        subX: 2 / WORLD_GOLEM_BOX_W,
        subY: 2 / WORLD_GOLEM_BOX_H,
        subW: 108 / WORLD_GOLEM_BOX_W,
        subH: 108 / WORLD_GOLEM_BOX_H,
        footPadFrac: WORLD_GOLEM_FOOT_PAD_FRAC,
      }
    }
    const rotUrl = dir === 'left' ? WORLD_GOLEM_ROTATION_URLS.left : WORLD_GOLEM_ROTATION_URLS.right
    const rotImg = requestCatalogPageImage(rotUrl) ?? requestCatalogPageImage(WORLD_GOLEM_ROTATION_URLS.down)
    return rotImg ? makeWorldGolemRotationSpec(rotImg, hdScale) : null
  }

  const southStompImg = requestCatalogPageImage(WORLD_GOLEM_STOMP_SOUTH_URLS[frameIdx])
  if (southStompImg) {
    return {
      image: southStompImg,
      sx: 0,
      sy: 0,
      sw: 112,
      sh: 112,
      flipX: false,
      hdScale,
      sheetId: `catalog_${WORLD_GOLEM_ID}`,
      anchorX: 0.5,
      anchorY: 1 - WORLD_GOLEM_FOOT_PAD_FRAC,
      boxW: WORLD_GOLEM_BOX_W,
      boxH: WORLD_GOLEM_BOX_H,
      subX: 0,
      subY: 0,
      subW: 1,
      subH: 1,
      footPadFrac: WORLD_GOLEM_FOOT_PAD_FRAC,
    }
  }

  const southFallbackImg = requestCatalogPageImage(WORLD_GOLEM_ROTATION_URLS.down)
  return southFallbackImg ? makeWorldGolemRotationSpec(southFallbackImg, hdScale) : null
}

export function refreshCatalogMonsterSprites(revision?: string): string {
  const nextRev = invalidateMonsterAssetCache(revision)
  pageImageCache.clear()
  preloadedBiomes.clear()
  return nextRev
}

export function hasCatalogMonsterAtlas(defId?: string | null): boolean {
  if (!defId) return false
  return defId === WORLD_GOLEM_ID || defId in CATALOG_MONSTERS
}

export function getCatalogMonsterAtlas(defId?: string | null): CatalogAtlasEntry | null {
  if (!defId) return null
  if (defId === WORLD_GOLEM_ID) return WORLD_GOLEM_ATLAS_ENTRY
  return CATALOG_MONSTERS[defId] ?? null
}

export function getCatalogMonsterFrameCount(defId: string, action: SpriteAction, dir: Dir = 'down'): number {
  if (defId === WORLD_GOLEM_ID) {
    if (action === 'attack' || action === 'skill') {
      return WORLD_GOLEM_ATTACK_COUNTS[dir] ?? 14
    }
    return WORLD_GOLEM_STOMP_COUNT
  }
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
  if (mapId === 'world') {
    preloadWorldGolemAssets()
  }
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
  if (defId === WORLD_GOLEM_ID) {
    return getWorldGolemFrameSpec(dir, action, frame, isBoss)
  }
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
