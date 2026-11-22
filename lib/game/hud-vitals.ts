import { expToNext, MAX_LEVEL } from './data'

export interface VitalsInput {
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  level: number
  exp: number
  gold: number
  diamonds?: number
}

export interface VitalsBarDatum {
  key: 'hp' | 'mp' | 'exp'
  label: 'HP' | 'MP' | 'EXP'
  current: number
  max: number
  percent: number
}

export interface VitalsSnapshot {
  bars: [VitalsBarDatum, VitalsBarDatum, VitalsBarDatum]
  gold: number
  diamonds: number
}

function clampInt(value: number, min = 0): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.floor(value))
}

function computePercent(current: number, max: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) return 0
  return Math.min(100, Math.max(0, (current / max) * 100))
}

/**
 * Pure snapshot builder for the Vitals & Currency HUD bar.
 * Exposes strictly the five core player meters/currencies:
 * HP, MP, EXP, Gold, and Diamond.
 */
export function buildVitalsSnapshot(input: VitalsInput): VitalsSnapshot {
  const maxHp = Math.max(1, clampInt(input.maxHp, 1))
  const hp = Math.min(maxHp, clampInt(input.hp, 0))

  const maxMp = Math.max(1, clampInt(input.maxMp, 1))
  const mp = Math.min(maxMp, clampInt(input.mp, 0))

  const needExp = Math.max(1, clampInt(expToNext(input.level), 1))
  const isMaxLevel = input.level >= MAX_LEVEL
  const exp = isMaxLevel ? needExp : Math.min(needExp, clampInt(input.exp, 0))

  return {
    bars: [
      { key: 'hp', label: 'HP', current: hp, max: maxHp, percent: computePercent(hp, maxHp) },
      { key: 'mp', label: 'MP', current: mp, max: maxMp, percent: computePercent(mp, maxMp) },
      { key: 'exp', label: 'EXP', current: exp, max: needExp, percent: computePercent(exp, needExp) },
    ],
    gold: clampInt(input.gold, 0),
    diamonds: clampInt(input.diamonds ?? 0, 0),
  }
}

export const MAX_PROFILE_JOB_LEVEL = 99

export function computeJobExpToNext(jobLevel: number): number {
  const safeLv = Math.max(1, Math.floor(Number.isFinite(jobLevel) ? jobLevel : 1))
  return Math.floor(35 + safeLv * 24 + safeLv * safeLv * 7)
}

export interface ProfileProgressBars {
  level: number
  jobLevel: number
  exp: number
  maxExp: number
  xpPct: number
  jobExp: number
  maxJp: number
  jpPct: number
}

export function computeProfileProgressBars(input: {
  level: number
  exp: number
  jobLevel?: number
  jobExp?: number
}): ProfileProgressBars {
  const level = Math.max(1, clampInt(input.level, 1))
  const maxExp = Math.max(1, clampInt(expToNext(level), 1))
  const exp = clampInt(input.exp, 0)
  const xpPct = level >= MAX_LEVEL ? 100 : computePercent(exp, maxExp)

  const jobLevel = Math.max(1, clampInt(input.jobLevel ?? 1, 1))
  const maxJp = Math.max(1, clampInt(computeJobExpToNext(jobLevel), 1))
  const jobExp = clampInt(input.jobExp ?? 0, 0)
  const jpPct = jobLevel >= MAX_PROFILE_JOB_LEVEL ? 100 : computePercent(jobExp, maxJp)

  return {
    level,
    jobLevel,
    exp,
    maxExp,
    xpPct,
    jobExp,
    maxJp,
    jpPct,
  }
}

