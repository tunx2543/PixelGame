'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCheck, Coins, Gem, Gift, Mail, Megaphone, Send, Trash2 } from 'lucide-react'
import { ITEMS } from '@/lib/game/data'
import { auth } from '@/lib/firebase/client'
import { fetchActiveServerGiftDrops, type ServerGiftDropRecord } from '@/lib/firebase/gm-events'
import {
  deleteMailEntry,
  fetchMailbox,
  markMailClaimed,
  sendMailGiftByGameUid,
  type MailMessageRecord,
} from '@/lib/firebase/rpg-online'
import {
  claimMailboxRewardAction,
  claimServerGiftDropAction,
  deductGoldForMailGiftAction,
} from '@/lib/game/engine'
import { playQuestClaimSfx } from '@/lib/game/sfx'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { ItemIcon } from '../item-icon'
import { PanelFrame, PxButton } from './panels'

export function MailPanel() {
  const { p } = useGame()
  const [tab, setTab] = useState<'inbox' | 'send'>('inbox')
  const [mails, setMails] = useState<MailMessageRecord[]>([])
  const [serverDrops, setServerDrops] = useState<ServerGiftDropRecord[]>([])
  const [targetUid, setTargetUid] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [giftGold, setGiftGold] = useState('100')
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refreshMail = useCallback(async () => {
    const [list, drops] = await Promise.all([
      fetchMailbox(auth.currentUser?.uid),
      fetchActiveServerGiftDrops(),
    ])
    setMails(list)
    setServerDrops(drops)
  }, [])

  useEffect(() => {
    void refreshMail()
  }, [refreshMail])

  if (!p) return null
  const claimedSet = new Set(p.claimedGiftDropIds ?? [])
  const unclaimed = mails.filter((m) => !m.claimed)
  const unclaimedDrops = serverDrops.filter((d) => !claimedSet.has(d.dropId) && d.expiresAtMs > Date.now())
  const totalUnclaimed = unclaimed.length + unclaimedDrops.length
  const totalInboxCount = mails.length + serverDrops.length

  const handleClaim = async (m: MailMessageRecord) => {
    if (m.claimed || busy) return
    setBusy(true)
    const res = claimMailboxRewardAction({
      gold: m.gold,
      diamonds: m.diamonds,
      itemId: m.itemId ?? undefined,
      qty: m.qty || 1,
      plus: m.plus,
    })
    if (!res.ok) {
      setBusy(false)
      setNotice(res.message)
      return
    }
    await markMailClaimed(m.mailId)
    playQuestClaimSfx(false)
    setNotice(res.message)
    setBusy(false)
    await refreshMail()
  }

  const handleClaimDrop = (drop: ServerGiftDropRecord) => {
    if (busy || claimedSet.has(drop.dropId)) return
    setBusy(true)
    const res = claimServerGiftDropAction(drop)
    if (res.ok) playQuestClaimSfx(true)
    setNotice(res.message)
    setBusy(false)
  }

  const handleClaimAll = async () => {
    if (totalUnclaimed === 0 || busy) return
    setBusy(true)
    let claimedCount = 0
    for (const drop of unclaimedDrops) {
      const res = claimServerGiftDropAction(drop)
      if (!res.ok) break
      claimedCount += 1
    }
    for (const m of unclaimed) {
      const res = claimMailboxRewardAction({
        gold: m.gold,
        diamonds: m.diamonds,
        itemId: m.itemId ?? undefined,
        qty: m.qty || 1,
        plus: m.plus,
      })
      if (!res.ok) break
      await markMailClaimed(m.mailId)
      claimedCount += 1
    }
    if (claimedCount > 0) playQuestClaimSfx(true)
    setNotice(claimedCount > 0 ? `รับของขวัญจากจดหมาย ${claimedCount} รายการแล้ว!` : 'กระเป๋าเต็ม')
    setBusy(false)
    await refreshMail()
  }

  const handleSendGift = async () => {
    if (busy) return
    const goldVal = Math.max(0, Math.floor(Number(giftGold) || 0))
    if (goldVal > p.gold) {
      setNotice(`ทองไม่พอส่งของขวัญ (มี ${formatNum(p.gold)} G)`)
      return
    }
    setBusy(true)
    if (goldVal > 0 && !deductGoldForMailGiftAction(goldVal)) {
      setBusy(false)
      setNotice('หักทองไม่สำเร็จ')
      return
    }
    const res = await sendMailGiftByGameUid({
      targetGameUid: targetUid,
      senderName: p.name,
      senderGameUid: p.gameUid ?? '1000',
      subject: subject || `ของขวัญจาก ${p.name}`,
      body: body || 'ขอให้สนุกกับการผจญภัย!',
      gold: goldVal,
    })
    setBusy(false)
    if (!res.ok) {
      if (goldVal > 0) claimMailboxRewardAction({ gold: goldVal })
      setNotice(res.error ?? 'ส่งจดหมายไม่สำเร็จ')
      return
    }
    playQuestClaimSfx(false)
    setNotice(`ส่งของขวัญ ${formatNum(goldVal)} G ถึง UID #${targetUid.trim()} สำเร็จ!`)
    setTargetUid('')
    setSubject('')
    setBody('')
    if (targetUid.trim() === (p.gameUid ?? '1000')) {
      await refreshMail()
    }
  }

  return (
    <PanelFrame
      title="กล่องจดหมาย & ส่งของขวัญ"
      subtitle={`จดหมายที่ยังไม่ได้รับ ${totalUnclaimed} รายการ · UID ของคุณคือ #${p.gameUid ?? '1000'}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
        <div className="flex gap-2">
          <PxButton variant={tab === 'inbox' ? 'primary' : 'secondary'} onClick={() => setTab('inbox')}>
            <span className="flex items-center gap-1.5">
              <Mail className="size-3.5" aria-hidden /> กล่องจดหมาย ({totalInboxCount})
            </span>
          </PxButton>
          <PxButton variant={tab === 'send' ? 'primary' : 'secondary'} onClick={() => setTab('send')}>
            <span className="flex items-center gap-1.5">
              <Send className="size-3.5" aria-hidden /> ส่งของขวัญให้เพื่อน
            </span>
          </PxButton>
        </div>
        {tab === 'inbox' && totalUnclaimed > 0 && (
          <PxButton variant="accent" disabled={busy} onClick={handleClaimAll}>
            <span className="flex items-center gap-1.5">
              <CheckCheck className="size-3.5" aria-hidden /> รับทั้งหมด ({totalUnclaimed})
            </span>
          </PxButton>
        )}
      </div>

      {notice && (
        <div className="mb-3 border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary" role="status">
          {notice}
        </div>
      )}

      {tab === 'inbox' && (
        <div className="space-y-2">
          {serverDrops.map((drop) => {
            const isClaimed = claimedSet.has(drop.dropId)
            return (
              <div
                key={drop.dropId}
                className={`flex flex-wrap items-center justify-between gap-3 border p-3 text-xs ${
                  isClaimed
                    ? 'border-border/50 bg-background/40 opacity-75'
                    : 'border-amber-400/70 bg-amber-400/10'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Megaphone className={`size-4 shrink-0 ${isClaimed ? 'text-muted-foreground' : 'text-amber-300'}`} aria-hidden />
                    <span className="border border-amber-400/60 bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">
                      แจกทั้งเซิร์ฟ
                    </span>
                    <p className="truncate font-bold text-foreground">{drop.subject}</p>
                    <span className="text-[10px] text-muted-foreground">
                      จาก GM {drop.authorName}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{drop.body}</p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] tabular-nums">
                    {drop.gold > 0 && (
                      <span className="flex items-center gap-1 text-gold">
                        <Coins className="size-3" aria-hidden /> +{formatNum(drop.gold)} G
                      </span>
                    )}
                    {drop.diamonds > 0 && (
                      <span className="flex items-center gap-1 text-cyan-300">
                        <Gem className="size-3" aria-hidden /> +{formatNum(drop.diamonds)} เพชร
                      </span>
                    )}
                    {drop.itemId && ITEMS[drop.itemId] && (
                      <span className="flex items-center gap-1 text-emerald-300">
                        <ItemIcon itemId={drop.itemId} size={18} />
                        {ITEMS[drop.itemId].name}
                        {drop.plus > 0 ? ` +${drop.plus}` : ''} x{drop.qty || 1}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!isClaimed ? (
                    <PxButton variant="accent" disabled={busy} onClick={() => handleClaimDrop(drop)}>
                      รับของขวัญ
                    </PxButton>
                  ) : (
                    <span className="border border-border/60 px-2 py-1 text-[10px] text-muted-foreground">
                      รับแล้ว
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {mails.length === 0 && serverDrops.length === 0 ? (
            <p className="border border-border/70 bg-background/50 p-4 text-center text-xs text-muted-foreground">
              กล่องจดหมายว่างเปล่า
            </p>
          ) : (
            mails.map((m) => (
              <div
                key={m.mailId}
                className={`flex flex-wrap items-center justify-between gap-3 border p-3 text-xs ${
                  m.claimed ? 'border-border/50 bg-background/40 opacity-75' : 'border-primary/60 bg-primary/5'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Gift className={`size-4 shrink-0 ${m.claimed ? 'text-muted-foreground' : 'text-gold'}`} aria-hidden />
                    <p className="truncate font-bold text-foreground">{m.subject}</p>
                    <span className="text-[10px] text-muted-foreground">
                      จาก {m.senderName} #{m.senderGameUid}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{m.body}</p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] tabular-nums">
                    {m.gold > 0 && (
                      <span className="flex items-center gap-1 text-gold">
                        <Coins className="size-3" aria-hidden /> +{formatNum(m.gold)} G
                      </span>
                    )}
                    {m.diamonds > 0 && (
                      <span className="flex items-center gap-1 text-cyan-300">
                        <Gem className="size-3" aria-hidden /> +{formatNum(m.diamonds)} เพชร
                      </span>
                    )}
                    {m.itemId && ITEMS[m.itemId] && (
                      <span className="flex items-center gap-1 text-emerald-300">
                        <ItemIcon itemId={m.itemId} size={18} />
                        {ITEMS[m.itemId].name}
                        {m.plus > 0 ? ` +${m.plus}` : ''} x{m.qty || 1}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!m.claimed ? (
                    <PxButton variant="primary" disabled={busy} onClick={() => handleClaim(m)}>
                      รับของขวัญ
                    </PxButton>
                  ) : (
                    <PxButton
                      variant="danger"
                      disabled={busy}
                      onClick={async () => {
                        await deleteMailEntry(m.mailId)
                        await refreshMail()
                      }}
                    >
                      <span className="flex items-center gap-1">
                        <Trash2 className="size-3" aria-hidden /> ลบ
                      </span>
                    </PxButton>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'send' && (
        <div className="space-y-3 border border-border/80 bg-background/60 p-3 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-muted-foreground">Game UID ผู้รับ (ตัวเลข 4-8 หลัก)</span>
              <input
                value={targetUid}
                onChange={(e) => setTargetUid(e.target.value)}
                placeholder="เช่น 1001"
                className="pixel-input w-full px-2.5 py-1.5 text-xs tabular-nums"
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">จำนวนทองที่จะส่ง (Gold)</span>
              <input
                type="number"
                min={0}
                value={giftGold}
                onChange={(e) => setGiftGold(e.target.value)}
                className="pixel-input w-full px-2.5 py-1.5 text-xs tabular-nums"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-muted-foreground">หัวข้อจดหมาย</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={60}
              placeholder="ของขวัญจากเพื่อนร่วมทาง"
              className="pixel-input w-full px-2.5 py-1.5 text-xs"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-muted-foreground">ข้อความแนบท้าย</span>
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={200}
              placeholder="สู้ๆ นะ!"
              className="pixel-input w-full px-2.5 py-1.5 text-xs"
            />
          </label>
          <PxButton variant="accent" disabled={busy || !targetUid.trim()} onClick={handleSendGift}>
            <span className="flex items-center gap-1.5">
              <Send className="size-3.5" aria-hidden /> ส่งจดหมายของขวัญ
            </span>
          </PxButton>
        </div>
      )}
    </PanelFrame>
  )
}
