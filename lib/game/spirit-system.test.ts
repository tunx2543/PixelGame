import test from 'node:test'
import assert from 'node:assert/strict'
import {
  advanceSpiritStageState,
  canAdvanceSpiritStage,
  computeSpiritAwakeningBonuses,
  createDefaultSpiritAwakeningState,
  getSpiritCoreUpgradeCost,
  sanitizeSpiritAwakeningState,
  upgradeSpiritCoreState,
} from './spirit-system'

test('sanitizeSpiritAwakeningState clamps invalid levels and fills defaults', () => {
  const clean = sanitizeSpiritAwakeningState({
    cores: { vitality: 99, fury: -5, tempest: 4 },
    awakeningStage: 8,
    totalInfusions: -2,
  })
  assert.equal(clean.cores.vitality, 10)
  assert.equal(clean.cores.fury, 0)
  assert.equal(clean.cores.tempest, 4)
  assert.equal(clean.cores.nirvana, 0)
  assert.equal(clean.awakeningStage, 5)
  assert.equal(clean.totalInfusions, 0)
})

test('upgradeSpiritCoreState deducts exact gold cost and increments bonuses', () => {
  let state = createDefaultSpiritAwakeningState()
  const cost = getSpiritCoreUpgradeCost('fury', 0)
  const res = upgradeSpiritCoreState(state, 'fury', cost + 100)
  assert.equal(res.ok, true)
  assert.equal(res.newLevel, 1)
  assert.equal(res.nextGold, 100)
  state = res.nextState

  const bonuses = computeSpiritAwakeningBonuses(state)
  assert.equal(bonuses.atkFlat, 6)
  assert.equal(bonuses.totalCoreLevels, 1)
  assert.ok(bonuses.soulCritChance > 0)
  assert.ok(bonuses.soulCritMult > 2.0)
})

test('upgradeSpiritCoreState fails gracefully when gold is insufficient', () => {
  const state = createDefaultSpiritAwakeningState()
  const res = upgradeSpiritCoreState(state, 'vitality', 50)
  assert.equal(res.ok, false)
  assert.equal(res.nextGold, 50)
  assert.equal(res.nextState.cores.vitality, 0)
})

test('advanceSpiritStageState requires core total and rebirth count thresholds', () => {
  let state = createDefaultSpiritAwakeningState()
  let gold = 20000

  // Cannot advance stage 1 with 0 total cores
  assert.equal(canAdvanceSpiritStage(state, 0, gold).ok, false)

  // Upgrade 4 cores to unlock stage 1
  for (const id of ['vitality', 'fury', 'tempest', 'nirvana'] as const) {
    const u = upgradeSpiritCoreState(state, id, gold)
    assert.equal(u.ok, true)
    state = u.nextState
    gold = u.nextGold
  }

  const adv1 = advanceSpiritStageState(state, 0, gold)
  assert.equal(adv1.ok, true)
  assert.equal(adv1.stage, 1)
  assert.equal(computeSpiritAwakeningBonuses(adv1.nextState).allStatPct, 6)

  // Stage 3 requires 22 total cores and 1 rebirth
  const forcedCores = sanitizeSpiritAwakeningState({
    cores: { vitality: 6, fury: 6, tempest: 5, nirvana: 5 },
    awakeningStage: 2,
  })
  assert.equal(canAdvanceSpiritStage(forcedCores, 0, 10000).ok, false)
  assert.equal(canAdvanceSpiritStage(forcedCores, 1, 10000).ok, true)
})
