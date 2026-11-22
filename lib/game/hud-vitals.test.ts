import test from 'node:test'
import assert from 'node:assert/strict'
import { expToNext, MAX_LEVEL } from './data'
import {
  computeJobExpToNext,
  computeProfileProgressBars,
  MAX_PROFILE_JOB_LEVEL,
} from './hud-vitals'

test('computeProfileProgressBars computes XP and JP percentages accurately and clamps overflow', () => {
  const maxExp = expToNext(10)
  const maxJp = computeJobExpToNext(4)
  const res = computeProfileProgressBars({
    level: 10,
    exp: Math.floor(maxExp * 0.25),
    jobLevel: 4,
    jobExp: Math.floor(maxJp * 0.6),
  })

  assert.equal(res.level, 10)
  assert.equal(res.jobLevel, 4)
  assert.equal(res.maxExp, maxExp)
  assert.equal(res.maxJp, maxJp)
  assert.ok(res.xpPct > 24 && res.xpPct <= 25.5)
  assert.ok(res.jpPct > 59 && res.jpPct <= 60.5)

  const clamped = computeProfileProgressBars({
    level: 5,
    exp: 999999999,
    jobLevel: 2,
    jobExp: -50,
  })
  assert.equal(clamped.xpPct, 100)
  assert.equal(clamped.jpPct, 0)
})

test('computeProfileProgressBars returns 100% at max level and max job level', () => {
  const maxed = computeProfileProgressBars({
    level: MAX_LEVEL,
    exp: 0,
    jobLevel: MAX_PROFILE_JOB_LEVEL,
    jobExp: 0,
  })
  assert.equal(maxed.xpPct, 100)
  assert.equal(maxed.jpPct, 100)
})
