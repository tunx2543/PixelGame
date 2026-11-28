import { NextResponse } from 'next/server'
import { PERMANENT_GM_GAME_UID } from '@/lib/game/permissions'
import { addServerAnnouncement } from '@/lib/server/gm-events-store'
import { resolveActorFromRequest } from '@/lib/server/premium-security'
import {
  deleteLivePatchNote,
  getMergedVersionPayload,
  upsertLivePatchNote,
} from '@/lib/server/patch-notes-store'

import { GAME_BUILD_ID } from '@/lib/game/version'

export const dynamic = 'force-dynamic'

const CF_CONTEXT_SYMBOL = Symbol.for('__cloudflare-context__')

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
}

function getCloudflareDeployVersionId(): string | null {
  const g = globalThis as Record<PropertyKey, unknown>
  const ctx = g[CF_CONTEXT_SYMBOL] as
    | { env?: { CF_VERSION_METADATA?: { id?: unknown } } }
    | undefined
  const id = ctx?.env?.CF_VERSION_METADATA?.id
  return typeof id === 'string' && id.trim() ? id.trim() : null
}

export async function GET() {
  return NextResponse.json(
    getMergedVersionPayload(Date.now(), {
      buildId: GAME_BUILD_ID,
      deployVersionId: getCloudflareDeployVersionId(),
    }),
    {
      headers: NO_STORE_HEADERS,
    },
  )
}

export async function POST(req: Request) {
  const auth = await resolveActorFromRequest(req)
  if (!('actor' in auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }
  if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบบัญชี Google ที่ยืนยันอีเมลแล้ว' }, { status: 401 })
  }
  if (!auth.actor.isGm) {
    return NextResponse.json({ ok: false, message: 'คำสั่งนี้สงวนเฉพาะ GM สูงสุดเท่านั้น' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) {
    return NextResponse.json({ ok: false, message: 'ข้อมูลคำขอไม่ถูกต้อง' }, { status: 400 })
  }

  const result = upsertLivePatchNote(body.note ?? body)
  if ('message' in result) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 })
  }

  if (body.announce !== false) {
    const nowMs = Date.now()
    const authorName =
      typeof body.authorName === 'string' && body.authorName.trim()
        ? body.authorName.trim().slice(0, 24)
        : 'GM'
    addServerAnnouncement({
      announcementId: `patch_${nowMs.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      authorUid: auth.actor.uid,
      authorName,
      authorGameUid: PERMANENT_GM_GAME_UID,
      body: `อัปเดต Patch Notes v${result.note.version}: ${result.note.title}`.slice(0, 240),
      variant: 'gm',
      category: 'gm',
      createdAtMs: nowMs,
      expiresAtMs: nowMs + 14_000,
    })
  }

  return NextResponse.json(
    { ok: true, note: result.note, payload: result.payload, message: `เผยแพร่ Patch Notes v${result.note.version} แล้ว` },
    { headers: NO_STORE_HEADERS },
  )
}

export async function DELETE(req: Request) {
  const auth = await resolveActorFromRequest(req)
  if (!('actor' in auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }
  if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบบัญชี Google ที่ยืนยันอีเมลแล้ว' }, { status: 401 })
  }
  if (!auth.actor.isGm) {
    return NextResponse.json({ ok: false, message: 'คำสั่งนี้สงวนเฉพาะ GM สูงสุดเท่านั้น' }, { status: 403 })
  }

  const url = new URL(req.url)
  const version = url.searchParams.get('version') ?? ''
  if (!version.trim()) {
    return NextResponse.json({ ok: false, message: 'กรุณาระบุ version ที่ต้องการลบ' }, { status: 400 })
  }

  const res = deleteLivePatchNote(version)
  return NextResponse.json(
    {
      ok: res.ok,
      payload: res.payload,
      message: res.ok ? `ลบ Patch Note v${version.trim()} เรียบร้อยแล้ว` : 'ไม่พบ Patch Note เวอร์ชั่นนี้ในรายการกำหนดเอง',
    },
    { status: res.ok ? 200 : 404, headers: NO_STORE_HEADERS },
  )
}
