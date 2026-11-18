import { NextResponse } from 'next/server'
import { getTopupPackage } from '@/lib/game/premium/topup'
import { verifyStripeWebhookSignature } from '@/lib/server/topup-gateway'
import { markStripeWebhookFailed, recordStripeWebhookFulfillment } from '@/lib/server/topup-store'

interface StripeWebhookObject {
  id?: string
  payment_status?: string
  status?: string
  amount_total?: number | null
  amount_received?: number | null
  amount?: number | null
  currency?: string | null
  metadata?: Record<string, string>
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const sigHeader = req.headers.get('stripe-signature')

  if (!verifyStripeWebhookSignature(rawBody, sigHeader)) {
    return NextResponse.json({ ok: false, message: 'Invalid Stripe signature' }, { status: 400 })
  }

  let event: {
    id?: string
    type?: string
    data?: { object?: StripeWebhookObject }
  }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ ok: false, message: 'Malformed webhook JSON' }, { status: 400 })
  }

  const obj = event.data?.object
  const eventType = event.type ?? ''

  if (obj?.id && (eventType === 'checkout.session.completed' || eventType === 'payment_intent.succeeded')) {
    const meta = obj.metadata ?? {}
    const pkg = getTopupPackage(meta.packageId || '')
    const currency = String(obj.currency ?? '').toLowerCase()
    const amountSatang = Number(
      eventType === 'checkout.session.completed' ? obj.amount_total ?? 0 : obj.amount_received ?? obj.amount ?? 0,
    )
    const isPaid =
      eventType === 'checkout.session.completed'
        ? obj.payment_status === 'paid'
        : obj.status === 'succeeded'

    if (isPaid && pkg && currency === 'thb' && amountSatang >= pkg.priceThb * 100 && meta.uid) {
      const baseDiamonds = Math.max(pkg.baseDiamonds, Math.floor(Number(meta.baseDiamonds) || pkg.baseDiamonds))
      const bonusDiamonds = Math.max(0, Math.floor(Number(meta.bonusDiamonds) || pkg.bonusDiamonds))
      recordStripeWebhookFulfillment({
        gatewayRef: obj.id,
        orderId: meta.orderId || `WH-${obj.id.slice(-10)}`,
        uid: meta.uid,
        characterId: meta.characterId || 'slot_1',
        packageId: pkg.packageId,
        packageName: pkg.name,
        provider: eventType === 'checkout.session.completed' ? 'stripe_checkout' : 'stripe_promptpay',
        amountThb: pkg.priceThb,
        baseDiamonds,
        bonusDiamonds,
        totalDiamonds: baseDiamonds + bonusDiamonds,
        vipExpGranted: Math.max(0, Math.floor(Number(meta.vipExp) || pkg.vipExp)),
        status: 'paid',
        claimed: meta.fulfilled === 'true',
        createdAtMs: Date.now(),
      })
    }
  } else if (obj?.id && eventType === 'payment_intent.payment_failed') {
    markStripeWebhookFailed(obj.id)
  }

  return NextResponse.json({
    ok: true,
    received: true,
    eventId: event.id ?? null,
    type: eventType || null,
  })
}
