import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { JOBS } from './data'
import { getJobModelSpec } from './models-2d'
import {
  HERO_ANIMATION_DEFS,
  HERO_SPRITE_SHEETS,
  type HeroSheetId,
  getHeroSheetFrameSpec,
} from './sprite-sheets'

const EXPECTED_HERO_IDS: HeroSheetId[] = [
  'novice',
  'swordsman',
  'mage',
  'archer',
  'cleric',
  'merchant',
  'thief',
  'kensei',
  'iron_fist',
  'wicked_necromancer',
  'the_king',
  'sinister',
  'templar',
  'nekobaku',
  'mamushi',
]

const EXPECTED_DIRS = ['down', 'up', 'left', 'right'] as const

test('all 15 player classes have valid 32x6 HD sprite sheet specs, individual frames, and metadata', () => {
  assert.deepEqual(Object.keys(HERO_SPRITE_SHEETS).sort(), [...EXPECTED_HERO_IDS].sort())
  assert.deepEqual(Object.keys(JOBS).sort(), [...EXPECTED_HERO_IDS].sort())

  for (const id of EXPECTED_HERO_IDS) {
    const spec = HERO_SPRITE_SHEETS[id]
    const jobModel = getJobModelSpec(id)
    assert.equal(spec.frameWidth, 168, `${id} frameWidth`)
    assert.equal(spec.frameHeight, 192, `${id} frameHeight`)
    assert.equal(spec.cols, 6, `${id} cols`)
    assert.equal(spec.rows, 32, `${id} rows`)
    assert.equal(spec.individualFrames?.length, 160, `${id} individual frame count (40 poses x 4 dirs)`)

    // Verify JobModelSpec animation frame counts match HERO_ANIMATION_DEFS
    for (const animDef of HERO_ANIMATION_DEFS) {
      assert.equal(
        jobModel.animationFrames[animDef.name],
        animDef.frames,
        `${id} JobModelSpec ${animDef.name} frame count`,
      )
      for (const dir of EXPECTED_DIRS) {
        const rowSpec = spec.actions[`${animDef.name}_${dir}`]
        assert.ok(rowSpec, `missing row ${animDef.name}_${dir} for ${id}`)
        assert.equal(rowSpec.frames, animDef.frames, `${id} ${animDef.name}_${dir} frames`)
      }
    }

    // Verify disk artifacts exist for sheet, body_sheet, portrait, and metadata
    const dirPath = path.join(process.cwd(), 'public', 'assets', 'hd', 'characters', id)
    for (const requiredFile of ['sheet.png', 'body_sheet.png', 'portrait.png', 'metadata.json']) {
      assert.ok(fs.existsSync(path.join(dirPath, requiredFile)), `missing ${requiredFile} for ${id}`)
    }
    const metadata = JSON.parse(fs.readFileSync(path.join(dirPath, 'metadata.json'), 'utf8'))
    assert.equal(metadata.jobId, id)
    assert.equal(metadata.frameWidth, 168)
    assert.equal(metadata.frameHeight, 192)
    assert.equal(metadata.cols, 6)
    assert.equal(metadata.rows, 32)
    assert.ok(metadata.handSockets && metadata.headSockets, `${id} metadata sockets`)

    // Verify all 160 split frame PNGs exist on disk
    for (const relFrame of spec.individualFrames ?? []) {
      const diskPath = path.join(process.cwd(), 'public', relFrame.replace(/^\/+/, ''))
      assert.ok(fs.existsSync(diskPath), `missing split frame ${relFrame}`)
    }
  }
})

test('getHeroSheetFrameSpec resolves dedicated directional rows without horizontal flip and supports blink', () => {
  const prevImage = globalThis.Image
  class MockImage {
    complete = true
    naturalWidth = 1008
    naturalHeight = 6144
    src = ''
  }
  ;(globalThis as unknown as { Image: typeof MockImage }).Image = MockImage

  try {
    for (const dir of EXPECTED_DIRS) {
      for (const animDef of HERO_ANIMATION_DEFS) {
        const lastFrame = animDef.frames - 1
        const drawSpec = getHeroSheetFrameSpec('swordsman', dir, animDef.name, lastFrame)
        assert.ok(drawSpec, `drawSpec for ${animDef.name} ${dir}`)
        assert.equal(drawSpec.flipX, false, `${animDef.name} ${dir} must never mirror-flip`)
        assert.equal(drawSpec.sw, 168)
        assert.equal(drawSpec.sh, 192)
        assert.equal(drawSpec.sx, lastFrame * 168)
      }
    }

    // Negative frame (-1) during idle triggers blink frame (col 2)
    const blinkSpec = getHeroSheetFrameSpec('novice', 'down', 'idle', -1)
    assert.ok(blinkSpec)
    assert.equal(blinkSpec.sx, 2 * 168)
    assert.equal(blinkSpec.sy, 0)
  } finally {
    if (prevImage) {
      ;(globalThis as unknown as { Image: typeof prevImage }).Image = prevImage
    } else {
      delete (globalThis as unknown as { Image?: unknown }).Image
    }
  }
})
