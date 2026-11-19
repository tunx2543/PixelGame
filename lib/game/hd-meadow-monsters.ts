import type { MonsterModelArchetype } from './models-2d'
import type { Dir, SpriteAction } from './sprites'

const INK = '#2b1815'

function gradV(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, top: string, bot: string) {
  const g = ctx.createLinearGradient(x, y0, x, y1)
  g.addColorStop(0, top)
  g.addColorStop(1, bot)
  return g
}

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill = '#fde047',
  stroke: string | null = INK,
  lineWidth = 1.6,
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

function drawSparkleEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  iris: string,
  blink = false,
  angry = false,
  serene = false,
) {
  ctx.save()
  if (blink || serene) {
    ctx.strokeStyle = INK
    ctx.lineWidth = 2.4
    ctx.beginPath()
    if (serene) {
      ctx.arc(x, y + 1, rx * 1.15, 0.25, Math.PI - 0.25)
    } else {
      ctx.moveTo(x - rx * 1.05, y)
      ctx.lineTo(x + rx * 1.05, y + 0.5)
    }
    ctx.stroke()
    ctx.restore()
    return
  }

  ctx.fillStyle = '#fffaf6'
  ctx.beginPath()
  ctx.ellipse(x, y, rx * 1.12, ry * 1.08, 0, 0, Math.PI * 2)
  ctx.fill()

  const ig = ctx.createLinearGradient(x, y - ry, x, y + ry)
  ig.addColorStop(0, INK)
  ig.addColorStop(0.55, iris)
  ig.addColorStop(1, '#ffffff')
  ctx.fillStyle = ig
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = INK
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.ellipse(x, y - 0.4, rx * 1.06, ry * 0.94, 0, Math.PI * 1.06, Math.PI * 1.94)
  ctx.stroke()

  if (angry) {
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(x - rx * 1.25, y - ry * 1.25)
    ctx.lineTo(x + rx * 1.1, y - ry * 0.8)
    ctx.stroke()
  }

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(x - rx * 0.34, y - ry * 0.36, rx * 0.36, ry * 0.34, -0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + rx * 0.3, y + ry * 0.34, Math.max(1.1, rx * 0.19), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawBlush(ctx: CanvasRenderingContext2D, x: number, y: number, rx = 4.5, ry = 2.6, color = 'rgba(244, 114, 132, 0.55)') {
  ctx.save()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawSmile(ctx: CanvasRenderingContext2D, x: number, y: number, w = 4.5, open = false) {
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  if (open) {
    ctx.fillStyle = '#be3e52'
    ctx.beginPath()
    ctx.arc(x, y, w * 0.72, 0, Math.PI)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.arc(x, y - 1, w * 0.65, 0.2, Math.PI - 0.2)
    ctx.stroke()
  }
  ctx.restore()
}

function drawFeatherCharm(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, len = 12) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = '#fdf3df'
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(len * 0.45, -len * 0.32, len, -len * 0.08)
  ctx.quadraticCurveTo(len * 0.52, len * 0.36, 0, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // Warm tip
  ctx.fillStyle = '#e5a467'
  ctx.beginPath()
  ctx.ellipse(len * 0.74, 0, len * 0.2, len * 0.14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function isMeadowMonsterArchetype(archetype: MonsterModelArchetype): boolean {
  return archetype.startsWith('meadow_')
}

/**
 * Renders bespoke cel-shaded HD sprites & multi-frame Idle (4F) / Walk (6F) / Attack (4F) animations
 * for all 13 Meadow monsters matching 01-meadow_0b089b02.png.
 * Canonical horizontal facing inside this function points toward RIGHT (+x) so outer ctx.scale(-1, 1)
 * mirrors cleanly for dir === 'left'.
 */
export function renderMeadowMonster(
  ctx: CanvasRenderingContext2D,
  archetype: MonsterModelArchetype,
  W: number,
  H: number,
  dir: Dir,
  action: SpriteAction,
  f: number,
): boolean {
  if (!isMeadowMonsterArchetype(archetype)) return false

  const cx = W / 2
  const footY = H - 11
  const idlePhase = (f % 4) / 4
  const walkPhase = (f % 6) / 6
  const atkIdx = f % 4
  const isUp = dir === 'up'
  const isSide = dir === 'left' || dir === 'right'
  const faceShift = isSide ? 4 : 0
  const isAttack = action === 'attack' || action === 'skill'

  ctx.strokeStyle = INK
  ctx.lineWidth = 2.8
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  switch (archetype) {
    /* 1. หนอนน้อย (Larva) — ดิน · แมลง · ประชิด · เล็ก · ★1 */
    case 'meadow_larva': {
      const inchCompress =
        action === 'walk'
          ? Math.sin(walkPhase * Math.PI * 2)
          : isAttack
            ? [-0.55, 0.7, 0.45, 0][atkIdx]
            : Math.sin(idlePhase * Math.PI * 2) * 0.15
      const hump = action === 'walk' ? Math.max(0, -inchCompress) * 6 : isAttack && atkIdx === 0 ? 5 : 0
      const lungeX = isAttack ? [-5, 9, 6, 1][atkIdx] : 0
      const wingFlap = Math.sin((action === 'walk' ? walkPhase : idlePhase) * Math.PI * 2) * (action === 'walk' ? 0.25 : 0.12)

      // 5 segmented teal/cream caterpillar sections from tail (-x) to head (+x)
      const segs = [
        { ox: -25 + inchCompress * 5, oy: 1, r: 9.5, colTop: '#7ac7b4', colBot: '#468a80' },
        { ox: -16 + inchCompress * 3, oy: -hump * 0.7, r: 11, colTop: '#faf4d4', colBot: '#d9cf9c' },
        { ox: -6, oy: -hump, r: 12.2, colTop: '#6ec0ad', colBot: '#40837a' },
        { ox: 4 - inchCompress * 2, oy: -hump * 0.55, r: 12.6, colTop: '#faf4d4', colBot: '#dad09d' },
      ]

      // Tiny stubby legs underneath
      for (let i = 0; i < 3; i++) {
        const step = action === 'walk' ? Math.sin(walkPhase * Math.PI * 2 + i * 2.1) * 3.5 : 0
        const lx = cx - 18 + i * 12 + lungeX * 0.4
        ctx.fillStyle = '#efe5be'
        ctx.beginPath()
        ctx.ellipse(lx, footY - 2 + Math.min(0, step), 3.4, 4.2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }

      // Rear-to-front body segments
      for (const seg of segs) {
        ctx.fillStyle = gradV(ctx, cx + seg.ox, footY - 14 + seg.oy - seg.r, footY - 2, seg.colTop, seg.colBot)
        ctx.beginPath()
        ctx.ellipse(cx + seg.ox + lungeX * 0.35, footY - 13 + seg.oy, seg.r, seg.r * 0.94, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }

      // 2 tiny cream-green back leaf wings
      for (const side of [-1, 1]) {
        ctx.save()
        ctx.translate(cx - 8 + lungeX * 0.4, footY - 23 - hump * 0.6)
        ctx.rotate(-0.45 + side * 0.18 + wingFlap * side)
        ctx.fillStyle = side > 0 ? '#d8ebb5' : '#85bf87'
        ctx.beginPath()
        ctx.ellipse(-6, -5, 9.5, 4.4, -0.35, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }

      // Rounded head (+x) with tan-amber ridge crest
      const hx = cx + 15 + lungeX + faceShift * 0.4
      const hy = footY - 16 - (isAttack && atkIdx === 1 ? 3 : 0)
      ctx.fillStyle = gradV(ctx, hx, hy - 14, hy + 14, '#fcf7df', '#d9e5bf')
      ctx.beginPath()
      ctx.ellipse(hx, hy, 13.5, 12.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Tan caterpillar crown tuft / horns
      ctx.fillStyle = gradV(ctx, hx, hy - 18, hy - 4, '#e5aa65', '#b87639')
      ctx.beginPath()
      ctx.ellipse(hx - 2, hy - 11, 7.5, 4.8, -0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      for (const ax of [-4, 3]) {
        ctx.beginPath()
        ctx.moveTo(hx + ax, hy - 12)
        ctx.lineTo(hx + ax + 1, hy - 18)
        ctx.stroke()
        ctx.fillStyle = '#f2c17e'
        ctx.beginPath()
        ctx.arc(hx + ax + 1, hy - 19, 2.3, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }

      if (!isUp) {
        const blink = action === 'idle' && f % 4 === 3
        drawSparkleEye(ctx, hx - 2, hy - 1, 2.9, 3.6, '#7c3f1d', blink, isAttack)
        drawSparkleEye(ctx, hx + 6.5, hy - 1, 2.7, 3.5, '#7c3f1d', blink, isAttack)
        drawBlush(ctx, hx - 5, hy + 4, 3.2, 1.8)
        drawBlush(ctx, hx + 8, hy + 4, 2.6, 1.6)
        drawSmile(ctx, hx + 2.5, hy + 4.5, 3, isAttack && atkIdx === 1)
      }

      // Attack earth dust puff on F1-F2
      if (isAttack && (atkIdx === 1 || atkIdx === 2)) {
        ctx.save()
        ctx.fillStyle = 'rgba(134, 239, 172, 0.72)'
        for (const p of [{ x: hx + 16, y: hy + 2, r: 4.5 }, { x: hx + 20, y: hy - 5, r: 3 }]) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
      return true
    }

    /* 2. ผีเสื้อขนปุย (Fuzzfly) — ลม · แมลง · ว่องไว · เล็ก · ★1 */
    case 'meadow_fuzzfly': {
      const hover = Math.sin((action === 'walk' ? walkPhase : idlePhase) * Math.PI * 2) * (action === 'walk' ? 6 : 4)
      const atkSwoop = isAttack ? [-5, 7, 4, -2][atkIdx] : 0
      const atkX = isAttack ? [-4, 8, 5, 0][atkIdx] : 0
      const flapAngle =
        action === 'walk'
          ? Math.sin(walkPhase * Math.PI * 2) * 0.52
          : isAttack
            ? [-0.55, 0.6, 0.25, -0.2][atkIdx]
            : Math.sin(idlePhase * Math.PI * 2) * 0.28

      const cy = H * 0.52 + hover + atkSwoop
      const bx = cx + atkX

      // Wide fluffy feathered peach-cream moth wings behind
      for (const sx of [-1, 1]) {
        ctx.save()
        ctx.translate(bx + sx * 8, cy - 2)
        ctx.rotate(sx * (-0.18 + flapAngle))
        ctx.fillStyle = gradV(ctx, 0, -14, 14, '#fdf0e2', '#edb899')
        ctx.beginPath()
        ctx.moveTo(0, -2)
        ctx.quadraticCurveTo(sx * 24, -18, sx * 30, -4)
        ctx.quadraticCurveTo(sx * 27, 8, sx * 15, 9)
        ctx.quadraticCurveTo(sx * 6, 8, 0, 4)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        // Soft inner wing feather lobe
        ctx.fillStyle = '#f8d8c2'
        ctx.beginPath()
        ctx.ellipse(sx * 16, -2, 8.5, 4.5, sx * 0.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // Fluffy peach moth ear tufts
      for (const sx of [-1, 1]) {
        ctx.save()
        ctx.translate(bx + sx * 10, cy - 12)
        ctx.rotate(sx * (0.55 + flapAngle * 0.35))
        ctx.fillStyle = gradV(ctx, 0, -10, 4, '#f6be9c', '#e6946e')
        ctx.beginPath()
        ctx.ellipse(0, -5, 4.6, 9, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }

      // Tiny stubby paws
      ctx.fillStyle = '#f3d8c4'
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(bx + sx * 7, cy + 14, 3.6, 3.2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }

      // Plump fluffy round cream body
      ctx.fillStyle = gradV(ctx, bx, cy - 16, cy + 16, '#fffbf6', '#f2dece')
      ctx.beginPath()
      ctx.ellipse(bx, cy + 1, 15.5, 14, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Peach head plume
      ctx.fillStyle = '#f4a982'
      ctx.beginPath()
      ctx.ellipse(bx + faceShift * 0.4, cy - 12, 4.2, 5.2, 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      if (!isUp) {
        const lx = bx + faceShift * 0.7
        const blink = action === 'idle' && f % 4 === 3
        drawSparkleEye(ctx, lx - 6, cy - 1, 3.1, 4, '#5a3228', blink, isAttack)
        drawSparkleEye(ctx, lx + 6, cy - 1, 3.1, 4, '#5a3228', blink, isAttack)
        drawBlush(ctx, lx - 9.5, cy + 4, 3.4, 2)
        drawBlush(ctx, lx + 9.5, cy + 4, 3.4, 2)
        drawSmile(ctx, lx, cy + 4.5, 2.8, false)
      }

      // Wind gust trail on walk / gust crescent on attack
      if (isAttack && (atkIdx === 1 || atkIdx === 2)) {
        ctx.save()
        ctx.strokeStyle = '#6ee7b7'
        ctx.lineWidth = 2.6
        ctx.beginPath()
        ctx.arc(bx + 12, cy, 22, -0.9, 0.9)
        ctx.stroke()
        ctx.restore()
      }
      return true
    }

    /* 3. ด้วงเขา (Beetle) — ดิน · แมลง · ประชิด · เล็ก · ★1 */
    case 'meadow_beetle': {
      const bob = action === 'walk' ? Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 3 : Math.sin(idlePhase * Math.PI * 2) * 1.5
      const tilt = isAttack ? [-0.15, 0.25, 0.12, 0][atkIdx] : action === 'walk' ? Math.sin(walkPhase * Math.PI * 2) * 0.06 : 0
      const lungeX = isAttack ? [-4, 8, 5, 0][atkIdx] : 0
      const cy = footY - 17 - bob

      ctx.save()
      ctx.translate(cx + lungeX, cy)
      ctx.rotate(tilt)

      // 6 jointed plum-dark insect legs with alternating tripod stride
      ctx.strokeStyle = INK
      ctx.lineWidth = 3.2
      for (let i = 0; i < 3; i++) {
        const legX = -13 + i * 12
        const stride = action === 'walk' ? Math.sin(walkPhase * Math.PI * 2 + i * 2.1) * 4.5 : 0
        for (const side of [-1, 1]) {
          ctx.beginPath()
          ctx.moveTo(legX, 6)
          ctx.lineTo(legX + side * 6, 13 + stride * side * 0.3)
          ctx.lineTo(legX + side * 9, 19 - Math.max(0, stride * side))
          ctx.stroke()
        }
      }
      ctx.lineWidth = 2.8

      // Cream wing-case collar / decorative ribbon back
      ctx.fillStyle = gradV(ctx, -10, -18, 6, '#fbf2e0', '#d8c5a3')
      ctx.beginPath()
      ctx.ellipse(-6, -9, 11, 7.5, -0.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Glossy deep plum/burgundy beetle carapace
      ctx.fillStyle = gradV(ctx, 0, -16, 14, '#9e4369', '#4a1831')
      ctx.beginPath()
      ctx.ellipse(-2, 0, 20, 14.5, -0.06, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Glossy highlight band & golden trim line
      ctx.strokeStyle = '#df97b2'
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.arc(-4, -2, 13, Math.PI * 1.15, Math.PI * 1.8)
      ctx.stroke()
      ctx.strokeStyle = '#ecc05c'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-18, 4)
      ctx.quadraticCurveTo(0, 9, 15, 2)
      ctx.stroke()
      ctx.strokeStyle = INK
      ctx.lineWidth = 2.8

      // Head & curved golden rhinoceros horn (+x)
      if (!isUp) {
        const hornLift = isAttack && (atkIdx === 1 || atkIdx === 2) ? -6 : 0
        ctx.fillStyle = gradV(ctx, 20, -14 + hornLift, 4, '#fde68a', '#d9981e')
        ctx.beginPath()
        ctx.moveTo(13, 3)
        ctx.quadraticCurveTo(25, 4, 27, -11 + hornLift)
        ctx.quadraticCurveTo(22, -4 + hornLift * 0.5, 14, -4)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Amber eye
        drawSparkleEye(ctx, 11, -1, 3.2, 3.8, '#d97706', false, isAttack)
      } else {
        // Rear seam on shell for back view
        ctx.beginPath()
        ctx.moveTo(-2, -13)
        ctx.lineTo(-2, 13)
        ctx.stroke()
      }

      // Golden horn slash glint on attack
      if (isAttack && (atkIdx === 1 || atkIdx === 2)) {
        drawFourPointStar(ctx, 27, -15, 6, '#fef08a', '#b45309', 1.4)
      }
      ctx.restore()
      return true
    }

    /* 4. ก้อนเมือก (Blob) — น้ำ · สไลม์ · ประชิด · เล็ก · ★1 */
    case 'meadow_blob': {
      const sqX =
        action === 'walk'
          ? 1 - Math.sin(walkPhase * Math.PI * 2) * 0.14
          : isAttack
            ? [1.18, 0.88, 1.1, 1][atkIdx]
            : 1 + Math.sin(idlePhase * Math.PI * 2) * 0.05
      const sqY = 2 - sqX
      const jumpY =
        action === 'walk'
          ? Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 12
          : isAttack
            ? [0, 8, 3, 0][atkIdx]
            : 0
      const lungeX = isAttack ? [-3, 9, 5, 0][atkIdx] : 0

      const rX = 28 * sqX
      const rY = 21 * sqY
      const cy = footY - rY - jumpY + 2
      const bx = cx + lungeX

      // Coral-pink translucent jelly gradient
      const bg = ctx.createRadialGradient(bx - rX * 0.3, cy - rY * 0.45, 3, bx, cy, rX * 1.18)
      bg.addColorStop(0, '#ffd4d7')
      bg.addColorStop(0.42, '#f4868b')
      bg.addColorStop(0.85, '#dc5b65')
      bg.addColorStop(1, '#b83c49')
      ctx.fillStyle = bg
      ctx.beginPath()
      ctx.moveTo(bx - rX, footY - jumpY)
      ctx.quadraticCurveTo(bx - rX * 1.06, cy - rY * 1.18, bx, cy - rY * 1.15)
      ctx.quadraticCurveTo(bx + rX * 1.06, cy - rY * 1.18, bx + rX, footY - jumpY)
      ctx.quadraticCurveTo(bx, footY - jumpY + 5, bx - rX, footY - jumpY)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Glossy top-left dome reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'
      ctx.beginPath()
      ctx.ellipse(bx - rX * 0.35, cy - rY * 0.58, 7.5, 3.6, -0.45, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(bx - rX * 0.58, cy - rY * 0.32, 2.3, 0, Math.PI * 2)
      ctx.fill()

      if (!isUp) {
        const lx = bx + faceShift * 0.9
        const blink = action === 'idle' && f % 4 === 3
        drawSparkleEye(ctx, lx - 9, cy + 2, 3.4, 4.6, '#5c1824', blink, isAttack)
        drawSparkleEye(ctx, lx + 9, cy + 2, 3.4, 4.6, '#5c1824', blink, isAttack)
        drawBlush(ctx, lx - 14, cy + 6.5, 4, 2.4, 'rgba(225, 29, 72, 0.36)')
        drawBlush(ctx, lx + 14, cy + 6.5, 4, 2.4, 'rgba(225, 29, 72, 0.36)')
        drawSmile(ctx, lx, cy + 7.5, 4.2, true)
      }

      // Signature golden 4-point star glint on cheek
      const starScale = 0.8 + Math.sin((idlePhase + walkPhase) * Math.PI * 2) * 0.22
      drawFourPointStar(ctx, bx + 18, cy + 10, 5.2 * starScale, '#fef08a', INK, 1.4)

      if (isAttack && (atkIdx === 1 || atkIdx === 2)) {
        ctx.fillStyle = 'rgba(125, 211, 252, 0.78)'
        for (const d of [{ x: bx + 26, y: cy - 4, r: 3.6 }, { x: bx + 22, y: cy + 10, r: 2.8 }]) {
          ctx.beginPath()
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      return true
    }

    /* 5. หยดเมือก (Blob Drop) — ไฟ · สไลม์ · ประชิด · เล็ก · ★1 */
    case 'meadow_blob_drop': {
      const sqX =
        action === 'walk'
          ? 1 - Math.sin(walkPhase * Math.PI * 2) * 0.14
          : isAttack
            ? [1.18, 0.86, 1.12, 1][atkIdx]
            : 1 + Math.sin(idlePhase * Math.PI * 2) * 0.05
      const sqY = 2 - sqX
      const jumpY =
        action === 'walk'
          ? Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 12
          : isAttack
            ? [0, 9, 4, 0][atkIdx]
            : 0
      const tipSway = Math.sin((action === 'walk' ? walkPhase : idlePhase) * Math.PI * 2) * 4
      const lungeX = isAttack ? [-3, 10, 5, 0][atkIdx] : 0

      const rX = 27 * sqX
      const rY = 23 * sqY
      const cy = footY - rY - jumpY + 3
      const bx = cx + lungeX

      // Amber-honey teardrop slime shape
      const dg = ctx.createRadialGradient(bx - rX * 0.28, cy - rY * 0.4, 3, bx, cy, rX * 1.2)
      dg.addColorStop(0, '#fde7b2')
      dg.addColorStop(0.38, '#f6b15c')
      dg.addColorStop(0.85, '#dc7b28')
      dg.addColorStop(1, '#b55615')
      ctx.fillStyle = dg
      ctx.beginPath()
      ctx.moveTo(bx - rX, footY - jumpY)
      ctx.quadraticCurveTo(bx - rX * 1.05, cy - rY * 0.72, bx + tipSway * 0.5, cy - rY * 1.25)
      ctx.quadraticCurveTo(bx + rX * 1.05, cy - rY * 0.72, bx + rX, footY - jumpY)
      ctx.quadraticCurveTo(bx, footY - jumpY + 5, bx - rX, footY - jumpY)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Glossy honey shine
      ctx.fillStyle = 'rgba(255, 252, 235, 0.65)'
      ctx.beginPath()
      ctx.ellipse(bx - rX * 0.25, cy - rY * 0.52, 6.2, 3.3, -0.5, 0, Math.PI * 2)
      ctx.fill()

      if (!isUp) {
        const lx = bx + faceShift * 0.9
        const blink = action === 'idle' && f % 4 === 3
        drawSparkleEye(ctx, lx - 8.5, cy + 3, 3.3, 4.4, '#6b2d0c', blink, isAttack)
        drawSparkleEye(ctx, lx + 8.5, cy + 3, 3.3, 4.4, '#6b2d0c', blink, isAttack)
        drawBlush(ctx, lx - 13.5, cy + 7.5, 3.8, 2.2, 'rgba(234, 88, 12, 0.42)')
        drawBlush(ctx, lx + 13.5, cy + 7.5, 3.8, 2.2, 'rgba(234, 88, 12, 0.42)')
        drawSmile(ctx, lx, cy + 8.5, 3.8, true)
      }

      drawFourPointStar(ctx, bx + 17, cy + 10, 4.5, '#fef08a', INK, 1.3)

      if (isAttack && (atkIdx === 1 || atkIdx === 2)) {
        ctx.fillStyle = '#fb923c'
        for (const p of [{ x: bx + 25, y: cy - 8, r: 4 }, { x: bx + 28, y: cy + 4, r: 3 }]) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      return true
    }

    /* 6. ดักแด้ (Cocoon) — ดิน · แมลง · เฉื่อย · เล็ก · ★1 */
    case 'meadow_cocoon': {
      const sway =
        action === 'walk'
          ? Math.sin(walkPhase * Math.PI * 2) * 0.18
          : isAttack
            ? [-0.14, 0.22, -0.1, 0][atkIdx]
            : Math.sin(idlePhase * Math.PI * 2) * 0.065
      const hop = action === 'walk' ? Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 6 : isAttack && atkIdx === 1 ? 7 : 0
      const tremor = isAttack && atkIdx === 0 ? -2 : 0

      ctx.save()
      ctx.translate(cx + tremor, footY - hop)
      ctx.rotate(sway)

      // Woven vertical chrysalis pod
      ctx.fillStyle = gradV(ctx, 0, -68, 0, '#8b6476', '#513443')
      ctx.beginPath()
      ctx.moveTo(0, -66)
      ctx.quadraticCurveTo(22, -46, 17, -14)
      ctx.quadraticCurveTo(10, 2, 0, 2)
      ctx.quadraticCurveTo(-10, 2, -17, -14)
      ctx.quadraticCurveTo(-22, -46, 0, -66)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Criss-cross pale sakura-pink silk ribbons
      ctx.strokeStyle = '#f4c7d0'
      ctx.lineWidth = 4.2
      for (const yBase of [-50, -34, -18]) {
        ctx.beginPath()
        ctx.moveTo(-15, yBase)
        ctx.lineTo(15, yBase + 9)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(15, yBase)
        ctx.lineTo(-15, yBase + 9)
        ctx.stroke()
      }
      // Ribbon dark outlines
      ctx.strokeStyle = INK
      ctx.lineWidth = 1.6
      for (const yBase of [-50, -34, -18]) {
        ctx.beginPath()
        ctx.moveTo(-15, yBase - 2)
        ctx.lineTo(15, yBase + 7)
        ctx.moveTo(15, yBase - 2)
        ctx.lineTo(-15, yBase + 7)
        ctx.stroke()
      }
      ctx.lineWidth = 2.8

      // Cute silk bow-knot at top tip
      ctx.fillStyle = '#f8d7df'
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(sx * 6, -68, 6, 3.5, sx * 0.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(0, -66, 3.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Shy peeking eyes in dark gap
      if (!isUp) {
        const blink = action === 'idle' && f % 4 === 3
        ctx.fillStyle = '#24131c'
        ctx.beginPath()
        ctx.ellipse(faceShift * 0.4, -36, 10, 5.2, 0, 0, Math.PI * 2)
        ctx.fill()
        if (!blink) {
          ctx.fillStyle = '#fef08a'
          ctx.beginPath()
          ctx.arc(-4 + faceShift * 0.4, -36, 2.3, 0, Math.PI * 2)
          ctx.arc(4 + faceShift * 0.4, -36, 2.3, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.strokeStyle = '#f4c7d0'
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.moveTo(-6, -36)
          ctx.lineTo(-2, -36)
          ctx.moveTo(2, -36)
          ctx.lineTo(6, -36)
          ctx.stroke()
        }
      }

      if (isAttack && (atkIdx === 1 || atkIdx === 2)) {
        ctx.strokeStyle = '#fbcfe8'
        ctx.lineWidth = 2.4
        ctx.beginPath()
        ctx.arc(0, -34, 25, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
      return true
    }

    /* 7. ไข่ด้วง (Beetle Egg) — ดิน · แมลง · เฉื่อย · กลาง · ★1 */
    case 'meadow_beetle_egg': {
      const wobble =
        action === 'walk'
          ? Math.sin(walkPhase * Math.PI * 2) * 0.14
          : isAttack
            ? [-0.16, 0.2, -0.08, 0][atkIdx]
            : Math.sin(idlePhase * Math.PI * 2) * 0.055
      const hop = action === 'walk' ? Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 7 : isAttack && atkIdx === 1 ? 8 : 0

      // Egg body tilting in nest
      ctx.save()
      ctx.translate(cx, footY - 12 - hop)
      ctx.rotate(wobble)

      // Berry-plum spotted egg silhouette
      ctx.fillStyle = gradV(ctx, 0, -68, 6, '#b85b7c', '#74294a')
      ctx.beginPath()
      ctx.moveTo(0, -66)
      ctx.bezierCurveTo(22, -64, 30, -34, 27, -6)
      ctx.quadraticCurveTo(22, 8, 0, 8)
      ctx.quadraticCurveTo(-22, 8, -27, -6)
      ctx.bezierCurveTo(-30, -34, -22, -64, 0, -66)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Egg shell spots & crack near top
      ctx.fillStyle = '#621f3d'
      ctx.beginPath()
      ctx.ellipse(-12, -46, 5, 3.6, -0.4, 0, Math.PI * 2)
      ctx.ellipse(13, -40, 4.2, 3.2, 0.3, 0, Math.PI * 2)
      ctx.fill()

      // Jagged hatching crack
      ctx.strokeStyle = isAttack && atkIdx === 1 ? '#fef08a' : INK
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(-4, -64)
      ctx.lineTo(1, -55)
      ctx.lineTo(-5, -49)
      ctx.lineTo(2, -42)
      ctx.stroke()
      ctx.strokeStyle = INK
      ctx.lineWidth = 2.8

      // Warm tan/gold middle belt band
      ctx.fillStyle = gradV(ctx, 0, -28, -10, '#ecb47c', '#c97e47')
      ctx.beginPath()
      ctx.ellipse(0, -18, 27.5, 9, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Glowing 4-point star emblem on front belt
      if (!isUp) {
        const starPulse = 1 + Math.sin(idlePhase * Math.PI * 2) * 0.14
        drawFourPointStar(ctx, faceShift * 0.5, -18, 9.5 * starPulse, '#fde68a', INK, 1.8)
      }
      ctx.restore()

      // Grassy nest base around bottom
      ctx.fillStyle = gradV(ctx, cx, footY - 22, footY + 2, '#78b056', '#467432')
      ctx.beginPath()
      ctx.moveTo(cx - 32, footY - 4)
      ctx.lineTo(cx - 26, footY - 22)
      ctx.lineTo(cx - 17, footY - 12)
      ctx.lineTo(cx - 9, footY - 24)
      ctx.lineTo(cx, footY - 14)
      ctx.lineTo(cx + 10, footY - 24)
      ctx.lineTo(cx + 18, footY - 12)
      ctx.lineTo(cx + 27, footY - 21)
      ctx.lineTo(cx + 32, footY - 4)
      ctx.quadraticCurveTo(cx, footY + 4, cx - 32, footY - 4)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      return true
    }

    /* 8. ดอกไม้จิ๋ว (Bloomlet) — ดิน · พืช · ประชิด · กลาง · ★1 */
    case 'meadow_bloomlet': {
      const bob = action === 'walk' ? Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 4 : Math.sin(idlePhase * Math.PI * 2) * 2
      const petalSpread = isAttack ? [-0.22, 0.18, 0.1, 0][atkIdx] : Math.sin(idlePhase * Math.PI * 2) * 0.05
      const legSwing = action === 'walk' ? Math.sin(walkPhase * Math.PI * 2) * 5 : 0
      const lungeX = isAttack ? [-4, 8, 5, 0][atkIdx] : 0
      const bx = cx + lungeX

      // 2 woody brown root feet
      ctx.fillStyle = '#6f3e2d'
      for (const sx of [-1, 1]) {
        const yStep = sx * legSwing
        ctx.beginPath()
        ctx.ellipse(bx + sx * 9, footY - 5 + Math.min(0, yStep), 6.5, 6, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }

      // Woody brown torso
      ctx.fillStyle = gradV(ctx, bx, footY - 38 - bob, footY - 8 - bob, '#8b513b', '#582d1f')
      ctx.beginPath()
      ctx.roundRect(bx - 12, footY - 36 - bob, 24, 28, 10)
      ctx.fill()
      ctx.stroke()

      // Layered green leaf collar / skirt
      ctx.fillStyle = gradV(ctx, bx, footY - 34 - bob, footY - 16 - bob, '#6fa354', '#406b30')
      for (let i = -2; i <= 2; i++) {
        ctx.save()
        ctx.translate(bx + i * 7, footY - 28 - bob)
        ctx.rotate(i * 0.35)
        ctx.beginPath()
        ctx.ellipse(0, 6, 6.5, 11, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }

      // Gold 4-point star brooch on chest
      if (!isUp) {
        drawFourPointStar(ctx, bx + faceShift * 0.4, footY - 22 - bob, 6.5, '#fde047', INK, 1.5)
      }

      // 5 crimson-red petals around head
      const headY = footY - 56 - bob
      ctx.save()
      ctx.translate(bx, headY)
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 - Math.PI / 2 + petalSpread * (i % 2 === 0 ? 1 : -1)
        ctx.save()
        ctx.rotate(angle)
        ctx.fillStyle = gradV(ctx, 0, -34, -8, '#e3515f', '#9a1d2d')
        ctx.beginPath()
        ctx.ellipse(0, -20, 11.5, 16, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        // Center petal vein
        ctx.strokeStyle = '#6f111f'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(0, -10)
        ctx.lineTo(0, -24)
        ctx.stroke()
        ctx.strokeStyle = INK
        ctx.lineWidth = 2.8
        ctx.restore()
      }
      ctx.restore()

      // Warm cream-tan serene flower face
      ctx.fillStyle = gradV(ctx, bx, headY - 14, headY + 14, '#f8dfc2', '#d7ae86')
      ctx.beginPath()
      ctx.ellipse(bx, headY, 13.5, 12.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      if (!isUp) {
        const lx = bx + faceShift * 0.5
        // Calm serene closed curved eyes
        drawSparkleEye(ctx, lx - 5.5, headY - 1, 2.8, 3.2, '#5c2a1b', false, false, !isAttack)
        drawSparkleEye(ctx, lx + 5.5, headY - 1, 2.8, 3.2, '#5c2a1b', false, false, !isAttack)
        drawBlush(ctx, lx - 8.5, headY + 3.5, 3, 1.8)
        drawBlush(ctx, lx + 8.5, headY + 3.5, 3, 1.8)
        drawSmile(ctx, lx, headY + 4.5, 2.6, false)
      }

      if (isAttack && (atkIdx === 1 || atkIdx === 2)) {
        ctx.fillStyle = '#f43f5e'
        for (const p of [{ x: bx + 28, y: headY - 12 }, { x: bx + 32, y: headY + 10 }]) {
          ctx.beginPath()
          ctx.ellipse(p.x, p.y, 4.8, 2.8, 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      return true
    }

    /* 9. เห็ดน้อย (Capling) — พิษ · พืช · ประชิด · กลาง · ★1 */
    case 'meadow_capling': {
      const bob = action === 'walk' ? Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 5 : Math.sin(idlePhase * Math.PI * 2) * 2
      const capTilt = isAttack ? [-0.12, 0.16, 0.08, 0][atkIdx] : Math.sin((action === 'walk' ? walkPhase : idlePhase) * Math.PI * 2) * 0.08
      const lungeX = isAttack ? [-3, 7, 4, 0][atkIdx] : 0
      const bx = cx + lungeX

      // Flared pale cream mushroom stem + 4 cute stubby root tentacles
      for (let i = 0; i < 4; i++) {
        const ox = -12 + i * 8
        const stride = action === 'walk' ? Math.sin(walkPhase * Math.PI * 2 + i * 1.6) * 4.5 : 0
        ctx.fillStyle = '#ede0d0'
        ctx.beginPath()
        ctx.ellipse(bx + ox, footY - 4 + Math.min(0, stride), 5, 6.2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }

      ctx.fillStyle = gradV(ctx, bx, footY - 46 - bob, footY - 6 - bob, '#fdf5eb', '#dcc4ae')
      ctx.beginPath()
      ctx.moveTo(bx - 12, footY - 44 - bob)
      ctx.quadraticCurveTo(bx - 21, footY - 14 - bob, bx - 17, footY - 6 - bob)
      ctx.quadraticCurveTo(bx, footY - 2 - bob, bx + 17, footY - 6 - bob)
      ctx.quadraticCurveTo(bx + 21, footY - 14 - bob, bx + 12, footY - 44 - bob)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      if (!isUp) {
        const lx = bx + faceShift * 0.5
        const blink = action === 'idle' && f % 4 === 3
        drawSparkleEye(ctx, lx - 5.5, footY - 28 - bob, 2.6, 3.3, '#c026d3', blink, isAttack)
        drawSparkleEye(ctx, lx + 5.5, footY - 28 - bob, 2.6, 3.3, '#c026d3', blink, isAttack)
        drawBlush(ctx, lx - 9, footY - 23 - bob, 2.8, 1.6)
        drawBlush(ctx, lx + 9, footY - 23 - bob, 2.8, 1.6)
      }

      // Tall pointed witch-hat lavender mushroom cap
      ctx.save()
      ctx.translate(bx, footY - 40 - bob)
      ctx.rotate(capTilt)

      // Under-gills rim
      ctx.fillStyle = '#e7a99b'
      ctx.beginPath()
      ctx.ellipse(0, 2, 26, 8.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Pointed witch cap dome
      ctx.fillStyle = gradV(ctx, 0, -54, 4, '#b896d6', '#725292')
      ctx.beginPath()
      ctx.moveTo(-27, 2)
      ctx.quadraticCurveTo(-24, -22, -4, -44)
      ctx.quadraticCurveTo(4, -56, 12, -52)
      ctx.quadraticCurveTo(10, -36, 22, -22)
      ctx.quadraticCurveTo(28, -8, 27, 2)
      ctx.quadraticCurveTo(0, 7, -27, 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Cream spots on cap
      ctx.fillStyle = '#fdf4e4'
      ctx.beginPath()
      ctx.ellipse(-12, -14, 5.2, 4, -0.3, 0, Math.PI * 2)
      ctx.ellipse(14, -12, 4.5, 3.5, 0.3, 0, Math.PI * 2)
      ctx.ellipse(2, -32, 3.5, 2.8, 0, 0, Math.PI * 2)
      ctx.fill()

      // Side fluffy cream feather plume
      drawFeatherCharm(ctx, 18, -14, -0.55, 16)

      // Gold star pin on front of hat
      if (!isUp) {
        drawFourPointStar(ctx, faceShift * 0.5, -18, 6.2, '#fde047', INK, 1.4)
      }
      ctx.restore()

      // Purple poison spore puff on attack
      if (isAttack && (atkIdx === 1 || atkIdx === 2)) {
        ctx.save()
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.85)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.ellipse(bx, footY - 20, 34, 13, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = 'rgba(192, 132, 252, 0.65)'
        for (const ox of [-26, 26]) {
          ctx.beginPath()
          ctx.arc(bx + ox, footY - 30, 4.2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
      return true
    }

    /* 10. กระต่ายน้อย (Hopper) — ไร้ธาตุ · สัตว์ · ว่องไว · กลาง · ★1 */
    case 'meadow_hopper': {
      const hopArc =
        action === 'walk'
          ? [0, 12, 16, 12, 3, 0][f % 6]
          : isAttack
            ? [0, 14, 8, 0][atkIdx]
            : Math.abs(Math.sin(idlePhase * Math.PI * 2)) * 2.5
      const earTwitchL = action === 'idle' && f === 1 ? -0.18 : action === 'walk' ? -0.22 : 0
      const earTwitchR = action === 'idle' && f === 2 ? 0.18 : action === 'walk' ? -0.15 : 0
      const lungeX = isAttack ? [-3, 9, 5, 0][atkIdx] : 0
      const bx = cx + lungeX
      const cy = footY - 22 - hopArc

      // Puffy cotton tail behind (-x)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(bx - 18, cy + 7, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Hind legs & front paws
      ctx.fillStyle = gradV(ctx, bx, cy + 8, cy + 22, '#ffffff', '#dfd9ee')
      for (const px of [-10, 10]) {
        const stretch = action === 'walk' && (f === 1 || f === 2) ? 4 : 0
        ctx.beginPath()
        ctx.ellipse(bx + px, cy + 16 + stretch * 0.4, 6.5, 5, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }

      // Snow-white plump body
      ctx.fillStyle = gradV(ctx, bx, cy - 16, cy + 18, '#ffffff', '#e2ddf0')
      ctx.beginPath()
      ctx.ellipse(bx, cy + 3, 18.5, 16, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Head
      const hx = bx + faceShift * 0.65
      const hy = cy - 16
      // Tall pink-lined, violet-tipped bunny ears
      for (const sx of [-1, 1]) {
        const tw = sx < 0 ? earTwitchL : earTwitchR
        ctx.save()
        ctx.translate(hx + sx * 8, hy - 14)
        ctx.rotate(sx * 0.14 + tw)
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.ellipse(0, -16, 6.2, 18, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        // Inner pink lining
        if (!isUp) {
          ctx.fillStyle = '#f9a8d4'
          ctx.beginPath()
          ctx.ellipse(0, -14, 3.2, 12, 0, 0, Math.PI * 2)
          ctx.fill()
        }
        // Dark violet tip
        ctx.fillStyle = '#7e5399'
        ctx.beginPath()
        ctx.ellipse(0, -28, 4.8, 6.5, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }

      ctx.fillStyle = gradV(ctx, hx, hy - 16, hy + 16, '#ffffff', '#eae6f6')
      ctx.beginPath()
      ctx.ellipse(hx, hy, 17, 15, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      if (!isUp) {
        // Signature violet crescent-moon mark on forehead
        ctx.save()
        ctx.fillStyle = '#8b5cf6'
        ctx.beginPath()
        ctx.arc(hx, hy - 8, 4.2, 0.3, Math.PI * 1.85)
        ctx.arc(hx + 1.8, hy - 8.8, 3.1, Math.PI * 1.85, 0.3, true)
        ctx.closePath()
        ctx.fill()
        ctx.restore()

        const blink = action === 'idle' && f % 4 === 3
        drawSparkleEye(ctx, hx - 6.5, hy - 1, 3.2, 4.2, '#7e22ce', blink, isAttack)
        drawSparkleEye(ctx, hx + 6.5, hy - 1, 3.2, 4.2, '#7e22ce', blink, isAttack)
        drawBlush(ctx, hx - 10, hy + 4.5, 3.3, 1.9, 'rgba(244, 114, 182, 0.55)')
        drawBlush(ctx, hx + 10, hy + 4.5, 3.3, 1.9, 'rgba(244, 114, 182, 0.55)')
        // Cute pink triangle nose + smile
        ctx.fillStyle = '#f472b6'
        ctx.beginPath()
        ctx.arc(hx, hy + 3.2, 2.1, 0, Math.PI * 2)
        ctx.fill()
        drawSmile(ctx, hx, hy + 6, 3, false)
      }

      if (isAttack && (atkIdx === 1 || atkIdx === 2)) {
        ctx.save()
        ctx.strokeStyle = '#c084fc'
        ctx.lineWidth = 2.6
        ctx.beginPath()
        ctx.arc(hx + 14, hy + 6, 15, -0.9, 0.9)
        ctx.stroke()
        ctx.restore()
      }
      return true
    }

    /* 11. จิ้งหรีดนักดนตรี (Fiddlehop) — ดิน · แมลง · ประชิด · กลาง · ★1 */
    case 'meadow_fiddlehop': {
      const bounce = action === 'walk' ? Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 4.5 : Math.sin(idlePhase * Math.PI * 2) * 1.8
      const lungeX = isAttack ? [-3, 7, 4, 0][atkIdx] : 0
      const bx = cx + lungeX

      // Translucent cream wings fanned behind shoulders
      for (const sx of [-1, 1]) {
        ctx.save()
        ctx.translate(bx + sx * 6, footY - 56 - bounce)
        ctx.rotate(sx * (isAttack && atkIdx === 1 ? 0.55 : 0.35))
        ctx.fillStyle = 'rgba(254, 243, 214, 0.88)'
        ctx.beginPath()
        ctx.ellipse(sx * 10, 4, 11, 5.2, sx * 0.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }

      // Jointed slate-blue insect legs
      ctx.strokeStyle = INK
      ctx.lineWidth = 3.2
      for (const sx of [-1, 1]) {
        const stride = action === 'walk' ? Math.sin(walkPhase * Math.PI * 2 + (sx > 0 ? Math.PI : 0)) * 7 : 0
        ctx.fillStyle = '#475e80'
        ctx.beginPath()
        ctx.moveTo(bx + sx * 7, footY - 34 - bounce)
        ctx.lineTo(bx + sx * 16, footY - 18 - bounce + stride * 0.4)
        ctx.lineTo(bx + sx * 11, footY - 2 + Math.min(0, stride))
        ctx.stroke()
        ctx.beginPath()
        ctx.ellipse(bx + sx * 11, footY - 1 + Math.min(0, stride), 5, 3, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      ctx.lineWidth = 2.8

      // Upright slate-blue cricket torso + tan chest vest
      ctx.fillStyle = gradV(ctx, bx, footY - 62 - bounce, footY - 28 - bounce, '#6580a6', '#384b69')
      ctx.beginPath()
      ctx.ellipse(bx, footY - 44 - bounce, 14, 18, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      if (!isUp) {
        ctx.fillStyle = '#edd5b1'
        ctx.beginPath()
        ctx.ellipse(bx + faceShift * 0.4, footY - 44 - bounce, 8.5, 13, 0, 0, Math.PI * 2)
        ctx.fill()
      }

      // Cricket head + long curved antennae + golden-amber eyes
      const hx = bx + faceShift * 0.4
      const hy = footY - 72 - bounce
      const antSway = Math.sin((action === 'walk' ? walkPhase : idlePhase) * Math.PI * 2) * 3
      for (const sx of [-1, 1]) {
        ctx.strokeStyle = '#384b69'
        ctx.lineWidth = 2.6
        ctx.beginPath()
        ctx.moveTo(hx + sx * 5, hy - 10)
        ctx.quadraticCurveTo(hx + sx * 16, hy - 26 + antSway, hx + sx * 10, hy - 32 + antSway)
        ctx.stroke()
        ctx.strokeStyle = INK
      }
      ctx.fillStyle = gradV(ctx, hx, hy - 14, hy + 12, '#6985ad', '#3b4e6e')
      ctx.beginPath()
      ctx.ellipse(hx, hy, 14, 12.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      if (!isUp) {
        drawSparkleEye(ctx, hx - 6, hy - 1, 3.6, 4.4, '#f59e0b', false, isAttack)
        drawSparkleEye(ctx, hx + 6, hy - 1, 3.6, 4.4, '#f59e0b', false, isAttack)
      }

      // Wooden bongo drum strapped at waist + twin drumsticks with rhythmic beat!
      if (!isUp) {
        const dx = bx + faceShift * 0.6
        const dy = footY - 31 - bounce
        ctx.fillStyle = gradV(ctx, dx, dy - 9, dy + 11, '#d88c4b', '#8d4d21')
        ctx.beginPath()
        ctx.roundRect(dx - 11, dy - 7, 22, 16, 5)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#faf0d6'
        ctx.beginPath()
        ctx.ellipse(dx, dy - 7, 11, 4.2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Drumstick animation: idle taps alternating L (F1) / R (F3), attack slams both overhead -> down!
        const lTap =
          isAttack
            ? [-0.9, 0.35, 0.25, -0.2][atkIdx]
            : action === 'idle' && f % 4 === 1
              ? 0.32
              : action === 'walk'
                ? Math.sin(walkPhase * Math.PI * 2) * 0.25
                : -0.25
        const rTap =
          isAttack
            ? [-0.9, 0.35, 0.25, -0.2][atkIdx]
            : action === 'idle' && f % 4 === 3
              ? 0.32
              : action === 'walk'
                ? -Math.sin(walkPhase * Math.PI * 2) * 0.25
                : -0.25

        for (const side of [-1, 1]) {
          ctx.save()
          ctx.translate(dx + side * 14, dy - 14)
          ctx.rotate(side * (side < 0 ? lTap : rTap))
          ctx.strokeStyle = '#b46930'
          ctx.lineWidth = 2.6
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(-side * 10, 6)
          ctx.stroke()
          ctx.fillStyle = '#fde68a'
          ctx.strokeStyle = INK
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.arc(-side * 10, 6, 2.6, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          ctx.restore()
        }

        // Musical note on rhythmic drum tap & acoustic wave on attack
        if ((action === 'idle' && (f % 4 === 1 || f % 4 === 3)) || (isAttack && (atkIdx === 1 || atkIdx === 2))) {
          ctx.save()
          ctx.fillStyle = '#fde047'
          ctx.strokeStyle = INK
          ctx.lineWidth = 1.5
          const ny = dy - 22 - (f % 2) * 3
          ctx.beginPath()
          ctx.arc(dx + 16, ny, 3.2, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(dx + 19, ny)
          ctx.lineTo(dx + 19, ny - 9)
          ctx.lineTo(dx + 24, ny - 7)
          ctx.stroke()
          ctx.restore()
        }
        if (isAttack && (atkIdx === 1 || atkIdx === 2)) {
          ctx.save()
          ctx.strokeStyle = '#fbbf24'
          ctx.lineWidth = 2.4
          ctx.beginPath()
          ctx.ellipse(dx, dy - 5, 24, 9, 0, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }
      }
      return true
    }

    /* 12. กระต่ายยักษ์ (Big Hopper) — ไร้ธาตุ · สัตว์ · ตีก่อน · ใหญ่ · ★2 */
    case 'meadow_big_hopper': {
      const bound =
        action === 'walk'
          ? [0, 10, 14, 9, 2, 0][f % 6]
          : isAttack
            ? [0, 11, 5, 0][atkIdx]
            : Math.sin(idlePhase * Math.PI * 2) * 2
      const lungeX = isAttack ? [-4, 12, 7, 0][atkIdx] : 0
      const bx = cx + lungeX

      // Fluffy wild tail
      ctx.fillStyle = '#f8ebd2'
      ctx.beginPath()
      ctx.arc(bx - 22, footY - 24 - bound, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Sturdy clawed hind legs
      ctx.fillStyle = gradV(ctx, bx, footY - 26 - bound, footY - bound, '#cf8831', '#8d5115')
      for (const sx of [-1, 1]) {
        const stride = action === 'walk' ? Math.sin(walkPhase * Math.PI * 2 + (sx > 0 ? 0.8 : 0)) * 5 : 0
        ctx.beginPath()
        ctx.ellipse(bx + sx * 13, footY - 8 - bound + stride * 0.4, 10, 8, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }

      // Muscular golden-tan standing hare torso
      ctx.fillStyle = gradV(ctx, bx, footY - 76 - bound, footY - 10 - bound, '#e39f44', '#9e5f1c')
      ctx.beginPath()
      ctx.ellipse(bx, footY - 38 - bound, 24, 29, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Fluffy cream chest ruff + beaded necklace + gold star pendant
      if (!isUp) {
        const sway = Math.sin((action === 'walk' ? walkPhase : idlePhase) * Math.PI * 2) * 2
        ctx.fillStyle = '#fdf1da'
        ctx.beginPath()
        ctx.ellipse(bx + faceShift * 0.5, footY - 40 - bound, 14, 21, 0, 0, Math.PI * 2)
        ctx.fill()

        // Forepaws with sharp claws
        for (const sx of [-1, 1]) {
          const swing = isAttack && (atkIdx === 1 || atkIdx === 2) ? -10 : 0
          ctx.fillStyle = '#dfa04a'
          ctx.beginPath()
          ctx.ellipse(bx + sx * 20, footY - 40 - bound + swing, 7.5, 11, sx * 0.35, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        }

        // Beaded necklace with big 4-point star
        ctx.fillStyle = '#f59e0b'
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath()
          ctx.arc(bx + i * 5 + faceShift * 0.4, footY - 56 - bound + Math.abs(i) * 1.4, 2.5, 0, Math.PI * 2)
          ctx.fill()
        }
        drawFourPointStar(ctx, bx + faceShift * 0.4 + sway * 0.4, footY - 51 - bound, 7.5, '#fde047', INK, 1.5)
      }

      // Head + tall notched plum-tipped ears + feather earring
      const hx = bx + faceShift * 0.5
      const hy = footY - 78 - bound
      for (const sx of [-1, 1]) {
        ctx.save()
        ctx.translate(hx + sx * 10, hy - 14)
        ctx.rotate(sx * 0.16)
        ctx.fillStyle = '#e39f44'
        ctx.beginPath()
        ctx.ellipse(0, -18, 7.5, 21, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#7b3e68'
        ctx.beginPath()
        ctx.ellipse(0, -32, 5.5, 7, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }
      // Signature feather earring on ear
      drawFeatherCharm(ctx, hx + 16, hy - 22, 0.75, 14)

      ctx.fillStyle = gradV(ctx, hx, hy - 18, hy + 16, '#eba84d', '#a86520')
      ctx.beginPath()
      ctx.ellipse(hx, hy, 20, 17, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      if (!isUp) {
        // Golden crescent moon mark
        ctx.fillStyle = '#fef08a'
        ctx.beginPath()
        ctx.arc(hx, hy - 9, 4.5, 0.3, Math.PI * 1.85)
        ctx.arc(hx + 2, hy - 10, 3.2, Math.PI * 1.85, 0.3, true)
        ctx.closePath()
        ctx.fill()

        drawSparkleEye(ctx, hx - 7.5, hy - 1, 3.6, 4.4, '#92400e', false, true)
        drawSparkleEye(ctx, hx + 7.5, hy - 1, 3.6, 4.4, '#92400e', false, true)
      }

      // Crossed double claw slash VFX on attack
      if (isAttack && (atkIdx === 1 || atkIdx === 2)) {
        ctx.save()
        ctx.strokeStyle = '#fde047'
        ctx.lineWidth = 3.2
        ctx.beginPath()
        ctx.moveTo(hx + 8, hy + 8)
        ctx.lineTo(hx + 34, hy + 34)
        ctx.moveTo(hx + 34, hy + 8)
        ctx.lineTo(hx + 8, hy + 34)
        ctx.stroke()
        ctx.restore()
      }
      return true
    }

    /* 13. มารดาหยดน้ำค้าง (Dewmother) — น้ำ · สไลม์ · แทงก์ · ใหญ่ · ★2 */
    case 'meadow_dewmother': {
      const sqX =
        action === 'walk'
          ? 1 - Math.sin(walkPhase * Math.PI * 2) * 0.1
          : isAttack
            ? [1.14, 0.9, 1.08, 1][atkIdx]
            : 1 + Math.sin(idlePhase * Math.PI * 2) * 0.04
      const sqY = 2 - sqX
      const lungeX = isAttack ? [-3, 9, 5, 0][atkIdx] : 0
      const bx = cx + lungeX
      const sway = Math.sin((action === 'walk' ? walkPhase : idlePhase) * Math.PI * 2) * 3.5

      const rX = 39 * sqX
      const rY = 38 * sqY
      const bodyTopY = footY - rY * 1.92

      // Giant mint-aqua teardrop matriarch body
      const mg = ctx.createRadialGradient(bx - rX * 0.25, footY - rY * 1.15, 6, bx, footY - rY * 0.7, rX * 1.3)
      mg.addColorStop(0, '#d8faef')
      mg.addColorStop(0.35, '#95dfc8')
      mg.addColorStop(0.8, '#5ab6a2')
      mg.addColorStop(1, '#3b8c80')
      ctx.fillStyle = mg
      ctx.beginPath()
      ctx.moveTo(bx - rX, footY - 4)
      ctx.bezierCurveTo(bx - rX * 1.05, footY - rY * 0.9, bx - rX * 0.38, bodyTopY + 12, bx, bodyTopY)
      ctx.bezierCurveTo(bx + rX * 0.38, bodyTopY + 12, bx + rX * 1.05, footY - rY * 0.9, bx + rX, footY - 4)
      ctx.quadraticCurveTo(bx, footY + 7, bx - rX, footY - 4)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Water wave ripple highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
      ctx.beginPath()
      ctx.ellipse(bx - rX * 0.36, footY - rY * 1.05, 6.5, 11, 0.3, 0, Math.PI * 2)
      ctx.fill()

      // Curved lilypad parasol hat with dewdrops & hanging feather charms
      ctx.save()
      ctx.translate(bx, bodyTopY + 2)
      ctx.rotate(sway * 0.018)
      // Curved green lily stem
      ctx.strokeStyle = INK
      ctx.lineWidth = 4.2
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(0, -18, 6, -24)
      ctx.stroke()
      // Wide lilypad canopy
      ctx.fillStyle = gradV(ctx, 0, -34, -14, '#8bc367', '#4f863b')
      ctx.lineWidth = 2.8
      ctx.beginPath()
      ctx.ellipse(4, -24, 34, 11, -0.08, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      // Sparkling blue dewdrops resting on lilypad
      ctx.fillStyle = '#7dd3fc'
      ctx.beginPath()
      ctx.arc(-4, -27, 4.2, 0, Math.PI * 2)
      ctx.arc(10, -25, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      // Hanging feather charms on both ends
      drawFeatherCharm(ctx, -26, -20, 1.35 + sway * 0.04, 13)
      drawFeatherCharm(ctx, 33, -24, 1.7 - sway * 0.04, 13)
      ctx.restore()

      // Beaded gold star necklace draped across torso + gentle face
      if (!isUp) {
        const lx = bx + faceShift * 0.6
        const faceY = footY - rY * 0.92
        const blink = action === 'idle' && f % 4 === 3
        drawSparkleEye(ctx, lx - 10, faceY, 3.6, 4.8, '#134e4a', blink, isAttack)
        drawSparkleEye(ctx, lx + 10, faceY, 3.6, 4.8, '#134e4a', blink, isAttack)
        drawBlush(ctx, lx - 16, faceY + 5, 4.2, 2.3, 'rgba(56, 189, 248, 0.45)')
        drawBlush(ctx, lx + 16, faceY + 5, 4.2, 2.3, 'rgba(56, 189, 248, 0.45)')
        drawSmile(ctx, lx, faceY + 6, 4.5, false)

        // Necklace beads
        const neckY = footY - rY * 0.56
        ctx.fillStyle = '#fde047'
        for (let i = -4; i <= 4; i++) {
          ctx.beginPath()
          ctx.arc(bx + i * 7, neckY + Math.cos(i * 0.4) * 5 - 3, 2.6, 0, Math.PI * 2)
          ctx.fill()
        }
        drawFourPointStar(ctx, bx, neckY + 6, 9, '#fef08a', INK, 1.6)
      }

      // Orbiting water bubbles in idle/walk + tidal splash dome on attack
      for (let i = 0; i < 3; i++) {
        const orbA = (action === 'walk' ? walkPhase : idlePhase) * Math.PI * 2 + (i * Math.PI * 2) / 3
        const ox = bx + Math.cos(orbA) * (rX + 10)
        const oy = footY - rY * 0.95 + Math.sin(orbA) * 14
        ctx.fillStyle = 'rgba(186, 230, 253, 0.78)'
        ctx.strokeStyle = '#0284c7'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.arc(ox, oy, 4.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      if (isAttack && (atkIdx === 1 || atkIdx === 2)) {
        ctx.save()
        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 3.2
        ctx.beginPath()
        ctx.ellipse(bx, footY - 4, 48, 14, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
      return true
    }

    default:
      return false
  }
}
