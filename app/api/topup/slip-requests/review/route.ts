import { NextResponse } from 'next/server'
import { isTopupAdminEmail } from '@/lib/game/permissions'
import { resolveActorFromRequest } from '@/lib/server/premium-security'
import { reviewStoredSlipRequest } from '@/lib/server/topup-store'

export async function POST(req: Request) {
  const auth = await resolveActorFromRequest(req)
  if (!('actor' in auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }
  if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified || !isTopupAdminEmail(auth.actor.email)) {
    return NextResponse.json({ ok: false, message: 'เฉพาะแอดมิน/GM เท่านั้นที่อนุมัติสลิปได้' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as {
    requestId?: unknown
    decision?: unknown
    reviewNote?: unknown
  } | null

  const requestId = typeof body?.requestId === 'string' ? body.requestId.trim() : ''
  const decision = body?.decision === 'approved' ? 'approved' : body?.decision === 'rejected' ? 'rejected' : null
  if (!requestId || !decision) {
    return NextResponse.json({ ok: false, message: 'ข้อมูลคำขอหรือสถานะไม่ถูกต้อง' }, { status: 400 })
  }

  const updated = reviewStoredSlipRequest(
    requestId,
    decision,
    auth.actor.uid,
    typeof body?.reviewNote === 'string' ? body.reviewNote : undefined,
  )
  if (!updated) {
    return NextResponse.json({ ok: false, message: 'ไม่พบคำขอสลิปนี้ในระบบ' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    request: updated,
    message:
      decision === 'approved'
        ? `อนุมัติคำขอ ${updated.requestId} (${updated.playerName}) แล้ว`
        : `ปฏิเสธคำขอ ${updated.requestId} แล้ว`,
  })
}
