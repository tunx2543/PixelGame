import { NextResponse } from 'next/server'
import firebaseConfig from '@/firebase-applet-config.json'
import { getTopupPackage, isValidTopupPackageReward, type TopupOrderRecord } from '@/lib/game/premium/topup'
import { isPersistentPremiumSecretConfigured, resolveActorFromRequest, signPremiumTx } from '@/lib/server/premium-security'
import { isCloudflareWorkersRuntime } from '@/lib/server/runtime-store'

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
  createdAtMs?: { integerValue?: string }
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
  createdAtMs: number
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
      createdAtMs: Number(f.createdAtMs?.integerValue ?? 0),
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
  if (!requestId || requestId.length > 60) {
    return NextResponse.json({ ok: false, message: 'ไม่พบรหัสคำขอ' }, { status: 400 })
  }

  const cloudflareRuntime = isCloudflareWorkersRuntime()
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  const verifiedSlip = bearer
    ? await fetchApprovedFirestoreSlip(requestId, bearer, auth.actor.uid)
    : null
  if (!verifiedSlip) {
    return NextResponse.json(
      { ok: false, message: 'ไม่พบคำขอสลิปที่อนุมัติแล้วของบัญชีนี้ หรือสลิปถูกรับเพชรไปแล้ว' },
      { status: 404 },
    )
  }

  if (cloudflareRuntime && !isPersistentPremiumSecretConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า PREMIUM_TX_SECRET จึงไม่สามารถออกคำสั่งรับเพชรอย่างปลอดภัยได้' },
      { status: 503 },
    )
  }

  // Stable identifiers make retries and concurrent requests resolve to the same Firestore order.
  const orderId = `ORD-${requestId}`
  const txId = `TX-${requestId}`
  const timestampMs = Math.max(0, Math.floor(verifiedSlip.createdAtMs || Date.now()))
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
