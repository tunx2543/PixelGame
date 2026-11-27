import test from 'node:test'
import assert from 'node:assert/strict'
import {
  drawCharacterFashionLayers,
  getFashionRenderSignature,
  resolveFashionLoadoutFromSave,
  resolveWingFollowMotion,
  type FashionLoadout,
} from './fashion-renderer'

test('fashion render signature ignores all non-wing fashion slots and only tracks wings', () => {
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

  assert.equal(getFashionRenderSignature(nonWingOnly, 1.25), '')

  const withWings: FashionLoadout = {
    ...nonWingOnly,
    wings: 'wing_drv_45947e7e',
  }
  const wingsOnly: FashionLoadout = {
    wings: 'wing_drv_45947e7e',
  }

  const sigWithAll = getFashionRenderSignature(withWings, 1.25)
  const sigWingsOnly = getFashionRenderSignature(wingsOnly, 1.25)
  assert.ok(sigWithAll.startsWith('wings:wing_drv_45947e7e@'))
  assert.equal(sigWithAll, sigWingsOnly)
})

test('resolveFashionLoadoutFromSave preserves full equipped state while rendering skips non-wings', () => {
  const loadout = resolveFashionLoadoutFromSave({
    equippedGemFashion: 'aurora_cat_hood',
    extV2: {
      equippedWing: 'wing_anim_inferno_phoenix',
      equippedWeaponSkin: 'wskin_void',
    },
    premium: {
      fashion: {
        unlockedIds: ['costume_royal_knight', 'wing_anim_inferno_phoenix'],
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

  // Save loadout stays intact for Wardrobe UI slot controls
  assert.equal(loadout.costume, 'costume_royal_knight')
  assert.equal(loadout.hat, 'hat_valkyrie_crown')
  assert.equal(loadout.wings, 'wing_anim_inferno_phoenix')

  // Without DOM Image, drawCharacterFashionLayers safely returns false for non-wing phases too
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
  // Walk bounce: frame 1 & 3 lift character up by -4.5px; wings MUST move upward (smaller anchorYFrac),
  // regardless of wall-clock timeSec!
  const walk0A = resolveWingFollowMotion({ dir: 'down', action: 'walk', frame: 0, timeSec: 0.1 })
  const walk1A = resolveWingFollowMotion({ dir: 'down', action: 'walk', frame: 1, timeSec: 0.1 })
  const walk1B = resolveWingFollowMotion({ dir: 'down', action: 'walk', frame: 1, timeSec: 0.73 })
  const walk3 = resolveWingFollowMotion({ dir: 'down', action: 'walk', frame: 3, timeSec: 1.9 })

  assert.equal(walk0A.bobPx, 0)
  assert.equal(walk1A.bobPx, -4.5)
  assert.equal(walk1B.bobPx, -4.5)
  assert.equal(walk3.bobPx, -4.5)
  assert.equal(walk1A.anchorYFrac, walk1B.anchorYFrac, 'Wing Y anchor must not drift counter to character walk bob')
  assert.ok(walk1A.anchorYFrac < walk0A.anchorYFrac, 'Wing anchor must rise when character bounces upward')

  // Attack lunge: frame 2 lunges +13px along facing direction
  const atkRight = resolveWingFollowMotion({ dir: 'right', action: 'attack', frame: 2, timeSec: 0.2 })
  const atkLeft = resolveWingFollowMotion({ dir: 'left', action: 'attack', frame: 2, timeSec: 0.2 })
  const atkWindupRight = resolveWingFollowMotion({ dir: 'right', action: 'attack', frame: 0, timeSec: 0.2 })

  assert.equal(atkRight.lungePx, 13)
  assert.equal(atkLeft.lungePx, 13)
  assert.ok(atkRight.anchorXFrac > atkWindupRight.anchorXFrac, 'Right attack lunge must carry wings rightward (+x)')
  assert.ok(atkLeft.anchorXFrac < 0.5, 'Left attack lunge must carry wings leftward (-x)')

  // Skill leap: frame 1 lifts -7px and lunges +4px
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
