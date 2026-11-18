import crypto from 'node:crypto'
import firebaseConfig from '@/firebase-applet-config.json'
import { GM_EMAIL } from '@/lib/game/permissions'
import { getPremiumProduct } from '@/lib/game/premium/catalog'
import { VIP_TIERS, getEffectiveVipBonuses, getVipTierDef } from '@/lib/game/premium/vip'
import type { PremiumProduct, VipState, VipTierId } from '@/lib/game/premium/types'
import { BP_MAX_LEVEL, BP_PREMIUM_DIAMOND_COST, BATTLE_PASS_TIERS } from '@/lib/game/extended-systems'

export interface VerifiedActor {
  uid: string
  email: string | null
  emailVerified: boolean
  isGm: boolean
  authMode: 'firebase' | 'guest_sandbox'
}

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'

let certCache: { certs: Record<string, string>; expiresAtMs: number } | null = null

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  if (certCache && Date.now() < certCache.expiresAtMs) {
    return certCache.certs
  }
  const res = await fetch(GOOGLE_CERTS_URL, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase public certificates (${res.status})`)
  }
  const cacheHeader = res.headers.get('cache-control') ?? ''
  const maxAgeMatch = /max-age=(\d+)/i.exec(cacheHeader)
  const ttlSec = maxAgeMatch ? Math.max(60, Math.min(3600, Number(maxAgeMatch[1]))) : 300
  const certs = (await res.json()) as Record<string, string>
  certCache = { certs, expiresAtMs: Date.now() + ttlSec * 1000 }
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

function txSecret(): string {
  return process.env.PREMIUM_TX_SECRET || `sandbox:${firebaseConfig.projectId}`
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
  const canonical = [
    payload.txId,
    payload.requestId,
    payload.actorUid,
    payload.characterId,
    payload.type,
    payload.source,
    String(payload.amount),
    String(payload.timestampMs),
  ].join('|')
  return crypto.createHmac('sha256', txSecret()).update(canonical).digest('hex').slice(0, 32)
}

export function makeServerTxId(prefix = 'SVTX'): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`
}

// Bounded in-memory server replay protection across requests in the running instance
const RECENT_REQUEST_TTL_MS = 15 * 60 * 1000
const processedServerRequests = new Map<string, number>()

export function claimServerRequestId(requestId: string, actorUid: string): boolean {
  if (!requestId || requestId.length < 4 || requestId.length > 96) return false
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
