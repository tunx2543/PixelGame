import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { after, afterEach, describe, it } from 'node:test'
import {
  getCatalogMonsterAtlas,
  getCatalogMonsterFrameCount,
  hasCatalogMonsterAtlas,
  resolveCatalogMonsterWorldHeight,
} from './catalog-sprites'
import { resolveCanvasTapAction } from './touch-movement'
import { computeLevelGapModifiers } from './combat-balance'
import {
  calculateEnemyAttack,
  calculatePlayerAttack,
  createDefaultEncounterSave,
  rollEncounterForLevel,
} from './encounter'
import { getWorldBossScheduleList } from './mmo-systems'
import {
  getActiveWorldBoss,
  getScheduledWorldBossOccurrences,
  setWorldBossTestOverride,
} from './rpg-systems'
import {
  getEffectiveStoredWorldBossTest,
  getPublicWorldEvents,
  resetGmEventsMemoryCacheForTests,
  setStoredWorldBossTest,
} from '../server/gm-events-store'
import {
  WORLD_BOSS_CRIT_SHAKE_MS,
  WORLD_BOSS_DEFAULT_SPRITE_URL,
  WORLD_BOSS_ENTRANCE_DURATION_MS,
  WORLD_BOSS_WARNING_LEAD_SEC,
  buildEntranceLightningBolts,
  buildEntranceSparks,
  buildVictoryCoinParticles,
  createWorldBossMapFx,
  evaluateWorldBossMapFx,
  evaluateWorldBossWarning,
  isWorldBossCritHitActive,
  resolveGlobalWorldBossHpBar,
} from './world-boss-fx'

const GM_EVENTS_FILES = [
  path.join(process.cwd(), '.data', 'gm-events.json'),
  '/tmp/pixelquest-gm-events.json',
]

const snapshots = new Map<string, string | null>()
for (const filePath of GM_EVENTS_FILES) {
  try {
    snapshots.set(filePath, fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null)
  } catch {
    snapshots.set(filePath, null)
  }
}

afterEach(() => {
  setWorldBossTestOverride(null)
})

after(() => {
  setWorldBossTestOverride(null)
  for (const [filePath, prev] of snapshots.entries()) {
    try {
      if (prev === null) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      } else {
        fs.mkdirSync(path.dirname(filePath), { recursive: true })
        fs.writeFileSync(filePath, prev, 'utf8')
      }
    } catch {
      // ignore cleanup failures
    }
  }
  resetGmEventsMemoryCacheForTests()
})

describe('Event World Boss Mon/Wed/Fri 20:00 ICT schedule & GM Test mode', () => {
  it('activates on Monday, Wednesday, and Friday from 20:00 to 20:59 ICT (UTC+7)', () => {
    // 2026-11-23 is Monday in Thailand (UTC+7)
    const mon1959 = Date.UTC(2026, 10, 23, 12, 59, 0) // 19:59 ICT
    const mon2000 = Date.UTC(2026, 10, 23, 13, 0, 0) // 20:00 ICT
    const mon2059 = Date.UTC(2026, 10, 23, 13, 59, 0) // 20:59 ICT
    const mon2100 = Date.UTC(2026, 10, 23, 14, 0, 0) // 21:00 ICT
    const tue2000 = Date.UTC(2026, 10, 24, 13, 0, 0) // Tuesday 20:00 ICT
    const wed2015 = Date.UTC(2026, 10, 25, 13, 15, 0) // Wednesday 20:15 ICT
    const fri2030 = Date.UTC(2026, 10, 27, 13, 30, 0) // Friday 20:30 ICT

    const beforeSpec = getActiveWorldBoss(mon1959)
    assert.equal(beforeSpec.isActive, false)
    assert.equal(beforeSpec.cycleKey, 'event_wb_20261123_2000')
    assert.equal(beforeSpec.monsterId, 'world_golem')

    const startSpec = getActiveWorldBoss(mon2000)
    assert.equal(startSpec.isActive, true)
    assert.equal(startSpec.isTestMode, false)
    assert.equal(startSpec.cycleKey, 'event_wb_20261123_2000')
    assert.equal(startSpec.bossId, 'wb_world_golem')

    assert.equal(getActiveWorldBoss(mon2059).isActive, true)

    const afterSpec = getActiveWorldBoss(mon2100)
    assert.equal(afterSpec.isActive, false)
    assert.equal(afterSpec.cycleKey, 'event_wb_20261125_2000')

    const tueSpec = getActiveWorldBoss(tue2000)
    assert.equal(tueSpec.isActive, false)
    assert.equal(tueSpec.cycleKey, 'event_wb_20261125_2000')

    const wedSpec = getActiveWorldBoss(wed2015)
    assert.equal(wedSpec.isActive, true)
    assert.equal(wedSpec.cycleKey, 'event_wb_20261125_2000')

    const friSpec = getActiveWorldBoss(fri2030)
    assert.equal(friSpec.isActive, true)
    assert.equal(friSpec.cycleKey, 'event_wb_20261127_2000')
  })

  it('lists upcoming Mon/Wed/Fri 20:00 occurrences in schedule helpers', () => {
    const mon1800 = Date.UTC(2026, 10, 23, 11, 0, 0)
    const occs = getScheduledWorldBossOccurrences(mon1800, 4)
    assert.equal(occs.length, 4)
    assert.deepEqual(
      occs.map((o) => o.cycleKey),
      [
        'event_wb_20261123_2000',
        'event_wb_20261125_2000',
        'event_wb_20261127_2000',
        'event_wb_20261130_2000',
      ],
    )

    const items = getWorldBossScheduleList(mon1800, 3)
    assert.equal(items.length, 3)
    assert.equal(items[0]?.boss.bossId, 'wb_world_golem')
    assert.equal(items[0]?.isCurrent, false)
  })

  it('allows GM test override outside schedule and persists in server gm-events store', () => {
    const tue1400 = Date.UTC(2026, 10, 24, 7, 0, 0)
    assert.equal(getActiveWorldBoss(tue1400).isActive, false)

    const nowMs = Date.now()
    const testState = {
      active: true,
      cycleKey: 'test_wb_custom_1',
      bossId: 'wb_world_golem',
      name: 'โกเลมจักรกลโลกา (Colossal Mech-Golem)',
      monsterId: 'world_golem',
      level: 95,
      element: 'earth' as const,
      maxHp: 1_500_000,
      atk: 320,
      def: 120,
      startedAtMs: nowMs - 1_000,
      expiresAtMs: nowMs + 10 * 60_000,
      triggeredByName: 'GMTUNX',
    }
    setWorldBossTestOverride(testState)
    const activeTest = getActiveWorldBoss(nowMs)
    assert.equal(activeTest.isActive, true)
    assert.equal(activeTest.isTestMode, true)
    assert.equal(activeTest.cycleKey, 'test_wb_custom_1')
    assert.equal(activeTest.triggeredByName, 'GMTUNX')

    // Auto-expires cleanly
    assert.equal(getActiveWorldBoss(nowMs + 15 * 60_000).isTestMode, false)

    // Server store round-trip + public world events exposure
    for (const filePath of GM_EVENTS_FILES) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    resetGmEventsMemoryCacheForTests()
    const stored = setStoredWorldBossTest(testState, nowMs)
    assert.ok(stored)
    assert.equal(stored.cycleKey, 'test_wb_custom_1')
    assert.equal(getEffectiveStoredWorldBossTest(nowMs)?.triggeredByName, 'GMTUNX')
    assert.equal(getPublicWorldEvents(0).worldBossTest?.cycleKey, 'test_wb_custom_1')

    setStoredWorldBossTest(null, nowMs)
    assert.equal(getEffectiveStoredWorldBossTest(nowMs), null)
    assert.equal(getPublicWorldEvents(0).worldBossTest, null)
  })
})

describe('Level-gap combat rebalance', () => {
  it('applies progressive penalties as monster level outpaces player level', () => {
    const matched = computeLevelGapModifiers(10, 12)
    assert.equal(matched.tier, 'normal')
    assert.equal(matched.damageMul, 1)
    assert.equal(matched.missChance, 0)
    assert.equal(matched.incomingMul, 1)
    assert.equal(matched.minDamageFloor, 1)
    assert.equal(matched.warningLabel, null)

    const caution = computeLevelGapModifiers(10, 16)
    assert.equal(caution.tier, 'caution')
    assert.ok(caution.damageMul < 1 && caution.damageMul >= 0.45)
    assert.ok(caution.missChance > 0 && caution.missChance <= 0.22)
    assert.ok(caution.incomingMul > 1)

    const danger = computeLevelGapModifiers(10, 22)
    assert.equal(danger.tier, 'danger')
    assert.ok(danger.damageMul < caution.damageMul)
    assert.ok(danger.missChance > caution.missChance)
    assert.equal(danger.minDamageFloor, 0)

    const overwhelming = computeLevelGapModifiers(5, 35)
    assert.equal(overwhelming.tier, 'overwhelming')
    assert.ok(overwhelming.damageMul <= 0.08)
    assert.ok(overwhelming.missChance >= 0.7)
    assert.ok(overwhelming.incomingMul >= 4.5)
    assert.equal(overwhelming.minDamageFloor, 0)
    assert.ok(overwhelming.warningLabel?.includes('+30'))
  })

  it('amplifies boss penalties, keeps World Boss raids accessible, and exempts GM Staff', () => {
    const mobGap = computeLevelGapModifiers(10, 22, { isBoss: false })
    const bossGap = computeLevelGapModifiers(10, 22, { isBoss: true })
    assert.ok(bossGap.damageMul < mobGap.damageMul)
    assert.ok(bossGap.missChance > mobGap.missChance)
    assert.ok(bossGap.incomingMul > mobGap.incomingMul)

    const wbRaid = computeLevelGapModifiers(15, 95, { isWorldBossRaid: true })
    assert.equal(wbRaid.minDamageFloor, 1)
    assert.ok(wbRaid.damageMul >= 0.28)
    assert.ok(wbRaid.missChance <= 0.22)

    const gmStaff = computeLevelGapModifiers(1, 99, { isBoss: true, isGmStaff: true })
    assert.equal(gmStaff.tier, 'normal')
    assert.equal(gmStaff.damageMul, 1)
    assert.equal(gmStaff.missChance, 0)
    assert.equal(gmStaff.incomingMul, 1)
  })

  it('reduces player damage and boosts monster incoming damage in encounter combat', () => {
    const enemy = rollEncounterForLevel(35, { forcedRarity: 'normal' })
    const lowSave = createDefaultEncounterSave('Lowbie')
    lowSave.level = Math.max(1, enemy.effectiveLevel - 25)
    const highSave = createDefaultEncounterSave('Veteran')
    highSave.level = enemy.effectiveLevel

    let lowDamageTotal = 0
    let highDamageTotal = 0
    for (let i = 0; i < 20; i++) {
      const lowRes = calculatePlayerAttack(lowSave, enemy, 1)
      const highRes = calculatePlayerAttack(highSave, enemy, 1)
      assert.equal(lowRes.levelGapTier, 'overwhelming')
      assert.equal(highRes.levelGapTier, 'normal')
      lowDamageTotal += lowRes.damage
      highDamageTotal += highRes.damage
    }
    assert.ok(lowDamageTotal < highDamageTotal * 0.25)

    const lowIncoming = calculateEnemyAttack(enemy, lowSave)
    const highIncoming = calculateEnemyAttack(enemy, highSave)
    assert.ok(lowIncoming > highIncoming * 2)
  })
})

describe('World Boss Mech-Golem model assets', () => {
  it('registers world_golem atlas metadata and all extracted Google Drive PNG assets exist on disk', () => {
    assert.equal(hasCatalogMonsterAtlas('world_golem'), true)
    const atlas = getCatalogMonsterAtlas('world_golem')
    assert.ok(atlas)
    assert.equal(atlas.biome, 'world')
    assert.equal(getCatalogMonsterFrameCount('world_golem', 'idle'), 13)
    assert.equal(getCatalogMonsterFrameCount('world_golem', 'walk'), 13)
    assert.equal(getCatalogMonsterFrameCount('world_golem', 'attack', 'down'), 14)
    assert.equal(getCatalogMonsterFrameCount('world_golem', 'attack', 'up'), 17)
    assert.equal(getCatalogMonsterFrameCount('world_golem', 'attack', 'right'), 17)
    assert.equal(getCatalogMonsterFrameCount('world_golem', 'attack', 'left'), 17)

    const baseDir = path.join(process.cwd(), 'public', 'assets', 'world-boss', 'mech_golem')
    for (const dirName of ['south', 'north', 'east', 'west', 'south-east', 'south-west', 'north-east', 'north-west']) {
      assert.equal(fs.existsSync(path.join(baseDir, 'rotations', `${dirName}.png`)), true, `missing rotation ${dirName}`)
    }
    for (const stompDir of ['south', 'east']) {
      for (let i = 0; i < 13; i++) {
        const frameFile = `frame_${String(i).padStart(3, '0')}.png`
        assert.equal(fs.existsSync(path.join(baseDir, 'stomp', stompDir, frameFile)), true, `missing ${stompDir}/${frameFile}`)
      }
    }
    const attackExpected: Record<string, number> = { south: 14, north: 17, east: 17, west: 17 }
    for (const [atkDir, count] of Object.entries(attackExpected)) {
      for (let i = 0; i < count; i++) {
        const frameFile = `frame_${String(i).padStart(3, '0')}.png`
        assert.equal(fs.existsSync(path.join(baseDir, 'attack', atkDir, frameFile)), true, `missing attack/${atkDir}/${frameFile}`)
      }
    }
  })
})

describe('World Boss full-map screen shake & particle overlay', () => {
  it('computes decaying trauma shake and distinct overlay particles for slam and beam skills', () => {
    const slamFx = createWorldBossMapFx(1, 10.0, 'slam', 848, 592)
    const slamStart = evaluateWorldBossMapFx(slamFx, 10.08, 1280, 720)
    const slamLate = evaluateWorldBossMapFx(slamFx, 10.85, 1280, 720)
    const slamEnd = evaluateWorldBossMapFx(slamFx, 10 + slamFx.duration + 0.05, 1280, 720)

    assert.equal(slamStart.active, true)
    assert.equal(slamStart.variant, 'slam')
    assert.ok(Math.hypot(slamStart.shakeX, slamStart.shakeY) > 0)
    assert.ok(slamStart.flashAlpha > 0)
    assert.ok(slamStart.vignetteAlpha > 0)
    assert.ok(slamStart.ringAlpha > 0)
    assert.equal(slamStart.particles.length, 56)
    assert.ok(slamStart.particles.some((pt) => pt.kind === 'shard'))
    assert.ok(slamStart.particles.some((pt) => pt.kind === 'ember'))

    assert.equal(slamLate.active, true)
    assert.ok(slamLate.decay < slamStart.decay)
    assert.ok(Math.hypot(slamLate.shakeX, slamLate.shakeY) < Math.hypot(slamStart.shakeX, slamStart.shakeY))

    assert.equal(slamEnd.active, false)
    assert.equal(slamEnd.shakeX, 0)
    assert.equal(slamEnd.shakeY, 0)
    assert.equal(slamEnd.particles.length, 0)

    const beamFx = createWorldBossMapFx(2, 20.0, 'beam', 848, 592)
    const beamFrame = evaluateWorldBossMapFx(beamFx, 20.1, 1280, 720)
    assert.equal(beamFrame.active, true)
    assert.equal(beamFrame.variant, 'beam')
    assert.ok(beamFrame.particles.some((pt) => pt.kind === 'beam'))
    assert.ok(beamFrame.particles.some((pt) => pt.kind === 'spark'))
  })

  it('respects reduceParticles and disableShake UI accessibility preferences', () => {
    const fx = createWorldBossMapFx(3, 5.0, 'beam', 848, 592)
    const reduced = evaluateWorldBossMapFx(fx, 5.1, 1280, 720, {
      reduceParticles: true,
      disableShake: true,
    })
    assert.equal(reduced.active, true)
    assert.equal(reduced.shakeX, 0)
    assert.equal(reduced.shakeY, 0)
    assert.equal(reduced.particles.length, 16)
  })

  it('evaluates the 1.5s pre-attack warning telegraph and generates gold-coin victory particles', () => {
    assert.equal(WORLD_BOSS_WARNING_LEAD_SEC, 1.5)
    assert.equal(evaluateWorldBossWarning({ remainingSec: 1.8 }, 12.0).active, false)
    assert.equal(evaluateWorldBossWarning({ remainingSec: 0 }, 12.0).active, false)
    assert.equal(evaluateWorldBossWarning(null, 12.0).active, false)

    const earlyWarn = evaluateWorldBossWarning({ remainingSec: 1.4 }, 12.0)
    assert.equal(earlyWarn.active, true)
    assert.ok(earlyWarn.progress > 0 && earlyWarn.progress < 0.2)
    assert.equal(earlyWarn.borderColor, '#f59e0b')
    assert.ok(earlyWarn.borderAlpha > 0)

    const urgentWarn = evaluateWorldBossWarning({ remainingSec: 0.35 }, 12.4)
    assert.equal(urgentWarn.active, true)
    assert.ok(urgentWarn.progress > 0.7)
    assert.equal(urgentWarn.borderColor, '#ef4444')
    assert.ok(urgentWarn.ringRadiusMul < earlyWarn.ringRadiusMul)

    const coins = buildVictoryCoinParticles(7, 36)
    assert.equal(coins.length, 36)
    for (const coin of coins) {
      assert.ok(coin.leftPct >= 3 && coin.leftPct <= 97)
      assert.ok(coin.durationSec >= 2.0 && coin.durationSec <= 3.6)
      assert.ok(coin.sizePx >= 16 && coin.sizePx <= 28)
      assert.ok(coin.opacity >= 0.8 && coin.opacity <= 1)
    }
  })

  it('resolves global World Boss HP bar state with live encounter priority and handles enlarged world boss sprite/hitbox', () => {
    const activeEventSpec = {
      cycleKey: 'event_wb_20261123_2000',
      name: 'โกเลมจักรกลโลกา',
      level: 95,
      element: 'earth',
      maxHp: 1_500_000,
      isActive: true,
      isTestMode: false,
      endsAtMs: Date.UTC(2026, 10, 23, 14, 0, 0),
    }

    // 1. Live map encounter overrides stale global raid HP
    const localView = resolveGlobalWorldBossHpBar({
      liveMapBoss: {
        uid: 'wb-1',
        name: 'โกเลมจักรกลโลกา',
        level: 95,
        element: 'earth',
        hp: 750_000,
        maxHp: 1_500_000,
      },
      activeEventSpec,
      globalRaid: {
        cycleKey: 'event_wb_20261123_2000',
        name: 'โกเลมจักรกลโลกา',
        hp: 1_400_000,
        maxHp: 1_500_000,
      },
      currentMapId: 'world',
    })
    assert.ok(localView)
    assert.equal(localView.isLocalEncounter, true)
    assert.equal(localView.ratio, 0.5)
    assert.equal(localView.percentText, '50.0%')

    // 2. Fallback to active global raid HP when fighting elsewhere
    const globalView = resolveGlobalWorldBossHpBar({
      liveMapBoss: null,
      activeEventSpec,
      globalRaid: {
        cycleKey: 'event_wb_20261123_2000',
        name: 'โกเลมจักรกลโลกา',
        hp: 300_000,
        maxHp: 1_500_000,
      },
      currentMapId: 'town',
    })
    assert.ok(globalView)
    assert.equal(globalView.isLocalEncounter, false)
    assert.equal(globalView.ratio, 0.2)
    assert.equal(globalView.hp, 300_000)

    // 3. Hides cleanly when defeated on world map or event inactive
    assert.equal(
      resolveGlobalWorldBossHpBar({
        liveMapBoss: null,
        activeEventSpec,
        currentMapId: 'world',
        defeatedOnCurrentMap: true,
      }),
      null,
    )
    assert.equal(
      resolveGlobalWorldBossHpBar({
        liveMapBoss: null,
        activeEventSpec: { ...activeEventSpec, isActive: false },
        currentMapId: 'town',
      }),
      null,
    )

    // 4. World Boss sprite height is enlarged to colossal 136 world px vs normal max 72
    assert.equal(resolveCatalogMonsterWorldHeight('world_golem', 200), 136)
    assert.equal(resolveCatalogMonsterWorldHeight('slime', 200), 72)

    // 5. Enlarged tap hitbox captures upper torso & wider horizontal body of World Boss
    const tapUpperTorso = resolveCanvasTapAction(445, 300, {
      tileSize: 32,
      playerMapId: 'world',
      playerOwnerId: 'p1',
      npcs: [],
      groundDrops: [],
      monsters: [{ uid: 'wb-1', x: 400, y: 400, dead: false, defId: 'world_golem', isWorldBoss: true }],
      remotePlayers: [],
    })
    assert.equal(tapUpperTorso.kind, 'monster')
  })

  it('builds deterministic World Boss entrance lightning strikes and impact sparks', () => {
    assert.ok(WORLD_BOSS_ENTRANCE_DURATION_MS >= 2000 && WORLD_BOSS_ENTRANCE_DURATION_MS <= 3500)
    const spriteDiskPath = path.join(process.cwd(), 'public', WORLD_BOSS_DEFAULT_SPRITE_URL.replace(/^\//, ''))
    assert.equal(fs.existsSync(spriteDiskPath), true)

    const boltsA = buildEntranceLightningBolts(11, 5)
    const boltsB = buildEntranceLightningBolts(11, 5)
    assert.equal(boltsA.length, 5)
    assert.deepEqual(boltsA, boltsB)
    assert.equal(boltsA[0]?.isMain, true)
    for (const bolt of boltsA) {
      const coords = bolt.points.split(' ')
      assert.ok(coords.length >= 7)
      assert.ok(bolt.strokeWidth >= 2)
      assert.ok(bolt.durationSec > 0)
    }

    const sparks = buildEntranceSparks(11, 24)
    assert.equal(sparks.length, 24)
    for (const spark of sparks) {
      assert.ok(Math.hypot(spark.endX, spark.endY) > 30)
      assert.ok(spark.sizePx >= 4 && spark.sizePx <= 10)
      assert.ok(spark.delaySec >= 0.3 && spark.delaySec <= 0.5)
    }

    assert.equal(isWorldBossCritHitActive(null, 1000), false)
    assert.equal(
      isWorldBossCritHitActive({ id: 1, isSoulCrit: false, damage: 4200, triggeredAtMs: 1000 }, 1120),
      true,
    )
    assert.equal(
      isWorldBossCritHitActive(
        { id: 2, isSoulCrit: true, damage: 9500, triggeredAtMs: 1000 },
        1000 + WORLD_BOSS_CRIT_SHAKE_MS + 10,
      ),
      false,
    )
  })
})


