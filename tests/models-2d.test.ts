import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JOBS, MONSTERS } from '../lib/game/data'
import {
  getAllJobModels,
  getAllMonsterModels,
  getJobModelSpec,
  getMonsterModelSpec,
  HUMAN_MODEL_CANVAS_SIZE,
  JOB_MODEL_SPECS,
  MODEL_ACTIONS,
  MODEL_DIRS,
  MONSTER_MODEL_SPECS,
} from '../lib/game/models-2d'

describe('2D character job models & animations', () => {
  it('defines a 42x48 2D model spec with hairStyle for every job in JOBS (24/24)', () => {
    const jobIds = Object.keys(JOBS)
    assert.equal(jobIds.length, 24)
    assert.equal(getAllJobModels().length, 24)
    assert.deepEqual(HUMAN_MODEL_CANVAS_SIZE, { width: 42, height: 48 })

    for (const id of jobIds) {
      const spec = JOB_MODEL_SPECS[id]
      assert.ok(spec, `Missing JobModelSpec for ${id}`)
      assert.equal(spec.jobId, id)
      assert.equal(spec.name, JOBS[id].name)
      assert.equal(spec.animationFrames.idle, 4)
      assert.equal(spec.animationFrames.walk, 6)
      assert.equal(spec.animationFrames.attack, 4)
      assert.ok(spec.hairStyle, `Job ${id} missing hairStyle`)
      assert.deepEqual(spec.canvasSize, HUMAN_MODEL_CANVAS_SIZE)
      assert.ok(JOBS[id].weaponTypes.includes(spec.weapon), `Job ${id} weapon ${spec.weapon} mismatch`)
    }
  })

  it('gives each job distinct hat/armor silhouettes and valid directional/animation constants', () => {
    assert.deepEqual([...MODEL_DIRS], ['down', 'right', 'up', 'left'])
    assert.deepEqual([...MODEL_ACTIONS], ['idle', 'walk', 'attack'])

    assert.equal(getJobModelSpec('paladin').halo, true)
    assert.equal(getJobModelSpec('paladin').hatStyle, 'paladin_helm')
    assert.equal(getJobModelSpec('cleric').wings, true)
    assert.equal(getJobModelSpec('cleric').hatStyle, 'mitre')
    assert.equal(getJobModelSpec('wizard').hatStyle, 'archmage')
    assert.equal(getJobModelSpec('assassin').dualDaggers, true)
    assert.equal(getJobModelSpec('hunter').quiver, true)
    assert.equal(getJobModelSpec('gm').wingStyle, 'seraph')
    assert.equal(getJobModelSpec('merchant').hatStyle, 'merchant_beret')
    assert.equal(getJobModelSpec('nekobaku').hatStyle, 'cat_hood')
    assert.equal(getJobModelSpec('templar').halo, true)
    assert.equal(getJobModelSpec('the_king').hatStyle, 'crown')
    assert.equal(getJobModelSpec('the_king').armorStyle, 'sovereign')
    assert.equal(getJobModelSpec('sinister').dualDaggers, true)
    assert.equal(getJobModelSpec('mamushi').quiver, true)
    assert.equal(getJobModelSpec('priest').hatStyle, 'mitre')
    assert.equal(getJobModelSpec('priest').halo, true)
    assert.equal(getJobModelSpec('high_priest').wings, true)
    assert.equal(getJobModelSpec('berserker').hatStyle, 'bandana')
    assert.equal(getJobModelSpec('unknown_job').jobId, 'novice')
  })
})

describe('2D monster & boss models & animations', () => {
  it('defines a dedicated 2D model spec for every monster in MONSTERS (26/26)', () => {
    const monsterIds = Object.keys(MONSTERS)
    assert.equal(monsterIds.length, 26)
    assert.equal(getAllMonsterModels().length, 26)

    const seenArchetypes = new Set<string>()
    for (const id of monsterIds) {
      const def = MONSTERS[id]
      const spec = MONSTER_MODEL_SPECS[id]
      assert.ok(spec, `Missing MonsterModelSpec for ${id}`)
      assert.equal(spec.monsterId, id)
      assert.equal(spec.boss, Boolean(def.boss))
      assert.equal(spec.animationFrames.idle, 4)
      assert.equal(spec.animationFrames.walk, 6)
      assert.equal(spec.animationFrames.attack, 4)
      assert.ok(spec.canvasSize.width >= 26 && spec.canvasSize.height >= 24)
      seenArchetypes.add(spec.archetype)
    }

    // Every monster in MONSTERS has its own bespoke archetype
    assert.equal(seenArchetypes.size, 26)
  })

  it('correctly configures boss sizes, flying flags, and 4-way facing support', () => {
    const dragon = getMonsterModelSpec('abyss_dragon')
    assert.equal(dragon.archetype, 'abyss_dragon')
    assert.equal(dragon.boss, true)
    assert.equal(dragon.flying, true)
    assert.equal(dragon.canvasSize.width, 42)
    assert.equal(dragon.canvasSize.height, 34)

    const abyssKnight = getMonsterModelSpec('abyss_knight')
    assert.equal(abyssKnight.archetype, 'abyss_knight')
    assert.equal(abyssKnight.supports4Way, true)

    const goblinChief = getMonsterModelSpec('goblin_chief')
    assert.equal(goblinChief.archetype, 'goblin_chief')
    assert.equal(goblinChief.boss, true)
    assert.equal(goblinChief.supports4Way, true)

    const gale = getMonsterModelSpec('gale_sentinel')
    assert.equal(gale.flying, true)
    assert.equal(gale.supports4Way, true)

    const fireDragon = getMonsterModelSpec('boss_fire_dragon')
    assert.equal(fireDragon.archetype, 'boss_fire_dragon')
    assert.equal(fireDragon.boss, true)
    assert.equal(fireDragon.flying, true)
    assert.equal(fireDragon.canvasSize.width, 42)
    assert.equal(fireDragon.canvasSize.height, 34)

    const bossWolf = getMonsterModelSpec('boss_wolf')
    assert.equal(bossWolf.boss, true)
    assert.equal(getMonsterModelSpec('boss_spider_queen').boss, true)
    assert.equal(getMonsterModelSpec('boss_lich').supports4Way, true)
    assert.equal(getMonsterModelSpec('boss_demon_king').supports4Way, true)
    assert.equal(getMonsterModelSpec('orc').supports4Way, true)

    const fallback = getMonsterModelSpec(undefined, 'golem', '#ff0000')
    assert.equal(fallback.archetype, 'fire_golem')
    assert.equal(fallback.color, '#ff0000')
  })
})
