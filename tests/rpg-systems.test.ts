import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BESTIARY_TIERS,
  CRAFT_RECIPES,
  DAILY_DUNGEONS,
  RUNE_DEFS,
  SEED_RIVAL_HEROES,
  calculateDailyDungeonRewards,
  calculateDismantleYield,
  canCraftRecipe,
  computeBestiaryAndTitleBonuses,
  computeCombatPower,
  computeEquipmentSetBonuses,
  computeRuneBonuses,
  createDefaultRpgExt,
  evaluateGuardAction,
  evaluateUnlockedTitleIds,
  getActiveWorldBoss,
  getAttackElement,
  getElementMultiplier,
  getGuildBuffs,
  getMonsterElement,
  guildExpToNext,
  recordBestiaryKillInState,
  rollStatusInfliction,
  sanitizeRpgExt,
  simulatePvpBattle,
  todayIsoDate,
} from '../lib/game/rpg-systems'
import { game, getStats, newGame } from '../lib/game/engine'

test('Elemental advantage & status infliction compute expected multipliers and effects', () => {
  assert.equal(getMonsterElement('fire_golem'), 'fire')
  assert.equal(getMonsterElement('slime'), 'ice')
  assert.equal(getElementMultiplier('fire', 'ice').effectiveness, 'super')
  assert.equal(getElementMultiplier('fire', 'ice').multiplier, 1.35)
  assert.equal(getElementMultiplier('ice', 'fire').effectiveness, 'resist')
  assert.equal(getAttackElement('firebolt', {}), 'fire')
  assert.equal(getAttackElement(null, { weapon: 'rune_frost' }), 'ice')

  assert.equal(rollStatusInfliction('firebolt', {}, 0.1), 'burn')
  assert.equal(rollStatusInfliction('blizzard', {}, 0.2), 'freeze')
  assert.equal(rollStatusInfliction('bash', {}, 0.1), 'stun')
  assert.equal(rollStatusInfliction('backstab', {}, 0.2), 'poison')
  assert.equal(rollStatusInfliction('sacred-aegis', {}, 0.99), 'shield')
  assert.equal(rollStatusInfliction(null, { weapon: 'rune_thunder' }, 0.05), 'stun')
})

test('Boss telegraph guard & parry system awards perfect parry, block, or cooldown', () => {
  const parry = evaluateGuardAction(true, 0.72, 0)
  assert.equal(parry.outcome, 'perfect_counter')
  assert.equal(parry.damageFactor, 0)
  assert.equal(parry.counterMultiplier, 1.85)

  const block = evaluateGuardAction(false, 0.2, 0)
  assert.equal(block.outcome, 'blocked')
  assert.equal(block.damageFactor, 0.25)

  const onCd = evaluateGuardAction(true, 0.9, 1.2)
  assert.equal(onCd.outcome, 'cooldown')
  assert.equal(onCd.damageFactor, 1)
})

test('Crafting & dismantle calculate materials, stones, gold, and bonus runes accurately', () => {
  const redRecipe = CRAFT_RECIPES.find((r) => r.id === 'craft_red_potion')!
  assert.ok(redRecipe)
  assert.equal(canCraftRecipe(redRecipe, [], 1000).ok, false)
  assert.equal(
    canCraftRecipe(
      redRecipe,
      [
        { uid: 'i1', itemId: 'slime_gel', qty: 2, plus: 0 },
        { uid: 'i2', itemId: 'torn_cloth', qty: 1, plus: 0 },
      ],
      redRecipe.goldCost,
    ).ok,
    true,
  )

  const flameYield = calculateDismantleYield({ uid: 'w1', itemId: 'flame_sword', qty: 1, plus: 4 })
  assert.ok(flameYield.stones >= 6)
  assert.ok(flameYield.gold > 0)
  assert.equal(flameYield.bonusRuneId, 'rune_vampiric')
})

test('Bestiary tracking unlocks titles and accumulates passive and active stat bonuses', () => {
  let ext = createDefaultRpgExt(new Date('2026-05-01T12:00:00Z'))
  for (let i = 0; i < 10; i++) {
    ext = recordBestiaryKillInState(ext, 'slime')
  }
  assert.equal(ext.bestiary.slime, 10)
  assert.ok(ext.titles.includes('slime_hunter'))

  ext.claimedBestiaryTiers.slime = 1
  ext.activeTitle = 'slime_hunter'
  const bonuses = computeBestiaryAndTitleBonuses(ext)
  assert.ok(bonuses.hpBonus >= BESTIARY_TIERS[0].hp + 20)
  assert.ok(bonuses.atkBonus >= BESTIARY_TIERS[0].atk + 5)

  const unlockedRebirth = evaluateUnlockedTitleIds({
    kills: 100,
    rebirthCount: 6,
    rpgExt: ext,
  })
  assert.ok(unlockedRebirth.includes('reborn_ascendant'))
  assert.ok(unlockedRebirth.includes('celestial_legend'))
})

test('Rune socketing and equipment set bonuses aggregate into character stats', () => {
  const ext = createDefaultRpgExt()
  ext.equippedRunes = {
    weapon: 'rune_vampiric',
    armor: 'rune_guardian',
  }
  const runeBonuses = computeRuneBonuses(ext)
  assert.equal(runeBonuses.lifestealPct, 5)
  assert.equal(runeBonuses.atkBonus, RUNE_DEFS.rune_vampiric.atkBonus + RUNE_DEFS.rune_guardian.atkBonus)

  const setBonuses = computeEquipmentSetBonuses({
    weapon: { uid: 'w', itemId: 'flame_sword', qty: 1, plus: 0 },
    armor: { uid: 'a', itemId: 'dragon_armor', qty: 1, plus: 0 },
    shoes: { uid: 's', itemId: 'leather_boots', qty: 1, plus: 0 },
    cloak: { uid: 'c', itemId: 'knight_cloak', qty: 1, plus: 0 },
    accessory: { uid: 'x', itemId: 'ruby_ring', qty: 1, plus: 0 },
  })
  assert.equal(setBonuses.equippedCount, 5)
  assert.ok(setBonuses.tier4Count >= 2)
  assert.ok(setBonuses.atkBonus >= 94)

  // Verify live engine getStats integrates rpgExt bonuses
  const prevPlayer = game.p
  try {
    newGame('Tester')
    const baseStats = getStats(game.p!)
    game.p!.rpgExt = ext
    const buffedStats = getStats(game.p!)
    assert.ok(buffedStats.atk > baseStats.atk)
    assert.ok(buffedStats.maxHp > baseStats.maxHp)
    assert.ok(buffedStats.def > baseStats.def)
  } finally {
    game.p = prevPlayer
  }
})

test('Guild buffs, world boss hourly rotation, combat power, PvP simulation, and daily dungeons work deterministically', () => {
  const buffs = getGuildBuffs(5)
  assert.equal(buffs.atkPct, 13)
  assert.equal(buffs.expPct, 15)
  assert.ok(guildExpToNext(5) > guildExpToNext(1))

  const boss = getActiveWorldBoss(Date.UTC(2026, 4, 10, 14, 30, 0))
  assert.ok(boss.cycleKey.startsWith(boss.bossId))
  assert.equal(boss.milestones.length, 4)

  const cp = computeCombatPower(
    { level: 30, rebirthCount: 2 },
    { maxHp: 1200, atk: 240, def: 120, crit: 0.25 },
  )
  assert.ok(cp > 2000)

  const rival = SEED_RIVAL_HEROES[SEED_RIVAL_HEROES.length - 1]
  const pvpWin = simulatePvpBattle(
    { name: 'Hero', jobId: 'knight', maxHp: 1500, atk: 260, def: 140, crit: 0.3 },
    rival,
    () => 0.4,
  )
  assert.equal(pvpWin.won, true)
  assert.equal(pvpWin.ratingDelta, 25)
  assert.ok(pvpWin.rounds.length >= 1)

  const dungeon = DAILY_DUNGEONS[0]
  const reward = calculateDailyDungeonRewards(dungeon, 15, 1)
  assert.ok(reward.gold > dungeon.baseGold)

  const oldDate = new Date('2026-05-01T10:00:00Z')
  const newDate = new Date('2026-05-02T10:00:00Z')
  const oldExt = createDefaultRpgExt(oldDate)
  oldExt.dailyDungeonRuns.gold_vault = 3
  const resetExt = sanitizeRpgExt(oldExt, newDate)
  assert.equal(resetExt.dailyDungeonDate, todayIsoDate(newDate))
  assert.equal(resetExt.dailyDungeonRuns.gold_vault, 0)
})
