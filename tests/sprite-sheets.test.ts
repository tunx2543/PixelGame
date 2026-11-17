import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { JOBS, MONSTERS } from '../lib/game/data'
import {
  HERO_SPRITE_SHEETS,
  JOB_TO_HERO_SHEET,
  MONSTER_ID_TO_SHEET,
  MONSTER_SPRITE_SHEETS,
  resolveHeroSheetSpec,
  resolveMonsterSheetSpec,
  type SpriteSheetSpec,
} from '../lib/game/sprite-sheets'

function readPngMetadata(filePath: string) {
  const buf = fs.readFileSync(filePath)
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `Not a valid PNG: ${filePath}`)
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = -1
  const idatChunks: Buffer[] = []

  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset)
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii')
    const data = buf.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') {
      idatChunks.push(data)
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + length
  }

  // Decode scanline 0 & scanline height-1 alpha bytes to verify real transparency
  assert.equal(colorType, 6, `PNG must be 32-bit RGBA (colorType=6), got ${colorType}: ${filePath}`)
  assert.equal(bitDepth, 8, `PNG must be 8-bit per channel: ${filePath}`)

  const raw = zlib.inflateSync(Buffer.concat(idatChunks))
  const bpp = 4
  const stride = width * bpp
  const recon = Buffer.alloc(height * stride)

  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c
    const pa = Math.abs(p - a)
    const pb = Math.abs(p - b)
    const pc = Math.abs(p - c)
    if (pa <= pb && pa <= pc) return a
    if (pb <= pc) return b
    return c
  }

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const rowStart = y * (stride + 1) + 1
    const dstStart = y * stride
    for (let i = 0; i < stride; i++) {
      const x = raw[rowStart + i]
      const a = i >= bpp ? recon[dstStart + i - bpp] : 0
      const b = y > 0 ? recon[(y - 1) * stride + i] : 0
      const c = y > 0 && i >= bpp ? recon[(y - 1) * stride + i - bpp] : 0
      let val = x
      if (filter === 1) val = (x + a) & 0xff
      else if (filter === 2) val = (x + b) & 0xff
      else if (filter === 3) val = (x + ((a + b) >> 1)) & 0xff
      else if (filter === 4) val = (x + paeth(a, b, c)) & 0xff
      recon[dstStart + i] = val
    }
  }

  const cornerAlphas = [
    recon[3],
    recon[(width - 1) * 4 + 3],
    recon[(height - 1) * stride + 3],
    recon[(height - 1) * stride + (width - 1) * 4 + 3],
  ]

  let opaqueCount = 0
  let transparentCount = 0
  for (let i = 3; i < recon.length; i += 4) {
    if (recon[i] === 0) transparentCount++
    else if (recon[i] > 128) opaqueCount++
  }

  return { width, height, colorType, cornerAlphas, opaqueCount, transparentCount }
}

function assertValidSheetSpec(spec: SpriteSheetSpec) {
  assert.ok(
    !spec.sheetPath.includes('file_000000005be88211b0406297a567b61e'),
    `Must never point directly to raw reference image: ${spec.sheetPath}`,
  )
  const sheetFile = path.join(process.cwd(), 'public', spec.sheetPath.replace(/^\//, ''))
  const portraitFile = path.join(process.cwd(), 'public', spec.portraitPath.replace(/^\//, ''))
  assert.equal(fs.existsSync(sheetFile), true, `Missing sheet PNG: ${sheetFile}`)
  assert.equal(fs.existsSync(portraitFile), true, `Missing portrait PNG: ${portraitFile}`)

  const meta = readPngMetadata(sheetFile)
  assert.equal(meta.width, spec.frameWidth * spec.cols, `Width mismatch for ${spec.id}`)
  assert.equal(meta.height, spec.frameHeight * spec.rows, `Height mismatch for ${spec.id}`)
  assert.deepEqual(meta.cornerAlphas, [0, 0, 0, 0], `Sheet corners must be transparent (alpha=0): ${spec.id}`)
  assert.ok(meta.transparentCount > meta.opaqueCount * 0.25, `Sheet must have transparent background: ${spec.id}`)
  assert.ok(meta.opaqueCount > 200, `Sheet must contain non-empty sprite pixels: ${spec.id}`)

  const pMeta = readPngMetadata(portraitFile)
  assert.equal(pMeta.colorType, 6)
  assert.ok(pMeta.transparentCount > 50, `Portrait must have transparent background: ${spec.id}`)
  assert.ok(pMeta.opaqueCount > 200, `Portrait must contain sprite artwork: ${spec.id}`)

  assert.equal(spec.anchorX, 0.5, `Expected bottom-center horizontal anchor for ${spec.id}`)
  assert.ok(spec.anchorY >= 0.85 && spec.anchorY <= 0.98, `Expected foot-baseline anchorY in [0.85..0.98], got ${spec.anchorY}`)
}

describe('HD Transparent Sprite Sheets & Anchors', () => {
  it('provides real RGBA transparent PNG sprite sheets and 4-dir + attack + skill frames for all 5 hero classes', () => {
    const heroIds = Object.keys(HERO_SPRITE_SHEETS) as Array<keyof typeof HERO_SPRITE_SHEETS>
    assert.deepEqual(heroIds.sort(), ['archer', 'priest', 'rogue', 'warrior', 'wizard'])

    for (const id of heroIds) {
      const spec = HERO_SPRITE_SHEETS[id]
      assertValidSheetSpec(spec)
      for (const reqAction of ['walk_down', 'walk_left', 'walk_right', 'walk_up', 'attack', 'skill']) {
        assert.ok(spec.actions[reqAction], `Hero ${id} missing required action ${reqAction}`)
        assert.equal(spec.actions[reqAction].frames, 4)
      }
      assert.equal(spec.individualFrames?.length, 24)
      for (const fPath of spec.individualFrames ?? []) {
        const fullPath = path.join(process.cwd(), 'public', fPath.replace(/^\//, ''))
        assert.equal(fs.existsSync(fullPath), true, `Missing individual frame PNG: ${fPath}`)
      }
    }
  })

  it('provides real RGBA transparent PNG sprite sheets for all 15 extracted monsters and bosses', () => {
    const monsterSheetIds = Object.keys(MONSTER_SPRITE_SHEETS) as Array<keyof typeof MONSTER_SPRITE_SHEETS>
    assert.equal(monsterSheetIds.length, 15)

    for (const id of monsterSheetIds) {
      const spec = MONSTER_SPRITE_SHEETS[id]
      assertValidSheetSpec(spec)
      assert.ok(spec.actions.walk_left)
      assert.ok(spec.actions.walk_right)
      assert.ok(spec.actions.attack)
    }
  })

  it('maps every job in JOBS (21/21) and every monster in MONSTERS (17/17) consistently', () => {
    for (const jobId of Object.keys(JOBS)) {
      assert.ok(JOB_TO_HERO_SHEET[jobId], `Missing hero sheet mapping for job ${jobId}`)
      const spec = resolveHeroSheetSpec(jobId)
      assert.ok(spec, `resolveHeroSheetSpec failed for ${jobId}`)
    }

    for (const monsterId of Object.keys(MONSTERS)) {
      assert.equal(monsterId in MONSTER_ID_TO_SHEET, true, `Monster ${monsterId} missing from MONSTER_ID_TO_SHEET`)
      const spec = resolveMonsterSheetSpec(monsterId, MONSTERS[monsterId].sprite)
      if (MONSTER_ID_TO_SHEET[monsterId] !== null) {
        assert.ok(spec, `Expected non-null sheet spec for ${monsterId}`)
      } else {
        assert.equal(spec, null)
      }
    }
  })
})
