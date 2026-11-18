import { NextResponse } from 'next/server'
import type { TopupOrderRecord } from '@/lib/game/premium/topup'
import { claimServerRequestId, makeServerTxId, resolveActorFromRequest, signPremiumTx } from '@/lib/server/premium-security'
import { getStoredSlipRequest, markStoredSlipRequestClaimed } from '@/lib/server/topup-store'

export async function POST(req: Request) {
  const auth = await resolveActorFromRequest(req)
  if (!('actor' in auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }
  if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified) {
    return NextResponse.json({ ok: false, message: 'กรุณาเข้าสู่ระบบด้วย Google ก่อนรับเพชร' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as { requestId?: unknown } | null
  const requestId = typeof body?.requestId === 'string' ? body.requestId.trim() : ''
  if (!requestId) {
    return NextResponse.json({ ok: false, message: 'ไม่พบรหัสคำขอ' }, { status: 400 })
  }

  const existing = getStoredSlipRequest(requestId)
  if (!existing || existing.ownerId !== auth.actor.uid) {
    return NextResponse.json({ ok: false, message: 'ไม่พบคำขอสลิปของบัญชีนี้' }, { status: 404 })
  }
  if (existing.status !== 'approved') {
    return NextResponse.json({ ok: false, message: 'คำขอนี้ยังไม่ได้รับการอนุมัติ' }, { status: 400 })
  }
  if (existing.claimed) {
    return NextResponse.json({ ok: false, message: 'รับเพชรจากคำขอนี้ไปแล้ว' }, { status: 409 })
  }
  if (!claimServerRequestId(`SLIPCLAIM:${requestId}`, auth.actor.uid)) {
    return NextResponse.json({ ok: false, message: 'คำขอนี้กำลังดำเนินการหรือถูกรับไปแล้ว' }, { status: 409 })
  }

  const claimedReq = markStoredSlipRequestClaimed(requestId, auth.actor.uid)
  if (!claimedReq) {
    return NextResponse.json({ ok: false, message: 'ไม่สามารถยืนยันการรับเพชรได้' }, { status: 409 })
  }

  const orderId = makeServerTxId('ORD')
  const txId = makeServerTxId('TOPTX')
  const timestampMs = Date.now()
  const serverSignature = signPremiumTx({
    txId,
    requestId: orderId,
    actorUid: auth.actor.uid,
    characterId: claimedReq.characterId,
    amount: claimedReq.totalDiamonds,
    type: 'earn',
    source: 'promptpay_manual_gm',
    timestampMs,
  })

  const order: TopupOrderRecord = {
    orderId,
    characterId: claimedReq.characterId,
    packageId: claimedReq.packageId,
    packageName: claimedReq.packageName,
    provider: 'promptpay_manual_gm',
    gatewayRef: claimedReq.requestId,
    amountThb: claimedReq.amountThb,
    baseDiamonds: claimedReq.baseDiamonds,
    bonusDiamonds: claimedReq.bonusDiamonds,
    totalDiamonds: claimedReq.totalDiamonds,
    vipExpGranted: claimedReq.vipExpGranted,
    status: 'credited',
    txId,
    serverVerified: true,
    serverSignature,
    createdAtMs: timestampMs,
  }

  return NextResponse.json({
    ok: true,
    order,
    message: `รับเพชร +${order.totalDiamonds.toLocaleString()} D สำเร็จ!`,
  })
}
