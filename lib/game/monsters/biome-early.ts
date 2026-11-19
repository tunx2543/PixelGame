import {
  drawAttackVfx,
  drawBlush,
  drawFangMouth,
  drawFourPointStar,
  drawMonsterEye,
  drawWingPair,
  gradV,
  INK,
  type AnimMotion,
} from './primitives'
import {
  renderArthropod,
  renderBiped,
  renderColossusOrUnique,
  renderDragonWyrm,
  renderQuadruped,
  renderSlime,
  renderWinged,
} from './rigs'

function drawValeStump(ctx: CanvasRenderingContext2D, m: AnimMotion) {
  const cx = m.cx + m.lungeX * 0.65
  const cy = m.footY - 26 + m.bob * 0.65
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'

  // Twisting root feet
  for (const [ox, st, lf] of [[-11, m.stepL, m.liftL], [11, m.stepR, m.liftR]]) {
    ctx.fillStyle = '#755343'
    ctx.beginPath()
    ctx.roundRect(cx + ox + st * 0.5 - 5, m.footY - 12 - lf, 10, 12, 4)
    ctx.fill()
    ctx.stroke()
  }

  // Hollow bark trunk
  ctx.fillStyle = gradV(ctx, cx, cy - 22, cy + 20, '#b58d78', '#6b4738')
  ctx.beginPath()
  ctx.roundRect(cx - 19, cy - 18, 38, 36, 9)
  ctx.fill()
  ctx.stroke()

  // Dark hollow top + sprout
  ctx.fillStyle = '#36211c'
  ctx.beginPath()
  ctx.ellipse(cx, cy - 17, 16, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#fef3c7'
  ctx.beginPath()
  ctx.ellipse(cx + 12, cy - 26, 6, 3, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Glowing hollow eyes
  if (!m.isUp) {
    drawMonsterEye(ctx, cx - 6, cy - 2, 3.2, 4, '#fbbf24', 'hollow', m.blink)
    drawMonsterEye(ctx, cx + 6, cy - 2, 3.2, 4, '#fbbf24', 'hollow', m.blink)
  }

  // Swinging hanging acorn lantern
  ctx.save()
  ctx.translate(cx - 21, cy - 4)
  ctx.rotate(m.tailWag + (m.isAttack ? m.weaponAngle * 0.4 : 0))
  ctx.strokeStyle = INK
  ctx.fillStyle = '#8b4536'
  ctx.beginPath()
  ctx.roundRect(-5, 6, 10, 12, 4)
  ctx.fill()
  ctx.stroke()
  drawFourPointStar(ctx, 0, 12, 3.5, '#fde047')
  ctx.restore()

  if (m.isAttack) drawAttackVfx(ctx, cx + 24, cy, m.atkIdx, '#a3e635', 'slash')
  ctx.restore()
}

function drawBigValeFrog(ctx: CanvasRenderingContext2D, m: AnimMotion) {
  const hop = m.action === 'walk' ? -Math.abs(Math.sin(m.walkPhase * Math.PI * 2)) * 7 : m.isAttack ? m.lungeY : 0
  const cx = m.cx + m.lungeX * 0.65
  const cy = m.footY - 26 + hop + m.bob * 0.4
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'

  for (const [ox, st] of [[-16, m.stepL], [16, m.stepR]]) {
    ctx.fillStyle = '#52854f'
    ctx.beginPath()
    ctx.ellipse(cx + ox + st * 0.35, m.footY - 6 + hop * 0.4, 9, 5.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  // Leaf mantle cloak
  ctx.fillStyle = gradV(ctx, cx, cy - 18, cy + 20, '#3e7355', '#214536')
  ctx.beginPath()
  ctx.ellipse(cx, cy + 4, 29, 20, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Cream frog belly
  ctx.fillStyle = '#efe5c2'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 8, 17, 13, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  drawFourPointStar(ctx, cx, cy - 3, 5, '#fbbf24')

  // Head + leafy crown
  ctx.fillStyle = gradV(ctx, cx, cy - 26, cy, '#96c278', '#52854f')
  ctx.beginPath()
  ctx.ellipse(cx, cy - 11, 20, 14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#2d5c45'
  for (const ox of [-9, 0, 9]) {
    ctx.beginPath()
    ctx.moveTo(cx + ox - 5, cy - 22)
    ctx.lineTo(cx + ox, cy - 32)
    ctx.lineTo(cx + ox + 5, cy - 22)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  if (!m.isUp) {
    drawMonsterEye(ctx, cx - 8, cy - 16, 4, 4.5, '#f59e0b', 'cute', m.blink)
    drawMonsterEye(ctx, cx + 8, cy - 16, 4, 4.5, '#f59e0b', 'cute', m.blink)
  }
  if (m.isAttack) drawAttackVfx(ctx, cx + 26, cy, m.atkIdx, '#67e8f9', 'water')
  ctx.restore()
}

function drawHiveQueen(ctx: CanvasRenderingContext2D, m: AnimMotion) {
  const hover = Math.sin((m.action === 'walk' ? m.walkPhase : m.idlePhase) * Math.PI * 2) * 4.5
  const cx = m.cx + m.lungeX * 0.6
  const cy = m.footY - 28 + hover + m.lungeY
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'

  // Golden honeycomb throne behind
  ctx.fillStyle = gradV(ctx, cx, cy - 36, cy + 20, '#8a5233', '#522c1b')
  ctx.beginPath()
  ctx.roundRect(cx - 28, cy - 28, 56, 48, 12)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#fbbf24'
  for (const [hx, hy] of [[-14, -14], [14, -14], [-14, 4], [14, 4]]) {
    ctx.beginPath()
    ctx.arc(cx + hx, cy + hy, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  // Insect wings
  drawWingPair(ctx, cx, cy - 12, 34, 'insect', '#fef3c7', '#f59e0b', m.wingFlap, m.isSide)

  // Queen abdomen & royal thorax
  ctx.fillStyle = '#78350f'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 9, 15, 11, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.ellipse(cx, cy - 2, 12, 11, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Queen head + crown
  ctx.fillStyle = '#fde6d2'
  ctx.beginPath()
  ctx.arc(cx, cy - 16, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.moveTo(cx - 8, cy - 24)
  ctx.lineTo(cx - 9, cy - 32)
  ctx.lineTo(cx, cy - 26)
  ctx.lineTo(cx + 9, cy - 32)
  ctx.lineTo(cx + 8, cy - 24)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  if (!m.isUp) {
    drawMonsterEye(ctx, cx - 4, cy - 16, 2.6, 3.4, '#d97706', 'cute', m.blink)
    drawMonsterEye(ctx, cx + 4, cy - 16, 2.6, 3.4, '#d97706', 'cute', m.blink)
  }
  if (m.isAttack) drawAttackVfx(ctx, cx + 26, cy - 6, m.atkIdx, '#fbbf24', 'magic')
  ctx.restore()
}

function drawPitcherMaw(ctx: CanvasRenderingContext2D, m: AnimMotion) {
  const bounce = m.action === 'walk' ? -Math.abs(Math.sin(m.walkPhase * Math.PI * 2)) * 6 : m.bob
  const cx = m.cx + m.lungeX * 0.7
  const cy = m.footY - 22 + bounce
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'

  // Pitcher pot body
  ctx.fillStyle = gradV(ctx, cx, cy - 14, cy + 20, '#f0a65b', '#b85c38')
  ctx.beginPath()
  ctx.ellipse(cx, cy + 4, 22, 18, m.tilt, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Leaf lid flapping open when attacking!
  ctx.save()
  ctx.translate(cx - 10, cy - 12)
  ctx.rotate(m.isAttack ? -0.9 * m.jawOpen : -0.25 + m.breath * 0.08)
  ctx.fillStyle = '#7ea859'
  ctx.beginPath()
  ctx.ellipse(12, -4, 15, 7, -0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  // Creamy rim + teeth + eyes
  ctx.fillStyle = '#fef3c7'
  ctx.beginPath()
  ctx.ellipse(cx, cy - 10, 17, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  drawFangMouth(ctx, cx, cy - 9, 18, Math.max(0.4, m.jawOpen))
  drawFourPointStar(ctx, cx, cy + 7, 4.5, '#fde047')
  if (!m.isUp) {
    drawMonsterEye(ctx, cx - 7, cy - 1, 3, 3.6, '#7c3aed', 'angry', m.blink)
    drawMonsterEye(ctx, cx + 7, cy - 1, 3, 3.6, '#7c3aed', 'angry', m.blink)
  }
  if (m.isAttack) drawAttackVfx(ctx, cx + 22, cy - 8, m.atkIdx, '#c084fc', 'bite')
  ctx.restore()
}

function drawBlossomPlant(ctx: CanvasRenderingContext2D, m: AnimMotion, kind: 'sunface' | 'flytrap' | 'gape' | 'rootwail') {
  const cx = m.cx + m.lungeX * 0.65
  const cy = m.footY - 24 + m.bob * 0.7
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'

  for (const [ox, st, lf] of [[-6, m.stepL, m.liftL], [6, m.stepR, m.liftR]]) {
    ctx.fillStyle = kind === 'rootwail' ? '#9c7894' : '#52854f'
    ctx.beginPath()
    ctx.roundRect(cx + ox + st * 0.5 - 3.5, m.footY - 12 - lf, 7, 12, 3)
    ctx.fill()
    ctx.stroke()
  }

  if (kind === 'sunface') {
    ctx.fillStyle = '#f5b841'
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + m.idlePhase * 0.3
      ctx.beginPath()
      ctx.ellipse(cx + Math.cos(a) * 14, cy - 8 + Math.sin(a) * 14, 7, 4, a, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    ctx.fillStyle = '#b56e43'
    ctx.beginPath()
    ctx.arc(cx, cy - 8, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (!m.isUp) {
      drawMonsterEye(ctx, cx - 3.5, cy - 9, 2.2, 2.8, '#1e1b4b', 'cute', m.blink)
      drawMonsterEye(ctx, cx + 3.5, cy - 9, 2.2, 2.8, '#1e1b4b', 'cute', m.blink)
      drawBlush(ctx, cx, cy - 5, 3, 1.5)
    }
  } else if (kind === 'flytrap') {
    ctx.fillStyle = '#629c56'
    ctx.fillRect(cx - 4, cy - 6, 8, 18)
    ctx.strokeRect(cx - 4, cy - 6, 8, 18)
    ctx.fillStyle = '#ef7d7a'
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.85 + i * 0.42
      ctx.beginPath()
      ctx.ellipse(cx + Math.cos(a) * 14, cy - 10 + Math.sin(a) * 12, 9, 5, a, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    drawFangMouth(ctx, cx, cy - 10, 14, Math.max(0.35, m.jawOpen))
  } else if (kind === 'gape') {
    ctx.fillStyle = '#3b6b54'
    ctx.beginPath()
    ctx.moveTo(cx - 18, cy + 6)
    ctx.quadraticCurveTo(cx, cy - 26, cx + 18, cy + 6)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    drawFangMouth(ctx, cx, cy + 2, 16, Math.max(0.5, m.jawOpen))
  } else {
    // rootwail screaming mandrake bulb
    ctx.fillStyle = gradV(ctx, cx, cy - 22, cy + 12, '#e3bed9', '#9c6e94')
    ctx.beginPath()
    ctx.ellipse(cx, cy - 4, 16, 15, m.tilt, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#629c56'
    ctx.beginPath()
    ctx.ellipse(cx - 7, cy - 20, 8, 4, -0.5, 0, Math.PI * 2)
    ctx.ellipse(cx + 7, cy - 20, 8, 4, 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    drawFangMouth(ctx, cx, cy - 1, 10, m.isAttack ? 1 : 0.7)
    if (!m.isUp) {
      drawMonsterEye(ctx, cx - 5, cy - 9, 2.5, 3.2, '#4c1d95', 'angry', m.blink)
      drawMonsterEye(ctx, cx + 5, cy - 9, 2.5, 3.2, '#4c1d95', 'angry', m.blink)
    }
  }
  if (m.isAttack) drawAttackVfx(ctx, cx + 20, cy - 6, m.atkIdx, '#a3e635', 'sonic')
  ctx.restore()
}

export function renderEarlyBiomeMonster(ctx: CanvasRenderingContext2D, id: string, m: AnimMotion): boolean {
  switch (id) {
    // 2. VALE (7)
    case 'vale_tiger':
      renderQuadruped(ctx, m, { bodyColor: '#ea6c2c', bellyColor: '#f5dec2', accentColor: '#ef4444', earKind: 'cat', tailKind: 'flame', backProp: 'stripes', collarKind: 'leaf_ruff', collarColor: '#e5a98a', hasStarMark: true, bodyScale: 1.16, eyeColor: '#f59e0b' })
      return true
    case 'vale_blob':
      renderSlime(ctx, m, { color: '#8dbb6c', scale: 0.92 })
      return true
    case 'vale_bee':
      renderWinged(ctx, m, { color: '#b54a36', wingColor: '#fce7f3', accentColor: '#fbbf24', kind: 'bee', scale: 0.92 })
      return true
    case 'vale_frog':
      renderColossusOrUnique(ctx, m, { color: '#84ad6f', accentColor: '#fbbf24', kind: 'frog', scale: 0.92 })
      return true
    case 'vale_cap':
      renderColossusOrUnique(ctx, m, { color: '#3b7c8a', accentColor: '#fbbf24', kind: 'shroom', scale: 0.96 })
      return true
    case 'vale_stump':
      drawValeStump(ctx, m)
      return true
    case 'vale_big_frog':
      drawBigValeFrog(ctx, m)
      return true

    // 3. WOODS (1)
    case 'woods_boar':
      renderQuadruped(ctx, m, { bodyColor: '#a65e3a', bellyColor: '#d99e75', earKind: 'boar', snoutKind: 'boar_tusk', backProp: 'leaf', tailKind: 'curl', eyeColor: '#f59e0b', bodyScale: 0.9 })
      return true

    // 4. FOREST (35)
    case 'forest_tusk_champion':
      renderBiped(ctx, m, { skinColor: '#a84438', armorColor: '#9c2d26', accentColor: '#fbbf24', headKind: 'oni', weapon: 'dagger', offhand: 'dagger', bodyScale: 1.15, eyeColor: '#fde047' })
      return true
    case 'forest_blazing_serpent':
      renderDragonWyrm(ctx, m, { color: '#ef5b25', bellyColor: '#fde047', accentColor: '#fbbf24', kind: 'serpent', scale: 1.14, vfxColor: '#f97316' })
      return true
    case 'forest_hive_queen':
      drawHiveQueen(ctx, m)
      return true
    case 'forest_rampage_beast':
      renderQuadruped(ctx, m, { bodyColor: '#a993c7', bellyColor: '#ede9fe', earKind: 'horn_ram', tailKind: 'whip', backProp: 'flowers', collarKind: 'mane', collarColor: '#d8b4fe', bodyScale: 1.18, eyeColor: '#f59e0b' })
      return true
    case 'forest_tusk_overlord':
      renderBiped(ctx, m, { skinColor: '#6b7280', armorColor: '#57534e', accentColor: '#fbbf24', headKind: 'oni', hatKind: 'leaf_crown', weapon: 'hammer', bodyScale: 1.18, eyeColor: '#f97316' })
      return true
    case 'forest_hedgehog':
      renderQuadruped(ctx, m, { bodyColor: '#a66d46', bellyColor: '#f5e1c8', earKind: 'round', backProp: 'quills', tailKind: 'short', eyeKind: 'cute', eyeColor: '#1e1b4b', bodyScale: 0.85 })
      return true
    case 'forest_acorn_squirrel':
      renderQuadruped(ctx, m, { bodyColor: '#b37144', bellyColor: '#f7e5cf', earKind: 'cat', tailKind: 'fluffy', eyeKind: 'cute', eyeColor: '#1e1b4b', bodyScale: 0.86 })
      return true
    case 'forest_coilfang':
      renderDragonWyrm(ctx, m, { color: '#6b9c64', bellyColor: '#e5e0b8', accentColor: '#fbbf24', kind: 'serpent', scale: 0.86, vfxColor: '#a855f7' })
      return true
    case 'forest_tusker_boar':
      renderQuadruped(ctx, m, { bodyColor: '#784130', earKind: 'boar', snoutKind: 'boar_tusk', tailKind: 'curl', eyeColor: '#f59e0b', bodyScale: 0.92 })
      return true
    case 'forest_ringtail':
      renderQuadruped(ctx, m, { bodyColor: '#9c8a7e', bellyColor: '#f5ede4', earKind: 'cat', tailKind: 'fluffy', eyeKind: 'cute', eyeColor: '#1e1b4b', bodyScale: 0.9 })
      return true
    case 'forest_sunface':
      drawBlossomPlant(ctx, m, 'sunface')
      return true
    case 'forest_pollenwing':
      renderWinged(ctx, m, { color: '#f5d4aa', wingColor: '#fde68a', accentColor: '#f97316', kind: 'moth', scale: 0.98 })
      return true
    case 'forest_pitcher_maw':
      drawPitcherMaw(ctx, m)
      return true
    case 'forest_sticky_flytrap':
      drawBlossomPlant(ctx, m, 'flytrap')
      return true
    case 'forest_gapebloom':
      drawBlossomPlant(ctx, m, 'gape')
      return true
    case 'forest_hornshell_beetle':
      renderArthropod(ctx, m, { color: '#8f3439', accentColor: '#fbbf24', kind: 'beetle', scale: 0.98 })
      return true
    case 'forest_tusklet':
      renderBiped(ctx, m, { skinColor: '#6b9150', armorColor: '#85583a', accentColor: '#a3e635', headKind: 'human', weapon: 'spear', bodyScale: 0.9 })
      return true
    case 'forest_mask_goblin':
      renderBiped(ctx, m, { skinColor: '#a3484c', armorColor: '#8f3b40', cloakColor: '#782f34', accentColor: '#fde047', headKind: 'mask', weapon: 'club', bodyScale: 0.92 })
      return true
    case 'forest_greymane_wolf':
      renderQuadruped(ctx, m, { bodyColor: '#737d9c', bellyColor: '#e2e8f0', earKind: 'wolf', tailKind: 'fluffy', collarKind: 'mane', collarColor: '#94a3b8', eyeColor: '#fbbf24', bodyScale: 1.0 })
      return true
    case 'forest_tumbler_monkey':
      renderBiped(ctx, m, { skinColor: '#b84b40', armorColor: '#d98a5f', accentColor: '#fbbf24', headKind: 'human', tail: 'fox', eyeKind: 'cute', eyeColor: '#1e1b4b', bodyScale: 0.88 })
      return true
    case 'forest_thornpaw_cat':
      renderQuadruped(ctx, m, { bodyColor: '#c45262', bellyColor: '#fce7f3', earKind: 'cat', tailKind: 'whip', backProp: 'roses', collarKind: 'scarf', collarColor: '#f472b6', eyeColor: '#fde047', bodyScale: 0.96 })
      return true
    case 'forest_rootwail':
      drawBlossomPlant(ctx, m, 'rootwail')
      return true
    case 'forest_misttail_fox':
      renderQuadruped(ctx, m, { bodyColor: '#67b0bd', bellyColor: '#f8fafc', earKind: 'wolf', tailKind: 'fluffy', eyeColor: '#38bdf8', bodyScale: 0.96 })
      return true
    case 'forest_spotted_stalker':
      renderQuadruped(ctx, m, { bodyColor: '#d98e48', bellyColor: '#fef3c7', earKind: 'cat', backProp: 'spots', tailKind: 'whip', eyeColor: '#f59e0b', bodyScale: 1.02 })
      return true
    case 'forest_bladearm_mantis':
      renderArthropod(ctx, m, { color: '#7ea65b', accentColor: '#bef264', kind: 'mantis', pincers: true, scale: 1.0 })
      return true
    case 'forest_tusk_warrior':
      renderBiped(ctx, m, { skinColor: '#7c8c5e', armorColor: '#6e503d', accentColor: '#fbbf24', headKind: 'oni', weapon: 'axe', bodyScale: 1.02 })
      return true
    case 'forest_bramble_bear':
      renderQuadruped(ctx, m, { bodyColor: '#7d6e6d', bellyColor: '#c7b8b5', earKind: 'round', backProp: 'vines', tailKind: 'short', eyeColor: '#f59e0b', bodyScale: 1.05 })
      return true
    case 'forest_petal_wraith':
      renderBiped(ctx, m, { skinColor: '#fce7d6', armorColor: '#9dc47e', cloakColor: '#7fa864', accentColor: '#fbbf24', headKind: 'human', hatKind: 'leaf_crown', robeGown: true, bodyScale: 1.04, eyeKind: 'cute', eyeColor: '#166534', vfxStyle: 'magic' })
      return true
    case 'forest_logbound_giant':
      renderColossusOrUnique(ctx, m, { color: '#8f8479', accentColor: '#84cc16', kind: 'golem', scale: 1.12 })
      return true
    case 'forest_lone_packlord':
      renderQuadruped(ctx, m, { bodyColor: '#c45a3d', bellyColor: '#f5d4b8', earKind: 'wolf', tailKind: 'fluffy', collarKind: 'mane', collarColor: '#e59a73', eyeColor: '#fbbf24', bodyScale: 1.12 })
      return true
    case 'forest_moonfeather_baron':
      renderBiped(ctx, m, { skinColor: '#e9d8f5', armorColor: '#8f72a8', cloakColor: '#6d5087', accentColor: '#fde047', headKind: 'heron', weapon: 'sword', wings: 'feather', wingColor: '#ddd6fe', bodyScale: 1.08 })
      return true
    case 'forest_skimmer_king':
      renderWinged(ctx, m, { color: '#394f85', wingColor: '#fbbf24', accentColor: '#fde047', kind: 'moth', scale: 1.15 })
      return true
    case 'forest_vinemane_beast':
      renderQuadruped(ctx, m, { bodyColor: '#6b9463', bellyColor: '#d9edd2', earKind: 'wolf', backProp: 'vines', collarKind: 'leaf_ruff', collarColor: '#86efac', tailKind: 'whip', eyeColor: '#f59e0b', bodyScale: 1.12 })
      return true
    case 'forest_barkmaiden':
      renderBiped(ctx, m, { skinColor: '#946350', armorColor: '#7d5044', cloakColor: '#52854f', accentColor: '#a3e635', headKind: 'human', hatKind: 'leaf_crown', robeGown: true, weapon: 'staff', bodyScale: 1.08, vfxStyle: 'magic' })
      return true
    case 'forest_moonfeather_duke':
      renderBiped(ctx, m, { skinColor: '#e2e8f0', armorColor: '#377a8c', cloakColor: '#1e4e5c', accentColor: '#38bdf8', headKind: 'heron', weapon: 'staff', wings: 'feather', wingColor: '#bae6fd', robeGown: true, bodyScale: 1.12, vfxStyle: 'magic' })
      return true
    default:
      return false
  }
}
