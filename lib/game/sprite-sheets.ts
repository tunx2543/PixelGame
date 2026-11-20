import { MONSTER_CATALOG_META } from './biome-monsters'
import { getCatalogMonsterFrameSpec } from './catalog-sprites'
import type { Dir, SpriteAction } from './sprites'

export type HeroSheetId =
  | 'novice'
  | 'swordsman'
  | 'mage'
  | 'archer'
  | 'cleric'
  | 'merchant'
  | 'thief'
  | 'kensei'
  | 'iron_fist'
  | 'wicked_necromancer'
  | 'the_king'
  | 'sinister'
  | 'templar'
  | 'nekobaku'
  | 'mamushi'

export type NpcSheetId =
  | 'merchant'
  | 'blacksmith'
  | 'goddess'
  | 'keeper'
  | 'gacha'
  | 'rebirth'

export type MountSheetId =
  | 'meadow_pony'
  | 'frost_wolf'
  | 'royal_griffin'
  | 'starlight_kirin'
  | 'aurora_cloud_dragon'

export interface SpriteSheetActionSpec {
  row: number
  frames: number
  /** Base horizontal facing of frames in this row ('right' | 'left' | 'front' | 'back') */
  baseFacing: 'right' | 'left' | 'front' | 'back'
}

export interface SpriteSheetSpec {
  id: string
  sheetPath: string
  portraitPath: string
  frameWidth: number
  frameHeight: number
  cols: number
  rows: number
  /** Normalized bottom-center anchor [0..1] */
  anchorX: number
  anchorY: number
  /** Equivalent pixel-ratio scale relative to base world rig (e.g., 4 -> 192px/4 = 48u) */
  hdScale: number
  actions: Record<string, SpriteSheetActionSpec>
  individualFrames?: string[]
}

const HERO_FRAME_W = 168
const HERO_FRAME_H = 192
const HERO_ANCHOR_Y = 178 / HERO_FRAME_H

function makeHeroSheetSpec(id: HeroSheetId): SpriteSheetSpec {
  const base = `/assets/hd/characters/${id}`
  const individualFrames: string[] = []
  for (const prefix of ['walk_down', 'walk_left', 'walk_right', 'walk_up', 'attack', 'skill']) {
    for (let i = 0; i < 4; i++) {
      individualFrames.push(`${base}/${prefix}_${i}.png`)
    }
  }
  return {
    id,
    sheetPath: `${base}/sheet.png`,
    portraitPath: `${base}/portrait.png`,
    frameWidth: HERO_FRAME_W,
    frameHeight: HERO_FRAME_H,
    cols: 4,
    rows: 6,
    anchorX: 0.5,
    anchorY: HERO_ANCHOR_Y,
    hdScale: 4,
    actions: {
      walk_down: { row: 0, frames: 4, baseFacing: 'front' },
      walk_left: { row: 1, frames: 4, baseFacing: 'left' },
      walk_right: { row: 2, frames: 4, baseFacing: 'right' },
      walk_up: { row: 3, frames: 4, baseFacing: 'back' },
      attack: { row: 4, frames: 4, baseFacing: 'right' },
      skill: { row: 5, frames: 4, baseFacing: 'right' },
    },
    individualFrames,
  }
}

export const HERO_SPRITE_SHEETS: Record<HeroSheetId, SpriteSheetSpec> = {
  novice: makeHeroSheetSpec('novice'),
  swordsman: makeHeroSheetSpec('swordsman'),
  mage: makeHeroSheetSpec('mage'),
  archer: makeHeroSheetSpec('archer'),
  cleric: makeHeroSheetSpec('cleric'),
  merchant: makeHeroSheetSpec('merchant'),
  thief: makeHeroSheetSpec('thief'),
  kensei: makeHeroSheetSpec('kensei'),
  iron_fist: makeHeroSheetSpec('iron_fist'),
  wicked_necromancer: makeHeroSheetSpec('wicked_necromancer'),
  the_king: makeHeroSheetSpec('the_king'),
  sinister: makeHeroSheetSpec('sinister'),
  templar: makeHeroSheetSpec('templar'),
  nekobaku: makeHeroSheetSpec('nekobaku'),
  mamushi: makeHeroSheetSpec('mamushi'),
}

function makeNpcSheetSpec(id: NpcSheetId): SpriteSheetSpec {
  const base = `/assets/hd/npcs/${id}`
  return {
    id: `npc_${id}`,
    sheetPath: `${base}/sheet.png`,
    portraitPath: `${base}/portrait.png`,
    frameWidth: HERO_FRAME_W,
    frameHeight: HERO_FRAME_H,
    cols: 4,
    rows: 1,
    anchorX: 0.5,
    anchorY: HERO_ANCHOR_Y,
    hdScale: 4,
    actions: {
      idle: { row: 0, frames: 4, baseFacing: 'front' },
    },
  }
}

export const NPC_SPRITE_SHEETS: Record<NpcSheetId, SpriteSheetSpec> = {
  merchant: makeNpcSheetSpec('merchant'),
  blacksmith: makeNpcSheetSpec('blacksmith'),
  goddess: makeNpcSheetSpec('goddess'),
  keeper: makeNpcSheetSpec('keeper'),
  gacha: makeNpcSheetSpec('gacha'),
  rebirth: makeNpcSheetSpec('rebirth'),
}

const MOUNT_FRAME_W = 224
const MOUNT_FRAME_H = 192
export const MOUNT_FOOT_PAD_FRAC = 22 / MOUNT_FRAME_H
const MOUNT_ANCHOR_Y = (MOUNT_FRAME_H - 22) / MOUNT_FRAME_H

function makeMountSheetSpec(id: MountSheetId): SpriteSheetSpec {
  const base = `/assets/hd/mounts/${id}`
  return {
    id: `mount_${id}`,
    sheetPath: `${base}/sheet.png`,
    portraitPath: `${base}/portrait.png`,
    frameWidth: MOUNT_FRAME_W,
    frameHeight: MOUNT_FRAME_H,
    cols: 6,
    rows: 15,
    anchorX: 0.5,
    anchorY: MOUNT_ANCHOR_Y,
    hdScale: 4,
    actions: {
      idle_down: { row: 0, frames: 4, baseFacing: 'front' },
      idle_right: { row: 1, frames: 4, baseFacing: 'right' },
      idle_up: { row: 2, frames: 4, baseFacing: 'back' },
      walk_down: { row: 3, frames: 6, baseFacing: 'front' },
      walk_right: { row: 4, frames: 6, baseFacing: 'right' },
      walk_up: { row: 5, frames: 6, baseFacing: 'back' },
      run_down: { row: 6, frames: 6, baseFacing: 'front' },
      run_right: { row: 7, frames: 6, baseFacing: 'right' },
      run_up: { row: 8, frames: 6, baseFacing: 'back' },
      mount_down: { row: 9, frames: 4, baseFacing: 'front' },
      mount_right: { row: 10, frames: 4, baseFacing: 'right' },
      mount_up: { row: 11, frames: 4, baseFacing: 'back' },
      dismount_down: { row: 12, frames: 4, baseFacing: 'front' },
      dismount_right: { row: 13, frames: 4, baseFacing: 'right' },
      dismount_up: { row: 14, frames: 4, baseFacing: 'back' },
    },
  }
}

export const MOUNT_SPRITE_SHEETS: Record<MountSheetId, SpriteSheetSpec> = {
  meadow_pony: makeMountSheetSpec('meadow_pony'),
  frost_wolf: makeMountSheetSpec('frost_wolf'),
  royal_griffin: makeMountSheetSpec('royal_griffin'),
  starlight_kirin: makeMountSheetSpec('starlight_kirin'),
  aurora_cloud_dragon: makeMountSheetSpec('aurora_cloud_dragon'),
}

export function getMountSheetSpec(mountId?: string | null): SpriteSheetSpec | null {
  if (!mountId) return null
  return MOUNT_SPRITE_SHEETS[mountId as MountSheetId] ?? null
}

export const JOB_TO_HERO_SHEET: Record<string, HeroSheetId> = {
  novice: 'novice',
  swordsman: 'swordsman',
  mage: 'mage',
  archer: 'archer',
  cleric: 'cleric',
  merchant: 'merchant',
  thief: 'thief',
  kensei: 'kensei',
  iron_fist: 'iron_fist',
  wicked_necromancer: 'wicked_necromancer',
  the_king: 'the_king',
  sinister: 'sinister',
  templar: 'templar',
  nekobaku: 'nekobaku',
  mamushi: 'mamushi',
  // Legacy aliases fallback cleanly
  priest: 'cleric',
  high_priest: 'cleric',
  knight: 'templar',
  paladin: 'templar',
  berserker: 'kensei',
  wizard: 'mage',
  hunter: 'archer',
  assassin: 'sinister',
  gm: 'the_king',
}

export function resolveHeroSheetSpec(jobId?: string | null): SpriteSheetSpec | null {
  if (!jobId) return null
  const sheetId = JOB_TO_HERO_SHEET[jobId]
  return sheetId ? HERO_SPRITE_SHEETS[sheetId] : null
}

export interface SheetFrameDrawSpec {
  image: HTMLImageElement
  sx: number
  sy: number
  sw: number
  sh: number
  flipX: boolean
  hdScale: number
  sheetId: string
  anchorX: number
  anchorY: number
  /** Logical union frame box dimensions & normalized sub-rect placement for trimmed packed atlases */
  boxW?: number
  boxH?: number
  subX?: number
  subY?: number
  subW?: number
  subH?: number
  footPadFrac?: number
}

const MAX_SLICED_FRAMES = 48
const sheetImageCache = new Map<string, HTMLImageElement>()
const slicedFrameCache = new Map<string, HTMLCanvasElement>()
let sheetsPreloaded = false

function getSheetImage(sheetPath: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null
  let img = sheetImageCache.get(sheetPath)
  if (!img) {
    img = new Image()
    img.src = sheetPath
    sheetImageCache.set(sheetPath, img)
  }
  return img.complete && img.naturalWidth > 0 ? img : null
}

export function preloadAllSpriteSheets(): void {
  if (sheetsPreloaded || typeof Image === 'undefined') return
  sheetsPreloaded = true
  for (const spec of Object.values(NPC_SPRITE_SHEETS)) {
    getSheetImage(spec.sheetPath)
  }
  for (const spec of Object.values(MOUNT_SPRITE_SHEETS)) {
    getSheetImage(spec.sheetPath)
  }
}

export function preloadMountSpriteSheet(mountId?: string | null): void {
  const spec = getMountSheetSpec(mountId)
  if (spec) getSheetImage(spec.sheetPath)
}

function buildFrameDrawSpec(
  spec: SpriteSheetSpec,
  row: number,
  col: number,
  flipX = false,
): SheetFrameDrawSpec | null {
  const img = getSheetImage(spec.sheetPath)
  if (!img) return null
  const safeRow = Math.max(0, Math.min(spec.rows - 1, row))
  const safeCol = Math.max(0, Math.min(spec.cols - 1, col))
  return {
    image: img,
    sx: safeCol * spec.frameWidth,
    sy: safeRow * spec.frameHeight,
    sw: spec.frameWidth,
    sh: spec.frameHeight,
    flipX,
    hdScale: spec.hdScale,
    sheetId: spec.id,
    anchorX: spec.anchorX,
    anchorY: spec.anchorY,
  }
}

export function drawSheetFrameSpec(
  ctx: CanvasRenderingContext2D,
  spec: SheetFrameDrawSpec,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  if (!spec.image.complete || spec.image.naturalWidth <= 0) return
  const rx = spec.subX ?? 0
  const ry = spec.subY ?? 0
  const rw = spec.subW ?? 1
  const rh = spec.subH ?? 1
  const subDw = rw * dw
  const subDh = rh * dh
  if (!spec.flipX) {
    ctx.drawImage(spec.image, spec.sx, spec.sy, spec.sw, spec.sh, dx + rx * dw, dy + ry * dh, subDw, subDh)
    return
  }
  ctx.save()
  ctx.translate(dx + dw, dy)
  ctx.scale(-1, 1)
  ctx.drawImage(spec.image, spec.sx, spec.sy, spec.sw, spec.sh, rx * dw, ry * dh, subDw, subDh)
  ctx.restore()
}

export function getNpcSheetFrameSpec(npcId: string, frame: number): SheetFrameDrawSpec | null {
  const spec = NPC_SPRITE_SHEETS[npcId as NpcSheetId]
  if (!spec) return null
  return buildFrameDrawSpec(spec, 0, Math.abs(frame) % 4, false)
}

export function getMountSheetFrameSpec(
  mountId: string | undefined,
  dir: Dir,
  action: SpriteAction,
  frame: number,
): SheetFrameDrawSpec | null {
  const spec = getMountSheetSpec(mountId)
  if (!spec) return null

  const normalizedAction =
    action === 'attack' || action === 'skill'
      ? 'run'
      : action === 'idle' || action === 'walk' || action === 'run' || action === 'mount' || action === 'dismount'
        ? action
        : 'idle'
  const dirKey = dir === 'down' ? 'down' : dir === 'up' ? 'up' : 'right'
  const flipX = dir === 'left'
  const rowSpec = spec.actions[`${normalizedAction}_${dirKey}`] ?? spec.actions.idle_down
  const col = Math.abs(Math.floor(frame)) % rowSpec.frames
  const drawSpec = buildFrameDrawSpec(spec, rowSpec.row, col, flipX)
  if (!drawSpec) return null
  return {
    ...drawSpec,
    footPadFrac: MOUNT_FOOT_PAD_FRAC,
  }
}

export function getHeroSheetFrameSpec(
  jobId: string | undefined,
  dir: Dir,
  action: SpriteAction,
  frame: number,
): SheetFrameDrawSpec | null {
  const spec = resolveHeroSheetSpec(jobId)
  if (!spec) return null

  let rowKey: string
  let flipX = false

  if (action === 'skill') {
    rowKey = 'skill'
    flipX = dir === 'left'
  } else if (action === 'attack') {
    rowKey = 'attack'
    flipX = dir === 'left'
  } else {
    rowKey =
      dir === 'left'
        ? 'walk_left'
        : dir === 'right'
          ? 'walk_right'
          : dir === 'up'
            ? 'walk_up'
            : 'walk_down'
  }

  const rowSpec = spec.actions[rowKey] ?? spec.actions.walk_down
  const col =
    action === 'idle' || action === 'mount' || action === 'dismount'
      ? frame < 0
        ? 0
        : frame % 2 === 1
          ? 1
          : 0
      : Math.abs(frame) % rowSpec.frames

  return buildFrameDrawSpec(spec, rowSpec.row, col, flipX)
}

export function getMonsterSheetFrameSpec(
  defId: string | undefined,
  _spriteFallback: string | undefined,
  dir: Dir,
  action: SpriteAction,
  frame: number,
): SheetFrameDrawSpec | null {
  const isBoss = Boolean(defId && MONSTER_CATALOG_META[defId]?.boss)
  return getCatalogMonsterFrameSpec(defId, dir, action, frame, isBoss)
}

export function getNpcSheetFrame(npcId: string, frame: number): HTMLCanvasElement | null {
  const spec = NPC_SPRITE_SHEETS[npcId as NpcSheetId]
  if (!spec) return null
  return sliceSheetFrame(spec, 0, Math.abs(frame) % 4, false)
}

export function sliceSheetFrame(
  spec: SpriteSheetSpec,
  row: number,
  col: number,
  flipX = false,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const img = getSheetImage(spec.sheetPath)
  if (!img) return null

  const safeRow = Math.max(0, Math.min(spec.rows - 1, row))
  const safeCol = Math.max(0, Math.min(spec.cols - 1, col))
  const key = `${spec.id}|${safeRow}|${safeCol}|${flipX ? 1 : 0}`
  const existing = slicedFrameCache.get(key)
  if (existing) {
    if (existing.width > 0 && existing.height > 0) {
      slicedFrameCache.delete(key)
      slicedFrameCache.set(key, existing)
      return existing
    }
    slicedFrameCache.delete(key)
  }

  const canvas = document.createElement('canvas')
  canvas.width = spec.frameWidth
  canvas.height = spec.frameHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const sx = safeCol * spec.frameWidth
  const sy = safeRow * spec.frameHeight

  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'medium'
  if (flipX) {
    ctx.translate(spec.frameWidth, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(
    img,
    sx,
    sy,
    spec.frameWidth,
    spec.frameHeight,
    0,
    0,
    spec.frameWidth,
    spec.frameHeight,
  )
  ctx.restore()

  canvas.dataset.hdScale = String(spec.hdScale)
  canvas.dataset.sheetId = spec.id
  canvas.dataset.anchorX = String(spec.anchorX)
  canvas.dataset.anchorY = String(spec.anchorY)
  slicedFrameCache.set(key, canvas)
  while (slicedFrameCache.size > MAX_SLICED_FRAMES) {
    const oldestKey = slicedFrameCache.keys().next().value
    if (oldestKey === undefined) break
    const oldest = slicedFrameCache.get(oldestKey)
    slicedFrameCache.delete(oldestKey)
    if (oldest) {
      try {
        oldest.width = 0
        oldest.height = 0
      } catch {
        // ignore
      }
    }
  }
  return canvas
}

export function getHeroSheetFrame(
  jobId: string | undefined,
  dir: Dir,
  action: SpriteAction,
  frame: number,
): HTMLCanvasElement | null {
  const frameSpec = getHeroSheetFrameSpec(jobId, dir, action, frame)
  if (!frameSpec) return null
  const spec = resolveHeroSheetSpec(jobId)
  if (!spec) return null
  return sliceSheetFrame(
    spec,
    Math.round(frameSpec.sy / spec.frameHeight),
    Math.round(frameSpec.sx / spec.frameWidth),
    frameSpec.flipX,
  )
}
