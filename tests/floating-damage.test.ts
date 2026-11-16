import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  CRIT_POPUP_DURATION_MS,
  DEFAULT_POPUP_DURATION_MS,
  computePopupMotion,
  computePopupOffset,
  createFloatingPopup,
  formatExactDamage,
  pruneExpiredPopups,
  type FloatingDamagePopup,
} from '../lib/game/floating-damage'

describe('floating-damage', () => {
  it('formats exact integer damage without rounding into K/M suffixes', () => {
    assert.equal(formatExactDamage(0), '0')
    assert.equal(formatExactDamage(42), '42')
    assert.equal(formatExactDamage(1247), '1,247')
    assert.equal(formatExactDamage(9999999), '9,999,999')
    assert.equal(formatExactDamage(88.6), '89')
    assert.equal(formatExactDamage(-10), '0')
    assert.equal(formatExactDamage(Number.NaN), '0')
  })

  it('staggers consecutive popups so multi-hits do not stack on the exact same pixel', () => {
    const slots = [0, 1, 2, 3].map((i) => computePopupOffset(i + 1, i))
    const uniqueX = new Set(slots.map((s) => s.offsetX))
    assert.ok(uniqueX.size >= 3, 'Expected consecutive hits to spread horizontally')
  })

  it('creates floating damage popups with exact amount and duration by hit kind', () => {
    const normal = createFloatingPopup({
      id: 1,
      target: 'enemy',
      kind: 'damage',
      amount: 1384,
      color: '#ffffff',
      now: 1000,
    })
    assert.equal(normal.target, 'enemy')
    assert.equal(normal.amount, 1384)
    assert.equal(normal.text, '1,384')
    assert.equal(normal.crit, false)
    assert.equal(normal.durationMs, DEFAULT_POPUP_DURATION_MS)

    const crit = createFloatingPopup({
      id: 2,
      target: 'enemy',
      kind: 'crit',
      amount: 2549,
      badge: 'CRIT!',
      color: '#ffd60a',
      now: 1050,
      activePopups: [normal],
    })
    assert.equal(crit.amount, 2549)
    assert.equal(crit.text, '2,549')
    assert.equal(crit.badge, 'CRIT!')
    assert.equal(crit.crit, true)
    assert.equal(crit.durationMs, CRIT_POPUP_DURATION_MS)
  })

  it('prunes expired popups cleanly and keeps active ones', () => {
    const p1: FloatingDamagePopup = createFloatingPopup({
      id: 1,
      target: 'enemy',
      kind: 'damage',
      amount: 25,
      color: '#ffffff',
      now: 1000,
    })
    const p2: FloatingDamagePopup = createFloatingPopup({
      id: 2,
      target: 'enemy',
      kind: 'crit',
      amount: 75,
      color: '#ffd60a',
      now: 1500,
    })

    const at1900 = pruneExpiredPopups([p1, p2], 1900)
    assert.equal(at1900.length, 2)

    const at2000 = pruneExpiredPopups([p1, p2], 2000)
    assert.equal(at2000.length, 1)
    assert.equal(at2000[0].id, 2)

    const at3000 = pruneExpiredPopups([p1, p2], 3000)
    assert.equal(at3000.length, 0)
  })

  it('computes upward float, impact scale pop, and end-of-life fade out', () => {
    const popup = createFloatingPopup({
      id: 1,
      target: 'enemy',
      kind: 'crit',
      amount: 500,
      color: '#ffd60a',
      now: 1000,
    })

    const early = computePopupMotion(popup, 1000 + Math.round(popup.durationMs * 0.16))
    const mid = computePopupMotion(popup, 1000 + Math.round(popup.durationMs * 0.5))
    const late = computePopupMotion(popup, 1000 + Math.round(popup.durationMs * 0.9))
    const expired = computePopupMotion(popup, 1000 + popup.durationMs + 10)

    assert.equal(early.alive, true)
    assert.ok(early.scale > 1.2, 'Crit popup should punch up above 1.2x scale on impact')
    assert.equal(mid.opacity, 1)
    assert.ok(mid.yOffsetPx < early.yOffsetPx, 'Popup should float upward over time')
    assert.ok(late.yOffsetPx < mid.yOffsetPx, 'Popup should keep rising toward end of lifetime')
    assert.ok(late.opacity < 0.5, 'Popup should fade out near end of lifetime')
    assert.equal(expired.alive, false)
    assert.equal(expired.opacity, 0)
  })
})
