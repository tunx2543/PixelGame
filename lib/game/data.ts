import { WEAPON_CATALOG } from './weapon-catalog'
import { GENERATED_BIOME_MONSTERS } from './biome-monsters'
import type { EquipmentRarity } from './mmo-systems'
import type { ItemCategory, ItemElement } from './item-vfx'

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
  description: string
  effectSummary?: string
  tag?: string
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

export type JobId =
  | 'novice'
  | 'swordsman'
  | 'mage'
  | 'archer'
  | 'cleric'
  | 'merchant'
  | 'thief'
  | 'kensei'
  | 'iron_fist'
  | 'wicked_necromancer'
  | 'the_king'
  | 'sinister'
  | 'templar'
  | 'nekobaku'
  | 'mamushi'

export interface JobClassMeta {
  id: JobId
  slug: string
  primaryName: string
  thaiRoleLabel: string
  legacyNames: readonly string[]
}

export const JOB_CLASS_META: Record<JobId, JobClassMeta> = {
  novice: { id: 'novice', slug: 'wayfarer', primaryName: 'Wayfarer', thaiRoleLabel: 'ผู้ฝึกหัด', legacyNames: ['Novice', 'ผู้ฝึกหัด'] },
  swordsman: { id: 'swordsman', slug: 'vanguard', primaryName: 'Vanguard', thaiRoleLabel: 'นักดาบ', legacyNames: ['Swordsman', 'นักดาบ'] },
  mage: { id: 'mage', slug: 'arcanist', primaryName: 'Arcanist', thaiRoleLabel: 'นักเวท', legacyNames: ['Mage', 'Wizard', 'นักเวท'] },
  archer: { id: 'archer', slug: 'windstalker', primaryName: 'Windstalker', thaiRoleLabel: 'นักธนู', legacyNames: ['Archer', 'Hunter', 'นักธนู'] },
  cleric: { id: 'cleric', slug: 'luminary', primaryName: 'Luminary', thaiRoleLabel: 'นักบวช', legacyNames: ['Cleric', 'Priest', 'High Priest', 'นักบวช'] },
  merchant: { id: 'merchant', slug: 'goldweaver', primaryName: 'Goldweaver', thaiRoleLabel: 'พ่อค้า', legacyNames: ['Merchant', 'พ่อค้า'] },
  thief: { id: 'thief', slug: 'nightveil', primaryName: 'Nightveil', thaiRoleLabel: 'โจร', legacyNames: ['Thief', 'โจร'] },
  kensei: { id: 'kensei', slug: 'shinkage', primaryName: 'Shinkage', thaiRoleLabel: 'ปรมาจารย์ดาบเงา', legacyNames: ['Kensei', 'Berserker', 'เคนเซย์'] },
  iron_fist: { id: 'iron_fist', slug: 'titanfist', primaryName: 'Titanfist', thaiRoleLabel: 'จอมหมัดทลายปฐพี', legacyNames: ['Iron Fist', 'หมัดเหล็ก'] },
  wicked_necromancer: { id: 'wicked_necromancer', slug: 'grimcaller', primaryName: 'Grimcaller', thaiRoleLabel: 'จอมเวทคำสาปอเวจี', legacyNames: ['Wicked Necromancer', 'เนโครแมนเซอร์ทมิฬ'] },
  the_king: { id: 'the_king', slug: 'high_sovereign', primaryName: 'High Sovereign', thaiRoleLabel: 'จอมราชันย์แห่งความมั่งคั่ง', legacyNames: ['The King', 'เดอะคิง'] },
  sinister: { id: 'sinister', slug: 'dreadfang', primaryName: 'Dreadfang', thaiRoleLabel: 'เพชฌฆาตเงาโลหิต', legacyNames: ['Sinister', 'Assassin', 'ซินิสเตอร์'] },
  templar: { id: 'templar', slug: 'aegis_knight', primaryName: 'Aegis Knight', thaiRoleLabel: 'อัศวินโล่ศักดิ์สิทธิ์', legacyNames: ['Templar', 'Knight', 'Paladin', 'เทมพลาร์'] },
  nekobaku: { id: 'nekobaku', slug: 'pawchemist', primaryName: 'Pawchemist', thaiRoleLabel: 'นักเล่นแร่ระเบิดหูแมว', legacyNames: ['Nekobaku', 'เนโกะบาคุ'] },
  mamushi: { id: 'mamushi', slug: 'venomblade', primaryName: 'Venomblade', thaiRoleLabel: 'นินจาเขี้ยวพิษ', legacyNames: ['Mamushi', 'มามูชิ'] },
}

export const STARTER_JOB_IDS = ['novice'] as const
export const TIER1_JOB_IDS = ['swordsman', 'mage', 'archer', 'cleric', 'merchant', 'thief'] as const

const LEGACY_JOB_ALIASES: Record<string, JobId> = {
  // Legacy class IDs / aliases
  priest: 'cleric',
  high_priest: 'cleric',
  knight: 'templar',
  paladin: 'templar',
  berserker: 'kensei',
  wizard: 'mage',
  hunter: 'archer',
  assassin: 'sinister',
  gm: 'the_king',
  // New primary class slugs & normalized names -> canonical internal IDs
  wayfarer: 'novice',
  vanguard: 'swordsman',
  arcanist: 'mage',
  windstalker: 'archer',
  luminary: 'cleric',
  goldweaver: 'merchant',
  nightveil: 'thief',
  shinkage: 'kensei',
  titanfist: 'iron_fist',
  titan_fist: 'iron_fist',
  grimcaller: 'wicked_necromancer',
  high_sovereign: 'the_king',
  highsovereign: 'the_king',
  sovereign: 'the_king',
  dreadfang: 'sinister',
  aegis_knight: 'templar',
  aegisknight: 'templar',
  pawchemist: 'nekobaku',
  venomblade: 'mamushi',
  ironfist: 'iron_fist',
  wickednecromancer: 'wicked_necromancer',
  theking: 'the_king',
}

export const SKILL_ID_ALIASES: Record<string, string> = {
  'wayfarer-power': 'power',
  'wayfarer-first-aid': 'first-aid',
  'vanguard-bash': 'bash',
  'vanguard-whirl': 'whirl',
  'arcanist-firebolt': 'firebolt',
  'arcanist-meteor': 'meteor',
  'windstalker-double': 'double',
  'windstalker-rain': 'rain',
  'luminary-grace-heal': 'grace-heal',
  'luminary-holy-bolt': 'holy-bolt',
  'luminary-sanctuary': 'sanctuary',
  'goldweaver-gold-strike': 'gold-strike',
  'goldweaver-cart-strike': 'cart-strike',
  'nightveil-dblatk': 'dblatk',
  'nightveil-backstab': 'backstab',
  'shinkage-flash': 'kensei-flash',
  'shinkage-iaijutsu': 'iaijutsu',
  'shinkage-bladestorm': 'bladestorm',
  'titanfist-smash': 'flash-smash',
  'titanfist-quake': 'quake-hammer',
  'titanfist-will': 'iron-will',
  'grimcaller-hex': 'black-cat-hex',
  'grimcaller-resist': 'lower-resist',
  'grimcaller-requiem': 'abyss-requiem',
  'sovereign-dividend': 'dividend-yield',
  'sovereign-candle-storm': 'candle-storm',
  'sovereign-stop-loss': 'stop-loss',
  'dreadfang-cross': 'sinister-cross',
  'dreadfang-ambush': 'reaper-ambush',
  'dreadfang-eclipse': 'crimson-eclipse',
  'aegis-holy-strike': 'holy-strike',
  'aegis-bastion': 'templar-bastion',
  'pawchemist-fizz': 'fizz-flask',
  'pawchemist-tar': 'tar-flask',
  'pawchemist-barrage': 'neko-barrage',
  'venomblade-fang': 'viper-fang',
  'venomblade-shuriken': 'bouncing-shuriken',
  'venomblade-overload': 'venom-overload',
}

export function normalizeSkillId(skillId?: string | null): string {
  if (!skillId || typeof skillId !== 'string') return ''
  const trimmed = skillId.trim()
  return SKILL_ID_ALIASES[trimmed] ?? SKILL_ID_ALIASES[trimmed.toLowerCase()] ?? trimmed
}

export const JOBS: Record<string, JobDef> = {
  novice: {
    id: 'novice',
    name: 'Wayfarer',
    tier: 0,
    from: null,
    reqLevel: 1,
    cost: 0,
    description: 'Wayfarer นักผจญภัยมือใหม่ผู้เริ่มต้นการเดินทาง ผมน้ำตาลฟู ผ้าพันคอแดง เกราะเบา และดาบคู่มือ พร้อมทักษะพื้นฐาน 4 รูปแบบเพื่อก้าวสู่ 6 อาชีพหลัก',
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
      {
        id: 'power',
        name: 'ฟาดพลัง Wayfarer',
        mp: 5,
        mult: 2.1,
        cooldown: 1.8,
        kind: 'single',
        color: '#fb7185',
        tag: 'โจมตีเดี่ยว · กายภาพ',
        effectSummary: 'ตวัดดาบคลื่นเพลิงผ่าศัตรูตรงหน้าอย่างรุนแรง',
        description: 'รวบรวมพลังลงในคมดาบแล้วฟาดเฉียงเป็นคลื่นแสงสีเพลิง สร้างความเสียหายเป้าหมายเดี่ยว 2.1 เท่าของ ATK พร้อมแรงกระแทก',
      },
      {
        id: 'first-aid',
        name: 'ปฐมพยาบาล',
        mp: 10,
        mult: 0.28,
        cooldown: 5,
        kind: 'heal',
        color: '#fb923c',
        tag: 'ฟื้นฟู · สนับสนุน',
        effectSummary: 'ฟื้นฟู HP 28% ของพลังชีวิตสูงสุดทันที',
        description: 'ปลดปล่อยประกายพลังฟื้นฟูรอบกายเพื่อสมานบาดแผลอย่างเร่งด่วน ฟื้นฟู HP 28% ของ Max HP ทันทีโดยไม่ต้องหยุดสู้',
      },
      {
        id: 'wayfarer-rush',
        name: 'พุ่งแทงผ่าลม',
        mp: 12,
        mult: 1.45,
        cooldown: 3.2,
        kind: 'multi',
        hits: 2,
        color: '#f97316',
        tag: 'ต่อเนื่อง 2 ฮิต · ประชิด',
        effectSummary: 'พุ่งฟันต่อเนื่อง 2 จังหวะรวดอย่างคล่องตัว',
        description: 'ทะยานตัวเข้าประชิดเป้าหมายแล้วฟาดฟันต่อเนื่อง 2 ครั้งติดกัน สร้างความเสียหายฮิตละ 1.45 เท่า พร้อมจังหวะลุ้นคริติคอลสองต่อ',
      },
      {
        id: 'wayfarer-crescent',
        name: 'ดาบจันทร์เสี้ยว',
        mp: 16,
        mult: 1.9,
        cooldown: 4.8,
        kind: 'aoe-self',
        radius: 48,
        color: '#ef4444',
        tag: 'วงกว้างรอบตัว · กวาดล้าง',
        effectSummary: 'เหวี่ยงคมดาบจันทร์เสี้ยวกวาดศัตรูในระยะ 48px',
        description: 'หมุนตัวปลดปล่อยคลื่นดาบจันทร์เสี้ยวสีแดงชาดกวาดศัตรูทั้งหมดรอบกายในรัศมี 48px ด้วยพลังโจมตี 1.9 เท่า',
      },
    ],
  },
  swordsman: {
    id: 'swordsman',
    name: 'Vanguard',
    tier: 1,
    from: 'novice',
    reqLevel: 1,
    cost: 500,
    description: 'Vanguard นักรบแนวหน้าระยะประชิด พลังชีวิตและพลังป้องกันสูง เชี่ยวชาญเพลงดาบจู่โจมและกวาดล้าง',
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
      {
        id: 'bash',
        name: 'ฟันกระแทก',
        mp: 8,
        mult: 2.3,
        cooldown: 2,
        kind: 'single',
        color: '#fb7185',
        tag: 'โจมตีเดี่ยว · หนักหน่วง',
        effectSummary: 'ฟันดาบไขว้พลังแรงสูงเข้าจุดตายศัตรู',
        description: 'เงื้อดาบแนวหน้าฟาดกระแทกเต็มกำลังด้วยคลื่นพลังสีชาด สร้างความเสียหาย 2.3 เท่าของ ATK ใช้ MP ต่ำและคูลดาวน์ไว',
      },
      {
        id: 'whirl',
        name: 'ดาบพายุหมุน',
        mp: 16,
        mult: 1.75,
        cooldown: 4.8,
        kind: 'aoe-self',
        radius: 48,
        color: '#f43f5e',
        tag: 'วงกว้างรอบตัว · พายุ',
        effectSummary: 'พายุคมดาบหมุนวนโจมตีศัตรูรอบทิศ 48px',
        description: 'ปั่นกระแสคมดาบหมุนเป็นวงแหวนพายุรอบตัว กวาดมอนสเตอร์ที่ล้อมอยู่ทั้งหมดในรัศมี 48px เหมาะสำหรับลากฟาร์มเป็นกลุ่ม',
      },
      {
        id: 'vanguard-pierce',
        name: 'แทงทลายเกราะ',
        mp: 14,
        mult: 3.1,
        cooldown: 3.5,
        kind: 'single',
        color: '#fda4af',
        tag: 'เจาะเกราะ · เดี่ยว',
        effectSummary: 'พุ่งแทงจุดเดียวด้วยแรงเจาะทะลุ 3.1x',
        description: 'รวบรวมแรงดันอากาศไว้ที่ปลายดาบแล้วพุ่งแทงตรงดุจหอกเหล็กกล้า สร้างความเสียหายเป้าหมายเดี่ยวสูงถึง 3.1 เท่า',
      },
      {
        id: 'vanguard-breaker',
        name: 'คลื่นดาบพิฆาต',
        mp: 24,
        mult: 2.45,
        cooldown: 6.0,
        kind: 'aoe-target',
        radius: 56,
        color: '#e11d48',
        tag: 'วงกว้างเป้าหมาย · ทลายแนว',
        effectSummary: 'ฟาดคลื่นดาบยักษ์ระเบิดพื้นที่เป้าหมาย 56px',
        description: 'ฟาดคมดาบเสี้ยวขนาดมหึมาลงบนตำแหน่งเป้าหมาย เกิดคลื่นกระแทกสีแดงระเบิดทำลายล้างศัตรูทุกตัวในรัศมี 56px',
      },
    ],
  },
  mage: {
    id: 'mage',
    name: 'Arcanist',
    tier: 1,
    from: 'novice',
    reqLevel: 1,
    cost: 500,
    description: 'Arcanist ผู้ใช้เวทมนตร์ระยะไกล พลังโจมตีเวทรุนแรง มานามหาศาล และมีสกิลระเบิดวงกว้าง',
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
      {
        id: 'firebolt',
        name: 'ศรเวทมนตร์',
        mp: 10,
        mult: 2.6,
        cooldown: 1.5,
        kind: 'single',
        color: '#c084fc',
        tag: 'เวทระยะไกล · เดี่ยว',
        effectSummary: 'ยิงลำแสงดาวตกเวทมนตร์ทะลวงเป้าหมายเดี่ยว',
        description: 'ยิงศรพลังงานเวทม่วงครามความเร็วสูงพุ่งเจาะเป้าหมายระยะไกล สร้างความเสียหาย 2.6 เท่า คูลดาวน์สั้นที่สุดของสายเวท',
      },
      {
        id: 'arcane-ward',
        name: 'วงเวทมนตรา',
        mp: 18,
        mult: 1.95,
        cooldown: 4.5,
        kind: 'aoe-self',
        radius: 54,
        color: '#a855f7',
        tag: 'วงเวทรอบตัว · 54px',
        effectSummary: 'กางม่านอักขระเวทผลักและเผาผลาญศัตรูรอบตัว',
        description: 'สลักวงเวทเรืองแสงรอบตัวผู้ใช้แล้วระเบิดคลื่นพลังอาร์เคนออกมาป้องกันระยะประชิด ทำดาเมจ 1.95 เท่าในรัศมี 54px',
      },
      {
        id: 'meteor',
        name: 'อุกกาบาต',
        mp: 26,
        mult: 2.3,
        cooldown: 6,
        kind: 'aoe-target',
        radius: 56,
        color: '#818cf8',
        tag: 'เวทมหาประลัย · 56px',
        effectSummary: 'เรียกอุกกาบาตถล่มตำแหน่งเป้าหมายเป็นวงกว้าง',
        description: 'อัญเชิญก้อนอุกกาบาตเพลิงเวทจากฟากฟ้าพุ่งชนจุดหมาย เกิดแรงระเบิดทำลายล้างศัตรูทั้งกลุ่มในรัศมี 56px',
      },
      {
        id: 'astral-nova',
        name: 'ดาราจักรปะทุ',
        mp: 34,
        mult: 2.8,
        cooldown: 7.2,
        kind: 'aoe-target',
        radius: 66,
        color: '#e879f9',
        tag: 'เวทขั้นสูง · รัศมี 66px',
        effectSummary: 'จุดประกายดาราจักรเวทระเบิดแสงดาว 2.8x',
        description: 'รวมพลังผลึกคริสตัลบนยอดคทาแล้วระเบิดคลื่นแสงสี่แฉกสีม่วงอเมทิสต์กลางดงศัตรู รัศมีกว้างพิเศษ 66px',
      },
    ],
  },
  archer: {
    id: 'archer',
    name: 'Windstalker',
    tier: 1,
    from: 'novice',
    reqLevel: 1,
    cost: 500,
    description: 'Windstalker นักแม่นธนูแห่งสายลม โจมตีไกลและรวดเร็ว ปิดฉากศัตรูก่อนเข้าถึงตัว',
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
      {
        id: 'double',
        name: 'ยิงคู่',
        mp: 9,
        mult: 1.35,
        cooldown: 1.8,
        kind: 'multi',
        hits: 2,
        color: '#86efac',
        tag: 'ต่อเนื่อง 2 ดอก · ไกล',
        effectSummary: 'ยิงลูกธนูวายุ 2 ดอกซ้อนอย่างแม่นยำ',
        description: 'ขึ้นสายธนูปล่อยศรสายลมสองดอกต่อเนื่องในพริบตา สร้างความเสียหายดอกละ 1.35 เท่า พร้อมโอกาสติดคริติคอลสูง',
      },
      {
        id: 'rain',
        name: 'ฝนธนู',
        mp: 22,
        mult: 1.85,
        cooldown: 5.5,
        kind: 'aoe-target',
        radius: 52,
        color: '#4ade80',
        tag: 'วงกว้างเป้าหมาย · 52px',
        effectSummary: 'ยิงลูกศรมรกตขึ้นฟ้าโปรยปรายลงพื้นที่เป้าหมาย',
        description: 'ระดมยิงห่าลูกธนูสายลมตกลงมาจากเบื้องบนครอบคลุมพื้นที่ 52px ทำลายล้างฝูงมอนสเตอร์พร้อมกัน',
      },
      {
        id: 'wind-snipe',
        name: 'ศรล็อกเป้าสังหาร',
        mp: 16,
        mult: 3.25,
        cooldown: 3.6,
        kind: 'single',
        color: '#bef264',
        tag: 'เจาะทะลุ · คริแรง',
        effectSummary: 'เล็งเป้าจุดอ่อนแล้วยิงศรความเร็วแสง 3.25x',
        description: 'เพ่งสมาธิล็อกเป้าจุดตายของศัตรูแล้วปล่อยลูกธนูอัดพลังลมมรกตพุ่งทะลวงเป้าหมายเดี่ยวอย่างแม่นยำรุนแรง',
      },
      {
        id: 'gale-volley',
        name: 'พายุศรวายุ',
        mp: 26,
        mult: 1.45,
        cooldown: 5.2,
        kind: 'multi',
        hits: 3,
        color: '#22c55e',
        tag: 'กระหน่ำ 3 ดอก · ไกล',
        effectSummary: 'ปล่อยศรวายุพัดหมุน 3 ดอกต่อเนื่อง 1.45x/ดอก',
        description: 'ดีดสายคันธนูด้วยความเร็วเหนือลม ปล่อยลูกศรสายลมสีเขียว 3 ดอกติดกันกวาดพลังศัตรูในพริบตา',
      },
    ],
  },
  cleric: {
    id: 'cleric',
    name: 'Luminary',
    tier: 1,
    from: 'novice',
    reqLevel: 1,
    cost: 500,
    description: 'Luminary นักบวชแห่งแสง ใช้เวทฟื้นฟูพลังชีวิต ศรกางเขนแสง และอัญเชิญเขตศักดิ์สิทธิ์ปกป้องสนามรบ',
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
      {
        id: 'grace-heal',
        name: 'แสงเยียวยา',
        mp: 18,
        mult: 0.34,
        cooldown: 4.8,
        kind: 'heal',
        color: '#fde047',
        tag: 'ฟื้นฟูศักดิ์สิทธิ์ · 34%',
        effectSummary: 'เรียกแสงดาวทองฟื้นฟู HP 34% ของพลังชีวิตสูงสุด',
        description: 'สวดอ้อนวอนเรียกประกายแสงศักดิ์สิทธิ์สีทองสว่างอาบร่าง ฟื้นฟู HP 34% ของ Max HP ทันทีและขับไล่ความเหนื่อยล้า',
      },
      {
        id: 'holy-bolt',
        name: 'ศรแห่งแสง',
        mp: 10,
        mult: 2.45,
        cooldown: 1.8,
        kind: 'single',
        color: '#fef08a',
        tag: 'เวทแสง · เดี่ยว',
        effectSummary: 'พุ่งหอกกางเขนแสงสวรรค์โจมตีเป้าหมายเดี่ยว',
        description: 'กลั่นศรัทธาเป็นลำแสงกางเขนสีทองพุ่งทะลวงเป้าหมายระยะไกล สร้างความเสียหายเวทแสง 2.45 เท่าด้วยคูลดาวน์สั้น',
      },
      {
        id: 'radiant-cross',
        name: 'พิพากษากางเขนแสง',
        mp: 22,
        mult: 2.2,
        cooldown: 5.0,
        kind: 'aoe-target',
        radius: 56,
        color: '#facc15',
        tag: 'เสาแสงคู่ · 56px',
        effectSummary: 'อัญเชิญกางเขนแสงคู่ฟาดลงยังกลุ่มศัตรู 56px',
        description: 'เรียกเสาแสงกางเขนศักดิ์สิทธิ์สองต้นตกลงตรงตำแหน่งเป้าหมาย ชำระล้างศัตรูทุกตัวในรัศมี 56px ด้วยพลัง 2.2 เท่า',
      },
      {
        id: 'sanctuary',
        name: 'เขตศักดิ์สิทธิ์',
        mp: 28,
        mult: 1.95,
        cooldown: 6.5,
        kind: 'aoe-self',
        radius: 68,
        color: '#80ed99',
        tag: 'มหาอาคมรอบตัว · 68px',
        effectSummary: 'กางวงเวทสุริยันสีทองแผ่แสงทำลายรอบกาย 68px',
        description: 'จารึกมหาวงเวทศักดิ์สิทธิ์ใต้ฝ่าเท้า แผ่คลื่นรัศมีสีทองกว้าง 68px ซัดกระหน่ำศัตรูทั้งหมดที่รุกล้ำเข้ามา',
      },
    ],
  },
  merchant: {
    id: 'merchant',
    name: 'Goldweaver',
    tier: 1,
    from: 'novice',
    goldBonus: 0.15,
    reqLevel: 1,
    cost: 500,
    description: 'Goldweaver ผู้เชี่ยวชาญการค้า เพิ่มทองดรอป +15% พร้อมเวททองคำและการจู่โจมที่หนักหน่วง',
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
      {
        id: 'gold-strike',
        name: 'ฟาดเหรียญทอง',
        mp: 8,
        mult: 2.4,
        cooldown: 2,
        kind: 'single',
        color: '#fbbf24',
        tag: 'มั่งคั่ง · เดี่ยว',
        effectSummary: 'อัดพลังทองคำลงในการฟาดฟันเป้าหมายเดี่ยว 2.4x',
        description: 'ทุ่มพลังเหรียญทองอาคมฟาดใส่ศัตรูอย่างหนักหน่วง สร้างความเสียหาย 2.4 เท่า พร้อมประกายทองคำตระการตา',
      },
      {
        id: 'cart-strike',
        name: 'รถเข็นพุ่งชน',
        mp: 18,
        mult: 1.9,
        cooldown: 5,
        kind: 'aoe-self',
        radius: 48,
        color: '#f59e0b',
        tag: 'วงกว้างรอบตัว · 48px',
        effectSummary: 'เหวี่ยงหีบสมบัติและรถเข็นชนกวาดศัตรูรอบกาย',
        description: 'เร่งแรงรถเข็นสินค้าเต็มพิกัดพุ่งหมุนกวาดล้างศัตรูรอบตัวในรัศมี 48px เหมาะสำหรับเคลียร์มอนสเตอร์ฟาร์มเงิน',
      },
      {
        id: 'golden-barrier',
        name: 'โล่คุ้มครองทองคำ',
        mp: 20,
        mult: 0.3,
        cooldown: 5.5,
        kind: 'heal',
        color: '#fde047',
        tag: 'ฟื้นฟู · ทองคำ',
        effectSummary: 'ใช้ผลึกทองคำฟื้นฟู HP 30% ของพลังชีวิตสูงสุด',
        description: 'กลั่นละอองทองบริสุทธิ์เคลือบร่างกายเพื่อฟื้นฟู HP 30% ของ Max HP เสริมความอึดยืนฟาร์มได้ต่อเนื่อง',
      },
      {
        id: 'prosperity-rain',
        name: 'ฝนเหรียญมั่งคั่ง',
        mp: 26,
        mult: 2.25,
        cooldown: 6.0,
        kind: 'aoe-target',
        radius: 56,
        color: '#fbbf24',
        tag: 'พายุเหรียญทอง · 56px',
        effectSummary: 'โปรยห่าฝนเหรียญทองคำกระแทกกลุ่มเป้าหมาย 56px',
        description: 'ดีดเหรียญทองขึ้นสู่ท้องฟ้าแล้วเสกให้ตกกระหน่ำลงมายังกลุ่มศัตรูเป็นห่าฝน สร้างดาเมจวงกว้าง 2.25 เท่า',
      },
    ],
  },
  thief: {
    id: 'thief',
    name: 'Nightveil',
    tier: 1,
    from: 'novice',
    reqLevel: 1,
    cost: 500,
    description: 'Nightveil นักรบเงาว่องไว คริติคอลสูง เคลื่อนที่เร็ว สังหารด้วยมีดคู่และคำสาปเงา',
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
      {
        id: 'dblatk',
        name: 'แทงสองครั้ง',
        mp: 7,
        mult: 1.3,
        cooldown: 1.4,
        kind: 'multi',
        hits: 2,
        color: '#e879f9',
        tag: 'มีดคู่ 2 ฮิต · ไว',
        effectSummary: 'ตวัดมีดเงาสีม่วงฟันไขว้ 2 ครั้งในเสี้ยววินาที',
        description: 'โจมตีด้วยความเร็วสูงสุด ฟาดมีดคู่สองทิศทางเข้าจุดอ่อนเป้าหมาย สร้างความเสียหาย 1.3 เท่าต่อฮิต',
      },
      {
        id: 'backstab',
        name: 'แทงข้างหลัง',
        mp: 18,
        mult: 3.4,
        cooldown: 4.2,
        kind: 'single',
        color: '#c084fc',
        tag: 'ลอบสังหาร · 3.4x',
        effectSummary: 'วาร์ปอ้อมเงาแทงทะลุจุดตายสร้างดาเมจสูง 3.4x',
        description: 'เร้นกายเข้าสู่เงามืดแล้วพุ่งแทงจุดตายจากมุมอับด้วยพลังมหาศาล 3.4 เท่า เหมาะสำหรับปิดฉากบอสและเอลิต',
      },
      {
        id: 'shadow-mark',
        name: 'ตราหัวกะโหลกเงา',
        mp: 20,
        mult: 2.2,
        cooldown: 5.0,
        kind: 'aoe-target',
        radius: 50,
        color: '#a855f7',
        tag: 'ระเบิดเงา · 50px',
        effectSummary: 'ประทับตราหัวกะโหลกเงาระเบิดพื้นที่เป้าหมาย 50px',
        description: 'ปล่อยคลื่นหัวกะโหลกเงามืดระเบิดครอบคลุมศัตรูในรัศมี 50px กัดกร่อนและสร้างความเสียหาย 2.2 เท่าพร้อมกัน',
      },
      {
        id: 'veil-execution',
        name: 'สะบั้นเงาปลิดชีพ',
        mp: 26,
        mult: 1.55,
        cooldown: 6.0,
        kind: 'multi',
        hits: 3,
        color: '#f43f5e',
        tag: 'ประหาร 3 จังหวะ',
        effectSummary: 'ร่ายรำมีดเงาฟาดฟันต่อเนื่อง 3 ฮิตรวด',
        description: 'ปลดปล่อยท่าไม้ตายแห่งรัตติกาล พุ่งปะทะเป้าหมายแล้วสะบั้นคมมีดต่อเนื่อง 3 ครั้งติดกันอย่างรุนแรง',
      },
    ],
  },
  kensei: {
    id: 'kensei',
    name: 'Shinkage',
    tier: 2,
    from: 'swordsman',
    alsoFrom: ['thief'],
    reqLevel: 30,
    cost: 12000,
    description: 'Shinkage ปรมาจารย์ดาบผสานพลัง Vanguard และ Nightveil ฟันคลื่นดาบวิญญาณสีครามรวดเร็วดุจสายฟ้า',
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
      {
        id: 'kensei-flash',
        name: 'ดาบวาบพริบตา',
        mp: 10,
        mult: 1.45,
        cooldown: 1.6,
        kind: 'multi',
        hits: 3,
        color: '#38bdf8',
        tag: 'อิไอ 3 จังหวะ · ไว',
        effectSummary: 'ชักคาตานะสีครามฟันรวดเดียว 3 คลื่นดาบ',
        description: 'ชักดาบคาตานะด้วยความเร็วเหนือสายตา ฟาดคลื่นแสงสีคราม 3 ครั้งซ้อนในหนึ่งลมหายใจ ฮิตละ 1.45 เท่า',
      },
      {
        id: 'iaijutsu',
        name: 'อิไอจุตสึ',
        mp: 22,
        mult: 4.2,
        cooldown: 4.2,
        kind: 'single',
        color: '#60a5fa',
        tag: 'ดาบเดียวปลิดชีพ · 4.2x',
        effectSummary: 'ตั้งท่าชักดาบผ่าอากาศสร้างดาเมจเดี่ยว 4.2x',
        description: 'ก้มตัวเก็บดาบแล้วสะบัดฟันโค้งจันทร์เสี้ยวสีน้ำเงินครามเพียงครั้งเดียว สร้างความเสียหายเดี่ยวรุนแรง 4.2 เท่า',
      },
      {
        id: 'spirit-thrust',
        name: 'ดาบวิญญาณทะลวง',
        mp: 28,
        mult: 4.6,
        cooldown: 5.5,
        kind: 'single',
        color: '#7dd3fc',
        tag: 'ทะลวงเกราะ · 4.6x',
        effectSummary: 'แทงคมดาบวิญญาณสีฟ้าใสเจาะทะลุศัตรู 4.6x',
        description: 'ผนึกจิตวิญญาณนักดาบไว้บนปลายคาตานะแล้วพุ่งแทงเป็นลำแสงตรง สร้างความเสียหายมหาศาล 4.6 เท่า',
      },
      {
        id: 'bladestorm',
        name: 'พายุ Shinkage',
        mp: 42,
        mult: 2.75,
        cooldown: 7.5,
        kind: 'aoe-self',
        radius: 68,
        color: '#93c5fd',
        tag: 'พายุคาตานะ · 68px',
        effectSummary: 'ระเบิดพายุคลื่นดาบสีครามกวาดศัตรูรอบกาย 68px',
        description: 'หมุนคมดาบปลดปล่อยพายุวิญญาณสีฟ้าครามโหมกระหน่ำทั่วบริเวณ กวาดล้างศัตรูทั้งหมดรอบตัวในรัศมี 68px',
      },
    ],
  },
  iron_fist: {
    id: 'iron_fist',
    name: 'Titanfist',
    tier: 2,
    from: 'merchant',
    alsoFrom: ['swordsman'],
    goldBonus: 0.1,
    reqLevel: 30,
    cost: 12000,
    description: 'Titanfist นักสู้หมัดยักษ์ พุ่งซัด Flash Smash และทุบปฐพีสั่นสะเทือนด้วยเพลิงทองคำ',
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
      {
        id: 'flash-smash',
        name: 'พุ่งซัด Titanfist',
        mp: 12,
        mult: 3.3,
        cooldown: 2.4,
        kind: 'single',
        color: '#fb923c',
        tag: 'หมัดเพลิง · 3.3x',
        effectSummary: 'ปล่อยหมัดเพลิงอัดกระแทกเป้าหมายเดี่ยว 3.3x',
        description: 'พุ่งทะยานอัดหมัดเปลวเพลิงเข้ากลางอกศัตรู เกิดคลื่นกระแทกเสียงดังสนั่น ทำความเสียหายเดี่ยว 3.3 เท่า',
      },
      {
        id: 'quake-hammer',
        name: 'ทุบพสุธา',
        mp: 26,
        mult: 2.35,
        cooldown: 5.5,
        kind: 'aoe-self',
        radius: 60,
        color: '#f59e0b',
        tag: 'สั่นสะเทือน · 60px',
        effectSummary: 'กระแทกหมัดลงพื้นระเบิดคลื่นแผ่นดินไหว 60px',
        description: 'ทุบสองหมัดลงบนผืนดินอย่างรุนแรง สร้างวงคลื่นกระแทกสีส้มทองซัดศัตรูรอบกายกระเด็นในรัศมี 60px',
      },
      {
        id: 'iron-will',
        name: 'จิตวิญญาณ Titanfist',
        mp: 24,
        mult: 0.34,
        cooldown: 6.2,
        kind: 'heal',
        color: '#fed7aa',
        tag: 'ฟื้นฟูกายา · 34%',
        effectSummary: 'ปลุกจิตนักสู้ฟื้นฟู HP 34% ของพลังชีวิตสูงสุด',
        description: 'สูดลมหายใจปลดปล่อยปราณเหล็กไหลสีทอง ฟื้นฟูพลังชีวิต 34% ทันทีและพร้อมปะทะแนวหน้าต่อ',
      },
      {
        id: 'titan-combo',
        name: 'หมัดรัวปฐพีแตก',
        mp: 30,
        mult: 1.35,
        cooldown: 6.0,
        kind: 'multi',
        hits: 4,
        color: '#f97316',
        tag: 'คอมโบ 4 หมัด',
        effectSummary: 'ระดมต่อยหมัดเพลิง 4 ฮิตรัวปิดฉากเป้าหมาย',
        description: 'กระหน่ำหมัดเพลิงต่อเนื่อง 4 จังหวะดุจค้อนยักษ์ ฮิตละ 1.35 เท่า แสดงพลังทำลายล้างสูงสุดของสายหมัด',
      },
    ],
  },
  wicked_necromancer: {
    id: 'wicked_necromancer',
    name: 'Grimcaller',
    tier: 2,
    from: 'mage',
    alsoFrom: ['cleric'],
    reqLevel: 30,
    cost: 12000,
    description: 'Grimcaller จอมเวทคำสาปผู้เรียกวิญญาณ ปลุกหัวกะโหลกอเวจีและม่านคำสาปทลายต้านทานศัตรูเป็นวงกว้าง',
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
      {
        id: 'black-cat-hex',
        name: 'มนต์วิญญาณสาป',
        mp: 14,
        mult: 3.2,
        cooldown: 2.1,
        kind: 'single',
        color: '#c084fc',
        tag: 'กะโหลกอเวจี · เดี่ยว',
        effectSummary: 'ปล่อยหัวกะโหลกวิญญาณม่วงพุ่งขย้ำเป้าหมายเดี่ยว',
        description: 'อัญเชิญหัวกะโหลกต้องสาปพุ่งเข้ากัดกร่อนวิญญาณเป้าหมายเดี่ยวระยะไกล สร้างความเสียหายเวทมืด 3.2 เท่า',
      },
      {
        id: 'lower-resist',
        name: 'คำสาปทลายเกราะ',
        mp: 28,
        mult: 2.5,
        cooldown: 4.8,
        kind: 'aoe-target',
        radius: 62,
        color: '#a855f7',
        tag: 'เสาคำสาป · 62px',
        effectSummary: 'ผุดเสาเวทอเวจีคู่ทะลวงแนวป้องกันศัตรู 62px',
        description: 'ร่ายคำสาปปลุกเสาเพลิงอเวจีสีม่วงพวยพุ่งใต้ตำแหน่งเป้าหมาย ทำลายเกราะเวทและกวาดศัตรูในรัศมี 62px',
      },
      {
        id: 'soul-shroud',
        name: 'ม่านวิญญาณดูดพลัง',
        mp: 24,
        mult: 0.32,
        cooldown: 6.0,
        kind: 'heal',
        color: '#d8b4fe',
        tag: 'ฟื้นฟูวิญญาณ · 32%',
        effectSummary: 'ดูดกลืนพลังชีวิตวิญญาณฟื้นฟู HP 32%',
        description: 'กางม่านควันอเวจีสีม่วงห่อหุ้มร่าง ดูดซับพลังวิญญาณรอบข้างมาฟื้นฟู HP 32% ของพลังชีวิตสูงสุด',
      },
      {
        id: 'abyss-requiem',
        name: 'เสียงเพรียกอเวจี',
        mp: 48,
        mult: 3.15,
        cooldown: 7.8,
        kind: 'aoe-self',
        radius: 84,
        color: '#e879f9',
        tag: 'วังวนยมโลก · 84px',
        effectSummary: 'ระเบิดพายุกะโหลกอเวจีรอบตัวกว้างสุด 84px',
        description: 'ปลดปล่อยวิญญาณแห่งห้วงลึกให้หมุนวนเป็นพายุรอบกาย รัศมีมหาศาล 84px ซัดทุกชีวิตให้พินาศด้วย 3.15 เท่า',
      },
    ],
  },
  the_king: {
    id: 'the_king',
    name: 'High Sovereign',
    tier: 2,
    from: 'merchant',
    alsoFrom: ['mage'],
    goldBonus: 0.25,
    reqLevel: 35,
    cost: 15000,
    description: 'High Sovereign จอมราชันย์แห่งตลาดและการเงิน เพิ่มทองดรอป +25% พร้อมเวท Candle Storm & Stop-Loss',
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
      {
        id: 'dividend-yield',
        name: 'ปันผลทองคำ',
        mp: 24,
        mult: 0.35,
        cooldown: 6,
        kind: 'heal',
        color: '#fde047',
        tag: 'ฟื้นฟูราชันย์ · 35%',
        effectSummary: 'รับปันผลแสงทองคำฟื้นฟู HP 35% ทันที',
        description: 'อัญเชิญละอองทองคำแห่งความมั่งคั่งโปรยปรายลงบนร่าง ฟื้นฟูพลังชีวิต 35% ของ Max HP ด้วยอำนาจจอมราชันย์',
      },
      {
        id: 'candle-storm',
        name: 'พายุแท่งเทียน',
        mp: 30,
        mult: 2.8,
        cooldown: 5.5,
        kind: 'aoe-target',
        radius: 68,
        color: '#34d399',
        tag: 'พายุกราฟ · 68px',
        effectSummary: 'เรียกแท่งเทียนขาขึ้นกระหน่ำถล่มกลุ่มศัตรู 68px',
        description: 'เสกแท่งกราฟสีเขียวมรกต-ทองคำพุ่งลงกระแทกพื้นที่เป้าหมาย สร้างความเสียหายวงกว้าง 2.8 เท่าในรัศมี 68px',
      },
      {
        id: 'stop-loss',
        name: 'ตัดขาดทุนพิฆาต',
        mp: 40,
        mult: 4.8,
        cooldown: 7.5,
        kind: 'single',
        color: '#fb7185',
        tag: 'ปิดบัญชีเดี่ยว · 4.8x',
        effectSummary: 'ยิงลำแสงราชันย์สีแดงทองปิดฉากเป้าหมาย 4.8x',
        description: 'พิพากษาเป้าหมายเดี่ยวด้วยลำแสงดาบทองคำอันทรงพลังที่สุด สร้างความเสียหายรุนแรง 4.8 เท่าในครั้งเดียว',
      },
      {
        id: 'sovereign-decree',
        name: 'ราชโองการมหาพิพากษา',
        mp: 44,
        mult: 3.1,
        cooldown: 7.5,
        kind: 'aoe-self',
        radius: 78,
        color: '#facc15',
        tag: 'เขตอาญาราชันย์ · 78px',
        effectSummary: 'แผ่รัศมีมงกุฎทองคำกวาดศัตรูรอบทิศ 78px',
        description: 'ประกาศราชโองการเหนือสนามรบ ระเบิดวงแหวนทองคำ-ครามรอบตัวในรัศมี 78px สร้างดาเมจ 3.1 เท่าแก่ศัตรูทุกตัว',
      },
    ],
  },
  sinister: {
    id: 'sinister',
    name: 'Dreadfang',
    tier: 2,
    from: 'thief',
    alsoFrom: ['archer'],
    reqLevel: 35,
    cost: 15000,
    description: 'Dreadfang จอมมารแห่งเงาโลหิต อัตราคริติคอลสูงสุด สังหารฉับพลันด้วยกรงเล็บปีศาจและจันทราโลหิต',
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
      {
        id: 'sinister-cross',
        name: 'กากบาท Dreadfang',
        mp: 10,
        mult: 1.5,
        cooldown: 1.5,
        kind: 'multi',
        hits: 3,
        color: '#fb7185',
        tag: 'กรงเล็บ 3 ฮิต · คริโหด',
        effectSummary: 'กรีดกรงเล็บเงาโลหิต 3 จังหวะซ้อนฮิตละ 1.5x',
        description: 'พุ่งกรีดกรงเล็บโลหิตเป็นรอยกากบาทต่อเนื่อง 3 ฮิต สร้างดาเมจรุนแรงพร้อมโอกาสติดคริติคอลสูงที่สุดในเกม',
      },
      {
        id: 'reaper-ambush',
        name: 'ลอบสังหารมรณะ',
        mp: 22,
        mult: 4.4,
        cooldown: 4.0,
        kind: 'single',
        color: '#e11d48',
        tag: 'คมเขี้ยวโลกันตร์ · 4.4x',
        effectSummary: 'แทงทะลุเงามืดด้วยพลังอสูร 4.4 เท่า',
        description: 'สลายร่างเข้าสู่เงามรณะแล้วแทงเขี้ยวปีศาจเข้ากลางเป้าหมาย เกิดหนามโลหิตระเบิดสร้างความเสียหาย 4.4 เท่า',
      },
      {
        id: 'demon-spike',
        name: 'เขี้ยวเพลิงโลกันตร์',
        mp: 32,
        mult: 2.9,
        cooldown: 5.8,
        kind: 'aoe-target',
        radius: 60,
        color: '#be123c',
        tag: 'เสาโลหิต · 60px',
        effectSummary: 'ผุดเสาเพลิงอสูรสีแดงฉานใต้ฝูงศัตรู 60px',
        description: 'เปิดรอยแยกนรกใต้ตำแหน่งเป้าหมาย ปลดปล่อยเสาเพลิงสีเลือดพวยพุ่งขึ้นฉีกกระชากศัตรูในรัศมี 60px',
      },
      {
        id: 'crimson-eclipse',
        name: 'จันทราโลหิต',
        mp: 46,
        mult: 3.25,
        cooldown: 7.6,
        kind: 'aoe-self',
        radius: 70,
        color: '#f43f5e',
        tag: 'วงเวทห้าแฉก · 70px',
        effectSummary: 'กางวงเวทจันทราโลหิตระเบิดรอบกาย 70px',
        description: 'สลักตราดาวห้าแฉกสีแดงเพลิงกลางอากาศ แล้วระเบิดคลื่นพลังจันทราคราสกวาดล้างศัตรูทุกตัวในระยะ 70px',
      },
    ],
  },
  templar: {
    id: 'templar',
    name: 'Aegis Knight',
    tier: 2,
    from: 'swordsman',
    alsoFrom: ['cleric'],
    reqLevel: 30,
    cost: 12000,
    description: 'Aegis Knight อัศวินโล่ศักดิ์สิทธิ์ผสานดาบและมนตร์ศักดิ์สิทธิ์ ป้องกันแข็งแกร่งดุจป้อมปราการ',
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
      {
        id: 'holy-strike',
        name: 'ฟันศักดิ์สิทธิ์',
        mp: 12,
        mult: 2.8,
        cooldown: 2,
        kind: 'single',
        color: '#ffe08a',
        tag: 'กางเขนดาบ · เดี่ยว',
        effectSummary: 'ฟาดคมดาบกางเขนแสงทองใส่เป้าหมายเดี่ยว 2.8x',
        description: 'ผสานพลังแสงศักดิ์สิทธิ์ลงบนคมดาบอัศวิน ฟันผ่าศัตรูเป็นรูปกางเขนแสงสว่าง สร้างความเสียหาย 2.8 เท่า',
      },
      {
        id: 'aegis-sanctuary',
        name: 'เขตศักดิ์สิทธิ์ Aegis',
        mp: 30,
        mult: 2.1,
        cooldown: 6,
        kind: 'aoe-self',
        radius: 64,
        color: '#fef08a',
        tag: 'อาณาเขตอัศวิน · 64px',
        effectSummary: 'กางอาณาเขตโล่แสงขับไล่ศัตรูรอบตัว 64px',
        description: 'ปักดาบลงพื้นสร้างโดมวงเวทกางเขนทอง-ฟ้า แผ่แรงกระแทกชำระล้างศัตรูรอบกายในรัศมี 64px',
      },
      {
        id: 'templar-bastion',
        name: 'โล่ Aegis Knight',
        mp: 28,
        mult: 0.4,
        cooldown: 7,
        kind: 'heal',
        color: '#fde047',
        tag: 'ปราการฟื้นฟู · 40%',
        effectSummary: 'กางโล่ศักดิ์สิทธิ์ฟื้นฟู HP 40% สูงสุดในเกม',
        description: 'ยกโล่ Aegis เปล่งรัศมีแห่งสวรรค์ ฟื้นฟูพลังชีวิตมหาศาลถึง 40% ของ Max HP ยืนชนบอสได้อย่างมั่นคง',
      },
      {
        id: 'aegis-judgment',
        name: 'พิพากษาโล่แสง',
        mp: 34,
        mult: 2.7,
        cooldown: 6.8,
        kind: 'aoe-target',
        radius: 64,
        color: '#60a5fa',
        tag: 'กระแทกโล่แสง · 64px',
        effectSummary: 'เรียกโล่ยักษ์ศักดิ์สิทธิ์ฟาดลงกลางฝูงศัตรู 64px',
        description: 'อัญเชิญตรามหาโล่สีทองฟ้าตกลงกระแทกกลุ่มศัตรู เกิดคลื่นแสงหกเหลี่ยมซัดกระหน่ำพื้นที่ 64px',
      },
    ],
  },
  nekobaku: {
    id: 'nekobaku',
    name: 'Pawchemist',
    tier: 2,
    from: 'archer',
    alsoFrom: ['mage'],
    reqLevel: 30,
    cost: 12000,
    description: 'Pawchemist นักเล่นแร่ระเบิดหูแมว โจมตีด้วยขวดยาเล่นแร่แปรธาตุระเบิดพลังชมพู-ฟ้า',
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
      {
        id: 'fizz-flask',
        name: 'ขวดระเบิดซ่า',
        mp: 18,
        mult: 2.35,
        cooldown: 3.0,
        kind: 'aoe-target',
        radius: 58,
        color: '#38bdf8',
        tag: 'ระเบิดเคมี · 58px',
        effectSummary: 'ปาขวดน้ำยาฟองซ่าระเบิดคลื่นเวทในระยะ 58px',
        description: 'เขย่าขวดน้ำยาสีฟ้าซ่าแล้วโยนใส่กลุ่มเป้าหมาย เกิดแรงระเบิดฟองเคมีกระจายทำความเสียหาย 2.35 เท่า',
      },
      {
        id: 'tar-flask',
        name: 'ขวดน้ำมันดิน',
        mp: 20,
        mult: 3.6,
        cooldown: 3.5,
        kind: 'single',
        color: '#f472b6',
        tag: 'ระเบิดเดี่ยว · 3.6x',
        effectSummary: 'ปาขวดน้ำมันเข้มข้นจุดระเบิดเป้าหมายเดี่ยว 3.6x',
        description: 'ปาขวดสารสกัดเข้มข้นสีชมพู-ส้มใส่เป้าหมายเดียวให้ลุกไหม้ระเบิดทันที สร้างความเสียหายสูง 3.6 เท่า',
      },
      {
        id: 'neko-barrage',
        name: 'ฝนระเบิด Pawchemist',
        mp: 32,
        mult: 1.5,
        cooldown: 5,
        kind: 'multi',
        hits: 3,
        color: '#fb923c',
        tag: 'รัว 3 ขวด · ไกล',
        effectSummary: 'กระหน่ำปาขวดระเบิด 3 ลูกซ้อนใส่เป้าหมาย',
        description: 'หยิบขวดทดลองสามสีขว้างรัวต่อเนื่อง 3 ครั้ง ระเบิดปะทุใส่ศัตรูไม่ยั้งด้วยแรง 1.5 เท่าต่อลูก',
      },
      {
        id: 'catnip-tonic',
        name: 'น้ำยาฟองฟูฟื้นพลัง',
        mp: 24,
        mult: 0.34,
        cooldown: 6.2,
        kind: 'heal',
        color: '#f472b6',
        tag: 'โยนยาฟื้นฟู · 34%',
        effectSummary: 'ดื่มน้ำยาปรุงพิเศษฟื้นฟู HP 34% ทันที',
        description: 'เปิดจุกน้ำยาแคตนิปสีชมพูเปล่งประกาย ฟื้นฟูพลังชีวิต 34% ของ Max HP พร้อมออร่าฟองวิบวับรอบตัว',
      },
    ],
  },
  mamushi: {
    id: 'mamushi',
    name: 'Venomblade',
    tier: 2,
    from: 'archer',
    alsoFrom: ['thief'],
    reqLevel: 30,
    cost: 12000,
    description: 'Venomblade นินจาเขี้ยวพิษใช้ Viper Fang ดาวกระจายอาบพิษสะท้อน และหมอกพิษคลั่งระเบิด',
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
      {
        id: 'viper-fang',
        name: 'เขี้ยวอสรพิษ',
        mp: 12,
        mult: 3.5,
        cooldown: 2.4,
        kind: 'single',
        color: '#4ade80',
        tag: 'เขี้ยวพิษ · 3.5x',
        effectSummary: 'กัดฉีกเป้าหมายเดี่ยวด้วยเขี้ยวพิษมรกต 3.5x',
        description: 'ปลดปล่อยวิญญาณเขี้ยวอสรพิษสีเขียวมรกตพุ่งกัดเป้าหมายเดี่ยว สร้างความเสียหายเจาะทะลุ 3.5 เท่า',
      },
      {
        id: 'bouncing-shuriken',
        name: 'ดาวกระจายสะท้อน',
        mp: 16,
        mult: 1.45,
        cooldown: 2.6,
        kind: 'multi',
        hits: 3,
        color: '#86efac',
        tag: 'ชูริเคน 3 ฮิต',
        effectSummary: 'ปาดาวกระจายอาบพิษพุ่งชิ่ง 3 ครั้งติดกัน',
        description: 'ปาดาวกระจายอาบพิษนินจาให้ชิ่งสะท้อนกระหน่ำศัตรูต่อเนื่อง 3 จังหวะ สร้างความเสียหายฮิตละ 1.45 เท่า',
      },
      {
        id: 'venom-overload',
        name: 'พิษคลั่งระเบิด',
        mp: 36,
        mult: 2.65,
        cooldown: 6.5,
        kind: 'aoe-target',
        radius: 66,
        color: '#a3e635',
        tag: 'หมอกพิษ · 66px',
        effectSummary: 'จุดระเบิดหมอกพิษมรกตครอบคลุมพื้นที่ 66px',
        description: 'ขว้างระเบิดควันพิษเข้มข้นกลางกลุ่มศัตรู แพร่กระจายละอองพิษสีเขียวมะนาวกวาดล้างในรัศมี 66px',
      },
      {
        id: 'shadow-serpent',
        name: 'เงาอสรพิษสังหาร',
        mp: 28,
        mult: 4.1,
        cooldown: 5.2,
        kind: 'single',
        color: '#22c55e',
        tag: 'สังหารเงาพิษ · 4.1x',
        effectSummary: 'พุ่งทะยานฟันเงาอสรพิษปิดชีพเป้าหมาย 4.1x',
        description: 'แฝงตัวในม่านควันพิษแล้วพุ่งฟันด้วยมีดสั้นอาบพิษงูจงอาง สร้างความเสียหายเดี่ยวรุนแรง 4.1 เท่า',
      },
    ],
  },
}

export interface JobSkillTreeNode {
  jobId: JobId
  slug: string
  className: string
  tier: 0 | 1 | 2
  parents: JobId[]
  branches: JobId[]
  skillIds: string[]
}

export const JOB_SKILL_TREES: Record<JobId, JobSkillTreeNode> = Object.fromEntries(
  (Object.keys(JOBS) as JobId[]).map((jobId) => {
    const def = JOBS[jobId]
    const parents: JobId[] = []
    if (def.from && JOBS[def.from]) parents.push(def.from as JobId)
    for (const extra of def.alsoFrom ?? []) {
      if (JOBS[extra] && !parents.includes(extra as JobId)) parents.push(extra as JobId)
    }
    const branches = (Object.keys(JOBS) as JobId[]).filter((otherId) => {
      const other = JOBS[otherId]
      return other.from === jobId || Boolean(other.alsoFrom?.includes(jobId))
    })
    return [
      jobId,
      {
        jobId,
        slug: JOB_CLASS_META[jobId].slug,
        className: def.name,
        tier: def.tier,
        parents,
        branches,
        skillIds: def.skills.map((s) => s.id),
      },
    ]
  }),
) as Record<JobId, JobSkillTreeNode>

export function resolveJobId(jobId?: string | null): JobId | null {
  if (!jobId || typeof jobId !== 'string') return null
  const trimmed = jobId.trim()
  if (!trimmed) return null
  if (JOBS[trimmed]) return trimmed as JobId
  const normalizedKey = trimmed.toLowerCase().replace(/[\s-]+/g, '_')
  if (JOBS[normalizedKey]) return normalizedKey as JobId
  const compactKey = trimmed.toLowerCase().replace(/[\s_-]+/g, '')
  const mapped = LEGACY_JOB_ALIASES[normalizedKey] ?? LEGACY_JOB_ALIASES[compactKey]
  return mapped && JOBS[mapped] ? mapped : null
}

export function normalizeJobId(jobId?: string | null): JobId {
  return resolveJobId(jobId) ?? 'novice'
}

export function getJobSlug(jobId?: string | null): string {
  const canonical = normalizeJobId(jobId)
  return JOB_CLASS_META[canonical].slug
}

export function getJobDisplayName(jobId?: string | null): string {
  const canonical = normalizeJobId(jobId)
  return JOBS[canonical]?.name ?? 'Wayfarer'
}

export function getJobSkillTree(jobId?: string | null): JobSkillTreeNode {
  return JOB_SKILL_TREES[normalizeJobId(jobId)]
}

export type ItemKind = 'consumable' | 'weapon' | 'armor' | 'material'
export type EquipmentSlot = 'weapon' | 'armor' | 'shoes' | 'cloak' | 'accessory'

export interface ItemDef {
  id: string
  name: string
  kind: ItemKind
  price: number
  sellPrice?: number
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
  itemCategory?: ItemCategory
  element?: ItemElement
  defaultRarity?: EquipmentRarity
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
  extra?: Partial<ItemDef>,
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
  itemCategory: 'weapon',
  description: `อาวุธ (${weaponType}) พลังโจมตี +${atk}`,
  ...extra,
})

const armor = (
  id: string,
  name: string,
  def: number,
  price: number,
  tier: number,
  reqLevel: number,
  color: string,
  extra?: Partial<ItemDef>,
): ItemDef => ({
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
  itemCategory: 'armor',
  description: `ชุดเกราะ พลังป้องกัน +${def}`,
  ...extra,
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
  const weaponLabel = weaponType === 'dagger' ? 'มีด Nightveil' : weaponType === 'staff' ? 'คฑา Arcanist' : weaponType === 'bow' ? 'ธนู Windstalker' : 'ดาบ Vanguard'
  const tier = isEffect ? 4 : index % 3 + 1
  const atk = 18 + tier * 16 + (index % 5) * 3
  const id = `catalog_${asset.replace('.png', '').replaceAll('-', '_')}`
  const name = `${baseName} ${isEffect ? 'อุปกรณ์อาคม' : weaponLabel} ${String(index + 1).padStart(2, '0')}`
  const eqSlot: EquipmentSlot = isEffect ? (['armor', 'shoes', 'cloak', 'accessory'][index % 4] as EquipmentSlot) : 'weapon'
  const assetFolder = !isEffect ? 'weapons' : eqSlot === 'accessory' ? 'accessories' : 'armor'
  const item: ItemDef = {
    id,
    name,
    kind: isEffect ? 'armor' : 'weapon',
    slot: eqSlot,
    itemCategory: isEffect ? (eqSlot === 'accessory' ? 'accessory' : eqSlot === 'shoes' ? 'boots' : 'armor') : 'weapon',
    weaponType: isEffect ? undefined : weaponType,
    atk: isEffect ? undefined : atk,
    def: isEffect ? 20 + tier * 10 : undefined,
    price: 900 * tier,
    tier,
    reqLevel: tier * 10,
    icon: isEffect ? 'armor' : weaponType,
    effect: isEffect,
    defaultRarity: tier >= 4 ? 'legendary' : tier === 3 ? 'epic' : tier === 2 ? 'rare' : 'uncommon',
    color: isEffect ? '#c084fc' : weaponType === 'dagger' ? '#d00000' : weaponType === 'staff' ? '#8b5cf6' : weaponType === 'bow' ? '#16a34a' : '#f59e0b',
    asset: `/assets/items/${assetFolder}/${id}.png`,
    description: `${isEffect ? 'อุปกรณ์อาคมจากบอส' : `อาวุธสำหรับ ${weaponLabel}`} | ${isEffect ? `ป้องกัน +${20 + tier * 10}` : `โจมตี +${atk}`}`,
  }
  return [id, item]
})) as Record<string, ItemDef>

function resolveSemanticBaseItemAssetPath(id: string, def: ItemDef): string {
  if (def.asset && def.asset.startsWith('/assets/items/')) return def.asset
  if (def.kind === 'weapon') return `/assets/items/weapons/${id}.png`
  if (def.itemCategory === 'shield') return `/assets/items/shields/${id}.png`
  if (
    def.itemCategory === 'accessory' ||
    def.itemCategory === 'ring' ||
    def.itemCategory === 'necklace' ||
    def.itemCategory === 'charm' ||
    def.slot === 'accessory'
  ) {
    return `/assets/items/accessories/${id}.png`
  }
  if (def.kind === 'armor') return `/assets/items/armor/${id}.png`
  return `/assets/items/special/${id}.png`
}

const SET_A_AND_HIGH_TIER_ITEMS: Record<string, ItemDef> = {
  // ---- Lv.50 High-Tier Warrior Weapons (Rare/Epic) ----
  lv50_vanguard_greatsword: weapon('lv50_vanguard_greatsword', 'ดาบใหญ่นักรบชั้นสูง', 'sword', 210, 48000, 3, 50, '#38bdf8', {
    defaultRarity: 'epic',
    element: 'physical',
    description: 'ดาบใหญ่เหล็กกล้าชุบพลังปราณ สำหรับนักรบชั้นสูง Lv.50 (ATK +210)',
  }),
  lv50_arcanist_spire: weapon('lv50_arcanist_spire', 'คทามหาปราชญ์ชั้นสูง', 'staff', 198, 48000, 3, 50, '#a855f7', {
    defaultRarity: 'epic',
    element: 'arcane',
    description: 'คทายอดผลึกสองชั้นสำหรับจอมเวทชั้นสูง Lv.50 (ATK +198)',
  }),
  lv50_windstalker_recurve: weapon('lv50_windstalker_recurve', 'ธนูจ้าววายุชั้นสูง', 'bow', 202, 48000, 3, 50, '#34d399', {
    defaultRarity: 'epic',
    element: 'physical',
    description: 'ธนูโค้งสะท้อนแรงลมความเร็วสูง สำหรับพราน Lv.50 (ATK +202)',
  }),
  lv50_nightveil_kris: weapon('lv50_nightveil_kris', 'กริชเงาจันทราชั้นสูง', 'dagger', 192, 48000, 3, 50, '#c084fc', {
    defaultRarity: 'epic',
    element: 'shadow',
    description: 'กริชคมหยักเคลือบอักษรเงา สำหรับนักฆ่า Lv.50 (ATK +192)',
  }),

  // ---- Lv.60 Knight Tier Weapons (Epic) ----
  lv60_templar_claymore: weapon('lv60_templar_claymore', 'ดาบศักดิ์สิทธิ์อัศวิน', 'sword', 310, 78000, 4, 60, '#60a5fa', {
    defaultRarity: 'epic',
    element: 'holy',
    description: 'ดาบอัศวินเทมพลาร์สลักปีกศักดิ์สิทธิ์ Lv.60 (ATK +310)',
  }),
  lv60_aegis_scepter: weapon('lv60_aegis_scepter', 'คทาอัศวินแสงพิสุทธิ์', 'staff', 295, 78000, 4, 60, '#fde047', {
    defaultRarity: 'epic',
    element: 'holy',
    description: 'คทาประดับปีกทูตสวรรค์สำหรับนักบวชและจอมเวท Lv.60 (ATK +295)',
  }),
  lv60_silverwing_longbow: weapon('lv60_silverwing_longbow', 'ธนูปีกเงินอัศวิน', 'bow', 300, 78000, 4, 60, '#93c5fd', {
    defaultRarity: 'epic',
    element: 'holy',
    description: 'ธนูยาวตีจากแร่เงินบริสุทธิ์ Lv.60 (ATK +300)',
  }),
  lv60_phantom_twinblade: weapon('lv60_phantom_twinblade', 'มีดคู่เงาอัศวิน', 'dagger', 288, 78000, 4, 60, '#818cf8', {
    defaultRarity: 'epic',
    element: 'shadow',
    description: 'ศาสตราคู่ปลายแหลมสองคมของอัศวินเงา Lv.60 (ATK +288)',
  }),

  // ---- Lv.70 Elemental Weapons (Legendary) ----
  lv70_elemental_ignis_blade: weapon('lv70_elemental_ignis_blade', 'ดาบธาตุเพลิงสุริยะ', 'sword', 440, 125000, 5, 70, '#fb923c', {
    defaultRarity: 'legendary',
    element: 'fire',
    description: 'ดาบธาตุไฟหลอมจากแกนเพลิงภูเขาไฟ Lv.70 (ATK +440 · ธาตุไฟ)',
  }),
  lv70_tempest_storm_staff: weapon('lv70_tempest_storm_staff', 'คทาธาตุสายฟ้ากัมปนาท', 'staff', 425, 125000, 5, 70, '#facc15', {
    defaultRarity: 'legendary',
    element: 'lightning',
    description: 'คทาวชิระเก็บประจุสายฟ้า Lv.70 (ATK +425 · ธาตุสายฟ้า)',
  }),
  lv70_glacial_frost_bow: weapon('lv70_glacial_frost_bow', 'ธนูธาตุเหมันต์เยือกแข็ง', 'bow', 432, 125000, 5, 70, '#67e8f9', {
    defaultRarity: 'legendary',
    element: 'ice',
    description: 'ธนูผลึกน้ำแข็งนิรันดร์ Lv.70 (ATK +432 · ธาตุน้ำแข็ง)',
  }),
  lv70_venom_eclipse_claw: weapon('lv70_venom_eclipse_claw', 'กรงเล็บธาตุมืดอสรพิษ', 'dagger', 418, 125000, 5, 70, '#4ade80', {
    defaultRarity: 'legendary',
    element: 'venom',
    description: 'กรงเล็บคู่ผสานพิษอสรพิษและพลังมืด Lv.70 (ATK +418 · ธาตุพิษ)',
  }),

  // ---- Lv.80 Arcane / Rune Weapons (Legendary) ----
  lv80_arcane_runeblade: weapon('lv80_arcane_runeblade', 'ดาบอาคมรูนนิรันดร์', 'sword', 590, 195000, 5, 80, '#818cf8', {
    defaultRarity: 'legendary',
    element: 'arcane',
    description: 'ดาบสลักอักขระเวทมนตร์โบราณส่องสว่างตลอดคมดาบ Lv.80 (ATK +590)',
  }),
  lv80_astral_grimoire_staff: weapon('lv80_astral_grimoire_staff', 'คทามนตราจักรวาล', 'staff', 575, 195000, 5, 80, '#e879f9', {
    defaultRarity: 'legendary',
    element: 'arcane',
    description: 'คทาวงแหวนอาคมหมุนวนรอบผลึกดาราจักร Lv.80 (ATK +575)',
  }),
  lv80_starfall_sigil_bow: weapon('lv80_starfall_sigil_bow', 'ธนูผนึกดาวตกอาคม', 'bow', 582, 195000, 5, 80, '#f472b6', {
    defaultRarity: 'legendary',
    element: 'arcane',
    description: 'ธนูเวทมนตร์ยิงศรแสงดาว Lv.80 (ATK +582)',
  }),
  lv80_void_hex_dagger: weapon('lv80_void_hex_dagger', 'มีดอาคมห้วงมิติ', 'dagger', 565, 195000, 5, 80, '#a855f7', {
    defaultRarity: 'legendary',
    element: 'shadow',
    description: 'มีดสั้นอาคมตัดผ่านช่องว่างมิติ Lv.80 (ATK +565)',
  }),

  // ---- Lv.90 Ancient Relic Weapons (Legendary / Mythic) ----
  lv90_ancient_relic_excalibur: weapon('lv90_ancient_relic_excalibur', 'ดาบโบราณมรดกสวรรค์', 'sword', 790, 320000, 5, 90, '#fde047', {
    defaultRarity: 'legendary',
    element: 'holy',
    description: 'ดาบโบราณแห่งราชาผู้สาบสูญ ปลุกพลังแสงทอง Lv.90 (ATK +790)',
  }),
  lv90_elder_dragon_caduceus: weapon('lv90_elder_dragon_caduceus', 'คทาโบราณมังกรบรรพกาล', 'staff', 770, 320000, 5, 90, '#fb7185', {
    defaultRarity: 'legendary',
    element: 'fire',
    description: 'คทาเศียรมังกรคู่จากยุคบรรพกาล Lv.90 (ATK +770)',
  }),
  lv90_ancient_windgod_bow: weapon('lv90_ancient_windgod_bow', 'ธนูโบราณเทพวายุ', 'bow', 780, 320000, 5, 90, '#38bdf8', {
    defaultRarity: 'legendary',
    element: 'lightning',
    description: 'ธนูโบราณสลักปีกสายฟ้าจากวิหารเมฆา Lv.90 (ATK +780)',
  }),
  lv90_reaper_abyss_scythe: weapon('lv90_reaper_abyss_scythe', 'มีดเคียวโบราณยมทูต', 'dagger', 760, 320000, 5, 90, '#f43f5e', {
    defaultRarity: 'legendary',
    element: 'shadow',
    description: 'เคียวสั้นอเวจีของยมทูตโบราณ Lv.90 (ATK +760)',
  }),

  // ---- Lv.100 Mythic / God-Tier Weapons (Mythic) ----
  lv100_mythic_asura_sovereign: weapon('lv100_mythic_asura_sovereign', 'ดาบเทพราชันย์ Pixel Quest', 'sword', 1180, 680000, 6, 100, '#fb7185', {
    defaultRarity: 'mythic',
    element: 'fire',
    description: 'สุดยอดมหาศาสตราระดับเทพ ดาบราชันย์ Pixel Quest เปล่งรัศมีเพลิงสวรรค์ Lv.100 (ATK +1,180)',
  }),
  lv100_mythic_celestial_orb: weapon('lv100_mythic_celestial_orb', 'คทาเทพดาราจักรนิรันดร์', 'staff', 1150, 680000, 6, 100, '#c084fc', {
    defaultRarity: 'mythic',
    element: 'arcane',
    description: 'คทาเทพประดับวงแหวนสุริยัน-จันทราและแกนดาราจักร Lv.100 (ATK +1,150)',
  }),
  lv100_mythic_seraph_bow: weapon('lv100_mythic_seraph_bow', 'ธนูเทพสุริยคราส', 'bow', 1165, 680000, 6, 100, '#fde047', {
    defaultRarity: 'mythic',
    element: 'holy',
    description: 'ธนูเทพหกปีกทองคำยิงศรแสงอาทิตย์ Lv.100 (ATK +1,165)',
  }),
  lv100_mythic_nightmare_fang: weapon('lv100_mythic_nightmare_fang', 'เขี้ยวเทพเงาอนันตกาล', 'dagger', 1140, 680000, 6, 100, '#a855f7', {
    defaultRarity: 'mythic',
    element: 'shadow',
    description: 'มีดเทพคู่แกนโลหิตอเวจีสำหรับยอดนักฆ่า Lv.100 (ATK +1,140)',
  }),
  lv100_mythic_vajra_hammer: weapon('lv100_mythic_vajra_hammer', 'ค้อนวชิระเทพสงคราม', 'stick', 1190, 680000, 6, 100, '#facc15', {
    defaultRarity: 'mythic',
    element: 'lightning',
    description: 'มหาค้อนวชิระสายฟ้าแห่งเทพสงคราม Lv.100 (ATK +1,190)',
  }),

  // ---- Set A Helmets (หมวก) ----
  iron_visor_helm: armor('iron_visor_helm', 'หมวกเกราะเหล็กอัศวิน', 42, 4200, 2, 20, '#94a3b8', {
    itemCategory: 'helmet',
    defaultRarity: 'uncommon',
    description: 'หมวกเหล็กกล้าปิดหน้าพร้อมพู่แดงสำหรับนักรบ (DEF +42)',
  }),
  arcanist_diadem: armor('arcanist_diadem', 'รัดเกล้ามหาปราชญ์', 76, 16000, 3, 45, '#38bdf8', {
    itemCategory: 'helmet',
    defaultRarity: 'rare',
    element: 'arcane',
    description: 'มงกุฎรัดเกล้าประดับอัญมณีไพลินเสริมสมาธิเวท (DEF +76)',
  }),
  dragonbone_warhelm: armor('dragonbone_warhelm', 'หมวกเขามังกรบรรพกาล', 148, 56000, 5, 70, '#fb923c', {
    itemCategory: 'helmet',
    defaultRarity: 'legendary',
    element: 'fire',
    description: 'หมวกศึกเขามังกรโบราณทนเปลวเพลิงและแรงปะทะ (DEF +148)',
  }),
  mythic_asura_crown: armor('mythic_asura_crown', 'มงกุฎเทพ Pixel Quest นิรันดร์', 260, 240000, 6, 95, '#fb7185', {
    itemCategory: 'helmet',
    defaultRarity: 'mythic',
    element: 'holy',
    description: 'มงกุฎทองคำเปลวเทพระดับสูงสุดแห่งราชันย์ Pixel Quest (DEF +260)',
  }),

  // ---- Set A Armors (เสื้อเกราะ) ----
  vanguard_breastplate: armor('vanguard_breastplate', 'เกราะอกผู้พิทักษ์แนวหน้า', 95, 22000, 3, 45, '#60a5fa', {
    itemCategory: 'armor',
    defaultRarity: 'epic',
    description: 'เกราะแผ่นเหล็กชั้นหนาตกแต่งลายทอง (DEF +95)',
  }),
  tempest_battlemail: armor('tempest_battlemail', 'เสื้อเกราะพายุสายฟ้า', 185, 88000, 5, 75, '#facc15', {
    itemCategory: 'armor',
    defaultRarity: 'legendary',
    element: 'lightning',
    description: 'เสื้อเกราะเกล็ดทองคำผนึกพลังสายฟ้า (DEF +185)',
  }),
  celestial_godplate: armor('celestial_godplate', 'เกราะเทพสุริยัน Pixel Quest', 320, 310000, 6, 95, '#fb7185', {
    itemCategory: 'armor',
    defaultRarity: 'mythic',
    element: 'holy',
    description: 'ชุดเกราะเทพเจ้าประดับปีกและแกนดวงดาว (DEF +320)',
  }),

  // ---- Set A Gloves (ถุงมือ) ----
  leather_archer_bracer: armor('leather_archer_bracer', 'ถุงมือหนังพรานป่า', 22, 1800, 2, 15, '#b45309', {
    slot: 'accessory',
    itemCategory: 'gloves',
    defaultRarity: 'uncommon',
    description: 'ถุงมือหนังเย็บเสริมแผ่นกันสายธนู (DEF +22)',
  }),
  steel_gauntlets: armor('steel_gauntlets', 'ถุงมือเกราะเหล็กกล้า', 56, 12000, 3, 40, '#94a3b8', {
    slot: 'accessory',
    itemCategory: 'gloves',
    defaultRarity: 'rare',
    description: 'ถุงมือหุ้มข้อเหล็กเพิ่มความแม่นยำและแรงปะทะ (DEF +56)',
  }),
  dragon_claw_gauntlets: armor('dragon_claw_gauntlets', 'ถุงมือกรงเล็บมังกรเพลิง', 120, 62000, 5, 70, '#fb923c', {
    slot: 'accessory',
    itemCategory: 'gloves',
    defaultRarity: 'legendary',
    element: 'fire',
    description: 'ถุงมือกรงเล็บเกล็ดมังกรแดงลุกโชน (DEF +120)',
  }),
  mythic_seraph_grips: armor('mythic_seraph_grips', 'ถุงมือเทพเซราฟิม', 225, 220000, 6, 95, '#fde047', {
    slot: 'accessory',
    itemCategory: 'gloves',
    defaultRarity: 'mythic',
    element: 'holy',
    description: 'ถุงมือเทพทองคำขาวเปล่งประกายแสงศักดิ์สิทธิ์ (DEF +225)',
  }),

  // ---- Set A Boots (รองเท้า) ----
  windrunner_greaves: armor('windrunner_greaves', 'รองเท้าเกราะนักวิ่งวายุ', 64, 15000, 3, 45, '#34d399', {
    slot: 'shoes',
    itemCategory: 'boots',
    defaultRarity: 'epic',
    description: 'รองเท้าเกราะน้ำหนักเบาติดปีกเล็กเสริมความคล่องตัว (DEF +64)',
  }),
  celestial_winged_boots: armor('celestial_winged_boots', 'รองเท้าปีกสวรรค์แสงดาว', 135, 74000, 5, 75, '#38bdf8', {
    slot: 'shoes',
    itemCategory: 'boots',
    defaultRarity: 'legendary',
    element: 'holy',
    description: 'รองเท้าเกราะทองปีกคู่เดินเหินเหนือเมฆา (DEF +135)',
  }),
  mythic_asura_sabatons: armor('mythic_asura_sabatons', 'รองเท้าเทพ Pixel Quest กัมปนาท', 235, 230000, 6, 95, '#fb7185', {
    slot: 'shoes',
    itemCategory: 'boots',
    defaultRarity: 'mythic',
    element: 'fire',
    description: 'รองเท้าเกราะเทพระดับสูงสุดพร้อมออร่าเปลวไฟศักดิ์สิทธิ์ (DEF +235)',
  }),

  // ---- Set A Shields (โล่) ----
  knight_heater_shield: armor('knight_heater_shield', 'โล่อัศวินตราสิงโต', 52, 8500, 2, 25, '#60a5fa', {
    slot: 'cloak',
    itemCategory: 'shield',
    defaultRarity: 'rare',
    description: 'โล่เหล็กทรงหัวใจสลักตราราชสีห์ของอัศวิน (DEF +52)',
  }),
  aegis_prism_shield: armor('aegis_prism_shield', 'โล่ผลึกเอจิสเวทมนตร์', 115, 42000, 4, 60, '#a855f7', {
    slot: 'cloak',
    itemCategory: 'shield',
    defaultRarity: 'epic',
    element: 'arcane',
    description: 'โล่ผลึกแก้วสะท้อนเวทมนตร์และคำสาป (DEF +115)',
  }),
  inferno_bulwark_shield: armor('inferno_bulwark_shield', 'โล่ปราการอสูรเพลิงนรก', 175, 95000, 5, 80, '#f97316', {
    slot: 'cloak',
    itemCategory: 'shield',
    defaultRarity: 'legendary',
    element: 'fire',
    description: 'โล่ยักษ์หัวอสูรเหล็กหลอมระอุจากนรกภูเขาไฟ (DEF +175)',
  }),
  mythic_immortal_aegis: armor('mythic_immortal_aegis', 'โล่เทพอมตะดาราสวรรค์', 310, 290000, 6, 100, '#fde047', {
    slot: 'cloak',
    itemCategory: 'shield',
    defaultRarity: 'mythic',
    element: 'holy',
    description: 'โล่เทพระดับสูงสุดไร้เทียมทานแห่งวิหารเทพ (DEF +310)',
  }),

  // ---- Set A Accessories / Rings / Necklaces / Charms ----
  golden_crescent_earring: armor('golden_crescent_earring', 'ต่างหูจันทร์เสี้ยวทองคำ', 38, 6500, 2, 25, '#fbbf24', {
    slot: 'accessory',
    itemCategory: 'accessory',
    defaultRarity: 'rare',
    description: 'เครื่องประดับหูรูปจันทร์เสี้ยวประดับมรกต (DEF +38)',
  }),
  eclipse_royal_brooch: armor('eclipse_royal_brooch', 'เข็มกลัดสุริยคราสหลวง', 96, 36000, 4, 60, '#c084fc', {
    slot: 'accessory',
    itemCategory: 'accessory',
    defaultRarity: 'epic',
    element: 'shadow',
    description: 'เข็มกลัดราชวงศ์สลักสุริยุปราคาเสริมพลังเวท (DEF +96)',
  }),
  ruby_warrior_ring: armor('ruby_warrior_ring', 'แหวนทับทิมราชันย์นักรบ', 68, 18000, 3, 45, '#f43f5e', {
    slot: 'accessory',
    itemCategory: 'ring',
    defaultRarity: 'epic',
    element: 'fire',
    description: 'แหวนทองสลักลายทับทิมสีเลือดเพิ่มพลังโจมตีแฝง (DEF +68)',
  }),
  sapphire_archmage_ring: armor('sapphire_archmage_ring', 'แหวนไพลินจอมเวท', 124, 58000, 5, 75, '#38bdf8', {
    slot: 'accessory',
    itemCategory: 'ring',
    defaultRarity: 'legendary',
    element: 'arcane',
    description: 'แหวนไพลินล้อมเพชรเรืองแสงอาคม (DEF +124)',
  }),
  mythic_sovereign_ring: armor('mythic_sovereign_ring', 'แหวนเทพจักรพรรดิ Pixel Quest', 210, 240000, 6, 95, '#fb7185', {
    slot: 'accessory',
    itemCategory: 'ring',
    defaultRarity: 'mythic',
    element: 'holy',
    description: 'แหวนเทพระดับสูงสุดผนึกพลังดาราจักรนิรันดร์ (DEF +210)',
  }),
  crimson_phoenix_pendant: armor('crimson_phoenix_pendant', 'สร้อยจี้ฟีนิกซ์เพลิง', 82, 28000, 4, 55, '#fb923c', {
    slot: 'accessory',
    itemCategory: 'necklace',
    defaultRarity: 'epic',
    element: 'fire',
    description: 'สร้อยคอจี้ปีกฟีนิกซ์สีเพลิงช่วยฟื้นพลังใจ (DEF +82)',
  }),
  astral_starlight_necklace: armor('astral_starlight_necklace', 'สร้อยแสงดาวจักรวาล', 142, 72000, 5, 80, '#818cf8', {
    slot: 'accessory',
    itemCategory: 'necklace',
    defaultRarity: 'legendary',
    element: 'arcane',
    description: 'สร้อยอัญมณีแสงดาวที่เปล่งแสงประสานพลังเวท (DEF +142)',
  }),
  mythic_dragonheart_collar: armor('mythic_dragonheart_collar', 'สร้อยหัวใจมังกรเทพ', 235, 260000, 6, 100, '#fb7185', {
    slot: 'accessory',
    itemCategory: 'necklace',
    defaultRarity: 'mythic',
    element: 'fire',
    description: 'สร้อยคอหัวใจมังกรเทพเจ้าระดับสูงสุด (DEF +235)',
  }),
  jade_guardian_talisman: armor('jade_guardian_talisman', 'เครื่องรางหยกผู้พิทักษ์', 48, 9500, 2, 30, '#34d399', {
    slot: 'cloak',
    itemCategory: 'charm',
    defaultRarity: 'rare',
    description: 'เครื่องรางหยกแกะสลักโบราณคุ้มครองภัย (DEF +48)',
  }),
  ancient_rune_charm: armor('ancient_rune_charm', 'เครื่องรางแผ่นศิลารูนโบราณ', 112, 46000, 5, 70, '#c084fc', {
    slot: 'cloak',
    itemCategory: 'charm',
    defaultRarity: 'legendary',
    element: 'arcane',
    description: 'เครื่องรางศิลารูนสี่ทิศเรืองแสงอาคม (DEF +112)',
  }),
  mythic_asura_seal: armor('mythic_asura_seal', 'เครื่องรางตราประทับเทพ Pixel Quest', 220, 250000, 6, 95, '#fde047', {
    slot: 'cloak',
    itemCategory: 'charm',
    defaultRarity: 'mythic',
    element: 'holy',
    description: 'ตราประทับศักดิ์สิทธิ์แห่งเทพ Pixel Quest คุ้มครองวิญญาณระดับสูงสุด (DEF +220)',
  }),

  // ---- Set A Special Items (ไอเทมพิเศษ) ----
  imperial_gold_key: {
    id: 'imperial_gold_key',
    name: 'กุญแจทองคำราชันย์',
    kind: 'material',
    itemCategory: 'special',
    price: 2400,
    sellPrice: 1200,
    tier: 2,
    defaultRarity: 'rare',
    icon: 'core',
    color: '#fbbf24',
    description: 'กุญแจทองคำสลักลายมงกุฎ ใช้เปิดหีบสมบัติโบราณหรือขายได้ราคาดี',
  },
  elemental_prismatic_orb: {
    id: 'elemental_prismatic_orb',
    name: 'ลูกแก้วเบญจธาตุ',
    kind: 'material',
    itemCategory: 'special',
    price: 4500,
    sellPrice: 2250,
    tier: 3,
    defaultRarity: 'epic',
    element: 'arcane',
    icon: 'core',
    color: '#a855f7',
    description: 'ลูกแก้วผลึกรวมธาตุทั้งห้า สำหรับหลอมศาสตราธาตุระดับ Lv.70',
  },
  ancient_forge_emblem: {
    id: 'ancient_forge_emblem',
    name: 'ตราช่างหลอมโบราณ',
    kind: 'material',
    itemCategory: 'special',
    price: 9500,
    sellPrice: 4800,
    tier: 5,
    defaultRarity: 'legendary',
    element: 'fire',
    icon: 'core',
    color: '#fb923c',
    description: 'ตราประทับของช่างตีเหล็กในตำนาน ใช้แลกหรือหลอมอุปกรณ์ระดับ Lv.80-90',
  },
  soul_awakening_relic: {
    id: 'soul_awakening_relic',
    name: 'ศิลาปลุกจิต Pixel Quest',
    kind: 'material',
    itemCategory: 'special',
    price: 12000,
    sellPrice: 6000,
    tier: 5,
    defaultRarity: 'legendary',
    element: 'holy',
    icon: 'core',
    color: '#fde047',
    description: 'ศิลาโบราณที่เก็บพลังจิตวิญญาณอันบริสุทธิ์',
  },
  mythic_awakening_core: {
    id: 'mythic_awakening_core',
    name: 'แก่นปลุกพลังเทพ Pixel Quest',
    kind: 'material',
    itemCategory: 'special',
    price: 35000,
    sellPrice: 18000,
    tier: 6,
    defaultRarity: 'mythic',
    element: 'holy',
    icon: 'core',
    color: '#fb7185',
    description: 'แก่นคริสตัลระดับเทพที่เปี่ยมด้วยแสงจักรวาล ใช้หลอมศาสตราเทพ Lv.100',
  },
}

const BASE_ITEMS: Record<string, ItemDef> = {
  ...catalogItems,
  ...SET_A_AND_HIGH_TIER_ITEMS,
  red_potion: { id: 'red_potion', name: 'ยาแดง', kind: 'consumable', itemCategory: 'consumable', price: 30, heal: 60, icon: 'potion', color: '#e63946', description: 'ฟื้นฟู HP 60' },
  orange_potion: { id: 'orange_potion', name: 'ยาส้ม', kind: 'consumable', itemCategory: 'consumable', price: 120, heal: 220, icon: 'potion', color: '#f4a261', description: 'ฟื้นฟู HP 220' },
  white_potion: { id: 'white_potion', name: 'ยาขาว', kind: 'consumable', itemCategory: 'consumable', price: 400, heal: 700, icon: 'potion', color: '#f1faee', description: 'ฟื้นฟู HP 700' },
  blue_potion: { id: 'blue_potion', name: 'ยาฟ้า', kind: 'consumable', itemCategory: 'consumable', price: 60, mana: 50, icon: 'potion', color: '#4895ef', description: 'ฟื้นฟู MP 50' },
  purple_potion: { id: 'purple_potion', name: 'ยาม่วง', kind: 'consumable', itemCategory: 'consumable', price: 280, mana: 200, icon: 'potion', color: '#9d4edd', description: 'ฟื้นฟู MP 200' },
  return_scroll: { id: 'return_scroll', name: 'ม้วนคัมภีร์กลับเมือง', kind: 'consumable', itemCategory: 'consumable', price: 50, icon: 'scroll', color: '#f4d35e', description: 'วาร์ปกลับเมืองทันที' },
  town_warp_tome: { id: 'town_warp_tome', name: 'คัมภีร์วาร์ปกลับเมือง', kind: 'consumable', itemCategory: 'special', price: 1200, sellPrice: 400, defaultRarity: 'rare', icon: 'scroll', color: '#c4b5fd', description: 'ใช้เพื่อวาร์ปกลับเมืองทันที' },
  starlight_loot_magnet: { id: 'starlight_loot_magnet', name: 'แม่เหล็กดูดของแสงดาว', kind: 'consumable', itemCategory: 'special', price: 4500, sellPrice: 1800, defaultRarity: 'legendary', icon: 'core', color: '#38bdf8', description: 'ดูดดรอปของคุณในระยะ 120 px นาน 5 นาที' },
  astral_bag_expansion: { id: 'astral_bag_expansion', name: 'กระเป๋าดวงดาว +20 ช่อง', kind: 'consumable', itemCategory: 'special', price: 6000, sellPrice: 2400, defaultRarity: 'legendary', icon: 'bag', color: '#f59e0b', description: 'เพิ่มช่องกระเป๋าถาวร 20 ช่อง สูงสุด +60 ช่อง' },
  vip_card_7d: { id: 'vip_card_7d', name: 'บัตรสมาชิก VIP (7 วัน)', kind: 'consumable', itemCategory: 'special', price: 2500, sellPrice: 800, defaultRarity: 'rare', icon: 'ticket', color: '#fbbf24', description: 'กดใช้เพื่อเปิดใช้งานหรือต่ออายุสมาชิก VIP 7 วัน (+150 VIP EXP)', effect: true },
  vip_card_30d: { id: 'vip_card_30d', name: 'บัตรสมาชิก VIP (30 วัน)', kind: 'consumable', itemCategory: 'special', price: 8500, sellPrice: 2800, defaultRarity: 'epic', icon: 'ticket', color: '#c084fc', description: 'กดใช้เพื่อเปิดใช้งานหรือต่ออายุสมาชิก VIP 30 วัน (+450 VIP EXP)', effect: true },
  vip_exp_crystal: { id: 'vip_exp_crystal', name: 'ผลึกเลื่อนขั้น VIP (+600 EXP)', kind: 'consumable', itemCategory: 'special', price: 5000, sellPrice: 1800, defaultRarity: 'epic', icon: 'crystal', color: '#38bdf8', description: 'กดใช้เพื่อเพิ่ม VIP EXP +600 ทันที', effect: true },
  bag_scroll_10: { id: 'bag_scroll_10', name: 'คัมภีร์ขยายกระเป๋า +10 ช่อง', kind: 'consumable', itemCategory: 'special', price: 3000, sellPrice: 1000, defaultRarity: 'rare', icon: 'bag', color: '#34d399', description: 'กดใช้เพื่อเพิ่มความจุกระเป๋าถาวร +10 ช่อง', effect: true },
  storage_scroll_15: { id: 'storage_scroll_15', name: 'คัมภีร์ขยายคลังพี่มณี +15 ช่อง', kind: 'consumable', itemCategory: 'special', price: 3200, sellPrice: 1100, defaultRarity: 'rare', icon: 'scroll', color: '#60a5fa', description: 'กดใช้เพื่อขยายคลังเก็บของถาวร +15 ช่อง', effect: true },
  storage_scroll_30: { id: 'storage_scroll_30', name: 'หีบนิรภัยจักรวาล +30 ช่องคลัง', kind: 'consumable', itemCategory: 'special', price: 6500, sellPrice: 2200, defaultRarity: 'epic', icon: 'bag', color: '#a855f7', description: 'กดใช้เพื่อขยายคลังเก็บของถาวร +30 ช่อง', effect: true },
  pet_exp_elixir: { id: 'pet_exp_elixir', name: 'น้ำทิพย์ฝึกสัตว์เลี้ยง', kind: 'consumable', itemCategory: 'consumable', price: 900, sellPrice: 360, defaultRarity: 'rare', icon: 'potion', color: '#f472b6', description: 'กดใช้เพื่อเพิ่ม EXP สัตว์เลี้ยงที่สวมใส่อยู่ +250 EXP', effect: true },
  supreme_hp_elixir: { id: 'supreme_hp_elixir', name: 'น้ำยาอมฤตสวรรค์', kind: 'consumable', itemCategory: 'consumable', price: 1400, sellPrice: 560, defaultRarity: 'epic', heal: 1200, mana: 400, icon: 'potion', color: '#fb7185', description: 'ฟื้นฟู HP 1,200 และ MP 400 ทันที', effect: true },
  double_exp_scroll: { id: 'double_exp_scroll', name: 'คัมภีร์คูณค่าประสบการณ์ (10 นาที)', kind: 'consumable', itemCategory: 'special', price: 1800, sellPrice: 700, defaultRarity: 'epic', icon: 'scroll', color: '#facc15', description: 'กดใช้เพื่อรับบัฟ EXP +35%, ATK +15%, DEF +15% นาน 10 นาที', effect: true },
  enhance_stone: { id: 'enhance_stone', name: 'หินตีบวก', kind: 'material', itemCategory: 'special', price: 500, defaultRarity: 'rare', icon: 'stone', color: '#4cc9f0', description: 'ใช้ตีบวกอุปกรณ์ที่ช่างตีบวก' },
  slime_gel: { id: 'slime_gel', name: 'เจลสไลม์', kind: 'material', itemCategory: 'material', price: 8, icon: 'gel', color: '#80ed99', description: 'ของดรอปจากสไลม์ ขายได้' },
  mushroom_cap: { id: 'mushroom_cap', name: 'หมวกเห็ด', kind: 'material', itemCategory: 'material', price: 15, icon: 'gel', color: '#e76f51', description: 'ของดรอปจากเห็ด ขายได้' },
  wolf_fang: { id: 'wolf_fang', name: 'เขี้ยวหมาป่า', kind: 'material', itemCategory: 'material', price: 45, icon: 'fang', color: '#f1faee', description: 'ของดรอปจากหมาป่า ขายได้' },
  goblin_ear: { id: 'goblin_ear', name: 'หูก๊อบลิน', kind: 'material', itemCategory: 'material', price: 60, icon: 'fang', color: '#90be6d', description: 'ของดรอปจากก๊อบลิน ขายได้' },
  bone: { id: 'bone', name: 'กระดูก', kind: 'material', itemCategory: 'material', price: 90, icon: 'bone', color: '#e9e3d5', description: 'ของดรอปจากโครงกระดูก ขายได้' },
  ectoplasm: { id: 'ectoplasm', name: 'วิญญาณหลอน', kind: 'material', itemCategory: 'material', price: 130, icon: 'gel', color: '#caf0f8', description: 'ของดรอปจากผี ขายได้' },
  ember_core: { id: 'ember_core', name: 'แกนเพลิง', kind: 'material', itemCategory: 'special', price: 220, defaultRarity: 'epic', element: 'fire', icon: 'core', color: '#ff6b35', description: 'ของดรอปจากภูเขาไฟ ขายได้' },
  earth_core: { id: 'earth_core', name: 'แก่นปฐพี', kind: 'material', itemCategory: 'special', price: 1200, defaultRarity: 'legendary', icon: 'core', color: '#b08954', description: 'แก่นพลังที่ได้จากผู้พิทักษ์ปฐพี' },
  demon_horn: { id: 'demon_horn', name: 'เขาปีศาจ', kind: 'material', itemCategory: 'material', price: 350, defaultRarity: 'epic', element: 'shadow', icon: 'fang', color: '#9d0208', description: 'ของดรอปจากปีศาจ ขายได้' },
  torn_cloth: { id: 'torn_cloth', name: 'ผ้าขาดจากมอน', kind: 'material', itemCategory: 'material', price: 3, icon: 'junk', color: '#a78b72', description: 'เศษผ้าสกปรกจากมอนสเตอร์ ขายให้พ่อค้าได้' },
  cracked_claw: { id: 'cracked_claw', name: 'กรงเล็บแตกร้าว', kind: 'material', itemCategory: 'material', price: 6, icon: 'junk', color: '#c08457', description: 'กรงเล็บเก่าที่แตกแล้วจากมอนสเตอร์' },
  monster_scrap: { id: 'monster_scrap', name: 'เศษซากมอนสเตอร์', kind: 'material', itemCategory: 'material', price: 12, icon: 'junk', color: '#64748b', description: 'เศษซากไร้ค่า แต่ขายรวมกันแล้วได้เงิน' },
  name_change_ticket: { id: 'name_change_ticket', name: 'บัตรเปลี่ยนชื่อ', kind: 'consumable', itemCategory: 'special', price: 2500, defaultRarity: 'epic', icon: 'ticket', color: '#f8c537', description: 'ใช้เปลี่ยนชื่อตัวละครของคุณได้ 1 ครั้ง', effect: true },
  fish_silver: { id: 'fish_silver', name: 'ปลาเงินลำธาร', kind: 'material', itemCategory: 'material', price: 28, icon: 'gel', color: '#93c5fd', description: 'ปลาสดจากลำธาร ใช้ทำอาหารหรือขายได้' },
  fish_golden: { id: 'fish_golden', name: 'ปลาคาร์ปทองคำ', kind: 'material', itemCategory: 'material', price: 140, defaultRarity: 'uncommon', icon: 'core', color: '#fbbf24', description: 'ปลาหายากจากบ่อน้ำเมือง ใช้นึ่งซุปเพิ่มสเตตัส' },
  ore_iron: { id: 'ore_iron', name: 'แร่เหล็กดิบ', kind: 'material', itemCategory: 'material', price: 36, icon: 'stone', color: '#94a3b8', description: 'แร่เหล็กจากเหมืองถ้ำ ใช้คราฟต์และหลอมรูน' },
  ore_mythril: { id: 'ore_mythril', name: 'แร่มิธริลเรืองแสง', kind: 'material', itemCategory: 'material', price: 185, defaultRarity: 'rare', icon: 'stone', color: '#38bdf8', description: 'แร่ล้ำค่าจากถ้ำลึกและฟากฟ้า' },
  herb_green: { id: 'herb_green', name: 'สมุนไพรพฤกษา', kind: 'material', itemCategory: 'material', price: 25, icon: 'gel', color: '#4ade80', description: 'สมุนไพรสดจากทุ่งหญ้า ใช้ปรุงอาหารฟื้นพลัง' },
  herb_moon: { id: 'herb_moon', name: 'ดอกจันทร์เหมันต์', kind: 'material', itemCategory: 'material', price: 160, defaultRarity: 'rare', icon: 'core', color: '#c084fc', description: 'สมุนไพรหายากใต้แสงจันทร์ ใช้ปรุงน้ำยาชั้นสูง' },
  pet_essence: { id: 'pet_essence', name: 'ผลึกวิญญาณคู่หู', kind: 'material', itemCategory: 'special', price: 320, defaultRarity: 'epic', icon: 'core', color: '#f472b6', description: 'ใช้หลอมวิวัฒนาการเพิ่มดาวสัตว์เลี้ยง (1★ -> 5★)' },
  food_grilled_fish: { id: 'food_grilled_fish', name: 'ปลาย่างสมุนไพร', kind: 'consumable', itemCategory: 'consumable', price: 120, heal: 180, icon: 'gel', color: '#fb923c', description: 'ฟื้น HP 180 และเพิ่ม ATK +12% นาน 5 นาที' },
  food_miner_tonic: { id: 'food_miner_tonic', name: 'ยาชูกำลังนักขุด', kind: 'consumable', itemCategory: 'consumable', price: 160, mana: 140, icon: 'core', color: '#38bdf8', description: 'ฟื้น MP 140 และเพิ่ม DEF +15% นาน 5 นาที' },
  food_hero_feast: { id: 'food_hero_feast', name: 'ชุดอาหารผู้กล้า', kind: 'consumable', itemCategory: 'consumable', price: 420, heal: 420, defaultRarity: 'rare', icon: 'core', color: '#facc15', description: 'เพิ่ม ATK +18%, คริติคอล +8% และ EXP +25% นาน 8 นาที' },
  food_dragon_soup: { id: 'food_dragon_soup', name: 'ซุปมังกรศิลา', kind: 'consumable', itemCategory: 'consumable', price: 650, heal: 700, defaultRarity: 'epic', icon: 'core', color: '#f43f5e', description: 'เพิ่ม ATK +25%, DEF +20% และ EXP +35% นาน 10 นาที' },

  // ---- Asura Online Boosters, Upgrade Scrolls & Utility Potions ----
  asura_exp_50: { id: 'asura_exp_50', name: 'EXP Boost Up 50% (20น.)', kind: 'consumable', itemCategory: 'special', price: 600, sellPrice: 240, defaultRarity: 'uncommon', icon: 'potion', color: '#f59e0b', description: 'เพิ่มค่าประสบการณ์ (EXP) ที่ได้รับจากมอนสเตอร์ +50% นาน 20 นาที', effect: true },
  asura_exp_100: { id: 'asura_exp_100', name: 'EXP Boost Up 100% (20น.)', kind: 'consumable', itemCategory: 'special', price: 1500, sellPrice: 600, defaultRarity: 'rare', icon: 'potion', color: '#facc15', description: 'เพิ่มค่าประสบการณ์ (EXP) จากมอนสเตอร์ +100% (x2) นาน 20 นาที', effect: true },
  asura_jp_50: { id: 'asura_jp_50', name: 'การงาน Boost Up 50% (20น.)', kind: 'consumable', itemCategory: 'special', price: 600, sellPrice: 240, defaultRarity: 'uncommon', icon: 'potion', color: '#fb923c', description: 'เพิ่มค่าประสบการณ์อาชีพ (JP) +50% นาน 20 นาที', effect: true },
  asura_jp_100: { id: 'asura_jp_100', name: 'การงาน Boost Up 100% (20น.)', kind: 'consumable', itemCategory: 'special', price: 1500, sellPrice: 600, defaultRarity: 'rare', icon: 'potion', color: '#f97316', description: 'เพิ่มค่าประสบการณ์อาชีพ (JP) +100% (x2) นาน 20 นาที', effect: true },
  asura_lifeskill_50: { id: 'asura_lifeskill_50', name: 'ทักษะฝึกฝน Boost Up 50%', kind: 'consumable', itemCategory: 'special', price: 800, sellPrice: 320, defaultRarity: 'uncommon', icon: 'potion', color: '#4ade80', description: 'เพิ่ม EXP ทักษะฝึกฝน (ตกปลา/ขุดแร่/เก็บสมุนไพร) +50% และเพิ่มโอกาสดรอปแรร์ 20 นาที', effect: true },
  asura_leg_muscle: { id: 'asura_leg_muscle', name: 'ยาเพิ่มกล้ามเนื้อขา (20น.)', kind: 'consumable', itemCategory: 'consumable', price: 500, sellPrice: 200, defaultRarity: 'uncommon', icon: 'potion', color: '#38bdf8', description: 'เพิ่มความเร็วในการเคลื่อนที่ +25% ต่อเนื่อง 20 นาที', effect: true },
  asura_weight_potion: { id: 'asura_weight_potion', name: 'ยาเพิ่มพลังแบกของ (30น.)', kind: 'consumable', itemCategory: 'consumable', price: 700, sellPrice: 280, defaultRarity: 'uncommon', icon: 'potion', color: '#a78bfa', description: 'เพิ่มขีดจำกัดน้ำหนักสัมภาระ +650 หน่วย นาน 30 นาที', effect: true },
  asura_stat_potion_s: { id: 'asura_stat_potion_s', name: 'ยาเพิ่มสเตตัสขนาดเล็ก', kind: 'consumable', itemCategory: 'consumable', price: 750, sellPrice: 300, defaultRarity: 'uncommon', icon: 'potion', color: '#34d399', description: 'เพิ่ม ATK / DEF / MaxHP +5% นาน 20 นาที', effect: true },
  asura_stat_potion_m: { id: 'asura_stat_potion_m', name: 'ยาเพิ่มสเตตัสขนาดกลาง', kind: 'consumable', itemCategory: 'consumable', price: 1450, sellPrice: 580, defaultRarity: 'rare', icon: 'potion', color: '#22d3ee', description: 'เพิ่ม ATK / DEF / MaxHP +10% และ CRIT +5% นาน 20 นาที', effect: true },

  enhance_chance_scroll_1: { id: 'enhance_chance_scroll_1', name: 'ใบเพิ่มโอกาส (+10%)', kind: 'material', itemCategory: 'special', price: 450, defaultRarity: 'uncommon', icon: 'scroll', color: '#38bdf8', description: 'ใช้ในหน้าต่างตีบวกเพื่อเพิ่มโอกาสสำเร็จ +10%', effect: true },
  enhance_chance_scroll_2: { id: 'enhance_chance_scroll_2', name: 'ใบเพิ่มโอกาสชั้นดี (+20%)', kind: 'material', itemCategory: 'special', price: 900, defaultRarity: 'rare', icon: 'scroll', color: '#818cf8', description: 'ใช้ในหน้าต่างตีบวกเพื่อเพิ่มโอกาสสำเร็จ +20%', effect: true },
  enhance_chance_scroll_3: { id: 'enhance_chance_scroll_3', name: 'ใบเพิ่มโอกาสชั้นเยี่ยม (+35%)', kind: 'material', itemCategory: 'special', price: 1800, defaultRarity: 'epic', icon: 'scroll', color: '#c084fc', description: 'ใช้ในหน้าต่างตีบวกเพื่อเพิ่มโอกาสสำเร็จ +35%', effect: true },
  enhance_chance_scroll_4: { id: 'enhance_chance_scroll_4', name: 'ใบเพิ่มโอกาสของคหบดี (+50%)', kind: 'material', itemCategory: 'special', price: 3200, defaultRarity: 'legendary', icon: 'scroll', color: '#fbbf24', description: 'ใบอัพเกรดระดับตำนาน เพิ่มโอกาสตีบวกสำเร็จ +50%', effect: true },
  enhance_protect_scroll_1: { id: 'enhance_protect_scroll_1', name: 'ใบประกันความเสียหาย', kind: 'material', itemCategory: 'special', price: 800, defaultRarity: 'rare', icon: 'scroll', color: '#4ade80', description: 'ใช้ในหน้าต่างตีบวก ป้องกันระดับไอเทมลดลงเมื่อตีบวกล้มเหลว (+6 ขึ้นไป)', effect: true },
  enhance_protect_scroll_2: { id: 'enhance_protect_scroll_2', name: 'ใบประกันความเสียหายชั้นดี', kind: 'material', itemCategory: 'special', price: 1600, defaultRarity: 'epic', icon: 'scroll', color: '#f43f5e', description: 'ป้องกันระดับไอเทมลดลงเมื่อตีบวกล้มเหลว พร้อมคืนหินตีบวกครึ่งหนึ่ง', effect: true },

  stat_reset_potion: { id: 'stat_reset_potion', name: 'น้ำยาหวนกลับ', kind: 'consumable', itemCategory: 'special', price: 600, defaultRarity: 'rare', icon: 'potion', color: '#fb7185', description: 'ใช้ล้างแต้มสเตตัส (STR/VIT/DEX/AGI/INT/LUK) ทั้งหมดคืนฟรี 1 ครั้ง', effect: true },
  skill_reset_potion: { id: 'skill_reset_potion', name: 'น้ำยาลืมทักษะ', kind: 'consumable', itemCategory: 'special', price: 600, defaultRarity: 'rare', icon: 'potion', color: '#c084fc', description: 'ใช้ล้างแต้มทักษะ (SP) ทั้งหมดคืนฟรี 1 ครั้ง', effect: true },
  job_reset_potion: { id: 'job_reset_potion', name: 'น้ำยาเปลี่ยนอาชีพ', kind: 'consumable', itemCategory: 'special', price: 1500, defaultRarity: 'epic', icon: 'potion', color: '#f59e0b', description: 'รีเซ็ตสายอาชีพกลับสู่ผู้ฝึกหัด (คงเลเวลและอุปกรณ์) เพื่อเลือกสายใหม่', effect: true },
  title_clear_scroll: { id: 'title_clear_scroll', name: 'ใบแจ้งลบฉายา', kind: 'consumable', itemCategory: 'special', price: 250, icon: 'scroll', color: '#94a3b8', description: 'ล้างนามแฝงและฉายาที่แสดงบนตัวละครออกทั้งหมดทันที' },
  name_color_potion: { id: 'name_color_potion', name: 'น้ำยาสุ่มสีชื่อ', kind: 'consumable', itemCategory: 'special', price: 1200, sellPrice: 400, defaultRarity: 'rare', icon: 'potion', color: '#e879f9', description: 'กดใช้เพื่อสุ่มเปลี่ยนสีชื่อตัวละครของคุณแบบถาวร (แสดงบนหัวตัวละคร แถบสถานะ และผู้เล่นรอบข้าง) พร้อมโอกาสระดับตำนานปลดล็อก "สีรุ้งพิเศษ"!', effect: true },
  rainbow_name_potion: { id: 'rainbow_name_potion', name: 'น้ำยาสีรุ้งระดับตำนาน', kind: 'consumable', itemCategory: 'special', price: 15000, sellPrice: 5000, defaultRarity: 'legendary', element: 'holy', icon: 'potion', color: '#f472b6', description: 'ไอเทมสีระดับตำนาน: กดใช้เพื่อปลดล็อกและเปิดใช้งานตัวเลือก "สีรุ้งพิเศษ (Rainbow Mode)" ในหน้าสถานะแบบถาวร', effect: true },
  companion_gacha_box: { id: 'companion_gacha_box', name: 'กล่องสุ่มคู่หู Pixel Quest', kind: 'consumable', itemCategory: 'special', price: 2400, sellPrice: 800, defaultRarity: 'epic', icon: 'bag', color: '#f472b6', description: 'เปิดเพื่อสุ่มรับคู่หู (ผอบ) หรือผลึกวิวัฒนาการคู่หู x5 + EXP สัตว์เลี้ยง', effect: true },

  // ---- Event Items, Event Goods & Event Tokens ----
  event_token: { id: 'event_token', name: 'โทเคนกิจกรรม', kind: 'consumable', itemCategory: 'special', price: 0, sellPrice: 0, defaultRarity: 'epic', element: 'holy', icon: 'ticket', color: '#facc15', asset: '/assets/items/special/event_token.png', description: 'โทเคนสากลจากกิจกรรมและเทศกาล กดใช้เพื่อฝากเข้ากระเป๋าโทเคนกิจกรรม (+1 โทเคนกิจกรรม) หรือนำไปแลกของกิจกรรมสุดพิเศษ', effect: true },
  event_lucky_box: { id: 'event_lucky_box', name: 'กล่องสุ่มของขวัญกิจกรรม', kind: 'consumable', itemCategory: 'special', price: 1800, sellPrice: 600, defaultRarity: 'epic', element: 'holy', icon: 'bag', color: '#fb7185', asset: '/assets/items/special/event_lucky_box.png', description: 'กดเปิดเพื่อสุ่มรับของรางวัลกิจกรรม: โทเคนกิจกรรม x5–15, หินตีบวก, เพชร 8–20 เม็ด, สำรับอาหารเทศกาล หรือโอกาสลุ้นเครื่องรางดาราแห่งเทศกาล!', effect: true },
  event_mythic_chest: { id: 'event_mythic_chest', name: 'หีบมหาสมบัติกิจกรรม', kind: 'consumable', itemCategory: 'special', price: 5500, sellPrice: 1800, defaultRarity: 'legendary', element: 'holy', icon: 'bag', color: '#f59e0b', asset: '/assets/items/special/event_mythic_chest.png', description: 'หีบสมบัติกิจกรรมระดับตำนาน การันตีเพชร 20–40 เม็ด + ทอง 6,000–15,000 G + หินตีบวก x10–18 พร้อมลุ้นใบประกันตีบวกหรือกล่องของขวัญกิจกรรม!', effect: true },
  event_festival_feast: { id: 'event_festival_feast', name: 'สำรับอาหารเทศกาลมงคล', kind: 'consumable', itemCategory: 'consumable', price: 950, sellPrice: 320, heal: 1500, mana: 500, defaultRarity: 'rare', element: 'fire', icon: 'potion', color: '#fbbf24', asset: '/assets/items/special/event_festival_feast.png', description: 'ของกิจกรรมฉลองเทศกาล ฟื้น HP 1,500 · MP 500 ทันที และเพิ่ม ATK +22%, DEF +18%, CRIT +10%, EXP +40% นาน 15 นาที', effect: true },
  event_star_charm: { id: 'event_star_charm', name: 'เครื่องรางดาราแห่งเทศกาล', kind: 'armor', slot: 'accessory', itemCategory: 'charm', atk: 42, def: 54, price: 12000, sellPrice: 3000, tier: 5, reqLevel: 1, defaultRarity: 'legendary', element: 'holy', icon: 'accessory', color: '#38bdf8', asset: '/assets/items/accessories/event_star_charm.png', description: 'เครื่องประดับกิจกรรมระดับตำนาน สวมใส่ได้ตั้งแต่ Lv.1 ทุกอาชีพ เพิ่มพลังโจมตี ป้องกัน และคริติคอลจากแสงดารา' },

  // ---- Non-Festival Activity Rewards (Random Weapon Chests + Activity Signature Items) ----
  act_weapon_box_rare: { id: 'act_weapon_box_rare', name: 'กล่องสุ่มอาวุธกิจกรรม', kind: 'consumable', itemCategory: 'special', price: 2400, sellPrice: 800, defaultRarity: 'rare', element: 'fire', icon: 'bag', color: '#fb923c', description: 'กล่องสุ่มอาวุธประจำกิจกรรม — กดเปิดเพื่อสุ่มรับอาวุธ 1 ชิ้น (Rare–Legendary, +1 ถึง +3 พร้อมออฟชันสุ่ม)', effect: true },
  act_weapon_box_legend: { id: 'act_weapon_box_legend', name: 'หีบสุ่มศาสตราวุธวีรบุรุษ', kind: 'consumable', itemCategory: 'special', price: 5800, sellPrice: 1900, defaultRarity: 'legendary', element: 'holy', icon: 'bag', color: '#facc15', description: 'กล่องสุ่มอาวุธระดับสูงจากกิจกรรม — กดเปิดเพื่อสุ่มรับอาวุธ 1 ชิ้น (Epic–Mythic, +2 ถึง +5 พร้อมออฟชันสุ่ม)', effect: true },
  act_item_bastion_ration: { id: 'act_item_bastion_ration', name: 'เสบียงป้อมปราการ', kind: 'consumable', itemCategory: 'consumable', price: 750, sellPrice: 250, heal: 950, mana: 450, defaultRarity: 'rare', element: 'fire', icon: 'potion', color: '#fb7185', description: 'ของเฉพาะกิจกรรมป้องกันเมือง: ฟื้น HP 950 · MP 450 ทันที และเพิ่ม DEF +25%, ATK +15%, CRIT +6%, EXP +20% นาน 15 นาที', effect: true },
  act_item_war_horn: { id: 'act_item_war_horn', name: 'แตรศึกปลุกขวัญกิลด์', kind: 'consumable', itemCategory: 'special', price: 1100, sellPrice: 360, defaultRarity: 'epic', element: 'lightning', icon: 'ticket', color: '#60a5fa', description: 'ของเฉพาะกิจกรรมสงครามกิลด์: กดใช้เพื่อปลุกขวัญกิลด์ เพิ่ม ATK/DEF/MaxHP +12%, ความเร็ว +20% และ JP +60% นาน 20 นาที', effect: true },
  act_item_bounty_seal: { id: 'act_item_bounty_seal', name: 'ตรานายพรานค่าหัว', kind: 'consumable', itemCategory: 'special', price: 1050, sellPrice: 350, heal: 400, mana: 200, defaultRarity: 'epic', element: 'shadow', icon: 'ticket', color: '#f59e0b', description: 'ของเฉพาะกิจกรรมล่าค่าหัว: กดใช้เพื่อฟื้น HP 400 · MP 200 และเพิ่ม EXP +75% พร้อมสเตตัสทั้งหมด +10% นาน 20 นาที', effect: true },
  act_item_pirate_compass: { id: 'act_item_pirate_compass', name: 'เข็มทิศขุมทรัพย์โจรสลัด', kind: 'consumable', itemCategory: 'special', price: 2200, sellPrice: 700, defaultRarity: 'legendary', element: 'holy', icon: 'core', color: '#facc15', description: 'ของเฉพาะกิจกรรมเกาะสมบัติ: กดใช้เพื่อขุดสมบัติลับ รับทอง 3,000–7,500 G, เพชร 6–16 เม็ด, หินตีบวก x4–8 และลุ้นผลึกคู่หู!', effect: true },
  act_item_colosseum_elixir: { id: 'act_item_colosseum_elixir', name: 'น้ำอมฤตแชมเปี้ยนโคลอสเซียม', kind: 'consumable', itemCategory: 'consumable', price: 1650, sellPrice: 550, heal: 2200, mana: 900, defaultRarity: 'legendary', element: 'arcane', icon: 'potion', color: '#c084fc', description: 'ของเฉพาะกิจกรรมบอสรัช: ฟื้น HP 2,200 · MP 900 ทันที และเพิ่ม ATK +28%, DEF +22%, CRIT +14%, EXP +45% นาน 15 นาที', effect: true },
  act_item_golden_bait: { id: 'act_item_golden_bait', name: 'เหยื่อทองคำเทพวารี', kind: 'consumable', itemCategory: 'special', price: 680, sellPrice: 220, mana: 250, defaultRarity: 'rare', element: 'ice', icon: 'core', color: '#38bdf8', description: 'ของเฉพาะกิจกรรมแข่งตกปลา: ฟื้น MP 250 และเพิ่ม EXP ทักษะฝึกฝน (ตกปลา/ขุดแร่/สมุนไพร) +100% พร้อมความเร็ว +20% นาน 25 นาที', effect: true },

  wooden_stick: weapon('wooden_stick', 'ไม้พลอง', 'stick', 6, 50, 1, 1, '#a47148', { defaultRarity: 'common' }),
  oak_club: weapon('oak_club', 'กระบองโอ๊ค', 'stick', 14, 400, 2, 5, '#7f5539', { defaultRarity: 'uncommon' }),

  short_sword: weapon('short_sword', 'ดาบสั้น', 'sword', 16, 400, 1, 10, '#adb5bd', { defaultRarity: 'common' }),
  steel_sword: weapon('steel_sword', 'ดาบเหล็กกล้า', 'sword', 36, 2500, 2, 15, '#dee2e6', { defaultRarity: 'uncommon' }),
  knight_blade: weapon('knight_blade', 'ดาบอัศวิน', 'sword', 72, 9000, 3, 25, '#90e0ef', { defaultRarity: 'rare' }),
  flame_sword: weapon('flame_sword', 'ดาบเพลิงนรก', 'sword', 125, 25000, 4, 38, '#ff6b35', { defaultRarity: 'epic', element: 'fire' }),

  wood_staff: weapon('wood_staff', 'คทาไม้', 'staff', 15, 400, 1, 10, '#b08968', { defaultRarity: 'common' }),
  oak_staff: weapon('oak_staff', 'คทาโอ๊ค', 'staff', 34, 2500, 2, 15, '#9c6644', { defaultRarity: 'uncommon' }),
  crystal_staff: weapon('crystal_staff', 'คทาคริสตัล', 'staff', 68, 9000, 3, 25, '#a2d2ff', { defaultRarity: 'rare', element: 'arcane' }),
  inferno_staff: weapon('inferno_staff', 'คทาอัคคี', 'staff', 120, 25000, 4, 38, '#e85d04', { defaultRarity: 'epic', element: 'fire' }),
  gm_golden_staff: { id: 'gm_golden_staff', name: 'คฑาทองคำ GM', kind: 'weapon', itemCategory: 'weapon', weaponType: 'staff', atk: 9999999, price: 0, sellPrice: 0, tier: 99, reqLevel: 1, gmOnly: true, defaultRarity: 'mythic', element: 'holy', icon: 'staff', color: '#ffd700', description: 'อาวุธเฉพาะ GM — ความเสียหาย 9,999,999' },

  short_bow: weapon('short_bow', 'ธนูสั้น', 'bow', 15, 400, 1, 10, '#bc6c25', { defaultRarity: 'common' }),
  long_bow: weapon('long_bow', 'ธนูยาว', 'bow', 35, 2500, 2, 15, '#99582a', { defaultRarity: 'uncommon' }),
  hunter_bow: weapon('hunter_bow', 'ธนูพราน', 'bow', 69, 9000, 3, 25, '#606c38', { defaultRarity: 'rare' }),
  phoenix_bow: weapon('phoenix_bow', 'ธนูฟีนิกซ์', 'bow', 122, 25000, 4, 38, '#f48c06', { defaultRarity: 'epic', element: 'fire' }),

  knife: weapon('knife', 'มีดสั้น', 'dagger', 14, 400, 1, 10, '#ced4da', { defaultRarity: 'common' }),
  kris: weapon('kris', 'กริช', 'dagger', 32, 2500, 2, 15, '#e9c46a', { defaultRarity: 'uncommon' }),
  shadow_dagger: weapon('shadow_dagger', 'มีดเงา', 'dagger', 64, 9000, 3, 25, '#7b2cbf', { defaultRarity: 'rare', element: 'shadow' }),
  demon_fang: weapon('demon_fang', 'เขี้ยวปีศาจ', 'dagger', 115, 25000, 4, 38, '#d00000', { defaultRarity: 'epic', element: 'shadow' }),

  // ---- Pawchemist Bomb Flasks (staff slot) ----
  pawchemist_molotov_flask: weapon('pawchemist_molotov_flask', 'ขวดระเบิดโมโลตอฟ Pawchemist', 'staff', 16, 420, 1, 10, '#f472b6', {
    defaultRarity: 'common',
    element: 'fire',
    allowedJobs: ['nekobaku'],
    description: 'ขวดระเบิดแอลเคมีสำหรับ Pawchemist ลงช่องคทา (ATK +16)',
  }),
  pawchemist_fizz_bomb: weapon('pawchemist_fizz_bomb', 'ขวดฟองฟู่แปรธาตุ', 'staff', 48, 3200, 2, 20, '#38bdf8', {
    defaultRarity: 'rare',
    element: 'arcane',
    allowedJobs: ['nekobaku'],
    description: 'ขวดน้ำยาฟองซ่าอัดแรงดันของ Pawchemist ลงช่องคทา (ATK +48)',
  }),
  pawchemist_crimson_flask: weapon('pawchemist_crimson_flask', 'ขวดเพลิงโลหิต Pawchemist', 'staff', 95, 11500, 3, 35, '#fb7185', {
    defaultRarity: 'epic',
    element: 'fire',
    allowedJobs: ['nekobaku'],
    description: 'ขวดน้ำยาระเบิดเข้มข้นสีแดงฉานสำหรับ Pawchemist ลงช่องคทา (ATK +95)',
  }),
  pawchemist_blazing_bomb: weapon('pawchemist_blazing_bomb', 'ระเบิดเพลิงกัมปนาท', 'staff', 215, 52000, 4, 55, '#f97316', {
    defaultRarity: 'epic',
    element: 'fire',
    allowedJobs: ['nekobaku'],
    description: 'ขวดระเบิดเพลิงแรงสูงประทับตรา Pawchemist ลงช่องคทา Lv.55 (ATK +215)',
  }),
  pawchemist_solar_bomb: weapon('pawchemist_solar_bomb', 'ขวดสุริยันแปรธาตุ', 'staff', 435, 130000, 5, 75, '#facc15', {
    defaultRarity: 'legendary',
    element: 'fire',
    allowedJobs: ['nekobaku'],
    description: 'ขวดระเบิดแกนสุริยะระดับตำนานของ Pawchemist ลงช่องคทา Lv.75 (ATK +435)',
  }),
  pawchemist_mythic_elixir: weapon('pawchemist_mythic_elixir', 'มหาศาสตราขวดยาอมฤต Pawchemist', 'staff', 1170, 680000, 6, 100, '#fde047', {
    defaultRarity: 'mythic',
    element: 'holy',
    allowedJobs: ['nekobaku'],
    description: 'ขวดยาแปรธาตุระดับเทพแห่ง Pawchemist ลงช่องคทา Lv.100 (ATK +1,170)',
  }),

  // ---- Grimcaller & Arcanist Grimoires (staff slot) ----
  grimcaller_occult_grimoire: weapon('grimcaller_occult_grimoire', 'ตำรามนต์ดำเนตรอเวจี', 'staff', 225, 52000, 4, 45, '#a855f7', {
    defaultRarity: 'epic',
    element: 'shadow',
    allowedJobs: ['wicked_necromancer', 'mage'],
    description: 'คัมภีร์มนต์ดำสำหรับ Grimcaller และ Arcanist ลงช่องคทา (ATK +225)',
  }),
  arcanist_celestial_tome: weapon('arcanist_celestial_tome', 'คัมภีร์ดาราจักร Arcanist', 'staff', 610, 210000, 5, 80, '#38bdf8', {
    defaultRarity: 'legendary',
    element: 'arcane',
    allowedJobs: ['mage', 'cleric', 'wicked_necromancer', 'the_king'],
    description: 'คัมภีร์เวทแสงดาวขั้นสูงสำหรับสายจอมเวทและนักบวช ลงช่องคทา (ATK +610)',
  }),

  abyss_crystal: { id: 'abyss_crystal', name: 'ผลึกอเวจี', kind: 'material', itemCategory: 'special', price: 1800, sellPrice: 900, defaultRarity: 'legendary', element: 'shadow', icon: 'core', color: '#8b5cf6', description: 'ผลึกหายากจากดันเจี้ยนห้วงอเวจี', tier: 5 },

  cloth_armor: armor('cloth_armor', 'ชุดผ้า', 5, 100, 1, 1, '#d4a373', { defaultRarity: 'common' }),
  leather_armor: armor('leather_armor', 'เกราะหนัง', 15, 1200, 2, 10, '#8b5e34', { defaultRarity: 'uncommon' }),
  chain_mail: armor('chain_mail', 'เกราะโซ่', 34, 8000, 3, 22, '#adb5bd', { defaultRarity: 'rare' }),
  dragon_armor: armor('dragon_armor', 'เกราะมังกร', 70, 24000, 4, 36, '#c1121f', { defaultRarity: 'epic', element: 'fire' }),
}

function resolveCatalogItemCategory(entry: (typeof WEAPON_CATALOG)[number]): ItemCategory {
  if (entry.slot === 'weapon') return 'weapon'
  if (entry.slot === 'shoes') return 'boots'
  if (entry.slot === 'accessory') return entry.name.includes('สร้อย') ? 'necklace' : 'accessory'
  if (entry.name.includes('โล่')) return 'shield'
  if (entry.name.includes('หมวก')) return 'helmet'
  if (entry.name.includes('ปลอกแขน')) return 'gloves'
  return 'armor'
}

const FILE_ITEMS: Record<string, ItemDef> = Object.fromEntries(
  WEAPON_CATALOG.map((entry, index) => {
    const tier = Math.min(6, 1 + Math.floor(index / 10))
    const isWeapon = entry.slot === 'weapon'
    const weaponType = isWeapon
      ? entry.id === 'weapon_004'
        ? 'stick'
        : entry.id === 'weapon_022' || entry.job === 'mage'
          ? 'staff'
          : entry.job === 'archer'
            ? 'bow'
            : entry.job === 'thief'
              ? 'dagger'
              : 'sword'
      : undefined
    const itemCategory = resolveCatalogItemCategory(entry)
    return [
      entry.id,
      {
        id: entry.id,
        name: entry.name,
        kind: isWeapon ? 'weapon' : 'armor',
        weaponType,
        slot: entry.slot as EquipmentSlot,
        itemCategory,
        atk: isWeapon ? 18 + index * 7 : undefined,
        def: isWeapon ? undefined : 8 + index * 3,
        price: 500 + index * 750,
        tier,
        reqLevel: 1 + Math.floor(index / 5) * 5,
        icon: isWeapon ? (weaponType ?? 'sword') : entry.slot,
        color: entry.job === 'mage' ? '#67e8f9' : entry.job === 'archer' ? '#86efac' : entry.job === 'thief' ? '#c084fc' : '#fbbf24',
        description: `${entry.name} — อุปกรณ์เซ็ตผจญภัยตามสายอาชีพ`,
        asset: entry.asset,
        defaultRarity:
          entry.job === 'gm'
            ? 'mythic'
            : tier >= 5
              ? 'legendary'
              : tier >= 3
                ? 'epic'
                : tier === 2
                  ? 'rare'
                  : 'uncommon',
        allowedJobs:
          entry.job === 'all' || entry.job === 'gm'
            ? undefined
            : entry.job === 'swordsman'
              ? ['novice', 'swordsman', 'merchant', 'kensei', 'iron_fist', 'templar', 'the_king']
              : entry.job === 'mage'
                ? ['mage', 'cleric', 'wicked_necromancer', 'the_king', 'nekobaku']
                : entry.job === 'archer'
                  ? ['archer', 'sinister', 'nekobaku', 'mamushi']
                  : entry.job === 'thief'
                    ? ['novice', 'thief', 'kensei', 'sinister', 'mamushi']
                    : undefined,
        gmOnly: entry.job === 'gm',
      },
    ]
  }),
)

const FILE_ITEM_IDS = Object.keys(FILE_ITEMS)

export const GM_ITEMS: Record<string, ItemDef> = Object.fromEntries(
  FILE_ITEM_IDS.map((id) => {
    const gmId = `gm888_${id.replace('weapon_', '')}`
    return [gmId, { ...FILE_ITEMS[id], id: gmId, gmOnly: true, defaultRarity: 'mythic' as EquipmentRarity }]
  }),
)

const BASE_ITEMS_WITH_ASSETS: Record<string, ItemDef> = Object.fromEntries(
  Object.entries(BASE_ITEMS).map(([id, def]) => [
    id,
    {
      ...def,
      asset: resolveSemanticBaseItemAssetPath(id, def),
    },
  ]),
)

export const ITEMS: Record<string, ItemDef> = { ...BASE_ITEMS_WITH_ASSETS, ...FILE_ITEMS, ...GM_ITEMS }

export const SHOP_STOCK: string[] = [
  'red_potion',
  'orange_potion',
  'white_potion',
  'blue_potion',
  'purple_potion',
  'return_scroll',
  'name_color_potion',
  'enhance_stone',
  'wooden_stick',
  'short_sword',
  'wood_staff',
  'short_bow',
  'knife',
  'pawchemist_molotov_flask',
  'pawchemist_fizz_bomb',
  'grimcaller_occult_grimoire',
  'iron_visor_helm',
  'leather_archer_bracer',
  'knight_heater_shield',
  'golden_crescent_earring',
  'jade_guardian_talisman',
  'imperial_gold_key',
  ...FILE_ITEM_IDS.filter((id) => !ITEMS[id].gmOnly).slice(0, 12),
]

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
  | 'abyss_knight'

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
  ...GENERATED_BIOME_MONSTERS,
}

export const MAX_LEVEL = 100
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
