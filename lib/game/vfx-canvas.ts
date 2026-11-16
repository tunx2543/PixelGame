import type { WeaponType } from './data'
import {
  getSkillVfxSpec,
  resolveRebirthAuraSpec,
  type SkillVfxStyle,
} from './vfx-specs'

export interface RebirthAuraDrawOptions {
  x: number
  y: number
  timeSec: number
  rebirthCount: number
  radiusX?: number
  spriteHeight?: number
  alphaScale?: number
  layer?: 'all' | 'back' | 'front'
}

/**
 * Draws the 3-tier rebirth visual aura:
 * - Rebirth 1-4: Radiant cyan dual sigil floor rings + 4 rotating runes + rising spirit motes
 * - Rebirth 5: Luminous crimson-magenta twin seraph wings + 6-point hexagram circle + rose embers
 * - Rebirth 6: Mythic celestial pillar + 4-wing gold-cyan seraph + floating halo crown + orbiting astral shards
 */
export function drawRebirthAura(
  ctx: CanvasRenderingContext2D,
  opts: RebirthAuraDrawOptions,
) {
  const spec = resolveRebirthAuraSpec(opts.rebirthCount)
  if (spec.style === 'none') return

  const layer = opts.layer ?? 'all'
  const t = opts.timeSec
  const rx = opts.radiusX ?? 12
  const ry = Math.max(3.2, rx * 0.34)
  const h = opts.spriteHeight ?? Math.round(rx * 2.5)
  const aScale = opts.alphaScale ?? 1
  const groundY = opts.y - Math.max(1, h * 0.08)

  ctx.save()

  // ---------------- BACK LAYER (floor sigils, light pillar, seraph wings) ----------------
  if (layer === 'all' || layer === 'back') {
    if (spec.style === 'sigil_ring') {
      const pulse = (0.62 + Math.sin(t * 5.2) * 0.16) * aScale
      ctx.globalAlpha = pulse
      ctx.strokeStyle = spec.primaryColor
      ctx.shadowColor = spec.glowColor
      ctx.shadowBlur = Math.max(4, rx * 0.55)
      ctx.lineWidth = Math.max(1.2, rx * 0.11)

      ctx.beginPath()
      ctx.ellipse(opts.x, groundY, rx, ry, t * 0.45, 0, Math.PI * 2)
      ctx.stroke()

      ctx.globalAlpha = pulse * 0.72
      ctx.strokeStyle = spec.secondaryColor
      ctx.lineWidth = Math.max(1, rx * 0.08)
      ctx.beginPath()
      ctx.ellipse(opts.x, groundY, rx * 0.72, ry * 0.72, -t * 0.7, 0, Math.PI * 2)
      ctx.stroke()

      // 4 rotating diamond runes on outer sigil ring
      ctx.fillStyle = spec.secondaryColor
      const runeSize = Math.max(1.8, rx * 0.15)
      for (let i = 0; i < spec.runeCount; i++) {
        const ang = t * 1.4 + (i * Math.PI * 2) / spec.runeCount
        const px = opts.x + Math.cos(ang) * rx
        const py = groundY + Math.sin(ang) * ry
        ctx.fillRect(Math.round(px - runeSize / 2), Math.round(py - runeSize / 2), Math.round(runeSize), Math.round(runeSize))
      }
    } else if (spec.style === 'crimson_wings') {
      const flap = Math.sin(t * 4.2) * (h * 0.06)
      const wingSpan = rx * 1.45
      const wingBaseY = opts.y - h * 0.56
      ctx.shadowColor = spec.glowColor
      ctx.shadowBlur = Math.max(6, rx * 0.7)

      // Twin luminous crimson-magenta seraph wings behind torso
      for (const side of [-1, 1] as const) {
        for (let feather = 0; feather < 3; feather++) {
          const spread = 1 - feather * 0.22
          const tipX = opts.x + side * wingSpan * spread
          const tipY = wingBaseY - h * (0.28 - feather * 0.12) + flap * (1 + feather * 0.25)
          ctx.globalAlpha = (0.48 - feather * 0.08) * aScale
          ctx.fillStyle = feather === 0 ? spec.secondaryColor : spec.primaryColor
          ctx.beginPath()
          ctx.moveTo(opts.x + side * rx * 0.18, wingBaseY + feather * (h * 0.07))
          ctx.quadraticCurveTo(
            opts.x + side * wingSpan * 0.62 * spread,
            tipY - h * 0.08,
            tipX,
            tipY + h * 0.14,
          )
          ctx.quadraticCurveTo(
            opts.x + side * wingSpan * 0.45 * spread,
            wingBaseY + h * (0.14 + feather * 0.05),
            opts.x + side * rx * 0.16,
            wingBaseY + h * 0.1 + feather * (h * 0.05),
          )
          ctx.closePath()
          ctx.fill()
        }
      }

      // 6-point hexagram floor circle
      ctx.globalAlpha = 0.72 * aScale
      ctx.strokeStyle = spec.primaryColor
      ctx.lineWidth = Math.max(1.4, rx * 0.11)
      ctx.beginPath()
      ctx.ellipse(opts.x, groundY, rx * 1.08, ry * 1.08, 0, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = spec.secondaryColor
      ctx.lineWidth = Math.max(1, rx * 0.07)
      for (const phaseOffset of [0, Math.PI / 3]) {
        ctx.beginPath()
        for (let p = 0; p <= 3; p++) {
          const ang = t * 0.9 + phaseOffset + (p * Math.PI * 2) / 3
          const px = opts.x + Math.cos(ang) * rx * 0.96
          const py = groundY + Math.sin(ang) * ry * 0.96
          if (p === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }
    } else if (spec.style === 'celestial_crown') {
      const pulse = 0.78 + Math.sin(t * 4.8) * 0.18

      // Vertical radiant astral pillar behind sprite
      const pillarGrad = ctx.createLinearGradient(opts.x, opts.y - h * 1.35, opts.x, groundY + ry)
      pillarGrad.addColorStop(0, 'rgba(253, 224, 71, 0)')
      pillarGrad.addColorStop(0.35, 'rgba(103, 232, 249, 0.22)')
      pillarGrad.addColorStop(0.75, 'rgba(253, 224, 71, 0.34)')
      pillarGrad.addColorStop(1, 'rgba(253, 224, 71, 0)')
      ctx.globalAlpha = pulse * aScale
      ctx.fillStyle = pillarGrad
      ctx.fillRect(Math.round(opts.x - rx * 0.7), Math.round(opts.y - h * 1.3), Math.round(rx * 1.4), Math.round(h * 1.38))

      // 4-wing golden-prism celestial seraph wings
      const flap = Math.sin(t * 3.8) * (h * 0.055)
      const wingSpan = rx * 1.72
      const wingY = opts.y - h * 0.62
      ctx.shadowColor = spec.glowColor
      ctx.shadowBlur = Math.max(8, rx * 0.85)
      for (const side of [-1, 1] as const) {
        // Upper golden wing
        ctx.globalAlpha = 0.62 * aScale
        ctx.fillStyle = spec.primaryColor
        ctx.beginPath()
        ctx.moveTo(opts.x + side * rx * 0.16, wingY)
        ctx.quadraticCurveTo(
          opts.x + side * wingSpan * 0.68,
          wingY - h * 0.44 + flap,
          opts.x + side * wingSpan,
          wingY - h * 0.18 + flap,
        )
        ctx.quadraticCurveTo(
          opts.x + side * wingSpan * 0.5,
          wingY + h * 0.1,
          opts.x + side * rx * 0.16,
          wingY + h * 0.12,
        )
        ctx.closePath()
        ctx.fill()

        // Lower prism cyan wing
        ctx.globalAlpha = 0.45 * aScale
        ctx.fillStyle = spec.secondaryColor
        ctx.beginPath()
        ctx.moveTo(opts.x + side * rx * 0.16, wingY + h * 0.09)
        ctx.quadraticCurveTo(
          opts.x + side * wingSpan * 0.56,
          wingY + h * 0.02 - flap * 0.6,
          opts.x + side * wingSpan * 0.82,
          wingY + h * 0.25 - flap * 0.6,
        )
        ctx.quadraticCurveTo(
          opts.x + side * wingSpan * 0.42,
          wingY + h * 0.28,
          opts.x + side * rx * 0.16,
          wingY + h * 0.2,
        )
        ctx.closePath()
        ctx.fill()
      }

      // Double golden astrolabe floor rings
      ctx.globalAlpha = 0.88 * aScale
      ctx.strokeStyle = spec.primaryColor
      ctx.lineWidth = Math.max(1.6, rx * 0.13)
      ctx.beginPath()
      ctx.ellipse(opts.x, groundY, rx * 1.24, ry * 1.24, 0, 0, Math.PI * 2)
      ctx.stroke()

      ctx.globalAlpha = 0.68 * aScale
      ctx.strokeStyle = spec.secondaryColor
      ctx.lineWidth = Math.max(1.1, rx * 0.08)
      ctx.beginPath()
      ctx.ellipse(opts.x, groundY, rx * 0.9, ry * 0.9, t * 0.65, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  // ---------------- FRONT LAYER (rising motes, halo crown, orbiting astral shards) ----------------
  if (layer === 'all' || layer === 'front') {
    if (spec.style === 'sigil_ring') {
      ctx.fillStyle = spec.secondaryColor
      ctx.shadowColor = spec.glowColor
      ctx.shadowBlur = Math.max(3, rx * 0.35)
      const speck = Math.max(1.5, rx * 0.12)
      for (let i = 0; i < 4; i++) {
        const phase = (t * 0.85 + i * 0.25) % 1
        const px = opts.x + Math.sin(t * 2 + i * 1.7) * rx * 0.68
        const py = groundY - phase * h * 0.85
        ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.72 * aScale
        ctx.fillRect(Math.round(px - speck / 2), Math.round(py - speck / 2), Math.round(speck), Math.round(speck))
      }
    } else if (spec.style === 'crimson_wings') {
      ctx.shadowColor = spec.glowColor
      ctx.shadowBlur = Math.max(4, rx * 0.45)
      const ember = Math.max(2, rx * 0.15)
      for (let i = 0; i < 6; i++) {
        const phase = (t * 1.15 + i / 6) % 1
        const ang = t * 2.2 + (i * Math.PI) / 3
        const px = opts.x + Math.cos(ang) * rx * (0.95 - phase * 0.3)
        const py = groundY - phase * h * 1.02
        ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.85 * aScale
        ctx.fillStyle = i % 2 === 0 ? spec.secondaryColor : spec.primaryColor
        ctx.fillRect(Math.round(px - ember / 2), Math.round(py - ember / 2), Math.round(ember), Math.round(ember))
      }
    } else if (spec.style === 'celestial_crown') {
      const haloY = opts.y - h * 0.98 + Math.sin(t * 3.2) * (h * 0.03)
      const haloRx = rx * 0.62
      const haloRy = Math.max(2.2, haloRx * 0.34)
      ctx.shadowColor = spec.glowColor
      ctx.shadowBlur = Math.max(7, rx * 0.75)

      // Radiant golden celestial crown halo floating above head
      ctx.globalAlpha = 0.92 * aScale
      ctx.strokeStyle = spec.primaryColor
      ctx.lineWidth = Math.max(1.5, rx * 0.12)
      ctx.beginPath()
      ctx.ellipse(opts.x, haloY, haloRx, haloRy, 0, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = Math.max(1, rx * 0.06)
      ctx.beginPath()
      ctx.ellipse(opts.x, haloY, haloRx * 0.74, haloRy * 0.74, 0, 0, Math.PI * 2)
      ctx.stroke()

      // Orbiting celestial star shards
      const shardSize = Math.max(2.2, rx * 0.18)
      for (let i = 0; i < spec.orbitShardCount; i++) {
        const ang = t * 2.4 + (i * Math.PI * 2) / spec.orbitShardCount
        const sx = opts.x + Math.cos(ang) * rx * 1.25
        const sy = opts.y - h * 0.48 + Math.sin(ang) * (h * 0.18)
        ctx.globalAlpha = (Math.sin(ang) > -0.25 ? 0.95 : 0.4) * aScale
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : spec.secondaryColor
        ctx.fillRect(Math.round(sx - shardSize / 2), Math.round(sy - shardSize / 2), Math.round(shardSize), Math.round(shardSize))
        ctx.fillStyle = spec.primaryColor
        ctx.fillRect(Math.round(sx - shardSize * 0.8), Math.round(sy - 0.5), Math.round(shardSize * 1.6), 1.5)
        ctx.fillRect(Math.round(sx - 0.5), Math.round(sy - shardSize * 0.8), 1.5, Math.round(shardSize * 1.6))
      }
    }
  }

  ctx.restore()
}

export interface StageSkillVfxOptions {
  heroX: number
  heroY: number
  enemyX: number
  enemyY: number
  floorY: number
  skillId: string | null
  weaponType: WeaponType
  progress: number
  color: string | null
}

/**
 * Renders rich per-class / per-skill VFX on the 2D encounter / tower / preview stage.
 */
export function drawStageSkillEffect(
  ctx: CanvasRenderingContext2D,
  opts: StageSkillVfxOptions,
) {
  const { heroX, enemyX, enemyY, floorY, skillId, weaponType, progress, color } = opts
  const k = Math.max(0, Math.min(1, progress))
  const alpha = Math.max(0, 1 - Math.pow(k, 1.35))

  if (!skillId) {
    drawBasicWeaponSlash(ctx, enemyX - 10, enemyY, weaponType, k, color || '#ffd60a')
    return
  }

  const spec = getSkillVfxSpec(skillId, color || '#ffd60a', undefined, weaponType)
  drawStyleEffect(ctx, {
    style: spec.style,
    primaryColor: color || spec.primaryColor,
    secondaryColor: spec.secondaryColor,
    sourceX: heroX + 18,
    sourceY: floorY - 38,
    targetX: spec.style === 'holy_heal' ? heroX : enemyX - 8,
    targetY: spec.style === 'holy_heal' ? floorY - 26 : enemyY,
    floorY,
    scale: 2.2,
    progress: k,
    alpha,
  })
}

export interface OverworldSkillVfxOptions {
  style: SkillVfxStyle
  primaryColor: string
  secondaryColor?: string
  sourceX?: number
  sourceY?: number
  targetX: number
  targetY: number
  radius: number
  progress: number
  alpha: number
}

/**
 * Renders rich per-class / per-skill VFX in the overworld tile canvas (`renderer.ts`).
 */
export function drawOverworldSkillEffect(
  ctx: CanvasRenderingContext2D,
  opts: OverworldSkillVfxOptions,
) {
  const scale = Math.max(0.75, opts.radius / 26)
  drawStyleEffect(ctx, {
    style: opts.style,
    primaryColor: opts.primaryColor,
    secondaryColor: opts.secondaryColor ?? '#ffffff',
    sourceX: opts.sourceX ?? opts.targetX - 18,
    sourceY: opts.sourceY ?? opts.targetY,
    targetX: opts.targetX,
    targetY: opts.targetY,
    floorY: opts.targetY + 8,
    scale,
    progress: opts.progress,
    alpha: opts.alpha,
  })
}

function drawBasicWeaponSlash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  weaponType: WeaponType,
  k: number,
  color: string,
) {
  ctx.save()
  ctx.globalAlpha = Math.max(0, 1 - k)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  if (weaponType === 'staff') {
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(x, y, 12 + k * 22, 0, Math.PI * 2)
    ctx.stroke()
    for (let i = 0; i < 6; i++) {
      const a = k * 3 + (i * Math.PI) / 3
      const r = 10 + k * 20
      ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 3, 3)
    }
  } else if (weaponType === 'bow') {
    ctx.lineWidth = 2.5
    const startX = x - 75 + k * 75
    ctx.beginPath()
    ctx.moveTo(startX - 18, y)
    ctx.lineTo(startX + 4, y)
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(Math.round(startX + 2), Math.round(y - 1), 4, 3)
  } else {
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.arc(x - 10, y, 22 + k * 8, -0.95 + k * 0.4, 0.95 + k * 0.4)
    ctx.stroke()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x - 10, y, 18 + k * 8, -0.8 + k * 0.4, 0.8 + k * 0.4)
    ctx.stroke()
  }
  ctx.restore()
}

function drawStyleEffect(
  ctx: CanvasRenderingContext2D,
  p: {
    style: SkillVfxStyle
    primaryColor: string
    secondaryColor: string
    sourceX: number
    sourceY: number
    targetX: number
    targetY: number
    floorY: number
    scale: number
    progress: number
    alpha: number
  },
) {
  const { style, primaryColor, secondaryColor, sourceX, sourceY, targetX, targetY, floorY, scale, progress: k, alpha } = p
  const s = scale

  ctx.save()
  ctx.strokeStyle = primaryColor
  ctx.fillStyle = primaryColor
  ctx.shadowColor = primaryColor
  ctx.shadowBlur = Math.max(4, 5 * s)

  switch (style) {
    case 'heavy_cleave': {
      ctx.globalAlpha = alpha
      ctx.lineWidth = 3 * s
      ctx.beginPath()
      ctx.arc(targetX - 4 * s, targetY, (12 + k * 10) * s, -1.05 + k * 0.3, 1.05 + k * 0.3)
      ctx.stroke()
      ctx.strokeStyle = secondaryColor
      ctx.lineWidth = 1.6 * s
      ctx.beginPath()
      ctx.arc(targetX - 2 * s, targetY, (9 + k * 9) * s, -0.8 + k * 0.35, 0.8 + k * 0.35)
      ctx.stroke()
      // Ground shock ring
      ctx.globalAlpha = alpha * 0.65
      ctx.beginPath()
      ctx.ellipse(targetX, floorY, (8 + k * 14) * s, (3 + k * 4.5) * s, 0, 0, Math.PI * 2)
      ctx.stroke()
      break
    }

    case 'whirl_blades': {
      for (let i = 0; i < 3; i++) {
        const baseA = k * 8 + (i * Math.PI * 2) / 3
        const rad = (11 + i * 4 + k * 11) * s
        ctx.globalAlpha = alpha * (1 - i * 0.18)
        ctx.strokeStyle = i % 2 === 0 ? primaryColor : secondaryColor
        ctx.lineWidth = (2.2 - i * 0.35) * s
        ctx.beginPath()
        ctx.arc(targetX, targetY + 4 * s, rad, baseA, baseA + Math.PI * 1.15)
        ctx.stroke()
      }
      ctx.globalAlpha = alpha * 0.75
      ctx.fillStyle = secondaryColor
      for (let i = 0; i < 6; i++) {
        const a = k * 9 + (i * Math.PI) / 3
        const rx = Math.cos(a) * (14 + k * 14) * s
        const ry = Math.sin(a) * (6 + k * 5) * s
        ctx.fillRect(Math.round(targetX + rx), Math.round(targetY + ry), Math.round(2 * s), Math.round(2 * s))
      }
      break
    }

    case 'holy_cleave':
    case 'holy_sword_beam': {
      const fallY = targetY - (1 - Math.min(1, k * 1.7)) * 42 * s
      ctx.globalAlpha = alpha
      // Descending radiant blade beam
      ctx.fillStyle = primaryColor
      ctx.fillRect(Math.round(targetX - 3.5 * s), Math.round(fallY - 26 * s), Math.round(7 * s), Math.round(32 * s))
      ctx.fillStyle = secondaryColor
      ctx.fillRect(Math.round(targetX - 1.5 * s), Math.round(fallY - 26 * s), Math.round(3 * s), Math.round(34 * s))
      // Crossguard flare
      ctx.fillStyle = primaryColor
      ctx.fillRect(Math.round(targetX - 11 * s), Math.round(fallY - 12 * s), Math.round(22 * s), Math.round(3 * s))
      // Expanding golden shockwave ring
      ctx.globalAlpha = alpha * 0.85
      ctx.lineWidth = 2 * s
      ctx.beginPath()
      ctx.ellipse(targetX, floorY, (8 + k * 20) * s, (3 + k * 6.5) * s, 0, 0, Math.PI * 2)
      ctx.stroke()
      break
    }

    case 'light_judgment':
    case 'sanctuary_circle': {
      // Twin cathedral pillars & expanding sacred ground seal
      for (const offX of [-10 * s, 10 * s]) {
        const grad = ctx.createLinearGradient(targetX + offX, targetY - 46 * s, targetX + offX, floorY)
        grad.addColorStop(0, 'rgba(255,255,255,0)')
        grad.addColorStop(0.5, primaryColor)
        grad.addColorStop(1, secondaryColor)
        ctx.globalAlpha = alpha * 0.72
        ctx.fillStyle = grad
        ctx.fillRect(Math.round(targetX + offX - 3.5 * s), Math.round(targetY - 42 * s), Math.round(7 * s), Math.round(52 * s))
      }
      ctx.globalAlpha = alpha
      ctx.strokeStyle = primaryColor
      ctx.lineWidth = 1.8 * s
      ctx.beginPath()
      ctx.ellipse(targetX, floorY, (10 + k * 22) * s, (4 + k * 7) * s, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = secondaryColor
      ctx.beginPath()
      ctx.ellipse(targetX, floorY, (6 + k * 14) * s, (2.5 + k * 4.5) * s, 0, 0, Math.PI * 2)
      ctx.stroke()
      break
    }

    case 'holy_heal': {
      // Ascending emerald/gold healing ring + sparkling cross motes around hero
      ctx.globalAlpha = alpha
      ctx.strokeStyle = primaryColor
      ctx.lineWidth = 2 * s
      ctx.beginPath()
      ctx.ellipse(targetX, floorY - k * 20 * s, (12 + Math.sin(k * Math.PI) * 5) * s, 4.5 * s, 0, 0, Math.PI * 2)
      ctx.stroke()
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4 + k * 2.4
        const px = targetX + Math.cos(ang) * 11 * s
        const py = floorY - ((k * 36 + i * 5) % 34) * s
        ctx.fillStyle = i % 2 === 0 ? primaryColor : secondaryColor
        ctx.fillRect(Math.round(px - 2 * s), Math.round(py - 0.5 * s), Math.round(4 * s), Math.round(1.4 * s))
        ctx.fillRect(Math.round(px - 0.5 * s), Math.round(py - 2 * s), Math.round(1.4 * s), Math.round(4 * s))
      }
      break
    }

    case 'fire_comet': {
      const flight = Math.min(1, k * 1.65)
      const cx = sourceX + (targetX - sourceX) * flight
      const cy = sourceY + (targetY - sourceY) * flight - Math.sin(flight * Math.PI) * 14 * s
      if (k < 0.65) {
        // Blazing comet head + fiery tail
        ctx.globalAlpha = alpha
        ctx.fillStyle = primaryColor
        ctx.beginPath()
        ctx.arc(cx, cy, 5.5 * s, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = secondaryColor
        ctx.beginPath()
        ctx.arc(cx + 1.5 * s, cy, 2.8 * s, 0, Math.PI * 2)
        ctx.fill()
        for (let i = 1; i <= 5; i++) {
          ctx.globalAlpha = alpha * (1 - i * 0.16)
          ctx.fillStyle = i % 2 === 0 ? secondaryColor : primaryColor
          ctx.fillRect(Math.round(cx - i * 5 * s), Math.round(cy + (i % 2 === 0 ? -1.5 : 1.5) * s), Math.round(3 * s), Math.round(2.5 * s))
        }
      } else {
        // Flame detonation burst
        const bk = (k - 0.65) / 0.35
        ctx.globalAlpha = Math.max(0, 1 - bk)
        ctx.fillStyle = primaryColor
        ctx.beginPath()
        ctx.arc(targetX, targetY, (8 + bk * 18) * s, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = secondaryColor
        ctx.beginPath()
        ctx.arc(targetX, targetY, (4 + bk * 10) * s, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }

    case 'meteor_strike': {
      const dropK = Math.min(1, k * 1.8)
      const mx = targetX - (1 - dropK) * 32 * s
      const my = targetY - (1 - dropK) * 48 * s
      if (dropK < 1) {
        // Falling molten boulder + flame trail
        ctx.globalAlpha = alpha
        ctx.strokeStyle = secondaryColor
        ctx.lineWidth = 4 * s
        ctx.beginPath()
        ctx.moveTo(mx - 16 * s, my - 24 * s)
        ctx.lineTo(mx, my)
        ctx.stroke()
        ctx.fillStyle = primaryColor
        ctx.beginPath()
        ctx.arc(mx, my, 8.5 * s, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fffbeb'
        ctx.beginPath()
        ctx.arc(mx + 1.5 * s, my + 1.5 * s, 4 * s, 0, Math.PI * 2)
        ctx.fill()
      }
      if (k > 0.35) {
        const sk = (k - 0.35) / 0.65
        ctx.globalAlpha = Math.max(0, 1 - sk)
        ctx.fillStyle = primaryColor
        ctx.beginPath()
        ctx.ellipse(targetX, floorY, (10 + sk * 24) * s, (4 + sk * 8) * s, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = secondaryColor
        ctx.lineWidth = 2.2 * s
        ctx.beginPath()
        ctx.ellipse(targetX, floorY, (12 + sk * 28) * s, (4.5 + sk * 9.5) * s, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    }

    case 'blizzard_storm': {
      // Rotating hexagonal ice crystal + swirling frosty shards
      ctx.globalAlpha = alpha
      ctx.strokeStyle = primaryColor
      ctx.lineWidth = 1.8 * s
      const crystalR = (10 + k * 18) * s
      for (let i = 0; i < 6; i++) {
        const ang = k * 3.5 + (i * Math.PI) / 3
        ctx.beginPath()
        ctx.moveTo(targetX, targetY)
        ctx.lineTo(targetX + Math.cos(ang) * crystalR, targetY + Math.sin(ang) * crystalR * 0.72)
        ctx.stroke()
      }
      for (let i = 0; i < 10; i++) {
        const ang = k * 6 + (i * Math.PI * 2) / 10
        const dist = (6 + (i % 3) * 6 + k * 14) * s
        const sx = targetX + Math.cos(ang) * dist
        const sy = targetY - 12 * s + ((k * 28 + i * 7) % 26) * s
        ctx.fillStyle = i % 2 === 0 ? secondaryColor : primaryColor
        ctx.fillRect(Math.round(sx), Math.round(sy), Math.round(2.5 * s), Math.round(2.5 * s))
      }
      break
    }

    case 'holy_lance': {
      const flight = Math.min(1, k * 1.8)
      const lx = sourceX + (targetX - sourceX) * flight
      const ly = sourceY + (targetY - sourceY) * flight
      ctx.globalAlpha = alpha
      ctx.strokeStyle = primaryColor
      ctx.lineWidth = 3 * s
      ctx.beginPath()
      ctx.moveTo(lx - 26 * s, ly)
      ctx.lineTo(lx + 8 * s, ly)
      ctx.stroke()
      ctx.fillStyle = secondaryColor
      ctx.fillRect(Math.round(lx + 4 * s), Math.round(ly - 2.5 * s), Math.round(6 * s), Math.round(5 * s))
      // Star cross impact flare
      if (k > 0.35) {
        const sk = (k - 0.35) / 0.65
        ctx.globalAlpha = Math.max(0, 1 - sk)
        ctx.fillStyle = secondaryColor
        ctx.fillRect(Math.round(targetX - (10 + sk * 12) * s), Math.round(targetY - 1 * s), Math.round((20 + sk * 24) * s), Math.round(2.2 * s))
        ctx.fillRect(Math.round(targetX - 1 * s), Math.round(targetY - (10 + sk * 12) * s), Math.round(2.2 * s), Math.round((20 + sk * 24) * s))
      }
      break
    }

    case 'arrow_barrage': {
      ctx.globalAlpha = alpha
      for (let i = 0; i < 3; i++) {
        const localK = Math.max(0, Math.min(1, k * 1.4 - i * 0.16))
        if (localK <= 0) continue
        const ax = sourceX + (targetX - sourceX) * localK
        const ay = sourceY + (i - 1) * 5 * s + (targetY - sourceY) * localK
        ctx.strokeStyle = i % 2 === 0 ? primaryColor : secondaryColor
        ctx.lineWidth = 2 * s
        ctx.beginPath()
        ctx.moveTo(ax - 16 * s, ay)
        ctx.lineTo(ax + 4 * s, ay)
        ctx.stroke()
        ctx.fillStyle = secondaryColor
        ctx.fillRect(Math.round(ax + 3 * s), Math.round(ay - 1.2 * s), Math.round(3 * s), Math.round(2.5 * s))
      }
      break
    }

    case 'arrow_rain': {
      ctx.globalAlpha = alpha
      for (let i = 0; i < 8; i++) {
        const localK = (k * 1.5 + i * 0.11) % 1
        const rx = targetX + (i - 3.5) * 6.5 * s
        const ry = targetY - 38 * s + localK * 46 * s
        ctx.strokeStyle = i % 2 === 0 ? primaryColor : secondaryColor
        ctx.lineWidth = 1.8 * s
        ctx.beginPath()
        ctx.moveTo(rx - 5 * s, ry - 11 * s)
        ctx.lineTo(rx, ry)
        ctx.stroke()
      }
      ctx.globalAlpha = alpha * 0.7
      ctx.strokeStyle = primaryColor
      ctx.lineWidth = 1.5 * s
      ctx.beginPath()
      ctx.ellipse(targetX, floorY, (12 + k * 16) * s, (4 + k * 5) * s, 0, 0, Math.PI * 2)
      ctx.stroke()
      break
    }

    case 'sniper_pierce': {
      // High-velocity golden rail beam + 3 sonic shockwave rings
      ctx.globalAlpha = alpha
      ctx.strokeStyle = primaryColor
      ctx.lineWidth = 3.5 * s
      ctx.beginPath()
      ctx.moveTo(sourceX, sourceY)
      ctx.lineTo(targetX + 22 * s, targetY)
      ctx.stroke()
      ctx.strokeStyle = secondaryColor
      ctx.lineWidth = 1.4 * s
      ctx.beginPath()
      ctx.moveTo(sourceX, sourceY)
      ctx.lineTo(targetX + 24 * s, targetY)
      ctx.stroke()
      for (let i = 1; i <= 3; i++) {
        const px = sourceX + ((targetX - sourceX) * i) / 3.4
        const py = sourceY + ((targetY - sourceY) * i) / 3.4
        ctx.strokeStyle = primaryColor
        ctx.lineWidth = 1.3 * s
        ctx.beginPath()
        ctx.ellipse(px, py, (2 + k * 3) * s, (5 + k * 8) * s, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    }

    case 'twin_slash': {
      ctx.globalAlpha = alpha
      for (const dir of [-1, 1] as const) {
        ctx.strokeStyle = dir === -1 ? primaryColor : secondaryColor
        ctx.lineWidth = 2.6 * s
        ctx.beginPath()
        ctx.moveTo(targetX - 16 * s, targetY + dir * 13 * s)
        ctx.lineTo(targetX + 16 * s, targetY - dir * 13 * s)
        ctx.stroke()
      }
      break
    }

    case 'shadow_backstab': {
      ctx.globalAlpha = alpha
      ctx.strokeStyle = secondaryColor
      ctx.lineWidth = 3.2 * s
      ctx.beginPath()
      ctx.arc(targetX + 4 * s, targetY, (13 + k * 7) * s, Math.PI * 0.45, Math.PI * 1.55)
      ctx.stroke()
      ctx.strokeStyle = primaryColor
      ctx.lineWidth = 2.2 * s
      ctx.beginPath()
      ctx.moveTo(targetX - 16 * s, targetY - 12 * s)
      ctx.lineTo(targetX + 18 * s, targetY + 12 * s)
      ctx.stroke()
      break
    }

    case 'shadow_vortex': {
      ctx.globalAlpha = alpha * 0.85
      ctx.strokeStyle = primaryColor
      ctx.lineWidth = 2.2 * s
      for (let ring = 0; ring < 2; ring++) {
        ctx.beginPath()
        ctx.ellipse(
          targetX,
          targetY + 4 * s,
          (9 + ring * 7 + k * 14) * s,
          (4 + ring * 3 + k * 5) * s,
          (ring === 0 ? 1 : -1) * k * 4,
          0,
          Math.PI * 2,
        )
        ctx.stroke()
      }
      // 4 crimson-purple phantom cross blades
      for (let i = 0; i < 4; i++) {
        const ang = k * 5 + (i * Math.PI) / 2
        const bx = targetX + Math.cos(ang) * (8 + k * 12) * s
        const by = targetY + Math.sin(ang) * (5 + k * 6) * s
        ctx.strokeStyle = i % 2 === 0 ? secondaryColor : '#ffffff'
        ctx.lineWidth = 1.8 * s
        ctx.beginPath()
        ctx.moveTo(bx - 5 * s, by - 5 * s)
        ctx.lineTo(bx + 5 * s, by + 5 * s)
        ctx.stroke()
      }
      break
    }
  }

  ctx.restore()
}
