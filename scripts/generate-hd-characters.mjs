import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'

const OUT_ROOT = path.resolve(process.cwd(), 'public', 'assets', 'hd', 'characters')

const LOGICAL_W = 84
const LOGICAL_H = 96
const PIXEL_SCALE = 2
const FRAME_W = LOGICAL_W * PIXEL_SCALE // 168
const FRAME_H = LOGICAL_H * PIXEL_SCALE // 192
const ANCHOR_Y_LOGICAL = 89
const ANCHOR_Y = ANCHOR_Y_LOGICAL / LOGICAL_H // 178 / 192

export const DIRS = ['down', 'up', 'left', 'right']

export const ANIM_SPECS = {
  idle: { frames: 4, fps: 5, loop: true },
  walk: { frames: 6, fps: 10, loop: true },
  run: { frames: 6, fps: 14, loop: true },
  attack: { frames: 5, fps: 14, loop: false },
  skill: { frames: 6, fps: 12, loop: false },
  hit: { frames: 3, fps: 12, loop: false },
  death: { frames: 5, fps: 8, loop: false },
  victory: { frames: 5, fps: 10, loop: false },
}

const ANIM_ORDER = Object.keys(ANIM_SPECS)

// Exact 15 classes mapped to /lib/game/data.ts JOBS + Visual Reference Sheet (3x5)
export const CHARACTER_CONFIGS = [
  {
    jobId: 'novice',
    jobName: 'Wayfarer',
    thaiRoleLabel: 'ผู้ฝึกหัด',
    weaponType: 'sword',
    weaponStyle: 'novice_sword',
    weaponColor: '#cbd5e1',
    hair: '#3a261e',
    skin: '#f3c19d',
    eye: '#2d1e18',
    body: '#374151',
    armor: '#1f2937',
    legs: '#1e1b24',
    boots: '#3f2a21',
    accent: '#dc2626',
    cape: '#991b1b',
    scarf: '#dc2626',
    hairStyle: 'spiky',
    hatStyle: 'none',
    armorStyle: 'wayfarer_tunic',
    beltStyle: 'pouch',
    shield: null,
    beard: false,
    goggles: false,
    catEars: false,
    bareChest: false,
    offhandOrb: null,
    offhandFlask: null,
    offhandBook: false,
    quiver: false,
    vfxColor: '#fb7185',
    vfxSecondary: '#f97316',
  },
  {
    jobId: 'swordsman',
    jobName: 'Vanguard',
    thaiRoleLabel: 'นักดาบ',
    weaponType: 'sword',
    weaponStyle: 'vanguard_broadsword',
    weaponColor: '#e2e8f0',
    hair: '#2b211f',
    skin: '#f2bf9b',
    eye: '#1f2937',
    body: '#cbd5e1',
    armor: '#64748b',
    legs: '#334155',
    boots: '#475569',
    accent: '#eab308',
    cape: '#f1f5f9',
    furTrim: '#e2e8f0',
    scarf: '#b91c1c',
    hairStyle: 'spiky',
    hatStyle: 'fur_mantle',
    armorStyle: 'vanguard_plate',
    beltStyle: 'plated',
    shield: { base: '#475569', rim: '#eab308', crest: '#facc15' },
    beard: true,
    goggles: false,
    catEars: false,
    bareChest: false,
    offhandOrb: null,
    offhandFlask: null,
    offhandBook: false,
    quiver: false,
    vfxColor: '#f43f5e',
    vfxSecondary: '#fde047',
  },
  {
    jobId: 'mage',
    jobName: 'Arcanist',
    thaiRoleLabel: 'นักเวท',
    weaponType: 'staff',
    weaponStyle: 'arcane_orb_staff',
    weaponColor: '#c084fc',
    hair: '#2a1f24',
    skin: '#f3c29e',
    eye: '#7c3aed',
    body: '#5b21b6',
    armor: '#4c1d95',
    legs: '#2e1065',
    boots: '#3b0764',
    accent: '#fbbf24',
    cape: '#3b0764',
    scarf: '#a855f7',
    hairStyle: 'spiky',
    hatStyle: 'arcane_collar',
    armorStyle: 'arcanist_robe',
    beltStyle: 'gold_sash',
    shield: null,
    beard: true,
    goggles: false,
    catEars: false,
    bareChest: false,
    offhandOrb: null,
    offhandFlask: null,
    offhandBook: true,
    quiver: false,
    vfxColor: '#a855f7',
    vfxSecondary: '#38bdf8',
  },
  {
    jobId: 'archer',
    jobName: 'Windstalker',
    thaiRoleLabel: 'นักธนู',
    weaponType: 'bow',
    weaponStyle: 'wind_recurve_bow',
    weaponColor: '#ca8a04',
    hair: '#32251e',
    skin: '#f0bc96',
    eye: '#15803d',
    body: '#166534',
    armor: '#3f2e21',
    legs: '#3b2f24',
    boots: '#523a28',
    accent: '#86efac',
    cape: '#14532d',
    scarf: '#15803d',
    hairStyle: 'spiky',
    hatStyle: 'ranger_hood',
    armorStyle: 'ranger_coat',
    beltStyle: 'leather_strap',
    shield: null,
    beard: true,
    goggles: false,
    catEars: false,
    bareChest: false,
    offhandOrb: null,
    offhandFlask: null,
    offhandBook: false,
    quiver: true,
    vfxColor: '#4ade80',
    vfxSecondary: '#bef264',
  },
  {
    jobId: 'cleric',
    jobName: 'Luminary',
    thaiRoleLabel: 'นักบวช',
    weaponType: 'staff',
    weaponStyle: 'sun_cross_staff',
    weaponColor: '#facc15',
    hair: '#352620',
    skin: '#f5c7a3',
    eye: '#0284c7',
    body: '#f8fafc',
    armor: '#2563eb',
    legs: '#1e3a8a',
    boots: '#475569',
    accent: '#facc15',
    cape: '#dbeafe',
    scarf: '#facc15',
    hairStyle: 'spiky',
    hatStyle: 'halo_crest',
    armorStyle: 'luminary_vestment',
    beltStyle: 'gold_sash',
    shield: null,
    beard: false,
    goggles: false,
    catEars: false,
    bareChest: false,
    offhandOrb: null,
    offhandFlask: null,
    offhandBook: false,
    quiver: false,
    vfxColor: '#fef08a',
    vfxSecondary: '#80ed99',
  },
  {
    jobId: 'merchant',
    jobName: 'Goldweaver',
    thaiRoleLabel: 'พ่อค้า',
    weaponType: 'sword',
    weaponStyle: 'goldweaver_mace_blade',
    weaponColor: '#fbbf24',
    hair: '#34241c',
    skin: '#f2bf9b',
    eye: '#92400e',
    body: '#b45309',
    armor: '#92400e',
    legs: '#292524',
    boots: '#573722',
    accent: '#fbbf24',
    cape: '#78350f',
    scarf: '#f59e0b',
    hairStyle: 'spiky',
    hatStyle: 'none',
    armorStyle: 'goldweaver_coat',
    beltStyle: 'coin_pouches',
    shield: null,
    beard: false,
    goggles: false,
    catEars: false,
    bareChest: false,
    offhandOrb: null,
    offhandFlask: null,
    offhandBook: false,
    quiver: false,
    vfxColor: '#fbbf24',
    vfxSecondary: '#f59e0b',
  },
  {
    jobId: 'thief',
    jobName: 'Nightveil',
    thaiRoleLabel: 'โจร',
    weaponType: 'dagger',
    weaponStyle: 'nightveil_twin_daggers',
    weaponColor: '#cbd5e1',
    hair: '#1f1b24',
    skin: '#eec09d',
    eye: '#e11d48',
    body: '#27272a',
    armor: '#18181b',
    legs: '#18181b',
    boots: '#27272a',
    accent: '#e11d48',
    cape: '#18181b',
    scarf: '#dc2626',
    hairStyle: 'spiky',
    hatStyle: 'scarf_collar',
    armorStyle: 'nightveil_stealth',
    beltStyle: 'dagger_holster',
    shield: null,
    beard: false,
    goggles: false,
    catEars: false,
    bareChest: false,
    offhandOrb: null,
    offhandFlask: null,
    offhandBook: false,
    quiver: false,
    dualWield: true,
    vfxColor: '#e879f9',
    vfxSecondary: '#f43f5e',
  },
  {
    jobId: 'kensei',
    jobName: 'Shinkage',
    thaiRoleLabel: 'ปรมาจารย์ดาบเงา',
    weaponType: 'sword',
    weaponStyle: 'shinkage_katana',
    weaponColor: '#e2e8f0',
    hair: '#1e2430',
    skin: '#f3c19e',
    eye: '#0ea5e9',
    body: '#f8fafc',
    armor: '#991b1b',
    legs: '#1e293b',
    boots: '#334155',
    accent: '#38bdf8',
    cape: '#7f1d1d',
    scarf: '#dc2626',
    hairStyle: 'ponytail',
    hatStyle: 'none',
    armorStyle: 'shinkage_kimono',
    beltStyle: 'obi_sash',
    shield: null,
    beard: false,
    goggles: false,
    catEars: false,
    bareChest: false,
    offhandOrb: null,
    offhandFlask: null,
    offhandBook: false,
    quiver: false,
    vfxColor: '#38bdf8',
    vfxSecondary: '#93c5fd',
  },
  {
    jobId: 'iron_fist',
    jobName: 'Titanfist',
    thaiRoleLabel: 'จอมหมัดทลายปฐพี',
    weaponType: 'stick',
    weaponStyle: 'titanfist_gauntlets',
    weaponColor: '#fb923c',
    hair: '#2b201e',
    skin: '#eab287',
    eye: '#f97316',
    body: '#eab287',
    armor: '#9a3412',
    legs: '#1c1917',
    boots: '#f5f5f4',
    accent: '#f97316',
    cape: null,
    waistSashTail: '#b91c1c',
    scarf: '#ef4444',
    hairStyle: 'spiky',
    hatStyle: 'none',
    armorStyle: 'titanfist_brawler',
    beltStyle: 'martial_sash',
    shield: null,
    beard: false,
    goggles: false,
    catEars: false,
    bareChest: true,
    flameGauntlets: true,
    offhandOrb: null,
    offhandFlask: null,
    offhandBook: false,
    quiver: false,
    vfxColor: '#fb923c',
    vfxSecondary: '#fde047',
  },
  {
    jobId: 'wicked_necromancer',
    jobName: 'Grimcaller',
    thaiRoleLabel: 'จอมเวทคำสาปอเวจี',
    weaponType: 'staff',
    weaponStyle: 'grimcaller_void_staff',
    weaponColor: '#a855f7',
    hair: '#1e1b2e',
    skin: '#e5b8a4',
    eye: '#c084fc',
    body: '#2e1065',
    armor: '#18181b',
    legs: '#0f172a',
    boots: '#1e1b2e',
    accent: '#c084fc',
    cape: '#1e1b4b',
    scarf: '#6b21a8',
    hairStyle: 'spiky',
    hatStyle: 'grim_collar',
    armorStyle: 'grimcaller_runic',
    beltStyle: 'runic',
    shield: null,
    beard: false,
    goggles: false,
    catEars: false,
    bareChest: false,
    offhandOrb: '#c084fc',
    offhandFlask: null,
    offhandBook: false,
    quiver: false,
    vfxColor: '#c084fc',
    vfxSecondary: '#e879f9',
  },
  {
    jobId: 'the_king',
    jobName: 'High Sovereign',
    thaiRoleLabel: 'จอมราชันย์แห่งความมั่งคั่ง',
    weaponType: 'staff',
    weaponStyle: 'sovereign_scepter',
    weaponColor: '#facc15',
    hair: '#2b201c',
    skin: '#f3c19e',
    eye: '#f59e0b',
    body: '#991b1b',
    armor: '#eab308',
    legs: '#450a0a',
    boots: '#78350f',
    accent: '#facc15',
    cape: '#7f1d1d',
    scarf: '#fef3c7',
    hairStyle: 'royal',
    hatStyle: 'crown',
    armorStyle: 'sovereign_mantle',
    beltStyle: 'royal_ruby',
    shield: null,
    beard: false,
    goggles: false,
    catEars: false,
    bareChest: false,
    offhandOrb: null,
    offhandFlask: null,
    offhandBook: false,
    quiver: false,
    vfxColor: '#facc15',
    vfxSecondary: '#fb7185',
  },
  {
    jobId: 'sinister',
    jobName: 'Dreadfang',
    thaiRoleLabel: 'เพชฌฆาตเงาโลหิต',
    weaponType: 'dagger',
    weaponStyle: 'dreadfang_crescent_blades',
    weaponColor: '#a855f7',
    hair: '#171520',
    skin: '#e6b8a2',
    eye: '#f43f5e',
    body: '#1e1b2e',
    armor: '#2e1065',
    legs: '#09090b',
    boots: '#18181b',
    accent: '#a855f7',
    cape: '#3b0764',
    scarf: '#581c87',
    hairStyle: 'spiky',
    hatStyle: 'tattered_cowl',
    armorStyle: 'dreadfang_cloak',
    beltStyle: 'plated',
    shield: null,
    beard: false,
    goggles: false,
    catEars: false,
    bareChest: false,
    dualWield: true,
    tatteredCape: true,
    offhandOrb: null,
    offhandFlask: null,
    offhandBook: false,
    quiver: false,
    vfxColor: '#fb7185',
    vfxSecondary: '#a855f7',
  },
  {
    jobId: 'templar',
    jobName: 'Aegis Knight',
    thaiRoleLabel: 'อัศวินโล่ศักดิ์สิทธิ์',
    weaponType: 'sword',
    weaponStyle: 'aegis_holy_sword',
    weaponColor: '#fbbf24',
    hair: '#2a2220',
    skin: '#f3c3a0',
    eye: '#3b82f6',
    body: '#1d4ed8',
    armor: '#475569',
    legs: '#1e293b',
    boots: '#334155',
    accent: '#facc15',
    cape: '#1e40af',
    scarf: '#facc15',
    hairStyle: 'spiky',
    hatStyle: 'none',
    armorStyle: 'aegis_plate',
    beltStyle: 'gold_sash',
    shield: { base: '#1e3a8a', rim: '#facc15', crest: '#fef08a' },
    beard: false,
    goggles: false,
    catEars: false,
    bareChest: false,
    offhandOrb: null,
    offhandFlask: null,
    offhandBook: false,
    quiver: false,
    vfxColor: '#ffe08a',
    vfxSecondary: '#60a5fa',
  },
  {
    jobId: 'nekobaku',
    jobName: 'Pawchemist',
    thaiRoleLabel: 'นักเล่นแร่ระเบิดหูแมว',
    weaponType: 'staff',
    weaponStyle: 'pawchemist_catalyst',
    weaponColor: '#4ade80',
    hair: '#33241d',
    skin: '#f4c5a2',
    eye: '#22c55e',
    body: '#f8fafc',
    armor: '#574231',
    legs: '#44352a',
    boots: '#523726',
    accent: '#4ade80',
    cape: '#e2e8f0',
    scarf: '#22c55e',
    hairStyle: 'spiky',
    hatStyle: 'cat_goggles',
    armorStyle: 'pawchemist_coat',
    beltStyle: 'alchemist_vials',
    shield: null,
    beard: false,
    goggles: true,
    catEars: true,
    bareChest: false,
    offhandOrb: null,
    offhandFlask: '#4ade80',
    offhandBook: false,
    quiver: false,
    vfxColor: '#4ade80',
    vfxSecondary: '#f472b6',
  },
  {
    jobId: 'mamushi',
    jobName: 'Venomblade',
    thaiRoleLabel: 'นินจาเขี้ยวพิษ',
    weaponType: 'dagger',
    weaponStyle: 'mamushi_venom_scythe',
    weaponColor: '#4ade80',
    hair: '#1a202c',
    skin: '#ecc09f',
    eye: '#4ade80',
    body: '#1e1b4b',
    armor: '#064e3b',
    legs: '#0f172a',
    boots: '#18181b',
    accent: '#4ade80',
    cape: '#3b0764',
    scarf: '#22c55e',
    hairStyle: 'spiky',
    hatStyle: 'none',
    armorStyle: 'venomblade_shinobi',
    beltStyle: 'venom_chain',
    shield: null,
    beard: false,
    goggles: false,
    catEars: false,
    bareChest: false,
    venomChain: true,
    tatteredCape: true,
    offhandOrb: null,
    offhandFlask: null,
    offhandBook: false,
    quiver: false,
    vfxColor: '#4ade80',
    vfxSecondary: '#86efac',
  },
]

function hexToRgba(hex, alpha = 255) {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6)
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
    alpha,
  ]
}

function shade(hex, amt) {
  const [r, g, b] = hexToRgba(hex)
  const f = (c) =>
    Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)))
  return `#${[f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

function makeRamp(baseHex) {
  return {
    outline: shade(baseHex, -0.72),
    deep: shade(baseHex, -0.45),
    shadow: shade(baseHex, -0.24),
    base: baseHex,
    hi: shade(baseHex, 0.24),
    spec: shade(baseHex, 0.48),
  }
}

class PixelGrid {
  constructor(w = LOGICAL_W, h = LOGICAL_H) {
    this.w = w
    this.h = h
    this.rgba = new Uint8Array(w * h * 4)
    this.outlineProtect = new Uint8Array(w * h)
  }

  setPx(x, y, hex, alpha = 255, protectOutline = false) {
    const ix = Math.round(x)
    const iy = Math.round(y)
    if (ix < 0 || ix >= this.w || iy < 0 || iy >= this.h) return
    const idx = iy * this.w + ix
    const [r, g, b] = hexToRgba(hex, alpha)
    if (alpha >= 255) {
      this.rgba[idx * 4] = r
      this.rgba[idx * 4 + 1] = g
      this.rgba[idx * 4 + 2] = b
      this.rgba[idx * 4 + 3] = 255
    } else if (alpha > 0) {
      const dstA = this.rgba[idx * 4 + 3] / 255
      const srcA = alpha / 255
      const outA = srcA + dstA * (1 - srcA)
      if (outA > 0) {
        this.rgba[idx * 4] = Math.round((r * srcA + this.rgba[idx * 4] * dstA * (1 - srcA)) / outA)
        this.rgba[idx * 4 + 1] = Math.round((g * srcA + this.rgba[idx * 4 + 1] * dstA * (1 - srcA)) / outA)
        this.rgba[idx * 4 + 2] = Math.round((b * srcA + this.rgba[idx * 4 + 2] * dstA * (1 - srcA)) / outA)
        this.rgba[idx * 4 + 3] = Math.round(outA * 255)
      }
    }
    if (protectOutline) this.outlineProtect[idx] = 1
  }

  getAlpha(x, y) {
    const ix = Math.round(x)
    const iy = Math.round(y)
    if (ix < 0 || ix >= this.w || iy < 0 || iy >= this.h) return 0
    return this.rgba[(iy * this.w + ix) * 4 + 3]
  }

  fillRect(x, y, w, h, hex, alpha = 255) {
    const x0 = Math.round(x)
    const y0 = Math.round(y)
    const iw = Math.round(w)
    const ih = Math.round(h)
    for (let dy = 0; dy < ih; dy++) {
      for (let dx = 0; dx < iw; dx++) {
        this.setPx(x0 + dx, y0 + dy, hex, alpha)
      }
    }
  }

  fillEllipse(cx, cy, rx, ry, colorFn) {
    const x0 = Math.floor(cx - rx - 1)
    const x1 = Math.ceil(cx + rx + 1)
    const y0 = Math.floor(cy - ry - 1)
    const y1 = Math.ceil(cy + ry + 1)
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const nx = (x - cx) / Math.max(0.5, rx)
        const ny = (y - cy) / Math.max(0.5, ry)
        if (nx * nx + ny * ny <= 1.0) {
          const col = typeof colorFn === 'function' ? colorFn(nx, ny, x, y) : colorFn
          if (col) this.setPx(x, y, col)
        }
      }
    }
  }

  drawCapsule(x0, y0, x1, y1, radius, ramp, lightDx = -0.5, lightDy = -0.5) {
    const minX = Math.floor(Math.min(x0, x1) - radius - 1)
    const maxX = Math.ceil(Math.max(x0, x1) + radius + 1)
    const minY = Math.floor(Math.min(y0, y1) - radius - 1)
    const maxY = Math.ceil(Math.max(y0, y1) + radius + 1)
    const vx = x1 - x0
    const vy = y1 - y0
    const lenSq = vx * vx + vy * vy || 1
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const t = Math.max(0, Math.min(1, ((x - x0) * vx + (y - y0) * vy) / lenSq))
        const px = x0 + t * vx
        const py = y0 + t * vy
        const dx = x - px
        const dy = y - py
        const d = Math.hypot(dx, dy)
        if (d <= radius) {
          const nd = d / Math.max(0.5, radius)
          const dot = (dx * lightDx + dy * lightDy) / Math.max(0.5, radius)
          let col = ramp.base
          if (dot > 0.35 && nd < 0.8) col = ramp.hi
          else if (dot < -0.22 || nd > 0.85) col = ramp.shadow
          this.setPx(x, y, col)
        }
      }
    }
  }

  drawLine(x0, y0, x1, y1, hex, thick = 1, alpha = 255) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5))
    const r = (thick - 1) / 2
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const cx = x0 + (x1 - x0) * t
      const cy = y0 + (y1 - y0) * t
      if (thick <= 1.2) {
        this.setPx(cx, cy, hex, alpha)
      } else {
        for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
          for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
            if (dx * dx + dy * dy <= r * r + 0.35) {
              this.setPx(cx + dx, cy + dy, hex, alpha)
            }
          }
        }
      }
    }
  }

  fillTri(x0, y0, x1, y1, x2, y2, colorFn) {
    const minX = Math.floor(Math.min(x0, x1, x2))
    const maxX = Math.ceil(Math.max(x0, x1, x2))
    const minY = Math.floor(Math.min(y0, y1, y2))
    const maxY = Math.ceil(Math.max(y0, y1, y2))
    const area = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0)
    if (Math.abs(area) < 0.001) return
    const sign = area > 0 ? 1 : -1
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const w0 = ((x1 - x0) * (y - y0) - (y1 - y0) * (x - x0)) * sign
        const w1 = ((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)) * sign
        const w2 = ((x0 - x2) * (y - y2) - (y0 - y2) * (x - x2)) * sign
        if (w0 >= -0.25 && w1 >= -0.25 && w2 >= -0.25) {
          const col = typeof colorFn === 'function' ? colorFn(x, y) : colorFn
          if (col) this.setPx(x, y, col)
        }
      }
    }
  }

  // Adds crisp 1px dark exterior outline around opaque body pixels (skipping translucent VFX/protect pixels)
  applyExteriorOutline(outlineHex = '#140e1c', minAlphaForBody = 220) {
    const copy = new Uint8Array(this.rgba)
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const idx = y * this.w + x
        if (copy[idx * 4 + 3] > 0) continue
        let hasOpaqueNeighbor = false
        const dirs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]
        for (const [dx, dy] of dirs) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= this.w || ny < 0 || ny >= this.h) continue
          const nIdx = ny * this.w + nx
          if (copy[nIdx * 4 + 3] >= minAlphaForBody && !this.outlineProtect[nIdx]) {
            hasOpaqueNeighbor = true
            break
          }
        }
        if (hasOpaqueNeighbor) {
          const [r, g, b] = hexToRgba(outlineHex)
          this.rgba[idx * 4] = r
          this.rgba[idx * 4 + 1] = g
          this.rgba[idx * 4 + 2] = b
          this.rgba[idx * 4 + 3] = 255
        }
      }
    }
  }
}

function getDefaultWeaponRestAngle(cfg, dir) {
  const isSide = dir === 'left' || dir === 'right'
  const sideSign = dir === 'left' ? -1 : 1
  if (cfg.weaponType === 'staff') {
    return isSide ? (sideSign > 0 ? -82 : 262) : -88
  }
  if (cfg.weaponType === 'bow') {
    return isSide ? (sideSign > 0 ? -4 : 184) : -12
  }
  if (cfg.weaponType === 'dagger') {
    return isSide ? (sideSign > 0 ? 38 : 142) : 44
  }
  // sword / stick / mace held naturally angled downward-outward like RPG concept sheet
  return isSide ? (sideSign > 0 ? 34 : 146) : 40
}

function getPose(anim, dir, frame, cfg) {
  const isSide = dir === 'left' || dir === 'right'
  const sideSign = dir === 'left' ? -1 : dir === 'right' ? 1 : 0
  const baseAngle = getDefaultWeaponRestAngle(cfg, dir)
  const isStaff = cfg.weaponType === 'staff'
  const isBow = cfg.weaponType === 'bow'
  const isFist = Boolean(cfg.flameGauntlets)

  const pose = {
    bodyDx: 0,
    bodyDy: 0,
    torsoTiltX: 0,
    headDx: 0,
    headDy: 0,
    blink: false,
    painEyes: false,
    happyEyes: false,
    leftFoot: { dx: -5, dy: 0 },
    rightFoot: { dx: 5, dy: 0 },
    mainHand: { dx: isFist ? 12 : 12, dy: isFist ? 5 : isStaff ? 4 : 9 },
    offHand: { dx: isFist ? -12 : -12, dy: isFist ? 5 : 9 },
    weaponAngleDeg: baseAngle,
    capeSway: 0,
    capeLift: 0,
    hitFlash: false,
    slashPhase: -1,
    skillPhase: -1,
    victorySpark: false,
    dust: false,
    bowDraw: false,
    deathStage: -1,
  }

  if (isSide) {
    pose.leftFoot = { dx: -3 * sideSign, dy: 0 }
    pose.rightFoot = { dx: 3 * sideSign, dy: 0 }
    pose.mainHand = { dx: (isBow ? 9 : isFist ? 9 : 7) * sideSign, dy: isFist ? 4 : isStaff ? 4 : 8 }
    pose.offHand = { dx: (isBow ? 10 : -5) * sideSign, dy: isFist ? 3 : 8 }
  } else if (dir === 'up') {
    pose.mainHand = { dx: 12, dy: isStaff ? 4 : 8 }
    pose.offHand = { dx: -12, dy: 8 }
  }

  if (anim === 'idle') {
    const bob = [0, 1, 0.5, -0.5][frame % 4]
    pose.bodyDy = bob
    pose.headDy = bob
    pose.blink = frame === 2
    pose.capeSway = [0, 1, 2, 1][frame % 4]
    pose.mainHand.dy += [0, 1, 0, -1][frame % 4]
    pose.offHand.dy += [0, 0, 1, 0][frame % 4]
    if (!isSide) pose.weaponAngleDeg += [0, 3, 5, 2][frame % 4]
    else pose.weaponAngleDeg += sideSign * [0, 3, 5, 2][frame % 4]
  } else if (anim === 'walk') {
    const bob = [0, -1.5, -2.5, 0, -1.5, -2.5][frame % 6]
    pose.bodyDy = bob
    pose.headDy = bob
    pose.capeSway = [1, 2, 3, 2, 1, 2][frame % 6]
    if (isSide) {
      const f = frame % 6
      const stride = [6, 3, -1, -6, -3, 1][f]
      const liftR = [0, 0, -3, -1, -2, -1][f]
      const liftL = [-1, -2, -1, 0, 0, -3][f]
      pose.rightFoot = { dx: stride * sideSign, dy: liftR }
      pose.leftFoot = { dx: -stride * sideSign, dy: liftL }
      pose.mainHand.dx += -stride * 0.45 * sideSign
      pose.offHand.dx += stride * 0.45 * sideSign
      pose.weaponAngleDeg += sideSign * [-8, -3, 4, 9, 4, -3][f]
      pose.bodyDx = sideSign * [0, 1, 0, 0, 1, 0][f]
    } else {
      const f = frame % 6
      const lLift = [0, -3, -2, 0, 1, 0][f]
      const rLift = [0, 1, 0, 0, -3, -2][f]
      pose.leftFoot = { dx: -5, dy: lLift }
      pose.rightFoot = { dx: 5, dy: rLift }
      pose.mainHand.dy += [1, -1, -2, 1, 2, 0][f]
      pose.offHand.dy += [-1, 1, 2, -1, -2, 0][f]
      pose.weaponAngleDeg += [-5, -2, 3, 5, 2, -3][f]
    }
    if (frame === 0 || frame === 3) pose.dust = true
  } else if (anim === 'run') {
    const f = frame % 6
    const bob = [-1, -3, -4, -1, -3, -4][f]
    pose.bodyDy = bob
    pose.headDy = bob + 1
    pose.capeSway = [3, 5, 7, 4, 6, 7][f]
    pose.capeLift = -2
    pose.dust = true
    if (isSide) {
      pose.torsoTiltX = 3 * sideSign
      pose.headDx = 2 * sideSign
      pose.bodyDx = 2 * sideSign
      const stride = [8, 4, -2, -8, -4, 2][f]
      const rLift = [-1, 0, -4, -3, -2, -1][f]
      const lLift = [-3, -2, -1, -1, 0, -4][f]
      pose.rightFoot = { dx: stride * sideSign, dy: rLift }
      pose.leftFoot = { dx: -stride * sideSign, dy: lLift }
      pose.mainHand = { dx: (4 - stride * 0.55) * sideSign, dy: 6 }
      pose.offHand = { dx: (-3 + stride * 0.55) * sideSign, dy: 7 }
      pose.weaponAngleDeg = sideSign > 0 ? 18 + [10, 4, -6, -12, -4, 6][f] : 162 - [10, 4, -6, -12, -4, 6][f]
    } else {
      pose.headDy = bob + (dir === 'down' ? 1 : 0)
      pose.leftFoot = { dx: -5, dy: [0, -4, -3, 1, 0, -1][f] }
      pose.rightFoot = { dx: 5, dy: [1, 0, -1, 0, -4, -3][f] }
      pose.mainHand.dy += [-2, 1, 2, -2, 1, 2][f]
      pose.offHand.dy += [2, -1, -2, 2, -1, -2][f]
      pose.weaponAngleDeg += [-10, 0, 10, 14, 5, -5][f]
    }
  } else if (anim === 'attack') {
    const f = frame % 5
    pose.slashPhase = f
    if (isSide) {
      pose.bodyDx = sideSign * [-3, 2, 6, 4, 1][f]
      pose.headDx = sideSign * [-2, 2, 4, 3, 1][f]
      pose.bodyDy = [1, -1, 1, 1, 0][f]
      pose.headDy = pose.bodyDy
      pose.torsoTiltX = sideSign * [-2, 2, 3, 2, 0][f]
      pose.rightFoot = { dx: sideSign * [-1, 5, 7, 5, 3][f], dy: 0 }
      pose.leftFoot = { dx: sideSign * [-5, -4, -5, -4, -3][f], dy: 0 }
      pose.mainHand = { dx: sideSign * [-1, 8, 12, 9, 7][f], dy: [-4, -1, 4, 7, 7][f] }
      pose.offHand = { dx: sideSign * [-6, -2, -4, -5, -5][f], dy: [4, 5, 6, 6, 7][f] }
      const angs = isBow ? [-8, -2, 0, 4, -2] : [-125, -52, 16, 48, 32]
      pose.weaponAngleDeg = sideSign > 0 ? angs[f] : 180 - angs[f]
      pose.bowDraw = f === 0 || f === 1
      pose.capeSway = [0, 3, 5, 4, 1][f]
    } else if (dir === 'down') {
      pose.bodyDy = [1, -1, 2, 1, 0][f]
      pose.headDy = pose.bodyDy
      pose.leftFoot = { dx: -6, dy: [0, 0, 1, 0, 0][f] }
      pose.rightFoot = { dx: 6, dy: [0, -1, 2, 1, 0][f] }
      pose.mainHand = { dx: [12, 13, 6, -2, 11][f], dy: [-3, 1, 9, 10, 8][f] }
      pose.offHand = { dx: [-12, -13, -12, -11, -12][f], dy: [6, 7, 9, 8, 9][f] }
      pose.weaponAngleDeg = isBow ? [-25, -15, 0, 12, -10][f] : [-115, -42, 48, 86, 36][f]
      pose.bowDraw = f === 0 || f === 1
      pose.capeSway = [0, 2, 4, 3, 1][f]
    } else {
      pose.bodyDy = [1, -1, -2, -1, 0][f]
      pose.headDy = pose.bodyDy
      pose.mainHand = { dx: [12, 9, 3, -3, 11][f], dy: [6, -3, -6, -2, 7][f] }
      pose.weaponAngleDeg = [-20, -70, -115, -140, -35][f]
      pose.bowDraw = f === 0 || f === 1
      pose.capeSway = [0, 2, 4, 3, 1][f]
    }
  } else if (anim === 'skill') {
    const f = frame % 6
    pose.skillPhase = f
    const leap = [2, 1, -4, -6, -1, 0][f]
    pose.bodyDy = leap
    pose.headDy = leap
    pose.capeLift = [0, -1, -3, -4, -1, 0][f]
    pose.capeSway = [1, 3, 5, 6, 4, 1][f]
    if (isSide) {
      pose.bodyDx = sideSign * [-2, -1, 4, 6, 3, 0][f]
      pose.headDx = pose.bodyDx
      pose.mainHand = { dx: sideSign * [0, 4, 12, 14, 11, 7][f], dy: [2, -6, -2, 3, 7, 7][f] }
      pose.offHand = { dx: sideSign * [2, 5, -2, -5, -4, -5][f], dy: [3, -4, 3, 5, 6, 7][f] }
      const angs = [-75, -108, -32, 10, 35, 24]
      pose.weaponAngleDeg = sideSign > 0 ? angs[f] : 180 - angs[f]
      pose.bowDraw = f === 1 || f === 2
    } else {
      pose.leftFoot = { dx: -6, dy: [1, 1, -3, -4, 0, 0][f] }
      pose.rightFoot = { dx: 6, dy: [1, 1, -2, -3, 1, 0][f] }
      pose.mainHand = { dx: [11, 12, 13, 9, 7, 12][f], dy: [5, -6, -8, 1, 7, 8][f] }
      pose.offHand = { dx: [-11, -12, -13, -12, -11, -12][f], dy: [5, -5, -5, 2, 7, 8][f] }
      pose.weaponAngleDeg = [-28, -95, -80, 15, 45, 32][f]
      pose.bowDraw = f === 1 || f === 2
    }
  } else if (anim === 'hit') {
    const f = frame % 3
    pose.painEyes = f < 2
    pose.hitFlash = f === 0
    pose.capeSway = [4, 2, 1][f]
    if (isSide) {
      pose.bodyDx = sideSign * [-4, -3, -1][f]
      pose.headDx = sideSign * [-5, -3, -1][f]
      pose.torsoTiltX = sideSign * [-3, -2, 0][f]
      pose.bodyDy = [1, 2, 1][f]
      pose.headDy = pose.bodyDy + (f === 0 ? -1 : 1)
      pose.leftFoot = { dx: sideSign * [-5, -4, -3][f], dy: 0 }
      pose.rightFoot = { dx: sideSign * [4, 3, 3][f], dy: f === 0 ? -1 : 0 }
      pose.mainHand = { dx: sideSign * [2, 4, 6][f], dy: [8, 9, 7][f] }
      pose.offHand = { dx: sideSign * [-1, -3, -4][f], dy: [2, 5, 7][f] }
      pose.weaponAngleDeg = sideSign > 0 ? [48, 35, 22][f] : 180 - [48, 35, 22][f]
    } else {
      pose.bodyDy = [2, 3, 1][f]
      pose.headDy = pose.bodyDy
      pose.headDx = [1, -1, 0][f]
      pose.leftFoot = { dx: -6, dy: f === 0 ? -1 : 0 }
      pose.rightFoot = { dx: 6, dy: 0 }
      pose.mainHand = { dx: [14, 13, 12][f], dy: [7, 9, 8][f] }
      pose.offHand = { dx: [-14, -13, -12][f], dy: [3, 6, 8][f] }
      pose.weaponAngleDeg = [52, 62, 36][f]
    }
  } else if (anim === 'death') {
    const f = frame % 5
    pose.deathStage = f
    pose.painEyes = true
    pose.blink = f >= 2
    pose.capeSway = [2, 4, 5, 3, 2][f]
  } else if (anim === 'victory') {
    const f = frame % 5
    pose.happyEyes = f >= 1
    pose.victorySpark = f >= 1 && f <= 3
    const jump = [0, -5, -7, -1, 0][f]
    pose.bodyDy = jump
    pose.headDy = jump
    pose.capeSway = [1, 3, 5, 3, 1][f]
    pose.capeLift = [0, -3, -4, -1, 0][f]
    if (isSide) {
      pose.mainHand = { dx: sideSign * [7, 5, 4, 6, 7][f], dy: [6, -7, -10, -5, -2][f] }
      pose.offHand = { dx: sideSign * [-5, -6, -7, -5, -5][f], dy: [7, 2, 0, 5, 7][f] }
      const angs = [20, -82, -92, -75, -62]
      pose.weaponAngleDeg = sideSign > 0 ? angs[f] : 180 - angs[f]
      pose.leftFoot = { dx: -3 * sideSign, dy: f === 1 || f === 2 ? -2 : 0 }
      pose.rightFoot = { dx: 3 * sideSign, dy: f === 1 || f === 2 ? -1 : 0 }
    } else {
      pose.mainHand = { dx: [12, 12, 11, 11, 12][f], dy: [7, -6, -10, -5, -2][f] }
      pose.offHand = { dx: [-12, -13, -14, -12, -12][f], dy: [7, 1, -2, 4, 7][f] }
      pose.weaponAngleDeg = [25, -88, -92, -80, -68][f]
      pose.leftFoot = { dx: -5, dy: f === 1 || f === 2 ? -2 : 0 }
      pose.rightFoot = { dx: 5, dy: f === 1 || f === 2 ? -2 : 0 }
    }
  }

  return pose
}

function drawPixelWeapon(grid, hx, hy, weaponType, weaponStyle, weaponColor, angleDeg, cfg, opts = {}) {
  if (!weaponType) return
  if (weaponStyle === 'titanfist_gauntlets' && !opts.forceWeaponOverride) {
    return
  }
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const px = -sin
  const py = cos
  const ramp = makeRamp(weaponColor)
  const gold = makeRamp('#eab308')
  const wood = makeRamp('#784421')

  if (weaponType === 'sword') {
    const isKatana = weaponStyle === 'shinkage_katana'
    const isHammerBlade = weaponStyle === 'goldweaver_mace_blade'
    const len = isKatana ? 24 : weaponStyle === 'vanguard_broadsword' ? 23 : 21

    grid.drawLine(hx - cos * 4, hy - sin * 4, hx + cos * 2, hy + sin * 2, wood.base, 2)
    grid.setPx(hx - cos * 4.5, hy - sin * 4.5, gold.hi)

    if (isHammerBlade && !opts.forceWeaponOverride) {
      grid.drawLine(hx + cos * 2, hy + sin * 2, hx + cos * 15, hy + sin * 15, wood.base, 2.2)
      const mx = hx + cos * 17
      const my = hy + sin * 17
      grid.drawCapsule(mx - px * 5, my - py * 5, mx + px * 5, my + py * 5, 3.3, gold)
      grid.drawLine(mx - px * 4, my - py * 4, mx + px * 4, my + py * 4, gold.spec, 1)
    } else {
      grid.drawLine(hx + cos * 2 - px * 4, hy + sin * 2 - py * 4, hx + cos * 2 + px * 4, hy + sin * 2 + py * 4, gold.base, 2)
      grid.setPx(hx + cos * 2 - px * 4, hy + sin * 2 - py * 4, gold.hi)
      const steps = len
      for (let i = 3; i <= steps; i++) {
        const curve = isKatana ? Math.pow((i - 3) / steps, 1.8) * 3 : 0
        const bx = hx + cos * i + px * curve
        const by = hy + sin * i + py * curve
        const wFactor = i > steps - 4 ? 1 : isKatana ? 1.5 : 2.1
        grid.setPx(bx, by, ramp.base)
        if (wFactor >= 1.5) {
          grid.setPx(bx + px * 0.9, by + py * 0.9, ramp.spec)
          grid.setPx(bx - px * 0.9, by - py * 0.9, ramp.shadow)
        }
      }
      const tipX = hx + cos * (len + 1) + px * (isKatana ? 3 : 0)
      const tipY = hy + sin * (len + 1) + py * (isKatana ? 3 : 0)
      grid.setPx(tipX, tipY, '#ffffff')
      if (weaponStyle === 'aegis_holy_sword') {
        grid.setPx(hx + cos * 6, hy + sin * 6, '#38bdf8')
      }
    }
    return
  }

  if (weaponType === 'dagger') {
    const isScythe = (weaponStyle === 'dreadfang_crescent_blades' || weaponStyle === 'mamushi_venom_scythe') && !opts.forceWeaponOverride
    grid.drawLine(hx - cos * 3, hy - sin * 3, hx + cos * 2, hy + sin * 2, wood.base, 1.8)
    grid.drawLine(hx + cos * 1.5 - px * 2.5, hy + sin * 1.5 - py * 2.5, hx + cos * 1.5 + px * 2.5, hy + sin * 1.5 + py * 2.5, gold.base, 1.5)
    if (isScythe) {
      grid.drawLine(hx + cos * 2, hy + sin * 2, hx + cos * 15, hy + sin * 15, '#334155', 1.8)
      const tipX = hx + cos * 15
      const tipY = hy + sin * 15
      for (let i = 0; i <= 11; i++) {
        const t = i / 11
        const cx = tipX + px * (i * 0.95) - cos * (t * t * 6)
        const cy = tipY + py * (i * 0.95) - sin * (t * t * 6)
        grid.setPx(cx, cy, ramp.base)
        grid.setPx(cx + cos, cy + sin, ramp.spec)
        grid.setPx(cx - cos, cy - sin, ramp.shadow)
      }
    } else {
      grid.drawLine(hx + cos * 2, hy + sin * 2, hx + cos * 13, hy + sin * 13, ramp.shadow, 2)
      grid.drawLine(hx + cos * 2.5 + px * 0.6, hy + sin * 2.5 + py * 0.6, hx + cos * 13.5, hy + sin * 13.5, ramp.spec, 1)
    }
    return
  }

  if (weaponType === 'stick') {
    grid.drawLine(hx - cos * 6, hy - sin * 6, hx + cos * 19, hy + sin * 19, wood.base, 2.2)
    grid.drawLine(hx - cos * 5 + px * 0.6, hy - sin * 5 + py * 0.6, hx + cos * 18 + px * 0.6, hy + sin * 18 + py * 0.6, wood.hi, 1)
    grid.fillEllipse(hx + cos * 19, hy + sin * 19, 2.5, 2.2, wood.hi)
    grid.setPx(hx + cos * 20, hy + sin * 20, '#86efac')
    return
  }

  if (weaponType === 'staff') {
    const isGold = weaponStyle === 'sun_cross_staff' || weaponStyle === 'sovereign_scepter'
    const shaftRamp = isGold ? gold : wood
    // Upright long mage staff extending smoothly down to ground & high above shoulder
    grid.drawLine(hx - cos * 15, hy - sin * 15, hx + cos * 20, hy + sin * 20, shaftRamp.shadow, 2.3)
    grid.drawLine(hx - cos * 15 + px * 0.5, hy - sin * 15 + py * 0.5, hx + cos * 19 + px * 0.5, hy + sin * 19 + py * 0.5, shaftRamp.hi, 1)
    const ox = hx + cos * 22
    const oy = hy + sin * 22
    if (weaponStyle === 'sun_cross_staff' && !opts.forceWeaponOverride) {
      grid.fillEllipse(ox, oy, 4.2, 4.2, gold.base)
      grid.fillEllipse(ox, oy, 2.2, 2.2, '#38bdf8')
      grid.drawLine(ox - 5, oy, ox + 5, oy, gold.spec, 1.4)
      grid.drawLine(ox, oy - 5, ox, oy + 5, gold.spec, 1.4)
    } else if (weaponStyle === 'sovereign_scepter' && !opts.forceWeaponOverride) {
      grid.fillEllipse(ox, oy, 4.2, 4.2, gold.hi)
      grid.fillEllipse(ox, oy, 2.4, 2.4, '#ef4444')
      grid.setPx(ox - 1, oy - 1, '#ffffff')
      grid.setPx(ox + cos * 4.5, oy + sin * 4.5, gold.spec)
    } else {
      grid.fillEllipse(ox, oy, 4.4, 4.4, gold.base)
      grid.fillEllipse(ox, oy, 3.2, 3.2, ramp.base)
      grid.fillEllipse(ox - 0.8, oy - 0.8, 1.6, 1.6, ramp.spec)
      grid.setPx(ox - 1, oy - 1, '#ffffff')
    }
    return
  }

  if (weaponType === 'bow') {
    const bowRamp = makeRamp(weaponColor)
    const span = 12
    const topX = hx - cos * 3 + px * span
    const topY = hy - sin * 3 + py * span
    const botX = hx - cos * 3 - px * span
    const botY = hy - sin * 3 - py * span
    const midTopX = hx + cos * 4 + px * (span - 4)
    const midTopY = hy + sin * 4 + py * (span - 4)
    const midBotX = hx + cos * 4 - px * (span - 4)
    const midBotY = hy + sin * 4 - py * (span - 4)
    const gripX = hx + cos * 5
    const gripY = hy + sin * 5

    grid.drawLine(topX, topY, midTopX, midTopY, bowRamp.base, 2)
    grid.drawLine(midTopX, midTopY, gripX, gripY, bowRamp.hi, 2.2)
    grid.drawLine(gripX, gripY, midBotX, midBotY, bowRamp.base, 2.2)
    grid.drawLine(midBotX, midBotY, botX, botY, bowRamp.shadow, 2)
    grid.setPx(topX, topY, gold.spec)
    grid.setPx(botX, botY, gold.spec)

    const pullX = opts.bowDraw ? hx - cos * 6 : (topX + botX) / 2
    const pullY = opts.bowDraw ? hy - sin * 6 : (topY + botY) / 2
    grid.drawLine(topX, topY, pullX, pullY, '#e2e8f0', 1)
    grid.drawLine(botX, botY, pullX, pullY, '#e2e8f0', 1)
    if (opts.bowDraw || opts.slashPhase === 2) {
      grid.drawLine(pullX, pullY, hx + cos * 17, hy + sin * 17, '#fef08a', 1.3)
      grid.setPx(hx + cos * 18, hy + sin * 18, '#ffffff')
    }
  }
}

function drawShield(grid, sx, sy, shield, dir) {
  if (!shield) return
  const baseRamp = makeRamp(shield.base)
  const rimRamp = makeRamp(shield.rim)
  const w = dir === 'left' || dir === 'right' ? 4.4 : 6.0
  const h = 8.2
  grid.fillEllipse(sx, sy, w + 1.2, h + 1.2, '#140e1c')
  grid.fillEllipse(sx, sy, w + 0.4, h + 0.4, rimRamp.base)
  grid.fillEllipse(sx, sy, w - 0.8, h - 0.8, baseRamp.base)
  grid.fillEllipse(sx - 1, sy - 1.8, w * 0.52, h * 0.48, baseRamp.hi)
  grid.drawLine(sx, sy - 4.5, sx, sy + 4.5, shield.crest, 1.5)
  grid.drawLine(sx - 2.8, sy - 1, sx + 2.8, sy - 1, shield.crest, 1.4)
  grid.setPx(sx, sy - 1, '#ffffff')
}

function renderCharacterFrame(cfg, anim, dir, frame, includeWeapon = true) {
  const grid = new PixelGrid(LOGICAL_W, LOGICAL_H)
  const pose = getPose(anim, dir, frame, cfg)
  const isSide = dir === 'left' || dir === 'right'
  const sideSign = dir === 'left' ? -1 : dir === 'right' ? 1 : 0

  const skinRamp = makeRamp(cfg.skin)
  const hairRamp = makeRamp(cfg.hair)
  const bodyRamp = makeRamp(cfg.body)
  const armorRamp = makeRamp(cfg.armor)
  const legsRamp = makeRamp(cfg.legs)
  const bootRamp = makeRamp(cfg.boots)
  const capeRamp = makeRamp(cfg.cape ?? '#1f2937')
  const scarfRamp = makeRamp(cfg.scarf)
  const accentRamp = makeRamp(cfg.accent)
  const goldRamp = makeRamp('#eab308')

  if (pose.deathStage >= 0) {
    const st = pose.deathStage
    if (st <= 1) {
      const dropY = st === 0 ? 4 : 11
      const tilt = st === 0 ? -3 : -6
      const cx = 42 + (isSide ? -sideSign * 3 : 0)
      const hipY = 58 + dropY
      const torsoTopY = 39 + dropY
      const headCy = 27 + dropY

      if (cfg.cape) grid.drawCapsule(cx - 4 + tilt, torsoTopY + 3, cx - 10 + tilt, hipY + 11, 6, capeRamp)
      grid.drawCapsule(cx - 4, hipY, cx - 5, 81, 3.2, legsRamp)
      grid.drawCapsule(cx + 4, hipY, cx + 6, 84, 3.2, legsRamp)
      grid.fillRect(cx - 7, 81, 5, 4, bootRamp.base)
      grid.fillRect(cx + 4, 83, 5, 4, bootRamp.base)
      grid.drawCapsule(cx + tilt * 0.4, torsoTopY, cx, hipY, 7, bodyRamp)
      grid.fillRect(cx - 6 + tilt * 0.2, torsoTopY + 12, 12, 3, armorRamp.shadow)
      grid.fillEllipse(cx + tilt * 0.7, headCy, 8.2, 8.4, (nx, ny) => (ny > 0.35 ? skinRamp.shadow : skinRamp.base))
      grid.fillEllipse(cx + tilt * 0.7, headCy - 4, 9.2, 5.2, hairRamp.base)
      if (includeWeapon) {
        drawPixelWeapon(grid, cx + 9, hipY + 2, cfg.weaponType, cfg.weaponStyle, cfg.weaponColor, st === 0 ? 35 : 68, cfg)
      }
      grid.applyExteriorOutline('#140e1c')
      return { grid, handSocket: { x: (cx + 9) * PIXEL_SCALE, y: (hipY + 2) * PIXEL_SCALE, angleDeg: 68, behind: false }, headSocket: { x: (cx + tilt * 0.7) * PIXEL_SCALE, y: headCy * PIXEL_SCALE } }
    } else {
      const groundY = 82
      const dropProgress = st === 2 ? 0.45 : st === 3 ? 0.92 : 1.0
      const cx = 42
      const headX = cx - (dir === 'right' ? 14 : -14) * dropProgress
      const headY = groundY - (st === 2 ? 11 : 5)
      const feetX = cx + (dir === 'right' ? 15 : -15) * dropProgress
      const feetY = groundY - (st === 2 ? 3 : 1)

      if (cfg.cape) grid.drawCapsule(headX, headY + 2, feetX, feetY + 2, 5.5, capeRamp)
      grid.drawCapsule(cx + (feetX - cx) * 0.2, groundY - 3, feetX, feetY, 3.2, legsRamp)
      grid.fillEllipse(feetX, feetY, 3.5, 2.8, bootRamp.base)
      grid.drawCapsule(headX + (cx - headX) * 0.35, headY + 1, cx, groundY - 3, 6.2, bodyRamp)
      grid.drawCapsule(headX + (cx - headX) * 0.4, headY, cx - 1, groundY - 4, 4.5, armorRamp)
      grid.fillEllipse(headX, headY, 7.6, 7.2, skinRamp.base)
      grid.fillEllipse(headX - Math.sign(headX - cx || -1) * 1.5, headY - 3, 8.2, 4.8, hairRamp.base)
      const wx = cx - 2
      const wy = groundY + 1
      if (includeWeapon) {
        drawPixelWeapon(grid, wx, wy, cfg.weaponType, cfg.weaponStyle, cfg.weaponColor, dir === 'right' ? 8 : 172, cfg)
      }
      if (st === 3) {
        grid.fillEllipse(cx - 10, groundY + 3, 4, 2, '#cbd5e1')
        grid.fillEllipse(cx + 10, groundY + 3, 4, 2, '#cbd5e1')
      }
      grid.applyExteriorOutline('#140e1c')
      return { grid, handSocket: { x: wx * PIXEL_SCALE, y: wy * PIXEL_SCALE, angleDeg: 10, behind: false }, headSocket: { x: headX * PIXEL_SCALE, y: headY * PIXEL_SCALE } }
    }
  }

  const cx = 42 + Math.round(pose.bodyDx)
  const footGroundY = 89
  const hipY = 58 + Math.round(pose.bodyDy)
  const chestY = 44 + Math.round(pose.bodyDy)
  const shoulderY = 39 + Math.round(pose.bodyDy)
  const neckY = 36 + Math.round(pose.bodyDy)
  const headCy = 27 + Math.round(pose.headDy)
  const headCx = 42 + Math.round(pose.headDx)

  const lFootX = cx + Math.round(pose.leftFoot.dx)
  const lFootY = footGroundY + Math.round(pose.leftFoot.dy)
  const rFootX = cx + Math.round(pose.rightFoot.dx)
  const rFootY = footGroundY + Math.round(pose.rightFoot.dy)

  const mainHandX = cx + Math.round(pose.mainHand.dx)
  const mainHandY = chestY + Math.round(pose.mainHand.dy)
  const offHandX = cx + Math.round(pose.offHand.dx)
  const offHandY = chestY + Math.round(pose.offHand.dy)

  const capeDirOffset = isSide ? -sideSign * (5 + pose.capeSway) : 0
  const capeBotY = hipY + 22 + Math.round(pose.capeLift)

  const drawCape = () => {
    if (!cfg.cape) {
      if (cfg.waistSashTail) {
        const tailRamp = makeRamp(cfg.waistSashTail)
        const beltTop = hipY - 2
        const tailBot = hipY + 21 + Math.round(pose.capeLift)
        const dirOff = isSide ? -sideSign * (4 + pose.capeSway) : 0
        for (let y = beltTop; y <= tailBot; y++) {
          const t = (y - beltTop) / Math.max(1, tailBot - beltTop)
          const rowCx = cx + Math.round(dirOff * t)
          const hw = isSide ? Math.round(5 + t * 4) : Math.round(8 + t * 4)
          for (let x = rowCx - hw; x <= rowCx + hw; x++) {
            if (dir === 'down' && Math.abs(x - rowCx) <= 2 && t > 0.25) continue
            const edge = Math.abs(x - rowCx) / Math.max(1, hw)
            grid.setPx(x, y, edge > 0.72 || t > 0.85 ? tailRamp.shadow : tailRamp.base)
          }
        }
      }
      return
    }
    const topW = isSide ? 6 : 11
    const botW = isSide ? 10 : 14
    const sway = Math.round(pose.capeSway)
    for (let y = shoulderY; y <= capeBotY; y++) {
      const t = (y - shoulderY) / Math.max(1, capeBotY - shoulderY)
      if (cfg.tatteredCape && t > 0.72 && ((y + Math.round(t * 7)) % 3 === 0)) continue
      const rowCx =
        cx +
        Math.round(
          capeDirOffset * t +
            (isSide ? 0 : Math.sin(t * 2.5 + sway * 0.4) * (dir === 'up' ? 1.8 : 0.8)),
        )
      const hw = Math.round(topW + (botW - topW) * t)
      for (let x = rowCx - hw; x <= rowCx + hw; x++) {
        const edge = Math.abs(x - rowCx) / Math.max(1, hw)
        let col = capeRamp.base
        if (edge > 0.78 || t > 0.86) col = capeRamp.shadow
        else if (x < rowCx - hw * 0.2 && t < 0.65) col = capeRamp.hi
        if (Math.abs((x - rowCx) % 5) === 0 && t > 0.2) col = capeRamp.deep
        grid.setPx(x, y, col)
      }
    }
    if (cfg.armorStyle === 'sovereign_mantle' || cfg.armorStyle === 'arcanist_robe' || cfg.armorStyle === 'luminary_vestment') {
      grid.drawLine(cx + capeDirOffset - botW + 2, capeBotY - 1, cx + capeDirOffset + botW - 2, capeBotY - 1, goldRamp.base, 1.4)
    }
  }

  const drawLeg = (hipX, fX, fY, isFront) => {
    const kneeX = Math.round((hipX + fX) / 2 + (isSide ? sideSign * 1.6 : (hipX < cx ? -0.6 : 0.6)))
    const kneeY = Math.round((hipY + fY) / 2 - 1)
    const legR = isFront ? legsRamp : { ...legsRamp, base: legsRamp.shadow, hi: legsRamp.base, shadow: legsRamp.deep }
    const bootR = isFront ? bootRamp : { ...bootRamp, base: bootRamp.shadow, hi: bootRamp.base, shadow: bootRamp.deep }
    grid.drawCapsule(hipX, hipY - 1, kneeX, kneeY, cfg.bareChest ? 3.8 : 3.2, legR)
    grid.drawCapsule(kneeX, kneeY, fX, fY - 5, cfg.bareChest ? 3.4 : 2.9, legR)
    if (cfg.armorStyle.includes('plate') || cfg.armorStyle === 'wayfarer_tunic' || cfg.armorStyle === 'venomblade_shinobi') {
      grid.fillRect(kneeX - 2, kneeY - 2, 5, 3, armorRamp.hi)
      grid.drawLine(kneeX - 2, kneeY + 1, kneeX + 2, kneeY + 1, '#140e1c', 1)
    }
    if (cfg.bareChest) {
      grid.fillRect(fX - 3, fY - 7, 7, 3, '#f5f5f4')
      grid.fillRect(fX - 3, fY - 4, 7, 3, '#cbd5e1')
      grid.fillRect(fX - 3, fY - 1, 7, 1, '#475569')
      grid.setPx(kneeX, kneeY + 1, '#f97316')
    } else {
      grid.fillRect(fX - 3, fY - 7, 7, 2, bootR.hi)
      grid.fillRect(fX - 3, fY - 5, 7, 3, bootR.base)
      const toeX = isSide ? fX + sideSign * 3 : fX
      grid.fillRect(Math.min(fX - 3, toeX - 1), fY - 2, 7, 2, bootR.deep)
      grid.fillRect(fX - 3, fY, 7, 1, bootR.outline)
      if (isSide) grid.setPx(toeX, fY - 1, bootR.base)
    }
  }

  const drawTorsoAndArmor = () => {
    const torsoW = isSide ? 6.5 : 9.2
    const shoulderW = isSide ? 7.2 : 11.2
    if (
      cfg.armorStyle === 'arcanist_robe' ||
      cfg.armorStyle === 'luminary_vestment' ||
      cfg.armorStyle === 'sovereign_mantle' ||
      cfg.armorStyle === 'grimcaller_runic' ||
      cfg.armorStyle === 'pawchemist_coat' ||
      cfg.armorStyle === 'shinkage_kimono'
    ) {
      const robeBot = hipY + 16
      for (let y = hipY - 2; y <= robeBot; y++) {
        const t = (y - (hipY - 2)) / Math.max(1, robeBot - (hipY - 2))
        const hw = Math.round(torsoW + t * (isSide ? 3.5 : 4.5))
        for (let x = cx - hw; x <= cx + hw; x++) {
          const edge = Math.abs(x - cx) / Math.max(1, hw)
          let col = edge > 0.72 ? bodyRamp.shadow : x < cx ? bodyRamp.hi : bodyRamp.base
          if (dir === 'down') {
            if (cfg.armorStyle === 'luminary_vestment' && Math.abs(x - cx) <= 2) col = armorRamp.base
            else if (cfg.armorStyle === 'arcanist_robe' && Math.abs(x - cx) <= 2) col = '#3b0764'
            else if (cfg.armorStyle === 'shinkage_kimono' && Math.abs(x - cx) <= 4) col = armorRamp.base
            else if (cfg.armorStyle === 'sovereign_mantle' && Math.abs(x - cx) <= 3) col = '#7f1d1d'
            else if (cfg.armorStyle === 'pawchemist_coat' && Math.abs(x - cx) <= 3) col = legsRamp.base
          }
          grid.setPx(x, y, col)
        }
      }
      if (dir !== 'up') {
        grid.drawLine(cx - Math.round(torsoW + 2), robeBot - 1, cx + Math.round(torsoW + 2), robeBot - 1, accentRamp.base, 1.3)
        // Internal coat seam lines
        grid.drawLine(cx - 2, hipY, cx - 3, robeBot - 1, '#140e1c', 1)
        grid.drawLine(cx + 2, hipY, cx + 3, robeBot - 1, '#140e1c', 1)
      }
    }

    for (let y = shoulderY; y <= hipY; y++) {
      const t = (y - shoulderY) / Math.max(1, hipY - shoulderY)
      const hw = Math.round(shoulderW * (1 - t * 0.25))
      const rowCx = cx + Math.round(pose.torsoTiltX * (1 - t))
      for (let x = rowCx - hw; x <= rowCx + hw; x++) {
        const relX = (x - rowCx) / Math.max(1, hw)
        const ramp = cfg.bareChest ? skinRamp : bodyRamp
        let col = relX < -0.15 ? ramp.hi : relX > 0.45 ? ramp.shadow : ramp.base
        if (cfg.bareChest && dir === 'down') {
          if (y === shoulderY + 6 && Math.abs(x - rowCx) <= 5 && Math.abs(x - rowCx) >= 1) col = skinRamp.shadow
          if (Math.abs(x - rowCx) === 0 && y > shoulderY + 3 && y < hipY - 2) col = skinRamp.shadow
        }
        grid.setPx(x, y, col)
      }
    }

    if (cfg.bareChest) {
      // Titanfist martial shoulder harness & chest strap
      grid.drawLine(cx - 7, shoulderY, cx - 3, shoulderY + 7, '#451a03', 2)
      grid.drawLine(cx + 7, shoulderY, cx + 3, shoulderY + 7, '#451a03', 2)
      grid.setPx(cx - 5, shoulderY + 3, goldRamp.base)
      grid.setPx(cx + 5, shoulderY + 3, goldRamp.base)
    } else {
      const plateRamp = cfg.armorStyle.includes('plate') || cfg.armorStyle === 'sovereign_mantle' ? armorRamp : bodyRamp
      if (dir === 'down') {
        grid.fillRect(cx - 6, shoulderY + 2, 12, 9, plateRamp.base)
        grid.fillRect(cx - 5, shoulderY + 3, 5, 4, plateRamp.hi)
        grid.drawLine(cx - 6, shoulderY + 11, cx + 6, shoulderY + 11, '#140e1c', 1)
        if (cfg.armorStyle === 'aegis_plate' || cfg.armorStyle === 'vanguard_plate' || cfg.armorStyle === 'sovereign_mantle') {
          grid.fillRect(cx - 1, shoulderY + 3, 2, 7, goldRamp.base)
          grid.fillRect(cx - 4, shoulderY + 5, 8, 2, goldRamp.hi)
        } else if (cfg.armorStyle === 'wayfarer_tunic') {
          grid.fillRect(cx - 5, shoulderY + 3, 10, 7, '#2d333f')
          grid.drawLine(cx - 5, shoulderY + 1, cx + 5, hipY - 2, accentRamp.base, 1.8)
          grid.setPx(cx, shoulderY + 6, goldRamp.hi)
        } else if (cfg.armorStyle === 'pawchemist_coat') {
          grid.fillRect(cx - 3, shoulderY + 2, 6, 12, '#6b4423')
          grid.fillRect(cx - 6, shoulderY + 2, 3, 12, '#f8fafc')
          grid.fillRect(cx + 3, shoulderY + 2, 3, 12, '#f8fafc')
          grid.setPx(cx, shoulderY + 5, goldRamp.hi)
        } else if (cfg.armorStyle === 'shinkage_kimono') {
          grid.fillRect(cx - 6, shoulderY + 2, 12, 12, '#f8fafc')
          grid.drawLine(cx - 5, shoulderY + 1, cx + 2, shoulderY + 11, '#991b1b', 2)
          grid.drawLine(cx + 5, shoulderY + 1, cx - 1, shoulderY + 11, '#1e293b', 1.8)
        } else if (cfg.armorStyle === 'arcanist_robe') {
          grid.fillRect(cx - 2, shoulderY + 2, 4, 12, '#3b0764')
          grid.drawLine(cx - 3, shoulderY + 2, cx - 3, hipY - 1, goldRamp.base, 1)
          grid.drawLine(cx + 3, shoulderY + 2, cx + 3, hipY - 1, goldRamp.base, 1)
        } else if (cfg.armorStyle === 'luminary_vestment') {
          grid.fillRect(cx - 2, shoulderY + 2, 4, 12, '#2563eb')
          grid.drawLine(cx - 5, shoulderY + 4, cx + 5, shoulderY + 4, goldRamp.hi, 1.4)
          grid.drawLine(cx, shoulderY + 2, cx, shoulderY + 11, goldRamp.base, 1.2)
        }
      } else if (isSide) {
        grid.fillRect(cx - 5, shoulderY + 2, 10, 9, plateRamp.base)
        grid.fillRect(cx - 3 + sideSign * 2, shoulderY + 3, 4, 5, plateRamp.hi)
      }
    }

    if (cfg.furTrim) {
      grid.fillEllipse(cx, shoulderY + 1, isSide ? 8.5 : 12.5, 4.2, cfg.furTrim)
      grid.fillEllipse(cx - 5, shoulderY, 4.5, 2.6, '#ffffff')
      grid.fillEllipse(cx + 4, shoulderY, 4.5, 2.6, '#ffffff')
      grid.fillEllipse(cx, shoulderY + 2, 5.5, 2.8, '#e2e8f0')
      grid.drawLine(cx - 10, shoulderY + 4, cx + 10, shoulderY + 4, '#64748b', 1)
    }

    if (!cfg.bareChest) {
      const pR = cfg.armorStyle === 'goldweaver_coat' || cfg.armorStyle === 'sovereign_mantle' || cfg.armorStyle === 'luminary_vestment' ? goldRamp : armorRamp
      if (!isSide) {
        grid.fillEllipse(cx - 9, shoulderY + 2, 4.4, 3.6, pR.base)
        grid.fillEllipse(cx - 10, shoulderY + 1, 2.6, 2.0, pR.hi)
        grid.fillEllipse(cx + 9, shoulderY + 2, 4.4, 3.6, pR.base)
        grid.fillEllipse(cx + 8, shoulderY + 1, 2.6, 2.0, pR.hi)
        grid.setPx(cx - 9, shoulderY + 2, goldRamp.hi)
        grid.setPx(cx + 9, shoulderY + 2, goldRamp.hi)
      } else {
        grid.fillEllipse(cx + sideSign * 2, shoulderY + 2, 4.6, 3.6, pR.base)
        grid.fillEllipse(cx + sideSign * 2 - 1, shoulderY + 1, 2.6, 2, pR.hi)
        grid.setPx(cx + sideSign * 2, shoulderY + 2, goldRamp.hi)
      }
    }

    const beltY = hipY - 3
    grid.fillRect(cx - (isSide ? 6 : 8), beltY, isSide ? 12 : 16, 3, '#4a2c18')
    if (dir !== 'up') {
      grid.fillRect(cx - 2, beltY, 4, 3, goldRamp.base)
      grid.setPx(cx - 1, beltY + 1, goldRamp.spec)
    }
    if (cfg.beltStyle === 'coin_pouches') {
      grid.fillEllipse(cx - 7, beltY + 3, 2.5, 2.5, goldRamp.base)
      grid.fillEllipse(cx + 7, beltY + 3, 2.5, 2.5, goldRamp.hi)
    } else if (cfg.beltStyle === 'alchemist_vials') {
      grid.fillRect(cx - 6, beltY + 1, 2, 4, '#22c55e')
      grid.fillRect(cx + 5, beltY + 1, 2, 4, '#38bdf8')
    } else if (cfg.beltStyle === 'martial_sash' || cfg.beltStyle === 'obi_sash') {
      grid.fillRect(cx - (isSide ? 6 : 8), beltY - 1, isSide ? 12 : 16, 4, scarfRamp.base)
      grid.drawLine(cx - 2, beltY + 2, cx - 5, beltY + 11, scarfRamp.shadow, 2)
    }

    if (cfg.scarf && (cfg.armorStyle === 'wayfarer_tunic' || cfg.armorStyle === 'nightveil_stealth' || cfg.hatStyle === 'scarf_collar')) {
      grid.fillEllipse(cx, neckY + 2, isSide ? 6.5 : 8.8, 3.2, scarfRamp.base)
      grid.fillEllipse(cx - 2, neckY + 1, isSide ? 4 : 5, 1.6, scarfRamp.hi)
      if (dir === 'up' || isSide) {
        grid.drawLine(cx - sideSign * 4, neckY + 2, cx - sideSign * 11, neckY + 9, scarfRamp.shadow, 2.2)
      }
    }

    if (cfg.quiver && (dir === 'up' || isSide || dir === 'down')) {
      const qx = isSide ? cx - sideSign * 7 : cx - 8
      const qy = shoulderY - 3
      grid.drawLine(qx, qy, qx + (isSide ? sideSign * 3 : 4), shoulderY + 10, '#5c3820', 3.4)
      grid.setPx(qx - 1, qy - 2, '#f8fafc')
      grid.setPx(qx + 1, qy - 3, '#4ade80')
      grid.setPx(qx + 2, qy - 2, '#f8fafc')
    }
    if (cfg.hatStyle === 'grim_collar') {
      grid.fillEllipse(cx, neckY + 1, isSide ? 6 : 8.5, 3.2, '#1e1b2e')
      grid.fillRect(cx - 6, neckY - 2, 2, 4, '#4c1d95')
      grid.fillRect(cx + 4, neckY - 2, 2, 4, '#4c1d95')
    }
  }

  const drawHeadAndFace = () => {
    grid.fillRect(headCx - 2, neckY - 2, 5, 4, skinRamp.shadow)
    const rx = isSide ? 7.6 : 8.2
    const ry = 8.4

    if (cfg.hairStyle === 'ponytail') {
      if (dir === 'up') {
        grid.fillTri(headCx - 2, headCy + 2, headCx + 2, headCy + 2, headCx - 5, headCy + 14, hairRamp.shadow)
        grid.fillTri(headCx - 1, headCy + 3, headCx + 3, headCy + 3, headCx - 1, headCy + 15, hairRamp.base)
        grid.fillRect(headCx - 2, headCy + 1, 4, 2, accentRamp.base)
      } else if (isSide) {
        grid.fillTri(headCx - sideSign * 6, headCy - 4, headCx - sideSign * 4, headCy, headCx - sideSign * 14, headCy + 7, hairRamp.shadow)
        grid.fillTri(headCx - sideSign * 6, headCy - 5, headCx - sideSign * 5, headCy - 1, headCx - sideSign * 13, headCy + 4, hairRamp.base)
      } else {
        grid.fillTri(headCx - 7, headCy - 4, headCx - 7, headCy, headCx - 14, headCy + 7, hairRamp.shadow)
        grid.fillTri(headCx - 7, headCy - 5, headCx - 6, headCy - 1, headCx - 13, headCy + 4, hairRamp.base)
      }
    }

    if (dir === 'up') {
      grid.fillEllipse(headCx, headCy - 1, rx + 1.4, ry + 1.1, (nx, ny) =>
        ny < -0.35 ? hairRamp.hi : ny > 0.45 ? hairRamp.shadow : hairRamp.base,
      )
      // Tousled overlapping back clusters (no antenna sticks!)
      grid.fillTri(headCx - 8, headCy - 4, headCx - 3, headCy - 9, headCx - 9, headCy - 11, hairRamp.base)
      grid.fillTri(headCx - 4, headCy - 7, headCx + 2, headCy - 9, headCx - 2, headCy - 13, hairRamp.hi)
      grid.fillTri(headCx + 1, headCy - 8, headCx + 7, headCy - 6, headCx + 5, headCy - 12, hairRamp.base)
      grid.fillTri(headCx + 5, headCy - 5, headCx + 9, headCy - 1, headCx + 9, headCy - 9, hairRamp.shadow)
      // Nape tapered tips
      grid.fillTri(headCx - 6, headCy + 5, headCx - 2, headCy + 6, headCx - 5, headCy + 10, hairRamp.shadow)
      grid.fillTri(headCx + 2, headCy + 6, headCx + 6, headCy + 5, headCx + 5, headCy + 10, hairRamp.shadow)
    } else {
      // Sculpted anime-RPG jawline oval
      grid.fillEllipse(headCx, headCy, rx, ry, (nx, ny) => {
        if (ny > 0.72 && Math.abs(nx) > 0.62) return null
        if (ny > 0.56 || (isSide && nx * sideSign < -0.55)) return skinRamp.shadow
        if (ny < -0.15 && nx < 0.2) return skinRamp.hi
        return skinRamp.base
      })

      const eyeY = headCy + (pose.painEyes ? 1 : 0)
      if (dir === 'down') {
        const drawEye = (ex, isLeft) => {
          if (pose.blink) {
            grid.drawLine(ex - 1, eyeY, ex + 2, eyeY, '#1f141e', 1)
          } else if (pose.happyEyes) {
            grid.drawLine(ex - 1, eyeY, ex, eyeY - 1, '#1f141e', 1)
            grid.drawLine(ex, eyeY - 1, ex + 1, eyeY, '#1f141e', 1)
          } else if (pose.painEyes) {
            grid.drawLine(ex - 1, eyeY - 1, ex + 1, eyeY, '#1f141e', 1)
            grid.drawLine(ex + 1, eyeY, ex - 1, eyeY + 1, '#1f141e', 1)
          } else {
            grid.fillRect(ex - 1, eyeY - 1, 3, 2, '#fff9f5')
            grid.fillRect(ex + (isLeft ? 0 : -1), eyeY - 1, 2, 2, cfg.eye)
            grid.fillRect(ex - 1, eyeY - 1, 3, 1, '#18101c')
            grid.setPx(ex - 1, eyeY, '#ffffff')
          }
          grid.drawLine(ex - 1, eyeY - 3, ex + 1, eyeY - 3, hairRamp.base, 1)
        }
        drawEye(headCx - 3.5, true)
        drawEye(headCx + 3.5, false)
        grid.setPx(headCx, eyeY + 2, skinRamp.shadow)
        if (cfg.beard) {
          // Soft pixel-clustered chin beard along jawline (keeps upper lip clean!)
          grid.fillEllipse(headCx, headCy + 6.6, 4.4, 2.2, hairRamp.shadow)
          grid.fillEllipse(headCx, headCy + 7.2, 3.0, 1.5, hairRamp.base)
          grid.drawLine(headCx - 1, eyeY + 4, headCx + 1, eyeY + 4, skinRamp.deep, 1)
        } else {
          grid.drawLine(headCx - 1, eyeY + 4, headCx + 1, eyeY + 4, pose.happyEyes ? '#b91c1c' : skinRamp.deep, 1)
        }
      } else {
        const ex = headCx + sideSign * 4
        if (pose.blink) {
          grid.drawLine(ex - 1, eyeY, ex + 1, eyeY, '#1f141e', 1)
        } else if (pose.painEyes) {
          grid.drawLine(ex - 1, eyeY - 1, ex + 1, eyeY + 1, '#1f141e', 1)
        } else {
          grid.fillRect(ex - 1, eyeY - 1, 3, 2, '#fff9f5')
          grid.fillRect(ex + (sideSign > 0 ? 0 : -1), eyeY - 1, 2, 2, cfg.eye)
          grid.fillRect(ex - 1, eyeY - 1, 3, 1, '#18101c')
          grid.setPx(ex, eyeY, '#ffffff')
        }
        if (cfg.beard) {
          grid.fillEllipse(headCx + sideSign * 2, headCy + 6.5, 3.2, 2.0, hairRamp.shadow)
        } else {
          grid.setPx(ex + sideSign, eyeY + 4, skinRamp.deep)
        }
      }

      // Lush layered RPG hair crown + triangular bang tufts (no flat shelf, no cactus sticks!)
      grid.fillEllipse(headCx, headCy - 6.0, rx + 1.3, 4.4, (nx, ny) =>
        ny < -0.2 ? hairRamp.hi : hairRamp.base,
      )
      // Broad spiky crown volume (overlapping triangular tufts leaning naturally)
      grid.fillTri(headCx - 9, headCy - 4, headCx - 4, headCy - 8, headCx - 10, headCy - 10, hairRamp.base)
      grid.fillTri(headCx - 6, headCy - 6, headCx - 1, headCy - 9, headCx - 4, headCy - 13, hairRamp.hi)
      grid.fillTri(headCx - 2, headCy - 7, headCx + 4, headCy - 8, headCx + 1, headCy - 14, hairRamp.hi)
      grid.fillTri(headCx + 2, headCy - 7, headCx + 8, headCy - 5, headCx + 6, headCy - 12, hairRamp.base)
      grid.fillTri(headCx + 6, headCy - 4, headCx + 9, headCy - 1, headCx + 10, headCy - 8, hairRamp.shadow)
      if (dir === 'down') {
        // Curved side locks & pointed bangs framing brow
        grid.fillTri(headCx - 9, headCy - 6, headCx - 6, headCy - 4, headCx - 8, headCy + 3, hairRamp.shadow)
        grid.fillTri(headCx + 6, headCy - 4, headCx + 9, headCy - 6, headCx + 8, headCy + 3, hairRamp.shadow)
        grid.fillTri(headCx - 7, headCy - 6, headCx - 3, headCy - 6, headCx - 5, headCy - 2, hairRamp.base)
        grid.fillTri(headCx - 3, headCy - 7, headCx + 2, headCy - 7, headCx, headCy - 1, hairRamp.hi)
        grid.fillTri(headCx + 2, headCy - 6, headCx + 7, headCy - 6, headCx + 5, headCy - 2, hairRamp.base)
      } else {
        grid.fillRect(headCx - sideSign * 6, headCy - 5, 5, 9, hairRamp.shadow)
        grid.fillTri(headCx + sideSign * 1, headCy - 7, headCx + sideSign * 6, headCy - 5, headCx + sideSign * 7, headCy - 1, hairRamp.base)
      }
    }

    if (cfg.hatStyle === 'ranger_hood') {
      if (dir === 'up') {
        grid.fillEllipse(headCx, headCy - 1, rx + 2.2, ry + 2.0, capeRamp.base)
      } else {
        grid.fillEllipse(headCx - sideSign * 2, headCy - 6.5, rx + 2.2, 4.0, capeRamp.base)
        grid.drawLine(headCx - 8, headCy - 4, headCx - 8, headCy + 4, capeRamp.shadow, 2)
        grid.drawLine(headCx + 8, headCy - 4, headCx + 8, headCy + 4, capeRamp.shadow, 2)
      }
    } else if (cfg.hatStyle === 'crown') {
      const cy = headCy - 11
      grid.fillRect(headCx - 6, cy, 12, 3, goldRamp.base)
      grid.fillRect(headCx - 6, cy - 3, 2, 3, goldRamp.hi)
      grid.fillRect(headCx - 1, cy - 4, 3, 4, goldRamp.spec)
      grid.fillRect(headCx + 5, cy - 3, 2, 3, goldRamp.hi)
      grid.setPx(headCx, cy + 1, '#ef4444')
    } else if (cfg.hatStyle === 'cat_goggles') {
      grid.fillTri(headCx - 8, headCy - 7, headCx - 4, headCy - 9, headCx - 7, headCy - 14, hairRamp.base)
      grid.fillTri(headCx + 4, headCy - 9, headCx + 8, headCy - 7, headCx + 7, headCy - 14, hairRamp.base)
      grid.setPx(headCx - 6, headCy - 11, '#fda4af')
      grid.setPx(headCx + 6, headCy - 11, '#fda4af')
      if (dir !== 'up') {
        grid.fillRect(headCx - 6, headCy - 7, 4, 3, goldRamp.base)
        grid.fillRect(headCx + 2, headCy - 7, 4, 3, goldRamp.base)
        grid.fillRect(headCx - 5, headCy - 6, 2, 2, '#38bdf8')
        grid.fillRect(headCx + 3, headCy - 6, 2, 2, '#38bdf8')
      }
    }
  }

  const drawArmAndHand = (ax, ay, shoulderX, isFront, handGlow = null) => {
    const sleeveR = cfg.bareChest ? skinRamp : isFront ? bodyRamp : { ...bodyRamp, base: bodyRamp.shadow, hi: bodyRamp.base }
    const gloveR = handGlow ? makeRamp(handGlow) : makeRamp('#5c3c28')
    const elbowX = Math.round((shoulderX + ax) / 2 + (ax >= cx ? 2 : -2))
    const elbowY = Math.round((shoulderY + 2 + ay) / 2)
    grid.drawCapsule(shoulderX, shoulderY + 2, elbowX, elbowY, 2.3, sleeveR)
    grid.drawCapsule(elbowX, elbowY, ax, ay, 2.1, sleeveR)
    const gauntletSize = cfg.flameGauntlets ? 4.2 : 2.3
    grid.fillEllipse(ax, ay, gauntletSize, gauntletSize, gloveR.base)
    grid.setPx(ax - 1, ay - 1, gloveR.hi)
    if (cfg.flameGauntlets) {
      grid.setPx(ax + 2, ay - 3, '#fde047')
      grid.setPx(ax - 2, ay - 3, '#ef4444')
      grid.setPx(ax, ay - 4, '#ffffff')
      grid.setPx(ax - 1, ay + 2, '#b91c1c')
    }
  }

  const drawOffhandProps = () => {
    if (cfg.shield) {
      drawShield(grid, offHandX, offHandY - 3, cfg.shield, dir)
    } else if (cfg.offhandBook) {
      grid.fillRect(offHandX - 3, offHandY - 3, 6, 7, '#4c1d95')
      grid.fillRect(offHandX - 2, offHandY - 2, 4, 5, '#fef3c7')
      grid.setPx(offHandX, offHandY, '#fbbf24')
    } else if (cfg.offhandOrb) {
      const ox = offHandX - 2
      const oy = offHandY - 9 + Math.round(Math.sin(frame * 1.4))
      grid.fillEllipse(ox, oy, 3.6, 4.2, '#9333ea')
      grid.fillEllipse(ox, oy, 2.2, 2.6, '#e879f9')
      grid.setPx(ox, oy - 1, '#ffffff')
    } else if (cfg.offhandFlask) {
      grid.fillEllipse(offHandX, offHandY - 2, 3.6, 3.8, '#22c55e')
      grid.fillEllipse(offHandX - 1, offHandY - 3, 1.5, 1.5, '#bbf7d0')
      grid.fillRect(offHandX - 1, offHandY - 7, 2, 2, '#cbd5e1')
    } else if (cfg.dualWield && includeWeapon) {
      drawPixelWeapon(grid, offHandX, offHandY, cfg.weaponType, cfg.weaponStyle, cfg.weaponColor, dir === 'left' ? 145 : dir === 'right' ? 35 : 138, cfg)
    }
  }

  const drawSkillAndAttackVfx = () => {
    if (pose.slashPhase === 2 || pose.slashPhase === 3) {
      // Crisp pixel-art blade/shot slash arc
      const alpha = pose.slashPhase === 2 ? 235 : 135
      const reach = isSide ? 16 * sideSign : 0
      const reachY = dir === 'up' ? -15 : dir === 'down' ? 14 : 0
      const arcCx = mainHandX + reach * 0.45
      const arcCy = mainHandY + reachY * 0.35
      for (let a = -1.1; a <= 1.1; a += 0.14) {
        const baseA = dir === 'left' ? Math.PI : dir === 'up' ? -Math.PI / 2 : dir === 'down' ? Math.PI / 2 : 0
        const px = arcCx + Math.cos(baseA + a) * 14
        const py = arcCy + Math.sin(baseA + a) * 12
        grid.setPx(px, py, cfg.vfxColor, alpha, true)
        grid.setPx(px - Math.cos(baseA + a), py - Math.sin(baseA + a), '#ffffff', alpha, true)
      }
    }

    if (pose.skillPhase >= 1 && pose.skillPhase <= 4) {
      const f = pose.skillPhase
      const vAlpha = f === 3 ? 245 : f === 2 ? 210 : 145
      // Ground/body aura ring or class signature pixel burst
      const ringR = f === 1 ? 10 : f === 2 ? 15 : f === 3 ? 20 : 16
      for (let a = 0; a < Math.PI * 2; a += 0.25) {
        const rx = cx + Math.cos(a) * ringR
        const ry = footGroundY - 3 + Math.sin(a) * (ringR * 0.32)
        grid.setPx(rx, ry, cfg.vfxColor, vAlpha, true)
        if (f === 3) grid.setPx(rx, ry - 1, cfg.vfxSecondary, 180, true)
      }
      // Rising energy motes & impact cross star at apex frame 3
      if (f === 2 || f === 3) {
        const starX = isSide ? cx + sideSign * 16 : cx
        const starY = chestY - (dir === 'up' ? 14 : 2)
        grid.drawLine(starX - 8, starY, starX + 8, starY, cfg.vfxColor, 2, vAlpha)
        grid.drawLine(starX, starY - 8, starX, starY + 8, cfg.vfxColor, 2, vAlpha)
        grid.drawLine(starX - 4, starY - 4, starX + 4, starY + 4, '#ffffff', 1, vAlpha)
        grid.drawLine(starX - 4, starY + 4, starX + 4, starY - 4, '#ffffff', 1, vAlpha)
      }
    }

    if (pose.victorySpark) {
      const sparks = [
        [cx - 14, headCy - 8],
        [cx + 14, headCy - 10],
        [cx - 11, chestY - 6],
        [cx + 12, chestY + 2],
      ]
      for (let i = 0; i < sparks.length; i++) {
        if ((i + frame) % 2 === 0) {
          const [sx, sy] = sparks[i]
          grid.setPx(sx, sy, '#ffffff', 255, true)
          grid.setPx(sx - 1, sy, '#fde047', 230, true)
          grid.setPx(sx + 1, sy, '#fde047', 230, true)
          grid.setPx(sx, sy - 1, '#fde047', 230, true)
          grid.setPx(sx, sy + 1, '#fde047', 230, true)
        }
      }
    }

    if (pose.hitFlash) {
      // Sharp impact spark on chest
      grid.drawLine(cx - 5, chestY - 4, cx + 5, chestY + 4, '#ffffff', 1.4, 240)
      grid.drawLine(cx + 5, chestY - 4, cx - 5, chestY + 4, '#fb7185', 1.4, 240)
    }

    if (pose.dust) {
      const dx = isSide ? cx - sideSign * 6 : cx
      grid.fillEllipse(dx - 2, footGroundY, 2.2, 1.3, '#cbd5e1')
      grid.fillEllipse(dx + 2, footGroundY - 1, 1.5, 1, '#e2e8f0')
    }
  }

  // Depth-ordered composition per direction
  const mainWeaponBehind = dir === 'up' || (isSide && pose.weaponAngleDeg < -90)
  if (dir !== 'up') drawCape()

  if (cfg.venomChain) {
    // Mamushi glowing green poison chain behind/around silhouette
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7 + frame * 0.4
      const vx = cx + Math.cos(a) * 14
      const vy = chestY + 6 + Math.sin(a) * 10
      grid.setPx(vx, vy, '#22c55e', 220, true)
      grid.setPx(vx + 1, vy, '#bbf7d0', 180, true)
    }
  }

  if (mainWeaponBehind && includeWeapon) {
    drawPixelWeapon(grid, mainHandX, mainHandY, cfg.weaponType, cfg.weaponStyle, cfg.weaponColor, pose.weaponAngleDeg, cfg, { bowDraw: pose.bowDraw, slashPhase: pose.slashPhase })
  }

  // Back arm & off-hand if behind body
  if (dir === 'up' || isSide) {
    drawArmAndHand(offHandX, offHandY, cx - (isSide ? sideSign * 3 : 8), false, cfg.flameGauntlets ? '#f97316' : null)
    drawOffhandProps()
  }

  // Legs (back leg first)
  if (dir === 'right') {
    drawLeg(cx - 2, lFootX, lFootY, false)
    drawLeg(cx + 2, rFootX, rFootY, true)
  } else if (dir === 'left') {
    drawLeg(cx + 2, rFootX, rFootY, false)
    drawLeg(cx - 2, lFootX, lFootY, true)
  } else {
    drawLeg(cx - 4, lFootX, lFootY, true)
    drawLeg(cx + 4, rFootX, rFootY, true)
  }

  drawTorsoAndArmor()
  if (dir === 'up') drawCape()
  drawHeadAndFace()

  if (dir === 'down') {
    drawArmAndHand(offHandX, offHandY, cx - 8, true, cfg.flameGauntlets ? '#f97316' : null)
    drawOffhandProps()
  }

  drawArmAndHand(mainHandX, mainHandY, cx + (isSide ? sideSign * 3 : 8), true, cfg.flameGauntlets ? '#fb923c' : null)
  if (!mainWeaponBehind && includeWeapon) {
    drawPixelWeapon(grid, mainHandX, mainHandY, cfg.weaponType, cfg.weaponStyle, cfg.weaponColor, pose.weaponAngleDeg, cfg, { bowDraw: pose.bowDraw, slashPhase: pose.slashPhase })
  }

  drawSkillAndAttackVfx()

  grid.applyExteriorOutline(pose.hitFlash ? '#4c0519' : '#140e1c')

  return {
    grid,
    handSocket: {
      x: mainHandX * PIXEL_SCALE,
      y: mainHandY * PIXEL_SCALE,
      angleDeg: Math.round(pose.weaponAngleDeg),
      behind: mainWeaponBehind,
      bowDraw: Boolean(pose.bowDraw),
    },
    headSocket: {
      x: headCx * PIXEL_SCALE,
      y: headCy * PIXEL_SCALE,
    },
  }
}

function upscaleToPngBuffer(grid, scale = PIXEL_SCALE) {
  const w = grid.w * scale
  const h = grid.h * scale
  const png = new PNG({ width: w, height: h, colorType: 6 })
  for (let ly = 0; ly < grid.h; ly++) {
    for (let lx = 0; lx < grid.w; lx++) {
      const sIdx = (ly * grid.w + lx) * 4
      const r = grid.rgba[sIdx]
      const g = grid.rgba[sIdx + 1]
      const b = grid.rgba[sIdx + 2]
      const a = grid.rgba[sIdx + 3]
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const dIdx = ((ly * scale + sy) * w + (lx * scale + sx)) * 4
          png.data[dIdx] = r
          png.data[dIdx + 1] = g
          png.data[dIdx + 2] = b
          png.data[dIdx + 3] = a
        }
      }
    }
  }
  return PNG.sync.write(png)
}

function makePortraitPng(grid) {
  // Crop crisp 48x48 head+shoulders bust around (x=18..66, y=10..58) and scale 2x -> 96x96
  const cropW = 48
  const cropH = 48
  const ox = 18
  const oy = 10
  const scale = 2
  const png = new PNG({ width: cropW * scale, height: cropH * scale, colorType: 6 })
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const sx = ox + x
      const sy = oy + y
      const sIdx = (sy * grid.w + sx) * 4
      const r = grid.rgba[sIdx]
      const g = grid.rgba[sIdx + 1]
      const b = grid.rgba[sIdx + 2]
      const a = grid.rgba[sIdx + 3]
      for (let ky = 0; ky < scale; ky++) {
        for (let kx = 0; kx < scale; kx++) {
          const dIdx = ((y * scale + ky) * cropW * scale + (x * scale + kx)) * 4
          png.data[dIdx] = r
          png.data[dIdx + 1] = g
          png.data[dIdx + 2] = b
          png.data[dIdx + 3] = a
        }
      }
    }
  }
  return PNG.sync.write(png)
}

function buildSheetPng(renderedFrames, cols, rows) {
  const sheetW = cols * FRAME_W
  const sheetH = rows * FRAME_H
  const png = new PNG({ width: sheetW, height: sheetH, colorType: 6 })
  for (const { row, col, grid } of renderedFrames) {
    for (let ly = 0; ly < grid.h; ly++) {
      for (let lx = 0; lx < grid.w; lx++) {
        const sIdx = (ly * grid.w + lx) * 4
        const r = grid.rgba[sIdx]
        const g = grid.rgba[sIdx + 1]
        const b = grid.rgba[sIdx + 2]
        const a = grid.rgba[sIdx + 3]
        if (a === 0) continue
        for (let sy = 0; sy < PIXEL_SCALE; sy++) {
          for (let sx = 0; sx < PIXEL_SCALE; sx++) {
            const dx = col * FRAME_W + lx * PIXEL_SCALE + sx
            const dy = row * FRAME_H + ly * PIXEL_SCALE + sy
            const dIdx = (dy * sheetW + dx) * 4
            png.data[dIdx] = r
            png.data[dIdx + 1] = g
            png.data[dIdx + 2] = b
            png.data[dIdx + 3] = a
          }
        }
      }
    }
  }
  return PNG.sync.write(png)
}

function generateAllCharacters() {
  fs.mkdirSync(OUT_ROOT, { recursive: true })
  const maxCols = Math.max(...Object.values(ANIM_SPECS).map((s) => s.frames)) // 6
  const totalRows = ANIM_ORDER.length * DIRS.length // 32

  for (const cfg of CHARACTER_CONFIGS) {
    const jobDir = path.join(OUT_ROOT, cfg.jobId)
    fs.mkdirSync(jobDir, { recursive: true })

    const sheetEntries = []
    const bodySheetEntries = []
    const actionsMeta = {}
    const handSockets = {}
    const headSockets = {}
    const splitFiles = {}
    let portraitGrid = null
    let rowIdx = 0

    for (const animName of ANIM_ORDER) {
      const animSpec = ANIM_SPECS[animName]
      handSockets[animName] = {}
      headSockets[animName] = {}
      splitFiles[animName] = {}

      for (const dir of DIRS) {
        const dirPath = path.join(jobDir, animName, dir)
        fs.mkdirSync(dirPath, { recursive: true })
        const key = `${animName}_${dir}`
        actionsMeta[key] = {
          row: rowIdx,
          frames: animSpec.frames,
          fps: animSpec.fps,
          loop: animSpec.loop,
          baseFacing: dir === 'down' ? 'front' : dir === 'up' ? 'back' : dir,
        }
        handSockets[animName][dir] = []
        headSockets[animName][dir] = []
        splitFiles[animName][dir] = []

        for (let f = 0; f < animSpec.frames; f++) {
          const renderedFull = renderCharacterFrame(cfg, animName, dir, f, true)
          const renderedBody = renderCharacterFrame(cfg, animName, dir, f, false)

          if (animName === 'idle' && dir === 'down' && f === 0) {
            portraitGrid = renderedFull.grid
          }

          const frameFile = path.join(dirPath, `${f}.png`)
          fs.writeFileSync(frameFile, upscaleToPngBuffer(renderedFull.grid))

          sheetEntries.push({ row: rowIdx, col: f, grid: renderedFull.grid })
          bodySheetEntries.push({ row: rowIdx, col: f, grid: renderedBody.grid })
          handSockets[animName][dir].push(renderedFull.handSocket)
          headSockets[animName][dir].push(renderedFull.headSocket)
          splitFiles[animName][dir].push(`/assets/hd/characters/${cfg.jobId}/${animName}/${dir}/${f}.png`)
        }
        rowIdx += 1
      }
    }

    fs.writeFileSync(path.join(jobDir, 'sheet.png'), buildSheetPng(sheetEntries, maxCols, totalRows))
    fs.writeFileSync(path.join(jobDir, 'body_sheet.png'), buildSheetPng(bodySheetEntries, maxCols, totalRows))
    fs.writeFileSync(path.join(jobDir, 'portrait.png'), makePortraitPng(portraitGrid))

    const metadata = {
      jobId: cfg.jobId,
      jobName: cfg.jobName,
      thaiRoleLabel: cfg.thaiRoleLabel,
      style: 'HD_PIXEL_ART_2D_FANTASY_RPG',
      proportionHeads: 3.7,
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      logicalWidth: LOGICAL_W,
      logicalHeight: LOGICAL_H,
      pixelScale: PIXEL_SCALE,
      hdScale: 4,
      cols: maxCols,
      rows: totalRows,
      anchor: {
        x: 0.5,
        y: Number(ANCHOR_Y.toFixed(6)),
        pivot: 'bottom-center',
      },
      defaultWeapon: {
        weaponType: cfg.weaponType,
        weaponStyle: cfg.weaponStyle,
        weaponColor: cfg.weaponColor,
      },
      directions: DIRS,
      animations: Object.fromEntries(
        ANIM_ORDER.map((name) => [name, { ...ANIM_SPECS[name] }]),
      ),
      actions: actionsMeta,
      handSockets,
      headSockets,
      files: {
        sheet: `/assets/hd/characters/${cfg.jobId}/sheet.png`,
        bodySheet: `/assets/hd/characters/${cfg.jobId}/body_sheet.png`,
        portrait: `/assets/hd/characters/${cfg.jobId}/portrait.png`,
        frames: splitFiles,
      },
    }
    fs.writeFileSync(path.join(jobDir, 'metadata.json'), JSON.stringify(metadata, null, 2))
    console.log(`Generated ${cfg.jobId} (${cfg.jobName}): ${totalRows} rows x ${maxCols} cols, 160 frames`)
  }
}

generateAllCharacters()
