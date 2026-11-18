import { ITEMS, MAX_LEVEL, MONSTERS, expToNext, type MonsterDef } from './data'
import type { EncounterBiome, EncounterEnemy } from './encounter'
import { PET_STAT_CAPS, getPetSkillDef, type PetSkillDef } from './premium/fashion-pet'

export interface PetProgress {
  level: number
  exp: number
  stars?: number
}

export interface PetState {
  activePetId: string | null
  ownedPets: Record<string, PetProgress>
}

export const MAX_PET_STARS = 5

export function petEvolveCost(currentStars: number): { gold: number; essence: number } {
  const s = Math.max(1, Math.min(MAX_PET_STARS, Math.floor(currentStars)))
  return {
    gold: 600 * s * s,
    essence: s * 2,
  }
}

export function getPetStarMultiplier(stars: number): number {
  const clamped = Math.max(1, Math.min(MAX_PET_STARS, Math.floor(stars || 1)))
  return 1 + (clamped - 1) * 0.25
}

export interface QuestState {
  dailyDate: string
  dailyKills: number
  dailyBossKills: number
  dailyEnhances: number
  dailyTowerClears: number
  totalKills: number
  totalBossKills: number
  totalEnhances: number
  claimedDailyIds: string[]
  claimedMilestoneIds: string[]
}

export interface TowerState {
  highestFloor: number
  currentFloor: number
  totalClears: number
  bossClears: number
  lastDailyClaimDate: string | null
}

export interface CombatPetDef {
  id: string
  name: string
  category?: 'phao' | 'companion'
  rarity: 'ทั่วไป' | 'หายาก' | 'อีปิก' | 'ตำนาน'
  description: string
  unlockGold?: number
  unlockDiamonds?: number
  linkedGemItemId?: string
  baseAtk: number
  atkPerLevel: number
  attackInterval: number
  hpBonus: number
  mpBonus: number
  atkBuff: number
  defBuff: number
  expBonusPct: number
  goldBonusPct: number
  colors: { primary: string; secondary: string; accent: string }
  pixels: string[]
}

export const MAX_PET_LEVEL = 20

export const COMBAT_PETS: CombatPetDef[] = [
  {
    id: 'buddy_slime',
    name: 'สไลม์น้อยคู่ใจ',
    category: 'companion',
    rarity: 'ทั่วไป',
    description: 'คู่หูเริ่มต้นสุดน่ารัก ยิงกระสุนเมือกสีเขียวช่วยโจมตีมอนสเตอร์',
    unlockGold: 250,
    baseAtk: 10,
    atkPerLevel: 3,
    attackInterval: 2.4,
    hpBonus: 25,
    mpBonus: 10,
    atkBuff: 4,
    defBuff: 2,
    expBonusPct: 5,
    goldBonusPct: 0,
    colors: { primary: '#4fc3a1', secondary: '#247f65', accent: '#d8fff2' },
    pixels: ['..1111..', '.113311.', '11211211', '11111111', '12111121', '.122221.', '..1111..', '........'],
  },
  {
    id: 'flame_fox',
    name: 'จิ้งจอกเพลิงน้อย',
    category: 'companion',
    rarity: 'หายาก',
    description: 'จิ้งจอกหางเปลวไฟ ปล่อยลูกไฟพิกเซลโจมตีแรงและเพิ่มทองดรอป',
    unlockGold: 1800,
    baseAtk: 20,
    atkPerLevel: 5,
    attackInterval: 2.0,
    hpBonus: 45,
    mpBonus: 15,
    atkBuff: 12,
    defBuff: 4,
    expBonusPct: 0,
    goldBonusPct: 12,
    colors: { primary: '#fb923c', secondary: '#c2410c', accent: '#fef08a' },
    pixels: ['.1....1.', '.13..31.', '11111111', '12111121', '.113311.', '..11112.', '.221122.', '..2..2..'],
  },
  {
    id: 'crystal_owl',
    name: 'นกฮูกผลึกเวท',
    category: 'companion',
    rarity: 'อีปิก',
    description: 'นกฮูกเวทมนตร์ ยิงลำแสงผลึกถี่และเพิ่มค่าประสบการณ์ที่ได้รับ',
    unlockGold: 4500,
    baseAtk: 28,
    atkPerLevel: 7,
    attackInterval: 1.8,
    hpBonus: 70,
    mpBonus: 35,
    atkBuff: 16,
    defBuff: 8,
    expBonusPct: 15,
    goldBonusPct: 5,
    colors: { primary: '#a78bfa', secondary: '#5b21b6', accent: '#67e8f9' },
    pixels: ['.11..11.', '12111121', '13111131', '11133111', '.111111.', '.211112.', '..1..1..', '........'],
  },
  {
    id: 'moonlight_firefly',
    name: 'ภูตหิ่งห้อยมูนไลท์',
    category: 'companion',
    rarity: 'หายาก',
    description: 'ภูตแสงจันทร์จากร้านเพชร ยิงประกายแสงจันทร์และช่วยเก็บดรอป',
    linkedGemItemId: 'moonlight_firefly',
    baseAtk: 18,
    atkPerLevel: 5,
    attackInterval: 2.1,
    hpBonus: 50,
    mpBonus: 25,
    atkBuff: 10,
    defBuff: 5,
    expBonusPct: 10,
    goldBonusPct: 5,
    colors: { primary: '#67e8f9', secondary: '#22d3ee', accent: '#fef08a' },
    pixels: ['...33...', '..3223..', '.321123.', '32111223', '32111223', '.321123.', '..3..3..', '........'],
  },
  {
    id: 'gem_raccoon',
    name: 'แรคคูนพ่อค้าอัญมณี',
    category: 'companion',
    rarity: 'อีปิก',
    description: 'แรคคูนจากร้านเพชร ยิงผลึกอัญมณีและเพิ่มทองมหาศาล',
    linkedGemItemId: 'gem_raccoon',
    baseAtk: 24,
    atkPerLevel: 6,
    attackInterval: 1.9,
    hpBonus: 80,
    mpBonus: 20,
    atkBuff: 14,
    defBuff: 8,
    expBonusPct: 5,
    goldBonusPct: 25,
    colors: { primary: '#94a3b8', secondary: '#475569', accent: '#38bdf8' },
    pixels: ['..1111..', '.122221.', '12233221', '12233221', '.122221.', '.1.33.1.', '1..33..1', '...11...'],
  },
  {
    id: 'aurora_cloud_dragon',
    name: 'มังกรเมฆาออโรรา',
    category: 'companion',
    rarity: 'ตำนาน',
    description: 'สัตว์คู่หูระดับตำนานจากร้านเพชร ยิงลมหายใจแสงเหนือสุดทรงพลัง',
    linkedGemItemId: 'aurora_cloud_dragon',
    baseAtk: 42,
    atkPerLevel: 9,
    attackInterval: 1.5,
    hpBonus: 160,
    mpBonus: 60,
    atkBuff: 30,
    defBuff: 16,
    expBonusPct: 20,
    goldBonusPct: 20,
    colors: { primary: '#5eead4', secondary: '#818cf8', accent: '#f0abfc' },
    pixels: ['..1..1..', '.121.121', '12221222', '12322232', '.1222221', '..12221.', '.1.2.2.1', '...1.1..'],
  },
  {
    id: 'phao_lotus',
    name: 'ผอบบัวแก้ว',
    category: 'phao',
    rarity: 'ทั่วไป',
    description: 'ผอบเครื่องแก้วทรงยอดบัว ลอยอารักขาข้างกายและเปิดฝาปล่อยกลีบปราณบัวพิสุทธิ์',
    unlockGold: 400,
    baseAtk: 14,
    atkPerLevel: 4,
    attackInterval: 2.2,
    hpBonus: 55,
    mpBonus: 24,
    atkBuff: 6,
    defBuff: 6,
    expBonusPct: 8,
    goldBonusPct: 4,
    colors: { primary: '#5eead4', secondary: '#0f766e', accent: '#fef08a' },
    pixels: ['...33...', '..3113..', '..1331..', '.211112.', '.213312.', '..2222..', '...22...', '..2222..'],
  },
  {
    id: 'phao_gold_naga',
    name: 'ผอบทองพญานาค',
    category: 'phao',
    rarity: 'หายาก',
    description: 'ผอบทองคำสลักลายกนกนาคราช เปิดฝาพ่นลูกแก้วนาคาสีมรกตและเสริมโชคลาภทองคำ',
    unlockGold: 2400,
    baseAtk: 24,
    atkPerLevel: 6,
    attackInterval: 1.9,
    hpBonus: 85,
    mpBonus: 30,
    atkBuff: 15,
    defBuff: 10,
    expBonusPct: 6,
    goldBonusPct: 16,
    colors: { primary: '#f59e0b', secondary: '#92400e', accent: '#34d399' },
    pixels: ['...11...', '..1331..', '.111111.', '.213312.', '.211112.', '..2112..', '...22...', '.221122.'],
  },
  {
    id: 'phao_celestial',
    name: 'ผอบสุริยันจันทรา',
    category: 'phao',
    rarity: 'อีปิก',
    description: 'ผอบเบญจรงค์ผนึกธาตุสุริยะ-จันทรา หมุนวนรอบผู้ใช้และยิงลำแสงดาวเคราะห์',
    unlockGold: 6800,
    baseAtk: 34,
    atkPerLevel: 8,
    attackInterval: 1.7,
    hpBonus: 120,
    mpBonus: 55,
    atkBuff: 22,
    defBuff: 14,
    expBonusPct: 18,
    goldBonusPct: 10,
    colors: { primary: '#f8fafc', secondary: '#1d4ed8', accent: '#fbbf24' },
    pixels: ['...33...', '..1331..', '.211112.', '21311312', '.211112.', '..2332..', '...22...', '..2332..'],
  },
  {
    id: 'phao_phantom',
    name: 'ผอบวิญญาณอเวจี',
    category: 'phao',
    rarity: 'ตำนาน',
    description: 'ผอบสัมฤทธิ์โบราณสะกดดวงจิตเทพอสูร เปิดยอดปล่อยเพลิงวิญญาณเจาะเกราะศัตรู',
    unlockGold: 16000,
    baseAtk: 48,
    atkPerLevel: 10,
    attackInterval: 1.45,
    hpBonus: 175,
    mpBonus: 70,
    atkBuff: 34,
    defBuff: 20,
    expBonusPct: 22,
    goldBonusPct: 18,
    colors: { primary: '#9333ea', secondary: '#311042', accent: '#f43f5e' },
    pixels: ['...33...', '..2332..', '.211112.', '21333312', '.211112.', '..2112..', '...22...', '.223322.'],
  },
]

export function getCombatPetDef(petId: string | null | undefined): CombatPetDef | null {
  if (!petId) return null
  return COMBAT_PETS.find((p) => p.id === petId) ?? null
}

export function todayDateKey(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function createDefaultPetState(ownedGemItems: string[] = [], equippedGemCompanion: string | null = null): PetState {
  const ownedPets: Record<string, PetProgress> = {}
  for (const gemId of ownedGemItems) {
    if (COMBAT_PETS.some((p) => p.linkedGemItemId === gemId)) {
      ownedPets[gemId] = { level: 1, exp: 0, stars: 1 }
    }
  }
  const activePetId =
    equippedGemCompanion && ownedPets[equippedGemCompanion]
      ? equippedGemCompanion
      : Object.keys(ownedPets)[0] ?? null
  return { activePetId, ownedPets }
}

export function sanitizePetState(
  raw: unknown,
  ownedGemItems: string[] = [],
  equippedGemCompanion: string | null = null,
): PetState {
  const obj = raw && typeof raw === 'object' ? (raw as Partial<PetState>) : {}
  const ownedPets: Record<string, PetProgress> = {}

  if (obj.ownedPets && typeof obj.ownedPets === 'object') {
    for (const [id, entry] of Object.entries(obj.ownedPets)) {
      if (!getCombatPetDef(id)) continue
      const lv = Math.max(1, Math.min(MAX_PET_LEVEL, Math.floor(Number(entry?.level ?? 1) || 1)))
      const exp = Math.max(0, Math.floor(Number(entry?.exp ?? 0) || 0))
      const stars = Math.max(1, Math.min(MAX_PET_STARS, Math.floor(Number(entry?.stars ?? 1) || 1)))
      ownedPets[id] = { level: lv, exp, stars }
    }
  }

  for (const gemId of ownedGemItems) {
    if (COMBAT_PETS.some((p) => p.linkedGemItemId === gemId) && !ownedPets[gemId]) {
      ownedPets[gemId] = { level: 1, exp: 0, stars: 1 }
    }
  }

  let activePetId: string | null =
    typeof obj.activePetId === 'string' && ownedPets[obj.activePetId] ? obj.activePetId : null

  if (!activePetId && equippedGemCompanion && ownedPets[equippedGemCompanion]) {
    activePetId = equippedGemCompanion
  }

  return { activePetId, ownedPets }
}

export function petExpToNext(level: number): number {
  return 40 + level * level * 15
}

export function petFeedCost(level: number): number {
  return 120 * Math.max(1, level)
}

export interface ActivePetBonuses {
  petId: string
  def: CombatPetDef
  level: number
  stars: number
  exp: number
  nextExp: number
  hpBonus: number
  mpBonus: number
  atkBonus: number
  defBonus: number
  expMul: number
  goldMul: number
  companionAtk: number
  attackInterval: number
  autoLootMagnet: boolean
  skill: PetSkillDef
  isCapped: boolean
  rawUncapped: {
    hpBonus: number
    mpBonus: number
    atkBonus: number
    defBonus: number
    companionAtk: number
    expBonusPct: number
    goldBonusPct: number
  }
}

export function getActivePetBonuses(
  petState: PetState | undefined,
  equippedGemCompanion: string | null = null,
  ownedGemItems: string[] = [],
): ActivePetBonuses | null {
  const state = sanitizePetState(petState, ownedGemItems, equippedGemCompanion)
  const resolvedId = state.activePetId ?? (equippedGemCompanion && state.ownedPets[equippedGemCompanion] ? equippedGemCompanion : null)
  if (!resolvedId) return null
  const def = getCombatPetDef(resolvedId)
  const progress = state.ownedPets[resolvedId]
  if (!def || !progress) return null

  const lv = progress.level
  const stars = Math.max(1, Math.min(MAX_PET_STARS, progress.stars ?? 1))
  const lvScale = (1 + (lv - 1) * 0.14) * getPetStarMultiplier(stars)
  const rawHpBonus = Math.round(def.hpBonus * lvScale)
  const rawMpBonus = Math.round(def.mpBonus * lvScale)
  const rawAtkBonus = Math.round(def.atkBuff * lvScale)
  const rawDefBonus = Math.round(def.defBuff * lvScale)
  const rawExpPct = def.expBonusPct + (lv - 1) * 0.5 + (stars - 1) * 3
  const rawGoldPct = def.goldBonusPct + (lv - 1) * 0.5 + (stars - 1) * 3
  const rawCompanionAtk = Math.round((def.baseAtk + (lv - 1) * def.atkPerLevel) * getPetStarMultiplier(stars))

  const hpBonus = Math.min(PET_STAT_CAPS.maxHpBonus, rawHpBonus)
  const mpBonus = Math.min(PET_STAT_CAPS.maxMpBonus, rawMpBonus)
  const atkBonus = Math.min(PET_STAT_CAPS.maxAtkBonus, rawAtkBonus)
  const defBonus = Math.min(PET_STAT_CAPS.maxDefBonus, rawDefBonus)
  const cappedExpPct = Math.min(PET_STAT_CAPS.maxExpBonusPct, rawExpPct)
  const cappedGoldPct = Math.min(PET_STAT_CAPS.maxGoldBonusPct, rawGoldPct)
  const companionAtk = Math.min(PET_STAT_CAPS.maxCompanionAtk, rawCompanionAtk)

  const isCapped =
    rawHpBonus > PET_STAT_CAPS.maxHpBonus ||
    rawMpBonus > PET_STAT_CAPS.maxMpBonus ||
    rawAtkBonus > PET_STAT_CAPS.maxAtkBonus ||
    rawDefBonus > PET_STAT_CAPS.maxDefBonus ||
    rawCompanionAtk > PET_STAT_CAPS.maxCompanionAtk ||
    rawExpPct > PET_STAT_CAPS.maxExpBonusPct ||
    rawGoldPct > PET_STAT_CAPS.maxGoldBonusPct

  return {
    petId: resolvedId,
    def,
    level: lv,
    stars,
    exp: progress.exp,
    nextExp: petExpToNext(lv),
    hpBonus,
    mpBonus,
    atkBonus,
    defBonus,
    expMul: 1 + cappedExpPct / 100,
    goldMul: 1 + cappedGoldPct / 100,
    companionAtk,
    attackInterval: Math.max(1.0, def.attackInterval - (lv - 1) * 0.025 - (stars - 1) * 0.06),
    autoLootMagnet: stars >= 2,
    skill: getPetSkillDef(resolvedId),
    isCapped,
    rawUncapped: {
      hpBonus: rawHpBonus,
      mpBonus: rawMpBonus,
      atkBonus: rawAtkBonus,
      defBonus: rawDefBonus,
      companionAtk: rawCompanionAtk,
      expBonusPct: Number(rawExpPct.toFixed(1)),
      goldBonusPct: Number(rawGoldPct.toFixed(1)),
    },
  }
}

export function grantActivePetExp(petState: PetState, amount: number): { nextPetState: PetState; leveledUp: boolean; newLevel: number } {
  const next: PetState = {
    activePetId: petState.activePetId,
    ownedPets: { ...petState.ownedPets },
  }
  if (!next.activePetId || !next.ownedPets[next.activePetId] || amount <= 0) {
    return { nextPetState: next, leveledUp: false, newLevel: 1 }
  }
  const cur = { ...next.ownedPets[next.activePetId], stars: next.ownedPets[next.activePetId].stars ?? 1 }
  let leveledUp = false
  if (cur.level < MAX_PET_LEVEL) {
    cur.exp += Math.max(1, Math.round(amount))
    while (cur.level < MAX_PET_LEVEL && cur.exp >= petExpToNext(cur.level)) {
      cur.exp -= petExpToNext(cur.level)
      cur.level += 1
      leveledUp = true
    }
    if (cur.level >= MAX_PET_LEVEL) cur.exp = 0
  }
  next.ownedPets[next.activePetId] = cur
  return { nextPetState: next, leveledUp, newLevel: cur.level }
}

/* ---------------- Quest & Daily Bounty System ---------------- */

export type QuestCategory = 'daily' | 'milestone'

export type QuestMetric =
  | 'dailyKills'
  | 'dailyBossKills'
  | 'dailyEnhances'
  | 'dailyTowerClears'
  | 'totalKills'
  | 'highestFloor'
  | 'ownedPetsCount'

export interface QuestDef {
  id: string
  category: QuestCategory
  title: string
  description: string
  metric: QuestMetric
  target: number
  rewardGold: number
  rewardExp: number
  rewardDiamonds: number
  rewardStones?: number
}

export const QUEST_DEFS: QuestDef[] = [
  {
    id: 'daily_hunt_10',
    category: 'daily',
    title: 'ลาดตระเวนกำจัดมอนสเตอร์',
    description: 'ปราบมอนสเตอร์ในแผนที่โลก สนามประลอง หรือหอคอยครบ 10 ตัว',
    metric: 'dailyKills',
    target: 10,
    rewardGold: 250,
    rewardExp: 120,
    rewardDiamonds: 5,
    rewardStones: 2,
  },
  {
    id: 'daily_hunt_30',
    category: 'daily',
    title: 'นักล่าประจำวัน',
    description: 'ปราบมอนสเตอร์สะสมในวันนี้ครบ 30 ตัว',
    metric: 'dailyKills',
    target: 30,
    rewardGold: 700,
    rewardExp: 400,
    rewardDiamonds: 15,
  },
  {
    id: 'daily_boss_1',
    category: 'daily',
    title: 'ผู้ปราบบอสประจำวัน',
    description: 'ปราบบอสหรือมอนสเตอร์ระดับอีลีทอย่างน้อย 1 ตัววันนี้',
    metric: 'dailyBossKills',
    target: 1,
    rewardGold: 900,
    rewardExp: 500,
    rewardDiamonds: 25,
    rewardStones: 3,
  },
  {
    id: 'daily_enhance_1',
    category: 'daily',
    title: 'ขัดเกลาศาสตราวุธ',
    description: 'ตีบวกอาวุธหรือชุดเกราะ 1 ครั้ง',
    metric: 'dailyEnhances',
    target: 1,
    rewardGold: 350,
    rewardExp: 100,
    rewardDiamonds: 10,
    rewardStones: 2,
  },
  {
    id: 'daily_tower_2',
    category: 'daily',
    title: 'ผู้ท้าทายหอคอยรายวัน',
    description: 'ผ่านด่านในหอคอยไต่ชั้นครบ 2 ชั้นวันนี้',
    metric: 'dailyTowerClears',
    target: 2,
    rewardGold: 800,
    rewardExp: 350,
    rewardDiamonds: 30,
    rewardStones: 3,
  },
  {
    id: 'mile_pet_1',
    category: 'milestone',
    title: 'คู่หูร่วมเดินทางคนแรก',
    description: 'ปลดล็อกสัตว์เลี้ยงคู่หูอย่างน้อย 1 ตัว',
    metric: 'ownedPetsCount',
    target: 1,
    rewardGold: 600,
    rewardExp: 200,
    rewardDiamonds: 25,
  },
  {
    id: 'mile_kills_50',
    category: 'milestone',
    title: 'นักรบผู้ชำนาญสนาม',
    description: 'ปราบมอนสเตอร์สะสมครบ 50 ตัว',
    metric: 'totalKills',
    target: 50,
    rewardGold: 1000,
    rewardExp: 600,
    rewardDiamonds: 40,
  },
  {
    id: 'mile_kills_200',
    category: 'milestone',
    title: 'ผู้พิทักษ์แห่งอาณาจักร',
    description: 'ปราบมอนสเตอร์สะสมครบ 200 ตัว',
    metric: 'totalKills',
    target: 200,
    rewardGold: 3500,
    rewardExp: 2000,
    rewardDiamonds: 120,
    rewardStones: 8,
  },
  {
    id: 'mile_tower_5',
    category: 'milestone',
    title: 'ผู้พิชิตชั้นที่ 5',
    description: 'ผ่านหอคอยไต่ชั้นถึงชั้นที่ 5',
    metric: 'highestFloor',
    target: 5,
    rewardGold: 1500,
    rewardExp: 800,
    rewardDiamonds: 60,
    rewardStones: 5,
  },
  {
    id: 'mile_tower_15',
    category: 'milestone',
    title: 'จอมยุทธ์แห่งหอคอย',
    description: 'ผ่านหอคอยไต่ชั้นถึงชั้นที่ 15',
    metric: 'highestFloor',
    target: 15,
    rewardGold: 5000,
    rewardExp: 3000,
    rewardDiamonds: 180,
    rewardStones: 12,
  },
]

export function createDefaultQuestState(initialKills = 0): QuestState {
  return {
    dailyDate: todayDateKey(),
    dailyKills: 0,
    dailyBossKills: 0,
    dailyEnhances: 0,
    dailyTowerClears: 0,
    totalKills: Math.max(0, Math.floor(initialKills)),
    totalBossKills: 0,
    totalEnhances: 0,
    claimedDailyIds: [],
    claimedMilestoneIds: [],
  }
}

export function sanitizeQuestState(raw: unknown, fallbackKills = 0): QuestState {
  const today = todayDateKey()
  const obj = raw && typeof raw === 'object' ? (raw as Partial<QuestState>) : {}
  const sameDay = obj.dailyDate === today
  return {
    dailyDate: today,
    dailyKills: sameDay ? Math.max(0, Math.floor(Number(obj.dailyKills ?? 0) || 0)) : 0,
    dailyBossKills: sameDay ? Math.max(0, Math.floor(Number(obj.dailyBossKills ?? 0) || 0)) : 0,
    dailyEnhances: sameDay ? Math.max(0, Math.floor(Number(obj.dailyEnhances ?? 0) || 0)) : 0,
    dailyTowerClears: sameDay ? Math.max(0, Math.floor(Number(obj.dailyTowerClears ?? 0) || 0)) : 0,
    totalKills: Math.max(fallbackKills, Math.floor(Number(obj.totalKills ?? fallbackKills) || 0)),
    totalBossKills: Math.max(0, Math.floor(Number(obj.totalBossKills ?? 0) || 0)),
    totalEnhances: Math.max(0, Math.floor(Number(obj.totalEnhances ?? 0) || 0)),
    claimedDailyIds: sameDay && Array.isArray(obj.claimedDailyIds)
      ? [...new Set(obj.claimedDailyIds.filter((x): x is string => typeof x === 'string'))]
      : [],
    claimedMilestoneIds: Array.isArray(obj.claimedMilestoneIds)
      ? [...new Set(obj.claimedMilestoneIds.filter((x): x is string => typeof x === 'string'))]
      : [],
  }
}

export interface QuestProgressEvent {
  kills?: number
  bossKills?: number
  enhances?: number
  towerClears?: number
}

export function recordQuestProgress(rawState: QuestState | undefined, event: QuestProgressEvent, fallbackKills = 0): QuestState {
  const next = sanitizeQuestState(rawState, fallbackKills)
  if (event.kills) {
    next.dailyKills += event.kills
    next.totalKills += event.kills
  }
  if (event.bossKills) {
    next.dailyBossKills += event.bossKills
    next.totalBossKills += event.bossKills
  }
  if (event.enhances) {
    next.dailyEnhances += event.enhances
    next.totalEnhances += event.enhances
  }
  if (event.towerClears) {
    next.dailyTowerClears += event.towerClears
  }
  return next
}

export function getQuestMetricValue(
  metric: QuestMetric,
  questState: QuestState,
  towerState: TowerState,
  petState: PetState,
): number {
  switch (metric) {
    case 'dailyKills':
      return questState.dailyKills
    case 'dailyBossKills':
      return questState.dailyBossKills
    case 'dailyEnhances':
      return questState.dailyEnhances
    case 'dailyTowerClears':
      return questState.dailyTowerClears
    case 'totalKills':
      return questState.totalKills
    case 'highestFloor':
      return towerState.highestFloor
    case 'ownedPetsCount':
      return Object.keys(petState.ownedPets).length
  }
}

export function isQuestClaimed(quest: QuestDef, questState: QuestState): boolean {
  return quest.category === 'daily'
    ? questState.claimedDailyIds.includes(quest.id)
    : questState.claimedMilestoneIds.includes(quest.id)
}

export function countClaimableQuests(
  questState: QuestState | undefined,
  towerState: TowerState | undefined,
  petState: PetState | undefined,
  fallbackKills = 0,
): number {
  const qs = sanitizeQuestState(questState, fallbackKills)
  const ts = sanitizeTowerState(towerState)
  const ps = sanitizePetState(petState)
  return QUEST_DEFS.filter((q) => {
    if (isQuestClaimed(q, qs)) return false
    return getQuestMetricValue(q.metric, qs, ts, ps) >= q.target
  }).length
}

/* ---------------- Endless Tower System ---------------- */

export function createDefaultTowerState(): TowerState {
  return {
    highestFloor: 0,
    currentFloor: 1,
    totalClears: 0,
    bossClears: 0,
    lastDailyClaimDate: null,
  }
}

export function sanitizeTowerState(raw: unknown): TowerState {
  const obj = raw && typeof raw === 'object' ? (raw as Partial<TowerState>) : {}
  const highestFloor = Math.max(0, Math.floor(Number(obj.highestFloor ?? 0) || 0))
  const currentFloor = Math.max(1, Math.floor(Number(obj.currentFloor ?? Math.max(1, highestFloor + 1)) || 1))
  return {
    highestFloor,
    currentFloor: Math.min(currentFloor, highestFloor + 1),
    totalClears: Math.max(0, Math.floor(Number(obj.totalClears ?? 0) || 0)),
    bossClears: Math.max(0, Math.floor(Number(obj.bossClears ?? 0) || 0)),
    lastDailyClaimDate: typeof obj.lastDailyClaimDate === 'string' ? obj.lastDailyClaimDate : null,
  }
}

export interface TowerFloorEncounter {
  floor: number
  isBossFloor: boolean
  timeLimitSec: number
  enemy: EncounterEnemy
  firstClearDiamonds: number
  clearGold: number
  clearExp: number
  clearStones: number
}

const TOWER_BIOMES: EncounterBiome[] = ['meadow', 'forest', 'cave', 'volcano']

export function generateTowerFloor(floorInput: number): TowerFloorEncounter {
  const floor = Math.max(1, Math.floor(floorInput))
  const isBossFloor = floor % 5 === 0
  const allMonsters = Object.values(MONSTERS)
  const pool = allMonsters.filter((m) => (isBossFloor ? Boolean(m.boss) : !m.boss))
  const sorted = [...pool].sort((a, b) => a.level - b.level)

  const targetLevel = Math.min(MAX_LEVEL, Math.round(1 + floor * 1.45))
  let chosen: MonsterDef = sorted[0]
  let bestDiff = Infinity
  for (const m of sorted) {
    const diff = Math.abs(m.level - targetLevel)
    if (diff < bestDiff) {
      bestDiff = diff
      chosen = m
    }
  }

  const floorScale = 1 + (floor - 1) * 0.24
  const maxHp = Math.max(45, Math.round((isBossFloor ? 160 : 58) * floorScale))
  const atk = Math.max(6, Math.round((isBossFloor ? 18 : 9) * (1 + (floor - 1) * 0.17)))
  const defStat = Math.max(2, Math.round((isBossFloor ? 10 : 4) * (1 + (floor - 1) * 0.16)))
  const clearGold = Math.round((isBossFloor ? 260 : 85) * (1 + (floor - 1) * 0.18))
  const clearExp = Math.round((isBossFloor ? 190 : 55) * (1 + (floor - 1) * 0.2))
  const clearStones = isBossFloor ? 2 : floor % 2 === 0 ? 1 : 0
  const firstClearDiamonds = isBossFloor ? 30 + Math.floor(floor / 5) * 10 : 8 + Math.floor(floor / 3) * 2
  const biome = TOWER_BIOMES[Math.floor((floor - 1) / 5) % TOWER_BIOMES.length]

  const enemy: EncounterEnemy = {
    uid: `tower-${floor}-${Math.random().toString(36).slice(2, 7)}`,
    def: chosen,
    rarity: isBossFloor ? 'boss' : floor >= 8 && floor % 3 === 0 ? 'elite' : 'normal',
    effectiveLevel: Math.min(99, targetLevel),
    hp: maxHp,
    maxHp,
    atk,
    defStat,
    expReward: clearExp,
    goldRange: [clearGold, clearGold],
    attackInterval: isBossFloor ? 1.75 : 1.55,
    biome,
  }

  return {
    floor,
    isBossFloor,
    timeLimitSec: isBossFloor ? 45 : 30,
    enemy,
    firstClearDiamonds,
    clearGold,
    clearExp,
    clearStones,
  }
}

export function applyLevelAndRewards(
  save: {
    level: number
    exp: number
    gold: number
    diamonds: number
    hp: number
    mp: number
    statPoints?: number
    skillPoints?: number
    inventory: Array<{ uid: string; itemId: string; qty: number; plus: number }>
  },
  rewards: { gold: number; exp: number; diamonds: number; stones?: number },
  getMaxVitals: () => { maxHp: number; maxMp: number },
  maxCap: number,
): { leveledFrom: number; leveledTo: number; stonesAdded: number } {
  const leveledFrom = save.level
  save.gold += Math.max(0, Math.round(rewards.gold))
  save.diamonds = (save.diamonds ?? 0) + Math.max(0, Math.round(rewards.diamonds))

  if (save.level < MAX_LEVEL && rewards.exp > 0) {
    save.exp += Math.round(rewards.exp)
    while (save.level < MAX_LEVEL && save.exp >= expToNext(save.level)) {
      save.exp -= expToNext(save.level)
      save.level += 1
      save.statPoints = (save.statPoints ?? 0) + 3
      save.skillPoints = (save.skillPoints ?? 0) + 1
    }
    if (save.level >= MAX_LEVEL) save.exp = 0
  }

  if (save.level > leveledFrom) {
    const vitals = getMaxVitals()
    save.hp = vitals.maxHp
    save.mp = vitals.maxMp
  }

  let stonesAdded = 0
  const stoneQty = rewards.stones ?? 0
  if (stoneQty > 0 && ITEMS.enhance_stone) {
    const existing = save.inventory.find((i) => i.itemId === 'enhance_stone')
    if (existing) {
      existing.qty += stoneQty
      stonesAdded = stoneQty
    } else if (save.inventory.length < maxCap) {
      save.inventory.push({
        uid: Math.random().toString(36).slice(2, 10),
        itemId: 'enhance_stone',
        qty: stoneQty,
        plus: 0,
      })
      stonesAdded = stoneQty
    }
  }

  return { leveledFrom, leveledTo: save.level, stonesAdded }
}
