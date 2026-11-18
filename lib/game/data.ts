import { WEAPON_CATALOG } from './weapon-catalog'

export type WeaponType = 'stick' | 'sword' | 'staff' | 'bow' | 'dagger'

export type SkillKind = 'single' | 'aoe-self' | 'aoe-target' | 'multi' | 'heal'

export interface SkillDef {
  id: string
  name: string
  mp: number
  mult: number
  cooldown: number
  kind: SkillKind
  radius?: number
  hits?: number
  color: string
}

export interface JobDef {
  id: string
  name: string
  tier: 0 | 1 | 2
  from: string | null
  alsoFrom?: string[]
  goldBonus?: number
  reqLevel: number
  cost: number
  description: string
  hpMul: number
  mpMul: number
  atkMul: number
  defMul: number
  speedMul: number
  attackSpeed: number
  crit: number
  range: number
  ranged: boolean
  weaponTypes: WeaponType[]
  colors: { hair: string; body: string; legs: string; accent: string; skin?: string; hat?: string }
  skills: SkillDef[]
}

export const STARTER_JOB_IDS = ['novice'] as const
export const TIER1_JOB_IDS = ['swordsman', 'mage', 'archer', 'cleric', 'merchant', 'thief'] as const

const LEGACY_JOB_ALIASES: Record<string, string> = {
  priest: 'cleric',
  high_priest: 'cleric',
  knight: 'templar',
  paladin: 'templar',
  berserker: 'kensei',
  wizard: 'mage',
  hunter: 'archer',
  assassin: 'sinister',
  gm: 'the_king',
}

export const JOBS: Record<string, JobDef> = {
  novice: {
    id: 'novice',
    name: 'ผู้ฝึกหัด (Novice)',
    tier: 0,
    from: null,
    reqLevel: 1,
    cost: 0,
    description: 'นักผจญภัยมือใหม่ผู้เริ่มต้นการเดินทาง ผมน้ำตาลฟู ผ้าพันคอแดง เสื้อคลุมสีขาวสายสะพายหนัง กระเป๋าคาดเอว และไม้พลอง สามารถเปลี่ยนเป็น 6 อาชีพหลักได้ที่หอปรมาจารย์อาร์ค',
    hpMul: 1.0,
    mpMul: 1.0,
    atkMul: 1.0,
    defMul: 1.0,
    speedMul: 1.08,
    attackSpeed: 0.56,
    crit: 0.08,
    range: 24,
    ranged: false,
    weaponTypes: ['stick', 'sword', 'dagger'],
    colors: { hair: '#7f5338', body: '#f6f2ea', legs: '#3b3332', accent: '#dc2626', hat: '#7f5338' },
    skills: [
      { id: 'power', name: 'ฟาดพลังมือใหม่', mp: 5, mult: 2.1, cooldown: 1.8, kind: 'single', color: '#38bdf8' },
      { id: 'first-aid', name: 'ปฐมพยาบาล', mp: 10, mult: 0.28, cooldown: 5, kind: 'heal', color: '#f472b6' },
    ],
  },
  swordsman: {
    id: 'swordsman',
    name: 'นักดาบ (Swordsman)',
    tier: 1,
    from: 'novice',
    reqLevel: 1,
    cost: 500,
    description: 'นักสู้ระยะประชิด พลังชีวิตและพลังป้องกันสูง',
    hpMul: 1.45,
    mpMul: 0.85,
    atkMul: 1.25,
    defMul: 1.35,
    speedMul: 1,
    attackSpeed: 0.6,
    crit: 0.08,
    range: 24,
    ranged: false,
    weaponTypes: ['sword', 'stick'],
    colors: { hair: '#e11d48', body: '#64748b', legs: '#334155', accent: '#f43f5e' },
    skills: [
      { id: 'bash', name: 'ฟันกระแทก', mp: 8, mult: 2.3, cooldown: 2, kind: 'single', color: '#ffd166' },
      { id: 'whirl', name: 'ดาบพายุหมุน', mp: 16, mult: 1.6, cooldown: 5, kind: 'aoe-self', radius: 44, color: '#fb7185' },
    ],
  },
  mage: {
    id: 'mage',
    name: 'นักเวท (Mage)',
    tier: 1,
    from: 'novice',
    reqLevel: 1,
    cost: 500,
    description: 'ผู้ใช้เวทมนตร์ระยะไกล พลังโจมตีเวทรุนแรง',
    hpMul: 0.9,
    mpMul: 1.9,
    atkMul: 1.5,
    defMul: 0.8,
    speedMul: 1,
    attackSpeed: 0.85,
    crit: 0.06,
    range: 96,
    ranged: true,
    weaponTypes: ['staff', 'stick'],
    colors: { hair: '#d8b4fe', body: '#5b21b6', legs: '#3b0764', accent: '#38bdf8' },
    skills: [
      { id: 'firebolt', name: 'ศรเวทมนตร์', mp: 10, mult: 2.6, cooldown: 1.5, kind: 'single', color: '#38bdf8' },
      { id: 'meteor', name: 'อุกกาบาต', mp: 26, mult: 2.1, cooldown: 6, kind: 'aoe-target', radius: 52, color: '#818cf8' },
    ],
  },
  archer: {
    id: 'archer',
    name: 'นักธนู (Archer)',
    tier: 1,
    from: 'novice',
    reqLevel: 1,
    cost: 500,
    description: 'นักแม่นธนู โจมตีไกลและรวดเร็ว',
    hpMul: 1.05,
    mpMul: 1,
    atkMul: 1.3,
    defMul: 0.9,
    speedMul: 1.12,
    attackSpeed: 0.55,
    crit: 0.14,
    range: 112,
    ranged: true,
    weaponTypes: ['bow', 'stick'],
    colors: { hair: '#22c55e', body: '#15803d', legs: '#4b3b2a', accent: '#86efac' },
    skills: [
      { id: 'double', name: 'ยิงคู่', mp: 9, mult: 1.3, cooldown: 1.8, kind: 'multi', hits: 2, color: '#86efac' },
      { id: 'rain', name: 'ฝนธนู', mp: 22, mult: 1.7, cooldown: 6, kind: 'aoe-target', radius: 48, color: '#4ade80' },
    ],
  },
  cleric: {
    id: 'cleric',
    name: 'นักบวช (Cleric)',
    tier: 1,
    from: 'novice',
    reqLevel: 1,
    cost: 500,
    description: 'นักบวชแห่งแสง ใช้เวทฟื้นฟูพลังชีวิตและศรศักดิ์สิทธิ์',
    hpMul: 1.2,
    mpMul: 1.85,
    atkMul: 1.22,
    defMul: 1.05,
    speedMul: 1,
    attackSpeed: 0.78,
    crit: 0.07,
    range: 96,
    ranged: true,
    weaponTypes: ['staff', 'stick'],
    colors: { hair: '#e8b059', body: '#f8fafc', legs: '#e2e8f0', accent: '#facc15' },
    skills: [
      { id: 'grace-heal', name: 'แสงเยียวยา', mp: 18, mult: 0.32, cooldown: 5, kind: 'heal', color: '#80ed99' },
      { id: 'holy-bolt', name: 'ศรแห่งแสง', mp: 10, mult: 2.35, cooldown: 1.9, kind: 'single', color: '#fef08a' },
      { id: 'sanctuary', name: 'เขตศักดิ์สิทธิ์', mp: 28, mult: 1.75, cooldown: 6.5, kind: 'aoe-self', radius: 64, color: '#fde047' },
    ],
  },
  merchant: {
    id: 'merchant',
    name: 'พ่อค้า (Merchant)',
    tier: 1,
    from: 'novice',
    goldBonus: 0.15,
    reqLevel: 1,
    cost: 500,
    description: 'เชี่ยวชาญการค้า เพิ่มทองดรอป +15% และฟาดฟันด้วยพลังเหรียญทอง',
    hpMul: 1.3,
    mpMul: 1.1,
    atkMul: 1.18,
    defMul: 1.2,
    speedMul: 1.05,
    attackSpeed: 0.58,
    crit: 0.1,
    range: 24,
    ranged: false,
    weaponTypes: ['sword', 'stick'],
    colors: { hair: '#9a6b32', body: '#b45309', legs: '#451a03', accent: '#fbbf24' },
    skills: [
      { id: 'gold-strike', name: 'ฟาดเหรียญทอง', mp: 8, mult: 2.4, cooldown: 2, kind: 'single', color: '#fbbf24' },
      { id: 'cart-strike', name: 'รถเข็นพุ่งชน', mp: 18, mult: 1.85, cooldown: 5, kind: 'aoe-self', radius: 46, color: '#f59e0b' },
    ],
  },
  thief: {
    id: 'thief',
    name: 'โจร (Thief)',
    tier: 1,
    from: 'novice',
    reqLevel: 1,
    cost: 500,
    description: 'ว่องไว คริติคอลสูง เคลื่อนที่เร็ว',
    hpMul: 1.1,
    mpMul: 0.95,
    atkMul: 1.24,
    defMul: 0.95,
    speedMul: 1.3,
    attackSpeed: 0.4,
    crit: 0.25,
    range: 22,
    ranged: false,
    weaponTypes: ['dagger', 'stick'],
    colors: { hair: '#1f1f1f', body: '#3d3d4f', legs: '#262633', accent: '#e11d48' },
    skills: [
      { id: 'dblatk', name: 'แทงสองครั้ง', mp: 7, mult: 1.25, cooldown: 1.4, kind: 'multi', hits: 2, color: '#e5e5e5' },
      { id: 'backstab', name: 'แทงข้างหลัง', mp: 18, mult: 3.4, cooldown: 4.5, kind: 'single', color: '#ff4d6d' },
    ],
  },
  kensei: {
    id: 'kensei',
    name: 'เคนเซย์ (Kensei)',
    tier: 2,
    from: 'swordsman',
    alsoFrom: ['thief'],
    reqLevel: 30,
    cost: 12000,
    description: 'ปรมาจารย์ดาบผสานพลังนักดาบและโจร ฟันคลื่นดาบสีครามรวดเร็วดุจสายฟ้า',
    hpMul: 1.65,
    mpMul: 1.15,
    atkMul: 1.95,
    defMul: 1.25,
    speedMul: 1.32,
    attackSpeed: 0.35,
    crit: 0.28,
    range: 28,
    ranged: false,
    weaponTypes: ['sword', 'dagger'],
    colors: { hair: '#1e293b', body: '#1e3a8a', legs: '#0f172a', accent: '#38bdf8' },
    skills: [
      { id: 'kensei-flash', name: 'ดาบวาบพริบตา', mp: 10, mult: 1.45, cooldown: 1.6, kind: 'multi', hits: 3, color: '#38bdf8' },
      { id: 'iaijutsu', name: 'อิไอจุตสึ', mp: 22, mult: 4.2, cooldown: 4.5, kind: 'single', color: '#60a5fa' },
      { id: 'bladestorm', name: 'พายุเคนเซย์', mp: 42, mult: 2.6, cooldown: 7.5, kind: 'aoe-self', radius: 64, color: '#93c5fd' },
    ],
  },
  iron_fist: {
    id: 'iron_fist',
    name: 'หมัดเหล็ก (Iron Fist)',
    tier: 2,
    from: 'merchant',
    alsoFrom: ['swordsman'],
    goldBonus: 0.1,
    reqLevel: 30,
    cost: 12000,
    description: 'นักสู้หมัดหนัก พุ่งซัด Flash Smash และทุบปฐพีสั่นสะเทือนด้วยเพลิงทองคำ',
    hpMul: 1.95,
    mpMul: 1.0,
    atkMul: 1.85,
    defMul: 1.6,
    speedMul: 1.15,
    attackSpeed: 0.42,
    crit: 0.18,
    range: 26,
    ranged: false,
    weaponTypes: ['sword', 'stick'],
    colors: { hair: '#e2e8f0', body: '#d97706', legs: '#78350f', accent: '#fb923c' },
    skills: [
      { id: 'flash-smash', name: 'พุ่งซัดหมัดเหล็ก', mp: 12, mult: 3.3, cooldown: 2.4, kind: 'single', color: '#fb923c' },
      { id: 'quake-hammer', name: 'ทุบพสุธา', mp: 26, mult: 2.3, cooldown: 5.5, kind: 'aoe-self', radius: 58, color: '#f59e0b' },
      { id: 'iron-will', name: 'จิตวิญญาณเหล็ก', mp: 24, mult: 0.32, cooldown: 6.5, kind: 'heal', color: '#fed7aa' },
    ],
  },
  wicked_necromancer: {
    id: 'wicked_necromancer',
    name: 'เนโครแมนเซอร์ทมิฬ (Wicked Necromancer)',
    tier: 2,
    from: 'mage',
    alsoFrom: ['cleric'],
    reqLevel: 30,
    cost: 12000,
    description: 'จอมเวทคำสาปปลุกอาคมแมวดำและคำสาปอเวจี ทลายเกราะศัตรูเป็นวงกว้าง',
    hpMul: 1.25,
    mpMul: 2.75,
    atkMul: 2.15,
    defMul: 1.0,
    speedMul: 1.05,
    attackSpeed: 0.68,
    crit: 0.12,
    range: 114,
    ranged: true,
    weaponTypes: ['staff'],
    colors: { hair: '#cbd5e1', body: '#2e1065', legs: '#0f172a', accent: '#c084fc' },
    skills: [
      { id: 'black-cat-hex', name: 'มนต์แมวดำ', mp: 14, mult: 3.2, cooldown: 2.2, kind: 'single', color: '#c084fc' },
      { id: 'lower-resist', name: 'คำสาปทลายเกราะ', mp: 28, mult: 2.4, cooldown: 5, kind: 'aoe-target', radius: 60, color: '#a855f7' },
      { id: 'abyss-requiem', name: 'เสียงเพรียกอเวจี', mp: 48, mult: 3.1, cooldown: 8, kind: 'aoe-self', radius: 82, color: '#e879f9' },
    ],
  },
  the_king: {
    id: 'the_king',
    name: 'เดอะคิง (The King)',
    tier: 2,
    from: 'merchant',
    alsoFrom: ['mage'],
    goldBonus: 0.25,
    reqLevel: 35,
    cost: 15000,
    description: 'ราชาแห่งตลาดและการเงิน เพิ่มทองดรอป +25% พร้อมเวท Candle Storm & Stop-Loss',
    hpMul: 1.5,
    mpMul: 2.5,
    atkMul: 2.1,
    defMul: 1.3,
    speedMul: 1.1,
    attackSpeed: 0.62,
    crit: 0.16,
    range: 112,
    ranged: true,
    weaponTypes: ['staff', 'sword'],
    colors: { hair: '#f59e0b', body: '#991b1b', legs: '#450a0a', accent: '#facc15' },
    skills: [
      { id: 'dividend-yield', name: 'ปันผลทองคำ', mp: 24, mult: 0.35, cooldown: 6, kind: 'heal', color: '#fde047' },
      { id: 'candle-storm', name: 'พายุแท่งเทียน', mp: 30, mult: 2.8, cooldown: 5.5, kind: 'aoe-target', radius: 68, color: '#34d399' },
      { id: 'stop-loss', name: 'ตัดขาดทุนพิฆาต', mp: 40, mult: 4.8, cooldown: 7.5, kind: 'single', color: '#fb7185' },
    ],
  },
  sinister: {
    id: 'sinister',
    name: 'ซินิสเตอร์ (Sinister)',
    tier: 2,
    from: 'thief',
    alsoFrom: ['archer'],
    reqLevel: 35,
    cost: 15000,
    description: 'มัจจุราชเงา อัตราคริติคอลสูงสุด สังหารฉับพลันด้วยเงาจันทราโลหิต',
    hpMul: 1.45,
    mpMul: 1.25,
    atkMul: 1.9,
    defMul: 1.1,
    speedMul: 1.48,
    attackSpeed: 0.3,
    crit: 0.38,
    range: 28,
    ranged: false,
    weaponTypes: ['dagger', 'bow'],
    colors: { hair: '#09090b', body: '#27090d', legs: '#18181b', accent: '#e11d48' },
    skills: [
      { id: 'sinister-cross', name: 'กากบาททมิฬ', mp: 10, mult: 1.45, cooldown: 1.5, kind: 'multi', hits: 3, color: '#fb7185' },
      { id: 'reaper-ambush', name: 'ลอบสังหารมรณะ', mp: 22, mult: 4.4, cooldown: 4.2, kind: 'single', color: '#e11d48' },
      { id: 'crimson-eclipse', name: 'จันทราโลหิต', mp: 46, mult: 3.2, cooldown: 8, kind: 'aoe-self', radius: 68, color: '#f43f5e' },
    ],
  },
  templar: {
    id: 'templar',
    name: 'เทมพลาร์ (Templar)',
    tier: 2,
    from: 'swordsman',
    alsoFrom: ['cleric'],
    reqLevel: 30,
    cost: 12000,
    description: 'อัศวินวิหารผสานดาบและมนตร์ศักดิ์สิทธิ์ ป้องกันแข็งแกร่งดุจป้อมปราการ',
    hpMul: 2.15,
    mpMul: 1.25,
    atkMul: 1.5,
    defMul: 2.05,
    speedMul: 0.95,
    attackSpeed: 0.52,
    crit: 0.1,
    range: 28,
    ranged: false,
    weaponTypes: ['sword'],
    colors: { hair: '#eab308', body: '#f8fafc', legs: '#475569', accent: '#3b82f6' },
    skills: [
      { id: 'holy-strike', name: 'ฟันศักดิ์สิทธิ์', mp: 12, mult: 2.8, cooldown: 2, kind: 'single', color: '#ffe08a' },
      { id: 'sanctuary', name: 'เขตศักดิ์สิทธิ์', mp: 30, mult: 2.1, cooldown: 6, kind: 'aoe-self', radius: 64, color: '#fef08a' },
      { id: 'templar-bastion', name: 'โล่เทมพลาร์', mp: 28, mult: 0.4, cooldown: 7, kind: 'heal', color: '#fde047' },
    ],
  },
  nekobaku: {
    id: 'nekobaku',
    name: 'เนโกะบาคุ (Nekobaku)',
    tier: 2,
    from: 'archer',
    alsoFrom: ['mage'],
    reqLevel: 30,
    cost: 12000,
    description: 'นักเล่นแร่ระเบิดหูแมว โจมตีด้วยขวดระเบิดพลังชมพู Fizz Flask & Neko Barrage',
    hpMul: 1.3,
    mpMul: 1.9,
    atkMul: 1.95,
    defMul: 1.05,
    speedMul: 1.2,
    attackSpeed: 0.44,
    crit: 0.2,
    range: 120,
    ranged: true,
    weaponTypes: ['bow', 'staff'],
    colors: { hair: '#27272a', body: '#db2777', legs: '#18181b', accent: '#f472b6' },
    skills: [
      { id: 'fizz-flask', name: 'ขวดระเบิดซ่า', mp: 18, mult: 2.3, cooldown: 3.2, kind: 'aoe-target', radius: 58, color: '#f472b6' },
      { id: 'tar-flask', name: 'ขวดน้ำมันดิน', mp: 20, mult: 3.6, cooldown: 3.5, kind: 'single', color: '#fb7185' },
      { id: 'neko-barrage', name: 'ฝนระเบิดเนโกะ', mp: 32, mult: 1.45, cooldown: 5, kind: 'multi', hits: 3, color: '#fbcfe8' },
    ],
  },
  mamushi: {
    id: 'mamushi',
    name: 'มามูชิ (Mamushi)',
    tier: 2,
    from: 'archer',
    alsoFrom: ['thief'],
    reqLevel: 30,
    cost: 12000,
    description: 'นินจาพิษใช้เขี้ยวอสรพิษ Viper Fang และดาวกระจายสะท้อนสังหาร',
    hpMul: 1.35,
    mpMul: 1.35,
    atkMul: 1.85,
    defMul: 1.05,
    speedMul: 1.38,
    attackSpeed: 0.36,
    crit: 0.26,
    range: 118,
    ranged: true,
    weaponTypes: ['bow', 'dagger'],
    colors: { hair: '#14532d', body: '#064e3b', legs: '#022c22', accent: '#4ade80' },
    skills: [
      { id: 'viper-fang', name: 'เขี้ยวอสรพิษ', mp: 12, mult: 3.5, cooldown: 2.4, kind: 'single', color: '#4ade80' },
      { id: 'bouncing-shuriken', name: 'ดาวกระจายสะท้อน', mp: 16, mult: 1.4, cooldown: 2.6, kind: 'multi', hits: 3, color: '#86efac' },
      { id: 'venom-overload', name: 'พิษคลั่งระเบิด', mp: 36, mult: 2.6, cooldown: 6.5, kind: 'aoe-target', radius: 64, color: '#a3e635' },
    ],
  },
}

export function normalizeJobId(jobId?: string | null): string {
  if (!jobId || typeof jobId !== 'string') return 'novice'
  if (JOBS[jobId]) return jobId
  const mapped = LEGACY_JOB_ALIASES[jobId]
  return mapped && JOBS[mapped] ? mapped : 'novice'
}

export type ItemKind = 'consumable' | 'weapon' | 'armor' | 'material'
export type EquipmentSlot = 'weapon' | 'armor' | 'shoes' | 'cloak' | 'accessory'

export interface ItemDef {
  id: string
  name: string
  kind: ItemKind
  price: number
  icon: string
  color: string
  description: string
  heal?: number
  mana?: number
  atk?: number
  def?: number
  weaponType?: WeaponType
  reqLevel?: number
  tier?: number
  asset?: string
  effect?: boolean
  gmOnly?: boolean
  slot?: EquipmentSlot
  allowedJobs?: string[]
}

const weapon = (
  id: string,
  name: string,
  weaponType: WeaponType,
  atk: number,
  price: number,
  tier: number,
  reqLevel: number,
  color: string,
): ItemDef => ({
  id,
  name,
  kind: 'weapon',
  weaponType,
  atk,
  price,
  tier,
  reqLevel,
  icon: weaponType,
  color,
  description: `อาวุธ (${weaponType}) พลังโจมตี +${atk}`,
})

const armor = (id: string, name: string, def: number, price: number, tier: number, reqLevel: number, color: string): ItemDef => ({
  id,
  name,
  kind: 'armor',
  slot: 'armor',
  def,
  price,
  tier,
  reqLevel,
  icon: 'armor',
  color,
  description: `ชุดเกราะ พลังป้องกัน +${def}`,
})

const CATALOG_NAMES = ['รัตติกาล', 'เพลิงฟ้า', 'เขี้ยวจันทรา', 'ผ่าอเวจี', 'เงาพราย', 'ดาวตก', 'โลหิตแดง', 'วายุเงิน', 'พิทักษ์เถ้า', 'ราชันย์ผลึก']
const CATALOG_ASSETS = [
  ...Array.from({ length: 25 }, (_, i) => `assassin${i ? `_${i + 1}` : ''}.png`),
  ...Array.from({ length: 25 }, (_, i) => `pix${i ? `_${i + 1}` : ''}.png`),
  'pixellab-object-03b36157.png',
  'pixellab-object-1f1f412f.png',
  'pixellab-object-5a4d691b.png',
  'pixellab-object-705a0bad.png',
]

const VISUAL_CLASSIFICATION: Record<string, 'dagger' | 'staff' | 'sword' | 'bow'> = {
  'assassin.png': 'staff',
  'assassin_2.png': 'bow',
  'assassin_3.png': 'sword',
  'assassin_4.png': 'sword',
  'assassin_5.png': 'dagger',
  'assassin_6.png': 'dagger',
  'assassin_7.png': 'dagger',
  'assassin_8.png': 'sword',
  'assassin_15.png': 'dagger',
  'assassin_25.png': 'sword',
  'pix.png': 'sword',
  'pix_5.png': 'staff',
  'pix_15.png': 'staff',
  'pix_25.png': 'dagger',
  'pixellab-object-03b36157.png': 'staff',
}

const MAGE_NAMED_ITEMS = new Set(['ราชันย์ผลึก', 'พิทักษ์เถ้า', 'เขี้ยวจันทรา', 'ผ่าอเวจี'])

const catalogItems = Object.fromEntries(CATALOG_ASSETS.map((asset, index) => {
  const baseName = CATALOG_NAMES[index % CATALOG_NAMES.length]
  const isEffect = index >= 50
  const forcedMage = MAGE_NAMED_ITEMS.has(baseName)
  const weaponType = forcedMage ? 'staff' : VISUAL_CLASSIFICATION[asset] ?? (isEffect ? 'staff' : 'sword')
  const weaponLabel = weaponType === 'dagger' ? 'มีด Assassin' : weaponType === 'staff' ? 'คฑา Mage' : weaponType === 'bow' ? 'ธนู Archer' : 'ดาบ Swordsman'
  const tier = isEffect ? 4 : index % 3 + 1
  const atk = 18 + tier * 16 + (index % 5) * 3
  const id = `catalog_${asset.replace('.png', '').replaceAll('-', '_')}`
  const name = `${baseName} ${isEffect ? 'อุปกรณ์อาคม' : weaponLabel} ${String(index + 1).padStart(2, '0')}`
  const item: ItemDef = {
    id,
    name,
    kind: isEffect ? 'armor' : 'weapon',
    slot: isEffect ? (['armor', 'shoes', 'cloak', 'accessory'][index % 4] as EquipmentSlot) : 'weapon',
    weaponType: isEffect ? undefined : weaponType,
    atk: isEffect ? undefined : atk,
    def: isEffect ? 20 + tier * 10 : undefined,
    price: 900 * tier,
    tier,
    reqLevel: tier * 10,
    icon: isEffect ? 'armor' : weaponType,
    effect: isEffect,
    color: isEffect ? '#c084fc' : weaponType === 'dagger' ? '#d00000' : weaponType === 'staff' ? '#8b5cf6' : weaponType === 'bow' ? '#16a34a' : '#f59e0b',
    description: `${isEffect ? 'อุปกรณ์อาคมจากบอส' : `อาวุธสำหรับ ${weaponLabel}`} | ไฟล์: ${asset} | ${isEffect ? `ป้องกัน +${20 + tier * 10}` : `โจมตี +${atk}`}`,
  }
  return [id, item]
})) as Record<string, ItemDef>

const BASE_ITEMS: Record<string, ItemDef> = {
  ...catalogItems,
  red_potion: { id: 'red_potion', name: 'ยาแดง', kind: 'consumable', price: 30, heal: 60, icon: 'potion', color: '#e63946', description: 'ฟื้นฟู HP 60' },
  orange_potion: { id: 'orange_potion', name: 'ยาส้ม', kind: 'consumable', price: 120, heal: 220, icon: 'potion', color: '#f4a261', description: 'ฟื้นฟู HP 220' },
  white_potion: { id: 'white_potion', name: 'ยาขาว', kind: 'consumable', price: 400, heal: 700, icon: 'potion', color: '#f1faee', description: 'ฟื้นฟู HP 700' },
  blue_potion: { id: 'blue_potion', name: 'ยาฟ้า', kind: 'consumable', price: 60, mana: 50, icon: 'potion', color: '#4895ef', description: 'ฟื้นฟู MP 50' },
  purple_potion: { id: 'purple_potion', name: 'ยาม่วง', kind: 'consumable', price: 280, mana: 200, icon: 'potion', color: '#9d4edd', description: 'ฟื้นฟู MP 200' },
  return_scroll: { id: 'return_scroll', name: 'ม้วนคัมภีร์กลับเมือง', kind: 'consumable', price: 50, icon: 'scroll', color: '#f4d35e', description: 'วาร์ปกลับเมืองทันที' },
  town_warp_tome: { id: 'town_warp_tome', name: 'คัมภีร์วาร์ปกลับเมือง', kind: 'consumable', price: 0, icon: 'scroll', color: '#c4b5fd', description: 'ใช้เพื่อวาร์ปกลับเมืองทันที' },
  starlight_loot_magnet: { id: 'starlight_loot_magnet', name: 'แม่เหล็กดูดของแสงดาว', kind: 'consumable', price: 0, icon: 'core', color: '#38bdf8', description: 'ดูดดรอปของคุณในระยะ 120 px นาน 5 นาที' },
  astral_bag_expansion: { id: 'astral_bag_expansion', name: 'กระเป๋าดวงดาว +20 ช่อง', kind: 'consumable', price: 0, icon: 'bag', color: '#f59e0b', description: 'เพิ่มช่องกระเป๋าถาวร 20 ช่อง สูงสุด +60 ช่อง' },
  vip_card_7d: { id: 'vip_card_7d', name: 'บัตรสมาชิก VIP (7 วัน)', kind: 'consumable', price: 0, icon: 'ticket', color: '#fbbf24', description: 'กดใช้เพื่อเปิดใช้งานหรือต่ออายุสมาชิก VIP 7 วัน (+150 VIP EXP)', effect: true },
  vip_card_30d: { id: 'vip_card_30d', name: 'บัตรสมาชิก VIP (30 วัน)', kind: 'consumable', price: 0, icon: 'ticket', color: '#c084fc', description: 'กดใช้เพื่อเปิดใช้งานหรือต่ออายุสมาชิก VIP 30 วัน (+450 VIP EXP)', effect: true },
  vip_exp_crystal: { id: 'vip_exp_crystal', name: 'ผลึกเลื่อนขั้น VIP (+600 EXP)', kind: 'consumable', price: 0, icon: 'crystal', color: '#38bdf8', description: 'กดใช้เพื่อเพิ่ม VIP EXP +600 ทันที', effect: true },
  bag_scroll_10: { id: 'bag_scroll_10', name: 'คัมภีร์ขยายกระเป๋า +10 ช่อง', kind: 'consumable', price: 0, icon: 'bag', color: '#34d399', description: 'กดใช้เพื่อเพิ่มความจุกระเป๋าถาวร +10 ช่อง', effect: true },
  storage_scroll_15: { id: 'storage_scroll_15', name: 'คัมภีร์ขยายคลังพี่มณี +15 ช่อง', kind: 'consumable', price: 0, icon: 'scroll', color: '#60a5fa', description: 'กดใช้เพื่อขยายคลังเก็บของถาวร +15 ช่อง', effect: true },
  storage_scroll_30: { id: 'storage_scroll_30', name: 'หีบนิรภัยจักรวาล +30 ช่องคลัง', kind: 'consumable', price: 0, icon: 'bag', color: '#a855f7', description: 'กดใช้เพื่อขยายคลังเก็บของถาวร +30 ช่อง', effect: true },
  pet_exp_elixir: { id: 'pet_exp_elixir', name: 'น้ำทิพย์ฝึกสัตว์เลี้ยง', kind: 'consumable', price: 0, icon: 'potion', color: '#f472b6', description: 'กดใช้เพื่อเพิ่ม EXP สัตว์เลี้ยงที่สวมใส่อยู่ +250 EXP', effect: true },
  supreme_hp_elixir: { id: 'supreme_hp_elixir', name: 'น้ำยาอมฤตสวรรค์', kind: 'consumable', price: 0, heal: 1200, mana: 400, icon: 'potion', color: '#fb7185', description: 'ฟื้นฟู HP 1,200 และ MP 400 ทันที', effect: true },
  double_exp_scroll: { id: 'double_exp_scroll', name: 'คัมภีร์คูณค่าประสบการณ์ (10 นาที)', kind: 'consumable', price: 0, icon: 'scroll', color: '#facc15', description: 'กดใช้เพื่อรับบัฟ EXP +35%, ATK +15%, DEF +15% นาน 10 นาที', effect: true },
  enhance_stone: { id: 'enhance_stone', name: 'หินตีบวก', kind: 'material', price: 500, icon: 'stone', color: '#4cc9f0', description: 'ใช้ตีบวกอุปกรณ์ที่ช่างตีบวก' },
  slime_gel: { id: 'slime_gel', name: 'เจลสไลม์', kind: 'material', price: 8, icon: 'gel', color: '#80ed99', description: 'ของดรอปจากสไลม์ ขายได้' },
  mushroom_cap: { id: 'mushroom_cap', name: 'หมวกเห็ด', kind: 'material', price: 15, icon: 'gel', color: '#e76f51', description: 'ของดรอปจากเห็ด ขายได้' },
  wolf_fang: { id: 'wolf_fang', name: 'เขี้ยวหมาป่า', kind: 'material', price: 45, icon: 'fang', color: '#f1faee', description: 'ของดรอปจากหมาป่า ขายได้' },
  goblin_ear: { id: 'goblin_ear', name: 'หูก๊อบลิน', kind: 'material', price: 60, icon: 'fang', color: '#90be6d', description: 'ของดรอปจากก๊อบลิน ขายได้' },
  bone: { id: 'bone', name: 'กระดูก', kind: 'material', price: 90, icon: 'bone', color: '#e9e3d5', description: 'ของดรอปจากโครงกระดูก ขายได้' },
  ectoplasm: { id: 'ectoplasm', name: 'วิญญาณหลอน', kind: 'material', price: 130, icon: 'gel', color: '#caf0f8', description: 'ของดรอปจากผี ขายได้' },
  ember_core: { id: 'ember_core', name: 'แกนเพลิง', kind: 'material', price: 220, icon: 'core', color: '#ff6b35', description: 'ของดรอปจากภูเขาไฟ ขายได้' },
  earth_core: { id: 'earth_core', name: 'แก่นปฐพี', kind: 'material', price: 1200, icon: 'core', color: '#b08954', description: 'แก่นพลังที่ได้จากผู้พิทักษ์ปฐพี' },
  demon_horn: { id: 'demon_horn', name: 'เขาปีศาจ', kind: 'material', price: 350, icon: 'fang', color: '#9d0208', description: 'ของดรอปจากปีศาจ ขายได้' },
  torn_cloth: { id: 'torn_cloth', name: 'ผ้าขาดจากมอน', kind: 'material', price: 3, icon: 'junk', color: '#a78b72', description: 'เศษผ้าสกปรกจากมอนสเตอร์ ขายให้พ่อค้าได้' },
  cracked_claw: { id: 'cracked_claw', name: 'กรงเล็บแตกร้าว', kind: 'material', price: 6, icon: 'junk', color: '#c08457', description: 'กรงเล็บเก่าที่แตกแล้วจากมอนสเตอร์' },
  monster_scrap: { id: 'monster_scrap', name: 'เศษซากมอนสเตอร์', kind: 'material', price: 12, icon: 'junk', color: '#64748b', description: 'เศษซากไร้ค่า แต่ขายรวมกันแล้วได้เงิน' },
  name_change_ticket: { id: 'name_change_ticket', name: 'บัตรเปลี่ยนชื่อ', kind: 'consumable', price: 2500, icon: 'ticket', color: '#f8c537', description: 'ใช้เปลี่ยนชื่อตัวละครของคุณได้ 1 ครั้ง', effect: true },
  fish_silver: { id: 'fish_silver', name: 'ปลาเงินลำธาร', kind: 'material', price: 28, icon: 'gel', color: '#93c5fd', description: 'ปลาสดจากลำธาร ใช้ทำอาหารหรือขายได้' },
  fish_golden: { id: 'fish_golden', name: 'ปลาคาร์ปทองคำ', kind: 'material', price: 140, icon: 'core', color: '#fbbf24', description: 'ปลาหายากจากบ่อน้ำเมือง ใช้นึ่งซุปเพิ่มสเตตัส' },
  ore_iron: { id: 'ore_iron', name: 'แร่เหล็กดิบ', kind: 'material', price: 36, icon: 'stone', color: '#94a3b8', description: 'แร่เหล็กจากเหมืองถ้ำ ใช้คราฟต์และหลอมรูน' },
  ore_mythril: { id: 'ore_mythril', name: 'แร่มิธริลเรืองแสง', kind: 'material', price: 185, icon: 'stone', color: '#38bdf8', description: 'แร่ล้ำค่าจากถ้ำลึกและฟากฟ้า' },
  herb_green: { id: 'herb_green', name: 'สมุนไพรพฤกษา', kind: 'material', price: 25, icon: 'gel', color: '#4ade80', description: 'สมุนไพรสดจากทุ่งหญ้า ใช้ปรุงอาหารฟื้นพลัง' },
  herb_moon: { id: 'herb_moon', name: 'ดอกจันทร์เหมันต์', kind: 'material', price: 160, icon: 'core', color: '#c084fc', description: 'สมุนไพรหายากใต้แสงจันทร์ ใช้ปรุงน้ำยาชั้นสูง' },
  pet_essence: { id: 'pet_essence', name: 'ผลึกวิญญาณคู่หู', kind: 'material', price: 320, icon: 'core', color: '#f472b6', description: 'ใช้หลอมวิวัฒนาการเพิ่มดาวสัตว์เลี้ยง (1★ -> 5★)' },
  food_grilled_fish: { id: 'food_grilled_fish', name: 'ปลาย่างสมุนไพร', kind: 'consumable', price: 120, heal: 180, icon: 'gel', color: '#fb923c', description: 'ฟื้น HP 180 และเพิ่ม ATK +12% นาน 5 นาที' },
  food_miner_tonic: { id: 'food_miner_tonic', name: 'ยาชูกำลังนักขุด', kind: 'consumable', price: 160, mana: 140, icon: 'core', color: '#38bdf8', description: 'ฟื้น MP 140 และเพิ่ม DEF +15% นาน 5 นาที' },
  food_hero_feast: { id: 'food_hero_feast', name: 'ชุดอาหารผู้กล้า', kind: 'consumable', price: 420, heal: 420, icon: 'core', color: '#facc15', description: 'เพิ่ม ATK +18%, คริติคอล +8% และ EXP +25% นาน 8 นาที' },
  food_dragon_soup: { id: 'food_dragon_soup', name: 'ซุปมังกรศิลา', kind: 'consumable', price: 650, heal: 700, icon: 'core', color: '#f43f5e', description: 'เพิ่ม ATK +25%, DEF +20% และ EXP +35% นาน 10 นาที' },

  wooden_stick: weapon('wooden_stick', 'ไม้พลอง', 'stick', 6, 50, 1, 1, '#a47148'),
  oak_club: weapon('oak_club', 'กระบองโอ๊ค', 'stick', 14, 400, 2, 5, '#7f5539'),

  short_sword: weapon('short_sword', 'ดาบสั้น', 'sword', 16, 400, 1, 10, '#adb5bd'),
  steel_sword: weapon('steel_sword', 'ดาบเหล็กกล้า', 'sword', 36, 2500, 2, 15, '#dee2e6'),
  knight_blade: weapon('knight_blade', 'ดาบอัศวิน', 'sword', 72, 9000, 3, 25, '#90e0ef'),
  flame_sword: weapon('flame_sword', 'ดาบเพลิงนรก', 'sword', 125, 25000, 4, 38, '#ff6b35'),

  wood_staff: weapon('wood_staff', 'คทาไม้', 'staff', 15, 400, 1, 10, '#b08968'),
  oak_staff: weapon('oak_staff', 'คทาโอ๊ค', 'staff', 34, 2500, 2, 15, '#9c6644'),
  crystal_staff: weapon('crystal_staff', 'คทาคริสตัล', 'staff', 68, 9000, 3, 25, '#a2d2ff'),
  inferno_staff: weapon('inferno_staff', 'คทาอัคคี', 'staff', 120, 25000, 4, 38, '#e85d04'),
  gm_golden_staff: { id: 'gm_golden_staff', name: 'คฑาทองคำ GM', kind: 'weapon', weaponType: 'staff', atk: 9999999, price: 0, tier: 99, reqLevel: 1, icon: 'staff', color: '#ffd700', description: 'อาวุธเฉพาะ GM — ความเสียหาย 9,999,999' },

  short_bow: weapon('short_bow', 'ธนูสั้น', 'bow', 15, 400, 1, 10, '#bc6c25'),
  long_bow: weapon('long_bow', 'ธนูยาว', 'bow', 35, 2500, 2, 15, '#99582a'),
  hunter_bow: weapon('hunter_bow', 'ธนูพราน', 'bow', 69, 9000, 3, 25, '#606c38'),
  phoenix_bow: weapon('phoenix_bow', 'ธนูฟีนิกซ์', 'bow', 122, 25000, 4, 38, '#f48c06'),

  knife: weapon('knife', 'มีดสั้น', 'dagger', 14, 400, 1, 10, '#ced4da'),
  kris: weapon('kris', 'กริช', 'dagger', 32, 2500, 2, 15, '#e9c46a'),
  shadow_dagger: weapon('shadow_dagger', 'มีดเงา', 'dagger', 64, 9000, 3, 25, '#7b2cbf'),
  demon_fang: weapon('demon_fang', 'เขี้ยวปีศาจ', 'dagger', 115, 25000, 4, 38, '#d00000'),
  abyss_crystal: { id: 'abyss_crystal', name: 'ผลึกอเวจี', kind: 'material', price: 1800, icon: 'core', color: '#8b5cf6', description: 'ผลึกหายากจากดันเจี้ยนห้วงอเวจี', tier: 5 },

  cloth_armor: armor('cloth_armor', 'ชุดผ้า', 5, 100, 1, 1, '#d4a373'),
  leather_armor: armor('leather_armor', 'เกราะหนัง', 15, 1200, 2, 10, '#8b5e34'),
  chain_mail: armor('chain_mail', 'เกราะโซ่', 34, 8000, 3, 22, '#adb5bd'),
  dragon_armor: armor('dragon_armor', 'เกราะมังกร', 70, 24000, 4, 36, '#c1121f'),
}

const FILE_ITEMS: Record<string, ItemDef> = Object.fromEntries(
  WEAPON_CATALOG.map((entry, index) => [
    entry.id,
    {
      id: entry.id,
      name: entry.name,
      kind: entry.slot === 'weapon' ? 'weapon' : 'armor',
      weaponType: entry.slot === 'weapon' ? (entry.job === 'mage' ? 'staff' : entry.job === 'archer' ? 'bow' : entry.job === 'thief' ? 'dagger' : 'sword') : undefined,
      slot: entry.slot,
      atk: entry.slot === 'weapon' ? 18 + index * 7 : undefined,
      def: entry.slot === 'weapon' ? undefined : 8 + index * 3,
      price: 500 + index * 750,
      tier: Math.min(6, 1 + Math.floor(index / 10)),
      reqLevel: 1 + Math.floor(index / 5) * 5,
      icon: entry.slot === 'weapon' ? 'sword' : entry.slot,
      color: entry.job === 'mage' ? '#67e8f9' : entry.job === 'archer' ? '#86efac' : entry.job === 'thief' ? '#c084fc' : '#fbbf24',
      description: `${entry.name} จากไฟล์อาวุธตามอาชีพ`,
      asset: entry.asset,
      allowedJobs:
        entry.job === 'all' || entry.job === 'gm'
          ? undefined
          : entry.job === 'swordsman'
            ? ['swordsman', 'kensei', 'templar', 'the_king', 'iron_fist']
            : entry.job === 'mage'
              ? ['mage', 'cleric', 'wicked_necromancer']
              : entry.job === 'thief'
                ? ['thief', 'sinister', 'nekobaku', 'mamushi']
                : [entry.job],
      gmOnly: entry.job === 'gm',
    },
  ]),
)

const FILE_ITEM_IDS = Object.keys(FILE_ITEMS)

export const GM_ITEMS: Record<string, ItemDef> = Object.fromEntries(
  FILE_ITEM_IDS.map((id) => {
    const gmId = `gm888_${id.replace('weapon_', '')}`
    return [gmId, { ...FILE_ITEMS[id], id: gmId, gmOnly: true }]
  }),
)

export const ITEMS: Record<string, ItemDef> = { ...BASE_ITEMS, ...FILE_ITEMS, ...GM_ITEMS }

export const SHOP_STOCK: string[] = FILE_ITEM_IDS.filter((id) => !ITEMS[id].gmOnly).slice(0, 24)
/* Legacy consumables are intentionally no longer stocked; all visible item art comes from the weapons archive. */
/*
  'wooden_stick',
  'oak_club',
  'short_sword',
  'steel_sword',
  'wood_staff',
  'oak_staff',
  'short_bow',
  'long_bow',
  'knife',
  'kris',
  'cloth_armor',
  'leather_armor',
] */

export type MonsterSprite =
  | 'slime'
  | 'mushroom'
  | 'rabbit'
  | 'wolf'
  | 'goblin'
  | 'bat'
  | 'spider'
  | 'skeleton'
  | 'ghost'
  | 'orc'
  | 'golem'
  | 'demon'
  | 'gale_sentinel'
  | 'earth_golem'

export interface MonsterDef {
  id: string
  name: string
  level: number
  hp: number
  atk: number
  def: number
  exp: number
  gold: [number, number]
  speed: number
  aggro: number
  sprite: MonsterSprite
  color: string
  boss?: boolean
  drops: { itemId: string; chance: number }[]
}

export const MONSTERS: Record<string, MonsterDef> = {
  slime: { id: 'slime', name: 'สไลม์เขียว', level: 1, hp: 30, atk: 6, def: 1, exp: 8, gold: [2, 6], speed: 22, aggro: 0, sprite: 'slime', color: '#57cc99', drops: [{ itemId: 'slime_gel', chance: 0.5 }, { itemId: 'torn_cloth', chance: 0.35 }, { itemId: 'red_potion', chance: 0.1 }] },
  slime_blue: { id: 'slime_blue', name: 'สไลม์ฟ้า', level: 2, hp: 42, atk: 8, def: 2, exp: 12, gold: [3, 8], speed: 24, aggro: 20, sprite: 'slime', color: '#38bdf8', drops: [{ itemId: 'slime_gel', chance: 0.55 }, { itemId: 'blue_potion', chance: 0.08 }, { itemId: 'torn_cloth', chance: 0.3 }] },
  pink_slime: { id: 'pink_slime', name: 'สไลม์ชมพู', level: 4, hp: 65, atk: 11, def: 3, exp: 18, gold: [5, 12], speed: 26, aggro: 50, sprite: 'slime', color: '#ff8fab', drops: [{ itemId: 'slime_gel', chance: 0.6 }, { itemId: 'torn_cloth', chance: 0.45 }, { itemId: 'red_potion', chance: 0.15 }] },
  mushroom: { id: 'mushroom', name: 'เห็ดพิษ', level: 6, hp: 110, atk: 16, def: 5, exp: 30, gold: [8, 18], speed: 24, aggro: 60, sprite: 'mushroom', color: '#e76f51', drops: [{ itemId: 'mushroom_cap', chance: 0.5 }, { itemId: 'torn_cloth', chance: 0.25 }, { itemId: 'blue_potion', chance: 0.1 }, { itemId: 'enhance_stone', chance: 0.02 }] },
  rabbit: { id: 'rabbit', name: 'กระต่ายป่า', level: 8, hp: 150, atk: 20, def: 6, exp: 42, gold: [10, 22], speed: 40, aggro: 70, sprite: 'rabbit', color: '#e9d8a6', drops: [{ itemId: 'red_potion', chance: 0.2 }, { itemId: 'enhance_stone', chance: 0.03 }] },
  boss_wolf: { id: 'boss_wolf', name: 'ราชาหมาป่าใหญ่', level: 10, hp: 720, atk: 34, def: 12, exp: 220, gold: [80, 170], speed: 44, aggro: 120, sprite: 'wolf', color: '#64748b', boss: true, drops: [{ itemId: 'wolf_fang', chance: 0.85 }, { itemId: 'leather_armor', chance: 0.12 }, { itemId: 'short_sword', chance: 0.15 }, { itemId: 'enhance_stone', chance: 0.35 }] },

  wolf: { id: 'wolf', name: 'หมาป่า', level: 11, hp: 260, atk: 32, def: 10, exp: 70, gold: [15, 35], speed: 46, aggro: 90, sprite: 'wolf', color: '#8d99ae', drops: [{ itemId: 'wolf_fang', chance: 0.45 }, { itemId: 'cracked_claw', chance: 0.35 }, { itemId: 'orange_potion', chance: 0.08 }, { itemId: 'enhance_stone', chance: 0.04 }] },
  goblin: { id: 'goblin', name: 'ก๊อบลิน', level: 14, hp: 380, atk: 42, def: 14, exp: 105, gold: [25, 50], speed: 38, aggro: 90, sprite: 'goblin', color: '#6a994e', drops: [{ itemId: 'goblin_ear', chance: 0.45 }, { itemId: 'monster_scrap', chance: 0.4 }, { itemId: 'steel_sword', chance: 0.01 }, { itemId: 'kris', chance: 0.01 }, { itemId: 'enhance_stone', chance: 0.05 }] },
  boss_spider_queen: { id: 'boss_spider_queen', name: 'ราชินีแมงมุม', level: 15, hp: 1150, atk: 52, def: 17, exp: 360, gold: [110, 240], speed: 40, aggro: 125, sprite: 'spider', color: '#7e22ce', boss: true, drops: [{ itemId: 'cracked_claw', chance: 0.8 }, { itemId: 'kris', chance: 0.12 }, { itemId: 'long_bow', chance: 0.12 }, { itemId: 'enhance_stone', chance: 0.45 }] },
  goblin_chief: { id: 'goblin_chief', name: 'หัวหน้าก๊อบลิน', level: 18, hp: 1400, atk: 60, def: 20, exp: 420, gold: [120, 260], speed: 36, aggro: 110, sprite: 'goblin', color: '#386641', boss: true, drops: [{ itemId: 'long_bow', chance: 0.1 }, { itemId: 'oak_staff', chance: 0.1 }, { itemId: 'leather_armor', chance: 0.15 }, { itemId: 'enhance_stone', chance: 0.4 }] },
  boss_lich: { id: 'boss_lich', name: 'จอมเวทโครงกระดูก', level: 20, hp: 2100, atk: 78, def: 26, exp: 680, gold: [220, 450], speed: 38, aggro: 140, sprite: 'skeleton', color: '#9333ea', boss: true, drops: [{ itemId: 'bone', chance: 0.85 }, { itemId: 'crystal_staff', chance: 0.12 }, { itemId: 'oak_staff', chance: 0.18 }, { itemId: 'enhance_stone', chance: 0.55 }] },

  bat: { id: 'bat', name: 'ค้างคาว', level: 21, hp: 620, atk: 70, def: 22, exp: 190, gold: [35, 70], speed: 55, aggro: 110, sprite: 'bat', color: '#5a189a', drops: [{ itemId: 'orange_potion', chance: 0.15 }, { itemId: 'enhance_stone', chance: 0.06 }] },
  spider: { id: 'spider', name: 'แมงมุมพิษ', level: 23, hp: 740, atk: 78, def: 26, exp: 225, gold: [40, 82], speed: 46, aggro: 115, sprite: 'spider', color: '#581c87', drops: [{ itemId: 'cracked_claw', chance: 0.5 }, { itemId: 'monster_scrap', chance: 0.35 }, { itemId: 'orange_potion', chance: 0.12 }, { itemId: 'enhance_stone', chance: 0.06 }] },
  boss_fire_dragon: { id: 'boss_fire_dragon', name: 'มังกรไฟ', level: 25, hp: 4200, atk: 118, def: 42, exp: 1450, gold: [420, 860], speed: 44, aggro: 155, sprite: 'demon', color: '#ef4444', boss: true, drops: [{ itemId: 'ember_core', chance: 0.85 }, { itemId: 'knight_blade', chance: 0.12 }, { itemId: 'hunter_bow', chance: 0.12 }, { itemId: 'enhance_stone', chance: 0.75 }] },
  skeleton: { id: 'skeleton', name: 'โครงกระดูก', level: 26, hp: 900, atk: 92, def: 32, exp: 280, gold: [50, 100], speed: 40, aggro: 110, sprite: 'skeleton', color: '#e9e3d5', drops: [{ itemId: 'bone', chance: 0.45 }, { itemId: 'monster_scrap', chance: 0.45 }, { itemId: 'knight_blade', chance: 0.012 }, { itemId: 'chain_mail', chance: 0.012 }, { itemId: 'enhance_stone', chance: 0.07 }] },
  orc: { id: 'orc', name: 'ออร์ค', level: 27, hp: 1020, atk: 102, def: 36, exp: 320, gold: [58, 115], speed: 36, aggro: 115, sprite: 'orc', color: '#65a30d', drops: [{ itemId: 'goblin_ear', chance: 0.45 }, { itemId: 'monster_scrap', chance: 0.45 }, { itemId: 'chain_mail', chance: 0.015 }, { itemId: 'enhance_stone', chance: 0.08 }] },
  golem: { id: 'golem', name: 'โกเลมหิน', level: 29, hp: 1280, atk: 110, def: 46, exp: 375, gold: [65, 130], speed: 30, aggro: 115, sprite: 'golem', color: '#78716c', drops: [{ itemId: 'ore_iron', chance: 0.4 }, { itemId: 'earth_core', chance: 0.06 }, { itemId: 'enhance_stone', chance: 0.09 }] },
  boss_demon_king: { id: 'boss_demon_king', name: 'ราชาปีศาจ', level: 30, hp: 6800, atk: 158, def: 58, exp: 2400, gold: [680, 1350], speed: 42, aggro: 165, sprite: 'demon', color: '#991b1b', boss: true, drops: [{ itemId: 'demon_horn', chance: 0.85 }, { itemId: 'shadow_dagger', chance: 0.14 }, { itemId: 'chain_mail', chance: 0.18 }, { itemId: 'enhance_stone', chance: 0.9 }] },
  ghost: { id: 'ghost', name: 'วิญญาณหลอน', level: 31, hp: 1200, atk: 115, def: 38, exp: 390, gold: [70, 140], speed: 44, aggro: 120, sprite: 'ghost', color: '#caf0f8', drops: [{ itemId: 'ectoplasm', chance: 0.45 }, { itemId: 'crystal_staff', chance: 0.012 }, { itemId: 'hunter_bow', chance: 0.012 }, { itemId: 'shadow_dagger', chance: 0.012 }, { itemId: 'enhance_stone', chance: 0.08 }] },

  fire_golem: { id: 'fire_golem', name: 'โกเลมเพลิง', level: 37, hp: 2000, atk: 150, def: 55, exp: 620, gold: [100, 200], speed: 34, aggro: 120, sprite: 'golem', color: '#e85d04', drops: [{ itemId: 'ember_core', chance: 0.4 }, { itemId: 'white_potion', chance: 0.1 }, { itemId: 'enhance_stone', chance: 0.1 }] },
  earth_golem: { id: 'earth_golem', name: 'ผู้พิทักษ์ปฐพี', level: 34, hp: 9800, atk: 205, def: 118, exp: 3200, gold: [900, 1800], speed: 27, aggro: 165, sprite: 'earth_golem', color: '#8c6b3f', boss: true, drops: [{ itemId: 'earth_core', chance: 1 }, { itemId: 'enhance_stone', chance: 1 }] },
  demon: { id: 'demon', name: 'ปีศาจ', level: 43, hp: 2800, atk: 190, def: 68, exp: 900, gold: [150, 300], speed: 48, aggro: 130, sprite: 'demon', color: '#9d0208', drops: [{ itemId: 'demon_horn', chance: 0.4 }, { itemId: 'flame_sword', chance: 0.008 }, { itemId: 'inferno_staff', chance: 0.008 }, { itemId: 'phoenix_bow', chance: 0.008 }, { itemId: 'demon_fang', chance: 0.008 }, { itemId: 'enhance_stone', chance: 0.12 }] },
  demon_lord: { id: 'demon_lord', name: 'ราชาปีศาจเพลิง', level: 50, hp: 15000, atk: 260, def: 90, exp: 6000, gold: [2000, 4000], speed: 42, aggro: 150, sprite: 'demon', color: '#370617', boss: true, drops: [{ itemId: 'dragon_armor', chance: 0.25 }, { itemId: 'flame_sword', chance: 0.1 }, { itemId: 'inferno_staff', chance: 0.1 }, { itemId: 'phoenix_bow', chance: 0.1 }, { itemId: 'demon_fang', chance: 0.1 }, { itemId: 'enhance_stone', chance: 1 }] },
  abyss_knight: { id: 'abyss_knight', name: 'อัศวินห้วงอเวจี', level: 54, hp: 5200, atk: 280, def: 105, exp: 1400, gold: [320, 620], speed: 38, aggro: 145, sprite: 'golem', color: '#5b21b6', drops: [{ itemId: 'abyss_crystal', chance: 0.22 }, { itemId: 'enhance_stone', chance: 0.2 }] },
  gale_sentinel: { id: 'gale_sentinel', name: 'ผู้พิทักษ์สายลม', level: 68, hp: 8400, atk: 360, def: 125, exp: 2500, gold: [600, 1100], speed: 44, aggro: 165, sprite: 'gale_sentinel', color: '#8ee7ff', drops: [{ itemId: 'abyss_crystal', chance: 0.18 }, { itemId: 'enhance_stone', chance: 0.2 }] },
  abyss_dragon: { id: 'abyss_dragon', name: 'มังกรอเวจี', level: 60, hp: 32000, atk: 420, def: 150, exp: 12000, gold: [6000, 12000], speed: 46, aggro: 180, sprite: 'demon', color: '#24104f', boss: true, drops: [{ itemId: 'abyss_crystal', chance: 1 }, { itemId: 'dragon_armor', chance: 0.35 }, { itemId: 'flame_sword', chance: 0.2 }, { itemId: 'inferno_staff', chance: 0.2 }, { itemId: 'phoenix_bow', chance: 0.2 }, { itemId: 'demon_fang', chance: 0.2 }] },
}

export const MAX_LEVEL = 70
export const MAX_PLUS = 15

export function expToNext(level: number) {
  return Math.floor(25 * Math.pow(level, 1.6)) + 15
}

export function enhanceRate(plus: number) {
  const rates = [1, 1, 1, 0.9, 0.8, 0.65, 0.5, 0.4, 0.3, 0.22, 0.15, 0.1, 0.07, 0.05, 0.03]
  return rates[plus] ?? 0
}

export function enhanceCost(plus: number, tier: number) {
  return {
    gold: Math.floor((plus + 1) * 150 * tier * (1 + plus * 0.25)),
    stones: 1 + Math.floor(plus / 3),
  }
}
