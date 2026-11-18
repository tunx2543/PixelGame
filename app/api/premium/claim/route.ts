import { NextResponse } from 'next/server'
import {
  claimServerRequestId,
  makeServerTxId,
  resolveActorFromRequest,
  signPremiumTx,
  verifyBattlePassUnlockOrClaim,
  verifyVipRewardClaim,
} from '@/lib/server/premium-security'
import { DAILY_TOPUP_BONUS, TOPUP_MILESTONES } from '@/lib/game/premium/topup'
import type { VipState } from '@/lib/game/premium/types'

export async function POST(req: Request) {
  try {
    const auth = await resolveActorFromRequest(req)
    if (!('actor' in auth)) {
      return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
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
      archiveDiamonds?: unknown
    } | null

    if (!body || typeof body.claimType !== 'string') {
      return NextResponse.json({ ok: false, message: 'ประเภทคำขอไม่ถูกต้อง' }, { status: 400 })
    }

    const characterId =
      typeof body.characterId === 'string' && body.characterId.trim()
        ? body.characterId.trim().slice(0, 64)
        : 'slot_1'
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
      const todayIso =
        typeof body.todayIso === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(body.todayIso)
          ? body.todayIso
          : new Date().toISOString().slice(0, 10)
      const res = verifyVipRewardClaim({
        claimType: body.claimType,
        vip: body.vip,
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
      const res = verifyBattlePassUnlockOrClaim({
        action: body.claimType,
        level: Number(body.level ?? 0),
        track: body.track === 'prem' ? 'prem' : 'free',
        bpLevel: Math.max(1, Math.floor(Number(body.bpLevel ?? 1) || 1)),
        premiumUnlocked: Boolean(body.premiumUnlocked),
        claimedFree: Array.isArray(body.claimedFree) ? body.claimedFree.filter((n): n is number => typeof n === 'number') : [],
        claimedPrem: Array.isArray(body.claimedPrem) ? body.claimedPrem.filter((n): n is number => typeof n === 'number') : [],
        currentDiamonds: Math.max(0, Math.floor(Number(body.currentDiamonds ?? 0) || 0)),
      })
      if (!res.ok) {
        return NextResponse.json({ ok: false, message: res.message }, { status: res.status })
      }
      diamondDelta = res.diamondDelta
      source = body.claimType === 'unlock_pass' ? 'battle_pass_unlock' : 'battle_pass_claim'
      message = res.message
    } else if (body.claimType === 'claim_pass_archive') {
      diamondDelta = Math.max(0, Math.min(500, Math.floor(Number(body.archiveDiamonds ?? 0) || 0)))
      source = 'battle_pass_archive'
      message = 'ยืนยันการรับรางวัล Battle Pass ค้างรับ'
    } else if (body.claimType === 'topup_milestone') {
      const milestoneId = typeof (body as Record<string, unknown>).milestoneId === 'string'
        ? String((body as Record<string, unknown>).milestoneId).trim()
        : ''
      const totalTopupThb = Math.max(0, Math.floor(Number((body as Record<string, unknown>).totalTopupThb ?? 0) || 0))
      const claimedIds = Array.isArray((body as Record<string, unknown>).claimedMilestones)
        ? ((body as Record<string, unknown>).claimedMilestones as unknown[]).filter((x): x is string => typeof x === 'string')
        : []
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
      const todayIso =
        typeof body.todayIso === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(body.todayIso)
          ? body.todayIso
          : new Date().toISOString().slice(0, 10)
      const lastTopupDate = String((body as Record<string, unknown>).lastDailyTopupDate ?? '')
      const claimedDailyDate = String((body as Record<string, unknown>).claimedDailyTopupDate ?? '')
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
    const serverSignature = signPremiumTx({
      txId,
      requestId,
      actorUid: auth.actor.uid,
      characterId,
      amount: Math.abs(diamondDelta),
      type: txType,
      source,
      timestampMs,
    })

    return NextResponse.json({
      ok: true,
      txId,
      requestId,
      actorUid: auth.actor.uid,
      isGm: auth.actor.isGm,
      source,
      diamondDelta,
      timestampMs,
      serverVerified: true,
      serverSignature,
      message,
    })
  } catch {
    return NextResponse.json({ ok: false, message: 'ตรวจสอบสิทธิ์รับรางวัลไม่สำเร็จ' }, { status: 500 })
  }
}
