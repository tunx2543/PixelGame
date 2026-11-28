import { NextResponse } from 'next/server'
import {
  claimServerRequestId,
  isValidCharacterIdFormat,
  makeServerTxId,
  resolveActorFromRequest,
  signPremiumTx,
} from '@/lib/server/premium-security'

export const SANDBOX_TEST_PRESETS = [500, 2000, 10000, 50000] as const
const MAX_GM_GRANT = 1_000_000

export async function POST(req: Request) {
  try {
    const auth = await resolveActorFromRequest(req)
    if (!('actor' in auth)) {
      return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
    }

    if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified) {
      return NextResponse.json(
        { ok: false, message: 'ต้องเข้าสู่ระบบด้วยบัญชี GM ที่ยืนยันอีเมลแล้วเท่านั้น' },
        { status: 401 },
      )
    }

    if (!auth.actor.isGm) {
      return NextResponse.json(
        { ok: false, message: 'เฉพาะบัญชี GM ที่ได้รับอนุญาตเท่านั้นที่ใช้งาน Sandbox Test Console ได้' },
        { status: 403 },
      )
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

    if (body.mode !== undefined && body.mode !== 'sandbox' && body.mode !== 'gm') {
      return NextResponse.json({ ok: false, message: 'โหมดคำขอ Sandbox ไม่ถูกต้อง' }, { status: 400 })
    }

    if (body.characterId !== undefined && !isValidCharacterIdFormat(body.characterId)) {
      return NextResponse.json({ ok: false, message: 'รหัสตัวละครไม่ถูกต้อง' }, { status: 400 })
    }

    const amount = Math.floor(Number(body.amount) || 0)
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_GM_GRANT) {
      return NextResponse.json(
        { ok: false, message: `จำนวนเพชร GM Sandbox ต้องอยู่ระหว่าง 1 – ${MAX_GM_GRANT.toLocaleString()} D` },
        { status: 400 },
      )
    }

    const characterId = isValidCharacterIdFormat(body.characterId)
      ? body.characterId.trim()
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
    const source = body.mode === 'gm' ? 'gm_grant' : 'gm_sandbox_console'
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
      isGm: true,
      source,
      amount,
      timestampMs,
      serverVerified: true,
      serverSignature,
      message: `เติมเพชร GM Sandbox +${amount.toLocaleString()} D สำเร็จ`,
    })
  } catch {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาดระหว่างตรวจสอบการเติมเพชรทดลอง' }, { status: 500 })
  }
}
