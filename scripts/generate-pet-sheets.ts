import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { COMBAT_PETS, type CombatPetDef } from '../lib/game/systems'

/**
 * Generates uniform-frame 2D Fantasy MMORPG sprite sheets for ALL 38 pets in COMBAT_PETS:
 *   Raster grid: 68 x 68 px (2x pixel-art scaled -> 136 x 136 px per frame, hdScale = 4 -> 34x34 world units)
 *   Grid: 6 columns x 15 rows = 816 x 2040 px
 *   Rows:
 *     0: idle_down (4F)     1: idle_right (4F)     2: idle_up (4F)
 *     3: walk_down (6F)     4: walk_right (6F)     5: walk_up (6F)
 *     6: run_down (6F)      7: run_right (6F)      8: run_up (6F)
 *     9: follow_down (6F)  10: follow_right (6F)  11: follow_up (6F)
 *    12: attack_down (4F)  13: attack_right (4F)  14: attack_up (4F)
 */

const BASE_W = 68
const BASE_H = 68
const SCALE = 2
const FRAME_W = BASE_W * SCALE // 136
const FRAME_H = BASE_H * SCALE // 136
const COLS = 6
const ROWS = 15

type Dir3 = 'down' | 'right' | 'up'
type RowAction = 'idle' | 'walk' | 'run' | 'follow' | 'attack'

const ROW_SPECS: Array<{ action: RowAction; dir: Dir3; frames: number }> = [
  { action: 'idle', dir: 'down', frames: 4 },
  { action: 'idle', dir: 'right', frames: 4 },
  { action: 'idle', dir: 'up', frames: 4 },
  { action: 'walk', dir: 'down', frames: 6 },
  { action: 'walk', dir: 'right', frames: 6 },
  { action: 'walk', dir: 'up', frames: 6 },
  { action: 'run', dir: 'down', frames: 6 },
  { action: 'run', dir: 'right', frames: 6 },
  { action: 'run', dir: 'up', frames: 6 },
  { action: 'follow', dir: 'down', frames: 6 },
  { action: 'follow', dir: 'right', frames: 6 },
  { action: 'follow', dir: 'up', frames: 6 },
  { action: 'attack', dir: 'down', frames: 4 },
  { action: 'attack', dir: 'right', frames: 4 },
  { action: 'attack', dir: 'up', frames: 4 },
]

const OUTLINE_HEX = '#181124'
type RGBA = [number, number, number, number]

function hexToRgba(hex: string, alpha = 255): RGBA {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6)
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return [Number.isFinite(r) ? r : 128, Number.isFinite(g) ? g : 128, Number.isFinite(b) ? b : 128, alpha]
}

function shadeHex(hex: string, amt: number): string {
  const [r, g, b] = hexToRgba(hex)
  const adj = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)))
  return `#${[adj(r), adj(g), adj(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

function blendRgba(dst: RGBA, src: RGBA): RGBA {
  const sa = src[3] / 255
  const da = dst[3] / 255
  const outA = sa + da * (1 - sa)
  if (outA <= 0) return [0, 0, 0, 0]
  return [
    Math.round((src[0] * sa + dst[0] * da * (1 - sa)) / outA),
    Math.round((src[1] * sa + dst[1] * da * (1 - sa)) / outA),
    Math.round((src[2] * sa + dst[2] * da * (1 - sa)) / outA),
    Math.round(outA * 255),
  ]
}

class RasterCanvas {
  readonly w: number
  readonly h: number
  readonly data: Uint8ClampedArray
  readonly outlineMask: Uint8Array

  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.data = new Uint8ClampedArray(w * h * 4)
    this.outlineMask = new Uint8Array(w * h)
  }

  plot(x: number, y: number, rgba: RGBA, markOutline = true) {
    const ix = Math.round(x)
    const iy = Math.round(y)
    if (ix < 0 || ix >= this.w || iy < 0 || iy >= this.h) return
    const idx = (iy * this.w + ix) * 4
    if (rgba[3] >= 254) {
      this.data[idx] = rgba[0]
      this.data[idx + 1] = rgba[1]
      this.data[idx + 2] = rgba[2]
      this.data[idx + 3] = 255
      if (markOutline) this.outlineMask[iy * this.w + ix] = 1
    } else if (rgba[3] > 0) {
      const dst: RGBA = [this.data[idx], this.data[idx + 1], this.data[idx + 2], this.data[idx + 3]]
      const out = blendRgba(dst, rgba)
      this.data[idx] = out[0]
      this.data[idx + 1] = out[1]
      this.data[idx + 2] = out[2]
      this.data[idx + 3] = out[3]
      if (markOutline && rgba[3] >= 165) this.outlineMask[iy * this.w + ix] = 1
    }
  }

  px(x: number, y: number, color: string, alpha = 255, markOutline = true) {
    this.plot(x, y, hexToRgba(color, alpha), markOutline)
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: string, alpha = 255, markOutline = true) {
    const rgba = hexToRgba(color, alpha)
    const x0 = Math.floor(cx - rx - 1)
    const x1 = Math.ceil(cx + rx + 1)
    const y0 = Math.floor(cy - ry - 1)
    const y1 = Math.ceil(cy + ry + 1)
    const irx = Math.max(0.5, rx)
    const iry = Math.max(0.5, ry)
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) / irx
        const dy = (y - cy) / iry
        if (dx * dx + dy * dy <= 1) this.plot(x, y, rgba, markOutline)
      }
    }
  }

  shadedEllipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    baseColor: string,
    hiColor: string,
    darkColor: string,
    alpha = 255,
    markOutline = true,
  ) {
    const cBase = hexToRgba(baseColor, alpha)
    const cHi = hexToRgba(hiColor, alpha)
    const cDark = hexToRgba(darkColor, alpha)
    const x0 = Math.floor(cx - rx - 1)
    const x1 = Math.ceil(cx + rx + 1)
    const y0 = Math.floor(cy - ry - 1)
    const y1 = Math.ceil(cy + ry + 1)
    const irx = Math.max(0.5, rx)
    const iry = Math.max(0.5, ry)
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) / irx
        const dy = (y - cy) / iry
        if (dx * dx + dy * dy <= 1) {
          const light = -dy * 0.62 - dx * 0.28
          const col = light > 0.24 ? cHi : light < -0.24 ? cDark : cBase
          this.plot(x, y, col, markOutline)
        }
      }
    }
  }

  rect(x: number, y: number, w: number, h: number, color: string, alpha = 255, markOutline = true) {
    const rgba = hexToRgba(color, alpha)
    const ix = Math.round(x)
    const iy = Math.round(y)
    const iw = Math.round(w)
    const ih = Math.round(h)
    for (let dy = 0; dy < ih; dy++) {
      for (let dx = 0; dx < iw; dx++) {
        this.plot(ix + dx, iy + dy, rgba, markOutline)
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, color: string, thickness = 1, alpha = 255, markOutline = true) {
    const rgba = hexToRgba(color, alpha)
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2))
    const r = Math.max(0, (thickness - 1) * 0.5)
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const px = x0 + (x1 - x0) * t
      const py = y0 + (y1 - y0) * t
      if (r <= 0.15) {
        this.plot(px, py, rgba, markOutline)
      } else {
        for (let oy = -Math.ceil(r); oy <= Math.ceil(r); oy++) {
          for (let ox = -Math.ceil(r); ox <= Math.ceil(r); ox++) {
            if (ox * ox + oy * oy <= r * r + 0.35) {
              this.plot(px + ox, py + oy, rgba, markOutline)
            }
          }
        }
      }
    }
  }

  triangle(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    alpha = 255,
    markOutline = true,
  ) {
    const rgba = hexToRgba(color, alpha)
    const minX = Math.floor(Math.min(x0, x1, x2))
    const maxX = Math.ceil(Math.max(x0, x1, x2))
    const minY = Math.floor(Math.min(y0, y1, y2))
    const maxY = Math.ceil(Math.max(y0, y1, y2))
    const area = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0)
    if (Math.abs(area) < 0.01) return
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const w0 = ((x1 - x0) * (y - y0) - (y1 - y0) * (x - x0)) / area
        const w1 = ((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)) / area
        const w2 = ((x0 - x2) * (y - y2) - (y0 - y2) * (x - x2)) / area
        if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) {
          this.plot(x, y, rgba, markOutline)
        }
      }
    }
  }

  ring(cx: number, cy: number, rx: number, ry: number, color: string, alpha = 255, markOutline = false) {
    const rgba = hexToRgba(color, alpha)
    const steps = Math.max(24, Math.ceil((rx + ry) * 4))
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2
      this.plot(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, rgba, markOutline)
    }
  }

  applyOutline(outlineColor = OUTLINE_HEX) {
    const rgba = hexToRgba(outlineColor)
    const toOutline: Array<[number, number]> = []
    for (let y = 1; y < this.h - 1; y++) {
      for (let x = 1; x < this.w - 1; x++) {
        const i = y * this.w + x
        if (this.outlineMask[i]) continue
        if (
          this.outlineMask[i - 1] ||
          this.outlineMask[i + 1] ||
          this.outlineMask[i - this.w] ||
          this.outlineMask[i + this.w]
        ) {
          toOutline.push([x, y])
        }
      }
    }
    for (const [x, y] of toOutline) {
      const idx = (y * this.w + x) * 4
      this.data[idx] = rgba[0]
      this.data[idx + 1] = rgba[1]
      this.data[idx + 2] = rgba[2]
      this.data[idx + 3] = 255
    }
  }
}

interface MotionKinematics {
  bobY: number
  hopY: number
  lungeX: number
  leanX: number
  stride: number
  wingFlap: number
  tailWag: number
  squash: number
  atkFrame: number
  isAtk: boolean
  isRun: boolean
  isFollow: boolean
  phase: number
}

function computeMotion(action: RowAction, frame: number, dir: Dir3, floating: boolean): MotionKinematics {
  const isAtk = action === 'attack'
  const isRun = action === 'run'
  const isFollow = action === 'follow'
  const isWalk = action === 'walk'
  const isMove = isWalk || isRun || isFollow
  const mod = isMove ? 6 : 4
  const phase = (frame % mod) / mod
  const atkF = isAtk ? frame % 4 : 0
  const rad = phase * Math.PI * 2

  const bobY = isRun
    ? Math.sin(rad) * 2.2 - 1.5
    : isFollow
      ? -Math.abs(Math.sin(rad)) * 3.5 - (floating ? 2 : 0)
      : isWalk
        ? -Math.abs(Math.sin(rad)) * 2.1
        : Math.sin(rad) * (floating ? 2.2 : 1.0)

  const hopY = isFollow ? -Math.abs(Math.sin(rad)) * 2.4 : isRun ? -Math.abs(Math.sin(rad)) * 1.4 : 0
  const lungeMag = isAtk ? [-2.2, 4.8, 5.8, 1.5][atkF] : 0
  const lungeX = dir === 'right' ? lungeMag : 0
  const leanX = isRun ? (dir === 'right' ? 2.2 : 0) : isFollow ? (dir === 'right' ? 1.2 : 0) : 0
  const stride = isRun
    ? Math.sin(rad) * 5.2
    : isFollow
      ? Math.sin(rad) * 4.4
      : isWalk
        ? Math.sin(rad) * 3.5
        : isAtk && atkF === 2
          ? 3.8
          : 0
  const wingFlap = isRun
    ? Math.sin(rad) * 7.2
    : isFollow
      ? Math.sin(rad) * 6.0
      : isWalk
        ? Math.sin(rad) * 4.5
        : isAtk
          ? [5.5, -6.5, -7.5, 2][atkF]
          : Math.sin(rad) * 2.4
  const tailWag = isMove ? Math.sin(rad) * 4.2 : Math.sin(rad) * 2.0
  const squash = isAtk && atkF === 0 ? -0.14 : isFollow ? Math.sin(rad) * 0.1 : isWalk ? Math.sin(rad) * 0.08 : 0

  return {
    bobY,
    hopY,
    lungeX,
    leanX,
    stride,
    wingFlap,
    tailWag,
    squash,
    atkFrame: atkF,
    isAtk,
    isRun,
    isFollow,
    phase,
  }
}

function drawCuteEyes(
  rc: RasterCanvas,
  hx: number,
  hy: number,
  dir: Dir3,
  irisHex: string,
  angry: boolean,
  spread = 3.5,
  slit = false,
) {
  if (dir === 'up') return
  const isSide = dir === 'right'
  const ex1 = isSide ? hx + 2.5 : hx - spread
  const ex2 = hx + spread
  const drawOne = (ex: number) => {
    if (slit) {
      rc.rect(ex - 1, hy - 1, 3, 3, '#1e1b4b')
      rc.rect(ex, hy - 1, 1, 3, irisHex)
      rc.px(ex - 1, hy - 1, '#ffffff')
    } else {
      rc.rect(ex - 1, hy - 1, 2, 3, irisHex)
      rc.px(ex - 1, hy - 1, '#ffffff')
      if (angry) {
        rc.px(ex - 1, hy - 2, OUTLINE_HEX)
      }
    }
  }
  drawOne(ex1)
  if (!isSide) drawOne(ex2)
}

function drawWings(
  rc: RasterCanvas,
  cx: number,
  cy: number,
  span: number,
  wingColor: string,
  tipColor: string,
  flap: number,
  dir: Dir3,
  style: 'feather' | 'bat' | 'crystal' | 'fairy' | 'seraph6',
) {
  const isSide = dir === 'right'
  const darkW = shadeHex(wingColor, -0.22)
  const drawSingle = (sx: number, yOff = 0, sScale = 1) => {
    const sp = span * sScale
    const wx = cx + sx * (isSide ? -4 : 5)
    const wy = cy + yOff
    const tx = wx + sx * (isSide ? -sp : sp)
    const ty = wy - 5 + flap * sScale
    if (style === 'fairy' || style === 'crystal') {
      rc.shadedEllipse((wx + tx) * 0.5, ty, sp * 0.52, 4.2 * sScale, wingColor, '#ffffff', tipColor, 205)
      rc.shadedEllipse((wx + tx) * 0.5, ty + 4.5, sp * 0.36, 2.8 * sScale, tipColor, wingColor, darkW, 185)
    } else if (style === 'bat') {
      rc.triangle(wx, wy, tx, ty - 3, tx - sx * 2, wy + 5 + flap * 0.3, wingColor)
      rc.line(wx, wy, tx, ty - 3, darkW, 1.5)
      rc.line(wx, wy, tx - sx * 2, wy + 5 + flap * 0.3, tipColor, 1)
    } else {
      rc.shadedEllipse((wx + tx) * 0.5, ty + 1, sp * 0.55, 4.5 * sScale, wingColor, '#ffffff', darkW)
      rc.ellipse(tx, ty + 1, 3.2 * sScale, 2.5 * sScale, tipColor)
    }
  }

  if (style === 'seraph6') {
    if (isSide) {
      drawSingle(-1, -5, 1.0)
      drawSingle(-1, 0, 0.85)
      drawSingle(-1, 5, 0.7)
    } else {
      for (const sx of [-1, 1]) {
        drawSingle(sx, -5, 1.0)
        drawSingle(sx, 0, 0.85)
        drawSingle(sx, 5, 0.7)
      }
    }
    return
  }

  if (isSide) {
    drawSingle(-1)
  } else {
    drawSingle(-1)
    drawSingle(1)
  }
}

function drawMotionVfx(rc: RasterCanvas, cx: number, cy: number, m: MotionKinematics, pet: CombatPetDef, dir: Dir3) {
  const acc = pet.colors.accent
  const pri = pet.colors.primary

  if (m.isRun && dir === 'right') {
    for (let i = 0; i < 3; i++) {
      const ly = cy - 6 + i * 6
      rc.line(cx - 24, ly, cx - 15 - (i % 2) * 3, ly, acc, 1, 165, false)
    }
  } else if (m.isFollow) {
    // Joyful trailing sparkle orbs when actively following player
    for (let i = 0; i < 2; i++) {
      const ang = m.phase * Math.PI * 2 + i * Math.PI
      const sx = cx + (dir === 'right' ? -15 : 0) + Math.cos(ang) * 9
      const sy = cy - 4 + Math.sin(ang * 2) * 4
      rc.px(sx, sy, i === 0 ? '#ffffff' : acc, 210, false)
      rc.px(sx + 1, sy, acc, 140, false)
    }
  }

  if (m.isAtk && (m.atkFrame === 1 || m.atkFrame === 2)) {
    const fx = cx + (dir === 'right' ? 16 : 0)
    const fy = cy - 8 + (dir === 'up' ? -10 : 4)
    const r = m.atkFrame === 1 ? 6 : 8.5
    rc.ellipse(fx, fy, r, r * 0.75, pri, 145, false)
    rc.ellipse(fx, fy, r * 0.6, r * 0.45, acc, 215, false)
    rc.ellipse(fx, fy, 2.5, 2.5, '#ffffff', 240, false)
  }
}

const FLOATING_PET_IDS = new Set([
  'phao_lotus',
  'phao_gold_naga',
  'phao_celestial',
  'phao_phantom',
  'crystal_owl',
  'moonlight_firefly',
  'aurora_cloud_dragon',
  'phao_sky_eagle',
  'phao_crimson_dragon',
  'phao_prism_unicorn',
  'phao_sapphire_wisp',
  'phao_solar_phoenix',
  'phao_glacial_wolf',
  'phao_armored_lion',
  'phao_obsidian_dragon',
  'phao_seraph_cat',
  'phao_violet_hound',
  'phao_astral_dragon',
  'phao_celestial_owl',
  'phao_golden_seraph',
])

function renderPetFrame(pet: CombatPetDef, dir: Dir3, action: RowAction, frame: number): RasterCanvas {
  const rc = new RasterCanvas(BASE_W, BASE_H)
  const floating = FLOATING_PET_IDS.has(pet.id)
  const m = computeMotion(action, frame, dir, floating)
  const cx = BASE_W / 2 + m.lungeX + m.leanX
  const footY = 58
  const baseY = footY + (floating ? -6 : 0) + m.bobY + m.hopY
  const isSide = dir === 'right'
  const isUp = dir === 'up'
  const c1 = pet.colors.primary
  const c2 = pet.colors.secondary
  const acc = pet.colors.accent
  const hi = shadeHex(c1, 0.34)
  const dark = shadeHex(c1, -0.28)
  const angry = m.isAtk && (m.atkFrame === 1 || m.atkFrame === 2)
  const id = pet.id

  // Subtle phao spirit vessel ring beneath phao pets
  if (pet.category === 'phao' || id.startsWith('phao_')) {
    rc.ring(BASE_W / 2, footY + 1, 13, 4, acc, 130, false)
  }

  // 1) Classic Phao Vessels (lid opens on attack, unique ornamentation per vessel)
  if (id === 'phao_lotus' || id === 'phao_gold_naga' || id === 'phao_celestial' || id === 'phao_phantom') {
    const lidLift = m.isAtk ? [1, 7, 9, 3][m.atkFrame] : m.isFollow || m.isRun ? 2.5 : 1
    const cy = baseY - 15
    // Pedestal foot
    rc.shadedEllipse(cx, cy + 12, 9.5, 3.5, c2, c1, shadeHex(c2, -0.3))
    // Inner glowing energy when lid opens
    if (lidLift > 2) {
      rc.ellipse(cx, cy - 3, 7, 6, acc, 175, false)
      rc.ellipse(cx, cy - 3, 3.5, 3.5, '#ffffff', 235, false)
    }
    // Vessel belly
    rc.shadedEllipse(cx, cy + 2, 12.5, 9.5, c1, hi, c2)
    // Ornate waist ring
    rc.rect(cx - 12, cy + 1, 24, 2.5, acc)

    // Vessel-specific details
    if (id === 'phao_lotus') {
      // Pink/peach lotus petals wrapping base & floating lotus buds
      for (const sx of [-1, 0, 1]) {
        rc.triangle(cx + sx * 6 - 3, cy + 5, cx + sx * 7, cy - 4, cx + sx * 6 + 3, cy + 5, '#f472b6')
      }
    } else if (id === 'phao_gold_naga') {
      // Twin emerald naga heads on left/right shoulders + kanok crown
      for (const sx of [-1, 1]) {
        rc.line(cx + sx * 10, cy + 1, cx + sx * 16, cy - 7, acc, 2.4)
        rc.ellipse(cx + sx * 16, cy - 8, 3, 2.2, '#34d399')
        rc.px(cx + sx * 17, cy - 8, '#fef08a')
      }
    } else if (id === 'phao_celestial') {
      // Sun & Moon discs orbiting
      const a = m.phase * Math.PI * 2
      rc.ellipse(cx + Math.cos(a) * 16, cy + Math.sin(a) * 5, 3.5, 3.5, '#fbbf24')
      rc.ellipse(cx - Math.cos(a) * 16, cy - Math.sin(a) * 5, 3, 3, '#38bdf8')
    } else if (id === 'phao_phantom') {
      // Sealed crimson-gold spirit talisman charm + ghostly eyes inside
      rc.rect(cx - 2, cy - 2, 4, 8, '#fef08a')
      rc.px(cx, cy, '#ef4444')
      rc.px(cx, cy + 3, '#ef4444')
      if (!isUp) {
        rc.px(cx - 4, cy - 2, '#f43f5e')
        rc.px(cx + 4, cy - 2, '#f43f5e')
      }
    }

    // Lid + Spire
    rc.triangle(cx - 9, cy - 5 - lidLift, cx, cy - 19 - lidLift, cx + 9, cy - 5 - lidLift, c1)
    rc.ellipse(cx, cy - 19 - lidLift, 2.4, 2.4, acc)

    rc.applyOutline()
    drawMotionVfx(rc, cx, baseY - 12, m, pet, dir)
    return rc
  }

  // 2) Slimes (buddy_slime with sprout leaf vs phao_water_slime teardrop with bubble ring)
  if (id === 'buddy_slime' || id === 'phao_water_slime') {
    const rx = 13.5 * (1 - m.squash)
    const ry = 11.5 * (1 + m.squash)
    const cy = baseY - ry + 1
    if (id === 'phao_water_slime') {
      // Teardrop crown & halo ring
      rc.shadedEllipse(cx, cy + 1, rx, ry, c1, hi, c2, 225)
      rc.triangle(cx - 7, cy - ry + 5, cx, cy - ry - 7, cx + 7, cy - ry + 5, c1, 225)
      rc.ring(cx, cy - ry - 8, 6.5, 2, acc, 200, false)
    } else {
      // Round gel blob + leaf sprout on top + rosy cheeks
      rc.shadedEllipse(cx, cy, rx, ry, c1, hi, c2)
      rc.line(cx, cy - ry, cx + 1, cy - ry - 5, '#15803d', 1.6)
      rc.ellipse(cx + 4, cy - ry - 5, 3.8, 2, '#4ade80')
      if (!isUp) {
        rc.ellipse(cx - 6 + (isSide ? 3 : 0), cy + 2, 2.2, 1.3, '#fda4af', 200, false)
        if (!isSide) rc.ellipse(cx + 6, cy + 2, 2.2, 1.3, '#fda4af', 200, false)
      }
    }
    // Shine highlight
    rc.ellipse(cx - 4, cy - 4, 3, 1.6, '#ffffff', 205, false)
    drawCuteEyes(rc, cx + (isSide ? 3 : 0), cy, dir, '#0f172a', angry, 4)
    rc.applyOutline()
    drawMotionVfx(rc, cx, cy, m, pet, dir)
    return rc
  }

  // 3) Wisps & Fireflies
  if (id === 'moonlight_firefly' || id === 'phao_sapphire_wisp') {
    const cy = baseY - 15
    if (id === 'moonlight_firefly') {
      drawWings(rc, cx, cy - 1, 15, acc, '#ffffff', m.wingFlap, dir, 'fairy')
      rc.shadedEllipse(cx, cy, 9.5, 10, c1, '#ffffff', c2)
      // Antennae + crescent moon lantern dangling at side
      rc.line(cx - 3, cy - 9, cx - 6, cy - 14, acc, 1.4)
      rc.line(cx + 3, cy - 9, cx + 6, cy - 14, acc, 1.4)
      rc.ellipse(cx + 12, cy + 4, 3.5, 4.5, '#fef08a')
      rc.ellipse(cx + 13.5, cy + 3.5, 2, 3, '#0f172a', 180, false)
    } else {
      // Sapphire wisp flame plume + crystal star center + 3 orbiting sparkles
      rc.triangle(cx - 9, cy + 3, cx + (isSide ? -4 : 0), cy - 18 - (frame % 2) * 2, cx + 9, cy + 3, c2, 220)
      rc.shadedEllipse(cx, cy + 2, 10, 9.5, c1, acc, c2, 235)
      rc.ellipse(cx, cy + 2, 4, 4, '#ffffff', 225, false)
      for (let i = 0; i < 3; i++) {
        const a = m.phase * Math.PI * 2 + (i * Math.PI * 2) / 3
        rc.ellipse(cx + Math.cos(a) * 14, cy + Math.sin(a) * 6, 2, 2, acc, 230, false)
      }
    }
    drawCuteEyes(rc, cx + (isSide ? 2.5 : 0), cy + 1, dir, '#1e3a8a', angry, 3.2)
    rc.applyOutline()
    drawMotionVfx(rc, cx, cy, m, pet, dir)
    return rc
  }

  // 4) Avians (Crystal Owl, Dawn Rooster, Sky Eagle, Frost Penguin, Solar Phoenix, Celestial Owl)
  if (
    id === 'crystal_owl' ||
    id === 'phao_dawn_rooster' ||
    id === 'phao_sky_eagle' ||
    id === 'phao_frost_penguin' ||
    id === 'phao_solar_phoenix' ||
    id === 'phao_celestial_owl'
  ) {
    const isPenguin = id === 'phao_frost_penguin'
    const isChicken = id === 'phao_dawn_rooster'
    const isPhoenix = id === 'phao_solar_phoenix'
    const isCrystalOwl = id === 'crystal_owl'
    const isCelestialOwl = id === 'phao_celestial_owl'
    const isEagle = id === 'phao_sky_eagle'
    const cy = baseY - 14

    // Tail feathers
    if (isPhoenix) {
      for (const ang of [-0.5, 0, 0.5]) {
        rc.ellipse(cx + (isSide ? -12 : ang * 6), cy + 8 + m.tailWag * 0.2, 6, 3, acc)
      }
    } else {
      rc.ellipse(cx + (isSide ? -10 : 0), cy + 6, 5.5, 3, c2)
    }

    if (!isPenguin) {
      drawWings(
        rc,
        cx,
        cy - 1,
        isPhoenix || isEagle || isCelestialOwl ? 16 : 11,
        isEagle ? '#f8fafc' : c1,
        isPhoenix ? '#dc2626' : acc,
        m.wingFlap,
        dir,
        'feather',
      )
    }

    // Bird feet
    rc.line(cx - 3.5, cy + 8, cx - 3.5 + m.stride * 0.35, baseY + 1, '#f59e0b', 2)
    rc.line(cx + 3.5, cy + 8, cx + 3.5 - m.stride * 0.35, baseY + 1, '#f59e0b', 2)

    // Body
    rc.shadedEllipse(cx, cy + 1, 9.5, 9, c1, hi, c2)
    if (isPenguin || isEagle || isCelestialOwl) {
      rc.ellipse(cx + (isSide ? 2 : 0), cy + 3, 6, 6.2, '#f8fafc')
    }
    if (isCrystalOwl) {
      // Glowing diamond chest crystal
      rc.triangle(cx, cy - 2, cx + 4, cy + 3, cx, cy + 7, acc)
      rc.triangle(cx, cy - 2, cx - 4, cy + 3, cx, cy + 7, '#e0f2fe')
    }

    // Head
    const hx = cx + (isSide ? 3 : 0)
    const hy = cy - 7
    rc.shadedEllipse(hx, hy, 8, 7.5, isEagle || isCelestialOwl ? '#f8fafc' : c1, hi, c2)

    // Penguin flippers & winter scarf
    if (isPenguin) {
      rc.ellipse(cx - 10, cy + 1 + m.wingFlap * 0.2, 3, 6, c2)
      if (!isSide) rc.ellipse(cx + 10, cy + 1 - m.wingFlap * 0.2, 3, 6, c2)
      rc.rect(cx - 8, cy - 2, 16, 4, acc)
      rc.rect(cx + 4, cy, 3, 7, acc)
    } else if (isChicken) {
      // Triple red rooster comb
      rc.ellipse(hx - 2, hy - 8, 2.5, 2.5, '#ef4444')
      rc.ellipse(hx + 1, hy - 9, 2.5, 2.8, '#ef4444')
      rc.ellipse(hx + 4, hy - 7, 2, 2.2, '#ef4444')
    } else if (isPhoenix) {
      // Long sweeping phoenix plumes
      rc.line(hx - 1, hy - 6, hx - 9, hy - 14, acc, 2)
      rc.line(hx + 1, hy - 7, hx - 4, hy - 16, '#fbbf24', 2)
    } else if (isCelestialOwl) {
      // Golden Royal Crown + feather tufts
      rc.triangle(hx - 4, hy - 6, hx - 3, hy - 12, hx - 1, hy - 6, '#fbbf24')
      rc.triangle(hx - 1, hy - 6, hx, hy - 13, hx + 2, hy - 6, '#fde047')
      rc.triangle(hx + 1, hy - 6, hx + 4, hy - 12, hx + 5, hy - 6, '#fbbf24')
    } else if (isCrystalOwl) {
      // Pointed ear tufts
      rc.triangle(hx - 6, hy - 4, hx - 9, hy - 12, hx - 2, hy - 6, acc)
      rc.triangle(hx + 6, hy - 4, hx + 9, hy - 12, hx + 2, hy - 6, acc)
    }

    // Beak & Eyes
    if (!isUp) {
      const bx = hx + (isSide ? 6 : 0)
      rc.triangle(bx - 2.5, hy + 1, bx + (isSide ? 5 : 0), hy + 3.5, bx + 2.5, hy + 1, '#fbbf24')
      drawCuteEyes(rc, hx, hy - 1, dir, isPhoenix ? '#dc2626' : '#0f172a', angry, 3.5)
    }

    rc.applyOutline()
    drawMotionVfx(rc, cx, cy, m, pet, dir)
    return rc
  }

  // 5) Tortoise
  if (id === 'phao_stone_tortoise') {
    const cy = baseY - 10
    rc.rect(cx - 10 + m.stride * 0.3, cy + 4, 4.5, 6, dark)
    rc.rect(cx + 6 - m.stride * 0.3, cy + 4, 4.5, 6, dark)
    // Heavy stone shell dome
    rc.shadedEllipse(cx - (isSide ? 2 : 0), cy, 13.5, 9.5, '#78716c', '#a8a29e', '#44403c')
    rc.rect(cx - 13, cy + 3, 25, 3, c2)
    // 3 glowing mana crystals on shell
    for (const sx of [-5, 0, 5]) {
      rc.triangle(cx + sx - 2, cy - 8, cx + sx, cy - 14 - (sx === 0 ? 2 : 0), cx + sx + 2, cy - 8, acc)
    }
    if (!isUp) {
      const hx = cx + (isSide ? 12 : 0)
      const hy = cy + (isSide ? 0 : 2)
      rc.shadedEllipse(hx, hy, 5.5, 5, c1, hi, dark)
      drawCuteEyes(rc, hx, hy - 1, dir, '#14532d', angry, 2.4)
    }
    rc.applyOutline()
    drawMotionVfx(rc, cx, cy, m, pet, dir)
    return rc
  }

  // 6) Bipeds (Goblin, Squirrel, Raccoon, Rune Golem, Golden Seraph)
  if (
    id === 'phao_spear_goblin' ||
    id === 'phao_acorn_squirrel' ||
    id === 'gem_raccoon' ||
    id === 'phao_rune_golem' ||
    id === 'phao_golden_seraph'
  ) {
    const isGoblin = id === 'phao_spear_goblin'
    const isSquirrel = id === 'phao_acorn_squirrel'
    const isRaccoon = id === 'gem_raccoon'
    const isGolem = id === 'phao_rune_golem'
    const isSeraph = id === 'phao_golden_seraph'
    const cy = baseY - 15

    if (isSeraph) {
      drawWings(rc, cx, cy - 3, 15, '#ffffff', acc, m.wingFlap, dir, 'seraph6')
    }
    if (isSquirrel || isRaccoon) {
      rc.shadedEllipse(cx - (isSide ? 10 : 8), cy - 2 + m.tailWag * 0.3, 6.5, 10, c1, hi, c2)
      if (isRaccoon) {
        rc.rect(cx - 12, cy - 4, 6, 2, '#1e293b')
        rc.rect(cx - 12, cy + 1, 6, 2, '#1e293b')
      }
    }

    // Legs
    rc.rect(cx - 5 + m.stride * 0.35, cy + 7, 4, 7, c2)
    rc.rect(cx + 1 - m.stride * 0.35, cy + 7, 4, 7, c2)

    // Body
    if (isGolem) {
      rc.shadedEllipse(cx, cy + 1, 10.5, 9.5, '#d6d3d1', '#f5f5f4', '#78716c')
      rc.rect(cx - 7, cy - 2, 14, 5, '#ca8a04')
      rc.ellipse(cx, cy + 1, 3.2, 3.2, acc)
      // Floating shoulder pauldrons
      rc.shadedEllipse(cx - 12, cy - 3, 4, 4.5, '#ca8a04', '#fde047', '#78350f')
      rc.shadedEllipse(cx + 12, cy - 3, 4, 4.5, '#ca8a04', '#fde047', '#78350f')
    } else if (isSeraph) {
      rc.shadedEllipse(cx, cy + 1, 7.5, 7.5, '#ffffff', '#ffffff', '#fde68a')
      rc.rect(cx - 6, cy - 1, 12, 3, '#f59e0b')
    } else {
      rc.shadedEllipse(cx, cy + 1, 7.5, 7.5, c1, hi, c2)
    }

    // Head
    const hx = cx + (isSide ? 1.5 : 0)
    const hy = cy - 10
    rc.shadedEllipse(
      hx,
      hy,
      isGolem ? 6.5 : 8,
      isGolem ? 6 : 7.5,
      isSeraph ? '#ffe4d6' : isGolem ? '#e7e5e4' : c1,
      isSeraph ? '#fff3eb' : hi,
      isSeraph ? '#f3bfa8' : c2,
    )

    if (isGoblin) {
      for (const sx of [-1, 1]) {
        rc.triangle(hx + sx * 6, hy - 1, hx + sx * 14, hy - 5, hx + sx * 6, hy + 3, c1)
      }
      // Tall gold spear
      const spBoost = m.isAtk ? [-2, 6, 8, 2][m.atkFrame] : 0
      const sx = cx + 8 + spBoost * 0.5
      rc.line(sx, cy + 9, sx + (isSide ? 4 : 0), cy - 19, '#78350f', 2)
      rc.triangle(sx + (isSide ? 4 : 0) - 2.5, cy - 19, sx + (isSide ? 4 : 0), cy - 25, sx + (isSide ? 4 : 0) + 2.5, cy - 19, acc)
    } else if (isSquirrel) {
      rc.ellipse(hx - 4, hy - 8, 2.5, 4, c1)
      rc.ellipse(hx + 4, hy - 8, 2.5, 4, c1)
      // Holding acorn
      rc.ellipse(cx + 7, cy + 2, 3.5, 4.5, '#b45309')
      rc.ellipse(cx + 7, cy - 1, 4.2, 2.2, '#fde68a')
    } else if (isRaccoon) {
      rc.ellipse(hx - 5, hy - 7, 2.8, 3.5, c2)
      rc.ellipse(hx + 5, hy - 7, 2.8, 3.5, c2)
      if (!isUp) rc.rect(hx - 7, hy - 2, 14, 4, '#1e293b')
      // Carrying sapphire gem
      rc.triangle(cx + 7, cy - 1, cx + 11, cy + 2, cx + 7, cy + 5, acc)
      rc.triangle(cx + 7, cy - 1, cx + 3, cy + 2, cx + 7, cy + 5, '#bae6fd')
    } else if (isGolem) {
      rc.triangle(hx - 4, hy - 5, hx - 7, hy - 11, hx - 1, hy - 6, '#f59e0b')
      rc.triangle(hx + 4, hy - 5, hx + 7, hy - 11, hx + 1, hy - 6, '#f59e0b')
    } else if (isSeraph) {
      rc.ellipse(hx, hy - 3, 8.5, 5, '#fef08a')
      rc.ring(hx, hy - 12, 7.5, 2.4, '#fbbf24', 240, true)
      // Holy scepter
      rc.line(cx + 8, cy + 7, cx + 9, cy - 14, '#f59e0b', 1.6)
      rc.ellipse(cx + 9, cy - 15, 2.8, 2.8, '#ffffff')
    }

    drawCuteEyes(rc, hx, hy + 1, dir, isGolem ? '#38bdf8' : isSeraph ? '#f59e0b' : '#1e1b4b', angry, 3.2)
    rc.applyOutline()
    drawMotionVfx(rc, cx, cy, m, pet, dir)
    return rc
  }

  // 7) Quadrupeds, Foxes, Cats, Dogs, Wolves, Bunny, Lion, Stag, Unicorn & Dragons
  const isDragon =
    id === 'aurora_cloud_dragon' ||
    id === 'phao_crimson_dragon' ||
    id === 'phao_obsidian_dragon' ||
    id === 'phao_astral_dragon'
  const isFox = id === 'flame_fox' || id === 'phao_ember_ninetail' || id === 'phao_sacred_kitsune'
  const isBunny = id === 'phao_ribbon_bunny'
  const isUnicorn = id === 'phao_prism_unicorn'
  const isStag = id === 'phao_frost_stag'
  const isCat = id === 'phao_husky_kitten' || id === 'phao_abyss_neko' || id === 'phao_seraph_cat'
  const isSeraphCat = id === 'phao_seraph_cat'
  const isLion = id === 'phao_armored_lion'
  const isWingedWolf = id === 'phao_glacial_wolf' || id === 'phao_violet_hound'
  const hasWings = isDragon || isUnicorn || isSeraphCat || isLion || isWingedWolf

  const cy = baseY - 12

  // Tails
  if (isFox) {
    const count = id === 'flame_fox' ? 3 : 5
    for (let t = 0; t < count; t++) {
      const ang = -1.05 + (t / (count - 1)) * 2.1 + m.tailWag * 0.05
      const tx = cx + (isSide ? -11 : 0) + Math.sin(ang) * (isSide ? 10 : 14)
      const ty = cy - 2 - Math.cos(ang) * 11
      rc.shadedEllipse(tx, ty, 3.8, 6.8, c1, acc, c2)
      rc.ellipse(tx, ty - 3, 2.6, 2.8, acc)
    }
  } else if (isBunny) {
    rc.ellipse(cx + (isSide ? -10 : 0), cy + 4, 3.5, 3.5, '#ffffff')
  } else if (isDragon) {
    rc.line(cx - (isSide ? 8 : 0), cy + 4, cx - 17, cy - 3 + m.tailWag * 0.5, c2, 3)
    rc.ellipse(cx - 18, cy - 4 + m.tailWag * 0.5, 3.2, 3.2, acc)
  } else {
    rc.ellipse(cx + (isSide ? -11 : -6), cy + 1 + m.tailWag * 0.3, 3.5, 6.5, isUnicorn ? '#f472b6' : c2)
  }

  // Wings
  if (hasWings) {
    const wingStyle = isSeraphCat
      ? 'seraph6'
      : id === 'phao_obsidian_dragon' || id === 'phao_violet_hound' || id === 'phao_crimson_dragon'
        ? 'bat'
        : id === 'phao_astral_dragon' || id === 'phao_glacial_wolf'
          ? 'crystal'
          : 'feather'
    drawWings(
      rc,
      cx,
      cy - 3,
      isDragon || isSeraphCat ? 16 : 13,
      isUnicorn ? '#ffffff' : isLion ? '#fef08a' : c2,
      acc,
      m.wingFlap,
      dir,
      wingStyle,
    )
  }

  // Paws
  rc.rect(cx - 7 + m.stride * 0.35, cy + 5, 4, 7.5, dark)
  rc.rect(cx + 3 - m.stride * 0.35, cy + 5, 4, 7.5, dark)

  // Torso
  rc.shadedEllipse(cx, cy + 1, isSide ? 11.5 : 9, 7.5, c1, hi, c2)
  if (isDragon) {
    rc.ellipse(cx + (isSide ? 3 : 0), cy + 2, isSide ? 6 : 5, 4.5, acc, 170)
  }

  // Collar / Scarf / Mane / Armor
  if (id === 'phao_husky_kitten' || id === 'phao_shiba_scarf' || id === 'phao_ribbon_bunny' || isLion || id === 'phao_sacred_kitsune') {
    rc.rect(cx + (isSide ? 1 : -6), cy - 4, isSide ? 9 : 12, 3.5, isLion ? '#fbbf24' : acc)
    if (id === 'phao_husky_kitten') {
      rc.ellipse(cx + (isSide ? 6 : 0), cy - 1, 2, 2, '#fde047')
    } else if (id === 'phao_shiba_scarf') {
      rc.rect(cx - 2, cy - 2, 3, 6, acc)
    } else if (id === 'phao_ribbon_bunny') {
      rc.ellipse(cx - 3 + (isSide ? 4 : 0), cy - 3, 2.5, 2, '#ec4899')
      rc.ellipse(cx + 3 + (isSide ? 4 : 0), cy - 3, 2.5, 2, '#ec4899')
    }
  }

  // Head
  const hx = cx + (isSide ? 7 : 0)
  const hy = cy - 8
  rc.shadedEllipse(hx, hy, 8.5, 7.5, c1, hi, dark)

  // Headgear: Antlers / Horn / Bunny Ears / Dragon Horns / Cat Ears
  if (isStag) {
    for (const sx of [-1, 1]) {
      rc.line(hx + sx * 3, hy - 6, hx + sx * 9, hy - 16, acc, 2)
      rc.line(hx + sx * 6, hy - 11, hx + sx * 12, hy - 12, '#ffffff', 1.6)
    }
  } else if (isUnicorn) {
    rc.triangle(hx - 1.5, hy - 6, hx + (isSide ? 3 : 0), hy - 16, hx + 2, hy - 6, '#fde047')
    rc.ellipse(hx - 3, hy - 4, 3, 2, '#f472b6')
  } else if (isBunny) {
    rc.ellipse(hx - 4, hy - 11, 2.8, 6.2, hi)
    rc.ellipse(hx + 4, hy - 11, 2.8, 6.2, hi)
    rc.ellipse(hx - 4, hy - 11, 1.3, 4, '#fbcfe8', 220, false)
    rc.ellipse(hx + 4, hy - 11, 1.3, 4, '#fbcfe8', 220, false)
  } else if (isDragon) {
    for (const sx of [-1, 1]) {
      rc.triangle(hx + sx * 3, hy - 5, hx + sx * 8, hy - 14, hx + sx * 6, hy - 4, acc)
    }
    if (id === 'aurora_cloud_dragon') {
      rc.line(hx + 5, hy + 2, hx + 11, hy + 4, acc, 1.2)
    }
  } else {
    for (const sx of [-1, 1]) {
      rc.triangle(hx + sx * 2.5, hy - 5, hx + sx * 7.5, hy - 13, hx + sx * 7, hy - 3, c2)
    }
  }

  if (isSeraphCat) {
    rc.ring(hx, hy - 12, 6.5, 2.2, '#fbbf24', 240, true)
  }

  if (id === 'phao_abyss_neko' || id === 'phao_violet_hound' || id === 'phao_ember_ninetail') {
    for (let i = 0; i < 3; i++) {
      const a = m.phase * Math.PI * 2 + i * 2.1
      rc.ellipse(cx + Math.cos(a) * 14, cy - 3 + Math.sin(a) * 8, 2, 2.4, acc, 200, false)
    }
  }

  // Eyes & Whiskers
  const iris =
    id === 'phao_obsidian_dragon' || id === 'phao_violet_hound'
      ? '#f43f5e'
      : id === 'phao_abyss_neko' || id === 'phao_crimson_dragon'
        ? '#fbbf24'
        : id === 'phao_astral_dragon' || id === 'phao_glacial_wolf' || id === 'phao_frost_stag'
          ? '#38bdf8'
          : '#1e1b4b'
  drawCuteEyes(rc, hx, hy, dir, iris, angry, 3.2, isCat || isDragon)

  rc.applyOutline()
  drawMotionVfx(rc, cx, cy, m, pet, dir)
  return rc
}

/* ---------------- Pure Node PNG Encoder ---------------- */

const CRC_TABLE = (() => {
  const tbl = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    tbl[n] = c >>> 0
  }
  return tbl
})()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, payload: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(payload.length, 0)
  const tag = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.concat([tag, payload])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcBuf), 0)
  return Buffer.concat([len, tag, payload, crc])
}

function encodeRgbaPng(width: number, height: number, rgba: Uint8ClampedArray): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const rowStride = width * 4 + 1
  const raw = Buffer.alloc(rowStride * height)
  for (let y = 0; y < height; y++) {
    const outOff = y * rowStride
    raw[outOff] = 0
    const srcOff = y * width * 4
    raw.set(rgba.subarray(srcOff, srcOff + width * 4), outOff + 1)
  }

  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([signature, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))])
}

function generatePetSheet(pet: CombatPetDef) {
  const outDir = path.join(process.cwd(), 'public', 'assets', 'hd', 'pets', pet.id)
  fs.mkdirSync(outDir, { recursive: true })

  const sheetW = COLS * FRAME_W
  const sheetH = ROWS * FRAME_H
  const sheetData = new Uint8ClampedArray(sheetW * sheetH * 4)

  for (let rowIdx = 0; rowIdx < ROW_SPECS.length; rowIdx++) {
    const row = ROW_SPECS[rowIdx]
    for (let col = 0; col < row.frames; col++) {
      const frame = renderPetFrame(pet, row.dir, row.action, col)
      const destX0 = col * FRAME_W
      const destY0 = rowIdx * FRAME_H
      for (let y = 0; y < BASE_H; y++) {
        for (let x = 0; x < BASE_W; x++) {
          const sIdx = (y * BASE_W + x) * 4
          const aVal = frame.data[sIdx + 3]
          if (aVal === 0) continue
          const rVal = frame.data[sIdx]
          const gVal = frame.data[sIdx + 1]
          const bVal = frame.data[sIdx + 2]
          for (let sy = 0; sy < SCALE; sy++) {
            for (let sx = 0; sx < SCALE; sx++) {
              const px = destX0 + x * SCALE + sx
              const py = destY0 + y * SCALE + sy
              const dIdx = (py * sheetW + px) * 4
              sheetData[dIdx] = rVal
              sheetData[dIdx + 1] = gVal
              sheetData[dIdx + 2] = bVal
              sheetData[dIdx + 3] = aVal
            }
          }
        }
      }
    }
  }

  fs.writeFileSync(path.join(outDir, 'sheet.png'), encodeRgbaPng(sheetW, sheetH, sheetData))

  const preview = renderPetFrame(pet, 'down', 'idle', 0)
  const portData = new Uint8ClampedArray(FRAME_W * FRAME_H * 4)
  for (let y = 0; y < BASE_H; y++) {
    for (let x = 0; x < BASE_W; x++) {
      const sIdx = (y * BASE_W + x) * 4
      const aVal = preview.data[sIdx + 3]
      if (aVal === 0) continue
      for (let sy = 0; sy < SCALE; sy++) {
        for (let sx = 0; sx < SCALE; sx++) {
          const px = x * SCALE + sx
          const py = y * SCALE + sy
          const dIdx = (py * FRAME_W + px) * 4
          portData[dIdx] = preview.data[sIdx]
          portData[dIdx + 1] = preview.data[sIdx + 1]
          portData[dIdx + 2] = preview.data[sIdx + 2]
          portData[dIdx + 3] = aVal
        }
      }
    }
  }
  fs.writeFileSync(path.join(outDir, 'portrait.png'), encodeRgbaPng(FRAME_W, FRAME_H, portData))
}

for (const pet of COMBAT_PETS) {
  generatePetSheet(pet)
}
console.log(`Generated ${COMBAT_PETS.length} unique pet sprite sheets & portraits (${COLS * FRAME_W}x${ROWS * FRAME_H}px each).`)
