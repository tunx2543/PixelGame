import { ITEMS, JOBS, MONSTERS, normalizeJobId, type MonsterSprite } from './data'
import { currentMap, game, getStats } from './engine'
import {
  computeCameraZoom,
  createCameraState,
  isEntityOccludedByOverhead,
  stepSmoothCamera,
  type OverheadBounds,
} from './camera'
import { T, TILE, type MapDef, type PortalDirection, type PortalGateStyle } from './maps'
import {
  getCatalogMonsterAtlas,
  getCatalogMonsterFrameCount,
  preloadMapCatalogSprites,
  resolveCatalogMonsterWorldHeight,
} from './catalog-sprites'
import { getMonsterModelSpec, getPetModelSpec } from './models-2d'
import { LAYERED_PROP_TILES, TOWN_STRUCTURES } from './map-decor-meta'
import {
  type Dir,
  drawResolvedDrawable,
  jobHumanColors,
  mapObjectSprite,
  mountSprite,
  petSprite,
  resolveHumanDrawable,
  resolveMonsterDrawable,
  resolveNpcDrawable,
  type SpriteAction,
} from './sprites'
import { getActivePetBonuses, getCombatPetDef } from './systems'
import {
  getActiveMountBonuses,
  getMountDef,
  getMountRiderSeatOffset,
  getMountVisualTier,
  resolveMountAnimationState,
  type MountDef,
} from './mounts'
import { preloadAllHeroSheets, preloadMountSpriteSheet, preloadPetSpriteSheet } from './sprite-sheets'
import { resolvePetAnimationFrame } from './pet-follow'
import { TITLE_DEFS } from './rpg-systems'
import {
  GATHERING_NODES,
  getWorldTimePhase,
  isRainbowNameColor,
  resolveAnimatedRainbowHex,
  sanitizeExtV2,
  sanitizeNameColor,
} from './extended-systems'
import { globalCombatParticlePool, renderCombatParticlePool } from './combat-vfx-system'
import {
  drawOverworldProjectile,
  drawOverworldSkillEffect,
  drawRebirthAura,
  drawSpiritAwakeningAura,
} from './vfx-canvas'
import { getMenuIconCanvas, type MenuIconId } from './menu-icons'
import { computeWorldFloatTransform } from './floating-damage'
import {
  drawHeroDrawableWithFashion,
  preloadFashionLayers,
  resolveFashionLoadoutFromRemote,
  resolveFashionLoadoutFromSave,
} from './fashion-renderer'
import { getEffectiveVipBonuses, getVipTierDef } from './premium/vip'
import { sanitizePremiumState } from './premium/wallet'
import { getUiPreferences, type GraphicsQuality, type RenderEngine, type UiPreferences } from './ui-layout'
import { EQUIPMENT_RARITY_META, resolveEffectiveRarity } from './mmo-systems'
import { resolveItemVfxSpec } from './item-vfx'
import { resolveItemImagePath } from './items'
import { evaluateWorldBossMapFx, evaluateWorldBossWarning } from './world-boss-fx'

export const FAST_TILE = 32
const FAST_SCALE = FAST_TILE / TILE // 2x pixel-art crisp ground scale

export const FAST_THEME_BG: Record<string, string> = {
  town: '#2d5a27',
  meadow: '#2d5a27',
  vale: '#255228',
  woods: '#1d4423',
  forest: '#10291a',
  coast: '#1b6ca8',
  cave: '#0b0b16',
  desert: '#8f6b3e',
  graveyard: '#181a28',
  isles: '#2e6351',
  snow: '#b8d0e8',
  ruins: '#242230',
  volcano: '#140808',
  sky: '#72aee6',
  abyss: '#0c0814',
  world: '#2a1829',
  crystal: '#121029',
  frost: '#b8d0e8',
  dream: '#315743',
  colosseum: '#3c3228',
}

export class FastSpriteLruCache<T> {
  private map = new Map<string, T>()
  constructor(private readonly maxEntries: number) {}

  get(key: string): T | undefined {
    const val = this.map.get(key)
    if (val === undefined) return undefined
    this.map.delete(key)
    this.map.set(key, val)
    return val
  }

  set(key: string, value: T): void {
    if (this.map.has(key)) this.map.delete(key)
    this.map.set(key, value)
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value
      if (oldest === undefined) break
      this.map.delete(oldest)
    }
  }

  get size(): number {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
  }
}

export function resolveEffectiveRenderEngine(pref?: Partial<UiPreferences> | null): RenderEngine {
  return pref?.renderEngine === 'hd' ? 'hd' : 'fast'
}

export function computeFastCanvasDpr(
  windowDpr: number,
  quality: GraphicsQuality,
  resolutionScale: number,
  isCompact: boolean,
  renderEngine: RenderEngine,
  crispPixelScale: boolean,
): number {
  const rawDpr = Number.isFinite(windowDpr) && windowDpr > 0 ? windowDpr : 1
  const maxDpr =
    renderEngine === 'fast'
      ? crispPixelScale || quality === 'low'
        ? 1
        : quality === 'medium'
          ? 1.15
          : isCompact
            ? 1.25
            : 1.5
      : quality === 'low'
        ? 1
        : quality === 'medium'
          ? 1.25
          : isCompact
            ? 1.5
            : 2
  const scale = Number.isFinite(resolutionScale) && resolutionScale > 0 ? resolutionScale : 1
  return Math.round(Math.max(0.65, Math.min(rawDpr, maxDpr) * scale) * 100) / 100
}

export interface VisibleTileBounds {
  minTx: number
  maxTx: number
  minTy: number
  maxTy: number
}

export function computeVisibleTileBounds(
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  mapWidth: number,
  mapHeight: number,
  tileSize = TILE,
  padTiles = 2,
): VisibleTileBounds {
  return {
    minTx: Math.max(0, Math.floor(camX / tileSize) - padTiles),
    maxTx: Math.min(mapWidth - 1, Math.ceil((camX + viewW) / tileSize) + padTiles),
    minTy: Math.max(0, Math.floor(camY / tileSize) - padTiles),
    maxTy: Math.min(mapHeight - 1, Math.ceil((camY + viewH) / tileSize) + padTiles + 1),
  }
}

export function buildLabelCacheKey(
  text: string,
  color: string,
  pxSize: number,
  bold: boolean,
): string {
  return `${bold ? 1 : 0}|${pxSize}|${color}|${text}`
}

export interface StaticPropDescriptor {
  kind: 'tree' | 'pine' | 'bush' | 'rock' | 'crystal' | 'fence' | 'sign'
  tx: number
  ty: number
  variant: number
  sortY: number
  worldX: number
  worldY: number
  overheadZone?: OverheadBounds
}

export function buildStaticMapPropDescriptors(map: MapDef): StaticPropDescriptor[] {
  const out: StaticPropDescriptor[] = []
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      const tile = map.tiles[ty * map.width + tx]
      if (!LAYERED_PROP_TILES.has(tile) || tile === T.FOUNTAIN) continue
      const cx = (tx + 0.5) * TILE
      const baseY = (ty + 1) * TILE
      const variant = (tx * 7 + ty * 13) % 3
      if (tile === T.TREE) {
        out.push({
          kind: 'tree',
          tx,
          ty,
          variant,
          sortY: baseY - 1,
          worldX: cx,
          worldY: baseY,
          overheadZone: { x0: cx - 14, y0: baseY - 36, x1: cx + 14, y1: baseY - 8, baseY: baseY - 1 },
        })
      } else if (tile === T.PINE) {
        out.push({
          kind: 'pine',
          tx,
          ty,
          variant,
          sortY: baseY - 1,
          worldX: cx,
          worldY: baseY,
          overheadZone: { x0: cx - 12, y0: baseY - 36, x1: cx + 12, y1: baseY - 9, baseY: baseY - 1 },
        })
      } else if (tile === T.BUSH) {
        out.push({ kind: 'bush', tx, ty, variant, sortY: baseY - 2, worldX: cx, worldY: baseY })
      } else if (tile === T.ROCK) {
        out.push({ kind: 'rock', tx, ty, variant, sortY: baseY - 2, worldX: cx, worldY: baseY })
      } else if (tile === T.CRYSTAL) {
        out.push({ kind: 'crystal', tx, ty, variant, sortY: baseY - 2, worldX: cx, worldY: baseY })
      } else if (tile === T.FENCE) {
        out.push({ kind: 'fence', tx, ty, variant, sortY: baseY - 4, worldX: cx, worldY: baseY })
      } else if (tile === T.SIGN) {
        out.push({ kind: 'sign', tx, ty, variant, sortY: baseY - 3, worldX: cx, worldY: baseY })
      }
    }
  }
  return out
}

// ============================================================================
// Offscreen Stamp & Map Bake Caches (Browser-only, guarded for SSR / node:test)
// ============================================================================

const fastCameraState = createCameraState('town')
let fastPrevRenderTime = 0
let fastLastRenderCam = { mapId: 'town', x: 0, y: 0 }

export function getFastLastRenderCam() {
  return fastLastRenderCam
}

export function getFastCameraState() {
  return fastCameraState
}

const groundMapCache = new FastSpriteLruCache<HTMLCanvasElement>(12)
const staticPropLayoutCache = new FastSpriteLruCache<StaticPropDescriptor[]>(16)
interface PropStampEntry {
  lower: HTMLCanvasElement
  upper?: HTMLCanvasElement
  w: number
  h: number
  splitFrac: number
}

const propStampCache = new FastSpriteLruCache<PropStampEntry>(48)
const townStampCache = new FastSpriteLruCache<{
  lower: HTMLCanvasElement
  upper: HTMLCanvasElement
  dx: number
  dy: number
  dw: number
  dh: number
  splitRatio: number
  baseY: number
  overheadZone: OverheadBounds
}>(16)
const portalGateCache = new FastSpriteLruCache<HTMLCanvasElement>(8)
let wingGachaStampCanvas: HTMLCanvasElement | null = null
const labelSpriteCache = new FastSpriteLruCache<{
  canvas: HTMLCanvasElement
  cssW: number
  cssH: number
}>(320)
const vignetteCache = new FastSpriteLruCache<HTMLCanvasElement>(12)
const itemImgCache = new Map<string, HTMLImageElement>()

function getItemAssetImage(assetPath: string): HTMLImageElement | null {
  if (typeof Image === 'undefined' || !assetPath) return null
  let img = itemImgCache.get(assetPath)
  if (!img) {
    img = new Image()
    img.referrerPolicy = 'no-referrer'
    img.src = assetPath
    itemImgCache.set(assetPath, img)
  }
  return img.complete && img.naturalWidth > 0 ? img : null
}

function makeCanvas(w: number, h: number, smooth = false): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = smooth
  return { c, ctx }
}

function hashTile(tx: number, ty: number, salt = 0): number {
  let h = (tx * 374761393 + ty * 668265263 + salt * 1442695041) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

function underlyingTerrainForProp(map: MapDef, tx: number, ty: number): number {
  const t = map.tiles[ty * map.width + tx]
  if (!LAYERED_PROP_TILES.has(t)) return t
  if (map.theme === 'snow' || map.theme === 'frost') return T.SNOW
  if (map.theme === 'desert') return T.SAND
  if (map.theme === 'cave') return T.CAVEFLOOR
  if (map.theme === 'volcano') return T.VOLCFLOOR
  if (map.theme === 'abyss' || map.theme === 'graveyard') return T.DARKGRASS
  if (map.theme === 'ruins') return T.RUINS_FLOOR
  if (map.theme === 'dream') return T.SAKURA_GRASS
  return T.GRASS
}

function paintFastTile(
  ctx: CanvasRenderingContext2D,
  map: MapDef,
  tx: number,
  ty: number,
  rawTile: number,
  px: number,
  py: number,
): void {
  const S = FAST_TILE // 32
  const t = LAYERED_PROP_TILES.has(rawTile) ? underlyingTerrainForProp(map, tx, ty) : rawTile
  const h = hashTile(tx, ty, t)
  const v = h % 5

  // Helper for crisp pixel-art specks
  const px2 = (ox: number, oy: number, w: number, hh: number, col: string) => {
    ctx.fillStyle = col
    ctx.fillRect(px + ox, py + oy, w, hh)
  }

  switch (t) {
    case T.GRASS:
    case T.FLOWER: {
      const baseCols =
        map.theme === 'forest' || map.theme === 'woods'
          ? ['#295c32', '#2d6336', '#25542d', '#316a3a', '#2b5f34']
          : ['#488b3a', '#4f9340', '#438436', '#549944', '#4b8f3c']
      px2(0, 0, S, S, baseCols[v])
      px2((h % 20) + 4, ((h >> 4) % 20) + 4, 2, 4, '#64ab52')
      px2(((h >> 8) % 20) + 6, ((h >> 12) % 20) + 6, 2, 2, '#356b2a')
      if (t === T.FLOWER) {
        const flowerColors = ['#fde047', '#f472b6', '#ffffff', '#60a5fa']
        const fc = flowerColors[h % flowerColors.length]
        px2(7, 8, 4, 4, fc)
        px2(8, 9, 2, 2, '#fef08a')
        px2(19, 18, 4, 4, flowerColors[(h + 1) % flowerColors.length])
        px2(20, 19, 2, 2, '#fef08a')
        px2(11, 22, 3, 3, flowerColors[(h + 2) % flowerColors.length])
      }
      break
    }
    case T.DARKGRASS: {
      const cols = ['#234f2b', '#275630', '#1f4726', '#295b32', '#214b29']
      px2(0, 0, S, S, cols[v])
      px2((h % 18) + 4, ((h >> 5) % 18) + 4, 2, 4, '#367342')
      px2(((h >> 9) % 18) + 6, ((h >> 13) % 18) + 6, 3, 2, '#17381d')
      break
    }
    case T.SAKURA_GRASS: {
      const cols = ['#4f8c46', '#56944c', '#4a8541', '#5a9950', '#518f48']
      px2(0, 0, S, S, cols[v])
      px2((h % 22) + 3, ((h >> 4) % 22) + 3, 3, 2, '#fbcfe8')
      px2(((h >> 8) % 22) + 4, ((h >> 12) % 22) + 4, 2, 2, '#f472b6')
      break
    }
    case T.PATH: {
      const cols = ['#c29c6b', '#ba9464', '#c9a372', '#b38d5e', '#bf9968']
      px2(0, 0, S, S, cols[v])
      px2((h % 20) + 4, ((h >> 4) % 20) + 4, 4, 3, '#a27d50')
      px2(((h >> 8) % 20) + 6, ((h >> 12) % 20) + 6, 3, 2, '#d8b787')
      break
    }
    case T.PLAZA:
    case T.COBBLESTONE: {
      px2(0, 0, S, S, '#7d7870')
      // Crisp stone blocks (2x2 grid per 32px tile)
      const stoneA = t === T.PLAZA ? '#b8b0a2' : '#9c968b'
      const stoneB = t === T.PLAZA ? '#c8c0b2' : '#aba59a'
      const hi = t === T.PLAZA ? '#ddd6c7' : '#c0bab0'
      px2(1, 1, 14, 14, v % 2 ? stoneA : stoneB)
      px2(17, 1, 14, 14, v % 3 ? stoneB : stoneA)
      px2(1, 17, 14, 14, v % 3 ? stoneA : stoneB)
      px2(17, 17, 14, 14, v % 2 ? stoneB : stoneA)
      px2(2, 2, 11, 2, hi)
      px2(18, 2, 11, 2, hi)
      px2(2, 18, 11, 2, hi)
      px2(18, 18, 11, 2, hi)
      break
    }
    case T.GOLD_PAVING: {
      px2(0, 0, S, S, '#926c22')
      px2(1, 1, 14, 14, '#d4a638')
      px2(17, 1, 14, 14, '#c7992f')
      px2(1, 17, 14, 14, '#c7992f')
      px2(17, 17, 14, 14, '#d4a638')
      px2(2, 2, 12, 2, '#f5d470')
      px2(18, 18, 12, 2, '#f5d470')
      break
    }
    case T.WOOD_FLOOR: {
      px2(0, 0, S, S, '#8c5a32')
      px2(0, 7, S, 1, '#59371d')
      px2(0, 15, S, 1, '#59371d')
      px2(0, 23, S, 1, '#59371d')
      px2(0, 31, S, 1, '#59371d')
      px2(10, 0, 1, 8, '#59371d')
      px2(22, 8, 1, 8, '#59371d')
      px2(14, 16, 1, 8, '#59371d')
      px2(6, 24, 1, 8, '#59371d')
      px2(2, 2, 6, 2, '#a87043')
      break
    }
    case T.CARPET: {
      px2(0, 0, S, S, '#9b2234')
      px2(2, 2, S - 4, S - 4, '#b82a40')
      px2(4, 4, S - 8, 2, '#f5c441')
      px2(4, S - 6, S - 8, 2, '#f5c441')
      break
    }
    case T.WATER: {
      const cols = ['#1e68a8', '#2272b5', '#1b609c', '#2579bd', '#1f6cac']
      px2(0, 0, S, S, cols[v])
      px2(4 + (h % 10), 8, 9, 2, '#60b5f7')
      px2(10 + (h % 8), 22, 8, 2, '#4ba3e8')
      // Crisp shoreline edges
      const up = ty > 0 ? map.tiles[(ty - 1) * map.width + tx] : t
      const dn = ty < map.height - 1 ? map.tiles[(ty + 1) * map.width + tx] : t
      const lf = tx > 0 ? map.tiles[ty * map.width + tx - 1] : t
      const rt = tx < map.width - 1 ? map.tiles[ty * map.width + tx + 1] : t
      if (up !== T.WATER && up !== T.BRIDGE_H && up !== T.BRIDGE_V) {
        px2(0, 0, S, 4, map.theme === 'town' ? '#8c8073' : '#124675')
        px2(0, 4, S, 2, '#7dd3fc')
      }
      if (dn !== T.WATER && dn !== T.BRIDGE_H && dn !== T.BRIDGE_V) {
        px2(0, S - 3, S, 3, '#7dd3fc')
      }
      if (lf !== T.WATER && lf !== T.BRIDGE_H && lf !== T.BRIDGE_V) {
        px2(0, 0, 3, S, '#124675')
      }
      if (rt !== T.WATER && rt !== T.BRIDGE_H && rt !== T.BRIDGE_V) {
        px2(S - 3, 0, 3, S, '#124675')
      }
      break
    }
    case T.BRIDGE_H:
    case T.BRIDGE_V: {
      px2(0, 0, S, S, '#1b609c')
      if (t === T.BRIDGE_H) {
        px2(0, 2, S, S - 4, '#8d5b34')
        for (let bx = 0; bx < S; bx += 6) {
          px2(bx, 3, 5, S - 6, bx % 12 === 0 ? '#a97246' : '#99653d')
        }
        px2(0, 2, S, 3, '#5c3a1e')
        px2(0, S - 5, S, 3, '#5c3a1e')
      } else {
        px2(2, 0, S - 4, S, '#8d5b34')
        for (let by = 0; by < S; by += 6) {
          px2(3, by, S - 6, 5, by % 12 === 0 ? '#a97246' : '#99653d')
        }
        px2(2, 0, 3, S, '#5c3a1e')
        px2(S - 5, 0, 3, S, '#5c3a1e')
      }
      break
    }
    case T.LAVA: {
      px2(0, 0, S, S, '#b8290b')
      px2(3, 4, 12, 8, '#ea580c')
      px2(15, 16, 12, 9, '#f97316')
      px2(7, 8, 6, 3, '#fde047')
      px2(19, 20, 5, 3, '#facc15')
      break
    }
    case T.SAND: {
      const cols = ['#d8b878', '#d2b272', '#dfc080', '#ceb06e', '#d6b676']
      px2(0, 0, S, S, cols[v])
      px2((h % 18) + 4, ((h >> 4) % 18) + 4, 5, 2, '#c29f5e')
      px2(((h >> 8) % 18) + 6, ((h >> 12) % 18) + 6, 3, 2, '#ead098')
      break
    }
    case T.CAVEFLOOR:
    case T.VOLCFLOOR: {
      const base = t === T.VOLCFLOOR ? '#2c181a' : '#28263b'
      const speck = t === T.VOLCFLOOR ? '#422224' : '#393652'
      px2(0, 0, S, S, base)
      px2((h % 18) + 4, ((h >> 4) % 18) + 4, 6, 4, speck)
      px2(((h >> 8) % 18) + 5, ((h >> 12) % 18) + 5, 4, 2, t === T.VOLCFLOOR ? '#7c2d12' : '#1b1a2a')
      break
    }
    case T.CAVEWALL:
    case T.CASTLE_WALL:
    case T.WALL: {
      const top = t === T.CAVEWALL ? '#4a4766' : t === T.CASTLE_WALL ? '#7d8597' : '#e6d7bd'
      const body = t === T.CAVEWALL ? '#32304a' : t === T.CASTLE_WALL ? '#545b6b' : '#c9b79c'
      const rim = t === T.CAVEWALL ? '#1f1e30' : t === T.CASTLE_WALL ? '#2f3542' : '#85745d'
      px2(0, 0, S, 10, top)
      px2(0, 10, S, S - 10, body)
      px2(0, S - 3, S, 3, rim)
      px2(15, 10, 2, S - 13, rim)
      break
    }
    case T.WINDOW:
    case T.DOOR:
    case T.ROOF_RED:
    case T.ROOF_BLUE:
    case T.ROOF_PURPLE:
    case T.ROOF_GREEN: {
      // Town buildings are overlaid by crisp multi-layer TOWN_STRUCTURES; paint tidy cobblestone foundation
      px2(0, 0, S, S, '#9a9286')
      px2(2, 2, S - 4, S - 4, '#827a6f')
      break
    }
    case T.SNOW: {
      const cols = ['#e6f1fa', '#dcebf7', '#edf5fc', '#d5e6f5', '#e2eff9']
      px2(0, 0, S, S, cols[v])
      px2((h % 18) + 4, ((h >> 4) % 18) + 4, 4, 2, '#bfd9ef')
      break
    }
    case T.ICE: {
      px2(0, 0, S, S, '#8ecae6')
      px2(2, 2, 18, 3, '#caf0f8')
      px2(10, 18, 16, 2, '#e0fbfc')
      break
    }
    case T.SKY_TILE: {
      px2(0, 0, S, S, '#b8dbf7')
      px2(1, 1, S - 2, S - 2, '#d6ecfc')
      px2(3, 3, S - 6, 3, '#ffffff')
      break
    }
    case T.CLOUD_VOID: {
      px2(0, 0, S, S, '#5fa3db')
      px2(4, 10, 20, 10, '#89c4f4')
      px2(8, 6, 16, 8, '#cbe7ff')
      break
    }
    case T.RUINS_FLOOR: {
      px2(0, 0, S, S, '#504e60')
      px2(2, 2, 13, 13, '#636075')
      px2(17, 2, 13, 13, '#59566a')
      px2(2, 17, 13, 13, '#59566a')
      px2(17, 17, 13, 13, '#636075')
      px2(6, 10, 4, 2, '#3d704a') // moss accent
      break
    }
    case T.MAGIC_CIRCLE: {
      px2(0, 0, S, S, '#37324d')
      ctx.strokeStyle = '#a855f7'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(px + S / 2, py + S / 2, 11, 0, Math.PI * 2)
      ctx.stroke()
      px2(14, 14, 4, 4, '#e9d5ff')
      break
    }
    case T.MUSHROOMS: {
      px2(0, 0, S, S, '#2b5f34')
      px2(7, 18, 4, 6, '#f8fafc')
      px2(5, 13, 8, 6, '#e11d48')
      px2(7, 14, 2, 2, '#ffffff')
      px2(20, 12, 3, 5, '#f8fafc')
      px2(18, 8, 7, 5, '#f59e0b')
      break
    }
    case T.BONES: {
      px2(0, 0, S, S, map.theme === 'graveyard' ? '#24293d' : '#8a6b48')
      px2(8, 12, 14, 3, '#e2e8f0')
      px2(7, 11, 3, 5, '#f8fafc')
      px2(20, 11, 3, 5, '#f8fafc')
      px2(16, 20, 6, 5, '#cbd5e1')
      break
    }
    default: {
      px2(0, 0, S, S, '#488b3a')
      break
    }
  }

  // Soft wall north drop shadow
  if (t !== T.CASTLE_WALL && t !== T.CAVEWALL && ty > 0) {
    const north = map.tiles[(ty - 1) * map.width + tx]
    if (north === T.CASTLE_WALL || north === T.CAVEWALL) {
      px2(0, 0, S, 8, 'rgba(10, 8, 18, 0.35)')
    }
  }
}

function getFastGroundCanvas(map: MapDef): HTMLCanvasElement {
  const existing = groundMapCache.get(map.id)
  if (existing) return existing

  const { c, ctx } = makeCanvas(map.width * FAST_TILE, map.height * FAST_TILE, false)
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      const tile = map.tiles[ty * map.width + tx]
      paintFastTile(ctx, map, tx, ty, tile, tx * FAST_TILE, ty * FAST_TILE)
    }
  }
  groundMapCache.set(map.id, c)
  return c
}

function getPropStamp(kind: StaticPropDescriptor['kind'], variant: number, theme: string): PropStampEntry {
  const paletteKey =
    theme === 'snow' || theme === 'frost'
      ? 'snow'
      : theme === 'dream'
        ? 'sakura'
        : theme === 'forest' || theme === 'abyss'
          ? 'dark'
          : 'normal'
  const key = `${kind}|${variant}|${paletteKey}`
  const existing = propStampCache.get(key)
  if (existing) return existing

  const S = 2 // bake at 2x resolution
  if (kind === 'tree') {
    const w = 34
    const h = 42
    const splitFrac = 0.62
    const splitPx = Math.round(h * S * splitFrac)
    const full = makeCanvas(w * S, h * S, false)
    const c = full.ctx
    c.scale(S, S)
    // Shadow
    c.fillStyle = 'rgba(10, 14, 18, 0.25)'
    c.beginPath()
    c.ellipse(17, 39, 10, 4, 0, 0, Math.PI * 2)
    c.fill()
    // Trunk
    c.fillStyle = '#5c3a21'
    c.fillRect(14, 24, 6, 15)
    c.fillStyle = '#7c5130'
    c.fillRect(15, 25, 2, 13)
    // Canopy
    const leafDark = paletteKey === 'sakura' ? '#be185d' : paletteKey === 'snow' ? '#2c5d4c' : paletteKey === 'dark' ? '#143d26' : '#1e5b2b'
    const leafMid = paletteKey === 'sakura' ? '#f472b6' : paletteKey === 'snow' ? '#3d7b66' : paletteKey === 'dark' ? '#1e5938' : '#2d7a3a'
    const leafHi = paletteKey === 'sakura' ? '#fbcfe8' : paletteKey === 'snow' ? '#e6f4fa' : paletteKey === 'dark' ? '#347d50' : '#4fa653'
    c.fillStyle = leafDark
    c.beginPath()
    c.arc(17, 17, 13, 0, Math.PI * 2)
    c.arc(10, 19, 8, 0, Math.PI * 2)
    c.arc(24, 19, 8, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = leafMid
    c.beginPath()
    c.arc(17, 15, 11, 0, Math.PI * 2)
    c.arc(11, 17, 6.5, 0, Math.PI * 2)
    c.arc(23, 17, 6.5, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = leafHi
    c.beginPath()
    c.arc(15, 10, 6, 0, Math.PI * 2)
    c.arc(21, 12, 4, 0, Math.PI * 2)
    c.fill()

    const lower = makeCanvas(w * S, h * S - splitPx, false)
    lower.ctx.drawImage(full.c, 0, splitPx, w * S, h * S - splitPx, 0, 0, w * S, h * S - splitPx)
    const upper = makeCanvas(w * S, splitPx, false)
    upper.ctx.drawImage(full.c, 0, 0, w * S, splitPx, 0, 0, w * S, splitPx)
    const entry = { lower: lower.c, upper: upper.c, w, h, splitFrac }
    propStampCache.set(key, entry)
    return entry
  }

  if (kind === 'pine') {
    const w = 28
    const h = 42
    const splitFrac = 0.64
    const splitPx = Math.round(h * S * splitFrac)
    const full = makeCanvas(w * S, h * S, false)
    const c = full.ctx
    c.scale(S, S)
    c.fillStyle = 'rgba(10,14,18,0.24)'
    c.beginPath()
    c.ellipse(14, 39, 8, 3.5, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#52341e'
    c.fillRect(12, 29, 4, 10)
    const dCol = paletteKey === 'snow' ? '#255248' : '#17442d'
    const mCol = paletteKey === 'snow' ? '#367063' : '#21613f'
    const hiCol = paletteKey === 'snow' ? '#eef8ff' : '#368757'
    for (let tier = 0; tier < 3; tier++) {
      const yTop = 4 + tier * 7
      const half = 6 + tier * 3.2
      c.fillStyle = dCol
      c.beginPath()
      c.moveTo(14, yTop)
      c.lineTo(14 - half, yTop + 12)
      c.lineTo(14 + half, yTop + 12)
      c.closePath()
      c.fill()
      c.fillStyle = mCol
      c.beginPath()
      c.moveTo(14, yTop + 1)
      c.lineTo(14 - half + 2, yTop + 10)
      c.lineTo(14 + half - 2, yTop + 10)
      c.closePath()
      c.fill()
      c.fillStyle = hiCol
      c.fillRect(12, yTop + 2, 4, 2)
    }
    const lower = makeCanvas(w * S, h * S - splitPx, false)
    lower.ctx.drawImage(full.c, 0, splitPx, w * S, h * S - splitPx, 0, 0, w * S, h * S - splitPx)
    const upper = makeCanvas(w * S, splitPx, false)
    upper.ctx.drawImage(full.c, 0, 0, w * S, splitPx, 0, 0, w * S, splitPx)
    const entry = { lower: lower.c, upper: upper.c, w, h, splitFrac }
    propStampCache.set(key, entry)
    return entry
  }

  if (kind === 'bush') {
    const w = 20
    const h = 18
    const made = makeCanvas(w * S, h * S, false)
    const c = made.ctx
    c.scale(S, S)
    c.fillStyle = 'rgba(0,0,0,0.2)'
    c.beginPath()
    c.ellipse(10, 16, 7, 2.5, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = paletteKey === 'dark' ? '#17472a' : '#246633'
    c.beginPath()
    c.arc(10, 10, 6.5, 0, Math.PI * 2)
    c.arc(6, 12, 4.5, 0, Math.PI * 2)
    c.arc(14, 12, 4.5, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = paletteKey === 'dark' ? '#256b40' : '#388e47'
    c.beginPath()
    c.arc(10, 8.5, 4.5, 0, Math.PI * 2)
    c.fill()
    if (variant === 0) {
      c.fillStyle = '#f472b6'
      c.fillRect(7, 8, 2, 2)
      c.fillRect(12, 10, 2, 2)
    }
    const entry = { lower: made.c, w, h, splitFrac: 0 }
    propStampCache.set(key, entry)
    return entry
  }

  if (kind === 'rock') {
    const w = 20
    const h = 18
    const made = makeCanvas(w * S, h * S, false)
    const c = made.ctx
    c.scale(S, S)
    c.fillStyle = 'rgba(0,0,0,0.24)'
    c.beginPath()
    c.ellipse(10, 16, 7.5, 2.6, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#475569'
    c.beginPath()
    c.moveTo(4, 15)
    c.lineTo(5, 8)
    c.lineTo(10, 5)
    c.lineTo(16, 8)
    c.lineTo(17, 15)
    c.closePath()
    c.fill()
    c.fillStyle = '#64748b'
    c.beginPath()
    c.moveTo(6, 13)
    c.lineTo(7, 8)
    c.lineTo(11, 6)
    c.lineTo(14, 9)
    c.lineTo(12, 13)
    c.closePath()
    c.fill()
    c.fillStyle = '#94a3b8'
    c.fillRect(8, 7, 3, 2)
    const entry = { lower: made.c, w, h, splitFrac: 0 }
    propStampCache.set(key, entry)
    return entry
  }

  if (kind === 'crystal') {
    const w = 20
    const h = 24
    const made = makeCanvas(w * S, h * S, false)
    const c = made.ctx
    c.scale(S, S)
    c.fillStyle = 'rgba(56, 189, 248, 0.28)'
    c.beginPath()
    c.ellipse(10, 21, 7, 3, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = variant === 1 ? '#a855f7' : '#0ea5e9'
    c.beginPath()
    c.moveTo(10, 3)
    c.lineTo(15, 11)
    c.lineTo(13, 21)
    c.lineTo(7, 21)
    c.lineTo(5, 11)
    c.closePath()
    c.fill()
    c.fillStyle = variant === 1 ? '#e9d5ff' : '#bae6fd'
    c.beginPath()
    c.moveTo(10, 4)
    c.lineTo(12, 11)
    c.lineTo(10, 19)
    c.lineTo(8, 11)
    c.closePath()
    c.fill()
    const entry = { lower: made.c, w, h, splitFrac: 0 }
    propStampCache.set(key, entry)
    return entry
  }

  if (kind === 'fence') {
    const w = 16
    const h = 16
    const made = makeCanvas(w * S, h * S, false)
    const c = made.ctx
    c.scale(S, S)
    c.fillStyle = '#5c3a21'
    c.fillRect(2, 4, 3, 11)
    c.fillRect(11, 4, 3, 11)
    c.fillStyle = '#8b5a34'
    c.fillRect(0, 6, 16, 2.5)
    c.fillRect(0, 11, 16, 2.5)
    c.fillStyle = '#a87043'
    c.fillRect(2, 4, 3, 2)
    c.fillRect(11, 4, 3, 2)
    const entry = { lower: made.c, w, h, splitFrac: 0 }
    propStampCache.set(key, entry)
    return entry
  }

  // Sign
  const w = 16
  const h = 18
  const made = makeCanvas(w * S, h * S, false)
  const c = made.ctx
  c.scale(S, S)
  c.fillStyle = '#5c3a21'
  c.fillRect(7, 10, 2, 7)
  c.fillStyle = '#a87043'
  c.fillRect(2, 3, 12, 8)
  c.strokeStyle = '#4a2e1b'
  c.lineWidth = 1
  c.strokeRect(2.5, 3.5, 11, 7)
  c.fillStyle = '#fde68a'
  c.fillRect(4, 5, 8, 1)
  c.fillRect(4, 7.5, 6, 1)
  const entry = { lower: made.c, w, h, splitFrac: 0 }
  propStampCache.set(key, entry)
  return entry
}

function getTownStructureStamp(spec: (typeof TOWN_STRUCTURES)[number]) {
  const existing = townStampCache.get(spec.id)
  if (existing) return existing

  const S = 2
  const cx = (spec.tx + spec.tw / 2) * TILE
  const baseY = (spec.ty + spec.th) * TILE
  let dw = spec.tw * TILE
  let dh = spec.th * TILE
  if (spec.kind === 'building') {
    dw = spec.tw * TILE + 8
    dh = spec.th * TILE + 26
  } else if (spec.kind === 'watchtower') {
    dw = spec.tw * TILE + 6
    dh = spec.th * TILE + 22
  } else {
    dw = 56
    dh = 46
  }
  const dx = cx - dw / 2
  const dy = baseY - dh + 4
  const splitRatio = spec.overheadSplitRatio

  const full = makeCanvas(dw * S, dh * S, false)
  const c = full.ctx
  c.scale(S, S)

  if (spec.kind === 'fountain') {
    const lx = dw / 2
    const ly = dh - 14
    c.fillStyle = 'rgba(0,0,0,0.22)'
    c.beginPath()
    c.ellipse(lx, ly + 3, 24, 11, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#64748b'
    c.beginPath()
    c.ellipse(lx, ly, 22, 10, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#cbd5e1'
    c.beginPath()
    c.ellipse(lx, ly - 1.5, 21, 9, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#0ea5e9'
    c.beginPath()
    c.ellipse(lx, ly - 1.5, 17, 7, 0, 0, Math.PI * 2)
    c.fill()
    // Center pedestal + angel spire
    c.fillStyle = '#94a3b8'
    c.fillRect(lx - 4, ly - 22, 8, 20)
    c.fillStyle = '#e2e8f0'
    c.beginPath()
    c.ellipse(lx, ly - 13, 9, 3.5, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#f8fafc'
    c.fillRect(lx - 3, ly - 30, 6, 9)
    c.fillStyle = '#bae6fd'
    c.fillRect(lx - 8, ly - 28, 5, 4)
    c.fillRect(lx + 3, ly - 28, 5, 4)
  } else if (spec.kind === 'watchtower') {
    const splitY = dh * splitRatio
    // Stone tower lower
    c.fillStyle = '#64748b'
    c.fillRect(5, splitY - 4, dw - 10, dh - splitY + 2)
    c.fillStyle = '#94a3b8'
    c.fillRect(7, splitY - 2, dw - 16, dh - splitY - 2)
    c.strokeStyle = '#1e293b'
    c.lineWidth = 1.5
    c.strokeRect(5, splitY - 4, dw - 10, dh - splitY + 2)
    c.fillStyle = '#78350f'
    c.fillRect(dw * 0.36, dh - 17, dw * 0.28, 15)
    c.fillStyle = '#fbbf24'
    c.fillRect(dw * 0.44, splitY + 6, dw * 0.12, 6)
    // Spire roof upper
    c.fillStyle = '#1d4ed8'
    c.beginPath()
    c.moveTo(1, splitY + 2)
    c.lineTo(dw * 0.5, 2)
    c.lineTo(dw - 1, splitY + 2)
    c.closePath()
    c.fill()
    c.strokeStyle = '#1e293b'
    c.stroke()
    c.fillStyle = '#3b82f6'
    c.beginPath()
    c.moveTo(6, splitY)
    c.lineTo(dw * 0.5, 6)
    c.lineTo(dw * 0.65, splitY)
    c.closePath()
    c.fill()
    c.fillStyle = '#fbbf24'
    c.fillRect(dw * 0.5 - 2, 0, 4, 4)
  } else {
    const splitY = dh * splitRatio
    const roofCol =
      spec.id === 'town_guild_inn'
        ? '#b91c1c'
        : spec.id === 'town_blacksmith'
          ? '#1d4ed8'
          : spec.id === 'town_job_hall'
            ? '#6d28d9'
            : '#047857'
    const roofHi =
      spec.id === 'town_guild_inn'
        ? '#dc2626'
        : spec.id === 'town_blacksmith'
          ? '#2563eb'
          : spec.id === 'town_job_hall'
            ? '#7c3aed'
            : '#059669'

    // Walls + stone foundation + ground drop shadow
    c.fillStyle = 'rgba(10, 14, 18, 0.22)'
    c.fillRect(4, dh - 4, dw - 8, 4)
    c.fillStyle = '#efe0c3'
    c.fillRect(6, splitY - 2, dw - 12, dh - splitY)
    c.fillStyle = '#d6c19e'
    c.fillRect(dw - 18, splitY - 2, 12, dh - splitY)
    c.fillStyle = '#94a3b8'
    c.fillRect(6, dh - 6, dw - 12, 4)
    c.strokeStyle = '#2d1c15'
    c.lineWidth = 1.6
    c.strokeRect(6, splitY - 2, dw - 12, dh - splitY)
    // Timber pillars
    c.fillStyle = '#6b4226'
    c.fillRect(6, splitY - 2, 5, dh - splitY)
    c.fillRect(dw - 11, splitY - 2, 5, dh - splitY)
    c.fillRect(6, splitY + (dh - splitY) * 0.42, dw - 12, 3)
    // Door with warm arch trim
    c.fillStyle = '#7c4a28'
    c.fillRect(dw * 0.43, dh - 20, dw * 0.14, 18)
    c.fillStyle = '#fbbf24'
    c.fillRect(dw * 0.45, dh - 12, 2, 2)
    c.strokeRect(dw * 0.43, dh - 20, dw * 0.14, 18)
    // Warm windows with mullion crossbars
    c.fillStyle = '#fde68a'
    c.fillRect(dw * 0.18, splitY + 12, 14, 11)
    c.fillRect(dw * 0.72, splitY + 12, 14, 11)
    c.fillStyle = '#6b4226'
    c.fillRect(dw * 0.18 + 6, splitY + 12, 2, 11)
    c.fillRect(dw * 0.18, splitY + 17, 14, 2)
    c.fillRect(dw * 0.72 + 6, splitY + 12, 2, 11)
    c.fillRect(dw * 0.72, splitY + 17, 14, 2)
    c.strokeRect(dw * 0.18, splitY + 12, 14, 11)
    c.strokeRect(dw * 0.72, splitY + 12, 14, 11)

    // Pitched Roof with subtle shingle bands
    c.fillStyle = roofCol
    c.beginPath()
    c.moveTo(0, splitY + 4)
    c.lineTo(14, 4)
    c.lineTo(dw - 14, 4)
    c.lineTo(dw, splitY + 4)
    c.closePath()
    c.fill()
    c.stroke()
    c.fillStyle = roofHi
    c.fillRect(14, 6, dw - 28, splitY * 0.48)
    c.fillStyle = 'rgba(0,0,0,0.14)'
    c.fillRect(8, splitY * 0.56, dw - 16, 2)
    c.fillRect(4, splitY * 0.78, dw - 8, 2)
    // Roof ridge trim
    c.fillStyle = '#fbbf24'
    c.fillRect(14, 3, dw - 28, 3)
  }

  const splitPx = Math.round(dh * S * splitRatio)
  const lower = makeCanvas(dw * S, dh * S - splitPx, false)
  lower.ctx.drawImage(full.c, 0, splitPx, dw * S, dh * S - splitPx, 0, 0, dw * S, dh * S - splitPx)
  const upper = makeCanvas(dw * S, splitPx, false)
  upper.ctx.drawImage(full.c, 0, 0, dw * S, splitPx, 0, 0, dw * S, splitPx)

  const out = {
    lower: lower.c,
    upper: upper.c,
    dx,
    dy,
    dw,
    dh,
    splitRatio,
    baseY: baseY - 2,
    overheadZone: {
      x0: dx + 4,
      y0: dy,
      x1: dx + dw - 4,
      y1: dy + dh * splitRatio + 6,
      baseY: baseY - 2,
    },
  }
  townStampCache.set(spec.id, out)
  return out
}

function getPortalGateStamp(gate: PortalGateStyle): HTMLCanvasElement {
  const existing = portalGateCache.get(gate)
  if (existing) return existing
  const S = 2
  const w = 36
  const h = 36
  const { c, ctx } = makeCanvas(w * S, h * S, false)
  ctx.scale(S, S)
  if (gate === 'townArchway') {
    ctx.fillStyle = '#64748b'
    ctx.fillRect(4, 10, 7, 24)
    ctx.fillRect(25, 10, 7, 24)
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(2, 6, 32, 7)
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(4, 4, 28, 3)
    ctx.fillStyle = 'rgba(125, 211, 252, 0.5)'
    ctx.fillRect(11, 13, 14, 20)
  } else if (gate === 'crystalShrine') {
    ctx.fillStyle = '#4c1d95'
    ctx.fillRect(6, 12, 6, 22)
    ctx.fillRect(24, 12, 6, 22)
    ctx.fillStyle = '#a855f7'
    ctx.beginPath()
    ctx.moveTo(18, 2)
    ctx.lineTo(29, 13)
    ctx.lineTo(7, 13)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(196, 181, 253, 0.45)'
    ctx.fillRect(12, 13, 12, 20)
  } else {
    ctx.fillStyle = '#78350f'
    ctx.fillRect(6, 10, 5, 24)
    ctx.fillRect(25, 10, 5, 24)
    ctx.fillStyle = '#92400e'
    ctx.fillRect(4, 7, 28, 5)
    ctx.fillStyle = '#fde68a'
    ctx.fillRect(5, 13, 3, 3)
    ctx.fillRect(28, 13, 3, 3)
  }
  portalGateCache.set(gate, c)
  return c
}

function getWingGachaStamp(): HTMLCanvasElement {
  if (wingGachaStampCanvas) return wingGachaStampCanvas
  const S = 2
  const w = 22
  const h = 36
  const { c, ctx } = makeCanvas(w * S, h * S, false)
  ctx.scale(S, S)
  const cx = 11
  // Pedestal
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(cx - 9, 31, 18, 4)
  ctx.fillStyle = '#d97706'
  ctx.fillRect(cx - 8, 30, 16, 2)
  // Lower cabinet housing
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(cx - 7, 20, 14, 10)
  ctx.fillStyle = '#0284c7'
  ctx.fillRect(cx - 6, 21, 12, 8)
  ctx.fillStyle = '#fde047'
  ctx.fillRect(cx + 2, 23, 2, 3)
  ctx.fillStyle = '#020617'
  ctx.fillRect(cx - 4, 25, 5, 3)
  // Crystal capsule dome
  ctx.fillStyle = '#164e63'
  ctx.fillRect(cx - 8, 7, 16, 13)
  ctx.fillStyle = '#22d3ee'
  ctx.fillRect(cx - 7, 8, 14, 11)
  ctx.fillStyle = '#0891b2'
  ctx.fillRect(cx - 6, 9, 12, 9)
  // Miniature golden-pink wings inside dome
  ctx.fillStyle = '#fde047'
  ctx.fillRect(cx - 5, 11, 3, 3)
  ctx.fillRect(cx + 2, 11, 3, 3)
  ctx.fillStyle = '#f472b6'
  ctx.fillRect(cx - 2, 13, 4, 3)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillRect(cx - 6, 9, 2, 6)
  // Golden crown cap
  ctx.fillStyle = '#f59e0b'
  ctx.fillRect(cx - 6, 4, 12, 3)
  ctx.fillStyle = '#fde047'
  ctx.fillRect(cx - 9, 2, 3, 3)
  ctx.fillRect(cx + 6, 2, 3, 3)
  ctx.fillRect(cx - 2, 1, 4, 3)
  wingGachaStampCanvas = c
  return c
}

function drawCachedLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size: number,
  dpr: number,
  zoom: number,
  font: string,
  bold = false,
): void {
  const pxSize = Math.max(9, Math.round(size * dpr * (zoom / 3) * 1.18))
  const key = buildLabelCacheKey(text, color, pxSize, bold)
  let entry = labelSpriteCache.get(key)
  if (!entry) {
    const padX = Math.max(4, Math.round(pxSize * 0.35))
    const padY = Math.max(3, Math.round(pxSize * 0.25))
    const probe = makeCanvas(4, 4, false)
    const pctx = probe.ctx
    const fontStr = `${bold ? 'bold ' : ''}${pxSize}px ${font}`
    pctx.font = fontStr
    const metrics = pctx.measureText(text)
    const cw = Math.max(8, Math.ceil(metrics.width) + padX * 2)
    const ch = Math.max(10, Math.ceil(pxSize * 1.35) + padY * 2)
    const made = makeCanvas(cw, ch, false)
    const lctx = made.ctx
    lctx.font = fontStr
    lctx.textAlign = 'center'
    lctx.textBaseline = 'middle'
    lctx.lineWidth = Math.max(2, Math.round(pxSize * 0.22))
    lctx.strokeStyle = 'rgba(10,8,20,0.92)'
    lctx.lineJoin = 'round'
    lctx.strokeText(text, cw / 2, ch / 2)
    lctx.fillStyle = color
    lctx.fillText(text, cw / 2, ch / 2)
    entry = { canvas: made.c, cssW: cw, cssH: ch }
    labelSpriteCache.set(key, entry)
  }
  ctx.drawImage(entry.canvas, Math.round(x - entry.cssW / 2), Math.round(y - entry.cssH / 2))
}

function getCachedVignette(cw: number, ch: number, theme: string, dark: string, innerRatio: number, outerRatio: number): HTMLCanvasElement {
  const bucketW = Math.max(64, Math.round(cw / 16) * 16)
  const bucketH = Math.max(64, Math.round(ch / 16) * 16)
  const key = `${theme}|${bucketW}x${bucketH}`
  const existing = vignetteCache.get(key)
  if (existing) return existing

  const { c, ctx } = makeCanvas(bucketW, bucketH, true)
  const cx = bucketW * 0.5
  const cy = bucketH * 0.5
  const base = Math.min(bucketW, bucketH)
  const g = ctx.createRadialGradient(cx, cy, base * innerRatio, cx, cy, base * outerRatio)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, dark)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, bucketW, bucketH)
  vignetteCache.set(key, c)
  return c
}

// ============================================================================
// Shared Entity & Weapon Helpers
// ============================================================================

function drawMountForegroundSaddleStrap(
  ctx: CanvasRenderingContext2D,
  seatX: number,
  seatY: number,
  dir: Dir,
  def: MountDef,
  level = 1,
) {
  const tier = getMountVisualTier(level)
  const trimCol = tier >= 5 ? '#fef08a' : tier >= 3 ? '#fbbf24' : def.colors.accent
  ctx.fillStyle = def.colors.saddle
  if (dir === 'up') {
    ctx.fillRect(seatX - 4.5, seatY - 3, 9, 3.8)
    ctx.fillStyle = trimCol
    ctx.fillRect(seatX - 3.5, seatY - 2.6, 7, 1)
  } else if (dir === 'down') {
    ctx.fillRect(seatX - 4, seatY - 2.4, 8, 3)
    ctx.fillStyle = trimCol
    ctx.fillRect(seatX - 2, seatY - 2, 4, 1.2)
  } else {
    const flapX = dir === 'right' ? seatX - 3.2 : seatX - 4.8
    ctx.fillRect(flapX, seatY - 3, 8, 4)
    ctx.fillStyle = trimCol
    ctx.fillRect(flapX + 1, seatY - 2.6, 6, 1)
  }
}

function drawWeaponOverlayFast(
  ctx: CanvasRenderingContext2D,
  dir: string,
  weaponType: string,
  progress: number,
  color: string,
) {
  const angleMap: Record<string, number> = {
    right: 0,
    down: Math.PI / 2,
    left: Math.PI,
    up: -Math.PI / 2,
  }
  const baseAngle = angleMap[dir] ?? Math.PI / 2
  const fade = Math.max(0, 1 - progress * 0.85)
  ctx.save()
  ctx.globalAlpha *= fade
  if (weaponType === 'staff') {
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(Math.cos(baseAngle) * 8, -12 + Math.sin(baseAngle) * 6, (7 + progress * 8) * 0.55, 0, Math.PI * 2)
    ctx.stroke()
  } else if (weaponType === 'bow') {
    const dist = 8 + progress * 10
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(Math.cos(baseAngle) * (dist - 4), -11 + Math.sin(baseAngle) * (dist - 4))
    ctx.lineTo(Math.cos(baseAngle) * (dist + 5), -11 + Math.sin(baseAngle) * (dist + 5))
    ctx.stroke()
  } else {
    const cx = Math.cos(baseAngle) * 7
    const cy = -10 + Math.sin(baseAngle) * 5
    ctx.strokeStyle = color
    ctx.lineWidth = 2.1
    ctx.beginPath()
    ctx.arc(cx, cy, 11.5, baseAngle - 1.0 + progress * 0.5, baseAngle + 0.9 + progress * 0.4)
    ctx.stroke()
  }
  ctx.restore()
}

function monsterFacingFast(
  defId: string,
  _sprite: MonsterSprite,
  x: number,
  y: number,
  vx: number,
  vy: number,
  flip: boolean,
  provoked: boolean,
): Dir {
  const is4Way = defId === 'world_golem'
  if (provoked) {
    const dx = (game.p?.x ?? x) - x
    const dy = (game.p?.y ?? y) - y
    if (is4Way && Math.abs(dy) > Math.abs(dx) * 1.35 && Math.abs(dy) > 1) {
      return dy >= 0 ? 'down' : 'up'
    }
    if (Math.abs(dx) > 1) return dx < 0 ? 'left' : 'right'
  }
  if (is4Way && Math.abs(vy) > Math.abs(vx) * 1.35 && Math.abs(vy) > 0.05) {
    return vy >= 0 ? 'down' : 'up'
  }
  if (Math.abs(vx) > 0.05) return vx < 0 ? 'left' : 'right'
  if (is4Way && !provoked) return 'down'
  return flip ? 'left' : 'right'
}

// Flat depth-sorted entry to minimize closure overhead per frame
interface FastDepthEntry {
  y: number
  kind: 'prop' | 'town' | 'object' | 'portal' | 'custom'
  prop?: StaticPropDescriptor
  townSpec?: (typeof TOWN_STRUCTURES)[number]
  obj?: MapDef['objects'][number]
  portalGate?: PortalGateStyle
  px?: number
  py?: number
  customDraw?: () => void
}

interface FastOverheadEntry {
  y: number
  zone: OverheadBounds
  canvas: HTMLCanvasElement
  dx: number
  dy: number
  dw: number
  dh: number
}

const depthQueue: FastDepthEntry[] = []
const overheadQueue: FastOverheadEntry[] = []

let lastPreloadedMapId = ''
let heroSheetsPreloaded = false

export function renderFastWorld(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  dpr: number,
  font: string,
): void {
  const p = game.p
  if (!p) return
  const map = currentMap()
  if (lastPreloadedMapId !== map.id) {
    lastPreloadedMapId = map.id
    preloadMapCatalogSprites(map.id)
  }
  if (!heroSheetsPreloaded) {
    heroSheetsPreloaded = true
    preloadAllHeroSheets()
  }

  const uiPrefs = getUiPreferencesFallback()
  const lowQuality = uiPrefs.graphicsQuality === 'low'
  const reduceParticles = uiPrefs.reduceParticles || lowQuality
  const disableGlow = true // Fast renderer skips expensive Canvas2D shadowBlur passes!
  const disableShadows = uiPrefs.disableShadowsAndGlow || lowQuality
  const t = game.time
  const dt = fastPrevRenderTime > 0 ? Math.min(0.05, Math.max(0, t - fastPrevRenderTime)) : 0.016
  fastPrevRenderTime = t

  ctx.imageSmoothingEnabled = !uiPrefs.crispPixelScale
  ctx.imageSmoothingQuality = 'low'

  const cssW = cw / dpr
  const cssH = ch / dpr
  const zoom = computeCameraZoom(cssW, cssH, game.cameraZoomScale)
  const s = zoom * dpr
  const viewW = cw / s
  const viewH = ch / s
  const mapW = map.width * TILE
  const mapH = map.height * TILE
  const cam = stepSmoothCamera(fastCameraState, p.x, p.y, viewW, viewH, mapW, mapH, map.id, dt, game.facing)
  const wbMapFx = evaluateWorldBossMapFx(game.worldBossMapFx, t, cw, ch, {
    reduceParticles,
    disableShake: uiPrefs.disableShadowsAndGlow,
    dpr,
  })
  const wbWarn = evaluateWorldBossWarning(game.worldBossWarning, t, { reduceParticles })
  const camX = cam.x + wbMapFx.shakeX
  const camY = cam.y + wbMapFx.shakeY
  fastLastRenderCam = { mapId: map.id, x: cam.x, y: cam.y }

  // Clear background + setup world transform
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = FAST_THEME_BG[map.theme] ?? '#1e293b'
  ctx.fillRect(0, 0, cw, ch)
  ctx.setTransform(s, 0, 0, s, -camX * s, -camY * s)

  const vx0 = Math.max(0, camX)
  const vy0 = Math.max(0, camY)
  const vx1 = Math.min(mapW, camX + viewW)
  const vy1 = Math.min(mapH, camY + viewH)

  // 1) SINGLE drawImage for the entire visible map background!
  if (vx1 > vx0 && vy1 > vy0) {
    const groundCanvas = getFastGroundCanvas(map)
    ctx.drawImage(
      groundCanvas,
      vx0 * FAST_SCALE,
      vy0 * FAST_SCALE,
      (vx1 - vx0) * FAST_SCALE,
      (vy1 - vy0) * FAST_SCALE,
      vx0,
      vy0,
      vx1 - vx0,
      vy1 - vy0,
    )
  }

  const bounds = computeVisibleTileBounds(camX, camY, viewW, viewH, map.width, map.height, TILE, 2)
  const { minTx, maxTx, minTy, maxTy } = bounds

  // Portal ground pads
  for (let i = 0; i < map.portals.length; i++) {
    const pt = map.portals[i]
    const dir: PortalDirection =
      pt.dir ?? (pt.x === 0 ? 'west' : pt.x >= map.width - 2 ? 'east' : pt.y === 0 ? 'north' : 'south')
    const isH = dir === 'north' || dir === 'south'
    const cx = (pt.x + pt.w / 2) * TILE
    const cy = (pt.y + pt.h / 2) * TILE
    const padX = dir === 'west' ? cx + 6 : dir === 'east' ? cx - 6 : cx
    const padY = dir === 'north' ? cy + 8 : dir === 'south' ? cy - 8 : cy
    const rx = isH ? 25 : 10
    const ry = isH ? 9 : 24
    const pulse = 0.65 + Math.sin(t * 4) * 0.2
    const gate: PortalGateStyle = pt.gate ?? 'woodGate'
    ctx.fillStyle =
      gate === 'townArchway'
        ? `rgba(245, 180, 60, ${0.26 * pulse})`
        : gate === 'crystalShrine'
          ? `rgba(120, 80, 255, ${0.28 * pulse})`
          : `rgba(52, 211, 153, ${0.26 * pulse})`
    ctx.beginPath()
    ctx.ellipse(padX, padY, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle =
      gate === 'townArchway'
        ? `rgba(125, 211, 252, ${0.46 * pulse})`
        : gate === 'crystalShrine'
          ? `rgba(196, 181, 253, ${0.5 * pulse})`
          : `rgba(167, 243, 208, ${0.46 * pulse})`
    ctx.beginPath()
    ctx.ellipse(padX, padY, rx * 0.55, ry * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Move target pulse
  if (game.moveTarget && game.moveTarget.kind === 'walk') {
    const pulse = 0.55 + Math.sin(t * 8) * 0.35
    ctx.strokeStyle = `rgba(96, 165, 250, ${0.8 * pulse})`
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.ellipse(game.moveTarget.x, game.moveTarget.y + 2, 7 + pulse * 3, 4 + pulse * 1.5, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Ground drops (lightweight crisp rendering without gradient allocation per drop)
  for (let i = 0; i < game.groundDrops.length; i++) {
    const drop = game.groundDrops[i]
    const item = ITEMS[drop.itemId]
    if (!item) continue
    const rarity = drop.rarity ?? resolveEffectiveRarity(undefined, item)
    const rMeta = EQUIPMENT_RARITY_META[rarity] ?? EQUIPMENT_RARITY_META.common
    const vfx = resolveItemVfxSpec(rarity, {
      id: item.id,
      name: item.name,
      element: drop.element ?? item.element,
      color: item.color,
    })
    const bob = Math.sin(t * 4.6 + drop.x * 0.2) * 1.8
    const spriteImg = getItemAssetImage(resolveItemImagePath(item))

    if (!disableShadows) {
      ctx.fillStyle = 'rgba(0,0,0,0.38)'
      ctx.beginPath()
      ctx.ellipse(drop.x, drop.y + 4, 7.5, 3.2, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    if (!uiPrefs.disableShadowsAndGlow && vfx.intensity >= 1) {
      const pulse = 0.78 + Math.sin(t * 5.2 + drop.x) * 0.22
      ctx.globalAlpha = (0.16 + vfx.intensity * 0.04) * pulse
      ctx.fillStyle = vfx.primaryColor
      ctx.beginPath()
      ctx.ellipse(drop.x, drop.y + 2, 9 + vfx.intensity * 2.2, 4.5 + vfx.intensity, 0, 0, Math.PI * 2)
      ctx.fill()
      if (vfx.showGroundBeam) {
        const beamH = vfx.groundBeamHeight
        const beamW = rarity === 'mythic' ? 6 : 4
        ctx.globalAlpha = 0.28 * pulse
        ctx.fillRect(Math.round(drop.x - beamW / 2), Math.round(drop.y - beamH), beamW, beamH)
      }
      ctx.globalAlpha = 1
    }

    if (spriteImg) {
      ctx.drawImage(spriteImg, Math.round(drop.x - 10), Math.round(drop.y - 18 + bob), 20, 20)
    } else {
      ctx.fillStyle = rMeta.hexColor
      ctx.fillRect(Math.round(drop.x - 4), Math.round(drop.y - 8 + bob), 8, 8)
    }
  }

  // Gathering nodes
  for (let i = 0; i < GATHERING_NODES.length; i++) {
    const node = GATHERING_NODES[i]
    if (node.mapId !== map.id) continue
    const nx = (node.tx + 0.5) * TILE
    const ny = (node.ty + 0.5) * TILE
    ctx.fillStyle = node.color
    ctx.beginPath()
    ctx.moveTo(nx, ny - 7)
    ctx.lineTo(nx + 4, ny - 2)
    ctx.lineTo(nx, ny + 3)
    ctx.lineTo(nx - 4, ny - 2)
    ctx.closePath()
    ctx.fill()
  }

  // Active activity markers
  const actSession = game.activitySession
  if (actSession && actSession.mapId === map.id) {
    if (actSession.activityId === 'guild_war') {
      for (const flag of actSession.flags) {
        const fx = (flag.tx + 0.5) * TILE
        const fy = (flag.ty + 0.5) * TILE
        const owned = flag.owner === 'player'
        const flagColor = owned ? '#38bdf8' : '#f59e0b'
        ctx.strokeStyle = flagColor
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.ellipse(fx, fy + 2, 18, 10, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = '#e2e8f0'
        ctx.fillRect(Math.round(fx - 1), Math.round(fy - 18), 2, 20)
        ctx.fillStyle = flagColor
        ctx.fillRect(Math.round(fx + 1), Math.round(fy - 18), 9, 6)
      }
    } else if (actSession.activityId === 'treasure' && actSession.digSpot) {
      const ds = actSession.digSpot
      const sx = (ds.tx + 0.5) * TILE
      const sy = (ds.ty + 0.5) * TILE
      if (ds.revealed || Math.hypot(sx - p.x, sy - p.y) <= 96) {
        ctx.strokeStyle = '#facc15'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.ellipse(sx, sy + 1, 12, 7, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    } else if (actSession.activityId === 'fishing') {
      for (const spot of actSession.fishingSpots) {
        if (!spot.active) continue
        const fx = (spot.tx + 0.5) * TILE
        const fy = (spot.ty + 0.5) * TILE
        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.ellipse(fx, fy + 2, 9, 4.5, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  // 2) Populate reusable depthQueue without per-tile closure allocations!
  depthQueue.length = 0
  overheadQueue.length = 0

  if (map.id === 'town') {
    for (let i = 0; i < TOWN_STRUCTURES.length; i++) {
      const st = TOWN_STRUCTURES[i]
      const stamp = getTownStructureStamp(st)
      if (
        stamp.dx + stamp.dw < camX - 24 ||
        stamp.dx > camX + viewW + 24 ||
        stamp.dy + stamp.dh < camY - 24 ||
        stamp.dy > camY + viewH + 24
      ) {
        continue
      }
      depthQueue.push({ y: stamp.baseY, kind: 'town', townSpec: st })
      overheadQueue.push({
        y: stamp.baseY,
        zone: stamp.overheadZone,
        canvas: stamp.upper,
        dx: stamp.dx,
        dy: stamp.dy,
        dw: stamp.dw,
        dh: stamp.dh * stamp.splitRatio,
      })
    }
  }

  let staticProps = staticPropLayoutCache.get(map.id)
  if (!staticProps) {
    staticProps = buildStaticMapPropDescriptors(map)
    staticPropLayoutCache.set(map.id, staticProps)
  }
  for (let i = 0; i < staticProps.length; i++) {
    const prop = staticProps[i]
    if (prop.tx < minTx || prop.tx > maxTx || prop.ty < minTy || prop.ty > maxTy) continue
    depthQueue.push({ y: prop.sortY, kind: 'prop', prop })
    if (prop.overheadZone) {
      const stamp = getPropStamp(prop.kind, prop.variant, map.theme)
      if (stamp.upper) {
        const dx = Math.round(prop.worldX - stamp.w / 2)
        const dy = Math.round(prop.worldY - stamp.h + 2)
        overheadQueue.push({
          y: prop.sortY,
          zone: prop.overheadZone,
          canvas: stamp.upper,
          dx,
          dy,
          dw: stamp.w,
          dh: stamp.h * stamp.splitFrac,
        })
      }
    }
  }

  for (let i = 0; i < map.objects.length; i++) {
    const obj = map.objects[i]
    if (obj.tx < minTx || obj.tx > maxTx || obj.ty < minTy || obj.ty > maxTy) continue
    const oy = (obj.ty + 0.88) * TILE
    const sortY = obj.kind === 'lotus_lily' || obj.kind === 'lantern_float' ? oy - 10 : oy
    depthQueue.push({ y: sortY, kind: 'object', obj })
  }

  for (let i = 0; i < map.portals.length; i++) {
    const pt = map.portals[i]
    const dir: PortalDirection =
      pt.dir ?? (pt.x === 0 ? 'west' : pt.x >= map.width - 2 ? 'east' : pt.y === 0 ? 'north' : 'south')
    const gx =
      dir === 'west'
        ? (pt.x + 1.2) * TILE
        : dir === 'east'
          ? (pt.x - 0.2) * TILE
          : (pt.x + pt.w / 2) * TILE
    const baseY =
      dir === 'north'
        ? (pt.y + 2.0) * TILE
        : dir === 'south'
          ? (pt.y + 0.95) * TILE
          : (pt.y + pt.h * 0.7) * TILE
    depthQueue.push({
      y: dir === 'north' ? baseY - 12 : baseY,
      kind: 'portal',
      portalGate: pt.gate ?? 'woodGate',
      px: gx,
      py: baseY,
    })
  }

  const cullX0 = camX - 80
  const cullX1 = camX + viewW + 80
  const cullY0 = camY - 64
  const cullY1 = camY + viewH + 96

  // NPCs
  for (let i = 0; i < map.npcs.length; i++) {
    const n = map.npcs[i]
    const fx = n.x * TILE
    const fy = n.y * TILE + 8
    if (fx < cullX0 || fx > cullX1 || fy < cullY0 || fy > cullY1) continue
    const near = game.nearNpc?.id === n.id
    depthQueue.push({
      y: fy,
      kind: 'custom',
      customDraw: () => {
        if (n.role === 'wing_gacha') {
          drawShadowEllipse(ctx, fx, fy + 1, 9, disableShadows)
          if (near && !game.panel) {
            ctx.strokeStyle = 'rgba(103, 232, 249, 0.78)'
            ctx.lineWidth = 1.3
            ctx.beginPath()
            ctx.ellipse(fx, fy + 1, 13, 5, 0, 0, Math.PI * 2)
            ctx.stroke()
          }
          const stamp = getWingGachaStamp()
          ctx.drawImage(stamp, Math.round(fx - 11), Math.round(fy - 34), 22, 36)
          return
        }
        const drawable = resolveNpcDrawable(n.id, n.colors, Math.floor(t * 2 + fx) % 4, Math.floor(t * 2.2 + fx) % 4)
        const targetNpcH = 34
        const baseScale = targetNpcH / Math.max(1, drawable.height)
        const drawW = drawable.width * baseScale
        const drawH = drawable.height * baseScale
        drawShadowEllipse(ctx, fx, fy, 6.5, disableShadows)
        if (near && !game.panel) {
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)'
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.ellipse(fx, fy + 1, 11.5, 4.8, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
        drawResolvedDrawable(ctx, drawable, Math.round(fx - drawW / 2), Math.round(fy - drawH + 2), drawW, drawH)
      },
    })
  }

  // Monsters
  for (let i = 0; i < game.monsters.length; i++) {
    const m = game.monsters[i]
    const dying = m.dead && (m.dyingT ?? 0) > 0
    if (m.dead && !dying) continue
    if (m.x < cullX0 || m.x > cullX1 || m.y < cullY0 || m.y > cullY1) continue
    const def = MONSTERS[m.defId]
    if (!def) continue
    depthQueue.push({
      y: m.y,
      kind: 'custom',
      customDraw: () => {
        const mSpec = getMonsterModelSpec(def.id, def.sprite, def.color)
        const walking = !dying && m.moving
        const attacking = !dying && m.lunge > 0
        const action: SpriteAction = attacking ? 'attack' : walking ? 'walk' : 'idle'
        const dir = monsterFacingFast(def.id, def.sprite, m.x, m.y, m.vx, m.vy, m.flip, m.provoked)
        const atkCount = getCatalogMonsterFrameCount(def.id, 'attack', dir)
        const walkCount = getCatalogMonsterFrameCount(def.id, 'walk', dir)
        const idleCount = getCatalogMonsterFrameCount(def.id, 'idle', dir)
        const lungeMax = m.lungeMax ?? (m.isWorldBoss || def.id === 'world_golem' ? 0.95 : 0.3)
        const attackProgress = attacking ? Math.max(0, Math.min(1, 1 - m.lunge / Math.max(0.05, lungeMax))) : 0
        const attackFrame = Math.min(atkCount - 1, Math.floor(attackProgress * atkCount))
        const frame = attacking
          ? attackFrame
          : walking
            ? Math.floor(m.animT * 7.5 * (m.provoked ? 1.3 : 1)) % walkCount
            : Math.floor(m.animT * 5.0) % idleCount
        const drawable = resolveMonsterDrawable(def.sprite, def.color, frame, attacking, action, dir, attackFrame, def.id)
        const scale = (def.boss ? 1.65 : 1.05) / drawable.hdScale
        const w = drawable.width * scale
        const h = drawable.height * scale
        const footPad =
          drawable.sheetSpec?.footPadFrac !== undefined
            ? drawable.sheetSpec.footPadFrac * h
            : 2 * scale * drawable.hdScale

        if (dying) {
          const dieRatio = Math.max(0, Math.min(1, (m.dyingT ?? 0) / 0.55))
          ctx.save()
          ctx.globalAlpha = dieRatio
          drawResolvedDrawable(ctx, drawable, m.x - w / 2, m.y - h + footPad, w, h)
          ctx.restore()
          return
        }

        const hover = mSpec.flying ? Math.round(Math.sin(m.animT * 4.2) * 2.4) - 4 : 0
        drawShadowEllipse(ctx, m.x, m.y, def.boss || m.isWorldBoss ? Math.max(12, w * 0.34) : 6, disableShadows)
        if (m.uid === game.targetMonsterUid) {
          ctx.strokeStyle = '#fb7185'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.ellipse(m.x, m.y + 0.5, Math.max(10, w * 0.42), Math.max(4, w * 0.16), 0, 0, Math.PI * 2)
          ctx.stroke()
        }
        if (m.hitFlash > 0) ctx.globalAlpha = 0.65
        drawResolvedDrawable(ctx, drawable, Math.round(m.x - w / 2), Math.round(m.y - h + footPad + hover), w, h)
        ctx.globalAlpha = 1
      },
    })
  }

  // Remote Players
  for (let i = 0; i < game.remotePlayers.length; i++) {
    const other = game.remotePlayers[i]
    if (other.invisible || other.mapId !== map.id) continue
    const networkBlend = other.receivedAt ? Math.min(1, (Date.now() - other.receivedAt) / 100) : 1
    const remoteX = (other.previousX ?? other.x) + (other.x - (other.previousX ?? other.x)) * networkBlend
    const remoteY = (other.previousY ?? other.y) + (other.y - (other.previousY ?? other.y)) * networkBlend
    if (remoteX < cullX0 || remoteX > cullX1 || remoteY < cullY0 || remoteY > cullY1) continue
    const remoteJob = JOBS[normalizeJobId(other.jobId)]
    const remoteAttacking = other.attackAnim > 0
    const remoteAction: SpriteAction = remoteAttacking ? 'attack' : other.moving ? 'walk' : 'idle'
    const atkProgress = remoteAttacking ? Math.max(0, Math.min(1, 1 - other.attackAnim / 0.3)) : 0
    const remoteAtkFrame = Math.min(4, Math.floor(atkProgress * 5))
    const remoteFrame = remoteAttacking
      ? remoteAtkFrame
      : other.moving
        ? Math.floor(t * 10) % 6
        : Math.floor(t * 2.4) % 4
    const activeMountDef = other.mountId ? getMountDef(other.mountId) : null
    const activePetDef = other.petId ? getCombatPetDef(other.petId) : null
    const remoteLoadout = resolveFashionLoadoutFromRemote(other)
    preloadFashionLayers(remoteLoadout)
    const remoteWeapon = other.weaponType ?? remoteJob.weaponTypes[0] ?? 'stick'
    const remoteWeaponColor = other.weaponColor || remoteJob.colors.accent
    const styledColors = jobHumanColors(remoteJob.id, remoteJob.colors, false)
    const remoteDrawable = resolveHumanDrawable(
      styledColors,
      other.facing,
      remoteFrame,
      remoteWeapon,
      remoteWeaponColor,
      remoteAttacking,
      remoteAction,
      remoteAtkFrame,
    )
    const isRemoteGmEpic = Boolean(remoteDrawable.gmReady)
    const remoteScale = (isRemoteGmEpic ? 50 : 33) / Math.max(1, remoteDrawable.height)
    const remoteW = remoteDrawable.width * remoteScale
    const remoteH = remoteDrawable.height * remoteScale
    const remoteFootOffset = isRemoteGmEpic ? 10 : 2
    const isMounted = Boolean(activeMountDef)
    const remoteMountAnim =
      isMounted && activeMountDef
        ? resolveMountAnimationState({
            mounted: true,
            flying: activeMountDef.flying,
            moving: other.moving,
            moveHoldT: other.moving ? 0.5 : 0,
            attacking: remoteAttacking,
            attackFrame: remoteAtkFrame,
            transition: 'none',
            animRemaining: 0,
            animMax: 0.4,
            walkT: t,
            timeSec: t,
          })
        : null
    const remoteSeat =
      isMounted && activeMountDef && remoteMountAnim
        ? getMountRiderSeatOffset(activeMountDef.id, other.facing, remoteMountAnim.action, remoteMountAnim.frame)
        : null
    const riderSeatX = remoteSeat?.x ?? 0
    const riderSeatY = remoteSeat ? remoteSeat.y + (remoteMountAnim?.mountHoverY ?? 0) : 0

    depthQueue.push({
      y: remoteY,
      kind: 'custom',
      customDraw: () => {
        drawShadowEllipse(ctx, remoteX, remoteY, isMounted ? 9 : 6.5, disableShadows)
        if (isMounted && activeMountDef && remoteMountAnim) {
          preloadMountSpriteSheet(activeMountDef.id)
          const mImg = mountSprite(
            activeMountDef.id,
            other.facing,
            remoteMountAnim.action,
            remoteMountAnim.frame,
            remoteAtkFrame,
            1,
            null,
          )
          if (mImg.width > 0 && mImg.height > 0) {
            const mHd = mImg.dataset?.hdScale ? Number(mImg.dataset.hdScale) : 1
            const mDrawW = (mImg.width * 0.78) / mHd
            const mDrawH = (mImg.height * 0.78) / mHd
            ctx.drawImage(
              mImg,
              remoteX - mDrawW / 2,
              remoteY + remoteMountAnim.mountHoverY - mDrawH + 3,
              mDrawW,
              mDrawH,
            )
          }
        }
        const remoteDx = Math.round(-remoteW / 2)
        const remoteDy = Math.round(-remoteH + remoteFootOffset)
        ctx.save()
        ctx.translate(Math.round(remoteX + riderSeatX), Math.round(remoteY + riderSeatY))
        drawHeroDrawableWithFashion({
          ctx,
          jobId: remoteJob.id,
          drawable: remoteDrawable,
          loadout: remoteLoadout,
          dir: other.facing,
          action: isMounted && !remoteAttacking ? 'idle' : remoteAction,
          frame: isMounted && !remoteAttacking ? 0 : remoteFrame,
          dx: remoteDx,
          dy: remoteDy,
          dw: remoteW,
          dh: remoteH,
          timeSec: t,
          drawBase: () => drawResolvedDrawable(ctx, remoteDrawable, remoteDx, remoteDy, remoteW, remoteH),
        })
        if (remoteAttacking && !isRemoteGmEpic && !remoteDrawable.sheetId) {
          drawWeaponOverlayFast(ctx, other.facing, remoteWeapon, atkProgress, remoteWeaponColor)
        }
        ctx.restore()
        if (isMounted && activeMountDef) {
          drawMountForegroundSaddleStrap(
            ctx,
            Math.round(remoteX + riderSeatX),
            Math.round(remoteY + riderSeatY),
            other.facing,
            activeMountDef,
            1,
          )
        }
      },
    })

    if (activePetDef) {
      const petOffsetX = other.facing === 'left' ? 14 : other.facing === 'right' ? -14 : -15
      const petX = remoteX + petOffsetX
      const petY = remoteY - (getPetModelSpec(activePetDef.id).floating ? 5 : 1)
      const pImg = petSprite(activePetDef.id, other.facing, other.moving ? 'follow' : 'idle', Math.floor(t * 6) % 4, 0, 1, 1)
      depthQueue.push({
        y: remoteY + 0.5,
        kind: 'custom',
        customDraw: () => {
          if (pImg.width > 0 && pImg.height > 0) {
            const pHd = pImg.dataset?.hdScale ? Number(pImg.dataset.hdScale) : 1
            const pDrawW = (pImg.width * 0.68) / pHd
            const pDrawH = (pImg.height * 0.68) / pHd
            ctx.drawImage(pImg, petX - pDrawW / 2, petY - pDrawH + 2, pDrawW, pDrawH)
          }
        },
      })
    }
  }

  // Local Player & Pet
  const job = JOBS[normalizeJobId(p.jobId)]
  const weapon = p.equipment.weapon ? ITEMS[p.equipment.weapon.itemId] : null
  const activePet = getActivePetBonuses(p.petState, p.equippedGemCompanion, p.ownedGemItems)
  const activeMount = getActiveMountBonuses(p.mountState, p.ownedGemItems)
  const extV2 = sanitizeExtV2(p.extV2)
  const prem = sanitizePremiumState(p.premium, {
    characterId: 'slot_1',
    diamonds: p.diamonds ?? 0,
    ownedGemItems: p.ownedGemItems,
    equippedGemFashion: p.equippedGemFashion,
    unlockedCosmetics: extV2.unlockedCosmetics,
    equippedWing: extV2.equippedWing,
    equippedWeaponSkin: extV2.equippedWeaponSkin,
  })
  const vipBonus = getEffectiveVipBonuses(prem.vip)
  const localLoadout = resolveFashionLoadoutFromSave({
    premium: prem,
    equippedGemFashion: p.equippedGemFashion,
    extV2,
  })
  preloadFashionLayers(localLoadout)

  depthQueue.push({
    y: p.y,
    kind: 'custom',
    customDraw: () => {
      const castingSkill = game.skillAnim > 0
      const attacking = !castingSkill && game.attackAnim > 0
      const hitReacting = !castingSkill && !attacking && game.hitAnim > 0
      const celebrating = !castingSkill && !attacking && !hitReacting && !game.moving && game.victoryAnim > 0
      const running = !castingSkill && !attacking && game.moving && game.moveHoldT > 0.65
      const action: SpriteAction = castingSkill
        ? 'skill'
        : attacking
          ? 'attack'
          : hitReacting
            ? 'hit'
            : celebrating
              ? 'victory'
              : running
                ? 'run'
                : game.moving
                  ? 'walk'
                  : 'idle'
      const atkProgress = attacking ? Math.max(0, Math.min(1, 1 - game.attackAnim / 0.3)) : 0
      const atkFrame = Math.min(4, Math.floor(atkProgress * 5))
      const skillProgress = castingSkill
        ? Math.max(0, Math.min(1, 1 - game.skillAnim / Math.max(0.2, game.skillAnimMax || 0.55)))
        : 0
      const skillFrame = Math.min(5, Math.floor(skillProgress * 6))
      const hitFrame = hitReacting
        ? Math.min(2, Math.floor(Math.max(0, 1 - game.hitAnim / Math.max(0.15, game.hitAnimMax || 0.28)) * 3))
        : 0
      const victoryFrame = celebrating
        ? Math.min(4, Math.floor(Math.max(0, 1 - game.victoryAnim / Math.max(0.4, game.victoryAnimMax || 0.85)) * 5))
        : 0
      const frame = castingSkill
        ? skillFrame
        : attacking
          ? atkFrame
          : hitReacting
            ? hitFrame
            : celebrating
              ? victoryFrame
              : game.moving
                ? Math.floor(game.walkT * (running ? 14 : 10)) % 6
                : Math.floor(t * 2.4) % 4
      const weaponType = weapon?.weaponType ?? job.weaponTypes[0] ?? 'stick'
      const styledColors = jobHumanColors(job.id, job.colors, false)
      const weaponDrawColor = castingSkill ? game.skillVfxColor : (weapon?.color ?? job.colors.accent)
      const drawable = resolveHumanDrawable(
        styledColors,
        game.facing,
        frame,
        weaponType,
        weaponDrawColor,
        attacking,
        action,
        attacking ? atkFrame : castingSkill ? skillFrame : undefined,
      )
      const isGmEpic = Boolean(drawable.gmReady)
      const drawScale = (isGmEpic ? 50 : 33) / Math.max(1, drawable.height)
      const drawW = drawable.width * drawScale
      const drawH = drawable.height * drawScale
      const footOffset = isGmEpic ? 10 : 2
      const lungeDist = attacking ? Math.sin(atkProgress * Math.PI) * 3.5 : 0
      const ox = attacking ? (game.facing === 'left' ? -lungeDist : game.facing === 'right' ? lungeDist : 0) : 0
      const oy = attacking ? (game.facing === 'up' ? -lungeDist : game.facing === 'down' ? lungeDist : 0) : 0

      const hasTransitionMount = Boolean(
        activeMount && (game.mountTransition === 'mounting' || game.mountTransition === 'dismounting'),
      )
      const isRidingOrHopping = Boolean(activeMount && (activeMount.mounted || hasTransitionMount))
      const isSummonedCompanion = Boolean(activeMount && !activeMount.mounted && !hasTransitionMount)
      const mountAnimState = activeMount
        ? resolveMountAnimationState({
            mounted: Boolean(activeMount.mounted),
            flying: activeMount.def.flying,
            moving: game.moving,
            moveHoldT: game.moveHoldT,
            walkOnly: game.mountWalkOnly,
            attacking: attacking || castingSkill,
            attackFrame: castingSkill ? skillFrame : atkFrame,
            transition: game.mountTransition,
            animRemaining: game.mountAnim,
            animMax: game.mountAnimMax,
            walkT: game.walkT,
            timeSec: t,
          })
        : null
      const mountHover = mountAnimState?.mountHoverY ?? 0
      const seatOffset =
        isRidingOrHopping && activeMount && mountAnimState
          ? getMountRiderSeatOffset(activeMount.mountId, game.facing, mountAnimState.action, mountAnimState.frame)
          : null
      const transitionRatio =
        game.mountTransition === 'mounting'
          ? mountAnimState?.transitionProgress ?? 1
          : game.mountTransition === 'dismounting'
            ? 1 - (mountAnimState?.transitionProgress ?? 0)
            : activeMount?.mounted
              ? 1
              : 0
      const riderSeatX =
        seatOffset && mountAnimState ? seatOffset.x * transitionRatio + mountAnimState.riderArcX : 0
      const riderSeatY =
        seatOffset && mountAnimState ? seatOffset.y * transitionRatio + mountHover + mountAnimState.riderArcY : 0
      const isSeatedInSaddle = isRidingOrHopping && transitionRatio > 0.45

      drawShadowEllipse(ctx, p.x, p.y, isRidingOrHopping ? 9 : 6, disableShadows)
      if (game.invulnUntil > t) {
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.75)'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.ellipse(p.x, p.y - 6, 13, 8, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = p.invisible ? 0.18 : 1

      if ((p.rebirthCount ?? 0) > 0) {
        drawRebirthAura(ctx, {
          x: p.x,
          y: p.y,
          timeSec: t,
          rebirthCount: p.rebirthCount ?? 0,
          radiusX: 12,
          spriteHeight: drawH,
          alphaScale: p.invisible ? 0.25 : 1,
          layer: 'back',
          disableGlow,
        })
      }
      if ((extV2.spiritAwakening?.awakeningStage ?? 0) > 0) {
        drawSpiritAwakeningAura(ctx, {
          x: p.x,
          y: p.y,
          timeSec: t,
          stage: extV2.spiritAwakening?.awakeningStage ?? 0,
          radiusX: 12,
          spriteHeight: drawH,
          alphaScale: p.invisible ? 0.22 : 1,
          disableGlow,
        })
      }

      const drawSummonedMount = () => {
        if (!isSummonedCompanion || !activeMount || !mountAnimState) return
        preloadMountSpriteSheet(activeMount.mountId)
        const compX = p.x + (game.facing === 'left' ? 19 : game.facing === 'right' ? -19 : -18)
        const compY = p.y + (game.facing === 'up' ? -4 : 3)
        drawShadowEllipse(ctx, compX, compY, 7.5, disableShadows)
        const mImg = mountSprite(
          activeMount.mountId,
          game.facing,
          mountAnimState.action,
          mountAnimState.frame,
          atkFrame,
          activeMount.level,
          null,
        )
        if (mImg.width > 0 && mImg.height > 0) {
          const mHd = mImg.dataset?.hdScale ? Number(mImg.dataset.hdScale) : 1
          const mDrawW = (mImg.width * 0.72) / mHd
          const mDrawH = (mImg.height * 0.72) / mHd
          ctx.drawImage(mImg, compX - mDrawW / 2, compY + mountHover * 0.75 - mDrawH + 3, mDrawW, mDrawH)
        }
      }
      if (isSummonedCompanion && game.facing === 'up') drawSummonedMount()

      if (isRidingOrHopping && activeMount && mountAnimState) {
        preloadMountSpriteSheet(activeMount.mountId)
        const mImg = mountSprite(
          activeMount.mountId,
          game.facing,
          mountAnimState.action,
          mountAnimState.frame,
          atkFrame,
          activeMount.level,
          null,
        )
        if (mImg.width > 0 && mImg.height > 0) {
          const mHd = mImg.dataset?.hdScale ? Number(mImg.dataset.hdScale) : 1
          const mDrawW = (mImg.width * 0.78) / mHd
          const mDrawH = (mImg.height * 0.78) / mHd
          ctx.drawImage(mImg, p.x + ox * 0.4 - mDrawW / 2, p.y + oy * 0.4 + mountHover - mDrawH + 3, mDrawW, mDrawH)
        }
      }

      const riderDrawable =
        isSeatedInSaddle && !attacking && !castingSkill
          ? resolveHumanDrawable(styledColors, game.facing, 0, weaponType, weaponDrawColor, false, 'idle', undefined)
          : drawable
      const localDx = Math.round(-drawW / 2)
      const localDy = Math.round(-drawH + footOffset)
      ctx.save()
      ctx.translate(Math.round(p.x + riderSeatX + ox), Math.round(p.y + oy + riderSeatY))
      drawHeroDrawableWithFashion({
        ctx,
        jobId: job.id,
        drawable: riderDrawable,
        loadout: localLoadout,
        dir: game.facing,
        action: isSeatedInSaddle && !attacking && !castingSkill ? 'idle' : action,
        frame: isSeatedInSaddle && !attacking && !castingSkill ? 0 : frame,
        dx: localDx,
        dy: localDy,
        dw: drawW,
        dh: drawH,
        timeSec: t,
        drawBase: () => drawResolvedDrawable(ctx, riderDrawable, localDx, localDy, drawW, drawH),
      })
      if ((attacking || (castingSkill && !isGmEpic)) && !isGmEpic && !riderDrawable.sheetId) {
        drawWeaponOverlayFast(ctx, game.facing, weaponType, attacking ? atkProgress : skillProgress, weaponDrawColor)
      }
      ctx.restore()

      if (isSeatedInSaddle && activeMount) {
        drawMountForegroundSaddleStrap(
          ctx,
          Math.round(p.x + riderSeatX + ox * 0.6),
          Math.round(p.y + oy * 0.6 + riderSeatY),
          game.facing,
          activeMount.def,
          activeMount.level,
        )
      }
      if (isSummonedCompanion && game.facing !== 'up') drawSummonedMount()

      if ((p.rebirthCount ?? 0) > 0) {
        drawRebirthAura(ctx, {
          x: p.x,
          y: p.y + riderSeatY,
          timeSec: t,
          rebirthCount: p.rebirthCount ?? 0,
          radiusX: 12,
          spriteHeight: drawH,
          alphaScale: p.invisible ? 0.25 : 1,
          layer: 'front',
          disableGlow,
        })
      }
      ctx.globalAlpha = 1
    },
  })

  // Active Pet
  if (activePet) {
    preloadPetSpriteSheet(activePet.petId)
    const petSpec = getPetModelSpec(activePet.petId)
    const pf = game.petFollow.initialized && game.petFollow.petId === activePet.petId ? game.petFollow : null
    const petBaseX = pf ? pf.x : p.x + (game.facing === 'left' ? 14 : game.facing === 'right' ? -14 : -15)
    const petBaseY = pf ? pf.y : p.y
    const petDir = pf ? pf.dir : game.facing
    const petAction: SpriteAction = pf ? pf.action : game.petAttackAnim > 0 ? 'attack' : game.moving ? 'follow' : 'idle'
    const petAnimT = pf ? pf.animT : t
    const petAttacking = petAction === 'attack' || game.petAttackAnim > 0
    const petAtkProgress = game.petAttackAnim > 0 ? Math.max(0, Math.min(1, 1 - game.petAttackAnim / 0.45)) : 0
    const petAtkFrame = Math.min(3, Math.floor(petAtkProgress * 4))
    const petFrame = resolvePetAnimationFrame(
      petAction === 'attack' || petAction === 'walk' || petAction === 'run' || petAction === 'follow' || petAction === 'idle'
        ? petAction
        : 'idle',
      petAnimT,
      game.petAttackAnim,
    )
    const floatBob = petSpec.floating ? -4.5 + Math.sin(t * 4) * 2.2 : 0
    const pImg = petSprite(activePet.petId, petDir, petAttacking ? 'attack' : petAction, petFrame, petAtkFrame, activePet.level, activePet.stars)
    depthQueue.push({
      y: petBaseY + 0.5,
      kind: 'custom',
      customDraw: () => {
        ctx.globalAlpha = p.invisible ? 0.18 : 1
        drawShadowEllipse(ctx, petBaseX, petBaseY + 1, 4.5, disableShadows)
        if (pImg.width > 0 && pImg.height > 0) {
          const pHd = pImg.dataset?.hdScale ? Number(pImg.dataset.hdScale) : 1
          const isPhao = activePet.def.category === 'phao' || activePet.petId.startsWith('phao_')
          const pScale = (activePet.petId === 'aurora_cloud_dragon' ? 0.78 : isPhao ? 0.72 : 0.68) / pHd
          const pDrawW = pImg.width * pScale
          const pDrawH = pImg.height * pScale
          const pFootPad = pImg.dataset?.footPadFrac ? Number(pImg.dataset.footPadFrac) * pDrawH : 2
          ctx.drawImage(pImg, petBaseX - pDrawW / 2, petBaseY + floatBob - pDrawH + pFootPad, pDrawW, pDrawH)
        }
        ctx.globalAlpha = 1
      },
    })
  }

  // 3) Sort and draw depthQueue
  depthQueue.sort((a, b) => a.y - b.y)
  for (let i = 0; i < depthQueue.length; i++) {
    const item = depthQueue[i]
    if (item.kind === 'prop' && item.prop) {
      const prop = item.prop
      const stamp = getPropStamp(prop.kind, prop.variant, map.theme)
      const dx = Math.round(prop.worldX - stamp.w / 2)
      const dy = Math.round(prop.worldY - stamp.h + 2)
      if (stamp.upper) {
        const lowerTop = dy + stamp.h * stamp.splitFrac
        const lowerH = stamp.h * (1 - stamp.splitFrac)
        ctx.drawImage(stamp.lower, dx, lowerTop, stamp.w, lowerH)
      } else {
        ctx.drawImage(stamp.lower, dx, dy, stamp.w, stamp.h)
      }
    } else if (item.kind === 'town' && item.townSpec) {
      const stamp = getTownStructureStamp(item.townSpec)
      const lowerTop = stamp.dy + stamp.dh * stamp.splitRatio
      const lowerH = stamp.dh * (1 - stamp.splitRatio)
      ctx.drawImage(stamp.lower, stamp.dx, lowerTop, stamp.dw, lowerH)
      if (item.townSpec.animatedForge && !lowQuality) {
        const glowAlpha = 0.45 + Math.sin(t * 9) * 0.25
        ctx.fillStyle = `rgba(251, 146, 60, ${glowAlpha})`
        ctx.fillRect(Math.round(stamp.dx + stamp.dw * 0.48), Math.round(stamp.dy + stamp.dh - 16), 8, 7)
      } else if (item.townSpec.kind === 'fountain' && !lowQuality) {
        const fx = stamp.dx + stamp.dw * 0.5
        const fy = stamp.dy + stamp.dh - 15
        for (let k = 0; k < 6; k++) {
          const phase = (t * 1.6 + k * 0.16) % 1
          const ang = (k / 6) * Math.PI * 2 + t * 0.9
          ctx.fillStyle = k % 2 ? '#e0f2fe' : '#7dd3fc'
          ctx.fillRect(
            Math.round(fx + Math.cos(ang) * (3 + phase * 10)),
            Math.round(fy - 14 - Math.sin(phase * Math.PI) * 7 + phase * 10),
            1.5,
            1.5,
          )
        }
      }
    } else if (item.kind === 'object' && item.obj) {
      const obj = item.obj
      const ox = (obj.tx + 0.5) * TILE
      const oy = (obj.ty + 0.88) * TILE
      const objFrame = Math.floor(t * 5 + obj.tx * 0.7 + obj.ty) % 3
      const img = mapObjectSprite(obj.kind, objFrame, obj.variant ?? 0)
      if (img.width > 0 && img.height > 0) {
        const hdScale = img.dataset?.hdScale ? Number(img.dataset.hdScale) : 1
        const dw = img.width / hdScale
        const dh = img.height / hdScale
        ctx.drawImage(img, Math.round(ox - dw / 2), Math.round(oy - dh + 2), dw, dh)
      }
    } else if (item.kind === 'portal' && item.portalGate && item.px !== undefined && item.py !== undefined) {
      const gateImg = getPortalGateStamp(item.portalGate)
      ctx.drawImage(gateImg, Math.round(item.px - 17), Math.round(item.py - 32), 34, 34)
    } else if (item.customDraw) {
      item.customDraw()
    }
  }

  // 4) Overhead Roofs & Canopies
  overheadQueue.sort((a, b) => a.y - b.y)
  for (let i = 0; i < overheadQueue.length; i++) {
    const ov = overheadQueue[i]
    const occluded = isEntityOccludedByOverhead(p.x, p.y, ov.zone)
    if (occluded) ctx.globalAlpha = 0.72
    ctx.drawImage(ov.canvas, ov.dx, ov.dy, ov.dw, ov.dh)
    if (occluded) ctx.globalAlpha = 1
  }

  // 5) Projectiles, Effects & Combat Particles (with shadowBlur disabled!)
  for (let i = 0; i < game.projectiles.length; i++) {
    const pr = game.projectiles[i]
    if (pr.delay > 0) continue
    drawOverworldProjectile(ctx, {
      x: pr.x,
      y: pr.y,
      tx: pr.tx,
      ty: pr.ty,
      size: pr.size,
      color: pr.color,
      secondaryColor: pr.secondaryColor,
      jobId: pr.jobId,
      aoe: pr.aoe,
      timeSec: t,
      disableGlow,
    })
  }

  for (let i = 0; i < game.effects.length; i++) {
    const e = game.effects[i]
    const k = 1 - e.life / e.max
    const alpha = Math.max(0, e.life / e.max)
    if (e.vfxStyle || e.jobId) {
      drawOverworldSkillEffect(ctx, {
        jobId: e.jobId,
        vfxTier: e.vfxTier,
        skillId: e.skillId,
        style: e.vfxStyle ?? 'heavy_cleave',
        primaryColor: e.color,
        secondaryColor: e.secondaryColor,
        sourceX: e.sourceX,
        sourceY: e.sourceY,
        targetX: e.x,
        targetY: e.y,
        radius: e.r,
        progress: k,
        alpha,
        disableGlow,
      })
      continue
    }
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = e.color
    ctx.fillStyle = e.color
    if (e.type === 'slash') {
      ctx.lineWidth = 2
      ctx.beginPath()
      const a = e.angle ?? 0
      ctx.arc(e.x, e.y, e.r * (0.6 + k * 0.4), a, a + Math.PI * 0.9)
      ctx.stroke()
    } else if (e.type === 'ring') {
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(e.x, e.y, e.r * (0.3 + k * 0.7), 0, Math.PI * 2)
      ctx.stroke()
    } else if (e.type === 'burst') {
      ctx.globalAlpha *= 0.45
      ctx.beginPath()
      ctx.arc(e.x, e.y, e.r * (0.4 + k * 0.6), 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillRect(Math.round(e.x - 2), Math.round(e.y - 2), 4, 4)
    }
    ctx.restore()
  }

  renderCombatParticlePool(ctx, globalCombatParticlePool, disableGlow)

  if (wbWarn.active && game.worldBossWarning) {
    const wx = game.worldBossWarning.originX
    const wy = game.worldBossWarning.originY - 6
    const outerR = 112 * wbWarn.ringRadiusMul
    ctx.strokeStyle = wbWarn.borderColor
    ctx.globalAlpha = Math.min(0.85, wbWarn.borderAlpha * 1.35)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(wx, wy, outerR, outerR * 0.42, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // 6) Screen-space Weather, Cached Biome Vignette, Day/Night, Cached Labels & Floating Numbers
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  if (!lowQuality && !reduceParticles) {
    if (map.theme === 'frost' || map.theme === 'snow' || map.theme === 'dream' || map.theme === 'isles') {
      const count = 12
      ctx.fillStyle = map.theme === 'dream' || map.theme === 'isles' ? '#fbcfe8' : '#ffffff'
      ctx.globalAlpha = 0.65
      for (let i = 0; i < count; i++) {
        const px = ((i * 151 + t * 18) % cw + cw) % cw
        const py = (t * (26 + (i % 4) * 8) + i * 83) % ch
        ctx.fillRect(Math.round(px), Math.round(py), 3, 3)
      }
      ctx.globalAlpha = 1
    } else if (map.theme === 'volcano' || map.theme === 'abyss' || map.theme === 'world') {
      const count = 10
      ctx.fillStyle = '#fb923c'
      ctx.globalAlpha = 0.55
      for (let i = 0; i < count; i++) {
        const px = ((i * 173 + t * 8) % cw + cw) % cw
        const py = ch - ((t * (28 + (i % 4) * 8) + i * 91) % ch)
        ctx.fillRect(Math.round(px), Math.round(py), 3, 3)
      }
      ctx.globalAlpha = 1
    }
  }

  if (
    map.theme === 'cave' ||
    map.theme === 'forest' ||
    map.theme === 'volcano' ||
    map.theme === 'abyss' ||
    map.theme === 'graveyard' ||
    map.theme === 'ruins' ||
    map.theme === 'crystal'
  ) {
    const dark =
      map.theme === 'cave'
        ? 'rgba(3,3,12,0.82)'
        : map.theme === 'abyss'
          ? 'rgba(14,4,26,0.55)'
          : 'rgba(8,14,20,0.4)'
    if (disableShadows) {
      ctx.fillStyle = map.theme === 'cave' ? 'rgba(3,3,12,0.4)' : 'rgba(8,12,18,0.18)'
      ctx.fillRect(0, 0, cw, ch)
    } else {
      const vig = getCachedVignette(
        cw,
        ch,
        map.theme,
        dark,
        map.theme === 'cave' ? 0.16 : 0.28,
        map.theme === 'cave' ? 0.48 : 0.62,
      )
      ctx.drawImage(vig, 0, 0, cw, ch)
    }
  }

  const worldPhase = getWorldTimePhase()
  if (worldPhase.phase !== 'day') {
    ctx.fillStyle = worldPhase.tintCss
    ctx.fillRect(0, 0, cw, ch)
  }

  // World Boss Screen Telegraph & Flash
  if (wbWarn.active) {
    ctx.save()
    ctx.globalAlpha = wbWarn.borderAlpha
    ctx.strokeStyle = wbWarn.borderColor
    ctx.lineWidth = Math.max(2, Math.round(4 * dpr))
    ctx.strokeRect(3, 3, Math.max(1, cw - 6), Math.max(1, ch - 6))
    const pillW = Math.min(cw * 0.72, 232 * dpr)
    const pillH = 24 * dpr
    const pillX = (cw - pillW) * 0.5
    const pillY = Math.round(46 * dpr)
    ctx.globalAlpha = 0.88
    ctx.fillStyle = 'rgba(15, 12, 20, 0.84)'
    ctx.fillRect(Math.round(pillX), Math.round(pillY), Math.round(pillW), Math.round(pillH))
    ctx.strokeStyle = wbWarn.borderColor
    ctx.lineWidth = Math.max(1, 1.3 * dpr)
    ctx.strokeRect(Math.round(pillX), Math.round(pillY), Math.round(pillW), Math.round(pillH))
    ctx.fillStyle = wbWarn.borderColor
    ctx.fillRect(
      Math.round(pillX + 6 * dpr),
      Math.round(pillY + pillH - 4 * dpr),
      Math.max(0, Math.round((pillW - 12 * dpr) * (1 - wbWarn.progress))),
      Math.max(2, Math.round(2 * dpr)),
    )
    ctx.font = `800 ${Math.round(9.5 * dpr)}px ${font}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = wbWarn.progress >= 0.6 ? '#fecaca' : '#fde68a'
    ctx.fillText(
      `⚠ WARNING · สกิลทั้งแมพ ${wbWarn.remainingSec.toFixed(1)}s`,
      cw * 0.5,
      pillY + (pillH - 4 * dpr) * 0.5,
    )
    ctx.restore()
  }
  if (wbMapFx.active && wbMapFx.flashAlpha > 0) {
    ctx.fillStyle = wbMapFx.flashColor
    ctx.globalAlpha = wbMapFx.flashAlpha
    ctx.fillRect(0, 0, cw, ch)
    ctx.globalAlpha = 1
  }

  const toSx = (wx: number) => (wx - camX) * s
  const toSy = (wy: number) => (wy - camY) * s

  // Nearby ground drop labels
  for (let i = 0; i < game.groundDrops.length; i++) {
    const drop = game.groundDrops[i]
    const item = ITEMS[drop.itemId]
    if (!item) continue
    if (Math.hypot(drop.x - p.x, drop.y - p.y) > 78) continue
    const rarity = drop.rarity ?? resolveEffectiveRarity(undefined, item)
    const rMeta = EQUIPMENT_RARITY_META[rarity] ?? EQUIPMENT_RARITY_META.common
    const label = drop.qty > 1 ? `${item.name} x${drop.qty}` : item.name
    drawCachedLabel(ctx, label, toSx(drop.x), toSy(drop.y - 23), rMeta.hexColor, 7, dpr, zoom, font, true)
  }

  // Nearby interactive object labels
  for (let i = 0; i < map.objects.length; i++) {
    const obj = map.objects[i]
    if (!obj.label) continue
    const ox = (obj.tx + 0.5) * TILE
    const oy = (obj.ty + 0.5) * TILE
    if (Math.hypot(p.x - ox, p.y - oy) < 42) {
      drawCachedLabel(ctx, obj.label, toSx(ox), toSy(oy - 22), '#ffe8a3', 8, dpr, zoom, font)
    }
  }

  // Gathering labels
  for (let i = 0; i < GATHERING_NODES.length; i++) {
    const node = GATHERING_NODES[i]
    if (node.mapId !== map.id) continue
    const nx = (node.tx + 0.5) * TILE
    const ny = (node.ty + 0.5) * TILE
    drawCachedLabel(ctx, node.label, toSx(nx), toSy(ny - 16), node.color, 7.5, dpr, zoom, font)
    if (Math.hypot(p.x - nx, p.y - ny) <= 42 && !game.panel) {
      drawCachedLabel(ctx, 'กด E เก็บเกี่ยว', toSx(nx), toSy(ny + 12), '#7ae582', 8.5, dpr, zoom, font)
    }
  }

  // Portal labels
  for (let i = 0; i < map.portals.length; i++) {
    const pt = map.portals[i]
    const dir: PortalDirection =
      pt.dir ?? (pt.x === 0 ? 'west' : pt.x >= map.width - 2 ? 'east' : pt.y === 0 ? 'north' : 'south')
    const wx = dir === 'west' ? (pt.x + 2.5) * TILE : dir === 'east' ? (pt.x - 1.5) * TILE : (pt.x + pt.w / 2) * TILE
    const wy = dir === 'north' ? (pt.y + 2.8) * TILE : dir === 'south' ? (pt.y - 1.5) * TILE : (pt.y - 0.25) * TILE
    const arrow = dir === 'north' ? '▲' : dir === 'south' ? '▼' : dir === 'west' ? '◀' : '▶'
    drawCachedLabel(ctx, `${arrow} ${pt.label}`, toSx(wx), toSy(wy), '#caf0f8', 9, dpr, zoom, font)
  }

  // NPC labels & proximity prompts
  const npcRoleIconMap: Record<string, MenuIconId> = {
    enhance: 'npc-anvil',
    storage: 'npc-chest',
    shop: 'npc-pouch',
    job: 'npc-job',
    gacha: 'npc-gacha',
    wing_gacha: 'bp-wings',
    rebirth: 'npc-rebirth',
  }
  for (let i = 0; i < map.npcs.length; i++) {
    const n = map.npcs[i]
    const npcWorldX = n.x * TILE
    const npcWorldY = n.y * TILE + 8
    const sx = toSx(npcWorldX)
    const sy = toSy(npcWorldY - 35)
    if (sx < -80 || sx > cw + 80 || sy < -80 || sy > ch + 80) continue
    drawCachedLabel(ctx, `[${n.title}]`, sx, sy - 12 * dpr, '#f2c94c', 8.5, dpr, zoom, font)
    drawCachedLabel(ctx, n.name, sx, sy, '#ffffff', 9.5, dpr, zoom, font)
    const distToPlayer = Math.hypot(p.x - npcWorldX, p.y - npcWorldY)
    if (!game.panel && (distToPlayer < 88 || game.nearNpc?.id === n.id) && n.greeting) {
      const label = n.greeting.length > 34 ? `${n.greeting.slice(0, 32)}…` : n.greeting
      drawCachedLabel(ctx, label, sx, sy - 30 * dpr, '#fef9c3', 8.5, dpr, zoom, font)
    } else if (!game.panel) {
      const iconCanvas = getMenuIconCanvas(npcRoleIconMap[n.role] ?? 'npc-pouch')
      if (iconCanvas) {
        const iw = Math.round(13 * dpr)
        ctx.drawImage(iconCanvas, Math.round(sx - iw / 2), Math.round(sy - 32 * dpr), iw, iw)
      }
    }
    if (game.nearNpc?.id === n.id && !game.panel) {
      drawCachedLabel(ctx, 'คุย (E) · คลิก', sx, toSy(npcWorldY + 12), '#6ee7b7', 8.5, dpr, zoom, font, true)
    }
  }

  // Monster labels & HP bars
  for (let i = 0; i < game.monsters.length; i++) {
    const m = game.monsters[i]
    if (m.dead || m.x < cullX0 || m.x > cullX1 || m.y < cullY0 || m.y > cullY1) continue
    const def = MONSTERS[m.defId]
    if (!def) continue
    const catalogAtlas = getCatalogMonsterAtlas(def.id)
    const mSpec = getMonsterModelSpec(def.id, def.sprite, def.color)
    const h = catalogAtlas
      ? Math.round(resolveCatalogMonsterWorldHeight(def.id, catalogAtlas.heightWorld) * (1 - catalogAtlas.footPadFrac)) +
        (mSpec.flying ? 5 : 2)
      : Math.round(mSpec.canvasSize.height * (def.boss ? 1.65 : 1.05) * 0.78) + (mSpec.flying ? 5 : 0)
    const sx = toSx(m.x)
    const sy = toSy(m.y - h)
    const isAnyBoss = Boolean(def.boss || m.isWorldBoss)
    const isTargeted = m.uid === game.targetMonsterUid
    const color = m.isWorldBoss
      ? '#fde047'
      : def.boss
        ? '#ff6b6b'
        : isTargeted
          ? '#fde68a'
          : def.level > p.level + 5
            ? '#ff8fa3'
            : def.level < p.level - 5
              ? '#a0a0a0'
              : '#ffffff'
    const label = m.isWorldBoss
      ? `[บอสโลก] ${m.worldBossName ?? def.name}`
      : `${def.boss ? '★ ' : ''}${def.name} Lv.${def.level}`
    drawCachedLabel(ctx, label, sx, sy - 8 * dpr, color, isAnyBoss ? 10 : 8, dpr, zoom, font)
    if (m.hp < m.maxHp || isAnyBoss || isTargeted) {
      const bw = (m.isWorldBoss ? 48 : def.boss ? 40 : isTargeted ? 24 : 18) * s
      const bh = (m.isWorldBoss ? 2.5 : 2) * s
      ctx.fillStyle = isAnyBoss ? '#f5c441' : 'rgba(10,8,20,0.9)'
      ctx.fillRect(Math.round(sx - bw / 2 - 1), Math.round(sy - 1), Math.round(bw + 2), Math.round(bh + 2))
      ctx.fillStyle = '#3a0d12'
      ctx.fillRect(Math.round(sx - bw / 2), Math.round(sy), Math.round(bw), Math.round(bh))
      ctx.fillStyle = m.isWorldBoss ? '#f43f5e' : '#e5484d'
      ctx.fillRect(Math.round(sx - bw / 2), Math.round(sy), Math.round(bw * Math.max(0, m.hp / m.maxHp)), Math.round(bh))
    }
  }

  // Remote Player labels & bars
  for (let i = 0; i < game.remotePlayers.length; i++) {
    const other = game.remotePlayers[i]
    if (other.invisible || other.mapId !== map.id) continue
    const networkBlend = other.receivedAt ? Math.min(1, (Date.now() - other.receivedAt) / 100) : 1
    const remoteX = (other.previousX ?? other.x) + (other.x - (other.previousX ?? other.x)) * networkBlend
    const remoteY = (other.previousY ?? other.y) + (other.y - (other.previousY ?? other.y)) * networkBlend
    const isRemoteMounted = Boolean(other.mountId && getMountDef(other.mountId))
    const footCx = toSx(remoteX)
    const footTopY = toSy(remoteY + (isRemoteMounted ? 6 : 4.5))
    const remoteJob = JOBS[normalizeJobId(other.jobId)]
    const vipTierDef = (other.vipLevel ?? 0) > 0 ? getVipTierDef(other.vipLevel ?? 0) : null
    const customNameColor = sanitizeNameColor(other.nameColor)
    const resolvedColor = isRainbowNameColor(customNameColor)
      ? resolveAnimatedRainbowHex(Date.now())
      : customNameColor
    const rbw = 26 * s
    const rbh = 2.1 * s
    ctx.fillStyle = 'rgba(7,11,20,0.92)'
    ctx.fillRect(Math.round(footCx - rbw / 2 - 1), Math.round(footTopY - 1), Math.round(rbw + 2), Math.round(rbh + 2))
    ctx.fillStyle = '#4ade80'
    ctx.fillRect(Math.round(footCx - rbw / 2), Math.round(footTopY), Math.round(rbw), Math.round(rbh))
    const nameLine = `${other.gm ? '[GM] ' : ''}${vipTierDef ? `[${vipTierDef.badgeLabel}] ` : ''}${other.displayName}`
    drawCachedLabel(
      ctx,
      nameLine,
      footCx,
      footTopY + rbh + 7.5 * dpr,
      resolvedColor ?? (other.gm ? '#ffd60a' : vipTierDef?.badgeColor ?? '#ffffff'),
      9.2,
      dpr,
      zoom,
      font,
    )
    const guildLine = other.guildTag ? `[${other.guildTag}]` : `Lv.${other.level} · ${remoteJob.name}`
    drawCachedLabel(ctx, guildLine, footCx, footTopY + rbh + 17 * dpr, other.guildTag ? '#fde68a' : '#cbd5e1', 7.8, dpr, zoom, font)
    if (other.bubble && other.bubble.until > game.time) {
      const rHeadX = toSx(remoteX)
      const rHeadY = toSy(remoteY - (isRemoteMounted ? 48 : 42))
      ctx.font = `${Math.round(10.5 * dpr * (zoom / 3) * 1.15)}px ${font}`
      const tw = Math.min(ctx.measureText(other.bubble.text).width, 220 * dpr)
      const by = rHeadY - 10 * dpr
      ctx.fillStyle = 'rgba(255,250,235,0.95)'
      ctx.fillRect(Math.round(rHeadX - tw / 2 - 6 * dpr), Math.round(by - 10 * dpr), Math.round(tw + 12 * dpr), Math.round(20 * dpr))
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#1a1423'
      ctx.fillText(other.bubble.text, rHeadX, by, 220 * dpr)
    }
  }

  // Local Player HP/MP bar & cached nameplate
  {
    const isLocalMounted = Boolean(
      activeMount &&
        (activeMount.mounted || game.mountTransition === 'mounting' || game.mountTransition === 'dismounting'),
    )
    const barCx = toSx(p.x)
    const barTopY = toSy(p.y + (isLocalMounted ? 6 : 4.5))
    const stats = getStats(p)
    const bw = 26 * s
    const hpH = 2.2 * s
    const mpH = 1.4 * s
    const gap = 1
    if (stats) {
      ctx.fillStyle = 'rgba(7, 11, 20, 0.94)'
      ctx.fillRect(Math.round(barCx - bw / 2 - 1), Math.round(barTopY - 1), Math.round(bw + 2), Math.round(hpH + mpH + gap + 2))
      ctx.fillStyle = '#132a1f'
      ctx.fillRect(Math.round(barCx - bw / 2), Math.round(barTopY), Math.round(bw), Math.round(hpH))
      ctx.fillStyle = '#4ade80'
      ctx.fillRect(Math.round(barCx - bw / 2), Math.round(barTopY), Math.round(bw * Math.max(0, Math.min(1, p.hp / Math.max(1, stats.maxHp)))), Math.round(hpH))
      ctx.fillStyle = '#0f2342'
      ctx.fillRect(Math.round(barCx - bw / 2), Math.round(barTopY + hpH + gap), Math.round(bw), Math.round(mpH))
      ctx.fillStyle = '#38bdf8'
      ctx.fillRect(Math.round(barCx - bw / 2), Math.round(barTopY + hpH + gap), Math.round(bw * Math.max(0, Math.min(1, p.mp / Math.max(1, stats.maxMp)))), Math.round(mpH))
    }

    const activeTitleDef = p.rpgExt?.activeTitle ? TITLE_DEFS.find((item) => item.id === p.rpgExt?.activeTitle) : null
    const displayNameLine = `${p.gm ? '[GM] ' : ''}${vipBonus.active && vipBonus.tierDef ? `[${vipBonus.tierDef.badgeLabel}] ` : ''}${p.name}`
    const guildDisplay = p.rpgExt?.guildName
      ? p.rpgExt.guildName
      : p.rpgExt?.guildTag
        ? `[${p.rpgExt.guildTag}]`
        : job.name

    let labelY = barTopY + hpH + mpH + gap + 8 * dpr
    if (activeTitleDef) {
      drawCachedLabel(ctx, `«${activeTitleDef.name}»`, barCx, labelY, activeTitleDef.color, 7.6, dpr, zoom, font)
      labelY += 9 * dpr
    }
    const nameColor =
      (isRainbowNameColor(extV2.nameColor) ? resolveAnimatedRainbowHex(Date.now()) : extV2.nameColor) ??
      (p.gm ? '#ffd60a' : vipBonus.active && vipBonus.tierDef ? vipBonus.tierDef.badgeColor : '#ffffff')
    drawCachedLabel(ctx, displayNameLine, barCx, labelY, nameColor, 9.4, dpr, zoom, font)
    drawCachedLabel(
      ctx,
      guildDisplay,
      barCx,
      labelY + 9.5 * dpr,
      p.rpgExt?.guildName || p.rpgExt?.guildTag ? '#f8fafc' : '#72efdd',
      8.1,
      dpr,
      zoom,
      font,
    )

    if (game.bubble) {
      const headX = toSx(p.x)
      const headY = toSy(p.y - (isLocalMounted ? 48 : 42))
      ctx.font = `${Math.round(11 * dpr * (zoom / 3) * 1.15)}px ${font}`
      const tw = Math.min(ctx.measureText(game.bubble.text).width, 240 * dpr)
      const by = headY - 10 * dpr
      ctx.fillStyle = 'rgba(255,250,235,0.95)'
      ctx.fillRect(Math.round(headX - tw / 2 - 6 * dpr), Math.round(by - 10 * dpr), Math.round(tw + 12 * dpr), Math.round(20 * dpr))
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#1a1423'
      ctx.fillText(game.bubble.text, headX, by, 240 * dpr)
    }
  }

  // Floating Damage Numbers (crisp drop shadow + fill, zero expensive thick strokeText!)
  for (let i = 0; i < game.floats.length; i++) {
    const f = game.floats[i]
    const kind = f.kind ?? 'damage'
    const motion = computeWorldFloatTransform(f.life, f.max, kind, f.arcDrift ?? 0)
    const sx = toSx(f.x + motion.dxWorld)
    const sy = toSy(f.y + motion.dyWorld)
    const fontPx = Math.max(10, Math.round(f.size * dpr * (zoom / 3) * 1.15 * motion.scale))
    ctx.globalAlpha = motion.alpha
    ctx.font = `900 ${fontPx}px ${font}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(8, 10, 18, 0.85)'
    ctx.fillText(f.text, sx + 1.5, sy + 1.5)
    ctx.fillStyle = f.color
    ctx.fillText(f.text, sx, sy)
  }
  ctx.globalAlpha = 1
}

function drawShadowEllipse(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, disabled: boolean) {
  if (disabled) return
  ctx.fillStyle = 'rgba(0,0,0,0.26)'
  ctx.beginPath()
  ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
}

function getUiPreferencesFallback(): UiPreferences {
  return getUiPreferences()
}

export function screenToWorldFast(
  cssX: number,
  cssY: number,
  cssW: number,
  cssH: number,
): { x: number; y: number } {
  const safeW = Math.max(1, cssW)
  const safeH = Math.max(1, cssH)
  const zoom = computeCameraZoom(safeW, safeH, game.cameraZoomScale)
  const mapId = currentMap().id
  const camX = fastLastRenderCam.mapId === mapId ? fastLastRenderCam.x : fastCameraState.x
  const camY = fastLastRenderCam.mapId === mapId ? fastLastRenderCam.y : fastCameraState.y
  return {
    x: camX + cssX / zoom,
    y: camY + cssY / zoom,
  }
}
