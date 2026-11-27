import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  drawCharacterFashionLayers,
  getFashionRenderSignature,
  hasWearableFashionLoadout,
  resolveFashionLoadoutFromSave,
  resolveFashionSheetCoords,
  resolveWingFollowMotion,
  type FashionLoadout,
} from './fashion-renderer'
import { PREMIUM_FASHION_ITEMS } from './premium/fashion-pet'

test('fashion render signature tracks all wearable fashion slots and animation buckets', () => {
  const nonWingOnly: FashionLoadout = {
    hat: 'aurora_cat_hood',
    hair: 'hair_crimson_spike',
    costume: 'costume_royal_knight',
    pants: 'pants_knight_greaves',
    shoes: 'shoes_royal_greaves',
    wings: null,
    back: 'back_crimson_cape',
    accessory: 'acc_crimson_scarf',
    aura: 'sunfire_aura',
    weaponSkin: 'wskin_starlight',
    mountAppearance: 'mount_skin_astral',
  }

  const sigNonWing = getFashionRenderSignature(nonWingOnly, 1.25)
  assert.ok(sigNonWing.includes('hat:aurora_cat_hood@'))
  assert.ok(sigNonWing.includes('hair:hair_crimson_spike@'))
  assert.ok(sigNonWing.includes('costume:costume_royal_knight@'))
  assert.ok(sigNonWing.includes('pants:pants_knight_greaves@'))
  assert.ok(sigNonWing.includes('shoes:shoes_royal_greaves@'))
  assert.ok(sigNonWing.includes('back:back_crimson_cape@'))
  assert.ok(sigNonWing.includes('accessory:acc_crimson_scarf@'))
  assert.ok(sigNonWing.includes('aura:sunfire_aura@'))

  const emptySig = getFashionRenderSignature({}, 1.25)
  assert.equal(emptySig, '')
  assert.equal(hasWearableFashionLoadout(nonWingOnly), true)
  assert.equal(hasWearableFashionLoadout({ weaponSkin: 'wskin_starlight' }), false)

  const withWings: FashionLoadout = {
    ...nonWingOnly,
    wings: 'wing_drv_45947e7e',
  }
  const sigWithAll = getFashionRenderSignature(withWings, 1.25)
  assert.ok(sigWithAll.includes('wings:wing_drv_45947e7e@'))
})

test('resolveFashionSheetCoords aligns 6x32 synchronized fashion atlas cells with hero frames', () => {
  const idleDown0 = resolveFashionSheetCoords('idle', 'down', 0)
  assert.deepEqual(idleDown0, { row: 0, col: 0, sx: 0, sy: 0, sw: 168, sh: 192 })

  const idleBlink = resolveFashionSheetCoords('idle', 'down', -1)
  assert.deepEqual(idleBlink, { row: 0, col: 2, sx: 336, sy: 0, sw: 168, sh: 192 })

  // Walk is animIndex 1 -> rows 4..7 ('down', 'up', 'left', 'right')
  const walkLeft3 = resolveFashionSheetCoords('walk', 'left', 3)
  assert.equal(walkLeft3.row, 6)
  assert.equal(walkLeft3.col, 3)
  assert.equal(walkLeft3.sx, 3 * 168)
  assert.equal(walkLeft3.sy, 6 * 192)

  // Victory is animIndex 7 -> rows 28..31 ('down', 'up', 'left', 'right')
  const victoryRight4 = resolveFashionSheetCoords('victory', 'right', 4)
  assert.equal(victoryRight4.row, 31)
  assert.equal(victoryRight4.col, 4)
})

test('resolveFashionLoadoutFromSave preserves full equipped state and themed fashion sheets exist on disk', () => {
  const loadout = resolveFashionLoadoutFromSave({
    equippedGemFashion: 'aurora_cat_hood',
    extV2: {
      equippedWing: 'wing_anim_inferno_phoenix',
      equippedWeaponSkin: 'wskin_void',
    },
    premium: {
      fashion: {
        unlockedIds: ['costume_royal_knight', 'wing_anim_inferno_phoenix', 'costume_neko_suit'],
        equipped: {
          hat: 'hat_valkyrie_crown',
          hair: 'hair_silver_lunar',
          costume: 'costume_royal_knight',
          pants: null,
          shoes: null,
          wings: 'wing_anim_inferno_phoenix',
          back: 'back_astral_ring',
          accessory: 'acc_fox_mask',
          aura: 'aura_celestial_gold',
          weaponSkin: 'wskin_void',
          mountAppearance: 'mount_skin_inferno',
        },
      },
    },
  })

  assert.equal(loadout.costume, 'costume_royal_knight')
  assert.equal(loadout.hat, 'hat_valkyrie_crown')
  assert.equal(loadout.wings, 'wing_anim_inferno_phoenix')

  // Verify every layered fashion item has both its 6x32 sheet and icon on disk
  for (const item of PREMIUM_FASHION_ITEMS) {
    if (item.layerSheetAsset) {
      const layerDisk = path.join(process.cwd(), 'public', item.layerSheetAsset.replace(/^\/+/, ''))
      assert.ok(fs.existsSync(layerDisk), `missing layer sheet ${item.layerSheetAsset} for ${item.id}`)
      if (item.iconAsset) {
        const iconDisk = path.join(process.cwd(), 'public', item.iconAsset.replace(/^\/+/, ''))
        assert.ok(fs.existsSync(iconDisk), `missing icon ${item.iconAsset} for ${item.id}`)
      }
    }
  }

  // Without DOM Image, drawCharacterFashionLayers safely returns false
  const mockCtx = {
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    drawImage() {},
    globalAlpha: 1,
    imageSmoothingEnabled: true,
  } as unknown as CanvasRenderingContext2D

  assert.equal(
    drawCharacterFashionLayers({
      ctx: mockCtx,
      loadout,
      phase: 'overBody',
      dir: 'down',
      action: 'walk',
      frame: 1,
      dx: 0,
      dy: 0,
      dw: 48,
      dh: 48,
      timeSec: 0.5,
    }),
    false,
  )
})

test('resolveWingFollowMotion locks wings to character bob & lunge across walk, idle, attack, and skill', () => {
  const walk0A = resolveWingFollowMotion({ dir: 'down', action: 'walk', frame: 0, timeSec: 0.1 })
  const walk1A = resolveWingFollowMotion({ dir: 'down', action: 'walk', frame: 1, timeSec: 0.1 })
  const walk1B = resolveWingFollowMotion({ dir: 'down', action: 'walk', frame: 1, timeSec: 0.73 })
  const walk3 = resolveWingFollowMotion({ dir: 'down', action: 'walk', frame: 3, timeSec: 1.9 })

  assert.equal(walk0A.bobPx, 0)
  assert.equal(walk1A.bobPx, -4.5)
  assert.equal(walk1B.bobPx, -4.5)
  assert.equal(walk3.bobPx, -4.5)
  assert.equal(walk1A.anchorYFrac, walk1B.anchorYFrac)
  assert.ok(walk1A.anchorYFrac < walk0A.anchorYFrac)

  const atkRight = resolveWingFollowMotion({ dir: 'right', action: 'attack', frame: 2, timeSec: 0.2 })
  const atkLeft = resolveWingFollowMotion({ dir: 'left', action: 'attack', frame: 2, timeSec: 0.2 })
  const atkWindupRight = resolveWingFollowMotion({ dir: 'right', action: 'attack', frame: 0, timeSec: 0.2 })

  assert.equal(atkRight.lungePx, 13)
  assert.equal(atkLeft.lungePx, 13)
  assert.ok(atkRight.anchorXFrac > atkWindupRight.anchorXFrac)
  assert.ok(atkLeft.anchorXFrac < 0.5)

  const skillRight = resolveWingFollowMotion({ dir: 'right', action: 'skill', frame: 1, timeSec: 0.3 })
  assert.equal(skillRight.bobPx, -7)
  assert.equal(skillRight.lungePx, 4)
  assert.ok(skillRight.anchorYFrac < 0.49)
})

test('resolveWingFollowMotion mirrors left and right movements symmetrically with zero opposing drift', () => {
  const actions = ['idle', 'walk', 'attack', 'skill'] as const
  for (const action of actions) {
    for (let frame = 0; frame < 4; frame++) {
      const right = resolveWingFollowMotion({ dir: 'right', action, frame, timeSec: 0.42 })
      const left = resolveWingFollowMotion({ dir: 'left', action, frame, timeSec: 0.42 })

      assert.equal(right.flipX, false)
      assert.equal(left.flipX, true)
      assert.ok(Math.abs((right.anchorXFrac - 0.5) + (left.anchorXFrac - 0.5)) < 1e-9, `Mirror X failed for ${action}#${frame}`)
      assert.ok(Math.abs(right.anchorYFrac - left.anchorYFrac) < 1e-9, `Mirror Y failed for ${action}#${frame}`)
      assert.ok(Math.abs(right.tiltRad + left.tiltRad) < 1e-9, `Mirror tilt failed for ${action}#${frame}`)
      assert.equal(right.profileScaleX, left.profileScaleX)
      assert.equal(right.flapScaleX, left.flapScaleX)
      assert.equal(right.flapScaleY, left.flapScaleY)
    }
  }
})
