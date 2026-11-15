'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { subscribeFriendSocialState, type PendingFriendRequest } from '@/lib/firebase/friends'
import { respondPartyInvite } from '@/lib/firebase/parties'
import { getOptionalClient } from '@/lib/supabase/client'
import { game, getStats, notify, openPanel } from '@/lib/game/engine'
import { respondFriendRequest } from '@/lib/game/social'
import { useGame } from '@/lib/game/use-game'

export function SocialNotifications() {
  useGame()
  const [request, setRequest] = useState<PendingFriendRequest | null>(null)
  const [trade, setTrade] = useState<{ id: number; userId: string } | null>(null)
  const [partyBusy, setPartyBusy] = useState(false)

  useEffect(() => {
    let unsubSocial = () => {}
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      unsubSocial()
      unsubSocial = () => {}
      if (fbUser && fbUser.emailVerified) {
        unsubSocial = subscribeFriendSocialState(fbUser.uid, (snapshot) => {
          setRequest(snapshot.incomingRequests[0] ?? null)
        })
      } else {
        setRequest(null)
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
      unsubAuth()
      if (timer !== null) window.clearInterval(timer)
    }
  }, [])

  const partyInvite = game.partyInvites[0] ?? null

  if (!request && !trade && !partyInvite) return null

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
