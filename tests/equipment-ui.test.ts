import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ITEMS } from '../lib/game/data'
import {
  PRIMARY_EQUIPMENT_SLOTS,
  SECONDARY_EQUIPMENT_SLOTS,
  buildEquipmentSlotCards,
  computeEquipmentPower,
  getEquipRestriction,
  getEquippableBagItems,
  summarizeEquipmentBonuses,
} from '../lib/game/equipment-ui'

describe('Equipment screen pure logic', () => {
  it('defines visual placeholder metadata for Sword, Armor, and Accessory slots in primary order', () => {
    assert.deepEqual(
      PRIMARY_EQUIPMENT_SLOTS.map((m) => [m.slot, m.englishLabel]),
      [
        ['weapon', 'Sword'],
        ['armor', 'Armor'],
        ['accessory', 'Accessory'],
      ],
    )
    assert.deepEqual(
      SECONDARY_EQUIPMENT_SLOTS.map((m) => [m.slot, m.englishLabel]),
      [
        ['shoes', 'Shoes'],
        ['cloak', 'Cloak'],
      ],
    )
  })

  it('builds slot cards with empty placeholders and computes equipped stats + bonuses', () => {
    const cards = buildEquipmentSlotCards({
      weapon: { uid: 'w1', itemId: 'short_sword', qty: 1, plus: 2 },
      armor: null,
      accessory: null,
      shoes: null,
      cloak: null,
    })

    assert.equal(cards.primary.length, 3)
    assert.equal(cards.primary[0].meta.englishLabel, 'Sword')
    assert.equal(cards.primary[0].isEmpty, false)
    assert.equal(cards.primary[0].displayName, 'ดาบสั้น +2')
    assert.equal(cards.primary[0].power, computeEquipmentPower({ uid: 'w1', itemId: 'short_sword', qty: 1, plus: 2 }))

    assert.equal(cards.primary[1].meta.englishLabel, 'Armor')
    assert.equal(cards.primary[1].isEmpty, true)
    assert.equal(cards.primary[1].meta.placeholderTitle, 'Armor Slot')

    assert.equal(cards.primary[2].meta.englishLabel, 'Accessory')
    assert.equal(cards.primary[2].isEmpty, true)
    assert.equal(cards.primary[2].meta.placeholderTitle, 'Accessory Slot')

    const summary = summarizeEquipmentBonuses({
      weapon: { uid: 'w1', itemId: 'short_sword', qty: 1, plus: 2 },
      armor: { uid: 'a1', itemId: 'cloth_armor', qty: 1, plus: 1 },
      accessory: null,
    })
    assert.equal(summary.totalAtkBonus, computeEquipmentPower({ uid: 'w1', itemId: 'short_sword', qty: 1, plus: 2 }))
    assert.equal(summary.totalDefBonus, computeEquipmentPower({ uid: 'a1', itemId: 'cloth_armor', qty: 1, plus: 1 }))
    assert.equal(summary.totalEnhancePlus, 3)
    assert.equal(summary.primaryEquippedCount, 2)
    assert.equal(summary.primaryTotalCount, 3)
  })

  it('filters equippable bag items by slot and reports job/level restrictions accurately', () => {
    const accessoryItemId = Object.values(ITEMS).find((d) => d.slot === 'accessory')?.id
    assert.ok(accessoryItemId, 'Expected an accessory item in ITEMS catalog')

    const player = {
      jobId: 'novice',
      level: 10,
      inventory: [
        { uid: 'p1', itemId: 'red_potion', qty: 5, plus: 0 },
        { uid: 'w1', itemId: 'wooden_stick', qty: 1, plus: 0 },
        { uid: 'w2', itemId: 'short_sword', qty: 1, plus: 0 },
        { uid: 'a1', itemId: 'cloth_armor', qty: 1, plus: 0 },
        { uid: 'acc1', itemId: accessoryItemId!, qty: 1, plus: 0 },
      ],
    }

    const allEquippable = getEquippableBagItems(player)
    assert.equal(allEquippable.length, 4)

    const weaponOnly = getEquippableBagItems(player, 'weapon')
    assert.equal(weaponOnly.length, 2)
    assert.equal(weaponOnly.find((e) => e.item.uid === 'w1')?.canUse, true)
    assert.equal(weaponOnly.find((e) => e.item.uid === 'w2')?.canUse, false)
    assert.ok(getEquipRestriction(player, player.inventory[2])?.includes('ใช้อาวุธนี้ไม่ได้'))

    const accessoryOnly = getEquippableBagItems(player, 'accessory')
    assert.equal(accessoryOnly.length, 1)
    assert.equal(accessoryOnly[0].targetSlot, 'accessory')
  })
})
