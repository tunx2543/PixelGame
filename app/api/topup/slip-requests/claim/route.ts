import { NextResponse } from 'next/server'
import firebaseConfig from '@/firebase-applet-config.json'
import { getTopupPackage, isValidTopupPackageReward, type TopupOrderRecord } from '@/lib/game/premium/topup'
import { claimServerRequestId, makeServerTxId, resolveActorFromRequest, signPremiumTx } from '@/lib/server/premium-security'
import {
  claimPersistentSlipHash,
  getStoredSlipRequest,
  isPersistentSlipHashUsed,
  markStoredSlipRequestClaimed,
} from '@/lib/server/topup-store'

interface FirestoreSlipFields {
  ownerId?: { stringValue?: string }
  characterId?: { stringValue?: string }
  packageId?: { stringValue?: string }
  packageName?: { stringValue?: string }
  amountThb?: { integerValue?: string }
  baseDiamonds?: { integerValue?: string }
  bonusDiamonds?: { integerValue?: string }
  totalDiamonds?: { integerValue?: string }
  vipExpGranted?: { integerValue?: string }
  status?: { stringValue?: string }
  claimed?: { booleanValue?: boolean }
  slipHash?: { stringValue?: string }
}

async function fetchApprovedFirestoreSlip(
  requestId: string,
  bearerToken: string,
  expectedUid: string,
): Promise<{
  characterId: string
  packageId: string
  packageName: string
  amountThb: number
  baseDiamonds: number
  bonusDiamonds: number
  totalDiamonds: number
  vipExpGranted: number
  slipHash?: string
} | null> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(firebaseConfig.firestoreDatabaseId)}/documents/topupSlipRequests/${encodeURIComponent(requestId)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const doc = (await res.json().catch(() => null)) as { fields?: FirestoreSlipFields } | null
    const f = doc?.fields
    if (!f) return null
    if (f.ownerId?.stringValue !== expectedUid) return null
    if (f.status?.stringValue !== 'approved') return null
    if (f.claimed?.booleanValue === true) return null

    const packageId = f.packageId?.stringValue || ''
    const pkg = getTopupPackage(packageId)
    if (!pkg) return null
    const amountThb = Number(f.amountThb?.integerValue ?? 0)
    const baseDiamonds = Number(f.baseDiamonds?.integerValue ?? 0)
    const bonusDiamonds = Number(f.bonusDiamonds?.integerValue ?? 0)
    const totalDiamonds = Number(f.totalDiamonds?.integerValue ?? 0)
    const vipExpGranted = Number(f.vipExpGranted?.integerValue ?? 0)
    if (
      totalDiamonds !== baseDiamonds + bonusDiamonds ||
      !isValidTopupPackageReward(packageId, amountThb, baseDiamonds, bonusDiamonds, vipExpGranted)
    ) {
      return null
    }
    return {
      characterId: f.characterId?.stringValue || 'slot_1',
      packageId,
      packageName: f.packageName?.stringValue || pkg.name,
      amountThb,
      baseDiamonds,
      bonusDiamonds,
      totalDiamonds,
      vipExpGranted,
      slipHash: f.slipHash?.stringValue,
    }
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const auth = await resolveActorFromRequest(req)
  if (!('actor' in auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }
  if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified) {
    return NextResponse.json({ ok: false, message: 'กรุณาเข้าสู่ระบบด้วย Google ก่อนรับเพชร' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as { requestId?: unknown } | null
  const requestId = typeof body?.requestId === 'string' ? body.requestId.trim().replace(/[^a-zA-Z0-9_-]/g, '') : ''
  if (!requestId) {
    return NextResponse.json({ ok: false, message: 'ไม่พบรหัสคำขอ' }, { status: 400 })
  }

  let verifiedSlip: {
    characterId: string
    packageId: string
    packageName: string
    amountThb: number
    baseDiamonds: number
    bonusDiamonds: number
    totalDiamonds: number
    vipExpGranted: number
    slipHash?: string | null
  } | null = null

  const existing = getStoredSlipRequest(requestId)
  if (existing) {
    if (existing.ownerId !== auth.actor.uid) {
      return NextResponse.json({ ok: false, message: 'ไม่พบคำขอสลิปของบัญชีนี้' }, { status: 404 })
    }
    if (existing.status !== 'approved') {
      return NextResponse.json({ ok: false, message: 'คำขอนี้ยังไม่ได้รับการอนุมัติ' }, { status: 400 })
    }
    if (existing.claimed) {
      return NextResponse.json({ ok: false, message: 'รับเพชรจากคำขอนี้ไปแล้ว' }, { status: 409 })
    }
    if (
      !isValidTopupPackageReward(
        existing.packageId,
        existing.amountThb,
        existing.baseDiamonds,
        existing.bonusDiamonds,
        existing.vipExpGranted,
      )
    ) {
      return NextResponse.json({ ok: false, message: 'ข้อมูลแพ็กเกจของคำขอสลิปไม่ถูกต้อง' }, { status: 400 })
    }
    verifiedSlip = existing
  } else {
    const bearer = (req.headers.get('authorization') ?? '').slice(7).trim()
    const fsSlip = bearer ? await fetchApprovedFirestoreSlip(requestId, bearer, auth.actor.uid) : null
    if (!fsSlip) {
      return NextResponse.json({ ok: false, message: 'ไม่พบคำขอสลิปที่อนุมัติแล้วของบัญชีนี้' }, { status: 404 })
    }
    verifiedSlip = fsSlip
  }

  if (verifiedSlip.slipHash && isPersistentSlipHashUsed(verifiedSlip.slipHash) && !existing) {
    return NextResponse.json({ ok: false, message: 'สลิปนี้ถูกใช้รับเพชรไปแล้ว' }, { status: 409 })
  }

  if (!claimServerRequestId(`SLIPCLAIM:${requestId}`, auth.actor.uid)) {
    return NextResponse.json({ ok: false, message: 'คำขอนี้กำลังดำเนินการหรือถูกรับไปแล้ว' }, { status: 409 })
  }

  if (existing) {
    const claimedReq = markStoredSlipRequestClaimed(requestId, auth.actor.uid)
    if (!claimedReq) {
      return NextResponse.json({ ok: false, message: 'ไม่สามารถยืนยันการรับเพชรได้' }, { status: 409 })
    }
  }
  if (verifiedSlip.slipHash) {
    claimPersistentSlipHash(verifiedSlip.slipHash)
  }

  const orderId = makeServerTxId('ORD')
  const txId = makeServerTxId('TOPTX')
  const timestampMs = Date.now()
  const serverSignature = signPremiumTx({
    txId,
    requestId: orderId,
    actorUid: auth.actor.uid,
    characterId: verifiedSlip.characterId,
    amount: verifiedSlip.totalDiamonds,
    type: 'earn',
    source: 'promptpay_manual_gm',
    timestampMs,
  })

  const order: TopupOrderRecord = {
    orderId,
    characterId: verifiedSlip.characterId,
    packageId: verifiedSlip.packageId,
    packageName: verifiedSlip.packageName,
    provider: 'promptpay_manual_gm',
    gatewayRef: requestId,
    amountThb: verifiedSlip.amountThb,
    baseDiamonds: verifiedSlip.baseDiamonds,
    bonusDiamonds: verifiedSlip.bonusDiamonds,
    totalDiamonds: verifiedSlip.totalDiamonds,
    vipExpGranted: verifiedSlip.vipExpGranted,
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
