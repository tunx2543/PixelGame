import type { EquipmentSlot, ItemDef } from './data'
import type { PartyRecord } from '../firebase/party-helpers'
import type { RemotePlayerSnapshot } from '../firebase/presence-helpers'
import { getActiveWorldBoss, type ElementType, type WorldBossScheduleSpec } from './rpg-systems'

/* ========================================================================== */
/* 1. EQUIPMENT RARITY, RANDOM SUB-STATS (AFFIXES) & REFORGE                  */
/* ========================================================================== */

export type EquipmentRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type AffixStat =
  | 'atk_flat'
  | 'def_flat'
  | 'hp_flat'
  | 'crit_pct'
  | 'lifesteal_pct'
  | 'cd_reduce_pct'
  | 'gold_pct'
  | 'exp_pct'

export interface ItemAffix {
  stat: AffixStat
  value: number
}

export interface RarityStyleMeta {
  id: EquipmentRarity
  thaiLabel: string
  affixCount: number
  statMultiplier: number
  textColorClass: string
  borderColorClass: string
  badgeBgClass: string
}

export const EQUIPMENT_RARITY_META: Record<EquipmentRarity, RarityStyleMeta> = {
  common: {
    id: 'common',
    thaiLabel: 'ธรรมดา',
    affixCount: 0,
    statMultiplier: 1,
    textColorClass: 'text-slate-200',
    borderColorClass: 'border-border',
    badgeBgClass: 'bg-slate-600/30',
  },
  uncommon: {
    id: 'uncommon',
    thaiLabel: 'ชั้นดี',
    affixCount: 1,
    statMultiplier: 1.05,
    textColorClass: 'text-emerald-300',
    borderColorClass: 'border-emerald-400/70',
    badgeBgClass: 'bg-emerald-500/20',
  },
  rare: {
    id: 'rare',
    thaiLabel: 'หายาก',
    affixCount: 2,
    statMultiplier: 1.12,
    textColorClass: 'text-sky-300',
    borderColorClass: 'border-sky-400/80',
    badgeBgClass: 'bg-sky-500/20',
  },
  epic: {
    id: 'epic',
    thaiLabel: 'มหากาพย์',
    affixCount: 3,
    statMultiplier: 1.22,
    textColorClass: 'text-purple-300',
    borderColorClass: 'border-purple-400/85',
    badgeBgClass: 'bg-purple-500/20',
  },
  legendary: {
    id: 'legendary',
    thaiLabel: 'ตำนาน',
    affixCount: 4,
    statMultiplier: 1.35,
    textColorClass: 'text-amber-300',
    borderColorClass: 'border-amber-400',
    badgeBgClass: 'bg-amber-500/20',
  },
}

const AFFIX_POOL: Array<{
  stat: AffixStat
  label: string
  suffix: string
  minBase: number
  maxBase: number
  perTier: number
}> = [
  { stat: 'atk_flat', label: 'ATK', suffix: '', minBase: 3, maxBase: 8, perTier: 4 },
  { stat: 'def_flat', label: 'DEF', suffix: '', minBase: 2, maxBase: 6, perTier: 3 },
  { stat: 'hp_flat', label: 'HP', suffix: '', minBase: 18, maxBase: 45, perTier: 22 },
  { stat: 'crit_pct', label: 'คริติคอล', suffix: '%', minBase: 2, maxBase: 5, perTier: 1.5 },
  { stat: 'lifesteal_pct', label: 'ดูดเลือด', suffix: '%', minBase: 1, maxBase: 3, perTier: 0.8 },
  { stat: 'cd_reduce_pct', label: 'ลดคูลดาวน์', suffix: '%', minBase: 2, maxBase: 6, perTier: 1.5 },
  { stat: 'gold_pct', label: 'โบนัส Gold', suffix: '%', minBase: 4, maxBase: 10, perTier: 3 },
  { stat: 'exp_pct', label: 'โบนัส EXP', suffix: '%', minBase: 4, maxBase: 10, perTier: 3 },
]

export function getItemTierRarityFallback(tier: number | undefined, gmOnly?: boolean): EquipmentRarity {
  if (gmOnly || (tier ?? 1) >= 4) return 'legendary'
  if ((tier ?? 1) === 3) return 'epic'
  if ((tier ?? 1) === 2) return 'rare'
  return 'common'
}

export function resolveEffectiveRarity(
  item: { rarity?: EquipmentRarity } | null | undefined,
  def: Pick<ItemDef, 'tier' | 'gmOnly'> | undefined,
): EquipmentRarity {
  if (item?.rarity && EQUIPMENT_RARITY_META[item.rarity]) return item.rarity
  return getItemTierRarityFallback(def?.tier, def?.gmOnly)
}

export function rollEquipmentRarity(
  tier = 1,
  rng: () => number = Math.random,
  forceMinRarity?: EquipmentRarity,
): EquipmentRarity {
  const order: EquipmentRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
  const roll = Math.max(0, Math.min(0.999999, rng()))
  const tierShift = Math.max(0, Math.min(3, tier - 1)) * 0.14
  const score = roll + tierShift

  let rolled: EquipmentRarity = 'common'
  if (score >= 0.96) rolled = 'legendary'
  else if (score >= 0.82) rolled = 'epic'
  else if (score >= 0.58) rolled = 'rare'
  else if (score >= 0.30) rolled = 'uncommon'

  if (forceMinRarity) {
    return order.indexOf(rolled) < order.indexOf(forceMinRarity) ? forceMinRarity : rolled
  }
  return rolled
}

export function rollEquipmentAffixes(
  tier = 1,
  rarity: EquipmentRarity,
  rng: () => number = Math.random,
): ItemAffix[] {
  const count = EQUIPMENT_RARITY_META[rarity].affixCount
  if (count <= 0) return []
  const safeTier = Math.max(1, Math.min(6, tier))
  const pool = [...AFFIX_POOL]
  const chosen: ItemAffix[] = []

  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(0.999999, rng())) * pool.length))
    const picked = pool.splice(idx, 1)[0]
    const minVal = picked.minBase + (safeTier - 1) * picked.perTier
    const maxVal = picked.maxBase + (safeTier - 1) * picked.perTier * 1.4
    const val = Math.max(1, Math.round(minVal + Math.max(0, Math.min(1, rng())) * (maxVal - minVal)))
    chosen.push({ stat: picked.stat, value: val })
  }

  return chosen
}

export function formatAffixLabel(affix: ItemAffix): string {
  const meta = AFFIX_POOL.find((a) => a.stat === affix.stat)
  if (!meta) return `${affix.stat} +${affix.value}`
  return `${meta.label} +${affix.value}${meta.suffix}`
}

export function sanitizeAffixes(raw: unknown): ItemAffix[] {
  if (!Array.isArray(raw)) return []
  const validStats = new Set<AffixStat>(AFFIX_POOL.map((a) => a.stat))
  const out: ItemAffix[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const stat = (entry as { stat?: unknown }).stat
    const value = Number((entry as { value?: unknown }).value)
    if (typeof stat === 'string' && validStats.has(stat as AffixStat) && Number.isFinite(value) && value > 0) {
      out.push({ stat: stat as AffixStat, value: Math.min(9999, Math.round(value)) })
    }
    if (out.length >= 4) break
  }
  return out
}

export function aggregateEquipmentAffixes(
  equipment: Partial<Record<EquipmentSlot, { affixes?: ItemAffix[] } | null | undefined>>,
): {
  atkFlat: number
  defFlat: number
  hpFlat: number
  critBonus: number
  lifestealPct: number
  cdReducePct: number
  goldPct: number
  expPct: number
} {
  let atkFlat = 0
  let defFlat = 0
  let hpFlat = 0
  let critPct = 0
  let lifestealPct = 0
  let cdReducePct = 0
  let goldPct = 0
  let expPct = 0

  for (const item of Object.values(equipment)) {
    if (!item?.affixes) continue
    for (const af of item.affixes) {
      if (af.stat === 'atk_flat') atkFlat += af.value
      else if (af.stat === 'def_flat') defFlat += af.value
      else if (af.stat === 'hp_flat') hpFlat += af.value
      else if (af.stat === 'crit_pct') critPct += af.value
      else if (af.stat === 'lifesteal_pct') lifestealPct += af.value
      else if (af.stat === 'cd_reduce_pct') cdReducePct += af.value
      else if (af.stat === 'gold_pct') goldPct += af.value
      else if (af.stat === 'exp_pct') expPct += af.value
    }
  }

  return {
    atkFlat,
    defFlat,
    hpFlat,
    critBonus: Math.min(0.35, critPct / 100),
    lifestealPct: Math.min(0.25, lifestealPct / 100),
    cdReducePct: Math.min(0.35, cdReducePct / 100),
    goldPct,
    expPct,
  }
}

export function reforgeCost(tier = 1, currentRarity: EquipmentRarity): { gold: number; stones: number } {
  const rankMap: Record<EquipmentRarity, number> = {
    common: 1,
    uncommon: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
  }
  const r = rankMap[currentRarity]
  return {
    gold: Math.max(120, Math.round(150 * Math.max(1, tier) * r)),
    stones: Math.max(1, Math.min(4, Math.ceil(r / 2))),
  }
}

/* ========================================================================== */
/* 2. PARTY ROLE SYNERGY & CO-OP SUPPORT                                      */
/* ========================================================================== */

export type PartyRole = 'tank' | 'healer' | 'dps'

export interface PartyRoleSynergyResult {
  tanks: number
  healers: number
  dps: number
  hasTrinity: boolean
  atkPct: number
  defPct: number
  critBonus: number
  hpRegenPct: number
  labels: string[]
}

export function getJobRole(jobId: string): PartyRole {
  if (jobId === 'cleric') return 'healer'
  if (jobId === 'swordsman' || jobId === 'knight' || jobId === 'paladin' || jobId === 'templar' || jobId === 'iron_fist') {
    return 'tank'
  }
  return 'dps'
}

export function getJobRoleLabel(role: PartyRole): string {
  if (role === 'tank') return 'แทงค์ (Tank)'
  if (role === 'healer') return 'ซัพพอร์ต (Healer)'
  return 'ดาเมจ (DPS)'
}

export function computePartyRoleSynergy(
  party: PartyRecord | null | undefined,
  onlinePlayers: Array<{ userId: string; mapId?: string; jobId?: string }>,
  selfUid: string | null | undefined,
  selfJobId: string,
  currentMapId: string | null | undefined,
): PartyRoleSynergyResult {
  const empty: PartyRoleSynergyResult = {
    tanks: 0,
    healers: 0,
    dps: 0,
    hasTrinity: false,
    atkPct: 0,
    defPct: 0,
    critBonus: 0,
    hpRegenPct: 0,
    labels: [],
  }
  if (!party || !selfUid || !currentMapId) return empty

  const onlineMap = new Map(onlinePlayers.map((entry) => [entry.userId, entry]))
  let tanks = 0
  let healers = 0
  let dps = 0

  const selfRole = getJobRole(selfJobId)
  if (selfRole === 'tank') tanks++
  else if (selfRole === 'healer') healers++
  else dps++

  let sameMapMates = 0
  for (const memberId of party.memberIds) {
    if (memberId === selfUid) continue
    const live = onlineMap.get(memberId)
    const member = party.members[memberId]
    const mapId = live?.mapId ?? member?.mapId
    if (mapId !== currentMapId) continue
    sameMapMates++
    const role = getJobRole(live?.jobId ?? member?.jobId ?? 'novice')
    if (role === 'tank') tanks++
    else if (role === 'healer') healers++
    else dps++
  }

  if (sameMapMates === 0) return empty

  const hasTrinity = tanks > 0 && healers > 0 && dps > 0
  const labels: string[] = []
  let atkPct = 0
  let defPct = 0
  let critBonus = 0
  let hpRegenPct = 0

  if (tanks > 0) {
    defPct += 10
    labels.push('ปราการแทงค์ (DEF +10%)')
  }
  if (healers > 0) {
    hpRegenPct += 2
    labels.push('ออร่าฟื้นฟู (Regen +2% HP/2วิ)')
  }
  if (dps > 0) {
    atkPct += 8
    labels.push('ประสานจู่โจม (ATK +8%)')
  }
  if (hasTrinity) {
    atkPct += 12
    defPct += 10
    critBonus += 0.08
    labels.push('คอมโบไตรภาคี Trinity (ATK +12%, DEF +10%, CRIT +8%)')
  }

  return { tanks, healers, dps, hasTrinity, atkPct, defPct, critBonus, hpRegenPct, labels }
}

export function computeSupportSkillEffect(
  jobId: string,
  maxHp: number,
  atk: number,
): { kind: 'heal' | 'guard'; healAmount: number; defBuffPct: number; label: string } {
  const role = getJobRole(jobId)
  if (role === 'healer') {
    const healAmount = Math.max(40, Math.round(maxHp * 0.28 + atk * 0.9))
    return { kind: 'heal', healAmount, defBuffPct: 0, label: 'คลื่นแสงเยียวยาปาร์ตี้' }
  }
  if (role === 'tank') {
    const healAmount = Math.max(20, Math.round(maxHp * 0.12))
    return { kind: 'guard', healAmount, defBuffPct: 25, label: 'โล่พิทักษ์ร่วมทีม' }
  }
  return { kind: 'guard', healAmount: Math.max(15, Math.round(maxHp * 0.08)), defBuffPct: 10, label: 'ปลุกใจร่วมรบ' }
}

/* ========================================================================== */
/* 3. SHARED FIELD BOSSES PER MAP & WORLD BOSS SCHEDULE                       */
/* ========================================================================== */

export interface FieldBossSpec {
  mapId: 'meadow' | 'forest' | 'cave' | 'volcano'
  bossId: string
  name: string
  level: number
  element: ElementType
  maxHp: number
  def: number
  respawnSec: number
  rewardGold: number
  rewardDiamonds: number
  rewardStones: number
  color: string
}

export const FIELD_BOSS_SPECS: Record<FieldBossSpec['mapId'], FieldBossSpec> = {
  meadow: {
    mapId: 'meadow',
    bossId: 'fb_king_slime',
    name: 'ราชาสไลม์ทองคำ (บอสแมพทุ่งหญ้า)',
    level: 10,
    element: 'earth',
    maxHp: 6500,
    def: 12,
    respawnSec: 180,
    rewardGold: 900,
    rewardDiamonds: 6,
    rewardStones: 2,
    color: '#fbbf24',
  },
  forest: {
    mapId: 'forest',
    bossId: 'fb_elder_treant',
    name: 'พฤกษาโบราณต้องสาป (บอสแมพป่าสน)',
    level: 20,
    element: 'earth',
    maxHp: 16000,
    def: 24,
    respawnSec: 240,
    rewardGold: 1800,
    rewardDiamonds: 10,
    rewardStones: 3,
    color: '#4ade80',
  },
  cave: {
    mapId: 'cave',
    bossId: 'fb_crystal_golem',
    name: 'โกเลมคริสตัลยักษ์ (บอสแมพถ้ำมืด)',
    level: 32,
    element: 'earth',
    maxHp: 35000,
    def: 42,
    respawnSec: 300,
    rewardGold: 3200,
    rewardDiamonds: 15,
    rewardStones: 4,
    color: '#38bdf8',
  },
  volcano: {
    mapId: 'volcano',
    bossId: 'fb_ifrit_lord',
    name: 'อิฟรีทจ้าวอัคคี (บอสแมพภูเขาไฟ)',
    level: 45,
    element: 'fire',
    maxHp: 72000,
    def: 65,
    respawnSec: 360,
    rewardGold: 5500,
    rewardDiamonds: 25,
    rewardStones: 6,
    color: '#fb7185',
  },
}

export function getFieldBossForMap(mapId: string): FieldBossSpec | null {
  if (mapId === 'meadow' || mapId === 'forest' || mapId === 'cave' || mapId === 'volcano') {
    return FIELD_BOSS_SPECS[mapId]
  }
  return null
}

export interface WorldBossScheduleItem {
  cycleKey: string
  boss: WorldBossScheduleSpec
  startsAtMs: number
  endsAtMs: number
  startsInSec: number
  endsInSec: number
  isCurrent: boolean
}

export function getWorldBossScheduleList(nowMs = Date.now(), count = 4): WorldBossScheduleItem[] {
  const items: WorldBossScheduleItem[] = []
  const currentBucket = Math.floor(nowMs / 3600_000)

  for (let i = 0; i < count; i++) {
    const startsAtMs = (currentBucket + i) * 3600_000
    const endsAtMs = startsAtMs + 3600_000
    const boss = getActiveWorldBoss(startsAtMs + 1000)
    items.push({
      cycleKey: boss.cycleKey,
      boss,
      startsAtMs,
      endsAtMs,
      startsInSec: Math.max(0, Math.floor((startsAtMs - nowMs) / 1000)),
      endsInSec: Math.max(0, Math.floor((endsAtMs - nowMs) / 1000)),
      isCurrent: i === 0,
    })
  }

  return items
}

/* ========================================================================== */
/* 4. LIVE 1V1 PVP DUEL ENGINE                                                */
/* ========================================================================== */

export type DuelMoveType = 'attack' | 'skill' | 'guard' | 'potion'

export interface DuelFighterState {
  uid: string
  name: string
  jobId: string
  level: number
  maxHp: number
  hp: number
  atk: number
  def: number
  crit: number
  guarded: boolean
  potionUsed: boolean
}

export interface DuelMatchState {
  duelId: string
  status: 'pending' | 'active' | 'completed' | 'declined' | 'cancelled'
  challengerUid: string
  opponentUid: string
  turnNumber: number
  activeTurnUid: string
  fighters: Record<string, DuelFighterState>
  logs: string[]
  winnerUid: string | null
}

export function createDuelFighter(input: {
  uid: string
  name: string
  jobId: string
  level: number
  maxHp: number
  atk: number
  def: number
  crit: number
}): DuelFighterState {
  const maxHp = Math.max(80, Math.round(input.maxHp))
  return {
    uid: input.uid,
    name: input.name.slice(0, 24) || 'ผู้กล้า',
    jobId: input.jobId || 'novice',
    level: Math.max(1, Math.floor(input.level || 1)),
    maxHp,
    hp: maxHp,
    atk: Math.max(8, Math.round(input.atk || 10)),
    def: Math.max(1, Math.round(input.def || 3)),
    crit: Math.max(0.05, Math.min(0.75, Number(input.crit || 0.1))),
    guarded: false,
    potionUsed: false,
  }
}

export function resolveDuelTurn(
  match: DuelMatchState,
  actorUid: string,
  move: DuelMoveType,
  rng: () => number = Math.random,
): { ok: boolean; error?: string; next: DuelMatchState } {
  if (match.status !== 'active') {
    return { ok: false, error: 'การประลองยังไม่เริ่มหรือจบลงแล้ว', next: match }
  }
  if (match.activeTurnUid !== actorUid) {
    return { ok: false, error: 'ยังไม่ถึงเทิร์นของคุณ', next: match }
  }

  const targetUid = actorUid === match.challengerUid ? match.opponentUid : match.challengerUid
  const actor = match.fighters[actorUid]
  const target = match.fighters[targetUid]
  if (!actor || !target) {
    return { ok: false, error: 'ไม่พบข้อมูลคู่ประลอง', next: match }
  }

  const nextActor: DuelFighterState = { ...actor, guarded: false }
  const nextTarget: DuelFighterState = { ...target }
  const nextLogs = [...match.logs]

  if (move === 'potion') {
    if (actor.potionUsed) {
      return { ok: false, error: 'ใช้ยาฟื้นฟูครบโควต้า (1 ครั้ง/แมตช์) แล้ว', next: match }
    }
    const heal = Math.max(25, Math.round(actor.maxHp * 0.28))
    nextActor.hp = Math.min(nextActor.maxHp, nextActor.hp + heal)
    nextActor.potionUsed = true
    nextLogs.push(`เทิร์น ${match.turnNumber}: ${actor.name} ดื่มยาฟื้นฟู +${heal} HP`)
  } else if (move === 'guard') {
    nextActor.guarded = true
    nextLogs.push(`เทิร์น ${match.turnNumber}: ${actor.name} ตั้งโล่ป้องกัน (ลดดาเมจเทิร์นหน้า 55%)`)
  } else {
    const mult = move === 'skill' ? 1.55 : 1.0
    const isCrit = rng() < actor.crit
    const raw = (actor.atk * mult * (actor.atk * mult)) / Math.max(1, actor.atk * mult + target.def * 0.85)
    const variance = 0.92 + rng() * 0.16
    const guardMul = target.guarded ? 0.45 : 1
    const dmg = Math.max(5, Math.round(raw * variance * (isCrit ? 1.5 : 1) * guardMul))
    nextTarget.hp = Math.max(0, nextTarget.hp - dmg)
    nextTarget.guarded = false
    const moveLabel = move === 'skill' ? 'ใช้สกิลไม้ตาย' : 'โจมตี'
    nextLogs.push(
      `เทิร์น ${match.turnNumber}: ${actor.name} ${moveLabel} ใส่ ${target.name} ${dmg} ดาเมจ${isCrit ? ' [CRIT!]' : ''}${target.guarded ? ' [ป้องกัน]' : ''}`,
    )
  }

  const finished = nextTarget.hp <= 0
  const winnerUid = finished ? actorUid : null
  if (finished) {
    nextLogs.push(`★ ${actor.name} เป็นฝ่ายชนะการประลอง!`)
  }

  return {
    ok: true,
    next: {
      ...match,
      status: finished ? 'completed' : 'active',
      turnNumber: match.turnNumber + 1,
      activeTurnUid: finished ? actorUid : targetUid,
      fighters: {
        ...match.fighters,
        [actorUid]: nextActor,
        [targetUid]: nextTarget,
      },
      logs: nextLogs.slice(-24),
      winnerUid,
    },
  }
}

/* ========================================================================== */
/* 5. CHAT CHANNELS & BLOCK/MODERATION HELPERS                                */
/* ========================================================================== */

export type ChatChannel = 'all' | 'world' | 'map' | 'party' | 'trade'

export const CHAT_CHANNEL_META: Array<{ id: ChatChannel; label: string }> = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'world', label: 'โลก' },
  { id: 'map', label: 'แมพ' },
  { id: 'party', label: 'ปาร์ตี้' },
  { id: 'trade', label: 'ค้าขาย' },
]

export function filterBlockedMessages<T extends { senderUid?: string }>(
  messages: T[],
  blockedUids: string[] | undefined,
): T[] {
  if (!blockedUids || blockedUids.length === 0) return messages
  const blocked = new Set(blockedUids)
  return messages.filter((msg) => !msg.senderUid || !blocked.has(msg.senderUid))
}
