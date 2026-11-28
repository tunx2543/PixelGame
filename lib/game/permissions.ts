export const GM_EMAIL = 'ffsmilepay53@gmail.com'
export const TOPUP_ADMIN_EMAILS = [GM_EMAIL] as const
export const PERMANENT_GM_GAME_UID = '0000'
export const PERMANENT_GM_UID = 0

/**
 * Auth identity fields accepted from Supabase Auth (email_confirmed_at)
 * and legacy UI adapters (emailVerified) while the migration is in progress.
 * This module deliberately has no Firebase SDK dependency.
 */
export interface GameAuthIdentity {
  email?: string | null
  emailVerified?: boolean
  email_confirmed_at?: string | null
}

function isVerifiedEmailUser(user: GameAuthIdentity | null | undefined): boolean {
  if (!user) return false
  return user.emailVerified === true ||
    (typeof user.email_confirmed_at === 'string' && user.email_confirmed_at.length > 0)
}

export function isGmEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.trim().toLowerCase() === GM_EMAIL
}

/** Only the verified GM mailbox is granted GM privileges. */
export function isGmAccountUser(user: GameAuthIdentity | null | undefined): boolean {
  return Boolean(user && isVerifiedEmailUser(user) && isGmEmail(user.email))
}

export function isTopupAdminEmail(email: string | null | undefined): boolean {
  return isGmEmail(email)
}

export function isTopupAdminUser(user: GameAuthIdentity | null | undefined): boolean {
  return Boolean(user && isVerifiedEmailUser(user) && isTopupAdminEmail(user.email))
}

export function normalizeGameUidInput(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined) return null
  const digits = String(raw).trim().replace(/^#/, '').replace(/\\s+/g, '')
  if (!/^[0-9]{1,8}$/.test(digits)) return null
  const num = Number(digits)
  if (!Number.isSafeInteger(num) || num < 0) return null
  if (num === 0) return PERMANENT_GM_GAME_UID
  return digits.length >= 4 ? digits : digits.padStart(4, '0')
}

export function formatGameUid(value: string | number | null | undefined): string {
  return normalizeGameUidInput(value) ?? '----'
}
