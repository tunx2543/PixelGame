export type BgmTheme =
  | 'login'
  | 'town'
  | 'field'
  | 'dungeon'
  | 'battle'
  | 'boss'
  | 'event'

export type BgmTrackId =
  | BgmTheme
  | 'meadow'
  | 'vale'
  | 'woods'
  | 'forest'
  | 'coast'
  | 'cave'
  | 'desert'
  | 'graveyard'
  | 'isles'
  | 'snow'
  | 'ruins'
  | 'volcano'
  | 'sky'
  | 'abyss'
  | 'world'
  | 'act_invasion'
  | 'act_guild_war'
  | 'act_bounty'
  | 'act_treasure'
  | 'act_fishing'

export type BgmTrackCategory = 'town' | 'field' | 'dungeon' | 'activity' | 'combat'

export interface BgmTrackSpec {
  theme: BgmTheme
  labelTh: string
  descriptionTh: string
  /** Preferred audio file paths in public/ (OGG / MP3) */
  candidates: readonly [string, string]
}

export interface BgmMapTrackMeta {
  trackId: BgmTrackId
  theme: BgmTheme
  category: BgmTrackCategory
  labelTh: string
  titleEn: string
  styleTh: string
  moodTh: string
  bpm: number
  keyLabel: string
  candidates: readonly string[]
}

export interface BgmResolveContext {
  screen?: 'login' | 'game' | 'tower' | 'encounter'
  mapId?: string
  bossActive?: boolean
  inCombat?: boolean
  combatElapsedSec?: number
  eventActive?: boolean
  dungeonActive?: boolean
}

export interface BgmEffectiveSelection {
  theme: BgmTheme
  trackId: BgmTrackId
  isPinned: boolean
}

export const BGM_BATTLE_HOLD_SEC = 8

export const BGM_TRACK_CATEGORY_LABELS: Record<BgmTrackCategory, string> = {
  town: 'เมือง & หน้าแรก',
  field: 'Open World',
  dungeon: 'ดันเจี้ยน',
  activity: 'กิจกรรม & เทศกาล',
  combat: 'ต่อสู้ & บอส',
}

export const BGM_THEMES: readonly BgmTheme[] = [
  'login',
  'town',
  'field',
  'dungeon',
  'battle',
  'boss',
  'event',
] as const

export const BGM_TRACK_IDS: readonly BgmTrackId[] = [
  'login',
  'town',
  'field',
  'dungeon',
  'battle',
  'boss',
  'event',
  'meadow',
  'vale',
  'woods',
  'forest',
  'coast',
  'cave',
  'desert',
  'graveyard',
  'isles',
  'snow',
  'ruins',
  'volcano',
  'sky',
  'abyss',
  'world',
  'act_invasion',
  'act_guild_war',
  'act_bounty',
  'act_treasure',
  'act_fishing',
] as const

export const BGM_TRACK_CATALOG: Record<BgmTheme, BgmTrackSpec> = {
  login: {
    theme: 'login',
    labelTh: 'เพลงหน้า Login',
    descriptionTh: 'หน้าจอเริ่มต้นและเลือกตัวละคร',
    candidates: ['/audio/bgm/login.ogg', '/audio/bgm/login.mp3'],
  },
  town: {
    theme: 'town',
    labelTh: 'เพลงเมืองหลัก',
    descriptionTh: 'เมืองปราการเริ่มต้นและเขตปลอดภัย',
    candidates: ['/audio/bgm/town.ogg', '/audio/bgm/town.mp3'],
  },
  field: {
    theme: 'field',
    labelTh: 'เพลงแผนที่เก็บเลเวล',
    descriptionTh: 'ทุ่งหญ้า ป่าลึก ชายฝั่ง ทะเลทราย และแดนหิมะ',
    candidates: ['/audio/bgm/field.ogg', '/audio/bgm/field.mp3'],
  },
  dungeon: {
    theme: 'dungeon',
    labelTh: 'เพลงดันเจี้ยน',
    descriptionTh: 'ถ้ำ ซากปราสาท สุสาน ภูเขาไฟ ห้วงอเวจี และหอคอย',
    candidates: ['/audio/bgm/dungeon.ogg', '/audio/bgm/dungeon.mp3'],
  },
  battle: {
    theme: 'battle',
    labelTh: 'เพลงต่อสู้มอนสเตอร์',
    descriptionTh: 'ขณะปะทะมอนสเตอร์ทั่วไปในแผนที่หรือสนามต่อสู้',
    candidates: ['/audio/bgm/battle.ogg', '/audio/bgm/battle.mp3'],
  },
  boss: {
    theme: 'boss',
    labelTh: 'เพลงต่อสู้บอส',
    descriptionTh: 'บอสแผนที่ บอสหอคอย และเวิลด์บอส',
    candidates: ['/audio/bgm/boss.ogg', '/audio/bgm/boss.mp3'],
  },
  event: {
    theme: 'event',
    labelTh: 'เพลงกิจกรรมพิเศษ',
    descriptionTh: 'แผนที่กิจกรรมพิเศษและภารกิจป้องกันเมือง',
    candidates: ['/audio/bgm/event.ogg', '/audio/bgm/event.mp3'],
  },
}

function makeCandidates(trackId: BgmTrackId, fallbackTheme: BgmTheme): readonly string[] {
  if (trackId === fallbackTheme) {
    return [`/audio/bgm/${trackId}.ogg`, `/audio/bgm/${trackId}.mp3`]
  }
  return [
    `/audio/bgm/map_${trackId}.ogg`,
    `/audio/bgm/map_${trackId}.mp3`,
    `/audio/bgm/${trackId}.ogg`,
    `/audio/bgm/${trackId}.mp3`,
    `/audio/bgm/${fallbackTheme}.ogg`,
    `/audio/bgm/${fallbackTheme}.mp3`,
  ]
}

export const BGM_MAP_TRACK_CATALOG: Record<BgmTrackId, BgmMapTrackMeta> = {
  login: {
    trackId: 'login',
    theme: 'login',
    category: 'town',
    labelTh: 'หน้าแรก · รุ่งอรุณแห่งอาณาจักร',
    titleEn: 'Dawn of the Realm',
    styleTh: 'Orchestral Harp, Choir & Horn',
    moodTh: 'อลังการ ชวนออกเดินทางสู่โลกแฟนตาซี',
    bpm: 78,
    keyLabel: 'C Maj',
    candidates: makeCandidates('login', 'login'),
  },
  town: {
    trackId: 'town',
    theme: 'town',
    category: 'town',
    labelTh: 'เมืองปราการเริ่มต้น · ลานแสงแรก',
    titleEn: 'Haven of First Light',
    styleTh: 'Acoustic Lute, Flute & Warm Strings',
    moodTh: 'อบอุ่น ปลอดภัย กลิ่นอายเมืองหลวง MMORPG ยามเช้า',
    bpm: 92,
    keyLabel: 'G Maj',
    candidates: makeCandidates('town', 'town'),
  },
  field: {
    trackId: 'field',
    theme: 'field',
    category: 'field',
    labelTh: 'แดนผจญภัย Open World',
    titleEn: 'Boundless Horizon',
    styleTh: 'Pastoral Whistle, Harp & Strings',
    moodTh: 'โปร่งโล่ง กว้างไกล พร้อมออกสำรวจเส้นขอบฟ้า',
    bpm: 104,
    keyLabel: 'F Maj',
    candidates: makeCandidates('field', 'field'),
  },
  meadow: {
    trackId: 'meadow',
    theme: 'field',
    category: 'field',
    labelTh: 'ทุ่งหญ้า · สายลมมรกต',
    titleEn: 'Emerald Breeze Plains',
    styleTh: 'Celtic Whistle, Harp & Strings',
    moodTh: 'สดใส ร่าเริง ลมพัดผ่านทุ่งดอกไม้',
    bpm: 106,
    keyLabel: 'F Maj',
    candidates: makeCandidates('meadow', 'field'),
  },
  vale: {
    trackId: 'vale',
    theme: 'field',
    category: 'field',
    labelTh: 'หุบเขาเขียว · เสียงสะท้อนหุบเขา',
    titleEn: 'Verdant Valley Echoes',
    styleTh: 'Sweeping Strings, Flute & Lute',
    moodTh: 'ละมุน กังวาน ราวสายน้ำตกกลางหุบผา',
    bpm: 100,
    keyLabel: 'D Maj',
    candidates: makeCandidates('vale', 'field'),
  },
  woods: {
    trackId: 'woods',
    theme: 'field',
    category: 'field',
    labelTh: 'ป่าละเมาะ · ร่มเงาพฤกษา',
    titleEn: 'Whispering Canopy',
    styleTh: 'Woodwind Flute, Lute & Harp',
    moodTh: 'ลึกลับอ่อนๆ สงบร่มรื่นใต้เรือนยอดไม้',
    bpm: 94,
    keyLabel: 'A Dor',
    candidates: makeCandidates('woods', 'field'),
  },
  forest: {
    trackId: 'forest',
    theme: 'field',
    category: 'field',
    labelTh: 'ป่าลึก · หัวใจพนาโบราณ',
    titleEn: 'Ancient Sylvan Heart',
    styleTh: 'Mystic Pan Flute, Celesta & Breeze',
    moodTh: 'มนตร์ขลัง แสงหิ่งห้อยกลางพงไพรโบราณ',
    bpm: 86,
    keyLabel: 'E Min',
    candidates: makeCandidates('forest', 'field'),
  },
  coast: {
    trackId: 'coast',
    theme: 'field',
    category: 'town',
    labelTh: 'เมืองท่าชายฝั่ง · ระลอกคลื่นคราม',
    titleEn: 'Azure Tide Promenade',
    styleTh: 'Coastal Oboe, Harp & Breeze Pad',
    moodTh: 'พลิ้วไหว สบายใจ ดั่งท่าเรือริมทะเลสีคราม',
    bpm: 98,
    keyLabel: 'C Mix',
    candidates: makeCandidates('coast', 'field'),
  },
  cave: {
    trackId: 'cave',
    theme: 'dungeon',
    category: 'dungeon',
    labelTh: 'ถ้ำ · ก้องกังวานผลึกคริสตัล',
    titleEn: 'Crystal Cavern Resonance',
    styleTh: 'Echoing Celesta, Organ & Deep Pad',
    moodTh: 'เย็นเยียบ แพรวพราว เสียงสะท้อนผลึกใต้พิภพ',
    bpm: 78,
    keyLabel: 'C# Min',
    candidates: makeCandidates('cave', 'dungeon'),
  },
  desert: {
    trackId: 'desert',
    theme: 'field',
    category: 'field',
    labelTh: 'นครทะเลทราย · พยับแดดสีทอง',
    titleEn: 'Dunes of Golden Mirage',
    styleTh: 'Desert Oud, Lute & Frame Drum',
    moodTh: 'มนตร์เสน่ห์แดนทราย คาราวานและโอเอซิสสีทอง',
    bpm: 98,
    keyLabel: 'D Hijaz',
    candidates: makeCandidates('desert', 'field'),
  },
  graveyard: {
    trackId: 'graveyard',
    theme: 'dungeon',
    category: 'dungeon',
    labelTh: 'สุสาน · บทสวดใต้แสงจันทร์',
    titleEn: 'Moonlit Requiem',
    styleTh: 'Gothic Organ, Cello & Chimes',
    moodTh: 'ขรึม เศร้าลึก ท่ามกลางหมอกใต้เงาจันทร์',
    bpm: 72,
    keyLabel: 'B Min',
    candidates: makeCandidates('graveyard', 'dungeon'),
  },
  isles: {
    trackId: 'isles',
    theme: 'field',
    category: 'town',
    labelTh: 'หมู่เกาะตะวันออก · ล่องเรือบูรพา',
    titleEn: 'Eastern Archipelago Voyage',
    styleTh: 'Pentatonic Koto, Flute & Strings',
    moodTh: 'กลิ่นอายซากุระและศาลเจ้าบูรพาอันสง่างาม',
    bpm: 104,
    keyLabel: 'D Pent',
    candidates: makeCandidates('isles', 'field'),
  },
  snow: {
    trackId: 'snow',
    theme: 'field',
    category: 'town',
    labelTh: 'นครหิมะ · ค่ำคืนยอดผาน้ำแข็ง',
    titleEn: 'Frostpeak Nocturne',
    styleTh: 'Ice Celesta, Harp & Ethereal Choir',
    moodTh: 'ใสบริสุทธิ์ เยือกเย็นใต้แสงออโรรา',
    bpm: 76,
    keyLabel: 'Eb Maj',
    candidates: makeCandidates('snow', 'field'),
  },
  ruins: {
    trackId: 'ruins',
    theme: 'dungeon',
    category: 'dungeon',
    labelTh: 'ซากปราสาท · อนุสรณ์นครร้าง',
    titleEn: 'Fallen Citadel Elegy',
    styleTh: 'Noble Strings, Harp & Horn',
    moodTh: 'โหยหา เกียรติยศของป้อมปราการโบราณ',
    bpm: 84,
    keyLabel: 'F# Min',
    candidates: makeCandidates('ruins', 'dungeon'),
  },
  volcano: {
    trackId: 'volcano',
    theme: 'dungeon',
    category: 'dungeon',
    labelTh: 'ภูเขาไฟ · ปล่องเพลิงออบซิเดียน',
    titleEn: 'Obsidian Caldera',
    styleTh: 'War Drums, Low Brass & Strings',
    moodTh: 'ระอุ คุกรุ่น ดุดันเหนือทะเลลาวา',
    bpm: 112,
    keyLabel: 'E Phryg',
    candidates: makeCandidates('volcano', 'dungeon'),
  },
  sky: {
    trackId: 'sky',
    theme: 'field',
    category: 'town',
    labelTh: 'นครลอยฟ้า · มหาสมุทรเมฆา',
    titleEn: 'Celestial Cloudsea',
    styleTh: 'Lydian Choir, Harp & Flute',
    moodTh: 'ล่องลอย ศักดิ์สิทธิ์ เหนือหมู่เมฆสวรรค์',
    bpm: 94,
    keyLabel: 'A Lyd',
    candidates: makeCandidates('sky', 'field'),
  },
  abyss: {
    trackId: 'abyss',
    theme: 'dungeon',
    category: 'dungeon',
    labelTh: 'ห้วงอเวจี · วิหารสุญญตา',
    titleEn: 'Void Sanctum',
    styleTh: 'Abyssal Organ, Bell & Dark Strings',
    moodTh: 'มืดหม่น น่าเกรงขาม ณ ขอบเหวต่างมิติ',
    bpm: 82,
    keyLabel: 'C Min',
    candidates: makeCandidates('abyss', 'dungeon'),
  },
  world: {
    trackId: 'world',
    theme: 'field',
    category: 'field',
    labelTh: 'วิหารบอสโลก · วิหารไททัน',
    titleEn: 'Sanctum of the Titan',
    styleTh: 'Grand Cathedral Brass, Choir & Strings',
    moodTh: 'ยิ่งใหญ่ กดดัน ก่อนเผชิญหน้าผู้พิทักษ์โลก',
    bpm: 116,
    keyLabel: 'D Min',
    candidates: makeCandidates('world', 'field'),
  },
  dungeon: {
    trackId: 'dungeon',
    theme: 'dungeon',
    category: 'dungeon',
    labelTh: 'ดันเจี้ยน & หอคอย · เขาวงกตโบราณ',
    titleEn: 'Labyrinth Ascent',
    styleTh: 'Dungeon Oboe, Strings & Percussion',
    moodTh: 'ตื่นตัว ท้าทาย ทุกย่างก้าวในหอคอย',
    bpm: 102,
    keyLabel: 'A Min',
    candidates: makeCandidates('dungeon', 'dungeon'),
  },
  battle: {
    trackId: 'battle',
    theme: 'battle',
    category: 'combat',
    labelTh: 'ปะทะมอนสเตอร์ · คมดาบนักรบ',
    titleEn: 'Blade & Valor',
    styleTh: 'Action Strings, Brass & Drums',
    moodTh: 'เร้าใจ รวดเร็ว จังหวะประจันหน้าศัตรู',
    bpm: 132,
    keyLabel: 'E Min',
    candidates: makeCandidates('battle', 'battle'),
  },
  boss: {
    trackId: 'boss',
    theme: 'boss',
    category: 'combat',
    labelTh: 'ศึกบอสใหญ่ · มหาศึกตำนาน',
    titleEn: 'Clash of Legends',
    styleTh: 'Epic Boss Orchestra, Choir & Timpani',
    moodTh: 'ดุเดือด สูงสุดขีดแห่งมหาศึกบอส',
    bpm: 144,
    keyLabel: 'D Min',
    candidates: makeCandidates('boss', 'boss'),
  },
  event: {
    trackId: 'event',
    theme: 'event',
    category: 'activity',
    labelTh: 'กิจกรรมพิเศษ · เทศกาลรื่นเริง',
    titleEn: 'Grand Realm Festival',
    styleTh: 'Festive Whistle, Lute & Percussion',
    moodTh: 'สนุกสนาน ครึกครื้น งานฉลองกลางเมือง',
    bpm: 120,
    keyLabel: 'G Maj',
    candidates: makeCandidates('event', 'event'),
  },
  act_invasion: {
    trackId: 'act_invasion',
    theme: 'event',
    category: 'activity',
    labelTh: 'สมรภูมิป้องกันเมือง · เสียงแตรป้อมปราการ',
    titleEn: 'Bastion Under Siege',
    styleTh: 'Heroic Brass March & War Drums',
    moodTh: 'ฮึกเหิม ต้านคลื่นมอนสเตอร์หน้ากำแพงเมือง',
    bpm: 128,
    keyLabel: 'D Min',
    candidates: makeCandidates('act_invasion', 'event'),
  },
  act_guild_war: {
    trackId: 'act_guild_war',
    theme: 'event',
    category: 'activity',
    labelTh: 'สงครามกิลด์ · ธงชัยสมรภูมิ',
    titleEn: 'Banner of the Guilds',
    styleTh: 'Anthem Horns, Choir & Snare',
    moodTh: 'สง่างาม ทรงพลัง เพื่อศักดิ์ศรีแห่งกิลด์',
    bpm: 126,
    keyLabel: 'C Min',
    candidates: makeCandidates('act_guild_war', 'event'),
  },
  act_bounty: {
    trackId: 'act_bounty',
    theme: 'event',
    category: 'activity',
    labelTh: 'ลานล่าค่าหัว · รอยเท้านักล่า',
    titleEn: 'Trail of the Outlaw',
    styleTh: 'Rhythmic Oud, Lute & Shaker',
    moodTh: 'ลุ้นระทึก ไล่ล่าเป้าหมายค่าหัว',
    bpm: 114,
    keyLabel: 'A Min',
    candidates: makeCandidates('act_bounty', 'event'),
  },
  act_treasure: {
    trackId: 'act_treasure',
    theme: 'event',
    category: 'activity',
    labelTh: 'เกาะขุมทรัพย์ · เข็มทิศโจรสลัด',
    titleEn: "Corsair's Compass",
    styleTh: 'Nautical Whistle, Lute & Bodhran',
    moodTh: 'คึกคัก ผจญภัยล่าสมบัติข้ามทะเล',
    bpm: 116,
    keyLabel: 'G Mix',
    candidates: makeCandidates('act_treasure', 'event'),
  },
  act_fishing: {
    trackId: 'act_fishing',
    theme: 'event',
    category: 'activity',
    labelTh: 'บึงตกปลายักษ์ · อ่าวสายน้ำสงบ',
    titleEn: "Serene Angler's Cove",
    styleTh: 'Relaxing Water Harp & Flute',
    moodTh: 'ผ่อนคลาย เงียบสงบ ริมผืนน้ำใส',
    bpm: 88,
    keyLabel: 'F Maj',
    candidates: makeCandidates('act_fishing', 'event'),
  },
}

const DUNGEON_MAP_IDS = new Set([
  'cave',
  'volcano',
  'abyss',
  'graveyard',
  'ruins',
  'crystal',
])

const SPECIAL_EVENT_MAP_IDS = new Set([
  'act_invasion',
  'act_guild_war',
  'act_bounty',
  'act_treasure',
  'act_fishing',
])

const TRACK_ID_SET = new Set<string>(BGM_TRACK_IDS)

export function isDungeonBgmMapId(mapId?: string | null): boolean {
  return Boolean(mapId && DUNGEON_MAP_IDS.has(mapId))
}

export function isSpecialEventBgmMapId(mapId?: string | null): boolean {
  return Boolean(mapId && SPECIAL_EVENT_MAP_IDS.has(mapId))
}

export function isValidBgmTrackId(trackId?: string | null): trackId is BgmTrackId {
  return Boolean(trackId && TRACK_ID_SET.has(trackId))
}

export function resolveBgmTheme(
  input: string | BgmResolveContext,
  bossActiveArg = false,
): BgmTheme {
  const ctx: BgmResolveContext =
    typeof input === 'string'
      ? { screen: 'game', mapId: input, bossActive: bossActiveArg }
      : input

  if (ctx.screen === 'login') {
    return 'login'
  }

  const mapId = ctx.mapId ?? 'town'

  // Boss theme has highest gameplay priority
  if (ctx.bossActive || mapId === 'act_boss_rush') {
    return 'boss'
  }

  // Special events (dedicated activity maps or town invasion)
  if (ctx.eventActive || isSpecialEventBgmMapId(mapId)) {
    return 'event'
  }

  // Standalone Tower screen: boss floors handled above, normal floors use dungeon
  if (ctx.screen === 'tower') {
    return 'dungeon'
  }

  // Active combat with normal monsters (outside safe town unless invasion/event above)
  const combatRecent =
    typeof ctx.combatElapsedSec === 'number' &&
    Number.isFinite(ctx.combatElapsedSec) &&
    ctx.combatElapsedSec >= 0 &&
    ctx.combatElapsedSec < BGM_BATTLE_HOLD_SEC

  const inCombat = Boolean(ctx.inCombat || combatRecent)
  if (inCombat && (ctx.screen === 'encounter' || mapId !== 'town')) {
    return 'battle'
  }

  // Dungeon maps or dungeon modal
  if (ctx.dungeonActive || isDungeonBgmMapId(mapId)) {
    return 'dungeon'
  }

  // Main town
  if (mapId === 'town') {
    return 'town'
  }

  // Default leveling / exploration maps (including world sanctum when boss isn't spawned)
  return 'field'
}

export function resolveBgmTrackId(
  input: string | BgmResolveContext,
  bossActiveArg = false,
): BgmTrackId {
  const ctx: BgmResolveContext =
    typeof input === 'string'
      ? { screen: 'game', mapId: input, bossActive: bossActiveArg }
      : input

  if (ctx.screen === 'login') {
    return 'login'
  }

  const mapId = ctx.mapId ?? 'town'

  if (ctx.bossActive || mapId === 'act_boss_rush') {
    return 'boss'
  }

  if (isSpecialEventBgmMapId(mapId) && TRACK_ID_SET.has(mapId)) {
    return mapId as BgmTrackId
  }

  if (ctx.eventActive) {
    return 'event'
  }

  if (ctx.screen === 'tower') {
    return 'dungeon'
  }

  const combatRecent =
    typeof ctx.combatElapsedSec === 'number' &&
    Number.isFinite(ctx.combatElapsedSec) &&
    ctx.combatElapsedSec >= 0 &&
    ctx.combatElapsedSec < BGM_BATTLE_HOLD_SEC

  const inCombat = Boolean(ctx.inCombat || combatRecent)
  if (inCombat && (ctx.screen === 'encounter' || mapId !== 'town')) {
    return 'battle'
  }

  if (ctx.dungeonActive) {
    return 'dungeon'
  }

  if (TRACK_ID_SET.has(mapId)) {
    return mapId as BgmTrackId
  }

  return resolveBgmTheme(ctx)
}

export function resolveEffectiveBgmSelection(
  input: string | BgmResolveContext,
  pinnedTrackId?: BgmTrackId | null,
): BgmEffectiveSelection {
  if (isValidBgmTrackId(pinnedTrackId)) {
    return {
      theme: getBgmTrackMeta(pinnedTrackId).theme,
      trackId: pinnedTrackId,
      isPinned: true,
    }
  }
  return {
    theme: resolveBgmTheme(input),
    trackId: resolveBgmTrackId(input),
    isPinned: false,
  }
}

export function getBgmTrackMeta(trackId: BgmTrackId): BgmMapTrackMeta {
  return BGM_MAP_TRACK_CATALOG[trackId] ?? BGM_MAP_TRACK_CATALOG.town
}

export function getBgmTracksByCategory(category?: BgmTrackCategory | 'all'): BgmMapTrackMeta[] {
  const all = BGM_TRACK_IDS.map((id) => BGM_MAP_TRACK_CATALOG[id])
  if (!category || category === 'all') return all
  return all.filter((m) => m.category === category)
}

export function pickPlayableAudioUrl(
  urls: readonly string[] | undefined,
  canPlayType?: (mimeType: string) => string,
): string | null {
  if (!urls || urls.length === 0) return null
  if (!canPlayType) return urls[0] ?? null

  const scores = urls.map((url, idx) => {
    const lower = url.toLowerCase()
    const mime = lower.endsWith('.ogg')
      ? 'audio/ogg; codecs="vorbis"'
      : lower.endsWith('.mp3')
        ? 'audio/mpeg'
        : ''
    if (!mime) return { url, rank: 1, idx }
    const res = canPlayType(mime) || (lower.endsWith('.ogg') ? canPlayType('audio/ogg') : '')
    if (res === 'probably') return { url, rank: 3, idx }
    if (res === 'maybe') return { url, rank: 2, idx }
    return { url, rank: 0, idx }
  })

  scores.sort((a, b) => b.rank - a.rank || a.idx - b.idx)
  return scores[0]?.rank > 0 ? scores[0].url : urls[0] ?? null
}

export function clampBgmVolume(vol: number): number {
  if (!Number.isFinite(vol)) return 0.35
  return Math.max(0, Math.min(1, vol))
}
