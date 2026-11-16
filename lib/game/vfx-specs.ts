import type { SkillKind, WeaponType } from './data'

export type RebirthVisualStyle = 'none' | 'sigil_ring' | 'crimson_wings' | 'celestial_crown'

export interface RebirthAuraSpec {
  tier: number
  style: RebirthVisualStyle
  title: string
  subtitle: string
  primaryColor: string
  secondaryColor: string
  glowColor: string
  ringCount: number
  runeCount: number
  hasWings: boolean
  hasHaloCrown: boolean
  hasAstralPillar: boolean
  orbitShardCount: number
}

const REBIRTH_SIGIL_SPEC: Omit<RebirthAuraSpec, 'tier'> = {
  style: 'sigil_ring',
  title: 'วงแหวนแสงศักดิ์สิทธิ์ (จุติ 1–4)',
  subtitle: 'วงแหวนอักขระฟ้าคู่พร้อมประกายวิญญาณหมุนรอบกาย',
  primaryColor: '#38bdf8',
  secondaryColor: '#bae6fd',
  glowColor: '#0ea5e9',
  ringCount: 2,
  runeCount: 4,
  hasWings: false,
  hasHaloCrown: false,
  hasAstralPillar: false,
  orbitShardCount: 0,
}

const REBIRTH_CRIMSON_WINGS_SPEC: Omit<RebirthAuraSpec, 'tier'> = {
  style: 'crimson_wings',
  title: 'ปีกเพลิงเทวทูต (จุติ 5)',
  subtitle: 'เปลี่ยนรูปเป็นปีกแสงสีชมพู-ม่วงและวงเวทหกแฉก',
  primaryColor: '#e879f9',
  secondaryColor: '#fb7185',
  glowColor: '#d946ef',
  ringCount: 2,
  runeCount: 6,
  hasWings: true,
  hasHaloCrown: false,
  hasAstralPillar: false,
  orbitShardCount: 2,
}

const REBIRTH_CELESTIAL_SPEC: Omit<RebirthAuraSpec, 'tier'> = {
  style: 'celestial_crown',
  title: 'ราชันย์ดาราสวรรค์ (จุติ 6)',
  subtitle: 'เสาแสงเทพ ปีกคู่ทองคำ-คราม มงกุฎแสง และผลึกดาราโคจร',
  primaryColor: '#fde047',
  secondaryColor: '#67e8f9',
  glowColor: '#f59e0b',
  ringCount: 3,
  runeCount: 8,
  hasWings: true,
  hasHaloCrown: true,
  hasAstralPillar: true,
  orbitShardCount: 4,
}

/**
 * Maps rebirthCount to its visual aura form:
 * - 0: none
 * - 1..4: identical 'sigil_ring' pattern
 * - 5: evolved 'crimson_wings' pattern
 * - 6+: mythic 'celestial_crown' pattern
 */
export function resolveRebirthAuraSpec(rebirthCount = 0): RebirthAuraSpec {
  const tier = Math.max(0, Math.min(6, Math.floor(rebirthCount || 0)))
  if (tier <= 0) {
    return {
      tier: 0,
      style: 'none',
      title: 'ยังไม่จุติ',
      subtitle: 'เก็บเลเวลถึง 70 เพื่อปลดล็อกออร่าจุติ',
      primaryColor: '#94a3b8',
      secondaryColor: '#cbd5e1',
      glowColor: '#64748b',
      ringCount: 0,
      runeCount: 0,
      hasWings: false,
      hasHaloCrown: false,
      hasAstralPillar: false,
      orbitShardCount: 0,
    }
  }
  if (tier <= 4) {
    return { tier, ...REBIRTH_SIGIL_SPEC }
  }
  if (tier === 5) {
    return { tier, ...REBIRTH_CRIMSON_WINGS_SPEC }
  }
  return { tier, ...REBIRTH_CELESTIAL_SPEC }
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

export interface SkillVfxSpec {
  skillId: string
  style: SkillVfxStyle
  effectLabel: string
  primaryColor: string
  secondaryColor: string
  iconPath: string
}

const SKILL_VFX_TABLE: Record<string, Omit<SkillVfxSpec, 'skillId'>> = {
  power: {
    style: 'heavy_cleave',
    effectLabel: 'คลื่นฟาดแรงกระแทก',
    primaryColor: '#ffe08a',
    secondaryColor: '#ffffff',
    iconPath: '/images/skills/whirl.png',
  },
  'first-aid': {
    style: 'holy_heal',
    effectLabel: 'ละอองแสงฟื้นฟูพลังกาย',
    primaryColor: '#80ed99',
    secondaryColor: '#d8f3dc',
    iconPath: '/images/skills/thunderstorm.png',
  },
  bash: {
    style: 'heavy_cleave',
    effectLabel: 'คมดาบเพลิงทองกระแทก',
    primaryColor: '#ffd166',
    secondaryColor: '#ff9f1c',
    iconPath: '/images/skills/whirl.png',
  },
  whirl: {
    style: 'whirl_blades',
    effectLabel: 'พายุคมดาบหมุนวนรอบทิศ',
    primaryColor: '#72efdd',
    secondaryColor: '#e0fbfc',
    iconPath: '/images/skills/whirl.png',
  },
  holy: {
    style: 'holy_sword_beam',
    effectLabel: 'มหาดาบศักดิ์สิทธิ์พิพากษา',
    primaryColor: '#fde047',
    secondaryColor: '#ffffff',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'holy-strike': {
    style: 'holy_cleave',
    effectLabel: 'กางเขนแสงพิฆาต',
    primaryColor: '#ffe08a',
    secondaryColor: '#fffbeb',
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
  firebolt: {
    style: 'fire_comet',
    effectLabel: 'ดาวหางอัคคีเผาผลาญ',
    primaryColor: '#ff7b39',
    secondaryColor: '#ffd166',
    iconPath: '/images/skills/firebolt.png',
  },
  meteor: {
    style: 'meteor_strike',
    effectLabel: 'อุกกาบาตเพลิงถล่มปฐพี',
    primaryColor: '#ff4d2e',
    secondaryColor: '#ffb703',
    iconPath: '/images/skills/meteor.png',
  },
  blizzard: {
    style: 'blizzard_storm',
    effectLabel: 'พายุผลึกเหมันต์เยือกแข็ง',
    primaryColor: '#90e0ef',
    secondaryColor: '#ffffff',
    iconPath: '/images/skills/ice-wall.png',
  },
  'grace-heal': {
    style: 'holy_heal',
    effectLabel: 'วงเวทดอกบัวแสงเยียวยา',
    primaryColor: '#80ed99',
    secondaryColor: '#fef08a',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'holy-bolt': {
    style: 'holy_lance',
    effectLabel: 'หอกแสงดาราพุ่งทะลวง',
    primaryColor: '#b7f7c4',
    secondaryColor: '#ffffff',
    iconPath: '/images/skills/thunderstorm.png',
  },
  sanctuary: {
    style: 'sanctuary_circle',
    effectLabel: 'มหาอาคมเขตศักดิ์สิทธิ์',
    primaryColor: '#fef08a',
    secondaryColor: '#80ed99',
    iconPath: '/images/skills/thunderstorm.png',
  },
  double: {
    style: 'arrow_barrage',
    effectLabel: 'ชุดลูกศรวายุความเร็วสูง',
    primaryColor: '#bef264',
    secondaryColor: '#ffffff',
    iconPath: '/images/skills/rain.png',
  },
  rain: {
    style: 'arrow_rain',
    effectLabel: 'ห่าฝนธนูมรกตถล่มฟ้า',
    primaryColor: '#86efac',
    secondaryColor: '#ecfccb',
    iconPath: '/images/skills/rain.png',
  },
  sniper: {
    style: 'sniper_pierce',
    effectLabel: 'ลำแสงศรทองทะลวงมิติ',
    primaryColor: '#ffd60a',
    secondaryColor: '#fffbeb',
    iconPath: '/images/skills/rain.png',
  },
  dblatk: {
    style: 'twin_slash',
    effectLabel: 'คมมีดไขว้ความเร็วแสง',
    primaryColor: '#e2e8f0',
    secondaryColor: '#fb7185',
    iconPath: '/images/skills/shadow.png',
  },
  backstab: {
    style: 'shadow_backstab',
    effectLabel: 'คมเขี้ยวเงาโลหิตสังหาร',
    primaryColor: '#fb7185',
    secondaryColor: '#c084fc',
    iconPath: '/images/skills/shadow.png',
  },
  shadow: {
    style: 'shadow_vortex',
    effectLabel: 'วังวนเงาอเวจีผ่ามิติ',
    primaryColor: '#c084fc',
    secondaryColor: '#f43f5e',
    iconPath: '/images/skills/shadow.png',
  },
  'gold-strike': {
    style: 'heavy_cleave',
    effectLabel: 'ฟาดอาคมเหรียญทองมั่งคั่ง',
    primaryColor: '#fbbf24',
    secondaryColor: '#fef08a',
    iconPath: '/images/skills/whirl.png',
  },
  'cart-strike': {
    style: 'whirl_blades',
    effectLabel: 'รถเข็นทองพุ่งกวาดศัตรู',
    primaryColor: '#f59e0b',
    secondaryColor: '#fde68a',
    iconPath: '/images/skills/whirl.png',
  },
  'templar-bastion': {
    style: 'holy_heal',
    effectLabel: 'ป้อมปราการศักดิ์สิทธิ์ฟื้นฟู',
    primaryColor: '#fde047',
    secondaryColor: '#bbf7d0',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'kensei-flash': {
    style: 'twin_slash',
    effectLabel: 'ดาบวาบพริบตาสามจังหวะ',
    primaryColor: '#fda4af',
    secondaryColor: '#ffffff',
    iconPath: '/images/skills/whirl.png',
  },
  iaijutsu: {
    style: 'heavy_cleave',
    effectLabel: 'ชักดาบปลิดชีพในพริบตา',
    primaryColor: '#f43f5e',
    secondaryColor: '#fecdd3',
    iconPath: '/images/skills/whirl.png',
  },
  bladestorm: {
    style: 'whirl_blades',
    effectLabel: 'พายุคมดาบเคนเซย์รอบทิศ',
    primaryColor: '#fb7185',
    secondaryColor: '#ffe4e6',
    iconPath: '/images/skills/whirl.png',
  },
  'flash-smash': {
    style: 'heavy_cleave',
    effectLabel: 'พุ่งทะยานซัดหมัดเหล็ก',
    primaryColor: '#fb923c',
    secondaryColor: '#ffedd5',
    iconPath: '/images/skills/whirl.png',
  },
  'quake-hammer': {
    style: 'whirl_blades',
    effectLabel: 'กระแทกพสุธาคลื่นสั่นสะเทือน',
    primaryColor: '#f59e0b',
    secondaryColor: '#fef3c7',
    iconPath: '/images/skills/meteor.png',
  },
  'iron-will': {
    style: 'holy_heal',
    effectLabel: 'จิตวิญญาณเหล็กกล้าฟื้นกาย',
    primaryColor: '#fed7aa',
    secondaryColor: '#fef08a',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'dividend-yield': {
    style: 'holy_heal',
    effectLabel: 'ละอองทองปันผลฟื้นฟูชีวิต',
    primaryColor: '#fde047',
    secondaryColor: '#dcfce7',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'candle-storm': {
    style: 'meteor_strike',
    effectLabel: 'พายุกราฟแท่งเทียนถล่มตลาด',
    primaryColor: '#34d399',
    secondaryColor: '#fde047',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'stop-loss': {
    style: 'fire_comet',
    effectLabel: 'ลำแสงตัดขาดทุนสังหารเดี่ยว',
    primaryColor: '#fb7185',
    secondaryColor: '#fde047',
    iconPath: '/images/skills/firebolt.png',
  },
  'black-cat-hex': {
    style: 'shadow_backstab',
    effectLabel: 'อาคมแมวดำสาปวิญญาณ',
    primaryColor: '#c084fc',
    secondaryColor: '#f5d0fe',
    iconPath: '/images/skills/shadow.png',
  },
  'lower-resist': {
    style: 'meteor_strike',
    effectLabel: 'วงเวททลายต้านทานทมิฬ',
    primaryColor: '#a855f7',
    secondaryColor: '#e9d5ff',
    iconPath: '/images/skills/shadow.png',
  },
  'abyss-requiem': {
    style: 'shadow_vortex',
    effectLabel: 'พายุอเวจีคร่ำครวญรอบตัว',
    primaryColor: '#e879f9',
    secondaryColor: '#a855f7',
    iconPath: '/images/skills/shadow.png',
  },
  'viper-fang': {
    style: 'arrow_barrage',
    effectLabel: 'เขี้ยวอสรพิษมรกตเจาะเกราะ',
    primaryColor: '#4ade80',
    secondaryColor: '#dcfce7',
    iconPath: '/images/skills/rain.png',
  },
  'bouncing-shuriken': {
    style: 'arrow_barrage',
    effectLabel: 'ดาวกระจายอาบพิษสะท้อนชิ่ง',
    primaryColor: '#86efac',
    secondaryColor: '#bef264',
    iconPath: '/images/skills/rain.png',
  },
  'venom-overload': {
    style: 'meteor_strike',
    effectLabel: 'หมอกพิษคลั่งระเบิดเป็นวงกว้าง',
    primaryColor: '#a3e635',
    secondaryColor: '#4ade80',
    iconPath: '/images/skills/ice-wall.png',
  },
  'fizz-flask': {
    style: 'blizzard_storm',
    effectLabel: 'ขวดแร่ธาตุซ่าระเบิดเป็นพื้นที่',
    primaryColor: '#38bdf8',
    secondaryColor: '#e0f2fe',
    iconPath: '/images/skills/firebolt.png',
  },
  'tar-flask': {
    style: 'fire_comet',
    effectLabel: 'ขวดน้ำมันดินระเบิดเพลิง',
    primaryColor: '#fb923c',
    secondaryColor: '#fef08a',
    iconPath: '/images/skills/meteor.png',
  },
  'neko-barrage': {
    style: 'arrow_rain',
    effectLabel: 'กระหน่ำขวดเคมีเนโกะต่อเนื่อง',
    primaryColor: '#fde047',
    secondaryColor: '#fb923c',
    iconPath: '/images/skills/rain.png',
  },
  'sinister-cross': {
    style: 'twin_slash',
    effectLabel: 'คมมีดกากบาททมิฬสามจังหวะ',
    primaryColor: '#fb7185',
    secondaryColor: '#fecdd3',
    iconPath: '/images/skills/shadow.png',
  },
  'reaper-ambush': {
    style: 'shadow_backstab',
    effectLabel: 'พุ่งสังหารจากเงามืดมรณะ',
    primaryColor: '#e11d48',
    secondaryColor: '#fda4af',
    iconPath: '/images/skills/shadow.png',
  },
  'crimson-eclipse': {
    style: 'shadow_vortex',
    effectLabel: 'จันทราคราสสีเลือดกวาดล้าง',
    primaryColor: '#f43f5e',
    secondaryColor: '#c084fc',
    iconPath: '/images/skills/shadow.png',
  },
}

export function getSkillVfxSpec(
  skillId: string,
  fallbackColor = '#ffd60a',
  fallbackKind?: SkillKind,
  fallbackWeapon?: WeaponType,
): SkillVfxSpec {
  const entry = SKILL_VFX_TABLE[skillId]
  if (entry) {
    return { skillId, ...entry }
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
    iconPath: '/images/skills/whirl.png',
  }
}

export function getSkillIconPath(skillId: string): string {
  return SKILL_VFX_TABLE[skillId]?.iconPath ?? '/images/skills/whirl.png'
}
