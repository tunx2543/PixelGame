import test from 'node:test'
import assert from 'node:assert/strict'
import { ITEMS } from './data'
import { buildItem25dVisualSpec, classifyItem25dArchetype } from './item-25d-archetypes'
import { rasterizeItem25dRgba64 } from './item-25d-raster'
import { renderSkillIconBmpDataUrl } from './skill-icon-bmp'


test('classifyItem25dArchetype assigns accurate 2.5D archetypes across all item categories', () => {
  assert.equal(classifyItem25dArchetype(ITEMS.short_sword), 'sword')
  assert.equal(classifyItem25dArchetype(ITEMS.weapon_052), 'greatsword')
  assert.equal(classifyItem25dArchetype(ITEMS.weapon_004), 'hammer')
  assert.equal(classifyItem25dArchetype(ITEMS.wooden_stick), 'club')
  assert.equal(classifyItem25dArchetype(ITEMS.crystal_staff), 'staff')
  assert.equal(classifyItem25dArchetype(ITEMS.grimcaller_occult_grimoire), 'tome')
  assert.equal(classifyItem25dArchetype(ITEMS.pawchemist_molotov_flask), 'flask_bomb')
  assert.equal(classifyItem25dArchetype(ITEMS.hunter_bow), 'bow')
  assert.equal(classifyItem25dArchetype(ITEMS.weapon_031), 'crossbow')
  assert.equal(classifyItem25dArchetype(ITEMS.weapon_032), 'claw')
  assert.equal(classifyItem25dArchetype(ITEMS.weapon_034), 'shuriken')
  assert.equal(classifyItem25dArchetype(ITEMS.weapon_035), 'wristblade')
  assert.equal(classifyItem25dArchetype(ITEMS.weapon_001), 'cloak')
  assert.equal(classifyItem25dArchetype(ITEMS.weapon_005), 'boots')
  assert.equal(classifyItem25dArchetype(ITEMS.weapon_011), 'helmet_hood')
  assert.equal(classifyItem25dArchetype(ITEMS.weapon_012), 'helmet_crown')
  assert.equal(classifyItem25dArchetype(ITEMS.weapon_015), 'shield_serpent')
  assert.equal(classifyItem25dArchetype(ITEMS.weapon_018), 'shield_wood')
  assert.equal(classifyItem25dArchetype(ITEMS.ruby_warrior_ring), 'ring')
  assert.equal(classifyItem25dArchetype(ITEMS.weapon_013), 'necklace')
  assert.equal(classifyItem25dArchetype(ITEMS.jade_guardian_talisman), 'charm')
  assert.equal(classifyItem25dArchetype(ITEMS.red_potion), 'potion')
  assert.equal(classifyItem25dArchetype(ITEMS.return_scroll), 'scroll')
  assert.equal(classifyItem25dArchetype(ITEMS.vip_card_7d), 'ticket')
  assert.equal(classifyItem25dArchetype(ITEMS.imperial_gold_key), 'key')
  assert.equal(classifyItem25dArchetype(ITEMS.ore_mythril), 'ore')
  assert.equal(classifyItem25dArchetype(ITEMS.fish_golden), 'fish')
})

test('rasterizeItem25dRgba64 renders non-empty shaded 64x64 transparent RGBA art', () => {
  const sampleIds = [
    'red_potion',
    'short_sword',
    'dragon_armor',
    'weapon_001',
    'weapon_005',
    'weapon_015',
    'ruby_warrior_ring',
    'pawchemist_molotov_flask',
    'imperial_gold_key',
    'enhance_stone',
  ]

  for (const id of sampleIds) {
    const def = ITEMS[id]
    assert.ok(def, `Missing item ${id}`)
    const spec = buildItem25dVisualSpec(def)
    const rgba = rasterizeItem25dRgba64(spec)
    assert.equal(rgba.length, 64 * 64 * 4)

    let opaqueCount = 0
    let transparentCount = 0
    const lumValues = new Set<number>()

    for (let i = 0; i < rgba.length; i += 4) {
      const a = rgba[i + 3]
      if (a === 0) {
        transparentCount++
      } else {
        opaqueCount++
        if (a > 180) {
          const lum = Math.round((rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114) / 16)
          lumValues.add(lum)
        }
      }
    }

    assert.ok(opaqueCount >= 180, `Expected substantial artwork silhouette for ${id}, got ${opaqueCount}`)
    assert.ok(transparentCount >= 400, `Expected transparent backdrop around ${id}, got ${transparentCount}`)
    assert.ok(lumValues.size >= 4, `Expected multi-tone 2.5D shading gradients for ${id}, got ${lumValues.size} tones`)
  }
})

test('renderSkillIconBmpDataUrl generates crisp 72x72 2.5D beveled BMP data URLs', () => {
  const url = renderSkillIconBmpDataUrl('heavy_cleave', '#f97316', '#fde047')
  assert.ok(url.startsWith('data:image/bmp;base64,'))
  const raw = Buffer.from(url.slice('data:image/bmp;base64,'.length), 'base64')
  assert.equal(raw.readInt32LE(18), 72)
  assert.equal(raw.readInt32LE(22), 72)
})
