'use client'

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { normalizeGameUidInput } from '@/lib/game/permissions'
import { OperationType, auth, db, handleFirestoreError } from './client'
import { ensureUserProfile } from './characters'

export interface PlayerUidProfile {
  gameUid: string
  ownerId: string
  displayName: string
  characterName: string
  level: number
  jobId: string
  isGm: boolean
}

export interface FriendEntry {
  requestId: string
  userId: string
  gameUid: string
  name: string
  isGm: boolean
}

export interface PendingFriendRequest {
  requestId: string
  fromUid: string
  toUid: string
  fromGameUid: string
  toGameUid: string
  fromName: string
  toName: string
  fromIsGm: boolean
  toIsGm: boolean
}

export interface FriendSocialSnapshot {
  friends: FriendEntry[]
  incomingRequests: PendingFriendRequest[]
  outgoingRequests: PendingFriendRequest[]
}

export async function lookupPlayerByGameUid(rawInput: string): Promise<PlayerUidProfile | null> {
  const normalized = normalizeGameUidInput(rawInput)
  if (!normalized) return null

  const uidPath = `playerUids/${normalized}`
  try {
    const snap = await getDoc(doc(db, 'playerUids', normalized))
    if (!snap.exists()) return null
    const d = snap.data()
    return {
      gameUid: String(d.gameUid || normalized),
      ownerId: String(d.ownerId || ''),
      displayName: String(d.displayName || 'นักผจญภัย'),
      characterName: String(d.characterName || d.displayName || 'นักผจญภัย'),
      level: Number(d.level || 1),
      jobId: String(d.jobId || 'novice'),
      isGm: Boolean(d.isGm),
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, uidPath)
  }
}

export async function sendFriendRequestByGameUid(
  rawTarget: string,
  senderCharacterName?: string,
): Promise<{ ok: boolean; message: string; target?: PlayerUidProfile }> {
  const currentUser = auth.currentUser
  if (!currentUser) {
    return { ok: false, message: 'กรุณาเข้าสู่ระบบ Google ก่อนเพิ่มเพื่อน' }
  }
  if (!currentUser.emailVerified) {
    return { ok: false, message: 'บัญชีของคุณยังไม่ได้ยืนยันอีเมล' }
  }

  const normalized = normalizeGameUidInput(rawTarget)
  if (!normalized) {
    return { ok: false, message: 'กรุณาใส่ UID เป็นตัวเลข เช่น 0000 หรือ 0123' }
  }

  const myIdentity = await ensureUserProfile(currentUser)
  if (normalized === myIdentity.gameUid) {
    return { ok: false, message: 'ไม่สามารถเพิ่ม UID ของตัวเองเป็นเพื่อนได้' }
  }

  const target = await lookupPlayerByGameUid(normalized)
  if (!target || !target.ownerId) {
    return { ok: false, message: `ไม่พบผู้เล่นที่มี UID ${normalized}` }
  }
  if (target.ownerId === currentUser.uid) {
    return { ok: false, message: 'ไม่สามารถเพิ่มตัวเองเป็นเพื่อนได้' }
  }

  const forwardId = `${currentUser.uid}__${target.ownerId}`
  const reverseId = `${target.ownerId}__${currentUser.uid}`

  const forwardPath = `friendRequests/${forwardId}`
  const reversePath = `friendRequests/${reverseId}`

  let forwardSnap
  let reverseSnap
  try {
    forwardSnap = await getDoc(doc(db, 'friendRequests', forwardId))
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, forwardPath)
  }
  try {
    reverseSnap = await getDoc(doc(db, 'friendRequests', reverseId))
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, reversePath)
  }

  if (reverseSnap.exists()) {
    const rev = reverseSnap.data()
    if (rev?.status === 'accepted') {
      return { ok: true, message: `คุณเป็นเพื่อนกับ ${target.characterName} (UID ${target.gameUid}) อยู่แล้ว`, target }
    }
    if (rev?.status === 'pending') {
      try {
        await updateDoc(doc(db, 'friendRequests', reverseId), {
          status: 'accepted',
          updatedAt: serverTimestamp(),
        })
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, reversePath)
      }
      return {
        ok: true,
        message: `${target.characterName} (UID ${target.gameUid}) ส่งคำขอมาอยู่แล้ว — ตอบรับเป็นเพื่อนเรียบร้อย!`,
        target,
      }
    }
  }

  if (forwardSnap.exists()) {
    const fwd = forwardSnap.data()
    if (fwd?.status === 'accepted') {
      return { ok: true, message: `คุณเป็นเพื่อนกับ ${target.characterName} (UID ${target.gameUid}) อยู่แล้ว`, target }
    }
    if (fwd?.status === 'pending') {
      return { ok: true, message: `ส่งคำขอถึง ${target.characterName} (UID ${target.gameUid}) ไปแล้ว รอการตอบรับ`, target }
    }
    if (fwd?.status === 'declined') {
      try {
        await deleteDoc(doc(db, 'friendRequests', forwardId))
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, forwardPath)
      }
    }
  }

  const myName = (senderCharacterName?.trim() || myIdentity.displayName || 'นักผจญภัย').slice(0, 100)
  const targetName = (target.characterName || target.displayName || 'นักผจญภัย').slice(0, 100)

  try {
    await setDoc(doc(db, 'friendRequests', forwardId), {
      requestId: forwardId,
      fromUid: currentUser.uid,
      toUid: target.ownerId,
      fromGameUid: myIdentity.gameUid,
      toGameUid: target.gameUid,
      fromName: myName,
      toName: targetName,
      fromIsGm: myIdentity.isGm,
      toIsGm: target.isGm,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, forwardPath)
  }

  return {
    ok: true,
    message: `ส่งคำขอเพื่อนไปยัง ${targetName} (UID ${target.gameUid}) แล้ว`,
    target,
  }
}

export async function respondToFriendRequest(
  requesterUid: string,
  decision: 'accepted' | 'declined',
): Promise<{ ok: boolean; message: string }> {
  const currentUser = auth.currentUser
  if (!currentUser) {
    return { ok: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
  }

  const requestId = `${requesterUid}__${currentUser.uid}`
  const path = `friendRequests/${requestId}`
  try {
    await updateDoc(doc(db, 'friendRequests', requestId), {
      status: decision,
      updatedAt: serverTimestamp(),
    })
    return {
      ok: true,
      message: decision === 'accepted' ? 'ตอบรับคำขอเป็นเพื่อนแล้ว' : 'ปฏิเสธคำขอเป็นเพื่อนแล้ว',
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path)
  }
}

export async function removeFriendshipOrRequest(requestId: string): Promise<{ ok: boolean; message: string }> {
  const currentUser = auth.currentUser
  if (!currentUser) return { ok: false, message: 'กรุณาเข้าสู่ระบบก่อน' }

  const safeId = requestId.replace(/[^a-zA-Z0-9_-]/g, '')
  const path = `friendRequests/${safeId}`
  try {
    await deleteDoc(doc(db, 'friendRequests', safeId))
    return { ok: true, message: 'อัปเดตรายชื่อเพื่อนเรียบร้อยแล้ว' }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path)
  }
}

export function subscribeFriendSocialState(
  userId: string,
  onChange: (snapshot: FriendSocialSnapshot) => void,
): () => void {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== userId || !currentUser.emailVerified) {
    onChange({ friends: [], incomingRequests: [], outgoingRequests: [] })
    return () => {}
  }

  const incomingDocs = new Map<string, PendingFriendRequest & { status: string }>()
  const outgoingDocs = new Map<string, PendingFriendRequest & { status: string }>()

  const emit = () => {
    const friendsByUser = new Map<string, FriendEntry>()
    const incomingRequests: PendingFriendRequest[] = []
    const outgoingRequests: PendingFriendRequest[] = []

    for (const row of incomingDocs.values()) {
      if (row.status === 'pending') {
        incomingRequests.push(row)
      } else if (row.status === 'accepted') {
        friendsByUser.set(row.fromUid, {
          requestId: row.requestId,
          userId: row.fromUid,
          gameUid: row.fromGameUid,
          name: row.fromName,
          isGm: row.fromIsGm,
        })
      }
    }

    for (const row of outgoingDocs.values()) {
      if (row.status === 'pending') {
        outgoingRequests.push(row)
      } else if (row.status === 'accepted') {
        friendsByUser.set(row.toUid, {
          requestId: row.requestId,
          userId: row.toUid,
          gameUid: row.toGameUid,
          name: row.toName,
          isGm: row.toIsGm,
        })
      }
    }

    onChange({
      friends: [...friendsByUser.values()],
      incomingRequests,
      outgoingRequests,
    })
  }

  const toQuery = query(collection(db, 'friendRequests'), where('toUid', '==', userId))
  const fromQuery = query(collection(db, 'friendRequests'), where('fromUid', '==', userId))

  const unsubTo = onSnapshot(
    toQuery,
    (snap) => {
      incomingDocs.clear()
      snap.forEach((docSnap) => {
        const d = docSnap.data()
        incomingDocs.set(docSnap.id, {
          requestId: docSnap.id,
          fromUid: String(d.fromUid || ''),
          toUid: String(d.toUid || ''),
          fromGameUid: String(d.fromGameUid || ''),
          toGameUid: String(d.toGameUid || ''),
          fromName: String(d.fromName || 'นักผจญภัย'),
          toName: String(d.toName || 'นักผจญภัย'),
          fromIsGm: Boolean(d.fromIsGm),
          toIsGm: Boolean(d.toIsGm),
          status: String(d.status || 'pending'),
        })
      })
      emit()
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friendRequests')
    },
  )

  const unsubFrom = onSnapshot(
    fromQuery,
    (snap) => {
      outgoingDocs.clear()
      snap.forEach((docSnap) => {
        const d = docSnap.data()
        outgoingDocs.set(docSnap.id, {
          requestId: docSnap.id,
          fromUid: String(d.fromUid || ''),
          toUid: String(d.toUid || ''),
          fromGameUid: String(d.fromGameUid || ''),
          toGameUid: String(d.toGameUid || ''),
          fromName: String(d.fromName || 'นักผจญภัย'),
          toName: String(d.toName || 'นักผจญภัย'),
          fromIsGm: Boolean(d.fromIsGm),
          toIsGm: Boolean(d.toIsGm),
          status: String(d.status || 'pending'),
        })
      })
      emit()
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friendRequests')
    },
  )

  return () => {
    unsubTo()
    unsubFrom()
  }
}
