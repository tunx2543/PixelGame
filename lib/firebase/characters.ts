'use client'

import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import type { SaveData } from '@/lib/game/engine'
import { normalizeJobId } from '@/lib/game/data'
import type { TopupOrderRecord } from '@/lib/game/premium/topup'
import type { AuditLogEntry, DiamondTransaction } from '@/lib/game/premium/types'
import { sanitizeRpgExt } from '@/lib/game/rpg-systems'
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

function toSafeInt(val: unknown, min: number, max: number, fallback: number): number {
  const num = typeof val === 'number' ? val : Number(val)
  if (!Number.isFinite(num)) return fallback
  return Math.max(min, Math.min(max, Math.floor(num)))
}

function sanitizeCharacterPayload(userId: string, characterId: string, save: SaveData) {
  const safeId = sanitizeSafeId(characterId, 'slot_1', 64)
  const rawName = typeof save.name === 'string' ? save.name : 'นักผจญภัย'
  const safeName = rawName.trim().slice(0, 24) || 'นักผจญภัย'
  const rawJobId = typeof save.jobId === 'string' && save.jobId.trim() ? normalizeJobId(save.jobId) : 'swordsman'
  const safeJobId = sanitizeSafeId(rawJobId, 'swordsman', 32)
  const safeMapId = sanitizeSafeId(typeof save.mapId === 'string' ? save.mapId : 'town', 'town', 32)
  const safeLevel = toSafeInt(save.level, 1, 999, 1)
  const safeExp = toSafeInt(save.exp, 0, Number.MAX_SAFE_INTEGER, 0)
  const safeHp = toSafeInt(save.hp, 0, Number.MAX_SAFE_INTEGER, 1)
  const safeMp = toSafeInt(save.mp, 0, Number.MAX_SAFE_INTEGER, 0)
  const safeGold = toSafeInt(save.gold, 0, Number.MAX_SAFE_INTEGER, 0)
  const safeDiamonds = toSafeInt(save.diamonds, 0, Number.MAX_SAFE_INTEGER, 0)
  const safePlayTime = typeof save.playTime === 'number' && Number.isFinite(save.playTime) ? Math.max(0, save.playTime) : 0
  const safeStorageGold = toSafeInt(save.storageGold, 0, Number.MAX_SAFE_INTEGER, 0)
  const safeKills = toSafeInt(save.kills, 0, Number.MAX_SAFE_INTEGER, 0)
  const safeStatPoints = toSafeInt(save.statPoints, 0, 100000, 0)
  const safeSkillPoints = toSafeInt(save.skillPoints, 0, 100000, 0)

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
    storageGold: safeStorageGold,
    kills: safeKills,
    statPoints: safeStatPoints,
    skillPoints: safeSkillPoints,
    playTime: safePlayTime,
    rpgExt: sanitizeRpgExt(save.rpgExt),
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
    if (!user.emailVerified) {
      throw new Error('กรุณาใช้อีเมลที่ยืนยันตัวตนแล้วในการเข้าสู่ระบบ')
    }

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
          jobId: 'swordsman',
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
            jobId: sanitizeSafeId(uidData.jobId ? normalizeJobId(String(uidData.jobId)) : 'swordsman', 'swordsman', 32),
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
  if (!currentUser || currentUser.uid !== userId || !currentUser.emailVerified) return
  const identity = await ensureUserProfile(currentUser)
  const uidRef = doc(db, 'playerUids', identity.gameUid)
  const safeCharName = (typeof summary.characterName === 'string' ? summary.characterName : 'นักผจญภัย').trim().slice(0, 24) || 'นักผจญภัย'
  const safeLevel = toSafeInt(summary.level, 1, 999, 1)
  const safeJobId = sanitizeSafeId(
    typeof summary.jobId === 'string' && summary.jobId.trim() ? normalizeJobId(summary.jobId) : 'swordsman',
    'swordsman',
    32,
  )

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
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== userId || !currentUser.emailVerified) return []
  const colPath = `users/${userId}/characters`
  try {
    const q = query(collection(db, 'users', userId, 'characters'), where('ownerId', '==', userId))
    let snapshot
    try {
      snapshot = await getDocsFromServer(q)
    } catch {
      snapshot = await getDocs(q)
    }
    const records: CloudCharacterRecord[] = []
    snapshot.forEach((docSnap) => {
      const d = docSnap.data()
      if (d && typeof d.saveData === 'object' && d.saveData !== null) {
        const rawSave = d.saveData as SaveData
        const rawSaveJobId = typeof rawSave.jobId === 'string' && rawSave.jobId.trim() ? normalizeJobId(rawSave.jobId) : 'novice'
        const normalizedSave: SaveData = {
          ...rawSave,
          jobId: rawSaveJobId,
          rpgExt: sanitizeRpgExt(rawSave.rpgExt),
        }
        records.push({
          id: docSnap.id,
          ownerId: String(d.ownerId ?? userId),
          name: String(d.name ?? normalizedSave.name ?? 'นักผจญภัย'),
          jobId: d.jobId ? normalizeJobId(String(d.jobId)) : rawSaveJobId,
          level: toSafeInt(d.level ?? normalizedSave.level, 1, 999, 1),
          exp: toSafeInt(d.exp ?? normalizedSave.exp, 0, Number.MAX_SAFE_INTEGER, 0),
          hp: toSafeInt(d.hp ?? normalizedSave.hp, 0, Number.MAX_SAFE_INTEGER, 1),
          mp: toSafeInt(d.mp ?? normalizedSave.mp, 0, Number.MAX_SAFE_INTEGER, 0),
          gold: toSafeInt(d.gold ?? normalizedSave.gold, 0, Number.MAX_SAFE_INTEGER, 0),
          diamonds: toSafeInt(d.diamonds ?? normalizedSave.diamonds, 0, Number.MAX_SAFE_INTEGER, 0),
          mapId: String(d.mapId ?? normalizedSave.mapId ?? 'town'),
          playTime: typeof (d.playTime ?? normalizedSave.playTime) === 'number' && Number.isFinite(d.playTime ?? normalizedSave.playTime)
            ? Math.max(0, Number(d.playTime ?? normalizedSave.playTime))
            : 0,
          saveData: normalizedSave,
        })
      }
    })
    return records.sort((a, b) => (b.saveData.savedAt ?? 0) - (a.saveData.savedAt ?? 0))
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath)
  }
}

const inFlightCharacterSave = new Map<string, Promise<void>>()

function readTimestampMillis(val: unknown): number | null {
  if (!val) return null
  if (typeof val === 'object' && typeof (val as { toMillis?: () => number }).toMillis === 'function') {
    const ms = (val as { toMillis: () => number }).toMillis()
    return Number.isFinite(ms) ? ms : null
  }
  return null
}

async function performSaveUserCharacter(userId: string, characterId: string, save: SaveData): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== userId || !currentUser.emailVerified) return

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
    try {
      existingSnap = await getDocFromServer(charRef)
    } catch {
      existingSnap = await getDoc(charRef)
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, charPath)
  }

  if (!existingSnap.exists()) {
    try {
      await setDoc(charRef, {
        ...payload,
        lastDiamondGainAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, charPath)
    }
  } else {
    const existingData = existingSnap.data()
    const existingDiamonds = toSafeInt(existingData?.diamonds, 0, Number.MAX_SAFE_INTEGER, 0)
    const diamondDelta = payload.diamonds - existingDiamonds
    const lastGainMs = readTimestampMillis(existingData?.lastDiamondGainAt)

    // Respect 5-second Firestore diamond-gain cooldown for normal non-GM gameplay earns
    if (!identity.isGm && diamondDelta > 0 && diamondDelta <= 250 && lastGainMs !== null) {
      const elapsed = Date.now() - lastGainMs
      if (elapsed >= 0 && elapsed < 5500) {
        await new Promise((resolve) => setTimeout(resolve, 5500 - elapsed))
      }
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
        ...(diamondDelta > 0 ? { lastDiamondGainAt: serverTimestamp() } : {}),
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

export async function commitAtomicTopupToCloud(input: {
  userId: string
  characterId: string
  save: SaveData
  order: TopupOrderRecord
  tx?: DiamondTransaction
  audit?: AuditLogEntry
  manualSlipRequestId?: string
}): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== input.userId || !currentUser.emailVerified) return

  const safeCharId = sanitizeSafeId(input.characterId, 'slot_1', 64)
  const queueKey = `${input.userId}:${safeCharId}`
  const previous = inFlightCharacterSave.get(queueKey) ?? Promise.resolve()

  const run = previous.catch(() => undefined).then(async () => {
    const identity = await ensureUserProfile(currentUser)
    const charPath = `users/${input.userId}/characters/${safeCharId}`
    const charRef = doc(db, 'users', input.userId, 'characters', safeCharId)

    let existingSnap
    try {
      existingSnap = await getDocFromServer(charRef)
    } catch {
      existingSnap = await getDoc(charRef)
    }

    // Ensure base character doc exists before running the atomic update + topupOrders batch
    if (!existingSnap.exists()) {
      const baseSave = sanitizeCharacterPayload(input.userId, safeCharId, {
        ...input.save,
        diamonds: 0,
        gameUid: identity.gameUid,
        uid: identity.isGm ? 0 : Number(identity.gameUid),
        gm: identity.isGm,
        premium: undefined,
      })
      await setDoc(charRef, {
        ...baseSave,
        lastDiamondGainAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }

    const payload = sanitizeCharacterPayload(input.userId, safeCharId, {
      ...input.save,
      gameUid: identity.gameUid,
      uid: identity.isGm ? 0 : Number(identity.gameUid),
      gm: identity.isGm,
    })

    const safeOrderId = sanitizeSafeId(input.order.orderId, `ORD-${Date.now()}`, 64)
    const safeTxId = sanitizeSafeId(input.order.txId, `TOPTX-${Date.now()}`, 64)
    const baseDiamonds = Math.max(1, Math.floor(input.order.baseDiamonds))
    const bonusDiamonds = Math.max(0, Math.floor(input.order.bonusDiamonds))

    const batch = writeBatch(db)

    if (input.order.provider === 'promptpay_manual_gm') {
      const reqId = sanitizeSafeId(input.manualSlipRequestId || input.order.gatewayRef, '', 64)
      if (reqId) {
        const slipRef = doc(db, 'topupSlipRequests', reqId)
        const slipSnap = await getDocFromServer(slipRef).catch(() => getDoc(slipRef))
        if (slipSnap.exists()) {
          const slipData = slipSnap.data()
          if (slipData?.ownerId !== input.userId) {
            throw new Error('คำขอสลิปนี้ไม่ใช่ของบัญชีคุณ')
          }
          if (slipData?.status !== 'approved') {
            throw new Error('คำขอสลิปนี้ยังไม่ได้รับการอนุมัติ')
          }
          if (slipData?.claimed === true) {
            throw new Error('รับเพชรจากคำขอสลิปนี้ไปแล้ว')
          }
          batch.update(slipRef, {
            claimed: true,
            claimedAtMs: Date.now(),
            updatedAt: serverTimestamp(),
          })
        }
      }
    }

    batch.set(doc(db, 'users', input.userId, 'characters', safeCharId, 'topupOrders', safeOrderId), {
      orderId: safeOrderId,
      ownerId: input.userId,
      characterId: safeCharId,
      packageId: sanitizeSafeId(input.order.packageId, 'topup_starter', 64),
      packageName: String(input.order.packageName || 'Topup Package').slice(0, 120),
      provider: input.order.provider,
      gatewayRef: String(input.order.gatewayRef || safeOrderId).slice(0, 128),
      amountThb: Math.max(1, Math.floor(input.order.amountThb)),
      baseDiamonds,
      bonusDiamonds,
      totalDiamonds: baseDiamonds + bonusDiamonds,
      vipExpGranted: Math.max(0, Math.floor(input.order.vipExpGranted)),
      status: 'credited',
      txId: safeTxId,
      serverVerified: Boolean(input.order.serverVerified),
      serverSignature: input.order.serverSignature ? String(input.order.serverSignature).slice(0, 64) : null,
      createdAtMs: Math.max(0, Math.floor(input.order.createdAtMs || Date.now())),
      createdAt: serverTimestamp(),
    })

    if (input.tx) {
      const ledgerTxId = sanitizeSafeId(input.tx.txId, safeTxId, 64)
      batch.set(doc(db, 'users', input.userId, 'characters', safeCharId, 'diamondTransactions', ledgerTxId), {
        txId: ledgerTxId,
        requestId: sanitizeSafeId(input.tx.requestId, ledgerTxId, 64),
        ownerId: input.userId,
        characterId: safeCharId,
        type: input.tx.type,
        source: String(input.tx.source).slice(0, 48),
        amount: Math.max(0, Math.floor(input.tx.amount)),
        balanceBefore: Math.max(0, Math.floor(input.tx.balanceBefore)),
        balanceAfter: Math.max(0, Math.floor(input.tx.balanceAfter)),
        productId: input.tx.productId ? String(input.tx.productId).slice(0, 64) : null,
        itemId: input.tx.itemId ? String(input.tx.itemId).slice(0, 64) : null,
        note: String(input.tx.note || 'Topup credit').slice(0, 180),
        actorUid: String(input.tx.actorUid || input.userId).slice(0, 128),
        isGm: false,
        serverVerified: Boolean(input.tx.serverVerified),
        serverSignature: input.tx.serverSignature ? String(input.tx.serverSignature).slice(0, 64) : null,
        createdAtMs: Math.max(0, Math.floor(input.tx.createdAtMs)),
        createdAt: serverTimestamp(),
      })
    }

    if (input.audit) {
      const safeLogId = sanitizeSafeId(input.audit.logId, `AUD-${Date.now()}`, 64)
      batch.set(doc(db, 'users', input.userId, 'characters', safeCharId, 'auditLogs', safeLogId), {
        logId: safeLogId,
        ownerId: input.userId,
        characterId: safeCharId,
        action: input.audit.action,
        actorUid: String(input.audit.actorUid || input.userId).slice(0, 128),
        actorRole: 'player',
        txId: input.audit.txId ? sanitizeSafeId(input.audit.txId, safeLogId, 64) : null,
        details: String(input.audit.details || '-').slice(0, 240),
        verifiedByServer: Boolean(input.audit.verifiedByServer),
        createdAtMs: Math.max(0, Math.floor(input.audit.createdAtMs)),
        createdAt: serverTimestamp(),
      })
    }

    batch.update(charRef, {
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
      lastDiamondGainAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    try {
      await batch.commit()
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, charPath)
    }

    void syncPlayerDirectorySummary(input.userId, {
      characterName: payload.name,
      level: payload.level,
      jobId: payload.jobId,
    })
  })

  inFlightCharacterSave.set(queueKey, run)
  try {
    await run
  } finally {
    if (inFlightCharacterSave.get(queueKey) === run) {
      inFlightCharacterSave.delete(queueKey)
    }
  }
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

export async function importGuestSaveToSlot(
  userId: string,
  slotId: CharacterSlotId,
  guestSave: SaveData,
): Promise<void> {
  const currentUser = auth.currentUser
  const gmAllowed = Boolean(currentUser && isGmAccountUser(currentUser))
  const clampedDiamonds = gmAllowed
    ? toSafeInt(guestSave.diamonds, 0, Number.MAX_SAFE_INTEGER, 0)
    : toSafeInt(guestSave.diamonds, 0, 250, 0)

  const sanitizedPrem = guestSave.premium && typeof guestSave.premium === 'object'
    ? {
        ...guestSave.premium,
        wallet: {
          ...guestSave.premium.wallet,
          diamondBalance: clampedDiamonds,
        },
        vip: {
          ...guestSave.premium.vip,
          vipLevel: 0 as const,
          vipExp: 0,
          expiresAtMs: null,
        },
        topupOrders: [],
        totalTopupThb: 0,
        lastDailyTopupDate: null,
        claimedDailyTopupDate: null,
        claimedTopupMilestones: [],
        claimedRedeemCodes: [],
      }
    : undefined

  await saveUserCharacter(userId, slotId, {
    ...guestSave,
    diamonds: clampedDiamonds,
    gm: gmAllowed,
    god: gmAllowed ? guestSave.god : false,
    invisible: gmAllowed ? guestSave.invisible : false,
    premium: gmAllowed ? guestSave.premium : sanitizedPrem,
    savedAt: Date.now(),
  })
}
