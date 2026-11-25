import type { ItemDef } from './data'
import { inferItemCategory, inferItemElement, type ItemElement } from './item-vfx'

export type Item25dArchetype =
  | 'sword'
  | 'greatsword'
  | 'katana'
  | 'hammer'
  | 'club'
  | 'staff'
  | 'tome'
  | 'flask_bomb'
  | 'bow'
  | 'crossbow'
  | 'dagger'
  | 'claw'
  | 'shuriken'
  | 'wristblade'
  | 'helmet_helm'
  | 'helmet_hood'
  | 'helmet_crown'
  | 'armor_plate'
  | 'armor_robe'
  | 'armor_leather'
  | 'cloak'
  | 'gloves'
  | 'boots'
  | 'shield_wood'
  | 'shield_steel'
  | 'shield_serpent'
  | 'shield_dark'
  | 'ring'
  | 'necklace'
  | 'earring'
  | 'charm'
  | 'potion'
  | 'scroll'
  | 'tome_item'
  | 'ticket'
  | 'bag'
  | 'chest_box'
  | 'key'
  | 'crystal'
  | 'orb'
  | 'emblem'
  | 'magnet'
  | 'ore'
  | 'herb'
  | 'fish'
  | 'food_bowl'
  | 'food_platter'
  | 'gel'
  | 'mushroom'
  | 'ectoplasm'
  | 'fang'
  | 'horn'
  | 'bone'
  | 'cloth'
  | 'scrap'

export interface Item25dVisualSpec {
  id: string
  archetype: Item25dArchetype
  element: ItemElement
  primaryHex: string
  secondaryHex: string
  accentHex: string
  glowHex: string
  tier: number
  seed: number
  isMythicOrLegend: boolean
}

function hashId(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function normalizeHex(hex: string | undefined, fallback: string): string {
  if (!hex || typeof hex !== 'string') return fallback
  const clean = hex.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean
  if (/^#[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`
  }
  return fallback
}

const ELEMENT_PALETTES: Record<ItemElement, { accent: string; glow: string; metalTint: string }> = {
  physical: { accent: '#fbbf24', glow: '#fde68a', metalTint: '#cbd5e1' },
  fire: { accent: '#fb923c', glow: '#ff6b35', metalTint: '#f97316' },
  ice: { accent: '#67e8f9', glow: '#38bdf8', metalTint: '#bae6fd' },
  lightning: { accent: '#fde047', glow: '#38bdf8', metalTint: '#fef08a' },
  venom: { accent: '#4ade80', glow: '#22c55e', metalTint: '#86efac' },
  shadow: { accent: '#c084fc', glow: '#a855f7', metalTint: '#94a3b8' },
  holy: { accent: '#fef08a', glow: '#fde047', metalTint: '#f8fafc' },
  arcane: { accent: '#a78bfa', glow: '#38bdf8', metalTint: '#c4b5fd' },
}

export function classifyItem25dArchetype(
  def: Pick<ItemDef, 'id' | 'name' | 'kind' | 'slot' | 'weaponType' | 'itemCategory' | 'icon'>,
): Item25dArchetype {
  const id = def.id.toLowerCase()
  const name = def.name.toLowerCase()
  const cat = inferItemCategory(def)

  // Weapons
  if (cat === 'weapon' || def.kind === 'weapon') {
    if (id.includes('molotov') || id.includes('flask') || id.includes('bomb') || id.includes('fizz') || id.includes('mythic_elixir') || name.includes('ขวดระเบิด') || name.includes('ระเบิดเพลิง') || name.includes('ขวดฟองฟู่') || name.includes('ขวดเพลิง') || name.includes('ขวดสุริยัน') || name.includes('ขวดยาอมฤต')) {
      return 'flask_bomb'
    }
    if (id.includes('grimoire') || id.includes('tome') || name.includes('ตำรา') || name.includes('คัมภีร์')) {
      return 'tome'
    }
    if (id === 'weapon_004' || name.includes('ค้อน')) return 'hammer'
    if (def.weaponType === 'stick' || def.icon === 'stick') return 'club'
    if (id === 'weapon_031' || name.includes('หน้าไม้')) return 'crossbow'
    if (def.weaponType === 'bow' || def.icon === 'bow' || name.includes('ธนู')) return 'bow'
    if (id === 'weapon_032' || id === 'weapon_033' || name.includes('กรงเล็บ')) return 'claw'
    if (id === 'weapon_034' || name.includes('ดาวกระจาย')) return 'shuriken'
    if (id === 'weapon_035' || id === 'weapon_036' || name.includes('ปลอกแขน')) return 'wristblade'
    if (def.weaponType === 'dagger' || def.icon === 'dagger' || name.includes('มีด') || name.includes('กริช') || name.includes('เขี้ยว')) {
      return 'dagger'
    }
    if (def.weaponType === 'staff' || def.icon === 'staff' || name.includes('คทา') || name.includes('คฑา')) {
      return 'staff'
    }
    if (name.includes('ดาบใหญ่') || id.includes('sovereign') || id.includes('dragon_slayer') || id.includes('greatsword')) {
      return 'greatsword'
    }
    if (name.includes('เขี้ยว') || name.includes('อสรพิษ') || name.includes('เงา') || id.includes('shadow')) {
      return 'katana'
    }
    return 'sword'
  }

  // Shields
  if (cat === 'shield') {
    if (id === 'weapon_018' || name.includes('ไม้')) return 'shield_wood'
    if (id === 'weapon_015' || name.includes('อนาคอนด้า') || name.includes('อสรพิษ')) return 'shield_serpent'
    if (id === 'weapon_017' || name.includes('โลกมืด') || name.includes('เงา')) return 'shield_dark'
    return 'shield_steel'
  }

  // Helmets
  if (cat === 'helmet') {
    if (id === 'weapon_012' || name.includes('มงกุฎ')) return 'helmet_crown'
    if (id === 'weapon_010' || id === 'weapon_011' || name.includes('คลุมหัว') || name.includes('นินจา')) return 'helmet_hood'
    return 'helmet_helm'
  }

  // Accessories (check before generic cloak slot so charms/talismans/earrings with slot='cloak' or 'accessory' get proper icons)
  if (cat === 'ring' || name.includes('แหวน')) return 'ring'
  if (cat === 'necklace' || name.includes('สร้อย')) return 'necklace'
  if (cat === 'charm' || name.includes('เครื่องราง') || name.includes('ตราประทับ')) return 'charm'
  if (cat === 'accessory') {
    if (name.includes('ต่างหู')) return 'earring'
    return 'necklace'
  }

  // Boots, Gloves, Armor, Cloaks
  if (cat === 'boots' || def.slot === 'shoes' || def.icon === 'shoes') return 'boots'
  if (cat === 'gloves') return 'gloves'
  if (def.slot === 'cloak' || def.icon === 'cloak' || name.includes('ผ้าคลุม')) return 'cloak'
  if (cat === 'armor') {
    if (id === 'cloth_armor' || id === 'weapon_019' || id === 'weapon_021' || name.includes('ผ้า') || name.includes('นักบวช')) {
      return 'armor_robe'
    }
    if (id === 'leather_armor' || name.includes('หนัง')) return 'armor_leather'
    return 'armor_plate'
  }

  // Consumables / Materials / Special
  if (id === 'event_token') return 'ticket'
  if (id === 'event_lucky_box' || id === 'event_mythic_chest') return 'chest_box'
  if (id === 'event_festival_feast') return 'food_platter'
  if (id === 'imperial_gold_key' || name.includes('กุญแจ')) return 'key'
  if (id === 'starlight_loot_magnet' || name.includes('แม่เหล็ก')) return 'magnet'
  if (id === 'ancient_forge_emblem' || id === 'soul_awakening_relic' || id === 'mythic_awakening_core') return 'emblem'
  if (id === 'companion_gacha_box' || name.includes('กล่องสุ่ม')) return 'chest_box'
  if (id === 'town_warp_tome' || name.includes('คัมภีร์วาร์ป')) return 'tome_item'
  if (id.includes('fish') || name.includes('ปลา')) {
    return id.startsWith('food_') ? 'food_platter' : 'fish'
  }
  if (id === 'food_hero_feast' || id === 'food_dragon_soup') return 'food_bowl'
  if (id === 'food_miner_tonic') return 'potion'
  if (id.startsWith('herb_') || name.includes('สมุนไพร') || name.includes('ดอกจันทร์')) return 'herb'
  if (id.startsWith('ore_') || name.includes('แร่')) return 'ore'
  if (id === 'mushroom_cap' || name.includes('เห็ด')) return 'mushroom'
  if (id === 'ectoplasm' || name.includes('วิญญาณ')) return 'ectoplasm'
  if (id === 'demon_horn' || name.includes('เขาปีศาจ')) return 'horn'
  if (id === 'wolf_fang' || id === 'goblin_ear' || def.icon === 'fang') return 'fang'
  if (id === 'bone' || def.icon === 'bone') return 'bone'
  if (id === 'torn_cloth') return 'cloth'
  if (id === 'cracked_claw' || id === 'monster_scrap' || def.icon === 'junk') return 'scrap'
  if (id === 'slime_gel' || def.icon === 'gel') return 'gel'
  if (def.icon === 'ticket' || id.includes('ticket') || id.includes('vip_card')) return 'ticket'
  if (def.icon === 'scroll' || id.includes('scroll')) return 'scroll'
  if (def.icon === 'bag' || id.includes('bag')) return 'bag'
  if (def.icon === 'potion' || id.includes('potion') || id.includes('elixir') || id.includes('asura_')) return 'potion'
  if (id.includes('orb') || name.includes('ลูกแก้ว')) return 'orb'
  if (def.icon === 'crystal' || def.icon === 'stone' || def.icon === 'core' || id.includes('stone') || id.includes('crystal')) {
    return 'crystal'
  }
  return 'crystal'
}

export function buildItem25dVisualSpec(def: ItemDef): Item25dVisualSpec {
  const element = inferItemElement(def)
  const elMeta = ELEMENT_PALETTES[element]
  const archetype = classifyItem25dArchetype(def)
  const baseColor = normalizeHex(def.color, '#94a3b8')
  const tier = Math.max(1, def.tier ?? 1)
  const seed = hashId(def.id)

  // Vary catalog/weapon series subtly so each item has distinct secondary/accent richness
  const tierGold = tier >= 5 ? '#fde047' : tier >= 3 ? '#f59e0b' : '#cbd5e1'
  const secondaryHex =
    element !== 'physical'
      ? elMeta.metalTint
      : archetype === 'potion' || archetype === 'flask_bomb'
        ? '#e2e8f0'
        : tierGold

  const accentHex = element !== 'physical' ? elMeta.accent : tier >= 4 ? '#fbbf24' : '#f8fafc'
  const glowHex = element !== 'physical' ? elMeta.glow : baseColor
  const isMythicOrLegend =
    def.defaultRarity === 'mythic' || def.defaultRarity === 'legendary' || def.id.startsWith('gm888_')

  return {
    id: def.id,
    archetype,
    element,
    primaryHex: baseColor,
    secondaryHex,
    accentHex,
    glowHex,
    tier,
    seed,
    isMythicOrLegend,
  }
}
