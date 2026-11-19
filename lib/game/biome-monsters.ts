import type { MonsterDef, MonsterSprite } from './data'

export interface BiomeMonsterSeed {
  id: string
  name: string
  sprite: MonsterSprite
  color: string
  boss?: boolean
  levelOffset?: number
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
      { itemId: mat, chance: 0.9 },
      { itemId: 'enhance_stone', chance: 0.75 },
      { itemId: potion, chance: 0.6 },
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
  const hpBase = Math.round((24 + Math.pow(level, 1.88) * 2.8) * (isBoss ? 5.2 : 1))
  const atk = Math.round((5 + level * 4.4) * (isBoss ? 1.45 : 1))
  const def = Math.round((1 + level * 1.45) * (isBoss ? 1.5 : 1))
  const exp = Math.round((7 + Math.pow(level, 1.55) * 2.2) * (isBoss ? 4.8 : 1))
  const goldMin = Math.max(2, Math.round(level * (isBoss ? 22 : 2.6)))
  const goldMax = Math.max(goldMin + 2, Math.round(goldMin * 2.0))

  return {
    id: seed.id,
    name: seed.name,
    level,
    hp: hpBase,
    atk,
    def,
    exp,
    gold: [goldMin, goldMax],
    speed: seed.sprite === 'golem' || seed.sprite === 'earth_golem' ? 30 : seed.sprite === 'bat' ? 50 : 38,
    aggro: isBoss ? 150 : level <= 6 ? 45 : 105,
    sprite: seed.sprite,
    color: seed.color,
    boss: isBoss || undefined,
    drops: seed.drops ?? defaultDropsForBiome(mapId, isBoss),
  }
}

/**
 * 15 Biome Roster Tables matching 00-overview_b403ad0d.png (Total = 288 monsters).
 * Existing monster IDs keep their legacy definitions from data.ts; all new IDs are generated cleanly
 * and automatically pick up custom spritesheets once placed under /public/assets/hd/monsters/<id>/sheet.png.
 */
export const BIOME_CATALOG_SPECS: BiomeMonsterCatalogSpec[] = [
  // 1. ทุ่งหญ้า (meadow · 13)
  {
    mapId: 'meadow',
    biomeName: 'ทุ่งหญ้า',
    baseLevel: 1,
    entries: [
      { id: 'meadow_caterpillar', name: 'หนอนใบไม้', sprite: 'slime', color: '#84cc16', levelOffset: 0 },
      { id: 'meadow_chick_puff', name: 'ลูกเจี๊ยบปุยเมฆ', sprite: 'rabbit', color: '#fef3c7', levelOffset: 1 },
      { id: 'meadow_beetle', name: 'ด้วงทุ่งหญ้า', sprite: 'spider', color: '#78350f', levelOffset: 2 },
      { id: 'pink_slime', name: 'สไลม์ชมพู', sprite: 'slime', color: '#ff8fab', levelOffset: 3 },
      { id: 'slime', name: 'สไลม์เขียว', sprite: 'slime', color: '#57cc99', levelOffset: 0 },
      { id: 'meadow_cocoon', name: 'ดักแด้พฤกษา', sprite: 'slime', color: '#a16207', levelOffset: 4 },
      { id: 'meadow_spotted_egg', name: 'ไข่ปริศนาลายจุด', sprite: 'slime', color: '#a855f7', levelOffset: 5 },
      { id: 'meadow_flower_sprite', name: 'ภูตบุปผาแดง', sprite: 'mushroom', color: '#ef4444', levelOffset: 5 },
      { id: 'mushroom', name: 'เห็ดพิษ', sprite: 'mushroom', color: '#e76f51', levelOffset: 5 },
      { id: 'rabbit', name: 'กระต่ายป่า', sprite: 'rabbit', color: '#e9d8a6', levelOffset: 7 },
      { id: 'meadow_stag_knight', name: 'อัศวินด้วงคราม', sprite: 'goblin', color: '#3b82f6', levelOffset: 7 },
      { id: 'meadow_hare_scout', name: 'กระต่ายนักสู้', sprite: 'rabbit', color: '#d97706', levelOffset: 8 },
      { id: 'meadow_moss_spirit', name: 'ภูตมอสสายลม', sprite: 'slime', color: '#34d399', levelOffset: 9 },
    ],
  },

  // 2. หุบเขาเขียว (vale · 7, 1 gold boss)
  {
    mapId: 'vale',
    biomeName: 'หุบเขาเขียว',
    baseLevel: 7,
    entries: [
      { id: 'vale_tiger_king', name: 'พยัคฆ์หุบเขา', sprite: 'wolf', color: '#ea580c', boss: true, levelOffset: 4 },
      { id: 'slime_blue', name: 'สไลม์ฟ้า', sprite: 'slime', color: '#38bdf8', levelOffset: 0 },
      { id: 'vale_hornet', name: 'ต่อยักษ์หุบเขา', sprite: 'bat', color: '#f59e0b', levelOffset: 1 },
      { id: 'vale_leaf_frog', name: 'กบใบไม้', sprite: 'rabbit', color: '#65a30d', levelOffset: 2 },
      { id: 'vale_glow_shroom', name: 'เห็ดเรืองแสง', sprite: 'mushroom', color: '#38bdf8', levelOffset: 3 },
      { id: 'vale_treant_pot', name: 'หน่อไม้ดึกดำบรรพ์', sprite: 'mushroom', color: '#a16207', levelOffset: 4 },
      { id: 'vale_toad_knight', name: 'คางคกเกราะศิลา', sprite: 'orc', color: '#4d7c0f', levelOffset: 5 },
    ],
  },

  // 3. ป่าละเมาะ (woods · 1)
  {
    mapId: 'woods',
    biomeName: 'ป่าละเมาะ',
    baseLevel: 9,
    entries: [
      { id: 'woods_boar', name: 'หมูป่าเขี้ยวตัน', sprite: 'wolf', color: '#9a3412', levelOffset: 0 },
    ],
  },

  // 4. ป่าลึก (forest · 35, 5 gold bosses)
  {
    mapId: 'forest',
    biomeName: 'ป่าลึก',
    baseLevel: 14,
    entries: [
      { id: 'forest_crimson_warden', name: 'อัศวินเพลิงพงไพร', sprite: 'abyss_knight', color: '#dc2626', boss: true, levelOffset: 4 },
      { id: 'forest_flame_spirit', name: 'เทวีเพลิงพฤกษา', sprite: 'demon', color: '#f97316', boss: true, levelOffset: 5 },
      { id: 'forest_amber_queen', name: 'ราชินีผึ้งอำพัน', sprite: 'spider', color: '#d97706', boss: true, levelOffset: 5 },
      { id: 'forest_thorn_beast', name: 'อสูรขนหนาม', sprite: 'wolf', color: '#9333ea', boss: true, levelOffset: 6 },
      { id: 'goblin_chief', name: 'หัวหน้าก๊อบลิน', sprite: 'goblin', color: '#386641', boss: true, levelOffset: 4 },
      { id: 'forest_hedgehog', name: 'เม่นหนามป่า', sprite: 'rabbit', color: '#92400e' },
      { id: 'forest_squirrel', name: 'กระรอกหางพวง', sprite: 'rabbit', color: '#b45309' },
      { id: 'forest_viper', name: 'อสรพิษมรกต', sprite: 'wolf', color: '#16a34a' },
      { id: 'forest_tusk_boar', name: 'หมูป่าคลั่ง', sprite: 'wolf', color: '#7f1d1d' },
      { id: 'forest_raccoon', name: 'แรคคูนป่าลึก', sprite: 'wolf', color: '#64748b' },
      { id: 'forest_sunflower', name: 'ทานตะวันคลั่ง', sprite: 'mushroom', color: '#eab308' },
      { id: 'forest_slug', name: 'ทากเรืองแสง', sprite: 'slime', color: '#fbbf24' },
      { id: 'forest_pumpkin', name: 'ฟักทองต้องสาป', sprite: 'mushroom', color: '#f97316' },
      { id: 'forest_lotus_imp', name: 'ภูตบัวแดง', sprite: 'mushroom', color: '#fb7185' },
      { id: 'forest_moss_turtle', name: 'เต่ากระดองมอส', sprite: 'golem', color: '#15803d' },
      { id: 'forest_stag_beetle', name: 'ด้วงกว่างแดง', sprite: 'spider', color: '#991b1b' },
      { id: 'goblin', name: 'ก๊อบลิน', sprite: 'goblin', color: '#6a994e' },
      { id: 'forest_scout_elf', name: 'พรานเอลฟ์เงา', sprite: 'goblin', color: '#b45309' },
      { id: 'wolf', name: 'หมาป่า', sprite: 'wolf', color: '#8d99ae' },
      { id: 'forest_monkey', name: 'วานรป่าลึก', sprite: 'goblin', color: '#dc2626' },
      { id: 'forest_lynx', name: 'พยัคฆ์เพลิงน้อย', sprite: 'wolf', color: '#e11d48' },
      { id: 'forest_spore_bat', name: 'ค้างคาวละอองพิษ', sprite: 'bat', color: '#f472b6' },
      { id: 'forest_blue_fox', name: 'จิ้งจอกคราม', sprite: 'wolf', color: '#38bdf8' },
      { id: 'forest_leopard', name: 'เสือดาวป่าลึก', sprite: 'wolf', color: '#d97706' },
      { id: 'forest_mantis', name: 'ตั๊กแตนคมดาบ', sprite: 'spider', color: '#65a30d' },
      { id: 'forest_orc_hunter', name: 'ออร์คนักรบป่า', sprite: 'orc', color: '#4d7c0f' },
      { id: 'forest_grizzly', name: 'หมีกริซลี่', sprite: 'orc', color: '#78716c' },
      { id: 'forest_dryad', name: 'ดรายแอดพฤกษา', sprite: 'ghost', color: '#4ade80' },
      { id: 'forest_stone_troll', name: 'โทรลล์ศิลาป่า', sprite: 'golem', color: '#78716c' },
      { id: 'forest_dire_wolf', name: 'หมาป่าโลหิต', sprite: 'wolf', color: '#b91c1c' },
      { id: 'forest_heron', name: 'นกกระสาป่าลึก', sprite: 'bat', color: '#94a3b8' },
      { id: 'forest_moth', name: 'ผีเสื้อราตรี', sprite: 'bat', color: '#f59e0b' },
      { id: 'forest_treant', name: 'เทรนท์โบราณ', sprite: 'earth_golem', color: '#166534' },
      { id: 'forest_wood_elf', name: 'เอลฟ์พิทักษ์ไพร', sprite: 'goblin', color: '#15803d' },
      { id: 'forest_elder_druid', name: 'มหาปราชญ์ดรูอิด', sprite: 'skeleton', color: '#e2e8f0' },
    ],
  },

  // 5. ชายฝั่ง (coast · 28, 2 gold bosses)
  {
    mapId: 'coast',
    biomeName: 'ชายฝั่ง',
    baseLevel: 20,
    entries: [
      { id: 'coast_sea_warlord', name: 'ขุนพลแห่งท้องทะเล', sprite: 'abyss_knight', color: '#92400e', boss: true, levelOffset: 5 },
      { id: 'coast_king_lobster', name: 'ราชากุ้งมังกร', sprite: 'spider', color: '#dc2626', boss: true, levelOffset: 6 },
      { id: 'coast_puffer', name: 'ปลาปักเป้าพองลม', sprite: 'slime', color: '#22d3ee' },
      { id: 'coast_starfish', name: 'ปลาดาวชายหาด', sprite: 'slime', color: '#f97316' },
      { id: 'coast_clam', name: 'หอยมุกยักษ์', sprite: 'golem', color: '#a855f7' },
      { id: 'coast_crab', name: 'ปูก้ามดาบ', sprite: 'spider', color: '#ef4444' },
      { id: 'coast_snail', name: 'หอยสังข์ทะเล', sprite: 'slime', color: '#f59e0b' },
      { id: 'coast_hermit', name: 'ปูเสฉวนยักษ์', sprite: 'spider', color: '#d97706' },
      { id: 'coast_octopus', name: 'หมึกยักษ์แดง', sprite: 'spider', color: '#fb923c' },
      { id: 'coast_seal', name: 'แมวน้ำชายฝั่ง', sprite: 'wolf', color: '#cbd5e1' },
      { id: 'coast_coral_slime', name: 'สไลม์ปะการัง', sprite: 'slime', color: '#fda4af' },
      { id: 'coast_angler', name: 'ปลาแองเกลอร์', sprite: 'bat', color: '#14b8a6' },
      { id: 'coast_seagull', name: 'นกนางนวล', sprite: 'bat', color: '#e2e8f0' },
      { id: 'coast_reef_toad', name: 'กบปะการัง', sprite: 'rabbit', color: '#3b82f6' },
      { id: 'coast_reef_fish', name: 'ปลาน้ำตื้น', sprite: 'bat', color: '#fb7185' },
      { id: 'coast_bone_fish', name: 'ปลากระดูกผี', sprite: 'skeleton', color: '#cbd5e1' },
      { id: 'coast_squid', name: 'หมึกกระดองเวท', sprite: 'ghost', color: '#818cf8' },
      { id: 'coast_sea_turtle', name: 'เต่าสมุทรเกราะศิลา', sprite: 'golem', color: '#b45309' },
      { id: 'coast_kraken_spawn', name: 'อสูรเขาสมุทร', sprite: 'orc', color: '#2dd4bf' },
      { id: 'coast_jellyfish', name: 'แมงกะพรุนเรืองแสง', sprite: 'ghost', color: '#c084fc' },
      { id: 'coast_mermaid', name: 'นางเงือก', sprite: 'ghost', color: '#38bdf8' },
      { id: 'coast_kelp_beast', name: 'อสูรสาหร่าย', sprite: 'orc', color: '#84cc16' },
      { id: 'coast_sawfish', name: 'ปลาใบเลื่อย', sprite: 'wolf', color: '#fbbf24' },
      { id: 'coast_lizardman', name: 'นักรบกิ้งก่าทะเล', sprite: 'orc', color: '#16a34a' },
      { id: 'coast_siren', name: 'ไซเรนทะเลใต้', sprite: 'ghost', color: '#f472b6' },
      { id: 'coast_harpy', name: 'ฮาร์ปีชายฝั่ง', sprite: 'gale_sentinel', color: '#a855f7' },
      { id: 'coast_merfolk', name: 'ทหารเงือก', sprite: 'goblin', color: '#10b981' },
      { id: 'coast_cloud_spirit', name: 'ภูตฟองคลื่น', sprite: 'ghost', color: '#e0f2fe' },
    ],
  },

  // 6. ถ้ำ (cave · 23, 3 gold bosses)
  {
    mapId: 'cave',
    biomeName: 'ถ้ำ',
    baseLevel: 24,
    entries: [
      { id: 'cave_ant_king', name: 'ราชามดเกราะทอง', sprite: 'spider', color: '#b45309', boss: true, levelOffset: 5 },
      { id: 'cave_crystal_mantis', name: 'ตั๊กแตนผลึกม่วง', sprite: 'spider', color: '#c084fc', boss: true, levelOffset: 6 },
      { id: 'earth_golem', name: 'ผู้พิทักษ์ปฐพี', sprite: 'earth_golem', color: '#8c6b3f', boss: true, levelOffset: 7 },
      { id: 'cave_rat', name: 'หนูถ้ำ', sprite: 'rabbit', color: '#a8a29e' },
      { id: 'cave_fire_ant', name: 'มดเพลิงใต้พิภพ', sprite: 'spider', color: '#ea580c' },
      { id: 'cave_mole', name: 'ตุ่นยักษ์', sprite: 'orc', color: '#78350f' },
      { id: 'cave_kobold_miner', name: 'โคโบลด์นักขุดแร่', sprite: 'goblin', color: '#9a3412' },
      { id: 'cave_armadillo', name: 'ตัวนิ่มเกราะหิน', sprite: 'golem', color: '#78716c' },
      { id: 'bat', name: 'ค้างคาว', sprite: 'bat', color: '#5a189a' },
      { id: 'cave_slime', name: 'สไลม์ถ้ำชมพู', sprite: 'slime', color: '#e879f9' },
      { id: 'cave_crystal_slime', name: 'สไลม์ผลึก', sprite: 'slime', color: '#fbbf24' },
      { id: 'spider', name: 'แมงมุมพิษ', sprite: 'spider', color: '#581c87' },
      { id: 'cave_pangolin', name: 'ลิ่นเกราะขาว', sprite: 'golem', color: '#d6d3d1' },
      { id: 'cave_badger', name: 'แบดเจอร์เหมือง', sprite: 'orc', color: '#78350f' },
      { id: 'cave_brass_golem', name: 'โกเลมทองเหลือง', sprite: 'golem', color: '#ca8a04' },
      { id: 'cave_red_spider', name: 'แมงมุมแดงใต้ดิน', sprite: 'spider', color: '#b91c1c' },
      { id: 'cave_centipede', name: 'ตะขาบยักษ์', sprite: 'spider', color: '#dc2626' },
      { id: 'cave_blue_spider', name: 'แมงมุมคราม', sprite: 'spider', color: '#2563eb' },
      { id: 'cave_worm', name: 'หนอนยักษ์อเวจี', sprite: 'slime', color: '#7e22ce' },
      { id: 'cave_clay_bot', name: 'หุ่นดินเหนียว', sprite: 'golem', color: '#a16207' },
      { id: 'golem', name: 'โกเลมหิน', sprite: 'golem', color: '#78716c' },
      { id: 'orc', name: 'ออร์ค', sprite: 'orc', color: '#65a30d' },
      { id: 'cave_cockroach', name: 'แมลงสาบถ้ำยักษ์', sprite: 'spider', color: '#451a03' },
    ],
  },

  // 7. ทะเลทราย (desert · 23, 5 gold bosses)
  {
    mapId: 'desert',
    biomeName: 'ทะเลทราย',
    baseLevel: 30,
    entries: [
      { id: 'desert_pharaoh', name: 'ฟาโรห์ต้องคำสาป', sprite: 'skeleton', color: '#eab308', boss: true, levelOffset: 6 },
      { id: 'desert_sand_shark', name: 'ฉลามทรายยักษ์', sprite: 'wolf', color: '#fb923c', boss: true, levelOffset: 5 },
      { id: 'desert_sphinx_golem', name: 'โกเลมสฟิงซ์', sprite: 'earth_golem', color: '#ca8a04', boss: true, levelOffset: 6 },
      { id: 'desert_anubis_mage', name: 'มหาปุโรหิตอนูบิส', sprite: 'skeleton', color: '#38bdf8', boss: true, levelOffset: 7 },
      { id: 'desert_scarab_lord', name: 'จอมอสูรสคารับ', sprite: 'demon', color: '#d97706', boss: true, levelOffset: 8 },
      { id: 'desert_sandworm', name: 'หนอนทราย', sprite: 'slime', color: '#f97316' },
      { id: 'desert_cobra', name: 'งูเห่าทะเลทราย', sprite: 'wolf', color: '#d97706' },
      { id: 'desert_vulture', name: 'แร้งทะเลทราย', sprite: 'bat', color: '#92400e' },
      { id: 'desert_lizard', name: 'กิ้งก่าทราย', sprite: 'wolf', color: '#eab308' },
      { id: 'desert_dune_tortoise', name: 'เต่าโอเอซิส', sprite: 'golem', color: '#a16207' },
      { id: 'desert_scorpion', name: 'แมงป่องเพลิงทราย', sprite: 'spider', color: '#dc2626' },
      { id: 'desert_jackal', name: 'หมาป่าแจ็กคัล', sprite: 'wolf', color: '#b45309' },
      { id: 'desert_mirage_egg', name: 'ไข่มายาทะเลทราย', sprite: 'slime', color: '#f472b6' },
      { id: 'desert_oasis_owl', name: 'นกฮูกโอเอซิส', sprite: 'rabbit', color: '#38bdf8' },
      { id: 'desert_cactus', name: 'กระบองเพชรมีชีวิต', sprite: 'mushroom', color: '#22c55e' },
      { id: 'desert_mummy', name: 'มัมมี่โบราณ', sprite: 'skeleton', color: '#d6d3d1' },
      { id: 'desert_ostrich', name: 'นกกระจอกเทศ', sprite: 'rabbit', color: '#3b82f6' },
      { id: 'desert_magma_tortoise', name: 'เต่าศิลาทราย', sprite: 'golem', color: '#b91c1c' },
      { id: 'desert_sand_monk', name: 'นักสู้พายุทราย', sprite: 'orc', color: '#e2e8f0' },
      { id: 'desert_oasis_dancer', name: 'ภูตระบำโอเอซิส', sprite: 'ghost', color: '#2dd4bf' },
      { id: 'desert_lamp_djinn', name: 'ภูตพรมวิเศษ', sprite: 'ghost', color: '#78716c' },
      { id: 'desert_sand_golem', name: 'โกเลมทราย', sprite: 'golem', color: '#a8a29e' },
      { id: 'desert_anubis_guard', name: 'องครักษ์อนูบิส', sprite: 'skeleton', color: '#b45309' },
    ],
  },

  // 8. สุสาน (graveyard · 23, 2 gold bosses)
  {
    mapId: 'graveyard',
    biomeName: 'สุสาน',
    baseLevel: 34,
    entries: [
      { id: 'boss_lich', name: 'จอมเวทโครงกระดูก', sprite: 'skeleton', color: '#9333ea', boss: true, levelOffset: 5 },
      { id: 'grave_necrolord', name: 'ราชันย์อันเดด', sprite: 'skeleton', color: '#3b82f6', boss: true, levelOffset: 7 },
      { id: 'grave_hellhound', name: 'หมาป่านรกสุสาน', sprite: 'wolf', color: '#1e1b4b' },
      { id: 'ghost', name: 'วิญญาณหลอน', sprite: 'ghost', color: '#caf0f8' },
      { id: 'grave_zombie', name: 'ซอมบี้', sprite: 'orc', color: '#4d7c0f' },
      { id: 'grave_ghoul', name: 'กูลสุสาน', sprite: 'orc', color: '#3f6212' },
      { id: 'grave_bone_archer', name: 'นักสู้กระดูกสาว', sprite: 'skeleton', color: '#c084fc' },
      { id: 'skeleton', name: 'โครงกระดูก', sprite: 'skeleton', color: '#e9e3d5' },
      { id: 'grave_skele_archer', name: 'พลธนูโครงกระดูก', sprite: 'skeleton', color: '#d6d3d1' },
      { id: 'grave_cultist', name: 'สาวกผ้าคลุมแดง', sprite: 'skeleton', color: '#991b1b' },
      { id: 'grave_lantern_keeper', name: 'สัปเหร่อวิญญาณ', sprite: 'goblin', color: '#7f1d1d' },
      { id: 'grave_bandit_undead', name: 'ทหารผีดิบ', sprite: 'goblin', color: '#92400e' },
      { id: 'grave_wraith', name: 'เรธยมทูต', sprite: 'ghost', color: '#475569' },
      { id: 'grave_lantern_spirit', name: 'วิญญาณตะเกียง', sprite: 'ghost', color: '#60a5fa' },
      { id: 'grave_vampire_knight', name: 'อัศวินแวมไพร์', sprite: 'skeleton', color: '#be123c' },
      { id: 'grave_duelist_ghost', name: 'นักดาบต้องสาป', sprite: 'skeleton', color: '#cbd5e1' },
      { id: 'grave_cursed_tree', name: 'ต้นไม้ต้องสาป', sprite: 'earth_golem', color: '#581c87' },
      { id: 'grave_bone_guard', name: 'อัศวินโครงกระดูก', sprite: 'skeleton', color: '#65a30d' },
      { id: 'grave_banshee', name: 'แบนชี', sprite: 'ghost', color: '#334155' },
      { id: 'grave_bride_spirit', name: 'วิญญาณเจ้าสาว', sprite: 'ghost', color: '#c084fc' },
      { id: 'grave_deer_shaman', name: 'หมอผีเขากวาง', sprite: 'skeleton', color: '#7f1d1d' },
      { id: 'grave_crimson_warlock', name: 'จอมเวทโลหิต', sprite: 'skeleton', color: '#dc2626' },
      { id: 'grave_shadow_lich', name: 'นักบวชเงามรณะ', sprite: 'skeleton', color: '#1e293b' },
    ],
  },

  // 9. หมู่เกาะตะวันออก (isles · 20, 6 gold bosses)
  {
    mapId: 'isles',
    biomeName: 'หมู่เกาะตะวันออก',
    baseLevel: 40,
    entries: [
      { id: 'isles_pine_spirit', name: 'เทพพฤกษาพันปี', sprite: 'earth_golem', color: '#15803d', boss: true, levelOffset: 5 },
      { id: 'isles_sakura_lady', name: 'ท่านหญิงซากุระ', sprite: 'ghost', color: '#f472b6', boss: true, levelOffset: 6 },
      { id: 'isles_kitsune_miko', name: 'มิโกะเก้าหาง', sprite: 'ghost', color: '#fb7185', boss: true, levelOffset: 6 },
      { id: 'isles_jade_oni', name: 'โอนิเกราะศิลา', sprite: 'earth_golem', color: '#65a30d', boss: true, levelOffset: 7 },
      { id: 'isles_shogun', name: 'โชกุนมังกรทอง', sprite: 'demon', color: '#d97706', boss: true, levelOffset: 7 },
      { id: 'isles_samurai_lord', name: 'แม่ทัพซามูไร', sprite: 'abyss_knight', color: '#92400e', boss: true, levelOffset: 8 },
      { id: 'isles_shiba_guard', name: 'ชิบะอารักษ์', sprite: 'wolf', color: '#ea580c' },
      { id: 'isles_umbrella_yokai', name: 'ปีศาจร่มคาราคาสะ', sprite: 'ghost', color: '#a855f7' },
      { id: 'isles_daruma', name: 'ดารุมะคลั่ง', sprite: 'mushroom', color: '#dc2626' },
      { id: 'isles_tengu_imp', name: 'เท็งงูน้อย', sprite: 'goblin', color: '#ef4444' },
      { id: 'isles_lantern_monk', name: 'นักพรตโคมไฟ', sprite: 'skeleton', color: '#78350f' },
      { id: 'isles_mochi_spirit', name: 'ภูตโมจิ', sprite: 'slime', color: '#fecdd3' },
      { id: 'isles_wooden_doll', name: 'หุ่นเชิดไม้', sprite: 'goblin', color: '#b45309' },
      { id: 'isles_mikan_treant', name: 'ต้นส้มเทพารักษ์', sprite: 'mushroom', color: '#f97316' },
      { id: 'isles_crow_tengu', name: 'คาราสุเท็งงู', sprite: 'gale_sentinel', color: '#1e293b' },
      { id: 'isles_yuki_onna', name: 'ยูกิอนนะ', sprite: 'ghost', color: '#38bdf8' },
      { id: 'isles_kunoichi', name: 'คุโนอิจิเงา', sprite: 'goblin', color: '#9333ea' },
      { id: 'isles_ronin', name: 'โรนินพเนจร', sprite: 'goblin', color: '#be123c' },
      { id: 'isles_totem_spirit', name: 'เสาโทเท็มโบราณ', sprite: 'golem', color: '#a16207' },
      { id: 'isles_tanuki', name: 'ทานูกิโคมแดง', sprite: 'wolf', color: '#d97706' },
    ],
  },

  // 10. แดนหิมะ (snow · 15, 2 gold bosses)
  {
    mapId: 'snow',
    biomeName: 'แดนหิมะ',
    baseLevel: 50,
    entries: [
      { id: 'snow_frost_tiger', name: 'พยัคฆ์เหมันต์', sprite: 'wolf', color: '#38bdf8', boss: true, levelOffset: 5 },
      { id: 'snow_glacier_wyrm', name: 'มังกรน้ำแข็ง', sprite: 'demon', color: '#22d3ee', boss: true, levelOffset: 7 },
      { id: 'snow_frost_boar', name: 'หมูป่าหิมะ', sprite: 'wolf', color: '#b45309' },
      { id: 'snow_ice_pixie', name: 'ภูตผลึกน้ำแข็ง', sprite: 'ghost', color: '#60a5fa' },
      { id: 'snow_cloud_puff', name: 'ปุยหิมะ', sprite: 'slime', color: '#e0f2fe' },
      { id: 'snow_arctic_fox', name: 'จิ้งจอกอาร์กติก', sprite: 'wolf', color: '#cbd5e1' },
      { id: 'snow_scarf_seal', name: 'แมวน้ำหิมะ', sprite: 'wolf', color: '#f8fafc' },
      { id: 'snow_frost_wolf', name: 'หมาป่าเหมันต์', sprite: 'wolf', color: '#818cf8' },
      { id: 'snow_igloo_crab', name: 'อิกลูมีชีวิต', sprite: 'golem', color: '#93c5fd' },
      { id: 'snow_blizzard_wisp', name: 'วิญญาณพายุหิมะ', sprite: 'ghost', color: '#38bdf8' },
      { id: 'snow_yeti', name: 'เยติยักษ์', sprite: 'orc', color: '#e2e8f0' },
      { id: 'snow_polar_bear', name: 'หมีขั้วโลก', sprite: 'orc', color: '#f1f5f9' },
      { id: 'snow_winter_gnome', name: 'โนมฤดูหนาว', sprite: 'goblin', color: '#fb7185' },
      { id: 'snow_mammoth', name: 'แมมมอธดึกดำบรรพ์', sprite: 'golem', color: '#78350f' },
      { id: 'snow_ice_golem', name: 'โกเลมน้ำแข็ง', sprite: 'golem', color: '#0284c7' },
    ],
  },

  // 11. ซากปราสาท (ruins · 47, 5 gold bosses)
  {
    mapId: 'ruins',
    biomeName: 'ซากปราสาท',
    baseLevel: 56,
    entries: [
      { id: 'ruins_cauldron_golem', name: 'โกเลมหม้ออาคม', sprite: 'earth_golem', color: '#ca8a04', boss: true, levelOffset: 4 },
      { id: 'ruins_crimson_seraph', name: 'เซราฟิมโลหิต', sprite: 'gale_sentinel', color: '#e11d48', boss: true, levelOffset: 5 },
      { id: 'ruins_red_blademaster', name: 'อัศวินดาบชาด', sprite: 'abyss_knight', color: '#dc2626', boss: true, levelOffset: 6 },
      { id: 'ruins_iron_colossus', name: 'จักรกลยักษ์ปราสาท', sprite: 'earth_golem', color: '#b45309', boss: true, levelOffset: 6 },
      { id: 'ruins_shadow_paladin', name: 'พาราดินทมิฬ', sprite: 'abyss_knight', color: '#6d28d9', boss: true, levelOffset: 7 },
      { id: 'ruins_arcane_titan', name: 'ไททันเวทมนตร์', sprite: 'golem', color: '#a855f7' },
      { id: 'ruins_mimic_chest', name: 'หีบสมบัติมีชีวิต', sprite: 'golem', color: '#d97706' },
      { id: 'ruins_floating_eye', name: 'ดวงตาอสูร', sprite: 'bat', color: '#be123c' },
      { id: 'ruins_slime_turret', name: 'อสูรกลไกอาคม', sprite: 'golem', color: '#4d7c0f' },
      { id: 'ruins_jester_mage', name: 'จอมเวทคทารัตติกาล', sprite: 'skeleton', color: '#f472b6' },
      { id: 'ruins_gargoyle_imp', name: 'อิมป์ปราสาท', sprite: 'demon', color: '#0d9488' },
      { id: 'ruins_plush_hare', name: 'ตุ๊กตากระต่ายต้องสาป', sprite: 'rabbit', color: '#fb7185' },
      { id: 'ruins_lantern_bot', name: 'หุ่นตะเกียงโบราณ', sprite: 'golem', color: '#a16207' },
      { id: 'ruins_stone_gargoyle', name: 'การ์กอยล์ศิลา', sprite: 'bat', color: '#94a3b8' },
      { id: 'ruins_scare_puppet', name: 'หุ่นไล่กาเหล็ก', sprite: 'skeleton', color: '#b45309' },
      { id: 'ruins_witch_apprentice', name: 'แม่มดแดงแห่งซาก', sprite: 'ghost', color: '#991b1b' },
      { id: 'ruins_clockwork_doll', name: 'ตุ๊กตาไขลาน', sprite: 'ghost', color: '#fb7185' },
      { id: 'ruins_candle_spirit', name: 'ภูตเชิงเทียน', sprite: 'ghost', color: '#be123c' },
      { id: 'ruins_astro_orb', name: 'ลูกแก้วดาราศาสตร์', sprite: 'bat', color: '#3b82f6' },
      { id: 'ruins_clock_fiend', name: 'ปีศาจนาฬิกา', sprite: 'golem', color: '#65a30d' },
      { id: 'ruins_ooze_knight', name: 'สไลม์อัศวิน', sprite: 'slime', color: '#7e22ce' },
      { id: 'ruins_royal_guard', name: 'องครักษ์ปราสาท', sprite: 'abyss_knight', color: '#38bdf8' },
      { id: 'ruins_cursed_maid', name: 'สาวใช้ต้องสาป', sprite: 'ghost', color: '#cbd5e1' },
      { id: 'ruins_dark_witch', name: 'แม่มดทมิฬ', sprite: 'ghost', color: '#4c1d95' },
      { id: 'ruins_obsidian_guard', name: 'อัศวินออบซิเดียน', sprite: 'abyss_knight', color: '#312e81' },
      { id: 'ruins_necro_scholar', name: 'ปราชญ์เวทมนตร์ดำ', sprite: 'skeleton', color: '#581c87' },
      { id: 'ruins_noble_ghost', name: 'วิญญาณขุนนาง', sprite: 'ghost', color: '#e2e8f0' },
      { id: 'ruins_straw_puppet', name: 'หุ่นเชิดปราสาท', sprite: 'skeleton', color: '#d97706' },
      { id: 'ruins_royal_squire', name: 'อัศวินฝึกหัดผีสิง', sprite: 'goblin', color: '#e11d48' },
      { id: 'ruins_pink_automaton', name: 'อัศวินกุหลาบเหล็ก', sprite: 'abyss_knight', color: '#f472b6' },
      { id: 'ruins_clay_sentinel', name: 'โกเลมผู้เฝ้าประตู', sprite: 'golem', color: '#a8a29e' },
      { id: 'ruins_blood_witch', name: 'จอมเวทกุหลาบแดง', sprite: 'ghost', color: '#be123c' },
      { id: 'ruins_phantom_steed', name: 'อาชาปีศาจ', sprite: 'wolf', color: '#9333ea' },
      { id: 'ruins_relic_knight', name: 'อัศวินศิลาโบราณ', sprite: 'golem', color: '#d6d3d1' },
      { id: 'ruins_floating_sword', name: 'ดาบต้องสาปลอยฟ้า', sprite: 'bat', color: '#cbd5e1' },
      { id: 'ruins_halberd_spirit', name: 'ง้าวอาคม', sprite: 'bat', color: '#ef4444' },
      { id: 'ruins_royal_executioner', name: 'เพชฌฆาตปราสาท', sprite: 'orc', color: '#92400e' },
      { id: 'ruins_crimson_valkyrie', name: 'วัลคิรีสีชาด', sprite: 'gale_sentinel', color: '#fb7185' },
      { id: 'ruins_ice_banshee', name: 'วิญญาณราชินีน้ำแข็ง', sprite: 'ghost', color: '#60a5fa' },
      { id: 'ruins_thorn_fairy', name: 'ภูตหนามกุหลาบ', sprite: 'bat', color: '#65a30d' },
      { id: 'ruins_bone_pillar', name: 'เสาโลหิตต้องสาป', sprite: 'golem', color: '#9f1239' },
      { id: 'ruins_crystal_wisp', name: 'ภูตผลึกม่วง', sprite: 'ghost', color: '#c084fc' },
      { id: 'ruins_crimson_knight', name: 'อัศวินเกราะชาด', sprite: 'abyss_knight', color: '#dc2626' },
      { id: 'ruins_bone_duelist', name: 'นักดาบกระดูกเงิน', sprite: 'skeleton', color: '#e2e8f0' },
      { id: 'ruins_scarlet_reaper', name: 'ยมทูตผ้าคลุมแดง', sprite: 'skeleton', color: '#b91c1c' },
      { id: 'ruins_bow_warden', name: 'พลธนูซากปราสาท', sprite: 'goblin', color: '#b45309' },
      { id: 'ruins_fallen_monk', name: 'นักบวชล่มสลาย', sprite: 'ghost', color: '#94a3b8' },
    ],
  },

  // 12. ภูเขาไฟ (volcano · 18, 1 gold boss)
  {
    mapId: 'volcano',
    biomeName: 'ภูเขาไฟ',
    baseLevel: 62,
    entries: [
      { id: 'demon_lord', name: 'ราชาปีศาจเพลิง', sprite: 'demon', color: '#ef4444', boss: true, levelOffset: 6 },
      { id: 'volcano_lava_crab', name: 'ปูหินลาวา', sprite: 'spider', color: '#7f1d1d' },
      { id: 'volcano_magma_bat', name: 'ค้างคาวแมกมา', sprite: 'bat', color: '#dc2626' },
      { id: 'volcano_lava_slime', name: 'สไลม์ลาวา', sprite: 'slime', color: '#f97316' },
      { id: 'volcano_ash_hound', name: 'สุนัขเถ้าถ่าน', sprite: 'wolf', color: '#7c2d12' },
      { id: 'volcano_fire_scorpion', name: 'แมงป่องเพลิง', sprite: 'spider', color: '#ea580c' },
      { id: 'volcano_wisp', name: 'วิญญาณไฟม่วง', sprite: 'ghost', color: '#a855f7' },
      { id: 'volcano_hell_wolf', name: 'หมาป่าเพลิงนรก', sprite: 'wolf', color: '#dc2626' },
      { id: 'demon', name: 'ปีศาจ', sprite: 'demon', color: '#9d0208' },
      { id: 'volcano_skull_flame', name: 'กะโหลกเพลิง', sprite: 'skeleton', color: '#f97316' },
      { id: 'volcano_pyromancer', name: 'จอมเวทอัคคี', sprite: 'skeleton', color: '#ec4899' },
      { id: 'fire_golem', name: 'โกเลมเพลิง', sprite: 'golem', color: '#e85d04' },
      { id: 'volcano_furnace_crab', name: 'เตาหลอมมีชีวิต', sprite: 'golem', color: '#92400e' },
      { id: 'volcano_nightmare_steed', name: 'อาชาเพลิงนรก', sprite: 'wolf', color: '#f97316' },
      { id: 'volcano_blaze_beast', name: 'อสูรเปลวสุริยัน', sprite: 'wolf', color: '#dc2626' },
      { id: 'volcano_flame_dancer', name: 'ภูตระบำเพลิง', sprite: 'ghost', color: '#f43f5e' },
      { id: 'volcano_solar_lion', name: 'ราชสีห์เพลิงทอง', sprite: 'wolf', color: '#fbbf24' },
      { id: 'volcano_cerberus', name: 'เซอร์เบอรัส', sprite: 'wolf', color: '#991b1b' },
    ],
  },

  // 13. แดนลอยฟ้า (sky · 23, 2 gold bosses)
  {
    mapId: 'sky',
    biomeName: 'แดนลอยฟ้า',
    baseLevel: 68,
    entries: [
      { id: 'sky_celestial_warden', name: 'ผู้พิทักษ์สวรรค์', sprite: 'gale_sentinel', color: '#a855f7', boss: true, levelOffset: 5 },
      { id: 'sky_archangel', name: 'อัครทูตสวรรค์', sprite: 'gale_sentinel', color: '#fde047', boss: true, levelOffset: 7 },
      { id: 'sky_cloud_lamb', name: 'แกะปุยเมฆ', sprite: 'rabbit', color: '#fef3c7' },
      { id: 'sky_sunbird', name: 'นกสุริยัน', sprite: 'bat', color: '#f97316' },
      { id: 'sky_dragonfly', name: 'แมลงปอเวหา', sprite: 'bat', color: '#fbbf24' },
      { id: 'sky_silk_moth', name: 'ผีเสื้อเมฆา', sprite: 'bat', color: '#f5d0fe' },
      { id: 'sky_winged_boar', name: 'หมูติดปีกสวรรค์', sprite: 'rabbit', color: '#f472b6' },
      { id: 'sky_celestial_ram', name: 'แกะเขาเมฆา', sprite: 'wolf', color: '#eab308' },
      { id: 'sky_fox_glider', name: 'จิ้งจอกสายลม', sprite: 'wolf', color: '#f97316' },
      { id: 'sky_propeller_slime', name: 'ภูตใบพัด', sprite: 'bat', color: '#65a30d' },
      { id: 'sky_baby_wyvern', name: 'ลูกมังกรเวหา', sprite: 'bat', color: '#fb7185' },
      { id: 'sky_cloud_whale', name: 'วาฬเมฆา', sprite: 'slime', color: '#38bdf8' },
      { id: 'sky_crimson_phoenix', name: 'ฟีนิกซ์สุริยัน', sprite: 'bat', color: '#ef4444' },
      { id: 'sky_storm_wizard', name: 'จอมเวทเมฆา', sprite: 'ghost', color: '#a855f7' },
      { id: 'sky_pegasus', name: 'เพกาซัส', sprite: 'wolf', color: '#e0e7ff' },
      { id: 'sky_paladin_golem', name: 'โกเลมสวรรค์', sprite: 'golem', color: '#facc15' },
      { id: 'sky_valkyrie', name: 'วัลคิรีแสง', sprite: 'gale_sentinel', color: '#fb7185' },
      { id: 'sky_cloud_shark', name: 'ฉลามนภา', sprite: 'wolf', color: '#fde047' },
      { id: 'gale_sentinel', name: 'ผู้พิทักษ์สายลม', sprite: 'gale_sentinel', color: '#8ee7ff' },
      { id: 'sky_seraph_blade', name: 'ทูตสวรรค์ดาบแสง', sprite: 'gale_sentinel', color: '#fca5a5' },
      { id: 'sky_solar_titan', name: 'อัศวินสุริยะ', sprite: 'abyss_knight', color: '#d97706' },
      { id: 'sky_griffin', name: 'กริฟฟิน', sprite: 'gale_sentinel', color: '#92400e' },
      { id: 'sky_wind_wyvern', name: 'ไวเวิร์นวายุ', sprite: 'bat', color: '#22c55e' },
    ],
  },

  // 14. ห้วงอเวจี (abyss · 11, 1 gold boss)
  {
    mapId: 'abyss',
    biomeName: 'ห้วงอเวจี',
    baseLevel: 76,
    entries: [
      { id: 'abyss_dragon', name: 'มังกรอเวจี', sprite: 'demon', color: '#24104f', boss: true, levelOffset: 6 },
      { id: 'abyss_dragon_egg', name: 'ไข่มังกรอเวจี', sprite: 'slime', color: '#7f1d1d' },
      { id: 'abyss_hatchling', name: 'ลูกมังกรเพลิงมืด', sprite: 'orc', color: '#f43f5e' },
      { id: 'abyss_void_wyvern', name: 'ไวเวิร์นอเวจี', sprite: 'bat', color: '#7e22ce' },
      { id: 'abyss_amber_drake', name: 'เดรคอำพัน', sprite: 'wolf', color: '#f59e0b' },
      { id: 'abyss_frost_drake', name: 'เดรคเหมันต์', sprite: 'wolf', color: '#3b82f6' },
      { id: 'abyss_crimson_drake', name: 'เดรคโลหิต', sprite: 'wolf', color: '#ef4444' },
      { id: 'abyss_draconic_mage', name: 'นักเวทมังกร', sprite: 'skeleton', color: '#dc2626' },
      { id: 'abyss_hydra', name: 'ไฮดราสามหัว', sprite: 'demon', color: '#b91c1c' },
      { id: 'abyss_knight', name: 'อัศวินห้วงอเวจี', sprite: 'golem', color: '#5b21b6' },
      { id: 'abyss_elder_wyrm', name: 'มังกรโบราณอเวจี', sprite: 'demon', color: '#6b21a8' },
    ],
  },

  // 15. บอสโลก (world · 1 gold boss)
  {
    mapId: 'world',
    biomeName: 'บอสโลก',
    baseLevel: 90,
    entries: [
      {
        id: 'world_overlord',
        name: 'จอมมารโลกันตร์ (World Boss)',
        sprite: 'demon',
        color: '#7c2d12',
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

for (const spec of BIOME_CATALOG_SPECS) {
  const spawns: { monsterId: string; count: number }[] = []
  const totalTypes = spec.entries.length
  const normalCountPerType = totalTypes === 1 ? 12 : totalTypes <= 7 ? 3 : totalTypes <= 15 ? 2 : 1

  spec.entries.forEach((entry, idx) => {
    MONSTER_BIOME_MAP[entry.id] = spec.mapId
    GENERATED_BIOME_MONSTERS[entry.id] = buildBiomeMonsterDef(spec.mapId, spec.baseLevel, idx, entry)
    spawns.push({
      monsterId: entry.id,
      count: entry.boss ? 1 : normalCountPerType,
    })
  })

  BIOME_SPAWNS[spec.mapId] = spawns
}
