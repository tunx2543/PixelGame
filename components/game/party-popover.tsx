'use client'

import { useState } from 'react'
import {
  Check,
  Crown,
  Edit3,
  LogOut,
  MapPin,
  Navigation,
  Shield,
  Sparkles,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { auth as firebaseAuth } from '@/lib/firebase/client'
import {
  createParty,
  disbandParty,
  kickPartyMember,
  leaveParty,
  renameParty,
  respondPartyInvite,
  sendPartyInvite,
  transferPartyLeadership,
} from '@/lib/firebase/parties'
import {
  MAX_PARTY_SIZE,
  type PartyInviteRecord,
  sortPartyMembers,
} from '@/lib/firebase/party-helpers'
import { formatPresenceStatusLabel } from '@/lib/firebase/presence-helpers'
import { JOBS } from '@/lib/game/data'
import {
  currentMap,
  game,
  getMapMinLevel,
  getStats,
  isCurrentAccountGm,
  notify,
  quitToTitle,
  warpToMapLocation,
} from '@/lib/game/engine'
import { MAPS, TILE } from '@/lib/game/maps'
import { useGame } from '@/lib/game/use-game'

export function PartyPopover() {
  useGame()
  const [partyNameInput, setPartyNameInput] = useState('')
  const [inviteUidInput, setInviteUidInput] = useState('')
  const [renameMode, setRenameMode] = useState(false)
  const [renameInput, setRenameInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  if (!game.partyPanelOpen || !game.p) return null

  const p = game.p
  const fbUser = firebaseAuth.currentUser
  const isSignedIn = Boolean(fbUser && fbUser.emailVerified)
  const selfUid = fbUser?.uid ?? ''
  const party = game.party
  const invites = game.partyInvites
  const activeMap = currentMap()
  const stats = getStats(p)
  const isLeader = Boolean(party && selfUid && party.leaderId === selfUid)
  const sortedMembers = party ? sortPartyMembers(party) : []
  const onlineById = new Map(game.onlinePlayers.map((entry) => [entry.userId, entry]))
  const expPct = Math.round((game.partyExpMul - 1) * 100)
  const goldPct = Math.round((game.partyGoldMul - 1) * 100)

  const currentMemberInput = () => ({
    gameUid: p.gameUid,
    uid: p.uid,
    name: p.name,
    jobId: p.jobId,
    level: p.level,
    hp: Math.max(0, Math.min(stats.maxHp, Math.floor(p.hp))),
    maxHp: Math.max(1, Math.floor(stats.maxHp)),
    mapId: p.mapId,
  })

  const closePopover = () => {
    game.partyPanelOpen = false
    setRenameMode(false)
    notify()
  }

  const runAction = async (fn: () => Promise<{ ok: boolean; message: string }>) => {
    if (busy) return
    setBusy(true)
    setFeedback(null)
    try {
      const res = await fn()
      setFeedback({ type: res.ok ? 'ok' : 'error', text: res.message })
      if (res.ok) {
        game.chat.push({ id: Date.now(), type: 'system', text: res.message })
        notify()
      }
    } catch {
      setFeedback({ type: 'error', text: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' })
    } finally {
      setBusy(false)
    }
  }

  const handleCreateParty = async (event: React.FormEvent) => {
    event.preventDefault()
    await runAction(async () => {
      const res = await createParty(partyNameInput, currentMemberInput(), party)
      if (res.ok) setPartyNameInput('')
      return res
    })
  }

  const handleInviteUid = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!party) return
    await runAction(async () => {
      const res = await sendPartyInvite({
        party,
        targetGameUid: inviteUidInput,
        senderName: p.name,
      })
      if (res.ok) setInviteUidInput('')
      return res
    })
  }

  const handleRenameSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!party) return
    await runAction(async () => {
      const res = await renameParty(party, renameInput)
      if (res.ok) setRenameMode(false)
      return res
    })
  }

  const handleInviteDecision = async (
    invite: PartyInviteRecord,
    decision: 'accepted' | 'declined',
  ) => {
    await runAction(() => respondPartyInvite(invite, decision, currentMemberInput(), party))
  }

  const handleWarpToMember = (mapId: string, liveX?: number, liveY?: number) => {
    const res = warpToMapLocation(mapId, liveX, liveY)
    if (!res.ok) {
      setFeedback({ type: 'error', text: res.message })
    } else {
      game.chat.push({ id: Date.now(), type: 'system', text: res.message })
      notify()
    }
  }

  return (
    <div
      className="pointer-events-auto pixel-panel absolute right-2 top-14 z-50 w-[min(22rem,calc(100vw-1rem))] p-2.5 shadow-2xl md:right-[12.25rem] md:top-3"
      role="dialog"
      aria-label="ระบบปาร์ตี้"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Users className="size-4 shrink-0 text-purple-300" aria-hidden />
            <p className="truncate text-xs font-bold text-purple-200">
              {party ? party.name : 'ระบบปาร์ตี้'}
            </p>
            {party && (
              <span className="shrink-0 border border-purple-400/40 bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-bold text-purple-200">
                {party.memberIds.length}/{MAX_PARTY_SIZE}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {party
              ? isLeader
                ? 'คุณเป็นหัวหน้าปาร์ตี้ • ชวนเพื่อนหรือวาร์ปรวมทีมได้ทันที'
                : 'ดูพลังชีวิต ตำแหน่งแมพ และวาร์ปตามสมาชิกปาร์ตี้'
              : 'รวมทีมสูงสุด 4 คน รับโบนัส EXP & Gold เมื่ออยู่แมพเดียวกัน'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isLeader && party && !renameMode && (
            <button
              type="button"
              onClick={() => {
                setRenameInput(party.name)
                setRenameMode(true)
              }}
              aria-label="เปลี่ยนชื่อปาร์ตี้"
              title="เปลี่ยนชื่อปาร์ตี้"
              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Edit3 className="size-3.5" aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={closePopover}
            aria-label="ปิดหน้าต่างปาร์ตี้"
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-2 max-h-[min(26rem,68vh)] space-y-2.5 overflow-y-auto pr-0.5">
        {!isSignedIn ? (
          <div className="border border-amber-400/40 bg-amber-400/10 p-3 text-center">
            <p className="text-xs font-semibold text-amber-200">ต้องล็อคอิน Google ก่อนใช้งานปาร์ตี้</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              ระบบปาร์ตี้เชื่อมข้อมูลผู้เล่นแบบเรียลไทม์ กรุณาเข้าสู่ระบบด้วยบัญชี Google ที่หน้าเริ่มต้น
            </p>
            <button
              type="button"
              onClick={() => quitToTitle()}
              className="pixel-btn mt-2.5 bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
            >
              กลับหน้าล็อคอิน
            </button>
          </div>
        ) : (
          <>
            {renameMode && party && isLeader && (
              <form onSubmit={(e) => void handleRenameSubmit(e)} className="flex gap-1.5 border border-border bg-secondary/40 p-2">
                <input
                  type="text"
                  maxLength={32}
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  placeholder="ตั้งชื่อปาร์ตี้ใหม่..."
                  className="min-w-0 flex-1 border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-purple-400"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="pixel-btn bg-purple-500/30 px-2.5 py-1 text-[10px] font-semibold text-purple-100 hover:bg-purple-500/40 disabled:opacity-50"
                >
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={() => setRenameMode(false)}
                  className="pixel-btn bg-secondary px-2 py-1 text-[10px] text-muted-foreground"
                >
                  ยกเลิก
                </button>
              </form>
            )}

            {invites.length > 0 && (
              <div className="space-y-1.5 border border-cyan-400/50 bg-cyan-500/10 p-2">
                <p className="text-[10px] font-bold text-cyan-200">
                  คำเชิญเข้าปาร์ตี้ที่รออยู่ ({invites.length})
                </p>
                {invites.map((inv) => (
                  <div key={inv.inviteId} className="flex items-center justify-between gap-2 border border-border/70 bg-background/70 p-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {inv.partyName}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        จาก {inv.fromIsGm ? '[GM] ' : ''}{inv.fromName} (UID {inv.fromGameUid})
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleInviteDecision(inv, 'accepted')}
                        className="pixel-btn flex items-center gap-1 bg-emerald-500/25 px-2 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-500/35 disabled:opacity-50"
                      >
                        <Check className="size-3" aria-hidden />
                        เข้าร่วม
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleInviteDecision(inv, 'declined')}
                        className="pixel-btn bg-secondary px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        ปฏิเสธ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!party ? (
              <form onSubmit={(e) => void handleCreateParty(e)} className="space-y-2 border border-border bg-secondary/35 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-200">
                  <Sparkles className="size-3.5 text-gold" aria-hidden />
                  <span>สร้างปาร์ตี้ใหม่</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  ชวนเพื่อนสูงสุด 4 คน เพื่อรับโบนัส EXP +15% และ Gold +10% ต่อเพื่อน 1 คนที่ฟาร์มอยู่ในแมพเดียวกัน
                </p>
                <input
                  type="text"
                  maxLength={32}
                  value={partyNameInput}
                  onChange={(e) => setPartyNameInput(e.target.value)}
                  placeholder={`ชื่อปาร์ตี้ (เช่น ปาร์ตี้ของ ${p.name})`}
                  className="w-full border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-purple-400"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="pixel-btn flex w-full items-center justify-center gap-1.5 bg-purple-600/80 py-2 text-xs font-bold text-white hover:bg-purple-600 disabled:opacity-50"
                >
                  <Users className="size-3.5" aria-hidden />
                  {busy ? 'กำลังสร้าง...' : 'สร้างปาร์ตี้เลย'}
                </button>
              </form>
            ) : (
              <>
                <div className={`border p-2 ${game.partySameMapCount > 0 ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-border bg-secondary/35'}`}>
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="flex items-center gap-1 font-bold text-emerald-200">
                      <Sparkles className="size-3 text-gold" aria-hidden />
                      {game.partySameMapCount > 0
                        ? `บัฟปาร์ตี้ทำงาน (${game.partySameMapCount} คนในแมพนี้)`
                        : 'บัฟร่วมทีมในแมพเดียวกัน'}
                    </span>
                    <span className="font-mono font-bold text-amber-200">
                      {game.partySameMapCount > 0
                        ? `EXP +${expPct}% • Gold +${goldPct}%`
                        : 'EXP +15% / คน'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {game.partySameMapCount > 0
                      ? 'กำลังได้รับโบนัสค่าประสบการณ์และทองพิเศษจากการล่ามอนสเตอร์ในแมพเดียวกัน'
                      : 'วาร์ปไปฟาร์มแมพเดียวกับสมาชิกปาร์ตี้เพื่อเปิดใช้งานโบนัส EXP & Gold'}
                  </p>
                </div>

                {isLeader && party.memberIds.length < MAX_PARTY_SIZE && (
                  <form onSubmit={(e) => void handleInviteUid(e)} className="flex gap-1.5">
                    <input
                      type="text"
                      value={inviteUidInput}
                      onChange={(e) => setInviteUidInput(e.target.value)}
                      placeholder="ใส่ UID ผู้เล่น เช่น 0123"
                      className="min-w-0 flex-1 border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-purple-400"
                    />
                    <button
                      type="submit"
                      disabled={busy || !inviteUidInput.trim()}
                      className="pixel-btn flex shrink-0 items-center gap-1 bg-purple-600/80 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-purple-600 disabled:opacity-50"
                    >
                      <UserPlus className="size-3" aria-hidden />
                      ชวนเข้าตี้
                    </button>
                  </form>
                )}

                <div className="space-y-1.5">
                  {sortedMembers.map((member) => {
                    const isSelf = member.userId === selfUid
                    const isMemberLeader = member.userId === party.leaderId
                    const liveOnline = !isSelf ? onlineById.get(member.userId) : null
                    const liveMapId = isSelf ? p.mapId : (liveOnline?.mapId ?? member.mapId)
                    const liveLevel = isSelf ? p.level : (liveOnline?.level ?? member.level)
                    const liveJobId = isSelf ? p.jobId : (liveOnline?.jobId ?? member.jobId)
                    const liveHp = isSelf ? Math.max(0, Math.floor(p.hp)) : member.hp
                    const liveMaxHp = isSelf ? Math.max(1, Math.floor(stats.maxHp)) : Math.max(1, member.maxHp)
                    const hpPct = Math.min(100, Math.max(0, Math.round((liveHp / liveMaxHp) * 100)))
                    const targetMap = MAPS[liveMapId]
                    const mapName = targetMap?.name ?? liveMapId
                    const isSameMap = liveMapId === activeMap.id
                    const isOnline = isSelf || Boolean(liveOnline)
                    const minLv = targetMap ? getMapMinLevel(targetMap) : 1
                    const canWarp = !isSelf && Boolean(targetMap) && (p.level >= minLv || isCurrentAccountGm())
                    const jobName = JOBS[liveJobId]?.name ?? 'ผู้ฝึกหัด'

                    return (
                      <div
                        key={member.userId}
                        className={`border p-2 ${
                          isSelf
                            ? 'border-purple-400/50 bg-purple-500/10'
                            : isSameMap && isOnline
                              ? 'border-emerald-400/50 bg-emerald-500/10'
                              : 'border-border bg-secondary/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span
                                className={`size-2 shrink-0 rounded-full ${
                                  isOnline ? 'bg-emerald-400' : 'bg-muted-foreground/50'
                                }`}
                                aria-hidden
                              />
                              {isMemberLeader && (
                                <Crown className="size-3 shrink-0 text-amber-300" aria-hidden />
                              )}
                              <p className={`truncate text-xs font-bold ${member.isGm ? 'text-amber-300' : 'text-foreground'}`}>
                                {member.isGm ? '[GM] ' : ''}
                                {member.name}
                              </p>
                              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                                #{member.gameUid}
                              </span>
                              {isSelf && (
                                <span className="shrink-0 bg-purple-500/25 px-1 text-[9px] font-semibold text-purple-200">
                                  ฉัน
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[10px] text-primary">
                              Lv.{liveLevel} {jobName}
                              {isMemberLeader && <span className="ml-1.5 text-amber-300">• หัวหน้า</span>}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 border px-1.5 py-0.5 text-[9px] font-semibold ${
                              isOnline
                                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                                : 'border-border bg-muted/50 text-muted-foreground'
                            }`}
                          >
                            {isSelf
                              ? 'ออนไลน์'
                              : liveOnline
                                ? formatPresenceStatusLabel(liveOnline.status, liveOnline.mapId)
                                : 'ออฟไลน์'}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center gap-1.5 text-[9px]">
                          <span className="text-muted-foreground">HP</span>
                          <div className="h-1.5 flex-1 overflow-hidden bg-muted/70">
                            <div className="h-full bg-hp transition-[width]" style={{ width: `${hpPct}%` }} />
                          </div>
                          <span className="shrink-0 font-mono text-muted-foreground tabular-nums">
                            {liveHp}/{liveMaxHp}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-border/50 pt-1.5">
                          <div className="flex min-w-0 items-center gap-1 text-[10px] text-foreground/90">
                            <MapPin className={`size-3 shrink-0 ${isSameMap ? 'text-emerald-300' : 'text-cyan-300'}`} aria-hidden />
                            <span className="truncate">
                              {mapName}
                              {liveOnline ? ` (${Math.floor(liveOnline.x / TILE)}, ${Math.floor(liveOnline.y / TILE)})` : ''}
                            </span>
                          </div>

                          {!isSelf && (
                            <div className="flex shrink-0 items-center gap-1">
                              {!isSameMap && (
                                <button
                                  type="button"
                                  disabled={!canWarp}
                                  title={
                                    canWarp
                                      ? `วาร์ปตาม ${member.name} ไปยัง ${mapName}`
                                      : `ต้องการ Lv.${minLv}+ เพื่อเข้า ${mapName}`
                                  }
                                  onClick={() => handleWarpToMember(liveMapId, liveOnline?.x, liveOnline?.y)}
                                  className="pixel-btn flex items-center gap-1 bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-45"
                                >
                                  <Navigation className="size-2.5" aria-hidden />
                                  {canWarp ? 'ตามไปหา' : `Lv.${minLv}+`}
                                </button>
                              )}
                              {isLeader && (
                                <>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    title={`โอนหัวหน้าให้ ${member.name}`}
                                    onClick={() => void runAction(() => transferPartyLeadership(party, member.userId))}
                                    className="pixel-btn flex items-center gap-0.5 bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
                                  >
                                    <Shield className="size-2.5" aria-hidden />
                                    โอน
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    title={`นำ ${member.name} ออกจากปาร์ตี้`}
                                    onClick={() => void runAction(() => kickPartyMember(party, member.userId))}
                                    className="pixel-btn flex items-center gap-0.5 bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-rose-200 hover:bg-rose-500/30 disabled:opacity-50"
                                  >
                                    <UserMinus className="size-2.5" aria-hidden />
                                    เตะ
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction(() => leaveParty(party, selfUid))}
                    className="pixel-btn flex flex-1 items-center justify-center gap-1 bg-secondary py-1.5 text-[10px] font-semibold text-foreground hover:bg-secondary/80 disabled:opacity-50"
                  >
                    <LogOut className="size-3" aria-hidden />
                    ออกจากปาร์ตี้
                  </button>
                  {isLeader && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runAction(() => disbandParty(party))}
                      className="pixel-btn flex items-center justify-center gap-1 bg-rose-500/25 px-3 py-1.5 text-[10px] font-semibold text-rose-200 hover:bg-rose-500/35 disabled:opacity-50"
                    >
                      <Trash2 className="size-3" aria-hidden />
                      ยุบปาร์ตี้
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {feedback && (
          <p className={`px-1 text-[11px] ${feedback.type === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}>
            {feedback.text}
          </p>
        )}
      </div>
    </div>
  )
}
