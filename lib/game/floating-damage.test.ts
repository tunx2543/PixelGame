import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computePopupMotion,
  computeWorldFloatTransform,
  createFloatingPopup,
  formatExactDamage,
} from './floating-damage'

test('formatExactDamage renders exact integer digits with separators', () => {
  assert.equal(formatExactDamage(14250), '14,250')
  assert.equal(formatExactDamage(-5), '0')
})

test('createFloatingPopup sets crit and soulCrit badges and longer durations', () => {
  const normal = createFloatingPopup({ id: 1, target: 'enemy', kind: 'damage', amount: 320, now: 1000 })
  const crit = createFloatingPopup({ id: 2, target: 'enemy', kind: 'crit', amount: 640, now: 1000 })
  const soulCrit = createFloatingPopup({ id: 3, target: 'enemy', kind: 'soulCrit', amount: 1280, now: 1000 })
  const miss = createFloatingPopup({ id: 4, target: 'player', kind: 'miss', amount: 0, now: 1000 })

  assert.equal(normal.crit, false)
  assert.equal(crit.crit, true)
  assert.equal(crit.badge, 'CRITICAL!')
  assert.equal(soulCrit.soulCrit, true)
  assert.equal(soulCrit.crit, true)
  assert.equal(soulCrit.badge, 'SOUL CRIT!')
  assert.ok(soulCrit.durationMs > crit.durationMs)
  assert.equal(miss.text, 'MISS!')
})

test('computePopupMotion and computeWorldFloatTransform bounce peak and fade properly', () => {
  const soul = createFloatingPopup({ id: 5, target: 'enemy', kind: 'soulCrit', amount: 2500, now: 0 })
  const peak = computePopupMotion(soul, soul.durationMs * 0.14)
  const late = computePopupMotion(soul, soul.durationMs * 0.85)
  assert.equal(peak.alive, true)
  assert.ok(peak.scale > 1.45)
  assert.ok(late.opacity < 0.7)

  const worldPeak = computeWorldFloatTransform(0.86, 1.0, 'soulCrit', 6)
  assert.ok(worldPeak.scale > 1.3)
  assert.ok(worldPeak.dyWorld < 0)
  assert.ok(worldPeak.dxWorld > 0)
})
