import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ITEMS, JOBS, JOB_CLASS_META, SHOP_STOCK } from './data'
import { compareEquipmentItem } from './item-compare'
import { resolveItemImagePath } from './items'
import type { SaveData } from './engine'

const CANONICAL_15_JOBS = [
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
] as const

const PAWCHEMIST_FLASK_IDS = [
  'pawchemist_molotov_flask',
  'pawchemist_fizz_bomb',
  'pawchemist_crimson_flask',
  'pawchemist_blazing_bomb',
  'pawchemist_solar_bomb',
  'pawchemist_mythic_elixir',
] as const

function readPngHeader(absPath: string): { width: number; height: number; colorType: number } {
  const buf = fs.readFileSync(absPath)
  assert.ok(buf.length >= 26, `PNG too small: ${absPath}`)
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `Invalid PNG signature: ${absPath}`)
  assert.equal(buf.subarray(12, 16).toString('ascii'), 'IHDR', `Missing IHDR chunk: ${absPath}`)
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colorType: buf[25],
  }
}

function makePlayer(jobId: string, level = 100): SaveData {
  return {
    version: 1,
    name: 'TestHero',
    jobId,
    level,
    exp: 0,
    hp: 1000,
    mp: 300,
    gold: 10000,
    diamonds: 100,
    ownedGemItems: [],
    equippedGemFashion: null,
    equippedGemCompanion: null,
    lootMagnetUntil: 0,
    inventoryCapacityBonus: 0,
    inventory: [],
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
    x: 0,
    y: 0,
    gm: false,
    god: false,
    speed: 100,
    playTime: 0,
    kills: 0,
    savedAt: 1_700_000_000_000,
  }
}

test('all 15 canonical Job IDs exist in JOBS and JOB_CLASS_META', () => {
  for (const jobId of CANONICAL_15_JOBS) {
    assert.ok(JOBS[jobId], `Missing job in JOBS: ${jobId}`)
    assert.ok(JOB_CLASS_META[jobId], `Missing job in JOB_CLASS_META: ${jobId}`)
  }
  assert.deepEqual(JOBS.nekobaku.weaponTypes, ['bow', 'staff'])
})

test('all 6 Pawchemist bomb flasks use staff slot with allowedJobs=[nekobaku] and compareEquipmentItem respects job rules', () => {
  for (const id of PAWCHEMIST_FLASK_IDS) {
    const def = ITEMS[id]
    assert.ok(def, `Missing Pawchemist flask item: ${id}`)
    assert.equal(def.kind, 'weapon')
    assert.equal(def.weaponType, 'staff', `${id} must use weaponType 'staff'`)
    assert.deepEqual(def.allowedJobs, ['nekobaku'], `${id} must restrict allowedJobs to ['nekobaku']`)

    const nekoCmp = compareEquipmentItem({ itemId: id, plus: 0 }, makePlayer('nekobaku'))
    assert.equal(nekoCmp?.isCompatibleJob, true, `Pawchemist should be allowed to equip ${id}`)

    const thiefCmp = compareEquipmentItem({ itemId: id, plus: 0 }, makePlayer('thief'))
    assert.equal(thiefCmp?.isCompatibleJob, false, `Thief must NOT be allowed to equip ${id}`)

    const mageCmp = compareEquipmentItem({ itemId: id, plus: 0 }, makePlayer('mage'))
    assert.equal(mageCmp?.isCompatibleJob, false, `Mage must NOT be allowed to equip ${id}`)
  }
})

test('weapon catalog role alignment matches 15-job mapping rules', () => {
  assert.equal(ITEMS.weapon_022.weaponType, 'staff')
  assert.ok(ITEMS.grimcaller_occult_grimoire && ITEMS.grimcaller_occult_grimoire.weaponType === 'staff')
  assert.ok(ITEMS.arcanist_celestial_tome && ITEMS.arcanist_celestial_tome.weaponType === 'staff')

  // Swordsman weapons & shields (e.g. weapon_049, weapon_015) include vanguard/novice/merchant/kensei/iron_fist/templar/the_king
  assert.deepEqual(ITEMS.weapon_049.allowedJobs, [
    'novice',
    'swordsman',
    'merchant',
    'kensei',
    'iron_fist',
    'templar',
    'the_king',
  ])
  assert.deepEqual(ITEMS.weapon_015.allowedJobs, [
    'novice',
    'swordsman',
    'merchant',
    'kensei',
    'iron_fist',
    'templar',
    'the_king',
  ])

  // Archer bows allow windstalker, sinister, nekobaku, mamushi
  assert.deepEqual(ITEMS.weapon_023.allowedJobs, ['archer', 'sinister', 'nekobaku', 'mamushi'])

  // Thief daggers allow novice, thief, kensei, sinister, mamushi (NOT nekobaku)
  assert.deepEqual(ITEMS.weapon_032.allowedJobs, ['novice', 'thief', 'kensei', 'sinister', 'mamushi'])
  assert.equal(ITEMS.weapon_032.allowedJobs?.includes('nekobaku'), false)

  // Mage staves allow mage, cleric, wicked_necromancer, the_king, nekobaku
  assert.deepEqual(ITEMS.weapon_038.allowedJobs, [
    'mage',
    'cleric',
    'wicked_necromancer',
    'the_king',
    'nekobaku',
  ])

  // Shop stocks new Pawchemist & Grimcaller weapons
  assert.ok(SHOP_STOCK.includes('pawchemist_molotov_flask'))
  assert.ok(SHOP_STOCK.includes('pawchemist_fizz_bomb'))
  assert.ok(SHOP_STOCK.includes('grimcaller_occult_grimoire'))
})

test('all ITEMS resolve to existing 64x64 transparent RGBA PNG assets on disk', () => {
  const publicDir = path.resolve(process.cwd(), 'public')
  for (const [id, def] of Object.entries(ITEMS)) {
    const imgPath = resolveItemImagePath(def)
    assert.ok(imgPath.startsWith('/assets/items/'), `Invalid path for ${id}: ${imgPath}`)
    const diskPath = path.join(publicDir, imgPath.replace(/^\//, ''))
    assert.ok(fs.existsSync(diskPath), `Missing PNG on disk for ${id}: ${diskPath}`)
    const hdr = readPngHeader(diskPath)
    assert.equal(hdr.width, 64, `Expected 64px width for ${id}`)
    assert.equal(hdr.height, 64, `Expected 64px height for ${id}`)
    assert.equal(hdr.colorType, 6, `Expected RGBA colorType 6 for ${id}`)
  }
})
