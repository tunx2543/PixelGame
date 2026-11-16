import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BATTLE_PASS_TIERS,
  BEGINNER_GUIDE_STEPS,
  FOOD_BUFF_DEFS,
  GATHERING_NODES,
  calculateOfflineAfkRewards,
  computeTalentBonuses,
  createDefaultExtV2,
  findNearbyGatheringNode,
  getActiveFoodBuffBonuses,
  getWorldTimePhase,
  grantBattlePassExpToState,
  rollGatheringDrops,
  sanitizeExtV2,
  skillUpgradeCost,
} from '../lib/game/extended-systems'
import {
  JOBS,
} from '../lib/game/data'
import {
  getActivePetBonuses,
  getPetStarMultiplier,
  petEvolveCost,
} from '../lib/game/systems'
import {
  addItem,
  claimBattlePassTierAction,
  claimBeginnerGuideStepAction,
  consumeItem,
  cookFoodAction,
  evolveCombatPetAction,
  game,
  gatherNearbyNodeAction,
  getStats,
  grantBattlePassExpAction,
  isBeginnerGuideStepReady,
  newGame,
  resetTalentsAction,
  saveLoadoutAction,
  triggerDodgeDash,
  unlockBattlePassPremiumAction,
  unlockCombatPet,
  unlockCosmeticAction,
  upgradeSkillAction,
  upgradeTalentAction,
} from '../lib/game/engine'

test('Life skills gathering nodes, drop rolls, cooking, and food buffs integrate with getStats()', () => {
  const townNode = findNearbyGatheringNode('town', 13 * 16 + 8, 25 * 16 + 8)
  assert.ok(townNode)
  assert.equal(townNode.id, 'town_pond_fishing')

  assert.equal(findNearbyGatheringNode('town', 0, 0), null)

  const drop = rollGatheringDrops(GATHERING_NODES[0], 5, () => 0.01)
  assert.ok(drop.items.length >= 2)
  assert.equal(drop.gotEssence, true)
  assert.ok(drop.expGain > 14)

  const now = Date.now()
  const active = getActiveFoodBuffBonuses(
    {
      itemId: 'food_hero_feast',
      name: 'ชุดอาหารผู้กล้า',
      expiresAtMs: now + 60_000,
      atkPct: 18,
      defPct: 10,
      critBonus: 0.08,
      expMul: 1.25,
    },
    now,
  )
  assert.equal(active.active, true)
  assert.equal(active.atkPct, 18)

  const expired = getActiveFoodBuffBonuses(
    {
      itemId: 'food_hero_feast',
      name: 'Expired',
      expiresAtMs: now - 10,
      atkPct: 18,
      defPct: 10,
      critBonus: 0.08,
      expMul: 1.25,
    },
    now,
  )
  assert.equal(expired.active, false)

  const prevPlayer = game.p
  try {
    newGame('Chef')
    const p = game.p!
    p.gold = 5000
    addItem('fish_silver', 3)
    addItem('herb_green', 2)
    const baseStats = getStats(p)

    const cookRes = cookFoodAction('food_grilled_fish')
    assert.equal(cookRes.ok, true)
    const cookedItem = p.inventory.find((i) => i.itemId === 'food_grilled_fish')
    assert.ok(cookedItem)

    consumeItem(cookedItem.uid)
    const buffedStats = getStats(p)
    assert.ok(buffedStats.atk > baseStats.atk)

    // Test gathering near town pond directly via engine action
    game.gatherCd = 0
    p.x = 13 * 16 + 8
    p.y = 25 * 16 + 8
    const gatherRes = gatherNearbyNodeAction('town_pond_fishing')
    assert.equal(gatherRes.ok, true)
    assert.equal(sanitizeExtV2(p.extV2).gatherCount, 1)
  } finally {
    game.p = prevPlayer
  }
})

test('Talent tree, skill upgrades, and loadout presets apply bonuses and refund properly', () => {
  const bonuses = computeTalentBonuses({ c_fury: 3, s_wind: 2, b_leech: 2 })
  assert.equal(bonuses.atkPct, 12)
  assert.equal(bonuses.speedPct, 8)
  assert.ok(bonuses.lifestealPct > 0.02)

  const costLv2 = skillUpgradeCost(2)
  assert.equal(costLv2.skillPoints, 1)
  assert.equal(costLv2.gold, 1000)

  const prevPlayer = game.p
  try {
    newGame('Talented')
    const p = game.p!
    p.gold = 5000
    p.skillPoints = 4
    const baseStats = getStats(p)

    const upTalent = upgradeTalentAction('c_fury')
    assert.equal(upTalent.ok, true)
    assert.equal(p.skillPoints, 3)
    assert.ok(getStats(p).atk > baseStats.atk)

    const firstSkillId = JOBS[p.jobId]?.skills[0]?.id ?? 'power'
    const upSkill = upgradeSkillAction(firstSkillId)
    assert.equal(upSkill.ok, true)
    assert.equal(p.skillLevels?.[firstSkillId], 2)

    const resetRes = resetTalentsAction()
    assert.equal(resetRes.ok, true)
    assert.equal(sanitizeExtV2(p.extV2).talents.c_fury, undefined)

    const savePreset = saveLoadoutAction(0, 'บอสเซ็ต')
    assert.equal(savePreset.ok, true)
    assert.equal(sanitizeExtV2(p.extV2).loadouts[0].name, 'บอสเซ็ต')
  } finally {
    game.p = prevPlayer
  }
})

test('Battle Pass tiers, cosmetics unlock, and pet 1★-5★ evolution work as expected', () => {
  assert.equal(BATTLE_PASS_TIERS.length, 20)
  const bp0 = createDefaultExtV2().battlePass
  const bpRes = grantBattlePassExpToState(bp0, 260)
  assert.equal(bpRes.leveledUp, true)
  assert.equal(bpRes.next.level, 3)

  assert.equal(getPetStarMultiplier(1), 1)
  assert.ok(getPetStarMultiplier(2) > 1.2)
  assert.equal(petEvolveCost(1).essence, 2)

  const prevPlayer = game.p
  try {
    newGame('Collector')
    const p = game.p!
    p.gold = 50000
    p.diamonds = 500

    grantBattlePassExpAction(240)
    assert.equal(sanitizeExtV2(p.extV2).battlePass.level, 3)
    assert.equal(unlockBattlePassPremiumAction().ok, true)
    assert.equal(claimBattlePassTierAction(1, 'free').ok, true)
    assert.equal(claimBattlePassTierAction(1, 'prem').ok, true)
    assert.ok(sanitizeExtV2(p.extV2).unlockedCosmetics.includes('wing_seraph'))

    const unlockWing = unlockCosmeticAction('wing_ember')
    assert.equal(unlockWing.ok, true)
    assert.equal(sanitizeExtV2(p.extV2).equippedWing, 'wing_ember')

    unlockCombatPet('buddy_slime')
    addItem('pet_essence', 5)
    const evolveRes = evolveCombatPetAction('buddy_slime')
    assert.equal(evolveRes.ok, true)
    const petBonuses = getActivePetBonuses(p.petState, p.equippedGemCompanion, p.ownedGemItems)
    assert.ok(petBonuses)
    assert.equal(petBonuses.stars, 2)
    assert.equal(petBonuses.autoLootMagnet, true)
  } finally {
    game.p = prevPlayer
  }
})

test('Offline AFK rewards, world time cycle, beginner guide, and dodge dash operate accurately', () => {
  assert.equal(calculateOfflineAfkRewards(30_000, 10, 'meadow'), null)
  const twoHours = calculateOfflineAfkRewards(120 * 60_000, 10, 'forest')
  assert.ok(twoHours)
  assert.equal(twoHours.elapsedMinutes, 120)
  assert.ok(twoHours.stones >= 2)

  const capped = calculateOfflineAfkRewards(24 * 60 * 60_000, 10, 'forest')
  assert.ok(capped)
  assert.equal(capped.elapsedMinutes, 720)

  const day = getWorldTimePhase(100 * 1000)
  const dusk = getWorldTimePhase(420 * 1000)
  const night = getWorldTimePhase(600 * 1000)
  assert.equal(day.phase, 'day')
  assert.equal(dusk.phase, 'dusk')
  assert.equal(night.phase, 'night')
  assert.equal(night.expBonusPct, 20)

  const prevPlayer = game.p
  try {
    newGame('Rookie')
    const p = game.p!
    assert.equal(BEGINNER_GUIDE_STEPS.length, 6)
    p.kills = 5
    assert.equal(isBeginnerGuideStepReady('guide_kill_5', p), true)
    const guideClaim = claimBeginnerGuideStepAction('guide_kill_5')
    assert.equal(guideClaim.ok, true)
    assert.ok(p.diamonds >= 5)

    game.dashCd = 0
    const dashed = triggerDodgeDash()
    assert.equal(dashed, true)
    assert.ok(game.dashCd > 0)
  } finally {
    game.p = prevPlayer
  }

  assert.equal(FOOD_BUFF_DEFS.length, 4)
})
