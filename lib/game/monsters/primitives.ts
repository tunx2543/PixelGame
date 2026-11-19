import type { Dir, SpriteAction } from '../sprites'

export const INK = '#2b1815'

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export function shadeCol(hex: string, amt: number): string {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6)
  const r = parseInt(full.slice(0, 2), 16) || 128
  const g = parseInt(full.slice(2, 4), 16) || 128
  const b = parseInt(full.slice(4, 6), 16) || 128
  const f = (c: number) => clamp(Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt), 0, 255)
  return `#${[f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

export function gradV(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, top: string, bot: string) {
  const g = ctx.createLinearGradient(x, y0, x, y1)
  g.addColorStop(0, top)
  g.addColorStop(1, bot)
  return g
}

export function gradR(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  inner: string,
  outer: string,
) {
  const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, Math.max(1, r * 0.1), x, y, Math.max(2, r))
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  return g
}

export interface AnimMotion {
  cx: number
  footY: number
  W: number
  H: number
  dir: Dir
  action: SpriteAction
  f: number
  idlePhase: number
  walkPhase: number
  atkIdx: number
  isUp: boolean
  isSide: boolean
  isAttack: boolean
  breath: number
  bob: number
  lungeX: number
  lungeY: number
  tilt: number
  stepL: number
  stepR: number
  liftL: number
  liftR: number
  armSwing: number
  wingFlap: number
  weaponAngle: number
  jawOpen: number
  tailWag: number
  spinAngle: number
  blink: boolean
}

export function computeMotion(W: number, H: number, dir: Dir, action: SpriteAction, f: number): AnimMotion {
  const cx = W / 2
  const footY = H - 12
  const idlePhase = (f % 4) / 4
  const walkPhase = (f % 6) / 6
  const atkIdx = f % 4
  const isUp = dir === 'up'
  const isSide = dir === 'left' || dir === 'right'
  const isAttack = action === 'attack' || action === 'skill'

  const breath = action === 'idle' ? Math.sin(idlePhase * Math.PI * 2) : 0
  const walkSin = action === 'walk' ? Math.sin(walkPhase * Math.PI * 2) : 0
  const walkCos = action === 'walk' ? Math.cos(walkPhase * Math.PI * 2) : 0

  const lungeX = isAttack ? [-8, 12, 8, 1][atkIdx] : 0
  const lungeY = isAttack ? [3, -6, -2, 0][atkIdx] : 0
  const bob =
    action === 'walk'
      ? -Math.abs(walkSin) * 5.5
      : isAttack
        ? lungeY
        : breath * 2.2

  const tilt =
    action === 'walk'
      ? walkSin * 0.07
      : isAttack
        ? [-0.14, 0.18, 0.1, 0][atkIdx]
        : breath * 0.02

  const stepL = action === 'walk' ? walkSin * 8.5 : isAttack ? [-3, 5, 3, 0][atkIdx] : 0
  const stepR = action === 'walk' ? -walkSin * 8.5 : isAttack ? [3, -4, -2, 0][atkIdx] : 0
  const liftL = action === 'walk' ? Math.max(0, walkCos) * 6 : isAttack && atkIdx === 1 ? 4 : 0
  const liftR = action === 'walk' ? Math.max(0, -walkCos) * 6 : isAttack && atkIdx === 0 ? 3 : 0

  const armSwing =
    action === 'walk'
      ? walkSin * 0.42
      : isAttack
        ? [-0.95, 1.1, 0.6, 0.1][atkIdx]
        : breath * 0.08

  const wingFlap =
    action === 'walk'
      ? Math.sin(walkPhase * Math.PI * 4) * 0.42
      : isAttack
        ? [-0.55, 0.65, 0.3, -0.1][atkIdx]
        : Math.sin(idlePhase * Math.PI * 2) * 0.2

  const weaponAngle = isAttack
    ? [-1.15, 0.95, 1.25, 0.25][atkIdx]
    : action === 'walk'
      ? walkSin * 0.22
      : breath * 0.06

  const jawOpen = isAttack ? [0.25, 1.0, 0.85, 0.15][atkIdx] : action === 'idle' ? Math.max(0, breath) * 0.12 : 0.1
  const tailWag =
    action === 'walk'
      ? walkSin * 0.35
      : isAttack
        ? [-0.4, 0.5, 0.2, 0][atkIdx]
        : Math.sin(idlePhase * Math.PI * 2) * 0.18
  const spinAngle =
    action === 'walk'
      ? walkPhase * Math.PI * 2
      : isAttack
        ? (atkIdx / 4) * Math.PI * 2
        : idlePhase * Math.PI * 0.5

  return {
    cx,
    footY,
    W,
    H,
    dir,
    action,
    f,
    idlePhase,
    walkPhase,
    atkIdx,
    isUp,
    isSide,
    isAttack,
    breath,
    bob,
    lungeX,
    lungeY,
    tilt,
    stepL,
    stepR,
    liftL,
    liftR,
    armSwing,
    wingFlap,
    weaponAngle,
    jawOpen,
    tailWag,
    spinAngle,
    blink: action === 'idle' && f % 4 === 3,
  }
}

export function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill = '#fde047',
  stroke: string | null = INK,
  lineWidth = 1.5,
) {
  ctx.save()
  ctx.beginPath()
  const inner = r * 0.34
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2
    const rad = i % 2 === 0 ? r : inner
    const px = x + Math.cos(a) * rad
    const py = y + Math.sin(a) * rad
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = lineWidth
    ctx.stroke()
  }
  ctx.restore()
}

export type EyeKind = 'cute' | 'angry' | 'glow' | 'slit' | 'cyclops' | 'hollow' | 'serene'

export function drawMonsterEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  iris: string,
  kind: EyeKind = 'cute',
  blink = false,
) {
  ctx.save()
  if (blink && kind !== 'glow' && kind !== 'hollow') {
    ctx.strokeStyle = INK
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(x - rx, y)
    ctx.lineTo(x + rx, y)
    ctx.stroke()
    ctx.restore()
    return
  }

  if (kind === 'serene') {
    ctx.strokeStyle = INK
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.arc(x, y + 1, rx * 1.05, 0.25, Math.PI - 0.25)
    ctx.stroke()
    ctx.restore()
    return
  }

  if (kind === 'hollow') {
    ctx.fillStyle = '#1b1124'
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.ellipse(x, y, rx * 1.05, ry * 1.05, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = iris
    ctx.beginPath()
    ctx.arc(x, y, Math.max(1.5, rx * 0.48), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }

  if (kind === 'glow') {
    ctx.fillStyle = iris
    ctx.shadowColor = iris
    ctx.shadowBlur = 5
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x - rx * 0.2, y - ry * 0.2, Math.max(1.2, rx * 0.3), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }

  ctx.fillStyle = '#fff9f2'
  ctx.beginPath()
  ctx.ellipse(x, y, rx * 1.12, ry * 1.08, 0, 0, Math.PI * 2)
  ctx.fill()

  const ig = ctx.createLinearGradient(x, y - ry, x, y + ry)
  ig.addColorStop(0, INK)
  ig.addColorStop(0.55, iris)
  ig.addColorStop(1, shadeCol(iris, 0.55))
  ctx.fillStyle = ig
  ctx.beginPath()
  if (kind === 'slit') {
    ctx.ellipse(x, y, rx * 0.55, ry * 0.96, 0, 0, Math.PI * 2)
  } else {
    ctx.ellipse(x, y, rx * 0.95, ry * 0.95, 0, 0, Math.PI * 2)
  }
  ctx.fill()

  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(x, y - 0.3, rx * 1.08, ry * 0.96, 0, Math.PI * 1.05, Math.PI * 1.95)
  ctx.stroke()

  if (kind === 'angry') {
    ctx.lineWidth = 2.3
    ctx.beginPath()
    ctx.moveTo(x - rx * 1.2, y - ry * 1.15)
    ctx.lineTo(x + rx * 1.1, y - ry * 0.65)
    ctx.stroke()
  }

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(x - rx * 0.32, y - ry * 0.35, Math.max(1.2, rx * 0.34), Math.max(1.2, ry * 0.32), -0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawBlush(ctx: CanvasRenderingContext2D, x: number, y: number, rx = 4.2, ry = 2.4) {
  ctx.save()
  ctx.fillStyle = 'rgba(244, 114, 132, 0.52)'
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawFangMouth(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, openAmt: number, teeth = true) {
  ctx.save()
  const h = 2 + openAmt * 7
  ctx.fillStyle = '#5c1926'
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(x, y, w * 0.5, h * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  if (teeth && openAmt > 0.15) {
    ctx.fillStyle = '#fff9f0'
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(x + sx * w * 0.36, y - h * 0.35)
      ctx.lineTo(x + sx * w * 0.22, y + h * 0.25)
      ctx.lineTo(x + sx * w * 0.1, y - h * 0.35)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.restore()
}

export function drawFlamePlume(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  phase: number,
  outer = '#ef4444',
  inner = '#fde047',
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  const flicker = Math.sin(phase * Math.PI * 2) * 3.5
  ctx.fillStyle = outer
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-8, 4)
  ctx.quadraticCurveTo(-12, -8, -3 + flicker * 0.4, -18)
  ctx.quadraticCurveTo(2, -10, 4 + flicker, -23)
  ctx.quadraticCurveTo(13, -10, 8, 4)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = inner
  ctx.beginPath()
  ctx.moveTo(-4, 3)
  ctx.quadraticCurveTo(-5, -6, 1 + flicker * 0.5, -14)
  ctx.quadraticCurveTo(6, -5, 4, 3)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export function drawWingPair(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  span: number,
  style: 'feather' | 'bat' | 'insect' | 'crystal' | 'flame',
  color: string,
  tip: string,
  flapRad: number,
  isSide: boolean,
) {
  const sides = isSide ? [-1] : [-1, 1]
  for (const sx of sides) {
    ctx.save()
    const ax = isSide ? cx - 8 : cx + sx * 12
    ctx.translate(ax, cy)
    ctx.rotate(isSide ? -0.25 + flapRad : sx * (-0.2 + flapRad))
    const wg = gradV(ctx, 0, -span * 0.5, span * 0.4, shadeCol(color, 0.25), tip)
    ctx.fillStyle = wg
    ctx.strokeStyle = INK
    ctx.lineWidth = 2.2
    if (style === 'insect') ctx.globalAlpha = 0.85

    ctx.beginPath()
    if (style === 'feather') {
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(sx * span * 0.48, -span * 0.56, sx * span, -span * 0.22)
      ctx.quadraticCurveTo(sx * span * 0.9, span * 0.1, sx * span * 0.62, span * 0.2)
      ctx.quadraticCurveTo(sx * span * 0.35, span * 0.32, 0, span * 0.16)
      ctx.closePath()
    } else if (style === 'bat') {
      ctx.moveTo(0, 2)
      ctx.lineTo(sx * span * 0.55, -span * 0.52)
      ctx.lineTo(sx * span, -span * 0.24)
      ctx.quadraticCurveTo(sx * span * 0.72, span * 0.06, sx * span * 0.58, span * 0.24)
      ctx.quadraticCurveTo(sx * span * 0.35, span * 0.12, sx * span * 0.24, span * 0.26)
      ctx.quadraticCurveTo(sx * span * 0.12, span * 0.14, 0, span * 0.22)
      ctx.closePath()
    } else if (style === 'insect') {
      ctx.ellipse(sx * span * 0.5, -span * 0.14, span * 0.52, span * 0.24, sx * -0.32, 0, Math.PI * 2)
    } else if (style === 'crystal') {
      ctx.moveTo(0, 0)
      ctx.lineTo(sx * span * 0.45, -span * 0.5)
      ctx.lineTo(sx * span, -span * 0.18)
      ctx.lineTo(sx * span * 0.62, span * 0.2)
      ctx.lineTo(sx * span * 0.22, span * 0.18)
      ctx.closePath()
    } else {
      // flame
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(sx * span * 0.42, -span * 0.58, sx * span * 0.95, -span * 0.3)
      ctx.quadraticCurveTo(sx * span * 0.72, 0, sx * span * 0.85, span * 0.18)
      ctx.quadraticCurveTo(sx * span * 0.4, span * 0.22, 0, span * 0.12)
      ctx.closePath()
    }
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
}

export type WeaponPropKind =
  | 'none'
  | 'sword'
  | 'greatsword'
  | 'dagger'
  | 'axe'
  | 'hammer'
  | 'staff'
  | 'scepter'
  | 'spear'
  | 'halberd'
  | 'trident'
  | 'bow'
  | 'musket'
  | 'lantern'
  | 'fan'
  | 'parasol'
  | 'harp'
  | 'candelabra'
  | 'shield'
  | 'broom'
  | 'pickaxe'
  | 'club'
  | 'bone'
  | 'scales'
  | 'tambourine'
  | 'lollipop'
  | 'bell'

export function drawWeaponProp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: WeaponPropKind,
  angle: number,
  color = '#d8dee9',
  accent = '#fbbf24',
) {
  if (kind === 'none') return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.2
  ctx.lineJoin = 'round'

  switch (kind) {
    case 'sword':
    case 'greatsword': {
      const len = kind === 'greatsword' ? 36 : 26
      const w = kind === 'greatsword' ? 7 : 5
      ctx.fillStyle = '#78350f'
      ctx.fillRect(-3, -2, 6, 10)
      ctx.strokeRect(-3, -2, 6, 10)
      ctx.fillStyle = accent
      ctx.fillRect(-8, -5, 16, 4)
      ctx.strokeRect(-8, -5, 16, 4)
      ctx.fillStyle = gradV(ctx, 0, -len - 5, -5, '#ffffff', color)
      ctx.beginPath()
      ctx.moveTo(-w * 0.5, -5)
      ctx.lineTo(-w * 0.45, -len)
      ctx.lineTo(0, -len - 7)
      ctx.lineTo(w * 0.45, -len)
      ctx.lineTo(w * 0.5, -5)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      break
    }
    case 'dagger': {
      ctx.fillStyle = '#78350f'
      ctx.fillRect(-2.5, -2, 5, 7)
      ctx.strokeRect(-2.5, -2, 5, 7)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(-4, -2)
      ctx.quadraticCurveTo(3, -10, 5, -18)
      ctx.lineTo(0, -15)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      break
    }
    case 'axe':
    case 'halberd': {
      const len = kind === 'halberd' ? 38 : 28
      ctx.fillStyle = '#784e34'
      ctx.fillRect(-2.5, -len, 5, len + 8)
      ctx.strokeRect(-2.5, -len, 5, len + 8)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(2, -len + 4)
      ctx.quadraticCurveTo(16, -len - 2, 14, -len + 16)
      ctx.lineTo(2, -len + 13)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      if (kind === 'halberd') {
        ctx.beginPath()
        ctx.moveTo(-2.5, -len)
        ctx.lineTo(0, -len - 10)
        ctx.lineTo(2.5, -len)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
      break
    }
    case 'hammer':
    case 'club':
    case 'pickaxe': {
      ctx.fillStyle = '#7c4e32'
      ctx.fillRect(-2.5, -26, 5, 34)
      ctx.strokeRect(-2.5, -26, 5, 34)
      if (kind === 'hammer') {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(-12, -32, 24, 14, 4)
        ctx.fill()
        ctx.stroke()
      } else if (kind === 'pickaxe') {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(-14, -24)
        ctx.quadraticCurveTo(0, -32, 14, -24)
        ctx.lineTo(10, -21)
        ctx.quadraticCurveTo(0, -26, -10, -21)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      } else {
        ctx.fillStyle = shadeCol(color, -0.1)
        ctx.beginPath()
        ctx.ellipse(0, -20, 6.5, 13, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = accent
        for (const sy of [-26, -20, -14]) {
          ctx.beginPath()
          ctx.arc(-5, sy, 2, 0, Math.PI * 2)
          ctx.arc(5, sy, 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }
    case 'staff':
    case 'scepter':
    case 'lollipop': {
      const len = kind === 'scepter' ? 32 : 36
      ctx.fillStyle = '#8b5a3c'
      ctx.fillRect(-2, -len, 4, len + 10)
      ctx.strokeRect(-2, -len, 4, len + 10)
      if (kind === 'lollipop') {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(0, -len - 4, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.strokeStyle = '#fff5f5'
        ctx.beginPath()
        ctx.arc(0, -len - 4, 4, 0, Math.PI * 1.5)
        ctx.stroke()
      } else {
        ctx.fillStyle = accent
        ctx.beginPath()
        ctx.arc(0, -len - 4, 6.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        drawFourPointStar(ctx, 0, -len - 4, 5, '#ffffff', null)
      }
      break
    }
    case 'spear':
    case 'trident':
    case 'broom': {
      ctx.fillStyle = '#7f5539'
      ctx.fillRect(-2, -34, 4, 42)
      ctx.strokeRect(-2, -34, 4, 42)
      if (kind === 'trident') {
        ctx.fillStyle = accent
        ctx.beginPath()
        ctx.moveTo(-7, -32)
        ctx.lineTo(-7, -43)
        ctx.moveTo(0, -34)
        ctx.lineTo(0, -46)
        ctx.moveTo(7, -32)
        ctx.lineTo(7, -43)
        ctx.moveTo(-7, -32)
        ctx.lineTo(7, -32)
        ctx.stroke()
      } else if (kind === 'broom') {
        ctx.fillStyle = accent
        ctx.beginPath()
        ctx.moveTo(-7, -32)
        ctx.lineTo(7, -32)
        ctx.lineTo(10, -45)
        ctx.lineTo(-10, -45)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      } else {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(-4, -34)
        ctx.lineTo(0, -46)
        ctx.lineTo(4, -34)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
      break
    }
    case 'bow': {
      ctx.strokeStyle = '#78350f'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(-4, -8, 16, -Math.PI * 0.45, Math.PI * 0.45)
      ctx.stroke()
      ctx.strokeStyle = '#f8fafc'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(-1, -24)
      ctx.lineTo(-4, -8)
      ctx.lineTo(-1, 8)
      ctx.stroke()
      break
    }
    case 'musket': {
      ctx.fillStyle = '#7c4e32'
      ctx.fillRect(-4, -4, 18, 5)
      ctx.strokeRect(-4, -4, 18, 5)
      ctx.fillStyle = '#94a3b8'
      ctx.fillRect(6, -6, 18, 3.5)
      ctx.strokeRect(6, -6, 18, 3.5)
      break
    }
    case 'lantern':
    case 'bell': {
      ctx.fillStyle = '#78350f'
      ctx.fillRect(-2, -30, 4, 36)
      ctx.strokeRect(-2, -30, 4, 36)
      ctx.beginPath()
      ctx.moveTo(0, -30)
      ctx.lineTo(11, -30)
      ctx.lineTo(11, -22)
      ctx.stroke()
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.roundRect(6, -22, 10, 12, 3)
      ctx.fill()
      ctx.stroke()
      break
    }
    case 'fan':
    case 'tambourine': {
      ctx.fillStyle = accent
      ctx.beginPath()
      if (kind === 'tambourine') {
        ctx.arc(0, -10, 8, 0, Math.PI * 2)
      } else {
        ctx.moveTo(0, 0)
        ctx.arc(0, 0, 14, -Math.PI * 0.85, -Math.PI * 0.15)
        ctx.closePath()
      }
      ctx.fill()
      ctx.stroke()
      break
    }
    case 'parasol': {
      ctx.fillStyle = '#78350f'
      ctx.fillRect(-1.8, -32, 3.6, 36)
      ctx.strokeRect(-1.8, -32, 3.6, 36)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(0, -32, 20, 9, 0, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      break
    }
    case 'harp': {
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.arc(0, -10, 11, -Math.PI * 0.6, Math.PI * 0.7)
      ctx.lineTo(-2, -2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      break
    }
    case 'candelabra': {
      ctx.fillStyle = '#d97706'
      ctx.fillRect(-2, -16, 4, 18)
      ctx.fillRect(-9, -18, 18, 3)
      ctx.strokeRect(-9, -18, 18, 3)
      for (const sx of [-7, 0, 7]) {
        ctx.fillStyle = '#fef3c7'
        ctx.fillRect(sx - 1.5, -26, 3, 8)
        ctx.fillStyle = '#fbbf24'
        ctx.beginPath()
        ctx.arc(sx, -28, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'shield': {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(-9, -14, 18, 22, 6)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.arc(0, -3, 4.5, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'bone': {
      ctx.fillStyle = '#f5ebe0'
      ctx.beginPath()
      ctx.roundRect(-3, -24, 6, 26, 3)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(-3, -24, 4, 0, Math.PI * 2)
      ctx.arc(3, -24, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      break
    }
    case 'scales': {
      ctx.fillStyle = accent
      ctx.fillRect(-1.5, -24, 3, 24)
      ctx.fillRect(-11, -24, 22, 3)
      ctx.beginPath()
      ctx.arc(-9, -14, 5, 0, Math.PI)
      ctx.arc(9, -14, 5, 0, Math.PI)
      ctx.fill()
      ctx.stroke()
      break
    }
  }
  ctx.restore()
}

export function drawAttackVfx(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  atkIdx: number,
  color: string,
  style: 'slash' | 'magic' | 'bite' | 'sonic' | 'water' | 'flame' = 'slash',
) {
  if (atkIdx === 0) return
  ctx.save()
  ctx.globalAlpha = atkIdx === 1 ? 0.65 : atkIdx === 2 ? 0.95 : 0.45
  if (style === 'slash' || style === 'bite') {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3.2
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath()
      ctx.arc(x + i * 4, y, 16, -0.75, 0.85)
      ctx.stroke()
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, 18, -0.8, 0.9)
    ctx.stroke()
  } else if (style === 'magic' || style === 'flame') {
    const r = atkIdx === 2 ? 18 : 11
    ctx.fillStyle = gradR(ctx, x, y, r, '#ffffff', color)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + atkIdx * 0.5
      drawFourPointStar(ctx, x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4), 4.2, '#ffffff', color, 1)
    }
  } else {
    ctx.strokeStyle = color
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.arc(x, y, atkIdx === 2 ? 19 : 11, -0.6, 0.6)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x + 5, y, atkIdx === 2 ? 13 : 7, -0.6, 0.6)
    ctx.stroke()
  }
  ctx.restore()
}
