import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ITEMS } from './data'
import {
  ITEM_RARITIES,
  ITEM_SCHEMA_LIST,
  ITEM_SCHEMA_MAP,
  SET_A_ITEM_CATEGORIES,
  computeScaledBaseStats,
  generateRandomItem,
  getItemSchemaById,
  getItemSchemasByCategory,
  resolveItemImagePath,
} from './items'
import {
  discardInventoryItem,
  getInventoryItemSellPrice,
  sellInventoryItem,
} from './inventory-screen'
import { resolveItemVfxSpec } from './item-vfx'
import { EQUIPMENT_RARITY_META } from './mmo-systems'
import { computeJoystickVector, resolveCanvasTapAction } from './touch-movement'
import type { SaveData } from './engine'

function readPngHeader(absPath: string): { width: number; height: number; colorType: number } {
  const buf = fs.readFileSync(absPath)
  assert.ok(buf.length >= 26, `PNG too small: ${absPath}`)
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `Invalid PNG signature: ${absPath}`)
  const ihdr = buf.subarray(12, 16).toString('ascii')
  assert.equal(ihdr, 'IHDR', `Missing IHDR chunk: ${absPath}`)
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colorType: buf[25],
  }
}

function makeDummySave(): SaveData {
  return {
    version: 1,
    name: 'ทดสอบระบบ',
    jobId: 'swordsman',
    level: 60,
    exp: 0,
    hp: 1000,
    mp: 300,
    gold: 1000,
    diamonds: 50,
    ownedGemItems: [],
    equippedGemFashion: null,
    equippedGemCompanion: null,
    lootMagnetUntil: 0,
    inventoryCapacityBonus: 0,
    inventory: [
      {
        uid: 'u_sword',
        itemId: 'lv70_elemental_ignis_blade',
        qty: 2,
        plus: 3,
        rarity: 'epic',
      },
      {
        uid: 'u_pot',
        itemId: 'red_potion',
        qty: 5,
        plus: 0,
      },
    ],
    storage: [],
    storageGold: 0,
    equipment: {
      weapon: null,
      armor: null,
      shoes: null,
      cloak: null,
      accessory: null,
    },
    mapId: 'town',
    x: 100,
    y: 100,
    gm: false,
    god: false,
    speed: 100,
    playTime: 0,
    kills: 0,
    savedAt: 1_700_000_000_000,
  }
}

test('every item in ITEMS is registered in ITEM_SCHEMA_LIST and has a valid 64x64 RGBA transparent PNG on disk', () => {
  const allItems = Object.values(ITEMS)
  assert.equal(ITEM_SCHEMA_LIST.length, allItems.length)
  assert.ok(allItems.length >= 320)

  const publicDir = path.resolve(process.cwd(), 'public')
  for (const schema of ITEM_SCHEMA_LIST) {
    assert.ok(schema.imagePath.startsWith('/assets/items/'), `Expected /assets/items/ path for ${schema.id}`)
    assert.equal(resolveItemImagePath(ITEMS[schema.id]), schema.imagePath)
    assert.equal(getItemSchemaById(schema.id), ITEM_SCHEMA_MAP[schema.id])

    const diskPath = path.join(publicDir, schema.imagePath.replace(/^\//, ''))
    assert.ok(fs.existsSync(diskPath), `Missing PNG file on disk: ${diskPath}`)
    const hdr = readPngHeader(diskPath)
    assert.equal(hdr.width, 64, `Expected 64px width for ${schema.id}`)
    assert.equal(hdr.height, 64, `Expected 64px height for ${schema.id}`)
    assert.equal(hdr.colorType, 6, `Expected RGBA (colorType 6) for ${schema.id}`)
  }

  // Verify composable VFX effect PNGs exist and are valid RGBA PNGs
  for (const fxFile of ['rune_circle.png', 'spark_star.png']) {
    const fxPath = path.join(publicDir, 'assets', 'effects', fxFile)
    assert.ok(fs.existsSync(fxPath), `Missing VFX overlay PNG: ${fxPath}`)
    const hdr = readPngHeader(fxPath)
    assert.equal(hdr.colorType, 6)
    assert.ok(hdr.width >= 32 && hdr.height >= 32)
  }
})

test('Set A categories are all populated in ITEM_SCHEMA_LIST', () => {
  for (const category of SET_A_ITEM_CATEGORIES) {
    const matches = getItemSchemasByCategory(category)
    assert.ok(matches.length >= 1, `Expected at least 1 Set A item in category '${category}'`)
  }
})

test('generateRandomItem scales stats and affixes faithfully across all 6 rarities', () => {
  const sampleWeapon = ITEMS.lv70_elemental_ignis_blade ?? ITEMS.lv100_mythic_asura_sovereign
  assert.ok(sampleWeapon, 'Sample weapon must exist in ITEMS')
  const scaledPerRarity = ITEM_RARITIES.map((rarity) => computeScaledBaseStats(sampleWeapon, rarity, 0).atk)
  for (let i = 1; i < scaledPerRarity.length; i++) {
    assert.ok(
      scaledPerRarity[i] > scaledPerRarity[i - 1],
      `Expected ${ITEM_RARITIES[i]} ATK (${scaledPerRarity[i]}) > ${ITEM_RARITIES[i - 1]} ATK (${scaledPerRarity[i - 1]})`,
    )
  }

  for (const rarity of ITEM_RARITIES) {
    let idx = 0
    const seq = [0.25, 0.5, 0.75, 0.15, 0.85, 0.4]
    const item = generateRandomItem({
      rarity,
      category: 'weapon',
      rng: () => seq[idx++ % seq.length],
    })
    assert.equal(item.rarity, rarity)
    assert.equal(item.category, 'weapon')
    assert.equal(item.affixes.length, EQUIPMENT_RARITY_META[rarity].affixCount)
    assert.ok(item.stats.atk > 0)
    assert.ok(item.sellPrice > 0)
    assert.ok(item.imagePath.startsWith('/assets/items/weapons/'))
    assert.equal(item.vfx.rarity, rarity)
  }

  // Mythic intensity and effects surpass Legendary and Epic
  const rareVfx = resolveItemVfxSpec('rare', { id: 'lv50_rare_glacier_blade', element: 'ice' })
  const epicVfx = resolveItemVfxSpec('epic', { id: 'lv70_epic_crimson_fang', element: 'fire' })
  const legVfx = resolveItemVfxSpec('legendary', { id: 'lv90_legend_dragon_slayer', element: 'fire' })
  const mythicVfx = resolveItemVfxSpec('mythic', { id: 'lv100_mythic_asura_sovereign', element: 'holy' })

  assert.ok(rareVfx.intensity < epicVfx.intensity)
  assert.ok(epicVfx.intensity < legVfx.intensity)
  assert.ok(legVfx.intensity < mythicVfx.intensity)
  assert.ok(mythicVfx.effects.includes('rotating_rune'))
  assert.ok(mythicVfx.effects.includes('star_sparkles'))
  assert.ok(mythicVfx.effects.includes('periodic_burst'))
})

test('sellInventoryItem and discardInventoryItem calculate rarity-scaled gold and update inventory cleanly', () => {
  const save = makeDummySave()
  const sword = save.inventory[0]
  const unitPrice = getInventoryItemSellPrice(sword)
  assert.ok(unitPrice > 0)

  const sold = sellInventoryItem(save, sword.uid, 1)
  assert.equal(sold.error, null)
  assert.equal(sold.gainedGold, unitPrice)
  assert.equal(sold.nextSave.gold, save.gold + unitPrice)
  assert.equal(sold.nextSave.inventory[0]?.qty, 1)

  const discarded = discardInventoryItem(sold.nextSave, sword.uid, 1)
  assert.equal(discarded.error, null)
  assert.equal(discarded.nextSave.inventory.some((i) => i.uid === sword.uid), false)
})

test('touch-movement computeJoystickVector handles deadzone, clamping, and direction', () => {
  const idle = computeJoystickVector(3, 4, 40, 6)
  assert.equal(idle.active, false)
  assert.equal(idle.x, 0)
  assert.equal(idle.y, 0)

  const clamped = computeJoystickVector(100, 0, 40, 6)
  assert.equal(clamped.active, true)
  assert.ok(Math.abs(clamped.x - 1) < 1e-6)
  assert.ok(Math.abs(clamped.y) < 1e-6)
  assert.equal(clamped.knobX, 40)
  assert.equal(clamped.knobY, 0)
})

test('touch-movement resolveCanvasTapAction prioritizes NPC > drop > monster > remote > walk', () => {
  const params = {
    tileSize: 32,
    playerMapId: 'meadow',
    playerOwnerId: 'player1',
    npcs: [{ id: 'guide', x: 5, y: 5 }],
    groundDrops: [{ uid: 'd1', itemId: 'iron_sword', x: 300, y: 300, ownerId: 'player1' }],
    monsters: [{ uid: 'm1', x: 450, y: 200, dead: false }],
    remotePlayers: [{ userId: 'u2', x: 600, y: 200, mapId: 'meadow' }],
  }

  assert.equal(resolveCanvasTapAction(5 * 32, 5 * 32 - 8, params).kind, 'npc')
  assert.equal(resolveCanvasTapAction(300, 295, params).kind, 'drop')
  assert.equal(resolveCanvasTapAction(450, 190, params).kind, 'monster')
  assert.equal(resolveCanvasTapAction(600, 190, params).kind, 'remote')
  const walk = resolveCanvasTapAction(12, 12, params)
  assert.equal(walk.kind, 'walk')
  assert.equal(walk.worldX, 12)
  assert.equal(walk.worldY, 12)
})
