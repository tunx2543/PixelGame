import { ITEMS, MAX_PLUS, enhanceCost, enhanceRate, type ItemDef } from './data'

export type ProtectScrollId = 'enhance_protect_scroll_1' | 'enhance_protect_scroll_2'
export type EnhanceOutcome = 'success' | 'fail' | 'down' | 'destroyed' | 'error'

export const ENHANCE_CHANCE_BONUS_MAP: Record<string, number> = {
  enhance_chance_scroll_1: 0.1,
  enhance_chance_scroll_2: 0.2,
  enhance_chance_scroll_3: 0.35,
  enhance_chance_scroll_4: 0.5,
}

export interface EnhanceInventoryItemLike {
  uid: string
  itemId: string
  qty: number
  plus: number
}

export interface EnhanceSaveLike {
  gold: number
  inventory: EnhanceInventoryItemLike[]
  equipment: {
    weapon: EnhanceInventoryItemLike | null
    armor: EnhanceInventoryItemLike | null
    shoes: EnhanceInventoryItemLike | null
    cloak: EnhanceInventoryItemLike | null
    accessory: EnhanceInventoryItemLike | null
  }
}

export interface EnhanceExecutionResult {
  result: EnhanceOutcome
  message: string
  itemName?: string
  itemKind?: ItemDef['kind']
  previousPlus?: number
  newPlus?: number
  usedProtect?: boolean
  refundedStones?: number
}

const EQUIPMENT_SLOTS = ['weapon', 'armor', 'shoes', 'cloak', 'accessory'] as const

export function isProtectScrollId(id: string | null | undefined): id is ProtectScrollId {
  return id === 'enhance_protect_scroll_1' || id === 'enhance_protect_scroll_2'
}

/**
 * ใบกันแตกจะถูกใช้และคุ้มครองเฉพาะตอนที่มีโอกาสล้มเหลว (rate < 1):
 * - อาวุธ: ล้มเหลวแล้วแตกหายตั้งแต่ระดับแรกที่โอกาสไม่ถึง 100% (+3 ขึ้นไป)
 * - ชุดเกราะ/เครื่องสวมใส่: ป้องกันระดับลดเมื่อ +6 ขึ้นไป
 */
export function doesProtectScrollApply(kind: ItemDef['kind'], plus: number, rate: number): boolean {
  if (rate >= 1) return false
  if (kind === 'weapon') return true
  return plus >= 6
}

export function findEquipmentInSave(save: EnhanceSaveLike, uid: string): EnhanceInventoryItemLike | null {
  for (const slot of EQUIPMENT_SLOTS) {
    const equipped = save.equipment[slot]
    if (equipped?.uid === uid) return equipped
  }
  return save.inventory.find((i) => i.uid === uid) ?? null
}

export function removeEquipmentItemByUid(
  save: EnhanceSaveLike,
  uid: string,
): (typeof EQUIPMENT_SLOTS)[number] | 'inventory' | null {
  for (const slot of EQUIPMENT_SLOTS) {
    if (save.equipment[slot]?.uid === uid) {
      save.equipment[slot] = null
      return slot
    }
  }
  const idx = save.inventory.findIndex((i) => i.uid === uid)
  if (idx >= 0) {
    save.inventory.splice(idx, 1)
    return 'inventory'
  }
  return null
}

export function countSaveItem(save: EnhanceSaveLike, itemId: string): number {
  return save.inventory
    .filter((i) => i.itemId === itemId && i.qty > 0)
    .reduce((sum, i) => sum + i.qty, 0)
}

export function consumeSaveItem(save: EnhanceSaveLike, itemId: string, qty: number): boolean {
  let left = qty
  for (let i = save.inventory.length - 1; i >= 0 && left > 0; i--) {
    if (save.inventory[i].itemId !== itemId) continue
    const take = Math.min(left, save.inventory[i].qty)
    save.inventory[i].qty -= take
    left -= take
    if (save.inventory[i].qty <= 0) save.inventory.splice(i, 1)
  }
  return left === 0
}

function addSaveStones(save: EnhanceSaveLike, qty: number) {
  if (qty <= 0) return
  const existing = save.inventory.find((i) => i.itemId === 'enhance_stone')
  if (existing) {
    existing.qty += qty
    return
  }
  save.inventory.push({
    uid: `stone_${Math.random().toString(36).slice(2, 10)}`,
    itemId: 'enhance_stone',
    qty,
    plus: 0,
  })
}

export function resolveEnhanceFailureOutcome(params: {
  kind: ItemDef['kind']
  name: string
  plus: number
  costStones: number
  protectScrollId: ProtectScrollId | null
}): {
  outcome: 'destroyed' | 'down' | 'fail'
  newPlus: number
  refundedStones: number
  message: string
} {
  const { kind, name, plus, costStones, protectScrollId } = params

  if (kind === 'weapon') {
    if (!protectScrollId) {
      const plusSuffix = plus > 0 ? ` +${plus}` : ''
      return {
        outcome: 'destroyed',
        newPlus: 0,
        refundedStones: 0,
        message: `ตีบวกล้มเหลว! ${name}${plusSuffix} แตกสลายและหายไป (ไม่ได้ใช้ใบกันแตก)`,
      }
    }
    if (protectScrollId === 'enhance_protect_scroll_2') {
      const refundedStones = Math.max(1, Math.floor(costStones * 0.5))
      return {
        outcome: 'fail',
        newPlus: plus,
        refundedStones,
        message: `ตีบวกล้มเหลว! ใบกันแตกชั้นดีป้องกันไม่ให้ ${name} แตกหาย (+${plus} คงเดิม) และคืนหินตีบวก ${refundedStones} ก้อน`,
      }
    }
    return {
      outcome: 'fail',
      newPlus: plus,
      refundedStones: 0,
      message: `ตีบวกล้มเหลว! ใบกันแตกป้องกันไม่ให้ ${name} แตกหาย (+${plus} คงเดิม)`,
    }
  }

  if (plus >= 6) {
    if (!protectScrollId) {
      const nextPlus = plus - 1
      return {
        outcome: 'down',
        newPlus: nextPlus,
        refundedStones: 0,
        message: `ตีบวกล้มเหลว! ระดับลดลงเป็น +${nextPlus}`,
      }
    }
    if (protectScrollId === 'enhance_protect_scroll_2') {
      const refundedStones = Math.max(1, Math.floor(costStones * 0.5))
      return {
        outcome: 'fail',
        newPlus: plus,
        refundedStones,
        message: `ตีบวกล้มเหลว! ใบกันแตกชั้นดีป้องกันระดับไม่ให้ลด และคืนหินตีบวก ${refundedStones} ก้อน`,
      }
    }
    return {
      outcome: 'fail',
      newPlus: plus,
      refundedStones: 0,
      message: 'ตีบวกล้มเหลว! ใบกันแตกป้องกันไม่ให้ระดับลดลง (+คงเดิม)',
    }
  }

  return {
    outcome: 'fail',
    newPlus: plus,
    refundedStones: 0,
    message: 'ตีบวกล้มเหลว! ระดับคงเดิม',
  }
}

export function executeEnhanceOnSave(
  save: EnhanceSaveLike,
  itemUid: string,
  options?: {
    chanceScrollId?: string | null
    protectScrollId?: string | null
    rng?: () => number
  },
): EnhanceExecutionResult {
  const it = findEquipmentInSave(save, itemUid)
  if (!it) return { result: 'error', message: 'ไม่พบไอเทม' }

  const def = ITEMS[it.itemId]
  if (!def) return { result: 'error', message: 'ไม่พบข้อมูลไอเทม' }
  if (def.kind !== 'weapon' && def.kind !== 'armor') {
    return { result: 'error', message: 'ตีบวกได้เฉพาะอาวุธและชุดเกราะ' }
  }
  if (it.plus >= MAX_PLUS) {
    return { result: 'error', message: `ตีบวกสูงสุดแล้ว (+${MAX_PLUS})` }
  }

  const cost = enhanceCost(it.plus, def.tier ?? 1)
  if (save.gold < cost.gold) {
    return { result: 'error', message: `เงินไม่พอ (ต้องการ ${cost.gold} G)` }
  }
  if (countSaveItem(save, 'enhance_stone') < cost.stones) {
    return { result: 'error', message: `หินตีบวกไม่พอ (ต้องการ ${cost.stones})` }
  }

  const chanceScrollId =
    options?.chanceScrollId && ENHANCE_CHANCE_BONUS_MAP[options.chanceScrollId]
      ? options.chanceScrollId
      : null
  const protectScrollId = isProtectScrollId(options?.protectScrollId) ? options.protectScrollId : null

  if (chanceScrollId && countSaveItem(save, chanceScrollId) < 1) {
    return { result: 'error', message: `ไม่มี ${ITEMS[chanceScrollId]?.name ?? chanceScrollId} ในกระเป๋า` }
  }
  if (protectScrollId && countSaveItem(save, protectScrollId) < 1) {
    return { result: 'error', message: `ไม่มี ${ITEMS[protectScrollId]?.name ?? protectScrollId} ในกระเป๋า` }
  }

  const prevPlus = it.plus
  save.gold -= cost.gold
  consumeSaveItem(save, 'enhance_stone', cost.stones)

  let chanceBonus = 0
  if (chanceScrollId) {
    consumeSaveItem(save, chanceScrollId, 1)
    chanceBonus = ENHANCE_CHANCE_BONUS_MAP[chanceScrollId] ?? 0
  }

  const rate = Math.min(1, enhanceRate(prevPlus) + chanceBonus)
  const protectApplies = Boolean(protectScrollId && doesProtectScrollApply(def.kind, prevPlus, rate))
  let activeProtect: ProtectScrollId | null = null
  if (protectApplies && protectScrollId) {
    consumeSaveItem(save, protectScrollId, 1)
    activeProtect = protectScrollId
  }

  const roll = (options?.rng ?? Math.random)()
  if (roll < rate) {
    it.plus += 1
    return {
      result: 'success',
      message: `ตีบวกสำเร็จ! ${def.name} +${it.plus}`,
      itemName: def.name,
      itemKind: def.kind,
      previousPlus: prevPlus,
      newPlus: it.plus,
      usedProtect: Boolean(activeProtect),
      refundedStones: 0,
    }
  }

  const failure = resolveEnhanceFailureOutcome({
    kind: def.kind,
    name: def.name,
    plus: prevPlus,
    costStones: cost.stones,
    protectScrollId: activeProtect,
  })

  if (failure.outcome === 'destroyed') {
    removeEquipmentItemByUid(save, it.uid)
  } else {
    it.plus = failure.newPlus
  }

  if (failure.refundedStones > 0) {
    addSaveStones(save, failure.refundedStones)
  }

  return {
    result: failure.outcome,
    message: failure.message,
    itemName: def.name,
    itemKind: def.kind,
    previousPlus: prevPlus,
    newPlus: failure.newPlus,
    usedProtect: Boolean(activeProtect),
    refundedStones: failure.refundedStones,
  }
}
