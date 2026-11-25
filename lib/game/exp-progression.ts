import { MAX_LEVEL, expToNext } from './data'

export type ExpChartMode = 'perLevel' | 'cumulative'
export type ExpChartRange = 'nearby' | 'full'

export interface ExpLevelPoint {
  level: number
  label: string
  expToNext: number
  cumulativeExp: number
  earnedPerLevel: number | null
  earnedCumulativeExp: number | null
  isCurrentLevel: boolean
  isMilestone: boolean
}

export interface ExpProgressionSummary {
  currentLevel: number
  maxLevel: number
  isMaxLevel: boolean
  currentExp: number
  nextLevelExp: number
  remainingToNext: number
  levelProgressPct: number
  cumulativeAtCurrentLevel: number
  currentTotalExp: number
  totalExpToMaxLevel: number
  overallProgressPct: number
}

export interface ExpProgressionSeriesResult {
  points: ExpLevelPoint[]
  summary: ExpProgressionSummary
  startLevel: number
  endLevel: number
}

export function clampLevel(level: number, maxLevel = MAX_LEVEL): number {
  if (!Number.isFinite(level)) return 1
  return Math.max(1, Math.min(maxLevel, Math.floor(level)))
}

export function getCumulativeExpToLevel(targetLevel: number, maxLevel = MAX_LEVEL): number {
  const safeLevel = clampLevel(targetLevel, maxLevel)
  let total = 0
  for (let lv = 1; lv < safeLevel; lv += 1) {
    total += expToNext(lv)
  }
  return total
}

export function getExpChartWindowRange(
  currentLevel: number,
  range: ExpChartRange,
  maxLevel = MAX_LEVEL,
): { startLevel: number; endLevel: number } {
  const safeLevel = clampLevel(currentLevel, maxLevel)
  if (range === 'full') {
    return { startLevel: 1, endLevel: maxLevel }
  }

  const windowSpan = 20
  let startLevel = Math.max(1, safeLevel - 10)
  let endLevel = Math.min(maxLevel, startLevel + windowSpan)
  if (endLevel - startLevel < windowSpan) {
    startLevel = Math.max(1, endLevel - windowSpan)
  }
  return { startLevel, endLevel }
}

export function formatCompactExp(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const abs = Math.abs(value)
  if (abs >= 1_000_000) {
    const num = value / 1_000_000
    return `${Number.isInteger(num) ? num : num.toFixed(1)}M`
  }
  if (abs >= 1_000) {
    const num = value / 1_000
    return `${num >= 100 || Number.isInteger(num) ? Math.round(num) : num.toFixed(1)}K`
  }
  return String(Math.round(value))
}

export function buildExpProgressionSeries(input: {
  currentLevel: number
  currentExp: number
  maxExp?: number
  range?: ExpChartRange
  maxLevel?: number
}): ExpProgressionSeriesResult {
  const maxLevel = input.maxLevel ?? MAX_LEVEL
  const currentLevel = clampLevel(input.currentLevel, maxLevel)
  const isMaxLevel = currentLevel >= maxLevel
  const canonicalNextExp = isMaxLevel ? 0 : expToNext(currentLevel)
  const nextLevelExp = isMaxLevel
    ? 0
    : Math.max(1, Math.round(input.maxExp && input.maxExp > 0 ? input.maxExp : canonicalNextExp))

  const safeCurrentExp = isMaxLevel
    ? 0
    : Math.max(0, Math.min(nextLevelExp, Math.round(input.currentExp)))
  const remainingToNext = isMaxLevel ? 0 : Math.max(0, nextLevelExp - safeCurrentExp)
  const levelProgressPct = isMaxLevel
    ? 100
    : Math.min(100, Math.round((safeCurrentExp / nextLevelExp) * 100))

  const allPoints: ExpLevelPoint[] = []
  let runningCumulative = 0
  let cumulativeAtCurrentLevel = 0

  for (let lv = 1; lv <= maxLevel; lv += 1) {
    if (lv === currentLevel) {
      cumulativeAtCurrentLevel = runningCumulative
    }
    const stepExp = lv >= maxLevel ? 0 : expToNext(lv)
    const isCurrentLevel = lv === currentLevel
    const earned = lv <= currentLevel
    allPoints.push({
      level: lv,
      label: `Lv.${lv}`,
      expToNext: isCurrentLevel && !isMaxLevel ? nextLevelExp : stepExp,
      cumulativeExp: runningCumulative,
      earnedPerLevel: earned ? (isCurrentLevel && !isMaxLevel ? nextLevelExp : stepExp) : null,
      earnedCumulativeExp: earned ? runningCumulative : null,
      isCurrentLevel,
      isMilestone: lv === 1 || lv === maxLevel || lv % 10 === 0,
    })
    runningCumulative += stepExp
  }

  const totalExpToMaxLevel = runningCumulative
  const currentTotalExp = isMaxLevel
    ? totalExpToMaxLevel
    : Math.min(totalExpToMaxLevel, cumulativeAtCurrentLevel + safeCurrentExp)
  const overallProgressPct =
    totalExpToMaxLevel > 0
      ? Math.min(100, Number(((currentTotalExp / totalExpToMaxLevel) * 100).toFixed(2)))
      : 100

  const range = input.range ?? 'nearby'
  const { startLevel, endLevel } = getExpChartWindowRange(currentLevel, range, maxLevel)
  const points = allPoints.filter((pt) => pt.level >= startLevel && pt.level <= endLevel)

  return {
    points,
    startLevel,
    endLevel,
    summary: {
      currentLevel,
      maxLevel,
      isMaxLevel,
      currentExp: safeCurrentExp,
      nextLevelExp,
      remainingToNext,
      levelProgressPct,
      cumulativeAtCurrentLevel,
      currentTotalExp,
      totalExpToMaxLevel,
      overallProgressPct,
    },
  }
}
