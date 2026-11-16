import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ITEMS } from '../lib/game/data'
import { getStats } from '../lib/game/engine'
import { createDefaultEncounterSave } from '../lib/game/encounter'
import {
  equipInventoryItem,
  filterAndSortInventory,
  getInventorySummary,
  getItemMonsterSources,
  getItemRarityMeta,
  previewEquipStatDelta,
  previewUnequipStatDelta,
  resolveItemRarity,
  unequipInventorySlot,
  useConsumableInInventory,
} from '../lib/game/inventory-screen'

describe('Dedicated inventory screen logic', () => {
  it('equips weapon, armor, and accessory items into matching slots and boosts character stats', () => {
    const baseSave = createDefaultEncounterSave('ผู้กล้า')
    baseSave.jobId = 'swordsman'

    const accessoryDef = Object.values(ITEMS).find(
      (d) => d.slot === 'accessory' && (!d.allowedJobs?.length || d.allowedJobs.includes('swordsman')),
    )
    assert.ok(accessoryDef, 'Expected a swordsman-compatible accessory item in catalog')
    baseSave.level = Math.max(25, accessoryDef.reqLevel ?? 1)

    baseSave.inventory.push(
      { uid: 'loot-sword', itemId: 'steel_sword', qty: 1, plus: 2 },
      { uid: 'loot-armor', itemId: 'chain_mail', qty: 1, plus: 1 },
      { uid: 'loot-acc', itemId: accessoryDef.id, qty: 1, plus: 0 },
    )

    const initialStats = getStats(baseSave)

    // Preview weapon delta before equipping
    const preview = previewEquipStatDelta(baseSave, { uid: 'loot-sword', itemId: 'steel_sword', qty: 1, plus: 2 })
    assert.ok(preview)
    assert.equal(preview.targetSlot, 'weapon')
    assert.ok(preview.delta.atk > 0)

    // Equip sword -> swaps out starter wooden_stick back into inventory
    const wRes = equipInventoryItem(baseSave, 'loot-sword')
    assert.equal(wRes.error, null)
    assert.equal(wRes.nextSave.equipment.weapon?.itemId, 'steel_sword')
    assert.ok(wRes.nextSave.inventory.some((i) => i.itemId === 'wooden_stick'))
    assert.ok(!wRes.nextSave.inventory.some((i) => i.uid === 'loot-sword'))

    // Equip armor -> boosts DEF and MaxHP
    const aRes = equipInventoryItem(wRes.nextSave, 'loot-armor')
    assert.equal(aRes.error, null)
    assert.equal(aRes.nextSave.equipment.armor?.itemId, 'chain_mail')
    assert.ok(aRes.nextSave.inventory.some((i) => i.itemId === 'cloth_armor'))

    // Equip accessory
    const accRes = equipInventoryItem(aRes.nextSave, 'loot-acc')
    assert.equal(accRes.error, null)
    assert.equal(accRes.nextSave.equipment.accessory?.itemId, accessoryDef.id)

    const boostedStats = getStats(accRes.nextSave)
    assert.ok(boostedStats.atk > initialStats.atk)
    assert.ok(boostedStats.def > initialStats.def)
    assert.ok(boostedStats.maxHp > initialStats.maxHp)

    // Unequip accessory returns it to bag and reduces DEF
    const unequipPreview = previewUnequipStatDelta(accRes.nextSave, 'accessory')
    assert.ok(unequipPreview && unequipPreview.delta.def < 0)
    const uRes = unequipInventorySlot(accRes.nextSave, 'accessory')
    assert.equal(uRes.error, null)
    assert.equal(uRes.nextSave.equipment.accessory, null)
    assert.ok(uRes.nextSave.inventory.some((i) => i.uid === 'loot-acc'))
  })

  it('rejects equipping restricted gear by level or job class', () => {
    const save = createDefaultEncounterSave('มือใหม่')
    save.level = 5
    save.jobId = 'novice'
    save.inventory.push(
      { uid: 'high-sword', itemId: 'steel_sword', qty: 1, plus: 0 },
      { uid: 'high-armor', itemId: 'dragon_armor', qty: 1, plus: 0 },
    )

    const swordAttempt = equipInventoryItem(save, 'high-sword')
    assert.ok(swordAttempt.error?.includes('ต้องการเลเวล'))

    const armorAttempt = equipInventoryItem(save, 'high-armor')
    assert.ok(armorAttempt.error?.includes('ต้องการเลเวล'))

    save.level = 20
    const jobMismatch = equipInventoryItem(save, 'high-sword')
    assert.ok(jobMismatch.error?.includes('ใช้อาวุธนี้ไม่ได้'))
  })

  it('identifies monster drop sources and filters/sorts monster encounter loot', () => {
    const knightBladeSources = getItemMonsterSources('knight_blade')
    assert.ok(knightBladeSources.some((s) => s.monsterId === 'skeleton'))

    const dragonArmorSources = getItemMonsterSources('dragon_armor')
    assert.ok(dragonArmorSources.some((s) => s.isBoss && s.monsterId === 'demon_lord'))

    const save = createDefaultEncounterSave('นักล่า')
    save.level = 30
    save.jobId = 'swordsman'
    save.inventory.push(
      { uid: 'drop-1', itemId: 'knight_blade', qty: 1, plus: 0 },
      { uid: 'drop-2', itemId: 'wolf_fang', qty: 3, plus: 0 },
    )

    const monsterLoot = filterAndSortInventory(save, { tab: 'monster_drops' })
    assert.ok(monsterLoot.some((e) => e.item.itemId === 'knight_blade' && e.isUpgradeForSlot))
    assert.ok(monsterLoot.some((e) => e.item.itemId === 'wolf_fang'))

    const searchByMonster = filterAndSortInventory(save, { search: 'โครงกระดูก' })
    assert.ok(searchByMonster.some((e) => e.item.itemId === 'knight_blade'))
    assert.ok(searchByMonster.some((e) => e.item.itemId === 'enhance_stone'))

    const summary = getInventorySummary(save)
    assert.equal(summary.usedSlots, save.inventory.length)
    assert.ok(summary.monsterDropStackCount >= 2)
  })

  it('uses consumable potions from inventory and clamps to max vitals', () => {
    const save = createDefaultEncounterSave('นักเวท')
    const stats = getStats(save)
    save.hp = Math.max(1, stats.maxHp - 30)
    const potion = save.inventory.find((i) => i.itemId === 'red_potion')
    assert.ok(potion)

    const res = useConsumableInInventory(save, potion!.uid)
    assert.equal(res.error, null)
    assert.equal(res.nextSave.hp, stats.maxHp)
    const updatedPotion = res.nextSave.inventory.find((i) => i.itemId === 'red_potion')
    assert.equal(updatedPotion?.qty, potion!.qty - 1)
  })

  it('classifies items into Common, Rare, Epic, and Legendary rarities and sorts by rarity', () => {
    assert.equal(resolveItemRarity(ITEMS.wooden_stick), 'common')
    assert.equal(resolveItemRarity(ITEMS.wolf_fang), 'common')
    assert.equal(resolveItemRarity(ITEMS.steel_sword), 'rare')
    assert.equal(resolveItemRarity(ITEMS.enhance_stone), 'rare')
    assert.equal(resolveItemRarity(ITEMS.knight_blade), 'epic')
    assert.equal(resolveItemRarity(ITEMS.chain_mail), 'epic')
    assert.equal(resolveItemRarity(ITEMS.flame_sword), 'legendary')
    assert.equal(resolveItemRarity(ITEMS.dragon_armor), 'legendary')
    assert.equal(resolveItemRarity(ITEMS.abyss_crystal), 'legendary')

    assert.equal(getItemRarityMeta('legendary').label, 'Legendary')

    const save = createDefaultEncounterSave('ผู้สะสม')
    save.inventory = [
      { uid: 'r-common', itemId: 'wolf_fang', qty: 2, plus: 0 },
      { uid: 'r-rare', itemId: 'steel_sword', qty: 1, plus: 0 },
      { uid: 'r-epic', itemId: 'knight_blade', qty: 1, plus: 1 },
      { uid: 'r-legend', itemId: 'flame_sword', qty: 1, plus: 3 },
    ]

    const sorted = filterAndSortInventory(save, { sort: 'rarity' })
    assert.deepEqual(
      sorted.map((e) => e.rarity),
      ['legendary', 'epic', 'rare', 'common'],
    )
  })
})
