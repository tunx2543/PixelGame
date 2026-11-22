import type { EquipmentRarity } from './mmo-systems'

export type ItemElement =
  | 'physical'
  | 'fire'
  | 'lightning'
  | 'ice'
  | 'shadow'
  | 'holy'
  | 'arcane'
  | 'venom'

export type ItemCategory =
  | 'weapon'
  | 'helmet'
  | 'armor'
  | 'gloves'
  | 'boots'
  | 'shield'
  | 'accessory'
  | 'ring'
  | 'necklace'
  | 'charm'
  | 'special'
  | 'consumable'
  | 'material'

export type VfxEffectKind =
  | 'glow'
  | 'aura'
  | 'spark'
  | 'flame'
  | 'lightning'
  | 'ice'
  | 'shadow'
  | 'holy'
  | 'rotating_rune'
  | 'animated_border'
  | 'shine_sweep'
  | 'periodic_burst'
  | 'star_sparkles'

export interface ItemVfxSpec {
  rarity: EquipmentRarity
  element: ItemElement
  effects: VfxEffectKind[]
  primaryColor: string
  secondaryColor: string
  glowColor: string
  borderColor: string
  slotBgStyle: string
  intensity: 0 | 1 | 2 | 3 | 4 | 5
  particleCount: number
  burstIntervalMs: number
  showGroundBeam: boolean
  groundBeamHeight: number
}

export const ITEM_CATEGORY_THAI_LABEL: Record<ItemCategory, string> = {
  weapon: 'อาวุธ',
  helmet: 'หมวก',
  armor: 'เสื้อเกราะ',
  gloves: 'ถุงมือ',
  boots: 'รองเท้า',
  shield: 'โล่',
  accessory: 'เครื่องประดับ',
  ring: 'แหวน',
  necklace: 'สร้อย',
  charm: 'เครื่องราง',
  special: 'ไอเทมพิเศษ',
  consumable: 'ของใช้',
  material: 'วัตถุดิบ',
}

export const ITEM_ELEMENT_THAI_LABEL: Record<ItemElement, { label: string; color: string }> = {
  physical: { label: 'กายภาพ', color: '#cbd5e1' },
  fire: { label: 'ธาตุไฟ', color: '#fb923c' },
  lightning: { label: 'ธาตุสายฟ้า', color: '#facc15' },
  ice: { label: 'ธาตุน้ำแข็ง', color: '#67e8f9' },
  shadow: { label: 'ธาตุมืด', color: '#c084fc' },
  holy: { label: 'ธาตุแสงศักดิ์สิทธิ์', color: '#fef08a' },
  arcane: { label: 'อาคมเวทมนตร์', color: '#818cf8' },
  venom: { label: 'ธาตุพิษอสรพิษ', color: '#4ade80' },
}

const ELEMENT_PALETTES: Record<ItemElement, { primary: string; secondary: string }> = {
  physical: { primary: '#e2e8f0', secondary: '#94a3b8' },
  fire: { primary: '#ff7b29', secondary: '#fde047' },
  lightning: { primary: '#facc15', secondary: '#38bdf8' },
  ice: { primary: '#67e8f9', secondary: '#e0f2fe' },
  shadow: { primary: '#a855f7', secondary: '#f43f5e' },
  holy: { primary: '#fde68a', secondary: '#ffffff' },
  arcane: { primary: '#818cf8', secondary: '#e879f9' },
  venom: { primary: '#4ade80', secondary: '#a3e635' },
}

export function inferItemElement(def?: {
  id?: string
  name?: string
  element?: ItemElement
  color?: string
}): ItemElement {
  if (def?.element) return def.element
  const text = `${def?.id ?? ''} ${def?.name ?? ''}`.toLowerCase()
  if (/(fire|flame|inferno|ignis|lava|phoenix|ember|เพลิง|ไฟ|ลาวา|อัคคี)/.test(text)) return 'fire'
  if (/(lightning|storm|tempest|thunder|vajra|สายฟ้า)/.test(text)) return 'lightning'
  if (/(ice|frost|glacial|snow|น้ำแข็ง|เหมันต์|วารี)/.test(text)) return 'ice'
  if (/(shadow|dark|abyss|void|night|demon|skull|vampire|reaper|มืด|อเวจี|ปีศาจ|รัตติกาล|วิญญาณ|กะโหลก)/.test(text)) return 'shadow'
  if (/(holy|seraph|angel|sun|excalibur|aegis|templar|แสง|ศักดิ์สิทธิ์|เทพ|เทวา|รุ่งอรุณ)/.test(text)) return 'holy'
  if (/(arcane|astral|crystal|rune|grimoire|magic|cosmos|อาคม|รูน|ผลึก|คริสตัล|มนตรา)/.test(text)) return 'arcane'
  if (/(venom|snake|anaconda|viper|poison|อสรพิษ|อนาคอนด้า)/.test(text)) return 'venom'
  return 'physical'
}

export function inferItemCategory(def?: {
  id?: string
  name?: string
  kind?: string
  slot?: string
  itemCategory?: ItemCategory
}): ItemCategory {
  if (def?.itemCategory) return def.itemCategory
  if (!def) return 'special'
  if (def.kind === 'weapon') return 'weapon'
  if (def.kind === 'consumable') return 'consumable'
  if (def.kind === 'material') {
    if (/(core|crystal|emblem|relic|key|orb|seal|essence)/.test(def.id ?? '')) return 'special'
    return 'material'
  }
  const text = `${def.id ?? ''} ${def.name ?? ''}`.toLowerCase()
  if (/(shield|aegis|bulwark|โล่)/.test(text)) return 'shield'
  if (/(helm|visor|diadem|crown|hood|หมวก|มงกุฎ)/.test(text)) return 'helmet'
  if (/(glove|gauntlet|bracer|armband|ถุงมือ|ปลอกแขน)/.test(text)) return 'gloves'
  if (/(boot|shoe|greave|sabaton|รองเท้า)/.test(text)) return 'boots'
  if (/(ring|แหวน)/.test(text)) return 'ring'
  if (/(necklace|pendant|collar|สร้อย)/.test(text)) return 'necklace'
  if (/(charm|talisman|seal|เครื่องราง)/.test(text)) return 'charm'
  if (def.slot === 'shoes') return 'boots'
  if (def.slot === 'accessory') return 'accessory'
  if (def.slot === 'cloak') return 'accessory'
  return 'armor'
}

export function resolveItemVfxSpec(
  rarity: EquipmentRarity,
  def?: { id?: string; name?: string; element?: ItemElement; color?: string },
): ItemVfxSpec {
  const element = inferItemElement(def)
  const elemPal = ELEMENT_PALETTES[element]

  if (rarity === 'common') {
    return {
      rarity,
      element,
      effects: [],
      primaryColor: '#94a3b8',
      secondaryColor: '#cbd5e1',
      glowColor: 'rgba(148, 163, 184, 0.14)',
      borderColor: '#475569',
      slotBgStyle: 'radial-gradient(circle at 50% 45%, rgba(71, 85, 105, 0.24), rgba(15, 23, 42, 0.92))',
      intensity: 0,
      particleCount: 0,
      burstIntervalMs: 0,
      showGroundBeam: false,
      groundBeamHeight: 0,
    }
  }

  if (rarity === 'uncommon') {
    return {
      rarity,
      element,
      effects: ['glow'],
      primaryColor: '#34d399',
      secondaryColor: '#a7f3d0',
      glowColor: 'rgba(52, 211, 153, 0.26)',
      borderColor: '#34d399',
      slotBgStyle: 'radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.25), rgba(10, 24, 24, 0.94))',
      intensity: 1,
      particleCount: 1,
      burstIntervalMs: 0,
      showGroundBeam: false,
      groundBeamHeight: 0,
    }
  }

  if (rarity === 'rare') {
    return {
      rarity,
      element,
      effects: ['glow', 'spark', 'shine_sweep'],
      primaryColor: '#38bdf8',
      secondaryColor: '#bae6fd',
      glowColor: 'rgba(56, 189, 248, 0.4)',
      borderColor: '#38bdf8',
      slotBgStyle: 'radial-gradient(circle at 50% 45%, rgba(14, 165, 233, 0.34), rgba(12, 22, 42, 0.95))',
      intensity: 2,
      particleCount: 3,
      burstIntervalMs: 0,
      showGroundBeam: false,
      groundBeamHeight: 14,
    }
  }

  if (rarity === 'epic') {
    const primary = element === 'physical' ? '#c084fc' : elemPal.primary
    const secondary = element === 'physical' ? '#f0abfc' : elemPal.secondary
    return {
      rarity,
      element,
      effects: ['glow', 'aura', 'spark', 'rotating_rune'],
      primaryColor: primary,
      secondaryColor: secondary,
      glowColor: 'rgba(192, 132, 252, 0.52)',
      borderColor: '#c084fc',
      slotBgStyle: 'radial-gradient(circle at 50% 45%, rgba(147, 51, 234, 0.4), rgba(20, 12, 38, 0.96))',
      intensity: 3,
      particleCount: 5,
      burstIntervalMs: 4200,
      showGroundBeam: true,
      groundBeamHeight: 24,
    }
  }

  if (rarity === 'legendary') {
    const elemEffect: VfxEffectKind =
      element === 'fire'
        ? 'flame'
        : element === 'lightning'
          ? 'lightning'
          : element === 'ice'
            ? 'ice'
            : element === 'shadow' || element === 'venom'
              ? 'shadow'
              : 'holy'
    const primary = element === 'physical' ? '#fbbf24' : elemPal.primary
    const secondary = element === 'physical' ? '#fef08a' : elemPal.secondary
    return {
      rarity,
      element,
      effects: [
        'glow',
        'aura',
        elemEffect,
        'spark',
        'shine_sweep',
        'animated_border',
        'periodic_burst',
      ],
      primaryColor: primary,
      secondaryColor: secondary,
      glowColor: 'rgba(251, 191, 36, 0.68)',
      borderColor: '#fbbf24',
      slotBgStyle:
        'radial-gradient(circle at 50% 45%, rgba(245, 158, 11, 0.44), rgba(40, 22, 8, 0.96))',
      intensity: 4,
      particleCount: 8,
      burstIntervalMs: 3200,
      showGroundBeam: true,
      groundBeamHeight: 38,
    }
  }

  // Mythic — เทพ / ระดับสูงสุด (clearly surpasses Legendary with multi-layer aura, rune circle, stars & mini-burst)
  const elemEffect: VfxEffectKind =
    element === 'fire'
      ? 'flame'
      : element === 'lightning'
        ? 'lightning'
        : element === 'ice'
          ? 'ice'
          : element === 'shadow' || element === 'venom'
            ? 'shadow'
            : 'holy'
  const primary = element === 'physical' ? '#fb7185' : elemPal.primary
  const secondary = '#fde047'
  return {
    rarity: 'mythic',
    element,
    effects: [
      'glow',
      'aura',
      elemEffect,
      'rotating_rune',
      'star_sparkles',
      'spark',
      'shine_sweep',
      'animated_border',
      'periodic_burst',
    ],
    primaryColor: primary,
    secondaryColor: secondary,
    glowColor: 'rgba(251, 113, 133, 0.85)',
    borderColor: '#fb7185',
    slotBgStyle:
      'radial-gradient(circle at 50% 42%, rgba(244, 63, 94, 0.48), rgba(168, 85, 247, 0.3) 48%, rgba(16, 10, 26, 0.98) 92%)',
    intensity: 5,
    particleCount: 12,
    burstIntervalMs: 2400,
    showGroundBeam: true,
    groundBeamHeight: 54,
  }
}
