import crypto from 'node:crypto'
import {
  TOPUP_PACKAGES,
  calculateTopupReward,
  formatPromptPayTarget,
  generatePromptPayQrDataUrl,
  getTopupPackage,
  maskPromptPayId,
  type TopupOrderRecord,
  type TopupPackage,
  type TopupProvider,
} from '@/lib/game/premium/topup'
import {
  claimServerRequestId,
  isPersistentPremiumSecretConfigured,
  makeServerTxId,
  signPremiumTx,
} from './premium-security'
import { getRuntimeEnv } from './runtime-store'
import { claimPersistentSlipRef, getStoredMerchantQr, isPersistentSlipRefUsed } from './topup-store'

export interface TopupGatewayPublicConfig {
  stripeEnabled: boolean
  slipVerifyEnabled: boolean
  slipProvider: 'slipok' | 'easyslip' | null
  promptPayQrEnabled: boolean
  promptPayMaskedId: string | null
  merchantAccountName: string | null
  merchantCustomQrUrl: string | null
  currency: 'THB'
  packages: TopupPackage[]
}

export function getStripeSecretKey(): string | null {
  return getRuntimeEnv('STRIPE_SECRET_KEY')
}

export function getStripeWebhookSecret(): string | null {
  return getRuntimeEnv('STRIPE_WEBHOOK_SECRET')
}

export function getPromptPayId(): string | null {
  const envRaw = getRuntimeEnv('PROMPTPAY_ID')
  if (envRaw && formatPromptPayTarget(envRaw)) return envRaw
  const stored = getStoredMerchantQr()
  if (stored?.enabled && stored.promptPayId && formatPromptPayTarget(stored.promptPayId)) {
    return stored.promptPayId
  }
  return null
}

export function getSlipOkConfig(): { apiKey: string; branchId: string } | null {
  const apiKey = getRuntimeEnv('SLIPOK_API_KEY')
  const branchId = getRuntimeEnv('SLIPOK_BRANCH_ID')
  if (!apiKey || !branchId) return null
  return { apiKey, branchId }
}

export function getEasySlipConfig(): { apiKey: string } | null {
  const apiKey = getRuntimeEnv('EASYSLIP_API_KEY')
  if (!apiKey) return null
  return { apiKey }
}

export function getTopupGatewayPublicConfig(): TopupGatewayPublicConfig {
  const ppId = getPromptPayId()
  const slipOk = getSlipOkConfig()
  const easySlip = getEasySlipConfig()
  const stored = getStoredMerchantQr()
  const hasCustomQr = Boolean(stored?.enabled && stored.customQrDataUrl)
  const hasDefaultScbQr = Boolean(
    hasCustomQr && stored?.customQrDataUrl?.includes('Moment_1794989254278_6a17875f'),
  )
  const slipProvider: 'slipok' | 'easyslip' | null = slipOk ? 'slipok' : easySlip ? 'easyslip' : null
  return {
    stripeEnabled: Boolean(getStripeSecretKey()),
    slipVerifyEnabled: Boolean((ppId || hasCustomQr) && slipProvider),
    slipProvider,
    promptPayQrEnabled: Boolean(ppId || hasCustomQr),
    promptPayMaskedId: ppId ? maskPromptPayId(ppId) : hasDefaultScbQr ? 'xxx-xxx-6682 (SCB)' : null,
    merchantAccountName: stored?.enabled ? stored.accountName : null,
    merchantCustomQrUrl: hasCustomQr ? (stored?.customQrDataUrl ?? null) : null,
    currency: 'THB',
    packages: TOPUP_PACKAGES,
  }
}

export function getServerTopupDiagnostics() {
  const ppId = getPromptPayId()
  const stored = getStoredMerchantQr()
  return {
    stripeConfigured: Boolean(getStripeSecretKey()),
    stripeWebhookConfigured: Boolean(getStripeWebhookSecret()),
    slipOkConfigured: Boolean(getSlipOkConfig()),
    easySlipConfigured: Boolean(getEasySlipConfig()),
    promptPayConfigured: Boolean(ppId),
    merchantQrReady: Boolean(ppId || (stored?.enabled && stored.customQrDataUrl)),
    premiumSecretConfigured: isPersistentPremiumSecretConfigured(),
    appUrlConfigured: Boolean(getRuntimeEnv('NEXT_PUBLIC_APP_URL')),
  }
}

async function stripeRequest<T>(
  pathStr: string,
  method: 'GET' | 'POST',
  formParams?: URLSearchParams,
): Promise<T> {
  const key = getStripeSecretKey()
  if (!key) {
    throw new Error('เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า STRIPE_SECRET_KEY')
  }
  const res = await fetch(`https://api.stripe.com/v1${pathStr}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: method === 'POST' && formParams ? formParams.toString() : undefined,
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null
  if (!res.ok || !json) {
    throw new Error(json?.error?.message || `Stripe API error (${res.status})`)
  }
  return json
}

interface StripePaymentIntentResponse {
  id: string
  status: string
  amount: number
  amount_received?: number
  currency: string
  client_secret?: string
  metadata?: Record<string, string>
  next_action?: {
    type?: string
    promptpay_display_qr_code?: {
      data?: string
      hosted_instructions_url?: string
      image_url_png?: string
      image_url_svg?: string
    }
  }
}

interface StripeCheckoutSessionResponse {
  id: string
  url: string | null
  payment_status: string
  status: string
  amount_total: number | null
  currency: string | null
  payment_intent?: string | null
  metadata?: Record<string, string>
}

export async function createStripePromptPayIntent(input: {
  uid: string
  email: string
  characterId: string
  packageId: string
  isFirstPurchase: boolean
}): Promise<{
  orderId: string
  paymentIntentId: string
  amountThb: number
  qrImageUrl: string | null
  qrData: string | null
  hostedUrl: string | null
  reward: ReturnType<typeof calculateTopupReward>
}> {
  const pkg = getTopupPackage(input.packageId)
  if (!pkg) throw new Error('ไม่พบแพ็กเกจเติมเงินที่เลือก')
  const orderId = makeServerTxId('ORD')
  const reward = calculateTopupReward(pkg, input.isFirstPurchase)

  const params = new URLSearchParams()
  params.set('amount', String(pkg.priceThb * 100))
  params.set('currency', 'thb')
  params.append('payment_method_types[]', 'promptpay')
  params.set('payment_method_data[type]', 'promptpay')
  params.set('payment_method_data[billing_details][email]', input.email)
  params.set('confirm', 'true')
  params.set('description', `Pixel Quest: ${pkg.name} (${reward.totalDiamonds} Diamonds)`)
  params.set('metadata[orderId]', orderId)
  params.set('metadata[uid]', input.uid)
  params.set('metadata[characterId]', input.characterId)
  params.set('metadata[packageId]', pkg.packageId)
  params.set('metadata[baseDiamonds]', String(reward.baseDiamonds))
  params.set('metadata[bonusDiamonds]', String(reward.bonusDiamonds))
  params.set('metadata[totalDiamonds]', String(reward.totalDiamonds))
  params.set('metadata[vipExp]', String(reward.vipExp))
  params.set('metadata[fulfilled]', 'false')

  const pi = await stripeRequest<StripePaymentIntentResponse>('/payment_intents', 'POST', params)
  const ppQr = pi.next_action?.promptpay_display_qr_code
  let qrImageUrl = ppQr?.image_url_png || ppQr?.image_url_svg || null
  if (!qrImageUrl && ppQr?.data) {
    qrImageUrl = await generatePromptPayQrDataUrl(ppQr.data, pkg.priceThb).catch(() => null)
  }

  return {
    orderId,
    paymentIntentId: pi.id,
    amountThb: pkg.priceThb,
    qrImageUrl,
    qrData: ppQr?.data ?? null,
    hostedUrl: ppQr?.hosted_instructions_url ?? null,
    reward,
  }
}

export async function createStripeCheckoutSession(input: {
  uid: string
  email: string
  characterId: string
  packageId: string
  isFirstPurchase: boolean
  originUrl: string
}): Promise<{
  orderId: string
  sessionId: string
  checkoutUrl: string
  amountThb: number
  reward: ReturnType<typeof calculateTopupReward>
}> {
  const pkg = getTopupPackage(input.packageId)
  if (!pkg) throw new Error('ไม่พบแพ็กเกจเติมเงินที่เลือก')
  const orderId = makeServerTxId('ORD')
  const reward = calculateTopupReward(pkg, input.isFirstPurchase)

  const baseOrigin = (getRuntimeEnv('NEXT_PUBLIC_APP_URL') || input.originUrl).replace(/\/$/, '')
  const successUrl = `${baseOrigin}/?topup_session_id={CHECKOUT_SESSION_ID}&topup_order=${encodeURIComponent(orderId)}`
  const cancelUrl = `${baseOrigin}/?topup_cancelled=1`

  const params = new URLSearchParams()
  params.set('mode', 'payment')
  params.append('payment_method_types[]', 'card')
  params.append('payment_method_types[]', 'promptpay')
  params.set('customer_email', input.email)
  params.set('success_url', successUrl)
  params.set('cancel_url', cancelUrl)
  params.set('line_items[0][quantity]', '1')
  params.set('line_items[0][price_data][currency]', 'thb')
  params.set('line_items[0][price_data][unit_amount]', String(pkg.priceThb * 100))
  params.set('line_items[0][price_data][product_data][name]', `Pixel Quest · ${pkg.name}`)
  params.set(
    'line_items[0][price_data][product_data][description]',
    `${reward.totalDiamonds.toLocaleString()} Diamonds + ${reward.vipExp} VIP EXP`,
  )
  params.set('metadata[orderId]', orderId)
  params.set('metadata[uid]', input.uid)
  params.set('metadata[characterId]', input.characterId)
  params.set('metadata[packageId]', pkg.packageId)
  params.set('metadata[baseDiamonds]', String(reward.baseDiamonds))
  params.set('metadata[bonusDiamonds]', String(reward.bonusDiamonds))
  params.set('metadata[totalDiamonds]', String(reward.totalDiamonds))
  params.set('metadata[vipExp]', String(reward.vipExp))
  params.set('metadata[fulfilled]', 'false')

  const session = await stripeRequest<StripeCheckoutSessionResponse>('/checkout/sessions', 'POST', params)
  if (!session.url) {
    throw new Error('Stripe ไม่ได้ส่งลิงก์ชำระเงินกลับมา')
  }

  return {
    orderId,
    sessionId: session.id,
    checkoutUrl: session.url,
    amountThb: pkg.priceThb,
    reward,
  }
}

export async function verifyAndFulfillStripePayment(input: {
  uid: string
  paymentIntentId?: string
  sessionId?: string
}): Promise<
  | { ok: true; paid: false; status: string; message: string }
  | { ok: true; paid: true; order: TopupOrderRecord; message: string }
  | { ok: false; status: number; message: string }
> {
  if (!input.paymentIntentId && !input.sessionId) {
    return { ok: false, status: 400, message: 'ต้องระบุ paymentIntentId หรือ sessionId' }
  }

  let provider: TopupProvider = 'stripe_promptpay'
  let gatewayRef = ''
  let isPaid = false
  let paymentStatusText = 'pending'
  let amountSatang = 0
  let currency = ''
  let meta: Record<string, string> = {}

  if (input.sessionId) {
    provider = 'stripe_checkout'
    const session = await stripeRequest<StripeCheckoutSessionResponse>(
      `/checkout/sessions/${encodeURIComponent(input.sessionId)}`,
      'GET',
    )
    gatewayRef = session.id
    paymentStatusText = session.payment_status || session.status
    isPaid = session.payment_status === 'paid'
    amountSatang = Number(session.amount_total ?? 0)
    currency = String(session.currency ?? '').toLowerCase()
    meta = session.metadata ?? {}
  } else if (input.paymentIntentId) {
    provider = 'stripe_promptpay'
    const pi = await stripeRequest<StripePaymentIntentResponse>(
      `/payment_intents/${encodeURIComponent(input.paymentIntentId)}`,
      'GET',
    )
    gatewayRef = pi.id
    paymentStatusText = pi.status
    isPaid = pi.status === 'succeeded'
    amountSatang = Number(pi.amount_received ?? pi.amount ?? 0)
    currency = String(pi.currency ?? '').toLowerCase()
    meta = pi.metadata ?? {}
  }

  if (meta.uid && meta.uid !== input.uid) {
    return { ok: false, status: 403, message: 'รายการชำระเงินนี้ไม่ได้เป็นของบัญชีผู้เล่นปัจจุบัน' }
  }

  if (!isPaid) {
    return {
      ok: true,
      paid: false,
      status: paymentStatusText,
      message: 'ยังไม่ได้รับยอดชำระเงินจากธนาคาร (รอสแกนหรือกำลังดำเนินการ)',
    }
  }

  const pkg = getTopupPackage(meta.packageId || '')
  if (!pkg) {
    return { ok: false, status: 400, message: 'ข้อมูลแพ็กเกจในรายการชำระเงินไม่ถูกต้อง' }
  }
  if (currency !== 'thb' || amountSatang < pkg.priceThb * 100) {
    return { ok: false, status: 400, message: 'ยอดเงินที่ชำระไม่ตรงตามราคาแพ็กเกจ' }
  }
  if (meta.fulfilled === 'true') {
    return { ok: false, status: 409, message: 'รายการชำระเงินนี้ถูกเติมเพชรเข้าตัวละครไปแล้ว' }
  }
  if (!claimServerRequestId(`STRIPE:${gatewayRef}`, input.uid)) {
    return { ok: false, status: 409, message: 'รายการชำระเงินนี้ถูกประมวลผลซ้ำ' }
  }

  const orderId = meta.orderId || makeServerTxId('ORD')
  const characterId = meta.characterId || 'slot_1'
  const baseDiamonds = Math.max(pkg.baseDiamonds, Math.floor(Number(meta.baseDiamonds) || pkg.baseDiamonds))
  const bonusDiamonds = Math.max(0, Math.floor(Number(meta.bonusDiamonds) || pkg.bonusDiamonds))
  const totalDiamonds = baseDiamonds + bonusDiamonds
  const vipExpGranted = Math.max(0, Math.floor(Number(meta.vipExp) || pkg.vipExp))
  const txId = makeServerTxId('TOPTX')
  const timestampMs = Date.now()

  // Persist fulfillment marker directly in Stripe metadata to prevent double-credit across server restarts
  const markParams = new URLSearchParams()
  markParams.set('metadata[fulfilled]', 'true')
  markParams.set('metadata[fulfilled_tx]', txId)
  markParams.set('metadata[fulfilled_at]', String(timestampMs))
  await stripeRequest(
    input.sessionId
      ? `/checkout/sessions/${encodeURIComponent(gatewayRef)}`
      : `/payment_intents/${encodeURIComponent(gatewayRef)}`,
    'POST',
    markParams,
  )

  const serverSignature = signPremiumTx({
    txId,
    requestId: orderId,
    actorUid: input.uid,
    characterId,
    amount: totalDiamonds,
    type: 'earn',
    source: provider,
    timestampMs,
  })

  const order: TopupOrderRecord = {
    orderId,
    characterId,
    packageId: pkg.packageId,
    packageName: pkg.name,
    provider,
    gatewayRef,
    amountThb: pkg.priceThb,
    baseDiamonds,
    bonusDiamonds,
    totalDiamonds,
    vipExpGranted,
    status: 'credited',
    txId,
    serverVerified: true,
    serverSignature,
    createdAtMs: timestampMs,
  }

  return {
    ok: true,
    paid: true,
    order,
    message: `ยืนยันการชำระเงิน ฿${pkg.priceThb.toLocaleString()} สำเร็จ! รับ +${totalDiamonds.toLocaleString()} D`,
  }
}

export function verifyStripeWebhookSignature(rawBody: string, sigHeader: string | null): boolean {
  const secret = getStripeWebhookSecret()
  if (!secret || !sigHeader) return false

  const parts = sigHeader.split(',')
  let timestamp = ''
  const v1Sigs: string[] = []
  for (const part of parts) {
    const [k, v] = part.split('=')
    if (k === 't' && v) timestamp = v.trim()
    if (k === 'v1' && v) v1Sigs.push(v.trim())
  }
  if (!timestamp || v1Sigs.length === 0) return false

  const tsSec = Number(timestamp)
  if (!Number.isFinite(tsSec) || Math.abs(Math.floor(Date.now() / 1000) - tsSec) > 300) {
    return false
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')

  return v1Sigs.some((sig) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
    } catch {
      return false
    }
  })
}

export async function verifyBankSlipWithSlipOk(input: {
  uid: string
  characterId: string
  packageId: string
  isFirstPurchase: boolean
  imageBytes: Uint8Array
  fileName: string
  mimeType: string
}): Promise<{ ok: true; order: TopupOrderRecord; message: string } | { ok: false; status: number; message: string }> {
  const slipOk = getSlipOkConfig()
  const easySlip = getEasySlipConfig()
  const ppId = getPromptPayId()
  const stored = getStoredMerchantQr()
  const hasCustomQr = Boolean(stored?.enabled && stored.customQrDataUrl)
  const hasDefaultScbQr = Boolean(
    hasCustomQr && stored?.customQrDataUrl?.includes('Moment_1794989254278_6a17875f'),
  )

  if (!slipOk && !easySlip) {
    return {
      ok: false,
      status: 503,
      message: 'ระบบตรวจสลิปอัตโนมัติยังไม่ได้ตั้งค่า SLIPOK_API_KEY / SLIPOK_BRANCH_ID หรือ EASYSLIP_API_KEY บนเซิร์ฟเวอร์',
    }
  }
  if (!ppId && !hasCustomQr) {
    return {
      ok: false,
      status: 503,
      message: 'ร้านค้ายังไม่ได้ตั้งค่า PROMPTPAY_ID หรือรูป QR รับเงิน',
    }
  }

  const pkg = getTopupPackage(input.packageId)
  if (!pkg) {
    return { ok: false, status: 400, message: 'ไม่พบแพ็กเกจเติมเงินที่เลือก' }
  }

  const blob = new Blob([Buffer.from(input.imageBytes)], { type: input.mimeType || 'image/jpeg' })
  let transRef = ''
  let paidAmount = 0
  let receiverVal = ''

  if (slipOk) {
    const form = new FormData()
    form.append('files', blob, input.fileName || 'slip.jpg')
    form.append('log', 'true')
    form.append('amount', String(pkg.priceThb))

    const res = await fetch(`https://api.slipok.com/api/line/apikey/${encodeURIComponent(slipOk.branchId)}`, {
      method: 'POST',
      headers: {
        'x-authorization': slipOk.apiKey,
      },
      body: form,
      cache: 'no-store',
    })

    const json = (await res.json().catch(() => null)) as {
      success?: boolean
      message?: string
      data?: {
        transRef?: string
        amount?: number
        receiver?: { proxy?: { value?: string }; account?: { value?: string } }
      }
    } | null

    if (!res.ok || !json?.success || !json.data?.transRef) {
      return {
        ok: false,
        status: 400,
        message: json?.message || 'ตรวจสลิปไม่ผ่าน หรือสลิปนี้ถูกใช้งานไปแล้ว',
      }
    }
    transRef = json.data.transRef.trim().slice(0, 120)
    paidAmount = Number(json.data.amount ?? 0)
    receiverVal = (json.data.receiver?.proxy?.value || json.data.receiver?.account?.value || '').replace(/\D/g, '')
  } else if (easySlip) {
    const form = new FormData()
    form.append('file', blob, input.fileName || 'slip.jpg')

    const res = await fetch('https://developer.easyslip.com/api/v1/verify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${easySlip.apiKey}`,
      },
      body: form,
      cache: 'no-store',
    })

    const json = (await res.json().catch(() => null)) as {
      status?: number
      message?: string
      data?: {
        transRef?: string
        amount?: { amount?: number }
        receiver?: {
          account?: {
            proxy?: { account?: string }
            bank?: { account?: string }
          }
        }
      }
    } | null

    if (!res.ok || json?.status !== 200 || !json.data?.transRef) {
      return {
        ok: false,
        status: 400,
        message: json?.message || 'EasySlip ตรวจสลิปไม่ผ่าน กรุณาตรวจสอบรูปสลิปอีกครั้ง',
      }
    }
    transRef = json.data.transRef.trim().slice(0, 120)
    paidAmount = Number(json.data.amount?.amount ?? 0)
    receiverVal = (
      json.data.receiver?.account?.proxy?.account ||
      json.data.receiver?.account?.bank?.account ||
      ''
    ).replace(/\D/g, '')
  }

  if (!Number.isFinite(paidAmount) || paidAmount < pkg.priceThb) {
    return {
      ok: false,
      status: 400,
      message: `ยอดโอนในสลิป (${paidAmount} บาท) น้อยกว่าราคาแพ็กเกจ (${pkg.priceThb} บาท)`,
    }
  }

  const expectedDigits = ppId ? ppId.replace(/\D/g, '') : hasDefaultScbQr ? '6682' : ''
  if (receiverVal && expectedDigits.length >= 4 && !receiverVal.endsWith(expectedDigits.slice(-4))) {
    return {
      ok: false,
      status: 400,
      message: 'บัญชีผู้รับเงินในสลิปไม่ตรงกับบัญชีร้านค้า',
    }
  }

  if (isPersistentSlipRefUsed(transRef) || !claimServerRequestId(`SLIP:${transRef}`, input.uid) || !claimPersistentSlipRef(transRef)) {
    return { ok: false, status: 409, message: 'สลิปนี้ถูกใช้เติมเงินไปแล้ว (ป้องกันสลิปซ้ำ)' }
  }

  const reward = calculateTopupReward(pkg, input.isFirstPurchase)
  const orderId = makeServerTxId('ORD')
  const txId = makeServerTxId('TOPTX')
  const timestampMs = Date.now()
  const serverSignature = signPremiumTx({
    txId,
    requestId: orderId,
    actorUid: input.uid,
    characterId: input.characterId,
    amount: reward.totalDiamonds,
    type: 'earn',
    source: 'promptpay_slip',
    timestampMs,
  })

  const order: TopupOrderRecord = {
    orderId,
    characterId: input.characterId,
    packageId: pkg.packageId,
    packageName: pkg.name,
    provider: 'promptpay_slip',
    gatewayRef: transRef,
    amountThb: pkg.priceThb,
    baseDiamonds: reward.baseDiamonds,
    bonusDiamonds: reward.bonusDiamonds,
    totalDiamonds: reward.totalDiamonds,
    vipExpGranted: reward.vipExp,
    status: 'credited',
    txId,
    serverVerified: true,
    serverSignature,
    createdAtMs: timestampMs,
  }

  return {
    ok: true,
    order,
    message: `ตรวจสลิปสำเร็จ (Ref: ${transRef})! รับ +${reward.totalDiamonds.toLocaleString()} D`,
  }
}
