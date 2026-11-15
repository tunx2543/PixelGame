'use client'

import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import type { SaveData } from '@/lib/game/engine'
import {
  PERMANENT_GM_GAME_UID,
  isGmAccountUser,
} from '@/lib/game/permissions'
import { OperationType, auth, db, handleFirestoreError } from './client'

export interface CloudCharacterRecord {
  id: string
  ownerId: string
  name: string
  jobId: string
  level: number
  exp: number
  hp: number
  mp: number
  gold: number
  diamonds: number
  mapId: string
  playTime: number
  saveData: SaveData
}

export interface UserAccountIdentity {
  uid: string
  email: string
  displayName: string
  gameUid: string
  role: 'gm' | 'player'
  isGm: boolean
}

export const CHARACTER_SLOTS = ['slot_1', 'slot_2', 'slot_3'] as const
export type CharacterSlotId = (typeof CHARACTER_SLOTS)[number]

let cachedIdentity: UserAccountIdentity | null = null
const identityListeners = new Set<(identity: UserAccountIdentity | null) => void>()

function publishIdentity(identity: UserAccountIdentity | null) {
  cachedIdentity = identity
  for (const listener of identityListeners) listener(identity)
}

export function getCachedAccountIdentity(): UserAccountIdentity | null {
  return cachedIdentity
}

export function subscribeAccountIdentity(
  listener: (identity: UserAccountIdentity | null) => void,
): () => void {
  identityListeners.add(listener)
  return () => {
    identityListeners.delete(listener)
  }
}

if (typeof window !== 'undefined') {
  queueMicrotask(() => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        publishIdentity(null)
      } else if (cachedIdentity && cachedIdentity.uid !== user.uid) {
        publishIdentity(null)
      }
    })
  })
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v)
      }
    }
    return out as T
  }
  return value
}

function sanitizeSafeId(value: string, fallback: string, maxLen: number): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, maxLen)
  return cleaned.length > 0 ? cleaned : fallback
}

function hashUidSeed(uid: string): number {
  let h = 2166136261
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

async function allocateAvailableGameUid(userId: string): Promise<string> {
  const seed = hashUidSeed(userId)

  for (let attempt = 0; attempt < 16; attempt++) {
    const num = ((seed + attempt * 7919) % 9999) + 1
    const candidate = String(num).padStart(4, '0')
    const uidPath = `playerUids/${candidate}`
    try {
      const snap = await getDoc(doc(db, 'playerUids', candidate))
      if (!snap.exists() || snap.data()?.ownerId === userId) {
        return candidate
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, uidPath)
    }
  }

  for (let attempt = 0; attempt < 24; attempt++) {
    const num = 10000 + ((seed + attempt * 104729) % 89999)
    const candidate = String(num)
    const uidPath = `playerUids/${candidate}`
    try {
      const snap = await getDoc(doc(db, 'playerUids', candidate))
      if (!snap.exists() || snap.data()?.ownerId === userId) {
        return candidate
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, uidPath)
    }
  }

  return String(100000 + (seed % 899999))
}

function sanitizeCharacterPayload(userId: string, characterId: string, save: SaveData) {
  const safeId = sanitizeSafeId(characterId, 'slot_1', 64)
  const safeName = (save.name || 'นักผจญภัย').trim().slice(0, 24) || 'นักผจญภัย'
  const safeJobId = sanitizeSafeId(save.jobId || 'novice', 'novice', 32)
  const safeMapId = sanitizeSafeId(save.mapId || 'town', 'town', 32)
  const safeLevel = Math.max(1, Math.min(999, Math.floor(save.level || 1)))
  const safeExp = Math.max(0, Math.floor(save.exp || 0))
  const safeHp = Math.max(0, Math.floor(save.hp || 0))
  const safeMp = Math.max(0, Math.floor(save.mp || 0))
  const safeGold = Math.max(0, Math.floor(save.gold || 0))
  const safeDiamonds = Math.max(0, Math.floor(save.diamonds || 0))
  const safePlayTime = Number.isFinite(save.playTime) ? Math.max(0, save.playTime) : 0

  const cleanSaveData = stripUndefinedDeep<SaveData>({
    ...save,
    name: safeName,
    jobId: safeJobId,
    mapId: safeMapId,
    level: safeLevel,
    exp: safeExp,
    hp: safeHp,
    mp: safeMp,
    gold: safeGold,
    diamonds: safeDiamonds,
    playTime: safePlayTime,
  })

  return {
    id: safeId,
    ownerId: userId,
    name: safeName,
    jobId: safeJobId,
    level: safeLevel,
    exp: safeExp,
    hp: safeHp,
    mp: safeMp,
    gold: safeGold,
    diamonds: safeDiamonds,
    mapId: safeMapId,
    playTime: safePlayTime,
    saveData: cleanSaveData,
  }
}

const inFlightProfileSync = new Map<string, Promise<UserAccountIdentity>>()

export async function ensureUserProfile(user: User): Promise<UserAccountIdentity> {
  const existingPromise = inFlightProfileSync.get(user.uid)
  if (existingPromise) {
    return existingPromise
  }

  const syncPromise = (async (): Promise<UserAccountIdentity> => {
    const userPath = `users/${user.uid}`
    const userRef = doc(db, 'users', user.uid)
    const email = (user.email || 'player@example.com').slice(0, 320)
    const displayName = (user.displayName || email.split('@')[0] || 'นักผจญภัย').slice(0, 100)
    const isGm = isGmAccountUser(user)
    const role: 'gm' | 'player' = isGm ? 'gm' : 'player'

    let snap
    try {
      snap = await getDoc(userRef)
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, userPath)
    }

    let gameUid: string
    if (isGm) {
      gameUid = PERMANENT_GM_GAME_UID
    } else {
      const existingGameUid = snap.exists() ? snap.data()?.gameUid : undefined
      if (
        typeof existingGameUid === 'string' &&
        /^[0-9]{4,8}$/.test(existingGameUid) &&
        existingGameUid !== PERMANENT_GM_GAME_UID
      ) {
        gameUid = existingGameUid
      } else {
        gameUid = await allocateAvailableGameUid(user.uid)
      }
    }

    if (!snap.exists()) {
      try {
        await setDoc(userRef, {
          uid: user.uid,
          email,
          displayName,
          gameUid,
          role,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, userPath)
      }
    } else {
      const current = snap.data()
      if (
        current?.email !== email ||
        current?.displayName !== displayName ||
        current?.gameUid !== gameUid ||
        current?.role !== role
      ) {
        try {
          await updateDoc(userRef, {
            email,
            displayName,
            gameUid,
            role,
            updatedAt: serverTimestamp(),
          })
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, userPath)
        }
      }
    }

    // Register or refresh public non-PII Game UID lookup record.
    const uidPath = `playerUids/${gameUid}`
    const uidRef = doc(db, 'playerUids', gameUid)
    let uidSnap
    try {
      uidSnap = await getDoc(uidRef)
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, uidPath)
    }

    if (!uidSnap.exists()) {
      try {
        await setDoc(uidRef, {
          gameUid,
          ownerId: user.uid,
          displayName,
          characterName: displayName.slice(0, 24) || 'นักผจญภัย',
          level: 1,
          jobId: 'novice',
          isGm,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, uidPath)
      }
    } else {
      const uidData = uidSnap.data()
      if (uidData?.ownerId === user.uid && uidData?.displayName !== displayName) {
        try {
          await updateDoc(uidRef, {
            displayName,
            characterName: String(uidData.characterName || displayName).slice(0, 24) || 'นักผจญภัย',
            level: Math.max(1, Math.min(999, Math.floor(Number(uidData.level) || 1))),
            jobId: sanitizeSafeId(String(uidData.jobId || 'novice'), 'novice', 32),
            updatedAt: serverTimestamp(),
          })
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, uidPath)
        }
      }
    }

    const identity: UserAccountIdentity = {
      uid: user.uid,
      email,
      displayName,
      gameUid,
      role,
      isGm,
    }
    publishIdentity(identity)
    return identity
  })()

  inFlightProfileSync.set(user.uid, syncPromise)
  try {
    return await syncPromise
  } finally {
    if (inFlightProfileSync.get(user.uid) === syncPromise) {
      inFlightProfileSync.delete(user.uid)
    }
  }
}

export async function syncPlayerDirectorySummary(
  userId: string,
  summary: { characterName: string; level: number; jobId: string },
): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== userId) return
  const identity = await ensureUserProfile(currentUser)
  const uidPath = `playerUids/${identity.gameUid}`
  const uidRef = doc(db, 'playerUids', identity.gameUid)
  const safeCharName = summary.characterName.trim().slice(0, 24) || 'นักผจญภัย'
  const safeLevel = Math.max(1, Math.min(999, Math.floor(summary.level || 1)))
  const safeJobId = sanitizeSafeId(summary.jobId || 'novice', 'novice', 32)

  try {
    const snap = await getDoc(uidRef)
    if (!snap.exists()) return
    const d = snap.data()
    if (d?.ownerId !== userId) return
    if (d.characterName === safeCharName && d.level === safeLevel && d.jobId === safeJobId) return

    await updateDoc(uidRef, {
      displayName: identity.displayName,
      characterName: safeCharName,
      level: safeLevel,
      jobId: safeJobId,
      updatedAt: serverTimestamp(),
    })
  } catch {
    // Non-blocking directory summary refresh.
  }
}

export async function listUserCharacters(userId: string): Promise<CloudCharacterRecord[]> {
  const colPath = `users/${userId}/characters`
  try {
    const q = query(collection(db, 'users', userId, 'characters'), where('ownerId', '==', userId))
    const snapshot = await getDocs(q)
    const records: CloudCharacterRecord[] = []
    snapshot.forEach((docSnap) => {
      const d = docSnap.data()
      if (d && typeof d.saveData === 'object' && d.saveData !== null) {
        records.push({
          id: docSnap.id,
          ownerId: String(d.ownerId ?? userId),
          name: String(d.name ?? d.saveData.name ?? 'นักผจญภัย'),
          jobId: String(d.jobId ?? d.saveData.jobId ?? 'novice'),
          level: Number(d.level ?? d.saveData.level ?? 1),
          exp: Number(d.exp ?? d.saveData.exp ?? 0),
          hp: Number(d.hp ?? d.saveData.hp ?? 1),
          mp: Number(d.mp ?? d.saveData.mp ?? 0),
          gold: Number(d.gold ?? d.saveData.gold ?? 0),
          diamonds: Number(d.diamonds ?? d.saveData.diamonds ?? 0),
          mapId: String(d.mapId ?? d.saveData.mapId ?? 'town'),
          playTime: Number(d.playTime ?? d.saveData.playTime ?? 0),
          saveData: d.saveData as SaveData,
        })
      }
    })
    return records.sort((a, b) => (b.saveData.savedAt ?? 0) - (a.saveData.savedAt ?? 0))
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath)
  }
}

const inFlightCharacterSave = new Map<string, Promise<void>>()

async function performSaveUserCharacter(userId: string, characterId: string, save: SaveData): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== userId) return

  const identity = await ensureUserProfile(currentUser)

  const payload = sanitizeCharacterPayload(userId, characterId, {
    ...save,
    gameUid: identity.gameUid,
    uid: identity.isGm ? 0 : Number(identity.gameUid),
    gm: identity.isGm,
  })
  const charPath = `users/${userId}/characters/${payload.id}`
  const charRef = doc(db, 'users', userId, 'characters', payload.id)

  let existingSnap
  try {
    existingSnap = await getDoc(charRef)
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, charPath)
  }

  if (!existingSnap.exists()) {
    try {
      await setDoc(charRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, charPath)
    }
  } else {
    try {
      await updateDoc(charRef, {
        name: payload.name,
        jobId: payload.jobId,
        level: payload.level,
        exp: payload.exp,
        hp: payload.hp,
        mp: payload.mp,
        gold: payload.gold,
        diamonds: payload.diamonds,
        mapId: payload.mapId,
        playTime: payload.playTime,
        saveData: payload.saveData,
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, charPath)
    }
  }

  void syncPlayerDirectorySummary(userId, {
    characterName: payload.name,
    level: payload.level,
    jobId: payload.jobId,
  })
}

export async function saveUserCharacter(userId: string, characterId: string, save: SaveData): Promise<void> {
  const safeId = sanitizeSafeId(characterId, 'slot_1', 64)
  const queueKey = `${userId}:${safeId}`
  const previous = inFlightCharacterSave.get(queueKey) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(() => performSaveUserCharacter(userId, safeId, save))
  inFlightCharacterSave.set(queueKey, next)
  try {
    await next
  } finally {
    if (inFlightCharacterSave.get(queueKey) === next) {
      inFlightCharacterSave.delete(queueKey)
    }
  }
}

export async function deleteUserCharacter(userId: string, characterId: string): Promise<void> {
  const safeId = sanitizeSafeId(characterId, 'slot_1', 64)
  const charPath = `users/${userId}/characters/${safeId}`
  try {
    await deleteDoc(doc(db, 'users', userId, 'characters', safeId))
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, charPath)
  }
}
