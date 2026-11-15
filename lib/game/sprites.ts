import type { MonsterSprite, WeaponType } from './data'
import { T, TILE, type MapDef } from './maps'

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

/* ---------------- Articulated Humanoids ---------------- */

export type Dir = 'down' | 'up' | 'left' | 'right'
export type SpriteAction = 'idle' | 'walk' | 'attack'
export type HatStyle = 'none' | 'wizard' | 'hood' | 'helm' | 'crown' | 'mitre' | 'bandana'

export interface HumanColors {
  hair: string
  body: string
  legs: string
  accent: string
  skin?: string
  hat?: string
  hatStyle?: HatStyle
  cape?: string
  shieldColor?: string
  wings?: boolean
  horns?: boolean
  goblinEars?: boolean
  skeleton?: boolean
  eye?: string
}

export function jobHumanColors(
  jobId: string,
  base: { hair: string; body: string; legs: string; accent: string; skin?: string; hat?: string },
  isGm = false,
): HumanColors {
  if (isGm || jobId === 'gm') {
    return {
      ...base,
      hat: '#ffd60a',
      hatStyle: 'crown',
      cape: '#b5179e',
      wings: true,
    }
  }
  switch (jobId) {
    case 'swordsman':
      return { ...base, hatStyle: 'bandana', hat: '#4a6fa5', shieldColor: '#8d99ae' }
    case 'knight':
      return { ...base, hatStyle: 'helm', hat: '#9aa5b1', cape: '#e63946', shieldColor: '#adb5bd' }
    case 'paladin':
      return { ...base, hatStyle: 'helm', hat: '#e2e8f0', cape: '#3a86ff', shieldColor: '#f4d35e' }
    case 'mage':
      return { ...base, hatStyle: 'wizard', hat: '#5b3f8c', cape: '#3a2a5c' }
    case 'wizard':
      return { ...base, hatStyle: 'wizard', hat: '#1d3557', cape: '#457b9d' }
    case 'cleric':
      return { ...base, hatStyle: 'mitre', hat: '#f8f9fa', cape: '#f4d35e' }
    case 'archer':
      return { ...base, hatStyle: 'hood', hat: '#3f7d4e', cape: '#2d6a4f' }
    case 'hunter':
      return { ...base, hatStyle: 'hood', hat: '#2d6a4f', cape: '#588157' }
    case 'thief':
      return { ...base, hatStyle: 'bandana', hat: '#b23a48' }
    case 'assassin':
      return { ...base, hatStyle: 'hood', hat: '#1b1b2f', cape: '#7b2cbf' }
    default:
      return { ...base, hatStyle: 'none' }
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
) {
  if (!weapon) return
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  const hilt = '#7f5539'
  const guard = '#e9c46a'
  const bladeHi = shade(weaponColor, 0.35)

  if (weapon === 'sword') {
    // Pommel & grip
    s.px(hand.x - cos, hand.y - sin, hilt)
    // Crossguard perpendicular
    const px = -sin
    const py = cos
    s.px(hand.x + cos + px, hand.y + sin + py, guard)
    s.px(hand.x + cos, hand.y + sin, guard)
    s.px(hand.x + cos - px, hand.y + sin - py, guard)
    // Blade (6px)
    const tipX = hand.x + cos * 7
    const tipY = hand.y + sin * 7
    s.line(hand.x + cos * 2, hand.y + sin * 2, tipX, tipY, weaponColor, 1)
    s.px(tipX, tipY, bladeHi)
    if (action === 'attack' && (atkF === 1 || atkF === 2)) {
      s.px(tipX + cos, tipY + sin, '#ffffff')
      s.px(hand.x + cos * 5 + px, hand.y + sin * 5 + py, bladeHi)
    }
    return
  }

  if (weapon === 'dagger') {
    const px = -sin
    const py = cos
    s.px(hand.x - cos, hand.y - sin, hilt)
    s.px(hand.x + px, hand.y + py, guard)
    s.px(hand.x - px, hand.y - py, guard)
    const tipX = hand.x + cos * 4
    const tipY = hand.y + sin * 4
    s.line(hand.x + cos, hand.y + sin, tipX, tipY, weaponColor, 1)
    s.px(tipX, tipY, bladeHi)
    if (action === 'attack' && atkF === 2) {
      s.px(tipX + cos, tipY + sin, '#ffffff')
    }
    return
  }

  if (weapon === 'stick') {
    const tipX = hand.x + cos * 6
    const tipY = hand.y + sin * 6
    s.line(hand.x - cos * 2, hand.y - sin * 2, tipX, tipY, weaponColor, 1)
    s.px(tipX, tipY, shade(weaponColor, -0.25))
    return
  }

  if (weapon === 'staff') {
    const shaftStart = { x: hand.x - cos * 3, y: hand.y - sin * 3 }
    const orbCenter = { x: hand.x + cos * 6, y: hand.y + sin * 6 }
    s.line(shaftStart.x, shaftStart.y, orbCenter.x - cos, orbCenter.y - sin, hilt, 1)
    // Glowing orb
    s.px(orbCenter.x, orbCenter.y, bladeHi)
    s.px(orbCenter.x + cos, orbCenter.y + sin, weaponColor)
    s.px(orbCenter.x - sin, orbCenter.y + cos, weaponColor)
    s.px(orbCenter.x + sin, orbCenter.y - cos, weaponColor)
    if (action === 'attack' && (atkF === 1 || atkF === 2)) {
      s.px(orbCenter.x + cos * 2, orbCenter.y + sin * 2, '#fff3b0')
    }
    return
  }

  if (weapon === 'bow') {
    // Curved bow around hand facing angleRad
    const perpX = -sin
    const perpY = cos
    const topTip = { x: hand.x - cos * 1 + perpX * 4, y: hand.y - sin * 1 + perpY * 4 }
    const botTip = { x: hand.x - cos * 1 - perpX * 4, y: hand.y - sin * 1 - perpY * 4 }
    const midOuter = { x: hand.x + cos * 1.5, y: hand.y + sin * 1.5 }
    s.line(topTip.x, topTip.y, midOuter.x + perpX * 2, midOuter.y + perpY * 2, weaponColor, 1)
    s.line(midOuter.x + perpX * 2, midOuter.y + perpY * 2, midOuter.x - perpX * 2, midOuter.y - perpY * 2, weaponColor, 1)
    s.line(midOuter.x - perpX * 2, midOuter.y - perpY * 2, botTip.x, botTip.y, weaponColor, 1)

    // Bowstring & arrow when drawing/releasing
    const pull = drawHandPoint ?? { x: hand.x - cos * 2, y: hand.y - sin * 2 }
    if (action === 'attack' && atkF === 1) {
      s.line(topTip.x, topTip.y, pull.x, pull.y, '#e2e8f0', 1)
      s.line(botTip.x, botTip.y, pull.x, pull.y, '#e2e8f0', 1)
      s.line(pull.x, pull.y, hand.x + cos * 4, hand.y + sin * 4, '#f8fafc', 1)
      s.px(hand.x + cos * 4, hand.y + sin * 4, '#ffd60a')
    } else {
      s.line(topTip.x, topTip.y, botTip.x, botTip.y, '#e2e8f0', 1)
      if (action === 'attack' && atkF === 2) {
        s.line(hand.x + cos * 2, hand.y + sin * 2, hand.x + cos * 7, hand.y + sin * 7, '#f8fafc', 1)
        s.px(hand.x + cos * 7, hand.y + sin * 7, '#ffd60a')
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
  // Boot / foot
  s.px(foot.x, foot.y, bootCol)
  s.px(foot.x + footDirX, foot.y, bootCol)
  s.px(foot.x, foot.y - 1, shade(bootCol, 0.18))
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
  const hatCol = colors.hat ?? colors.accent
  const hatDark = shade(hatCol, -0.28)
  const style = colors.hatStyle ?? (colors.hat ? 'wizard' : 'none')

  if (style === 'none') {
    if (dir === 'side') {
      s.rect(cx - 3, headTopY - 1, 6, 2, hairCol)
      s.rect(cx - 4, headTopY, 2, 4, hairDark)
      s.px(cx + 2, headTopY, hairCol)
    } else if (dir === 'down') {
      s.rect(cx - 3, headTopY - 1, 6, 2, hairCol)
      s.px(cx - 4, headTopY + 1, hairDark)
      s.px(cx + 3, headTopY + 1, hairDark)
    } else {
      s.rect(cx - 3, headTopY - 1, 6, 5, hairCol)
      s.rect(cx - 3, headTopY + 3, 6, 1, hairDark)
    }
    return
  }

  if (style === 'wizard') {
    // Pointed mage hat
    s.rect(cx - 5, headTopY + 1, 10, 1, hatDark)
    s.rect(cx - 3, headTopY - 1, 6, 2, hatCol)
    s.rect(cx - 2, headTopY - 3, 4, 2, hatCol)
    s.px(dir === 'side' ? cx - 2 : cx - 1, headTopY - 4, hatCol)
    s.rect(cx - 3, headTopY, 6, 1, colors.accent)
    return
  }

  if (style === 'hood') {
    s.rect(cx - 4, headTopY - 1, 8, 2, hatCol)
    if (dir === 'side') {
      s.rect(cx - 4, headTopY, 3, 5, hatDark)
    } else if (dir === 'up') {
      s.rect(cx - 4, headTopY, 8, 5, hatCol)
    } else {
      s.px(cx - 4, headTopY + 1, hatDark)
      s.px(cx + 3, headTopY + 1, hatDark)
    }
    return
  }

  if (style === 'helm') {
    s.rect(cx - 4, headTopY - 1, 8, 3, hatCol)
    s.rect(cx - 1, headTopY - 3, 2, 2, colors.accent) // plume
    if (dir === 'side') {
      s.rect(cx - 4, headTopY + 1, 2, 3, hatDark)
    } else if (dir === 'up') {
      s.rect(cx - 4, headTopY + 1, 8, 4, hatDark)
    } else {
      s.px(cx - 3, headTopY + 2, hatDark)
      s.px(cx + 2, headTopY + 2, hatDark)
    }
    return
  }

  if (style === 'crown') {
    if (dir === 'side') {
      s.rect(cx - 3, headTopY, 6, 2, hairCol)
    } else {
      s.rect(cx - 3, headTopY, 6, dir === 'up' ? 5 : 2, hairCol)
    }
    s.rect(cx - 3, headTopY - 1, 6, 1, '#ffd60a')
    s.px(cx - 3, headTopY - 2, '#ffd60a')
    s.px(cx, headTopY - 2, '#fff3b0')
    s.px(cx + 2, headTopY - 2, '#ffd60a')
    return
  }

  if (style === 'mitre') {
    s.rect(cx - 3, headTopY - 1, 6, 2, hatCol)
    s.rect(cx - 2, headTopY - 3, 4, 2, hatCol)
    s.line(cx, headTopY - 2, cx, headTopY, colors.accent, 1)
    return
  }

  // bandana / default hat
  s.rect(cx - 3, headTopY - 1, 6, 2, hatCol)
  s.rect(cx - 4, headTopY, 8, 1, colors.accent)
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

  const key = `ha|${JSON.stringify(colors)}|${dir}|${action}|${f}|${weapon ?? 'none'}|${weaponColor}`
  return cached(key, () => {
    const W = 28
    const H = 26
    const s = new PixelSurface(W, H)

    const skin = colors.skin ?? '#f1c27d'
    const skinDark = shade(skin, -0.22)
    const body = colors.body
    const bodyDark = shade(body, -0.26)
    const bodyHi = shade(body, 0.16)
    const legCol = colors.legs
    const legDark = shade(legCol, -0.26)
    const bootCol = '#3b281c'
    const bootDark = '#241810'
    const eyeCol = colors.eye ?? '#1a1423'
    const blink = !attacking && f === -1

    const cx = 13
    const footY = 23

    if (dir === 'left' || dir === 'right') {
      // Side rig authored facing right, mirrored automatically for left
      let bob = 0
      let lean = 0
      let backHip: Pt = { x: cx - 1, y: 17 }
      let backKnee: Pt = { x: cx - 1, y: 20 }
      let backFoot: Pt = { x: cx - 1, y: footY }
      let frontHip: Pt = { x: cx, y: 17 }
      let frontKnee: Pt = { x: cx, y: 20 }
      let frontFoot: Pt = { x: cx, y: footY }

      let backElbow: Pt = { x: cx + 1, y: 14 }
      let backHand: Pt = { x: cx + 2, y: 16 }
      let frontElbow: Pt = { x: cx - 1, y: 14 }
      let frontHand: Pt = { x: cx, y: 16 }
      let weaponAngle = -0.35

      if (action === 'idle') {
        const breath = f === 1 ? 1 : 0
        bob = breath
        backHip = { x: cx - 1, y: 17 + breath }
        backKnee = { x: cx - 2, y: 20 }
        backFoot = { x: cx - 2, y: footY }
        frontHip = { x: cx + 1, y: 17 + breath }
        frontKnee = { x: cx + 1, y: 20 }
        frontFoot = { x: cx + 1, y: footY }
        backElbow = { x: cx + 2, y: 13 + breath }
        backHand = { x: cx + 3, y: 15 + breath }
        frontElbow = { x: cx - 1, y: 14 + breath }
        frontHand = { x: cx + 1, y: 16 + breath }
        weaponAngle = weapon === 'staff' ? -1.4 : weapon === 'bow' ? 0 : -0.6
      } else if (action === 'walk') {
        // 6-frame full stride cycle
        const walkFrames: Array<{
          bob: number; lean: number
          bk: Pt; bf: Pt; fk: Pt; ff: Pt
          be: Pt; bh: Pt; fe: Pt; fh: Pt; wa: number
        }> = [
          // 0: front leg forward planted, back leg behind; front arm back, back arm forward
          { bob: 0, lean: 1, bk: { x: cx - 2, y: 20 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 2, y: 20 }, ff: { x: cx + 3, y: footY }, be: { x: cx + 2, y: 14 }, bh: { x: cx + 4, y: 15 }, fe: { x: cx - 2, y: 14 }, fh: { x: cx - 4, y: 16 }, wa: 0.35 },
          // 1: push-off passing (back knee lifts up)
          { bob: -1, lean: 1, bk: { x: cx, y: 18 }, bf: { x: cx - 2, y: footY - 2 }, fk: { x: cx, y: 20 }, ff: { x: cx, y: footY }, be: { x: cx + 1, y: 13 }, bh: { x: cx + 2, y: 15 }, fe: { x: cx - 1, y: 13 }, fh: { x: cx - 1, y: 15 }, wa: -0.1 },
          // 2: back leg kicks forward high, front leg pushes back
          { bob: 0, lean: 1, bk: { x: cx + 3, y: 19 }, bf: { x: cx + 2, y: footY - 1 }, fk: { x: cx - 1, y: 20 }, ff: { x: cx - 3, y: footY }, be: { x: cx - 2, y: 14 }, bh: { x: cx - 4, y: 16 }, fe: { x: cx + 2, y: 14 }, fh: { x: cx + 4, y: 15 }, wa: -0.6 },
          // 3: back leg forward planted, front leg behind (opposite contact)
          { bob: 0, lean: 1, bk: { x: cx + 2, y: 20 }, bf: { x: cx + 3, y: footY }, fk: { x: cx - 2, y: 20 }, ff: { x: cx - 4, y: footY }, be: { x: cx - 2, y: 14 }, bh: { x: cx - 4, y: 16 }, fe: { x: cx + 2, y: 14 }, fh: { x: cx + 4, y: 15 }, wa: -0.8 },
          // 4: push-off passing (front knee lifts up)
          { bob: -1, lean: 1, bk: { x: cx, y: 20 }, bf: { x: cx, y: footY }, fk: { x: cx, y: 18 }, ff: { x: cx - 2, y: footY - 2 }, be: { x: cx + 1, y: 13 }, bh: { x: cx + 1, y: 15 }, fe: { x: cx, y: 13 }, fh: { x: cx, y: 15 }, wa: -0.35 },
          // 5: front leg kicks forward high, back leg pushes back
          { bob: 0, lean: 1, bk: { x: cx - 1, y: 20 }, bf: { x: cx - 3, y: footY }, fk: { x: cx + 3, y: 19 }, ff: { x: cx + 2, y: footY - 1 }, be: { x: cx + 2, y: 14 }, bh: { x: cx + 4, y: 15 }, fe: { x: cx - 2, y: 14 }, fh: { x: cx - 4, y: 16 }, wa: 0.2 },
        ]
        const wf = walkFrames[f]
        bob = wf.bob
        lean = wf.lean
        backHip = { x: cx - 1 + lean, y: 17 + bob }
        backKnee = wf.bk
        backFoot = wf.bf
        frontHip = { x: cx + 1 + lean, y: 17 + bob }
        frontKnee = wf.fk
        frontFoot = wf.ff
        backElbow = wf.be
        backHand = wf.bh
        frontElbow = wf.fe
        frontHand = wf.fh
        weaponAngle = weapon === 'staff' ? wf.wa - 0.7 : weapon === 'bow' ? wf.wa * 0.25 : wf.wa
      } else {
        // 4-frame Attack (Windup -> Strike -> Full Extend -> Recover)
        if (weapon === 'bow') {
          const bowAtk = [
            { bob: 0, lean: 0, bk: { x: cx - 2, y: 20 }, bf: { x: cx - 3, y: footY }, fk: { x: cx + 2, y: 20 }, ff: { x: cx + 3, y: footY }, be: { x: cx + 3, y: 12 }, bh: { x: cx + 5, y: 12 }, fe: { x: cx + 1, y: 12 }, fh: { x: cx + 3, y: 12 }, wa: 0 },
            { bob: 1, lean: -1, bk: { x: cx - 3, y: 20 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 2, y: 20 }, ff: { x: cx + 3, y: footY }, be: { x: cx + 3, y: 12 }, bh: { x: cx + 5, y: 12 }, fe: { x: cx - 2, y: 12 }, fh: { x: cx - 3, y: 12 }, wa: 0 },
            { bob: 0, lean: 1, bk: { x: cx - 3, y: 20 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 3, y: 20 }, ff: { x: cx + 4, y: footY }, be: { x: cx + 3, y: 12 }, bh: { x: cx + 6, y: 12 }, fe: { x: cx - 3, y: 12 }, fh: { x: cx - 4, y: 12 }, wa: 0 },
            { bob: 0, lean: 0, bk: { x: cx - 2, y: 20 }, bf: { x: cx - 3, y: footY }, fk: { x: cx + 2, y: 20 }, ff: { x: cx + 3, y: footY }, be: { x: cx + 2, y: 13 }, bh: { x: cx + 4, y: 14 }, fe: { x: cx - 1, y: 13 }, fh: { x: cx + 1, y: 14 }, wa: 0.1 },
          ][f]
          bob = bowAtk.bob; lean = bowAtk.lean
          backHip = { x: cx - 1 + lean, y: 17 + bob }; backKnee = bowAtk.bk; backFoot = bowAtk.bf
          frontHip = { x: cx + 1 + lean, y: 17 + bob }; frontKnee = bowAtk.fk; frontFoot = bowAtk.ff
          backElbow = bowAtk.be; backHand = bowAtk.bh
          frontElbow = bowAtk.fe; frontHand = bowAtk.fh
          weaponAngle = bowAtk.wa
        } else if (weapon === 'staff') {
          const staffAtk = [
            { bob: 1, lean: -1, bk: { x: cx - 2, y: 20 }, bf: { x: cx - 3, y: footY }, fk: { x: cx + 2, y: 20 }, ff: { x: cx + 3, y: footY }, be: { x: cx + 1, y: 10 }, bh: { x: cx + 1, y: 7 }, fe: { x: cx - 1, y: 10 }, fh: { x: cx, y: 8 }, wa: -1.6 },
            { bob: 0, lean: 1, bk: { x: cx - 3, y: 20 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 3, y: 20 }, ff: { x: cx + 4, y: footY }, be: { x: cx + 3, y: 11 }, bh: { x: cx + 5, y: 10 }, fe: { x: cx + 2, y: 11 }, fh: { x: cx + 4, y: 11 }, wa: -0.7 },
            { bob: 1, lean: 2, bk: { x: cx - 3, y: 20 }, bf: { x: cx - 5, y: footY }, fk: { x: cx + 4, y: 20 }, ff: { x: cx + 5, y: footY }, be: { x: cx + 4, y: 13 }, bh: { x: cx + 6, y: 12 }, fe: { x: cx + 4, y: 12 }, fh: { x: cx + 6, y: 12 }, wa: -0.1 },
            { bob: 0, lean: 1, bk: { x: cx - 2, y: 20 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 3, y: 20 }, ff: { x: cx + 4, y: footY }, be: { x: cx + 3, y: 14 }, bh: { x: cx + 4, y: 15 }, fe: { x: cx + 2, y: 14 }, fh: { x: cx + 4, y: 15 }, wa: -0.9 },
          ][f]
          bob = staffAtk.bob; lean = staffAtk.lean
          backHip = { x: cx - 1 + lean, y: 17 + bob }; backKnee = staffAtk.bk; backFoot = staffAtk.bf
          frontHip = { x: cx + 1 + lean, y: 17 + bob }; frontKnee = staffAtk.fk; frontFoot = staffAtk.ff
          backElbow = staffAtk.be; backHand = staffAtk.bh
          frontElbow = staffAtk.fe; frontHand = staffAtk.fh
          weaponAngle = staffAtk.wa
        } else {
          // Sword / Dagger / Stick slash + lunge
          const meleeAtk = [
            // 0: Windup (raise weapon arm high behind shoulder)
            { bob: 1, lean: -1, bk: { x: cx - 2, y: 20 }, bf: { x: cx - 3, y: footY }, fk: { x: cx + 2, y: 20 }, ff: { x: cx + 3, y: footY }, be: { x: cx + 3, y: 13 }, bh: { x: cx + 5, y: 14 }, fe: { x: cx - 2, y: 10 }, fh: { x: cx - 4, y: 7 }, wa: -2.2 },
            // 1: Mid-swing overhead/forward
            { bob: 0, lean: 1, bk: { x: cx - 3, y: 20 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 3, y: 20 }, ff: { x: cx + 5, y: footY }, be: { x: cx + 1, y: 14 }, bh: { x: cx - 1, y: 15 }, fe: { x: cx + 3, y: 10 }, fh: { x: cx + 5, y: 10 }, wa: -0.45 },
            // 2: Full impact extension
            { bob: 1, lean: 2, bk: { x: cx - 3, y: 20 }, bf: { x: cx - 5, y: footY }, fk: { x: cx + 4, y: 20 }, ff: { x: cx + 6, y: footY }, be: { x: cx + (weapon === 'dagger' ? 4 : -1), y: 14 }, bh: { x: cx + (weapon === 'dagger' ? 6 : -3), y: 14 }, fe: { x: cx + 4, y: 13 }, fh: { x: cx + 7, y: 13 }, wa: 0.25 },
            // 3: Follow through
            { bob: 0, lean: 1, bk: { x: cx - 2, y: 20 }, bf: { x: cx - 3, y: footY }, fk: { x: cx + 3, y: 20 }, ff: { x: cx + 4, y: footY }, be: { x: cx + 2, y: 14 }, bh: { x: cx + 3, y: 16 }, fe: { x: cx + 3, y: 14 }, fh: { x: cx + 5, y: 16 }, wa: 0.75 },
          ][f]
          bob = meleeAtk.bob; lean = meleeAtk.lean
          backHip = { x: cx - 1 + lean, y: 17 + bob }; backKnee = meleeAtk.bk; backFoot = meleeAtk.bf
          frontHip = { x: cx + 1 + lean, y: 17 + bob }; frontKnee = meleeAtk.fk; frontFoot = meleeAtk.ff
          backElbow = meleeAtk.be; backHand = meleeAtk.bh
          frontElbow = meleeAtk.fe; frontHand = meleeAtk.fh
          weaponAngle = meleeAtk.wa
        }
      }

      const bx = cx + lean
      const by = 11 + bob

      // Optional Wings behind torso (Demon / Angel)
      if (colors.wings) {
        const flap = action === 'walk' ? (f % 3) - 1 : action === 'attack' ? (f === 0 ? -2 : 1) : (f === 1 ? 1 : 0)
        s.line(bx - 2, by + 2, bx - 7, by - 2 + flap, shade(body, -0.3), 2)
        s.line(bx - 7, by - 2 + flap, bx - 9, by + 2 + flap, shade(colors.accent, -0.2), 1)
        s.line(bx - 6, by + 1 + flap, bx - 8, by + 4 + flap, shade(body, -0.4), 1)
      }

      // Optional Cape behind torso
      if (colors.cape) {
        const sway = action === 'walk' ? (f % 2 === 0 ? -2 : -1) : action === 'attack' ? -2 : 0
        s.line(bx - 2, by + 1, bx - 5 + sway, by + 7, colors.cape, 2)
        s.line(bx - 3, by + 2, bx - 4 + sway, by + 8, shade(colors.cape, -0.25), 1)
      }

      // Back leg & back arm (behind torso)
      drawLeg(s, backHip, backKnee, backFoot, legDark, bootDark, 1)
      if (weapon === 'bow') {
        drawWeaponInHand(s, backHand, 'bow', weaponColor, weaponAngle, action, f, frontHand)
      }
      drawArm(s, { x: bx + 1, y: by + 1 }, backElbow, backHand, bodyDark, skinDark)
      if (weapon === 'dagger' && action === 'attack' && f === 2) {
        drawWeaponInHand(s, backHand, 'dagger', weaponColor, -0.1, action, f)
      }

      // Optional Shield on off-hand
      if (colors.shieldColor) {
        s.rect(backHand.x - 1, backHand.y - 2, 3, 4, colors.shieldColor)
        s.px(backHand.x, backHand.y - 1, colors.accent)
      }

      // Torso
      s.rect(bx - 2, by, 5, 6, body)
      s.rect(bx - 2, by + 4, 5, 1, colors.accent) // belt
      s.px(bx + 1, by + 1, bodyHi)
      if (colors.skeleton) {
        s.px(bx, by + 1, bodyDark); s.px(bx, by + 3, bodyDark)
      }

      // Front leg (in front of torso bottom)
      drawLeg(s, frontHip, frontKnee, frontFoot, legCol, bootCol, 1)

      // Head
      const headY = 5 + bob
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
      if (colors.horns) {
        s.px(bx - 2, headY - 1, '#f1e9d2'); s.px(bx - 3, headY - 2, '#f1e9d2')
        s.px(bx + 1, headY - 1, '#f1e9d2'); s.px(bx + 2, headY - 2, '#f1e9d2')
      }

      // Front arm + weapon (drawn last so arm & blade overlap cleanly!)
      drawArm(s, { x: bx, y: by + 1 }, frontElbow, frontHand, body, skin)
      if (weapon !== 'bow') {
        drawWeaponInHand(s, frontHand, weapon, weaponColor, weaponAngle, action, f)
      }

      return s.toCanvas(true, dir === 'left')
    }

    // Front ('down') or Back ('up') orthographic rig
    const isUp = dir === 'up'
    let bob = 0
    let leftHip: Pt = { x: cx - 2, y: 17 }
    let leftKnee: Pt = { x: cx - 2, y: 20 }
    let leftFoot: Pt = { x: cx - 2, y: footY }
    let rightHip: Pt = { x: cx + 2, y: 17 }
    let rightKnee: Pt = { x: cx + 2, y: 20 }
    let rightFoot: Pt = { x: cx + 2, y: footY }

    let leftElbow: Pt = { x: cx - 4, y: 14 }
    let leftHand: Pt = { x: cx - 4, y: 16 }
    let rightElbow: Pt = { x: cx + 4, y: 14 }
    let rightHand: Pt = { x: cx + 4, y: 16 }
    let weaponAngle = isUp ? -1.4 : 0.7

    if (action === 'idle') {
      const br = f === 1 ? 1 : 0
      bob = br
      leftHip = { x: cx - 2, y: 17 + br }
      rightHip = { x: cx + 2, y: 17 + br }
      leftElbow = { x: cx - 4, y: 14 + br }
      leftHand = { x: cx - 4, y: 16 + br }
      rightElbow = { x: cx + 4, y: 14 + br }
      rightHand = { x: cx + 4, y: 16 + br }
      weaponAngle = weapon === 'staff' ? -1.5 : isUp ? -1.4 : -0.9
    } else if (action === 'walk') {
      // 6 frames alternating left/right stride & opposite arm swing
      const fWalk = [
        // 0: Left leg steps forward/down, Right leg back; Left arm swings back, Right arm swings forward
        { bob: 0, lk: { x: cx - 2, y: 20 }, lf: { x: cx - 2, y: footY }, rk: { x: cx + 2, y: 19 }, rf: { x: cx + 2, y: footY - 1 }, le: { x: cx - 4, y: 13 }, lh: { x: cx - 5, y: 14 }, re: { x: cx + 4, y: 14 }, rh: { x: cx + 4, y: 17 }, wa: isUp ? -1.6 : 0.4 },
        // 1: Right leg lifts high (passing), Left leg planted
        { bob: -1, lk: { x: cx - 2, y: 20 }, lf: { x: cx - 2, y: footY }, rk: { x: cx + 2, y: 18 }, rf: { x: cx + 2, y: footY - 3 }, le: { x: cx - 4, y: 13 }, lh: { x: cx - 4, y: 16 }, re: { x: cx + 4, y: 13 }, rh: { x: cx + 4, y: 15 }, wa: isUp ? -1.4 : -0.4 },
        // 2: Right leg extends forward, Left leg back; Left arm swings forward, Right arm swings back
        { bob: 0, lk: { x: cx - 2, y: 19 }, lf: { x: cx - 2, y: footY - 1 }, rk: { x: cx + 2, y: 20 }, rf: { x: cx + 2, y: footY }, le: { x: cx - 4, y: 14 }, lh: { x: cx - 4, y: 17 }, re: { x: cx + 4, y: 13 }, rh: { x: cx + 5, y: 14 }, wa: isUp ? -1.2 : -1.1 },
        // 3: Opposite contact
        { bob: 0, lk: { x: cx - 2, y: 19 }, lf: { x: cx - 2, y: footY - 1 }, rk: { x: cx + 2, y: 20 }, rf: { x: cx + 2, y: footY }, le: { x: cx - 4, y: 14 }, lh: { x: cx - 4, y: 17 }, re: { x: cx + 4, y: 13 }, rh: { x: cx + 5, y: 14 }, wa: isUp ? -1.2 : -1.0 },
        // 4: Left leg lifts high (passing), Right leg planted
        { bob: -1, lk: { x: cx - 2, y: 18 }, lf: { x: cx - 2, y: footY - 3 }, rk: { x: cx + 2, y: 20 }, rf: { x: cx + 2, y: footY }, le: { x: cx - 4, y: 13 }, lh: { x: cx - 4, y: 15 }, re: { x: cx + 4, y: 13 }, rh: { x: cx + 4, y: 16 }, wa: isUp ? -1.4 : -0.3 },
        // 5: Left leg steps forward again
        { bob: 0, lk: { x: cx - 2, y: 20 }, lf: { x: cx - 2, y: footY }, rk: { x: cx + 2, y: 19 }, rf: { x: cx + 2, y: footY - 1 }, le: { x: cx - 4, y: 13 }, lh: { x: cx - 5, y: 14 }, re: { x: cx + 4, y: 14 }, rh: { x: cx + 4, y: 17 }, wa: isUp ? -1.6 : 0.4 },
      ][f]
      bob = fWalk.bob
      leftHip = { x: cx - 2, y: 17 + bob }; leftKnee = fWalk.lk; leftFoot = fWalk.lf
      rightHip = { x: cx + 2, y: 17 + bob }; rightKnee = fWalk.rk; rightFoot = fWalk.rf
      leftElbow = fWalk.le; leftHand = fWalk.lh
      rightElbow = fWalk.re; rightHand = fWalk.rh
      weaponAngle = weapon === 'staff' ? -1.5 : fWalk.wa
    } else {
      // Attack 4 frames for front/back
      const fAtk = [
        // 0: Windup (legs wide brace, right arm raised high!)
        { bob: 1, lf: { x: cx - 3, y: footY }, rf: { x: cx + 3, y: footY }, le: { x: cx - 5, y: 13 }, lh: { x: cx - 5, y: 15 }, re: { x: cx + 4, y: 10 }, rh: { x: cx + 5, y: 8 }, wa: isUp ? -2.1 : -2.2 },
        // 1: Strike sweep
        { bob: 0, lf: { x: cx - 3, y: footY }, rf: { x: cx + 3, y: footY }, le: { x: cx - 4, y: 14 }, lh: { x: cx - 5, y: 16 }, re: { x: cx + 5, y: 12 }, rh: { x: cx + 6, y: isUp ? 9 : 13 }, wa: isUp ? -1.6 : 0.3 },
        // 2: Full Impact reach!
        { bob: 1, lf: { x: cx - 3, y: footY }, rf: { x: cx + 3, y: footY }, le: { x: cx - 5, y: 13 }, lh: { x: cx - 5, y: isUp ? 11 : 17 }, re: { x: cx + 3, y: isUp ? 9 : 15 }, rh: { x: cx + 2, y: isUp ? 6 : 19 }, wa: isUp ? -1.55 : 1.35 },
        // 3: Follow through
        { bob: 0, lf: { x: cx - 2, y: footY }, rf: { x: cx + 2, y: footY }, le: { x: cx - 4, y: 14 }, lh: { x: cx - 4, y: 16 }, re: { x: cx + 4, y: 14 }, rh: { x: cx + 4, y: 17 }, wa: isUp ? -1.4 : 0.8 },
      ][f]
      bob = fAtk.bob
      leftHip = { x: cx - 2, y: 17 + bob }; leftKnee = { x: cx - 3, y: 20 }; leftFoot = fAtk.lf
      rightHip = { x: cx + 2, y: 17 + bob }; rightKnee = { x: cx + 3, y: 20 }; rightFoot = fAtk.rf
      leftElbow = fAtk.le; leftHand = fAtk.lh
      rightElbow = fAtk.re; rightHand = fAtk.rh
      weaponAngle = weapon === 'bow' ? (isUp ? -1.57 : 1.57) : fAtk.wa
    }

    const by = 11 + bob

    if (colors.wings) {
      const flap = action === 'walk' ? (f % 3) - 1 : action === 'attack' ? (f === 0 ? -2 : 1) : (f === 1 ? 1 : 0)
      s.line(cx - 3, by + 2, cx - 8, by - 2 + flap, shade(body, -0.3), 2)
      s.line(cx + 3, by + 2, cx + 8, by - 2 + flap, shade(body, -0.3), 2)
      s.px(cx - 9, by + flap, colors.accent)
      s.px(cx + 9, by + flap, colors.accent)
    }

    if (colors.cape && !isUp) {
      const sway = action === 'walk' && f % 2 === 1 ? 1 : 0
      s.rect(cx - 4 - sway, by + 1, 1, 7, shade(colors.cape, -0.25))
      s.rect(cx + 4 + sway, by + 1, 1, 7, shade(colors.cape, -0.25))
    }

    // Back-ordered weapon when facing UP idle/walk
    if (isUp && weapon) {
      drawWeaponInHand(s, rightHand, weapon, weaponColor, weaponAngle, action, f, leftHand)
    }

    // Legs (darken slightly whichever leg is tucked back)
    const leftBack = leftFoot.y < footY
    const rightBack = rightFoot.y < footY
    drawLeg(s, leftHip, leftKnee, leftFoot, leftBack ? legDark : legCol, leftBack ? bootDark : bootCol, -1)
    drawLeg(s, rightHip, rightKnee, rightFoot, rightBack ? legDark : legCol, rightBack ? bootDark : bootCol, 1)

    // Torso
    s.rect(cx - 3, by, 7, 6, body)
    s.rect(cx - 3, by + 4, 7, 1, colors.accent)
    s.rect(cx - 1, by + 1, 3, 2, bodyHi)
    if (colors.skeleton) {
      s.px(cx - 1, by + 1, bodyDark); s.px(cx + 1, by + 1, bodyDark)
      s.px(cx - 1, by + 3, bodyDark); s.px(cx + 1, by + 3, bodyDark)
    }
    if (colors.cape && isUp) {
      const sway = action === 'walk' && f % 2 === 1 ? 1 : 0
      s.rect(cx - 3, by + 1, 7, 6 + sway, colors.cape)
      s.rect(cx - 2, by + 2, 5, 4 + sway, shade(colors.cape, -0.2))
    }

    // Head
    const headY = 5 + bob
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
    if (colors.horns) {
      s.px(cx - 3, headY - 1, '#f1e9d2'); s.px(cx - 4, headY - 2, '#f1e9d2')
      s.px(cx + 3, headY - 1, '#f1e9d2'); s.px(cx + 4, headY - 2, '#f1e9d2')
    }

    // Arms
    drawArm(s, { x: cx - 3, y: by + 1 }, leftElbow, leftHand, bodyDark, skinDark)
    drawArm(s, { x: cx + 3, y: by + 1 }, rightElbow, rightHand, body, skin)

    if (colors.shieldColor) {
      s.rect(leftHand.x - 1, leftHand.y - 2, 3, 4, colors.shieldColor)
      s.px(leftHand.x, leftHand.y - 1, colors.accent)
    }

    if (!isUp && weapon) {
      drawWeaponInHand(s, rightHand, weapon, weaponColor, weaponAngle, action, f, leftHand)
    }
    if (weapon === 'dagger' && action === 'attack' && f === 2) {
      drawWeaponInHand(s, leftHand, 'dagger', weaponColor, isUp ? -1.7 : 1.7, action, f)
    }

    return s.toCanvas(true, false)
  })
}

/* ---------------- Articulated Monsters ---------------- */

function renderSlime(color: string, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(24, 22)
  const dark = shade(color, -0.3)
  const hi = shade(color, 0.45)
  const cx = 12
  const baseY = 19

  // Stretch & gel-arm motion
  let w = 12
  let h = 9
  let offX = 0
  let leftArm: Pt = { x: cx - 7, y: 15 }
  let rightArm: Pt = { x: cx + 7, y: 15 }

  if (action === 'idle') {
    const sq = f === 1 ? 1 : f === 3 ? -1 : 0
    w = 12 + sq * 2
    h = 9 - sq
    leftArm = { x: cx - 7 - sq, y: 15 + sq }
    rightArm = { x: cx + 7 + sq, y: 15 + sq }
  } else if (action === 'walk') {
    // Ground-anchored rippling slither + swinging gel stub arms
    const seq = [
      { w: 14, h: 8, ox: 0, lay: 16, ray: 14 },
      { w: 11, h: 10, ox: 1, lay: 13, ray: 16 },
      { w: 10, h: 11, ox: 2, lay: 12, ray: 15 },
      { w: 13, h: 8, ox: 1, lay: 15, ray: 13 },
      { w: 14, h: 8, ox: 0, lay: 16, ray: 14 },
      { w: 11, h: 10, ox: -1, lay: 14, ray: 12 },
    ][f % 6]
    w = seq.w; h = seq.h; offX = seq.ox
    leftArm = { x: cx + offX - Math.floor(w / 2) - 2, y: seq.lay }
    rightArm = { x: cx + offX + Math.floor(w / 2) + 2, y: seq.ray }
  } else {
    // Attack: coil back -> stretch pseudopods out -> slam!
    const atk = [
      { w: 14, h: 7, ox: -2, lx: -6, ly: 16, rx: 6, ry: 16 },
      { w: 11, h: 10, ox: 2, lx: -4, ly: 12, rx: 9, ry: 11 },
      { w: 10, h: 9, ox: 4, lx: 2, ly: 12, rx: 10, ry: 12 },
      { w: 13, h: 8, ox: 1, lx: -6, ly: 15, rx: 7, ry: 15 },
    ][f % 4]
    w = atk.w; h = atk.h; offX = atk.ox
    leftArm = { x: cx + offX + atk.lx, y: atk.ly }
    rightArm = { x: cx + offX + atk.rx, y: atk.ry }
  }

  const x0 = Math.round(cx + offX - w / 2)
  const y0 = baseY - h

  // Side gel arms/pseudopods
  s.line(cx + offX - 3, y0 + Math.floor(h * 0.55), leftArm.x, leftArm.y, dark, 2)
  s.px(leftArm.x, leftArm.y, color)
  s.line(cx + offX + 3, y0 + Math.floor(h * 0.55), rightArm.x, rightArm.y, color, 2)
  s.px(rightArm.x, rightArm.y, hi)

  // Gel dome
  s.rect(x0 + 2, y0, w - 4, 2, color)
  s.rect(x0 + 1, y0 + 2, w - 2, h - 3, color)
  s.rect(x0, y0 + Math.floor(h * 0.5), w, Math.ceil(h * 0.5), color)
  s.rect(x0 + 1, baseY - 1, w - 2, 1, dark)
  // Gel feet bumps that wiggle!
  const footShift = action === 'walk' ? (f % 2 === 0 ? 1 : -1) : 0
  s.rect(x0 + 1 + footShift, baseY, 3, 1, dark)
  s.rect(x0 + w - 4 - footShift, baseY, 3, 1, dark)

  // Highlight & face
  s.rect(x0 + 2, y0 + 1, 2, 2, hi)
  if (dir !== 'up') {
    const eyeOff = dir === 'right' ? 2 : dir === 'left' ? 2 : 0
    s.px(x0 + Math.floor(w * 0.3) + eyeOff, y0 + Math.floor(h * 0.48), '#1a1423')
    s.px(x0 + Math.floor(w * 0.65) + eyeOff, y0 + Math.floor(h * 0.48), '#1a1423')
    if (action === 'attack' && (f === 1 || f === 2)) {
      s.rect(x0 + Math.floor(w * 0.45) + eyeOff, y0 + Math.floor(h * 0.68), 3, 2, '#3d0c11')
    }
  }
  return s.toCanvas(true, dir === 'left')
}

function renderMushroom(color: string, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(24, 24)
  const capDark = shade(color, -0.3)
  const stem = '#f1e3c8'
  const stemDark = '#d4c3a3'
  const footCol = '#5c3d2e'
  const cx = 12
  const footY = 21

  let bob = 0
  let tilt = 0
  let lFoot: Pt = { x: cx - 2, y: footY }
  let rFoot: Pt = { x: cx + 2, y: footY }
  let lHand: Pt = { x: cx - 5, y: 16 }
  let rHand: Pt = { x: cx + 5, y: 16 }

  if (action === 'idle') {
    bob = f === 1 ? 1 : 0
    lHand = { x: cx - 5, y: 16 + bob }
    rHand = { x: cx + 5, y: 16 + bob }
  } else if (action === 'walk') {
    const seq = [
      { bob: 0, tilt: 0, lf: { x: cx - 3, y: footY }, rf: { x: cx + 2, y: footY - 1 }, lh: { x: cx - 5, y: 14 }, rh: { x: cx + 5, y: 17 } },
      { bob: -1, tilt: 0, lf: { x: cx - 2, y: footY }, rf: { x: cx + 2, y: footY - 3 }, lh: { x: cx - 5, y: 15 }, rh: { x: cx + 5, y: 15 } },
      { bob: 0, tilt: 1, lf: { x: cx - 2, y: footY - 1 }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 5, y: 17 }, rh: { x: cx + 5, y: 14 } },
      { bob: 0, tilt: 0, lf: { x: cx - 2, y: footY - 1 }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 5, y: 17 }, rh: { x: cx + 5, y: 14 } },
      { bob: -1, tilt: 0, lf: { x: cx - 2, y: footY - 3 }, rf: { x: cx + 2, y: footY }, lh: { x: cx - 5, y: 15 }, rh: { x: cx + 5, y: 15 } },
      { bob: 0, tilt: -1, lf: { x: cx - 3, y: footY }, rf: { x: cx + 2, y: footY - 1 }, lh: { x: cx - 5, y: 14 }, rh: { x: cx + 5, y: 17 } },
    ][f % 6]
    bob = seq.bob; tilt = seq.tilt; lFoot = seq.lf; rFoot = seq.rf; lHand = seq.lh; rHand = seq.rh
  } else {
    const atk = [
      { bob: 1, tilt: -1, lf: { x: cx - 3, y: footY }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 6, y: 11 }, rh: { x: cx + 5, y: 11 } },
      { bob: -1, tilt: 1, lf: { x: cx - 3, y: footY }, rf: { x: cx + 4, y: footY - 1 }, lh: { x: cx - 4, y: 13 }, rh: { x: cx + 7, y: 13 } },
      { bob: 0, tilt: 2, lf: { x: cx - 4, y: footY }, rf: { x: cx + 4, y: footY }, lh: { x: cx + 2, y: 14 }, rh: { x: cx + 8, y: 14 } },
      { bob: 0, tilt: 1, lf: { x: cx - 2, y: footY }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 5, y: 16 }, rh: { x: cx + 5, y: 16 } },
    ][f % 4]
    bob = atk.bob; tilt = atk.tilt; lFoot = atk.lf; rFoot = atk.rf; lHand = atk.lh; rHand = atk.rh
  }

  // Legs
  s.line(cx - 2, 18 + bob, lFoot.x, lFoot.y, stemDark, 2)
  s.rect(lFoot.x - 1, lFoot.y, 2, 1, footCol)
  s.line(cx + 2, 18 + bob, rFoot.x, rFoot.y, stem, 2)
  s.rect(rFoot.x, rFoot.y, 2, 1, footCol)

  // Arms
  s.line(cx - 3, 14 + bob, lHand.x, lHand.y, stemDark, 1)
  s.px(lHand.x, lHand.y, stem)
  s.line(cx + 3, 14 + bob, rHand.x, rHand.y, stem, 1)
  s.px(rHand.x, rHand.y, '#ffffff')

  // Stem body
  s.rect(cx - 3 + Math.round(tilt * 0.5), 12 + bob, 7, 6, stem)
  if (dir !== 'up') {
    const faceX = cx + (dir === 'right' ? 1 : 0) + Math.round(tilt * 0.5)
    s.px(faceX - 2, 14 + bob, '#1a1423')
    s.px(faceX + 2, 14 + bob, '#1a1423')
    if (action === 'attack' && (f === 1 || f === 2)) {
      s.px(faceX - 2, 13 + bob, '#9d0208')
      s.px(faceX + 2, 13 + bob, '#9d0208')
    }
  }

  // Spotted cap
  const capX = cx + tilt
  const capY = 5 + bob
  s.rect(capX - 4, capY, 9, 2, color)
  s.rect(capX - 6, capY + 2, 13, 4, color)
  s.rect(capX - 6, capY + 6, 13, 1, capDark)
  s.rect(capX - 4, capY + 2, 2, 2, '#ffffff')
  s.rect(capX + 2, capY + 1, 2, 2, '#ffffff')
  s.px(capX, capY + 4, '#ffffff')

  return s.toCanvas(true, dir === 'left')
}

function renderRabbit(color: string, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(26, 24)
  const dark = shade(color, -0.25)
  const belly = '#ffffff'
  const pink = '#ff8fab'
  const cx = 12
  const footY = 21

  let bob = 0
  let lean = 0
  let earAngle = 0
  let hindFoot: Pt = { x: cx - 3, y: footY }
  let frontPaw: Pt = { x: cx + 3, y: footY }
  let raisedPaw: Pt = { x: cx + 4, y: 16 }

  if (action === 'idle') {
    bob = f === 1 ? 1 : 0
    earAngle = f === 2 ? -1 : 0
    hindFoot = { x: cx - 3, y: footY }
    frontPaw = { x: cx + 3, y: footY }
    raisedPaw = { x: cx + 5, y: 16 + bob }
  } else if (action === 'walk') {
    const seq = [
      { bob: 1, lean: 0, ear: -1, hf: { x: cx - 3, y: footY }, fp: { x: cx + 3, y: footY }, rp: { x: cx + 4, y: 17 } },
      { bob: -2, lean: 1, ear: -2, hf: { x: cx - 5, y: footY - 1 }, fp: { x: cx + 5, y: footY - 3 }, rp: { x: cx + 6, y: 14 } },
      { bob: -3, lean: 1, ear: -2, hf: { x: cx - 4, y: footY - 3 }, fp: { x: cx + 5, y: footY - 1 }, rp: { x: cx + 6, y: 16 } },
      { bob: -1, lean: 1, ear: -1, hf: { x: cx - 1, y: footY - 2 }, fp: { x: cx + 3, y: footY }, rp: { x: cx + 4, y: 17 } },
      { bob: 0, lean: 0, ear: 0, hf: { x: cx - 2, y: footY }, fp: { x: cx + 2, y: footY }, rp: { x: cx + 3, y: 16 } },
      { bob: 1, lean: 0, ear: 0, hf: { x: cx - 3, y: footY }, fp: { x: cx + 3, y: footY }, rp: { x: cx + 4, y: 17 } },
    ][f % 6]
    bob = seq.bob; lean = seq.lean; earAngle = seq.ear
    hindFoot = seq.hf; frontPaw = seq.fp; raisedPaw = seq.rp
  } else {
    const atk = [
      { bob: 0, lean: -1, ear: -2, hf: { x: cx - 3, y: footY }, fp: { x: cx + 2, y: 15 }, rp: { x: cx + 4, y: 12 } },
      { bob: -2, lean: 2, ear: -2, hf: { x: cx - 5, y: footY - 1 }, fp: { x: cx + 6, y: 16 }, rp: { x: cx + 8, y: 13 } },
      { bob: -1, lean: 3, ear: -1, hf: { x: cx - 4, y: footY }, fp: { x: cx + 7, y: 17 }, rp: { x: cx + 9, y: 14 } },
      { bob: 0, lean: 1, ear: 0, hf: { x: cx - 3, y: footY }, fp: { x: cx + 4, y: footY }, rp: { x: cx + 5, y: 16 } },
    ][f % 4]
    bob = atk.bob; lean = atk.lean; earAngle = atk.ear
    hindFoot = atk.hf; frontPaw = atk.fp; raisedPaw = atk.rp
  }

  const bx = cx + lean
  const by = 12 + bob

  // Fluffy tail
  s.rect(bx - 5, by + 3, 2, 2, belly)

  // Hind leg & thigh
  s.line(bx - 2, by + 5, hindFoot.x, hindFoot.y, dark, 2)
  s.rect(hindFoot.x, hindFoot.y, 3, 1, belly)

  // Body
  s.rect(bx - 3, by + 1, 7, 6, color)
  s.rect(bx - 1, by + 3, 4, 4, belly)

  // Head
  s.rect(bx - 1, by - 4, 6, 5, color)
  // Ears
  s.line(bx, by - 5, bx - 1 + earAngle, by - 10, color, 2)
  s.line(bx + 2, by - 5, bx + 2 + earAngle, by - 10, color, 2)
  s.px(bx + 2 + earAngle, by - 8, pink)
  if (dir !== 'up') {
    s.px(bx + 3, by - 2, '#1a1423')
    s.px(bx + 5, by - 1, pink) // nose
  }

  // Front paws (both swing & swipe on attack!)
  s.line(bx + 2, by + 4, frontPaw.x, frontPaw.y, color, 2)
  s.px(frontPaw.x, frontPaw.y, belly)
  s.line(bx + 3, by + 3, raisedPaw.x, raisedPaw.y, color, 1)
  s.px(raisedPaw.x, raisedPaw.y, action === 'attack' && f === 2 ? '#ffffff' : belly)

  return s.toCanvas(true, dir === 'left')
}

function renderWolf(color: string, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(28, 22)
  const dark = shade(color, -0.28)
  const belly = '#e2e8f0'
  const pawCol = '#f8fafc'
  const cx = 13
  const footY = 19

  let bob = 0
  let lean = 0
  let tailTip: Pt = { x: 4, y: 11 }
  // 4 legs: back-far (bl), back-near (br), front-far (fl), front-near (fr)
  let bl: Pt = { x: 7, y: footY }
  let br: Pt = { x: 9, y: footY }
  let fl: Pt = { x: 16, y: footY }
  let fr: Pt = { x: 18, y: footY }

  if (action === 'idle') {
    bob = f === 1 ? 1 : 0
    tailTip = { x: 4, y: 11 + (f % 2) }
  } else if (action === 'walk') {
    // True quadruped trot/gallop cycle (6 frames)
    const seq = [
      { bob: 0, lean: 0, ty: 10, bl: { x: 5, y: footY }, br: { x: 10, y: footY - 1 }, fl: { x: 19, y: footY }, fr: { x: 15, y: footY - 1 } },
      { bob: -1, lean: 1, ty: 9, bl: { x: 6, y: footY - 2 }, br: { x: 8, y: footY }, fl: { x: 17, y: footY }, fr: { x: 17, y: footY - 2 } },
      { bob: 0, lean: 1, ty: 11, bl: { x: 10, y: footY - 1 }, br: { x: 5, y: footY }, fl: { x: 15, y: footY - 1 }, fr: { x: 20, y: footY } },
      { bob: 0, lean: 0, ty: 10, bl: { x: 10, y: footY }, br: { x: 6, y: footY }, fl: { x: 15, y: footY }, fr: { x: 19, y: footY } },
      { bob: -1, lean: 1, ty: 9, bl: { x: 8, y: footY }, br: { x: 7, y: footY - 2 }, fl: { x: 18, y: footY - 2 }, fr: { x: 17, y: footY } },
      { bob: 0, lean: 1, ty: 11, bl: { x: 5, y: footY }, br: { x: 10, y: footY - 1 }, fl: { x: 19, y: footY }, fr: { x: 15, y: footY - 1 } },
    ][f % 6]
    bob = seq.bob; lean = seq.lean; tailTip = { x: 3, y: seq.ty }
    bl = seq.bl; br = seq.br; fl = seq.fl; fr = seq.fr
  } else {
    // Attack: crouch -> pounce forward with extended clawed forepaws & open jaw!
    const atk = [
      { bob: 1, lean: -1, ty: 13, bl: { x: 5, y: footY }, br: { x: 7, y: footY }, fl: { x: 14, y: footY }, fr: { x: 16, y: footY - 2 } },
      { bob: -2, lean: 2, ty: 9, bl: { x: 4, y: footY - 1 }, br: { x: 6, y: footY - 1 }, fl: { x: 21, y: 14 }, fr: { x: 22, y: 16 } },
      { bob: -1, lean: 3, ty: 10, bl: { x: 6, y: footY }, br: { x: 8, y: footY }, fl: { x: 22, y: 15 }, fr: { x: 23, y: 17 } },
      { bob: 0, lean: 1, ty: 11, bl: { x: 6, y: footY }, br: { x: 8, y: footY }, fl: { x: 17, y: footY }, fr: { x: 19, y: footY } },
    ][f % 4]
    bob = atk.bob; lean = atk.lean; tailTip = { x: 3, y: atk.ty }
    bl = atk.bl; br = atk.br; fl = atk.fl; fr = atk.fr
  }

  const bx = cx + lean
  const by = 11 + bob

  // Bushy tail
  s.line(bx - 5, by + 2, tailTip.x, tailTip.y, dark, 2)
  s.px(tailTip.x, tailTip.y, belly)

  // Far-side legs (darker)
  s.line(bx - 4, by + 4, bl.x, bl.y, dark, 2)
  s.px(bl.x, bl.y, dark)
  s.line(bx + 3, by + 4, fl.x, fl.y, dark, 2)
  s.px(fl.x, fl.y, pawCol)

  // Body & chest ruff
  s.rect(bx - 5, by + 1, 10, 4, color)
  s.rect(bx + 2, by + 2, 4, 3, belly)

  // Head & snout
  s.rect(bx + 3, by - 3, 5, 5, color)
  s.rect(bx + 7, by - 1, 3, 2, color) // snout
  s.px(bx + 9, by - 1, '#1a1423') // nose
  s.px(bx + 4, by - 5, dark) // ear
  s.px(bx + 6, by - 5, color) // ear
  s.px(bx + 6, by - 2, '#ffd60a') // eye
  if (action === 'attack' && (f === 1 || f === 2)) {
    // Open fanged jaw!
    s.rect(bx + 7, by + 1, 3, 1, '#9d0208')
    s.px(bx + 9, by, '#ffffff')
    s.px(bx + 8, by + 2, '#ffffff')
  }

  // Near-side legs
  s.line(bx - 3, by + 4, br.x, br.y, color, 2)
  s.px(br.x, br.y, pawCol)
  s.line(bx + 4, by + 4, fr.x, fr.y, color, 2)
  s.px(fr.x, fr.y, pawCol)

  return s.toCanvas(true, dir === 'left')
}

function renderBat(color: string, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(26, 22)
  const dark = shade(color, -0.3)
  const wingMem = shade(color, -0.15)
  const cx = 13
  const cy = 11

  let bob = 0
  let wingY = 0
  let wingSpan = 9
  let bite = false

  if (action === 'idle') {
    const seq = [-2, 0, 2, 0]
    wingY = seq[f % 4]
    bob = f === 2 ? 1 : 0
  } else if (action === 'walk') {
    const seq = [
      { bob: -1, wy: -5, span: 8 },
      { bob: 0, wy: -2, span: 10 },
      { bob: 1, wy: 2, span: 10 },
      { bob: 1, wy: 5, span: 8 },
      { bob: 0, wy: 2, span: 9 },
      { bob: -1, wy: -2, span: 9 },
    ][f % 6]
    bob = seq.bob; wingY = seq.wy; wingSpan = seq.span
  } else {
    const atk = [
      { bob: -2, wy: -6, span: 9, bite: true },
      { bob: 1, wy: 3, span: 11, bite: true },
      { bob: 2, wy: 5, span: 10, bite: true },
      { bob: 0, wy: -1, span: 9, bite: false },
    ][f % 4]
    bob = atk.bob; wingY = atk.wy; wingSpan = atk.span; bite = atk.bite
  }

  const by = cy + bob
  // Left & Right articulated wings
  s.line(cx - 2, by, cx - Math.round(wingSpan * 0.6), by + Math.round(wingY * 0.6) - 1, dark, 2)
  s.line(cx - Math.round(wingSpan * 0.6), by + Math.round(wingY * 0.6) - 1, cx - wingSpan, by + wingY, dark, 1)
  s.line(cx - 2, by + 2, cx - Math.round(wingSpan * 0.75), by + wingY + 2, wingMem, 1)

  s.line(cx + 2, by, cx + Math.round(wingSpan * 0.6), by + Math.round(wingY * 0.6) - 1, dark, 2)
  s.line(cx + Math.round(wingSpan * 0.6), by + Math.round(wingY * 0.6) - 1, cx + wingSpan, by + wingY, dark, 1)
  s.line(cx + 2, by + 2, cx + Math.round(wingSpan * 0.75), by + wingY + 2, wingMem, 1)

  // Wing claws
  s.px(cx - Math.round(wingSpan * 0.6), by + Math.round(wingY * 0.6) - 2, '#f8fafc')
  s.px(cx + Math.round(wingSpan * 0.6), by + Math.round(wingY * 0.6) - 2, '#f8fafc')

  // Body & ears
  s.rect(cx - 2, by - 2, 5, 6, color)
  s.px(cx - 2, by - 4, dark); s.px(cx - 2, by - 3, color)
  s.px(cx + 2, by - 4, dark); s.px(cx + 2, by - 3, color)

  // Little kicking bat feet
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
  const s = new PixelSurface(24, 24)
  const dark = shade(color, -0.25)
  const glow = shade(color, 0.35)
  const cx = 12
  let bob = 0
  let lArm: Pt = { x: cx - 6, y: 13 }
  let rArm: Pt = { x: cx + 6, y: 13 }
  let tailShift = 0

  if (action === 'idle') {
    bob = f === 1 ? -1 : f === 3 ? 1 : 0
    tailShift = f % 2 === 0 ? 1 : -1
    lArm = { x: cx - 6, y: 13 + bob }
    rArm = { x: cx + 6, y: 13 + bob }
  } else if (action === 'walk') {
    const seq = [
      { bob: -1, ts: -1, lx: -6, ly: 11, rx: 6, ry: 15 },
      { bob: -2, ts: 0, lx: -7, ly: 13, rx: 7, ry: 13 },
      { bob: -1, ts: 1, lx: -6, ly: 15, rx: 6, ry: 11 },
      { bob: 0, ts: 1, lx: -6, ly: 14, rx: 7, ry: 12 },
      { bob: -1, ts: 0, lx: -7, ly: 12, rx: 6, ry: 14 },
      { bob: 0, ts: -1, lx: -6, ly: 11, rx: 6, ry: 15 },
    ][f % 6]
    bob = seq.bob; tailShift = seq.ts
    lArm = { x: cx + seq.lx, y: seq.ly }
    rArm = { x: cx + seq.rx, y: seq.ry }
  } else {
    // Spectral arms pull back then reach way forward with glowing claws!
    const atk = [
      { bob: 1, ts: -1, lx: -7, ly: 10, rx: 3, ry: 10 },
      { bob: -1, ts: 1, lx: 2, ly: 12, rx: 9, ry: 11 },
      { bob: 0, ts: 2, lx: 5, ly: 12, rx: 10, ry: 13 },
      { bob: 0, ts: 0, lx: -5, ly: 13, rx: 6, ry: 13 },
    ][f % 4]
    bob = atk.bob; tailShift = atk.ts
    lArm = { x: cx + atk.lx, y: atk.ly }
    rArm = { x: cx + atk.rx, y: atk.ry }
  }

  const by = 5 + bob
  // Head & shroud
  s.rect(cx - 3, by, 6, 2, glow)
  s.rect(cx - 4, by + 2, 8, 8, color)
  s.rect(cx - 3, by + 10, 6, 3, dark)

  // Waving wispy tendrils at bottom
  s.line(cx - 3, by + 12, cx - 4 + tailShift, by + 16, dark, 1)
  s.line(cx, by + 12, cx + tailShift, by + 17, color, 1)
  s.line(cx + 3, by + 12, cx + 4 - tailShift, by + 16, dark, 1)

  // Articulated ghostly arms & claws
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
  isEarthBoss = false,
): HTMLCanvasElement {
  const W = isEarthBoss ? 30 : 26
  const H = isEarthBoss ? 28 : 26
  const s = new PixelSurface(W, H)
  const dark = shade(color, -0.32)
  const hi = shade(color, 0.25)
  const rune = isEarthBoss ? '#a3e635' : '#ffb703'
  const core = isEarthBoss ? '#ffd60a' : '#fff3b0'
  const cx = Math.floor(W / 2)
  const footY = H - 3

  let bob = 0
  let lFoot: Pt = { x: cx - 3, y: footY }
  let rFoot: Pt = { x: cx + 3, y: footY }
  let lHand: Pt = { x: cx - 8, y: footY - 6 }
  let rHand: Pt = { x: cx + 8, y: footY - 6 }

  if (action === 'idle') {
    bob = f === 1 ? 1 : 0
    lHand = { x: cx - 8, y: footY - 6 + bob }
    rHand = { x: cx + 8, y: footY - 6 + bob }
  } else if (action === 'walk') {
    // Heavy stomping walk: legs lift & slam, giant fists swing opposite!
    const seq = [
      { bob: 0, lf: { x: cx - 4, y: footY }, rf: { x: cx + 3, y: footY - 1 }, lh: { x: cx - 8, y: footY - 8 }, rh: { x: cx + 8, y: footY - 4 } },
      { bob: -1, lf: { x: cx - 3, y: footY }, rf: { x: cx + 4, y: footY - 3 }, lh: { x: cx - 8, y: footY - 6 }, rh: { x: cx + 8, y: footY - 6 } },
      { bob: 0, lf: { x: cx - 3, y: footY - 1 }, rf: { x: cx + 4, y: footY }, lh: { x: cx - 8, y: footY - 4 }, rh: { x: cx + 8, y: footY - 8 } },
      { bob: 0, lf: { x: cx - 3, y: footY - 1 }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 8, y: footY - 4 }, rh: { x: cx + 8, y: footY - 8 } },
      { bob: -1, lf: { x: cx - 4, y: footY - 3 }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 8, y: footY - 6 }, rh: { x: cx + 8, y: footY - 6 } },
      { bob: 0, lf: { x: cx - 4, y: footY }, rf: { x: cx + 3, y: footY - 1 }, lh: { x: cx - 8, y: footY - 8 }, rh: { x: cx + 8, y: footY - 4 } },
    ][f % 6]
    bob = seq.bob; lFoot = seq.lf; rFoot = seq.rf; lHand = seq.lh; rHand = seq.rh
  } else {
    // Overhead boulder slam!
    const atk = [
      { bob: -1, lf: { x: cx - 4, y: footY }, rf: { x: cx + 4, y: footY }, lh: { x: cx - 6, y: 4 }, rh: { x: cx + 6, y: 4 } },
      { bob: 0, lf: { x: cx - 4, y: footY }, rf: { x: cx + 5, y: footY }, lh: { x: cx - 4, y: 8 }, rh: { x: cx + 9, y: 9 } },
      { bob: 1, lf: { x: cx - 4, y: footY }, rf: { x: cx + 5, y: footY }, lh: { x: cx + 2, y: footY - 2 }, rh: { x: cx + 10, y: footY - 1 } },
      { bob: 0, lf: { x: cx - 3, y: footY }, rf: { x: cx + 4, y: footY }, lh: { x: cx - 7, y: footY - 6 }, rh: { x: cx + 8, y: footY - 5 } },
    ][f % 4]
    bob = atk.bob; lFoot = atk.lf; rFoot = atk.rf; lHand = atk.lh; rHand = atk.rh
  }

  const by = (isEarthBoss ? 7 : 6) + bob

  // Thick stone legs
  s.line(cx - 3, by + 9, lFoot.x, lFoot.y, dark, 2)
  s.rect(lFoot.x - 1, lFoot.y - 1, 3, 2, dark)
  s.line(cx + 3, by + 9, rFoot.x, rFoot.y, color, 2)
  s.rect(rFoot.x - 1, rFoot.y - 1, 3, 2, color)

  // Massive boulder torso & shoulders
  s.rect(cx - 6, by + 2, 12, 8, color)
  s.rect(cx - 7, by + 2, 14, 4, hi)
  s.rect(cx - 2, by + 5, 4, 3, rune)
  s.px(cx, by + 6, core)
  if (isEarthBoss) {
    // Moss & stone crown
    s.rect(cx - 5, by + 1, 10, 2, '#4f772d')
    s.px(cx - 4, by, '#90a955')
    s.px(cx + 3, by, '#90a955')
  }

  // Head
  s.rect(cx - 4, by - 2, 8, 5, color)
  s.rect(cx - 3, by - 3, 6, 1, dark)
  if (dir !== 'up') {
    const faceOff = dir === 'right' ? 1 : 0
    s.rect(cx - 2 + faceOff, by, 2, 2, rune)
    s.rect(cx + 1 + faceOff, by, 2, 2, rune)
  }

  // Giant rocky arms & boulder fists
  s.line(cx - 6, by + 3, lHand.x, lHand.y, dark, 2)
  s.rect(lHand.x - 1, lHand.y - 1, 4, 4, dark)
  s.px(lHand.x, lHand.y, rune)

  s.line(cx + 6, by + 3, rHand.x, rHand.y, hi, 2)
  s.rect(rHand.x - 2, rHand.y - 1, 4, 4, color)
  s.px(rHand.x, rHand.y, core)

  return s.toCanvas(true, dir === 'left')
}

function renderGaleSentinel(color: string, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(28, 26)
  const armor = color
  const dark = shade(color, -0.3)
  const hi = '#ffffff'
  const gold = '#ffd60a'
  const cx = 13
  const footY = 23

  let bob = 0
  let wingFlap = 0
  let lFoot: Pt = { x: cx - 2, y: footY }
  let rFoot: Pt = { x: cx + 2, y: footY }
  let lHand: Pt = { x: cx - 5, y: 15 }
  let rHand: Pt = { x: cx + 5, y: 15 }
  let spearAngle = -0.7

  if (action === 'idle') {
    bob = f === 1 ? -1 : 0
    wingFlap = f === 1 ? -2 : 0
  } else if (action === 'walk') {
    const seq = [
      { bob: 0, wf: -2, lf: { x: cx - 3, y: footY }, rf: { x: cx + 3, y: footY - 1 }, lh: { x: cx - 5, y: 13 }, rh: { x: cx + 5, y: 16 }, sa: -0.4 },
      { bob: -1, wf: 0, lf: { x: cx - 2, y: footY }, rf: { x: cx + 2, y: footY - 3 }, lh: { x: cx - 5, y: 15 }, rh: { x: cx + 5, y: 15 }, sa: -0.7 },
      { bob: 0, wf: 2, lf: { x: cx - 2, y: footY - 1 }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 5, y: 17 }, rh: { x: cx + 5, y: 13 }, sa: -1.0 },
      { bob: 0, wf: 1, lf: { x: cx - 2, y: footY - 1 }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 5, y: 17 }, rh: { x: cx + 5, y: 13 }, sa: -1.0 },
      { bob: -1, wf: 0, lf: { x: cx - 2, y: footY - 3 }, rf: { x: cx + 2, y: footY }, lh: { x: cx - 5, y: 15 }, rh: { x: cx + 5, y: 15 }, sa: -0.7 },
      { bob: 0, wf: -1, lf: { x: cx - 3, y: footY }, rf: { x: cx + 2, y: footY - 1 }, lh: { x: cx - 5, y: 13 }, rh: { x: cx + 5, y: 16 }, sa: -0.4 },
    ][f % 6]
    bob = seq.bob; wingFlap = seq.wf; lFoot = seq.lf; rFoot = seq.rf; lHand = seq.lh; rHand = seq.rh; spearAngle = seq.sa
  } else {
    const atk = [
      { bob: 0, wf: -3, lf: { x: cx - 3, y: footY }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 6, y: 13 }, rh: { x: cx + 2, y: 8 }, sa: -2.0 },
      { bob: -1, wf: 1, lf: { x: cx - 4, y: footY }, rf: { x: cx + 4, y: footY }, lh: { x: cx - 5, y: 15 }, rh: { x: cx + 6, y: 10 }, sa: -0.4 },
      { bob: 0, wf: 2, lf: { x: cx - 4, y: footY }, rf: { x: cx + 5, y: footY }, lh: { x: cx - 4, y: 15 }, rh: { x: cx + 8, y: 13 }, sa: 0.2 },
      { bob: 0, wf: 0, lf: { x: cx - 2, y: footY }, rf: { x: cx + 3, y: footY }, lh: { x: cx - 5, y: 15 }, rh: { x: cx + 5, y: 15 }, sa: -0.5 },
    ][f % 4]
    bob = atk.bob; wingFlap = atk.wf; lFoot = atk.lf; rFoot = atk.rf; lHand = atk.lh; rHand = atk.rh; spearAngle = atk.sa
  }

  const by = 10 + bob
  // Wind wings
  s.line(cx - 3, by + 2, cx - 10, by - 3 + wingFlap, hi, 2)
  s.line(cx - 9, by - 1 + wingFlap, cx - 11, by + 4 + wingFlap, armor, 1)
  s.line(cx + 3, by + 2, cx + 10, by - 3 + wingFlap, hi, 2)
  s.line(cx + 9, by - 1 + wingFlap, cx + 11, by + 4 + wingFlap, armor, 1)

  // Legs
  s.line(cx - 2, by + 7, lFoot.x, lFoot.y, dark, 2)
  s.px(lFoot.x, lFoot.y, gold)
  s.line(cx + 2, by + 7, rFoot.x, rFoot.y, armor, 2)
  s.px(rFoot.x, rFoot.y, gold)

  // Armored chest & helm
  s.rect(cx - 3, by, 7, 7, armor)
  s.rect(cx - 3, by + 4, 7, 1, gold)
  s.rect(cx - 3, by - 5, 7, 5, dark)
  s.px(cx, by - 7, gold); s.px(cx, by - 6, hi)
  if (dir !== 'up') {
    s.rect(cx - 2, by - 3, 5, 1, '#fff3b0') // glowing visor
  }

  // Arms & gale blade
  drawArm(s, { x: cx - 3, y: by + 1 }, { x: cx - 4, y: by + 3 }, lHand, dark, armor)
  drawArm(s, { x: cx + 3, y: by + 1 }, { x: cx + 5, y: by + 3 }, rHand, armor, hi)
  drawWeaponInHand(s, rHand, 'sword', '#caf0f8', spearAngle, action, f)

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

  if (sprite === 'goblin') {
    const isBoss = defId === 'goblin_chief'
    return humanSprite(
      {
        hair: shade(color, -0.35),
        body: isBoss ? '#582f0e' : '#7f5539',
        legs: '#5c3d2e',
        accent: isBoss ? '#ffd60a' : '#e9c46a',
        skin: color,
        eye: '#ffd60a',
        goblinEars: true,
        hatStyle: isBoss ? 'crown' : 'none',
      },
      dir,
      f,
      isBoss ? 'sword' : 'stick',
      isBoss ? '#adb5bd' : '#7f5539',
      attacking,
      action,
      attackFrameOverride,
    )
  }

  if (sprite === 'skeleton') {
    return humanSprite(
      {
        hair: color,
        body: shade(color, -0.1),
        legs: shade(color, -0.2),
        accent: '#6c757d',
        skin: color,
        eye: '#e63946',
        skeleton: true,
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

  if (sprite === 'demon') {
    const isBoss = defId === 'demon_lord' || defId === 'abyss_dragon'
    return humanSprite(
      {
        hair: '#14080e',
        body: color,
        legs: shade(color, -0.35),
        accent: isBoss ? '#ffd60a' : '#ffb703',
        skin: shade(color, 0.12),
        horns: true,
        wings: true,
        cape: isBoss ? '#590d22' : undefined,
        hatStyle: isBoss ? 'crown' : 'none',
        eye: '#ffd60a',
      },
      dir,
      f,
      isBoss ? 'sword' : 'staff',
      isBoss ? '#ff6b35' : '#ff9f1c',
      attacking,
      action,
      attackFrameOverride,
    )
  }

  const key = `ma|${sprite}|${defId ?? ''}|${color}|${dir}|${action}|${f}`
  return cached(key, () => {
    switch (sprite) {
      case 'slime':
        return renderSlime(color, dir, action, f)
      case 'mushroom':
        return renderMushroom(color, dir, action, f)
      case 'rabbit':
        return renderRabbit(color, dir, action, f)
      case 'wolf':
        return renderWolf(color, dir, action, f)
      case 'bat':
        return renderBat(color, dir, action, f)
      case 'ghost':
        return renderGhost(color, dir, action, f)
      case 'earth_golem':
        return renderGolem(color, dir, action, f, true)
      case 'gale_sentinel':
        return renderGaleSentinel(color, dir, action, f)
      case 'golem':
      default:
        return renderGolem(color, dir, action, f, false)
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
