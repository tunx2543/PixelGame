import { NextResponse } from 'next/server'
import { isTopupAdminEmail } from '@/lib/game/permissions'
import { formatPromptPayTarget } from '@/lib/game/premium/topup'
import { resolveActorFromRequest } from '@/lib/server/premium-security'
import { getStoredMerchantQr, saveStoredMerchantQr } from '@/lib/server/topup-store'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await resolveActorFromRequest(req)
  if (!('actor' in auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }
  const stored = getStoredMerchantQr()
  const isAdmin = Boolean(auth.actor.emailVerified && isTopupAdminEmail(auth.actor.email))
  return NextResponse.json(
    {
      ok: true,
      isAdmin,
      settings: stored
        ? {
            ...stored,
            promptPayId: isAdmin ? stored.promptPayId : '',
          }
        : null,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    },
  )
}

export async function POST(req: Request) {
  const auth = await resolveActorFromRequest(req)
  if (!('actor' in auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }
  if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified || !isTopupAdminEmail(auth.actor.email)) {
    return NextResponse.json(
      { ok: false, message: 'สงวนสิทธิ์เฉพาะแอดมิน/GM ที่ยืนยันอีเมลแล้วเท่านั้นในการตั้งค่า QR ร้านค้า' },
      { status: 403 },
    )
  }

  const body = (await req.json().catch(() => null)) as {
    promptPayId?: unknown
    accountName?: unknown
    customQrDataUrl?: unknown
    enabled?: unknown
  } | null

  const digits = typeof body?.promptPayId === 'string' ? body.promptPayId.replace(/\D/g, '') : ''
  const rawCustomQr = typeof body?.customQrDataUrl === 'string' ? body.customQrDataUrl.trim() : ''
  const customQr =
    rawCustomQr.startsWith('data:image/') || rawCustomQr.startsWith('/assets/')
      ? rawCustomQr.slice(0, 350000)
      : null

  if (digits && !formatPromptPayTarget(digits)) {
    return NextResponse.json(
      { ok: false, message: 'หมายเลขพร้อมเพย์ไม่ถูกต้อง (ต้องเป็นเบอร์มือถือ 10 หลัก, บัตร ปชช. 13 หลัก หรือ e-Wallet 15 หลัก)' },
      { status: 400 },
    )
  }
  if (!digits && !customQr) {
    return NextResponse.json(
      { ok: false, message: 'กรุณาใส่หมายเลขพร้อมเพย์ หรืออัปโหลดรูป QR Code อย่างน้อย 1 อย่าง' },
      { status: 400 },
    )
  }

  const saved = saveStoredMerchantQr({
    promptPayId: digits,
    accountName: typeof body?.accountName === 'string' ? body.accountName : 'ร้าน Pixel Quest',
    customQrDataUrl: customQr,
    enabled: body?.enabled !== false,
    updatedByUid: auth.actor.uid,
  })

  return NextResponse.json({
    ok: true,
    settings: saved,
    message: 'บันทึก QR Code / พร้อมเพย์ร้านค้าเรียบร้อยแล้ว! เปิดรับการเติมเงินทันที',
  })
}
