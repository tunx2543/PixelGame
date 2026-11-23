import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { after, beforeEach, describe, it } from 'node:test'
import {
  DEFAULT_SERVER_RATES,
  applyServerDropChance,
  clampServerMultiplier,
  formatServerRateSummary,
  getEffectiveServerRates,
  isServerRateBoostActive,
  sanitizeServerRates,
} from './server-rates'
import {
  GAME_VERSION,
  buildVersionPayload,
  compareSemver,
  mergeReleaseNotes,
  sanitizeReleaseNote,
} from './version'
import {
  createDefaultEncounterSave,
  rollEncounterForLevel,
  settleEncounterVictory,
} from './encounter'
import {
  deleteLivePatchNote,
  getMergedVersionPayload,
  resetPatchNotesMemoryCacheForTests,
  upsertLivePatchNote,
} from '../server/patch-notes-store'
import {
  claimRedeemCodeInStore,
  deleteRedeemCodeFromStore,
  listRedeemCodesFromStore,
  normalizeRedeemCode,
  resetRedeemStoreMemoryCacheForTests,
  toggleRedeemCodeInStore,
  upsertRedeemCodeInStore,
} from '../server/redeem-codes-store'
import {
  getEffectiveStoredServerRates,
  getPublicWorldEvents,
  resetGmEventsMemoryCacheForTests,
  setServerRates,
} from '../server/gm-events-store'

const PERSIST_FILES = [
  path.join(process.cwd(), '.data', 'patch-notes.json'),
  path.join(process.cwd(), '.data', 'redeem-codes.json'),
  path.join(process.cwd(), '.data', 'gm-events.json'),
  '/tmp/pixelquest-patch-notes.json',
  '/tmp/pixelquest-redeem-codes.json',
  '/tmp/pixelquest-gm-events.json',
]

const originalSnapshots = new Map<string, string | null>()
for (const filePath of PERSIST_FILES) {
  try {
    originalSnapshots.set(filePath, fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null)
  } catch {
    originalSnapshots.set(filePath, null)
  }
}

function clearStoreFilesForIsolation() {
  for (const filePath of PERSIST_FILES) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    } catch {
      // Ignore cleanup errors
    }
  }
  resetPatchNotesMemoryCacheForTests()
  resetRedeemStoreMemoryCacheForTests()
  resetGmEventsMemoryCacheForTests()
}

after(() => {
  for (const [filePath, prev] of originalSnapshots.entries()) {
    try {
      if (prev === null) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      } else {
        fs.mkdirSync(path.dirname(filePath), { recursive: true })
        fs.writeFileSync(filePath, prev, 'utf8')
      }
    } catch {
      // Ignore restore errors
    }
  }
  resetPatchNotesMemoryCacheForTests()
  resetRedeemStoreMemoryCacheForTests()
  resetGmEventsMemoryCacheForTests()
})

describe('server-rates helpers & store', () => {
  beforeEach(() => {
    clearStoreFilesForIsolation()
  })

  it('clamps multipliers within [1, 10] and rounds to 0.1', () => {
    assert.equal(clampServerMultiplier(0.2), 1)
    assert.equal(clampServerMultiplier(-5), 1)
    assert.equal(clampServerMultiplier('bad'), 1)
    assert.equal(clampServerMultiplier(2.56), 2.6)
    assert.equal(clampServerMultiplier(99), 10)
  })

  it('auto-expires temporary server boosts back to x1', () => {
    const active = sanitizeServerRates({
      expMultiplier: 3,
      dropMultiplier: 2,
      label: 'Weekend Boost',
      startedAtMs: 1_000,
      expiresAtMs: 5_000,
      updatedAtMs: 1_000,
      updatedByName: 'GMTUNX',
    })
    assert.equal(isServerRateBoostActive(active, 3_000), true)
    assert.equal(formatServerRateSummary(active, 3_000), 'EXP x3 · DROP x2 — Weekend Boost')

    const expired = getEffectiveServerRates(active, 6_000)
    assert.equal(expired.expMultiplier, DEFAULT_SERVER_RATES.expMultiplier)
    assert.equal(expired.dropMultiplier, DEFAULT_SERVER_RATES.dropMultiplier)
    assert.equal(isServerRateBoostActive(expired, 6_000), false)
  })

  it('caps boosted drop chance safely at 1.0', () => {
    assert.equal(applyServerDropChance(0.25, 2), 0.5)
    assert.equal(applyServerDropChance(0.45, 5), 1)
  })

  it('persists GM server rates and exposes them in public world events', () => {
    const saved = setServerRates({
      expMultiplier: 2.5,
      dropMultiplier: 3,
      label: 'Double Drop Night',
      startedAtMs: Date.now(),
      expiresAtMs: Date.now() + 30 * 60_000,
      updatedAtMs: Date.now(),
      updatedByName: 'GMTUNX',
    })
    assert.equal(saved.expMultiplier, 2.5)
    assert.equal(saved.dropMultiplier, 3)

    resetGmEventsMemoryCacheForTests()
    const reloaded = getEffectiveStoredServerRates()
    assert.equal(reloaded.expMultiplier, 2.5)
    assert.equal(reloaded.dropMultiplier, 3)

    const pub = getPublicWorldEvents(0)
    assert.equal(pub.serverRates.expMultiplier, 2.5)
    assert.equal(pub.serverRates.dropMultiplier, 3)
  })

  it('applies expMultiplier inside encounter settlement', () => {
    const baseSave = createDefaultEncounterSave('Tester')
    const enemy = rollEncounterForLevel(1, { forcedRarity: 'normal' })
    const res1x = settleEncounterVictory(baseSave, enemy, { expMultiplier: 1, dropMultiplier: 1 })
    const res3x = settleEncounterVictory(baseSave, enemy, { expMultiplier: 3, dropMultiplier: 1 })
    assert.equal(res3x.expEarned, res1x.expEarned * 3)
  })
})

describe('patch-notes live merge & store', () => {
  beforeEach(() => {
    clearStoreFilesForIsolation()
  })

  it('validates custom patch notes and sorts newest version first', () => {
    assert.equal(sanitizeReleaseNote({ version: 'invalid', title: 'x', updates: ['y'] }), null)
    assert.equal(sanitizeReleaseNote({ version: '1.4.3', title: 'Empty' }), null)

    const merged = mergeReleaseNotes([
      {
        version: '1.4.5',
        date: '2026-11-25',
        title: 'Holiday Event',
        updates: ['New boss'],
        improvements: [],
        bugFixes: [],
        highlights: [],
      },
    ])
    assert.equal(merged[0]?.version, '1.4.5')
    assert.equal(compareSemver(merged[0]!.version, GAME_VERSION), 1)
  })

  it('supports upserting, reloading, and deleting live patch notes', () => {
    const up = upsertLivePatchNote({
      version: '1.4.9',
      date: '2026-11-29',
      title: 'Live Hotfix',
      updates: ['เพิ่มโหมดพิเศษ'],
      improvements: [],
      bugFixes: ['แก้บั๊กเควส'],
    })
    assert.equal(up.ok, true)
    assert.equal(up.ok && up.payload.version, '1.4.9')

    resetPatchNotesMemoryCacheForTests()
    const reloaded = getMergedVersionPayload()
    assert.equal(reloaded.version, '1.4.9')
    assert.deepEqual(reloaded.customVersions, ['1.4.9'])

    const del = deleteLivePatchNote('1.4.9')
    assert.equal(del.ok, true)
    assert.equal(del.payload.version, GAME_VERSION)
    assert.deepEqual(buildVersionPayload([]).customVersions, [])
  })
})

describe('redeem-codes atomic store', () => {
  beforeEach(() => {
    clearStoreFilesForIsolation()
  })

  it('normalizes code strings and enforces atomic claims per account/guest', () => {
    assert.equal(normalizeRedeemCode(' pixel 2026! '), 'PIXEL2026')

    const created = upsertRedeemCodeInStore({
      code: 'pixel_hero',
      label: 'Launch Gift',
      diamonds: 100,
      gold: 5000,
      vipExp: 50,
      itemId: 'enhance_stone',
      qty: 5,
      plus: 0,
      maxUses: 2,
      expiresHours: 24,
      createdByUid: 'gm_uid_1',
    })
    assert.equal(created.ok, true)
    assert.equal(listRedeemCodesFromStore().length, 1)

    const claim1 = claimRedeemCodeInStore({
      code: 'PIXEL_HERO',
      claimKey: 'guest:device_aaa',
      uid: 'guest_device_aaa',
      authMode: 'guest_sandbox',
      characterId: 'slot_1',
      playerName: 'GuestOne',
      gameUid: '1001',
    })
    assert.equal(claim1.ok, true)
    if (claim1.ok) {
      assert.equal(claim1.record.usedCount, 1)
      assert.equal(claim1.record.diamonds, 100)
    }

    // Same guest cannot claim twice
    const dup = claimRedeemCodeInStore({
      code: 'PIXEL_HERO',
      claimKey: 'guest:device_aaa',
      uid: 'guest_device_aaa',
      authMode: 'guest_sandbox',
      characterId: 'slot_1',
      playerName: 'GuestOne',
      gameUid: '1001',
    })
    assert.equal(dup.ok, false)
    if (!dup.ok) {
      assert.equal(dup.code, 'already_claimed')
    }

    // Different user claims slot #2 (maxUses reached)
    const claim2 = claimRedeemCodeInStore({
      code: 'PIXEL_HERO',
      claimKey: 'fb:user_bbb',
      uid: 'user_bbb',
      authMode: 'firebase',
      characterId: 'slot_1',
      playerName: 'HeroTwo',
      gameUid: '1002',
    })
    assert.equal(claim2.ok, true)

    // Third user rejected as exhausted
    const exhausted = claimRedeemCodeInStore({
      code: 'PIXEL_HERO',
      claimKey: 'fb:user_ccc',
      uid: 'user_ccc',
      authMode: 'firebase',
      characterId: 'slot_1',
      playerName: 'HeroThree',
      gameUid: '1003',
    })
    assert.equal(exhausted.ok, false)
    if (!exhausted.ok) {
      assert.equal(exhausted.code, 'exhausted')
    }
  })

  it('rejects inactive, expired, and deleted codes', () => {
    upsertRedeemCodeInStore({
      code: 'TOGGLETEST',
      label: 'Toggle',
      gold: 1000,
      maxUses: 10,
      createdByUid: 'gm_1',
      nowMs: 10_000,
      expiresHours: 1,
    })

    const togOff = toggleRedeemCodeInStore('TOGGLETEST', false)
    assert.equal(togOff.ok, true)
    const claimOff = claimRedeemCodeInStore({
      code: 'TOGGLETEST',
      claimKey: 'guest:a',
      uid: 'guest_a',
      authMode: 'guest_sandbox',
      characterId: 'slot_1',
      playerName: 'Tester',
      gameUid: '1000',
      nowMs: 15_000,
    })
    assert.equal(claimOff.ok, false)
    if (!claimOff.ok) assert.equal(claimOff.code, 'inactive')

    toggleRedeemCodeInStore('TOGGLETEST', true)
    const claimExpired = claimRedeemCodeInStore({
      code: 'TOGGLETEST',
      claimKey: 'guest:a',
      uid: 'guest_a',
      authMode: 'guest_sandbox',
      characterId: 'slot_1',
      playerName: 'Tester',
      gameUid: '1000',
      nowMs: 10_000 + 3_700_000,
    })
    assert.equal(claimExpired.ok, false)
    if (!claimExpired.ok) assert.equal(claimExpired.code, 'expired')

    assert.equal(deleteRedeemCodeFromStore('TOGGLETEST'), true)
    assert.equal(listRedeemCodesFromStore().length, 0)
  })
})
