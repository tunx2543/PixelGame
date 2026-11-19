import {
  drawAttackVfx,
  drawFangMouth,
  drawFourPointStar,
  drawMonsterEye,
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

function drawShellClam(ctx: CanvasRenderingContext2D, m: AnimMotion, kind: 'clam' | 'snail' | 'urchin' | 'jelly' | 'coral') {
  const cx = m.cx + m.lungeX * 0.65
  const hover = kind === 'jelly' || kind === 'urchin' ? Math.sin((m.action === 'walk' ? m.walkPhase : m.idlePhase) * Math.PI * 2) * 5 : 0
  const cy = m.footY - 22 + hover + m.bob * 0.6
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'

  if (kind === 'clam') {
    const gap = m.isAttack ? 12 * m.jawOpen : 4 + m.breath * 2
    ctx.fillStyle = '#d49ea2'
    ctx.beginPath()
    ctx.ellipse(cx, cy + 8, 22, 10, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#4a1d2e'
    ctx.beginPath()
    ctx.ellipse(cx, cy + 4, 17, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f5ebd6'
    ctx.beginPath()
    ctx.ellipse(cx, cy - 2 - gap, 22, 12, -0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (!m.isUp) {
      drawMonsterEye(ctx, cx - 5, cy + 3, 2.5, 3, '#fde047', 'glow')
      drawMonsterEye(ctx, cx + 5, cy + 3, 2.5, 3, '#fde047', 'glow')
    }
  } else if (kind === 'snail') {
    ctx.fillStyle = '#f0d7d9'
    ctx.beginPath()
    ctx.ellipse(cx + 4, cy + 12, 21, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = gradV(ctx, cx - 4, cy - 20, cy + 10, '#f5c2be', '#b56e75')
    ctx.beginPath()
    ctx.arc(cx - 4, cy - 2, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (!m.isUp) {
      drawMonsterEye(ctx, cx + 14, cy + 2, 2.5, 3, '#1e1b4b', 'cute', m.blink)
      drawMonsterEye(ctx, cx + 20, cy + 2, 2.5, 3, '#1e1b4b', 'cute', m.blink)
    }
  } else if (kind === 'urchin') {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + m.spinAngle * 0.25
      ctx.fillStyle = '#f5a98c'
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a - 0.16) * 12, cy + Math.sin(a - 0.16) * 12)
      ctx.lineTo(cx + Math.cos(a) * 23, cy + Math.sin(a) * 23)
      ctx.lineTo(cx + Math.cos(a + 0.16) * 12, cy + Math.sin(a + 0.16) * 12)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    ctx.fillStyle = '#eb947a'
    ctx.beginPath()
    ctx.arc(cx, cy, 13, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    drawMonsterEye(ctx, cx - 4, cy, 2.4, 3, '#7c2d12', 'angry', m.blink)
    drawMonsterEye(ctx, cx + 4, cy, 2.4, 3, '#7c2d12', 'angry', m.blink)
  } else if (kind === 'jelly') {
    for (let i = -2; i <= 2; i++) {
      ctx.save()
      ctx.translate(cx + i * 6, cy + 6)
      ctx.rotate(Math.sin(m.walkPhase * Math.PI * 2 + i) * 0.35)
      ctx.fillStyle = '#c084fc'
      ctx.beginPath()
      ctx.roundRect(-2.5, 0, 5, 16, 2.5)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
    ctx.fillStyle = gradV(ctx, cx, cy - 22, cy + 8, '#7dd3fc', '#3b82f6')
    ctx.beginPath()
    ctx.ellipse(cx, cy - 4, 18, 16, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    drawFourPointStar(ctx, cx, cy - 6, 5, '#fef08a')
  } else {
    // coral reefgrasp
    ctx.fillStyle = '#589c8d'
    ctx.beginPath()
    ctx.roundRect(cx - 16, cy - 12, 32, 30, 10)
    ctx.fill()
    ctx.stroke()
    for (const sx of [-1, 1]) {
      ctx.save()
      ctx.translate(cx + sx * 16, cy - 2)
      ctx.rotate(sx * (m.armSwing + 0.3))
      ctx.fillStyle = '#f5e6c8'
      ctx.beginPath()
      ctx.roundRect(-4, -14, 8, 16, 4)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
    drawFourPointStar(ctx, cx, cy + 2, 4.5, '#fbbf24')
  }
  if (m.isAttack) drawAttackVfx(ctx, cx + 24, cy, m.atkIdx, '#38bdf8', 'water')
  ctx.restore()
}

function drawBoilerhead(ctx: CanvasRenderingContext2D, m: AnimMotion) {
  const cx = m.cx + m.lungeX * 0.65
  const cy = m.footY - 26 + m.bob * 0.7
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'

  for (const [ox, st, lf] of [[-9, m.stepL, m.liftL], [9, m.stepR, m.liftR]]) {
    ctx.fillStyle = '#3b8c80'
    ctx.beginPath()
    ctx.roundRect(cx + ox + st * 0.5 - 4.5, m.footY - 12 - lf, 9, 12, 4)
    ctx.fill()
    ctx.stroke()
  }

  // Kettle spout
  ctx.fillStyle = '#c49844'
  ctx.beginPath()
  ctx.moveTo(cx + 15, cy + 2)
  ctx.lineTo(cx + 28, cy - 8)
  ctx.lineTo(cx + 24, cy + 6)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Kettle torso
  ctx.fillStyle = gradV(ctx, cx, cy - 16, cy + 16, '#5cb5a8', '#2a665d')
  ctx.beginPath()
  ctx.ellipse(cx, cy + 2, 20, 17, m.tilt, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Lid + steam puff
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.ellipse(cx, cy - 15, 13, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,245,235,0.85)'
  ctx.beginPath()
  ctx.arc(cx + 18, cy - 22 - Math.abs(m.bob), 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  drawFourPointStar(ctx, cx, cy + 2, 5, '#fde047')
  if (!m.isUp) {
    drawMonsterEye(ctx, cx + 6, cy - 4, 3.2, 3.8, '#f97316', 'glow', m.blink)
  }
  if (m.isAttack) drawAttackVfx(ctx, cx + 30, cy - 6, m.atkIdx, '#f97316', 'flame')
  ctx.restore()
}

function drawSandmawGlutton(ctx: CanvasRenderingContext2D, m: AnimMotion) {
  const cx = m.cx + m.lungeX * 0.7
  const cy = m.footY - 22 + m.bob * 0.7
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'

  for (const [ox, st] of [[-14, m.stepL], [12, m.stepR]]) {
    ctx.fillStyle = '#d48272'
    ctx.beginPath()
    ctx.ellipse(cx + ox + st * 0.4, m.footY - 5, 8, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  ctx.fillStyle = gradV(ctx, cx, cy - 18, cy + 16, '#f2aba0', '#c46c5e')
  ctx.beginPath()
  ctx.ellipse(cx, cy, 29, 17, m.tilt, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Dorsal sand fins
  ctx.fillStyle = '#d47c6a'
  ctx.beginPath()
  ctx.moveTo(cx - 8, cy - 14)
  ctx.lineTo(cx, cy - 28)
  ctx.lineTo(cx + 8, cy - 14)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Huge gaping jaw
  drawFangMouth(ctx, cx + 17, cy + 2, 22, Math.max(0.55, m.jawOpen))
  drawFourPointStar(ctx, cx - 2, cy - 1, 5, '#fde047')
  if (!m.isUp) {
    drawMonsterEye(ctx, cx + 10, cy - 7, 3.5, 4, '#f59e0b', 'angry', m.blink)
  }
  if (m.isAttack) drawAttackVfx(ctx, cx + 32, cy, m.atkIdx, '#fb923c', 'bite')
  ctx.restore()
}

export function renderMidBiomeMonster(ctx: CanvasRenderingContext2D, id: string, m: AnimMotion): boolean {
  switch (id) {
    // 5. COAST (28)
    case 'coast_drowned_captain':
      renderArthropod(ctx, m, { color: '#b54c3b', accentColor: '#fbbf24', kind: 'ship_crab', pincers: true, scale: 1.14 })
      return true
    case 'coast_shellguard_warlord':
      renderBiped(ctx, m, { skinColor: '#e8785e', armorColor: '#d4493b', accentColor: '#fbbf24', headKind: 'helm', weapon: 'halberd', bodyScale: 1.18, vfxStyle: 'water' })
      return true
    case 'coast_driftmote':
      renderSlime(ctx, m, { color: '#7bc9ba', topper: 'sea_foam', scale: 0.88 })
      return true
    case 'coast_tidestar':
      renderSlime(ctx, m, { color: '#eb7554', accentColor: '#fde047', scale: 0.9 })
      return true
    case 'coast_snapclam':
      drawShellClam(ctx, m, 'clam')
      return true
    case 'coast_crab':
      renderArthropod(ctx, m, { color: '#d95345', accentColor: '#fde047', kind: 'crab', pincers: true, scale: 0.96 })
      return true
    case 'coast_shellback_snail':
      drawShellClam(ctx, m, 'snail')
      return true
    case 'coast_spire_crab':
      renderArthropod(ctx, m, { color: '#c48f6c', accentColor: '#f5c441', kind: 'hermit', pincers: true, scale: 0.96 })
      return true
    case 'coast_inkspurt_squid':
      renderColossusOrUnique(ctx, m, { color: '#e6955a', accentColor: '#fde047', kind: 'squid', eyeKind: 'cute', scale: 0.94 })
      return true
    case 'coast_shell_otter':
      renderQuadruped(ctx, m, { bodyColor: '#e8d7c5', bellyColor: '#fff9f0', earKind: 'round', tailKind: 'fluffy', collarKind: 'scarf', collarColor: '#f43f5e', eyeKind: 'cute', eyeColor: '#1e1b4b', bodyScale: 0.95 })
      return true
    case 'coast_popsphere':
      drawShellClam(ctx, m, 'urchin')
      return true
    case 'coast_deepmaw':
      renderColossusOrUnique(ctx, m, { color: '#589c79', accentColor: '#fbbf24', kind: 'fish', scale: 1.0 })
      return true
    case 'coast_gullwhip':
      renderWinged(ctx, m, { color: '#f0eceb', wingColor: '#e2e8f0', accentColor: '#f59e0b', kind: 'bird', scale: 0.98 })
      return true
    case 'coast_mirefrog':
      renderColossusOrUnique(ctx, m, { color: '#6b7fa6', accentColor: '#fbbf24', kind: 'frog', scale: 1.0 })
      return true
    case 'coast_shredfin':
      renderColossusOrUnique(ctx, m, { color: '#9c788b', accentColor: '#f43f5e', kind: 'fish', scale: 1.02 })
      return true
    case 'coast_bonefin':
      renderColossusOrUnique(ctx, m, { color: '#d4c3cf', accentColor: '#c084fc', kind: 'fish', eyeKind: 'hollow', scale: 1.02 })
      return true
    case 'coast_sea_jelly':
      drawShellClam(ctx, m, 'jelly')
      return true
    case 'coast_rock_turtle':
      renderQuadruped(ctx, m, { bodyColor: '#8f5246', earKind: 'none', snoutKind: 'turtle', backProp: 'rock_shell', tailKind: 'short', eyeColor: '#f59e0b', bodyScale: 1.02 })
      return true
    case 'coast_reefgrasp':
      drawShellClam(ctx, m, 'coral')
      return true
    case 'coast_tentacle_bloom':
      renderColossusOrUnique(ctx, m, { color: '#a8789e', accentColor: '#c084fc', kind: 'squid', scale: 1.02 })
      return true
    case 'coast_lagoon_siren':
      renderBiped(ctx, m, { skinColor: '#fde6d2', armorColor: '#5fbab0', accentColor: '#38bdf8', headKind: 'human', tail: 'fish', eyeKind: 'cute', eyeColor: '#0284c7', bodyScale: 1.0, vfxStyle: 'water' })
      return true
    case 'coast_swamp_gator':
      renderQuadruped(ctx, m, { bodyColor: '#7ea859', bellyColor: '#e2f0cb', earKind: 'none', snoutKind: 'shark', backProp: 'leaf', tailKind: 'whip', eyeColor: '#f59e0b', bodyScale: 1.04 })
      return true
    case 'coast_bladefin':
      renderColossusOrUnique(ctx, m, { color: '#d4746a', accentColor: '#fbbf24', kind: 'fish', scale: 1.04 })
      return true
    case 'coast_reef_lizardman':
      renderBiped(ctx, m, { skinColor: '#6b9459', armorColor: '#8f6b47', accentColor: '#fbbf24', headKind: 'lizard', weapon: 'spear', tail: 'snake', bodyScale: 1.04, vfxStyle: 'water' })
      return true
    case 'coast_deepsong_siren':
      renderBiped(ctx, m, { skinColor: '#fce7f3', armorColor: '#b594bf', accentColor: '#c084fc', headKind: 'human', tail: 'fish', weapon: 'harp', bodyScale: 1.06, vfxStyle: 'magic' })
      return true
    case 'coast_trident_fishman':
      renderBiped(ctx, m, { skinColor: '#846aa6', armorColor: '#574278', accentColor: '#38bdf8', headKind: 'heron', weapon: 'trident', bodyScale: 1.04, vfxStyle: 'water' })
      return true
    case 'coast_drowned_deckhand':
      renderBiped(ctx, m, { skinColor: '#8f6b99', armorColor: '#4c5c4b', accentColor: '#a3e635', headKind: 'skull', weapon: 'sword', bodyScale: 1.02 })
      return true
    case 'coast_tide_elemental':
      renderColossusOrUnique(ctx, m, { color: '#c4c9eb', accentColor: '#38bdf8', kind: 'ghost', eyeKind: 'glow', scale: 1.06 })
      return true

    // 6. CAVE (23)
    case 'cave_beetle':
      renderArthropod(ctx, m, { color: '#395585', accentColor: '#fbbf24', kind: 'beetle', scale: 1.18 })
      return true
    case 'cave_brood_empress':
      renderArthropod(ctx, m, { color: '#ba8cc7', accentColor: '#f59e0b', kind: 'mantis', pincers: true, wings: true, scale: 1.16 })
      return true
    case 'cave_drill_colossus':
      renderColossusOrUnique(ctx, m, { color: '#78464d', accentColor: '#f97316', kind: 'drill', eyeKind: 'glow', scale: 1.18 })
      return true
    case 'cave_burrow_rat':
      renderQuadruped(ctx, m, { bodyColor: '#9c8c96', bellyColor: '#f5e1e6', earKind: 'round', tailKind: 'whip', eyeKind: 'cute', eyeColor: '#f43f5e', bodyScale: 0.85 })
      return true
    case 'cave_honey_ant':
      renderArthropod(ctx, m, { color: '#593d4c', accentColor: '#f59e0b', kind: 'ant', scale: 0.92 })
      return true
    case 'cave_mole':
      renderQuadruped(ctx, m, { bodyColor: '#8f5d52', bellyColor: '#d9b5a6', earKind: 'none', tailKind: 'short', eyeKind: 'cute', eyeColor: '#1e1b4b', bodyScale: 0.9 })
      return true
    case 'cave_pebble_gnome':
      renderBiped(ctx, m, { skinColor: '#fde6d2', armorColor: '#9e6858', accentColor: '#fbbf24', headKind: 'human', hatKind: 'straw', weapon: 'pickaxe', bodyScale: 0.88 })
      return true
    case 'cave_tunnel_ant':
      renderArthropod(ctx, m, { color: '#8c6b64', accentColor: '#d97706', kind: 'ant', scale: 0.94 })
      return true
    case 'cave_duskwing_bat':
      renderWinged(ctx, m, { color: '#7657a6', wingColor: '#4c1d95', accentColor: '#fbbf24', kind: 'bat', scale: 0.92 })
      return true
    case 'cave_iron_blob':
      renderSlime(ctx, m, { color: '#d48a72', topper: 'gear', scale: 0.94 })
      return true
    case 'cave_crystalback':
      renderSlime(ctx, m, { color: '#f0b878', topper: 'crystals', scale: 0.96 })
      return true
    case 'cave_cavern_spider':
      renderArthropod(ctx, m, { color: '#d4cbb8', accentColor: '#f59e0b', kind: 'spider', scale: 0.96 })
      return true
    case 'cave_drillshell':
      renderQuadruped(ctx, m, { bodyColor: '#9c7863', earKind: 'round', backProp: 'rock_shell', tailKind: 'whip', eyeColor: '#fbbf24', bodyScale: 1.0 })
      return true
    case 'cave_snarlhound_raider':
      renderBiped(ctx, m, { skinColor: '#6b4d52', armorColor: '#8c6b5e', accentColor: '#fde047', headKind: 'jackal', weapon: 'bone', bodyScale: 1.0 })
      return true
    case 'cave_boilerhead':
      drawBoilerhead(ctx, m)
      return true
    case 'cave_webweaver':
      renderArthropod(ctx, m, { color: '#a84f3d', accentColor: '#fde047', kind: 'spider', scale: 1.0 })
      return true
    case 'cave_hundredleg':
      renderArthropod(ctx, m, { color: '#944263', accentColor: '#a855f7', kind: 'centipede', legsCount: 12, scale: 1.04 })
      return true
    case 'cave_venom_spinner':
      renderArthropod(ctx, m, { color: '#3f62b5', accentColor: '#a855f7', kind: 'spider', scale: 1.04 })
      return true
    case 'cave_elder_burrower':
      renderArthropod(ctx, m, { color: '#8f5fa6', accentColor: '#fde047', kind: 'centipede', legsCount: 8, scale: 1.04 })
      return true
    case 'cave_mine_skeleton':
      renderBiped(ctx, m, { skinColor: '#ab7659', armorColor: '#8c5a40', accentColor: '#fde047', headKind: 'lantern', weapon: 'pickaxe', bodyScale: 1.02 })
      return true
    case 'cave_dripstone_hulk':
      renderColossusOrUnique(ctx, m, { color: '#94838a', accentColor: '#c084fc', kind: 'golem', scale: 1.12 })
      return true
    case 'cave_labyrinth_bull':
      renderBiped(ctx, m, { skinColor: '#b58d70', armorColor: '#78503c', accentColor: '#fbbf24', headKind: 'goat', weapon: 'hammer', bodyScale: 1.14 })
      return true
    case 'cave_violet_broodqueen':
      renderArthropod(ctx, m, { color: '#8a5ca8', accentColor: '#c084fc', kind: 'mantis', pincers: true, wings: true, scale: 1.12 })
      return true

    // 7. DESERT (23)
    case 'desert_dune_emperor':
      renderBiped(ctx, m, { skinColor: '#5c4d69', armorColor: '#eab308', cloakColor: '#1e1b4b', accentColor: '#fbbf24', headKind: 'human', hatKind: 'pharaoh', weapon: 'staff', robeGown: true, bodyScale: 1.14, vfxStyle: 'magic' })
      return true
    case 'desert_sandmaw_glutton':
      drawSandmawGlutton(ctx, m)
      return true
    case 'desert_solar_tomb_lord':
      renderColossusOrUnique(ctx, m, { color: '#c48f60', accentColor: '#f59e0b', kind: 'golem', eyeKind: 'glow', scale: 1.16 })
      return true
    case 'desert_tomb_king':
      renderBiped(ctx, m, { skinColor: '#78b0ab', armorColor: '#e2d9c8', accentColor: '#fbbf24', headKind: 'heron', hatKind: 'pharaoh', weapon: 'scepter', robeGown: true, bodyScale: 1.16, vfxStyle: 'magic' })
      return true
    case 'desert_sandfiend_sovereign':
      renderBiped(ctx, m, { skinColor: '#6c527a', armorColor: '#b58d52', accentColor: '#fbbf24', headKind: 'jackal', wings: 'bat', wingColor: '#4c3266', weapon: 'sword', bodyScale: 1.18 })
      return true
    case 'desert_sandburrower':
      renderArthropod(ctx, m, { color: '#e6a57e', accentColor: '#fde047', kind: 'centipede', legsCount: 6, scale: 0.9 })
      return true
    case 'desert_dune_viper':
      renderDragonWyrm(ctx, m, { color: '#d47c6a', bellyColor: '#fef3c7', accentColor: '#f59e0b', kind: 'serpent', scale: 0.9 })
      return true
    case 'desert_vulture':
      renderWinged(ctx, m, { color: '#9e6b52', wingColor: '#784e38', accentColor: '#f43f5e', kind: 'bird', scale: 1.0 })
      return true
    case 'desert_frillneck':
      renderQuadruped(ctx, m, { bodyColor: '#78a87e', bellyColor: '#f5c441', earKind: 'none', collarKind: 'feather_ruff', collarColor: '#ea580c', tailKind: 'whip', eyeColor: '#f59e0b', bodyScale: 0.95 })
      return true
    case 'desert_sandsleeper':
      renderQuadruped(ctx, m, { bodyColor: '#d4ab88', earKind: 'none', snoutKind: 'turtle', backProp: 'cactus_shell', tailKind: 'short', eyeKind: 'serene', bodyScale: 0.98 })
      return true
    case 'desert_stingclaw_scorpion':
      renderArthropod(ctx, m, { color: '#cf683e', accentColor: '#a855f7', kind: 'scorpion', stinger: true, pincers: true, scale: 1.0 })
      return true
    case 'desert_dune_wolf':
      renderQuadruped(ctx, m, { bodyColor: '#c49d76', bellyColor: '#fef3c7', earKind: 'wolf', tailKind: 'fluffy', collarKind: 'scarf', collarColor: '#dc2626', eyeColor: '#f59e0b', bodyScale: 0.98 })
      return true
    case 'desert_dune_egg':
      renderSlime(ctx, m, { color: '#cf7d73', topper: 'egg_zigzag', scale: 0.96 })
      return true
    case 'desert_sandchick':
      renderBiped(ctx, m, { skinColor: '#5fa4ba', armorColor: '#48889e', accentColor: '#fbbf24', headKind: 'heron', hatKind: 'straw', eyeKind: 'cute', bodyScale: 0.92 })
      return true
    case 'desert_spinewalker':
      renderColossusOrUnique(ctx, m, { color: '#70a858', accentColor: '#fb7185', kind: 'cactus', scale: 0.98 })
      return true
    case 'desert_linenwalker':
      renderBiped(ctx, m, { skinColor: '#ccb59b', armorColor: '#b59d82', accentColor: '#fde047', headKind: 'mummy', eyeKind: 'glow', eyeColor: '#f59e0b', bodyScale: 0.98 })
      return true
    case 'desert_strider_bird':
      renderWinged(ctx, m, { color: '#4c639c', wingColor: '#fbbf24', accentColor: '#f59e0b', kind: 'bird', scale: 1.0 })
      return true
    case 'desert_fortress_tortoise':
      renderQuadruped(ctx, m, { bodyColor: '#9c685e', earKind: 'none', snoutKind: 'turtle', backProp: 'castle_shell', tailKind: 'short', eyeColor: '#fbbf24', bodyScale: 1.06 })
      return true
    case 'desert_gilded_linenwalker':
      renderBiped(ctx, m, { skinColor: '#d48766', armorColor: '#c4724f', accentColor: '#fde047', headKind: 'mummy', eyeKind: 'glow', eyeColor: '#fbbf24', bodyScale: 1.02 })
      return true
    case 'desert_serpent_dancer':
      renderBiped(ctx, m, { skinColor: '#4aa3a1', armorColor: '#d45f50', accentColor: '#fbbf24', headKind: 'lizard', hatKind: 'leaf_crown', tail: 'snake', weapon: 'tambourine', offhand: 'tambourine', bodyScale: 1.04, vfxStyle: 'magic' })
      return true
    case 'desert_gust_phantom':
      renderColossusOrUnique(ctx, m, { color: '#6b655c', accentColor: '#fbbf24', kind: 'ghost', eyeKind: 'glow', eyeColor: '#fde047', scale: 1.02 })
      return true
    case 'desert_sandstone_colossus':
      renderColossusOrUnique(ctx, m, { color: '#ad8b73', accentColor: '#f59e0b', kind: 'golem', scale: 1.1 })
      return true
    case 'desert_jackal_priest':
      renderBiped(ctx, m, { skinColor: '#8f393e', armorColor: '#b53a3a', cloakColor: '#f5e6c8', accentColor: '#fbbf24', headKind: 'jackal', robeGown: true, weapon: 'staff', bodyScale: 1.1, vfxStyle: 'magic' })
      return true
    default:
      return false
  }
}
