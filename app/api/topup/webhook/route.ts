import { NextResponse } from 'next/server'
import { verifyStripeWebhookSignature } from '@/lib/server/topup-gateway'

export async function POST(req: Request) {
  const rawBody = await req.text()
  const sigHeader = req.headers.get('stripe-signature')

  if (!verifyStripeWebhookSignature(rawBody, sigHeader)) {
    return NextResponse.json({ ok: false, message: 'Invalid Stripe signature' }, { status: 400 })
  }

  const event = JSON.parse(rawBody) as {
    id?: string
    type?: string
    data?: { object?: { id?: string; metadata?: Record<string, string> } }
  }

  return NextResponse.json({
    ok: true,
    received: true,
    eventId: event.id ?? null,
    type: event.type ?? null,
  })
}
