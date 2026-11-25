import { NextResponse } from 'next/server'
import { isValidWorldBossCycleKey } from '@/lib/game/rpg-systems'
import { resolveActorFromRequest } from '@/lib/server/premium-security'
import {
  addServerAnnouncement,
  canPublishWorldNews,
  closeStoredWorldBossEvent,
  getPublicWorldEvents,
  type WorldNewsCategory,
} from '@/lib/server/gm-events-store'

export const dynamic = 'force-dynamic'

const ALLOWED_CATEGORIES: WorldNewsCategory[] = ['enhance', 'boss_kill', 'gacha', 'rare_drop']

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sinceRaw = Number(url.searchParams.get('since') ?? '0')
  const sinceMs = Number.isFinite(sinceRaw) && sinceRaw > 0 ? sinceRaw : 0
  const payload = getPublicWorldEvents(sinceMs)
  return NextResponse.json(
    {
      ok: true,
      ...payload,
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
  if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified) {
    return NextResponse.json(
      { ok: false, message: 'ต้องเข้าสู่ระบบ Google ก่อนประกาศข่าวเซิร์ฟเวอร์' },
      { status: 401 },
    )
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (body && body.action === 'close_world_boss') {
    const cycleKey = typeof body.cycleKey === 'string' ? body.cycleKey.trim() : ''
    if (!isValidWorldBossCycleKey(cycleKey)) {
      return NextResponse.json({ ok: false, message: 'รหัสรอบเวิลด์บอสไม่ถูกต้อง' }, { status: 400 })
    }
    const closed = closeStoredWorldBossEvent(cycleKey)
    return NextResponse.json({
      ok: true,
      closedWorldBossCycles: closed.closedWorldBossCycles,
      worldBossTest: closed.worldBossTest,
    })
  }

  if (!body || typeof body.category !== 'string' || typeof body.body !== 'string') {
    return NextResponse.json({ ok: false, message: 'ข้อมูลข่าวเซิร์ฟเวอร์ไม่ถูกต้อง' }, { status: 400 })
  }

  const category = body.category as WorldNewsCategory
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return NextResponse.json({ ok: false, message: 'ประเภทข่าวเซิร์ฟเวอร์ไม่รองรับ' }, { status: 400 })
  }

  if (!canPublishWorldNews(auth.actor.uid)) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'rate_limited' })
  }

  const cleanBody = body.body.trim().slice(0, 220)
  if (!cleanBody) {
    return NextResponse.json({ ok: false, message: 'ไม่มีข้อความประกาศ' }, { status: 400 })
  }

  const playerName =
    typeof body.playerName === 'string' && body.playerName.trim()
      ? body.playerName.trim().slice(0, 24)
      : 'นักผจญภัย'
  const gameUid =
    typeof body.gameUid === 'string' && /^[0-9]{4,8}$/.test(body.gameUid.trim())
      ? body.gameUid.trim()
      : '1000'

  const nowMs = Date.now()
  const announcementId = `news_${nowMs.toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  const event = addServerAnnouncement({
    announcementId,
    authorUid: auth.actor.uid,
    authorName: playerName,
    authorGameUid: gameUid,
    body: cleanBody,
    variant: 'news',
    category,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + 9_500,
  })

  return NextResponse.json({ ok: true, announcement: event })
}
