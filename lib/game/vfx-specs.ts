import { normalizeJobId, normalizeSkillId, type JobId, type SkillKind, type WeaponType } from './data'
import { renderSkillIconBmpDataUrl } from './skill-icon-bmp'

export type RebirthVisualStyle =
  | 'none'
  | 'origin_light'
  | 'growth_surge'
  | 'resolve_vortex'
  | 'victory_prism'
  | 'monarch_abyss'
  | 'celestial_god'

export interface RebirthAuraSpec {
  tier: number
  style: RebirthVisualStyle
  title: string
  shortTitle: string
  subtitle: string
  primaryColor: string
  secondaryColor: string
  glowColor: string
  coreAccentColor: string
  ringCount: number
  runeCount: number
  ribbonCount: number
  beamCount: number
  spireCount: number
  hasWings: boolean
  wingVariant: 'none' | 'monarch_violet' | 'celestial_gold'
  hasHaloCrown: boolean
  hasAstralPillar: boolean
  orbitShardCount: number
}

export const REBIRTH_TIER_SPECS: Record<number, RebirthAuraSpec> = {
  1: {
    tier: 1,
    style: 'origin_light',
    title: 'จุติ ระดับ 1 · แสงแห่งการเริ่มต้น',
    shortTitle: 'แสงแห่งการเริ่มต้น',
    subtitle: 'วงเวทฟ้าอ่อนและลำแสงเริ่มต้นพวยพุ่งจากพื้นพร้อมละอองดาว',
    primaryColor: '#38bdf8',
    secondaryColor: '#bae6fd',
    glowColor: '#0284c7',
    coreAccentColor: '#e0f2fe',
    ringCount: 2,
    runeCount: 4,
    ribbonCount: 0,
    beamCount: 4,
    spireCount: 0,
    hasWings: false,
    wingVariant: 'none',
    hasHaloCrown: false,
    hasAstralPillar: true,
    orbitShardCount: 0,
  },
  2: {
    tier: 2,
    style: 'growth_surge',
    title: 'จุติ ระดับ 2 · พลังแห่งการเติบโต',
    shortTitle: 'พลังแห่งการเติบโต',
    subtitle: 'วงเวทเรืองรอง ลำแสงดาราด้านหลัง และผลึกครามลอยคู่ด้านข้าง',
    primaryColor: '#38bdf8',
    secondaryColor: '#e0f2fe',
    glowColor: '#0ea5e9',
    coreAccentColor: '#7dd3fc',
    ringCount: 2,
    runeCount: 6,
    ribbonCount: 0,
    beamCount: 6,
    spireCount: 0,
    hasWings: false,
    wingVariant: 'none',
    hasHaloCrown: false,
    hasAstralPillar: true,
    orbitShardCount: 2,
  },
  3: {
    tier: 3,
    style: 'resolve_vortex',
    title: 'จุติ ระดับ 3 · พลังแห่งความมุ่งมั่น',
    shortTitle: 'พลังแห่งความมุ่งมั่น',
    subtitle: 'วงเวท 3 ชั้นซ้อน ลำแสงโอบล้อมด้านหลัง และผลึกคราม 4 ชิ้นรอบกาย',
    primaryColor: '#60a5fa',
    secondaryColor: '#dbeafe',
    glowColor: '#2563eb',
    coreAccentColor: '#93c5fd',
    ringCount: 3,
    runeCount: 8,
    ribbonCount: 0,
    beamCount: 8,
    spireCount: 0,
    hasWings: false,
    wingVariant: 'none',
    hasHaloCrown: false,
    hasAstralPillar: true,
    orbitShardCount: 4,
  },
  4: {
    tier: 4,
    style: 'victory_prism',
    title: 'จุติ ระดับ 4 · พลังแห่งชัยชนะ',
    shortTitle: 'พลังแห่งชัยชนะ',
    subtitle: 'วงแหวนชัยชนะแกนแสงทอง-ฟ้า เสาแสงศักดิ์สิทธิ์ และผลึกแซฟไฟร์ 6 ชิ้น',
    primaryColor: '#38bdf8',
    secondaryColor: '#fde68a',
    glowColor: '#3b82f6',
    coreAccentColor: '#fef3c7',
    ringCount: 3,
    runeCount: 8,
    ribbonCount: 4,
    beamCount: 10,
    spireCount: 0,
    hasWings: false,
    wingVariant: 'none',
    hasHaloCrown: false,
    hasAstralPillar: true,
    orbitShardCount: 6,
  },
  5: {
    tier: 5,
    style: 'monarch_abyss',
    title: 'จุติ ระดับ 5 · พลังแห่งราชันย์',
    shortTitle: 'พลังแห่งราชันย์',
    subtitle: 'ปีกขนนกม่วงทมิฬ มงกุฎอักขระราชันย์ และผลึกอเมทิสต์ปะทุรอบวงเวท',
    primaryColor: '#a855f7',
    secondaryColor: '#e879f9',
    glowColor: '#7e22ce',
    coreAccentColor: '#f5d0fe',
    ringCount: 3,
    runeCount: 6,
    ribbonCount: 0,
    beamCount: 8,
    spireCount: 6,
    hasWings: true,
    wingVariant: 'monarch_violet',
    hasHaloCrown: true,
    hasAstralPillar: true,
    orbitShardCount: 4,
  },
  6: {
    tier: 6,
    style: 'celestial_god',
    title: 'จุติ ระดับ 6 · พลังแห่งเทพเจ้า',
    shortTitle: 'พลังแห่งเทพเจ้า',
    subtitle: 'ปีกเทพขาว-ทองสยายฟ้า วงแหวนกางเขนสุริยัน และศาสตราแสงทองคำรอบทิศ',
    primaryColor: '#fbbf24',
    secondaryColor: '#fef08a',
    glowColor: '#f59e0b',
    coreAccentColor: '#ffffff',
    ringCount: 4,
    runeCount: 8,
    ribbonCount: 0,
    beamCount: 10,
    spireCount: 6,
    hasWings: true,
    wingVariant: 'celestial_gold',
    hasHaloCrown: true,
    hasAstralPillar: true,
    orbitShardCount: 6,
  },
}

/**
 * Maps rebirthCount (0..6) to its distinct visual aura specification.
 */
export function resolveRebirthAuraSpec(rebirthCount = 0): RebirthAuraSpec {
  const tier = Math.max(0, Math.min(6, Math.floor(rebirthCount || 0)))
  if (tier <= 0) {
    return {
      tier: 0,
      style: 'none',
      title: 'ยังไม่จุติ',
      shortTitle: 'ปกติ',
      subtitle: 'เก็บเลเวลถึง 70 เพื่อปลดล็อกออร่าจุติระดับ 1',
      primaryColor: '#94a3b8',
      secondaryColor: '#cbd5e1',
      glowColor: '#64748b',
      coreAccentColor: '#e2e8f0',
      ringCount: 0,
      runeCount: 0,
      ribbonCount: 0,
      beamCount: 0,
      spireCount: 0,
      hasWings: false,
      wingVariant: 'none',
      hasHaloCrown: false,
      hasAstralPillar: false,
      orbitShardCount: 0,
    }
  }
  return REBIRTH_TIER_SPECS[tier] ?? REBIRTH_TIER_SPECS[6]
}

export type SkillVfxStyle =
  | 'heavy_cleave'
  | 'whirl_blades'
  | 'holy_cleave'
  | 'holy_sword_beam'
  | 'light_judgment'
  | 'holy_heal'
  | 'fire_comet'
  | 'meteor_strike'
  | 'blizzard_storm'
  | 'holy_lance'
  | 'sanctuary_circle'
  | 'arrow_barrage'
  | 'arrow_rain'
  | 'sniper_pierce'
  | 'twin_slash'
  | 'shadow_backstab'
  | 'shadow_vortex'
  | 'iaijutsu_wave'
  | 'fist_shockwave'
  | 'alchemy_flask_burst'
  | 'venom_fang_strike'
  | 'shadow_skull_mist'
  | 'demon_pentagram'
  | 'arcane_rune_pulse'
  | 'coin_rain'
  | 'aegis_shield_slam'

export interface SkillVfxSpec {
  skillId: string
  style: SkillVfxStyle
  effectLabel: string
  primaryColor: string
  secondaryColor: string
  iconPath: string
}

const SKILL_VFX_TABLE: Record<string, Omit<SkillVfxSpec, 'skillId'>> = {
  // ── 01. novice (Wayfarer ← Warrior: 4 matched icons) ──
  power: {
    style: 'heavy_cleave',
    effectLabel: 'ฟาดคมดาบเพลิงพิฆาตแนวหน้า',
    primaryColor: '#fb7185',
    secondaryColor: '#fde047',
    iconPath: '/assets/skills/novice/1.png',
  },
  'first-aid': {
    style: 'holy_heal',
    effectLabel: 'ปะทุประกายชีพฟื้นฟูรอบกาย',
    primaryColor: '#f97316',
    secondaryColor: '#fef08a',
    iconPath: '/assets/skills/novice/2.png',
  },
  'wayfarer-rush': {
    style: 'sniper_pierce',
    effectLabel: 'พุ่งแทงคมดาบสายฟ้าผ่าแนวศัตรู',
    primaryColor: '#ef4444',
    secondaryColor: '#fde68a',
    iconPath: '/assets/skills/novice/3.png',
  },
  'wayfarer-crescent': {
    style: 'iaijutsu_wave',
    effectLabel: 'คลื่นดาบจันทราเสี้ยวสีชาด',
    primaryColor: '#f43f5e',
    secondaryColor: '#ffffff',
    iconPath: '/assets/skills/novice/4.png',
  },

  // ── 02. swordsman (Vanguard ← Blade Master: 4 matched icons) ──
  bash: {
    style: 'heavy_cleave',
    effectLabel: 'คู่คมดาบผ่าศัตรูแนวหน้า',
    primaryColor: '#fb923c',
    secondaryColor: '#fef08a',
    iconPath: '/assets/skills/swordsman/1.png',
  },
  whirl: {
    style: 'whirl_blades',
    effectLabel: 'พายุใบมีดเพลิงหมุนรอบทิศ',
    primaryColor: '#f97316',
    secondaryColor: '#ffedd5',
    iconPath: '/assets/skills/swordsman/2.png',
  },
  'vanguard-pierce': {
    style: 'holy_lance',
    effectLabel: 'พุ่งทะลวงคมดาบแหวกอากาศ',
    primaryColor: '#ef4444',
    secondaryColor: '#fed7aa',
    iconPath: '/assets/skills/swordsman/3.png',
  },
  'vanguard-breaker': {
    style: 'fist_shockwave',
    effectLabel: 'สับดาบหนักทลายเกราะและพื้นดิน',
    primaryColor: '#f59e0b',
    secondaryColor: '#ffffff',
    iconPath: '/assets/skills/swordsman/4.png',
  },

  // ── 03. mage (Arcanist ← Sorcerer: 4 matched icons) ──
  firebolt: {
    style: 'fire_comet',
    effectLabel: 'ดาวหางเวทอัคคีสีม่วงพุ่งปะทะ',
    primaryColor: '#c084fc',
    secondaryColor: '#f5d0fe',
    iconPath: '/assets/skills/mage/1.png',
  },
  'arcane-ward': {
    style: 'arcane_rune_pulse',
    effectLabel: 'วงแหวนอักขระเวทเรืองรองฟื้นชีพและเกราะ',
    primaryColor: '#a855f7',
    secondaryColor: '#e9d5ff',
    iconPath: '/assets/skills/mage/2.png',
  },
  meteor: {
    style: 'meteor_strike',
    effectLabel: 'มหาอุกกาบาตอาร์เคนถล่มพื้นที่',
    primaryColor: '#d946ef',
    secondaryColor: '#fdf4ff',
    iconPath: '/assets/skills/mage/3.png',
  },
  'astral-nova': {
    style: 'arcane_rune_pulse',
    effectLabel: 'ระเบิดวงเวทดาราแปดทิศ',
    primaryColor: '#8b5cf6',
    secondaryColor: '#f0abfc',
    iconPath: '/assets/skills/mage/4.png',
  },

  // ── 04. archer (Windstalker ← Ranger: 4 matched icons) ──
  double: {
    style: 'arrow_barrage',
    effectLabel: 'ชุดศรวายุมรกตยิงซ้อนความเร็วสูง',
    primaryColor: '#4ade80',
    secondaryColor: '#ecfccb',
    iconPath: '/assets/skills/archer/1.png',
  },
  rain: {
    style: 'arrow_rain',
    effectLabel: 'ห่าฝนธนูพฤกษาโปรยจากฟ้า',
    primaryColor: '#22c55e',
    secondaryColor: '#bbf7d0',
    iconPath: '/assets/skills/archer/2.png',
  },
  'wind-snipe': {
    style: 'sniper_pierce',
    effectLabel: 'ศรเล็งเป้าเจาะเกราะทะลุคลื่นลม',
    primaryColor: '#a3e635',
    secondaryColor: '#ffffff',
    iconPath: '/assets/skills/archer/3.png',
  },
  'gale-volley': {
    style: 'arrow_rain',
    effectLabel: 'ระดมยิงศรพายุหมุนรอบจุดปะทะ',
    primaryColor: '#10b981',
    secondaryColor: '#d9f99d',
    iconPath: '/assets/skills/archer/4.png',
  },

  // ── 05. cleric (Luminary ← Holy Priest: 4 matched icons) ──
  'grace-heal': {
    style: 'holy_heal',
    effectLabel: 'รัศมีแสงทิพย์เยียวยาชีวิต',
    primaryColor: '#fde047',
    secondaryColor: '#fef9c3',
    iconPath: '/assets/skills/cleric/1.png',
  },
  'holy-bolt': {
    style: 'holy_lance',
    effectLabel: 'ศาสตรากางเขนทองพุ่งพิพากษา',
    primaryColor: '#fbbf24',
    secondaryColor: '#ffffff',
    iconPath: '/assets/skills/cleric/2.png',
  },
  'radiant-cross': {
    style: 'light_judgment',
    effectLabel: 'กางเขนแสงคู่ฟาดสยบความมืด',
    primaryColor: '#facc15',
    secondaryColor: '#fef08a',
    iconPath: '/assets/skills/cleric/3.png',
  },
  sanctuary: {
    style: 'sanctuary_circle',
    effectLabel: 'มหาอาคมเขตศักดิ์สิทธิ์ฟื้นฟูและพิฆาต',
    primaryColor: '#fde047',
    secondaryColor: '#86efac',
    iconPath: '/assets/skills/cleric/4.png',
  },

  // ── 06. merchant (Goldweaver — 6 non-matching: LEGACY icons ONLY) ──
  'gold-strike': {
    style: 'heavy_cleave',
    effectLabel: 'ฟาดอาคมเหรียญทองมั่งคั่ง',
    primaryColor: '#fbbf24',
    secondaryColor: '#fef08a',
    iconPath: '/images/skills/whirl.png',
  },
  'cart-strike': {
    style: 'whirl_blades',
    effectLabel: 'รถเข็นทองพุ่งกวาดศัตรูเป็นวงกว้าง',
    primaryColor: '#f59e0b',
    secondaryColor: '#fde68a',
    iconPath: '/images/skills/whirl.png',
  },
  'golden-barrier': {
    style: 'holy_heal',
    effectLabel: 'โล่ทองคำคุ้มภัยและฟื้นฟูพลังกาย',
    primaryColor: '#fde047',
    secondaryColor: '#fef3c7',
    iconPath: '/images/skills/ice-wall.png',
  },
  'prosperity-rain': {
    style: 'coin_rain',
    effectLabel: 'ห่าฝนเหรียญทองคำโปรยถล่มศัตรู',
    primaryColor: '#fbbf24',
    secondaryColor: '#ffffff',
    iconPath: '/images/skills/rain.png',
  },

  // ── 07. thief (Nightveil ← Shadow Thief: 4 matched icons) ──
  dblatk: {
    style: 'twin_slash',
    effectLabel: 'มีดเงาคู่วาบฟันซ้อนฉับไว',
    primaryColor: '#c084fc',
    secondaryColor: '#f5d0fe',
    iconPath: '/assets/skills/thief/1.png',
  },
  backstab: {
    style: 'shadow_backstab',
    effectLabel: 'ลอบแทงจุดตายจากมุมอับเงา',
    primaryColor: '#a855f7',
    secondaryColor: '#fb7185',
    iconPath: '/assets/skills/thief/2.png',
  },
  'shadow-mark': {
    style: 'shadow_skull_mist',
    effectLabel: 'ประทับตราหัวกะโหลกเงาสาปรอบทิศ',
    primaryColor: '#9333ea',
    secondaryColor: '#e9d5ff',
    iconPath: '/assets/skills/thief/3.png',
  },
  'veil-execution': {
    style: 'shadow_vortex',
    effectLabel: 'พายุเงาสังหารผ่ามิติรัตติกาล',
    primaryColor: '#7e22ce',
    secondaryColor: '#f43f5e',
    iconPath: '/assets/skills/thief/4.png',
  },

  // ── 08. kensei (Shinkage ← Iaijutsu Master: 4 matched icons) ──
  'kensei-flash': {
    style: 'iaijutsu_wave',
    effectLabel: 'ฟันวาบคลื่นดาบครามสามจังหวะ',
    primaryColor: '#38bdf8',
    secondaryColor: '#e0f2fe',
    iconPath: '/assets/skills/kensei/1.png',
  },
  iaijutsu: {
    style: 'iaijutsu_wave',
    effectLabel: 'ชักดาบปลิดชีพในชั่วพริบตา',
    primaryColor: '#0ea5e9',
    secondaryColor: '#ffffff',
    iconPath: '/assets/skills/kensei/2.png',
  },
  'spirit-thrust': {
    style: 'sniper_pierce',
    effectLabel: 'แทงทะลวงจิตวิญญาณวายุคราม',
    primaryColor: '#60a5fa',
    secondaryColor: '#bae6fd',
    iconPath: '/assets/skills/kensei/3.png',
  },
  bladestorm: {
    style: 'whirl_blades',
    effectLabel: 'พายุคมดาบ Shinkage กวาดล้างรอบทิศ',
    primaryColor: '#0284c7',
    secondaryColor: '#e0f2fe',
    iconPath: '/assets/skills/kensei/4.png',
  },

  // ── 09. iron_fist (Titanfist — 6 non-matching: LEGACY icons ONLY) ──
  'flash-smash': {
    style: 'fist_shockwave',
    effectLabel: 'พุ่งกระแทกหมัดอัคคี Titanfist',
    primaryColor: '#fb923c',
    secondaryColor: '#ffedd5',
    iconPath: '/images/skills/whirl.png',
  },
  'quake-hammer': {
    style: 'fist_shockwave',
    effectLabel: 'ทุบปฐพีคลื่นสั่นสะเทือนรอบทิศ',
    primaryColor: '#f59e0b',
    secondaryColor: '#fef3c7',
    iconPath: '/images/skills/meteor.png',
  },
  'iron-will': {
    style: 'holy_heal',
    effectLabel: 'จิตวิญญาณเหล็กกล้าฟื้นพลังชีวิต',
    primaryColor: '#fed7aa',
    secondaryColor: '#fef08a',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'titan-combo': {
    style: 'fist_shockwave',
    effectLabel: 'รัวหมัดไททันปะทุคลื่นกระแทกต่อเนื่อง',
    primaryColor: '#ea580c',
    secondaryColor: '#fde047',
    iconPath: '/images/skills/firebolt.png',
  },

  // ── 10. wicked_necromancer (Grimcaller ← Necromancer: 4 matched icons) ──
  'black-cat-hex': {
    style: 'shadow_skull_mist',
    effectLabel: 'เรียกวิญญาณกะโหลกทมิฬพุ่งสาป',
    primaryColor: '#c084fc',
    secondaryColor: '#f5d0fe',
    iconPath: '/assets/skills/wicked_necromancer/1.png',
  },
  'lower-resist': {
    style: 'arcane_rune_pulse',
    effectLabel: 'เสาวิญญาณต้องสาปทลายเกราะต้านทาน',
    primaryColor: '#a855f7',
    secondaryColor: '#e9d5ff',
    iconPath: '/assets/skills/wicked_necromancer/2.png',
  },
  'soul-shroud': {
    style: 'holy_heal',
    effectLabel: 'ม่านวิญญาณดูดซับพลังชีวิตและฟื้นฟู',
    primaryColor: '#d946ef',
    secondaryColor: '#bae6fd',
    iconPath: '/assets/skills/wicked_necromancer/3.png',
  },
  'abyss-requiem': {
    style: 'shadow_skull_mist',
    effectLabel: 'พายุหัวกะโหลกอเวจีคร่ำครวญรอบทิศ',
    primaryColor: '#e879f9',
    secondaryColor: '#7e22ce',
    iconPath: '/assets/skills/wicked_necromancer/4.png',
  },

  // ── 11. the_king (High Sovereign — 6 non-matching: LEGACY icons ONLY) ──
  'dividend-yield': {
    style: 'holy_heal',
    effectLabel: 'ละอองทองปันผลฟื้นฟูชีวิตและพลังเวท',
    primaryColor: '#fde047',
    secondaryColor: '#dcfce7',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'candle-storm': {
    style: 'coin_rain',
    effectLabel: 'พายุตลาดและฝนทองคำถล่มรอบพื้นที่',
    primaryColor: '#34d399',
    secondaryColor: '#fde047',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'stop-loss': {
    style: 'fire_comet',
    effectLabel: 'ลำแสงตัดขาดทุนสังหารเป้าหมายเดี่ยว',
    primaryColor: '#fb7185',
    secondaryColor: '#fde047',
    iconPath: '/images/skills/firebolt.png',
  },
  'sovereign-decree': {
    style: 'holy_sword_beam',
    effectLabel: 'ดาบราชโองการทองคำพิพากษารอบทิศ',
    primaryColor: '#fbbf24',
    secondaryColor: '#ffffff',
    iconPath: '/images/skills/meteor.png',
  },

  // ── 12. sinister (Dreadfang ← Demonist: 4 matched icons) ──
  'sinister-cross': {
    style: 'twin_slash',
    effectLabel: 'กงเล็บโลหิตฟาดไขว้ฉับไว',
    primaryColor: '#fb7185',
    secondaryColor: '#fecdd3',
    iconPath: '/assets/skills/sinister/1.png',
  },
  'reaper-ambush': {
    style: 'demon_pentagram',
    effectLabel: 'หนามนรกทมิฬพุ่งเสียบจากใต้พิภพ',
    primaryColor: '#e11d48',
    secondaryColor: '#fda4af',
    iconPath: '/assets/skills/sinister/2.png',
  },
  'demon-spike': {
    style: 'demon_pentagram',
    effectLabel: 'ตราดาวห้าแฉกอสูรปะทุคลั่ง',
    primaryColor: '#be123c',
    secondaryColor: '#fda4af',
    iconPath: '/assets/skills/sinister/3.png',
  },
  'crimson-eclipse': {
    style: 'shadow_vortex',
    effectLabel: 'จันทราคราสสีเลือดกวาดล้างรอบทิศ',
    primaryColor: '#f43f5e',
    secondaryColor: '#c084fc',
    iconPath: '/assets/skills/sinister/4.png',
  },

  // ── 13. templar (Aegis Knight — 6 non-matching: LEGACY icons ONLY) ──
  'holy-strike': {
    style: 'holy_cleave',
    effectLabel: 'กางเขนแสงพิฆาตฟาดศัตรูตรงหน้า',
    primaryColor: '#ffe08a',
    secondaryColor: '#fffbeb',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'aegis-sanctuary': {
    style: 'sanctuary_circle',
    effectLabel: 'วงเวทโล่แสงพิทักษ์ฟื้นฟูและสะท้อนพลัง',
    primaryColor: '#93c5fd',
    secondaryColor: '#fde047',
    iconPath: '/images/skills/ice-wall.png',
  },
  'templar-bastion': {
    style: 'holy_heal',
    effectLabel: 'ป้อมปราการศักดิ์สิทธิ์ฟื้นฟูและเสริมแกร่ง',
    primaryColor: '#fde047',
    secondaryColor: '#bbf7d0',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'aegis-judgment': {
    style: 'aegis_shield_slam',
    effectLabel: 'กระแทกโล่แสงทองคำทลายรอบทิศ',
    primaryColor: '#60a5fa',
    secondaryColor: '#fef08a',
    iconPath: '/images/skills/whirl.png',
  },

  // ── 14. nekobaku (Pawchemist — 6 non-matching: LEGACY icons ONLY) ──
  'fizz-flask': {
    style: 'alchemy_flask_burst',
    effectLabel: 'ขวดยาฟ้าซ่าระเบิดฟองแร่ธาตุเป็นพื้นที่',
    primaryColor: '#38bdf8',
    secondaryColor: '#e0f2fe',
    iconPath: '/images/skills/firebolt.png',
  },
  'tar-flask': {
    style: 'alchemy_flask_burst',
    effectLabel: 'ขวดน้ำมันดินระเบิดเพลิงเผาไหม้',
    primaryColor: '#fb923c',
    secondaryColor: '#fef08a',
    iconPath: '/images/skills/meteor.png',
  },
  'neko-barrage': {
    style: 'arrow_rain',
    effectLabel: 'กระหน่ำขวดเคมี Pawchemist ต่อเนื่อง',
    primaryColor: '#f472b6',
    secondaryColor: '#fde047',
    iconPath: '/images/skills/rain.png',
  },
  'catnip-tonic': {
    style: 'holy_heal',
    effectLabel: 'น้ำยาแคทนิปฟื้นฟู HP เฉียบพลัน',
    primaryColor: '#ec4899',
    secondaryColor: '#fbcfe8',
    iconPath: '/images/skills/ice-wall.png',
  },

  // ── 15. mamushi (Venomblade — 6 non-matching: LEGACY icons ONLY) ──
  'viper-fang': {
    style: 'venom_fang_strike',
    effectLabel: 'เขี้ยวอสรพิษมรกตกัดเจาะเกราะ',
    primaryColor: '#4ade80',
    secondaryColor: '#dcfce7',
    iconPath: '/images/skills/rain.png',
  },
  'bouncing-shuriken': {
    style: 'arrow_barrage',
    effectLabel: 'ดาวกระจายอาบพิษสะท้อนชิ่งศัตรู',
    primaryColor: '#86efac',
    secondaryColor: '#bef264',
    iconPath: '/images/skills/shadow.png',
  },
  'venom-overload': {
    style: 'venom_fang_strike',
    effectLabel: 'หมอกพิษคลั่งระเบิดเป็นวงกว้าง',
    primaryColor: '#a3e635',
    secondaryColor: '#4ade80',
    iconPath: '/images/skills/ice-wall.png',
  },
  'shadow-serpent': {
    style: 'shadow_vortex',
    effectLabel: 'อสรพิษเงาพุ่งพันธนาการและปะทุพิษ',
    primaryColor: '#22c55e',
    secondaryColor: '#c084fc',
    iconPath: '/images/skills/shadow.png',
  },

  // ── Legacy skill IDs kept for fallback safety ──
  holy: {
    style: 'holy_sword_beam',
    effectLabel: 'มหาดาบศักดิ์สิทธิ์พิพากษา',
    primaryColor: '#fde047',
    secondaryColor: '#ffffff',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'light-judgment': {
    style: 'light_judgment',
    effectLabel: 'เสาแสงสวรรค์คู่ทลายศัตรู',
    primaryColor: '#fef08a',
    secondaryColor: '#93c5fd',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'sacred-aegis': {
    style: 'holy_heal',
    effectLabel: 'อาคมโล่แสงฟื้นฟูชีวิต',
    primaryColor: '#fef08a',
    secondaryColor: '#86efac',
    iconPath: '/images/skills/thunderstorm.png',
  },
  blizzard: {
    style: 'blizzard_storm',
    effectLabel: 'พายุผลึกเหมันต์เยือกแข็ง',
    primaryColor: '#90e0ef',
    secondaryColor: '#ffffff',
    iconPath: '/images/skills/ice-wall.png',
  },
  sniper: {
    style: 'sniper_pierce',
    effectLabel: 'ลำแสงศรทองทะลวงมิติ',
    primaryColor: '#ffd60a',
    secondaryColor: '#fffbeb',
    iconPath: '/images/skills/rain.png',
  },
  shadow: {
    style: 'shadow_vortex',
    effectLabel: 'วังวนเงาอเวจีผ่ามิติ',
    primaryColor: '#c084fc',
    secondaryColor: '#f43f5e',
    iconPath: '/images/skills/shadow.png',
  },
}

export const JOB_SKILL_VFX_OWNER: Record<string, JobId> = {
  // novice
  power: 'novice',
  'first-aid': 'novice',
  'wayfarer-rush': 'novice',
  'wayfarer-crescent': 'novice',
  // swordsman
  bash: 'swordsman',
  whirl: 'swordsman',
  'vanguard-pierce': 'swordsman',
  'vanguard-breaker': 'swordsman',
  // mage
  firebolt: 'mage',
  'arcane-ward': 'mage',
  meteor: 'mage',
  'astral-nova': 'mage',
  // archer
  double: 'archer',
  rain: 'archer',
  'wind-snipe': 'archer',
  'gale-volley': 'archer',
  // cleric
  'grace-heal': 'cleric',
  'holy-bolt': 'cleric',
  'radiant-cross': 'cleric',
  sanctuary: 'cleric',
  // merchant
  'gold-strike': 'merchant',
  'cart-strike': 'merchant',
  'golden-barrier': 'merchant',
  'prosperity-rain': 'merchant',
  // thief
  dblatk: 'thief',
  backstab: 'thief',
  'shadow-mark': 'thief',
  'veil-execution': 'thief',
  // kensei
  'kensei-flash': 'kensei',
  iaijutsu: 'kensei',
  'spirit-thrust': 'kensei',
  bladestorm: 'kensei',
  // iron_fist
  'flash-smash': 'iron_fist',
  'quake-hammer': 'iron_fist',
  'iron-will': 'iron_fist',
  'titan-combo': 'iron_fist',
  // wicked_necromancer
  'black-cat-hex': 'wicked_necromancer',
  'lower-resist': 'wicked_necromancer',
  'soul-shroud': 'wicked_necromancer',
  'abyss-requiem': 'wicked_necromancer',
  // the_king
  'dividend-yield': 'the_king',
  'candle-storm': 'the_king',
  'stop-loss': 'the_king',
  'sovereign-decree': 'the_king',
  // sinister
  'sinister-cross': 'sinister',
  'reaper-ambush': 'sinister',
  'demon-spike': 'sinister',
  'crimson-eclipse': 'sinister',
  // templar
  'holy-strike': 'templar',
  'aegis-sanctuary': 'templar',
  'templar-bastion': 'templar',
  'aegis-judgment': 'templar',
  // nekobaku
  'fizz-flask': 'nekobaku',
  'tar-flask': 'nekobaku',
  'neko-barrage': 'nekobaku',
  'catnip-tonic': 'nekobaku',
  // mamushi
  'viper-fang': 'mamushi',
  'bouncing-shuriken': 'mamushi',
  'venom-overload': 'mamushi',
  'shadow-serpent': 'mamushi',
}

export function getSkillVfxOwnerJobId(skillId: string): JobId {
  const canonicalSkillId = normalizeSkillId(skillId)
  return JOB_SKILL_VFX_OWNER[canonicalSkillId] ?? 'novice'
}

export function getJobSkillVfxSpecs(jobId: string): SkillVfxSpec[] {
  const canonicalJob = normalizeJobId(jobId)
  return Object.entries(JOB_SKILL_VFX_OWNER)
    .filter(([, owner]) => owner === canonicalJob)
    .map(([skillId]) => getSkillVfxSpec(skillId))
}

export function getSkillVfxSpec(
  skillId: string,
  fallbackColor = '#ffd60a',
  fallbackKind?: SkillKind,
  fallbackWeapon?: WeaponType,
): SkillVfxSpec {
  const canonicalSkillId = normalizeSkillId(skillId)
  const entry = SKILL_VFX_TABLE[canonicalSkillId] ?? SKILL_VFX_TABLE[skillId]
  if (entry) {
    return {
      skillId,
      ...entry,
      iconPath: renderSkillIconBmpDataUrl(entry.style, entry.primaryColor, entry.secondaryColor),
    }
  }
  const style: SkillVfxStyle =
    fallbackKind === 'heal'
      ? 'holy_heal'
      : fallbackKind === 'aoe-self'
        ? 'whirl_blades'
        : fallbackKind === 'aoe-target'
          ? 'meteor_strike'
          : fallbackWeapon === 'bow'
            ? 'arrow_barrage'
            : fallbackWeapon === 'staff'
              ? 'fire_comet'
              : fallbackWeapon === 'dagger'
                ? 'twin_slash'
                : 'heavy_cleave'
  return {
    skillId,
    style,
    effectLabel: 'พลังโจมตีประจำสายอาชีพ',
    primaryColor: fallbackColor,
    secondaryColor: '#ffffff',
    iconPath: renderSkillIconBmpDataUrl(style, fallbackColor, '#ffffff'),
  }
}

export function getSkillIconPath(skillId: string): string {
  const spec = getSkillVfxSpec(skillId)
  return spec.iconPath
}
