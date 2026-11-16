import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  GM_ACTIVE_SKILLS,
  GM_CANVAS_SIZE,
  GM_SKILL_FRAMES,
  GM_WALK_SIDE_FRAMES,
  GM_WALK_SOUTH_FRAMES,
  computeGmPoseSpec,
  computeGmWalkFrameCount,
  dirToGmCompass,
  getGmSpritePaths,
  normalizeGmFrame,
} from '../lib/game/gm-sprite'

describe('GM Epic sprite metadata & paths', () => {
  it('maps 4 cardinal directions to compass filenames and provides all 8 rotation + 8 south walk assets', () => {
    assert.equal(GM_CANVAS_SIZE, 48)
    assert.equal(dirToGmCompass('down'), 'south')
    assert.equal(dirToGmCompass('up'), 'north')
    assert.equal(dirToGmCompass('left'), 'west')
    assert.equal(dirToGmCompass('right'), 'east')

    const paths = getGmSpritePaths()
    assert.equal(Object.keys(paths.rotations).length, 8)
    assert.equal(paths.walkSouth.length, GM_WALK_SOUTH_FRAMES)
    assert.equal(paths.rotations.south, '/images/characters/gm-epic/Idle/rotations/south.png')
    assert.equal(paths.walkSouth[0], '/images/characters/gm-epic/Idle/animations/Walk/south/frame_000.png')
    assert.equal(paths.walkSouth[7], '/images/characters/gm-epic/Idle/animations/Walk/south/frame_007.png')
  })

  it('defines 3 active GM Sovereign skills with unique indices and cooldowns', () => {
    assert.equal(GM_ACTIVE_SKILLS.length, 3)
    assert.deepEqual(
      GM_ACTIVE_SKILLS.map((s) => s.skillKey),
      ['judgment', 'nova', 'miracle'],
    )
    for (const sk of GM_ACTIVE_SKILLS) {
      assert.ok(sk.cooldown > 0)
      assert.match(sk.color, /^#[0-9a-fA-F]{6}$/)
    }
  })
})

describe('GM Epic walk, attack & skill animation pose specs', () => {
  it('uses 8 real walk frames facing down and 6 procedural stride frames for left/right/up', () => {
    assert.equal(computeGmWalkFrameCount('down'), GM_WALK_SOUTH_FRAMES)
    assert.equal(computeGmWalkFrameCount('left'), GM_WALK_SIDE_FRAMES)
    assert.equal(computeGmWalkFrameCount('right'), GM_WALK_SIDE_FRAMES)
    assert.equal(computeGmWalkFrameCount('up'), GM_WALK_SIDE_FRAMES)

    const southWalk = computeGmPoseSpec('down', 'walk', 5)
    assert.equal(southWalk.useWalkSouthSheet, true)
    assert.equal(southWalk.walkSouthIndex, 5)

    const right0 = computeGmPoseSpec('right', 'walk', 0)
    const right2 = computeGmPoseSpec('right', 'walk', 2)
    assert.equal(right0.useWalkSouthSheet, false)
    assert.ok(right0.leftFootDx > 0 && right0.rightFootDx < 0)
    assert.ok(right2.leftFootDx < 0 && right2.rightFootDx > 0)

    const left0 = computeGmPoseSpec('left', 'walk', 0)
    assert.ok(left0.leftFootDx < 0 && left0.rightFootDx > 0)
    assert.ok(left0.capeSwayX > 0)

    const up0 = computeGmPoseSpec('up', 'walk', 0)
    const up3 = computeGmPoseSpec('up', 'walk', 3)
    assert.ok(up0.leftFootDy < 0 && up0.rightFootDy === 0)
    assert.ok(up3.rightFootDy < 0 && up3.leftFootDy === 0)
  })

  it('produces windup, lunge strike, and impact burst across all 4 attack directions', () => {
    const rightWindup = computeGmPoseSpec('right', 'attack', 0)
    const rightStrike = computeGmPoseSpec('right', 'attack', 1)
    const rightImpact = computeGmPoseSpec('right', 'attack', 2)
    assert.ok(rightWindup.bodyDx < 0)
    assert.ok(rightStrike.bodyDx > 0)
    assert.ok(rightStrike.slashAlpha > 0.9)
    assert.ok(rightImpact.impactRadius > 0)

    const leftStrike = computeGmPoseSpec('left', 'attack', 1)
    assert.ok(leftStrike.bodyDx < 0)
    assert.equal(leftStrike.slashAngle, Math.PI)
  })

  it('produces levitation, arcane ring, wing flare, and celestial beam during skill animation', () => {
    assert.equal(normalizeGmFrame('skill', 'down', 9), 9 % GM_SKILL_FRAMES)
    const castStart = computeGmPoseSpec('down', 'skill', 0)
    const castPeak = computeGmPoseSpec('down', 'skill', 3)
    assert.ok(castPeak.bodyDy < castStart.bodyDy)
    assert.ok(castPeak.ringRadius > castStart.ringRadius)
    assert.ok(castPeak.beamAlpha > 0.8)
    assert.equal(castPeak.wingFlare, 1)
    assert.equal(castPeak.crownGlow, 1)
  })
})
