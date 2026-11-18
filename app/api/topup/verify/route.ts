import { NextResponse } from 'next/server'
import { resolveActorFromRequest } from '@/lib/server/premium-security'
import { getStripeSecretKey, verifyAndFulfillStripePayment } from '@/lib/server/topup-gateway'

export async function POST(req: Request) {
  try {
    const auth = await resolveActorFromRequest(req)
    if (!('actor' in auth)) {
      return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
    }
    if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified) {
      return NextResponse.json(
        { ok: false, message: 'กรุณาเข้าสู่ระบบด้วย Google ที่ยืนยันอีเมลแล้ว' },
        { status: 401 },
      )
    }
    if (!getStripeSecretKey()) {
      return NextResponse.json(
        { ok: false, message: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า STRIPE_SECRET_KEY' },
        { status: 503 },
      )
    }

    const body = (await req.json().catch(() => null)) as {
      paymentIntentId?: unknown
      sessionId?: unknown
    } | null

    const result = await verifyAndFulfillStripePayment({
      uid: auth.actor.uid,
      paymentIntentId: typeof body?.paymentIntentId === 'string' ? body.paymentIntentId.trim() : undefined,
      sessionId: typeof body?.sessionId === 'string' ? body.sessionId.trim() : undefined,
    })

    if (!('paid' in result)) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : 'ตรวจสอบสถานะการชำระเงินไม่สำเร็จ' },
      { status: 500 },
    )
  }
}
