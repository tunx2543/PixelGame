import {
  drawAttackVfx,
  drawBlush,
  drawFangMouth,
  drawFlamePlume,
  drawFourPointStar,
  drawMonsterEye,
  drawWeaponProp,
  drawWingPair,
  gradR,
  gradV,
  INK,
  shadeCol,
  type AnimMotion,
  type EyeKind,
  type WeaponPropKind,
} from './primitives'

/* ============================================================================
 * 1. QUADRUPED / BEAST / HORSE / MAMMOTH / TURTLE / CHIMERA RIG
 * ============================================================================ */

export interface QuadrupedSpec {
  bodyColor: string
  bellyColor?: string
  accentColor?: string
  earKind?: 'cat' | 'wolf' | 'boar' | 'round' | 'horn_ram' | 'horn_bull' | 'goat' | 'none'
  snoutKind?: 'muzzle' | 'boar_tusk' | 'elephant_trunk' | 'turtle' | 'beak' | 'shark' | 'flame_head'
  tailKind?: 'fluffy' | 'curl' | 'whip' | 'flame' | 'serpent' | 'short' | 'horse_flame'
  backProp?:
    | 'none'
    | 'stripes'
    | 'spots'
    | 'quills'
    | 'leaf'
    | 'vines'
    | 'flowers'
    | 'roses'
    | 'rock_shell'
    | 'castle_shell'
    | 'cactus_shell'
    | 'boulder_hide'
    | 'ice_crystals'
    | 'festival_cloth'
    | 'gold_saddle'
    | 'chimera_goat'
    | 'gold_bristles'
  collarKind?: 'none' | 'scarf' | 'feather_ruff' | 'leaf_ruff' | 'star_necklace' | 'mane' | 'gold_collar'
  collarColor?: string
  eyeKind?: EyeKind
  eyeColor?: string
  hasStarMark?: boolean
  bodyScale?: number
  vfxColor?: string
}

export function renderQuadruped(ctx: CanvasRenderingContext2D, m: AnimMotion, s: QuadrupedSpec) {
  const sc = s.bodyScale ?? 1
  const cx = m.cx + m.lungeX * 0.7
  const cy = m.footY - 26 * sc + m.bob * 0.7
  const hi = shadeCol(s.bodyColor, 0.25)
  const dark = shadeCol(s.bodyColor, -0.25)
  const accent = s.accentColor ?? '#f5c441'
  const walkSin = m.action === 'walk' ? Math.sin(m.walkPhase * Math.PI * 2) : 0
  const walkCos = m.action === 'walk' ? Math.cos(m.walkPhase * Math.PI * 2) : 0

  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  // Tail (-x side)
  if (s.tailKind && s.tailKind !== 'short') {
    const tx = cx - 22 * sc
    const ty = cy - 4 * sc
    ctx.save()
    ctx.translate(tx, ty)
    ctx.rotate(m.tailWag)
    if (s.tailKind === 'flame' || s.tailKind === 'horse_flame') {
      ctx.strokeStyle = INK
      ctx.fillStyle = s.bodyColor
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(-12 * sc, -10 * sc, -18 * sc, -16 * sc)
      ctx.lineWidth = 4
      ctx.stroke()
      drawFlamePlume(ctx, -18 * sc, -16 * sc, 0.75 * sc, m.walkPhase + m.idlePhase, accent, '#fde047')
    } else if (s.tailKind === 'serpent') {
      ctx.strokeStyle = dark
      ctx.lineWidth = 6 * sc
      ctx.beginPath()
      ctx.moveTo(0, 2)
      ctx.bezierCurveTo(-18 * sc, 6, -24 * sc, -14 * sc, -16 * sc, -26 * sc)
      ctx.stroke()
      ctx.lineWidth = 2.4
      ctx.strokeStyle = INK
      ctx.fillStyle = '#6b4c7a'
      ctx.beginPath()
      ctx.ellipse(-16 * sc, -28 * sc, 7 * sc, 5 * sc, 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      drawMonsterEye(ctx, -18 * sc, -29 * sc, 2.2, 2.5, '#fde047', 'slit')
    } else if (s.tailKind === 'fluffy' || s.tailKind === 'curl') {
      ctx.fillStyle = gradV(ctx, -10 * sc, -16 * sc, 6 * sc, hi, s.bodyColor)
      ctx.beginPath()
      ctx.ellipse(-12 * sc, -8 * sc, 13 * sc, 8 * sc, -0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      if (s.bellyColor) {
        ctx.fillStyle = s.bellyColor
        ctx.beginPath()
        ctx.ellipse(-17 * sc, -12 * sc, 5.5 * sc, 4 * sc, -0.5, 0, Math.PI * 2)
        ctx.fill()
      }
    } else {
      // whip
      ctx.strokeStyle = INK
      ctx.lineWidth = 4 * sc
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(-14 * sc, -10 * sc, -20 * sc, -4 * sc)
      ctx.stroke()
    }
    ctx.restore()
  }

  // Far-side legs (back & front)
  const legSpread = 15 * sc
  const legW = 7.5 * sc
  const legH = 17 * sc
  const farLegs = [
    { ox: -legSpread, stride: -walkSin * 7, lift: Math.max(0, -walkCos) * 5 },
    { ox: legSpread - 2 * sc, stride: walkSin * 7, lift: Math.max(0, walkCos) * 5 },
  ]
  for (const lg of farLegs) {
    ctx.fillStyle = dark
    ctx.beginPath()
    ctx.roundRect(cx + lg.ox + lg.stride - legW / 2, m.footY - legH - lg.lift, legW, legH, 3.5)
    ctx.fill()
    ctx.stroke()
  }

  // Torso
  const rx = 25 * sc
  const ry = 17 * sc
  ctx.fillStyle = gradV(ctx, cx, cy - ry, cy + ry, hi, dark)
  ctx.beginPath()
  ctx.ellipse(cx - 2 * sc, cy, rx, ry, m.tilt, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Belly patch
  if (s.bellyColor) {
    ctx.fillStyle = s.bellyColor
    ctx.beginPath()
    ctx.ellipse(cx, cy + ry * 0.48, rx * 0.65, ry * 0.42, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Back markings / shells / props
  if (s.backProp === 'stripes') {
    ctx.strokeStyle = shadeCol(s.bodyColor, -0.5)
    ctx.lineWidth = 3 * sc
    for (const sx of [-10, -2, 6]) {
      ctx.beginPath()
      ctx.moveTo(cx + sx * sc, cy - ry * 0.85)
      ctx.lineTo(cx + (sx - 2) * sc, cy - ry * 0.1)
      ctx.stroke()
    }
    ctx.lineWidth = 2.6
    ctx.strokeStyle = INK
  } else if (s.backProp === 'spots') {
    ctx.fillStyle = shadeCol(s.bodyColor, -0.45)
    for (const [ox, oy] of [[-12, -5], [-4, -9], [4, -3], [-8, 3]]) {
      ctx.beginPath()
      ctx.arc(cx + ox * sc, cy + oy * sc, 2.8 * sc, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (s.backProp === 'quills') {
    ctx.fillStyle = shadeCol(s.bodyColor, -0.35)
    for (let i = -3; i <= 2; i++) {
      ctx.beginPath()
      ctx.moveTo(cx + i * 7 * sc - 4, cy - ry * 0.6)
      ctx.lineTo(cx + (i * 7 - 5) * sc, cy - ry * 1.45)
      ctx.lineTo(cx + i * 7 * sc + 5, cy - ry * 0.7)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  } else if (s.backProp === 'gold_bristles') {
    ctx.fillStyle = '#f5b841'
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath()
      ctx.moveTo(cx + i * 7 * sc - 3, cy - ry * 0.7)
      ctx.lineTo(cx + (i * 7 - 3) * sc, cy - ry * 1.45)
      ctx.lineTo(cx + i * 7 * sc + 5, cy - ry * 0.75)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  } else if (s.backProp === 'leaf') {
    ctx.fillStyle = '#e08b4a'
    ctx.beginPath()
    ctx.ellipse(cx - 5 * sc, cy - ry * 0.88, 9 * sc, 4.5 * sc, -0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (s.backProp === 'vines' || s.backProp === 'flowers' || s.backProp === 'roses') {
    ctx.fillStyle = '#629c56'
    ctx.beginPath()
    ctx.ellipse(cx - 4 * sc, cy - ry * 0.6, rx * 0.72, 7 * sc, -0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (s.backProp === 'flowers' || s.backProp === 'roses') {
      const fcol = s.backProp === 'roses' ? '#e85d75' : '#fef3c7'
      for (const fx of [-12, -2, 6]) {
        ctx.fillStyle = fcol
        ctx.beginPath()
        ctx.arc(cx + fx * sc, cy - ry * 0.85, 4.5 * sc, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    }
  } else if (s.backProp === 'rock_shell' || s.backProp === 'castle_shell' || s.backProp === 'cactus_shell' || s.backProp === 'boulder_hide') {
    const shCol = s.backProp === 'castle_shell' ? '#9c685e' : s.backProp === 'boulder_hide' ? '#7d747a' : '#8f5246'
    ctx.fillStyle = gradV(ctx, cx, cy - ry * 1.6, cy + 4, shadeCol(shCol, 0.2), shCol)
    ctx.beginPath()
    ctx.ellipse(cx - 3 * sc, cy - ry * 0.45, rx * 0.9, ry * 0.95, 0, Math.PI, 0)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    if (s.backProp === 'castle_shell') {
      ctx.fillStyle = shadeCol(shCol, 0.15)
      ctx.fillRect(cx - 10 * sc, cy - ry * 1.75, 16 * sc, 9 * sc)
      ctx.strokeRect(cx - 10 * sc, cy - ry * 1.75, 16 * sc, 9 * sc)
    } else if (s.backProp === 'cactus_shell') {
      ctx.fillStyle = '#6ca858'
      ctx.beginPath()
      ctx.roundRect(cx - 7 * sc, cy - ry * 1.75, 10 * sc, 14 * sc, 5)
      ctx.fill()
      ctx.stroke()
    }
  } else if (s.backProp === 'ice_crystals') {
    ctx.fillStyle = '#bae6fd'
    for (const [ox, h] of [[-10, 15], [0, 18], [8, 12]]) {
      ctx.beginPath()
      ctx.moveTo(cx + ox * sc - 4, cy - ry * 0.7)
      ctx.lineTo(cx + ox * sc, cy - ry * 0.7 - h * sc)
      ctx.lineTo(cx + ox * sc + 5, cy - ry * 0.7)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  } else if (s.backProp === 'festival_cloth') {
    ctx.fillStyle = '#d45f50'
    ctx.beginPath()
    ctx.roundRect(cx - rx * 0.75, cy - ry * 0.9, rx * 1.35, ry * 1.15, 6)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#65a36e'
    ctx.fillRect(cx - rx * 0.45, cy - ry * 0.6, rx * 0.75, ry * 0.65)
    ctx.strokeRect(cx - rx * 0.45, cy - ry * 0.6, rx * 0.75, ry * 0.65)
  } else if (s.backProp === 'gold_saddle') {
    ctx.fillStyle = '#c4524c'
    ctx.beginPath()
    ctx.roundRect(cx - 10 * sc, cy - ry, 18 * sc, 11 * sc, 4)
    ctx.fill()
    ctx.stroke()
  } else if (s.backProp === 'chimera_goat') {
    // Goat head sprouting from back!
    const gx = cx - 4 * sc
    const gy = cy - ry * 1.15 - m.breath * 1.5
    ctx.fillStyle = '#d4cbb8'
    ctx.beginPath()
    ctx.ellipse(gx, gy, 9 * sc, 8 * sc, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#9c7863'
      ctx.beginPath()
      ctx.arc(gx + sx * 6 * sc, gy - 8 * sc, 5 * sc, 0, Math.PI)
      ctx.fill()
      ctx.stroke()
    }
    drawMonsterEye(ctx, gx + 2, gy - 1, 2.2, 2.4, '#fde047', 'angry')
  }

  // Near-side legs (back & front)
  const nearLegs = [
    { ox: -legSpread + 4 * sc, stride: walkSin * 8, lift: Math.max(0, walkCos) * 6 },
    { ox: legSpread + 2 * sc, stride: -walkSin * 8 + (m.isAttack ? m.lungeX * 0.4 : 0), lift: Math.max(0, -walkCos) * 6 + (m.isAttack && m.atkIdx === 1 ? 8 : 0) },
  ]
  for (const lg of nearLegs) {
    ctx.fillStyle = gradV(ctx, cx + lg.ox, m.footY - legH, m.footY, s.bodyColor, dark)
    ctx.beginPath()
    ctx.roundRect(cx + lg.ox + lg.stride - legW / 2, m.footY - legH - lg.lift, legW, legH, 3.5)
    ctx.fill()
    ctx.stroke()
    if (s.tailKind === 'horse_flame') {
      drawFlamePlume(ctx, cx + lg.ox + lg.stride, m.footY - 2 - lg.lift, 0.42 * sc, m.idlePhase, '#ef4444', '#fde047')
    }
  }

  // Head
  const hx = cx + (m.isSide ? 17 * sc : 13 * sc) + m.lungeX * 0.25
  const hy = cy - 13 * sc - m.breath * 1.2
  const hr = 14 * sc

  // Collar / mane
  if (s.collarKind && s.collarKind !== 'none') {
    const cCol = s.collarColor ?? '#f5e6c8'
    ctx.fillStyle = cCol
    if (s.collarKind === 'scarf') {
      ctx.beginPath()
      ctx.ellipse(hx - 4 * sc, hy + 10 * sc, 13 * sc, 5.5 * sc, -0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else if (s.collarKind === 'mane' || s.collarKind === 'feather_ruff' || s.collarKind === 'leaf_ruff') {
      for (let i = 0; i < 6; i++) {
        const a = -0.8 + i * 0.45
        ctx.beginPath()
        ctx.ellipse(hx - 4 * sc + Math.cos(a) * 11 * sc, hy + 5 * sc + Math.sin(a) * 9 * sc, 6.5 * sc, 4 * sc, a, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    } else if (s.collarKind === 'gold_collar' || s.collarKind === 'star_necklace') {
      ctx.fillStyle = '#f5c441'
      ctx.beginPath()
      ctx.ellipse(hx - 2 * sc, hy + 11 * sc, 12 * sc, 4 * sc, -0.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      drawFourPointStar(ctx, hx + 6 * sc, hy + 13 * sc, 4.5 * sc)
    }
  }

  // Head shape
  if (s.snoutKind === 'flame_head') {
    drawFlamePlume(ctx, hx, hy + 5 * sc, 1.35 * sc, m.idlePhase + m.walkPhase, '#f97316', '#fef08a')
  } else {
    // Ears / horns behind or top of head
    if (s.earKind === 'cat' || s.earKind === 'wolf') {
      const eh = s.earKind === 'cat' ? 12 * sc : 15 * sc
      for (const sx of [-1, 1]) {
        ctx.fillStyle = s.bodyColor
        ctx.beginPath()
        ctx.moveTo(hx + sx * 4 * sc - 4, hy - hr * 0.7)
        ctx.lineTo(hx + sx * 9 * sc, hy - hr - eh)
        ctx.lineTo(hx + sx * 12 * sc + 2, hy - hr * 0.4)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    } else if (s.earKind === 'horn_ram' || s.earKind === 'horn_bull' || s.earKind === 'goat') {
      ctx.fillStyle = '#8c6b54'
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.arc(hx + sx * 9 * sc, hy - hr * 0.75, 7 * sc, 0, Math.PI * 1.4)
        ctx.lineWidth = 4.5 * sc
        ctx.strokeStyle = INK
        ctx.stroke()
        ctx.lineWidth = 2.6
      }
    } else if (s.earKind === 'round') {
      for (const sx of [-1, 1]) {
        ctx.fillStyle = s.bodyColor
        ctx.beginPath()
        ctx.arc(hx + sx * 10 * sc, hy - hr * 0.72, 5.5 * sc, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    }

    ctx.fillStyle = gradV(ctx, hx, hy - hr, hy + hr, hi, s.bodyColor)
    ctx.beginPath()
    ctx.ellipse(hx, hy, hr * (s.snoutKind === 'shark' ? 1.35 : 1.1), hr * 0.94, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Snout / Trunk / Tusks
    if (s.snoutKind === 'boar_tusk') {
      ctx.fillStyle = '#f2a2a8'
      ctx.beginPath()
      ctx.ellipse(hx + 10 * sc, hy + 4 * sc, 6.5 * sc, 4.5 * sc, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#fff9f0'
      ctx.beginPath()
      ctx.moveTo(hx + 9 * sc, hy + 5 * sc)
      ctx.quadraticCurveTo(hx + 18 * sc, hy + 2 * sc, hx + 16 * sc, hy - 6 * sc)
      ctx.lineTo(hx + 12 * sc, hy + 2 * sc)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else if (s.snoutKind === 'elephant_trunk') {
      ctx.fillStyle = s.bodyColor
      ctx.beginPath()
      ctx.moveTo(hx + 8 * sc, hy + 1)
      ctx.quadraticCurveTo(hx + 20 * sc, hy + 10 * sc, hx + 14 * sc, hy + 22 * sc)
      ctx.lineTo(hx + 9 * sc, hy + 20 * sc)
      ctx.quadraticCurveTo(hx + 13 * sc, hy + 10 * sc, hx + 4 * sc, hy + 5 * sc)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#bae6fd'
      ctx.beginPath()
      ctx.moveTo(hx + 7 * sc, hy + 7 * sc)
      ctx.quadraticCurveTo(hx + 18 * sc, hy + 14 * sc, hx + 20 * sc, hy + 4 * sc)
      ctx.lineTo(hx + 12 * sc, hy + 10 * sc)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else if (s.snoutKind === 'shark' || m.isAttack) {
      drawFangMouth(ctx, hx + 11 * sc, hy + 5 * sc, 14 * sc, m.jawOpen)
    }

    if (!m.isUp) {
      drawMonsterEye(
        ctx,
        hx + 2 * sc,
        hy - 2 * sc,
        3.5 * sc,
        4.4 * sc,
        s.eyeColor ?? accent,
        s.eyeKind ?? 'angry',
        m.blink,
      )
      drawMonsterEye(
        ctx,
        hx + 10 * sc,
        hy - 2 * sc,
        3.1 * sc,
        4 * sc,
        s.eyeColor ?? accent,
        s.eyeKind ?? 'angry',
        m.blink,
      )
      if (s.hasStarMark) {
        drawFourPointStar(ctx, hx + 4 * sc, hy - hr * 0.55, 4.5 * sc, '#fde047')
      }
    }
  }

  if (m.isAttack) {
    drawAttackVfx(ctx, hx + 22 * sc, hy + 4 * sc, m.atkIdx, s.vfxColor ?? accent, 'slash')
  }
  ctx.restore()
}

/* ============================================================================
 * 2. BIPEDAL KNIGHT / MAGE / UNDEAD / SHINOBI / DEMON / WARRIOR RIG
 * ============================================================================ */

export interface BipedSpec {
  skinColor: string
  armorColor: string
  cloakColor?: string
  accentColor?: string
  headKind?: 'human' | 'helm' | 'hood' | 'skull' | 'mummy' | 'mask' | 'jackal' | 'heron' | 'lion' | 'goat' | 'lantern' | 'teapot' | 'headless' | 'jester' | 'oni' | 'lizard'
  hatKind?: 'none' | 'witch' | 'mitre' | 'crown' | 'pharaoh' | 'kabuto' | 'tricorn' | 'straw' | 'bandana' | 'leaf_crown' | 'skull_mask' | 'halo' | 'jester'
  weapon?: WeaponPropKind
  offhand?: WeaponPropKind
  wings?: 'none' | 'feather' | 'bat' | 'flame' | 'crystal'
  wingColor?: string
  tail?: 'none' | 'devil' | 'fish' | 'snake' | 'fox'
  robeGown?: boolean
  banners?: boolean
  eyeKind?: EyeKind
  eyeColor?: string
  bodyScale?: number
  vfxStyle?: 'slash' | 'magic' | 'flame' | 'water'
}

export function renderBiped(ctx: CanvasRenderingContext2D, m: AnimMotion, s: BipedSpec) {
  const sc = s.bodyScale ?? 1
  const cx = m.cx + m.lungeX * 0.65
  const torsoH = 26 * sc
  const legH = s.robeGown ? 8 * sc : 16 * sc
  const torsoY = m.footY - legH - torsoH + m.bob * 0.6
  const accent = s.accentColor ?? '#f5c441'
  const aHi = shadeCol(s.armorColor, 0.24)
  const aDark = shadeCol(s.armorColor, -0.25)

  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  // Back banners (samurai warlord)
  if (s.banners) {
    for (const bx of [-13, -5]) {
      ctx.fillStyle = '#f5ebd6'
      ctx.beginPath()
      ctx.roundRect(cx + bx * sc, torsoY - 28 * sc, 7 * sc, 26 * sc, 2)
      ctx.fill()
      ctx.stroke()
    }
  }

  // Wings behind torso
  if (s.wings && s.wings !== 'none') {
    drawWingPair(ctx, cx, torsoY + 6 * sc, 36 * sc, s.wings, s.wingColor ?? '#f5ebd6', accent, m.wingFlap, m.isSide)
  }

  // Tail behind
  if (s.tail && s.tail !== 'none') {
    ctx.save()
    ctx.translate(cx - 8 * sc, torsoY + torsoH - 2)
    ctx.rotate(m.tailWag)
    if (s.tail === 'fish' || s.tail === 'snake') {
      ctx.fillStyle = s.armorColor
      ctx.beginPath()
      ctx.moveTo(-4 * sc, 0)
      ctx.quadraticCurveTo(-20 * sc, 12 * sc, -26 * sc, 4 * sc)
      ctx.lineTo(-18 * sc, -2 * sc)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else if (s.tail === 'fox') {
      ctx.fillStyle = s.skinColor
      ctx.beginPath()
      ctx.ellipse(-12 * sc, -4 * sc, 13 * sc, 7 * sc, -0.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else {
      ctx.strokeStyle = INK
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(-16 * sc, -4, -18 * sc, -16 * sc)
      ctx.stroke()
      ctx.lineWidth = 2.6
    }
    ctx.restore()
  }

  // Flowing cloak behind
  if (s.cloakColor) {
    ctx.fillStyle = shadeCol(s.cloakColor, -0.15)
    ctx.beginPath()
    ctx.moveTo(cx - 11 * sc, torsoY + 4)
    ctx.lineTo(cx - 18 * sc - Math.abs(m.stepL) * 0.4, m.footY - 2)
    ctx.lineTo(cx + 14 * sc, m.footY - 2)
    ctx.lineTo(cx + 11 * sc, torsoY + 4)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  // Legs
  if (!s.robeGown && s.tail !== 'fish' && s.tail !== 'snake') {
    for (const [ox, st, lf] of [[-7 * sc, m.stepL, m.liftL], [7 * sc, m.stepR, m.liftR]]) {
      ctx.fillStyle = aDark
      ctx.beginPath()
      ctx.roundRect(cx + ox + st * 0.6 - 4.5 * sc, m.footY - legH - lf, 9 * sc, legH, 4)
      ctx.fill()
      ctx.stroke()
    }
  }

  // Back arm + offhand
  ctx.save()
  ctx.translate(cx - 12 * sc, torsoY + 8 * sc)
  ctx.rotate(-m.armSwing)
  ctx.fillStyle = aDark
  ctx.beginPath()
  ctx.roundRect(-4 * sc, 0, 8 * sc, 15 * sc, 4)
  ctx.fill()
  ctx.stroke()
  if (s.offhand) {
    drawWeaponProp(ctx, 0, 14 * sc, s.offhand, 0.2, s.armorColor, accent)
  }
  ctx.restore()

  // Torso / Robe
  ctx.fillStyle = gradV(ctx, cx, torsoY, torsoY + torsoH + (s.robeGown ? 10 : 0), aHi, aDark)
  ctx.beginPath()
  if (s.robeGown) {
    ctx.moveTo(cx - 11 * sc, torsoY)
    ctx.lineTo(cx + 11 * sc, torsoY)
    ctx.lineTo(cx + 17 * sc, m.footY - 1)
    ctx.quadraticCurveTo(cx, m.footY + 3, cx - 17 * sc, m.footY - 1)
    ctx.closePath()
  } else {
    ctx.roundRect(cx - 13 * sc, torsoY, 26 * sc, torsoH, 8 * sc)
  }
  ctx.fill()
  ctx.stroke()

  // Chest trim / Gold star emblem
  drawFourPointStar(ctx, cx, torsoY + 12 * sc, 4.5 * sc, accent)

  // Head
  const hx = cx + (m.isSide ? 2 * sc : 0)
  const hy = torsoY - 13 * sc
  const hr = 13.5 * sc

  if (s.headKind === 'headless') {
    drawFlamePlume(ctx, hx, torsoY - 4 * sc, 0.95 * sc, m.idlePhase + m.walkPhase, '#38bdf8', '#e0f2fe')
  } else if (s.headKind === 'lantern') {
    ctx.fillStyle = '#33282e'
    ctx.beginPath()
    ctx.roundRect(hx - 11 * sc, hy - 13 * sc, 22 * sc, 24 * sc, 4)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fde047'
    ctx.fillRect(hx - 7 * sc, hy - 8 * sc, 14 * sc, 14 * sc)
    ctx.strokeRect(hx - 7 * sc, hy - 8 * sc, 14 * sc, 14 * sc)
  } else if (s.headKind === 'teapot') {
    ctx.fillStyle = gradV(ctx, hx, hy - 14 * sc, hy + 14 * sc, '#f5c441', '#b45309')
    ctx.beginPath()
    ctx.arc(hx, hy, hr * 1.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    // Winding key spinning on back
    ctx.save()
    ctx.translate(hx - 14 * sc, hy - 4 * sc)
    ctx.rotate(m.spinAngle)
    ctx.fillStyle = '#fde047'
    ctx.fillRect(-3, -7, 6, 14)
    ctx.strokeRect(-3, -7, 6, 14)
    ctx.restore()
  } else {
    ctx.fillStyle = s.headKind === 'skull' ? '#f5ebe0' : s.headKind === 'helm' ? aHi : gradV(ctx, hx, hy - hr, hy + hr, shadeCol(s.skinColor, 0.18), s.skinColor)
    ctx.beginPath()
    ctx.ellipse(hx, hy, hr * (s.headKind === 'jackal' || s.headKind === 'heron' ? 0.95 : 1.05), hr, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    if (s.headKind === 'jackal') {
      for (const sx of [-1, 1]) {
        ctx.fillStyle = s.skinColor
        ctx.beginPath()
        ctx.moveTo(hx + sx * 4, hy - hr * 0.7)
        ctx.lineTo(hx + sx * 8, hy - hr - 13 * sc)
        ctx.lineTo(hx + sx * 11, hy - hr * 0.4)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    } else if (s.headKind === 'heron') {
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.moveTo(hx + 8 * sc, hy - 2)
      ctx.lineTo(hx + 22 * sc, hy + 2)
      ctx.lineTo(hx + 8 * sc, hy + 5)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else if (s.headKind === 'goat') {
      ctx.fillStyle = '#785046'
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.arc(hx + sx * 10 * sc, hy - hr * 0.6, 8 * sc, 0, Math.PI * 1.35)
        ctx.lineWidth = 4.5
        ctx.stroke()
        ctx.lineWidth = 2.6
      }
    } else if (s.headKind === 'oni' || s.headKind === 'lion') {
      ctx.fillStyle = s.headKind === 'lion' ? '#f59e0b' : '#f8fafc'
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(hx + sx * 5, hy - hr * 0.7)
        ctx.lineTo(hx + sx * 12, hy - hr - 9 * sc)
        ctx.lineTo(hx + sx * 12, hy - hr * 0.4)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    } else if (s.headKind === 'mummy') {
      ctx.strokeStyle = shadeCol(s.skinColor, -0.35)
      ctx.lineWidth = 1.8
      for (const yOff of [-6, 0, 6]) {
        ctx.beginPath()
        ctx.moveTo(hx - hr * 0.9, hy + yOff)
        ctx.lineTo(hx + hr * 0.9, hy + yOff + 2)
        ctx.stroke()
      }
      ctx.lineWidth = 2.6
      ctx.strokeStyle = INK
    }

    if (!m.isUp) {
      const ek = s.eyeKind ?? (s.headKind === 'skull' ? 'hollow' : s.headKind === 'hood' ? 'glow' : 'angry')
      drawMonsterEye(ctx, hx - 4.5 * sc, hy - 1, 3.1 * sc, 4 * sc, s.eyeColor ?? accent, ek, m.blink)
      drawMonsterEye(ctx, hx + 5.5 * sc, hy - 1, 3.1 * sc, 4 * sc, s.eyeColor ?? accent, ek, m.blink)
    }

    // Hats / Crowns / Hoods
    if (s.hatKind === 'witch' || s.hatKind === 'jester') {
      ctx.fillStyle = s.armorColor
      ctx.beginPath()
      ctx.ellipse(hx, hy - hr * 0.6, 17 * sc, 4.5 * sc, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(hx - 10 * sc, hy - hr * 0.65)
      ctx.lineTo(hx - 2 * sc, hy - hr - 17 * sc)
      ctx.lineTo(hx + 10 * sc, hy - hr * 0.65)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else if (s.hatKind === 'crown') {
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.moveTo(hx - 10 * sc, hy - hr * 0.7)
      ctx.lineTo(hx - 11 * sc, hy - hr - 10 * sc)
      ctx.lineTo(hx - 3 * sc, hy - hr - 4 * sc)
      ctx.lineTo(hx, hy - hr - 13 * sc)
      ctx.lineTo(hx + 3 * sc, hy - hr - 4 * sc)
      ctx.lineTo(hx + 11 * sc, hy - hr - 10 * sc)
      ctx.lineTo(hx + 10 * sc, hy - hr * 0.7)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else if (s.hatKind === 'mitre' || s.hatKind === 'pharaoh') {
      ctx.fillStyle = s.hatKind === 'pharaoh' ? '#eab308' : s.armorColor
      ctx.beginPath()
      ctx.moveTo(hx - 12 * sc, hy - hr * 0.4)
      ctx.lineTo(hx - 8 * sc, hy - hr - 16 * sc)
      ctx.lineTo(hx + 8 * sc, hy - hr - 16 * sc)
      ctx.lineTo(hx + 12 * sc, hy - hr * 0.4)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else if (s.hatKind === 'kabuto' || s.hatKind === 'tricorn' || s.hatKind === 'straw') {
      ctx.fillStyle = s.hatKind === 'straw' ? '#d9a76a' : s.armorColor
      ctx.beginPath()
      ctx.ellipse(hx, hy - hr * 0.68, 17 * sc, 7 * sc, 0, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      if (s.hatKind === 'kabuto') {
        ctx.strokeStyle = '#fbbf24'
        ctx.beginPath()
        ctx.arc(hx, hy - hr - 4 * sc, 7 * sc, 0.2, Math.PI - 0.2)
        ctx.stroke()
        ctx.strokeStyle = INK
      }
    } else if (s.hatKind === 'halo') {
      ctx.strokeStyle = '#fde047'
      ctx.lineWidth = 2.6
      ctx.beginPath()
      ctx.ellipse(hx, hy - hr - 7 * sc, 11 * sc, 3.5 * sc, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = INK
    }
  }

  // Front arm + primary weapon (full swing animation!)
  ctx.save()
  ctx.translate(cx + 12 * sc, torsoY + 8 * sc)
  ctx.rotate(m.armSwing)
  ctx.fillStyle = aHi
  ctx.beginPath()
  ctx.roundRect(-4 * sc, 0, 8 * sc, 15 * sc, 4)
  ctx.fill()
  ctx.stroke()
  if (s.weapon && s.weapon !== 'none') {
    drawWeaponProp(ctx, 2 * sc, 13 * sc, s.weapon, m.weaponAngle, '#e2e8f0', accent)
  }
  ctx.restore()

  if (m.isAttack) {
    drawAttackVfx(ctx, cx + 24 * sc, torsoY + 6 * sc, m.atkIdx, accent, s.vfxStyle ?? 'slash')
  }
  ctx.restore()
}

/* ============================================================================
 * 3. SLIME / BLOB / EGG / PUFF / SKY WHALE / ORB RIG
 * ============================================================================ */

export interface SlimeSpec {
  color: string
  accentColor?: string
  topper?: 'none' | 'star' | 'gear' | 'crystals' | 'snowflake' | 'horns_hat' | 'talisman' | 'whale_fins' | 'egg_zigzag' | 'dragon_egg' | 'crust_cap' | 'cloud_puff' | 'sea_foam'
  eyeKind?: EyeKind
  eyeColor?: string
  scale?: number
}

export function renderSlime(ctx: CanvasRenderingContext2D, m: AnimMotion, s: SlimeSpec) {
  const sc = s.scale ?? 1
  const isEgg = s.topper === 'egg_zigzag' || s.topper === 'dragon_egg'
  const isWhale = s.topper === 'whale_fins'
  const sqX =
    m.action === 'walk'
      ? 1 + Math.sin(m.walkPhase * Math.PI * 4) * 0.1
      : m.isAttack
        ? [1.14, 0.88, 1.08, 1][m.atkIdx]
        : 1 + m.breath * 0.04
  const sqY = 2 - sqX

  const rx = (isWhale ? 28 : isEgg ? 18 : 23) * sc * sqX
  const ry = (isWhale ? 18 : isEgg ? 24 : 18) * sc * sqY
  const cx = m.cx + m.lungeX * 0.7
  const cy = m.footY - ry * 0.9 + (isWhale ? -10 : m.bob * 0.8)
  const hi = shadeCol(s.color, 0.34)
  const dark = shadeCol(s.color, -0.25)
  const accent = s.accentColor ?? '#fde047'

  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'

  if (isWhale) {
    // Flapping whale flippers & tail fluke
    const fy = cy + 2 * sc
    ctx.save()
    ctx.translate(cx - rx * 0.9, fy)
    ctx.rotate(m.tailWag)
    ctx.fillStyle = s.color
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-14 * sc, -10 * sc)
    ctx.lineTo(-10 * sc, 0)
    ctx.lineTo(-14 * sc, 10 * sc)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    drawWingPair(ctx, cx, cy - 2, 24 * sc, 'feather', '#ffffff', accent, m.wingFlap, m.isSide)
  }

  // Body dome
  ctx.fillStyle = gradR(ctx, cx, cy, rx * 1.15, hi, dark)
  ctx.beginPath()
  if (isEgg) {
    ctx.ellipse(cx, cy, rx, ry, m.tilt, 0, Math.PI * 2)
  } else {
    ctx.moveTo(cx - rx, cy + ry * 0.82)
    ctx.quadraticCurveTo(cx - rx * 1.06, cy - ry * 1.08, cx, cy - ry * 1.02)
    ctx.quadraticCurveTo(cx + rx * 1.06, cy - ry * 1.08, cx + rx, cy + ry * 0.82)
    ctx.quadraticCurveTo(cx, cy + ry * 1.02, cx - rx, cy + ry * 0.82)
    ctx.closePath()
  }
  ctx.fill()
  ctx.stroke()

  // Specular jelly highlight
  ctx.fillStyle = 'rgba(255,255,255,0.48)'
  ctx.beginPath()
  ctx.ellipse(cx - rx * 0.32, cy - ry * 0.42, rx * 0.24, ry * 0.14, -0.45, 0, Math.PI * 2)
  ctx.fill()

  // Special toppers & patterns
  if (s.topper === 'gear') {
    ctx.save()
    ctx.translate(cx - 2 * sc, cy - ry * 0.95)
    ctx.rotate(m.spinAngle)
    ctx.fillStyle = '#c48f60'
    ctx.beginPath()
    ctx.arc(0, 0, 8 * sc, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  } else if (s.topper === 'crystals') {
    ctx.fillStyle = '#fb923c'
    for (const [ox, h] of [[-8, 13], [0, 18], [8, 12]]) {
      ctx.beginPath()
      ctx.moveTo(cx + ox * sc - 4, cy - ry * 0.7)
      ctx.lineTo(cx + ox * sc, cy - ry * 0.7 - h * sc)
      ctx.lineTo(cx + ox * sc + 4, cy - ry * 0.7)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  } else if (s.topper === 'snowflake') {
    drawFourPointStar(ctx, cx, cy - ry * 1.05, 8 * sc, '#bae6fd', INK)
  } else if (s.topper === 'horns_hat') {
    ctx.fillStyle = '#6b4d78'
    ctx.beginPath()
    ctx.ellipse(cx, cy - ry * 0.9, rx * 1.15, 7 * sc, -0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    drawFourPointStar(ctx, cx + 6 * sc, cy - ry * 1.05, 4.5 * sc)
  } else if (s.topper === 'talisman') {
    ctx.fillStyle = '#fef3c7'
    ctx.fillRect(cx - 5 * sc, cy - ry * 1.25, 10 * sc, 14 * sc)
    ctx.strokeRect(cx - 5 * sc, cy - ry * 1.25, 10 * sc, 14 * sc)
  } else if (s.topper === 'crust_cap') {
    ctx.fillStyle = '#5c3c47'
    ctx.beginPath()
    ctx.ellipse(cx, cy - ry * 0.72, rx * 0.8, 7 * sc, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (s.topper === 'egg_zigzag') {
    ctx.strokeStyle = '#5fbab0'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(cx - rx * 0.85, cy)
    ctx.lineTo(cx - rx * 0.4, cy - 6)
    ctx.lineTo(cx, cy + 4)
    ctx.lineTo(cx + rx * 0.45, cy - 6)
    ctx.lineTo(cx + rx * 0.85, cy)
    ctx.stroke()
    ctx.lineWidth = 2.6
    ctx.strokeStyle = INK
  }

  if (!m.isUp && !isEgg) {
    const faceX = m.isSide ? 5 * sc : 0
    drawMonsterEye(ctx, cx - 7 * sc + faceX, cy + 1, 3.2 * sc, 4.2 * sc, s.eyeColor ?? '#1e1b4b', s.eyeKind ?? 'cute', m.blink)
    drawMonsterEye(ctx, cx + 7 * sc + faceX, cy + 1, 3.2 * sc, 4.2 * sc, s.eyeColor ?? '#1e1b4b', s.eyeKind ?? 'cute', m.blink)
    if (s.eyeKind !== 'angry') drawBlush(ctx, cx + faceX, cy + 6 * sc)
  }
  drawFourPointStar(ctx, cx + rx * 0.45, cy + 3 * sc, 4 * sc, accent)

  if (m.isAttack) {
    drawAttackVfx(ctx, cx + rx + 10, cy, m.atkIdx, accent, 'water')
  }
  ctx.restore()
}

/* ============================================================================
 * 4. ARTHROPOD (CRAB / BEETLE / SPIDER / SCORPION / CENTIPEDE / MANTIS) RIG
 * ============================================================================ */

export interface ArthropodSpec {
  color: string
  accentColor?: string
  kind: 'crab' | 'hermit' | 'ship_crab' | 'beetle' | 'spider' | 'scorpion' | 'centipede' | 'mantis' | 'ant'
  legsCount?: number
  pincers?: boolean
  stinger?: boolean
  wings?: boolean
  scale?: number
}

export function renderArthropod(ctx: CanvasRenderingContext2D, m: AnimMotion, s: ArthropodSpec) {
  const sc = s.scale ?? 1
  const cx = m.cx + m.lungeX * 0.7
  const cy = m.footY - 22 * sc + m.bob * 0.6
  const hi = shadeCol(s.color, 0.28)
  const dark = shadeCol(s.color, -0.25)
  const accent = s.accentColor ?? '#f5c441'
  const pairs = Math.max(3, Math.floor((s.legsCount ?? (s.kind === 'spider' ? 8 : s.kind === 'centipede' ? 12 : 6)) / 2))

  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  if (s.wings) {
    drawWingPair(ctx, cx, cy - 8 * sc, 34 * sc, 'insect', shadeCol(s.color, 0.45), accent, m.wingFlap, m.isSide)
  }

  // Articulated legs on both sides
  for (let i = 0; i < pairs; i++) {
    const stride = m.action === 'walk' ? Math.sin(m.walkPhase * Math.PI * 2 + i * 1.4) * 5.5 : 0
    for (const sx of [-1, 1]) {
      const lx0 = cx + sx * (12 + (i - pairs * 0.5) * 4) * sc
      const ly0 = cy + 4 * sc
      const kneeX = lx0 + sx * 12 * sc
      const kneeY = ly0 - 7 * sc + stride * 0.5
      const tipX = kneeX + sx * 6 * sc + stride * 0.5
      const tipY = m.footY - Math.max(0, stride * sx)
      ctx.strokeStyle = INK
      ctx.lineWidth = 4.2 * sc
      ctx.beginPath()
      ctx.moveTo(lx0, ly0)
      ctx.lineTo(kneeX, kneeY)
      ctx.lineTo(tipX, tipY)
      ctx.stroke()
      ctx.strokeStyle = dark
      ctx.lineWidth = 2.2 * sc
      ctx.stroke()
    }
  }
  ctx.lineWidth = 2.6
  ctx.strokeStyle = INK

  if (s.kind === 'centipede') {
    for (let i = 4; i >= 0; i--) {
      const sx = cx - i * 9 * sc + m.lungeX * 0.2
      const sy = cy + Math.sin(m.walkPhase * Math.PI * 2 + i) * 3.5
      ctx.fillStyle = gradV(ctx, sx, sy - 11 * sc, sy + 11 * sc, hi, dark)
      ctx.beginPath()
      ctx.ellipse(sx, sy, 10 * sc, 9.5 * sc, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }

  // Raised scorpion stinger tail
  if (s.stinger || s.kind === 'scorpion') {
    const strikeOff = m.isAttack ? [0, 14, 18, 4][m.atkIdx] : 0
    ctx.strokeStyle = INK
    ctx.lineWidth = 6 * sc
    ctx.beginPath()
    ctx.moveTo(cx - 10 * sc, cy - 4 * sc)
    ctx.bezierCurveTo(cx - 26 * sc, cy - 26 * sc, cx - 4 * sc + strikeOff, cy - 38 * sc, cx + 10 * sc + strikeOff, cy - 26 * sc)
    ctx.stroke()
    ctx.strokeStyle = s.color
    ctx.lineWidth = 3.5 * sc
    ctx.stroke()
    ctx.lineWidth = 2.6
    ctx.strokeStyle = INK
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.moveTo(cx + 8 * sc + strikeOff, cy - 28 * sc)
    ctx.lineTo(cx + 18 * sc + strikeOff, cy - 22 * sc)
    ctx.lineTo(cx + 8 * sc + strikeOff, cy - 21 * sc)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  // Carapace / Shell
  if (s.kind === 'ship_crab') {
    // Pirate galleon hull on crab back!
    ctx.fillStyle = '#8b5a3c'
    ctx.beginPath()
    ctx.moveTo(cx - 28 * sc, cy - 6 * sc)
    ctx.lineTo(cx + 28 * sc, cy - 6 * sc)
    ctx.lineTo(cx + 20 * sc, cy + 12 * sc)
    ctx.lineTo(cx - 20 * sc, cy + 12 * sc)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // Mast & tattered sails
    ctx.fillStyle = '#5c3a24'
    ctx.fillRect(cx - 2, cy - 42 * sc, 4, 36 * sc)
    ctx.strokeRect(cx - 2, cy - 42 * sc, 4, 36 * sc)
    ctx.fillStyle = '#f5ebd6'
    ctx.beginPath()
    ctx.roundRect(cx - 18 * sc, cy - 38 * sc, 36 * sc, 18 * sc, 3)
    ctx.fill()
    ctx.stroke()
  } else if (s.kind === 'hermit') {
    ctx.fillStyle = '#c48f6c'
    ctx.beginPath()
    ctx.moveTo(cx - 18 * sc, cy + 6 * sc)
    ctx.lineTo(cx - 4 * sc, cy - 30 * sc)
    ctx.lineTo(cx + 18 * sc, cy + 6 * sc)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  ctx.fillStyle = gradV(ctx, cx, cy - 16 * sc, cy + 14 * sc, hi, dark)
  ctx.beginPath()
  ctx.ellipse(cx, cy + (s.kind === 'ship_crab' ? 8 * sc : 0), 21 * sc, 15 * sc, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  if (s.kind === 'beetle') {
    // Big curved beetle horn!
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.moveTo(cx + 12 * sc, cy - 2)
    ctx.quadraticCurveTo(cx + 28 * sc, cy - 2, cx + 26 * sc, cy - 18 * sc)
    ctx.lineTo(cx + 19 * sc, cy - 8 * sc)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    drawFourPointStar(ctx, cx - 4 * sc, cy - 6 * sc, 4.5 * sc, accent)
  }

  // Snapping pincers / scythes
  if (s.pincers || s.kind === 'crab' || s.kind === 'ship_crab' || s.kind === 'scorpion' || s.kind === 'mantis') {
    const snap = m.isAttack ? [0.2, 0.85, 0.5, 0][m.atkIdx] : Math.sin(m.idlePhase * Math.PI * 2) * 0.15
    for (const sx of [-1, 1]) {
      ctx.save()
      ctx.translate(cx + sx * 19 * sc, cy + 2)
      ctx.rotate(sx * snap)
      ctx.fillStyle = hi
      ctx.beginPath()
      ctx.ellipse(sx * 7 * sc, -4 * sc, 9 * sc, 6 * sc, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
  }

  if (!m.isUp) {
    drawMonsterEye(ctx, cx - 6 * sc, cy - 2 * sc, 3 * sc, 3.8 * sc, accent, 'angry', m.blink)
    drawMonsterEye(ctx, cx + 6 * sc, cy - 2 * sc, 3 * sc, 3.8 * sc, accent, 'angry', m.blink)
  }

  if (m.isAttack) {
    drawAttackVfx(ctx, cx + 26 * sc, cy - 4 * sc, m.atkIdx, accent, 'slash')
  }
  ctx.restore()
}

/* ============================================================================
 * 5. WINGED CREATURE (BEE / MOTH / BIRD / BAT / HARPY / ROTOR / SWORD) RIG
 * ============================================================================ */

export interface WingedSpec {
  color: string
  wingColor?: string
  accentColor?: string
  kind: 'bee' | 'moth' | 'bird' | 'bat' | 'harpy' | 'rotor' | 'orb_eye' | 'sword_float' | 'axe_float' | 'dragonfly'
  scale?: number
}

export function renderWinged(ctx: CanvasRenderingContext2D, m: AnimMotion, s: WingedSpec) {
  const sc = s.scale ?? 1
  const cx = m.cx + m.lungeX * 0.75
  const hover = Math.sin((m.action === 'walk' ? m.walkPhase : m.idlePhase) * Math.PI * 2) * 5
  const cy = m.footY - 30 * sc + hover + m.lungeY
  const accent = s.accentColor ?? '#fbbf24'

  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'

  if (s.kind === 'sword_float' || s.kind === 'axe_float') {
    ctx.save()
    ctx.translate(cx, cy + 10 * sc)
    ctx.rotate(m.weaponAngle * 0.8 + Math.sin(m.idlePhase * Math.PI * 2) * 0.1)
    drawWeaponProp(ctx, 0, 14 * sc, s.kind === 'sword_float' ? 'greatsword' : 'halberd', 0, s.color, accent)
    ctx.restore()
    if (m.isAttack) drawAttackVfx(ctx, cx + 20 * sc, cy, m.atkIdx, accent, 'slash')
    ctx.restore()
    return
  }

  if (s.kind === 'rotor') {
    // Spinning top helicopter blades
    const bw = 26 * sc * Math.cos(m.spinAngle)
    ctx.fillStyle = '#d4a373'
    ctx.beginPath()
    ctx.ellipse(cx, cy - 18 * sc, Math.max(4, Math.abs(bw)), 3.5 * sc, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = gradR(ctx, cx, cy, 16 * sc, shadeCol(s.color, 0.25), shadeCol(s.color, -0.25))
    ctx.beginPath()
    ctx.arc(cx, cy, 16 * sc, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    drawMonsterEye(ctx, cx - 5 * sc, cy, 3.5 * sc, 3.5 * sc, accent, 'glow')
    drawMonsterEye(ctx, cx + 5 * sc, cy, 3.5 * sc, 3.5 * sc, accent, 'glow')
    ctx.restore()
    return
  }

  const wStyle = s.kind === 'bat' || s.kind === 'orb_eye' ? 'bat' : s.kind === 'bee' || s.kind === 'moth' || s.kind === 'dragonfly' ? 'insect' : 'feather'
  drawWingPair(ctx, cx, cy - 4 * sc, (s.kind === 'moth' ? 40 : 34) * sc, wStyle, s.wingColor ?? shadeCol(s.color, 0.35), accent, m.wingFlap, m.isSide)

  // Body
  ctx.fillStyle = gradV(ctx, cx, cy - 15 * sc, cy + 16 * sc, shadeCol(s.color, 0.25), shadeCol(s.color, -0.25))
  ctx.beginPath()
  if (s.kind === 'dragonfly' || s.kind === 'bee') {
    ctx.ellipse(cx - 4 * sc, cy + 2 * sc, 16 * sc, 10 * sc, -0.2, 0, Math.PI * 2)
  } else {
    ctx.ellipse(cx, cy, 15 * sc, 14 * sc, 0, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.stroke()

  if (s.kind === 'bird' || s.kind === 'harpy') {
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.moveTo(cx + 10 * sc, cy - 4 * sc)
    ctx.lineTo(cx + 23 * sc, cy)
    ctx.lineTo(cx + 10 * sc, cy + 5 * sc)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  if (!m.isUp) {
    if (s.kind === 'orb_eye') {
      drawMonsterEye(ctx, cx + 2 * sc, cy, 7 * sc, 7 * sc, accent, 'angry')
    } else {
      drawMonsterEye(ctx, cx - 3 * sc, cy - 2 * sc, 3.2 * sc, 4 * sc, accent, 'angry', m.blink)
      drawMonsterEye(ctx, cx + 6 * sc, cy - 2 * sc, 3.2 * sc, 4 * sc, accent, 'angry', m.blink)
    }
  }

  if (m.isAttack) {
    drawAttackVfx(ctx, cx + 24 * sc, cy, m.atkIdx, accent, s.kind === 'moth' ? 'magic' : 'slash')
  }
  ctx.restore()
}

/* ============================================================================
 * 6. SERPENT / HYDRA / DRAGON / WYVERN RIG
 * ============================================================================ */

export interface DragonSpec {
  color: string
  bellyColor?: string
  accentColor?: string
  kind: 'serpent' | 'hydra' | 'dragon' | 'wyvern'
  heads?: 1 | 3
  winged?: boolean
  scale?: number
  vfxColor?: string
}

export function renderDragonWyrm(ctx: CanvasRenderingContext2D, m: AnimMotion, s: DragonSpec) {
  const sc = s.scale ?? 1
  const cx = m.cx + m.lungeX * 0.6
  const cy = m.footY - 22 * sc + m.bob * 0.6
  const hi = shadeCol(s.color, 0.26)
  const dark = shadeCol(s.color, -0.28)
  const accent = s.accentColor ?? '#f5c441'

  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'

  if (s.winged || s.kind === 'dragon' || s.kind === 'wyvern') {
    drawWingPair(ctx, cx - 4 * sc, cy - 12 * sc, 42 * sc, 'bat', shadeCol(s.color, -0.1), accent, m.wingFlap, m.isSide)
  }

  // Coiled/armored torso
  ctx.fillStyle = gradV(ctx, cx, cy - 18 * sc, cy + 16 * sc, hi, dark)
  ctx.beginPath()
  ctx.ellipse(cx - 2 * sc, cy + 2 * sc, 24 * sc, 15 * sc, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  if (s.bellyColor) {
    ctx.fillStyle = s.bellyColor
    ctx.beginPath()
    ctx.ellipse(cx + 2 * sc, cy + 5 * sc, 15 * sc, 10 * sc, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Legs for dragon/wyvern
  if (s.kind === 'dragon' || s.kind === 'wyvern') {
    for (const [ox, st, lf] of [[-12 * sc, m.stepL, m.liftL], [10 * sc, m.stepR, m.liftR]]) {
      ctx.fillStyle = dark
      ctx.beginPath()
      ctx.roundRect(cx + ox + st * 0.5 - 5 * sc, m.footY - 14 * sc - lf, 10 * sc, 14 * sc, 4)
      ctx.fill()
      ctx.stroke()
    }
  }

  const headCount = s.heads ?? 1
  const headOffsets = headCount === 3 ? [[-14, -22], [0, -28], [14, -20]] : [[10, -22]]
  headOffsets.forEach(([ox, oy], idx) => {
    const wave = Math.sin((m.action === 'walk' ? m.walkPhase : m.idlePhase) * Math.PI * 2 + idx * 1.4) * 3.5
    const hx = cx + ox * sc + (m.isAttack ? m.lungeX * 0.35 : 0)
    const hy = cy + oy * sc + wave

    // Neck
    ctx.strokeStyle = INK
    ctx.lineWidth = 9 * sc
    ctx.beginPath()
    ctx.moveTo(cx + ox * 0.3 * sc, cy - 4 * sc)
    ctx.quadraticCurveTo(cx + ox * 0.5 * sc, cy + oy * 0.5 * sc, hx, hy)
    ctx.stroke()
    ctx.strokeStyle = s.color
    ctx.lineWidth = 5 * sc
    ctx.stroke()
    ctx.lineWidth = 2.6
    ctx.strokeStyle = INK

    // Horns
    ctx.fillStyle = accent
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(hx + sx * 3, hy - 8 * sc)
      ctx.lineTo(hx + sx * 8, hy - 18 * sc)
      ctx.lineTo(hx + sx * 9, hy - 5 * sc)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }

    // Dragon Head
    ctx.fillStyle = gradV(ctx, hx, hy - 11 * sc, hy + 11 * sc, hi, s.color)
    ctx.beginPath()
    ctx.ellipse(hx + 2, hy, 12 * sc, 9.5 * sc, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    if (m.isAttack) {
      drawFangMouth(ctx, hx + 8 * sc, hy + 4 * sc, 10 * sc, m.jawOpen)
    }
    if (!m.isUp) {
      drawMonsterEye(ctx, hx + 5 * sc, hy - 2 * sc, 2.8 * sc, 3.6 * sc, accent, 'slit', m.blink)
    }
  })

  if (m.isAttack) {
    drawAttackVfx(ctx, cx + 28 * sc, cy - 20 * sc, m.atkIdx, s.vfxColor ?? accent, 'flame')
  }
  ctx.restore()
}

/* ============================================================================
 * 7. COLOSSUS / GOLEM / DRILL / ENGINE / CLOCK / MIMIC / GHOST / PLANT RIG
 * ============================================================================ */

export interface ColossusSpec {
  color: string
  accentColor?: string
  kind: 'golem' | 'drill' | 'engine' | 'clock' | 'mimic' | 'tree' | 'cactus' | 'shroom' | 'ghost' | 'frog' | 'fish' | 'squid' | 'frame' | 'totem' | 'igloo'
  eyeKind?: EyeKind
  eyeColor?: string
  scale?: number
}

export function renderColossusOrUnique(ctx: CanvasRenderingContext2D, m: AnimMotion, s: ColossusSpec) {
  const sc = s.scale ?? 1
  const cx = m.cx + m.lungeX * 0.65
  const cy = m.footY - 28 * sc + m.bob * 0.65
  const hi = shadeCol(s.color, 0.25)
  const dark = shadeCol(s.color, -0.25)
  const accent = s.accentColor ?? '#fbbf24'

  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'

  if (s.kind === 'ghost' || s.kind === 'frame') {
    const floatY = m.footY - 32 * sc + Math.sin((m.action === 'walk' ? m.walkPhase : m.idlePhase) * Math.PI * 2) * 5
    if (s.kind === 'frame') {
      // Haunted gilded mirror frame!
      ctx.fillStyle = '#c49844'
      ctx.beginPath()
      ctx.ellipse(cx, floatY, 22 * sc, 27 * sc, m.tilt, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = gradV(ctx, cx, floatY - 22 * sc, floatY + 22 * sc, '#1e293b', '#312e81')
      ctx.beginPath()
      ctx.ellipse(cx, floatY, 16 * sc, 21 * sc, m.tilt, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      drawFourPointStar(ctx, cx, floatY - 4 * sc, 6 * sc, '#fde047')
    } else {
      ctx.fillStyle = gradV(ctx, cx, floatY - 24 * sc, floatY + 24 * sc, hi, dark)
      ctx.beginPath()
      ctx.arc(cx, floatY - 8 * sc, 20 * sc, Math.PI, 0)
      ctx.lineTo(cx + 22 * sc, floatY + 22 * sc)
      ctx.quadraticCurveTo(cx + 10 * sc, floatY + 13 * sc, cx, floatY + 23 * sc)
      ctx.quadraticCurveTo(cx - 10 * sc, floatY + 13 * sc, cx - 22 * sc, floatY + 22 * sc)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      if (!m.isUp) {
        drawMonsterEye(ctx, cx - 6 * sc, floatY - 8 * sc, 3.2 * sc, 4.2 * sc, s.eyeColor ?? accent, s.eyeKind ?? 'glow', m.blink)
        drawMonsterEye(ctx, cx + 6 * sc, floatY - 8 * sc, 3.2 * sc, 4.2 * sc, s.eyeColor ?? accent, s.eyeKind ?? 'glow', m.blink)
      }
    }
    if (m.isAttack) drawAttackVfx(ctx, cx + 22 * sc, floatY, m.atkIdx, accent, 'magic')
    ctx.restore()
    return
  }

  if (s.kind === 'fish' || s.kind === 'squid') {
    const hover = Math.sin((m.action === 'walk' ? m.walkPhase : m.idlePhase) * Math.PI * 2) * 4.5
    const fy = m.footY - 26 * sc + hover
    if (s.kind === 'squid') {
      for (let i = -2; i <= 2; i++) {
        ctx.save()
        ctx.translate(cx + i * 6 * sc, fy + 10 * sc)
        ctx.rotate(Math.sin(m.walkPhase * Math.PI * 2 + i) * 0.35)
        ctx.fillStyle = dark
        ctx.beginPath()
        ctx.roundRect(-2.5, 0, 5, 14 * sc, 2.5)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }
      ctx.fillStyle = gradV(ctx, cx, fy - 18 * sc, fy + 12 * sc, hi, s.color)
      ctx.beginPath()
      ctx.ellipse(cx, fy - 4 * sc, 17 * sc, 16 * sc, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else {
      ctx.save()
      ctx.translate(cx - 20 * sc, fy)
      ctx.rotate(m.tailWag)
      ctx.fillStyle = dark
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-14 * sc, -11 * sc)
      ctx.lineTo(-14 * sc, 11 * sc)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      ctx.fillStyle = gradV(ctx, cx, fy - 15 * sc, fy + 15 * sc, hi, dark)
      ctx.beginPath()
      ctx.ellipse(cx, fy, 22 * sc, 15 * sc, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    if (!m.isUp) {
      drawMonsterEye(ctx, cx + 6 * sc, fy - 3 * sc, 3.6 * sc, 4.2 * sc, accent, s.eyeKind ?? 'angry', m.blink)
    }
    if (m.isAttack) drawFangMouth(ctx, cx + 16 * sc, fy + 3 * sc, 12 * sc, m.jawOpen)
    ctx.restore()
    return
  }

  if (s.kind === 'frog') {
    const hopY = m.action === 'walk' ? -Math.abs(Math.sin(m.walkPhase * Math.PI * 2)) * 9 : m.isAttack ? m.lungeY * 1.4 : 0
    const fy = m.footY - 19 * sc + hopY
    for (const [ox, st] of [[-12 * sc, m.stepL], [12 * sc, m.stepR]]) {
      ctx.fillStyle = dark
      ctx.beginPath()
      ctx.ellipse(cx + ox + st * 0.4, m.footY - 6 + hopY * 0.5, 7 * sc, 5 * sc, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    ctx.fillStyle = gradV(ctx, cx, fy - 16 * sc, fy + 16 * sc, hi, dark)
    ctx.beginPath()
    ctx.ellipse(cx, fy, 20 * sc, 16 * sc, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    drawFourPointStar(ctx, cx, fy + 4 * sc, 4 * sc, accent)
    if (!m.isUp) {
      drawMonsterEye(ctx, cx - 7 * sc, fy - 12 * sc, 4 * sc, 4.5 * sc, accent, 'cute', m.blink)
      drawMonsterEye(ctx, cx + 7 * sc, fy - 12 * sc, 4 * sc, 4.5 * sc, accent, 'cute', m.blink)
    }
    if (m.isAttack) drawAttackVfx(ctx, cx + 22 * sc, fy, m.atkIdx, '#67e8f9', 'water')
    ctx.restore()
    return
  }

  if (s.kind === 'shroom' || s.kind === 'cactus') {
    for (const [ox, st, lf] of [[-7 * sc, m.stepL, m.liftL], [7 * sc, m.stepR, m.liftR]]) {
      ctx.fillStyle = dark
      ctx.beginPath()
      ctx.roundRect(cx + ox + st * 0.6 - 4.5 * sc, m.footY - 11 * sc - lf, 9 * sc, 11 * sc, 4)
      ctx.fill()
      ctx.stroke()
    }
    if (s.kind === 'cactus') {
      ctx.fillStyle = gradV(ctx, cx, cy - 16 * sc, m.footY - 8, hi, dark)
      ctx.beginPath()
      ctx.roundRect(cx - 14 * sc, cy - 12 * sc, 28 * sc, 34 * sc, 13 * sc)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#fb7185'
      ctx.beginPath()
      ctx.arc(cx, cy - 15 * sc, 6.5 * sc, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else {
      ctx.fillStyle = '#fef3c7'
      ctx.beginPath()
      ctx.roundRect(cx - 12 * sc, cy, 24 * sc, 22 * sc, 8)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = gradV(ctx, cx, cy - 22 * sc, cy + 4, hi, dark)
      ctx.beginPath()
      ctx.ellipse(cx, cy - 3 * sc, 26 * sc, 16 * sc, 0, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      drawFourPointStar(ctx, cx - 8 * sc, cy - 11 * sc, 4 * sc, '#fef3c7', null)
      drawFourPointStar(ctx, cx + 7 * sc, cy - 10 * sc, 4 * sc, '#fef3c7', null)
    }
    if (!m.isUp) {
      drawMonsterEye(ctx, cx - 5.5 * sc, cy + 7 * sc, 2.8 * sc, 3.6 * sc, s.eyeColor ?? '#291713', s.eyeKind ?? 'cute', m.blink)
      drawMonsterEye(ctx, cx + 5.5 * sc, cy + 7 * sc, 2.8 * sc, 3.6 * sc, s.eyeColor ?? '#291713', s.eyeKind ?? 'cute', m.blink)
    }
    if (m.isAttack) drawAttackVfx(ctx, cx + 22 * sc, cy, m.atkIdx, accent, 'slash')
    ctx.restore()
    return
  }

  // Heavy Colossus / Drill / Engine / Clock / Tree / Totem / Mimic / Igloo
  for (const [ox, st, lf] of [[-11 * sc, m.stepL, m.liftL], [11 * sc, m.stepR, m.liftR]]) {
    ctx.fillStyle = dark
    ctx.beginPath()
    ctx.roundRect(cx + ox + st * 0.5 - 6 * sc, m.footY - 14 * sc - lf, 12 * sc, 14 * sc, 4)
    ctx.fill()
    ctx.stroke()
  }

  // Torso block
  ctx.fillStyle = gradV(ctx, cx, cy - 22 * sc, cy + 20 * sc, hi, dark)
  ctx.beginPath()
  ctx.roundRect(cx - 21 * sc, cy - 18 * sc, 42 * sc, 36 * sc, s.kind === 'clock' || s.kind === 'igloo' ? 18 * sc : 9 * sc)
  ctx.fill()
  ctx.stroke()

  if (s.kind === 'drill') {
    // Furnace chest grate + twin spinning drills!
    ctx.fillStyle = '#f97316'
    ctx.fillRect(cx - 9 * sc, cy - 7 * sc, 18 * sc, 14 * sc)
    ctx.strokeRect(cx - 9 * sc, cy - 7 * sc, 18 * sc, 14 * sc)
    for (const sx of [-1, 1]) {
      const dx = cx + sx * 24 * sc
      const dy = cy + 2 * sc + (m.isAttack ? sx * 4 : 0)
      ctx.fillStyle = '#a86454'
      ctx.beginPath()
      ctx.moveTo(dx - sx * 6 * sc, dy - 7 * sc)
      ctx.lineTo(dx + sx * 16 * sc, dy)
      ctx.lineTo(dx - sx * 6 * sc, dy + 7 * sc)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  } else if (s.kind === 'clock') {
    // Twin alarm bells bouncing + spinning clock hands!
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.arc(cx + sx * 15 * sc, cy - 20 * sc - Math.abs(m.bob) * 0.5, 7 * sc, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    ctx.fillStyle = '#fff9f0'
    ctx.beginPath()
    ctx.arc(cx, cy - 1 * sc, 12 * sc, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = INK
    ctx.beginPath()
    ctx.moveTo(cx, cy - 1 * sc)
    ctx.lineTo(cx + Math.cos(m.spinAngle) * 8 * sc, cy - 1 * sc + Math.sin(m.spinAngle) * 8 * sc)
    ctx.stroke()
  } else if (s.kind === 'tree') {
    // Hanging iron lanterns swinging from tree arms!
    for (const sx of [-1, 1]) {
      ctx.save()
      ctx.translate(cx + sx * 22 * sc, cy - 14 * sc)
      ctx.rotate(m.tailWag * sx)
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.roundRect(-4 * sc, 4, 8 * sc, 11 * sc, 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
  } else if (s.kind === 'mimic') {
    drawFangMouth(ctx, cx, cy + 2, 24 * sc, Math.max(0.45, m.jawOpen))
  } else {
    // Heavy swinging arms
    for (const sx of [-1, 1]) {
      ctx.save()
      ctx.translate(cx + sx * 22 * sc, cy - 8 * sc)
      ctx.rotate(sx * m.armSwing)
      ctx.fillStyle = hi
      ctx.beginPath()
      ctx.roundRect(-5 * sc, 0, 10 * sc, 20 * sc, 4)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
  }

  if (!m.isUp && s.kind !== 'clock') {
    drawMonsterEye(ctx, cx - 7 * sc, cy - 6 * sc, 3.2 * sc, 4 * sc, s.eyeColor ?? accent, s.eyeKind ?? 'glow', m.blink)
    drawMonsterEye(ctx, cx + 7 * sc, cy - 6 * sc, 3.2 * sc, 4 * sc, s.eyeColor ?? accent, s.eyeKind ?? 'glow', m.blink)
  }

  if (m.isAttack) {
    drawAttackVfx(ctx, cx + 26 * sc, cy, m.atkIdx, accent, 'slash')
  }
  ctx.restore()
}
