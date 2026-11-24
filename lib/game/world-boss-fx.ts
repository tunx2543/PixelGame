export type WorldBossMapAttackVariant = 'slam' | 'beam'

export interface WorldBossMapFxState {
  id: number
  startedAt: number
  duration: number
  intensity: number
  variant: WorldBossMapAttackVariant
  originX: number
  originY: number
}

export interface WorldBossOverlayParticle {
  x: number
  y: number
  angle: number
  size: number
  streakLen: number
  color: string
  alpha: number
  kind: 'beam' | 'spark' | 'shard' | 'ember'
}

export interface WorldBossMapFxFrame {
  active: boolean
  variant: WorldBossMapAttackVariant
  progress: number
  decay: number
  shakeX: number
  shakeY: number
  flashAlpha: number
  flashColor: string
  vignetteAlpha: number
  vignetteColor: string
  ringAlpha: number
  ringProgress: number
  ringColor: string
  particles: WorldBossOverlayParticle[]
}

export interface EvaluateWorldBossMapFxOptions {
  reduceParticles?: boolean
  disableShake?: boolean
  dpr?: number
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

export function createWorldBossMapFx(
  id: number,
  startedAt: number,
  variant: WorldBossMapAttackVariant,
  originX: number,
  originY: number,
): WorldBossMapFxState {
  return {
    id,
    startedAt,
    duration: variant === 'beam' ? 1.25 : 1.15,
    intensity: variant === 'beam' ? 7.5 : 9.5,
    variant,
    originX,
    originY,
  }
}

export function evaluateWorldBossMapFx(
  fx: WorldBossMapFxState | null | undefined,
  now: number,
  viewportW: number,
  viewportH: number,
  options?: EvaluateWorldBossMapFxOptions,
): WorldBossMapFxFrame {
  const variant: WorldBossMapAttackVariant = fx?.variant ?? 'slam'
  if (!fx || fx.duration <= 0 || fx.intensity <= 0 || !Number.isFinite(now)) {
    return {
      active: false,
      variant,
      progress: 0,
      decay: 0,
      shakeX: 0,
      shakeY: 0,
      flashAlpha: 0,
      flashColor: '#f97316',
      vignetteAlpha: 0,
      vignetteColor: '#dc2626',
      ringAlpha: 0,
      ringProgress: 0,
      ringColor: '#fb923c',
      particles: [],
    }
  }

  const elapsed = now - fx.startedAt
  if (elapsed < 0 || elapsed >= fx.duration) {
    return {
      active: false,
      variant,
      progress: 0,
      decay: 0,
      shakeX: 0,
      shakeY: 0,
      flashAlpha: 0,
      flashColor: variant === 'beam' ? '#fef08a' : '#fb923c',
      vignetteAlpha: 0,
      vignetteColor: variant === 'beam' ? '#ea580c' : '#dc2626',
      ringAlpha: 0,
      ringProgress: 0,
      ringColor: variant === 'beam' ? '#fde047' : '#f97316',
      particles: [],
    }
  }

  const progress = clamp01(elapsed / fx.duration)
  const remaining = 1 - progress
  const decay = remaining * remaining
  const dpr = Math.max(1, options?.dpr ?? 1)
  const reduceParticles = Boolean(options?.reduceParticles)
  const disableShake = Boolean(options?.disableShake)

  const seed = (fx.id % 29) * 1.47
  const shakeScale = disableShake ? 0 : reduceParticles ? 0.5 : 1
  const rawShakeX =
    shakeScale === 0 ? 0 : Math.round(Math.sin(elapsed * 58 + seed) * fx.intensity * decay * shakeScale * 1000) / 1000
  const rawShakeY =
    shakeScale === 0
      ? 0
      : Math.round(Math.cos(elapsed * 73 + seed * 1.6) * fx.intensity * 0.82 * decay * shakeScale * 1000) / 1000
  const shakeX = rawShakeX === 0 ? 0 : rawShakeX
  const shakeY = rawShakeY === 0 ? 0 : rawShakeY

  const flashDuration = variant === 'beam' ? 0.24 : 0.2
  const flashAlpha =
    elapsed < flashDuration
      ? (1 - elapsed / flashDuration) * (variant === 'beam' ? 0.34 : 0.3) * (reduceParticles ? 0.55 : 1)
      : 0

  const vignetteAlpha =
    (variant === 'beam'
      ? 0.34 * remaining * (0.72 + 0.28 * Math.sin(elapsed * 24))
      : 0.42 * decay) * (reduceParticles ? 0.65 : 1)

  const ringAlpha = Math.max(0, 0.72 * remaining * (reduceParticles ? 0.6 : 1))
  const vw = Math.max(1, viewportW)
  const vh = Math.max(1, viewportH)
  const cx = vw * 0.5
  const cy = vh * 0.5
  const maxDist = Math.hypot(cx, cy)

  const count = reduceParticles ? 16 : 56
  const particles: WorldBossOverlayParticle[] = []

  for (let i = 0; i < count; i++) {
    const r0 = hash01(fx.id * 131 + i * 17.3 + 1)
    const r1 = hash01(fx.id * 197 + i * 29.7 + 2)
    const r2 = hash01(fx.id * 251 + i * 41.1 + 3)
    const r3 = hash01(fx.id * 307 + i * 53.9 + 4)

    if (variant === 'beam') {
      if (i % 2 === 0) {
        const x = r0 * vw
        const speed = 0.85 + r1 * 0.8
        const fall = (r2 * 0.25 + progress * speed) % 1.2
        const y = (fall - 0.1) * vh
        const angle = Math.PI * 0.5 + (r3 - 0.5) * 0.18
        particles.push({
          x,
          y,
          angle,
          size: (2 + r1 * 2.2) * dpr,
          streakLen: (26 + r2 * 44) * dpr,
          color: i % 4 === 0 ? '#fef08a' : '#fb923c',
          alpha: Math.max(0, Math.min(0.92, (0.55 + r3 * 0.35) * remaining)),
          kind: 'beam',
        })
      } else {
        const x = ((r0 + (r3 - 0.5) * 0.14 * progress) * vw + vw) % vw
        const y = ((1 - (r1 * 0.35 + progress * (0.7 + r2 * 0.6)) % 1.15) * vh + vh) % vh
        particles.push({
          x,
          y,
          angle: -Math.PI * 0.5 + (r3 - 0.5) * 0.4,
          size: (2 + r2 * 3) * dpr,
          streakLen: (10 + r1 * 14) * dpr,
          color: i % 3 === 1 ? '#fde047' : '#f97316',
          alpha: Math.max(0, Math.min(0.9, (0.45 + r1 * 0.45) * (0.35 + 0.65 * remaining))),
          kind: 'spark',
        })
      }
    } else {
      if (i % 2 === 0) {
        const angle = (i / Math.max(1, count * 0.5)) * Math.PI * 2 + (r0 - 0.5) * 0.35
        const travel = (0.08 + progress * (0.65 + r1 * 0.55)) * maxDist
        const x = cx + Math.cos(angle) * travel
        const y = cy + Math.sin(angle) * travel
        particles.push({
          x,
          y,
          angle,
          size: (2.6 + r2 * 3.2) * dpr,
          streakLen: (18 + r1 * 32) * dpr,
          color: i % 4 === 0 ? '#fca5a5' : '#f97316',
          alpha: Math.max(0, Math.min(0.92, (0.55 + r3 * 0.35) * remaining)),
          kind: 'shard',
        })
      } else {
        const x = ((r0 * vw + Math.sin(elapsed * 7 + i) * 16 * dpr) % vw + vw) % vw
        const rise = (r1 * 0.55 + progress * (0.55 + r2 * 0.5)) % 1.1
        const y = vh - rise * vh
        particles.push({
          x,
          y,
          angle: -Math.PI * 0.5 + (r3 - 0.5) * 0.5,
          size: (2.2 + r2 * 2.8) * dpr,
          streakLen: (8 + r1 * 12) * dpr,
          color: i % 3 === 0 ? '#fde047' : '#ef4444',
          alpha: Math.max(0, Math.min(0.88, (0.5 + r2 * 0.4) * (0.3 + 0.7 * remaining))),
          kind: 'ember',
        })
      }
    }
  }

  return {
    active: true,
    variant,
    progress,
    decay,
    shakeX,
    shakeY,
    flashAlpha,
    flashColor: variant === 'beam' ? '#fef08a' : '#fb923c',
    vignetteAlpha,
    vignetteColor: variant === 'beam' ? '#ea580c' : '#dc2626',
    ringAlpha,
    ringProgress: progress,
    ringColor: variant === 'beam' ? '#fde047' : '#f97316',
    particles,
  }
}

export const WORLD_BOSS_WARNING_LEAD_SEC = 1.5

export interface WorldBossWarningState {
  remainingSec: number
  bossName: string
  originX: number
  originY: number
}

export interface WorldBossWarningFrame {
  active: boolean
  remainingSec: number
  progress: number
  pulseAlpha: number
  borderAlpha: number
  borderColor: string
  glowColor: string
  ringRadiusMul: number
}

export interface EvaluateWorldBossWarningOptions {
  reduceParticles?: boolean
}

export function evaluateWorldBossWarning(
  warning: Pick<WorldBossWarningState, 'remainingSec'> | null | undefined,
  now: number,
  options?: EvaluateWorldBossWarningOptions,
): WorldBossWarningFrame {
  const remainingSec = warning?.remainingSec ?? 0
  if (!warning || !Number.isFinite(remainingSec) || remainingSec <= 0 || remainingSec > WORLD_BOSS_WARNING_LEAD_SEC) {
    return {
      active: false,
      remainingSec: 0,
      progress: 0,
      pulseAlpha: 0,
      borderAlpha: 0,
      borderColor: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0)',
      ringRadiusMul: 1,
    }
  }

  const progress = clamp01((WORLD_BOSS_WARNING_LEAD_SEC - remainingSec) / WORLD_BOSS_WARNING_LEAD_SEC)
  const t = Number.isFinite(now) ? now : 0
  const pulseWave = 0.5 + 0.5 * Math.sin(t * (7 + progress * 9))
  const scale = options?.reduceParticles ? 0.65 : 1
  const pulseAlpha = Math.round((0.06 + (0.1 + progress * 0.1) * pulseWave) * scale * 1000) / 1000
  const borderAlpha = Math.round((0.2 + (0.24 + progress * 0.16) * pulseWave) * scale * 1000) / 1000
  const urgent = progress >= 0.6
  const borderColor = urgent ? '#ef4444' : '#f59e0b'
  const glowColor = urgent ? 'rgba(239, 68, 68, 0.36)' : 'rgba(245, 158, 11, 0.32)'
  const ringRadiusMul = 1.25 - progress * 0.55

  return {
    active: true,
    remainingSec: Math.round(remainingSec * 100) / 100,
    progress,
    pulseAlpha,
    borderAlpha,
    borderColor,
    glowColor,
    ringRadiusMul,
  }
}

export interface WorldBossVictoryState {
  id: number
  bossName: string
  gold: number
  diamonds: number
  exp: number
  triggeredAtMs: number
}

export interface VictoryCoinParticle {
  id: number
  leftPct: number
  delaySec: number
  durationSec: number
  swayPx: number
  sizePx: number
  spinTurns: number
  opacity: number
}

export function buildVictoryCoinParticles(seed: number, count = 36): VictoryCoinParticle[] {
  const safeCount = Math.max(0, Math.min(80, Math.floor(count)))
  const coins: VictoryCoinParticle[] = []
  for (let i = 0; i < safeCount; i++) {
    const r0 = hash01(seed * 97 + i * 19.1 + 1)
    const r1 = hash01(seed * 151 + i * 31.7 + 2)
    const r2 = hash01(seed * 211 + i * 43.3 + 3)
    const r3 = hash01(seed * 271 + i * 59.9 + 4)
    coins.push({
      id: i,
      leftPct: Math.round((3 + r0 * 94) * 100) / 100,
      delaySec: Math.round(r1 * 1.45 * 100) / 100,
      durationSec: Math.round((2.0 + r2 * 1.55) * 100) / 100,
      swayPx: Math.round(((r3 - 0.5) * 44) * 10) / 10,
      sizePx: Math.round(16 + r2 * 12),
      spinTurns: r3 >= 0.5 ? 2 : -2,
      opacity: Math.round((0.8 + r1 * 0.2) * 100) / 100,
    })
  }
  return coins
}

export interface GlobalWorldBossHpInput {
  liveMapBoss?: {
    uid: string
    name: string
    level: number
    element: string
    hp: number
    maxHp: number
    isTestMode?: boolean
  } | null
  activeEventSpec: {
    cycleKey: string
    name: string
    level: number
    element: string
    maxHp: number
    isActive: boolean
    isTestMode: boolean
    endsAtMs: number
  }
  globalRaid?: {
    cycleKey: string
    name: string
    hp: number
    maxHp: number
  } | null
  currentMapId?: string
  defeatedOnCurrentMap?: boolean
}

export interface GlobalWorldBossHpView {
  visible: boolean
  key: string
  bossName: string
  level: number
  element: string
  hp: number
  maxHp: number
  ratio: number
  percentText: string
  isTestMode: boolean
  isLocalEncounter: boolean
  endsAtMs: number
}

export function resolveGlobalWorldBossHpBar(input: GlobalWorldBossHpInput): GlobalWorldBossHpView | null {
  if (input.liveMapBoss && input.liveMapBoss.hp > 0) {
    const maxHp = Math.max(1, Math.round(input.liveMapBoss.maxHp))
    const hp = Math.max(0, Math.min(maxHp, Math.round(input.liveMapBoss.hp)))
    const ratio = clamp01(hp / maxHp)
    return {
      visible: true,
      key: `local:${input.liveMapBoss.uid}`,
      bossName: input.liveMapBoss.name,
      level: input.liveMapBoss.level,
      element: input.liveMapBoss.element,
      hp,
      maxHp,
      ratio,
      percentText: `${(ratio * 100).toFixed(ratio >= 0.995 || ratio <= 0.005 ? 0 : 1)}%`,
      isTestMode: Boolean(input.liveMapBoss.isTestMode ?? input.activeEventSpec.isTestMode),
      isLocalEncounter: true,
      endsAtMs: input.activeEventSpec.endsAtMs,
    }
  }

  if (input.currentMapId === 'world' && input.defeatedOnCurrentMap) {
    return null
  }

  if (!input.activeEventSpec.isActive) {
    return null
  }

  const raidMatches = input.globalRaid && input.globalRaid.cycleKey === input.activeEventSpec.cycleKey
  const maxHp = Math.max(1, Math.round(raidMatches ? input.globalRaid!.maxHp : input.activeEventSpec.maxHp))
  const hp = Math.max(0, Math.min(maxHp, Math.round(raidMatches ? input.globalRaid!.hp : input.activeEventSpec.maxHp)))
  if (hp <= 0) {
    return null
  }
  const ratio = clamp01(hp / maxHp)

  return {
    visible: true,
    key: `global:${input.activeEventSpec.cycleKey}`,
    bossName: raidMatches ? input.globalRaid!.name : input.activeEventSpec.name,
    level: input.activeEventSpec.level,
    element: input.activeEventSpec.element,
    hp,
    maxHp,
    ratio,
    percentText: `${(ratio * 100).toFixed(ratio >= 0.995 || ratio <= 0.005 ? 0 : 1)}%`,
    isTestMode: input.activeEventSpec.isTestMode,
    isLocalEncounter: false,
    endsAtMs: input.activeEventSpec.endsAtMs,
  }
}

export const WORLD_BOSS_ENTRANCE_DURATION_MS = 2750
export const WORLD_BOSS_DEFAULT_SPRITE_URL = '/assets/world-boss/mech_golem/rotations/south.png'

export interface WorldBossEntranceState {
  id: number
  bossName: string
  level: number
  element: string
  spriteUrl: string
  isTestMode: boolean
  triggeredAtMs: number
}

export interface EntranceLightningBolt {
  id: number
  points: string
  delaySec: number
  durationSec: number
  strokeWidth: number
  isMain: boolean
  opacity: number
}

export interface EntranceSparkParticle {
  id: number
  endX: number
  endY: number
  sizePx: number
  delaySec: number
  durationSec: number
  color: string
}

export function buildEntranceLightningBolts(seed: number, count = 5): EntranceLightningBolt[] {
  const safeCount = Math.max(1, Math.min(10, Math.floor(count)))
  const bolts: EntranceLightningBolt[] = []

  for (let b = 0; b < safeCount; b++) {
    const isMain = b === 0
    const startX = isMain ? 200 : 90 + hash01(seed * 71 + b * 23.1) * 220
    const startY = isMain ? 0 : Math.round(hash01(seed * 83 + b * 17.7) * 90)
    const endY = isMain ? 430 : 320 + Math.round(hash01(seed * 97 + b * 31.3) * 180)
    const segments = isMain ? 10 : 7
    const spread = isMain ? 28 : 42
    const pts: string[] = [`${startX.toFixed(1)},${startY.toFixed(1)}`]

    let curX = startX
    for (let s = 1; s < segments; s++) {
      const t = s / segments
      const y = startY + (endY - startY) * t
      const jitter = (hash01(seed * 149 + b * 41 + s * 13.7) - 0.5) * 2 * spread
      curX = Math.max(16, Math.min(384, (isMain ? 200 : curX) + jitter))
      pts.push(`${curX.toFixed(1)},${y.toFixed(1)}`)
    }
    const targetX = isMain ? 200 : Math.max(24, Math.min(376, curX + (hash01(seed * 193 + b * 7) - 0.5) * 44))
    pts.push(`${targetX.toFixed(1)},${endY.toFixed(1)}`)

    bolts.push({
      id: b,
      points: pts.join(' '),
      delaySec: isMain ? 0.04 : Math.round((0.08 + hash01(seed * 211 + b * 19) * 0.28) * 100) / 100,
      durationSec: isMain ? 0.42 : Math.round((0.28 + hash01(seed * 233 + b * 29) * 0.16) * 100) / 100,
      strokeWidth: isMain ? 4.5 : Math.round((2 + hash01(seed * 257 + b * 11) * 1.6) * 10) / 10,
      isMain,
      opacity: isMain ? 1 : Math.round((0.68 + hash01(seed * 271 + b * 37) * 0.26) * 100) / 100,
    })
  }

  return bolts
}

export function buildEntranceSparks(seed: number, count = 24): EntranceSparkParticle[] {
  const safeCount = Math.max(0, Math.min(48, Math.floor(count)))
  const sparks: EntranceSparkParticle[] = []
  const palette = ['#e0f2fe', '#38bdf8', '#fde047', '#f59e0b']

  for (let i = 0; i < safeCount; i++) {
    const r0 = hash01(seed * 109 + i * 23.7 + 1)
    const r1 = hash01(seed * 163 + i * 37.3 + 2)
    const r2 = hash01(seed * 227 + i * 51.1 + 3)
    const angle = (i / Math.max(1, safeCount)) * Math.PI * 2 + (r0 - 0.5) * 0.32
    const dist = 75 + r1 * 185
    sparks.push({
      id: i,
      endX: Math.round(Math.cos(angle) * dist * 10) / 10,
      endY: Math.round((Math.sin(angle) * dist * 0.56 - 18) * 10) / 10,
      sizePx: Math.round(4 + r2 * 6),
      delaySec: Math.round((0.36 + r0 * 0.1) * 100) / 100,
      durationSec: Math.round((0.5 + r1 * 0.35) * 100) / 100,
      color: palette[i % palette.length] ?? '#38bdf8',
    })
  }

  return sparks
}

export interface WorldBossCritHitState {
  id: number
  isSoulCrit: boolean
  damage: number
  triggeredAtMs: number
}

export const WORLD_BOSS_CRIT_SHAKE_MS = 460

export function isWorldBossCritHitActive(
  critHit: WorldBossCritHitState | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!critHit || critHit.id <= 0) return false
  const elapsed = nowMs - critHit.triggeredAtMs
  return elapsed >= 0 && elapsed < WORLD_BOSS_CRIT_SHAKE_MS
}


