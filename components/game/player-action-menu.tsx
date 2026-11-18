'use client'

import { useState } from 'react'
import { ArrowDownToLine, Flag, Navigation, UserX, VolumeX, X } from 'lucide-react'
import { auth as firebaseAuth } from '@/lib/firebase/client'
import { invitePlayerToPartyAutoCreate } from '@/lib/firebase/parties'
import { createDuelChallenge, submitPlayerReport } from '@/lib/firebase/mmo-online'
import { formatPresenceStatusLabel } from '@/lib/firebase/presence-helpers'
import { MAPS, TILE } from '@/lib/game/maps'
import { createDuelFighter } from '@/lib/game/mmo-systems'
import { formatGameUid } from '@/lib/game/permissions'
import { createTrade, sendFriendRequest, sendWhisper } from '@/lib/game/social'
import {
  blockPlayerAction,
  game,
  getStats,
  gmKickPlayer,
  gmMutePlayer,
  gmSummonPlayer,
  gmWarpToPlayer,
  isCurrentAccountGm,
  isPlayerBlocked,
  notify,
  openPanel,
  unblockPlayerAction,
} from '@/lib/game/engine'

const REPORT_REASONS = ['ใช้คำหยาบคาย / ก่อกวนแชท', 'สงสัยใช้โปรแกรมช่วยเล่น / บอท', 'หลอกลวง / แอบอ้างทีมงาน', 'พฤติกรรมไม่เหมาะสมอื่นๆ']

export function PlayerActionMenu() {
  const [copied, setCopied] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0])
  const [reportDetails, setReportDetails] = useState('')
  const [reporting, setReporting] = useState(false)
  if (!game.socialTargetId) return null

  const target = game.remotePlayers.find((player) => player.userId === game.socialTargetId)
  const fallback =
    !target && game.socialTargetMeta?.userId === game.socialTargetId ? game.socialTargetMeta : null
  const liveRemoteAnywhere = !target
    ? game.onlinePlayers.find((player) => player.userId === game.socialTargetId && !player.invisible)
    : null
  if (!target && !fallback) return null
  const isGm = Boolean(game.p?.gm && isCurrentAccountGm())

  const closeMenu = () => {
    setReportOpen(false)
    setReportDetails('')
    game.socialTargetId = null
    game.socialTargetMeta = null
    notify()
  }

  const handleSendReport = async (targetUid: string, targetGameUid: string, targetName: string) => {
    if (reporting) return
    setReporting(true)
    try {
      const res = await submitPlayerReport({
        targetUid,
        targetGameUid,
        targetName,
        reason: reportReason,
        details: reportDetails,
      })
      game.chat.push({ id: Date.now(), type: res.ok ? 'system' : 'error', text: res.message })
      if (res.ok) {
        closeMenu()
      } else {
        notify()
      }
    } finally {
      setReporting(false)
    }
  }

  const run = (task: Promise<{ message: string }>) => {
    void task
      .then((result) => {
        game.chat.push({ id: Date.now(), type: 'system', text: result.message })
        closeMenu()
      })
      .catch(() => {
        game.chat.push({ id: Date.now(), type: 'error', text: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' })
        closeMenu()
      })
  }

  const invitePartyByGameUid = (targetUid: string) => {
    const p = game.p
    if (!p) return
    const s = getStats(p)
    run(
      invitePlayerToPartyAutoCreate({
        currentParty: game.party,
        targetGameUid: targetUid,
        senderName: p.name,
        memberInput: {
          gameUid: p.gameUid,
          uid: p.uid,
          name: p.name,
          jobId: p.jobId,
          level: p.level,
          hp: Math.max(0, Math.min(s.maxHp, Math.floor(p.hp))),
          maxHp: Math.max(1, Math.floor(s.maxHp)),
          mapId: p.mapId,
        },
      }),
    )
  }

  const openInspect = (userId: string, displayName: string, gameUid?: string) => {
    game.inspectTarget = { userId, displayName, gameUid }
    closeMenu()
  }

  const challengeDuel = (userId: string, displayName: string) => {
    const p = game.p
    if (!p) return
    const s = getStats(p)
    const selfUid = firebaseAuth.currentUser?.uid ?? 'guest_player'
    const fighter = createDuelFighter({
      uid: selfUid,
      name: p.name,
      jobId: p.jobId,
      level: p.level,
      maxHp: s.maxHp,
      atk: s.atk,
      def: s.def,
      crit: s.crit,
    })
    void createDuelChallenge({
      targetUidOrGameUid: userId,
      challenger: fighter,
      challengerGameUid: p.gameUid ?? '1000',
    })
      .then((res) => {
        game.chat.push({ id: Date.now(), type: res.ok ? 'system' : 'error', text: res.message })
        if (res.ok && res.duelId) {
          game.activeDuelId = res.duelId
          game.duelTarget = { userId, displayName }
          game.socialTargetId = null
          game.socialTargetMeta = null
          openPanel('arena')
        } else {
          closeMenu()
        }
      })
      .catch(() => {
        game.chat.push({ id: Date.now(), type: 'error', text: 'ส่งคำท้าดวล PvP ไม่สำเร็จ' })
        closeMenu()
      })
  }

  if (!target && fallback) {
    const copyUid = async () => {
      if (!fallback.gameUid) return
      try {
        await navigator.clipboard.writeText(fallback.gameUid)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      } catch {
        // Ignore clipboard failures.
      }
    }
    const blocked = isPlayerBlocked(fallback.userId)

    return (
      <div
        className="pointer-events-auto absolute left-1/2 top-1/2 z-40 w-64 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-primary/50 bg-background/95 p-3 shadow-2xl"
        role="dialog"
        aria-label={`ข้อมูลเพื่อน ${fallback.displayName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-foreground">{fallback.displayName}</p>
            {fallback.gameUid && (
              <p className="font-mono text-[10px] text-primary">UID {fallback.gameUid}</p>
            )}
          </div>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-secondary"
            aria-label="ปิดเมนู"
            onClick={closeMenu}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
        <p className="mb-2.5 text-[11px] text-muted-foreground">
          {liveRemoteAnywhere
            ? `กำลังออนไลน์อยู่ที่ ${MAPS[liveRemoteAnywhere.mapId]?.name ?? liveRemoteAnywhere.mapId} (${Math.floor(liveRemoteAnywhere.x / TILE)}, ${Math.floor(liveRemoteAnywhere.y / TILE)}) • ${formatPresenceStatusLabel(liveRemoteAnywhere.status, liveRemoteAnywhere.mapId)}`
            : 'สามารถส่องข้อมูล ชวนปาร์ตี้ กระซิบ หรือท้าดวล Live PvP ได้ทันที'}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            className="pixel-button primary px-2 py-1.5 text-[10px]"
            onClick={() => openInspect(fallback.userId, fallback.displayName, fallback.gameUid)}
          >
            ส่องข้อมูล
          </button>
          {fallback.gameUid && firebaseAuth.currentUser?.emailVerified && (
            <button
              type="button"
              className="pixel-button secondary px-2 py-1.5 text-[10px]"
              onClick={() => invitePartyByGameUid(fallback.gameUid!)}
            >
              ชวนปาร์ตี้
            </button>
          )}
          <button
            type="button"
            className="pixel-button secondary px-2 py-1.5 text-[10px]"
            onClick={() => challengeDuel(fallback.userId, fallback.displayName)}
          >
            ท้า PvP
          </button>
          {isGm && (
            <>
              <button
                type="button"
                className="pixel-button secondary inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] text-amber-300"
                onClick={() => void gmWarpToPlayer(liveRemoteAnywhere ?? fallback.userId).finally(closeMenu)}
              >
                <Navigation className="size-3" aria-hidden />
                วาร์ปไปหา
              </button>
              <button
                type="button"
                className="pixel-button secondary inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] text-yellow-200"
                onClick={() => void gmSummonPlayer(liveRemoteAnywhere ?? fallback.userId).finally(closeMenu)}
              >
                <ArrowDownToLine className="size-3" aria-hidden />
                ดึงมาหา
              </button>
              <button
                type="button"
                className="pixel-button secondary inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] text-rose-300"
                onClick={() => void gmMutePlayer(fallback.gameUid ?? fallback.userId, 15, 'GM ใบ้แชท 15 นาที').finally(closeMenu)}
              >
                <VolumeX className="size-3" aria-hidden />
                ใบ้ 15น.
              </button>
              <button
                type="button"
                className="pixel-button secondary inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] text-destructive"
                onClick={() => void gmKickPlayer(fallback.gameUid ?? fallback.userId, 'GM ตัดการเชื่อมต่อ').finally(closeMenu)}
              >
                <UserX className="size-3" aria-hidden />
                เตะออก
              </button>
            </>
          )}
          {fallback.gameUid && (
            <button
              type="button"
              className="pixel-button secondary px-2 py-1.5 text-[10px]"
              onClick={() => void copyUid()}
            >
              {copied ? 'คัดลอกแล้ว' : 'คัดลอก UID'}
            </button>
          )}
          <button
            type="button"
            className="pixel-button secondary px-2 py-1.5 text-[10px]"
            onClick={() => {
              const res = blocked ? unblockPlayerAction(fallback.userId) : blockPlayerAction(fallback.userId)
              game.chat.push({ id: Date.now(), type: 'system', text: res.message })
              closeMenu()
            }}
          >
            {blocked ? 'ปลดบล็อก' : 'บล็อก'}
          </button>
          <button
            type="button"
            className="pixel-button secondary inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] text-rose-300"
            onClick={() => setReportOpen((v) => !v)}
          >
            <Flag className="size-3" aria-hidden />
            รายงานผู้เล่น
          </button>
          <button
            type="button"
            className="pixel-button secondary px-2 py-1.5 text-[10px]"
            onClick={closeMenu}
          >
            ปิด
          </button>
        </div>
        {reportOpen && (
          <div className="mt-2 space-y-1.5 border-t border-border pt-2 text-[10px]">
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full border border-border bg-background px-1.5 py-1 text-foreground"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              maxLength={200}
              placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)..."
              className="w-full border border-border bg-background px-1.5 py-1 text-foreground outline-none focus:border-primary"
            />
            <button
              type="button"
              disabled={reporting}
              onClick={() => void handleSendReport(fallback.userId, fallback.gameUid ?? '1000', fallback.displayName)}
              className="pixel-button danger w-full py-1 text-[10px] disabled:opacity-50"
            >
              {reporting ? 'กำลังส่งรายงาน...' : 'ยืนยันส่งรายงานให้ GM'}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (!target) return null
  const p = game.p
  const targetGameUid = target.gameUid ?? formatGameUid(target.uid)
  const friendTargetArg = firebaseAuth.currentUser ? targetGameUid : target.userId
  const blocked = isPlayerBlocked(target.userId)

  return (
    <div
      className="pointer-events-auto absolute left-1/2 top-1/2 z-40 w-60 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-primary/50 bg-background/95 p-2.5 shadow-2xl"
      role="dialog"
      aria-label={`เมนูผู้เล่น ${target.displayName}`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-foreground">{target.displayName}</p>
          <p className="text-[10px] text-primary">
            UID {targetGameUid} • Lv.{target.level} • {formatPresenceStatusLabel(target.status, target.mapId)}
          </p>
        </div>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-secondary"
          aria-label="ปิดเมนู"
          onClick={closeMenu}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          className="pixel-button primary px-1 py-2 text-[10px]"
          onClick={() => openInspect(target.userId, target.displayName, targetGameUid)}
        >
          ส่องข้อมูล
        </button>
        <button
          type="button"
          className="pixel-button primary px-1 py-2 text-[10px]"
          onClick={() => invitePartyByGameUid(targetGameUid)}
        >
          ชวนปาร์ตี้
        </button>
        <button
          type="button"
          className="pixel-button secondary px-1 py-2 text-[10px]"
          onClick={() => run(sendFriendRequest(friendTargetArg))}
        >
          เพิ่มเพื่อน
        </button>
        <button
          type="button"
          className="pixel-button secondary px-1 py-2 text-[10px]"
          onClick={() =>
            void createTrade(target.userId, p?.name, p?.gameUid)
              .then((result) => {
                if (result.ok && result.tradeId) {
                  game.tradeTargetId = target.userId
                  game.tradeId = result.tradeId
                  game.socialTargetId = null
                  game.socialTargetMeta = null
                  openPanel('trade')
                } else {
                  game.chat.push({ id: Date.now(), type: 'error', text: result.message })
                  notify()
                }
              })
              .catch(() => {
                game.chat.push({ id: Date.now(), type: 'error', text: 'ส่งคำขอแลกเปลี่ยนไม่สำเร็จ' })
                notify()
              })
          }
        >
          แลกเปลี่ยน
        </button>
        <button
          type="button"
          className="pixel-button secondary px-1 py-2 text-[10px]"
          onClick={() =>
            run(sendWhisper(target.userId, 'สวัสดี!', p?.name ?? 'ผู้กล้า', p?.gameUid ?? '1000'))
          }
        >
          กระซิบ
        </button>
        <button
          type="button"
          className="pixel-button secondary px-1 py-2 text-[10px]"
          onClick={() => challengeDuel(target.userId, target.displayName)}
        >
          ท้า Live PvP
        </button>
        {isGm && (
          <>
            <button
              type="button"
              className="pixel-button secondary inline-flex items-center justify-center gap-1 px-1 py-2 text-[10px] text-amber-300"
              onClick={() => void gmWarpToPlayer(target).finally(closeMenu)}
            >
              <Navigation className="size-3" aria-hidden />
              วาร์ปไปหา
            </button>
            <button
              type="button"
              className="pixel-button secondary inline-flex items-center justify-center gap-1 px-1 py-2 text-[10px] text-yellow-200"
              onClick={() => void gmSummonPlayer(target).finally(closeMenu)}
            >
              <ArrowDownToLine className="size-3" aria-hidden />
              ดึงมาหา
            </button>
            <button
              type="button"
              className="pixel-button secondary inline-flex items-center justify-center gap-1 px-1 py-2 text-[10px] text-rose-300"
              onClick={() => void gmMutePlayer(targetGameUid, 15, 'GM ใบ้แชท 15 นาที').finally(closeMenu)}
            >
              <VolumeX className="size-3" aria-hidden />
              ใบ้ 15น.
            </button>
            <button
              type="button"
              className="pixel-button secondary inline-flex items-center justify-center gap-1 px-1 py-2 text-[10px] text-destructive"
              onClick={() => void gmKickPlayer(targetGameUid, 'GM ตัดการเชื่อมต่อ').finally(closeMenu)}
            >
              <UserX className="size-3" aria-hidden />
              เตะออก
            </button>
          </>
        )}
        <button
          type="button"
          className="pixel-button secondary px-1 py-1.5 text-[10px] text-amber-300"
          onClick={() => {
            const res = blocked ? unblockPlayerAction(target.userId) : blockPlayerAction(target.userId)
            game.chat.push({ id: Date.now(), type: 'system', text: res.message })
            closeMenu()
          }}
        >
          {blocked ? 'ปลดบล็อก' : 'บล็อกผู้เล่น'}
        </button>
        <button
          type="button"
          className="pixel-button secondary inline-flex items-center justify-center gap-1 px-1 py-1.5 text-[10px] text-rose-300"
          onClick={() => setReportOpen((v) => !v)}
        >
          <Flag className="size-3" aria-hidden />
          รายงาน
        </button>
      </div>
      {reportOpen && (
        <div className="mt-2 space-y-1.5 border-t border-border pt-2 text-[10px]">
          <select
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="w-full border border-border bg-background px-1.5 py-1 text-foreground"
          >
            {REPORT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            maxLength={200}
            placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)..."
            className="w-full border border-border bg-background px-1.5 py-1 text-foreground outline-none focus:border-primary"
          />
          <button
            type="button"
            disabled={reporting}
            onClick={() => void handleSendReport(target.userId, targetGameUid, target.displayName)}
            className="pixel-button danger w-full py-1 text-[10px] disabled:opacity-50"
          >
            {reporting ? 'กำลังส่งรายงาน...' : 'ยืนยันส่งรายงานให้ GM'}
          </button>
        </div>
      )}
    </div>
  )
}

