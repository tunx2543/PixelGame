'use client'

import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import type { AuditLogEntry, DiamondTransaction } from '@/lib/game/premium/types'
import { OperationType, auth, db, handleFirestoreError } from './client'

function safeDocId(raw: string, fallback: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  return cleaned.length > 0 ? cleaned : fallback
}

export async function recordDiamondTransaction(
  userId: string,
  characterId: string,
  tx: DiamondTransaction,
): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser || !currentUser.emailVerified || currentUser.uid !== userId) return

  const safeCharId = safeDocId(characterId, 'slot_1')
  const safeTxId = safeDocId(tx.txId, `TX-${Date.now()}`)
  const path = `users/${userId}/characters/${safeCharId}/diamondTransactions/${safeTxId}`

  try {
    await setDoc(doc(db, 'users', userId, 'characters', safeCharId, 'diamondTransactions', safeTxId), {
      txId: safeTxId,
      requestId: safeDocId(tx.requestId, safeTxId),
      ownerId: userId,
      characterId: safeCharId,
      type: tx.type,
      source: String(tx.source).slice(0, 48),
      amount: Math.max(0, Math.floor(tx.amount)),
      balanceBefore: Math.max(0, Math.floor(tx.balanceBefore)),
      balanceAfter: Math.max(0, Math.floor(tx.balanceAfter)),
      productId: tx.productId ? String(tx.productId).slice(0, 64) : null,
      itemId: tx.itemId ? String(tx.itemId).slice(0, 64) : null,
      note: String(tx.note || 'Diamond ledger update').slice(0, 180),
      actorUid: String(tx.actorUid || userId).slice(0, 128),
      isGm: Boolean(tx.isGm),
      serverVerified: Boolean(tx.serverVerified),
      serverSignature: tx.serverSignature ? String(tx.serverSignature).slice(0, 64) : null,
      createdAtMs: Math.max(0, Math.floor(tx.createdAtMs)),
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path)
  }
}

export async function recordPremiumAuditLog(
  userId: string,
  characterId: string,
  entry: AuditLogEntry,
): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser || !currentUser.emailVerified || currentUser.uid !== userId) return

  const safeCharId = safeDocId(characterId, 'slot_1')
  const safeLogId = safeDocId(entry.logId, `AUD-${Date.now()}`)
  const path = `users/${userId}/characters/${safeCharId}/auditLogs/${safeLogId}`

  try {
    await setDoc(doc(db, 'users', userId, 'characters', safeCharId, 'auditLogs', safeLogId), {
      logId: safeLogId,
      ownerId: userId,
      characterId: safeCharId,
      action: entry.action,
      actorUid: String(entry.actorUid || userId).slice(0, 128),
      actorRole: entry.actorRole === 'gm' ? 'gm' : 'player',
      txId: entry.txId ? safeDocId(entry.txId, safeLogId) : null,
      details: String(entry.details || '-').slice(0, 240),
      verifiedByServer: Boolean(entry.verifiedByServer),
      createdAtMs: Math.max(0, Math.floor(entry.createdAtMs)),
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path)
  }
}

export async function listRecentDiamondTransactions(
  userId: string,
  characterId: string,
  maxRows = 40,
): Promise<DiamondTransaction[]> {
  const currentUser = auth.currentUser
  if (!currentUser || !currentUser.emailVerified || currentUser.uid !== userId) return []

  const safeCharId = safeDocId(characterId, 'slot_1')
  const path = `users/${userId}/characters/${safeCharId}/diamondTransactions`
  try {
    const q = query(
      collection(db, 'users', userId, 'characters', safeCharId, 'diamondTransactions'),
      where('ownerId', '==', userId),
      orderBy('createdAtMs', 'desc'),
      limit(Math.max(1, Math.min(100, maxRows))),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => {
      const data = d.data()
      return {
        txId: String(data.txId ?? d.id),
        requestId: String(data.requestId ?? d.id),
        characterId: String(data.characterId ?? safeCharId),
        type: data.type,
        source: String(data.source ?? ''),
        amount: Number(data.amount ?? 0),
        balanceBefore: Number(data.balanceBefore ?? 0),
        balanceAfter: Number(data.balanceAfter ?? 0),
        productId: data.productId ?? undefined,
        itemId: data.itemId ?? undefined,
        note: String(data.note ?? ''),
        createdAtMs: Number(data.createdAtMs ?? 0),
        actorUid: String(data.actorUid ?? userId),
        isGm: Boolean(data.isGm),
        serverVerified: Boolean(data.serverVerified),
        serverSignature: data.serverSignature ?? undefined,
      } satisfies DiamondTransaction
    })
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path)
    return []
  }
}

export async function listRecentAuditLogs(
  userId: string,
  characterId: string,
  maxRows = 40,
): Promise<AuditLogEntry[]> {
  const currentUser = auth.currentUser
  if (!currentUser || !currentUser.emailVerified || currentUser.uid !== userId) return []

  const safeCharId = safeDocId(characterId, 'slot_1')
  const path = `users/${userId}/characters/${safeCharId}/auditLogs`
  try {
    const q = query(
      collection(db, 'users', userId, 'characters', safeCharId, 'auditLogs'),
      where('ownerId', '==', userId),
      orderBy('createdAtMs', 'desc'),
      limit(Math.max(1, Math.min(100, maxRows))),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => {
      const data = d.data()
      return {
        logId: String(data.logId ?? d.id),
        action: data.action,
        characterId: String(data.characterId ?? safeCharId),
        actorUid: String(data.actorUid ?? userId),
        actorRole: data.actorRole === 'gm' ? 'gm' : 'player',
        txId: data.txId ?? undefined,
        details: String(data.details ?? ''),
        verifiedByServer: Boolean(data.verifiedByServer),
        createdAtMs: Number(data.createdAtMs ?? 0),
      } satisfies AuditLogEntry
    })
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path)
    return []
  }
}
