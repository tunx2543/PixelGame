import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  WING_GACHA_ALL_WING_IDS,
  WING_GACHA_POOL,
  executeWingGachaBatch,
  getWingDuplicateReward,
  getWingGachaCost,
  rollSingleWingGacha,
} from './wing-gacha'
import { createDefaultFashionState, getFashionItemDef, sanitizeFashionState } from './premium/fashion-pet'

function readPngDimensions(absPath: string): { width: number; height: number; colorType: number } {
  const buf = fs.readFileSync(absPath)
  assert.ok(buf.length >= 26, `PNG too small: ${absPath}`)
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `Invalid PNG signature: ${absPath}`)
  assert.equal(buf.subarray(12, 16).toString('ascii'), 'IHDR', `Missing IHDR: ${absPath}`)
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colorType: buf[25],
  }
}

test('WING_GACHA_POOL covers all 23 wings with unique IDs and exact 100% rate sum', () => {
  assert.equal(WING_GACHA_ALL_WING_IDS.length, 23, 'Expected 23 total wing fashion items')
  assert.equal(WING_GACHA_POOL.length, 23, 'Expected all 23 wings in WING_GACHA_POOL')

  const poolIds = WING_GACHA_POOL.map((e) => e.fashionId)
  assert.equal(new Set(poolIds).size, 23, 'Duplicate wing IDs found in WING_GACHA_POOL')
  assert.deepEqual([...poolIds].sort(), [...WING_GACHA_ALL_WING_IDS].sort())

  const sumRate = WING_GACHA_POOL.reduce((acc, entry) => acc + entry.rate, 0)
  assert.ok(Math.abs(sumRate - 100) < 1e-6, `Expected total gacha rate 100, got ${sumRate}`)
})

test('every wing in WING_GACHA_POOL has valid image assets on disk', () => {
  const publicDir = path.resolve(process.cwd(), 'public')
  for (const entry of WING_GACHA_POOL) {
    const def = entry.def
    const iconPath = path.join(publicDir, def.iconAsset.replace(/^\//, ''))
    assert.ok(fs.existsSync(iconPath), `Missing wing icon asset: ${iconPath}`)

    if (def.wingAnimSheetAsset) {
      const sheetPath = path.join(publicDir, def.wingAnimSheetAsset.replace(/^\//, ''))
      assert.ok(fs.existsSync(sheetPath), `Missing wing animated sheet: ${sheetPath}`)
      const hdr = readPngDimensions(sheetPath)
      assert.equal(hdr.colorType, 6, `Expected RGBA sheet for ${def.id}`)
      assert.equal(hdr.height, 64, `Expected 64px frame height for ${def.id}`)
      assert.equal(hdr.width, 64 * (def.wingAnimFrames ?? 16), `Expected 1024px sheet width for ${def.id}`)
    } else if (def.wingSpriteAsset) {
      const spritePath = path.join(publicDir, def.wingSpriteAsset.replace(/^\//, ''))
      assert.ok(fs.existsSync(spritePath), `Missing wing sprite asset: ${spritePath}`)
      const hdr = readPngDimensions(spritePath)
      assert.equal(hdr.colorType, 6, `Expected RGBA sprite for ${def.id}`)
    } else {
      assert.ok(def.layerSheetAsset, `Expected layerSheetAsset fallback for ${def.id}`)
    }
  }
})

test('rollSingleWingGacha hits lower and upper cumulative probability boundaries', () => {
  const first = rollSingleWingGacha(() => 0)
  assert.equal(first.fashionId, WING_GACHA_POOL[0].fashionId)

  const last = rollSingleWingGacha(() => 0.9999999)
  assert.equal(last.fashionId, WING_GACHA_POOL[WING_GACHA_POOL.length - 1].fashionId)
  assert.equal(last.fashionId, 'wing_anim_inferno_phoenix')
})

test('executeWingGachaBatch enforces currency cost, unlocks wings, converts duplicates, and unlocks VIP wing bypass', () => {
  assert.equal(getWingGachaCost('gold', 1), 500)
  assert.equal(getWingGachaCost('gold', 5), 2250)
  assert.equal(getWingGachaCost('diamond', 1), 15)
  assert.equal(getWingGachaCost('diamond', 5), 68)

  const failGold = executeWingGachaBatch({
    gold: 499,
    diamonds: 100,
    unlockedIds: [],
    gachaUnlockedIds: [],
    currency: 'gold',
    count: 1,
  })
  assert.equal(failGold.ok, false)
  assert.equal(failGold.nextGold, 499)

  const failDia = executeWingGachaBatch({
    gold: 5000,
    diamonds: 67,
    unlockedIds: [],
    gachaUnlockedIds: [],
    currency: 'diamond',
    count: 5,
  })
  assert.equal(failDia.ok, false)
  assert.equal(failDia.nextDiamonds, 67)

  // Roll twice hitting wing_vip_platinum (rate cursor ~97%) — first unlock, second duplicate
  const seq = [0.97, 0.97]
  let idx = 0
  const firstPull = executeWingGachaBatch({
    gold: 1000,
    diamonds: 0,
    unlockedIds: [],
    gachaUnlockedIds: [],
    currency: 'gold',
    count: 1,
    rng: () => seq[idx++],
  })
  assert.equal(firstPull.ok, true)
  assert.equal(firstPull.nextGold, 500)
  assert.equal(firstPull.results[0].fashionId, 'wing_vip_platinum')
  assert.equal(firstPull.results[0].isNew, true)
  assert.ok(firstPull.gachaUnlockedIds.includes('wing_vip_platinum'))

  // VIP wing unlocked via gacha preserves gachaUnlockedIds across sanitizeFashionState
  const sanitized = sanitizeFashionState({
    ...createDefaultFashionState(),
    unlockedIds: firstPull.unlockedIds,
    gachaUnlockedIds: firstPull.gachaUnlockedIds,
  })
  assert.ok(sanitized.gachaUnlockedIds.includes('wing_vip_platinum'))
  const vipWing = getFashionItemDef('wing_vip_platinum')
  assert.ok(vipWing && (vipWing.vipRequired ?? 0) > 0)

  const secondPull = executeWingGachaBatch({
    gold: firstPull.nextGold,
    diamonds: 68,
    unlockedIds: firstPull.unlockedIds,
    gachaUnlockedIds: firstPull.gachaUnlockedIds,
    currency: 'gold',
    count: 1,
    rng: () => 0.97,
  })
  const expectedDup = getWingDuplicateReward('มายา')
  assert.equal(secondPull.ok, true)
  assert.equal(secondPull.results[0].isNew, false)
  assert.equal(secondPull.totalDuplicateGold, expectedDup.gold)
  assert.equal(secondPull.totalDuplicateStones, expectedDup.enhanceStones)
  assert.equal(secondPull.nextGold, 500 - 500 + expectedDup.gold)
})
