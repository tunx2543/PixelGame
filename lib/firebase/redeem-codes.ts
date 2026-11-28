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

export interface RedeemCodeClaimTx {
  txId: string
  requestId: string
  actorUid: string
  timestampMs: number
  serverSignature?: string
}

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
  claimTx?: RedeemCodeClaimTx
}

const GUEST_REDEEM_CLIENT_KEY = 'pixelquest_redeem_client_id'

export function normalizeRedeemCodeInput(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32)
}

function getGuestRedeemClientId(): string {
  if (typeof window === 'undefined') return 'ssr_guest'
  try {
    const existing = window.localStorage.getItem(GUEST_REDEEM_CLIENT_KEY)
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) {
      return existing
    }
    const generated = `pq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(GUEST_REDEEM_CLIENT_KEY, generated)
    return generated
  } catch {
    return 'local_guest'
  }
}

async function getOptionalAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser
  if (!user) return { 'Content-Type': 'application/json' }
  try {
    const token = await user.getIdToken()
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
  } catch {
    return { 'Content-Type': 'application/json' }
  }
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
  const expiresHours =
    typeof input.expiresHours === 'number' && Number.isFinite(input.expiresHours) && input.expiresHours > 0
      ? input.expiresHours
      : null
  const expiresAtMs = expiresHours !== null ? nowMs + Math.round(expiresHours * 3600 * 1000) : null

  const headers = await getOptionalAuthHeaders()
  const apiRes = await fetch('/api/redeem', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'upsert',
      code,
      label: input.label,
      gold: Number(input.gold) || 0,
      diamonds: Number(input.diamonds) || 0,
      itemId,
      qty,
      plus,
      vipExp: Number(input.vipExp) || 0,
      maxUses,
      expiresHours,
      active: true,
    }),
  })
  const apiJson = (await apiRes.json().catch(() => null)) as {
    ok?: boolean
    record?: RedeemCodeRecord
    message?: string
  } | null
  if (!apiRes.ok || !apiJson?.ok || !apiJson.record) {
    throw new Error(apiJson?.message || 'สร้างโค้ดรางวัลบนเซิร์ฟเวอร์ไม่สำเร็จ')
  }

  const record: RedeemCodeRecord = apiJson.record

  // Best-effort Firestore mirror for cross-instance persistence
  try {
    await setDoc(doc(db, 'redeemCodes', code), {
      code: record.code,
      label: record.label,
      gold: record.gold,
      diamonds: record.diamonds,
      itemId: record.itemId,
      qty: record.qty,
      plus: record.plus,
      vipExp: record.vipExp,
      maxUses: record.maxUses,
      usedCount: 0,
      active: record.active,
      expiresAtMs,
      createdByUid: user.uid,
      createdAtMs: record.createdAtMs,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.CREATE, `redeemCodes/${code}`)
    } catch {
      // Server store already saved authoritatively
    }
  }

  return record
}

export async function listRedeemCodesForGm(maxRows = 50): Promise<RedeemCodeRecord[]> {
  const user = auth.currentUser
  if (!user || !isGmAccountUser(user)) return []

  const byCode = new Map<string, RedeemCodeRecord>()

  try {
    const headers = await getOptionalAuthHeaders()
    const res = await fetch('/api/redeem', { headers, cache: 'no-store' })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; codes?: RedeemCodeRecord[] } | null
    if (res.ok && json?.ok && Array.isArray(json.codes)) {
      for (const item of json.codes) {
        if (item?.code) byCode.set(item.code, item)
      }
    }
  } catch {
    // Fallback to Firestore
  }

  try {
    const q = query(
      collection(db, 'redeemCodes'),
      orderBy('createdAtMs', 'desc'),
      limit(Math.max(1, Math.min(50, maxRows))),
    )
    const snap = await getDocs(q)
    for (const d of snap.docs) {
      const mapped = mapRedeemCodeDoc(d.id, d.data())
      const existing = byCode.get(mapped.code)
      if (!existing) {
        byCode.set(mapped.code, mapped)
      } else if (mapped.usedCount > existing.usedCount) {
        byCode.set(mapped.code, { ...existing, usedCount: mapped.usedCount })
      }
    }
  } catch {
    // Non-fatal if Firestore rules block or offline
  }

  return [...byCode.values()]
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, maxRows)
}

export async function toggleRedeemCodeActiveForGm(code: string, active: boolean): Promise<void> {
  const user = auth.currentUser
  if (!user || !isGmAccountUser(user)) {
    throw new Error('เฉพาะ GM เท่านั้นที่แก้ไขสถานะโค้ดได้')
  }
  const cleanCode = normalizeRedeemCodeInput(code)
  if (!cleanCode) throw new Error('รหัสโค้ดไม่ถูกต้อง')

  const headers = await getOptionalAuthHeaders()
  const res = await fetch('/api/redeem', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'toggle',
      code: cleanCode,
      active: Boolean(active),
    }),
  })
  const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null
  let serverToggled = Boolean(res.ok && json?.ok)

  try {
    await updateDoc(doc(db, 'redeemCodes', cleanCode), {
      active: Boolean(active),
      updatedAt: serverTimestamp(),
    })
    serverToggled = true
  } catch (error) {
    if (!serverToggled) {
      handleFirestoreError(error, OperationType.UPDATE, `redeemCodes/${cleanCode}`)
      throw error
    }
  }

  if (!serverToggled) {
    throw new Error(json?.message || 'เปลี่ยนสถานะโค้ดไม่สำเร็จ')
  }
}

export async function deleteRedeemCodeForGm(code: string): Promise<void> {
  const user = auth.currentUser
  if (!user || !isGmAccountUser(user)) {
    throw new Error('เฉพาะ GM เท่านั้นที่ลบโค้ดได้')
  }
  const cleanCode = normalizeRedeemCodeInput(code)
  if (!cleanCode) throw new Error('รหัสโค้ดไม่ถูกต้อง')
  const headers = await getOptionalAuthHeaders()
  const res = await fetch('/api/redeem', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'delete',
      code: cleanCode,
    }),
  })
  const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null
  if (!res.ok || !json?.ok) {
    throw new Error(json?.message || 'ลบโค้ดรางวัลไม่สำเร็จ')
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

export async function claimRedeemCodeEverywhere(
  rawCode: string,
  playerInfo: { characterId: string; playerName: string; gameUid: string },
): Promise<RedeemCodeRecord> {
  const code = normalizeRedeemCodeInput(rawCode)
  if (code.length < 4) {
    throw new Error('กรุณากรอกโค้ดรางวัลอย่างน้อย 4 ตัวอักษร (A-Z, 0-9, -, _)')
  }

  const headers = await getOptionalAuthHeaders()
  const guestClientId = getGuestRedeemClientId()
  const res = await fetch('/api/redeem', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'claim',
      code,
      guestClientId,
      characterId: playerInfo.characterId,
      playerName: playerInfo.playerName,
      gameUid: playerInfo.gameUid,
    }),
  })
  const json = (await res.json().catch(() => null)) as {
    ok?: boolean
    errorCode?: string
    message?: string
    record?: RedeemCodeRecord
    claimTx?: RedeemCodeClaimTx
  } | null

  if (res.ok && json?.ok && json.record) {
    // Ensure Firestore redeem claim doc exists before character save writes claimedRedeemCodes
    const user = auth.currentUser
    if (user && user.emailVerified) {
      await claimRedeemCodeInFirestore(code, playerInfo).catch(() => {})
    }
    return {
      ...json.record,
      claimTx: json.claimTx,
    }
  }

  // If server store doesn't have the code yet, check Firestore for legacy/pre-created codes
  if (json?.errorCode === 'not_found' && auth.currentUser?.emailVerified) {
    return await claimRedeemCodeInFirestore(code, playerInfo)
  }

  throw new Error(json?.message || 'ไม่สามารถใช้โค้ดรางวัลนี้ได้')
}
