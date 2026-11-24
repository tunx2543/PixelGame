export interface JoystickVector {
  x: number
  y: number
  magnitude: number
  active: boolean
  knobX: number
  knobY: number
}

export function computeJoystickVector(
  dx: number,
  dy: number,
  maxRadius = 42,
  deadZone = 6,
): JoystickVector {
  const safeRadius = Math.max(12, maxRadius)
  const dist = Math.hypot(dx, dy)
  if (!Number.isFinite(dist) || dist <= deadZone) {
    return { x: 0, y: 0, magnitude: 0, active: false, knobX: 0, knobY: 0 }
  }
  const clampedDist = Math.min(safeRadius, dist)
  const ux = dx / dist
  const uy = dy / dist
  const effectiveMag = Math.max(0, Math.min(1, (clampedDist - deadZone) / Math.max(1, safeRadius - deadZone)))
  return {
    x: ux * effectiveMag,
    y: uy * effectiveMag,
    magnitude: effectiveMag,
    active: true,
    knobX: ux * clampedDist,
    knobY: uy * clampedDist,
  }
}

export interface TapWorldNpc {
  id: string
  x: number
  y: number
}

export interface TapWorldDrop {
  uid: string
  itemId: string
  x: number
  y: number
  ownerId: string
}

export interface TapWorldMonster {
  uid: string
  x: number
  y: number
  dead: boolean
  defId?: string
  isWorldBoss?: boolean
}

export interface TapWorldRemote {
  userId: string
  x: number
  y: number
  invisible?: boolean
  mapId?: string
}

export type CanvasTapResult<
  TNpc extends TapWorldNpc = TapWorldNpc,
  TDrop extends TapWorldDrop = TapWorldDrop,
  TMonster extends TapWorldMonster = TapWorldMonster,
  TRemote extends TapWorldRemote = TapWorldRemote,
> =
  | { kind: 'npc'; npc: TNpc; worldX: number; worldY: number }
  | { kind: 'drop'; drop: TDrop; worldX: number; worldY: number }
  | { kind: 'monster'; monster: TMonster; worldX: number; worldY: number }
  | { kind: 'remote'; remote: TRemote; worldX: number; worldY: number }
  | { kind: 'walk'; worldX: number; worldY: number }

export function resolveCanvasTapAction<
  TNpc extends TapWorldNpc,
  TDrop extends TapWorldDrop,
  TMonster extends TapWorldMonster,
  TRemote extends TapWorldRemote,
>(
  worldX: number,
  worldY: number,
  params: {
    tileSize: number
    playerMapId: string
    playerOwnerId: string
    npcs: readonly TNpc[]
    groundDrops: readonly TDrop[]
    monsters: readonly TMonster[]
    remotePlayers: readonly TRemote[]
  },
): CanvasTapResult<TNpc, TDrop, TMonster, TRemote> {
  const { tileSize, playerMapId, playerOwnerId, npcs, groundDrops, monsters, remotePlayers } = params

  let bestNpc: TNpc | null = null
  let bestNpcScore = Infinity
  for (const n of npcs) {
    const fx = n.x * tileSize
    const fy = n.y * tileSize + 8
    const within = worldX >= fx - 22 && worldX <= fx + 22 && worldY >= fy - 58 && worldY <= fy + 14
    if (!within) continue
    const score = Math.hypot(worldX - fx, worldY - (fy - 16))
    if (score < bestNpcScore) {
      bestNpcScore = score
      bestNpc = n
    }
  }
  if (bestNpc) {
    return {
      kind: 'npc',
      npc: bestNpc,
      worldX: bestNpc.x * tileSize,
      worldY: bestNpc.y * tileSize + 8,
    }
  }

  let bestDrop: TDrop | null = null
  let bestDropScore = Infinity
  for (const drop of groundDrops) {
    if (drop.ownerId !== playerOwnerId) continue
    const within =
      worldX >= drop.x - 18 && worldX <= drop.x + 18 && worldY >= drop.y - 28 && worldY <= drop.y + 14
    if (!within) continue
    const score = Math.hypot(worldX - drop.x, worldY - (drop.y - 6))
    if (score < bestDropScore) {
      bestDropScore = score
      bestDrop = drop
    }
  }
  if (bestDrop) {
    return {
      kind: 'drop',
      drop: bestDrop,
      worldX: bestDrop.x,
      worldY: bestDrop.y,
    }
  }

  let bestMonster: TMonster | null = null
  let bestMonsterScore = Infinity
  for (const m of monsters) {
    if (m.dead) continue
    const isLargeWorldBoss = Boolean(m.isWorldBoss || m.defId === 'world_golem')
    const halfW = isLargeWorldBoss ? 54 : 22
    const topH = isLargeWorldBoss ? 126 : 44
    const botH = isLargeWorldBoss ? 18 : 14
    const within = worldX >= m.x - halfW && worldX <= m.x + halfW && worldY >= m.y - topH && worldY <= m.y + botH
    if (!within) continue
    const score = Math.hypot(worldX - m.x, worldY - (m.y - (isLargeWorldBoss ? 48 : 12)))
    if (score < bestMonsterScore) {
      bestMonsterScore = score
      bestMonster = m
    }
  }
  if (bestMonster) {
    return {
      kind: 'monster',
      monster: bestMonster,
      worldX: bestMonster.x,
      worldY: bestMonster.y,
    }
  }

  let bestRemote: TRemote | null = null
  let bestRemoteScore = Infinity
  for (const other of remotePlayers) {
    if (other.invisible || (other.mapId && other.mapId !== playerMapId)) continue
    const within =
      worldX >= other.x - 20 && worldX <= other.x + 20 && worldY >= other.y - 52 && worldY <= other.y + 12
    if (!within) continue
    const score = Math.hypot(worldX - other.x, worldY - (other.y - 16))
    if (score < bestRemoteScore) {
      bestRemoteScore = score
      bestRemote = other
    }
  }
  if (bestRemote) {
    return {
      kind: 'remote',
      remote: bestRemote,
      worldX: bestRemote.x,
      worldY: bestRemote.y,
    }
  }

  return { kind: 'walk', worldX, worldY }
}
