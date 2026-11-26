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
import { sanitizePremiumState } from './premium/wallet'
import { createDefaultExtV2, sanitizeExtV2 } from './extended-systems'
import { resolveFashionLoadoutFromRemote, resolveFashionLoadoutFromSave } from './fashion-renderer'

const REMOVED_WING_IDS = [
  'wing_seraph',
  'wing_ember',
  'wing_cosmos',
  'nebula_dragon_wings',
  'wing_vip_platinum',
  'wing_fairy_emerald',
  'wing_songkran',
  'wing_winter_star',
] as const

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

test('WING_GACHA_POOL contains only the 16 genuine sprite wings and sums to exact 100%', () => {
  assert.equal(WING_GACHA_ALL_WING_IDS.length, 16, 'Expected 16 total wing fashion items')
  assert.equal(WING_GACHA_POOL.length, 16, 'Expected all 16 wings in WING_GACHA_POOL')

  const poolIds = WING_GACHA_POOL.map((e) => e.fashionId)
  assert.equal(new Set(poolIds).size, 16, 'Duplicate wing IDs found in WING_GACHA_POOL')
  assert.deepEqual([...poolIds].sort(), [...WING_GACHA_ALL_WING_IDS].sort())

  for (const removedId of REMOVED_WING_IDS) {
    assert.equal(poolIds.includes(removedId), false, `Removed code-drawn wing must not be in pool: ${removedId}`)
    assert.equal(getFashionItemDef(removedId), null, `Removed code-drawn wing must not exist in fashion catalog: ${removedId}`)
  }

  const sumScaled = WING_GACHA_POOL.reduce((acc, entry) => acc + Math.round(entry.rate * 1000), 0)
  assert.equal(sumScaled, 100_000, `Expected exact 100.000% (100000 milli-percent), got ${sumScaled}`)

  const animWing = WING_GACHA_POOL.find((e) => e.fashionId === 'wing_anim_inferno_phoenix')
  assert.ok(animWing, 'Expected animated phoenix wing in pool')
  assert.equal(animWing.rarity, 'เทพ')
  assert.equal(animWing.rate, 0.001)
})

test('every wing in WING_GACHA_POOL uses a real PNG sprite or animated sprite sheet on disk', () => {
  const publicDir = path.resolve(process.cwd(), 'public')
  for (const entry of WING_GACHA_POOL) {
    const def = entry.def
    assert.ok(def.iconAsset, `Missing iconAsset for ${def.id}`)
    const iconPath = path.join(publicDir, def.iconAsset.replace(/^\//, ''))
    assert.ok(fs.existsSync(iconPath), `Missing wing icon asset: ${iconPath}`)

    assert.equal(def.layerSheetAsset, undefined, `Wing ${def.id} must not use legacy layerSheetAsset`)
    assert.equal(def.linkedLegacyCosmeticId, undefined, `Wing ${def.id} must not use legacy cosmetic vector fallback`)
    assert.equal(def.linkedGemItemId, undefined, `Wing ${def.id} must not use gem pixel fallback`)

    if (def.wingAnimSheetAsset) {
      const sheetPath = path.join(publicDir, def.wingAnimSheetAsset.replace(/^\//, ''))
      assert.ok(fs.existsSync(sheetPath), `Missing wing animated sheet: ${sheetPath}`)
      const hdr = readPngDimensions(sheetPath)
      assert.equal(hdr.colorType, 6, `Expected RGBA sheet for ${def.id}`)
      assert.equal(hdr.height, 64, `Expected 64px frame height for ${def.id}`)
      assert.equal(hdr.width, 64 * (def.wingAnimFrames ?? 16), `Expected 1024px sheet width for ${def.id}`)
    } else {
      assert.ok(def.wingSpriteAsset, `Expected real wingSpriteAsset PNG for ${def.id}`)
      const spritePath = path.join(publicDir, def.wingSpriteAsset.replace(/^\//, ''))
      assert.ok(fs.existsSync(spritePath), `Missing wing sprite asset: ${spritePath}`)
      const hdr = readPngDimensions(spritePath)
      assert.equal(hdr.colorType, 6, `Expected RGBA sprite for ${def.id}`)
    }
  }
})

test('rollSingleWingGacha hits lower, pre-god, and 0.001% god-tier boundaries accurately', () => {
  const first = rollSingleWingGacha(() => 0)
  assert.equal(first.fashionId, WING_GACHA_POOL[0].fashionId)

  const justBeforeGod = rollSingleWingGacha(() => 0.999989)
  assert.equal(justBeforeGod.fashionId, 'wing_drv_b1ab0813')
  assert.equal(justBeforeGod.rarity, 'มายา')

  const exactGodStart = rollSingleWingGacha(() => 0.99999)
  assert.equal(exactGodStart.fashionId, 'wing_anim_inferno_phoenix')
  assert.equal(exactGodStart.rarity, 'เทพ')

  const last = rollSingleWingGacha(() => 0.9999999)
  assert.equal(last.fashionId, 'wing_anim_inferno_phoenix')
})

test('executeWingGachaBatch enforces currency cost, unlocks wings, and converts duplicates including เทพ', () => {
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

  // Roll twice hitting wing_anim_inferno_phoenix (0.001% at >= 0.99999) — first unlock, second duplicate
  const seq = [0.999995, 0.999995]
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
  assert.equal(firstPull.results[0].fashionId, 'wing_anim_inferno_phoenix')
  assert.equal(firstPull.results[0].rarity, 'เทพ')
  assert.equal(firstPull.results[0].isNew, true)
  assert.ok(firstPull.gachaUnlockedIds.includes('wing_anim_inferno_phoenix'))

  const sanitized = sanitizeFashionState({
    ...createDefaultFashionState(),
    unlockedIds: firstPull.unlockedIds,
    gachaUnlockedIds: firstPull.gachaUnlockedIds,
  })
  assert.ok(sanitized.gachaUnlockedIds?.includes('wing_anim_inferno_phoenix'))

  const secondPull = executeWingGachaBatch({
    gold: firstPull.nextGold,
    diamonds: 68,
    unlockedIds: firstPull.unlockedIds,
    gachaUnlockedIds: firstPull.gachaUnlockedIds,
    currency: 'gold',
    count: 1,
    rng: () => 0.999995,
  })
  const expectedDup = getWingDuplicateReward('เทพ')
  assert.equal(expectedDup.gold, 25000)
  assert.equal(expectedDup.enhanceStones, 50)
  assert.equal(secondPull.ok, true)
  assert.equal(secondPull.results[0].isNew, false)
  assert.equal(secondPull.totalDuplicateGold, expectedDup.gold)
  assert.equal(secondPull.totalDuplicateStones, expectedDup.enhanceStones)
  assert.equal(secondPull.nextGold, 500 - 500 + expectedDup.gold)
})

test('legacy saves & remote presence with removed wings sanitize cleanly without errors', () => {
  const defaultExt = createDefaultExtV2()
  const legacyExt = sanitizeExtV2({
    ...defaultExt,
    unlockedCosmetics: [...REMOVED_WING_IDS, 'wskin_starlight', 'frame_royal'],
    equippedWing: 'wing_seraph',
    equippedWeaponSkin: 'wskin_starlight',
    loadouts: [
      {
        id: 'preset_1',
        name: 'OldWingSet',
        equipmentUids: {},
        wingId: 'wing_cosmos',
        weaponSkinId: 'wskin_starlight',
      },
    ],
  })

  for (const removedId of REMOVED_WING_IDS) {
    assert.equal(legacyExt.unlockedCosmetics.includes(removedId), false)
  }
  assert.equal(legacyExt.unlockedCosmetics.includes('frame_royal'), false)
  assert.equal('equippedFrame' in legacyExt, false)
  assert.equal(legacyExt.equippedWing, null)
  assert.equal(legacyExt.loadouts[0].wingId, null)
  assert.equal(legacyExt.equippedWeaponSkin, 'wskin_starlight')

  for (const removedId of REMOVED_WING_IDS) {
    const prem = sanitizePremiumState(
      {
        fashion: {
          unlockedIds: ['hat_adventurer_beret', removedId, 'wing_drv_a7582c8d'],
          gachaUnlockedIds: [removedId, 'wing_drv_a7582c8d'],
          equipped: {
            hat: null,
            hair: null,
            costume: null,
            pants: null,
            shoes: null,
            wings: removedId,
            back: null,
            accessory: null,
            aura: null,
            weaponSkin: null,
            mountAppearance: null,
          },
        },
      },
      {
        characterId: 'slot_1',
        diamonds: 100,
        ownedGemItems: ['nebula_dragon_wings', 'aurora_cat_hood'],
        equippedGemFashion: 'nebula_dragon_wings',
        unlockedCosmetics: [removedId],
        equippedWing: removedId,
      },
    )
    assert.equal(prem.fashion.unlockedIds.includes(removedId), false)
    assert.equal(prem.fashion.gachaUnlockedIds?.includes(removedId), false)
    assert.equal(prem.fashion.equipped.wings, null)
    assert.equal(prem.fashion.unlockedIds.includes('wing_drv_a7582c8d'), true)
  }

  // Even unsanitized direct objects passed to fashion-renderer resolve safely to null
  const unsanitizedLoadout = resolveFashionLoadoutFromSave({
    premium: {
      fashion: {
        unlockedIds: [],
        equipped: {
          hat: null,
          hair: null,
          costume: null,
          pants: null,
          shoes: null,
          wings: 'wing_seraph',
          back: null,
          accessory: null,
          aura: null,
          weaponSkin: null,
          mountAppearance: null,
        },
      },
    },
    equippedGemFashion: 'nebula_dragon_wings',
    extV2: { equippedWing: 'wing_winter_star' },
  })
  assert.equal(unsanitizedLoadout.wings, null)

  const remoteLoadout = resolveFashionLoadoutFromRemote({
    fashionWings: 'wing_vip_platinum',
    cosmeticWing: 'wing_songkran',
    gemFashionId: 'nebula_dragon_wings',
  })
  assert.equal(remoteLoadout.wings, null)

  const validLoadout = resolveFashionLoadoutFromSave({
    premium: {
      fashion: {
        unlockedIds: ['wing_anim_inferno_phoenix'],
        equipped: {
          hat: null,
          hair: null,
          costume: null,
          pants: null,
          shoes: null,
          wings: 'wing_anim_inferno_phoenix',
          back: null,
          accessory: null,
          aura: null,
          weaponSkin: null,
          mountAppearance: null,
        },
      },
    },
  })
  assert.equal(validLoadout.wings, 'wing_anim_inferno_phoenix')
})
