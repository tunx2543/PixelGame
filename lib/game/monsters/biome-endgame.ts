import {
  drawAttackVfx,
  drawFlamePlume,
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

function drawCinderSkull(ctx: CanvasRenderingContext2D, m: AnimMotion) {
  const hover = Math.sin((m.action === 'walk' ? m.walkPhase : m.idlePhase) * Math.PI * 2) * 4.5
  const cx = m.cx + m.lungeX * 0.7
  const cy = m.footY - 26 + hover + m.lungeY
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'

  drawFlamePlume(ctx, cx, cy - 8, 1.5, m.idlePhase + m.walkPhase, '#ef4444', '#fde047')
  ctx.fillStyle = '#fde6d2'
  ctx.beginPath()
  ctx.arc(cx, cy + 2, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#f5ebe0'
  ctx.fillRect(cx - 8, cy + 12, 16, 8)
  ctx.strokeRect(cx - 8, cy + 12, 16, 8)

  if (!m.isUp) {
    drawMonsterEye(ctx, cx - 5.5, cy + 1, 3.6, 4.2, '#f97316', 'hollow', m.blink)
    drawMonsterEye(ctx, cx + 5.5, cy + 1, 3.6, 4.2, '#f97316', 'hollow', m.blink)
  }
  if (m.isAttack) drawAttackVfx(ctx, cx + 22, cy, m.atkIdx, '#f97316', 'flame')
  ctx.restore()
}

function drawInfernoEngine(ctx: CanvasRenderingContext2D, m: AnimMotion) {
  const cx = m.cx + m.lungeX * 0.65
  const cy = m.footY - 24 + m.bob * 0.6
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'

  for (const [ox, st, lf] of [[-17, m.stepL, m.liftL], [17, m.stepR, m.liftR]]) {
    ctx.fillStyle = '#8c6b5e'
    ctx.beginPath()
    ctx.roundRect(cx + ox + st * 0.5 - 5, m.footY - 14 - lf, 10, 14, 4)
    ctx.fill()
    ctx.stroke()
  }

  // Round dome furnace
  ctx.fillStyle = gradV(ctx, cx, cy - 18, cy + 16, '#b56e65', '#6e3633')
  ctx.beginPath()
  ctx.ellipse(cx, cy, 26, 19, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Glowing coal grate + chimney
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.roundRect(cx - 10, cy - 1, 20, 11, 3)
  ctx.fill()
  ctx.stroke()
  drawFourPointStar(ctx, cx, cy - 12, 4.5, '#fde047')
  if (m.isAttack) drawAttackVfx(ctx, cx + 26, cy, m.atkIdx, '#f97316', 'flame')
  ctx.restore()
}

function drawCloudSage(ctx: CanvasRenderingContext2D, m: AnimMotion) {
  const hover = Math.sin((m.action === 'walk' ? m.walkPhase : m.idlePhase) * Math.PI * 2) * 5
  const cx = m.cx + m.lungeX * 0.65
  const cy = m.footY - 26 + hover
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'

  // Nimbus cloud under sage
  ctx.fillStyle = '#e0e7ff'
  for (const [ox, r] of [[-14, 11], [0, 14], [14, 11]]) {
    ctx.beginPath()
    ctx.arc(cx + ox, cy + 12, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  // Robed bearded sage sitting on cloud
  ctx.fillStyle = '#8c707a'
  ctx.beginPath()
  ctx.roundRect(cx - 13, cy - 12, 26, 22, 8)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#fde6d2'
  ctx.beginPath()
  ctx.arc(cx, cy - 16, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // Fluffy white beard
  ctx.fillStyle = '#f8fafc'
  ctx.beginPath()
  ctx.ellipse(cx, cy - 8, 9, 8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // Pointed sage hood
  ctx.fillStyle = '#6e525d'
  ctx.beginPath()
  ctx.moveTo(cx - 13, cy - 18)
  ctx.lineTo(cx + 2, cy - 34)
  ctx.lineTo(cx + 14, cy - 18)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  if (!m.isUp) {
    drawMonsterEye(ctx, cx - 3.5, cy - 17, 2.2, 2.2, '#1e1b4b', 'serene')
    drawMonsterEye(ctx, cx + 3.5, cy - 17, 2.2, 2.2, '#1e1b4b', 'serene')
  }
  if (m.isAttack) drawAttackVfx(ctx, cx + 22, cy - 6, m.atkIdx, '#93c5fd', 'magic')
  ctx.restore()
}

export function renderEndgameBiomeMonster(ctx: CanvasRenderingContext2D, id: string, m: AnimMotion): boolean {
  switch (id) {
    // 12. VOLCANO (18)
    case 'volcano_inferno_sovereign':
      renderBiped(ctx, m, { skinColor: '#f97316', armorColor: '#cf422b', cloakColor: '#7f1d1d', accentColor: '#fde047', headKind: 'oni', hatKind: 'crown', weapon: 'greatsword', bodyScale: 1.2, vfxStyle: 'flame' })
      return true
    case 'volcano_glasscrag':
      renderSlime(ctx, m, { color: '#5c3c4f', accentColor: '#fb923c', topper: 'crystals', eyeKind: 'glow', eyeColor: '#fbbf24', scale: 0.94 })
      return true
    case 'volcano_flamefist':
      renderBiped(ctx, m, { skinColor: '#a8475c', armorColor: '#ef4444', accentColor: '#fbbf24', headKind: 'oni', wings: 'flame', wingColor: '#f97316', bodyScale: 0.94, vfxStyle: 'flame' })
      return true
    case 'volcano_magma_blob':
      renderSlime(ctx, m, { color: '#eb7a34', accentColor: '#fde047', topper: 'crust_cap', scale: 0.94 })
      return true
    case 'volcano_cinderpup':
      renderQuadruped(ctx, m, { bodyColor: '#6b403b', bellyColor: '#f97316', earKind: 'wolf', tailKind: 'flame', collarKind: 'scarf', collarColor: '#fbbf24', eyeColor: '#f97316', bodyScale: 0.96 })
      return true
    case 'volcano_lava_scorpion':
      renderArthropod(ctx, m, { color: '#cf6e34', accentColor: '#fde047', kind: 'scorpion', stinger: true, pincers: true, scale: 1.0 })
      return true
    case 'volcano_emberwisp':
      renderColossusOrUnique(ctx, m, { color: '#78507d', accentColor: '#f472b6', kind: 'ghost', eyeKind: 'glow', eyeColor: '#fde047', scale: 0.98 })
      return true
    case 'volcano_ember_hound':
      renderQuadruped(ctx, m, { bodyColor: '#c44d47', bellyColor: '#fde68a', earKind: 'wolf', tailKind: 'flame', collarKind: 'mane', collarColor: '#f97316', eyeColor: '#fde047', bodyScale: 1.04 })
      return true
    case 'volcano_kindle_imp':
      renderBiped(ctx, m, { skinColor: '#d44c32', armorColor: '#9c2d26', accentColor: '#fde047', headKind: 'oni', tail: 'devil', weapon: 'trident', bodyScale: 0.98, vfxStyle: 'flame' })
      return true
    case 'volcano_cinder_skull':
      drawCinderSkull(ctx, m)
      return true
    case 'volcano_pyre_fiend':
      renderBiped(ctx, m, { skinColor: '#8f4f73', armorColor: '#6b3654', accentColor: '#fb923c', headKind: 'oni', tail: 'devil', weapon: 'staff', bodyScale: 1.02, vfxStyle: 'flame' })
      return true
    case 'volcano_magma_hulk':
      renderColossusOrUnique(ctx, m, { color: '#593d47', accentColor: '#f97316', kind: 'golem', eyeKind: 'glow', eyeColor: '#fde047', scale: 1.1 })
      return true
    case 'volcano_inferno_engine':
      drawInfernoEngine(ctx, m)
      return true
    case 'volcano_hellfire_steed':
      renderQuadruped(ctx, m, { bodyColor: '#473e47', earKind: 'wolf', tailKind: 'horse_flame', collarKind: 'mane', collarColor: '#f97316', eyeColor: '#fde047', bodyScale: 1.12 })
      return true
    case 'volcano_flamecrest_lizard':
      renderQuadruped(ctx, m, { bodyColor: '#9c2c2b', bellyColor: '#fca5a5', earKind: 'none', collarKind: 'feather_ruff', collarColor: '#ef4444', tailKind: 'whip', eyeColor: '#fde047', bodyScale: 1.1 })
      return true
    case 'volcano_pyre_dancer':
      renderBiped(ctx, m, { skinColor: '#fde6d2', armorColor: '#e65b25', cloakColor: '#b91c1c', accentColor: '#fde047', headKind: 'human', robeGown: true, weapon: 'parasol', bodyScale: 1.1, vfxStyle: 'flame' })
      return true
    case 'volcano_ashen_mule':
      renderQuadruped(ctx, m, { bodyColor: '#8f7078', snoutKind: 'flame_head', backProp: 'gold_saddle', tailKind: 'whip', bodyScale: 1.08 })
      return true
    case 'volcano_threefold_beast':
      renderQuadruped(ctx, m, { bodyColor: '#8c5a54', bellyColor: '#e6c8ba', earKind: 'cat', backProp: 'chimera_goat', collarKind: 'mane', collarColor: '#733e38', tailKind: 'serpent', eyeColor: '#fde047', bodyScale: 1.14 })
      return true

    // 13. SKY (23)
    case 'sky_gale_knight':
      renderBiped(ctx, m, { skinColor: '#e2e8f0', armorColor: '#9c8ac7', cloakColor: '#5b4b8a', accentColor: '#fbbf24', headKind: 'helm', wings: 'feather', wingColor: '#f5f3ff', weapon: 'spear', bodyScale: 1.16 })
      return true
    case 'sky_winged_arbiter':
      renderBiped(ctx, m, { skinColor: '#f5dec2', armorColor: '#e0c5b5', cloakColor: '#b58d78', accentColor: '#fbbf24', headKind: 'lion', hatKind: 'halo', wings: 'feather', wingColor: '#ffffff', weapon: 'sword', offhand: 'scales', bodyScale: 1.18 })
      return true
    case 'sky_pebble_puff':
      renderSlime(ctx, m, { color: '#ebdcb9', accentColor: '#fbbf24', topper: 'cloud_puff', scale: 0.9 })
      return true
    case 'sky_bigbeak':
      renderWinged(ctx, m, { color: '#de5b4c', wingColor: '#fca5a5', accentColor: '#fbbf24', kind: 'bird', scale: 0.92 })
      return true
    case 'sky_needlewing_lancer':
      renderWinged(ctx, m, { color: '#e69c5c', wingColor: '#fef3c7', accentColor: '#fbbf24', kind: 'dragonfly', scale: 0.98 })
      return true
    case 'sky_puffseed':
      renderWinged(ctx, m, { color: '#cfc4e3', wingColor: '#ffffff', accentColor: '#fbbf24', kind: 'moth', scale: 0.98 })
      return true
    case 'sky_false_seraph':
      renderWinged(ctx, m, { color: '#8f6e78', wingColor: '#e2e8f0', accentColor: '#fbbf24', kind: 'bird', scale: 1.0 })
      return true
    case 'sky_crag_goat':
      renderQuadruped(ctx, m, { bodyColor: '#e8d5c0', earKind: 'goat', collarKind: 'mane', collarColor: '#fffbeb', tailKind: 'short', eyeColor: '#f59e0b', bodyScale: 1.0 })
      return true
    case 'sky_galehound':
      renderQuadruped(ctx, m, { bodyColor: '#d97852', bellyColor: '#fef3c7', earKind: 'wolf', tailKind: 'fluffy', eyeColor: '#fde047', bodyScale: 1.0 })
      return true
    case 'sky_spinrotor':
      renderWinged(ctx, m, { color: '#6b7d59', accentColor: '#fbbf24', kind: 'rotor', scale: 1.0 })
      return true
    case 'sky_wyrmkit':
      renderDragonWyrm(ctx, m, { color: '#db6e6e', bellyColor: '#fecaca', accentColor: '#fbbf24', kind: 'dragon', winged: true, scale: 0.96 })
      return true
    case 'sky_haloblob':
      renderSlime(ctx, m, { color: '#6eb5e8', accentColor: '#fde047', topper: 'whale_fins', scale: 1.08 })
      return true
    case 'sky_gale_hawk':
      renderWinged(ctx, m, { color: '#c4524c', wingColor: '#f97316', accentColor: '#fbbf24', kind: 'bird', scale: 1.06 })
      return true
    case 'sky_cloud_sage':
      drawCloudSage(ctx, m)
      return true
    case 'sky_gustfang':
      renderQuadruped(ctx, m, { bodyColor: '#ede5f5', bellyColor: '#ffffff', earKind: 'wolf', tailKind: 'fluffy', collarKind: 'mane', collarColor: '#e9d5ff', eyeColor: '#38bdf8', bodyScale: 1.12 })
      return true
    case 'sky_haven_warden':
      renderBiped(ctx, m, { skinColor: '#f5ebe0', armorColor: '#d4beab', accentColor: '#fbbf24', headKind: 'helm', weapon: 'shield', offhand: 'shield', bodyScale: 1.1 })
      return true
    case 'sky_mercy_warden':
      renderBiped(ctx, m, { skinColor: '#e2e8f0', armorColor: '#b56e75', accentColor: '#fbbf24', headKind: 'helm', wings: 'feather', wingColor: '#fce7f3', weapon: 'lantern', bodyScale: 1.1 })
      return true
    case 'sky_seraph_blob':
      renderSlime(ctx, m, { color: '#ebd07d', accentColor: '#ffffff', topper: 'whale_fins', scale: 1.1 })
      return true
    case 'sky_spear_maiden':
      renderBiped(ctx, m, { skinColor: '#fde6d2', armorColor: '#9c789e', accentColor: '#fbbf24', headKind: 'human', wings: 'feather', wingColor: '#f5f3ff', weapon: 'spear', eyeKind: 'cute', bodyScale: 1.08 })
      return true
    case 'sky_vigil_warden':
      renderBiped(ctx, m, { skinColor: '#f8fafc', armorColor: '#d9b5b2', accentColor: '#fde047', headKind: 'hood', wings: 'feather', wingColor: '#fff1f2', robeGown: true, weapon: 'scepter', bodyScale: 1.1, vfxStyle: 'magic' })
      return true
    case 'sky_wrath_warden':
      renderBiped(ctx, m, { skinColor: '#f5ebe0', armorColor: '#a8474c', accentColor: '#fbbf24', headKind: 'helm', wings: 'feather', wingColor: '#fca5a5', weapon: 'greatsword', bodyScale: 1.12, vfxStyle: 'flame' })
      return true
    case 'sky_stormtalon':
      renderQuadruped(ctx, m, { bodyColor: '#9e92a3', earKind: 'none', snoutKind: 'beak', tailKind: 'whip', eyeColor: '#fbbf24', bodyScale: 1.12 })
      return true
    case 'sky_talon_siren':
      renderWinged(ctx, m, { color: '#a84c47', wingColor: '#84cc16', accentColor: '#fbbf24', kind: 'harpy', scale: 1.1 })
      return true

    // 14. ABYSS (11)
    case 'abyss_rift_dragon_king':
      renderDragonWyrm(ctx, m, { color: '#453647', bellyColor: '#b55c78', accentColor: '#fbbf24', kind: 'dragon', winged: true, scale: 1.2, vfxColor: '#c084fc' })
      return true
    case 'abyss_wyrm_egg':
      renderSlime(ctx, m, { color: '#ad7d87', accentColor: '#fde047', topper: 'dragon_egg', scale: 0.94 })
      return true
    case 'abyss_rift_hatchling':
      renderDragonWyrm(ctx, m, { color: '#c48399', bellyColor: '#fef3c7', accentColor: '#fbbf24', kind: 'dragon', scale: 0.92 })
      return true
    case 'abyss_rift_wyvern':
      renderDragonWyrm(ctx, m, { color: '#785a94', bellyColor: '#e9d5ff', accentColor: '#f59e0b', kind: 'wyvern', winged: true, scale: 1.04, vfxColor: '#c084fc' })
      return true
    case 'abyss_wyrmling_runner':
      renderQuadruped(ctx, m, { bodyColor: '#cf8247', bellyColor: '#fef3c7', earKind: 'goat', collarKind: 'gold_collar', tailKind: 'whip', eyeColor: '#fbbf24', bodyScale: 1.02 })
      return true
    case 'abyss_storm_wyrm':
      renderDragonWyrm(ctx, m, { color: '#5c82d4', bellyColor: '#e0f2fe', accentColor: '#fde047', kind: 'wyvern', winged: true, scale: 1.04, vfxColor: '#38bdf8' })
      return true
    case 'abyss_ember_wyrm':
      renderDragonWyrm(ctx, m, { color: '#c94c4c', bellyColor: '#fecaca', accentColor: '#f97316', kind: 'dragon', winged: true, scale: 1.08, vfxColor: '#ef4444' })
      return true
    case 'abyss_wyrm_sage':
      renderBiped(ctx, m, { skinColor: '#c45c63', armorColor: '#a3475c', cloakColor: '#6e2336', accentColor: '#fbbf24', headKind: 'lizard', robeGown: true, weapon: 'staff', bodyScale: 1.04, vfxStyle: 'magic' })
      return true
    case 'abyss_tidemaw_serpent':
      renderDragonWyrm(ctx, m, { color: '#b55c78', bellyColor: '#fce7f3', accentColor: '#fbbf24', kind: 'hydra', heads: 3, scale: 1.14, vfxColor: '#38bdf8' })
      return true
    case 'abyss_rift_knight':
      renderBiped(ctx, m, { skinColor: '#3b1d47', armorColor: '#5c3c6b', cloakColor: '#361f42', accentColor: '#c084fc', headKind: 'helm', weapon: 'greatsword', bodyScale: 1.14, vfxStyle: 'magic' })
      return true
    case 'abyss_twisted_wyrm':
      renderDragonWyrm(ctx, m, { color: '#6b536b', bellyColor: '#d8b4fe', accentColor: '#fbbf24', kind: 'dragon', winged: true, scale: 1.14, vfxColor: '#a855f7' })
      return true

    // 15. WORLD (1)
    case 'world_goat':
      renderBiped(ctx, m, { skinColor: '#5c3c47', armorColor: '#6b3e59', cloakColor: '#3b2433', accentColor: '#fbbf24', headKind: 'goat', robeGown: true, wings: 'feather', wingColor: '#2d1a26', weapon: 'staff', eyeKind: 'glow', eyeColor: '#fbbf24', bodyScale: 1.22, vfxStyle: 'magic' })
      return true
    default:
      return false
  }
}
