import {
  drawAttackVfx,
  drawMonsterEye,
  gradV,
  INK,
  type AnimMotion,
} from './primitives'
import {
  renderArthropod,
  renderBiped,
  renderColossusOrUnique,
  renderQuadruped,
  renderSlime,
  renderWinged,
} from './rigs'

function drawSiegeTower(ctx: CanvasRenderingContext2D, m: AnimMotion, kind: 'siege' | 'engine') {
  const cx = m.cx + m.lungeX * 0.65
  const cy = m.footY - 28 + m.bob * 0.55
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'

  if (kind === 'engine') {
    // Rolling tank treads
    ctx.fillStyle = '#4a3d42'
    ctx.beginPath()
    ctx.roundRect(cx - 22, m.footY - 12, 44, 10, 5)
    ctx.fill()
    ctx.stroke()
    // Cylindrical steam dome + spinning wheel/key
    ctx.fillStyle = gradV(ctx, cx, cy - 26, cy + 16, '#d99e96', '#94524d')
    ctx.beginPath()
    ctx.roundRect(cx - 16, cy - 22, 32, 38, 12)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(cx, cy - 6, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else {
    for (const [ox, st, lf] of [[-9, m.stepL, m.liftL], [9, m.stepR, m.liftR]]) {
      ctx.fillStyle = '#8a7a72'
      ctx.beginPath()
      ctx.roundRect(cx + ox + st * 0.5 - 4, m.footY - 12 - lf, 8, 12, 3)
      ctx.fill()
      ctx.stroke()
    }
    ctx.fillStyle = gradV(ctx, cx, cy - 26, cy + 16, '#c4b5aa', '#857369')
    ctx.fillRect(cx - 14, cy - 16, 28, 32)
    ctx.strokeRect(cx - 14, cy - 16, 28, 32)
    ctx.fillStyle = '#a84742'
    ctx.beginPath()
    ctx.moveTo(cx - 17, cy - 16)
    ctx.lineTo(cx, cy - 32)
    ctx.lineTo(cx + 17, cy - 16)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    drawMonsterEye(ctx, cx, cy - 4, 4, 4, '#ef4444', 'glow')
  }
  if (m.isAttack) drawAttackVfx(ctx, cx + 24, cy, m.atkIdx, '#f97316', 'slash')
  ctx.restore()
}

function drawStonegaze(ctx: CanvasRenderingContext2D, m: AnimMotion) {
  const cx = m.cx + m.lungeX * 0.65
  const cy = m.footY - 26 + m.bob * 0.55
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'

  // Serpentine Medusa tail
  ctx.fillStyle = '#738262'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 16, 22, 8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#8f9e7a'
  ctx.beginPath()
  ctx.roundRect(cx - 10, cy - 4, 20, 20, 6)
  ctx.fill()
  ctx.stroke()

  // Snake hair tendrils swaying
  for (let i = -2; i <= 2; i++) {
    ctx.strokeStyle = '#5c734c'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(cx + i * 4, cy - 18)
    ctx.quadraticCurveTo(cx + i * 9, cy - 26 + Math.sin(m.idlePhase * Math.PI * 2 + i) * 3, cx + i * 11, cy - 32)
    ctx.stroke()
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.5

  ctx.fillStyle = '#d4d9c8'
  ctx.beginPath()
  ctx.arc(cx, cy - 16, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  if (!m.isUp) {
    drawMonsterEye(ctx, cx - 4, cy - 16, 2.5, 3, '#a3e635', 'glow', m.blink)
    drawMonsterEye(ctx, cx + 4, cy - 16, 2.5, 3, '#a3e635', 'glow', m.blink)
  }
  if (m.isAttack) drawAttackVfx(ctx, cx + 22, cy - 10, m.atkIdx, '#a3e635', 'magic')
  ctx.restore()
}

export function renderRuinsBiomeMonster(ctx: CanvasRenderingContext2D, id: string, m: AnimMotion): boolean {
  switch (id) {
    // 11. RUINS (47)
    case 'ruins_clockwork_heir':
      renderBiped(ctx, m, { skinColor: '#fde6d2', armorColor: '#b5874c', cloakColor: '#784e24', accentColor: '#fbbf24', headKind: 'teapot', weapon: 'scepter', bodyScale: 1.16 })
      return true
    case 'ruins_crimson_count':
      renderWinged(ctx, m, { color: '#ab4e61', wingColor: '#e8b5c2', accentColor: '#fbbf24', kind: 'moth', scale: 1.18 })
      return true
    case 'ruins_crimson_swordlady':
      renderBiped(ctx, m, { skinColor: '#fde6e9', armorColor: '#a83645', cloakColor: '#6e1d28', accentColor: '#fbbf24', headKind: 'human', hatKind: 'crown', weapon: 'sword', bodyScale: 1.16 })
      return true
    case 'ruins_doom_colossus':
      renderColossusOrUnique(ctx, m, { color: '#7d5066', accentColor: '#f59e0b', kind: 'golem', eyeKind: 'glow', scale: 1.18 })
      return true
    case 'ruins_mirror_knight':
      renderBiped(ctx, m, { skinColor: '#e2e8f0', armorColor: '#c4b5cf', cloakColor: '#5c4b6e', accentColor: '#fde047', headKind: 'helm', weapon: 'sword', offhand: 'shield', bodyScale: 1.16 })
      return true
    case 'ruins_umbral_colossus':
      renderColossusOrUnique(ctx, m, { color: '#8f6b99', accentColor: '#fde047', kind: 'golem', eyeKind: 'glow', scale: 1.18 })
      return true
    case 'ruins_chestwaw':
      renderColossusOrUnique(ctx, m, { color: '#6b7054', accentColor: '#fbbf24', kind: 'mimic', scale: 0.94 })
      return true
    case 'ruins_gazer_orb':
      renderWinged(ctx, m, { color: '#82576b', wingColor: '#5c3648', accentColor: '#f43f5e', kind: 'orb_eye', scale: 0.94 })
      return true
    case 'ruins_smogwraith':
      renderColossusOrUnique(ctx, m, { color: '#8a68a6', accentColor: '#c084fc', kind: 'ghost', eyeKind: 'glow', scale: 0.92 })
      return true
    case 'ruins_gingerling':
      renderBiped(ctx, m, { skinColor: '#cf9e88', armorColor: '#b37a62', accentColor: '#f472b6', headKind: 'human', weapon: 'lollipop', eyeKind: 'cute', bodyScale: 0.92 })
      return true
    case 'ruins_horned_imp':
      renderBiped(ctx, m, { skinColor: '#3b827a', armorColor: '#2c5c56', accentColor: '#fbbf24', headKind: 'goat', tail: 'devil', bodyScale: 0.96 })
      return true
    case 'ruins_patchwork_bunny':
      renderBiped(ctx, m, { skinColor: '#e6a8a3', armorColor: '#c47d78', accentColor: '#fbbf24', headKind: 'mummy', weapon: 'dagger', bodyScale: 0.98 })
      return true
    case 'ruins_sentry_drone':
      renderWinged(ctx, m, { color: '#8c6b5e', accentColor: '#fbbf24', kind: 'rotor', scale: 0.96 })
      return true
    case 'ruins_rooftop_watcher':
      renderWinged(ctx, m, { color: '#a896a3', wingColor: '#7d6e78', accentColor: '#fbbf24', kind: 'bat', scale: 1.0 })
      return true
    case 'ruins_lanternhead':
      renderBiped(ctx, m, { skinColor: '#fde047', armorColor: '#8f7268', cloakColor: '#5c473f', accentColor: '#fbbf24', headKind: 'lantern', robeGown: true, bodyScale: 1.02 })
      return true
    case 'ruins_hexwitch':
      renderBiped(ctx, m, { skinColor: '#fde6d2', armorColor: '#783c59', cloakColor: '#522239', accentColor: '#ef4444', headKind: 'human', hatKind: 'witch', robeGown: true, weapon: 'broom', bodyScale: 1.02, vfxStyle: 'magic' })
      return true
    case 'ruins_clockwork_maid':
      renderBiped(ctx, m, { skinColor: '#fde6d2', armorColor: '#e6a3a6', accentColor: '#fbbf24', headKind: 'teapot', robeGown: true, weapon: 'dagger', eyeKind: 'cute', bodyScale: 1.0 })
      return true
    case 'ruins_dreamveil_fiend':
      renderBiped(ctx, m, { skinColor: '#4c1d4c', armorColor: '#593654', cloakColor: '#3b1e36', accentColor: '#fbbf24', headKind: 'oni', hatKind: 'jester', tail: 'devil', weapon: 'dagger', bodyScale: 1.02 })
      return true
    case 'ruins_haunted_frame':
      renderColossusOrUnique(ctx, m, { color: '#45598c', accentColor: '#fbbf24', kind: 'frame', scale: 1.04 })
      return true
    case 'ruins_bellclock':
      renderColossusOrUnique(ctx, m, { color: '#b5874c', accentColor: '#fbbf24', kind: 'clock', scale: 1.06 })
      return true
    case 'ruins_hornblob':
      renderSlime(ctx, m, { color: '#9c78b8', accentColor: '#fbbf24', topper: 'horns_hat', scale: 1.06 })
      return true
    case 'ruins_iron_sentinel':
      renderBiped(ctx, m, { skinColor: '#5c6b85', armorColor: '#475569', accentColor: '#38bdf8', headKind: 'helm', weapon: 'musket', bodyScale: 1.02 })
      return true
    case 'ruins_stonegaze':
      drawStonegaze(ctx, m)
      return true
    case 'ruins_echo_assassin':
      renderBiped(ctx, m, { skinColor: '#3b244d', armorColor: '#6b5385', cloakColor: '#4c3863', accentColor: '#38bdf8', headKind: 'hood', weapon: 'dagger', bodyScale: 1.02 })
      return true
    case 'ruins_echo_knight':
      renderBiped(ctx, m, { skinColor: '#475569', armorColor: '#696280', cloakColor: '#464059', accentColor: '#38bdf8', headKind: 'helm', weapon: 'sword', bodyScale: 1.04 })
      return true
    case 'ruins_echo_mage':
      renderBiped(ctx, m, { skinColor: '#3b244d', armorColor: '#543f69', cloakColor: '#382847', accentColor: '#38bdf8', headKind: 'hood', robeGown: true, weapon: 'staff', bodyScale: 1.04, vfxStyle: 'magic' })
      return true
    case 'ruins_echo_priestess':
      renderBiped(ctx, m, { skinColor: '#f3e8ff', armorColor: '#a887a3', cloakColor: '#755972', accentColor: '#38bdf8', headKind: 'human', robeGown: true, weapon: 'staff', eyeKind: 'cute', bodyScale: 1.04, vfxStyle: 'magic' })
      return true
    case 'ruins_siege_walker':
      drawSiegeTower(ctx, m, 'siege')
      return true
    case 'ruins_musket_revenant':
      renderBiped(ctx, m, { skinColor: '#f5ebe0', armorColor: '#a34c4e', accentColor: '#fbbf24', headKind: 'skull', hatKind: 'tricorn', weapon: 'musket', bodyScale: 1.04 })
      return true
    case 'ruins_hollow_armour':
      renderBiped(ctx, m, { skinColor: '#1e1b2e', armorColor: '#b55c78', accentColor: '#f43f5e', headKind: 'helm', weapon: 'halberd', eyeKind: 'glow', bodyScale: 1.04 })
      return true
    case 'ruins_doom_engine':
      drawSiegeTower(ctx, m, 'engine')
      return true
    case 'ruins_velvet_vampire':
      renderBiped(ctx, m, { skinColor: '#fff1f2', armorColor: '#8f3952', cloakColor: '#4c1428', accentColor: '#f43f5e', headKind: 'human', wings: 'bat', wingColor: '#4c1428', robeGown: true, eyeKind: 'angry', bodyScale: 1.08, vfxStyle: 'magic' })
      return true
    case 'ruins_night_steed':
      renderQuadruped(ctx, m, { bodyColor: '#785a73', bellyColor: '#b594b0', earKind: 'cat', tailKind: 'fluffy', collarKind: 'gold_collar', eyeColor: '#f43f5e', bodyScale: 1.1 })
      return true
    case 'ruins_blade_sentinel':
      renderBiped(ctx, m, { skinColor: '#8a8275', armorColor: '#70685d', accentColor: '#a3e635', headKind: 'helm', weapon: 'greatsword', bodyScale: 1.1 })
      return true
    case 'ruins_cursed_edge':
      renderWinged(ctx, m, { color: '#8f475e', accentColor: '#f43f5e', kind: 'sword_float', scale: 1.12 })
      return true
    case 'ruins_headsmans_blade':
      renderWinged(ctx, m, { color: '#9c4c47', accentColor: '#fbbf24', kind: 'axe_float', scale: 1.12 })
      return true
    case 'ruins_iron_marauder':
      renderBiped(ctx, m, { skinColor: '#6e5266', armorColor: '#4a3548', accentColor: '#cbd5e1', headKind: 'hood', weapon: 'dagger', offhand: 'dagger', bodyScale: 1.08 })
      return true
    case 'ruins_mirror_twin':
      renderBiped(ctx, m, { skinColor: '#fde6d2', armorColor: '#c45259', accentColor: '#fbbf24', headKind: 'human', hatKind: 'crown', weapon: 'scepter', eyeKind: 'cute', bodyScale: 1.08, vfxStyle: 'magic' })
      return true
    case 'ruins_sorrow_shade':
      renderBiped(ctx, m, { skinColor: '#dbeafe', armorColor: '#6b94cc', cloakColor: '#3b5c8c', accentColor: '#93c5fd', headKind: 'human', robeGown: true, eyeKind: 'cute', bodyScale: 1.08, vfxStyle: 'water' })
      return true
    case 'ruins_swarm_tyrant':
      renderArthropod(ctx, m, { color: '#5c7847', accentColor: '#a3e635', kind: 'mantis', wings: true, pincers: true, scale: 1.12 })
      return true
    case 'ruins_thornblade':
      renderWinged(ctx, m, { color: '#a84763', accentColor: '#84cc16', kind: 'sword_float', scale: 1.12 })
      return true
    case 'ruins_dread_shade':
      renderBiped(ctx, m, { skinColor: '#3b244d', armorColor: '#593e5e', cloakColor: '#36213b', accentColor: '#c084fc', headKind: 'hood', robeGown: true, weapon: 'dagger', bodyScale: 1.08 })
      return true
    case 'ruins_crimson_knight':
      renderBiped(ctx, m, { skinColor: '#450a0a', armorColor: '#a82f3c', accentColor: '#fbbf24', headKind: 'helm', weapon: 'greatsword', offhand: 'shield', bodyScale: 1.12 })
      return true
    case 'ruins_grinning_jester':
      renderBiped(ctx, m, { skinColor: '#fef3c7', armorColor: '#c9a68a', accentColor: '#f43f5e', headKind: 'jester', hatKind: 'jester', weapon: 'staff', bodyScale: 1.08 })
      return true
    case 'ruins_hatred_shade':
      renderBiped(ctx, m, { skinColor: '#450a0a', armorColor: '#a82a2e', cloakColor: '#6e1417', accentColor: '#fbbf24', headKind: 'hood', robeGown: true, weapon: 'dagger', eyeKind: 'glow', eyeColor: '#fde047', bodyScale: 1.1 })
      return true
    case 'ruins_bow_sentinel':
      renderBiped(ctx, m, { skinColor: '#ad9480', armorColor: '#8c725e', accentColor: '#fbbf24', headKind: 'helm', weapon: 'bow', bodyScale: 1.1 })
      return true
    case 'ruins_despair_shade':
      renderBiped(ctx, m, { skinColor: '#334155', armorColor: '#6e6873', cloakColor: '#47424d', accentColor: '#c084fc', headKind: 'hood', robeGown: true, weapon: 'staff', eyeKind: 'hollow', bodyScale: 1.1, vfxStyle: 'magic' })
      return true
    default:
      return false
  }
}
