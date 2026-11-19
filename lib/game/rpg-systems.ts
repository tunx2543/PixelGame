import { ITEMS, JOBS, MONSTERS, normalizeJobId, type EquipmentSlot } from './data'
import { MONSTER_BIOME_MAP } from './biome-monsters'
import type { InvItem, SaveData } from './engine'

/* ========================================================================== */
/* 1. TYPES & PERSISTED EXTENSION STATE                                       */
/* ========================================================================== */

export type ElementType = 'neutral' | 'fire' | 'water' | 'ice' | 'earth' | 'wind' | 'poison' | 'light' | 'dark'
export type StatusEffectType = 'burn' | 'freeze' | 'stun' | 'poison' | 'shield'
export type DailyDungeonId = 'gold_vault' | 'stone_mine' | 'boss_rush'

export interface RpgExtensionState {
  bestiary: Record<string, number>
  claimedBestiaryTiers: Record<string, number>
  titles: string[]
  activeTitle: string | null
  equippedRunes: Partial<Record<EquipmentSlot, string>>
  runeBag: Record<string, number>
  dailyDungeonDate: string
  dailyDungeonRuns: Record<DailyDungeonId, number>
  guildId: string | null
  guildName: string | null
  guildTag: string | null
  guildLevel: number
  guildContribution: number
  worldBossCycleKey: string
  worldBossDamage: number
  claimedWorldBossMilestones: string[]
  arenaRating: number
  arenaWins: number
  arenaLosses: number
}

export function todayIsoDate(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function createDefaultRpgExt(now = new Date()): RpgExtensionState {
  return {
    bestiary: {},
    claimedBestiaryTiers: {},
    titles: ['novice_traveler'],
    activeTitle: 'novice_traveler',
    equippedRunes: {},
    runeBag: { rune_ember: 1 },
    dailyDungeonDate: todayIsoDate(now),
    dailyDungeonRuns: {
      gold_vault: 0,
      stone_mine: 0,
      boss_rush: 0,
    },
    guildId: null,
    guildName: null,
    guildTag: null,
    guildLevel: 1,
    guildContribution: 0,
    worldBossCycleKey: getActiveWorldBoss(now.getTime()).cycleKey,
    worldBossDamage: 0,
    claimedWorldBossMilestones: [],
    arenaRating: 1000,
    arenaWins: 0,
    arenaLosses: 0,
  }
}

export function sanitizeRpgExt(raw: unknown, now = new Date()): RpgExtensionState {
  const defaults = createDefaultRpgExt(now)
  if (!raw || typeof raw !== 'object') return defaults
  const obj = raw as Partial<RpgExtensionState>
  const today = todayIsoDate(now)
  const sameDay = obj.dailyDungeonDate === today
  const activeCycle = getActiveWorldBoss(now.getTime()).cycleKey
  const sameCycle = obj.worldBossCycleKey === activeCycle

  const bestiary: Record<string, number> = {}
  if (obj.bestiary && typeof obj.bestiary === 'object') {
    for (const [k, v] of Object.entries(obj.bestiary)) {
      if (MONSTERS[k] && typeof v === 'number' && Number.isFinite(v) && v > 0) {
        bestiary[k] = Math.min(999999, Math.floor(v))
      }
    }
  }

  const claimedBestiaryTiers: Record<string, number> = {}
  if (obj.claimedBestiaryTiers && typeof obj.claimedBestiaryTiers === 'object') {
    for (const [k, v] of Object.entries(obj.claimedBestiaryTiers)) {
      if (MONSTERS[k] && typeof v === 'number' && Number.isFinite(v) && v > 0) {
        claimedBestiaryTiers[k] = Math.max(0, Math.min(3, Math.floor(v)))
      }
    }
  }

  const titles = Array.isArray(obj.titles)
    ? [...new Set(['novice_traveler', ...obj.titles.filter((id): id is string => typeof id === 'string' && TITLE_DEFS.some((t) => t.id === id))])]
    : ['novice_traveler']

  const activeTitle =
    typeof obj.activeTitle === 'string' && titles.includes(obj.activeTitle) ? obj.activeTitle : null

  const equippedRunes: Partial<Record<EquipmentSlot, string>> = {}
  const slots: EquipmentSlot[] = ['weapon', 'armor', 'shoes', 'cloak', 'accessory']
  if (obj.equippedRunes && typeof obj.equippedRunes === 'object') {
    for (const slot of slots) {
      const rId = obj.equippedRunes[slot]
      if (typeof rId === 'string' && RUNE_DEFS[rId]) {
        equippedRunes[slot] = rId
      }
    }
  }

  const runeBag: Record<string, number> = {}
  if (obj.runeBag && typeof obj.runeBag === 'object') {
    for (const [k, v] of Object.entries(obj.runeBag)) {
      if (RUNE_DEFS[k] && typeof v === 'number' && Number.isFinite(v) && v > 0) {
        runeBag[k] = Math.min(999, Math.floor(v))
      }
    }
  } else {
    runeBag.rune_ember = 1
  }

  const rawRuns = (obj.dailyDungeonRuns ?? {}) as Partial<Record<DailyDungeonId, number>>
  const dailyDungeonRuns: Record<DailyDungeonId, number> = {
    gold_vault: sameDay ? Math.max(0, Math.min(10, Math.floor(Number(rawRuns.gold_vault ?? 0) || 0))) : 0,
    stone_mine: sameDay ? Math.max(0, Math.min(10, Math.floor(Number(rawRuns.stone_mine ?? 0) || 0))) : 0,
    boss_rush: sameDay ? Math.max(0, Math.min(10, Math.floor(Number(rawRuns.boss_rush ?? 0) || 0))) : 0,
  }

  return {
    bestiary,
    claimedBestiaryTiers,
    titles,
    activeTitle,
    equippedRunes,
    runeBag,
    dailyDungeonDate: today,
    dailyDungeonRuns,
    guildId: typeof obj.guildId === 'string' && obj.guildId.length > 0 ? obj.guildId : null,
    guildName: typeof obj.guildName === 'string' && obj.guildName.length > 0 ? obj.guildName : null,
    guildTag: typeof obj.guildTag === 'string' && obj.guildTag.length > 0 ? obj.guildTag : null,
    guildLevel: Math.max(1, Math.min(50, Math.floor(Number(obj.guildLevel ?? 1) || 1))),
    guildContribution: Math.max(0, Math.floor(Number(obj.guildContribution ?? 0) || 0)),
    worldBossCycleKey: activeCycle,
    worldBossDamage: sameCycle ? Math.max(0, Math.floor(Number(obj.worldBossDamage ?? 0) || 0)) : 0,
    claimedWorldBossMilestones:
      sameCycle && Array.isArray(obj.claimedWorldBossMilestones)
        ? obj.claimedWorldBossMilestones.filter((x): x is string => typeof x === 'string')
        : [],
    arenaRating: Math.max(100, Math.min(9999, Math.floor(Number(obj.arenaRating ?? 1000) || 1000))),
    arenaWins: Math.max(0, Math.floor(Number(obj.arenaWins ?? 0) || 0)),
    arenaLosses: Math.max(0, Math.floor(Number(obj.arenaLosses ?? 0) || 0)),
  }
}

/* ========================================================================== */
/* 2. ELEMENTAL SYSTEM & STATUS EFFECTS                                       */
/* ========================================================================== */

export const ELEMENT_META: Record<ElementType, { label: string; short: string; color: string; bg: string }> = {
  neutral: { label: 'ไร้ธาตุ', short: 'NTR', color: '#cbd5e1', bg: 'rgba(148,163,184,0.16)' },
  fire: { label: 'ธาตุไฟ', short: 'FIRE', color: '#fb923c', bg: 'rgba(249,115,22,0.18)' },
  water: { label: 'ธาตุน้ำ', short: 'WATER', color: '#38bdf8', bg: 'rgba(56,189,248,0.18)' },
  ice: { label: 'ธาตุน้ำแข็ง', short: 'ICE', color: '#67e8f9', bg: 'rgba(6,182,212,0.18)' },
  earth: { label: 'ธาตุดิน', short: 'EARTH', color: '#d4a373', bg: 'rgba(180,130,80,0.2)' },
  wind: { label: 'ธาตุลม', short: 'WIND', color: '#4ade80', bg: 'rgba(74,222,128,0.18)' },
  poison: { label: 'ธาตุพิษ', short: 'POISON', color: '#a855f7', bg: 'rgba(168,85,247,0.2)' },
  light: { label: 'ธาตุแสง', short: 'LIGHT', color: '#fde047', bg: 'rgba(250,204,21,0.18)' },
  dark: { label: 'ธาตุมืด', short: 'DARK', color: '#c084fc', bg: 'rgba(168,85,247,0.2)' },
}

export const STATUS_META: Record<StatusEffectType, { label: string; color: string; desc: string }> = {
  burn: { label: 'เผาไหม้', color: '#fb923c', desc: 'เสีย HP ต่อเนื่องทุกวินาที' },
  freeze: { label: 'แช่แข็ง', color: '#67e8f9', desc: 'ลดความเร็วโจมตีลง 30%' },
  stun: { label: 'มึนงง', color: '#facc15', desc: 'หยุดการเคลื่อนไหวและรีเซ็ตเกจโจมตี' },
  poison: { label: 'ติดพิษ', color: '#4ade80', desc: 'เสียพลังชีวิตตามสัดส่วน HP' },
  shield: { label: 'เกราะป้องกัน', color: '#60a5fa', desc: 'ดูดซับดาเมจที่ได้รับ 35%' },
}

const ELEMENT_ADVANTAGE: Record<ElementType, Partial<Record<ElementType, number>>> = {
  neutral: {},
  fire: { ice: 1.35, wind: 1.25, earth: 0.85, water: 0.8, fire: 0.85 },
  water: { fire: 1.35, earth: 1.2, water: 0.85 },
  ice: { earth: 1.35, wind: 1.15, fire: 0.85, ice: 0.85 },
  earth: { dark: 1.35, poison: 1.2, ice: 0.85, wind: 0.85, earth: 0.85 },
  wind: { earth: 1.3, poison: 1.15, wind: 0.85 },
  poison: { water: 1.2, earth: 0.9, poison: 0.85 },
  light: { dark: 1.4, poison: 1.2, neutral: 1.1 },
  dark: { light: 1.25, earth: 0.85 },
}

export function getElementMultiplier(
  attackerElement: ElementType,
  defenderElement: ElementType,
): { multiplier: number; effectiveness: 'super' | 'resist' | 'normal' } {
  const mult = ELEMENT_ADVANTAGE[attackerElement]?.[defenderElement] ?? 1
  if (mult >= 1.2) return { multiplier: mult, effectiveness: 'super' }
  if (mult <= 0.9) return { multiplier: mult, effectiveness: 'resist' }
  return { multiplier: 1, effectiveness: 'normal' }
}

const MONSTER_ELEMENT_MAP: Record<string, ElementType> = {
  // Meadow 13 monsters
  meadow_larva: 'earth',
  meadow_fuzzfly: 'wind',
  meadow_beetle: 'earth',
  meadow_blob: 'water',
  meadow_blob_drop: 'fire',
  meadow_cocoon: 'earth',
  meadow_beetle_egg: 'earth',
  meadow_bloomlet: 'earth',
  meadow_capling: 'poison',
  meadow_hopper: 'neutral',
  meadow_fiddlehop: 'earth',
  meadow_big_hopper: 'neutral',
  meadow_dewmother: 'water',

  slime: 'ice',
  slime_blue: 'ice',
  pink_slime: 'ice',
  mushroom: 'earth',
  rabbit: 'neutral',
  boss_wolf: 'earth',
  wolf: 'earth',
  goblin: 'neutral',
  boss_spider_queen: 'dark',
  goblin_chief: 'earth',
  boss_lich: 'dark',
  bat: 'dark',
  spider: 'dark',
  boss_fire_dragon: 'fire',
  skeleton: 'dark',
  orc: 'earth',
  golem: 'earth',
  boss_demon_king: 'dark',
  ghost: 'dark',
  fire_golem: 'fire',
  earth_golem: 'earth',
  demon: 'dark',
  demon_lord: 'fire',
  abyss_knight: 'dark',
  gale_sentinel: 'ice',
  abyss_dragon: 'dark',
}

const BIOME_DEFAULT_ELEMENT: Record<string, ElementType> = {
  meadow: 'neutral',
  vale: 'earth',
  woods: 'earth',
  forest: 'earth',
  coast: 'ice',
  cave: 'earth',
  desert: 'earth',
  graveyard: 'dark',
  isles: 'ice',
  snow: 'ice',
  ruins: 'dark',
  volcano: 'fire',
  sky: 'light',
  abyss: 'dark',
  world: 'dark',
}

export function getMonsterElement(monsterId: string): ElementType {
  if (MONSTER_ELEMENT_MAP[monsterId]) return MONSTER_ELEMENT_MAP[monsterId]
  const biome = MONSTER_BIOME_MAP[monsterId]
  return biome ? (BIOME_DEFAULT_ELEMENT[biome] ?? 'neutral') : 'neutral'
}

export function getAttackElement(
  skillId?: string | null,
  equippedRunes?: Partial<Record<EquipmentSlot, string>>,
): ElementType {
  if (skillId === 'firebolt' || skillId === 'meteor') return 'fire'
  if (skillId === 'blizzard' || skillId === 'whirl') return 'ice'
  if (skillId === 'holy' || skillId === 'holy-strike' || skillId === 'light-judgment' || skillId === 'holy-bolt' || skillId === 'sanctuary' || skillId === 'sacred-aegis') {
    return 'light'
  }
  if (skillId === 'backstab' || skillId === 'shadow') return 'dark'
  if (skillId === 'bash' || skillId === 'sniper' || skillId === 'power') {
    const weaponRune = equippedRunes?.weapon ? RUNE_DEFS[equippedRunes.weapon] : undefined
    return weaponRune?.element ?? 'neutral'
  }
  const weaponRune = equippedRunes?.weapon ? RUNE_DEFS[equippedRunes.weapon] : undefined
  return weaponRune?.element ?? 'neutral'
}

export interface CombatStatusMap {
  burn?: number
  freeze?: number
  stun?: number
  poison?: number
  shield?: number
}

export function rollStatusInfliction(
  skillId?: string | null,
  equippedRunes?: Partial<Record<EquipmentSlot, string>>,
  randValue = Math.random(),
): StatusEffectType | null {
  if (skillId === 'firebolt' || skillId === 'meteor') return randValue < 0.48 ? 'burn' : null
  if (skillId === 'blizzard') return randValue < 0.6 ? 'freeze' : null
  if (skillId === 'bash' || skillId === 'holy-strike' || skillId === 'light-judgment') return randValue < 0.35 ? 'stun' : null
  if (skillId === 'backstab' || skillId === 'shadow') return randValue < 0.45 ? 'poison' : null
  if (skillId === 'sacred-aegis' || skillId === 'sanctuary' || skillId === 'grace-heal') return 'shield'
  const weaponRuneId = equippedRunes?.weapon
  if (weaponRuneId === 'rune_ember' && randValue < 0.22) return 'burn'
  if (weaponRuneId === 'rune_frost' && randValue < 0.22) return 'freeze'
  if (weaponRuneId === 'rune_thunder' && randValue < 0.18) return 'stun'
  if (weaponRuneId === 'rune_venom' && randValue < 0.25) return 'poison'
  return null
}

/* ========================================================================== */
/* 3. BOSS TELEGRAPH & GUARD / PARRY SYSTEM                                   */
/* ========================================================================== */

export type GuardOutcome = 'perfect_counter' | 'blocked' | 'cooldown'

export function evaluateGuardAction(
  telegraphActive: boolean,
  enemyAttackProgress: number,
  guardCooldownSec: number,
): { outcome: GuardOutcome; damageFactor: number; counterMultiplier: number; label: string } {
  if (guardCooldownSec > 0) {
    return { outcome: 'cooldown', damageFactor: 1, counterMultiplier: 0, label: 'เกราะกำลังรีเซ็ต' }
  }
  if (telegraphActive && enemyAttackProgress >= 0.45) {
    return {
      outcome: 'perfect_counter',
      damageFactor: 0,
      counterMultiplier: 1.85,
      label: 'PERFECT PARRY! สวนกลับคริติคอล!',
    }
  }
  return {
    outcome: 'blocked',
    damageFactor: 0.25,
    counterMultiplier: 0.65,
    label: 'ป้องกันสำเร็จ (-75% ดาเมจ)',
  }
}

/* ========================================================================== */
/* 4. BESTIARY CODEX & TITLES                                                 */
/* ========================================================================== */

export const BESTIARY_TIERS = [
  { tier: 1, target: 5, label: 'นักสำรวจ', atk: 3, def: 2, hp: 15 },
  { tier: 2, target: 20, label: 'ผู้ล่าชำนาญ', atk: 8, def: 5, hp: 40 },
  { tier: 3, target: 50, label: 'เจ้าแห่งเผ่าพันธุ์', atk: 16, def: 10, hp: 90 },
] as const

export interface TitleDef {
  id: string
  name: string
  color: string
  requirement: string
  hpBonus: number
  atkBonus: number
  defBonus: number
  critBonus: number
}

export const TITLE_DEFS: TitleDef[] = [
  { id: 'novice_traveler', name: 'นักผจญภัยหน้าใหม่', color: '#94a3b8', requirement: 'เริ่มต้นการผจญภัย', hpBonus: 10, atkBonus: 2, defBonus: 1, critBonus: 0 },
  { id: 'slime_hunter', name: 'นักล่าสไลม์', color: '#4ade80', requirement: 'กำจัดสไลม์/สไลม์ชมพู รวม 10 ตัว', hpBonus: 20, atkBonus: 5, defBonus: 3, critBonus: 0.01 },
  { id: 'goblin_slayer', name: 'ผู้พิชิตก๊อบลิน', color: '#86efac', requirement: 'ปราบก๊อบลิน 15 ตัว หรือหัวหน้าก๊อบลิน', hpBonus: 35, atkBonus: 12, defBonus: 5, critBonus: 0.01 },
  { id: 'artisan_smith', name: 'ช่างตีเหล็กปรมาจารย์', color: '#fbbf24', requirement: 'ตีบวกอุปกรณ์สะสม 5 ครั้ง', hpBonus: 30, atkBonus: 14, defBonus: 10, critBonus: 0.02 },
  { id: 'boss_breaker', name: 'ผู้โค่นจอมบอส', color: '#f87171', requirement: 'ปราบบอสสะสมครบ 5 ตัว', hpBonus: 60, atkBonus: 22, defBonus: 14, critBonus: 0.02 },
  { id: 'tower_conqueror', name: 'ราชันย์หอคอย', color: '#c084fc', requirement: 'ผ่านหอคอยชั้นที่ 10 ขึ้นไป', hpBonus: 85, atkBonus: 28, defBonus: 18, critBonus: 0.03 },
  { id: 'arena_gladiator', name: 'แชมป์สังเวียน', color: '#fb923c', requirement: 'ชนะในอารีน่า PvP อย่างน้อย 3 ครั้ง', hpBonus: 65, atkBonus: 24, defBonus: 12, critBonus: 0.03 },
  { id: 'guild_pillar', name: 'เสาหลักแห่งกิลด์', color: '#38bdf8', requirement: 'บริจาคกิลด์สะสม 1,000 G ขึ้นไป', hpBonus: 55, atkBonus: 16, defBonus: 16, critBonus: 0.02 },
  { id: 'dragon_bane', name: 'ผู้สยบมังกรอเวจี', color: '#a78bfa', requirement: 'ปราบมังกรอเวจีอย่างน้อย 1 ตัว', hpBonus: 120, atkBonus: 42, defBonus: 22, critBonus: 0.04 },
  { id: 'reborn_ascendant', name: 'ผู้จุติเทวะ', color: '#f472b6', requirement: 'จุติครบ 5 ครั้งขึ้นไป', hpBonus: 160, atkBonus: 55, defBonus: 30, critBonus: 0.04 },
  { id: 'celestial_legend', name: 'ราชันย์ดารานิรันดร์', color: '#fde047', requirement: 'จุติครบสูงสุด 6 ครั้ง', hpBonus: 260, atkBonus: 85, defBonus: 45, critBonus: 0.06 },
]

export function evaluateUnlockedTitleIds(save: Pick<SaveData, 'kills' | 'rebirthCount' | 'questState' | 'towerState' | 'rpgExt'>): string[] {
  const ext = sanitizeRpgExt(save.rpgExt)
  const unlocked = new Set<string>(['novice_traveler', ...ext.titles])
  const slimeKills = (ext.bestiary.slime ?? 0) + (ext.bestiary.slime_blue ?? 0) + (ext.bestiary.pink_slime ?? 0)
  const goblinKills = ext.bestiary.goblin ?? 0
  const goblinBoss = ext.bestiary.goblin_chief ?? 0
  const totalBossKills = (save.questState?.totalBossKills ?? 0) +
    (ext.bestiary.boss_wolf ?? 0) +
    (ext.bestiary.boss_spider_queen ?? 0) +
    (ext.bestiary.goblin_chief ?? 0) +
    (ext.bestiary.boss_lich ?? 0) +
    (ext.bestiary.boss_fire_dragon ?? 0) +
    (ext.bestiary.boss_demon_king ?? 0) +
    (ext.bestiary.earth_golem ?? 0) +
    (ext.bestiary.demon_lord ?? 0) +
    (ext.bestiary.abyss_dragon ?? 0)

  if (slimeKills >= 10) unlocked.add('slime_hunter')
  if (goblinKills >= 15 || goblinBoss >= 1) unlocked.add('goblin_slayer')
  if ((save.questState?.totalEnhances ?? 0) >= 5) unlocked.add('artisan_smith')
  if (totalBossKills >= 5) unlocked.add('boss_breaker')
  if ((save.towerState?.highestFloor ?? 0) >= 10) unlocked.add('tower_conqueror')
  if (ext.arenaWins >= 3) unlocked.add('arena_gladiator')
  if (ext.guildContribution >= 1000) unlocked.add('guild_pillar')
  if ((ext.bestiary.abyss_dragon ?? 0) >= 1) unlocked.add('dragon_bane')
  if ((save.rebirthCount ?? 0) >= 5) unlocked.add('reborn_ascendant')
  if ((save.rebirthCount ?? 0) >= 6) unlocked.add('celestial_legend')

  return [...unlocked]
}

export function recordBestiaryKillInState(
  rpgExt: RpgExtensionState | undefined,
  monsterId: string,
  saveContext?: Pick<SaveData, 'kills' | 'rebirthCount' | 'questState' | 'towerState'>,
): RpgExtensionState {
  const next = sanitizeRpgExt(rpgExt)
  if (MONSTERS[monsterId]) {
    next.bestiary[monsterId] = (next.bestiary[monsterId] ?? 0) + 1
  }
  next.titles = evaluateUnlockedTitleIds({
    kills: saveContext?.kills ?? 0,
    rebirthCount: saveContext?.rebirthCount ?? 0,
    questState: saveContext?.questState,
    towerState: saveContext?.towerState,
    rpgExt: next,
  })
  return next
}

export function computeBestiaryAndTitleBonuses(rpgExt: RpgExtensionState | undefined): {
  hpBonus: number
  atkBonus: number
  defBonus: number
  critBonus: number
  activeTitleDef: TitleDef | null
} {
  const ext = sanitizeRpgExt(rpgExt)
  let hpBonus = 0
  let atkBonus = 0
  let defBonus = 0
  let critBonus = 0

  for (const [monsterId, claimedTier] of Object.entries(ext.claimedBestiaryTiers)) {
    const def = MONSTERS[monsterId]
    if (!def || claimedTier <= 0) continue
    const bossFactor = def.boss ? 1.5 : 1
    for (const tierSpec of BESTIARY_TIERS) {
      if (claimedTier >= tierSpec.tier) {
        hpBonus += Math.round(tierSpec.hp * bossFactor)
        atkBonus += Math.round(tierSpec.atk * bossFactor)
        defBonus += Math.round(tierSpec.def * bossFactor)
      }
    }
  }

  // Passive mastery: unlocked titles grant 35% of their stat passively, active title grants 100%
  const activeTitleDef = ext.activeTitle ? TITLE_DEFS.find((t) => t.id === ext.activeTitle) ?? null : null
  for (const titleId of ext.titles) {
    const td = TITLE_DEFS.find((t) => t.id === titleId)
    if (!td) continue
    const scale = activeTitleDef?.id === td.id ? 1 : 0.35
    hpBonus += Math.round(td.hpBonus * scale)
    atkBonus += Math.round(td.atkBonus * scale)
    defBonus += Math.round(td.defBonus * scale)
    critBonus += td.critBonus * scale
  }

  return { hpBonus, atkBonus, defBonus, critBonus, activeTitleDef }
}

/* ========================================================================== */
/* 5. SET BONUSES & RUNE SOCKETING                                            */
/* ========================================================================== */

export interface RuneDef {
  id: string
  name: string
  element: ElementType
  color: string
  description: string
  atkBonus: number
  defBonus: number
  hpBonus: number
  critBonus: number
  lifestealPct: number
}

export const RUNE_DEFS: Record<string, RuneDef> = {
  rune_ember: {
    id: 'rune_ember',
    name: 'รูนอัคคี',
    element: 'fire',
    color: '#fb923c',
    description: 'ATK +14 · เคลือบธาตุไฟ · โอกาสเผาไหม้ศัตรู',
    atkBonus: 14,
    defBonus: 0,
    hpBonus: 15,
    critBonus: 0.01,
    lifestealPct: 0,
  },
  rune_frost: {
    id: 'rune_frost',
    name: 'รูนเหมันต์',
    element: 'ice',
    color: '#67e8f9',
    description: 'DEF +12 · HP +55 · เคลือบธาตุน้ำแข็ง',
    atkBonus: 6,
    defBonus: 12,
    hpBonus: 55,
    critBonus: 0,
    lifestealPct: 0,
  },
  rune_thunder: {
    id: 'rune_thunder',
    name: 'รูนอสนีบาต',
    element: 'light',
    color: '#fde047',
    description: 'ATK +12 · คริ +4% · โอกาสทำให้มึนงง',
    atkBonus: 12,
    defBonus: 2,
    hpBonus: 20,
    critBonus: 0.04,
    lifestealPct: 0,
  },
  rune_venom: {
    id: 'rune_venom',
    name: 'รูนพิษเงา',
    element: 'dark',
    color: '#a855f7',
    description: 'ATK +11 · คริ +3% · เคลือบธาตุมืดติดพิษ',
    atkBonus: 11,
    defBonus: 2,
    hpBonus: 15,
    critBonus: 0.03,
    lifestealPct: 0,
  },
  rune_guardian: {
    id: 'rune_guardian',
    name: 'รูนผู้พิทักษ์ปฐพี',
    element: 'earth',
    color: '#d4a373',
    description: 'HP +95 · DEF +18 · ทนทานแรงปะทะ',
    atkBonus: 4,
    defBonus: 18,
    hpBonus: 95,
    critBonus: 0,
    lifestealPct: 0,
  },
  rune_vampiric: {
    id: 'rune_vampiric',
    name: 'รูนโลหิตนิรันดร์',
    element: 'dark',
    color: '#fb7185',
    description: 'ATK +18 · ดูดเลือด 5% เมื่อโจมตี',
    atkBonus: 18,
    defBonus: 4,
    hpBonus: 40,
    critBonus: 0.02,
    lifestealPct: 5,
  },
}

export function computeRuneBonuses(rpgExt: RpgExtensionState | undefined): {
  hpBonus: number
  atkBonus: number
  defBonus: number
  critBonus: number
  lifestealPct: number
} {
  const ext = sanitizeRpgExt(rpgExt)
  let hpBonus = 0
  let atkBonus = 0
  let defBonus = 0
  let critBonus = 0
  let lifestealPct = 0

  for (const runeId of Object.values(ext.equippedRunes)) {
    if (!runeId) continue
    const rune = RUNE_DEFS[runeId]
    if (!rune) continue
    hpBonus += rune.hpBonus
    atkBonus += rune.atkBonus
    defBonus += rune.defBonus
    critBonus += rune.critBonus
    lifestealPct += rune.lifestealPct
  }

  return { hpBonus, atkBonus, defBonus, critBonus, lifestealPct }
}

export interface SetBonusSummary {
  equippedCount: number
  tier3Count: number
  tier4Count: number
  activeLabels: string[]
  hpBonus: number
  atkBonus: number
  defBonus: number
  critBonus: number
}

export function computeEquipmentSetBonuses(equipment: Partial<Record<EquipmentSlot, InvItem | null>> | undefined): SetBonusSummary {
  if (!equipment) {
    return { equippedCount: 0, tier3Count: 0, tier4Count: 0, activeLabels: [], hpBonus: 0, atkBonus: 0, defBonus: 0, critBonus: 0 }
  }
  const items = Object.values(equipment).filter((it): it is InvItem => Boolean(it))
  const equippedCount = items.length
  let tier3Count = 0
  let tier4Count = 0

  for (const item of items) {
    const def = ITEMS[item.itemId]
    const tier = def?.tier ?? 1
    if (tier >= 3) tier3Count++
    if (tier >= 4) tier4Count++
  }

  let hpBonus = 0
  let atkBonus = 0
  let defBonus = 0
  let critBonus = 0
  const activeLabels: string[] = []

  if (equippedCount >= 2) {
    hpBonus += 25
    atkBonus += 6
    defBonus += 4
    activeLabels.push('เซตพร้อมรบ (2+ ชิ้น): +25 HP, +6 ATK, +4 DEF')
  }
  if (tier3Count >= 2) {
    hpBonus += 65
    atkBonus += 18
    defBonus += 12
    activeLabels.push('เซตจอมยุทธ์ Tier 3+ (2+ ชิ้น): +65 HP, +18 ATK, +12 DEF')
  }
  if (tier4Count >= 2) {
    hpBonus += 120
    atkBonus += 38
    defBonus += 22
    critBonus += 0.03
    activeLabels.push('เซตตำนาน/อเวจี Tier 4+ (2+ ชิ้น): +120 HP, +38 ATK, +22 DEF, +3% คริ')
  }
  if (equippedCount >= 5) {
    hpBonus += 140
    atkBonus += 32
    defBonus += 24
    critBonus += 0.04
    activeLabels.push('เซตครบชุด 5 ช่องสมบูรณ์: +140 HP, +32 ATK, +24 DEF, +4% คริ')
  }

  return {
    equippedCount,
    tier3Count,
    tier4Count,
    activeLabels,
    hpBonus,
    atkBonus,
    defBonus,
    critBonus,
  }
}

/* ========================================================================== */
/* 6. CRAFTING & DISMANTLE WORKSHOP                                           */
/* ========================================================================== */

export interface CraftRecipe {
  id: string
  name: string
  category: 'potion' | 'material' | 'equipment' | 'rune'
  resultItemId?: string
  resultRuneId?: string
  resultQty: number
  goldCost: number
  ingredients: Array<{ itemId: string; qty: number }>
  description: string
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: 'craft_red_potion',
    name: 'ยาแดงฟื้นพลัง x3',
    category: 'potion',
    resultItemId: 'red_potion',
    resultQty: 3,
    goldCost: 25,
    ingredients: [
      { itemId: 'slime_gel', qty: 2 },
      { itemId: 'torn_cloth', qty: 1 },
    ],
    description: 'กลั่นเจลสไลม์เป็นยาแดงฟื้นฟู HP 60',
  },
  {
    id: 'craft_orange_potion',
    name: 'ยาส้มฟื้นพลัง x2',
    category: 'potion',
    resultItemId: 'orange_potion',
    resultQty: 2,
    goldCost: 80,
    ingredients: [
      { itemId: 'mushroom_cap', qty: 3 },
      { itemId: 'slime_gel', qty: 2 },
    ],
    description: 'ยาฟื้นฟู HP 220 สำหรับออกล่ามอนระดับกลาง',
  },
  {
    id: 'craft_blue_potion',
    name: 'ยาฟ้าฟื้นมานา x3',
    category: 'potion',
    resultItemId: 'blue_potion',
    resultQty: 3,
    goldCost: 45,
    ingredients: [
      { itemId: 'slime_gel', qty: 2 },
      { itemId: 'mushroom_cap', qty: 1 },
    ],
    description: 'สกัดยาฟื้นฟู MP 50 ใช้ร่ายสกิลต่อเนื่อง',
  },
  {
    id: 'craft_enhance_stone_scrap',
    name: 'หลอมหินตีบวก x1',
    category: 'material',
    resultItemId: 'enhance_stone',
    resultQty: 1,
    goldCost: 120,
    ingredients: [
      { itemId: 'monster_scrap', qty: 4 },
      { itemId: 'cracked_claw', qty: 2 },
    ],
    description: 'แปรรูปขยะมอนสเตอร์เป็นหินตีบวกคุณภาพดี',
  },
  {
    id: 'craft_enhance_stone_bone',
    name: 'หลอมหินตีบวกบริสุทธิ์ x3',
    category: 'material',
    resultItemId: 'enhance_stone',
    resultQty: 3,
    goldCost: 350,
    ingredients: [
      { itemId: 'bone', qty: 3 },
      { itemId: 'wolf_fang', qty: 2 },
    ],
    description: 'หลอมกระดูกและเขี้ยวหมาป่าเป็นหินตีบวก 3 ก้อน',
  },
  {
    id: 'craft_knight_blade',
    name: 'สร้างดาบอัศวิน',
    category: 'equipment',
    resultItemId: 'knight_blade',
    resultQty: 1,
    goldCost: 2200,
    ingredients: [
      { itemId: 'goblin_ear', qty: 6 },
      { itemId: 'bone', qty: 4 },
      { itemId: 'enhance_stone', qty: 2 },
    ],
    description: 'ดาบ Tier 3 ATK +72 สำหรับนักดาบ/อัศวิน/พาลาดิน',
  },
  {
    id: 'craft_crystal_staff',
    name: 'สร้างคทาคริสตัล',
    category: 'equipment',
    resultItemId: 'crystal_staff',
    resultQty: 1,
    goldCost: 2200,
    ingredients: [
      { itemId: 'ectoplasm', qty: 5 },
      { itemId: 'mushroom_cap', qty: 5 },
      { itemId: 'enhance_stone', qty: 2 },
    ],
    description: 'คทา Tier 3 ATK +68 สำหรับสายเวทมนตร์',
  },
  {
    id: 'craft_flame_sword',
    name: 'ตีดาบเพลิงนรก (ตำนาน)',
    category: 'equipment',
    resultItemId: 'flame_sword',
    resultQty: 1,
    goldCost: 7500,
    ingredients: [
      { itemId: 'ember_core', qty: 4 },
      { itemId: 'demon_horn', qty: 3 },
      { itemId: 'enhance_stone', qty: 5 },
    ],
    description: 'อาวุธระดับ Tier 4 ATK +125 ที่หลอมจากแกนเพลิง',
  },
  {
    id: 'craft_dragon_armor',
    name: 'ตีเกราะมังกร (ตำนาน)',
    category: 'equipment',
    resultItemId: 'dragon_armor',
    resultQty: 1,
    goldCost: 8500,
    ingredients: [
      { itemId: 'earth_core', qty: 2 },
      { itemId: 'abyss_crystal', qty: 2 },
      { itemId: 'demon_horn', qty: 4 },
    ],
    description: 'ชุดเกราะ Tier 4 DEF +70 จากผลึกอเวจีและแก่นปฐพี',
  },
  {
    id: 'craft_rune_ember',
    name: 'จารึก รูนอัคคี',
    category: 'rune',
    resultRuneId: 'rune_ember',
    resultQty: 1,
    goldCost: 600,
    ingredients: [
      { itemId: 'ember_core', qty: 2 },
      { itemId: 'wolf_fang', qty: 2 },
    ],
    description: 'ATK +14 · เคลือบธาตุไฟและสถานะเผาไหม้',
  },
  {
    id: 'craft_rune_frost',
    name: 'จารึก รูนเหมันต์',
    category: 'rune',
    resultRuneId: 'rune_frost',
    resultQty: 1,
    goldCost: 500,
    ingredients: [
      { itemId: 'ectoplasm', qty: 3 },
      { itemId: 'slime_gel', qty: 5 },
    ],
    description: 'DEF +12 · HP +55 · เคลือบธาตุน้ำแข็งแช่แข็ง',
  },
  {
    id: 'craft_rune_guardian',
    name: 'จารึก รูนผู้พิทักษ์ปฐพี',
    category: 'rune',
    resultRuneId: 'rune_guardian',
    resultQty: 1,
    goldCost: 700,
    ingredients: [
      { itemId: 'earth_core', qty: 1 },
      { itemId: 'bone', qty: 4 },
    ],
    description: 'HP +95 · DEF +18 เสริมความถึกให้ชุดเกราะ',
  },
  {
    id: 'craft_rune_vampiric',
    name: 'จารึก รูนโลหิตนิรันดร์',
    category: 'rune',
    resultRuneId: 'rune_vampiric',
    resultQty: 1,
    goldCost: 1400,
    ingredients: [
      { itemId: 'abyss_crystal', qty: 1 },
      { itemId: 'demon_horn', qty: 3 },
    ],
    description: 'ATK +18 · ดูดเลือด 5% เมื่อโจมตี',
  },
]

export function countInventoryItem(inventory: InvItem[], itemId: string): number {
  return inventory.filter((i) => i.itemId === itemId).reduce((sum, i) => sum + i.qty, 0)
}

export function canCraftRecipe(recipe: CraftRecipe, inventory: InvItem[], gold: number): { ok: boolean; reason?: string } {
  if (gold < recipe.goldCost) {
    return { ok: false, reason: `ทองไม่พอ (ต้องการ ${recipe.goldCost.toLocaleString()} G)` }
  }
  for (const ing of recipe.ingredients) {
    const have = countInventoryItem(inventory, ing.itemId)
    if (have < ing.qty) {
      const name = ITEMS[ing.itemId]?.name ?? ing.itemId
      return { ok: false, reason: `วัตถุดิบ ${name} ไม่พอ (${have}/${ing.qty})` }
    }
  }
  return { ok: true }
}

export function calculateDismantleYield(item: InvItem): {
  stones: number
  gold: number
  bonusRuneId: string | null
} {
  const def = ITEMS[item.itemId]
  if (!def || (def.kind !== 'weapon' && def.kind !== 'armor')) {
    return { stones: 0, gold: 0, bonusRuneId: null }
  }
  const tier = Math.max(1, def.tier ?? 1)
  const stones = Math.max(1, tier + Math.floor(item.plus * 0.7))
  const gold = Math.max(30, Math.round(def.price * 0.25 + item.plus * 80))
  const bonusRuneId =
    tier >= 4
      ? 'rune_vampiric'
      : tier === 3
        ? 'rune_thunder'
        : item.plus >= 3
          ? 'rune_ember'
          : null
  return { stones, gold, bonusRuneId }
}

/* ========================================================================== */
/* 7. GUILDS & TIMED WORLD BOSS RAID                                          */
/* ========================================================================== */

export function guildExpToNext(level: number): number {
  return 1000 + Math.max(1, level) * 800
}

export function getGuildBuffs(guildLevel: number): {
  atkPct: number
  expPct: number
  goldPct: number
  defPct: number
} {
  const lv = Math.max(1, Math.min(50, Math.floor(guildLevel)))
  return {
    atkPct: 3 + lv * 2,
    defPct: 3 + lv * 2,
    expPct: 5 + lv * 2,
    goldPct: 5 + lv * 2,
  }
}

export interface WorldBossScheduleSpec {
  cycleKey: string
  bossId: string
  name: string
  monsterId: string
  element: ElementType
  maxHp: number
  atk: number
  def: number
  endsAtMs: number
  milestones: Array<{ id: string; damage: number; gold: number; diamonds: number; stones: number; runeId?: string }>
}

const WORLD_BOSS_ROTATION = [
  {
    bossId: 'wb_earth_titan',
    name: 'ไททันปฐพีผู้พิโรธ',
    monsterId: 'earth_golem',
    element: 'earth' as ElementType,
    maxHp: 350_000,
    atk: 190,
    def: 75,
  },
  {
    bossId: 'wb_inferno_lord',
    name: 'จักรพรรดิเพลิงอเวจี',
    monsterId: 'demon_lord',
    element: 'fire' as ElementType,
    maxHp: 450_000,
    atk: 230,
    def: 85,
  },
  {
    bossId: 'wb_abyss_wyrm',
    name: 'มังกรกลืนดาราอเวจี',
    monsterId: 'abyss_dragon',
    element: 'dark' as ElementType,
    maxHp: 600_000,
    atk: 275,
    def: 95,
  },
] as const

export function getActiveWorldBoss(nowMs = Date.now()): WorldBossScheduleSpec {
  const slotMs = 3_600_000 // Rotates every hour cleanly
  const slotIndex = Math.floor(nowMs / slotMs)
  const template = WORLD_BOSS_ROTATION[Math.abs(slotIndex) % WORLD_BOSS_ROTATION.length]
  return {
    cycleKey: `${template.bossId}_${slotIndex}`,
    bossId: template.bossId,
    name: template.name,
    monsterId: template.monsterId,
    element: template.element,
    maxHp: template.maxHp,
    atk: template.atk,
    def: template.def,
    endsAtMs: (slotIndex + 1) * slotMs,
    milestones: [
      { id: 'wb_m1', damage: 1_500, gold: 800, diamonds: 15, stones: 2 },
      { id: 'wb_m2', damage: 6_000, gold: 2_000, diamonds: 30, stones: 4 },
      { id: 'wb_m3', damage: 18_000, gold: 4_500, diamonds: 60, stones: 8, runeId: 'rune_thunder' },
      { id: 'wb_m4', damage: 45_000, gold: 10_000, diamonds: 120, stones: 15, runeId: 'rune_vampiric' },
    ],
  }
}

/* ========================================================================== */
/* 8. LEADERBOARD, COMBAT POWER & ASYNC PVP ARENA                             */
/* ========================================================================== */

export interface LeaderboardHeroEntry {
  userId: string
  gameUid: string
  name: string
  jobId: string
  level: number
  rebirthCount: number
  combatPower: number
  arenaRating: number
  arenaWins: number
  highestTowerFloor: number
  activeTitle: string | null
  guildName: string | null
  isSeed?: boolean
}

export function computeCombatPower(
  save: Pick<SaveData, 'level' | 'rebirthCount'>,
  stats: { maxHp: number; atk: number; def: number; crit: number },
): number {
  const rebirth = save.rebirthCount ?? 0
  return Math.max(
    1,
    Math.round(
      stats.atk * 4.2 +
      stats.def * 3.1 +
      stats.maxHp * 0.45 +
      stats.crit * 800 +
      save.level * 12 +
      rebirth * 350,
    ),
  )
}

export const SEED_RIVAL_HEROES: LeaderboardHeroEntry[] = [
  { userId: 'seed_kael', gameUid: '1042', name: 'เคเอลผู้พิทักษ์', jobId: 'templar', level: 48, rebirthCount: 2, combatPower: 3420, arenaRating: 1280, arenaWins: 18, highestTowerFloor: 24, activeTitle: 'boss_breaker', guildName: 'ภาคีอัศวินแสง', isSeed: true },
  { userId: 'seed_lyra', gameUid: '2098', name: 'ไลราสายฟ้า', jobId: 'wicked_necromancer', level: 55, rebirthCount: 3, combatPower: 4650, arenaRating: 1410, arenaWins: 27, highestTowerFloor: 31, activeTitle: 'tower_conqueror', guildName: 'หอคอยดารา', isSeed: true },
  { userId: 'seed_zen', gameUid: '3115', name: 'เซนเงาจันทรา', jobId: 'sinister', level: 62, rebirthCount: 5, combatPower: 6850, arenaRating: 1620, arenaWins: 44, highestTowerFloor: 42, activeTitle: 'reborn_ascendant', guildName: 'เงาอเวจี', isSeed: true },
  { userId: 'seed_aria', gameUid: '4081', name: 'อาเรียผู้เยียวยา', jobId: 'cleric', level: 36, rebirthCount: 1, combatPower: 2150, arenaRating: 1120, arenaWins: 9, highestTowerFloor: 15, activeTitle: 'guild_pillar', guildName: 'วิหารแห่งแสง', isSeed: true },
  { userId: 'seed_kuro', gameUid: '5177', name: 'คุโระนักล่า', jobId: 'mamushi', level: 24, rebirthCount: 0, combatPower: 1180, arenaRating: 1030, arenaWins: 5, highestTowerFloor: 9, activeTitle: 'goblin_slayer', guildName: 'พรานไพร', isSeed: true },
  { userId: 'seed_mira', gameUid: '6019', name: 'มิร่าเคนเซ', jobId: 'kensei', level: 16, rebirthCount: 0, combatPower: 690, arenaRating: 980, arenaWins: 2, highestTowerFloor: 5, activeTitle: 'slime_hunter', guildName: null, isSeed: true },
]

export interface PvpRoundLog {
  round: number
  actor: 'player' | 'opponent'
  actionName: string
  damage: number
  isCrit: boolean
  playerHp: number
  opponentHp: number
}

export interface PvpSimulationResult {
  won: boolean
  rounds: PvpRoundLog[]
  ratingDelta: number
  goldReward: number
  diamondReward: number
}

export function simulatePvpBattle(
  playerStats: { name: string; jobId: string; maxHp: number; atk: number; def: number; crit: number },
  opponent: LeaderboardHeroEntry,
  rng: () => number = Math.random,
): PvpSimulationResult {
  const oppJob = JOBS[normalizeJobId(opponent.jobId)]
  const oppMaxHp = Math.max(120, Math.round(opponent.combatPower * 0.95))
  const oppAtk = Math.max(15, Math.round(opponent.combatPower * 0.115 * (oppJob.atkMul / 1.3)))
  const oppDef = Math.max(8, Math.round(opponent.combatPower * 0.08))
  const oppCrit = Math.min(0.45, oppJob.crit + opponent.rebirthCount * 0.02)

  let pHp = Math.max(1, playerStats.maxHp)
  let oHp = oppMaxHp
  const rounds: PvpRoundLog[] = []
  const pJob = JOBS[normalizeJobId(playerStats.jobId)]

  for (let round = 1; round <= 12 && pHp > 0 && oHp > 0; round++) {
    // Player turn
    const pSkill = round % 2 === 0 && pJob.skills[0] ? pJob.skills[0] : null
    const pMult = pSkill && pSkill.kind !== 'heal' ? Math.min(2.6, pSkill.mult) : 1.05
    const pRaw = ((playerStats.atk * pMult) ** 2) / Math.max(1, playerStats.atk * pMult + oppDef)
    const pCrit = rng() < Math.min(0.7, playerStats.crit)
    const pDmg = Math.max(4, Math.round(pRaw * (pCrit ? 1.6 : 1) * (0.92 + rng() * 0.16)))
    oHp = Math.max(0, oHp - pDmg)
    rounds.push({
      round,
      actor: 'player',
      actionName: pSkill ? pSkill.name : 'โจมตีต่อเนื่อง',
      damage: pDmg,
      isCrit: pCrit,
      playerHp: pHp,
      opponentHp: oHp,
    })
    if (oHp <= 0) break

    // Opponent turn
    const oSkill = round % 3 === 0 && oppJob.skills[0] ? oppJob.skills[0] : null
    const oMult = oSkill && oSkill.kind !== 'heal' ? Math.min(2.2, oSkill.mult * 0.85) : 1
    const oRaw = ((oppAtk * oMult) ** 2) / Math.max(1, oppAtk * oMult + playerStats.def)
    const oCrit = rng() < oppCrit
    const oDmg = Math.max(3, Math.round(oRaw * (oCrit ? 1.5 : 1) * (0.9 + rng() * 0.2)))
    pHp = Math.max(0, pHp - oDmg)
    rounds.push({
      round,
      actor: 'opponent',
      actionName: oSkill ? oSkill.name : 'โจมตีโต้กลับ',
      damage: oDmg,
      isCrit: oCrit,
      playerHp: pHp,
      opponentHp: oHp,
    })
  }

  const won = oHp <= 0 || (pHp > 0 && pHp / playerStats.maxHp >= oHp / oppMaxHp)
  return {
    won,
    rounds,
    ratingDelta: won ? 25 : -10,
    goldReward: won ? Math.round(250 + opponent.level * 18) : 60,
    diamondReward: won ? 8 : 0,
  }
}

/* ========================================================================== */
/* 9. DAILY RESOURCE DUNGEONS                                                 */
/* ========================================================================== */

export interface DailyDungeonDef {
  id: DailyDungeonId
  name: string
  subtitle: string
  recommendedLevel: number
  dailyLimit: number
  element: ElementType
  baseGold: number
  baseExp: number
  baseStones: number
  baseDiamonds: number
  bonusMaterialId?: string
  bonusRuneId?: string
}

export const DAILY_DUNGEONS: DailyDungeonDef[] = [
  {
    id: 'gold_vault',
    name: 'คลังสมบัติทองคำ',
    subtitle: 'ล่าก๊อบลินทองคำเพื่อกวาดทองคำมหาศาล',
    recommendedLevel: 5,
    dailyLimit: 3,
    element: 'neutral',
    baseGold: 1200,
    baseExp: 180,
    baseStones: 1,
    baseDiamonds: 5,
  },
  {
    id: 'stone_mine',
    name: 'เหมืองหินตีบวกคริสตัล',
    subtitle: 'ทลายโกเลมผลึก รับหินตีบวกและรูนธาตุ',
    recommendedLevel: 12,
    dailyLimit: 3,
    element: 'earth',
    baseGold: 550,
    baseExp: 260,
    baseStones: 4,
    baseDiamonds: 8,
    bonusRuneId: 'rune_guardian',
  },
  {
    id: 'boss_rush',
    name: 'ห้วงมิติ Boss Rush',
    subtitle: 'ประจันหน้าคลื่นบอส รับเพชรและวัตถุดิบระดับสูง',
    recommendedLevel: 25,
    dailyLimit: 3,
    element: 'dark',
    baseGold: 1800,
    baseExp: 900,
    baseStones: 3,
    baseDiamonds: 22,
    bonusMaterialId: 'ember_core',
    bonusRuneId: 'rune_thunder',
  },
]

export function calculateDailyDungeonRewards(
  dungeon: DailyDungeonDef,
  playerLevel: number,
  clearBonusFactor = 1,
): {
  gold: number
  exp: number
  stones: number
  diamonds: number
  materialId: string | null
  runeId: string | null
} {
  const scale = (1 + Math.max(0, playerLevel - 1) * 0.06) * clearBonusFactor
  return {
    gold: Math.round(dungeon.baseGold * scale),
    exp: Math.round(dungeon.baseExp * scale),
    stones: Math.max(1, Math.round(dungeon.baseStones * clearBonusFactor)),
    diamonds: Math.max(1, Math.round(dungeon.baseDiamonds * clearBonusFactor)),
    materialId: dungeon.bonusMaterialId ?? null,
    runeId: dungeon.bonusRuneId ?? null,
  }
}
