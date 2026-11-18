'use client'

import { useState } from 'react'
import { ArrowDownToLine, Crown, MapPin, Navigation, Radio, Swords, UserPlus, Users, UserX, VolumeX, X } from 'lucide-react'
import { auth as firebaseAuth } from '@/lib/firebase/client'
import { sendFriendRequestByGameUid } from '@/lib/firebase/friends'
import { invitePlayerToPartyAutoCreate } from '@/lib/firebase/parties'
import { formatPresenceStatusLabel, type PresenceStatus } from '@/lib/firebase/presence-helpers'
import { JOBS } from '@/lib/game/data'
import { currentMap, game, getStats, gmKickPlayer, gmMutePlayer, gmSummonPlayer, gmWarpToPlayer, isCurrentAccountGm, notify } from '@/lib/game/engine'
import { MAPS, TILE } from '@/lib/game/maps'
import { formatGameUid } from '@/lib/game/permissions'
import { useGame } from '@/lib/game/use-game'

function statusTone(status: PresenceStatus | undefined) {
  switch (status) {
    case 'combat':
      return 'border-rose-400/50 bg-rose-500/15 text-rose-200'
    case 'moving':
      return 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
    case 'town':
      return 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
    default:
      return 'border-amber-300/40 bg-amber-400/10 text-amber-100'
  }
}

export function OnlinePlayersPopover() {
  useGame()
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [busyUid, setBusyUid] = useState<string | null>(null)

  if (!game.onlinePanelOpen || !game.p) return null

  const activeMap = currentMap()
  const fbUser = firebaseAuth.currentUser
  const isSignedIn = Boolean(fbUser && fbUser.emailVerified)
  const isGm = Boolean(game.p.gm && isCurrentAccountGm())

  const sortedPlayers = [...game.onlinePlayers]
    .filter((other) => !other.invisible)
    .sort((a, b) => {
      const aSame = a.mapId === activeMap.id ? 0 : 1
      const bSame = b.mapId === activeMap.id ? 0 : 1
      if (aSame !== bSame) return aSame - bSame
      if (a.gm !== b.gm) return a.gm ? -1 : 1
      return b.level - a.level
    })

  const sameMapCount = sortedPlayers.filter((other) => other.mapId === activeMap.id).length

  const handleAddFriend = async (targetGameUid: string) => {
    setBusyUid(targetGameUid)
    setFeedback(null)
    try {
      const result = await sendFriendRequestByGameUid(targetGameUid, game.p?.name)
      setFeedback({ type: result.ok ? 'ok' : 'error', text: result.message })
    } catch {
      setFeedback({ type: 'error', text: 'ส่งคำขอเพื่อนไม่สำเร็จ กรุณาลองใหม่' })
    } finally {
      setBusyUid(null)
    }
  }

  const handleInviteParty = async (targetGameUid: string) => {
    const p = game.p
    if (!p) return
    setBusyUid(`party:${targetGameUid}`)
    setFeedback(null)
    try {
      const s = getStats(p)
      const result = await invitePlayerToPartyAutoCreate({
        currentParty: game.party,
        targetGameUid,
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
      setFeedback({ type: result.ok ? 'ok' : 'error', text: result.message })
      if (result.ok) {
        game.chat.push({ id: Date.now(), type: 'system', text: result.message })
        notify()
      }
    } catch {
      setFeedback({ type: 'error', text: 'ชวนเข้าปาร์ตี้ไม่สำเร็จ กรุณาลองใหม่' })
    } finally {
      setBusyUid(null)
    }
  }

  const handleGmWarp = async (other: (typeof sortedPlayers)[number]) => {
    setBusyUid(`warp:${other.userId}`)
    setFeedback(null)
    try {
      const result = await gmWarpToPlayer(other)
      setFeedback({ type: result.ok ? 'ok' : 'error', text: result.message })
      if (result.ok) {
        game.onlinePanelOpen = false
        notify()
      }
    } catch {
      setFeedback({ type: 'error', text: 'วาร์ปไปหาผู้เล่นไม่สำเร็จ' })
    } finally {
      setBusyUid(null)
    }
  }

  const handleGmSummon = async (other: (typeof sortedPlayers)[number]) => {
    setBusyUid(`summon:${other.userId}`)
    setFeedback(null)
    try {
      const result = await gmSummonPlayer(other)
      setFeedback({ type: result.ok ? 'ok' : 'error', text: result.message })
    } catch {
      setFeedback({ type: 'error', text: 'ดึงตัวผู้เล่นมาหาไม่สำเร็จ' })
    } finally {
      setBusyUid(null)
    }
  }

  const handleGmMute = async (other: (typeof sortedPlayers)[number]) => {
    setBusyUid(`mute:${other.userId}`)
    setFeedback(null)
    try {
      const result = await gmMutePlayer(other.gameUid ?? other.userId, 15, 'GM ใบ้แชทชั่วคราว')
      setFeedback({ type: result.ok ? 'ok' : 'error', text: result.message })
    } catch {
      setFeedback({ type: 'error', text: 'ใบ้แชทผู้เล่นไม่สำเร็จ' })
    } finally {
      setBusyUid(null)
    }
  }

  const handleGmKick = async (other: (typeof sortedPlayers)[number]) => {
    setBusyUid(`kick:${other.userId}`)
    setFeedback(null)
    try {
      const result = await gmKickPlayer(other.gameUid ?? other.userId, 'GM ตัดการเชื่อมต่อ')
      setFeedback({ type: result.ok ? 'ok' : 'error', text: result.message })
    } catch {
      setFeedback({ type: 'error', text: 'เตะผู้เล่นไม่สำเร็จ' })
    } finally {
      setBusyUid(null)
    }
  }

  return (
    <div
      className="pointer-events-auto mt-1 w-[min(22rem,calc(100vw-1rem))] rounded-2xl border border-cyan-400/50 bg-background/95 p-2.5 shadow-2xl backdrop-blur-md"
      role="dialog"
      aria-label="ผู้เล่นออนไลน์และตำแหน่งปัจจุบัน"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-border px-1.5 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Radio className="size-3.5 text-emerald-400" aria-hidden />
            <p className="text-xs font-bold text-cyan-200">
              ผู้เล่นออนไลน์ ({sortedPlayers.length})
            </p>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            อยู่แมพเดียวกับคุณ {sameMapCount} คน • อัปเดตตำแหน่งเรียลไทม์
          </p>
        </div>
        <button
          type="button"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="ปิดหน้าต่างผู้เล่นออนไลน์"
          onClick={() => {
            game.onlinePanelOpen = false
            notify()
          }}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-2 max-h-[min(24rem,62vh)] space-y-2 overflow-y-auto px-0.5">
        {!isSignedIn ? (
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-center">
            <p className="text-xs font-semibold text-amber-200">โหมด Guest เล่นแบบออฟไลน์</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              เข้าสู่ระบบ Google ในหน้าต่างเพื่อนหรือหน้าแรก เพื่อซิงค์ตำแหน่งกับผู้เล่นออนไลน์คนอื่น
            </p>
          </div>
        ) : game.presenceError ? (
          <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-center">
            <p className="text-xs font-semibold text-rose-200">พบปัญหาการซิงค์ออนไลน์</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{game.presenceError}</p>
          </div>
        ) : sortedPlayers.length === 0 ? (
          <div className="rounded-xl border border-border bg-secondary/40 p-3 text-center">
            <Users className="mx-auto mb-1.5 size-5 text-muted-foreground" aria-hidden />
            <p className="text-xs font-semibold text-foreground">ยังไม่มีผู้เล่นคนอื่นออนไลน์ตอนนี้</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {game.p.invisible
                ? 'คุณกำลังเปิดโหมดล่องหน (GM) อยู่ จึงซ่อนตัวจากผู้เล่นอื่น'
                : 'เมื่ออีกจอเข้าสู่ระบบ Google คนละบัญชีและเข้าเกมแล้ว ระบบจะแสดงตำแหน่งที่นี่อัตโนมัติ'}
            </p>
          </div>
        ) : (
          sortedPlayers.map((other) => {
            const isSameMap = other.mapId === activeMap.id
            const mapName = MAPS[other.mapId]?.name ?? other.mapId
            const tx = Math.floor(other.x / TILE)
            const ty = Math.floor(other.y / TILE)
            const jobName = JOBS[other.jobId]?.name ?? 'ผู้ฝึกหัด'
            const gameUid = other.gameUid ?? formatGameUid(other.uid)
            const statusLabel = formatPresenceStatusLabel(other.status, other.mapId)

            return (
              <div
                key={other.userId}
                className={`rounded-xl border p-2 transition-colors ${
                  isSameMap
                    ? 'border-emerald-400/50 bg-emerald-500/10'
                    : 'border-border bg-secondary/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="size-2 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                      {other.gm && <Crown className="size-3 shrink-0 text-amber-300" aria-hidden />}
                      <p className={`truncate text-xs font-bold ${other.gm ? 'text-amber-300' : 'text-foreground'}`}>
                        {other.gm ? '[GM] ' : ''}
                        {other.displayName}
                      </p>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        #{gameUid}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-primary">
                      Lv.{other.level} {jobName}
                    </p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold ${statusTone(other.status)}`}>
                    {other.status === 'combat' && <Swords className="size-2.5" aria-hidden />}
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-border/50 pt-1.5">
                  <div className="flex min-w-0 items-center gap-1 text-[10px] text-foreground/90">
                    <MapPin className={`size-3 shrink-0 ${isSameMap ? 'text-emerald-300' : 'text-cyan-300'}`} aria-hidden />
                    <span className="truncate">
                      {mapName} ({tx}, {ty})
                    </span>
                    {isSameMap && (
                      <span className="shrink-0 rounded bg-emerald-400/20 px-1 py-0.2 text-[9px] font-bold text-emerald-300">
                        แมพนี้
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap shrink-0 items-center justify-end gap-1">
                    {isGm && (
                      <>
                        <button
                          type="button"
                          disabled={busyUid === `warp:${other.userId}`}
                          onClick={() => void handleGmWarp(other)}
                          className="pixel-btn inline-flex items-center gap-1 bg-amber-500/25 px-2 py-1 text-[10px] font-semibold text-amber-200 hover:bg-amber-500/35 disabled:opacity-50"
                          aria-label={`วาร์ปไปหา ${other.displayName}`}
                        >
                          <Navigation className="size-2.5" aria-hidden />
                          วาร์ปไปหา
                        </button>
                        <button
                          type="button"
                          disabled={busyUid === `summon:${other.userId}`}
                          onClick={() => void handleGmSummon(other)}
                          className="pixel-btn inline-flex items-center gap-1 bg-amber-400/25 px-2 py-1 text-[10px] font-semibold text-yellow-200 hover:bg-amber-400/35 disabled:opacity-50"
                          aria-label={`ดึง ${other.displayName} มาหา`}
                        >
                          <ArrowDownToLine className="size-2.5" aria-hidden />
                          ดึงมาหา
                        </button>
                        <button
                          type="button"
                          disabled={busyUid === `mute:${other.userId}`}
                          onClick={() => void handleGmMute(other)}
                          className="pixel-btn inline-flex items-center gap-1 bg-rose-500/20 px-2 py-1 text-[10px] font-semibold text-rose-200 hover:bg-rose-500/30 disabled:opacity-50"
                          aria-label={`ใบ้แชท ${other.displayName} 15 นาที`}
                        >
                          <VolumeX className="size-2.5" aria-hidden />
                          ใบ้ 15น.
                        </button>
                        <button
                          type="button"
                          disabled={busyUid === `kick:${other.userId}`}
                          onClick={() => void handleGmKick(other)}
                          className="pixel-btn inline-flex items-center gap-1 bg-destructive/25 px-2 py-1 text-[10px] font-semibold text-destructive hover:bg-destructive/35 disabled:opacity-50"
                          aria-label={`เตะ ${other.displayName}`}
                        >
                          <UserX className="size-2.5" aria-hidden />
                          เตะ
                        </button>
                      </>
                    )}
                    {isSameMap && (
                      <button
                        type="button"
                        onClick={() => {
                          game.socialTargetId = other.userId
                          game.onlinePanelOpen = false
                          notify()
                        }}
                        className="pixel-btn bg-cyan-500/20 px-2 py-1 text-[10px] font-semibold text-cyan-200 hover:bg-cyan-500/30"
                      >
                        โต้ตอบ
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyUid === `party:${gameUid}`}
                      onClick={() => void handleInviteParty(gameUid)}
                      className="pixel-btn inline-flex items-center gap-1 bg-purple-500/25 px-2 py-1 text-[10px] font-semibold text-purple-200 hover:bg-purple-500/35 disabled:opacity-50"
                      aria-label={`ชวนปาร์ตี้ ${other.displayName}`}
                    >
                      <Users className="size-2.5" aria-hidden />
                      ชวนตี้
                    </button>
                    <button
                      type="button"
                      disabled={busyUid === gameUid}
                      onClick={() => void handleAddFriend(gameUid)}
                      className="pixel-btn inline-flex items-center gap-1 bg-primary/20 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/30 disabled:opacity-50"
                      aria-label={`เพิ่มเพื่อน ${other.displayName}`}
                    >
                      <UserPlus className="size-2.5" aria-hidden />
                      แอดเพื่อน
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}

        {feedback && (
          <p className={`px-1 text-[11px] ${feedback.type === 'ok' ? 'text-emerald-300' : 'text-destructive'}`}>
            {feedback.text}
          </p>
        )}
      </div>
    </div>
  )
}
