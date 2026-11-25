import { getFashionItemDef, PREMIUM_FASHION_ITEMS } from './premium/fashion-pet'
import type { FashionItemDef, PremiumRarity } from './premium/types'

export type WingGachaCurrency = 'gold' | 'diamond'
export type WingGachaCount = 1 | 5

export interface WingGachaPoolEntry {
  fashionId: string
  rate: number
  rarity: PremiumRarity
  def: FashionItemDef
}

export interface WingGachaPullOutcome {
  fashionId: string
  def: FashionItemDef
  rate: number
  rarity: PremiumRarity
  isNew: boolean
  duplicateGold: number
  duplicateStones: number
}

export interface WingGachaBatchParams {
  gold: number
  diamonds: number
  unlockedIds: readonly string[]
  gachaUnlockedIds: readonly string[]
  currency: WingGachaCurrency
  count: WingGachaCount
  rng?: () => number
}

export interface WingGachaBatchResult {
  ok: boolean
  error?: string
  currency: WingGachaCurrency
  count: WingGachaCount
  cost: number
  nextGold: number
  nextDiamonds: number
  unlockedIds: string[]
  gachaUnlockedIds: string[]
  results: WingGachaPullOutcome[]
  totalDuplicateGold: number
  totalDuplicateStones: number
}

export const WING_GACHA_COSTS: Record<WingGachaCurrency, Record<WingGachaCount, number>> = {
  gold: { single: 500, multi: 2250 } as unknown as Record<WingGachaCount, number>,
  diamond: { single: 15, multi: 68 } as unknown as Record<WingGachaCount, number>,
}

export function getWingGachaCost(currency: WingGachaCurrency, count: WingGachaCount): number {
  if (currency === 'gold') return count === 5 ? 2250 : 500
  return count === 5 ? 68 : 15
}

const WING_GACHA_RATES: ReadonlyArray<{ fashionId: string; rate: number }> = [
  // ทั่วไป (36.999%)
  { fashionId: 'wing_drv_a7582c8d', rate: 19.999 },
  { fashionId: 'wing_drv_1fae0274', rate: 17 },

  // หายาก (30%)
  { fashionId: 'wing_drv_475754b9', rate: 10 },
  { fashionId: 'wing_drv_93caf419', rate: 10 },
  { fashionId: 'wing_drv_ea1b38fb', rate: 10 },

  // อีปิก (22%)
  { fashionId: 'wing_drv_1f40660d', rate: 5.5 },
  { fashionId: 'wing_drv_335ad49b', rate: 5.5 },
  { fashionId: 'wing_drv_3dca4370', rate: 5.5 },
  { fashionId: 'wing_drv_ead9dfe5', rate: 5.5 },

  // ตำนาน (9%)
  { fashionId: 'wing_drv_1f6ac9f4', rate: 3 },
  { fashionId: 'wing_drv_45947e7e', rate: 3 },
  { fashionId: 'wing_drv_9e601d3b', rate: 3 },

  // มายา (2%)
  { fashionId: 'wing_drv_15fe84b6', rate: 0.5 },
  { fashionId: 'wing_drv_af7f9121', rate: 0.75 },
  { fashionId: 'wing_drv_b1ab0813', rate: 0.75 },

  // เทพ (0.001% - Animated 16-Frame Wing)
  { fashionId: 'wing_anim_inferno_phoenix', rate: 0.001 },
]

export const WING_GACHA_POOL: WingGachaPoolEntry[] = WING_GACHA_RATES.map((entry) => {
  const def = getFashionItemDef(entry.fashionId)
  if (!def || def.slot !== 'wings') {
    throw new Error(`Invalid wing gacha entry: ${entry.fashionId}`)
  }
  return {
    fashionId: entry.fashionId,
    rate: entry.rate,
    rarity: def.rarity,
    def,
  }
})

export const WING_GACHA_ALL_WING_IDS: readonly string[] = PREMIUM_FASHION_ITEMS
  .filter((item) => item.slot === 'wings')
  .map((item) => item.id)

export function getWingDuplicateReward(rarity: PremiumRarity): { gold: number; enhanceStones: number } {
  switch (rarity) {
    case 'เทพ':
      return { gold: 25000, enhanceStones: 50 }
    case 'มายา':
      return { gold: 8000, enhanceStones: 15 }
    case 'ตำนาน':
      return { gold: 4000, enhanceStones: 8 }
    case 'อีปิก':
      return { gold: 1500, enhanceStones: 4 }
    case 'หายาก':
      return { gold: 600, enhanceStones: 2 }
    default:
      return { gold: 250, enhanceStones: 1 }
  }
}

export function rollSingleWingGacha(rng: () => number = Math.random): WingGachaPoolEntry {
  const scaledWeights = WING_GACHA_POOL.map((entry) => Math.max(1, Math.round(entry.rate * 1000)))
  const totalScaled = scaledWeights.reduce((acc, weight) => acc + weight, 0)
  const clamped = Math.max(0, Math.min(1 - 1e-12, rng()))
  let cursor = Math.floor(clamped * totalScaled)
  for (let i = 0; i < WING_GACHA_POOL.length; i += 1) {
    const weight = scaledWeights[i]
    if (cursor < weight) return WING_GACHA_POOL[i]
    cursor -= weight
  }
  return WING_GACHA_POOL[WING_GACHA_POOL.length - 1]
}

export function executeWingGachaBatch(params: WingGachaBatchParams): WingGachaBatchResult {
  const { currency, count, rng = Math.random } = params
  const cost = getWingGachaCost(currency, count)
  const unlockedSet = new Set(params.unlockedIds)
  const gachaSet = new Set(params.gachaUnlockedIds)

  if (currency === 'gold' && params.gold < cost) {
    return {
      ok: false,
      error: `ทองไม่พอ (ต้องการ ${cost.toLocaleString()} G)`,
      currency,
      count,
      cost,
      nextGold: params.gold,
      nextDiamonds: params.diamonds,
      unlockedIds: [...unlockedSet],
      gachaUnlockedIds: [...gachaSet],
      results: [],
      totalDuplicateGold: 0,
      totalDuplicateStones: 0,
    }
  }
  if (currency === 'diamond' && params.diamonds < cost) {
    return {
      ok: false,
      error: `เพชรไม่พอ (ต้องการ ${cost.toLocaleString()} เพชร)`,
      currency,
      count,
      cost,
      nextGold: params.gold,
      nextDiamonds: params.diamonds,
      unlockedIds: [...unlockedSet],
      gachaUnlockedIds: [...gachaSet],
      results: [],
      totalDuplicateGold: 0,
      totalDuplicateStones: 0,
    }
  }

  let nextGold = currency === 'gold' ? params.gold - cost : params.gold
  const nextDiamonds = currency === 'diamond' ? params.diamonds - cost : params.diamonds
  let totalDuplicateGold = 0
  let totalDuplicateStones = 0
  const results: WingGachaPullOutcome[] = []

  for (let i = 0; i < count; i += 1) {
    const picked = rollSingleWingGacha(rng)
    const alreadyOwned = unlockedSet.has(picked.fashionId) || gachaSet.has(picked.fashionId)
    unlockedSet.add(picked.fashionId)
    gachaSet.add(picked.fashionId)

    if (alreadyOwned) {
      const reward = getWingDuplicateReward(picked.rarity)
      nextGold += reward.gold
      totalDuplicateGold += reward.gold
      totalDuplicateStones += reward.enhanceStones
      results.push({
        fashionId: picked.fashionId,
        def: picked.def,
        rate: picked.rate,
        rarity: picked.rarity,
        isNew: false,
        duplicateGold: reward.gold,
        duplicateStones: reward.enhanceStones,
      })
    } else {
      results.push({
        fashionId: picked.fashionId,
        def: picked.def,
        rate: picked.rate,
        rarity: picked.rarity,
        isNew: true,
        duplicateGold: 0,
        duplicateStones: 0,
      })
    }
  }

  return {
    ok: true,
    currency,
    count,
    cost,
    nextGold,
    nextDiamonds,
    unlockedIds: [...unlockedSet],
    gachaUnlockedIds: [...gachaSet],
    results,
    totalDuplicateGold,
    totalDuplicateStones,
  }
}
