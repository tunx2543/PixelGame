import { normalizeJobId, type WeaponType } from './data'
import { getFashionItemDef } from './premium/fashion-pet'
import type { FashionSlot } from './premium/types'
import type { Dir, HumanColors, SpriteAction } from './sprites'

export type FashionLoadoutInput = Partial<Record<FashionSlot, string | null>>

export const PIXEL_HERO_GRID_SIZE = 48
export const PIXEL_HERO_SCALE = 2
export const PIXEL_HERO_CANVAS_SIZE = PIXEL_HERO_GRID_SIZE * PIXEL_HERO_SCALE // 96x96 (hdScale=2)

/**
 * Batch 1 bespoke 2D MMORPG pixel-art classes (5/15).
 * Remaining 10 classes use the new 2D MMORPG proportional pixel base rig
 * (all legacy tall blocky models are completely removed).
 */
export const BATCH1_BESPOKE_HERO_IDS = new Set<string>([
  'novice',
  'swordsman',
  'mage',
  'archer',
  'cleric',
])

const INK = '#181124'

function parseHexRgb(hex: string): [number, number, number] {
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
  ]
}

export function shadePx(hex: string, amt: number): string {
  const [r, g, b] = parseHexRgb(hex)
  const f = (c: number) =>
    Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)))
  return `#${[f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

export class PixelGrid {
  readonly w: number
  readonly h: number
  readonly pixels: (string | null)[][]

  constructor(w = PIXEL_HERO_GRID_SIZE, h = PIXEL_HERO_GRID_SIZE) {
    this.w = w
    this.h = h
    this.pixels = Array.from({ length: h }, () => Array<string | null>(w).fill(null))
  }

  px(x: number, y: number, color: string): void {
    const ix = Math.round(x)
    const iy = Math.round(y)
    if (ix >= 0 && ix < this.w && iy >= 0 && iy < this.h) {
      this.pixels[iy][ix] = color
    }
  }

  get(x: number, y: number): string | null {
    const ix = Math.round(x)
    const iy = Math.round(y)
    if (ix < 0 || ix >= this.w || iy < 0 || iy >= this.h) return null
    return this.pixels[iy][ix]
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
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

  line(x0: number, y0: number, x1: number, y1: number, color: string, thick = 1): void {
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
      if (e2 > -dy) {
        err -= dy
        ix0 += sx
      }
      if (e2 < dx) {
        err += dx
        iy0 += sy
      }
    }
  }

  rows(ox: number, oy: number, art: string[], palette: Record<string, string>): void {
    for (let y = 0; y < art.length; y++) {
      const row = art[y]
      for (let x = 0; x < row.length; x++) {
        const ch = row[x]
        if (ch === '.' || ch === ' ') continue
        const col = palette[ch]
        if (col) this.px(ox + x, oy + y, col)
      }
    }
  }

  mirrorHorizontally(): PixelGrid {
    const out = new PixelGrid(this.w, this.h)
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        out.pixels[y][this.w - 1 - x] = this.pixels[y][x]
      }
    }
    return out
  }

  countFilled(): number {
    let count = 0
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.pixels[y][x]) count += 1
      }
    }
    return count
  }
}

export interface HeroPoseFrame {
  action: 'idle' | 'walk' | 'run' | 'attack' | 'skill' | 'hit' | 'death' | 'victory'
  frameIdx: number
  blink: boolean
  bobY: number
  leanX: number
  /** Left / Back leg offset X & lift */
  legAX: number
  legALift: number
  /** Right / Front leg offset X & lift */
  legBX: number
  legBLift: number
  /** Arm swing */
  armASwing: number
  armBSwing: number
  /** Cape / hair / ribbon flow */
  sway: number
  /** Weapon angle (radians) */
  weaponAngle: number
  /** Extra hand lift for cast/victory/attack */
  handLiftY: number
  handPushX: number
  /** Bow draw state (0 idle, 1 draw, 2 release) */
  bowPull: number
  /** Attack slash / skill flash active */
  showSlash: boolean
  slashPhase: number
  /** Collapsed body offset for death */
  deathStage: number
}

export function resolveHeroPoseFrame(
  rawAction: SpriteAction | undefined,
  frame: number,
  weapon: WeaponType | null,
  attacking = false,
  attackFrameOverride?: number,
): HeroPoseFrame {
  const normalized: HeroPoseFrame['action'] = attacking
    ? 'attack'
    : rawAction === 'follow'
      ? 'walk'
      : rawAction === 'mount' || rawAction === 'dismount'
        ? 'idle'
        : rawAction === 'run' ||
            rawAction === 'attack' ||
            rawAction === 'skill' ||
            rawAction === 'hit' ||
            rawAction === 'death' ||
            rawAction === 'victory' ||
            rawAction === 'walk'
          ? rawAction
          : 'idle'

  const blink = normalized === 'idle' && !attacking && frame === -1
  const safeF = frame < 0 ? 0 : Math.floor(frame)

  if (normalized === 'walk') {
    const f = safeF % 6
    const seq = [
      { bob: 0, lean: 0, aX: -2, aL: 0, bX: 2, bL: 1, armA: 2, armB: -2, sway: -1 },
      { bob: -1, lean: 0, aX: -1, aL: 2, bX: 1, bL: 0, armA: 1, armB: -1, sway: -2 },
      { bob: 0, lean: 0, aX: 1, aL: 1, bX: -1, bL: 0, armA: -1, armB: 1, sway: -1 },
      { bob: 0, lean: 0, aX: 2, aL: 0, bX: -2, bL: 1, armA: -2, armB: 2, sway: 0 },
      { bob: -1, lean: 0, aX: 1, aL: 0, bX: -1, bL: 2, armA: -1, armB: 1, sway: -2 },
      { bob: 0, lean: 0, aX: -1, aL: 1, bX: 1, bL: 0, armA: 1, armB: -1, sway: -1 },
    ][f]
    return {
      action: 'walk',
      frameIdx: f,
      blink: false,
      bobY: seq.bob,
      leanX: seq.lean,
      legAX: seq.aX,
      legALift: seq.aL,
      legBX: seq.bX,
      legBLift: seq.bL,
      armASwing: seq.armA,
      armBSwing: seq.armB,
      sway: seq.sway,
      weaponAngle: weapon === 'staff' ? -1.25 + seq.armB * 0.08 : weapon === 'bow' ? 0.05 : -0.5 + seq.armB * 0.14,
      handLiftY: 0,
      handPushX: 0,
      bowPull: 0,
      showSlash: false,
      slashPhase: 0,
      deathStage: 0,
    }
  }

  if (normalized === 'run') {
    const f = safeF % 6
    const seq = [
      { bob: -1, lean: 1, aX: -3, aL: 1, bX: 3, bL: 1, armA: 3, armB: -3, sway: -3 },
      { bob: -2, lean: 1, aX: -1, aL: 3, bX: 2, bL: 0, armA: 2, armB: -2, sway: -4 },
      { bob: 0, lean: 1, aX: 2, aL: 1, bX: -2, bL: 1, armA: -2, armB: 2, sway: -3 },
      { bob: -1, lean: 1, aX: 3, aL: 1, bX: -3, bL: 1, armA: -3, armB: 3, sway: -4 },
      { bob: -2, lean: 1, aX: 2, aL: 0, bX: -1, bL: 3, armA: -2, armB: 2, sway: -3 },
      { bob: 0, lean: 1, aX: -2, aL: 1, bX: 2, bL: 1, armA: 2, armB: -2, sway: -3 },
    ][f]
    return {
      action: 'run',
      frameIdx: f,
      blink: false,
      bobY: seq.bob,
      leanX: seq.lean,
      legAX: seq.aX,
      legALift: seq.aL,
      legBX: seq.bX,
      legBLift: seq.bL,
      armASwing: seq.armA,
      armBSwing: seq.armB,
      sway: seq.sway,
      weaponAngle: weapon === 'staff' ? -1.4 : weapon === 'bow' ? -0.1 : -0.8 + seq.armB * 0.12,
      handLiftY: -1,
      handPushX: 0,
      bowPull: 0,
      showSlash: false,
      slashPhase: 0,
      deathStage: 0,
    }
  }

  if (normalized === 'attack') {
    const f = Math.abs(attackFrameOverride ?? safeF) % 5
    const seq = [
      { bob: 1, lean: -1, aX: -2, aL: 0, bX: 2, bL: 0, sway: -1, wA: -2.0, lift: -4, push: -2, pull: 1, slash: false },
      { bob: -1, lean: 2, aX: -3, aL: 0, bX: 3, bL: 1, sway: -3, wA: -0.3, lift: -2, push: 3, pull: 1, slash: true },
      { bob: 0, lean: 2, aX: -3, aL: 0, bX: 4, bL: 0, sway: -4, wA: 0.55, lift: 0, push: 4, pull: 2, slash: true },
      { bob: 0, lean: 1, aX: -2, aL: 0, bX: 2, bL: 0, sway: -2, wA: 0.9, lift: 1, push: 2, pull: 0, slash: true },
      { bob: 0, lean: 0, aX: -1, aL: 0, bX: 1, bL: 0, sway: -1, wA: -0.4, lift: 0, push: 0, pull: 0, slash: false },
    ][f]
    return {
      action: 'attack',
      frameIdx: f,
      blink: false,
      bobY: seq.bob,
      leanX: seq.lean,
      legAX: seq.aX,
      legALift: seq.aL,
      legBX: seq.bX,
      legBLift: seq.bL,
      armASwing: f === 0 ? -2 : 2,
      armBSwing: f === 0 ? -3 : 3,
      sway: seq.sway,
      weaponAngle: weapon === 'staff' ? (f === 0 ? -1.8 : f <= 2 ? -0.45 : -1.0) : weapon === 'bow' ? 0 : seq.wA,
      handLiftY: seq.lift,
      handPushX: seq.push,
      bowPull: weapon === 'bow' ? seq.pull : 0,
      showSlash: seq.slash,
      slashPhase: f,
      deathStage: 0,
    }
  }

  if (normalized === 'skill') {
    const f = Math.abs(attackFrameOverride ?? safeF) % 6
    const seq = [
      { bob: 1, lean: -1, sway: -1, wA: -1.6, lift: -3, push: -1, slash: false },
      { bob: -2, lean: 0, sway: -3, wA: -1.85, lift: -6, push: 1, slash: false },
      { bob: -3, lean: 1, sway: -4, wA: -1.45, lift: -7, push: 2, slash: true },
      { bob: -1, lean: 2, sway: -4, wA: 0.2, lift: -2, push: 4, slash: true },
      { bob: 0, lean: 1, sway: -2, wA: 0.45, lift: 0, push: 2, slash: true },
      { bob: 0, lean: 0, sway: -1, wA: -0.7, lift: 0, push: 0, slash: false },
    ][f]
    return {
      action: 'skill',
      frameIdx: f,
      blink: false,
      bobY: seq.bob,
      leanX: seq.lean,
      legAX: -2,
      legALift: f === 2 ? 2 : 0,
      legBX: 2,
      legBLift: f === 2 ? 1 : 0,
      armASwing: -2,
      armBSwing: 2,
      sway: seq.sway,
      weaponAngle: weapon === 'bow' ? 0 : seq.wA,
      handLiftY: seq.lift,
      handPushX: seq.push,
      bowPull: weapon === 'bow' ? (f <= 2 ? 1 : 2) : 0,
      showSlash: seq.slash,
      slashPhase: f,
      deathStage: 0,
    }
  }

  if (normalized === 'hit') {
    const f = safeF % 3
    return {
      action: 'hit',
      frameIdx: f,
      blink: true,
      bobY: f === 0 ? 1 : 0,
      leanX: f <= 1 ? -2 : -1,
      legAX: -1,
      legALift: 0,
      legBX: 1,
      legBLift: f === 0 ? 1 : 0,
      armASwing: -2,
      armBSwing: -2,
      sway: 2,
      weaponAngle: -1.1,
      handLiftY: -1,
      handPushX: -1,
      bowPull: 0,
      showSlash: false,
      slashPhase: 0,
      deathStage: 0,
    }
  }

  if (normalized === 'death') {
    const f = Math.min(4, safeF)
    return {
      action: 'death',
      frameIdx: f,
      blink: true,
      bobY: [1, 3, 6, 9, 10][f],
      leanX: [-1, -2, -2, -3, -3][f],
      legAX: -2,
      legALift: 0,
      legBX: 2,
      legBLift: 0,
      armASwing: -1,
      armBSwing: 1,
      sway: 1,
      weaponAngle: 0.8 + f * 0.2,
      handLiftY: 2,
      handPushX: 0,
      bowPull: 0,
      showSlash: false,
      slashPhase: 0,
      deathStage: f,
    }
  }

  if (normalized === 'victory') {
    const f = safeF % 5
    const jump = [0, -2, -3, -1, 0][f]
    return {
      action: 'victory',
      frameIdx: f,
      blink: false,
      bobY: jump,
      leanX: 0,
      legAX: -1,
      legALift: f === 2 ? 2 : 0,
      legBX: 1,
      legBLift: f === 2 ? 2 : 0,
      armASwing: -3,
      armBSwing: -4,
      sway: -2,
      weaponAngle: -1.65,
      handLiftY: -6,
      handPushX: 0,
      bowPull: 0,
      showSlash: false,
      slashPhase: 0,
      deathStage: 0,
    }
  }

  // Idle (4F)
  const f = safeF % 4
  const breath = f === 1 ? 1 : 0
  return {
    action: 'idle',
    frameIdx: f,
    blink,
    bobY: breath,
    leanX: 0,
    legAX: 0,
    legALift: 0,
    legBX: 0,
    legBLift: 0,
    armASwing: 0,
    armBSwing: 0,
    sway: f === 2 ? -1 : f === 3 ? 1 : 0,
    weaponAngle: weapon === 'staff' ? -1.45 : weapon === 'bow' ? 0.08 : -0.58,
    handLiftY: 0,
    handPushX: 0,
    bowPull: 0,
    showSlash: false,
    slashPhase: 0,
    deathStage: 0,
  }
}

interface HeroPalette {
  skin: string
  skinHi: string
  skinDark: string
  hair: string
  hairHi: string
  hairDark: string
  body: string
  bodyHi: string
  bodyDark: string
  legs: string
  legsHi: string
  legsDark: string
  boot: string
  bootHi: string
  bootDark: string
  accent: string
  accentHi: string
  accentDark: string
  cape: string
  capeDark: string
  eye: string
}

function buildPalette(colors: HumanColors, jobId: string, loadout?: FashionLoadoutInput | null): HeroPalette {
  const skin = colors.skin ?? '#f7cba4'
  const hairDef = loadout?.hair ? getFashionItemDef(loadout.hair) : null
  const costumeDef = loadout?.costume ? getFashionItemDef(loadout.costume) : null
  const pantsDef = loadout?.pants ? getFashionItemDef(loadout.pants) : null
  const shoesDef = loadout?.shoes ? getFashionItemDef(loadout.shoes) : null

  // Batch 1 tailored palettes matching /Characters/*/concept.png
  let defaultBody = colors.body
  let defaultLegs = colors.legs
  let defaultHair = colors.hair
  let defaultAccent = colors.accent
  let defaultCape = colors.cape ?? shadePx(colors.accent, -0.25)
  let defaultBoot = '#6f4126'

  if (jobId === 'novice') {
    defaultHair = '#875130'
    defaultBody = '#596e84'
    defaultLegs = '#3d4a59'
    defaultAccent = '#dc2626'
    defaultCape = '#c81e1e'
    defaultBoot = '#784421'
  } else if (jobId === 'swordsman') {
    defaultHair = '#dc2626'
    defaultBody = '#94a3b8'
    defaultLegs = '#475569'
    defaultAccent = '#b91c1c'
    defaultCape = '#b91c1c'
    defaultBoot = '#64748b'
  } else if (jobId === 'mage') {
    defaultHair = '#c4b5fd'
    defaultBody = '#4c1d95'
    defaultLegs = '#2e1065'
    defaultAccent = '#f59e0b'
    defaultCape = '#312e81'
    defaultBoot = '#4c1d95'
  } else if (jobId === 'archer') {
    defaultHair = '#9a3412'
    defaultBody = '#7c4a26'
    defaultLegs = '#3f3428'
    defaultAccent = '#16a34a'
    defaultCape = '#15803d'
    defaultBoot = '#5c371d'
  } else if (jobId === 'cleric') {
    defaultHair = '#e6ad47'
    defaultBody = '#f1f5f9'
    defaultLegs = '#bae6fd'
    defaultAccent = '#38bdf8'
    defaultCape = '#7dd3fc'
    defaultBoot = '#e2e8f0'
  }

  const hair = hairDef?.primaryColor ?? defaultHair
  const body = costumeDef?.primaryColor ?? defaultBody
  const legs = pantsDef?.primaryColor ?? costumeDef?.paletteOverride?.legs ?? defaultLegs
  const boot = shoesDef?.primaryColor ?? defaultBoot
  const accent = costumeDef?.accentColor ?? defaultAccent
  const cape = costumeDef ? costumeDef.secondaryColor : defaultCape

  return {
    skin,
    skinHi: shadePx(skin, 0.16),
    skinDark: shadePx(skin, -0.22),
    hair,
    hairHi: hairDef?.accentColor ?? shadePx(hair, 0.28),
    hairDark: hairDef?.secondaryColor ?? shadePx(hair, -0.32),
    body,
    bodyHi: shadePx(body, 0.22),
    bodyDark: costumeDef?.secondaryColor ?? shadePx(body, -0.28),
    legs,
    legsHi: shadePx(legs, 0.18),
    legsDark: pantsDef?.secondaryColor ?? shadePx(legs, -0.28),
    boot,
    bootHi: shoesDef?.accentColor ?? shadePx(boot, 0.26),
    bootDark: shoesDef?.secondaryColor ?? shadePx(boot, -0.3),
    accent,
    accentHi: shadePx(accent, 0.3),
    accentDark: shadePx(accent, -0.28),
    cape,
    capeDark: shadePx(cape, -0.3),
    eye: colors.eye ?? (jobId === 'archer' ? '#15803d' : jobId === 'cleric' ? '#0284c7' : jobId === 'mage' ? '#6d28d9' : '#3b2419'),
  }
}

function drawPixelWeapon(
  g: PixelGrid,
  vfx: PixelGrid,
  hx: number,
  hy: number,
  weapon: WeaponType | null,
  weaponColor: string,
  pose: HeroPoseFrame,
  sideView: boolean,
  isUp: boolean,
  jobId: string,
  weaponSkinId?: string | null,
): void {
  if (!weapon) return

  const skinDef = weaponSkinId ? getFashionItemDef(weaponSkinId) : null
  const effColor = skinDef?.primaryColor ?? weaponColor
  const bladeHi = skinDef?.accentColor ?? shadePx(effColor, 0.45)
  const bladeDark = skinDef?.secondaryColor ?? shadePx(effColor, -0.3)
  const gold = '#fbbf24'
  const goldHi = '#fef08a'
  const wood = '#784421'

  if (weapon === 'bow') {
    const bx = Math.round(hx)
    const by = Math.round(hy)
    const bowWood = skinDef ? effColor : '#a16207'
    const bowHi = skinDef ? bladeHi : '#d97706'
    const bowDark = skinDef ? bladeDark : '#713f12'
    if (sideView) {
      // Recurve bow held forward
      g.px(bx - 1, by - 7, gold)
      g.px(bx, by - 6, bowDark)
      g.px(bx + 1, by - 5, bowWood)
      g.px(bx + 2, by - 4, bowWood)
      g.line(bx + 2, by - 3, bx + 2, by + 3, bowHi, 1)
      g.px(bx + 1, by, wood) // grip
      g.px(bx + 2, by + 4, bowWood)
      g.px(bx + 1, by + 5, bowWood)
      g.px(bx, by + 6, bowDark)
      g.px(bx - 1, by + 7, gold)

      const pullShift = pose.bowPull === 1 ? -4 : pose.bowPull === 2 ? 0 : -1
      g.line(bx - 1, by - 6, bx - 1 + pullShift, by, '#e2e8f0', 1)
      g.line(bx - 1 + pullShift, by, bx - 1, by + 6, '#e2e8f0', 1)

      if (pose.bowPull === 1) {
        g.line(bx - 1 + pullShift, by, bx + 7, by, '#f8fafc', 1)
        g.px(bx + 7, by, '#86efac')
        g.px(bx + 8, by, '#ffffff')
      } else if (pose.bowPull === 2) {
        vfx.line(bx + 3, by, bx + 14, by, '#86efac', 1)
        vfx.px(bx + 14, by, '#ffffff')
      }
    } else if (!isUp) {
      // Front-view angled recurve bow on side
      g.line(bx - 2, by - 6, bx + 1, by - 2, bowWood, 1)
      g.line(bx + 1, by - 2, bx + 1, by + 2, bowHi, 1)
      g.line(bx + 1, by + 2, bx - 2, by + 6, bowDark, 1)
      g.px(bx - 2, by - 6, gold)
      g.px(bx - 2, by + 6, gold)
      g.line(bx - 2, by - 5, bx - 2, by + 5, '#e2e8f0', 1)
    } else {
      // Up view slung bow arc
      g.line(bx - 1, by - 6, bx + 2, by, bowWood, 1)
      g.line(bx + 2, by, bx - 1, by + 6, bowDark, 1)
    }
    return
  }

  if (weapon === 'staff') {
    const shaftCol = jobId === 'cleric' ? '#d97706' : '#784421'
    const shaftHi = jobId === 'cleric' ? goldHi : '#a16207'
    const ang = sideView ? pose.weaponAngle : isUp ? -1.45 : -1.35
    const cos = Math.cos(ang)
    const sin = Math.sin(ang)
    const sx = Math.round(hx - cos * 5)
    const sy = Math.round(hy - sin * 5)
    const tx = Math.round(hx + cos * 11)
    const ty = Math.round(hy + sin * 11)

    g.line(sx, sy, tx, ty, shaftCol, 1)
    g.px(Math.round(hx + cos * 2), Math.round(hy + sin * 2), shaftHi)
    g.px(sx, sy, gold)

    if (jobId === 'cleric' && !skinDef) {
      // Luminary Sun-Orb Scepter
      g.rect(tx - 2, ty - 2, 5, 5, '#f59e0b')
      g.rect(tx - 1, ty - 1, 3, 3, '#fde047')
      g.px(tx - 1, ty - 1, '#ffffff')
      g.px(tx - 3, ty, gold)
      g.px(tx + 3, ty, gold)
    } else {
      // Arcanist Amethyst Crystal Staff (or weapon skin color)
      const orbCol = skinDef ? effColor : jobId === 'mage' ? '#a855f7' : effColor
      const orbHi = skinDef ? bladeHi : jobId === 'mage' ? '#f0abfc' : bladeHi
      g.px(tx - 1, ty + 2, gold)
      g.px(tx + 1, ty + 2, gold)
      g.rect(tx - 1, ty - 2, 3, 4, orbCol)
      g.px(tx, ty - 3, orbHi)
      g.px(tx, ty - 1, '#ffffff')
    }
    if (pose.showSlash) {
      vfx.px(tx + 2, ty - 3, bladeHi)
      vfx.px(tx - 3, ty - 2, '#ffffff')
      vfx.px(tx + 3, ty + 1, effColor)
    }
    return
  }

  // Sword / Dagger / Stick
  const len = weapon === 'dagger' ? 8 : jobId === 'swordsman' ? 14 : 11
  const thick = jobId === 'swordsman' && weapon === 'sword' ? 2 : 1
  const ang = sideView ? pose.weaponAngle : isUp ? -1.35 : pose.showSlash ? pose.weaponAngle : -0.95
  const cos = Math.cos(ang)
  const sin = Math.sin(ang)
  const pxp = -sin
  const pyp = cos

  const bladeCol = weapon === 'stick' && !skinDef ? '#9c6334' : skinDef ? effColor : '#cbd5e1'
  const bHi = weapon === 'stick' && !skinDef ? '#d4a373' : skinDef ? bladeHi : '#f8fafc'
  const bDark = weapon === 'stick' && !skinDef ? '#5c3618' : skinDef ? bladeDark : '#64748b'

  // Pommel & hilt
  g.px(hx - cos * 2, hy - sin * 2, gold)
  g.line(hx - cos, hy - sin, hx + cos, hy + sin, wood, 1)
  if (weapon !== 'stick') {
    g.line(hx + cos * 1.5 - pxp * 2, hy + sin * 1.5 - pyp * 2, hx + cos * 1.5 + pxp * 2, hy + sin * 1.5 + pyp * 2, gold, 1)
  }
  const tipX = hx + cos * len
  const tipY = hy + sin * len
  g.line(hx + cos * 2.5, hy + sin * 2.5, tipX, tipY, bDark, thick)
  g.line(hx + cos * 3 + pxp * 0.5, hy + sin * 3 + pyp * 0.5, tipX - cos * 0.5 + pxp * 0.5, tipY - sin * 0.5 + pyp * 0.5, bladeCol, 1)
  g.px(tipX, tipY, bHi)
  if (skinDef) {
    vfx.px(tipX + cos, tipY + sin, bladeHi)
  }

  if (pose.showSlash && sideView) {
    const slashCol = skinDef ? effColor : jobId === 'novice' ? '#38bdf8' : jobId === 'swordsman' ? '#fb7185' : '#fef08a'
    const arcX = hx + 5
    const arcY = hy - 1
    if (pose.slashPhase === 1 || pose.slashPhase === 2) {
      vfx.line(arcX - 2, arcY - 6, arcX + 4, arcY, '#ffffff', 1)
      vfx.line(arcX + 4, arcY, arcX, arcY + 7, slashCol, 2)
      vfx.px(arcX + 5, arcY + 1, '#ffffff')
    } else if (pose.slashPhase === 3) {
      vfx.line(arcX + 2, arcY - 3, arcX + 1, arcY + 5, slashCol, 1)
    }
  }
}

function drawAuraPixels(
  vfx: PixelGrid,
  auraId: string | null | undefined,
  cx: number,
  footY: number,
  frame: number,
  timeTick: number,
): void {
  if (!auraId) return
  const def = getFashionItemDef(auraId)
  if (!def) return
  const c1 = def.primaryColor
  const c2 = def.accentColor
  const phase = (Math.abs(frame) + timeTick) % 6

  // Crisp pixel aura ring under feet
  for (let dx = -10; dx <= 10; dx++) {
    const yOff = Math.abs(dx) > 7 ? -1 : 0
    if ((dx + phase) % 2 === 0) {
      vfx.px(cx + dx, footY + yOff, c1)
    }
    if (Math.abs(dx) <= 6 && (dx + phase) % 3 === 0) {
      vfx.px(cx + dx, footY - 1, c2)
    }
  }

  // Rising elemental motes around silhouette
  const motes = [
    { x: -11, y: -6 - (phase % 4), col: c1 },
    { x: 11, y: -9 - ((phase + 2) % 4), col: c2 },
    { x: -8, y: -18 - ((phase + 1) % 3), col: c2 },
    { x: 9, y: -22 - ((phase + 3) % 3), col: c1 },
    { x: 0, y: -33 - (phase % 2), col: c2 },
  ]
  for (const m of motes) {
    vfx.px(cx + m.x, footY + m.y, m.col)
    if (auraId === 'sunfire_aura' || auraId === 'aura_celestial_gold') {
      vfx.px(cx + m.x, footY + m.y - 1, '#ffffff')
    }
  }
}

function drawPixelWings(
  g: PixelGrid,
  vfx: PixelGrid,
  wingId: string | null | undefined,
  cx: number,
  torsoY: number,
  sideView: boolean,
  isUp: boolean,
  pose: HeroPoseFrame,
  timeTick: number,
): void {
  if (!wingId) return
  const def = getFashionItemDef(wingId)
  if (!def) return
  const c1 = def.primaryColor
  const c2 = def.secondaryColor
  const c3 = def.accentColor
  const flap = (pose.frameIdx + timeTick) % 3 === 1 ? -1 : (pose.frameIdx + timeTick) % 3 === 2 ? 1 : 0
  const isBat =
    wingId.includes('1fae0274') || wingId.includes('335ad49b') || wingId.includes('15fe84b6') || wingId.includes('9e601d3b')
  const isButterfly = wingId.includes('ea1b38fb') || wingId.includes('a7582c8d')
  const isHolo = wingId.includes('3dca4370') || wingId.includes('ead9dfe5') || wingId.includes('af7f9121')

  const drawWingSide = (sx: -1 | 1) => {
    const ax = sideView ? cx - 4 : cx + sx * 5
    const ay = torsoY + 3

    if (isBat) {
      g.line(ax, ay, ax + sx * 6, ay - 6 + flap, c2, 2)
      g.line(ax + sx * 6, ay - 6 + flap, ax + sx * 12, ay - 2 + flap, c1, 2)
      g.line(ax + sx * 2, ay + 2, ax + sx * 9, ay + 4 + flap, c1, 2)
      g.line(ax + sx * 1, ay + 4, ax + sx * 6, ay + 6 + flap, c2, 1)
      g.px(ax + sx * 6, ay - 7 + flap, c3)
      g.px(ax + sx * 12, ay - 3 + flap, c3)
    } else if (isButterfly) {
      g.rect(ax + (sx > 0 ? 1 : -9), ay - 6 + flap, 9, 6, c1)
      g.rect(ax + (sx > 0 ? 2 : -7), ay - 4 + flap, 6, 3, c3)
      g.rect(ax + (sx > 0 ? 1 : -7), ay + 1 + flap, 7, 5, c2)
      g.px(ax + sx * 6, ay - 5 + flap, '#ffffff')
    } else if (isHolo) {
      vfx.line(ax, ay, ax + sx * 11, ay - 7 + flap, c1, 2)
      vfx.line(ax + sx * 2, ay + 2, ax + sx * 12, ay - 1 + flap, c3, 1)
      vfx.line(ax + sx * 2, ay + 4, ax + sx * 9, ay + 4 + flap, c2, 1)
      vfx.px(ax + sx * 12, ay - 7 + flap, '#ffffff')
    } else {
      // Feathered Angel / Phoenix / Seraph / Crystal Wings
      g.line(ax, ay, ax + sx * 7, ay - 7 + flap, c1, 2)
      g.line(ax + sx * 7, ay - 7 + flap, ax + sx * 13, ay - 3 + flap, c3, 2)
      g.line(ax + sx * 1, ay + 2, ax + sx * 11, ay + 1 + flap, c1, 2)
      g.line(ax + sx * 2, ay + 4, ax + sx * 8, ay + 5 + flap, c2, 2)
      g.px(ax + sx * 13, ay - 4 + flap, '#ffffff')
      if (wingId === 'wing_anim_inferno_phoenix' || wingId.includes('45947e7e')) {
        vfx.px(ax + sx * 14, ay - 4 + flap, c3)
        vfx.px(ax + sx * 11, ay + 3 + flap, c1)
      }
    }
  }

  if (sideView) {
    drawWingSide(-1)
  } else {
    drawWingSide(-1)
    drawWingSide(1)
  }
  if (isUp) {
    // Wing clasp on back
    g.rect(cx - 2, torsoY + 2, 5, 3, c2)
    g.px(cx, torsoY + 3, c3)
  }
}

function drawBackFashion(
  g: PixelGrid,
  vfx: PixelGrid,
  backId: string | null | undefined,
  cx: number,
  torsoY: number,
  sideView: boolean,
  isUp: boolean,
  sway: number,
): void {
  if (!backId) return
  const def = getFashionItemDef(backId)
  if (!def) return

  if (backId === 'back_astral_ring') {
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + sway * 0.15
      const rx = Math.round(cx + Math.cos(ang) * (sideView ? 6 : 11))
      const ry = Math.round(torsoY + 2 + Math.sin(ang) * 10)
      vfx.px(rx, ry, a % 2 === 0 ? def.primaryColor : def.accentColor)
    }
    return
  }

  if (backId === 'back_cherry_parasol') {
    const px = sideView ? cx - 6 : cx - 8
    const py = torsoY - 7
    g.line(px, py, cx + 4, torsoY + 10, '#78350f', 1)
    g.rect(px - 4, py - 2, 11, 4, def.primaryColor)
    g.rect(px - 3, py - 3, 9, 2, '#fbcfe8')
    g.px(px + 1, py - 4, def.accentColor)
    return
  }

  if (backId === 'back_explorer_pack') {
    if (sideView) {
      g.rect(cx - 7, torsoY + 1, 5, 8, def.primaryColor)
      g.rect(cx - 7, torsoY - 1, 5, 2, '#e7dec8')
      g.px(cx - 5, torsoY + 4, def.accentColor)
    } else if (isUp) {
      g.rect(cx - 4, torsoY + 1, 9, 9, def.primaryColor)
      g.rect(cx - 5, torsoY - 1, 11, 2, '#e7dec8')
      g.rect(cx - 4, torsoY + 1, 9, 3, shadePx(def.primaryColor, 0.2))
      g.px(cx - 2, torsoY + 4, '#fbbf24')
      g.px(cx + 2, torsoY + 4, '#fbbf24')
    }
    return
  }

  // Cape (crimson / demon)
  const c1 = def.primaryColor
  const c2 = def.secondaryColor
  const trim = def.accentColor
  if (sideView) {
    g.line(cx - 3, torsoY + 1, cx - 8 + Math.round(sway * 0.5), torsoY + 13, c1, 3)
    g.line(cx - 4, torsoY + 2, cx - 8 + Math.round(sway * 0.5), torsoY + 14, c2, 2)
    g.px(cx - 8 + Math.round(sway * 0.5), torsoY + 14, trim)
  } else if (isUp) {
    g.rect(cx - 6, torsoY + 1, 13, 13, c1)
    g.rect(cx - 5, torsoY + 2, 11, 11, c2)
    g.rect(cx - 4, torsoY + 1, 9, 1, trim)
    g.rect(cx - 6, torsoY + 13, 13, 1, trim)
  } else {
    g.rect(cx - 7, torsoY + 2, 2, 12, c2)
    g.rect(cx + 6, torsoY + 2, 2, 12, c2)
  }
}

function drawLegsAndBoots(
  g: PixelGrid,
  cx: number,
  hipY: number,
  footY: number,
  sideView: boolean,
  isUp: boolean,
  pal: HeroPalette,
  pose: HeroPoseFrame,
  loadout?: FashionLoadoutInput | null,
): void {
  const pantsId = loadout?.pants
  const shoesId = loadout?.shoes
  const isHakama = pantsId === 'pants_celestial_hakama'
  const isKnightGreaves = pantsId === 'pants_knight_greaves'
  const isShadowCargo = pantsId === 'pants_shadow_cargo'

  const drawSingleBoot = (bx: number, by: number, wideDir: number) => {
    // Boot cuff
    g.rect(bx - 1, by - 4, 4, 2, pal.bootHi)
    // Boot body
    g.rect(bx - 1, by - 2, 4, 2, pal.boot)
    g.px(bx + wideDir, by - 1, pal.boot)
    // Grounded dark sole
    g.rect(bx - 1, by, 4 + (wideDir !== 0 ? 1 : 0), 1, pal.bootDark)
    if (shoesId === 'shoes_winged_hermes') {
      g.px(bx - 2, by - 3, '#ffffff')
      g.px(bx - 2, by - 4, '#bae6fd')
    } else if (shoesId === 'shoes_royal_greaves') {
      g.px(bx, by - 3, '#ffffff')
    }
  }

  if (sideView) {
    const backX = cx - 2 + pose.legAX
    const backY = footY - pose.legALift
    const frontX = cx + 2 + pose.legBX
    const frontY = footY - pose.legBLift

    // Back leg
    g.line(cx - 1, hipY, backX, backY - 4, pal.legsDark, isHakama ? 3 : 2)
    drawSingleBoot(backX - 1, backY, 1)

    // Front leg
    g.line(cx + 1, hipY, frontX, frontY - 4, pal.legs, isHakama ? 3 : 2)
    g.px(frontX, hipY + 2, pal.legsHi)
    if (isKnightGreaves) g.px(frontX + 1, hipY + 2, '#fbbf24')
    if (isShadowCargo) g.px(frontX, hipY + 3, '#f43f5e')
    drawSingleBoot(frontX - 1, frontY, 1)
    return
  }

  // Front or Back view (wide athletic stance!)
  const lx = cx - 3
  const rx = cx + 2
  const ly = footY - pose.legALift
  const ry = footY - pose.legBLift

  const legW = isHakama ? 4 : 3
  g.rect(lx - (isHakama ? 1 : 0), hipY, legW, Math.max(3, ly - hipY - 3), pal.legsDark)
  g.rect(lx, hipY + 1, 2, Math.max(2, ly - hipY - 4), pal.legs)

  g.rect(rx, hipY, legW, Math.max(3, ry - hipY - 3), pal.legsDark)
  g.rect(rx, hipY + 1, 2, Math.max(2, ry - hipY - 4), pal.legs)

  if (!isUp) {
    g.px(lx + 1, hipY + 2, isKnightGreaves ? '#fbbf24' : pal.legsHi)
    g.px(rx + 1, hipY + 2, isKnightGreaves ? '#fbbf24' : pal.legsHi)
    if (isShadowCargo) {
      g.rect(lx, hipY + 3, 3, 1, '#f43f5e')
      g.rect(rx, hipY + 3, 3, 1, '#f43f5e')
    }
    if (isHakama) {
      g.px(lx, ly - 5, '#67e8f9')
      g.px(rx + 2, ry - 5, '#67e8f9')
    }
  }

  drawSingleBoot(lx, ly, 0)
  drawSingleBoot(rx, ry, 0)
}

function drawTorsoAndArmor(
  g: PixelGrid,
  cx: number,
  torsoY: number,
  sideView: boolean,
  isUp: boolean,
  jobId: string,
  pal: HeroPalette,
  pose: HeroPoseFrame,
  loadout?: FashionLoadoutInput | null,
): void {
  const costumeId = loadout?.costume ?? null
  const hasCostume = Boolean(costumeId && getFashionItemDef(costumeId))

  if (hasCostume && costumeId) {
    // Fashion Costume overrides armor silhouette!
    const isRobe =
      costumeId === 'costume_starlight_mage' ||
      costumeId === 'costume_sakura_kimono' ||
      costumeId === 'costume_lantern_festival' ||
      costumeId === 'costume_aurora_event'
    const isArmored =
      costumeId === 'costume_royal_knight' ||
      costumeId === 'costume_paladin_plate' ||
      costumeId === 'costume_vip_gold_regalia' ||
      costumeId === 'costume_demon_lord'
    const isAcademy = costumeId === 'costume_academy_uniform'
    const isNeko = costumeId === 'costume_neko_suit'
    const isBunny = costumeId === 'costume_bunny_suit'
    const isSanta = costumeId === 'costume_santa_claus'

    if (sideView) {
      g.rect(cx - 4, torsoY, 9, 10, pal.body)
      g.rect(cx - 4, torsoY, 2, 10, pal.bodyDark)
      g.rect(cx + 2, torsoY + 1, 3, 4, pal.bodyHi)
      g.rect(cx - 4, torsoY + 7, 9, 2, '#451a03')
      g.px(cx + 2, torsoY + 7, '#fbbf24')
      if (isRobe) {
        g.rect(cx - 5, torsoY + 8, 10, 6, pal.bodyDark)
        g.rect(cx - 3, torsoY + 8, 7, 6, pal.body)
        g.rect(cx + 2, torsoY + 8, 2, 6, pal.accent)
      } else {
        g.rect(cx - 4, torsoY + 8, 9, 3, pal.bodyDark)
      }
      if (isArmored) {
        g.rect(cx - 2, torsoY, 6, 3, pal.bodyHi)
        g.px(cx + 2, torsoY, pal.accent)
      }
      if (isNeko || isBunny) {
        // Cute tail
        const tailCol = isBunny ? '#f8fafc' : pal.body
        g.line(cx - 4, torsoY + 8, cx - 8, torsoY + (isNeko ? 4 : 7), tailCol, isBunny ? 2 : 1)
      }
      if (isSanta) {
        g.rect(cx - 4, torsoY, 9, 2, '#f8fafc')
        g.rect(cx - 4, torsoY + 9, 9, 2, '#f8fafc')
      }
      return
    }

    // Front / Back fashion costume
    g.rect(cx - 5, torsoY, 11, 10, pal.body)
    g.rect(cx - 5, torsoY + 1, 2, 9, pal.bodyDark)
    g.rect(cx + 4, torsoY + 1, 2, 9, pal.bodyDark)
    g.rect(cx - 3, torsoY + 1, 7, 4, pal.bodyHi)

    if (!isUp) {
      if (isAcademy) {
        g.rect(cx - 2, torsoY, 5, 3, '#f8fafc')
        g.rect(cx, torsoY + 1, 1, 5, '#e11d48') // red tie
      } else if (isSanta) {
        g.rect(cx - 4, torsoY, 9, 2, '#f8fafc')
        g.rect(cx, torsoY + 2, 1, 6, '#f8fafc')
      } else if (isNeko) {
        g.px(cx, torsoY + 2, '#fbbf24') // gold cat bell!
        g.px(cx - 1, torsoY + 1, '#fef08a')
      } else if (isBunny) {
        g.rect(cx - 2, torsoY + 1, 5, 2, pal.accent) // bowtie
      } else {
        g.rect(cx - 2, torsoY, 5, 2, pal.accent)
        g.px(cx, torsoY + 3, pal.accent)
      }
    }

    // Waist sash / belt
    g.rect(cx - 5, torsoY + 7, 11, 2, isRobe ? pal.accent : '#451a03')
    g.rect(cx - 1, torsoY + 7, 3, 2, '#fbbf24')

    if (isArmored) {
      // Fashion shoulder pauldrons
      g.rect(cx - 7, torsoY, 3, 3, pal.bodyHi)
      g.rect(cx + 5, torsoY, 3, 3, pal.bodyHi)
      g.px(cx - 6, torsoY, pal.accent)
      g.px(cx + 6, torsoY, pal.accent)
    }

    if (isRobe) {
      g.rect(cx - 5, torsoY + 9, 11, 5, pal.bodyDark)
      g.rect(cx - 4, torsoY + 9, 9, 4, pal.body)
      g.rect(cx - 1, torsoY + 9, 3, 5, pal.accent)
    } else {
      g.rect(cx - 5, torsoY + 9, 11, 2, pal.bodyDark)
      if (isSanta) g.rect(cx - 5, torsoY + 10, 11, 1, '#f8fafc')
    }
    return
  }

  // Class-specific bespoke torso designs (Batch 1: 5 signature classes + clean base rig for others)
  if (sideView) {
    // Class Side Torso
    if (jobId === 'novice') {
      // Slate-blue tunic + red scarf + diagonal strap + hip pouch
      g.rect(cx - 4, torsoY, 9, 10, pal.body)
      g.rect(cx - 4, torsoY, 2, 10, pal.bodyDark)
      g.rect(cx + 1, torsoY + 1, 3, 4, pal.bodyHi)
      g.rect(cx - 4, torsoY, 9, 2, '#dc2626') // red scarf wrap
      g.line(cx - 3, torsoY + 2, cx + 3, torsoY + 7, '#784421', 1) // leather strap
      g.rect(cx - 4, torsoY + 7, 9, 1, '#5c3419')
      g.px(cx + 2, torsoY + 7, '#fbbf24')
      g.rect(cx - 4, torsoY + 8, 9, 3, pal.bodyDark)
      // Hip pouch
      g.rect(cx - 3, torsoY + 7, 3, 3, '#92400e')
      g.px(cx - 2, torsoY + 8, '#fbbf24')
    } else if (jobId === 'swordsman') {
      // Fur-trimmed heavy steel armor + crimson tabard
      g.rect(cx - 4, torsoY, 9, 10, '#94a3b8')
      g.rect(cx - 4, torsoY, 2, 10, '#475569')
      g.rect(cx + 1, torsoY + 2, 4, 4, '#e2e8f0') // steel chest highlight
      g.rect(cx - 4, torsoY, 8, 2, '#f8fafc') // fur collar
      g.rect(cx - 2, torsoY + 1, 5, 3, '#cbd5e1') // shoulder pauldron
      g.rect(cx - 4, torsoY + 6, 9, 2, '#78350f')
      g.rect(cx - 3, torsoY + 8, 8, 4, '#b91c1c') // red tabard
    } else if (jobId === 'mage') {
      // Indigo/purple rune robe + gold shoulder mantle + spellbook
      g.rect(cx - 4, torsoY, 9, 10, '#4c1d95')
      g.rect(cx - 4, torsoY, 2, 10, '#2e1065')
      g.rect(cx + 1, torsoY + 2, 4, 4, '#6d28d9')
      g.rect(cx - 3, torsoY, 7, 2, '#f59e0b') // gold mantle
      g.rect(cx - 5, torsoY + 8, 10, 6, '#312e81')
      g.rect(cx - 3, torsoY + 8, 7, 6, '#4338ca')
      g.rect(cx + 2, torsoY + 8, 2, 6, '#f59e0b')
      // Spellbook at hip
      g.rect(cx - 3, torsoY + 6, 4, 4, '#92400e')
      g.px(cx - 1, torsoY + 7, '#c084fc')
    } else if (jobId === 'archer') {
      // Studded leather brigandine + forest cloak collar
      g.rect(cx - 4, torsoY, 9, 10, '#7c4a26')
      g.rect(cx - 4, torsoY, 2, 10, '#4a2b13')
      g.rect(cx - 3, torsoY, 7, 2, '#15803d') // hood mantle
      g.px(cx + 2, torsoY + 3, '#d97706') // leather stud
      g.px(cx + 2, torsoY + 5, '#d97706')
      g.rect(cx - 4, torsoY + 7, 9, 1, '#451a03')
      g.rect(cx - 4, torsoY + 8, 9, 3, '#166534')
    } else if (jobId === 'cleric') {
      // White & sky-blue sun vestment robe
      g.rect(cx - 4, torsoY, 9, 10, '#f8fafc')
      g.rect(cx - 4, torsoY, 2, 10, '#cbd5e1')
      g.rect(cx - 3, torsoY, 7, 2, '#38bdf8') // sky-blue shoulder drape
      g.rect(cx + 1, torsoY + 2, 3, 7, '#38bdf8')
      g.rect(cx - 4, torsoY + 7, 9, 1, '#38bdf8')
      g.rect(cx - 5, torsoY + 8, 10, 6, '#e2e8f0')
      g.rect(cx - 3, torsoY + 8, 7, 6, '#f8fafc')
      g.rect(cx + 2, torsoY + 8, 2, 6, '#fbbf24')
    } else {
      // Clean proportional Base Adventurer Rig for remaining 10 classes (until Batches 2 & 3)
      g.rect(cx - 4, torsoY, 9, 10, pal.body)
      g.rect(cx - 4, torsoY, 2, 10, pal.bodyDark)
      g.rect(cx + 1, torsoY + 1, 3, 4, pal.bodyHi)
      g.rect(cx - 3, torsoY, 7, 2, pal.accent)
      g.rect(cx - 4, torsoY + 7, 9, 1, '#451a03')
      g.px(cx + 2, torsoY + 7, '#fbbf24')
      g.rect(cx - 4, torsoY + 8, 9, 3, pal.bodyDark)
    }
    return
  }

  // Front ('down') & Back ('up') Class Torso
  if (jobId === 'novice') {
    g.rect(cx - 5, torsoY, 11, 10, pal.body)
    g.rect(cx - 5, torsoY + 1, 2, 9, pal.bodyDark)
    g.rect(cx + 4, torsoY + 1, 2, 9, pal.bodyDark)
    g.rect(cx - 3, torsoY + 2, 7, 4, pal.bodyHi)
    // Crimson neck scarf
    g.rect(cx - 4, torsoY, 9, 2, '#dc2626')
    g.rect(cx - 2, torsoY + 2, 5, 1, '#b91c1c')
    if (!isUp) {
      // Crossbody leather strap + buckle
      g.line(cx + 3, torsoY + 2, cx - 3, torsoY + 7, '#784421', 1)
      g.px(cx + 1, torsoY + 4, '#cbd5e1')
    }
    // Belt + gold buckle + hip pouch
    g.rect(cx - 5, torsoY + 7, 11, 1, '#5c3419')
    g.rect(cx - 1, torsoY + 7, 3, 1, '#fbbf24')
    g.rect(cx - 5, torsoY + 8, 11, 3, pal.bodyDark)
    g.rect(cx - 2, torsoY + 8, 5, 3, '#334155')
    if (!isUp) {
      g.rect(cx + 3, torsoY + 8, 3, 3, '#92400e') // waist pouch
      g.px(cx + 4, torsoY + 9, '#fbbf24')
    }
  } else if (jobId === 'swordsman') {
    // Heavy armor chest + fur mantle + steel pauldrons + red surcoat
    g.rect(cx - 5, torsoY, 11, 10, '#94a3b8')
    g.rect(cx - 5, torsoY + 1, 2, 9, '#475569')
    g.rect(cx + 4, torsoY + 1, 2, 9, '#475569')
    g.rect(cx - 3, torsoY + 2, 7, 3, '#e2e8f0')
    // Wolf fur mantle at collar
    g.rect(cx - 6, torsoY - 1, 13, 2, '#f8fafc')
    g.rect(cx - 5, torsoY + 1, 11, 1, '#cbd5e1')
    // Heavy steel pauldrons
    g.rect(cx - 7, torsoY, 3, 4, '#cbd5e1')
    g.rect(cx + 5, torsoY, 3, 4, '#cbd5e1')
    g.px(cx - 6, torsoY + 1, '#ffffff')
    g.px(cx + 6, torsoY + 1, '#ffffff')
    // Crimson waist tabard
    g.rect(cx - 5, torsoY + 6, 11, 1, '#78350f')
    g.rect(cx - 1, torsoY + 6, 3, 1, '#fbbf24')
    g.rect(cx - 3, torsoY + 7, 7, 5, '#b91c1c')
    g.rect(cx - 2, torsoY + 8, 5, 3, '#dc2626')
    g.rect(cx - 5, torsoY + 7, 2, 3, '#64748b') // tassets
    g.rect(cx + 4, torsoY + 7, 2, 3, '#64748b')
  } else if (jobId === 'mage') {
    // Deep indigo & purple arcane robe + gold shoulder mantle + spellbook
    g.rect(cx - 5, torsoY, 11, 10, '#4c1d95')
    g.rect(cx - 5, torsoY + 1, 2, 9, '#2e1065')
    g.rect(cx + 4, torsoY + 1, 2, 9, '#2e1065')
    g.rect(cx - 3, torsoY + 2, 7, 4, '#6d28d9')
    // Gold shoulder mantle + amethyst chest gem
    g.rect(cx - 7, torsoY, 15, 2, '#f59e0b')
    g.rect(cx - 6, torsoY + 1, 13, 1, '#fde047')
    if (!isUp) {
      g.px(cx, torsoY + 2, '#e879f9')
      g.px(cx, torsoY + 3, '#a855f7')
    }
    // Belt + spellbook
    g.rect(cx - 5, torsoY + 7, 11, 1, '#78350f')
    g.rect(cx - 1, torsoY + 7, 3, 1, '#fbbf24')
    // Flowing layered robe hem with gold trim
    g.rect(cx - 5, torsoY + 8, 11, 6, '#312e81')
    g.rect(cx - 4, torsoY + 8, 9, 5, '#4338ca')
    g.rect(cx - 2, torsoY + 8, 5, 6, '#6d28d9')
    g.rect(cx - 1, torsoY + 12, 3, 2, '#f59e0b')
    if (!isUp) {
      g.rect(cx + 3, torsoY + 7, 3, 4, '#92400e')
      g.px(cx + 4, torsoY + 8, '#c084fc')
    }
  } else if (jobId === 'archer') {
    // Studded leather jerkin over olive tunic + green ranger mantle
    g.rect(cx - 5, torsoY, 11, 10, '#7c4a26')
    g.rect(cx - 5, torsoY + 1, 2, 9, '#4a2b13')
    g.rect(cx + 4, torsoY + 1, 2, 9, '#4a2b13')
    g.rect(cx - 3, torsoY + 2, 7, 4, '#9a5f32')
    // Forest green cloak clasp
    g.rect(cx - 5, torsoY, 11, 2, '#15803d')
    if (!isUp) {
      g.px(cx, torsoY + 1, '#cbd5e1') // silver brooch
      g.px(cx - 2, torsoY + 3, '#d97706')
      g.px(cx + 2, torsoY + 3, '#d97706')
      g.px(cx - 2, torsoY + 5, '#d97706')
      g.px(cx + 2, torsoY + 5, '#d97706')
    }
    g.rect(cx - 5, torsoY + 7, 11, 1, '#451a03')
    g.rect(cx - 1, torsoY + 7, 3, 1, '#94a3b8')
    g.rect(cx - 5, torsoY + 8, 11, 3, '#166534')
    g.rect(cx - 2, torsoY + 8, 5, 3, '#15803d')
  } else if (jobId === 'cleric') {
    // White & sky-blue sun-emblem vestment robe with gold border
    g.rect(cx - 5, torsoY, 11, 10, '#f8fafc')
    g.rect(cx - 5, torsoY + 1, 2, 9, '#cbd5e1')
    g.rect(cx + 4, torsoY + 1, 2, 9, '#cbd5e1')
    // Sky blue stole & shoulders
    g.rect(cx - 6, torsoY, 13, 2, '#38bdf8')
    g.rect(cx - 2, torsoY + 1, 5, 9, '#38bdf8')
    if (!isUp) {
      // Sun crest on chest
      g.rect(cx - 1, torsoY + 3, 3, 2, '#fbbf24')
      g.px(cx, torsoY + 2, '#fde047')
    }
    g.rect(cx - 5, torsoY + 7, 11, 1, '#0284c7')
    g.rect(cx - 5, torsoY + 8, 11, 6, '#e2e8f0')
    g.rect(cx - 4, torsoY + 8, 9, 5, '#f8fafc')
    g.rect(cx - 2, torsoY + 8, 5, 5, '#38bdf8')
    g.rect(cx - 1, torsoY + 12, 3, 2, '#fbbf24')
  } else {
    // Clean proportional Base Adventurer Rig for remaining 10 classes
    g.rect(cx - 5, torsoY, 11, 10, pal.body)
    g.rect(cx - 5, torsoY + 1, 2, 9, pal.bodyDark)
    g.rect(cx + 4, torsoY + 1, 2, 9, pal.bodyDark)
    g.rect(cx - 3, torsoY + 2, 7, 4, pal.bodyHi)
    g.rect(cx - 4, torsoY, 9, 2, pal.accent)
    g.rect(cx - 5, torsoY + 7, 11, 1, '#451a03')
    g.rect(cx - 1, torsoY + 7, 3, 1, '#fbbf24')
    g.rect(cx - 5, torsoY + 8, 11, 3, pal.bodyDark)
  }

  // Subtle sway indicator for cape/coat tails when moving
  if (pose.sway !== 0 && !sideView && isUp) {
    g.px(cx - 5, torsoY + 11, pal.bodyDark)
    g.px(cx + 5, torsoY + 11, pal.bodyDark)
  }
}

function drawHeadAndFace(
  g: PixelGrid,
  cx: number,
  headY: number,
  sideView: boolean,
  isUp: boolean,
  pal: HeroPalette,
  pose: HeroPoseFrame,
): void {
  // Neck
  g.rect(cx - 1, headY + 11, 3, 2, pal.skinDark)

  if (sideView) {
    // Rounded 3/4 profile head (11px wide x 11px tall)
    g.rect(cx - 4, headY, 8, 2, pal.skinHi)
    g.rect(cx - 5, headY + 2, 10, 6, pal.skin)
    g.rect(cx - 4, headY + 8, 9, 2, pal.skin)
    g.rect(cx - 3, headY + 10, 7, 1, pal.skinDark)
    g.px(cx - 5, headY + 5, pal.skinDark) // ear

    // Expressive profile eye
    if (!pose.blink) {
      g.px(cx + 2, headY + 5, INK) // upper lash
      g.px(cx + 3, headY + 5, INK)
      g.px(cx + 2, headY + 6, '#ffffff')
      g.px(cx + 3, headY + 6, pal.eye)
      g.px(cx + 2, headY + 7, pal.eye)
      g.px(cx + 3, headY + 7, pal.eye)
    } else {
      g.rect(cx + 2, headY + 7, 2, 1, INK)
    }
    // Rosy cheek + smile
    g.px(cx + 1, headY + 8, '#f4978e')
    g.px(cx + 3, headY + 9, pal.skinDark)
    return
  }

  // Front / Back sculpted head (13px wide x 11px tall)
  g.rect(cx - 5, headY, 11, 2, pal.skinHi)
  g.rect(cx - 6, headY + 2, 13, 6, pal.skin)
  g.rect(cx - 5, headY + 8, 11, 2, pal.skin)
  g.rect(cx - 3, headY + 10, 7, 1, pal.skinDark)
  if (!isUp) {
    // Ears
    g.px(cx - 7, headY + 5, pal.skin)
    g.px(cx - 7, headY + 6, pal.skinDark)
    g.px(cx + 7, headY + 5, pal.skin)
    g.px(cx + 7, headY + 6, pal.skinDark)

    if (!pose.blink) {
      // Expressive 2x3 anime/MMORPG pixel eyes
      g.px(cx - 4, headY + 5, INK)
      g.px(cx - 3, headY + 5, INK)
      g.px(cx - 4, headY + 6, '#ffffff')
      g.px(cx - 3, headY + 6, pal.eye)
      g.px(cx - 4, headY + 7, pal.eye)
      g.px(cx - 3, headY + 7, pal.eye)

      g.px(cx + 3, headY + 5, INK)
      g.px(cx + 4, headY + 5, INK)
      g.px(cx + 4, headY + 6, '#ffffff')
      g.px(cx + 3, headY + 6, pal.eye)
      g.px(cx + 3, headY + 7, pal.eye)
      g.px(cx + 4, headY + 7, pal.eye)
    } else {
      g.rect(cx - 4, headY + 7, 2, 1, INK)
      g.rect(cx + 3, headY + 7, 2, 1, INK)
    }

    // Cheek blush & small mouth
    g.px(cx - 5, headY + 8, '#f4978e')
    g.px(cx + 5, headY + 8, '#f4978e')
    g.px(cx, headY + 9, pose.action === 'attack' ? '#9a3412' : pal.skinDark)
  }
}

function drawHairAndHeadgear(
  g: PixelGrid,
  vfx: PixelGrid,
  cx: number,
  headY: number,
  sideView: boolean,
  isUp: boolean,
  jobId: string,
  pal: HeroPalette,
  pose: HeroPoseFrame,
  loadout?: FashionLoadoutInput | null,
): void {
  const fashionHairId = loadout?.hair ?? null
  const fashionHatId = loadout?.hat ?? null
  const hasFashionHair = Boolean(fashionHairId && getFashionItemDef(fashionHairId))
  const hasFashionHat = Boolean(fashionHatId && getFashionItemDef(fashionHatId))

  const isRangerHood = !hasFashionHat && !hasFashionHair && jobId === 'archer'
  const isLongHair =
    fashionHairId === 'hair_silver_lunar' ||
    fashionHairId === 'hair_aurora_prism' ||
    (!hasFashionHair && jobId === 'mage')
  const isTwinTail = fashionHairId === 'hair_celestial_twintail'
  const isTopknot = fashionHairId === 'hair_samurai_topknot'
  const isSpiky =
    fashionHairId === 'hair_bronze_crest' ||
    fashionHairId === 'hair_crimson_spike' ||
    (!hasFashionHair && (jobId === 'novice' || jobId === 'swordsman'))

  // 1. Hair Layer (unless covered by full ranger hood)
  if (!isRangerHood) {
    if (isUp) {
      g.rect(cx - 6, headY - 2, 13, 11, pal.hair)
      g.rect(cx - 4, headY - 3, 9, 2, pal.hair)
      g.rect(cx - 4, headY - 1, 9, 1, pal.hairHi)
      g.rect(cx - 5, headY + 8, 11, 3, pal.hairDark)
      if (isLongHair) {
        g.rect(cx - 5, headY + 10, 11, 5, pal.hair)
        g.rect(cx - 4, headY + 14, 9, 2, pal.hairDark)
      } else if (isTwinTail) {
        g.rect(cx - 8, headY + 4, 3, 10, pal.hair)
        g.rect(cx + 6, headY + 4, 3, 10, pal.hair)
        g.px(cx - 7, headY + 4, pal.hairHi)
        g.px(cx + 7, headY + 4, pal.hairHi)
      } else if (isTopknot) {
        g.rect(cx - 1, headY - 6, 3, 4, pal.hair)
        g.rect(cx - 2, headY - 4, 5, 1, '#ef4444')
      }
    } else if (sideView) {
      g.rect(cx - 5, headY - 2, 10, 4, pal.hair)
      g.rect(cx - 4, headY - 3, 7, 2, pal.hair)
      g.rect(cx - 2, headY - 2, 4, 1, pal.hairHi)
      // Back & sideburn
      g.rect(cx - 6, headY + 1, 4, 7, pal.hairDark)
      g.rect(cx - 3, headY + 1, 2, 5, pal.hair)
      // Forehead swept bangs
      g.rect(cx, headY + 1, 5, 3, pal.hair)
      g.px(cx + 4, headY + 4, pal.hairDark)
      if (isSpiky) {
        g.px(cx - 5, headY - 3, pal.hairHi)
        g.px(cx - 1, headY - 4, pal.hairHi)
        g.px(cx + 3, headY - 3, pal.hair)
      }
      if (isLongHair) {
        g.rect(cx - 7, headY + 3, 4, 10, pal.hair)
        g.rect(cx - 6, headY + 5, 2, 8, pal.hairHi)
      } else if (isTwinTail) {
        g.rect(cx - 7, headY + 3, 3, 11, pal.hair)
        g.px(cx - 6, headY + 3, '#fde68a')
      } else if (isTopknot) {
        g.rect(cx - 5, headY - 5, 3, 4, pal.hair)
        g.px(cx - 4, headY - 3, '#ef4444')
      }
    } else {
      // Front hair crown + temple side locks + styled bangs
      g.rect(cx - 6, headY - 2, 13, 4, pal.hair)
      g.rect(cx - 4, headY - 3, 9, 2, pal.hair)
      g.rect(cx - 3, headY - 2, 7, 1, pal.hairHi)
      // Side locks framing cheeks
      g.rect(cx - 6, headY + 1, 2, 7, pal.hair)
      g.rect(cx + 5, headY + 1, 2, 7, pal.hair)
      g.px(cx - 6, headY + 7, pal.hairDark)
      g.px(cx + 6, headY + 7, pal.hairDark)
      // Styled bangs
      g.rect(cx - 5, headY + 1, 11, 2, pal.hair)
      g.px(cx - 3, headY + 3, pal.hairDark)
      g.px(cx, headY + 3, pal.hair)
      g.px(cx + 3, headY + 3, pal.hairDark)

      if (isSpiky) {
        g.px(cx - 5, headY - 3, pal.hairHi)
        g.px(cx - 2, headY - 4, pal.hairHi)
        g.px(cx + 1, headY - 5, pal.hair)
        g.px(cx + 4, headY - 4, pal.hairHi)
        g.px(cx + 6, headY - 2, pal.hair)
      }
      if (isLongHair) {
        g.rect(cx - 7, headY + 4, 2, 10, pal.hairDark)
        g.rect(cx + 6, headY + 4, 2, 10, pal.hairDark)
        g.px(cx - 7, headY + 12, pal.hair)
        g.px(cx + 6, headY + 12, pal.hair)
      } else if (isTwinTail) {
        g.rect(cx - 8, headY + 3, 2, 11, pal.hair)
        g.rect(cx + 7, headY + 3, 2, 11, pal.hair)
        g.px(cx - 7, headY + 3, '#fde68a')
        g.px(cx + 7, headY + 3, '#fde68a')
      } else if (isTopknot) {
        g.rect(cx - 1, headY - 6, 3, 4, pal.hair)
        g.rect(cx - 2, headY - 4, 5, 1, '#ef4444')
      }
    }
  } else {
    // Windstalker Ranger Hood + Twin Braids (from concept art!)
    g.rect(cx - 7, headY - 2, 15, 4, '#15803d')
    g.rect(cx - 5, headY - 4, 11, 3, '#22c55e')
    if (isUp) {
      g.rect(cx - 7, headY, 15, 11, '#15803d')
      g.rect(cx - 5, headY + 2, 11, 8, '#14532d')
    } else if (sideView) {
      g.rect(cx - 7, headY, 6, 11, '#14532d')
      g.rect(cx - 6, headY, 4, 9, '#15803d')
      g.rect(cx - 1, headY + 1, 5, 2, pal.hair) // auburn bangs
      g.rect(cx + 1, headY + 6, 2, 6, pal.hair) // auburn braid
      g.px(cx + 1, headY + 12, '#86efac')
    } else {
      g.rect(cx - 7, headY + 1, 2, 9, '#14532d')
      g.rect(cx + 6, headY + 1, 2, 9, '#14532d')
      g.rect(cx - 5, headY + 1, 11, 2, pal.hair) // auburn bangs
      // Twin braids framing chest
      g.rect(cx - 5, headY + 7, 2, 7, pal.hair)
      g.rect(cx + 4, headY + 7, 2, 7, pal.hair)
      g.px(cx - 5, headY + 13, '#d97706')
      g.px(cx + 4, headY + 13, '#d97706')
    }
  }

  // 2. Cleric Floating Golden Halo (unless wearing demon horns)
  if (jobId === 'cleric' && fashionHatId !== 'hat_demon_horns') {
    const floatY = headY - 6 + (pose.frameIdx % 2 === 0 ? 0 : -1)
    vfx.rect(cx - 4, floatY, 9, 1, '#f59e0b')
    vfx.rect(cx - 3, floatY - 1, 7, 1, '#fde047')
    vfx.px(cx, floatY - 1, '#ffffff')
  }

  // 3. Fashion Hat Overlay (all 10 hats in PREMIUM_FASHION_ITEMS!)
  if (hasFashionHat && fashionHatId) {
    const hatDef = getFashionItemDef(fashionHatId)!
    const h1 = hatDef.primaryColor
    const h2 = hatDef.secondaryColor
    const h3 = hatDef.accentColor

    switch (fashionHatId) {
      case 'hat_wizard_pointed': {
        g.rect(cx - 8, headY + 1, 17, 2, h2)
        g.rect(cx - 7, headY, 15, 2, h1)
        g.rect(cx - 5, headY - 3, 11, 3, h1)
        g.rect(cx - 4, headY - 5, 9, 2, h1)
        g.rect(cx - 2, headY - 7, 5, 2, h2)
        g.px(cx - 1, headY - 8, h1)
        g.rect(cx - 5, headY - 1, 11, 1, h3) // gold ribbon
        if (!isUp) g.px(cx, headY - 1, '#ffffff')
        break
      }
      case 'hat_adventurer_beret':
      case 'hat_academy_cap': {
        g.rect(cx - 6, headY - 1, 13, 3, h2)
        g.rect(cx - 5, headY - 3, 11, 3, h1)
        g.rect(cx - 3, headY - 4, 7, 1, shadePx(h1, 0.2))
        g.rect(cx - 5, headY + 1, 11, 1, h3)
        if (fashionHatId === 'hat_adventurer_beret') {
          g.line(cx - 4, headY - 3, cx - 8, headY - 6, h3, 1) // feather
        } else if (!isUp) {
          g.px(cx, headY, h3) // academy gold crest
        }
        break
      }
      case 'aurora_cat_hood': {
        g.rect(cx - 6, headY - 1, 13, 3, h2)
        g.rect(cx - 5, headY - 2, 11, 2, h1)
        // Cat ears
        g.rect(cx - 6, headY - 5, 3, 3, h1)
        g.rect(cx + 4, headY - 5, 3, 3, h1)
        g.px(cx - 5, headY - 4, '#fda4af')
        g.px(cx + 5, headY - 4, '#fda4af')
        g.px(cx - 5, headY - 6, h3)
        g.px(cx + 5, headY - 6, h3)
        break
      }
      case 'hat_sakura_ribbon': {
        g.rect(cx - 5, headY - 4, 4, 3, h1)
        g.rect(cx + 2, headY - 4, 4, 3, h1)
        g.rect(cx - 1, headY - 3, 3, 2, h2)
        g.px(cx, headY - 2, h3)
        break
      }
      case 'hat_valkyrie_crown':
      case 'hat_prince_circlet': {
        g.rect(cx - 5, headY - 1, 11, 2, h2)
        g.rect(cx - 4, headY - 2, 9, 2, h1)
        g.px(cx - 4, headY - 4, h1)
        g.px(cx, headY - 5, h1)
        g.px(cx + 4, headY - 4, h1)
        g.px(cx, headY - 2, h3)
        if (fashionHatId === 'hat_valkyrie_crown') {
          // Wing tips on crown sides
          g.line(cx - 6, headY - 1, cx - 9, headY - 5, h3, 1)
          g.line(cx + 6, headY - 1, cx + 9, headY - 5, h3, 1)
        }
        break
      }
      case 'hat_santa_cap': {
        g.rect(cx - 6, headY, 13, 2, '#f8fafc')
        g.rect(cx - 5, headY - 3, 10, 3, h1)
        g.rect(cx - 3, headY - 5, 6, 2, h1)
        g.rect(cx + 2, headY - 4, 3, 2, h2)
        g.rect(cx + 4, headY - 2, 2, 2, '#f8fafc') // pom-pom
        break
      }
      case 'hat_bunny_ears': {
        g.rect(cx - 5, headY - 1, 11, 2, h2)
        g.rect(cx - 4, headY - 7, 2, 6, h1)
        g.rect(cx + 3, headY - 7, 2, 6, h1)
        g.px(cx - 3, headY - 5, h3)
        g.px(cx + 3, headY - 5, h3)
        break
      }
      case 'hat_demon_horns': {
        g.line(cx - 4, headY, cx - 7, headY - 5, h1, 2)
        g.px(cx - 8, headY - 6, h3)
        g.line(cx + 4, headY, cx + 7, headY - 5, h1, 2)
        g.px(cx + 8, headY - 6, h3)
        break
      }
    }
  }

  // 4. Fashion Accessory Overlay (scarf / glasses / fox mask / frost earrings)
  const accId = loadout?.accessory ?? null
  if (accId && getFashionItemDef(accId)) {
    const accDef = getFashionItemDef(accId)!
    if (accId === 'acc_crimson_scarf') {
      g.rect(cx - 5, headY + 10, 11, 2, accDef.primaryColor)
      g.rect(cx - 4, headY + 11, 3, 3, accDef.secondaryColor)
    } else if (accId === 'acc_scholar_glasses' && !isUp) {
      if (sideView) {
        g.rect(cx + 1, headY + 5, 4, 3, accDef.primaryColor)
        g.px(cx + 2, headY + 6, '#bae6fd')
      } else {
        g.rect(cx - 5, headY + 5, 4, 3, accDef.primaryColor)
        g.rect(cx + 2, headY + 5, 4, 3, accDef.primaryColor)
        g.px(cx, headY + 6, accDef.primaryColor)
        g.px(cx - 3, headY + 6, '#bae6fd')
        g.px(cx + 3, headY + 6, '#bae6fd')
      }
    } else if (accId === 'acc_fox_mask') {
      // Kitsune fox mask worn on side of temple
      const mx = sideView ? cx - 3 : cx + 4
      const my = headY - 1
      g.rect(mx - 2, my, 5, 4, '#f8fafc')
      g.px(mx - 2, my - 1, '#dc2626')
      g.px(mx + 2, my - 1, '#dc2626')
      g.px(mx, my + 2, '#dc2626')
    } else if (accId === 'acc_frost_earrings' && !isUp) {
      if (sideView) {
        g.px(cx - 5, headY + 7, accDef.primaryColor)
        g.px(cx - 5, headY + 8, '#ffffff')
      } else {
        g.px(cx - 7, headY + 7, accDef.primaryColor)
        g.px(cx + 7, headY + 7, accDef.primaryColor)
      }
    }
  }
}

export interface PixelHeroRenderResult {
  bodyGrid: PixelGrid
  vfxGrid: PixelGrid
  dir: Dir
  action: HeroPoseFrame['action']
  frame: number
  isBatch1Bespoke: boolean
}

export function buildHeroPixelFrame(opts: {
  colors: HumanColors
  dir: Dir
  frame: number
  weapon?: WeaponType | null
  weaponColor?: string
  attacking?: boolean
  actionOverride?: SpriteAction
  attackFrameOverride?: number
  fashion?: FashionLoadoutInput | null
  timeSec?: number
}): PixelHeroRenderResult {
  const {
    colors,
    dir,
    frame,
    weapon = null,
    weaponColor = '#ced4da',
    attacking = false,
    actionOverride,
    attackFrameOverride,
    fashion,
    timeSec = 0,
  } = opts

  const jobId = normalizeJobId(colors.jobId ?? 'novice')
  const pose = resolveHeroPoseFrame(actionOverride, frame, weapon, attacking, attackFrameOverride)
  const pal = buildPalette(colors, jobId, fashion)
  const g = new PixelGrid(PIXEL_HERO_GRID_SIZE, PIXEL_HERO_GRID_SIZE)
  const vfx = new PixelGrid(PIXEL_HERO_GRID_SIZE, PIXEL_HERO_GRID_SIZE)

  const sideView = dir === 'left' || dir === 'right'
  const isUp = dir === 'up'
  const timeTick = Math.floor(timeSec * 8)

  const cx = 24 + (sideView ? pose.leanX : 0)
  const footY = 45
  const hipY = 34 + pose.bobY
  const torsoY = 23 + pose.bobY
  const headY = 10 + pose.bobY + (pose.deathStage >= 3 ? 2 : 0)

  // 1. Aura FX behind/under hero
  drawAuraPixels(vfx, fashion?.aura, cx, footY, pose.frameIdx, timeTick)

  // 2. Skill magic ring at feet
  if (pose.action === 'skill') {
    const ringCol = jobId === 'mage' ? '#c084fc' : jobId === 'cleric' ? '#fde047' : jobId === 'archer' ? '#4ade80' : '#38bdf8'
    for (let dx = -9; dx <= 9; dx++) {
      if (Math.abs(dx) % 2 === 0) vfx.px(cx + dx, footY, ringCol)
    }
  }

  // 3. Back items & Wings behind torso (when facing down/side)
  if (!isUp) {
    drawBackFashion(g, vfx, fashion?.back, cx, torsoY, sideView, isUp, pose.sway)
    drawPixelWings(g, vfx, fashion?.wings, cx, torsoY, sideView, isUp, pose, timeTick)
  }

  // Class cape / quiver behind torso (if no fashion costume/back overrides it)
  if (!fashion?.back && !fashion?.costume) {
    if (jobId === 'novice' || jobId === 'swordsman' || jobId === 'archer') {
      if (sideView) {
        g.line(cx - 3, torsoY + 1, cx - 7 + Math.round(pose.sway * 0.4), torsoY + 11, pal.cape, 3)
        g.line(cx - 4, torsoY + 2, cx - 7 + Math.round(pose.sway * 0.4), torsoY + 12, pal.capeDark, 2)
      } else if (isUp) {
        g.rect(cx - 5, torsoY + 1, 11, 11, pal.cape)
        g.rect(cx - 4, torsoY + 2, 9, 9, pal.capeDark)
      } else {
        g.rect(cx - 6, torsoY + 2, 1, 10, pal.capeDark)
        g.rect(cx + 6, torsoY + 2, 1, 10, pal.capeDark)
      }
    }
    if (jobId === 'archer') {
      // Quiver of feathered arrows!
      if (sideView) {
        g.line(cx - 4, torsoY - 1, cx - 7, torsoY + 6, '#78350f', 2)
        g.px(cx - 5, torsoY - 2, '#f8fafc')
        g.px(cx - 3, torsoY - 2, '#fde047')
      } else if (isUp) {
        g.line(cx + 3, torsoY - 2, cx - 2, torsoY + 7, '#78350f', 2)
        g.px(cx + 3, torsoY - 3, '#f8fafc')
        g.px(cx + 4, torsoY - 3, '#fde047')
      }
    }
  }

  // 4. Weapon behind when facing UP
  if (isUp && weapon) {
    drawPixelWeapon(g, vfx, cx + 6, torsoY + 4 + pose.handLiftY, weapon, weaponColor, pose, false, true, jobId, fashion?.weaponSkin)
  }

  // 5. Legs & Boots
  drawLegsAndBoots(g, cx, hipY, footY, sideView, isUp, pal, pose, fashion)

  // 6. Back Arm (side view)
  if (sideView) {
    const baX = cx + 3 + Math.round(pose.armASwing * 0.5)
    const baY = torsoY + 6
    g.line(cx + 1, torsoY + 2, baX, baY, pal.bodyDark, 2)
    g.rect(baX, baY, 2, 2, pal.skinDark)
    if (weapon === 'bow') {
      drawPixelWeapon(g, vfx, baX + 3, baY - 2, weapon, weaponColor, pose, true, false, jobId, fashion?.weaponSkin)
    }
  }

  // 7. Torso & Armor / Costume
  drawTorsoAndArmor(g, cx, torsoY, sideView, isUp, jobId, pal, pose, fashion)

  // 8. Head, Face, Hair & Hat
  drawHeadAndFace(g, cx, headY, sideView, isUp, pal, pose)
  drawHairAndHeadgear(g, vfx, cx, headY, sideView, isUp, jobId, pal, pose, fashion)

  // 9. Front Arm + Gauntlets + Shield + Weapon
  if (sideView) {
    const faShX = cx - 1
    const faShY = torsoY + 2
    const faHandX = cx + 2 + pose.handPushX + Math.round(pose.armBSwing * 0.5)
    const faHandY = torsoY + 6 + pose.handLiftY
    g.line(faShX, faShY, faHandX, faHandY, pal.body, 2)
    g.px(faHandX - 1, faHandY - 1, jobId === 'novice' ? '#784421' : pal.accent)
    g.rect(faHandX, faHandY, 2, 2, pal.skin)

    // Vanguard Wolf Kite Shield
    if (jobId === 'swordsman' && !fashion?.costume) {
      const shX = cx + 4
      const shY = torsoY + 2
      g.rect(shX, shY, 5, 7, '#64748b')
      g.rect(shX + 1, shY + 1, 3, 5, '#94a3b8')
      g.px(shX + 2, shY + 7, '#475569')
      g.px(shX + 2, shY + 3, '#e2e8f0') // wolf crest
    }

    if (weapon !== 'bow') {
      drawPixelWeapon(g, vfx, faHandX + 1, faHandY, weapon, weaponColor, pose, true, false, jobId, fashion?.weaponSkin)
    }
  } else {
    // Left & Right arms (front/back view)
    const lHandX = cx - 6
    const lHandY = torsoY + 6 + Math.round(pose.armASwing * 0.4)
    const rHandX = cx + 6 + (pose.action === 'attack' ? 1 : 0)
    const rHandY = torsoY + 6 + Math.round(pose.armBSwing * 0.4) + pose.handLiftY

    g.line(cx - 5, torsoY + 2, lHandX, lHandY, pal.bodyDark, 2)
    g.rect(lHandX, lHandY, 2, 2, pal.skinDark)

    g.line(cx + 5, torsoY + 2, rHandX, rHandY, pal.body, 2)
    g.rect(rHandX, rHandY, 2, 2, pal.skin)

    // Vanguard Wolf Kite Shield (front view on left arm)
    if (!isUp && jobId === 'swordsman' && !fashion?.costume) {
      g.rect(lHandX - 2, lHandY - 3, 5, 7, '#64748b')
      g.rect(lHandX - 1, lHandY - 2, 3, 5, '#cbd5e1')
      g.px(lHandX, lHandY + 4, '#475569')
      g.px(lHandX, lHandY, '#f8fafc')
      g.px(lHandX, lHandY + 1, '#94a3b8')
    }

    if (!isUp && weapon) {
      drawPixelWeapon(g, vfx, rHandX + 1, rHandY, weapon, weaponColor, pose, false, false, jobId, fashion?.weaponSkin)
    }
  }

  // 10. Over-back wings & back accessories when facing UP
  if (isUp) {
    drawBackFashion(g, vfx, fashion?.back, cx, torsoY, sideView, isUp, pose.sway)
    drawPixelWings(g, vfx, fashion?.wings, cx, torsoY, sideView, isUp, pose, timeTick)
  }

  const finalBody = dir === 'left' ? g.mirrorHorizontally() : g
  const finalVfx = dir === 'left' ? vfx.mirrorHorizontally() : vfx

  return {
    bodyGrid: finalBody,
    vfxGrid: finalVfx,
    dir,
    action: pose.action,
    frame: pose.frameIdx,
    isBatch1Bespoke: BATCH1_BESPOKE_HERO_IDS.has(jobId),
  }
}

const MAX_PIXEL_HERO_CACHE = 480
const pixelHeroCanvasCache = new Map<string, HTMLCanvasElement>()

export function clearPixelHeroCache(): void {
  for (const c of pixelHeroCanvasCache.values()) {
    try {
      c.width = 0
      c.height = 0
    } catch {
      // ignore
    }
  }
  pixelHeroCanvasCache.clear()
}

export function renderPixelHeroCanvas(opts: {
  colors: HumanColors
  dir: Dir
  frame: number
  weapon?: WeaponType | null
  weaponColor?: string
  attacking?: boolean
  actionOverride?: SpriteAction
  attackFrameOverride?: number
  fashion?: FashionLoadoutInput | null
  timeSec?: number
}): HTMLCanvasElement {
  const jobId = normalizeJobId(opts.colors.jobId ?? 'novice')
  const pose = resolveHeroPoseFrame(
    opts.actionOverride,
    opts.frame,
    opts.weapon ?? null,
    opts.attacking,
    opts.attackFrameOverride,
  )
  const fashionSig = opts.fashion
    ? [
        opts.fashion.hat ?? '',
        opts.fashion.hair ?? '',
        opts.fashion.costume ?? '',
        opts.fashion.pants ?? '',
        opts.fashion.shoes ?? '',
        opts.fashion.wings ?? '',
        opts.fashion.back ?? '',
        opts.fashion.accessory ?? '',
        opts.fashion.aura ?? '',
        opts.fashion.weaponSkin ?? '',
      ].join(',')
    : ''
  const animTick =
    opts.fashion?.aura || opts.fashion?.wings ? Math.floor((opts.timeSec ?? 0) * 8) % 6 : 0

  const key = `pxh2|${jobId}|${opts.colors.body}|${opts.colors.hair}|${opts.dir}|${pose.action}|${pose.blink ? 'blink' : pose.frameIdx}|${opts.weapon ?? 'none'}|${opts.weaponColor ?? ''}|${fashionSig}|${animTick}`
  const hit = pixelHeroCanvasCache.get(key)
  if (hit && hit.width > 0 && hit.height > 0) {
    pixelHeroCanvasCache.delete(key)
    pixelHeroCanvasCache.set(key, hit)
    return hit
  }

  const built = buildHeroPixelFrame(opts)
  const canvas = document.createElement('canvas')
  canvas.width = PIXEL_HERO_CANVAS_SIZE
  canvas.height = PIXEL_HERO_CANVAS_SIZE
  canvas.dataset.hdScale = String(PIXEL_HERO_SCALE)
  canvas.dataset.pixelHero = '1'
  canvas.dataset.batch1 = built.isBatch1Bespoke ? '1' : '0'

  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  const bg = built.bodyGrid
  const vg = built.vfxGrid

  // 1) Crisp 1px selective dark-plum outline around character body/armor/weapon pixels
  ctx.fillStyle = INK
  for (let y = 0; y < bg.h; y++) {
    for (let x = 0; x < bg.w; x++) {
      if (bg.get(x, y)) continue
      if (bg.get(x - 1, y) || bg.get(x + 1, y) || bg.get(x, y - 1) || bg.get(x, y + 1)) {
        ctx.fillRect(x * PIXEL_HERO_SCALE, y * PIXEL_HERO_SCALE, PIXEL_HERO_SCALE, PIXEL_HERO_SCALE)
      }
    }
  }

  // 2) Crisp pixel colors
  for (let y = 0; y < bg.h; y++) {
    for (let x = 0; x < bg.w; x++) {
      const col = bg.pixels[y][x]
      if (!col) continue
      ctx.fillStyle = col
      ctx.fillRect(x * PIXEL_HERO_SCALE, y * PIXEL_HERO_SCALE, PIXEL_HERO_SCALE, PIXEL_HERO_SCALE)
    }
  }

  // 3) Un-outlined luminous VFX / aura / halo / weapon slash pixels
  for (let y = 0; y < vg.h; y++) {
    for (let x = 0; x < vg.w; x++) {
      const col = vg.pixels[y][x]
      if (!col) continue
      ctx.fillStyle = col
      ctx.fillRect(x * PIXEL_HERO_SCALE, y * PIXEL_HERO_SCALE, PIXEL_HERO_SCALE, PIXEL_HERO_SCALE)
    }
  }

  pixelHeroCanvasCache.set(key, canvas)
  while (pixelHeroCanvasCache.size > MAX_PIXEL_HERO_CACHE) {
    const oldestKey = pixelHeroCanvasCache.keys().next().value
    if (oldestKey === undefined) break
    const oldest = pixelHeroCanvasCache.get(oldestKey)
    pixelHeroCanvasCache.delete(oldestKey)
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
