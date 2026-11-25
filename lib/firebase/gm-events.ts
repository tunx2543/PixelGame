'use client'

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { OperationType, auth, db, handleFirestoreError } from './client'
import { sendWorldChatMessage } from './mmo-online'
import { isGmAccountUser, normalizeGameUidInput, PERMANENT_GM_GAME_UID } from '@/lib/game/permissions'
import {
  DEFAULT_SERVER_RATES,
  sanitizeServerRates,
  type ServerRatesConfig,
} from '@/lib/game/server-rates'
import {
  sanitizeWorldBossTestState,
  type WorldBossTestState,
} from '@/lib/game/rpg-systems'
import {
  sanitizeFestivalOverrideState,
  type FestivalEventId,
  type FestivalOverrideState,
} from '@/lib/game/festival-events'

export type WorldAnnouncementVariant = 'gm' | 'news'
export type WorldNewsCategory = 'gm' | 'enhance' | 'boss_kill' | 'gacha' | 'rare_drop'
export type GmDirectiveAction = 'summon' | 'mute' | 'unmute' | 'kick'

export interface WorldAnnouncementRecord {
  announcementId: string
  authorUid: string
  authorName: string
  authorGameUid: string
  body: string
  variant?: WorldAnnouncementVariant
  category?: WorldNewsCategory
  createdAtMs: number
  expiresAtMs: number
}

export interface GmDirectiveRecord {
  directiveId: string
  action: GmDirectiveAction
  fromUid: string
  fromName: string
  fromGameUid: string
  targetUid: string
  targetGameUid: string
  targetName: string
  mapId: string
  x: number
  y: number
  durationMin: number
  reason: string
  createdAtMs: number
  consumed: boolean
  consumedAtMs: number | null
}

export interface ServerGiftDropRecord {
  dropId: string
  authorUid: string
  authorName: string
  authorGameUid: string
  subject: string
  body: string
  gold: number
  diamonds: number
  itemId: string | null
  qty: number
  plus: number
  createdAtMs: number
  expiresAtMs: number
}

export interface ResolvedOnlinePlayerTarget {
  userId: string
  gameUid: string
  displayName: string
  mapId: string
  x: number
  y: number
  level: number
}

export interface ResolvedAccountTarget {
  userId: string
  gameUid: string
  displayName: string
  isOnline: boolean
}

function isSignedInVerified(): boolean {
  const user = auth.currentUser
  return Boolean(user && user.emailVerified)
}

function makeEventId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

async function getBearerHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser
  if (!user) return { 'Content-Type': 'application/json' }
  const token = await user.getIdToken()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function publishWorldAnnouncement(input: {
  body: string
  authorName: string
  authorGameUid: string
  mapId?: string
  jobId?: string
}): Promise<{ ok: boolean; announcementId?: string; message: string }> {
  const user = auth.currentUser
  const cleanBody = input.body.trim().slice(0, 240)
  if (!cleanBody) {
    return { ok: false, message: 'กรุณาพิมพ์ข้อความประกาศ' }
  }
  if (!isSignedInVerified() || !user || !isGmAccountUser(user)) {
    return { ok: false, message: 'คำสั่งประกาศเซิร์ฟเวอร์สงวนเฉพาะบัญชี GM ที่ยืนยันตัวตนแล้ว' }
  }

  const nowMs = Date.now()
  const announcementId = makeEventId('ann')
  const authorName = (input.authorName || 'GM').trim().slice(0, 24) || 'GM'
  const record: WorldAnnouncementRecord = {
    announcementId,
    authorUid: user.uid,
    authorName,
    authorGameUid: PERMANENT_GM_GAME_UID,
    body: cleanBody,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + 14_000,
  }

  const tasks: Promise<unknown>[] = [
    (async () => {
      try {
        await setDoc(doc(db, 'worldAnnouncements', announcementId), {
          ...record,
          createdAt: serverTimestamp(),
        })
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.CREATE, `worldAnnouncements/${announcementId}`)
        } catch {
          // Structured error logged cleanly; relay & worldChat continue delivering
        }
      }
    })(),
    sendWorldChatMessage({
      channel: 'world',
      mapId: input.mapId ?? 'town',
      partyId: null,
      senderName: authorName,
      senderGameUid: PERMANENT_GM_GAME_UID,
      jobId: input.jobId ?? 'gm',
      isGm: true,
      text: `[ประกาศเซิร์ฟ] ${cleanBody}`.slice(0, 180),
    }),
    (async () => {
      try {
        const headers = await getBearerHeaders()
        await fetch('/api/gm/events', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'announce',
            announcementId,
            body: cleanBody,
            authorName,
          }),
        })
      } catch {
        // Non-blocking fallback relay
      }
    })(),
  ]

  await Promise.allSettled(tasks)
  return { ok: true, announcementId, message: `ประกาศถึงผู้เล่นทั้งเซิร์ฟเวอร์แล้ว: ${cleanBody}` }
}

export async function publishWorldNewsBroadcast(input: {
  category: Exclude<WorldNewsCategory, 'gm'>
  body: string
  actorName: string
}): Promise<string | null> {
  const user = auth.currentUser
  const cleanBody = input.body.trim().slice(0, 240)
  if (!cleanBody || !isSignedInVerified() || !user) return null
  const announcementId = makeEventId('news')
  try {
    const headers = await getBearerHeaders()
    const res = await fetch('/api/world/events', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        announcementId,
        category: input.category,
        body: cleanBody,
        actorName: input.actorName.slice(0, 24) || 'ผู้กล้า',
      }),
    })
    if (!res.ok) return null
    return announcementId
  } catch {
    return null
  }
}

export function subscribeWorldAnnouncements(
  onAnnouncement: (record: WorldAnnouncementRecord) => void,
): () => void {
  if (!isSignedInVerified()) return () => {}

  const seen = new Set<string>()
  const q = query(
    collection(db, 'worldAnnouncements'),
    where('createdAtMs', '>=', 0),
    orderBy('createdAtMs', 'desc'),
    limit(10),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const nowMs = Date.now()
      const fresh = snapshot.docs
        .map((d) => d.data() as WorldAnnouncementRecord)
        .filter(
          (item) =>
            item &&
            typeof item.announcementId === 'string' &&
            typeof item.body === 'string' &&
            item.expiresAtMs > nowMs - 2_000 &&
            !seen.has(item.announcementId),
        )
        .sort((a, b) => a.createdAtMs - b.createdAtMs)

      for (const item of fresh) {
        seen.add(item.announcementId)
        onAnnouncement(item)
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'worldAnnouncements')
      } catch {
        // Logged structured FirestoreErrorInfo; server relay fallback handles delivery
      }
    },
  )
}

export interface OnlinePlayerCandidate {
  userId: string
  gameUid?: string
  uid?: number
  displayName: string
  mapId: string
  x: number
  y: number
  level: number
  invisible?: boolean
}

export async function resolveOnlinePlayerTarget(
  rawQuery: string,
  onlineSnapshot: OnlinePlayerCandidate[],
): Promise<{ target: ResolvedOnlinePlayerTarget | null; error?: string }> {
  const q = rawQuery.trim()
  if (!q) {
    return { target: null, error: 'กรุณาระบุชื่อตัวละคร หรือ UID ผู้เล่น' }
  }

  const selfUid = auth.currentUser?.uid ?? null
  const normalizedUid = normalizeGameUidInput(q)
  const lowerQuery = q.replace(/^#/, '').toLowerCase()

  const toResolved = (snap: OnlinePlayerCandidate): ResolvedOnlinePlayerTarget => ({
    userId: snap.userId,
    gameUid: snap.gameUid ?? (snap.uid !== undefined ? String(snap.uid).padStart(4, '0') : '1000'),
    displayName: snap.displayName,
    mapId: snap.mapId,
    x: snap.x,
    y: snap.y,
    level: snap.level,
  })

  const candidates = onlineSnapshot.filter((other) => other.userId !== selfUid && !other.invisible)
  if (normalizedUid) {
    const byGameUid = candidates.find(
      (other) => other.gameUid === normalizedUid || (other.uid !== undefined && normalizeGameUidInput(other.uid) === normalizedUid),
    )
    if (byGameUid) return { target: toResolved(byGameUid) }
  }

  const byUserId = candidates.find((other) => other.userId.toLowerCase() === lowerQuery)
  if (byUserId) return { target: toResolved(byUserId) }

  const byExactName = candidates.find((other) => other.displayName.trim().toLowerCase() === lowerQuery)
  if (byExactName) return { target: toResolved(byExactName) }

  const byPartialName = candidates.find((other) => other.displayName.trim().toLowerCase().includes(lowerQuery))
  if (byPartialName) return { target: toResolved(byPartialName) }

  if (isSignedInVerified()) {
    try {
      if (normalizedUid) {
        const uidSnap = await getDoc(doc(db, 'playerUids', normalizedUid))
        if (uidSnap.exists()) {
          const ownerId = (uidSnap.data() as { ownerId?: string }).ownerId
          if (ownerId && ownerId !== selfUid) {
            const presSnap = await getDoc(doc(db, 'worldPresence', ownerId))
            if (presSnap.exists()) {
              const d = presSnap.data() as {
                userId?: string
                gameUid?: string
                displayName?: string
                mapId?: string
                x?: number
                y?: number
                level?: number
                heartbeatMs?: number
              }
              if (
                typeof d.mapId === 'string' &&
                typeof d.x === 'number' &&
                typeof d.y === 'number' &&
                (!d.heartbeatMs || Date.now() - d.heartbeatMs <= 60_000)
              ) {
                return {
                  target: {
                    userId: d.userId ?? ownerId,
                    gameUid: d.gameUid ?? normalizedUid,
                    displayName: d.displayName ?? 'นักผจญภัย',
                    mapId: d.mapId,
                    x: d.x,
                    y: d.y,
                    level: d.level ?? 1,
                  },
                }
              }
            }
            return { target: null, error: `ผู้เล่น UID #${normalizedUid} ไม่ได้ออนไลน์อยู่ในขณะนี้` }
          }
        }
      }

      const presQuery = query(
        collection(db, 'worldPresence'),
        where('heartbeatMs', '>=', 0),
        orderBy('heartbeatMs', 'desc'),
        limit(60),
      )
      const presDocs = await getDocs(presQuery)
      const nowMs = Date.now()
      const freshDocs = presDocs.docs
        .map((docSnap) => docSnap.data() as {
          userId?: string
          gameUid?: string
          displayName?: string
          mapId?: string
          x?: number
          y?: number
          level?: number
          heartbeatMs?: number
          invisible?: boolean
        })
        .filter(
          (d) =>
            d.userId &&
            d.userId !== selfUid &&
            !d.invisible &&
            typeof d.mapId === 'string' &&
            typeof d.x === 'number' &&
            typeof d.y === 'number' &&
            (!d.heartbeatMs || nowMs - d.heartbeatMs <= 60_000),
        )

      const matched =
        (normalizedUid ? freshDocs.find((d) => d.gameUid === normalizedUid) : undefined) ??
        freshDocs.find((d) => d.userId?.toLowerCase() === lowerQuery) ??
        freshDocs.find((d) => d.displayName?.trim().toLowerCase() === lowerQuery) ??
        freshDocs.find((d) => d.displayName?.trim().toLowerCase().includes(lowerQuery))

      if (matched && matched.userId && matched.mapId && typeof matched.x === 'number' && typeof matched.y === 'number') {
        return {
          target: {
            userId: matched.userId,
            gameUid: matched.gameUid ?? '1000',
            displayName: matched.displayName ?? 'นักผจญภัย',
            mapId: matched.mapId,
            x: matched.x,
            y: matched.y,
            level: matched.level ?? 1,
          },
        }
      }
    } catch {
      // Fall through to not found message
    }
  }

  return {
    target: null,
    error: `ไม่พบผู้เล่น "${q}" ออนไลน์อยู่ (ต้องเข้าสู่ระบบและอยู่ในเกมขณะนี้)`,
  }
}

export async function resolveModerationTarget(
  rawQuery: string,
  onlineSnapshot: OnlinePlayerCandidate[],
): Promise<{ target: ResolvedAccountTarget | null; error?: string }> {
  const q = rawQuery.trim()
  if (!q) {
    return { target: null, error: 'กรุณาระบุชื่อตัวละคร หรือ UID ผู้เล่น' }
  }

  const onlineRes = await resolveOnlinePlayerTarget(q, onlineSnapshot)
  if (onlineRes.target) {
    return {
      target: {
        userId: onlineRes.target.userId,
        gameUid: onlineRes.target.gameUid,
        displayName: onlineRes.target.displayName,
        isOnline: true,
      },
    }
  }

  const selfUid = auth.currentUser?.uid ?? null
  const normalizedUid = normalizeGameUidInput(q)
  const lowerQuery = q.replace(/^#/, '').toLowerCase()

  if (isSignedInVerified()) {
    try {
      if (normalizedUid) {
        const uidSnap = await getDoc(doc(db, 'playerUids', normalizedUid))
        if (uidSnap.exists()) {
          const data = uidSnap.data() as {
            ownerId?: string
            gameUid?: string
            characterName?: string
            displayName?: string
          }
          if (data.ownerId && data.ownerId !== selfUid) {
            return {
              target: {
                userId: data.ownerId,
                gameUid: data.gameUid ?? normalizedUid,
                displayName: (data.characterName || data.displayName || 'นักผจญภัย').slice(0, 24),
                isOnline: false,
              },
            }
          }
        }
      }

      const lbSnap = await getDocs(query(collection(db, 'leaderboard'), limit(60)))
      const rows = lbSnap.docs.map((d) => d.data() as { userId?: string; gameUid?: string; name?: string })
      const matched =
        (normalizedUid ? rows.find((r) => r.gameUid === normalizedUid) : undefined) ??
        rows.find((r) => r.userId?.toLowerCase() === lowerQuery) ??
        rows.find((r) => r.name?.trim().toLowerCase() === lowerQuery) ??
        rows.find((r) => r.name?.trim().toLowerCase().includes(lowerQuery))

      if (matched?.userId && matched.userId !== selfUid) {
        return {
          target: {
            userId: matched.userId,
            gameUid: matched.gameUid ?? '1000',
            displayName: (matched.name || 'นักผจญภัย').slice(0, 24),
            isOnline: false,
          },
        }
      }
    } catch {
      // Fall through cleanly
    }
  }

  return {
    target: null,
    error: `ไม่พบบัญชีผู้เล่น "${q}" (กรุณาระบุ UID 4-8 หลัก หรือชื่อตัวละครที่ถูกต้อง)`,
  }
}

export async function sendGmSummonDirective(input: {
  target: ResolvedOnlinePlayerTarget
  fromName: string
  fromGameUid: string
  mapId: string
  x: number
  y: number
}): Promise<{ ok: boolean; directiveId?: string; message: string }> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user || !isGmAccountUser(user)) {
    return { ok: false, message: 'คำสั่งดึงผู้เล่นสงวนเฉพาะบัญชี GM ที่ยืนยันตัวตนแล้ว' }
  }
  if (input.target.userId === user.uid) {
    return { ok: false, message: 'ไม่สามารถดึงตัวละครของตัวเองได้' }
  }

  const directiveId = makeEventId('gmd')
  const fromName = (input.fromName || 'GM').trim().slice(0, 24) || 'GM'
  const record: GmDirectiveRecord = {
    directiveId,
    action: 'summon',
    fromUid: user.uid,
    fromName,
    fromGameUid: PERMANENT_GM_GAME_UID,
    targetUid: input.target.userId,
    targetGameUid: input.target.gameUid,
    targetName: input.target.displayName.slice(0, 24) || 'นักผจญภัย',
    mapId: input.mapId.slice(0, 32),
    x: Math.max(0, Math.min(5000, Math.round(input.x))),
    y: Math.max(0, Math.min(5000, Math.round(input.y))),
    durationMin: 0,
    reason: '',
    createdAtMs: Date.now(),
    consumed: false,
    consumedAtMs: null,
  }

  const tasks: Promise<unknown>[] = [
    (async () => {
      try {
        await setDoc(doc(db, 'gmDirectives', directiveId), {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.CREATE, `gmDirectives/${directiveId}`)
        } catch {
          // Structured error logged; server API relay guarantees delivery
        }
      }
    })(),
    (async () => {
      try {
        const headers = await getBearerHeaders()
        await fetch('/api/gm/events', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'summon',
            directiveId,
            targetUid: record.targetUid,
            targetGameUid: record.targetGameUid,
            targetName: record.targetName,
            fromName: record.fromName,
            fromGameUid: record.fromGameUid,
            mapId: record.mapId,
            x: record.x,
            y: record.y,
          }),
        })
      } catch {
        // Non-blocking fallback
      }
    })(),
  ]

  await Promise.allSettled(tasks)
  return {
    ok: true,
    directiveId,
    message: `ส่งคำสั่งดึงตัว ${record.targetName} (#${record.targetGameUid}) มาหาคุณเรียบร้อยแล้ว!`,
  }
}

export async function sendGmModerationDirective(input: {
  action: 'mute' | 'unmute' | 'kick'
  target: ResolvedAccountTarget
  fromName: string
  durationMin?: number
  reason?: string
}): Promise<{ ok: boolean; directiveId?: string; message: string }> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user || !isGmAccountUser(user)) {
    return { ok: false, message: 'คำสั่งจัดการผู้เล่นสงวนเฉพาะบัญชี GM ที่ยืนยันตัวตนแล้ว' }
  }
  if (input.target.userId === user.uid) {
    return { ok: false, message: 'ไม่สามารถใช้คำสั่งนี้กับบัญชีตัวเองได้' }
  }

  const directiveId = makeEventId('gmd')
  const fromName = (input.fromName || 'GM').trim().slice(0, 24) || 'GM'
  const durationMin =
    input.action === 'mute'
      ? Math.max(1, Math.min(1440, Math.floor(input.durationMin ?? 15)))
      : 0
  const reason = (input.reason ?? '').trim().slice(0, 120)

  const record: GmDirectiveRecord = {
    directiveId,
    action: input.action,
    fromUid: user.uid,
    fromName,
    fromGameUid: PERMANENT_GM_GAME_UID,
    targetUid: input.target.userId,
    targetGameUid: input.target.gameUid,
    targetName: input.target.displayName.slice(0, 24) || 'นักผจญภัย',
    mapId: 'town',
    x: 0,
    y: 0,
    durationMin,
    reason,
    createdAtMs: Date.now(),
    consumed: false,
    consumedAtMs: null,
  }

  await Promise.allSettled([
    (async () => {
      try {
        await setDoc(doc(db, 'gmDirectives', directiveId), {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.CREATE, `gmDirectives/${directiveId}`)
        } catch {
          // Relay handles immediate delivery even before manual Firestore rule push
        }
      }
    })(),
    (async () => {
      try {
        const headers = await getBearerHeaders()
        await fetch('/api/gm/events', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: input.action,
            directiveId,
            targetUid: record.targetUid,
            targetGameUid: record.targetGameUid,
            targetName: record.targetName,
            fromName: record.fromName,
            fromGameUid: record.fromGameUid,
            durationMin: record.durationMin,
            reason: record.reason,
          }),
        })
      } catch {
        // Non-blocking fallback
      }
    })(),
  ])

  if (input.action === 'mute') {
    return {
      ok: true,
      directiveId,
      message: `สั่งใบ้แชท ${record.targetName} (#${record.targetGameUid}) นาน ${durationMin} นาทีแล้ว${reason ? ` (${reason})` : ''}`,
    }
  }
  if (input.action === 'unmute') {
    return {
      ok: true,
      directiveId,
      message: `ปลดใบ้แชทให้ ${record.targetName} (#${record.targetGameUid}) เรียบร้อยแล้ว`,
    }
  }
  return {
    ok: true,
    directiveId,
    message: `สั่งตัดการเชื่อมต่อ (Kick) ${record.targetName} (#${record.targetGameUid}) ออกจากเกมแล้ว${reason ? ` (${reason})` : ''}`,
  }
}

export async function publishServerGiftDrop(input: {
  authorName: string
  subject: string
  body: string
  gold: number
  diamonds: number
  itemId: string | null
  qty: number
  plus: number
  expiresHours?: number
}): Promise<{ ok: boolean; dropId?: string; message: string }> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user || !isGmAccountUser(user)) {
    return { ok: false, message: 'การส่งจดหมายชดเชยทั้งเซิร์ฟสงวนเฉพาะบัญชี GM' }
  }
  const cleanSubject = input.subject.trim().slice(0, 64)
  const cleanBody = input.body.trim().slice(0, 240)
  if (!cleanSubject || !cleanBody) {
    return { ok: false, message: 'กรุณากรอกหัวข้อและข้อความของขวัญ' }
  }

  const dropId = makeEventId('giftall')
  const nowMs = Date.now()
  const expiresHours = Math.max(1, Math.min(336, Math.floor(input.expiresHours ?? 168)))
  const authorName = (input.authorName || 'GM').trim().slice(0, 24) || 'GM'
  const record: ServerGiftDropRecord = {
    dropId,
    authorUid: user.uid,
    authorName,
    authorGameUid: PERMANENT_GM_GAME_UID,
    subject: cleanSubject,
    body: cleanBody,
    gold: Math.max(0, Math.min(10_000_000, Math.floor(input.gold))),
    diamonds: Math.max(0, Math.min(100_000, Math.floor(input.diamonds))),
    itemId: input.itemId ? input.itemId.trim().slice(0, 64) : null,
    qty: Math.max(0, Math.min(999, Math.floor(input.qty))),
    plus: Math.max(0, Math.min(20, Math.floor(input.plus))),
    createdAtMs: nowMs,
    expiresAtMs: nowMs + expiresHours * 3_600_000,
  }

  await Promise.allSettled([
    (async () => {
      try {
        await setDoc(doc(db, 'serverGiftDrops', dropId), {
          ...record,
          createdAt: serverTimestamp(),
        })
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.CREATE, `serverGiftDrops/${dropId}`)
        } catch {
          // Relay ensures immediate visibility even before rule publish
        }
      }
    })(),
    (async () => {
      try {
        const headers = await getBearerHeaders()
        await fetch('/api/gm/events', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'gift_all',
            dropId,
            authorName,
            subject: record.subject,
            body: record.body,
            gold: record.gold,
            diamonds: record.diamonds,
            itemId: record.itemId,
            qty: record.qty,
            plus: record.plus,
            expiresHours,
          }),
        })
      } catch {
        // Non-blocking fallback
      }
    })(),
    sendWorldChatMessage({
      channel: 'world',
      mapId: 'town',
      partyId: null,
      senderName: authorName,
      senderGameUid: PERMANENT_GM_GAME_UID,
      jobId: 'gm',
      isGm: true,
      text: `[ของขวัญทั้งเซิร์ฟ] ${record.subject} เปิดกล่องจดหมายรับรางวัลได้เลย!`.slice(0, 180),
    }),
  ])

  return {
    ok: true,
    dropId,
    message: `ส่งจดหมายแจกทั้งเซิร์ฟ "${record.subject}" แล้ว! ผู้เล่นทุกคนสามารถกดรับได้ในกล่องจดหมาย`,
  }
}

export async function fetchActiveServerGiftDrops(): Promise<ServerGiftDropRecord[]> {
  const byId = new Map<string, ServerGiftDropRecord>()
  const nowMs = Date.now()

  if (isSignedInVerified()) {
    try {
      const q = query(
        collection(db, 'serverGiftDrops'),
        where('createdAtMs', '>=', 0),
        orderBy('createdAtMs', 'desc'),
        limit(20),
      )
      const snap = await getDocs(q)
      for (const docSnap of snap.docs) {
        const row = docSnap.data() as ServerGiftDropRecord
        if (row?.dropId && row.expiresAtMs > nowMs) {
          byId.set(row.dropId, row)
        }
      }
    } catch {
      // Fallback via server relay below
    }
  }

  try {
    const relay = await pollServerGmEvents(0)
    if (relay?.giftDrops) {
      for (const drop of relay.giftDrops) {
        if (drop?.dropId && drop.expiresAtMs > nowMs && !byId.has(drop.dropId)) {
          byId.set(drop.dropId, drop)
        }
      }
    }
  } catch {
    // Ignore transient fetch errors
  }

  return [...byId.values()].sort((a, b) => b.createdAtMs - a.createdAtMs)
}

export function subscribeIncomingGmDirectives(
  userId: string,
  onDirective: (directive: GmDirectiveRecord) => void,
): () => void {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user || user.uid !== userId) {
    return () => {}
  }

  const seen = new Set<string>()
  const q = query(
    collection(db, 'gmDirectives'),
    where('targetUid', '==', userId),
    limit(20),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const nowMs = Date.now()
      const fresh = snapshot.docs
        .map((d) => d.data() as GmDirectiveRecord)
        .filter(
          (d) =>
            d &&
            typeof d.directiveId === 'string' &&
            !d.consumed &&
            d.createdAtMs >= nowMs - 120_000 &&
            !seen.has(d.directiveId),
        )
        .sort((a, b) => a.createdAtMs - b.createdAtMs)

      for (const item of fresh) {
        seen.add(item.directiveId)
        onDirective(item)
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'gmDirectives')
      } catch {
        // Structured error logged; server relay fallback polls cleanly
      }
    },
  )
}

export async function ackGmDirective(directiveId: string): Promise<void> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user) return

  await Promise.allSettled([
    (async () => {
      try {
        await updateDoc(doc(db, 'gmDirectives', directiveId), {
          consumed: true,
          consumedAtMs: Date.now(),
          updatedAt: serverTimestamp(),
        })
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.UPDATE, `gmDirectives/${directiveId}`)
        } catch {
          // Non-fatal; client dedupes by directiveId too
        }
      }
    })(),
    (async () => {
      try {
        const headers = await getBearerHeaders()
        await fetch('/api/gm/events', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'ack_directive',
            directiveId,
          }),
        })
      } catch {
        // Non-blocking
      }
    })(),
  ])
}

export async function publishServerRatesConfig(input: {
  expMultiplier: number
  dropMultiplier: number
  durationMinutes?: number
  label?: string
  authorName?: string
  reset?: boolean
}): Promise<{ ok: boolean; serverRates?: ServerRatesConfig; message: string }> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user || !isGmAccountUser(user)) {
    return { ok: false, message: 'คำสั่งปรับคูณเซิร์ฟเวอร์สงวนเฉพาะบัญชี GM ที่ยืนยันตัวตนแล้ว' }
  }
  try {
    const headers = await getBearerHeaders()
    const res = await fetch('/api/gm/events', {
      method: 'POST',
      headers,
      body: JSON.stringify(
        input.reset
          ? {
              action: 'reset_rates',
              authorName: input.authorName ?? 'GM',
            }
          : {
              action: 'set_rates',
              expMultiplier: input.expMultiplier,
              dropMultiplier: input.dropMultiplier,
              durationMinutes: input.durationMinutes ?? 0,
              label: input.label ?? '',
              authorName: input.authorName ?? 'GM',
            },
      ),
    })
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean
      serverRates?: ServerRatesConfig
      message?: string
    } | null
    if (!res.ok || !data?.ok || !data.serverRates) {
      return { ok: false, message: data?.message || 'อัปเดตตัวคูณเซิร์ฟเวอร์ไม่สำเร็จ' }
    }
    const clean = sanitizeServerRates(data.serverRates)
    return {
      ok: true,
      serverRates: clean,
      message: input.reset
        ? 'รีเซ็ตตัวคูณเซิร์ฟเวอร์เป็น x1 ปกติแล้ว'
        : `เปิดคูณเซิร์ฟเวอร์ EXP x${clean.expMultiplier} · DROP x${clean.dropMultiplier} เรียบร้อยแล้ว!`,
    }
  } catch {
    return { ok: false, message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อตั้งค่าตัวคูณได้' }
  }
}

export async function publishWorldBossTestConfig(input: {
  active: boolean
  bossId?: string
  durationMinutes?: number
  authorName?: string
}): Promise<{ ok: boolean; worldBossTest: WorldBossTestState | null; message: string }> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user || !isGmAccountUser(user)) {
    return {
      ok: false,
      worldBossTest: null,
      message: 'คำสั่งเรียกบอสกิจกรรม (GM Test) สงวนเฉพาะบัญชี GM ที่ยืนยันตัวตนแล้ว',
    }
  }
  try {
    const headers = await getBearerHeaders()
    const res = await fetch('/api/gm/events', {
      method: 'POST',
      headers,
      body: JSON.stringify(
        input.active
          ? {
              action: 'summon_world_boss_test',
              bossId: input.bossId ?? 'wb_world_golem',
              durationMinutes: input.durationMinutes ?? 30,
              authorName: input.authorName ?? 'GM',
            }
          : {
              action: 'end_world_boss_test',
              authorName: input.authorName ?? 'GM',
            },
      ),
    })
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean
      worldBossTest?: WorldBossTestState | null
      message?: string
    } | null
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        worldBossTest: null,
        message: data?.message || 'อัปเดตสถานะบอสกิจกรรมไม่สำเร็จ',
      }
    }
    const clean = sanitizeWorldBossTestState(data.worldBossTest ?? null)
    return {
      ok: true,
      worldBossTest: clean,
      message: clean
        ? `เรียกบอสกิจกรรม "${clean.name}" โหมดทดสอบ GM แล้ว (${Math.max(1, Math.round((clean.expiresAtMs - clean.startedAtMs) / 60_000))} นาที)`
        : 'ปิดโหมดทดสอบบอสกิจกรรมเวิลด์บอสแล้ว',
    }
  } catch {
    return { ok: false, worldBossTest: null, message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อเรียกบอสกิจกรรมได้' }
  }
}

export async function publishFestivalEventConfig(input: {
  active: boolean
  eventId?: FestivalEventId
  durationMinutes?: number
  customTitle?: string
  expBonusPct?: number
  dropBonusPct?: number
  goldBonusPct?: number
  authorName?: string
}): Promise<{ ok: boolean; festivalOverride: FestivalOverrideState | null; message: string }> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user || !isGmAccountUser(user)) {
    return {
      ok: false,
      festivalOverride: null,
      message: 'คำสั่งเปิด/ปิดกิจกรรมเทศกาลสงวนเฉพาะบัญชี GM ที่ยืนยันตัวตนแล้ว',
    }
  }
  try {
    const headers = await getBearerHeaders()
    const res = await fetch('/api/gm/events', {
      method: 'POST',
      headers,
      body: JSON.stringify(
        input.active
          ? {
              action: 'set_festival_event',
              eventId: input.eventId ?? 'loy_krathong',
              durationMinutes: input.durationMinutes ?? 0,
              customTitle: input.customTitle ?? '',
              expBonusPct: input.expBonusPct,
              dropBonusPct: input.dropBonusPct,
              goldBonusPct: input.goldBonusPct,
              authorName: input.authorName ?? 'GM',
            }
          : {
              action: 'clear_festival_event',
              authorName: input.authorName ?? 'GM',
            },
      ),
    })
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean
      festivalOverride?: FestivalOverrideState | null
      message?: string
    } | null
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        festivalOverride: null,
        message: data?.message || 'อัปเดตสถานะกิจกรรมเทศกาลไม่สำเร็จ',
      }
    }
    const clean = sanitizeFestivalOverrideState(data.festivalOverride ?? null)
    return {
      ok: true,
      festivalOverride: clean,
      message: clean
        ? `เปิดกิจกรรมเทศกาล "${clean.customTitle || clean.eventId}" ทั้งเซิร์ฟเวอร์เรียบร้อยแล้ว!`
        : 'ปิดโหมดบังคับกิจกรรมและกลับสู่ปฏิทินเทศกาลอัตโนมัติแล้ว',
    }
  } catch {
    return { ok: false, festivalOverride: null, message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อตั้งค่ากิจกรรมเทศกาลได้' }
  }
}

export async function notifyServerWorldBossClosed(cycleKey: string): Promise<boolean> {
  if (!isSignedInVerified() || !auth.currentUser || !cycleKey) return false
  try {
    const headers = await getBearerHeaders()
    const res = await fetch('/api/world/events', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'close_world_boss',
        cycleKey,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function pollPublicWorldEvents(sinceMs: number): Promise<{
  announcements: WorldAnnouncementRecord[]
  serverRates: ServerRatesConfig
  worldBossTest: WorldBossTestState | null
  closedWorldBossCycles: string[]
  festivalOverride: FestivalOverrideState | null
  serverTimeMs: number
} | null> {
  try {
    const res = await fetch(`/api/world/events?since=${Math.max(0, Math.floor(sinceMs))}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      ok?: boolean
      announcements?: WorldAnnouncementRecord[]
      serverRates?: ServerRatesConfig
      worldBossTest?: WorldBossTestState | null
      closedWorldBossCycles?: string[]
      festivalOverride?: FestivalOverrideState | null
      serverTimeMs?: number
    }
    if (!data.ok) return null
    return {
      announcements: Array.isArray(data.announcements) ? data.announcements : [],
      serverRates: data.serverRates ? sanitizeServerRates(data.serverRates) : { ...DEFAULT_SERVER_RATES },
      worldBossTest: sanitizeWorldBossTestState(data.worldBossTest ?? null),
      closedWorldBossCycles: Array.isArray(data.closedWorldBossCycles) ? data.closedWorldBossCycles : [],
      festivalOverride: sanitizeFestivalOverrideState(data.festivalOverride ?? null),
      serverTimeMs: typeof data.serverTimeMs === 'number' ? data.serverTimeMs : Date.now(),
    }
  } catch {
    return null
  }
}

export async function pollServerGmEvents(sinceMs: number): Promise<{
  announcements: WorldAnnouncementRecord[]
  directives: GmDirectiveRecord[]
  giftDrops: ServerGiftDropRecord[]
  serverRates: ServerRatesConfig
  worldBossTest: WorldBossTestState | null
  closedWorldBossCycles: string[]
  festivalOverride: FestivalOverrideState | null
  serverTimeMs: number
} | null> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user) return null
  try {
    const token = await user.getIdToken()
    const res = await fetch(`/api/gm/events?since=${Math.max(0, Math.floor(sinceMs))}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      ok?: boolean
      announcements?: WorldAnnouncementRecord[]
      directives?: GmDirectiveRecord[]
      giftDrops?: ServerGiftDropRecord[]
      serverRates?: ServerRatesConfig
      worldBossTest?: WorldBossTestState | null
      closedWorldBossCycles?: string[]
      festivalOverride?: FestivalOverrideState | null
      serverTimeMs?: number
    }
    if (!data.ok) return null
    return {
      announcements: Array.isArray(data.announcements) ? data.announcements : [],
      directives: Array.isArray(data.directives) ? data.directives : [],
      giftDrops: Array.isArray(data.giftDrops) ? data.giftDrops : [],
      serverRates: data.serverRates ? sanitizeServerRates(data.serverRates) : { ...DEFAULT_SERVER_RATES },
      worldBossTest: sanitizeWorldBossTestState(data.worldBossTest ?? null),
      closedWorldBossCycles: Array.isArray(data.closedWorldBossCycles) ? data.closedWorldBossCycles : [],
      festivalOverride: sanitizeFestivalOverrideState(data.festivalOverride ?? null),
      serverTimeMs: typeof data.serverTimeMs === 'number' ? data.serverTimeMs : Date.now(),
    }
  } catch {
    return null
  }
}
