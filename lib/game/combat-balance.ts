export type LevelGapTier = 'normal' | 'caution' | 'danger' | 'overwhelming'

export interface LevelGapModifiers {
  levelDiff: number
  tier: LevelGapTier
  damageMul: number
  missChance: number
  incomingMul: number
  minDamageFloor: number
  warningLabel: string | null
}

export interface ComputeLevelGapOptions {
  isBoss?: boolean
  isGmStaff?: boolean
  isWorldBossRaid?: boolean
}

/**
 * Rebalances combat when a low-level player challenges much higher-level monsters.
 * - Up to +3 levels above player: full damage, no level-gap miss penalty.
 * - +4 to +8 levels: noticeable damage reduction, growing miss chance, stronger monster hits.
 * - +9 to +14 levels: severe damage suppression, high miss chance, 0 minimum chip floor, dangerous monster hits.
 * - +15 levels and above: overwhelming gap; attacks mostly miss/resist and monsters deal devastating strikes.
 */
export function computeLevelGapModifiers(
  playerLevel: number,
  monsterLevel: number,
  options?: ComputeLevelGapOptions,
): LevelGapModifiers {
  const safePlayerLv = Math.max(1, Math.floor(Number.isFinite(playerLevel) ? playerLevel : 1))
  const safeMonsterLv = Math.max(1, Math.floor(Number.isFinite(monsterLevel) ? monsterLevel : 1))
  const levelDiff = Math.max(0, safeMonsterLv - safePlayerLv)

  if (options?.isGmStaff) {
    return {
      levelDiff,
      tier: 'normal',
      damageMul: 1,
      missChance: 0,
      incomingMul: 1,
      minDamageFloor: 1,
      warningLabel: null,
    }
  }

  // Timed server-wide Event World Boss raids allow community participation while still scaling risk
  if (options?.isWorldBossRaid) {
    if (levelDiff <= 5) {
      return {
        levelDiff,
        tier: 'normal',
        damageMul: 1,
        missChance: 0,
        incomingMul: 1,
        minDamageFloor: 1,
        warningLabel: null,
      }
    }
    const over = levelDiff - 5
    return {
      levelDiff,
      tier: over >= 25 ? 'danger' : 'caution',
      damageMul: Math.max(0.28, 1 - over * 0.012),
      missChance: Math.min(0.22, over * 0.004),
      incomingMul: Math.min(2.8, 1 + over * 0.025),
      minDamageFloor: 1,
      warningLabel: `บอสโลก LV.${safeMonsterLv} (ต่าง ${levelDiff} เวล)`,
    }
  }

  if (levelDiff <= 3) {
    return {
      levelDiff,
      tier: 'normal',
      damageMul: 1,
      missChance: 0,
      incomingMul: 1,
      minDamageFloor: 1,
      warningLabel: null,
    }
  }

  let tier: LevelGapTier
  let damageMul: number
  let missChance: number
  let incomingMul: number
  let minDamageFloor: number

  if (levelDiff <= 8) {
    const over = levelDiff - 3 // 1..5
    tier = 'caution'
    damageMul = Math.max(0.45, 1 - over * 0.11) // 0.89 .. 0.45
    missChance = Math.min(0.22, over * 0.045) // 4.5% .. 22%
    incomingMul = 1 + over * 0.16 // 1.16x .. 1.80x
    minDamageFloor = 1
  } else if (levelDiff <= 14) {
    const over = levelDiff - 8 // 1..6
    tier = 'danger'
    damageMul = Math.max(0.14, 0.45 - over * 0.052) // 0.398 .. 0.14
    missChance = Math.min(0.56, 0.22 + over * 0.055) // 27.5% .. 55%
    incomingMul = 1.8 + over * 0.22 // 2.02x .. 3.12x
    minDamageFloor = 0
  } else {
    const over = levelDiff - 14 // 1+
    tier = 'overwhelming'
    damageMul = Math.max(0.03, 0.14 - over * 0.0065) // 0.1335 .. 0.03
    missChance = Math.min(0.84, 0.56 + over * 0.018) // 57.8% .. 84%
    incomingMul = Math.min(5.5, 3.12 + over * 0.14) // 3.26x .. 5.50x
    minDamageFloor = 0
  }

  if (options?.isBoss && levelDiff >= 5) {
    damageMul = Math.max(0.02, damageMul * 0.85)
    missChance = Math.min(0.88, missChance + 0.06)
    incomingMul = Math.min(6.0, incomingMul * 1.15)
  }

  const warningLabel =
    tier === 'overwhelming'
      ? `อันตราย! เวลห่าง +${levelDiff}`
      : tier === 'danger'
        ? `ศัตรูแกร่ง +${levelDiff} LV`
        : `เลเวลสูงกว่า +${levelDiff}`

  return {
    levelDiff,
    tier,
    damageMul,
    missChance,
    incomingMul,
    minDamageFloor,
    warningLabel,
  }
}
