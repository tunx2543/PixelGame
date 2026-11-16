import {
  GM_ITEMS,
  ITEMS,
  JOBS,
  MAX_LEVEL,
  MAX_PLUS,
  MONSTERS,
  enhanceCost,
  enhanceRate,
  expToNext,
  type ItemDef,
  type JobDef,
  type SkillDef,
  type EquipmentSlot,
} from './data'
import { MAPS, MAP_ORDER, TILE, boxBlocked, isSolidPx, type MapDef, type NpcDef, type NpcRole } from './maps'
import { GEM_SHOP_ITEMS } from './gem-shop'
import type { Dir } from './sprites'
import { GM_ACTIVE_SKILLS } from './gm-sprite'
import { createClient } from '@/lib/supabase/client'
import { auth as firebaseAuth } from '@/lib/firebase/client'
import {
  deleteUserCharacter,
  ensureUserProfile,
  listUserCharacters,
  saveUserCharacter,
  type CloudCharacterRecord,
} from '@/lib/firebase/characters'
import type { PartyInviteRecord, PartyRecord } from '@/lib/firebase/party-helpers'
import { cancelTradeRequest, createBan, createTrade, publishAnnouncement, sendFriendRequest, sendWhisper } from './social'
import { isGmAccountUser, PERMANENT_GM_GAME_UID, PERMANENT_GM_UID } from './permissions'
import {
  applyLevelAndRewards,
  COMBAT_PETS,
  QUEST_DEFS,
  createDefaultPetState,
  createDefaultQuestState,
  createDefaultTowerState,
  getActivePetBonuses,
  getCombatPetDef,
  getQuestMetricValue,
  grantActivePetExp,
  isQuestClaimed,
  petFeedCost,
  recordQuestProgress,
  sanitizePetState,
  sanitizeQuestState,
  sanitizeTowerState,
  type PetState,
  type QuestState,
  type TowerState,
} from './systems'
import {
  MAX_MOUNT_LEVEL,
  createDefaultMountState,
  getActiveMountBonuses,
  getMountDef,
  mountUpgradeCost,
  sanitizeMountState,
  type MountState,
} from './mounts'
import {
  claimDailyMission,
  onDailyMissionCompleted,
  recordDailyMissionProgress,
} from './daily-missions'
import { pickNewerSave } from './save-sync'
import { getSkillVfxSpec, resolveRebirthAuraSpec, type SkillVfxStyle } from './vfx-specs'
import {
  BESTIARY_TIERS,
  CRAFT_RECIPES,
  DAILY_DUNGEONS,
  RUNE_DEFS,
  TITLE_DEFS,
  calculateDailyDungeonRewards,
  calculateDismantleYield,
  canCraftRecipe,
  computeBestiaryAndTitleBonuses,
  computeEquipmentSetBonuses,
  computeRuneBonuses,
  createDefaultRpgExt,
  evaluateUnlockedTitleIds,
  getActiveWorldBoss,
  getAttackElement,
  getElementMultiplier,
  getGuildBuffs,
  getMonsterElement,
  recordBestiaryKillInState,
  sanitizeRpgExt,
  todayIsoDate,
  type DailyDungeonId,
  type RpgExtensionState,
} from './rpg-systems'
import {
  BATTLE_PASS_TIERS,
  BEGINNER_GUIDE_STEPS,
  BP_EXP_PER_LEVEL,
  BP_MAX_LEVEL,
  BP_PREMIUM_DIAMOND_COST,
  COSMETIC_DEFS,
  FOOD_BUFF_DEFS,
  GATHERING_NODES,
  LIFE_SKILL_META,
  MAX_LOADOUTS,
  MAX_SKILL_UPGRADE,
  TALENT_NODES,
  calculateOfflineAfkRewards,
  computeTalentBonuses,
  createDefaultExtV2,
  findNearbyGatheringNode,
  getActiveFoodBuffBonuses,
  getCosmeticDef,
  getFoodBuffForItem,
  getWorldTimePhase,
  grantBattlePassExpToState,
  isItemListableOnMarket,
  lifeSkillExpToNext,
  rollGatheringDrops,
  sanitizeExtV2,
  skillUpgradeCost,
  type CosmeticSlot,
  type OfflineAfkSummary,
  type PlayerExtensionV2,
} from './extended-systems'
import { MAX_PET_STARS, petEvolveCost } from './systems'
import { stopBgm, syncBgmForMap } from './bgm'
import {
  EQUIPMENT_RARITY_META,
  aggregateEquipmentAffixes,
  computeSupportSkillEffect,
  reforgeCost,
  resolveEffectiveRarity,
  rollEquipmentAffixes,
  rollEquipmentRarity,
  sanitizeAffixes,
  type ChatChannel,
  type EquipmentRarity,
  type ItemAffix,
} from './mmo-systems'

if (typeof window !== 'undefined') {
  onDailyMissionCompleted((mission) => {
    if (game.p) {
      say('loot', `★ สำเร็จภารกิจรายวัน: "${mission.title}" — เปิดเมนูเควสต์เพื่อรับรางวัล!`)
      notify()
    }
  })
}

export const SAVE_KEY = 'pixel-rpg-save-v1'
const GM_UNLOCK = '/openmodgm24156'

const ACTIVE_SLOT_STORAGE_KEY = 'pixel-rpg-active-slot'
let activeAccountUserId: string | null = null
let activeAccountUid: number | undefined
let activeAccountGameUid: string | undefined
let activeAccountIsGm = false
let activeCharacterSlot =
  typeof window !== 'undefined' ? (localStorage.getItem(ACTIVE_SLOT_STORAGE_KEY) || 'slot_1') : 'slot_1'
let pendingGameUid: { userId: string; promise: Promise<number | undefined> } | null = null
let pendingCloudSavePromise: Promise<void> | null = null

export function isCurrentAccountGm(): boolean {
  const fbUser = firebaseAuth.currentUser
  if (fbUser) return isGmAccountUser(fbUser)
  return false
}

export function getActiveAccountGameUid(): string | undefined {
  if (isCurrentAccountGm()) return PERMANENT_GM_GAME_UID
  return activeAccountGameUid
}

export function setActiveCharacterSlot(slotId: string) {
  activeCharacterSlot = slotId || 'slot_1'
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ACTIVE_SLOT_STORAGE_KEY, activeCharacterSlot)
    } catch {
      // Ignore storage quota issues.
    }
  }
}

export function getActiveCharacterSlot() {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(ACTIVE_SLOT_STORAGE_KEY)
    if (stored) activeCharacterSlot = stored
  }
  return activeCharacterSlot
}

function localSaveKey() {
  if (!activeAccountUserId) return SAVE_KEY
  return activeCharacterSlot === 'slot_1'
    ? `${SAVE_KEY}:user:${activeAccountUserId}`
    : `${SAVE_KEY}:user:${activeAccountUserId}:${activeCharacterSlot}`
}

function claimLegacySave(userId: string): SaveData | null {
  if (typeof window === 'undefined') return null
  try {
    const accountKey = `${SAVE_KEY}:user:${userId}`
    const claimedByKey = `${SAVE_KEY}:legacy-claimed-by`
    const claimedBy = localStorage.getItem(claimedByKey)
    if (claimedBy && claimedBy !== userId) return null
    if (localStorage.getItem(accountKey)) return readSave()

    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const legacySave = JSON.parse(raw) as SaveData
    if (!legacySave || legacySave.version !== 1 || typeof legacySave.name !== 'string') return null

    localStorage.setItem(accountKey, raw)
    localStorage.setItem(claimedByKey, userId)
    return legacySave
  } catch {
    return null
  }
}

export function setGameAccountIdentity(
  userId: string | null,
  uid?: number,
  gameUid?: string,
  isGm?: boolean,
) {
  if (activeAccountUserId !== userId) {
    activeAccountUid = undefined
    activeAccountGameUid = undefined
    activeAccountIsGm = false
  }
  activeAccountUserId = userId
  if (uid !== undefined) activeAccountUid = uid
  if (gameUid !== undefined) {
    activeAccountGameUid = gameUid
    const parsed = Number(gameUid)
    if (Number.isSafeInteger(parsed)) activeAccountUid = parsed
  }
  if (isGm !== undefined) {
    activeAccountIsGm = isGm
  } else if (userId && firebaseAuth.currentUser?.uid === userId) {
    activeAccountIsGm = isGmAccountUser(firebaseAuth.currentUser)
    if (activeAccountIsGm) {
      activeAccountGameUid = PERMANENT_GM_GAME_UID
      activeAccountUid = PERMANENT_GM_UID
    }
  }
}

export async function resolveGameUid(userId: string): Promise<number | undefined> {
  setGameAccountIdentity(userId)
  const fbUser = firebaseAuth.currentUser
  if (fbUser && fbUser.uid === userId) {
    try {
      const identity = await ensureUserProfile(fbUser)
      const numericUid = Number(identity.gameUid)
      setGameAccountIdentity(
        userId,
        Number.isSafeInteger(numericUid) ? numericUid : undefined,
        identity.gameUid,
        identity.isGm,
      )
      return Number.isSafeInteger(numericUid) ? numericUid : undefined
    } catch {
      // Fall through cleanly if Firestore profile read is unavailable.
    }
  }
  if (activeAccountUid !== undefined) return activeAccountUid
  if (pendingGameUid?.userId === userId) return pendingGameUid.promise

  const promise = (async () => {
    try {
      const { data, error } = await createClient().rpc('get_or_create_game_uid')
      if (error || typeof data !== 'number' || !Number.isSafeInteger(data) || data < 0) return undefined
      if (activeAccountUserId === userId) activeAccountUid = data
      return data
    } catch {
      return undefined
    }
  })()
  pendingGameUid = { userId, promise }

  try {
    return await promise
  } finally {
    if (pendingGameUid?.promise === promise) pendingGameUid = null
  }
}
export const INV_SIZE = 40
export const STORAGE_SIZE = 60

export interface InvItem {
  uid: string
  itemId: string
  qty: number
  plus: number
  rarity?: EquipmentRarity
  affixes?: ItemAffix[]
  bound?: boolean
}

export interface SaveData {
  version: 1
  name: string
  jobId: string
  level: number
  exp: number
  hp: number
  mp: number
  gold: number
  diamonds: number
  ownedGemItems: string[]
  equippedGemFashion: string | null
  equippedGemCompanion: string | null
  lootMagnetUntil: number
  inventoryCapacityBonus: number
  inventory: InvItem[]
  storage: InvItem[]
  storageGold: number
  equipment: Record<EquipmentSlot, InvItem | null>
  mapId: string
  x: number
  y: number
  gm: boolean
  uid?: number
  gameUid?: string
  god: boolean
  invisible?: boolean
  speed: number
  playTime: number
  kills: number
  savedAt: number
  statPoints?: number
  skillPoints?: number
  skillLevels?: Record<string, number>
  rebirthCount?: number
  rebirthBonus?: { maxHp: number; maxMp: number; atk: number; def: number }
  petState?: PetState
  mountState?: MountState
  questState?: QuestState
  towerState?: TowerState
  rpgExt?: RpgExtensionState
  extV2?: PlayerExtensionV2
  blockedUids?: string[]
  appliedTradeIds?: string[]
}

export interface RemotePlayer {
  userId: string
  uid: number
  gameUid?: string
  displayName: string
  classId: string
  jobId: string
  mapId: string
  x: number
  y: number
  level: number
  gm: boolean
  facing: Dir
  moving: boolean
  status?: 'town' | 'idle' | 'moving' | 'combat'
  attackAnim: number
  invisible: boolean
  lastSeen: number
  previousX?: number
  previousY?: number
  receivedAt?: number
}

export interface Monster {
  uid: string
  defId: string
  x: number
  y: number
  homeX: number
  homeY: number
  hp: number
  maxHp: number
  dead: boolean
  respawnAt: number
  provoked: boolean
  attackCd: number
  hitFlash: number
  lunge: number
  vx: number
  vy: number
  wanderT: number
  flip: boolean
  moving: boolean
  animT: number
  dyingT?: number
  isWorldBoss?: boolean
  worldBossName?: string
}

export interface FloatText {
  x: number
  y: number
  text: string
  color: string
  life: number
  max: number
  size: number
}

export interface GroundDrop {
  uid: string
  itemId: string
  qty: number
  x: number
  y: number
  ownerId: string
  expiresAt: number
}

export interface Effect {
  type: 'slash' | 'ring' | 'burst' | 'levelup' | 'spark'
  x: number
  y: number
  r: number
  color: string
  life: number
  max: number
  angle?: number
  vfxStyle?: SkillVfxStyle
  secondaryColor?: string
  sourceX?: number
  sourceY?: number
}

interface Projectile {
  x: number
  y: number
  targetUid: string
  speed: number
  color: string
  size: number
  mults: number[]
  aoe: number
  delay: number
  flatDmg?: number
  skillId?: string
}

export type PanelId = 'shop' | 'gem-shop' | 'enhance' | 'job' | 'storage' | 'character' | 'gacha' | 'rebirth' | 'friends' | 'trade' | 'inventory' | 'gm-summon' | 'dev-tools' | 'pets' | 'quests' | 'models' | 'craft' | 'codex' | 'guild' | 'arena' | 'dungeon' | 'market' | 'mail' | 'pass' | 'lifeskills' | 'talents' | 'wardrobe' | 'guide'
export type ChatType = 'system' | 'player' | 'gm' | 'loot' | 'error' | 'npc'
export interface ChatMsg {
  id: number
  type: ChatType
  text: string
  author?: string
  channel?: Exclude<ChatChannel, 'all'>
  senderUid?: string
  senderGameUid?: string
}

export const game = {
  p: null as SaveData | null,
  monsters: [] as Monster[],
  groundDrops: [] as GroundDrop[],
  remotePlayers: [] as RemotePlayer[],
  onlinePlayers: [] as RemotePlayer[],
  presenceError: null as string | null,
  floats: [] as FloatText[],
  autoFarm: false,
  autoSkills: false,
  autoSkillIndex: 0,
  effects: [] as Effect[],
  projectiles: [] as Projectile[],
  chat: [] as ChatMsg[],
  chatChannel: 'all' as ChatChannel,
  panel: null as PanelId | null,
  socialMenuOpen: false,
  onlinePanelOpen: false,
  partyPanelOpen: false,
  party: null as PartyRecord | null,
  partyInvites: [] as PartyInviteRecord[],
  partySameMapCount: 0,
  partyExpMul: 1,
  partyGoldMul: 1,
  partyRoleBuffs: {
    tanks: 0,
    healers: 0,
    dps: 0,
    hasTrinity: false,
    atkPct: 0,
    defPct: 0,
    critBonus: 0,
    hpRegenPct: 0,
    labels: [] as string[],
  },
  partySupportCd: 0,
  keys: new Set<string>(),
  attackHeld: false,
  facing: 'down' as Dir,
  moving: false,
  walkT: 0,
  attackCd: 0,
  attackAnim: 0,
  skillAnim: 0,
  skillAnimMax: 0.55,
  skillVfxColor: '#38bdf8',
  petAttackCd: 0,
  petAttackAnim: 0,
  skillCd: {} as Record<string, number>,
  bubble: null as null | { text: string; until: number },
  announcement: null as null | { body: string; authorId: string; until: number },
  lootToast: null as null | { itemId: string; until: number },
  killToasts: [] as Array<{
    id: number
    kind: 'kill' | 'pickup'
    monsterName: string
    isBoss: boolean
    gold: number
    exp: number
    items: Array<{ itemId: string; qty: number }>
    until: number
  }>,
  socialTargetId: null as string | null,
  socialTargetMeta: null as null | { userId: string; displayName: string; gameUid?: string },
  inspectTarget: null as null | { userId: string; displayName: string; gameUid?: string },
  activeDuelId: null as string | null,
  duelTarget: null as null | { userId: string; displayName: string },
  tradeTargetId: null as string | null,
  tradeId: null as string | number | null,
  nearNpc: null as NpcDef | null,
  time: 0,
  regenT: 0,
  saveT: 0,
  persist: false,
  combatT: 99,
  lastSavedAt: 0,
  lastWarnAt: 0,
  guardCd: 0,
  guardUntil: 0,
  dashCd: 0,
  invulnUntil: 0,
  gatherCd: 0,
  comboCount: 0,
  comboUntil: 0,
  ultimateCharge: 0,
  offlineAfkReward: null as OfflineAfkSummary | null,
  invasion: null as null | { active: boolean; wave: number; maxWaves: number; rewardDiamonds: number },
  zenHud: false,
  version: 0,
}

export type KillRewardToastItem = (typeof game.killToasts)[number]

let killToastSeq = 0

export function pushKillToast(toast: Omit<KillRewardToastItem, 'id' | 'until'> & { duration?: number }) {
  const duration = toast.duration ?? 3.4
  const entry: KillRewardToastItem = {
    id: ++killToastSeq,
    kind: toast.kind,
    monsterName: toast.monsterName,
    isBoss: toast.isBoss,
    gold: toast.gold,
    exp: toast.exp,
    items: toast.items,
    until: game.time + duration,
  }
  game.killToasts = [entry, ...game.killToasts].slice(0, 3)
  notify()
}

export function dismissKillToast(id: number) {
  const next = game.killToasts.filter((t) => t.id !== id)
  if (next.length !== game.killToasts.length) {
    game.killToasts = next
    notify()
  }
}

/* ---------------- store ---------------- */

const listeners = new Set<() => void>()
export function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export function getVersion() {
  return game.version
}
export function notify() {
  game.version++
  listeners.forEach((l) => l())
}

/* ---------------- helpers ---------------- */

const uid = () => Math.random().toString(36).slice(2, 10)
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1))

export function player() {
  return game.p!
}
export function currentMap(): MapDef {
  return MAPS[game.p?.mapId ?? 'town'] ?? MAPS.town
}
export function currentJob(): JobDef {
  return JOBS[game.p?.jobId ?? 'novice'] ?? JOBS.novice
}

export function itemPower(it: InvItem | null) {
  if (!it) return 0
  const def = ITEMS[it.itemId]
  if (!def) return 0
  const base = def.atk ?? def.def ?? 0
  return Math.floor(base * (1 + it.plus * 0.12) + it.plus * 2)
}

export function getStats(p: SaveData = game.p!) {
  const job = JOBS[p.jobId] ?? JOBS.novice
  const L = p.level
  const wAtk = itemPower(p.equipment.weapon)
  const aDef = (['armor', 'shoes', 'cloak', 'accessory'] as const).reduce((total, slot) => total + itemPower(p.equipment[slot]), 0)
  const petBonus = getActivePetBonuses(p.petState, p.equippedGemCompanion, p.ownedGemItems)
  const mountBonus = getActiveMountBonuses(p.mountState, p.ownedGemItems)
  const ext = sanitizeRpgExt(p.rpgExt)
  const codexBonus = computeBestiaryAndTitleBonuses(ext)
  const runeBonus = computeRuneBonuses(ext)
  const setBonus = computeEquipmentSetBonuses(p.equipment)
  const affixBonus = aggregateEquipmentAffixes(p.equipment)
  const guildBuff = ext.guildId ? getGuildBuffs(ext.guildLevel) : null
  const extV2 = sanitizeExtV2(p.extV2)
  const talentBonus = computeTalentBonuses(extV2.talents)
  const foodBuff = getActiveFoodBuffBonuses(extV2.activeFoodBuff)
  const roleSynergy = p === game.p ? game.partyRoleBuffs : { atkPct: 0, defPct: 0, critBonus: 0 }

  const baseHp =
    Math.floor((80 + L * 22) * job.hpMul + aDef * 2) +
    (p.rebirthBonus?.maxHp ?? 0) +
    (petBonus?.hpBonus ?? 0) +
    (mountBonus?.hpBonus ?? 0) +
    codexBonus.hpBonus +
    runeBonus.hpBonus +
    setBonus.hpBonus +
    affixBonus.hpFlat
  const baseAtk =
    Math.floor((8 + L * 2.6 + wAtk) * job.atkMul) +
    (p.rebirthBonus?.atk ?? 0) +
    (petBonus?.atkBonus ?? 0) +
    (mountBonus?.atkBonus ?? 0) +
    codexBonus.atkBonus +
    runeBonus.atkBonus +
    setBonus.atkBonus +
    affixBonus.atkFlat
  const baseDef =
    Math.floor((3 + L * 1.4) * job.defMul + aDef) +
    (p.rebirthBonus?.def ?? 0) +
    (petBonus?.defBonus ?? 0) +
    (mountBonus?.defBonus ?? 0) +
    codexBonus.defBonus +
    runeBonus.defBonus +
    setBonus.defBonus +
    affixBonus.defFlat

  const rawHp = Math.round(baseHp * (1 + talentBonus.hpPct / 100))
  const rawAtk = Math.round(baseAtk * (1 + (talentBonus.atkPct + foodBuff.atkPct + roleSynergy.atkPct) / 100))
  const rawDef = Math.round(baseDef * (1 + (talentBonus.defPct + foodBuff.defPct + roleSynergy.defPct) / 100))
  const mountSpeedMul = mountBonus?.mounted
    ? mountBonus.speedMul
    : p.equippedGemCompanion === 'aurora_cloud_dragon'
      ? 1.2
      : 1

  return {
    maxHp: rawHp,
    maxMp: Math.floor((30 + L * 7) * job.mpMul) + (p.rebirthBonus?.maxMp ?? 0) + (petBonus?.mpBonus ?? 0),
    atk: guildBuff ? Math.round(rawAtk * (1 + guildBuff.atkPct / 100)) : rawAtk,
    def: guildBuff ? Math.round(rawDef * (1 + guildBuff.defPct / 100)) : rawDef,
    speed:
      72 *
      job.speedMul *
      (p.speed || 1) *
      mountSpeedMul *
      (1 + talentBonus.speedPct / 100),
    crit: Math.min(
      0.85,
      job.crit +
        codexBonus.critBonus +
        runeBonus.critBonus +
        setBonus.critBonus +
        talentBonus.critBonus +
        foodBuff.critBonus +
        affixBonus.critBonus +
        roleSynergy.critBonus,
    ),
    attackSpeed: job.attackSpeed,
    lifestealPct: runeBonus.lifestealPct + talentBonus.lifestealPct + affixBonus.lifestealPct,
    cdReducePct: affixBonus.cdReducePct,
    affixGoldPct: affixBonus.goldPct,
    affixExpPct: affixBonus.expPct,
  }
}

let chatId = 0
export function say(
  type: ChatType,
  text: string,
  author?: string,
  meta?: { channel?: Exclude<ChatChannel, 'all'>; senderUid?: string; senderGameUid?: string },
) {
  game.chat.push({ id: ++chatId, type, text, author, ...meta })
  if (game.chat.length > 180) game.chat.splice(0, game.chat.length - 180)
}

function addFloat(x: number, y: number, text: string, color: string, size = 10) {
  game.floats.push({ x: x + rand(-4, 4), y, text, color, life: 1, max: 1, size })
}

function addEffect(e: Omit<Effect, 'life'>) {
  game.effects.push({ ...e, life: e.max })
}

/* ---------------- inventory ---------------- */

function stackable(def: ItemDef) {
  return def.kind === 'consumable' || def.kind === 'material'
}

export function getInventoryCapacity(p: SaveData) {
  const bonus = Math.max(0, Math.min(60, Math.floor((p.inventoryCapacityBonus ?? 0) / 20) * 20))
  return INV_SIZE + bonus
}

export function addItem(
  itemId: string,
  qty = 1,
  plus = 0,
  list?: InvItem[],
  cap?: number,
  options?: { rarity?: EquipmentRarity; affixes?: ItemAffix[]; bound?: boolean; rollAffix?: boolean },
): boolean {
  const p = player()
  const target = list ?? p.inventory
  const maxSlots = cap ?? (target === p.inventory ? getInventoryCapacity(p) : INV_SIZE)
  const def = ITEMS[itemId]
  if (!def || qty <= 0) return false
  if (stackable(def)) {
    const s = target.find((i) => i.itemId === itemId)
    if (s) {
      s.qty += qty
      return true
    }
    if (target.length >= maxSlots) return false
    target.push({ uid: uid(), itemId, qty, plus: 0 })
    return true
  }
  const shouldRoll =
    options?.rollAffix !== false &&
    options?.rarity === undefined &&
    options?.affixes === undefined &&
    !def.gmOnly
  for (let i = 0; i < qty; i++) {
    if (target.length >= maxSlots) return false
    const rarity = options?.rarity ?? (shouldRoll ? rollEquipmentRarity(def.tier ?? 1) : resolveEffectiveRarity(undefined, def))
    const affixes = options?.affixes
      ? sanitizeAffixes(options.affixes)
      : shouldRoll
        ? rollEquipmentAffixes(def.tier ?? 1, rarity)
        : []
    target.push({
      uid: uid(),
      itemId,
      qty: 1,
      plus,
      rarity,
      affixes,
      bound: Boolean(options?.bound),
    })
  }
  return true
}

export function countItem(itemId: string) {
  return player()
    .inventory.filter((i) => i.itemId === itemId)
    .reduce((s, i) => s + i.qty, 0)
}

function removeItemId(itemId: string, qty: number) {
  const inv = player().inventory
  let left = qty
  for (let i = inv.length - 1; i >= 0 && left > 0; i--) {
    if (inv[i].itemId !== itemId) continue
    const take = Math.min(left, inv[i].qty)
    inv[i].qty -= take
    left -= take
    if (inv[i].qty <= 0) inv.splice(i, 1)
  }
  return left === 0
}

function removeUid(list: InvItem[], id: string, qty: number) {
  const idx = list.findIndex((i) => i.uid === id)
  if (idx < 0) return null
  const it = list[idx]
  const take = Math.min(qty, it.qty)
  it.qty -= take
  if (it.qty <= 0) list.splice(idx, 1)
  return { ...it, qty: take }
}

function clampVitals() {
  const p = player()
  const s = getStats()
  p.hp = Math.min(p.hp, s.maxHp)
  p.mp = Math.min(p.mp, s.maxMp)
}

export function canEquip(it: InvItem): string | null {
  const def = ITEMS[it.itemId]
  if (!def) return 'ไม่พบข้อมูลไอเทม'
  const p = player()
  if (def.kind !== 'weapon' && def.kind !== 'armor') return 'ไอเทมนี้สวมใส่ไม่ได้'
  if ((def.reqLevel ?? 1) > p.level) return `ต้องการเลเวล ${def.reqLevel}`
  if (def.kind === 'weapon' && (!def.weaponType || !currentJob().weaponTypes.includes(def.weaponType))) return `อาชีพ ${currentJob().name} ใช้อาวุธนี้ไม่ได้`
  if (def.allowedJobs?.length && !def.allowedJobs.includes(currentJob().id)) return `อาชีพ ${currentJob().name} สวมใส่ไอเทมนี้ไม่ได้`
  return null
}

export function equip(id: string) {
  const p = player()
  const it = p.inventory.find((i) => i.uid === id)
  if (!it) return
  const def = ITEMS[it.itemId]
  if (!def) return
  const err = canEquip(it)
  if (err) {
    say('error', err)
    notify()
    return
  }
  const slot: EquipmentSlot = def.slot ?? (def.kind === 'weapon' ? 'weapon' : 'armor')
  p.inventory = p.inventory.filter((i) => i.uid !== id)
  const prev = p.equipment[slot]
  if (prev) p.inventory.push(prev)
  p.equipment[slot] = it
  clampVitals()
  say('system', `สวมใส่ ${itemLabel(it)}`)
  notify()
}

export function unequip(slot: EquipmentSlot) {
  const p = player()
  const it = p.equipment[slot]
  if (!it) return
  if (p.inventory.length >= getInventoryCapacity(p)) {
    say('error', 'กระเป๋าเต็ม')
    notify()
    return
  }
  p.inventory.push(it)
  p.equipment[slot] = null
  clampVitals()
  notify()
}

export function itemLabel(it: InvItem) {
  const def = ITEMS[it.itemId]
  return `${def?.name ?? it.itemId}${it.plus > 0 ? ` +${it.plus}` : ''}`
}

export function consumeItem(id: string) {
  const p = player()
  const it = p.inventory.find((i) => i.uid === id)
  if (!it) return
  const def = ITEMS[it.itemId]
  if (!def) return
  if (def.kind === 'weapon' || def.kind === 'armor') return equip(id)
  if (def.kind !== 'consumable') return

  if (def.id === 'starlight_loot_magnet') {
    p.lootMagnetUntil = Math.max(Date.now(), p.lootMagnetUntil ?? 0) + 5 * 60 * 1000
    removeUid(p.inventory, id, 1)
    say('system', 'แม่เหล็กแสงดาวทำงาน 5 นาที — เก็บดรอปของคุณในระยะ 120 px')
    saveGame()
    notify()
    return
  }

  if (def.id === 'astral_bag_expansion') {
    if (p.inventoryCapacityBonus >= 60) {
      say('error', 'กระเป๋าเพิ่มช่องถึงขีดจำกัด +60 แล้ว')
      return notify()
    }
    removeUid(p.inventory, id, 1)
    p.inventoryCapacityBonus = Math.min(60, p.inventoryCapacityBonus + 20)
    say('system', `กระเป๋าเพิ่มเป็น ${getInventoryCapacity(p)} ช่องถาวร`)
    saveGame()
    notify()
    return
  }

  const foodDef = getFoodBuffForItem(def.id)
  if (foodDef) {
    const extV2 = sanitizeExtV2(p.extV2)
    extV2.activeFoodBuff = {
      itemId: foodDef.itemId,
      name: foodDef.name,
      expiresAtMs: Date.now() + foodDef.durationSec * 1000,
      atkPct: foodDef.atkPct,
      defPct: foodDef.defPct,
      critBonus: foodDef.critBonus,
      expMul: foodDef.expMul,
    }
    p.extV2 = extV2
    removeUid(p.inventory, id, 1)
    addFloat(p.x, p.y - 28, `${foodDef.name}!`, '#fbbf24', 10)
    say('system', `รับประทาน ${foodDef.name} (ATK +${foodDef.atkPct}% · DEF +${foodDef.defPct}% นาน ${Math.round(foodDef.durationSec / 60)} นาที)`)
    saveGame()
    notify()
    return
  }

  const s = getStats()
  if (def.heal) {
    p.hp = Math.min(s.maxHp, p.hp + def.heal)
    addFloat(p.x, p.y - 22, `+${def.heal}`, '#7ae582')
  }
  if (def.mana) {
    p.mp = Math.min(s.maxMp, p.mp + def.mana)
    addFloat(p.x, p.y - 22, `+${def.mana}`, '#4cc9f0')
  }
  removeUid(p.inventory, id, 1)
  if (def.id === 'return_scroll' || def.id === 'town_warp_tome') {
    const town = MAPS.town
    changeMap('town', town.spawn.x, town.spawn.y)
  }
  saveGame()
  notify()
}

export function drinkPotion(kind: 'hp' | 'mp') {
  const p = player()
  const s = getStats()
  const missing = kind === 'hp' ? s.maxHp - p.hp : s.maxMp - p.mp
  const potions = p.inventory
    .filter((i) => {
      const def = ITEMS[i.itemId]
      return Boolean(def && (kind === 'hp' ? def.heal : def.mana))
    })
    .sort((a, b) => {
      const va = (kind === 'hp' ? ITEMS[a.itemId]?.heal : ITEMS[a.itemId]?.mana) ?? 0
      const vb = (kind === 'hp' ? ITEMS[b.itemId]?.heal : ITEMS[b.itemId]?.mana) ?? 0
      return va - vb
    })
  if (!potions.length) {
    warn(kind === 'hp' ? 'ไม่มียาฟื้นฟู HP' : 'ไม่มียาฟื้นฟู MP')
    return
  }
  if (missing <= 0) return
  const pick =
    potions.find((i) => ((kind === 'hp' ? ITEMS[i.itemId]?.heal : ITEMS[i.itemId]?.mana) ?? 0) >= missing) ??
    potions[potions.length - 1]
  consumeItem(pick.uid)
}

export function potionCount(kind: 'hp' | 'mp') {
  return player()
    .inventory.filter((i) => {
      const def = ITEMS[i.itemId]
      return Boolean(def && (kind === 'hp' ? def.heal : def.mana))
    })
    .reduce((s, i) => s + i.qty, 0)
}

function warn(text: string) {
  if (game.time - game.lastWarnAt < 1) return
  game.lastWarnAt = game.time
  say('error', text)
}

/* ---------------- maps ---------------- */

function randomSpawnPoint(map: MapDef) {
  for (let t = 0; t < 300; t++) {
    const tx = randInt(3, map.width - 4)
    const ty = randInt(3, map.height - 4)
    const x = (tx + 0.5) * TILE
    const y = (ty + 0.7) * TILE
    if (boxBlocked(map, x, y, 6, 6)) continue
    const nearPortal = map.portals.some((pt) => Math.hypot(pt.x + pt.w / 2 - tx, pt.y + pt.h / 2 - ty) < 8)
    if (nearPortal) continue
    return { x, y }
  }
  return { x: map.width * 8, y: map.height * 8 }
}

function makeMonster(defId: string, x: number, y: number): Monster {
  const resolvedDefId = MONSTERS[defId] ? defId : 'slime'
  const def = MONSTERS[resolvedDefId]
  return {
    uid: uid(),
    defId: resolvedDefId,
    x,
    y,
    homeX: x,
    homeY: y,
    hp: def.hp,
    maxHp: def.hp,
    dead: false,
    respawnAt: 0,
    provoked: false,
    attackCd: 0,
    hitFlash: 0,
    lunge: 0,
    vx: 0,
    vy: 0,
    wanderT: rand(0, 2),
    flip: false,
    moving: false,
    animT: rand(0, 2),
  }
}

function earthBossSpawnPoint(map: MapDef) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const tx = randInt(8, 10)
    const ty = randInt(7, map.height - 7)
    const x = (tx + 0.5) * TILE
    const y = (ty + 0.7) * TILE
    if (boxBlocked(map, x, y, 6, 6)) continue
    const nearPortal = map.portals.some((portal) => Math.hypot(portal.x + portal.w / 2 - tx, portal.y + portal.h / 2 - ty) < 8)
    if (!nearPortal) return { x, y }
  }
  return randomSpawnPoint(map)
}

function populateMap() {
  const map = currentMap()
  game.monsters = []
  for (const s of map.spawns)
    for (let i = 0; i < s.count; i++) {
      const pt = map.id === 'cave' && s.monsterId === 'earth_golem'
        ? earthBossSpawnPoint(map)
        : randomSpawnPoint(map)
      game.monsters.push(makeMonster(s.monsterId, pt.x, pt.y))
    }
}

export function changeMap(mapId: string, tx: number, ty: number) {
  const p = player()
  const map = MAPS[mapId]
  if (!map) return
  p.mapId = mapId
  p.x = (tx + 0.5) * TILE
  p.y = (ty + 0.5) * TILE
  game.projectiles = []
  game.effects = []
  game.floats = []
  game.panel = null
  game.remotePlayers = game.onlinePlayers.filter((other) => !other.invisible && other.mapId === mapId)
  if (mapId !== 'town') game.invasion = null
  populateMap()
  syncBgmForMap(mapId, game.monsters.some((m) => !m.dead && Boolean(MONSTERS[m.defId]?.boss)))
  say('system', `เข้าสู่ ${map.name} (${map.levelLabel})`)
  saveGame()
  notify()
}

export function getMapMinLevel(map: MapDef): number {
  if (map.safe) return 1
  const match = map.levelLabel.match(/Lv\.?\s*(\d+)/i)
  return match ? Math.max(1, Number(match[1])) : 1
}

export function warpToMapLocation(
  mapId: string,
  worldX?: number,
  worldY?: number,
): { ok: boolean; message: string } {
  const p = game.p
  if (!p) return { ok: false, message: 'ยังไม่ได้เลือกตัวละคร' }
  const map = MAPS[mapId]
  if (!map) return { ok: false, message: 'ไม่พบแผนที่เป้าหมาย' }

  const minLv = getMapMinLevel(map)
  if (p.level < minLv && !isCurrentAccountGm()) {
    const msg = `แผนที่ ${map.name} ต้องการ Lv.${minLv}+ จึงจะวาร์ปตามได้`
    warn(msg)
    return { ok: false, message: msg }
  }

  let targetTx = map.spawn.x
  let targetTy = map.spawn.y
  if (typeof worldX === 'number' && typeof worldY === 'number' && Number.isFinite(worldX) && Number.isFinite(worldY)) {
    const baseTx = Math.max(1, Math.min(map.width - 2, Math.floor(worldX / TILE)))
    const baseTy = Math.max(1, Math.min(map.height - 2, Math.floor(worldY / TILE)))
    let found = false
    for (let radius = 0; radius <= 4 && !found; radius++) {
      for (let dy = -radius; dy <= radius && !found; dy++) {
        for (let dx = -radius; dx <= radius && !found; dx++) {
          const tx = baseTx + dx
          const ty = baseTy + dy
          if (tx < 1 || ty < 1 || tx >= map.width - 1 || ty >= map.height - 1) continue
          const px = (tx + 0.5) * TILE
          const py = (ty + 0.5) * TILE
          if (!boxBlocked(map, px, py)) {
            targetTx = tx
            targetTy = ty
            found = true
          }
        }
      }
    }
  }

  changeMap(mapId, targetTx, targetTy)
  game.partyPanelOpen = false
  addEffect({ type: 'ring', x: p.x, y: p.y, r: 22, color: '#4cc9f0', max: 0.45 })
  notify()
  return { ok: true, message: `วาร์ปตามปาร์ตี้ไปยัง ${map.name} แล้ว` }
}

/* ---------------- combat ---------------- */

const dmgFormula = (atk: number, def: number) => (atk * atk) / (atk + def)

function nearestMonster(range: number, fromX = player().x, fromY = player().y - 8) {
  let best: Monster | null = null
  let bd = Infinity
  for (const m of game.monsters) {
    if (m.dead) continue
    const d = Math.hypot(m.x - fromX, m.y - 6 - fromY)
    if (d <= range && d < bd) {
      bd = d
      best = m
    }
  }
  return best
}

function faceToward(x: number, y: number) {
  const p = player()
  const dx = x - p.x
  const dy = y - p.y
  game.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down'
}

function damageMonster(m: Monster, mult: number, skillId?: string) {
  if (m.dead) return
  const p = player()
  const s = getStats()
  const def = MONSTERS[m.defId]
  if (!def) return
  const gmStaff = p.equipment.weapon?.itemId === 'gm_golden_staff' && p.gm
  const atkElem = getAttackElement(skillId, p.rpgExt?.equippedRunes)
  const defElem = getMonsterElement(m.defId)
  const elemMatch = getElementMultiplier(atkElem, defElem)
  let dmg = gmStaff ? 9999999 : dmgFormula(s.atk * mult, def.def) * elemMatch.multiplier * rand(0.9, 1.1)
  const crit = !gmStaff && Math.random() < s.crit
  if (crit) dmg *= 1.6
  const amount = Math.max(1, Math.round(dmg))
  m.hp -= amount
  m.provoked = true
  m.hitFlash = 0.15
  game.combatT = 0
  game.comboCount += 1
  game.comboUntil = game.time + 5
  game.ultimateCharge = Math.min(100, game.ultimateCharge + (skillId ? 14 : 8))
  if (s.lifestealPct > 0 && p.hp < s.maxHp) {
    const heal = Math.max(1, Math.round((amount * s.lifestealPct) / 100))
    p.hp = Math.min(s.maxHp, p.hp + heal)
  }
  const color = crit ? '#ffd60a' : elemMatch.effectiveness === 'super' ? '#fb923c' : elemMatch.effectiveness === 'resist' ? '#94a3b8' : '#ffffff'
  const suffix = crit ? '!' : elemMatch.effectiveness === 'super' ? '▲' : ''
  addFloat(m.x, m.y - 20, `${amount}${suffix}`, color, crit ? 20 : 16)
  if (m.isWorldBoss) {
    recordWorldBossDamageAction(amount)
  }
  if (m.hp <= 0) killMonster(m)
}

function dropItem(itemId: string, qty: number, x: number, y: number) {
  const p = player()
  game.groundDrops.push({ uid: uid(), itemId, qty, x: x + rand(-5, 5), y: y + rand(-3, 3), ownerId: String(p.uid ?? p.name), expiresAt: game.time + 60 })
}

function collectGroundDrops() {
  const p = player()
  const ownerId = String(p.uid ?? p.name)
  const petBonus = getActivePetBonuses(p.petState, p.equippedGemCompanion, p.ownedGemItems)
  for (let i = game.groundDrops.length - 1; i >= 0; i--) {
    const drop = game.groundDrops[i]
    if (drop.expiresAt <= game.time) {
      game.groundDrops.splice(i, 1)
      continue
    }
    const gemPetRange = p.equippedGemCompanion === 'moonlight_firefly' ? 34 : p.equippedGemCompanion === 'gem_raccoon' ? 52 : p.equippedGemCompanion === 'aurora_cloud_dragon' ? 68 : 22
    const evolvePetRange = petBonus?.autoLootMagnet ? 96 : 22
    const petRange = Math.max(gemPetRange, evolvePetRange)
    const magnetRange = p.lootMagnetUntil > Date.now() ? 120 : 22
    if (drop.ownerId !== ownerId || Math.hypot(drop.x - p.x, drop.y - p.y) > Math.max(petRange, magnetRange)) continue
    if (!addItem(drop.itemId, drop.qty)) {
      warn('กระเป๋าเต็ม! เก็บไอเทมไม่ได้')
      continue
    }
    game.groundDrops.splice(i, 1)
    game.lootToast = { itemId: drop.itemId, until: game.time + 3 }
    pushKillToast({
      kind: 'pickup',
      monsterName: 'เก็บไอเทมสำเร็จ',
      isBoss: false,
      gold: 0,
      exp: 0,
      items: [{ itemId: drop.itemId, qty: drop.qty }],
      duration: 2.8,
    })
    say('loot', `เก็บ ${ITEMS[drop.itemId]?.name ?? drop.itemId} x${drop.qty}`)
    recordDailyMissionProgress({ itemsLooted: drop.qty })
  }
}

function killMonster(m: Monster) {
  const p = player()
  const def = MONSTERS[m.defId]
  if (!def) {
    m.dead = true
    m.hp = 0
    return
  }
  m.dead = true
  m.dyingT = 0.55
  m.hp = 0
  m.respawnAt = m.isWorldBoss || (game.invasion?.active && p.mapId === 'town') ? Infinity : game.time + (def.boss ? 90 : 10)
  p.kills++
  p.questState = recordQuestProgress(p.questState, { kills: 1, bossKills: def.boss || m.isWorldBoss ? 1 : 0 }, p.kills)
  p.rpgExt = recordBestiaryKillInState(p.rpgExt, m.defId, p)
  const petBonus = getActivePetBonuses(p.petState, p.equippedGemCompanion, p.ownedGemItems)
  const guildBuff = p.rpgExt?.guildId ? getGuildBuffs(p.rpgExt.guildLevel) : null
  const guildGoldMul = guildBuff ? 1 + guildBuff.goldPct / 100 : 1
  const guildExpMul = guildBuff ? 1 + guildBuff.expPct / 100 : 1
  const extV2 = sanitizeExtV2(p.extV2)
  const talentBonus = computeTalentBonuses(extV2.talents)
  const foodBuff = getActiveFoodBuffBonuses(extV2.activeFoodBuff)
  const worldPhase = getWorldTimePhase()
  const timeExpMul = 1 + worldPhase.expBonusPct / 100
  const jobGoldMul = 1 + (currentJob().goldBonus ?? 0)
  const bpRes = grantBattlePassExpToState(extV2.battlePass, def.boss || m.isWorldBoss ? 45 : 12)
  extV2.battlePass = bpRes.next
  p.extV2 = extV2
  if (bpRes.leveledUp) {
    say('loot', `★ Battle Pass เลื่อนเป็น Lv.${bpRes.next.level}! เปิดดูรางวัลได้เลย`)
  }
  addEffect({ type: 'burst', x: m.x, y: m.y - 6, r: def.boss || m.isWorldBoss ? 30 : 14, color: def.color, max: 0.4 })
  const baseGold = randInt(def.gold[0], def.gold[1])
  const gold = Math.round(
    baseGold *
      jobGoldMul *
      (petBonus?.goldMul ?? 1) *
      (game.partyGoldMul || 1) *
      guildGoldMul *
      talentBonus.goldMul *
      (1 + (getStats(p).affixGoldPct ?? 0) / 100),
  )
  const expGain = Math.round(
    def.exp *
      (petBonus?.expMul ?? 1) *
      (game.partyExpMul || 1) *
      guildExpMul *
      talentBonus.expMul *
      foodBuff.expMul *
      timeExpMul *
      (1 + (getStats(p).affixExpPct ?? 0) / 100),
  )
  p.gold += gold
  if (m.isWorldBoss) {
    p.diamonds = (p.diamonds ?? 0) + 15
    say('loot', `★ พิชิตบอสโลก ${m.worldBossName ?? def.name} บนแมพ! รับโบนัส +15 เพชร!`)
  }
  recordDailyMissionProgress({
    kills: 1,
    bossKills: def.boss || m.isWorldBoss ? 1 : 0,
    goldEarned: gold,
  })
  addFloat(m.x, m.y - 30, `+${gold}G`, '#f2c94c', 9)
  gainExp(expGain)
  if (p.petState?.activePetId) {
    const petRes = grantActivePetExp(p.petState, Math.max(4, Math.round(def.exp * 0.2)))
    p.petState = petRes.nextPetState
    if (petRes.leveledUp && petBonus) {
      say('system', `คู่หู ${petBonus.def.name} เลื่อนเป็น Lv.${petRes.newLevel}!`)
    }
  }

  const equipmentPool = [...new Map(
    Object.values(ITEMS)
      .filter((item) => (item.kind === 'weapon' || item.kind === 'armor') && !item.gmOnly)
      .map((item) => [item.id, item]),
  ).values()]
  const dynamicDrops = def.boss || m.isWorldBoss
    ? equipmentPool.map((item) => ({ itemId: item.id, chance: 0.001 }))
    : []
  const junkDrops = def.drops.filter((drop) => {
    const item = ITEMS[drop.itemId]
    return !item || (item.kind !== 'weapon' && item.kind !== 'armor')
  })
  const seen = new Set<string>()
  const droppedItems: Array<{ itemId: string; qty: number }> = []
  for (const d of [...junkDrops, ...dynamicDrops]) {
    if (seen.has(d.itemId)) continue
    seen.add(d.itemId)
    if (Math.random() < d.chance) {
      dropItem(d.itemId, 1, m.x, m.y)
      droppedItems.push({ itemId: d.itemId, qty: 1 })
      say('loot', `${ITEMS[d.itemId]?.name ?? d.itemId} ตกพื้น`)
    }
  }
  pushKillToast({
    kind: 'kill',
    monsterName: m.worldBossName ?? def.name,
    isBoss: Boolean(def.boss || m.isWorldBoss),
    gold,
    exp: expGain,
    items: droppedItems,
    duration: 3.4,
  })
  if (def.boss || m.isWorldBoss) say('system', `★ ${p.name} ได้ปราบ ${m.worldBossName ?? def.name} สำเร็จ! ★`)
}

export function gainExp(n: number) {
  const p = player()
  if (!Number.isFinite(n) || n <= 0) return
  if (p.level >= MAX_LEVEL) return
  const add = Math.floor(n)
  if (add <= 0) return
  p.exp += add
  addFloat(p.x, p.y - 34, `+${add} EXP`, '#c77dff', 9)
  const beforeStats = getStats()
  let leveled = false
  while (p.level < MAX_LEVEL && p.exp >= expToNext(p.level)) {
    p.exp -= expToNext(p.level)
    p.level++
    leveled = true
  }
  if (p.level >= MAX_LEVEL) p.exp = 0
  if (leveled) onLevelUp(beforeStats)
}

function onLevelUp(beforeStats: ReturnType<typeof getStats>) {
  const p = player()
  const s = getStats()
  p.hp = s.maxHp
  p.mp = s.maxMp
  p.statPoints = (p.statPoints ?? 0) + 3
  p.skillPoints = (p.skillPoints ?? 0) + 1
  p.skillLevels ??= {}
  const jobSkills = currentJob().skills
  const autoSkill = jobSkills.length > 0 ? jobSkills[(p.level - 1) % jobSkills.length] : undefined
  if (autoSkill) {
    p.skillLevels[autoSkill.id] = (p.skillLevels[autoSkill.id] ?? 1) + 1
    say('system', `${autoSkill.name} อัปเป็น Lv.${p.skillLevels[autoSkill.id]} อัตโนมัติ`)
  }
  addEffect({ type: 'levelup', x: p.x, y: p.y, r: 20, color: '#ffd60a', max: 1.2 })
  addFloat(p.x, p.y - 40, 'LEVEL UP!', '#ffd60a', 14)
  say('system', `ยินดีด้วย! เลเวลอัพเป็น Lv.${p.level}`)
  say('system', `ค่าสถานะเพิ่ม: HP +${s.maxHp - beforeStats.maxHp}, MP +${s.maxMp - beforeStats.maxMp}, ATK +${s.atk - beforeStats.atk}, DEF +${s.def - beforeStats.def}`)
  const next = Object.values(JOBS).find((j) => j.from === p.jobId && j.reqLevel === p.level)
  if (next) say('system', `คุณสามารถเปลี่ยนอาชีพได้แล้ว! ไปหา ปรมาจารย์อาร์ค ที่เมือง`)
  saveGame()
}

function projectileColor(job: JobDef) {
  if (job.weaponTypes.includes('staff')) return '#ff9f1c'
  return '#f1faee'
}

function shoot(t: Monster, mults: number[], color: string, size: number, aoe = 0, delay = 0, skillId?: string) {
  const p = player()
  game.projectiles.push({ x: p.x, y: p.y - 10, targetUid: t.uid, speed: 240, color, size, mults, aoe, delay, skillId })
}

export function basicAttack() {
  const p = game.p
  if (!p || game.attackCd > 0 || game.panel) return
  const job = currentJob()
  const t = nearestMonster(job.range + 6)
  game.attackCd = job.attackSpeed
  game.attackAnim = 0.28
  if (!t) return
  faceToward(t.x, t.y)
  if (job.ranged) shoot(t, [1], projectileColor(job), 2)
  else {
    damageMonster(t, 1)
    addEffect({ type: 'slash', x: t.x, y: t.y - 8, r: 10, color: '#ffffff', max: 0.18, angle: Math.random() * Math.PI })
  }
}

export function skillCooldown(skill: SkillDef) {
  return Math.max(0, game.skillCd[skill.id] ?? 0)
}

export function castSkill(index: number) {
  const p = game.p
  if (!p || game.panel) return
  const job = currentJob()
  if (job.id === 'gm' && p.gm && isCurrentAccountGm()) {
    const gmSkill = GM_ACTIVE_SKILLS[index]
    if (gmSkill) castGmSkill(gmSkill.skillKey)
    return
  }
  const skill = job.skills[index]
  if (!skill) return
  const skillLevel = p.skillLevels?.[skill.id] ?? 1
  const skillMult = skill.mult * (1 + (skillLevel - 1) * 0.08)
  const vfx = getSkillVfxSpec(skill.id, skill.color, skill.kind, job.weaponTypes[0])
  if (skillCooldown(skill) > 0) return
  if (p.mp < skill.mp) {
    warn('MP ไม่พอ!')
    return
  }
  if (skill.kind === 'heal') {
    const stats = getStats(p)
    if (p.hp >= stats.maxHp) {
      warn('HP เต็มแล้ว!')
      return
    }
    const recovered = Math.min(Math.floor(stats.maxHp * skillMult), stats.maxHp - p.hp)
    p.hp += recovered
    p.mp -= skill.mp
    const cdReduce = Math.max(0.4, 1 - (stats.cdReducePct ?? 0))
    game.skillCd[skill.id] = skill.cooldown * Math.max(0.65, 1 - (skillLevel - 1) * 0.05) * cdReduce
    game.attackAnim = 0.32
    game.skillAnim = 0.52
    game.skillAnimMax = 0.52
    game.skillVfxColor = vfx.primaryColor
    addEffect({
      type: 'ring',
      x: p.x,
      y: p.y - 6,
      r: 34,
      color: vfx.primaryColor,
      secondaryColor: vfx.secondaryColor,
      max: 0.65,
      vfxStyle: vfx.style,
    })
    addFloat(p.x, p.y - 30, `+${recovered} HP`, vfx.primaryColor)
    say('system', `${skill.name} ฟื้นฟู HP ${recovered}`)
    recordDailyMissionProgress({ skillsUsed: 1 })
    notify()
    return
  }
  const range = job.ranged ? job.range + 12 : skill.kind === 'aoe-target' ? 90 : job.range + 12
  if (skill.kind === 'aoe-self') {
    const r = skill.radius ?? 40
    addEffect({
      type: 'ring',
      x: p.x,
      y: p.y - 6,
      sourceX: p.x,
      sourceY: p.y - 6,
      r,
      color: vfx.primaryColor,
      secondaryColor: vfx.secondaryColor,
      max: 0.55,
      vfxStyle: vfx.style,
    })
      for (const m of game.monsters) if (!m.dead && Math.hypot(m.x - p.x, m.y - p.y) <= r) damageMonster(m, skillMult, skill.id)
  } else {
    const t = nearestMonster(range)
    if (!t) {
      warn('ไม่มีเป้าหมายในระยะ')
      return
    }
    faceToward(t.x, t.y)
    if (skill.kind === 'single') {
      if (job.ranged) {
        shoot(t, [skillMult], vfx.primaryColor, 4, 0, 0, skill.id)
        addEffect({
          type: 'burst',
          x: t.x,
          y: t.y - 8,
          sourceX: p.x,
          sourceY: p.y - 8,
          r: 22,
          color: vfx.primaryColor,
          secondaryColor: vfx.secondaryColor,
          max: 0.45,
          vfxStyle: vfx.style,
        })
      } else {
        damageMonster(t, skillMult, skill.id)
        addEffect({
          type: 'slash',
          x: t.x,
          y: t.y - 8,
          sourceX: p.x,
          sourceY: p.y - 8,
          r: 20,
          color: vfx.primaryColor,
          secondaryColor: vfx.secondaryColor,
          max: 0.36,
          angle: Math.random() * Math.PI,
          vfxStyle: vfx.style,
        })
      }
    } else if (skill.kind === 'multi') {
      const hits = skill.hits ?? 2
      if (job.ranged) {
        for (let i = 0; i < hits; i++) shoot(t, [skillMult], vfx.primaryColor, 2, 0, i * 0.1, skill.id)
      } else {
        for (let i = 0; i < hits; i++) {
          damageMonster(t, skillMult, skill.id)
        }
      }
      addEffect({
        type: 'slash',
        x: t.x,
        y: t.y - 8,
        sourceX: p.x,
        sourceY: p.y - 8,
        r: 20,
        color: vfx.primaryColor,
        secondaryColor: vfx.secondaryColor,
        max: 0.4,
        vfxStyle: vfx.style,
      })
    } else if (skill.kind === 'aoe-target') {
      const r = skill.radius ?? 48
      addEffect({
        type: 'burst',
        x: t.x,
        y: t.y - 6,
        sourceX: p.x,
        sourceY: p.y - 8,
        r,
        color: vfx.primaryColor,
        secondaryColor: vfx.secondaryColor,
        max: 0.65,
        vfxStyle: vfx.style,
      })
      for (const m of game.monsters) if (!m.dead && Math.hypot(m.x - t.x, m.y - t.y) <= r) damageMonster(m, skillMult, skill.id)
    }
  }
  p.mp -= skill.mp
  const cdReduce = Math.max(0.4, 1 - (getStats(p).cdReducePct ?? 0))
  game.skillCd[skill.id] = skill.cooldown * Math.max(0.65, 1 - (skillLevel - 1) * 0.05) * cdReduce
  game.attackAnim = 0.32
  game.skillAnim = 0.52
  game.skillAnimMax = 0.52
  game.skillVfxColor = vfx.primaryColor
  addFloat(p.x, p.y - 30, skill.name, vfx.primaryColor, 9)
  recordDailyMissionProgress({ skillsUsed: 1 })
}

export function triggerOpenWorldGuard() {
  const p = game.p
  if (!p || game.panel) return false
  if (game.guardCd > 0) return false
  game.guardCd = 3.5
  game.guardUntil = game.time + 1.25
  addEffect({ type: 'ring', x: p.x, y: p.y - 6, r: 22, color: '#60a5fa', max: 0.45 })
  addFloat(p.x, p.y - 28, 'GUARD!', '#60a5fa', 10)
  notify()
  return true
}

export function triggerDodgeDash() {
  const p = game.p
  if (!p || game.panel) return false
  if (game.dashCd > 0) return false
  const map = currentMap()
  const dirVec =
    game.facing === 'left' ? [-1, 0] : game.facing === 'right' ? [1, 0] : game.facing === 'up' ? [0, -1] : [0, 1]
  let moved = 0
  for (let step = 0; step < 6; step++) {
    const nx = p.x + dirVec[0] * 6
    const ny = p.y + dirVec[1] * 6
    if (!boxBlocked(map, nx, ny, 4, 3)) {
      p.x = nx
      p.y = ny
      moved += 6
    }
  }
  game.dashCd = 2.4
  game.invulnUntil = game.time + 0.55
  addEffect({ type: 'ring', x: p.x, y: p.y - 6, r: 18, color: '#22d3ee', max: 0.35 })
  addFloat(p.x, p.y - 28, moved > 0 ? 'DASH!' : 'EVADE!', '#22d3ee', 10)
  notify()
  return true
}

export function triggerUltimateSkill() {
  const p = game.p
  if (!p || game.panel) return false
  if (game.ultimateCharge < 100) {
    warn(`เกจท่าไม้ตายยังไม่เต็ม (${Math.round(game.ultimateCharge)}%)`)
    return false
  }
  const r = 110
  let hitCount = 0
  for (const m of game.monsters) {
    if (!m.dead && Math.hypot(m.x - p.x, m.y - p.y) <= r) {
      damageMonster(m, 5.2, 'ultimate_burst')
      hitCount += 1
    }
  }
  game.ultimateCharge = 0
  game.attackAnim = 0.45
  game.skillAnim = 0.68
  game.skillAnimMax = 0.68
  game.skillVfxColor = '#fbbf24'
  addEffect({ type: 'burst', x: p.x, y: p.y - 8, r, color: '#fbbf24', secondaryColor: '#f43f5e', vfxStyle: 'light_judgment', max: 0.9 })
  addFloat(p.x, p.y - 36, 'ULTIMATE!', '#fbbf24', 15)
  say('system', hitCount > 0 ? `★ ปลดปล่อยท่าไม้ตาย! โดนมอนสเตอร์ ${hitCount} ตัว` : '★ ปลดปล่อยท่าไม้ตายแห่งแสง!')
  notify()
  return true
}

export function toggleZenHud(force?: boolean) {
  game.zenHud = typeof force === 'boolean' ? force : !game.zenHud
  notify()
}

function hurtPlayer(rawAtk: number) {
  const p = player()
  game.combatT = 0
  if (game.invulnUntil > game.time) {
    addFloat(p.x, p.y - 24, 'DODGE!', '#22d3ee', 10)
    return
  }
  if (p.god) {
    addFloat(p.x, p.y - 22, 'GOD', '#ffd60a', 9)
    return
  }
  const s = getStats()
  const guarded = game.guardUntil > game.time
  const dmg = Math.max(1, Math.round(dmgFormula(rawAtk * 1.5, s.def) * (guarded ? 0.25 : 1) * rand(0.85, 1.15)))
  p.hp -= dmg
  addFloat(p.x, p.y - 22, guarded ? `-${dmg} [GUARD]` : `-${dmg}`, guarded ? '#60a5fa' : '#ff4d4d', 10)
  if (p.hp <= 0) die()
}

function die() {
  const p = player()
  const lost = p.level >= MAX_LEVEL ? 0 : Math.floor(expToNext(p.level) * 0.05)
  p.exp = Math.max(0, p.exp - lost)
  const s = getStats()
  p.hp = s.maxHp
  p.mp = s.maxMp
  say('error', `คุณถูกสังหาร! เสีย EXP ${lost} และถูกส่งกลับเมือง`)
  const town = MAPS.town
  changeMap('town', town.spawn.x, town.spawn.y)
}

/* ---------------- NPC systems ---------------- */

const ROLE_PANEL: Record<NpcRole, PanelId> = { shop: 'shop', enhance: 'enhance', job: 'job', storage: 'storage', gacha: 'gacha', rebirth: 'rebirth' }

export function interact() {
  if (!game.p) return false
  const npc = game.nearNpc
  if (npc) {
    game.keys.clear()
    game.panel = ROLE_PANEL[npc.role]
    say('npc', npc.greeting, npc.name)
    notify()
    return true
  }
  const node = findNearbyGatheringNode(game.p.mapId, game.p.x, game.p.y)
  if (node) {
    const res = gatherNearbyNodeAction(node.id)
    if (!res.ok) warn(res.message)
    return true
  }
  return false
}

export function rebirth() {
  const p = player()
  if (p.level < MAX_LEVEL) {
    say('error', `ต้องมีเลเวล ${MAX_LEVEL} จึงจะจุติได้`)
    notify()
    return false
  }
  if ((p.rebirthCount ?? 0) >= 6) {
    say('error', 'จุติครบสูงสุด 6 ครั้งแล้ว')
    notify()
    return false
  }
  const before = getStats(p)
  const baseHp = 80 + 22 + itemPower(p.equipment.armor) * 2
  const baseMp = 30 + 7
  const baseAtk = Math.floor(8 + 2.6 + itemPower(p.equipment.weapon))
  const baseDef = Math.floor(3 + 1.4 + itemPower(p.equipment.armor))
  p.rebirthBonus = {
    maxHp: Math.max(0, before.maxHp - baseHp),
    maxMp: Math.max(0, before.maxMp - baseMp),
    atk: Math.max(0, before.atk - baseAtk),
    def: Math.max(0, before.def - baseDef),
  }
  p.rebirthCount = (p.rebirthCount ?? 0) + 1
  p.jobId = 'novice'
  p.level = 1
  p.exp = 0
  p.hp = baseHp + p.rebirthBonus.maxHp
  p.mp = baseMp + p.rebirthBonus.maxMp
  const spawn = MAPS.town.spawn
  changeMap('town', spawn.x, spawn.y)
  const rebirthAura = resolveRebirthAuraSpec(p.rebirthCount)
  game.effects.push({
    type: 'levelup',
    x: p.x,
    y: p.y,
    r: 38,
    color: rebirthAura.primaryColor,
    secondaryColor: rebirthAura.secondaryColor,
    life: 3,
    max: 3,
  })
  game.effects.push({
    type: 'burst',
    x: p.x,
    y: p.y - 6,
    r: 44,
    color: rebirthAura.primaryColor,
    secondaryColor: rebirthAura.secondaryColor,
    vfxStyle: 'light_judgment',
    life: 1.4,
    max: 1.4,
  })
  addFloat(p.x, p.y - 42, `REBIRTH ${p.rebirthCount}`, rebirthAura.primaryColor, 15)
  say('system', `จุติครั้งที่ ${p.rebirthCount} (${rebirthAura.title}) สำเร็จ! กลับไปเลเวล 1 และคงค่าสเตตัสเดิมไว้`)
  saveGame()
  game.panel = null
  notify()
  return true
}

export function action() {
  if (!interact()) basicAttack()
}

export function castGmSkill(skill: 'invisible' | 'summon' | 'immortal' | 'judgment' | 'nova' | 'miracle') {
  const p = player()
  if (!p.gm || !isCurrentAccountGm()) return
  if (skill === 'invisible') {
    p.invisible = !p.invisible
    game.skillAnim = 0.5
    game.skillAnimMax = 0.5
    game.skillVfxColor = '#38bdf8'
    addEffect({ type: 'ring', x: p.x, y: p.y - 8, r: 30, color: '#38bdf8', secondaryColor: '#a855f7', max: 0.55 })
    say('gm', `ล่องหน: ${p.invisible ? 'เปิด' : 'ปิด'}`)
  } else if (skill === 'immortal') {
    p.god = !p.god
    if (p.god) { p.hp = getStats().maxHp; p.mp = getStats().maxMp }
    game.skillAnim = 0.55
    game.skillAnimMax = 0.55
    game.skillVfxColor = '#ffd60a'
    addEffect({ type: 'ring', x: p.x, y: p.y - 8, r: 36, color: '#ffd60a', secondaryColor: '#38bdf8', vfxStyle: 'holy_heal', max: 0.65 })
    say('gm', `อมตะ: ${p.god ? 'เปิด' : 'ปิด'}`)
  } else if (skill === 'judgment') {
    const cdKey = 'gm_judgment'
    if ((game.skillCd[cdKey] ?? 0) > 0) return
    const target = nearestMonster(160)
    if (target) faceToward(target.x, target.y)
    const cx = target?.x ?? p.x
    const cy = target?.y ?? p.y
    const r = 82
    let hits = 0
    for (const m of game.monsters) {
      if (!m.dead && Math.hypot(m.x - cx, m.y - cy) <= r) {
        damageMonster(m, 6.5, 'divine_judgment')
        hits += 1
      }
    }
    game.skillCd[cdKey] = 1.8
    game.skillAnim = 0.65
    game.skillAnimMax = 0.65
    game.skillVfxColor = '#ffd60a'
    addEffect({
      type: 'burst',
      x: cx,
      y: cy - 8,
      sourceX: p.x,
      sourceY: p.y - 10,
      r,
      color: '#ffd60a',
      secondaryColor: '#38bdf8',
      vfxStyle: 'light_judgment',
      max: 0.75,
    })
    addFloat(p.x, p.y - 34, 'พิพากษาสวรรค์!', '#ffd60a', 11)
    if (hits > 0) say('gm', `พิพากษาสวรรค์! โจมตีเป้าหมาย ${hits} ตัว`)
    recordDailyMissionProgress({ skillsUsed: 1 })
  } else if (skill === 'nova') {
    const cdKey = 'gm_nova'
    if ((game.skillCd[cdKey] ?? 0) > 0) return
    const r = 120
    let hits = 0
    for (const m of game.monsters) {
      if (!m.dead && Math.hypot(m.x - p.x, m.y - p.y) <= r) {
        damageMonster(m, 4.8, 'sovereign_nova')
        hits += 1
      }
    }
    game.skillCd[cdKey] = 2.4
    game.skillAnim = 0.6
    game.skillAnimMax = 0.6
    game.skillVfxColor = '#38bdf8'
    addEffect({
      type: 'ring',
      x: p.x,
      y: p.y - 8,
      sourceX: p.x,
      sourceY: p.y - 8,
      r,
      color: '#38bdf8',
      secondaryColor: '#f472b6',
      vfxStyle: 'meteor_strike',
      max: 0.68,
    })
    addFloat(p.x, p.y - 34, 'คลื่นพลังราชันย์!', '#38bdf8', 11)
    if (hits > 0) say('gm', `คลื่นพลังราชันย์! โดนมอนสเตอร์ ${hits} ตัว`)
    recordDailyMissionProgress({ skillsUsed: 1 })
  } else if (skill === 'miracle') {
    const cdKey = 'gm_miracle'
    if ((game.skillCd[cdKey] ?? 0) > 0) return
    const stats = getStats(p)
    p.hp = stats.maxHp
    p.mp = stats.maxMp
    game.invulnUntil = Math.max(game.invulnUntil, game.time + 3.0)
    game.skillCd[cdKey] = 4.0
    game.skillAnim = 0.58
    game.skillAnimMax = 0.58
    game.skillVfxColor = '#fde047'
    addEffect({
      type: 'ring',
      x: p.x,
      y: p.y - 8,
      r: 44,
      color: '#fde047',
      secondaryColor: '#67e8f9',
      vfxStyle: 'holy_heal',
      max: 0.72,
    })
    addFloat(p.x, p.y - 34, 'GM MIRACLE!', '#fde047', 11)
    say('gm', 'ปาฏิหาริย์ GM: ฟื้นฟู HP/MP เต็ม + โล่อมตะ 3 วินาที')
    recordDailyMissionProgress({ skillsUsed: 1 })
  } else {
    game.skillAnim = 0.45
    game.skillAnimMax = 0.45
    game.skillVfxColor = '#ffd60a'
    openPanel('gm-summon')
  }
  saveGame()
  notify()
}

export function summonGmItem(itemId: string) {
  const p = player()
  if (!p.gm || !isCurrentAccountGm() || !GM_ITEMS[itemId]) return
  if (addItem(itemId, 1)) say('gm', `เสก ${GM_ITEMS[itemId].name} สำเร็จ`)
  else say('error', 'กระเป๋าเต็ม')
  saveGame()
  notify()
}

export function devSetLevel(level: number) {
  const p = player()
  if (!p.gm || !isCurrentAccountGm()) return
  if (!Number.isFinite(level)) return
  const lv = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)))
  const before = getStats()
  p.level = lv
  p.exp = 0
  onLevelUp(before)
  say('gm', `[DEV] ตั้งเลเวลเป็น ${lv}`)
  saveGame()
  notify()
}

export function devAddGold(amount: number) {
  const p = player()
  if (!p.gm || !isCurrentAccountGm()) return
  const delta = Math.floor(amount)
  if (!Number.isFinite(delta)) return
  p.gold = Math.max(0, Math.min(2_000_000_000, p.gold + delta))
  say('gm', `[DEV] ปรับ Gold เป็น ${p.gold.toLocaleString()} G`)
  saveGame()
  notify()
}

export function devAddDiamonds(amount: number) {
  const p = player()
  if (!p.gm || !isCurrentAccountGm()) return
  const delta = Math.floor(amount)
  if (!Number.isFinite(delta)) return
  p.diamonds = Math.max(0, Math.min(1_000_000_000, (p.diamonds ?? 0) + delta))
  say('gm', `[DEV] ปรับเพชรเป็น ${p.diamonds.toLocaleString()} D`)
  saveGame()
  notify()
}

export function devAddPoints(statDelta: number, skillDelta: number) {
  const p = player()
  if (!p.gm || !isCurrentAccountGm()) return
  const sAdd = Number.isFinite(statDelta) ? Math.floor(statDelta) : 0
  const kAdd = Number.isFinite(skillDelta) ? Math.floor(skillDelta) : 0
  p.statPoints = Math.max(0, (p.statPoints ?? 0) + sAdd)
  p.skillPoints = Math.max(0, (p.skillPoints ?? 0) + kAdd)
  say('gm', `[DEV] แต้มสเตตัส ${p.statPoints} · แต้มสกิล ${p.skillPoints}`)
  saveGame()
  notify()
}

export function devSetSpeed(speed: number) {
  const p = player()
  if (!p.gm || !isCurrentAccountGm()) return
  p.speed = Math.max(0.5, Math.min(5, Number(speed) || 1))
  say('gm', `[DEV] ความเร็ว x${p.speed}`)
  saveGame()
  notify()
}

export function devHealFull() {
  const p = player()
  if (!p.gm || !isCurrentAccountGm()) return
  const s = getStats()
  p.hp = s.maxHp
  p.mp = s.maxMp
  say('gm', '[DEV] ฟื้นฟู HP/MP เต็ม 100%')
  saveGame()
  notify()
}

export function devChangeJob(jobId: string) {
  const p = player()
  if (!p.gm || !isCurrentAccountGm() || !JOBS[jobId]) return
  applyJob(jobId)
  say('gm', `[DEV] เปลี่ยนอาชีพเป็น ${JOBS[jobId].name} (${jobId})`)
  saveGame()
  notify()
}

export function devTeleport(mapId: string) {
  const p = player()
  if (!p.gm || !isCurrentAccountGm() || !MAPS[mapId]) return
  const map = MAPS[mapId]
  changeMap(map.id, map.spawn.x, map.spawn.y)
  say('gm', `[DEV] วาร์ปไปยัง ${map.name}`)
  saveGame()
  notify()
}

export function devSpawnMonster(monsterId: string, count = 1) {
  const p = player()
  if (!p.gm || !isCurrentAccountGm() || !MONSTERS[monsterId]) return
  const n = Math.max(1, Math.min(20, Math.floor(count)))
  const map = currentMap()
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2)
    let x = p.x + Math.cos(a) * 40
    let y = p.y + Math.sin(a) * 40
    if (boxBlocked(map, x, y, 6, 6)) {
      x = p.x
      y = p.y
    }
    const m = makeMonster(monsterId, x, y)
    m.respawnAt = Infinity
    game.monsters.push(m)
  }
  say('gm', `[DEV] เรียก ${MONSTERS[monsterId].name} x${n}`)
  notify()
}

export function devKillAllMonsters() {
  const p = player()
  if (!p.gm || !isCurrentAccountGm()) return
  let n = 0
  for (const m of game.monsters) {
    if (!m.dead) {
      killMonster(m)
      n++
    }
  }
  say('gm', `[DEV] กำจัดมอนสเตอร์ในแมพ ${n} ตัว`)
  saveGame()
  notify()
}

export function devGiveItem(itemId: string, qty = 1, plus = 0) {
  const p = player()
  if (!p.gm || !isCurrentAccountGm() || !ITEMS[itemId]) return false
  const safeQty = Math.max(1, Math.min(999, Math.floor(qty)))
  const safePlus = Math.max(0, Math.min(MAX_PLUS, Math.floor(plus)))
  const ok = addItem(itemId, safeQty, safePlus)
  if (ok) say('gm', `[DEV] เสก ${ITEMS[itemId].name}${safePlus ? ` +${safePlus}` : ''} x${safeQty}`)
  else say('error', 'กระเป๋าเต็ม')
  saveGame()
  notify()
  return ok
}

export function devSetTowerFloor(highestFloor: number) {
  const p = player()
  if (!p.gm || !isCurrentAccountGm()) return
  if (!Number.isFinite(highestFloor)) return
  const safeFloor = Math.max(0, Math.min(200, Math.floor(highestFloor)))
  p.towerState = {
    ...(p.towerState ?? createDefaultTowerState()),
    highestFloor: safeFloor,
  }
  say('gm', `[DEV] ตั้งชั้นหอคอยสูงสุดที่ผ่านเป็นชั้น ${safeFloor}`)
  saveGame()
  notify()
}

export function devBroadcastAnnouncement(rawBody: string) {
  const p = player()
  if (!p.gm || !isCurrentAccountGm()) return
  const body = rawBody.trim().slice(0, 240)
  if (!body) return
  game.announcement = {
    body,
    authorId: firebaseAuth.currentUser?.uid ?? 'gm-0000',
    until: Date.now() + 12_000,
  }
  say('gm', `[ประกาศ GM] ${body}`)
  notify()
}

export function openPanel(id: PanelId) {
  if ((id === 'gm-summon' || id === 'dev-tools') && (!game.p?.gm || !isCurrentAccountGm())) {
    say('error', 'สงวนสิทธิ์เฉพาะบัญชี GM/Dev (ffsmilepay53@gmail.com)')
    notify()
    return
  }
  game.panel = id
  notify()
}

export function closePanel() {
  if (!game.panel) return
  if (game.panel === 'trade' && game.tradeId !== null) {
    const tradeId = game.tradeId
    game.tradeId = null
    game.tradeTargetId = null
    void cancelTradeRequest(tradeId).then((result) => {
      if (result.ok) return
      game.chat.push({ id: Date.now(), type: 'error', text: result.message })
      notify()
    })
  }
  game.panel = null
  saveGame()
  notify()
}

export function buyItem(itemId: string, qty: number) {
  const p = player()
  const def = ITEMS[itemId]
  if (!def || !Number.isFinite(qty) || qty <= 0) return
  const safeQty = Math.floor(qty)
  const cost = def.price * safeQty
  if (p.gold < cost) {
    say('error', 'เงินไม่พอ')
    return notify()
  }
  const free = getInventoryCapacity(p) - p.inventory.length
  if (!stackable(def) && free < safeQty) {
    say('error', 'กระเป๋าเต็ม')
    return notify()
  }
  if (!addItem(itemId, safeQty)) {
    say('error', 'กระเป๋าเต็ม')
    return notify()
  }
  p.gold -= cost
  say('loot', `ซื้อ ${def.name} x${safeQty} (-${cost.toLocaleString()}G)`)
  notify()
}

export function buyGemShopItem(itemId: string) {
  const p = player()
  const shopItem = GEM_SHOP_ITEMS.find((item) => item.id === itemId)
  if (!shopItem) return

  if (shopItem.category !== 'utility' && p.ownedGemItems.includes(itemId)) {
    say('error', 'คุณมีไอเทมชิ้นนี้แล้ว')
    return notify()
  }
  if (shopItem.id === 'astral_bag_expansion' && p.inventoryCapacityBonus >= 60) {
    say('error', 'กระเป๋าเพิ่มช่องถึงขีดจำกัด +60 แล้ว')
    return notify()
  }
  if (p.diamonds < shopItem.price) {
    say('error', 'เพชรไม่พอ')
    return notify()
  }
  if (shopItem.category === 'utility') {
    if (!shopItem.inventoryItemId || !addItem(shopItem.inventoryItemId)) {
      say('error', 'กระเป๋าเต็ม')
      return notify()
    }
  } else {
    p.ownedGemItems.push(itemId)
    if (shopItem.category === 'companions') {
      p.petState = sanitizePetState(p.petState, p.ownedGemItems, p.equippedGemCompanion)
      p.petState.activePetId = itemId
      p.equippedGemCompanion = itemId
      p.mountState = sanitizeMountState(p.mountState, p.ownedGemItems)
      if (itemId === 'aurora_cloud_dragon') {
        p.mountState.activeMountId = 'aurora_cloud_dragon'
        p.mountState.mounted = true
      }
    }
  }

  p.diamonds -= shopItem.price
  say('loot', `ซื้อ ${shopItem.name} สำเร็จ (-${shopItem.price.toLocaleString()} เพชร)`)
  saveGame()
  notify()
}

export function equipGemShopItem(itemId: string) {
  const p = player()
  const shopItem = GEM_SHOP_ITEMS.find((item) => item.id === itemId)
  if (!shopItem || shopItem.category === 'utility' || !p.ownedGemItems.includes(itemId)) return

  if (shopItem.category === 'fashion') {
    p.equippedGemFashion = p.equippedGemFashion === itemId ? null : itemId
  } else {
    const nextEquip = p.equippedGemCompanion === itemId ? null : itemId
    p.equippedGemCompanion = nextEquip
    p.petState = sanitizePetState(p.petState, p.ownedGemItems, nextEquip)
    p.petState.activePetId = nextEquip
  }
  const equipped = p.equippedGemFashion === itemId || p.equippedGemCompanion === itemId
  say('system', equipped ? `สวมใส่ ${shopItem.name} แล้ว` : `ถอด ${shopItem.name} แล้ว`)
  saveGame()
  notify()
}

export function sellPrice(it: InvItem) {
  const def = ITEMS[it.itemId]
  if (!def) return 0
  return Math.floor(def.price * 0.4 * (1 + it.plus * 0.3))
}

export function sellItem(id: string, qty: number) {
  const p = player()
  const it = p.inventory.find((i) => i.uid === id)
  if (!it) return
  const price = sellPrice(it)
  const removed = removeUid(p.inventory, id, qty)
  if (!removed) return
  const total = price * removed.qty
  p.gold += total
  say('loot', `ขาย ${itemLabel(removed)} x${removed.qty} (+${total.toLocaleString()}G)`)
  notify()
}

export function findEquipment(id: string): InvItem | null {
  const p = player()
  if (p.equipment.weapon?.uid === id) return p.equipment.weapon
  if (p.equipment.armor?.uid === id) return p.equipment.armor
  if (p.equipment.shoes?.uid === id) return p.equipment.shoes
  if (p.equipment.cloak?.uid === id) return p.equipment.cloak
  if (p.equipment.accessory?.uid === id) return p.equipment.accessory
  return p.inventory.find((i) => i.uid === id) ?? null
}

export type EnhanceResult = { result: 'success' | 'fail' | 'down' | 'error'; message: string }

export function enhance(id: string): EnhanceResult {
  const p = player()
  const it = findEquipment(id)
  if (!it) return { result: 'error', message: 'ไม่พบไอเทม' }
  const def = ITEMS[it.itemId]
  if (!def) return { result: 'error', message: 'ไม่พบข้อมูลไอเทม' }
  if (def.kind !== 'weapon' && def.kind !== 'armor') return { result: 'error', message: 'ตีบวกได้เฉพาะอาวุธและชุดเกราะ' }
  if (it.plus >= MAX_PLUS) return { result: 'error', message: `ตีบวกสูงสุดแล้ว (+${MAX_PLUS})` }
  const cost = enhanceCost(it.plus, def.tier ?? 1)
  if (p.gold < cost.gold) return { result: 'error', message: 'เงินไม่พอ' }
  if (countItem('enhance_stone') < cost.stones) return { result: 'error', message: `หินตีบวกไม่พอ (ต้องการ ${cost.stones})` }
  p.gold -= cost.gold
  removeItemId('enhance_stone', cost.stones)
  p.questState = recordQuestProgress(p.questState, { enhances: 1 }, p.kills)
  recordDailyMissionProgress({ enhances: 1 })
  const rate = enhanceRate(it.plus)
  let res: EnhanceResult
  if (Math.random() < rate) {
    it.plus++
    res = { result: 'success', message: `ตีบวกสำเร็จ! ${def.name} +${it.plus}` }
    say('system', res.message)
    if (it.plus >= 7) say('gm', `ประกาศ: ${p.name} ตีบวก ${def.name} ได้ +${it.plus}!`)
  } else if (it.plus >= 6) {
    it.plus--
    res = { result: 'down', message: `ตีบวกล้มเหลว! ระดับลดลงเป็น +${it.plus}` }
    say('error', res.message)
  } else {
    res = { result: 'fail', message: 'ตีบวกล้มเหลว! ระดับคงเดิม' }
    say('error', res.message)
  }
  clampVitals()
  saveGame()
  notify()
  return res
}

export function unlockCombatPet(petId: string): { ok: boolean; message: string } {
  const p = player()
  const def = getCombatPetDef(petId)
  if (!def || def.linkedGemItemId) return { ok: false, message: 'สัตว์เลี้ยงนี้ต้องปลดล็อกจากร้านเพชร' }
  p.petState = sanitizePetState(p.petState, p.ownedGemItems, p.equippedGemCompanion)
  if (p.petState.ownedPets[petId]) return { ok: false, message: 'คุณมีสัตว์เลี้ยงตัวนี้แล้ว' }
  const costGold = def.unlockGold ?? 0
  if (p.gold < costGold) return { ok: false, message: `ทองไม่พอ (ต้องการ ${costGold.toLocaleString()} G)` }
  p.gold -= costGold
  p.petState.ownedPets[petId] = { level: 1, exp: 0 }
  p.petState.activePetId = petId
  p.equippedGemCompanion = null
  clampVitals()
  saveGame()
  notify()
  say('loot', `ปลดล็อกและเรียกคู่หู ${def.name} แล้ว!`)
  return { ok: true, message: `รับ ${def.name} เข้าร่วมทีมแล้ว` }
}

export function equipCombatPet(petId: string | null) {
  const p = player()
  p.petState = sanitizePetState(p.petState, p.ownedGemItems, p.equippedGemCompanion)
  if (!petId) {
    p.petState.activePetId = null
    p.equippedGemCompanion = null
    say('system', 'เก็บสัตว์เลี้ยงคู่หูเข้ากระเป๋าแล้ว')
  } else if (p.petState.ownedPets[petId]) {
    const def = COMBAT_PETS.find((item) => item.id === petId)
    p.petState.activePetId = petId
    p.equippedGemCompanion = def?.linkedGemItemId ?? null
    say('system', `เรียกคู่หู ${def?.name ?? petId} ออกมาช่วยสู้แล้ว`)
  }
  clampVitals()
  saveGame()
  notify()
}

export function feedCombatPet(petId: string): { ok: boolean; message: string } {
  const p = player()
  p.petState = sanitizePetState(p.petState, p.ownedGemItems, p.equippedGemCompanion)
  const entry = p.petState.ownedPets[petId]
  const def = getCombatPetDef(petId)
  if (!entry || !def) return { ok: false, message: 'ไม่พบสัตว์เลี้ยง' }
  if (entry.level >= 20) return { ok: false, message: 'สัตว์เลี้ยงเลเวลสูงสุดแล้ว' }
  const cost = petFeedCost(entry.level)
  if (p.gold < cost) return { ok: false, message: `ทองไม่พอ (ต้องการ ${cost.toLocaleString()} G)` }
  p.gold -= cost
  entry.level += 1
  entry.exp = 0
  clampVitals()
  saveGame()
  notify()
  say('system', `ฝึกฝน ${def.name} สำเร็จ! เลื่อนเป็น Lv.${entry.level}`)
  return { ok: true, message: `อัปเกรด ${def.name} เป็น Lv.${entry.level} สำเร็จ` }
}

export function unlockMount(mountId: string): { ok: boolean; message: string } {
  const p = player()
  const def = getMountDef(mountId)
  if (!def || def.linkedGemItemId) return { ok: false, message: 'สัตว์ขี่นี้ต้องปลดล็อกจากร้านเพชร' }
  p.mountState = sanitizeMountState(p.mountState, p.ownedGemItems)
  if (p.mountState.ownedMounts[mountId]) return { ok: false, message: 'คุณมีสัตว์ขี่ตัวนี้แล้ว' }
  const costGold = def.unlockGold ?? 0
  if (p.gold < costGold) return { ok: false, message: `ทองไม่พอ (ต้องการ ${costGold.toLocaleString()} G)` }
  p.gold -= costGold
  p.mountState.ownedMounts[mountId] = { level: 1 }
  p.mountState.activeMountId = mountId
  p.mountState.mounted = true
  clampVitals()
  saveGame()
  notify()
  say('loot', `ปลดล็อกและขึ้นขี่ ${def.name} แล้ว! (ความเร็ว +${def.speedBonusPct}%)`)
  return { ok: true, message: `ปลดล็อกและขึ้นขี่ ${def.name} สำเร็จ` }
}

export function equipMount(mountId: string | null) {
  const p = player()
  p.mountState = sanitizeMountState(p.mountState, p.ownedGemItems)
  if (!mountId) {
    p.mountState.mounted = false
    p.mountState.activeMountId = null
    say('system', 'ลงจากสัตว์ขี่และเก็บเข้าคอกแล้ว')
  } else if (p.mountState.ownedMounts[mountId]) {
    const def = getMountDef(mountId)
    p.mountState.activeMountId = mountId
    p.mountState.mounted = true
    say('system', `เรียกและขึ้นขี่ ${def?.name ?? mountId} แล้ว!`)
  }
  clampVitals()
  saveGame()
  notify()
}

export function toggleMountRiding(): { ok: boolean; mounted: boolean; message: string } {
  const p = player()
  p.mountState = sanitizeMountState(p.mountState, p.ownedGemItems)
  let targetId = p.mountState.activeMountId
  if (!targetId) {
    const firstOwned = Object.keys(p.mountState.ownedMounts)[0]
    if (!firstOwned) {
      say('error', 'ยังไม่มีสัตว์ขี่ — ปลดล็อกได้ในเมนู สัตว์เลี้ยง (ผอบ) & สัตว์ขี่')
      notify()
      return { ok: false, mounted: false, message: 'ยังไม่มีสัตว์ขี่' }
    }
    targetId = firstOwned
    p.mountState.activeMountId = targetId
  }
  const nextMounted = !p.mountState.mounted
  p.mountState.mounted = nextMounted
  const def = getMountDef(targetId)
  const msg = nextMounted ? `ขึ้นขี่ ${def?.name ?? targetId} แล้ว` : `ลงจาก ${def?.name ?? targetId} แล้ว`
  say('system', msg)
  clampVitals()
  saveGame()
  notify()
  return { ok: true, mounted: nextMounted, message: msg }
}

export function upgradeMount(mountId: string): { ok: boolean; message: string } {
  const p = player()
  p.mountState = sanitizeMountState(p.mountState, p.ownedGemItems)
  const entry = p.mountState.ownedMounts[mountId]
  const def = getMountDef(mountId)
  if (!entry || !def) return { ok: false, message: 'ไม่พบสัตว์ขี่' }
  if (entry.level >= MAX_MOUNT_LEVEL) return { ok: false, message: 'สัตว์ขี่เลเวลสูงสุดแล้ว' }
  const cost = mountUpgradeCost(entry.level)
  if (p.gold < cost) return { ok: false, message: `ทองไม่พอ (ต้องการ ${cost.toLocaleString()} G)` }
  p.gold -= cost
  entry.level += 1
  clampVitals()
  saveGame()
  notify()
  say('system', `ฝึกฝนสัตว์ขี่ ${def.name} สำเร็จ! เลื่อนเป็น Lv.${entry.level}`)
  return { ok: true, message: `อัปเกรด ${def.name} เป็น Lv.${entry.level} สำเร็จ` }
}

export function claimQuestReward(questId: string): { ok: boolean; message: string } {
  const p = player()
  const quest = QUEST_DEFS.find((q) => q.id === questId)
  if (!quest) return { ok: false, message: 'ไม่พบเควสต์' }
  p.questState = sanitizeQuestState(p.questState, p.kills)
  p.towerState = sanitizeTowerState(p.towerState)
  p.petState = sanitizePetState(p.petState, p.ownedGemItems, p.equippedGemCompanion)

  if (isQuestClaimed(quest, p.questState)) {
    return { ok: false, message: 'รับรางวัลเควสต์นี้ไปแล้ว' }
  }
  const current = getQuestMetricValue(quest.metric, p.questState, p.towerState, p.petState)
  if (current < quest.target) {
    return { ok: false, message: 'ภารกิจยังไม่ครบตามเงื่อนไข' }
  }

  if (quest.category === 'daily') {
    p.questState.claimedDailyIds.push(quest.id)
  } else {
    p.questState.claimedMilestoneIds.push(quest.id)
  }

  const res = applyLevelAndRewards(
    p,
    {
      gold: quest.rewardGold,
      exp: quest.rewardExp,
      diamonds: quest.rewardDiamonds,
      stones: quest.rewardStones ?? 0,
    },
    () => getStats(p),
    getInventoryCapacity(p),
  )

  saveGame()
  notify()
  const parts = [`+${quest.rewardGold.toLocaleString()} G`]
  if (quest.rewardDiamonds > 0) parts.push(`+${quest.rewardDiamonds} เพชร`)
  if (quest.rewardExp > 0) parts.push(`+${quest.rewardExp} EXP`)
  if (res.stonesAdded > 0) parts.push(`+หินตีบวก x${res.stonesAdded}`)
  say('loot', `สำเร็จเควสต์ "${quest.title}": ${parts.join(', ')}`)
  return { ok: true, message: `รับรางวัลสำเร็จ (${parts.join(' · ')})` }
}

export async function claimDailyMissionReward(missionId: string): Promise<{ ok: boolean; message: string }> {
  if (!game.p) return { ok: false, message: 'ไม่พบข้อมูลตัวละคร' }
  const p = game.p
  return claimDailyMission(missionId, (mission) => {
    applyLevelAndRewards(
      p,
      {
        gold: mission.rewardGold,
        exp: mission.rewardExp,
        diamonds: mission.rewardDiamonds,
        stones: mission.rewardStones,
      },
      () => getStats(p),
      getInventoryCapacity(p),
    )
    saveGame()
    notify()
    say('loot', `รับรางวัลภารกิจรายวัน "${mission.title}" สำเร็จ!`)
    return true
  })
}

export function availableJobs() {
  const p = player()
  return Object.values(JOBS).filter((j) => j.from === p.jobId || Boolean(j.alsoFrom?.includes(p.jobId)))
}

export function changeJob(jobId: string) {
  const p = player()
  const job = JOBS[jobId]
  const canPromote = Boolean(job && (job.from === p.jobId || job.alsoFrom?.includes(p.jobId)))
  if (!job || !canPromote) return say('error', 'ไม่สามารถเปลี่ยนเป็นอาชีพนี้ได้'), notify()
  if (p.level < job.reqLevel) return say('error', `ต้องการเลเวล ${job.reqLevel}`), notify()
  if (p.gold < job.cost) return say('error', 'เงินไม่พอ'), notify()
  const w = p.equipment.weapon
  const wDef = w ? ITEMS[w.itemId] : null
  const weaponNeedsUnequip = Boolean(w && (!wDef || !wDef.weaponType || !job.weaponTypes.includes(wDef.weaponType)))
  if (weaponNeedsUnequip && p.inventory.length >= getInventoryCapacity(p) && p.storage.length >= STORAGE_SIZE) {
    return say('error', 'กระเป๋าและคลังเต็ม ไม่สามารถถอดอาวุธเดิมได้'), notify()
  }
  p.gold -= job.cost
  applyJob(jobId)
  say('system', `เปลี่ยนอาชีพเป็น ${job.name} สำเร็จ!`)
  saveGame()
  notify()
}

function applyJob(jobId: string) {
  const p = player()
  p.jobId = jobId
  const w = p.equipment.weapon
  const wDef = w ? ITEMS[w.itemId] : null
  if (w && (!wDef || !wDef.weaponType || !currentJob().weaponTypes.includes(wDef.weaponType))) {
    if (p.inventory.length < getInventoryCapacity(p)) {
      p.inventory.push(w)
      p.equipment.weapon = null
      say('system', `ถอด ${itemLabel(w)} เพราะอาชีพใหม่ใช้ไม่ได้`)
    } else if (p.storage.length < STORAGE_SIZE) {
      p.storage.push(w)
      p.equipment.weapon = null
      say('system', `กระเป๋าเต็ม จึงย้าย ${itemLabel(w)} เข้าคลังแล้ว`)
    }
  }
  game.skillCd = {}
  const s = getStats()
  p.hp = s.maxHp
  p.mp = s.maxMp
  addEffect({ type: 'levelup', x: p.x, y: p.y, r: 22, color: '#c77dff', max: 1.4 })
}

export function deposit(id: string) {
  const p = player()
  const it = p.inventory.find((i) => i.uid === id)
  if (!it) return
  const def = ITEMS[it.itemId]
  if (!def) return
  const existingStack = stackable(def) ? p.storage.find((s) => s.itemId === it.itemId) : undefined
  if (!existingStack && p.storage.length >= STORAGE_SIZE) return say('error', 'คลังเต็ม'), notify()
  p.inventory = p.inventory.filter((i) => i.uid !== id)
  if (existingStack) existingStack.qty += it.qty
  else p.storage.push(it)
  notify()
}

export function withdraw(id: string) {
  const p = player()
  const it = p.storage.find((i) => i.uid === id)
  if (!it) return
  const def = ITEMS[it.itemId]
  if (!def) return
  const existingStack = stackable(def) ? p.inventory.find((s) => s.itemId === it.itemId) : undefined
  if (!existingStack && p.inventory.length >= getInventoryCapacity(p)) return say('error', 'กระเป๋าเต็ม'), notify()
  p.storage = p.storage.filter((i) => i.uid !== id)
  if (existingStack) existingStack.qty += it.qty
  else p.inventory.push(it)
  notify()
}

export function moveGold(amount: number, toStorage: boolean) {
  const p = player()
  if (!Number.isFinite(amount)) return
  const n = Math.floor(amount)
  if (n <= 0) return
  if (toStorage) {
    const take = Math.min(n, p.gold)
    p.gold -= take
    p.storageGold += take
  } else {
    const take = Math.min(n, p.storageGold)
    p.storageGold -= take
    p.gold += take
  }
  notify()
}

/* ---------------- RPG 8-System Actions ---------------- */

export function craftRecipeAction(recipeId: string): { ok: boolean; message: string } {
  const p = player()
  const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId)
  if (!recipe) return { ok: false, message: 'ไม่พบสูตรคราฟต์' }
  const check = canCraftRecipe(recipe, p.inventory, p.gold)
  if (!check.ok) return { ok: false, message: check.reason ?? 'วัตถุดิบไม่เพียงพอ' }
  if (recipe.resultItemId) {
    const def = ITEMS[recipe.resultItemId]
    if (!def) return { ok: false, message: 'ไม่พบไอเทมปลายทาง' }
    if (!stackable(def) && p.inventory.length >= getInventoryCapacity(p)) {
      return { ok: false, message: 'กระเป๋าเต็ม กรุณาเคลียร์ช่องก่อนคราฟต์' }
    }
  }
  for (const ing of recipe.ingredients) {
    removeItemId(ing.itemId, ing.qty)
  }
  p.gold -= recipe.goldCost
  if (recipe.resultItemId) {
    addItem(recipe.resultItemId, recipe.resultQty)
  } else if (recipe.resultRuneId) {
    const ext = sanitizeRpgExt(p.rpgExt)
    ext.runeBag[recipe.resultRuneId] = (ext.runeBag[recipe.resultRuneId] ?? 0) + recipe.resultQty
    p.rpgExt = ext
  }
  say('loot', `คราฟต์สำเร็จ: ${recipe.name}`)
  saveGame()
  notify()
  return { ok: true, message: `สร้าง ${recipe.name} สำเร็จ!` }
}

export function dismantleItemAction(itemUid: string): { ok: boolean; message: string } {
  const p = player()
  const it = p.inventory.find((i) => i.uid === itemUid)
  if (!it) return { ok: false, message: 'ไม่พบอุปกรณ์ในกระเป๋า' }
  const yieldRes = calculateDismantleYield(it)
  if (yieldRes.stones <= 0 && yieldRes.gold <= 0) {
    return { ok: false, message: 'ไอเทมนี้ไม่สามารถย่อยได้' }
  }
  const removed = removeUid(p.inventory, itemUid, 1)
  if (!removed) return { ok: false, message: 'ไม่สามารถย่อยไอเทมได้' }
  p.gold += yieldRes.gold
  addItem('enhance_stone', yieldRes.stones)
  const ext = sanitizeRpgExt(p.rpgExt)
  if (yieldRes.bonusRuneId) {
    ext.runeBag[yieldRes.bonusRuneId] = (ext.runeBag[yieldRes.bonusRuneId] ?? 0) + 1
  }
  p.rpgExt = ext
  const runeNote = yieldRes.bonusRuneId ? ` + ${RUNE_DEFS[yieldRes.bonusRuneId]?.name ?? 'รูน'}` : ''
  const msg = `ย่อยสำเร็จ: +${yieldRes.gold} G, หินตีบวก x${yieldRes.stones}${runeNote}`
  say('loot', msg)
  saveGame()
  notify()
  return { ok: true, message: msg }
}

export function socketRuneAction(slot: EquipmentSlot, runeId: string | null): { ok: boolean; message: string } {
  const p = player()
  const ext = sanitizeRpgExt(p.rpgExt)
  const prevRune = ext.equippedRunes[slot]
  if (runeId === null) {
    if (!prevRune) return { ok: false, message: 'ช่องนี้ยังไม่ได้ฝังรูน' }
    ext.runeBag[prevRune] = (ext.runeBag[prevRune] ?? 0) + 1
    delete ext.equippedRunes[slot]
    p.rpgExt = ext
    clampVitals()
    saveGame()
    notify()
    return { ok: true, message: `ถอด ${RUNE_DEFS[prevRune]?.name ?? 'รูน'} ออกจากช่องแล้ว` }
  }
  if (!RUNE_DEFS[runeId] || (ext.runeBag[runeId] ?? 0) <= 0) {
    return { ok: false, message: 'ไม่มีรูนนี้ในกระเป๋ารูน' }
  }
  if (prevRune) {
    ext.runeBag[prevRune] = (ext.runeBag[prevRune] ?? 0) + 1
  }
  ext.runeBag[runeId] = Math.max(0, (ext.runeBag[runeId] ?? 0) - 1)
  if (ext.runeBag[runeId] <= 0) delete ext.runeBag[runeId]
  ext.equippedRunes[slot] = runeId
  p.rpgExt = ext
  clampVitals()
  saveGame()
  notify()
  return { ok: true, message: `ฝัง ${RUNE_DEFS[runeId].name} สำเร็จ!` }
}

export function claimBestiaryRewardAction(monsterId: string): { ok: boolean; message: string } {
  const p = player()
  const def = MONSTERS[monsterId]
  if (!def) return { ok: false, message: 'ไม่พบข้อมูลมอนสเตอร์' }
  const ext = sanitizeRpgExt(p.rpgExt)
  const kills = ext.bestiary[monsterId] ?? 0
  const currentTier = ext.claimedBestiaryTiers[monsterId] ?? 0
  const nextTier = BESTIARY_TIERS.find((t) => t.tier === currentTier + 1)
  if (!nextTier) return { ok: false, message: 'รับรางวัลครบทุกขั้นแล้ว' }
  if (kills < nextTier.target) {
    return { ok: false, message: `ต้องล่า ${def.name} อีก ${nextTier.target - kills} ตัว` }
  }
  ext.claimedBestiaryTiers[monsterId] = nextTier.tier
  ext.titles = evaluateUnlockedTitleIds({
    kills: p.kills,
    rebirthCount: p.rebirthCount,
    questState: p.questState,
    towerState: p.towerState,
    rpgExt: ext,
  })
  p.rpgExt = ext
  const diamondBonus = nextTier.tier * (def.boss ? 15 : 6)
  p.diamonds = (p.diamonds ?? 0) + diamondBonus
  clampVitals()
  saveGame()
  notify()
  return {
    ok: true,
    message: `ปลดล็อกโบนัส ${def.name} ระดับ ${nextTier.tier} (+${diamondBonus} เพชร & ค่าสถานะถาวร)!`,
  }
}

export function equipTitleAction(titleId: string | null): { ok: boolean; message: string } {
  const p = player()
  const ext = sanitizeRpgExt(p.rpgExt)
  ext.titles = evaluateUnlockedTitleIds({
    kills: p.kills,
    rebirthCount: p.rebirthCount,
    questState: p.questState,
    towerState: p.towerState,
    rpgExt: ext,
  })
  if (titleId === null) {
    ext.activeTitle = null
    p.rpgExt = ext
    clampVitals()
    saveGame()
    notify()
    return { ok: true, message: 'ถอดฉายาที่แสดงแล้ว' }
  }
  if (!ext.titles.includes(titleId)) {
    return { ok: false, message: 'ยังไม่ปลดล็อกฉายานี้' }
  }
  ext.activeTitle = titleId
  p.rpgExt = ext
  clampVitals()
  saveGame()
  notify()
  const titleName = TITLE_DEFS.find((t) => t.id === titleId)?.name ?? titleId
  return { ok: true, message: `ติดตั้งฉายา "${titleName}" แล้ว!` }
}

export function completeDailyDungeonAction(
  dungeonId: DailyDungeonId,
  clearBonusFactor = 1,
): { ok: boolean; message: string; rewards?: ReturnType<typeof calculateDailyDungeonRewards> } {
  const p = player()
  const def = DAILY_DUNGEONS.find((d) => d.id === dungeonId)
  if (!def) return { ok: false, message: 'ไม่พบดันเจี้ยน' }
  const ext = sanitizeRpgExt(p.rpgExt)
  const today = todayIsoDate()
  if (ext.dailyDungeonDate !== today) {
    ext.dailyDungeonDate = today
    ext.dailyDungeonRuns = { gold_vault: 0, stone_mine: 0, boss_rush: 0 }
  }
  if ((ext.dailyDungeonRuns[dungeonId] ?? 0) >= def.dailyLimit) {
    return { ok: false, message: `ลง ${def.name} ครบ ${def.dailyLimit} รอบของวันนี้แล้ว` }
  }
  ext.dailyDungeonRuns[dungeonId] = (ext.dailyDungeonRuns[dungeonId] ?? 0) + 1
  const rewards = calculateDailyDungeonRewards(def, p.level, clearBonusFactor)
  p.gold += rewards.gold
  p.diamonds = (p.diamonds ?? 0) + rewards.diamonds
  if (rewards.stones > 0) addItem('enhance_stone', rewards.stones)
  if (rewards.materialId) addItem(rewards.materialId, 2)
  if (rewards.runeId) {
    ext.runeBag[rewards.runeId] = (ext.runeBag[rewards.runeId] ?? 0) + 1
  }
  p.rpgExt = ext
  gainExp(rewards.exp)
  saveGame()
  notify()
  return {
    ok: true,
    rewards,
    message: `พิชิต ${def.name}! +${rewards.gold.toLocaleString()} G · +${rewards.diamonds} เพชร · หิน x${rewards.stones}`,
  }
}

export function recordPvpResultAction(ratingDelta: number, gold: number, diamonds: number, won: boolean) {
  const p = player()
  const ext = sanitizeRpgExt(p.rpgExt)
  ext.arenaRating = Math.max(100, Math.min(9999, ext.arenaRating + ratingDelta))
  if (won) ext.arenaWins += 1
  else ext.arenaLosses += 1
  p.gold += Math.max(0, gold)
  p.diamonds = (p.diamonds ?? 0) + Math.max(0, diamonds)
  ext.titles = evaluateUnlockedTitleIds({
    kills: p.kills,
    rebirthCount: p.rebirthCount,
    questState: p.questState,
    towerState: p.towerState,
    rpgExt: ext,
  })
  p.rpgExt = ext
  saveGame()
  notify()
}

export function syncGuildStateAction(patch: {
  guildId: string | null
  guildName: string | null
  guildTag: string | null
  guildLevel?: number
  donateCostGold?: number
}) {
  const p = player()
  const ext = sanitizeRpgExt(p.rpgExt)
  if (patch.donateCostGold && patch.donateCostGold > 0) {
    if (p.gold < patch.donateCostGold) return false
    p.gold -= patch.donateCostGold
    ext.guildContribution += patch.donateCostGold
  }
  ext.guildId = patch.guildId
  ext.guildName = patch.guildName
  ext.guildTag = patch.guildTag
  if (typeof patch.guildLevel === 'number') ext.guildLevel = Math.max(1, patch.guildLevel)
  ext.titles = evaluateUnlockedTitleIds({
    kills: p.kills,
    rebirthCount: p.rebirthCount,
    questState: p.questState,
    towerState: p.towerState,
    rpgExt: ext,
  })
  p.rpgExt = ext
  clampVitals()
  saveGame()
  notify()
  return true
}

export function recordWorldBossDamageAction(damageDealt: number) {
  const p = player()
  const ext = sanitizeRpgExt(p.rpgExt)
  const spec = getActiveWorldBoss()
  if (ext.worldBossCycleKey !== spec.cycleKey) {
    ext.worldBossCycleKey = spec.cycleKey
    ext.worldBossDamage = 0
    ext.claimedWorldBossMilestones = []
  }
  ext.worldBossDamage += Math.max(0, Math.round(damageDealt))
  p.rpgExt = ext
  saveGame()
  notify()
}

export function summonWorldBossInField(): { ok: boolean; message: string } {
  const p = game.p
  if (!p) return { ok: false, message: 'ยังไม่ได้เลือกตัวละคร' }
  if (p.mapId === 'town') {
    changeMap('meadow', 24, 18)
  }
  const map = currentMap()
  const spec = getActiveWorldBoss()
  game.monsters = game.monsters.filter((m) => !m.isWorldBoss)
  const candidateOffsets = [
    { dx: 36, dy: 0 },
    { dx: -36, dy: 0 },
    { dx: 0, dy: 36 },
    { dx: 0, dy: -36 },
  ]
  let spawnX = p.x
  let spawnY = p.y
  for (const off of candidateOffsets) {
    const cx = Math.max(TILE * 2, Math.min((map.width - 2) * TILE, p.x + off.dx))
    const cy = Math.max(TILE * 2, Math.min((map.height - 2) * TILE, p.y + off.dy))
    if (!boxBlocked(map, cx, cy, 8, 8)) {
      spawnX = cx
      spawnY = cy
      break
    }
  }
  const wbMonster = makeMonster(spec.monsterId, spawnX, spawnY)
  wbMonster.hp = spec.maxHp
  wbMonster.maxHp = spec.maxHp
  wbMonster.provoked = true
  wbMonster.isWorldBoss = true
  wbMonster.worldBossName = spec.name
  game.monsters.push(wbMonster)
  game.panel = null
  addEffect({ type: 'burst', x: spawnX, y: spawnY - 8, r: 34, color: '#f43f5e', max: 0.65 })
  syncBgmForMap(p.mapId, true)
  const msg = `★ อัญเชิญบอสโลก "${spec.name}" ลงสู่แมพ ${map.name} แล้ว! ★`
  say('system', msg)
  notify()
  return { ok: true, message: msg }
}

export function claimWorldBossMilestoneAction(milestoneId: string): { ok: boolean; message: string } {
  const p = player()
  const ext = sanitizeRpgExt(p.rpgExt)
  const spec = getActiveWorldBoss()
  if (ext.worldBossCycleKey !== spec.cycleKey) {
    return { ok: false, message: 'รอบเวิลด์บอสเปลี่ยนแล้ว' }
  }
  const ms = spec.milestones.find((m) => m.id === milestoneId)
  if (!ms) return { ok: false, message: 'ไม่พบรางวัล' }
  if (ext.worldBossDamage < ms.damage) {
    return { ok: false, message: `ต้องทำดาเมจรวมอย่างน้อย ${ms.damage.toLocaleString()}` }
  }
  if (ext.claimedWorldBossMilestones.includes(milestoneId)) {
    return { ok: false, message: 'รับรางวัลระดับนี้ไปแล้ว' }
  }
  ext.claimedWorldBossMilestones.push(milestoneId)
  p.gold += ms.gold
  p.diamonds = (p.diamonds ?? 0) + ms.diamonds
  if (ms.stones > 0) addItem('enhance_stone', ms.stones)
  if (ms.runeId) {
    ext.runeBag[ms.runeId] = (ext.runeBag[ms.runeId] ?? 0) + 1
  }
  p.rpgExt = ext
  saveGame()
  notify()
  return {
    ok: true,
    message: `รับรางวัลเวิลด์บอสสำเร็จ! +${ms.gold.toLocaleString()} G, +${ms.diamonds} เพชร, หิน x${ms.stones}`,
  }
}

/* ---------------- Extended RPG Systems Actions ---------------- */

export function gatherNearbyNodeAction(nodeId?: string): { ok: boolean; message: string } {
  const p = player()
  if (game.gatherCd > 0) {
    return { ok: false, message: `กรุณารอสักครู่ (${game.gatherCd.toFixed(1)}s)` }
  }
  const node = nodeId
    ? GATHERING_NODES.find((n) => n.id === nodeId) ?? null
    : findNearbyGatheringNode(p.mapId, p.x, p.y)
  if (!node) {
    return { ok: false, message: 'ไม่มีแหล่งวัตถุดิบในระยะ (เดินเข้าใกล้จุดเก็บเกี่ยว)' }
  }
  const extV2 = sanitizeExtV2(p.extV2)
  const prog = extV2.lifeSkills[node.skill]
  const drop = rollGatheringDrops(node, prog.level)
  const addedNames: string[] = []
  for (const item of drop.items) {
    if (addItem(item.itemId, item.qty)) {
      addedNames.push(`${ITEMS[item.itemId]?.name ?? item.itemId} x${item.qty}`)
    }
  }
  if (addedNames.length === 0) {
    return { ok: false, message: 'กระเป๋าเต็ม กรุณาเคลียร์ช่องก่อนเก็บเกี่ยว' }
  }
  prog.exp += drop.expGain
  let leveledUp = false
  while (prog.level < 50 && prog.exp >= lifeSkillExpToNext(prog.level)) {
    prog.exp -= lifeSkillExpToNext(prog.level)
    prog.level += 1
    leveledUp = true
  }
  extV2.gatherCount += 1
  const bpRes = grantBattlePassExpToState(extV2.battlePass, 15)
  extV2.battlePass = bpRes.next
  p.extV2 = extV2
  game.gatherCd = 1.6
  addFloat(p.x, p.y - 26, `+${addedNames[0]}`, node.color, 9)
  const meta = LIFE_SKILL_META[node.skill]
  const msg = `${meta.actionLabel}สำเร็จ: ได้ ${addedNames.join(', ')}${leveledUp ? ` · ${meta.label} Lv.${prog.level}!` : ''}`
  say('loot', msg)
  saveGame()
  notify()
  return { ok: true, message: msg }
}

export function cookFoodAction(itemId: string): { ok: boolean; message: string } {
  const p = player()
  const recipe = FOOD_BUFF_DEFS.find((f) => f.itemId === itemId)
  if (!recipe) return { ok: false, message: 'ไม่พบสูตรอาหาร' }
  if (p.gold < recipe.goldCost) return { ok: false, message: `ทองไม่พอ (ต้องการ ${recipe.goldCost.toLocaleString()} G)` }
  for (const ing of recipe.ingredients) {
    if (countItem(ing.itemId) < ing.qty) {
      return { ok: false, message: `วัตถุดิบ ${ITEMS[ing.itemId]?.name ?? ing.itemId} ไม่พอ (ต้องการ ${ing.qty})` }
    }
  }
  if (!addItem(recipe.itemId, 1)) {
    return { ok: false, message: 'กระเป๋าเต็ม' }
  }
  for (const ing of recipe.ingredients) {
    removeItemId(ing.itemId, ing.qty)
  }
  p.gold -= recipe.goldCost
  const extV2 = sanitizeExtV2(p.extV2)
  extV2.battlePass = grantBattlePassExpToState(extV2.battlePass, 20).next
  p.extV2 = extV2
  say('loot', `ปรุงอาหาร ${recipe.name} สำเร็จ! (เก็บไว้ในกระเป๋าและกดใช้เมื่อต้องการบัฟ)`)
  saveGame()
  notify()
  return { ok: true, message: `ปรุง ${recipe.name} สำเร็จ! (กดใช้ในหน้านี้หรือกระเป๋าได้ทันที)` }
}

export function upgradeSkillAction(skillId: string): { ok: boolean; message: string } {
  const p = player()
  const skill = currentJob().skills.find((s) => s.id === skillId)
  if (!skill) return { ok: false, message: 'ไม่พบสกิลของอาชีพปัจจุบัน' }
  p.skillLevels ??= {}
  const curLv = p.skillLevels[skillId] ?? 1
  if (curLv >= MAX_SKILL_UPGRADE) return { ok: false, message: `สกิล ${skill.name} ถึงระดับสูงสุด (Lv.${MAX_SKILL_UPGRADE}) แล้ว` }
  const cost = skillUpgradeCost(curLv)
  if ((p.skillPoints ?? 0) < cost.skillPoints) return { ok: false, message: 'แต้มสกิล (Skill Points) ไม่พอ — ได้รับเมื่อเลเวลอัป' }
  if (p.gold < cost.gold) return { ok: false, message: `ทองไม่พอ (ต้องการ ${cost.gold.toLocaleString()} G)` }
  p.skillPoints = Math.max(0, (p.skillPoints ?? 0) - cost.skillPoints)
  p.gold -= cost.gold
  p.skillLevels[skillId] = curLv + 1
  say('system', `อัปเกรดสกิล ${skill.name} เป็น Lv.${curLv + 1}!`)
  saveGame()
  notify()
  return { ok: true, message: `อัปเกรด ${skill.name} เป็น Lv.${curLv + 1} สำเร็จ!` }
}

export function upgradeTalentAction(talentId: string): { ok: boolean; message: string } {
  const p = player()
  const node = TALENT_NODES.find((t) => t.id === talentId)
  if (!node) return { ok: false, message: 'ไม่พบ Talent ที่เลือก' }
  const extV2 = sanitizeExtV2(p.extV2)
  const curRank = extV2.talents[talentId] ?? 0
  if (curRank >= node.maxRank) return { ok: false, message: `${node.name} ถึงขั้นสูงสุดแล้ว` }
  const costGold = 200 * (curRank + 1)
  if ((p.skillPoints ?? 0) < 1) return { ok: false, message: 'แต้มสกิลไม่พอ (ต้องการ 1 แต้ม)' }
  if (p.gold < costGold) return { ok: false, message: `ทองไม่พอ (ต้องการ ${costGold.toLocaleString()} G)` }
  p.skillPoints = Math.max(0, (p.skillPoints ?? 0) - 1)
  p.gold -= costGold
  extV2.talents[talentId] = curRank + 1
  p.extV2 = extV2
  clampVitals()
  say('system', `อัปเกรด Talent "${node.name}" เป็นระดับ ${curRank + 1}/${node.maxRank}`)
  saveGame()
  notify()
  return { ok: true, message: `อัปเกรด ${node.name} เป็น ${curRank + 1}/${node.maxRank} สำเร็จ!` }
}

export function resetTalentsAction(): { ok: boolean; message: string } {
  const p = player()
  const extV2 = sanitizeExtV2(p.extV2)
  const spent = Object.values(extV2.talents).reduce((s, r) => s + r, 0)
  if (spent === 0) return { ok: false, message: 'ยังไม่มี Talent ที่อัปไว้' }
  if (p.gold < 500) return { ok: false, message: 'ต้องใช้ 500 G เพื่อรีเซ็ตสาย Talent' }
  p.gold -= 500
  p.skillPoints = (p.skillPoints ?? 0) + spent
  extV2.talents = {}
  p.extV2 = extV2
  clampVitals()
  saveGame()
  notify()
  return { ok: true, message: `รีเซ็ตสาย Talent สำเร็จ คืน ${spent} แต้มสกิล` }
}

export function evolveCombatPetAction(petId: string): { ok: boolean; message: string } {
  const p = player()
  p.petState = sanitizePetState(p.petState, p.ownedGemItems, p.equippedGemCompanion)
  const entry = p.petState.ownedPets[petId]
  const def = getCombatPetDef(petId)
  if (!entry || !def) return { ok: false, message: 'ไม่พบสัตว์เลี้ยง' }
  const curStars = entry.stars ?? 1
  if (curStars >= MAX_PET_STARS) return { ok: false, message: 'วิวัฒนาการครบ 5★ สูงสุดแล้ว' }
  const cost = petEvolveCost(curStars)
  if (p.gold < cost.gold) return { ok: false, message: `ทองไม่พอ (ต้องการ ${cost.gold.toLocaleString()} G)` }
  if (countItem('pet_essence') < cost.essence) {
    return { ok: false, message: `ผลึกวิวัฒนาการคู่หูไม่พอ (ต้องการ ${cost.essence} ชิ้น — หาได้จากเก็บเกี่ยว/Battle Pass)` }
  }
  p.gold -= cost.gold
  removeItemId('pet_essence', cost.essence)
  entry.stars = curStars + 1
  clampVitals()
  saveGame()
  notify()
  say('loot', `★ วิวัฒนาการ ${def.name} เป็น ${entry.stars} ดาวสำเร็จ!`)
  return { ok: true, message: `${def.name} วิวัฒนาการเป็น ${entry.stars}★ สำเร็จ! (2★+ ปลดล็อกเก็บของอัตโนมัติ)` }
}

export function unlockBattlePassPremiumAction(): { ok: boolean; message: string } {
  const p = player()
  const extV2 = sanitizeExtV2(p.extV2)
  if (extV2.battlePass.premiumUnlocked) return { ok: false, message: 'เปิดใช้งาน Premium Pass แล้ว' }
  if (p.diamonds < BP_PREMIUM_DIAMOND_COST) {
    return { ok: false, message: `เพชรไม่พอ (ต้องการ ${BP_PREMIUM_DIAMOND_COST} เพชร)` }
  }
  p.diamonds -= BP_PREMIUM_DIAMOND_COST
  extV2.battlePass.premiumUnlocked = true
  p.extV2 = extV2
  saveGame()
  notify()
  return { ok: true, message: 'ปลดล็อก Aurora Premium Battle Pass สำเร็จ!' }
}

export function claimBattlePassTierAction(level: number, track: 'free' | 'prem'): { ok: boolean; message: string } {
  const p = player()
  const extV2 = sanitizeExtV2(p.extV2)
  const bp = extV2.battlePass
  const tier = BATTLE_PASS_TIERS.find((t) => t.level === level)
  if (!tier) return { ok: false, message: 'ไม่พบระดับรางวัล' }
  if (bp.level < level) return { ok: false, message: `ต้องมี Battle Pass Lv.${level} ก่อน` }
  if (track === 'prem' && !bp.premiumUnlocked) return { ok: false, message: 'ต้องปลดล็อก Premium Pass ก่อน' }
  const list = track === 'free' ? bp.claimedFree : bp.claimedPrem
  if (list.includes(level)) return { ok: false, message: 'รับรางวัลขั้นนี้ไปแล้ว' }

  const reward = track === 'free' ? tier.freeReward : tier.premReward
  list.push(level)
  if (reward.gold) p.gold += reward.gold
  if (reward.diamonds) p.diamonds = (p.diamonds ?? 0) + reward.diamonds
  if (reward.stones) addItem('enhance_stone', reward.stones)
  if (reward.itemId) addItem(reward.itemId, reward.qty ?? 1)
  if ('cosmeticId' in reward && reward.cosmeticId && !extV2.unlockedCosmetics.includes(reward.cosmeticId)) {
    extV2.unlockedCosmetics.push(reward.cosmeticId)
  }
  p.extV2 = extV2
  saveGame()
  notify()
  say('loot', `รับรางวัล Battle Pass Lv.${level}: ${reward.label}`)
  return { ok: true, message: `รับ ${reward.label} สำเร็จ!` }
}

export function grantBattlePassExpAction(amount: number) {
  const p = player()
  const extV2 = sanitizeExtV2(p.extV2)
  const res = grantBattlePassExpToState(extV2.battlePass, amount)
  extV2.battlePass = res.next
  p.extV2 = extV2
  saveGame()
  notify()
}

export function unlockCosmeticAction(cosmeticId: string): { ok: boolean; message: string } {
  const p = player()
  const def = getCosmeticDef(cosmeticId)
  if (!def) return { ok: false, message: 'ไม่พบชุดแฟชั่น/ปีก' }
  const extV2 = sanitizeExtV2(p.extV2)
  if (extV2.unlockedCosmetics.includes(cosmeticId)) return { ok: false, message: 'คุณเป็นเจ้าของไอเทมนี้แล้ว' }
  if (def.goldCost && p.gold < def.goldCost) return { ok: false, message: `ทองไม่พอ (ต้องการ ${def.goldCost.toLocaleString()} G)` }
  if (def.diamondCost > 0 && p.diamonds < def.diamondCost) return { ok: false, message: `เพชรไม่พอ (ต้องการ ${def.diamondCost} เพชร)` }
  if (def.goldCost) p.gold -= def.goldCost
  if (def.diamondCost > 0) p.diamonds -= def.diamondCost
  extV2.unlockedCosmetics.push(cosmeticId)
  if (def.slot === 'wing') extV2.equippedWing = cosmeticId
  else if (def.slot === 'weaponSkin') extV2.equippedWeaponSkin = cosmeticId
  else extV2.equippedFrame = cosmeticId
  p.extV2 = extV2
  saveGame()
  notify()
  return { ok: true, message: `ปลดล็อกและสวมใส่ ${def.name} แล้ว!` }
}

export function equipCosmeticAction(slot: CosmeticSlot, cosmeticId: string | null): { ok: boolean; message: string } {
  const p = player()
  const extV2 = sanitizeExtV2(p.extV2)
  if (cosmeticId && !extV2.unlockedCosmetics.includes(cosmeticId)) {
    return { ok: false, message: 'ยังไม่ได้ปลดล็อกแฟชั่นชิ้นนี้' }
  }
  if (slot === 'wing') extV2.equippedWing = cosmeticId
  else if (slot === 'weaponSkin') extV2.equippedWeaponSkin = cosmeticId
  else extV2.equippedFrame = cosmeticId
  p.extV2 = extV2
  saveGame()
  notify()
  return { ok: true, message: cosmeticId ? `สวมใส่ ${getCosmeticDef(cosmeticId)?.name ?? cosmeticId} แล้ว` : 'ถอดเครื่องประดับแล้ว' }
}

export function saveLoadoutAction(index: number, customName?: string): { ok: boolean; message: string } {
  const p = player()
  if (index < 0 || index >= MAX_LOADOUTS) return { ok: false, message: 'ไม่พบสล็อตพรีเซ็ต' }
  const extV2 = sanitizeExtV2(p.extV2)
  const slots: EquipmentSlot[] = ['weapon', 'armor', 'shoes', 'cloak', 'accessory']
  const equipmentUids: Partial<Record<EquipmentSlot, string | null>> = {}
  for (const s of slots) equipmentUids[s] = p.equipment[s]?.uid ?? null
  extV2.loadouts[index] = {
    id: extV2.loadouts[index]?.id ?? `preset_${index + 1}`,
    name: customName?.trim() ? customName.trim().slice(0, 20) : extV2.loadouts[index]?.name ?? `พรีเซ็ต ${index + 1}`,
    equipmentUids,
    wingId: extV2.equippedWing,
    weaponSkinId: extV2.equippedWeaponSkin,
  }
  p.extV2 = extV2
  saveGame()
  notify()
  return { ok: true, message: `บันทึกเซ็ตอุปกรณ์ "${extV2.loadouts[index].name}" แล้ว!` }
}

export function applyLoadoutAction(index: number): { ok: boolean; message: string } {
  const p = player()
  const extV2 = sanitizeExtV2(p.extV2)
  const preset = extV2.loadouts[index]
  if (!preset) return { ok: false, message: 'ไม่พบสล็อตพรีเซ็ต' }
  const slots: EquipmentSlot[] = ['weapon', 'armor', 'shoes', 'cloak', 'accessory']
  let swapped = 0
  for (const slot of slots) {
    const targetUid = preset.equipmentUids[slot]
    if (!targetUid || p.equipment[slot]?.uid === targetUid) continue
    const invItem = p.inventory.find((i) => i.uid === targetUid)
    if (invItem && !canEquip(invItem)) {
      equip(invItem.uid)
      swapped += 1
    }
  }
  if (preset.wingId && extV2.unlockedCosmetics.includes(preset.wingId)) extV2.equippedWing = preset.wingId
  if (preset.weaponSkinId && extV2.unlockedCosmetics.includes(preset.weaponSkinId)) extV2.equippedWeaponSkin = preset.weaponSkinId
  p.extV2 = extV2
  saveGame()
  notify()
  return { ok: true, message: `สลับเป็นเซ็ต "${preset.name}" สำเร็จ (เปลี่ยนอุปกรณ์ ${swapped} ชิ้น)` }
}

export function isBeginnerGuideStepReady(stepId: string, p: SaveData): boolean {
  const ext = sanitizeRpgExt(p.rpgExt)
  const extV2 = sanitizeExtV2(p.extV2)
  switch (stepId) {
    case 'guide_kill_5':
      return p.kills >= 5
    case 'guide_gather_1':
      return extV2.gatherCount >= 1
    case 'guide_enhance_1': {
      const eqPlus = Object.values(p.equipment).some((it) => (it?.plus ?? 0) >= 1)
      const invPlus = p.inventory.some((it) => it.plus >= 1)
      return eqPlus || invPlus || (p.questState?.totalEnhances ?? 0) >= 1
    }
    case 'guide_talent_1': {
      const spentTalents = Object.values(extV2.talents).reduce((s, v) => s + v, 0)
      const upgradedSkill = Object.values(p.skillLevels ?? {}).some((lv) => lv > 1)
      return spentTalents >= 1 || upgradedSkill
    }
    case 'guide_pet_1':
      return Object.keys(p.petState?.ownedPets ?? {}).length >= 1
    case 'guide_dungeon_1': {
      const dungeonRuns = Object.values(ext.dailyDungeonRuns).reduce((s, v) => s + v, 0)
      return (p.towerState?.totalClears ?? 0) >= 1 || dungeonRuns >= 1
    }
    default:
      return false
  }
}

export function claimBeginnerGuideStepAction(stepId: string): { ok: boolean; message: string } {
  const p = player()
  const step = BEGINNER_GUIDE_STEPS.find((s) => s.id === stepId)
  if (!step) return { ok: false, message: 'ไม่พบภารกิจคู่มือ' }
  const extV2 = sanitizeExtV2(p.extV2)
  if (extV2.claimedGuideSteps.includes(stepId)) return { ok: false, message: 'รับรางวัลขั้นนี้ไปแล้ว' }
  if (!isBeginnerGuideStepReady(stepId, p)) return { ok: false, message: 'เงื่อนไขยังไม่ครบ' }

  extV2.claimedGuideSteps.push(stepId)
  p.gold += step.rewardGold
  p.diamonds = (p.diamonds ?? 0) + step.rewardDiamonds
  if (step.rewardStones > 0) addItem('enhance_stone', step.rewardStones)
  extV2.battlePass = grantBattlePassExpToState(extV2.battlePass, 30).next
  p.extV2 = extV2
  saveGame()
  notify()
  return {
    ok: true,
    message: `สำเร็จบทเรียน "${step.title}" (+${step.rewardGold} G, +${step.rewardDiamonds} เพชร, หิน x${step.rewardStones})`,
  }
}

export function claimOfflineAfkAction(): { ok: boolean; message: string } {
  const p = player()
  const summary = game.offlineAfkReward
  if (!summary) return { ok: false, message: 'ไม่มีรางวัลออฟไลน์ค้างรับ' }
  game.offlineAfkReward = null
  p.gold += summary.gold
  if (summary.stones > 0) addItem('enhance_stone', summary.stones)
  gainExp(summary.exp)
  saveGame()
  notify()
  say('loot', `รับรางวัลฟาร์มออฟไลน์ ${summary.elapsedMinutes} นาที: +${summary.gold} G, +${summary.exp} EXP`)
  return { ok: true, message: 'รับรางวัลออฟไลน์สำเร็จ!' }
}

function spawnTownInvasionWave(wave: number) {
  const map = MAPS.town
  const pool = wave === 1 ? ['slime', 'pink_slime', 'goblin'] : wave === 2 ? ['wolf', 'goblin', 'skeleton'] : ['goblin_chief', 'ghost', 'goblin']
  const count = wave === 3 ? 5 : 4
  for (let i = 0; i < count; i++) {
    const defId = pool[i % pool.length]
    const tx = 18 + (i % 3) * 4
    const ty = 12 + Math.floor(i / 3) * 6
    const m = makeMonster(defId, (tx + 0.5) * TILE, (ty + 0.5) * TILE)
    m.respawnAt = Infinity
    m.provoked = true
    game.monsters.push(m)
  }
}

export function startTownInvasionAction(): { ok: boolean; message: string } {
  const p = player()
  if (p.mapId !== 'town') {
    const town = MAPS.town
    changeMap('town', town.spawn.x, town.spawn.y)
  }
  if (game.invasion?.active) return { ok: false, message: 'กิจกรรมป้องกันเมืองกำลังดำเนินอยู่แล้ว!' }
  game.invasion = { active: true, wave: 1, maxWaves: 3, rewardDiamonds: 15 }
  game.monsters = []
  spawnTownInvasionWave(1)
  game.panel = null
  say('gm', '★ สัญญาณเตือนภัย! กองทัพมอนสเตอร์บุกเมือง Wave 1/3 — ช่วยกันปราบให้หมด!')
  notify()
  return { ok: true, message: 'เริ่มภารกิจป้องกันเมือง Wave 1/3 แล้ว!' }
}

export function listInventoryItemForMarketAction(
  itemUid: string,
  qty: number,
): {
  ok: boolean
  message: string
  item?: {
    itemId: string
    itemName: string
    qty: number
    plus: number
    kind: string
    rarity?: EquipmentRarity
    affixes?: ItemAffix[]
  }
} {
  const p = player()
  const it = p.inventory.find((i) => i.uid === itemUid)
  if (!it) return { ok: false, message: 'ไม่พบไอเทมในกระเป๋า' }
  const def = ITEMS[it.itemId]
  if (!isItemListableOnMarket(def, it)) {
    return {
      ok: false,
      message: it.bound ? 'ไอเทมนี้ติดสถานะผูกมัด (Bound) ไม่สามารถลงตลาดได้' : 'ไอเทมนี้ไม่สามารถลงตลาดได้',
    }
  }
  const safeQty = Math.max(1, Math.min(it.qty, Math.floor(qty)))
  const removed = removeUid(p.inventory, itemUid, safeQty)
  if (!removed) return { ok: false, message: 'ไม่สามารถย้ายไอเทมลงตลาดได้' }
  saveGame()
  notify()
  return {
    ok: true,
    message: `ลงขาย ${def?.name ?? removed.itemId} x${removed.qty}`,
    item: {
      itemId: removed.itemId,
      itemName: def?.name ?? removed.itemId,
      qty: removed.qty,
      plus: removed.plus,
      kind: def?.kind ?? 'material',
      rarity: removed.rarity,
      affixes: removed.affixes,
    },
  }
}

export function completeMarketPurchaseAction(
  costGold: number,
  item: { itemId: string; qty: number; plus: number; rarity?: EquipmentRarity; affixes?: ItemAffix[] },
): { ok: boolean; message: string } {
  const p = player()
  if (p.gold < costGold) return { ok: false, message: `ทองไม่พอ (ต้องการ ${costGold.toLocaleString()} G)` }
  if (!addItem(item.itemId, item.qty, item.plus, undefined, undefined, {
    rarity: item.rarity,
    affixes: item.affixes,
    rollAffix: false,
  })) {
    return { ok: false, message: 'กระเป๋าเต็ม กรุณาเคลียร์ช่องก่อนซื้อ' }
  }
  p.gold -= costGold
  saveGame()
  notify()
  return { ok: true, message: `ซื้อ ${ITEMS[item.itemId]?.name ?? item.itemId} x${item.qty} สำเร็จ!` }
}

export function receiveMarketProceedsAction(gold: number) {
  const p = player()
  p.gold += Math.max(0, Math.floor(gold))
  saveGame()
  notify()
}

export function reforgeEquipmentAction(itemUid: string): { ok: boolean; message: string; rarity?: EquipmentRarity; affixes?: ItemAffix[] } {
  const p = player()
  const it = findEquipment(itemUid)
  if (!it) return { ok: false, message: 'ไม่พบอุปกรณ์ที่เลือก' }
  const def = ITEMS[it.itemId]
  if (!def || (def.kind !== 'weapon' && def.kind !== 'armor')) {
    return { ok: false, message: 'รีสุ่มออปชันได้เฉพาะอาวุธและอุปกรณ์สวมใส่' }
  }
  const curRarity = resolveEffectiveRarity(it, def)
  const cost = reforgeCost(def.tier ?? 1, curRarity)
  if (p.gold < cost.gold) return { ok: false, message: `ทองไม่พอ (ต้องการ ${cost.gold.toLocaleString()} G)` }
  if (countItem('enhance_stone') < cost.stones) return { ok: false, message: `หินตีบวกไม่พอ (ต้องการ ${cost.stones} ก้อน)` }

  p.gold -= cost.gold
  removeItemId('enhance_stone', cost.stones)
  const nextRarity = rollEquipmentRarity(def.tier ?? 1, Math.random, 'uncommon')
  const nextAffixes = rollEquipmentAffixes(def.tier ?? 1, nextRarity)
  it.rarity = nextRarity
  it.affixes = nextAffixes
  clampVitals()
  saveGame()
  notify()
  const meta = EQUIPMENT_RARITY_META[nextRarity]
  say('loot', `รีสุ่มออปชัน ${def.name} สำเร็จ: ระดับ [${meta.thaiLabel}] (${nextAffixes.length} ออปชัน)`)
  return {
    ok: true,
    rarity: nextRarity,
    affixes: nextAffixes,
    message: `รีสุ่มได้ระดับ ${meta.thaiLabel} (${nextAffixes.length} ออปชัน)!`,
  }
}

export function usePartyRoleSupportAction(): { ok: boolean; message: string; label?: string } {
  const p = game.p
  if (!p) return { ok: false, message: 'ไม่พบตัวละคร' }
  if (!game.party) return { ok: false, message: 'ต้องอยู่ในปาร์ตี้จึงจะใช้สกิลประสานทีมได้' }
  if (game.partySupportCd > 0) {
    return { ok: false, message: `สกิลประสานทีมคูลดาวน์เหลือ ${game.partySupportCd.toFixed(1)} วิ` }
  }
  const s = getStats(p)
  const eff = computeSupportSkillEffect(p.jobId, s.maxHp, s.atk)
  p.hp = Math.min(s.maxHp, p.hp + eff.healAmount)
  if (eff.kind === 'guard') {
    game.guardUntil = Math.max(game.guardUntil, game.time + 3.5)
  }
  game.partySupportCd = 12
  addEffect({ type: 'ring', x: p.x, y: p.y - 6, r: 44, color: eff.kind === 'heal' ? '#34d399' : '#60a5fa', max: 0.65 })
  addFloat(p.x, p.y - 28, `${eff.label}! +${eff.healAmount}`, eff.kind === 'heal' ? '#34d399' : '#60a5fa', 10)
  say('system', `ใช้สกิลประสานปาร์ตี้ "${eff.label}" (ฟื้นฟู +${eff.healAmount} HP)`, undefined, { channel: 'party' })
  notify()
  return { ok: true, label: eff.label, message: `ใช้ "${eff.label}" สำเร็จ!` }
}

export function blockPlayerAction(targetUid: string): { ok: boolean; message: string } {
  const p = player()
  if (!targetUid) return { ok: false, message: 'ไม่พบผู้เล่น' }
  p.blockedUids ??= []
  if (p.blockedUids.includes(targetUid)) {
    return { ok: true, message: 'ปิดกั้นผู้เล่นนี้อยู่แล้ว' }
  }
  p.blockedUids = [...p.blockedUids.slice(-49), targetUid]
  saveGame()
  notify()
  return { ok: true, message: 'ปิดกั้นข้อความและคำเชิญจากผู้เล่นนี้แล้ว' }
}

export function unblockPlayerAction(targetUid: string): { ok: boolean; message: string } {
  const p = player()
  p.blockedUids = (p.blockedUids ?? []).filter((id) => id !== targetUid)
  saveGame()
  notify()
  return { ok: true, message: 'ปลดบล็อกผู้เล่นเรียบร้อย' }
}

export function isPlayerBlocked(targetUid: string | null | undefined): boolean {
  if (!targetUid || !game.p?.blockedUids) return false
  return game.p.blockedUids.includes(targetUid)
}

export function applyCompletedTradeAction(params: {
  tradeId: string
  giveItemUids: string[]
  giveGold: number
  receiveItems: InvItem[]
  receiveGold: number
  giveGemItems?: string[]
  receiveGemItems?: string[]
}): { ok: boolean; message: string } {
  const p = player()
  p.appliedTradeIds ??= []
  if (p.appliedTradeIds.includes(params.tradeId)) {
    return { ok: true, message: 'อัปเดตผลแลกเปลี่ยนเรียบร้อยแล้ว' }
  }

  for (const uidToRemove of params.giveItemUids) {
    const idx = p.inventory.findIndex((entry) => entry.uid === uidToRemove)
    if (idx >= 0) p.inventory.splice(idx, 1)
  }
  p.gold = Math.max(0, p.gold - Math.max(0, Math.floor(params.giveGold))) + Math.max(0, Math.floor(params.receiveGold))

  for (const item of params.receiveItems) {
    addItem(item.itemId, item.qty, item.plus, undefined, undefined, {
      rarity: item.rarity,
      affixes: item.affixes,
      bound: false,
      rollAffix: false,
    })
  }

  if (params.giveGemItems?.length) {
    const rmSet = new Set(params.giveGemItems)
    p.ownedGemItems = p.ownedGemItems.filter((id) => !rmSet.has(id))
    if (p.equippedGemFashion && rmSet.has(p.equippedGemFashion)) p.equippedGemFashion = null
    if (p.equippedGemCompanion && rmSet.has(p.equippedGemCompanion)) p.equippedGemCompanion = null
  }
  if (params.receiveGemItems?.length) {
    for (const id of params.receiveGemItems) {
      if (!p.ownedGemItems.includes(id)) p.ownedGemItems.push(id)
    }
  }

  p.appliedTradeIds = [...p.appliedTradeIds.slice(-39), params.tradeId]
  clampVitals()
  saveGame()
  notify()
  return { ok: true, message: 'แลกเปลี่ยนสำเร็จและรับไอเทมเข้ากระเป๋าแล้ว!' }
}

export function applyFieldBossRewardAction(reward: { gold: number; diamonds: number; stones: number; bossName: string }) {
  const p = player()
  p.gold += Math.max(0, reward.gold)
  p.diamonds = (p.diamonds ?? 0) + Math.max(0, reward.diamonds)
  if (reward.stones > 0) addItem('enhance_stone', reward.stones)
  saveGame()
  notify()
  say('loot', `★ พิชิต ${reward.bossName}! รับ +${reward.gold.toLocaleString()} G · +${reward.diamonds} เพชร · หิน x${reward.stones}`)
}

export function deductGoldForMailGiftAction(gold: number): boolean {
  const p = player()
  const safe = Math.max(0, Math.floor(gold))
  if (p.gold < safe) return false
  p.gold -= safe
  saveGame()
  notify()
  return true
}

export function claimMailboxRewardAction(reward: {
  gold?: number
  diamonds?: number
  itemId?: string
  qty?: number
  plus?: number
}): { ok: boolean; message: string } {
  const p = player()
  if (reward.itemId && ITEMS[reward.itemId]) {
    if (!addItem(reward.itemId, reward.qty ?? 1, reward.plus ?? 0)) {
      return { ok: false, message: 'กระเป๋าเต็ม กรุณาเคลียร์ช่องก่อนรับของขวัญ' }
    }
  }
  if (reward.gold) p.gold += reward.gold
  if (reward.diamonds) p.diamonds = (p.diamonds ?? 0) + reward.diamonds
  saveGame()
  notify()
  return { ok: true, message: 'รับไอเทมจากจดหมายเข้ากระเป๋าแล้ว!' }
}

export function recordCoopDungeonClearAction(gold: number, diamonds: number, exp: number, stones: number) {
  const p = player()
  p.gold += Math.max(0, gold)
  p.diamonds = (p.diamonds ?? 0) + Math.max(0, diamonds)
  if (stones > 0) addItem('enhance_stone', stones)
  const extV2 = sanitizeExtV2(p.extV2)
  extV2.coopClears += 1
  extV2.battlePass = grantBattlePassExpToState(extV2.battlePass, 35).next
  p.extV2 = extV2
  gainExp(exp)
  saveGame()
  notify()
}

/* ---------------- chat & commands ---------------- */

export function submitChat(raw: string, channelOverride?: ChatChannel) {
  const p = game.p
  if (!p) return
  const text = raw.trim().slice(0, 140)
  if (!text) return
  if (text.startsWith('/')) runCommand(text)
  else {
    const ch = channelOverride && channelOverride !== 'all' ? channelOverride : game.chatChannel === 'all' ? 'world' : game.chatChannel
    say('player', text, p.name, { channel: ch, senderUid: firebaseAuth.currentUser?.uid, senderGameUid: p.gameUid })
    game.bubble = { text, until: game.time + 4 }
  }
  notify()
}

const PUBLIC_HELP = ['/help - ดูคำสั่ง', '/save - บันทึกเกม', '/pos - ดูตำแหน่ง', '/friend <UID> - เพิ่มเพื่อน', '/trade <UID> - ขอแลกเปลี่ยน', '/whisper <UID> <ข้อความ> - กระซิบ', '/clear - ล้างแชท']

const GM_HELP = [
  '/dev - เปิดหน้าต่าง Dev Console (เฉพาะ GM UID 0000)',
  '/level <เลข> - ตั้งเลเวล',
  '/exp <เลข> - เพิ่ม EXP',
  '/gold <เลข> - เพิ่มเงิน',
  '/gem <จำนวน 1-1,000,000> - เสกเพชร (GM เท่านั้น)',
  '/เสกเพชร <จำนวน 1-1,000,000> - คำสั่งภาษาไทย (GM เท่านั้น)',
  '/item <ไอดี> [จำนวน] [บวก] - เสกไอเทม',
  '/allweapons - เสกอาวุธทั้งหมดที่อาชีพนี้ใช้ได้',
  '/items - รายการไอดีไอเทม',
  '/stone <เลข> - เสกหินตีบวก',
  '/tp <แมพ> - วาร์ป (town, meadow, forest, cave, volcano)',
  '/heal - ฟื้นฟู HP/MP เต็ม',
  '/god - เปิด/ปิดอมตะ',
  '/speed <0.5-5> - ความเร็ว',
  '/killall - ฆ่ามอนในแมพ',
  '/spawn <ไอดี> [จำนวน] - เรียกมอนสเตอร์',
  '/mobs - รายการไอดีมอนสเตอร์',
  '/job <ไอดี> - เปลี่ยนอาชีพทันที',
  '/jobs - รายการไอดีอาชีพ',
  '/ban (UID)_(วินาที)_(เหตุผล) - แบนผู้เล่น เช่น /ban 0001_3600_ใช้บอท',
  '/gmchat <ข้อความ> - ประกาศแถบด้านบน',
  '/closegm - ปิดโหมด GM ชั่วคราว',
]

function runCommand(text: string) {
  const p = player()
  const [cmdRaw, ...args] = text.split(/\s+/)
  const cmd = cmdRaw.toLowerCase()
  const num = (i: number, d = 0) => {
    const n = Number(args[i])
    return Number.isFinite(n) ? n : d
  }

  if (cmd === GM_UNLOCK || cmd === '/dev') {
    if (!isCurrentAccountGm()) {
      say('error', 'คำสั่งนี้สงวนเฉพาะ GM บัญชี ffsmilepay53@gmail.com (UID 0000)')
      return
    }
    p.gm = true
    p.gameUid = PERMANENT_GM_GAME_UID
    p.uid = PERMANENT_GM_UID
    if (cmd === '/dev') {
      openPanel('dev-tools')
    } else {
      say('gm', 'โหมด GM/Dev เปิดใช้งานแล้วสำหรับ UID 0000 (ffsmilepay53@gmail.com)')
    }
    saveGame()
    notify()
    return
  }
  switch (cmd) {
    case '/help':
      PUBLIC_HELP.forEach((l) => say('system', l))
      if (p.gm && isCurrentAccountGm()) say('gm', 'พิมพ์ /gm เพื่อดูคำสั่ง GM หรือ /dev เพื่อเปิด Dev Console')
      return
    case '/save':
      saveGame()
      say('system', 'บันทึกเกมเรียบร้อย')
      return
    case '/pos':
      say('system', `${currentMap().name} X:${Math.floor(p.x / TILE)} Y:${Math.floor(p.y / TILE)}`)
      return
    case '/clear':
      game.chat = []
      return
    case '/friend': {
      const target = args[0]
      if (!target) return say('error', 'ใช้ /friend <UID>')
      void sendFriendRequest(target).then((result) => { say(result.ok ? 'system' : 'error', result.message); notify() })
      return
    }
    case '/trade': {
      const target = args[0]
      if (!target) return say('error', 'ใช้ /trade <UID>')
      void createTrade(target).then((result) => { say(result.ok ? 'system' : 'error', result.message); notify() })
      return
    }
    case '/whisper': {
      const target = args[0]
      const body = args.slice(1).join(' ')
      if (!target || !body) return say('error', 'ใช้ /whisper <UID> <ข้อความ>')
      void sendWhisper(target, body).then((result) => { say(result.ok ? 'system' : 'error', result.message); notify() })
      return
    }
  }

  const grantGems = () => {
    const amount = Number(args[0])
    const maxGrant = 1_000_000
    const maxBalance = 1_000_000_000
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > maxGrant) {
      return say('error', 'ใช้ /gem <จำนวนเต็ม 1-1,000,000>')
    }
    const currentBalance = Number.isSafeInteger(p.diamonds) ? Math.max(0, p.diamonds) : 0
    if (currentBalance + amount > maxBalance) {
      return say('error', `ยอดเพชรสูงสุดคือ ${maxBalance.toLocaleString()} เพชร`)
    }
    p.diamonds = currentBalance + amount
    say('gm', `เสกเพชรสำเร็จ +${amount.toLocaleString()} | ยอดรวม ${p.diamonds.toLocaleString()} เพชร`)
  }

  const gmCommands: Record<string, () => void> = {
    '/gm': () => GM_HELP.forEach((l) => say('gm', l)),
    '/gem': grantGems,
    '/เสกเพชร': grantGems,
    '/level': () => {
      const lv = Math.max(1, Math.min(MAX_LEVEL, Math.floor(num(0, p.level))))
      p.level = lv
      p.exp = 0
      onLevelUp(getStats())
      say('gm', `ตั้งเลเวลเป็น ${lv}`)
    },
    '/exp': () => {
      gainExp(Math.max(0, Math.floor(num(0))))
      say('gm', `เพิ่ม EXP ${Math.floor(num(0))}`)
    },
    '/gold': () => {
      p.gold = Math.max(0, p.gold + Math.floor(num(0)))
      say('gm', `เงินปัจจุบัน ${p.gold.toLocaleString()}G`)
    },
  '/item': () => {
  const id = args[0]
  if (!id || !ITEMS[id]) return say('error', 'ไม่พบไอดีไอเทม พิมพ์ /items เพื่อดูรายการ')
  const qty = Math.max(1, Math.min(999, Math.floor(num(1, 1))))
  const plus = Math.max(0, Math.min(MAX_PLUS, Math.floor(num(2, 0))))
  if (addItem(id, qty, plus)) say('gm', `เสก ${ITEMS[id].name}${plus ? ` +${plus}` : ''} x${qty}`)
  else say('error', 'กระเป๋าเต็ม')
  },
  '/allweapons': () => {
  const allowed = new Set(currentJob().weaponTypes)
  const weapons = Object.values(ITEMS).filter((item) => item.kind === 'weapon' && item.weaponType && allowed.has(item.weaponType))
  let added = 0
  for (const item of weapons) {
    if (addItem(item.id, 1)) added++
    else if (addItem(item.id, 1, 0, p.storage, STORAGE_SIZE)) added++
  }
  say('gm', `เสกอาวุธสำหรับอาชีพ ${currentJob().name} แล้ว ${added}/${weapons.length} ชิ้น (ในกระเป๋า/คลัง)`)
  saveGame()
  },
  '/items': () => {
  const ids = Object.keys(ITEMS)
  for (let i = 0; i < ids.length; i += 8) say('gm', ids.slice(i, i + 8).join(', '))
    },
    '/stone': () => {
      const n = Math.max(1, Math.min(999, Math.floor(num(0, 10))))
      addItem('enhance_stone', n)
      say('gm', `เสกหินตีบวก x${n}`)
    },
    '/tp': () => {
      const id = args[0]
      const map = id ? MAPS[id] : null
      if (!map) return say('error', `แมพที่มี: ${MAP_ORDER.join(', ')}`)
      changeMap(map.id, map.spawn.x, map.spawn.y)
    },
    '/heal': () => {
      const s = getStats()
      p.hp = s.maxHp
      p.mp = s.maxMp
      say('gm', 'ฟื้นฟูเต็ม')
    },
    '/god': () => {
      p.god = !p.god
      say('gm', `โหมดอมตะ: ${p.god ? 'เปิด' : 'ปิด'}`)
    },
    '/speed': () => {
      p.speed = Math.max(0.5, Math.min(5, num(0, 1)))
      say('gm', `ความเร็ว x${p.speed}`)
    },
    '/killall': () => {
      let n = 0
      for (const m of game.monsters)
        if (!m.dead) {
          killMonster(m)
          n++
        }
      say('gm', `กำจัดมอนสเตอร์ ${n} ตัว`)
    },
    '/spawn': () => {
      const id = args[0]
      if (!id || !MONSTERS[id]) return say('error', 'ไม่พบไอดีมอนสเตอร์ พิมพ์ /mobs เพื่อดูรายการ')
      const n = Math.max(1, Math.min(20, Math.floor(num(1, 1))))
      const map = currentMap()
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2)
        let x = p.x + Math.cos(a) * 40
        let y = p.y + Math.sin(a) * 40
        if (boxBlocked(map, x, y, 6, 6)) {
          x = p.x
          y = p.y
        }
        const m = makeMonster(id, x, y)
        m.respawnAt = Infinity
        game.monsters.push(m)
      }
      say('gm', `เรียก ${MONSTERS[id].name} x${n}`)
    },
    '/mobs': () => {
      const ids = Object.keys(MONSTERS)
      for (let i = 0; i < ids.length; i += 7) say('gm', ids.slice(i, i + 7).join(', '))
    },
    '/job': () => {
      const id = args[0]
      if (!id || !JOBS[id]) return say('error', `อาชีพที่มี: ${Object.keys(JOBS).join(', ')}`)
      applyJob(id)
      say('gm', `เปลี่ยนอาชีพเป็น ${JOBS[id].name}`)
    },
    '/jobs': () => say('gm', Object.keys(JOBS).join(', ')),
    '/ban': () => {
      const input = args.join(' ').trim()
      const parts = input.split('_').map((part) => part.trim())
      const target = parts[0]
      const duration = parts[1]?.toLowerCase() === 'permanent' || parts[1] === 'ถาวร' ? null : Number(parts[1])
      const reason = parts.slice(2).join('_').trim() || 'ไม่ระบุเหตุผล'
      if (!target || (duration !== null && (!Number.isInteger(duration) || duration <= 0))) return say('error', 'ใช้ /ban (UID)_(วินาที)_(เหตุผล) เช่น /ban 00001_3600_ใช้บอท')
      void createBan(target, duration, reason).then((result) => { say(result.ok ? 'gm' : 'error', result.message); notify() })
    },
    '/gmchat': () => {
      const body = args.join(' ').trim()
      if (!body) return say('error', 'ใช้ /gmchat <ข้อความ>')
      devBroadcastAnnouncement(body)
    },
    '/closegm': () => {
      p.gm = false
      p.god = false
      p.speed = 1
      say('system', 'ปิดโหมด GM ชั่วคราวแล้ว (พิมพ์ /dev เพื่อเปิดใหม่ได้ตลอด)')
    },
  }

  const fn = gmCommands[cmd]
  if (!fn) return say('error', `ไม่รู้จักคำสั่ง ${cmd} พิมพ์ /help`)
  if (!p.gm || !isCurrentAccountGm()) return say('error', 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้ (สงวนเฉพาะ GM ffsmilepay53@gmail.com)')
  fn()
  saveGame()
}

/* ---------------- save / load ---------------- */

export function saveGame() {
  const p = game.p
  if (!p || !game.persist || typeof window === 'undefined') return
  p.savedAt = Date.now()
  try {
    localStorage.setItem(localSaveKey(), JSON.stringify(p))
    game.lastSavedAt = Date.now()
    const syncPromise = saveCloudGame(p).finally(() => {
      if (pendingCloudSavePromise === syncPromise) {
        pendingCloudSavePromise = null
      }
    })
    pendingCloudSavePromise = syncPromise
  } catch {
    say('error', 'บันทึกเกมไม่สำเร็จ')
  }
  game.saveT = 0
}

export async function flushCloudSave(): Promise<void> {
  if (pendingCloudSavePromise) {
    try {
      await pendingCloudSavePromise
    } catch {
      // Ignore transient cloud sync errors.
    }
  }
}

export interface RecoverableLocalSave {
  storageKey: string
  sourceLabel: string
  saveData: SaveData
}

export function listRecoverableLocalSaves(currentUserId?: string): RecoverableLocalSave[] {
  if (typeof window === 'undefined') return []
  const results: RecoverableLocalSave[] = []
  const seen = new Set<string>()
  const currentPrefix = currentUserId ? `${SAVE_KEY}:user:${currentUserId}` : null

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      const isGuest = key === SAVE_KEY
      const isUserSave = key.startsWith(`${SAVE_KEY}:user:`)
      if (!isGuest && !isUserSave) continue
      if (currentPrefix && (key === currentPrefix || key.startsWith(`${currentPrefix}:`))) continue

      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as SaveData
      if (!parsed || parsed.version !== 1 || typeof parsed.name !== 'string') continue

      const sig = `${parsed.name}:${parsed.level}:${parsed.playTime}:${parsed.savedAt}`
      if (seen.has(sig)) continue
      seen.add(sig)

      results.push({
        storageKey: key,
        sourceLabel: isGuest ? 'เซฟ Guest ในเครื่อง' : 'เซฟบัญชีเดิมในเครื่อง',
        saveData: parsed,
      })
    }
  } catch {
    // Ignore storage read errors.
  }

  return results.sort((a, b) => (b.saveData.savedAt ?? 0) - (a.saveData.savedAt ?? 0))
}

async function saveCloudGame(p: SaveData) {
  try {
    const fbUser = firebaseAuth.currentUser
    if (fbUser) {
      const gmAllowed = isGmAccountUser(fbUser)
      p.gm = gmAllowed
      if (!gmAllowed) {
        p.god = false
        p.invisible = false
        p.speed = 1
        if (p.jobId === 'gm') p.jobId = 'novice'
      } else {
        p.gameUid = PERMANENT_GM_GAME_UID
        p.uid = PERMANENT_GM_UID
      }
      setGameAccountIdentity(fbUser.uid, p.uid, p.gameUid, gmAllowed)
      localStorage.setItem(localSaveKey(), JSON.stringify(p))
      await saveUserCharacter(fbUser.uid, activeCharacterSlot, p)
      return
    }
  } catch {
    // Keep local save intact if Firestore sync fails temporarily.
  }

  try {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    if (activeAccountUserId && activeAccountUserId !== auth.user.id) return
    const uid = await resolveGameUid(auth.user.id)
    const { data: currentAuth } = await supabase.auth.getUser()
    if (uid === undefined || currentAuth.user?.id !== auth.user.id) return

    setGameAccountIdentity(auth.user.id, uid)
    p.uid = uid
    p.gm = uid === PERMANENT_GM_UID
    localStorage.setItem(localSaveKey(), JSON.stringify(p))
    await supabase.from('game_players').upsert({
      user_id: auth.user.id,
      display_name: p.name,
      class_id: p.jobId,
      save_data: p,
      x: p.x,
      y: p.y,
      level: p.level,
      last_seen: new Date().toISOString(),
    })
  } catch {
    // Guest saves remain available locally when cloud sync is unavailable.
  }
}

export async function listAccountCharacters(): Promise<CloudCharacterRecord[]> {
  const fbUser = firebaseAuth.currentUser
  if (!fbUser) return []
  setGameAccountIdentity(fbUser.uid)
  await ensureUserProfile(fbUser)
  return listUserCharacters(fbUser.uid)
}

export async function deleteAccountCharacter(slotId: string): Promise<void> {
  const fbUser = firebaseAuth.currentUser
  if (!fbUser) return
  await deleteUserCharacter(fbUser.uid, slotId)
  if (typeof window !== 'undefined') {
    const key = slotId === 'slot_1' ? `${SAVE_KEY}:user:${fbUser.uid}` : `${SAVE_KEY}:user:${fbUser.uid}:${slotId}`
    localStorage.removeItem(key)
  }
}

export async function loadCloudGame() {
  try {
    const fbUser = firebaseAuth.currentUser
    if (fbUser) {
      setGameAccountIdentity(fbUser.uid)
      await ensureUserProfile(fbUser)
      const chars = await listUserCharacters(fbUser.uid)
      const selected = chars.find((c) => c.id === activeCharacterSlot) ?? chars[0]
      if (selected) {
        activeCharacterSlot = selected.id
        const localSlotSave = readSave()
        const resolved = pickNewerSave(selected.saveData, localSlotSave)
        if (resolved.localIsNewer && resolved.save) {
          try {
            await saveUserCharacter(fbUser.uid, activeCharacterSlot, resolved.save)
          } catch {
            // Keep newer local save even if background sync fails.
          }
          return resolved.save
        }
        return resolved.save ?? selected.saveData
      }
      const accountSave = readSave()
      if (accountSave) {
        await saveUserCharacter(fbUser.uid, activeCharacterSlot, accountSave)
        return accountSave
      }
      const legacy = claimLegacySave(fbUser.uid)
      if (legacy) {
        await saveUserCharacter(fbUser.uid, activeCharacterSlot, legacy)
        return legacy
      }
      return null
    }
  } catch {
    // Fall back to local save if Firestore query fails.
  }

  try {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setGameAccountIdentity(null)
      return readSave()
    }

    setGameAccountIdentity(auth.user.id)
    const uid = await resolveGameUid(auth.user.id)
    const { data: currentAuth } = await supabase.auth.getUser()
    if (currentAuth.user?.id !== auth.user.id) return null
    const { data, error } = await supabase
      .from('game_players')
      .select('save_data')
      .eq('user_id', auth.user.id)
      .maybeSingle()
    if (data?.save_data && typeof data.save_data === 'object') {
      return { ...(data.save_data as SaveData), uid, gm: uid === PERMANENT_GM_UID }
    }

    const accountSave = readSave()
    if (accountSave) return accountSave
    if (error) return null
    return claimLegacySave(auth.user.id)
  } catch {
    setGameAccountIdentity(null)
    return readSave()
  }
}

export function readSave(): SaveData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(localSaveKey())
    if (!raw) return null
    const d = JSON.parse(raw) as SaveData
    if (!d || d.version !== 1 || typeof d.name !== 'string') return null
    return d
  } catch {
    return null
  }
}

export function deleteSave() {
  localStorage.removeItem(localSaveKey())
}

function sanitizeList(list: unknown): InvItem[] {
  if (!Array.isArray(list)) return []
  return list
    .filter((i): i is InvItem => !!i && typeof i.itemId === 'string' && !!ITEMS[i.itemId])
    .map((i) => ({
      uid: i.uid || uid(),
      itemId: i.itemId,
      qty: Math.max(1, Math.floor(i.qty || 1)),
      plus: Math.max(0, Math.min(MAX_PLUS, Math.floor(i.plus || 0))),
      rarity: i.rarity && EQUIPMENT_RARITY_META[i.rarity] ? i.rarity : undefined,
      affixes: i.affixes ? sanitizeAffixes(i.affixes) : undefined,
      bound: i.bound ? true : undefined,
    }))
}

function resetRuntime() {
  game.monsters = []
  game.groundDrops = []
  game.floats = []
  game.effects = []
  game.projectiles = []
  game.chat = []
  game.panel = null
  game.partyPanelOpen = false
  game.partyRoleBuffs = {
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
  game.partySupportCd = 0
  game.inspectTarget = null
  game.activeDuelId = null
  game.duelTarget = null
  game.keys.clear()
  game.attackHeld = false
  game.attackAnim = 0
  game.skillAnim = 0
  game.petAttackAnim = 0
  game.skillCd = {}
  game.bubble = null
  game.socialTargetId = null
  game.socialTargetMeta = null
  game.lootToast = null
  game.killToasts = []
  game.time = 0
  game.saveT = 0
  game.combatT = 99
  game.dashCd = 0
  game.invulnUntil = 0
  game.gatherCd = 0
  game.comboCount = 0
  game.comboUntil = 0
  game.ultimateCharge = 0
  game.offlineAfkReward = null
  game.invasion = null
}

function startSession(p: SaveData, welcome: string, persist = false) {
  resetRuntime()
  game.persist = persist
  game.p = p
  const map = currentMap()
  if (boxBlocked(map, p.x, p.y)) {
    p.x = (map.spawn.x + 0.5) * TILE
    p.y = (map.spawn.y + 0.5) * TILE
  }
  populateMap()
  clampVitals()
  syncBgmForMap(map.id, game.monsters.some((m) => !m.dead && Boolean(MONSTERS[m.defId]?.boss)))
  say('system', welcome)
  say('system', 'WASD/ลูกศร เดิน • Space โจมตี • 1-3 สกิล • X แดชหลบ • U ท่าไม้ตาย • E คุย/เก็บเกี่ยว • H ซ่อนUI')
  saveGame()
  notify()
}

export function loadGame(d: SaveData) {
  const inventory = sanitizeList(d.inventory)
  const sanitizeEquipment = (slot: EquipmentSlot, fallback: InvItem | null = null) => {
    const item = d.equipment?.[slot] ?? (slot === 'armor' ? fallback : null)
    const candidate = sanitizeList(item ? [item] : [])[0] ?? null
    if (!candidate) return null

    const def = ITEMS[candidate.itemId]
    const compatible = slot === 'weapon'
      ? def.kind === 'weapon'
      : def.kind === 'armor' && (def.slot ?? 'armor') === slot
    if (compatible) return candidate

    if (!inventory.some((entry) => entry.uid === candidate.uid)) inventory.push(candidate)
    return null
  }
  const legacyArmor = d.equipment?.armor ? sanitizeList([d.equipment.armor])[0] ?? null : null
  const weapon = sanitizeEquipment('weapon')
  const armor = sanitizeEquipment('armor', legacyArmor)
  const shoes = sanitizeEquipment('shoes')
  const cloak = sanitizeEquipment('cloak')
  const accessory = sanitizeEquipment('accessory')
  const gmAllowed = isCurrentAccountGm()
  const resolvedGameUid = gmAllowed ? PERMANENT_GM_GAME_UID : activeAccountGameUid
  const resolvedNumericUid = gmAllowed ? PERMANENT_GM_UID : activeAccountUid
  const finiteInt = (val: unknown, min: number, max: number, fallback: number) => {
    const n = typeof val === 'number' ? val : Number(val)
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback
  }
  const sanitizeSkillLevels = (raw: unknown): Record<string, number> => {
    if (!raw || typeof raw !== 'object') return {}
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof k === 'string' && k.length > 0 && k.length <= 64 && typeof v === 'number' && Number.isFinite(v)) {
        out[k] = Math.max(1, Math.min(99, Math.floor(v)))
      }
    }
    return out
  }
  const p: SaveData = {
    version: 1,
    name: (typeof d.name === 'string' ? d.name.trim().slice(0, 16) : '') || 'นักผจญภัย',
    jobId: typeof d.jobId === 'string' && JOBS[d.jobId] && (d.jobId !== 'gm' || gmAllowed) ? d.jobId : 'novice',
    level: finiteInt(d.level, 1, MAX_LEVEL, 1),
    exp: finiteInt(d.exp, 0, Number.MAX_SAFE_INTEGER, 0),
    hp: finiteInt(d.hp, 0, Number.MAX_SAFE_INTEGER, 1),
    mp: finiteInt(d.mp, 0, Number.MAX_SAFE_INTEGER, 0),
    gold: finiteInt(d.gold, 0, Number.MAX_SAFE_INTEGER, 0),
    diamonds: finiteInt(d.diamonds, 0, Number.MAX_SAFE_INTEGER, 0),
    ownedGemItems: Array.isArray(d.ownedGemItems)
      ? [...new Set(d.ownedGemItems.filter((id): id is string => typeof id === 'string' && GEM_SHOP_ITEMS.some((item) => item.id === id && item.category !== 'utility')))]
      : [],
    equippedGemFashion: GEM_SHOP_ITEMS.some((item) => item.id === d.equippedGemFashion && item.category === 'fashion' && d.ownedGemItems?.includes(item.id)) ? d.equippedGemFashion : null,
    equippedGemCompanion: GEM_SHOP_ITEMS.some((item) => item.id === d.equippedGemCompanion && item.category === 'companions' && d.ownedGemItems?.includes(item.id)) ? d.equippedGemCompanion : null,
    lootMagnetUntil: Number.isFinite(d.lootMagnetUntil) ? Math.max(0, d.lootMagnetUntil) : 0,
    inventoryCapacityBonus: Math.floor(finiteInt(d.inventoryCapacityBonus, 0, 60, 0) / 20) * 20,
    inventory,
    storage: sanitizeList(d.storage),
    storageGold: finiteInt(d.storageGold, 0, Number.MAX_SAFE_INTEGER, 0),
    equipment: { weapon, armor, shoes, cloak, accessory },
    mapId: typeof d.mapId === 'string' && MAPS[d.mapId] ? d.mapId : 'town',
    x: Number.isFinite(d.x) ? d.x : (MAPS.town.spawn.x + 0.5) * TILE,
    y: Number.isFinite(d.y) ? d.y : (MAPS.town.spawn.y + 0.5) * TILE,
    uid: resolvedNumericUid,
    gameUid: resolvedGameUid,
    gm: gmAllowed,
    god: false,
    invisible: false,
    speed: 1,
    playTime: typeof d.playTime === 'number' && Number.isFinite(d.playTime) ? Math.max(0, d.playTime) : 0,
    kills: finiteInt(d.kills, 0, Number.MAX_SAFE_INTEGER, 0),
    savedAt: typeof d.savedAt === 'number' && Number.isFinite(d.savedAt) ? d.savedAt : Date.now(),
    statPoints: finiteInt(d.statPoints, 0, 100000, 0),
    skillPoints: finiteInt(d.skillPoints, 0, 100000, 0),
    skillLevels: sanitizeSkillLevels(d.skillLevels),
    rebirthCount: finiteInt(d.rebirthCount, 0, 6, 0),
    rebirthBonus: {
      maxHp: finiteInt(d.rebirthBonus?.maxHp, 0, Number.MAX_SAFE_INTEGER, 0),
      maxMp: finiteInt(d.rebirthBonus?.maxMp, 0, Number.MAX_SAFE_INTEGER, 0),
      atk: finiteInt(d.rebirthBonus?.atk, 0, Number.MAX_SAFE_INTEGER, 0),
      def: finiteInt(d.rebirthBonus?.def, 0, Number.MAX_SAFE_INTEGER, 0),
    },
    petState: sanitizePetState(d.petState, d.ownedGemItems ?? [], d.equippedGemCompanion ?? null),
    mountState: sanitizeMountState(d.mountState, d.ownedGemItems ?? []),
    questState: sanitizeQuestState(d.questState, finiteInt(d.kills, 0, Number.MAX_SAFE_INTEGER, 0)),
    towerState: sanitizeTowerState(d.towerState),
    rpgExt: sanitizeRpgExt(d.rpgExt),
    extV2: sanitizeExtV2(d.extV2),
    blockedUids: Array.isArray(d.blockedUids) ? [...new Set(d.blockedUids.filter((x): x is string => typeof x === 'string').slice(0, 50))] : [],
    appliedTradeIds: Array.isArray(d.appliedTradeIds) ? [...new Set(d.appliedTradeIds.filter((x): x is string => typeof x === 'string').slice(-40))] : [],
  }
  if (p.hp <= 0) p.hp = getStats(p).maxHp
  const prevSavedAt = p.savedAt
  startSession(p, `ยินดีต้อนรับกลับ ${p.name}! โหลดความคืบหน้าล่าสุดแล้ว`, true)
  game.offlineAfkReward = calculateOfflineAfkRewards(Date.now() - prevSavedAt, p.level, p.mapId)
  if (game.offlineAfkReward) notify()
}

export function newGame(name: string) {
  const town = MAPS.town
  const gmAllowed = isCurrentAccountGm()
  const resolvedGameUid = gmAllowed ? PERMANENT_GM_GAME_UID : activeAccountGameUid
  const resolvedNumericUid = gmAllowed ? PERMANENT_GM_UID : activeAccountUid
  const p: SaveData = {
    version: 1,
    name: name.trim().slice(0, 16) || 'นักผจญภัย',
    jobId: 'novice',
    level: 1,
    exp: 0,
    hp: 1,
    mp: 1,
    gold: 300,
    diamonds: 0,
    ownedGemItems: [],
    equippedGemFashion: null,
    equippedGemCompanion: null,
    lootMagnetUntil: 0,
    inventoryCapacityBonus: 0,
    inventory: [],
    storage: [],
    storageGold: 0,
    equipment: {
      weapon: { uid: uid(), itemId: 'wooden_stick', qty: 1, plus: 0 },
      armor: { uid: uid(), itemId: 'cloth_armor', qty: 1, plus: 0 },
      shoes: null,
      cloak: null,
      accessory: null,
    },
    mapId: 'town',
    x: (town.spawn.x + 0.5) * TILE,
    y: (town.spawn.y + 0.5) * TILE,
    gm: gmAllowed,
    uid: resolvedNumericUid,
    gameUid: resolvedGameUid,
    god: false,
    invisible: false,
    speed: 1,
    playTime: 0,
    kills: 0,
    savedAt: Date.now(),
    petState: createDefaultPetState(),
    mountState: createDefaultMountState(),
    questState: createDefaultQuestState(0),
    towerState: createDefaultTowerState(),
    rpgExt: createDefaultRpgExt(),
    extV2: createDefaultExtV2(),
  }
  const s = getStats(p)
  p.hp = s.maxHp
  p.mp = s.maxMp
  game.p = p
  addItem('red_potion', 15)
  addItem('blue_potion', 5)
  addItem('return_scroll', 3)
  startSession(p, `ยินดีต้อนรับสู่โลกพิกเซล ${p.name}! ออกไปทางตะวันออกของเมืองเพื่อล่ามอนสเตอร์`, true)
}

export function quitToTitle() {
  saveGame()
  stopBgm()
  game.p = null
  resetRuntime()
  notify()
}

/* ---------------- update ---------------- */

const KEYMAP: Record<string, [number, number]> = {
  arrowup: [0, -1],
  w: [0, -1],
  arrowdown: [0, 1],
  s: [0, 1],
  arrowleft: [-1, 0],
  a: [-1, 0],
  arrowright: [1, 0],
  d: [1, 0],
}

function moveEntity(map: MapDef, e: { x: number; y: number }, dx: number, dy: number, hw = 4, hh = 3) {
  if (dx && !boxBlocked(map, e.x + dx, e.y, hw, hh)) e.x += dx
  if (dy && !boxBlocked(map, e.x, e.y + dy, hw, hh)) e.y += dy
}

export function update(dt: number) {
  const p = game.p
  if (!p) return
  const map = currentMap()
  game.time += dt
  p.playTime += dt
  game.attackCd -= dt
  game.attackAnim = Math.max(0, game.attackAnim - dt)
  game.skillAnim = Math.max(0, game.skillAnim - dt)
  game.petAttackCd = Math.max(0, game.petAttackCd - dt)
  game.petAttackAnim = Math.max(0, game.petAttackAnim - dt)
  game.guardCd = Math.max(0, game.guardCd - dt)
  game.dashCd = Math.max(0, game.dashCd - dt)
  game.gatherCd = Math.max(0, game.gatherCd - dt)
  game.partySupportCd = Math.max(0, game.partySupportCd - dt)
  for (const k in game.skillCd) game.skillCd[k] -= dt
  game.combatT += dt
  if (game.comboCount > 0 && game.time > game.comboUntil) {
    game.comboCount = 0
  }
  const prevNearNpcId = game.nearNpc?.id ?? null
  let uiDirty = false
  if (game.killToasts.some((t) => t.until <= game.time)) {
    game.killToasts = game.killToasts.filter((t) => t.until > game.time)
    uiDirty = true
  }
  if (game.lootToast && game.lootToast.until <= game.time) {
    game.lootToast = null
    uiDirty = true
  }
  if (game.announcement && game.announcement.until <= Date.now()) {
    game.announcement = null
    uiDirty = true
  }

  let mx = 0
  let my = 0
  if (!game.panel)
    for (const k of game.keys) {
      const v = KEYMAP[k]
      if (v) {
        mx += v[0]
        my += v[1]
      }
    }
  game.moving = mx !== 0 || my !== 0
  if (game.moving) {
    const len = Math.hypot(mx, my)
    const sp = getStats().speed * dt
    moveEntity(map, p, (mx / len) * sp, (my / len) * sp)
    game.walkT += dt
    game.facing = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 'left' : 'right') : my < 0 ? 'up' : 'down'
  }

  const tx = Math.floor(p.x / TILE)
  const ty = Math.floor(p.y / TILE)
  for (const pt of map.portals) {
    if (tx >= pt.x && tx < pt.x + pt.w && ty >= pt.y && ty < pt.y + pt.h) {
      changeMap(pt.to, pt.tx, pt.ty)
      return
    }
  }

  game.nearNpc = null
  for (const n of map.npcs) {
    if (Math.hypot(n.x * TILE - p.x, n.y * TILE + 8 - p.y) < 30) {
      game.nearNpc = n
      break
    }
  }
  if ((game.nearNpc?.id ?? null) !== prevNearNpcId) {
    uiDirty = true
  }

  if (game.attackHeld) basicAttack()
  if (game.autoFarm && !game.panel) {
    if (game.autoSkills && currentJob().skills.length) castSkill(game.autoSkillIndex % currentJob().skills.length)
    else basicAttack()
  }

  // Active combat pet auto-assist projectile
  if (!map.safe && game.petAttackCd <= 0) {
    const petBonus = getActivePetBonuses(p.petState, p.equippedGemCompanion, p.ownedGemItems)
    if (petBonus) {
      let bestTarget: Monster | null = null
      let bestDist = 135
      for (const m of game.monsters) {
        if (m.dead) continue
        const d = Math.hypot(m.x - p.x, m.y - p.y)
        if (d < bestDist && (m.provoked || game.autoFarm || d < 85)) {
          bestDist = d
          bestTarget = m
        }
      }
      if (bestTarget) {
        game.petAttackCd = petBonus.attackInterval
        game.petAttackAnim = 0.45
        const petOffsetX = game.facing === 'left' ? 12 : game.facing === 'right' ? -12 : -14
        game.projectiles.push({
          x: p.x + petOffsetX,
          y: p.y - 10,
          targetUid: bestTarget.uid,
          speed: 195,
          color: petBonus.def.colors.accent,
          size: 2.5,
          mults: [],
          aoe: 0,
          delay: 0,
          flatDmg: petBonus.companionAtk,
        })
      }
    }
  }

  collectGroundDrops()

  updateMonsters(dt, map)
  updateProjectiles(dt)

  for (const f of game.floats) {
    f.life -= dt
    f.y -= 22 * dt
  }
  game.floats = game.floats.filter((f) => f.life > 0)
  for (const e of game.effects) e.life -= dt
  game.effects = game.effects.filter((e) => e.life > 0)
  if (game.bubble && game.time > game.bubble.until) game.bubble = null

  game.regenT += dt
  if (game.regenT >= 2) {
    game.regenT = 0
    const synergyRegen = game.partyRoleBuffs.hpRegenPct / 100
    if (game.combatT > 4 || synergyRegen > 0) {
      const s = getStats()
      const baseRate = game.combatT > 4 ? (map.safe ? 0.08 : 0.025) : 0
      const hpRate = baseRate + synergyRegen
      const prevHp = p.hp
      const prevMp = p.mp
      if (hpRate > 0) {
        p.hp = Math.min(s.maxHp, p.hp + Math.max(1, Math.floor(s.maxHp * hpRate)))
      }
      if (baseRate > 0) {
        p.mp = Math.min(s.maxMp, p.mp + Math.max(1, Math.floor(s.maxMp * baseRate)))
      }
      if (p.hp !== prevHp || p.mp !== prevMp) uiDirty = true
    }
  }

  if (uiDirty) notify()

  if (game.invasion?.active && map.id === 'town' && game.monsters.every((m) => m.dead)) {
    if (game.invasion.wave < game.invasion.maxWaves) {
      game.invasion.wave += 1
      game.monsters = []
      spawnTownInvasionWave(game.invasion.wave)
      say('gm', `★ กองทัพบุกเมือง Wave ${game.invasion.wave}/${game.invasion.maxWaves} มาถึงแล้ว!`)
    } else {
      const rewardD = game.invasion.rewardDiamonds
      game.invasion = null
      game.monsters = []
      p.gold += 800
      p.diamonds = (p.diamonds ?? 0) + rewardD
      const extV2 = sanitizeExtV2(p.extV2)
      extV2.invasionWavesCleared += 1
      extV2.battlePass = grantBattlePassExpToState(extV2.battlePass, 50).next
      p.extV2 = extV2
      gainExp(350)
      say('loot', `★ ป้องกันเมืองสำเร็จ! รับ +800 G · +${rewardD} เพชร · +350 EXP`)
      saveGame()
    }
    notify()
  }

  game.saveT += dt
  if (game.saveT >= 10) saveGame()
}

function updateMonsters(dt: number, map: MapDef) {
  const p = player()
  for (const m of game.monsters) {
    if (m.dead) {
      if ((m.dyingT ?? 0) > 0) {
        m.dyingT = Math.max(0, (m.dyingT ?? 0) - dt)
      }
      if (game.time >= m.respawnAt) {
        const pt = map.id === 'cave' && m.defId === 'earth_golem'
          ? earthBossSpawnPoint(map)
          : randomSpawnPoint(map)
        Object.assign(m, { x: pt.x, y: pt.y, homeX: pt.x, homeY: pt.y, hp: m.maxHp, dead: false, dyingT: 0, provoked: false, moving: false })
      }
      continue
    }
    m.animT += dt
    m.hitFlash -= dt
    m.attackCd -= dt
    m.lunge = Math.max(0, m.lunge - dt)
    m.moving = false
    if (map.safe && !(game.invasion?.active && map.id === 'town')) continue
    const previousX = m.x
    const previousY = m.y
    const def = MONSTERS[m.defId]
    if (!def) continue
    const dx = p.x - m.x
    const dy = p.y - m.y
    const d = Math.hypot(dx, dy)
    const aggro = !p.invisible && (m.provoked || (def.aggro > 0 && d < def.aggro)) && d < 260
    if (aggro) {
      m.provoked = true
      m.flip = dx < 0
      if (d > 14) moveEntity(map, m, (dx / d) * def.speed * dt, (dy / d) * def.speed * dt, 5, 4)
      else if (m.attackCd <= 0) {
        m.attackCd = def.boss ? 2 : 1.4
        m.lunge = 0.3
        hurtPlayer(def.atk)
        if (def.boss && Math.random() < 0.45) {
          addEffect({ type: 'ring', x: p.x, y: p.y - 6, r: 34, color: def.color, max: 0.55 })
          addEffect({ type: 'burst', x: p.x, y: p.y - 6, r: 22, color: '#ff4d6d', max: 0.35 })
          hurtPlayer(def.atk * 0.65)
          addFloat(p.x, p.y - 34, 'BOSS SKILL', '#ff4d6d', 13)
        }
        if (!game.p || game.p.mapId !== map.id) return
      }
    } else {
      m.provoked = false
      m.wanderT -= dt
      if (m.wanderT <= 0) {
        m.wanderT = rand(1.5, 4)
        const hd = Math.hypot(m.homeX - m.x, m.homeY - m.y)
        if (hd > 80) {
          m.vx = (m.homeX - m.x) / hd
          m.vy = (m.homeY - m.y) / hd
        } else if (Math.random() < 0.4) {
          m.vx = 0
          m.vy = 0
        } else {
          const a = rand(0, Math.PI * 2)
          m.vx = Math.cos(a)
          m.vy = Math.sin(a)
        }
      }
      if (m.vx) m.flip = m.vx < 0
      moveEntity(map, m, m.vx * def.speed * 0.45 * dt, m.vy * def.speed * 0.45 * dt, 5, 4)
    }
    m.moving = Math.hypot(m.x - previousX, m.y - previousY) > 0.05
  }
}

function updateProjectiles(dt: number) {
  const keep: Projectile[] = []
  for (const pr of game.projectiles) {
    if (pr.delay > 0) {
      pr.delay -= dt
      const p = player()
      pr.x = p.x
      pr.y = p.y - 10
      keep.push(pr)
      continue
    }
    const t = game.monsters.find((m) => m.uid === pr.targetUid)
    if (!t || t.dead) continue
    const tx = t.x
    const ty = t.y - 8
    const d = Math.hypot(tx - pr.x, ty - pr.y)
    const step = pr.speed * dt
    if (d <= step + 4) {
      if (typeof pr.flatDmg === 'number') {
        const def = MONSTERS[t.defId]
        if (def) {
          const raw = (pr.flatDmg * pr.flatDmg) / Math.max(1, pr.flatDmg + def.def * 0.55)
          const dmg = Math.max(2, Math.round(raw * rand(0.92, 1.08)))
          t.hp -= dmg
          t.provoked = true
          t.hitFlash = 0.12
          addFloat(t.x, t.y - 24, `${dmg}`, pr.color, 13)
          if (t.hp <= 0) killMonster(t)
        }
      } else {
        for (const mult of pr.mults) damageMonster(t, mult, pr.skillId)
      }
      addEffect({ type: 'spark', x: tx, y: ty, r: 6 + pr.size * 2, color: pr.color, max: 0.2 })
      continue
    }
    pr.x += ((tx - pr.x) / d) * step
    pr.y += ((ty - pr.y) / d) * step
    keep.push(pr)
  }
  game.projectiles = keep
}

export function isWalkablePx(x: number, y: number) {
  return !isSolidPx(currentMap(), x, y)
}
