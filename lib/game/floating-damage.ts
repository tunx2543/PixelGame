export type FloatingPopupTarget = 'player' | 'enemy'

export type FloatingPopupKind =
  | 'damage'
  | 'crit'
  | 'soulCrit'
  | 'skill'
  | 'pet'
  | 'heal'
  | 'incoming'
  | 'miss'
  | 'block'

export interface FloatingDamagePopup {
  id: number
  target: FloatingPopupTarget
  kind: FloatingPopupKind
  amount: number
  text: string
  badge?: string
  color: string
  outlineColor: string
  crit: boolean
  soulCrit: boolean
  offsetX: number
  offsetY: number
  arcX: number
  createdAt: number
  durationMs: number
}

export interface CreateFloatingPopupInput {
  id: number
  target: FloatingPopupTarget
  kind: FloatingPopupKind
  amount: number
  color?: string
  now: number
  activePopups?: readonly FloatingDamagePopup[]
  badge?: string
  prefix?: string
  suffix?: string
}

const HORIZONTAL_SLOTS = [0, -26, 26, -15, 15, -36, 36] as const
const VERTICAL_SLOTS = [0, -9, -5, -16, -12, -20, -14] as const
const ARC_DRIFTS = [4, -14, 14, -9, 9, -18, 18] as const

export const DEFAULT_POPUP_DURATION_MS = 960
export const CRIT_POPUP_DURATION_MS = 1220
export const SOUL_CRIT_POPUP_DURATION_MS = 1360

export const POPUP_PALETTE: Record<
  FloatingPopupKind,
  { color: string; outlineColor: string; defaultBadge?: string }
> = {
  damage: { color: '#f8fafc', outlineColor: '#0e1320' },
  crit: { color: '#fde047', outlineColor: '#451a03', defaultBadge: 'CRITICAL!' },
  soulCrit: { color: '#67e8f9', outlineColor: '#1e1b4b', defaultBadge: 'SOUL CRIT!' },
  skill: { color: '#fb923c', outlineColor: '#2d0f05', defaultBadge: 'SKILL!' },
  pet: { color: '#c4b5fd', outlineColor: '#1e1038' },
  heal: { color: '#4ade80', outlineColor: '#052e16', defaultBadge: 'HEAL' },
  incoming: { color: '#f87171', outlineColor: '#450a0a' },
  miss: { color: '#cbd5e1', outlineColor: '#0f172a', defaultBadge: 'DODGE' },
  block: { color: '#60a5fa', outlineColor: '#0c1b33', defaultBadge: 'GUARD' },
}

/**
 * Formats an exact integer damage/healing value without K/M abbreviation.
 */
export function formatExactDamage(amount: number): string {
  if (!Number.isFinite(amount)) return '0'
  return Math.max(0, Math.round(amount)).toLocaleString('en-US')
}

/**
 * Produces deterministic staggered offsets so rapid multi-hits (skills, pets, attacks)
 * fan out over the target instead of stacking on the same pixel.
 */
export function computePopupOffset(
  sequenceId: number,
  activeCountForTarget: number,
): { offsetX: number; offsetY: number; arcX: number } {
  const slot = Math.abs(sequenceId + activeCountForTarget) % HORIZONTAL_SLOTS.length
  return {
    offsetX: HORIZONTAL_SLOTS[slot],
    offsetY: VERTICAL_SLOTS[slot],
    arcX: ARC_DRIFTS[slot],
  }
}

export function createFloatingPopup(input: CreateFloatingPopupInput): FloatingDamagePopup {
  const safeAmount = Number.isFinite(input.amount) ? Math.max(0, Math.round(input.amount)) : 0
  const soulCrit = input.kind === 'soulCrit'
  const crit = input.kind === 'crit' || soulCrit
  const palette = POPUP_PALETTE[input.kind] ?? POPUP_PALETTE.damage
  const activeForTarget = (input.activePopups ?? []).filter(
    (p) => p.target === input.target && input.now - p.createdAt < p.durationMs,
  ).length
  const { offsetX, offsetY, arcX } = computePopupOffset(input.id, activeForTarget)

  let text: string
  if (input.kind === 'miss') {
    text = input.prefix || 'MISS!'
  } else if (input.kind === 'block' && safeAmount === 0) {
    text = 'BLOCK!'
  } else {
    const exactDigits = formatExactDamage(safeAmount)
    text = `${input.prefix ?? ''}${exactDigits}${input.suffix ?? ''}`
  }

  return {
    id: input.id,
    target: input.target,
    kind: input.kind,
    amount: safeAmount,
    text,
    badge: input.badge ?? palette.defaultBadge,
    color: input.color || palette.color,
    outlineColor: palette.outlineColor,
    crit,
    soulCrit,
    offsetX,
    offsetY,
    arcX,
    createdAt: input.now,
    durationMs: soulCrit
      ? SOUL_CRIT_POPUP_DURATION_MS
      : crit
        ? CRIT_POPUP_DURATION_MS
        : DEFAULT_POPUP_DURATION_MS,
  }
}

export function pruneExpiredPopups(
  popups: readonly FloatingDamagePopup[],
  now: number,
): FloatingDamagePopup[] {
  return popups.filter((p) => {
    const elapsed = now - p.createdAt
    return elapsed >= 0 && elapsed < p.durationMs
  })
}

export function computePopupMotion(
  popup: Pick<FloatingDamagePopup, 'createdAt' | 'durationMs' | 'crit' | 'offsetX' | 'offsetY' | 'arcX'> & {
    soulCrit?: boolean
  },
  now: number,
): {
  alive: boolean
  progress: number
  xOffsetPx: number
  yOffsetPx: number
  scale: number
  opacity: number
} {
  const elapsed = now - popup.createdAt
  if (elapsed < 0 || elapsed >= popup.durationMs) {
    return {
      alive: false,
      progress: elapsed < 0 ? 0 : 1,
      xOffsetPx: popup.offsetX,
      yOffsetPx: popup.offsetY,
      scale: 0.9,
      opacity: 0,
    }
  }

  const progress = elapsed / Math.max(1, popup.durationMs)
  const easeOut = 1 - Math.pow(1 - progress, 2.35)
  const peakScale = popup.soulCrit ? 1.56 : popup.crit ? 1.42 : 1.18
  const scale =
    progress < 0.14
      ? 0.68 + (peakScale - 0.68) * (progress / 0.14)
      : progress < 0.36
        ? peakScale - (peakScale - 1.02) * ((progress - 0.14) / 0.22)
        : 1.02 - Math.max(0, progress - 0.72) * 0.25

  const opacity =
    progress < 0.08
      ? progress / 0.08
      : progress > 0.72
        ? Math.max(0, 1 - (progress - 0.72) / 0.28)
        : 1

  const riseDistance = popup.soulCrit ? 64 : popup.crit ? 56 : 46
  return {
    alive: true,
    progress,
    xOffsetPx: popup.offsetX + popup.arcX * easeOut,
    yOffsetPx: popup.offsetY - riseDistance * easeOut,
    scale,
    opacity,
  }
}

/**
 * Shared bounce-pop and arc physics curve for overworld Canvas2D floating damage popups.
 */
export function computeWorldFloatTransform(
  life: number,
  max: number,
  kind: FloatingPopupKind = 'damage',
  arcDrift = 0,
): {
  progress: number
  dxWorld: number
  dyWorld: number
  scale: number
  alpha: number
} {
  const progress = Math.max(0, Math.min(1, 1 - life / Math.max(0.001, max)))
  const easeOut = 1 - Math.pow(1 - progress, 2.2)
  const isSoul = kind === 'soulCrit'
  const isCrit = kind === 'crit' || isSoul
  const peak = isSoul ? 1.48 : isCrit ? 1.34 : 1.14
  const scale =
    progress < 0.14
      ? 0.65 + (peak - 0.65) * (progress / 0.14)
      : progress < 0.36
        ? peak - (peak - 1) * ((progress - 0.14) / 0.22)
        : 1 - Math.max(0, progress - 0.74) * 0.22

  const alpha =
    progress < 0.08
      ? progress / 0.08
      : progress > 0.7
        ? Math.max(0, 1 - (progress - 0.7) / 0.3)
        : 1

  const riseWorld = isSoul ? 26 : isCrit ? 22 : 18
  return {
    progress,
    dxWorld: arcDrift * easeOut,
    dyWorld: -riseWorld * easeOut,
    scale,
    alpha,
  }
}
