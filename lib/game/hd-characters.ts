import type { WeaponType } from './data'
import type { MountModelSpec, PetModelSpec } from './models-2d'
import { getMountVisualTier } from './mounts'
import { MOUNT_FOOT_PAD_FRAC } from './sprite-sheets'
import type { Dir, HumanColors, SpriteAction } from './sprites'

const HD_INK = '#291713'

function hexRgb(hex: string): [number, number, number] {
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

function shadeCol(hex: string, amt: number): string {
  const [r, g, b] = hexRgb(hex)
  const f = (c: number) =>
    Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)))
  return `#${[f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

function makeSmoothCanvas(w: number, h: number, hdScale = 4) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.dataset.hdScale = String(hdScale)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  return { c, ctx }
}

function gradVert(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, top: string, bot: string) {
  const g = ctx.createLinearGradient(x, y0, x, y1)
  g.addColorStop(0, top)
  g.addColorStop(1, bot)
  return g
}

function drawAnimeEye(
  ctx: CanvasRenderingContext2D,
  ex: number,
  ey: number,
  rx: number,
  ry: number,
  irisColor: string,
  blink: boolean,
  isAngry = false,
) {
  if (blink) {
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.arc(ex, ey + 1, rx * 1.05, 0.15, Math.PI - 0.15)
    ctx.stroke()
    return
  }
  // Eye white sclera subtle rim
  ctx.fillStyle = '#fff9f5'
  ctx.beginPath()
  ctx.ellipse(ex, ey, rx * 1.12, ry * 1.06, 0, 0, Math.PI * 2)
  ctx.fill()

  // Deep anime iris gradient
  const ig = ctx.createLinearGradient(ex, ey - ry, ex, ey + ry)
  ig.addColorStop(0, HD_INK)
  ig.addColorStop(0.55, shadeCol(irisColor, -0.15))
  ig.addColorStop(1, shadeCol(irisColor, 0.35))
  ctx.fillStyle = ig
  ctx.beginPath()
  ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()

  // Thick upper eyelash & brow arch
  ctx.strokeStyle = HD_INK
  ctx.lineWidth = 2.6
  ctx.beginPath()
  ctx.ellipse(ex, ey - 0.6, rx * 1.08, ry * 0.92, 0, Math.PI * 1.08, Math.PI * 1.92)
  ctx.stroke()

  if (isAngry) {
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(ex - rx * 1.2, ey - ry * 1.25)
    ctx.lineTo(ex + rx * 1.1, ey - ry * 0.95)
    ctx.stroke()
  }

  // Crisp glossy specular catchlights
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(ex - rx * 0.34, ey - ry * 0.36, rx * 0.38, ry * 0.34, -0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(ex + rx * 0.34, ey + ry * 0.38, rx * 0.18, 0, Math.PI * 2)
  ctx.fill()
}

function drawHdWeapon(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  weapon: WeaponType | null,
  weaponColor: string,
  angle: number,
  action: SpriteAction,
  atkF: number,
  jobId?: string,
) {
  if (!weapon) return
  ctx.save()
  ctx.translate(hx, hy)
  ctx.rotate(angle)
  const hi = shadeCol(weaponColor, 0.45)
  const dark = shadeCol(weaponColor, -0.28)
  const gold = jobId === 'templar' || jobId === 'the_king' ? '#fde047' : '#e9c46a'

  if (weapon === 'sword') {
    const heavy = jobId === 'templar' || jobId === 'the_king' || jobId === 'kensei'
    const len = heavy ? 46 : 40
    const bw = heavy ? 8 : 6
    // Pommel & hilt
    ctx.fillStyle = '#784421'
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.roundRect(-8, -2.5, 11, 5, 2)
    ctx.fill()
    ctx.stroke()
    // Crossguard
    ctx.fillStyle = gold
    ctx.beginPath()
    ctx.roundRect(1, -8, 5, 16, 2)
    ctx.fill()
    ctx.stroke()
    // Blade body
    const bg = ctx.createLinearGradient(5, -bw / 2, 5, bw / 2)
    bg.addColorStop(0, '#ffffff')
    bg.addColorStop(0.35, hi)
    bg.addColorStop(0.7, weaponColor)
    bg.addColorStop(1, dark)
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.moveTo(6, -bw / 2)
    ctx.lineTo(6 + len - 7, -bw / 2)
    ctx.lineTo(6 + len, 0)
    ctx.lineTo(6 + len - 7, bw / 2)
    ctx.lineTo(6, bw / 2)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  } else if (weapon === 'dagger') {
    ctx.fillStyle = '#5c3d2e'
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(-6, -2, 8, 4, 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = gold
    ctx.fillRect(1, -5, 3.5, 10)
    ctx.strokeRect(1, -5, 3.5, 10)
    ctx.fillStyle = gradVert(ctx, 4, -3, 3, '#ffffff', dark)
    ctx.beginPath()
    ctx.moveTo(4.5, -3)
    ctx.lineTo(28, 0)
    ctx.lineTo(4.5, 3)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  } else if (weapon === 'stick') {
    // Classic carved wooden adventurer staff matching the Novice weapon sheet
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.2
    ctx.fillStyle = gradVert(ctx, 0, -3.5, 3.5, '#b87d48', '#6b411e')
    ctx.beginPath()
    ctx.roundRect(-12, -2.5, 45, 5, 2.5)
    ctx.fill()
    ctx.stroke()
    // Gnarled oak knob & carved grip rings
    ctx.fillStyle = '#9c6334'
    ctx.beginPath()
    ctx.ellipse(33, -0.5, 5.2, 4.4, 0.15, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#5c3618'
    ctx.fillRect(-1, -2.8, 3, 5.6)
    ctx.fillRect(6, -2.8, 3, 5.6)
    ctx.fillRect(24, -2.8, 3, 5.6)
  } else if (weapon === 'staff') {
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.2
    ctx.fillStyle = jobId === 'cleric' || jobId === 'the_king' ? '#eab308' : '#784421'
    ctx.beginPath()
    ctx.roundRect(-18, -2.4, 54, 4.8, 2)
    ctx.fill()
    ctx.stroke()
    // Gold ring & glowing arcane orb
    ctx.fillStyle = gold
    ctx.beginPath()
    ctx.arc(36, 0, 5.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    const og = ctx.createRadialGradient(38, -2, 1, 40, 0, 9)
    og.addColorStop(0, '#ffffff')
    og.addColorStop(0.45, hi)
    og.addColorStop(1, dark)
    ctx.fillStyle = og
    ctx.beginPath()
    ctx.arc(40, 0, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (weapon === 'bow') {
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(-4, 0, 22, -1.15, 1.15)
    ctx.stroke()
    ctx.strokeStyle = weaponColor
    ctx.lineWidth = 3.2
    ctx.beginPath()
    ctx.arc(-4, 0, 22, -1.15, 1.15)
    ctx.stroke()
    // Bowstring
    const pullX = action === 'attack' && atkF === 1 ? -10 : Math.cos(1.15) * 22 - 4
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(Math.cos(-1.15) * 22 - 4, Math.sin(-1.15) * 22)
    ctx.lineTo(pullX, 0)
    ctx.lineTo(Math.cos(1.15) * 22 - 4, Math.sin(1.15) * 22)
    ctx.stroke()
    if (action === 'attack' && (atkF === 1 || atkF === 2)) {
      ctx.strokeStyle = '#fef08a'
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(pullX, 0)
      ctx.lineTo(pullX + 26, 0)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function drawHdHatAndHair(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headTopY: number,
  headR: number,
  sideDir: 'down' | 'up' | 'side',
  colors: HumanColors,
  tailSway = 0,
) {
  if (colors.skeleton) return
  const hair = colors.hair
  const hairDark = shadeCol(hair, -0.26)
  const hairHi = shadeCol(hair, 0.28)
  const hairStyle = colors.hairStyle ?? 'spiky'
  const hatCol = colors.hat ?? colors.accent
  const hatDark = shadeCol(hatCol, -0.28)
  const hatHi = shadeCol(hatCol, 0.26)
  const style = colors.hatStyle ?? (colors.hat ? 'wizard' : 'none')

  // Front hair bangs & crown
  const paintHairCrown = (fullCrown: boolean) => {
    ctx.save()
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.6
    const hg = gradVert(ctx, cx, headTopY - 4, headTopY + headR * 2, hairHi, hairDark)
    ctx.fillStyle = hg

    if (sideDir === 'up') {
      ctx.beginPath()
      ctx.arc(cx, headTopY + headR, headR + 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      // Cute hair locks at nape
      ctx.beginPath()
      ctx.moveTo(cx - headR * 0.75, headTopY + headR * 1.45)
      ctx.quadraticCurveTo(cx, headTopY + headR * 2.15, cx + headR * 0.75, headTopY + headR * 1.45)
      ctx.fill()
      ctx.stroke()
      if (hairStyle === 'ponytail' || hairStyle === 'long' || hairStyle === 'royal') {
        ctx.beginPath()
        ctx.ellipse(cx, headTopY + headR * 2.1, 10, 12, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      ctx.restore()
      return
    }

    if (fullCrown) {
      // Sculpted spiky or swept Chibi crown
      ctx.beginPath()
      if (sideDir === 'down') {
        ctx.moveTo(cx - headR - 3, headTopY + headR * 0.9)
        ctx.quadraticCurveTo(cx - headR - 5, headTopY - 2, cx - headR * 0.55, headTopY - 5)
        if (hairStyle === 'spiky') {
          ctx.lineTo(cx - 12, headTopY - 11)
          ctx.lineTo(cx - 6, headTopY - 7)
          ctx.lineTo(cx - 1, headTopY - 14)
          ctx.lineTo(cx + 5, headTopY - 7)
          ctx.lineTo(cx + 12, headTopY - 12)
          ctx.lineTo(cx + 14, headTopY - 5)
        } else {
          ctx.quadraticCurveTo(cx, headTopY - 11, cx + headR * 0.55, headTopY - 5)
        }
        ctx.quadraticCurveTo(cx + headR + 5, headTopY - 2, cx + headR + 3, headTopY + headR * 0.9)
        // Fluffy layered anime forehead bangs
        ctx.lineTo(cx + headR * 0.72, headTopY + headR * 0.62)
        ctx.lineTo(cx + 8, headTopY + headR * 1.0)
        ctx.lineTo(cx + 3, headTopY + headR * 0.58)
        ctx.lineTo(cx - 2, headTopY + headR * 1.02)
        ctx.lineTo(cx - 8, headTopY + headR * 0.58)
        ctx.lineTo(cx - 14, headTopY + headR * 0.96)
        ctx.lineTo(cx - headR * 0.72, headTopY + headR * 0.56)
        ctx.closePath()
      } else {
        // Side view facing right
        ctx.moveTo(cx - headR - 4, headTopY + headR * 1.15)
        ctx.quadraticCurveTo(cx - headR - 6, headTopY - 5, cx - 2, headTopY - 9)
        if (hairStyle === 'spiky') {
          ctx.lineTo(cx + 4, headTopY - 13)
          ctx.lineTo(cx + 8, headTopY - 6)
          ctx.lineTo(cx + 15, headTopY - 10)
          ctx.lineTo(cx + 14, headTopY - 4)
        }
        ctx.quadraticCurveTo(cx + headR + 4, headTopY - 2, cx + headR + 2, headTopY + headR * 0.65)
        ctx.lineTo(cx + 6, headTopY + headR * 0.5)
        ctx.lineTo(cx + 2, headTopY + headR * 0.92)
        ctx.lineTo(cx - 8, headTopY + headR * 0.72)
        ctx.lineTo(cx - 10, headTopY + headR * 1.3)
        ctx.closePath()
      }
      ctx.fill()
      ctx.stroke()

      // Anime hair gloss crescent
      ctx.fillStyle = 'rgba(255,255,255,0.28)'
      ctx.beginPath()
      ctx.ellipse(cx - 5, headTopY + 3, 9, 3, -0.2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Forehead bangs peaking under hat
      ctx.beginPath()
      ctx.moveTo(cx - headR * 0.85, headTopY + headR * 0.45)
      ctx.lineTo(cx + headR * 0.85, headTopY + headR * 0.45)
      ctx.lineTo(cx + headR * 0.65, headTopY + headR * 0.9)
      ctx.lineTo(cx, headTopY + headR * 0.55)
      ctx.lineTo(cx - headR * 0.65, headTopY + headR * 0.9)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
  }

  if (style === 'none') {
    paintHairCrown(true)
    return
  }

  if (style === 'bandana' || style === 'novice_bandana') {
    paintHairCrown(true)
    ctx.save()
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.4
    ctx.fillStyle = gradVert(ctx, cx, headTopY + 3, headTopY + 12, hatHi, hatDark)
    ctx.beginPath()
    ctx.roundRect(cx - headR - 1, headTopY + 3, headR * 2 + 2, 8.5, 4)
    ctx.fill()
    ctx.stroke()

    if (style === 'novice_bandana') {
      // Gold forehead adventurer emblem on down/side
      if (sideDir === 'down') {
        ctx.fillStyle = '#fef08a'
        ctx.beginPath()
        ctx.roundRect(cx - 5, headTopY + 4, 10, 6.5, 2)
        ctx.fill()
        ctx.stroke()
      } else if (sideDir === 'side') {
        ctx.fillStyle = '#fef08a'
        ctx.beginPath()
        ctx.roundRect(cx + headR - 8, headTopY + 4.5, 7, 5.5, 2)
        ctx.fill()
        ctx.stroke()
      }

      // Fluttering twin headband tails
      if (sideDir === 'side') {
        ctx.fillStyle = hatCol
        ctx.beginPath()
        ctx.moveTo(cx - headR + 1, headTopY + 6)
        ctx.quadraticCurveTo(cx - headR - 10, headTopY + 6 + tailSway, cx - headR - 18, headTopY + 12 + tailSway * 1.3)
        ctx.lineTo(cx - headR - 14, headTopY + 18 + tailSway * 1.2)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = hatDark
        ctx.beginPath()
        ctx.moveTo(cx - headR + 2, headTopY + 9)
        ctx.quadraticCurveTo(cx - headR - 8, headTopY + 14 + tailSway, cx - headR - 13, headTopY + 21 + tailSway)
        ctx.lineTo(cx - headR - 7, headTopY + 22 + tailSway)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      } else if (sideDir === 'up') {
        // Knot + twin tails bouncing behind the head
        ctx.fillStyle = hatCol
        ctx.beginPath()
        ctx.moveTo(cx - 2, headTopY + 8)
        ctx.lineTo(cx - 12 - tailSway * 0.5, headTopY + 20 + Math.abs(tailSway))
        ctx.lineTo(cx - 5 - tailSway * 0.4, headTopY + 22 + Math.abs(tailSway))
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(cx + 2, headTopY + 8)
        ctx.lineTo(cx + 12 + tailSway * 0.5, headTopY + 20 - tailSway * 0.4)
        ctx.lineTo(cx + 5 + tailSway * 0.4, headTopY + 22 - tailSway * 0.4)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = hatHi
        ctx.beginPath()
        ctx.arc(cx, headTopY + 7, 4.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      } else {
        // Subtle peeking headband ribbons on front view
        ctx.fillStyle = hatDark
        ctx.beginPath()
        ctx.moveTo(cx - headR, headTopY + 8)
        ctx.lineTo(cx - headR - 6, headTopY + 15 + tailSway * 0.5)
        ctx.lineTo(cx - headR - 2, headTopY + 17 + tailSway * 0.5)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }

      // Iconic Novice green leaf sprout on crown!
      const sproutX = sideDir === 'side' ? cx - 2 : cx + 4
      const sproutY = headTopY - 6
      const tilt = tailSway * 0.04
      ctx.save()
      ctx.translate(sproutX, sproutY)
      ctx.rotate(tilt)
      ctx.strokeStyle = HD_INK
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(0, 4)
      ctx.quadraticCurveTo(1, -4, 3, -9)
      ctx.stroke()
      ctx.fillStyle = '#4ade80'
      ctx.beginPath()
      ctx.ellipse(8, -10, 7, 3.6, -0.45, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#86efac'
      ctx.beginPath()
      ctx.ellipse(-4, -8, 5, 2.8, 0.55, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    } else if (sideDir === 'side' || sideDir === 'up') {
      ctx.beginPath()
      ctx.moveTo(cx - headR + 2, headTopY + 6)
      ctx.lineTo(cx - headR - 10, headTopY + 14)
      ctx.lineTo(cx - headR - 6, headTopY + 19)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
    return
  }

  if (style === 'wizard' || style === 'archmage') {
    paintHairCrown(false)
    ctx.save()
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.6
    // Wide curved brim
    ctx.fillStyle = gradVert(ctx, cx, headTopY - 2, headTopY + 12, hatCol, hatDark)
    ctx.beginPath()
    ctx.ellipse(cx, headTopY + 6, headR + 14, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    // Pointed wizard cone
    ctx.fillStyle = gradVert(ctx, cx, headTopY - 30, headTopY + 6, hatHi, hatCol)
    ctx.beginPath()
    ctx.moveTo(cx - headR + 2, headTopY + 5)
    ctx.quadraticCurveTo(cx - 4, headTopY - 18, cx - 10, headTopY - 28)
    ctx.quadraticCurveTo(cx + 8, headTopY - 20, cx + headR - 2, headTopY + 5)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // Gold ribbon
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.roundRect(cx - headR + 3, headTopY, headR * 2 - 6, 5, 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    return
  }

  if (style === 'helm' || style === 'paladin_helm') {
    paintHairCrown(false)
    const plume = style === 'paladin_helm' ? '#38bdf8' : '#ef4444'
    ctx.save()
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.6
    // Flowing plume
    ctx.fillStyle = plume
    ctx.beginPath()
    ctx.ellipse(cx - 4, headTopY - 10, 12, 7, -0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    // Polished steel dome
    ctx.fillStyle = gradVert(ctx, cx, headTopY - 6, headTopY + 14, '#f8fafc', hatDark)
    ctx.beginPath()
    ctx.arc(cx, headTopY + headR * 0.55, headR + 3, Math.PI, 0)
    ctx.lineTo(cx + headR + 3, headTopY + headR * 0.9)
    ctx.lineTo(cx - headR - 3, headTopY + headR * 0.9)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(cx - 2, headTopY + 3, 4, 12)
    ctx.strokeRect(cx - 2, headTopY + 3, 4, 12)
    ctx.restore()
    return
  }

  if (style === 'crown') {
    paintHairCrown(true)
    ctx.save()
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.2
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.moveTo(cx - 14, headTopY + 2)
    ctx.lineTo(cx - 16, headTopY - 10)
    ctx.lineTo(cx - 7, headTopY - 3)
    ctx.lineTo(cx, headTopY - 14)
    ctx.lineTo(cx + 7, headTopY - 3)
    ctx.lineTo(cx + 16, headTopY - 10)
    ctx.lineTo(cx + 14, headTopY + 2)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#f43f5e'
    ctx.beginPath()
    ctx.arc(cx, headTopY - 3, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }

  if (style === 'cat_hood') {
    paintHairCrown(false)
    ctx.save()
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.4
    ctx.fillStyle = gradVert(ctx, cx, headTopY - 4, headTopY + 14, hatHi, hatCol)
    ctx.beginPath()
    ctx.arc(cx, headTopY + headR * 0.65, headR + 3, Math.PI, 0)
    ctx.fill()
    ctx.stroke()
    // Cat ears
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(cx + sx * 6, headTopY - 2)
      ctx.lineTo(cx + sx * 16, headTopY - 16)
      ctx.lineTo(cx + sx * 20, headTopY + 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#fda4af'
      ctx.beginPath()
      ctx.arc(cx + sx * 14, headTopY - 6, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = gradVert(ctx, cx, headTopY - 4, headTopY + 14, hatHi, hatCol)
    }
    ctx.restore()
    return
  }

  // Hood / cowl / mitre / merchant_beret
  paintHairCrown(style === 'merchant_beret')
  ctx.save()
  ctx.strokeStyle = HD_INK
  ctx.lineWidth = 2.5
  ctx.fillStyle = gradVert(ctx, cx, headTopY - 8, headTopY + 14, hatHi, hatDark)
  if (style === 'mitre') {
    ctx.beginPath()
    ctx.moveTo(cx - headR, headTopY + 6)
    ctx.lineTo(cx, headTopY - 22)
    ctx.lineTo(cx + headR, headTopY + 6)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(cx - 2, headTopY - 14, 4, 18)
  } else {
    ctx.beginPath()
    ctx.ellipse(cx, headTopY + 4, headR + 5, 10, 0, Math.PI, 0)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}

export function renderHdHumanSprite(
  colors: HumanColors,
  dir: Dir,
  frame: number,
  weapon: WeaponType | null = null,
  weaponColor = '#ced4da',
  attacking = false,
  actionOverride?: SpriteAction,
  attackFrameOverride?: number,
): HTMLCanvasElement {
  const rawAction: SpriteAction = attacking ? 'attack' : actionOverride ?? (frame > 0 ? 'walk' : 'idle')
  const action: SpriteAction =
    rawAction === 'run' ? 'walk' : rawAction === 'mount' || rawAction === 'dismount' ? 'idle' : rawAction
  const isSkill = action === 'skill'
  const isAtk = action === 'attack'
  const f =
    isAtk || isSkill
      ? Math.abs(attackFrameOverride ?? frame) % 4
      : action === 'walk'
        ? Math.abs(frame) % 4
        : frame === -1
          ? -1
          : Math.abs(frame) % 4

  const W = 168
  const H = 192
  const { c, ctx } = makeSmoothCanvas(W, H, 4)

  const skin = colors.skin ?? '#fbd8b8'
  const skinDark = shadeCol(skin, -0.18)
  const body = colors.body
  const bodyHi = shadeCol(body, 0.25)
  const bodyDark = shadeCol(body, -0.28)
  const legs = colors.legs
  const boot =
    colors.armorStyle === 'plate' || colors.armorStyle === 'paladin_plate'
      ? '#64748b'
      : colors.armorStyle === 'novice_tunic'
        ? '#6f4126'
        : '#59331f'
  const bootDark = shadeCol(boot, -0.3)
  const blink = !attacking && !isSkill && f === -1

  // Walk/Idle/Attack/Skill kinematics
  let bob = 0
  let stepL = 0
  let stepR = 0
  let liftL = 0
  let liftR = 0
  let armSwing = 0
  let lunge = 0
  let tailSway = 0
  let wAngle = weapon === 'staff' ? -1.15 : weapon === 'bow' ? 0 : -0.45

  if (action === 'idle') {
    const breathSeq = [0, 1.8, 0.6, -0.8]
    const idx = f < 0 ? 0 : f % 4
    bob = breathSeq[idx]
    tailSway = [0, 1.8, 0.5, -1.6][idx]
    armSwing = [0, 1.5, 0, -1.5][idx]
  } else if (action === 'walk') {
    const seq4 = [
      { bob: 0, sL: -10, sR: 10, lL: 0, lR: 3.5, arm: 11, sway: 4 },
      { bob: -4.5, sL: -1, sR: 1, lL: 6.5, lR: 0, arm: 2, sway: 6.5 },
      { bob: 0, sL: 10, sR: -10, lL: 3.5, lR: 0, arm: -11, sway: 4.5 },
      { bob: -4.5, sL: 1, sR: -1, lL: 0, lR: 6.5, arm: -2, sway: 6.5 },
    ][f % 4]
    bob = seq4.bob
    stepL = seq4.sL
    stepR = seq4.sR
    liftL = seq4.lL
    liftR = seq4.lR
    armSwing = seq4.arm
    tailSway = seq4.sway
    wAngle += seq4.arm * 0.032
  } else if (isSkill) {
    // Dedicated energetic 4-frame Skill animation (charge -> hero leap -> burst -> land)
    const skillFrames = [
      { bob: 3, lunge: -2, wa: -0.95, arm: -6, sway: -2 },
      { bob: -7, lunge: 4, wa: -1.9, arm: -14, sway: 7 },
      { bob: -4.5, lunge: 7, wa: -1.55, arm: -10, sway: 8.5 },
      { bob: 1, lunge: 2, wa: -0.7, arm: 2, sway: 2 },
    ][f % 4]
    bob = skillFrames.bob
    lunge = skillFrames.lunge
    wAngle = skillFrames.wa
    armSwing = skillFrames.arm
    tailSway = skillFrames.sway
  } else {
    // Attack pose (windup -> lunge slash -> follow-through -> recover)
    const atkAngles = [-1.62, 0.28, 1.02, 0.08]
    const atkLunge = [-4, 10, 13, 3]
    bob = f === 1 ? -4 : f === 2 ? -1 : 1
    lunge = atkLunge[f % 4]
    wAngle = atkAngles[f % 4]
    armSwing = f === 0 ? -12 : f === 3 ? 4 : 13
    tailSway = f === 0 ? -4 : f === 1 || f === 2 ? 7.5 : 2
  }

  ctx.save()
  if (dir === 'left') {
    ctx.translate(W, 0)
    ctx.scale(-1, 1)
  }

  const cx = W / 2 + (dir === 'right' || dir === 'left' ? lunge : 0)
  const footY = 176
  const hipY = 136 + bob
  const torsoTopY = 92 + bob
  const headR = 32
  const headCenterY = 58 + bob
  const headTopY = headCenterY - headR
  const sideDir = dir === 'left' || dir === 'right' ? 'side' : dir

  // Skill ground magic circle (behind character)
  if (isSkill) {
    ctx.save()
    const ringScale = f === 0 ? 0.75 : f === 1 ? 1.02 : f === 2 ? 1.18 : 0.88
    const ringAlpha = f === 3 ? 0.42 : 0.85
    ctx.globalAlpha = ringAlpha
    const isNovice = colors.jobId === 'novice'
    ctx.strokeStyle = isNovice ? '#38bdf8' : (colors.auraColor ?? '#38bdf8')
    ctx.lineWidth = 3.2
    ctx.beginPath()
    ctx.ellipse(cx, footY + 1, 38 * ringScale, 12 * ringScale, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = isNovice ? '#f472b6' : '#fde047'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(cx, footY + 1, 25 * ringScale, 8 * ringScale, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  // Halo (Cleric / Paladin / Seraph)
  if (colors.halo) {
    ctx.save()
    ctx.strokeStyle = '#fde047'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.ellipse(cx, headTopY - 12, 20, 6.5, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  // Angel Wings behind torso
  if (colors.wings) {
    ctx.save()
    ctx.fillStyle = '#f8fafc'
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.4
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(cx + s * 10, torsoTopY + 16)
      ctx.quadraticCurveTo(cx + s * 46, torsoTopY - 10, cx + s * 52, torsoTopY + 18)
      ctx.quadraticCurveTo(cx + s * 36, torsoTopY + 34, cx + s * 10, torsoTopY + 28)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
  }

  // Adventurer Backpack on side view (behind torso)
  if (colors.backpack && sideDir === 'side') {
    const bpX = cx - 30
    const bpY = torsoTopY + 10
    ctx.save()
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.4
    // Rolled travel bedroll / map scroll on top
    ctx.fillStyle = '#e7dec8'
    ctx.beginPath()
    ctx.roundRect(bpX - 2, bpY - 6, 18, 9, 4)
    ctx.fill()
    ctx.stroke()
    // Leather pack body
    ctx.fillStyle = gradVert(ctx, bpX, bpY, bpY + 30, '#a47148', '#6b4226')
    ctx.beginPath()
    ctx.roundRect(bpX - 3, bpY + 1, 20, 28, 6)
    ctx.fill()
    ctx.stroke()
    // Flap + gold clasp
    ctx.fillStyle = '#c89b6e'
    ctx.beginPath()
    ctx.roundRect(bpX - 3, bpY + 1, 20, 11, 5)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(bpX + 4, bpY + 9, 6, 5)
    ctx.strokeRect(bpX + 4, bpY + 9, 6, 5)
    ctx.restore()
  }

  // Cape behind body (visible down/side/up)
  if (colors.cape) {
    ctx.save()
    ctx.fillStyle = gradVert(ctx, cx, torsoTopY + 8, hipY + 20, colors.cape, shadeCol(colors.cape, -0.35))
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.6
    ctx.beginPath()
    const capeDx = sideDir === 'side' ? -18 - tailSway * 0.6 : 0
    ctx.moveTo(cx - 18, torsoTopY + 10)
    ctx.lineTo(cx + 18, torsoTopY + 10)
    ctx.lineTo(cx + 26 + capeDx, hipY + 18)
    ctx.lineTo(cx - 26 + capeDx, hipY + 18)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  // Back hair layer for long hairstyles
  if (sideDir === 'down' && (colors.hairStyle === 'long' || colors.hairStyle === 'royal' || colors.hairStyle === 'braid')) {
    ctx.save()
    ctx.fillStyle = shadeCol(colors.hair, -0.22)
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.4
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.roundRect(cx + sx * 22 - 7, headCenterY + 2, 14, 38, 6)
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
  }

  // Boots & Legs
  const paintLeg = (lx: number, offsetX: number, lift: number, darkSide = false) => {
    const fx = lx + (sideDir === 'side' ? offsetX : 0)
    const fy = footY - lift - (sideDir !== 'side' ? Math.max(0, offsetX * 0.38) : 0)
    ctx.save()
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.6
    ctx.fillStyle = darkSide ? shadeCol(legs, -0.22) : legs
    ctx.beginPath()
    ctx.roundRect(fx - 7.5, hipY - 2, 15, fy - hipY - 4, 5)
    ctx.fill()
    ctx.stroke()
    // Cuffed Boot (taller leather cuff with buckle for Novice)
    const isNoviceBoot = colors.armorStyle === 'novice_tunic'
    const bootH = isNoviceBoot ? 17 : 14
    ctx.fillStyle = gradVert(ctx, fx, fy - bootH, fy, boot, bootDark)
    ctx.beginPath()
    ctx.roundRect(fx - 9, fy - bootH, sideDir === 'side' ? 21 : 18, bootH, 5)
    ctx.fill()
    ctx.stroke()
    // Turned-over cuff band
    ctx.fillStyle = isNoviceBoot ? '#a47148' : shadeCol(boot, 0.28)
    ctx.fillRect(fx - 7.5, fy - bootH, sideDir === 'side' ? 18 : 15, isNoviceBoot ? 5 : 3.5)
    if (isNoviceBoot) {
      ctx.fillStyle = '#fbbf24'
      ctx.fillRect(fx - 1.5, fy - bootH + 7, 4, 3)
    }
    ctx.restore()
  }
  if (sideDir === 'side') {
    paintLeg(cx - 4, stepL, liftL, true)
    paintLeg(cx + 4, stepR, liftR, false)
  } else {
    paintLeg(cx - 11, stepL, liftL)
    paintLeg(cx + 11, stepR, liftR)
  }

  // Weapon behind torso if facing up
  if (sideDir === 'up') {
    drawHdWeapon(ctx, cx + 22, torsoTopY + 22 + (isSkill ? -10 : 0), weapon, weaponColor, wAngle - 0.7, action, f, colors.jobId)
  }

  // Back arm on side view
  if (sideDir === 'side') {
    ctx.save()
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.6
    ctx.fillStyle = bodyDark
    ctx.beginPath()
    ctx.roundRect(cx + 6 + armSwing * 0.4, torsoTopY + 12, 12, 26, 5)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = skin
    ctx.beginPath()
    ctx.arc(cx + 12 + armSwing * 0.5, torsoTopY + 38, 6.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  // Chibi Torso / Tunic / Plate
  ctx.save()
  ctx.strokeStyle = HD_INK
  ctx.lineWidth = 2.8
  ctx.fillStyle = gradVert(ctx, cx, torsoTopY, hipY + 4, bodyHi, bodyDark)
  ctx.beginPath()
  ctx.roundRect(cx - 21, torsoTopY + 4, 42, 42, 12)
  ctx.fill()
  ctx.stroke()

  if (colors.armorStyle === 'novice_tunic') {
    // Inner dark brown tunic vest peeking through split front hem
    if (sideDir === 'down') {
      ctx.fillStyle = '#4a3731'
      ctx.beginPath()
      ctx.moveTo(cx - 5, hipY - 7)
      ctx.lineTo(cx + 5, hipY - 7)
      ctx.lineTo(cx + 8, hipY + 7)
      ctx.lineTo(cx - 8, hipY + 7)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }

    // Folded white/cream hoodie cowl around shoulders
    ctx.fillStyle = gradVert(ctx, cx, torsoTopY, torsoTopY + 14, '#efe9dc', '#cfc5b4')
    ctx.beginPath()
    if (sideDir === 'up') {
      ctx.roundRect(cx - 19, torsoTopY + 3, 38, 17, 7)
    } else {
      ctx.ellipse(cx, torsoTopY + 9, 19, 7.5, 0, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.stroke()

    // Crossbody brown leather chest strap + gold buckle (front/side/up)
    ctx.fillStyle = '#784421'
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.2
    if (sideDir === 'down') {
      ctx.beginPath()
      ctx.moveTo(cx + 12, torsoTopY + 6)
      ctx.lineTo(cx + 18, torsoTopY + 8)
      ctx.lineTo(cx - 14, hipY - 5)
      ctx.lineTo(cx - 20, hipY - 7)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#fbbf24'
      ctx.fillRect(cx + 1, torsoTopY + 14, 6.5, 6.5)
      ctx.strokeRect(cx + 1, torsoTopY + 14, 6.5, 6.5)
    } else if (sideDir === 'up') {
      ctx.beginPath()
      ctx.moveTo(cx - 12, torsoTopY + 11)
      ctx.lineTo(cx - 6, torsoTopY + 11)
      ctx.lineTo(cx + 18, hipY - 6)
      ctx.lineTo(cx + 12, hipY - 6)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.roundRect(cx - 4, torsoTopY + 9, 8, 28, 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#fbbf24'
      ctx.fillRect(cx - 3, torsoTopY + 16, 6, 6)
      ctx.strokeRect(cx - 3, torsoTopY + 16, 6, 6)
    }

    // Hanging brown leather hip pouch on waist
    const pouchX = sideDir === 'down' ? cx - 22 : sideDir === 'up' ? cx + 10 : cx - 10
    const pouchY = hipY - 2 + Math.round(tailSway * 0.2)
    ctx.fillStyle = gradVert(ctx, pouchX, pouchY, pouchY + 14, '#a6663a', '#6e3f24')
    ctx.beginPath()
    ctx.roundRect(pouchX, pouchY, 13, 14, 4)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#c48252'
    ctx.beginPath()
    ctx.roundRect(pouchX, pouchY, 13, 6.5, 3)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(pouchX + 5, pouchY + 5, 3, 3)
  }

  // Sash / Belt & Collar Detail
  if (sideDir !== 'up' && colors.armorStyle !== 'novice_tunic') {
    ctx.strokeStyle = colors.scarf ?? colors.accent
    ctx.lineWidth = 5.5
    ctx.beginPath()
    ctx.moveTo(cx - 16, torsoTopY + 6)
    ctx.lineTo(cx, torsoTopY + 25)
    ctx.lineTo(cx + 16, torsoTopY + 6)
    ctx.stroke()
  }
  ctx.fillStyle = '#5c3d2e'
  ctx.strokeStyle = HD_INK
  ctx.lineWidth = 2
  ctx.fillRect(cx - 20, hipY - 8, 40, 7)
  ctx.strokeRect(cx - 20, hipY - 8, 40, 7)
  ctx.fillStyle = '#fbbf24'
  ctx.fillRect(cx - 5, hipY - 9, 10, 9)
  ctx.strokeRect(cx - 5, hipY - 9, 10, 9)
  ctx.restore()

  // Full Adventurer Backpack on 'up' (back) view
  if (colors.backpack && sideDir === 'up') {
    const bpY = torsoTopY + 8
    ctx.save()
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.5
    // Rolled blanket/map scroll across top
    ctx.fillStyle = '#e7dec8'
    ctx.beginPath()
    ctx.roundRect(cx - 19, bpY - 4, 38, 10, 5)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(cx - 12, bpY - 4, 4, 10)
    ctx.fillRect(cx + 8, bpY - 4, 4, 10)
    // Main leather satchel
    ctx.fillStyle = gradVert(ctx, cx, bpY + 4, bpY + 38, '#a47148', '#6b4226')
    ctx.beginPath()
    ctx.roundRect(cx - 17, bpY + 4, 34, 32, 8)
    ctx.fill()
    ctx.stroke()
    // Top flap + brass buckles
    ctx.fillStyle = '#c89b6e'
    ctx.beginPath()
    ctx.roundRect(cx - 17, bpY + 4, 34, 14, 6)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(cx - 10, bpY + 14, 5, 5)
    ctx.strokeRect(cx - 10, bpY + 14, 5, 5)
    ctx.fillRect(cx + 5, bpY + 14, 5, 5)
    ctx.strokeRect(cx + 5, bpY + 14, 5, 5)
    // Cute hanging green starter potion flask on right side
    ctx.fillStyle = '#4ade80'
    ctx.beginPath()
    ctx.arc(cx + 17, bpY + 28, 4.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  // Head
  ctx.save()
  ctx.strokeStyle = HD_INK
  ctx.lineWidth = 3
  const faceG = gradVert(ctx, cx, headTopY, headTopY + headR * 2, '#ffeedd', skinDark)
  ctx.fillStyle = colors.skeleton ? '#e2e8f0' : faceG
  ctx.beginPath()
  ctx.ellipse(cx, headCenterY, headR, headR * 0.94, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Cute ears
  if (sideDir !== 'up') {
    const earCount = sideDir === 'down' ? [-1, 1] : [-1]
    for (const s of earCount) {
      ctx.fillStyle = skin
      ctx.beginPath()
      ctx.ellipse(cx + s * (headR - 2), headCenterY + 3, colors.goblinEars ? 11 : 6, 7, s * 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }
  ctx.restore()

  // Expressive Anime Face
  if (sideDir === 'down') {
    // Rosy cheek blush
    ctx.fillStyle = 'rgba(251, 113, 133, 0.28)'
    ctx.beginPath()
    ctx.ellipse(cx - 17, headCenterY + 9, 6, 3.2, 0, 0, Math.PI * 2)
    ctx.ellipse(cx + 17, headCenterY + 9, 6, 3.2, 0, 0, Math.PI * 2)
    ctx.fill()

    drawAnimeEye(ctx, cx - 12, headCenterY + 2, 5.4, 7.2, colors.eye ?? '#3b2419', blink, attacking)
    drawAnimeEye(ctx, cx + 12, headCenterY + 2, 5.4, 7.2, colors.eye ?? '#3b2419', blink, attacking)

    // Smile or battle expression
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.2
    ctx.beginPath()
    if (attacking) {
      ctx.ellipse(cx, headCenterY + 15, 4, 3.2, 0, 0, Math.PI * 2)
    } else if (isSkill) {
      ctx.arc(cx, headCenterY + 12, 5.2, 0.1, Math.PI - 0.1)
    } else {
      ctx.arc(cx, headCenterY + 12, 4.5, 0.2, Math.PI - 0.2)
    }
    ctx.stroke()
  } else if (sideDir === 'side') {
    ctx.fillStyle = 'rgba(251, 113, 133, 0.28)'
    ctx.beginPath()
    ctx.ellipse(cx + 10, headCenterY + 9, 5.5, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    drawAnimeEye(ctx, cx + 16, headCenterY + 2, 4.8, 7.2, colors.eye ?? '#3b2419', blink, attacking)
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.arc(cx + 17, headCenterY + 13, 3.5, 0.2, Math.PI - 0.3)
    ctx.stroke()
  }

  // Hair & Hat over head
  drawHdHatAndHair(ctx, cx, headTopY, headR, sideDir, colors, tailSway)

  // Front Arm + Weapon
  const armX = sideDir === 'side' ? cx - 6 - armSwing * 0.45 : cx + 22
  const armY = torsoTopY + 14 + (isSkill && (f === 1 || f === 2) ? -8 : 0)
  const handX = sideDir === 'side' ? armX + 4 : cx + 25
  const handY = armY + 24 + (isAtk ? -10 : isSkill ? -14 : 0)

  ctx.save()
  ctx.strokeStyle = HD_INK
  ctx.lineWidth = 2.6
  ctx.fillStyle = bodyHi
  ctx.beginPath()
  ctx.roundRect(armX - 6, armY, 13, 25, 6)
  ctx.fill()
  ctx.stroke()
  if (colors.armorStyle === 'novice_tunic') {
    // Brown leather adventurer wrist bracer cuff
    ctx.fillStyle = '#6f4126'
    ctx.beginPath()
    ctx.roundRect(armX - 6.5, armY + 14, 14, 7, 3)
    ctx.fill()
    ctx.stroke()
  }
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.arc(handX, handY, 6.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  if (sideDir !== 'up') {
    const drawAngle = sideDir === 'down' ? wAngle + 0.55 : wAngle
    drawHdWeapon(ctx, handX, handY, weapon, weaponColor, drawAngle, action, f, colors.jobId)
  }

  // Attack swing arc & impact star (Novice uses bright sky-blue/white crescent wind slash)
  if (isAtk && (f === 1 || f === 2)) {
    ctx.save()
    ctx.globalAlpha = f === 1 ? 0.9 : 0.7
    ctx.strokeStyle = colors.jobId === 'novice' ? '#38bdf8' : '#fef08a'
    ctx.lineWidth = f === 1 ? 5.5 : 3.8
    const arcCx = sideDir === 'down' ? cx + 10 : cx + 16
    const arcCy = torsoTopY + 24
    ctx.beginPath()
    ctx.arc(arcCx, arcCy, 34, -0.95, 0.85)
    ctx.stroke()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.arc(arcCx, arcCy, 38, -0.75, 0.65)
    ctx.stroke()
    ctx.restore()
  }

  // Skill sparkle particles & floating 4-point star emblem
  if (isSkill && (f === 1 || f === 2)) {
    ctx.save()
    const isNovice = colors.jobId === 'novice'
    const sparkOffsets = [
      { dx: -36, dy: -22, r: 5.5, col: isNovice ? '#7dd3fc' : '#fde047' },
      { dx: 38, dy: -30, r: 6.5, col: isNovice ? '#f472b6' : '#4ade80' },
      { dx: -28, dy: 16, r: 4.5, col: isNovice ? '#c084fc' : '#86efac' },
      { dx: 34, dy: 10, r: 5, col: '#fef08a' },
    ]
    for (let i = 0; i < sparkOffsets.length; i++) {
      const sp = sparkOffsets[i]
      const sx = cx + sp.dx + (f === 2 ? (i % 2 === 0 ? -5 : 5) : 0)
      const sy = torsoTopY + sp.dy + (f === 2 ? -6 : 0)
      ctx.fillStyle = sp.col
      ctx.beginPath()
      ctx.moveTo(sx, sy - sp.r)
      ctx.lineTo(sx + sp.r * 0.35, sy - sp.r * 0.35)
      ctx.lineTo(sx + sp.r, sy)
      ctx.lineTo(sx + sp.r * 0.35, sy + sp.r * 0.35)
      ctx.lineTo(sx, sy + sp.r)
      ctx.lineTo(sx - sp.r * 0.35, sy + sp.r * 0.35)
      ctx.lineTo(sx - sp.r, sy)
      ctx.lineTo(sx - sp.r * 0.35, sy - sp.r * 0.35)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }

  // Shield on off-hand (Swordsman / Knight / Paladin)
  if (colors.shieldColor && sideDir !== 'up') {
    const shX = sideDir === 'down' ? cx - 23 : cx + 12
    const shY = torsoTopY + 24
    ctx.save()
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.5
    ctx.fillStyle = gradVert(ctx, shX, shY - 12, shY + 14, shadeCol(colors.shieldColor, 0.25), shadeCol(colors.shieldColor, -0.25))
    ctx.beginPath()
    ctx.moveTo(shX - 11, shY - 12)
    ctx.lineTo(shX + 11, shY - 12)
    ctx.lineTo(shX + 9, shY + 5)
    ctx.lineTo(shX, shY + 15)
    ctx.lineTo(shX - 9, shY + 5)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    if (colors.shieldCrest) {
      ctx.fillStyle = colors.shieldCrest
      ctx.beginPath()
      ctx.arc(shX, shY, 4.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  ctx.restore()
  return c
}

/* ---------------- HD Pets & Mounts ---------------- */

function drawPhaoSpiritBase(
  ctx: CanvasRenderingContext2D,
  cx: number,
  footY: number,
  accent: string,
  action: SpriteAction,
  f: number,
) {
  const pulse = action === 'attack' ? 1.15 : 0.92 + Math.sin((f / 6) * Math.PI * 2) * 0.08
  ctx.save()
  ctx.strokeStyle = accent
  ctx.fillStyle = accent
  ctx.globalAlpha = action === 'attack' ? 0.55 : 0.34
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.ellipse(cx, footY + 3, 28 * pulse, 9 * pulse, 0, 0, Math.PI * 2)
  ctx.stroke()

  ctx.globalAlpha = action === 'attack' ? 0.35 : 0.16
  ctx.beginPath()
  ctx.ellipse(cx, footY + 3, 21 * pulse, 6.2 * pulse, 0, 0, Math.PI * 2)
  ctx.fill()

  // Floating Phao-ob miniature spirit sparkles around seal
  ctx.globalAlpha = 0.85
  for (let i = 0; i < 3; i++) {
    const a = (f / 6) * Math.PI * 2 + (i * Math.PI * 2) / 3
    const ox = cx + Math.cos(a) * 32 * pulse
    const oy = footY + Math.sin(a) * 9 * pulse
    ctx.beginPath()
    ctx.arc(ox, oy, action === 'attack' ? 3 : 2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawPetWings(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  span: number,
  wingColor: string,
  tipColor: string,
  flapDeg: number,
  feathered: boolean,
  isSide: boolean,
  isUp: boolean,
) {
  const sides = isSide ? [-1] : [-1, 1]
  for (const sx of sides) {
    ctx.save()
    const anchorX = isSide ? cx - 8 : cx + sx * 12
    const anchorY = cy - 4
    ctx.translate(anchorX, anchorY)
    const ang = isSide ? -0.35 + flapDeg * 0.035 : sx * (-0.28 + flapDeg * 0.038)
    ctx.rotate(ang)

    const wg = ctx.createLinearGradient(0, -14, sx * span, 10)
    wg.addColorStop(0, shadeCol(wingColor, 0.25))
    wg.addColorStop(0.65, wingColor)
    wg.addColorStop(1, tipColor)
    ctx.fillStyle = wg
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.2

    ctx.beginPath()
    if (feathered) {
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(sx * span * 0.45, -18, sx * span, -8)
      ctx.quadraticCurveTo(sx * span * 0.9, 2, sx * span * 0.65, 6)
      ctx.quadraticCurveTo(sx * span * 0.42, 11, sx * span * 0.28, 9)
      ctx.quadraticCurveTo(sx * span * 0.14, 12, 0, 7)
      ctx.closePath()
    } else {
      // Bat / Dragon membrane wing
      ctx.moveTo(0, 2)
      ctx.lineTo(sx * span * 0.55, -17)
      ctx.lineTo(sx * span, -9)
      ctx.quadraticCurveTo(sx * span * 0.72, 2, sx * span * 0.55, 8)
      ctx.quadraticCurveTo(sx * span * 0.28, 4, 0, 9)
      ctx.closePath()
    }
    ctx.fill()
    ctx.stroke()

    // Inner wing feather / membrane rib highlight
    ctx.strokeStyle = shadeCol(tipColor, 0.35)
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(sx * 3, 1)
    ctx.lineTo(sx * span * 0.72, -6)
    ctx.stroke()
    if (isUp) {
      ctx.beginPath()
      ctx.moveTo(sx * 2, 4)
      ctx.lineTo(sx * span * 0.5, 3)
      ctx.stroke()
    }
    ctx.restore()
  }
}

function drawPetAttackVfx(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  atkF: number,
  accent: string,
  primary: string,
  kind: 'claw' | 'fire' | 'ice' | 'water' | 'holy' | 'spear' | 'rune' | 'comet' | 'rainbow' | 'stone',
  isSide: boolean,
  isUp: boolean,
) {
  if (atkF === 0) return
  const reachX = isSide ? cx + 34 : cx
  const reachY = isUp ? cy - 30 : cy + (isSide ? -4 : 18)
  const alpha = atkF === 1 ? 0.65 : atkF === 2 ? 0.95 : 0.4
  ctx.save()
  ctx.globalAlpha = alpha

  if (kind === 'claw') {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3.2
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath()
      ctx.arc(reachX + i * 5, reachY, 15, -0.8, 0.9)
      ctx.stroke()
    }
    ctx.strokeStyle = accent
    ctx.lineWidth = 2
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath()
      ctx.arc(reachX + i * 5, reachY, 16.5, -0.7, 0.8)
      ctx.stroke()
    }
  } else if (kind === 'fire' || kind === 'comet') {
    const burst = atkF === 2 ? 17 : 11
    const fg = ctx.createRadialGradient(reachX, reachY, 2, reachX, reachY, burst)
    fg.addColorStop(0, '#ffffff')
    fg.addColorStop(0.45, accent)
    fg.addColorStop(1, primary)
    ctx.fillStyle = fg
    ctx.beginPath()
    ctx.arc(reachX, reachY, burst, 0, Math.PI * 2)
    ctx.fill()
    for (let i = 0; i < 4; i++) {
      const a = i * (Math.PI / 2) + atkF * 0.5
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.arc(reachX + Math.cos(a) * (burst + 4), reachY + Math.sin(a) * (burst + 4), 2.6, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (kind === 'water' || kind === 'ice') {
    ctx.strokeStyle = accent
    ctx.fillStyle = '#ffffff'
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.arc(reachX, reachY, atkF === 2 ? 16 : 10, 0, Math.PI * 2)
    ctx.stroke()
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + atkF * 0.4
      const sx = reachX + Math.cos(a) * 18
      const sy = reachY + Math.sin(a) * 18
      ctx.beginPath()
      ctx.moveTo(sx, sy - 4)
      ctx.lineTo(sx + 3.5, sy)
      ctx.lineTo(sx, sy + 4)
      ctx.lineTo(sx - 3.5, sy)
      ctx.closePath()
      ctx.fill()
    }
  } else if (kind === 'holy' || kind === 'rainbow') {
    ctx.strokeStyle = kind === 'rainbow' ? '#f472b6' : accent
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(reachX, reachY, atkF === 2 ? 18 : 11, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(reachX - 16, reachY)
    ctx.lineTo(reachX + 16, reachY)
    ctx.moveTo(reachX, reachY - 16)
    ctx.lineTo(reachX, reachY + 16)
    ctx.stroke()
  } else if (kind === 'spear') {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(reachX - 12, reachY + 2)
    ctx.lineTo(reachX + 22, reachY - 4)
    ctx.stroke()
    ctx.strokeStyle = accent
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(reachX - 8, reachY - 4)
    ctx.lineTo(reachX + 24, reachY - 6)
    ctx.stroke()
  } else {
    // rune / stone shockwave
    ctx.strokeStyle = accent
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(reachX, reachY + 4, atkF === 2 ? 22 : 14, atkF === 2 ? 9 : 6, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

export function renderHdPetSprite(
  spec: PetModelSpec,
  dir: Dir,
  action: SpriteAction,
  f: number,
): HTMLCanvasElement {
  const hdScale = 4
  const W = 34 * hdScale
  const H = 34 * hdScale
  const { c, ctx } = makeSmoothCanvas(W, H, hdScale)

  const cx = W / 2
  const footY = H - 18
  const isSide = dir === 'left' || dir === 'right'
  const isUp = dir === 'up'
  const isAtk = action === 'attack'
  const isWalk = action === 'walk'
  const atkF = isAtk ? f % 4 : 0
  const walkPhase = (f % 6) / 6

  // Shared motion kinematics for walk & attack
  const idleFloat = Math.sin((f / 4) * Math.PI * 2) * (spec.floating ? 4.5 : 2)
  const walkHop = isWalk ? -Math.abs(Math.sin(walkPhase * Math.PI * 2)) * (spec.floating ? 6 : 8) : 0
  const atkLungeX = isAtk ? (atkF === 0 ? -4 : atkF === 1 ? 10 : atkF === 2 ? 12 : 3) : 0
  const atkLungeY = isAtk ? (atkF === 0 ? 4 : atkF === 1 ? -7 : atkF === 2 ? -5 : 0) : 0
  const stride = isWalk ? Math.sin(walkPhase * Math.PI * 2) * 8 : isAtk && atkF === 2 ? 7 : 0
  const wingFlap = isWalk
    ? Math.sin(walkPhase * Math.PI * 2) * 13
    : isAtk
      ? [14, -14, -18, 4][atkF]
      : Math.sin((f / 4) * Math.PI * 2) * 5
  const tailWag = isWalk ? Math.sin(walkPhase * Math.PI * 2) * 7 : Math.sin((f / 4) * Math.PI * 2) * 4

  const c1 = spec.colors.primary
  const c2 = spec.colors.secondary
  const acc = spec.colors.accent
  const hi = shadeCol(c1, 0.34)
  const dark = shadeCol(c1, -0.28)
  const angry = isAtk && (atkF === 1 || atkF === 2)

  ctx.save()
  if (dir === 'left') {
    ctx.translate(W, 0)
    ctx.scale(-1, 1)
  }

  // Draw Phao spirit vessel ring underneath any phao_* creature
  if (spec.category === 'phao') {
    drawPhaoSpiritBase(ctx, cx, footY + 2, acc, action, f)
  }

  // Apply lunge offset in sprite space
  const drawCx = cx + (isSide ? atkLungeX : 0)
  const drawBaseY = footY + (spec.floating ? -12 : 0) + idleFloat + walkHop + (isUp ? -atkLungeX * 0.7 : atkLungeY)

  ctx.strokeStyle = HD_INK
  ctx.lineWidth = 2.4

  const arch = spec.archetype

  // 1) Classic Traditional Ornate Phao Vessels (lid opens on attack!)
  if (
    arch === 'phao_lotus' ||
    arch === 'phao_gold_naga' ||
    arch === 'phao_celestial' ||
    arch === 'phao_phantom'
  ) {
    const lidLift = isAtk ? [2, 12, 16, 6][atkF] : isWalk ? 2 : 0
    const cy = drawBaseY - 28
    // Pedestal base
    ctx.fillStyle = shadeCol(c2, -0.15)
    ctx.beginPath()
    ctx.ellipse(drawCx, cy + 20, 17, 6, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Glowing aura core escaping when lid lifts
    if (lidLift > 4) {
      const og = ctx.createRadialGradient(drawCx, cy - 6, 2, drawCx, cy - 6, 20)
      og.addColorStop(0, '#ffffff')
      og.addColorStop(0.55, acc)
      og.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = og
      ctx.beginPath()
      ctx.arc(drawCx, cy - 6, 19, 0, Math.PI * 2)
      ctx.fill()
    }

    // Main vessel belly
    ctx.fillStyle = gradVert(ctx, drawCx, cy - 12, cy + 19, hi, c2)
    ctx.beginPath()
    ctx.ellipse(drawCx, cy + 4, 22, 16, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Ornate belt ring
    ctx.strokeStyle = acc
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.ellipse(drawCx, cy + 4, 21, 5, 0, 0, Math.PI)
    ctx.stroke()
    ctx.strokeStyle = HD_INK

    // Lid + Spire (lifts when attacking)
    ctx.fillStyle = gradVert(ctx, drawCx, cy - 32 - lidLift, cy - 8 - lidLift, acc, c1)
    ctx.beginPath()
    ctx.moveTo(drawCx - 16, cy - 8 - lidLift)
    ctx.quadraticCurveTo(drawCx - 6, cy - 22 - lidLift, drawCx, cy - 34 - lidLift)
    ctx.quadraticCurveTo(drawCx + 6, cy - 22 - lidLift, drawCx + 16, cy - 8 - lidLift)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Orbiting planets / spirit flames
    for (let i = 0; i < 2; i++) {
      const oa = (f / 4) * Math.PI * 2 + i * Math.PI
      const ox = drawCx + Math.cos(oa) * 28
      const oy = cy + Math.sin(oa) * 8
      ctx.fillStyle = acc
      ctx.beginPath()
      ctx.arc(ox, oy, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
    return c
  }

  // 2) Slime variants (Water Slime / Buddy Slime)
  if (arch === 'phao_water_slime' || arch === 'buddy_slime') {
    const sq = isWalk ? Math.sin(walkPhase * Math.PI * 2) * 0.14 : isAtk && atkF === 0 ? -0.18 : 0
    const rx = 25 * (1 - sq)
    const ry = 21 * (1 + sq)
    const cy = drawBaseY - ry + 2

    ctx.fillStyle = gradVert(ctx, drawCx, cy - ry - 8, cy + ry, acc, c2)
    ctx.beginPath()
    ctx.moveTo(drawCx, cy - ry - 8)
    ctx.bezierCurveTo(drawCx + rx * 0.85, cy - ry * 0.5, drawCx + rx, cy + ry * 0.7, drawCx, cy + ry)
    ctx.bezierCurveTo(drawCx - rx, cy + ry * 0.7, drawCx - rx * 0.85, cy - ry * 0.5, drawCx, cy - ry - 8)
    ctx.fill()
    ctx.stroke()

    // Glossy water highlight + floating droplet bubbles
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.75
    ctx.beginPath()
    ctx.ellipse(drawCx - 8, cy - 6, 5, 3, -0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(drawCx + 14, cy - ry - 6 - (f % 3) * 2, 3.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    if (!isUp) {
      const exOff = isSide ? 7 : 0
      drawAnimeEye(ctx, drawCx - 7 + exOff, cy + 2, 3.5, 4.4, '#0f172a', false, angry)
      if (!isSide) drawAnimeEye(ctx, drawCx + 7, cy + 2, 3.5, 4.4, '#0f172a', false, angry)
      ctx.strokeStyle = HD_INK
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(drawCx + exOff, cy + 7, 3.5, 0.1, Math.PI - 0.1)
      ctx.stroke()
    }
    if (isAtk) drawPetAttackVfx(ctx, drawCx, cy, atkF, acc, c1, 'water', isSide, isUp)
    ctx.restore()
    return c
  }

  // 3) Sapphire Wisp (Luminous floating comet flame)
  if (arch === 'phao_sapphire_wisp' || arch === 'moonlight_firefly') {
    const cy = drawBaseY - 26
    // Swirling flame aura
    const fg = ctx.createRadialGradient(drawCx, cy, 4, drawCx, cy, 32)
    fg.addColorStop(0, '#ffffff')
    fg.addColorStop(0.45, c1)
    fg.addColorStop(1, 'rgba(29,78,216,0)')
    ctx.fillStyle = fg
    ctx.beginPath()
    ctx.arc(drawCx, cy, 32, 0, Math.PI * 2)
    ctx.fill()

    // Flame wisps trailing
    ctx.fillStyle = gradVert(ctx, drawCx, cy - 32, cy + 16, acc, c2)
    ctx.beginPath()
    ctx.moveTo(drawCx, cy - 32 - (f % 2) * 3)
    ctx.quadraticCurveTo(drawCx + 22, cy - 8, drawCx + 15, cy + 14)
    ctx.quadraticCurveTo(drawCx, cy + 22, drawCx - 15, cy + 14)
    ctx.quadraticCurveTo(drawCx - 22, cy - 8, drawCx, cy - 32 - (f % 2) * 3)
    ctx.fill()
    ctx.stroke()

    if (arch === 'moonlight_firefly') {
      drawPetWings(ctx, drawCx, cy, 24, acc, '#ffffff', wingFlap, true, isSide, isUp)
    }

    if (!isUp) {
      const exOff = isSide ? 6 : 0
      drawAnimeEye(ctx, drawCx - 6 + exOff, cy + 2, 3.5, 4.4, '#1e3a8a', false, angry)
      if (!isSide) drawAnimeEye(ctx, drawCx + 6, cy + 2, 3.5, 4.4, '#1e3a8a', false, angry)
    }
    if (isAtk) drawPetAttackVfx(ctx, drawCx, cy, atkF, acc, c1, 'comet', isSide, isUp)
    ctx.restore()
    return c
  }

  // 4) Bird / Avians (Chick Rooster, Sky Eagle, Frost Penguin, Solar Phoenix, Crystal Owl, Celestial Owl)
  if (
    arch === 'phao_dawn_rooster' ||
    arch === 'phao_sky_eagle' ||
    arch === 'phao_frost_penguin' ||
    arch === 'phao_solar_phoenix' ||
    arch === 'phao_celestial_owl' ||
    arch === 'crystal_owl'
  ) {
    const isPenguin = arch === 'phao_frost_penguin'
    const isChicken = arch === 'phao_dawn_rooster'
    const isPhoenix = arch === 'phao_solar_phoenix'
    const isOwl = arch === 'phao_celestial_owl' || arch === 'crystal_owl'
    const isEagle = arch === 'phao_sky_eagle'
    const cy = drawBaseY - 24

    // Tail feathers behind
    ctx.fillStyle = isPhoenix ? acc : c2
    ctx.beginPath()
    ctx.ellipse(isSide ? drawCx - 18 : drawCx, cy + 10, isPhoenix ? 14 : 9, 6, -0.35 + tailWag * 0.03, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Wings
    if (!isPenguin) {
      drawPetWings(
        ctx,
        drawCx,
        cy - 2,
        isPhoenix || isOwl || isEagle ? 30 : 20,
        isEagle ? '#f8fafc' : c1,
        isPhoenix ? '#dc2626' : acc,
        wingFlap,
        true,
        isSide,
        isUp,
      )
    }

    // Bird feet
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 3
    for (const [fx, st] of [
      [drawCx - 6, stride],
      [drawCx + 6, -stride],
    ] as const) {
      ctx.beginPath()
      ctx.moveTo(fx, cy + 14)
      ctx.lineTo(fx + st * 0.45, drawBaseY + 2)
      ctx.stroke()
    }
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.4

    // Torso & Head
    ctx.fillStyle = gradVert(ctx, drawCx, cy - 22, cy + 18, hi, c2)
    ctx.beginPath()
    ctx.ellipse(drawCx, cy + 2, 18, 17, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // White belly for Penguin / Eagle chest
    if (isPenguin || isEagle || isOwl) {
      ctx.fillStyle = '#f8fafc'
      ctx.beginPath()
      ctx.ellipse(drawCx + (isSide ? 5 : 0), cy + 5, 11, 11, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // Head
    const hx = drawCx + (isSide ? 6 : 0)
    const hy = cy - 12
    ctx.fillStyle = isEagle || isOwl ? '#f8fafc' : hi
    ctx.beginPath()
    ctx.arc(hx, hy, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Penguin winter scarf OR Phoenix / Rooster crest
    if (isPenguin) {
      ctx.fillStyle = acc
      ctx.beginPath()
      ctx.roundRect(drawCx - 14, cy - 4, 28, 7, 3)
      ctx.fill()
      ctx.stroke()
    } else if (isChicken) {
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(hx - 2, hy - 15, 4.5, 0, Math.PI * 2)
      ctx.arc(hx + 3, hy - 14, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else if (isPhoenix || isOwl) {
      ctx.fillStyle = acc
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(hx + sx * 4, hy - 10)
        ctx.lineTo(hx + sx * 13, hy - 22)
        ctx.lineTo(hx + sx * 10, hy - 6)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    }

    // Penguin flippers
    if (isPenguin) {
      ctx.fillStyle = c2
      for (const sx of isSide ? [-1] : [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(drawCx + sx * 18, cy + 2 + wingFlap * 0.3, 6, 11, sx * 0.3, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    }

    // Beak & Eyes
    if (!isUp) {
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      const bx = isSide ? hx + 12 : hx
      ctx.moveTo(bx - 4, hy + 1)
      ctx.lineTo(bx + (isSide ? 9 : 0), hy + 5)
      ctx.lineTo(bx + 4, hy + 1)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      drawAnimeEye(ctx, hx - (isSide ? -3 : 6), hy - 2, 3.4, 4.2, isPhoenix ? '#ef4444' : '#0f172a', false, angry)
      if (!isSide) drawAnimeEye(ctx, hx + 6, hy - 2, 3.4, 4.2, isPhoenix ? '#ef4444' : '#0f172a', false, angry)
    }

    if (isAtk) {
      drawPetAttackVfx(
        ctx,
        drawCx,
        cy,
        atkF,
        acc,
        c1,
        isPhoenix ? 'fire' : isPenguin ? 'ice' : isOwl ? 'holy' : 'claw',
        isSide,
        isUp,
      )
    }
    ctx.restore()
    return c
  }

  // 5) Stone Tortoise (armored crystal rock shell)
  if (arch === 'phao_stone_tortoise') {
    const cy = drawBaseY - 18
    // 4 sturdy legs
    ctx.fillStyle = shadeCol(c1, -0.15)
    for (const [lx, st] of [
      [drawCx - 16, stride],
      [drawCx + 14, -stride],
      [drawCx - 6, -stride * 0.7],
      [drawCx + 6, stride * 0.7],
    ] as const) {
      ctx.beginPath()
      ctx.roundRect(lx - 4 + st * 0.35, cy + 8, 8, 12, 3)
      ctx.fill()
      ctx.stroke()
    }
    // Rock Crystal Shell
    ctx.fillStyle = gradVert(ctx, drawCx, cy - 18, cy + 12, '#a8a29e', c2)
    ctx.beginPath()
    ctx.ellipse(drawCx - (isSide ? 4 : 0), cy, 24, 16, 0, Math.PI, Math.PI * 2)
    ctx.lineTo(drawCx + 24 - (isSide ? 4 : 0), cy + 7)
    ctx.lineTo(drawCx - 24 - (isSide ? 4 : 0), cy + 7)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Cyan gemstone ridges on shell
    ctx.fillStyle = acc
    for (const sx of [-10, 0, 10]) {
      ctx.beginPath()
      ctx.moveTo(drawCx + sx, cy - 17)
      ctx.lineTo(drawCx + sx + 4, cy - 10)
      ctx.lineTo(drawCx + sx - 4, cy - 10)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }

    // Turtle head
    if (!isUp) {
      const hx = isSide ? drawCx + 22 : drawCx
      const hy = isSide ? cy + 2 : cy + 6
      ctx.fillStyle = hi
      ctx.beginPath()
      ctx.arc(hx, hy, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      drawAnimeEye(ctx, hx + (isSide ? 3 : -4), hy - 2, 3, 3.6, '#14532d', false, angry)
      if (!isSide) drawAnimeEye(ctx, hx + 4, hy - 2, 3, 3.6, '#14532d', false, angry)
    }
    if (isAtk) drawPetAttackVfx(ctx, drawCx, cy, atkF, acc, c1, 'stone', isSide, isUp)
    ctx.restore()
    return c
  }

  // 6) Bipedal Warriors & Spirits (Spear Goblin, Acorn Squirrel, Rune Golem, Golden Seraph)
  if (
    arch === 'phao_spear_goblin' ||
    arch === 'phao_acorn_squirrel' ||
    arch === 'phao_rune_golem' ||
    arch === 'phao_golden_seraph' ||
    arch === 'gem_raccoon'
  ) {
    const isGoblin = arch === 'phao_spear_goblin'
    const isSquirrel = arch === 'phao_acorn_squirrel'
    const isRaccoon = arch === 'gem_raccoon'
    const isGolem = arch === 'phao_rune_golem'
    const isSeraph = arch === 'phao_golden_seraph'
    const cy = drawBaseY - 26

    if (isSeraph) {
      drawPetWings(ctx, drawCx, cy - 6, 30, '#ffffff', acc, wingFlap, true, isSide, isUp)
    }
    if (isSquirrel || isRaccoon) {
      // Big fluffy curled tail
      ctx.fillStyle = gradVert(ctx, drawCx - 16, cy - 18, cy + 12, hi, c2)
      ctx.beginPath()
      ctx.ellipse(drawCx - (isSide ? 18 : 14), cy - 4 + tailWag * 0.4, 12, 18, -0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }

    // Legs
    ctx.fillStyle = c2
    for (const [lx, st] of [
      [drawCx - 7, stride],
      [drawCx + 7, -stride],
    ] as const) {
      ctx.beginPath()
      ctx.roundRect(lx - 4 + st * 0.4, cy + 12, 8, 13, 3)
      ctx.fill()
      ctx.stroke()
    }

    // Torso
    ctx.fillStyle = isGolem ? '#e7e5e4' : isSeraph ? '#ffffff' : gradVert(ctx, drawCx, cy - 8, cy + 16, hi, c2)
    ctx.beginPath()
    ctx.roundRect(drawCx - (isGolem ? 17 : 12), cy - 6, isGolem ? 34 : 24, 21, 7)
    ctx.fill()
    ctx.stroke()

    if (isGolem) {
      // Golden chest plate & glowing cyan rune core
      ctx.fillStyle = c2
      ctx.beginPath()
      ctx.roundRect(drawCx - 12, cy - 3, 24, 9, 4)
      ctx.fill()
      ctx.fillStyle = acc
      ctx.beginPath()
      ctx.arc(drawCx, cy + 2, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }

    // Head
    const hx = drawCx + (isSide ? 2 : 0)
    const hy = cy - 18
    ctx.fillStyle = isSeraph ? '#ffe6d5' : isGolem ? '#e7e5e4' : hi
    ctx.beginPath()
    ctx.arc(hx, hy, isGolem ? 11 : 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Ears / Hair / Halo
    if (isGoblin) {
      ctx.fillStyle = c1
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(hx + sx * 10, hy - 2)
        ctx.lineTo(hx + sx * 24, hy - 10)
        ctx.lineTo(hx + sx * 11, hy + 5)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    } else if (isSquirrel || isRaccoon) {
      ctx.fillStyle = c1
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(hx + sx * 9, hy - 13, 4.5, 7, sx * 0.25, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    } else if (isSeraph) {
      // Golden Hair + Floating Halo
      ctx.fillStyle = '#fef3c7'
      ctx.beginPath()
      ctx.arc(hx, hy - 4, 15, Math.PI, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(hx, hy - 22, 12, 4, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = HD_INK
      ctx.lineWidth = 2.4
    }

    // Held props: Goblin Spear / Squirrel Acorn / Seraph Holy Staff
    if (isGoblin) {
      const spearBoost = isAtk ? [ -6, 12, 18, 4 ][atkF] : 0
      ctx.save()
      ctx.translate(drawCx + 14 + spearBoost * 0.6, cy + 2)
      ctx.rotate(isSide ? 0.15 : -0.35)
      ctx.strokeStyle = '#78350f'
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.moveTo(0, 16)
      ctx.lineTo(0, -28)
      ctx.stroke()
      ctx.fillStyle = acc
      ctx.beginPath()
      ctx.moveTo(0, -37)
      ctx.lineTo(5, -26)
      ctx.lineTo(-5, -26)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    } else if (isSquirrel) {
      ctx.fillStyle = '#92400e'
      ctx.beginPath()
      ctx.ellipse(drawCx + 11, cy + 4, 5.5, 7, 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }

    if (!isUp) {
      const exOff = isSide ? 4 : 0
      drawAnimeEye(
        ctx,
        hx - 5 + exOff,
        hy + 1,
        3.2,
        4.1,
        isGolem ? '#38bdf8' : isSeraph ? '#f59e0b' : '#1e1b4b',
        false,
        angry,
      )
      if (!isSide) {
        drawAnimeEye(ctx, hx + 5, hy + 1, 3.2, 4.1, isGolem ? '#38bdf8' : isSeraph ? '#f59e0b' : '#1e1b4b', false, angry)
      }
    }

    if (isAtk) {
      drawPetAttackVfx(
        ctx,
        drawCx,
        cy,
        atkF,
        acc,
        c1,
        isGoblin ? 'spear' : isGolem ? 'rune' : isSeraph ? 'holy' : 'stone',
        isSide,
        isUp,
      )
    }
    ctx.restore()
    return c
  }

  // 7) Quadruped Beasts, Dragons, Foxes, Cats, Wolves, Unicorn, Stag, Lion & Hound
  const isDragon =
    arch === 'phao_crimson_dragon' ||
    arch === 'phao_obsidian_dragon' ||
    arch === 'phao_astral_dragon' ||
    arch === 'aurora_cloud_dragon'
  const isFox = arch === 'phao_ember_ninetail' || arch === 'phao_sacred_kitsune' || arch === 'flame_fox'
  const isBunny = arch === 'phao_ribbon_bunny'
  const isUnicorn = arch === 'phao_prism_unicorn'
  const isStag = arch === 'phao_frost_stag'
  const isCat = arch === 'phao_husky_kitten' || arch === 'phao_abyss_neko' || arch === 'phao_seraph_cat'
  const isSeraphCat = arch === 'phao_seraph_cat'
  const isLion = arch === 'phao_armored_lion'
  const isWingedWolf = arch === 'phao_glacial_wolf' || arch === 'phao_violet_hound'
  const hasWings = isDragon || isUnicorn || isSeraphCat || isLion || isWingedWolf

  const cy = drawBaseY - 22

  // Flowing Tails (Nine-tails / Fluffy Tail / Dragon Tail)
  if (isFox) {
    const fanCount = arch === 'flame_fox' ? 3 : 5
    for (let t = 0; t < fanCount; t++) {
      const ang = -0.9 + (t / (fanCount - 1)) * 1.1 + tailWag * 0.03
      ctx.save()
      ctx.translate(drawCx - (isSide ? 16 : 0), cy + 6)
      ctx.rotate(ang)
      ctx.fillStyle = gradVert(ctx, 0, -24, 0, acc, c1)
      ctx.beginPath()
      ctx.ellipse(-6, -15, 6, 15, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
  } else {
    ctx.fillStyle = isUnicorn ? '#c084fc' : c2
    ctx.beginPath()
    if (isBunny) {
      ctx.arc(drawCx - (isSide ? 16 : 0), cy + 8, 6, 0, Math.PI * 2)
    } else if (isDragon) {
      ctx.moveTo(drawCx - (isSide ? 12 : 0), cy + 8)
      ctx.quadraticCurveTo(drawCx - 28, cy + 4 + tailWag, drawCx - 30, cy - 8 + tailWag)
      ctx.lineTo(drawCx - 24, cy + 12)
    } else {
      ctx.ellipse(drawCx - (isSide ? 18 : 10), cy + 2 + tailWag * 0.5, 6, 12, -0.65, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.stroke()
  }

  // Wings (for Dragons, Unicorn, Seraph Cat, Glacial Wolf, Violet Hound, Armored Lion)
  if (hasWings) {
    drawPetWings(
      ctx,
      drawCx,
      cy - 4,
      isDragon || isSeraphCat ? 31 : 25,
      isUnicorn ? '#ffffff' : isLion ? '#fef08a' : c2,
      acc,
      wingFlap,
      !isDragon && arch !== 'phao_violet_hound',
      isSide,
      isUp,
    )
  }

  // 4 Animated Paws / Hooves
  ctx.fillStyle = dark
  const pawPositions: Array<[number, number]> = isSide
    ? [
        [drawCx - 12, -stride],
        [drawCx + 12, stride],
      ]
    : [
        [drawCx - 11, stride],
        [drawCx + 11, -stride],
      ]
  for (const [lx, st] of pawPositions) {
    ctx.beginPath()
    ctx.roundRect(lx - 4 + st * 0.45, cy + 9, 8, 14, 3)
    ctx.fill()
    ctx.stroke()
  }

  // Body Torso
  ctx.fillStyle = gradVert(ctx, drawCx, cy - 10, cy + 16, hi, c1)
  ctx.beginPath()
  ctx.ellipse(drawCx, cy + 3, isSide ? 20 : 16, 13, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Fluffy chest mane / Collar / Scarf / Bow / Gold armor
  if (arch === 'phao_husky_kitten' || arch === 'phao_shiba_scarf' || arch === 'phao_ribbon_bunny' || isLion) {
    ctx.fillStyle = isLion ? '#fde047' : acc
    ctx.beginPath()
    ctx.roundRect(drawCx + (isSide ? 3 : -11), cy - 6, isSide ? 14 : 22, 6, 3)
    ctx.fill()
    ctx.stroke()
  }

  // Head
  const hx = drawCx + (isSide ? 12 : 0)
  const hy = cy - 13
  ctx.fillStyle = gradVert(ctx, hx, hy - 14, hy + 14, hi, c1)
  ctx.beginPath()
  ctx.ellipse(hx, hy, 15, 13, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Ears / Horns / Antlers / Halo
  if (isStag) {
    ctx.strokeStyle = acc
    ctx.lineWidth = 3
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(hx + sx * 5, hy - 10)
      ctx.lineTo(hx + sx * 13, hy - 26)
      ctx.moveTo(hx + sx * 9, hy - 18)
      ctx.lineTo(hx + sx * 17, hy - 21)
      ctx.stroke()
    }
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.4
  } else if (isUnicorn) {
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.moveTo(hx - 2, hy - 10)
    ctx.lineTo(hx + (isSide ? 6 : 0), hy - 25)
    ctx.lineTo(hx + 3, hy - 10)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  } else if (isBunny) {
    ctx.fillStyle = hi
    for (const sx of isSide ? [-0.3, 0.5] : [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(hx + sx * 7, hy - 19, 4.5, 11, sx * 0.12, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  } else if (isDragon) {
    ctx.fillStyle = acc
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(hx + sx * 5, hy - 10)
      ctx.lineTo(hx + sx * 13, hy - 23)
      ctx.lineTo(hx + sx * 11, hy - 7)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  } else {
    // Pointed Ears (Cats, Dogs, Wolves, Foxes, Lion, Hound)
    ctx.fillStyle = c2
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(hx + sx * 4, hy - 9)
      ctx.lineTo(hx + sx * 12, hy - 22)
      ctx.lineTo(hx + sx * 13, hy - 6)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  }

  if (isSeraphCat) {
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2.8
    ctx.beginPath()
    ctx.ellipse(hx, hy - 22, 11, 3.8, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.4
  }

  // Abyss Neko / Violet Hound flame wisp accent
  if (arch === 'phao_abyss_neko' || arch === 'phao_violet_hound' || arch === 'phao_ember_ninetail') {
    ctx.fillStyle = acc
    ctx.globalAlpha = 0.65
    for (let i = 0; i < 3; i++) {
      const a = (f / 4) * Math.PI * 2 + i * 2.1
      ctx.beginPath()
      ctx.arc(drawCx + Math.cos(a) * 24, cy - 6 + Math.sin(a) * 14, 3.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // Expressive anime eyes (hidden when facing away)
  if (!isUp) {
    const eyeIris =
      arch === 'phao_obsidian_dragon' || arch === 'phao_violet_hound'
        ? '#f43f5e'
        : arch === 'phao_abyss_neko' || arch === 'phao_crimson_dragon'
          ? '#fbbf24'
          : arch === 'phao_astral_dragon' || arch === 'phao_glacial_wolf' || arch === 'phao_frost_stag'
            ? '#38bdf8'
            : '#1e1b4b'
    const exOff = isSide ? 4 : 0
    drawAnimeEye(ctx, hx - 5 + exOff, hy + 1, 3.3, 4.1, eyeIris, false, angry)
    if (!isSide) drawAnimeEye(ctx, hx + 5, hy + 1, 3.3, 4.1, eyeIris, false, angry)
    if (isCat) {
      ctx.strokeStyle = HD_INK
      ctx.lineWidth = 1.6
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(hx + sx * 9 + exOff, hy + 4)
        ctx.lineTo(hx + sx * 16 + exOff, hy + 2)
        ctx.moveTo(hx + sx * 9 + exOff, hy + 7)
        ctx.lineTo(hx + sx * 16 + exOff, hy + 8)
        ctx.stroke()
      }
    }
  }

  // Attack VFX
  if (isAtk) {
    const vfxKind = isDragon
      ? arch === 'phao_astral_dragon'
        ? 'comet'
        : 'fire'
      : isUnicorn
        ? 'rainbow'
        : isStag || arch === 'phao_glacial_wolf'
          ? 'ice'
          : isSeraphCat
            ? 'holy'
            : isFox
              ? arch === 'phao_sacred_kitsune'
                ? 'holy'
                : 'fire'
              : 'claw'
    drawPetAttackVfx(ctx, drawCx, cy, atkF, acc, c1, vfxKind, isSide, isUp)
  }

  ctx.restore()
  return c
}

export function drawMountLevelAndSkinFx(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  spec: MountModelSpec,
  dir: Dir,
  action: SpriteAction,
  f: number,
  level = 1,
  mountSkinId?: string | null,
): void {
  const tier = getMountVisualTier(level)
  const cx = W / 2
  const footY = H - Math.round(H * MOUNT_FOOT_PAD_FRAC)
  const isSide = dir === 'left' || dir === 'right'
  const isRun = action === 'run' || action === 'attack' || action === 'skill'
  const isWalk = action === 'walk'
  const phase = f / (isRun || isWalk ? 6 : 4)
  const bobY =
    isRun
      ? Math.round(Math.sin(phase * Math.PI * 2) * 5 - 3)
      : isWalk
        ? Math.round(Math.sin(phase * Math.PI * 2) * 3)
        : Math.round(Math.sin(phase * Math.PI * 2) * 1.5)
  const backY = footY - 56 + bobY

  const skinTint =
    mountSkinId === 'mount_skin_astral'
      ? { primary: '#818cf8', accent: '#67e8f9', glow: 'rgba(129, 140, 248, 0.36)' }
      : mountSkinId === 'mount_skin_inferno'
        ? { primary: '#fb7185', accent: '#fbbf24', glow: 'rgba(249, 115, 22, 0.36)' }
        : mountSkinId === 'mount_skin_diamond_royal'
          ? { primary: '#67e8f9', accent: '#fef08a', glow: 'rgba(103, 232, 249, 0.42)' }
          : null

  const tierAccent =
    skinTint?.accent ??
    (tier >= 5
      ? '#fef08a'
      : tier === 4
        ? spec.auraColor ?? spec.colors.accent
        : tier === 3
          ? '#fbbf24'
          : tier === 2
            ? '#e2e8f0'
            : spec.colors.accent)

  const tierPrimary = skinTint?.primary ?? spec.auraColor ?? spec.colors.accent

  if (tier <= 1 && !skinTint) {
    // Tier 1 (Lv.1-2): clean motion speed lines only when sprinting
    if (isRun) {
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.42)'
      ctx.lineWidth = 2
      const dirSign = dir === 'left' ? 1 : dir === 'right' ? -1 : 0
      if (dirSign !== 0) {
        for (let i = 0; i < 2; i++) {
          const ly = backY + 12 + i * 16
          ctx.beginPath()
          ctx.moveTo(cx + dirSign * 42, ly)
          ctx.lineTo(cx + dirSign * 72, ly)
          ctx.stroke()
        }
      }
      ctx.restore()
    }
    return
  }

  ctx.save()

  // Optional skin ethereal wash / crest shimmer
  if (skinTint) {
    const washGrad = ctx.createRadialGradient(cx, backY + 10, 6, cx, backY + 10, 58)
    washGrad.addColorStop(0, skinTint.glow)
    washGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = washGrad
    ctx.beginPath()
    ctx.ellipse(cx, backY + 10, 60, 44, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Tier 2+ (Lv.3+): Silver / Gilded barding chestplate & saddle trim
  if (tier >= 2) {
    const armorCol = tier >= 3 ? '#f59e0b' : '#cbd5e1'
    const armorHi = tier >= 3 ? '#fef08a' : '#f8fafc'
    const chestX = dir === 'right' ? cx + 32 : dir === 'left' ? cx - 32 : cx
    const chestY = backY + 16
    if (dir !== 'up') {
      ctx.fillStyle = armorCol
      ctx.strokeStyle = HD_INK
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(chestX, chestY - 7)
      ctx.lineTo(chestX + 10, chestY)
      ctx.lineTo(chestX, chestY + 9)
      ctx.lineTo(chestX - 10, chestY)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = armorHi
      ctx.beginPath()
      ctx.arc(chestX, chestY, 3.2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Polished saddle blanket trim & stirrup jewel
    const saddleX = dir === 'right' ? cx - 4 : dir === 'left' ? cx + 4 : cx
    ctx.fillStyle = tierAccent
    ctx.fillRect(saddleX - (isSide ? 14 : 11), backY - 2, isSide ? 28 : 22, 3)
  }

  // Tier 3+ (Lv.5+): Golden crest & radiant ground rune ring
  if (tier >= 3) {
    ctx.strokeStyle = tier >= 4 ? tierPrimary : '#fbbf24'
    ctx.lineWidth = tier >= 4 ? 2.6 : 2
    ctx.globalAlpha = 0.58 + Math.sin(phase * Math.PI * 2) * 0.16
    ctx.beginPath()
    ctx.ellipse(cx, footY - 2, 46, 12, 0, 0, Math.PI * 2)
    ctx.stroke()

    if (tier >= 4) {
      // Arcane outer ring + flank starlight runes
      ctx.globalAlpha = 0.34
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.ellipse(cx, footY - 2, 56, 15, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // Tier 4+ (Lv.7+): Wing/flank glowing motes & dash trail
  if (tier >= 4) {
    const moteCount = tier >= 5 ? 5 : 3
    for (let i = 0; i < moteCount; i++) {
      const ang = phase * Math.PI * 2 + (i * Math.PI * 2) / moteCount
      const mx = cx + Math.cos(ang) * (isSide ? 48 : 42)
      const my = backY + 4 + Math.sin(ang * 1.5) * 14
      ctx.fillStyle = i % 2 === 0 ? tierAccent : tierPrimary
      ctx.beginPath()
      ctx.arc(mx, my, tier >= 5 ? 3.4 : 2.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Tier 5 (Lv.9-10): Sovereign Halo Crown floating over mount
  if (tier >= 5 || skinTint) {
    const crownY = backY - 38 + Math.round(Math.sin(phase * Math.PI * 2) * 2)
    ctx.strokeStyle = tierAccent
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.ellipse(cx, crownY, 22, 6, 0, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    for (const dx of [-18, 0, 18]) {
      ctx.beginPath()
      ctx.arc(cx + dx, crownY + (dx === 0 ? -4 : 0), 2.8, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  if (isRun) {
    ctx.strokeStyle = tierAccent
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 2.5
    const dirSign = dir === 'left' ? 1 : dir === 'right' ? -1 : 0
    if (dirSign !== 0) {
      for (let i = 0; i < 3; i++) {
        const ly = backY + 4 + i * 14
        ctx.beginPath()
        ctx.moveTo(cx + dirSign * 44, ly)
        ctx.lineTo(cx + dirSign * 80, ly)
        ctx.stroke()
      }
    }
  }

  ctx.restore()
}

export function renderHdMountSprite(
  spec: MountModelSpec,
  dir: Dir,
  action: SpriteAction,
  f: number,
  level = 1,
  mountSkinId?: string | null,
): HTMLCanvasElement {
  const hdScale = 4
  const W = 56 * hdScale
  const H = 48 * hdScale
  const { c, ctx } = makeSmoothCanvas(W, H, hdScale)
  c.dataset.footPadFrac = String(MOUNT_FOOT_PAD_FRAC)
  const cx = W / 2
  const footY = H - Math.round(H * MOUNT_FOOT_PAD_FRAC)
  const isRun = action === 'run' || action === 'attack' || action === 'skill'
  const isWalk = action === 'walk'
  const isMountPose = action === 'mount' || action === 'dismount'
  const mod = isRun || isWalk ? 6 : 4
  const bob = isRun
    ? Math.sin((f / mod) * Math.PI * 2) * 6 - 3
    : isWalk
      ? Math.sin((f / mod) * Math.PI * 2) * 4
      : isMountPose
        ? 4
        : Math.sin((f / mod) * Math.PI * 2) * 2
  const c1 = spec.colors.primary
  const hi = shadeCol(c1, 0.32)
  const dark = shadeCol(spec.colors.secondary, -0.25)

  ctx.save()
  if (dir === 'left') {
    ctx.translate(W, 0)
    ctx.scale(-1, 1)
  }
  ctx.strokeStyle = HD_INK
  ctx.lineWidth = 3

  if (spec.flying) {
    const flap = isRun ? Math.sin((f / 6) * Math.PI * 2) * 8 : isWalk ? Math.sin((f / 6) * Math.PI * 2) * 5 : Math.sin((f / 4) * Math.PI * 2) * 3
    ctx.fillStyle = spec.colors.accent
    if (dir === 'right' || dir === 'left') {
      ctx.beginPath()
      ctx.moveTo(cx - 10, footY - 56 + bob)
      ctx.lineTo(cx - 58, footY - 94 + bob + flap)
      ctx.lineTo(cx - 42, footY - 54 + bob + flap * 0.4)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else {
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(cx + sx * 38, footY - 62 + bob + flap * 0.4, 28, 12, sx * -0.45, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    }
  }

  // Legs
  const stride = isRun ? Math.sin((f / 6) * Math.PI * 2) * 20 : isWalk ? Math.sin((f / 6) * Math.PI * 2) * 14 : 0
  ctx.fillStyle = dark
  for (const [lx, st] of [
    [cx - 28, stride],
    [cx + 18, -stride],
  ] as const) {
    ctx.beginPath()
    ctx.roundRect(lx + st * 0.4, footY - 34 + bob, 11, 34, 4)
    ctx.fill()
    ctx.stroke()
  }

  // Body + Saddle
  const bodyG = ctx.createLinearGradient(cx, footY - 72 + bob, cx, footY - 24 + bob)
  bodyG.addColorStop(0, hi)
  bodyG.addColorStop(1, dark)
  ctx.fillStyle = bodyG
  ctx.beginPath()
  ctx.ellipse(cx, footY - 46 + bob, dir === 'down' || dir === 'up' ? 28 : 44, 22, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = spec.colors.saddle
  ctx.beginPath()
  ctx.roundRect(cx - 18, footY - 68 + bob, 36, 14, 5)
  ctx.fill()
  ctx.stroke()

  // Head + Horns/Ears
  const hx = dir === 'right' || dir === 'left' ? cx + 38 : cx
  const hy = footY - 68 + bob
  ctx.fillStyle = spec.archetype === 'griffin' ? '#f8fafc' : hi
  ctx.beginPath()
  ctx.ellipse(hx, hy, 18, 15, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  if (spec.archetype === 'kirin' || spec.archetype === 'cloud_dragon') {
    ctx.fillStyle = spec.colors.accent
    ctx.beginPath()
    ctx.moveTo(hx - 6, hy - 10)
    ctx.lineTo(hx - 14, hy - 32)
    ctx.lineTo(hx - 1, hy - 12)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  if (dir !== 'up') {
    drawAnimeEye(ctx, hx + (dir === 'down' ? 0 : 6), hy - 2, 4.0, 5.0, spec.colors.accent, false)
  }

  ctx.restore()

  drawMountLevelAndSkinFx(ctx, W, H, spec, dir, action, f, level, mountSkinId)
  return c
}
