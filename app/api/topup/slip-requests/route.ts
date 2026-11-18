import { NextResponse } from 'next/server'
import { isTopupAdminEmail, normalizeGameUidInput } from '@/lib/game/permissions'
import { calculateTopupReward, getTopupPackage, type TopupSlipRequestRecord } from '@/lib/game/premium/topup'
import { makeServerTxId, resolveActorFromRequest } from '@/lib/server/premium-security'
import {
  addStoredSlipRequest,
  listAllStoredSlipRequests,
  listStoredSlipRequestsForOwner,
} from '@/lib/server/topup-store'

export async function GET(req: Request) {
  const auth = await resolveActorFromRequest(req)
  if (!('actor' in auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }
  if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified) {
    return NextResponse.json({ ok: true, isAdmin: false, myRequests: [], adminQueue: [] })
  }
  const isAdmin = isTopupAdminEmail(auth.actor.email)
  return NextResponse.json({
    ok: true,
    isAdmin,
    myRequests: listStoredSlipRequestsForOwner(auth.actor.uid),
    adminQueue: isAdmin ? listAllStoredSlipRequests(50) : [],
  })
}

export async function POST(req: Request) {
  const auth = await resolveActorFromRequest(req)
  if (!('actor' in auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }
  if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified || !auth.actor.email) {
    return NextResponse.json(
      { ok: false, message: 'กรุณาเข้าสู่ระบบด้วย Google ที่ยืนยันอีเมลแล้วก่อนส่งสลิป' },
      { status: 401 },
    )
  }

  const body = (await req.json().catch(() => null)) as {
    packageId?: unknown
    characterId?: unknown
    playerName?: unknown
    gameUid?: unknown
    isFirstPurchase?: unknown
    slipDataUrl?: unknown
    slipNote?: unknown
  } | null

  const packageId = typeof body?.packageId === 'string' ? body.packageId.trim() : ''
  const pkg = getTopupPackage(packageId)
  if (!pkg) {
    return NextResponse.json({ ok: false, message: 'ไม่พบแพ็กเกจเติมเงินที่เลือก' }, { status: 400 })
  }

  const slipDataUrl = typeof body?.slipDataUrl === 'string' ? body.slipDataUrl.trim() : ''
  if (!slipDataUrl.startsWith('data:image/') || slipDataUrl.length > 350000) {
    return NextResponse.json({ ok: false, message: 'รูปสลิปไม่ถูกต้องหรือขนาดใหญ่เกินไป' }, { status: 400 })
  }

  const reward = calculateTopupReward(pkg, Boolean(body?.isFirstPurchase))
  const requestId = makeServerTxId('SLIP')
  const record: TopupSlipRequestRecord = {
    requestId,
    ownerId: auth.actor.uid,
    ownerEmail: auth.actor.email.slice(0, 320),
    playerName: (typeof body?.playerName === 'string' ? body.playerName.trim() : 'นักผจญภัย').slice(0, 40) || 'นักผจญภัย',
    gameUid: normalizeGameUidInput(typeof body?.gameUid === 'string' ? body.gameUid : null) || '1000',
    characterId:
      typeof body?.characterId === 'string' && body.characterId.trim()
        ? body.characterId.trim().slice(0, 64)
        : 'slot_1',
    packageId: pkg.packageId,
    packageName: pkg.name,
    amountThb: pkg.priceThb,
    baseDiamonds: reward.baseDiamonds,
    bonusDiamonds: reward.bonusDiamonds,
    totalDiamonds: reward.totalDiamonds,
    vipExpGranted: reward.vipExp,
    slipDataUrl,
    slipNote: (typeof body?.slipNote === 'string' ? body.slipNote.trim() : '').slice(0, 180),
    status: 'pending',
    claimed: false,
    claimedAtMs: null,
    reviewedByUid: null,
    reviewNote: null,
    createdAtMs: Date.now(),
  }

  addStoredSlipRequest(record)
  return NextResponse.json({
    ok: true,
    request: record,
    message: `ส่งสลิปสำเร็จ (${requestId})! รอแอดมิน/GM ตรวจสอบแล้วกดรับเพชรได้ทันที`,
  })
}
