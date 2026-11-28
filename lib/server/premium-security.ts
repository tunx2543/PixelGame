import crypto from 'node:crypto'
import firebaseConfig from '@/firebase-applet-config.json'
import { GM_EMAIL } from '@/lib/game/permissions'
import { getPremiumProduct } from '@/lib/game/premium/catalog'
import { VIP_TIERS, getEffectiveVipBonuses, getVipTierDef } from '@/lib/game/premium/vip'
import type { PremiumProduct, VipState, VipTierId } from '@/lib/game/premium/types'
import { BP_MAX_LEVEL, BP_PREMIUM_DIAMOND_COST, BATTLE_PASS_TIERS } from '@/lib/game/extended-systems'
import { getGlobalSingleton, getRuntimeEnv, type StorePersistenceMode } from './runtime-store'
import {
  checkDurableRateLimit,
  claimDurableLock,
  detectDurableBackendMode,
  hasRemoteDurableBackend,
  mutateDurableNamespace,
  readDurableNamespace,
} from './durable-store'

export interface VerifiedActor {
  uid: string
  email: string | null
  emailVerified: boolean
  isGm: boolean
  authMode: 'firebase' | 'guest_sandbox'
}

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'

interface CertCacheSlot {
  entry: { certs: Record<string, string>; expiresAtMs: number } | null
}

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const slot = getGlobalSingleton<CertCacheSlot>('pixelquest.firebaseCertCache', () => ({ entry: null }))
  if (slot.entry && Date.now() < slot.entry.expiresAtMs) {
    return slot.entry.certs
  }
  const res = await fetch(GOOGLE_CERTS_URL, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase public certificates (${res.status})`)
  }
  const cacheHeader = res.headers.get('cache-control') ?? ''
  const maxAgeMatch = /max-age=(\d+)/i.exec(cacheHeader)
  const ttlSec = maxAgeMatch ? Math.max(60, Math.min(3600, Number(maxAgeMatch[1]))) : 300
  const certs = (await res.json()) as Record<string, string>
  slot.entry = { certs, expiresAtMs: Date.now() + ttlSec * 1000 }
  return certs
}

function decodeBase64Url(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = (4 - (normalized.length % 4)) % 4
  return Buffer.from(normalized + '='.repeat(padLen), 'base64')
}

export async function verifyFirebaseBearerToken(token: string): Promise<VerifiedActor> {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Malformed Firebase ID token')
  }
  const [headerB64, payloadB64, sigB64] = parts
  const header = JSON.parse(decodeBase64Url(headerB64).toString('utf8')) as {
    alg?: string
    kid?: string
  }
  const payload = JSON.parse(decodeBase64Url(payloadB64).toString('utf8')) as {
    aud?: string
    iss?: string
    sub?: string
    exp?: number
    iat?: number
    auth_time?: number
    email?: string
    email_verified?: boolean
  }

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported token algorithm or missing key ID')
  }

  const certs = await getGooglePublicCerts()
  const certPem = certs[header.kid]
  if (!certPem) {
    throw new Error('Unknown Firebase signing certificate')
  }

  const verifier = crypto.createVerify('RSA-SHA256')
  verifier.update(`${headerB64}.${payloadB64}`)
  verifier.end()
  const signatureOk = verifier.verify(certPem, decodeBase64Url(sigB64))
  if (!signatureOk) {
    throw new Error('Invalid Firebase ID token signature')
  }

  const projectId = firebaseConfig.projectId
  const nowSec = Math.floor(Date.now() / 1000)
  if (payload.aud !== projectId) {
    throw new Error('Token audience mismatch')
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Token issuer mismatch')
  }
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Token subject missing')
  }
  if (!payload.exp || payload.exp <= nowSec) {
    throw new Error('Firebase ID token expired')
  }
  if (payload.iat && payload.iat > nowSec + 300) {
    throw new Error('Token issued in the future')
  }

  const email = typeof payload.email === 'string' ? payload.email : null
  const emailVerified = Boolean(payload.email_verified)
  const isGm = Boolean(emailVerified && email && email.trim().toLowerCase() === GM_EMAIL)

  return {
    uid: payload.sub,
    email,
    emailVerified,
    isGm,
    authMode: 'firebase',
  }
}

export async function resolveActorFromRequest(
  req: Request,
): Promise<{ ok: true; actor: VerifiedActor } | { ok: false; status: number; message: string }> {
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (!token) {
      return { ok: false, status: 401, message: 'ไม่พบโทเคนยืนยันตัวตน' }
    }
    try {
      const actor = await verifyFirebaseBearerToken(token)
      return { ok: true, actor }
    } catch (err) {
      return {
        ok: false,
        status: 401,
        message: err instanceof Error ? err.message : 'โทเคนยืนยันตัวตนไม่ถูกต้อง',
      }
    }
  }

  // Sandbox guest mode when playing locally without Firebase login (never elevated to GM)
  return {
    ok: true,
    actor: {
      uid: 'guest',
      email: null,
      emailVerified: false,
      isGm: false,
      authMode: 'guest_sandbox',
    },
  }
}

export function isPersistentPremiumSecretConfigured(): boolean {
  return Boolean(getRuntimeEnv('PREMIUM_TX_SECRET'))
}

export function isDurableTxSecretReady(): boolean {
  return Boolean(getRuntimeEnv('PREMIUM_TX_SECRET')) || hasRemoteDurableBackend()
}

function txSecret(): string {
  const configured = getRuntimeEnv('PREMIUM_TX_SECRET')
  if (configured) return configured
  const fallbackSlot = getGlobalSingleton<{ value: string | null }>('pixelquest.ephemeralTxSecret', () => ({
    value: null,
  }))
  if (!fallbackSlot.value) {
    fallbackSlot.value = crypto.randomBytes(32).toString('hex')
  }
  return fallbackSlot.value
}

export async function resolveDurableTxSecret(): Promise<{
  secret: string
  persistent: boolean
  mode: StorePersistenceMode
}> {
  const configured = getRuntimeEnv('PREMIUM_TX_SECRET')
  if (configured) {
    return {
      secret: configured,
      persistent: true,
      mode: detectDurableBackendMode(),
    }
  }

  if (hasRemoteDurableBackend()) {
    const slot = getGlobalSingleton<{ entry: { mode: string; secret: string } | null }>(
      'pixelquest.durableTxSecretSlot',
      () => ({ entry: null }),
    )
    const activeMode = detectDurableBackendMode()
    if (slot.entry && slot.entry.mode === activeMode && slot.entry.secret) {
      return { secret: slot.entry.secret, persistent: true, mode: activeMode }
    }

    const readRes = await readDurableNamespace<{ txSecret?: string }>('system-secrets', () => ({}))
    if (typeof readRes.data?.txSecret === 'string' && readRes.data.txSecret.length >= 32) {
      slot.entry = { mode: readRes.mode, secret: readRes.data.txSecret }
      return { secret: readRes.data.txSecret, persistent: true, mode: readRes.mode }
    }

    const candidateSecret = crypto.randomBytes(32).toString('hex')
    const writeRes = await mutateDurableNamespace<{ txSecret?: string }, string>({
      namespace: 'system-secrets',
      fallbackInit: () => ({}),
      mutator: (current) => {
        if (typeof current?.txSecret === 'string' && current.txSecret.length >= 32) {
          return { next: current, changed: false, result: current.txSecret }
        }
        return {
          next: { ...current, txSecret: candidateSecret },
          changed: true,
          result: candidateSecret,
        }
      },
      onCommitLocal: () => activeMode,
    })
    slot.entry = { mode: writeRes.mode, secret: writeRes.result }
    return { secret: writeRes.result, persistent: true, mode: writeRes.mode }
  }

  return {
    secret: txSecret(),
    persistent: false,
    mode: detectDurableBackendMode(),
  }
}

export function isValidCharacterIdFormat(raw: unknown): raw is string {
  return typeof raw === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(raw.trim())
}

function buildGuestMaterial(req: Request, clientHint?: string): string {
  const cfIp = (req.headers.get('cf-connecting-ip') ?? '').trim()
  const forwardedFor = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() ?? ''
  const realIp = (req.headers.get('x-real-ip') ?? '').trim()
  const clientIp = cfIp || forwardedFor || realIp
  const userAgent = (req.headers.get('user-agent') ?? '').trim().slice(0, 160)
  const cleanHint =
    typeof clientHint === 'string' ? clientHint.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) : ''
  // When behind Cloudflare / reverse proxy (real IP present), bind claim identity to IP + UA so
  // rotating localStorage guestClientId cannot bypass once-per-guest redeem limits.
  return clientIp
    ? `ip:${clientIp}|ua:${userAgent}`
    : `ua:${userAgent}|hint:${cleanHint || 'anon'}`
}

export function deriveGuestFingerprint(req: Request, clientHint?: string): string {
  return crypto.createHmac('sha256', txSecret()).update(buildGuestMaterial(req, clientHint)).digest('hex').slice(0, 24)
}

export async function deriveGuestFingerprintDurable(req: Request, clientHint?: string): Promise<string> {
  const { secret } = await resolveDurableTxSecret()
  return crypto.createHmac('sha256', secret).update(buildGuestMaterial(req, clientHint)).digest('hex').slice(0, 24)
}

export function checkServerRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const cleanKey = key.slice(0, 128)
  if (!cleanKey || maxRequests < 1 || windowMs < 1000) return false
  const buckets = getGlobalSingleton<Map<string, number[]>>(
    'pixelquest.rateLimitBuckets',
    () => new Map<string, number[]>(),
  )
  const now = Date.now()
  if (buckets.size > 4000) {
    for (const [k, stamps] of buckets.entries()) {
      if (stamps.length === 0 || stamps[stamps.length - 1]! + windowMs <= now) {
        buckets.delete(k)
      }
    }
  }
  const existing = buckets.get(cleanKey) ?? []
  const recent = existing.filter((t) => now - t < windowMs)
  if (recent.length >= maxRequests) {
    buckets.set(cleanKey, recent)
    return false
  }
  recent.push(now)
  buckets.set(cleanKey, recent)
  return true
}

export async function checkDurableServerRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const cleanKey = key.slice(0, 128)
  if (!cleanKey || maxRequests < 1 || windowMs < 1000) return false
  return checkDurableRateLimit(cleanKey, maxRequests, windowMs, () =>
    checkServerRateLimit(cleanKey, maxRequests, windowMs),
  )
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  return token || null
}

interface FirestoreRestValue {
  stringValue?: string
  integerValue?: string
  doubleValue?: number
  booleanValue?: boolean
  nullValue?: null
  mapValue?: { fields?: Record<string, FirestoreRestValue> }
  arrayValue?: { values?: FirestoreRestValue[] }
}

function decodeFirestoreRestValue(val: FirestoreRestValue | undefined): unknown {
  if (!val || typeof val !== 'object') return undefined
  if ('stringValue' in val) return String(val.stringValue ?? '')
  if ('integerValue' in val) return Number(val.integerValue ?? 0)
  if ('doubleValue' in val) return Number(val.doubleValue ?? 0)
  if ('booleanValue' in val) return Boolean(val.booleanValue)
  if ('nullValue' in val) return null
  if ('mapValue' in val) {
    const out: Record<string, unknown> = {}
    const fields = val.mapValue?.fields ?? {}
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreRestValue(v)
    }
    return out
  }
  if ('arrayValue' in val) {
    return (val.arrayValue?.values ?? []).map((item) => decodeFirestoreRestValue(item))
  }
  return undefined
}

export interface AuthoritativeCharacterSnapshot {
  exists: boolean
  diamonds: number
  vip?: VipState
  purchaseCounts: Record<string, number>
  totalTopupThb: number
  claimedTopupMilestones: string[]
  lastDailyTopupDate: string
  claimedDailyTopupDate: string
  battlePass?: {
    level: number
    premiumUnlocked: boolean
    claimedFree: number[]
    claimedPrem: number[]
  }
}

interface AuthoritativeTopupOrdersSummary {
  totalAmountThb: number
  latestCreatedAtMs: number
  totalOrders: number
}

async function fetchAuthoritativeTopupOrdersSummary(
  uid: string,
  safeCharId: string,
  bearerToken: string,
): Promise<AuthoritativeTopupOrdersSummary | null> {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(firebaseConfig.firestoreDatabaseId)}/documents/users/${encodeURIComponent(uid)}/characters/${encodeURIComponent(safeCharId)}/topupOrders`
  let pageToken = ''
  let totalAmountThb = 0
  let latestCreatedAtMs = 0
  let totalOrders = 0

  try {
    for (let page = 0; page < 5; page++) {
      const url = pageToken
        ? `${baseUrl}?pageSize=100&pageToken=${encodeURIComponent(pageToken)}`
        : `${baseUrl}?pageSize=100`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${bearerToken}` },
        cache: 'no-store',
      })
      if (res.status === 404) {
        return { totalAmountThb: 0, latestCreatedAtMs: 0, totalOrders: 0 }
      }
      if (!res.ok) return null
      const json = (await res.json().catch(() => null)) as {
        documents?: Array<{ fields?: Record<string, FirestoreRestValue> }>
        nextPageToken?: string
      } | null
      if (!json) return null
      const docs = Array.isArray(json.documents) ? json.documents : []
      for (const item of docs) {
        const fields = item.fields
        if (!fields) continue
        const status = String(decodeFirestoreRestValue(fields.status) ?? '')
        if (status && status !== 'credited') continue
        const amt = Math.max(0, Math.floor(Number(decodeFirestoreRestValue(fields.amountThb) ?? 0) || 0))
        const createdAtMs = Math.max(0, Math.floor(Number(decodeFirestoreRestValue(fields.createdAtMs) ?? 0) || 0))
        totalAmountThb += amt
        totalOrders += 1
        if (createdAtMs > latestCreatedAtMs) latestCreatedAtMs = createdAtMs
      }
      if (!json.nextPageToken) break
      pageToken = json.nextPageToken
    }
    return { totalAmountThb, latestCreatedAtMs, totalOrders }
  } catch {
    return null
  }
}

export async function fetchAuthoritativeCharacterState(
  uid: string,
  characterId: string,
  bearerToken: string,
): Promise<AuthoritativeCharacterSnapshot | null> {
  const safeCharId = characterId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'slot_1'
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(firebaseConfig.firestoreDatabaseId)}/documents/users/${encodeURIComponent(uid)}/characters/${encodeURIComponent(safeCharId)}`
  try {
    const [res, ordersSummary] = await Promise.all([
      fetch(url, {
        headers: { Authorization: `Bearer ${bearerToken}` },
        cache: 'no-store',
      }),
      fetchAuthoritativeTopupOrdersSummary(uid, safeCharId, bearerToken),
    ])
    if (res.status === 404) {
      return {
        exists: false,
        diamonds: 0,
        purchaseCounts: {},
        totalTopupThb: 0,
        claimedTopupMilestones: [],
        lastDailyTopupDate: '',
        claimedDailyTopupDate: '',
      }
    }
    if (!res.ok) return null
    const doc = (await res.json().catch(() => null)) as {
      fields?: Record<string, FirestoreRestValue>
    } | null
    if (!doc?.fields) return null

    const topDiamonds = Number(decodeFirestoreRestValue(doc.fields.diamonds) ?? 0)
    const saveData = (decodeFirestoreRestValue(doc.fields.saveData) ?? {}) as Record<string, unknown>
    const saveDiamonds = Number(saveData.diamonds ?? topDiamonds)
    const diamonds = Math.max(0, Math.floor(Math.min(topDiamonds, saveDiamonds)))

    const prem = (saveData.premium && typeof saveData.premium === 'object' ? saveData.premium : {}) as Record<
      string,
      unknown
    >
    const rawCounts =
      prem.purchaseCounts && typeof prem.purchaseCounts === 'object'
        ? (prem.purchaseCounts as Record<string, unknown>)
        : {}
    const purchaseCounts: Record<string, number> = {}
    for (const [k, v] of Object.entries(rawCounts)) {
      const n = Math.max(0, Math.floor(Number(v) || 0))
      if (n > 0) purchaseCounts[k] = n
    }

    const rawVip = prem.vip && typeof prem.vip === 'object' ? (prem.vip as Record<string, unknown>) : null
    const vip: VipState | undefined = rawVip
      ? {
          vipLevel: Math.max(0, Math.min(5, Math.floor(Number(rawVip.vipLevel ?? 0) || 0))) as VipTierId,
          vipExp: Math.max(0, Math.floor(Number(rawVip.vipExp ?? 0) || 0)),
          expiresAtMs:
            typeof rawVip.expiresAtMs === 'number' && Number.isFinite(rawVip.expiresAtMs)
              ? rawVip.expiresAtMs
              : null,
          claimedTierRewards: Array.isArray(rawVip.claimedTierRewards)
            ? rawVip.claimedTierRewards.filter((n): n is VipTierId => typeof n === 'number' && n >= 1 && n <= 5)
            : [],
          lastDailyClaimDate: typeof rawVip.lastDailyClaimDate === 'string' ? rawVip.lastDailyClaimDate : '',
        }
      : undefined

    const extV2 = (saveData.extV2 && typeof saveData.extV2 === 'object' ? saveData.extV2 : {}) as Record<
      string,
      unknown
    >
    const rawBp =
      extV2.battlePass && typeof extV2.battlePass === 'object'
        ? (extV2.battlePass as Record<string, unknown>)
        : null
    const battlePass = rawBp
      ? {
          level: Math.max(1, Math.floor(Number(rawBp.level ?? 1) || 1)),
          premiumUnlocked: Boolean(rawBp.premiumUnlocked),
          claimedFree: Array.isArray(rawBp.claimedFree)
            ? rawBp.claimedFree.filter((n): n is number => typeof n === 'number')
            : [],
          claimedPrem: Array.isArray(rawBp.claimedPrem)
            ? rawBp.claimedPrem.filter((n): n is number => typeof n === 'number')
            : [],
        }
      : undefined

    const savedTotalTopupThb = Math.max(0, Math.floor(Number(prem.totalTopupThb ?? 0) || 0))
    const verifiedTotalTopupThb =
      ordersSummary !== null ? Math.min(savedTotalTopupThb, ordersSummary.totalAmountThb) : savedTotalTopupThb

    const rawLastDaily = typeof prem.lastDailyTopupDate === 'string' ? prem.lastDailyTopupDate : ''
    let verifiedLastDaily = rawLastDaily
    if (ordersSummary !== null) {
      if (ordersSummary.totalOrders === 0 || ordersSummary.latestCreatedAtMs <= 0) {
        verifiedLastDaily = ''
      } else if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(rawLastDaily)) {
        const parsedDateNoonUtc = Date.parse(`${rawLastDaily}T12:00:00Z`)
        if (
          !Number.isFinite(parsedDateNoonUtc) ||
          Math.abs(parsedDateNoonUtc - ordersSummary.latestCreatedAtMs) > 36 * 60 * 60 * 1000
        ) {
          verifiedLastDaily = ''
        }
      } else {
        verifiedLastDaily = ''
      }
    }

    return {
      exists: true,
      diamonds,
      vip,
      purchaseCounts,
      totalTopupThb: verifiedTotalTopupThb,
      claimedTopupMilestones: Array.isArray(prem.claimedTopupMilestones)
        ? prem.claimedTopupMilestones.filter((s): s is string => typeof s === 'string')
        : [],
      lastDailyTopupDate: verifiedLastDaily,
      claimedDailyTopupDate: typeof prem.claimedDailyTopupDate === 'string' ? prem.claimedDailyTopupDate : '',
      battlePass,
    }
  } catch {
    return null
  }
}

function canonicalPremiumTx(payload: {
  txId: string
  requestId: string
  actorUid: string
  characterId: string
  amount: number
  type: string
  source: string
  timestampMs: number
}): string {
  return [
    payload.txId,
    payload.requestId,
    payload.actorUid,
    payload.characterId,
    payload.type,
    payload.source,
    String(payload.amount),
    String(payload.timestampMs),
  ].join('|')
}

export function signPremiumTx(payload: {
  txId: string
  requestId: string
  actorUid: string
  characterId: string
  amount: number
  type: string
  source: string
  timestampMs: number
}): string {
  return crypto.createHmac('sha256', txSecret()).update(canonicalPremiumTx(payload)).digest('hex').slice(0, 32)
}

export async function signPremiumTxDurable(payload: Parameters<typeof signPremiumTx>[0]): Promise<string> {
  const { secret } = await resolveDurableTxSecret()
  return crypto.createHmac('sha256', secret).update(canonicalPremiumTx(payload)).digest('hex').slice(0, 32)
}

export function verifyPremiumTxSignature(
  payload: Parameters<typeof signPremiumTx>[0],
  signature: string | null | undefined,
): boolean {
  if (!signature || typeof signature !== 'string' || !/^[a-f0-9]{32}$/i.test(signature)) {
    return false
  }
  const expected = signPremiumTx(payload)
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature.toLowerCase(), 'utf8'))
  } catch {
    return false
  }
}

export async function verifyPremiumTxSignatureDurable(
  payload: Parameters<typeof signPremiumTx>[0],
  signature: string | null | undefined,
): Promise<boolean> {
  if (!signature || typeof signature !== 'string' || !/^[a-f0-9]{32}$/i.test(signature)) {
    return false
  }
  const expected = await signPremiumTxDurable(payload)
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature.toLowerCase(), 'utf8'))
  } catch {
    return false
  }
}

export function makeServerTxId(prefix = 'SVTX'): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`
}

// Bounded in-memory server replay protection across requests in the running instance
const RECENT_REQUEST_TTL_MS = 15 * 60 * 1000

export function claimServerRequestId(requestId: string, actorUid: string): boolean {
  if (!requestId || requestId.length < 4 || requestId.length > 96) return false
  const processedServerRequests = getGlobalSingleton<Map<string, number>>(
    'pixelquest.processedServerRequests',
    () => new Map<string, number>(),
  )
  const now = Date.now()
  if (processedServerRequests.size > 4000) {
    for (const [k, exp] of processedServerRequests.entries()) {
      if (exp <= now) processedServerRequests.delete(k)
    }
  }
  const key = `${actorUid}:${requestId}`
  const existing = processedServerRequests.get(key)
  if (existing && existing > now) {
    return false
  }
  processedServerRequests.set(key, now + RECENT_REQUEST_TTL_MS)
  return true
}

export async function claimDurableServerRequestId(
  requestId: string,
  actorUid: string,
  ttlMs = RECENT_REQUEST_TTL_MS,
): Promise<boolean> {
  if (!requestId || requestId.length < 4 || requestId.length > 96) return false
  return claimDurableLock(`req:${actorUid}:${requestId}`, actorUid, ttlMs, () =>
    claimServerRequestId(requestId, actorUid),
  )
}

export interface PurchaseVerificationInput {
  productId: string
  qty: number
  currentDiamonds: number
  previousPurchaseCount: number
  vip?: VipState
  nowMs?: number
}

export interface PurchaseVerificationResult {
  ok: boolean
  status: number
  message: string
  product?: PremiumProduct
  unitPrice?: number
  totalCost?: number
  nextDiamonds?: number
}

export function verifyCatalogPurchase(input: PurchaseVerificationInput): PurchaseVerificationResult {
  const nowMs = input.nowMs ?? Date.now()
  const product = getPremiumProduct(input.productId)
  if (!product) {
    return { ok: false, status: 404, message: 'ไม่พบสินค้าในร้านค้าพรีเมียม' }
  }
  if (!product.enabled) {
    return { ok: false, status: 400, message: 'สินค้านี้ถูกปิดการจำหน่ายชั่วคราว' }
  }
  if (product.expiration !== null && product.expiration <= nowMs) {
    return { ok: false, status: 400, message: 'สินค้านี้หมดเขตเวลาจำหน่ายแล้ว' }
  }
  const safeQty = Math.floor(Number(input.qty) || 0)
  if (!Number.isSafeInteger(safeQty) || safeQty < 1 || safeQty > 99) {
    return { ok: false, status: 400, message: 'จำนวนสินค้าต้องอยู่ระหว่าง 1–99' }
  }
  if (product.stock !== null && product.stock < safeQty) {
    return { ok: false, status: 400, message: 'สินค้าหมดสต็อกแล้ว' }
  }
  if (product.purchaseLimit !== null && input.previousPurchaseCount + safeQty > product.purchaseLimit) {
    return {
      ok: false,
      status: 400,
      message: `เกินจำกัดการซื้อ (ซื้อได้สูงสุด ${product.purchaseLimit} ครั้ง)`,
    }
  }
  if (product.vipRequired) {
    const vipBonus = getEffectiveVipBonuses(input.vip, nowMs)
    if (!vipBonus.active || vipBonus.level < product.vipRequired) {
      return {
        ok: false,
        status: 403,
        message: `ต้องมีระดับ VIP ${product.vipRequired} ที่ยังไม่หมดอายุก่อน`,
      }
    }
  }
  const balance = Math.max(0, Math.floor(Number(input.currentDiamonds) || 0))
  const totalCost = product.diamondPrice * safeQty
  if (totalCost < 0 || !Number.isSafeInteger(totalCost)) {
    return { ok: false, status: 400, message: 'ราคาสินค้าไม่ถูกต้อง' }
  }
  if (balance < totalCost) {
    return {
      ok: false,
      status: 400,
      message: `เพชรไม่พอ (มี ${balance.toLocaleString()} D / ต้องการ ${totalCost.toLocaleString()} D)`,
    }
  }

  return {
    ok: true,
    status: 200,
    message: 'ตรวจสอบคำสั่งซื้อผ่านระบบกลางสำเร็จ',
    product,
    unitPrice: product.diamondPrice,
    totalCost,
    nextDiamonds: balance - totalCost,
  }
}

export function verifyVipRewardClaim(input: {
  claimType: 'vip_tier' | 'vip_daily'
  vip: VipState | undefined
  tierLevel?: number
  todayIso: string
  nowMs?: number
}): { ok: boolean; status: number; message: string; diamondsGrant: number } {
  const nowMs = input.nowMs ?? Date.now()
  const bonuses = getEffectiveVipBonuses(input.vip, nowMs)
  if (!bonuses.active || !bonuses.tierDef || !input.vip) {
    return { ok: false, status: 400, message: 'สิทธิ์ VIP ยังไม่เปิดใช้งานหรือหมดอายุแล้ว', diamondsGrant: 0 }
  }

  if (input.claimType === 'vip_tier') {
    const targetLevel = Math.floor(Number(input.tierLevel) || 0) as VipTierId
    const targetDef = getVipTierDef(targetLevel)
    if (!targetDef || targetLevel < 1 || targetLevel > 5) {
      return { ok: false, status: 404, message: 'ไม่พบระดับ VIP ที่เลือก', diamondsGrant: 0 }
    }
    if (bonuses.level < targetLevel) {
      return { ok: false, status: 403, message: `ต้องอัปเกรดถึง ${targetDef.name} ก่อน`, diamondsGrant: 0 }
    }
    if (input.vip.claimedTierRewards.includes(targetLevel)) {
      return { ok: false, status: 400, message: `รับรางวัล ${targetDef.name} ไปแล้ว`, diamondsGrant: 0 }
    }
    return { ok: true, status: 200, message: 'ผ่านการตรวจสอบสิทธิ์ VIP Tier', diamondsGrant: targetDef.tierReward.diamonds }
  }

  if (input.vip.lastDailyClaimDate === input.todayIso) {
    return { ok: false, status: 400, message: 'รับรางวัล VIP ประจำวันนี้ไปแล้ว', diamondsGrant: 0 }
  }
  const activeDef = VIP_TIERS.find((t) => t.level === bonuses.level)
  return {
    ok: true,
    status: 200,
    message: 'ผ่านการตรวจสอบสิทธิ์ VIP ประจำวัน',
    diamondsGrant: activeDef?.dailyReward.diamonds ?? 0,
  }
}

export function verifyBattlePassUnlockOrClaim(input: {
  action: 'unlock_pass' | 'claim_tier'
  level?: number
  track?: 'free' | 'prem'
  bpLevel: number
  premiumUnlocked: boolean
  claimedFree: number[]
  claimedPrem: number[]
  currentDiamonds: number
}): { ok: boolean; status: number; message: string; diamondDelta: number } {
  if (input.action === 'unlock_pass') {
    if (input.premiumUnlocked) {
      return { ok: false, status: 400, message: 'เปิดใช้งาน Premium Pass แล้ว', diamondDelta: 0 }
    }
    if (input.currentDiamonds < BP_PREMIUM_DIAMOND_COST) {
      return {
        ok: false,
        status: 400,
        message: `เพชรไม่พอ (ต้องการ ${BP_PREMIUM_DIAMOND_COST} D)`,
        diamondDelta: 0,
      }
    }
    return { ok: true, status: 200, message: 'ยืนยันปลดล็อก Premium Battle Pass', diamondDelta: -BP_PREMIUM_DIAMOND_COST }
  }

  const lv = Math.floor(Number(input.level) || 0)
  if (lv < 1 || lv > BP_MAX_LEVEL) {
    return { ok: false, status: 404, message: 'ไม่พบระดับ Battle Pass', diamondDelta: 0 }
  }
  if (input.bpLevel < lv) {
    return { ok: false, status: 400, message: `ต้องมี Battle Pass Lv.${lv} ก่อน`, diamondDelta: 0 }
  }
  if (input.track === 'prem' && !input.premiumUnlocked) {
    return { ok: false, status: 403, message: 'ต้องปลดล็อก Premium Pass ก่อน', diamondDelta: 0 }
  }
  const claimed = input.track === 'prem' ? input.claimedPrem : input.claimedFree
  if (claimed.includes(lv)) {
    return { ok: false, status: 400, message: 'รับรางวัลขั้นนี้ไปแล้ว', diamondDelta: 0 }
  }
  const tier = BATTLE_PASS_TIERS.find((t) => t.level === lv)
  const reward = input.track === 'prem' ? tier?.premReward : tier?.freeReward
  return {
    ok: true,
    status: 200,
    message: 'ยืนยันสิทธิ์รับรางวัล Battle Pass',
    diamondDelta: reward?.diamonds ?? 0,
  }
}
