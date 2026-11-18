import type { User } from 'firebase/auth'

export const GM_EMAIL = 'ffsmilepay53@gmail.com'
export const TOPUP_ADMIN_EMAILS = ['ffsmilepay53@gmail.com'] as const
export const PERMANENT_GM_GAME_UID = '0000'
export const PERMANENT_GM_UID = 0

export function isGmEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.trim().toLowerCase() === GM_EMAIL
}

export function isGmAccountUser(user: Pick<User, 'email' | 'emailVerified'> | null | undefined): boolean {
  return Boolean(user && user.emailVerified && isGmEmail(user.email))
}

export function isTopupAdminEmail(email: string | null | undefined): boolean {
  if (typeof email !== 'string') return false
  const norm = email.trim().toLowerCase()
  return (TOPUP_ADMIN_EMAILS as readonly string[]).includes(norm)
}

export function isTopupAdminUser(user: Pick<User, 'email' | 'emailVerified'> | null | undefined): boolean {
  return Boolean(user && user.emailVerified && isTopupAdminEmail(user.email))
}

export function normalizeGameUidInput(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined) return null
  const digits = String(raw).trim().replace(/^#/, '').replace(/\s+/g, '')
  if (!/^[0-9]{1,8}$/.test(digits)) return null
  const num = Number(digits)
  if (!Number.isSafeInteger(num) || num < 0) return null
  if (num === 0) return PERMANENT_GM_GAME_UID
  return digits.length >= 4 ? digits : digits.padStart(4, '0')
}

export function formatGameUid(value: string | number | null | undefined): string {
  return normalizeGameUidInput(value) ?? '----'
}
