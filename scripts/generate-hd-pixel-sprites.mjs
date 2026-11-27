#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const ROOT = process.cwd()
const CHAR_DIR = path.join(ROOT, 'public', 'assets', 'hd', 'characters')
const FASHION_LAYER_DIR = path.join(ROOT, 'public', 'assets', 'fashion', 'layers')
const FASHION_ICON_DIR = path.join(ROOT, 'public', 'assets', 'fashion', 'icons')

// Native 168 x 192 HD Pixel Art grid (1008 x 6144 atlases: 6 cols x 32 rows)
const FW = 168
const FH = 192
const COLS = 6
const ROWS = 32
const SHEET_W = FW * COLS // 1008
const SHEET_H = FH * ROWS // 6144

const ANIM_DEFS = [
  { name: 'idle', frames: 4, fps: 5 },
  { name: 'walk', frames: 6, fps: 10 },
  { name: 'run', frames: 6, fps: 14 },
  { name: 'attack', frames: 5, fps: 14 },
  { name: 'skill', frames: 6, fps: 12 },
  { name: 'hit', frames: 3, fps: 12 },
  { name: 'death', frames: 5, fps: 8 },
  { name: 'victory', frames: 5, fps: 10 },
]
const DIRS = ['down', 'up', 'left', 'right']

// ---------------- Pure Node Fast PNG RGBA Encoder ----------------
const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c >>> 0
}
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function pngChunk(type, data) {
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.concat([t, data])
  const crc = Buffer.allocUnsafe(4)
  crc.writeUInt32BE(crc32(crcBuf), 0)
  return Buffer.concat([len, t, data, crc])
}
function encodePngRgba(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.allocUnsafe((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const idat = zlib.deflateSync(raw, { level: 1 })
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}
function writePng(filePath, width, height, rgba) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, encodePngRgba(width, height, rgba))
}

// ---------------- Color & Pixel Ramp Cache ----------------
const hexCache = new Map()
function parseHex(hex) {
  if (Array.isArray(hex)) return hex
  let c = hexCache.get(hex)
  if (c) return c
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const a = clean.length === 8 ? parseInt(clean.slice(6, 8), 16) : 255
  c = [r, g, b, a]
  hexCache.set(hex, c)
  return c
}
function clampByte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : (v + 0.5) | 0
}
function shiftColor(hex, lDelta, coolShadow = true) {
  const [r, g, b, a] = parseHex(hex)
  if (lDelta < 0) {
    const t = Math.min(1, -lDelta)
    const sr = r * (1 - t) + (coolShadow ? 22 : 12) * t
    const sg = g * (1 - t) + (coolShadow ? 14 : 10) * t
    const sb = b * (1 - t) + (coolShadow ? 42 : 18) * t
    return [clampByte(sr), clampByte(sg), clampByte(sb), a]
  }
  const t = Math.min(1, lDelta)
  const hr = r + (255 - r) * t
  const hg = g + (250 - g) * t * 0.94
  const hb = b + (232 - b) * t * 0.84
  return [clampByte(hr), clampByte(hg), clampByte(hb), a]
}
const rampCache = new Map()
function makeRamp(baseHex) {
  let r = rampCache.get(baseHex)
  if (r) return r
  r = {
    deep: shiftColor(baseHex, -0.58),
    dark: shiftColor(baseHex, -0.32),
    mid: parseHex(baseHex),
    hi: shiftColor(baseHex, 0.28),
    spec: shiftColor(baseHex, 0.62),
  }
  rampCache.set(baseHex, r)
  return r
}

const INK = [20, 14, 28, 255] // Deep crisp #140e1c outline
const WHITE = [255, 255, 255, 255]

class PixelGrid {
  constructor(w = FW, h = FH) {
    this.w = w
    this.h = h
    this.buf = Buffer.alloc(w * h * 4)
    this.glowMask = new Uint8Array(w * h)
  }

  px(x, y, col, noOutline = false) {
    const ix = Math.round(x)
    const iy = Math.round(y)
    if (ix < 0 || ix >= this.w || iy < 0 || iy >= this.h) return
    const rgba = typeof col === 'string' ? parseHex(col) : col
    const a = rgba[3] ?? 255
    if (a <= 0) return
    const p = iy * this.w + ix
    const idx = p * 4
    const da = this.buf[idx + 3]
    if (a >= 255 || da === 0) {
      this.buf[idx] = rgba[0]
      this.buf[idx + 1] = rgba[1]
      this.buf[idx + 2] = rgba[2]
      this.buf[idx + 3] = a
    } else {
      const sa = a / 255
      const daf = da / 255
      const outA = sa + daf * (1 - sa)
      this.buf[idx] = clampByte((rgba[0] * sa + this.buf[idx] * daf * (1 - sa)) / outA)
      this.buf[idx + 1] = clampByte((rgba[1] * sa + this.buf[idx + 1] * daf * (1 - sa)) / outA)
      this.buf[idx + 2] = clampByte((rgba[2] * sa + this.buf[idx + 2] * daf * (1 - sa)) / outA)
      this.buf[idx + 3] = clampByte(outA * 255)
    }
    this.glowMask[p] = noOutline ? 1 : 0
  }

  rect(x, y, w, h, col, noOutline = false) {
    const x0 = Math.round(x)
    const y0 = Math.round(y)
    const iw = Math.round(w)
    const ih = Math.round(h)
    const rgba = typeof col === 'string' ? parseHex(col) : col
    for (let dy = 0; dy < ih; dy++) {
      for (let dx = 0; dx < iw; dx++) {
        this.px(x0 + dx, y0 + dy, rgba, noOutline)
      }
    }
  }

  shadedRect(x, y, w, h, ramp, opts = {}) {
    const x0 = Math.round(x)
    const y0 = Math.round(y)
    const iw = Math.round(w)
    const ih = Math.round(h)
    const flipLight = Boolean(opts.flipLight)
    const border = opts.border !== false
    for (let dy = 0; dy < ih; dy++) {
      for (let dx = 0; dx < iw; dx++) {
        const edgeX = flipLight ? iw - 1 - dx : dx
        let c = ramp.mid
        if (dy <= 1 || edgeX <= 1) c = ramp.hi
        if (dy >= ih - 2 || edgeX >= iw - 2) c = ramp.dark
        if (dy === 0 && edgeX <= 1 && iw >= 5 && ih >= 5) c = ramp.spec
        if (border && (dy === ih - 1 || edgeX === iw - 1)) c = ramp.deep
        if (opts.dither && ((dx + dy) & 1) === 0 && dy > 2 && dx > 2 && dy < ih - 2) {
          c = ramp.dark
        }
        this.px(x0 + dx, y0 + dy, c)
      }
    }
  }

  ellipse(cx, cy, rx, ry, colOrRamp, opts = {}) {
    const r = typeof colOrRamp === 'string' || Array.isArray(colOrRamp) ? null : colOrRamp
    const solid = r ? null : typeof colOrRamp === 'string' ? parseHex(colOrRamp) : colOrRamp
    const noOutline = Boolean(opts.noOutline)
    const minX = Math.max(0, Math.floor(cx - rx))
    const maxX = Math.min(this.w - 1, Math.ceil(cx + rx))
    const minY = Math.max(0, Math.floor(cy - ry))
    const maxY = Math.min(this.h - 1, Math.ceil(cy + ry))
    const irx = 1 / Math.max(0.5, rx)
    const iry = 1 / Math.max(0.5, ry)
    for (let y = minY; y <= maxY; y++) {
      const ny = (y - cy) * iry
      const ny2 = ny * ny
      for (let x = minX; x <= maxX; x++) {
        const nx = (x - cx) * irx
        const d = nx * nx + ny2
        if (d <= 1.0) {
          if (solid) {
            this.px(x, y, solid, noOutline)
          } else {
            const shadeVal = nx * 0.42 + ny * 0.62
            let c = r.mid
            if (d > 0.82 && shadeVal > 0.28) c = r.deep
            else if (shadeVal < -0.4) c = r.hi
            else if (shadeVal > 0.4) c = r.dark
            if (d < 0.16 && nx < 0 && ny < 0) c = r.spec
            this.px(x, y, c, noOutline)
          }
        }
      }
    }
  }

  line(x0, y0, x1, y1, col, thick = 1, noOutline = false) {
    let ix0 = Math.round(x0)
    let iy0 = Math.round(y0)
    const ix1 = Math.round(x1)
    const iy1 = Math.round(y1)
    const rgba = typeof col === 'string' ? parseHex(col) : col
    const dx = Math.abs(ix1 - ix0)
    const dy = Math.abs(iy1 - iy0)
    const sx = ix0 < ix1 ? 1 : -1
    const sy = iy0 < iy1 ? 1 : -1
    let err = dx - dy
    const r = Math.floor(thick / 2)
    while (true) {
      if (thick <= 1) {
        this.px(ix0, iy0, rgba, noOutline)
      } else {
        for (let oy = -r; oy <= thick - 1 - r; oy++) {
          for (let ox = -r; ox <= thick - 1 - r; ox++) {
            this.px(ix0 + ox, iy0 + oy, rgba, noOutline)
          }
        }
      }
      if (ix0 === ix1 && iy0 === iy1) break
      const e2 = 2 * err
      if (e2 > -dy) { err -= dy; ix0 += sx }
      if (e2 < dx) { err += dx; iy0 += sy }
    }
  }

  // Shaded thick limb/blade stroke with dark edge + highlight ridge
  limbLine(x0, y0, x1, y1, ramp, radius = 3) {
    const dx = x1 - x0
    const dy = y1 - y0
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const cx = x0 + dx * t
      const cy = y0 + dy * t
      this.ellipse(cx, cy, radius, radius, ramp)
    }
  }

  poly(points, colOrRamp, opts = {}) {
    if (points.length < 3) return
    let minX = this.w, maxX = 0, minY = this.h, maxY = 0
    for (const [px, py] of points) {
      if (px < minX) minX = Math.floor(px)
      if (px > maxX) maxX = Math.ceil(px)
      if (py < minY) minY = Math.floor(py)
      if (py > maxY) maxY = Math.ceil(py)
    }
    minX = Math.max(0, minX)
    maxX = Math.min(this.w - 1, maxX)
    minY = Math.max(0, minY)
    maxY = Math.min(this.h - 1, maxY)
    const r = typeof colOrRamp === 'string' || Array.isArray(colOrRamp) ? null : colOrRamp
    const solid = r ? null : typeof colOrRamp === 'string' ? parseHex(colOrRamp) : colOrRamp
    const noOutline = Boolean(opts.noOutline)
    const midX = (minX + maxX) / 2
    const midY = (minY + maxY) / 2
    const halfW = Math.max(1, (maxX - minX) / 2)
    const halfH = Math.max(1, (maxY - minY) / 2)
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        let inside = false
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [xi, yi] = points[i]
          const [xj, yj] = points[j]
          const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi)
          if (intersect) inside = !inside
        }
        if (inside) {
          if (solid) {
            this.px(x, y, solid, noOutline)
          } else {
            const nx = (x - midX) / halfW
            const ny = (y - midY) / halfH
            const s = nx * 0.4 + ny * 0.65
            this.px(x, y, s < -0.35 ? r.hi : s > 0.38 ? r.dark : r.mid, noOutline)
          }
        }
      }
    }
  }

  overlay(other) {
    const len = this.w * this.h
    for (let i = 0; i < len; i++) {
      const idx = i * 4
      const sa = other.buf[idx + 3]
      if (sa === 0) continue
      const da = this.buf[idx + 3]
      if (sa >= 255 || da === 0) {
        this.buf[idx] = other.buf[idx]
        this.buf[idx + 1] = other.buf[idx + 1]
        this.buf[idx + 2] = other.buf[idx + 2]
        this.buf[idx + 3] = sa
      } else {
        const s = sa / 255
        const d = da / 255
        const outA = s + d * (1 - s)
        this.buf[idx] = clampByte((other.buf[idx] * s + this.buf[idx] * d * (1 - s)) / outA)
        this.buf[idx + 1] = clampByte((other.buf[idx + 1] * s + this.buf[idx + 1] * d * (1 - s)) / outA)
        this.buf[idx + 2] = clampByte((other.buf[idx + 2] * s + this.buf[idx + 2] * d * (1 - s)) / outA)
        this.buf[idx + 3] = clampByte(outA * 255)
      }
      if (other.glowMask[i]) this.glowMask[i] = 1
      else if (sa > 128) this.glowMask[i] = 0
    }
  }

  // Crisp 2px outer ink outline for native 168x192 pixel art readability
  applyOutline(outlineCol = INK, thickness = 2) {
    const w = this.w
    const h = this.h
    const copy = Buffer.from(this.buf)
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
    const diag = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (copy[i * 4 + 3] > 20) continue
        let touchCard = false
        for (const [dx, dy] of dirs) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          const ni = ny * w + nx
          if (copy[ni * 4 + 3] > 110 && !this.glowMask[ni]) {
            touchCard = true
            break
          }
        }
        let touch2 = false
        if (!touchCard && thickness >= 2) {
          for (const [dx, dy] of diag) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
            const ni = ny * w + nx
            if (copy[ni * 4 + 3] > 140 && !this.glowMask[ni]) {
              touch2 = true
              break
            }
          }
        }
        if (touchCard || touch2) {
          const idx = i * 4
          this.buf[idx] = outlineCol[0]
          this.buf[idx + 1] = outlineCol[1]
          this.buf[idx + 2] = outlineCol[2]
          this.buf[idx + 3] = outlineCol[3]
        }
      }
    }
  }

  tintShift(flashAlpha, flashRgb = [255, 255, 255]) {
    if (flashAlpha <= 0) return
    const len = this.w * this.h
    for (let i = 0; i < len; i++) {
      const idx = i * 4
      if (this.buf[idx + 3] === 0) continue
      this.buf[idx] = clampByte(this.buf[idx] * (1 - flashAlpha) + flashRgb[0] * flashAlpha)
      this.buf[idx + 1] = clampByte(this.buf[idx + 1] * (1 - flashAlpha) + flashRgb[1] * flashAlpha)
      this.buf[idx + 2] = clampByte(this.buf[idx + 2] * (1 - flashAlpha) + flashRgb[2] * flashAlpha)
    }
  }
}

// ---------------- 15 Class Visual Specifications ----------------
const SKIN_BASE = '#f2be96'
const SKIN_TAN = '#dfa072'

const CLASS_DESIGNS = {
  novice: {
    id: 'novice', name: 'Wayfarer', slug: 'wayfarer',
    skin: SKIN_BASE, hairColor: '#3f2519', hairStyle: 'messy_spiky', eyeColor: '#2d1c16', beard: false,
    armorType: 'wayfarer_tunic', topColor: '#3a3f4e', trimColor: '#dc2626', pantsColor: '#262933',
    bootColor: '#4a3125', capeColor: '#c81e1e', scarfColor: '#dc2626', pauldronColor: '#52586b',
    headgear: 'none', weapon: 'starter_sword', weaponColor: '#dbe4f0', offhand: 'none', auraColor: '#ef4444',
  },
  swordsman: {
    id: 'swordsman', name: 'Vanguard', slug: 'vanguard',
    skin: SKIN_BASE, hairColor: '#291e1a', hairStyle: 'messy_spiky', eyeColor: '#231815', beard: true,
    armorType: 'vanguard_fur_plate', topColor: '#8d99ae', trimColor: '#f59e0b', pantsColor: '#334155',
    bootColor: '#64748b', capeColor: '#cbd5e1', furCollar: '#f1f5f9', pauldronColor: '#94a3b8', accentSecondary: '#f8fafc',
    headgear: 'none', weapon: 'vanguard_greatsword', weaponColor: '#e2e8f0', offhand: 'kite_shield_gold',
    shieldColor: '#475569', shieldTrim: '#fbbf24', auraColor: '#f59e0b',
  },
  mage: {
    id: 'mage', name: 'Arcanist', slug: 'arcanist',
    skin: SKIN_BASE, hairColor: '#2a1f1b', hairStyle: 'messy_spiky', eyeColor: '#6d28d9', beard: true,
    armorType: 'arcanist_coat', topColor: '#5b21b6', trimColor: '#f59e0b', pantsColor: '#2e1065',
    bootColor: '#42291e', capeColor: '#4c1d95', pauldronColor: '#6d28d9', accentSecondary: '#8b5cf6',
    headgear: 'none', weapon: 'amethyst_orb_staff', weaponColor: '#c084fc', offhand: 'arcane_tome', auraColor: '#a855f7',
  },
  archer: {
    id: 'archer', name: 'Windstalker', slug: 'windstalker',
    skin: SKIN_BASE, hairColor: '#38251a', hairStyle: 'messy_spiky', eyeColor: '#15803d', beard: true,
    armorType: 'ranger_cloak_armor', topColor: '#1f6f3b', trimColor: '#d97706', pantsColor: '#3f2e21',
    bootColor: '#523622', capeColor: '#14532d', pauldronColor: '#247a44', quiver: true,
    headgear: 'ranger_hood_open', weapon: 'emerald_recurve_bow', weaponColor: '#4ade80', offhand: 'none', auraColor: '#22c55e',
  },
  cleric: {
    id: 'cleric', name: 'Luminary', slug: 'luminary',
    skin: SKIN_BASE, hairColor: '#322219', hairStyle: 'swept_hero', eyeColor: '#0284c7', beard: false,
    armorType: 'celestial_vestments', topColor: '#f1f5f9', trimColor: '#fbbf24', accentSecondary: '#2563eb',
    pantsColor: '#1e3a8a', bootColor: '#475569', capeColor: '#dbeafe', pauldronColor: '#fbbf24',
    headgear: 'none', weapon: 'sun_holy_scepter', weaponColor: '#fde047', offhand: 'none', auraColor: '#facc15',
  },
  merchant: {
    id: 'merchant', name: 'Goldweaver', slug: 'goldweaver',
    skin: SKIN_BASE, hairColor: '#36241a', hairStyle: 'messy_spiky', eyeColor: '#92400e', beard: false,
    armorType: 'goldweaver_plate', topColor: '#b45309', trimColor: '#fbbf24', accentSecondary: '#1e293b',
    pantsColor: '#292524', bootColor: '#78350f', capeColor: '#92400e', pauldronColor: '#d97706',
    headgear: 'none', weapon: 'golden_merchant_mace', weaponColor: '#fbbf24', offhand: 'coin_pouch_hand', auraColor: '#fbbf24',
  },
  thief: {
    id: 'thief', name: 'Nightveil', slug: 'nightveil',
    skin: SKIN_BASE, hairColor: '#1f1d24', hairStyle: 'messy_spiky', eyeColor: '#dc2626', beard: false,
    armorType: 'shadow_leather', topColor: '#24242b', trimColor: '#94a3b8', pantsColor: '#18181b',
    bootColor: '#1c1917', scarfColor: '#dc2626', pauldronColor: '#343440',
    headgear: 'none', weapon: 'twin_dagger_main', weaponColor: '#cbd5e1', offhand: 'twin_dagger_off', auraColor: '#f43f5e',
  },
  kensei: {
    id: 'kensei', name: 'Shinkage', slug: 'shinkage',
    skin: SKIN_BASE, hairColor: '#1c1921', hairStyle: 'samurai_ponytail', eyeColor: '#991b1b', beard: false,
    armorType: 'samurai_kimono', topColor: '#f8fafc', trimColor: '#dc2626', accentSecondary: '#1f2937',
    pantsColor: '#991b1b', bootColor: '#292524', pauldronColor: '#1f2937',
    headgear: 'none', weapon: 'curved_katana', weaponColor: '#e2e8f0', offhand: 'none', auraColor: '#38bdf8',
  },
  iron_fist: {
    id: 'iron_fist', name: 'Titanfist', slug: 'titanfist',
    skin: SKIN_TAN, hairColor: '#2b1e19', hairStyle: 'messy_spiky', eyeColor: '#ea580c', beard: false,
    armorType: 'bare_fighter', topColor: SKIN_TAN, trimColor: '#dc2626', pantsColor: '#1c1b22',
    bootColor: '#f1f5f9', headgear: 'none', weapon: 'fiery_gauntlet_main', weaponColor: '#fb923c',
    offhand: 'fiery_gauntlet_off', auraColor: '#f97316',
  },
  wicked_necromancer: {
    id: 'wicked_necromancer', name: 'Grimcaller', slug: 'grimcaller',
    skin: '#e8d2cb', hairColor: '#1e1b24', hairStyle: 'messy_spiky', eyeColor: '#a855f7', beard: true,
    faceMark: '#a855f7', armorType: 'necromancer_coat', topColor: '#26183b', trimColor: '#94a3b8',
    pantsColor: '#131122', bootColor: '#1e1b4b', capeColor: '#1b1330', pauldronColor: '#3b2459',
    headgear: 'none', weapon: 'necro_grimoire', weaponColor: '#c084fc', offhand: 'soul_flame_orb', auraColor: '#c084fc',
  },
  the_king: {
    id: 'the_king', name: 'High Sovereign', slug: 'high_sovereign',
    skin: SKIN_BASE, hairColor: '#2a1f1a', hairStyle: 'royal_locks', eyeColor: '#b45309', beard: false,
    armorType: 'sovereign_regalia', topColor: '#b91c1c', trimColor: '#fbbf24', accentSecondary: '#f8fafc',
    pantsColor: '#1e1b24', bootColor: '#451a03', capeColor: '#991b1b', pauldronColor: '#d97706',
    headgear: 'royal_crown', weapon: 'royal_ruby_scepter', weaponColor: '#fbbf24', offhand: 'royal_sword_off', auraColor: '#fbbf24',
  },
  sinister: {
    id: 'sinister', name: 'Dreadfang', slug: 'dreadfang',
    skin: '#e7ccbe', hairColor: '#18181b', hairStyle: 'messy_spiky', eyeColor: '#a855f7', beard: false,
    armorType: 'dread_reaper_cloak', topColor: '#1f1b2e', trimColor: '#7e22ce', pantsColor: '#111827',
    bootColor: '#18181b', capeColor: '#2d234a', pauldronColor: '#2e244d',
    headgear: 'none', weapon: 'demon_scythe_main', weaponColor: '#a855f7', offhand: 'demon_scythe_off', auraColor: '#a855f7',
  },
  templar: {
    id: 'templar', name: 'Aegis Knight', slug: 'aegis_knight',
    skin: SKIN_BASE, hairColor: '#2e2018', hairStyle: 'swept_hero', eyeColor: '#2563eb', beard: false,
    armorType: 'aegis_plate', topColor: '#1d4ed8', trimColor: '#fbbf24', accentSecondary: '#cbd5e1',
    pantsColor: '#1e293b', bootColor: '#475569', capeColor: '#1e3a8a', pauldronColor: '#2563eb',
    headgear: 'none', weapon: 'golden_lance', weaponColor: '#fbbf24', offhand: 'kite_shield_blue',
    shieldColor: '#1e40af', shieldTrim: '#fbbf24', auraColor: '#60a5fa',
  },
  nekobaku: {
    id: 'nekobaku', name: 'Pawchemist', slug: 'pawchemist',
    skin: SKIN_BASE, hairColor: '#3a271d', hairStyle: 'messy_spiky', eyeColor: '#16a34a', beard: false,
    armorType: 'alchemist_coat', topColor: '#f1f5f9', trimColor: '#78350f', accentSecondary: '#22c55e',
    pantsColor: '#4a3525', bootColor: '#5c3a21', capeColor: '#cbd5e1', pauldronColor: '#784421',
    headgear: 'alchemist_goggles', weapon: 'emerald_flask_main', weaponColor: '#4ade80', offhand: 'alchemy_vial_off', auraColor: '#4ade80',
  },
  mamushi: {
    id: 'mamushi', name: 'Venomblade', slug: 'venomblade',
    skin: '#e8d0c0', hairColor: '#1b1d24', hairStyle: 'messy_spiky', eyeColor: '#22c55e', beard: false,
    armorType: 'venom_assassin', topColor: '#24143b', trimColor: '#22c55e', pantsColor: '#18181b',
    bootColor: '#1f2937', capeColor: '#2e1065', pauldronColor: '#311a4f', poisonChains: true,
    headgear: 'none', weapon: 'poison_scythe', weaponColor: '#22c55e', offhand: 'poison_dagger_off', auraColor: '#22c55e',
  },
}

// ---------------- Articulated Skeletal Pose Solver (168x192 Native) ----------------
function solvePose(anim, dir, frame) {
  const isSide = dir === 'left' || dir === 'right'
  const faceSign = dir === 'left' ? -1 : 1
  const pose = {
    bodyX: 84,
    footY: 178,
    bobY: 0,
    torsoLeanX: 0,
    headTiltY: 0,
    blink: false,
    wince: false,
    smile: false,
    hitFlash: 0,
    legL: { dx: 0, lift: 0 },
    legR: { dx: 0, lift: 0 },
    mainArm: { dx: 0, dy: 0, angleDeg: 22, reach: 0 },
    offArm: { dx: 0, dy: 0, angleDeg: -18, reach: 0 },
    capeSway: 0,
    fallen: 0,
    slashPhase: -1,
    skillPhase: -1,
    victorySparkle: false,
  }

  if (anim === 'idle') {
    pose.bobY = [0, -2, 0, 2][frame % 4]
    pose.blink = frame === 2
    pose.capeSway = [0, 3, 1, -2][frame % 4]
    pose.mainArm.dy = [0, -2, 0, 1][frame % 4]
    pose.offArm.dy = [0, -2, 0, 1][frame % 4]
  } else if (anim === 'walk') {
    const f = frame % 6
    const sw = [-10, -6, 2, 10, 6, -2]
    const liftL = [0, 6, 4, 0, 0, 0]
    const liftR = [0, 0, 0, 0, 6, 4]
    pose.bobY = [0, -2, -4, 0, -2, -4][f]
    pose.legL = { dx: sw[f], lift: liftL[f] }
    pose.legR = { dx: -sw[f], lift: liftR[f] }
    pose.mainArm = { dx: -sw[f] * 0.55, dy: 0, angleDeg: 22 - sw[f] * 1.8, reach: 0 }
    pose.offArm = { dx: sw[f] * 0.55, dy: 0, angleDeg: -18 + sw[f] * 1.8, reach: 0 }
    pose.capeSway = 4 + (f % 3) * 2
  } else if (anim === 'run') {
    const f = frame % 6
    const sw = [-16, -8, 6, 16, 8, -6]
    const liftL = [0, 8, 6, 0, 2, 0]
    const liftR = [0, 2, 0, 0, 8, 6]
    pose.bobY = [0, -4, -6, 0, -4, -6][f]
    pose.torsoLeanX = isSide ? faceSign * 4 : 0
    pose.legL = { dx: sw[f], lift: liftL[f] }
    pose.legR = { dx: -sw[f], lift: liftR[f] }
    pose.mainArm = { dx: -sw[f] * 0.7, dy: -2, angleDeg: 32 - sw[f] * 2.2, reach: 2 }
    pose.offArm = { dx: sw[f] * 0.7, dy: -2, angleDeg: -26 + sw[f] * 2.2, reach: 2 }
    pose.capeSway = 8 + (f % 2) * 4
  } else if (anim === 'attack') {
    const f = frame % 5
    const lunges = [-4, 6, 10, 4, 0]
    pose.bobY = [2, -2, 0, 2, 0][f]
    if (isSide) pose.bodyX += faceSign * lunges[f]
    pose.torsoLeanX = isSide ? faceSign * (f === 0 ? -2 : f <= 3 ? 4 : 0) : 0
    pose.legL = { dx: f === 0 ? -6 : f <= 3 ? 8 : 0, lift: f === 1 ? 4 : 0 }
    pose.legR = { dx: f === 0 ? 4 : f <= 3 ? -10 : 0, lift: 0 }
    pose.mainArm = {
      dx: isSide ? faceSign * (f === 0 ? -6 : f <= 3 ? 9 : 0) : (f === 0 ? -4 : 4),
      dy: f === 0 ? -8 : f === 1 ? -4 : 2,
      angleDeg: [-75, 10, 62, 42, 22][f],
      reach: f === 1 || f === 2 ? 6 : 0,
    }
    pose.offArm = {
      dx: isSide ? faceSign * (f === 1 || f === 2 ? -4 : 2) : -2,
      dy: f === 0 ? 2 : -2,
      angleDeg: f === 1 || f === 2 ? -35 : -18,
      reach: 0,
    }
    pose.capeSway = f === 0 ? -4 : f <= 3 ? 10 : 2
    if (f === 1 || f === 2 || f === 3) pose.slashPhase = f - 1
  } else if (anim === 'skill') {
    const f = frame % 6
    pose.bobY = [4, -2, -12, -10, -4, 0][f]
    if (isSide) pose.bodyX += faceSign * [0, 0, 6, 8, 4, 0][f]
    pose.legL = { dx: f === 2 || f === 3 ? -4 : 0, lift: f === 2 || f === 3 ? 6 : 0 }
    pose.legR = { dx: f === 2 || f === 3 ? 4 : 0, lift: f === 2 || f === 3 ? 4 : 0 }
    pose.mainArm = {
      dx: f >= 1 && f <= 3 ? (isSide ? faceSign * 5 : 4) : 0,
      dy: f === 1 || f === 2 ? -12 : f === 3 ? -4 : 0,
      angleDeg: [-35, -85, -110, 48, 30, 22][f],
      reach: f === 2 || f === 3 ? 6 : 2,
    }
    pose.offArm = {
      dx: f >= 1 && f <= 3 ? -4 : 0,
      dy: f === 1 || f === 2 ? -8 : 0,
      angleDeg: f === 1 || f === 2 ? -70 : -18,
      reach: 2,
    }
    pose.capeSway = f >= 1 && f <= 4 ? 10 : 2
    pose.skillPhase = f
  } else if (anim === 'hit') {
    const f = frame % 3
    pose.bobY = [2, 4, 0][f]
    if (isSide) pose.bodyX -= faceSign * [6, 8, 2][f]
    pose.torsoLeanX = isSide ? -faceSign * [4, 4, 2][f] : 0
    pose.headTiltY = [2, 2, 0][f]
    pose.wince = true
    pose.hitFlash = f === 0 ? 0.55 : f === 1 ? 0.25 : 0
    pose.legL = { dx: -4, lift: f === 0 ? 2 : 0 }
    pose.legR = { dx: 4, lift: 0 }
    pose.mainArm = { dx: -4, dy: 4, angleDeg: 45, reach: 0 }
    pose.offArm = { dx: 4, dy: 2, angleDeg: -45, reach: 0 }
    pose.capeSway = -6
  } else if (anim === 'death') {
    const f = Math.min(4, frame)
    pose.fallen = f
    pose.wince = true
    pose.bobY = [8, 22, 40, 56, 62][f]
    if (f === 0) {
      pose.legL = { dx: -4, lift: 0 }
      pose.legR = { dx: 4, lift: 0 }
      pose.mainArm = { dx: 0, dy: 8, angleDeg: 55, reach: 0 }
    } else if (f === 1) {
      pose.headTiltY = 4
      pose.mainArm = { dx: 0, dy: 12, angleDeg: 75, reach: 0 }
    } else if (f === 2) {
      pose.headTiltY = 6
    }
  } else if (anim === 'victory') {
    const f = frame % 5
    pose.bobY = [2, -8, -12, -2, 0][f]
    pose.smile = true
    pose.legL = { dx: f === 1 || f === 2 ? -4 : 0, lift: f === 1 || f === 2 ? 4 : 0 }
    pose.legR = { dx: f === 1 || f === 2 ? 4 : 0, lift: f === 1 || f === 2 ? 4 : 0 }
    pose.mainArm = {
      dx: isSide ? faceSign * 4 : 5,
      dy: f >= 1 && f <= 4 ? -15 : 0,
      angleDeg: f >= 1 && f <= 4 ? -98 : 16,
      reach: f >= 1 ? 4 : 0,
    }
    pose.offArm = {
      dx: -4,
      dy: f >= 1 && f <= 3 ? -6 : 0,
      angleDeg: f >= 1 && f <= 3 ? -45 : -14,
      reach: 0,
    }
    pose.capeSway = f >= 1 && f <= 3 ? 8 : 2
    pose.victorySparkle = f === 1 || f === 2 || f === 3
  }
  return pose
}

function computeJoints(pose, dir) {
  const cx = pose.bodyX
  const footY = pose.footY
  const isSide = dir === 'left' || dir === 'right'
  const sign = dir === 'left' ? -1 : 1

  const hipY = 124 + pose.bobY
  const torsoTopY = 85 + pose.bobY
  const headCy = 64 + pose.bobY + pose.headTiltY
  const headCx = cx + pose.torsoLeanX

  // Heroic A-stance legs (wider stance than stick-rect!)
  let legLx, legRx, footLY, footRY, kneeLX, kneeRX
  if (isSide) {
    legLx = cx - 4 + pose.legL.dx * sign
    legRx = cx + 4 + pose.legR.dx * sign
    kneeLX = legLx + sign * 2
    kneeRX = legRx + sign * 2
    footLY = footY - pose.legL.lift
    footRY = footY - pose.legR.lift
  } else {
    legLx = cx - 10
    legRx = cx + 10
    kneeLX = cx - 11
    kneeRX = cx + 11
    footLY = footY - pose.legL.lift - Math.max(0, pose.legL.dx * 0.45)
    footRY = footY - pose.legR.lift - Math.max(0, pose.legR.dx * 0.45)
  }

  let mainShoulder, offShoulder, mainElbow, offElbow, mainHand, offHand
  if (dir === 'down') {
    mainShoulder = { x: headCx - 19, y: torsoTopY + 5 }
    offShoulder = { x: headCx + 19, y: torsoTopY + 5 }
    mainElbow = { x: mainShoulder.x - 5 + pose.mainArm.dx * 0.5, y: mainShoulder.y + 16 + pose.mainArm.dy * 0.5 }
    offElbow = { x: offShoulder.x + 5 + pose.offArm.dx * 0.5, y: offShoulder.y + 16 + pose.offArm.dy * 0.5 }
    mainHand = { x: mainElbow.x - 2 + pose.mainArm.dx, y: mainElbow.y + 15 + pose.mainArm.dy }
    offHand = { x: offElbow.x + 2 + pose.offArm.dx, y: offElbow.y + 15 + pose.offArm.dy }
  } else if (dir === 'up') {
    mainShoulder = { x: headCx + 19, y: torsoTopY + 5 }
    offShoulder = { x: headCx - 19, y: torsoTopY + 5 }
    mainElbow = { x: mainShoulder.x + 5 + pose.mainArm.dx * 0.5, y: mainShoulder.y + 16 + pose.mainArm.dy * 0.5 }
    offElbow = { x: offShoulder.x - 5 + pose.offArm.dx * 0.5, y: offShoulder.y + 16 + pose.offArm.dy * 0.5 }
    mainHand = { x: mainElbow.x + 2 + pose.mainArm.dx, y: mainElbow.y + 15 + pose.mainArm.dy }
    offHand = { x: offElbow.x - 2 + pose.offArm.dx, y: offElbow.y + 15 + pose.offArm.dy }
  } else if (dir === 'right') {
    mainShoulder = { x: headCx - 4, y: torsoTopY + 6 }
    offShoulder = { x: headCx + 10, y: torsoTopY + 6 }
    mainElbow = { x: mainShoulder.x + 5 + pose.mainArm.dx * 0.5, y: mainShoulder.y + 15 + pose.mainArm.dy * 0.5 }
    offElbow = { x: offShoulder.x + 6 + pose.offArm.dx * 0.5, y: offShoulder.y + 15 + pose.offArm.dy * 0.5 }
    mainHand = { x: mainElbow.x + 8 + pose.mainArm.dx + pose.mainArm.reach, y: mainElbow.y + 12 + pose.mainArm.dy }
    offHand = { x: offElbow.x + 6 + pose.offArm.dx, y: offElbow.y + 12 + pose.offArm.dy }
  } else {
    mainShoulder = { x: headCx + 4, y: torsoTopY + 6 }
    offShoulder = { x: headCx - 10, y: torsoTopY + 6 }
    mainElbow = { x: mainShoulder.x - 5 + pose.mainArm.dx * 0.5, y: mainShoulder.y + 15 + pose.mainArm.dy * 0.5 }
    offElbow = { x: offShoulder.x - 6 + pose.offArm.dx * 0.5, y: offShoulder.y + 15 + pose.offArm.dy * 0.5 }
    mainHand = { x: mainElbow.x - 8 + pose.mainArm.dx - pose.mainArm.reach, y: mainElbow.y + 12 + pose.mainArm.dy }
    offHand = { x: offElbow.x - 6 + pose.offArm.dx, y: offElbow.y + 12 + pose.offArm.dy }
  }

  return {
    cx, headCx, headCy, torsoTopY, hipY, footY,
    legLx, legRx, kneeLX, kneeRX, footLY, footRY,
    mainShoulder, offShoulder, mainElbow, offElbow, mainHand, offHand,
    isSide, sign,
  }
}

// ---------------- Articulated Sculpted Character Drawing ----------------
function drawFallenHeroBody(g, j, pose, skinRamp, pantsRamp, bootRamp, topRamp, dir) {
  const cy = pose.fallen === 2 ? 150 : pose.fallen === 3 ? 164 : 168
  const dirX = dir === 'up' ? -1 : dir === 'left' ? -1 : 1
  g.ellipse(j.cx - 4 * dirX, cy, 24, 12, topRamp)
  g.shadedRect(j.cx - 34 * dirX - (dirX > 0 ? 0 : 24), cy - 4, 26, 10, pantsRamp)
  g.shadedRect(j.cx - 44 * dirX - (dirX > 0 ? 0 : 12), cy - 4, 12, 10, bootRamp)
  g.ellipse(j.cx + 24 * dirX, cy - 4, 15, 13, skinRamp)
  if (dir !== 'up') {
    g.line(j.cx + 20 * dirX, cy - 6, j.cx + 28 * dirX, cy - 2, INK, 2)
  }
}

function drawLimbBoot(g, sx, sy, kx, fx, fy, pantsRamp, bootRamp, trimRamp, isSide, dirSign, isBackLeg, armoredKnee = true) {
  const pRamp = isBackLeg
    ? { deep: pantsRamp.deep, dark: pantsRamp.deep, mid: pantsRamp.dark, hi: pantsRamp.mid, spec: pantsRamp.mid }
    : pantsRamp
  const bRamp = isBackLeg
    ? { deep: bootRamp.deep, dark: bootRamp.deep, mid: bootRamp.dark, hi: bootRamp.mid, spec: bootRamp.mid }
    : bootRamp
  const topY = sy - 3
  const kneeY = Math.round((topY + fy - 16) / 2)
  const bootTop = Math.max(topY + 12, fy - 22)

  // Thigh & shin sculpted polygons
  g.limbLine(sx, topY, kx, kneeY, pRamp, isSide ? 6 : 6.2)
  g.limbLine(kx, kneeY, fx, bootTop + 3, pRamp, isSide ? 5.5 : 5.8)

  // Knee plate armor
  if (armoredKnee) {
    g.ellipse(kx, kneeY, 5.5, 4.5, bRamp)
    if (trimRamp) g.rect(kx - 2, kneeY - 1, 5, 2, trimRamp.hi)
  }

  // Sculpted cuffed boot + ankle wrap + sole
  const bw = isSide ? 14 : 13
  const bx0 = Math.round(fx - bw / 2)
  const bh = Math.max(12, Math.round(fy - bootTop))
  g.shadedRect(bx0, bootTop, bw, bh, bRamp)
  // Top folded boot cuff
  g.shadedRect(bx0 - 1, bootTop - 1, bw + 2, 5, trimRamp ?? bRamp)
  // Toe extension & thick dark sole
  if (isSide) {
    g.shadedRect(bx0 + (dirSign > 0 ? 9 : -5), fy - 6, 7, 5, bRamp)
    g.rect(bx0 - 2, fy - 2, bw + 6, 3, bRamp.deep)
  } else {
    g.shadedRect(bx0 + (fx < jCxFallback(fx) ? -1 : 1), fy - 5, bw, 4, bRamp)
    g.rect(bx0 - 1, fy - 2, bw + 2, 3, bRamp.deep)
    g.rect(bx0 + 2, bootTop + 5, bw - 4, 2, bRamp.hi)
  }
}

function jCxFallback(fx) {
  return 84 + (fx >= 84 ? -1 : 1)
}

function drawBaseBody(g, j, pose, spec, dir, drawFace = true) {
  const skinRamp = makeRamp(spec.skin)
  const underPants = makeRamp('#3b3747')
  const underBoot = makeRamp('#4a3328')
  const underTop = makeRamp('#cbd5e1')

  if (pose.fallen >= 2) {
    drawFallenHeroBody(g, j, pose, skinRamp, underPants, underBoot, underTop, dir)
    return
  }

  // Legs
  if (j.isSide) {
    drawLimbBoot(g, j.legRx, j.hipY, j.kneeRX, j.legRx, j.footRY, underPants, underBoot, null, true, j.sign, true, false)
    drawLimbBoot(g, j.legLx, j.hipY, j.kneeLX, j.legLx, j.footLY, underPants, underBoot, null, true, j.sign, false, false)
  } else {
    drawLimbBoot(g, j.legLx, j.hipY, j.kneeLX, j.legLx, j.footLY, underPants, underBoot, null, false, 1, false, false)
    drawLimbBoot(g, j.legRx, j.hipY, j.kneeRX, j.legRx, j.footRY, underPants, underBoot, null, false, 1, false, false)
  }

  // Back arm on side view
  if (j.isSide) {
    const backSkin = { deep: skinRamp.deep, dark: skinRamp.deep, mid: skinRamp.dark, hi: skinRamp.mid, spec: skinRamp.mid }
    g.limbLine(j.offShoulder.x, j.offShoulder.y, j.offElbow.x, j.offElbow.y, backSkin, 4.5)
    g.limbLine(j.offElbow.x, j.offElbow.y, j.offHand.x, j.offHand.y, backSkin, 4.2)
    g.ellipse(j.offHand.x, j.offHand.y, 4.5, 4.5, backSkin)
  }

  // Sculpted Athletic Torso (wider shoulders tapering to waist)
  const chestRamp = spec.armorType === 'bare_fighter' ? skinRamp : underTop
  if (j.isSide) {
    g.poly([
      [j.headCx - 11, j.torsoTopY],
      [j.headCx + 12, j.torsoTopY],
      [j.headCx + 10, j.hipY + 2],
      [j.headCx - 10, j.hipY + 2],
    ], chestRamp)
  } else {
    g.poly([
      [j.headCx - 17, j.torsoTopY],
      [j.headCx + 17, j.torsoTopY],
      [j.headCx + 13, j.hipY + 2],
      [j.headCx - 13, j.hipY + 2],
    ], chestRamp)
    if (spec.armorType === 'bare_fighter') {
      // Sculpted pecs, abs, and sternum shadow
      g.line(j.headCx - 10, j.torsoTopY + 13, j.headCx - 2, j.torsoTopY + 15, skinRamp.dark, 2)
      g.line(j.headCx + 2, j.torsoTopY + 15, j.headCx + 10, j.torsoTopY + 13, skinRamp.dark, 2)
      g.line(j.headCx, j.torsoTopY + 13, j.headCx, j.torsoTopY + 34, skinRamp.dark, 2)
      g.rect(j.headCx - 6, j.torsoTopY + 21, 5, 2, skinRamp.dark)
      g.rect(j.headCx + 2, j.torsoTopY + 21, 5, 2, skinRamp.dark)
      g.rect(j.headCx - 5, j.torsoTopY + 28, 4, 2, skinRamp.dark)
      g.rect(j.headCx + 2, j.torsoTopY + 28, 4, 2, skinRamp.dark)
      g.ellipse(j.headCx - 6, j.torsoTopY + 9, 4, 3, skinRamp.hi)
      g.ellipse(j.headCx + 6, j.torsoTopY + 9, 4, 3, skinRamp.hi)
    }
  }
  // Neck + collar shadow
  g.shadedRect(j.headCx - 5, j.torsoTopY - 7, 10, 9, skinRamp)
  g.rect(j.headCx - 5, j.torsoTopY - 6, 10, 3, skinRamp.dark)

  // Head (~30x30px rounded-jaw anime-fantasy proportions)
  const hRx = j.isSide ? 13.5 : 15
  const hRy = 15
  g.ellipse(j.headCx, j.headCy, hRx, hRy, skinRamp)
  // Jawline taper shadow
  g.rect(j.headCx - 6, j.headCy + 12, 12, 3, skinRamp.dark)

  // Ears
  if (dir === 'down') {
    g.shadedRect(j.headCx - 17, j.headCy - 1, 4, 8, skinRamp)
    g.shadedRect(j.headCx + 14, j.headCy - 1, 4, 8, skinRamp)
  } else if (j.isSide) {
    g.shadedRect(j.headCx - j.sign * 13, j.headCy - 1, 4, 8, skinRamp)
  }

  // Expressive HD Pixel Eyes + Face
  if (drawFace && dir !== 'up') {
    const eyeCol = parseHex(spec.eyeColor)
    const eyeDark = shiftColor(spec.eyeColor, -0.45)
    const browCol = shiftColor(spec.hairColor, -0.35)
    const drawEye = (ex, ey) => {
      if (pose.blink) {
        g.line(ex - 3, ey + 1, ex + 3, ey + 1, INK, 2)
      } else if (pose.wince) {
        g.line(ex - 2, ey - 1, ex + 2, ey + 2, INK, 2)
      } else {
        // Expressive brow + sharp upper lash + white sclera + shaded iris + bright catchlight
        g.line(ex - 3, ey - 5, ex + 3, ey - 5, browCol, 1)
        g.rect(ex - 3, ey - 3, 6, 2, INK)
        g.rect(ex - 3, ey - 1, 6, 4, WHITE)
        g.rect(ex - 1, ey - 1, 3, 4, eyeCol)
        g.rect(ex - 1, ey - 1, 3, 1, eyeDark)
        g.px(ex - 1, ey, WHITE)
        g.px(ex + 1, ey + 2, eyeDark)
      }
    }

    if (dir === 'down') {
      drawEye(j.headCx - 6, j.headCy + 2)
      drawEye(j.headCx + 6, j.headCy + 2)
      // Cheek blush/shading & nose & determined mouth
      g.px(j.headCx, j.headCy + 6, skinRamp.dark)
      g.px(j.headCx + 1, j.headCy + 7, skinRamp.deep)
      if (pose.smile) {
        g.line(j.headCx - 3, j.headCy + 10, j.headCx + 3, j.headCy + 10, skinRamp.deep, 2)
      } else {
        g.rect(j.headCx - 2, j.headCy + 10, 5, 2, skinRamp.dark)
      }
      if (spec.beard) {
        const bRamp = makeRamp(spec.hairColor)
        g.poly([
          [j.headCx - 11, j.headCy + 5],
          [j.headCx - 8, j.headCy + 14],
          [j.headCx, j.headCy + 17],
          [j.headCx + 8, j.headCy + 14],
          [j.headCx + 11, j.headCy + 5],
          [j.headCx + 7, j.headCy + 9],
          [j.headCx, j.headCy + 11],
          [j.headCx - 7, j.headCy + 9],
        ], bRamp)
        g.rect(j.headCx - 3, j.headCy + 9, 6, 2, skinRamp.mid)
      }
      if (spec.faceMark) {
        g.rect(j.headCx + 6, j.headCy - 5, 3, 2, spec.faceMark)
        g.px(j.headCx + 8, j.headCy - 3, spec.faceMark)
      }
    } else {
      const ex = j.headCx + j.sign * 7
      drawEye(ex, j.headCy + 2)
      g.rect(j.headCx + j.sign * 13, j.headCy + 5, 2, 3, skinRamp.mid)
      if (spec.beard) {
        const bRamp = makeRamp(spec.hairColor)
        g.poly([
          [j.headCx + j.sign * 1, j.headCy + 7],
          [j.headCx + j.sign * 12, j.headCy + 9],
          [j.headCx + j.sign * 10, j.headCy + 16],
          [j.headCx + j.sign * 2, j.headCy + 16],
        ], bRamp)
      }
    }
  }

  // Front arms (skin base)
  if (!j.isSide) {
    g.limbLine(j.mainShoulder.x, j.mainShoulder.y, j.mainElbow.x, j.mainElbow.y, skinRamp, 4.8)
    g.limbLine(j.mainElbow.x, j.mainElbow.y, j.mainHand.x, j.mainHand.y, skinRamp, 4.4)
    g.limbLine(j.offShoulder.x, j.offShoulder.y, j.offElbow.x, j.offElbow.y, skinRamp, 4.8)
    g.limbLine(j.offElbow.x, j.offElbow.y, j.offHand.x, j.offHand.y, skinRamp, 4.4)
    g.ellipse(j.mainHand.x, j.mainHand.y, 4.8, 4.8, skinRamp)
    g.ellipse(j.offHand.x, j.offHand.y, 4.8, 4.8, skinRamp)
  } else {
    g.limbLine(j.mainShoulder.x, j.mainShoulder.y, j.mainElbow.x, j.mainElbow.y, skinRamp, 5)
    g.limbLine(j.mainElbow.x, j.mainElbow.y, j.mainHand.x, j.mainHand.y, skinRamp, 4.5)
    g.ellipse(j.mainHand.x, j.mainHand.y, 4.8, 4.8, skinRamp)
  }
}

function drawArmorLayer(g, j, pose, spec, dir) {
  if (pose.fallen >= 2) {
    const cy = pose.fallen === 2 ? 150 : pose.fallen === 3 ? 164 : 168
    const dirX = dir === 'up' ? -1 : dir === 'left' ? -1 : 1
    const topRamp = makeRamp(spec.topColor)
    const pantsRamp = makeRamp(spec.pantsColor)
    const bootRamp = makeRamp(spec.bootColor)
    g.ellipse(j.cx - 4 * dirX, cy, 24, 12, topRamp)
    g.shadedRect(j.cx - 34 * dirX - (dirX > 0 ? 0 : 24), cy - 4, 26, 10, pantsRamp)
    g.shadedRect(j.cx - 44 * dirX - (dirX > 0 ? 0 : 12), cy - 4, 12, 10, bootRamp)
    return
  }

  const topRamp = makeRamp(spec.topColor)
  const trimRamp = makeRamp(spec.trimColor)
  const pantsRamp = makeRamp(spec.pantsColor)
  const bootRamp = makeRamp(spec.bootColor)
  const pauldronRamp = makeRamp(spec.pauldronColor ?? spec.topColor)
  const capeRamp = spec.capeColor ? makeRamp(spec.capeColor) : null
  const secRamp = spec.accentSecondary ? makeRamp(spec.accentSecondary) : trimRamp

  // 1. Dynamic Flowing Cape / Cloak
  const drawCape = () => {
    if (!capeRamp) return
    const sway = pose.capeSway * (j.isSide ? -j.sign : 1)
    if (dir === 'up') {
      g.poly([
        [j.headCx - 20, j.torsoTopY + 2],
        [j.headCx + 20, j.torsoTopY + 2],
        [j.headCx + 28 + pose.capeSway, j.hipY + 34],
        [j.headCx + 8 + pose.capeSway, j.hipY + 38],
        [j.headCx - 12 + pose.capeSway, j.hipY + 35],
        [j.headCx - 28 + pose.capeSway, j.hipY + 32],
      ], capeRamp)
      g.line(j.headCx - 8, j.torsoTopY + 8, j.headCx - 12 + pose.capeSway, j.hipY + 30, capeRamp.dark, 2)
      g.line(j.headCx + 8, j.torsoTopY + 8, j.headCx + 12 + pose.capeSway, j.hipY + 30, capeRamp.dark, 2)
      g.line(j.headCx - 26 + pose.capeSway, j.hipY + 32, j.headCx + 26 + pose.capeSway, j.hipY + 34, trimRamp.hi, 2)
    } else if (dir === 'down') {
      // Swept fantasy cape flaring dramatically outward on left/right!
      g.poly([
        [j.headCx - 20, j.torsoTopY + 4],
        [j.headCx + 20, j.torsoTopY + 4],
        [j.headCx + 34 + pose.capeSway, j.hipY + 32],
        [j.headCx + 14 + pose.capeSway, j.hipY + 26],
        [j.headCx - 14 + pose.capeSway, j.hipY + 26],
        [j.headCx - 34 + pose.capeSway, j.hipY + 32],
      ], capeRamp)
      g.line(j.headCx - 33 + pose.capeSway, j.hipY + 32, j.headCx - 15 + pose.capeSway, j.hipY + 26, trimRamp.mid, 2)
      g.line(j.headCx + 33 + pose.capeSway, j.hipY + 32, j.headCx + 15 + pose.capeSway, j.hipY + 26, trimRamp.mid, 2)
    } else {
      const backX = j.headCx - j.sign * 8
      g.poly([
        [backX, j.torsoTopY + 4],
        [backX - j.sign * 26 + sway, j.hipY + 22],
        [backX - j.sign * 32 + sway, j.hipY + 32],
        [backX + j.sign * 4, j.hipY + 22],
      ], capeRamp)
      g.line(backX - j.sign * 31 + sway, j.hipY + 32, backX + j.sign * 2, j.hipY + 22, trimRamp.mid, 2)
    }
  }
  if (dir !== 'up') drawCape()

  // 2. Sculpted Pants, Knee Plates & Armored/Cuffed Boots
  const hasKneeArmor = spec.armorType !== 'bare_fighter' && spec.armorType !== 'alchemist_coat'
  if (j.isSide) {
    drawLimbBoot(g, j.legRx, j.hipY, j.kneeRX, j.legRx, j.footRY, pantsRamp, bootRamp, trimRamp, true, j.sign, true, hasKneeArmor)
    drawLimbBoot(g, j.legLx, j.hipY, j.kneeLX, j.legLx, j.footLY, pantsRamp, bootRamp, trimRamp, true, j.sign, false, hasKneeArmor)
  } else {
    drawLimbBoot(g, j.legLx, j.hipY, j.kneeLX, j.legLx, j.footLY, pantsRamp, bootRamp, trimRamp, false, 1, false, hasKneeArmor)
    drawLimbBoot(g, j.legRx, j.hipY, j.kneeRX, j.legRx, j.footRY, pantsRamp, bootRamp, trimRamp, false, 1, false, hasKneeArmor)
  }

  // Wide martial arts hakama / flared fighter trousers
  if (spec.armorType === 'bare_fighter' || spec.armorType === 'samurai_kimono') {
    const pW = j.isSide ? 22 : 34
    g.poly([
      [j.headCx - pW / 2, j.hipY - 4],
      [j.headCx + pW / 2, j.hipY - 4],
      [j.headCx + pW / 2 + 5, j.hipY + 26],
      [j.headCx - pW / 2 - 5, j.hipY + 26],
    ], pantsRamp)
    if (spec.armorType === 'bare_fighter') {
      // Golden dragon/flame trim pattern on martial trousers + white shin wraps
      g.line(j.headCx - 11, j.hipY + 10, j.headCx - 5, j.hipY + 18, '#fb923c', 2)
      g.line(j.headCx + 10, j.hipY + 12, j.headCx + 4, j.hipY + 20, '#fb923c', 2)
    }
  }

  // 3. Sculpted Torso Armor / Coat / Robe
  if (spec.armorType === 'bare_fighter') {
    // Leather X-strap chest harness + bronze ring + billowing crimson waist sash
    g.line(j.headCx - 14, j.torsoTopY + 2, j.headCx + 14, j.hipY - 6, '#5c3a21', 4)
    g.line(j.headCx + 14, j.torsoTopY + 2, j.headCx - 14, j.hipY - 6, '#5c3a21', 4)
    g.ellipse(j.headCx, j.torsoTopY + 18, 4, 4, makeRamp('#fbbf24'))
    g.shadedRect(j.headCx - (j.isSide ? 13 : 17), j.hipY - 8, j.isSide ? 26 : 34, 9, trimRamp)
    g.poly([
      [j.headCx - 4, j.hipY],
      [j.headCx + 6, j.hipY],
      [j.headCx + 11 + pose.capeSway, j.hipY + 24],
      [j.headCx - 3 + pose.capeSway, j.hipY + 22],
    ], trimRamp)
    g.line(j.headCx + 4, j.hipY + 2, j.headCx + 9 + pose.capeSway, j.hipY + 22, trimRamp.hi, 1)
  } else {
    // Tapered heroic breastplate / coat body
    const topHalf = j.isSide ? 13 : 18
    const waistHalf = j.isSide ? 11 : 14
    g.poly([
      [j.headCx - topHalf, j.torsoTopY],
      [j.headCx + topHalf, j.torsoTopY],
      [j.headCx + waistHalf, j.hipY + 2],
      [j.headCx - waistHalf, j.hipY + 2],
    ], topRamp)

    // Chest armor bevel & filigree details
    if (dir === 'down') {
      g.line(j.headCx - 11, j.torsoTopY + 12, j.headCx, j.torsoTopY + 16, topRamp.dark, 2)
      g.line(j.headCx + 11, j.torsoTopY + 12, j.headCx, j.torsoTopY + 16, topRamp.dark, 2)
      g.line(j.headCx - 10, j.torsoTopY + 10, j.headCx, j.torsoTopY + 14, topRamp.hi, 1)
      g.line(j.headCx + 10, j.torsoTopY + 10, j.headCx, j.torsoTopY + 14, topRamp.hi, 1)
      // Central chest crest / clasp
      g.ellipse(j.headCx, j.torsoTopY + 9, 3.5, 3.5, trimRamp)
    }

    // Class-Specific Flowing Coat Tails / Vestments / Tattered Cloak
    if (
      spec.armorType === 'arcanist_coat' ||
      spec.armorType === 'necromancer_coat' ||
      spec.armorType === 'sovereign_regalia' ||
      spec.armorType === 'celestial_vestments' ||
      spec.armorType === 'alchemist_coat'
    ) {
      const skirtH = spec.armorType === 'alchemist_coat' ? 30 : 38
      const flapSpread = Math.abs(pose.legL.dx) > 6 ? 12 : 8
      g.poly([
        [j.headCx - waistHalf, j.hipY - 3],
        [j.headCx + waistHalf, j.hipY - 3],
        [j.headCx + waistHalf + flapSpread, j.hipY + skirtH],
        [j.headCx - waistHalf - flapSpread, j.hipY + skirtH],
      ], topRamp)
      // Gold/trimmed hem & lapels
      g.line(j.headCx - waistHalf - flapSpread, j.hipY + skirtH, j.headCx + waistHalf + flapSpread, j.hipY + skirtH, trimRamp.hi, 2)
      if (dir === 'down') {
        g.poly([
          [j.headCx - 6, j.hipY + 2],
          [j.headCx + 6, j.hipY + 2],
          [j.headCx + 9, j.hipY + skirtH - 2],
          [j.headCx - 9, j.hipY + skirtH - 2],
        ], secRamp)
        g.line(j.headCx - 7, j.hipY + 2, j.headCx - 9, j.hipY + skirtH, trimRamp.hi, 2)
        g.line(j.headCx + 7, j.hipY + 2, j.headCx + 9, j.hipY + skirtH, trimRamp.hi, 2)
        g.line(j.headCx - 11, j.torsoTopY + 2, j.headCx, j.torsoTopY + 20, trimRamp.hi, 2)
        g.line(j.headCx + 11, j.torsoTopY + 2, j.headCx, j.torsoTopY + 20, trimRamp.hi, 2)
      }
    }

    if (spec.armorType === 'dread_reaper_cloak' || spec.armorType === 'venom_assassin') {
      g.poly([
        [j.headCx - waistHalf - 1, j.hipY - 4],
        [j.headCx + waistHalf + 1, j.hipY - 4],
        [j.headCx + waistHalf + 12, j.hipY + 38],
        [j.headCx + 8, j.hipY + 26],
        [j.headCx - 3, j.hipY + 40],
        [j.headCx - waistHalf - 11, j.hipY + 33],
      ], topRamp)
      if (dir === 'down') {
        g.line(j.headCx - 8, j.torsoTopY + 8, j.headCx + 8, j.torsoTopY + 8, trimRamp.hi, 2)
        g.line(j.headCx - 6, j.torsoTopY + 17, j.headCx + 6, j.torsoTopY + 17, trimRamp.mid, 2)
      }
    }

    if (spec.armorType === 'samurai_kimono') {
      if (dir === 'down') {
        g.line(j.headCx - 12, j.torsoTopY + 1, j.headCx + 6, j.torsoTopY + 24, trimRamp.mid, 4)
        g.line(j.headCx + 12, j.torsoTopY + 1, j.headCx - 2, j.torsoTopY + 18, trimRamp.dark, 3)
      }
      g.poly([
        [j.headCx - waistHalf, j.hipY],
        [j.headCx + waistHalf, j.hipY],
        [j.headCx + waistHalf + 10, j.hipY + 28],
        [j.headCx - waistHalf - 10, j.hipY + 28],
      ], trimRamp)
      g.line(j.headCx - waistHalf - 10, j.hipY + 28, j.headCx + waistHalf + 10, j.hipY + 28, '#fbbf24', 2)
    }

    if (spec.armorType === 'vanguard_fur_plate' || spec.armorType === 'aegis_plate') {
      g.poly([
        [j.headCx - 8, j.hipY],
        [j.headCx + 8, j.hipY],
        [j.headCx + 10, j.hipY + 28],
        [j.headCx, j.hipY + 33],
        [j.headCx - 10, j.hipY + 28],
      ], spec.armorType === 'vanguard_fur_plate' ? secRamp : topRamp)
      g.line(j.headCx - 8, j.hipY + 27, j.headCx, j.hipY + 33, trimRamp.hi, 2)
      g.line(j.headCx + 8, j.hipY + 27, j.headCx, j.hipY + 33, trimRamp.hi, 2)
    }

    // Ornate Waist Belt & Class Buckle
    g.shadedRect(j.headCx - waistHalf - 1, j.hipY - 6, (waistHalf + 1) * 2, 6, makeRamp('#5c3a21'))
    g.shadedRect(j.headCx - 4, j.hipY - 7, 8, 8, trimRamp)
    g.px(j.headCx, j.hipY - 3, '#fef08a')

    // Sleeves + Bracers/Gauntlets on Arms
    const sleeveRamp = topRamp
    const cuffRamp = trimRamp
    if (!j.isSide) {
      g.limbLine(j.mainShoulder.x, j.mainShoulder.y, j.mainElbow.x, j.mainElbow.y, sleeveRamp, 5.8)
      g.limbLine(j.mainElbow.x, j.mainElbow.y, j.mainHand.x, j.mainHand.y, pauldronRamp, 5.2)
      g.limbLine(j.offShoulder.x, j.offShoulder.y, j.offElbow.x, j.offElbow.y, sleeveRamp, 5.8)
      g.limbLine(j.offElbow.x, j.offElbow.y, j.offHand.x, j.offHand.y, pauldronRamp, 5.2)
      g.rect(j.mainHand.x - 4, j.mainHand.y - 6, 8, 4, cuffRamp.hi)
      g.rect(j.offHand.x - 4, j.offHand.y - 6, 8, 4, cuffRamp.hi)
    } else {
      g.limbLine(j.mainShoulder.x, j.mainShoulder.y, j.mainElbow.x, j.mainElbow.y, sleeveRamp, 6)
      g.limbLine(j.mainElbow.x, j.mainElbow.y, j.mainHand.x, j.mainHand.y, pauldronRamp, 5.4)
      g.rect(j.mainHand.x - 4, j.mainHand.y - 6, 8, 4, cuffRamp.hi)
    }

    // Sculpted Shoulder Pauldrons (wider RPG hero silhouette!)
    if (!j.isSide) {
      g.ellipse(j.mainShoulder.x - 2, j.mainShoulder.y + 1, 9, 7, pauldronRamp)
      g.ellipse(j.offShoulder.x + 2, j.offShoulder.y + 1, 9, 7, pauldronRamp)
      g.line(j.mainShoulder.x - 9, j.mainShoulder.y + 3, j.mainShoulder.x + 4, j.mainShoulder.y + 3, trimRamp.hi, 2)
      g.line(j.offShoulder.x - 4, j.offShoulder.y + 3, j.offShoulder.x + 9, j.offShoulder.y + 3, trimRamp.hi, 2)
    } else {
      g.ellipse(j.mainShoulder.x, j.mainShoulder.y + 1, 9, 7, pauldronRamp)
      g.line(j.mainShoulder.x - 7, j.mainShoulder.y + 3, j.mainShoulder.x + 7, j.mainShoulder.y + 3, trimRamp.hi, 2)
    }
  }

  // Neck Scarf / Fur Collar / Alchemist Straps
  if (spec.furCollar) {
    const furR = makeRamp(spec.furCollar)
    g.ellipse(j.headCx, j.torsoTopY + 1, j.isSide ? 14 : 23, 7, furR)
    g.ellipse(j.headCx - 16, j.torsoTopY + 2, 7, 6, furR)
    g.ellipse(j.headCx + 16, j.torsoTopY + 2, 7, 6, furR)
    g.px(j.headCx - 19, j.torsoTopY - 3, furR.spec)
    g.px(j.headCx + 19, j.torsoTopY - 3, furR.spec)
  }
  if (spec.scarfColor) {
    const scR = makeRamp(spec.scarfColor)
    g.ellipse(j.headCx, j.torsoTopY, j.isSide ? 13 : 18, 6, scR)
    g.poly([
      [j.headCx - 10, j.torsoTopY + 2],
      [j.headCx - 3, j.torsoTopY + 2],
      [j.headCx - 14 + pose.capeSway, j.torsoTopY + 22],
      [j.headCx - 21 + pose.capeSway, j.torsoTopY + 20],
    ], scR)
  }
  if (spec.armorType === 'alchemist_coat' && dir === 'down') {
    g.line(j.headCx - 12, j.torsoTopY + 2, j.headCx + 10, j.hipY - 4, '#78350f', 3)
    // Glowing green potion vials on belt
    g.rect(j.headCx + 5, j.hipY - 12, 4, 8, '#4ade80')
    g.rect(j.headCx + 10, j.hipY - 11, 4, 7, '#22c55e')
  }
  if (spec.quiver && (dir === 'up' || dir === 'down' || j.isSide)) {
    const qx = dir === 'down' ? j.headCx - 15 : j.isSide ? j.headCx - j.sign * 13 : j.headCx + 11
    g.shadedRect(qx - 4, j.torsoTopY - 11, 8, 17, makeRamp('#78350f'))
    g.px(qx - 2, j.torsoTopY - 14, '#f8fafc')
    g.px(qx + 1, j.torsoTopY - 15, '#fbbf24')
    g.px(qx + 3, j.torsoTopY - 13, '#ef4444')
  }

  if (spec.headgear === 'ranger_hood_open') {
    const hdR = makeRamp('#14532d')
    if (dir === 'up') {
      g.poly([[j.headCx - 19, j.headCy - 8], [j.headCx - 14, j.headCy - 19], [j.headCx + 14, j.headCy - 19], [j.headCx + 19, j.headCy - 8], [j.headCx + 18, j.headCy + 12], [j.headCx - 18, j.headCy + 12]], hdR)
    } else if (dir === 'down') {
      // Cowl framing neck/shoulders & upper crown behind face without touching eyes
      g.poly([[j.headCx - 20, j.torsoTopY + 5], [j.headCx - 18, j.headCy - 2], [j.headCx - 14, j.headCy + 10], [j.headCx + 14, j.headCy + 10], [j.headCx + 18, j.headCy - 2], [j.headCx + 20, j.torsoTopY + 5]], hdR)
      g.poly([[j.headCx - 19, j.headCy - 7], [j.headCx - 14, j.headCy - 19], [j.headCx + 14, j.headCy - 19], [j.headCx + 19, j.headCy - 7], [j.headCx + 14, j.headCy - 13], [j.headCx - 14, j.headCy - 13]], hdR)
    } else {
      const s = j.sign
      g.poly([[j.headCx - s * 17, j.torsoTopY + 4], [j.headCx - s * 19, j.headCy - 8], [j.headCx - s * 10, j.headCy - 19], [j.headCx + s * 6, j.headCy - 16], [j.headCx - s * 4, j.headCy - 11], [j.headCx - s * 11, j.headCy + 10]], hdR)
    }
  }

  if (dir === 'up') drawCape()
}

function drawHairAndHeadgear(g, j, pose, spec, dir) {
  if (pose.fallen >= 2) {
    const cy = pose.fallen === 2 ? 150 : pose.fallen === 3 ? 164 : 168
    const dirX = dir === 'up' ? -1 : dir === 'left' ? -1 : 1
    g.ellipse(j.cx + 24 * dirX, cy - 8, 16, 10, makeRamp(spec.hairColor))
    return
  }

  const hairRamp = makeRamp(spec.hairColor)
  const hx = j.headCx
  const hy = j.headCy

  // Lush RPG Hero Hair Silhouette (~48px spiky framing) keeping eye windows cleanly open
  if (dir === 'down') {
    // Raised crown dome (bottom stops at hy - 5, well above eyes at hy + 2!)
    g.ellipse(hx, hy - 12, 17, 7, hairRamp)
    g.poly([[hx - 18, hy - 9], [hx - 25, hy - 14], [hx - 13, hy - 17]], hairRamp)
    g.poly([[hx - 12, hy - 15], [hx - 14, hy - 26], [hx - 2, hy - 18]], hairRamp)
    g.poly([[hx - 3, hy - 17], [hx + 3, hy - 28], [hx + 9, hy - 16]], hairRamp)
    g.poly([[hx + 7, hy - 17], [hx + 18, hy - 24], [hx + 16, hy - 12]], hairRamp)
    g.poly([[hx + 14, hy - 11], [hx + 25, hy - 12], [hx + 17, hy - 4]], hairRamp)
    // Outer temple locks beside ears (at x <= hx-13 and x >= hx+13, clear of eyes at hx ± 6)
    g.poly([[hx - 17, hy - 8], [hx - 21, hy + 8], [hx - 13, hy + 3]], hairRamp)
    g.poly([[hx + 17, hy - 8], [hx + 21, hy + 8], [hx + 13, hy + 3]], hairRamp)
    // Parted forehead bangs (center spike between eyes, side locks above brows)
    g.poly([[hx - 14, hy - 9], [hx - 10, hy - 4], [hx - 5, hy - 9]], hairRamp)
    g.poly([[hx - 3, hy - 9], [hx, hy + 2], [hx + 3, hy - 9]], hairRamp)
    g.poly([[hx + 5, hy - 9], [hx + 10, hy - 4], [hx + 14, hy - 9]], hairRamp)
    // Hair highlight shine crescent
    g.line(hx - 10, hy - 13, hx + 9, hy - 14, hairRamp.hi, 2)
  } else if (dir === 'up') {
    g.ellipse(hx, hy - 3, 18, 17, hairRamp)
    g.poly([[hx - 15, hy - 13], [hx - 18, hy - 24], [hx - 6, hy - 17]], hairRamp)
    g.poly([[hx - 4, hy - 16], [hx + 2, hy - 26], [hx + 8, hy - 16]], hairRamp)
    g.poly([[hx + 6, hy - 16], [hx + 18, hy - 22], [hx + 16, hy - 10]], hairRamp)
    g.rect(hx - 13, hy + 8, 26, 6, hairRamp.deep)
  } else {
    const s = j.sign
    // Raised crown dome so side eye at hx + s*7, hy + 2 stays crisp & visible
    g.ellipse(hx - s * 3, hy - 11, 14, 8, hairRamp)
    g.poly([[hx - s * 14, hy - 10], [hx - s * 24, hy - 16], [hx - s * 10, hy - 18]], hairRamp)
    g.poly([[hx - s * 4, hy - 17], [hx + s * 2, hy - 27], [hx + s * 8, hy - 16]], hairRamp)
    g.poly([[hx + s * 5, hy - 14], [hx + s * 18, hy - 11], [hx + s * 10, hy - 4]], hairRamp)
    // Back nape lock behind ear
    g.poly([[hx - s * 13, hy - 6], [hx - s * 19, hy + 9], [hx - s * 7, hy + 6]], hairRamp)
    g.line(hx - s * 9, hy - 13, hx + s * 6, hy - 12, hairRamp.hi, 2)
  }

  // Shinkage high sweeping samurai ponytail
  if (spec.hairStyle === 'samurai_ponytail') {
    const tailDir = dir === 'left' ? 1 : -1
    const baseX = dir === 'up' ? hx : hx + tailDir * 13
    const baseY = hy - 13
    g.rect(baseX - 3, baseY - 2, 6, 5, '#dc2626')
    g.poly([
      [baseX, baseY],
      [baseX + tailDir * 17, baseY + 3],
      [baseX + tailDir * 22, baseY + 18],
      [baseX + tailDir * 12, baseY + 23],
      [baseX + tailDir * 7, baseY + 10],
    ], hairRamp)
  }

  // Class Headgear
  if (spec.headgear === 'royal_crown') {
    const gR = makeRamp('#fbbf24')
    g.shadedRect(hx - 14, hy - 22, 29, 7, gR)
    g.poly([[hx - 14, hy - 22], [hx - 12, hy - 31], [hx - 7, hy - 22]], gR)
    g.poly([[hx - 4, hy - 22], [hx, hy - 34], [hx + 4, hy - 22]], gR)
    g.poly([[hx + 7, hy - 22], [hx + 12, hy - 31], [hx + 14, hy - 22]], gR)
    g.ellipse(hx, hy - 19, 2.5, 2.5, '#ef4444')
    g.ellipse(hx - 8, hy - 19, 2, 2, '#38bdf8')
    g.ellipse(hx + 8, hy - 19, 2, 2, '#38bdf8')
  } else if (spec.headgear === 'alchemist_goggles') {
    const brR = makeRamp('#b45309')
    if (dir !== 'up') {
      g.rect(hx - 14, hy - 17, 28, 4, '#5c3a21')
      g.ellipse(hx - 6, hy - 16, 5, 4.5, brR)
      g.ellipse(hx + 6, hy - 16, 5, 4.5, brR)
      g.ellipse(hx - 6, hy - 16, 3, 2.5, '#4ade80')
      g.ellipse(hx + 6, hy - 16, 3, 2.5, '#4ade80')
      g.px(hx - 7, hy - 17, WHITE)
      g.px(hx + 5, hy - 17, WHITE)
    } else {
      g.rect(hx - 15, hy - 16, 30, 4, '#5c3a21')
    }
  }
}

function drawSwordLike(g, hx, hy, angleDeg, len, bladeW, bladeColor, guardColor, hiltColor = '#5c3a21') {
  const rad = (angleDeg * Math.PI) / 180
  const dx = Math.cos(rad)
  const dy = Math.sin(rad)
  const bRamp = makeRamp(bladeColor)
  const gRamp = makeRamp(guardColor)
  const perpX = -dy
  const perpY = dx

  // Pommel & Hilt
  g.line(hx - dx * 9, hy - dy * 9, hx + dx * 3, hy + dy * 3, hiltColor, 3)
  g.ellipse(hx - dx * 10, hy - dy * 10, 3, 3, gRamp)
  // Ornate Crossguard
  g.line(hx + dx * 2 - perpX * 8, hy + dy * 2 - perpY * 8, hx + dx * 2 + perpX * 8, hy + dy * 2 + perpY * 8, gRamp.hi, 3)
  // Tapered Double-Edged Blade with Fuller Highlight
  const tipX = hx + dx * len
  const tipY = hy + dy * len
  g.poly([
    [hx + dx * 3 - perpX * bladeW, hy + dy * 3 - perpY * bladeW],
    [hx + dx * (len - 8) - perpX * (bladeW * 0.75), hy + dy * (len - 8) - perpY * (bladeW * 0.75)],
    [tipX, tipY],
    [hx + dx * (len - 8) + perpX * (bladeW * 0.75), hy + dy * (len - 8) + perpY * (bladeW * 0.75)],
    [hx + dx * 3 + perpX * bladeW, hy + dy * 3 + perpY * bladeW],
  ], bRamp)
  g.line(hx + dx * 5, hy + dy * 5, hx + dx * (len - 7), hy + dy * (len - 7), bRamp.spec, 1)
}

function drawKatana(g, hx, hy, angleDeg, len, bladeColor, tsubaColor, hiltColor = '#991b1b', curveDir = 1) {
  const rad = (angleDeg * Math.PI) / 180
  const dx = Math.cos(rad)
  const dy = Math.sin(rad)
  const bRamp = makeRamp(bladeColor)
  const tRamp = makeRamp(tsubaColor)
  const perpX = -dy
  const perpY = dx

  // Long two-handed wrapped tsuka hilt + small round tsuba
  g.line(hx - dx * 12, hy - dy * 12, hx + dx * 2, hy + dy * 2, hiltColor, 3)
  g.px(hx - dx * 6, hy - dy * 6, '#18181b')
  g.px(hx - dx * 9, hy - dy * 9, '#18181b')
  g.ellipse(hx + dx * 3, hy + dy * 3, 2.5, 4.5, tRamp)

  // Gently curved single-edged katana blade
  const steps = Math.max(12, Math.round(len))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const dist = 4 + t * (len - 4)
    const bow = Math.pow(t, 1.7) * 5.5 * curveDir
    const px = hx + dx * dist + perpX * bow
    const py = hy + dy * dist + perpY * bow
    const w = t > 0.88 ? 1.1 : 2.1
    g.ellipse(px, py, w, w, bRamp.mid)
    if (t > 0.08 && t < 0.94) {
      g.px(px + perpX * curveDir * 1.4, py + perpY * curveDir * 1.4, bRamp.spec)
      g.px(px - perpX * curveDir * 1.2, py - perpY * curveDir * 1.2, bRamp.dark)
    }
  }
}

function drawScythe(g, hx, hy, angleDeg, bladeDir, len, bladeColor, shaftColor = '#334155') {
  const rad = (angleDeg * Math.PI) / 180
  const dx = Math.cos(rad)
  const dy = Math.sin(rad)
  const tipX = hx + dx * len
  const tipY = hy + dy * len
  const perpX = -dy * bladeDir
  const perpY = dx * bladeDir
  g.line(hx - dx * 18, hy - dy * 18, tipX, tipY, shaftColor, 3)
  g.ellipse(tipX, tipY, 3, 3, makeRamp('#94a3b8'))
  g.poly([
    [tipX, tipY],
    [tipX + perpX * 14 + dx * 6, tipY + perpY * 14 + dy * 6],
    [tipX + perpX * 26 - dx * 2, tipY + perpY * 26 - dy * 2],
    [tipX + perpX * 18 - dx * 12, tipY + perpY * 18 - dy * 12],
    [tipX + perpX * 6 - dx * 8, tipY + perpY * 6 - dy * 8],
  ], makeRamp(bladeColor))
  g.line(tipX + perpX * 25 - dx * 2, tipY + perpY * 25 - dy * 2, tipX + perpX * 12 + dx * 5, tipY + perpY * 12 + dy * 5, shiftColor(bladeColor, 0.45), 1)
}

function drawKiteShield(g, sx, sy, shieldColor, trimColor) {
  const sR = makeRamp(shieldColor)
  const tR = makeRamp(trimColor)
  g.poly([
    [sx - 14, sy - 14],
    [sx, sy - 18],
    [sx + 14, sy - 14],
    [sx + 13, sy + 7],
    [sx, sy + 24],
    [sx - 13, sy + 7],
  ], sR)
  // Gold outer rim & central cross emblem
  const pts = [[sx - 14, sy - 14], [sx, sy - 18], [sx + 14, sy - 14], [sx + 13, sy + 7], [sx, sy + 24], [sx - 13, sy + 7]]
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    g.line(a[0], a[1], b[0], b[1], tR.hi, 2)
  }
  g.line(sx, sy - 12, sx, sy + 16, tR.hi, 3)
  g.line(sx - 8, sy - 2, sx + 8, sy - 2, tR.hi, 3)
  g.ellipse(sx, sy - 2, 3, 3, tR.spec)
}

function drawWeaponAndEffects(g, j, pose, spec, dir) {
  if (pose.fallen >= 2) return
  const m = j.mainHand
  const o = j.offHand
  const sign = j.sign
  const baseDeg = dir === 'left' ? 180 - pose.mainArm.angleDeg : pose.mainArm.angleDeg
  const wColor = spec.weaponColor

  // Offhand gear (draw shield behind/offset cleanly on side views so main weapon remains clearly readable)
  if (spec.offhand === 'kite_shield_gold' || spec.offhand === 'kite_shield_blue') {
    const shX = dir === 'down' ? o.x + 5 : dir === 'up' ? o.x - 5 : o.x + sign * 11
    drawKiteShield(g, shX, o.y - 2, spec.shieldColor, spec.shieldTrim)
  } else if (spec.offhand === 'arcane_tome') {
    g.shadedRect(o.x - 4, o.y - 8, 12, 16, makeRamp('#581c87'))
    g.rect(o.x - 2, o.y - 6, 8, 12, '#fbbf24')
    g.rect(o.x, o.y - 4, 4, 8, '#3b0764')
  } else if (spec.offhand === 'twin_dagger_off' || spec.offhand === 'poison_dagger_off') {
    const dDeg = dir === 'down' ? 48 : dir === 'up' ? -45 : baseDeg - sign * 24
    drawSwordLike(g, o.x, o.y, dDeg, 22, 2.5, spec.offhand === 'poison_dagger_off' ? '#4ade80' : wColor, '#94a3b8')
  } else if (spec.offhand === 'fiery_gauntlet_off') {
    g.ellipse(o.x, o.y, 9, 9, makeRamp('#57534e'))
    g.ellipse(o.x, o.y - 4, 11, 11, makeRamp(wColor), { noOutline: true })
    g.poly([[o.x - 6, o.y - 10], [o.x, o.y - 21], [o.x + 6, o.y - 10]], '#fef08a', { noOutline: true })
  } else if (spec.offhand === 'soul_flame_orb') {
    // Necromancer dark grimoire + glowing soul flame orb
    g.shadedRect(o.x - 5, o.y - 3, 12, 14, makeRamp('#3b0764'))
    g.rect(o.x - 3, o.y - 1, 8, 10, '#a855f7')
    const ox = o.x + (dir === 'down' ? 4 : sign * 4)
    const oy = o.y - 17
    g.ellipse(ox, oy, 11, 12, [147, 51, 234, 140], { noOutline: true })
    g.ellipse(ox, oy, 7, 8, makeRamp('#c084fc'), { noOutline: true })
    g.poly([[ox - 4, oy - 4], [ox, oy - 14], [ox + 4, oy - 4]], '#f5d0fe', { noOutline: true })
    g.px(ox, oy - 2, WHITE, true)
  } else if (spec.offhand === 'royal_sword_off') {
    drawSwordLike(g, o.x, o.y, dir === 'down' ? 52 : baseDeg, 36, 3.2, '#e2e8f0', '#fbbf24')
  } else if (spec.offhand === 'demon_scythe_off') {
    const scDeg = dir === 'down' ? -45 : dir === 'up' ? -135 : baseDeg + sign * 25
    drawScythe(g, o.x, o.y, scDeg, 1, 40, wColor)
  } else if (spec.offhand === 'alchemy_vial_off') {
    g.ellipse(o.x, o.y + 1, 5, 6, makeRamp('#4ade80'))
    g.rect(o.x - 2, o.y - 7, 4, 4, '#cbd5e1')
  } else if (spec.offhand === 'coin_pouch_hand') {
    g.ellipse(o.x, o.y + 3, 6, 7, makeRamp('#d97706'))
    g.rect(o.x - 2, o.y - 3, 4, 2, '#fbbf24')
  }

  // Main Weapon
  switch (spec.weapon) {
    case 'starter_sword':
      drawSwordLike(g, m.x, m.y, dir === 'down' ? 132 : dir === 'up' ? -48 : baseDeg, 38, 3.4, wColor, '#fbbf24')
      break
    case 'vanguard_greatsword': {
      const vgDeg = dir === 'down' ? 138 : dir === 'up' ? -42 : baseDeg - sign * 24
      drawSwordLike(g, m.x, m.y, vgDeg, 46, 4.4, wColor, '#fbbf24', '#78350f')
      break
    }
    case 'curved_katana': {
      const kAngle = dir === 'down' ? 22 : dir === 'up' ? -32 : baseDeg
      drawKatana(g, m.x, m.y, kAngle, 52, wColor, '#fbbf24', '#991b1b', dir === 'left' ? -1 : 1)
      break
    }
    case 'twin_dagger_main':
      drawSwordLike(g, m.x, m.y, dir === 'down' ? 132 : baseDeg, 22, 2.5, wColor, '#94a3b8')
      break
    case 'golden_merchant_mace': {
      const mDeg = dir === 'down' ? 138 : baseDeg
      const rad = (mDeg * Math.PI) / 180
      const headX = m.x + Math.cos(rad) * 28
      const headY = m.y + Math.sin(rad) * 28
      g.line(m.x - Math.cos(rad) * 10, m.y - Math.sin(rad) * 10, headX, headY, '#5c3a21', 4)
      g.ellipse(headX, headY, 10, 9, makeRamp(wColor))
      g.ellipse(headX, headY, 5, 4, makeRamp('#fef08a'))
      break
    }
    case 'amethyst_orb_staff': {
      const stDeg = dir === 'down' ? -92 : dir === 'up' ? -88 : baseDeg - sign * 75
      const rad = (stDeg * Math.PI) / 180
      const topX = m.x + Math.cos(rad) * 38
      const topY = m.y + Math.sin(rad) * 38
      g.line(m.x - Math.cos(rad) * 28, m.y - Math.sin(rad) * 28, topX, topY, '#784421', 4)
      g.ellipse(topX, topY - 4, 10, 10, makeRamp('#fbbf24'))
      g.ellipse(topX, topY - 5, 6.5, 6.5, makeRamp(wColor), { noOutline: true })
      g.rect(topX - 2, topY - 8, 2, 2, WHITE, true)
      break
    }
    case 'sun_holy_scepter':
    case 'royal_ruby_scepter': {
      const stDeg = dir === 'down' ? -92 : dir === 'up' ? -88 : baseDeg - sign * 75
      const rad = (stDeg * Math.PI) / 180
      const topX = m.x + Math.cos(rad) * 38
      const topY = m.y + Math.sin(rad) * 38
      g.line(m.x - Math.cos(rad) * 28, m.y - Math.sin(rad) * 28, topX, topY, '#d97706', 4)
      g.ellipse(topX, topY - 4, 10, 10, makeRamp('#fbbf24'))
      g.ellipse(topX, topY - 4, 4.5, 4.5, spec.weapon === 'royal_ruby_scepter' ? '#ef4444' : '#38bdf8')
      for (let k = 0; k < 8; k++) {
        const ka = (k * Math.PI) / 4
        g.line(topX + Math.cos(ka) * 8, topY - 4 + Math.sin(ka) * 8, topX + Math.cos(ka) * 14, topY - 4 + Math.sin(ka) * 14, '#fef08a', 2)
      }
      break
    }
    case 'emerald_recurve_bow': {
      const bowX = dir === 'down' ? o.x + 4 : m.x + sign * 6
      const bowY = dir === 'down' ? o.y - 4 : m.y - 4
      const bRamp = makeRamp(wColor)
      const bowDir = dir === 'down' ? 1 : sign
      for (let t = -1.15; t <= 1.15; t += 0.08) {
        const bx = bowX + bowDir * Math.cos(t) * 12
        const by = bowY + Math.sin(t) * 26
        g.ellipse(bx, by, 2, 2, bRamp)
      }
      g.ellipse(bowX + bowDir * 5, bowY - 24, 3, 3, makeRamp('#fbbf24'))
      g.ellipse(bowX + bowDir * 5, bowY + 24, 3, 3, makeRamp('#fbbf24'))
      const pull = pose.slashPhase === 0 ? -8 : 0
      g.line(bowX + bowDir * 5, bowY - 24, bowX + bowDir * pull, bowY, '#e2e8f0', 1)
      g.line(bowX + bowDir * 5, bowY + 24, bowX + bowDir * pull, bowY, '#e2e8f0', 1)
      if (pose.slashPhase >= 0) {
        g.line(bowX + bowDir * pull, bowY, bowX + bowDir * 32, bowY, '#fef08a', 2, true)
      }
      break
    }
    case 'fiery_gauntlet_main': {
      g.ellipse(m.x, m.y, 9, 9, makeRamp('#57534e'))
      g.ellipse(m.x, m.y - 4, 11, 11, makeRamp(wColor), { noOutline: true })
      g.poly([[m.x - 6, m.y - 10], [m.x, m.y - 21], [m.x + 6, m.y - 10]], '#fef08a', { noOutline: true })
      break
    }
    case 'necro_grimoire': {
      drawSwordLike(g, m.x, m.y, dir === 'down' ? 132 : baseDeg, 36, 3.2, '#4c1d95', '#94a3b8')
      break
    }
    case 'demon_scythe_main':
    case 'poison_scythe': {
      const scDeg = dir === 'down' ? -135 : dir === 'up' ? -45 : baseDeg - sign * 35
      drawScythe(g, m.x, m.y, scDeg, -1, 40, wColor)
      break
    }
    case 'golden_lance': {
      const lDeg = dir === 'down' ? -90 : dir === 'up' ? -90 : baseDeg - sign * 55
      const rad = (lDeg * Math.PI) / 180
      const tipX = m.x + Math.cos(rad) * 48
      const tipY = m.y + Math.sin(rad) * 48
      g.line(m.x - Math.cos(rad) * 28, m.y - Math.sin(rad) * 28, tipX - Math.cos(rad) * 12, tipY - Math.sin(rad) * 12, '#784421', 4)
      g.poly([
        [tipX, tipY],
        [tipX - Math.cos(rad) * 16 - Math.sin(rad) * 5.5, tipY - Math.sin(rad) * 16 + Math.cos(rad) * 5.5],
        [tipX - Math.cos(rad) * 16 + Math.sin(rad) * 5.5, tipY - Math.sin(rad) * 16 - Math.cos(rad) * 5.5],
      ], makeRamp(wColor))
      break
    }
    case 'emerald_flask_main': {
      const fx = dir === 'down' ? o.x + 2 : m.x
      const fy = dir === 'down' ? o.y - 6 : m.y - 6
      g.ellipse(fx, fy, 9, 9, makeRamp(wColor))
      g.shadedRect(fx - 3, fy - 14, 6, 7, makeRamp('#cbd5e1'))
      g.rect(fx - 4, fy - 4, 3, 3, WHITE, true)
      g.ellipse(fx + 5, fy - 16, 2, 2, '#bbf7d0', { noOutline: true })
      break
    }
  }

  // Venomblade swirling continuous toxic poison chain loop
  if (spec.poisonChains) {
    const chCol = '#22c55e'
    let prevX = null, prevY = null
    for (let i = 0; i <= 18; i++) {
      const a = i * 0.34 + pose.capeSway * 0.16
      const px = j.headCx + Math.cos(a) * 32
      const py = j.hipY - 4 + Math.sin(a) * 19
      if (prevX !== null) {
        g.line(prevX, prevY, px, py, '#166534', 3, true)
        g.line(prevX, prevY, px, py, chCol, 1, true)
      }
      if (i % 2 === 0) {
        g.ellipse(px, py, 2.2, 2.2, '#4ade80', { noOutline: true })
        g.px(px, py, '#bbf7d0', true)
      }
      prevX = px
      prevY = py
    }
  }

  // Dynamic Attack Slash Arc VFX
  if (pose.slashPhase >= 0) {
    const sCol = parseHex(wColor)
    const arcX = dir === 'down' ? j.cx - 4 : dir === 'up' ? j.cx + 4 : j.cx + sign * 24
    const arcY = j.torsoTopY + 24
    const radSpan = 32
    const startA = dir === 'left' ? Math.PI - 0.9 : dir === 'right' ? -0.9 : dir === 'down' ? 0.2 : -2.6
    for (let t = startA; t <= startA + 1.8; t += 0.06) {
      const sx = arcX + Math.cos(t) * radSpan
      const sy = arcY + Math.sin(t) * radSpan
      g.ellipse(sx, sy, 2, 2, sCol, { noOutline: true })
      if (pose.slashPhase <= 1) {
        g.px(sx + Math.cos(t) * 2, sy + Math.sin(t) * 2, [255, 255, 255, 230], true)
      }
    }
  }

  // Dynamic Skill Cast Rune / Burst VFX
  if (pose.skillPhase >= 0) {
    const aura = parseHex(spec.auraColor)
    const ringR = pose.skillPhase === 0 ? 24 : pose.skillPhase <= 3 ? 36 : 28
    g.ellipse(j.cx, j.footY - 2, ringR, Math.round(ringR * 0.34), [...aura.slice(0, 3), 150], { noOutline: true })
    if (pose.skillPhase >= 1 && pose.skillPhase <= 4) {
      for (const [dx, dy] of [[-32, -26], [32, -34], [-28, 8], [30, 4]]) {
        const sx = j.cx + dx
        const sy = j.torsoTopY + dy + pose.bobY
        g.rect(sx - 1, sy - 1, 3, 3, WHITE, true)
        g.line(sx - 4, sy, sx + 4, sy, aura, 1, true)
        g.line(sx, sy - 4, sx, sy + 4, aura, 1, true)
      }
    }
  }

  if (pose.victorySparkle) {
    for (const [sx, sy] of [[j.cx - 28, j.headCy - 24], [j.cx + 28, j.headCy - 28], [j.cx + 22, j.torsoTopY - 12]]) {
      g.rect(sx - 1, sy - 1, 3, 3, '#fef08a', true)
      g.px(sx - 3, sy, WHITE, true)
      g.px(sx + 3, sy, WHITE, true)
    }
  }
}

// ---------------- Render Full 32x6 Sheet + Layers + Split PNGs ----------------
function generateAllClasses() {
  const summary = []
  for (const spec of Object.values(CLASS_DESIGNS)) {
    const charOutDir = path.join(CHAR_DIR, spec.id)
    const sheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4)
    const bodySheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4)
    const armorSheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4)
    const hairSheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4)
    const weaponSheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4)

    const actionsMeta = {}
    const headSockets = {}
    const handSockets = {}
    const backSockets = {}

    let rowIdx = 0
    for (const anim of ANIM_DEFS) {
      for (const dir of DIRS) {
        const key = `${anim.name}_${dir}`
        actionsMeta[key] = {
          row: rowIdx,
          frames: anim.frames,
          fps: anim.fps,
          baseFacing: dir === 'down' ? 'front' : dir === 'up' ? 'back' : dir,
        }
        headSockets[key] = []
        handSockets[key] = []
        backSockets[key] = []

        for (let f = 0; f < anim.frames; f++) {
          const pose = solvePose(anim.name, dir, f)
          const j = computeJoints(pose, dir)

          headSockets[key].push({ x: j.headCx, y: j.headCy, tiltDeg: pose.torsoLeanX * 1.5 })
          handSockets[key].push({
            main: { x: j.mainHand.x, y: j.mainHand.y, angleDeg: pose.mainArm.angleDeg },
            off: { x: j.offHand.x, y: j.offHand.y, angleDeg: pose.offArm.angleDeg },
          })
          backSockets[key].push({ x: j.headCx, y: j.torsoTopY + 20, bobY: pose.bobY })

          const gBody = new PixelGrid()
          drawBaseBody(gBody, j, pose, spec, dir, true)
          gBody.tintShift(pose.hitFlash)
          gBody.applyOutline()

          const gArmor = new PixelGrid()
          drawArmorLayer(gArmor, j, pose, spec, dir)
          gArmor.tintShift(pose.hitFlash)
          gArmor.applyOutline()

          const gHair = new PixelGrid()
          drawHairAndHeadgear(gHair, j, pose, spec, dir)
          gHair.tintShift(pose.hitFlash)
          gHair.applyOutline()

          const gWeapon = new PixelGrid()
          drawWeaponAndEffects(gWeapon, j, pose, spec, dir)
          gWeapon.applyOutline()

          const gFull = new PixelGrid()
          if (dir === 'up') {
            gFull.overlay(gWeapon)
            drawBaseBody(gFull, j, pose, spec, dir, true)
            drawArmorLayer(gFull, j, pose, spec, dir)
            drawHairAndHeadgear(gFull, j, pose, spec, dir)
          } else {
            drawBaseBody(gFull, j, pose, spec, dir, true)
            drawArmorLayer(gFull, j, pose, spec, dir)
            drawHairAndHeadgear(gFull, j, pose, spec, dir)
            gFull.overlay(gWeapon)
          }
          gFull.tintShift(pose.hitFlash)
          gFull.applyOutline()

          const blitToAtlas = (atlasBuf, frameBuf) => {
            const ox = f * FW
            const oy = rowIdx * FH
            for (let y = 0; y < FH; y++) {
              frameBuf.copy(atlasBuf, ((oy + y) * SHEET_W + ox) * 4, y * FW * 4, (y + 1) * FW * 4)
            }
          }

          blitToAtlas(sheetBuf, gFull.buf)
          blitToAtlas(bodySheetBuf, gBody.buf)
          blitToAtlas(armorSheetBuf, gArmor.buf)
          blitToAtlas(hairSheetBuf, gHair.buf)
          blitToAtlas(weaponSheetBuf, gWeapon.buf)

          writePng(path.join(charOutDir, anim.name, dir, `${f}.png`), FW, FH, gFull.buf)
          if (anim.name === 'idle' && dir === 'down' && f === 0) {
            writePng(path.join(charOutDir, 'portrait.png'), FW, FH, gFull.buf)
          }
        }
        rowIdx += 1
      }
    }

    writePng(path.join(charOutDir, 'sheet.png'), SHEET_W, SHEET_H, sheetBuf)
    writePng(path.join(charOutDir, 'body_sheet.png'), SHEET_W, SHEET_H, bodySheetBuf)
    writePng(path.join(charOutDir, 'armor_sheet.png'), SHEET_W, SHEET_H, armorSheetBuf)
    writePng(path.join(charOutDir, 'hair_sheet.png'), SHEET_W, SHEET_H, hairSheetBuf)
    writePng(path.join(charOutDir, 'weapon_sheet.png'), SHEET_W, SHEET_H, weaponSheetBuf)

    fs.writeFileSync(
      path.join(charOutDir, 'metadata.json'),
      JSON.stringify(
        {
          jobId: spec.id,
          className: spec.name,
          slug: spec.slug,
          frameWidth: FW,
          frameHeight: FH,
          cols: COLS,
          rows: ROWS,
          hdScale: 4,
          anchorX: 0.5,
          anchorY: 178 / FH,
          actions: actionsMeta,
          layers: ['sheet.png', 'body_sheet.png', 'armor_sheet.png', 'hair_sheet.png', 'weapon_sheet.png', 'portrait.png'],
          headSockets,
          handSockets,
          backSockets,
        },
        null,
        2,
      ),
    )
    summary.push(spec.id)
  }
  return summary
}

// ---------------- Modular Synchronized Fashion Layer Generator ----------------
const FASHION_LAYER_SPECS = [
  // Hats
  { id: 'hat_adventurer_beret', slot: 'hat', primary: '#2563eb', accent: '#fbbf24', style: 'beret' },
  { id: 'aurora_cat_hood', slot: 'hat', primary: '#f0abfc', accent: '#fef08a', style: 'cat_hood' },
  { id: 'hat_wizard_pointed', slot: 'hat', primary: '#4f46e5', accent: '#fbbf24', style: 'wizard' },
  { id: 'hat_sakura_ribbon', slot: 'hat', primary: '#f472b6', accent: '#fef08a', style: 'ribbon' },
  { id: 'hat_valkyrie_crown', slot: 'hat', primary: '#fbbf24', accent: '#e0f2fe', style: 'crown_wing' },
  { id: 'hat_santa_cap', slot: 'hat', primary: '#dc2626', accent: '#f8fafc', style: 'santa' },
  { id: 'hat_bunny_ears', slot: 'hat', primary: '#f8fafc', accent: '#f472b6', style: 'bunny' },
  { id: 'hat_demon_horns', slot: 'hat', primary: '#991b1b', accent: '#f43f5e', style: 'demon_horns' },
  { id: 'hat_prince_circlet', slot: 'hat', primary: '#fbbf24', accent: '#38bdf8', style: 'prince_crown' },
  { id: 'hat_academy_cap', slot: 'hat', primary: '#1e3a8a', accent: '#fbbf24', style: 'academy_cap' },

  // Hair Styles
  { id: 'hair_bronze_crest', slot: 'hair', primary: '#f59e0b', accent: '#fde68a', style: 'spiky' },
  { id: 'hair_crimson_spike', slot: 'hair', primary: '#ef4444', accent: '#fca5a5', style: 'spiky' },
  { id: 'hair_silver_lunar', slot: 'hair', primary: '#e2e8f0', accent: '#bae6fd', style: 'swept' },
  { id: 'hair_aurora_prism', slot: 'hair', primary: '#2dd4bf', accent: '#f0abfc', style: 'swept' },
  { id: 'hair_celestial_twintail', slot: 'hair', primary: '#f472b6', accent: '#fde68a', style: 'twintail' },
  { id: 'hair_samurai_topknot', slot: 'hair', primary: '#1e293b', accent: '#ef4444', style: 'ponytail' },

  // Costumes (Full themed outfits across all 9 themes!)
  { id: 'costume_adventurer_tunic', slot: 'costume', primary: '#059669', accent: '#fbbf24', style: 'tunic' },
  { id: 'costume_royal_knight', slot: 'costume', primary: '#2563eb', accent: '#fbbf24', style: 'plate' },
  { id: 'costume_starlight_mage', slot: 'costume', primary: '#6d28d9', accent: '#67e8f9', style: 'robe' },
  { id: 'costume_shadow_phantom', slot: 'costume', primary: '#1f2937', accent: '#f43f5e', style: 'tunic' },
  { id: 'costume_vip_gold_regalia', slot: 'costume', primary: '#d97706', accent: '#fef08a', style: 'robe' },
  { id: 'costume_sakura_kimono', slot: 'costume', primary: '#ec4899', accent: '#fde68a', style: 'kimono' },
  { id: 'costume_paladin_plate', slot: 'costume', primary: '#cbd5e1', accent: '#38bdf8', style: 'plate' },
  { id: 'costume_santa_claus', slot: 'costume', primary: '#dc2626', accent: '#f8fafc', style: 'santa' },
  { id: 'costume_neko_suit', slot: 'costume', primary: '#f472b6', accent: '#fef08a', style: 'neko' },
  { id: 'costume_bunny_suit', slot: 'costume', primary: '#312e81', accent: '#f472b6', style: 'bunny' },
  { id: 'costume_demon_lord', slot: 'costume', primary: '#18181b', accent: '#ef4444', style: 'demon' },
  { id: 'costume_royal_prince', slot: 'costume', primary: '#f8fafc', accent: '#3b82f6', style: 'prince' },
  { id: 'costume_academy_uniform', slot: 'costume', primary: '#1e293b', accent: '#e11d48', style: 'school' },
  { id: 'costume_lantern_festival', slot: 'costume', primary: '#ea580c', accent: '#fde047', style: 'kimono' },
  { id: 'costume_aurora_event', slot: 'costume', primary: '#0891b2', accent: '#f0abfc', style: 'robe' },

  // Pants
  { id: 'pants_traveler_slacks', slot: 'pants', primary: '#78350f', accent: '#d97706' },
  { id: 'pants_knight_greaves', slot: 'pants', primary: '#64748b', accent: '#fbbf24' },
  { id: 'pants_shadow_cargo', slot: 'pants', primary: '#27272a', accent: '#f43f5e' },
  { id: 'pants_celestial_hakama', slot: 'pants', primary: '#4338ca', accent: '#67e8f9' },

  // Shoes
  { id: 'shoes_leather_boots', slot: 'shoes', primary: '#92400e', accent: '#fbbf24' },
  { id: 'shoes_obsidian_sabatons', slot: 'shoes', primary: '#312e81', accent: '#a855f7' },
  { id: 'shoes_winged_hermes', slot: 'shoes', primary: '#38bdf8', accent: '#fef08a', winged: true },
  { id: 'shoes_royal_greaves', slot: 'shoes', primary: '#fbbf24', accent: '#ffffff' },

  // Back Accessories
  { id: 'back_crimson_cape', slot: 'back', primary: '#dc2626', accent: '#fbbf24', style: 'cape' },
  { id: 'back_explorer_pack', slot: 'back', primary: '#b45309', accent: '#67e8f9', style: 'pack' },
  { id: 'back_cherry_parasol', slot: 'back', primary: '#f472b6', accent: '#fef08a', style: 'parasol' },
  { id: 'back_astral_ring', slot: 'back', primary: '#38bdf8', accent: '#fbbf24', style: 'ring' },
  { id: 'back_demon_cape', slot: 'back', primary: '#450a0a', accent: '#ef4444', style: 'cape' },

  // Face / Neck Accessories
  { id: 'acc_crimson_scarf', slot: 'accessory', primary: '#ef4444', accent: '#fde68a', style: 'scarf' },
  { id: 'acc_scholar_glasses', slot: 'accessory', primary: '#fbbf24', accent: '#bae6fd', style: 'glasses' },
  { id: 'acc_fox_mask', slot: 'accessory', primary: '#f8fafc', accent: '#dc2626', style: 'fox_mask' },
  { id: 'acc_frost_earrings', slot: 'accessory', primary: '#38bdf8', accent: '#e0f2fe', style: 'earrings' },

  // Auras
  { id: 'sunfire_aura', slot: 'aura', primary: '#fb923c', accent: '#fde68a' },
  { id: 'aura_silver_mist', slot: 'aura', primary: '#cbd5e1', accent: '#e0f2fe' },
  { id: 'aura_frost_nova', slot: 'aura', primary: '#38bdf8', accent: '#e0f2fe' },
  { id: 'aura_celestial_gold', slot: 'aura', primary: '#fbbf24', accent: '#c084fc' },
  { id: 'aura_event_prism', slot: 'aura', primary: '#2dd4bf', accent: '#f472b6' },
]

function drawFashionItemFrame(g, item, j, pose, dir, f) {
  if (pose.fallen >= 2) return
  const pRamp = makeRamp(item.primary)
  const aRamp = makeRamp(item.accent)
  const hx = j.headCx
  const hy = j.headCy

  if (item.slot === 'hat') {
    if (item.style === 'beret' || item.style === 'academy_cap') {
      g.ellipse(hx, hy - 16, 18, 6, pRamp)
      g.rect(hx - 15, hy - 13, 30, 3, aRamp.mid)
      if (item.style === 'beret') g.line(hx - 8, hy - 20, hx - 16, hy - 26, aRamp.hi, 2)
      else g.rect(hx - 10, hy - 12, 20, 3, pRamp.deep)
    } else if (item.style === 'cat_hood') {
      g.ellipse(hx, hy - 14, 18, 7, pRamp)
      g.poly([[hx - 16, hy - 14], [hx - 10, hy - 29], [hx - 2, hy - 17]], pRamp)
      g.poly([[hx + 16, hy - 14], [hx + 10, hy - 29], [hx + 2, hy - 17]], pRamp)
      g.ellipse(hx - 10, hy - 21, 2.5, 3, '#fda4af')
      g.ellipse(hx + 10, hy - 21, 2.5, 3, '#fda4af')
    } else if (item.style === 'bunny') {
      g.rect(hx - 12, hy - 16, 25, 4, aRamp.mid)
      g.ellipse(hx - 8, hy - 30, 5, 14, pRamp)
      g.ellipse(hx + 8, hy - 30, 5, 14, pRamp)
      g.ellipse(hx - 8, hy - 30, 2.5, 9, aRamp)
      g.ellipse(hx + 8, hy - 30, 2.5, 9, aRamp)
    } else if (item.style === 'santa') {
      g.ellipse(hx, hy - 13, 18, 5, aRamp)
      g.poly([[hx - 16, hy - 15], [hx, hy - 34], [hx + 16, hy - 15]], pRamp)
      g.ellipse(hx + 12, hy - 27, 5, 5, aRamp)
    } else if (item.style === 'wizard') {
      g.ellipse(hx, hy - 12, 23, 5, pRamp)
      g.poly([[hx - 14, hy - 14], [hx - 4, hy - 38], [hx + 14, hy - 14]], pRamp)
      g.rect(hx - 14, hy - 16, 28, 3, aRamp.hi)
    } else if (item.style === 'ribbon') {
      g.poly([[hx - 16, hy - 19], [hx - 2, hy - 14], [hx - 14, hy - 10]], pRamp)
      g.poly([[hx + 16, hy - 19], [hx + 2, hy - 14], [hx + 14, hy - 10]], pRamp)
      g.ellipse(hx, hy - 14, 3.5, 3.5, aRamp)
    } else if (item.style === 'demon_horns') {
      g.line(hx - 10, hy - 14, hx - 18, hy - 30, pRamp.hi, 4)
      g.line(hx + 10, hy - 14, hx + 18, hy - 30, pRamp.hi, 4)
      g.ellipse(hx - 18, hy - 31, 2, 2, aRamp.spec)
      g.ellipse(hx + 18, hy - 31, 2, 2, aRamp.spec)
    } else if (item.style === 'crown_wing' || item.style === 'prince_crown') {
      g.shadedRect(hx - 13, hy - 20, 27, 5, pRamp)
      g.poly([[hx - 12, hy - 20], [hx - 10, hy - 27], [hx - 6, hy - 20]], pRamp)
      g.poly([[hx - 3, hy - 20], [hx, hy - 29], [hx + 3, hy - 20]], pRamp)
      g.poly([[hx + 6, hy - 20], [hx + 10, hy - 27], [hx + 12, hy - 20]], pRamp)
      g.ellipse(hx, hy - 18, 2, 2, aRamp.mid)
      if (item.style === 'crown_wing') {
        g.line(hx - 15, hy - 16, hx - 23, hy - 26, aRamp.spec, 3)
        g.line(hx + 15, hy - 16, hx + 23, hy - 26, aRamp.spec, 3)
      }
    }
    return
  }

  if (item.slot === 'hair') {
    drawHairAndHeadgear(g, j, pose, { hairColor: item.primary, hairStyle: item.style === 'ponytail' ? 'samurai_ponytail' : 'messy_spiky', headgear: 'none' }, dir)
    if (item.style === 'twintail') {
      g.poly([[hx - 17, hy - 8], [hx - 25, hy + 28], [hx - 17, hy + 30], [hx - 13, hy - 4]], pRamp)
      g.poly([[hx + 17, hy - 8], [hx + 25, hy + 28], [hx + 17, hy + 30], [hx + 13, hy - 4]], pRamp)
      g.ellipse(hx - 17, hy - 6, 3, 3, aRamp)
      g.ellipse(hx + 17, hy - 6, 3, 3, aRamp)
    }
    return
  }

  if (item.slot === 'costume') {
    const topHalf = j.isSide ? 13 : 18
    const waistHalf = j.isSide ? 11 : 14
    g.poly([
      [hx - topHalf, j.torsoTopY],
      [hx + topHalf, j.torsoTopY],
      [hx + waistHalf, j.hipY + 2],
      [hx - waistHalf, j.hipY + 2],
    ], pRamp)
    if (dir !== 'up') {
      if (item.style === 'santa') {
        g.rect(hx - 4, j.torsoTopY + 2, 8, 36, aRamp.hi)
        g.ellipse(hx, j.torsoTopY + 2, 17, 5, aRamp)
        g.rect(hx - waistHalf - 1, j.hipY - 6, (waistHalf + 1) * 2, 6, '#18181b')
        g.rect(hx - 4, j.hipY - 7, 8, 8, '#fbbf24')
      } else if (item.style === 'school') {
        g.poly([[hx - 6, j.torsoTopY + 1], [hx + 6, j.torsoTopY + 1], [hx, j.torsoTopY + 19]], '#f8fafc')
        g.rect(hx - 2, j.torsoTopY + 4, 4, 13, aRamp.mid)
      } else if (item.style === 'prince') {
        g.line(hx - 12, j.torsoTopY + 3, hx + 12, j.hipY - 6, aRamp.mid, 4)
        g.ellipse(j.mainShoulder.x, j.torsoTopY + 3, 8, 6, makeRamp('#fbbf24'))
        if (!j.isSide) g.ellipse(j.offShoulder.x, j.torsoTopY + 3, 8, 6, makeRamp('#fbbf24'))
      } else if (item.style === 'kimono') {
        g.line(hx - 11, j.torsoTopY + 2, hx + 6, j.torsoTopY + 24, aRamp.hi, 4)
        g.rect(hx - waistHalf, j.hipY - 7, waistHalf * 2, 7, aRamp.mid)
      } else if (item.style === 'neko' || item.style === 'bunny') {
        g.ellipse(hx, j.torsoTopY + 18, 9, 10, aRamp)
        if (dir === 'up' || j.isSide) {
          const tailX = j.isSide ? hx - j.sign * 15 : hx
          g.ellipse(tailX, j.hipY + 4, item.style === 'bunny' ? 6 : 4, 5, aRamp)
        }
      } else {
        g.line(hx - 10, j.torsoTopY + 3, hx, j.torsoTopY + 20, aRamp.hi, 2)
        g.line(hx + 10, j.torsoTopY + 3, hx, j.torsoTopY + 20, aRamp.hi, 2)
        g.rect(hx - waistHalf, j.hipY - 6, waistHalf * 2, 5, aRamp.dark)
      }
    }
    if (item.style === 'robe' || item.style === 'kimono' || item.style === 'santa' || item.style === 'demon') {
      g.poly([
        [hx - waistHalf, j.hipY - 2],
        [hx + waistHalf, j.hipY - 2],
        [hx + waistHalf + 8, j.hipY + 30],
        [hx - waistHalf - 8, j.hipY + 30],
      ], pRamp)
      if (item.style === 'santa') g.line(hx - waistHalf - 8, j.hipY + 30, hx + waistHalf + 8, j.hipY + 30, aRamp.hi, 4)
    }
    if (!j.isSide) {
      g.limbLine(j.mainShoulder.x, j.mainShoulder.y, j.mainElbow.x, j.mainElbow.y, pRamp, 5.5)
      g.limbLine(j.mainElbow.x, j.mainElbow.y, j.mainHand.x, j.mainHand.y - 3, pRamp, 5)
      g.limbLine(j.offShoulder.x, j.offShoulder.y, j.offElbow.x, j.offElbow.y, pRamp, 5.5)
      g.limbLine(j.offElbow.x, j.offElbow.y, j.offHand.x, j.offHand.y - 3, pRamp, 5)
    } else {
      g.limbLine(j.mainShoulder.x, j.mainShoulder.y, j.mainElbow.x, j.mainElbow.y, pRamp, 5.8)
      g.limbLine(j.mainElbow.x, j.mainElbow.y, j.mainHand.x, j.mainHand.y - 3, pRamp, 5.2)
    }
    return
  }

  if (item.slot === 'pants') {
    g.limbLine(j.legLx, j.hipY, j.kneeLX, Math.round((j.hipY + j.footLY) / 2), pRamp, 6.2)
    g.limbLine(j.kneeLX, Math.round((j.hipY + j.footLY) / 2), j.legLx, j.footLY - 16, pRamp, 5.8)
    g.limbLine(j.legRx, j.hipY, j.kneeRX, Math.round((j.hipY + j.footRY) / 2), pRamp, 6.2)
    g.limbLine(j.kneeRX, Math.round((j.hipY + j.footRY) / 2), j.legRx, j.footRY - 16, pRamp, 5.8)
    g.rect(hx - (j.isSide ? 12 : 16), j.hipY - 5, j.isSide ? 24 : 32, 4, aRamp.mid)
    return
  }

  if (item.slot === 'shoes') {
    const drawBootOnly = (lx, fy) => {
      const bTop = Math.max(j.hipY + 12, fy - 20)
      const bw = j.isSide ? 15 : 14
      g.shadedRect(lx - bw / 2, bTop, bw, fy - bTop, pRamp)
      g.rect(lx - bw / 2 - 1, bTop - 1, bw + 2, 4, aRamp.hi)
      if (item.winged) {
        g.line(lx - 7, bTop + 2, lx - 12, bTop - 3, WHITE, 2)
      }
    }
    drawBootOnly(j.legLx, j.footLY)
    drawBootOnly(j.legRx, j.footRY)
    return
  }

  if (item.slot === 'accessory') {
    if (item.style === 'scarf') {
      g.ellipse(hx, j.torsoTopY, j.isSide ? 13 : 18, 6, pRamp)
      g.line(hx - 8, j.torsoTopY + 3, hx - 15 + pose.capeSway, j.torsoTopY + 21, pRamp.dark, 5)
    } else if (item.style === 'glasses' && dir !== 'up') {
      if (dir === 'down') {
        g.rect(hx - 10, hy - 1, 8, 6, pRamp.hi)
        g.rect(hx + 3, hy - 1, 8, 6, pRamp.hi)
        g.rect(hx - 8, hy + 1, 4, 2, aRamp.spec)
        g.rect(hx + 5, hy + 1, 4, 2, aRamp.spec)
        g.rect(hx - 2, hy + 1, 5, 2, pRamp.mid)
      } else {
        g.rect(hx + j.sign * 4, hy - 1, 7, 6, pRamp.hi)
        g.rect(hx + j.sign * 5, hy + 1, 4, 2, aRamp.spec)
      }
    } else if (item.style === 'fox_mask' && dir !== 'up') {
      const mx = dir === 'down' ? hx + 12 : hx - j.sign * 4
      const my = hy - 13
      g.ellipse(mx, my, 8, 7, pRamp)
      g.poly([[mx - 6, my - 4], [mx - 4, my - 11], [mx - 1, my - 5]], pRamp)
      g.poly([[mx + 6, my - 4], [mx + 4, my - 11], [mx + 1, my - 5]], pRamp)
      g.rect(mx - 4, my - 1, 3, 2, aRamp.mid)
      g.rect(mx + 2, my - 1, 3, 2, aRamp.mid)
    } else if (item.style === 'earrings' && dir !== 'up') {
      if (dir === 'down') {
        g.ellipse(hx - 17, hy + 9, 2, 3, pRamp.spec)
        g.ellipse(hx + 17, hy + 9, 2, 3, pRamp.spec)
      } else {
        g.ellipse(hx - j.sign * 13, hy + 9, 2, 3, pRamp.spec)
      }
    }
    return
  }

  if (item.slot === 'back') {
    const sway = pose.capeSway * (j.isSide ? -j.sign : 1)
    if (item.style === 'cape') {
      if (dir === 'up' || dir === 'down') {
        g.poly([[hx - 20, j.torsoTopY + 3], [hx + 20, j.torsoTopY + 3], [hx + 32 + pose.capeSway, j.hipY + 30], [hx - 32 + pose.capeSway, j.hipY + 30]], pRamp)
      } else {
        const bx = hx - j.sign * 8
        g.poly([[bx, j.torsoTopY + 3], [bx - j.sign * 28 + sway, j.hipY + 30], [bx + j.sign * 4, j.hipY + 20]], pRamp)
      }
    } else if (item.style === 'pack') {
      const px = dir === 'up' ? hx : j.isSide ? hx - j.sign * 17 : hx - 21
      g.shadedRect(px - 11, j.torsoTopY + 4, 22, 28, pRamp)
      g.rect(px - 9, j.torsoTopY - 2, 18, 6, '#e7dec8')
    } else if (item.style === 'parasol') {
      const ox = hx + (dir === 'left' ? 18 : -18)
      const oy = j.torsoTopY - 10
      g.line(hx, j.hipY + 4, ox, oy, '#78350f', 3)
      g.ellipse(ox, oy, 20, 9, pRamp)
      g.ellipse(ox, oy - 10, 2, 3, aRamp)
    } else if (item.style === 'ring') {
      const a0 = f * 0.6
      for (let i = 0; i < 10; i++) {
        const a = a0 + (i * Math.PI) / 5
        g.ellipse(hx + Math.cos(a) * 28, j.torsoTopY + 16 + Math.sin(a) * 28, 2.5, 2.5, i % 2 === 0 ? pRamp.spec : aRamp.spec, { noOutline: true })
      }
    }
    return
  }

  if (item.slot === 'aura') {
    const col = parseHex(item.primary)
    const acc = parseHex(item.accent)
    g.ellipse(j.cx, j.footY - 2, 34, 10, [...col.slice(0, 3), 130], { noOutline: true })
    g.ellipse(j.cx, j.footY - 2, 22, 6, [...acc.slice(0, 3), 170], { noOutline: true })
    for (let i = 0; i < 6; i++) {
      const a = f * 0.9 + (i * Math.PI) / 3
      const ox = j.cx + Math.cos(a) * 32
      const oy = j.torsoTopY + 24 + Math.sin(a) * 34
      g.ellipse(ox, oy, 2.5, 2.5, i % 2 === 0 ? acc : col, { noOutline: true })
      g.px(ox, oy - 2, WHITE, true)
    }
  }
}

function generateFashionLayerSheets() {
  let count = 0
  for (const item of FASHION_LAYER_SPECS) {
    const atlas = Buffer.alloc(SHEET_W * SHEET_H * 4)
    let rowIdx = 0
    for (const anim of ANIM_DEFS) {
      for (const dir of DIRS) {
        for (let f = 0; f < anim.frames; f++) {
          const pose = solvePose(anim.name, dir, f)
          const j = computeJoints(pose, dir)
          const g = new PixelGrid()
          drawFashionItemFrame(g, item, j, pose, dir, f)
          if (item.slot !== 'aura') g.applyOutline()
          const ox = f * FW
          const oy = rowIdx * FH
          for (let y = 0; y < FH; y++) {
            g.buf.copy(atlas, ((oy + y) * SHEET_W + ox) * 4, y * FW * 4, (y + 1) * FW * 4)
          }
        }
        rowIdx += 1
      }
    }
    writePng(path.join(FASHION_LAYER_DIR, `${item.id}.png`), SHEET_W, SHEET_H, atlas)
    count++

    const iconPath = path.join(FASHION_ICON_DIR, `${item.id}.png`)
    if (!fs.existsSync(iconPath) || item.id.includes('santa') || item.id.includes('bunny') || item.id.includes('demon') || item.id.includes('prince') || item.id.includes('academy') || item.id.includes('neko_suit') || item.id.includes('lantern') || item.id.includes('aurora_event') || item.id.includes('aura_event')) {
      const ig = new PixelGrid(64, 64)
      const pRamp = makeRamp(item.primary)
      const aRamp = makeRamp(item.accent)
      if (item.slot === 'hat') {
        ig.ellipse(32, 38, 19, 9, pRamp)
        ig.poly([[18, 34], [32, 12], [46, 34]], pRamp)
        ig.rect(16, 34, 32, 6, aRamp.hi)
      } else if (item.slot === 'costume') {
        ig.shadedRect(18, 14, 28, 32, pRamp)
        ig.shadedRect(10, 16, 8, 20, pRamp)
        ig.shadedRect(46, 16, 8, 20, pRamp)
        ig.rect(18, 32, 28, 6, aRamp.hi)
      } else if (item.slot === 'back') {
        ig.poly([[18, 12], [46, 12], [52, 52], [12, 52]], pRamp)
        ig.rect(18, 12, 28, 4, aRamp.hi)
      } else if (item.slot === 'aura') {
        ig.ellipse(32, 32, 22, 22, pRamp, { noOutline: true })
        ig.ellipse(32, 32, 12, 12, aRamp, { noOutline: true })
      } else {
        ig.ellipse(32, 32, 19, 17, pRamp)
        ig.rect(24, 26, 16, 8, aRamp.hi)
      }
      if (item.slot !== 'aura') ig.applyOutline(INK, 2)
      writePng(iconPath, 64, 64, ig.buf)
    }
  }
  return count
}

function generateContactSheets() {
  // 1) 15-class preview (5x3)
  const cols = 5, rows = 3
  const out = Buffer.alloc(cols * FW * rows * FH * 4)
  for (let i = 0; i < out.length; i += 4) {
    out[i] = 20; out[i + 1] = 24; out[i + 2] = 38; out[i + 3] = 255
  }
  const ids = Object.keys(CLASS_DESIGNS)
  ids.forEach((id, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const spec = CLASS_DESIGNS[id]
    const pose = solvePose('idle', 'down', 0)
    const j = computeJoints(pose, 'down')
    const g = new PixelGrid()
    drawBaseBody(g, j, pose, spec, 'down', true)
    drawArmorLayer(g, j, pose, spec, 'down')
    drawHairAndHeadgear(g, j, pose, spec, 'down')
    const gw = new PixelGrid()
    drawWeaponAndEffects(gw, j, pose, spec, 'down')
    g.overlay(gw)
    g.applyOutline()
    for (let y = 0; y < FH; y++) {
      for (let x = 0; x < FW; x++) {
        const si = (y * FW + x) * 4
        const sa = g.buf[si + 3]
        if (sa === 0) continue
        const di = ((row * FH + y) * (cols * FW) + (col * FW + x)) * 4
        out[di] = g.buf[si]; out[di + 1] = g.buf[si + 1]; out[di + 2] = g.buf[si + 2]; out[di + 3] = 255
      }
    }
  })
  writePng('/tmp/pixel_quest_15_classes_preview.png', cols * FW, rows * FH, out)

  // 2) Fashion themes & 4-dir preview (6 cols x 2 rows)
  const fCols = 6, fRows = 2
  const fOut = Buffer.alloc(fCols * FW * fRows * FH * 4)
  for (let i = 0; i < fOut.length; i += 4) {
    fOut[i] = 20; fOut[i + 1] = 24; fOut[i + 2] = 38; fOut[i + 3] = 255
  }
  const combos = [
    { job: 'novice', hat: 'hat_santa_cap', costume: 'costume_santa_claus', dir: 'down', anim: 'idle', frame: 0 },
    { job: 'archer', hat: 'aurora_cat_hood', costume: 'costume_neko_suit', dir: 'right', anim: 'walk', frame: 1 },
    { job: 'mage', hat: 'hat_bunny_ears', costume: 'costume_bunny_suit', dir: 'down', anim: 'skill', frame: 2 },
    { job: 'sinister', hat: 'hat_demon_horns', costume: 'costume_demon_lord', back: 'back_demon_cape', dir: 'down', anim: 'attack', frame: 1 },
    { job: 'swordsman', hat: 'hat_prince_circlet', costume: 'costume_royal_prince', dir: 'left', anim: 'victory', frame: 2 },
    { job: 'kensei', hat: 'hat_academy_cap', costume: 'costume_academy_uniform', dir: 'down', anim: 'idle', frame: 0 },
    { job: 'cleric', hat: 'hat_valkyrie_crown', costume: 'costume_paladin_plate', dir: 'down', anim: 'idle', frame: 0 },
    { job: 'nekobaku', hat: 'hat_sakura_ribbon', costume: 'costume_lantern_festival', dir: 'down', anim: 'idle', frame: 0 },
    { job: 'mamushi', costume: 'costume_aurora_event', aura: 'aura_event_prism', dir: 'down', anim: 'idle', frame: 0 },
    { job: 'the_king', dir: 'up', anim: 'walk', frame: 2 },
    { job: 'iron_fist', dir: 'right', anim: 'attack', frame: 2 },
    { job: 'templar', dir: 'down', anim: 'death', frame: 4 },
  ]
  combos.forEach((c, idx) => {
    const col = idx % fCols
    const row = Math.floor(idx / fCols)
    const spec = CLASS_DESIGNS[c.job]
    const pose = solvePose(c.anim, c.dir, c.frame)
    const j = computeJoints(pose, c.dir)
    const g = new PixelGrid()
    const findItem = (id) => FASHION_LAYER_SPECS.find((x) => x.id === id)
    if (c.aura) drawFashionItemFrame(g, findItem(c.aura), j, pose, c.dir, c.frame)
    if (c.back && c.dir !== 'up') drawFashionItemFrame(g, findItem(c.back), j, pose, c.dir, c.frame)
    drawBaseBody(g, j, pose, spec, c.dir, true)
    if (c.costume) drawFashionItemFrame(g, findItem(c.costume), j, pose, c.dir, c.frame)
    else drawArmorLayer(g, j, pose, spec, c.dir)
    drawHairAndHeadgear(g, j, pose, spec, c.dir)
    if (c.hat) drawFashionItemFrame(g, findItem(c.hat), j, pose, c.dir, c.frame)
    if (c.back && c.dir === 'up') drawFashionItemFrame(g, findItem(c.back), j, pose, c.dir, c.frame)
    const gw = new PixelGrid()
    drawWeaponAndEffects(gw, j, pose, spec, c.dir)
    g.overlay(gw)
    g.applyOutline()
    for (let y = 0; y < FH; y++) {
      for (let x = 0; x < FW; x++) {
        const si = (y * FW + x) * 4
        const sa = g.buf[si + 3]
        if (sa === 0) continue
        const di = ((row * FH + y) * (fCols * FW) + (col * FW + x)) * 4
        fOut[di] = g.buf[si]; fOut[di + 1] = g.buf[si + 1]; fOut[di + 2] = g.buf[si + 2]; fOut[di + 3] = 255
      }
    }
  })
  writePng('/tmp/pixel_quest_fashion_preview.png', fCols * FW, fRows * FH, fOut)
}

const t0 = Date.now()
const chars = generateAllClasses()
const fashionCount = generateFashionLayerSheets()
generateContactSheets()
console.log(`Generated ${chars.length} HD hero classes (168x192 native pixel art, 160 split PNGs + 5 layered sheets + metadata each) and ${fashionCount} synchronized 32x6 fashion sheets in ${Date.now() - t0}ms.`)
