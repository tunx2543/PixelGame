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
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import type { SaveData } from '@/lib/game/engine'
import type { TopupOrderRecord } from '@/lib/game/premium/topup'
import type { DiamondTransaction } from '@/lib/game/premium/types'
import { normalizeJobId } from '@/lib/game/data'
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

export async function commitManualTopupClaimToCloud(input: {
  userId: string
  characterId: string
  requestId: string
  save: SaveData
  order: TopupOrderRecord
  transaction: DiamondTransaction
}): Promise<'credited' | 'duplicate'> {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== input.userId || !currentUser.emailVerified) {
    throw new Error('กรุณาเข้าสู่ระบบด้วยบัญชีที่ยืนยันอีเมลแล้ว')
  }

  const identity = await ensureUserProfile(currentUser)
  const safeId = sanitizeSafeId(input.characterId, 'slot_1', 64)
  const requestId = sanitizeSafeId(input.requestId, '', 64)
  const order = input.order
  const ledger = input.transaction
  if (!requestId || order.provider !== 'promptpay_manual_gm' ||
      order.characterId !== safeId || ledger.characterId !== safeId ||
      order.gatewayRef !== requestId || order.orderId !== `ORD-${requestId}` ||
      order.txId !== `TX-${requestId}`) {
    throw new Error('ข้อมูลอ้างอิงรายการเติมเงินไม่ถูกต้อง')
  }
  if (!order.serverVerified || !order.serverSignature ||
      ledger.serverVerified !== true || ledger.serverSignature !== order.serverSignature ||
      ledger.requestId !== order.orderId || ledger.txId !== order.txId ||
      ledger.type !== 'earn' || ledger.source !== 'promptpay_manual_gm' ||
      ledger.amount !== order.totalDiamonds ||
      ledger.balanceAfter !== ledger.balanceBefore + ledger.amount ||
      ledger.actorUid !== input.userId) {
    throw new Error('ข้อมูลยอดเพชรและลายเซ็นรายการเติมเงินไม่ตรงกัน')
  }

  const payload = sanitizeCharacterPayload(input.userId, safeId, {
    ...input.save,
    gameUid: identity.gameUid,
    uid: identity.isGm ? 0 : Number(identity.gameUid),
    gm: identity.isGm,
  })
  const premium = payload.saveData.premium
  if (!premium ||
      !premium.wallet.processedRequestIds.includes(order.orderId) ||
      premium.topupOrders[0]?.orderId !== order.orderId ||
      payload.diamonds !== ledger.balanceAfter) {
    throw new Error('ข้อมูลเซฟตัวละครยังไม่ตรงกับรายการเติมเงิน')
  }

  const characterRef = doc(db, 'users', input.userId, 'characters', safeId)
  const slipRef = doc(db, 'topupSlipRequests', requestId)
  const orderRef = doc(db, 'users', input.userId, 'characters', safeId, 'topupOrders', order.orderId)
  const transactionRef = doc(db, 'users', input.userId, 'characters', safeId, 'diamondTransactions', ledger.txId)

  return runTransaction(db, async (transaction) => {
    const [characterSnap, slipSnap, orderSnap, ledgerSnap] = await Promise.all([
      transaction.get(characterRef),
      transaction.get(slipRef),
      transaction.get(orderRef),
      transaction.get(transactionRef),
    ])
    if (!characterSnap.exists()) throw new Error('ไม่พบข้อมูลตัวละครบน Cloud Save กรุณาเข้าเกมใหม่แล้วลองอีกครั้ง')
    if (!slipSnap.exists()) throw new Error('ไม่พบคำขอสลิปใน Firestore')

    const slip = slipSnap.data()
    if (slip.ownerId !== input.userId || slip.characterId !== safeId ||
        slip.packageId !== order.packageId || Number(slip.amountThb) !== order.amountThb ||
        Number(slip.totalDiamonds) !== order.totalDiamonds ||
        Number(slip.vipExpGranted) !== order.vipExpGranted ||
        slip.status !== 'approved') {
      throw new Error('ข้อมูลสลิปที่อนุมัติไม่ตรงกับคำสั่งเติมเงิน')
    }

    const existingOrder = orderSnap.exists() ? orderSnap.data() : null
    if (existingOrder && (
      existingOrder.ownerId !== input.userId ||
      existingOrder.gatewayRef !== requestId ||
      existingOrder.totalDiamonds !== order.totalDiamonds ||
      existingOrder.txId !== order.txId
    )) {
      throw new Error('พบ Order เดิมที่มีข้อมูลไม่ตรงกัน กรุณาติดต่อ GM')
    }
    const existingLedger = ledgerSnap.exists() ? ledgerSnap.data() : null
    if (existingLedger && (
      existingLedger.ownerId !== input.userId ||
      existingLedger.requestId !== order.orderId ||
      existingLedger.amount !== ledger.amount ||
      existingLedger.balanceAfter !== ledger.balanceAfter
    )) {
      throw new Error('พบประวัติเพชรเดิมที่มีข้อมูลไม่ตรงกัน กรุณาติดต่อ GM')
    }

    const cloudCharacter = characterSnap.data()
    const cloudSave = cloudCharacter.saveData as SaveData | undefined
    const cloudPremium = cloudSave?.premium
    const cloudHasOrder = Boolean(cloudPremium?.topupOrders?.some((item) => item.orderId === order.orderId))
    const cloudHasRequest = Boolean(cloudPremium?.wallet?.processedRequestIds?.includes(order.orderId))
    const alreadySaved = Number(cloudCharacter.diamonds) === ledger.balanceAfter && cloudHasOrder && cloudHasRequest

    if (slip.claimed === true) {
      if (alreadySaved && orderSnap.exists() && ledgerSnap.exists()) return 'duplicate'
      throw new Error('สลิปนี้ถูกปิดรายการไปแล้ว แต่ข้อมูลยอดเพชรยังไม่ครบ กรุณาติดต่อ GM')
    }
    if (Number(cloudCharacter.diamonds) !== ledger.balanceBefore && !alreadySaved) {
      throw new Error('ยอดเพชรบน Cloud Save เปลี่ยนไปแล้ว กรุณาโหลดตัวละครใหม่ก่อนรับเพชร')
    }

    if (!orderSnap.exists()) {
      transaction.set(orderRef, {
        orderId: order.orderId,
        ownerId: input.userId,
        characterId: safeId,
        packageId: order.packageId,
        packageName: order.packageName,
        provider: order.provider,
        gatewayRef: requestId,
        amountThb: order.amountThb,
        baseDiamonds: order.baseDiamonds,
        bonusDiamonds: order.bonusDiamonds,
        totalDiamonds: order.totalDiamonds,
        vipExpGranted: order.vipExpGranted,
        status: 'credited',
        txId: order.txId,
        serverVerified: true,
        serverSignature: order.serverSignature,
        createdAtMs: order.createdAtMs,
        createdAt: serverTimestamp(),
      })
    }
    if (!ledgerSnap.exists()) {
      transaction.set(transactionRef, {
        txId: ledger.txId,
        requestId: ledger.requestId,
        ownerId: input.userId,
        characterId: safeId,
        type: ledger.type,
        source: ledger.source,
        amount: ledger.amount,
        balanceBefore: ledger.balanceBefore,
        balanceAfter: ledger.balanceAfter,
        productId: ledger.productId ?? null,
        itemId: ledger.itemId ?? null,
        note: String(ledger.note || 'Manual GM top-up').slice(0, 180),
        actorUid: input.userId,
        isGm: false,
        serverVerified: true,
        serverSignature: ledger.serverSignature ?? null,
        createdAtMs: ledger.createdAtMs,
        createdAt: serverTimestamp(),
      })
    }
    if (!alreadySaved) {
      transaction.update(characterRef, {
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
    }
    transaction.update(slipRef, {
      claimed: true,
      claimedAtMs: Date.now(),
      updatedAt: serverTimestamp(),
    })
    return alreadySaved ? 'duplicate' : 'credited'
  })
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
  await saveUserCharacter(userId, slotId, {
    ...guestSave,
    savedAt: Date.now(),
  })
}
