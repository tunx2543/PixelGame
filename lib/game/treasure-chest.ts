import type { InvItem, SaveData } from './engine'
import { ITEMS } from './data'
import {
  generateRandomItem,
  type GeneratedItemInstance,
  type ItemRarity,
} from './items'
import type { ItemCategory } from './item-vfx'
import { EQUIPMENT_RARITY_META, EQUIPMENT_RARITY_ORDER } from './mmo-systems'

export type ChestTierId = 'wooden' | 'silver' | 'golden' | 'mythic'
export type ChestPaymentMode = 'gold' | 'key'

export const CHEST_ARTWORK_SHEET_SRC =
  '/assets/aistudio/01a21260-db44-7542-9a46-d57a4211f511_70d060be.png'
export const CHEST_ARTWORK_SHEET_SIZE = 832

export const BOX_EXCHANGE_ARTWORK_SRC =
  '/assets/aistudio/1795664643369_78d52694.jpg'
export const BOX_EXCHANGE_ARTWORK_WIDTH = 1408
export const BOX_EXCHANGE_ARTWORK_HEIGHT = 768

export interface ChestSpriteCropSpec {
  src?: string
  sheetWidth?: number
  sheetHeight?: number
  sx: number
  sy: number
  sw: number
  sh: number
  glowHex: string
}

export const CHEST_TIER_SPRITE_CROPS: Record<ChestTierId, ChestSpriteCropSpec> = {
  wooden: { sx: 4, sy: 362, sw: 162, sh: 192, glowHex: '#38bdf8' },
  silver: { sx: 165, sy: 362, sw: 162, sh: 192, glowHex: '#bae6fd' },
  golden: { sx: 327, sy: 362, sw: 164, sh: 192, glowHex: '#a855f7' },
  mythic: { sx: 493, sy: 362, sw: 168, sh: 192, glowHex: '#facc15' },
}

export const EVENT_CHEST_SPRITE_CROP: ChestSpriteCropSpec = {
  sx: 661,
  sy: 362,
  sw: 164,
  sh: 192,
  glowHex: '#fb7185',
}

export const COMPANION_BOX_SPRITE_CROP: ChestSpriteCropSpec = {
  src: BOX_EXCHANGE_ARTWORK_SRC,
  sheetWidth: BOX_EXCHANGE_ARTWORK_WIDTH,
  sheetHeight: BOX_EXCHANGE_ARTWORK_HEIGHT,
  sx: 226,
  sy: 196,
  sw: 344,
  sh: 328,
  glowHex: '#d946ef',
}

export const EVENT_LUCKY_BOX_SPRITE_CROP: ChestSpriteCropSpec = {
  src: BOX_EXCHANGE_ARTWORK_SRC,
  sheetWidth: BOX_EXCHANGE_ARTWORK_WIDTH,
  sheetHeight: BOX_EXCHANGE_ARTWORK_HEIGHT,
  sx: 856,
  sy: 196,
  sw: 344,
  sh: 328,
  glowHex: '#38bdf8',
}

export const SHOP_VIP_BUNDLE_ARTWORK_SRC =
  '/assets/aistudio/1795672649220_d9e58e71.jpg'
export const SHOP_VIP_BUNDLE_ARTWORK_WIDTH = 1536
export const SHOP_VIP_BUNDLE_ARTWORK_HEIGHT = 688

export type ShopVipBundleItemId =
  | 'vip_card_7d'
  | 'vip_card_30d'
  | 'vip_exp_crystal'
  | 'bundle_aurora_starter'
  | 'bundle_celestial_vault'
  | 'bundle_fast_learn_7d'

export const SHOP_VIP_BUNDLE_SPRITE_CROPS: Record<ShopVipBundleItemId, ChestSpriteCropSpec> = {
  vip_card_7d: {
    src: SHOP_VIP_BUNDLE_ARTWORK_SRC,
    sheetWidth: SHOP_VIP_BUNDLE_ARTWORK_WIDTH,
    sheetHeight: SHOP_VIP_BUNDLE_ARTWORK_HEIGHT,
    sx: 212,
    sy: 75,
    sw: 174,
    sh: 139,
    glowHex: '#fbbf24',
  },
  vip_card_30d: {
    src: SHOP_VIP_BUNDLE_ARTWORK_SRC,
    sheetWidth: SHOP_VIP_BUNDLE_ARTWORK_WIDTH,
    sheetHeight: SHOP_VIP_BUNDLE_ARTWORK_HEIGHT,
    sx: 678,
    sy: 76,
    sw: 176,
    sh: 136,
    glowHex: '#c084fc',
  },
  vip_exp_crystal: {
    src: SHOP_VIP_BUNDLE_ARTWORK_SRC,
    sheetWidth: SHOP_VIP_BUNDLE_ARTWORK_WIDTH,
    sheetHeight: SHOP_VIP_BUNDLE_ARTWORK_HEIGHT,
    sx: 1173,
    sy: 79,
    sw: 104,
    sh: 135,
    glowHex: '#38bdf8',
  },
  bundle_aurora_starter: {
    src: SHOP_VIP_BUNDLE_ARTWORK_SRC,
    sheetWidth: SHOP_VIP_BUNDLE_ARTWORK_WIDTH,
    sheetHeight: SHOP_VIP_BUNDLE_ARTWORK_HEIGHT,
    sx: 208,
    sy: 388,
    sw: 180,
    sh: 152,
    glowHex: '#2dd4bf',
  },
  bundle_celestial_vault: {
    src: SHOP_VIP_BUNDLE_ARTWORK_SRC,
    sheetWidth: SHOP_VIP_BUNDLE_ARTWORK_WIDTH,
    sheetHeight: SHOP_VIP_BUNDLE_ARTWORK_HEIGHT,
    sx: 669,
    sy: 388,
    sw: 185,
    sh: 152,
    glowHex: '#60a5fa',
  },
  bundle_fast_learn_7d: {
    src: SHOP_VIP_BUNDLE_ARTWORK_SRC,
    sheetWidth: SHOP_VIP_BUNDLE_ARTWORK_WIDTH,
    sheetHeight: SHOP_VIP_BUNDLE_ARTWORK_HEIGHT,
    sx: 1128,
    sy: 389,
    sw: 197,
    sh: 152,
    glowHex: '#4ade80',
  },
}

const SHOP_VIP_PRODUCT_TO_ITEM: Record<string, ShopVipBundleItemId> = {
  prod_vip_card_7d: 'vip_card_7d',
  prod_vip_card_30d: 'vip_card_30d',
  prod_vip_exp_crystal: 'vip_exp_crystal',
  prod_special_aurora_starter: 'bundle_aurora_starter',
  prod_special_celestial_vault: 'bundle_celestial_vault',
  prod_asura_fast_learn_7d: 'bundle_fast_learn_7d',
}

export function getShopCustomArtworkCrop(itemOrProductId: string): ChestSpriteCropSpec | null {
  if (itemOrProductId in SHOP_VIP_BUNDLE_SPRITE_CROPS) {
    return SHOP_VIP_BUNDLE_SPRITE_CROPS[itemOrProductId as ShopVipBundleItemId]
  }
  const mapped = SHOP_VIP_PRODUCT_TO_ITEM[itemOrProductId]
  return mapped ? SHOP_VIP_BUNDLE_SPRITE_CROPS[mapped] : null
}

export interface ChestTierDef {
  id: ChestTierId
  tierBadgeTh: string
  name: string
  subtitle: string
  costGold: number
  keyItemId?: string
  keyQty?: number
  tier: number
  minRarity: ItemRarity
  plusRange: readonly [number, number]
  goldBonusRange: readonly [number, number]
  rarityWeights: Record<ItemRarity, number>
  accentHex: string
  frameClass: string
}

export const CHEST_TIERS: Record<ChestTierId, ChestTierDef> = {
  wooden: {
    id: 'wooden',
    tierBadgeTh: 'หีบฟรี',
    name: 'หีบไม้ผจญภัย',
    subtitle: 'หีบฝึกหัดเปิดฟรีลุ้นอุปกรณ์ทุกประเภท',
    costGold: 0,
    tier: 1,
    minRarity: 'common',
    plusRange: [0, 2],
    goldBonusRange: [80, 220],
    rarityWeights: {
      common: 42,
      uncommon: 30,
      rare: 17,
      epic: 7,
      legendary: 3,
      mythic: 1,
    },
    accentHex: '#38bdf8',
    frameClass: 'border-sky-500/70 bg-sky-950/30',
  },
  silver: {
    id: 'silver',
    tierBadgeTh: 'หีบธรรมดา',
    name: 'หีบอัศวินเงิน',
    subtitle: 'การันตีระดับไม่ธรรมดา (Uncommon) ขึ้นไป',
    costGold: 600,
    tier: 2,
    minRarity: 'uncommon',
    plusRange: [1, 4],
    goldBonusRange: [250, 650],
    rarityWeights: {
      common: 0,
      uncommon: 40,
      rare: 34,
      epic: 17,
      legendary: 7,
      mythic: 2,
    },
    accentHex: '#94a3b8',
    frameClass: 'border-slate-400/75 bg-slate-900/50',
  },
  golden: {
    id: 'golden',
    tierBadgeTh: 'หีบหายาก',
    name: 'หีบทองคำราชันย์',
    subtitle: 'การันตีระดับหายาก (Rare) ขึ้นไป · ใช้ทองหรือกุญแจ 1 ดอก',
    costGold: 2200,
    keyItemId: 'imperial_gold_key',
    keyQty: 1,
    tier: 4,
    minRarity: 'rare',
    plusRange: [2, 6],
    goldBonusRange: [800, 2000],
    rarityWeights: {
      common: 0,
      uncommon: 0,
      rare: 44,
      epic: 33,
      legendary: 17,
      mythic: 6,
    },
    accentHex: '#a855f7',
    frameClass: 'border-purple-400/85 bg-purple-950/35',
  },
  mythic: {
    id: 'mythic',
    tierBadgeTh: 'หีบมหากาพย์',
    name: 'หีบสมบัติเทพ Pixel Quest',
    subtitle: 'การันตีระดับมหากาพย์ (Epic) ขึ้นไป · โอกาสระดับเทพสูงสุด',
    costGold: 7500,
    keyItemId: 'imperial_gold_key',
    keyQty: 2,
    tier: 6,
    minRarity: 'epic',
    plusRange: [4, 9],
    goldBonusRange: [2500, 6000],
    rarityWeights: {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 46,
      legendary: 36,
      mythic: 18,
    },
    accentHex: '#fbbf24',
    frameClass: 'border-amber-400/90 bg-amber-950/35',
  },
}

export const CHEST_TIER_ORDER: readonly ChestTierId[] = [
  'wooden',
  'silver',
  'golden',
  'mythic',
] as const

export interface TreasureChestReward {
  chestTierId: ChestTierId
  chestName: string
  item: GeneratedItemInstance
  goldBonus: number
  spentGold: number
  spentKeyId?: string
  spentKeyQty: number
  openedAt: number
}

export interface OpenTreasureChestInput {
  tierId: ChestTierId
  paymentMode?: ChestPaymentMode
  category?: ItemCategory
  playerLevel?: number
  gold: number
  inventory: InvItem[]
  maxInventorySlots: number
  rng?: () => number
}

export interface OpenTreasureChestResult {
  ok: boolean
  error?: string
  reward?: TreasureChestReward
  nextGold: number
  nextInventory: InvItem[]
}

function clampUnit(n: number): number {
  if (!Number.isFinite(n)) return 0.5
  return Math.max(0, Math.min(0.999999, n))
}

function rollIntInclusive(min: number, max: number, rng: () => number): number {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  return lo + Math.floor(clampUnit(rng()) * (hi - lo + 1))
}

export function rollChestRarity(
  tierDef: ChestTierDef,
  rng: () => number = Math.random,
): ItemRarity {
  const minIdx = EQUIPMENT_RARITY_ORDER.indexOf(tierDef.minRarity)
  const pool = EQUIPMENT_RARITY_ORDER.filter((_, idx) => idx >= minIdx).map((rarity) => ({
    rarity,
    weight: Math.max(0, tierDef.rarityWeights[rarity] ?? 0),
  }))

  const total = pool.reduce((sum, entry) => sum + entry.weight, 0)
  if (total <= 0) return tierDef.minRarity

  let cursor = clampUnit(rng()) * total
  for (const entry of pool) {
    cursor -= entry.weight
    if (cursor <= 0) return entry.rarity
  }
  return pool[pool.length - 1].rarity
}

export function countChestKeys(inventory: readonly InvItem[], keyItemId = 'imperial_gold_key'): number {
  return inventory
    .filter((item) => item.itemId === keyItemId && item.qty > 0)
    .reduce((sum, item) => sum + item.qty, 0)
}

export function generatedItemToInvItem(generated: GeneratedItemInstance): InvItem {
  return {
    uid: generated.uid,
    itemId: generated.itemId,
    qty: 1,
    plus: generated.plus,
    rarity: generated.rarity,
    affixes: generated.affixes,
  }
}

export function rollTreasureChestReward(options: {
  tierId: ChestTierId
  category?: ItemCategory
  playerLevel?: number
  spentGold?: number
  spentKeyId?: string
  spentKeyQty?: number
  rng?: () => number
}): TreasureChestReward {
  const rng = options.rng ?? Math.random
  const tierDef = CHEST_TIERS[options.tierId] ?? CHEST_TIERS.wooden
  const rarity = rollChestRarity(tierDef, rng)
  const plus = rollIntInclusive(tierDef.plusRange[0], tierDef.plusRange[1], rng)
  const goldBonus = rollIntInclusive(tierDef.goldBonusRange[0], tierDef.goldBonusRange[1], rng)

  const maxLevel =
    typeof options.playerLevel === 'number'
      ? Math.max(25, Math.min(100, options.playerLevel + 15))
      : undefined

  const item = generateRandomItem({
    rarity,
    tier: tierDef.tier,
    category: options.category,
    maxLevel,
    plus,
    rng,
  })

  return {
    chestTierId: tierDef.id,
    chestName: tierDef.name,
    item,
    goldBonus,
    spentGold: options.spentGold ?? 0,
    spentKeyId: options.spentKeyId,
    spentKeyQty: options.spentKeyQty ?? 0,
    openedAt: Date.now(),
  }
}

function addChestItemToInventory(
  inventory: InvItem[],
  reward: TreasureChestReward,
  maxInventorySlots: number,
): { ok: boolean; error?: string; nextInventory: InvItem[] } {
  const nextInventory = inventory.map((entry) => ({ ...entry }))
  const rawDef = ITEMS[reward.item.itemId]
  const isStackable = rawDef && (rawDef.kind === 'consumable' || rawDef.kind === 'material')

  if (isStackable) {
    const existing = nextInventory.find((entry) => entry.itemId === reward.item.itemId)
    if (existing) {
      existing.qty += 1
      return { ok: true, nextInventory }
    }
    if (nextInventory.length >= maxInventorySlots) {
      return {
        ok: false,
        error: 'กระเป๋าเต็ม กรุณาเคลียร์ช่องเก็บของก่อนเปิดหีบ',
        nextInventory: inventory,
      }
    }
    nextInventory.push({
      uid: reward.item.uid,
      itemId: reward.item.itemId,
      qty: 1,
      plus: 0,
    })
    return { ok: true, nextInventory }
  }

  if (nextInventory.length >= maxInventorySlots) {
    return {
      ok: false,
      error: 'กระเป๋าเต็ม กรุณาเคลียร์ช่องเก็บของก่อนเปิดหีบ',
      nextInventory: inventory,
    }
  }
  nextInventory.push(generatedItemToInvItem(reward.item))
  return { ok: true, nextInventory }
}

export function openTreasureChest(input: OpenTreasureChestInput): OpenTreasureChestResult {
  const tierDef = CHEST_TIERS[input.tierId]
  if (!tierDef) {
    return {
      ok: false,
      error: 'ไม่พบประเภทหีบสมบัติที่เลือก',
      nextGold: input.gold,
      nextInventory: input.inventory,
    }
  }

  const rng = input.rng ?? Math.random
  const wantKey =
    input.paymentMode === 'key' && Boolean(tierDef.keyItemId && (tierDef.keyQty ?? 0) > 0)
  const keyItemId = tierDef.keyItemId
  const keyQty = tierDef.keyQty ?? 0

  if (wantKey && keyItemId) {
    const ownedKeys = countChestKeys(input.inventory, keyItemId)
    if (ownedKeys < keyQty) {
      const keyName = ITEMS[keyItemId]?.name ?? 'กุญแจทองคำราชันย์'
      return {
        ok: false,
        error: `ต้องใช้ ${keyName} x${keyQty} (มี ${ownedKeys})`,
        nextGold: input.gold,
        nextInventory: input.inventory,
      }
    }
  } else if (input.gold < tierDef.costGold) {
    return {
      ok: false,
      error: `ทองคำไม่พอ (ต้องการ ${tierDef.costGold.toLocaleString()} G)`,
      nextGold: input.gold,
      nextInventory: input.inventory,
    }
  }

  // Clone inventory before deducting key so slot capacity is calculated accurately.
  let nextInventory = input.inventory.map((entry) => ({ ...entry }))
  let spentGold = 0
  let spentKeyId: string | undefined
  let spentKeyQty = 0

  if (wantKey && keyItemId) {
    let remaining = keyQty
    nextInventory = nextInventory
      .map((entry) => {
        if (entry.itemId !== keyItemId || remaining <= 0) return entry
        const deduct = Math.min(entry.qty, remaining)
        remaining -= deduct
        return { ...entry, qty: entry.qty - deduct }
      })
      .filter((entry) => entry.qty > 0)
    spentKeyId = keyItemId
    spentKeyQty = keyQty
  } else {
    spentGold = tierDef.costGold
  }

  const reward = rollTreasureChestReward({
    tierId: tierDef.id,
    category: input.category,
    playerLevel: input.playerLevel,
    spentGold,
    spentKeyId,
    spentKeyQty,
    rng,
  })

  const bagRes = addChestItemToInventory(nextInventory, reward, input.maxInventorySlots)
  if (!bagRes.ok) {
    return {
      ok: false,
      error: bagRes.error,
      nextGold: input.gold,
      nextInventory: input.inventory,
    }
  }

  const nextGold = Math.max(0, input.gold - spentGold) + reward.goldBonus

  return {
    ok: true,
    reward,
    nextGold,
    nextInventory: bagRes.nextInventory,
  }
}

export function applyTreasureChestToSave(
  save: SaveData,
  options: {
    tierId: ChestTierId
    paymentMode?: ChestPaymentMode
    category?: ItemCategory
    maxInventorySlots: number
    rng?: () => number
  },
): { ok: boolean; error?: string; reward?: TreasureChestReward; nextSave: SaveData } {
  const result = openTreasureChest({
    tierId: options.tierId,
    paymentMode: options.paymentMode,
    category: options.category,
    playerLevel: save.level,
    gold: save.gold,
    inventory: save.inventory,
    maxInventorySlots: options.maxInventorySlots,
    rng: options.rng,
  })

  if (!result.ok || !result.reward) {
    return { ok: false, error: result.error, nextSave: save }
  }

  return {
    ok: true,
    reward: result.reward,
    nextSave: {
      ...save,
      gold: result.nextGold,
      inventory: result.nextInventory,
    },
  }
}

export interface OpenMultipleTreasureChestsResult {
  ok: boolean
  error?: string
  stoppedEarlyReason?: string
  rewards: TreasureChestReward[]
  totalGoldBonus: number
  totalSpentGold: number
  totalSpentKeyQty: number
  nextGold: number
  nextInventory: InvItem[]
}

export interface TreasureChestBatchSummary {
  totalCount: number
  totalGoldBonus: number
  totalSpentGold: number
  totalSpentKeyQty: number
  highestRarity: ItemRarity
  rarityCounts: Record<ItemRarity, number>
}

export function summarizeTreasureChestRewards(
  rewards: readonly TreasureChestReward[],
): TreasureChestBatchSummary {
  const rarityCounts: Record<ItemRarity, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
    mythic: 0,
  }
  let totalGoldBonus = 0
  let totalSpentGold = 0
  let totalSpentKeyQty = 0
  let highestIdx = 0

  for (const r of rewards) {
    totalGoldBonus += r.goldBonus
    totalSpentGold += r.spentGold
    totalSpentKeyQty += r.spentKeyQty
    rarityCounts[r.item.rarity] = (rarityCounts[r.item.rarity] ?? 0) + 1
    const idx = EQUIPMENT_RARITY_ORDER.indexOf(r.item.rarity)
    if (idx > highestIdx) highestIdx = idx
  }

  return {
    totalCount: rewards.length,
    totalGoldBonus,
    totalSpentGold,
    totalSpentKeyQty,
    highestRarity: EQUIPMENT_RARITY_ORDER[highestIdx] ?? 'common',
    rarityCounts,
  }
}

/**
 * Executes `openTreasureChest` sequentially up to `count` times (default 10),
 * threading updated gold and inventory from each roll into the next roll.
 */
export function openMultipleTreasureChests(
  input: OpenTreasureChestInput & { count?: number },
): OpenMultipleTreasureChestsResult {
  const count = Math.max(1, Math.min(50, Math.floor(input.count ?? 10)))
  let currentGold = input.gold
  let currentInventory = input.inventory.map((entry) => ({ ...entry }))
  const rewards: TreasureChestReward[] = []
  let totalGoldBonus = 0
  let totalSpentGold = 0
  let totalSpentKeyQty = 0
  let stoppedEarlyReason: string | undefined

  for (let i = 0; i < count; i++) {
    const step = openTreasureChest({
      tierId: input.tierId,
      paymentMode: input.paymentMode,
      category: input.category,
      playerLevel: input.playerLevel,
      gold: currentGold,
      inventory: currentInventory,
      maxInventorySlots: input.maxInventorySlots,
      rng: input.rng,
    })

    if (!step.ok || !step.reward) {
      if (i === 0) {
        return {
          ok: false,
          error: step.error ?? 'ไม่สามารถเปิดหีบสมบัติได้',
          rewards: [],
          totalGoldBonus: 0,
          totalSpentGold: 0,
          totalSpentKeyQty: 0,
          nextGold: input.gold,
          nextInventory: input.inventory,
        }
      }
      stoppedEarlyReason = step.error
      break
    }

    rewards.push(step.reward)
    totalGoldBonus += step.reward.goldBonus
    totalSpentGold += step.reward.spentGold
    totalSpentKeyQty += step.reward.spentKeyQty
    currentGold = step.nextGold
    currentInventory = step.nextInventory
  }

  return {
    ok: true,
    stoppedEarlyReason,
    rewards,
    totalGoldBonus,
    totalSpentGold,
    totalSpentKeyQty,
    nextGold: currentGold,
    nextInventory: currentInventory,
  }
}

export function applyMultipleTreasureChestsToSave(
  save: SaveData,
  options: {
    tierId: ChestTierId
    paymentMode?: ChestPaymentMode
    category?: ItemCategory
    maxInventorySlots: number
    count?: number
    rng?: () => number
  },
): OpenMultipleTreasureChestsResult & { nextSave: SaveData } {
  const result = openMultipleTreasureChests({
    tierId: options.tierId,
    paymentMode: options.paymentMode,
    category: options.category,
    playerLevel: save.level,
    gold: save.gold,
    inventory: save.inventory,
    maxInventorySlots: options.maxInventorySlots,
    count: options.count ?? 10,
    rng: options.rng,
  })

  if (!result.ok || result.rewards.length === 0) {
    return { ...result, nextSave: save }
  }

  return {
    ...result,
    nextSave: {
      ...save,
      gold: result.nextGold,
      inventory: result.nextInventory,
    },
  }
}

export function getChestRarityPreviewLabels(tierDef: ChestTierDef): string[] {
  const minIdx = EQUIPMENT_RARITY_ORDER.indexOf(tierDef.minRarity)
  return EQUIPMENT_RARITY_ORDER.slice(minIdx).map((r) => EQUIPMENT_RARITY_META[r].thaiLabel)
}

export interface ChestRarityProbability {
  rarity: ItemRarity
  label: string
  thaiLabel: string
  weight: number
  probability: number
  percentage: number
  isAvailable: boolean
  hexColor: string
  textColorClass: string
  borderColorClass: string
}

/**
 * Calculates the exact drop probability and percentage for every rarity tier
 * for a given chest tier (mirroring rollChestRarity's minRarity floor and weights).
 */
export function calculateChestRarityProbabilities(
  tierOrId: ChestTierId | ChestTierDef,
): ChestRarityProbability[] {
  const tierDef =
    typeof tierOrId === 'string'
      ? (CHEST_TIERS[tierOrId] ?? CHEST_TIERS.wooden)
      : tierOrId
  const minIdx = EQUIPMENT_RARITY_ORDER.indexOf(tierDef.minRarity)

  const effectiveWeights = EQUIPMENT_RARITY_ORDER.map((rarity, idx) =>
    idx >= minIdx ? Math.max(0, tierDef.rarityWeights[rarity] ?? 0) : 0,
  )
  const totalWeight = effectiveWeights.reduce((sum, w) => sum + w, 0)

  return EQUIPMENT_RARITY_ORDER.map((rarity, idx) => {
    const meta = EQUIPMENT_RARITY_META[rarity]
    const weight = effectiveWeights[idx]
    let probability = 0
    if (totalWeight > 0) {
      probability = weight / totalWeight
    } else if (rarity === tierDef.minRarity) {
      probability = 1
    }
    const percentage = Math.round(probability * 1000) / 10

    return {
      rarity,
      label: meta.label,
      thaiLabel: meta.thaiLabel,
      weight,
      probability,
      percentage,
      isAvailable: probability > 0,
      hexColor: meta.hexColor,
      textColorClass: meta.textColorClass,
      borderColorClass: meta.borderColorClass,
    }
  })
}

/* ========================================================================== */
/* DAILY FREE STANDARD TREASURE CHEST (24-HOUR COOLDOWN)                      */
/* ========================================================================== */

export const DAILY_FREE_CHEST_COOLDOWN_MS = 24 * 60 * 60 * 1000
export const DAILY_FREE_CHEST_TIER_ID: ChestTierId = 'silver'

export interface DailyFreeChestStatus {
  isAvailable: boolean
  remainingMs: number
  nextAvailableAt: number
  lastClaimedAt: number | null
}

export function getDailyFreeChestStatus(
  lastClaimedAt: number | null | undefined,
  now = Date.now(),
): DailyFreeChestStatus {
  const validClaim =
    typeof lastClaimedAt === 'number' && Number.isFinite(lastClaimedAt) && lastClaimedAt > 0
      ? lastClaimedAt
      : null

  if (validClaim === null) {
    return {
      isAvailable: true,
      remainingMs: 0,
      nextAvailableAt: now,
      lastClaimedAt: null,
    }
  }

  const elapsed = Math.max(0, now - validClaim)
  const remainingMs = Math.max(0, DAILY_FREE_CHEST_COOLDOWN_MS - elapsed)
  const isAvailable = remainingMs === 0

  return {
    isAvailable,
    remainingMs,
    nextAvailableAt: isAvailable ? now : validClaim + DAILY_FREE_CHEST_COOLDOWN_MS,
    lastClaimedAt: validClaim,
  }
}

export function canClaimDailyFreeChest(
  lastClaimedAt: number | null | undefined,
  now = Date.now(),
): boolean {
  return getDailyFreeChestStatus(lastClaimedAt, now).isAvailable
}

export function formatCooldownDuration(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  return [hours, mins, secs].map((n) => String(n).padStart(2, '0')).join(':')
}

export interface ClaimDailyFreeChestResult {
  ok: boolean
  error?: string
  reward?: TreasureChestReward
  nextGold: number
  nextInventory: InvItem[]
  nextClaimedAt: number | null
  remainingMs: number
}

export function claimDailyFreeTreasureChest(input: {
  lastClaimedAt: number | null | undefined
  now?: number
  playerLevel?: number
  category?: ItemCategory
  gold: number
  inventory: InvItem[]
  maxInventorySlots: number
  rng?: () => number
}): ClaimDailyFreeChestResult {
  const now = typeof input.now === 'number' && Number.isFinite(input.now) ? input.now : Date.now()
  const status = getDailyFreeChestStatus(input.lastClaimedAt, now)

  if (!status.isAvailable) {
    return {
      ok: false,
      error: `หีบฟรีประจำวันยังไม่พร้อม (รออีก ${formatCooldownDuration(status.remainingMs)})`,
      nextGold: input.gold,
      nextInventory: input.inventory,
      nextClaimedAt: status.lastClaimedAt,
      remainingMs: status.remainingMs,
    }
  }

  const reward = rollTreasureChestReward({
    tierId: DAILY_FREE_CHEST_TIER_ID,
    category: input.category,
    playerLevel: input.playerLevel,
    spentGold: 0,
    spentKeyQty: 0,
    rng: input.rng,
  })
  reward.openedAt = now

  const bagRes = addChestItemToInventory(input.inventory, reward, input.maxInventorySlots)
  if (!bagRes.ok) {
    return {
      ok: false,
      error: bagRes.error,
      nextGold: input.gold,
      nextInventory: input.inventory,
      nextClaimedAt: status.lastClaimedAt,
      remainingMs: 0,
    }
  }

  return {
    ok: true,
    reward,
    nextGold: input.gold + reward.goldBonus,
    nextInventory: bagRes.nextInventory,
    nextClaimedAt: now,
    remainingMs: DAILY_FREE_CHEST_COOLDOWN_MS,
  }
}

export function applyDailyFreeChestToSave(
  save: SaveData,
  options: {
    maxInventorySlots: number
    category?: ItemCategory
    now?: number
    rng?: () => number
  },
): ClaimDailyFreeChestResult & { nextSave: SaveData } {
  const res = claimDailyFreeTreasureChest({
    lastClaimedAt: save.lastDailyFreeChestAt,
    now: options.now,
    playerLevel: save.level,
    category: options.category,
    gold: save.gold,
    inventory: save.inventory,
    maxInventorySlots: options.maxInventorySlots,
    rng: options.rng,
  })

  if (!res.ok || !res.reward) {
    return { ...res, nextSave: save }
  }

  return {
    ...res,
    nextSave: {
      ...save,
      gold: res.nextGold,
      inventory: res.nextInventory,
      lastDailyFreeChestAt: res.nextClaimedAt ?? Date.now(),
    },
  }
}
