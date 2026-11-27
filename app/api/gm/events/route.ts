import { NextResponse } from 'next/server'
import { PERMANENT_GM_GAME_UID } from '@/lib/game/permissions'
import {
  DEFAULT_SERVER_RATES,
  clampServerMultiplier,
  formatServerRateSummary,
} from '@/lib/game/server-rates'
import { getWorldBossTemplate } from '@/lib/game/rpg-systems'
import { getFestivalEventDef, isValidFestivalEventId } from '@/lib/game/festival-events'
import { resolveActorFromRequest } from '@/lib/server/premium-security'
import {
  ackServerGmDirective,
  addServerAnnouncement,
  addServerGiftDrop,
  addServerGmDirective,
  getEffectiveClosedWorldBossCycles,
  getEffectiveStoredFestivalOverride,
  getEffectiveStoredServerRates,
  getEffectiveStoredWorldBossTest,
  getEventsForUser,
  setServerRates,
  setStoredFestivalOverride,
  setStoredWorldBossTest,
  type GmDirectiveAction,
} from '@/lib/server/gm-events-store'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
}

function sanitizeId(raw: unknown, prefix: string): string {
  if (typeof raw === 'string' && /^[a-zA-Z0-9_-]{4,64}$/.test(raw.trim())) {
    return raw.trim()
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export async function GET(req: Request) {
  const auth = await resolveActorFromRequest(req)
  if (!('actor' in auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }
  const url = new URL(req.url)
  const sinceRaw = Number(url.searchParams.get('since') ?? '0')
  const sinceMs = Number.isFinite(sinceRaw) && sinceRaw > 0 ? sinceRaw : 0

  if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified) {
    return NextResponse.json(
      {
        ok: true,
        announcements: [],
        directives: [],
        giftDrops: [],
        serverRates: getEffectiveStoredServerRates(),
        worldBossTest: getEffectiveStoredWorldBossTest(),
        closedWorldBossCycles: getEffectiveClosedWorldBossCycles(),
        festivalOverride: getEffectiveStoredFestivalOverride(),
        serverTimeMs: Date.now(),
      },
      { headers: NO_STORE_HEADERS },
    )
  }

  const {
    announcements,
    directives,
    giftDrops,
    serverRates,
    worldBossTest,
    closedWorldBossCycles,
    festivalOverride,
  } = getEventsForUser(auth.actor.uid, sinceMs)

  return NextResponse.json(
    {
      ok: true,
      announcements,
      directives,
      giftDrops,
      serverRates,
      worldBossTest,
      closedWorldBossCycles,
      festivalOverride,
      serverTimeMs: Date.now(),
    },
    { headers: NO_STORE_HEADERS },
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

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body.action !== 'string') {
    return NextResponse.json({ ok: false, message: 'คำขอไม่ถูกต้อง' }, { status: 400 })
  }

  if (body.action === 'ack_directive') {
    const directiveId = typeof body.directiveId === 'string' ? body.directiveId.trim() : ''
    if (!/^[a-zA-Z0-9_-]{4,64}$/.test(directiveId)) {
      return NextResponse.json({ ok: false, message: 'directiveId ไม่ถูกต้อง' }, { status: 400 })
    }
    const updated = ackServerGmDirective(directiveId, auth.actor.uid)
    return NextResponse.json({ ok: true, updated })
  }

  if (!auth.actor.isGm) {
    return NextResponse.json(
      { ok: false, message: 'คำสั่งนี้สงวนเฉพาะ GM สูงสุดเท่านั้น' },
      { status: 403 },
    )
  }

  if (body.action === 'set_rates' || body.action === 'reset_rates') {
    const nowMs = Date.now()
    const authorName =
      typeof body.authorName === 'string' && body.authorName.trim()
        ? body.authorName.trim().slice(0, 24)
        : 'GM'

    if (body.action === 'reset_rates') {
      const reset = setServerRates({
        ...DEFAULT_SERVER_RATES,
        updatedAtMs: nowMs,
        updatedByName: authorName,
      })
      addServerAnnouncement({
        announcementId: sanitizeId(undefined, 'rate'),
        authorUid: auth.actor.uid,
        authorName,
        authorGameUid: PERMANENT_GM_GAME_UID,
        body: 'กิจกรรมคูณ EXP / ดรอปเซิร์ฟเวอร์สิ้นสุดแล้ว (กลับสู่อัตราปกติ x1)',
        variant: 'gm',
        category: 'gm',
        createdAtMs: nowMs,
        expiresAtMs: nowMs + 12_000,
      })
      return NextResponse.json({ ok: true, serverRates: reset })
    }

    const expMultiplier = clampServerMultiplier(body.expMultiplier ?? 1)
    const dropMultiplier = clampServerMultiplier(body.dropMultiplier ?? 1)
    const rawDurationMin = Number(body.durationMinutes ?? 0)
    const durationMinutes =
      Number.isFinite(rawDurationMin) && rawDurationMin > 0
        ? Math.max(1, Math.min(10_080, Math.round(rawDurationMin)))
        : 0
    const label =
      typeof body.label === 'string' && body.label.trim()
        ? body.label.trim().slice(0, 80)
        : expMultiplier > 1 || dropMultiplier > 1
          ? 'กิจกรรมคูณพลังทั้งเซิร์ฟเวอร์'
          : ''

    const nextRates = setServerRates({
      expMultiplier,
      dropMultiplier,
      label,
      startedAtMs: expMultiplier > 1 || dropMultiplier > 1 ? nowMs : 0,
      expiresAtMs:
        (expMultiplier > 1 || dropMultiplier > 1) && durationMinutes > 0
          ? nowMs + durationMinutes * 60_000
          : null,
      updatedAtMs: nowMs,
      updatedByName: authorName,
    })

    const durationText = durationMinutes > 0 ? ` นาน ${durationMinutes} นาที` : ' (เปิดใช้งานต่อเนื่อง)'
    addServerAnnouncement({
      announcementId: sanitizeId(undefined, 'rate'),
      authorUid: auth.actor.uid,
      authorName,
      authorGameUid: PERMANENT_GM_GAME_UID,
      body:
        expMultiplier > 1 || dropMultiplier > 1
          ? `เปิดกิจกรรมเซิร์ฟเวอร์! ${formatServerRateSummary(nextRates)}${durationText}`.slice(0, 240)
          : 'ปรับอัตรา EXP & ดรอปเซิร์ฟเวอร์กลับเป็น x1 ปกติแล้ว',
      variant: 'gm',
      category: 'gm',
      createdAtMs: nowMs,
      expiresAtMs: nowMs + 14_000,
    })

    return NextResponse.json({ ok: true, serverRates: nextRates })
  }

  if (body.action === 'summon_world_boss_test' || body.action === 'end_world_boss_test') {
    const nowMs = Date.now()
    const authorName =
      typeof body.authorName === 'string' && body.authorName.trim()
        ? body.authorName.trim().slice(0, 24)
        : 'GM'

    if (body.action === 'end_world_boss_test') {
      setStoredWorldBossTest(null, nowMs)
      addServerAnnouncement({
        announcementId: sanitizeId(undefined, 'wbend'),
        authorUid: auth.actor.uid,
        authorName,
        authorGameUid: PERMANENT_GM_GAME_UID,
        body: 'GM ปิดโหมดทดสอบบอสกิจกรรมเวิลด์บอสแล้ว (กลับสู่ตารางเวลาปกติ จันทร์·พุธ·ศุกร์ 20:00 น.)',
        variant: 'gm',
        category: 'gm',
        createdAtMs: nowMs,
        expiresAtMs: nowMs + 10_000,
      })
      return NextResponse.json({ ok: true, worldBossTest: null })
    }

    const template = getWorldBossTemplate(typeof body.bossId === 'string' ? body.bossId : null)
    const rawDuration = Number(body.durationMinutes ?? 30)
    const durationMinutes =
      Number.isFinite(rawDuration) && rawDuration > 0
        ? Math.max(5, Math.min(180, Math.round(rawDuration)))
        : 30
    const testState = setStoredWorldBossTest(
      {
        active: true,
        cycleKey: `test_wb_${nowMs.toString(36)}`,
        bossId: template.bossId,
        name: template.name,
        monsterId: template.monsterId,
        level: template.level,
        element: template.element,
        maxHp: template.maxHp,
        atk: template.atk,
        def: template.def,
        startedAtMs: nowMs,
        expiresAtMs: nowMs + durationMinutes * 60_000,
        triggeredByName: authorName,
      },
      nowMs,
    )

    addServerAnnouncement({
      announcementId: sanitizeId(undefined, 'wbtest'),
      authorUid: auth.actor.uid,
      authorName,
      authorGameUid: PERMANENT_GM_GAME_UID,
      body: `★ [GM Test] อัญเชิญบอสกิจกรรมเวิลด์บอส "${template.name}" (Lv.${template.level}) เปิดให้ทดสอบนาน ${durationMinutes} นาที! ★`.slice(0, 240),
      variant: 'gm',
      category: 'gm',
      createdAtMs: nowMs,
      expiresAtMs: nowMs + 14_000,
    })

    return NextResponse.json({ ok: true, worldBossTest: testState })
  }

  if (body.action === 'set_festival_event' || body.action === 'clear_festival_event') {
    const nowMs = Date.now()
    const authorName =
      typeof body.authorName === 'string' && body.authorName.trim()
        ? body.authorName.trim().slice(0, 24)
        : 'GM'

    if (body.action === 'clear_festival_event') {
      setStoredFestivalOverride(null, nowMs)
      addServerAnnouncement({
        announcementId: sanitizeId(undefined, 'festend'),
        authorUid: auth.actor.uid,
        authorName,
        authorGameUid: PERMANENT_GM_GAME_UID,
        body: 'GM กลับสู่ตารางเวลาเทศกาล & กิจกรรมประจำวันตามปฏิทินอัตโนมัติแล้ว',
        variant: 'gm',
        category: 'gm',
        createdAtMs: nowMs,
        expiresAtMs: nowMs + 10_000,
      })
      return NextResponse.json({ ok: true, festivalOverride: null })
    }

    if (!isValidFestivalEventId(body.eventId)) {
      return NextResponse.json({ ok: false, message: 'ไม่พบรหัสกิจกรรมเทศกาลนี้' }, { status: 400 })
    }
    const def = getFestivalEventDef(body.eventId)!
    const rawDurationMin = Number(body.durationMinutes ?? 0)
    const durationMinutes =
      Number.isFinite(rawDurationMin) && rawDurationMin > 0
        ? Math.max(5, Math.min(43_200, Math.round(rawDurationMin)))
        : 0
    const clampPct = (val: unknown, fallback: number) => {
      const n = Number(val)
      if (!Number.isFinite(n)) return fallback
      return Math.max(0, Math.min(500, Math.round(n)))
    }
    const customTitle =
      typeof body.customTitle === 'string' && body.customTitle.trim()
        ? body.customTitle.trim().slice(0, 80)
        : undefined
    const festivalOverride = setStoredFestivalOverride(
      {
        active: true,
        eventId: def.id,
        cycleKey: `override:${def.id}:${nowMs.toString(36)}`,
        customTitle,
        expBonusPct: body.expBonusPct !== undefined ? clampPct(body.expBonusPct, def.expBonusPct) : def.expBonusPct,
        dropBonusPct: body.dropBonusPct !== undefined ? clampPct(body.dropBonusPct, def.dropBonusPct) : def.dropBonusPct,
        goldBonusPct: body.goldBonusPct !== undefined ? clampPct(body.goldBonusPct, def.goldBonusPct) : def.goldBonusPct,
        startedAtMs: nowMs,
        expiresAtMs: durationMinutes > 0 ? nowMs + durationMinutes * 60_000 : null,
        triggeredByName: authorName,
      },
      nowMs,
    )

    const displayName = customTitle || def.name
    addServerAnnouncement({
      announcementId: sanitizeId(undefined, 'fest'),
      authorUid: auth.actor.uid,
      authorName,
      authorGameUid: PERMANENT_GM_GAME_UID,
      body: `🎉 กิจกรรมพิเศษเซิร์ฟเวอร์ "${displayName}" เปิดฉากแล้ว! (EXP +${festivalOverride?.expBonusPct ?? def.expBonusPct}% · DROP +${festivalOverride?.dropBonusPct ?? def.dropBonusPct}% · Gold +${festivalOverride?.goldBonusPct ?? def.goldBonusPct}%)`.slice(0, 240),
      variant: 'gm',
      category: 'gm',
      createdAtMs: nowMs,
      expiresAtMs: nowMs + 14_000,
    })

    return NextResponse.json({ ok: true, festivalOverride })
  }

  if (body.action === 'announce') {
    const cleanBody = typeof body.body === 'string' ? body.body.trim().slice(0, 240) : ''
    if (!cleanBody) {
      return NextResponse.json({ ok: false, message: 'กรุณาพิมพ์ข้อความประกาศ' }, { status: 400 })
    }
    const nowMs = Date.now()
    const event = addServerAnnouncement({
      announcementId: sanitizeId(body.announcementId, 'ann'),
      authorUid: auth.actor.uid,
      authorName: typeof body.authorName === 'string' && body.authorName.trim()
        ? body.authorName.trim().slice(0, 24)
        : 'GM',
      authorGameUid: PERMANENT_GM_GAME_UID,
      body: cleanBody,
      variant: 'gm',
      category: 'gm',
      createdAtMs: nowMs,
      expiresAtMs: nowMs + 14_000,
    })
    return NextResponse.json({ ok: true, announcement: event })
  }

  if (body.action === 'gift_all') {
    const subject = typeof body.subject === 'string' && body.subject.trim()
      ? body.subject.trim().slice(0, 64)
      : 'ของขวัญชดเชยจาก GM'
    const giftBody = typeof body.body === 'string' && body.body.trim()
      ? body.body.trim().slice(0, 240)
      : 'ขอบคุณที่ร่วมผจญภัยใน Pixel Quest — รับรางวัลจากกล่องจดหมายได้เลย!'
    const gold = Math.max(0, Math.min(10_000_000, Math.floor(Number(body.gold) || 0)))
    const diamonds = Math.max(0, Math.min(100_000, Math.floor(Number(body.diamonds) || 0)))
    const itemId = typeof body.itemId === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(body.itemId.trim())
      ? body.itemId.trim()
      : null
    const qty = itemId ? Math.max(1, Math.min(999, Math.floor(Number(body.qty) || 1))) : 0
    const plus = itemId ? Math.max(0, Math.min(20, Math.floor(Number(body.plus) || 0))) : 0

    if (gold <= 0 && diamonds <= 0 && !itemId) {
      return NextResponse.json({ ok: false, message: 'กรุณาระบุทอง เพชร หรือไอเทมอย่างน้อย 1 อย่าง' }, { status: 400 })
    }

    const nowMs = Date.now()
    const dropId = sanitizeId(body.dropId, 'gift')
    const fromName = typeof body.fromName === 'string' && body.fromName.trim()
      ? body.fromName.trim().slice(0, 24)
      : 'GM'

    const drop = addServerGiftDrop({
      dropId,
      fromUid: auth.actor.uid,
      fromName,
      fromGameUid: PERMANENT_GM_GAME_UID,
      subject,
      body: giftBody,
      gold,
      diamonds,
      itemId,
      qty,
      plus,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + 7 * 24 * 60 * 60_000,
    })

    addServerAnnouncement({
      announcementId: sanitizeId(undefined, 'ann'),
      authorUid: auth.actor.uid,
      authorName: fromName,
      authorGameUid: PERMANENT_GM_GAME_UID,
      body: `GM ส่งของขวัญทั้งเซิร์ฟเวอร์ "${subject}" — เปิดกล่องจดหมายเพื่อรับรางวัลได้เลย!`.slice(0, 240),
      variant: 'gm',
      category: 'gm',
      createdAtMs: nowMs,
      expiresAtMs: nowMs + 12_000,
    })

    return NextResponse.json({ ok: true, drop })
  }

  const directiveActions: GmDirectiveAction[] = ['summon', 'mute', 'unmute', 'kick']
  if (directiveActions.includes(body.action as GmDirectiveAction)) {
    const action = body.action as GmDirectiveAction
    const targetUid = typeof body.targetUid === 'string' ? body.targetUid.trim() : ''
    const targetName = typeof body.targetName === 'string' ? body.targetName.trim().slice(0, 24) : 'นักผจญภัย'
    const targetGameUid =
      typeof body.targetGameUid === 'string' && /^[0-9]{4,8}$/.test(body.targetGameUid.trim())
        ? body.targetGameUid.trim()
        : '1000'

    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(targetUid) || targetUid === auth.actor.uid) {
      return NextResponse.json({ ok: false, message: 'เป้าหมายไม่ถูกต้อง' }, { status: 400 })
    }

    let mapId = 'town'
    let x = 0
    let y = 0
    if (action === 'summon') {
      mapId = typeof body.mapId === 'string' && /^[a-zA-Z0-9_-]{1,32}$/.test(body.mapId.trim())
        ? body.mapId.trim()
        : 'town'
      const rawX = Number(body.x)
      const rawY = Number(body.y)
      if (!Number.isFinite(rawX) || !Number.isFinite(rawY) || rawX < 0 || rawY < 0 || rawX > 5000 || rawY > 5000) {
        return NextResponse.json({ ok: false, message: 'พิกัดไม่ถูกต้อง' }, { status: 400 })
      }
      x = Math.round(rawX)
      y = Math.round(rawY)
    }

    const durationMin = action === 'mute'
      ? Math.max(1, Math.min(1440, Math.floor(Number(body.durationMin) || 10)))
      : 0
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 120) : ''

    const event = addServerGmDirective({
      directiveId: sanitizeId(body.directiveId, 'gmd'),
      action,
      fromUid: auth.actor.uid,
      fromName: typeof body.fromName === 'string' && body.fromName.trim()
        ? body.fromName.trim().slice(0, 24)
        : 'GM',
      fromGameUid: PERMANENT_GM_GAME_UID,
      targetUid,
      targetGameUid,
      targetName: targetName || 'นักผจญภัย',
      mapId,
      x,
      y,
      durationMin,
      reason,
      createdAtMs: Date.now(),
      consumed: false,
    })
    return NextResponse.json({ ok: true, directive: event })
  }

  return NextResponse.json({ ok: false, message: 'ไม่รู้จัก action นี้' }, { status: 400 })
}
