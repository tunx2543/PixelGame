import { MAX_PET_LEVEL, MAX_PET_STARS } from './systems'

export type PetDir = 'down' | 'up' | 'left' | 'right'
export type PetAnimAction = 'idle' | 'walk' | 'run' | 'follow' | 'attack'
export type PetVisualTier = 1 | 2 | 3 | 4 | 5

export const PET_ANIM_FRAME_COUNTS: Record<PetAnimAction, number> = {
  idle: 4,
  walk: 6,
  run: 6,
  follow: 6,
  attack: 4,
}

export interface PetFollowState {
  petId: string | null
  mapId: string
  x: number
  y: number
  dir: PetDir
  action: PetAnimAction
  animT: number
  stuckT: number
  initialized: boolean
}

export const PET_SOFT_LEASH_DIST = 165
export const PET_ARRIVE_DIST = 3.5
export const PET_RUN_DIST = 42
export const PET_FOLLOW_DIST = 9.5

export function getPetVisualTier(level: number, stars = 1): PetVisualTier {
  const lv = Math.max(1, Math.min(MAX_PET_LEVEL, Math.floor(level || 1)))
  const st = Math.max(1, Math.min(MAX_PET_STARS, Math.floor(stars || 1)))
  const score = lv + (st - 1) * 4
  if (score >= 23) return 5
  if (score >= 16) return 4
  if (score >= 10) return 3
  if (score >= 5) return 2
  return 1
}

export function getPetVisualTierLabel(level: number, stars = 1): string {
  switch (getPetVisualTier(level, stars)) {
    case 5:
      return 'ระดับพิเศษ (ออร่าเทพดารา)'
    case 4:
      return 'ระดับหายาก (วงเวทอาร์เคน)'
    case 3:
      return 'ระดับสูง (ประกายทองคำ)'
    case 2:
      return 'ระดับกลาง (ออร่าปราณเรือง)'
    default:
      return 'ระดับพื้นฐาน'
  }
}

export function computePetFollowAnchor(
  playerX: number,
  playerY: number,
  playerDir: PetDir,
  isPhao = false,
  isMounted = false,
): { x: number; y: number } {
  const mountSpread = isMounted ? 5 : 0
  const phaoSpread = isPhao ? 2 : 0
  const spread = 16 + mountSpread + phaoSpread
  switch (playerDir) {
    case 'left':
      return { x: playerX + spread, y: playerY - 3 }
    case 'right':
      return { x: playerX - spread, y: playerY - 3 }
    case 'up':
      return { x: playerX - (13 + mountSpread * 0.5), y: playerY + (11 + mountSpread * 0.6) }
    case 'down':
    default:
      return { x: playerX - (14 + mountSpread * 0.5), y: playerY - (8 + mountSpread * 0.35) }
  }
}

export function createDefaultPetFollowState(params?: {
  petId?: string | null
  mapId?: string
  playerX?: number
  playerY?: number
  playerDir?: PetDir
  isPhao?: boolean
  isMounted?: boolean
}): PetFollowState {
  const petId = params?.petId ?? null
  const mapId = params?.mapId ?? 'town'
  const dir = params?.playerDir ?? 'down'
  const anchor = computePetFollowAnchor(
    params?.playerX ?? 0,
    params?.playerY ?? 0,
    dir,
    Boolean(params?.isPhao),
    Boolean(params?.isMounted),
  )
  return {
    petId,
    mapId,
    x: anchor.x,
    y: anchor.y,
    dir,
    action: 'idle',
    animT: 0,
    stuckT: 0,
    initialized: Boolean(petId),
  }
}

export function resetPetFollowToPlayer(
  state: PetFollowState,
  params: {
    petId: string | null
    mapId: string
    playerX: number
    playerY: number
    playerDir: PetDir
    isPhao?: boolean
    isMounted?: boolean
    isBlocked?: (x: number, y: number) => boolean
  },
): PetFollowState {
  const { petId, mapId, playerX, playerY, playerDir, isPhao = false, isMounted = false, isBlocked } = params
  if (!petId) {
    return {
      ...state,
      petId: null,
      mapId,
      x: playerX,
      y: playerY,
      dir: playerDir,
      action: 'idle',
      animT: 0,
      stuckT: 0,
      initialized: false,
    }
  }
  const anchor = computePetFollowAnchor(playerX, playerY, playerDir, isPhao, isMounted)
  const blocked = isBlocked ? isBlocked(anchor.x, anchor.y) : false
  return {
    petId,
    mapId,
    x: blocked ? playerX : anchor.x,
    y: blocked ? playerY : anchor.y,
    dir: playerDir,
    action: 'idle',
    animT: state.petId === petId ? state.animT : 0,
    stuckT: 0,
    initialized: true,
  }
}

export function stepPetFollow(
  state: PetFollowState,
  params: {
    dt: number
    petId: string | null
    mapId: string
    playerX: number
    playerY: number
    playerDir: PetDir
    playerMoving: boolean
    playerSpeed: number
    isPhao?: boolean
    isMounted?: boolean
    isFloating?: boolean
    petAttackAnim?: number
    isBlocked?: (x: number, y: number) => boolean
  },
): PetFollowState {
  const {
    dt,
    petId,
    mapId,
    playerX,
    playerY,
    playerDir,
    playerMoving,
    playerSpeed,
    isPhao = false,
    isMounted = false,
    isFloating = false,
    petAttackAnim = 0,
    isBlocked,
  } = params

  if (!petId) {
    if (!state.initialized && state.petId === null) return state
    return {
      petId: null,
      mapId,
      x: playerX,
      y: playerY,
      dir: playerDir,
      action: 'idle',
      animT: 0,
      stuckT: 0,
      initialized: false,
    }
  }

  if (!state.initialized || state.petId !== petId || state.mapId !== mapId) {
    return resetPetFollowToPlayer(state, {
      petId,
      mapId,
      playerX,
      playerY,
      playerDir,
      isPhao,
      isMounted,
      isBlocked,
    })
  }

  const safeDt = Math.max(0, Math.min(0.1, dt))
  const target = computePetFollowAnchor(playerX, playerY, playerDir, isPhao, isMounted)
  const dx = target.x - state.x
  const dy = target.y - state.y
  const dist = Math.hypot(dx, dy)
  const attacking = petAttackAnim > 0

  // Soft-leash recovery if too far apart or obstructed for >1s
  if (dist > PET_SOFT_LEASH_DIST || (state.stuckT > 1.0 && dist > 18)) {
    const snapped = resetPetFollowToPlayer(state, {
      petId,
      mapId,
      playerX,
      playerY,
      playerDir,
      isPhao,
      isMounted,
      isBlocked,
    })
    return {
      ...snapped,
      action: attacking ? 'attack' : 'follow',
      animT: state.animT + safeDt,
    }
  }

  if (dist <= PET_ARRIVE_DIST) {
    return {
      ...state,
      dir: playerDir,
      action: attacking ? 'attack' : playerMoving ? 'follow' : 'idle',
      animT: state.animT + safeDt,
      stuckT: 0,
    }
  }

  const baseSpeed = Math.max(48, playerSpeed * 0.98)
  const catchUpMul =
    dist > PET_RUN_DIST
      ? 1.48 + Math.min(0.85, (dist - PET_RUN_DIST) / 60)
      : isMounted && dist > 14
        ? 1.32
        : dist > 18
          ? 1.16
          : 1.0
  const speed = Math.max(baseSpeed, playerSpeed * catchUpMul)
  const stepDist = Math.min(dist, speed * safeDt)
  const mx = (dx / dist) * stepDist
  const my = (dy / dist) * stepDist

  let nextX = state.x
  let nextY = state.y
  let moved = 0

  const phasingThrough = Boolean(isBlocked && !isFloating && state.stuckT > 0.32)
  const canPassFreely = !isBlocked || isFloating || phasingThrough
  if (canPassFreely) {
    nextX += mx
    nextY += my
    moved = stepDist
  } else {
    if (!isBlocked(nextX + mx, nextY)) {
      nextX += mx
      moved += Math.abs(mx)
    }
    if (!isBlocked(nextX, nextY + my)) {
      nextY += my
      moved += Math.abs(my)
    }
  }

  const blockedStep = moved < stepDist * 0.25 && dist > PET_ARRIVE_DIST
  const stillInsideObstacle = Boolean(phasingThrough && isBlocked && isBlocked(nextX, nextY))
  const nextStuckT = blockedStep
    ? state.stuckT + safeDt
    : stillInsideObstacle
      ? Math.max(0.35, state.stuckT)
      : Math.max(0, state.stuckT - safeDt * 2)

  let nextDir = state.dir
  if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) {
    nextDir =
      Math.abs(dx) >= Math.abs(dy)
        ? dx < 0
          ? 'left'
          : 'right'
        : dy < 0
          ? 'up'
          : 'down'
  } else {
    nextDir = playerDir
  }

  const nextAction: PetAnimAction = attacking
    ? 'attack'
    : dist >= PET_RUN_DIST || (isMounted && playerMoving && dist > 16)
      ? 'run'
      : playerMoving || dist > PET_FOLLOW_DIST
        ? 'follow'
        : 'walk'

  return {
    ...state,
    x: nextX,
    y: nextY,
    dir: nextDir,
    action: nextAction,
    animT: state.animT + safeDt,
    stuckT: nextStuckT,
    initialized: true,
  }
}

export function resolvePetAnimationFrame(action: PetAnimAction, animT: number, attackRemaining = 0): number {
  if (action === 'attack') {
    if (attackRemaining > 0) {
      const prog = Math.max(0, Math.min(0.999, 1 - attackRemaining / 0.45))
      return Math.min(3, Math.floor(prog * 4))
    }
    return Math.floor(animT * 9) % PET_ANIM_FRAME_COUNTS.attack
  }
  if (action === 'run') {
    return Math.floor(animT * 12) % PET_ANIM_FRAME_COUNTS.run
  }
  if (action === 'follow') {
    return Math.floor(animT * 9.5) % PET_ANIM_FRAME_COUNTS.follow
  }
  if (action === 'walk') {
    return Math.floor(animT * 8) % PET_ANIM_FRAME_COUNTS.walk
  }
  return Math.floor(animT * 2.8) % PET_ANIM_FRAME_COUNTS.idle
}
