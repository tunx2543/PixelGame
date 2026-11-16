export interface ScreenShakeTriggerInput {
  damage: number
  enemyMaxHp: number
  isCrit: boolean
  skillMultiplier?: number
}

export interface ScreenShakeEvent {
  id: number
  intensity: number // 0..1 trauma level
  durationMs: number
  isCrit: boolean
  reason: 'crit' | 'high-damage'
  startedAt: number
}

export interface ScreenShakeDecision {
  shouldShake: boolean
  intensity: number
  durationMs: number
  reason: 'crit' | 'high-damage' | 'none'
}

export interface ScreenShakeFrame {
  active: boolean
  dx: number
  dy: number
  rotDeg: number
  flashAlpha: number
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

/**
 * Determines whether an attack should trigger arena screen shake.
 * Triggers on all critical hits and on high-damage attacks (heavy skills or
 * attacks dealing a large share of the enemy's HP).
 */
export function evaluateAttackShake(input: ScreenShakeTriggerInput): ScreenShakeDecision {
  const damage = Number.isFinite(input.damage) ? Math.max(0, input.damage) : 0
  const maxHp = Math.max(1, Number.isFinite(input.enemyMaxHp) ? input.enemyMaxHp : 1)
  const mult = Number.isFinite(input.skillMultiplier) ? Math.max(1, input.skillMultiplier!) : 1
  const hpRatio = damage / maxHp

  if (input.isCrit) {
    const bonus = (mult >= 1.4 ? 0.14 : 0) + (hpRatio >= 0.35 ? 0.1 : 0)
    const intensity = clamp01(0.76 + bonus)
    return {
      shouldShake: true,
      intensity,
      durationMs: Math.round(320 + intensity * 80),
      reason: 'crit',
    }
  }

  const isHeavySkill = mult >= 1.4 && damage > 0
  const isHighAbsDamage = damage >= 50 && hpRatio >= 0.25
  const isDevastatingHit = hpRatio >= 0.65 && damage >= 18

  if (isHeavySkill || isHighAbsDamage || isDevastatingHit) {
    const ratioBoost = clamp01((hpRatio - 0.2) * 0.45)
    const multBoost = clamp01((mult - 1.4) * 0.25)
    const intensity = clamp01(0.55 + Math.max(ratioBoost, multBoost))
    return {
      shouldShake: true,
      intensity,
      durationMs: Math.round(240 + intensity * 100),
      reason: 'high-damage',
    }
  }

  return {
    shouldShake: false,
    intensity: 0,
    durationMs: 0,
    reason: 'none',
  }
}

/**
 * Computes damped trauma^2 screen-shake translation and rotation at timestamp `now`.
 */
export function computeShakeFrame(
  event: Pick<ScreenShakeEvent, 'id' | 'intensity' | 'durationMs' | 'startedAt'> | null | undefined,
  now: number,
  maxOffsetPx = 11,
  maxRotationDeg = 1.4,
): ScreenShakeFrame {
  if (!event || event.intensity <= 0 || event.durationMs <= 0) {
    return { active: false, dx: 0, dy: 0, rotDeg: 0, flashAlpha: 0 }
  }

  const elapsed = now - event.startedAt
  if (elapsed < 0 || elapsed >= event.durationMs) {
    return { active: false, dx: 0, dy: 0, rotDeg: 0, flashAlpha: 0 }
  }

  const progress = elapsed / event.durationMs
  const remaining = 1 - progress
  const trauma = clamp01(event.intensity)
  const decay = trauma * remaining * remaining

  const seed = (event.id % 17) * 1.37
  const dx = Math.sin(elapsed * 0.11 + seed) * maxOffsetPx * decay
  const dy = Math.cos(elapsed * 0.155 + seed * 1.7) * (maxOffsetPx * 0.72) * decay
  const rotDeg = Math.sin(elapsed * 0.13 + seed * 0.5) * maxRotationDeg * decay

  const flashAlpha = elapsed < 110 ? (1 - elapsed / 110) * 0.22 * trauma : 0

  return {
    active: true,
    dx: Math.round(dx * 100) / 100,
    dy: Math.round(dy * 100) / 100,
    rotDeg: Math.round(rotDeg * 1000) / 1000,
    flashAlpha: Math.round(flashAlpha * 1000) / 1000,
  }
}
