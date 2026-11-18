import type { FashionItemDef, FashionSlot, FashionState } from './types'

export const FASHION_SLOT_LABELS: Record<FashionSlot, string> = {
  costume: 'ชุดคอสตูม (Costume)',
  hair: 'ทรงผม (Hair Style)',
  aura: 'ออร่า (Aura)',
  wings: 'ปีก (Wings)',
  mountAppearance: 'รูปลักษณ์สัตว์ขี่ (Mount Skin)',
}

export const PREMIUM_FASHION_ITEMS: FashionItemDef[] = [
  // ---- Costumes ----
  {
    id: 'costume_royal_knight',
    slot: 'costume',
    name: 'ชุดอัศวินราชสำนัก',
    description: 'ชุดเกราะคลุมผ้าสีน้ำเงินทองสง่างามสำหรับนักรบแนวหน้า',
    rarity: 'อีปิก',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e3a8a',
    accentColor: '#fbbf24',
    paletteOverride: { body: '#2563eb', legs: '#1e293b', accent: '#fbbf24', hat: '#eab308' },
  },
  {
    id: 'costume_starlight_mage',
    slot: 'costume',
    name: 'อาภรณ์จอมเวทแห่งดวงดาว',
    description: 'ผ้าคลุมดาราสีม่วงครามปักลวดลายกลุ่มดาวเรืองแสง',
    rarity: 'ตำนาน',
    primaryColor: '#a855f7',
    secondaryColor: '#312e81',
    accentColor: '#67e8f9',
    paletteOverride: { body: '#6d28d9', legs: '#1e1b4b', accent: '#67e8f9', hat: '#7c3aed' },
  },
  {
    id: 'costume_shadow_phantom',
    slot: 'costume',
    name: 'ชุดเงารัตติกาลลึกลับ',
    description: 'ชุดนักฆ่าผ้าไหมทมิฬตัดขอบแดงเพลิงเคลื่อนไหวเงียบกริบ',
    rarity: 'อีปิก',
    primaryColor: '#f43f5e',
    secondaryColor: '#18181b',
    accentColor: '#fb7185',
    paletteOverride: { body: '#1f2937', legs: '#09090b', accent: '#f43f5e', hat: '#111827' },
  },
  {
    id: 'costume_vip_gold_regalia',
    slot: 'costume',
    name: 'อาภรณ์ราชันย์ทองคำ (VIP 3+)',
    description: 'ชุดเกียรติยศสีทองคำขาวเฉพาะสมาชิก VIP 3 ขึ้นไป',
    rarity: 'ตำนาน',
    primaryColor: '#fbbf24',
    secondaryColor: '#78350f',
    accentColor: '#fef08a',
    vipRequired: 3,
    paletteOverride: { body: '#d97706', legs: '#451a03', accent: '#fef08a', hat: '#f59e0b' },
  },

  // ---- Hair Styles ----
  {
    id: 'hair_bronze_crest',
    slot: 'hair',
    name: 'ทรงผมเปลวทองสัมฤทธิ์ (VIP 1+)',
    description: 'เปลี่ยนสีผมเป็นประกายทองสัมฤทธิ์เฉพาะสมาชิก VIP',
    rarity: 'หายาก',
    primaryColor: '#f59e0b',
    secondaryColor: '#92400e',
    accentColor: '#fde68a',
    vipRequired: 1,
    paletteOverride: { hair: '#f59e0b' },
  },
  {
    id: 'hair_crimson_spike',
    slot: 'hair',
    name: 'ทรงผมเพลิงชาดสยาย',
    description: 'ทรงผมสีแดงชาดเพลิงดุดันตัดกับเกราะทุกสายอาชีพ',
    rarity: 'หายาก',
    primaryColor: '#ef4444',
    secondaryColor: '#7f1d1d',
    accentColor: '#fca5a5',
    paletteOverride: { hair: '#ef4444' },
  },
  {
    id: 'hair_silver_lunar',
    slot: 'hair',
    name: 'ทรงผมเงินแสงจันทร์',
    description: 'เส้นผมสีเงินยวบอ่อนนุ่มสะท้อนแสงจันทร์ยามค่ำคืน',
    rarity: 'อีปิก',
    primaryColor: '#e2e8f0',
    secondaryColor: '#64748b',
    accentColor: '#bae6fd',
    paletteOverride: { hair: '#e2e8f0' },
  },
  {
    id: 'hair_aurora_prism',
    slot: 'hair',
    name: 'ทรงผมออโรราเรืองแสง',
    description: 'เส้นผมสีฟ้าน้ำทะเลมรกตเปล่งประกายเหนือธรรมชาติ',
    rarity: 'ตำนาน',
    primaryColor: '#2dd4bf',
    secondaryColor: '#0f766e',
    accentColor: '#f0abfc',
    paletteOverride: { hair: '#2dd4bf' },
  },

  // ---- Auras ----
  {
    id: 'sunfire_aura',
    slot: 'aura',
    name: 'ออร่าเพลิงสุริยัน',
    description: 'เปลวไฟสีทองไล่เฉดล้อมตัว พร้อมวงแหวนแสงที่พื้น',
    rarity: 'อีปิก',
    primaryColor: '#fb923c',
    secondaryColor: '#ef4444',
    accentColor: '#fde68a',
    linkedGemItemId: 'sunfire_aura',
    paletteOverride: { auraGlow: '#fb923c' },
  },
  {
    id: 'aura_silver_mist',
    slot: 'aura',
    name: 'ออร่าหมอกเงิน (VIP 2+)',
    description: 'ม่านละอองเงินนุ่มนวลหมุนวนรอบเท้าสำหรับ VIP 2 ขึ้นไป',
    rarity: 'อีปิก',
    primaryColor: '#cbd5e1',
    secondaryColor: '#475569',
    accentColor: '#e0f2fe',
    vipRequired: 2,
    paletteOverride: { auraGlow: '#cbd5e1' },
  },
  {
    id: 'aura_frost_nova',
    slot: 'aura',
    name: 'ออร่าผลึกเหมันต์',
    description: 'วงแหวนน้ำแข็งผลึกคริสตัลหมุนวนรอบตัวละคร',
    rarity: 'อีปิก',
    primaryColor: '#38bdf8',
    secondaryColor: '#0369a1',
    accentColor: '#e0f2fe',
    paletteOverride: { auraGlow: '#38bdf8' },
  },
  {
    id: 'aura_celestial_gold',
    slot: 'aura',
    name: 'ออร่าเทพดาราสวรรค์',
    description: 'วงแหวนดาราจักรสีทองคำ-ม่วงเปล่งรัศมีรอบตัวตลอดเวลา',
    rarity: 'มายา',
    primaryColor: '#fbbf24',
    secondaryColor: '#9333ea',
    accentColor: '#fef08a',
    paletteOverride: { auraGlow: '#fbbf24' },
  },

  // ---- Wings ----
  {
    id: 'wing_seraph',
    slot: 'wings',
    name: 'ปีกนางฟ้าแสงอรุณ',
    description: 'ปีกสีทองขาวเปล่งประกาย',
    rarity: 'อีปิก',
    primaryColor: '#fef08a',
    secondaryColor: '#f59e0b',
    accentColor: '#ffffff',
    linkedLegacyCosmeticId: 'wing_seraph',
  },
  {
    id: 'wing_ember',
    slot: 'wings',
    name: 'ปีกเพลิงมังกรแดง',
    description: 'ปีกไฟร้อนแรงพร้อมละอองถ่าน',
    rarity: 'อีปิก',
    primaryColor: '#fb7185',
    secondaryColor: '#ea580c',
    accentColor: '#fde68a',
    linkedLegacyCosmeticId: 'wing_ember',
  },
  {
    id: 'wing_cosmos',
    slot: 'wings',
    name: 'ปีกจักรวาลออโรรา',
    description: 'ปีกดาราสีม่วงครามระดับตำนาน',
    rarity: 'ตำนาน',
    primaryColor: '#a78bfa',
    secondaryColor: '#22d3ee',
    accentColor: '#f0abfc',
    linkedLegacyCosmeticId: 'wing_cosmos',
  },
  {
    id: 'nebula_dragon_wings',
    slot: 'wings',
    name: 'ปีกมังกรเนบิวลา',
    description: 'ปีกผลึกขนาดใหญ่ ไล่สีม่วงครามและมีดาวเคลื่อนในปีก',
    rarity: 'ตำนาน',
    primaryColor: '#a78bfa',
    secondaryColor: '#4f46e5',
    accentColor: '#67e8f9',
    linkedGemItemId: 'nebula_dragon_wings',
  },
  {
    id: 'wing_vip_platinum',
    slot: 'wings',
    name: 'ปีกผลึกแพลทินัม (VIP 4+)',
    description: 'ปีกคริสตัลแพลทินัมเฉพาะสมาชิก VIP 4 ขึ้นไป',
    rarity: 'มายา',
    primaryColor: '#67e8f9',
    secondaryColor: '#0284c7',
    accentColor: '#f8fafc',
    vipRequired: 4,
  },

  // ---- Mount Appearances ----
  {
    id: 'mount_skin_astral',
    slot: 'mountAppearance',
    name: 'เกราะสัตว์ขี่แสงดารา (Astral Skin)',
    description: 'คลุมออร่ากลุ่มดาวสีฟ้าครามรอบตัวสัตว์ขี่ทุกชนิดขณะขี่',
    rarity: 'อีปิก',
    primaryColor: '#38bdf8',
    secondaryColor: '#312e81',
    accentColor: '#c084fc',
    paletteOverride: { auraGlow: '#38bdf8' },
  },
  {
    id: 'mount_skin_inferno',
    slot: 'mountAppearance',
    name: 'อาชาเพลิงโลกันตร์ (Inferno Skin)',
    description: 'แต่งเติมเปลวไฟสีส้มทองรอบสัตว์ขี่พร้อมรอยเท้าประกายไฟ',
    rarity: 'ตำนาน',
    primaryColor: '#fb923c',
    secondaryColor: '#991b1b',
    accentColor: '#fde047',
    paletteOverride: { auraGlow: '#f97316' },
  },
  {
    id: 'mount_skin_diamond_royal',
    slot: 'mountAppearance',
    name: 'ออร่าสัตว์ขี่เพชรจักรพรรดิ (VIP 5)',
    description: 'รัศมีคริสตัลสีชมพูม่วงสำหรับสัตว์ขี่ของสมาชิก VIP 5 เท่านั้น',
    rarity: 'มายา',
    primaryColor: '#f0abfc',
    secondaryColor: '#7e22ce',
    accentColor: '#67e8f9',
    vipRequired: 5,
    paletteOverride: { auraGlow: '#e879f9' },
  },
]

export function getFashionItemDef(id: string | null | undefined): FashionItemDef | null {
  if (!id) return null
  return PREMIUM_FASHION_ITEMS.find((item) => item.id === id) ?? null
}

export function createDefaultFashionState(): FashionState {
  return {
    unlockedIds: [],
    equipped: {
      costume: null,
      hair: null,
      aura: null,
      wings: null,
      mountAppearance: null,
    },
  }
}

export function sanitizeFashionState(
  raw: unknown,
  legacy?: {
    ownedGemItems?: string[]
    equippedGemFashion?: string | null
    unlockedCosmetics?: string[]
    equippedWing?: string | null
  },
): FashionState {
  const def = createDefaultFashionState()
  const obj = raw && typeof raw === 'object' ? (raw as Partial<FashionState>) : {}
  const validIds = new Set(PREMIUM_FASHION_ITEMS.map((i) => i.id))
  const unlocked = new Set<string>(
    Array.isArray(obj.unlockedIds)
      ? obj.unlockedIds.filter((id): id is string => typeof id === 'string' && validIds.has(id))
      : [],
  )

  // Sync legacy unlocked cosmetics & gem fashion automatically
  for (const gemId of legacy?.ownedGemItems ?? []) {
    if (validIds.has(gemId)) unlocked.add(gemId)
  }
  for (const cosId of legacy?.unlockedCosmetics ?? []) {
    if (validIds.has(cosId)) unlocked.add(cosId)
  }

  const eqRaw = obj.equipped && typeof obj.equipped === 'object' ? obj.equipped : {}
  const pick = (slot: FashionSlot, fallback: string | null = null): string | null => {
    const val = (eqRaw as Record<string, unknown>)[slot]
    if (typeof val === 'string' && unlocked.has(val)) return val
    if (fallback && unlocked.has(fallback)) return fallback
    return null
  }

  const gemFashion = legacy?.equippedGemFashion ?? null
  const legacyWing = legacy?.equippedWing ?? null

  return {
    unlockedIds: [...unlocked],
    equipped: {
      costume: pick('costume'),
      hair: pick('hair'),
      aura: pick('aura', gemFashion === 'sunfire_aura' ? 'sunfire_aura' : null),
      wings: pick(
        'wings',
        legacyWing && validIds.has(legacyWing)
          ? legacyWing
          : gemFashion === 'nebula_dragon_wings'
            ? 'nebula_dragon_wings'
            : null,
      ),
      mountAppearance: pick('mountAppearance'),
    },
  }
}

/** Balanced Pet stat bonus ceilings so pets supplement rather than overpower character gear */
export const PET_STAT_CAPS = {
  maxHpBonus: 650,
  maxMpBonus: 220,
  maxAtkBonus: 140,
  maxDefBonus: 90,
  maxCompanionAtk: 420,
  maxExpBonusPct: 25,
  maxGoldBonusPct: 30,
} as const

export interface PetSkillDef {
  id: string
  name: string
  description: string
  triggerLabel: string
}

export const PET_SKILL_MAP: Record<string, PetSkillDef> = {
  buddy_slime: { id: 'slime_splash', name: 'กระสุนเมือกใส', description: 'ยิงเมือกช่วยตีและเพิ่ม EXP เล็กน้อย', triggerLabel: 'โจมตีอัตโนมัติ + Passive EXP' },
  flame_fox: { id: 'fox_flare', name: 'ประกายหางเพลิง', description: 'ยิงลูกไฟเผาผลาญและเร่งการดรอปทอง', triggerLabel: 'โจมตีอัตโนมัติ + Passive Gold' },
  crystal_owl: { id: 'arcane_beam', name: 'ลำแสงผลึกเวท', description: 'ยิงลำแสงเวทและเพิ่มการรับค่าประสบการณ์', triggerLabel: 'โจมตีอัตโนมัติ + Passive EXP' },
  moonlight_firefly: { id: 'lunar_magnet', name: 'แสงจันทร์เก็บของ', description: 'เก็บไอเทมตกอัตโนมัติพร้อมยิงประกายแสงจันทร์', triggerLabel: 'Auto-Loot + โจมตี' },
  gem_raccoon: { id: 'merchant_charm', name: 'มนต์พ่อค้าเพชร', description: 'เพิ่มทองดรอปมหาศาลและช่วยเก็บดรอปอัตโนมัติ', triggerLabel: 'Auto-Loot + Gold Surge' },
  aurora_cloud_dragon: { id: 'aurora_breath', name: 'ลมหายใจแสงเหนือ', description: 'โจมตีรุนแรงสูงสุด ดูดดรอปไกล และบัฟ EXP/Gold', triggerLabel: 'Auto-Loot + Dragon Breath' },
  phao_lotus: { id: 'lotus_petal', name: 'กลีบปราณบัวแก้ว', description: 'ปล่อยกลีบปราณบัวช่วยโจมตีและเสริมพลังป้องกัน', triggerLabel: 'โจมตีอัตโนมัติ + DEF Aura' },
  phao_gold_naga: { id: 'naga_orb', name: 'แก้วมรกตนาคา', description: 'พ่นลูกแก้วนาคาและเพิ่มทองดรอปต่อเนื่อง', triggerLabel: 'โจมตีอัตโนมัติ + Gold Aura' },
  phao_celestial: { id: 'planetary_ray', name: 'ลำแสงดาวเคราะห์', description: 'ยิงคลื่นสุริยะ-จันทราความเร็วสูง', triggerLabel: 'โจมตีอัตโนมัติ + Dual Buff' },
  phao_phantom: { id: 'abyss_soul', name: 'วิญญาณอเวจี', description: 'โจมตีระยะไกลแรงสูงและเสริมพลังโจมตีตัวละคร', triggerLabel: 'โจมตีอัตโนมัติ + ATK Surge' },

  // Common (Lv.1-10) Phao Beasts
  phao_water_slime: { id: 'hydro_bubble', name: 'ฟองน้ำกระแทก', description: 'พ่นฟองน้ำบริสุทธิ์ช่วยโจมตีและเพิ่มเลือดสูงสุด', triggerLabel: 'โจมตีอัตโนมัติ + Hydro HP' },
  phao_dawn_rooster: { id: 'dawn_peck', name: 'จิกจู่โจมรุ่งอรุณ', description: 'พุ่งจิกอย่างรวดเร็วพร้อมเสียงขันปลุกขวัญเพิ่ม ATK', triggerLabel: 'โจมตีไว + Dawn ATK' },
  phao_husky_kitten: { id: 'collar_pounce', name: 'กรงเล็บกระดิ่งแดง', description: 'กระโจนข่วนต่อเนื่องและเพิ่มโอกาสรับ EXP', triggerLabel: 'โจมตีอัตโนมัติ + Agile Claw' },
  phao_shiba_scarf: { id: 'scarf_dash', name: 'เขี้ยวชิบะผ้าพันคอ', description: 'พุ่งกัดว่องไวและนำโชคลาภทองคำให้เจ้านาย', triggerLabel: 'โจมตีอัตโนมัติ + Lucky Gold' },

  // Uncommon (Lv.11-20) Phao Beasts
  phao_spear_goblin: { id: 'goblin_thrust', name: 'แทงหอกสายฟ้าแลบ', description: 'ควงหอกไม้ปลายทองแทงทะลวงเกราะศัตรู', triggerLabel: 'โจมตีประชิด/ไกล + Spear Pierce' },
  phao_silver_wolf: { id: 'silver_fang', name: 'เขี้ยวหมาป่าขนเงิน', description: 'ขย้ำศัตรูด้วยเขี้ยวเงินและเสริมพลังโจมตี', triggerLabel: 'โจมตีอัตโนมัติ + Wolf Pack' },
  phao_ribbon_bunny: { id: 'ribbon_hop', name: 'กระโดดฟาดโบว์ชมพู', description: 'กระโดดหมุนตัวปล่อยคลื่นพลังน่ารักฟื้นพลังเวท', triggerLabel: 'โจมตีอัตโนมัติ + MP Blessing' },
  phao_acorn_squirrel: { id: 'acorn_barrage', name: 'กระสุนลูกโอ๊กทอง', description: 'ขว้างลูกโอ๊กแม่นยำและเพิ่มทองจากการล่า', triggerLabel: 'ยิงรัว + Harvest Gold' },

  // Rare (Lv.21-30) Phao Beasts
  phao_ember_ninetail: { id: 'ember_tails', name: 'เพลิงเก้าหางปะทุ', description: 'สะบัดหางเพลิงเก้าแฉกเผาผลาญมอนสเตอร์เป็นชุด', triggerLabel: 'โจมตีไฟ + Ember Surge' },
  phao_sky_eagle: { id: 'gale_talon', name: 'กรงเล็บพายุเวหา', description: 'โฉบโจมตีจากฟ้าด้วยคลื่นลมกรดคมกริบ', triggerLabel: 'โจมตีไว + Sky Critical' },
  phao_frost_penguin: { id: 'chill_slide', name: 'สไลด์พายุหิมะ', description: 'ปล่อยเกล็ดน้ำแข็งเย็นเยือกเสริมพลังป้องกัน', triggerLabel: 'โจมตีน้ำแข็ง + Frost DEF' },
  phao_stone_tortoise: { id: 'bastion_shell', name: 'กระดองศิลาสะท้อน', description: 'กระแทกคลื่นปฐพีและมอบเกราะแข็งแกร่งให้ผู้สวมผอบ', triggerLabel: 'กระแทกศิลา + Iron Guard' },

  // Epic (Lv.31-40) Phao Beasts
  phao_crimson_dragon: { id: 'crimson_flame', name: 'ลมหายใจมังกรแดง', description: 'พ่นเพลิงมังกรสีชาดรุนแรงและเพิ่มพลังโจมตีสูง', triggerLabel: 'พ่นไฟมังกร + Dragon ATK' },
  phao_prism_unicorn: { id: 'prism_beam', name: 'ลำแสงรุ้งสวรรค์', description: 'ยิงลำแสงเจ็ดสีจากเขาคริสตัลเพิ่ม EXP และ MP', triggerLabel: 'ลำแสงรุ้ง + Wisdom EXP' },
  phao_sapphire_wisp: { id: 'comet_spark', name: 'ดาวตกเพลิงคราม', description: 'ยิงลูกไฟดาวหางสีครามถี่สูงและเสริมพลังเวท', triggerLabel: 'ยิงดาวหาง + Arcane Surge' },
  phao_abyss_neko: { id: 'shadow_flare', name: 'กรงเล็บเพลิงม่วงอเวจี', description: 'ฟาดเพลิงเงาอเวจีเจาะเกราะและดูดทรัพย์ทองคำ', triggerLabel: 'เพลิงเงา + Abyss Fortune' },

  // Legendary (Lv.41-50) Phao Beasts
  phao_sacred_kitsune: { id: 'sacred_illusion', name: 'มนตราเก้าหางศักดิ์สิทธิ์', description: 'ปล่อยลูกแก้วปราณสวรรค์ฟื้นฟูพลังและเร่ง EXP', triggerLabel: 'มนตราเทพ + Sacred EXP' },
  phao_solar_phoenix: { id: 'solar_nova', name: 'ปีกเพลิงสุริยัน', description: 'กางปีกฟีนิกซ์สาดเปลวสุริยะเผาผลาญศัตรูรอบด้าน', triggerLabel: 'เปลวสุริยะ + Phoenix Rebirth' },
  phao_glacial_wolf: { id: 'glacier_howl', name: 'เขี้ยวเหมันต์ปีกน้ำแข็ง', description: 'โผบินปล่อยคมดาบน้ำแข็งทะลุทะลวงพร้อมเกราะเยือกแข็ง', triggerLabel: 'คมน้ำแข็ง + Frost Armor' },
  phao_armored_lion: { id: 'royal_roar', name: 'คำรามราชสีห์เกราะทอง', description: 'พุ่งชนด้วยเกราะนักรบทองคำเสริม ATK/DEF มหาศาล', triggerLabel: 'คำรามพิชิต + Paladin Aura' },

  // Mythic (Lv.51-60) Phao Beasts
  phao_obsidian_dragon: { id: 'bloodmoon_breath', name: 'เพลิงโลหิตมังกรทมิฬ', description: 'พ่นอัคคีสีชาดแห่งรัตติกาลสร้างความเสียหายรุนแรงมาก', triggerLabel: 'เพลิงทมิฬ + Mythic ATK' },
  phao_seraph_cat: { id: 'halo_sanctuary', name: 'วงแหวนเหมียวทูตสวรรค์', description: 'ปลดปล่อยแสงศักดิ์สิทธิ์จากวงแหวนทองและโบนัสทอง', triggerLabel: 'แสงวงแหวน + Angelic Blessing' },
  phao_violet_hound: { id: 'void_pounce', name: 'เขี้ยวอสูรเงาม่วง', description: 'กระพือปีกอสูรพุ่งขย้ำความมืดและเร่งการโจมตี', triggerLabel: 'อสูรเงา + Rapid Void Strike' },
  phao_rune_golem: { id: 'rune_cannon', name: 'ปืนใหญ่แกนรูนโบราณ', description: 'ยิงคลื่นพลังงานรูนสีฟ้าจากไหล่เกราะศิลา', triggerLabel: 'ลำแสงรูน + Fortress DEF' },

  // Divine (Lv.61+) Phao Beasts
  phao_astral_dragon: { id: 'galaxy_breath', name: 'ลมหายใจดาราจักรคริสตัล', description: 'ปลดปล่อยคลื่นกาแล็กซีคริสตัลรุนแรงระดับเทพเจ้า', triggerLabel: 'ดาราจักร + Divine Dragon' },
  phao_frost_stag: { id: 'celestial_frost', name: 'กวางเทพดาราเหมันต์', description: 'ฟาดเขาผลึกดาราปล่อยพายุหิมะศักดิ์สิทธิ์และเร่ง EXP', triggerLabel: 'ผลึกดารา + Divine Wisdom' },
  phao_celestial_owl: { id: 'astral_judgement', name: 'พญาวิหคพิพากษาสวรรค์', description: 'สยายปีกหิมะศักดิ์สิทธิ์ยิงลำแสงดาวเคราะห์ถล่มศัตรู', triggerLabel: 'ลำแสงวิหคเทพ + Omni Buff' },
  phao_golden_seraph: { id: 'seraph_radiance', name: 'มหาพิพากษาเซราฟิมทอง', description: 'อัญเชิญหอกแสงสวรรค์จากปีกเซราฟิมครบเครื่องทุกค่าสถานะ', triggerLabel: 'หอกแสงสวรรค์ + Seraph Aura' },
}

export function getPetSkillDef(petId: string): PetSkillDef {
  return (
    PET_SKILL_MAP[petId] ?? {
      id: 'companion_assist',
      name: 'โจมตีประสาน',
      description: 'ช่วยยิงสนับสนุนตัวละครและมอบบัฟสเตตัส',
      triggerLabel: 'โจมตีอัตโนมัติ',
    }
  )
}
