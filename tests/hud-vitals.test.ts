import test from 'node:test'
import assert from 'node:assert/strict'
import { MAX_LEVEL } from '../lib/game/data'
import { buildVitalsSnapshot } from '../lib/game/hud-vitals'

test('hud-vitals', async (t) => {
  await t.test('builds strictly HP, MP, EXP bars plus Gold and Diamond currencies', () => {
    const snap = buildVitalsSnapshot({
      hp: 85,
      maxHp: 120,
      mp: 30,
      maxMp: 50,
      level: 3,
      exp: 45,
      gold: 1250,
      diamonds: 14,
    })

    assert.equal(snap.bars.length, 3)
    assert.deepEqual(
      snap.bars.map((b) => b.label),
      ['HP', 'MP', 'EXP'],
    )
    assert.equal(snap.bars[0].current, 85)
    assert.equal(snap.bars[0].max, 120)
    assert.ok(Math.abs(snap.bars[0].percent - 70.8333) < 0.01)

    assert.equal(snap.bars[1].current, 30)
    assert.equal(snap.bars[1].max, 50)
    assert.equal(snap.bars[1].percent, 60)

    assert.equal(snap.gold, 1250)
    assert.equal(snap.diamonds, 14)
  })

  await t.test('clamps overflow/negative values and fills EXP bar at max level', () => {
    const snap = buildVitalsSnapshot({
      hp: 999,
      maxHp: 100,
      mp: -10,
      maxMp: 40,
      level: MAX_LEVEL,
      exp: 0,
      gold: -50,
    })

    assert.equal(snap.bars[0].current, 100)
    assert.equal(snap.bars[0].percent, 100)
    assert.equal(snap.bars[1].current, 0)
    assert.equal(snap.bars[1].percent, 0)
    assert.equal(snap.bars[2].percent, 100)
    assert.equal(snap.gold, 0)
    assert.equal(snap.diamonds, 0)
  })
})
