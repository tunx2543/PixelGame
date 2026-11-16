import type { MonsterSprite, WeaponType } from './data'
import type { MountModelSpec, PetModelSpec, MonsterModelArchetype } from './models-2d'
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
  const gold = jobId === 'paladin' || jobId === 'gm' ? '#fde047' : '#e9c46a'

  if (weapon === 'sword') {
    const heavy = jobId === 'knight' || jobId === 'paladin'
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
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.2
    ctx.fillStyle = gradVert(ctx, 0, -3, 3, hi, dark)
    ctx.beginPath()
    ctx.roundRect(-10, -2.5, 42, 5, 2.5)
    ctx.fill()
    ctx.stroke()
    // Cute leaf sprout
    ctx.fillStyle = '#4ade80'
    ctx.beginPath()
    ctx.ellipse(29, -6, 5, 2.8, -0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (weapon === 'staff') {
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.2
    ctx.fillStyle = jobId === 'cleric' || jobId === 'gm' ? '#eab308' : '#784421'
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
          ctx.lineTo(cx - 8, headTopY - 12)
          ctx.lineTo(cx - 2, headTopY - 6)
          ctx.lineTo(cx + 5, headTopY - 13)
          ctx.lineTo(cx + 9, headTopY - 5)
        } else {
          ctx.quadraticCurveTo(cx, headTopY - 11, cx + headR * 0.55, headTopY - 5)
        }
        ctx.quadraticCurveTo(cx + headR + 5, headTopY - 2, cx + headR + 3, headTopY + headR * 0.9)
        // Forehead bangs
        ctx.lineTo(cx + headR * 0.65, headTopY + headR * 0.58)
        ctx.lineTo(cx + 5, headTopY + headR * 0.95)
        ctx.lineTo(cx, headTopY + headR * 0.52)
        ctx.lineTo(cx - 7, headTopY + headR * 0.95)
        ctx.lineTo(cx - headR * 0.65, headTopY + headR * 0.55)
        ctx.closePath()
      } else {
        // Side view facing right
        ctx.moveTo(cx - headR - 4, headTopY + headR * 1.15)
        ctx.quadraticCurveTo(cx - headR - 5, headTopY - 5, cx - 2, headTopY - 8)
        if (hairStyle === 'spiky') {
          ctx.lineTo(cx + 5, headTopY - 12)
          ctx.lineTo(cx + 8, headTopY - 5)
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

  if (style === 'bandana') {
    paintHairCrown(true)
    ctx.save()
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.4
    ctx.fillStyle = gradVert(ctx, cx, headTopY + 3, headTopY + 12, hatHi, hatDark)
    ctx.beginPath()
    ctx.roundRect(cx - headR - 1, headTopY + 3, headR * 2 + 2, 8, 4)
    ctx.fill()
    ctx.stroke()
    if (sideDir === 'side' || sideDir === 'up') {
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
  const action: SpriteAction = attacking ? 'attack' : actionOverride ?? (frame > 0 ? 'walk' : 'idle')
  const f =
    action === 'attack'
      ? Math.abs(attackFrameOverride ?? frame) % 4
      : action === 'walk'
        ? Math.abs(frame) % 6
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
  const boot = colors.armorStyle === 'plate' || colors.armorStyle === 'paladin_plate' ? '#64748b' : '#59331f'
  const bootDark = shadeCol(boot, -0.3)
  const blink = !attacking && f === -1

  // Walk/Idle/Attack kinematics
  let bob = 0
  let stepL = 0
  let stepR = 0
  let liftL = 0
  let liftR = 0
  let armSwing = 0
  let lunge = 0
  let wAngle = weapon === 'staff' ? -1.15 : weapon === 'bow' ? 0 : -0.45

  if (action === 'idle') {
    bob = f === 1 ? 2 : f === 3 ? -1 : 0
  } else if (action === 'walk') {
    const seq = [
      { bob: 0, sL: -9, sR: 9, lL: 0, lR: 3, arm: 10 },
      { bob: -4, sL: -3, sR: 3, lL: 6, lR: 0, arm: 4 },
      { bob: 0, sL: 9, sR: -9, lL: 3, lR: 0, arm: -10 },
      { bob: 0, sL: 9, sR: -9, lL: 0, lR: 3, arm: -10 },
      { bob: -4, sL: 3, sR: -3, lL: 0, lR: 6, arm: -4 },
      { bob: 0, sL: -9, sR: 9, lL: 3, lR: 0, arm: 10 },
    ][f % 6]
    bob = seq.bob
    stepL = seq.sL
    stepR = seq.sR
    liftL = seq.lL
    liftR = seq.lR
    armSwing = seq.arm
    wAngle += seq.arm * 0.03
  } else {
    // Attack / skill pose
    const atkAngles = [-1.45, 0.25, 0.95, 0.1]
    const atkLunge = [-3, 9, 12, 3]
    bob = f === 1 ? -4 : 1
    lunge = atkLunge[f % 4]
    wAngle = atkAngles[f % 4]
    armSwing = f === 0 ? -10 : 12
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

  // Cape behind body (visible down/side/up)
  if (colors.cape) {
    ctx.save()
    ctx.fillStyle = gradVert(ctx, cx, torsoTopY + 8, hipY + 20, colors.cape, shadeCol(colors.cape, -0.35))
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.6
    ctx.beginPath()
    const capeDx = sideDir === 'side' ? -18 : 0
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
    const fy = footY - lift - (sideDir !== 'side' ? Math.max(0, offsetX * 0.45) : 0)
    ctx.save()
    ctx.strokeStyle = HD_INK
    ctx.lineWidth = 2.6
    ctx.fillStyle = darkSide ? shadeCol(legs, -0.22) : legs
    ctx.beginPath()
    ctx.roundRect(fx - 7, hipY - 2, 14, fy - hipY - 4, 5)
    ctx.fill()
    ctx.stroke()
    // Cuffed Boot
    ctx.fillStyle = gradVert(ctx, fx, fy - 14, fy, boot, bootDark)
    ctx.beginPath()
    ctx.roundRect(fx - 9, fy - 14, sideDir === 'side' ? 21 : 18, 14, 5)
    ctx.fill()
    ctx.stroke()
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
    drawHdWeapon(ctx, cx + 22, torsoTopY + 22, weapon, weaponColor, wAngle - 0.7, action, f, colors.jobId)
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

  // Sash / Belt & Collar Detail matching Reference Hero!
  ctx.fillStyle = colors.scarf ?? colors.accent
  if (sideDir !== 'up') {
    // Crisp anime crossed sash or chest emblem
    ctx.beginPath()
    ctx.moveTo(cx - 16, torsoTopY + 6)
    ctx.lineTo(cx, torsoTopY + 26)
    ctx.lineTo(cx + 16, torsoTopY + 6)
    ctx.lineWidth = 5
    ctx.strokeStyle = colors.scarf ?? colors.accent
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
  drawHdHatAndHair(ctx, cx, headTopY, headR, sideDir, colors)

  // Front Arm + Weapon
  const armX = sideDir === 'side' ? cx - 6 - armSwing * 0.45 : cx + 22
  const armY = torsoTopY + 14
  const handX = sideDir === 'side' ? armX + 4 : cx + 25
  const handY = armY + 24 + (action === 'attack' ? -10 : 0)

  ctx.save()
  ctx.strokeStyle = HD_INK
  ctx.lineWidth = 2.6
  ctx.fillStyle = bodyHi
  ctx.beginPath()
  ctx.roundRect(armX - 6, armY, 13, 25, 6)
  ctx.fill()
  ctx.stroke()
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

/* ---------------- HD Hand-Drawn Cel-Shaded Monsters ---------------- */

export function renderHdMonsterSprite(
  archetype: MonsterModelArchetype,
  sprite: MonsterSprite,
  color: string,
  accent: string,
  dir: Dir,
  action: SpriteAction,
  f: number,
  wWorld: number,
  hWorld: number,
): HTMLCanvasElement {
  const hdScale = 4
  const W = wWorld * hdScale
  const H = hWorld * hdScale
  const { c, ctx } = makeSmoothCanvas(W, H, hdScale)

  const cx = W / 2
  const footY = H - 12
  const hi = shadeCol(color, 0.35)
  const dark = shadeCol(color, -0.32)
  const bob = action === 'walk' ? Math.sin((f / 6) * Math.PI * 2) * 7 : action === 'attack' ? -8 : Math.sin((f / 4) * Math.PI * 2) * 3
  const squashX = action === 'walk' && f % 3 === 1 ? 1.07 : action === 'attack' && f === 1 ? 1.12 : 1
  const squashY = 2 - squashX

  ctx.save()
  if (dir === 'left') {
    ctx.translate(W, 0)
    ctx.scale(-1, 1)
  }

  ctx.strokeStyle = HD_INK
  ctx.lineWidth = 3.2

  if (archetype === 'slime' || archetype === 'pink_slime') {
    const rX = W * 0.34 * squashX
    const rY = H * 0.28 * squashY
    const cy = footY - rY + bob * 0.5
    const sg = ctx.createRadialGradient(cx - rX * 0.25, cy - rY * 0.3, 4, cx, cy, rX * 1.15)
    sg.addColorStop(0, '#ffffff')
    sg.addColorStop(0.25, hi)
    sg.addColorStop(0.7, color)
    sg.addColorStop(1, dark)
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.moveTo(cx - rX, footY - 4)
    ctx.quadraticCurveTo(cx - rX * 1.05, cy - rY * 1.25, cx, cy - rY * 1.15)
    ctx.quadraticCurveTo(cx + rX * 1.05, cy - rY * 1.25, cx + rX, footY - 4)
    ctx.quadraticCurveTo(cx, footY + 3, cx - rX, footY - 4)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    if (archetype === 'pink_slime') {
      // Tiny golden king crown on pink slime / boss
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.moveTo(cx - 14, cy - rY * 1.1)
      ctx.lineTo(cx - 16, cy - rY * 1.45)
      ctx.lineTo(cx - 6, cy - rY * 1.22)
      ctx.lineTo(cx, cy - rY * 1.52)
      ctx.lineTo(cx + 6, cy - rY * 1.22)
      ctx.lineTo(cx + 16, cy - rY * 1.45)
      ctx.lineTo(cx + 14, cy - rY * 1.1)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    if (dir !== 'up') {
      const lookX = dir === 'right' ? 8 : 0
      drawAnimeEye(ctx, cx - 12 + lookX, cy, 4.5, 6, '#1e1b4b', false, action === 'attack')
      drawAnimeEye(ctx, cx + 12 + lookX, cy, 4.5, 6, '#1e1b4b', false, action === 'attack')
    }
  } else if (archetype === 'mushroom') {
    const stemH = H * 0.34
    ctx.fillStyle = '#fef3c7'
    ctx.beginPath()
    ctx.roundRect(cx - 16, footY - stemH + bob, 32, stemH, 10)
    ctx.fill()
    ctx.stroke()
    // Plump spotted mushroom cap
    ctx.fillStyle = gradVert(ctx, cx, footY - stemH - 40 + bob, footY - stemH + 10 + bob, hi, dark)
    ctx.beginPath()
    ctx.ellipse(cx, footY - stemH - 6 + bob, 40 * squashX, 24 * squashY, 0, Math.PI, 0)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(cx - 16, footY - stemH - 18 + bob, 5, 0, Math.PI * 2)
    ctx.arc(cx + 14, footY - stemH - 20 + bob, 6, 0, Math.PI * 2)
    ctx.fill()
    if (dir !== 'up') {
      drawAnimeEye(ctx, cx - 8, footY - stemH * 0.55 + bob, 3.6, 5, '#291713', false)
      drawAnimeEye(ctx, cx + 8, footY - stemH * 0.55 + bob, 3.6, 5, '#291713', false)
    }
  } else if (archetype === 'rabbit' || archetype === 'wolf') {
    const isWolf = archetype === 'wolf'
    const bodyRx = isWolf ? 34 : 24
    const bodyRy = isWolf ? 24 : 22
    const cy = footY - bodyRy - 10 + bob * 0.6
    // Paws
    ctx.fillStyle = dark
    for (const px of [-18, -6, 10, 20]) {
      ctx.beginPath()
      ctx.roundRect(cx + px - 5, footY - 16, 10, 16, 4)
      ctx.fill()
      ctx.stroke()
    }
    // Fluffy torso & head
    ctx.fillStyle = gradVert(ctx, cx, cy - bodyRy, cy + bodyRy, hi, color)
    ctx.beginPath()
    ctx.ellipse(cx - 4, cy, bodyRx, bodyRy, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    // Head & ears
    const hx = cx + (dir === 'right' ? 18 : 0)
    const hy = cy - 16
    for (const sx of [-1, 1]) {
      ctx.fillStyle = hi
      ctx.beginPath()
      ctx.ellipse(hx + sx * 12, hy - (isWolf ? 18 : 26), isWolf ? 7 : 6, isWolf ? 13 : 20, sx * 0.25, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    ctx.fillStyle = gradVert(ctx, hx, hy - 22, hy + 18, hi, color)
    ctx.beginPath()
    ctx.ellipse(hx, hy, 22, 19, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (dir !== 'up') {
      drawAnimeEye(ctx, hx - 7, hy - 2, 4, 5.2, isWolf ? '#ef4444' : '#be123c', false, isWolf)
      drawAnimeEye(ctx, hx + 8, hy - 2, 4, 5.2, isWolf ? '#ef4444' : '#be123c', false, isWolf)
    }
  } else if (archetype === 'bat' || archetype === 'ghost') {
    const isGhost = archetype === 'ghost'
    const cy = H * 0.45 + Math.sin((f / 4) * Math.PI * 2) * 8
    if (!isGhost) {
      const flap = action === 'walk' || action === 'attack' ? Math.sin((f / 4) * Math.PI * 2) * 16 : 6
      ctx.fillStyle = shadeCol(color, -0.25)
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(cx + sx * 10, cy)
        ctx.quadraticCurveTo(cx + sx * 38, cy - 26 - flap, cx + sx * 48, cy + 4 - flap * 0.5)
        ctx.quadraticCurveTo(cx + sx * 28, cy + 16, cx + sx * 10, cy + 10)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    }
    ctx.fillStyle = gradVert(ctx, cx, cy - 28, cy + 32, hi, color)
    ctx.beginPath()
    if (isGhost) {
      ctx.arc(cx, cy - 6, 26, Math.PI, 0)
      ctx.lineTo(cx + 26, cy + 30)
      ctx.quadraticCurveTo(cx + 12, cy + 20, cx, cy + 32)
      ctx.quadraticCurveTo(cx - 12, cy + 20, cx - 26, cy + 30)
      ctx.closePath()
    } else {
      ctx.arc(cx, cy, 22, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.stroke()
    if (dir !== 'up') {
      drawAnimeEye(ctx, cx - 9, cy - 4, 4.5, 6, accent, false, !isGhost)
      drawAnimeEye(ctx, cx + 9, cy - 4, 4.5, 6, accent, false, !isGhost)
    }
  } else {
    // Bold anime fantasy boss / golem / knight / demon / dragon / sentinel / goblin_chief
    const isDragon = archetype === 'abyss_dragon'
    const isBoss =
      archetype === 'demon_lord' ||
      archetype === 'abyss_dragon' ||
      archetype === 'fire_golem' ||
      archetype === 'earth_golem' ||
      archetype === 'abyss_knight' ||
      archetype === 'gale_sentinel'
    const scaleBody = isBoss ? 1.08 : 0.92
    const cy = footY - 46 * scaleBody + bob

    // Wings / Aura spikes for bosses & demons
    if (archetype === 'demon' || archetype === 'demon_lord' || isDragon || archetype === 'gale_sentinel') {
      ctx.fillStyle = archetype === 'gale_sentinel' ? '#e0f2fe' : shadeCol(accent, -0.3)
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(cx + sx * 14, cy - 10)
        ctx.lineTo(cx + sx * 56, cy - 46)
        ctx.lineTo(cx + sx * 48, cy + 8)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    }
    // Legs
    ctx.fillStyle = dark
    ctx.beginPath()
    ctx.roundRect(cx - 26, footY - 24, 18, 22, 6)
    ctx.roundRect(cx + 8, footY - 24, 18, 22, 6)
    ctx.fill()
    ctx.stroke()
    // Armored / Muscular Torso
    ctx.fillStyle = gradVert(ctx, cx, cy - 32, cy + 32, hi, dark)
    ctx.beginPath()
    ctx.roundRect(cx - 34 * scaleBody, cy - 22, 68 * scaleBody, 52 * scaleBody, 16)
    ctx.fill()
    ctx.stroke()
    // Core / Gem chest glow
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.arc(cx, cy + 4, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    // Horned / Crowned Head
    ctx.fillStyle = gradVert(ctx, cx, cy - 58, cy - 14, hi, color)
    ctx.beginPath()
    ctx.ellipse(cx, cy - 34, 24 * scaleBody, 22 * scaleBody, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (archetype === 'demon' || archetype === 'demon_lord' || isDragon || archetype === 'goblin_chief') {
      ctx.fillStyle = archetype === 'goblin_chief' ? '#fbbf24' : '#f8fafc'
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(cx + sx * 12, cy - 48)
        ctx.lineTo(cx + sx * 28, cy - 70)
        ctx.lineTo(cx + sx * 22, cy - 40)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    }
    if (dir !== 'up') {
      drawAnimeEye(ctx, cx - 9, cy - 34, 4.6, 5.8, accent, false, true)
      drawAnimeEye(ctx, cx + 9, cy - 34, 4.6, 5.8, accent, false, true)
    }
  }

  ctx.restore()
  return c
}

/* ---------------- HD Pets & Mounts ---------------- */

export function renderHdPetSprite(
  spec: PetModelSpec,
  dir: Dir,
  action: SpriteAction,
  f: number,
): HTMLCanvasElement {
  const hdScale = 4
  const W = 28 * hdScale
  const H = 28 * hdScale
  const { c, ctx } = makeSmoothCanvas(W, H, hdScale)
  const cx = W / 2
  const cy = H * 0.56 + Math.sin((f / 4) * Math.PI * 2) * 5
  const c1 = spec.colors.primary
  const hi = shadeCol(c1, 0.35)
  const dark = shadeCol(c1, -0.3)

  ctx.save()
  if (dir === 'left') {
    ctx.translate(W, 0)
    ctx.scale(-1, 1)
  }
  ctx.strokeStyle = HD_INK
  ctx.lineWidth = 2.6

  if (spec.category === 'phao') {
    // Traditional Thai ornate Phao-Ob glowing spirit orb
    ctx.fillStyle = gradVert(ctx, cx, cy - 22, cy + 22, hi, dark)
    ctx.beginPath()
    ctx.ellipse(cx, cy + 2, 22, 18, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = spec.colors.accent
    ctx.beginPath()
    ctx.moveTo(cx - 14, cy - 12)
    ctx.lineTo(cx, cy - 34)
    ctx.lineTo(cx + 14, cy - 12)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(cx, cy + 2, 6, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // Cute chibi fairy/dragon/fox creature pet
    if (spec.floating) {
      ctx.fillStyle = '#ffffff'
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(cx + sx * 22, cy - 4, 12, 7, sx * 0.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    }
    ctx.fillStyle = gradVert(ctx, cx, cy - 20, cy + 20, hi, colorOrFallback(c1))
    ctx.beginPath()
    ctx.ellipse(cx, cy, 20, 18, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(cx + sx * 6, cy - 14)
      ctx.lineTo(cx + sx * 16, cy - 28)
      ctx.lineTo(cx + sx * 17, cy - 8)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    if (dir !== 'up') {
      drawAnimeEye(ctx, cx - 7, cy - 2, 3.8, 4.8, '#1e1b4b', false, action === 'attack')
      drawAnimeEye(ctx, cx + 7, cy - 2, 3.8, 4.8, '#1e1b4b', false, action === 'attack')
    }
  }
  ctx.restore()
  return c
}

function colorOrFallback(hex: string) {
  return hex || '#f4a261'
}

export function renderHdMountSprite(
  spec: MountModelSpec,
  dir: Dir,
  action: SpriteAction,
  f: number,
): HTMLCanvasElement {
  const hdScale = 4
  const W = 44 * hdScale
  const H = 38 * hdScale
  const { c, ctx } = makeSmoothCanvas(W, H, hdScale)
  const cx = W / 2
  const footY = H - 14
  const bob = action === 'walk' ? Math.sin((f / 6) * Math.PI * 2) * 6 : Math.sin((f / 4) * Math.PI * 2) * 2
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
    ctx.fillStyle = spec.colors.accent
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(cx + sx * 36, footY - 56 + bob, 26, 12, sx * -0.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }

  // Legs
  const stride = action === 'walk' ? Math.sin((f / 6) * Math.PI * 2) * 14 : 0
  ctx.fillStyle = dark
  for (const [lx, st] of [
    [cx - 28, stride],
    [cx + 22, -stride],
  ] as const) {
    ctx.beginPath()
    ctx.roundRect(lx + st * 0.4, footY - 34 + bob, 14, 34, 5)
    ctx.fill()
    ctx.stroke()
  }

  // Body + Saddle
  ctx.fillStyle = gradVert(ctx, cx, footY - 72 + bob, footY - 24 + bob, hi, dark)
  ctx.beginPath()
  ctx.ellipse(cx, footY - 46 + bob, 44, 24, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = spec.colors.saddle
  ctx.beginPath()
  ctx.roundRect(cx - 18, footY - 70 + bob, 36, 16, 6)
  ctx.fill()
  ctx.stroke()

  // Head
  const hx = dir === 'right' ? cx + 38 : cx
  const hy = footY - 68 + bob
  ctx.fillStyle = hi
  ctx.beginPath()
  ctx.ellipse(hx, hy, 20, 17, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  if (dir !== 'up') {
    drawAnimeEye(ctx, hx + 6, hy - 3, 4.2, 5.2, spec.colors.accent, false)
  }

  ctx.restore()
  return c
}
