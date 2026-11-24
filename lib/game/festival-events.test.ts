import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { after, beforeEach, describe, it } from 'node:test'
import {
  canClaimFestivalDailyGift,
  claimFestivalDailyGiftInState,
  claimFestivalMissionInState,
  computeFestivalMultipliers,
  countClaimableFestivalBadges,
  createDefaultFestivalPlayerState,
  getActiveFestivalEvent,
  getBangkokDateParts,
  getFestivalTokenCount,
  recordFestivalProgressInState,
  sanitizeFestivalOverrideState,
  sanitizeFestivalPlayerState,
  spendFestivalTokensForShopInState,
} from './festival-events'
import {
  getEffectiveStoredFestivalOverride,
  getPublicWorldEvents,
  resetGmEventsMemoryCacheForTests,
  setStoredFestivalOverride,
} from '../server/gm-events-store'

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000
function bangkokMs(year: number, month: number, day: number, hour = 12, minute = 0): number {
  return Date.UTC(year, month - 1, day, hour, minute, 0, 0) - BANGKOK_OFFSET_MS
}

const PERSIST_FILES = [
  path.join(process.cwd(), '.data', 'gm-events.json'),
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

function clearGmEventsStoreForIsolation() {
  for (const filePath of PERSIST_FILES) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    } catch {
      // Ignore cleanup failures
    }
  }
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
      // Ignore restore failures
    }
  }
  resetGmEventsMemoryCacheForTests()
})

describe('festival-events calendar & rotation (UTC+7)', () => {
  it('activates seasonal Thailand calendar events on their exact date windows', () => {
    const loyKrathong = getActiveFestivalEvent(bangkokMs(2026, 11, 24, 15, 0))
    assert.equal(loyKrathong.def.id, 'loy_krathong')
    assert.equal(loyKrathong.source, 'seasonal')
    assert.equal(loyKrathong.cycleKey, 'loy_krathong:2026')

    const decNewYear = getActiveFestivalEvent(bangkokMs(2026, 12, 25, 20, 0))
    assert.equal(decNewYear.def.id, 'new_year')
    assert.equal(decNewYear.cycleKey, 'new_year:2026')

    const janNewYear = getActiveFestivalEvent(bangkokMs(2027, 1, 5, 10, 0))
    assert.equal(janNewYear.def.id, 'new_year')
    assert.equal(janNewYear.cycleKey, 'new_year:2026')

    const lunar = getActiveFestivalEvent(bangkokMs(2026, 2, 10, 12, 0))
    assert.equal(lunar.def.id, 'lunar_new_year')

    const songkran = getActiveFestivalEvent(bangkokMs(2026, 4, 13, 14, 0))
    assert.equal(songkran.def.id, 'songkran')

    const halloween = getActiveFestivalEvent(bangkokMs(2026, 10, 31, 22, 0))
    assert.equal(halloween.def.id, 'halloween')
  })

  it('rotates in-game weekly events when outside seasonal date windows', () => {
    // 2026-06-15 is Monday (Mon/Wed/Fri daytime -> harvest_blessing)
    const mondayMorning = bangkokMs(2026, 6, 15, 10, 0)
    assert.equal(getBangkokDateParts(mondayMorning).dayOfWeek, 1)
    assert.equal(getActiveFestivalEvent(mondayMorning).def.id, 'harvest_blessing')
    assert.equal(getActiveFestivalEvent(mondayMorning).source, 'ingame')

    // 2026-06-16 is Tuesday -> guild_boss_rush
    const tuesday = bangkokMs(2026, 6, 16, 16, 0)
    assert.equal(getBangkokDateParts(tuesday).dayOfWeek, 2)
    assert.equal(getActiveFestivalEvent(tuesday).def.id, 'guild_boss_rush')

    // 2026-06-19 is Friday 19:00 -> weekend_hunter
    const fridayNight = bangkokMs(2026, 6, 19, 19, 0)
    assert.equal(getBangkokDateParts(fridayNight).dayOfWeek, 5)
    assert.equal(getActiveFestivalEvent(fridayNight).def.id, 'weekend_hunter')

    // 2026-06-21 is Sunday -> weekend_hunter
    const sunday = bangkokMs(2026, 6, 21, 15, 0)
    assert.equal(getActiveFestivalEvent(sunday).def.id, 'weekend_hunter')
  })

  it('prioritizes GM override with custom rates and reverts after expiration', () => {
    const now = bangkokMs(2026, 6, 15, 12, 0)
    const override = sanitizeFestivalOverrideState(
      {
        active: true,
        eventId: 'songkran',
        cycleKey: 'override:songkran:test',
        customTitle: 'GM Special Water Fiesta',
        expBonusPct: 120,
        dropBonusPct: 80,
        goldBonusPct: 90,
        startedAtMs: now - 1000,
        expiresAtMs: now + 60_000,
        triggeredByName: 'GMTUNX',
      },
      now,
    )
    assert.ok(override)

    const live = getActiveFestivalEvent(now, override)
    assert.equal(live.def.id, 'songkran')
    assert.equal(live.isGmOverride, true)
    assert.equal(live.title, 'GM Special Water Fiesta')

    const muls = computeFestivalMultipliers(now, override)
    assert.equal(muls.expMul, 2.2)
    assert.equal(muls.dropMul, 1.8)
    assert.equal(muls.goldMul, 1.9)

    // After expiration, falls back to calendar (harvest_blessing on Mon 2026-06-15)
    const afterExpiry = getActiveFestivalEvent(now + 120_000, override)
    assert.equal(afterExpiry.isGmOverride, false)
    assert.equal(afterExpiry.def.id, 'harvest_blessing')
  })
})

describe('festival-events player progression, gifts, missions & shop', () => {
  it('enforces daily gift idempotency per Bangkok date', () => {
    const day1 = bangkokMs(2026, 11, 24, 14, 0)
    const day2 = bangkokMs(2026, 11, 25, 0, 15)
    const init = createDefaultFestivalPlayerState()

    assert.equal(canClaimFestivalDailyGift(init, 'loy_krathong', day1), true)
    const claim1 = claimFestivalDailyGiftInState(init, day1)
    assert.equal(claim1.ok, true)
    if (!claim1.ok) throw new Error('expected ok')
    assert.equal(getFestivalTokenCount(claim1.next, 'loy_krathong'), claim1.gift.tokens)

    // Duplicate same day fails
    const dup = claimFestivalDailyGiftInState(claim1.next, day1 + 3600_000)
    assert.equal(dup.ok, false)

    // Next Bangkok day succeeds
    const claimNextDay = claimFestivalDailyGiftInState(claim1.next, day2)
    assert.equal(claimNextDay.ok, true)
  })

  it('tracks kills/boss/gather progress, mission claims, badge counts, and shop limits', () => {
    const now = bangkokMs(2026, 11, 24, 18, 0)
    let state = createDefaultFestivalPlayerState()

    // Daily gift ready -> 1 badge
    assert.equal(countClaimableFestivalBadges(state, now), 1)

    const prog = recordFestivalProgressInState(
      state,
      { kills: 30, bossKills: 2, gathers: 5, tokensEarned: 50 },
      now,
    )
    state = prog.next
    assert.equal(getFestivalTokenCount(state, 'loy_krathong'), 50)

    // Daily gift + hunt_25 + boss_2 + gather_5 = 4 badges
    assert.equal(countClaimableFestivalBadges(state, now), 4)

    // Claim hunt_25
    const claimedHunt = claimFestivalMissionInState(state, 'hunt_25', now)
    assert.equal(claimedHunt.ok, true)
    if (!claimedHunt.ok) throw new Error('expected mission claim ok')
    state = claimedHunt.next
    assert.equal(getFestivalTokenCount(state, 'loy_krathong'), 50 + claimedHunt.mission.rewardTokens)

    // Re-claiming hunt_25 rejected
    const dupMission = claimFestivalMissionInState(state, 'hunt_25', now)
    assert.equal(dupMission.ok, false)

    // Incomplete hunt_80 rejected
    const incomplete = claimFestivalMissionInState(state, 'hunt_80', now)
    assert.equal(incomplete.ok, false)

    // Buy limited item (lk_frame costs 65, limit 1)
    const buyFrame = spendFestivalTokensForShopInState(state, 'lk_frame', now)
    assert.equal(buyFrame.ok, true)
    if (!buyFrame.ok) throw new Error('expected shop exchange ok')
    state = buyFrame.next
    assert.equal(getFestivalTokenCount(state, 'loy_krathong'), 50 + claimedHunt.mission.rewardTokens - 65)

    // Buying lk_frame second time rejected due to limitPerCycle: 1
    const buyFrameAgain = spendFestivalTokensForShopInState(state, 'lk_frame', now)
    assert.equal(buyFrameAgain.ok, false)

    // Sanitization preserves valid data and clamps invalid tokens
    const sanitized = sanitizeFestivalPlayerState({
      ...state,
      tokens: { ...state.tokens, invalid_id: 999, loy_krathong: -5 },
    })
    assert.equal(sanitized.tokens.invalid_id, undefined)
    assert.equal(sanitized.tokens.loy_krathong, undefined)
  })
})

describe('gm-events-store festivalOverride persistence', () => {
  beforeEach(() => {
    clearGmEventsStoreForIsolation()
  })

  it('persists GM festival override and exposes it in public world events', () => {
    const now = Date.now()
    const saved = setStoredFestivalOverride(
      {
        active: true,
        eventId: 'new_year',
        cycleKey: `override:new_year:${now}`,
        customTitle: 'Year End Marathon',
        expBonusPct: 100,
        dropBonusPct: 75,
        goldBonusPct: 80,
        startedAtMs: now,
        expiresAtMs: now + 60 * 60_000,
        triggeredByName: 'GMTUNX',
      },
      now,
    )
    assert.ok(saved)
    assert.equal(saved.eventId, 'new_year')

    resetGmEventsMemoryCacheForTests()
    const reloaded = getEffectiveStoredFestivalOverride(now + 1000)
    assert.ok(reloaded)
    assert.equal(reloaded.customTitle, 'Year End Marathon')

    const pub = getPublicWorldEvents(0)
    assert.ok(pub.festivalOverride)
    assert.equal(pub.festivalOverride.eventId, 'new_year')

    // Clearing reverts to null
    setStoredFestivalOverride(null, now)
    assert.equal(getEffectiveStoredFestivalOverride(now + 1000), null)
  })
})
