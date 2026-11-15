'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { subscribeFriendSocialState, type PendingFriendRequest } from '@/lib/firebase/friends'
import { getOptionalClient } from '@/lib/supabase/client'
import { game, notify, openPanel } from '@/lib/game/engine'
import { respondFriendRequest } from '@/lib/game/social'

export function SocialNotifications() {
  const [request, setRequest] = useState<PendingFriendRequest | null>(null)
  const [trade, setTrade] = useState<{ id: number; userId: string } | null>(null)

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

  if (!request && !trade) return null

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
