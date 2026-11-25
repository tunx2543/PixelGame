import { ITEMS, JOBS, normalizeJobId, type EquipmentSlot, type ItemDef } from './data'
import { aggregateEquipmentAffixes, type ItemAffix } from './mmo-systems'
import type { InvItem, SaveData } from './engine'

export interface EquipmentStatCompare {
  slot: EquipmentSlot
  equippedItem: InvItem | null
  equippedName: string | null
  powerDelta: number
  atkDelta: number
  defDelta: number
  hpDelta: number
  critDeltaPct: number
  isCompatibleJob: boolean
  meetsLevel: boolean
}

function calcRawPower(def: ItemDef | undefined, plus = 0): number {
  if (!def) return 0
  const base = def.atk ?? def.def ?? 0
  return Math.floor(base * (1 + plus * 0.12) + plus * 2)
}

function summarizeItemContribution(item: { itemId: string; plus?: number; affixes?: ItemAffix[] } | null, jobAtkMul: number, jobDefMul: number) {
  if (!item) {
    return { power: 0, atk: 0, def: 0, hp: 0, critPct: 0 }
  }
  const def = ITEMS[item.itemId]
  if (!def) {
    return { power: 0, atk: 0, def: 0, hp: 0, critPct: 0 }
  }
  const plus = item.plus ?? 0
  const power = calcRawPower(def, plus)
  const slot: EquipmentSlot = def.slot ?? (def.kind === 'weapon' ? 'weapon' : 'armor')
  const aff = aggregateEquipmentAffixes({ [slot]: item })
  const baseAtk = def.kind === 'weapon' ? Math.round(power * jobAtkMul) : 0
  const baseDef = def.kind !== 'weapon' ? Math.round(power) : 0
  const baseHp = def.kind !== 'weapon' ? power * 2 : 0
  void jobDefMul

  return {
    power,
    atk: baseAtk + aff.atkFlat,
    def: baseDef + aff.defFlat,
    hp: baseHp + aff.hpFlat,
    critPct: Math.round(aff.critBonus * 100),
  }
}

export function compareEquipmentItem(
  candidate: { itemId: string; plus?: number; affixes?: ItemAffix[] },
  player: SaveData,
): EquipmentStatCompare | null {
  const def = ITEMS[candidate.itemId]
  if (!def || (def.kind !== 'weapon' && def.kind !== 'armor')) return null

  const slot: EquipmentSlot = def.slot ?? (def.kind === 'weapon' ? 'weapon' : 'armor')
  const job = JOBS[normalizeJobId(player.jobId)]
  const equippedItem = player.equipment[slot] ?? null
  const equippedDef = equippedItem ? ITEMS[equippedItem.itemId] : null

  const candStats = summarizeItemContribution(candidate, job.atkMul, job.defMul)
  const eqStats = summarizeItemContribution(equippedItem, job.atkMul, job.defMul)

  const isCompatibleJob =
    def.kind === 'weapon'
      ? (!def.weaponType || job.weaponTypes.includes(def.weaponType)) &&
        (!def.allowedJobs?.length || def.allowedJobs.includes(job.id))
      : !def.allowedJobs?.length || def.allowedJobs.includes(job.id)
  const meetsLevel = player.level >= (def.reqLevel ?? 1)

  return {
    slot,
    equippedItem,
    equippedName: equippedDef ? `${equippedDef.name}${equippedItem && equippedItem.plus > 0 ? ` +${equippedItem.plus}` : ''}` : null,
    powerDelta: candStats.power - eqStats.power,
    atkDelta: candStats.atk - eqStats.atk,
    defDelta: candStats.def - eqStats.def,
    hpDelta: candStats.hp - eqStats.hp,
    critDeltaPct: candStats.critPct - eqStats.critPct,
    isCompatibleJob,
    meetsLevel,
  }
}
