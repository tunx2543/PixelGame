import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { MOUNT_DEFS, type MountArchetype, type MountDef } from '../lib/game/mounts'

/**
 * Generates uniform-frame 2D Fantasy MMORPG sprite sheets for all 5 mounts:
 *   Raster grid: 112 x 96 px (2x supersampled -> 224 x 192 px per frame, hdScale = 4 -> 56x48 world units)
 *   Grid: 6 columns x 15 rows = 1344 x 2880 px
 *   Rows:
 *     0: idle_down (4F)       1: idle_right (4F)       2: idle_up (4F)
 *     3: walk_down (6F)       4: walk_right (6F)       5: walk_up (6F)
 *     6: run_down (6F)        7: run_right (6F)        8: run_up (6F)
 *     9: mount_down (4F)     10: mount_right (4F)     11: mount_up (4F)
 *    12: dismount_down (4F)  13: dismount_right (4F)  14: dismount_up (4F)
 */

const BASE_W = 112
const BASE_H = 96
const SCALE = 2
const FRAME_W = BASE_W * SCALE // 224
const FRAME_H = BASE_H * SCALE // 192
const COLS = 6
const ROWS = 15

type Dir3 = 'down' | 'right' | 'up'
type RowAction = 'idle' | 'walk' | 'run' | 'mount' | 'dismount'

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
  { action: 'mount', dir: 'down', frames: 4 },
  { action: 'mount', dir: 'right', frames: 4 },
  { action: 'mount', dir: 'up', frames: 4 },
  { action: 'dismount', dir: 'down', frames: 4 },
  { action: 'dismount', dir: 'right', frames: 4 },
  { action: 'dismount', dir: 'up', frames: 4 },
]

const OUTLINE_HEX = '#1a1224'

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
  return [
    Number.isFinite(r) ? r : 128,
    Number.isFinite(g) ? g : 128,
    Number.isFinite(b) ? b : 128,
    alpha,
  ]
}

function shadeHex(hex: string, amt: number): string {
  const [r, g, b] = hexToRgba(hex)
  const adj = (c: number) =>
    Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)))
  return `#${[adj(r), adj(g), adj(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

function blendRgba(dst: RGBA, src: RGBA): RGBA {
  const sa = src[3] / 255
  const da = dst[3] / 255
  const outA = sa + da * (1 - sa)
  if (outA <= 0) return [0, 0, 0, 0]
  const r = Math.round((src[0] * sa + dst[0] * da * (1 - sa)) / outA)
  const g = Math.round((src[1] * sa + dst[1] * da * (1 - sa)) / outA)
  const b = Math.round((src[2] * sa + dst[2] * da * (1 - sa)) / outA)
  return [r, g, b, Math.round(outA * 255)]
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
      if (markOutline && rgba[3] >= 160) this.outlineMask[iy * this.w + ix] = 1
    }
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
    markOutline = true,
  ) {
    const cBase = hexToRgba(baseColor)
    const cHi = hexToRgba(hiColor)
    const cDark = hexToRgba(darkColor)
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
          const light = -dy * 0.65 - dx * 0.28
          const col = light > 0.25 ? cHi : light < -0.24 ? cDark : cBase
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

  taperedCapsule(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
    color: string,
    alpha = 255,
    markOutline = true,
  ) {
    const rgba = hexToRgba(color, alpha)
    const maxR = Math.max(r0, r1)
    const minX = Math.floor(Math.min(x0, x1) - maxR - 1)
    const maxX = Math.ceil(Math.max(x0, x1) + maxR + 1)
    const minY = Math.floor(Math.min(y0, y1) - maxR - 1)
    const maxY = Math.ceil(Math.max(y0, y1) + maxR + 1)
    const vx = x1 - x0
    const vy = y1 - y0
    const len2 = vx * vx + vy * vy || 1
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const t = Math.max(0, Math.min(1, ((x - x0) * vx + (y - y0) * vy) / len2))
        const px = x0 + vx * t
        const py = y0 + vy * t
        const rad = r0 + (r1 - r0) * t
        if ((x - px) ** 2 + (y - py) ** 2 <= rad * rad) {
          this.plot(x, y, rgba, markOutline)
        }
      }
    }
  }

  capsule(x0: number, y0: number, x1: number, y1: number, radius: number, color: string, alpha = 255, markOutline = true) {
    this.taperedCapsule(x0, y0, radius, x1, y1, radius, color, alpha, markOutline)
  }

  polygon(pts: Array<[number, number]>, color: string, alpha = 255, markOutline = true) {
    if (pts.length < 3) return
    const rgba = hexToRgba(color, alpha)
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    const minX = Math.floor(Math.min(...xs))
    const maxX = Math.ceil(Math.max(...xs))
    const minY = Math.floor(Math.min(...ys))
    const maxY = Math.ceil(Math.max(...ys))
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        let inside = false
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const xi = pts[i][0]
          const yi = pts[i][1]
          const xj = pts[j][0]
          const yj = pts[j][1]
          const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-6) + xi
          if (intersect) inside = !inside
        }
        if (inside) this.plot(x, y, rgba, markOutline)
      }
    }
  }

  applyOutline(outlineColor = OUTLINE_HEX) {
    const out = hexToRgba(outlineColor)
    const copy = new Uint8Array(this.outlineMask)
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const p = y * this.w + x
        if (copy[p]) continue
        const neighbor =
          (x > 0 && copy[p - 1]) ||
          (x + 1 < this.w && copy[p + 1]) ||
          (y > 0 && copy[p - this.w]) ||
          (y + 1 < this.h && copy[p + this.w])
        if (neighbor) {
          const idx = p * 4
          if (this.data[idx + 3] < 200) {
            this.data[idx] = out[0]
            this.data[idx + 1] = out[1]
            this.data[idx + 2] = out[2]
            this.data[idx + 3] = 255
          }
        }
      }
    }
  }
}

interface MotionPose {
  bobY: number
  leanY: number
  headBob: number
  strideF: number
  strideB: number
  wingFlap: number
  tailWag: number
  crouch: number
  speedStreaks: boolean
}

function computePose(action: RowAction, f: number, flying: boolean): MotionPose {
  if (action === 'idle') {
    const s = Math.sin((f / 4) * Math.PI * 2)
    return {
      bobY: flying ? Math.round(s * 2) - 3 : f === 1 || f === 2 ? -1 : 0,
      leanY: 0,
      headBob: f === 2 ? -1 : 0,
      strideF: 0,
      strideB: 0,
      wingFlap: [-2, 3, 5, 1][f % 4],
      tailWag: [-2, 0, 2, 1][f % 4],
      crouch: 0,
      speedStreaks: false,
    }
  }
  if (action === 'walk') {
    const ph = (f / 6) * Math.PI * 2
    return {
      bobY: flying ? Math.round(Math.sin(ph) * 2.5) - 4 : [-1, -2, 0, 1, -2, 0][f % 6],
      leanY: [-0.5, -1, 0, 0.5, -1, 0][f % 6],
      headBob: [-1, 0, 1, 0, -1, 0][f % 6],
      strideF: Math.sin(ph) * 7,
      strideB: -Math.sin(ph) * 6,
      wingFlap: [-7, -2, 5, 8, 3, -3][f % 6],
      tailWag: Math.cos(ph) * 3,
      crouch: 0,
      speedStreaks: false,
    }
  }
  if (action === 'run') {
    const ph = (f / 6) * Math.PI * 2
    return {
      bobY: flying ? Math.round(Math.sin(ph) * 3.5) - 6 : [-3, -4, -1, 1, -3, -1][f % 6],
      leanY: [-2, -2, -1, 0, -2, -1][f % 6],
      headBob: [-2, -1, 1, 0, -2, 0][f % 6],
      strideF: Math.sin(ph) * 12,
      strideB: Math.sin(ph + Math.PI * 0.75) * 12,
      wingFlap: [-11, -3, 7, 11, 4, -6][f % 6],
      tailWag: Math.sin(ph) * 5,
      crouch: 1,
      speedStreaks: true,
    }
  }
  if (action === 'mount') {
    const seq = [
      { bobY: 2, crouch: 4, headBob: 2, wf: -3, rear: 1 },
      { bobY: 4, crouch: 6, headBob: 3, wf: 2, rear: 2 },
      { bobY: 1, crouch: 2, headBob: 0, wf: 5, rear: 0 },
      { bobY: -2, crouch: 0, headBob: -2, wf: -1, rear: -1 },
    ][f % 4]
    return {
      bobY: (flying ? -2 : 0) + seq.bobY,
      leanY: seq.rear,
      headBob: seq.headBob,
      strideF: seq.crouch * 0.6,
      strideB: -seq.crouch * 0.6,
      wingFlap: seq.wf,
      tailWag: seq.crouch,
      crouch: seq.crouch,
      speedStreaks: false,
    }
  }
  const seq = [
    { bobY: -1, crouch: 1, headBob: -1, wf: 4, rear: -1 },
    { bobY: 3, crouch: 5, headBob: 2, wf: 1, rear: 1 },
    { bobY: 4, crouch: 4, headBob: 2, wf: -2, rear: 1 },
    { bobY: 0, crouch: 0, headBob: 0, wf: 0, rear: 0 },
  ][f % 4]
  return {
    bobY: (flying ? -1 : 0) + seq.bobY,
    leanY: seq.rear,
    headBob: seq.headBob,
    strideF: seq.crouch * 0.4,
    strideB: -seq.crouch * 0.4,
    wingFlap: seq.wf,
    tailWag: -seq.crouch,
    crouch: seq.crouch,
    speedStreaks: false,
  }
}

function drawAnimeEyePx(r: RasterCanvas, ex: number, ey: number, iris: string, size = 2.4) {
  r.ellipse(ex, ey, size * 0.9, size * 1.05, '#ffffff', 255, false)
  r.ellipse(ex + 0.3, ey, size * 0.62, size * 0.82, iris, 255, false)
  r.plot(ex - 0.3, ey - 0.8, [255, 255, 255, 255], false)
  r.capsule(ex - size, ey - size, ex + size, ey - size * 0.65, 0.7, OUTLINE_HEX, 255, false)
}

/** Articulated quadruped limb with shoulder bulge, knee/hock bend, and hoof/paw/talon */
function drawArticulatedLeg(
  r: RasterCanvas,
  hipX: number,
  hipY: number,
  footX: number,
  footY: number,
  arch: MountArchetype,
  isFront: boolean,
  isFar: boolean,
  coatCol: string,
  darkCol: string,
  accCol: string,
) {
  const c = isFar ? darkCol : coatCol
  const kneeBend = isFront ? 2.5 : -3.5
  const kneeX = (hipX + footX) / 2 + kneeBend
  const kneeY = (hipY + footY) / 2
  const thighR = isFront ? 3.5 : 4.0
  const kneeR = 2.5
  const ankleR = 1.9

  r.taperedCapsule(hipX, hipY, thighR, kneeX, kneeY, kneeR, c)
  r.taperedCapsule(kneeX, kneeY, kneeR, footX, footY - 1, ankleR, c)

  if (arch === 'warhorse') {
    r.polygon(
      [
        [footX - 2.2, footY - 2],
        [footX + 2.6, footY - 2],
        [footX + 3.0, footY + 1],
        [footX - 2.0, footY + 1],
      ],
      isFar ? '#18181b' : '#27272a',
    )
  } else if (arch === 'direwolf') {
    r.ellipse(footX + 0.8, footY, 3.0, 1.9, isFar ? '#94a3b8' : '#e2e8f0')
    r.plot(footX + 3.5, footY + 0.5, hexToRgba('#ffffff'), false)
  } else if (arch === 'griffin') {
    const col = isFront ? (isFar ? '#d97706' : '#fbbf24') : c
    r.ellipse(footX + 0.8, footY, 3.0, 2.0, col)
    if (isFront) {
      r.taperedCapsule(footX + 1.5, footY, 1.1, footX + 4.2, footY + 1, 0.4, '#fef08a')
    }
  } else if (arch === 'kirin') {
    r.ellipse(footX + 0.8, footY, 2.8, 1.9, isFar ? shadeHex(accCol, -0.25) : accCol)
    r.taperedCapsule(footX - 1.5, kneeY + 1, 1.2, footX - 4, kneeY + 3, 0.4, accCol)
  } else {
    // Dragon clawed foot
    const clawCol = isFar ? '#5eead4' : '#f0abfc'
    r.ellipse(footX + 0.6, footY, 3.2, 2.0, c)
    r.taperedCapsule(footX + 1.8, footY, 1.0, footX + 4.5, footY + 0.8, 0.3, clawCol)
  }
}

function drawSaddleAndHarness(
  r: RasterCanvas,
  dir: Dir3,
  cx: number,
  topY: number,
  mount: MountDef,
  leanY = 0,
) {
  const sad = mount.colors.saddle
  const sadHi = shadeHex(sad, 0.28)
  const sadDark = shadeHex(sad, -0.3)
  const gold = '#f6c445'
  const acc = mount.colors.accent

  if (dir === 'right') {
    r.polygon(
      [
        [cx - 13, topY + 1 + leanY],
        [cx + 10, topY + 1 + leanY],
        [cx + 11, topY + 11 + leanY],
        [cx - 14, topY + 10 + leanY],
      ],
      sadDark,
    )
    r.polygon(
      [
        [cx - 11, topY + 1 + leanY],
        [cx + 8, topY + 1 + leanY],
        [cx + 9, topY + 9 + leanY],
        [cx - 12, topY + 8 + leanY],
      ],
      sad,
    )
    r.capsule(cx - 11, topY + 8 + leanY, cx + 9, topY + 9 + leanY, 0.9, gold)
    // Saddle seat & pommel/cantle
    r.shadedEllipse(cx - 2, topY + leanY, 9.5, 3.5, sad, sadHi, sadDark)
    r.ellipse(cx - 9, topY - 1.8 + leanY, 3, 2.4, sadHi)
    r.ellipse(cx + 6, topY - 1 + leanY, 2.5, 2, gold)
    // Chest harness strap
    r.capsule(cx + 5, topY + 3 + leanY, cx + 13, topY + 11 + leanY, 1.1, sadDark)
    r.ellipse(cx + 11, topY + 8 + leanY, 1.6, 1.6, acc)
    // Stirrup
    r.capsule(cx - 2, topY + 3 + leanY, cx - 2, topY + 11 + leanY, 0.8, '#5a3b28')
    r.rect(cx - 3.5, topY + 10 + leanY, 3, 2.4, gold)
  } else {
    r.shadedEllipse(cx, topY + 1 + leanY, 12.5, 4.5, sad, sadHi, sadDark)
    r.rect(cx - 10, topY + 2 + leanY, 20, 2.5, gold)
    r.ellipse(cx, topY + 3 + leanY, 2.2, 2.2, acc)
    if (dir === 'down') r.ellipse(cx, topY - 1.5 + leanY, 6, 2.4, sadHi)
  }
}

/** Graceful pointed feathered wing that sweeps UP and BACK clear of the rider saddle */
function drawFeatheredWing(
  r: RasterCanvas,
  ox: number,
  oy: number,
  spanX: number,
  flapY: number,
  dirSign: number,
  primary: string,
  tipColor: string,
  darkColor: string,
  backLayer = false,
) {
  const cMain = backLayer ? darkColor : primary
  const cHi = backLayer ? primary : shadeHex(primary, 0.35)
  const cTip = backLayer ? shadeHex(tipColor, -0.18) : tipColor

  const elbowX = ox + dirSign * (spanX * 0.42)
  const elbowY = oy - 16 + flapY * 0.65
  const tipX = ox + dirSign * spanX
  const tipY = oy - 22 + flapY

  // Swept graceful curved leading wing silhouette
  r.polygon(
    [
      [ox, oy],
      [elbowX, elbowY],
      [tipX, tipY],
      [tipX - dirSign * 6, tipY + 8],
      [elbowX + dirSign * 3, elbowY + 14],
      [ox - dirSign * 2, oy + 5],
    ],
    cMain,
  )
  // Upper feathered edge
  r.taperedCapsule(ox, oy, 2.4, elbowX, elbowY, 2.0, cHi)
  r.taperedCapsule(elbowX, elbowY, 2.0, tipX, tipY, 1.0, cHi)
  // Pointed primary feathers
  for (let i = 0; i < 4; i++) {
    const fFrac = 0.42 + i * 0.17
    const fx0 = ox + dirSign * spanX * fFrac
    const fy0 = oy - 18 * fFrac + flapY * fFrac
    const fx1 = fx0 + dirSign * (5 - i)
    const fy1 = fy0 + 9 - i
    r.taperedCapsule(fx0, fy0, 1.8, fx1, fy1, 0.5, i % 2 === 0 ? cTip : cMain)
  }
}

/** Scalloped translucent fantasy dragon wing swept UP and BACK */
function drawDragonWing(
  r: RasterCanvas,
  ox: number,
  oy: number,
  spanX: number,
  flapY: number,
  dirSign: number,
  membrane: string,
  rib: string,
  edge: string,
  backLayer = false,
) {
  const memAlpha = backLayer ? 190 : 220
  const crestX = ox + dirSign * (spanX * 0.48)
  const crestY = oy - 22 + flapY * 0.72
  const tipX = ox + dirSign * spanX
  const tipY = oy - 24 + flapY
  const midX = ox + dirSign * (spanX * 0.72)
  const midY = oy - 7 + flapY * 0.45
  const innerX = ox + dirSign * (spanX * 0.36)
  const innerY = oy - 1 + flapY * 0.2

  r.polygon(
    [
      [ox, oy],
      [crestX, crestY],
      [tipX, tipY],
      [midX, midY],
      [innerX, innerY],
      [ox, oy + 3],
    ],
    backLayer ? shadeHex(membrane, -0.25) : membrane,
    memAlpha,
  )
  r.polygon(
    [
      [ox + dirSign * 3, oy - 1],
      [crestX, crestY + 3],
      [tipX - dirSign * 5, tipY + 4],
      [midX - dirSign * 2, midY - 2],
    ],
    edge,
    backLayer ? 85 : 135,
    false,
  )
  // Tapered wing bone + finger spars
  r.taperedCapsule(ox, oy, 2.0, crestX, crestY, 1.6, rib)
  r.taperedCapsule(crestX, crestY, 1.5, tipX, tipY, 0.6, rib)
  r.taperedCapsule(crestX, crestY, 1.3, midX, midY, 0.5, rib)
  r.taperedCapsule(crestX, crestY, 1.2, innerX, innerY, 0.5, rib)
  r.ellipse(crestX, crestY, 1.6, 1.6, '#ffffff')
}

function renderMountFrame(mount: MountDef, dir: Dir3, action: RowAction, frameIdx: number): RasterCanvas {
  const r = new RasterCanvas(BASE_W, BASE_H)
  const pose = computePose(action, frameIdx, mount.flying)
  const cx = BASE_W / 2
  const footY = 85 + pose.crouch

  const c1 = mount.colors.primary
  const c2 = mount.colors.secondary
  const acc = mount.colors.accent
  const hi = shadeHex(c1, 0.34)
  const dark = shadeHex(c2, -0.22)

  // Speed streaks behind mount during Run
  if (pose.speedStreaks) {
    const streakCol = mount.auraColor ?? acc
    if (dir === 'right') {
      r.taperedCapsule(10, 48, 0.4, 28, 48, 1.3, streakCol, 175, false)
      r.taperedCapsule(6, 58, 0.4, 24, 58, 1.1, '#ffffff', 145, false)
      r.taperedCapsule(14, 68, 0.4, 30, 68, 1.1, streakCol, 155, false)
    } else {
      r.taperedCapsule(cx - 28, 50, 0.5, cx - 28, 66, 1.2, streakCol, 150, false)
      r.taperedCapsule(cx + 28, 50, 0.5, cx + 28, 66, 1.2, streakCol, 150, false)
    }
  }

  // Species ambient wisps (so rarity tiers read immediately)
  if (mount.archetype === 'cloud_dragon') {
    const cloudY = footY - 4 + pose.bobY * 0.4
    r.ellipse(cx - 18, cloudY, 9, 3.8, '#cffafe', 145, false)
    r.ellipse(cx + 18, cloudY - 1, 9, 3.8, '#f5d0fe', 140, false)
    r.ellipse(cx, cloudY + 1, 13, 3.5, '#99f6e4', 115, false)
  } else if (mount.archetype === 'kirin') {
    const sShift = (frameIdx % 3) * 2
    r.ellipse(cx - 23, 50 + pose.bobY - sShift, 1.8, 1.8, '#fde047', 210, false)
    r.ellipse(cx + 24, 44 + pose.bobY + sShift, 2.0, 2.0, '#38bdf8', 210, false)
  } else if (mount.archetype === 'direwolf') {
    r.ellipse(cx - 21, 68 + pose.bobY, 1.6, 1.6, '#bae6fd', 175, false)
    r.ellipse(cx + 22, 64 + pose.bobY, 1.5, 1.5, '#e0f2fe', 170, false)
  }

  if (dir === 'down' || dir === 'up') {
    renderFrontBack(r, mount, dir, pose, cx, footY, c1, c2, hi, dark, acc)
  } else {
    renderSideRight(r, mount, frameIdx, pose, cx, footY, c1, c2, hi, dark, acc)
  }

  r.applyOutline(OUTLINE_HEX)
  return r
}

function renderFrontBack(
  r: RasterCanvas,
  mount: MountDef,
  dir: 'down' | 'up',
  pose: MotionPose,
  cx: number,
  footY: number,
  c1: string,
  c2: string,
  hi: string,
  dark: string,
  acc: string,
) {
  const isFront = dir === 'down'
  const arch: MountArchetype = mount.archetype
  const by = 59 + pose.bobY

  // Flying wings behind
  if (mount.flying) {
    if (arch === 'cloud_dragon') {
      drawDragonWing(r, cx - 11, by - 5, 34, pose.wingFlap, -1, c1, '#f8fafc', acc, true)
      drawDragonWing(r, cx + 11, by - 5, 34, pose.wingFlap, 1, c1, '#f8fafc', acc, true)
    } else if (arch === 'griffin') {
      drawFeatheredWing(r, cx - 10, by - 5, 34, pose.wingFlap, -1, c1, '#fef9c3', c2, true)
      drawFeatheredWing(r, cx + 10, by - 5, 34, pose.wingFlap, 1, c1, '#fef9c3', c2, true)
    } else if (arch === 'kirin') {
      drawFeatheredWing(r, cx - 9, by - 4, 26, pose.wingFlap, -1, '#e9d5ff', acc, c2, true)
      drawFeatheredWing(r, cx + 9, by - 4, 26, pose.wingFlap, 1, '#e9d5ff', acc, c2, true)
    }
  }

  // Tail on Up view
  if (!isFront) {
    const wag = pose.tailWag
    if (arch === 'cloud_dragon') {
      r.taperedCapsule(cx, by + 6, 4.0, cx + wag * 1.4, by + 20, 2.2, c1)
      r.taperedCapsule(cx + wag * 1.4, by + 20, 2.2, cx + wag * 2.1, by + 11, 1.5, acc)
      r.ellipse(cx + wag * 2.1, by + 10, 3.8, 3.0, '#f0abfc')
    } else if (arch === 'direwolf') {
      r.shadedEllipse(cx + wag, by + 11, 5.2, 8, c1, '#f8fafc', c2)
      r.ellipse(cx + wag, by + 16, 3.5, 3.5, '#e0f2fe')
    } else if (arch === 'kirin') {
      r.taperedCapsule(cx, by + 5, 2.8, cx + wag, by + 18, 1.8, c2)
      r.ellipse(cx + wag, by + 19, 4.5, 3.8, acc)
    } else {
      r.taperedCapsule(cx, by + 4, 3.8, cx + wag, by + 19, 2.2, c2)
      r.ellipse(cx + wag, by + 18, 3.8, 4.5, dark)
    }
  }

  // 4 Articulated Legs
  const lLift = pose.strideF > 2 ? -3 : 0
  const rLift = pose.strideF < -2 ? -3 : 0
  drawArticulatedLeg(r, cx - 10, by + 6, cx - 11, footY - 2 + rLift, arch, false, true, c1, dark, acc)
  drawArticulatedLeg(r, cx + 10, by + 6, cx + 11, footY - 2 + lLift, arch, false, true, c1, dark, acc)
  drawArticulatedLeg(r, cx - 7, by + 7, cx - 8, footY + lLift, arch, true, false, c1, dark, acc)
  drawArticulatedLeg(r, cx + 7, by + 7, cx + 8, footY + rLift, arch, true, false, c1, dark, acc)

  // Chest & Barrel Torso
  const bodyW = arch === 'direwolf' ? 14.5 : arch === 'cloud_dragon' ? 13.5 : 13.5
  r.shadedEllipse(cx, by + 2, bodyW, 11.5, c1, hi, dark)
  if (arch === 'direwolf') {
    r.shadedEllipse(cx, by - 1, 12, 7.5, '#e2e8f0', '#ffffff', '#94a3b8')
  } else if (arch === 'griffin') {
    r.shadedEllipse(cx, by, 11, 7.5, '#fef3c7', '#ffffff', '#fde68a')
  } else if (arch === 'cloud_dragon') {
    r.shadedEllipse(cx, by + 3, 8, 8, '#fef08a', '#ffffff', '#5eead4')
  } else if (arch === 'kirin') {
    r.shadedEllipse(cx, by + 2, 9, 7, '#e9d5ff', '#ffffff', acc)
  }

  // Saddle
  drawSaddleAndHarness(r, dir, cx, by - 9, mount, pose.leanY)

  // Neck & Head
  const hy = by - 19 + pose.headBob
  if (isFront) {
    r.taperedCapsule(cx, by - 2, 7.5, cx, hy + 5, 6.2, c1)
    if (arch === 'warhorse') {
      r.ellipse(cx - 6, hy - 3, 2.8, 7, c2)
      r.shadedEllipse(cx, hy, 8.8, 8.8, c1, hi, dark)
      r.shadedEllipse(cx, hy + 4.5, 6, 4.2, hi, '#fde68a', c1)
      r.polygon([[cx - 6, hy - 6], [cx - 8.5, hy - 14], [cx - 2.5, hy - 9]], c2)
      r.polygon([[cx + 6, hy - 6], [cx + 8.5, hy - 14], [cx + 2.5, hy - 9]], c2)
      r.rect(cx - 1.5, hy - 8, 3, 5, acc)
      drawAnimeEyePx(r, cx - 4.2, hy - 1, '#3b2416', 2.2)
      drawAnimeEyePx(r, cx + 4.2, hy - 1, '#3b2416', 2.2)
      r.capsule(cx - 5.5, hy + 4, cx + 5.5, hy + 4, 0.9, '#f6c445')
    } else if (arch === 'direwolf') {
      r.shadedEllipse(cx, hy - 1, 10.5, 8.8, c1, '#e2e8f0', c2)
      r.polygon([[cx - 8, hy - 5], [cx - 12, hy - 16], [cx - 2.5, hy - 9]], c2)
      r.polygon([[cx + 8, hy - 5], [cx + 12, hy - 16], [cx + 2.5, hy - 9]], c2)
      r.polygon([[cx - 6, hy - 6], [cx - 9, hy - 12], [cx - 3.5, hy - 8.5]], '#bae6fd')
      r.polygon([[cx + 6, hy - 6], [cx + 9, hy - 12], [cx + 3.5, hy - 8.5]], '#bae6fd')
      r.shadedEllipse(cx, hy + 4, 6.2, 4.2, '#e2e8f0', '#ffffff', '#94a3b8')
      r.ellipse(cx, hy + 2, 2.2, 1.6, '#0f172a')
      r.polygon([[cx - 3.5, hy + 5.5], [cx - 2.6, hy + 9], [cx - 1.7, hy + 5.5]], '#ffffff')
      r.polygon([[cx + 3.5, hy + 5.5], [cx + 2.6, hy + 9], [cx + 1.7, hy + 5.5]], '#ffffff')
      drawAnimeEyePx(r, cx - 4.5, hy - 2, acc, 2.3)
      drawAnimeEyePx(r, cx + 4.5, hy - 2, acc, 2.3)
    } else if (arch === 'griffin') {
      r.shadedEllipse(cx, hy, 9.5, 8.8, '#f8fafc', '#ffffff', '#cbd5e1')
      r.polygon([[cx - 5, hy - 6], [cx - 10, hy - 14], [cx - 1.5, hy - 8]], acc)
      r.polygon([[cx + 5, hy - 6], [cx + 10, hy - 14], [cx + 1.5, hy - 8]], acc)
      r.polygon([[cx - 1.5, hy - 7], [cx, hy - 15], [cx + 2, hy - 8]], '#f59e0b')
      r.polygon([[cx - 3.5, hy + 2], [cx + 3.5, hy + 2], [cx, hy + 8.5]], '#f59e0b')
      r.polygon([[cx - 1.8, hy + 2], [cx + 1.8, hy + 2], [cx, hy + 5.5]], '#fef08a')
      drawAnimeEyePx(r, cx - 4.2, hy - 1, '#d97706', 2.2)
      drawAnimeEyePx(r, cx + 4.2, hy - 1, '#d97706', 2.2)
    } else if (arch === 'kirin') {
      // Tapered curved crystal antlers
      r.taperedCapsule(cx - 3.5, hy - 6, 1.6, cx - 9, hy - 14, 1.0, acc)
      r.taperedCapsule(cx - 9, hy - 14, 1.0, cx - 12, hy - 21, 0.3, '#ffffff')
      r.taperedCapsule(cx - 7, hy - 12, 0.9, cx - 4, hy - 18, 0.3, acc)
      r.taperedCapsule(cx + 3.5, hy - 6, 1.6, cx + 9, hy - 14, 1.0, acc)
      r.taperedCapsule(cx + 9, hy - 14, 1.0, cx + 12, hy - 21, 0.3, '#ffffff')
      r.taperedCapsule(cx + 7, hy - 12, 0.9, cx + 4, hy - 18, 0.3, acc)
      r.shadedEllipse(cx, hy, 9, 8.5, c1, hi, dark)
      r.shadedEllipse(cx, hy + 4, 5.8, 3.8, '#e9d5ff', '#ffffff', c1)
      r.ellipse(cx, hy - 6, 2.2, 2.2, '#fde047')
      drawAnimeEyePx(r, cx - 4.2, hy - 1, acc, 2.2)
      drawAnimeEyePx(r, cx + 4.2, hy - 1, acc, 2.2)
    } else {
      // Cloud Dragon front
      r.taperedCapsule(cx - 4, hy - 6, 1.8, cx - 11, hy - 19, 0.4, '#fef08a')
      r.taperedCapsule(cx + 4, hy - 6, 1.8, cx + 11, hy - 19, 0.4, '#fef08a')
      r.shadedEllipse(cx, hy, 10.5, 8.5, c1, '#ccfbf1', c2)
      r.shadedEllipse(cx, hy + 4, 7, 4.2, '#99f6e4', '#ffffff', c1)
      r.taperedCapsule(cx - 6, hy + 4, 1.1, cx - 17, hy, 0.3, '#f0abfc')
      r.taperedCapsule(cx + 6, hy + 4, 1.1, cx + 17, hy, 0.3, '#f0abfc')
      r.ellipse(cx, hy - 5, 2.4, 2.4, '#f0abfc')
      drawAnimeEyePx(r, cx - 4.4, hy - 1, '#fbbf24', 2.3)
      drawAnimeEyePx(r, cx + 4.4, hy - 1, '#fbbf24', 2.3)
    }
  } else {
    r.shadedEllipse(cx, hy + 2, 8.5, 8, c1, hi, dark)
    if (arch === 'warhorse') {
      r.polygon([[cx - 5.5, hy - 4], [cx - 8, hy - 12], [cx - 2, hy - 6]], c2)
      r.polygon([[cx + 5.5, hy - 4], [cx + 8, hy - 12], [cx + 2, hy - 6]], c2)
      r.taperedCapsule(cx, hy - 3, 3.2, cx, by - 2, 3.8, c2)
    } else if (arch === 'direwolf') {
      r.polygon([[cx - 7.5, hy - 4], [cx - 11, hy - 14], [cx - 2.5, hy - 7]], c2)
      r.polygon([[cx + 7.5, hy - 4], [cx + 11, hy - 14], [cx + 2.5, hy - 7]], c2)
      r.ellipse(cx, hy + 1, 9, 5, '#cbd5e1')
    } else if (arch === 'griffin') {
      r.shadedEllipse(cx, hy + 1, 8.5, 7.5, '#f8fafc', '#ffffff', '#cbd5e1')
      r.polygon([[cx - 4.5, hy - 5], [cx - 9, hy - 13], [cx - 1, hy - 6]], acc)
      r.polygon([[cx + 4.5, hy - 5], [cx + 9, hy - 13], [cx + 1, hy - 6]], acc)
    } else if (arch === 'kirin') {
      r.taperedCapsule(cx - 3.5, hy - 5, 1.5, cx - 10, hy - 18, 0.3, acc)
      r.taperedCapsule(cx + 3.5, hy - 5, 1.5, cx + 10, hy - 18, 0.3, acc)
      r.capsule(cx, hy - 2, cx, by - 2, 3.0, acc)
    } else {
      r.taperedCapsule(cx - 4, hy - 5, 1.7, cx - 11, hy - 18, 0.3, '#fef08a')
      r.taperedCapsule(cx + 4, hy - 5, 1.7, cx + 11, hy - 18, 0.3, '#fef08a')
      r.capsule(cx, hy - 3, cx, by + 2, 2.5, '#f0abfc')
    }
  }
}

function renderSideRight(
  r: RasterCanvas,
  mount: MountDef,
  frameIdx: number,
  pose: MotionPose,
  cx: number,
  footY: number,
  c1: string,
  c2: string,
  hi: string,
  dark: string,
  acc: string,
) {
  const arch: MountArchetype = mount.archetype
  const by = 60 + pose.bobY

  // 1. Far Wing (swept UP & BACK from front shoulder, clear above & behind saddle)
  if (mount.flying) {
    if (arch === 'cloud_dragon') {
      drawDragonWing(r, cx + 3, by - 9, 28, pose.wingFlap - 2, -1, c1, '#f8fafc', acc, true)
    } else if (arch === 'griffin') {
      drawFeatheredWing(r, cx + 3, by - 9, 30, pose.wingFlap - 2, -1, c1, '#fef9c3', c2, true)
    } else if (arch === 'kirin') {
      drawFeatheredWing(r, cx + 2, by - 8, 24, pose.wingFlap - 2, -1, '#e9d5ff', acc, c2, true)
    }
  }

  // 2. Tail
  const tw = pose.tailWag
  if (arch === 'cloud_dragon') {
    r.taperedCapsule(cx - 15, by + 1, 5.2, cx - 29, by - 2 + tw, 3.4, c1)
    r.taperedCapsule(cx - 29, by - 2 + tw, 3.2, cx - 42, by - 13 + tw * 1.2, 1.5, acc)
    r.ellipse(cx - 43, by - 14 + tw * 1.2, 4.5, 2.8, '#f0abfc')
    for (let i = 0; i < 4; i++) {
      r.polygon(
        [
          [cx - 17 - i * 5, by - 2 + tw * (i * 0.25)],
          [cx - 19 - i * 5, by - 7 + tw * (i * 0.25)],
          [cx - 14 - i * 5, by - 1 + tw * (i * 0.25)],
        ],
        '#f0abfc',
      )
    }
  } else if (arch === 'kirin') {
    r.taperedCapsule(cx - 15, by, 3.0, cx - 29, by - 5 + tw, 1.8, c2)
    r.shadedEllipse(cx - 32, by - 6 + tw, 6, 4, acc, '#ffffff', c1)
  } else if (arch === 'direwolf') {
    r.polygon(
      [
        [cx - 14, by + 1],
        [cx - 29, by - 7 + tw],
        [cx - 37, by - 4 + tw],
        [cx - 27, by + 5 + tw],
      ],
      c1,
    )
    r.ellipse(cx - 34, by - 5 + tw, 4.5, 3, '#e0f2fe')
  } else if (arch === 'griffin') {
    r.taperedCapsule(cx - 15, by + 2, 2.2, cx - 32, by + 5 + tw, 1.4, c2)
    r.ellipse(cx - 34, by + 5 + tw, 4.2, 3.2, '#78350f')
  } else {
    r.polygon(
      [
        [cx - 15, by - 1],
        [cx - 28, by + 2 + tw],
        [cx - 33, by + 13 + tw],
        [cx - 24, by + 14 + tw],
      ],
      c2,
    )
    r.taperedCapsule(cx - 18, by + 2, 2.4, cx - 30, by + 11 + tw, 1.4, dark)
  }

  // 3. Far Articulated Legs
  const fStride = pose.strideF
  const hStride = pose.strideB
  drawArticulatedLeg(r, cx - 10, by + 6, cx - 12 - hStride * 0.7, footY - 1, arch, false, true, c1, dark, acc)
  drawArticulatedLeg(r, cx + 10, by + 6, cx + 12 + fStride * 0.7, footY - 1, arch, true, true, c1, dark, acc)

  // 4. Muscular Side Body Barrel (sleeker proportions)
  const torsoLen = arch === 'cloud_dragon' ? 21 : arch === 'direwolf' ? 19 : 18.5
  const torsoH = arch === 'cloud_dragon' ? 9.5 : 10
  r.shadedEllipse(cx, by + 1 + pose.leanY * 0.4, torsoLen, torsoH, c1, hi, dark)
  if (arch === 'cloud_dragon') {
    r.shadedEllipse(cx + 1, by + 6 + pose.leanY * 0.4, 15, 4.2, '#fef08a', '#ffffff', '#5eead4')
  } else if (arch === 'kirin') {
    r.ellipse(cx, by + 5 + pose.leanY * 0.4, 14, 3.4, '#e9d5ff', 170, false)
  } else if (arch === 'direwolf') {
    r.shadedEllipse(cx + 8, by + pose.leanY * 0.4, 9.5, 8.5, '#cbd5e1', '#f8fafc', '#64748b')
  } else if (arch === 'griffin') {
    r.shadedEllipse(cx + 9, by + pose.leanY * 0.4, 9.5, 8.5, '#fef3c7', '#ffffff', '#eab308')
  }

  // 5. Near Articulated Legs
  drawArticulatedLeg(r, cx - 10, by + 6, cx - 12 + hStride, footY, arch, false, false, c1, dark, acc)
  drawArticulatedLeg(r, cx + 10, by + 6, cx + 12 - fStride, footY, arch, true, false, c1, dark, acc)

  // 6. Ornate Saddle (kept cleanly exposed for rider seat!)
  drawSaddleAndHarness(r, 'right', cx, by - 9.5, mount, pose.leanY)

  // 7. Neck & Archetype-Distinct Side Head (facing right)
  const hx = cx + 21
  const hy = by - 16 + pose.headBob + pose.leanY
  r.taperedCapsule(cx + 11, by - 2 + pose.leanY * 0.5, 6.8, hx - 2, hy + 4, 4.8, c1)

  if (arch === 'warhorse') {
    r.polygon(
      [
        [cx + 6, by - 6],
        [hx - 6, hy - 5],
        [hx - 1, hy - 1],
        [cx + 10, by - 2],
      ],
      c2,
    )
    r.shadedEllipse(hx + 2, hy, 8, 6.2, c1, hi, dark)
    r.shadedEllipse(hx + 9.5, hy + 3, 5.8, 3.8, hi, '#e7a977', c1)
    r.polygon([[hx - 2, hy - 4], [hx - 4, hy - 13], [hx + 3, hy - 6]], c2)
    r.polygon([[hx + 2, hy - 5], [hx + 1, hy - 12], [hx + 5.5, hy - 5]], c1)
    drawAnimeEyePx(r, hx + 4, hy - 1, '#3b2416', 2.2)
    r.ellipse(hx + 13.5, hy + 2, 1.3, 1.3, '#3b1f16')
    r.capsule(hx + 3, hy + 3.5, hx + 13, hy + 4.5, 0.9, '#f6c445')
  } else if (arch === 'direwolf') {
    r.polygon([[cx + 9, by - 6], [cx + 20, by + 5], [cx + 13, by + 10], [cx + 5, by + 2]], '#e2e8f0')
    r.shadedEllipse(hx + 2, hy + 1, 9.2, 7.5, c1, '#e2e8f0', c2)
    r.shadedEllipse(hx + 10.5, hy + 3, 6.5, 3.6, '#cbd5e1', '#f8fafc', '#64748b')
    r.polygon([[hx - 3, hy - 4], [hx - 7, hy - 15], [hx + 3, hy - 6]], c2)
    r.polygon([[hx + 1.5, hy - 4], [hx, hy - 13], [hx + 5.5, hy - 5]], '#bae6fd')
    r.ellipse(hx + 16, hy + 2, 2.0, 1.5, '#0f172a')
    r.polygon([[hx + 11, hy + 5.5], [hx + 12, hy + 9.2], [hx + 13.8, hy + 5.5]], '#ffffff')
    drawAnimeEyePx(r, hx + 5, hy - 1, acc, 2.2)
  } else if (arch === 'griffin') {
    r.shadedEllipse(hx + 2, hy, 8.5, 7.5, '#f8fafc', '#ffffff', '#cbd5e1')
    r.polygon([[hx - 1, hy - 5], [hx - 11, hy - 12], [hx + 2, hy - 7]], acc)
    r.polygon([[hx - 3, hy - 2], [hx - 11, hy - 6], [hx - 1, hy - 4]], '#f59e0b')
    r.polygon(
      [
        [hx + 7, hy - 1],
        [hx + 17, hy + 2],
        [hx + 15, hy + 6.5],
        [hx + 7, hy + 4.5],
      ],
      '#f59e0b',
    )
    r.polygon([[hx + 8, hy - 1], [hx + 15, hy + 1], [hx + 9, hy + 2.5]], '#fef08a')
    drawAnimeEyePx(r, hx + 4.5, hy - 1, '#d97706', 2.2)
  } else if (arch === 'kirin') {
    r.polygon([[cx + 6, by - 7], [hx - 5, hy - 5], [hx - 1, hy], [cx + 10, by - 1]], acc)
    // Graceful branching crystal antlers
    r.taperedCapsule(hx, hy - 5, 1.6, hx - 7, hy - 14, 1.0, acc)
    r.taperedCapsule(hx - 7, hy - 14, 1.0, hx - 12, hy - 22, 0.3, '#ffffff')
    r.taperedCapsule(hx - 5, hy - 12, 0.9, hx - 1, hy - 20, 0.3, '#ffffff')
    r.taperedCapsule(hx + 3, hy - 5, 1.4, hx - 1, hy - 17, 0.3, '#fde047')
    r.shadedEllipse(hx + 2, hy, 8.5, 6.8, c1, hi, dark)
    r.shadedEllipse(hx + 9.5, hy + 3, 5.8, 3.6, '#e9d5ff', '#ffffff', c1)
    r.ellipse(hx + 5.5, hy - 4.5, 1.8, 1.8, '#fde047')
    drawAnimeEyePx(r, hx + 4.5, hy - 1, acc, 2.2)
  } else {
    // Cloud Dragon serpentine neck, horns & flowing whiskers
    r.polygon([[cx + 6, by - 6], [hx - 5, hy - 4], [hx - 1, hy + 1], [cx + 10, by]], '#f0abfc')
    r.taperedCapsule(hx - 1, hy - 5, 1.8, hx - 12, hy - 20, 0.3, '#fef08a')
    r.taperedCapsule(hx + 3, hy - 5, 1.6, hx - 5, hy - 18, 0.3, '#ffffff')
    r.shadedEllipse(hx + 3, hy, 9.2, 7.2, c1, '#ccfbf1', c2)
    r.shadedEllipse(hx + 11.5, hy + 3, 6.5, 3.8, '#99f6e4', '#ffffff', c1)
    r.taperedCapsule(hx + 11, hy + 4.5, 1.1, hx + 22, hy - 1 + (frameIdx % 2), 0.3, '#f0abfc')
    r.taperedCapsule(hx + 9, hy + 5.5, 0.9, hx + 19, hy + 7.5 - (frameIdx % 2), 0.25, '#67e8f9')
    drawAnimeEyePx(r, hx + 5.5, hy - 1, '#fbbf24', 2.3)
  }

  // 8. Near Wing anchored cleanly BEHIND saddle shoulder sweeping UP & BACK (rider remains clear!)
  if (mount.flying) {
    if (arch === 'cloud_dragon') {
      drawDragonWing(r, cx - 3, by - 10, 27, pose.wingFlap, -1, c1, '#ffffff', '#f0abfc', false)
    } else if (arch === 'griffin') {
      drawFeatheredWing(r, cx - 3, by - 10, 29, pose.wingFlap, -1, c1, '#fef9c3', c2, false)
    } else if (arch === 'kirin') {
      drawFeatheredWing(r, cx - 3, by - 9, 23, pose.wingFlap, -1, '#c084fc', '#38bdf8', c2, false)
    }
  }
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
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function generateMountSheet(mount: MountDef) {
  const outDir = path.join(process.cwd(), 'public', 'assets', 'hd', 'mounts', mount.id)
  fs.mkdirSync(outDir, { recursive: true })

  const sheetW = COLS * FRAME_W
  const sheetH = ROWS * FRAME_H
  const sheetData = new Uint8ClampedArray(sheetW * sheetH * 4)

  for (let rowIdx = 0; rowIdx < ROW_SPECS.length; rowIdx++) {
    const row = ROW_SPECS[rowIdx]
    for (let col = 0; col < row.frames; col++) {
      const frame = renderMountFrame(mount, row.dir, row.action, col)
      const destX0 = col * FRAME_W
      const destY0 = rowIdx * FRAME_H
      for (let y = 0; y < BASE_H; y++) {
        for (let x = 0; x < BASE_W; x++) {
          const sIdx = (y * BASE_W + x) * 4
          const rVal = frame.data[sIdx]
          const gVal = frame.data[sIdx + 1]
          const bVal = frame.data[sIdx + 2]
          const aVal = frame.data[sIdx + 3]
          if (aVal === 0) continue
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

  const preview = renderMountFrame(mount, 'right', 'idle', 0)
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
  console.log(`Generated refined mount sheet: ${mount.id} (${sheetW}x${sheetH})`)
}

for (const mount of MOUNT_DEFS) {
  generateMountSheet(mount)
}
