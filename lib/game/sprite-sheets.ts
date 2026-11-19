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

export type MonsterSheetId =
  | 'slime_blue'
  | 'slime_green'
  | 'slime_pink'
  | 'mushroom'
  | 'rabbit'
  | 'boss_wolf'
  | 'wolf'
  | 'goblin'
  | 'boss_spider_queen'
  | 'goblin_chief'
  | 'boss_lich'
  | 'bat'
  | 'spider'
  | 'boss_fire_dragon'
  | 'skeleton'
  | 'orc'
  | 'golem'
  | 'boss_demon_king'
  | 'ghost'
  | 'fire_golem'
  | 'earth_golem'
  | 'demon'
  | 'demon_lord'
  | 'abyss_knight'
  | 'gale_sentinel'
  | 'abyss_dragon'

export type NpcSheetId =
  | 'merchant'
  | 'blacksmith'
  | 'goddess'
  | 'keeper'
  | 'gacha'
  | 'rebirth'

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

function makeMonsterSheetSpec(
  id: MonsterSheetId,
  frameWidth: number,
  frameHeight: number,
  anchorYPx: number,
  baseCanvasHeight: number,
): SpriteSheetSpec {
  const base = `/assets/hd/monsters/${id}`
  return {
    id,
    sheetPath: `${base}/sheet.png`,
    portraitPath: `${base}/portrait.png`,
    frameWidth,
    frameHeight,
    cols: 4,
    rows: 3,
    anchorX: 0.5,
    anchorY: anchorYPx / frameHeight,
    hdScale: Number((frameHeight / Math.max(1, baseCanvasHeight)).toFixed(3)),
    actions: {
      walk_left: { row: 0, frames: 4, baseFacing: 'left' },
      walk_right: { row: 1, frames: 4, baseFacing: 'right' },
      attack: { row: 2, frames: 4, baseFacing: 'left' },
    },
  }
}

export const MONSTER_SPRITE_SHEETS: Record<MonsterSheetId, SpriteSheetSpec> = {
  slime_blue: makeMonsterSheetSpec('slime_blue', 112, 104, 94, 26),
  slime_green: makeMonsterSheetSpec('slime_green', 112, 104, 94, 26),
  slime_pink: makeMonsterSheetSpec('slime_pink', 112, 104, 94, 26),
  mushroom: makeMonsterSheetSpec('mushroom', 128, 104, 94, 26),
  rabbit: makeMonsterSheetSpec('rabbit', 112, 104, 94, 26),
  boss_wolf: makeMonsterSheetSpec('boss_wolf', 136, 128, 118, 32),
  wolf: makeMonsterSheetSpec('wolf', 120, 96, 88, 24),
  goblin: makeMonsterSheetSpec('goblin', 112, 104, 96, 26),
  boss_spider_queen: makeMonsterSheetSpec('boss_spider_queen', 136, 128, 118, 32),
  goblin_chief: makeMonsterSheetSpec('goblin_chief', 152, 136, 128, 34),
  boss_lich: makeMonsterSheetSpec('boss_lich', 136, 128, 118, 32),
  bat: makeMonsterSheetSpec('bat', 120, 104, 90, 26),
  spider: makeMonsterSheetSpec('spider', 112, 104, 94, 26),
  boss_fire_dragon: makeMonsterSheetSpec('boss_fire_dragon', 168, 136, 126, 34),
  skeleton: makeMonsterSheetSpec('skeleton', 112, 104, 96, 26),
  orc: makeMonsterSheetSpec('orc', 128, 120, 110, 30),
  golem: makeMonsterSheetSpec('golem', 128, 120, 110, 30),
  boss_demon_king: makeMonsterSheetSpec('boss_demon_king', 144, 132, 122, 32),
  ghost: makeMonsterSheetSpec('ghost', 112, 104, 94, 26),
  fire_golem: makeMonsterSheetSpec('fire_golem', 128, 120, 110, 30),
  earth_golem: makeMonsterSheetSpec('earth_golem', 136, 128, 118, 32),
  demon: makeMonsterSheetSpec('demon', 128, 120, 110, 30),
  demon_lord: makeMonsterSheetSpec('demon_lord', 144, 132, 122, 32),
  abyss_knight: makeMonsterSheetSpec('abyss_knight', 128, 120, 110, 30),
  gale_sentinel: makeMonsterSheetSpec('gale_sentinel', 128, 120, 110, 30),
  abyss_dragon: makeMonsterSheetSpec('abyss_dragon', 168, 136, 126, 34),
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

/**
 * Maps monster defId (or sprite fallback) to an HD sheet in MONSTER_SPRITE_SHEETS.
 * To add a new dedicated monster spritesheet later:
 * 1. Place /public/assets/hd/monsters/<id>/sheet.png (4 cols x 3 rows: walk_left, walk_right, attack)
 * 2. Add <id> to MonsterSheetId and MONSTER_SPRITE_SHEETS above
 * 3. Point MONSTER_ID_TO_SHEET[<id>] = <id>
 */
export const MONSTER_ID_TO_SHEET: Record<string, MonsterSheetId | null> = {
  slime: 'slime_green',
  slime_blue: 'slime_blue',
  pink_slime: 'slime_pink',
  mushroom: 'mushroom',
  rabbit: 'rabbit',
  boss_wolf: 'boss_wolf',
  wolf: 'wolf',
  goblin: 'goblin',
  boss_spider_queen: 'boss_spider_queen',
  goblin_chief: 'goblin_chief',
  boss_lich: 'boss_lich',
  bat: 'bat',
  spider: 'spider',
  boss_fire_dragon: 'boss_fire_dragon',
  skeleton: 'skeleton',
  orc: 'orc',
  golem: 'golem',
  boss_demon_king: 'boss_demon_king',
  ghost: 'ghost',
  fire_golem: 'fire_golem',
  earth_golem: 'earth_golem',
  demon: 'demon',
  demon_lord: 'demon_lord',
  abyss_knight: 'abyss_knight',
  gale_sentinel: 'gale_sentinel',
  abyss_dragon: 'abyss_dragon',

  // Biome boss placeholder sheets until dedicated spritesheets are added
  vale_tiger_king: 'boss_wolf',
  forest_crimson_warden: 'abyss_knight',
  forest_flame_spirit: 'boss_fire_dragon',
  forest_amber_queen: 'boss_spider_queen',
  forest_thorn_beast: 'boss_wolf',
  coast_sea_warlord: 'abyss_knight',
  coast_king_lobster: 'boss_spider_queen',
  cave_ant_king: 'boss_spider_queen',
  cave_crystal_mantis: 'boss_spider_queen',
  desert_pharaoh: 'boss_lich',
  desert_sand_shark: 'boss_wolf',
  desert_sphinx_golem: 'earth_golem',
  desert_anubis_mage: 'boss_lich',
  desert_scarab_lord: 'boss_demon_king',
  grave_necrolord: 'boss_lich',
  isles_pine_spirit: 'earth_golem',
  isles_sakura_lady: 'boss_lich',
  isles_kitsune_miko: 'boss_lich',
  isles_jade_oni: 'earth_golem',
  isles_shogun: 'boss_demon_king',
  isles_samurai_lord: 'abyss_knight',
  snow_frost_tiger: 'boss_wolf',
  snow_glacier_wyrm: 'abyss_dragon',
  ruins_cauldron_golem: 'earth_golem',
  ruins_crimson_seraph: 'gale_sentinel',
  ruins_red_blademaster: 'abyss_knight',
  ruins_iron_colossus: 'earth_golem',
  ruins_shadow_paladin: 'boss_demon_king',
  sky_celestial_warden: 'gale_sentinel',
  sky_archangel: 'gale_sentinel',
  world_overlord: 'boss_demon_king',
}

export function resolveHeroSheetSpec(jobId?: string | null): SpriteSheetSpec | null {
  if (!jobId) return null
  const sheetId = JOB_TO_HERO_SHEET[jobId]
  return sheetId ? HERO_SPRITE_SHEETS[sheetId] : null
}

export function resolveMonsterSheetSpec(
  defId?: string | null,
  spriteFallback?: string | null,
): SpriteSheetSpec | null {
  if (defId && defId in MONSTER_ID_TO_SHEET) {
    const mapped = MONSTER_ID_TO_SHEET[defId]
    return mapped ? MONSTER_SPRITE_SHEETS[mapped] : null
  }
  if (spriteFallback && spriteFallback in MONSTER_ID_TO_SHEET) {
    const mapped = MONSTER_ID_TO_SHEET[spriteFallback]
    return mapped ? MONSTER_SPRITE_SHEETS[mapped] : null
  }
  if (spriteFallback && spriteFallback in MONSTER_SPRITE_SHEETS) {
    return MONSTER_SPRITE_SHEETS[spriteFallback as MonsterSheetId]
  }
  return null
}

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
  for (const spec of Object.values(HERO_SPRITE_SHEETS)) {
    getSheetImage(spec.sheetPath)
  }
  for (const spec of Object.values(MONSTER_SPRITE_SHEETS)) {
    getSheetImage(spec.sheetPath)
  }
  for (const spec of Object.values(NPC_SPRITE_SHEETS)) {
    getSheetImage(spec.sheetPath)
  }
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
  preloadAllSpriteSheets()
  const img = getSheetImage(spec.sheetPath)
  if (!img) return null

  const safeRow = Math.max(0, Math.min(spec.rows - 1, row))
  const safeCol = Math.max(0, Math.min(spec.cols - 1, col))
  const key = `${spec.id}|${safeRow}|${safeCol}|${flipX ? 1 : 0}`
  const existing = slicedFrameCache.get(key)
  if (existing) return existing

  const canvas = document.createElement('canvas')
  canvas.width = spec.frameWidth
  canvas.height = spec.frameHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const sx = safeCol * spec.frameWidth
  const sy = safeRow * spec.frameHeight

  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
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
  return canvas
}

export function getHeroSheetFrame(
  jobId: string | undefined,
  dir: Dir,
  action: SpriteAction,
  frame: number,
): HTMLCanvasElement | null {
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
  // On idle, alternate calmly between frame 0 and 1 (or 0 on blink -1)
  const col =
    action === 'idle'
      ? frame < 0
        ? 0
        : frame % 2 === 1
          ? 1
          : 0
      : Math.abs(frame) % rowSpec.frames

  return sliceSheetFrame(spec, rowSpec.row, col, flipX)
}

export function getMonsterSheetFrame(
  defId: string | undefined,
  spriteFallback: string | undefined,
  dir: Dir,
  action: SpriteAction,
  frame: number,
): HTMLCanvasElement | null {
  const spec = resolveMonsterSheetSpec(defId, spriteFallback)
  if (!spec) return null

  let rowKey: string
  let flipX = false

  if (action === 'attack' || action === 'skill') {
    rowKey = 'attack'
    flipX = dir === 'right'
  } else if (dir === 'right') {
    rowKey = 'walk_right'
  } else {
    rowKey = 'walk_left'
  }

  const rowSpec = spec.actions[rowKey] ?? spec.actions.walk_left
  const col =
    action === 'idle'
      ? Math.abs(frame) % 2
      : Math.abs(frame) % rowSpec.frames

  return sliceSheetFrame(spec, rowSpec.row, col, flipX)
}
