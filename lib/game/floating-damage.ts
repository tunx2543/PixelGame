export type FloatingPopupTarget = 'player' | 'enemy'

export type FloatingPopupKind = 'damage' | 'crit' | 'pet' | 'heal' | 'incoming'

export interface FloatingDamagePopup {
  id: number
  target: FloatingPopupTarget
  kind: FloatingPopupKind
  amount: number
  text: string
  badge?: string
  color: string
  crit: boolean
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
  color: string
  now: number
  activePopups?: readonly FloatingDamagePopup[]
  badge?: string
  prefix?: string
  suffix?: string
}

const HORIZONTAL_SLOTS = [0, -24, 24, -14, 14, -32, 32] as const
const VERTICAL_SLOTS = [0, -8, -4, -14, -10, -18, -12] as const
const ARC_DRIFTS = [4, -12, 12, -8, 8, -16, 16] as const

export const DEFAULT_POPUP_DURATION_MS = 950
export const CRIT_POPUP_DURATION_MS = 1150

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
  const crit = input.kind === 'crit'
  const activeForTarget = (input.activePopups ?? []).filter(
    (p) => p.target === input.target && input.now - p.createdAt < p.durationMs,
  ).length
  const { offsetX, offsetY, arcX } = computePopupOffset(input.id, activeForTarget)
  const exactDigits = formatExactDamage(safeAmount)
  const text = `${input.prefix ?? ''}${exactDigits}${input.suffix ?? ''}`

  return {
    id: input.id,
    target: input.target,
    kind: input.kind,
    amount: safeAmount,
    text,
    badge: input.badge,
    color: input.color,
    crit,
    offsetX,
    offsetY,
    arcX,
    createdAt: input.now,
    durationMs: crit ? CRIT_POPUP_DURATION_MS : DEFAULT_POPUP_DURATION_MS,
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
  popup: Pick<FloatingDamagePopup, 'createdAt' | 'durationMs' | 'crit' | 'offsetX' | 'offsetY' | 'arcX'>,
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
  const easeOut = 1 - Math.pow(1 - progress, 2.4)
  const peakScale = popup.crit ? 1.38 : 1.18
  const scale =
    progress < 0.16
      ? 0.72 + (peakScale - 0.72) * (progress / 0.16)
      : progress < 0.42
        ? peakScale - (peakScale - 1) * ((progress - 0.16) / 0.26)
        : 1 - Math.max(0, progress - 0.72) * 0.25

  const opacity =
    progress < 0.1
      ? progress / 0.1
      : progress > 0.68
        ? Math.max(0, 1 - (progress - 0.68) / 0.32)
        : 1

  const riseDistance = popup.crit ? 56 : 46
  return {
    alive: true,
    progress,
    xOffsetPx: popup.offsetX + popup.arcX * easeOut,
    yOffsetPx: popup.offsetY - riseDistance * easeOut,
    scale,
    opacity,
  }
}
