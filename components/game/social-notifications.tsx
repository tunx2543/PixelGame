'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { subscribeFriendSocialState, type PendingFriendRequest } from '@/lib/firebase/friends'
import {
  respondDuelChallenge,
  respondTradeFirestore,
  subscribeIncomingDuels,
  subscribeIncomingTrades,
  subscribeIncomingWhispers,
  type DuelMatchRecord,
  type TradeSessionRecord,
} from '@/lib/firebase/mmo-online'
import {
  subscribeAllTopupSlipRequestsForGm,
  subscribeMyTopupSlipRequests,
} from '@/lib/firebase/topup-requests'
import { respondPartyInvite } from '@/lib/firebase/parties'
import { getOptionalClient } from '@/lib/supabase/client'
import {
  game,
  getStats,
  isPlayerBlocked,
  notify,
  openPanel,
  setTopupBadgeCounts,
} from '@/lib/game/engine'
import { createDuelFighter } from '@/lib/game/mmo-systems'
import { isTopupAdminUser } from '@/lib/game/permissions'
import type { TopupSlipRequestRecord } from '@/lib/game/premium/topup'
import { respondFriendRequest } from '@/lib/game/social'
import { useGame } from '@/lib/game/use-game'

export function SocialNotifications() {
  useGame()
  const [request, setRequest] = useState<PendingFriendRequest | null>(null)
  const [fbTrade, setFbTrade] = useState<TradeSessionRecord | null>(null)
  const [fbDuel, setFbDuel] = useState<DuelMatchRecord | null>(null)
  const [trade, setTrade] = useState<{ id: number; userId: string } | null>(null)
  const [approvedSlips, setApprovedSlips] = useState<TopupSlipRequestRecord[]>([])
  const [gmPendingSlips, setGmPendingSlips] = useState<TopupSlipRequestRecord[]>([])
  const [slipBannerDismissed, setSlipBannerDismissed] = useState(false)
  const [partyBusy, setPartyBusy] = useState(false)

  useEffect(() => {
    let unsubSocial = () => {}
    let unsubWhispers = () => {}
    let unsubTrades = () => {}
    let unsubDuels = () => {}
    let unsubMySlips = () => {}
    let unsubGmSlips = () => {}
    let latestApproved = 0
    let latestGmPending = 0

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      unsubSocial()
      unsubWhispers()
      unsubTrades()
      unsubDuels()
      unsubMySlips()
      unsubGmSlips()
      unsubSocial = () => {}
      unsubWhispers = () => {}
      unsubTrades = () => {}
      unsubDuels = () => {}
      unsubMySlips = () => {}
      unsubGmSlips = () => {}
      latestApproved = 0
      latestGmPending = 0

      if (fbUser && fbUser.emailVerified) {
        unsubSocial = subscribeFriendSocialState(fbUser.uid, (snapshot) => {
          setRequest(snapshot.incomingRequests[0] ?? null)
        })
        unsubWhispers = subscribeIncomingWhispers(fbUser.uid, (whisper) => {
          if (isPlayerBlocked(whisper.fromUid)) return
          game.chat.push({
            id: Date.now(),
            type: 'player',
            author: `${whisper.fromName}`,
            text: `[กระซิบถึงคุณ] ${whisper.body}`,
            channel: 'world',
            senderUid: whisper.fromUid,
            senderGameUid: whisper.fromGameUid,
          })
          notify()
        })
        unsubTrades = subscribeIncomingTrades(fbUser.uid, (trades) => {
          const pending = trades.find((t) => t.status === 'pending' && !isPlayerBlocked(t.senderUid)) ?? null
          setFbTrade(pending)
        })
        unsubDuels = subscribeIncomingDuels(fbUser.uid, (duels) => {
          const pending = duels.find((d) => d.status === 'pending' && !isPlayerBlocked(d.challengerUid)) ?? null
          setFbDuel(pending)
        })
        unsubMySlips = subscribeMyTopupSlipRequests(fbUser.uid, (rows) => {
          const approved = rows.filter((r) => r.status === 'approved' && !r.claimed)
          latestApproved = approved.length
          setApprovedSlips(approved)
          setTopupBadgeCounts(latestApproved, latestGmPending)
          if (approved.length > 0) setSlipBannerDismissed(false)
        })
        if (isTopupAdminUser(fbUser)) {
          unsubGmSlips = subscribeAllTopupSlipRequestsForGm((rows) => {
            const pending = rows.filter((r) => r.status === 'pending')
            latestGmPending = pending.length
            setGmPendingSlips(pending)
            setTopupBadgeCounts(latestApproved, latestGmPending)
            if (pending.length > 0) setSlipBannerDismissed(false)
          })
        } else {
          setGmPendingSlips([])
        }
      } else {
        setRequest(null)
        setFbTrade(null)
        setFbDuel(null)
        setApprovedSlips([])
        setGmPendingSlips([])
        setTopupBadgeCounts(0, 0)
      }
    })

    const supabase = getOptionalClient()
    let active = true
    let timer: number | null = null
    if (supabase) {
      const loadTrade = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user || !active) return
          const { data: tradeRequest } = await supabase
            .from('trade_requests')
            .select('id, sender_id')
            .eq('recipient_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (active) setTrade(tradeRequest ? { id: tradeRequest.id, userId: tradeRequest.sender_id } : null)
        } catch {
          // Ignore transient network errors when polling optional trade notifications.
        }
      }
      void loadTrade()
      timer = window.setInterval(() => void loadTrade(), 3000)
    }

    return () => {
      active = false
      unsubSocial()
      unsubWhispers()
      unsubTrades()
      unsubDuels()
      unsubMySlips()
      unsubGmSlips()
      unsubAuth()
      if (timer !== null) window.clearInterval(timer)
    }
  }, [])

  const partyInvite = game.partyInvites[0] ?? null
  const showSlipNotif = !slipBannerDismissed && (approvedSlips.length > 0 || gmPendingSlips.length > 0)

  if (!request && !trade && !fbTrade && !fbDuel && !partyInvite && !showSlipNotif) return null

  const respond = async (decision: 'accepted' | 'declined') => {
    if (!request) return
    const result = await respondFriendRequest(request.fromUid, decision)
    if (!result.ok) game.chat.push({ id: Date.now(), type: 'error', text: result.message })
    else {
      game.chat.push({
        id: Date.now(),
        type: 'system',
        text: `${result.message} (${request.fromName} · UID ${request.fromGameUid})`,
      })
      setRequest(null)
    }
    notify()
  }

  const respondParty = async (decision: 'accepted' | 'declined') => {
    if (!partyInvite || !game.p || partyBusy) return
    setPartyBusy(true)
    try {
      const s = getStats(game.p)
      const res = await respondPartyInvite(
        partyInvite,
        decision,
        {
          gameUid: game.p.gameUid,
          uid: game.p.uid,
          name: game.p.name,
          jobId: game.p.jobId,
          level: game.p.level,
          hp: Math.max(0, Math.min(s.maxHp, Math.floor(game.p.hp))),
          maxHp: Math.max(1, Math.floor(s.maxHp)),
          mapId: game.p.mapId,
        },
        game.party,
      )
      game.chat.push({
        id: Date.now(),
        type: res.ok ? 'system' : 'error',
        text: res.message,
      })
      if (res.ok && decision === 'accepted') {
        game.partyPanelOpen = true
      }
      notify()
    } catch {
      game.chat.push({ id: Date.now(), type: 'error', text: 'ตอบรับคำเชิญปาร์ตี้ไม่สำเร็จ' })
      notify()
    } finally {
      setPartyBusy(false)
    }
  }

  const respondFbTrade = async (decision: 'active' | 'declined') => {
    if (!fbTrade) return
    const res = await respondTradeFirestore(fbTrade.tradeId, decision)
    if (!res.ok) {
      game.chat.push({ id: Date.now(), type: 'error', text: res.message })
      notify()
      return
    }
    if (decision === 'active') {
      game.tradeId = fbTrade.tradeId
      game.tradeTargetId = fbTrade.senderUid
      setFbTrade(null)
      openPanel('trade')
    } else {
      setFbTrade(null)
      notify()
    }
  }

  const respondFbDuel = async (decision: 'active' | 'declined') => {
    if (!fbDuel || !game.p) return
    const p = game.p
    const s = getStats(p)
    const selfUid = auth.currentUser?.uid ?? 'guest_player'
    const res = await respondDuelChallenge(
      fbDuel.duelId,
      decision,
      decision === 'active'
        ? createDuelFighter({
            uid: selfUid,
            name: p.name,
            jobId: p.jobId,
            level: p.level,
            maxHp: s.maxHp,
            atk: s.atk,
            def: s.def,
            crit: s.crit,
          })
        : undefined,
    )
    if (!res.ok) {
      game.chat.push({ id: Date.now(), type: 'error', text: res.message })
      notify()
      return
    }
    if (decision === 'active') {
      game.activeDuelId = fbDuel.duelId
      game.duelTarget = { userId: fbDuel.challengerUid, displayName: fbDuel.challengerName }
      setFbDuel(null)
      openPanel('arena')
    } else {
      setFbDuel(null)
      notify()
    }
  }

  const acceptTrade = async () => {
    if (!trade) return
    const supabase = getOptionalClient()
    if (!supabase) return
    const { data, error } = await supabase.rpc('respond_trade_request', { trade_id: trade.id })
    if (error || !data) {
      game.chat.push({ id: Date.now(), type: 'error', text: 'เปิดคำขอแลกเปลี่ยนไม่สำเร็จ' })
      notify()
      return
    }
    game.tradeId = trade.id
    game.tradeTargetId = trade.userId
    setTrade(null)
    openPanel('trade')
  }

  return (
    <div className="pointer-events-auto absolute right-2 top-2 z-50 w-[min(18rem,calc(100vw-1rem))] space-y-2" role="status">
      {showSlipNotif && approvedSlips.length > 0 && (
        <div className="rounded-xl border border-emerald-400/75 bg-background/95 p-3 shadow-2xl backdrop-blur">
          <p className="text-[10px] font-bold tracking-[0.12em] text-emerald-300">GM อนุมัติสลิปเติมเงินแล้ว!</p>
          <p className="mt-1 text-xs text-foreground">
            คุณมี <strong className="text-cyan-200">{approvedSlips.length} รายการ</strong> พร้อมกดรับเพชรเข้าตัวละคร (+
            {approvedSlips.reduce((sum, s) => sum + s.totalDiamonds, 0).toLocaleString()} D)
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="pixel-button primary px-2 py-1.5 text-[10px]"
              onClick={() => {
                setSlipBannerDismissed(true)
                openPanel('gem-shop')
              }}
            >
              เปิดรับเพชรเลย
            </button>
            <button
              type="button"
              className="pixel-button secondary px-2 py-1.5 text-[10px]"
              onClick={() => setSlipBannerDismissed(true)}
            >
              ซ่อนไว้ก่อน
            </button>
          </div>
        </div>
      )}
      {showSlipNotif && gmPendingSlips.length > 0 && (
        <div className="rounded-xl border border-amber-400/75 bg-background/95 p-3 shadow-2xl backdrop-blur">
          <p className="text-[10px] font-bold tracking-[0.12em] text-amber-300">คิวสลิปรอ GM ตรวจสอบ</p>
          <p className="mt-1 text-xs text-foreground">
            มีผู้เล่นส่งสลิปโอนเงินเข้ามา <strong className="text-amber-200">{gmPendingSlips.length} รายการ</strong>
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="pixel-button primary px-2 py-1.5 text-[10px]"
              onClick={() => {
                setSlipBannerDismissed(true)
                openPanel('gem-shop')
              }}
            >
              เปิดตรวจสลิป
            </button>
            <button
              type="button"
              className="pixel-button secondary px-2 py-1.5 text-[10px]"
              onClick={() => setSlipBannerDismissed(true)}
            >
              ซ่อนไว้ก่อน
            </button>
          </div>
        </div>
      )}
      {partyInvite && (
        <div className="rounded-xl border border-purple-400/60 bg-background/95 p-3 shadow-2xl backdrop-blur">
          <p className="text-[10px] font-bold tracking-[0.15em] text-purple-300">คำเชิญเข้าปาร์ตี้</p>
          <p className="mt-1 text-xs text-foreground">
            {partyInvite.fromIsGm && <span className="mr-1 font-bold text-amber-300">[GM]</span>}
            {partyInvite.fromName}{' '}
            <span className="font-mono text-[11px] text-purple-300">(UID {partyInvite.fromGameUid})</span>{' '}
            เชิญคุณเข้าร่วม <strong className="text-purple-200">{partyInvite.partyName}</strong>
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={partyBusy}
              className="pixel-button primary px-2 py-1.5 text-[10px]"
              onClick={() => void respondParty('accepted')}
            >
              เข้าร่วม
            </button>
            <button
              type="button"
              disabled={partyBusy}
              className="pixel-button secondary px-2 py-1.5 text-[10px]"
              onClick={() => void respondParty('declined')}
            >
              ปฏิเสธ
            </button>
          </div>
        </div>
      )}
      {request && (
        <div className="rounded-xl border border-primary/50 bg-background/95 p-3 shadow-2xl backdrop-blur">
          <p className="text-[10px] font-bold tracking-[0.15em] text-primary">คำขอเพื่อนใหม่</p>
          <p className="mt-1 text-xs text-foreground">
            {request.fromIsGm && <span className="mr-1 font-bold text-amber-300">[GM]</span>}
            {request.fromName}{' '}
            <span className="font-mono text-[11px] text-primary">(UID {request.fromGameUid})</span>{' '}
            ส่งคำขอเพิ่มเพื่อนให้คุณ
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" className="pixel-button primary px-2 py-1.5 text-[10px]" onClick={() => void respond('accepted')}>ยอมรับ</button>
            <button type="button" className="pixel-button secondary px-2 py-1.5 text-[10px]" onClick={() => void respond('declined')}>ปฏิเสธ</button>
          </div>
        </div>
      )}
      {fbTrade && (
        <div className="rounded-xl border border-accent/60 bg-background/95 p-3 shadow-2xl backdrop-blur">
          <p className="text-[10px] font-bold tracking-[0.15em] text-accent">คำขอแลกเปลี่ยน 1v1</p>
          <p className="mt-1 text-xs text-foreground">
            {fbTrade.senderName} <span className="font-mono text-[11px] text-accent">(UID {fbTrade.senderGameUid})</span> ต้องการแลกเปลี่ยนไอเทมกับคุณ
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" className="pixel-button primary px-2 py-1.5 text-[10px]" onClick={() => void respondFbTrade('active')}>ตกลง</button>
            <button type="button" className="pixel-button secondary px-2 py-1.5 text-[10px]" onClick={() => void respondFbTrade('declined')}>ปฏิเสธ</button>
          </div>
        </div>
      )}
      {fbDuel && (
        <div className="rounded-xl border border-rose-400/60 bg-background/95 p-3 shadow-2xl backdrop-blur">
          <p className="text-[10px] font-bold tracking-[0.15em] text-rose-300">คำท้าประลอง Live PvP</p>
          <p className="mt-1 text-xs text-foreground">
            {fbDuel.challengerName} <span className="font-mono text-[11px] text-rose-300">(UID {fbDuel.challengerGameUid})</span> ท้าดวล 1v1 แบบเรียลไทม์!
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" className="pixel-button primary px-2 py-1.5 text-[10px]" onClick={() => void respondFbDuel('active')}>รับคำท้า!</button>
            <button type="button" className="pixel-button secondary px-2 py-1.5 text-[10px]" onClick={() => void respondFbDuel('declined')}>ปฏิเสธ</button>
          </div>
        </div>
      )}
      {trade && (
        <div className="rounded-xl border border-accent/50 bg-background/95 p-3 shadow-2xl backdrop-blur">
          <p className="text-[10px] font-bold tracking-[0.15em] text-accent">คำขอแลกเปลี่ยน</p>
          <p className="mt-1 text-xs text-foreground">ผู้เล่นต้องการแลกเปลี่ยนไอเท็มกับคุณ</p>
          <button type="button" className="pixel-button primary mt-2 w-full px-2 py-1.5 text-[10px]" onClick={() => void acceptTrade()}>เปิดหน้าต่างแลกเปลี่ยน</button>
        </div>
      )}
    </div>
  )
}
