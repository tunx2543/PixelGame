import { NextResponse } from 'next/server'
import { makeServerTxId, resolveActorFromRequest, signPremiumTx } from '@/lib/server/premium-security'
import {
  claimRedeemCodeInStore,
  deleteRedeemCodeFromStore,
  listRedeemCodesFromStore,
  toggleRedeemCodeInStore,
  upsertRedeemCodeInStore,
} from '@/lib/server/redeem-codes-store'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
}

export async function GET(req: Request) {
  const auth = await resolveActorFromRequest(req)
  if (!('actor' in auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }
  if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบบัญชี Google ที่ยืนยันอีเมลแล้ว' }, { status: 401 })
  }
  if (!auth.actor.isGm) {
    return NextResponse.json({ ok: false, message: 'รายการโค้ดทั้งหมดสงวนเฉพาะ GM เท่านั้น' }, { status: 403 })
  }
  return NextResponse.json(
    {
      ok: true,
      codes: listRedeemCodesFromStore(),
    },
    { headers: NO_STORE_HEADERS },
  )
}

export async function POST(req: Request) {
  const auth = await resolveActorFromRequest(req)
  if (!('actor' in auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body.action !== 'string') {
    return NextResponse.json({ ok: false, message: 'คำขอไม่ถูกต้อง' }, { status: 400 })
  }

  if (body.action === 'claim') {
    const rawCode = typeof body.code === 'string' ? body.code : ''
    const characterId =
      typeof body.characterId === 'string' && body.characterId.trim()
        ? body.characterId.trim().slice(0, 64)
        : 'slot_1'
    const playerName =
      typeof body.playerName === 'string' && body.playerName.trim()
        ? body.playerName.trim().slice(0, 40)
        : 'นักผจญภัย'
    const gameUid = typeof body.gameUid === 'string' ? body.gameUid.trim() : '1000'
    const rawGuestKey =
      typeof body.guestClientId === 'string'
        ? body.guestClientId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
        : ''

    const claimKey =
      auth.actor.authMode === 'firebase' && auth.actor.emailVerified
        ? `fb:${auth.actor.uid}`
        : `guest:${rawGuestKey || 'default'}`

    const claimRes = claimRedeemCodeInStore({
      code: rawCode,
      claimKey,
      uid: auth.actor.uid,
      authMode: auth.actor.authMode,
      characterId,
      playerName,
      gameUid,
    })

    if ('message' in claimRes) {
      return NextResponse.json(
        { ok: false, errorCode: claimRes.code, message: claimRes.message },
        { status: claimRes.status, headers: NO_STORE_HEADERS },
      )
    }

    const nowMs = claimRes.receipt.claimedAtMs
    const txId = makeServerTxId('RDM')
    const requestId = `REDEEM:${claimRes.record.code}`
    const serverSignature =
      claimRes.record.diamonds > 0
        ? signPremiumTx({
            txId,
            requestId,
            actorUid: auth.actor.uid,
            characterId: claimRes.receipt.characterId,
            amount: claimRes.record.diamonds,
            type: 'earn',
            source: 'redeem_code',
            timestampMs: nowMs,
          })
        : undefined

    return NextResponse.json(
      {
        ok: true,
        record: claimRes.record,
        claimTx: {
          txId,
          requestId,
          actorUid: auth.actor.uid,
          timestampMs: nowMs,
          serverSignature,
        },
      },
      { headers: NO_STORE_HEADERS },
    )
  }

  // GM management actions below require verified GM Firebase account
  if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบบัญชี Google ที่ยืนยันอีเมลแล้ว' }, { status: 401 })
  }
  if (!auth.actor.isGm) {
    return NextResponse.json({ ok: false, message: 'คำสั่งนี้สงวนเฉพาะ GM สูงสุดเท่านั้น' }, { status: 403 })
  }

  if (body.action === 'upsert') {
    const res = upsertRedeemCodeInStore({
      code: typeof body.code === 'string' ? body.code : '',
      label: typeof body.label === 'string' ? body.label : undefined,
      gold: Number(body.gold ?? 0),
      diamonds: Number(body.diamonds ?? 0),
      itemId: typeof body.itemId === 'string' ? body.itemId : null,
      qty: Number(body.qty ?? 1),
      plus: Number(body.plus ?? 0),
      vipExp: Number(body.vipExp ?? 0),
      maxUses: Number(body.maxUses ?? 1),
      expiresHours: body.expiresHours === null ? null : Number(body.expiresHours ?? 0),
      active: typeof body.active === 'boolean' ? body.active : true,
      createdByUid: auth.actor.uid,
    })
    if ('message' in res) {
      return NextResponse.json({ ok: false, message: res.message }, { status: 400, headers: NO_STORE_HEADERS })
    }
    return NextResponse.json({ ok: true, record: res.record }, { headers: NO_STORE_HEADERS })
  }

  if (body.action === 'toggle') {
    const code = typeof body.code === 'string' ? body.code : ''
    const active = Boolean(body.active)
    const res = toggleRedeemCodeInStore(code, active)
    if ('message' in res) {
      return NextResponse.json({ ok: false, message: res.message }, { status: 404, headers: NO_STORE_HEADERS })
    }
    return NextResponse.json({ ok: true, record: res.record }, { headers: NO_STORE_HEADERS })
  }

  if (body.action === 'delete') {
    const code = typeof body.code === 'string' ? body.code : ''
    const deleted = deleteRedeemCodeFromStore(code)
    return NextResponse.json(
      { ok: deleted, message: deleted ? `ลบโค้ด ${code} แล้ว` : 'ไม่พบโค้ดที่ต้องการลบ' },
      { status: deleted ? 200 : 404, headers: NO_STORE_HEADERS },
    )
  }

  return NextResponse.json({ ok: false, message: 'ไม่รู้จัก action นี้' }, { status: 400, headers: NO_STORE_HEADERS })
}
