'use client'

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { auth, db } from './client'
import {
  getActiveWorldBoss,
  guildExpToNext,
  SEED_RIVAL_HEROES,
  type LeaderboardHeroEntry,
} from '@/lib/game/rpg-systems'

export interface GuildRecord {
  guildId: string
  name: string
  tag: string
  leaderId: string
  leaderName: string
  level: number
  exp: number
  totalDonatedGold: number
  memberIds: string[]
  memberCount: number
  notice: string
  isLocalOnly?: boolean
}

export interface WorldBossContributionRecord {
  userId: string
  name: string
  jobId: string
  level: number
  damage: number
}

export interface WorldBossRaidState {
  cycleKey: string
  bossId: string
  name: string
  maxHp: number
  currentHp: number
  totalDamageDealt: number
  contributions: WorldBossContributionRecord[]
}

const LOCAL_GUILDS_KEY = 'pixel-rpg-local-guilds-v1'
const LOCAL_WB_KEY = 'pixel-rpg-local-worldboss-v1'
const LOCAL_LEADERBOARD_KEY = 'pixel-rpg-local-leaderboard-v1'

const SEED_GUILDS: GuildRecord[] = [
  {
    guildId: 'guild_starlight',
    name: 'ภาคีอัศวินแสงดาว',
    tag: 'STAR',
    leaderId: 'seed_kael',
    leaderName: 'เคเอลผู้พิทักษ์',
    level: 4,
    exp: 600,
    totalDonatedGold: 8400,
    memberIds: ['seed_kael', 'seed_aria'],
    memberCount: 2,
    notice: 'ช่วยกันบริจาคและร่วมตีเวิลด์บอสทุกชั่วโมง!',
    isLocalOnly: true,
  },
  {
    guildId: 'guild_abyss_watchers',
    name: 'หอคอยดาราพิทักษ์โลก',
    tag: 'APEX',
    leaderId: 'seed_lyra',
    leaderName: 'ไลราสายฟ้า',
    level: 6,
    exp: 1100,
    totalDonatedGold: 16200,
    memberIds: ['seed_lyra', 'seed_zen', 'seed_kuro'],
    memberCount: 3,
    notice: 'ยินดีต้อนรับนักผจญภัยทุกอาชีพ',
    isLocalOnly: true,
  },
]

function isSignedInVerified(): boolean {
  const user = auth.currentUser
  return Boolean(user && user.emailVerified)
}

function readLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeLocalJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage quota errors cleanly.
  }
}

/* ========================================================================== */
/* GUILD OPERATIONS (FIRESTORE + GUEST FALLBACK)                              */
/* ========================================================================== */

export async function listGuildsOnline(): Promise<GuildRecord[]> {
  const localGuilds = readLocalJson<GuildRecord[]>(LOCAL_GUILDS_KEY, SEED_GUILDS)
  if (!isSignedInVerified()) {
    return localGuilds
  }
  try {
    const q = query(collection(db, 'guilds'), where('level', '>=', 1), orderBy('level', 'desc'), limit(24))
    const snap = await getDocs(q)
    const remote = snap.docs.map((d) => d.data() as GuildRecord)
    const seen = new Set(remote.map((g) => g.guildId))
    return [...remote, ...localGuilds.filter((g) => !seen.has(g.guildId))]
  } catch {
    return localGuilds
  }
}

export async function createGuildOnline(input: {
  name: string
  tag: string
  leaderName: string
}): Promise<{ ok: boolean; guild?: GuildRecord; error?: string }> {
  const cleanName = input.name.trim().slice(0, 28)
  const cleanTag = input.tag.trim().toUpperCase().replace(/[^A-Z0-9ก-ฮ]/g, '').slice(0, 5) || 'HERO'
  if (cleanName.length < 2) {
    return { ok: false, error: 'ชื่อกิลด์ต้องมีอย่างน้อย 2 ตัวอักษร' }
  }
  const user = auth.currentUser
  const guildId = `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const leaderId = user?.uid ?? 'guest_player'
  const record: GuildRecord = {
    guildId,
    name: cleanName,
    tag: cleanTag,
    leaderId,
    leaderName: input.leaderName.slice(0, 24),
    level: 1,
    exp: 0,
    totalDonatedGold: 0,
    memberIds: [leaderId],
    memberCount: 1,
    notice: 'ก่อตั้งกิลด์ใหม่! ร่วมผจญภัยไปด้วยกัน',
    isLocalOnly: !isSignedInVerified(),
  }

  if (isSignedInVerified() && user) {
    try {
      await setDoc(doc(db, 'guilds', guildId), {
        ...record,
        isLocalOnly: undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return { ok: true, guild: { ...record, isLocalOnly: false } }
    } catch {
      // Fallback to localStorage seamlessly if Firestore unavailable.
    }
  }

  const local = readLocalJson<GuildRecord[]>(LOCAL_GUILDS_KEY, SEED_GUILDS)
  const next = [record, ...local.filter((g) => g.guildId !== guildId)]
  writeLocalJson(LOCAL_GUILDS_KEY, next)
  return { ok: true, guild: record }
}

export async function joinGuildOnline(guildId: string): Promise<{ ok: boolean; guild?: GuildRecord; error?: string }> {
  const user = auth.currentUser
  const uid = user?.uid ?? 'guest_player'

  if (isSignedInVerified() && user && !guildId.startsWith('guild_')) {
    try {
      const ref = doc(db, 'guilds', guildId)
      const updated = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists()) return null
        const data = snap.data() as GuildRecord
        if (data.memberIds.includes(uid)) return data
        if (data.memberCount >= 30) throw new Error('กิลด์เต็มแล้ว (30/30)')
        const nextIds = [...data.memberIds, uid]
        tx.update(ref, {
          memberIds: nextIds,
          memberCount: nextIds.length,
          updatedAt: serverTimestamp(),
        })
        return { ...data, memberIds: nextIds, memberCount: nextIds.length }
      })
      if (updated) return { ok: true, guild: updated }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'เข้าร่วมกิลด์ไม่สำเร็จ' }
    }
  }

  const local = readLocalJson<GuildRecord[]>(LOCAL_GUILDS_KEY, SEED_GUILDS)
  const found = local.find((g) => g.guildId === guildId)
  if (!found) return { ok: false, error: 'ไม่พบกิลด์ที่เลือก' }
  const nextIds = found.memberIds.includes(uid) ? found.memberIds : [...found.memberIds, uid]
  const updatedLocal: GuildRecord = { ...found, memberIds: nextIds, memberCount: nextIds.length }
  writeLocalJson(
    LOCAL_GUILDS_KEY,
    local.map((g) => (g.guildId === guildId ? updatedLocal : g)),
  )
  return { ok: true, guild: updatedLocal }
}

export async function leaveGuildOnline(guildId: string): Promise<void> {
  const user = auth.currentUser
  const uid = user?.uid ?? 'guest_player'

  if (isSignedInVerified() && user && !guildId.startsWith('guild_')) {
    try {
      const ref = doc(db, 'guilds', guildId)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data() as GuildRecord
        if (data.leaderId === uid && data.memberCount <= 1) {
          await deleteDoc(ref)
          return
        }
        const nextIds = data.memberIds.filter((id) => id !== uid)
        if (nextIds.length > 0 && data.leaderId !== uid) {
          await updateDoc(ref, {
            memberIds: nextIds,
            memberCount: nextIds.length,
            updatedAt: serverTimestamp(),
          })
          return
        }
      }
    } catch {
      // Fallback below.
    }
  }

  const local = readLocalJson<GuildRecord[]>(LOCAL_GUILDS_KEY, SEED_GUILDS)
  const next = local
    .map((g) => {
      if (g.guildId !== guildId) return g
      const nextIds = g.memberIds.filter((id) => id !== uid)
      return { ...g, memberIds: nextIds, memberCount: nextIds.length }
    })
    .filter((g) => g.memberCount > 0 || g.guildId.startsWith('guild_'))
  writeLocalJson(LOCAL_GUILDS_KEY, next)
}

export async function donateGuildOnline(
  guildId: string,
  amount: number,
): Promise<{ ok: boolean; newLevel: number; expAdded: number; error?: string }> {
  const expGain = Math.max(10, Math.floor(amount / 2))
  const user = auth.currentUser

  if (isSignedInVerified() && user && !guildId.startsWith('guild_')) {
    try {
      const ref = doc(db, 'guilds', guildId)
      const res = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists()) return null
        const data = snap.data() as GuildRecord
        let lv = data.level
        let exp = data.exp + expGain
        while (lv < 50 && exp >= guildExpToNext(lv)) {
          exp -= guildExpToNext(lv)
          lv += 1
        }
        tx.update(ref, {
          level: lv,
          exp,
          totalDonatedGold: data.totalDonatedGold + amount,
          updatedAt: serverTimestamp(),
        })
        return { newLevel: lv }
      })
      if (res) return { ok: true, newLevel: res.newLevel, expAdded: expGain }
    } catch {
      // Fall through to local update cleanly.
    }
  }

  const local = readLocalJson<GuildRecord[]>(LOCAL_GUILDS_KEY, SEED_GUILDS)
  let finalLv = 1
  const next = local.map((g) => {
    if (g.guildId !== guildId) return g
    let lv = g.level
    let exp = g.exp + expGain
    while (lv < 50 && exp >= guildExpToNext(lv)) {
      exp -= guildExpToNext(lv)
      lv += 1
    }
    finalLv = lv
    return { ...g, level: lv, exp, totalDonatedGold: g.totalDonatedGold + amount }
  })
  writeLocalJson(LOCAL_GUILDS_KEY, next)
  return { ok: true, newLevel: finalLv, expAdded: expGain }
}

/* ========================================================================== */
/* LEADERBOARD & ASYNC PVP SYNC                                               */
/* ========================================================================== */

export async function syncLeaderboardHero(entry: LeaderboardHeroEntry): Promise<void> {
  const localMap = readLocalJson<Record<string, LeaderboardHeroEntry>>(LOCAL_LEADERBOARD_KEY, {})
  localMap[entry.userId] = entry
  writeLocalJson(LOCAL_LEADERBOARD_KEY, localMap)

  const user = auth.currentUser
  if (!isSignedInVerified() || !user || user.uid !== entry.userId) return

  try {
    await setDoc(doc(db, 'leaderboard', user.uid), {
      userId: user.uid,
      gameUid: entry.gameUid || '1000',
      name: entry.name.slice(0, 24),
      jobId: entry.jobId,
      level: entry.level,
      rebirthCount: entry.rebirthCount,
      combatPower: Math.max(1, Math.round(entry.combatPower)),
      arenaRating: Math.max(100, Math.min(9999, Math.round(entry.arenaRating))),
      arenaWins: Math.max(0, Math.round(entry.arenaWins)),
      highestTowerFloor: Math.max(0, Math.round(entry.highestTowerFloor)),
      activeTitle: entry.activeTitle ?? null,
      guildName: entry.guildName ?? null,
      updatedAt: serverTimestamp(),
    })
  } catch {
    // Non-blocking sync; local snapshot remains available.
  }
}

export async function fetchLeaderboardHeroes(selfEntry?: LeaderboardHeroEntry): Promise<LeaderboardHeroEntry[]> {
  const localMap = readLocalJson<Record<string, LeaderboardHeroEntry>>(LOCAL_LEADERBOARD_KEY, {})
  const merged = new Map<string, LeaderboardHeroEntry>()
  for (const seed of SEED_RIVAL_HEROES) merged.set(seed.userId, seed)
  for (const [k, v] of Object.entries(localMap)) merged.set(k, v)
  if (selfEntry) merged.set(selfEntry.userId, selfEntry)

  if (isSignedInVerified()) {
    try {
      const q = query(
        collection(db, 'leaderboard'),
        where('combatPower', '>=', 1),
        orderBy('combatPower', 'desc'),
        limit(35),
      )
      const snap = await getDocs(q)
      for (const d of snap.docs) {
        const data = d.data() as LeaderboardHeroEntry
        merged.set(data.userId, data)
      }
    } catch {
      // Serve merged seed + local leaderboard gracefully.
    }
  }

  return [...merged.values()].sort((a, b) => b.combatPower - a.combatPower)
}

/* ========================================================================== */
/* TIMED WORLD BOSS RAID                                                      */
/* ========================================================================== */

export async function fetchWorldBossState(): Promise<WorldBossRaidState> {
  const spec = getActiveWorldBoss()
  const fallbackLocal = readLocalJson<WorldBossRaidState>(LOCAL_WB_KEY, {
    cycleKey: spec.cycleKey,
    bossId: spec.bossId,
    name: spec.name,
    maxHp: spec.maxHp,
    currentHp: spec.maxHp,
    totalDamageDealt: 0,
    contributions: [],
  })

  const activeLocal =
    fallbackLocal.cycleKey === spec.cycleKey
      ? fallbackLocal
      : {
          cycleKey: spec.cycleKey,
          bossId: spec.bossId,
          name: spec.name,
          maxHp: spec.maxHp,
          currentHp: spec.maxHp,
          totalDamageDealt: 0,
          contributions: [],
        }

  if (!isSignedInVerified()) {
    writeLocalJson(LOCAL_WB_KEY, activeLocal)
    return activeLocal
  }

  try {
    const raidRef = doc(db, 'worldBoss', spec.cycleKey)
    const raidSnap = await getDoc(raidRef)
    let raidData = raidSnap.exists() ? (raidSnap.data() as Omit<WorldBossRaidState, 'contributions'>) : null
    if (!raidData) {
      await setDoc(raidRef, {
        cycleKey: spec.cycleKey,
        bossId: spec.bossId,
        name: spec.name,
        maxHp: spec.maxHp,
        currentHp: spec.maxHp,
        totalDamageDealt: 0,
        updatedAt: serverTimestamp(),
      })
      raidData = {
        cycleKey: spec.cycleKey,
        bossId: spec.bossId,
        name: spec.name,
        maxHp: spec.maxHp,
        currentHp: spec.maxHp,
        totalDamageDealt: 0,
      }
    }
    const contribSnap = await getDocs(
      query(
        collection(db, 'worldBoss', spec.cycleKey, 'contributions'),
        where('damage', '>=', 0),
        orderBy('damage', 'desc'),
        limit(20),
      ),
    )
    const contributions = contribSnap.docs.map((d) => d.data() as WorldBossContributionRecord)
    return { ...raidData, contributions }
  } catch {
    writeLocalJson(LOCAL_WB_KEY, activeLocal)
    return activeLocal
  }
}

export async function attackWorldBossOnline(input: {
  playerName: string
  jobId: string
  level: number
  damage: number
}): Promise<WorldBossRaidState> {
  const spec = getActiveWorldBoss()
  const safeDamage = Math.max(10, Math.round(input.damage))
  const user = auth.currentUser

  if (isSignedInVerified() && user) {
    try {
      const raidRef = doc(db, 'worldBoss', spec.cycleKey)
      const contribRef = doc(db, 'worldBoss', spec.cycleKey, 'contributions', user.uid)
      await runTransaction(db, async (tx) => {
        const raidSnap = await tx.get(raidRef)
        const contribSnap = await tx.get(contribRef)
        const prevCurrentHp = raidSnap.exists() ? Number(raidSnap.data().currentHp ?? spec.maxHp) : spec.maxHp
        const prevTotalDmg = raidSnap.exists() ? Number(raidSnap.data().totalDamageDealt ?? 0) : 0
        const nextCurrentHp = Math.max(0, prevCurrentHp - safeDamage)
        const nextTotalDmg = prevTotalDmg + safeDamage

        if (raidSnap.exists()) {
          tx.update(raidRef, {
            currentHp: nextCurrentHp,
            totalDamageDealt: nextTotalDmg,
            updatedAt: serverTimestamp(),
          })
        } else {
          tx.set(raidRef, {
            cycleKey: spec.cycleKey,
            bossId: spec.bossId,
            name: spec.name,
            maxHp: spec.maxHp,
            currentHp: nextCurrentHp,
            totalDamageDealt: nextTotalDmg,
            updatedAt: serverTimestamp(),
          })
        }

        const prevContrib = contribSnap.exists() ? Number(contribSnap.data().damage ?? 0) : 0
        tx.set(contribRef, {
          userId: user.uid,
          name: input.playerName.slice(0, 24),
          jobId: input.jobId,
          level: input.level,
          damage: prevContrib + safeDamage,
          updatedAt: serverTimestamp(),
        })
      })
      return await fetchWorldBossState()
    } catch {
      // Fall through to local update cleanly.
    }
  }

  const current = await fetchWorldBossState()
  const uid = user?.uid ?? 'guest_player'
  const existingIdx = current.contributions.findIndex((c) => c.userId === uid)
  const nextContribs = [...current.contributions]
  if (existingIdx >= 0) {
    nextContribs[existingIdx] = {
      ...nextContribs[existingIdx],
      name: input.playerName,
      jobId: input.jobId,
      level: input.level,
      damage: nextContribs[existingIdx].damage + safeDamage,
    }
  } else {
    nextContribs.push({
      userId: uid,
      name: input.playerName,
      jobId: input.jobId,
      level: input.level,
      damage: safeDamage,
    })
  }
  nextContribs.sort((a, b) => b.damage - a.damage)
  const nextState: WorldBossRaidState = {
    ...current,
    currentHp: Math.max(0, current.currentHp - safeDamage),
    totalDamageDealt: current.totalDamageDealt + safeDamage,
    contributions: nextContribs.slice(0, 20),
  }
  writeLocalJson(LOCAL_WB_KEY, nextState)
  return nextState
}

/* ========================================================================== */
/* GUILD CHAT & GUILD RAID BOSS                                               */
/* ========================================================================== */

export interface GuildChatMessage {
  messageId: string
  senderUid: string
  senderName: string
  senderGameUid: string
  jobId: string
  text: string
  createdAtMs: number
}

export interface GuildRaidState {
  raidId: string
  guildId: string
  bossName: string
  level: number
  maxHp: number
  currentHp: number
  clears: number
  lastHitter: string
}

const LOCAL_GUILD_CHAT_KEY = 'pixel-rpg-local-guild-chat-v1'
const LOCAL_GUILD_RAID_KEY = 'pixel-rpg-local-guild-raid-v1'

export async function fetchGuildMessages(guildId: string): Promise<GuildChatMessage[]> {
  const localMap = readLocalJson<Record<string, GuildChatMessage[]>>(LOCAL_GUILD_CHAT_KEY, {})
  const localList = localMap[guildId] ?? []
  if (!isSignedInVerified() || guildId.startsWith('guild_')) {
    return localList
  }
  try {
    const q = query(collection(db, 'guilds', guildId, 'messages'), orderBy('createdAtMs', 'asc'), limit(40))
    const snap = await getDocs(q)
    return snap.docs.map((d) => d.data() as GuildChatMessage)
  } catch {
    return localList
  }
}

export function subscribeGuildMessages(
  guildId: string,
  onUpdate: (messages: GuildChatMessage[]) => void,
): () => void {
  if (!isSignedInVerified() || guildId.startsWith('guild_')) {
    onUpdate(readLocalJson<Record<string, GuildChatMessage[]>>(LOCAL_GUILD_CHAT_KEY, {})[guildId] ?? [])
    return () => {}
  }
  const q = query(collection(db, 'guilds', guildId, 'messages'), orderBy('createdAtMs', 'asc'), limit(40))
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map((d) => d.data() as GuildChatMessage))
    },
    () => {
      onUpdate(readLocalJson<Record<string, GuildChatMessage[]>>(LOCAL_GUILD_CHAT_KEY, {})[guildId] ?? [])
    },
  )
}

export async function sendGuildMessage(
  guildId: string,
  input: { senderName: string; senderGameUid: string; jobId: string; text: string },
): Promise<{ ok: boolean; message?: GuildChatMessage; error?: string }> {
  const cleanText = input.text.trim().slice(0, 180)
  if (!cleanText) return { ok: false, error: 'ข้อความว่างเปล่า' }
  const user = auth.currentUser
  const messageId = `gm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const entry: GuildChatMessage = {
    messageId,
    senderUid: user?.uid ?? 'guest_player',
    senderName: input.senderName.slice(0, 24) || 'นักผจญภัย',
    senderGameUid: (input.senderGameUid || '1000').slice(0, 8),
    jobId: input.jobId || 'swordsman',
    text: cleanText,
    createdAtMs: Date.now(),
  }

  if (isSignedInVerified() && user && !guildId.startsWith('guild_')) {
    try {
      await setDoc(doc(db, 'guilds', guildId, 'messages', messageId), {
        ...entry,
        createdAt: serverTimestamp(),
      })
      return { ok: true, message: entry }
    } catch {
      // Fallback to localStorage seamlessly.
    }
  }

  const localMap = readLocalJson<Record<string, GuildChatMessage[]>>(LOCAL_GUILD_CHAT_KEY, {})
  const nextList = [...(localMap[guildId] ?? []), entry].slice(-40)
  localMap[guildId] = nextList
  writeLocalJson(LOCAL_GUILD_CHAT_KEY, localMap)
  return { ok: true, message: entry }
}

function defaultGuildRaid(guildId: string, level = 1): GuildRaidState {
  const names = ['โกเลมปราการกิลด์', 'มังกรเหมันต์ผู้พิทักษ์', 'จอมมารแห่งเงามืด', 'ไททันสายฟ้าโบราณ']
  const bossName = names[(level - 1) % names.length]
  const maxHp = 4000 + level * 2500
  return {
    raidId: 'current',
    guildId,
    bossName,
    level,
    maxHp,
    currentHp: maxHp,
    clears: Math.max(0, level - 1),
    lastHitter: '-',
  }
}

export async function fetchGuildRaidState(guildId: string): Promise<GuildRaidState> {
  const localMap = readLocalJson<Record<string, GuildRaidState>>(LOCAL_GUILD_RAID_KEY, {})
  const localState = localMap[guildId] ?? defaultGuildRaid(guildId, 1)
  if (!isSignedInVerified() || guildId.startsWith('guild_')) {
    return localState
  }
  try {
    const ref = doc(db, 'guilds', guildId, 'raids', 'current')
    const snap = await getDoc(ref)
    if (snap.exists()) return snap.data() as GuildRaidState
    await setDoc(ref, { ...localState, updatedAt: serverTimestamp() })
    return localState
  } catch {
    return localState
  }
}

export async function attackGuildRaid(
  guildId: string,
  input: { playerName: string; damage: number },
): Promise<{ state: GuildRaidState; defeated: boolean; bonusGold: number; bonusStones: number }> {
  const safeDamage = Math.max(20, Math.round(input.damage))
  const safeName = input.playerName.slice(0, 24) || 'นักผจญภัย'
  const user = auth.currentUser

  if (isSignedInVerified() && user && !guildId.startsWith('guild_')) {
    try {
      const ref = doc(db, 'guilds', guildId, 'raids', 'current')
      const res = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        const cur = snap.exists() ? (snap.data() as GuildRaidState) : defaultGuildRaid(guildId, 1)
        const nextHp = Math.max(0, cur.currentHp - safeDamage)
        let nextState: GuildRaidState
        let defeated = false
        if (nextHp === 0) {
          defeated = true
          const nextLv = Math.min(99, cur.level + 1)
          const fresh = defaultGuildRaid(guildId, nextLv)
          nextState = {
            ...fresh,
            clears: cur.clears + 1,
            lastHitter: safeName,
          }
        } else {
          nextState = {
            ...cur,
            currentHp: nextHp,
            lastHitter: safeName,
          }
        }
        tx.set(ref, { ...nextState, updatedAt: serverTimestamp() })
        return { state: nextState, defeated, prevLevel: cur.level }
      })
      return {
        state: res.state,
        defeated: res.defeated,
        bonusGold: res.defeated ? 600 + res.prevLevel * 250 : 0,
        bonusStones: res.defeated ? 4 + res.prevLevel : 0,
      }
    } catch {
      // Fallback below.
    }
  }

  const localMap = readLocalJson<Record<string, GuildRaidState>>(LOCAL_GUILD_RAID_KEY, {})
  const cur = localMap[guildId] ?? defaultGuildRaid(guildId, 1)
  const nextHp = Math.max(0, cur.currentHp - safeDamage)
  let defeated = false
  let nextState: GuildRaidState
  if (nextHp === 0) {
    defeated = true
    const fresh = defaultGuildRaid(guildId, Math.min(99, cur.level + 1))
    nextState = { ...fresh, clears: cur.clears + 1, lastHitter: safeName }
  } else {
    nextState = { ...cur, currentHp: nextHp, lastHitter: safeName }
  }
  localMap[guildId] = nextState
  writeLocalJson(LOCAL_GUILD_RAID_KEY, localMap)
  return {
    state: nextState,
    defeated,
    bonusGold: defeated ? 600 + cur.level * 250 : 0,
    bonusStones: defeated ? 4 + cur.level : 0,
  }
}

/* ========================================================================== */
/* AUCTION HOUSE / PLAYER MARKETPLACE                                         */
/* ========================================================================== */

export interface MarketListingRecord {
  listingId: string
  sellerUid: string
  sellerName: string
  sellerGameUid: string
  itemId: string
  itemName: string
  kind: string
  qty: number
  plus: number
  priceGold: number
  status: 'open' | 'sold' | 'cancelled'
  buyerUid: string | null
  buyerName: string | null
  sellerClaimed: boolean
  rarity?: string | null
  affixes?: Array<{ stat: string; value: number }>
  createdAtMs: number
}

const LOCAL_MARKET_KEY = 'pixel-rpg-local-market-v1'

const SEED_MARKET_LISTINGS: MarketListingRecord[] = [
  {
    listingId: 'seed_mkt_1',
    sellerUid: 'seed_kael',
    sellerName: 'เคเอลผู้พิทักษ์',
    sellerGameUid: '1001',
    itemId: 'iron_sword',
    itemName: 'ดาบเหล็กกล้า',
    kind: 'weapon',
    qty: 1,
    plus: 3,
    priceGold: 420,
    status: 'open',
    buyerUid: null,
    buyerName: null,
    sellerClaimed: false,
    rarity: 'rare',
    affixes: [{ stat: 'atk_flat', value: 6 }, { stat: 'crit_pct', value: 3 }],
    createdAtMs: 1700000000001,
  },
  {
    listingId: 'seed_mkt_2',
    sellerUid: 'seed_aria',
    sellerName: 'อาเรียแห่งไพร',
    sellerGameUid: '1002',
    itemId: 'ore_mythril',
    itemName: 'แร่มิธริลเรืองแสง',
    kind: 'material',
    qty: 4,
    plus: 0,
    priceGold: 260,
    status: 'open',
    buyerUid: null,
    buyerName: null,
    sellerClaimed: false,
    rarity: null,
    affixes: [],
    createdAtMs: 1700000000002,
  },
  {
    listingId: 'seed_mkt_3',
    sellerUid: 'seed_lyra',
    sellerName: 'ไลราสายฟ้า',
    sellerGameUid: '1003',
    itemId: 'enhance_stone',
    itemName: 'หินตีบวกเวท',
    kind: 'material',
    qty: 8,
    plus: 0,
    priceGold: 350,
    status: 'open',
    buyerUid: null,
    buyerName: null,
    sellerClaimed: false,
    rarity: null,
    affixes: [],
    createdAtMs: 1700000000003,
  },
  {
    listingId: 'seed_mkt_4',
    sellerUid: 'seed_zen',
    sellerName: 'เซนจอมเวท',
    sellerGameUid: '1004',
    itemId: 'food_hero_feast',
    itemName: 'ชุดอาหารจอมราชันย์',
    kind: 'potion',
    qty: 2,
    plus: 0,
    priceGold: 320,
    status: 'open',
    buyerUid: null,
    buyerName: null,
    sellerClaimed: false,
    rarity: null,
    affixes: [],
    createdAtMs: 1700000000004,
  },
]

export async function listMarketListings(): Promise<MarketListingRecord[]> {
  const local = readLocalJson<MarketListingRecord[]>(LOCAL_MARKET_KEY, SEED_MARKET_LISTINGS)
  if (!isSignedInVerified()) {
    return local.filter((l) => l.status === 'open')
  }
  try {
    const q = query(
      collection(db, 'marketListings'),
      where('status', '==', 'open'),
      limit(40),
    )
    const snap = await getDocs(q)
    const remote = snap.docs.map((d) => d.data() as MarketListingRecord)
    const seen = new Set(remote.map((r) => r.listingId))
    const merged = [...remote, ...local.filter((l) => l.status === 'open' && !seen.has(l.listingId))]
    return merged.sort((a, b) => b.createdAtMs - a.createdAtMs)
  } catch {
    return local.filter((l) => l.status === 'open')
  }
}

export async function listMySoldListings(): Promise<MarketListingRecord[]> {
  const user = auth.currentUser
  const uid = user?.uid ?? 'guest_player'
  const local = readLocalJson<MarketListingRecord[]>(LOCAL_MARKET_KEY, SEED_MARKET_LISTINGS)
  const localMine = local.filter((l) => l.sellerUid === uid && l.status === 'sold' && !l.sellerClaimed)

  if (!isSignedInVerified() || !user) {
    return localMine
  }

  try {
    const q = query(
      collection(db, 'marketListings'),
      where('sellerUid', '==', user.uid),
      limit(30),
    )
    const snap = await getDocs(q)
    const remote = snap.docs
      .map((d) => d.data() as MarketListingRecord)
      .filter((l) => l.status === 'sold' && !l.sellerClaimed)
    const seen = new Set(remote.map((r) => r.listingId))
    return [...remote, ...localMine.filter((l) => !seen.has(l.listingId))].sort(
      (a, b) => b.createdAtMs - a.createdAtMs,
    )
  } catch {
    return localMine
  }
}

export async function createMarketListing(input: {
  sellerName: string
  sellerGameUid: string
  itemId: string
  itemName: string
  kind: string
  qty: number
  plus: number
  priceGold: number
  rarity?: string | null
  affixes?: Array<{ stat: string; value: number }>
}): Promise<{ ok: boolean; listing?: MarketListingRecord; error?: string }> {
  const priceGold = Math.max(10, Math.min(100_000_000, Math.floor(input.priceGold)))
  const user = auth.currentUser
  const listingId = `mkt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const cleanAffixes = Array.isArray(input.affixes)
    ? input.affixes
        .filter((a) => a && typeof a.stat === 'string' && Number.isFinite(a.value) && a.value > 0)
        .slice(0, 4)
        .map((a) => ({ stat: a.stat.slice(0, 24), value: Math.round(a.value) }))
    : []
  const record: MarketListingRecord = {
    listingId,
    sellerUid: user?.uid ?? 'guest_player',
    sellerName: input.sellerName.slice(0, 24) || 'ผู้เล่น',
    sellerGameUid: (input.sellerGameUid || '1000').slice(0, 8),
    itemId: input.itemId,
    itemName: input.itemName.slice(0, 64),
    kind: input.kind.slice(0, 24),
    qty: Math.max(1, Math.min(999, Math.floor(input.qty))),
    plus: Math.max(0, Math.min(20, Math.floor(input.plus))),
    priceGold,
    status: 'open',
    buyerUid: null,
    buyerName: null,
    sellerClaimed: false,
    rarity: input.rarity ? String(input.rarity).slice(0, 16) : null,
    affixes: cleanAffixes,
    createdAtMs: Date.now(),
  }

  if (isSignedInVerified() && user) {
    try {
      await setDoc(doc(db, 'marketListings', listingId), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return { ok: true, listing: record }
    } catch {
      // Fallback cleanly to localStorage.
    }
  }

  const local = readLocalJson<MarketListingRecord[]>(LOCAL_MARKET_KEY, SEED_MARKET_LISTINGS)
  writeLocalJson(LOCAL_MARKET_KEY, [record, ...local])
  return { ok: true, listing: record }
}

export async function buyMarketListing(
  listingId: string,
  buyerName: string,
): Promise<{ ok: boolean; listing?: MarketListingRecord; error?: string }> {
  const user = auth.currentUser
  const cleanBuyer = buyerName.slice(0, 24) || 'นักผจญภัย'

  if (isSignedInVerified() && user && !listingId.startsWith('seed_mkt_')) {
    try {
      const ref = doc(db, 'marketListings', listingId)
      const bought = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists()) throw new Error('รายการนี้ถูกซื้อหรือลบไปแล้ว')
        const data = snap.data() as MarketListingRecord
        if (data.status !== 'open') throw new Error('มีผู้เล่นอื่นซื้อรายการนี้ไปแล้ว')
        if (data.sellerUid === user.uid) throw new Error('ไม่สามารถซื้อสินค้าของตัวเองได้ (กดยกเลิกแทน)')
        tx.update(ref, {
          status: 'sold',
          buyerUid: user.uid,
          buyerName: cleanBuyer,
          updatedAt: serverTimestamp(),
        })
        return { ...data, status: 'sold' as const, buyerUid: user.uid, buyerName: cleanBuyer }
      })
      return { ok: true, listing: bought }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'ไม่สามารถซื้อสินค้าได้' }
    }
  }

  const local = readLocalJson<MarketListingRecord[]>(LOCAL_MARKET_KEY, SEED_MARKET_LISTINGS)
  const target = local.find((l) => l.listingId === listingId)
  if (!target || target.status !== 'open') {
    return { ok: false, error: 'รายการนี้ถูกซื้อหรือลบไปแล้ว' }
  }
  const updated: MarketListingRecord = {
    ...target,
    status: 'sold',
    buyerUid: user?.uid ?? 'guest_player',
    buyerName: cleanBuyer,
  }
  writeLocalJson(
    LOCAL_MARKET_KEY,
    local.map((l) => (l.listingId === listingId ? updated : l)),
  )
  return { ok: true, listing: updated }
}

export async function claimMarketListingProceeds(
  listingId: string,
): Promise<{ ok: boolean; claimedGold: number; listing?: MarketListingRecord; error?: string }> {
  const user = auth.currentUser
  const uid = user?.uid ?? 'guest_player'

  if (isSignedInVerified() && user && !listingId.startsWith('seed_mkt_')) {
    try {
      const ref = doc(db, 'marketListings', listingId)
      const claimed = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists()) throw new Error('ไม่พบรายการขายนี้')
        const data = snap.data() as MarketListingRecord
        if (data.sellerUid !== uid) throw new Error('เฉพาะผู้ขายเท่านั้นที่รับเงินได้')
        if (data.status !== 'sold') throw new Error('สินค้านี้ยังไม่ถูกขาย')
        if (data.sellerClaimed) throw new Error('รับเงินจากรายการนี้ไปแล้ว')
        tx.update(ref, {
          sellerClaimed: true,
          updatedAt: serverTimestamp(),
        })
        return { ...data, sellerClaimed: true }
      })
      return { ok: true, claimedGold: claimed.priceGold, listing: claimed }
    } catch (err) {
      return {
        ok: false,
        claimedGold: 0,
        error: err instanceof Error ? err.message : 'รับเงินค่าขายไม่สำเร็จ',
      }
    }
  }

  const local = readLocalJson<MarketListingRecord[]>(LOCAL_MARKET_KEY, SEED_MARKET_LISTINGS)
  const target = local.find((l) => l.listingId === listingId)
  if (!target || target.sellerUid !== uid || target.status !== 'sold') {
    return { ok: false, claimedGold: 0, error: 'ไม่พบรายการที่ขายแล้ว' }
  }
  if (target.sellerClaimed) {
    return { ok: false, claimedGold: 0, error: 'รับเงินจากรายการนี้ไปแล้ว' }
  }
  const updated: MarketListingRecord = { ...target, sellerClaimed: true }
  writeLocalJson(
    LOCAL_MARKET_KEY,
    local.map((l) => (l.listingId === listingId ? updated : l)),
  )
  return { ok: true, claimedGold: target.priceGold, listing: updated }
}

export async function cancelMarketListing(
  listingId: string,
): Promise<{ ok: boolean; listing?: MarketListingRecord; error?: string }> {
  const user = auth.currentUser
  const uid = user?.uid ?? 'guest_player'

  if (isSignedInVerified() && user && !listingId.startsWith('seed_mkt_')) {
    try {
      const ref = doc(db, 'marketListings', listingId)
      const cancelled = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists()) throw new Error('ไม่พบรายการ')
        const data = snap.data() as MarketListingRecord
        if (data.sellerUid !== uid) throw new Error('เฉพาะผู้ขายเท่านั้นที่ยกเลิกได้')
        if (data.status !== 'open') throw new Error('รายการถูกขายหรือปิดไปแล้ว')
        tx.update(ref, {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        })
        return { ...data, status: 'cancelled' as const }
      })
      return { ok: true, listing: cancelled }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'ยกเลิกไม่สำเร็จ' }
    }
  }

  const local = readLocalJson<MarketListingRecord[]>(LOCAL_MARKET_KEY, SEED_MARKET_LISTINGS)
  const target = local.find((l) => l.listingId === listingId)
  if (!target || target.status !== 'open') return { ok: false, error: 'ไม่พบรายการที่เปิดขาย' }
  const next = local.map((l) => (l.listingId === listingId ? { ...l, status: 'cancelled' as const } : l))
  writeLocalJson(LOCAL_MARKET_KEY, next)
  return { ok: true, listing: target }
}

/* ========================================================================== */
/* SYSTEM MAILBOX & FRIEND GIFTS                                              */
/* ========================================================================== */

export interface MailMessageRecord {
  mailId: string
  senderUid: string
  senderName: string
  senderGameUid: string
  subject: string
  body: string
  gold: number
  diamonds: number
  itemId: string | null
  qty: number
  plus: number
  claimed: boolean
  createdAtMs: number
}

const LOCAL_MAIL_KEY = 'pixel-rpg-local-mailbox-v1'

function seedWelcomeMail(targetUid: string): MailMessageRecord {
  return {
    mailId: 'welcome_starter_pack',
    senderUid: targetUid,
    senderName: 'สภานักผจญภัย (ระบบ)',
    senderGameUid: '0000',
    subject: 'ของขวัญต้อนรับผู้กล้าใหม่!',
    body: 'ขอบคุณที่ร่วมผจญภัยใน Pixel Quest — รับทอง เพชร และผลึกวิวัฒนาการคู่หูได้เลย!',
    gold: 600,
    diamonds: 12,
    itemId: 'pet_essence',
    qty: 3,
    plus: 0,
    claimed: false,
    createdAtMs: 1700000001000,
  }
}

export async function fetchMailbox(userId?: string): Promise<MailMessageRecord[]> {
  const uid = userId ?? auth.currentUser?.uid ?? 'guest_player'
  const localMap = readLocalJson<Record<string, MailMessageRecord[]>>(LOCAL_MAIL_KEY, {})
  let localList = localMap[uid]
  if (!localList) {
    localList = [seedWelcomeMail(uid)]
    localMap[uid] = localList
    writeLocalJson(LOCAL_MAIL_KEY, localMap)
  }

  if (!isSignedInVerified() || !auth.currentUser) {
    return localList
  }

  try {
    const colRef = collection(db, 'users', auth.currentUser.uid, 'mailbox')
    const snap = await getDocs(query(colRef, orderBy('createdAtMs', 'desc'), limit(35)))
    if (snap.empty) {
      const welcome = seedWelcomeMail(auth.currentUser.uid)
      await setDoc(doc(db, 'users', auth.currentUser.uid, 'mailbox', welcome.mailId), {
        ...welcome,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return [welcome]
    }
    return snap.docs.map((d) => d.data() as MailMessageRecord)
  } catch {
    return localList
  }
}

export async function sendMailGiftByGameUid(input: {
  targetGameUid: string
  senderName: string
  senderGameUid: string
  subject: string
  body: string
  gold: number
  diamonds?: number
  itemId?: string | null
  qty?: number
  plus?: number
}): Promise<{ ok: boolean; error?: string }> {
  const cleanUid = input.targetGameUid.trim()
  if (!/^[0-9]{4,8}$/.test(cleanUid)) {
    return { ok: false, error: 'กรุณากรอก Game UID ตัวเลข 4-8 หลักให้ถูกต้อง' }
  }
  const user = auth.currentUser
  const mailId = `mail_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const payload: MailMessageRecord = {
    mailId,
    senderUid: user?.uid ?? 'guest_player',
    senderName: input.senderName.slice(0, 24) || 'เพื่อนนักผจญภัย',
    senderGameUid: (input.senderGameUid || '1000').slice(0, 8),
    subject: input.subject.trim().slice(0, 64) || 'ของขวัญจากเพื่อน',
    body: input.body.trim().slice(0, 240) || 'ส่งความห่วงใยและของขวัญมาให้!',
    gold: Math.max(0, Math.min(10_000_000, Math.floor(input.gold))),
    diamonds: Math.max(0, Math.min(100_000, Math.floor(input.diamonds ?? 0))),
    itemId: input.itemId ?? null,
    qty: Math.max(0, Math.min(999, Math.floor(input.qty ?? 0))),
    plus: Math.max(0, Math.min(20, Math.floor(input.plus ?? 0))),
    claimed: false,
    createdAtMs: Date.now(),
  }

  if (isSignedInVerified() && user) {
    try {
      const uidSnap = await getDoc(doc(db, 'playerUids', cleanUid))
      if (!uidSnap.exists()) {
        return { ok: false, error: `ไม่พบผู้เล่น Game UID #${cleanUid}` }
      }
      const targetUid = String(uidSnap.data().ownerId)
      await setDoc(doc(db, 'users', targetUid, 'mailbox', mailId), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return { ok: true }
    } catch {
      // Fallback below for offline/local testing.
    }
  }

  const targetKey = cleanUid === input.senderGameUid ? user?.uid ?? 'guest_player' : `uid_${cleanUid}`
  const localMap = readLocalJson<Record<string, MailMessageRecord[]>>(LOCAL_MAIL_KEY, {})
  localMap[targetKey] = [payload, ...(localMap[targetKey] ?? [])].slice(0, 35)
  writeLocalJson(LOCAL_MAIL_KEY, localMap)
  return { ok: true }
}

export async function markMailClaimed(mailId: string): Promise<void> {
  const user = auth.currentUser
  const uid = user?.uid ?? 'guest_player'

  if (isSignedInVerified() && user) {
    try {
      await updateDoc(doc(db, 'users', user.uid, 'mailbox', mailId), {
        claimed: true,
        updatedAt: serverTimestamp(),
      })
      return
    } catch {
      // Fallback below.
    }
  }

  const localMap = readLocalJson<Record<string, MailMessageRecord[]>>(LOCAL_MAIL_KEY, {})
  const list = localMap[uid] ?? []
  localMap[uid] = list.map((m) => (m.mailId === mailId ? { ...m, claimed: true } : m))
  writeLocalJson(LOCAL_MAIL_KEY, localMap)
}

export async function deleteMailEntry(mailId: string): Promise<void> {
  const user = auth.currentUser
  const uid = user?.uid ?? 'guest_player'
  if (isSignedInVerified() && user) {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'mailbox', mailId))
      return
    } catch {
      // Fallback below.
    }
  }
  const localMap = readLocalJson<Record<string, MailMessageRecord[]>>(LOCAL_MAIL_KEY, {})
  localMap[uid] = (localMap[uid] ?? []).filter((m) => m.mailId !== mailId)
  writeLocalJson(LOCAL_MAIL_KEY, localMap)
}

/* ========================================================================== */
/* CO-OP PARTY DUNGEON BOSS                                                   */
/* ========================================================================== */

export interface PartyCoopState {
  coopId: string
  partyId: string
  dungeonName: string
  bossName: string
  level: number
  maxHp: number
  currentHp: number
  clears: number
  participants: string[]
  lastHitter: string
}

const LOCAL_PARTY_COOP_KEY = 'pixel-rpg-local-party-coop-v1'

function createDefaultPartyCoop(partyId: string, level = 1, starterName = 'ผู้กล้า'): PartyCoopState {
  const bosses = ['ราชามังกรเหวอเวจี', 'อัศวินแห่งดวงดาวมรณะ', 'เทพศิลานิรันดร์']
  const bossName = bosses[(level - 1) % bosses.length]
  const maxHp = 3200 + level * 1800
  return {
    coopId: 'active',
    partyId,
    dungeonName: `โถงเรดปาร์ตี้ ระดับ ${level}`,
    bossName,
    level,
    maxHp,
    currentHp: maxHp,
    clears: Math.max(0, level - 1),
    participants: [starterName.slice(0, 24)],
    lastHitter: '-',
  }
}

export async function fetchPartyCoopState(partyId: string, playerName: string): Promise<PartyCoopState> {
  const localMap = readLocalJson<Record<string, PartyCoopState>>(LOCAL_PARTY_COOP_KEY, {})
  const local = localMap[partyId] ?? createDefaultPartyCoop(partyId, 1, playerName)
  if (!isSignedInVerified() || partyId.startsWith('local')) {
    return local
  }
  try {
    const ref = doc(db, 'parties', partyId, 'coops', 'active')
    const snap = await getDoc(ref)
    if (snap.exists()) return snap.data() as PartyCoopState
    await setDoc(ref, { ...local, updatedAt: serverTimestamp() })
    return local
  } catch {
    return local
  }
}

export async function attackPartyCoopBoss(
  partyId: string,
  input: { playerName: string; damage: number },
): Promise<{
  state: PartyCoopState
  defeated: boolean
  rewards: { gold: number; diamonds: number; exp: number; stones: number }
}> {
  const safeName = input.playerName.slice(0, 24) || 'ผู้กล้า'
  const safeDamage = Math.max(25, Math.round(input.damage))
  const user = auth.currentUser

  if (isSignedInVerified() && user && !partyId.startsWith('local')) {
    try {
      const ref = doc(db, 'parties', partyId, 'coops', 'active')
      const res = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        const cur = snap.exists() ? (snap.data() as PartyCoopState) : createDefaultPartyCoop(partyId, 1, safeName)
        const participants = cur.participants.includes(safeName)
          ? cur.participants
          : [...cur.participants, safeName].slice(0, 8)
        const nextHp = Math.max(0, cur.currentHp - safeDamage)
        let defeated = false
        let nextState: PartyCoopState
        if (nextHp === 0) {
          defeated = true
          const fresh = createDefaultPartyCoop(partyId, Math.min(99, cur.level + 1), safeName)
          nextState = {
            ...fresh,
            clears: cur.clears + 1,
            participants,
            lastHitter: safeName,
          }
        } else {
          nextState = {
            ...cur,
            currentHp: nextHp,
            participants,
            lastHitter: safeName,
          }
        }
        tx.set(ref, { ...nextState, updatedAt: serverTimestamp() })
        return { state: nextState, defeated, prevLevel: cur.level }
      })
      return {
        state: res.state,
        defeated: res.defeated,
        rewards: res.defeated
          ? {
              gold: 700 + res.prevLevel * 220,
              diamonds: 6 + Math.floor(res.prevLevel / 2),
              exp: 450 + res.prevLevel * 180,
              stones: 5 + res.prevLevel,
            }
          : { gold: 0, diamonds: 0, exp: 0, stones: 0 },
      }
    } catch {
      // Fallback below.
    }
  }

  const localMap = readLocalJson<Record<string, PartyCoopState>>(LOCAL_PARTY_COOP_KEY, {})
  const cur = localMap[partyId] ?? createDefaultPartyCoop(partyId, 1, safeName)
  const participants = cur.participants.includes(safeName)
    ? cur.participants
    : [...cur.participants, safeName].slice(0, 8)
  const nextHp = Math.max(0, cur.currentHp - safeDamage)
  let defeated = false
  let nextState: PartyCoopState
  if (nextHp === 0) {
    defeated = true
    const fresh = createDefaultPartyCoop(partyId, Math.min(99, cur.level + 1), safeName)
    nextState = { ...fresh, clears: cur.clears + 1, participants, lastHitter: safeName }
  } else {
    nextState = { ...cur, currentHp: nextHp, participants, lastHitter: safeName }
  }
  localMap[partyId] = nextState
  writeLocalJson(LOCAL_PARTY_COOP_KEY, localMap)
  return {
    state: nextState,
    defeated,
    rewards: defeated
      ? {
          gold: 700 + cur.level * 220,
          diamonds: 6 + Math.floor(cur.level / 2),
          exp: 450 + cur.level * 180,
          stones: 5 + cur.level,
        }
      : { gold: 0, diamonds: 0, exp: 0, stones: 0 },
  }
}

