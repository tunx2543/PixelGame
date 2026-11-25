import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ACTIVITY_DEFS,
  ACTIVITY_MAP_IDS,
  ACTIVITY_SIGNATURE_ITEM_BY_ACTIVITY,
  ACTIVITY_WEAPON_BOX_IDS,
  BOUNTY_TARGETS,
  FISHING_DERBY_SPOTS,
  GUILD_WAR_FLAG_SPOTS,
  TREASURE_DIG_CANDIDATES,
  computeActivityRewards,
  computeTreasureCompassHint,
  createDefaultActivitiesState,
  getActivityByMapId,
  getActivityScheduleStatus,
  getBountyTargetById,
  isActivityMapId,
  pickTreasureDigSpot,
  recordActivityClearInState,
  resolveActivityClearOutcome,
  rollActivityDailyReset,
  rollActivityWeaponChest,
  rollFishingDerbyCatch,
  sanitizeActivitiesState,
} from './activities'
import { ITEMS } from './data'
import { MAPS, TILE, boxBlocked } from './maps'

describe('Non-Festival Activities Core Module', () => {
  it('defines 6 distinct activities with dedicated portal-free walkable maps', () => {
    assert.equal(ACTIVITY_DEFS.length, 6)
    const uniqueMaps = new Set(ACTIVITY_DEFS.map((d) => d.mapId))
    assert.equal(uniqueMaps.size, 6)

    for (const def of ACTIVITY_DEFS) {
      assert.equal(isActivityMapId(def.mapId), true)
      assert.equal(getActivityByMapId(def.mapId)?.id, def.id)
      const map = MAPS[def.mapId]
      assert.ok(map, `Expected map ${def.mapId} to exist in MAPS`)
      assert.equal(map.portals.length, 0, `Activity map ${def.mapId} must have zero portals`)
      assert.ok(
        map.objects.length >= 24,
        `Activity map ${def.mapId} should be richly decorated (>= 24 objects), got ${map.objects.length}`,
      )
      const distinctKinds = new Set(map.objects.map((o) => o.kind))
      assert.ok(
        distinctKinds.size >= 5,
        `Activity map ${def.mapId} should have >= 5 distinct object kinds, got ${distinctKinds.size}`,
      )
      assert.equal(
        boxBlocked(map, (map.spawn.x + 0.5) * TILE, (map.spawn.y + 0.5) * TILE),
        false,
        `Spawn on ${def.mapId} must be walkable`,
      )
    }

    for (const flag of GUILD_WAR_FLAG_SPOTS) {
      assert.equal(
        boxBlocked(MAPS.act_guild_war, (flag.tx + 0.5) * TILE, (flag.ty + 0.5) * TILE),
        false,
        `Guild war flag ${flag.id} must be walkable`,
      )
    }
    for (const spot of TREASURE_DIG_CANDIDATES) {
      assert.equal(
        boxBlocked(MAPS.act_treasure, (spot.tx + 0.5) * TILE, (spot.ty + 0.5) * TILE),
        false,
        `Treasure spot ${spot.tx},${spot.ty} must be walkable`,
      )
    }
    for (const fish of FISHING_DERBY_SPOTS) {
      assert.equal(
        boxBlocked(MAPS.act_fishing, (fish.tx + 0.5) * TILE, (fish.ty + 0.5) * TILE),
        false,
        `Fishing spot ${fish.id} must be walkable`,
      )
    }
    // Verify main bridge & pier lanes on act_fishing remain clear of solid props
    for (let tx = 14; tx <= 38; tx++) {
      assert.equal(
        boxBlocked(MAPS.act_fishing, (tx + 0.5) * TILE, (18 + 0.5) * TILE),
        false,
        `Fishing horizontal bridge at (${tx}, 18) must stay walkable`,
      )
    }
    for (let ty = 10; ty <= 26; ty++) {
      assert.equal(
        boxBlocked(MAPS.act_fishing, (26 + 0.5) * TILE, (ty + 0.5) * TILE),
        false,
        `Fishing vertical bridge at (26, ${ty}) must stay walkable`,
      )
    }

    assert.equal(isActivityMapId('town'), false)
    assert.equal(isActivityMapId(ACTIVITY_MAP_IDS.fishing), true)
  })

  it('handles daily reset, cap tracking, and personal best records', () => {
    const day1 = Date.UTC(2026, 4, 10, 12, 0, 0)
    const day2 = Date.UTC(2026, 4, 11, 8, 0, 0)
    let state = createDefaultActivitiesState(day1)

    const r1 = recordActivityClearInState(state, 'boss_rush', { clearTimeSec: 94.5 }, day1)
    assert.equal(r1.withinDailyCap, true)
    assert.equal(r1.newRecord, true)
    assert.equal(r1.next.bossRushBestSec, 94.5)
    assert.equal(r1.next.dailyClears.boss_rush, 1)

    const r2 = recordActivityClearInState(r1.next, 'boss_rush', { clearTimeSec: 81.2 }, day1)
    assert.equal(r2.newRecord, true)
    assert.equal(r2.next.bossRushBestSec, 81.2)
    assert.equal(r2.next.totalClears.boss_rush, 2)

    const fishRes = recordActivityClearInState(r2.next, 'fishing', { score: 135 }, day1)
    assert.equal(fishRes.newRecord, true)
    assert.equal(fishRes.next.fishingBestScore, 135)

    // Roll into day 2 -> daily clears reset while total clears and records persist
    state = rollActivityDailyReset(fishRes.next, day2)
    assert.equal(state.dailyClears.boss_rush, 0)
    assert.equal(state.totalClears.boss_rush, 2)
    assert.equal(state.bossRushBestSec, 81.2)
    assert.equal(state.fishingBestScore, 135)

    // Sanitizing malformed input safely restores defaults
    const clean = sanitizeActivitiesState({ bossRushBestSec: -5, selectedBountyId: 'invalid' }, day2)
    assert.equal(clean.bossRushBestSec, null)
    assert.equal(clean.selectedBountyId, BOUNTY_TARGETS[0].id)
  })

  it('computes treasure compass hints accurately by distance and direction', () => {
    const spot = pickTreasureDigSpot(() => 0.25)
    assert.ok(spot.tx > 0 && spot.ty > 0)

    const found = computeTreasureCompassHint(20, 20, 21, 21)
    assert.equal(found.heatLevel, 'found')

    const hot = computeTreasureCompassHint(20, 20, 24, 20)
    assert.equal(hot.heatLevel, 'hot')
    assert.match(hot.directionThai, /ตะวันออก/)

    const cold = computeTreasureCompassHint(10, 30, 35, 10)
    assert.equal(cold.heatLevel, 'cold')
    assert.match(cold.directionThai, /เหนือตะวันออก/)
  })

  it('resolves bounty targets, fishing rolls, schedules, and reward scaling', () => {
    assert.equal(getBountyTargetById('missing').id, BOUNTY_TARGETS[0].id)
    const trophy = rollFishingDerbyCatch(1, () => 0.01)
    assert.equal(trophy.tier, 'trophy')
    assert.equal(trophy.bonusStone, true)
    assert.equal(trophy.bonusItemId, 'act_item_golden_bait')

    const common = rollFishingDerbyCatch(1, () => 0.95)
    assert.equal(common.tier, 'common')
    assert.equal(common.bonusItemId, undefined)

    const fullReward = computeActivityRewards('invasion', 20, 0, { isPeakBonus: true })
    const reducedReward = computeActivityRewards('invasion', 20, 3)
    assert.equal(fullReward.dailyReduced, false)
    assert.equal(reducedReward.dailyReduced, true)
    assert.ok(fullReward.diamonds > reducedReward.diamonds)

    const status = getActivityScheduleStatus('guild_war', new Date(2026, 4, 10, 20, 0, 0).getTime())
    assert.equal(status.open, true)
    assert.equal(status.isPeakBonus, true)
  })

  it('awards random weapon chests + signature activity items and zero direct weapons', () => {
    const chestSet = new Set<string>(ACTIVITY_WEAPON_BOX_IDS)

    for (const def of ACTIVITY_DEFS) {
      const signatureId = ACTIVITY_SIGNATURE_ITEM_BY_ACTIVITY[def.id]
      assert.ok(ITEMS[signatureId], `Signature item ${signatureId} must exist in ITEMS`)
      assert.ok(def.featuredItemIds.includes(signatureId), `${def.id} featuredItemIds must include ${signatureId}`)
      assert.ok(
        def.featuredItemIds.some((id) => chestSet.has(id)),
        `${def.id} featuredItemIds must include at least one weapon chest`,
      )
      for (const fid of def.featuredItemIds) {
        const fDef = ITEMS[fid]
        assert.ok(fDef, `Featured item ${fid} must exist in ITEMS`)
        assert.notEqual(fDef.kind, 'weapon', `Activity ${def.id} must not feature direct weapon ${fid}`)
      }

      const full = computeActivityRewards(def.id, 35, 0)
      const reduced = computeActivityRewards(def.id, 35, def.dailyCap)

      assert.ok(
        full.items.some((entry) => chestSet.has(entry.itemId)),
        `${def.id} within-cap rewards must include a random weapon chest`,
      )
      assert.ok(
        full.items.some((entry) => entry.itemId === signatureId),
        `${def.id} within-cap rewards must include signature item ${signatureId}`,
      )
      assert.ok(
        reduced.items.some((entry) => entry.itemId === signatureId),
        `${def.id} reduced rewards must include signature item ${signatureId}`,
      )

      for (const entry of [...full.items, ...reduced.items]) {
        const iDef = ITEMS[entry.itemId]
        assert.ok(iDef, `Reward item ${entry.itemId} must exist in ITEMS`)
        assert.notEqual(iDef.kind, 'weapon', `Activity ${def.id} must never award direct weapon ${entry.itemId}`)
      }
    }

    for (const bounty of BOUNTY_TARGETS) {
      const bReward = computeActivityRewards('bounty', 40, 0, { bountyId: bounty.id })
      assert.ok(bReward.items.some((entry) => chestSet.has(entry.itemId)))
      for (const entry of bReward.items) {
        assert.notEqual(ITEMS[entry.itemId]?.kind, 'weapon')
      }
    }
  })

  it('rolls valid non-GM weapons from both random weapon chests matching rarity and plus bounds', () => {
    for (const chestId of ACTIVITY_WEAPON_BOX_IDS) {
      for (let i = 0; i < 20; i++) {
        const res = rollActivityWeaponChest(chestId, 30, 'warrior', () => ((i * 37) % 100) / 100)
        const def = ITEMS[res.itemId]
        assert.ok(def, `Rolled item ${res.itemId} must exist`)
        assert.equal(def.kind, 'weapon')
        assert.notEqual(Boolean(def.gmOnly), true)
        if (chestId === 'act_weapon_box_legend') {
          assert.ok(['epic', 'legendary', 'mythic'].includes(res.rarity))
          assert.ok(res.plus >= 2 && res.plus <= 5)
        } else {
          assert.ok(['rare', 'epic', 'legendary'].includes(res.rarity))
          assert.ok(res.plus >= 1 && res.plus <= 3)
        }
      }
    }
  })

  it('completes activity and warps to town immediately when all activity monsters/bosses are defeated', () => {
    // Invasion: waves 1 -> 2 -> 3, then complete & warp town
    assert.deepEqual(
      resolveActivityClearOutcome({ activityId: 'invasion', aliveMonsterCount: 2, wave: 1, maxWaves: 3 }),
      { action: 'continue' },
    )
    assert.deepEqual(
      resolveActivityClearOutcome({ activityId: 'invasion', aliveMonsterCount: 0, wave: 1, maxWaves: 3 }),
      { action: 'advance_wave', nextWave: 2 },
    )
    assert.deepEqual(
      resolveActivityClearOutcome({ activityId: 'invasion', aliveMonsterCount: 0, wave: 3, maxWaves: 3 }),
      { action: 'complete_and_warp_town', warpTargetMapId: 'town' },
    )

    // Boss Rush: stages 1..4, then complete & warp town
    assert.deepEqual(
      resolveActivityClearOutcome({ activityId: 'boss_rush', aliveMonsterCount: 0, stage: 2, maxStages: 4 }),
      { action: 'advance_stage', nextStage: 3 },
    )
    assert.deepEqual(
      resolveActivityClearOutcome({ activityId: 'boss_rush', aliveMonsterCount: 0, stage: 4, maxStages: 4 }),
      { action: 'complete_and_warp_town', warpTargetMapId: 'town' },
    )

    // Bounty: completes & warps town once boss + escorts are dead
    assert.deepEqual(
      resolveActivityClearOutcome({ activityId: 'bounty', aliveMonsterCount: 1 }),
      { action: 'continue' },
    )
    assert.deepEqual(
      resolveActivityClearOutcome({ activityId: 'bounty', aliveMonsterCount: 0 }),
      { action: 'complete_and_warp_town', warpTargetMapId: 'town' },
    )

    // Treasure: waits until dig spot revealed, then completes & warps town once guardian dies
    assert.deepEqual(
      resolveActivityClearOutcome({ activityId: 'treasure', aliveMonsterCount: 0, digRevealed: false }),
      { action: 'continue' },
    )
    assert.deepEqual(
      resolveActivityClearOutcome({ activityId: 'treasure', aliveMonsterCount: 0, digRevealed: true }),
      { action: 'complete_and_warp_town', warpTargetMapId: 'town', markGuardianDefeated: true },
    )

    // Guild War: completes & warps town immediately either when all defenders die OR target score reached
    assert.deepEqual(
      resolveActivityClearOutcome({ activityId: 'guild_war', aliveMonsterCount: 2, score: 30, targetScore: 100 }),
      { action: 'continue' },
    )
    assert.deepEqual(
      resolveActivityClearOutcome({ activityId: 'guild_war', aliveMonsterCount: 0, score: 60, targetScore: 100 }),
      { action: 'complete_and_warp_town', warpTargetMapId: 'town' },
    )
    assert.deepEqual(
      resolveActivityClearOutcome({ activityId: 'guild_war', aliveMonsterCount: 2, score: 100, targetScore: 100 }),
      { action: 'complete_and_warp_town', warpTargetMapId: 'town' },
    )

    // Fishing: completes & warps town when target score reached
    assert.deepEqual(
      resolveActivityClearOutcome({ activityId: 'fishing', aliveMonsterCount: 0, score: 120, targetScore: 120 }),
      { action: 'complete_and_warp_town', warpTargetMapId: 'town' },
    )
  })
})
