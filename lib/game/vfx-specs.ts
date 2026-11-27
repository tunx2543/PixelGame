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

import {
  getClassCombatVfxProfile,
  resolveSkillCombatTier,
  type CombatVfxTier,
} from './combat-vfx-system'

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
  jobId: JobId
  tier: CombatVfxTier
  durationSec: number
  style: SkillVfxStyle
  effectLabel: string
  primaryColor: string
  secondaryColor: string
  iconPath: string
}

const SKILL_VFX_TABLE: Record<string, Omit<SkillVfxSpec, 'skillId' | 'jobId' | 'tier' | 'durationSec'>> = {
  // ── 01. novice (Wayfarer: Silver, Sky Blue, White) ──
  power: {
    style: 'heavy_cleave',
    effectLabel: 'Adventurer Strike ฟาดคลื่นแสงสีเงิน-ฟ้า',
    primaryColor: '#38bdf8',
    secondaryColor: '#e2e8f0',
    iconPath: '/assets/skills/novice/1.png',
  },
  'first-aid': {
    style: 'holy_heal',
    effectLabel: 'ประกายฟื้นฟูสีขาว-ฟ้าอ่อนรอบกาย',
    primaryColor: '#e2e8f0',
    secondaryColor: '#38bdf8',
    iconPath: '/assets/skills/novice/2.png',
  },
  'wayfarer-rush': {
    style: 'sniper_pierce',
    effectLabel: 'พุ่งฟาดคลื่นนักผจญภัยสีเงินฟ้า',
    primaryColor: '#7dd3fc',
    secondaryColor: '#ffffff',
    iconPath: '/assets/skills/novice/3.png',
  },
  'wayfarer-crescent': {
    style: 'iaijutsu_wave',
    effectLabel: 'Rising Courage ปลดปล่อยคลื่นพลังกล้าหาญรอบตัว',
    primaryColor: '#38bdf8',
    secondaryColor: '#ffffff',
    iconPath: '/assets/skills/novice/4.png',
  },

  // ── 02. swordsman (Vanguard: Silver, Sky Blue, Royal Blue) ──
  bash: {
    style: 'heavy_cleave',
    effectLabel: 'Sword Slash ฟันดาบโค้งสีเงิน-ฟ้า',
    primaryColor: '#38bdf8',
    secondaryColor: '#cbd5e1',
    iconPath: '/assets/skills/swordsman/1.png',
  },
  whirl: {
    style: 'whirl_blades',
    effectLabel: 'Whirlwind Blade หมุนตัวฟันพายุคมดาบสีน้ำเงิน',
    primaryColor: '#2563eb',
    secondaryColor: '#38bdf8',
    iconPath: '/assets/skills/swordsman/2.png',
  },
  'vanguard-pierce': {
    style: 'holy_lance',
    effectLabel: 'พุ่งทะลวงคมดาบแหวกอากาศสีฟ้าคราม',
    primaryColor: '#60a5fa',
    secondaryColor: '#e2e8f0',
    iconPath: '/assets/skills/swordsman/3.png',
  },
  'vanguard-breaker': {
    style: 'holy_sword_beam',
    effectLabel: 'Heaven Splitter อัญเชิญดาบพลังขนาดใหญ่ฟันลงพื้น',
    primaryColor: '#2563eb',
    secondaryColor: '#cbd5e1',
    iconPath: '/assets/skills/swordsman/4.png',
  },

  // ── 03. mage (Arcanist: Violet, Blue, Cyan) ──
  firebolt: {
    style: 'fire_comet',
    effectLabel: 'Arcane Bolt ลูกพลังเวทม่วง-ฟ้าพุ่งปะทะ',
    primaryColor: '#a855f7',
    secondaryColor: '#22d3ee',
    iconPath: '/assets/skills/mage/1.png',
  },
  'arcane-ward': {
    style: 'arcane_rune_pulse',
    effectLabel: 'วงเวทคริสตัลอาร์เคนม่วง-ฟ้า',
    primaryColor: '#3b82f6',
    secondaryColor: '#22d3ee',
    iconPath: '/assets/skills/mage/2.png',
  },
  meteor: {
    style: 'meteor_strike',
    effectLabel: 'Crystal Burst คริสตัลเวทระเบิดรอบเป้าหมาย',
    primaryColor: '#a855f7',
    secondaryColor: '#3b82f6',
    iconPath: '/assets/skills/mage/3.png',
  },
  'astral-nova': {
    style: 'arcane_rune_pulse',
    effectLabel: 'Astral Tempest มหาพายุวงเวทดาราจักรม่วง-ฟ้า',
    primaryColor: '#a855f7',
    secondaryColor: '#22d3ee',
    iconPath: '/assets/skills/mage/4.png',
  },

  // ── 04. archer (Windstalker: Emerald Green, Light Green) ──
  double: {
    style: 'arrow_barrage',
    effectLabel: 'Multi Arrow ยิงธนูสายลมมรกตต่อเนื่อง',
    primaryColor: '#10b981',
    secondaryColor: '#86efac',
    iconPath: '/assets/skills/archer/1.png',
  },
  rain: {
    style: 'arrow_rain',
    effectLabel: 'Celestial Rain เรียกห่าฝนธนูมรกตจากฟากฟ้า',
    primaryColor: '#10b981',
    secondaryColor: '#ecfccb',
    iconPath: '/assets/skills/archer/2.png',
  },
  'wind-snipe': {
    style: 'sniper_pierce',
    effectLabel: 'ศรสายลมทะลวงวิถีสีเขียวมรกต',
    primaryColor: '#34d399',
    secondaryColor: '#ecfccb',
    iconPath: '/assets/skills/archer/3.png',
  },
  'gale-volley': {
    style: 'arrow_barrage',
    effectLabel: 'Multi Arrow ระดมศรวายุสีเขียวอ่อน',
    primaryColor: '#10b981',
    secondaryColor: '#86efac',
    iconPath: '/assets/skills/archer/4.png',
  },

  // ── 05. cleric (Luminary: White, Gold, Yellow) ──
  'grace-heal': {
    style: 'holy_heal',
    effectLabel: 'Sacred Heal วงเวทแสงทองฟื้นฟูศักดิ์สิทธิ์',
    primaryColor: '#fde047',
    secondaryColor: '#ffffff',
    iconPath: '/assets/skills/cleric/1.png',
  },
  'holy-bolt': {
    style: 'holy_lance',
    effectLabel: 'Holy Light ศาสตราแสงทองพุ่งพิพากษา',
    primaryColor: '#f59e0b',
    secondaryColor: '#ffffff',
    iconPath: '/assets/skills/cleric/2.png',
  },
  'radiant-cross': {
    style: 'light_judgment',
    effectLabel: 'กางเขนแสงทองคำชำระล้างศัตรู',
    primaryColor: '#fde047',
    secondaryColor: '#f59e0b',
    iconPath: '/assets/skills/cleric/3.png',
  },
  sanctuary: {
    style: 'sanctuary_circle',
    effectLabel: 'Divine Judgment ลำแสงมหาพิพากษาจากฟากฟ้า',
    primaryColor: '#f59e0b',
    secondaryColor: '#ffffff',
    iconPath: '/assets/skills/cleric/4.png',
  },

  // ── 06. merchant (Goldweaver: Gold, Yellow, Orange) ──
  'gold-strike': {
    style: 'heavy_cleave',
    effectLabel: 'Coin Strike ฟาดพลังเหรียญทอง',
    primaryColor: '#fbbf24',
    secondaryColor: '#fef08a',
    iconPath: '/images/skills/whirl.png',
  },
  'cart-strike': {
    style: 'whirl_blades',
    effectLabel: 'Golden Explosion ระเบิดเหรียญทองคำกระจาย',
    primaryColor: '#f97316',
    secondaryColor: '#fef08a',
    iconPath: '/images/skills/whirl.png',
  },
  'golden-barrier': {
    style: 'holy_heal',
    effectLabel: 'โล่ประกายทองคำคุ้มภัยและฟื้นฟู',
    primaryColor: '#fbbf24',
    secondaryColor: '#f97316',
    iconPath: '/images/skills/ice-wall.png',
  },
  'prosperity-rain': {
    style: 'coin_rain',
    effectLabel: 'Treasure Storm พายุเหรียญทองและหีบสมบัติระเบิด',
    primaryColor: '#fbbf24',
    secondaryColor: '#f97316',
    iconPath: '/images/skills/rain.png',
  },

  // ── 07. thief (Nightveil: Black, Violet, Deep Purple) ──
  dblatk: {
    style: 'twin_slash',
    effectLabel: 'Shadow Dagger มีดเงาสีม่วง-ดำฟันซ้อน',
    primaryColor: '#a855f7',
    secondaryColor: '#581c87',
    iconPath: '/assets/skills/thief/1.png',
  },
  backstab: {
    style: 'shadow_backstab',
    effectLabel: 'Phantom Dash พุ่งแทงผ่านเป้าหมายทิ้งร่างเงา',
    primaryColor: '#a855f7',
    secondaryColor: '#e9d5ff',
    iconPath: '/assets/skills/thief/2.png',
  },
  'shadow-mark': {
    style: 'shadow_skull_mist',
    effectLabel: 'ประทับตราเงารัตติกาลม่วงทมิฬ',
    primaryColor: '#7e22ce',
    secondaryColor: '#c084fc',
    iconPath: '/assets/skills/thief/3.png',
  },
  'veil-execution': {
    style: 'shadow_vortex',
    effectLabel: 'Shadow Execution ร่างเงาสี่ทิศพุ่งประหารพร้อมกัน',
    primaryColor: '#a855f7',
    secondaryColor: '#18181b',
    iconPath: '/assets/skills/thief/4.png',
  },

  // ── 08. kensei (Shinkage: Red, White, Soft Pink) ──
  'kensei-flash': {
    style: 'iaijutsu_wave',
    effectLabel: 'Katana Slash ฟันคาตานะสีแดง-ขาวรวดเดียวสามจังหวะ',
    primaryColor: '#ef4444',
    secondaryColor: '#ffffff',
    iconPath: '/assets/skills/kensei/1.png',
  },
  iaijutsu: {
    style: 'iaijutsu_wave',
    effectLabel: 'Cross Blade ฟันไขว้รูปตัว X แดงขาวพร้อมกลีบแสงชมพู',
    primaryColor: '#ef4444',
    secondaryColor: '#f9a8d4',
    iconPath: '/assets/skills/kensei/2.png',
  },
  'spirit-thrust': {
    style: 'sniper_pierce',
    effectLabel: 'แทงคาตานะแสงขาว-แดงฉับไว',
    primaryColor: '#ffffff',
    secondaryColor: '#f9a8d4',
    iconPath: '/assets/skills/kensei/3.png',
  },
  bladestorm: {
    style: 'whirl_blades',
    effectLabel: 'Thousand Petals ระดมฟันคาตานะกลางพายุกลีบเรืองแสง',
    primaryColor: '#ef4444',
    secondaryColor: '#f9a8d4',
    iconPath: '/assets/skills/kensei/4.png',
  },

  // ── 09. iron_fist (Titanfist: Orange, Red, Gold) ──
  'flash-smash': {
    style: 'fist_shockwave',
    effectLabel: 'Meteor Fist หมัดเพลิงส้มแดงพุ่งกระแทก',
    primaryColor: '#f97316',
    secondaryColor: '#fbbf24',
    iconPath: '/images/skills/whirl.png',
  },
  'quake-hammer': {
    style: 'fist_shockwave',
    effectLabel: 'Earthbreaker ทุบพื้นแยกปฐพีคลื่นแมกมาส้มทอง',
    primaryColor: '#dc2626',
    secondaryColor: '#fbbf24',
    iconPath: '/images/skills/meteor.png',
  },
  'iron-will': {
    style: 'holy_heal',
    effectLabel: 'ปราณหมัดเหล็กฟื้นพลังกายสีส้มทอง',
    primaryColor: '#fbbf24',
    secondaryColor: '#f97316',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'titan-combo': {
    style: 'fist_shockwave',
    effectLabel: 'คอมโบหมัดไททันปะทุคลื่นไฟส้มแดง',
    primaryColor: '#f97316',
    secondaryColor: '#dc2626',
    iconPath: '/images/skills/firebolt.png',
  },

  // ── 10. wicked_necromancer (Grimcaller: Purple, Black, Dark Blue) ──
  'black-cat-hex': {
    style: 'shadow_skull_mist',
    effectLabel: 'Dark Soul ลูกพลังวิญญาณม่วงดำจากคัมภีร์มนตร์ดำ',
    primaryColor: '#9333ea',
    secondaryColor: '#1e3a8a',
    iconPath: '/assets/skills/wicked_necromancer/1.png',
  },
  'lower-resist': {
    style: 'arcane_rune_pulse',
    effectLabel: 'Soul Prison วงเวทคำสาปขังวิญญาณและเงาแมวดำ',
    primaryColor: '#9333ea',
    secondaryColor: '#d8b4fe',
    iconPath: '/assets/skills/wicked_necromancer/2.png',
  },
  'soul-shroud': {
    style: 'holy_heal',
    effectLabel: 'ม่านวิญญาณอเวจีสีม่วง-น้ำเงินเข้ม',
    primaryColor: '#a855f7',
    secondaryColor: '#1e3a8a',
    iconPath: '/assets/skills/wicked_necromancer/3.png',
  },
  'abyss-requiem': {
    style: 'shadow_skull_mist',
    effectLabel: "Reaper's Domain ฝูงวิญญาณมืดและเงาปีศาจโจมตีรอบอาณาเขต",
    primaryColor: '#9333ea',
    secondaryColor: '#1e3a8a',
    iconPath: '/assets/skills/wicked_necromancer/4.png',
  },

  // ── 11. the_king (High Sovereign: Gold, White, Crimson Red) ──
  'dividend-yield': {
    style: 'holy_heal',
    effectLabel: 'รัศมีราชวงศ์ทอง-ขาวฟื้นฟูพลังกาย',
    primaryColor: '#fbbf24',
    secondaryColor: '#ffffff',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'candle-storm': {
    style: 'coin_rain',
    effectLabel: "King's Authority คลื่นอำนาจราชวงศ์ทอง-แดง",
    primaryColor: '#fbbf24',
    secondaryColor: '#dc2626',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'stop-loss': {
    style: 'fire_comet',
    effectLabel: 'คมแสงพิพากษาราชันย์สีแดง-ทอง',
    primaryColor: '#dc2626',
    secondaryColor: '#fbbf24',
    iconPath: '/images/skills/firebolt.png',
  },
  'sovereign-decree': {
    style: 'holy_sword_beam',
    effectLabel: 'Imperial Judgment ดาบราชันย์ยักษ์สีทอง-แดงฟันจากฟ้า',
    primaryColor: '#fbbf24',
    secondaryColor: '#dc2626',
    iconPath: '/images/skills/meteor.png',
  },

  // ── 12. sinister (Dreadfang: Black, Red, Crimson) ──
  'sinister-cross': {
    style: 'twin_slash',
    effectLabel: 'Demon Claw กรงเล็บปีศาจดำ-แดงฟาดไขว้',
    primaryColor: '#dc2626',
    secondaryColor: '#9f1239',
    iconPath: '/assets/skills/sinister/1.png',
  },
  'reaper-ambush': {
    style: 'demon_pentagram',
    effectLabel: 'Abyss Burst ระเบิดพลังอสูรสีแดงทมิฬ',
    primaryColor: '#9f1239',
    secondaryColor: '#fda4af',
    iconPath: '/assets/skills/sinister/2.png',
  },
  'demon-spike': {
    style: 'demon_pentagram',
    effectLabel: 'Abyss Burst ตราดาวห้าแฉกอสูรปะทุออกรอบทิศ',
    primaryColor: '#dc2626',
    secondaryColor: '#09090b',
    iconPath: '/assets/skills/sinister/3.png',
  },
  'crimson-eclipse': {
    style: 'shadow_vortex',
    effectLabel: 'Infernal Awakening ร่างออร่าปีศาจและคลื่นเพลิงโลหิต',
    primaryColor: '#dc2626',
    secondaryColor: '#9f1239',
    iconPath: '/assets/skills/sinister/4.png',
  },

  // ── 13. templar (Aegis Knight: White, Silver, Gold) ──
  'holy-strike': {
    style: 'holy_cleave',
    effectLabel: 'Holy Shield Strike ฟาดโล่และดาบแสงขาว-ทอง',
    primaryColor: '#ffffff',
    secondaryColor: '#fbbf24',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'aegis-sanctuary': {
    style: 'sanctuary_circle',
    effectLabel: 'Sacred Barrier โดมโล่แสงศักดิ์สิทธิ์สีขาว-เงิน-ทอง',
    primaryColor: '#e2e8f0',
    secondaryColor: '#fbbf24',
    iconPath: '/images/skills/ice-wall.png',
  },
  'templar-bastion': {
    style: 'holy_heal',
    effectLabel: 'ปราการโล่ศักดิ์สิทธิ์ฟื้นฟูและคุ้มกัน',
    primaryColor: '#ffffff',
    secondaryColor: '#fbbf24',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'aegis-judgment': {
    style: 'aegis_shield_slam',
    effectLabel: 'Aegis Dominion วงแหวนปราการยักษ์กระแทกศัตรู',
    primaryColor: '#fbbf24',
    secondaryColor: '#ffffff',
    iconPath: '/images/skills/whirl.png',
  },

  // ── 14. nekobaku (Pawchemist: Pink, Cyan/Blue, Purple) ──
  'fizz-flask': {
    style: 'alchemy_flask_burst',
    effectLabel: 'Alchemy Bomb ขวดยาเล่นแร่แปรธาตุระเบิดฟองหลากสี',
    primaryColor: '#38bdf8',
    secondaryColor: '#f472b6',
    iconPath: '/images/skills/firebolt.png',
  },
  'tar-flask': {
    style: 'alchemy_flask_burst',
    effectLabel: 'Alchemy Bomb ขวดเคมีชมพู-ม่วงจุดระเบิด',
    primaryColor: '#f472b6',
    secondaryColor: '#a855f7',
    iconPath: '/images/skills/meteor.png',
  },
  'neko-barrage': {
    style: 'arrow_rain',
    effectLabel: 'Mad Alchemist กระหน่ำขวดยาระเบิดลูกโซ่ชมพู-ฟ้า-ม่วง',
    primaryColor: '#f472b6',
    secondaryColor: '#38bdf8',
    iconPath: '/images/skills/rain.png',
  },
  'catnip-tonic': {
    style: 'holy_heal',
    effectLabel: 'น้ำยาแคตนิปฟื้นฟูประกายชมพู-ฟ้า',
    primaryColor: '#f472b6',
    secondaryColor: '#38bdf8',
    iconPath: '/images/skills/ice-wall.png',
  },

  // ── 15. mamushi (Venomblade: Toxic Green, Purple, Black) ──
  'viper-fang': {
    style: 'venom_fang_strike',
    effectLabel: 'Serpent Fang เขี้ยวอสรพิษพิษเขียว-ม่วง',
    primaryColor: '#22c55e',
    secondaryColor: '#9333ea',
    iconPath: '/images/skills/rain.png',
  },
  'bouncing-shuriken': {
    style: 'arrow_barrage',
    effectLabel: 'ชูริเคนอาบพิษสีเขียวมรกต-ม่วง',
    primaryColor: '#22c55e',
    secondaryColor: '#bef264',
    iconPath: '/images/skills/shadow.png',
  },
  'venom-overload': {
    style: 'venom_fang_strike',
    effectLabel: 'หมอกพิษคลั่งระเบิดละอองเขียว-ม่วง',
    primaryColor: '#22c55e',
    secondaryColor: '#9333ea',
    iconPath: '/images/skills/ice-wall.png',
  },
  'shadow-serpent': {
    style: 'shadow_vortex',
    effectLabel: 'Toxic Dominion พื้นที่หมอกพิษและอสรพิษเงายักษ์',
    primaryColor: '#22c55e',
    secondaryColor: '#9333ea',
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
    secondaryColor: '#ffffff',
    iconPath: '/images/skills/thunderstorm.png',
  },
  'sacred-aegis': {
    style: 'holy_heal',
    effectLabel: 'อาคมโล่แสงฟื้นฟูชีวิต',
    primaryColor: '#fef08a',
    secondaryColor: '#ffffff',
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
    primaryColor: '#10b981',
    secondaryColor: '#86efac',
    iconPath: '/images/skills/rain.png',
  },
  shadow: {
    style: 'shadow_vortex',
    effectLabel: 'วังวนเงาอเวจีผ่ามิติ',
    primaryColor: '#a855f7',
    secondaryColor: '#581c87',
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

export function getBasicAttackVfxSpec(jobId: string): SkillVfxSpec {
  const canonicalJob = normalizeJobId(jobId)
  const profile = getClassCombatVfxProfile(canonicalJob)
  const basicStyle: SkillVfxStyle =
    canonicalJob === 'mage'
      ? 'fire_comet'
      : canonicalJob === 'archer'
        ? 'arrow_barrage'
        : canonicalJob === 'cleric'
          ? 'holy_lance'
          : canonicalJob === 'thief'
            ? 'twin_slash'
            : canonicalJob === 'kensei'
              ? 'iaijutsu_wave'
              : canonicalJob === 'iron_fist'
                ? 'fist_shockwave'
                : canonicalJob === 'wicked_necromancer'
                  ? 'shadow_skull_mist'
                  : canonicalJob === 'sinister'
                    ? 'twin_slash'
                    : canonicalJob === 'templar'
                      ? 'aegis_shield_slam'
                      : canonicalJob === 'nekobaku'
                        ? 'alchemy_flask_burst'
                        : canonicalJob === 'mamushi'
                          ? 'venom_fang_strike'
                          : 'heavy_cleave'

  return {
    skillId: `basic:${canonicalJob}`,
    jobId: canonicalJob,
    tier: 'basic',
    durationSec: profile.basic.durationSec,
    style: basicStyle,
    effectLabel: `${profile.basic.name}: ${profile.basic.label}`,
    primaryColor: profile.palette.primary,
    secondaryColor: profile.palette.secondary,
    iconPath: renderSkillIconBmpDataUrl(basicStyle, profile.palette.primary, profile.palette.secondary),
  }
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
    const ownerJob = JOB_SKILL_VFX_OWNER[canonicalSkillId] ?? 'novice'
    const tier = resolveSkillCombatTier(canonicalSkillId)
    const profile = getClassCombatVfxProfile(ownerJob)
    return {
      skillId,
      jobId: ownerJob,
      tier,
      durationSec: profile[tier].durationSec,
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
    jobId: 'novice',
    tier: 'special',
    durationSec: 0.8,
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
