'use client'

import type { User } from 'firebase/auth'
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

export const CHARACTER_SLOTS = ['slot_1', 'slot_2', 'slot_3'] as const
export type CharacterSlotId = (typeof CHARACTER_SLOTS)[number]

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

export async function ensureUserProfile(user: User): Promise<void> {
  const userPath = `users/${user.uid}`
  const userRef = doc(db, 'users', user.uid)
  const email = (user.email || 'player@example.com').slice(0, 320)
  const displayName = (user.displayName || email.split('@')[0] || 'นักผจญภัย').slice(0, 100)

  let snap
  try {
    snap = await getDoc(userRef)
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath)
  }

  if (!snap.exists()) {
    try {
      await setDoc(userRef, {
        uid: user.uid,
        email,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath)
    }
    return
  }

  try {
    await updateDoc(userRef, {
      email,
      displayName,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath)
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

export async function saveUserCharacter(userId: string, characterId: string, save: SaveData): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== userId) return

  await ensureUserProfile(currentUser)

  const payload = sanitizeCharacterPayload(userId, characterId, save)
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
    return
  }

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

export async function deleteUserCharacter(userId: string, characterId: string): Promise<void> {
  const safeId = sanitizeSafeId(characterId, 'slot_1', 64)
  const charPath = `users/${userId}/characters/${safeId}`
  try {
    await deleteDoc(doc(db, 'users', userId, 'characters', safeId))
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, charPath)
  }
}
