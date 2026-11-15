'use client'

import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { isGmAccountUser, normalizeGameUidInput } from '@/lib/game/permissions'
import { OperationType, auth, db, handleFirestoreError } from './client'
import { ensureUserProfile } from './characters'
import { lookupPlayerByGameUid } from './friends'
import {
  MAX_PARTY_SIZE,
  type BuildPartyMemberInput,
  type PartyInviteRecord,
  type PartyRecord,
  buildPartyMemberSnapshot,
  normalizePartyName,
  parsePartyDoc,
  parsePartyInviteDoc,
  pickNextLeaderId,
} from './party-helpers'

export interface PartyActionResult<T = undefined> {
  ok: boolean
  message: string
  data?: T
}

export async function createParty(
  rawPartyName: string | undefined,
  memberInput: Omit<BuildPartyMemberInput, 'userId' | 'isGm'>,
  currentParty?: PartyRecord | null,
): Promise<PartyActionResult<PartyRecord>> {
  const currentUser = auth.currentUser
  if (!currentUser) {
    return { ok: false, message: 'กรุณาเข้าสู่ระบบ Google ก่อนสร้างปาร์ตี้' }
  }
  if (!currentUser.emailVerified) {
    return { ok: false, message: 'บัญชีของคุณยังไม่ได้ยืนยันอีเมล' }
  }

  const identity = await ensureUserProfile(currentUser)
  const isGm = Boolean(identity.isGm && isGmAccountUser(currentUser))

  const memberSnap = buildPartyMemberSnapshot({
    ...memberInput,
    userId: currentUser.uid,
    isGm,
    gameUid: identity.gameUid,
    uid: Number(identity.gameUid),
  })

  if (!memberSnap) {
    return { ok: false, message: 'ไม่พบข้อมูลตัวละครหรือ UID สำหรับสร้างปาร์ตี้' }
  }

  if (currentParty) {
    await leaveParty(currentParty, currentUser.uid)
  }

  const safeUidPrefix = currentUser.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 8) || 'p'
  const partyId = `pty_${safeUidPrefix}_${Date.now().toString(36)}`
  const partyName = normalizePartyName(rawPartyName, memberSnap.name)
  const partyPath = `parties/${partyId}`

  try {
    await setDoc(doc(db, 'parties', partyId), {
      partyId,
      name: partyName,
      leaderId: currentUser.uid,
      memberIds: [currentUser.uid],
      members: {
        [currentUser.uid]: memberSnap,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, partyPath)
  }

  return {
    ok: true,
    message: `สร้างปาร์ตี้ "${partyName}" สำเร็จ!`,
    data: {
      partyId,
      name: partyName,
      leaderId: currentUser.uid,
      memberIds: [currentUser.uid],
      members: { [currentUser.uid]: memberSnap },
    },
  }
}

export async function syncMyPartyMemberSnapshot(
  partyId: string,
  memberInput: Omit<BuildPartyMemberInput, 'userId' | 'isGm'>,
): Promise<boolean> {
  const currentUser = auth.currentUser
  if (!currentUser || !currentUser.emailVerified || !partyId) return false

  const isGm = isGmAccountUser(currentUser)
  const memberSnap = buildPartyMemberSnapshot({
    ...memberInput,
    userId: currentUser.uid,
    isGm,
  })
  if (!memberSnap) return false

  try {
    await updateDoc(doc(db, 'parties', partyId), {
      [`members.${currentUser.uid}`]: memberSnap,
      updatedAt: serverTimestamp(),
    })
    return true
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? ''
    if (code === 'not-found' || code === 'permission-denied') {
      return false
    }
    return false
  }
}

export async function sendPartyInvite(params: {
  party: PartyRecord
  targetGameUid: string
  senderName?: string
}): Promise<PartyActionResult> {
  const currentUser = auth.currentUser
  if (!currentUser) {
    return { ok: false, message: 'กรุณาเข้าสู่ระบบ Google ก่อนชวนเข้าปาร์ตี้' }
  }
  if (!currentUser.emailVerified) {
    return { ok: false, message: 'บัญชีของคุณยังไม่ได้ยืนยันอีเมล' }
  }

  const { party } = params
  if (party.leaderId !== currentUser.uid) {
    return { ok: false, message: 'เฉพาะหัวหน้าปาร์ตี้เท่านั้นที่ชวนผู้เล่นได้' }
  }
  if (party.memberIds.length >= MAX_PARTY_SIZE) {
    return { ok: false, message: `ปาร์ตี้เต็มแล้ว (${MAX_PARTY_SIZE}/${MAX_PARTY_SIZE} คน)` }
  }

  const normalizedTargetUid = normalizeGameUidInput(params.targetGameUid)
  if (!normalizedTargetUid) {
    return { ok: false, message: 'กรุณาใส่ UID ตัวเลขของผู้เล่น เช่น 0123 หรือ 0000' }
  }

  const myIdentity = await ensureUserProfile(currentUser)
  if (normalizedTargetUid === myIdentity.gameUid) {
    return { ok: false, message: 'ไม่สามารถชวนตัวเองเข้าปาร์ตี้ได้' }
  }

  const target = await lookupPlayerByGameUid(normalizedTargetUid)
  if (!target || !target.ownerId) {
    return { ok: false, message: `ไม่พบผู้เล่นที่มี UID ${normalizedTargetUid}` }
  }
  if (target.ownerId === currentUser.uid) {
    return { ok: false, message: 'ไม่สามารถชวนตัวเองเข้าปาร์ตี้ได้' }
  }
  if (party.memberIds.includes(target.ownerId)) {
    return { ok: false, message: `${target.characterName} อยู่ในปาร์ตี้นี้อยู่แล้ว` }
  }

  const inviteId = `${party.partyId}__${target.ownerId}`
  const invitePath = `partyInvites/${inviteId}`

  let existingSnap
  try {
    existingSnap = await getDoc(doc(db, 'partyInvites', inviteId))
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, invitePath)
  }

  if (existingSnap.exists()) {
    const prev = existingSnap.data()
    if (prev?.status === 'pending') {
      return {
        ok: true,
        message: `ส่งคำเชิญปาร์ตี้ถึง ${target.characterName} (UID ${target.gameUid}) ไปแล้ว รอการตอบรับ`,
      }
    }
    try {
      await deleteDoc(doc(db, 'partyInvites', inviteId))
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, invitePath)
    }
  }

  const fromName = (params.senderName?.trim() || myIdentity.displayName || 'นักผจญภัย').slice(0, 24) || 'นักผจญภัย'
  const toName = (target.characterName || target.displayName || 'นักผจญภัย').slice(0, 24) || 'นักผจญภัย'

  try {
    await setDoc(doc(db, 'partyInvites', inviteId), {
      inviteId,
      partyId: party.partyId,
      partyName: normalizePartyName(party.name),
      fromUid: currentUser.uid,
      toUid: target.ownerId,
      fromGameUid: myIdentity.gameUid,
      toGameUid: target.gameUid,
      fromName,
      toName,
      fromIsGm: myIdentity.isGm,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, invitePath)
  }

  return {
    ok: true,
    message: `ส่งคำเชิญปาร์ตี้ถึง ${toName} (UID ${target.gameUid}) แล้ว`,
  }
}

export async function invitePlayerToPartyAutoCreate(params: {
  currentParty?: PartyRecord | null
  targetGameUid: string
  memberInput: Omit<BuildPartyMemberInput, 'userId' | 'isGm'>
  senderName?: string
}): Promise<PartyActionResult<PartyRecord>> {
  let party = params.currentParty ?? null
  if (!party) {
    const created = await createParty(undefined, params.memberInput, null)
    if (!created.ok || !created.data) {
      return { ok: false, message: created.message }
    }
    party = created.data
  }
  const inviteRes = await sendPartyInvite({
    party,
    targetGameUid: params.targetGameUid,
    senderName: params.senderName ?? params.memberInput.name,
  })
  return {
    ok: inviteRes.ok,
    message: inviteRes.message,
    data: party,
  }
}

export async function respondPartyInvite(
  invite: PartyInviteRecord,
  decision: 'accepted' | 'declined',
  memberInput: Omit<BuildPartyMemberInput, 'userId' | 'isGm'>,
  currentParty?: PartyRecord | null,
): Promise<PartyActionResult> {
  const currentUser = auth.currentUser
  if (!currentUser) {
    return { ok: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
  }
  if (!currentUser.emailVerified) {
    return { ok: false, message: 'บัญชีของคุณยังไม่ได้ยืนยันอีเมล' }
  }

  const invitePath = `partyInvites/${invite.inviteId}`

  if (decision === 'declined') {
    try {
      await updateDoc(doc(db, 'partyInvites', invite.inviteId), {
        status: 'declined',
        updatedAt: serverTimestamp(),
      })
      return { ok: true, message: `ปฏิเสธคำเชิญปาร์ตี้ "${invite.partyName}" แล้ว` }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, invitePath)
    }
  }

  const identity = await ensureUserProfile(currentUser)
  const isGm = Boolean(identity.isGm && isGmAccountUser(currentUser))
  const memberSnap = buildPartyMemberSnapshot({
    ...memberInput,
    userId: currentUser.uid,
    isGm,
    gameUid: identity.gameUid,
    uid: Number(identity.gameUid),
  })
  if (!memberSnap) {
    return { ok: false, message: 'ไม่พบข้อมูลตัวละครหรือ UID ของคุณ' }
  }

  if (currentParty && currentParty.partyId !== invite.partyId) {
    await leaveParty(currentParty, currentUser.uid)
  }

  const partyPath = `parties/${invite.partyId}`
  try {
    await updateDoc(doc(db, 'parties', invite.partyId), {
      memberIds: arrayUnion(currentUser.uid),
      [`members.${currentUser.uid}`]: memberSnap,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? ''
    if (code === 'not-found' || code === 'permission-denied') {
      try {
        await deleteDoc(doc(db, 'partyInvites', invite.inviteId))
      } catch {
        // Ignore stale invite cleanup failures.
      }
      return { ok: false, message: 'ปาร์ตี้นี้เต็มหรือถูกยุบไปแล้ว' }
    }
    handleFirestoreError(error, OperationType.UPDATE, partyPath)
  }

  try {
    await updateDoc(doc(db, 'partyInvites', invite.inviteId), {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, invitePath)
  }

  return { ok: true, message: `เข้าร่วมปาร์ตี้ "${invite.partyName}" สำเร็จ!` }
}

export async function leaveParty(
  party: PartyRecord,
  selfUid: string,
): Promise<PartyActionResult> {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== selfUid) {
    return { ok: false, message: 'ไม่สามารถดำเนินการได้' }
  }

  const partyPath = `parties/${party.partyId}`
  const remainingCount = party.memberIds.filter((id) => id !== selfUid).length

  if (remainingCount === 0) {
    try {
      await deleteDoc(doc(db, 'parties', party.partyId))
      return { ok: true, message: `ออกจากปาร์ตี้ "${party.name}" และยุบปาร์ตี้แล้ว` }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, partyPath)
    }
  }

  const nextLeaderId = pickNextLeaderId(party.memberIds, party.leaderId, selfUid)
  if (!nextLeaderId) {
    return { ok: false, message: 'ไม่พบหัวหน้าปาร์ตี้คนถัดไป' }
  }

  try {
    await updateDoc(doc(db, 'parties', party.partyId), {
      leaderId: nextLeaderId,
      memberIds: arrayRemove(selfUid),
      [`members.${selfUid}`]: deleteField(),
      updatedAt: serverTimestamp(),
    })
    return { ok: true, message: `ออกจากปาร์ตี้ "${party.name}" แล้ว` }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, partyPath)
  }
}

export async function kickPartyMember(
  party: PartyRecord,
  targetUid: string,
): Promise<PartyActionResult> {
  const currentUser = auth.currentUser
  if (!currentUser || party.leaderId !== currentUser.uid) {
    return { ok: false, message: 'เฉพาะหัวหน้าปาร์ตี้เท่านั้นที่เตะสมาชิกได้' }
  }
  if (targetUid === currentUser.uid) {
    return { ok: false, message: 'ไม่สามารถเตะตัวเองได้ กรุณากดออกจากปาร์ตี้แทน' }
  }

  const partyPath = `parties/${party.partyId}`
  try {
    await updateDoc(doc(db, 'parties', party.partyId), {
      memberIds: arrayRemove(targetUid),
      [`members.${targetUid}`]: deleteField(),
      updatedAt: serverTimestamp(),
    })
    const targetName = party.members[targetUid]?.name ?? 'สมาชิก'
    return { ok: true, message: `นำ ${targetName} ออกจากปาร์ตี้แล้ว` }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, partyPath)
  }
}

export async function transferPartyLeadership(
  party: PartyRecord,
  nextLeaderId: string,
): Promise<PartyActionResult> {
  const currentUser = auth.currentUser
  if (!currentUser || party.leaderId !== currentUser.uid) {
    return { ok: false, message: 'เฉพาะหัวหน้าปาร์ตี้เท่านั้นที่โอนสิทธิ์ได้' }
  }
  if (!party.memberIds.includes(nextLeaderId) || nextLeaderId === currentUser.uid) {
    return { ok: false, message: 'ไม่พบสมาชิกที่ต้องการโอนหัวหน้าให้' }
  }

  const partyPath = `parties/${party.partyId}`
  try {
    await updateDoc(doc(db, 'parties', party.partyId), {
      leaderId: nextLeaderId,
      updatedAt: serverTimestamp(),
    })
    const targetName = party.members[nextLeaderId]?.name ?? 'สมาชิก'
    return { ok: true, message: `มอบตำแหน่งหัวหน้าปาร์ตี้ให้ ${targetName} แล้ว` }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, partyPath)
  }
}

export async function renameParty(
  party: PartyRecord,
  rawName: string,
): Promise<PartyActionResult> {
  const currentUser = auth.currentUser
  if (!currentUser || party.leaderId !== currentUser.uid) {
    return { ok: false, message: 'เฉพาะหัวหน้าปาร์ตี้เท่านั้นที่เปลี่ยนชื่อปาร์ตี้ได้' }
  }

  const nextName = normalizePartyName(rawName)
  const partyPath = `parties/${party.partyId}`
  try {
    await updateDoc(doc(db, 'parties', party.partyId), {
      name: nextName,
      updatedAt: serverTimestamp(),
    })
    return { ok: true, message: `เปลี่ยนชื่อปาร์ตี้เป็น "${nextName}" แล้ว` }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, partyPath)
  }
}

export async function disbandParty(party: PartyRecord): Promise<PartyActionResult> {
  const currentUser = auth.currentUser
  if (!currentUser || party.leaderId !== currentUser.uid) {
    return { ok: false, message: 'เฉพาะหัวหน้าปาร์ตี้เท่านั้นที่ยุบปาร์ตี้ได้' }
  }

  const partyPath = `parties/${party.partyId}`
  try {
    await deleteDoc(doc(db, 'parties', party.partyId))
    return { ok: true, message: `ยุบปาร์ตี้ "${party.name}" แล้ว` }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, partyPath)
  }
}

export function subscribeMyPartyState(
  userId: string,
  onChange: (party: PartyRecord | null) => void,
  onError?: (error: unknown) => void,
): () => void {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== userId || !currentUser.emailVerified) {
    onChange(null)
    return () => {}
  }

  const q = query(
    collection(db, 'parties'),
    where('memberIds', 'array-contains', userId),
    limit(10),
  )

  return onSnapshot(
    q,
    (snap) => {
      let activeParty: PartyRecord | null = null
      snap.forEach((docSnap) => {
        if (activeParty) return
        const parsed = parsePartyDoc(docSnap.data() as Record<string, unknown>, docSnap.id)
        if (parsed && parsed.memberIds.includes(userId)) {
          activeParty = parsed
        }
      })
      onChange(activeParty)
    },
    (error) => {
      if (!auth.currentUser || auth.currentUser.uid !== userId) {
        onChange(null)
        return
      }
      console.error('Party snapshot error:', error)
      onError?.(error)
    },
  )
}

export function subscribeIncomingPartyInvites(
  userId: string,
  onChange: (invites: PartyInviteRecord[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== userId || !currentUser.emailVerified) {
    onChange([])
    return () => {}
  }

  const q = query(
    collection(db, 'partyInvites'),
    where('toUid', '==', userId),
    limit(30),
  )

  return onSnapshot(
    q,
    (snap) => {
      const pending: PartyInviteRecord[] = []
      snap.forEach((docSnap) => {
        const parsed = parsePartyInviteDoc(docSnap.data() as Record<string, unknown>, docSnap.id)
        if (parsed && parsed.status === 'pending') {
          pending.push(parsed)
        }
      })
      onChange(pending)
    },
    (error) => {
      if (!auth.currentUser || auth.currentUser.uid !== userId) {
        onChange([])
        return
      }
      console.error('Party invite snapshot error:', error)
      onError?.(error)
    },
  )
}
