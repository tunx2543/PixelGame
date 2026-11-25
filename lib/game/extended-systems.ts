import { ITEMS, type EquipmentSlot, type ItemDef } from './data'
import {
  createDefaultFestivalPlayerState,
  sanitizeFestivalPlayerState,
  type FestivalPlayerState,
} from './festival-events'
import {
  createDefaultSpiritAwakeningState,
  sanitizeSpiritAwakeningState,
  type SpiritAwakeningState,
} from './spirit-system'

/* ========================================================================== */
/* 1. LIFE SKILLS, GATHERING NODES & COOKING                                  */
/* ========================================================================== */

export type LifeSkillType = 'fishing' | 'mining' | 'herbalism'

export interface LifeSkillProgress {
  level: number
  exp: number
}

export interface GatheringNodeDef {
  id: string
  mapId: string
  tx: number
  ty: number
  skill: LifeSkillType
  label: string
  color: string
  rewards: Array<{ itemId: string; chance: number; minQty: number; maxQty: number }>
  rareEssenceChance: number
}

export interface FoodBuffDef {
  itemId: string
  name: string
  durationSec: number
  atkPct: number
  defPct: number
  critBonus: number
  expMul: number
  ingredients: Array<{ itemId: string; qty: number }>
  goldCost: number
}

export interface ActiveFoodBuff {
  itemId: string
  name: string
  expiresAtMs: number
  atkPct: number
  defPct: number
  critBonus: number
  expMul: number
}

export type ActiveBoostKind = 'exp' | 'jp' | 'lifeskill' | 'speed' | 'weight' | 'stat'

export interface ActiveBoostBuff {
  id: string
  kind: ActiveBoostKind
  label: string
  shortTag: string
  value: number
  expiresAtMs: number
  color: string
}

export const LIFE_SKILL_META: Record<LifeSkillType, { label: string; color: string; actionLabel: string }> = {
  fishing: { label: 'ตกปลา', color: '#38bdf8', actionLabel: 'เหวี่ยงเบ็ดตกปลา' },
  mining: { label: 'ขุดแร่', color: '#94a3b8', actionLabel: 'ขุดสายแร่' },
  herbalism: { label: 'เก็บสมุนไพร', color: '#4ade80', actionLabel: 'เก็บสมุนไพร' },
}

export const GATHERING_NODES: GatheringNodeDef[] = [
  {
    id: 'town_pond_fishing',
    mapId: 'town',
    tx: 13,
    ty: 25,
    skill: 'fishing',
    label: 'จุดตกปลาลำธารเมือง',
    color: '#38bdf8',
    rewards: [
      { itemId: 'fish_silver', chance: 0.78, minQty: 1, maxQty: 2 },
      { itemId: 'fish_golden', chance: 0.25, minQty: 1, maxQty: 1 },
    ],
    rareEssenceChance: 0.08,
  },
  {
    id: 'meadow_herb_patch',
    mapId: 'meadow',
    tx: 14,
    ty: 11,
    skill: 'herbalism',
    label: 'ดงสมุนไพรทุ่งเขียว',
    color: '#4ade80',
    rewards: [
      { itemId: 'herb_green', chance: 0.85, minQty: 1, maxQty: 3 },
      { itemId: 'red_potion', chance: 0.25, minQty: 1, maxQty: 1 },
    ],
    rareEssenceChance: 0.06,
  },
  {
    id: 'forest_moon_herb',
    mapId: 'forest',
    tx: 22,
    ty: 18,
    skill: 'herbalism',
    label: 'พุ่มดอกจันทร์กลางป่า',
    color: '#c084fc',
    rewards: [
      { itemId: 'herb_green', chance: 0.7, minQty: 1, maxQty: 2 },
      { itemId: 'herb_moon', chance: 0.45, minQty: 1, maxQty: 1 },
    ],
    rareEssenceChance: 0.12,
  },
  {
    id: 'cave_iron_vein',
    mapId: 'cave',
    tx: 18,
    ty: 14,
    skill: 'mining',
    label: 'สายแร่เหล็กถ้ำมืด',
    color: '#94a3b8',
    rewards: [
      { itemId: 'ore_iron', chance: 0.85, minQty: 1, maxQty: 3 },
      { itemId: 'enhance_stone', chance: 0.22, minQty: 1, maxQty: 1 },
    ],
    rareEssenceChance: 0.1,
  },
  {
    id: 'volcano_mythril_vein',
    mapId: 'volcano',
    tx: 21,
    ty: 15,
    skill: 'mining',
    label: 'แร่มิธริลภูเขาไฟ',
    color: '#fb923c',
    rewards: [
      { itemId: 'ore_iron', chance: 0.6, minQty: 1, maxQty: 2 },
      { itemId: 'ore_mythril', chance: 0.55, minQty: 1, maxQty: 2 },
    ],
    rareEssenceChance: 0.15,
  },
  {
    id: 'frost_ice_pond',
    mapId: 'snow',
    tx: 16,
    ty: 16,
    skill: 'fishing',
    label: 'บ่อน้ำแข็งปลาเทพ',
    color: '#67e8f9',
    rewards: [
      { itemId: 'fish_golden', chance: 0.55, minQty: 1, maxQty: 2 },
      { itemId: 'herb_moon', chance: 0.35, minQty: 1, maxQty: 1 },
    ],
    rareEssenceChance: 0.18,
  },
]

export const FOOD_BUFF_DEFS: FoodBuffDef[] = [
  {
    itemId: 'food_grilled_fish',
    name: 'ปลาย่างสมุนไพร',
    durationSec: 300,
    atkPct: 12,
    defPct: 0,
    critBonus: 0.03,
    expMul: 1,
    ingredients: [
      { itemId: 'fish_silver', qty: 2 },
      { itemId: 'herb_green', qty: 1 },
    ],
    goldCost: 60,
  },
  {
    itemId: 'food_miner_tonic',
    name: 'ยาชูกำลังนักขุด',
    durationSec: 300,
    atkPct: 0,
    defPct: 15,
    critBonus: 0,
    expMul: 1.1,
    ingredients: [
      { itemId: 'ore_iron', qty: 2 },
      { itemId: 'herb_green', qty: 2 },
    ],
    goldCost: 80,
  },
  {
    itemId: 'food_hero_feast',
    name: 'ชุดอาหารผู้กล้า',
    durationSec: 480,
    atkPct: 18,
    defPct: 10,
    critBonus: 0.08,
    expMul: 1.25,
    ingredients: [
      { itemId: 'fish_golden', qty: 1 },
      { itemId: 'herb_moon', qty: 1 },
    ],
    goldCost: 220,
  },
  {
    itemId: 'food_dragon_soup',
    name: 'ซุปมังกรศิลา',
    durationSec: 600,
    atkPct: 25,
    defPct: 20,
    critBonus: 0.1,
    expMul: 1.35,
    ingredients: [
      { itemId: 'fish_golden', qty: 2 },
      { itemId: 'ore_mythril', qty: 1 },
      { itemId: 'herb_moon', qty: 1 },
    ],
    goldCost: 420,
  },
]

export function lifeSkillExpToNext(level: number): number {
  return 25 + level * level * 12
}

export function findNearbyGatheringNode(mapId: string, px: number, py: number, maxDistPx = 42): GatheringNodeDef | null {
  let best: GatheringNodeDef | null = null
  let bestDist = maxDistPx
  for (const node of GATHERING_NODES) {
    if (node.mapId !== mapId) continue
    const nx = (node.tx + 0.5) * 16
    const ny = (node.ty + 0.5) * 16
    const d = Math.hypot(nx - px, ny - py)
    if (d <= bestDist) {
      bestDist = d
      best = node
    }
  }
  return best
}

export function rollGatheringDrops(
  node: GatheringNodeDef,
  skillLevel: number,
  rng: () => number = Math.random,
): { items: Array<{ itemId: string; qty: number }>; expGain: number; gotEssence: boolean } {
  const items: Array<{ itemId: string; qty: number }> = []
  const bonusChance = Math.min(0.25, (skillLevel - 1) * 0.015)

  for (const r of node.rewards) {
    if (rng() <= r.chance + bonusChance) {
      const span = r.maxQty - r.minQty + 1
      const qty = r.minQty + Math.floor(rng() * span) + (skillLevel >= 10 && rng() < 0.25 ? 1 : 0)
      items.push({ itemId: r.itemId, qty })
    }
  }
  if (items.length === 0) {
    const fallback = node.rewards[0]
    items.push({ itemId: fallback.itemId, qty: 1 })
  }

  const gotEssence = rng() <= node.rareEssenceChance + bonusChance * 0.4
  if (gotEssence) {
    items.push({ itemId: 'pet_essence', qty: 1 })
  }

  return {
    items,
    expGain: 14 + skillLevel * 3,
    gotEssence,
  }
}

export function getActiveFoodBuffBonuses(buff: ActiveFoodBuff | null | undefined, nowMs = Date.now()) {
  if (!buff || buff.expiresAtMs <= nowMs) {
    return { active: false, atkPct: 0, defPct: 0, critBonus: 0, expMul: 1, remainingSec: 0 }
  }
  return {
    active: true,
    atkPct: buff.atkPct,
    defPct: buff.defPct,
    critBonus: buff.critBonus,
    expMul: buff.expMul,
    remainingSec: Math.max(0, Math.ceil((buff.expiresAtMs - nowMs) / 1000)),
  }
}

/* ========================================================================== */
/* 2. TALENT TREE & SKILL UPGRADES                                            */
/* ========================================================================== */

export type TalentBranch = 'crimson' | 'bastion' | 'swift'

export interface TalentNodeDef {
  id: string
  branch: TalentBranch
  name: string
  description: string
  maxRank: number
  atkPctPerRank?: number
  defPctPerRank?: number
  hpPctPerRank?: number
  critPerRank?: number
  lifestealPerRank?: number
  speedPctPerRank?: number
  expPctPerRank?: number
  goldPctPerRank?: number
}

export const TALENT_BRANCH_META: Record<TalentBranch, { name: string; color: string; desc: string }> = {
  crimson: { name: 'สายล่าสังหาร (Crimson)', color: '#fb7185', desc: 'เพิ่มพลังโจมตีและโอกาสคริติคอลสูงสุด' },
  bastion: { name: 'สายปราการเหล็ก (Bastion)', color: '#60a5fa', desc: 'เสริมเลือด ป้องกัน และดูดเลือดระหว่างสู้' },
  swift: { name: 'สายลมฟาร์มไว (Swift)', color: '#34d399', desc: 'เพิ่มความเร็วเคลื่อนที่ EXP และทองดรอป' },
}

export const TALENT_NODES: TalentNodeDef[] = [
  { id: 'c_fury', branch: 'crimson', name: 'คมดาบคลั่ง', description: 'เพิ่ม ATK +4% ต่อขั้น', maxRank: 5, atkPctPerRank: 4 },
  { id: 'c_precision', branch: 'crimson', name: 'ตาเหยี่ยวสังหาร', description: 'เพิ่มโอกาสคริติคอล +2.5% ต่อขั้น', maxRank: 5, critPerRank: 0.025 },
  { id: 'c_execute', branch: 'crimson', name: 'จิตสังหารราชันย์', description: 'เพิ่ม ATK +5% และ คริติคอล +1.5% ต่อขั้น', maxRank: 5, atkPctPerRank: 5, critPerRank: 0.015 },
  { id: 'b_vitality', branch: 'bastion', name: 'กายาเหล็กกล้า', description: 'เพิ่ม HP สูงสุด +5% ต่อขั้น', maxRank: 5, hpPctPerRank: 5 },
  { id: 'b_bulwark', branch: 'bastion', name: 'โล่พิทักษ์โบราณ', description: 'เพิ่ม DEF +5% ต่อขั้น', maxRank: 5, defPctPerRank: 5 },
  { id: 'b_leech', branch: 'bastion', name: 'ชีพจรดูดวิญญาณ', description: 'ดูดเลือด +1.2% ของดาเมจ ต่อขั้น', maxRank: 5, lifestealPerRank: 0.012 },
  { id: 's_wind', branch: 'swift', name: 'ก้าวพริบตา', description: 'เพิ่มความเร็วเดิน +4% ต่อขั้น', maxRank: 5, speedPctPerRank: 4 },
  { id: 's_wisdom', branch: 'swift', name: 'ปราชญ์นักผจญภัย', description: 'เพิ่ม EXP ที่ได้รับ +6% ต่อขั้น', maxRank: 5, expPctPerRank: 6 },
  { id: 's_fortune', branch: 'swift', name: 'โชคลาภพ่อค้า', description: 'เพิ่มทองที่ได้รับ +8% ต่อขั้น', maxRank: 5, goldPctPerRank: 8 },
]

export const MAX_SKILL_UPGRADE = 5

export function skillUpgradeCost(currentLevel: number): { skillPoints: number; gold: number } {
  const lv = Math.max(1, Math.floor(currentLevel))
  return {
    skillPoints: 1,
    gold: 250 * lv * lv,
  }
}

export function computeTalentBonuses(talents: Record<string, number> | undefined) {
  let atkPct = 0
  let defPct = 0
  let hpPct = 0
  let critBonus = 0
  let lifestealPct = 0
  let speedPct = 0
  let expPct = 0
  let goldPct = 0

  if (talents) {
    for (const node of TALENT_NODES) {
      const rank = Math.max(0, Math.min(node.maxRank, Math.floor(Number(talents[node.id] ?? 0) || 0)))
      if (rank <= 0) continue
      atkPct += (node.atkPctPerRank ?? 0) * rank
      defPct += (node.defPctPerRank ?? 0) * rank
      hpPct += (node.hpPctPerRank ?? 0) * rank
      critBonus += (node.critPerRank ?? 0) * rank
      lifestealPct += (node.lifestealPerRank ?? 0) * rank
      speedPct += (node.speedPctPerRank ?? 0) * rank
      expPct += (node.expPctPerRank ?? 0) * rank
      goldPct += (node.goldPctPerRank ?? 0) * rank
    }
  }

  return {
    atkPct,
    defPct,
    hpPct,
    critBonus,
    lifestealPct,
    speedPct,
    expMul: 1 + expPct / 100,
    goldMul: 1 + goldPct / 100,
  }
}

/* ========================================================================== */
/* 3. BATTLE PASS (SEASON PASS)                                               */
/* ========================================================================== */

export interface BattlePassTierDef {
  level: number
  freeReward: { label: string; gold?: number; diamonds?: number; stones?: number; itemId?: string; cosmeticId?: string; qty?: number }
  premReward: { label: string; gold?: number; diamonds?: number; stones?: number; itemId?: string; cosmeticId?: string; qty?: number }
}

export interface ExpiredPassReward {
  archiveId: string
  seasonId: string
  level: number
  track: 'free' | 'prem'
  label: string
  gold?: number
  diamonds?: number
  stones?: number
  itemId?: string
  cosmeticId?: string
  qty?: number
  archivedAtMs: number
}

export interface BattlePassState {
  seasonId: string
  seasonName?: string
  seasonStartAtMs?: number
  seasonEndAtMs?: number
  level: number
  exp: number
  premiumUnlocked: boolean
  claimedFree: number[]
  claimedPrem: number[]
  expiredArchive?: ExpiredPassReward[]
}

export const BP_MAX_LEVEL = 20
export const BP_EXP_PER_LEVEL = 120
export const BP_PREMIUM_DIAMOND_COST = 120
export const CURRENT_BP_SEASON_ID = 'season_aurora_2026'
export const CURRENT_BP_SEASON_META = {
  seasonId: CURRENT_BP_SEASON_ID,
  seasonName: 'Aurora Expedition 2026',
  seasonStartAtMs: Date.UTC(2026, 0, 1, 0, 0, 0),
  seasonEndAtMs: Date.UTC(2026, 11, 31, 23, 59, 59),
}

export function archiveExpiredBattlePassRewards(prevBp: Partial<BattlePassState>, existingArchive: ExpiredPassReward[] = []): ExpiredPassReward[] {
  const archive = [...existingArchive]
  const prevSeasonId = typeof prevBp.seasonId === 'string' && prevBp.seasonId ? prevBp.seasonId : 'previous_season'
  const reachedLevel = Math.max(1, Math.min(BP_MAX_LEVEL, Math.floor(Number(prevBp.level ?? 1) || 1)))
  const claimedFree = Array.isArray(prevBp.claimedFree) ? prevBp.claimedFree : []
  const claimedPrem = Array.isArray(prevBp.claimedPrem) ? prevBp.claimedPrem : []
  const premUnlocked = Boolean(prevBp.premiumUnlocked)
  const nowMs = Date.now()

  for (const tier of BATTLE_PASS_TIERS) {
    if (tier.level > reachedLevel) continue
    if (!claimedFree.includes(tier.level)) {
      const id = `${prevSeasonId}:free:${tier.level}`
      if (!archive.some((a) => a.archiveId === id)) {
        archive.push({
          archiveId: id,
          seasonId: prevSeasonId,
          level: tier.level,
          track: 'free',
          ...tier.freeReward,
          archivedAtMs: nowMs,
        })
      }
    }
    if (premUnlocked && !claimedPrem.includes(tier.level)) {
      const id = `${prevSeasonId}:prem:${tier.level}`
      if (!archive.some((a) => a.archiveId === id)) {
        archive.push({
          archiveId: id,
          seasonId: prevSeasonId,
          level: tier.level,
          track: 'prem',
          ...tier.premReward,
          archivedAtMs: nowMs,
        })
      }
    }
  }
  return archive.slice(-60)
}

export const BATTLE_PASS_TIERS: BattlePassTierDef[] = Array.from({ length: BP_MAX_LEVEL }, (_, idx) => {
  const lv = idx + 1
  const freeReward =
    lv % 5 === 0
      ? { label: `เพชร x${10 + lv}`, diamonds: 10 + lv, stones: 2 }
      : lv % 2 === 0
        ? { label: `หินตีบวก x${1 + Math.floor(lv / 6)}`, stones: 1 + Math.floor(lv / 6) }
        : { label: `ทอง ${lv * 250} G`, gold: lv * 250 }

  const premReward =
    lv === 1
      ? { label: 'สกินอาวุธซากุระ + เพชร x25', cosmeticId: 'wskin_sakura', diamonds: 25 }
      : lv === 10
        ? { label: 'สกินดาบดารา + เพชร x35', cosmeticId: 'wskin_starlight', diamonds: 35 }
        : lv === 20
          ? { label: 'สกินอาวุธห้วงอเวจี + เพชร x80', cosmeticId: 'wskin_void', diamonds: 80 }
          : lv % 4 === 0
            ? { label: `ผลึกคู่หู x${2 + Math.floor(lv / 5)} + เพชร x15`, itemId: 'pet_essence', qty: 2 + Math.floor(lv / 5), diamonds: 15 }
            : { label: `ทอง ${lv * 600} G + หิน x2`, gold: lv * 600, stones: 2 }

  return { level: lv, freeReward, premReward }
})

export function grantBattlePassExpToState(state: BattlePassState, gain: number): { next: BattlePassState; leveledUp: boolean } {
  const next: BattlePassState = {
    ...state,
    claimedFree: [...state.claimedFree],
    claimedPrem: [...state.claimedPrem],
  }
  if (next.level >= BP_MAX_LEVEL || gain <= 0) return { next, leveledUp: false }
  let leveledUp = false
  next.exp += Math.round(gain)
  while (next.level < BP_MAX_LEVEL && next.exp >= BP_EXP_PER_LEVEL) {
    next.exp -= BP_EXP_PER_LEVEL
    next.level += 1
    leveledUp = true
  }
  if (next.level >= BP_MAX_LEVEL) next.exp = 0
  return { next, leveledUp }
}

/* ========================================================================== */
/* 4. COSMETICS & WARDROBE (WINGS / WEAPON SKINS / FRAMES)                    */
/* ========================================================================== */

export type CosmeticSlot = 'wing' | 'weaponSkin' | 'frame'

export interface CosmeticDef {
  id: string
  slot: CosmeticSlot
  name: string
  description: string
  primaryColor: string
  secondaryColor: string
  diamondCost: number
  goldCost?: number
}

export const COSMETIC_DEFS: CosmeticDef[] = [
  {
    id: 'wskin_starlight',
    slot: 'weaponSkin',
    name: 'สกินอาวุธแสงดารา',
    description: 'เปลี่ยนสีเอฟเฟกต์ฟันอาวุธเป็นประกายฟ้าดารา',
    primaryColor: '#38bdf8',
    secondaryColor: '#bae6fd',
    diamondCost: 35,
  },
  {
    id: 'wskin_sakura',
    slot: 'weaponSkin',
    name: 'สกินอาวุธซากุระ',
    description: 'เปลี่ยนสีเอฟเฟกต์อาวุธเป็นกลีบดอกซากุระ',
    primaryColor: '#f472b6',
    secondaryColor: '#fbcfe8',
    diamondCost: 35,
  },
  {
    id: 'wskin_void',
    slot: 'weaponSkin',
    name: 'สกินอาวุธห้วงอเวจี',
    description: 'เปลี่ยนเอฟเฟกต์อาวุธเป็นคลื่นมิติสีม่วงเข้ม',
    primaryColor: '#c084fc',
    secondaryColor: '#6d28d9',
    diamondCost: 50,
  },
  {
    id: 'frame_royal',
    slot: 'frame',
    name: 'กรอบชื่อราชันย์ทองคำ',
    description: 'กรอบแสดงชื่อผู้กล้าสีทองเหนือศีรษะและโปรไฟล์',
    primaryColor: '#fbbf24',
    secondaryColor: '#78350f',
    goldCost: 3500,
    diamondCost: 0,
  },
  {
    id: 'frame_dragon',
    slot: 'frame',
    name: 'กรอบชื่อเกียรติยศมังกร',
    description: 'กรอบชื่อสีครามเรืองแสงสำหรับนักล่ามังกร',
    primaryColor: '#22d3ee',
    secondaryColor: '#1e3a8a',
    diamondCost: 40,
  },
  {
    id: 'frame_loy_krathong',
    slot: 'frame',
    name: 'กรอบชื่อจันทร์กระจ่างลอยกระทง',
    description: 'กรอบชื่อพิเศษประจำเทศกาลลอยกระทงแสงจันทร์ (ปลดล็อกจากร้านเทศกาล)',
    primaryColor: '#fde047',
    secondaryColor: '#1d4ed8',
    diamondCost: 60,
  },
  {
    id: 'wskin_festival_crimson',
    slot: 'weaponSkin',
    name: 'สกินอาวุธเปลวประทีปมงคล',
    description: 'เอฟเฟกต์คมดาบสีแดงทองมงคลแห่งเทศกาล',
    primaryColor: '#fb7185',
    secondaryColor: '#f59e0b',
    diamondCost: 55,
  },
]

export function getCosmeticDef(id: string | null | undefined): CosmeticDef | null {
  if (!id) return null
  return COSMETIC_DEFS.find((c) => c.id === id) ?? null
}

/* ========================================================================== */
/* 5. LOADOUT PRESETS, BEGINNER GUIDE, OFFLINE AFK, WORLD CYCLE               */
/* ========================================================================== */

export interface LoadoutPreset {
  id: string
  name: string
  equipmentUids: Partial<Record<EquipmentSlot, string | null>>
  wingId: string | null
  weaponSkinId: string | null
}

export const MAX_LOADOUTS = 3

export interface BeginnerGuideStepDef {
  id: string
  stepNumber: number
  title: string
  description: string
  targetPanel?: 'lifeskills' | 'character' | 'enhance' | 'talents' | 'pets' | 'dungeon' | 'quests'
  rewardGold: number
  rewardDiamonds: number
  rewardStones: number
}

export const BEGINNER_GUIDE_STEPS: BeginnerGuideStepDef[] = [
  {
    id: 'guide_kill_5',
    stepNumber: 1,
    title: 'ออกล่ามอนสเตอร์ครั้งแรก (5 ตัว)',
    description: 'เดินออกจากเมืองไปทางตะวันออกเพื่อปราบสไลม์หรือมอนสเตอร์ 5 ตัว',
    rewardGold: 300,
    rewardDiamonds: 5,
    rewardStones: 1,
  },
  {
    id: 'guide_gather_1',
    stepNumber: 2,
    title: 'ทดลองตกปลา / เก็บสมุนไพร / ขุดแร่',
    description: 'เปิดเมนูทักษะชีวิตหรือกด [E] ที่จุดตกปลาในเมือง',
    targetPanel: 'lifeskills',
    rewardGold: 350,
    rewardDiamonds: 5,
    rewardStones: 1,
  },
  {
    id: 'guide_enhance_1',
    stepNumber: 3,
    title: 'เสริมแกร่งอุปกรณ์ให้เป็น +1 ขึ้นไป',
    description: 'สวมใส่อาวุธหรือเกราะแล้วตีบวกให้ติด +1 อย่างน้อย 1 ชิ้น',
    targetPanel: 'enhance',
    rewardGold: 500,
    rewardDiamonds: 8,
    rewardStones: 2,
  },
  {
    id: 'guide_talent_1',
    stepNumber: 4,
    title: 'อัปสาย Talent หรือสกิลอาชีพ',
    description: 'เปิดหน้าสกิล & Talent แล้วใช้แต้มอัปความสามารถ 1 ขั้น',
    targetPanel: 'talents',
    rewardGold: 450,
    rewardDiamonds: 8,
    rewardStones: 1,
  },
  {
    id: 'guide_pet_1',
    stepNumber: 5,
    title: 'ปลดล็อกคู่หูสัตว์เลี้ยงตัวแรก',
    description: 'เปิดหน้าสัตว์เลี้ยงแล้วปลดล็อกคู่หูช่วยต่อสู้',
    targetPanel: 'pets',
    rewardGold: 600,
    rewardDiamonds: 10,
    rewardStones: 2,
  },
  {
    id: 'guide_dungeon_1',
    stepNumber: 6,
    title: 'พิชิตหอคอยหรือดันเจี้ยนรายวัน',
    description: 'เคลียร์ดันเจี้ยนรายวันหรือหอคอยไต่ชั้นอย่างน้อย 1 รอบ',
    targetPanel: 'dungeon',
    rewardGold: 900,
    rewardDiamonds: 12,
    rewardStones: 3,
  },
]

export interface OfflineAfkSummary {
  elapsedMinutes: number
  exp: number
  gold: number
  stones: number
  mapId: string
}

export function calculateOfflineAfkRewards(elapsedMs: number, level: number, mapId: string): OfflineAfkSummary | null {
  const safeMs = Math.max(0, elapsedMs)
  const mins = Math.floor(safeMs / 60_000)
  if (mins < 2) return null
  const cappedMins = Math.min(720, mins)
  const lv = Math.max(1, Math.floor(level))
  const mapBoost = mapId === 'town' ? 0.75 : 1.15
  return {
    elapsedMinutes: cappedMins,
    exp: Math.round(cappedMins * (8 + lv * 3.5) * mapBoost),
    gold: Math.round(cappedMins * (5 + lv * 2.2) * mapBoost),
    stones: Math.floor(cappedMins / 45),
    mapId,
  }
}

export function getWorldTimePhase(nowMs = Date.now()): {
  phase: 'day' | 'dusk' | 'night'
  label: string
  tintCss: string
  expBonusPct: number
} {
  // Complete 1 full day-night cycle every 12 minutes so players experience both regularly
  const cyclePos = ((nowMs / 1000) % 720) / 720
  if (cyclePos < 0.5) {
    return { phase: 'day', label: 'กลางวัน · แสงอรุณ', tintCss: 'rgba(255,240,200,0.02)', expBonusPct: 0 }
  }
  if (cyclePos < 0.7) {
    return { phase: 'dusk', label: 'ยามเย็น · ทไวไลท์', tintCss: 'rgba(249,115,22,0.10)', expBonusPct: 10 }
  }
  return { phase: 'night', label: 'กลางคืน · ดวงดาว (+EXP)', tintCss: 'rgba(15,23,66,0.28)', expBonusPct: 20 }
}

/* ========================================================================== */
/* 6. EXTENDED PLAYER PERSISTENCE CONTAINER (SaveData.extV2)                  */
/* ========================================================================== */

export const QUICK_SLOT_COUNT = 10

export const DEFAULT_QUICK_SLOTS: ReadonlyArray<string | null> = [
  'red_potion',
  'blue_potion',
  'return_scroll',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
]

export interface PlayerExtensionV2 {
  lifeSkills: Record<LifeSkillType, LifeSkillProgress>
  activeFoodBuff: ActiveFoodBuff | null
  activeBoosts: ActiveBoostBuff[]
  pkEnabled: boolean
  talents: Record<string, number>
  talentPointsBonus: number
  battlePass: BattlePassState
  unlockedCosmetics: string[]
  equippedWing: string | null
  equippedWeaponSkin: string | null
  equippedFrame: string | null
  loadouts: LoadoutPreset[]
  claimedGuideSteps: string[]
  gatherCount: number
  invasionWavesCleared: number
  coopClears: number
  quickSlots: Array<string | null>
  spiritAwakening?: SpiritAwakeningState
  festival?: FestivalPlayerState
}

export function createDefaultExtV2(): PlayerExtensionV2 {
  return {
    lifeSkills: {
      fishing: { level: 1, exp: 0 },
      mining: { level: 1, exp: 0 },
      herbalism: { level: 1, exp: 0 },
    },
    activeFoodBuff: null,
    activeBoosts: [],
    pkEnabled: false,
    talents: {},
    talentPointsBonus: 0,
    battlePass: {
      seasonId: CURRENT_BP_SEASON_ID,
      seasonName: CURRENT_BP_SEASON_META.seasonName,
      seasonStartAtMs: CURRENT_BP_SEASON_META.seasonStartAtMs,
      seasonEndAtMs: CURRENT_BP_SEASON_META.seasonEndAtMs,
      level: 1,
      exp: 0,
      premiumUnlocked: false,
      claimedFree: [],
      claimedPrem: [],
      expiredArchive: [],
    },
    unlockedCosmetics: [],
    equippedWing: null,
    equippedWeaponSkin: null,
    equippedFrame: null,
    loadouts: [
      { id: 'preset_1', name: 'เซ็ตฟาร์มไว', equipmentUids: {}, wingId: null, weaponSkinId: null },
      { id: 'preset_2', name: 'เซ็ตตีบอส', equipmentUids: {}, wingId: null, weaponSkinId: null },
      { id: 'preset_3', name: 'เซ็ต PvP', equipmentUids: {}, wingId: null, weaponSkinId: null },
    ],
    claimedGuideSteps: [],
    gatherCount: 0,
    invasionWavesCleared: 0,
    coopClears: 0,
    quickSlots: [...DEFAULT_QUICK_SLOTS],
    spiritAwakening: createDefaultSpiritAwakeningState(),
    festival: createDefaultFestivalPlayerState(),
  }
}

export function sanitizeQuickSlots(raw: unknown): Array<string | null> {
  if (!Array.isArray(raw)) return [...DEFAULT_QUICK_SLOTS]
  const out: Array<string | null> = []
  for (let i = 0; i < QUICK_SLOT_COUNT; i++) {
    const val = raw[i]
    if (typeof val === 'string' && ITEMS[val]?.kind === 'consumable') {
      out.push(val)
    } else {
      out.push(null)
    }
  }
  return out
}

export function pruneDepletedQuickSlotsInExtV2(
  extV2: PlayerExtensionV2,
  inventory: ReadonlyArray<{ itemId: string; qty: number }>,
): { nextExtV2: PlayerExtensionV2; changed: boolean } {
  const counts = new Map<string, number>()
  for (const item of inventory) {
    if (item && typeof item.itemId === 'string' && Number(item.qty) > 0) {
      counts.set(item.itemId, (counts.get(item.itemId) ?? 0) + Math.floor(item.qty))
    }
  }
  let changed = false
  const nextSlots = extV2.quickSlots.map((slotItemId) => {
    if (!slotItemId) return null
    if ((counts.get(slotItemId) ?? 0) <= 0) {
      changed = true
      return null
    }
    return slotItemId
  })
  if (!changed) return { nextExtV2: extV2, changed: false }
  return {
    nextExtV2: {
      ...extV2,
      quickSlots: nextSlots,
    },
    changed: true,
  }
}

export function sanitizeExtV2(raw: unknown): PlayerExtensionV2 {
  const def = createDefaultExtV2()
  if (!raw || typeof raw !== 'object') return def
  const obj = raw as Partial<PlayerExtensionV2>

  const lifeSkills = { ...def.lifeSkills }
  if (obj.lifeSkills && typeof obj.lifeSkills === 'object') {
    for (const sk of ['fishing', 'mining', 'herbalism'] as const) {
      const entry = obj.lifeSkills[sk]
      if (entry && typeof entry === 'object') {
        lifeSkills[sk] = {
          level: Math.max(1, Math.min(50, Math.floor(Number(entry.level ?? 1) || 1))),
          exp: Math.max(0, Math.floor(Number(entry.exp ?? 0) || 0)),
        }
      }
    }
  }

  let activeFoodBuff: ActiveFoodBuff | null = null
  if (obj.activeFoodBuff && typeof obj.activeFoodBuff === 'object' && Number(obj.activeFoodBuff.expiresAtMs) > Date.now()) {
    activeFoodBuff = {
      itemId: String(obj.activeFoodBuff.itemId ?? ''),
      name: String(obj.activeFoodBuff.name ?? 'บัฟอาหาร').slice(0, 40),
      expiresAtMs: Math.floor(Number(obj.activeFoodBuff.expiresAtMs)),
      atkPct: Math.max(0, Math.min(100, Number(obj.activeFoodBuff.atkPct ?? 0) || 0)),
      defPct: Math.max(0, Math.min(100, Number(obj.activeFoodBuff.defPct ?? 0) || 0)),
      critBonus: Math.max(0, Math.min(0.5, Number(obj.activeFoodBuff.critBonus ?? 0) || 0)),
      expMul: Math.max(1, Math.min(3, Number(obj.activeFoodBuff.expMul ?? 1) || 1)),
    }
  }

  const talents: Record<string, number> = {}
  if (obj.talents && typeof obj.talents === 'object') {
    for (const node of TALENT_NODES) {
      const rank = Math.floor(Number(obj.talents[node.id] ?? 0) || 0)
      if (rank > 0) talents[node.id] = Math.min(node.maxRank, rank)
    }
  }

  const rawBp = obj.battlePass
  const prevArchive: ExpiredPassReward[] = Array.isArray(rawBp?.expiredArchive)
    ? rawBp.expiredArchive
        .filter((a): a is ExpiredPassReward => Boolean(a && typeof a.archiveId === 'string' && typeof a.level === 'number'))
        .slice(-60)
    : []
  const sameSeason = rawBp && rawBp.seasonId === CURRENT_BP_SEASON_ID
  const battlePass: BattlePassState = sameSeason
    ? {
        seasonId: CURRENT_BP_SEASON_ID,
        seasonName: CURRENT_BP_SEASON_META.seasonName,
        seasonStartAtMs: CURRENT_BP_SEASON_META.seasonStartAtMs,
        seasonEndAtMs: CURRENT_BP_SEASON_META.seasonEndAtMs,
        level: Math.max(1, Math.min(BP_MAX_LEVEL, Math.floor(Number(rawBp.level ?? 1) || 1))),
        exp: Math.max(0, Math.floor(Number(rawBp.exp ?? 0) || 0)),
        premiumUnlocked: Boolean(rawBp.premiumUnlocked),
        claimedFree: Array.isArray(rawBp.claimedFree)
          ? [...new Set(rawBp.claimedFree.filter((n): n is number => typeof n === 'number' && n >= 1 && n <= BP_MAX_LEVEL))]
          : [],
        claimedPrem: Array.isArray(rawBp.claimedPrem)
          ? [...new Set(rawBp.claimedPrem.filter((n): n is number => typeof n === 'number' && n >= 1 && n <= BP_MAX_LEVEL))]
          : [],
        expiredArchive: prevArchive,
      }
    : {
        ...def.battlePass,
        expiredArchive: rawBp ? archiveExpiredBattlePassRewards(rawBp, prevArchive) : prevArchive,
      }

  const validCosmeticIds = new Set(COSMETIC_DEFS.map((c) => c.id))
  const unlockedCosmetics = Array.isArray(obj.unlockedCosmetics)
    ? [...new Set(obj.unlockedCosmetics.filter((id): id is string => typeof id === 'string' && validCosmeticIds.has(id)))]
    : []

  const equippedWing =
    typeof obj.equippedWing === 'string' && unlockedCosmetics.includes(obj.equippedWing) ? obj.equippedWing : null
  const equippedWeaponSkin =
    typeof obj.equippedWeaponSkin === 'string' && unlockedCosmetics.includes(obj.equippedWeaponSkin)
      ? obj.equippedWeaponSkin
      : null
  const equippedFrame =
    typeof obj.equippedFrame === 'string' && unlockedCosmetics.includes(obj.equippedFrame) ? obj.equippedFrame : null

  const loadouts: LoadoutPreset[] = def.loadouts.map((fallback, idx) => {
    const src = Array.isArray(obj.loadouts) ? obj.loadouts[idx] : undefined
    if (!src || typeof src !== 'object') return fallback
    return {
      id: fallback.id,
      name: typeof src.name === 'string' && src.name.trim() ? src.name.trim().slice(0, 20) : fallback.name,
      equipmentUids: src.equipmentUids && typeof src.equipmentUids === 'object' ? { ...src.equipmentUids } : {},
      wingId: typeof src.wingId === 'string' && unlockedCosmetics.includes(src.wingId) ? src.wingId : null,
      weaponSkinId:
        typeof src.weaponSkinId === 'string' && unlockedCosmetics.includes(src.weaponSkinId) ? src.weaponSkinId : null,
    }
  })

  const nowMs = Date.now()
  const activeBoosts: ActiveBoostBuff[] = Array.isArray(obj.activeBoosts)
    ? obj.activeBoosts
        .filter(
          (b): b is ActiveBoostBuff =>
            Boolean(b && typeof b.id === 'string' && typeof b.kind === 'string' && Number(b.expiresAtMs) > nowMs),
        )
        .slice(0, 12)
        .map((b) => ({
          id: String(b.id).slice(0, 48),
          kind: (['exp', 'jp', 'lifeskill', 'speed', 'weight', 'stat'].includes(b.kind) ? b.kind : 'exp') as ActiveBoostKind,
          label: String(b.label ?? 'บัฟเสริมพลัง').slice(0, 48),
          shortTag: String(b.shortTag ?? 'BUF').slice(0, 8),
          value: Math.max(0, Math.min(2000, Number(b.value ?? 0) || 0)),
          expiresAtMs: Math.floor(Number(b.expiresAtMs)),
          color: typeof b.color === 'string' ? b.color.slice(0, 24) : '#38bdf8',
        }))
    : []

  return {
    lifeSkills,
    activeFoodBuff,
    activeBoosts,
    pkEnabled: Boolean(obj.pkEnabled),
    talents,
    talentPointsBonus: Math.max(0, Math.min(50, Math.floor(Number(obj.talentPointsBonus ?? 0) || 0))),
    battlePass,
    unlockedCosmetics,
    equippedWing,
    equippedWeaponSkin,
    equippedFrame,
    loadouts,
    claimedGuideSteps: Array.isArray(obj.claimedGuideSteps)
      ? [...new Set(obj.claimedGuideSteps.filter((id): id is string => typeof id === 'string'))]
      : [],
    gatherCount: Math.max(0, Math.floor(Number(obj.gatherCount ?? 0) || 0)),
    invasionWavesCleared: Math.max(0, Math.floor(Number(obj.invasionWavesCleared ?? 0) || 0)),
    coopClears: Math.max(0, Math.floor(Number(obj.coopClears ?? 0) || 0)),
    quickSlots: sanitizeQuickSlots(obj.quickSlots),
    spiritAwakening: sanitizeSpiritAwakeningState(obj.spiritAwakening),
    festival: sanitizeFestivalPlayerState(obj.festival),
  }
}

export function getActiveAsuraBoostSummary(extV2: PlayerExtensionV2 | null | undefined, nowMs = Date.now()) {
  const activeList = (extV2?.activeBoosts ?? []).filter((b) => b.expiresAtMs > nowMs)
  let expBonusPct = 0
  let jpBonusPct = 0
  let lifeskillBonusPct = 0
  let speedBonusPct = 0
  let weightBonusFlat = 0
  let statBonusPct = 0
  let critBonus = 0
  for (const b of activeList) {
    if (b.kind === 'exp') expBonusPct = Math.max(expBonusPct, b.value)
    else if (b.kind === 'jp') jpBonusPct = Math.max(jpBonusPct, b.value)
    else if (b.kind === 'lifeskill') lifeskillBonusPct = Math.max(lifeskillBonusPct, b.value)
    else if (b.kind === 'speed') speedBonusPct = Math.max(speedBonusPct, b.value)
    else if (b.kind === 'weight') weightBonusFlat += b.value
    else if (b.kind === 'stat') {
      statBonusPct = Math.max(statBonusPct, b.value)
      if (b.value >= 10) critBonus = Math.max(critBonus, 0.05)
    }
  }
  return {
    expBonusPct,
    jpBonusPct,
    lifeskillBonusPct,
    speedBonusPct,
    weightBonusFlat,
    statBonusPct,
    critBonus,
    activeList,
  }
}

export function isItemListableOnMarket(def: ItemDef | undefined, item?: { bound?: boolean } | null): boolean {
  if (!def || def.gmOnly) return false
  if (item?.bound) return false
  return def.kind === 'weapon' || def.kind === 'armor' || def.kind === 'material' || def.kind === 'consumable'
}

export function getFoodBuffForItem(itemId: string): FoodBuffDef | null {
  return FOOD_BUFF_DEFS.find((f) => f.itemId === itemId) ?? null
}

export function resolveItemName(itemId: string): string {
  return ITEMS[itemId]?.name ?? itemId
}
