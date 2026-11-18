import { NextResponse } from 'next/server'
import { resolveActorFromRequest } from '@/lib/server/premium-security'
import { verifyBankSlipWithSlipOk } from '@/lib/server/topup-gateway'

const MAX_SLIP_BYTES = 5 * 1024 * 1024

export async function POST(req: Request) {
  try {
    const auth = await resolveActorFromRequest(req)
    if (!('actor' in auth)) {
      return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
    }
    if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified) {
      return NextResponse.json(
        { ok: false, message: 'กรุณาเข้าสู่ระบบด้วย Google ที่ยืนยันอีเมลแล้วก่อนอัปโหลดสลิป' },
        { status: 401 },
      )
    }

    const formData = await req.formData().catch(() => null)
    if (!formData) {
      return NextResponse.json({ ok: false, message: 'ข้อมูลฟอร์มสลิปไม่ถูกต้อง' }, { status: 400 })
    }

    const file = formData.get('slip')
    const packageId = String(formData.get('packageId') || '').trim()
    const characterId = String(formData.get('characterId') || 'slot_1').trim().slice(0, 64) || 'slot_1'
    const isFirstPurchase = String(formData.get('isFirstPurchase') || '') === 'true'

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: 'กรุณาแนบไฟล์รูปภาพสลิปโอนเงิน' }, { status: 400 })
    }
    if (file.size <= 0 || file.size > MAX_SLIP_BYTES) {
      return NextResponse.json({ ok: false, message: 'ขนาดไฟล์สลิปต้องไม่เกิน 5 MB' }, { status: 400 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const result = await verifyBankSlipWithSlipOk({
      uid: auth.actor.uid,
      characterId,
      packageId,
      isFirstPurchase,
      imageBytes: bytes,
      fileName: file.name || 'slip.jpg',
      mimeType: file.type || 'image/jpeg',
    })

    if (!('order' in result)) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status })
    }

    return NextResponse.json({
      ok: true,
      paid: true,
      order: result.order,
      message: result.message,
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการตรวจสอบสลิป' },
      { status: 500 },
    )
  }
}
