import { NextResponse } from 'next/server'
import {
  claimServerRequestId,
  extractBearerToken,
  fetchAuthoritativeCharacterState,
  makeServerTxId,
  resolveActorFromRequest,
  signPremiumTx,
  verifyCatalogPurchase,
} from '@/lib/server/premium-security'
import type { VipState } from '@/lib/game/premium/types'

export async function POST(req: Request) {
  try {
    const auth = await resolveActorFromRequest(req)
    if (!('actor' in auth)) {
      return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
    }

    if (auth.actor.authMode === 'firebase' && !auth.actor.emailVerified) {
      return NextResponse.json(
        { ok: false, message: 'กรุณายืนยันอีเมลก่อนทำรายการร้านค้าพรีเมียม' },
        { status: 401 },
      )
    }

    const body = (await req.json().catch(() => null)) as {
      productId?: unknown
      qty?: unknown
      characterId?: unknown
      requestId?: unknown
      currentDiamonds?: unknown
      previousPurchaseCount?: unknown
      vip?: VipState
    } | null

    if (!body || typeof body.productId !== 'string') {
      return NextResponse.json({ ok: false, message: 'ระบุ productId ไม่ถูกต้อง' }, { status: 400 })
    }

    const characterId =
      typeof body.characterId === 'string' && body.characterId.trim()
        ? body.characterId.trim().slice(0, 64)
        : 'slot_1'

    let currentDiamonds = Math.max(0, Math.floor(Number(body.currentDiamonds ?? 0) || 0))
    let previousPurchaseCount = Math.max(0, Math.floor(Number(body.previousPurchaseCount ?? 0) || 0))
    let vipState = body.vip

    if (auth.actor.authMode === 'firebase') {
      const bearerToken = extractBearerToken(req)
      const authoritative = bearerToken
        ? await fetchAuthoritativeCharacterState(auth.actor.uid, characterId, bearerToken)
        : null
      if (!authoritative) {
        return NextResponse.json(
          { ok: false, message: 'ไม่สามารถตรวจสอบข้อมูลตัวละครจากฐานข้อมูลกลางได้ กรุณาลองใหม่อีกครั้ง' },
          { status: 503 },
        )
      }
      if (authoritative.exists) {
        currentDiamonds = authoritative.diamonds
        previousPurchaseCount = authoritative.purchaseCounts[body.productId] ?? 0
        vipState = authoritative.vip
      } else {
        currentDiamonds = 0
        previousPurchaseCount = 0
        vipState = undefined
      }
    }

    const requestId =
      typeof body.requestId === 'string' && body.requestId.trim()
        ? body.requestId.trim().slice(0, 96)
        : makeServerTxId('REQ')

    if (!claimServerRequestId(requestId, auth.actor.uid)) {
      return NextResponse.json(
        { ok: false, duplicate: true, message: 'คำสั่งซื้อซ้ำกำลังถูกประมวลผล' },
        { status: 409 },
      )
    }

    const check = verifyCatalogPurchase({
      productId: body.productId,
      qty: Number(body.qty ?? 1),
      currentDiamonds,
      previousPurchaseCount,
      vip: vipState,
    })

    if (!check.ok || !check.product || check.totalCost === undefined || check.nextDiamonds === undefined) {
      return NextResponse.json({ ok: false, message: check.message }, { status: check.status })
    }

    const txId = makeServerTxId('PRTX')
    const receiptId = makeServerTxId('RCPT')
    const timestampMs = Date.now()
    const isServerSigned = auth.actor.authMode === 'firebase'
    const serverSignature = isServerSigned
      ? signPremiumTx({
          txId,
          requestId,
          actorUid: auth.actor.uid,
          characterId,
          amount: check.totalCost,
          type: 'spend',
          source: 'premium_shop',
          timestampMs,
        })
      : null

    return NextResponse.json({
      ok: true,
      txId,
      receiptId,
      requestId,
      actorUid: auth.actor.uid,
      isGm: auth.actor.isGm,
      productId: check.product.productId,
      itemId: check.product.itemId,
      unitPrice: check.unitPrice,
      totalCost: check.totalCost,
      nextDiamonds: check.nextDiamonds,
      timestampMs,
      serverVerified: isServerSigned,
      serverSignature,
      message: `ยืนยันการซื้อ ${check.product.name} สำเร็จ`,
    })
  } catch {
    return NextResponse.json({ ok: false, message: 'ไม่สามารถตรวจสอบคำสั่งซื้อได้' }, { status: 500 })
  }
}
