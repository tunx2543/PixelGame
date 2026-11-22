import {
  ITEMS,
  type EquipmentSlot,
  type ItemDef,
  type ItemKind,
  type WeaponType,
} from './data'
import {
  inferItemCategory,
  inferItemElement,
  resolveItemVfxSpec,
  type ItemCategory,
  type ItemElement,
  type ItemVfxSpec,
} from './item-vfx'
import {
  EQUIPMENT_RARITY_META,
  EQUIPMENT_RARITY_ORDER,
  resolveEffectiveRarity,
  rollEquipmentAffixes,
  type EquipmentRarity,
  type ItemAffix,
  type RarityStyleMeta,
} from './mmo-systems'

export type ItemRarity = EquipmentRarity

export const ITEM_RARITIES: readonly ItemRarity[] = EQUIPMENT_RARITY_ORDER
export const ITEM_RARITY_META: Record<ItemRarity, RarityStyleMeta> = EQUIPMENT_RARITY_META

export const SET_A_ITEM_CATEGORIES: readonly ItemCategory[] = [
  'weapon',
  'helmet',
  'armor',
  'gloves',
  'boots',
  'shield',
  'accessory',
  'ring',
  'necklace',
  'charm',
  'special',
] as const

export interface ItemBaseStats {
  atk: number
  def: number
  hp: number
  critPct: number
  speedBonus: number
  heal: number
  mana: number
}

export interface ItemSchema {
  id: string
  name: string
  kind: ItemKind
  category: ItemCategory
  slot?: EquipmentSlot
  weaponType?: WeaponType
  rarity: ItemRarity
  element: ItemElement
  reqLevel: number
  tier: number
  stats: ItemBaseStats
  price: number
  sellPrice: number
  imagePath: string
  description: string
  gmOnly: boolean
}

export interface GeneratedItemInstance {
  uid: string
  itemId: string
  name: string
  category: ItemCategory
  slot?: EquipmentSlot
  weaponType?: WeaponType
  rarity: ItemRarity
  rarityLabel: string
  rarityThaiLabel: string
  element: ItemElement
  reqLevel: number
  tier: number
  plus: number
  qty: number
  stats: ItemBaseStats
  affixes: ItemAffix[]
  sellPrice: number
  imagePath: string
  description: string
  vfx: ItemVfxSpec
}

export interface GenerateRandomItemOptions {
  /** Force a specific rarity tier (common | uncommon | rare | epic | legendary | mythic). */
  rarity?: ItemRarity
  /** Restrict pool to a specific Set A category (weapon, helmet, armor, gloves, boots, shield, accessory, ring, necklace, charm, special). */
  category?: ItemCategory
  /** Minimum required level filter for candidate templates. */
  minLevel?: number
  /** Maximum required level filter for candidate templates. */
  maxLevel?: number
  /** Tier shift influencing rarity weights when `rarity` is omitted (1..6). */
  tier?: number
  /** Allow mythic in weighted random roll when `rarity` is omitted (default: true). */
  includeMythic?: boolean
  /** Enhancement level (+0..+15). Defaults to 0. */
  plus?: number
  /** Deterministic PRNG injection for testing. */
  rng?: () => number
}

export const RANDOM_ITEM_RARITY_WEIGHTS: Record<ItemRarity, number> = {
  common: 45,
  uncommon: 26,
  rare: 16,
  epic: 8,
  legendary: 4,
  mythic: 1,
}

export function resolveItemImagePath(
  def: Pick<ItemDef, 'id' | 'kind' | 'slot' | 'asset' | 'itemCategory'>,
): string {
  if (def.asset && def.asset.startsWith('/assets/items/')) {
    return def.asset
  }
  const category = inferItemCategory(def)
  if (category === 'weapon' || def.kind === 'weapon') {
    return `/assets/items/weapons/${def.id}.png`
  }
  if (category === 'shield') {
    return `/assets/items/shields/${def.id}.png`
  }
  if (
    category === 'accessory' ||
    category === 'ring' ||
    category === 'necklace' ||
    category === 'charm' ||
    def.slot === 'accessory'
  ) {
    return `/assets/items/accessories/${def.id}.png`
  }
  if (
    category === 'helmet' ||
    category === 'armor' ||
    category === 'gloves' ||
    category === 'boots' ||
    def.kind === 'armor'
  ) {
    return `/assets/items/armor/${def.id}.png`
  }
  return `/assets/items/special/${def.id}.png`
}

export function computeScaledBaseStats(
  def: Pick<ItemDef, 'id' | 'name' | 'kind' | 'slot' | 'itemCategory' | 'atk' | 'def' | 'heal' | 'mana' | 'tier' | 'reqLevel'>,
  rarity: ItemRarity,
  plus = 0,
): ItemBaseStats {
  const meta = EQUIPMENT_RARITY_META[rarity] ?? EQUIPMENT_RARITY_META.common
  const mul = meta.statMultiplier * (1 + Math.max(0, plus) * 0.08)
  const category = inferItemCategory(def)
  const tier = Math.max(1, def.tier ?? 1)

  const rawAtk = def.atk ?? 0
  const rawDef = def.def ?? 0

  let atk = rawAtk > 0 ? Math.max(1, Math.round(rawAtk * mul)) : 0
  let defense = rawDef > 0 ? Math.max(1, Math.round(rawDef * mul)) : 0
  let hp = 0
  let critPct = 0
  let speedBonus = 0

  if (def.kind === 'weapon') {
    if (atk === 0) atk = Math.round((8 + tier * 6) * mul)
    critPct = Math.round((meta.affixCount * 1.5 + Math.max(0, tier - 1)) * 10) / 10
  } else if (def.kind === 'armor') {
    if (defense === 0) defense = Math.round((5 + tier * 4) * mul)
    if (category === 'helmet' || category === 'armor' || category === 'shield') {
      hp = Math.round((20 + defense * 1.8) * meta.statMultiplier)
    }
    if (category === 'gloves') {
      atk = Math.max(2, Math.round(defense * 0.45))
      critPct = Math.round((1 + meta.affixCount * 1.2) * 10) / 10
    }
    if (category === 'boots') {
      speedBonus = Math.round((4 + tier * 3) * meta.statMultiplier)
    }
    if (category === 'ring' || category === 'necklace' || category === 'accessory') {
      atk = Math.max(2, Math.round(defense * 0.35))
      hp = Math.round((15 + defense * 1.1) * meta.statMultiplier)
      critPct = Math.round((1.5 + meta.affixCount * 1.4) * 10) / 10
    }
    if (category === 'charm') {
      hp = Math.round((25 + defense * 1.4) * meta.statMultiplier)
      critPct = Math.round((1 + meta.affixCount * 1.1) * 10) / 10
    }
  }

  return {
    atk,
    def: defense,
    hp,
    critPct,
    speedBonus,
    heal: def.heal ?? 0,
    mana: def.mana ?? 0,
  }
}

export function buildItemSchema(def: ItemDef): ItemSchema {
  const rarity = resolveEffectiveRarity(undefined, def)
  const category = inferItemCategory(def)
  const element = inferItemElement(def)
  const stats = computeScaledBaseStats(def, rarity, 0)
  const baseSell =
    def.sellPrice !== undefined
      ? def.sellPrice
      : Math.floor(def.price * 0.4 * EQUIPMENT_RARITY_META[rarity].sellMultiplier)

  return {
    id: def.id,
    name: def.name,
    kind: def.kind,
    category,
    slot: def.slot,
    weaponType: def.weaponType,
    rarity,
    element,
    reqLevel: def.reqLevel ?? 1,
    tier: def.tier ?? 1,
    stats,
    price: def.price,
    sellPrice: Math.max(0, baseSell),
    imagePath: resolveItemImagePath(def),
    description: def.description,
    gmOnly: Boolean(def.gmOnly),
  }
}

export const ITEM_SCHEMA_MAP: Record<string, ItemSchema> = Object.fromEntries(
  Object.values(ITEMS).map((def) => [def.id, buildItemSchema(def)]),
)

export const ITEM_SCHEMA_LIST: ItemSchema[] = Object.values(ITEM_SCHEMA_MAP)

export function getItemSchemaById(itemId: string): ItemSchema | null {
  return ITEM_SCHEMA_MAP[itemId] ?? null
}

export function getItemSchemasByCategory(category: ItemCategory): ItemSchema[] {
  return ITEM_SCHEMA_LIST.filter((item) => item.category === category && !item.gmOnly)
}

export function getItemSchemasByRarity(rarity: ItemRarity): ItemSchema[] {
  return ITEM_SCHEMA_LIST.filter((item) => item.rarity === rarity && !item.gmOnly)
}

function rollWeightedRarity(
  rng: () => number,
  tier = 1,
  includeMythic = true,
): ItemRarity {
  const safeTier = Math.max(1, Math.min(6, tier))
  const tierShift = (safeTier - 1) * 0.6
  const candidates: Array<{ rarity: ItemRarity; weight: number }> = [
    { rarity: 'common', weight: Math.max(12, RANDOM_ITEM_RARITY_WEIGHTS.common - tierShift * 5) },
    { rarity: 'uncommon', weight: RANDOM_ITEM_RARITY_WEIGHTS.uncommon },
    { rarity: 'rare', weight: RANDOM_ITEM_RARITY_WEIGHTS.rare + tierShift * 2 },
    { rarity: 'epic', weight: RANDOM_ITEM_RARITY_WEIGHTS.epic + tierShift * 2.2 },
    { rarity: 'legendary', weight: RANDOM_ITEM_RARITY_WEIGHTS.legendary + tierShift * 1.4 },
  ]
  if (includeMythic) {
    candidates.push({ rarity: 'mythic', weight: RANDOM_ITEM_RARITY_WEIGHTS.mythic + (safeTier >= 5 ? 2 : 0.4) })
  }

  const totalWeight = candidates.reduce((acc, c) => acc + c.weight, 0)
  let roll = Math.max(0, Math.min(0.999999, rng())) * totalWeight
  for (const candidate of candidates) {
    roll -= candidate.weight
    if (roll <= 0) return candidate.rarity
  }
  return candidates[candidates.length - 1].rarity
}

function makeGeneratedUid(rng: () => number): string {
  const suffix = Math.floor(rng() * 1_000_000)
    .toString(36)
    .padStart(4, '0')
  return `rnd_${Date.now().toString(36)}_${suffix}`
}

/**
 * Generates a randomized item using the 6-tier rarity system (Common -> Mythic),
 * scaling base stats and rolling bonus affixes to match the chosen rarity.
 */
export function generateRandomItem(options: GenerateRandomItemOptions = {}): GeneratedItemInstance {
  const rng = options.rng ?? Math.random
  const rarity: ItemRarity =
    options.rarity && EQUIPMENT_RARITY_META[options.rarity]
      ? options.rarity
      : rollWeightedRarity(rng, options.tier ?? 1, options.includeMythic ?? true)

  const equipablePool = ITEM_SCHEMA_LIST.filter(
    (schema) => !schema.gmOnly && (schema.kind === 'weapon' || schema.kind === 'armor'),
  )

  let candidates = equipablePool
  if (options.category) {
    const byCategory = ITEM_SCHEMA_LIST.filter(
      (schema) => !schema.gmOnly && schema.category === options.category,
    )
    if (byCategory.length > 0) candidates = byCategory
  }
  if (typeof options.minLevel === 'number') {
    const filtered = candidates.filter((schema) => schema.reqLevel >= options.minLevel!)
    if (filtered.length > 0) candidates = filtered
  }
  if (typeof options.maxLevel === 'number') {
    const filtered = candidates.filter((schema) => schema.reqLevel <= options.maxLevel!)
    if (filtered.length > 0) candidates = filtered
  }

  // Prefer templates near the target rarity tier when no strict category/level narrows it down
  const rarityPreferred = candidates.filter((schema) => schema.rarity === rarity)
  const finalPool =
    rarityPreferred.length > 0 && !options.category && options.minLevel === undefined
      ? rarityPreferred
      : candidates

  const pickedSchema =
    finalPool[Math.min(finalPool.length - 1, Math.floor(Math.max(0, Math.min(0.999999, rng())) * finalPool.length))]
  const rawDef = ITEMS[pickedSchema.id]
  const plus = Math.max(0, Math.min(15, options.plus ?? 0))

  const stats = computeScaledBaseStats(rawDef, rarity, plus)
  const isEquipable = rawDef.kind === 'weapon' || rawDef.kind === 'armor'
  const affixes = isEquipable ? rollEquipmentAffixes(pickedSchema.tier, rarity, rng) : []
  const rarityMeta = EQUIPMENT_RARITY_META[rarity]
  const sellPrice =
    rawDef.sellPrice !== undefined
      ? rawDef.sellPrice
      : Math.max(1, Math.floor(rawDef.price * 0.4 * (1 + plus * 0.3) * rarityMeta.sellMultiplier))

  const vfx = resolveItemVfxSpec(rarity, {
    id: rawDef.id,
    name: rawDef.name,
    element: pickedSchema.element,
    color: rawDef.color,
  })

  return {
    uid: makeGeneratedUid(rng),
    itemId: pickedSchema.id,
    name: pickedSchema.name,
    category: pickedSchema.category,
    slot: pickedSchema.slot,
    weaponType: pickedSchema.weaponType,
    rarity,
    rarityLabel: rarityMeta.label,
    rarityThaiLabel: rarityMeta.thaiLabel,
    element: pickedSchema.element,
    reqLevel: pickedSchema.reqLevel,
    tier: pickedSchema.tier,
    plus,
    qty: 1,
    stats,
    affixes,
    sellPrice,
    imagePath: pickedSchema.imagePath,
    description: pickedSchema.description,
    vfx,
  }
}
