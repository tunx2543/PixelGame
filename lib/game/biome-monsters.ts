import type { MonsterDef, MonsterSprite } from './data'

export type CatalogElementType =
  | 'neutral'
  | 'fire'
  | 'water'
  | 'ice'
  | 'earth'
  | 'wind'
  | 'poison'
  | 'light'
  | 'dark'

export type MonsterSizeLabel = 'เล็ก' | 'กลาง' | 'ใหญ่'

export interface MonsterCatalogMeta {
  id: string
  mapId: string
  biomeName: string
  thaiName: string
  englishName: string
  elementType: CatalogElementType
  elementLabel: string
  tribe: string
  role: string
  size: MonsterSizeLabel
  stars: 1 | 2 | 3 | 4 | 5
  aggressive: boolean
  boss: boolean
  flying: boolean
}

export interface BiomeMonsterSeed {
  id: string
  thaiName: string
  englishName: string
  sprite: MonsterSprite
  color: string
  elementType: CatalogElementType
  elementLabel: string
  tribe: string
  role: string
  size: MonsterSizeLabel
  stars: 1 | 2 | 3 | 4 | 5
  aggressive?: boolean
  boss?: boolean
  flying?: boolean
  levelOffset?: number
  speed?: number
  aggro?: number
  hpMult?: number
  atkMult?: number
  defMult?: number
  drops?: { itemId: string; chance: number }[]
}

export interface BiomeMonsterCatalogSpec {
  mapId: string
  biomeName: string
  baseLevel: number
  entries: BiomeMonsterSeed[]
}

function defaultDropsForBiome(mapId: string, isBoss: boolean): { itemId: string; chance: number }[] {
  const matByBiome: Record<string, string> = {
    meadow: 'slime_gel',
    vale: 'herb_green',
    woods: 'wolf_fang',
    forest: 'goblin_ear',
    coast: 'fish_silver',
    cave: 'ore_iron',
    desert: 'bone',
    graveyard: 'ectoplasm',
    isles: 'herb_moon',
    snow: 'herb_moon',
    ruins: 'ore_mythril',
    volcano: 'ember_core',
    sky: 'ore_mythril',
    abyss: 'abyss_crystal',
    world: 'abyss_crystal',
  }
  const potionByBiome: Record<string, string> = {
    meadow: 'red_potion',
    vale: 'red_potion',
    woods: 'red_potion',
    forest: 'orange_potion',
    coast: 'orange_potion',
    cave: 'orange_potion',
    desert: 'orange_potion',
    graveyard: 'purple_potion',
    isles: 'white_potion',
    snow: 'white_potion',
    ruins: 'white_potion',
    volcano: 'white_potion',
    sky: 'supreme_hp_elixir',
    abyss: 'supreme_hp_elixir',
    world: 'supreme_hp_elixir',
  }
  const mat = matByBiome[mapId] ?? 'monster_scrap'
  const potion = potionByBiome[mapId] ?? 'red_potion'

  if (isBoss) {
    return [
      { itemId: mat, chance: 0.92 },
      { itemId: 'enhance_stone', chance: 0.8 },
      { itemId: potion, chance: 0.65 },
    ]
  }
  return [
    { itemId: mat, chance: 0.45 },
    { itemId: 'monster_scrap', chance: 0.3 },
    { itemId: potion, chance: 0.1 },
    { itemId: 'enhance_stone', chance: 0.05 },
  ]
}

function buildBiomeMonsterDef(mapId: string, baseLevel: number, index: number, seed: BiomeMonsterSeed): MonsterDef {
  const isBoss = Boolean(seed.boss)
  const level = Math.max(1, baseLevel + (seed.levelOffset ?? Math.floor(index * 0.25)) + (isBoss ? 4 : 0))

  const roleHpMult =
    seed.role === 'แทงก์' ? 1.35 : seed.role === 'เฉื่อย' ? 1.15 : seed.role === 'ว่องไว' ? 0.92 : 1
  const roleAtkMult =
    seed.role === 'เวท' || seed.role === 'ระยะไกล' ? 1.14 : seed.role === 'ว่องไว' ? 1.08 : seed.role === 'แทงก์' ? 0.92 : 1
  const roleDefMult = seed.role === 'แทงก์' ? 1.4 : seed.role === 'เฉื่อย' ? 1.2 : 1
  const sizeMult = seed.size === 'ใหญ่' ? 1.22 : seed.size === 'เล็ก' ? 0.88 : 1

  const hpMult = (seed.hpMult ?? 1) * roleHpMult * sizeMult
  const atkMult = (seed.atkMult ?? 1) * roleAtkMult * (seed.size === 'ใหญ่' ? 1.1 : 1)
  const defMult = (seed.defMult ?? 1) * roleDefMult

  const hpBase = Math.round((24 + Math.pow(level, 1.88) * 2.8) * (isBoss ? 5.2 : 1) * hpMult)
  const atk = Math.round((5 + level * 4.4) * (isBoss ? 1.45 : 1) * atkMult)
  const def = Math.round((1 + level * 1.45) * (isBoss ? 1.5 : 1) * defMult)
  const exp = Math.round(
    (7 + Math.pow(level, 1.55) * 2.2) * (isBoss ? 4.8 : 1) * Math.max(1, (hpMult + atkMult) * 0.5),
  )
  const goldMin = Math.max(2, Math.round(level * (isBoss ? 22 : 2.6)))
  const goldMax = Math.max(goldMin + 2, Math.round(goldMin * 2.0))

  const baseSpeed =
    seed.role === 'เฉื่อย'
      ? 10
      : seed.role === 'ว่องไว'
        ? 52
        : seed.role === 'แทงก์'
          ? 28
          : seed.flying
            ? 46
            : 38

  const baseAggro =
    seed.role === 'เฉื่อย'
      ? 0
      : isBoss
        ? 165
        : seed.aggressive
          ? 120
          : level <= 6
            ? 45
            : 65

  return {
    id: seed.id,
    name: `${seed.thaiName} (${seed.englishName})`,
    level,
    hp: hpBase,
    atk,
    def,
    exp,
    gold: [goldMin, goldMax],
    speed: seed.speed ?? baseSpeed,
    aggro: seed.aggro ?? baseAggro,
    sprite: seed.sprite,
    color: seed.color,
    boss: isBoss || undefined,
    drops: seed.drops ?? defaultDropsForBiome(mapId, isBoss),
  }
}

/**
 * Complete 15-Biome Monster Catalog (Total = 288 monsters: 37 gold bosses + 251 monsters)
 * Matched 1:1 to 01-meadow .. 15-world catalog sheets.
 */
export const BIOME_CATALOG_SPECS: BiomeMonsterCatalogSpec[] = [
  // 1. ทุ่งหญ้า (MEADOW · 13 ตัว — มอน 13 · บอส 0)
  {
    mapId: 'meadow',
    biomeName: 'ทุ่งหญ้า',
    baseLevel: 1,
    entries: [
      {
        id: 'meadow_larva',
        thaiName: 'หนอนน้อย',
        englishName: 'Larva',
        sprite: 'slime',
        color: '#57a79a',
        elementType: 'earth',
        elementLabel: 'ดิน',
        tribe: 'แมลง',
        role: 'ประชิด',
        size: 'เล็ก',
        stars: 1,
        levelOffset: 0,
        speed: 26,
        aggro: 30,
        drops: [{ itemId: 'herb_green', chance: 0.4 }, { itemId: 'torn_cloth', chance: 0.3 }, { itemId: 'red_potion', chance: 0.1 }],
      },
      {
        id: 'meadow_fuzzfly',
        thaiName: 'ผีเสื้อขนปุย',
        englishName: 'Fuzzfly',
        sprite: 'bat',
        color: '#f5cbb3',
        elementType: 'wind',
        elementLabel: 'ลม',
        tribe: 'แมลง',
        role: 'ว่องไว',
        size: 'เล็ก',
        stars: 1,
        flying: true,
        levelOffset: 1,
        speed: 50,
        aggro: 35,
        hpMult: 0.9,
        drops: [{ itemId: 'herb_green', chance: 0.42 }, { itemId: 'red_potion', chance: 0.12 }, { itemId: 'enhance_stone', chance: 0.03 }],
      },
      {
        id: 'meadow_beetle',
        thaiName: 'ด้วงเขา',
        englishName: 'Beetle',
        sprite: 'spider',
        color: '#6b2748',
        elementType: 'earth',
        elementLabel: 'ดิน',
        tribe: 'แมลง',
        role: 'ประชิด',
        size: 'เล็ก',
        stars: 1,
        levelOffset: 1,
        speed: 32,
        aggro: 40,
        defMult: 1.15,
        drops: [{ itemId: 'monster_scrap', chance: 0.45 }, { itemId: 'ore_iron', chance: 0.15 }, { itemId: 'red_potion', chance: 0.1 }],
      },
      {
        id: 'meadow_blob',
        thaiName: 'ก้อนเมือก',
        englishName: 'Blob',
        sprite: 'slime',
        color: '#f28489',
        elementType: 'water',
        elementLabel: 'น้ำ',
        tribe: 'สไลม์',
        role: 'ประชิด',
        size: 'เล็ก',
        stars: 1,
        levelOffset: 2,
        speed: 28,
        aggro: 35,
        drops: [{ itemId: 'slime_gel', chance: 0.55 }, { itemId: 'red_potion', chance: 0.12 }],
      },
      {
        id: 'meadow_blob_drop',
        thaiName: 'หยดเมือก',
        englishName: 'Blob Drop',
        sprite: 'slime',
        color: '#f5a957',
        elementType: 'fire',
        elementLabel: 'ไฟ',
        tribe: 'สไลม์',
        role: 'ประชิด',
        size: 'เล็ก',
        stars: 1,
        levelOffset: 2,
        speed: 30,
        aggro: 40,
        atkMult: 1.1,
        drops: [{ itemId: 'slime_gel', chance: 0.55 }, { itemId: 'red_potion', chance: 0.12 }],
      },
      {
        id: 'meadow_cocoon',
        thaiName: 'ดักแด้',
        englishName: 'Cocoon',
        sprite: 'slime',
        color: '#6d4c5c',
        elementType: 'earth',
        elementLabel: 'ดิน',
        tribe: 'แมลง',
        role: 'เฉื่อย',
        size: 'เล็ก',
        stars: 1,
        levelOffset: 3,
        speed: 10,
        aggro: 0,
        defMult: 1.25,
        drops: [{ itemId: 'torn_cloth', chance: 0.55 }, { itemId: 'herb_green', chance: 0.35 }, { itemId: 'enhance_stone', chance: 0.04 }],
      },
      {
        id: 'meadow_beetle_egg',
        thaiName: 'ไข่ด้วง',
        englishName: 'Beetle Egg',
        sprite: 'slime',
        color: '#a0486a',
        elementType: 'earth',
        elementLabel: 'ดิน',
        tribe: 'แมลง',
        role: 'เฉื่อย',
        size: 'กลาง',
        stars: 1,
        levelOffset: 3,
        speed: 8,
        aggro: 0,
        hpMult: 1.2,
        defMult: 1.3,
        drops: [{ itemId: 'monster_scrap', chance: 0.45 }, { itemId: 'enhance_stone', chance: 0.05 }, { itemId: 'red_potion', chance: 0.12 }],
      },
      {
        id: 'meadow_bloomlet',
        thaiName: 'ดอกไม้จิ๋ว',
        englishName: 'Bloomlet',
        sprite: 'mushroom',
        color: '#b92b3a',
        elementType: 'earth',
        elementLabel: 'ดิน',
        tribe: 'พืช',
        role: 'ประชิด',
        size: 'กลาง',
        stars: 1,
        levelOffset: 4,
        speed: 28,
        aggro: 45,
        drops: [{ itemId: 'herb_green', chance: 0.55 }, { itemId: 'red_potion', chance: 0.14 }],
      },
      {
        id: 'meadow_capling',
        thaiName: 'เห็ดน้อย',
        englishName: 'Capling',
        sprite: 'mushroom',
        color: '#9c7bb8',
        elementType: 'poison',
        elementLabel: 'พิษ',
        tribe: 'พืช',
        role: 'ประชิด',
        size: 'กลาง',
        stars: 1,
        levelOffset: 4,
        speed: 32,
        aggro: 50,
        drops: [{ itemId: 'mushroom_cap', chance: 0.55 }, { itemId: 'blue_potion', chance: 0.1 }, { itemId: 'enhance_stone', chance: 0.04 }],
      },
      {
        id: 'meadow_hopper',
        thaiName: 'กระต่ายน้อย',
        englishName: 'Hopper',
        sprite: 'rabbit',
        color: '#f8f6fb',
        elementType: 'neutral',
        elementLabel: 'ไร้ธาตุ',
        tribe: 'สัตว์',
        role: 'ว่องไว',
        size: 'กลาง',
        stars: 1,
        levelOffset: 5,
        speed: 52,
        aggro: 45,
        drops: [{ itemId: 'herb_green', chance: 0.4 }, { itemId: 'red_potion', chance: 0.18 }, { itemId: 'enhance_stone', chance: 0.04 }],
      },
      {
        id: 'meadow_fiddlehop',
        thaiName: 'จิ้งหรีดนักดนตรี',
        englishName: 'Fiddlehop',
        sprite: 'goblin',
        color: '#536b8e',
        elementType: 'earth',
        elementLabel: 'ดิน',
        tribe: 'แมลง',
        role: 'ประชิด',
        size: 'กลาง',
        stars: 1,
        levelOffset: 6,
        speed: 36,
        aggro: 55,
        atkMult: 1.12,
        drops: [{ itemId: 'monster_scrap', chance: 0.5 }, { itemId: 'blue_potion', chance: 0.14 }, { itemId: 'enhance_stone', chance: 0.05 }],
      },
      {
        id: 'meadow_big_hopper',
        thaiName: 'กระต่ายยักษ์',
        englishName: 'Big Hopper',
        sprite: 'rabbit',
        color: '#d89238',
        elementType: 'neutral',
        elementLabel: 'ไร้ธาตุ',
        tribe: 'สัตว์',
        role: 'ว่องไว',
        size: 'ใหญ่',
        stars: 2,
        aggressive: true,
        levelOffset: 7,
        speed: 48,
        aggro: 115,
        hpMult: 1.45,
        atkMult: 1.35,
        drops: [{ itemId: 'cracked_claw', chance: 0.5 }, { itemId: 'orange_potion', chance: 0.15 }, { itemId: 'enhance_stone', chance: 0.08 }],
      },
      {
        id: 'meadow_dewmother',
        thaiName: 'มารดาหยดน้ำค้าง',
        englishName: 'Dewmother',
        sprite: 'slime',
        color: '#82d6be',
        elementType: 'water',
        elementLabel: 'น้ำ',
        tribe: 'สไลม์',
        role: 'แทงก์',
        size: 'ใหญ่',
        stars: 2,
        aggressive: true,
        levelOffset: 8,
        speed: 24,
        aggro: 110,
        hpMult: 1.85,
        defMult: 1.65,
        atkMult: 1.15,
        drops: [{ itemId: 'slime_gel', chance: 0.75 }, { itemId: 'blue_potion', chance: 0.25 }, { itemId: 'enhance_stone', chance: 0.1 }],
      },
    ],
  },

  // 2. หุบเขาเขียว (VALE · 7 ตัว — มอน 6 · บอส 1)
  {
    mapId: 'vale',
    biomeName: 'หุบเขาเขียว',
    baseLevel: 7,
    entries: [
      { id: 'vale_tiger', thaiName: 'พยัคฆ์หุบเขา', englishName: 'Vale Tiger', sprite: 'wolf', color: '#ea6c2c', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'สัตว์', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 3 },
      { id: 'vale_blob', thaiName: 'วุ้นเขียวหุบเขา', englishName: 'Vale Blob', sprite: 'slime', color: '#8dbb6c', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สไลม์', role: 'ประชิด', size: 'เล็ก', stars: 1, levelOffset: 0 },
      { id: 'vale_bee', thaiName: 'ผึ้งหุบเขา', englishName: 'Vale Bee', sprite: 'bat', color: '#a84432', elementType: 'wind', elementLabel: 'ลม', tribe: 'แมลง', role: 'ประชิด', size: 'เล็ก', stars: 1, flying: true, levelOffset: 1 },
      { id: 'vale_frog', thaiName: 'กบหุบเขา', englishName: 'Vale Frog', sprite: 'rabbit', color: '#7ea66b', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์', role: 'ประชิด', size: 'กลาง', stars: 1, levelOffset: 2 },
      { id: 'vale_cap', thaiName: 'เห็ดหุบเขา', englishName: 'Vale Cap', sprite: 'mushroom', color: '#3b7c8a', elementType: 'earth', elementLabel: 'ดิน', tribe: 'พืช', role: 'ประชิด', size: 'กลาง', stars: 1, levelOffset: 3 },
      { id: 'vale_stump', thaiName: 'ตอไม้หุบเขา', englishName: 'Vale Stump', sprite: 'golem', color: '#8f6b56', elementType: 'earth', elementLabel: 'ดิน', tribe: 'พืช', role: 'แทงก์', size: 'กลาง', stars: 1, levelOffset: 4 },
      { id: 'vale_big_frog', thaiName: 'กบยักษ์หุบเขา', englishName: 'Big Vale Frog', sprite: 'orc', color: '#5d915c', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์', role: 'แทงก์', size: 'ใหญ่', stars: 2, levelOffset: 5 },
    ],
  },

  // 3. ป่าละเมาะ (WOODS · 1 ตัว — มอน 1 · บอส 0)
  {
    mapId: 'woods',
    biomeName: 'ป่าละเมาะ',
    baseLevel: 10,
    entries: [
      { id: 'woods_boar', thaiName: 'หมูป่าพงไพร', englishName: 'Woods Boar', sprite: 'wolf', color: '#a65e3a', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'ประชิด', size: 'เล็ก', stars: 1, levelOffset: 0 },
    ],
  },

  // 4. ป่าลึก (FOREST · 35 ตัว — มอน 30 · บอส 5)
  {
    mapId: 'forest',
    biomeName: 'ป่าลึก',
    baseLevel: 13,
    entries: [
      { id: 'forest_tusk_champion', thaiName: 'ยอดนักรบงา', englishName: 'Tusk Champion', sprite: 'orc', color: '#b53a32', elementType: 'earth', elementLabel: 'ดิน', tribe: 'มนุษย์', role: 'ว่องไว', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 4 },
      { id: 'forest_blazing_serpent', thaiName: 'อสรพิษเพลิง', englishName: 'Blazing Serpent', sprite: 'demon', color: '#ef5b25', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'สัตว์เลื้อยคลาน', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 5 },
      { id: 'forest_hive_queen', thaiName: 'ราชินีรังผึ้ง', englishName: 'Hive Queen', sprite: 'spider', color: '#d9912b', elementType: 'wind', elementLabel: 'ลม', tribe: 'แมลง', role: 'อัญเชิญ', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, flying: true, levelOffset: 5 },
      { id: 'forest_rampage_beast', thaiName: 'อสูรคลั่ง', englishName: 'Rampage Beast', sprite: 'orc', color: '#9c7eb8', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 6 },
      { id: 'forest_tusk_overlord', thaiName: 'จอมราชันงา', englishName: 'Tusk Overlord', sprite: 'orc', color: '#616670', elementType: 'earth', elementLabel: 'ดิน', tribe: 'มนุษย์', role: 'แทงก์', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 6 },
      { id: 'forest_hedgehog', thaiName: 'เม่นหลังหนาม', englishName: 'Bristleback Hedgehog', sprite: 'rabbit', color: '#9c5f3b', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'ประชิด', size: 'เล็ก', stars: 1 },
      { id: 'forest_acorn_squirrel', thaiName: 'กระรอกลูกโอ๊ก', englishName: 'Acorn Squirrel', sprite: 'rabbit', color: '#ad6d3e', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'ประชิด', size: 'เล็ก', stars: 1 },
      { id: 'forest_coilfang', thaiName: 'งูเขียวขด', englishName: 'Coilfang', sprite: 'wolf', color: '#6b9c64', elementType: 'poison', elementLabel: 'พิษ', tribe: 'สัตว์เลื้อยคลาน', role: 'ประชิด', size: 'เล็ก', stars: 1, aggressive: true },
      { id: 'forest_tusker_boar', thaiName: 'หมูป่างายาว', englishName: 'Tusker Boar', sprite: 'wolf', color: '#784130', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'ประชิด', size: 'เล็ก', stars: 1, aggressive: true },
      { id: 'forest_ringtail', thaiName: 'แรคคูนหางลาย', englishName: 'Ringtail', sprite: 'wolf', color: '#8f7d72', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'สัตว์', role: 'ประชิด', size: 'เล็ก', stars: 1 },
      { id: 'forest_sunface', thaiName: 'ทานตะวันหน้าใส', englishName: 'Sunface Bloom', sprite: 'mushroom', color: '#e5a93b', elementType: 'earth', elementLabel: 'ดิน', tribe: 'พืช', role: 'ประชิด', size: 'เล็ก', stars: 1 },
      { id: 'forest_pollenwing', thaiName: 'ผีเสื้อละอองเกสร', englishName: 'Pollenwing', sprite: 'bat', color: '#f2d9b8', elementType: 'wind', elementLabel: 'ลม', tribe: 'แมลง', role: 'เฉื่อย', size: 'กลาง', stars: 1, flying: true },
      { id: 'forest_pitcher_maw', thaiName: 'หม้อแกงลิงจอมงับ', englishName: 'Pitcher Maw', sprite: 'mushroom', color: '#d9934c', elementType: 'poison', elementLabel: 'พิษ', tribe: 'พืช', role: 'ประชิด', size: 'กลาง', stars: 1 },
      { id: 'forest_sticky_flytrap', thaiName: 'ดอกไม้กับดักเหนียว', englishName: 'Sticky Flytrap', sprite: 'mushroom', color: '#e07a7a', elementType: 'earth', elementLabel: 'ดิน', tribe: 'พืช', role: 'ประชิด', size: 'กลาง', stars: 1 },
      { id: 'forest_gapebloom', thaiName: 'ดอกไม้อ้าปาก', englishName: 'Gapebloom', sprite: 'mushroom', color: '#3b6b54', elementType: 'poison', elementLabel: 'พิษ', tribe: 'พืช', role: 'ประชิด', size: 'เล็ก', stars: 1, aggressive: true },
      { id: 'forest_hornshell_beetle', thaiName: 'ด้วงเขากระดอง', englishName: 'Hornshell Beetle', sprite: 'spider', color: '#8f3439', elementType: 'earth', elementLabel: 'ดิน', tribe: 'แมลง', role: 'แทงก์', size: 'กลาง', stars: 2 },
      { id: 'forest_tusklet', thaiName: 'เจ้าง่าน้อย', englishName: 'Tusklet', sprite: 'goblin', color: '#6b9150', elementType: 'earth', elementLabel: 'ดิน', tribe: 'มนุษย์', role: 'ระยะไกล', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'forest_mask_goblin', thaiName: 'ก็อบลินหน้ากาก', englishName: 'Mask Goblin', sprite: 'goblin', color: '#9c4347', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'มนุษย์', role: 'ประชิด', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'forest_greymane_wolf', thaiName: 'หมาป่าแผงคอเทา', englishName: 'Greymane Wolf', sprite: 'wolf', color: '#6f7996', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'ว่องไว', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'forest_tumbler_monkey', thaiName: 'ลิงตีลังกา', englishName: 'Tumbler Monkey', sprite: 'goblin', color: '#b3463d', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'สัตว์', role: 'ว่องไว', size: 'กลาง', stars: 2 },
      { id: 'forest_thornpaw_cat', thaiName: 'แมวอุ้งเท้าหนาม', englishName: 'Thornpaw Cat', sprite: 'wolf', color: '#bf5260', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'ว่องไว', size: 'กลาง', stars: 2 },
      { id: 'forest_rootwail', thaiName: 'รากกรีดร้อง', englishName: 'Rootwail', sprite: 'mushroom', color: '#b894b3', elementType: 'earth', elementLabel: 'ดิน', tribe: 'พืช', role: 'ระยะไกล', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'forest_misttail_fox', thaiName: 'จิ้งจอกหางหมอก', englishName: 'Misttail Fox', sprite: 'wolf', color: '#67b0bd', elementType: 'wind', elementLabel: 'ลม', tribe: 'สัตว์', role: 'ว่องไว', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'forest_spotted_stalker', thaiName: 'เสือดาวล่าเหยื่อ', englishName: 'Spotted Stalker', sprite: 'wolf', color: '#d48c46', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'ว่องไว', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'forest_bladearm_mantis', thaiName: 'ตั๊กแตนแขนดาบ', englishName: 'Bladearm Mantis', sprite: 'spider', color: '#7ea65b', elementType: 'wind', elementLabel: 'ลม', tribe: 'แมลง', role: 'ประชิด', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'forest_tusk_warrior', thaiName: 'นักรบงา', englishName: 'Tusk Warrior', sprite: 'orc', color: '#7c8c5e', elementType: 'earth', elementLabel: 'ดิน', tribe: 'มนุษย์', role: 'แทงก์', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'forest_bramble_bear', thaiName: 'หมีพุ่มหนาม', englishName: 'Bramble Bear', sprite: 'orc', color: '#7d6e6d', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'ประชิด', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'forest_petal_wraith', thaiName: 'วิญญาณกลีบดอก', englishName: 'Petal Wraith', sprite: 'ghost', color: '#9dc47e', elementType: 'earth', elementLabel: 'ดิน', tribe: 'ภูต', role: 'เวท', size: 'ใหญ่', stars: 2, aggressive: true, flying: true },
      { id: 'forest_logbound_giant', thaiName: 'ยักษ์แบกซุง', englishName: 'Logbound Giant', sprite: 'earth_golem', color: '#8f8479', elementType: 'earth', elementLabel: 'ดิน', tribe: 'จักรกล', role: 'แทงก์', size: 'ใหญ่', stars: 2, aggressive: true },
      { id: 'forest_lone_packlord', thaiName: 'จ่าฝูงเดียวดาย', englishName: 'Lone Packlord', sprite: 'wolf', color: '#c45a3d', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'อัญเชิญ', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'forest_moonfeather_baron', thaiName: 'บารอนขนจันทร์', englishName: 'Moonfeather Baron', sprite: 'gale_sentinel', color: '#8f72a8', elementType: 'wind', elementLabel: 'ลม', tribe: 'นก', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'forest_skimmer_king', thaiName: 'ราชาแมลงร่อน', englishName: 'Skimmer King', sprite: 'bat', color: '#394f85', elementType: 'wind', elementLabel: 'ลม', tribe: 'แมลง', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'forest_vinemane_beast', thaiName: 'อสูรแผงคอเถาวัลย์', englishName: 'Vinemane Beast', sprite: 'wolf', color: '#6b9463', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'forest_barkmaiden', thaiName: 'นางไม้', englishName: 'Barkmaiden', sprite: 'earth_golem', color: '#7d5044', elementType: 'earth', elementLabel: 'ดิน', tribe: 'พืช', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'forest_moonfeather_duke', thaiName: 'ดยุกขนจันทร์', englishName: 'Moonfeather Duke', sprite: 'gale_sentinel', color: '#377a8c', elementType: 'wind', elementLabel: 'ลม', tribe: 'นก', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true },
    ],
  },

  // 5. ชายฝั่ง (COAST · 28 ตัว — มอน 26 · บอส 2)
  {
    mapId: 'coast',
    biomeName: 'ชายฝั่ง',
    baseLevel: 20,
    entries: [
      { id: 'coast_drowned_captain', thaiName: 'กัปตันจมน้ำ', englishName: 'Drowned Captain', sprite: 'abyss_knight', color: '#b54c3b', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์น้ำ', role: 'ระยะไกล', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 5 },
      { id: 'coast_shellguard_warlord', thaiName: 'จอมทัพเกราะเปลือก', englishName: 'Shellguard Warlord', sprite: 'orc', color: '#d4493b', elementType: 'water', elementLabel: 'น้ำ', tribe: 'มนุษย์', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 6 },
      { id: 'coast_driftmote', thaiName: 'ละอองล่องลอย', englishName: 'Driftmote', sprite: 'slime', color: '#7bc9ba', elementType: 'wind', elementLabel: 'ลม', tribe: 'พืช', role: 'เฉื่อย', size: 'เล็ก', stars: 1 },
      { id: 'coast_tidestar', thaiName: 'ดาวทะเลชายฝั่ง', englishName: 'Tidestar', sprite: 'slime', color: '#eb7554', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์น้ำ', role: 'ประชิด', size: 'เล็ก', stars: 1 },
      { id: 'coast_snapclam', thaiName: 'หอยงับ', englishName: 'Snapclam', sprite: 'golem', color: '#9c686d', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์น้ำ', role: 'แทงก์', size: 'เล็ก', stars: 1 },
      { id: 'coast_crab', thaiName: 'ปูชายหาด', englishName: 'Crab', sprite: 'spider', color: '#d95345', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์น้ำ', role: 'ประชิด', size: 'เล็ก', stars: 1 },
      { id: 'coast_shellback_snail', thaiName: 'หอยทากเปลือกพัด', englishName: 'Shellback Snail', sprite: 'slime', color: '#d9a4a8', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์น้ำ', role: 'แทงก์', size: 'เล็ก', stars: 1 },
      { id: 'coast_spire_crab', thaiName: 'ปูเสฉวนยอดแหลม', englishName: 'Spire Crab', sprite: 'spider', color: '#c48f6c', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์น้ำ', role: 'แทงก์', size: 'เล็ก', stars: 1 },
      { id: 'coast_inkspurt_squid', thaiName: 'หมึกพ่นหมึก', englishName: 'Inkspurt Squid', sprite: 'bat', color: '#e6955a', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์น้ำ', role: 'ระยะไกล', size: 'เล็ก', stars: 1 },
      { id: 'coast_shell_otter', thaiName: 'นากเปลือกหอย', englishName: 'Shell Otter', sprite: 'wolf', color: '#e8d7c5', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์', role: 'ประชิด', size: 'กลาง', stars: 2 },
      { id: 'coast_popsphere', thaiName: 'ลูกหนามระเบิด', englishName: 'Popsphere', sprite: 'slime', color: '#eb947a', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'วัตถุ', role: 'ประชิด', size: 'เล็ก', stars: 2, flying: true },
      { id: 'coast_deepmaw', thaiName: 'ปลาตะเกียงปากกว้าง', englishName: 'Deepmaw', sprite: 'bat', color: '#589c79', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์น้ำ', role: 'ประชิด', size: 'กลาง', stars: 2, aggressive: true, flying: true },
      { id: 'coast_gullwhip', thaiName: 'นางนวลหางแส้', englishName: 'Gullwhip', sprite: 'bat', color: '#f0eceb', elementType: 'wind', elementLabel: 'ลม', tribe: 'นก', role: 'ว่องไว', size: 'กลาง', stars: 2, aggressive: true, flying: true },
      { id: 'coast_mirefrog', thaiName: 'กบบึงโคลน', englishName: 'Mirefrog', sprite: 'rabbit', color: '#6b7fa6', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์เลื้อยคลาน', role: 'ประชิด', size: 'กลาง', stars: 2 },
      { id: 'coast_shredfin', thaiName: 'ปลาครีบฉีก', englishName: 'Shredfin', sprite: 'bat', color: '#9c788b', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์น้ำ', role: 'ว่องไว', size: 'กลาง', stars: 2, aggressive: true, flying: true },
      { id: 'coast_bonefin', thaiName: 'ปลากระดูก', englishName: 'Bonefin', sprite: 'skeleton', color: '#d4c3cf', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'ประชิด', size: 'กลาง', stars: 2, aggressive: true, flying: true },
      { id: 'coast_sea_jelly', thaiName: 'แมงกะพรุน', englishName: 'Sea Jelly', sprite: 'ghost', color: '#699cd9', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์น้ำ', role: 'ประชิด', size: 'กลาง', stars: 2, flying: true },
      { id: 'coast_rock_turtle', thaiName: 'เต่าหิน', englishName: 'Rock Turtle', sprite: 'golem', color: '#8f5246', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์เลื้อยคลาน', role: 'แทงก์', size: 'กลาง', stars: 2 },
      { id: 'coast_reefgrasp', thaiName: 'หนวดคว้าแนวปะการัง', englishName: 'Reefgrasp', sprite: 'mushroom', color: '#589c8d', elementType: 'water', elementLabel: 'น้ำ', tribe: 'พืช', role: 'ประชิด', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'coast_tentacle_bloom', thaiName: 'ดอกไม้หนวด', englishName: 'Tentacle Bloom', sprite: 'spider', color: '#a8789e', elementType: 'poison', elementLabel: 'พิษ', tribe: 'พืช', role: 'ประชิด', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'coast_lagoon_siren', thaiName: 'นางเงือกลากูน', englishName: 'Lagoon Siren', sprite: 'ghost', color: '#5fbab0', elementType: 'water', elementLabel: 'น้ำ', tribe: 'มนุษย์', role: 'เวท', size: 'กลาง', stars: 2, flying: true },
      { id: 'coast_swamp_gator', thaiName: 'จระเข้หนองน้ำ', englishName: 'Swamp Gator', sprite: 'wolf', color: '#7ea859', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์เลื้อยคลาน', role: 'ประชิด', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'coast_bladefin', thaiName: 'ปลาครีบดาบ', englishName: 'Bladefin', sprite: 'bat', color: '#d4746a', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์น้ำ', role: 'ว่องไว', size: 'กลาง', stars: 2, aggressive: true, flying: true },
      { id: 'coast_reef_lizardman', thaiName: 'มนุษย์กิ้งก่าแนวปะการัง', englishName: 'Reef Lizardman', sprite: 'orc', color: '#6b9459', elementType: 'water', elementLabel: 'น้ำ', tribe: 'มนุษย์', role: 'ประชิด', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'coast_deepsong_siren', thaiName: 'นางเงือกเพลงทะเลลึก', englishName: 'Deepsong Siren', sprite: 'ghost', color: '#b594bf', elementType: 'water', elementLabel: 'น้ำ', tribe: 'มนุษย์', role: 'เวท', size: 'กลาง', stars: 3, aggressive: true, flying: true },
      { id: 'coast_trident_fishman', thaiName: 'มนุษย์ปลาตรีศูล', englishName: 'Trident Fishman', sprite: 'goblin', color: '#846aa6', elementType: 'water', elementLabel: 'น้ำ', tribe: 'มนุษย์', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'coast_drowned_deckhand', thaiName: 'ลูกเรือจมน้ำ', englishName: 'Drowned Deckhand', sprite: 'skeleton', color: '#8f6b99', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'coast_tide_elemental', thaiName: 'ภูตคลื่นทะเล', englishName: 'Tide Elemental', sprite: 'ghost', color: '#c4c9eb', elementType: 'water', elementLabel: 'น้ำ', tribe: 'ธาตุ', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true, flying: true },
    ],
  },

  // 6. ถ้ำ (CAVE · 23 ตัว — มอน 20 · บอส 3)
  {
    mapId: 'cave',
    biomeName: 'ถ้ำ',
    baseLevel: 25,
    entries: [
      { id: 'cave_beetle', thaiName: 'ด้วงเขาแห่งถ้ำ', englishName: 'Cave Beetle', sprite: 'spider', color: '#395585', elementType: 'earth', elementLabel: 'ดิน', tribe: 'แมลง', role: 'แทงก์', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 5 },
      { id: 'cave_brood_empress', thaiName: 'จักรพรรดินีฝูงแมลง', englishName: 'Brood Empress', sprite: 'spider', color: '#ba8cc7', elementType: 'earth', elementLabel: 'ดิน', tribe: 'แมลง', role: 'อัญเชิญ', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 6 },
      { id: 'cave_drill_colossus', thaiName: 'ยักษ์สว่านเหล็ก', englishName: 'Drill Colossus', sprite: 'earth_golem', color: '#78464d', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'จักรกล', role: 'แทงก์', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 7 },
      { id: 'cave_burrow_rat', thaiName: 'หนูขุดโพรง', englishName: 'Burrow Rat', sprite: 'rabbit', color: '#9c8c96', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'สัตว์', role: 'ประชิด', size: 'เล็ก', stars: 1 },
      { id: 'cave_honey_ant', thaiName: 'มดน้ำผึ้ง', englishName: 'Honey Ant', sprite: 'spider', color: '#593d4c', elementType: 'earth', elementLabel: 'ดิน', tribe: 'แมลง', role: 'ประชิด', size: 'เล็ก', stars: 1 },
      { id: 'cave_mole', thaiName: 'ตุ่นถ้ำ', englishName: 'Cave Mole', sprite: 'orc', color: '#8f5d52', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'ประชิด', size: 'เล็ก', stars: 1 },
      { id: 'cave_pebble_gnome', thaiName: 'คนแคระกรวด', englishName: 'Pebble Gnome', sprite: 'goblin', color: '#9e6858', elementType: 'earth', elementLabel: 'ดิน', tribe: 'มนุษย์', role: 'ประชิด', size: 'เล็ก', stars: 1 },
      { id: 'cave_tunnel_ant', thaiName: 'มดอุโมงค์', englishName: 'Tunnel Ant', sprite: 'spider', color: '#8c6b64', elementType: 'earth', elementLabel: 'ดิน', tribe: 'แมลง', role: 'แทงก์', size: 'เล็ก', stars: 1 },
      { id: 'cave_duskwing_bat', thaiName: 'ค้างคาวปีกสนธยา', englishName: 'Duskwing Bat', sprite: 'bat', color: '#7657a6', elementType: 'dark', elementLabel: 'มืด', tribe: 'แมลง', role: 'ว่องไว', size: 'เล็ก', stars: 1, flying: true },
      { id: 'cave_iron_blob', thaiName: 'สไลม์เหล็ก', englishName: 'Iron Blob', sprite: 'slime', color: '#d48a72', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สไลม์', role: 'แทงก์', size: 'เล็ก', stars: 1 },
      { id: 'cave_crystalback', thaiName: 'สไลม์หลังผลึก', englishName: 'Crystalback', sprite: 'slime', color: '#f0b878', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สไลม์', role: 'แทงก์', size: 'เล็ก', stars: 1 },
      { id: 'cave_cavern_spider', thaiName: 'แมงมุมถ้ำ', englishName: 'Cavern Spider', sprite: 'spider', color: '#d4cbb8', elementType: 'earth', elementLabel: 'ดิน', tribe: 'แมลง', role: 'ประชิด', size: 'เล็ก', stars: 2, aggressive: true },
      { id: 'cave_drillshell', thaiName: 'ตัวนิ่มจมูกสว่าน', englishName: 'Drillshell', sprite: 'golem', color: '#9c7863', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'แทงก์', size: 'กลาง', stars: 2 },
      { id: 'cave_snarlhound_raider', thaiName: 'โจรสุนัขคำราม', englishName: 'Snarlhound Raider', sprite: 'orc', color: '#6b4d52', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'สัตว์', role: 'ประชิด', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'cave_boilerhead', thaiName: 'หัวกาต้มน้ำ', englishName: 'Boilerhead', sprite: 'golem', color: '#3b8c80', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'จักรกล', role: 'ระยะไกล', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'cave_webweaver', thaiName: 'แมงมุมทอใย', englishName: 'Webweaver', sprite: 'spider', color: '#a84f3d', elementType: 'earth', elementLabel: 'ดิน', tribe: 'แมลง', role: 'ระยะไกล', size: 'เล็ก', stars: 2, aggressive: true },
      { id: 'cave_hundredleg', thaiName: 'ตะขาบร้อยขา', englishName: 'Hundredleg', sprite: 'spider', color: '#944263', elementType: 'poison', elementLabel: 'พิษ', tribe: 'แมลง', role: 'ประชิด', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'cave_venom_spinner', thaiName: 'แมงมุมชักใยพิษ', englishName: 'Venom Spinner', sprite: 'spider', color: '#3f62b5', elementType: 'poison', elementLabel: 'พิษ', tribe: 'แมลง', role: 'ระยะไกล', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'cave_elder_burrower', thaiName: 'หนอนเจาะดินผู้เฒ่า', englishName: 'Elder Burrower', sprite: 'slime', color: '#8f5fa6', elementType: 'earth', elementLabel: 'ดิน', tribe: 'แมลง', role: 'ประชิด', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'cave_mine_skeleton', thaiName: 'โครงกระดูกเหมือง', englishName: 'Mine Skeleton', sprite: 'golem', color: '#ab7659', elementType: 'earth', elementLabel: 'ดิน', tribe: 'จักรกล', role: 'ประชิด', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'cave_dripstone_hulk', thaiName: 'ยักษ์หินย้อย', englishName: 'Dripstone Hulk', sprite: 'golem', color: '#94838a', elementType: 'earth', elementLabel: 'ดิน', tribe: 'ธาตุ', role: 'แทงก์', size: 'ใหญ่', stars: 2, aggressive: true },
      { id: 'cave_labyrinth_bull', thaiName: 'กระทิงเขาวงกต', englishName: 'Labyrinth Bull', sprite: 'orc', color: '#b58d70', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'cave_violet_broodqueen', thaiName: 'ราชินีแมลงสีม่วง', englishName: 'Violet Broodqueen', sprite: 'spider', color: '#8a5ca8', elementType: 'poison', elementLabel: 'พิษ', tribe: 'แมลง', role: 'อัญเชิญ', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
    ],
  },

  // 7. ทะเลทราย (DESERT · 23 ตัว — มอน 18 · บอส 5)
  {
    mapId: 'desert',
    biomeName: 'ทะเลทราย',
    baseLevel: 30,
    entries: [
      { id: 'desert_dune_emperor', thaiName: 'จักรพรรดิเนินทราย', englishName: 'Dune Emperor', sprite: 'skeleton', color: '#5c4d69', elementType: 'dark', elementLabel: 'มืด', tribe: 'มนุษย์', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 6 },
      { id: 'desert_sandmaw_glutton', thaiName: 'วาฬทรายจอมตะกละ', englishName: 'Sandmaw Glutton', sprite: 'wolf', color: '#e39686', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'แทงก์', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 5 },
      { id: 'desert_solar_tomb_lord', thaiName: 'เจ้าสุสานสุริยะ', englishName: 'Solar Tomb Lord', sprite: 'earth_golem', color: '#c48f60', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'จักรกล', role: 'แทงก์', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 6 },
      { id: 'desert_tomb_king', thaiName: 'ราชาสุสาน', englishName: 'Tomb King', sprite: 'skeleton', color: '#78b0ab', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 7 },
      { id: 'desert_sandfiend_sovereign', thaiName: 'จอมราชันปีศาจทราย', englishName: 'Sandfiend Sovereign', sprite: 'demon', color: '#6c527a', elementType: 'earth', elementLabel: 'ดิน', tribe: 'ปีศาจ', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, flying: true, levelOffset: 8 },
      { id: 'desert_sandburrower', thaiName: 'หนอนมุดทราย', englishName: 'Sandburrower', sprite: 'slime', color: '#e6a57e', elementType: 'earth', elementLabel: 'ดิน', tribe: 'แมลง', role: 'ประชิด', size: 'เล็ก', stars: 2, aggressive: true },
      { id: 'desert_dune_viper', thaiName: 'งูพิษเนินทราย', englishName: 'Dune Viper', sprite: 'wolf', color: '#d47c6a', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์เลื้อยคลาน', role: 'ประชิด', size: 'เล็ก', stars: 2, aggressive: true },
      { id: 'desert_vulture', thaiName: 'แร้งทะเลทราย', englishName: 'Desert Vulture', sprite: 'bat', color: '#9e6b52', elementType: 'wind', elementLabel: 'ลม', tribe: 'นก', role: 'ว่องไว', size: 'กลาง', stars: 2, aggressive: true, flying: true },
      { id: 'desert_frillneck', thaiName: 'กิ้งก่าคอระบาย', englishName: 'Frillneck', sprite: 'wolf', color: '#78a87e', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์เลื้อยคลาน', role: 'ประชิด', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'desert_sandsleeper', thaiName: 'เต่าขี้เซา', englishName: 'Sandsleeper', sprite: 'golem', color: '#d4ab88', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์เลื้อยคลาน', role: 'แทงก์', size: 'กลาง', stars: 2 },
      { id: 'desert_stingclaw_scorpion', thaiName: 'แมงป่องก้ามพิษ', englishName: 'Stingclaw Scorpion', sprite: 'spider', color: '#cf683e', elementType: 'poison', elementLabel: 'พิษ', tribe: 'แมลง', role: 'ประชิด', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'desert_dune_wolf', thaiName: 'หมาป่าเนินทราย', englishName: 'Dune Wolf', sprite: 'wolf', color: '#c49d76', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'ว่องไว', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'desert_dune_egg', thaiName: 'ไข่เนินทราย', englishName: 'Dune Egg', sprite: 'slime', color: '#cf7d73', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'วัตถุ', role: 'เฉื่อย', size: 'กลาง', stars: 2 },
      { id: 'desert_sandchick', thaiName: 'ลูกเจี๊ยบทราย', englishName: 'Sandchick', sprite: 'rabbit', color: '#5fa4ba', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'นก', role: 'ประชิด', size: 'กลาง', stars: 2 },
      { id: 'desert_spinewalker', thaiName: 'กระบองเพชรเดินได้', englishName: 'Spinewalker', sprite: 'mushroom', color: '#70a858', elementType: 'earth', elementLabel: 'ดิน', tribe: 'พืช', role: 'ประชิด', size: 'กลาง', stars: 2 },
      { id: 'desert_linenwalker', thaiName: 'มัมมี่เร่ร่อน', englishName: 'Linenwalker', sprite: 'skeleton', color: '#ccb59b', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'ประชิด', size: 'กลาง', stars: 2, aggressive: true },
      { id: 'desert_strider_bird', thaiName: 'นกเท้าไว', englishName: 'Strider Bird', sprite: 'rabbit', color: '#4c639c', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'นก', role: 'ว่องไว', size: 'กลาง', stars: 2 },
      { id: 'desert_fortress_tortoise', thaiName: 'เต่าป้อมปราการ', englishName: 'Fortress Tortoise', sprite: 'golem', color: '#9c685e', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์เลื้อยคลาน', role: 'แทงก์', size: 'กลาง', stars: 2 },
      { id: 'desert_gilded_linenwalker', thaiName: 'มัมมี่ประดับทอง', englishName: 'Gilded Linenwalker', sprite: 'skeleton', color: '#d48766', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'desert_serpent_dancer', thaiName: 'นางระบำอสรพิษ', englishName: 'Serpent Dancer', sprite: 'ghost', color: '#4aa3a1', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์เลื้อยคลาน', role: 'เวท', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'desert_gust_phantom', thaiName: 'ภูตลมกรรโชก', englishName: 'Gust Phantom', sprite: 'ghost', color: '#6b655c', elementType: 'wind', elementLabel: 'ลม', tribe: 'วิญญาณ', role: 'เวท', size: 'กลาง', stars: 3, aggressive: true, flying: true },
      { id: 'desert_sandstone_colossus', thaiName: 'ยักษ์หินทราย', englishName: 'Sandstone Colossus', sprite: 'golem', color: '#ad8b73', elementType: 'earth', elementLabel: 'ดิน', tribe: 'จักรกล', role: 'แทงก์', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'desert_jackal_priest', thaiName: 'นักบวชหมาใน', englishName: 'Jackal Priest', sprite: 'skeleton', color: '#8f393e', elementType: 'dark', elementLabel: 'มืด', tribe: 'มนุษย์', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true },
    ],
  },

  // 8. สุสาน (GRAVEYARD · 23 ตัว — มอน 21 · บอส 2)
  {
    mapId: 'graveyard',
    biomeName: 'สุสาน',
    baseLevel: 35,
    entries: [
      { id: 'grave_fallen_prelate', thaiName: 'สังฆราชผู้ร่วงหล่น', englishName: 'Fallen Prelate', sprite: 'skeleton', color: '#785070', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'เวท', size: 'ใหญ่', stars: 4, aggressive: true, boss: true, levelOffset: 5 },
      { id: 'grave_night_sovereign', thaiName: 'จักรพรรดิราตรี', englishName: 'Night Sovereign', sprite: 'skeleton', color: '#454378', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'เวท', size: 'ใหญ่', stars: 4, aggressive: true, boss: true, levelOffset: 7 },
      { id: 'grave_shadehound', thaiName: 'สุนัขเงา', englishName: 'Shadehound', sprite: 'wolf', color: '#4a3548', elementType: 'dark', elementLabel: 'มืด', tribe: 'สัตว์', role: 'ว่องไว', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'grave_sheet_ghost', thaiName: 'ผีผ้าคลุม', englishName: 'Sheet Ghost', sprite: 'ghost', color: '#e8d5e8', elementType: 'dark', elementLabel: 'โกสต์', tribe: 'วิญญาณ', role: 'ประชิด', size: 'กลาง', stars: 3, flying: true },
      { id: 'grave_gravegnaw', thaiName: 'ผีแทะหลุมศพ', englishName: 'Gravegnaw', sprite: 'orc', color: '#7d8a6f', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'ว่องไว', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'grave_shambler', thaiName: 'ศพเดินโซเซ', englishName: 'Shambler', sprite: 'orc', color: '#789c68', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'grave_bone_guard', thaiName: 'ทหารยามกระดูก', englishName: 'Bone Guard', sprite: 'skeleton', color: '#9c78ab', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'grave_rattlebones', thaiName: 'โครงกระดูกกุกกัก', englishName: 'Rattlebones', sprite: 'skeleton', color: '#e3cbb8', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'grave_bone_archer', thaiName: 'นักธนูกระดูก', englishName: 'Bone Archer', sprite: 'skeleton', color: '#d4bfb0', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'ระยะไกล', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'grave_chainbound', thaiName: 'ผู้ถูกพันธนาการ', englishName: 'Chainbound', sprite: 'goblin', color: '#a84c52', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'grave_grave_warden', thaiName: 'ผู้เฝ้าสุสาน', englishName: 'Grave Warden', sprite: 'skeleton', color: '#593347', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'grave_broken_oath', thaiName: 'อัศวินผู้ผิดคำสาบาน', englishName: 'Broken Oath', sprite: 'abyss_knight', color: '#a3726c', elementType: 'dark', elementLabel: 'มืด', tribe: 'อันเดด', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'grave_pale_shroud', thaiName: 'วิญญาณผ้าห่อศพ', englishName: 'Pale Shroud', sprite: 'ghost', color: '#9c92a6', elementType: 'dark', elementLabel: 'โกสต์', tribe: 'วิญญาณ', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'grave_phantom_drop', thaiName: 'หยดภูต', englishName: 'Phantom Drop', sprite: 'ghost', color: '#a6a4d4', elementType: 'dark', elementLabel: 'โกสต์', tribe: 'วิญญาณ', role: 'ว่องไว', size: 'ใหญ่', stars: 3, flying: true },
      { id: 'grave_bone_marshal', thaiName: 'แม่ทัพกระดูก', englishName: 'Bone Marshal', sprite: 'skeleton', color: '#9c4c63', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'grave_severed_knight', thaiName: 'อัศวินไร้หัว', englishName: 'Severed Knight', sprite: 'abyss_knight', color: '#94838a', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'grave_gallows_tree', thaiName: 'ต้นไม้ตะแลงแกง', englishName: 'Gallows Tree', sprite: 'earth_golem', color: '#6b4744', elementType: 'dark', elementLabel: 'มืด', tribe: 'พืช', role: 'แทงก์', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'grave_bone_paladin', thaiName: 'อัศวินกระดูก', englishName: 'Bone Paladin', sprite: 'skeleton', color: '#787e85', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'แทงก์', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'grave_dirge_matron', thaiName: 'แม่ชีเพลงไว้อาลัย', englishName: 'Dirge Matron', sprite: 'ghost', color: '#4d3a4b', elementType: 'dark', elementLabel: 'โกสต์', tribe: 'วิญญาณ', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'grave_wailing_lady', thaiName: 'นางผีคร่ำครวญ', englishName: 'Wailing Lady', sprite: 'ghost', color: '#c4a6e3', elementType: 'dark', elementLabel: 'โกสต์', tribe: 'วิญญาณ', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'grave_grim_druid', thaiName: 'ดรูอิดมรณะ', englishName: 'Grim Druid', sprite: 'skeleton', color: '#8f3943', elementType: 'dark', elementLabel: 'มืด', tribe: 'วิญญาณ', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'grave_bone_caller', thaiName: 'ผู้เรียกกระดูก', englishName: 'Bone Caller', sprite: 'skeleton', color: '#6b3648', elementType: 'dark', elementLabel: 'มืด', tribe: 'อันเดด', role: 'อัญเชิญ', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'grave_veilshade', thaiName: 'ภูตม่านมืด', englishName: 'Veilshade', sprite: 'ghost', color: '#4f3b52', elementType: 'dark', elementLabel: 'มืด', tribe: 'วิญญาณ', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
    ],
  },

  // 9. หมู่เกาะตะวันออก (ISLES · 20 ตัว — มอน 14 · บอส 6)
  {
    mapId: 'isles',
    biomeName: 'หมู่เกาะตะวันออก',
    baseLevel: 40,
    entries: [
      { id: 'isles_grove_matriarch', thaiName: 'มารดาแห่งพงไพร', englishName: 'Grove Matriarch', sprite: 'earth_golem', color: '#5e8c61', elementType: 'earth', elementLabel: 'ดิน', tribe: 'พืช', role: 'อัญเชิญ', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 5 },
      { id: 'isles_jade_empress', thaiName: 'จักรพรรดินีหยก', englishName: 'Jade Empress', sprite: 'ghost', color: '#b578a8', elementType: 'wind', elementLabel: 'ลม', tribe: 'มนุษย์', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 6 },
      { id: 'isles_lunar_lantern_fox', thaiName: 'จิ้งจอกโคมจันทรา', englishName: 'Lunar Lantern Fox', sprite: 'gale_sentinel', color: '#e6a89c', elementType: 'light', elementLabel: 'ศักดิ์สิทธิ์', tribe: 'นก', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 6 },
      { id: 'isles_mountain_ogre', thaiName: 'ยักษ์ภูผา', englishName: 'Mountain Ogre', sprite: 'orc', color: '#9c928c', elementType: 'earth', elementLabel: 'ดิน', tribe: 'ปีศาจ', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 7 },
      { id: 'isles_coil_emperor', thaiName: 'จักรพรรดิงูขด', englishName: 'Coil Emperor', sprite: 'demon', color: '#94433a', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์เลื้อยคลาน', role: 'แทงก์', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 7 },
      { id: 'isles_spirit_warlord', thaiName: 'ขุนศึกวิญญาณ', englishName: 'Spirit Warlord', sprite: 'abyss_knight', color: '#6b5378', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 8 },
      { id: 'isles_festival_dragon', thaiName: 'มังกรเทศกาล', englishName: 'Festival Dragon', sprite: 'wolf', color: '#d45f50', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'มังกร', role: 'ประชิด', size: 'กลาง', stars: 3 },
      { id: 'isles_parasol_hopper', thaiName: 'ร่มกระโดด', englishName: 'Parasol Hopper', sprite: 'ghost', color: '#a36b8c', elementType: 'water', elementLabel: 'น้ำ', tribe: 'วัตถุ', role: 'ว่องไว', size: 'กลาง', stars: 3 },
      { id: 'isles_talisman_hopper', thaiName: 'โคมยันต์กระโดด', englishName: 'Talisman Hopper', sprite: 'slime', color: '#cf5e55', elementType: 'light', elementLabel: 'ศักดิ์สิทธิ์', tribe: 'วัตถุ', role: 'ประชิด', size: 'กลาง', stars: 3 },
      { id: 'isles_club_imp', thaiName: 'ภูตน้อยถือกระบอง', englishName: 'Club Imp', sprite: 'goblin', color: '#d46b68', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'ปีศาจ', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'isles_lantern_ghoul', thaiName: 'ผีถือโคม', englishName: 'Lantern Ghoul', sprite: 'skeleton', color: '#6b4768', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'อันเดด', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'isles_mochi_sprite', thaiName: 'ภูตโมจิ', englishName: 'Mochi Sprite', sprite: 'slime', color: '#f5ded8', elementType: 'earth', elementLabel: 'ดิน', tribe: 'ภูต', role: 'ประชิด', size: 'กลาง', stars: 3 },
      { id: 'isles_porcelain_doll', thaiName: 'ตุ๊กตากระเบื้อง', englishName: 'Porcelain Doll', sprite: 'goblin', color: '#d9c5ba', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'จักรกล', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'isles_peach_treant', thaiName: 'พฤกษาลูกท้อ', englishName: 'Peach Treant', sprite: 'mushroom', color: '#9c6659', elementType: 'earth', elementLabel: 'ดิน', tribe: 'พืช', role: 'แทงก์', size: 'กลาง', stars: 3 },
      { id: 'isles_crow_mask', thaiName: 'หน้ากากอีกา', englishName: 'Crow Mask', sprite: 'gale_sentinel', color: '#59556e', elementType: 'wind', elementLabel: 'ลม', tribe: 'นก', role: 'เวท', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'isles_mourning_maiden', thaiName: 'สาวไว้ทุกข์', englishName: 'Mourning Maiden', sprite: 'ghost', color: '#84b0a8', elementType: 'dark', elementLabel: 'โกสต์', tribe: 'วิญญาณ', role: 'เวท', size: 'กลาง', stars: 3, aggressive: true, flying: true },
      { id: 'isles_veil_assassin', thaiName: 'นักฆ่าผ้าคลุม', englishName: 'Veil Assassin', sprite: 'goblin', color: '#5d475e', elementType: 'dark', elementLabel: 'มืด', tribe: 'มนุษย์', role: 'ว่องไว', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'isles_drifting_blade', thaiName: 'ดาบพเนจร', englishName: 'Drifting Blade', sprite: 'goblin', color: '#9c5959', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'มนุษย์', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'isles_totem_sentinel', thaiName: 'เสาโทเท็มพิทักษ์', englishName: 'Totem Sentinel', sprite: 'golem', color: '#946858', elementType: 'earth', elementLabel: 'ดิน', tribe: 'จักรกล', role: 'แทงก์', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'isles_ninefire_vixen', thaiName: 'จิ้งจอกเก้าเพลิง', englishName: 'Ninefire Vixen', sprite: 'wolf', color: '#c44d45', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'สัตว์', role: 'ว่องไว', size: 'ใหญ่', stars: 3, aggressive: true },
    ],
  },

  // 10. แดนหิมะ (SNOW · 15 ตัว — มอน 13 · บอส 2)
  {
    mapId: 'snow',
    biomeName: 'แดนหิมะ',
    baseLevel: 50,
    entries: [
      { id: 'snow_frostfang_alpha', thaiName: 'จ่าฝูงเขี้ยวน้ำแข็ง', englishName: 'Frostfang Alpha', sprite: 'wolf', color: '#7ea2db', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 5 },
      { id: 'snow_tri_crown_wyrm', thaiName: 'มังกรสามมงกุฎ', englishName: 'Tri-Crown Wyrm', sprite: 'demon', color: '#708552', elementType: 'earth', elementLabel: 'ดิน', tribe: 'มังกร', role: 'แทงก์', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 7 },
      { id: 'snow_goldbristle_boar', thaiName: 'หมูป่าขนทอง', englishName: 'Goldbristle Boar', sprite: 'wolf', color: '#a86545', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'ประชิด', size: 'เล็ก', stars: 2, aggressive: true },
      { id: 'snow_icicle_imp', thaiName: 'ปีศาจน้อยน้ำแข็ง', englishName: 'Icicle Imp', sprite: 'ghost', color: '#8ac2f5', elementType: 'water', elementLabel: 'น้ำ', tribe: 'ธาตุ', role: 'ประชิด', size: 'เล็ก', stars: 2, aggressive: true, flying: true },
      { id: 'snow_snow_puff', thaiName: 'ปุยหิมะ', englishName: 'Snow Puff', sprite: 'slime', color: '#dbe4fa', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สไลม์', role: 'เฉื่อย', size: 'กลาง', stars: 3 },
      { id: 'snow_frost_pup', thaiName: 'ลูกหมาป่าหิมะ', englishName: 'Frost Pup', sprite: 'wolf', color: '#dfdaf0', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์', role: 'ประชิด', size: 'กลาง', stars: 3 },
      { id: 'snow_snow_seal', thaiName: 'แมวน้ำหิมะ', englishName: 'Snow Seal', sprite: 'wolf', color: '#f2edf7', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์', role: 'เฉื่อย', size: 'กลาง', stars: 3 },
      { id: 'snow_rime_stalker', thaiName: 'หมาป่าย่องน้ำแข็ง', englishName: 'Rime Stalker', sprite: 'wolf', color: '#b5a2cf', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์', role: 'ว่องไว', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'snow_snowhulk', thaiName: 'อิกลูยักษ์', englishName: 'Snowhulk', sprite: 'golem', color: '#d4cfe3', elementType: 'water', elementLabel: 'น้ำ', tribe: 'วัตถุ', role: 'แทงก์', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'snow_snowveil_sprite', thaiName: 'ภูตม่านหิมะ', englishName: 'Snowveil Sprite', sprite: 'ghost', color: '#7ea2db', elementType: 'water', elementLabel: 'น้ำ', tribe: 'วิญญาณ', role: 'เวท', size: 'กลาง', stars: 3, aggressive: true, flying: true },
      { id: 'snow_frost_ape', thaiName: 'วานรน้ำแข็ง', englishName: 'Frost Ape', sprite: 'orc', color: '#dcd5cf', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'snow_frost_bear', thaiName: 'หมีน้ำแข็ง', englishName: 'Frost Bear', sprite: 'orc', color: '#e6deeb', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สัตว์', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'snow_mortar_witch', thaiName: 'แม่มดครกไม้', englishName: 'Mortar Witch', sprite: 'goblin', color: '#8f594d', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'มนุษย์', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'snow_stonehide_mammoth', thaiName: 'แมมมอธหนังหิน', englishName: 'Stonehide Mammoth', sprite: 'golem', color: '#7d6b6d', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'แทงก์', size: 'ใหญ่', stars: 3 },
      { id: 'snow_glacier_titan', thaiName: 'ยักษ์ธารน้ำแข็ง', englishName: 'Glacier Titan', sprite: 'golem', color: '#75a8e3', elementType: 'water', elementLabel: 'น้ำ', tribe: 'ธาตุ', role: 'แทงก์', size: 'ใหญ่', stars: 3, aggressive: true },
    ],
  },

  // 11. ซากปราสาท (RUINS · 47 ตัว — มอน 41 · บอส 6)
  {
    mapId: 'ruins',
    biomeName: 'ซากปราสาท',
    baseLevel: 55,
    entries: [
      { id: 'ruins_clockwork_heir', thaiName: 'ทายาทไขลาน', englishName: 'Clockwork Heir', sprite: 'earth_golem', color: '#b5874c', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'จักรกล', role: 'แทงก์', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 4 },
      { id: 'ruins_crimson_count', thaiName: 'เคานต์สีชาด', englishName: 'Crimson Count', sprite: 'bat', color: '#ab4e61', elementType: 'wind', elementLabel: 'ลม', tribe: 'แมลง', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, flying: true, levelOffset: 5 },
      { id: 'ruins_crimson_swordlady', thaiName: 'นางดาบสีชาด', englishName: 'Crimson Swordlady', sprite: 'abyss_knight', color: '#a83645', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'มนุษย์', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 6 },
      { id: 'ruins_doom_colossus', thaiName: 'ยักษ์เหล็กวิบัติ', englishName: 'Doom Colossus', sprite: 'earth_golem', color: '#7d5066', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'จักรกล', role: 'ระยะไกล', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 6 },
      { id: 'ruins_mirror_knight', thaiName: 'อัศวินกระจก', englishName: 'Mirror Knight', sprite: 'abyss_knight', color: '#c4b5cf', elementType: 'dark', elementLabel: 'มืด', tribe: 'มนุษย์', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 7 },
      { id: 'ruins_umbral_colossus', thaiName: 'ยักษ์หินเงามืด', englishName: 'Umbral Colossus', sprite: 'earth_golem', color: '#8f6b99', elementType: 'earth', elementLabel: 'ดิน', tribe: 'จักรกล', role: 'แทงก์', size: 'ใหญ่', stars: 3, aggressive: true, boss: true, levelOffset: 7 },
      { id: 'ruins_chestwaw', thaiName: 'หีบปากกว้าง', englishName: 'Chestmaw', sprite: 'golem', color: '#6b7054', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'วัตถุ', role: 'ประชิด', size: 'เล็ก', stars: 3, aggressive: true },
      { id: 'ruins_gazer_orb', thaiName: 'ลูกตาจ้องมอง', englishName: 'Gazer Orb', sprite: 'bat', color: '#82576b', elementType: 'dark', elementLabel: 'มืด', tribe: 'ปีศาจ', role: 'ระยะไกล', size: 'เล็ก', stars: 3, aggressive: true, flying: true },
      { id: 'ruins_smogwraith', thaiName: 'วิญญาณควันพิษ', englishName: 'Smogwraith', sprite: 'ghost', color: '#8a68a6', elementType: 'poison', elementLabel: 'พิษ', tribe: 'ธาตุ', role: 'เวท', size: 'เล็ก', stars: 3, aggressive: true, flying: true },
      { id: 'ruins_gingerling', thaiName: 'ตุ๊กตาลูกกวาด', englishName: 'Gingerling', sprite: 'goblin', color: '#cf9e88', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'จักรกล', role: 'ประชิด', size: 'กลาง', stars: 3 },
      { id: 'ruins_horned_imp', thaiName: 'ปีศาจน้อยเขาแกะ', englishName: 'Horned Imp', sprite: 'demon', color: '#3b827a', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'ปีศาจ', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'ruins_patchwork_bunny', thaiName: 'กระต่ายผ้าปะ', englishName: 'Patchwork Bunny', sprite: 'rabbit', color: '#e6a8a3', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'จักรกล', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'ruins_sentry_drone', thaiName: 'โดรนยามกลไก', englishName: 'Sentry Drone', sprite: 'bat', color: '#8c6b5e', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'จักรกล', role: 'ระยะไกล', size: 'กลาง', stars: 3, aggressive: true, flying: true },
      { id: 'ruins_rooftop_watcher', thaiName: 'ผู้เฝ้าหลังคา', englishName: 'Rooftop Watcher', sprite: 'bat', color: '#a896a3', elementType: 'earth', elementLabel: 'ดิน', tribe: 'จักรกล', role: 'ว่องไว', size: 'กลาง', stars: 3, aggressive: true, flying: true },
      { id: 'ruins_lanternhead', thaiName: 'หุ่นไล่กาหัวตะเกียง', englishName: 'Lanternhead', sprite: 'ghost', color: '#8f7268', elementType: 'dark', elementLabel: 'โกสต์', tribe: 'วิญญาณ', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true, flying: true },
      { id: 'ruins_hexwitch', thaiName: 'แม่มดคำสาป', englishName: 'Hexwitch', sprite: 'ghost', color: '#783c59', elementType: 'dark', elementLabel: 'มืด', tribe: 'มนุษย์', role: 'เวท', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'ruins_clockwork_maid', thaiName: 'สาวใช้ไขลาน', englishName: 'Clockwork Maid', sprite: 'goblin', color: '#e6a3a6', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'จักรกล', role: 'ว่องไว', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'ruins_dreamveil_fiend', thaiName: 'ปีศาจม่านฝัน', englishName: 'Dreamveil Fiend', sprite: 'demon', color: '#593654', elementType: 'dark', elementLabel: 'มืด', tribe: 'ปีศาจ', role: 'ว่องไว', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'ruins_haunted_frame', thaiName: 'กรอบรูปผีสิง', englishName: 'Haunted Frame', sprite: 'ghost', color: '#45598c', elementType: 'dark', elementLabel: 'โกสต์', tribe: 'วัตถุ', role: 'เวท', size: 'กลาง', stars: 3, aggressive: true, flying: true },
      { id: 'ruins_bellclock', thaiName: 'นาฬิกาปลุกเดินได้', englishName: 'Bellclock', sprite: 'golem', color: '#b5874c', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'จักรกล', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'ruins_hornblob', thaiName: 'สไลม์เขา', englishName: 'Hornblob', sprite: 'slime', color: '#9c78b8', elementType: 'water', elementLabel: 'น้ำ', tribe: 'สไลม์', role: 'แทงก์', size: 'ใหญ่', stars: 3 },
      { id: 'ruins_iron_sentinel', thaiName: 'ผู้พิทักษ์เหล็ก', englishName: 'Iron Sentinel', sprite: 'abyss_knight', color: '#5c6b85', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'จักรกล', role: 'ระยะไกล', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'ruins_stonegaze', thaiName: 'นางงูจ้องศิลา', englishName: 'Stonegaze', sprite: 'demon', color: '#8f9e7a', elementType: 'earth', elementLabel: 'ดิน', tribe: 'ปีศาจ', role: 'เวท', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'ruins_echo_assassin', thaiName: 'นักฆ่าเงาสะท้อน', englishName: 'Echo Assassin', sprite: 'ghost', color: '#6b5385', elementType: 'dark', elementLabel: 'โกสต์', tribe: 'วิญญาณ', role: 'ว่องไว', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'ruins_echo_knight', thaiName: 'อัศวินเงาสะท้อน', englishName: 'Echo Knight', sprite: 'abyss_knight', color: '#696280', elementType: 'dark', elementLabel: 'โกสต์', tribe: 'วิญญาณ', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'ruins_echo_mage', thaiName: 'จอมเวทเงาสะท้อน', englishName: 'Echo Mage', sprite: 'ghost', color: '#543f69', elementType: 'dark', elementLabel: 'โกสต์', tribe: 'วิญญาณ', role: 'เวท', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'ruins_echo_priestess', thaiName: 'นักบวชหญิงเงาสะท้อน', englishName: 'Echo Priestess', sprite: 'ghost', color: '#a887a3', elementType: 'dark', elementLabel: 'โกสต์', tribe: 'วิญญาณ', role: 'เวท', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'ruins_siege_walker', thaiName: 'หอรบเดินได้', englishName: 'Siege Walker', sprite: 'golem', color: '#a8968a', elementType: 'earth', elementLabel: 'ดิน', tribe: 'จักรกล', role: 'แทงก์', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'ruins_musket_revenant', thaiName: 'โครงกระดูกปืนคาบศิลา', englishName: 'Musket Revenant', sprite: 'skeleton', color: '#a34c4e', elementType: 'dark', elementLabel: 'อันเดด', tribe: 'อันเดด', role: 'ระยะไกล', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'ruins_hollow_armour', thaiName: 'เกราะกลวง', englishName: 'Hollow Armour', sprite: 'abyss_knight', color: '#b55c78', elementType: 'dark', elementLabel: 'มืด', tribe: 'อันเดด', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'ruins_doom_engine', thaiName: 'จักรกลวิบัติ', englishName: 'Doom Engine', sprite: 'golem', color: '#b56e68', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'จักรกล', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'ruins_velvet_vampire', thaiName: 'แวมไพร์กำมะหยี่', englishName: 'Velvet Vampire', sprite: 'ghost', color: '#8f3952', elementType: 'dark', elementLabel: 'มืด', tribe: 'อันเดด', role: 'ว่องไว', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'ruins_night_steed', thaiName: 'อาชาราตรี', englishName: 'Night Steed', sprite: 'wolf', color: '#785a73', elementType: 'dark', elementLabel: 'มืด', tribe: 'สัตว์', role: 'ว่องไว', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'ruins_blade_sentinel', thaiName: 'ผู้พิทักษ์ดาบศิลา', englishName: 'Blade Sentinel', sprite: 'golem', color: '#8a8275', elementType: 'earth', elementLabel: 'ดิน', tribe: 'จักรกล', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'ruins_cursed_edge', thaiName: 'ดาบต้องสาป', englishName: 'Cursed Edge', sprite: 'bat', color: '#8f475e', elementType: 'dark', elementLabel: 'มืด', tribe: 'วัตถุ', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'ruins_headsmans_blade', thaiName: 'ขวานเพชฌฆาต', englishName: "Headsman's Blade", sprite: 'bat', color: '#9c4c47', elementType: 'dark', elementLabel: 'มืด', tribe: 'วัตถุ', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'ruins_iron_marauder', thaiName: 'โจรกรงเล็บเหล็ก', englishName: 'Iron Marauder', sprite: 'goblin', color: '#6e5266', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'มนุษย์', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'ruins_mirror_twin', thaiName: 'แฝดกระจก', englishName: 'Mirror Twin', sprite: 'ghost', color: '#c45259', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'จักรกล', role: 'อัญเชิญ', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'ruins_sorrow_shade', thaiName: 'เงาโศกา', englishName: 'Sorrow Shade', sprite: 'ghost', color: '#6b94cc', elementType: 'water', elementLabel: 'น้ำ', tribe: 'วิญญาณ', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'ruins_swarm_tyrant', thaiName: 'ราชันฝูงแมลง', englishName: 'Swarm Tyrant', sprite: 'spider', color: '#5c7847', elementType: 'poison', elementLabel: 'พิษ', tribe: 'แมลง', role: 'อัญเชิญ', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'ruins_thornblade', thaiName: 'ดาบหนามกุหลาบ', englishName: 'Thornblade', sprite: 'bat', color: '#a84763', elementType: 'earth', elementLabel: 'ดิน', tribe: 'วัตถุ', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'ruins_dread_shade', thaiName: 'เงาหวาดผวา', englishName: 'Dread Shade', sprite: 'ghost', color: '#593e5e', elementType: 'dark', elementLabel: 'โกสต์', tribe: 'วิญญาณ', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'ruins_crimson_knight', thaiName: 'อัศวินสีชาด', englishName: 'Crimson Knight', sprite: 'abyss_knight', color: '#a82f3c', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'มนุษย์', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'ruins_grinning_jester', thaiName: 'ตัวตลกยิ้มแสยะ', englishName: 'Grinning Jester', sprite: 'goblin', color: '#c9a68a', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'จักรกล', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'ruins_hatred_shade', thaiName: 'เงาเคียดแค้น', englishName: 'Hatred Shade', sprite: 'ghost', color: '#a82a2e', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'วิญญาณ', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'ruins_bow_sentinel', thaiName: 'ผู้พิทักษ์ธนูศิลา', englishName: 'Bow Sentinel', sprite: 'golem', color: '#ad9480', elementType: 'earth', elementLabel: 'ดิน', tribe: 'จักรกล', role: 'ระยะไกล', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'ruins_despair_shade', thaiName: 'เงาสิ้นหวัง', englishName: 'Despair Shade', sprite: 'ghost', color: '#6e6873', elementType: 'dark', elementLabel: 'โกสต์', tribe: 'วิญญาณ', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
    ],
  },

  // 12. ภูเขาไฟ (VOLCANO · 18 ตัว — มอน 17 · บอส 1)
  {
    mapId: 'volcano',
    biomeName: 'ภูเขาไฟ',
    baseLevel: 63,
    entries: [
      { id: 'volcano_inferno_sovereign', thaiName: 'จักรพรรดิเพลิงนรก', englishName: 'Inferno Sovereign', sprite: 'demon', color: '#cf422b', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'มนุษย์', role: 'ประชิด', size: 'ใหญ่', stars: 4, aggressive: true, boss: true, levelOffset: 6 },
      { id: 'volcano_glasscrag', thaiName: 'หินแก้วภูเขาไฟ', englishName: 'Glasscrag', sprite: 'golem', color: '#5c3c4f', elementType: 'earth', elementLabel: 'ดิน', tribe: 'ธาตุ', role: 'แทงก์', size: 'เล็ก', stars: 3, aggressive: true },
      { id: 'volcano_flamefist', thaiName: 'ภูตกำปั้นไฟ', englishName: 'Flamefist', sprite: 'demon', color: '#a8475c', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'ปีศาจ', role: 'ประชิด', size: 'เล็ก', stars: 3, aggressive: true, flying: true },
      { id: 'volcano_magma_blob', thaiName: 'เมือกแมกมา', englishName: 'Magma Blob', sprite: 'slime', color: '#eb7a34', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'สไลม์', role: 'เฉื่อย', size: 'เล็ก', stars: 3 },
      { id: 'volcano_cinderpup', thaiName: 'ลูกหมาถ่านไฟ', englishName: 'Cinderpup', sprite: 'wolf', color: '#6b403b', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'สัตว์', role: 'ประชิด', size: 'กลาง', stars: 3 },
      { id: 'volcano_lava_scorpion', thaiName: 'แมงป่องลาวา', englishName: 'Lava Scorpion', sprite: 'spider', color: '#cf6e34', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'แมลง', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'volcano_emberwisp', thaiName: 'ภูตดวงไฟ', englishName: 'Emberwisp', sprite: 'ghost', color: '#78507d', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'วิญญาณ', role: 'เวท', size: 'กลาง', stars: 3, aggressive: true, flying: true },
      { id: 'volcano_ember_hound', thaiName: 'สุนัขถ่านเพลิง', englishName: 'Ember Hound', sprite: 'wolf', color: '#c44d47', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'สัตว์', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'volcano_kindle_imp', thaiName: 'ปีศาจน้อยจุดไฟ', englishName: 'Kindle Imp', sprite: 'demon', color: '#d44c32', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'ปีศาจ', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'volcano_cinder_skull', thaiName: 'กะโหลกถ่านเพลิง', englishName: 'Cinder Skull', sprite: 'skeleton', color: '#de4c47', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'อันเดด', role: 'ว่องไว', size: 'กลาง', stars: 3, aggressive: true, flying: true },
      { id: 'volcano_pyre_fiend', thaiName: 'ปีศาจกองไฟ', englishName: 'Pyre Fiend', sprite: 'demon', color: '#8f4f73', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'ปีศาจ', role: 'เวท', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'volcano_magma_hulk', thaiName: 'ยักษ์หินหลอมเหลว', englishName: 'Magma Hulk', sprite: 'golem', color: '#593d47', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'จักรกล', role: 'แทงก์', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'volcano_inferno_engine', thaiName: 'จักรกลเตาหลอม', englishName: 'Inferno Engine', sprite: 'golem', color: '#8f4742', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'จักรกล', role: 'แทงก์', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'volcano_hellfire_steed', thaiName: 'อาชาเพลิงนรก', englishName: 'Hellfire Steed', sprite: 'wolf', color: '#473e47', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'สัตว์', role: 'ว่องไว', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'volcano_flamecrest_lizard', thaiName: 'กิ้งก่าหงอนเพลิง', englishName: 'Flamecrest Lizard', sprite: 'orc', color: '#9c2c2b', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'สัตว์เลื้อยคลาน', role: 'แทงก์', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'volcano_pyre_dancer', thaiName: 'นางระบำเพลิง', englishName: 'Pyre Dancer', sprite: 'ghost', color: '#e65b25', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'วิญญาณ', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'volcano_ashen_mule', thaiName: 'ล่อหัวเพลิง', englishName: 'Ashen Mule', sprite: 'wolf', color: '#8f7078', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'ปีศาจ', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'volcano_threefold_beast', thaiName: 'อสูรสามเศียร', englishName: 'Threefold Beast', sprite: 'wolf', color: '#8c5a54', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'สัตว์', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true },
    ],
  },

  // 13. แดนลอยฟ้า (SKY · 23 ตัว — มอน 21 · บอส 2)
  {
    mapId: 'sky',
    biomeName: 'แดนลอยฟ้า',
    baseLevel: 68,
    entries: [
      { id: 'sky_gale_knight', thaiName: 'อัศวินวายุ', englishName: 'Gale Knight', sprite: 'gale_sentinel', color: '#9c8ac7', elementType: 'wind', elementLabel: 'ลม', tribe: 'มนุษย์', role: 'ประชิด', size: 'ใหญ่', stars: 4, aggressive: true, boss: true, flying: true, levelOffset: 5 },
      { id: 'sky_winged_arbiter', thaiName: 'ผู้ตัดสินแห่งนภา', englishName: 'Winged Arbiter', sprite: 'gale_sentinel', color: '#e0c5b5', elementType: 'light', elementLabel: 'ศักดิ์สิทธิ์', tribe: 'มนุษย์', role: 'ประชิด', size: 'ใหญ่', stars: 4, aggressive: true, boss: true, flying: true, levelOffset: 7 },
      { id: 'sky_pebble_puff', thaiName: 'ก้อนปุยกรวด', englishName: 'Pebble Puff', sprite: 'slime', color: '#ebdcb9', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สไลม์', role: 'เฉื่อย', size: 'เล็ก', stars: 3 },
      { id: 'sky_bigbeak', thaiName: 'นกปากใหญ่', englishName: 'Bigbeak', sprite: 'bat', color: '#de5b4c', elementType: 'wind', elementLabel: 'ลม', tribe: 'นก', role: 'ประชิด', size: 'เล็ก', stars: 3, flying: true },
      { id: 'sky_needlewing_lancer', thaiName: 'แมลงปอหอกเข็ม', englishName: 'Needlewing Lancer', sprite: 'bat', color: '#e69c5c', elementType: 'wind', elementLabel: 'ลม', tribe: 'แมลง', role: 'ว่องไว', size: 'กลาง', stars: 3, aggressive: true, flying: true },
      { id: 'sky_puffseed', thaiName: 'เมล็ดปุยลม', englishName: 'Puffseed', sprite: 'ghost', color: '#cfc4e3', elementType: 'wind', elementLabel: 'ลม', tribe: 'พืช', role: 'ประชิด', size: 'กลาง', stars: 3, flying: true },
      { id: 'sky_false_seraph', thaiName: 'เทวทูตจอมปลอม', englishName: 'False Seraph', sprite: 'bat', color: '#8f6e78', elementType: 'dark', elementLabel: 'มืด', tribe: 'วิญญาณ', role: 'ว่องไว', size: 'กลาง', stars: 3, aggressive: true, flying: true },
      { id: 'sky_crag_goat', thaiName: 'แพะผา', englishName: 'Crag Goat', sprite: 'wolf', color: '#e8d5c0', elementType: 'earth', elementLabel: 'ดิน', tribe: 'สัตว์', role: 'ประชิด', size: 'กลาง', stars: 3 },
      { id: 'sky_galehound', thaiName: 'หมาป่าวายุ', englishName: 'Galehound', sprite: 'wolf', color: '#d97852', elementType: 'wind', elementLabel: 'ลม', tribe: 'สัตว์', role: 'ว่องไว', size: 'กลาง', stars: 3, aggressive: true },
      { id: 'sky_spinrotor', thaiName: 'หุ่นใบพัด', englishName: 'Spinrotor', sprite: 'bat', color: '#6b7d59', elementType: 'wind', elementLabel: 'ลม', tribe: 'จักรกล', role: 'ประชิด', size: 'กลาง', stars: 3, aggressive: true, flying: true },
      { id: 'sky_wyrmkit', thaiName: 'ลูกมังกรน้อย', englishName: 'Wyrmkit', sprite: 'bat', color: '#db6e6e', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'มังกร', role: 'ประชิด', size: 'กลาง', stars: 3 },
      { id: 'sky_haloblob', thaiName: 'วาฬรัศมี', englishName: 'Haloblob', sprite: 'slime', color: '#6eb5e8', elementType: 'wind', elementLabel: 'ลม', tribe: 'สัตว์น้ำ', role: 'แทงก์', size: 'ใหญ่', stars: 3, flying: true },
      { id: 'sky_gale_hawk', thaiName: 'เหยี่ยววายุ', englishName: 'Gale Hawk', sprite: 'bat', color: '#c4524c', elementType: 'wind', elementLabel: 'ลม', tribe: 'นก', role: 'ว่องไว', size: 'กลาง', stars: 3, aggressive: true, flying: true },
      { id: 'sky_cloud_sage', thaiName: 'ฤๅษีเมฆา', englishName: 'Cloud Sage', sprite: 'ghost', color: '#8c707a', elementType: 'wind', elementLabel: 'ลม', tribe: 'มนุษย์', role: 'เวท', size: 'ใหญ่', stars: 3, flying: true },
      { id: 'sky_gustfang', thaiName: 'เขี้ยวพายุ', englishName: 'Gustfang', sprite: 'wolf', color: '#ede5f5', elementType: 'wind', elementLabel: 'ลม', tribe: 'สัตว์', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'sky_haven_warden', thaiName: 'ผู้พิทักษ์ปราการ', englishName: 'Haven Warden', sprite: 'golem', color: '#d4beab', elementType: 'light', elementLabel: 'ศักดิ์สิทธิ์', tribe: 'จักรกล', role: 'แทงก์', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'sky_mercy_warden', thaiName: 'ผู้พิทักษ์เมตตา', englishName: 'Mercy Warden', sprite: 'gale_sentinel', color: '#b56e75', elementType: 'light', elementLabel: 'ศักดิ์สิทธิ์', tribe: 'จักรกล', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true },
      { id: 'sky_seraph_blob', thaiName: 'วาฬเทพทอง', englishName: 'Seraph Blob', sprite: 'slime', color: '#ebd07d', elementType: 'light', elementLabel: 'ศักดิ์สิทธิ์', tribe: 'สัตว์น้ำ', role: 'แทงก์', size: 'ใหญ่', stars: 3, flying: true },
      { id: 'sky_spear_maiden', thaiName: 'นางทวนสวรรค์', englishName: 'Spear Maiden', sprite: 'gale_sentinel', color: '#9c789e', elementType: 'wind', elementLabel: 'ลม', tribe: 'มนุษย์', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'sky_vigil_warden', thaiName: 'ผู้พิทักษ์เฝ้ายาม', englishName: 'Vigil Warden', sprite: 'gale_sentinel', color: '#d9b5b2', elementType: 'light', elementLabel: 'ศักดิ์สิทธิ์', tribe: 'วิญญาณ', role: 'เวท', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'sky_wrath_warden', thaiName: 'ผู้พิทักษ์โทสะ', englishName: 'Wrath Warden', sprite: 'abyss_knight', color: '#a8474c', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'มนุษย์', role: 'ประชิด', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'sky_stormtalon', thaiName: 'กริฟฟินพายุ', englishName: 'Stormtalon', sprite: 'gale_sentinel', color: '#9e92a3', elementType: 'wind', elementLabel: 'ลม', tribe: 'สัตว์', role: 'ว่องไว', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
      { id: 'sky_talon_siren', thaiName: 'นางนกกรงเล็บ', englishName: 'Talon Siren', sprite: 'bat', color: '#a84c47', elementType: 'wind', elementLabel: 'ลม', tribe: 'ปีศาจ', role: 'ว่องไว', size: 'ใหญ่', stars: 3, aggressive: true, flying: true },
    ],
  },

  // 14. ห้วงอเวจี (ABYSS · 11 ตัว — มอน 10 · บอส 1)
  {
    mapId: 'abyss',
    biomeName: 'ห้วงอเวจี',
    baseLevel: 76,
    entries: [
      { id: 'abyss_rift_dragon_king', thaiName: 'ราชามังกรรอยแยก', englishName: 'Rift Dragon King', sprite: 'demon', color: '#453647', elementType: 'dark', elementLabel: 'มืด', tribe: 'มังกร', role: 'ประชิด', size: 'ใหญ่', stars: 5, aggressive: true, boss: true, flying: true, levelOffset: 6 },
      { id: 'abyss_wyrm_egg', thaiName: 'ไข่มังกร', englishName: 'Wyrm Egg', sprite: 'slime', color: '#ad7d87', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'มังกร', role: 'เฉื่อย', size: 'เล็ก', stars: 4 },
      { id: 'abyss_rift_hatchling', thaiName: 'ลูกมังกรรอยแยก', englishName: 'Rift Hatchling', sprite: 'orc', color: '#c48399', elementType: 'neutral', elementLabel: 'ไร้ธาตุ', tribe: 'มังกร', role: 'ประชิด', size: 'กลาง', stars: 4 },
      { id: 'abyss_rift_wyvern', thaiName: 'มังกรปีกรอยแยก', englishName: 'Rift Wyvern', sprite: 'bat', color: '#785a94', elementType: 'wind', elementLabel: 'ลม', tribe: 'มังกร', role: 'ว่องไว', size: 'กลาง', stars: 4, aggressive: true, flying: true },
      { id: 'abyss_wyrmling_runner', thaiName: 'ลูกมังกรนักวิ่ง', englishName: 'Wyrmling Runner', sprite: 'wolf', color: '#cf8247', elementType: 'earth', elementLabel: 'ดิน', tribe: 'มังกร', role: 'ว่องไว', size: 'กลาง', stars: 4, aggressive: true },
      { id: 'abyss_storm_wyrm', thaiName: 'มังกรพายุ', englishName: 'Storm Wyrm', sprite: 'wolf', color: '#5c82d4', elementType: 'wind', elementLabel: 'ลม', tribe: 'มังกร', role: 'ว่องไว', size: 'กลาง', stars: 4, aggressive: true, flying: true },
      { id: 'abyss_ember_wyrm', thaiName: 'มังกรถ่านเพลิง', englishName: 'Ember Wyrm', sprite: 'demon', color: '#c94c4c', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'มังกร', role: 'ประชิด', size: 'กลาง', stars: 4, aggressive: true },
      { id: 'abyss_wyrm_sage', thaiName: 'ปราชญ์มังกร', englishName: 'Wyrm Sage', sprite: 'skeleton', color: '#a3475c', elementType: 'fire', elementLabel: 'ไฟ', tribe: 'มังกร', role: 'เวท', size: 'กลาง', stars: 4, aggressive: true },
      { id: 'abyss_tidemaw_serpent', thaiName: 'งูทะเลสามเศียร', englishName: 'Tidemaw Serpent', sprite: 'demon', color: '#b55c78', elementType: 'water', elementLabel: 'น้ำ', tribe: 'มังกร', role: 'ระยะไกล', size: 'ใหญ่', stars: 4, aggressive: true },
      { id: 'abyss_rift_knight', thaiName: 'อัศวินรอยแยก', englishName: 'Rift Knight', sprite: 'abyss_knight', color: '#5c3c6b', elementType: 'dark', elementLabel: 'มืด', tribe: 'มนุษย์', role: 'ประชิด', size: 'ใหญ่', stars: 4, aggressive: true },
      { id: 'abyss_twisted_wyrm', thaiName: 'มังกรบิดเบี้ยว', englishName: 'Twisted Wyrm', sprite: 'demon', color: '#6b536b', elementType: 'dark', elementLabel: 'มืด', tribe: 'มังกร', role: 'ประชิด', size: 'ใหญ่', stars: 4, aggressive: true, flying: true },
    ],
  },

  // 15. บอสโลก (WORLD · 1 ตัว — มอน 0 · บอส 1)
  {
    mapId: 'world',
    biomeName: 'บอสโลก',
    baseLevel: 90,
    entries: [
      {
        id: 'world_goat',
        thaiName: 'แพะแห่งโลกา',
        englishName: 'World Goat',
        sprite: 'demon',
        color: '#6b3e59',
        elementType: 'dark',
        elementLabel: 'มืด',
        tribe: 'ปีศาจ',
        role: 'เวท',
        size: 'ใหญ่',
        stars: 5,
        aggressive: true,
        boss: true,
        levelOffset: 5,
        drops: [
          { itemId: 'abyss_crystal', chance: 1 },
          { itemId: 'dragon_armor', chance: 0.4 },
          { itemId: 'flame_sword', chance: 0.25 },
          { itemId: 'inferno_staff', chance: 0.25 },
          { itemId: 'phoenix_bow', chance: 0.25 },
          { itemId: 'demon_fang', chance: 0.25 },
          { itemId: 'enhance_stone', chance: 1 },
        ],
      },
    ],
  },
]

export const MONSTER_BIOME_MAP: Record<string, string> = {}
export const BIOME_SPAWNS: Record<string, { monsterId: string; count: number }[]> = {}
export const GENERATED_BIOME_MONSTERS: Record<string, MonsterDef> = {}
export const MONSTER_CATALOG_META: Record<string, MonsterCatalogMeta> = {}
export const CATALOG_ELEMENT_MAP: Record<string, CatalogElementType> = {}

for (const spec of BIOME_CATALOG_SPECS) {
  const spawns: { monsterId: string; count: number }[] = []
  const totalTypes = spec.entries.length
  const normalCountPerType = totalTypes === 1 ? 12 : totalTypes <= 7 ? 3 : totalTypes <= 15 ? 2 : 1

  spec.entries.forEach((entry, idx) => {
    MONSTER_BIOME_MAP[entry.id] = spec.mapId
    CATALOG_ELEMENT_MAP[entry.id] = entry.elementType
    MONSTER_CATALOG_META[entry.id] = {
      id: entry.id,
      mapId: spec.mapId,
      biomeName: spec.biomeName,
      thaiName: entry.thaiName,
      englishName: entry.englishName,
      elementType: entry.elementType,
      elementLabel: entry.elementLabel,
      tribe: entry.tribe,
      role: entry.role,
      size: entry.size,
      stars: entry.stars,
      aggressive: Boolean(entry.aggressive || entry.boss),
      boss: Boolean(entry.boss),
      flying: Boolean(entry.flying),
    }
    GENERATED_BIOME_MONSTERS[entry.id] = buildBiomeMonsterDef(spec.mapId, spec.baseLevel, idx, entry)
    spawns.push({
      monsterId: entry.id,
      count: entry.boss ? 1 : normalCountPerType,
    })
  })

  BIOME_SPAWNS[spec.mapId] = spawns
}
