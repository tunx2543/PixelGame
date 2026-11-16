'use client'

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
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
    const q = query(collection(db, 'guilds'), orderBy('level', 'desc'), limit(24))
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
      const q = query(collection(db, 'leaderboard'), orderBy('combatPower', 'desc'), limit(35))
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
      query(collection(db, 'worldBoss', spec.cycleKey, 'contributions'), orderBy('damage', 'desc'), limit(20)),
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
