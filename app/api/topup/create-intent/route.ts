import { NextResponse } from 'next/server'
import {
  calculateTopupReward,
  generatePromptPayQrDataUrl,
  getTopupPackage,
} from '@/lib/game/premium/topup'
import { makeServerTxId, resolveActorFromRequest } from '@/lib/server/premium-security'
import {
  createStripePromptPayIntent,
  getPromptPayId,
  getStripeSecretKey,
} from '@/lib/server/topup-gateway'

export async function POST(req: Request) {
  try {
    const auth = await resolveActorFromRequest(req)
    if (!('actor' in auth)) {
      return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
    }
    if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified || !auth.actor.email) {
      return NextResponse.json(
        { ok: false, message: 'กรุณาเข้าสู่ระบบด้วย Google ที่ยืนยันอีเมลแล้วก่อนทำรายการเติมเงินจริง' },
        { status: 401 },
      )
    }

    const body = (await req.json().catch(() => null)) as {
      packageId?: unknown
      characterId?: unknown
      isFirstPurchase?: unknown
      provider?: unknown
    } | null

    const packageId = typeof body?.packageId === 'string' ? body.packageId.trim() : ''
    const pkg = getTopupPackage(packageId)
    if (!pkg) {
      return NextResponse.json({ ok: false, message: 'ไม่พบแพ็กเกจเติมเงินที่เลือก' }, { status: 400 })
    }
    const characterId =
      typeof body?.characterId === 'string' && body.characterId.trim()
        ? body.characterId.trim().slice(0, 64)
        : 'slot_1'
    const isFirstPurchase = Boolean(body?.isFirstPurchase)
    const provider = body?.provider === 'promptpay_slip' ? 'promptpay_slip' : 'stripe_promptpay'

    if (provider === 'promptpay_slip') {
      const ppId = getPromptPayId()
      if (!ppId) {
        return NextResponse.json(
          { ok: false, message: 'ยังไม่ได้ตั้งค่า PROMPTPAY_ID ใน Environment ของเซิร์ฟเวอร์' },
          { status: 503 },
        )
      }
      const qrDataUrl = await generatePromptPayQrDataUrl(ppId, pkg.priceThb)
      const reward = calculateTopupReward(pkg, isFirstPurchase)
      return NextResponse.json({
        ok: true,
        provider: 'promptpay_slip',
        orderId: makeServerTxId('ORD'),
        amountThb: pkg.priceThb,
        qrImageUrl: qrDataUrl,
        reward,
      })
    }

    if (!getStripeSecretKey()) {
      return NextResponse.json(
        { ok: false, message: 'ระบบ Stripe ยังไม่ได้ตั้งค่า STRIPE_SECRET_KEY บนเซิร์ฟเวอร์' },
        { status: 503 },
      )
    }

    const intent = await createStripePromptPayIntent({
      uid: auth.actor.uid,
      email: auth.actor.email,
      characterId,
      packageId: pkg.packageId,
      isFirstPurchase,
    })

    return NextResponse.json({
      ok: true,
      provider: 'stripe_promptpay',
      ...intent,
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : 'ไม่สามารถสร้างคำขอชำระเงินได้' },
      { status: 500 },
    )
  }
}
