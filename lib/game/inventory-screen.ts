import {
  ITEMS,
  JOBS,
  MONSTERS,
  normalizeJobId,
  type EquipmentSlot,
  type ItemDef,
  type ItemKind,
} from './data'
import {
  getInventoryCapacity,
  getStats,
  getStorageCapacity,
  type InvItem,
  type SaveData,
} from './engine'
import {
  computeEquipmentPower,
  getEquipRestriction,
  resolveItemEquipmentSlot,
} from './equipment-ui'
import {
  getFoodBuffForItem,
  pruneDepletedQuickSlotsInExtV2,
  sanitizeExtV2,
  type ActiveBoostBuff,
} from './extended-systems'
import { MAPS, TILE } from './maps'
import type { VipTierId } from './premium/types'
import { getEffectiveVipBonuses, resolveVipLevelFromExp } from './premium/vip'
import {
  EXTRA_INVENTORY_SCROLL_CAP,
  EXTRA_STORAGE_SCROLL_CAP,
  appendAuditLog,
  sanitizePremiumState,
} from './premium/wallet'
import { COMBAT_PETS, MAX_PET_LEVEL, grantActivePetExp, sanitizePetState } from './systems'

import {
  EQUIPMENT_RARITY_META,
  resolveEffectiveRarity,
  type EquipmentRarity,
} from './mmo-systems'
import { ITEM_CATEGORY_THAI_LABEL, inferItemCategory } from './item-vfx'

export type InventoryFilterTab =
  | 'all'
  | 'equipable'
  | 'monster_drops'
  | 'weapon'
  | 'armor'
  | 'consumable_material'

export type InventorySortMode = 'power' | 'rarity' | 'monster_drops' | 'name'

export type ItemRarity = EquipmentRarity

export interface ItemRarityMeta {
  id: ItemRarity
  label: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'
  thaiLabel: string
  rank: number
}

export const ITEM_RARITY_META: Record<ItemRarity, ItemRarityMeta> = {
  common: { id: 'common', label: 'Common', thaiLabel: EQUIPMENT_RARITY_META.common.thaiLabel, rank: 1 },
  uncommon: { id: 'uncommon', label: 'Uncommon', thaiLabel: EQUIPMENT_RARITY_META.uncommon.thaiLabel, rank: 2 },
  rare: { id: 'rare', label: 'Rare', thaiLabel: EQUIPMENT_RARITY_META.rare.thaiLabel, rank: 3 },
  epic: { id: 'epic', label: 'Epic', thaiLabel: EQUIPMENT_RARITY_META.epic.thaiLabel, rank: 4 },
  legendary: { id: 'legendary', label: 'Legendary', thaiLabel: EQUIPMENT_RARITY_META.legendary.thaiLabel, rank: 5 },
  mythic: { id: 'mythic', label: 'Mythic', thaiLabel: EQUIPMENT_RARITY_META.mythic.thaiLabel, rank: 6 },
}

export function resolveItemRarity(def: ItemDef): ItemRarity {
  if (def.defaultRarity && ITEM_RARITY_META[def.defaultRarity]) {
    return def.defaultRarity
  }
  if (
    def.gmOnly ||
    (def.tier ?? 0) >= 6 ||
    def.id === 'mythic_awakening_core'
  ) {
    return 'mythic'
  }
  if (
    (def.tier ?? 0) >= 4 ||
    def.id === 'earth_core' ||
    def.id === 'abyss_crystal' ||
    def.id === 'astral_bag_expansion' ||
    def.id === 'starlight_loot_magnet'
  ) {
    return 'legendary'
  }
  if (
    (def.tier ?? 0) === 3 ||
    def.id === 'name_change_ticket' ||
    def.id === 'demon_horn' ||
    def.id === 'white_potion' ||
    (def.kind === 'material' && def.id !== 'enhance_stone' && def.price >= 300)
  ) {
    return 'epic'
  }
  if (
    (def.tier ?? 0) === 2 ||
    def.id === 'enhance_stone' ||
    def.id === 'purple_potion' ||
    (def.kind === 'material' && def.price >= 90) ||
    (def.kind === 'consumable' && def.price >= 200)
  ) {
    return 'rare'
  }
  if (
    def.id === 'orange_potion' ||
    def.id === 'return_scroll' ||
    (def.kind === 'material' && def.price >= 30) ||
    (def.kind === 'consumable' && def.price >= 60)
  ) {
    return 'uncommon'
  }
  return 'common'
}

export function getItemRarityMeta(rarity: ItemRarity): ItemRarityMeta {
  return ITEM_RARITY_META[rarity]
}

export interface MonsterDropSource {
  monsterId: string
  monsterName: string
  monsterLevel: number
  isBoss: boolean
  chance: number
}

export interface InventoryItemEntry {
  item: InvItem
  def: ItemDef
  rarity: ItemRarity
  targetSlot: EquipmentSlot | null
  power: number
  statLabel: 'ATK' | 'DEF' | null
  canEquip: boolean
  equipError: string | null
  isUpgradeForSlot: boolean
  monsterSources: MonsterDropSource[]
  isMonsterDrop: boolean
}

export interface StatDeltaBreakdown {
  targetSlot: EquipmentSlot
  currentlyEquipped: InvItem | null
  before: ReturnType<typeof getStats>
  after: ReturnType<typeof getStats>
  delta: {
    maxHp: number
    maxMp: number
    atk: number
    def: number
    crit: number
  }
}

export interface InventorySummary {
  usedSlots: number
  maxSlots: number
  equipableCount: number
  monsterDropStackCount: number
  consumableCount: number
  materialCount: number
}

const dropSourceIndexCache = new Map<string, MonsterDropSource[]>()

function buildDropSourceIndex(): Map<string, MonsterDropSource[]> {
  if (dropSourceIndexCache.size > 0) return dropSourceIndexCache

  for (const monster of Object.values(MONSTERS)) {
    for (const drop of monster.drops) {
      const existing = dropSourceIndexCache.get(drop.itemId) ?? []
      existing.push({
        monsterId: monster.id,
        monsterName: monster.name,
        monsterLevel: monster.level,
        isBoss: Boolean(monster.boss),
        chance: drop.chance,
      })
      dropSourceIndexCache.set(drop.itemId, existing)
    }
  }

  for (const [itemId, sources] of dropSourceIndexCache.entries()) {
    sources.sort((a, b) => {
      if (a.isBoss !== b.isBoss) return a.isBoss ? -1 : 1
      if (b.chance !== a.chance) return b.chance - a.chance
      return a.monsterLevel - b.monsterLevel
    })
    dropSourceIndexCache.set(itemId, sources)
  }

  return dropSourceIndexCache
}

export function getItemMonsterSources(itemId: string): MonsterDropSource[] {
  const index = buildDropSourceIndex()
  return [...(index.get(itemId) ?? [])]
}

export function getSlotThaiLabel(slot: EquipmentSlot): string {
  switch (slot) {
    case 'weapon':
      return 'อาวุธ'
    case 'armor':
      return 'ชุดเกราะ'
    case 'shoes':
      return 'รองเท้า'
    case 'cloak':
      return 'ผ้าคลุม'
    case 'accessory':
      return 'เครื่องประดับ'
  }
}

export function getItemCategoryThaiLabel(def?: ItemDef | null): string {
  if (!def) return 'ไอเทม'
  return ITEM_CATEGORY_THAI_LABEL[inferItemCategory(def)] ?? 'ไอเทม'
}

export function getItemKindThaiLabel(
  kind: ItemKind,
  slot?: EquipmentSlot | null,
  def?: ItemDef | null,
): string {
  if (def?.itemCategory) return ITEM_CATEGORY_THAI_LABEL[def.itemCategory]
  if (kind === 'weapon') return 'อาวุธ'
  if (kind === 'armor') return def ? getItemCategoryThaiLabel(def) : slot ? getSlotThaiLabel(slot) : 'ชุดเกราะ'
  if (kind === 'consumable') return 'ของใช้'
  if (def && inferItemCategory(def) === 'special') return 'ไอเทมพิเศษ'
  return 'วัตถุดิบจากมอนสเตอร์'
}

export function getInventoryItemSellPrice(item: InvItem, def?: ItemDef | null): number {
  const resolved = def ?? ITEMS[item.itemId]
  if (!resolved) return 0
  if (typeof resolved.sellPrice === 'number') {
    return resolved.sellPrice === 0 ? 0 : Math.floor(resolved.sellPrice * (1 + item.plus * 0.25))
  }
  const rarity = resolveEffectiveRarity(item, resolved)
  const rarityMul = EQUIPMENT_RARITY_META[rarity]?.sellMultiplier ?? 1
  return Math.max(1, Math.floor(resolved.price * 0.4 * (1 + item.plus * 0.3) * rarityMul))
}

export function sellInventoryItem(
  save: SaveData,
  itemUid: string,
  qty = 1,
): { nextSave: SaveData; gainedGold: number; message: string; error: string | null } {
  const idx = save.inventory.findIndex((entry) => entry.uid === itemUid)
  if (idx < 0) return { nextSave: save, gainedGold: 0, message: '', error: 'ไม่พบไอเทมนี้ในกระเป๋า' }
  const target = save.inventory[idx]
  const def = ITEMS[target.itemId]
  const sellQty = Math.max(1, Math.min(target.qty, qty))
  const unitPrice = getInventoryItemSellPrice(target, def)
  const gainedGold = unitPrice * sellQty
  const nextSave: SaveData = structuredClone(save)
  const entry = nextSave.inventory[idx]
  entry.qty -= sellQty
  if (entry.qty <= 0) nextSave.inventory.splice(idx, 1)
  nextSave.gold = (nextSave.gold ?? 0) + gainedGold
  nextSave.extV2 = pruneDepletedQuickSlotsInExtV2(sanitizeExtV2(nextSave.extV2), nextSave.inventory).nextExtV2
  nextSave.savedAt = Date.now()
  return {
    nextSave,
    gainedGold,
    message: `ขาย ${def?.name ?? target.itemId} x${sellQty} ได้รับ +${gainedGold.toLocaleString()} G`,
    error: null,
  }
}

export function discardInventoryItem(
  save: SaveData,
  itemUid: string,
  qty = 1,
): { nextSave: SaveData; message: string; error: string | null } {
  const idx = save.inventory.findIndex((entry) => entry.uid === itemUid)
  if (idx < 0) return { nextSave: save, message: '', error: 'ไม่พบไอเทมนี้ในกระเป๋า' }
  const target = save.inventory[idx]
  const def = ITEMS[target.itemId]
  const dropQty = Math.max(1, Math.min(target.qty, qty))
  const nextSave: SaveData = structuredClone(save)
  const entry = nextSave.inventory[idx]
  entry.qty -= dropQty
  if (entry.qty <= 0) nextSave.inventory.splice(idx, 1)
  nextSave.extV2 = pruneDepletedQuickSlotsInExtV2(sanitizeExtV2(nextSave.extV2), nextSave.inventory).nextExtV2
  nextSave.savedAt = Date.now()
  return {
    nextSave,
    message: `ทิ้ง ${def?.name ?? target.itemId} x${dropQty} ออกจากกระเป๋าแล้ว`,
    error: null,
  }
}

export function equipInventoryItem(
  save: SaveData,
  itemUid: string,
): { nextSave: SaveData; equippedItem: InvItem | null; error: string | null } {
  const target = save.inventory.find((entry) => entry.uid === itemUid)
  if (!target) {
    return { nextSave: save, equippedItem: null, error: 'ไม่พบไอเทมนี้ในกระเป๋า' }
  }

  const def = ITEMS[target.itemId]
  if (!def) {
    return { nextSave: save, equippedItem: null, error: 'ไม่พบข้อมูลไอเทม' }
  }

  const targetSlot = resolveItemEquipmentSlot(def)
  if (!targetSlot) {
    return { nextSave: save, equippedItem: null, error: 'ไอเทมนี้ไม่สามารถสวมใส่ได้' }
  }

  const restriction = getEquipRestriction(save, target)
  if (restriction) {
    return { nextSave: save, equippedItem: null, error: restriction }
  }

  const nextSave: SaveData = structuredClone(save)
  const idx = nextSave.inventory.findIndex((entry) => entry.uid === itemUid)
  if (idx < 0) {
    return { nextSave: save, equippedItem: null, error: 'ไม่พบไอเทมนี้ในกระเป๋า' }
  }

  const [picked] = nextSave.inventory.splice(idx, 1)
  const previous = nextSave.equipment[targetSlot]
  if (previous) {
    nextSave.inventory.push(previous)
  }
  nextSave.equipment[targetSlot] = picked

  const updatedStats = getStats(nextSave)
  nextSave.hp = Math.min(nextSave.hp, updatedStats.maxHp)
  nextSave.mp = Math.min(nextSave.mp, updatedStats.maxMp)

  return { nextSave, equippedItem: picked, error: null }
}

export function unequipInventorySlot(
  save: SaveData,
  slot: EquipmentSlot,
): { nextSave: SaveData; unequippedItem: InvItem | null; error: string | null } {
  const current = save.equipment[slot]
  if (!current) {
    return { nextSave: save, unequippedItem: null, error: 'ช่องสวมใส่นี้ว่างอยู่' }
  }

  const capacity = getInventoryCapacity(save)
  if (save.inventory.length >= capacity) {
    return { nextSave: save, unequippedItem: null, error: 'กระเป๋าเต็ม กรุณาเคลียร์ช่องก่อนถอดอุปกรณ์' }
  }

  const nextSave: SaveData = structuredClone(save)
  const removed = nextSave.equipment[slot]
  if (!removed) {
    return { nextSave: save, unequippedItem: null, error: 'ช่องสวมใส่นี้ว่างอยู่' }
  }

  nextSave.equipment[slot] = null
  nextSave.inventory.push(removed)

  const updatedStats = getStats(nextSave)
  nextSave.hp = Math.min(nextSave.hp, updatedStats.maxHp)
  nextSave.mp = Math.min(nextSave.mp, updatedStats.maxMp)

  return { nextSave, unequippedItem: removed, error: null }
}

export function previewEquipStatDelta(
  save: SaveData,
  item: InvItem,
): StatDeltaBreakdown | null {
  const def = ITEMS[item.itemId]
  if (!def) return null
  const targetSlot = resolveItemEquipmentSlot(def)
  if (!targetSlot) return null

  const before = getStats(save)
  const simulated: SaveData = structuredClone(save)
  simulated.equipment[targetSlot] = item
  const after = getStats(simulated)

  return {
    targetSlot,
    currentlyEquipped: save.equipment[targetSlot] ?? null,
    before,
    after,
    delta: {
      maxHp: after.maxHp - before.maxHp,
      maxMp: after.maxMp - before.maxMp,
      atk: after.atk - before.atk,
      def: after.def - before.def,
      crit: Number((after.crit - before.crit).toFixed(4)),
    },
  }
}

export function previewUnequipStatDelta(
  save: SaveData,
  slot: EquipmentSlot,
): StatDeltaBreakdown | null {
  const current = save.equipment[slot]
  if (!current) return null

  const before = getStats(save)
  const simulated: SaveData = structuredClone(save)
  simulated.equipment[slot] = null
  const after = getStats(simulated)

  return {
    targetSlot: slot,
    currentlyEquipped: current,
    before,
    after,
    delta: {
      maxHp: after.maxHp - before.maxHp,
      maxMp: after.maxMp - before.maxMp,
      atk: after.atk - before.atk,
      def: after.def - before.def,
      crit: Number((after.crit - before.crit).toFixed(4)),
    },
  }
}

export function useConsumableInInventory(
  save: SaveData,
  itemUid: string,
): { nextSave: SaveData; message: string; error: string | null; requiresNameInput?: boolean } {
  const targetIdx = save.inventory.findIndex((entry) => entry.uid === itemUid)
  if (targetIdx < 0) {
    return { nextSave: save, message: '', error: 'ไม่พบไอเทมนี้ในกระเป๋า' }
  }

  const target = save.inventory[targetIdx]
  const def = ITEMS[target.itemId]
  if (!def || def.kind !== 'consumable') {
    return { nextSave: save, message: '', error: 'ไอเทมนี้ไม่สามารถกดใช้งานได้' }
  }

  if (def.id === 'name_change_ticket') {
    return {
      nextSave: save,
      message: 'กรุณากรอกชื่อตัวละครใหม่ที่ต้องการเปลี่ยน',
      error: null,
      requiresNameInput: true,
    }
  }

  const nextSave: SaveData = structuredClone(save)
  const entry = nextSave.inventory[targetIdx]
  const consumeOne = () => {
    entry.qty -= 1
    if (entry.qty <= 0) nextSave.inventory.splice(targetIdx, 1)
    nextSave.inventory = nextSave.inventory.filter((i) => i.qty > 0)
    const cleanExt = sanitizeExtV2(nextSave.extV2)
    nextSave.extV2 = pruneDepletedQuickSlotsInExtV2(cleanExt, nextSave.inventory).nextExtV2
  }
  const buildPremCtx = () => ({
    characterId: String(nextSave.gameUid ?? nextSave.uid ?? 'char_local'),
    diamonds: nextSave.diamonds ?? 0,
    ownedGemItems: nextSave.ownedGemItems,
    equippedGemFashion: nextSave.equippedGemFashion,
    unlockedCosmetics: sanitizeExtV2(nextSave.extV2).unlockedCosmetics,
    equippedWing: sanitizeExtV2(nextSave.extV2).equippedWing,
    equippedWeaponSkin: sanitizeExtV2(nextSave.extV2).equippedWeaponSkin,
  })

  if (def.id === 'return_scroll' || def.id === 'town_warp_tome') {
    const town = MAPS.town
    nextSave.mapId = 'town'
    nextSave.x = town.spawn.x * TILE
    nextSave.y = town.spawn.y * TILE
    nextSave.savedAt = Date.now()
    consumeOne()
    return {
      nextSave,
      message: `ใช้ ${def.name} วาร์ปกลับเมืองเริ่มต้นเรียบร้อยแล้ว`,
      error: null,
    }
  }

  if (def.id === 'astral_bag_expansion') {
    if ((nextSave.inventoryCapacityBonus ?? 0) >= 60) {
      return { nextSave: save, message: '', error: 'ขยายกระเป๋าถึงขีดจำกัดสูงสุด (+60 ช่อง) แล้ว' }
    }
    nextSave.inventoryCapacityBonus = Math.min(60, (nextSave.inventoryCapacityBonus ?? 0) + 20)
    nextSave.savedAt = Date.now()
    consumeOne()
    return {
      nextSave,
      message: `ขยายกระเป๋าสำเร็จ! ความจุปัจจุบัน ${getInventoryCapacity(nextSave)} ช่อง`,
      error: null,
    }
  }

  if (def.id === 'bag_scroll_10') {
    const prem = sanitizePremiumState(nextSave.premium, buildPremCtx())
    if (prem.storage.extraInventorySlots >= EXTRA_INVENTORY_SCROLL_CAP) {
      return {
        nextSave: save,
        message: '',
        error: `ขยายช่องกระเป๋าพรีเมียมครบขีดจำกัด +${EXTRA_INVENTORY_SCROLL_CAP} ช่องแล้ว`,
      }
    }
    prem.storage.extraInventorySlots = Math.min(EXTRA_INVENTORY_SCROLL_CAP, prem.storage.extraInventorySlots + 10)
    nextSave.premium = prem
    appendAuditLog(prem, {
      action: 'STORAGE_EXPAND',
      characterId: prem.wallet.characterId || String(nextSave.gameUid ?? nextSave.uid ?? 'char_local'),
      actorUid: String(nextSave.gameUid ?? nextSave.uid ?? 'guest'),
      actorRole: nextSave.gm ? 'gm' : 'player',
      details: `ใช้คัมภีร์ขยายกระเป๋า +10 ช่อง (รวม ${getInventoryCapacity(nextSave)} ช่อง)`,
      verifiedByServer: false,
    })
    nextSave.savedAt = Date.now()
    consumeOne()
    return {
      nextSave,
      message: `ขยายกระเป๋าสำเร็จ! ความจุรวม ${getInventoryCapacity(nextSave)} ช่อง`,
      error: null,
    }
  }

  if (def.id === 'storage_scroll_15' || def.id === 'storage_scroll_30') {
    const prem = sanitizePremiumState(nextSave.premium, buildPremCtx())
    const addSlots = def.id === 'storage_scroll_30' ? 30 : 15
    if (prem.storage.extraStorageSlots >= EXTRA_STORAGE_SCROLL_CAP) {
      return {
        nextSave: save,
        message: '',
        error: `ขยายคลังเก็บของครบขีดจำกัด +${EXTRA_STORAGE_SCROLL_CAP} ช่องแล้ว`,
      }
    }
    prem.storage.extraStorageSlots = Math.min(EXTRA_STORAGE_SCROLL_CAP, prem.storage.extraStorageSlots + addSlots)
    nextSave.premium = prem
    appendAuditLog(prem, {
      action: 'STORAGE_EXPAND',
      characterId: prem.wallet.characterId || String(nextSave.gameUid ?? nextSave.uid ?? 'char_local'),
      actorUid: String(nextSave.gameUid ?? nextSave.uid ?? 'guest'),
      actorRole: nextSave.gm ? 'gm' : 'player',
      details: `ใช้ ${def.name} (ความจุคลังรวม ${getStorageCapacity(nextSave)} ช่อง)`,
      verifiedByServer: false,
    })
    nextSave.savedAt = Date.now()
    consumeOne()
    return {
      nextSave,
      message: `ขยายคลังเก็บของเป็น ${getStorageCapacity(nextSave)} ช่องถาวร`,
      error: null,
    }
  }

  if (def.id === 'vip_card_7d' || def.id === 'vip_card_30d' || def.id === 'vip_exp_crystal') {
    const prem = sanitizePremiumState(nextSave.premium, buildPremCtx())
    const now = Date.now()
    const days = def.id === 'vip_card_30d' ? 30 : 7
    const expGain = def.id === 'vip_exp_crystal' ? 600 : def.id === 'vip_card_30d' ? 450 : 150
    const tierFloor: VipTierId = def.id === 'vip_card_30d' ? 2 : 1
    const baseTime = prem.vip.expiresAtMs && prem.vip.expiresAtMs > now ? prem.vip.expiresAtMs : now
    prem.vip.expiresAtMs = baseTime + days * 24 * 60 * 60 * 1000
    prem.vip.vipExp += expGain
    prem.vip.vipLevel = Math.max(tierFloor, prem.vip.vipLevel, resolveVipLevelFromExp(prem.vip.vipExp)) as VipTierId
    const bonus = getEffectiveVipBonuses(prem.vip, now)
    for (const fId of bonus.exclusiveFashionIds) {
      if (!prem.fashion.unlockedIds.includes(fId)) prem.fashion.unlockedIds.push(fId)
    }
    appendAuditLog(prem, {
      action: 'VIP_ACTIVATE',
      characterId: prem.wallet.characterId || String(nextSave.gameUid ?? nextSave.uid ?? 'char_local'),
      actorUid: String(nextSave.gameUid ?? nextSave.uid ?? 'guest'),
      actorRole: nextSave.gm ? 'gm' : 'player',
      details: `ใช้ ${def.name} -> VIP ${prem.vip.vipLevel} (${prem.vip.vipExp} EXP)`,
      verifiedByServer: false,
    })
    nextSave.premium = prem
    nextSave.savedAt = Date.now()
    consumeOne()
    return {
      nextSave,
      message: `★ เปิดใช้งาน VIP ระดับ ${prem.vip.vipLevel} (+${expGain} VIP EXP) สำเร็จ!`,
      error: null,
    }
  }

  if (def.id === 'pet_exp_elixir') {
    const petState = sanitizePetState(nextSave.petState, nextSave.ownedGemItems, nextSave.equippedGemCompanion)
    const activePetId = petState.activePetId
    if (!activePetId) {
      return {
        nextSave: save,
        message: '',
        error: 'กรุณาสวมใส่สัตว์เลี้ยงก่อนใช้น้ำทิพย์ฝึกสัตว์เลี้ยง',
      }
    }
    const curProg = petState.ownedPets[activePetId]
    if (curProg && curProg.level >= MAX_PET_LEVEL) {
      return {
        nextSave: save,
        message: '',
        error: `คู่หูเลเวลสูงสุด (Lv.${MAX_PET_LEVEL}) แล้ว`,
      }
    }
    const res = grantActivePetExp(petState, 250)
    nextSave.petState = res.nextPetState
    nextSave.savedAt = Date.now()
    consumeOne()
    return {
      nextSave,
      message: `คู่หูได้รับ +250 EXP${res.leveledUp ? ` และอัปเป็น Lv.${res.newLevel}!` : ''}`,
      error: null,
    }
  }

  if (def.id === 'double_exp_scroll') {
    const extV2 = sanitizeExtV2(nextSave.extV2)
    extV2.activeFoodBuff = {
      itemId: def.id,
      name: 'คัมภีร์คูณ EXP +35%',
      expiresAtMs: Date.now() + 10 * 60 * 1000,
      atkPct: 15,
      defPct: 15,
      critBonus: 0.05,
      expMul: 1.35,
    }
    nextSave.extV2 = extV2
    nextSave.savedAt = Date.now()
    consumeOne()
    return {
      nextSave,
      message: 'เปิดใช้งานคัมภีร์คูณค่าประสบการณ์ +35% · ATK/DEF +15% นาน 10 นาทีแล้ว',
      error: null,
    }
  }

  if (def.id === 'starlight_loot_magnet') {
    nextSave.lootMagnetUntil = Math.max(Date.now(), nextSave.lootMagnetUntil ?? 0) + 5 * 60 * 1000
    nextSave.savedAt = Date.now()
    consumeOne()
    return {
      nextSave,
      message: 'เปิดใช้งานแม่เหล็กดูดของแสงดาว 5 นาทีแล้ว',
      error: null,
    }
  }

  const ASURA_BOOST_MAP: Record<string, Omit<ActiveBoostBuff, 'expiresAtMs'> & { durationMs: number }> = {
    asura_exp_50: { id: 'asura_exp_boost', kind: 'exp', label: 'EXP Boost Up 50%', shortTag: 'EXP+', value: 50, durationMs: 20 * 60 * 1000, color: '#f59e0b' },
    asura_exp_100: { id: 'asura_exp_boost', kind: 'exp', label: 'EXP Boost Up 100%', shortTag: 'EXPx2', value: 100, durationMs: 20 * 60 * 1000, color: '#facc15' },
    asura_jp_50: { id: 'asura_jp_boost', kind: 'jp', label: 'การงาน Boost Up 50%', shortTag: 'JP+', value: 50, durationMs: 20 * 60 * 1000, color: '#fb923c' },
    asura_jp_100: { id: 'asura_jp_boost', kind: 'jp', label: 'การงาน Boost Up 100%', shortTag: 'JPx2', value: 100, durationMs: 20 * 60 * 1000, color: '#f97316' },
    asura_lifeskill_50: { id: 'asura_life_boost', kind: 'lifeskill', label: 'ทักษะฝึกฝน Boost 50%', shortTag: 'LIFE', value: 50, durationMs: 20 * 60 * 1000, color: '#4ade80' },
    asura_leg_muscle: { id: 'asura_speed_boost', kind: 'speed', label: 'กล้ามเนื้อขา +25% SPD', shortTag: 'SPD+', value: 25, durationMs: 20 * 60 * 1000, color: '#38bdf8' },
    asura_weight_potion: { id: 'asura_weight_boost', kind: 'weight', label: 'พลังแบกของ +650', shortTag: 'WGT+', value: 650, durationMs: 30 * 60 * 1000, color: '#a78bfa' },
    asura_stat_potion_s: { id: 'asura_stat_boost', kind: 'stat', label: 'พลังกายเล็ก +5%', shortTag: 'ST+5', value: 5, durationMs: 20 * 60 * 1000, color: '#34d399' },
    asura_stat_potion_m: { id: 'asura_stat_boost', kind: 'stat', label: 'พลังกายกลาง +10%', shortTag: 'ST+10', value: 10, durationMs: 20 * 60 * 1000, color: '#22d3ee' },
  }
  const boostCfg = ASURA_BOOST_MAP[def.id]
  if (boostCfg) {
    const extV2 = sanitizeExtV2(nextSave.extV2)
    const now = Date.now()
    const existing = extV2.activeBoosts.find((b) => b.id === boostCfg.id && b.expiresAtMs > now)
    const baseMs = existing && existing.value === boostCfg.value ? existing.expiresAtMs : now
    const nextBoost: ActiveBoostBuff = {
      id: boostCfg.id,
      kind: boostCfg.kind,
      label: boostCfg.label,
      shortTag: boostCfg.shortTag,
      value: boostCfg.value,
      expiresAtMs: baseMs + boostCfg.durationMs,
      color: boostCfg.color,
    }
    extV2.activeBoosts = [...extV2.activeBoosts.filter((b) => b.id !== boostCfg.id && b.expiresAtMs > now), nextBoost]
    nextSave.extV2 = extV2
    nextSave.savedAt = Date.now()
    consumeOne()
    return {
      nextSave,
      message: `เปิดใช้ ${def.name} สำเร็จ!`,
      error: null,
    }
  }

  if (def.id === 'title_clear_scroll') {
    nextSave.alias = ''
    if (nextSave.rpgExt) nextSave.rpgExt.activeTitle = null
    nextSave.savedAt = Date.now()
    consumeOne()
    return {
      nextSave,
      message: 'ใช้ใบแจ้งลบฉายา ล้างนามแฝงและฉายาทั้งหมดออกเรียบร้อยแล้ว',
      error: null,
    }
  }

  if (def.id === 'companion_gacha_box') {
    const petState = sanitizePetState(nextSave.petState, nextSave.ownedGemItems, nextSave.equippedGemCompanion)
    nextSave.petState = petState
    const candidates = COMBAT_PETS.filter((pet) => !pet.linkedGemItemId)
    const unowned = candidates.filter((pet) => !petState.ownedPets[pet.id])
    consumeOne()
    nextSave.savedAt = Date.now()
    if (unowned.length > 0) {
      const picked = unowned[Math.floor(Math.random() * unowned.length)]
      petState.ownedPets[picked.id] = { level: 1, exp: 0, stars: 1 }
      petState.activePetId = picked.id
      nextSave.equippedGemCompanion = null
      return {
        nextSave,
        message: `★ เปิดกล่องสุ่มคู่หูได้รับ "${picked.name}" เข้าร่วมทีมทันที!`,
        error: null,
      }
    }
    return {
      nextSave,
      message: 'คุณมีคู่หูครบทุกตัวแล้ว! กล่องสุ่มคู่หูถูกใช้หมดแล้ว',
      error: null,
    }
  }

  if (def.id === 'stat_reset_potion' || def.id === 'skill_reset_potion' || def.id === 'job_reset_potion') {
    return {
      nextSave: save,
      message: '',
      error: 'กรุณาเปิดหน้าต่างสถานะ / อาชีพภายในเกมเพื่อใช้น้ำยารีเซ็ตนี้',
    }
  }

  const foodDef = getFoodBuffForItem(def.id)
  if (foodDef) {
    const stats = getStats(nextSave)
    const extV2 = sanitizeExtV2(nextSave.extV2)
    extV2.activeFoodBuff = {
      itemId: foodDef.itemId,
      name: foodDef.name,
      expiresAtMs: Date.now() + foodDef.durationSec * 1000,
      atkPct: foodDef.atkPct,
      defPct: foodDef.defPct,
      critBonus: foodDef.critBonus,
      expMul: foodDef.expMul,
    }
    nextSave.extV2 = extV2
    const notes: string[] = [`ATK +${foodDef.atkPct}%`, `DEF +${foodDef.defPct}%`]
    if (def.heal) {
      const gained = Math.max(0, Math.min(stats.maxHp, nextSave.hp + def.heal) - nextSave.hp)
      nextSave.hp = Math.min(stats.maxHp, nextSave.hp + def.heal)
      if (gained > 0) notes.push(`+${gained} HP`)
    }
    if (def.mana) {
      const gainedMp = Math.max(0, Math.min(stats.maxMp, nextSave.mp + def.mana) - nextSave.mp)
      nextSave.mp = Math.min(stats.maxMp, nextSave.mp + def.mana)
      if (gainedMp > 0) notes.push(`+${gainedMp} MP`)
    }
    nextSave.savedAt = Date.now()
    consumeOne()
    return {
      nextSave,
      message: `รับประทาน ${foodDef.name} (${notes.join(' · ')}) สำเร็จ`,
      error: null,
    }
  }

  const stats = getStats(nextSave)
  const notes: string[] = []
  if (def.heal) {
    const beforeHp = nextSave.hp
    nextSave.hp = Math.min(stats.maxHp, nextSave.hp + def.heal)
    const gained = nextSave.hp - beforeHp
    if (gained <= 0 && !def.mana) {
      return { nextSave: save, message: '', error: 'HP เต็มอยู่แล้ว' }
    }
    if (gained > 0) notes.push(`+${gained} HP`)
  }
  if (def.mana) {
    const beforeMp = nextSave.mp
    nextSave.mp = Math.min(stats.maxMp, nextSave.mp + def.mana)
    const gained = nextSave.mp - beforeMp
    if (gained <= 0 && notes.length === 0) {
      return { nextSave: save, message: '', error: def.heal ? 'HP และ MP เต็มอยู่แล้ว' : 'MP เต็มอยู่แล้ว' }
    }
    if (gained > 0) notes.push(`+${gained} MP`)
  }

  nextSave.savedAt = Date.now()
  consumeOne()

  return {
    nextSave,
    message: `ใช้ ${def.name} สำเร็จ (${notes.join(' · ') || 'ใช้งานแล้ว'})`,
    error: null,
  }
}

export function renameWithTicketInSave(
  save: SaveData,
  itemUid: string,
  rawName: string,
): { nextSave: SaveData; message: string; error: string | null } {
  const targetIdx = save.inventory.findIndex((entry) => entry.uid === itemUid && entry.itemId === 'name_change_ticket')
  if (targetIdx < 0) {
    return { nextSave: save, message: '', error: 'ไม่พบบัตรเปลี่ยนชื่อในกระเป๋า' }
  }
  const nextName = rawName.trim().replace(/\s+/g, ' ')
  if (nextName.length < 1 || nextName.length > 16) {
    return { nextSave: save, message: '', error: 'ชื่อตัวละครต้องมี 1 - 16 ตัวอักษร' }
  }
  if (nextName === save.name) {
    return { nextSave: save, message: '', error: 'กรุณากรอกชื่อใหม่ที่แตกต่างจากชื่อเดิม' }
  }
  const nextSave: SaveData = structuredClone(save)
  const entry = nextSave.inventory[targetIdx]
  entry.qty -= 1
  if (entry.qty <= 0) nextSave.inventory.splice(targetIdx, 1)
  nextSave.inventory = nextSave.inventory.filter((i) => i.qty > 0)
  nextSave.extV2 = pruneDepletedQuickSlotsInExtV2(sanitizeExtV2(nextSave.extV2), nextSave.inventory).nextExtV2
  const prevName = nextSave.name
  nextSave.name = nextName
  nextSave.savedAt = Date.now()
  return {
    nextSave,
    message: `เปลี่ยนชื่อตัวละครจาก "${prevName}" เป็น "${nextName}" เรียบร้อยแล้ว`,
    error: null,
  }
}

export function buildInventoryEntries(save: SaveData): InventoryItemEntry[] {
  const entries: InventoryItemEntry[] = []

  for (const item of save.inventory) {
    const def = ITEMS[item.itemId]
    if (!def) continue
    const targetSlot = resolveItemEquipmentSlot(def)
    const power = targetSlot ? computeEquipmentPower(item) : 0
    const equipError = targetSlot ? getEquipRestriction(save, item) : null
    const canEquip = targetSlot !== null && equipError === null
    const currentSlotItem = targetSlot ? save.equipment[targetSlot] : null
    const currentSlotPower = computeEquipmentPower(currentSlotItem)
    const monsterSources = getItemMonsterSources(item.itemId)

    entries.push({
      item,
      def,
      rarity: resolveItemRarity(def),
      targetSlot,
      power,
      statLabel: targetSlot ? (targetSlot === 'weapon' ? 'ATK' : 'DEF') : null,
      canEquip,
      equipError,
      isUpgradeForSlot: Boolean(targetSlot && canEquip && power > currentSlotPower),
      monsterSources,
      isMonsterDrop: monsterSources.length > 0,
    })
  }

  return entries
}

export function filterAndSortInventory(
  save: SaveData,
  options: {
    tab?: InventoryFilterTab
    search?: string
    sort?: InventorySortMode
  } = {},
): InventoryItemEntry[] {
  const { tab = 'all', search = '', sort = 'power' } = options
  const normalizedQuery = search.trim().toLowerCase()
  const entries = buildInventoryEntries(save)

  const filtered = entries.filter((entry) => {
    if (tab === 'equipable' && entry.targetSlot === null) return false
    if (tab === 'monster_drops' && !entry.isMonsterDrop) return false
    if (tab === 'weapon' && entry.def.kind !== 'weapon') return false
    if (tab === 'armor' && entry.def.kind !== 'armor') return false
    if (
      tab === 'consumable_material' &&
      entry.def.kind !== 'consumable' &&
      entry.def.kind !== 'material'
    ) {
      return false
    }

    if (normalizedQuery.length > 0) {
      const nameMatch = entry.def.name.toLowerCase().includes(normalizedQuery)
      const descMatch = entry.def.description.toLowerCase().includes(normalizedQuery)
      const monsterMatch = entry.monsterSources.some((m) =>
        m.monsterName.toLowerCase().includes(normalizedQuery),
      )
      if (!nameMatch && !descMatch && !monsterMatch) return false
    }

    return true
  })

  return filtered.sort((a, b) => {
    if (sort === 'rarity') {
      const rankDiff = ITEM_RARITY_META[b.rarity].rank - ITEM_RARITY_META[a.rarity].rank
      if (rankDiff !== 0) return rankDiff
      if (a.power !== b.power) return b.power - a.power
      return a.def.name.localeCompare(b.def.name, 'th')
    }
    if (sort === 'monster_drops') {
      if (a.isMonsterDrop !== b.isMonsterDrop) return a.isMonsterDrop ? -1 : 1
      if (a.power !== b.power) return b.power - a.power
      return a.def.name.localeCompare(b.def.name, 'th')
    }
    if (sort === 'name') {
      return a.def.name.localeCompare(b.def.name, 'th')
    }
    // Default 'power': equipable upgrades first, then equipment power, then monster drops
    if (a.isUpgradeForSlot !== b.isUpgradeForSlot) return a.isUpgradeForSlot ? -1 : 1
    const aEquip = a.targetSlot !== null
    const bEquip = b.targetSlot !== null
    if (aEquip !== bEquip) return aEquip ? -1 : 1
    if (a.power !== b.power) return b.power - a.power
    if (a.isMonsterDrop !== b.isMonsterDrop) return a.isMonsterDrop ? -1 : 1
    return a.def.name.localeCompare(b.def.name, 'th')
  })
}

export function getInventorySummary(save: SaveData): InventorySummary {
  const entries = buildInventoryEntries(save)
  return {
    usedSlots: save.inventory.length,
    maxSlots: getInventoryCapacity(save),
    equipableCount: entries.filter((e) => e.targetSlot !== null).length,
    monsterDropStackCount: entries.filter((e) => e.isMonsterDrop).length,
    consumableCount: entries.filter((e) => e.def.kind === 'consumable').length,
    materialCount: entries.filter((e) => e.def.kind === 'material').length,
  }
}

export function formatAllowedJobsLabel(def: ItemDef): string {
  if (def.allowedJobs?.length) {
    return def.allowedJobs.map((id) => JOBS[normalizeJobId(id)]?.name ?? id).join(', ')
  }
  if (def.kind === 'weapon' && def.weaponType) {
    const names = Object.values(JOBS)
      .filter((job) => job.weaponTypes.includes(def.weaponType!))
      .map((job) => job.name)
    return names.length > 0 ? names.join(', ') : 'ทุกอาชีพ'
  }
  return 'ทุกอาชีพ'
}
