import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeShakeFrame,
  evaluateAttackShake,
  type ScreenShakeEvent,
} from '../lib/game/screen-shake'

describe('screen-shake', () => {
  it('always triggers shake on critical hits and scales intensity for crit skills', () => {
    const basicCrit = evaluateAttackShake({
      damage: 28,
      enemyMaxHp: 200,
      isCrit: true,
      skillMultiplier: 1,
    })
    assert.equal(basicCrit.shouldShake, true)
    assert.equal(basicCrit.reason, 'crit')
    assert.ok(basicCrit.intensity >= 0.75)
    assert.ok(basicCrit.durationMs >= 300)

    const skillCrit = evaluateAttackShake({
      damage: 90,
      enemyMaxHp: 200,
      isCrit: true,
      skillMultiplier: 1.8,
    })
    assert.equal(skillCrit.shouldShake, true)
    assert.equal(skillCrit.reason, 'crit')
    assert.ok(skillCrit.intensity > basicCrit.intensity)
  })

  it('triggers shake on high-damage attacks and heavy skills, but not light normal hits', () => {
    const lightHit = evaluateAttackShake({
      damage: 15,
      enemyMaxHp: 30,
      isCrit: false,
      skillMultiplier: 1,
    })
    assert.equal(lightHit.shouldShake, false)
    assert.equal(lightHit.reason, 'none')

    const heavySkill = evaluateAttackShake({
      damage: 24,
      enemyMaxHp: 30,
      isCrit: false,
      skillMultiplier: 1.7,
    })
    assert.equal(heavySkill.shouldShake, true)
    assert.equal(heavySkill.reason, 'high-damage')

    const highAbsHit = evaluateAttackShake({
      damage: 75,
      enemyMaxHp: 200,
      isCrit: false,
      skillMultiplier: 1,
    })
    assert.equal(highAbsHit.shouldShake, true)
    assert.equal(highAbsHit.reason, 'high-damage')
  })

  it('computes decaying trauma^2 shake offsets and stops after durationMs', () => {
    const event: ScreenShakeEvent = {
      id: 3,
      intensity: 0.9,
      durationMs: 360,
      isCrit: true,
      reason: 'crit',
      startedAt: 1000,
    }

    const early = computeShakeFrame(event, 1020)
    const late = computeShakeFrame(event, 1310)
    const expired = computeShakeFrame(event, 1360)

    assert.equal(early.active, true)
    assert.ok(Math.abs(early.dx) > 0 || Math.abs(early.dy) > 0, 'Expected non-zero shake offset on impact')
    assert.ok(early.flashAlpha > 0, 'Expected brief impact flash right after hit')

    assert.equal(late.active, true)
    const earlyMag = Math.hypot(early.dx, early.dy)
    const lateMag = Math.hypot(late.dx, late.dy)
    assert.ok(lateMag < earlyMag, 'Shake magnitude must decay over time')
    assert.equal(late.flashAlpha, 0)

    assert.equal(expired.active, false)
    assert.equal(expired.dx, 0)
    assert.equal(expired.dy, 0)
    assert.equal(expired.rotDeg, 0)
  })
})
