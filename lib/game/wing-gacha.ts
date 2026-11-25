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
  // Common (14%)
  { fashionId: 'wing_drv_a7582c8d', rate: 14 },

  // Rare (36%)
  { fashionId: 'wing_drv_1fae0274', rate: 7.5 },
  { fashionId: 'wing_drv_475754b9', rate: 7.5 },
  { fashionId: 'wing_drv_93caf419', rate: 7 },
  { fashionId: 'wing_drv_ea1b38fb', rate: 7 },
  { fashionId: 'wing_fairy_emerald', rate: 7 },

  // Epic (32%)
  { fashionId: 'wing_drv_1f40660d', rate: 4.5 },
  { fashionId: 'wing_drv_1f6ac9f4', rate: 4.5 },
  { fashionId: 'wing_drv_335ad49b', rate: 4.5 },
  { fashionId: 'wing_drv_3dca4370', rate: 4 },
  { fashionId: 'wing_drv_ead9dfe5', rate: 4 },
  { fashionId: 'wing_drv_f84dd36d', rate: 4 },
  { fashionId: 'wing_seraph', rate: 3.5 },
  { fashionId: 'wing_ember', rate: 3 },

  // Legendary (14%)
  { fashionId: 'wing_drv_15fe84b6', rate: 2 },
  { fashionId: 'wing_drv_45947e7e', rate: 2 },
  { fashionId: 'wing_drv_9e601d3b', rate: 2 },
  { fashionId: 'wing_drv_af7f9121', rate: 2 },
  { fashionId: 'wing_drv_b1ab0813', rate: 2 },
  { fashionId: 'wing_cosmos', rate: 2 },
  { fashionId: 'nebula_dragon_wings', rate: 2 },

  // Mythic (4%)
  { fashionId: 'wing_vip_platinum', rate: 2 },
  { fashionId: 'wing_anim_inferno_phoenix', rate: 2 },
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
  const totalRate = WING_GACHA_POOL.reduce((acc, entry) => acc + entry.rate, 0)
  const clamped = Math.max(0, Math.min(0.9999999, rng()))
  let cursor = clamped * totalRate
  for (const entry of WING_GACHA_POOL) {
    cursor -= entry.rate
    if (cursor <= 0) return entry
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
