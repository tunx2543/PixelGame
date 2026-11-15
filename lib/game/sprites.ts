import type { MonsterSprite, WeaponType } from './data'
import { T, TILE, type MapDef } from './maps'
import {
  getJobModelSpec,
  getMonsterModelSpec,
  type ArmorStyle,
  type HatStyle as RegistryHatStyle,
} from './models-2d'

const OUTLINE = '#1a1423'

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6)
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return [
    Number.isFinite(r) ? r : 128,
    Number.isFinite(g) ? g : 128,
    Number.isFinite(b) ? b : 128,
  ]
}

export function shade(hex: string, amt: number) {
  const [r, g, b] = hexToRgb(hex)
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)))
  return `#${[f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return { c, ctx }
}

function renderTemplate(rows: string[], palette: Record<string, string>, outline = true) {
  const w = Math.max(...rows.map((r) => r.length))
  const h = rows.length
  const pad = outline ? 1 : 0
  const { c, ctx } = makeCanvas(w + pad * 2, h + pad * 2)
  const filled: boolean[][] = Array.from({ length: h + pad * 2 }, () => Array(w + pad * 2).fill(false))
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      const col = palette[ch]
      if (!col) continue
      filled[y + pad][x + pad] = true
    }
  })
  if (outline) {
    ctx.fillStyle = OUTLINE
    for (let y = 0; y < filled.length; y++)
      for (let x = 0; x < filled[0].length; x++) {
        if (filled[y][x]) continue
        const n =
          filled[y - 1]?.[x] || filled[y + 1]?.[x] || filled[y]?.[x - 1] || filled[y]?.[x + 1]
        if (n) ctx.fillRect(x, y, 1, 1)
      }
  }
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = palette[row[x]]
      if (!col) continue
      ctx.fillStyle = col
      ctx.fillRect(x + pad, y + pad, 1, 1)
    }
  })
  return c
}

class PixelSurface {
  readonly w: number
  readonly h: number
  private grid: (string | null)[][]

  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.grid = Array.from({ length: h }, () => Array<string | null>(w).fill(null))
  }

  px(x: number, y: number, color: string) {
    const ix = Math.round(x)
    const iy = Math.round(y)
    if (ix >= 0 && ix < this.w && iy >= 0 && iy < this.h) {
      this.grid[iy][ix] = color
    }
  }

  rect(x: number, y: number, w: number, h: number, color: string) {
    const x0 = Math.round(x)
    const y0 = Math.round(y)
    const iw = Math.round(w)
    const ih = Math.round(h)
    for (let dy = 0; dy < ih; dy++) {
      for (let dx = 0; dx < iw; dx++) {
        this.px(x0 + dx, y0 + dy, color)
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, color: string, thick = 1) {
    let ix0 = Math.round(x0)
    let iy0 = Math.round(y0)
    const ix1 = Math.round(x1)
    const iy1 = Math.round(y1)
    const dx = Math.abs(ix1 - ix0)
    const dy = Math.abs(iy1 - iy0)
    const sx = ix0 < ix1 ? 1 : -1
    const sy = iy0 < iy1 ? 1 : -1
    let err = dx - dy
    while (true) {
      this.px(ix0, iy0, color)
      if (thick >= 2) {
        if (dx >= dy) this.px(ix0, iy0 + 1, color)
        else this.px(ix0 + 1, iy0, color)
      }
      if (ix0 === ix1 && iy0 === iy1) break
      const e2 = 2 * err
      if (e2 > -dy) { err -= dy; ix0 += sx }
      if (e2 < dx) { err += dx; iy0 += sy }
    }
  }

  toCanvas(outline = true, mirrorX = false): HTMLCanvasElement {
    const { c, ctx } = makeCanvas(this.w, this.h)
    const get = (x: number, y: number) => {
      const sx = mirrorX ? this.w - 1 - x : x
      return this.grid[y]?.[sx] ?? null
    }
    if (outline) {
      ctx.fillStyle = OUTLINE
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          if (get(x, y)) continue
          if (get(x - 1, y) || get(x + 1, y) || get(x, y - 1) || get(x, y + 1)) {
            ctx.fillRect(x, y, 1, 1)
          }
        }
      }
    }
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const col = get(x, y)
        if (!col) continue
        ctx.fillStyle = col
        ctx.fillRect(x, y, 1, 1)
      }
    }
    return c
  }
}

const cache = new Map<string, HTMLCanvasElement>()
const gmOutfitCache = new Map<string, HTMLImageElement>()
const npcSpriteCache = new Map<string, HTMLImageElement>()
const rebirthAuraCache = new Map<string, HTMLImageElement>()

export function rebirthAuraSprite(dir: Dir): HTMLImageElement | null {
  const direction = dir === 'down' ? 'south' : dir === 'up' ? 'north' : dir === 'left' ? 'west' : 'east'
  let image = rebirthAuraCache.get(direction)
  if (!image) {
    image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ground-sigil-jQzDvfBW2V54R6DRMeDoP55hG7byck.gif'
    rebirthAuraCache.set(direction, image)
  }
  return image.complete && image.naturalWidth > 0 ? image : null
}

export function npcSprite(id: string): HTMLImageElement | null {
  let image = npcSpriteCache.get(id)
  if (!image) {
    image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = `/images/npcs/${id}.png`
    npcSpriteCache.set(id, image)
  }
  return image.complete && image.naturalWidth > 0 ? image : null
}

type GmAnimation = 'idle' | 'walk' | 'attack'

export function gmOutfitSprite(dir: Dir, animation: GmAnimation = 'idle'): HTMLImageElement | null {
  const direction = dir === 'down' ? 'south' : dir === 'up' ? 'north' : dir === 'left' ? 'west' : 'east'
  const key = `gm-${animation}-${direction}`
  let image = gmOutfitCache.get(key)
  if (!image) {
    image = new Image()
    image.crossOrigin = 'anonymous'
    const useWalk = animation === 'walk' && direction === 'south'
    const filename = animation === 'attack' ? `attack-${direction}.gif` : useWalk ? 'walk-south.gif' : `outfit-${direction}.png`
    image.src = `/images/characters/gm/${filename}`
    gmOutfitCache.set(key, image)
  }
  return image.complete && image.naturalWidth > 0 ? image : null
}

function cached(key: string, make: () => HTMLCanvasElement) {
  let c = cache.get(key)
  if (!c) {
    c = make()
    cache.set(key, c)
  }
  return c
}

/* ---------------- Articulated Humanoids (All 12 Jobs) ---------------- */

export type Dir = 'down' | 'up' | 'left' | 'right'
export type SpriteAction = 'idle' | 'walk' | 'attack'
export type HatStyle = RegistryHatStyle

export interface HumanColors {
  jobId?: string
  hair: string
  body: string
  legs: string
  accent: string
  skin?: string
  hat?: string
  hatStyle?: HatStyle
  armorStyle?: ArmorStyle
  cape?: string
  scarf?: string
  shieldColor?: string
  shieldCrest?: string
  wings?: boolean
  wingStyle?: 'angel' | 'seraph' | 'none'
  halo?: boolean
  quiver?: boolean
  backpack?: boolean
  shoulderPads?: boolean
  dualDaggers?: boolean
  horns?: boolean
  goblinEars?: boolean
  skeleton?: boolean
  eye?: string
  auraColor?: string
}

export function jobHumanColors(
  jobId: string,
  base: { hair: string; body: string; legs: string; accent: string; skin?: string; hat?: string },
  isGm = false,
): HumanColors {
  const effectiveJobId = isGm ? 'gm' : jobId
  const spec = getJobModelSpec(effectiveJobId)
  return {
    ...base,
    jobId: effectiveJobId,
    hat: spec.hatColor ?? base.hat,
    hatStyle: spec.hatStyle,
    armorStyle: spec.armorStyle,
    cape: spec.capeColor,
    scarf: spec.scarfColor,
    shieldColor: spec.shieldColor,
    shieldCrest: spec.shieldCrestColor,
    wings: spec.wings,
    wingStyle: spec.wingStyle,
    halo: spec.halo,
    quiver: spec.quiver,
    backpack: spec.backpack,
    shoulderPads: spec.shoulderPads,
    dualDaggers: spec.dualDaggers,
    auraColor: spec.auraColor,
  }
}

interface Pt {
  x: number
  y: number
}

function drawWeaponInHand(
  s: PixelSurface,
  hand: Pt,
  weapon: WeaponType | null,
  weaponColor: string,
  angleRad: number,
  action: SpriteAction,
  atkF: number,
  drawHandPoint?: Pt,
  jobId?: string,
) {
  if (!weapon) return
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  const perpX = -sin
  const perpY = cos
  const hilt = '#7f5539'
  const guard = jobId === 'paladin' || jobId === 'gm' ? '#ffd60a' : '#e9c46a'
  const bladeHi = shade(weaponColor, 0.38)
  const bladeDark = shade(weaponColor, -0.25)

  if (weapon === 'sword') {
    const isHeavy = jobId === 'knight' || jobId === 'paladin'
    const bladeLen = isHeavy ? 9 : 8
    s.px(hand.x - cos, hand.y - sin, hilt)
    s.px(hand.x + cos + perpX, hand.y + sin + perpY, guard)
    s.px(hand.x + cos, hand.y + sin, guard)
    s.px(hand.x + cos - perpX, hand.y + sin - perpY, guard)
    const tipX = hand.x + cos * bladeLen
    const tipY = hand.y + sin * bladeLen
    s.line(hand.x + cos * 2, hand.y + sin * 2, tipX, tipY, weaponColor, isHeavy ? 2 : 1)
    if (isHeavy) {
      s.line(hand.x + cos * 2, hand.y + sin * 2, hand.x + cos * (bladeLen - 1), hand.y + sin * (bladeLen - 1), bladeHi, 1)
    }
    s.px(tipX, tipY, '#ffffff')
    if (action === 'attack' && (atkF === 1 || atkF === 2)) {
      s.px(tipX + cos, tipY + sin, '#ffffff')
      s.px(hand.x + cos * (bladeLen - 2) + perpX, hand.y + sin * (bladeLen - 2) + perpY, bladeHi)
    }
    return
  }

  if (weapon === 'dagger') {
    s.px(hand.x - cos, hand.y - sin, hilt)
    s.px(hand.x + perpX, hand.y + perpY, guard)
    s.px(hand.x - perpX, hand.y - perpY, guard)
    const tipX = hand.x + cos * 5
    const tipY = hand.y + sin * 5
    s.line(hand.x + cos, hand.y + sin, tipX, tipY, weaponColor, 1)
    s.px(hand.x + cos * 3 + perpX * 0.5, hand.y + sin * 3 + perpY * 0.5, bladeDark)
    s.px(tipX, tipY, bladeHi)
    if (action === 'attack' && (atkF === 1 || atkF === 2)) {
      s.px(tipX + cos, tipY + sin, '#ffffff')
    }
    return
  }

  if (weapon === 'stick') {
    const tipX = hand.x + cos * 7
    const tipY = hand.y + sin * 7
    s.line(hand.x - cos * 2, hand.y - sin * 2, tipX, tipY, weaponColor, 1)
    s.px(tipX, tipY, shade(weaponColor, -0.25))
    s.px(tipX + perpX, tipY + perpY, '#80ed99')
    return
  }

  if (weapon === 'staff') {
    const len = jobId === 'wizard' || jobId === 'gm' || jobId === 'cleric' ? 8 : 7
    const shaftStart = { x: hand.x - cos * 3, y: hand.y - sin * 3 }
    const orbCenter = { x: hand.x + cos * len, y: hand.y + sin * len }
    s.line(shaftStart.x, shaftStart.y, orbCenter.x - cos, orbCenter.y - sin, jobId === 'cleric' || jobId === 'gm' ? '#e9c46a' : hilt, 1)
    // Ornate staff head by job
    if (jobId === 'cleric') {
      s.line(orbCenter.x - perpX * 2, orbCenter.y - perpY * 2, orbCenter.x + perpX * 2, orbCenter.y + perpY * 2, '#ffd60a', 1)
      s.line(orbCenter.x - cos, orbCenter.y - sin, orbCenter.x + cos * 2, orbCenter.y + sin * 2, '#ffd60a', 1)
      s.px(orbCenter.x, orbCenter.y, '#80ed99')
    } else {
      s.px(orbCenter.x, orbCenter.y, '#ffffff')
      s.px(orbCenter.x + cos, orbCenter.y + sin, weaponColor)
      s.px(orbCenter.x + perpX, orbCenter.y + perpY, bladeHi)
      s.px(orbCenter.x - perpX, orbCenter.y - perpY, weaponColor)
    }
    if (action === 'attack' && (atkF === 1 || atkF === 2)) {
      s.px(orbCenter.x + cos * 2, orbCenter.y + sin * 2, '#fff3b0')
      s.px(orbCenter.x + perpX * 2, orbCenter.y + perpY * 2, bladeHi)
    }
    return
  }

  if (weapon === 'bow') {
    const limbSpan = jobId === 'hunter' ? 5 : 4
    const topTip = { x: hand.x - cos * 1 + perpX * limbSpan, y: hand.y - sin * 1 + perpY * limbSpan }
    const botTip = { x: hand.x - cos * 1 - perpX * limbSpan, y: hand.y - sin * 1 - perpY * limbSpan }
    const midOuter = { x: hand.x + cos * 2, y: hand.y + sin * 2 }
    s.line(topTip.x, topTip.y, midOuter.x + perpX * 2, midOuter.y + perpY * 2, weaponColor, 1)
    s.line(midOuter.x + perpX * 2, midOuter.y + perpY * 2, midOuter.x - perpX * 2, midOuter.y - perpY * 2, weaponColor, 1)
    s.line(midOuter.x - perpX * 2, midOuter.y - perpY * 2, botTip.x, botTip.y, weaponColor, 1)
    if (jobId === 'hunter') {
      s.px(topTip.x, topTip.y, '#ffd60a')
      s.px(botTip.x, botTip.y, '#ffd60a')
    }

    const pull = drawHandPoint ?? { x: hand.x - cos * 2, y: hand.y - sin * 2 }
    if (action === 'attack' && atkF === 1) {
      s.line(topTip.x, topTip.y, pull.x, pull.y, '#e2e8f0', 1)
      s.line(botTip.x, botTip.y, pull.x, pull.y, '#e2e8f0', 1)
      s.line(pull.x, pull.y, hand.x + cos * 5, hand.y + sin * 5, '#f8fafc', 1)
      s.px(hand.x + cos * 5, hand.y + sin * 5, '#ffd60a')
    } else {
      s.line(topTip.x, topTip.y, botTip.x, botTip.y, '#e2e8f0', 1)
      if (action === 'attack' && atkF === 2) {
        s.line(hand.x + cos * 2, hand.y + sin * 2, hand.x + cos * 8, hand.y + sin * 8, '#f8fafc', 1)
        s.px(hand.x + cos * 8, hand.y + sin * 8, '#ffd60a')
      }
    }
  }
}

function drawLeg(
  s: PixelSurface,
  hip: Pt,
  knee: Pt,
  foot: Pt,
  legCol: string,
  bootCol: string,
  footDirX = 1,
) {
  s.line(hip.x, hip.y, knee.x, knee.y, legCol, 2)
  s.line(knee.x, knee.y, foot.x, foot.y, legCol, 2)
  s.px(foot.x, foot.y, bootCol)
  s.px(foot.x + footDirX, foot.y, bootCol)
  s.px(foot.x, foot.y - 1, shade(bootCol, 0.22))
}

function drawArm(
  s: PixelSurface,
  shoulder: Pt,
  elbow: Pt,
  hand: Pt,
  sleeveCol: string,
  handCol: string,
) {
  s.line(shoulder.x, shoulder.y, elbow.x, elbow.y, sleeveCol, 2)
  s.line(elbow.x, elbow.y, hand.x, hand.y, sleeveCol, 1)
  s.px(hand.x, hand.y, handCol)
  s.px(hand.x, hand.y + 1, shade(handCol, -0.15))
}

function drawHatOrHair(
  s: PixelSurface,
  cx: number,
  headTopY: number,
  dir: 'down' | 'up' | 'side',
  colors: HumanColors,
) {
  const hairCol = colors.hair
  const hairDark = shade(hairCol, -0.25)
  const hairHi = shade(hairCol, 0.2)
  const hatCol = colors.hat ?? colors.accent
  const hatDark = shade(hatCol, -0.3)
  const hatHi = shade(hatCol, 0.24)
  const style = colors.hatStyle ?? (colors.hat ? 'wizard' : 'none')

  if (style === 'none') {
    if (dir === 'side') {
      s.rect(cx - 3, headTopY - 1, 6, 2, hairCol)
      s.px(cx, headTopY - 2, hairHi)
      s.rect(cx - 4, headTopY, 2, 4, hairDark)
      s.px(cx + 2, headTopY, hairCol)
    } else if (dir === 'down') {
      s.rect(cx - 3, headTopY - 1, 7, 2, hairCol)
      s.px(cx, headTopY - 2, hairHi)
      s.px(cx - 4, headTopY + 1, hairDark)
      s.px(cx + 4, headTopY + 1, hairDark)
    } else {
      s.rect(cx - 3, headTopY - 1, 7, 5, hairCol)
      s.rect(cx - 3, headTopY + 3, 7, 1, hairDark)
    }
    return
  }

  if (style === 'wizard' || style === 'archmage') {
    const brimW = style === 'archmage' ? 12 : 10
    s.rect(cx - Math.floor(brimW / 2), headTopY + 1, brimW, 1, hatDark)
    s.rect(cx - 3, headTopY - 1, 7, 2, hatCol)
    s.rect(cx - 2, headTopY - 3, 5, 2, hatCol)
    s.rect(cx - 1, headTopY - 5, 3, 2, hatHi)
    s.px(dir === 'side' ? cx - 2 : cx, headTopY - 6, style === 'archmage' ? '#67e8f9' : hatCol)
    s.rect(cx - 3, headTopY, 7, 1, colors.accent)
    if (style === 'archmage') {
      s.px(cx, headTopY - 2, '#fff3b0')
    }
    return
  }

  if (style === 'hood' || style === 'ranger_hood') {
    s.rect(cx - 4, headTopY - 1, 9, 2, hatCol)
    s.px(cx, headTopY - 2, hatHi)
    if (dir === 'side') {
      s.rect(cx - 4, headTopY, 3, 5, hatDark)
    } else if (dir === 'up') {
      s.rect(cx - 4, headTopY, 9, 5, hatCol)
    } else {
      s.px(cx - 4, headTopY + 1, hatDark)
      s.px(cx + 4, headTopY + 1, hatDark)
    }
    // Feather on archer/hunter hood
    const featherCol = style === 'ranger_hood' ? '#ffb703' : '#e9f5db'
    s.line(cx - 2, headTopY - 1, cx - 4, headTopY - 4, featherCol, 1)
    if (style === 'ranger_hood') {
      s.px(cx - 4, headTopY - 5, '#fb8500')
    }
    return
  }

  if (style === 'cowl') {
    // Ninja Assassin cowl + headband crest
    s.rect(cx - 3, headTopY - 1, 7, 2, hatCol)
    s.rect(cx - 3, headTopY, 7, 1, colors.accent)
    if (dir === 'side') {
      s.rect(cx - 4, headTopY, 3, 5, hatDark)
      s.rect(cx - 1, headTopY + 4, 4, 2, colors.scarf ?? '#e63946')
    } else if (dir === 'up') {
      s.rect(cx - 3, headTopY, 7, 6, hatCol)
    } else {
      s.rect(cx - 3, headTopY + 4, 7, 2, colors.scarf ?? '#e63946')
    }
    s.px(cx, headTopY, '#ffd60a')
    return
  }

  if (style === 'helm' || style === 'paladin_helm') {
    s.rect(cx - 4, headTopY - 1, 9, 3, hatCol)
    s.rect(cx - 3, headTopY - 2, 7, 1, hatHi)
    const plumeCol = style === 'paladin_helm' ? '#3a86ff' : colors.accent
    s.rect(cx - 1, headTopY - 4, 3, 2, plumeCol)
    s.px(dir === 'side' ? cx - 2 : cx, headTopY - 5, shade(plumeCol, 0.25))
    if (dir === 'side') {
      s.rect(cx - 4, headTopY + 1, 2, 4, hatDark)
      if (style === 'paladin_helm') s.px(cx + 3, headTopY + 2, '#ffd60a')
    } else if (dir === 'up') {
      s.rect(cx - 4, headTopY + 1, 9, 4, hatDark)
    } else {
      s.px(cx - 3, headTopY + 2, hatDark)
      s.px(cx + 3, headTopY + 2, hatDark)
      if (style === 'paladin_helm') s.px(cx, headTopY + 1, '#ffd60a')
    }
    return
  }

  if (style === 'crown') {
    s.rect(cx - 3, headTopY, 7, dir === 'up' ? 5 : 2, hairCol)
    s.rect(cx - 3, headTopY - 1, 7, 1, '#ffd60a')
    s.px(cx - 3, headTopY - 2, '#ffd60a')
    s.px(cx - 1, headTopY - 2, '#fff3b0')
    s.px(cx + 1, headTopY - 2, '#fff3b0')
    s.px(cx + 3, headTopY - 2, '#ffd60a')
    s.px(cx, headTopY - 3, '#ff4d6d')
    return
  }

  if (style === 'mitre') {
    s.rect(cx - 3, headTopY - 1, 7, 2, hatCol)
    s.rect(cx - 2, headTopY - 4, 5, 3, hatCol)
    s.line(cx, headTopY - 3, cx, headTopY, '#ffd60a', 1)
    s.line(cx - 1, headTopY - 2, cx + 1, headTopY - 2, '#ffd60a', 1)
    return
  }

  // bandana (Swordsman / Thief)
  s.rect(cx - 3, headTopY - 1, 7, 2, hairCol)
  s.rect(cx - 4, headTopY, 9, 1, hatCol)
  if (dir === 'side') {
    s.line(cx - 4, headTopY, cx - 6, headTopY + 2, hatCol, 1)
  } else if (dir === 'up') {
    s.line(cx, headTopY + 1, cx - 2, headTopY + 3, hatCol, 1)
    s.line(cx + 1, headTopY + 1, cx + 3, headTopY + 3, hatCol, 1)
  }
}

export function humanSprite(
  colors: HumanColors,
  dir: Dir,
  frame: number,
  weapon: WeaponType | null = null,
  weaponColor = '#ced4da',
  attacking = false,
  actionOverride?: SpriteAction,
  attackFrameOverride?: number,
) {
  const action: SpriteAction = attacking ? 'attack' : actionOverride ?? (frame > 0 ? 'walk' : 'idle')
  const f = action === 'attack'
    ? Math.abs(attackFrameOverride ?? frame) % 4
    : action === 'walk'
      ? Math.abs(frame) % 6
      : frame === -1
        ? -1
        : Math.abs(frame) % 4

  const key = `ha32|${JSON.stringify(colors)}|${dir}|${action}|${f}|${weapon ?? 'none'}|${weaponColor}`
  return cached(key, () => {
    const W = 32
    const H = 30
    const s = new PixelSurface(W, H)

    const skin = colors.skin ?? '#f1c27d'
    const skinDark = shade(skin, -0.22)
    const body = colors.body
    const bodyDark = shade(body, -0.26)
    const bodyHi = shade(body, 0.2)
    const legCol = colors.legs
    const legDark = shade(legCol, -0.26)
    const bootCol = colors.armorStyle === 'plate' || colors.armorStyle === 'paladin_plate' ? '#64748b' : '#3b281c'
    const bootDark = shade(bootCol, -0.28)
    const eyeCol = colors.eye ?? '#1a1423'
    const blink = !attacking && f === -1

    const cx = 15
    const footY = 27
    const hipY = 20

    if (dir === 'left' || dir === 'right') {
      let bob = 0
      let lean = 0
      let backHip: Pt = { x: cx - 1, y: hipY }
      let backKnee: Pt = { x: cx - 1, y: 23 }
      let backFoot: Pt = { x: cx - 1, y: footY }
      let frontHip: Pt = { x: cx, y: hipY }
      let frontKnee: Pt = { x: cx, y: 23 }
      let frontFoot: Pt = { x: cx, y: footY }

      let backElbow: Pt = { x: cx + 1, y: 17 }
      let backHand: Pt = { x: cx + 2, y: 19 }
      let frontElbow: Pt = { x: cx - 1, y: 17 }
      let frontHand: Pt = { x: cx, y: 19 }
      let weaponAngle = -0.35

      if (action === 'idle') {
        const breath = f === 1 ? 1 : f === 3 ? 0 : 0
        bob = breath
        backHip = { x: cx - 1, y: hipY + breath }
        backKnee = { x: cx - 2, y: 23 }
        backFoot = { x: cx - 2, y: footY }
        frontHip = { x: cx + 1, y: hipY + breath }
        frontKnee = { x: cx + 1, y: 23 }
        frontFoot = { x: cx + 1, y: footY }
        backElbow = { x: cx + 2, y: 16 + breath }
        backHand = { x: cx + 3, y: 18 + breath }
        frontElbow = { x: cx - 1, y: 17 + breath }
        frontHand = { x: cx + 1, y: 19 + breath }
        weaponAngle = weapon === 'staff' ? -1.4 : weapon === 'bow' ? 0 : -0.6
      } else if (action === 'walk') {
        const walkFrames: Array<{
          bob: number; lean: number
          bk: Pt; bf: Pt; fk: Pt; ff: Pt
          be: Pt; bh: Pt; fe: Pt; fh: Pt; wa: number
        }> = [
          { bob: 0, lean: 1, bk: { x: cx - 2, y: 24 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 2, y: 24 }, ff: { x: cx + 3, y: footY }, be: { x: cx + 2, y: 17 }, bh: { x: cx + 4, y: 18 }, fe: { x: cx - 2, y: 17 }, fh: { x: cx - 4, y: 19 }, wa: 0.35 },
          { bob: -1, lean: 1, bk: { x: cx, y: 22 }, bf: { x: cx - 2, y: footY - 2 }, fk: { x: cx, y: 24 }, ff: { x: cx, y: footY }, be: { x: cx + 1, y: 16 }, bh: { x: cx + 2, y: 18 }, fe: { x: cx - 1, y: 16 }, fh: { x: cx - 1, y: 18 }, wa: -0.1 },
          { bob: 0, lean: 1, bk: { x: cx + 3, y: 23 }, bf: { x: cx + 2, y: footY - 1 }, fk: { x: cx - 1, y: 24 }, ff: { x: cx - 3, y: footY }, be: { x: cx - 2, y: 17 }, bh: { x: cx - 4, y: 19 }, fe: { x: cx + 2, y: 17 }, fh: { x: cx + 4, y: 18 }, wa: -0.6 },
          { bob: 0, lean: 1, bk: { x: cx + 2, y: 24 }, bf: { x: cx + 3, y: footY }, fk: { x: cx - 2, y: 24 }, ff: { x: cx - 4, y: footY }, be: { x: cx - 2, y: 17 }, bh: { x: cx - 4, y: 19 }, fe: { x: cx + 2, y: 17 }, fh: { x: cx + 4, y: 18 }, wa: -0.8 },
          { bob: -1, lean: 1, bk: { x: cx, y: 24 }, bf: { x: cx, y: footY }, fk: { x: cx, y: 22 }, ff: { x: cx - 2, y: footY - 2 }, be: { x: cx + 1, y: 16 }, bh: { x: cx + 1, y: 18 }, fe: { x: cx, y: 16 }, fh: { x: cx, y: 18 }, wa: -0.35 },
          { bob: 0, lean: 1, bk: { x: cx - 1, y: 24 }, bf: { x: cx - 3, y: footY }, fk: { x: cx + 3, y: 23 }, ff: { x: cx + 2, y: footY - 1 }, be: { x: cx + 2, y: 17 }, bh: { x: cx + 4, y: 18 }, fe: { x: cx - 2, y: 17 }, fh: { x: cx - 4, y: 19 }, wa: 0.2 },
        ]
        const wf = walkFrames[f]
        bob = wf.bob; lean = wf.lean
        backHip = { x: cx - 1 + lean, y: hipY + bob }; backKnee = wf.bk; backFoot = wf.bf
        frontHip = { x: cx + 1 + lean, y: hipY + bob }; frontKnee = wf.fk; frontFoot = wf.ff
        backElbow = wf.be; backHand = wf.bh
        frontElbow = wf.fe; frontHand = wf.fh
        weaponAngle = weapon === 'staff' ? wf.wa - 0.7 : weapon === 'bow' ? wf.wa * 0.25 : wf.wa
      } else {
        if (weapon === 'bow') {
          const bowAtk = [
            { bob: 0, lean: 0, bk: { x: cx - 2, y: 24 }, bf: { x: cx - 3, y: footY }, fk: { x: cx + 2, y: 24 }, ff: { x: cx + 3, y: footY }, be: { x: cx + 3, y: 15 }, bh: { x: cx + 5, y: 15 }, fe: { x: cx + 1, y: 15 }, fh: { x: cx + 3, y: 15 }, wa: 0 },
            { bob: 1, lean: -1, bk: { x: cx - 3, y: 24 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 2, y: 24 }, ff: { x: cx + 3, y: footY }, be: { x: cx + 3, y: 15 }, bh: { x: cx + 6, y: 15 }, fe: { x: cx - 2, y: 15 }, fh: { x: cx - 3, y: 15 }, wa: 0 },
            { bob: 0, lean: 1, bk: { x: cx - 3, y: 24 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 3, y: 24 }, ff: { x: cx + 4, y: footY }, be: { x: cx + 3, y: 15 }, bh: { x: cx + 7, y: 15 }, fe: { x: cx - 3, y: 15 }, fh: { x: cx - 4, y: 15 }, wa: 0 },
            { bob: 0, lean: 0, bk: { x: cx - 2, y: 24 }, bf: { x: cx - 3, y: footY }, fk: { x: cx + 2, y: 24 }, ff: { x: cx + 3, y: footY }, be: { x: cx + 2, y: 16 }, bh: { x: cx + 4, y: 17 }, fe: { x: cx - 1, y: 16 }, fh: { x: cx + 1, y: 17 }, wa: 0.1 },
          ][f]
          bob = bowAtk.bob; lean = bowAtk.lean
          backHip = { x: cx - 1 + lean, y: hipY + bob }; backKnee = bowAtk.bk; backFoot = bowAtk.bf
          frontHip = { x: cx + 1 + lean, y: hipY + bob }; frontKnee = bowAtk.fk; frontFoot = bowAtk.ff
          backElbow = bowAtk.be; backHand = bowAtk.bh
          frontElbow = bowAtk.fe; frontHand = bowAtk.fh
          weaponAngle = bowAtk.wa
        } else if (weapon === 'staff') {
          const staffAtk = [
            { bob: 1, lean: -1, bk: { x: cx - 2, y: 24 }, bf: { x: cx - 3, y: footY }, fk: { x: cx + 2, y: 24 }, ff: { x: cx + 3, y: footY }, be: { x: cx + 1, y: 13 }, bh: { x: cx + 1, y: 10 }, fe: { x: cx - 1, y: 13 }, fh: { x: cx, y: 11 }, wa: -1.6 },
            { bob: 0, lean: 1, bk: { x: cx - 3, y: 24 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 3, y: 24 }, ff: { x: cx + 4, y: footY }, be: { x: cx + 3, y: 14 }, bh: { x: cx + 5, y: 13 }, fe: { x: cx + 2, y: 14 }, fh: { x: cx + 4, y: 14 }, wa: -0.7 },
            { bob: 1, lean: 2, bk: { x: cx - 3, y: 24 }, bf: { x: cx - 5, y: footY }, fk: { x: cx + 4, y: 24 }, ff: { x: cx + 5, y: footY }, be: { x: cx + 4, y: 16 }, bh: { x: cx + 7, y: 15 }, fe: { x: cx + 4, y: 15 }, fh: { x: cx + 7, y: 15 }, wa: -0.1 },
            { bob: 0, lean: 1, bk: { x: cx - 2, y: 24 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 3, y: 24 }, ff: { x: cx + 4, y: footY }, be: { x: cx + 3, y: 17 }, bh: { x: cx + 4, y: 18 }, fe: { x: cx + 2, y: 17 }, fh: { x: cx + 4, y: 18 }, wa: -0.9 },
          ][f]
          bob = staffAtk.bob; lean = staffAtk.lean
          backHip = { x: cx - 1 + lean, y: hipY + bob }; backKnee = staffAtk.bk; backFoot = staffAtk.bf
          frontHip = { x: cx + 1 + lean, y: hipY + bob }; frontKnee = staffAtk.fk; frontFoot = staffAtk.ff
          backElbow = staffAtk.be; backHand = staffAtk.bh
          frontElbow = staffAtk.fe; frontHand = staffAtk.fh
          weaponAngle = staffAtk.wa
        } else {
          const meleeAtk = [
            { bob: 1, lean: -1, bk: { x: cx - 2, y: 24 }, bf: { x: cx - 3, y: footY }, fk: { x: cx + 2, y: 24 }, ff: { x: cx + 3, y: footY }, be: { x: cx + 3, y: 16 }, bh: { x: cx + 5, y: 17 }, fe: { x: cx - 2, y: 13 }, fh: { x: cx - 4, y: 10 }, wa: -2.2 },
            { bob: 0, lean: 1, bk: { x: cx - 3, y: 24 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 3, y: 24 }, ff: { x: cx + 5, y: footY }, be: { x: cx + 1, y: 17 }, bh: { x: cx - 1, y: 18 }, fe: { x: cx + 3, y: 13 }, fh: { x: cx + 6, y: 13 }, wa: -0.45 },
            { bob: 1, lean: 2, bk: { x: cx - 3, y: 24 }, bf: { x: cx - 5, y: footY }, fk: { x: cx + 4, y: 24 }, ff: { x: cx + 6, y: footY }, be: { x: cx + (weapon === 'dagger' ? 5 : -1), y: 17 }, bh: { x: cx + (weapon === 'dagger' ? 7 : -3), y: 17 }, fe: { x: cx + 4, y: 16 }, fh: { x: cx + 8, y: 16 }, wa: 0.25 },
            { bob: 0, lean: 1, bk: { x: cx - 2, y: 24 }, bf: { x: cx - 3, y: footY }, fk: { x: cx + 3, y: 24 }, ff: { x: cx + 4, y: footY }, be: { x: cx + 2, y: 17 }, bh: { x: cx + 3, y: 19 }, fe: { x: cx + 3, y: 17 }, fh: { x: cx + 5, y: 19 }, wa: 0.75 },
          ][f]
          bob = meleeAtk.bob; lean = meleeAtk.lean
          backHip = { x: cx - 1 + lean, y: hipY + bob }; backKnee = meleeAtk.bk; backFoot = meleeAtk.bf
          frontHip = { x: cx + 1 + lean, y: hipY + bob }; frontKnee = meleeAtk.fk; frontFoot = meleeAtk.ff
          backElbow = meleeAtk.be; backHand = meleeAtk.bh
          frontElbow = meleeAtk.fe; frontHand = meleeAtk.fh
          weaponAngle = meleeAtk.wa
        }
      }

      const bx = cx + lean
      const by = 14 + bob

      // Quiver on back for Archer/Hunter
      if (colors.quiver) {
        s.line(bx - 3, by - 1, bx - 5, by + 5, '#7f5539', 2)
        s.px(bx - 4, by - 2, '#f8fafc')
        s.px(bx - 2, by - 2, '#ffd60a')
      }

      // Backpack for Novice
      if (colors.backpack) {
        s.rect(bx - 5, by + 1, 3, 5, '#9c6644')
        s.rect(bx - 5, by + 1, 3, 1, '#c9b27c')
      }

      // Wings behind torso (Demon / Cleric / GM)
      if (colors.wings) {
        const flap = action === 'walk' ? (f % 3) - 1 : action === 'attack' ? (f === 0 ? -2 : 1) : (f === 1 ? 1 : 0)
        const wCol = colors.wingStyle === 'angel' || colors.wingStyle === 'seraph' ? '#f8fafc' : shade(body, -0.3)
        const wTip = colors.wingStyle === 'seraph' ? '#ffd60a' : colors.wingStyle === 'angel' ? '#e2e8f0' : colors.accent
        s.line(bx - 2, by + 2, bx - 8, by - 2 + flap, wCol, 2)
        s.line(bx - 8, by - 2 + flap, bx - 10, by + 2 + flap, wTip, 1)
        s.line(bx - 6, by + 2 + flap, bx - 9, by + 5 + flap, shade(wCol, -0.2), 1)
      }

      // Cape / Scarf behind torso
      if (colors.cape) {
        const sway = action === 'walk' ? (f % 2 === 0 ? -2 : -1) : action === 'attack' ? -3 : 0
        s.line(bx - 2, by + 1, bx - 6 + sway, by + 8, colors.cape, 2)
        s.line(bx - 3, by + 2, bx - 5 + sway, by + 9, shade(colors.cape, -0.25), 1)
      }
      if (colors.scarf) {
        const scarfSway = action === 'walk' ? (f % 2 === 0 ? -2 : -1) : action === 'attack' ? -2 : 0
        s.line(bx - 2, by, bx - 5 + scarfSway, by + 3, colors.scarf, 1)
      }

      drawLeg(s, backHip, backKnee, backFoot, legDark, bootDark, 1)
      if (weapon === 'bow') {
        drawWeaponInHand(s, backHand, 'bow', weaponColor, weaponAngle, action, f, frontHand, colors.jobId)
      }
      drawArm(s, { x: bx + 1, y: by + 1 }, backElbow, backHand, bodyDark, skinDark)
      if ((weapon === 'dagger' || colors.dualDaggers) && (action === 'attack' || colors.jobId === 'assassin')) {
        drawWeaponInHand(s, backHand, 'dagger', weaponColor, action === 'attack' && f === 2 ? -0.1 : 0.4, action, f, undefined, colors.jobId)
      }

      if (colors.shieldColor) {
        s.rect(backHand.x - 1, backHand.y - 2, 4, 5, colors.shieldColor)
        s.rect(backHand.x, backHand.y - 1, 2, 3, colors.shieldCrest ?? colors.accent)
      }

      // Torso (with class armor accents)
      s.rect(bx - 2, by, 5, 7, body)
      s.rect(bx - 2, by + 4, 5, 1, colors.accent)
      s.px(bx + 1, by + 1, bodyHi)
      if (colors.armorStyle === 'plate' || colors.armorStyle === 'paladin_plate') {
        s.rect(bx - 1, by + 1, 3, 2, bodyHi)
      }
      if (colors.armorStyle === 'robe' || colors.armorStyle === 'arch_robe' || colors.armorStyle === 'vestment') {
        s.rect(bx - 2, by + 5, 5, 3, bodyDark)
      }
      if (colors.skeleton) {
        s.px(bx, by + 1, bodyDark); s.px(bx, by + 3, bodyDark)
      }

      drawLeg(s, frontHip, frontKnee, frontFoot, legCol, bootCol, 1)

      // Head
      const headY = 8 + bob
      s.rect(bx - 3, headY, 6, 6, skin)
      if (colors.goblinEars) {
        s.line(bx - 3, headY + 2, bx - 6, headY + 1, skin, 1)
      }
      if (!blink) {
        s.px(bx + 2, headY + 3, eyeCol)
      } else {
        s.px(bx + 2, headY + 3, skinDark)
      }
      s.px(bx + 2, headY + 5, skinDark)
      drawHatOrHair(s, bx, headY, 'side', colors)
      if (colors.halo) {
        s.rect(bx - 2, headY - 4, 5, 1, '#ffd60a')
        s.px(bx, headY - 4, '#ffffff')
      }
      if (colors.horns) {
        s.px(bx - 2, headY - 1, '#f1e9d2'); s.px(bx - 3, headY - 2, '#f1e9d2')
        s.px(bx + 1, headY - 1, '#f1e9d2'); s.px(bx + 2, headTopOffset(headY), '#f1e9d2')
      }

      // Shoulder pauldron
      if (colors.shoulderPads) {
        s.rect(bx - 1, by, 3, 2, bodyHi)
        s.px(bx, by, colors.accent)
      }

      drawArm(s, { x: bx, y: by + 1 }, frontElbow, frontHand, body, skin)
      if (weapon !== 'bow') {
        drawWeaponInHand(s, frontHand, weapon, weaponColor, weaponAngle, action, f, undefined, colors.jobId)
      }

      return s.toCanvas(true, dir === 'left')
    }

    // Front ('down') or Back ('up') orthographic rig
    const isUp = dir === 'up'
    let bob = 0
    let leftHip: Pt = { x: cx - 2, y: hipY }
    let leftKnee: Pt = { x: cx - 2, y: 24 }
    let leftFoot: Pt = { x: cx - 2, y: footY }
    let rightHip: Pt = { x: cx + 2, y: hipY }
    let rightKnee: Pt = { x: cx + 2, y: 24 }
    let rightFoot: Pt = { x: cx + 2, y: footY }

    let leftElbow: Pt = { x: cx - 4, y: 17 }
    let leftHand: Pt = { x: cx - 4, y: 19 }
    let rightElbow: Pt = { x: cx + 4, y: 17 }
    let rightHand: Pt = { x: cx + 4, y: 19 }
    let weaponAngle = isUp ? -1.4 : 0.7

    if (action === 'idle') {
      const br = f === 1 ? 1 : 0
      bob = br
      leftHip = { x: cx - 2, y: hipY + br }
      rightHip = { x: cx + 2, y: hipY + br }
      leftElbow = { x: cx - 4, y: 17 + br }
      leftHand = { x: cx - 4, y: 19 + br }
      rightElbow = { x: cx + 4, y: 17 + br }
      rightHand = { x: cx + 4, y: 19 + br }
      weaponAngle = weapon === 'staff' ? -1.5 : isUp ? -1.4 : -0.9
    } else if (action === 'walk') {
      const fWalk = [
        { bob: 0, lk: { x: cx - 2, y: 24 }, lf: { x: cx - 2, y: footY }, rk: { x: cx + 2, y: 23 }, rf: { x: cx + 2, y: footY - 1 }, le: { x: cx - 4, y: 16 }, lh: { x: cx - 5, y: 17 }, re: { x: cx + 4, y: 17 }, rh: { x: cx + 4, y: 20 }, wa: isUp ? -1.6 : 0.4 },
        { bob: -1, lk: { x: cx - 2, y: 24 }, lf: { x: cx - 2, y: footY }, rk: { x: cx + 2, y: 22 }, rf: { x: cx + 2, y: footY - 3 }, le: { x: cx - 4, y: 16 }, lh: { x: cx - 4, y: 19 }, re: { x: cx + 4, y: 16 }, rh: { x: cx + 4, y: 18 }, wa: isUp ? -1.4 : -0.4 },
        { bob: 0, lk: { x: cx - 2, y: 23 }, lf: { x: cx - 2, y: footY - 1 }, rk: { x: cx + 2, y: 24 }, rf: { x: cx + 2, y: footY }, le: { x: cx - 4, y: 17 }, lh: { x: cx - 4, y: 20 }, re: { x: cx + 4, y: 16 }, rh: { x: cx + 5, y: 17 }, wa: isUp ? -1.2 : -1.1 },
        { bob: 0, lk: { x: cx - 2, y: 23 }, lf: { x: cx - 2, y: footY - 1 }, rk: { x: cx + 2, y: 24 }, rf: { x: cx + 2, y: footY }, le: { x: cx - 4, y: 17 }, lh: { x: cx - 4, y: 20 }, re: { x: cx + 4, y: 16 }, rh: { x: cx + 5, y: 17 }, wa: isUp ? -1.2 : -1.0 },
        { bob: -1, lk: { x: cx - 2, y: 22 }, lf: { x: cx - 2, y: footY - 3 }, rk: { x: cx + 2, y: 24 }, rf: { x: cx + 2, y: footY }, le: { x: cx - 4, y: 16 }, lh: { x: cx - 4, y: 18 }, re: { x: cx + 4, y: 16 }, rh: { x: cx + 4, y: 19 }, wa: isUp ? -1.4 : -0.3 },
        { bob: 0, lk: { x: cx - 2, y: 24 }, lf: { x: cx - 2, y: footY }, rk: { x: cx + 2, y: 23 }, rf: { x: cx + 2, y: footY - 1 }, le: { x: cx - 4, y: 16 }, lh: { x: cx - 5, y: 17 }, re: { x: cx + 4, y: 17 }, rh: { x: cx + 4, y: 20 }, wa: isUp ? -1.6 : 0.4 },
      ][f]
      bob = fWalk.bob
      leftHip = { x: cx - 2, y: hipY + bob }; leftKnee = fWalk.lk; leftFoot = fWalk.lf
      rightHip = { x: cx + 2, y: hipY + bob }; rightKnee = fWalk.rk; rightFoot = fWalk.rf
      leftElbow = fWalk.le; leftHand = fWalk.lh
      rightElbow = fWalk.re; rightHand = fWalk.rh
      weaponAngle = weapon === 'staff' ? -1.5 : fWalk.wa
    } else {
      const fAtk = [
        { bob: 1, lf: { x: cx - 3, y: footY }, rf: { x: cx + 3, y: footY }, le: { x: cx - 5, y: 16 }, lh: { x: cx - 5, y: 18 }, re: { x: cx + 4, y: 13 }, rh: { x: cx + 5, y: 11 }, wa: isUp ? -2.1 : -2.2 },
        { bob: 0, lf: { x: cx - 3, y: footY }, rf: { x: cx + 3, y: footY }, le: { x: cx - 4, y: 17 }, lh: { x: cx - 5, y: 19 }, re: { x: cx + 5, y: 15 }, rh: { x: cx + 6, y: isUp ? 12 : 16 }, wa: isUp ? -1.6 : 0.3 },
        { bob: 1, lf: { x: cx - 3, y: footY }, rf: { x: cx + 3, y: footY }, le: { x: cx - 5, y: 16 }, lh: { x: cx - 5, y: isUp ? 14 : 20 }, re: { x: cx + 3, y: isUp ? 12 : 18 }, rh: { x: cx + 2, y: isUp ? 9 : 22 }, wa: isUp ? -1.55 : 1.35 },
        { bob: 0, lf: { x: cx - 2, y: footY }, rf: { x: cx + 2, y: footY }, le: { x: cx - 4, y: 17 }, lh: { x: cx - 4, y: 19 }, re: { x: cx + 4, y: 17 }, rh: { x: cx + 4, y: 20 }, wa: isUp ? -1.4 : 0.8 },
      ][f]
      bob = fAtk.bob
      leftHip = { x: cx - 2, y: hipY + bob }; leftKnee = { x: cx - 3, y: 24 }; leftFoot = fAtk.lf
      rightHip = { x: cx + 2, y: hipY + bob }; rightKnee = { x: cx + 3, y: 24 }; rightFoot = fAtk.rf
      leftElbow = fAtk.le; leftHand = fAtk.lh
      rightElbow = fAtk.re; rightHand = fAtk.rh
      weaponAngle = weapon === 'bow' ? (isUp ? -1.57 : 1.57) : fAtk.wa
    }

    const by = 14 + bob

    if (colors.wings) {
      const flap = action === 'walk' ? (f % 3) - 1 : action === 'attack' ? (f === 0 ? -2 : 1) : (f === 1 ? 1 : 0)
      const wCol = colors.wingStyle === 'angel' || colors.wingStyle === 'seraph' ? '#f8fafc' : shade(body, -0.3)
      const wTip = colors.wingStyle === 'seraph' ? '#ffd60a' : colors.wingStyle === 'angel' ? '#e2e8f0' : colors.accent
      s.line(cx - 3, by + 2, cx - 9, by - 2 + flap, wCol, 2)
      s.line(cx + 3, by + 2, cx + 9, by - 2 + flap, wCol, 2)
      s.px(cx - 10, by + flap, wTip)
      s.px(cx + 10, by + flap, wTip)
    }

    if (colors.cape && !isUp) {
      const sway = action === 'walk' && f % 2 === 1 ? 1 : 0
      s.rect(cx - 4 - sway, by + 1, 1, 8, shade(colors.cape, -0.25))
      s.rect(cx + 4 + sway, by + 1, 1, 8, shade(colors.cape, -0.25))
    }

    if (isUp && weapon) {
      drawWeaponInHand(s, rightHand, weapon, weaponColor, weaponAngle, action, f, leftHand, colors.jobId)
    }

    const leftBack = leftFoot.y < footY
    const rightBack = rightFoot.y < footY
    drawLeg(s, leftHip, leftKnee, leftFoot, leftBack ? legDark : legCol, leftBack ? bootDark : bootCol, -1)
    drawLeg(s, rightHip, rightKnee, rightFoot, rightBack ? legDark : legCol, rightBack ? bootDark : bootCol, 1)

    // Torso
    s.rect(cx - 3, by, 7, 7, body)
    s.rect(cx - 3, by + 4, 7, 1, colors.accent)
    s.rect(cx - 1, by + 1, 3, 2, bodyHi)
    if (colors.armorStyle === 'robe' || colors.armorStyle === 'arch_robe' || colors.armorStyle === 'vestment') {
      s.rect(cx - 3, by + 5, 7, 3, bodyDark)
      s.px(cx, by + 6, colors.accent)
    }
    if (colors.armorStyle === 'paladin_plate') {
      s.line(cx, by + 1, cx, by + 3, '#ffd60a', 1)
      s.line(cx - 1, by + 2, cx + 1, by + 2, '#ffd60a', 1)
    }
    if (colors.skeleton) {
      s.px(cx - 1, by + 1, bodyDark); s.px(cx + 1, by + 1, bodyDark)
      s.px(cx - 1, by + 3, bodyDark); s.px(cx + 1, by + 3, bodyDark)
    }
    if (colors.backpack && isUp) {
      s.rect(cx - 2, by + 1, 5, 5, '#9c6644')
      s.rect(cx - 2, by + 1, 5, 1, '#c9b27c')
    }
    if (colors.quiver && isUp) {
      s.line(cx + 2, by - 1, cx - 1, by + 5, '#7f5539', 2)
      s.px(cx + 2, by - 2, '#f8fafc')
      s.px(cx + 3, by - 2, '#ffd60a')
    }
    if (colors.cape && isUp) {
      const sway = action === 'walk' && f % 2 === 1 ? 1 : 0
      s.rect(cx - 3, by + 1, 7, 7 + sway, colors.cape)
      s.rect(cx - 2, by + 2, 5, 5 + sway, shade(colors.cape, -0.2))
    }

    // Head
    const headY = 8 + bob
    s.rect(cx - 3, headY, 7, 6, skin)
    if (colors.goblinEars) {
      s.line(cx - 3, headY + 2, cx - 6, headY + 1, skin, 1)
      s.line(cx + 3, headY + 2, cx + 6, headY + 1, skin, 1)
    }
    if (!isUp) {
      if (!blink) {
        s.px(cx - 2, headY + 3, eyeCol)
        s.px(cx + 2, headY + 3, eyeCol)
      } else {
        s.px(cx - 2, headY + 3, skinDark)
        s.px(cx + 2, headY + 3, skinDark)
      }
      s.px(cx, headY + 5, skinDark)
    }
    drawHatOrHair(s, cx, headY, isUp ? 'up' : 'down', colors)
    if (colors.halo) {
      s.rect(cx - 2, headY - 4, 5, 1, '#ffd60a')
      s.px(cx, headY - 4, '#ffffff')
    }
    if (colors.horns) {
      s.px(cx - 3, headY - 1, '#f1e9d2'); s.px(cx - 4, headY - 2, '#f1e9d2')
      s.px(cx + 3, headY - 1, '#f1e9d2'); s.px(cx + 4, headY - 2, '#f1e9d2')
    }

    // Shoulder pauldrons
    if (colors.shoulderPads) {
      s.rect(cx - 5, by, 3, 2, bodyHi)
      s.rect(cx + 3, by, 3, 2, bodyHi)
      s.px(cx - 4, by, colors.accent)
      s.px(cx + 4, by, colors.accent)
    }

    drawArm(s, { x: cx - 3, y: by + 1 }, leftElbow, leftHand, bodyDark, skinDark)
    drawArm(s, { x: cx + 3, y: by + 1 }, rightElbow, rightHand, body, skin)

    if (colors.shieldColor) {
      s.rect(leftHand.x - 1, leftHand.y - 2, 4, 5, colors.shieldColor)
      s.rect(leftHand.x, leftHand.y - 1, 2, 3, colors.shieldCrest ?? colors.accent)
    }

    if (!isUp && weapon) {
      drawWeaponInHand(s, rightHand, weapon, weaponColor, weaponAngle, action, f, leftHand, colors.jobId)
    }
    if ((weapon === 'dagger' || colors.dualDaggers) && ((action === 'attack' && f === 2) || colors.jobId === 'assassin')) {
      drawWeaponInHand(s, leftHand, 'dagger', weaponColor, isUp ? -1.7 : 1.7, action, f, undefined, colors.jobId)
    }

    return s.toCanvas(true, false)
  })
}

function headTopOffset(headY: number) {
  return headY - 2
}

/* ---------------- Articulated Monsters (All 17 Monsters) ---------------- */

function renderSlime(color: string, dir: Dir, action: SpriteAction, f: number, isPinkVariant = false): HTMLCanvasElement {
  const s = new PixelSurface(26, 24)
  const dark = shade(color, -0.3)
  const hi = shade(color, 0.45)
  const cx = 13
  const baseY = 21

  let w = 12
  let h = 9
  let offX = 0
  let leftArm: Pt = { x: cx - 7, y: 17 }
  let rightArm: Pt = { x: cx + 7, y: 17 }

  if (action === 'idle') {
    const sq = f === 1 ? 1 : f === 3 ? -1 : 0
    w = 12 + sq * 2
    h = 9 - sq
    leftArm = { x: cx - 7 - sq, y: 17 + sq }
    rightArm = { x: cx + 7 + sq, y: 17 + sq }
  } else if (action === 'walk') {
    const seq = [
      { w: 14, h: 8, ox: 0, lay: 18, ray: 16 },
      { w: 11, h: 10, ox: 1, lay: 15, ray: 18 },
      { w: 10, h: 11, ox: 2, lay: 14, ray: 17 },
      { w: 13, h: 8, ox: 1, lay: 17, ray: 15 },
      { w: 14, h: 8, ox: 0, lay: 18, ray: 16 },
      { w: 11, h: 10, ox: -1, lay: 16, ray: 14 },
    ][f % 6]
    w = seq.w; h = seq.h; offX = seq.ox
    leftArm = { x: cx + offX - Math.floor(w / 2) - 2, y: seq.lay }
    rightArm = { x: cx + offX + Math.floor(w / 2) + 2, y: seq.ray }
  } else {
    const atk = [
      { w: 14, h: 7, ox: -2, lx: -6, ly: 18, rx: 6, ry: 18 },
      { w: 11, h: 10, ox: 2, lx: -4, ly: 14, rx: 9, ry: 13 },
      { w: 10, h: 9, ox: 4, lx: 2, ly: 14, rx: 10, ry: 14 },
      { w: 13, h: 8, ox: 1, lx: -6, ly: 17, rx: 7, ry: 17 },
    ][f % 4]
    w = atk.w; h = atk.h; offX = atk.ox
    leftArm = { x: cx + offX + atk.lx, y: atk.ly }
    rightArm = { x: cx + offX + atk.rx, y: atk.ry }
  }

  const x0 = Math.round(cx + offX - w / 2)
  const y0 = baseY - h

  s.line(cx + offX - 3, y0 + Math.floor(h * 0.55), leftArm.x, leftArm.y, dark, 2)
  s.px(leftArm.x, leftArm.y, color)
  s.line(cx + offX + 3, y0 + Math.floor(h * 0.55), rightArm.x, rightArm.y, color, 2)
  s.px(rightArm.x, rightArm.y, hi)

  s.rect(x0 + 2, y0, w - 4, 2, color)
  s.rect(x0 + 1, y0 + 2, w - 2, h - 3, color)
  s.rect(x0, y0 + Math.floor(h * 0.5), w, Math.ceil(h * 0.5), color)
  s.rect(x0 + 1, baseY - 1, w - 2, 1, dark)
  const footShift = action === 'walk' ? (f % 2 === 0 ? 1 : -1) : 0
  s.rect(x0 + 1 + footShift, baseY, 3, 1, dark)
  s.rect(x0 + w - 4 - footShift, baseY, 3, 1, dark)

  // Highlight & variant crest
  s.rect(x0 + 2, y0 + 1, 2, 2, hi)
  if (isPinkVariant) {
    // Pink slime crown & floating bubble sprout
    s.px(cx + offX, y0 - 1, '#ffd60a')
    s.px(cx + offX - 1, y0 - 2, '#fff3b0')
    s.px(cx + offX + 1, y0 - 2, '#ffd60a')
    s.px(cx + offX + 4, y0 - (f % 2) - 2, '#ffd6e0')
  } else {
    s.px(cx + offX, y0 - 1, hi)
  }

  if (dir !== 'up') {
    const eyeOff = dir === 'right' ? 2 : dir === 'left' ? 2 : 0
    s.px(x0 + Math.floor(w * 0.3) + eyeOff, y0 + Math.floor(h * 0.48), '#1a1423')
    s.px(x0 + Math.floor(w * 0.65) + eyeOff, y0 + Math.floor(h * 0.48), '#1a1423')
    if (isPinkVariant) {
      s.px(x0 + Math.floor(w * 0.22) + eyeOff, y0 + Math.floor(h * 0.62), '#ff4d6d')
      s.px(x0 + Math.floor(w * 0.72) + eyeOff, y0 + Math.floor(h * 0.62), '#ff4d6d')
    }
    if (action === 'attack' && (f === 1 || f === 2)) {
      s.rect(x0 + Math.floor(w * 0.45) + eyeOff, y0 + Math.floor(h * 0.68), 3, 2, '#3d0c11')
    }
  }
  return s.toCanvas(true, dir === 'left')
}

function renderMushroom(color: string, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(26, 26)
  const capDark = shade(color, -0.3)
  const stem = '#f1e3c8'
  const stemDark = '#d4c3a3'
  const footCol = '#5c3d2e'
  const cx = 13
  const footY = 23

  let bob = 0
  let tilt = 0
  let lFoot: Pt = { x: cx - 2, y: footY }
  let rFoot: Pt = { x: cx + 2, y: footY }
  let lHand: Pt = { x: cx - 5, y: 18 }
  let rHand: Pt = { x: cx + 5, y: 18 }

  if (action === 'idle') {
    bob = f === 1 ? 1 : 0
    lHand = { x: cx - 5, y: 18 + bob }
    rHand = { x: cx + 5, y: 18 + bob }
  } else if (action === 'walk') {
    const seq = [
      { bob: 0, tilt: 0, lf: { x: cx - 3, y: footY }, rf: { x: cx + 2, y: footY - 1 }, lh: { x: cx - 5, y: 16 }, rh: { x: cx + 5, y: 19 } },
      { bob: -1, tilt: 0, lf: { x: cx - 2, y: footY }, rf: { x: cx + 2, y: footY - 3 }, lh: { x: cx - 5, y: 17 }, rh: { x: cx + 5, y: 17 } },
      { bob: 0, tilt: 1, lf: { x: cx - 2, y: footY - 1 }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 5, y: 19 }, rh: { x: cx + 5, y: 16 } },
      { bob: 0, tilt: 0, lf: { x: cx - 2, y: footY - 1 }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 5, y: 19 }, rh: { x: cx + 5, y: 16 } },
      { bob: -1, tilt: 0, lf: { x: cx - 2, y: footY - 3 }, rf: { x: cx + 2, y: footY }, lh: { x: cx - 5, y: 17 }, rh: { x: cx + 5, y: 17 } },
      { bob: 0, tilt: -1, lf: { x: cx - 3, y: footY }, rf: { x: cx + 2, y: footY - 1 }, lh: { x: cx - 5, y: 16 }, rh: { x: cx + 5, y: 19 } },
    ][f % 6]
    bob = seq.bob; tilt = seq.tilt; lFoot = seq.lf; rFoot = seq.rf; lHand = seq.lh; rHand = seq.rh
  } else {
    const atk = [
      { bob: 1, tilt: -1, lf: { x: cx - 3, y: footY }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 6, y: 13 }, rh: { x: cx + 5, y: 13 } },
      { bob: -1, tilt: 1, lf: { x: cx - 3, y: footY }, rf: { x: cx + 4, y: footY - 1 }, lh: { x: cx - 4, y: 15 }, rh: { x: cx + 7, y: 15 } },
      { bob: 0, tilt: 2, lf: { x: cx - 4, y: footY }, rf: { x: cx + 4, y: footY }, lh: { x: cx + 2, y: 16 }, rh: { x: cx + 8, y: 16 } },
      { bob: 0, tilt: 1, lf: { x: cx - 2, y: footY }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 5, y: 18 }, rh: { x: cx + 5, y: 18 } },
    ][f % 4]
    bob = atk.bob; tilt = atk.tilt; lFoot = atk.lf; rFoot = atk.rf; lHand = atk.lh; rHand = atk.rh
  }

  s.line(cx - 2, 20 + bob, lFoot.x, lFoot.y, stemDark, 2)
  s.rect(lFoot.x - 1, lFoot.y, 2, 1, footCol)
  s.line(cx + 2, 20 + bob, rFoot.x, rFoot.y, stem, 2)
  s.rect(rFoot.x, rFoot.y, 2, 1, footCol)

  s.line(cx - 3, 16 + bob, lHand.x, lHand.y, stemDark, 1)
  s.px(lHand.x, lHand.y, stem)
  s.line(cx + 3, 16 + bob, rHand.x, rHand.y, stem, 1)
  s.px(rHand.x, rHand.y, '#ffffff')

  s.rect(cx - 3 + Math.round(tilt * 0.5), 14 + bob, 7, 6, stem)
  if (dir !== 'up') {
    const faceX = cx + (dir === 'right' ? 1 : 0) + Math.round(tilt * 0.5)
    s.px(faceX - 2, 16 + bob, '#1a1423')
    s.px(faceX + 2, 16 + bob, '#1a1423')
    if (action === 'attack' && (f === 1 || f === 2)) {
      s.px(faceX - 2, 15 + bob, '#9d0208')
      s.px(faceX + 2, 15 + bob, '#9d0208')
      s.px(faceX + 6, 12 + bob, '#c77dff')
      s.px(faceX - 6, 11 + bob, '#c77dff')
    }
  }

  const capX = cx + tilt
  const capY = 6 + bob
  s.rect(capX - 4, capY, 9, 2, color)
  s.rect(capX - 6, capY + 2, 13, 5, color)
  s.rect(capX - 6, capY + 7, 13, 1, capDark)
  s.rect(capX - 4, capY + 2, 2, 2, '#ffffff')
  s.rect(capX + 2, capY + 1, 2, 2, '#ffffff')
  s.px(capX, capY + 5, '#ffffff')

  return s.toCanvas(true, dir === 'left')
}

function renderRabbit(color: string, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(28, 26)
  const dark = shade(color, -0.25)
  const belly = '#ffffff'
  const pink = '#ff8fab'
  const cx = 13
  const footY = 23

  let bob = 0
  let lean = 0
  let earAngle = 0
  let hindFoot: Pt = { x: cx - 3, y: footY }
  let frontPaw: Pt = { x: cx + 3, y: footY }
  let raisedPaw: Pt = { x: cx + 4, y: 18 }

  if (action === 'idle') {
    bob = f === 1 ? 1 : 0
    earAngle = f === 2 ? -1 : 0
    hindFoot = { x: cx - 3, y: footY }
    frontPaw = { x: cx + 3, y: footY }
    raisedPaw = { x: cx + 5, y: 18 + bob }
  } else if (action === 'walk') {
    const seq = [
      { bob: 1, lean: 0, ear: -1, hf: { x: cx - 3, y: footY }, fp: { x: cx + 3, y: footY }, rp: { x: cx + 4, y: 19 } },
      { bob: -2, lean: 1, ear: -2, hf: { x: cx - 5, y: footY - 1 }, fp: { x: cx + 5, y: footY - 3 }, rp: { x: cx + 6, y: 16 } },
      { bob: -3, lean: 1, ear: -2, hf: { x: cx - 4, y: footY - 3 }, fp: { x: cx + 5, y: footY - 1 }, rp: { x: cx + 6, y: 18 } },
      { bob: -1, lean: 1, ear: -1, hf: { x: cx - 1, y: footY - 2 }, fp: { x: cx + 3, y: footY }, rp: { x: cx + 4, y: 19 } },
      { bob: 0, lean: 0, ear: 0, hf: { x: cx - 2, y: footY }, fp: { x: cx + 2, y: footY }, rp: { x: cx + 3, y: 18 } },
      { bob: 1, lean: 0, ear: 0, hf: { x: cx - 3, y: footY }, fp: { x: cx + 3, y: footY }, rp: { x: cx + 4, y: 19 } },
    ][f % 6]
    bob = seq.bob; lean = seq.lean; earAngle = seq.ear
    hindFoot = seq.hf; frontPaw = seq.fp; raisedPaw = seq.rp
  } else {
    const atk = [
      { bob: 0, lean: -1, ear: -2, hf: { x: cx - 3, y: footY }, fp: { x: cx + 2, y: 17 }, rp: { x: cx + 4, y: 14 } },
      { bob: -2, lean: 2, ear: -2, hf: { x: cx - 5, y: footY - 1 }, fp: { x: cx + 6, y: 18 }, rp: { x: cx + 8, y: 15 } },
      { bob: -1, lean: 3, ear: -1, hf: { x: cx - 4, y: footY }, fp: { x: cx + 7, y: 19 }, rp: { x: cx + 9, y: 16 } },
      { bob: 0, lean: 1, ear: 0, hf: { x: cx - 3, y: footY }, fp: { x: cx + 4, y: footY }, rp: { x: cx + 5, y: 18 } },
    ][f % 4]
    bob = atk.bob; lean = atk.lean; earAngle = atk.ear
    hindFoot = atk.hf; frontPaw = atk.fp; raisedPaw = atk.rp
  }

  const bx = cx + lean
  const by = 14 + bob

  s.rect(bx - 5, by + 3, 2, 2, belly)
  s.line(bx - 2, by + 5, hindFoot.x, hindFoot.y, dark, 2)
  s.rect(hindFoot.x, hindFoot.y, 3, 1, belly)
  s.rect(bx - 3, by + 1, 7, 6, color)
  s.rect(bx - 1, by + 3, 4, 4, belly)
  s.rect(bx - 1, by - 4, 6, 5, color)
  s.line(bx, by - 5, bx - 1 + earAngle, by - 10, color, 2)
  s.line(bx + 2, by - 5, bx + 2 + earAngle, by - 10, color, 2)
  s.px(bx + 2 + earAngle, by - 8, pink)
  if (dir !== 'up') {
    s.px(bx + 3, by - 2, action === 'attack' ? '#e63946' : '#1a1423')
    s.px(bx + 5, by - 1, pink)
  }
  s.line(bx + 2, by + 4, frontPaw.x, frontPaw.y, color, 2)
  s.px(frontPaw.x, frontPaw.y, belly)
  s.line(bx + 3, by + 3, raisedPaw.x, raisedPaw.y, color, 1)
  s.px(raisedPaw.x, raisedPaw.y, action === 'attack' && f === 2 ? '#ffffff' : belly)

  return s.toCanvas(true, dir === 'left')
}

function renderWolf(color: string, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(30, 24)
  const dark = shade(color, -0.28)
  const belly = '#e2e8f0'
  const pawCol = '#f8fafc'
  const cx = 14
  const footY = 21

  let bob = 0
  let lean = 0
  let tailTip: Pt = { x: 4, y: 12 }
  let bl: Pt = { x: 8, y: footY }
  let br: Pt = { x: 10, y: footY }
  let fl: Pt = { x: 17, y: footY }
  let fr: Pt = { x: 19, y: footY }

  if (action === 'idle') {
    bob = f === 1 ? 1 : 0
    tailTip = { x: 4, y: 12 + (f % 2) }
  } else if (action === 'walk') {
    const seq = [
      { bob: 0, lean: 0, ty: 11, bl: { x: 6, y: footY }, br: { x: 11, y: footY - 1 }, fl: { x: 20, y: footY }, fr: { x: 16, y: footY - 1 } },
      { bob: -1, lean: 1, ty: 10, bl: { x: 7, y: footY - 2 }, br: { x: 9, y: footY }, fl: { x: 18, y: footY }, fr: { x: 18, y: footY - 2 } },
      { bob: 0, lean: 1, ty: 12, bl: { x: 11, y: footY - 1 }, br: { x: 6, y: footY }, fl: { x: 16, y: footY - 1 }, fr: { x: 21, y: footY } },
      { bob: 0, lean: 0, ty: 11, bl: { x: 11, y: footY }, br: { x: 7, y: footY }, fl: { x: 16, y: footY }, fr: { x: 20, y: footY } },
      { bob: -1, lean: 1, ty: 10, bl: { x: 9, y: footY }, br: { x: 8, y: footY - 2 }, fl: { x: 19, y: footY - 2 }, fr: { x: 18, y: footY } },
      { bob: 0, lean: 1, ty: 12, bl: { x: 6, y: footY }, br: { x: 11, y: footY - 1 }, fl: { x: 20, y: footY }, fr: { x: 16, y: footY - 1 } },
    ][f % 6]
    bob = seq.bob; lean = seq.lean; tailTip = { x: 4, y: seq.ty }
    bl = seq.bl; br = seq.br; fl = seq.fl; fr = seq.fr
  } else {
    const atk = [
      { bob: 1, lean: -1, ty: 14, bl: { x: 6, y: footY }, br: { x: 8, y: footY }, fl: { x: 15, y: footY }, fr: { x: 17, y: footY - 2 } },
      { bob: -2, lean: 2, ty: 10, bl: { x: 5, y: footY - 1 }, br: { x: 7, y: footY - 1 }, fl: { x: 22, y: 16 }, fr: { x: 23, y: 18 } },
      { bob: -1, lean: 3, ty: 11, bl: { x: 7, y: footY }, br: { x: 9, y: footY }, fl: { x: 23, y: 17 }, fr: { x: 24, y: 19 } },
      { bob: 0, lean: 1, ty: 12, bl: { x: 7, y: footY }, br: { x: 9, y: footY }, fl: { x: 18, y: footY }, fr: { x: 20, y: footY } },
    ][f % 4]
    bob = atk.bob; lean = atk.lean; tailTip = { x: 4, y: atk.ty }
    bl = atk.bl; br = atk.br; fl = atk.fl; fr = atk.fr
  }

  const bx = cx + lean
  const by = 13 + bob

  s.line(bx - 5, by + 2, tailTip.x, tailTip.y, dark, 2)
  s.px(tailTip.x, tailTip.y, belly)
  s.line(bx - 4, by + 4, bl.x, bl.y, dark, 2)
  s.px(bl.x, bl.y, dark)
  s.line(bx + 3, by + 4, fl.x, fl.y, dark, 2)
  s.px(fl.x, fl.y, pawCol)

  s.rect(bx - 5, by + 1, 10, 4, color)
  s.rect(bx + 2, by + 2, 4, 3, belly)

  s.rect(bx + 3, by - 3, 5, 5, color)
  s.rect(bx + 7, by - 1, 4, 2, color)
  s.px(bx + 10, by - 1, '#1a1423')
  s.px(bx + 4, by - 5, dark)
  s.px(bx + 6, by - 5, color)
  s.px(bx + 6, by - 2, '#ffd60a')
  if (action === 'attack' && (f === 1 || f === 2)) {
    s.rect(bx + 7, by + 1, 4, 1, '#9d0208')
    s.px(bx + 10, by, '#ffffff')
    s.px(bx + 9, by + 2, '#ffffff')
  }

  s.line(bx - 3, by + 4, br.x, br.y, color, 2)
  s.px(br.x, br.y, pawCol)
  s.line(bx + 4, by + 4, fr.x, fr.y, color, 2)
  s.px(fr.x, fr.y, pawCol)

  return s.toCanvas(true, dir === 'left')
}

function renderBat(color: string, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(28, 24)
  const dark = shade(color, -0.3)
  const wingMem = shade(color, -0.15)
  const cx = 14
  const cy = 12

  let bob = 0
  let wingY = 0
  let wingSpan = 10
  let bite = false

  if (action === 'idle') {
    wingY = [-2, 0, 2, 0][f % 4]
    bob = f === 2 ? 1 : 0
  } else if (action === 'walk') {
    const seq = [
      { bob: -1, wy: -5, span: 9 },
      { bob: 0, wy: -2, span: 11 },
      { bob: 1, wy: 2, span: 11 },
      { bob: 1, wy: 5, span: 9 },
      { bob: 0, wy: 2, span: 10 },
      { bob: -1, wy: -2, span: 10 },
    ][f % 6]
    bob = seq.bob; wingY = seq.wy; wingSpan = seq.span
  } else {
    const atk = [
      { bob: -2, wy: -6, span: 10, bite: true },
      { bob: 1, wy: 3, span: 12, bite: true },
      { bob: 2, wy: 5, span: 11, bite: true },
      { bob: 0, wy: -1, span: 10, bite: false },
    ][f % 4]
    bob = atk.bob; wingY = atk.wy; wingSpan = atk.span; bite = atk.bite
  }

  const by = cy + bob
  s.line(cx - 2, by, cx - Math.round(wingSpan * 0.6), by + Math.round(wingY * 0.6) - 1, dark, 2)
  s.line(cx - Math.round(wingSpan * 0.6), by + Math.round(wingY * 0.6) - 1, cx - wingSpan, by + wingY, dark, 1)
  s.line(cx - 2, by + 2, cx - Math.round(wingSpan * 0.75), by + wingY + 2, wingMem, 1)

  s.line(cx + 2, by, cx + Math.round(wingSpan * 0.6), by + Math.round(wingY * 0.6) - 1, dark, 2)
  s.line(cx + Math.round(wingSpan * 0.6), by + Math.round(wingY * 0.6) - 1, cx + wingSpan, by + wingY, dark, 1)
  s.line(cx + 2, by + 2, cx + Math.round(wingSpan * 0.75), by + wingY + 2, wingMem, 1)

  s.px(cx - Math.round(wingSpan * 0.6), by + Math.round(wingY * 0.6) - 2, '#f8fafc')
  s.px(cx + Math.round(wingSpan * 0.6), by + Math.round(wingY * 0.6) - 2, '#f8fafc')

  s.rect(cx - 2, by - 2, 5, 6, color)
  s.px(cx - 2, by - 4, dark); s.px(cx - 2, by - 3, color)
  s.px(cx + 2, by - 4, dark); s.px(cx + 2, by - 3, color)

  const kick = action === 'walk' && f % 2 === 0 ? 1 : 0
  s.px(cx - 1, by + 4 + kick, '#f8fafc')
  s.px(cx + 1, by + 4 + (1 - kick), '#f8fafc')

  if (dir !== 'up') {
    s.px(cx - 1, by, '#ff4d6d')
    s.px(cx + 1, by, '#ff4d6d')
    if (bite) {
      s.px(cx - 1, by + 2, '#ffffff')
      s.px(cx + 1, by + 2, '#ffffff')
    }
  }
  return s.toCanvas(true, dir === 'left')
}

function renderGhost(color: string, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(26, 26)
  const dark = shade(color, -0.25)
  const glow = shade(color, 0.35)
  const cx = 13
  let bob = 0
  let lArm: Pt = { x: cx - 6, y: 14 }
  let rArm: Pt = { x: cx + 6, y: 14 }
  let tailShift = 0

  if (action === 'idle') {
    bob = f === 1 ? -1 : f === 3 ? 1 : 0
    tailShift = f % 2 === 0 ? 1 : -1
    lArm = { x: cx - 6, y: 14 + bob }
    rArm = { x: cx + 6, y: 14 + bob }
  } else if (action === 'walk') {
    const seq = [
      { bob: -1, ts: -1, lx: -6, ly: 12, rx: 6, ry: 16 },
      { bob: -2, ts: 0, lx: -7, ly: 14, rx: 7, ry: 14 },
      { bob: -1, ts: 1, lx: -6, ly: 16, rx: 6, ry: 12 },
      { bob: 0, ts: 1, lx: -6, ly: 15, rx: 7, ry: 13 },
      { bob: -1, ts: 0, lx: -7, ly: 13, rx: 6, ry: 15 },
      { bob: 0, ts: -1, lx: -6, ly: 12, rx: 6, ry: 16 },
    ][f % 6]
    bob = seq.bob; tailShift = seq.ts
    lArm = { x: cx + seq.lx, y: seq.ly }
    rArm = { x: cx + seq.rx, y: seq.ry }
  } else {
    const atk = [
      { bob: 1, ts: -1, lx: -7, ly: 11, rx: 3, ry: 11 },
      { bob: -1, ts: 1, lx: 2, ly: 13, rx: 9, ry: 12 },
      { bob: 0, ts: 2, lx: 5, ly: 13, rx: 10, ry: 14 },
      { bob: 0, ts: 0, lx: -5, ly: 14, rx: 6, ry: 14 },
    ][f % 4]
    bob = atk.bob; tailShift = atk.ts
    lArm = { x: cx + atk.lx, y: atk.ly }
    rArm = { x: cx + atk.rx, y: atk.ry }
  }

  const by = 6 + bob
  s.rect(cx - 3, by, 6, 2, glow)
  s.rect(cx - 4, by + 2, 8, 8, color)
  s.rect(cx - 3, by + 10, 6, 3, dark)

  s.line(cx - 3, by + 12, cx - 4 + tailShift, by + 16, dark, 1)
  s.line(cx, by + 12, cx + tailShift, by + 17, color, 1)
  s.line(cx + 3, by + 12, cx + 4 - tailShift, by + 16, dark, 1)

  s.line(cx - 3, by + 6, lArm.x, lArm.y, dark, 2)
  s.px(lArm.x, lArm.y, glow)
  s.line(cx + 3, by + 6, rArm.x, rArm.y, glow, 2)
  s.px(rArm.x, rArm.y, '#ffffff')

  if (dir !== 'up') {
    const faceOff = dir === 'right' ? 1 : 0
    s.rect(cx - 2 + faceOff, by + 4, 2, 2, '#1a1423')
    s.rect(cx + 1 + faceOff, by + 4, 2, 2, '#1a1423')
    s.px(cx - 1 + faceOff, by + 5, action === 'attack' ? '#ff4d6d' : '#72efdd')
    s.px(cx + 2 + faceOff, by + 5, action === 'attack' ? '#ff4d6d' : '#72efdd')
  }
  return s.toCanvas(true, dir === 'left')
}

function renderGolem(
  color: string,
  dir: Dir,
  action: SpriteAction,
  f: number,
  variant: 'fire_golem' | 'earth_golem',
): HTMLCanvasElement {
  const isEarthBoss = variant === 'earth_golem'
  const W = isEarthBoss ? 34 : 32
  const H = isEarthBoss ? 32 : 30
  const s = new PixelSurface(W, H)
  const baseBody = isEarthBoss ? color : '#342e37'
  const dark = shade(baseBody, -0.35)
  const hi = shade(baseBody, 0.25)
  const rune = isEarthBoss ? '#a3e635' : '#ff6b35'
  const core = isEarthBoss ? '#ffd60a' : '#ffb703'
  const cx = Math.floor(W / 2)
  const footY = H - 3

  let bob = 0
  let lFoot: Pt = { x: cx - 3, y: footY }
  let rFoot: Pt = { x: cx + 3, y: footY }
  let lHand: Pt = { x: cx - 9, y: footY - 6 }
  let rHand: Pt = { x: cx + 9, y: footY - 6 }

  if (action === 'idle') {
    bob = f === 1 ? 1 : 0
    lHand = { x: cx - 9, y: footY - 6 + bob }
    rHand = { x: cx + 9, y: footY - 6 + bob }
  } else if (action === 'walk') {
    const seq = [
      { bob: 0, lf: { x: cx - 4, y: footY }, rf: { x: cx + 3, y: footY - 1 }, lh: { x: cx - 9, y: footY - 8 }, rh: { x: cx + 9, y: footY - 4 } },
      { bob: -1, lf: { x: cx - 3, y: footY }, rf: { x: cx + 4, y: footY - 3 }, lh: { x: cx - 9, y: footY - 6 }, rh: { x: cx + 9, y: footY - 6 } },
      { bob: 0, lf: { x: cx - 3, y: footY - 1 }, rf: { x: cx + 4, y: footY }, lh: { x: cx - 9, y: footY - 4 }, rh: { x: cx + 9, y: footY - 8 } },
      { bob: 0, lf: { x: cx - 3, y: footY - 1 }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 9, y: footY - 4 }, rh: { x: cx + 9, y: footY - 8 } },
      { bob: -1, lf: { x: cx - 4, y: footY - 3 }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 9, y: footY - 6 }, rh: { x: cx + 9, y: footY - 6 } },
      { bob: 0, lf: { x: cx - 4, y: footY }, rf: { x: cx + 3, y: footY - 1 }, lh: { x: cx - 9, y: footY - 8 }, rh: { x: cx + 9, y: footY - 4 } },
    ][f % 6]
    bob = seq.bob; lFoot = seq.lf; rFoot = seq.rf; lHand = seq.lh; rHand = seq.rh
  } else {
    const atk = [
      { bob: -1, lf: { x: cx - 4, y: footY }, rf: { x: cx + 4, y: footY }, lh: { x: cx - 7, y: 5 }, rh: { x: cx + 7, y: 5 } },
      { bob: 0, lf: { x: cx - 4, y: footY }, rf: { x: cx + 5, y: footY }, lh: { x: cx - 5, y: 10 }, rh: { x: cx + 10, y: 11 } },
      { bob: 1, lf: { x: cx - 4, y: footY }, rf: { x: cx + 5, y: footY }, lh: { x: cx + 2, y: footY - 2 }, rh: { x: cx + 11, y: footY - 1 } },
      { bob: 0, lf: { x: cx - 3, y: footY }, rf: { x: cx + 4, y: footY }, lh: { x: cx - 8, y: footY - 6 }, rh: { x: cx + 9, y: footY - 5 } },
    ][f % 4]
    bob = atk.bob; lFoot = atk.lf; rFoot = atk.rf; lHand = atk.lh; rHand = atk.rh
  }

  const by = (isEarthBoss ? 9 : 8) + bob

  s.line(cx - 3, by + 10, lFoot.x, lFoot.y, dark, 3)
  s.rect(lFoot.x - 1, lFoot.y - 1, 3, 2, dark)
  s.line(cx + 3, by + 10, rFoot.x, rFoot.y, baseBody, 3)
  s.rect(rFoot.x - 1, rFoot.y - 1, 3, 2, baseBody)

  s.rect(cx - 7, by + 2, 14, 9, baseBody)
  s.rect(cx - 8, by + 2, 16, 4, hi)
  s.rect(cx - 2, by + 5, 4, 4, rune)
  s.px(cx, by + 6, core)
  if (isEarthBoss) {
    s.rect(cx - 6, by + 1, 12, 2, '#4f772d')
    s.line(cx - 6, by + 1, cx - 8, by - 2, '#a3e635', 2)
    s.line(cx + 6, by + 1, cx + 8, by - 2, '#a3e635', 2)
  } else {
    // Volcanic vents & magma fissures
    s.line(cx - 5, by + 3, cx - 7, by, '#ff6b35', 2)
    s.line(cx + 5, by + 3, cx + 7, by, '#ff6b35', 2)
    s.px(cx - 7, by - 1, '#ffd60a')
    s.px(cx + 7, by - 1, '#ffd60a')
    s.px(cx - 4, by + 6, '#e85d04')
    s.px(cx + 4, by + 7, '#e85d04')
  }

  s.rect(cx - 4, by - 3, 8, 5, baseBody)
  s.rect(cx - 3, by - 4, 6, 1, dark)
  if (dir !== 'up') {
    const faceOff = dir === 'right' ? 1 : 0
    s.rect(cx - 2 + faceOff, by - 1, 2, 2, core)
    s.rect(cx + 1 + faceOff, by - 1, 2, 2, core)
  }

  s.line(cx - 7, by + 3, lHand.x, lHand.y, dark, 2)
  s.rect(lHand.x - 2, lHand.y - 1, 4, 4, dark)
  s.px(lHand.x, lHand.y, rune)

  s.line(cx + 7, by + 3, rHand.x, rHand.y, hi, 2)
  s.rect(rHand.x - 2, rHand.y - 1, 4, 4, baseBody)
  s.px(rHand.x, rHand.y, core)

  return s.toCanvas(true, dir === 'left')
}

function renderGoblinChief(color: string, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(34, 32)
  const skin = color
  const skinDark = shade(color, -0.3)
  const armor = '#582f0e'
  const armorHi = '#7f4f24'
  const gold = '#ffd60a'
  const cx = 17
  const footY = 29

  let bob = 0
  let lean = 0
  let lFoot: Pt = { x: cx - 4, y: footY }
  let rFoot: Pt = { x: cx + 4, y: footY }
  let clubAngle = -0.7
  let rHand: Pt = { x: cx + 7, y: 20 }

  if (action === 'idle') {
    bob = f === 1 ? 1 : 0
    rHand = { x: cx + 7, y: 20 + bob }
  } else if (action === 'walk') {
    const step = f % 2 === 0 ? 1 : -1
    bob = f % 3 === 1 ? -1 : 0
    lFoot = { x: cx - 4 + step, y: footY - (step > 0 ? 2 : 0) }
    rFoot = { x: cx + 4 - step, y: footY - (step < 0 ? 2 : 0) }
    rHand = { x: cx + 7, y: 19 + step }
    clubAngle = -0.6 + step * 0.25
  } else {
    const atk = [
      { bob: -1, lean: -1, rHand: { x: cx + 5, y: 12 }, ca: -2.2 },
      { bob: 0, lean: 1, rHand: { x: cx + 9, y: 15 }, ca: -0.4 },
      { bob: 1, lean: 2, rHand: { x: cx + 10, y: 20 }, ca: 0.35 },
      { bob: 0, lean: 1, rHand: { x: cx + 7, y: 20 }, ca: -0.3 },
    ][f % 4]
    bob = atk.bob; lean = atk.lean; rHand = atk.rHand; clubAngle = atk.ca
  }

  const bx = cx + lean
  const by = 13 + bob

  // War cape
  s.rect(bx - 6, by + 2, 12, 10, '#7f1d1d')

  // Thick legs
  s.line(bx - 3, by + 9, lFoot.x, lFoot.y, skinDark, 3)
  s.line(bx + 3, by + 9, rFoot.x, rFoot.y, skin, 3)
  s.rect(lFoot.x - 1, lFoot.y, 3, 1, '#3b281c')
  s.rect(rFoot.x - 1, rFoot.y, 3, 1, '#3b281c')

  // Broad armored chest
  s.rect(bx - 5, by + 1, 11, 9, armor)
  s.rect(bx - 6, by + 1, 13, 3, armorHi)
  s.rect(bx - 5, by + 6, 11, 2, gold)

  // Head + pointed ears + skull crown + tusks
  s.rect(bx - 4, by - 5, 9, 6, skin)
  s.line(bx - 4, by - 3, bx - 8, by - 5, skin, 2)
  s.line(bx + 4, by - 3, bx + 8, by - 5, skin, 2)
  // Horned skull crown
  s.rect(bx - 4, by - 7, 9, 2, '#f1e9d2')
  s.line(bx - 4, by - 7, bx - 6, by - 10, '#e9e3d5', 2)
  s.line(bx + 4, by - 7, bx + 6, by - 10, '#e9e3d5', 2)
  s.px(bx, by - 8, gold)

  if (dir !== 'up') {
    s.px(bx - 2, by - 3, '#ffd60a')
    s.px(bx + 2, by - 3, '#ffd60a')
    s.px(bx - 2, by - 1, '#ffffff') // tusks
    s.px(bx + 2, by - 1, '#ffffff')
  }

  // Arms & spiked war club
  s.line(bx - 5, by + 3, bx - 7, by + 8, skinDark, 2)
  s.line(bx + 5, by + 3, rHand.x, rHand.y, skin, 2)
  const cos = Math.cos(clubAngle)
  const sin = Math.sin(clubAngle)
  s.line(rHand.x, rHand.y, rHand.x + cos * 9, rHand.y + sin * 9, '#7f5539', 2)
  s.rect(rHand.x + cos * 7 - 1, rHand.y + sin * 7 - 1, 3, 3, '#94a3b8')
  s.px(rHand.x + cos * 10, rHand.y + sin * 10, '#ffffff')

  return s.toCanvas(true, dir === 'left')
}

function renderAbyssKnight(color: string, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(32, 30)
  const plate = '#231942'
  const plateHi = color
  const trim = '#c77dff'
  const capeCol = '#3c096c'
  const cx = 16
  const footY = 27

  let bob = 0
  let lean = 0
  let lFoot: Pt = { x: cx - 3, y: footY }
  let rFoot: Pt = { x: cx + 3, y: footY }
  let rHand: Pt = { x: cx + 5, y: 18 }
  let swordAngle = -0.8

  if (action === 'idle') {
    bob = f === 1 ? 1 : 0
    rHand = { x: cx + 5, y: 18 + bob }
  } else if (action === 'walk') {
    const step = f % 2 === 0 ? 1 : -1
    bob = f % 3 === 1 ? -1 : 0
    lFoot = { x: cx - 3 + step, y: footY - (step > 0 ? 2 : 0) }
    rFoot = { x: cx + 3 - step, y: footY - (step < 0 ? 2 : 0) }
    rHand = { x: cx + 5, y: 17 + step }
    swordAngle = -0.6 + step * 0.25
  } else {
    const atk = [
      { bob: -1, lean: -1, rHand: { x: cx + 4, y: 11 }, sa: -2.2 },
      { bob: 0, lean: 1, rHand: { x: cx + 7, y: 14 }, sa: -0.4 },
      { bob: 1, lean: 2, rHand: { x: cx + 8, y: 18 }, sa: 0.3 },
      { bob: 0, lean: 1, rHand: { x: cx + 5, y: 18 }, sa: -0.3 },
    ][f % 4]
    bob = atk.bob; lean = atk.lean; rHand = atk.rHand; swordAngle = atk.sa
  }

  const bx = cx + lean
  const by = 12 + bob

  // Tattered abyssal cape
  const capeSway = action === 'walk' && f % 2 === 1 ? 1 : 0
  s.rect(bx - 5, by + 2, 10, 9 + capeSway, capeCol)

  // Armored greaves
  s.line(bx - 2, by + 8, lFoot.x, lFoot.y, plate, 2)
  s.line(bx + 2, by + 8, rFoot.x, rFoot.y, plateHi, 2)
  s.rect(lFoot.x - 1, lFoot.y, 2, 1, trim)
  s.rect(rFoot.x - 1, rFoot.y, 2, 1, trim)

  // Spiked obsidian chest & pauldrons
  s.rect(bx - 4, by + 1, 9, 8, plate)
  s.rect(bx - 2, by + 2, 5, 3, plateHi)
  s.rect(bx - 4, by + 5, 9, 1, trim)
  s.rect(bx - 6, by, 3, 3, plateHi)
  s.rect(bx + 4, by, 3, 3, plateHi)
  s.px(bx - 6, by - 1, trim)
  s.px(bx + 6, by - 1, trim)

  // Horned dark greathelm
  s.rect(bx - 4, by - 6, 8, 6, plate)
  s.rect(bx - 3, by - 7, 6, 1, plateHi)
  s.line(bx - 4, by - 5, bx - 6, by - 9, trim, 1)
  s.line(bx + 3, by - 5, bx + 5, by - 9, trim, 1)
  if (dir !== 'up') {
    s.rect(bx - 2, by - 3, 5, 1, '#e0aaff')
  }

  // Arms & Void Greatsword
  s.line(bx - 5, by + 2, bx - 6, by + 7, plate, 2)
  s.line(bx + 5, by + 2, rHand.x, rHand.y, plateHi, 2)
  drawWeaponInHand(s, rHand, 'sword', '#9d4edd', swordAngle, action, f, undefined, 'knight')

  return s.toCanvas(true, dir === 'left')
}

function renderDemon(color: string, dir: Dir, action: SpriteAction, f: number, isLord = false): HTMLCanvasElement {
  const W = isLord ? 34 : 28
  const H = isLord ? 32 : 28
  const s = new PixelSurface(W, H)
  const dark = shade(color, -0.35)
  const hi = shade(color, 0.25)
  const trim = isLord ? '#ffd60a' : '#ff9f1c'
  const cx = Math.floor(W / 2)
  const footY = H - 3

  let bob = 0
  let wingFlap = 0
  let rHand: Pt = { x: cx + 6, y: isLord ? 19 : 17 }
  let weaponAngle = -0.6

  if (action === 'idle') {
    bob = f === 1 ? 1 : 0
    wingFlap = f === 1 ? -1 : f === 3 ? 1 : 0
    rHand = { x: cx + 6, y: (isLord ? 19 : 17) + bob }
  } else if (action === 'walk') {
    bob = f % 3 === 1 ? -1 : 0
    wingFlap = [-2, -1, 1, 2, 1, -1][f % 6]
    rHand = { x: cx + 6, y: (isLord ? 18 : 16) + (f % 2) }
    weaponAngle = f % 2 === 0 ? -0.4 : -0.9
  } else {
    const atk = [
      { bob: -1, wf: -3, rh: { x: cx + 4, y: 11 }, wa: -2.0 },
      { bob: 0, wf: 1, rh: { x: cx + 8, y: 14 }, wa: -0.4 },
      { bob: 1, wf: 2, rh: { x: cx + 9, y: 18 }, wa: 0.25 },
      { bob: 0, wf: 0, rh: { x: cx + 6, y: 18 }, wa: -0.5 },
    ][f % 4]
    bob = atk.bob; wingFlap = atk.wf; rHand = atk.rh; weaponAngle = atk.wa
  }

  const by = (isLord ? 12 : 11) + bob

  // Bat demon wings
  const span = isLord ? 12 : 9
  s.line(cx - 3, by + 2, cx - Math.round(span * 0.65), by - 3 + wingFlap, dark, 2)
  s.line(cx - Math.round(span * 0.65), by - 3 + wingFlap, cx - span, by + 3 + wingFlap, color, 2)
  s.line(cx + 3, by + 2, cx + Math.round(span * 0.65), by - 3 + wingFlap, dark, 2)
  s.line(cx + Math.round(span * 0.65), by - 3 + wingFlap, cx + span, by + 3 + wingFlap, color, 2)

  // Whip tail
  s.line(cx - 2, by + 8, cx - 7, by + 11 + (f % 2), dark, 1)
  s.px(cx - 8, by + 10 + (f % 2), trim)

  // Legs
  const step = action === 'walk' ? (f % 2 === 0 ? 1 : -1) : 0
  s.line(cx - 2, by + 8, cx - 3 + step, footY, dark, 2)
  s.line(cx + 2, by + 8, cx + 3 - step, footY, color, 2)

  // Torso
  s.rect(cx - (isLord ? 5 : 4), by + 1, isLord ? 10 : 8, 7, color)
  s.rect(cx - (isLord ? 4 : 3), by + 2, isLord ? 8 : 6, 2, hi)
  s.rect(cx - (isLord ? 5 : 4), by + 6, isLord ? 10 : 8, 1, trim)

  // Horned demon skull + crown for Demon Lord
  s.rect(cx - 3, by - 5, 7, 6, hi)
  s.line(cx - 3, by - 5, cx - 6, by - 9, '#f1e9d2', 2)
  s.line(cx + 3, by - 5, cx + 6, by - 9, '#f1e9d2', 2)
  if (isLord) {
    s.rect(cx - 3, by - 7, 7, 2, trim)
    s.px(cx, by - 8, '#ff4d6d')
  }
  if (dir !== 'up') {
    s.px(cx - 2, by - 3, '#ffd60a')
    s.px(cx + 2, by - 3, '#ffd60a')
  }

  // Arms & weapon
  s.line(cx - 4, by + 2, cx - 6, by + 7, dark, 2)
  s.line(cx + 4, by + 2, rHand.x, rHand.y, color, 2)
  drawWeaponInHand(s, rHand, isLord ? 'sword' : 'staff', isLord ? '#ff6b35' : '#ff9f1c', weaponAngle, action, f, undefined, isLord ? 'knight' : 'mage')

  return s.toCanvas(true, dir === 'left')
}

function renderAbyssDragon(color: string, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(42, 34)
  const scaleMain = color
  const dark = shade(color, -0.35)
  const hi = shade(color, 0.3)
  const belly = '#7209b7'
  const crest = '#c77dff'
  const glow = '#f72585'
  const cx = 20
  const baseY = 27

  let bob = 0
  let wingY = 0
  let jawOpen = false
  let tailCurl = 0

  if (action === 'idle') {
    bob = f === 1 ? -1 : f === 3 ? 1 : 0
    wingY = [-2, 0, 2, 0][f % 4]
    tailCurl = f % 2 === 0 ? 0 : -1
  } else if (action === 'walk') {
    bob = [-1, -2, -1, 0, -1, 0][f % 6]
    wingY = [-6, -2, 3, 6, 2, -3][f % 6]
    tailCurl = f % 2 === 0 ? -1 : 1
  } else {
    const atk = [
      { bob: -2, wy: -6, jaw: false, tc: -2 },
      { bob: 0, wy: 2, jaw: true, tc: 1 },
      { bob: 1, wy: 5, jaw: true, tc: 2 },
      { bob: 0, wy: -1, jaw: false, tc: 0 },
    ][f % 4]
    bob = atk.bob; wingY = atk.wy; jawOpen = atk.jaw; tailCurl = atk.tc
  }

  const by = 17 + bob

  // Huge sweeping barbed tail (left)
  s.line(cx - 5, by + 4, cx - 12, by + 5 + tailCurl, dark, 2)
  s.line(cx - 12, by + 5 + tailCurl, cx - 17, by + 1 + tailCurl, scaleMain, 2)
  s.px(cx - 18, by + tailCurl, crest)
  s.px(cx - 16, by - 1 + tailCurl, crest)

  // Far & near dragon wings arching behind torso
  s.line(cx - 2, by, cx - 11, by - 8 + wingY, dark, 2)
  s.line(cx - 11, by - 8 + wingY, cx - 17, by - 2 + wingY, scaleMain, 2)
  s.line(cx - 11, by - 7 + wingY, cx - 10, by + 1 + wingY, belly, 1)

  s.line(cx + 1, by, cx - 6, by - 10 + wingY, crest, 2)
  s.line(cx - 6, by - 10 + wingY, cx - 14, by - 5 + wingY, belly, 2)
  s.line(cx - 6, by - 9 + wingY, cx - 4, by - 1 + wingY, hi, 1)

  // Hind & fore clawed legs
  const stride = action === 'walk' ? (f % 2 === 0 ? 1 : -1) : 0
  s.line(cx - 4, by + 5, cx - 6 + stride, baseY + 2, dark, 2)
  s.rect(cx - 7 + stride, baseY + 2, 3, 1, '#e2e8f0')
  s.line(cx + 4, by + 5, cx + 6 - stride, baseY + 2, scaleMain, 2)
  s.rect(cx + 5 - stride, baseY + 2, 3, 1, '#e2e8f0')

  // Armored Dragon Torso & Neck
  s.rect(cx - 6, by, 12, 7, scaleMain)
  s.rect(cx - 4, by + 4, 8, 3, belly)
  s.line(cx + 4, by + 2, cx + 9, by - 4, scaleMain, 3)
  s.px(cx + 1, by - 1, crest)
  s.px(cx + 4, by - 3, crest)

  // Elongated Horned Dragon Head & Snout (facing right)
  const hx = cx + 9
  const hy = by - 7
  s.rect(hx - 2, hy, 7, 5, scaleMain)
  s.rect(hx + 3, hy + 1, 6, 3, hi) // snout
  // Swept horns
  s.line(hx, hy, hx - 5, hy - 4, '#e9e3d5', 2)
  s.line(hx + 2, hy, hx - 2, hy - 5, '#e9e3d5', 1)
  // Glowing abyssal eye
  s.px(hx + 3, hy + 1, '#ffd60a')
  s.px(hx + 2, hy + 1, glow)

  // Void fire breath & fangs on attack!
  if (jawOpen) {
    s.rect(hx + 3, hy + 4, 5, 2, glow)
    s.px(hx + 7, hy + 3, '#ffffff')
    s.line(hx + 9, hy + 3, hx + 14, hy + 2, '#e0aaff', 2)
    s.px(hx + 15, hy + 3, glow)
  }

  return s.toCanvas(true, dir === 'left')
}

function renderGaleSentinel(color: string, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(32, 30)
  const armor = color
  const dark = shade(color, -0.3)
  const hi = '#ffffff'
  const gold = '#ffd60a'
  const cx = 16
  const footY = 27

  let bob = 0
  let wingFlap = 0
  let lFoot: Pt = { x: cx - 2, y: footY }
  let rFoot: Pt = { x: cx + 2, y: footY }
  let lHand: Pt = { x: cx - 5, y: 18 }
  let rHand: Pt = { x: cx + 5, y: 18 }
  let spearAngle = -0.7

  if (action === 'idle') {
    bob = f === 1 ? -1 : 0
    wingFlap = f === 1 ? -2 : 0
  } else if (action === 'walk') {
    const seq = [
      { bob: 0, wf: -2, lf: { x: cx - 3, y: footY }, rf: { x: cx + 3, y: footY - 1 }, lh: { x: cx - 5, y: 16 }, rh: { x: cx + 5, y: 19 }, sa: -0.4 },
      { bob: -1, wf: 0, lf: { x: cx - 2, y: footY }, rf: { x: cx + 2, y: footY - 3 }, lh: { x: cx - 5, y: 18 }, rh: { x: cx + 5, y: 18 }, sa: -0.7 },
      { bob: 0, wf: 2, lf: { x: cx - 2, y: footY - 1 }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 5, y: 20 }, rh: { x: cx + 5, y: 16 }, sa: -1.0 },
      { bob: 0, wf: 1, lf: { x: cx - 2, y: footY - 1 }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 5, y: 20 }, rh: { x: cx + 5, y: 16 }, sa: -1.0 },
      { bob: -1, wf: 0, lf: { x: cx - 2, y: footY - 3 }, rf: { x: cx + 2, y: footY }, lh: { x: cx - 5, y: 18 }, rh: { x: cx + 5, y: 18 }, sa: -0.7 },
      { bob: 0, wf: -1, lf: { x: cx - 3, y: footY }, rf: { x: cx + 2, y: footY - 1 }, lh: { x: cx - 5, y: 16 }, rh: { x: cx + 5, y: 19 }, sa: -0.4 },
    ][f % 6]
    bob = seq.bob; wingFlap = seq.wf; lFoot = seq.lf; rFoot = seq.rf; lHand = seq.lh; rHand = seq.rh; spearAngle = seq.sa
  } else {
    const atk = [
      { bob: 0, wf: -3, lf: { x: cx - 3, y: footY }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 6, y: 16 }, rh: { x: cx + 2, y: 11 }, sa: -2.0 },
      { bob: -1, wf: 1, lf: { x: cx - 4, y: footY }, rf: { x: cx + 4, y: footY }, lh: { x: cx - 5, y: 18 }, rh: { x: cx + 6, y: 13 }, sa: -0.4 },
      { bob: 0, wf: 2, lf: { x: cx - 4, y: footY }, rf: { x: cx + 5, y: footY }, lh: { x: cx - 4, y: 18 }, rh: { x: cx + 8, y: 16 }, sa: 0.2 },
      { bob: 0, wf: 0, lf: { x: cx - 2, y: footY }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 5, y: 18 }, rh: { x: cx + 5, y: 18 }, sa: -0.5 },
    ][f % 4]
    bob = atk.bob; wingFlap = atk.wf; lFoot = atk.lf; rFoot = atk.rf; lHand = atk.lh; rHand = atk.rh; spearAngle = atk.sa
  }

  const by = 12 + bob
  s.line(cx - 3, by + 2, cx - 11, by - 3 + wingFlap, hi, 2)
  s.line(cx - 10, by - 1 + wingFlap, cx - 12, by + 5 + wingFlap, armor, 1)
  s.line(cx + 3, by + 2, cx + 11, by - 3 + wingFlap, hi, 2)
  s.line(cx + 10, by - 1 + wingFlap, cx + 12, by + 5 + wingFlap, armor, 1)

  s.line(cx - 2, by + 8, lFoot.x, lFoot.y, dark, 2)
  s.px(lFoot.x, lFoot.y, gold)
  s.line(cx + 2, by + 8, rFoot.x, rFoot.y, armor, 2)
  s.px(rFoot.x, rFoot.y, gold)

  s.rect(cx - 3, by, 7, 8, armor)
  s.rect(cx - 3, by + 5, 7, 1, gold)
  s.rect(cx - 3, by - 6, 7, 6, dark)
  s.px(cx, by - 8, gold); s.px(cx, by - 7, hi)
  if (dir !== 'up') {
    s.rect(cx - 2, by - 3, 5, 1, '#fff3b0')
  }

  drawArm(s, { x: cx - 3, y: by + 1 }, { x: cx - 4, y: by + 4 }, lHand, dark, armor)
  drawArm(s, { x: cx + 3, y: by + 1 }, { x: cx + 5, y: by + 4 }, rHand, armor, hi)
  drawWeaponInHand(s, rHand, 'sword', '#caf0f8', spearAngle, action, f, undefined, 'knight')

  return s.toCanvas(true, dir === 'left')
}

export function monsterSprite(
  sprite: MonsterSprite,
  color: string,
  frame: number,
  attacking = false,
  actionOverride?: SpriteAction,
  dir: Dir = 'down',
  attackFrameOverride?: number,
  defId?: string,
) {
  const action: SpriteAction = attacking ? 'attack' : actionOverride ?? (frame > 0 ? 'walk' : 'idle')
  const f = action === 'attack'
    ? Math.abs(attackFrameOverride ?? frame) % 4
    : action === 'walk'
      ? Math.abs(frame) % 6
      : Math.abs(frame) % 4

  const spec = getMonsterModelSpec(defId, sprite, color)

  if (spec.archetype === 'goblin') {
    return humanSprite(
      {
        hair: shade(color, -0.35),
        body: '#7f5539',
        legs: '#5c3d2e',
        accent: '#e9c46a',
        skin: color,
        eye: '#ffd60a',
        goblinEars: true,
        hatStyle: 'none',
      },
      dir,
      f,
      'stick',
      '#7f5539',
      attacking,
      action,
      attackFrameOverride,
    )
  }

  if (spec.archetype === 'skeleton') {
    return humanSprite(
      {
        hair: color,
        body: shade(color, -0.1),
        legs: shade(color, -0.2),
        accent: '#6c757d',
        skin: color,
        eye: '#e63946',
        skeleton: true,
        cape: '#343a40',
      },
      dir,
      f,
      'sword',
      '#adb5bd',
      attacking,
      action,
      attackFrameOverride,
    )
  }

  const key = `ma32|${spec.archetype}|${defId ?? ''}|${color}|${dir}|${action}|${f}`
  return cached(key, () => {
    switch (spec.archetype) {
      case 'slime':
        return renderSlime(color, dir, action, f, false)
      case 'pink_slime':
        return renderSlime(color, dir, action, f, true)
      case 'mushroom':
        return renderMushroom(color, dir, action, f)
      case 'rabbit':
        return renderRabbit(color, dir, action, f)
      case 'wolf':
        return renderWolf(color, dir, action, f)
      case 'goblin_chief':
        return renderGoblinChief(color, dir, action, f)
      case 'bat':
        return renderBat(color, dir, action, f)
      case 'ghost':
        return renderGhost(color, dir, action, f)
      case 'fire_golem':
        return renderGolem(color, dir, action, f, 'fire_golem')
      case 'earth_golem':
        return renderGolem(color, dir, action, f, 'earth_golem')
      case 'abyss_knight':
        return renderAbyssKnight(color, dir, action, f)
      case 'gale_sentinel':
        return renderGaleSentinel(color, dir, action, f)
      case 'demon':
        return renderDemon(color, dir, action, f, false)
      case 'demon_lord':
        return renderDemon(color, dir, action, f, true)
      case 'abyss_dragon':
        return renderAbyssDragon(color, dir, action, f)
      default:
        return renderSlime(color, dir, action, f, false)
    }
  })
}

/* ---------------- Tiles ---------------- */

function speckle(ctx: CanvasRenderingContext2D, rng: () => number, base: string, cols: string[], density: number) {
  ctx.fillStyle = base
  ctx.fillRect(0, 0, TILE, TILE)
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++)
      if (rng() < density) {
        ctx.fillStyle = cols[Math.floor(rng() * cols.length)]
        ctx.fillRect(x, y, 1, 1)
      }
}

function rngFrom(seed: number) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const ROOF_COLORS: Record<number, string> = {
  [T.ROOF_RED]: '#b23a48',
  [T.ROOF_BLUE]: '#3a6ea5',
  [T.ROOF_PURPLE]: '#6a4c93',
  [T.ROOF_GREEN]: '#3f7d4e',
}

function drawBase(ctx: CanvasRenderingContext2D, tile: number, rng: () => number) {
  switch (tile) {
    case T.GRASS:
      return speckle(ctx, rng, '#5a9e4b', ['#6bb35a', '#4c8a3f', '#78c267'], 0.12)
    case T.DARKGRASS:
      return speckle(ctx, rng, '#2f6b3a', ['#3a7d45', '#25572f', '#447f4c'], 0.14)
    case T.PATH:
      return speckle(ctx, rng, '#c9a86a', ['#b8955a', '#d9bc84', '#a88850'], 0.16)
    case T.SAND:
      return speckle(ctx, rng, '#e6cf8f', ['#d6bd7c', '#f0dca4'], 0.12)
    case T.PLAZA: {
      speckle(ctx, rng, '#b5b0a6', ['#a8a397', '#c4bfb4'], 0.15)
      ctx.fillStyle = '#8f8a80'
      ctx.fillRect(0, 0, TILE, 1)
      ctx.fillRect(0, 8, TILE, 1)
      ctx.fillRect(0, 0, 1, 8)
      ctx.fillRect(8, 8, 1, 8)
      return
    }
    case T.CAVEFLOOR:
      return speckle(ctx, rng, '#46495f', ['#3b3d52', '#53566e', '#3f4258'], 0.18)
    case T.VOLCFLOOR: {
      speckle(ctx, rng, '#3b2a2a', ['#4a3434', '#2c1f1f', '#523a3a'], 0.18)
      if (rng() < 0.3) {
        ctx.fillStyle = '#ff6b35'
        ctx.fillRect(Math.floor(rng() * 14), Math.floor(rng() * 14), 1, 1)
      }
      return
    }
    default:
      return speckle(ctx, rng, '#5a9e4b', ['#6bb35a', '#4c8a3f'], 0.12)
  }
}

function drawTile(ctx: CanvasRenderingContext2D, tile: number, base: number, variant: number) {
  const rng = rngFrom(tile * 1000 + base * 37 + variant * 7 + 1)
  const p = (x: number, y: number, c: string, w = 1, h = 1) => {
    ctx.fillStyle = c
    ctx.fillRect(x, y, w, h)
  }
  switch (tile) {
    case T.FLOWER: {
      drawBase(ctx, T.GRASS, rng)
      const cols = ['#ffd6e0', '#fff3b0', '#ff5d8f', '#cdb4db', '#ffffff']
      for (let i = 0; i < 3; i++) {
        const x = 2 + Math.floor(rng() * 11)
        const y = 2 + Math.floor(rng() * 11)
        const c = cols[Math.floor(rng() * cols.length)]
        p(x, y - 1, c)
        p(x - 1, y, c)
        p(x + 1, y, c)
        p(x, y + 1, c)
        p(x, y, '#f4a261')
      }
      return
    }
    case T.WATER: {
      p(0, 0, '#3a7bd5', TILE, TILE)
      for (let i = 0; i < 4; i++) {
        const x = Math.floor(rng() * 12)
        const y = Math.floor(rng() * 15)
        p(x, y, '#6aa6ef', 3, 1)
      }
      p(0, 0, '#2f66b3', TILE, 1)
      return
    }
    case T.TREE: {
      drawBase(ctx, base, rng)
      p(6, 11, '#6b4226', 4, 5)
      p(7, 11, '#8a5a3b', 1, 4)
      p(3, 14, 'rgba(0,0,0,0.2)', 10, 2)
      const canopy = [
        [5, 0, 6],
        [3, 1, 10],
        [2, 2, 12],
        [1, 3, 14],
        [1, 4, 14],
        [1, 5, 14],
        [1, 6, 14],
        [2, 7, 12],
        [2, 8, 12],
        [3, 9, 10],
        [5, 10, 6],
      ]
      for (const [x, y, w] of canopy) p(x, y, '#2d6a2e', w, 1)
      p(3, 2, '#3f8f3f', 5, 2)
      p(2, 4, '#3f8f3f', 3, 2)
      p(5, 1, '#5aa95a', 2, 1)
      p(4, 8, '#1e4d20', 9, 1)
      p(5, 9, '#1e4d20', 7, 1)
      return
    }
    case T.PINE: {
      drawBase(ctx, base, rng)
      p(7, 12, '#5c3d2e', 2, 4)
      p(3, 14, 'rgba(0,0,0,0.25)', 10, 2)
      const layers = [
        [7, 0, 2],
        [6, 1, 4],
        [5, 2, 6],
        [6, 3, 4],
        [4, 4, 8],
        [3, 5, 10],
        [5, 6, 6],
        [3, 7, 10],
        [2, 8, 12],
        [1, 9, 14],
        [2, 10, 12],
        [3, 11, 10],
      ]
      for (const [x, y, w] of layers) p(x, y, '#1b4332', w, 1)
      p(6, 2, '#2d6a4f', 2, 2)
      p(5, 5, '#2d6a4f', 3, 1)
      p(4, 8, '#2d6a4f', 3, 2)
      p(10, 9, '#081c15', 4, 2)
      return
    }
    case T.BUSH: {
      drawBase(ctx, base, rng)
      p(2, 13, 'rgba(0,0,0,0.2)', 12, 2)
      p(3, 5, '#2f7a33', 10, 9)
      p(2, 7, '#2f7a33', 12, 5)
      p(4, 4, '#2f7a33', 8, 1)
      p(4, 6, '#46a046', 4, 2)
      p(9, 8, '#46a046', 2, 2)
      p(3, 12, '#1f5222', 10, 1)
      p(6, 7, '#e63946')
      p(10, 10, '#e63946')
      return
    }
    case T.ROCK: {
      drawBase(ctx, base, rng)
      p(2, 13, 'rgba(0,0,0,0.25)', 12, 2)
      p(3, 5, '#8d99ae', 10, 8)
      p(2, 7, '#8d99ae', 12, 5)
      p(5, 4, '#8d99ae', 6, 1)
      p(4, 5, '#adb5bd', 4, 2)
      p(3, 11, '#6c757d', 10, 2)
      p(9, 7, '#6c757d', 1, 3)
      return
    }
    case T.CRYSTAL: {
      drawBase(ctx, T.CAVEFLOOR, rng)
      p(3, 13, 'rgba(0,0,0,0.3)', 10, 2)
      p(7, 2, '#72efdd', 2, 11)
      p(4, 6, '#56cfe1', 2, 7)
      p(10, 5, '#64dfdf', 2, 8)
      p(7, 2, '#e0fbfc', 1, 4)
      p(4, 6, '#e0fbfc', 1, 2)
      return
    }
    case T.CAVEWALL: {
      p(0, 0, base === T.VOLCFLOOR ? '#1f1414' : '#22223b', TILE, TILE)
      for (let i = 0; i < 6; i++) p(Math.floor(rng() * 14), Math.floor(rng() * 14), base === T.VOLCFLOOR ? '#3a2323' : '#343a5a', 2, 2)
      p(0, 14, base === T.VOLCFLOOR ? '#120b0b' : '#15152a', TILE, 2)
      return
    }
    case T.LAVA: {
      p(0, 0, '#e85d04', TILE, TILE)
      for (let i = 0; i < 5; i++) p(Math.floor(rng() * 14), Math.floor(rng() * 14), '#ffb703', 2, 1)
      for (let i = 0; i < 3; i++) p(Math.floor(rng() * 14), Math.floor(rng() * 14), '#9d0208', 2, 2)
      return
    }
    case T.WALL:
    case T.WINDOW:
    case T.DOOR: {
      p(0, 0, '#e9d8a6', TILE, TILE)
      p(0, 5, '#cdb57f', TILE, 1)
      p(0, 11, '#cdb57f', TILE, 1)
      p(0, 0, '#c9b27c', 1, TILE)
      p(15, 0, '#b39a62', 1, TILE)
      if (tile === T.WINDOW) {
        p(3, 3, '#6b4226', 10, 9)
        p(4, 4, '#8ecae6', 8, 7)
        p(4, 4, '#caf0f8', 3, 2)
        p(7, 4, '#6b4226', 1, 7)
        p(4, 7, '#6b4226', 8, 1)
      }
      if (tile === T.DOOR) {
        p(3, 2, '#5c3d2e', 10, 14)
        p(4, 3, '#7f5539', 8, 13)
        p(7, 3, '#5c3d2e', 1, 13)
        p(10, 9, '#f4d35e', 1, 2)
      }
      return
    }
    case T.ROOF_RED:
    case T.ROOF_BLUE:
    case T.ROOF_PURPLE:
    case T.ROOF_GREEN: {
      const c = ROOF_COLORS[tile]
      p(0, 0, c, TILE, TILE)
      for (let y = 0; y < TILE; y += 4) {
        p(0, y + 3, shade(c, -0.3), TILE, 1)
        for (let x = (y / 4) % 2 === 0 ? 0 : 4; x < TILE; x += 8) p(x, y, shade(c, -0.18), 1, 3)
      }
      p(0, 0, shade(c, 0.2), TILE, 1)
      return
    }
    case T.FENCE: {
      drawBase(ctx, base, rng)
      p(0, 6, '#8a5a3b', TILE, 2)
      p(0, 10, '#8a5a3b', TILE, 2)
      p(2, 3, '#a47148', 3, 12)
      p(11, 3, '#a47148', 3, 12)
      p(2, 3, '#c8956b', 3, 1)
      p(11, 3, '#c8956b', 3, 1)
      return
    }
    case T.SIGN: {
      drawBase(ctx, base, rng)
      p(7, 9, '#6b4226', 2, 7)
      p(1, 2, '#6b4226', 14, 8)
      p(2, 3, '#c8956b', 12, 6)
      p(4, 5, '#6b4226', 6, 1)
      p(10, 4, '#6b4226', 1, 3)
      p(11, 5, '#6b4226', 1, 1)
      return
    }
    case T.MUSHROOMS: {
      drawBase(ctx, base, rng)
      p(4, 9, '#f1e3c8', 2, 3)
      p(3, 7, '#e63946', 4, 2)
      p(4, 7, '#ffffff')
      p(10, 11, '#f1e3c8', 2, 2)
      p(9, 9, '#f4a261', 4, 2)
      return
    }
    case T.BONES: {
      drawBase(ctx, base, rng)
      p(3, 8, '#e9e3d5', 8, 1)
      p(2, 7, '#e9e3d5', 2, 3)
      p(10, 7, '#e9e3d5', 2, 3)
      p(9, 11, '#d6d0c0', 3, 2)
      return
    }
    case T.FOUNTAIN:
      return drawBase(ctx, T.PLAZA, rng)
    default:
      return drawBase(ctx, tile, rng)
  }
}

function tileCanvas(tile: number, base: number, variant: number) {
  return cached(`t|${tile}|${base}|${variant}`, () => {
    const { c, ctx } = makeCanvas(TILE, TILE)
    drawTile(ctx, tile, base, variant)
    return c
  })
}

const mapCache = new Map<string, HTMLCanvasElement>()
export function mapCanvas(map: MapDef) {
  let c = mapCache.get(map.id)
  if (c) return c
  const made = makeCanvas(map.width * TILE, map.height * TILE)
  c = made.c
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      const t = map.tiles[y * map.width + x]
      const variant = (x * 7 + y * 13) % 4
      made.ctx.drawImage(tileCanvas(t, map.base, variant), x * TILE, y * TILE)
    }
  mapCache.set(map.id, c)
  return c
}

/* ---------------- Item icons ---------------- */

const ICONS: Record<string, string[]> = {
  potion: ['....kk....', '....ww....', '...kccl...', '..cccccc..', '.ccllcccc.', '.cclccccc.', '.cccccccd.', '.ccccccdd.', '..cccddd..', '...dddd...'],
  sword: ['........ll', '.......lcl', '......lcl.', '.....lcl..', '....lcl...', '.g.lcl....', '..gcl.....', '..gg......', '.n..g.....', 'n.........'],
  staff: ['.......oo.', '......oyyo', '......oyyo', '.......oo.', '......n...', '.....n....', '....n.....', '...n......', '..n.......', '.n........'],
  bow: ['....nn....', '...n..w...', '..n...w...', '.n....w...', '.n....wcc.', '.n....w...', '..n...w...', '...n..w...', '....nn....', '..........'],
  dagger: ['..........', '.......ll.', '......lcl.', '.....lcl..', '....lcl...', '..g.cl....', '...gg.....', '..n.g.....', '.n........', '..........'],
  stick: ['........cc', '.......ccd', '......ccd.', '.....ccd..', '....ccd...', '...ccd....', '..ccd.....', '.ccd......', 'ccd.......', 'cd........'],
  armor: ['.cc....cc.', 'cccc..cccc', 'cclccccccc', '.clcccccc.', '.cccyyccc.', '.ccccccccd', '.ccccccccd', '.cccccccdd', '..ccccddd.', '..........'],
  stone: ['..........', '....ll....', '...lccc...', '..lcccccc.', '.lccwccccd', '.ccccccccd', '..cccccdd.', '...ccddd..', '....dd....', '..........'],
  gel: ['..........', '....cc....', '...cccc...', '..clcccc..', '.cclccccc.', '.ccccccccd', '.ccccccccd', '..ccccccd.', '...dddd...', '..........'],
  fang: ['..........', '..cc......', '..ccc.....', '...ccc....', '...cccc...', '....cccc..', '.....cccd.', '......ccd.', '.......dd.', '..........'],
  bone: ['.cc.......', 'cccc......', '.cccc.....', '...ccc....', '....ccc...', '.....ccc..', '......cccc', '.......ccc', '........c.', '..........'],
  core: ['..........', '...oooo...', '..occcco..', '.occyyco..', '.occyycco.', '.occcccco.', '..occccod.', '...oooo...', '..........', '..........'],
  scroll: ['..........', '.nnnnnnnn.', '.cccccccc.', '.ckkkkkkc.', '.cccccccc.', '.ckkkkcc..', '.cccccccc.', '.nnnnnnnn.', '..........', '..........'],
}

const iconCache = new Map<string, string>()
export function itemIconUrl(icon: string, color: string) {
  const key = `${icon}|${color}`
  const hit = iconCache.get(key)
  if (hit) return hit
  const rows = ICONS[icon] ?? ICONS.stone
  const c = renderTemplate(rows, {
    c: color,
    d: shade(color, -0.35),
    l: shade(color, 0.55),
    w: '#f1f1f1',
    k: '#5c3d2e',
    g: '#e9c46a',
    n: '#7f5539',
    o: shade(color, -0.2),
    y: '#fff3b0',
  })
  const url = c.toDataURL()
  iconCache.set(key, url)
  return url
}
