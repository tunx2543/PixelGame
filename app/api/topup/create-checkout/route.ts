import { NextResponse } from 'next/server'
import { getTopupPackage } from '@/lib/game/premium/topup'
import { resolveActorFromRequest } from '@/lib/server/premium-security'
import { createStripeCheckoutSession, getStripeSecretKey } from '@/lib/server/topup-gateway'

export async function POST(req: Request) {
  try {
    const auth = await resolveActorFromRequest(req)
    if (!('actor' in auth)) {
      return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
    }
    if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified || !auth.actor.email) {
      return NextResponse.json(
        { ok: false, message: 'กรุณาเข้าสู่ระบบด้วย Google ที่ยืนยันอีเมลแล้วก่อนชำระเงินจริง' },
        { status: 401 },
      )
    }
    if (!getStripeSecretKey()) {
      return NextResponse.json(
        { ok: false, message: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า STRIPE_SECRET_KEY สำหรับ Stripe Checkout' },
        { status: 503 },
      )
    }

    const body = (await req.json().catch(() => null)) as {
      packageId?: unknown
      characterId?: unknown
      isFirstPurchase?: unknown
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
    const reqUrl = new URL(req.url)
    const session = await createStripeCheckoutSession({
      uid: auth.actor.uid,
      email: auth.actor.email,
      characterId,
      packageId: pkg.packageId,
      isFirstPurchase: Boolean(body?.isFirstPurchase),
      originUrl: reqUrl.origin,
    })

    return NextResponse.json({
      ok: true,
      provider: 'stripe_checkout',
      ...session,
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : 'ไม่สามารถสร้างหน้าชำระเงิน Stripe ได้' },
      { status: 500 },
    )
  }
}
