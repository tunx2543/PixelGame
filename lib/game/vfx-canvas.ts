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
  disableGlow?: boolean
}

function drawStarSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number,
) {
  if (alpha <= 0.02) return
  const r = Math.max(1.4, size)
  const arm = r * 1.45
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y - arm)
  ctx.lineTo(x + r * 0.28, y - r * 0.28)
  ctx.lineTo(x + arm, y)
  ctx.lineTo(x + r * 0.28, y + r * 0.28)
  ctx.lineTo(x, y + arm)
  ctx.lineTo(x - r * 0.28, y + r * 0.28)
  ctx.lineTo(x - arm, y)
  ctx.lineTo(x - r * 0.28, y - r * 0.28)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawFloatingCrystal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  outerColor: string,
  innerColor: string,
  tilt: number,
  alpha: number,
) {
  if (alpha <= 0.02) return
  const w = Math.max(2, size * 0.54)
  const h = Math.max(3.4, size * 0.95)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(tilt)
  ctx.globalAlpha = alpha
  ctx.fillStyle = outerColor
  ctx.beginPath()
  ctx.moveTo(0, -h)
  ctx.lineTo(w, 0)
  ctx.lineTo(0, h)
  ctx.lineTo(-w, 0)
  ctx.closePath()
  ctx.fill()

  // Bright top-left facet highlight
  ctx.fillStyle = innerColor
  ctx.globalAlpha = alpha * 0.85
  ctx.beginPath()
  ctx.moveTo(0, -h * 0.86)
  ctx.lineTo(w * 0.45, -h * 0.04)
  ctx.lineTo(0, h * 0.48)
  ctx.lineTo(-w * 0.62, 0)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawCrystalSpire(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  w: number,
  h: number,
  darkColor: string,
  midColor: string,
  highlightColor: string,
  tilt: number,
  alpha: number,
) {
  if (alpha <= 0.02) return
  ctx.save()
  ctx.translate(x, groundY)
  ctx.rotate(tilt)
  ctx.globalAlpha = alpha

  // Main spire body
  ctx.fillStyle = darkColor
  ctx.beginPath()
  ctx.moveTo(-w * 0.55, 0)
  ctx.lineTo(-w * 0.35, -h * 0.65)
  ctx.lineTo(0, -h)
  ctx.lineTo(w * 0.4, -h * 0.58)
  ctx.lineTo(w * 0.55, 0)
  ctx.closePath()
  ctx.fill()

  // Luminous mid facet
  ctx.fillStyle = midColor
  ctx.beginPath()
  ctx.moveTo(0, -h)
  ctx.lineTo(w * 0.38, -h * 0.58)
  ctx.lineTo(w * 0.12, 0)
  ctx.lineTo(-w * 0.14, 0)
  ctx.closePath()
  ctx.fill()

  // Crisp highlight edge
  ctx.strokeStyle = highlightColor
  ctx.lineWidth = Math.max(0.9, w * 0.16)
  ctx.beginPath()
  ctx.moveTo(-w * 0.35, -h * 0.65)
  ctx.lineTo(0, -h)
  ctx.lineTo(w * 0.38, -h * 0.58)
  ctx.stroke()
  ctx.restore()
}

function drawDetailedWings(
  ctx: CanvasRenderingContext2D,
  x: number,
  wingBaseY: number,
  rx: number,
  h: number,
  t: number,
  variant: 'monarch_violet' | 'celestial_gold',
  alphaScale: number,
  disableGlow = false,
) {
  const flap = Math.sin(t * (variant === 'celestial_gold' ? 3.2 : 3.6)) * (h * 0.045)
  ctx.save()

  if (variant === 'monarch_violet') {
    const wingSpan = rx * 1.65
    if (!disableGlow) {
      ctx.shadowColor = '#a855f7'
      ctx.shadowBlur = Math.max(6, rx * 0.72)
    }

    for (const side of [-1, 1] as const) {
      // 5 dramatic dark-violet monarch feathers curving outward & downward
      for (let f = 0; f < 5; f++) {
        const ratio = f / 4
        const spread = 1 - ratio * 0.34
        const tipX = x + side * wingSpan * spread
        const tipY = wingBaseY - h * (0.28 - ratio * 0.32) + flap * (1 + ratio * 0.25)
        const ctrlX = x + side * wingSpan * (0.58 - ratio * 0.14)
        const ctrlY = wingBaseY - h * (0.42 - ratio * 0.28) + flap * 0.6

        ctx.globalAlpha = (0.86 - ratio * 0.12) * alphaScale
        ctx.fillStyle = f % 2 === 0 ? '#4c1d95' : '#2e1065'
        ctx.strokeStyle = f < 2 ? '#e879f9' : '#a855f7'
        ctx.lineWidth = Math.max(0.9, rx * 0.07)

        ctx.beginPath()
        ctx.moveTo(x + side * rx * 0.16, wingBaseY + ratio * h * 0.1)
        ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY)
        ctx.quadraticCurveTo(
          x + side * wingSpan * (0.44 - ratio * 0.09),
          wingBaseY + h * (0.14 + ratio * 0.12),
          x + side * rx * 0.14,
          wingBaseY + h * (0.08 + ratio * 0.08),
        )
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }

      // Glowing violet upper wing crest rib
      ctx.globalAlpha = 0.92 * alphaScale
      ctx.strokeStyle = '#f5d0fe'
      ctx.lineWidth = Math.max(1.1, rx * 0.09)
      ctx.beginPath()
      ctx.moveTo(x + side * rx * 0.14, wingBaseY)
      ctx.quadraticCurveTo(
        x + side * wingSpan * 0.52,
        wingBaseY - h * 0.38 + flap * 0.6,
        x + side * wingSpan * 0.95,
        wingBaseY - h * 0.24 + flap,
      )
      ctx.stroke()
    }
  } else {
    // Tier 6: Radiant White-Gold Celestial Angel Wings
    const wingSpan = rx * 1.82
    if (!disableGlow) {
      ctx.shadowColor = '#fbbf24'
      ctx.shadowBlur = Math.max(8, rx * 0.85)
    }

    for (const side of [-1, 1] as const) {
      // Back golden aura fan
      ctx.globalAlpha = 0.42 * alphaScale
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.moveTo(x + side * rx * 0.15, wingBaseY)
      ctx.quadraticCurveTo(
        x + side * wingSpan * 0.62,
        wingBaseY - h * 0.62 + flap,
        x + side * wingSpan * 1.04,
        wingBaseY - h * 0.32 + flap,
      )
      ctx.quadraticCurveTo(
        x + side * wingSpan * 0.65,
        wingBaseY + h * 0.22,
        x + side * rx * 0.15,
        wingBaseY + h * 0.14,
      )
      ctx.closePath()
      ctx.fill()

      // 5 primary soaring white-cream angel wing feathers + golden trim
      for (let f = 0; f < 5; f++) {
        const ratio = f / 4
        const spread = 1 - ratio * 0.3
        const tipX = x + side * wingSpan * spread
        const tipY = wingBaseY - h * (0.46 - ratio * 0.42) + flap * (1 - ratio * 0.2)
        const ctrlX = x + side * wingSpan * (0.58 - ratio * 0.1)
        const ctrlY = wingBaseY - h * (0.55 - ratio * 0.32) + flap * 0.65

        ctx.globalAlpha = (0.94 - ratio * 0.1) * alphaScale
        ctx.fillStyle = f < 3 ? '#fffbeb' : '#fef08a'
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = Math.max(0.9, rx * 0.065)

        ctx.beginPath()
        ctx.moveTo(x + side * rx * 0.15, wingBaseY + ratio * h * 0.08)
        ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY)
        ctx.quadraticCurveTo(
          x + side * wingSpan * (0.42 - ratio * 0.08),
          wingBaseY + h * (0.04 + ratio * 0.14),
          x + side * rx * 0.14,
          wingBaseY + h * (0.07 + ratio * 0.07),
        )
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    }
  }

  ctx.restore()
}

function drawCrownHalo(
  ctx: CanvasRenderingContext2D,
  x: number,
  headY: number,
  rx: number,
  h: number,
  t: number,
  variant: 'monarch_violet' | 'celestial_gold',
  alphaScale: number,
  disableGlow = false,
) {
  const bob = Math.sin(t * 3.1) * (h * 0.025)
  ctx.save()

  if (variant === 'monarch_violet') {
    const cy = headY + h * 0.08 + bob
    const archR = rx * 0.78
    if (!disableGlow) {
      ctx.shadowColor = '#c084fc'
      ctx.shadowBlur = Math.max(6, rx * 0.65)
    }
    ctx.globalAlpha = 0.88 * alphaScale
    ctx.strokeStyle = '#d8b4fe'
    ctx.lineWidth = Math.max(1.3, rx * 0.1)

    // Gothic royal crown crest arch behind head
    ctx.beginPath()
    ctx.arc(x, cy + archR * 0.35, archR, Math.PI * 1.15, Math.PI * 1.85)
    ctx.stroke()

    ctx.strokeStyle = '#a855f7'
    ctx.lineWidth = Math.max(0.9, rx * 0.06)
    ctx.beginPath()
    ctx.arc(x, cy + archR * 0.35, archR * 0.78, Math.PI * 1.18, Math.PI * 1.82)
    ctx.stroke()

    // 3 royal diamond crown prongs
    for (const offsetAng of [-0.42, 0, 0.42]) {
      const ang = -Math.PI / 2 + offsetAng
      const px = x + Math.cos(ang) * archR * 1.06
      const py = cy + archR * 0.35 + Math.sin(ang) * archR * 1.06
      drawFloatingCrystal(ctx, px, py, Math.max(2.6, rx * 0.22), '#a855f7', '#f5d0fe', offsetAng * 0.8, 0.92 * alphaScale)
    }
  } else {
    // Tier 6: Golden Sun-Cross Celestial Halo
    const cy = headY - h * 0.02 + bob
    const ringR = Math.max(4, rx * 0.42)
    if (!disableGlow) {
      ctx.shadowColor = '#fbbf24'
      ctx.shadowBlur = Math.max(8, rx * 0.75)
    }

    // Outer radiant sun ring
    ctx.globalAlpha = 0.94 * alphaScale
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = Math.max(1.4, rx * 0.11)
    ctx.beginPath()
    ctx.arc(x, cy, ringR, 0, Math.PI * 2)
    ctx.stroke()

    // Inner bright halo ring
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = Math.max(0.9, rx * 0.055)
    ctx.beginPath()
    ctx.arc(x, cy, ringR * 0.7, 0, Math.PI * 2)
    ctx.stroke()

    // Cardinal celestial cross rays
    const ray = ringR * 1.65
    ctx.fillStyle = '#fef08a'
    ctx.beginPath()
    ctx.moveTo(x, cy - ray)
    ctx.lineTo(x + ringR * 0.22, cy - ringR * 0.22)
    ctx.lineTo(x + ray, cy)
    ctx.lineTo(x + ringR * 0.22, cy + ringR * 0.22)
    ctx.lineTo(x, cy + ray)
    ctx.lineTo(x - ringR * 0.22, cy + ringR * 0.22)
    ctx.lineTo(x - ray, cy)
    ctx.lineTo(x - ringR * 0.22, cy - ringR * 0.22)
    ctx.closePath()
    ctx.fill()

    drawStarSparkle(ctx, x, cy, ringR * 0.55, '#ffffff', 0.98 * alphaScale)
  }

  ctx.restore()
}

/**
 * Draws the 6 distinct rebirth visual aura tiers matching the ascension progression:
 * - Tier 1: Light blue magic circle, gentle vertical light rays, 1 orbit ring & star sparkles
 * - Tier 2: Double arcane circle, vertical beams, 2 diagonal energy ribbons & 2 floating crystals
 * - Tier 3: Triple layered circle, dense aura beams, 3 vortex ribbons & 4 floating crystals
 * - Tier 4: Radiant blue-gold magic circle, intense energy sphere & 6 floating crystals
 * - Tier 5: Violet monarch wings, crown crest halo, erupting amethyst crystal spires & purple wisps
 * - Tier 6: Radiant white-gold celestial seraph wings, sun-cross halo & golden crystal light blades
 */
export function drawRebirthAura(
  ctx: CanvasRenderingContext2D,
  opts: RebirthAuraDrawOptions,
) {
  const spec = resolveRebirthAuraSpec(opts.rebirthCount)
  if (spec.style === 'none') return

  const layer = opts.layer ?? 'all'
  const disableGlow = Boolean(opts.disableGlow)
  const t = opts.timeSec
  const rx = opts.radiusX ?? 12
  const ry = Math.max(3.4, rx * 0.35)
  const h = opts.spriteHeight ?? Math.round(rx * 2.5)
  const aScale = opts.alphaScale ?? 1
  const groundY = opts.y - Math.max(1, h * 0.06)
  const tier = spec.tier
  const circleScale = 1 + (tier - 1) * 0.075
  const cRx = rx * circleScale
  const cRy = ry * circleScale

  ctx.save()

  // ---------------- BACK LAYER (ground magic circle, light beams, wings, back ribbons, back spires) ----------------
  if (layer === 'all' || layer === 'back') {
    const pulse = (0.7 + Math.sin(t * 4.4) * 0.14) * aScale

    // Soft elliptical aura floor glow (skip gradient allocation in low-glow mode)
    if (!disableGlow) {
      ctx.save()
      ctx.translate(opts.x, groundY)
      ctx.scale(1, cRy / Math.max(1, cRx))
      const floorGlow = ctx.createRadialGradient(0, 0, cRx * 0.1, 0, 0, cRx * 1.15)
      floorGlow.addColorStop(0, tier === 6 ? 'rgba(254, 240, 138, 0.42)' : tier === 5 ? 'rgba(216, 180, 254, 0.36)' : 'rgba(125, 211, 252, 0.32)')
      floorGlow.addColorStop(0.65, tier === 6 ? 'rgba(251, 191, 36, 0.18)' : tier === 5 ? 'rgba(168, 85, 247, 0.2)' : 'rgba(56, 189, 248, 0.16)')
      floorGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.globalAlpha = pulse
      ctx.fillStyle = floorGlow
      ctx.beginPath()
      ctx.arc(0, 0, cRx * 1.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Vertical celestial light column & rising curtain rays
    if (spec.hasAstralPillar && !disableGlow) {
      const colH = h * (0.95 + tier * 0.08)
      const colW = cRx * (0.95 + tier * 0.06)
      const colGrad = ctx.createLinearGradient(opts.x, groundY - colH, opts.x, groundY)
      colGrad.addColorStop(0, 'rgba(255, 255, 255, 0)')
      colGrad.addColorStop(0.55, tier === 6 ? 'rgba(253, 224, 71, 0.16)' : tier === 5 ? 'rgba(192, 132, 252, 0.18)' : 'rgba(125, 211, 252, 0.16)')
      colGrad.addColorStop(1, tier === 6 ? 'rgba(251, 191, 36, 0.3)' : tier === 5 ? 'rgba(168, 85, 247, 0.28)' : 'rgba(56, 189, 248, 0.26)')
      ctx.globalAlpha = (0.45 + tier * 0.07) * aScale
      ctx.fillStyle = colGrad
      ctx.fillRect(Math.round(opts.x - colW * 0.5), Math.round(groundY - colH), Math.round(colW), Math.round(colH))

      // Crisp rising vertical light rays
      ctx.strokeStyle = spec.secondaryColor
      ctx.lineWidth = Math.max(0.8, rx * 0.055)
      for (let b = 0; b < spec.beamCount; b++) {
        const bxNorm = ((b / Math.max(1, spec.beamCount - 1)) - 0.5) * 1.45
        const bx = opts.x + bxNorm * cRx * 0.72
        const phase = (t * 0.8 + b * 0.37) % 1
        const beamH = h * (0.55 + Math.sin(t * 2.5 + b) * 0.18)
        const baseY = groundY - phase * h * 0.12
        ctx.globalAlpha = (0.24 + Math.sin(phase * Math.PI) * 0.28) * aScale
        ctx.beginPath()
        ctx.moveTo(bx, baseY)
        ctx.lineTo(bx, baseY - beamH)
        ctx.stroke()
      }
    }

    // Concentric arcane ground rings + geometric star polygons
    if (!disableGlow) {
      ctx.shadowColor = spec.glowColor
      ctx.shadowBlur = Math.max(5, rx * (0.45 + tier * 0.07))
    }

    ctx.globalAlpha = (0.76 + tier * 0.03) * aScale
    ctx.strokeStyle = spec.primaryColor
    ctx.lineWidth = Math.max(1.2, rx * 0.1)
    ctx.beginPath()
    ctx.ellipse(opts.x, groundY, cRx, cRy, 0, 0, Math.PI * 2)
    ctx.stroke()

    ctx.globalAlpha = 0.72 * aScale
    ctx.strokeStyle = tier === 4 ? '#fef08a' : spec.secondaryColor
    ctx.lineWidth = Math.max(0.9, rx * 0.065)
    ctx.beginPath()
    ctx.ellipse(opts.x, groundY, cRx * 0.74, cRy * 0.74, 0, 0, Math.PI * 2)
    ctx.stroke()

    if (spec.ringCount >= 3) {
      ctx.globalAlpha = 0.65 * aScale
      ctx.strokeStyle = spec.coreAccentColor
      ctx.lineWidth = Math.max(0.8, rx * 0.05)
      ctx.beginPath()
      ctx.ellipse(opts.x, groundY, cRx * 0.5, cRy * 0.5, 0, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Star / Hexagram / Octagram geometry inside floor circle for Tier 3+
    if (tier >= 3) {
      const polySides = tier === 5 ? 3 : 4
      const offsets = tier === 5 ? [0, Math.PI / 3] : [0, Math.PI / 4]
      ctx.globalAlpha = (tier >= 5 ? 0.62 : 0.45) * aScale
      ctx.strokeStyle = tier === 4 ? '#fef08a' : spec.secondaryColor
      ctx.lineWidth = Math.max(0.8, rx * 0.055)
      for (const off of offsets) {
        ctx.beginPath()
        for (let k = 0; k <= polySides; k++) {
          const ang = t * 0.48 + off + (k * Math.PI * 2) / polySides
          const px = opts.x + Math.cos(ang) * cRx * 0.88
          const py = groundY + Math.sin(ang) * cRy * 0.88
          if (k === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }
    }

    // Rotating perimeter sigil ticks
    ctx.fillStyle = spec.coreAccentColor
    const tickSize = Math.max(1.6, rx * 0.13)
    for (let i = 0; i < spec.runeCount; i++) {
      const ang = t * 0.9 + (i * Math.PI * 2) / spec.runeCount
      const px = opts.x + Math.cos(ang) * cRx * 0.96
      const py = groundY + Math.sin(ang) * cRy * 0.96
      ctx.globalAlpha = 0.82 * aScale
      ctx.fillRect(Math.round(px - tickSize / 2), Math.round(py - tickSize / 2), Math.round(tickSize), Math.round(tickSize))
    }

    // Wings behind character (Tier 5 dark-violet monarch / Tier 6 white-gold seraphim)
    if (spec.hasWings && spec.wingVariant !== 'none') {
      drawDetailedWings(ctx, opts.x, opts.y - h * 0.56, rx, h, t, spec.wingVariant, aScale, disableGlow)
    }

    // Back crystal spires / light blades on far half of circle (Tier 5 & 6)
    if (spec.spireCount > 0) {
      for (let i = 0; i < spec.spireCount; i++) {
        const ang = (i * Math.PI * 2) / spec.spireCount + (tier === 5 ? 0.35 : 0.25)
        if (Math.sin(ang) >= 0) continue
        const sx = opts.x + Math.cos(ang) * cRx * 1.04
        const sy = groundY + Math.sin(ang) * cRy * 1.04
        const spireH = h * (0.28 + (i % 2) * 0.14)
        const spireW = Math.max(3, rx * 0.26)
        const tilt = Math.cos(ang) * 0.16
        if (tier === 5) {
          drawCrystalSpire(ctx, sx, sy, spireW, spireH, '#3b0764', '#9333ea', '#f5d0fe', tilt, 0.85 * aScale)
        } else {
          drawCrystalSpire(ctx, sx, sy, spireW * 0.85, spireH * 1.12, '#b45309', '#fbbf24', '#ffffff', tilt * 0.4, 0.85 * aScale)
        }
      }
    }
  }

  // ---------------- FRONT LAYER (halo crown above head, outer side crystals & perimeter star sparkles) ----------------
  if (layer === 'all' || layer === 'front') {
    // Crown / Celestial Sun-Cross Halo strictly above the head (Tier 5 & Tier 6)
    if (spec.hasHaloCrown && spec.wingVariant !== 'none') {
      drawCrownHalo(ctx, opts.x, opts.y - h * 1.07, rx, h, t, spec.wingVariant, aScale, disableGlow)
    }

    // Compact flank crystal spires only on outer left/right edges so character torso & face stay clear
    if (spec.spireCount > 0) {
      for (let i = 0; i < spec.spireCount; i++) {
        const ang = (i * Math.PI * 2) / spec.spireCount + (tier === 5 ? 0.35 : 0.25)
        if (Math.sin(ang) < 0 || Math.abs(Math.cos(ang)) < 0.5) continue
        const sx = opts.x + Math.cos(ang) * cRx * 1.08
        const sy = groundY + Math.sin(ang) * cRy * 1.04
        const spireH = h * (0.14 + (i % 2) * 0.06)
        const spireW = Math.max(2.6, rx * 0.22)
        const tilt = Math.cos(ang) * 0.18
        if (tier === 5) {
          drawCrystalSpire(ctx, sx, sy, spireW, spireH, '#3b0764', '#9333ea', '#f5d0fe', tilt, 0.86 * aScale)
        } else {
          drawCrystalSpire(ctx, sx, sy, spireW * 0.85, spireH * 1.05, '#b45309', '#fbbf24', '#ffffff', tilt * 0.4, 0.86 * aScale)
        }
      }
    }

    // Floating faceted crystals cleanly outside character silhouette (Tier 2: 2, Tier 3: 4, Tier 4: 6, Tier 5: 4, Tier 6: 6)
    if (spec.orbitShardCount > 0 && !disableGlow) {
      const cSize = Math.max(2.8, rx * (0.22 + (tier >= 4 ? 0.04 : 0)))
      for (let i = 0; i < spec.orbitShardCount; i++) {
        const side = i % 2 === 0 ? -1 : 1
        const slot = Math.floor(i / 2)
        const totalSlots = Math.ceil(spec.orbitShardCount / 2)
        const heightFrac = totalSlots === 1 ? 0.56 : 0.32 + (slot / Math.max(1, totalSlots - 1)) * 0.46
        const arcOffset = totalSlots === 1 ? 1.18 : 1.12 + Math.sin((slot / Math.max(1, totalSlots - 1)) * Math.PI) * 0.22
        const cx = opts.x + side * cRx * arcOffset + Math.cos(t * 1.9 + i) * rx * 0.05
        const cy = opts.y - h * heightFrac + Math.sin(t * 2.8 + i * 1.4) * (h * 0.04)
        const outerCol = tier === 6 ? '#fbbf24' : tier === 5 ? '#9333ea' : '#2563eb'
        const innerCol = tier === 6 ? '#ffffff' : tier === 5 ? '#f5d0fe' : '#bae6fd'
        drawFloatingCrystal(ctx, cx, cy, cSize, outerCol, innerCol, side * 0.08, 0.92 * aScale)
      }
    }

    // Twinkling 4-point star sparkles framing the outer perimeter without covering face/body
    if (!disableGlow) {
      const sparkCount = 4 + tier * 2
      const sparkSize = Math.max(1.5, rx * 0.12)
      for (let i = 0; i < sparkCount; i++) {
        const phase = (t * (0.7 + (i % 3) * 0.18) + i / sparkCount) % 1
        const side = i % 2 === 0 ? -1 : 1
        const outerFrac = 0.72 + ((i * 37) % 10) / 22
        const spreadX = side * cRx * outerFrac + Math.sin(i * 2.17 + t * 0.9) * rx * 0.14
        const py = groundY - phase * h * 1.12
        const fade = Math.sin(phase * Math.PI)
        const col = i % 3 === 0 ? '#ffffff' : spec.secondaryColor
        drawStarSparkle(ctx, opts.x + spreadX, py, sparkSize * (0.75 + (i % 2) * 0.35), col, fade * 0.88 * aScale)
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
  disableGlow?: boolean
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
    disableGlow: opts.disableGlow,
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
    disableGlow?: boolean
  },
) {
  const { style, primaryColor, secondaryColor, sourceX, sourceY, targetX, targetY, floorY, scale, progress: k, alpha, disableGlow } = p
  const s = scale

  ctx.save()
  ctx.strokeStyle = primaryColor
  ctx.fillStyle = primaryColor
  if (!disableGlow) {
    ctx.shadowColor = primaryColor
    ctx.shadowBlur = Math.max(4, 5 * s)
  }

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
