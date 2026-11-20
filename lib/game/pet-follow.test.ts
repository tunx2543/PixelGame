import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  COMBAT_PETS,
  MAX_PET_LEVEL,
  MAX_PET_STARS,
  getActivePetBonuses,
  getCombatPetDef,
  getPetStarMultiplier,
  sanitizePetState,
} from './systems'
import { PET_STAT_CAPS } from './premium/fashion-pet'
import { PET_SPRITE_SHEETS, getPetSheetSpec } from './sprite-sheets'
import {
  PET_ANIM_FRAME_COUNTS,
  PET_ARRIVE_DIST,
  PET_RUN_DIST,
  PET_SOFT_LEASH_DIST,
  computePetFollowAnchor,
  createDefaultPetFollowState,
  getPetVisualTier,
  getPetVisualTierLabel,
  resetPetFollowToPlayer,
  resolvePetAnimationFrame,
  stepPetFollow,
} from './pet-follow'

const EXPECTED_PET_IDS = [
  'buddy_slime',
  'flame_fox',
  'crystal_owl',
  'moonlight_firefly',
  'gem_raccoon',
  'aurora_cloud_dragon',
  'phao_lotus',
  'phao_gold_naga',
  'phao_celestial',
  'phao_phantom',
  'phao_water_slime',
  'phao_dawn_rooster',
  'phao_husky_kitten',
  'phao_shiba_scarf',
  'phao_spear_goblin',
  'phao_silver_wolf',
  'phao_ribbon_bunny',
  'phao_acorn_squirrel',
  'phao_ember_ninetail',
  'phao_sky_eagle',
  'phao_frost_penguin',
  'phao_stone_tortoise',
  'phao_crimson_dragon',
  'phao_prism_unicorn',
  'phao_sapphire_wisp',
  'phao_abyss_neko',
  'phao_sacred_kitsune',
  'phao_solar_phoenix',
  'phao_glacial_wolf',
  'phao_armored_lion',
  'phao_obsidian_dragon',
  'phao_seraph_cat',
  'phao_violet_hound',
  'phao_rune_golem',
  'phao_astral_dragon',
  'phao_frost_stag',
  'phao_celestial_owl',
  'phao_golden_seraph',
] as const

test('COMBAT_PETS preserves all 38 pet IDs without deletion or renaming', () => {
  assert.equal(COMBAT_PETS.length, 38)
  assert.deepEqual(
    COMBAT_PETS.map((p) => p.id),
    [...EXPECTED_PET_IDS],
  )
  for (const id of EXPECTED_PET_IDS) {
    assert.equal(getCombatPetDef(id)?.id, id)
  }
})

test('every pet has generated HD sprite sheet, portrait PNG, and uniform 15-row sheet spec', () => {
  const rootDir = path.resolve(process.cwd(), 'public/assets/hd/pets')
  assert.equal(Object.keys(PET_SPRITE_SHEETS).length, 38)

  for (const id of EXPECTED_PET_IDS) {
    const spec = getPetSheetSpec(id)
    assert.ok(spec, `Missing sheet spec for ${id}`)
    assert.equal(spec.frameWidth, 136)
    assert.equal(spec.frameHeight, 136)
    assert.equal(spec.cols, 6)
    assert.equal(spec.rows, 15)

    for (const act of ['idle', 'walk', 'run', 'follow', 'attack'] as const) {
      for (const dir of ['down', 'right', 'up'] as const) {
        const key = `${act}_${dir}`
        assert.ok(spec.actions[key], `Missing ${key} action on ${id}`)
        assert.equal(spec.actions[key].frames, PET_ANIM_FRAME_COUNTS[act])
      }
    }

    const sheetPath = path.join(rootDir, id, 'sheet.png')
    const portraitPath = path.join(rootDir, id, 'portrait.png')
    assert.ok(fs.existsSync(sheetPath), `Missing sheet.png for ${id}`)
    assert.ok(fs.existsSync(portraitPath), `Missing portrait.png for ${id}`)
    assert.ok(fs.statSync(sheetPath).size > 2000, `sheet.png too small for ${id}`)
    assert.ok(fs.statSync(portraitPath).size > 400, `portrait.png too small for ${id}`)
  }
})

test('getPetVisualTier maps level and stars cleanly into 5 distinct visual tiers', () => {
  assert.equal(getPetVisualTier(1, 1), 1)
  assert.equal(getPetVisualTier(5, 1), 2)
  assert.equal(getPetVisualTier(6, 2), 3)
  assert.equal(getPetVisualTier(12, 3), 4)
  assert.equal(getPetVisualTier(16, 1), 4)
  assert.equal(getPetVisualTier(20, 5), 5)
  assert.equal(getPetVisualTier(0, 0), 1)
  assert.equal(getPetVisualTier(99, 99), 5)

  assert.match(getPetVisualTierLabel(1, 1), /พื้นฐาน/)
  assert.match(getPetVisualTierLabel(5, 1), /ระดับกลาง/)
  assert.match(getPetVisualTierLabel(10, 1), /ระดับสูง/)
  assert.match(getPetVisualTierLabel(12, 3), /หายาก/)
  assert.match(getPetVisualTierLabel(20, 5), /พิเศษ/)
})

test('computePetFollowAnchor places pet nicely behind/beside player across all 4 directions', () => {
  const down = computePetFollowAnchor(100, 100, 'down', false, false)
  const up = computePetFollowAnchor(100, 100, 'up', false, false)
  const right = computePetFollowAnchor(100, 100, 'right', false, false)
  const left = computePetFollowAnchor(100, 100, 'left', false, false)

  assert.ok(down.x < 100)
  assert.ok(up.y > 100)
  assert.ok(right.x < 100)
  assert.ok(left.x > 100)
  assert.equal(left.x - 100, 100 - right.x)

  const mountedRight = computePetFollowAnchor(100, 100, 'right', false, true)
  assert.ok(mountedRight.x < right.x)
})

test('stepPetFollow tracks moving player, sprints when distant/mounted, avoids obstacles, and leashes back', () => {
  let pf = createDefaultPetFollowState({
    petId: 'phao_gold_naga',
    mapId: 'town',
    playerX: 160,
    playerY: 160,
    playerDir: 'right',
    isPhao: true,
  })
  assert.equal(pf.initialized, true)
  assert.equal(pf.petId, 'phao_gold_naga')

  // Walking player moves right -> pet switches to follow and advances smoothly
  for (let i = 0; i < 15; i++) {
    pf = stepPetFollow(pf, {
      dt: 0.05,
      petId: 'phao_gold_naga',
      mapId: 'town',
      playerX: 160 + (i + 1) * 4,
      playerY: 160,
      playerDir: 'right',
      playerMoving: true,
      playerSpeed: 72,
      isPhao: true,
    })
  }
  assert.equal(pf.action, 'follow')
  assert.equal(pf.dir, 'right')
  assert.ok(pf.x > 150)

  // Standing still lets pet converge to anchor and become idle
  const stopX = 220
  for (let i = 0; i < 30; i++) {
    pf = stepPetFollow(pf, {
      dt: 0.05,
      petId: 'phao_gold_naga',
      mapId: 'town',
      playerX: stopX,
      playerY: 160,
      playerDir: 'right',
      playerMoving: false,
      playerSpeed: 72,
      isPhao: true,
    })
  }
  const anchor = computePetFollowAnchor(stopX, 160, 'right', true, false)
  assert.ok(Math.hypot(anchor.x - pf.x, anchor.y - pf.y) <= PET_ARRIVE_DIST)
  assert.equal(pf.action, 'idle')

  // Large distance triggers run animation & boosted catch-up speed
  const runStep = stepPetFollow(pf, {
    dt: 0.05,
    petId: 'phao_gold_naga',
    mapId: 'town',
    playerX: stopX + PET_RUN_DIST + 20,
    playerY: 160,
    playerDir: 'right',
    playerMoving: true,
    playerSpeed: 100,
    isPhao: true,
    isMounted: true,
  })
  assert.equal(runStep.action, 'run')
  assert.ok(runStep.x > pf.x)

  // Extreme gap (> PET_SOFT_LEASH_DIST) soft-leashes cleanly next to player
  const leashed = stepPetFollow(runStep, {
    dt: 0.05,
    petId: 'phao_gold_naga',
    mapId: 'town',
    playerX: stopX + PET_SOFT_LEASH_DIST + 120,
    playerY: 200,
    playerDir: 'down',
    playerMoving: true,
    playerSpeed: 100,
    isPhao: true,
  })
  const leashAnchor = computePetFollowAnchor(stopX + PET_SOFT_LEASH_DIST + 120, 200, 'down', true, false)
  assert.ok(Math.hypot(leashAnchor.x - leashed.x, leashAnchor.y - leashed.y) <= 1)

  // Persistent obstacle stall >1.0s recovers back to player
  let stalled = resetPetFollowToPlayer(leashed, {
    petId: 'buddy_slime',
    mapId: 'meadow',
    playerX: 100,
    playerY: 100,
    playerDir: 'right',
  })
  stalled = { ...stalled, x: 50, y: 100 }
  for (let i = 0; i < 24; i++) {
    stalled = stepPetFollow(stalled, {
      dt: 0.05,
      petId: 'buddy_slime',
      mapId: 'meadow',
      playerX: 100,
      playerY: 100,
      playerDir: 'right',
      playerMoving: false,
      playerSpeed: 72,
      isBlocked: (x) => x > 51 && x < 95,
    })
  }
  const recoveredAnchor = computePetFollowAnchor(100, 100, 'right', false, false)
  assert.ok(Math.hypot(recoveredAnchor.x - stalled.x, recoveredAnchor.y - stalled.y) <= PET_ARRIVE_DIST)
})

test('stepPetFollow handles map transitions, pet switches, and storing pet', () => {
  const inTown = createDefaultPetFollowState({
    petId: 'buddy_slime',
    mapId: 'town',
    playerX: 300,
    playerY: 180,
    playerDir: 'right',
  })

  // Portal changeMap snaps pet immediately beside player on new map
  const inMeadow = stepPetFollow(inTown, {
    dt: 0.016,
    petId: 'buddy_slime',
    mapId: 'meadow',
    playerX: 32,
    playerY: 160,
    playerDir: 'right',
    playerMoving: false,
    playerSpeed: 72,
  })
  assert.equal(inMeadow.mapId, 'meadow')
  assert.ok(inMeadow.x < 32 && inMeadow.x > 0)

  // Storing pet sets petId=null and initialized=false
  const stored = stepPetFollow(inMeadow, {
    dt: 0.016,
    petId: null,
    mapId: 'meadow',
    playerX: 32,
    playerY: 160,
    playerDir: 'right',
    playerMoving: false,
    playerSpeed: 72,
  })
  assert.equal(stored.petId, null)
  assert.equal(stored.initialized, false)
})

test('resolvePetAnimationFrame returns bounded frame indices for all 5 actions', () => {
  for (const act of ['idle', 'walk', 'follow', 'run', 'attack'] as const) {
    for (let t = 0; t < 2; t += 0.13) {
      const f = resolvePetAnimationFrame(act, t, act === 'attack' ? 0.2 : 0)
      assert.ok(f >= 0 && f < PET_ANIM_FRAME_COUNTS[act], `Frame ${f} out of range for ${act}`)
    }
  }
})

test('sanitizePetState & getActivePetBonuses preserve original stats, caps, and Save/Load round-trip', () => {
  const restored = sanitizePetState({
    activePetId: 'phao_gold_naga',
    ownedPets: {
      phao_gold_naga: { level: 12, exp: 35, stars: 3 },
      buddy_slime: { level: 99, exp: -10, stars: 12 },
      unknown_pet_id: { level: 5, exp: 0, stars: 2 },
    },
  })

  assert.equal(restored.activePetId, 'phao_gold_naga')
  assert.equal(restored.ownedPets.phao_gold_naga.level, 12)
  assert.equal(restored.ownedPets.phao_gold_naga.stars, 3)
  assert.equal(restored.ownedPets.buddy_slime.level, MAX_PET_LEVEL)
  assert.equal(restored.ownedPets.buddy_slime.stars, MAX_PET_STARS)
  assert.equal(restored.ownedPets.unknown_pet_id, undefined)

  const bonus = getActivePetBonuses(restored)
  assert.ok(bonus)
  const def = getCombatPetDef('phao_gold_naga')!
  const expectedScale = (1 + (12 - 1) * 0.14) * getPetStarMultiplier(3)
  assert.equal(bonus.atkBonus, Math.min(PET_STAT_CAPS.maxAtkBonus, Math.round(def.atkBuff * expectedScale)))
  assert.equal(bonus.hpBonus, Math.min(PET_STAT_CAPS.maxHpBonus, Math.round(def.hpBonus * expectedScale)))
  assert.equal(bonus.autoLootMagnet, true)
})
