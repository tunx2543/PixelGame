import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { isCloudflareWorkersRuntime } from '@/lib/server/runtime-store'
import { isTopupAdminEmail, normalizeGameUidInput } from '@/lib/game/permissions'
import { calculateTopupReward, getTopupPackage, type TopupSlipRequestRecord } from '@/lib/game/premium/topup'
import { resolveActorFromRequest } from '@/lib/server/premium-security'
import {
  addStoredSlipRequest,
  isPersistentSlipHashUsed,
  listAllStoredSlipRequests,
  listStoredSlipRequestsForOwner,
} from '@/lib/server/topup-store'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
}

function computeDataUrlSha256(dataUrl: string): string {
  const commaIdx = dataUrl.indexOf(',')
  const payload = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl
  return crypto.createHash('sha256').update(payload).digest('hex')
}

export async function GET(req: Request) {
  const auth = await resolveActorFromRequest(req)
  if (!('actor' in auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }
  if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified) {
    return NextResponse.json({ ok: true, isAdmin: false, myRequests: [], adminQueue: [] }, { headers: NO_STORE_HEADERS })
  }
  const isAdmin = isTopupAdminEmail(auth.actor.email)
  return NextResponse.json(
    {
      ok: true,
      isAdmin,
      myRequests: listStoredSlipRequestsForOwner(auth.actor.uid),
      adminQueue: isAdmin ? listAllStoredSlipRequests(50) : [],
    },
    { headers: NO_STORE_HEADERS },
  )
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
    requestId?: unknown
    packageId?: unknown
    characterId?: unknown
    playerName?: unknown
    gameUid?: unknown
    isFirstPurchase?: unknown
    slipDataUrl?: unknown
    slipNote?: unknown
    slipHash?: unknown
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

  // Always hash the actual uploaded bytes on the server; never trust a client-supplied hash.
  const slipHash = computeDataUrlSha256(slipDataUrl)

  if (!isCloudflareWorkersRuntime() && isPersistentSlipHashUsed(slipHash)) {
    return NextResponse.json(
      { ok: false, message: 'สลิปรูปนี้ถูกส่งเข้าระบบแล้ว (ตรวจพบแฮชสลิปซ้ำ ป้องกันการใช้สลิปเดิมซ้ำ)' },
      { status: 409 },
    )
  }

  const reward = calculateTopupReward(pkg, Boolean(body?.isFirstPurchase))
  // Stable document IDs make the same slip image collide across accounts and retries.
  const requestId = `SLIP-${slipHash.slice(0, 48)}`
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
    slipHash,
    createdAtMs: Date.now(),
  }

  if (!isCloudflareWorkersRuntime()) addStoredSlipRequest(record)
  return NextResponse.json({
    requiresFirestorePersistence: isCloudflareWorkersRuntime(),
    ok: true,
    request: record,
    message: `ส่งสลิปสำเร็จ (${requestId})! รอแอดมิน/GM ตรวจสอบแล้วกดรับเพชรได้ทันที`,
  })
}
