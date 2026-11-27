import { normalizeJobId, normalizeSkillId, type JobId } from './data'

export type CombatVfxTier = 'basic' | 'special' | 'ultimate'

export type CombatVfxPhase =
  | 'preparation'
  | 'casting'
  | 'attack'
  | 'impact'
  | 'explosion'
  | 'fadeout'

export type CombatParticleShape =
  | 'spark'
  | 'petal'
  | 'coin'
  | 'bubble'
  | 'shard'
  | 'ember'
  | 'feather'
  | 'spirit'
  | 'droplet'
  | 'ring_mote'

export interface ClassPalette {
  primary: string
  secondary: string
  tertiary: string
  dark: string
  glow: string
}

export interface TierVfxSpec {
  tier: CombatVfxTier
  name: string
  pattern: string
  durationSec: number
  label: string
  particleShape: CombatParticleShape
}

export interface ClassCombatVfxProfile {
  jobId: JobId
  displayName: string
  palette: ClassPalette
  basic: TierVfxSpec
  special: TierVfxSpec
  ultimate: TierVfxSpec
}

export const MAX_COMBAT_PARTICLES = 180

export const CLASS_COMBAT_VFX_PROFILES: Record<JobId, ClassCombatVfxProfile> = {
  novice: {
    jobId: 'novice',
    displayName: 'Wayfarer',
    palette: {
      primary: '#e2e8f0',
      secondary: '#38bdf8',
      tertiary: '#ffffff',
      dark: '#1e3a5f',
      glow: '#7dd3fc',
    },
    basic: {
      tier: 'basic',
      name: 'Traveler Slash',
      pattern: 'wayfarer_basic_slash',
      durationSec: 0.34,
      label: 'ฟันอาวุธพื้นฐานพร้อมประกายแสงสีเงินฟ้า',
      particleShape: 'spark',
    },
    special: {
      tier: 'special',
      name: 'Adventurer Strike',
      pattern: 'wayfarer_adventurer_strike',
      durationSec: 0.78,
      label: 'ปล่อยคลื่นพลังนักผจญภัยสีเงิน-ฟ้าพุ่งปะทะ',
      particleShape: 'spark',
    },
    ultimate: {
      tier: 'ultimate',
      name: 'Rising Courage',
      pattern: 'wayfarer_rising_courage',
      durationSec: 1.85,
      label: 'ปลดปล่อยคลื่นพลังกล้าหาญรอบตัวพร้อมวงแสงสีเงินขาว',
      particleShape: 'ring_mote',
    },
  },
  swordsman: {
    jobId: 'swordsman',
    displayName: 'Vanguard',
    palette: {
      primary: '#cbd5e1',
      secondary: '#38bdf8',
      tertiary: '#2563eb',
      dark: '#172554',
      glow: '#60a5fa',
    },
    basic: {
      tier: 'basic',
      name: 'Sword Slash',
      pattern: 'vanguard_sword_slash',
      durationSec: 0.38,
      label: 'ฟันดาบโค้งสีเงินน้ำเงินคมชัด',
      particleShape: 'spark',
    },
    special: {
      tier: 'special',
      name: 'Whirlwind Blade',
      pattern: 'vanguard_whirlwind_blade',
      durationSec: 0.88,
      label: 'หมุนตัวฟันพายุดาบสีน้ำเงิน-เงินเป็นวงกว้าง',
      particleShape: 'shard',
    },
    ultimate: {
      tier: 'ultimate',
      name: 'Heaven Splitter',
      pattern: 'vanguard_heaven_splitter',
      durationSec: 2.05,
      label: 'อัญเชิญดาบยักษ์แห่งฟากฟ้าฟันลงพื้นเกิดคลื่นกระแทก',
      particleShape: 'shard',
    },
  },
  mage: {
    jobId: 'mage',
    displayName: 'Arcanist',
    palette: {
      primary: '#a855f7',
      secondary: '#3b82f6',
      tertiary: '#22d3ee',
      dark: '#2e1065',
      glow: '#c084fc',
    },
    basic: {
      tier: 'basic',
      name: 'Arcane Bolt',
      pattern: 'arcanist_arcane_bolt',
      durationSec: 0.42,
      label: 'ยิงลูกพลังเวทอาร์เคนสีม่วงฟ้าพร้อมหางประกาย',
      particleShape: 'ring_mote',
    },
    special: {
      tier: 'special',
      name: 'Crystal Burst',
      pattern: 'arcanist_crystal_burst',
      durationSec: 0.94,
      label: 'เรียกคริสตัลเวทม่วง-ฟ้าปะทุระเบิดรอบเป้าหมาย',
      particleShape: 'shard',
    },
    ultimate: {
      tier: 'ultimate',
      name: 'Astral Tempest',
      pattern: 'arcanist_astral_tempest',
      durationSec: 2.2,
      label: 'เปิดมหาพายุวงเวทดาราจักรม่วง-ครามหมุนวนถล่มพื้นที่',
      particleShape: 'shard',
    },
  },
  archer: {
    jobId: 'archer',
    displayName: 'Windstalker',
    palette: {
      primary: '#10b981',
      secondary: '#86efac',
      tertiary: '#ecfccb',
      dark: '#064e3b',
      glow: '#34d399',
    },
    basic: {
      tier: 'basic',
      name: 'Gale Arrow',
      pattern: 'windstalker_arrow_shot',
      durationSec: 0.36,
      label: 'ยิงศรสายลมมรกตพร้อมเส้นแสงตามวิถี',
      particleShape: 'feather',
    },
    special: {
      tier: 'special',
      name: 'Multi Arrow',
      pattern: 'windstalker_multi_arrow',
      durationSec: 0.86,
      label: 'ยิงธนูสายลมหลายดอกต่อเนื่องเจาะทะลุ',
      particleShape: 'feather',
    },
    ultimate: {
      tier: 'ultimate',
      name: 'Celestial Rain',
      pattern: 'windstalker_celestial_rain',
      durationSec: 2.1,
      label: 'เปิดวงเวทสายลมเหนือฟ้าเรียกฝนธนูมรกตโปรยกระหน่ำ',
      particleShape: 'feather',
    },
  },
  cleric: {
    jobId: 'cleric',
    displayName: 'Luminary',
    palette: {
      primary: '#ffffff',
      secondary: '#f59e0b',
      tertiary: '#fde047',
      dark: '#78350f',
      glow: '#fef08a',
    },
    basic: {
      tier: 'basic',
      name: 'Holy Light',
      pattern: 'luminary_holy_light',
      durationSec: 0.4,
      label: 'ปล่อยแสงศักดิ์สิทธิ์สีขาว-ทองกระทบเป้าหมาย',
      particleShape: 'feather',
    },
    special: {
      tier: 'special',
      name: 'Sacred Heal',
      pattern: 'luminary_sacred_heal',
      durationSec: 0.95,
      label: 'กางวงเวทแสงทองศักดิ์สิทธิ์เยียวยาและชำระล้าง',
      particleShape: 'ring_mote',
    },
    ultimate: {
      tier: 'ultimate',
      name: 'Divine Judgment',
      pattern: 'luminary_divine_judgment',
      durationSec: 2.25,
      label: 'เรียกเสาแสงมหาพิพากษาจากสวรรค์สาดส่องลงพื้น',
      particleShape: 'feather',
    },
  },
  merchant: {
    jobId: 'merchant',
    displayName: 'Goldweaver',
    palette: {
      primary: '#fbbf24',
      secondary: '#fef08a',
      tertiary: '#f97316',
      dark: '#7c2d12',
      glow: '#fcd34d',
    },
    basic: {
      tier: 'basic',
      name: 'Coin Strike',
      pattern: 'goldweaver_coin_strike',
      durationSec: 0.36,
      label: 'โจมตีด้วยเหรียญทองกระแทกประกายสีทองส้ม',
      particleShape: 'coin',
    },
    special: {
      tier: 'special',
      name: 'Golden Explosion',
      pattern: 'goldweaver_golden_explosion',
      durationSec: 0.9,
      label: 'ระเบิดเหรียญทองคำกระจายรอบทิศ',
      particleShape: 'coin',
    },
    ultimate: {
      tier: 'ultimate',
      name: 'Treasure Storm',
      pattern: 'goldweaver_treasure_storm',
      durationSec: 2.2,
      label: 'พายุเหรียญทองคำและหีบสมบัติระเบิดพลังมั่งคั่ง',
      particleShape: 'coin',
    },
  },
  thief: {
    jobId: 'thief',
    displayName: 'Nightveil',
    palette: {
      primary: '#a855f7',
      secondary: '#581c87',
      tertiary: '#e9d5ff',
      dark: '#18181b',
      glow: '#9333ea',
    },
    basic: {
      tier: 'basic',
      name: 'Shadow Dagger',
      pattern: 'nightveil_shadow_dagger',
      durationSec: 0.3,
      label: 'ตวัดมีดเงาสีดำ-ม่วงฉับไวทิ้งรอยเงา',
      particleShape: 'spirit',
    },
    special: {
      tier: 'special',
      name: 'Phantom Dash',
      pattern: 'nightveil_phantom_dash',
      durationSec: 0.8,
      label: 'พุ่งทะลุเป้าหมายทิ้งร่างเงาซ้อนสีม่วงเข้ม',
      particleShape: 'spirit',
    },
    ultimate: {
      tier: 'ultimate',
      name: 'Shadow Execution',
      pattern: 'nightveil_shadow_execution',
      durationSec: 2.0,
      label: 'แยกร่างเงาสี่ทิศพุ่งสะบั้นสังหารพร้อมกัน',
      particleShape: 'spirit',
    },
  },
  kensei: {
    jobId: 'kensei',
    displayName: 'Shinkage',
    palette: {
      primary: '#ef4444',
      secondary: '#ffffff',
      tertiary: '#f9a8d4',
      dark: '#450a0a',
      glow: '#f43f5e',
    },
    basic: {
      tier: 'basic',
      name: 'Katana Slash',
      pattern: 'shinkage_katana_slash',
      durationSec: 0.31,
      label: 'ฟันคาตานะสีแดง-ขาวรวดเร็วเฉียบคม',
      particleShape: 'petal',
    },
    special: {
      tier: 'special',
      name: 'Cross Blade',
      pattern: 'shinkage_cross_blade',
      durationSec: 0.84,
      label: 'ฟันไขว้รูปตัว X สีแดงขาวพร้อมกลีบแสงชมพูอ่อน',
      particleShape: 'petal',
    },
    ultimate: {
      tier: 'ultimate',
      name: 'Thousand Petals',
      pattern: 'shinkage_thousand_petals',
      durationSec: 2.3,
      label: 'ระดมฟันคาตานะนับไม่ถ้วนกลางพายุกลีบดอกไม้เรืองแสง',
      particleShape: 'petal',
    },
  },
  iron_fist: {
    jobId: 'iron_fist',
    displayName: 'Titanfist',
    palette: {
      primary: '#f97316',
      secondary: '#dc2626',
      tertiary: '#fbbf24',
      dark: '#451a03',
      glow: '#fb923c',
    },
    basic: {
      tier: 'basic',
      name: 'Heavy Punch',
      pattern: 'titanfist_heavy_punch',
      durationSec: 0.36,
      label: 'ต่อยหนักอัดคลื่นกระแทกส้มแดงและสะเก็ดไฟ',
      particleShape: 'ember',
    },
    special: {
      tier: 'special',
      name: 'Meteor Fist',
      pattern: 'titanfist_meteor_fist',
      durationSec: 0.92,
      label: 'หมัดเพลิงขนาดใหญ่พุ่งซัดกระแทกเป้าหมาย',
      particleShape: 'ember',
    },
    ultimate: {
      tier: 'ultimate',
      name: 'Earthbreaker',
      pattern: 'titanfist_earthbreaker',
      durationSec: 2.15,
      label: 'กระโดดทุบพื้นจนแผ่นดินแตกร้าวลาวาสีส้มทอง',
      particleShape: 'ember',
    },
  },
  wicked_necromancer: {
    jobId: 'wicked_necromancer',
    displayName: 'Grimcaller',
    palette: {
      primary: '#9333ea',
      secondary: '#1e3a8a',
      tertiary: '#d8b4fe',
      dark: '#0f0b1a',
      glow: '#a855f7',
    },
    basic: {
      tier: 'basic',
      name: 'Dark Soul',
      pattern: 'grimcaller_dark_soul',
      durationSec: 0.44,
      label: 'ยิงลูกพลังวิญญาณม่วงดำจากคัมภีร์มนตร์ดำ',
      particleShape: 'spirit',
    },
    special: {
      tier: 'special',
      name: 'Soul Prison',
      pattern: 'grimcaller_soul_prison',
      durationSec: 0.98,
      label: 'วงเวทคำสาปขังวิญญาณพร้อมเงาแมวดำต้องสาป',
      particleShape: 'spirit',
    },
    ultimate: {
      tier: 'ultimate',
      name: "Reaper's Domain",
      pattern: 'grimcaller_reapers_domain',
      durationSec: 2.35,
      label: 'อัญเชิญวิญญาณมืดและเงาปีศาจโจมตีรอบอาณาเขตอเวจี',
      particleShape: 'spirit',
    },
  },
  the_king: {
    jobId: 'the_king',
    displayName: 'High Sovereign',
    palette: {
      primary: '#fbbf24',
      secondary: '#ffffff',
      tertiary: '#dc2626',
      dark: '#450a0a',
      glow: '#fde047',
    },
    basic: {
      tier: 'basic',
      name: 'Royal Slash',
      pattern: 'sovereign_royal_slash',
      durationSec: 0.4,
      label: 'ฟันดาบราชันย์สีทอง-ขาว-แดงสง่างาม',
      particleShape: 'spark',
    },
    special: {
      tier: 'special',
      name: "King's Authority",
      pattern: 'sovereign_kings_authority',
      durationSec: 0.94,
      label: 'แผ่คลื่นพลังอำนาจราชวงศ์ทองคำรอบกาย',
      particleShape: 'ring_mote',
    },
    ultimate: {
      tier: 'ultimate',
      name: 'Imperial Judgment',
      pattern: 'sovereign_imperial_judgment',
      durationSec: 2.4,
      label: 'อัญเชิญดาบราชันย์ขนาดยักษ์ฟันพิพากษาจากฟากฟ้า',
      particleShape: 'spark',
    },
  },
  sinister: {
    jobId: 'sinister',
    displayName: 'Dreadfang',
    palette: {
      primary: '#dc2626',
      secondary: '#9f1239',
      tertiary: '#fda4af',
      dark: '#09090b',
      glow: '#ef4444',
    },
    basic: {
      tier: 'basic',
      name: 'Demon Claw',
      pattern: 'dreadfang_demon_claw',
      durationSec: 0.32,
      label: 'ฟาดกรงเล็บปีศาจสีดำ-แดงเฉือนเป้าหมาย',
      particleShape: 'ember',
    },
    special: {
      tier: 'special',
      name: 'Abyss Burst',
      pattern: 'dreadfang_abyss_burst',
      durationSec: 0.9,
      label: 'ระเบิดพลังอสูรสีแดงทมิฬกระจายออกรอบจุดปะทะ',
      particleShape: 'shard',
    },
    ultimate: {
      tier: 'ultimate',
      name: 'Infernal Awakening',
      pattern: 'dreadfang_infernal_awakening',
      durationSec: 2.2,
      label: 'ปลดปล่อยออร่าปีศาจชั่วขณะและระเบิดเพลิงทมิฬโลหิต',
      particleShape: 'ember',
    },
  },
  templar: {
    jobId: 'templar',
    displayName: 'Aegis Knight',
    palette: {
      primary: '#ffffff',
      secondary: '#cbd5e1',
      tertiary: '#fbbf24',
      dark: '#1e293b',
      glow: '#fde047',
    },
    basic: {
      tier: 'basic',
      name: 'Holy Shield Strike',
      pattern: 'aegis_shield_strike',
      durationSec: 0.38,
      label: 'กระแทกโล่แสงศักดิ์สิทธิ์สีขาว-เงิน-ทอง',
      particleShape: 'spark',
    },
    special: {
      tier: 'special',
      name: 'Sacred Barrier',
      pattern: 'aegis_sacred_barrier',
      durationSec: 0.96,
      label: 'สร้างโดมโล่แสงหกเหลี่ยมปกป้องและสะท้อนศัตรู',
      particleShape: 'ring_mote',
    },
    ultimate: {
      tier: 'ultimate',
      name: 'Aegis Dominion',
      pattern: 'aegis_dominion',
      durationSec: 2.25,
      label: 'กางวงแหวนปราการศักดิ์สิทธิ์ขนาดใหญ่กระแทกศัตรูรอบทิศ',
      particleShape: 'ring_mote',
    },
  },
  nekobaku: {
    jobId: 'nekobaku',
    displayName: 'Pawchemist',
    palette: {
      primary: '#f472b6',
      secondary: '#38bdf8',
      tertiary: '#a855f7',
      dark: '#3b0764',
      glow: '#f9a8d4',
    },
    basic: {
      tier: 'basic',
      name: 'Potion Shot',
      pattern: 'pawchemist_potion_shot',
      durationSec: 0.38,
      label: 'ยิงพลังงานขวดยาเรืองแสงชมพู-ฟ้า',
      particleShape: 'bubble',
    },
    special: {
      tier: 'special',
      name: 'Alchemy Bomb',
      pattern: 'pawchemist_alchemy_bomb',
      durationSec: 0.94,
      label: 'ปาขวดยาเคมีหลากสีระเบิดฟองปะทุ',
      particleShape: 'bubble',
    },
    ultimate: {
      tier: 'ultimate',
      name: 'Mad Alchemist',
      pattern: 'pawchemist_mad_alchemist',
      durationSec: 2.25,
      label: 'กระหน่ำขวดยาระเบิดลูกโซ่หลากสีสันทั่วสนามรบ',
      particleShape: 'bubble',
    },
  },
  mamushi: {
    jobId: 'mamushi',
    displayName: 'Venomblade',
    palette: {
      primary: '#22c55e',
      secondary: '#9333ea',
      tertiary: '#bef264',
      dark: '#09090b',
      glow: '#4ade80',
    },
    basic: {
      tier: 'basic',
      name: 'Venom Strike',
      pattern: 'venomblade_venom_strike',
      durationSec: 0.32,
      label: 'ฟันมีดพิษสีเขียว-ม่วงพร้อมหยดพิษกระเซ็น',
      particleShape: 'droplet',
    },
    special: {
      tier: 'special',
      name: 'Serpent Fang',
      pattern: 'venomblade_serpent_fang',
      durationSec: 0.9,
      label: 'พุ่งโจมตีด้วยคมเขี้ยวอสรพิษพิษสีมรกต',
      particleShape: 'droplet',
    },
    ultimate: {
      tier: 'ultimate',
      name: 'Toxic Dominion',
      pattern: 'venomblade_toxic_dominion',
      durationSec: 2.25,
      label: 'แผ่บ่อหมอกพิษและเรียกอสรพิษเงายักษ์พุ่งขย้ำ',
      particleShape: 'droplet',
    },
  },
}

export const SKILL_COMBAT_TIER_MAP: Record<string, CombatVfxTier> = {
  // novice
  power: 'special',
  'first-aid': 'special',
  'wayfarer-rush': 'special',
  'wayfarer-crescent': 'ultimate',
  // swordsman
  bash: 'special',
  whirl: 'special',
  'vanguard-pierce': 'special',
  'vanguard-breaker': 'ultimate',
  // mage
  firebolt: 'special',
  'arcane-ward': 'special',
  meteor: 'special',
  'astral-nova': 'ultimate',
  // archer
  double: 'special',
  rain: 'ultimate',
  'wind-snipe': 'special',
  'gale-volley': 'special',
  // cleric
  'grace-heal': 'special',
  'holy-bolt': 'special',
  'radiant-cross': 'special',
  sanctuary: 'ultimate',
  // merchant
  'gold-strike': 'special',
  'cart-strike': 'special',
  'golden-barrier': 'special',
  'prosperity-rain': 'ultimate',
  // thief
  dblatk: 'special',
  backstab: 'special',
  'shadow-mark': 'special',
  'veil-execution': 'ultimate',
  // kensei
  'kensei-flash': 'special',
  iaijutsu: 'special',
  'spirit-thrust': 'special',
  bladestorm: 'ultimate',
  // iron_fist
  'flash-smash': 'special',
  'quake-hammer': 'ultimate',
  'iron-will': 'special',
  'titan-combo': 'special',
  // wicked_necromancer
  'black-cat-hex': 'special',
  'lower-resist': 'special',
  'soul-shroud': 'special',
  'abyss-requiem': 'ultimate',
  // the_king
  'dividend-yield': 'special',
  'candle-storm': 'special',
  'stop-loss': 'special',
  'sovereign-decree': 'ultimate',
  // sinister
  'sinister-cross': 'special',
  'reaper-ambush': 'special',
  'demon-spike': 'special',
  'crimson-eclipse': 'ultimate',
  // templar
  'holy-strike': 'special',
  'aegis-sanctuary': 'special',
  'templar-bastion': 'special',
  'aegis-judgment': 'ultimate',
  // nekobaku
  'fizz-flask': 'special',
  'tar-flask': 'special',
  'neko-barrage': 'ultimate',
  'catnip-tonic': 'special',
  // mamushi
  'viper-fang': 'special',
  'bouncing-shuriken': 'special',
  'venom-overload': 'special',
  'shadow-serpent': 'ultimate',
}

export function getClassCombatVfxProfile(jobId: string): ClassCombatVfxProfile {
  const canonical = normalizeJobId(jobId)
  return CLASS_COMBAT_VFX_PROFILES[canonical] ?? CLASS_COMBAT_VFX_PROFILES.novice
}

export function resolveSkillCombatTier(skillId?: string | null): CombatVfxTier {
  if (!skillId) return 'basic'
  const canonical = normalizeSkillId(skillId)
  return SKILL_COMBAT_TIER_MAP[canonical] ?? SKILL_COMBAT_TIER_MAP[skillId] ?? 'special'
}

export function getCombatVfxDurationMs(jobId: string, skillId?: string | null): number {
  const profile = getClassCombatVfxProfile(jobId)
  const tier = resolveSkillCombatTier(skillId)
  const sec = profile[tier].durationSec
  return Math.round(sec * 1000)
}

export interface EvaluatedVfxPhase {
  phase: CombatVfxPhase
  progress: number
  prepK: number
  castK: number
  attackK: number
  impactK: number
  explosionK: number
  fadeAlpha: number
}

/**
 * Evaluates 6 sequential combat VFX stages across normalized progress [0..1]:
 * Preparation (0..0.14) -> Casting (0.14..0.28) -> Projectile/Attack (0.28..0.56)
 * -> Impact (0.56..0.72) -> Explosion (0.72..0.88) -> Fade Out (0.88..1.0)
 */
export function evaluateCombatVfxPhase(progress: number): EvaluatedVfxPhase {
  const k = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0))
  const clamp = (a: number, b: number) => Math.max(0, Math.min(1, (k - a) / Math.max(0.0001, b - a)))

  let phase: CombatVfxPhase = 'fadeout'
  if (k < 0.14) phase = 'preparation'
  else if (k < 0.28) phase = 'casting'
  else if (k < 0.56) phase = 'attack'
  else if (k < 0.72) phase = 'impact'
  else if (k < 0.88) phase = 'explosion'

  return {
    phase,
    progress: k,
    prepK: clamp(0, 0.18),
    castK: clamp(0.1, 0.34),
    attackK: clamp(0.22, 0.62),
    impactK: clamp(0.45, 0.76),
    explosionK: clamp(0.62, 0.94),
    fadeAlpha: k <= 0.78 ? 1 : k >= 1 ? 0 : Math.max(0, 1 - (k - 0.78) / 0.22),
  }
}

export interface CombatParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  maxLife: number
  color: string
  secondaryColor: string
  shape: CombatParticleShape
  rotation: number
  vRot: number
  gravity: number
}

/**
 * Bounded combat VFX particle pool preventing memory growth or frame drops during AoE bursts.
 */
export class CombatVfxParticlePool {
  readonly maxParticles: number
  private particles: CombatParticle[] = []

  constructor(maxParticles = MAX_COMBAT_PARTICLES) {
    this.maxParticles = Math.max(16, maxParticles)
  }

  count(): number {
    return this.particles.length
  }

  getParticles(): readonly CombatParticle[] {
    return this.particles
  }

  clear(): void {
    this.particles = []
  }

  spawn(p: CombatParticle): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift()
    }
    this.particles.push(p)
  }

  spawnClassBurst(opts: {
    jobId: string
    tier: CombatVfxTier
    x: number
    y: number
    radius?: number
    count?: number
  }): number {
    const profile = getClassCombatVfxProfile(opts.jobId)
    const spec = profile[opts.tier]
    const defaultCount = opts.tier === 'ultimate' ? 22 : opts.tier === 'special' ? 12 : 6
    const n = Math.max(1, Math.min(28, opts.count ?? defaultCount))
    const spread = Math.max(12, opts.radius ?? (opts.tier === 'ultimate' ? 54 : 26))

    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + ((i * 1.618) % 1) * 0.45
      const speed = spread * (0.9 + ((i * 7) % 5) * 0.28)
      const isDropping = spec.particleShape === 'coin' || spec.particleShape === 'droplet'
      const isRising =
        spec.particleShape === 'bubble' ||
        spec.particleShape === 'spirit' ||
        spec.particleShape === 'ember'
      const maxLife =
        opts.tier === 'ultimate'
          ? 0.55 + (i % 4) * 0.14
          : opts.tier === 'special'
            ? 0.42 + (i % 3) * 0.1
            : 0.28 + (i % 3) * 0.06

      this.spawn({
        x: opts.x + Math.cos(ang) * 4,
        y: opts.y + Math.sin(ang) * 2,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed * 0.68 + (isRising ? -24 : isDropping ? -18 : 0),
        size: opts.tier === 'ultimate' ? 2.6 + (i % 3) * 0.8 : 1.9 + (i % 2) * 0.7,
        life: maxLife,
        maxLife,
        color: i % 3 === 0 ? profile.palette.tertiary : i % 2 === 0 ? profile.palette.primary : profile.palette.secondary,
        secondaryColor: profile.palette.tertiary,
        shape: spec.particleShape,
        rotation: ang,
        vRot: (i % 2 === 0 ? 1 : -1) * (3 + (i % 4)),
        gravity: isDropping ? 78 : isRising ? -26 : 16,
      })
    }
    return n
  }

  update(dt: number): void {
    if (dt <= 0) return
    const alive: CombatParticle[] = []
    for (const pt of this.particles) {
      const nextLife = pt.life - dt
      if (nextLife <= 0) continue
      pt.life = nextLife
      pt.vy += pt.gravity * dt
      pt.x += pt.vx * dt
      pt.y += pt.vy * dt
      pt.vx *= Math.max(0.75, 1 - 1.8 * dt)
      pt.rotation += pt.vRot * dt
      alive.push(pt)
    }
    this.particles = alive
  }
}

export const globalCombatParticlePool = new CombatVfxParticlePool(MAX_COMBAT_PARTICLES)

// ── Shared Stylized Fantasy Vector Helpers (Zero Pixel-Art Blocks) ─────────────────

function drawGlowingOrb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  outerColor: string,
  coreColor: string,
  alpha: number,
) {
  if (alpha <= 0.01 || r <= 0.3) return
  ctx.save()
  ctx.globalAlpha = alpha
  const grad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r)
  grad.addColorStop(0, coreColor)
  grad.addColorStop(0.45, outerColor)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawFourPointFlare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  coreColor: string,
  alpha: number,
  rot = 0,
) {
  if (alpha <= 0.01 || r <= 0.4) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  const drawCross = (rad: number, pinch: number) => {
    ctx.beginPath()
    ctx.moveTo(0, -rad)
    ctx.quadraticCurveTo(pinch, -pinch, rad, 0)
    ctx.quadraticCurveTo(pinch, pinch, 0, rad)
    ctx.quadraticCurveTo(-pinch, pinch, -rad, 0)
    ctx.quadraticCurveTo(-pinch, -pinch, 0, -rad)
    ctx.closePath()
    ctx.fill()
  }
  drawCross(r, r * 0.2)
  ctx.fillStyle = coreColor
  drawCross(r * 0.56, r * 0.12)
  ctx.restore()
}

function drawTaperedCrescentSlash(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  thickness: number,
  startAng: number,
  endAng: number,
  outerColor: string,
  innerColor: string,
  alpha: number,
  tiltX = 1,
  tiltY = 0.85,
) {
  if (alpha <= 0.01) return
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(tiltX, tiltY)
  ctx.globalAlpha = alpha
  const steps = 16
  const buildPath = (rad: number, thick: number) => {
    ctx.beginPath()
    for (let i = 0; i <= steps; i++) {
      const f = i / steps
      const ang = startAng + (endAng - startAng) * f
      const rOut = rad + Math.sin(f * Math.PI) * thick * 0.5
      const px = Math.cos(ang) * rOut
      const py = Math.sin(ang) * rOut
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    for (let i = steps; i >= 0; i--) {
      const f = i / steps
      const ang = startAng + (endAng - startAng) * f
      const rIn = rad - Math.sin(f * Math.PI) * thick * 0.48
      ctx.lineTo(Math.cos(ang) * rIn, Math.sin(ang) * rIn)
    }
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = outerColor
  buildPath(radius, thickness)
  ctx.fillStyle = innerColor
  ctx.globalAlpha = alpha * 0.92
  buildPath(radius + thickness * 0.08, thickness * 0.45)
  ctx.restore()
}

function drawPolygonSigil(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  sides: number,
  rot: number,
  stroke: string,
  lw: number,
  alpha: number,
) {
  if (alpha <= 0.01) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = stroke
  ctx.lineWidth = lw
  ctx.beginPath()
  for (let i = 0; i <= sides; i++) {
    const a = rot + (i * Math.PI * 2) / sides
    const px = x + Math.cos(a) * rx
    const py = y + Math.sin(a) * ry
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.restore()
}

function drawFacetedCrystal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rot: number,
  pal: ClassPalette,
  alpha: number,
) {
  if (alpha <= 0.01) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.globalAlpha = alpha
  ctx.fillStyle = pal.primary
  ctx.beginPath()
  ctx.moveTo(0, -h)
  ctx.lineTo(w, -h * 0.15)
  ctx.lineTo(w * 0.65, h * 0.8)
  ctx.lineTo(0, h)
  ctx.lineTo(-w * 0.65, h * 0.8)
  ctx.lineTo(-w, -h * 0.15)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = pal.tertiary
  ctx.globalAlpha = alpha * 0.85
  ctx.beginPath()
  ctx.moveTo(0, -h * 0.92)
  ctx.lineTo(w * 0.35, -h * 0.12)
  ctx.lineTo(0, h * 0.55)
  ctx.lineTo(-w * 0.72, -h * 0.12)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = Math.max(0.8, w * 0.12)
  ctx.stroke()
  ctx.restore()
}

function drawGoldCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  spinAngle: number,
  primary: string,
  highlight: string,
  alpha: number,
) {
  if (alpha <= 0.01) return
  const scaleX = Math.max(0.28, Math.abs(Math.cos(spinAngle)))
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scaleX, 1)
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#b45309'
  ctx.beginPath()
  ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = primary
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = highlight
  ctx.lineWidth = Math.max(0.7, r * 0.25)
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawSakuraPetal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rot: number,
  color: string,
  coreColor: string,
  alpha: number,
) {
  if (alpha <= 0.01) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, -size)
  ctx.bezierCurveTo(size * 0.9, -size * 0.3, size * 0.85, size * 0.7, 0, size * 0.9)
  ctx.bezierCurveTo(-size * 0.85, size * 0.7, -size * 0.9, -size * 0.3, 0, -size)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = coreColor
  ctx.globalAlpha = alpha * 0.7
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 0.25, size * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawEnergySword(
  ctx: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  length: number,
  width: number,
  angle: number,
  bladeColor: string,
  coreColor: string,
  hiltColor: string,
  alpha: number,
) {
  if (alpha <= 0.01) return
  ctx.save()
  ctx.translate(tipX, tipY)
  ctx.rotate(angle)
  ctx.globalAlpha = alpha

  // Outer blade silhouette pointing downward (+Y = tip at 0,0, hilt at -length)
  ctx.fillStyle = bladeColor
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(width * 0.55, -length * 0.16)
  ctx.lineTo(width * 0.45, -length * 0.82)
  ctx.lineTo(-width * 0.45, -length * 0.82)
  ctx.lineTo(-width * 0.55, -length * 0.16)
  ctx.closePath()
  ctx.fill()

  // Inner bright fuller
  ctx.fillStyle = coreColor
  ctx.beginPath()
  ctx.moveTo(0, -length * 0.05)
  ctx.lineTo(width * 0.22, -length * 0.2)
  ctx.lineTo(width * 0.18, -length * 0.8)
  ctx.lineTo(-width * 0.18, -length * 0.8)
  ctx.lineTo(-width * 0.22, -length * 0.2)
  ctx.closePath()
  ctx.fill()

  // Ornate crossguard & pommel
  ctx.fillStyle = hiltColor
  ctx.beginPath()
  ctx.moveTo(-width * 1.15, -length * 0.84)
  ctx.lineTo(0, -length * 0.77)
  ctx.lineTo(width * 1.15, -length * 0.84)
  ctx.lineTo(width * 0.9, -length * 0.9)
  ctx.lineTo(-width * 0.9, -length * 0.9)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(-width * 0.16, -length * 1.02, width * 0.32, length * 0.14)
  ctx.beginPath()
  ctx.arc(0, -length * 1.05, width * 0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawAlchemicalFlask(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rot: number,
  liquidColor: string,
  glowColor: string,
  alpha: number,
) {
  if (alpha <= 0.01) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.globalAlpha = alpha
  drawGlowingOrb(ctx, 0, 0, r * 1.8, glowColor, '#ffffff', alpha * 0.65)
  ctx.fillStyle = liquidColor
  ctx.beginPath()
  ctx.arc(0, r * 0.2, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e0f2fe'
  ctx.fillRect(-r * 0.28, -r * 1.18, r * 0.56, r * 0.55)
  ctx.fillStyle = '#d97706'
  ctx.fillRect(-r * 0.34, -r * 1.4, r * 0.68, r * 0.26)
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = alpha * 0.85
  ctx.beginPath()
  ctx.arc(-r * 0.3, r * 0.05, r * 0.25, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawShadowCloneSilhouette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  flipX: number,
  primary: string,
  dark: string,
  alpha: number,
) {
  if (alpha <= 0.01) return
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(flipX * scale, scale)
  ctx.globalAlpha = alpha
  ctx.fillStyle = dark
  ctx.beginPath()
  ctx.arc(0, -14, 5, 0, Math.PI * 2)
  ctx.moveTo(-6, -9)
  ctx.lineTo(7, -8)
  ctx.lineTo(10, 4)
  ctx.lineTo(4, 14)
  ctx.lineTo(-7, 12)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = primary
  ctx.lineWidth = 1.4
  ctx.stroke()
  // Glowing twin eyes
  ctx.fillStyle = '#e9d5ff'
  ctx.fillRect(1, -15, 2.2, 1.4)
  ctx.restore()
}

// ── 10 Modular VFX Layer Functions ──────────────────────────────────────────

export interface ModularLayerContext {
  profile: ClassCombatVfxProfile
  tier: CombatVfxTier
  phaseInfo: EvaluatedVfxPhase
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  floorY: number
  scale: number
  alpha: number
  disableGlow?: boolean
}

/** Layer 1: AttackFlash — preparation glint / weapon flash at hero hand or staff tip */
export function drawAttackFlashLayer(ctx: CanvasRenderingContext2D, m: ModularLayerContext) {
  const { profile, phaseInfo, sourceX, sourceY, scale, alpha } = m
  if (phaseInfo.prepK <= 0 || phaseInfo.attackK >= 0.75) return
  const pulse = Math.sin(Math.min(1, phaseInfo.prepK) * Math.PI)
  const r = (m.tier === 'ultimate' ? 16 : m.tier === 'special' ? 11 : 7.5) * scale * (0.6 + pulse * 0.55)
  const a = alpha * pulse * (1 - phaseInfo.attackK * 0.65)
  drawGlowingOrb(ctx, sourceX, sourceY, r * 1.45, profile.palette.glow, '#ffffff', a * 0.6)
  drawFourPointFlare(
    ctx,
    sourceX,
    sourceY,
    r,
    profile.palette.primary,
    profile.palette.tertiary,
    a,
    phaseInfo.progress * 3.5,
  )
}

/** Layer 2: WeaponTrail — directional sweeping crescent arcs & slash ribbons */
export function drawWeaponTrailLayer(
  ctx: CanvasRenderingContext2D,
  m: ModularLayerContext,
  opts?: { x?: number; y?: number; radius?: number; angleOffset?: number; count?: number },
) {
  const { profile, phaseInfo, targetX, targetY, scale, alpha } = m
  const trailK = m.tier === 'basic' ? Math.min(1, phaseInfo.progress * 1.35) : phaseInfo.attackK
  if (trailK <= 0.02 || phaseInfo.fadeAlpha <= 0.02) return
  const cx = opts?.x ?? targetX - 4 * scale
  const cy = opts?.y ?? targetY
  const baseR = (opts?.radius ?? (m.tier === 'ultimate' ? 24 : 16)) * scale
  const count = opts?.count ?? (m.tier === 'basic' ? 1 : 2)
  for (let i = 0; i < count; i++) {
    const startA = -1.15 + trailK * 0.55 + (opts?.angleOffset ?? 0) + i * 0.65
    const endA = 1.05 + trailK * 0.55 + (opts?.angleOffset ?? 0) + i * 0.65
    drawTaperedCrescentSlash(
      ctx,
      cx,
      cy,
      baseR * (1 + i * 0.22 + trailK * 0.18),
      (4.2 - i * 1.1) * scale,
      startA,
      endA,
      i === 0 ? profile.palette.primary : profile.palette.secondary,
      profile.palette.tertiary,
      alpha * phaseInfo.fadeAlpha * (1 - i * 0.25),
    )
  }
}

/** Layer 3: Projectile — styled moving projectile with ribbon/comet wake */
export function drawProjectileLayer(
  ctx: CanvasRenderingContext2D,
  m: ModularLayerContext,
  flightFrac?: number,
) {
  const { profile, phaseInfo, sourceX, sourceY, targetX, targetY, scale, alpha } = m
  const k = flightFrac ?? Math.min(1, phaseInfo.attackK * 1.35)
  if (k <= 0 || k >= 1.02) return
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const angle = Math.atan2(dy, dx)
  const px = sourceX + dx * k
  const py = sourceY + dy * k - (profile.jobId === 'nekobaku' ? Math.sin(k * Math.PI) * 18 * scale : 0)

  ctx.save()
  ctx.globalAlpha = alpha * phaseInfo.fadeAlpha
  if (profile.jobId === 'archer') {
    // Sleek emerald gale arrow + wind stream lines
    ctx.translate(px, py)
    ctx.rotate(angle)
    ctx.strokeStyle = profile.palette.secondary
    ctx.lineWidth = 2.2 * scale
    ctx.beginPath()
    ctx.moveTo(-22 * scale, 0)
    ctx.lineTo(6 * scale, 0)
    ctx.stroke()
    ctx.fillStyle = profile.palette.tertiary
    ctx.beginPath()
    ctx.moveTo(11 * scale, 0)
    ctx.lineTo(3 * scale, -3.2 * scale)
    ctx.lineTo(5 * scale, 0)
    ctx.lineTo(3 * scale, 3.2 * scale)
    ctx.closePath()
    ctx.fill()
    // Feather fletching
    ctx.strokeStyle = profile.palette.primary
    ctx.lineWidth = 1.4 * scale
    ctx.beginPath()
    ctx.moveTo(-14 * scale, 0)
    ctx.lineTo(-19 * scale, -3 * scale)
    ctx.moveTo(-14 * scale, 0)
    ctx.lineTo(-19 * scale, 3 * scale)
    ctx.stroke()
  } else if (profile.jobId === 'nekobaku') {
    drawAlchemicalFlask(
      ctx,
      px,
      py,
      4.5 * scale,
      k * 10,
      profile.palette.primary,
      profile.palette.secondary,
      alpha,
    )
  } else if (profile.jobId === 'merchant') {
    drawGoldCoin(ctx, px, py, 4.5 * scale, k * 14, profile.palette.primary, profile.palette.secondary, alpha)
  } else if (profile.jobId === 'wicked_necromancer') {
    drawGlowingOrb(ctx, px, py, 9 * scale, profile.palette.primary, profile.palette.tertiary, alpha * 0.9)
    drawGlowingOrb(ctx, px - Math.cos(angle) * 7 * scale, py - Math.sin(angle) * 7 * scale, 6 * scale, profile.palette.secondary, profile.palette.primary, alpha * 0.7)
  } else {
    // Arcane / Holy / Royal Luminous Bolt with gradient comet tail
    drawGlowingOrb(ctx, px, py, 8.5 * scale, profile.palette.primary, '#ffffff', alpha)
    ctx.strokeStyle = profile.palette.secondary
    ctx.lineWidth = 2.6 * scale
    ctx.beginPath()
    ctx.moveTo(px - Math.cos(angle) * 18 * scale, py - Math.sin(angle) * 18 * scale)
    ctx.lineTo(px, py)
    ctx.stroke()
  }
  ctx.restore()
}

/** Layer 4: MagicCircle — multi-ring rotating geometric spell & sanctuary circles */
export function drawMagicCircleLayer(
  ctx: CanvasRenderingContext2D,
  m: ModularLayerContext,
  opts?: { x?: number; y?: number; radius?: number; sides?: number; innerSides?: number },
) {
  const { profile, phaseInfo, targetX, floorY, scale, alpha } = m
  const appear = Math.min(1, phaseInfo.castK * 1.4)
  if (appear <= 0.01) return
  const cx = opts?.x ?? targetX
  const cy = opts?.y ?? floorY
  const rx = (opts?.radius ?? (m.tier === 'ultimate' ? 30 : 20)) * scale * (0.55 + appear * 0.45)
  const ry = rx * 0.38
  const spin = phaseInfo.progress * 2.8
  const a = alpha * phaseInfo.fadeAlpha * appear

  ctx.save()
  ctx.globalAlpha = a
  ctx.strokeStyle = profile.palette.primary
  ctx.lineWidth = 1.8 * scale
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = profile.palette.secondary
  ctx.lineWidth = 1.2 * scale
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2)
  ctx.stroke()

  drawPolygonSigil(ctx, cx, cy, rx * 0.92, ry * 0.92, opts?.sides ?? 6, spin, profile.palette.tertiary, 1.1 * scale, a * 0.85)
  if (opts?.innerSides) {
    drawPolygonSigil(ctx, cx, cy, rx * 0.88, ry * 0.88, opts.innerSides, -spin * 1.2, profile.palette.secondary, 1.0 * scale, a * 0.75)
  }
  ctx.restore()
}

/** Layer 5: Impact — sharp crisp impact cross-flares, shock rings, and strike flashes */
export function drawImpactLayer(
  ctx: CanvasRenderingContext2D,
  m: ModularLayerContext,
  opts?: { x?: number; y?: number; radius?: number },
) {
  const { profile, phaseInfo, targetX, targetY, scale, alpha } = m
  const imp = m.tier === 'basic' ? Math.min(1, phaseInfo.progress * 1.8) : phaseInfo.impactK
  if (imp <= 0.02) return
  const cx = opts?.x ?? targetX
  const cy = opts?.y ?? targetY
  const r = (opts?.radius ?? (m.tier === 'ultimate' ? 26 : 16)) * scale
  const pop = Math.sin(Math.min(1, imp) * Math.PI)
  const a = alpha * phaseInfo.fadeAlpha * (0.4 + pop * 0.6)

  drawGlowingOrb(ctx, cx, cy, r * (0.6 + imp * 0.55), profile.palette.glow, '#ffffff', a * 0.72)
  drawFourPointFlare(ctx, cx, cy, r * (0.5 + pop * 0.75), profile.palette.primary, '#ffffff', a, imp * 1.2)
  ctx.save()
  ctx.globalAlpha = a * 0.85
  ctx.strokeStyle = profile.palette.secondary
  ctx.lineWidth = 1.6 * scale
  ctx.beginPath()
  ctx.arc(cx, cy, r * (0.35 + imp * 0.8), 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

/** Layer 6: Explosion — expanding layered spheres, shockwaves, and radial energy rings */
export function drawExplosionLayer(
  ctx: CanvasRenderingContext2D,
  m: ModularLayerContext,
  opts?: { x?: number; y?: number; radius?: number },
) {
  const { profile, phaseInfo, targetX, targetY, scale, alpha } = m
  const exp = phaseInfo.explosionK
  if (exp <= 0.01) return
  const cx = opts?.x ?? targetX
  const cy = opts?.y ?? targetY
  const maxR = (opts?.radius ?? (m.tier === 'ultimate' ? 36 : 24)) * scale
  const a = alpha * Math.max(0, 1 - exp * 0.82) * phaseInfo.fadeAlpha

  drawGlowingOrb(ctx, cx, cy, maxR * (0.35 + exp * 0.85), profile.palette.primary, profile.palette.tertiary, a * 0.9)
  ctx.save()
  ctx.globalAlpha = a
  ctx.strokeStyle = profile.palette.secondary
  ctx.lineWidth = (2.8 - exp * 1.6) * scale
  ctx.beginPath()
  ctx.arc(cx, cy, maxR * (0.28 + exp * 0.85), 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

/** Layer 7: Particles — deterministic fantasy particles framing the effect + pooled world particles */
export function drawDeterministicClassParticles(
  ctx: CanvasRenderingContext2D,
  m: ModularLayerContext,
  opts?: { count?: number; cx?: number; cy?: number; radius?: number },
) {
  const { profile, phaseInfo, targetX, targetY, floorY, scale, alpha } = m
  const k = m.tier === 'basic' ? phaseInfo.progress : Math.max(phaseInfo.attackK, phaseInfo.explosionK)
  if (k <= 0.02) return
  const count = opts?.count ?? (m.tier === 'ultimate' ? 14 : m.tier === 'special' ? 9 : 5)
  const cx = opts?.cx ?? targetX
  const cy = opts?.cy ?? targetY
  const spread = (opts?.radius ?? (m.tier === 'ultimate' ? 32 : 18)) * scale
  const shape = profile[m.tier].particleShape
  const a = alpha * phaseInfo.fadeAlpha

  for (let i = 0; i < count; i++) {
    const seedAng = (i * Math.PI * 2) / count + k * (i % 2 === 0 ? 1.8 : -1.3)
    const dist = spread * (0.25 + k * (0.65 + (i % 3) * 0.22))
    const px = cx + Math.cos(seedAng) * dist
    const py =
      shape === 'bubble' || shape === 'spirit'
        ? floorY - ((k * 34 + i * 7) % 34) * scale
        : shape === 'coin'
          ? cy - Math.sin(Math.min(1, k) * Math.PI) * (10 + (i % 4) * 5) * scale + Math.sin(seedAng) * dist * 0.4
          : cy + Math.sin(seedAng) * dist * 0.65
    const col = i % 3 === 0 ? profile.palette.tertiary : i % 2 === 0 ? profile.palette.primary : profile.palette.secondary

    if (shape === 'coin') {
      drawGoldCoin(ctx, px, py, 2.5 * scale, k * 10 + i, profile.palette.primary, profile.palette.secondary, a)
    } else if (shape === 'petal') {
      drawSakuraPetal(ctx, px, py, 3.2 * scale, seedAng + k * 4, profile.palette.tertiary, '#ffffff', a)
    } else if (shape === 'bubble') {
      ctx.save()
      ctx.globalAlpha = a * 0.85
      ctx.strokeStyle = col
      ctx.lineWidth = 1.1 * scale
      ctx.beginPath()
      ctx.arc(px, py, (2.2 + (i % 2) * 1.1) * scale, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(px - 0.6 * scale, py - 0.6 * scale, 0.7 * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    } else if (shape === 'shard') {
      drawFacetedCrystal(ctx, px, py, 2.1 * scale, 3.8 * scale, seedAng, profile.palette, a)
    } else if (shape === 'droplet') {
      ctx.save()
      ctx.globalAlpha = a
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.ellipse(px, py, 1.8 * scale, 2.8 * scale, seedAng, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    } else {
      drawFourPointFlare(ctx, px, py, 2.8 * scale, col, '#ffffff', a, seedAng)
    }
  }
}

export function renderCombatParticlePool(
  ctx: CanvasRenderingContext2D,
  pool: CombatVfxParticlePool,
  disableGlow = false,
) {
  const list = pool.getParticles()
  if (list.length === 0) return
  ctx.save()
  for (const pt of list) {
    const a = Math.max(0, Math.min(1, pt.life / pt.maxLife))
    if (a <= 0.02) continue
    if (!disableGlow) {
      ctx.shadowColor = pt.color
      ctx.shadowBlur = 4
    }
    if (pt.shape === 'coin') {
      drawGoldCoin(ctx, pt.x, pt.y, pt.size, pt.rotation, pt.color, pt.secondaryColor, a)
    } else if (pt.shape === 'petal') {
      drawSakuraPetal(ctx, pt.x, pt.y, pt.size * 1.25, pt.rotation, pt.color, '#ffffff', a)
    } else if (pt.shape === 'bubble') {
      ctx.globalAlpha = a * 0.85
      ctx.strokeStyle = pt.color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2)
      ctx.stroke()
    } else if (pt.shape === 'droplet') {
      ctx.globalAlpha = a
      ctx.fillStyle = pt.color
      ctx.beginPath()
      ctx.ellipse(pt.x, pt.y, pt.size * 0.65, pt.size * 1.1, pt.rotation, 0, Math.PI * 2)
      ctx.fill()
    } else {
      drawFourPointFlare(ctx, pt.x, pt.y, pt.size * 1.15, pt.color, pt.secondaryColor, a, pt.rotation)
    }
  }
  ctx.restore()
}

/** Layer 8: Aura — brief caster transformation/channeling aura during casting */
export function drawCastingAuraLayer(ctx: CanvasRenderingContext2D, m: ModularLayerContext) {
  const { profile, phaseInfo, sourceX, floorY, scale, alpha } = m
  const castPresence = Math.sin(Math.min(1, phaseInfo.progress * 1.45) * Math.PI)
  if (castPresence <= 0.02) return
  const a = alpha * castPresence * 0.85

  if (profile.jobId === 'sinister' && m.tier === 'ultimate') {
    // Infernal Awakening — brief translucent demon wing aura behind Dreadfang
    ctx.save()
    ctx.globalAlpha = a
    for (const side of [-1, 1] as const) {
      ctx.fillStyle = profile.palette.dark
      ctx.strokeStyle = profile.palette.primary
      ctx.lineWidth = 1.6 * scale
      ctx.beginPath()
      ctx.moveTo(sourceX, floorY - 22 * scale)
      ctx.quadraticCurveTo(sourceX + side * 26 * scale, floorY - 46 * scale, sourceX + side * 34 * scale, floorY - 14 * scale)
      ctx.quadraticCurveTo(sourceX + side * 18 * scale, floorY - 18 * scale, sourceX, floorY - 14 * scale)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
  } else {
    drawGlowingOrb(ctx, sourceX, floorY - 16 * scale, 18 * scale, profile.palette.glow, profile.palette.tertiary, a * 0.55)
  }
}

/** Layer 9: GroundEffect — cracks, poison pools, barriers & shock rings anchored on floorY */
export function drawGroundEffectLayer(
  ctx: CanvasRenderingContext2D,
  m: ModularLayerContext,
  variant: 'shockwave' | 'fissure' | 'toxic_pool' | 'holy_seal' | 'cursed_prison',
) {
  const { profile, phaseInfo, targetX, floorY, scale, alpha } = m
  const k = Math.max(phaseInfo.impactK, phaseInfo.explosionK)
  if (k <= 0.01) return
  const a = alpha * phaseInfo.fadeAlpha

  ctx.save()
  ctx.globalAlpha = a
  if (variant === 'fissure') {
    // Titanfist Earthbreaker radiating glowing magma ground cracks
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI) / 3 + 0.2
      const len = (8 + k * 24) * scale
      ctx.strokeStyle = i % 2 === 0 ? profile.palette.primary : profile.palette.tertiary
      ctx.lineWidth = 2.4 * scale
      ctx.beginPath()
      ctx.moveTo(targetX, floorY)
      const midX = targetX + Math.cos(ang) * len * 0.52 + Math.sin(i) * 3 * scale
      const midY = floorY + Math.sin(ang) * len * 0.22
      const endX = targetX + Math.cos(ang) * len
      const endY = floorY + Math.sin(ang) * len * 0.36
      ctx.lineTo(midX, midY)
      ctx.lineTo(endX, endY)
      ctx.stroke()
    }
  } else if (variant === 'toxic_pool') {
    const grad = ctx.createRadialGradient(targetX, floorY, 2 * scale, targetX, floorY, 26 * scale)
    grad.addColorStop(0, profile.palette.primary)
    grad.addColorStop(0.65, profile.palette.secondary)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = a * 0.72
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(targetX, floorY, (12 + k * 18) * scale, (4.5 + k * 6.5) * scale, 0, 0, Math.PI * 2)
    ctx.fill()
  } else if (variant === 'cursed_prison') {
    drawMagicCircleLayer(ctx, m, { radius: 24, sides: 5, innerSides: 3 })
    for (const side of [-1, 1] as const) {
      ctx.strokeStyle = profile.palette.tertiary
      ctx.lineWidth = 1.6 * scale
      ctx.beginPath()
      ctx.moveTo(targetX + side * 16 * scale, floorY)
      ctx.lineTo(targetX + side * 8 * scale, floorY - 26 * scale * Math.min(1, k * 1.4))
      ctx.stroke()
    }
  } else {
    ctx.strokeStyle = variant === 'holy_seal' ? profile.palette.tertiary : profile.palette.primary
    ctx.lineWidth = 2 * scale
    ctx.beginPath()
    ctx.ellipse(targetX, floorY, (10 + k * 22) * scale, (3.8 + k * 7.5) * scale, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

/** Layer 10: UltimateEffect — distinct monumental centerpiece per class */
export function drawUltimateEffectLayer(ctx: CanvasRenderingContext2D, m: ModularLayerContext) {
  const { profile, phaseInfo, sourceX, targetX, targetY, floorY, scale, alpha } = m
  const k = phaseInfo.progress
  const a = alpha * phaseInfo.fadeAlpha

  switch (profile.jobId) {
    case 'novice': {
      // Rising Courage — radial silver-sky hero shockwave & cresting pillar
      drawMagicCircleLayer(ctx, m, { x: sourceX, y: floorY, radius: 26, sides: 4, innerSides: 4 })
      drawExplosionLayer(ctx, m, { x: targetX, y: targetY, radius: 34 })
      drawTaperedCrescentSlash(ctx, targetX, targetY, (16 + k * 16) * scale, 5 * scale, -Math.PI, Math.PI * 0.35, profile.palette.secondary, '#ffffff', a)
      break
    }
    case 'swordsman': {
      // Heaven Splitter — giant luminous royal-blue greatsword descending from heavens
      drawMagicCircleLayer(ctx, m, { radius: 28, sides: 6 })
      const drop = Math.min(1, Math.max(0, (k - 0.16) / 0.42))
      const tipY = floorY - (1 - drop) * 56 * scale
      drawEnergySword(
        ctx,
        targetX,
        tipY,
        44 * scale,
        10 * scale,
        0,
        profile.palette.tertiary,
        profile.palette.tertiary === '#2563eb' ? '#ffffff' : profile.palette.primary,
        profile.palette.primary,
        a,
      )
      if (drop >= 0.9) {
        drawGroundEffectLayer(ctx, m, 'shockwave')
        drawExplosionLayer(ctx, m, { radius: 36 })
      }
      break
    }
    case 'mage': {
      // Astral Tempest — rotating multi-ring cosmic magic circle + violet-cyan crystal vortex
      drawMagicCircleLayer(ctx, m, { radius: 32, sides: 8, innerSides: 4 })
      for (let i = 0; i < 6; i++) {
        const ang = k * 7 + (i * Math.PI) / 3
        const rx = Math.cos(ang) * (10 + phaseInfo.attackK * 22) * scale
        const ry = Math.sin(ang) * (5 + phaseInfo.attackK * 9) * scale - (i % 3) * 8 * scale
        drawFacetedCrystal(ctx, targetX + rx, targetY + ry, 3.2 * scale, 6 * scale, ang * 0.5, profile.palette, a)
      }
      drawExplosionLayer(ctx, m, { radius: 34 })
      break
    }
    case 'archer': {
      // Celestial Rain — high sky magic halo + showering emerald-light arrows
      drawMagicCircleLayer(ctx, m, { x: targetX, y: targetY - 34 * scale, radius: 26, sides: 6 })
      for (let i = 0; i < 10; i++) {
        const localK = (k * 1.9 + i * 0.13) % 1
        const ax = targetX + (i - 4.5) * 5.6 * scale
        const ay = targetY - 36 * scale + localK * 48 * scale
        ctx.save()
        ctx.globalAlpha = a * 0.92
        ctx.strokeStyle = i % 2 === 0 ? profile.palette.primary : profile.palette.secondary
        ctx.lineWidth = 2.1 * scale
        ctx.beginPath()
        ctx.moveTo(ax - 3 * scale, ay - 13 * scale)
        ctx.lineTo(ax, ay)
        ctx.stroke()
        drawFourPointFlare(ctx, ax, ay, 2.2 * scale, profile.palette.tertiary, '#ffffff', a)
        ctx.restore()
      }
      drawGroundEffectLayer(ctx, m, 'shockwave')
      break
    }
    case 'cleric': {
      // Divine Judgment — radiant cathedral pillar of light descending onto golden sanctuary ring
      drawMagicCircleLayer(ctx, m, { radius: 30, sides: 8, innerSides: 4 })
      const beamW = (14 + Math.sin(k * Math.PI) * 8) * scale
      const grad = ctx.createLinearGradient(targetX - beamW, targetY, targetX + beamW, targetY)
      grad.addColorStop(0, 'rgba(255,255,255,0)')
      grad.addColorStop(0.3, profile.palette.secondary)
      grad.addColorStop(0.5, '#ffffff')
      grad.addColorStop(0.7, profile.palette.tertiary)
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.save()
      ctx.globalAlpha = a * 0.85
      ctx.fillStyle = grad
      ctx.fillRect(targetX - beamW, targetY - 56 * scale, beamW * 2, floorY - targetY + 58 * scale)
      ctx.restore()
      drawImpactLayer(ctx, m, { radius: 24 })
      break
    }
    case 'merchant': {
      // Treasure Storm — ornate chest opens & erupts golden coin storm
      const openK = Math.min(1, k * 2.1)
      ctx.save()
      ctx.globalAlpha = a
      // Ornate chest silhouette
      ctx.fillStyle = '#92400e'
      ctx.fillRect(targetX - 9 * scale, floorY - 12 * scale, 18 * scale, 12 * scale)
      ctx.fillStyle = profile.palette.primary
      ctx.fillRect(targetX - 10 * scale, floorY - (14 + openK * 5) * scale, 20 * scale, 5 * scale)
      ctx.restore()
      drawExplosionLayer(ctx, m, { radius: 30 })
      drawDeterministicClassParticles(ctx, m, { count: 16, radius: 36 })
      break
    }
    case 'thief': {
      // Shadow Execution — deep purple domain + 4 shadow clones executing inward slashes
      drawMagicCircleLayer(ctx, m, { radius: 28, sides: 5 })
      const cloneAngles = [-Math.PI * 0.78, -Math.PI * 0.22, Math.PI * 0.22, Math.PI * 0.78]
      cloneAngles.forEach((ang, idx) => {
        const dash = Math.sin(Math.min(1, k * 1.45) * Math.PI)
        const dist = (28 - dash * 16) * scale
        const cx = targetX + Math.cos(ang) * dist
        const cy = targetY + Math.sin(ang) * dist * 0.55
        drawShadowCloneSilhouette(ctx, cx, cy, 0.85 * scale, cx < targetX ? 1 : -1, profile.palette.primary, profile.palette.dark, a * 0.88)
        if (k > 0.32) {
          drawTaperedCrescentSlash(ctx, targetX, targetY, (12 + idx * 3) * scale, 3.2 * scale, ang - 0.5, ang + 0.8, profile.palette.primary, '#ffffff', a)
        }
      })
      break
    }
    case 'kensei': {
      // Thousand Petals — multi-angle razor flash cuts + glowing pink-white petals
      const slashSpecs = [
        [-22, -16, 22, 16],
        [-24, 14, 24, -14],
        [-26, 0, 26, -4],
        [0, -22, -4, 22],
        [-16, -20, 18, 20],
      ]
      slashSpecs.forEach(([x1, y1, x2, y2], idx) => {
        const local = Math.max(0, Math.min(1, k * 2.2 - idx * 0.14))
        if (local <= 0) return
        ctx.save()
        ctx.globalAlpha = a * (1 - local * 0.35)
        ctx.strokeStyle = idx % 2 === 0 ? profile.palette.primary : '#ffffff'
        ctx.lineWidth = (3.4 - idx * 0.25) * scale
        ctx.beginPath()
        ctx.moveTo(targetX + x1 * scale, targetY + y1 * scale)
        ctx.lineTo(targetX + (x1 + (x2 - x1) * local) * scale, targetY + (y1 + (y2 - y1) * local) * scale)
        ctx.stroke()
        ctx.restore()
      })
      drawDeterministicClassParticles(ctx, m, { count: 16, radius: 34 })
      break
    }
    case 'iron_fist': {
      // Earthbreaker — colossal blazing meteor fist slam + glowing magma fissures
      const slamK = Math.min(1, k * 2.1)
      const fy = floorY - (1 - slamK) * 44 * scale
      drawGlowingOrb(ctx, targetX, fy, 16 * scale, profile.palette.primary, profile.palette.tertiary, a * 0.9)
      if (slamK >= 0.75) {
        drawGroundEffectLayer(ctx, m, 'fissure')
        drawExplosionLayer(ctx, m, { radius: 34 })
      }
      break
    }
    case 'wicked_necromancer': {
      // Reaper's Domain — abyssal grimoire seal + swirling spectral spirits & scythe crescents
      drawMagicCircleLayer(ctx, m, { radius: 32, sides: 6, innerSides: 3 })
      for (let i = 0; i < 4; i++) {
        const ang = k * 5.2 + (i * Math.PI) / 2
        const sx = targetX + Math.cos(ang) * 22 * scale
        const sy = targetY + Math.sin(ang) * 10 * scale - 6 * scale
        drawGlowingOrb(ctx, sx, sy, 8 * scale, profile.palette.primary, profile.palette.tertiary, a)
        drawTaperedCrescentSlash(ctx, sx, sy, 10 * scale, 3 * scale, ang, ang + 1.8, profile.palette.secondary, profile.palette.tertiary, a)
      }
      drawGroundEffectLayer(ctx, m, 'cursed_prison')
      break
    }
    case 'the_king': {
      // Imperial Judgment — crown halo above + descending giant royal gold-crimson greatsword
      drawMagicCircleLayer(ctx, m, { radius: 32, sides: 8 })
      drawPolygonSigil(ctx, targetX, targetY - 46 * scale, 14 * scale, 5 * scale, 6, k * 2, profile.palette.primary, 1.8 * scale, a)
      const drop = Math.min(1, Math.max(0, (k - 0.14) / 0.44))
      drawEnergySword(
        ctx,
        targetX,
        floorY - (1 - drop) * 56 * scale,
        48 * scale,
        12 * scale,
        0,
        profile.palette.primary,
        '#ffffff',
        profile.palette.tertiary,
        a,
      )
      drawExplosionLayer(ctx, m, { radius: 36 })
      break
    }
    case 'sinister': {
      // Infernal Awakening — demon wing aura + abyssal pentagram + dark-crimson fire wave
      drawCastingAuraLayer(ctx, m)
      drawMagicCircleLayer(ctx, m, { radius: 30, sides: 5 })
      drawExplosionLayer(ctx, m, { radius: 34 })
      for (const tilt of [-0.55, 0, 0.55]) {
        drawTaperedCrescentSlash(ctx, targetX, targetY, (16 + k * 14) * scale, 4.2 * scale, tilt - 1.1, tilt + 1.1, profile.palette.primary, profile.palette.tertiary, a)
      }
      break
    }
    case 'templar': {
      // Aegis Dominion — monumental golden-white hexagonal sanctuary ring + crest slam
      drawMagicCircleLayer(ctx, m, { radius: 34, sides: 6, innerSides: 6 })
      ctx.save()
      ctx.globalAlpha = a * 0.72
      ctx.strokeStyle = profile.palette.tertiary
      ctx.lineWidth = 2.4 * scale
      ctx.beginPath()
      ctx.arc(targetX, targetY, (14 + k * 22) * scale, Math.PI, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
      drawImpactLayer(ctx, m, { radius: 26 })
      break
    }
    case 'nekobaku': {
      // Mad Alchemist — multi-flask volley triggering chained colorful explosions
      for (let i = 0; i < 4; i++) {
        const localK = Math.max(0, Math.min(1, k * 1.85 - i * 0.18))
        const tx = targetX + (i - 1.5) * 11 * scale
        const ty = targetY + (i % 2 === 0 ? -4 : 5) * scale
        if (localK < 0.45) {
          const fl = localK / 0.45
          const fx = sourceX + (tx - sourceX) * fl
          const fy = m.sourceY + (ty - m.sourceY) * fl - Math.sin(fl * Math.PI) * 26 * scale
          drawAlchemicalFlask(
            ctx,
            fx,
            fy,
            3.8 * scale,
            fl * 12,
            i % 2 === 0 ? profile.palette.primary : profile.palette.secondary,
            profile.palette.tertiary,
            a,
          )
        } else {
          const bk = (localK - 0.45) / 0.55
          const col = i === 0 ? profile.palette.primary : i === 1 ? profile.palette.secondary : profile.palette.tertiary
          drawGlowingOrb(ctx, tx, ty, (8 + bk * 16) * scale, col, '#ffffff', a * (1 - bk * 0.75))
        }
      }
      drawDeterministicClassParticles(ctx, m, { count: 16, radius: 34 })
      break
    }
    case 'mamushi': {
      // Toxic Dominion — venom puddle + coiling shadow serpent lunging across target
      drawGroundEffectLayer(ctx, m, 'toxic_pool')
      const serpentProgress = Math.min(1, k * 1.4)
      ctx.save()
      ctx.globalAlpha = a * 0.92
      ctx.strokeStyle = profile.palette.secondary
      ctx.lineWidth = 6 * scale
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (let s = 0; s <= 14; s++) {
        const f = (s / 14) * serpentProgress
        const sx = sourceX + (targetX + 16 * scale - sourceX) * f
        const sy = targetY + Math.sin(f * Math.PI * 3.2 + k * 6) * 11 * scale
        if (s === 0) ctx.moveTo(sx, sy)
        else ctx.lineTo(sx, sy)
      }
      ctx.stroke()
      ctx.strokeStyle = profile.palette.primary
      ctx.lineWidth = 2.8 * scale
      ctx.stroke()
      ctx.restore()
      drawDeterministicClassParticles(ctx, m, { count: 14, radius: 30 })
      break
    }
  }
}

// ── Master 15-Class Unified Renderer ────────────────────────────────────────

export interface ClassCombatVfxDrawOptions {
  jobId: string
  tier: CombatVfxTier
  skillId?: string | null
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  floorY: number
  scale: number
  progress: number
  alpha: number
  disableGlow?: boolean
}

export function drawClassCombatVfx(
  ctx: CanvasRenderingContext2D,
  opts: ClassCombatVfxDrawOptions,
): void {
  const profile = getClassCombatVfxProfile(opts.jobId)
  const phaseInfo = evaluateCombatVfxPhase(opts.progress)
  const m: ModularLayerContext = {
    profile,
    tier: opts.tier,
    phaseInfo,
    sourceX: opts.sourceX,
    sourceY: opts.sourceY,
    targetX: opts.targetX,
    targetY: opts.targetY,
    floorY: opts.floorY,
    scale: opts.scale,
    alpha: opts.alpha,
    disableGlow: opts.disableGlow,
  }

  ctx.save()
  if (!opts.disableGlow) {
    ctx.shadowColor = profile.palette.glow
    ctx.shadowBlur = Math.max(4, (opts.tier === 'ultimate' ? 10 : 6) * opts.scale)
  }

  // Phase 1 & 2: Preparation & Casting
  drawAttackFlashLayer(ctx, m)
  if (opts.tier !== 'basic') {
    drawCastingAuraLayer(ctx, m)
  }

  // Tier dispatch
  if (opts.tier === 'basic') {
    const isProjectileJob =
      profile.jobId === 'mage' ||
      profile.jobId === 'archer' ||
      profile.jobId === 'cleric' ||
      profile.jobId === 'wicked_necromancer' ||
      profile.jobId === 'nekobaku'
    if (isProjectileJob) {
      const flight = Math.min(1, phaseInfo.progress * 1.45)
      if (flight < 0.96) drawProjectileLayer(ctx, m, flight)
      if (phaseInfo.progress > 0.42) drawImpactLayer(ctx, m, { radius: 13 })
    } else if (profile.jobId === 'sinister') {
      // 3-streak demon claw tear
      for (const off of [-6, 0, 6]) {
        drawWeaponTrailLayer(ctx, m, { y: opts.targetY + off * opts.scale, radius: 13, angleOffset: 0.35, count: 1 })
      }
      drawImpactLayer(ctx, m, { radius: 12 })
    } else if (profile.jobId === 'thief' || profile.jobId === 'mamushi') {
      drawWeaponTrailLayer(ctx, m, { radius: 14, angleOffset: -0.4, count: 2 })
      drawImpactLayer(ctx, m, { radius: 12 })
    } else if (profile.jobId === 'iron_fist' || profile.jobId === 'templar') {
      drawImpactLayer(ctx, m, { radius: 16 })
      drawGroundEffectLayer(ctx, m, 'shockwave')
    } else {
      drawWeaponTrailLayer(ctx, m, { radius: 16, count: 1 })
      drawImpactLayer(ctx, m, { radius: 12 })
    }
    drawDeterministicClassParticles(ctx, m, { count: 5, radius: 16 })
  } else if (opts.tier === 'special') {
    switch (profile.jobId) {
      case 'novice':
        drawWeaponTrailLayer(ctx, m, { radius: 18, count: 2 })
        drawProjectileLayer(ctx, m, Math.min(1, phaseInfo.attackK * 1.4))
        drawExplosionLayer(ctx, m, { radius: 22 })
        break
      case 'swordsman':
        // Whirlwind Blade
        for (let r = 0; r < 3; r++) {
          drawTaperedCrescentSlash(
            ctx,
            opts.targetX,
            opts.targetY,
            (13 + r * 5 + phaseInfo.attackK * 10) * opts.scale,
            3.5 * opts.scale,
            phaseInfo.progress * 8 + (r * Math.PI * 2) / 3,
            phaseInfo.progress * 8 + (r * Math.PI * 2) / 3 + Math.PI * 1.1,
            r % 2 === 0 ? profile.palette.tertiary : profile.palette.primary,
            profile.palette.secondary,
            opts.alpha * phaseInfo.fadeAlpha,
          )
        }
        drawGroundEffectLayer(ctx, m, 'shockwave')
        break
      case 'mage':
        // Crystal Burst
        drawMagicCircleLayer(ctx, m, { radius: 22, sides: 6 })
        for (let i = 0; i < 5; i++) {
          const ang = (i * Math.PI * 2) / 5 - Math.PI / 2
          drawFacetedCrystal(
            ctx,
            opts.targetX + Math.cos(ang) * (10 + phaseInfo.explosionK * 12) * opts.scale,
            opts.targetY + Math.sin(ang) * (6 + phaseInfo.explosionK * 6) * opts.scale,
            3 * opts.scale,
            6 * opts.scale,
            ang * 0.4,
            profile.palette,
            opts.alpha * phaseInfo.fadeAlpha,
          )
        }
        drawExplosionLayer(ctx, m, { radius: 24 })
        break
      case 'archer':
        // Multi Arrow — 3 fanned emerald arrows
        for (const offset of [-7, 0, 7]) {
          drawProjectileLayer(
            ctx,
            { ...m, sourceY: opts.sourceY + offset * opts.scale, targetY: opts.targetY + offset * opts.scale },
            Math.min(1, phaseInfo.attackK * 1.45),
          )
        }
        drawImpactLayer(ctx, m, { radius: 18 })
        break
      case 'cleric':
        // Sacred Heal — radiant golden circle + rising feathers/sparks
        drawMagicCircleLayer(ctx, m, { radius: 22, sides: 8, innerSides: 4 })
        drawGroundEffectLayer(ctx, m, 'holy_seal')
        drawGlowingOrb(ctx, opts.targetX, opts.targetY - 6 * opts.scale, 18 * opts.scale, profile.palette.tertiary, '#ffffff', opts.alpha * phaseInfo.fadeAlpha * 0.7)
        break
      case 'merchant':
        // Golden Explosion
        drawMagicCircleLayer(ctx, m, { radius: 20, sides: 6 })
        drawExplosionLayer(ctx, m, { radius: 26 })
        break
      case 'thief': {
        // Phantom Dash — purple dash streak + 2 shadow afterimages
        const dashK = Math.min(1, phaseInfo.attackK * 1.4)
        for (const frac of [0.28, 0.62]) {
          const ax = opts.sourceX + (opts.targetX - opts.sourceX) * frac
          const ay = opts.sourceY + (opts.targetY - opts.sourceY) * frac
          drawShadowCloneSilhouette(ctx, ax, ay, 0.78 * opts.scale, 1, profile.palette.primary, profile.palette.dark, opts.alpha * phaseInfo.fadeAlpha * 0.65)
        }
        drawWeaponTrailLayer(ctx, m, { x: opts.sourceX + (opts.targetX - opts.sourceX) * dashK, radius: 18, count: 2 })
        break
      }
      case 'kensei':
        // Cross Blade — vivid X-shaped red/white slash
        drawTaperedCrescentSlash(ctx, opts.targetX, opts.targetY, 20 * opts.scale, 4 * opts.scale, -0.8, 0.8, profile.palette.primary, '#ffffff', opts.alpha * phaseInfo.fadeAlpha)
        drawTaperedCrescentSlash(ctx, opts.targetX, opts.targetY, 20 * opts.scale, 4 * opts.scale, Math.PI - 0.8, Math.PI + 0.8, profile.palette.secondary, profile.palette.tertiary, opts.alpha * phaseInfo.fadeAlpha)
        drawImpactLayer(ctx, m, { radius: 18 })
        break
      case 'iron_fist': {
        // Meteor Fist — giant blazing fiery projectile gauntlet
        const fK = Math.min(1, phaseInfo.attackK * 1.45)
        const fx = opts.sourceX + (opts.targetX - opts.sourceX) * fK
        const fy = opts.sourceY + (opts.targetY - opts.sourceY) * fK
        drawGlowingOrb(ctx, fx, fy, 13 * opts.scale, profile.palette.primary, profile.palette.tertiary, opts.alpha * phaseInfo.fadeAlpha)
        drawExplosionLayer(ctx, m, { radius: 26 })
        drawGroundEffectLayer(ctx, m, 'shockwave')
        break
      }
      case 'wicked_necromancer':
        // Soul Prison
        drawGroundEffectLayer(ctx, m, 'cursed_prison')
        drawImpactLayer(ctx, m, { radius: 19 })
        break
      case 'the_king':
        // King's Authority — golden royal shockwave ring
        drawMagicCircleLayer(ctx, m, { radius: 24, sides: 8 })
        drawExplosionLayer(ctx, m, { radius: 26 })
        break
      case 'sinister':
        // Abyss Burst — blood-black demon spikes & explosion
        drawMagicCircleLayer(ctx, m, { radius: 20, sides: 5 })
        drawExplosionLayer(ctx, m, { radius: 24 })
        break
      case 'templar':
        // Sacred Barrier — geometric hexagonal golden-white dome
        drawMagicCircleLayer(ctx, m, { radius: 22, sides: 6 })
        ctx.save()
        ctx.globalAlpha = opts.alpha * phaseInfo.fadeAlpha * 0.72
        ctx.strokeStyle = profile.palette.tertiary
        ctx.lineWidth = 2 * opts.scale
        ctx.beginPath()
        ctx.arc(opts.targetX, opts.floorY - 6 * opts.scale, 18 * opts.scale, Math.PI, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
        break
      case 'nekobaku': {
        // Alchemy Bomb
        const fl = Math.min(1, phaseInfo.attackK * 1.45)
        if (fl < 0.92) {
          drawProjectileLayer(ctx, m, fl)
        } else {
          drawExplosionLayer(ctx, m, { radius: 25 })
        }
        break
      }
      case 'mamushi': {
        // Serpent Fang — twin curved emerald-purple jaws closing on target
        const pinch = Math.max(0, 1 - phaseInfo.impactK * 1.4)
        ctx.save()
        ctx.globalAlpha = opts.alpha * phaseInfo.fadeAlpha
        ctx.strokeStyle = profile.palette.primary
        ctx.lineWidth = 2.8 * opts.scale
        for (const side of [-1, 1] as const) {
          ctx.beginPath()
          ctx.moveTo(opts.targetX - 11 * opts.scale, opts.targetY + side * (7 + pinch * 9) * opts.scale)
          ctx.quadraticCurveTo(opts.targetX, opts.targetY + side * 2 * opts.scale, opts.targetX + 12 * opts.scale, opts.targetY + side * (5 + pinch * 6) * opts.scale)
          ctx.stroke()
        }
        ctx.restore()
        drawExplosionLayer(ctx, m, { radius: 22 })
        break
      }
    }
    drawDeterministicClassParticles(ctx, m, { count: 9, radius: 24 })
  } else {
    drawUltimateEffectLayer(ctx, m)
  }

  ctx.restore()
}
