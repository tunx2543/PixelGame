import { NextResponse } from 'next/server'
import {
  claimServerRequestId,
  makeServerTxId,
  resolveActorFromRequest,
  signPremiumTx,
} from '@/lib/server/premium-security'

export const SANDBOX_TEST_PRESETS = [500, 2000, 10000, 50000] as const
const MAX_SANDBOX_GRANT = 100_000
const MAX_GM_GRANT = 1_000_000

export async function POST(req: Request) {
  try {
    const auth = await resolveActorFromRequest(req)
    if (!auth.ok) {
      return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
    }

    const body = (await req.json().catch(() => null)) as {
      amount?: unknown
      characterId?: unknown
      requestId?: unknown
      mode?: unknown
    } | null

    if (!body) {
      return NextResponse.json({ ok: false, message: 'ข้อมูลคำขอไม่ถูกต้อง' }, { status: 400 })
    }

    const mode = body.mode === 'gm' ? 'gm' : 'sandbox'
    if (mode === 'gm' && !auth.actor.isGm) {
      return NextResponse.json(
        { ok: false, message: 'เฉพาะบัญชี GM ที่ยืนยันอีเมลแล้วเท่านั้นที่เสกเพชรแบบ GM ได้' },
        { status: 403 },
      )
    }

    const amount = Math.floor(Number(body.amount) || 0)
    const cap = mode === 'gm' ? MAX_GM_GRANT : MAX_SANDBOX_GRANT
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > cap) {
      return NextResponse.json(
        { ok: false, message: `จำนวนเพชรทดลองต้องอยู่ระหว่าง 1 – ${cap.toLocaleString()} D` },
        { status: 400 },
      )
    }

    const characterId =
      typeof body.characterId === 'string' && body.characterId.trim()
        ? body.characterId.trim().slice(0, 64)
        : 'slot_1'
    const requestId =
      typeof body.requestId === 'string' && body.requestId.trim()
        ? body.requestId.trim().slice(0, 96)
        : makeServerTxId('REQ')

    if (!claimServerRequestId(requestId, auth.actor.uid)) {
      return NextResponse.json(
        { ok: false, duplicate: true, message: 'คำขอรับเพชรทดลองซ้ำ (ป้องกันการทำรายการซ้ำ)' },
        { status: 409 },
      )
    }

    const txId = makeServerTxId('SBTX')
    const timestampMs = Date.now()
    const source = mode === 'gm' ? 'gm_grant' : 'sandbox_console'
    const serverSignature = signPremiumTx({
      txId,
      requestId,
      actorUid: auth.actor.uid,
      characterId,
      amount,
      type: 'sandbox_grant',
      source,
      timestampMs,
    })

    return NextResponse.json({
      ok: true,
      sandboxOnly: true,
      txId,
      requestId,
      actorUid: auth.actor.uid,
      isGm: auth.actor.isGm,
      source,
      amount,
      timestampMs,
      serverVerified: true,
      serverSignature,
      message: `เติมเพชรทดลอง Sandbox +${amount.toLocaleString()} D สำเร็จ (ไม่ใช่เงินจริง)`,
    })
  } catch {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาดระหว่างตรวจสอบการเติมเพชรทดลอง' }, { status: 500 })
  }
}
