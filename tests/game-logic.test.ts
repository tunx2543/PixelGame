import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isValidSaveData, pickNewerSave } from '../lib/game/save-sync'
import { formatGameUid, isGmAccountUser, isGmEmail, normalizeGameUidInput } from '../lib/game/permissions'
import {
  ITEMS,
  JOBS,
  MAX_LEVEL,
  MAX_PLUS,
  MONSTERS,
  enhanceCost,
  enhanceRate,
  expToNext,
} from '../lib/game/data'
import {
  COMBAT_PETS,
  MAX_PET_LEVEL,
  QUEST_DEFS,
  applyLevelAndRewards,
  countClaimableQuests,
  createDefaultPetState,
  createDefaultQuestState,
  createDefaultTowerState,
  generateTowerFloor,
  getActivePetBonuses,
  grantActivePetExp,
  petExpToNext,
  recordQuestProgress,
  sanitizePetState,
  sanitizeQuestState,
  sanitizeTowerState,
  todayDateKey,
} from '../lib/game/systems'
import type { SaveData } from '../lib/game/engine'

function makeSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 1,
    savedAt: 1000,
    name: 'Hero',
    jobId: 'novice',
    level: 1,
    exp: 0,
    hp: 100,
    mp: 50,
    gold: 100,
    diamonds: 10,
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
    x: 10,
    y: 10,
    gm: false,
    god: false,
    speed: 1,
    playTime: 0,
    kills: 0,
    ...overrides,
  }
}

describe('save-sync', () => {
  it('validates save structure strictly', () => {
    assert.equal(isValidSaveData(null), false)
    assert.equal(isValidSaveData(undefined), false)
    assert.equal(isValidSaveData({ version: 2, name: 'A', level: 1 }), false)
    assert.equal(isValidSaveData({ version: 1, name: 123, level: 1 }), false)
    assert.equal(isValidSaveData({ version: 1, name: 'A', level: '1' }), false)
    assert.equal(isValidSaveData(makeSave()), true)
  })

  it('picks newer save by savedAt timestamp and flags local-newer saves', () => {
    const olderCloud = makeSave({ savedAt: 1000, level: 5 })
    const newerLocal = makeSave({ savedAt: 2000, level: 7 })
    const res = pickNewerSave(olderCloud, newerLocal)
    assert.equal(res.source, 'local')
    assert.equal(res.localIsNewer, true)
    assert.equal(res.save?.level, 7)

    const newerCloud = makeSave({ savedAt: 3000, level: 9 })
    const res2 = pickNewerSave(newerCloud, newerLocal)
    assert.equal(res2.source, 'cloud')
    assert.equal(res2.localIsNewer, false)
    assert.equal(res2.save?.level, 9)
  })

  it('handles missing or one-sided saves', () => {
    assert.deepEqual(pickNewerSave(null, null), { save: null, source: 'none', localIsNewer: false })

    const localOnly = makeSave({ savedAt: 500 })
    const resLocal = pickNewerSave(null, localOnly)
    assert.equal(resLocal.source, 'local')
    assert.equal(resLocal.localIsNewer, true)
    assert.equal(resLocal.save, localOnly)

    const cloudOnly = makeSave({ savedAt: 500 })
    const resCloud = pickNewerSave(cloudOnly, undefined)
    assert.equal(resCloud.source, 'cloud')
    assert.equal(resCloud.localIsNewer, false)
    assert.equal(resCloud.save, cloudOnly)
  })
})

describe('permissions & UID formatting', () => {
  it('checks GM email and verification status', () => {
    assert.equal(isGmEmail('  FFSMILEPAY53@gmail.com '), true)
    assert.equal(isGmEmail('player@gmail.com'), false)
    assert.equal(isGmAccountUser({ email: 'ffsmilepay53@gmail.com', emailVerified: false }), false)
    assert.equal(isGmAccountUser({ email: 'ffsmilepay53@gmail.com', emailVerified: true }), true)
    assert.equal(isGmAccountUser(null), false)
  })

  it('normalizes and formats game UIDs safely', () => {
    assert.equal(normalizeGameUidInput('0'), '0000')
    assert.equal(normalizeGameUidInput('#42'), '0042')
    assert.equal(normalizeGameUidInput(' 12345 '), '12345')
    assert.equal(normalizeGameUidInput('abc'), null)
    assert.equal(normalizeGameUidInput('123456789'), null)
    assert.equal(formatGameUid(7), '0007')
    assert.equal(formatGameUid(null), '----')
  })
})

describe('game data integrity', () => {
  it('has valid item references and zero broken catalog asset paths', () => {
    for (const item of Object.values(ITEMS)) {
      if (item.asset) {
        assert.ok(!item.asset.includes('/images/items/catalog/'), `Broken catalog path on ${item.id}: ${item.asset}`)
      }
    }
    for (const monster of Object.values(MONSTERS)) {
      for (const drop of monster.drops) {
        assert.ok(ITEMS[drop.itemId], `Monster ${monster.id} references unknown drop ${drop.itemId}`)
      }
    }
    const crystalItem = Object.values(ITEMS).find((i) => i.name.includes('ราชันย์ผลึก'))
    assert.ok(crystalItem, 'Expected catalog item containing ราชันย์ผลึก')
  })

  it('has sensible job progression and formulas', () => {
    assert.ok(JOBS.novice)
    assert.ok(expToNext(1) > 0)
    assert.ok(expToNext(10) > expToNext(1))
    assert.ok(enhanceCost(1, 1).gold < enhanceCost(MAX_PLUS - 1, 1).gold)
    assert.ok(enhanceCost(1, 1).stones <= enhanceCost(MAX_PLUS - 1, 1).stones)
    assert.ok(enhanceRate(0) >= enhanceRate(MAX_PLUS - 1))
    assert.ok(MAX_LEVEL >= 70)
  })
})

describe('game systems (pets, quests, tower, rewards)', () => {
  it('sanitizes pets, grants pet EXP, and computes bonuses', () => {
    const defaultPets = createDefaultPetState(['moonlight_firefly', 'non_pet_gem'], 'moonlight_firefly')
    assert.equal(defaultPets.activePetId, 'moonlight_firefly')
    assert.ok(defaultPets.ownedPets.moonlight_firefly)

    const sanitized = sanitizePetState({ activePetId: 'invalid', ownedPets: { buddy_slime: { level: 999, exp: -5 } } })
    assert.equal(sanitized.ownedPets.buddy_slime.level, MAX_PET_LEVEL)
    assert.equal(sanitized.ownedPets.buddy_slime.exp, 0)
    assert.equal(sanitized.activePetId, null)

    const starter = createDefaultPetState()
    starter.ownedPets.buddy_slime = { level: 1, exp: 0 }
    starter.activePetId = 'buddy_slime'
    const expNeeded = petExpToNext(1)
    const gained = grantActivePetExp(starter, expNeeded + 10)
    assert.equal(gained.leveledUp, true)
    assert.equal(gained.newLevel, 2)

    const bonuses = getActivePetBonuses(gained.nextPetState)
    assert.ok(bonuses)
    assert.equal(bonuses.level, 2)
    assert.ok(bonuses.companionAtk > COMBAT_PETS[0].baseAtk)
  })

  it('tracks daily vs milestone quests and resets daily progress on new day', () => {
    const yesterday = sanitizeQuestState({
      dailyDate: '2000-01-01',
      dailyKills: 25,
      totalKills: 60,
      claimedDailyIds: ['daily_hunt_10'],
      claimedMilestoneIds: ['mile_kills_50'],
    })
    assert.equal(yesterday.dailyDate, todayDateKey())
    assert.equal(yesterday.dailyKills, 0)
    assert.deepEqual(yesterday.claimedDailyIds, [])
    assert.equal(yesterday.totalKills, 60)
    assert.deepEqual(yesterday.claimedMilestoneIds, ['mile_kills_50'])

    const qs = createDefaultQuestState(0)
    const updated = recordQuestProgress(qs, { kills: 12, bossKills: 1, enhances: 1, towerClears: 2 })
    const claimable = countClaimableQuests(updated, createDefaultTowerState(), createDefaultPetState())
    assert.ok(claimable >= 4)
    assert.ok(QUEST_DEFS.length >= 10)
  })

  it('generates scaling tower floors and applies rewards with level-up & cap handling', () => {
    const ts = sanitizeTowerState({ highestFloor: 4, currentFloor: 99 })
    assert.equal(ts.currentFloor, 5)

    const floor1 = generateTowerFloor(1)
    const floor5 = generateTowerFloor(5)
    assert.equal(floor1.isBossFloor, false)
    assert.equal(floor5.isBossFloor, true)
    assert.ok(floor5.enemy.maxHp > floor1.enemy.maxHp)
    assert.ok(floor5.firstClearDiamonds > floor1.firstClearDiamonds)

    const save = {
      level: 1,
      exp: 0,
      gold: 0,
      diamonds: 0,
      hp: 10,
      mp: 5,
      statPoints: 0,
      skillPoints: 0,
      inventory: [] as Array<{ uid: string; itemId: string; qty: number; plus: number }>,
    }
    const result = applyLevelAndRewards(
      save,
      { gold: 500, exp: expToNext(1) + 5, diamonds: 20, stones: 3 },
      () => ({ maxHp: 200, maxMp: 80 }),
      24,
    )
    assert.equal(result.leveledFrom, 1)
    assert.equal(result.leveledTo, 2)
    assert.equal(result.stonesAdded, 3)
    assert.equal(save.hp, 200)
    assert.equal(save.mp, 80)
    assert.equal(save.statPoints, 3)
    assert.equal(save.skillPoints, 1)
    assert.equal(save.inventory[0]?.itemId, 'enhance_stone')
    assert.equal(save.inventory[0]?.qty, 3)
  })
})
