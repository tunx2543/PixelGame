import { NextResponse } from 'next/server'
import {
  claimServerRequestId,
  extractBearerToken,
  fetchAuthoritativeCharacterState,
  makeServerTxId,
  resolveActorFromRequest,
  signPremiumTx,
  verifyBattlePassUnlockOrClaim,
  verifyVipRewardClaim,
} from '@/lib/server/premium-security'
import { DAILY_TOPUP_BONUS, TOPUP_MILESTONES } from '@/lib/game/premium/topup'
import type { VipState } from '@/lib/game/premium/types'

function isValidRecentLocalIsoDate(iso: string, nowMs = Date.now()): boolean {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(iso)) return false
  const parsed = Date.parse(`${iso}T12:00:00Z`)
  if (!Number.isFinite(parsed)) return false
  return Math.abs(parsed - nowMs) <= 36 * 60 * 60 * 1000
}

export async function POST(req: Request) {
  try {
    const auth = await resolveActorFromRequest(req)
    if (!('actor' in auth)) {
      return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
    }

    if (auth.actor.authMode === 'firebase' && !auth.actor.emailVerified) {
      return NextResponse.json(
        { ok: false, message: 'กรุณายืนยันอีเมลก่อนรับรางวัลพรีเมียม' },
        { status: 401 },
      )
    }

    const body = (await req.json().catch(() => null)) as {
      claimType?: unknown
      characterId?: unknown
      requestId?: unknown
      vip?: VipState
      tierLevel?: unknown
      todayIso?: unknown
      bpLevel?: unknown
      premiumUnlocked?: unknown
      claimedFree?: unknown
      claimedPrem?: unknown
      level?: unknown
      track?: unknown
      currentDiamonds?: unknown
    } | null

    if (!body || typeof body.claimType !== 'string') {
      return NextResponse.json({ ok: false, message: 'ประเภทคำขอไม่ถูกต้อง' }, { status: 400 })
    }

    if (body.claimType === 'claim_pass_archive') {
      return NextResponse.json(
        { ok: false, message: 'ไม่รองรับคำขอรับรางวัล Battle Pass ค้างรับผ่าน API นี้' },
        { status: 400 },
      )
    }

    if (
      (body.claimType === 'topup_milestone' || body.claimType === 'daily_topup') &&
      (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified)
    ) {
      return NextResponse.json(
        { ok: false, message: 'กรุณาเข้าสู่ระบบด้วยบัญชี Google ที่ยืนยันอีเมลแล้วก่อนรับรางวัลเติมเงิน' },
        { status: 401 },
      )
    }

    const characterId =
      typeof body.characterId === 'string' && body.characterId.trim()
        ? body.characterId.trim().slice(0, 64)
        : 'slot_1'

    let authoritative = null
    if (auth.actor.authMode === 'firebase') {
      const bearerToken = extractBearerToken(req)
      authoritative = bearerToken
        ? await fetchAuthoritativeCharacterState(auth.actor.uid, characterId, bearerToken)
        : null
      if (!authoritative) {
        return NextResponse.json(
          { ok: false, message: 'ไม่สามารถตรวจสอบข้อมูลตัวละครจากฐานข้อมูลกลางได้ กรุณาลองใหม่อีกครั้ง' },
          { status: 503 },
        )
      }
    }

    const requestId =
      typeof body.requestId === 'string' && body.requestId.trim()
        ? body.requestId.trim().slice(0, 96)
        : makeServerTxId('REQ')

    if (!claimServerRequestId(requestId, auth.actor.uid)) {
      return NextResponse.json(
        { ok: false, duplicate: true, message: 'คำขอรับรางวัลซ้ำ (ป้องกันรับรางวัลซ้ำ)' },
        { status: 409 },
      )
    }

    let diamondDelta = 0
    let source = 'vip_reward'
    let message = 'ยืนยันคำขอสำเร็จ'

    if (body.claimType === 'vip_tier' || body.claimType === 'vip_daily') {
      const requestedToday = typeof body.todayIso === 'string' ? body.todayIso : ''
      const todayIso = isValidRecentLocalIsoDate(requestedToday)
        ? requestedToday
        : new Date().toISOString().slice(0, 10)
      const vipInput =
        auth.actor.authMode === 'firebase'
          ? (authoritative?.exists ? authoritative.vip : undefined)
          : body.vip
      const res = verifyVipRewardClaim({
        claimType: body.claimType,
        vip: vipInput,
        tierLevel: Number(body.tierLevel ?? 0),
        todayIso,
      })
      if (!res.ok) {
        return NextResponse.json({ ok: false, message: res.message }, { status: res.status })
      }
      diamondDelta = res.diamondsGrant
      source = body.claimType === 'vip_tier' ? 'vip_tier_reward' : 'vip_daily_reward'
      message = res.message
    } else if (body.claimType === 'unlock_pass' || body.claimType === 'claim_tier') {
      const bpState =
        auth.actor.authMode === 'firebase'
          ? (authoritative?.exists && authoritative.battlePass
              ? authoritative.battlePass
              : { level: 1, premiumUnlocked: false, claimedFree: [], claimedPrem: [] })
          : {
              level: Math.max(1, Math.floor(Number(body.bpLevel ?? 1) || 1)),
              premiumUnlocked: Boolean(body.premiumUnlocked),
              claimedFree: Array.isArray(body.claimedFree)
                ? body.claimedFree.filter((n): n is number => typeof n === 'number')
                : [],
              claimedPrem: Array.isArray(body.claimedPrem)
                ? body.claimedPrem.filter((n): n is number => typeof n === 'number')
                : [],
            }
      const currentDiamonds =
        auth.actor.authMode === 'firebase'
          ? (authoritative?.exists ? authoritative.diamonds : 0)
          : Math.max(0, Math.floor(Number(body.currentDiamonds ?? 0) || 0))

      const res = verifyBattlePassUnlockOrClaim({
        action: body.claimType,
        level: Number(body.level ?? 0),
        track: body.track === 'prem' ? 'prem' : 'free',
        bpLevel: bpState.level,
        premiumUnlocked: bpState.premiumUnlocked,
        claimedFree: bpState.claimedFree,
        claimedPrem: bpState.claimedPrem,
        currentDiamonds,
      })
      if (!res.ok) {
        return NextResponse.json({ ok: false, message: res.message }, { status: res.status })
      }
      diamondDelta = res.diamondDelta
      source = body.claimType === 'unlock_pass' ? 'battle_pass_unlock' : 'battle_pass_claim'
      message = res.message
    } else if (body.claimType === 'topup_milestone') {
      const milestoneId =
        typeof (body as Record<string, unknown>).milestoneId === 'string'
          ? String((body as Record<string, unknown>).milestoneId).trim()
          : ''
      const totalTopupThb = authoritative?.exists ? authoritative.totalTopupThb : 0
      const claimedIds = authoritative?.exists ? authoritative.claimedTopupMilestones : []
      const tier = TOPUP_MILESTONES.find((m) => m.id === milestoneId)
      if (!tier) {
        return NextResponse.json({ ok: false, message: 'ไม่พบขั้นรางวัลสะสมยอดเติม' }, { status: 404 })
      }
      if (totalTopupThb < tier.thresholdThb) {
        return NextResponse.json({ ok: false, message: `ยอดเติมสะสมยังไม่ถึง ฿${tier.thresholdThb}` }, { status: 400 })
      }
      if (claimedIds.includes(tier.id)) {
        return NextResponse.json({ ok: false, message: 'รับรางวัลขั้นนี้ไปแล้ว' }, { status: 409 })
      }
      diamondDelta = tier.diamonds
      source = 'topup_milestone'
      message = `ยืนยันรางวัลสะสม ฿${tier.thresholdThb}`
    } else if (body.claimType === 'daily_topup') {
      const requestedToday = typeof body.todayIso === 'string' ? body.todayIso : ''
      const todayIso = isValidRecentLocalIsoDate(requestedToday)
        ? requestedToday
        : new Date().toISOString().slice(0, 10)
      const lastTopupDate = authoritative?.exists ? authoritative.lastDailyTopupDate : ''
      const claimedDailyDate = authoritative?.exists ? authoritative.claimedDailyTopupDate : ''
      if (lastTopupDate !== todayIso) {
        return NextResponse.json({ ok: false, message: 'ยังไม่มีการเติมเงินสำเร็จในวันนี้' }, { status: 400 })
      }
      if (claimedDailyDate === todayIso) {
        return NextResponse.json({ ok: false, message: 'รับโบนัสเติมเงินรายวันของวันนี้ไปแล้ว' }, { status: 409 })
      }
      diamondDelta = DAILY_TOPUP_BONUS.diamonds
      source = 'daily_topup_bonus'
      message = 'ยืนยันโบนัสเติมเงินรายวัน'
    } else {
      return NextResponse.json({ ok: false, message: 'ไม่รองรับประเภทคำขอนี้' }, { status: 400 })
    }

    const txId = makeServerTxId('CLTX')
    const timestampMs = Date.now()
    const txType = diamondDelta < 0 ? 'spend' : 'earn'
    const isServerSigned = auth.actor.authMode === 'firebase'
    const serverSignature = isServerSigned
      ? signPremiumTx({
          txId,
          requestId,
          actorUid: auth.actor.uid,
          characterId,
          amount: Math.abs(diamondDelta),
          type: txType,
          source,
          timestampMs,
        })
      : null

    return NextResponse.json({
      ok: true,
      txId,
      requestId,
      actorUid: auth.actor.uid,
      isGm: auth.actor.isGm,
      source,
      diamondDelta,
      timestampMs,
      serverVerified: isServerSigned,
      serverSignature,
      message,
    })
  } catch {
    return NextResponse.json({ ok: false, message: 'ตรวจสอบสิทธิ์รับรางวัลไม่สำเร็จ' }, { status: 500 })
  }
}
