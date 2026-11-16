import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  MOUNT_DEFS,
  MAX_MOUNT_LEVEL,
  createDefaultMountState,
  getActiveMountBonuses,
  getMountDef,
  mountUpgradeCost,
  sanitizeMountState,
} from '../lib/game/mounts'
import {
  COMBAT_PETS,
  getActivePetBonuses,
  sanitizePetState,
} from '../lib/game/systems'
import {
  MOUNT_MODEL_CANVAS_SIZE,
  MOUNT_MODEL_SPECS,
  PET_MODEL_CANVAS_SIZE,
  PET_MODEL_SPECS,
  getAllMountModels,
  getAllPetModels,
  getMountModelSpec,
  getPetModelSpec,
} from '../lib/game/models-2d'

describe('ผอบ (Phao-ob) & Companion Pets', () => {
  it('defines 4 distinct Thai Phao-ob pets alongside 6 companion pets (10 total)', () => {
    assert.equal(COMBAT_PETS.length, 10)
    const phaoPets = COMBAT_PETS.filter((p) => p.category === 'phao')
    assert.equal(phaoPets.length, 4)
    assert.deepEqual(
      phaoPets.map((p) => p.id),
      ['phao_lotus', 'phao_gold_naga', 'phao_celestial', 'phao_phantom'],
    )

    for (const pet of COMBAT_PETS) {
      const spec = PET_MODEL_SPECS[pet.id]
      assert.ok(spec, `Missing PetModelSpec for ${pet.id}`)
      assert.deepEqual(spec.canvasSize, PET_MODEL_CANVAS_SIZE)
      assert.equal(spec.supports4Way, true)
      assert.equal(spec.animationFrames.idle, 4)
      assert.equal(spec.animationFrames.walk, 6)
      assert.equal(spec.animationFrames.attack, 4)
    }
    assert.equal(getAllPetModels().length, 10)
    assert.equal(getPetModelSpec('phao_gold_naga').floating, true)
    assert.equal(getPetModelSpec('unknown_pet').petId, 'phao_lotus')
  })

  it('computes active bonuses and star multipliers cleanly for Phao-ob pets', () => {
    const state = sanitizePetState({
      activePetId: 'phao_celestial',
      ownedPets: {
        phao_celestial: { level: 5, exp: 12, stars: 3 },
      },
    })
    const bonuses = getActivePetBonuses(state)
    assert.ok(bonuses)
    assert.equal(bonuses.petId, 'phao_celestial')
    assert.equal(bonuses.level, 5)
    assert.equal(bonuses.stars, 3)
    assert.equal(bonuses.autoLootMagnet, true)
    assert.ok(bonuses.expMul > 1.2)
    assert.ok(bonuses.companionAtk > 60)
  })
})

describe('Mounts (สัตว์ขี่) & 2D Mount Models', () => {
  it('defines all 5 mounts with bespoke 44x38 2D model specs', () => {
    assert.equal(MOUNT_DEFS.length, 5)
    assert.equal(getAllMountModels().length, 5)
    assert.deepEqual(MOUNT_MODEL_CANVAS_SIZE, { width: 44, height: 38 })

    for (const mount of MOUNT_DEFS) {
      assert.ok(getMountDef(mount.id))
      const spec = MOUNT_MODEL_SPECS[mount.id]
      assert.ok(spec, `Missing MountModelSpec for ${mount.id}`)
      assert.equal(spec.archetype, mount.archetype)
      assert.equal(spec.supports4Way, true)
      assert.deepEqual(spec.canvasSize, MOUNT_MODEL_CANVAS_SIZE)
      assert.equal(spec.animationFrames.idle, 4)
      assert.equal(spec.animationFrames.walk, 6)
      assert.equal(spec.animationFrames.attack, 4)
    }

    assert.equal(getMountModelSpec('royal_griffin').flying, true)
    assert.equal(getMountModelSpec('meadow_pony').flying, false)
    assert.equal(getMountModelSpec('unknown').mountId, 'meadow_pony')
  })

  it('sanitizes mountState, syncs gem-shop aurora_cloud_dragon, and computes riding speed vs passive stats', () => {
    const empty = createDefaultMountState()
    assert.equal(empty.activeMountId, null)
    assert.equal(empty.mounted, false)
    assert.equal(getActiveMountBonuses(empty), null)

    const gemSynced = createDefaultMountState(['aurora_cloud_dragon'])
    assert.equal(gemSynced.activeMountId, 'aurora_cloud_dragon')
    assert.equal(gemSynced.mounted, true)
    assert.ok(gemSynced.ownedMounts.aurora_cloud_dragon)

    const sanitized = sanitizeMountState({
      activeMountId: 'starlight_kirin',
      mounted: true,
      ownedMounts: {
        starlight_kirin: { level: 99 },
        invalid_mount: { level: 3 },
      },
    })
    assert.equal(sanitized.ownedMounts.starlight_kirin.level, MAX_MOUNT_LEVEL)
    assert.equal(sanitized.ownedMounts.invalid_mount, undefined)

    const ridingBonuses = getActiveMountBonuses(sanitized)
    assert.ok(ridingBonuses)
    assert.equal(ridingBonuses.mounted, true)
    assert.ok(ridingBonuses.speedMul > 1.7)
    assert.ok(ridingBonuses.hpBonus > 300)

    const dismounted = sanitizeMountState({ ...sanitized, mounted: false })
    const dismountedBonuses = getActiveMountBonuses(dismounted)
    assert.ok(dismountedBonuses)
    assert.equal(dismountedBonuses.mounted, false)
    assert.equal(dismountedBonuses.speedMul, 1)
    assert.equal(dismountedBonuses.hpBonus, ridingBonuses.hpBonus)
    assert.ok(mountUpgradeCost(1) < mountUpgradeCost(5))
  })
})
