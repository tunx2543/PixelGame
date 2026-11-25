'use client'

import { useEffect, useState } from 'react'
import { Ban, Eye, Flag, MessageSquare, Shield, Swords, Trophy, UserPlus, Users, X } from 'lucide-react'
import { auth as firebaseAuth } from '@/lib/firebase/client'
import { invitePlayerToPartyAutoCreate } from '@/lib/firebase/parties'
import {
  createDuelChallenge,
  inspectPlayerProfile,
  submitPlayerReport,
  type InspectedPlayerProfile,
} from '@/lib/firebase/mmo-online'
import { formatPresenceStatusLabel } from '@/lib/firebase/presence-helpers'
import { JOBS, normalizeJobId } from '@/lib/game/data'
import {
  blockPlayerAction,
  game,
  getBotInspectProfile,
  getStats,
  isPlayerBlocked,
  notify,
  openPanel,
  resolvePlayerFashionLoadout,
  triggerBotSocialReaction,
  unblockPlayerAction,
} from '@/lib/game/engine'
import { resolveFashionLoadoutFromRemote } from '@/lib/game/fashion-renderer'
import { MAPS } from '@/lib/game/maps'
import { createDuelFighter, getJobRole, getJobRoleLabel } from '@/lib/game/mmo-systems'
import { isBotPlayerId } from '@/lib/game/player-bots'
import { TITLE_DEFS } from '@/lib/game/rpg-systems'
import { createTrade, sendFriendRequest, sendWhisper } from '@/lib/game/social'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from './format'
import { SpriteModelCanvas } from './sprite-model-canvas'

const REPORT_REASONS = [
  'ใช้คำไม่สุภาพ / ก่อกวนแชท',
  'โกงเกม / ใช้โปรแกรมช่วยเล่น',
  'สแปมข้อความ / โฆษณา',
  'พฤติกรรมไม่เหมาะสมอื่นๆ',
]

export function PlayerInspectModal() {
  const g = useGame()
  const target = g.inspectTarget
  const [profile, setProfile] = useState<InspectedPlayerProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [whisperText, setWhisperText] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0])
  const [reportDetails, setReportDetails] = useState('')
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!target) {
      setProfile(null)
      setReportOpen(false)
      setFeedback(null)
      return
    }
    let active = true
    setFeedback(null)
    setReportOpen(false)
    const botProfile = getBotInspectProfile(target.userId || target.gameUid || target.displayName)
    if (botProfile) {
      setProfile(botProfile)
      setLoading(false)
      return () => {
        active = false
      }
    }
    setLoading(true)
    void inspectPlayerProfile(target.userId || target.gameUid || target.displayName)
      .then((res) => {
        if (!active) return
        if (res) {
          setProfile(res)
        } else {
          const online = game.onlinePlayers.find(
            (o) => o.userId === target.userId || (target.gameUid && o.gameUid === target.gameUid),
          )
          setProfile({
            userId: target.userId,
            gameUid: target.gameUid ?? online?.gameUid ?? '1000',
            name: target.displayName || online?.displayName || 'นักผจญภัย',
            jobId: normalizeJobId(online?.jobId),
            level: online?.level ?? 1,
            rebirthCount: online?.rebirthCount ?? 0,
            combatPower: Math.max(120, (online?.level ?? 1) * 55),
            arenaRating: 1000,
            arenaWins: 0,
            highestTowerFloor: 0,
            activeTitle: online?.activeTitle || null,
            guildName: online?.guildTag ? `[${online.guildTag}]` : null,
            mapId: online?.mapId,
            status: online?.status,
            isOnline: Boolean(online),
          })
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [target])

  if (!target || !g.p) return null

  const p = g.p
  const selfUid = firebaseAuth.currentUser?.uid ?? 'guest_player'
  const isSelf = Boolean(profile && (profile.userId === selfUid || (p.gameUid && profile.gameUid === p.gameUid)))
  const onlineEntry = profile
    ? game.onlinePlayers.find(
        (o) => o.userId === profile.userId || (profile.gameUid && o.gameUid === profile.gameUid),
      )
    : undefined
  const inspectedFashion = isSelf
    ? resolvePlayerFashionLoadout(p)
    : onlineEntry
      ? resolveFashionLoadoutFromRemote(onlineEntry)
      : null
  const blocked = profile ? isPlayerBlocked(profile.userId) : isPlayerBlocked(target.userId)
  const job = JOBS[normalizeJobId(profile?.jobId)]
  const roleLabel = getJobRoleLabel(getJobRole(normalizeJobId(profile?.jobId)))
  const titleDef = profile?.activeTitle ? TITLE_DEFS.find((t) => t.id === profile.activeTitle) : null

  const closeModal = () => {
    game.inspectTarget = null
    notify()
  }

  const handlePartyInvite = async () => {
    if (!profile || busy) return
    if (isBotPlayerId(profile.userId) || isBotPlayerId(profile.gameUid)) {
      const res = triggerBotSocialReaction(profile.userId, 'party')
      setFeedback({ tone: res.ok ? 'ok' : 'err', text: res.message })
      return
    }
    setBusy(true)
    const s = getStats(p)
    const res = await invitePlayerToPartyAutoCreate({
      currentParty: game.party,
      targetGameUid: profile.gameUid,
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
    })
    setBusy(false)
    setFeedback({ tone: res.ok ? 'ok' : 'err', text: res.message })
  }

  const handleDuel = async () => {
    if (!profile || busy) return
    if (isBotPlayerId(profile.userId) || isBotPlayerId(profile.gameUid)) {
      const res = triggerBotSocialReaction(profile.userId, 'duel')
      setFeedback({ tone: res.ok ? 'ok' : 'err', text: res.message })
      return
    }
    setBusy(true)
    const s = getStats(p)
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
    const res = await createDuelChallenge({
      targetUidOrGameUid: profile.userId,
      challenger: fighter,
      challengerGameUid: p.gameUid ?? '1000',
    })
    setBusy(false)
    if (res.ok && res.duelId) {
      game.activeDuelId = res.duelId
      game.duelTarget = { userId: profile.userId, displayName: profile.name }
      game.inspectTarget = null
      openPanel('arena')
      game.chat.push({ id: Date.now(), type: 'system', text: res.message })
      notify()
      return
    }
    setFeedback({ tone: 'err', text: res.message })
  }

  const handleWhisper = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !whisperText.trim() || busy) return
    setBusy(true)
    const res = await sendWhisper(profile.userId, whisperText.trim(), p.name, p.gameUid ?? '1000')
    setBusy(false)
    if (res.ok) {
      game.chat.push({
        id: Date.now(),
        type: 'player',
        author: `ถึง ${profile.name}`,
        text: `[กระซิบ] ${whisperText.trim()}`,
        channel: 'world',
      })
      setWhisperText('')
      notify()
    }
    setFeedback({ tone: res.ok ? 'ok' : 'err', text: res.message })
  }

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || busy) return
    if (isBotPlayerId(profile.userId)) {
      setFeedback({ tone: 'ok', text: `บันทึกข้อมูลการตรวจสอบ ${profile.name} เรียบร้อยแล้ว` })
      setReportDetails('')
      setReportOpen(false)
      return
    }
    setBusy(true)
    const res = await submitPlayerReport({
      targetUid: profile.userId,
      targetGameUid: profile.gameUid,
      targetName: profile.name,
      reason: reportReason,
      details: reportDetails,
    })
    setBusy(false)
    setFeedback({ tone: res.ok ? 'ok' : 'err', text: res.message })
    if (res.ok) {
      setReportDetails('')
      setReportOpen(false)
    }
  }

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3"
      onClick={closeModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`ข้อมูลผู้เล่น ${target.displayName}`}
        className="pixel-panel w-full max-w-md border-2 border-primary/60 bg-background/95 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-primary" aria-hidden />
            <h2 className="text-sm font-bold text-primary">ข้อมูลผู้เล่น (Player Inspect)</h2>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="ปิดหน้าต่างข้อมูลผู้เล่น"
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {loading && !profile ? (
          <p className="py-8 text-center text-xs text-muted-foreground">กำลังดึงข้อมูลตัวละคร...</p>
        ) : profile ? (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-3 border border-border bg-secondary/40 p-3">
              <div className="border border-border bg-[#131726] p-1">
                <SpriteModelCanvas
                  mode="job"
                  id={profile.jobId}
                  action="auto"
                  dir="down"
                  size={68}
                  fashion={inspectedFashion}
                  rebirthCount={profile.rebirthCount}
                  label={profile.name}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-foreground">{profile.name}</p>
                  <span className="border border-primary/40 bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                    UID {profile.gameUid}
                  </span>
                </div>
                <p className="text-primary">
                  Lv.{profile.level} {job.name} · <span className="text-muted-foreground">{roleLabel}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {profile.isOnline
                    ? `ออนไลน์: ${MAPS[profile.mapId ?? 'town']?.name ?? profile.mapId ?? 'เมือง'} (${formatPresenceStatusLabel((profile.status as 'town' | 'idle' | 'moving' | 'combat' | undefined), profile.mapId)})`
                    : 'ออฟไลน์ / ตัวละครทำเนียบผู้กล้า'}
                </p>
                {(titleDef || profile.guildName) && (
                  <p className="text-[11px] text-amber-300">
                    {profile.guildName ? `[${profile.guildName}] ` : ''}
                    {titleDef ? `«${titleDef.name}»` : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 tabular-nums">
              <div className="border border-border bg-muted/60 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">พลังรบ (CP)</p>
                <p className="font-bold text-primary">{formatNum(profile.combatPower)}</p>
              </div>
              <div className="border border-border bg-muted/60 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Arena</p>
                <p className="font-bold text-amber-300">{formatNum(profile.arenaRating)}</p>
              </div>
              <div className="border border-border bg-muted/60 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">หอคอยสูงสุด</p>
                <p className="font-bold text-cyan-300">ชั้น {profile.highestTowerFloor}</p>
              </div>
              <div className="border border-border bg-muted/60 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">จุติ</p>
                <p className="font-bold text-purple-300">{profile.rebirthCount} รอบ</p>
              </div>
            </div>

            {!isSelf && (
              <>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handlePartyInvite()}
                    className="pixel-btn flex items-center justify-center gap-1 bg-purple-600/80 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-purple-600 disabled:opacity-50"
                  >
                    <Users className="size-3.5" aria-hidden /> ชวนปาร์ตี้
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      void createTrade(profile.userId, p.name, p.gameUid).then((res) => {
                        if (res.ok && res.tradeId) {
                          game.tradeTargetId = profile.userId
                          game.tradeId = res.tradeId
                          game.inspectTarget = null
                          openPanel('trade')
                        } else {
                          setFeedback({ tone: 'err', text: res.message })
                        }
                      })
                    }}
                    className="pixel-btn flex items-center justify-center gap-1 bg-secondary px-2 py-1.5 text-[11px] font-semibold text-foreground hover:brightness-110 disabled:opacity-50"
                  >
                    <Shield className="size-3.5" aria-hidden /> ขอแลกเปลี่ยน
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDuel()}
                    className="pixel-btn flex items-center justify-center gap-1 bg-rose-600/85 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
                  >
                    <Swords className="size-3.5" aria-hidden /> ท้า Live PvP
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      void sendFriendRequest(profile.gameUid).then((res) => {
                        setFeedback({ tone: res.ok ? 'ok' : 'err', text: res.message })
                      })
                    }}
                    className="pixel-btn flex items-center justify-center gap-1 bg-secondary px-2 py-1.5 text-[11px] font-semibold text-foreground hover:brightness-110 disabled:opacity-50"
                  >
                    <UserPlus className="size-3.5" aria-hidden /> เพิ่มเพื่อน
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const res = blocked
                        ? unblockPlayerAction(profile.userId)
                        : blockPlayerAction(profile.userId)
                      setFeedback({ tone: res.ok ? 'ok' : 'err', text: res.message })
                    }}
                    className={`pixel-btn flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-semibold ${
                      blocked
                        ? 'bg-emerald-600/80 text-white'
                        : 'bg-secondary text-amber-300 hover:brightness-110'
                    }`}
                  >
                    <Ban className="size-3.5" aria-hidden /> {blocked ? 'ปลดบล็อก' : 'บล็อกผู้เล่น'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportOpen((v) => !v)}
                    className="pixel-btn flex items-center justify-center gap-1 bg-secondary px-2 py-1.5 text-[11px] font-semibold text-rose-300 hover:brightness-110"
                  >
                    <Flag className="size-3.5" aria-hidden /> รายงาน
                  </button>
                </div>

                <form onSubmit={(e) => void handleWhisper(e)} className="flex gap-1.5">
                  <input
                    value={whisperText}
                    onChange={(e) => setWhisperText(e.target.value)}
                    maxLength={140}
                    placeholder={`กระซิบถึง ${profile.name}...`}
                    className="pixel-input min-w-0 flex-1 px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={busy || !whisperText.trim()}
                    className="pixel-btn flex items-center gap-1 bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    <MessageSquare className="size-3.5" aria-hidden /> ส่งกระซิบ
                  </button>
                </form>

                {reportOpen && (
                  <form
                    onSubmit={(e) => void handleReportSubmit(e)}
                    className="space-y-2 border border-rose-400/40 bg-rose-500/10 p-2.5 text-xs"
                  >
                    <p className="font-bold text-rose-300">รายงานผู้เล่น {profile.name}</p>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="pixel-input w-full px-2 py-1.5 text-xs"
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
                      placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                      className="pixel-input w-full px-2 py-1.5 text-xs"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setReportOpen(false)}
                        className="pixel-btn bg-secondary px-2.5 py-1 text-[11px]"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        disabled={busy}
                        className="pixel-btn bg-destructive px-2.5 py-1 text-[11px] font-semibold text-white"
                      >
                        ส่งรายงาน
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {isSelf && (
              <p className="flex items-center justify-center gap-1.5 border border-primary/30 bg-primary/10 py-2 text-xs text-primary">
                <Trophy className="size-3.5" aria-hidden /> นี่คือตัวละครของคุณเอง
              </p>
            )}

            {feedback && (
              <p
                role="status"
                className={`border px-2.5 py-1.5 text-xs font-semibold ${
                  feedback.tone === 'ok'
                    ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-400/50 bg-rose-500/10 text-rose-300'
                }`}
              >
                {feedback.text}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
