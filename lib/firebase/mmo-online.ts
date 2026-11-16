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
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  arrayUnion,
  where,
} from 'firebase/firestore'
import { auth, db, handleFirestoreError, OperationType } from './client'
import { isGmAccountUser, normalizeGameUidInput } from '@/lib/game/permissions'
import { SEED_RIVAL_HEROES, type LeaderboardHeroEntry } from '@/lib/game/rpg-systems'
import {
  getFieldBossForMap,
  resolveDuelTurn,
  type ChatChannel,
  type DuelFighterState,
  type DuelMatchState,
  type DuelMoveType,
} from '@/lib/game/mmo-systems'
import { ensureUserProfile } from './characters'
import { buildPartyMemberSnapshot, type BuildPartyMemberInput, type PartyRecord } from './party-helpers'
import { leaveParty } from './parties'
import type { InvItem } from '@/lib/game/engine'

function isSignedInVerified(): boolean {
  const user = auth.currentUser
  return Boolean(user && user.emailVerified)
}

function readLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeLocalJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore quota errors cleanly.
  }
}

async function resolveTargetPlayerIdentity(targetUidOrGameUid: string): Promise<{
  uid: string
  gameUid: string
  name: string
} | null> {
  const raw = targetUidOrGameUid.trim()
  if (!raw) return null
  if (/^\d{1,8}$/.test(raw)) {
    const normalized = normalizeGameUidInput(raw)
    if (!normalized) return null
    if (isSignedInVerified()) {
      try {
        const snap = await getDoc(doc(db, 'playerUids', normalized))
        if (snap.exists()) {
          const data = snap.data() as { ownerId?: string; gameUid?: string; characterName?: string; displayName?: string }
          if (data.ownerId) {
            return {
              uid: data.ownerId,
              gameUid: data.gameUid ?? normalized,
              name: (data.characterName || data.displayName || 'นักผจญภัย').slice(0, 24),
            }
          }
        }
      } catch {
        // Ignore lookup error and fallback below.
      }
    }
    const seed = SEED_RIVAL_HEROES.find((h) => h.gameUid === normalized)
    if (seed) {
      return { uid: seed.userId, gameUid: seed.gameUid, name: seed.name }
    }
    return null
  }

  if (isSignedInVerified()) {
    try {
      const pres = await getDoc(doc(db, 'worldPresence', raw))
      if (pres.exists()) {
        const data = pres.data() as { userId?: string; gameUid?: string; displayName?: string }
        return {
          uid: data.userId ?? raw,
          gameUid: data.gameUid ?? '1000',
          name: (data.displayName || 'นักผจญภัย').slice(0, 24),
        }
      }
      const lb = await getDoc(doc(db, 'leaderboard', raw))
      if (lb.exists()) {
        const data = lb.data() as LeaderboardHeroEntry
        return {
          uid: data.userId ?? raw,
          gameUid: data.gameUid ?? '1000',
          name: (data.name || 'นักผจญภัย').slice(0, 24),
        }
      }
    } catch {
      // Ignore fallback.
    }
  }

  const seed = SEED_RIVAL_HEROES.find((h) => h.userId === raw)
  if (seed) return { uid: seed.userId, gameUid: seed.gameUid, name: seed.name }
  return null
}

/* ========================================================================== */
/* 1. MULTI-CHANNEL WORLD CHAT (/worldChat)                                   */
/* ========================================================================== */

export interface WorldChatMessageRecord {
  messageId: string
  channel: Exclude<ChatChannel, 'all'>
  mapId: string
  partyId: string | null
  senderUid: string
  senderName: string
  senderGameUid: string
  jobId: string
  isGm: boolean
  text: string
  createdAtMs: number
}

const LOCAL_WORLD_CHAT_KEY = 'pixel-rpg-local-world-chat-v1'

export async function sendWorldChatMessage(input: {
  channel: Exclude<ChatChannel, 'all'>
  mapId: string
  partyId?: string | null
  senderName: string
  senderGameUid: string
  jobId: string
  isGm: boolean
  text: string
}): Promise<{ ok: boolean; message?: WorldChatMessageRecord; error?: string }> {
  const cleanText = input.text.trim().slice(0, 180)
  if (!cleanText) return { ok: false, error: 'กรุณาพิมพ์ข้อความก่อนส่ง' }
  const user = auth.currentUser
  const messageId = `wc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const record: WorldChatMessageRecord = {
    messageId,
    channel: input.channel,
    mapId: (input.mapId || 'town').slice(0, 32),
    partyId: input.partyId ? input.partyId.slice(0, 64) : null,
    senderUid: user?.uid ?? 'guest_player',
    senderName: input.senderName.slice(0, 24) || 'ผู้กล้า',
    senderGameUid: (input.senderGameUid || '1000').slice(0, 8),
    jobId: (input.jobId || 'novice').slice(0, 32),
    isGm: Boolean(input.isGm && isGmAccountUser(user)),
    text: cleanText,
    createdAtMs: Date.now(),
  }

  if (isSignedInVerified() && user) {
    try {
      await setDoc(doc(db, 'worldChat', messageId), {
        ...record,
        createdAt: serverTimestamp(),
      })
      return { ok: true, message: record }
    } catch {
      // Fallback to localStorage seamlessly.
    }
  }

  const local = readLocalJson<WorldChatMessageRecord[]>(LOCAL_WORLD_CHAT_KEY, [])
  writeLocalJson(LOCAL_WORLD_CHAT_KEY, [...local, record].slice(-50))
  return { ok: true, message: record }
}

export function subscribeWorldChatMessages(
  onChange: (messages: WorldChatMessageRecord[]) => void,
): () => void {
  const local = readLocalJson<WorldChatMessageRecord[]>(LOCAL_WORLD_CHAT_KEY, [])
  if (!isSignedInVerified()) {
    onChange(local)
    return () => {}
  }

  const q = query(collection(db, 'worldChat'), orderBy('createdAtMs', 'desc'), limit(50))
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => d.data() as WorldChatMessageRecord)
        .sort((a, b) => a.createdAtMs - b.createdAtMs)
      onChange(items)
    },
    () => {
      onChange(readLocalJson<WorldChatMessageRecord[]>(LOCAL_WORLD_CHAT_KEY, []))
    },
  )
}

/* ========================================================================== */
/* 2. REAL-TIME WHISPER (/whispers)                                           */
/* ========================================================================== */

export interface WhisperRecord {
  whisperId: string
  fromUid: string
  toUid: string
  fromGameUid: string
  toGameUid: string
  fromName: string
  toName: string
  body: string
  createdAtMs: number
}

const LOCAL_WHISPERS_KEY = 'pixel-rpg-local-whispers-v1'

export async function sendWhisperFirestore(input: {
  targetUidOrGameUid: string
  senderName: string
  senderGameUid: string
  body: string
}): Promise<{ ok: boolean; message: string; whisper?: WhisperRecord }> {
  const text = input.body.trim().slice(0, 240)
  if (!text) return { ok: false, message: 'พิมพ์ข้อความก่อนส่ง' }
  const user = auth.currentUser
  if (!isSignedInVerified() || !user) {
    return { ok: false, message: 'กรุณาเข้าสู่ระบบ Google ก่อนส่งกระซิบออนไลน์' }
  }

  const target = await resolveTargetPlayerIdentity(input.targetUidOrGameUid)
  if (!target) return { ok: false, message: 'ไม่พบผู้เล่นนี้ในระบบ' }
  if (target.uid === user.uid) return { ok: false, message: 'ไม่สามารถกระซิบหาตัวเองได้' }

  const whisperId = `wh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const record: WhisperRecord = {
    whisperId,
    fromUid: user.uid,
    toUid: target.uid,
    fromGameUid: (input.senderGameUid || '1000').slice(0, 8),
    toGameUid: target.gameUid,
    fromName: input.senderName.slice(0, 24) || 'ผู้กล้า',
    toName: target.name,
    body: text,
    createdAtMs: Date.now(),
  }

  try {
    await setDoc(doc(db, 'whispers', whisperId), {
      ...record,
      createdAt: serverTimestamp(),
    })
    return { ok: true, message: `ส่งกระซิบถึง ${target.name} แล้ว`, whisper: record }
  } catch {
    const local = readLocalJson<WhisperRecord[]>(LOCAL_WHISPERS_KEY, [])
    writeLocalJson(LOCAL_WHISPERS_KEY, [...local, record].slice(-40))
    return { ok: true, message: `ส่งกระซิบถึง ${target.name} แล้ว`, whisper: record }
  }
}

export function subscribeIncomingWhispers(
  userId: string,
  onNewWhisper: (whisper: WhisperRecord) => void,
): () => void {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user || user.uid !== userId) {
    return () => {}
  }

  const seen = new Set<string>()
  const startCutoffMs = Date.now() - 15_000
  const q = query(collection(db, 'whispers'), where('toUid', '==', userId), limit(30))

  return onSnapshot(
    q,
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type !== 'added') return
        const row = change.doc.data() as WhisperRecord
        if (seen.has(row.whisperId)) return
        seen.add(row.whisperId)
        if (row.createdAtMs >= startCutoffMs) {
          onNewWhisper(row)
        }
      })
    },
    () => {
      // Ignore permission/offline errors cleanly.
    },
  )
}

/* ========================================================================== */
/* 3. REAL-TIME 1V1 PLAYER TRADE (/trades)                                    */
/* ========================================================================== */

export interface TradeSessionRecord {
  tradeId: string
  status: 'pending' | 'active' | 'completed' | 'declined' | 'cancelled'
  senderUid: string
  recipientUid: string
  senderGameUid: string
  recipientGameUid: string
  senderName: string
  recipientName: string
  senderItems: InvItem[]
  recipientItems: InvItem[]
  senderGold: number
  recipientGold: number
  senderGemItems: string[]
  recipientGemItems: string[]
  senderReady: boolean
  recipientReady: boolean
  createdAtMs: number
}

function sanitizeTradeItems(items: InvItem[]): InvItem[] {
  return items.slice(0, 12).map((item) => ({
    uid: String(item.uid).slice(0, 48),
    itemId: String(item.itemId).slice(0, 64),
    qty: Math.max(1, Math.min(999, Math.floor(item.qty || 1))),
    plus: Math.max(0, Math.min(20, Math.floor(item.plus || 0))),
    rarity: item.rarity,
    affixes: Array.isArray(item.affixes) ? item.affixes.slice(0, 4) : [],
    bound: Boolean(item.bound),
  }))
}

export async function createTradeFirestore(input: {
  targetUidOrGameUid: string
  senderName?: string
  senderGameUid?: string
}): Promise<{ ok: boolean; message: string; tradeId?: string }> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user) {
    return { ok: false, message: 'กรุณาเข้าสู่ระบบ Google ก่อนแลกเปลี่ยนออนไลน์' }
  }

  const target = await resolveTargetPlayerIdentity(input.targetUidOrGameUid)
  if (!target) return { ok: false, message: 'ไม่พบผู้เล่นปลายทาง' }
  if (target.uid === user.uid) return { ok: false, message: 'ไม่สามารถแลกเปลี่ยนกับตัวเองได้' }

  const identity = await ensureUserProfile(user)
  const tradeId = `trd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const record: TradeSessionRecord = {
    tradeId,
    status: 'pending',
    senderUid: user.uid,
    recipientUid: target.uid,
    senderGameUid: (input.senderGameUid || identity.gameUid || '1000').slice(0, 8),
    recipientGameUid: target.gameUid,
    senderName: (input.senderName || identity.displayName || 'ผู้กล้า').slice(0, 24),
    recipientName: target.name,
    senderItems: [],
    recipientItems: [],
    senderGold: 0,
    recipientGold: 0,
    senderGemItems: [],
    recipientGemItems: [],
    senderReady: false,
    recipientReady: false,
    createdAtMs: Date.now(),
  }

  try {
    await setDoc(doc(db, 'trades', tradeId), {
      ...record,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return { ok: true, message: `ส่งคำขอแลกเปลี่ยนถึง ${target.name} แล้ว`, tradeId }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `trades/${tradeId}`)
  }
}

export async function respondTradeFirestore(
  tradeId: string,
  decision: 'active' | 'declined',
): Promise<{ ok: boolean; message: string }> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user) return { ok: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
  const ref = doc(db, 'trades', tradeId)
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error('ไม่พบคำขอแลกเปลี่ยน')
      const cur = snap.data() as TradeSessionRecord
      if (cur.recipientUid !== user.uid) throw new Error('ไม่มีสิทธิ์ตอบรับคำขอนี้')
      if (cur.status !== 'pending') throw new Error('คำขอนี้ถูกดำเนินการไปแล้ว')
      tx.update(ref, { status: decision, updatedAt: serverTimestamp() })
    })
    return {
      ok: true,
      message: decision === 'active' ? 'เริ่มหน้าต่างแลกเปลี่ยนแล้ว' : 'ปฏิเสธคำขอแลกเปลี่ยนแล้ว',
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'ดำเนินการไม่สำเร็จ' }
  }
}

export async function updateTradeOfferFirestore(
  tradeId: string,
  offer: { items: InvItem[]; gold: number; gemItems: string[]; ready: boolean },
): Promise<{ ok: boolean; message: string; session?: TradeSessionRecord; completed?: boolean }> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user) return { ok: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
  const ref = doc(db, 'trades', tradeId)

  try {
    const updated = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error('ไม่พบห้องแลกเปลี่ยน')
      const cur = snap.data() as TradeSessionRecord
      if (cur.status !== 'active' && cur.status !== 'pending') {
        throw new Error('การแลกเปลี่ยนสิ้นสุดหรือถูกยกเลิกแล้ว')
      }
      const isSender = cur.senderUid === user.uid
      const isRecipient = cur.recipientUid === user.uid
      if (!isSender && !isRecipient) throw new Error('คุณไม่ได้อยู่ในห้องแลกเปลี่ยนนี้')

      const cleanItems = sanitizeTradeItems(offer.items)
      const cleanGold = Math.max(0, Math.min(100_000_000, Math.floor(offer.gold || 0)))
      const cleanGems = offer.gemItems.slice(0, 8).map((id) => String(id).slice(0, 48))
      const nextSenderItems = isSender ? cleanItems : cur.senderItems
      const nextRecipientItems = isRecipient ? cleanItems : cur.recipientItems
      const nextSenderGold = isSender ? cleanGold : cur.senderGold
      const nextRecipientGold = isRecipient ? cleanGold : cur.recipientGold
      const nextSenderGems = isSender ? cleanGems : cur.senderGemItems
      const nextRecipientGems = isRecipient ? cleanGems : cur.recipientGemItems

      // Modifying offer resets the other player's readiness if items/gold changed.
      const offerChanged = isSender
        ? cleanGold !== cur.senderGold ||
          JSON.stringify(cleanItems.map((i) => `${i.uid}:${i.qty}`)) !==
            JSON.stringify(cur.senderItems.map((i) => `${i.uid}:${i.qty}`)) ||
          JSON.stringify(cleanGems) !== JSON.stringify(cur.senderGemItems)
        : cleanGold !== cur.recipientGold ||
          JSON.stringify(cleanItems.map((i) => `${i.uid}:${i.qty}`)) !==
            JSON.stringify(cur.recipientItems.map((i) => `${i.uid}:${i.qty}`)) ||
          JSON.stringify(cleanGems) !== JSON.stringify(cur.recipientGemItems)

      const nextSenderReady = isSender ? Boolean(offer.ready) : offerChanged ? false : cur.senderReady
      const nextRecipientReady = isRecipient ? Boolean(offer.ready) : offerChanged ? false : cur.recipientReady
      const bothReady = nextSenderReady && nextRecipientReady
      const nextStatus: TradeSessionRecord['status'] = bothReady ? 'completed' : 'active'

      const nextSession: TradeSessionRecord = {
        ...cur,
        status: nextStatus,
        senderItems: nextSenderItems,
        recipientItems: nextRecipientItems,
        senderGold: nextSenderGold,
        recipientGold: nextRecipientGold,
        senderGemItems: nextSenderGems,
        recipientGemItems: nextRecipientGems,
        senderReady: nextSenderReady,
        recipientReady: nextRecipientReady,
      }

      tx.update(ref, {
        status: nextStatus,
        senderItems: nextSenderItems,
        recipientItems: nextRecipientItems,
        senderGold: nextSenderGold,
        recipientGold: nextRecipientGold,
        senderGemItems: nextSenderGems,
        recipientGemItems: nextRecipientGems,
        senderReady: nextSenderReady,
        recipientReady: nextRecipientReady,
        updatedAt: serverTimestamp(),
      })

      return nextSession
    })

    return {
      ok: true,
      message: updated.status === 'completed' ? 'แลกเปลี่ยนสำเร็จทั้งสองฝ่ายแล้ว!' : 'อัปเดตรายการแลกเปลี่ยนแล้ว',
      session: updated,
      completed: updated.status === 'completed',
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'อัปเดตแลกเปลี่ยนไม่สำเร็จ' }
  }
}

export async function cancelTradeFirestore(tradeId: string): Promise<{ ok: boolean; message: string }> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user) return { ok: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
  const ref = doc(db, 'trades', tradeId)
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) return
      const cur = snap.data() as TradeSessionRecord
      if (cur.senderUid !== user.uid && cur.recipientUid !== user.uid) {
        throw new Error('ไม่มีสิทธิ์ปิดห้องแลกเปลี่ยนนี้')
      }
      if (cur.status === 'completed' || cur.status === 'cancelled' || cur.status === 'declined') return
      tx.update(ref, { status: 'cancelled', updatedAt: serverTimestamp() })
    })
    return { ok: true, message: 'ปิดห้องแลกเปลี่ยนแล้ว' }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'ยกเลิกแลกเปลี่ยนไม่สำเร็จ' }
  }
}

export function subscribeIncomingTrades(
  userId: string,
  onChange: (trades: TradeSessionRecord[]) => void,
): () => void {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user || user.uid !== userId) {
    onChange([])
    return () => {}
  }
  const q = query(collection(db, 'trades'), where('recipientUid', '==', userId), limit(10))
  return onSnapshot(
    q,
    (snap) => {
      const active = snap.docs
        .map((d) => d.data() as TradeSessionRecord)
        .filter((t) => t.status === 'pending' || t.status === 'active')
        .sort((a, b) => b.createdAtMs - a.createdAtMs)
      onChange(active)
    },
    () => onChange([]),
  )
}

export function subscribeTradeSession(
  tradeId: string,
  onChange: (session: TradeSessionRecord | null) => void,
): () => void {
  if (!isSignedInVerified() || !tradeId) {
    onChange(null)
    return () => {}
  }
  return onSnapshot(
    doc(db, 'trades', tradeId),
    (snap) => {
      onChange(snap.exists() ? (snap.data() as TradeSessionRecord) : null)
    },
    () => onChange(null),
  )
}

/* ========================================================================== */
/* 4. PARTY FINDER / LFG (/partyListings)                                     */
/* ========================================================================== */

export interface PartyListingRecord {
  listingId: string
  partyId: string
  partyName: string
  leaderUid: string
  leaderName: string
  leaderGameUid: string
  leaderJobId: string
  targetActivity: string
  minLevel: number
  memberCount: number
  maxMembers: number
  status: 'open' | 'closed'
  createdAtMs: number
}

const LOCAL_LFG_KEY = 'pixel-rpg-local-lfg-v1'

export async function listPartyListings(): Promise<PartyListingRecord[]> {
  const local = readLocalJson<PartyListingRecord[]>(LOCAL_LFG_KEY, []).filter((l) => l.status === 'open')
  if (!isSignedInVerified()) return local
  try {
    const q = query(collection(db, 'partyListings'), where('status', '==', 'open'), limit(25))
    const snap = await getDocs(q)
    const remote = snap.docs
      .map((d) => d.data() as PartyListingRecord)
      .filter((l) => l.memberCount < l.maxMembers)
      .sort((a, b) => b.createdAtMs - a.createdAtMs)
    return remote
  } catch {
    return local
  }
}

export async function createPartyListing(
  party: PartyRecord,
  input: { targetActivity: string; minLevel: number; leaderGameUid: string },
): Promise<{ ok: boolean; message: string; listing?: PartyListingRecord }> {
  const user = auth.currentUser
  const uid = user?.uid ?? party.leaderId
  if (party.leaderId !== uid) {
    return { ok: false, message: 'เฉพาะหัวหน้าปาร์ตี้เท่านั้นที่ลงประกาศหาสมาชิกได้' }
  }
  const leaderMember = party.members[party.leaderId]
  const listing: PartyListingRecord = {
    listingId: party.partyId,
    partyId: party.partyId,
    partyName: party.name.slice(0, 32),
    leaderUid: uid,
    leaderName: (leaderMember?.name || 'หัวหน้าปาร์ตี้').slice(0, 24),
    leaderGameUid: (input.leaderGameUid || leaderMember?.gameUid || '1000').slice(0, 8),
    leaderJobId: (leaderMember?.jobId || 'novice').slice(0, 32),
    targetActivity: input.targetActivity.trim().slice(0, 64) || 'ลุยเรด & เก็บเลเวล',
    minLevel: Math.max(1, Math.min(999, Math.floor(input.minLevel || 1))),
    memberCount: party.memberIds.length,
    maxMembers: 4,
    status: 'open',
    createdAtMs: Date.now(),
  }

  if (isSignedInVerified() && user) {
    try {
      await setDoc(doc(db, 'partyListings', party.partyId), {
        ...listing,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return { ok: true, message: 'ประกาศหาสมาชิกใน Party Finder แล้ว!', listing }
    } catch {
      // Fallback below.
    }
  }

  const local = readLocalJson<PartyListingRecord[]>(LOCAL_LFG_KEY, []).filter(
    (l) => l.listingId !== listing.listingId,
  )
  writeLocalJson(LOCAL_LFG_KEY, [listing, ...local])
  return { ok: true, message: 'ประกาศหาสมาชิกใน Party Finder แล้ว!', listing }
}

export async function closePartyListing(partyId: string): Promise<{ ok: boolean; message: string }> {
  const user = auth.currentUser
  if (isSignedInVerified() && user) {
    try {
      await updateDoc(doc(db, 'partyListings', partyId), {
        status: 'closed',
        updatedAt: serverTimestamp(),
      })
      return { ok: true, message: 'ปิดประกาศรับสมัครสมาชิกแล้ว' }
    } catch {
      // Ignore if not found.
    }
  }
  const local = readLocalJson<PartyListingRecord[]>(LOCAL_LFG_KEY, [])
  writeLocalJson(
    LOCAL_LFG_KEY,
    local.map((l) => (l.partyId === partyId ? { ...l, status: 'closed' as const } : l)),
  )
  return { ok: true, message: 'ปิดประกาศรับสมัครสมาชิกแล้ว' }
}

export async function joinPartyViaListing(
  listing: PartyListingRecord,
  memberInput: Omit<BuildPartyMemberInput, 'userId' | 'isGm'>,
  currentParty?: PartyRecord | null,
): Promise<{ ok: boolean; message: string }> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user) {
    return { ok: false, message: 'กรุณาเข้าสู่ระบบ Google ก่อนเข้าร่วมปาร์ตี้ออนไลน์' }
  }
  if (memberInput.level < listing.minLevel) {
    return { ok: false, message: `ปาร์ตี้นี้ต้องการเลเวลอย่างน้อย Lv.${listing.minLevel}` }
  }
  if (currentParty?.partyId === listing.partyId) {
    return { ok: false, message: 'คุณอยู่ในปาร์ตี้นี้อยู่แล้ว' }
  }

  const identity = await ensureUserProfile(user)
  const isGm = Boolean(identity.isGm && isGmAccountUser(user))
  const memberSnap = buildPartyMemberSnapshot({
    ...memberInput,
    userId: user.uid,
    isGm,
    gameUid: identity.gameUid,
    uid: Number(identity.gameUid),
  })
  if (!memberSnap) {
    return { ok: false, message: 'ไม่พบข้อมูลตัวละครสำหรับเข้าร่วมปาร์ตี้' }
  }

  if (currentParty) {
    await leaveParty(currentParty, user.uid)
  }

  try {
    await updateDoc(doc(db, 'parties', listing.partyId), {
      memberIds: arrayUnion(user.uid),
      [`members.${user.uid}`]: memberSnap,
      updatedAt: serverTimestamp(),
    })
    return { ok: true, message: `เข้าร่วมปาร์ตี้ "${listing.partyName}" สำเร็จ!` }
  } catch {
    return { ok: false, message: 'ปาร์ตี้นี้เต็มหรือปิดรับสมัครไปแล้ว' }
  }
}

/* ========================================================================== */
/* 5. SHARED FIELD BOSSES PER MAP (/fieldBosses)                              */
/* ========================================================================== */

export interface FieldBossContributor {
  uid: string
  name: string
  damage: number
}

export interface FieldBossOnlineState {
  mapId: string
  bossId: string
  bossName: string
  level: number
  maxHp: number
  currentHp: number
  defeatedAtMs: number
  respawnAtMs: number
  lastHitter: string
  clearCount: number
  contributors: Record<string, FieldBossContributor>
  claimedUids: string[]
}

const LOCAL_FIELD_BOSS_KEY = 'pixel-rpg-local-field-boss-v1'

function createDefaultFieldBossState(mapId: string): FieldBossOnlineState | null {
  const spec = getFieldBossForMap(mapId)
  if (!spec) return null
  return {
    mapId: spec.mapId,
    bossId: spec.bossId,
    bossName: spec.name,
    level: spec.level,
    maxHp: spec.maxHp,
    currentHp: spec.maxHp,
    defeatedAtMs: 0,
    respawnAtMs: 0,
    lastHitter: '-',
    clearCount: 0,
    contributors: {},
    claimedUids: [],
  }
}

export function subscribeFieldBoss(
  mapId: string,
  onChange: (state: FieldBossOnlineState | null) => void,
): () => void {
  const spec = getFieldBossForMap(mapId)
  if (!spec) {
    onChange(null)
    return () => {}
  }

  const localMap = readLocalJson<Record<string, FieldBossOnlineState>>(LOCAL_FIELD_BOSS_KEY, {})
  const fallback = localMap[mapId] ?? createDefaultFieldBossState(mapId)

  if (!isSignedInVerified()) {
    onChange(fallback)
    return () => {}
  }

  return onSnapshot(
    doc(db, 'fieldBosses', mapId),
    (snap) => {
      if (!snap.exists()) {
        onChange(createDefaultFieldBossState(mapId))
        return
      }
      onChange(snap.data() as FieldBossOnlineState)
    },
    () => {
      onChange(fallback)
    },
  )
}

export async function attackFieldBossOnline(
  mapId: string,
  damage: number,
  playerName: string,
): Promise<{
  ok: boolean
  state: FieldBossOnlineState | null
  defeatedNow: boolean
  respawningSec: number
  error?: string
}> {
  const spec = getFieldBossForMap(mapId)
  if (!spec) return { ok: false, state: null, defeatedNow: false, respawningSec: 0, error: 'แมพนี้ไม่มีฟิลด์บอส' }

  const user = auth.currentUser
  const uid = user?.uid ?? 'guest_player'
  const cleanName = playerName.slice(0, 24) || 'ผู้กล้า'
  const safeDamage = Math.max(20, Math.round(damage))
  const now = Date.now()

  const applyStep = (prev: FieldBossOnlineState): { next: FieldBossOnlineState; defeatedNow: boolean; respawningSec: number } => {
    let base = prev
    if (base.currentHp === 0) {
      if (now < base.respawnAtMs) {
        return {
          next: base,
          defeatedNow: false,
          respawningSec: Math.max(1, Math.ceil((base.respawnAtMs - now) / 1000)),
        }
      }
      base = {
        ...createDefaultFieldBossState(mapId)!,
        clearCount: base.clearCount,
      }
    }

    const nextHp = Math.max(0, base.currentHp - safeDamage)
    const prevDmg = base.contributors[uid]?.damage ?? 0
    const nextContributors: Record<string, FieldBossContributor> = {
      ...base.contributors,
      [uid]: { uid, name: cleanName, damage: prevDmg + safeDamage },
    }
    // Keep top 20 contributors to bound map size cleanly.
    const trimmedEntries = Object.entries(nextContributors)
      .sort((a, b) => b[1].damage - a[1].damage)
      .slice(0, 20)
    const boundedContributors = Object.fromEntries(trimmedEntries)

    const defeatedNow = nextHp === 0
    const next: FieldBossOnlineState = {
      ...base,
      currentHp: nextHp,
      lastHitter: cleanName,
      defeatedAtMs: defeatedNow ? now : base.defeatedAtMs,
      respawnAtMs: defeatedNow ? now + spec.respawnSec * 1000 : base.respawnAtMs,
      clearCount: defeatedNow ? base.clearCount + 1 : base.clearCount,
      contributors: boundedContributors,
    }
    return { next, defeatedNow, respawningSec: 0 }
  }

  if (isSignedInVerified() && user) {
    try {
      const ref = doc(db, 'fieldBosses', mapId)
      const outcome = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        const base = snap.exists()
          ? (snap.data() as FieldBossOnlineState)
          : createDefaultFieldBossState(mapId)!
        const res = applyStep(base)
        if (res.respawningSec > 0) return res
        tx.set(ref, { ...res.next, updatedAt: serverTimestamp() })
        return res
      })
      return {
        ok: outcome.respawningSec === 0,
        state: outcome.next,
        defeatedNow: outcome.defeatedNow,
        respawningSec: outcome.respawningSec,
        error: outcome.respawningSec > 0 ? `ฟิลด์บอสกำลังเกิดใหม่ในอีก ${outcome.respawningSec} วินาที` : undefined,
      }
    } catch {
      // Fallback below.
    }
  }

  const localMap = readLocalJson<Record<string, FieldBossOnlineState>>(LOCAL_FIELD_BOSS_KEY, {})
  const base = localMap[mapId] ?? createDefaultFieldBossState(mapId)!
  const res = applyStep(base)
  if (res.respawningSec === 0) {
    localMap[mapId] = res.next
    writeLocalJson(LOCAL_FIELD_BOSS_KEY, localMap)
  }
  return {
    ok: res.respawningSec === 0,
    state: res.next,
    defeatedNow: res.defeatedNow,
    respawningSec: res.respawningSec,
    error: res.respawningSec > 0 ? `ฟิลด์บอสกำลังเกิดใหม่ในอีก ${res.respawningSec} วินาที` : undefined,
  }
}

export async function claimFieldBossRewardOnline(mapId: string): Promise<{
  ok: boolean
  gold: number
  diamonds: number
  stones: number
  error?: string
}> {
  const spec = getFieldBossForMap(mapId)
  if (!spec) return { ok: false, gold: 0, diamonds: 0, stones: 0, error: 'ไม่พบข้อมูลบอส' }

  const user = auth.currentUser
  const uid = user?.uid ?? 'guest_player'

  const verifyAndClaim = (cur: FieldBossOnlineState) => {
    if (cur.currentHp > 0 || cur.defeatedAtMs <= 0) {
      throw new Error('ฟิลด์บอสยังไม่ถูกโค่นล้ม')
    }
    if (!cur.contributors[uid] || cur.contributors[uid].damage <= 0) {
      throw new Error('ต้องร่วมโจมตีฟิลด์บอสก่อนจึงจะรับรางวัลได้')
    }
    if (cur.claimedUids.includes(uid)) {
      throw new Error('รับรางวัลรอบนี้ไปแล้ว')
    }
    return {
      ...cur,
      claimedUids: [...cur.claimedUids, uid].slice(-25),
    }
  }

  if (isSignedInVerified() && user) {
    try {
      const ref = doc(db, 'fieldBosses', mapId)
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists()) throw new Error('ยังไม่มีบันทึกฟิลด์บอสในแมพนี้')
        const cur = snap.data() as FieldBossOnlineState
        const next = verifyAndClaim(cur)
        tx.set(ref, { ...next, updatedAt: serverTimestamp() })
      })
      return { ok: true, gold: spec.rewardGold, diamonds: spec.rewardDiamonds, stones: spec.rewardStones }
    } catch (err) {
      return {
        ok: false,
        gold: 0,
        diamonds: 0,
        stones: 0,
        error: err instanceof Error ? err.message : 'รับรางวัลฟิลด์บอสไม่สำเร็จ',
      }
    }
  }

  const localMap = readLocalJson<Record<string, FieldBossOnlineState>>(LOCAL_FIELD_BOSS_KEY, {})
  const cur = localMap[mapId]
  if (!cur) return { ok: false, gold: 0, diamonds: 0, stones: 0, error: 'ยังไม่พบบันทึกฟิลด์บอส' }
  try {
    localMap[mapId] = verifyAndClaim(cur)
    writeLocalJson(LOCAL_FIELD_BOSS_KEY, localMap)
    return { ok: true, gold: spec.rewardGold, diamonds: spec.rewardDiamonds, stones: spec.rewardStones }
  } catch (err) {
    return {
      ok: false,
      gold: 0,
      diamonds: 0,
      stones: 0,
      error: err instanceof Error ? err.message : 'รับรางวัลไม่สำเร็จ',
    }
  }
}

/* ========================================================================== */
/* 6. LIVE 1V1 PVP DUEL (/duels)                                              */
/* ========================================================================== */

export interface DuelMatchRecord extends DuelMatchState {
  challengerName: string
  opponentName: string
  challengerGameUid: string
  opponentGameUid: string
  createdAtMs: number
}

export async function createDuelChallenge(input: {
  targetUidOrGameUid: string
  challenger: DuelFighterState
  challengerGameUid: string
}): Promise<{ ok: boolean; message: string; duelId?: string }> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user) {
    return { ok: false, message: 'กรุณาเข้าสู่ระบบ Google ก่อนท้าประลอง Live PvP' }
  }

  const target = await resolveTargetPlayerIdentity(input.targetUidOrGameUid)
  if (!target) return { ok: false, message: 'ไม่พบคู่ต่อสู้' }
  if (target.uid === user.uid) return { ok: false, message: 'ไม่สามารถท้าดวลตัวเองได้' }

  const duelId = `duel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const challenger: DuelFighterState = { ...input.challenger, uid: user.uid }
  const placeholderOpponent: DuelFighterState = {
    uid: target.uid,
    name: target.name,
    jobId: 'novice',
    level: 1,
    maxHp: 120,
    hp: 120,
    atk: 15,
    def: 5,
    crit: 0.1,
    guarded: false,
    potionUsed: false,
  }

  const record: DuelMatchRecord = {
    duelId,
    status: 'pending',
    challengerUid: user.uid,
    opponentUid: target.uid,
    challengerName: challenger.name,
    opponentName: target.name,
    challengerGameUid: (input.challengerGameUid || '1000').slice(0, 8),
    opponentGameUid: target.gameUid,
    turnNumber: 1,
    activeTurnUid: user.uid,
    fighters: {
      [user.uid]: challenger,
      [target.uid]: placeholderOpponent,
    },
    logs: [`${challenger.name} ส่งคำท้าประลอง Live 1v1 ถึง ${target.name}!`],
    winnerUid: null,
    createdAtMs: Date.now(),
  }

  try {
    await setDoc(doc(db, 'duels', duelId), {
      ...record,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return { ok: true, message: `ส่งคำท้าประลองถึง ${target.name} แล้ว!`, duelId }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `duels/${duelId}`)
  }
}

export async function respondDuelChallenge(
  duelId: string,
  decision: 'active' | 'declined',
  opponentFighter?: DuelFighterState,
): Promise<{ ok: boolean; message: string }> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user) return { ok: false, message: 'กรุณาเข้าสู่ระบบก่อน' }

  const ref = doc(db, 'duels', duelId)
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error('ไม่พบคำท้าประลอง')
      const cur = snap.data() as DuelMatchRecord
      if (cur.opponentUid !== user.uid) throw new Error('ไม่มีสิทธิ์ตอบรับคำท้านี้')
      if (cur.status !== 'pending') throw new Error('คำท้านี้หมดอายุหรือถูกตอบรับไปแล้ว')

      if (decision === 'declined') {
        tx.update(ref, {
          status: 'declined',
          logs: [...cur.logs, `${cur.opponentName} ปฏิเสธคำท้าประลอง`].slice(-24),
          updatedAt: serverTimestamp(),
        })
        return
      }

      if (!opponentFighter) throw new Error('ไม่พบข้อมูลนักสู้ฝ่ายรับ')
      const nextFighters = {
        ...cur.fighters,
        [user.uid]: { ...opponentFighter, uid: user.uid },
      }
      tx.update(ref, {
        status: 'active',
        fighters: nextFighters,
        logs: [...cur.logs, `⚔ เริ่มการประลอง 1v1! ตาของ ${cur.challengerName}`].slice(-24),
        updatedAt: serverTimestamp(),
      })
    })
    return {
      ok: true,
      message: decision === 'active' ? 'เริ่มการประลอง 1v1 แล้ว!' : 'ปฏิเสธคำท้าประลองแล้ว',
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'ตอบรับคำท้าไม่สำเร็จ' }
  }
}

export async function submitDuelAction(
  duelId: string,
  move: DuelMoveType,
): Promise<{ ok: boolean; message: string; next?: DuelMatchRecord }> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user) return { ok: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
  const ref = doc(db, 'duels', duelId)

  try {
    const nextRecord = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error('ไม่พบห้องประลอง')
      const cur = snap.data() as DuelMatchRecord
      const result = resolveDuelTurn(cur, user.uid, move)
      if (!result.ok) throw new Error(result.error || 'ไม่สามารถเดินเทิร์นได้')
      const updated: DuelMatchRecord = {
        ...cur,
        ...result.next,
      }
      tx.update(ref, {
        status: updated.status,
        turnNumber: updated.turnNumber,
        activeTurnUid: updated.activeTurnUid,
        fighters: updated.fighters,
        logs: updated.logs,
        winnerUid: updated.winnerUid,
        updatedAt: serverTimestamp(),
      })
      return updated
    })
    return { ok: true, message: 'ออกแอ็กชันสำเร็จ', next: nextRecord }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'ออกแอ็กชันไม่สำเร็จ' }
  }
}

export async function cancelDuelChallenge(duelId: string): Promise<{ ok: boolean; message: string }> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user) return { ok: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
  const ref = doc(db, 'duels', duelId)
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) return
      const cur = snap.data() as DuelMatchRecord
      if (cur.challengerUid !== user.uid && cur.opponentUid !== user.uid) {
        throw new Error('ไม่มีสิทธิ์ยกเลิก')
      }
      if (cur.status === 'completed' || cur.status === 'cancelled' || cur.status === 'declined') return
      tx.update(ref, { status: 'cancelled', updatedAt: serverTimestamp() })
    })
    return { ok: true, message: 'ออกจากห้องประลองแล้ว' }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'ยกเลิกไม่สำเร็จ' }
  }
}

export function subscribeIncomingDuels(
  userId: string,
  onChange: (duels: DuelMatchRecord[]) => void,
): () => void {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user || user.uid !== userId) {
    onChange([])
    return () => {}
  }
  const q = query(collection(db, 'duels'), where('opponentUid', '==', userId), limit(10))
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as DuelMatchRecord)
        .filter((d) => d.status === 'pending' || d.status === 'active')
        .sort((a, b) => b.createdAtMs - a.createdAtMs)
      onChange(list)
    },
    () => onChange([]),
  )
}

export function subscribeDuelSession(
  duelId: string,
  onChange: (duel: DuelMatchRecord | null) => void,
): () => void {
  if (!isSignedInVerified() || !duelId) {
    onChange(null)
    return () => {}
  }
  return onSnapshot(
    doc(db, 'duels', duelId),
    (snap) => {
      onChange(snap.exists() ? (snap.data() as DuelMatchRecord) : null)
    },
    () => onChange(null),
  )
}

/* ========================================================================== */
/* 7. PLAYER INSPECT & REPORT (/playerReports)                                */
/* ========================================================================== */

export interface InspectedPlayerProfile {
  userId: string
  gameUid: string
  name: string
  jobId: string
  level: number
  rebirthCount: number
  combatPower: number
  arenaRating: number
  arenaWins: number
  highestTowerFloor: number
  activeTitle: string | null
  guildName: string | null
  mapId?: string
  status?: string
  isOnline: boolean
}

export async function inspectPlayerProfile(targetUidOrGameUid: string): Promise<InspectedPlayerProfile | null> {
  const clean = targetUidOrGameUid.trim()
  if (!clean) return null

  const seed = SEED_RIVAL_HEROES.find((h) => h.userId === clean || h.gameUid === clean)
  if (seed) {
    return {
      ...seed,
      isOnline: false,
    }
  }

  let uid = clean
  if (/^\d{1,8}$/.test(clean)) {
    const resolved = await resolveTargetPlayerIdentity(clean)
    if (!resolved) return null
    uid = resolved.uid
  }

  if (!isSignedInVerified()) return null

  let hero: Partial<LeaderboardHeroEntry> = {}
  let pres: { displayName?: string; jobId?: string; level?: number; mapId?: string; status?: string; gameUid?: string } = {}

  try {
    const [lbSnap, presSnap] = await Promise.all([
      getDoc(doc(db, 'leaderboard', uid)),
      getDoc(doc(db, 'worldPresence', uid)),
    ])
    if (lbSnap.exists()) hero = lbSnap.data() as LeaderboardHeroEntry
    if (presSnap.exists()) pres = presSnap.data() as typeof pres
    if (!lbSnap.exists() && !presSnap.exists()) return null

    return {
      userId: uid,
      gameUid: hero.gameUid ?? pres.gameUid ?? '1000',
      name: hero.name ?? pres.displayName ?? 'นักผจญภัย',
      jobId: hero.jobId ?? pres.jobId ?? 'novice',
      level: hero.level ?? pres.level ?? 1,
      rebirthCount: hero.rebirthCount ?? 0,
      combatPower: hero.combatPower ?? Math.max(100, (pres.level ?? 1) * 45),
      arenaRating: hero.arenaRating ?? 1000,
      arenaWins: hero.arenaWins ?? 0,
      highestTowerFloor: hero.highestTowerFloor ?? 0,
      activeTitle: hero.activeTitle ?? null,
      guildName: hero.guildName ?? null,
      mapId: pres.mapId,
      status: pres.status,
      isOnline: presSnap.exists(),
    }
  } catch {
    return null
  }
}

export async function submitPlayerReport(input: {
  targetUid: string
  targetGameUid: string
  targetName: string
  reason: string
  details?: string
}): Promise<{ ok: boolean; message: string }> {
  const user = auth.currentUser
  if (!isSignedInVerified() || !user) {
    return { ok: false, message: 'กรุณาเข้าสู่ระบบ Google ก่อนรายงานผู้เล่น' }
  }
  if (!input.targetUid || input.targetUid === user.uid) {
    return { ok: false, message: 'ไม่สามารถรายงานตัวเองได้' }
  }
  const cleanReason = input.reason.trim().slice(0, 80)
  if (!cleanReason) return { ok: false, message: 'กรุณาเลือกหรือระบุเหตุผลการรายงาน' }

  const reportId = `rep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  try {
    await setDoc(doc(db, 'playerReports', reportId), {
      reportId,
      reporterUid: user.uid,
      targetUid: input.targetUid.slice(0, 128),
      targetGameUid: (input.targetGameUid || '1000').slice(0, 8),
      targetName: (input.targetName || 'ผู้เล่น').slice(0, 24),
      reason: cleanReason,
      details: (input.details || '').trim().slice(0, 240),
      createdAtMs: Date.now(),
      createdAt: serverTimestamp(),
    })
    return { ok: true, message: `ส่งรายงานผู้เล่น ${input.targetName} ให้ทีมงานตรวจสอบแล้ว` }
  } catch {
    return { ok: false, message: 'ส่งรายงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }
}
