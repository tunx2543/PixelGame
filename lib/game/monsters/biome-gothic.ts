import {
  drawAttackVfx,
  drawFourPointStar,
  drawMonsterEye,
  drawWeaponProp,
  gradV,
  INK,
  type AnimMotion,
} from './primitives'
import {
  renderBiped,
  renderColossusOrUnique,
  renderDragonWyrm,
  renderQuadruped,
  renderSlime,
} from './rigs'

function drawNightSovereign(ctx: CanvasRenderingContext2D, m: AnimMotion) {
  renderBiped(ctx, m, {
    skinColor: '#e2e8f0',
    armorColor: '#454378',
    cloakColor: '#1e1b4b',
    accentColor: '#fbbf24',
    headKind: 'headless',
    hatKind: 'crown',
    robeGown: true,
    weapon: 'scepter',
    bodyScale: 1.18,
    vfxStyle: 'magic',
  })
  // Additional golden floating crown above blue spirit skull
  const cx = m.cx + m.lungeX * 0.65
  const topY = m.footY - 56 + m.bob * 0.6
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.4
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.moveTo(cx - 10, topY)
  ctx.lineTo(cx - 11, topY - 11)
  ctx.lineTo(cx, topY - 5)
  ctx.lineTo(cx + 11, topY - 11)
  ctx.lineTo(cx + 10, topY)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawParasolHopper(ctx: CanvasRenderingContext2D, m: AnimMotion) {
  const hop = m.action === 'walk' ? -Math.abs(Math.sin(m.walkPhase * Math.PI * 2)) * 12 : m.isAttack ? m.lungeY * 1.4 : m.bob
  const cx = m.cx + m.lungeX * 0.7
  const cy = m.footY - 26 + hop
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'

  // Single hopping wooden sandal foot!
  ctx.fillStyle = '#78350f'
  ctx.beginPath()
  ctx.roundRect(cx - 6, m.footY - 10 + hop * 0.4, 12, 8, 3)
  ctx.fill()
  ctx.stroke()

  // Umbrella handle + folded pink parasol body
  ctx.fillStyle = '#8b5a3c'
  ctx.fillRect(cx - 2.5, cy + 6, 5, 18)
  ctx.strokeRect(cx - 2.5, cy + 6, 5, 18)

  ctx.fillStyle = gradV(ctx, cx, cy - 26, cy + 12, '#c084a8', '#834b72')
  ctx.beginPath()
  ctx.moveTo(cx, cy - 28)
  ctx.lineTo(cx + 22, cy + 8)
  ctx.lineTo(cx - 22, cy + 8)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Single cyclops eye + playful sticking-out tongue!
  drawMonsterEye(ctx, cx, cy - 6, 5.2, 5.2, '#fde047', 'cute', m.blink)
  ctx.fillStyle = '#fb7185'
  ctx.beginPath()
  ctx.ellipse(cx + 2, cy + 6, 5, 7, 0.25, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  if (m.isAttack) drawAttackVfx(ctx, cx + 22, cy, m.atkIdx, '#f472b6', 'water')
  ctx.restore()
}

function drawMortarWitch(ctx: CanvasRenderingContext2D, m: AnimMotion) {
  const hover = Math.sin((m.action === 'walk' ? m.walkPhase : m.idlePhase) * Math.PI * 2) * 5
  const cx = m.cx + m.lungeX * 0.7
  const cy = m.footY - 24 + hover
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineJoin = 'round'

  // Flying wooden mortar barrel
  ctx.fillStyle = gradV(ctx, cx, cy - 4, cy + 20, '#b57459', '#6e3d2b')
  ctx.beginPath()
  ctx.roundRect(cx - 18, cy - 2, 36, 22, 8)
  ctx.fill()
  ctx.stroke()
  drawFourPointStar(ctx, cx, cy + 9, 4.5, '#fbbf24')

  // Witch inside barrel
  ctx.fillStyle = '#9c3645'
  ctx.beginPath()
  ctx.roundRect(cx - 10, cy - 16, 20, 16, 5)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#fde6d2'
  ctx.beginPath()
  ctx.arc(cx, cy - 22, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // Witch hat
  ctx.fillStyle = '#5c4b6e'
  ctx.beginPath()
  ctx.ellipse(cx, cy - 29, 15, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - 9, cy - 30)
  ctx.lineTo(cx, cy - 44)
  ctx.lineTo(cx + 9, cy - 30)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  if (!m.isUp) {
    drawMonsterEye(ctx, cx - 4, cy - 22, 2.5, 3.2, '#4c1d95', 'cute', m.blink)
    drawMonsterEye(ctx, cx + 4, cy - 22, 2.5, 3.2, '#4c1d95', 'cute', m.blink)
  }
  drawWeaponProp(ctx, cx - 12, cy - 8, 'club', m.weaponAngle, '#d4a373', '#fbbf24')
  if (m.isAttack) drawAttackVfx(ctx, cx + 22, cy - 8, m.atkIdx, '#f59e0b', 'magic')
  ctx.restore()
}

export function renderGothicBiomeMonster(ctx: CanvasRenderingContext2D, id: string, m: AnimMotion): boolean {
  switch (id) {
    // 8. GRAVEYARD (23)
    case 'grave_fallen_prelate':
      renderBiped(ctx, m, { skinColor: '#cbd5e1', armorColor: '#785070', cloakColor: '#4c2c47', accentColor: '#fbbf24', headKind: 'skull', hatKind: 'mitre', robeGown: true, weapon: 'staff', bodyScale: 1.15, vfxStyle: 'magic' })
      return true
    case 'grave_night_sovereign':
      drawNightSovereign(ctx, m)
      return true
    case 'grave_shadehound':
      renderQuadruped(ctx, m, { bodyColor: '#4a3548', bellyColor: '#8f6b8c', earKind: 'wolf', tailKind: 'fluffy', collarKind: 'gold_collar', eyeColor: '#f59e0b', bodyScale: 1.0 })
      return true
    case 'grave_sheet_ghost':
      renderColossusOrUnique(ctx, m, { color: '#f3e8ff', accentColor: '#f59e0b', kind: 'ghost', eyeKind: 'cute', eyeColor: '#7e22ce', scale: 0.96 })
      return true
    case 'grave_gravegnaw':
      renderBiped(ctx, m, { skinColor: '#7d8a6f', armorColor: '#5c4b43', accentColor: '#a3e635', headKind: 'human', eyeKind: 'hollow', eyeColor: '#fde047', bodyScale: 1.0 })
      return true
    case 'grave_shambler':
      renderBiped(ctx, m, { skinColor: '#789c68', armorColor: '#8f4778', accentColor: '#bef264', headKind: 'human', eyeKind: 'glow', eyeColor: '#bef264', bodyScale: 1.0 })
      return true
    case 'grave_bone_guard':
      renderBiped(ctx, m, { skinColor: '#f1f5f9', armorColor: '#9c78ab', accentColor: '#fbbf24', headKind: 'skull', hatKind: 'kabuto', weapon: 'spear', bodyScale: 0.98 })
      return true
    case 'grave_rattlebones':
      renderBiped(ctx, m, { skinColor: '#f5ebe0', armorColor: '#d4bfb0', accentColor: '#fbbf24', headKind: 'skull', weapon: 'sword', bodyScale: 0.98 })
      return true
    case 'grave_bone_archer':
      renderBiped(ctx, m, { skinColor: '#e2e8f0', armorColor: '#784e43', accentColor: '#fde047', headKind: 'skull', weapon: 'bow', bodyScale: 0.98 })
      return true
    case 'grave_chainbound':
      renderBiped(ctx, m, { skinColor: '#4c1d24', armorColor: '#a84c52', cloakColor: '#7f1d1d', accentColor: '#fbbf24', headKind: 'hood', robeGown: true, eyeKind: 'glow', eyeColor: '#fef08a', bodyScale: 0.96 })
      return true
    case 'grave_grave_warden':
      renderBiped(ctx, m, { skinColor: '#3b2433', armorColor: '#593347', cloakColor: '#3b1d2e', accentColor: '#f59e0b', headKind: 'skull', hatKind: 'witch', robeGown: true, weapon: 'lantern', bodyScale: 1.02 })
      return true
    case 'grave_broken_oath':
      renderBiped(ctx, m, { skinColor: '#a3726c', armorColor: '#b5847e', cloakColor: '#78464c', accentColor: '#fbbf24', headKind: 'helm', weapon: 'sword', bodyScale: 1.06 })
      return true
    case 'grave_pale_shroud':
      renderColossusOrUnique(ctx, m, { color: '#9c92a6', accentColor: '#c084fc', kind: 'ghost', eyeKind: 'hollow', scale: 1.06 })
      return true
    case 'grave_phantom_drop':
      renderSlime(ctx, m, { color: '#b5b4e8', accentColor: '#fde047', topper: 'star', scale: 1.04 })
      return true
    case 'grave_bone_marshal':
      renderBiped(ctx, m, { skinColor: '#f5ebe0', armorColor: '#9c4c63', cloakColor: '#6b283d', accentColor: '#fbbf24', headKind: 'skull', hatKind: 'kabuto', weapon: 'sword', bodyScale: 1.04 })
      return true
    case 'grave_severed_knight':
      renderBiped(ctx, m, { skinColor: '#94a3b8', armorColor: '#94838a', cloakColor: '#574e59', accentColor: '#38bdf8', headKind: 'headless', weapon: 'sword', bodyScale: 1.04 })
      return true
    case 'grave_gallows_tree':
      renderColossusOrUnique(ctx, m, { color: '#6b4744', accentColor: '#f59e0b', kind: 'tree', eyeKind: 'glow', scale: 1.14 })
      return true
    case 'grave_bone_paladin':
      renderBiped(ctx, m, { skinColor: '#f5ebe0', armorColor: '#787e85', accentColor: '#fbbf24', headKind: 'skull', weapon: 'greatsword', offhand: 'shield', bodyScale: 1.08 })
      return true
    case 'grave_dirge_matron':
      renderBiped(ctx, m, { skinColor: '#fef2f2', armorColor: '#4d3a4b', cloakColor: '#2d1e2b', accentColor: '#f59e0b', headKind: 'human', hatKind: 'witch', robeGown: true, weapon: 'candelabra', eyeKind: 'cute', bodyScale: 1.06, vfxStyle: 'magic' })
      return true
    case 'grave_wailing_lady':
      renderBiped(ctx, m, { skinColor: '#f8fafc', armorColor: '#c4a6e3', cloakColor: '#9f7aea', accentColor: '#e9d5ff', headKind: 'human', robeGown: true, eyeKind: 'cute', eyeColor: '#7e22ce', bodyScale: 1.06, vfxStyle: 'magic' })
      return true
    case 'grave_grim_druid':
      renderBiped(ctx, m, { skinColor: '#f5ebe0', armorColor: '#8f3943', cloakColor: '#5c212b', accentColor: '#fbbf24', headKind: 'skull', weapon: 'staff', robeGown: true, bodyScale: 1.08, vfxStyle: 'magic' })
      return true
    case 'grave_bone_caller':
      renderBiped(ctx, m, { skinColor: '#451a2b', armorColor: '#6b3648', cloakColor: '#4c1d2e', accentColor: '#f59e0b', headKind: 'hood', robeGown: true, weapon: 'staff', bodyScale: 1.08, vfxStyle: 'magic' })
      return true
    case 'grave_veilshade':
      renderColossusOrUnique(ctx, m, { color: '#4f3b52', accentColor: '#fde047', kind: 'ghost', eyeKind: 'glow', scale: 1.1 })
      return true

    // 9. ISLES (20)
    case 'isles_grove_matriarch':
      renderBiped(ctx, m, { skinColor: '#fef3c7', armorColor: '#5e8c61', cloakColor: '#3f6b45', accentColor: '#fbbf24', headKind: 'human', hatKind: 'leaf_crown', robeGown: true, eyeKind: 'cute', bodyScale: 1.16, vfxStyle: 'magic' })
      return true
    case 'isles_jade_empress':
      renderBiped(ctx, m, { skinColor: '#fde6e9', armorColor: '#b578a8', cloakColor: '#7e4873', accentColor: '#fbbf24', headKind: 'human', hatKind: 'crown', robeGown: true, weapon: 'parasol', eyeKind: 'cute', bodyScale: 1.15, vfxStyle: 'magic' })
      return true
    case 'isles_lunar_lantern_fox':
      renderBiped(ctx, m, { skinColor: '#f8fafc', armorColor: '#e6a89c', cloakColor: '#d4857a', accentColor: '#fbbf24', headKind: 'heron', robeGown: true, wings: 'feather', wingColor: '#fff1f2', weapon: 'bell', bodyScale: 1.14, vfxStyle: 'magic' })
      return true
    case 'isles_mountain_ogre':
      renderBiped(ctx, m, { skinColor: '#9c928c', armorColor: '#6b5e57', cloakColor: '#3f6b58', accentColor: '#fbbf24', headKind: 'oni', weapon: 'club', bodyScale: 1.18 })
      return true
    case 'isles_coil_emperor':
      renderBiped(ctx, m, { skinColor: '#94433a', armorColor: '#b55645', accentColor: '#fbbf24', headKind: 'lizard', hatKind: 'crown', tail: 'snake', robeGown: true, bodyScale: 1.16, vfxStyle: 'water' })
      return true
    case 'isles_spirit_warlord':
      renderBiped(ctx, m, { skinColor: '#4c1d4c', armorColor: '#6b5378', cloakColor: '#453154', accentColor: '#fbbf24', headKind: 'helm', hatKind: 'kabuto', banners: true, weapon: 'sword', bodyScale: 1.18 })
      return true
    case 'isles_festival_dragon':
      renderQuadruped(ctx, m, { bodyColor: '#d45f50', bellyColor: '#fef3c7', earKind: 'goat', backProp: 'festival_cloth', tailKind: 'fluffy', eyeKind: 'cute', eyeColor: '#fbbf24', bodyScale: 1.02 })
      return true
    case 'isles_parasol_hopper':
      drawParasolHopper(ctx, m)
      return true
    case 'isles_talisman_hopper':
      renderSlime(ctx, m, { color: '#cf5e55', accentColor: '#fbbf24', topper: 'talisman', scale: 1.02 })
      return true
    case 'isles_club_imp':
      renderBiped(ctx, m, { skinColor: '#d46b68', armorColor: '#e8d5a8', accentColor: '#fbbf24', headKind: 'oni', weapon: 'club', bodyScale: 0.96 })
      return true
    case 'isles_lantern_ghoul':
      renderBiped(ctx, m, { skinColor: '#f5ebe0', armorColor: '#6b4768', cloakColor: '#4a2e48', accentColor: '#fbbf24', headKind: 'hood', robeGown: true, weapon: 'lantern', eyeKind: 'hollow', bodyScale: 1.0 })
      return true
    case 'isles_mochi_sprite':
      renderBiped(ctx, m, { skinColor: '#fff5f2', armorColor: '#f5ded8', accentColor: '#fbbf24', headKind: 'human', weapon: 'hammer', eyeKind: 'cute', bodyScale: 0.94 })
      return true
    case 'isles_porcelain_doll':
      renderBiped(ctx, m, { skinColor: '#f5ebe0', armorColor: '#485278', accentColor: '#fbbf24', headKind: 'human', weapon: 'dagger', eyeKind: 'hollow', bodyScale: 0.96 })
      return true
    case 'isles_peach_treant':
      renderColossusOrUnique(ctx, m, { color: '#9c6659', accentColor: '#fca5a5', kind: 'tree', eyeKind: 'cute', scale: 1.02 })
      return true
    case 'isles_crow_mask':
      renderBiped(ctx, m, { skinColor: '#3b374d', armorColor: '#8f4758', cloakColor: '#4a435e', accentColor: '#fbbf24', headKind: 'heron', wings: 'feather', wingColor: '#59556e', weapon: 'fan', bodyScale: 1.02 })
      return true
    case 'isles_mourning_maiden':
      renderBiped(ctx, m, { skinColor: '#f1f5f9', armorColor: '#84b0a8', cloakColor: '#5c8a82', accentColor: '#c084fc', headKind: 'human', hatKind: 'leaf_crown', robeGown: true, weapon: 'fan', eyeKind: 'cute', bodyScale: 1.04, vfxStyle: 'magic' })
      return true
    case 'isles_veil_assassin':
      renderBiped(ctx, m, { skinColor: '#fde6d2', armorColor: '#5d475e', cloakColor: '#3b2c3d', accentColor: '#f59e0b', headKind: 'hood', weapon: 'dagger', offhand: 'dagger', bodyScale: 1.04 })
      return true
    case 'isles_drifting_blade':
      renderBiped(ctx, m, { skinColor: '#3b2429', armorColor: '#9c5959', cloakColor: '#733b3b', accentColor: '#fbbf24', headKind: 'human', hatKind: 'straw', weapon: 'sword', bodyScale: 1.06 })
      return true
    case 'isles_totem_sentinel':
      renderColossusOrUnique(ctx, m, { color: '#946858', accentColor: '#f59e0b', kind: 'totem', eyeKind: 'glow', scale: 1.1 })
      return true
    case 'isles_ninefire_vixen':
      renderBiped(ctx, m, { skinColor: '#c44d45', armorColor: '#9c322b', accentColor: '#fbbf24', headKind: 'jackal', robeGown: true, tail: 'fox', weapon: 'lantern', bodyScale: 1.08, vfxStyle: 'flame' })
      return true

    // 10. SNOW (15)
    case 'snow_frostfang_alpha':
      renderQuadruped(ctx, m, { bodyColor: '#7ea2db', bellyColor: '#eff6ff', earKind: 'wolf', tailKind: 'fluffy', collarKind: 'mane', collarColor: '#bfdbfe', hasStarMark: true, bodyScale: 1.18, eyeColor: '#38bdf8' })
      return true
    case 'snow_tri_crown_wyrm':
      renderDragonWyrm(ctx, m, { color: '#708552', bellyColor: '#d9d2a6', accentColor: '#fbbf24', kind: 'hydra', heads: 3, scale: 1.18, vfxColor: '#84cc16' })
      return true
    case 'snow_goldbristle_boar':
      renderQuadruped(ctx, m, { bodyColor: '#a86545', earKind: 'boar', snoutKind: 'boar_tusk', backProp: 'gold_bristles', tailKind: 'curl', eyeColor: '#f59e0b', bodyScale: 0.92 })
      return true
    case 'snow_icicle_imp':
      renderColossusOrUnique(ctx, m, { color: '#8ac2f5', accentColor: '#fde047', kind: 'golem', eyeKind: 'angry', scale: 0.88 })
      return true
    case 'snow_snow_puff':
      renderSlime(ctx, m, { color: '#e6eeff', accentColor: '#7dd3fc', topper: 'snowflake', scale: 0.98 })
      return true
    case 'snow_frost_pup':
      renderQuadruped(ctx, m, { bodyColor: '#e8e4f5', bellyColor: '#ffffff', earKind: 'wolf', tailKind: 'fluffy', collarKind: 'star_necklace', eyeKind: 'cute', eyeColor: '#60a5fa', bodyScale: 0.96 })
      return true
    case 'snow_snow_seal':
      renderQuadruped(ctx, m, { bodyColor: '#f8f5fc', earKind: 'none', tailKind: 'fluffy', collarKind: 'scarf', collarColor: '#ef4444', eyeKind: 'cute', eyeColor: '#1e1b4b', bodyScale: 0.98 })
      return true
    case 'snow_rime_stalker':
      renderQuadruped(ctx, m, { bodyColor: '#b5a2cf', bellyColor: '#f3e8ff', earKind: 'wolf', tailKind: 'fluffy', collarKind: 'scarf', collarColor: '#c084fc', eyeColor: '#38bdf8', bodyScale: 1.0 })
      return true
    case 'snow_snowhulk':
      renderColossusOrUnique(ctx, m, { color: '#e2dff0', accentColor: '#f59e0b', kind: 'igloo', eyeKind: 'hollow', scale: 1.06 })
      return true
    case 'snow_snowveil_sprite':
      renderColossusOrUnique(ctx, m, { color: '#7ea2db', accentColor: '#fde047', kind: 'ghost', eyeKind: 'glow', eyeColor: '#fde047', scale: 1.02 })
      return true
    case 'snow_frost_ape':
      renderBiped(ctx, m, { skinColor: '#7dd3fc', armorColor: '#e2dcd8', accentColor: '#fbbf24', headKind: 'human', bodyScale: 1.06 })
      return true
    case 'snow_frost_bear':
      renderQuadruped(ctx, m, { bodyColor: '#eee8f5', bellyColor: '#ffffff', earKind: 'round', backProp: 'ice_crystals', collarKind: 'star_necklace', tailKind: 'short', eyeColor: '#38bdf8', bodyScale: 1.08 })
      return true
    case 'snow_mortar_witch':
      drawMortarWitch(ctx, m)
      return true
    case 'snow_stonehide_mammoth':
      renderQuadruped(ctx, m, { bodyColor: '#7d6b6d', earKind: 'none', snoutKind: 'elephant_trunk', backProp: 'boulder_hide', collarKind: 'star_necklace', tailKind: 'short', eyeColor: '#fbbf24', bodyScale: 1.15 })
      return true
    case 'snow_glacier_titan':
      renderColossusOrUnique(ctx, m, { color: '#75a8e3', accentColor: '#bae6fd', kind: 'golem', eyeKind: 'glow', scale: 1.14 })
      return true
    default:
      return false
  }
}
