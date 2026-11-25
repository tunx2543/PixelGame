import { ITEMS } from './data'
import type { EquipmentRarity } from './mmo-systems'

export type ActivityId =
  | 'invasion'
  | 'guild_war'
  | 'bounty'
  | 'treasure'
  | 'boss_rush'
  | 'fishing'

export const ACTIVITY_IDS: readonly ActivityId[] = [
  'invasion',
  'guild_war',
  'bounty',
  'treasure',
  'boss_rush',
  'fishing',
] as const

export const ACTIVITY_MAP_IDS: Record<ActivityId, string> = {
  invasion: 'act_invasion',
  guild_war: 'act_guild_war',
  bounty: 'act_bounty',
  treasure: 'act_treasure',
  boss_rush: 'act_boss_rush',
  fishing: 'act_fishing',
}

export const ACTIVITY_WEAPON_BOX_IDS = ['act_weapon_box_rare', 'act_weapon_box_legend'] as const
export type ActivityWeaponBoxId = (typeof ACTIVITY_WEAPON_BOX_IDS)[number]

export const ACTIVITY_SIGNATURE_ITEM_BY_ACTIVITY: Record<ActivityId, string> = {
  invasion: 'act_item_bastion_ration',
  guild_war: 'act_item_war_horn',
  bounty: 'act_item_bounty_seal',
  treasure: 'act_item_pirate_compass',
  boss_rush: 'act_item_colosseum_elixir',
  fishing: 'act_item_golden_bait',
}

export interface ActivityDef {
  id: ActivityId
  mapId: string
  name: string
  subtitle: string
  description: string
  recommendedLevel: number
  dailyCap: number
  durationSec: number
  scheduleLabel: string
  peakHoursLocal: number[]
  rewardSummary: string
  featuredItemIds: readonly string[]
  accentColor: string
  modeTag: string
  safeCombat: boolean
}

export const ACTIVITY_DEFS: readonly ActivityDef[] = [
  {
    id: 'invasion',
    mapId: ACTIVITY_MAP_IDS.invasion,
    name: 'สมรภูมิป้องกันเมือง',
    subtitle: 'Siege Defense · 3 ระลอก',
    description: 'วาร์ปเข้าสู่ลานประตูเมืองป้อมปราการ ต้านทานกองทัพมอนสเตอร์ 3 ระลอกพร้อมขุนพลบุกเมืองเพื่อคว้ารางวัลป้องกันเมือง',
    recommendedLevel: 10,
    dailyCap: 3,
    durationSec: 240,
    scheduleLabel: 'เปิดทุกวัน · รอบพิเศษ 12:00 / 18:00 / 21:00 น.',
    peakHoursLocal: [12, 18, 21],
    rewardSummary: 'กล่องสุ่มอาวุธกิจกรรม · เสบียงป้อมปราการ · เพชร & โทเคน',
    featuredItemIds: ['act_weapon_box_rare', 'act_item_bastion_ration'],
    accentColor: '#fb7185',
    modeTag: 'ป้องกัน 3 เวฟ',
    safeCombat: false,
  },
  {
    id: 'guild_war',
    mapId: ACTIVITY_MAP_IDS.guild_war,
    name: 'สมรภูมิสงครามกิลด์',
    subtitle: 'Guild Siege · ยึดธง 3 จุด',
    description: 'ปะทะผู้พิทักษ์ปราการและกด [E] เพื่อยึดเสาธงทั้ง 3 จุด สะสมแต้มยึดครองครบ 100 คะแนนก่อนหมดเวลา',
    recommendedLevel: 20,
    dailyCap: 3,
    durationSec: 240,
    scheduleLabel: 'เปิดทุกวัน · ช่วงศึกใหญ่ 19:00 – 22:00 น.',
    peakHoursLocal: [19, 20, 21],
    rewardSummary: 'หีบสุ่มศาสตราวุธวีรบุรุษ · แตรศึกกิลด์ · หินตีบวก & เพชร',
    featuredItemIds: ['act_weapon_box_legend', 'act_item_war_horn'],
    accentColor: '#60a5fa',
    modeTag: 'ยึดธงทำแต้ม',
    safeCombat: false,
  },
  {
    id: 'bounty',
    mapId: ACTIVITY_MAP_IDS.bounty,
    name: 'ลานล่าค่าหัวมอนสเตอร์แรร์',
    subtitle: 'Wanted Hunt · เลือกระดับเป้าหมาย',
    description: 'เลือกประกาศจับเป้าหมายระดับหัวกะทิในหุบเขามืด เอาชนะหัวหน้าค่าหัวและลูกสมุนเพื่อรับเงินรางวัลก้อนโต',
    recommendedLevel: 12,
    dailyCap: 5,
    durationSec: 180,
    scheduleLabel: 'เปิดตลอดวัน · เปลี่ยนเป้าหมายได้ตามระดับพลัง',
    peakHoursLocal: [13, 17, 22],
    rewardSummary: 'กล่องสุ่มอาวุธ · ตรานายพรานค่าหัว · ทองก้อนโต & เพชร',
    featuredItemIds: ['act_weapon_box_rare', 'act_weapon_box_legend', 'act_item_bounty_seal'],
    accentColor: '#f59e0b',
    modeTag: 'ล่าค่าหัวแรร์',
    safeCombat: false,
  },
  {
    id: 'treasure',
    mapId: ACTIVITY_MAP_IDS.treasure,
    name: 'เกาะลายแทงขุมทรัพย์',
    subtitle: 'Treasure Isle · เข็มทิศขุดสมบัติ',
    description: 'ออกสำรวจเกาะร้างตามสัญญาณเข็มทิศ กด [E] ขุดหาจุดซ่อนสมบัติ ปราบผู้พิทักษ์ขุมทรัพย์ และเปิดหีบสมบัติโบราณ',
    recommendedLevel: 15,
    dailyCap: 3,
    durationSec: 180,
    scheduleLabel: 'เปิดตลอดวัน · โบนัสขุดทอง 14:00 & 20:00 น.',
    peakHoursLocal: [14, 20],
    rewardSummary: 'กล่องสุ่มอาวุธกิจกรรม · เข็มทิศโจรสลัด · ผลึกวิญญาณคู่หู',
    featuredItemIds: ['act_weapon_box_rare', 'act_item_pirate_compass', 'pet_essence'],
    accentColor: '#facc15',
    modeTag: 'สำรวจ & ขุดสมบัติ',
    safeCombat: false,
  },
  {
    id: 'boss_rush',
    mapId: ACTIVITY_MAP_IDS.boss_rush,
    name: 'สังเวียนบอสรัช',
    subtitle: 'Boss Rush · โค่น 4 บอสจับเวลา',
    description: 'ท้าดวลบอสต่อเนื่อง 4 ด่านในโคลอสเซียมศักดิ์สิทธิ์ ไล่จากเสือหุบเขาจนถึงนางดาบสีชาดพร้อมบันทึกสถิติเวลาไวสุด',
    recommendedLevel: 30,
    dailyCap: 3,
    durationSec: 300,
    scheduleLabel: 'เปิดตลอดวัน · บันทึกสถิติเวลาไวสุดส่วนตัว',
    peakHoursLocal: [15, 20, 23],
    rewardSummary: 'หีบสุ่มศาสตราวุธวีรบุรุษ · น้ำอมฤตแชมเปี้ยน · หินตีบวก & เพชร',
    featuredItemIds: ['act_weapon_box_legend', 'act_item_colosseum_elixir'],
    accentColor: '#c084fc',
    modeTag: 'จับเวลา 4 ด่าน',
    safeCombat: false,
  },
  {
    id: 'fishing',
    mapId: ACTIVITY_MAP_IDS.fishing,
    name: 'บึงแข่งขันตกปลายักษ์',
    subtitle: 'Fishing Derby · แข่งทำแต้มในเขตปลอดภัย',
    description: 'เข้าสู่ทะเลสาบสะพานไม้แสนสงบ วิ่งไปที่วงคลื่นน้ำเรืองแสงแล้วกด [E] ตกปลายักษ์สะสมแต้มให้ครบ 120 แต้มภายใน 2 นาที',
    recommendedLevel: 1,
    dailyCap: 5,
    durationSec: 120,
    scheduleLabel: 'เปิดทุกวัน · เขตปลอดภัย 100% ไร้การต่อสู้',
    peakHoursLocal: [11, 16, 21],
    rewardSummary: 'กล่องสุ่มอาวุธกิจกรรม · เหยื่อทองคำเทพวารี · ปลาคาร์ปทองคำ',
    featuredItemIds: ['act_weapon_box_rare', 'act_item_golden_bait', 'fish_golden'],
    accentColor: '#38bdf8',
    modeTag: 'แข่งตกปลา Safe',
    safeCombat: true,
  },
] as const

const MAP_ID_TO_ACTIVITY = new Map<string, ActivityDef>(ACTIVITY_DEFS.map((d) => [d.mapId, d]))
const ID_TO_ACTIVITY = new Map<ActivityId, ActivityDef>(ACTIVITY_DEFS.map((d) => [d.id, d]))

export function isActivityMapId(mapId?: string | null): boolean {
  if (!mapId || typeof mapId !== 'string') return false
  return MAP_ID_TO_ACTIVITY.has(mapId)
}

export function getActivityByMapId(mapId?: string | null): ActivityDef | null {
  if (!mapId || typeof mapId !== 'string') return null
  return MAP_ID_TO_ACTIVITY.get(mapId) ?? null
}

export function getActivityDef(id: ActivityId): ActivityDef {
  return ID_TO_ACTIVITY.get(id) ?? ACTIVITY_DEFS[0]
}

export interface BountyTargetDef {
  id: string
  bossId: string
  name: string
  tierLabel: string
  minLevel: number
  escorts: Array<{ monsterId: string; count: number }>
  bonusGold: number
  bonusDiamonds: number
  tokens: number
}

export const BOUNTY_TARGETS: readonly BountyTargetDef[] = [
  {
    id: 'bounty_vale_tiger',
    bossId: 'vale_tiger',
    name: 'พยัคฆ์หุบเขา (ค่าหัวขั้นต้น)',
    tierLabel: 'ระดับ D · Lv.12+',
    minLevel: 1,
    escorts: [{ monsterId: 'meadow_big_hopper', count: 2 }],
    bonusGold: 1200,
    bonusDiamonds: 6,
    tokens: 3,
  },
  {
    id: 'bounty_tusk_overlord',
    bossId: 'forest_tusk_overlord',
    name: 'จอมราชันงา (ค่าหัวป่าลึก)',
    tierLabel: 'ระดับ C · Lv.24+',
    minLevel: 15,
    escorts: [{ monsterId: 'forest_tusk_warrior', count: 3 }],
    bonusGold: 2400,
    bonusDiamonds: 10,
    tokens: 5,
  },
  {
    id: 'bounty_tomb_king',
    bossId: 'desert_tomb_king',
    name: 'ราชาสุสาน (ค่าหัวทะเลทราย)',
    tierLabel: 'ระดับ B · Lv.36+',
    minLevel: 28,
    escorts: [{ monsterId: 'forest_tusk_warrior', count: 3 }],
    bonusGold: 3800,
    bonusDiamonds: 14,
    tokens: 6,
  },
  {
    id: 'bounty_spirit_warlord',
    bossId: 'isles_spirit_warlord',
    name: 'ขุนศึกวิญญาณ (ค่าหัวหมู่เกาะ)',
    tierLabel: 'ระดับ A · Lv.50+',
    minLevel: 42,
    escorts: [{ monsterId: 'coast_drowned_captain', count: 1 }],
    bonusGold: 5500,
    bonusDiamonds: 18,
    tokens: 8,
  },
  {
    id: 'bounty_inferno_sovereign',
    bossId: 'volcano_inferno_sovereign',
    name: 'จักรพรรดิเพลิงนรก (ค่าหัวภูเขาไฟ)',
    tierLabel: 'ระดับ S · Lv.68+',
    minLevel: 58,
    escorts: [{ monsterId: 'cave_beetle', count: 1 }],
    bonusGold: 8000,
    bonusDiamonds: 24,
    tokens: 10,
  },
  {
    id: 'bounty_rift_dragon',
    bossId: 'abyss_rift_dragon_king',
    name: 'ราชามังกรรอยแยก (ค่าหัวสูงสุด)',
    tierLabel: 'ระดับ SS · Lv.82+',
    minLevel: 72,
    escorts: [{ monsterId: 'grave_night_sovereign', count: 1 }],
    bonusGold: 12000,
    bonusDiamonds: 32,
    tokens: 14,
  },
] as const

export function getBountyTargetById(bountyId?: string | null): BountyTargetDef {
  return BOUNTY_TARGETS.find((b) => b.id === bountyId) ?? BOUNTY_TARGETS[0]
}

export const INVASION_WAVES: ReadonlyArray<{
  wave: number
  title: string
  spawns: Array<{ monsterId: string; count: number }>
}> = [
  {
    wave: 1,
    title: 'แนวหน้ากองทัพบุกเมือง',
    spawns: [
      { monsterId: 'meadow_big_hopper', count: 3 },
      { monsterId: 'forest_tusk_warrior', count: 2 },
    ],
  },
  {
    wave: 2,
    title: 'กองพันขุนพลจู่โจม',
    spawns: [
      { monsterId: 'forest_tusk_champion', count: 1 },
      { monsterId: 'forest_tusk_warrior', count: 3 },
    ],
  },
  {
    wave: 3,
    title: 'แม่ทัพใหญ่ปิดล้อมประตูเมือง',
    spawns: [
      { monsterId: 'forest_blazing_serpent', count: 1 },
      { monsterId: 'coast_drowned_captain', count: 1 },
      { monsterId: 'forest_tusk_warrior', count: 2 },
    ],
  },
]

export const BOSS_RUSH_STAGES: ReadonlyArray<{
  stage: number
  bossId: string
  title: string
}> = [
  { stage: 1, bossId: 'vale_tiger', title: 'ด่าน 1/4 · พยัคฆ์หุบเขา' },
  { stage: 2, bossId: 'coast_shellguard_warlord', title: 'ด่าน 2/4 · จอมทัพเกราะเปลือก' },
  { stage: 3, bossId: 'cave_drill_colossus', title: 'ด่าน 3/4 · ยักษ์สว่านเหล็ก' },
  { stage: 4, bossId: 'ruins_crimson_swordlady', title: 'ด่าน 4/4 · นางดาบสีชาด' },
]

export interface GuildWarFlagSpot {
  id: string
  label: string
  tx: number
  ty: number
}

export const GUILD_WAR_FLAG_SPOTS: readonly GuildWarFlagSpot[] = [
  { id: 'flag_west', label: 'ธงปราการตะวันตก', tx: 13, ty: 18 },
  { id: 'flag_center', label: 'ธงใจกลางป้อม', tx: 26, ty: 16 },
  { id: 'flag_east', label: 'ธงปราการตะวันออก', tx: 39, ty: 18 },
] as const

export const TREASURE_DIG_CANDIDATES: ReadonlyArray<{ tx: number; ty: number; hintArea: string }> = [
  { tx: 14, ty: 11, hintArea: 'ชายหาดทิศตะวันตกเฉียงเหนือ' },
  { tx: 38, ty: 11, hintArea: 'ซากเสาทิศตะวันออกเฉียงเหนือ' },
  { tx: 26, ty: 12, hintArea: 'แท่นหินเหนือบึงกลางเกาะ' },
  { tx: 15, ty: 24, hintArea: 'เวิ้งทรายทิศตะวันตกเฉียงใต้' },
  { tx: 38, ty: 24, hintArea: 'โขดหินทิศตะวันออกเฉียงใต้' },
  { tx: 26, ty: 25, hintArea: 'ลานโบราณทางทิศใต้' },
] as const

export function pickTreasureDigSpot(rng: () => number = Math.random) {
  const idx = Math.floor(rng() * TREASURE_DIG_CANDIDATES.length) % TREASURE_DIG_CANDIDATES.length
  return TREASURE_DIG_CANDIDATES[Math.max(0, idx)]
}

export interface TreasureCompassHint {
  distTiles: number
  directionThai: string
  heatLevel: 'found' | 'hot' | 'warm' | 'cold'
  heatLabel: string
}

export function computeTreasureCompassHint(
  playerTx: number,
  playerTy: number,
  targetTx: number,
  targetTy: number,
): TreasureCompassHint {
  const dx = targetTx - playerTx
  const dy = targetTy - playerTy
  const distTiles = Math.round(Math.hypot(dx, dy))
  if (distTiles <= 2) {
    return {
      distTiles,
      directionThai: 'ตรงจุดนี้!',
      heatLevel: 'found',
      heatLabel: 'พบจุดซ่อนสมบัติแล้ว — กด [E] เพื่อขุด!',
    }
  }
  const ns = dy <= -2 ? 'เหนือ' : dy >= 2 ? 'ใต้' : ''
  const ew = dx <= -2 ? 'ตะวันตก' : dx >= 2 ? 'ตะวันออก' : ''
  const directionThai = ns && ew ? `${ns}${ew}` : ns || ew || 'ใกล้มาก'
  if (distTiles <= 6) {
    return {
      distTiles,
      directionThai,
      heatLevel: 'hot',
      heatLabel: `เข็มทิศสั่นแรง! ทาง${directionThai} (~${distTiles} ช่อง)`,
    }
  }
  if (distTiles <= 14) {
    return {
      distTiles,
      directionThai,
      heatLevel: 'warm',
      heatLabel: `มีกลิ่นอายสมบัติ ทาง${directionThai} (~${distTiles} ช่อง)`,
    }
  }
  return {
    distTiles,
    directionThai,
    heatLevel: 'cold',
    heatLabel: `สัญญาณไกล ทาง${directionThai} (~${distTiles} ช่อง)`,
  }
}

export const FISHING_DERBY_SPOTS: ReadonlyArray<{ id: string; tx: number; ty: number; label: string }> = [
  { id: 'fish_pier_nw', tx: 14, ty: 14, label: 'ปลายสะพานตะวันตกเฉียงเหนือ' },
  { id: 'fish_pier_sw', tx: 14, ty: 22, label: 'ปลายสะพานตะวันตกเฉียงใต้' },
  { id: 'fish_pier_n', tx: 26, ty: 10, label: 'ศาลาท่าน้ำทิศเหนือ' },
  { id: 'fish_pier_s', tx: 26, ty: 26, label: 'ศาลาท่าน้ำทิศใต้' },
  { id: 'fish_pier_ne', tx: 38, ty: 14, label: 'ปลายสะพานตะวันออกเฉียงเหนือ' },
  { id: 'fish_pier_se', tx: 38, ty: 22, label: 'ปลายสะพานตะวันออกเฉียงใต้' },
] as const

export interface FishingCatchOutcome {
  label: string
  tier: 'common' | 'uncommon' | 'rare' | 'trophy'
  points: number
  itemId: string
  qty: number
  bonusStone?: boolean
  bonusItemId?: string
  fishingExp: number
  color: string
}

export function rollFishingDerbyCatch(fishingLevel: number, rng: () => number = Math.random): FishingCatchOutcome {
  const lvBonus = Math.min(0.22, Math.max(0, fishingLevel - 1) * 0.015)
  const roll = rng()
  if (roll < 0.14 + lvBonus * 0.5) {
    return {
      label: 'ปลายักษ์อสูรวารี (Trophy!)',
      tier: 'trophy',
      points: 45,
      itemId: 'fish_golden',
      qty: 2,
      bonusStone: true,
      bonusItemId: 'act_item_golden_bait',
      fishingExp: 28,
      color: '#facc15',
    }
  }
  if (roll < 0.4 + lvBonus) {
    return {
      label: 'ปลาคาร์ปทองคำ',
      tier: 'rare',
      points: 28,
      itemId: 'fish_golden',
      qty: 1,
      fishingExp: 20,
      color: '#fbbf24',
    }
  }
  if (roll < 0.72) {
    return {
      label: 'ปลาคราฟทะเลสาบคู่',
      tier: 'uncommon',
      points: 18,
      itemId: 'fish_silver',
      qty: 2,
      fishingExp: 14,
      color: '#38bdf8',
    }
  }
  return {
    label: 'ปลาเงินลำธาร',
    tier: 'common',
    points: 12,
    itemId: 'fish_silver',
    qty: 1,
    fishingExp: 10,
    color: '#93c5fd',
  }
}

export interface ActivityProgressState {
  dailyDate: string
  dailyClears: Record<ActivityId, number>
  totalClears: Record<ActivityId, number>
  selectedBountyId: string
  bossRushBestSec: number | null
  fishingBestScore: number
  guildWarPoints: number
}

export function getActivityDateKey(nowMs = Date.now()): string {
  const d = new Date(nowMs)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function createZeroRecord(): Record<ActivityId, number> {
  return {
    invasion: 0,
    guild_war: 0,
    bounty: 0,
    treasure: 0,
    boss_rush: 0,
    fishing: 0,
  }
}

export function createDefaultActivitiesState(nowMs = Date.now()): ActivityProgressState {
  return {
    dailyDate: getActivityDateKey(nowMs),
    dailyClears: createZeroRecord(),
    totalClears: createZeroRecord(),
    selectedBountyId: BOUNTY_TARGETS[0].id,
    bossRushBestSec: null,
    fishingBestScore: 0,
    guildWarPoints: 0,
  }
}

export function sanitizeActivitiesState(raw: unknown, nowMs = Date.now()): ActivityProgressState {
  const def = createDefaultActivitiesState(nowMs)
  if (!raw || typeof raw !== 'object') return def
  const obj = raw as Partial<ActivityProgressState>
  const today = getActivityDateKey(nowMs)
  const sameDay = typeof obj.dailyDate === 'string' && obj.dailyDate === today
  const dailyClears = createZeroRecord()
  const totalClears = createZeroRecord()
  for (const id of ACTIVITY_IDS) {
    if (sameDay && obj.dailyClears && typeof obj.dailyClears[id] === 'number') {
      dailyClears[id] = Math.max(0, Math.min(99, Math.floor(obj.dailyClears[id])))
    }
    if (obj.totalClears && typeof obj.totalClears[id] === 'number') {
      totalClears[id] = Math.max(0, Math.floor(obj.totalClears[id]))
    }
  }
  const selectedBountyId =
    typeof obj.selectedBountyId === 'string' && BOUNTY_TARGETS.some((b) => b.id === obj.selectedBountyId)
      ? obj.selectedBountyId
      : def.selectedBountyId
  const bossRushBestSec =
    typeof obj.bossRushBestSec === 'number' && Number.isFinite(obj.bossRushBestSec) && obj.bossRushBestSec > 0
      ? Math.round(obj.bossRushBestSec * 10) / 10
      : null
  return {
    dailyDate: today,
    dailyClears,
    totalClears,
    selectedBountyId,
    bossRushBestSec,
    fishingBestScore: Math.max(0, Math.floor(Number(obj.fishingBestScore ?? 0) || 0)),
    guildWarPoints: Math.max(0, Math.floor(Number(obj.guildWarPoints ?? 0) || 0)),
  }
}

export function rollActivityDailyReset(state: ActivityProgressState, nowMs = Date.now()): ActivityProgressState {
  const today = getActivityDateKey(nowMs)
  if (state.dailyDate === today) return state
  return {
    ...state,
    dailyDate: today,
    dailyClears: createZeroRecord(),
  }
}

export function recordActivityClearInState(
  state: ActivityProgressState,
  activityId: ActivityId,
  meta?: { clearTimeSec?: number; score?: number; guildPoints?: number },
  nowMs = Date.now(),
): { next: ActivityProgressState; withinDailyCap: boolean; newRecord: boolean } {
  const rolled = rollActivityDailyReset(state, nowMs)
  const def = getActivityDef(activityId)
  const prevDaily = rolled.dailyClears[activityId] ?? 0
  const withinDailyCap = prevDaily < def.dailyCap
  let newRecord = false
  let bossRushBestSec = rolled.bossRushBestSec
  if (activityId === 'boss_rush' && typeof meta?.clearTimeSec === 'number' && meta.clearTimeSec > 0) {
    const rounded = Math.round(meta.clearTimeSec * 10) / 10
    if (bossRushBestSec === null || rounded < bossRushBestSec) {
      bossRushBestSec = rounded
      newRecord = true
    }
  }
  let fishingBestScore = rolled.fishingBestScore
  if (activityId === 'fishing' && typeof meta?.score === 'number' && meta.score > fishingBestScore) {
    fishingBestScore = Math.floor(meta.score)
    newRecord = true
  }
  const guildWarPoints =
    rolled.guildWarPoints + (activityId === 'guild_war' ? Math.max(0, Math.floor(meta?.guildPoints ?? 100)) : 0)
  return {
    next: {
      ...rolled,
      dailyClears: {
        ...rolled.dailyClears,
        [activityId]: prevDaily + 1,
      },
      totalClears: {
        ...rolled.totalClears,
        [activityId]: (rolled.totalClears[activityId] ?? 0) + 1,
      },
      bossRushBestSec,
      fishingBestScore,
      guildWarPoints,
    },
    withinDailyCap,
    newRecord,
  }
}

export function getActivityScheduleStatus(
  activityId: ActivityId,
  nowMs = Date.now(),
): { open: boolean; isPeakBonus: boolean; badgeText: string } {
  const def = getActivityDef(activityId)
  const hour = new Date(nowMs).getHours()
  const isPeakBonus = def.peakHoursLocal.includes(hour)
  return {
    open: true,
    isPeakBonus,
    badgeText: isPeakBonus ? 'ช่วงโบนัสกิจกรรม x1.25' : 'เปิดให้วาร์ปเข้าร่วม',
  }
}

export interface ActivityWeaponRollResult {
  itemId: string
  name: string
  rarity: EquipmentRarity
  plus: number
}

export function rollActivityWeaponChest(
  chestId: ActivityWeaponBoxId,
  playerLevel: number,
  playerJob?: string | null,
  rng: () => number = Math.random,
): ActivityWeaponRollResult {
  const safeLv = Math.max(1, Math.floor(playerLevel))
  const allWeapons = Object.values(ITEMS).filter(
    (def) => !def.gmOnly && def.kind === 'weapon',
  )
  const maxReq = safeLv + 18
  const minReq = safeLv >= 45 ? Math.floor(safeLv * 0.35) : 1
  const levelMatched = allWeapons.filter(
    (def) => (def.reqLevel ?? 1) <= maxReq && (def.reqLevel ?? 1) >= minReq,
  )
  const basePool = levelMatched.length > 0 ? levelMatched : allWeapons

  const compatiblePool = playerJob
    ? basePool.filter((def) => !def.allowedJobs || def.allowedJobs.includes(playerJob))
    : basePool
  const useCompatible = compatiblePool.length > 0 && rng() < 0.78
  const pickPool = useCompatible ? compatiblePool : basePool
  const picked = pickPool[Math.min(pickPool.length - 1, Math.floor(Math.max(0, Math.min(0.999999, rng())) * pickPool.length))]

  const rRoll = rng()
  let rarity: EquipmentRarity
  let plus: number
  if (chestId === 'act_weapon_box_legend') {
    rarity = rRoll < 0.52 ? 'epic' : rRoll < 0.92 ? 'legendary' : 'mythic'
    const pRoll = rng()
    plus = pRoll < 0.4 ? 2 : pRoll < 0.75 ? 3 : pRoll < 0.93 ? 4 : 5
  } else {
    rarity = rRoll < 0.68 ? 'rare' : rRoll < 0.94 ? 'epic' : 'legendary'
    const pRoll = rng()
    plus = pRoll < 0.55 ? 1 : pRoll < 0.87 ? 2 : 3
  }

  return {
    itemId: picked.id,
    name: picked.name,
    rarity,
    plus,
  }
}

export interface ActivityRewardSummary {
  gold: number
  diamonds: number
  exp: number
  stones: number
  tokens: number
  items: Array<{ itemId: string; qty: number }>
  dailyReduced: boolean
}

export function computeActivityRewards(
  activityId: ActivityId,
  playerLevel: number,
  dailyClearsBefore: number,
  options?: { bountyId?: string; isPeakBonus?: boolean },
): ActivityRewardSummary {
  const def = getActivityDef(activityId)
  const dailyReduced = dailyClearsBefore >= def.dailyCap
  const scale = dailyReduced ? 0.3 : 1
  const peakMul = options?.isPeakBonus ? 1.25 : 1
  const lv = Math.max(1, Math.floor(playerLevel))

  let baseGold = 1200 + lv * 45
  let baseDiamonds = 10
  let baseExp = 350 + lv * 28
  let stones = 2
  let tokens = 4
  const items: Array<{ itemId: string; qty: number }> = []

  if (activityId === 'invasion') {
    baseGold = 1600 + lv * 50
    baseDiamonds = 14
    stones = 3
    tokens = 6
    if (!dailyReduced) {
      items.push({ itemId: 'act_weapon_box_rare', qty: 1 })
      items.push({ itemId: 'act_item_bastion_ration', qty: 2 })
    } else {
      items.push({ itemId: 'act_item_bastion_ration', qty: 1 })
    }
  } else if (activityId === 'guild_war') {
    baseGold = 1800 + lv * 55
    baseDiamonds = 16
    stones = 4
    tokens = 7
    if (!dailyReduced) {
      items.push({ itemId: 'act_weapon_box_legend', qty: 1 })
      items.push({ itemId: 'act_item_war_horn', qty: 1 })
      items.push({ itemId: 'double_exp_scroll', qty: 1 })
    } else {
      items.push({ itemId: 'act_item_war_horn', qty: 1 })
    }
  } else if (activityId === 'bounty') {
    const bounty = getBountyTargetById(options?.bountyId)
    baseGold = bounty.bonusGold + lv * 35
    baseDiamonds = bounty.bonusDiamonds
    stones = 2
    tokens = bounty.tokens
    const highTierBounty = bounty.minLevel >= 40
    if (!dailyReduced) {
      items.push({ itemId: highTierBounty ? 'act_weapon_box_legend' : 'act_weapon_box_rare', qty: 1 })
      items.push({ itemId: 'act_item_bounty_seal', qty: highTierBounty ? 2 : 1 })
    } else {
      items.push({ itemId: 'act_item_bounty_seal', qty: 1 })
    }
  } else if (activityId === 'treasure') {
    baseGold = 2400 + lv * 60
    baseDiamonds = 15
    stones = 3
    tokens = 6
    if (!dailyReduced) {
      items.push({ itemId: 'act_weapon_box_rare', qty: 1 })
      items.push({ itemId: 'act_item_pirate_compass', qty: 1 })
      items.push({ itemId: 'pet_essence', qty: 2 })
    } else {
      items.push({ itemId: 'act_item_pirate_compass', qty: 1 })
    }
  } else if (activityId === 'boss_rush') {
    baseGold = 2200 + lv * 65
    baseDiamonds = 18
    stones = 5
    tokens = 8
    if (!dailyReduced) {
      items.push({ itemId: 'act_weapon_box_legend', qty: 1 })
      items.push({ itemId: 'act_item_colosseum_elixir', qty: 1 })
      items.push({ itemId: 'event_festival_feast', qty: 1 })
    } else {
      items.push({ itemId: 'act_item_colosseum_elixir', qty: 1 })
    }
  } else if (activityId === 'fishing') {
    baseGold = 950 + lv * 25
    baseDiamonds = 8
    stones = 2
    tokens = 4
    if (!dailyReduced) {
      items.push({ itemId: 'act_weapon_box_rare', qty: 1 })
      items.push({ itemId: 'act_item_golden_bait', qty: 2 })
      items.push({ itemId: 'fish_golden', qty: 2 })
    } else {
      items.push({ itemId: 'act_item_golden_bait', qty: 1 })
    }
  }

  return {
    gold: Math.max(100, Math.round(baseGold * scale * peakMul)),
    diamonds: dailyReduced ? 2 : Math.max(1, Math.round(baseDiamonds * peakMul)),
    exp: Math.max(80, Math.round(baseExp * scale * peakMul)),
    stones: dailyReduced ? 1 : stones,
    tokens: dailyReduced ? 1 : tokens,
    items,
    dailyReduced,
  }
}
