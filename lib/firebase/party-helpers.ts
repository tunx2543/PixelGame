import { normalizeGameUidInput } from '@/lib/game/permissions'
import { sanitizeSafePresenceId } from './presence-helpers'

export const MAX_PARTY_SIZE = 4
export const PARTY_EXP_BONUS_PER_MATE = 0.15
export const PARTY_GOLD_BONUS_PER_MATE = 0.1

export interface PartyMemberSnapshot {
  userId: string
  uid: number
  gameUid: string
  name: string
  jobId: string
  level: number
  hp: number
  maxHp: number
  mapId: string
  isGm: boolean
}

export interface PartyRecord {
  partyId: string
  name: string
  leaderId: string
  memberIds: string[]
  members: Record<string, PartyMemberSnapshot>
}

export interface PartyInviteRecord {
  inviteId: string
  partyId: string
  partyName: string
  fromUid: string
  toUid: string
  fromGameUid: string
  toGameUid: string
  fromName: string
  toName: string
  fromIsGm: boolean
  status: 'pending' | 'accepted' | 'declined'
}

export interface BuildPartyMemberInput {
  userId: string
  isGm: boolean
  gameUid?: string | null
  uid?: number
  name: string
  jobId: string
  level: number
  hp: number
  maxHp: number
  mapId: string
}

export interface PartySynergySummary {
  sameMapMates: number
  onlineMates: number
  expMul: number
  goldMul: number
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(min, Math.min(max, Math.floor(num)))
}

export function normalizePartyName(
  rawName: string | null | undefined,
  fallbackLeaderName?: string,
): string {
  const trimmed = typeof rawName === 'string' ? rawName.trim() : ''
  if (trimmed.length > 0) return trimmed.slice(0, 32)
  const owner = (fallbackLeaderName || 'นักผจญภัย').trim().slice(0, 16) || 'นักผจญภัย'
  return `ปาร์ตี้ของ ${owner}`.slice(0, 32)
}

export function buildPartyMemberSnapshot(input: BuildPartyMemberInput): PartyMemberSnapshot | null {
  if (typeof input.userId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(input.userId)) {
    return null
  }

  let isGm = Boolean(input.isGm)
  let gameUid: string | null = null
  let uid = 0

  if (isGm) {
    gameUid = '0000'
    uid = 0
  } else {
    isGm = false
    gameUid = normalizeGameUidInput(input.gameUid) ?? normalizeGameUidInput(input.uid)
    if (!gameUid || gameUid === '0000') {
      return null
    }
    uid = clampInt(Number(gameUid), 1, 99_999_999, 0)
    if (uid <= 0) return null
  }

  const rawName = typeof input.name === 'string' ? input.name.trim() : ''
  const name = rawName.slice(0, 24) || 'นักผจญภัย'
  let jobId = sanitizeSafePresenceId(input.jobId, 'novice', 32)
  if (!isGm && jobId === 'gm') jobId = 'novice'
  const mapId = sanitizeSafePresenceId(input.mapId, 'town', 32)
  const level = clampInt(input.level, 1, 999, 1)
  const maxHp = clampInt(input.maxHp, 1, 100_000_000, 100)
  const hp = clampInt(input.hp, 0, maxHp, maxHp)

  return {
    userId: input.userId,
    uid,
    gameUid,
    name,
    jobId,
    level,
    hp,
    maxHp,
    mapId,
    isGm,
  }
}

export function parsePartyMemberSnapshot(
  raw: unknown,
  expectedUserId: string,
): PartyMemberSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const gameUid = normalizeGameUidInput(r.gameUid as string | undefined)
  if (!gameUid) return null
  const isGm = Boolean(r.isGm) && gameUid === '0000' && Number(r.uid) === 0
  const uid = isGm ? 0 : clampInt(r.uid, 1, 99_999_999, Number(gameUid) || 1)
  const maxHp = clampInt(r.maxHp, 1, 100_000_000, 100)
  const hp = clampInt(r.hp, 0, maxHp, maxHp)

  return {
    userId: typeof r.userId === 'string' && r.userId ? r.userId : expectedUserId,
    uid,
    gameUid,
    name: (typeof r.name === 'string' ? r.name.trim() : '').slice(0, 24) || 'นักผจญภัย',
    jobId: sanitizeSafePresenceId(r.jobId, 'novice', 32),
    level: clampInt(r.level, 1, 999, 1),
    hp,
    maxHp,
    mapId: sanitizeSafePresenceId(r.mapId, 'town', 32),
    isGm,
  }
}

export function parsePartyDoc(
  docData: Record<string, unknown>,
  docId?: string,
): PartyRecord | null {
  if (!docData || typeof docData !== 'object') return null
  const partyId = sanitizeSafePresenceId(docData.partyId || docId, '', 64)
  if (!partyId || partyId.length < 4) return null

  const leaderId = typeof docData.leaderId === 'string' ? docData.leaderId : ''
  const rawMemberIds = Array.isArray(docData.memberIds) ? docData.memberIds : []
  const memberIds = rawMemberIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
  if (!leaderId || memberIds.length === 0) return null

  const rawMembers =
    docData.members && typeof docData.members === 'object'
      ? (docData.members as Record<string, unknown>)
      : {}
  const members: Record<string, PartyMemberSnapshot> = {}
  for (const id of memberIds) {
    const parsed = parsePartyMemberSnapshot(rawMembers[id], id)
    if (parsed) members[id] = parsed
  }

  return {
    partyId,
    name: normalizePartyName(docData.name as string | undefined),
    leaderId,
    memberIds: memberIds.slice(0, MAX_PARTY_SIZE),
    members,
  }
}

export function parsePartyInviteDoc(
  docData: Record<string, unknown>,
  docId?: string,
): PartyInviteRecord | null {
  if (!docData || typeof docData !== 'object') return null
  const inviteId = sanitizeSafePresenceId(docData.inviteId || docId, '', 128)
  const partyId = sanitizeSafePresenceId(docData.partyId, '', 64)
  const fromUid = typeof docData.fromUid === 'string' ? docData.fromUid : ''
  const toUid = typeof docData.toUid === 'string' ? docData.toUid : ''
  const fromGameUid = normalizeGameUidInput(docData.fromGameUid as string | undefined) ?? ''
  const toGameUid = normalizeGameUidInput(docData.toGameUid as string | undefined) ?? ''
  if (!inviteId || !partyId || !fromUid || !toUid || !fromGameUid || !toGameUid) return null

  const statusRaw = docData.status
  const status: PartyInviteRecord['status'] =
    statusRaw === 'accepted' || statusRaw === 'declined' ? statusRaw : 'pending'

  return {
    inviteId,
    partyId,
    partyName: normalizePartyName(docData.partyName as string | undefined),
    fromUid,
    toUid,
    fromGameUid,
    toGameUid,
    fromName: (typeof docData.fromName === 'string' ? docData.fromName.trim() : '').slice(0, 24) || 'นักผจญภัย',
    toName: (typeof docData.toName === 'string' ? docData.toName.trim() : '').slice(0, 24) || 'นักผจญภัย',
    fromIsGm: Boolean(docData.fromIsGm) && fromGameUid === '0000',
    status,
  }
}

export function sortPartyMembers(party: PartyRecord): PartyMemberSnapshot[] {
  const list: PartyMemberSnapshot[] = []
  for (const id of party.memberIds) {
    const member = party.members[id]
    if (member) list.push(member)
  }
  return list.sort((a, b) => {
    const aLeader = a.userId === party.leaderId ? 0 : 1
    const bLeader = b.userId === party.leaderId ? 0 : 1
    if (aLeader !== bLeader) return aLeader - bLeader
    if (a.isGm !== b.isGm) return a.isGm ? -1 : 1
    if (b.level !== a.level) return b.level - a.level
    return a.uid - b.uid
  })
}

export function pickNextLeaderId(
  memberIds: readonly string[],
  currentLeaderId: string,
  leavingUid: string,
): string | null {
  const remaining = memberIds.filter((id) => id !== leavingUid)
  if (remaining.length === 0) return null
  if (currentLeaderId !== leavingUid && remaining.includes(currentLeaderId)) {
    return currentLeaderId
  }
  return remaining[0]
}

export interface SynergyOnlineEntry {
  userId: string
  mapId: string
  invisible?: boolean
}

export function computePartySynergyBonus(
  party: PartyRecord | null | undefined,
  onlinePlayers: readonly SynergyOnlineEntry[],
  selfUserId: string | null | undefined,
  activeMapId: string | null | undefined,
): PartySynergySummary {
  if (!party || !selfUserId || !activeMapId) {
    return { sameMapMates: 0, onlineMates: 0, expMul: 1, goldMul: 1 }
  }

  const onlineById = new Map<string, SynergyOnlineEntry>()
  for (const player of onlinePlayers) {
    if (!player.invisible) onlineById.set(player.userId, player)
  }

  let onlineMates = 0
  let sameMapMates = 0

  for (const memberId of party.memberIds) {
    if (memberId === selfUserId) continue
    const live = onlineById.get(memberId)
    if (!live) continue
    onlineMates++
    if (live.mapId === activeMapId) {
      sameMapMates++
    }
  }

  const cappedSameMap = Math.min(MAX_PARTY_SIZE - 1, sameMapMates)
  return {
    sameMapMates: cappedSameMap,
    onlineMates,
    expMul: Math.round((1 + cappedSameMap * PARTY_EXP_BONUS_PER_MATE) * 100) / 100,
    goldMul: Math.round((1 + cappedSameMap * PARTY_GOLD_BONUS_PER_MATE) * 100) / 100,
  }
}
