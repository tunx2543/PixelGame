import test from 'node:test'
import assert from 'node:assert/strict'
import { ITEMS } from './data'
import { EQUIPMENT_RARITY_ORDER } from './mmo-systems'
import {
  CHEST_TIERS,
  CHEST_TIER_ORDER,
  DAILY_FREE_CHEST_COOLDOWN_MS,
  DAILY_FREE_CHEST_TIER_ID,
  calculateChestRarityProbabilities,
  canClaimDailyFreeChest,
  claimDailyFreeTreasureChest,
  formatCooldownDuration,
  getDailyFreeChestStatus,
  openMultipleTreasureChests,
  openTreasureChest,
  rollChestRarity,
  rollTreasureChestReward,
  summarizeTreasureChestRewards,
} from './treasure-chest'

function makeDeterministicRng(seed = 0.42): () => number {
  let state = Math.floor(seed * 100000) || 12345
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

test('calculateChestRarityProbabilities sums to 100% and enforces minRarity floor', () => {
  for (const tierId of CHEST_TIER_ORDER) {
    const tierDef = CHEST_TIERS[tierId]
    const minIdx = EQUIPMENT_RARITY_ORDER.indexOf(tierDef.minRarity)
    const odds = calculateChestRarityProbabilities(tierId)

    assert.equal(odds.length, EQUIPMENT_RARITY_ORDER.length)
    const totalPct = odds.reduce((sum, entry) => sum + entry.percentage, 0)
    assert.ok(Math.abs(totalPct - 100) < 0.2, `Tier ${tierId} summed to ${totalPct}%`)

    odds.forEach((entry, idx) => {
      if (idx < minIdx) {
        assert.equal(entry.percentage, 0)
        assert.equal(entry.isAvailable, false)
      }
    })
  }

  // Verify Mythic chest specific distribution (Epic 46%, Legendary 36%, Mythic 18%)
  const mythicOdds = Object.fromEntries(
    calculateChestRarityProbabilities('mythic').map((o) => [o.rarity, o.percentage]),
  )
  assert.equal(mythicOdds.common, 0)
  assert.equal(mythicOdds.rare, 0)
  assert.equal(mythicOdds.epic, 46)
  assert.equal(mythicOdds.legendary, 36)
  assert.equal(mythicOdds.mythic, 18)

  // Verify normalization for non-100 custom weights and zero-weight fallback
  const customOdds = calculateChestRarityProbabilities({
    ...CHEST_TIERS.silver,
    minRarity: 'rare',
    rarityWeights: { common: 100, uncommon: 100, rare: 3, epic: 1, legendary: 0, mythic: 0 },
  })
  const rareEntry = customOdds.find((o) => o.rarity === 'rare')
  const epicEntry = customOdds.find((o) => o.rarity === 'epic')
  const commonEntry = customOdds.find((o) => o.rarity === 'common')
  assert.equal(commonEntry?.percentage, 0)
  assert.equal(rareEntry?.percentage, 75)
  assert.equal(epicEntry?.percentage, 25)

  const zeroFallback = calculateChestRarityProbabilities({
    ...CHEST_TIERS.golden,
    minRarity: 'legendary',
    rarityWeights: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, mythic: 0 },
  })
  assert.equal(zeroFallback.find((o) => o.rarity === 'legendary')?.percentage, 100)
})

test('rollChestRarity never drops below the chest tier minRarity', () => {
  for (const tierId of CHEST_TIER_ORDER) {
    const tierDef = CHEST_TIERS[tierId]
    const minIdx = EQUIPMENT_RARITY_ORDER.indexOf(tierDef.minRarity)
    const rng = makeDeterministicRng(0.17)
    for (let i = 0; i < 40; i++) {
      const rolled = rollChestRarity(tierDef, rng)
      const idx = EQUIPMENT_RARITY_ORDER.indexOf(rolled)
      assert.ok(
        idx >= minIdx,
        `Tier ${tierId} rolled ${rolled} which is below minRarity ${tierDef.minRarity}`,
      )
    }
  }
})

test('rollTreasureChestReward delegates to generateRandomItem and honors category filter', () => {
  const rng = makeDeterministicRng(0.73)
  const reward = rollTreasureChestReward({
    tierId: 'golden',
    category: 'weapon',
    playerLevel: 85,
    rng,
  })

  assert.equal(reward.chestTierId, 'golden')
  assert.equal(reward.item.category, 'weapon')
  assert.ok(reward.item.imagePath.startsWith('/assets/items/weapons/'))
  assert.ok(ITEMS[reward.item.itemId])
  assert.ok(reward.item.plus >= 2 && reward.item.plus <= 6)
  assert.ok(reward.goldBonus >= 800 && reward.goldBonus <= 2000)
})

test('openTreasureChest rejects insufficient gold and never goes negative', () => {
  const res = openTreasureChest({
    tierId: 'mythic',
    paymentMode: 'gold',
    gold: 1200,
    inventory: [],
    maxInventorySlots: 40,
    rng: makeDeterministicRng(0.5),
  })

  assert.equal(res.ok, false)
  assert.match(res.error ?? '', /ทองคำไม่พอ/)
  assert.equal(res.nextGold, 1200)
  assert.equal(res.nextInventory.length, 0)
})

test('openTreasureChest deducts imperial_gold_key when paymentMode is key and adds item + gold bonus', () => {
  const res = openTreasureChest({
    tierId: 'golden',
    paymentMode: 'key',
    playerLevel: 90,
    gold: 500,
    inventory: [
      { uid: 'k1', itemId: 'imperial_gold_key', qty: 2, plus: 0 },
    ],
    maxInventorySlots: 40,
    rng: makeDeterministicRng(0.31),
  })

  assert.equal(res.ok, true)
  assert.ok(res.reward)
  assert.equal(res.reward.spentGold, 0)
  assert.equal(res.reward.spentKeyId, 'imperial_gold_key')
  assert.equal(res.reward.spentKeyQty, 1)
  assert.equal(res.nextGold, 500 + res.reward.goldBonus)

  const remainingKey = res.nextInventory.find((i) => i.itemId === 'imperial_gold_key')
  assert.equal(remainingKey?.qty, 1)

  const rolledItem = res.nextInventory.find((i) => i.uid === res.reward!.item.uid)
  assert.ok(rolledItem, 'Expected newly generated chest item to be added to inventory')
  assert.equal(rolledItem.itemId, res.reward.item.itemId)
  assert.equal(rolledItem.rarity, res.reward.item.rarity)
})

test('openTreasureChest rejects when bag is full', () => {
  const fullBag = Array.from({ length: 10 }, (_, idx) => ({
    uid: `item_${idx}`,
    itemId: 'lv1_sword',
    qty: 1,
    plus: 0,
  }))

  const res = openTreasureChest({
    tierId: 'wooden',
    gold: 1000,
    inventory: fullBag,
    maxInventorySlots: 10,
    rng: makeDeterministicRng(0.9),
  })

  assert.equal(res.ok, false)
  assert.match(res.error ?? '', /กระเป๋าเต็ม/)
  assert.equal(res.nextInventory.length, 10)
})

test('openMultipleTreasureChests executes 10 sequential rolls and summarizes rewards accurately', () => {
  const res = openMultipleTreasureChests({
    tierId: 'wooden',
    gold: 300,
    inventory: [],
    maxInventorySlots: 40,
    count: 10,
    rng: makeDeterministicRng(0.61),
  })

  assert.equal(res.ok, true)
  assert.equal(res.rewards.length, 10)
  assert.equal(res.stoppedEarlyReason, undefined)
  assert.equal(res.totalSpentGold, 0)
  assert.equal(res.nextGold, 300 + res.totalGoldBonus)
  assert.ok(res.nextInventory.length <= 10 && res.nextInventory.length >= 1)

  const summary = summarizeTreasureChestRewards(res.rewards)
  assert.equal(summary.totalCount, 10)
  assert.equal(summary.totalGoldBonus, res.totalGoldBonus)
  const countSum = Object.values(summary.rarityCounts).reduce((a, b) => a + b, 0)
  assert.equal(countSum, 10)
  assert.ok(EQUIPMENT_RARITY_ORDER.includes(summary.highestRarity))
})

test('openMultipleTreasureChests stops cleanly mid-sequence if bag fills up or gold runs out', () => {
  const res = openMultipleTreasureChests({
    tierId: 'silver',
    paymentMode: 'gold',
    gold: 1300, // Enough for 2 chests (600 G each), 3rd depends on gold bonus but < 6000 G for 10
    inventory: [],
    maxInventorySlots: 3, // Hard cap at 3 items
    count: 10,
    rng: makeDeterministicRng(0.27),
  })

  assert.equal(res.ok, true)
  assert.ok(res.rewards.length >= 2 && res.rewards.length <= 3)
  assert.ok(res.stoppedEarlyReason, 'Expected stoppedEarlyReason when stopping before 10 pulls')
  assert.ok(res.nextGold >= 0)
  assert.ok(res.nextInventory.length <= 3)
})

test('daily free chest eligibility, 24h cooldown enforcement, and free standard chest reward claim', () => {
  const t0 = 1_700_000_000_000

  // Never claimed -> ready immediately
  assert.equal(canClaimDailyFreeChest(undefined, t0), true)
  assert.equal(getDailyFreeChestStatus(null, t0).remainingMs, 0)
  assert.equal(formatCooldownDuration(DAILY_FREE_CHEST_COOLDOWN_MS), '24:00:00')

  // Claim first free standard chest without spending gold or keys
  const claim1 = claimDailyFreeTreasureChest({
    lastClaimedAt: undefined,
    now: t0,
    playerLevel: 25,
    gold: 100,
    inventory: [],
    maxInventorySlots: 40,
    rng: makeDeterministicRng(0.45),
  })

  assert.equal(claim1.ok, true)
  assert.ok(claim1.reward)
  assert.equal(claim1.reward.chestTierId, DAILY_FREE_CHEST_TIER_ID)
  assert.equal(claim1.reward.spentGold, 0)
  assert.equal(claim1.reward.spentKeyQty, 0)
  assert.equal(claim1.nextClaimedAt, t0)
  assert.equal(claim1.nextGold, 100 + claim1.reward.goldBonus)
  assert.equal(claim1.nextInventory.length, 1)

  // Within 24h (12 hours later) -> rejected with remaining cooldown
  const t12h = t0 + 12 * 60 * 60 * 1000
  assert.equal(canClaimDailyFreeChest(claim1.nextClaimedAt, t12h), false)
  const status12h = getDailyFreeChestStatus(claim1.nextClaimedAt, t12h)
  assert.equal(status12h.remainingMs, 12 * 60 * 60 * 1000)
  assert.equal(formatCooldownDuration(status12h.remainingMs), '12:00:00')

  const claimEarly = claimDailyFreeTreasureChest({
    lastClaimedAt: claim1.nextClaimedAt,
    now: t12h,
    playerLevel: 25,
    gold: claim1.nextGold,
    inventory: claim1.nextInventory,
    maxInventorySlots: 40,
    rng: makeDeterministicRng(0.45),
  })
  assert.equal(claimEarly.ok, false)
  assert.match(claimEarly.error ?? '', /12:00:00/)
  assert.equal(claimEarly.nextInventory.length, 1)

  // Exactly 24h later -> eligible again
  const t24h = t0 + DAILY_FREE_CHEST_COOLDOWN_MS
  assert.equal(canClaimDailyFreeChest(claim1.nextClaimedAt, t24h), true)
  const claim2 = claimDailyFreeTreasureChest({
    lastClaimedAt: claim1.nextClaimedAt,
    now: t24h,
    playerLevel: 25,
    gold: claim1.nextGold,
    inventory: claim1.nextInventory,
    maxInventorySlots: 40,
    rng: makeDeterministicRng(0.88),
  })
  assert.equal(claim2.ok, true)
  assert.equal(claim2.nextClaimedAt, t24h)
})
