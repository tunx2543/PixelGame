import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { JOBS, normalizeJobId } from './data'
import { getJobModelSpec } from './models-2d'
import {
  HERO_ANIMATION_DEFS,
  HERO_ASSET_REVISION,
  HERO_SPRITE_SHEETS,
  type HeroSheetId,
  clearSpriteSheetRuntimeCache,
  getHeroSheetFrameSpec,
  preloadAllHeroSheets,
  resolveHeroSheetSpec,
  withHeroAssetRevision,
} from './sprite-sheets'
import { jobHumanColors, resolveHumanDrawable } from './sprites'

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

function readPngDimensions(absPath: string): { width: number; height: number; colorType: number } {
  const buf = fs.readFileSync(absPath)
  assert.ok(buf.length >= 26, `PNG too small: ${absPath}`)
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `Invalid PNG header: ${absPath}`)
  assert.equal(buf.subarray(12, 16).toString('ascii'), 'IHDR', `Missing IHDR: ${absPath}`)
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colorType: buf[25],
  }
}

test('all 15 player classes have valid 32x6 HD sprite sheet specs, layered PNGs, individual frames, and metadata', () => {
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

    // Verify disk artifacts exist with exact 1008x6144 atlas & 168x192 portrait PNG dimensions
    const dirPath = path.join(process.cwd(), 'public', 'assets', 'hd', 'characters', id)
    for (const sheetFile of ['sheet.png', 'body_sheet.png', 'armor_sheet.png', 'hair_sheet.png', 'weapon_sheet.png']) {
      const sheetPath = path.join(dirPath, sheetFile)
      assert.ok(fs.existsSync(sheetPath), `missing ${sheetFile} for ${id}`)
      const dims = readPngDimensions(sheetPath)
      assert.equal(dims.width, 1008, `${id}/${sheetFile} width`)
      assert.equal(dims.height, 6144, `${id}/${sheetFile} height`)
      assert.equal(dims.colorType, 6, `${id}/${sheetFile} RGBA`)
    }

    const portraitPath = path.join(dirPath, 'portrait.png')
    assert.ok(fs.existsSync(portraitPath), `missing portrait.png for ${id}`)
    const portraitDims = readPngDimensions(portraitPath)
    assert.equal(portraitDims.width, 168, `${id}/portrait.png width`)
    assert.equal(portraitDims.height, 192, `${id}/portrait.png height`)

    assert.ok(fs.existsSync(path.join(dirPath, 'metadata.json')), `missing metadata.json for ${id}`)
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
  clearSpriteSheetRuntimeCache()
  class MockImage {
    complete = true
    naturalWidth = 1008
    naturalHeight = 6144
    src = ''
    decoding = 'async'
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
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
        assert.ok(
          drawSpec.image.src.includes(`v=${HERO_ASSET_REVISION}`),
          `expected revision query param on ${drawSpec.image.src}`,
        )
      }
    }

    // Negative frame (-1) during idle triggers blink frame (col 2)
    const blinkSpec = getHeroSheetFrameSpec('novice', 'down', 'idle', -1)
    assert.ok(blinkSpec)
    assert.equal(blinkSpec.sx, 2 * 168)
    assert.equal(blinkSpec.sy, 0)
  } finally {
    clearSpriteSheetRuntimeCache()
    if (prevImage) {
      ;(globalThis as unknown as { Image: typeof prevImage }).Image = prevImage
    } else {
      delete (globalThis as unknown as { Image?: unknown }).Image
    }
  }
})

test('resolveHumanDrawable enforces HD hero sheets across all 15 classes & aliases and never falls back to legacy Chibi', () => {
  const prevImage = globalThis.Image
  const prevDocument = globalThis.document
  let loadedFlag = false
  const createdUrls: string[] = []

  class MockAsyncImage {
    decoding = 'async'
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    private _src = ''
    get src() {
      return this._src
    }
    set src(value: string) {
      this._src = value
      createdUrls.push(value)
    }
    get complete() {
      return loadedFlag
    }
    get naturalWidth() {
      return loadedFlag ? 1008 : 0
    }
    get naturalHeight() {
      return loadedFlag ? 6144 : 0
    }
  }

  clearSpriteSheetRuntimeCache()
  ;(globalThis as unknown as { Image: typeof MockAsyncImage }).Image = MockAsyncImage
  ;(globalThis as unknown as { document: Record<string, unknown> }).document = {
    createElement: () => {
      throw new Error('Legacy canvas Chibi fallback should never execute for canonical 15 classes')
    },
  }

  try {
    // 1. Even while sheets are still asynchronously decoding, resolveHumanDrawable returns HD pending metadata (no legacy canvas!)
    for (const id of EXPECTED_HERO_IDS) {
      const job = JOBS[id]
      const drawable = resolveHumanDrawable(jobHumanColors(id, job.colors, false), 'down', 0, job.weaponTypes[0])
      assert.equal(drawable.width, 168)
      assert.equal(drawable.height, 192)
      assert.equal(drawable.hdScale, 4)
      assert.equal(drawable.sheetId, id)
      assert.equal(drawable.canvas, undefined)
    }

    // 2. Once images complete loading, all 15 classes & aliases resolve to sheetSpec with cache-busting revision
    loadedFlag = true
    preloadAllHeroSheets()
    for (const id of EXPECTED_HERO_IDS) {
      const job = JOBS[id]
      const drawable = resolveHumanDrawable(jobHumanColors(id, job.colors, false), 'down', 0, job.weaponTypes[0])
      assert.ok(drawable.sheetSpec, `expected sheetSpec for ${id}`)
      assert.equal(drawable.sheetId, id)
      assert.equal(drawable.canvas, undefined)
      assert.ok(drawable.sheetSpec.image.src.endsWith(`/assets/hd/characters/${id}/sheet.png?v=${HERO_ASSET_REVISION}`))
    }

    const aliasPairs: Array<[string, HeroSheetId]> = [
      ['wayfarer', 'novice'],
      ['vanguard', 'swordsman'],
      ['arcanist', 'mage'],
      ['windstalker', 'archer'],
      ['luminary', 'cleric'],
      ['goldweaver', 'merchant'],
      ['nightveil', 'thief'],
      ['shinkage', 'kensei'],
      ['titanfist', 'iron_fist'],
      ['grimcaller', 'wicked_necromancer'],
      ['high_sovereign', 'the_king'],
      ['dreadfang', 'sinister'],
      ['aegis_knight', 'templar'],
      ['pawchemist', 'nekobaku'],
      ['venomblade', 'mamushi'],
      ['knight', 'templar'],
      ['paladin', 'templar'],
      ['wizard', 'mage'],
      ['hunter', 'archer'],
      ['assassin', 'sinister'],
      ['gm', 'the_king'],
    ]
    for (const [alias, expected] of aliasPairs) {
      assert.equal(normalizeJobId(alias), expected, `normalizeJobId(${alias})`)
      assert.equal(resolveHeroSheetSpec(alias)?.id, expected, `resolveHeroSheetSpec(${alias})`)
    }

    assert.equal(
      withHeroAssetRevision('/assets/hd/characters/novice/sheet.png'),
      `/assets/hd/characters/novice/sheet.png?v=${HERO_ASSET_REVISION}`,
    )
    assert.ok(createdUrls.length >= 15)
  } finally {
    clearSpriteSheetRuntimeCache()
    if (prevImage) {
      ;(globalThis as unknown as { Image: typeof prevImage }).Image = prevImage
    } else {
      delete (globalThis as unknown as { Image?: unknown }).Image
    }
    if (prevDocument) {
      ;(globalThis as unknown as { document: typeof prevDocument }).document = prevDocument
    } else {
      delete (globalThis as unknown as { document?: unknown }).document
    }
  }
})

test('drawHeroDrawableWithFashion preserves canonical 15-class HD sprite sheet even when costume and hair fashion items are equipped', async () => {
  const { drawHeroDrawableWithFashion } = await import('./fashion-renderer')
  assert.notEqual(HERO_ASSET_REVISION, 'hd15-v1')

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

  const fakeImg = { complete: true, naturalWidth: 1008, naturalHeight: 6144 } as unknown as HTMLImageElement
  let baseCalled = 0

  drawHeroDrawableWithFashion({
    ctx: mockCtx,
    jobId: 'the_king',
    drawable: {
      width: 168,
      height: 192,
      hdScale: 4,
      sheetId: 'the_king',
      sheetSpec: {
        image: fakeImg,
        sx: 0,
        sy: 0,
        sw: 168,
        sh: 192,
        flipX: false,
        hdScale: 4,
        sheetId: 'the_king',
        anchorX: 0.5,
        anchorY: 178 / 192,
      },
    },
    loadout: {
      costume: 'costume_royal_knight',
      hair: 'hair_crimson_spike',
      hat: 'hat_valkyrie_crown',
      wings: 'wing_anim_inferno_phoenix',
    },
    dir: 'down',
    action: 'idle',
    frame: 0,
    dx: 0,
    dy: 0,
    dw: 48,
    dh: 55,
    drawBase: () => {
      baseCalled += 1
    },
  })

  assert.equal(baseCalled, 1)
})


