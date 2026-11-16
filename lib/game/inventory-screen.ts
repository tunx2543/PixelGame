import {
  ITEMS,
  JOBS,
  MONSTERS,
  type EquipmentSlot,
  type ItemDef,
  type ItemKind,
} from './data'
import {
  getInventoryCapacity,
  getStats,
  type InvItem,
  type SaveData,
} from './engine'
import {
  computeEquipmentPower,
  getEquipRestriction,
  resolveItemEquipmentSlot,
} from './equipment-ui'

export type InventoryFilterTab =
  | 'all'
  | 'equipable'
  | 'monster_drops'
  | 'weapon'
  | 'armor'
  | 'consumable_material'

export type InventorySortMode = 'power' | 'rarity' | 'monster_drops' | 'name'

export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface ItemRarityMeta {
  id: ItemRarity
  label: 'Common' | 'Rare' | 'Epic' | 'Legendary'
  thaiLabel: string
  rank: number
}

export const ITEM_RARITY_META: Record<ItemRarity, ItemRarityMeta> = {
  common: { id: 'common', label: 'Common', thaiLabel: 'ทั่วไป', rank: 1 },
  rare: { id: 'rare', label: 'Rare', thaiLabel: 'หายาก', rank: 2 },
  epic: { id: 'epic', label: 'Epic', thaiLabel: 'อีปิก', rank: 3 },
  legendary: { id: 'legendary', label: 'Legendary', thaiLabel: 'ตำนาน', rank: 4 },
}

export function resolveItemRarity(def: ItemDef): ItemRarity {
  if (
    def.gmOnly ||
    (def.tier ?? 0) >= 4 ||
    def.id === 'earth_core' ||
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
    def.id === 'orange_potion' ||
    (def.kind === 'material' && def.price >= 90) ||
    (def.kind === 'consumable' && def.price >= 120)
  ) {
    return 'rare'
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

export function getItemKindThaiLabel(kind: ItemKind, slot?: EquipmentSlot | null): string {
  if (kind === 'weapon') return 'อาวุธ'
  if (kind === 'armor') return slot ? getSlotThaiLabel(slot) : 'ชุดเกราะ'
  if (kind === 'consumable') return 'ไอเทมใช้งาน'
  return 'วัตถุดิบจากมอนสเตอร์'
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
): { nextSave: SaveData; message: string; error: string | null } {
  const targetIdx = save.inventory.findIndex((entry) => entry.uid === itemUid)
  if (targetIdx < 0) {
    return { nextSave: save, message: '', error: 'ไม่พบไอเทมนี้ในกระเป๋า' }
  }

  const target = save.inventory[targetIdx]
  const def = ITEMS[target.itemId]
  if (!def || def.kind !== 'consumable') {
    return { nextSave: save, message: '', error: 'ไอเทมนี้ไม่สามารถกดใช้งานได้' }
  }

  if (def.id === 'return_scroll' || def.id === 'town_warp_tome' || def.id === 'name_change_ticket') {
    return {
      nextSave: save,
      message: '',
      error: 'ไอเทมนี้ใช้ได้เฉพาะภายในแผนที่โลกเกมหลัก',
    }
  }

  const nextSave: SaveData = structuredClone(save)
  const entry = nextSave.inventory[targetIdx]

  if (def.id === 'astral_bag_expansion') {
    if ((nextSave.inventoryCapacityBonus ?? 0) >= 60) {
      return { nextSave: save, message: '', error: 'ขยายกระเป๋าถึงขีดจำกัดสูงสุด (+60 ช่อง) แล้ว' }
    }
    nextSave.inventoryCapacityBonus = Math.min(60, (nextSave.inventoryCapacityBonus ?? 0) + 20)
    entry.qty -= 1
    if (entry.qty <= 0) nextSave.inventory.splice(targetIdx, 1)
    return {
      nextSave,
      message: `ขยายกระเป๋าสำเร็จ! ความจุปัจจุบัน ${getInventoryCapacity(nextSave)} ช่อง`,
      error: null,
    }
  }

  if (def.id === 'starlight_loot_magnet') {
    nextSave.lootMagnetUntil = Math.max(Date.now(), nextSave.lootMagnetUntil ?? 0) + 5 * 60 * 1000
    entry.qty -= 1
    if (entry.qty <= 0) nextSave.inventory.splice(targetIdx, 1)
    return {
      nextSave,
      message: 'เปิดใช้งานแม่เหล็กดูดของแสงดาว 5 นาทีแล้ว',
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
      return { nextSave: save, message: '', error: 'MP เต็มอยู่แล้ว' }
    }
    if (gained > 0) notes.push(`+${gained} MP`)
  }

  entry.qty -= 1
  if (entry.qty <= 0) nextSave.inventory.splice(targetIdx, 1)

  return {
    nextSave,
    message: `ใช้ ${def.name} สำเร็จ (${notes.join(' · ') || 'ใช้งานแล้ว'})`,
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
    return def.allowedJobs.map((id) => JOBS[id]?.name ?? id).join(', ')
  }
  if (def.kind === 'weapon' && def.weaponType) {
    const names = Object.values(JOBS)
      .filter((job) => job.weaponTypes.includes(def.weaponType!))
      .map((job) => job.name)
    return names.length > 0 ? names.join(', ') : 'ทุกอาชีพ'
  }
  return 'ทุกอาชีพ'
}
