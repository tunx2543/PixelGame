import { ITEMS, JOBS, normalizeJobId, type EquipmentSlot, type ItemDef } from './data'
import type { InvItem, SaveData } from './engine'

export type PrimaryEquipmentSlot = 'weapon' | 'armor' | 'accessory'
export type SecondaryEquipmentSlot = 'shoes' | 'cloak'

export interface EquipmentSlotMeta {
  slot: EquipmentSlot
  category: 'primary' | 'secondary'
  englishLabel: string
  thaiLabel: string
  placeholderTitle: string
  emptyHint: string
  statTag: string
  statPrefix: 'ATK' | 'DEF'
}

export interface EquipmentSlotCardData {
  meta: EquipmentSlotMeta
  equipped: InvItem | null
  itemDef: ItemDef | null
  displayName: string | null
  power: number
  isEmpty: boolean
}

export interface EquippableBagEntry {
  item: InvItem
  def: ItemDef
  targetSlot: EquipmentSlot
  power: number
  statPrefix: 'ATK' | 'DEF'
  error: string | null
  canUse: boolean
}

export interface EquipmentBonusSummary {
  totalAtkBonus: number
  totalDefBonus: number
  totalEnhancePlus: number
  primaryEquippedCount: number
  primaryTotalCount: number
  totalEquippedCount: number
  totalSlotCount: number
}

export const PRIMARY_EQUIPMENT_SLOTS: readonly EquipmentSlotMeta[] = [
  {
    slot: 'weapon',
    category: 'primary',
    englishLabel: 'Sword',
    thaiLabel: 'ดาบ / อาวุธ',
    placeholderTitle: 'Sword Slot',
    emptyHint: 'ว่าง • ใส่อาวุธคู่กาย',
    statTag: 'ATK',
    statPrefix: 'ATK',
  },
  {
    slot: 'armor',
    category: 'primary',
    englishLabel: 'Armor',
    thaiLabel: 'ชุดเกราะ',
    placeholderTitle: 'Armor Slot',
    emptyHint: 'ว่าง • ใส่เกราะป้องกัน',
    statTag: 'DEF',
    statPrefix: 'DEF',
  },
  {
    slot: 'accessory',
    category: 'primary',
    englishLabel: 'Accessory',
    thaiLabel: 'เครื่องประดับ',
    placeholderTitle: 'Accessory Slot',
    emptyHint: 'ว่าง • ใส่เครื่องประดับ',
    statTag: 'DEF / BONUS',
    statPrefix: 'DEF',
  },
] as const

export const SECONDARY_EQUIPMENT_SLOTS: readonly EquipmentSlotMeta[] = [
  {
    slot: 'shoes',
    category: 'secondary',
    englishLabel: 'Shoes',
    thaiLabel: 'รองเท้า',
    placeholderTitle: 'Shoes Slot',
    emptyHint: 'ว่าง • ใส่รองเท้า',
    statTag: 'DEF',
    statPrefix: 'DEF',
  },
  {
    slot: 'cloak',
    category: 'secondary',
    englishLabel: 'Cloak',
    thaiLabel: 'ผ้าคลุม',
    placeholderTitle: 'Cloak Slot',
    emptyHint: 'ว่าง • ใส่ผ้าคลุม',
    statTag: 'DEF',
    statPrefix: 'DEF',
  },
] as const

export const ALL_EQUIPMENT_SLOTS: readonly EquipmentSlotMeta[] = [
  ...PRIMARY_EQUIPMENT_SLOTS,
  ...SECONDARY_EQUIPMENT_SLOTS,
] as const

export function computeEquipmentPower(item: InvItem | null | undefined): number {
  if (!item) return 0
  const def = ITEMS[item.itemId]
  if (!def) return 0
  const base = def.atk ?? def.def ?? 0
  return Math.floor(base * (1 + item.plus * 0.12) + item.plus * 2)
}

export function formatEquippedItemName(item: InvItem): string {
  const def = ITEMS[item.itemId]
  const baseName = def?.name ?? item.itemId
  return item.plus > 0 ? `${baseName} +${item.plus}` : baseName
}

export function resolveItemEquipmentSlot(def: ItemDef): EquipmentSlot | null {
  if (def.kind !== 'weapon' && def.kind !== 'armor') return null
  return def.slot ?? (def.kind === 'weapon' ? 'weapon' : 'armor')
}

export function getEquipRestriction(
  player: Pick<SaveData, 'jobId' | 'level'>,
  item: InvItem,
): string | null {
  const def = ITEMS[item.itemId]
  if (!def) return 'ไม่พบข้อมูลไอเทม'
  if (def.kind !== 'weapon' && def.kind !== 'armor') return 'ไอเทมนี้สวมใส่ไม่ได้'
  if ((def.reqLevel ?? 1) > player.level) return `ต้องการเลเวล ${def.reqLevel}`
  const job = JOBS[normalizeJobId(player.jobId)]
  if (def.kind === 'weapon' && (!def.weaponType || !job.weaponTypes.includes(def.weaponType))) {
    return `อาชีพ ${job.name} ใช้อาวุธนี้ไม่ได้`
  }
  if (def.allowedJobs?.length && !def.allowedJobs.includes(job.id)) {
    return `อาชีพ ${job.name} สวมใส่ไอเทมนี้ไม่ได้`
  }
  return null
}

export function buildEquipmentSlotCards(
  equipment: Partial<Record<EquipmentSlot, InvItem | null>>,
): {
  primary: EquipmentSlotCardData[]
  secondary: EquipmentSlotCardData[]
} {
  const toCard = (meta: EquipmentSlotMeta): EquipmentSlotCardData => {
    const equipped = equipment[meta.slot] ?? null
    const itemDef = equipped ? (ITEMS[equipped.itemId] ?? null) : null
    return {
      meta,
      equipped,
      itemDef,
      displayName: equipped ? formatEquippedItemName(equipped) : null,
      power: computeEquipmentPower(equipped),
      isEmpty: !equipped,
    }
  }

  return {
    primary: PRIMARY_EQUIPMENT_SLOTS.map(toCard),
    secondary: SECONDARY_EQUIPMENT_SLOTS.map(toCard),
  }
}

export function getEquippableBagItems(
  player: Pick<SaveData, 'jobId' | 'level' | 'inventory'>,
  slotFilter?: EquipmentSlot | null,
): EquippableBagEntry[] {
  const entries: EquippableBagEntry[] = []

  for (const item of player.inventory) {
    const def = ITEMS[item.itemId]
    if (!def) continue
    const targetSlot = resolveItemEquipmentSlot(def)
    if (!targetSlot) continue
    if (slotFilter && targetSlot !== slotFilter) continue
    const error = getEquipRestriction(player, item)
    entries.push({
      item,
      def,
      targetSlot,
      power: computeEquipmentPower(item),
      statPrefix: targetSlot === 'weapon' ? 'ATK' : 'DEF',
      error,
      canUse: error === null,
    })
  }

  return entries.sort((a, b) => {
    if (a.canUse !== b.canUse) return a.canUse ? -1 : 1
    return b.power - a.power
  })
}

export function summarizeEquipmentBonuses(
  equipment: Partial<Record<EquipmentSlot, InvItem | null>>,
): EquipmentBonusSummary {
  const weapon = equipment.weapon ?? null
  const defenseSlots: EquipmentSlot[] = ['armor', 'shoes', 'cloak', 'accessory']
  const totalAtkBonus = computeEquipmentPower(weapon)
  const totalDefBonus = defenseSlots.reduce((sum, slot) => sum + computeEquipmentPower(equipment[slot]), 0)

  let totalEnhancePlus = 0
  let primaryEquippedCount = 0
  let totalEquippedCount = 0

  for (const meta of ALL_EQUIPMENT_SLOTS) {
    const item = equipment[meta.slot] ?? null
    if (!item) continue
    totalEquippedCount += 1
    totalEnhancePlus += item.plus
    if (meta.category === 'primary') primaryEquippedCount += 1
  }

  return {
    totalAtkBonus,
    totalDefBonus,
    totalEnhancePlus,
    primaryEquippedCount,
    primaryTotalCount: PRIMARY_EQUIPMENT_SLOTS.length,
    totalEquippedCount,
    totalSlotCount: ALL_EQUIPMENT_SLOTS.length,
  }
}
