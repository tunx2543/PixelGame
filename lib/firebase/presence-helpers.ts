import { normalizeGameUidInput } from '@/lib/game/permissions'

export const PRESENCE_HEARTBEAT_MS = 4_000
export const PRESENCE_MOVE_THROTTLE_MS = 200
export const PRESENCE_STALE_MS = 25_000
export const PRESENCE_QUERY_LIMIT = 60

export type PresenceFacing = 'up' | 'down' | 'left' | 'right'
export type PresenceStatus = 'town' | 'idle' | 'moving' | 'combat'

export interface WorldPresencePayload {
  userId: string
  gameUid: string
  uid: number
  displayName: string
  jobId: string
  mapId: string
  x: number
  y: number
  level: number
  gm: boolean
  facing: PresenceFacing
  moving: boolean
  status: PresenceStatus
  attackAnim: number
  invisible: false
  heartbeatMs: number
}

export interface BuildPresenceInput {
  userId: string
  isGm: boolean
  gameUid?: string | null
  uid?: number
  name: string
  jobId: string
  mapId: string
  x: number
  y: number
  level: number
  facing: string
  moving: boolean
  attackAnim: number
  inCombat?: boolean
  invisible?: boolean
  nowMs?: number
}

export interface RemotePlayerSnapshot {
  userId: string
  uid: number
  gameUid?: string
  displayName: string
  classId: string
  jobId: string
  mapId: string
  x: number
  y: number
  level: number
  gm: boolean
  facing: PresenceFacing
  moving: boolean
  status: PresenceStatus
  attackAnim: number
  invisible: boolean
  lastSeen: number
  previousX?: number
  previousY?: number
  receivedAt?: number
}

const VALID_FACING = new Set<PresenceFacing>(['up', 'down', 'left', 'right'])
const VALID_STATUS = new Set<PresenceStatus>(['town', 'idle', 'moving', 'combat'])

export function sanitizeSafePresenceId(value: unknown, fallback: string, maxLen: number): string {
  const raw = typeof value === 'string' ? value : ''
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, maxLen)
  return cleaned.length > 0 ? cleaned : fallback
}

function clampFinite(value: unknown, min: number, max: number, fallback: number, decimals: number): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return fallback
  const clamped = Math.max(min, Math.min(max, num))
  const factor = 10 ** decimals
  return Math.round(clamped * factor) / factor
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(min, Math.min(max, Math.floor(num)))
}

export function resolvePresenceStatus(input: {
  mapId: string
  moving: boolean
  attackAnim: number
  inCombat?: boolean
}): PresenceStatus {
  if (input.attackAnim > 0 || input.inCombat) return 'combat'
  if (input.moving) return 'moving'
  if (input.mapId === 'town') return 'town'
  return 'idle'
}

export function formatPresenceStatusLabel(status: PresenceStatus | undefined, mapId?: string): string {
  switch (status) {
    case 'combat':
      return 'กำลังต่อสู้'
    case 'moving':
      return 'กำลังเดิน'
    case 'town':
      return 'อยู่ในเมือง'
    case 'idle':
      return mapId === 'town' ? 'อยู่ในเมือง' : 'สำรวจพื้นที่'
    default:
      return mapId === 'town' ? 'อยู่ในเมือง' : 'ออนไลน์'
  }
}

export function filterPlayersForMap(
  players: readonly RemotePlayerSnapshot[],
  mapId: string | null | undefined,
): RemotePlayerSnapshot[] {
  if (!mapId) return []
  return players.filter((player) => !player.invisible && player.mapId === mapId)
}

export function buildWorldPresencePayload(input: BuildPresenceInput): WorldPresencePayload | null {
  if (input.invisible) return null
  if (typeof input.userId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(input.userId)) {
    return null
  }

  let gm = Boolean(input.isGm)
  let gameUid: string | null = null
  let uid = 0

  if (gm) {
    gameUid = '0000'
    uid = 0
  } else {
    gm = false
    gameUid = normalizeGameUidInput(input.gameUid) ?? normalizeGameUidInput(input.uid)
    if (!gameUid || gameUid === '0000') {
      return null
    }
    uid = clampInt(Number(gameUid), 1, 99_999_999, 0)
    if (uid <= 0) return null
  }

  const rawName = typeof input.name === 'string' ? input.name.trim() : ''
  const displayName = rawName.slice(0, 24) || 'นักผจญภัย'
  let jobId = sanitizeSafePresenceId(input.jobId, 'novice', 32)
  if (!gm && jobId === 'gm') jobId = 'novice'
  const mapId = sanitizeSafePresenceId(input.mapId, 'town', 32)
  const facing: PresenceFacing = VALID_FACING.has(input.facing as PresenceFacing)
    ? (input.facing as PresenceFacing)
    : 'down'
  const attackAnim = clampFinite(input.attackAnim, 0, 5, 0, 3)
  const moving = Boolean(input.moving)

  return {
    userId: input.userId,
    gameUid,
    uid,
    displayName,
    jobId,
    mapId,
    x: clampFinite(input.x, 0, 5000, 0, 1),
    y: clampFinite(input.y, 0, 5000, 0, 1),
    level: clampInt(input.level, 1, 999, 1),
    gm,
    facing,
    moving,
    status: resolvePresenceStatus({ mapId, moving, attackAnim, inCombat: input.inCombat }),
    attackAnim,
    invisible: false,
    heartbeatMs: Math.max(0, Math.floor(Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now())),
  }
}

export function extractDocTimestampMs(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : null
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (typeof value === 'object') {
    const record = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number }
    if (typeof record.toMillis === 'function') {
      const ms = record.toMillis()
      return Number.isFinite(ms) ? ms : null
    }
    if (typeof record.seconds === 'number' && Number.isFinite(record.seconds)) {
      const nanos = typeof record.nanoseconds === 'number' && Number.isFinite(record.nanoseconds) ? record.nanoseconds : 0
      return Math.round(record.seconds * 1000 + nanos / 1_000_000)
    }
  }
  return null
}

export interface ParsePresenceOptions {
  selfUserId: string
  activeMapId?: string | null
  nowMs?: number
  clockOffsetMs?: number | null
  existing?: RemotePlayerSnapshot | null
  staleMs?: number
}

export function parseWorldPresenceToRemotePlayer(
  docData: Record<string, unknown>,
  options: ParsePresenceOptions,
): RemotePlayerSnapshot | null {
  if (!docData || typeof docData !== 'object') return null

  const userId = typeof docData.userId === 'string' ? docData.userId : ''
  if (!userId || userId === options.selfUserId) return null
  if (docData.invisible === true) return null

  const mapId = typeof docData.mapId === 'string' ? docData.mapId : ''
  if (!mapId) return null
  if (options.activeMapId && mapId !== options.activeMapId) return null

  const x = Number(docData.x)
  const y = Number(docData.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null

  const nowMs = options.nowMs ?? Date.now()
  const staleMs = options.staleMs ?? PRESENCE_STALE_MS
  const serverUpdatedMs = extractDocTimestampMs(docData.updatedAt)

  let localLastSeen = nowMs
  if (serverUpdatedMs !== null) {
    if (options.clockOffsetMs !== undefined && options.clockOffsetMs !== null) {
      const estimatedServerNow = nowMs + options.clockOffsetMs
      if (estimatedServerNow - serverUpdatedMs > staleMs) {
        return null
      }
      localLastSeen = serverUpdatedMs - options.clockOffsetMs
    } else if (nowMs - serverUpdatedMs > staleMs) {
      return null
    } else {
      localLastSeen = nowMs
    }
  }

  const facing: PresenceFacing = VALID_FACING.has(docData.facing as PresenceFacing)
    ? (docData.facing as PresenceFacing)
    : 'down'
  const jobId = sanitizeSafePresenceId(docData.jobId, 'novice', 32)
  const displayName =
    (typeof docData.displayName === 'string' ? docData.displayName.trim() : '').slice(0, 24) || 'นักผจญภัย'
  const gameUid = normalizeGameUidInput(docData.gameUid as string | undefined) ?? undefined
  const gm = Boolean(docData.gm) && gameUid === '0000' && Number(docData.uid) === 0
  const uid = gm ? 0 : clampInt(docData.uid, 1, 99_999_999, Number(gameUid ?? 0) || 1)
  const level = clampInt(docData.level, 1, 999, 1)
  const attackAnim = clampFinite(docData.attackAnim, 0, 5, 0, 3)
  const moving = Boolean(docData.moving)
  const status: PresenceStatus = VALID_STATUS.has(docData.status as PresenceStatus)
    ? (docData.status as PresenceStatus)
    : resolvePresenceStatus({ mapId, moving, attackAnim })

  const existing = options.existing
  const sameMapExisting = existing && existing.mapId === mapId ? existing : null

  return {
    userId,
    uid,
    gameUid,
    displayName,
    classId: jobId,
    jobId,
    mapId,
    x,
    y,
    level,
    gm,
    facing,
    moving,
    status,
    attackAnim,
    invisible: false,
    lastSeen: localLastSeen,
    previousX: sameMapExisting ? sameMapExisting.x : x,
    previousY: sameMapExisting ? sameMapExisting.y : y,
    receivedAt: nowMs,
  }
}

export function pruneStaleRemotePlayers(
  players: Map<string, RemotePlayerSnapshot>,
  nowMs: number,
  staleMs: number = PRESENCE_STALE_MS,
): RemotePlayerSnapshot[] {
  const cutoff = nowMs - staleMs
  for (const [id, player] of players) {
    if (player.lastSeen < cutoff || player.invisible) {
      players.delete(id)
    }
  }
  return [...players.values()]
}
