import test from 'node:test'
import assert from 'node:assert/strict'
import { MAX_LEVEL, expToNext } from './data'
import {
  buildExpProgressionSeries,
  clampLevel,
  formatCompactExp,
  getCumulativeExpToLevel,
  getExpChartWindowRange,
} from './exp-progression'

test('clampLevel restricts values within 1..MAX_LEVEL', () => {
  assert.equal(clampLevel(0), 1)
  assert.equal(clampLevel(-15), 1)
  assert.equal(clampLevel(12.8), 12)
  assert.equal(clampLevel(999), MAX_LEVEL)
  assert.equal(clampLevel(Number.NaN), 1)
})

test('getCumulativeExpToLevel matches sum of expToNext for earlier levels', () => {
  assert.equal(getCumulativeExpToLevel(1), 0)
  assert.equal(getCumulativeExpToLevel(2), expToNext(1))
  assert.equal(getCumulativeExpToLevel(4), expToNext(1) + expToNext(2) + expToNext(3))
})

test('getExpChartWindowRange centers nearby window and clamps at edges', () => {
  assert.deepEqual(getExpChartWindowRange(1, 'nearby'), { startLevel: 1, endLevel: 21 })
  assert.deepEqual(getExpChartWindowRange(12, 'nearby'), { startLevel: 2, endLevel: 22 })
  assert.deepEqual(getExpChartWindowRange(98, 'nearby'), { startLevel: 80, endLevel: 100 })
  assert.deepEqual(getExpChartWindowRange(12, 'full'), { startLevel: 1, endLevel: 100 })
})

test('buildExpProgressionSeries computes summary and splits earned vs upcoming points', () => {
  const result = buildExpProgressionSeries({
    currentLevel: 12,
    currentExp: 500,
    maxExp: expToNext(12),
    range: 'nearby',
  })

  assert.equal(result.startLevel, 2)
  assert.equal(result.endLevel, 22)
  assert.equal(result.points.length, 21)

  const lv12 = result.points.find((pt) => pt.level === 12)
  const lv13 = result.points.find((pt) => pt.level === 13)
  assert.ok(lv12)
  assert.ok(lv13)
  assert.equal(lv12.isCurrentLevel, true)
  assert.equal(lv12.earnedPerLevel, expToNext(12))
  assert.equal(lv12.earnedCumulativeExp, lv12.cumulativeExp)
  assert.equal(lv13.isCurrentLevel, false)
  assert.equal(lv13.earnedPerLevel, null)
  assert.equal(lv13.earnedCumulativeExp, null)

  assert.equal(result.summary.currentLevel, 12)
  assert.equal(result.summary.nextLevelExp, expToNext(12))
  assert.equal(result.summary.remainingToNext, expToNext(12) - 500)
  assert.equal(result.summary.currentTotalExp, getCumulativeExpToLevel(12) + 500)
  assert.ok(result.summary.overallProgressPct > 0 && result.summary.overallProgressPct < 100)
})

test('buildExpProgressionSeries handles MAX_LEVEL cleanly', () => {
  const result = buildExpProgressionSeries({
    currentLevel: MAX_LEVEL,
    currentExp: 9999,
    range: 'full',
  })

  assert.equal(result.points.length, MAX_LEVEL)
  assert.equal(result.summary.isMaxLevel, true)
  assert.equal(result.summary.nextLevelExp, 0)
  assert.equal(result.summary.remainingToNext, 0)
  assert.equal(result.summary.levelProgressPct, 100)
  assert.equal(result.summary.overallProgressPct, 100)
})

test('formatCompactExp formats small, thousand, and million numbers cleanly', () => {
  assert.equal(formatCompactExp(420), '420')
  assert.equal(formatCompactExp(1347), '1.3K')
  assert.equal(formatCompactExp(39636), '39.6K')
  assert.equal(formatCompactExp(1250000), '1.3M')
})
