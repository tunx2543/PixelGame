import test from 'node:test'
import assert from 'node:assert/strict'
import { ITEMS } from './data'
import type { SaveData } from './engine'
import {
  renameWithTicketInSave,
  useConsumableInInventory,
} from './inventory-screen'
import {
  NAME_COLOR_PALETTE,
  RAINBOW_NAME_COLOR,
  createDefaultExtV2,
  getNameColorGlowStyle,
  getNameColorPresentation,
  resolveAnimatedRainbowHex,
  rollRandomNameColor,
  sanitizeExtV2,
  sanitizeNameColor,
  toggleRainbowNameInExtV2,
} from './extended-systems'
import { MAPS, TILE } from './maps'
import { MAX_PET_LEVEL } from './systems'
import { GRAPHICS_QUALITY_PRESETS } from './ui-layout'

function createTestSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 1,
    name: 'ผู้กล้าทดสอบ',
    jobId: 'swordsman',
    level: 20,
    exp: 0,
    hp: 40,
    mp: 10,
    gold: 5000,
    diamonds: 100,
    ownedGemItems: [],
    equippedGemFashion: null,
    equippedGemCompanion: null,
    lootMagnetUntil: 0,
    inventoryCapacityBonus: 0,
    inventory: [],
    storage: [],
    storageGold: 0,
    equipment: {
      weapon: null,
      armor: null,
      shoes: null,
      cloak: null,
      accessory: null,
    },
    mapId: 'meadow',
    x: 200,
    y: 200,
    gm: false,
    god: false,
    speed: 100,
    playTime: 0,
    kills: 0,
    savedAt: 1_700_000_000_000,
    ...overrides,
  }
}

test('every consumable item in ITEMS works cleanly via useConsumableInInventory', () => {
  const consumables = Object.values(ITEMS).filter((def) => def.kind === 'consumable')
  assert.ok(consumables.length >= 23, `Expected at least 23 consumables, got ${consumables.length}`)

  for (const def of consumables) {
    const uid = `u_${def.id}`
    const baseSave = createTestSave({
      hp: 1,
      mp: 1,
      inventory: [{ uid, itemId: def.id, qty: 2, plus: 0 }],
      petState: {
        activePetId: 'buddy_slime',
        ownedPets: { buddy_slime: { level: 1, exp: 0, stars: 1 } },
      },
    })

    const res = useConsumableInInventory(baseSave, uid)
    if (
      def.id === 'stat_reset_potion' ||
      def.id === 'skill_reset_potion' ||
      def.id === 'job_reset_potion'
    ) {
      assert.ok(res.error && res.error.includes('หน้าต่างสถานะ'), `Expected status-panel notice for ${def.id}`)
      continue
    }
    assert.equal(res.error, null, `Expected ${def.id} to succeed without error, got: ${res.error}`)
    assert.ok(res.message.length > 0, `Expected non-empty feedback message for ${def.id}`)

    if (def.id === 'name_change_ticket') {
      assert.equal(res.requiresNameInput, true)
      assert.equal(res.nextSave.inventory[0]?.qty, 2, 'Ticket should not be consumed until name confirmed')
      const renamed = renameWithTicketInSave(baseSave, uid, 'นักรบแสงดาว')
      assert.equal(renamed.error, null)
      assert.equal(renamed.nextSave.name, 'นักรบแสงดาว')
      assert.equal(renamed.nextSave.inventory[0]?.qty, 1)
    } else {
      assert.equal(res.nextSave.inventory[0]?.qty, 1, `Expected 1 unit consumed for ${def.id}`)
    }
  }
})

test('pure HP/MP potions do not consume when HP and MP are already full', () => {
  const saveFull = createTestSave({
    hp: 99999,
    mp: 99999,
    inventory: [
      { uid: 'u_red', itemId: 'red_potion', qty: 3, plus: 0 },
      { uid: 'u_blue', itemId: 'blue_potion', qty: 3, plus: 0 },
      { uid: 'u_sup', itemId: 'supreme_hp_elixir', qty: 2, plus: 0 },
    ],
  })

  for (const uid of ['u_red', 'u_blue', 'u_sup']) {
    const res = useConsumableInInventory(saveFull, uid)
    assert.ok(res.error && res.error.includes('เต็มอยู่แล้ว'), `Expected full guard error for ${uid}`)
    assert.equal(res.nextSave, saveFull, `Should not consume ${uid} when full`)
  }
})

test('food items apply activeFoodBuff AND restore HP or MP', () => {
  const save = createTestSave({
    hp: 10,
    mp: 5,
    inventory: [
      { uid: 'u_fish', itemId: 'food_grilled_fish', qty: 1, plus: 0 },
      { uid: 'u_tonic', itemId: 'food_miner_tonic', qty: 1, plus: 0 },
    ],
  })

  const afterFish = useConsumableInInventory(save, 'u_fish')
  assert.equal(afterFish.error, null)
  assert.equal(afterFish.nextSave.extV2?.activeFoodBuff?.itemId, 'food_grilled_fish')
  assert.ok(afterFish.nextSave.hp > 10)

  const afterTonic = useConsumableInInventory(save, 'u_tonic')
  assert.equal(afterTonic.error, null)
  assert.equal(afterTonic.nextSave.extV2?.activeFoodBuff?.itemId, 'food_miner_tonic')
  assert.ok(afterTonic.nextSave.mp > 5)
})

test('utility scrolls, VIP items, return scrolls, and pet elixir apply exact state updates and caps', () => {
  const save = createTestSave({
    inventory: [
      { uid: 'u_warp', itemId: 'town_warp_tome', qty: 1, plus: 0 },
      { uid: 'u_bag', itemId: 'bag_scroll_10', qty: 1, plus: 0 },
      { uid: 'u_stor', itemId: 'storage_scroll_30', qty: 1, plus: 0 },
      { uid: 'u_vip', itemId: 'vip_card_30d', qty: 1, plus: 0 },
      { uid: 'u_pet', itemId: 'pet_exp_elixir', qty: 1, plus: 0 },
    ],
    petState: {
      activePetId: 'buddy_slime',
      ownedPets: { buddy_slime: { level: MAX_PET_LEVEL, exp: 0, stars: 1 } },
    },
  })

  const afterWarp = useConsumableInInventory(save, 'u_warp')
  assert.equal(afterWarp.error, null)
  assert.equal(afterWarp.nextSave.mapId, 'town')
  assert.equal(afterWarp.nextSave.x, MAPS.town.spawn.x * TILE)
  assert.equal(afterWarp.nextSave.y, MAPS.town.spawn.y * TILE)

  const afterBag = useConsumableInInventory(save, 'u_bag')
  assert.equal(afterBag.error, null)
  assert.equal(afterBag.nextSave.premium?.storage.extraInventorySlots, 10)

  const afterStorage = useConsumableInInventory(afterBag.nextSave, 'u_stor')
  assert.equal(afterStorage.error, null)
  assert.equal(afterStorage.nextSave.premium?.storage.extraStorageSlots, 30)

  const afterVip = useConsumableInInventory(afterStorage.nextSave, 'u_vip')
  assert.equal(afterVip.error, null)
  assert.ok((afterVip.nextSave.premium?.vip.vipLevel ?? 0) >= 2)
  assert.equal(afterVip.nextSave.premium?.vip.vipExp, 450)

  const maxPet = useConsumableInInventory(save, 'u_pet')
  assert.ok(maxPet.error && maxPet.error.includes('สูงสุด'))
  assert.equal(maxPet.nextSave.inventory.some((i) => i.uid === 'u_pet'), true)
})

test('materials cannot be directly consumed in inventory', () => {
  const save = createTestSave({
    inventory: [{ uid: 'u_stone', itemId: 'enhance_stone', qty: 5, plus: 0 }],
  })
  const res = useConsumableInInventory(save, 'u_stone')
  assert.ok(res.error)
  assert.equal(res.nextSave, save)
})

test('GRAPHICS_QUALITY_PRESETS provide high, medium, and low lag-reduction profiles', () => {
  assert.equal(GRAPHICS_QUALITY_PRESETS.high.fpsLimit, 0)
  assert.equal(GRAPHICS_QUALITY_PRESETS.high.resolutionScale, 1)
  assert.equal(GRAPHICS_QUALITY_PRESETS.high.reduceParticles, false)
  assert.equal(GRAPHICS_QUALITY_PRESETS.high.disableShadowsAndGlow, false)

  assert.equal(GRAPHICS_QUALITY_PRESETS.medium.fpsLimit, 60)
  assert.equal(GRAPHICS_QUALITY_PRESETS.medium.resolutionScale, 0.85)
  assert.equal(GRAPHICS_QUALITY_PRESETS.medium.reduceParticles, true)

  assert.equal(GRAPHICS_QUALITY_PRESETS.low.fpsLimit, 30)
  assert.equal(GRAPHICS_QUALITY_PRESETS.low.resolutionScale, 0.7)
  assert.equal(GRAPHICS_QUALITY_PRESETS.low.reduceParticles, true)
  assert.equal(GRAPHICS_QUALITY_PRESETS.low.disableShadowsAndGlow, true)
  assert.equal(GRAPHICS_QUALITY_PRESETS.low.crispPixelScale, true)
})

test('name_color_potion randomizes player name color without repeating consecutive colors', () => {
  assert.equal(sanitizeNameColor(' #38BDF8 '), '#38bdf8')
  assert.equal(sanitizeNameColor('red'), null)
  assert.equal(sanitizeNameColor('javascript:alert(1)'), null)

  for (const entry of NAME_COLOR_PALETTE) {
    const next = rollRandomNameColor(entry.hex, () => 0.5)
    assert.notEqual(next.hex.toLowerCase(), entry.hex.toLowerCase())
    assert.ok(NAME_COLOR_PALETTE.some((p) => p.hex === next.hex))
  }

  const save = createTestSave({
    inventory: [{ uid: 'u_nc', itemId: 'name_color_potion', qty: 3, plus: 0 }],
  })

  const isValidRolledColor = (c: string | null) =>
    Boolean(c && (c === RAINBOW_NAME_COLOR || NAME_COLOR_PALETTE.some((entry) => entry.hex === c)))

  const use1 = useConsumableInInventory(save, 'u_nc')
  assert.equal(use1.error, null)
  const color1 = sanitizeExtV2(use1.nextSave.extV2).nameColor
  assert.ok(isValidRolledColor(color1))
  assert.equal(use1.nextSave.inventory[0]?.qty, 2)

  const use2 = useConsumableInInventory(use1.nextSave, 'u_nc')
  assert.equal(use2.error, null)
  const color2 = sanitizeExtV2(use2.nextSave.extV2).nameColor
  assert.ok(isValidRolledColor(color2))
  assert.notEqual(color2, color1)
  assert.equal(use2.nextSave.inventory[0]?.qty, 1)
})

test('getNameColorGlowStyle produces layered glow textShadow for valid hex colors and undefined otherwise', () => {
  assert.equal(getNameColorGlowStyle(null), undefined)
  assert.equal(getNameColorGlowStyle(undefined), undefined)
  assert.equal(getNameColorGlowStyle('red'), undefined)

  const prominent = getNameColorGlowStyle('#93C5FD', 'prominent')
  assert.ok(prominent)
  assert.equal(prominent.color, '#93c5fd')
  assert.match(prominent.textShadow, /rgba\(147, 197, 253, 0\.88\)/)
  assert.match(prominent.textShadow, /28px rgba\(147, 197, 253, 0\.34\)/)

  const subtle = getNameColorGlowStyle('#f0a', 'subtle')
  assert.ok(subtle)
  assert.equal(subtle.color, '#f0a')
  assert.match(subtle.textShadow, /rgba\(255, 0, 170, 0\.78\)/)
})

test('legendary rainbow roll, rainbow_name_potion, and Rainbow Mode toggle work end-to-end', () => {
  assert.equal(sanitizeNameColor('rainbow'), RAINBOW_NAME_COLOR)
  assert.equal(sanitizeNameColor(' RAINBOW '), RAINBOW_NAME_COLOR)
  assert.equal(getNameColorGlowStyle(RAINBOW_NAME_COLOR), undefined)

  // Rolling below legendary chance hits Rainbow Mode (legendary)
  const rolledLegend = rollRandomNameColor('#38bdf8', () => 0.05)
  assert.equal(rolledLegend.hex, RAINBOW_NAME_COLOR)
  assert.equal(rolledLegend.rarity, 'legendary')

  // Locked extV2 rejects Rainbow Mode toggle
  const lockedExt = createDefaultExtV2()
  assert.equal(lockedExt.rainbowNameUnlocked, false)
  const lockedToggle = toggleRainbowNameInExtV2(lockedExt)
  assert.equal(lockedToggle.ok, false)

  // Using rainbow_name_potion unlocks and enables Rainbow Mode while remembering prior static color
  const baseSave = createTestSave({
    extV2: {
      ...createDefaultExtV2(),
      nameColor: '#4ade80',
      savedStaticNameColor: '#4ade80',
    },
    inventory: [{ uid: 'u_rainbow', itemId: 'rainbow_name_potion', qty: 1, plus: 0 }],
  })
  const used = useConsumableInInventory(baseSave, 'u_rainbow')
  assert.equal(used.error, null)
  const extAfterUse = sanitizeExtV2(used.nextSave.extV2)
  assert.equal(extAfterUse.nameColor, RAINBOW_NAME_COLOR)
  assert.equal(extAfterUse.rainbowNameUnlocked, true)
  assert.equal(extAfterUse.savedStaticNameColor, '#4ade80')
  assert.equal(used.nextSave.inventory.length, 0)

  // Toggling OFF restores saved static color, toggling ON reactivates Rainbow Mode
  const turnedOff = toggleRainbowNameInExtV2(extAfterUse)
  assert.equal(turnedOff.ok, true)
  assert.equal(turnedOff.enabled, false)
  assert.equal(turnedOff.nextExtV2.nameColor, '#4ade80')
  assert.equal(turnedOff.nextExtV2.rainbowNameUnlocked, true)

  const turnedOn = toggleRainbowNameInExtV2(turnedOff.nextExtV2)
  assert.equal(turnedOn.ok, true)
  assert.equal(turnedOn.enabled, true)
  assert.equal(turnedOn.nextExtV2.nameColor, RAINBOW_NAME_COLOR)

  // Presentation & canvas animated hex helper
  const presProminent = getNameColorPresentation(RAINBOW_NAME_COLOR, 'prominent')
  assert.equal(presProminent.className, 'rainbow-name-text')
  assert.equal(presProminent.style, undefined)

  const c0 = resolveAnimatedRainbowHex(0)
  const c1 = resolveAnimatedRainbowHex(1500)
  assert.match(c0, /^#[0-9a-f]{6}$/)
  assert.match(c1, /^#[0-9a-f]{6}$/)
  assert.notEqual(c0, c1)
})


