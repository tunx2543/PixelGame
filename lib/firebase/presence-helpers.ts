import { normalizeGameUidInput } from '@/lib/game/permissions'

export const PRESENCE_HEARTBEAT_MS = 4_000
export const PRESENCE_MOVE_THROTTLE_MS = 120
export const PRESENCE_STALE_MS = 45_000
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
  renderX?: number
  renderY?: number
  vx?: number
  vy?: number
  renderMoving?: boolean
  localWalkT?: number
  localAttackAnim?: number
  lastNetX?: number
  lastNetY?: number
  lastNetAt?: number
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

export function filterPlayersForMap<T extends { invisible?: boolean; mapId?: string }>(
  players: readonly T[],
  mapId: string | null | undefined,
): T[] {
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
  let jobId = sanitizeSafePresenceId(input.jobId, 'swordsman', 32)
  if (jobId === 'gm') jobId = 'swordsman'
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
  const jobId = sanitizeSafePresenceId(docData.jobId, 'swordsman', 32)
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
  const posChanged = !sameMapExisting || Math.hypot(x - sameMapExisting.x, y - sameMapExisting.y) >= 0.05

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
    previousX: sameMapExisting ? (posChanged ? sameMapExisting.x : (sameMapExisting.previousX ?? sameMapExisting.x)) : x,
    previousY: sameMapExisting ? (posChanged ? sameMapExisting.y : (sameMapExisting.previousY ?? sameMapExisting.y)) : y,
    receivedAt: posChanged ? nowMs : (sameMapExisting?.receivedAt ?? nowMs),
  }
}

export function mergeRemotePlayerSnapshots<T extends RemotePlayerSnapshot>(
  previousList: readonly T[],
  incomingList: readonly T[],
  nowMs: number = Date.now(),
): T[] {
  const prevById = new Map<string, T>()
  for (const entry of previousList) {
    prevById.set(entry.userId, entry)
  }

  return incomingList.map((snap) => {
    const prev = prevById.get(snap.userId)
    const sameMap = Boolean(prev && prev.mapId === snap.mapId)
    const prevRenderX = prev ? (prev.renderX ?? prev.x) : snap.x
    const prevRenderY = prev ? (prev.renderY ?? prev.y) : snap.y
    const warpReset = !sameMap || Math.hypot(snap.x - prevRenderX, snap.y - prevRenderY) > 160

    if (warpReset || !prev) {
      return {
        ...snap,
        renderX: snap.x,
        renderY: snap.y,
        vx: 0,
        vy: 0,
        renderMoving: snap.moving,
        localWalkT: 0,
        localAttackAnim: snap.attackAnim,
        lastNetX: snap.x,
        lastNetY: snap.y,
        lastNetAt: nowMs,
      }
    }

    const prevNetX = prev.lastNetX ?? prev.x
    const prevNetY = prev.lastNetY ?? prev.y
    const netDx = snap.x - prevNetX
    const netDy = snap.y - prevNetY
    const netDist = Math.hypot(netDx, netDy)

    let vx = prev.vx ?? 0
    let vy = prev.vy ?? 0
    let lastNetX = prevNetX
    let lastNetY = prevNetY
    let lastNetAt = prev.lastNetAt ?? nowMs

    if (netDist >= 0.25) {
      const dtNet = Math.max(0.05, Math.min(0.6, (nowMs - lastNetAt) / 1000))
      vx = netDx / dtNet
      vy = netDy / dtNet
      const spd = Math.hypot(vx, vy)
      if (spd > 260) {
        const scale = 260 / spd
        vx *= scale
        vy *= scale
      }
      lastNetX = snap.x
      lastNetY = snap.y
      lastNetAt = nowMs
    } else if (!snap.moving) {
      vx = 0
      vy = 0
    }

    const attackRestarted =
      snap.attackAnim > 0 &&
      ((prev.attackAnim ?? 0) <= 0.02 ||
        snap.attackAnim > (prev.attackAnim ?? 0) + 0.05 ||
        (snap.receivedAt !== prev.receivedAt && snap.attackAnim >= 0.18 && (prev.localAttackAnim ?? 0) <= 0.04))

    return {
      ...snap,
      renderX: prevRenderX,
      renderY: prevRenderY,
      vx,
      vy,
      renderMoving: prev.renderMoving ?? snap.moving,
      localWalkT: prev.localWalkT ?? 0,
      localAttackAnim: attackRestarted ? snap.attackAnim : (prev.localAttackAnim ?? snap.attackAnim),
      lastNetX,
      lastNetY,
      lastNetAt,
    }
  })
}

export function stepRemotePlayers<T extends RemotePlayerSnapshot>(
  players: T[],
  dt: number,
  nowMs: number = Date.now(),
): void {
  if (dt <= 0 || players.length === 0) return

  for (const other of players) {
    let rx = other.renderX ?? other.x
    let ry = other.renderY ?? other.y
    const prevRx = rx
    const prevRy = ry
    const dx = other.x - rx
    const dy = other.y - ry
    const dist = Math.hypot(dx, dy)

    if (dist > 160) {
      rx = other.x
      ry = other.y
    } else if (dist > 0.25) {
      const speedHint = Math.hypot(other.vx ?? 0, other.vy ?? 0)
      let chaseSpeed: number
      if (other.moving && speedHint > 5) {
        const targetLag = Math.min(10, speedHint * 0.08)
        chaseSpeed = Math.max(speedHint * 0.72, Math.min(260, speedHint + (dist - targetLag) * 5))
      } else {
        chaseSpeed = Math.max(60, Math.min(240, dist * 10))
      }
      const step = Math.min(dist, chaseSpeed * dt)
      rx += (dx / dist) * step
      ry += (dy / dist) * step
      if (Math.hypot(other.x - rx, other.y - ry) <= 0.25) {
        rx = other.x
        ry = other.y
      }
    } else {
      rx = other.x
      ry = other.y
    }

    const visualMoved = Math.hypot(rx - prevRx, ry - prevRy)
    const netAgeMs = nowMs - (other.lastNetAt ?? nowMs)
    const isMovingVisually = visualMoved > 0.05 || (other.moving && netAgeMs < 350 && dist > 0.1)

    other.renderX = rx
    other.renderY = ry
    other.renderMoving = isMovingVisually
    if (isMovingVisually) {
      other.localWalkT = (other.localWalkT ?? 0) + dt
    }
    other.localAttackAnim = Math.max(0, (other.localAttackAnim ?? 0) - dt)
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
