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

export type PetRarityTier =
  | 'ทั่วไป'
  | 'ไม่ธรรมดา'
  | 'หายาก'
  | 'อีปิก'
  | 'ตำนาน'
  | 'มายา'
  | 'เทพเจ้า'

export interface CombatPetDef {
  id: string
  name: string
  category?: 'phao' | 'companion'
  rarity: PetRarityTier
  tierLabel?: string
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

  // ===== 28 สัตว์เลี้ยงในผอบ (Phao-ob Beasts · Common → Divine) =====

  // Tier 1: Common (Lv.1-10)
  {
    id: 'phao_water_slime',
    name: 'ผอบสไลม์หยดน้ำฟ้า',
    category: 'phao',
    rarity: 'ทั่วไป',
    tierLabel: 'Common · Lv.1-10',
    description: 'สัตว์อัญเชิญในผอบร่างหยดน้ำใส พ่นฟองน้ำกระแทกและช่วยเพิ่มพลังชีวิต',
    unlockGold: 300,
    baseAtk: 13,
    atkPerLevel: 4,
    attackInterval: 2.2,
    hpBonus: 65,
    mpBonus: 20,
    atkBuff: 6,
    defBuff: 5,
    expBonusPct: 6,
    goldBonusPct: 4,
    colors: { primary: '#38bdf8', secondary: '#0284c7', accent: '#bae6fd' },
    pixels: ['...11...', '..1331..', '.111111.', '11211211', '11111111', '.113311.', '..1111..', '........'],
  },
  {
    id: 'phao_dawn_rooster',
    name: 'ผอบลูกเจี๊ยบรุ่งอรุณ',
    category: 'phao',
    rarity: 'ทั่วไป',
    tierLabel: 'Common · Lv.1-10',
    description: 'ไก่น้อยหงอนแดงในผอบ พุ่งจิกศัตรูอย่างว่องไวพร้อมเสียงขันปลุกพลังโจมตี',
    unlockGold: 380,
    baseAtk: 15,
    atkPerLevel: 4,
    attackInterval: 2.0,
    hpBonus: 55,
    mpBonus: 18,
    atkBuff: 9,
    defBuff: 4,
    expBonusPct: 5,
    goldBonusPct: 6,
    colors: { primary: '#fef3c7', secondary: '#f59e0b', accent: '#ef4444' },
    pixels: ['...33...', '..1311..', '.112111.', '11111121', '.111111.', '..1111..', '..2..2..', '........'],
  },
  {
    id: 'phao_husky_kitten',
    name: 'ผอบเหมียวฮัสกี้ปลอกคอแดง',
    category: 'phao',
    rarity: 'ทั่วไป',
    tierLabel: 'Common · Lv.1-10',
    description: 'เจ้าเหมียวขนเทา-ขาวปลอกคอแดง กระโจนข่วนรวดเร็วและเสริมโชค EXP',
    unlockGold: 460,
    baseAtk: 16,
    atkPerLevel: 4,
    attackInterval: 1.95,
    hpBonus: 60,
    mpBonus: 22,
    atkBuff: 10,
    defBuff: 5,
    expBonusPct: 8,
    goldBonusPct: 5,
    colors: { primary: '#94a3b8', secondary: '#475569', accent: '#ef4444' },
    pixels: ['.2....2.', '.11..11.', '12111121', '11211211', '.333333.', '.111111.', '.1....1.', '........'],
  },
  {
    id: 'phao_shiba_scarf',
    name: 'ผอบชิบะผ้าพันคอแดง',
    category: 'phao',
    rarity: 'ทั่วไป',
    tierLabel: 'Common · Lv.1-10',
    description: 'ชิบะอินุขนทองพันผ้าแดงคู่ใจในผอบ พุ่งกัดและดึงดูดทองคำนำโชค',
    unlockGold: 550,
    baseAtk: 17,
    atkPerLevel: 5,
    attackInterval: 1.95,
    hpBonus: 70,
    mpBonus: 20,
    atkBuff: 10,
    defBuff: 6,
    expBonusPct: 6,
    goldBonusPct: 10,
    colors: { primary: '#fb923c', secondary: '#c2410c', accent: '#dc2626' },
    pixels: ['.1....1.', '11111111', '12111121', '.333333.', '.111111.', '.11..11.', '.2....2.', '........'],
  },

  // Tier 2: Uncommon (Lv.11-20)
  {
    id: 'phao_spear_goblin',
    name: 'ผอบก็อบลินหอกน้อย',
    category: 'phao',
    rarity: 'ไม่ธรรมดา',
    tierLabel: 'Uncommon · Lv.11-20',
    description: 'นักรบก็อบลินจิ๋วในผอบ ควงหอกปลายทองคำพุ่งแทงทะลวงเกราะศัตรู',
    unlockGold: 950,
    baseAtk: 21,
    atkPerLevel: 5,
    attackInterval: 1.85,
    hpBonus: 80,
    mpBonus: 25,
    atkBuff: 14,
    defBuff: 7,
    expBonusPct: 8,
    goldBonusPct: 8,
    colors: { primary: '#84cc16', secondary: '#4d7c0f', accent: '#f59e0b' },
    pixels: ['.1....13', '11111113', '.1211213', '..2222.2', '.22222.2', '..1..1.2', '..2..2..', '........'],
  },
  {
    id: 'phao_silver_wolf',
    name: 'ผอบหมาป่าขนเงิน',
    category: 'phao',
    rarity: 'ไม่ธรรมดา',
    tierLabel: 'Uncommon · Lv.11-20',
    description: 'หมาป่าขนสีเงินเทาผู้ปราดเปรียวในผอบ วิ่งไล่ขย้ำศัตรูอย่างดุดัน',
    unlockGold: 1150,
    baseAtk: 23,
    atkPerLevel: 6,
    attackInterval: 1.8,
    hpBonus: 85,
    mpBonus: 25,
    atkBuff: 16,
    defBuff: 8,
    expBonusPct: 9,
    goldBonusPct: 7,
    colors: { primary: '#64748b', secondary: '#334155', accent: '#e2e8f0' },
    pixels: ['.2....2.', '.121121.', '11111111', '.333333.', '.111111.', '11....11', '2......2', '........'],
  },
  {
    id: 'phao_ribbon_bunny',
    name: 'ผอบกระต่ายขาวโบว์ชมพู',
    category: 'phao',
    rarity: 'ไม่ธรรมดา',
    tierLabel: 'Uncommon · Lv.11-20',
    description: 'กระต่ายขาวหูนุ่มผูกโบว์ชมพูในผอบ กระโดดโจมตีพร้อมฟื้นปราณเวท',
    unlockGold: 1280,
    baseAtk: 20,
    atkPerLevel: 5,
    attackInterval: 1.8,
    hpBonus: 95,
    mpBonus: 45,
    atkBuff: 12,
    defBuff: 10,
    expBonusPct: 12,
    goldBonusPct: 8,
    colors: { primary: '#fff1f2', secondary: '#f472b6', accent: '#fbcfe8' },
    pixels: ['.1....1.', '.12..21.', '.111111.', '.121121.', '..2222..', '.111111.', '.1....1.', '........'],
  },
  {
    id: 'phao_acorn_squirrel',
    name: 'ผอบกระรอกถือลูกโอ๊ก',
    category: 'phao',
    rarity: 'ไม่ธรรมดา',
    tierLabel: 'Uncommon · Lv.11-20',
    description: 'กระรอกน้อยหางพวงโตถือลูกโอ๊กทองในผอบ ปาลูกโอ๊กใส่ศัตรูรัวและเพิ่มทองดรอป',
    unlockGold: 1450,
    baseAtk: 22,
    atkPerLevel: 6,
    attackInterval: 1.75,
    hpBonus: 88,
    mpBonus: 30,
    atkBuff: 14,
    defBuff: 8,
    expBonusPct: 8,
    goldBonusPct: 14,
    colors: { primary: '#d97706', secondary: '#78350f', accent: '#fde68a' },
    pixels: ['..11..22', '.1111222', '.121122.', '..13312.', '..1111..', '..2..2..', '........', '........'],
  },

  // Tier 3: Rare (Lv.21-30)
  {
    id: 'phao_ember_ninetail',
    name: 'ผอบจิ้งจอกเก้าหางอัคคี',
    category: 'phao',
    rarity: 'หายาก',
    tierLabel: 'Rare · Lv.21-30',
    description: 'จิ้งจอกเก้าหางห่อหุ้มด้วยเปลวเพลิง สะบัดหางไฟยิงเผาผลาญมอนสเตอร์ต่อเนื่อง',
    unlockGold: 2600,
    baseAtk: 28,
    atkPerLevel: 7,
    attackInterval: 1.7,
    hpBonus: 110,
    mpBonus: 40,
    atkBuff: 20,
    defBuff: 10,
    expBonusPct: 12,
    goldBonusPct: 12,
    colors: { primary: '#f97316', secondary: '#c2410c', accent: '#fef08a' },
    pixels: ['3.1..1.3', '31111113', '31211213', '.311113.', '..1111..', '.31..13.', '.2....2.', '........'],
  },
  {
    id: 'phao_sky_eagle',
    name: 'ผอบพญาเหยี่ยวเวหา',
    category: 'phao',
    rarity: 'หายาก',
    tierLabel: 'Rare · Lv.21-30',
    description: 'พญาเหยี่ยวจะงอยปากทองคำในผอบ กางปีกโฉบเฉี่ยวปล่อยคลื่นลมกรดจากเวหา',
    unlockGold: 2900,
    baseAtk: 30,
    atkPerLevel: 7,
    attackInterval: 1.65,
    hpBonus: 105,
    mpBonus: 36,
    atkBuff: 22,
    defBuff: 11,
    expBonusPct: 14,
    goldBonusPct: 10,
    colors: { primary: '#b45309', secondary: '#78350f', accent: '#facc15' },
    pixels: ['..1111..', '11133111', '12111121', '.111111.', '..1111..', '..3..3..', '........', '........'],
  },
  {
    id: 'phao_frost_penguin',
    name: 'ผอบเพนกวินผ้าพันคอเหมันต์',
    category: 'phao',
    rarity: 'หายาก',
    tierLabel: 'Rare · Lv.21-30',
    description: 'เพนกวินน้อยผ้าพันคอฟ้าเหมันต์ในผอบ พ่นเกล็ดหิมะเยือกแข็งและเสริมเกราะ',
    unlockGold: 3200,
    baseAtk: 26,
    atkPerLevel: 6,
    attackInterval: 1.75,
    hpBonus: 130,
    mpBonus: 45,
    atkBuff: 16,
    defBuff: 16,
    expBonusPct: 12,
    goldBonusPct: 12,
    colors: { primary: '#334155', secondary: '#0f172a', accent: '#38bdf8' },
    pixels: ['..1111..', '.122221.', '.111111.', '.333333.', '.122221.', '..1111..', '..3..3..', '........'],
  },
  {
    id: 'phao_stone_tortoise',
    name: 'ผอบเต่ากระดองศิลา',
    category: 'phao',
    rarity: 'หายาก',
    tierLabel: 'Rare · Lv.21-30',
    description: 'เต่าโบราณกระดองผลึกศิลาในผอบ ยืนหยัดเป็นปราการพร้อมกระแทกคลื่นปฐพี',
    unlockGold: 3600,
    baseAtk: 25,
    atkPerLevel: 6,
    attackInterval: 1.85,
    hpBonus: 165,
    mpBonus: 35,
    atkBuff: 15,
    defBuff: 22,
    expBonusPct: 10,
    goldBonusPct: 12,
    colors: { primary: '#65a30d', secondary: '#78716c', accent: '#67e8f9' },
    pixels: ['..2222..', '.232232.', '11222222', '12222222', '.11..11.', '........', '........', '........'],
  },

  // Tier 4: Epic (Lv.31-40)
  {
    id: 'phao_crimson_dragon',
    name: 'ผอบมังกรแดงเขาศิลา',
    category: 'phao',
    rarity: 'อีปิก',
    tierLabel: 'Epic · Lv.31-40',
    description: 'มังกรเพลิงแดงปีกกว้างในผอบ พ่นอัคคีสีชาดเผาผลาญศัตรูอย่างดุดัน',
    unlockGold: 6200,
    baseAtk: 38,
    atkPerLevel: 8,
    attackInterval: 1.55,
    hpBonus: 155,
    mpBonus: 55,
    atkBuff: 28,
    defBuff: 16,
    expBonusPct: 14,
    goldBonusPct: 14,
    colors: { primary: '#ef4444', secondary: '#991b1b', accent: '#fbbf24' },
    pixels: ['3.1..1.3', '21111112', '21311312', '.111111.', '..1111..', '.1....1.', '........', '........'],
  },
  {
    id: 'phao_prism_unicorn',
    name: 'ผอบยูนิคอร์นปีกสายรุ้ง',
    category: 'phao',
    rarity: 'อีปิก',
    tierLabel: 'Epic · Lv.31-40',
    description: 'ยูนิคอร์นขาวปีกนางฟ้าแผงคอสายรุ้งในผอบ ยิงลำแสงปริซึมและเพิ่ม EXP มหาศาล',
    unlockGold: 6900,
    baseAtk: 35,
    atkPerLevel: 8,
    attackInterval: 1.6,
    hpBonus: 165,
    mpBonus: 75,
    atkBuff: 24,
    defBuff: 18,
    expBonusPct: 20,
    goldBonusPct: 12,
    colors: { primary: '#f8fafc', secondary: '#c084fc', accent: '#67e8f9' },
    pixels: ['...33...', '2.1111.2', '21122112', '.111111.', '.11..11.', '........', '........', '........'],
  },
  {
    id: 'phao_sapphire_wisp',
    name: 'ผอบวิญญาณเพลิงคราม',
    category: 'phao',
    rarity: 'อีปิก',
    tierLabel: 'Epic · Lv.31-40',
    description: 'ดวงจิตวิญญาณดาวตกสีครามในผอบ ลอยอารักขาและยิงสายฟ้าเพลิงครามความถี่สูง',
    unlockGold: 7600,
    baseAtk: 40,
    atkPerLevel: 9,
    attackInterval: 1.45,
    hpBonus: 140,
    mpBonus: 85,
    atkBuff: 29,
    defBuff: 15,
    expBonusPct: 18,
    goldBonusPct: 12,
    colors: { primary: '#60a5fa', secondary: '#1d4ed8', accent: '#e0f2fe' },
    pixels: ['...33...', '..3113..', '.313313.', '31311313', '.311113.', '..2112..', '...22...', '........'],
  },
  {
    id: 'phao_abyss_neko',
    name: 'ผอบแมวดำเพลิงอเวจี',
    category: 'phao',
    rarity: 'อีปิก',
    tierLabel: 'Epic · Lv.31-40',
    description: 'แมวดำนัยน์ตาอัคคีห้อมล้อมด้วยเปลวม่วงอเวจี ฟาดกรงเล็บเงาและดึงดูดทองคำ',
    unlockGold: 8400,
    baseAtk: 41,
    atkPerLevel: 9,
    attackInterval: 1.5,
    hpBonus: 160,
    mpBonus: 65,
    atkBuff: 30,
    defBuff: 16,
    expBonusPct: 14,
    goldBonusPct: 20,
    colors: { primary: '#312e81', secondary: '#111827', accent: '#c084fc' },
    pixels: ['32....23', '311..113', '21311312', '.222222.', '31111113', '.2....2.', '........', '........'],
  },

  // Tier 5: Legendary (Lv.41-50)
  {
    id: 'phao_sacred_kitsune',
    name: 'ผอบจิ้งจอกขาวเก้าหางศักดิ์สิทธิ์',
    category: 'phao',
    rarity: 'ตำนาน',
    tierLabel: 'Legendary · Lv.41-50',
    description: 'จิ้งจอกขาวเก้าหางสวมสร้อยทองศักดิ์สิทธิ์ ปล่อยปราณดาราจักรและเสริม EXP สูงมาก',
    unlockGold: 14000,
    baseAtk: 48,
    atkPerLevel: 10,
    attackInterval: 1.45,
    hpBonus: 210,
    mpBonus: 90,
    atkBuff: 36,
    defBuff: 22,
    expBonusPct: 22,
    goldBonusPct: 16,
    colors: { primary: '#f8fafc', secondary: '#fde68a', accent: '#f59e0b' },
    pixels: ['2.1..1.2', '21111112', '21311312', '.333333.', '.111111.', '.1....1.', '........', '........'],
  },
  {
    id: 'phao_solar_phoenix',
    name: 'ผอบฟีนิกซ์สุริยันทอง',
    category: 'phao',
    rarity: 'ตำนาน',
    tierLabel: 'Legendary · Lv.41-50',
    description: 'วิหคเพลิงสุริยันสีทองอร่ามในผอบ สยายปีกสาดพายุอัคคีล้างผลาญมอนสเตอร์',
    unlockGold: 15500,
    baseAtk: 54,
    atkPerLevel: 11,
    attackInterval: 1.4,
    hpBonus: 200,
    mpBonus: 80,
    atkBuff: 42,
    defBuff: 20,
    expBonusPct: 18,
    goldBonusPct: 18,
    colors: { primary: '#f59e0b', secondary: '#dc2626', accent: '#fef08a' },
    pixels: ['3..33..3', '21133112', '21211212', '.111111.', '..2112..', '..3..3..', '........', '........'],
  },
  {
    id: 'phao_glacial_wolf',
    name: 'ผอบหมาป่าปีกน้ำแข็ง',
    category: 'phao',
    rarity: 'ตำนาน',
    tierLabel: 'Legendary · Lv.41-50',
    description: 'หมาป่าน้ำแข็งปีกผลึกฟ้าในผอบ โจมตีด้วยเขี้ยวเหมันต์และมอบเกราะน้ำแข็ง',
    unlockGold: 17000,
    baseAtk: 50,
    atkPerLevel: 10,
    attackInterval: 1.42,
    hpBonus: 230,
    mpBonus: 75,
    atkBuff: 38,
    defBuff: 26,
    expBonusPct: 17,
    goldBonusPct: 17,
    colors: { primary: '#93c5fd', secondary: '#1e3a8a', accent: '#e0f2fe' },
    pixels: ['31....13', '31211213', '11311311', '.311113.', '.111111.', '.2....2.', '........', '........'],
  },
  {
    id: 'phao_armored_lion',
    name: 'ผอบราชสีห์เกราะปีกทอง',
    category: 'phao',
    rarity: 'ตำนาน',
    tierLabel: 'Legendary · Lv.41-50',
    description: 'พญาราชสีห์สวมเกราะอัศวินปีกทองในผอบ เสริมพลังโจมตีและป้องกันอย่างสมดุล',
    unlockGold: 18500,
    baseAtk: 52,
    atkPerLevel: 11,
    attackInterval: 1.42,
    hpBonus: 245,
    mpBonus: 70,
    atkBuff: 40,
    defBuff: 28,
    expBonusPct: 16,
    goldBonusPct: 20,
    colors: { primary: '#eab308', secondary: '#92400e', accent: '#fef08a' },
    pixels: ['3.2222.3', '32133123', '12111121', '.233332.', '.111111.', '.2....2.', '........', '........'],
  },

  // Tier 6: Mythic (Lv.51-60)
  {
    id: 'phao_obsidian_dragon',
    name: 'ผอบมังกรทมิฬปีกโลหิต',
    category: 'phao',
    rarity: 'มายา',
    tierLabel: 'Mythic · Lv.51-60',
    description: 'มังกรออบซิเดียนปีกสีโลหิตในผอบ พ่นเพลิงทมิฬเจาะเกราะที่ทรงอานุภาพสูง',
    unlockGold: 26000,
    baseAtk: 64,
    atkPerLevel: 12,
    attackInterval: 1.32,
    hpBonus: 270,
    mpBonus: 95,
    atkBuff: 52,
    defBuff: 28,
    expBonusPct: 20,
    goldBonusPct: 20,
    colors: { primary: '#27272a', secondary: '#7f1d1d', accent: '#f43f5e' },
    pixels: ['2.1..1.2', '21311312', '21122112', '.113311.', '..1111..', '.2....2.', '........', '........'],
  },
  {
    id: 'phao_seraph_cat',
    name: 'ผอบเหมียวทูตสวรรค์มีวงแหวน',
    category: 'phao',
    rarity: 'มายา',
    tierLabel: 'Mythic · Lv.51-60',
    description: 'เจ้าเหมียวทูตสวรรค์หกปีกพร้อมวงแหวนทองคำ ปล่อยแสงศักดิ์สิทธิ์และบัฟทองคำ',
    unlockGold: 28500,
    baseAtk: 58,
    atkPerLevel: 11,
    attackInterval: 1.35,
    hpBonus: 280,
    mpBonus: 115,
    atkBuff: 46,
    defBuff: 32,
    expBonusPct: 20,
    goldBonusPct: 24,
    colors: { primary: '#fefce8', secondary: '#eab308', accent: '#bae6fd' },
    pixels: ['..2222..', '311..113', '31211213', '.111111.', '.112211.', '.1....1.', '........', '........'],
  },
  {
    id: 'phao_violet_hound',
    name: 'ผอบสุนัขอสูรเงาม่วงมีปีก',
    category: 'phao',
    rarity: 'มายา',
    tierLabel: 'Mythic · Lv.51-60',
    description: 'หมาป่าอสูรเงาม่วงมีปีกค้างคาวและเปลวอเวจี โจมตีความเร็วสูงดั่งสายฟ้ามืด',
    unlockGold: 31000,
    baseAtk: 66,
    atkPerLevel: 12,
    attackInterval: 1.28,
    hpBonus: 260,
    mpBonus: 95,
    atkBuff: 54,
    defBuff: 28,
    expBonusPct: 21,
    goldBonusPct: 21,
    colors: { primary: '#1e1b4b', secondary: '#6b21a8', accent: '#d946ef' },
    pixels: ['3.2..2.3', '21311312', '21111112', '.311113.', '.111111.', '.2....2.', '........', '........'],
  },
  {
    id: 'phao_rune_golem',
    name: 'ผอบโกเลมอัศวินแกนรูน',
    category: 'phao',
    rarity: 'มายา',
    tierLabel: 'Mythic · Lv.51-60',
    description: 'โกเลมอัศวินศิลาขาว-ทองสลักรูนฟ้า ยิงลำแสงแกนรูนและมอบพลังป้องกันสูงสุด',
    unlockGold: 34000,
    baseAtk: 60,
    atkPerLevel: 12,
    attackInterval: 1.38,
    hpBonus: 340,
    mpBonus: 100,
    atkBuff: 48,
    defBuff: 42,
    expBonusPct: 18,
    goldBonusPct: 22,
    colors: { primary: '#d6d3d1', secondary: '#a16207', accent: '#38bdf8' },
    pixels: ['.211112.', '31233213', '11133111', '11222211', '.11..11.', '.2....2.', '........', '........'],
  },

  // Tier 7: Divine (Lv.61+)
  {
    id: 'phao_astral_dragon',
    name: 'ผอบมังกรดาราจักรคริสตัล',
    category: 'phao',
    rarity: 'เทพเจ้า',
    tierLabel: 'Divine · Lv.61+',
    description: 'มังกรเทพดาราจักรปีกคริสตัลใส ปลดปล่อยคลื่นกาแล็กซีระดับเทพเจ้า',
    unlockGold: 45000,
    baseAtk: 78,
    atkPerLevel: 14,
    attackInterval: 1.2,
    hpBonus: 350,
    mpBonus: 130,
    atkBuff: 68,
    defBuff: 40,
    expBonusPct: 24,
    goldBonusPct: 24,
    colors: { primary: '#6366f1', secondary: '#312e81', accent: '#67e8f9' },
    pixels: ['3.1..1.3', '31311313', '11133111', '.133331.', '..1111..', '.2....2.', '........', '........'],
  },
  {
    id: 'phao_frost_stag',
    name: 'ผอบกวางเทพดาราเหมันต์',
    category: 'phao',
    rarity: 'เทพเจ้า',
    tierLabel: 'Divine · Lv.61+',
    description: 'กวางสวรรค์เขาดาราเหมันต์ในผอบ อัญเชิญพายุหิมะดาราและบัฟ EXP สูงสุด',
    unlockGold: 49000,
    baseAtk: 72,
    atkPerLevel: 13,
    attackInterval: 1.24,
    hpBonus: 370,
    mpBonus: 145,
    atkBuff: 62,
    defBuff: 44,
    expBonusPct: 25,
    goldBonusPct: 22,
    colors: { primary: '#e0f2fe', secondary: '#2563eb', accent: '#bae6fd' },
    pixels: ['32....23', '.311113.', '.121121.', '.113311.', '.11..11.', '2......2', '........', '........'],
  },
  {
    id: 'phao_celestial_owl',
    name: 'ผอบพญานกฮูกหิมะสวรรค์',
    category: 'phao',
    rarity: 'เทพเจ้า',
    tierLabel: 'Divine · Lv.61+',
    description: 'พญานกฮูกหิมะมงกุฎทองแห่งสวรรค์ สยายปีกยิงลำแสงดาวเคราะห์สุดแม่นยำ',
    unlockGold: 53000,
    baseAtk: 76,
    atkPerLevel: 14,
    attackInterval: 1.22,
    hpBonus: 360,
    mpBonus: 140,
    atkBuff: 64,
    defBuff: 45,
    expBonusPct: 24,
    goldBonusPct: 25,
    colors: { primary: '#f8fafc', secondary: '#60a5fa', accent: '#fbbf24' },
    pixels: ['3.3..3.3', '21133112', '21211212', '.111111.', '..1331..', '..3..3..', '........', '........'],
  },
  {
    id: 'phao_golden_seraph',
    name: 'ผอบเทพธิดาเซราฟิมปีกทอง',
    category: 'phao',
    rarity: 'เทพเจ้า',
    tierLabel: 'Divine · Lv.61+',
    description: 'เทพธิดาเซราฟิมหกปีกทองสถิตในผอบ อัญเชิญหอกแสงศักดิ์สิทธิ์สูงสุดครบทุกด้าน',
    unlockGold: 58000,
    baseAtk: 84,
    atkPerLevel: 15,
    attackInterval: 1.15,
    hpBonus: 400,
    mpBonus: 160,
    atkBuff: 72,
    defBuff: 48,
    expBonusPct: 25,
    goldBonusPct: 28,
    colors: { primary: '#fef3c7', secondary: '#d97706', accent: '#ffffff' },
    pixels: ['..2222..', '3.1111.3', '31211213', '31122113', '.211112.', '..2..2..', '........', '........'],
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
