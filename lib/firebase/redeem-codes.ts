'use client'

import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { isGmAccountUser, normalizeGameUidInput } from '@/lib/game/permissions'
import { OperationType, auth, db, handleFirestoreError } from './client'

export interface RedeemCodeRecord {
  code: string
  label: string
  gold: number
  diamonds: number
  itemId: string | null
  qty: number
  plus: number
  vipExp: number
  maxUses: number
  usedCount: number
  active: boolean
  expiresAtMs: number | null
  createdByUid: string
  createdAtMs: number
}

export function normalizeRedeemCodeInput(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32)
}

function mapRedeemCodeDoc(id: string, d: Record<string, unknown>): RedeemCodeRecord {
  return {
    code: String(d.code ?? id),
    label: String(d.label ?? 'โค้ดรางวัลจาก GM'),
    gold: Math.max(0, Math.floor(Number(d.gold ?? 0) || 0)),
    diamonds: Math.max(0, Math.floor(Number(d.diamonds ?? 0) || 0)),
    itemId: typeof d.itemId === 'string' && d.itemId.trim() ? d.itemId : null,
    qty: Math.max(0, Math.floor(Number(d.qty ?? 0) || 0)),
    plus: Math.max(0, Math.floor(Number(d.plus ?? 0) || 0)),
    vipExp: Math.max(0, Math.floor(Number(d.vipExp ?? 0) || 0)),
    maxUses: Math.max(1, Math.floor(Number(d.maxUses ?? 1) || 1)),
    usedCount: Math.max(0, Math.floor(Number(d.usedCount ?? 0) || 0)),
    active: Boolean(d.active),
    expiresAtMs: typeof d.expiresAtMs === 'number' ? d.expiresAtMs : null,
    createdByUid: String(d.createdByUid ?? ''),
    createdAtMs: Number(d.createdAtMs ?? 0),
  }
}

export async function createOrUpdateRedeemCodeForGm(input: {
  code: string
  label: string
  gold: number
  diamonds: number
  itemId?: string | null
  qty?: number
  plus?: number
  vipExp?: number
  maxUses: number
  expiresHours?: number | null
}): Promise<RedeemCodeRecord> {
  const user = auth.currentUser
  if (!user || !isGmAccountUser(user)) {
    throw new Error('เฉพาะ GM เท่านั้นที่สร้างโค้ดรางวัลได้')
  }
  const code = normalizeRedeemCodeInput(input.code)
  if (code.length < 4) {
    throw new Error('รหัสโค้ดต้องมีอย่างน้อย 4 ตัวอักษร (A-Z, 0-9, -, _)')
  }
  const nowMs = Date.now()
  const itemId = input.itemId && input.itemId.trim() ? input.itemId.trim().slice(0, 64) : null
  const qty = itemId ? Math.max(1, Math.min(99, Math.floor(Number(input.qty) || 1))) : 0
  const plus = itemId ? Math.max(0, Math.min(15, Math.floor(Number(input.plus) || 0))) : 0
  const maxUses = Math.max(1, Math.min(100000, Math.floor(Number(input.maxUses) || 1)))
  const expiresAtMs =
    typeof input.expiresHours === 'number' && Number.isFinite(input.expiresHours) && input.expiresHours > 0
      ? nowMs + Math.round(input.expiresHours * 3600 * 1000)
      : null

  const record: RedeemCodeRecord = {
    code,
    label: (input.label.trim() || `โค้ด ${code}`).slice(0, 80),
    gold: Math.max(0, Math.min(10_000_000, Math.floor(Number(input.gold) || 0))),
    diamonds: Math.max(0, Math.min(100_000, Math.floor(Number(input.diamonds) || 0))),
    itemId,
    qty,
    plus,
    vipExp: Math.max(0, Math.min(50_000, Math.floor(Number(input.vipExp) || 0))),
    maxUses,
    usedCount: 0,
    active: true,
    expiresAtMs,
    createdByUid: user.uid,
    createdAtMs: nowMs,
  }

  const path = `redeemCodes/${code}`
  try {
    await setDoc(doc(db, 'redeemCodes', code), {
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

export async function listRedeemCodesForGm(maxRows = 40): Promise<RedeemCodeRecord[]> {
  const user = auth.currentUser
  if (!user || !isGmAccountUser(user)) return []
  const path = 'redeemCodes'
  try {
    const q = query(
      collection(db, 'redeemCodes'),
      orderBy('createdAtMs', 'desc'),
      limit(Math.max(1, Math.min(50, maxRows))),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => mapRedeemCodeDoc(d.id, d.data()))
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path)
    return []
  }
}

export async function toggleRedeemCodeActiveForGm(code: string, active: boolean): Promise<void> {
  const user = auth.currentUser
  if (!user || !isGmAccountUser(user)) {
    throw new Error('เฉพาะ GM เท่านั้นที่แก้ไขสถานะโค้ดได้')
  }
  const cleanCode = normalizeRedeemCodeInput(code)
  if (!cleanCode) throw new Error('รหัสโค้ดไม่ถูกต้อง')
  const path = `redeemCodes/${cleanCode}`
  try {
    await updateDoc(doc(db, 'redeemCodes', cleanCode), {
      active: Boolean(active),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path)
    throw error
  }
}

export async function claimRedeemCodeInFirestore(
  rawCode: string,
  playerInfo: { characterId: string; playerName: string; gameUid: string },
): Promise<RedeemCodeRecord> {
  const user = auth.currentUser
  if (!user || !user.emailVerified) {
    throw new Error('กรุณาเข้าสู่ระบบ Google ที่ยืนยันอีเมลแล้วก่อนใช้โค้ดรางวัล')
  }
  const code = normalizeRedeemCodeInput(rawCode)
  if (code.length < 4) {
    throw new Error('รูปแบบโค้ดรางวัลไม่ถูกต้อง')
  }
  const codeRef = doc(db, 'redeemCodes', code)
  const claimRef = doc(db, 'redeemCodes', code, 'claims', user.uid)
  const safeCharId = playerInfo.characterId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'slot_1'
  const safeGameUid = normalizeGameUidInput(playerInfo.gameUid) || '1000'
  const path = `redeemCodes/${code}`

  try {
    return await runTransaction(db, async (tx) => {
      const codeSnap = await tx.get(codeRef)
      if (!codeSnap.exists()) {
        throw new Error('ไม่พบโค้ดรางวัลนี้ในระบบ')
      }
      const rec = mapRedeemCodeDoc(codeSnap.id, codeSnap.data())
      if (!rec.active) {
        throw new Error('โค้ดรางวัลนี้ถูกปิดใช้งานแล้ว')
      }
      if (rec.expiresAtMs !== null && Date.now() > rec.expiresAtMs) {
        throw new Error('โค้ดรางวัลนี้หมดอายุแล้ว')
      }
      if (rec.usedCount >= rec.maxUses) {
        throw new Error('โค้ดรางวัลนี้ถูกใช้ครบจำนวนสิทธิ์แล้ว')
      }

      const claimSnap = await tx.get(claimRef)
      if (claimSnap.exists()) {
        throw new Error('บัญชีนี้ใช้โค้ดรางวัลนี้ไปแล้ว (จำกัด 1 ครั้งต่อบัญชี)')
      }

      tx.set(claimRef, {
        uid: user.uid,
        code,
        characterId: safeCharId,
        playerName: (playerInfo.playerName.trim() || 'นักผจญภัย').slice(0, 40),
        gameUid: safeGameUid,
        claimedAtMs: Date.now(),
        createdAt: serverTimestamp(),
      })
      tx.update(codeRef, {
        usedCount: rec.usedCount + 1,
        updatedAt: serverTimestamp(),
      })

      return { ...rec, usedCount: rec.usedCount + 1 }
    })
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission') && !error.message.includes('PERMISSION_DENIED')) {
      throw error
    }
    handleFirestoreError(error, OperationType.WRITE, path)
    throw error
  }
}
