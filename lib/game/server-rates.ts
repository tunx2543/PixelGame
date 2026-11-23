export interface ServerRatesConfig {
  expMultiplier: number
  dropMultiplier: number
  label: string
  startedAtMs: number
  expiresAtMs: number | null
  updatedAtMs: number
  updatedByName: string
}

export const MIN_SERVER_RATE = 1
export const MAX_SERVER_RATE = 10

export const DEFAULT_SERVER_RATES: ServerRatesConfig = {
  expMultiplier: 1,
  dropMultiplier: 1,
  label: '',
  startedAtMs: 0,
  expiresAtMs: null,
  updatedAtMs: 0,
  updatedByName: 'GM',
}

export function clampServerMultiplier(raw: unknown): number {
  const num = Number(raw)
  if (!Number.isFinite(num)) return 1
  const clamped = Math.max(MIN_SERVER_RATE, Math.min(MAX_SERVER_RATE, num))
  return Math.round(clamped * 10) / 10
}

export function sanitizeServerRates(raw: unknown): ServerRatesConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SERVER_RATES }
  }
  const obj = raw as Record<string, unknown>
  const expMultiplier = clampServerMultiplier(obj.expMultiplier)
  const dropMultiplier = clampServerMultiplier(obj.dropMultiplier)
  const label = typeof obj.label === 'string' ? obj.label.trim().slice(0, 80) : ''
  const startedAtMs =
    typeof obj.startedAtMs === 'number' && Number.isFinite(obj.startedAtMs) && obj.startedAtMs > 0
      ? Math.floor(obj.startedAtMs)
      : 0
  const expiresAtMs =
    typeof obj.expiresAtMs === 'number' && Number.isFinite(obj.expiresAtMs) && obj.expiresAtMs > 0
      ? Math.floor(obj.expiresAtMs)
      : null
  const updatedAtMs =
    typeof obj.updatedAtMs === 'number' && Number.isFinite(obj.updatedAtMs) && obj.updatedAtMs > 0
      ? Math.floor(obj.updatedAtMs)
      : 0
  const updatedByName =
    typeof obj.updatedByName === 'string' && obj.updatedByName.trim()
      ? obj.updatedByName.trim().slice(0, 24)
      : 'GM'

  return {
    expMultiplier,
    dropMultiplier,
    label,
    startedAtMs,
    expiresAtMs,
    updatedAtMs,
    updatedByName,
  }
}

export function getEffectiveServerRates(
  rates: ServerRatesConfig | null | undefined,
  nowMs = Date.now(),
): ServerRatesConfig {
  if (!rates) return { ...DEFAULT_SERVER_RATES }
  const clean = sanitizeServerRates(rates)
  if (clean.expiresAtMs !== null && clean.expiresAtMs <= nowMs) {
    return {
      ...DEFAULT_SERVER_RATES,
      updatedAtMs: clean.updatedAtMs,
      updatedByName: clean.updatedByName,
    }
  }
  return clean
}

export function isServerRateBoostActive(
  rates: ServerRatesConfig | null | undefined,
  nowMs = Date.now(),
): boolean {
  const effective = getEffectiveServerRates(rates, nowMs)
  return effective.expMultiplier > 1 || effective.dropMultiplier > 1
}

export function applyServerDropChance(baseChance: number, dropMultiplier: number): number {
  const safeBase = Number.isFinite(baseChance) ? Math.max(0, baseChance) : 0
  const safeMul = clampServerMultiplier(dropMultiplier)
  return Math.min(1, safeBase * safeMul)
}

export function formatServerRateSummary(rates: ServerRatesConfig, nowMs = Date.now()): string {
  const effective = getEffectiveServerRates(rates, nowMs)
  const parts: string[] = []
  if (effective.expMultiplier > 1) parts.push(`EXP x${effective.expMultiplier}`)
  if (effective.dropMultiplier > 1) parts.push(`DROP x${effective.dropMultiplier}`)
  if (parts.length === 0) return 'อัตราปกติ (EXP x1 · DROP x1)'
  const labelPart = effective.label ? ` — ${effective.label}` : ''
  return `${parts.join(' · ')}${labelPart}`
}
