'use client'

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { isGmAccountUser, normalizeGameUidInput } from '@/lib/game/permissions'
import type { PromptPayShopSettings, TopupSlipRequestRecord } from '@/lib/game/premium/topup'
import { OperationType, auth, db, handleFirestoreError } from './client'

function safeDocId(raw: string, fallback: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  return cleaned.length > 0 ? cleaned : fallback
}

export async function getPromptPayShopSettings(): Promise<PromptPayShopSettings | null> {
  const currentUser = auth.currentUser
  if (!currentUser || !currentUser.emailVerified) return null
  const path = 'shopSettings/promptpay'
  try {
    const snap = await getDoc(doc(db, 'shopSettings', 'promptpay'))
    if (!snap.exists()) return null
    const d = snap.data()
    return {
      settingId: 'promptpay',
      promptPayId: String(d.promptPayId ?? ''),
      accountName: String(d.accountName ?? 'Pixel Quest Shop'),
      customQrDataUrl: typeof d.customQrDataUrl === 'string' ? d.customQrDataUrl : null,
      enabled: Boolean(d.enabled),
      updatedByUid: String(d.updatedByUid ?? ''),
      createdAtMs: Number(d.createdAtMs ?? 0),
      updatedAtMs: Number(d.updatedAtMs ?? 0),
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path)
    return null
  }
}

export async function savePromptPayShopSettings(input: {
  promptPayId: string
  accountName: string
  customQrDataUrl: string | null
  enabled: boolean
}): Promise<PromptPayShopSettings> {
  const currentUser = auth.currentUser
  if (!currentUser || !isGmAccountUser(currentUser)) {
    throw new Error('เฉพาะบัญชี GM ที่ยืนยันอีเมลแล้วเท่านั้นที่แก้ไข QR ร้านค้าได้')
  }
  const path = 'shopSettings/promptpay'
  const ref = doc(db, 'shopSettings', 'promptpay')
  const nowMs = Date.now()
  const cleanPromptPayId = input.promptPayId.replace(/\D/g, '').slice(0, 32)
  const cleanAccountName = input.accountName.trim().slice(0, 80) || 'Pixel Quest Shop'
  const cleanQr = input.customQrDataUrl && input.customQrDataUrl.length >= 20
    ? input.customQrDataUrl.slice(0, 350000)
    : null

  try {
    const existingSnap = await getDoc(ref)
    if (existingSnap.exists()) {
      const existingData = existingSnap.data()
      await updateDoc(ref, {
        promptPayId: cleanPromptPayId,
        accountName: cleanAccountName,
        customQrDataUrl: cleanQr,
        enabled: Boolean(input.enabled),
        updatedByUid: currentUser.uid,
        updatedAtMs: nowMs,
        updatedAt: serverTimestamp(),
      })
      return {
        settingId: 'promptpay',
        promptPayId: cleanPromptPayId,
        accountName: cleanAccountName,
        customQrDataUrl: cleanQr,
        enabled: Boolean(input.enabled),
        updatedByUid: currentUser.uid,
        createdAtMs: Number(existingData.createdAtMs ?? nowMs),
        updatedAtMs: nowMs,
      }
    }

    await setDoc(ref, {
      settingId: 'promptpay',
      promptPayId: cleanPromptPayId,
      accountName: cleanAccountName,
      customQrDataUrl: cleanQr,
      enabled: Boolean(input.enabled),
      updatedByUid: currentUser.uid,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return {
      settingId: 'promptpay',
      promptPayId: cleanPromptPayId,
      accountName: cleanAccountName,
      customQrDataUrl: cleanQr,
      enabled: Boolean(input.enabled),
      updatedByUid: currentUser.uid,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path)
    throw error
  }
}

export async function submitManualTopupSlipRequest(input: {
  requestId: string
  playerName: string
  gameUid: string
  characterId: string
  packageId: string
  packageName: string
  amountThb: number
  baseDiamonds: number
  bonusDiamonds: number
  vipExpGranted: number
  slipDataUrl: string
  slipNote?: string
}): Promise<TopupSlipRequestRecord> {
  const currentUser = auth.currentUser
  if (!currentUser || !currentUser.emailVerified || !currentUser.email) {
    throw new Error('กรุณาเข้าสู่ระบบด้วย Google ที่ยืนยันอีเมลแล้วก่อนส่งสลิป')
  }
  const safeReqId = safeDocId(input.requestId, `SLIP-${Date.now()}`)
  const safeCharId = safeDocId(input.characterId, 'slot_1')
  const safePkgId = safeDocId(input.packageId, 'topup_starter')
  const safeGameUid = normalizeGameUidInput(input.gameUid) || '1000'
  const baseDiamonds = Math.max(1, Math.floor(input.baseDiamonds))
  const bonusDiamonds = Math.max(0, Math.floor(input.bonusDiamonds))
  const totalDiamonds = baseDiamonds + bonusDiamonds
  const nowMs = Date.now()
  const path = `topupSlipRequests/${safeReqId}`

  const record: TopupSlipRequestRecord = {
    requestId: safeReqId,
    ownerId: currentUser.uid,
    ownerEmail: currentUser.email.slice(0, 320),
    playerName: (input.playerName.trim() || 'นักผจญภัย').slice(0, 40),
    gameUid: safeGameUid,
    characterId: safeCharId,
    packageId: safePkgId,
    packageName: input.packageName.trim().slice(0, 120) || 'Topup Package',
    amountThb: Math.max(1, Math.floor(input.amountThb)),
    baseDiamonds,
    bonusDiamonds,
    totalDiamonds,
    vipExpGranted: Math.max(0, Math.floor(input.vipExpGranted)),
    slipDataUrl: input.slipDataUrl.slice(0, 350000),
    slipNote: (input.slipNote || '').trim().slice(0, 180),
    status: 'pending',
    claimed: false,
    claimedAtMs: null,
    reviewedByUid: null,
    reviewNote: null,
    createdAtMs: nowMs,
  }

  try {
    await setDoc(doc(db, 'topupSlipRequests', safeReqId), {
      ...record,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return record
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path)
    throw error
  }
}

function mapSlipRequestDoc(id: string, data: Record<string, unknown>): TopupSlipRequestRecord {
  const baseDiamonds = Number(data.baseDiamonds ?? 0)
  const bonusDiamonds = Number(data.bonusDiamonds ?? 0)
  return {
    requestId: String(data.requestId ?? id),
    ownerId: String(data.ownerId ?? ''),
    ownerEmail: String(data.ownerEmail ?? ''),
    playerName: String(data.playerName ?? 'Player'),
    gameUid: String(data.gameUid ?? '----'),
    characterId: String(data.characterId ?? 'slot_1'),
    packageId: String(data.packageId ?? ''),
    packageName: String(data.packageName ?? ''),
    amountThb: Number(data.amountThb ?? 0),
    baseDiamonds,
    bonusDiamonds,
    totalDiamonds: Number(data.totalDiamonds ?? baseDiamonds + bonusDiamonds),
    vipExpGranted: Number(data.vipExpGranted ?? 0),
    slipDataUrl: String(data.slipDataUrl ?? ''),
    slipNote: String(data.slipNote ?? ''),
    status: (data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending'),
    claimed: Boolean(data.claimed),
    claimedAtMs: typeof data.claimedAtMs === 'number' ? data.claimedAtMs : null,
    reviewedByUid: typeof data.reviewedByUid === 'string' ? data.reviewedByUid : null,
    reviewNote: typeof data.reviewNote === 'string' ? data.reviewNote : null,
    createdAtMs: Number(data.createdAtMs ?? 0),
  }
}

export async function listMyTopupSlipRequests(userId: string): Promise<TopupSlipRequestRecord[]> {
  const currentUser = auth.currentUser
  if (!currentUser || !currentUser.emailVerified || currentUser.uid !== userId) return []
  const path = 'topupSlipRequests'
  try {
    const q = query(
      collection(db, 'topupSlipRequests'),
      where('ownerId', '==', userId),
      limit(30),
    )
    const snap = await getDocs(q)
    return snap.docs
      .map((d) => mapSlipRequestDoc(d.id, d.data()))
      .sort((a, b) => b.createdAtMs - a.createdAtMs)
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path)
    return []
  }
}

export async function listAllTopupSlipRequestsForGm(maxRows = 40): Promise<TopupSlipRequestRecord[]> {
  const currentUser = auth.currentUser
  if (!currentUser || !isGmAccountUser(currentUser)) return []
  const path = 'topupSlipRequests'
  try {
    const q = query(
      collection(db, 'topupSlipRequests'),
      orderBy('createdAtMs', 'desc'),
      limit(Math.max(1, Math.min(50, maxRows))),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => mapSlipRequestDoc(d.id, d.data()))
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path)
    return []
  }
}

export async function reviewTopupSlipRequest(
  requestId: string,
  decision: 'approved' | 'rejected',
  reviewNote?: string,
): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser || !isGmAccountUser(currentUser)) {
    throw new Error('เฉพาะ GM เท่านั้นที่อนุมัติหรือปฏิเสธสลิปได้')
  }
  const safeReqId = safeDocId(requestId, '')
  if (!safeReqId) throw new Error('รหัสคำขอไม่ถูกต้อง')
  const path = `topupSlipRequests/${safeReqId}`
  try {
    await updateDoc(doc(db, 'topupSlipRequests', safeReqId), {
      status: decision,
      reviewedByUid: currentUser.uid,
      reviewNote: reviewNote ? reviewNote.trim().slice(0, 180) : null,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path)
    throw error
  }
}

export async function markTopupSlipRequestClaimed(requestId: string): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('กรุณาเข้าสู่ระบบ Google ก่อนรับเพชร')
  }
  const safeReqId = safeDocId(requestId, '')
  if (!safeReqId) throw new Error('รหัสคำขอไม่ถูกต้อง')
  const path = `topupSlipRequests/${safeReqId}`
  try {
    await updateDoc(doc(db, 'topupSlipRequests', safeReqId), {
      claimed: true,
      claimedAtMs: Date.now(),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path)
    throw error
  }
}
