import test from 'node:test'
import assert from 'node:assert/strict'
import { ITEMS, SHOP_STOCK, enhanceCost } from './data'
import { PREMIUM_CATALOG } from './premium/catalog'
import {
  doesProtectScrollApply,
  executeEnhanceOnSave,
  type EnhanceSaveLike,
} from './enhance-logic'

function makeSave(overrides?: Partial<EnhanceSaveLike>): EnhanceSaveLike {
  return {
    gold: 100000,
    inventory: [
      { uid: 'stone_1', itemId: 'enhance_stone', qty: 50, plus: 0 },
    ],
    equipment: {
      weapon: { uid: 'wpn_eq', itemId: 'short_sword', qty: 1, plus: 5 },
      armor: { uid: 'arm_eq', itemId: 'iron_visor_helm', qty: 1, plus: 6 },
      shoes: null,
      cloak: null,
      accessory: null,
    },
    ...overrides,
  }
}

test('equipped weapon is destroyed and removed when enhancement fails without ใบกันแตก', () => {
  const save = makeSave()
  const cost = enhanceCost(5, ITEMS.short_sword.tier ?? 1)
  const initialStones = 50
  const initialGold = 100000

  // plus 5 has rate 0.65; rng = 0.99 guarantees failure
  const res = executeEnhanceOnSave(save, 'wpn_eq', { rng: () => 0.99 })

  assert.equal(res.result, 'destroyed')
  assert.equal(save.equipment.weapon, null)
  assert.equal(save.gold, initialGold - cost.gold)
  const remainingStones = save.inventory.find((i) => i.itemId === 'enhance_stone')?.qty ?? 0
  assert.equal(remainingStones, initialStones - cost.stones)
  assert.match(res.message, /แตกสลาย|หายไป/)
  assert.match(res.message, /ใบกันแตก/)
})

test('weapon in inventory is also destroyed and spliced out when enhancement fails without ใบกันแตก', () => {
  const save = makeSave({
    inventory: [
      { uid: 'stone_1', itemId: 'enhance_stone', qty: 20, plus: 0 },
      { uid: 'wpn_bag', itemId: 'short_sword', qty: 1, plus: 3 },
    ],
  })

  // plus 3 has rate 0.9; rng = 0.95 forces failure
  const res = executeEnhanceOnSave(save, 'wpn_bag', { rng: () => 0.95 })

  assert.equal(res.result, 'destroyed')
  assert.equal(save.inventory.some((i) => i.uid === 'wpn_bag'), false)
  // Equipped weapon untouched
  assert.equal(save.equipment.weapon?.uid, 'wpn_eq')
})

test('weapon failure with ใบกันแตก (enhance_protect_scroll_1) prevents destruction and keeps plus level', () => {
  const save = makeSave({
    inventory: [
      { uid: 'stone_1', itemId: 'enhance_stone', qty: 20, plus: 0 },
      { uid: 'prot_1', itemId: 'enhance_protect_scroll_1', qty: 2, plus: 0 },
    ],
  })

  const res = executeEnhanceOnSave(save, 'wpn_eq', {
    protectScrollId: 'enhance_protect_scroll_1',
    rng: () => 0.99,
  })

  assert.equal(res.result, 'fail')
  assert.equal(res.usedProtect, true)
  assert.ok(save.equipment.weapon, 'weapon should remain equipped')
  assert.equal(save.equipment.weapon?.plus, 5)
  assert.equal(save.inventory.find((i) => i.itemId === 'enhance_protect_scroll_1')?.qty, 1)
})

test('weapon failure with ใบกันแตกชั้นดี (enhance_protect_scroll_2) prevents destruction and refunds 50% stones', () => {
  const save = makeSave({
    inventory: [
      { uid: 'stone_1', itemId: 'enhance_stone', qty: 30, plus: 0 },
      { uid: 'prot_2', itemId: 'enhance_protect_scroll_2', qty: 1, plus: 0 },
    ],
  })
  const cost = enhanceCost(5, ITEMS.short_sword.tier ?? 1)
  const expectedRefund = Math.max(1, Math.floor(cost.stones * 0.5))

  const res = executeEnhanceOnSave(save, 'wpn_eq', {
    protectScrollId: 'enhance_protect_scroll_2',
    rng: () => 0.99,
  })

  assert.equal(res.result, 'fail')
  assert.equal(res.refundedStones, expectedRefund)
  assert.ok(save.equipment.weapon)
  assert.equal(save.equipment.weapon?.plus, 5)
  assert.equal(save.inventory.some((i) => i.itemId === 'enhance_protect_scroll_2'), false)
  const stonesLeft = save.inventory.find((i) => i.itemId === 'enhance_stone')?.qty ?? 0
  assert.equal(stonesLeft, 30 - cost.stones + expectedRefund)
})

test('ใบกันแตก is NOT consumed when success rate is 100% (e.g. +0..+2 or +3 with +10% chance scroll)', () => {
  const save = makeSave({
    inventory: [
      { uid: 'stone_1', itemId: 'enhance_stone', qty: 20, plus: 0 },
      { uid: 'chance_1', itemId: 'enhance_chance_scroll_1', qty: 1, plus: 0 },
      { uid: 'prot_1', itemId: 'enhance_protect_scroll_1', qty: 2, plus: 0 },
    ],
    equipment: {
      weapon: { uid: 'wpn_3', itemId: 'short_sword', qty: 1, plus: 3 },
      armor: null,
      shoes: null,
      cloak: null,
      accessory: null,
    },
  })

  assert.equal(doesProtectScrollApply('weapon', 2, 1), false)
  assert.equal(doesProtectScrollApply('weapon', 3, 1), false)
  assert.equal(doesProtectScrollApply('weapon', 3, 0.9), true)

  const res = executeEnhanceOnSave(save, 'wpn_3', {
    chanceScrollId: 'enhance_chance_scroll_1',
    protectScrollId: 'enhance_protect_scroll_1',
    rng: () => 0.99,
  })

  assert.equal(res.result, 'success')
  assert.equal(res.usedProtect, false)
  assert.equal(save.equipment.weapon?.plus, 4)
  assert.equal(save.inventory.find((i) => i.itemId === 'enhance_protect_scroll_1')?.qty, 2)
})

test('armor enhancement still drops 1 level at +6+ without protect scroll and preserves level with ใบกันแตก', () => {
  const saveUnprotected = makeSave()
  const downRes = executeEnhanceOnSave(saveUnprotected, 'arm_eq', { rng: () => 0.99 })
  assert.equal(downRes.result, 'down')
  assert.equal(saveUnprotected.equipment.armor?.plus, 5)

  const saveProtected = makeSave({
    inventory: [
      { uid: 'stone_1', itemId: 'enhance_stone', qty: 20, plus: 0 },
      { uid: 'prot_1', itemId: 'enhance_protect_scroll_1', qty: 1, plus: 0 },
    ],
  })
  const protRes = executeEnhanceOnSave(saveProtected, 'arm_eq', {
    protectScrollId: 'enhance_protect_scroll_1',
    rng: () => 0.99,
  })
  assert.equal(protRes.result, 'fail')
  assert.equal(saveProtected.equipment.armor?.plus, 6)
  assert.equal(saveProtected.inventory.some((i) => i.itemId === 'enhance_protect_scroll_1'), false)
})

test('returns error without touching weapon if protectScrollId is requested but missing from inventory', () => {
  const save = makeSave()
  const res = executeEnhanceOnSave(save, 'wpn_eq', {
    protectScrollId: 'enhance_protect_scroll_1',
    rng: () => 0.99,
  })

  assert.equal(res.result, 'error')
  assert.equal(save.equipment.weapon?.plus, 5)
  assert.equal(save.gold, 100000)
})

test('ใบกันแตก is purchasable in NPC gold shop and Soul Shop with matching Thai copy', () => {
  assert.ok(SHOP_STOCK.includes('enhance_protect_scroll_1'))
  assert.match(ITEMS.enhance_protect_scroll_1.name, /ใบกันแตก/)
  assert.match(ITEMS.enhance_protect_scroll_2.name, /ใบกันแตก/)

  const soulProtect1 = PREMIUM_CATALOG.find((p) => p.itemId === 'enhance_protect_scroll_1')
  const soulProtect2 = PREMIUM_CATALOG.find((p) => p.itemId === 'enhance_protect_scroll_2')
  assert.ok(soulProtect1 && /ใบกันแตก/.test(soulProtect1.name))
  assert.ok(soulProtect2 && /ใบกันแตก/.test(soulProtect2.name))
})
