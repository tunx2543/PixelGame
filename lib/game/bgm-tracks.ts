export type BgmTheme =
  | 'login'
  | 'town'
  | 'field'
  | 'dungeon'
  | 'battle'
  | 'boss'
  | 'event'

export interface BgmTrackSpec {
  theme: BgmTheme
  labelTh: string
  descriptionTh: string
  /** Preferred audio file paths in public/ (OGG / MP3) */
  candidates: readonly [string, string]
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

export const BGM_BATTLE_HOLD_SEC = 8

export const BGM_THEMES: readonly BgmTheme[] = [
  'login',
  'town',
  'field',
  'dungeon',
  'battle',
  'boss',
  'event',
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

export function isDungeonBgmMapId(mapId?: string | null): boolean {
  return Boolean(mapId && DUNGEON_MAP_IDS.has(mapId))
}

export function isSpecialEventBgmMapId(mapId?: string | null): boolean {
  return Boolean(mapId && SPECIAL_EVENT_MAP_IDS.has(mapId))
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

export function pickPlayableAudioUrl(
  urls: readonly string[] | undefined,
  canPlayType?: (mimeType: string) => string,
): string | null {
  if (!urls || urls.length === 0) return null
  if (!canPlayType) return urls[0] ?? null

  const scores = urls.map((url) => {
    const lower = url.toLowerCase()
    const mime = lower.endsWith('.ogg')
      ? 'audio/ogg; codecs="vorbis"'
      : lower.endsWith('.mp3')
        ? 'audio/mpeg'
        : ''
    if (!mime) return { url, rank: 1 }
    const res = canPlayType(mime) || (lower.endsWith('.ogg') ? canPlayType('audio/ogg') : '')
    if (res === 'probably') return { url, rank: 3 }
    if (res === 'maybe') return { url, rank: 2 }
    return { url, rank: 0 }
  })

  scores.sort((a, b) => b.rank - a.rank)
  return scores[0]?.rank > 0 ? scores[0].url : urls[0] ?? null
}

export function clampBgmVolume(vol: number): number {
  if (!Number.isFinite(vol)) return 0.35
  return Math.max(0, Math.min(1, vol))
}
