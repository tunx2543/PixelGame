'use client'

import { useCallback, useEffect, useState } from 'react'
import { Crown, Eye, Flame, Heart, Shield, Swords, Trophy, Zap } from 'lucide-react'
import { JOBS, normalizeJobId } from '@/lib/game/data'
import { auth } from '@/lib/firebase/client'
import {
  cancelDuelChallenge,
  createDuelChallenge,
  submitDuelAction,
  subscribeDuelSession,
  type DuelMatchRecord,
} from '@/lib/firebase/mmo-online'
import { fetchLeaderboardHeroes, syncLeaderboardHero } from '@/lib/firebase/rpg-online'
import { closePanel, game, getStats, notify, recordPvpResultAction } from '@/lib/game/engine'
import { createDuelFighter, type DuelMoveType } from '@/lib/game/mmo-systems'
import {
  TITLE_DEFS,
  computeCombatPower,
  sanitizeRpgExt,
  simulatePvpBattle,
  type LeaderboardHeroEntry,
  type PvpSimulationResult,
} from '@/lib/game/rpg-systems'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { PanelFrame, PxButton } from './panels'

export function ArenaPanel() {
  const g = useGame()
  const p = g.p
  const [tab, setTab] = useState<'arena' | 'live' | 'leaderboard'>(() => (g.activeDuelId ? 'live' : 'arena'))
  const [sortMetric, setSortMetric] = useState<'cp' | 'tower' | 'arena'>('cp')
  const [heroes, setHeroes] = useState<LeaderboardHeroEntry[]>([])
  const [liveDuel, setLiveDuel] = useState<DuelMatchRecord | null>(null)
  const [duelNotice, setDuelNotice] = useState<string | null>(null)
  const [duelBusy, setDuelBusy] = useState(false)
  const [battleReport, setBattleReport] = useState<{
    opponent: LeaderboardHeroEntry
    result: PvpSimulationResult
  } | null>(null)

  const refreshBoard = useCallback(async () => {
    if (!p) return
    const stats = getStats(p)
    const ext = sanitizeRpgExt(p.rpgExt)
    const selfEntry: LeaderboardHeroEntry = {
      userId: auth.currentUser?.uid ?? 'self_local',
      gameUid: p.gameUid ?? (p.uid !== undefined ? String(p.uid).padStart(4, '0') : '1000'),
      name: p.name,
      jobId: p.jobId,
      level: p.level,
      rebirthCount: p.rebirthCount ?? 0,
      combatPower: computeCombatPower(p, stats),
      arenaRating: ext.arenaRating,
      arenaWins: ext.arenaWins,
      highestTowerFloor: p.towerState?.highestFloor ?? 0,
      activeTitle: ext.activeTitle,
      guildName: ext.guildName,
    }
    await syncLeaderboardHero(selfEntry)
    const list = await fetchLeaderboardHeroes(selfEntry)
    setHeroes(list)
  }, [p])

  useEffect(() => {
    void refreshBoard()
  }, [refreshBoard])

  useEffect(() => {
    if (g.activeDuelId) {
      setTab('live')
    }
  }, [g.activeDuelId])

  useEffect(() => {
    if (!g.activeDuelId) {
      setLiveDuel(null)
      return
    }
    const unsub = subscribeDuelSession(g.activeDuelId, (session) => {
      setLiveDuel(session)
    })
    return () => unsub()
  }, [g.activeDuelId])

  if (!p) return null
  const ext = sanitizeRpgExt(p.rpgExt)
  const myStats = getStats(p)
  const myPower = computeCombatPower(p, myStats)
  const myUid = auth.currentUser?.uid ?? 'self_local'
  const opponents = heroes.filter((h) => h.userId !== myUid)
  const onlineChallengers = g.onlinePlayers.filter((o) => !o.invisible && o.userId !== myUid)

  const handleInspect = (userId: string, displayName: string, gameUid?: string) => {
    game.inspectTarget = { userId, displayName, gameUid }
    closePanel()
    notify()
  }

  const handleChallenge = (opp: LeaderboardHeroEntry) => {
    const res = simulatePvpBattle(
      {
        name: p.name,
        jobId: p.jobId,
        maxHp: myStats.maxHp,
        atk: myStats.atk,
        def: myStats.def,
        crit: myStats.crit,
      },
      opp,
    )
    recordPvpResultAction(res.ratingDelta, res.goldReward, res.diamondReward, res.won)
    setBattleReport({ opponent: opp, result: res })
    void refreshBoard()
  }

  const handleStartLiveDuel = async (targetUid: string, targetName: string) => {
    if (duelBusy) return
    setDuelBusy(true)
    const fighter = createDuelFighter({
      uid: myUid,
      name: p.name,
      jobId: p.jobId,
      level: p.level,
      maxHp: myStats.maxHp,
      atk: myStats.atk,
      def: myStats.def,
      crit: myStats.crit,
    })
    const res = await createDuelChallenge({
      targetUidOrGameUid: targetUid,
      challenger: fighter,
      challengerGameUid: p.gameUid ?? '1000',
    })
    setDuelBusy(false)
    setDuelNotice(res.message)
    if (res.ok && res.duelId) {
      game.activeDuelId = res.duelId
      game.duelTarget = { userId: targetUid, displayName: targetName }
      notify()
    }
  }

  const handleDuelMove = async (move: DuelMoveType) => {
    if (!g.activeDuelId || duelBusy) return
    setDuelBusy(true)
    const res = await submitDuelAction(g.activeDuelId, move)
    setDuelBusy(false)
    if (!res.ok) {
      setDuelNotice(res.message)
      return
    }
    if (res.next?.status === 'completed' && res.next.winnerUid) {
      const won = res.next.winnerUid === myUid
      recordPvpResultAction(won ? 35 : -12, won ? 450 : 100, won ? 5 : 0, won)
      setDuelNotice(won ? 'ชนะ Live PvP 1v1! ได้รับ +35 Arena Rating, +450 G, +5 เพชร' : 'พ่ายแพ้ในการประลอง Live PvP')
    }
  }

  const handleExitDuel = async () => {
    if (g.activeDuelId && liveDuel && (liveDuel.status === 'pending' || liveDuel.status === 'active')) {
      await cancelDuelChallenge(g.activeDuelId)
    }
    game.activeDuelId = null
    game.duelTarget = null
    setLiveDuel(null)
    notify()
  }

  return (
    <PanelFrame
      title="อารีน่า PvP, Live Duel & ตารางจัดอันดับผู้กล้า"
      subtitle={`พลังรบของคุณ: ${formatNum(myPower)} CP · คะแนนอารีน่า ${formatNum(ext.arenaRating)} (${ext.arenaWins}W / ${ext.arenaLosses}L)`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-border/70 pb-2.5">
        <PxButton
          variant={tab === 'arena' ? 'primary' : 'secondary'}
          onClick={() => setTab('arena')}
        >
          <span className="flex items-center gap-1.5">
            <Swords className="size-3.5" aria-hidden /> ท้าดวล PvP ทั่วไป
          </span>
        </PxButton>
        <PxButton
          variant={tab === 'live' ? 'primary' : 'secondary'}
          onClick={() => setTab('live')}
        >
          <span className="flex items-center gap-1.5">
            <Flame className="size-3.5" aria-hidden /> Live PvP 1v1 {g.activeDuelId ? '●' : ''}
          </span>
        </PxButton>
        <PxButton
          variant={tab === 'leaderboard' ? 'primary' : 'secondary'}
          onClick={() => setTab('leaderboard')}
        >
          <span className="flex items-center gap-1.5">
            <Trophy className="size-3.5" aria-hidden /> Hall of Fame ({heroes.length})
          </span>
        </PxButton>
      </div>

      {battleReport && tab === 'arena' && (
        <div
          className={`mb-3 border p-3 text-xs ${
            battleReport.result.won
              ? 'border-emerald-400/60 bg-emerald-500/10'
              : 'border-rose-400/60 bg-rose-500/10'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`text-sm font-bold ${battleReport.result.won ? 'text-emerald-300' : 'text-rose-300'}`}>
              {battleReport.result.won ? 'ชัยชนะ!' : 'พ่ายแพ้!'} ปะทะ {battleReport.opponent.name} (Rating{' '}
              {battleReport.result.ratingDelta >= 0 ? `+${battleReport.result.ratingDelta}` : battleReport.result.ratingDelta})
            </p>
            <span className="text-gold font-semibold tabular-nums">
              +{formatNum(battleReport.result.goldReward)} G
              {battleReport.result.diamondReward > 0 ? ` · +${battleReport.result.diamondReward} เพชร` : ''}
            </span>
          </div>
          <div className="mt-2 max-h-28 overflow-y-auto space-y-0.5 text-[11px] text-muted-foreground tabular-nums">
            {battleReport.result.rounds.map((r, i) => (
              <p key={i}>
                เทิร์น {r.round}: {r.actor === 'player' ? p.name : battleReport.opponent.name} ใช้ {r.actionName} ทำ{' '}
                <span className={r.isCrit ? 'font-bold text-amber-300' : 'text-foreground'}>{formatNum(r.damage)}</span> ดาเมจ
              </p>
            ))}
          </div>
        </div>
      )}

      {tab === 'arena' && (
        <div className="grid gap-2 sm:grid-cols-2">
          {opponents.map((opp) => {
            const job = JOBS[normalizeJobId(opp.jobId)]
            const title = opp.activeTitle ? TITLE_DEFS.find((t) => t.id === opp.activeTitle) : null
            return (
              <div
                key={opp.userId}
                className="flex items-center justify-between gap-2 border border-border/80 bg-background/60 p-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground">
                    {opp.name} <span className="text-muted-foreground">#{opp.gameUid}</span>
                  </p>
                  <p className="text-[11px] text-primary tabular-nums">
                    Lv.{opp.level} {job.name} {opp.rebirthCount > 0 ? `· จุติ ${opp.rebirthCount}` : ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    พลังรบ {formatNum(opp.combatPower)} · Arena {formatNum(opp.arenaRating)}
                    {title ? ` · «${title.name}»` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <PxButton
                    variant="secondary"
                    aria-label={`ส่องข้อมูล ${opp.name}`}
                    onClick={() => handleInspect(opp.userId, opp.name, opp.gameUid)}
                  >
                    <Eye className="size-3.5" aria-hidden />
                  </PxButton>
                  <PxButton onClick={() => handleChallenge(opp)}>ท้าดวล!</PxButton>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'live' && (
        <div className="space-y-3">
          {duelNotice && (
            <div className="border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              {duelNotice}
            </div>
          )}

          {g.activeDuelId && liveDuel ? (
            <div className="space-y-3 border border-rose-400/50 bg-background/70 p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-rose-300">
                    ประลองสด 1v1: {liveDuel.challengerName} vs {liveDuel.opponentName}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    เทิร์นที่ {liveDuel.turnNumber} · สถานะ:{' '}
                    {liveDuel.status === 'pending'
                      ? 'รอฝ่ายตรงข้ามตอบรับคำท้า...'
                      : liveDuel.status === 'active'
                        ? liveDuel.activeTurnUid === myUid
                          ? 'ถึงตาของคุณแล้ว!'
                          : 'รออีกฝ่ายออกแอ็กชัน...'
                        : liveDuel.status === 'completed'
                          ? liveDuel.winnerUid === myUid
                            ? 'คุณชนะการประลอง!'
                            : 'ฝ่ายตรงข้ามชนะการประลอง'
                          : 'การประลองถูกยกเลิก'}
                  </p>
                </div>
                <PxButton variant="secondary" onClick={() => void handleExitDuel()}>
                  {liveDuel.status === 'completed' || liveDuel.status === 'cancelled' || liveDuel.status === 'declined'
                    ? 'ปิดหน้าต่างประลอง'
                    : 'ถอนตัว / ยกเลิก'}
                </PxButton>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[liveDuel.challengerUid, liveDuel.opponentUid].map((uid) => {
                  const fighter = liveDuel.fighters[uid]
                  if (!fighter) return null
                  const isTurn = liveDuel.status === 'active' && liveDuel.activeTurnUid === uid
                  return (
                    <div
                      key={uid}
                      className={`border p-2.5 ${
                        isTurn ? 'border-amber-400 bg-amber-500/10' : 'border-border/70 bg-background/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-foreground">
                          {fighter.name} {uid === myUid ? '(คุณ)' : ''}
                        </p>
                        <span className="text-[10px] text-primary">
                          Lv.{fighter.level} {JOBS[normalizeJobId(fighter.jobId)]?.name ?? fighter.jobId}
                        </span>
                      </div>
                      <div className="mt-1.5 flex justify-between text-[11px] tabular-nums">
                        <span className="text-emerald-300">HP</span>
                        <span>
                          {formatNum(fighter.hp)} / {formatNum(fighter.maxHp)}
                        </span>
                      </div>
                      <div className="mt-0.5 h-2.5 w-full overflow-hidden border border-border bg-muted">
                        <div
                          className="h-full bg-emerald-500 transition-[width]"
                          style={{
                            width: `${Math.max(0, Math.round((fighter.hp / Math.max(1, fighter.maxHp)) * 100))}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                        ATK {fighter.atk} · DEF {fighter.def}
                        {fighter.guarded ? ' · [ตั้งโล่อยู่]' : ''}
                        {fighter.potionUsed ? ' · [ใช้ยาแล้ว]' : ''}
                      </p>
                    </div>
                  )
                })}
              </div>

              {liveDuel.status === 'active' && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <PxButton
                    disabled={duelBusy || liveDuel.activeTurnUid !== myUid}
                    onClick={() => void handleDuelMove('attack')}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Swords className="size-3.5" aria-hidden /> โจมตี
                    </span>
                  </PxButton>
                  <PxButton
                    variant="accent"
                    disabled={duelBusy || liveDuel.activeTurnUid !== myUid}
                    onClick={() => void handleDuelMove('skill')}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Zap className="size-3.5" aria-hidden /> สกิล (1.55x)
                    </span>
                  </PxButton>
                  <PxButton
                    variant="secondary"
                    disabled={duelBusy || liveDuel.activeTurnUid !== myUid}
                    onClick={() => void handleDuelMove('guard')}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Shield className="size-3.5" aria-hidden /> ตั้งโล่ (-55%)
                    </span>
                  </PxButton>
                  <PxButton
                    variant="secondary"
                    disabled={
                      duelBusy ||
                      liveDuel.activeTurnUid !== myUid ||
                      Boolean(liveDuel.fighters[myUid]?.potionUsed)
                    }
                    onClick={() => void handleDuelMove('potion')}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Heart className="size-3.5" aria-hidden /> ดื่มยา (+28%)
                    </span>
                  </PxButton>
                </div>
              )}

              <div className="max-h-28 space-y-1 overflow-y-auto border border-border/60 bg-background/80 p-2 text-[11px] text-muted-foreground">
                {liveDuel.logs.map((line, i) => (
                  <p key={i} className="leading-snug text-foreground/90">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2 border border-border/80 bg-background/60 p-3 text-xs">
              <h3 className="font-bold text-primary">เลือกผู้เล่นออนไลน์เพื่อส่งคำท้า Live PvP 1v1</h3>
              {onlineChallengers.length === 0 ? (
                <p className="text-muted-foreground">
                  ยังไม่มีผู้เล่นอื่นออนไลน์ในขณะนี้ (สามารถท้าจากเมนูผู้เล่นบนแผนที่ หรือแท็บท้าดวล PvP ทั่วไปได้ตลอดเวลา)
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {onlineChallengers.map((player) => (
                    <div
                      key={player.userId}
                      className="flex items-center justify-between gap-2 border border-border/70 bg-background/80 p-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground">
                          {player.displayName} <span className="text-muted-foreground">#{player.gameUid}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Lv.{player.level} {JOBS[normalizeJobId(player.jobId)]?.name ?? player.jobId}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <PxButton
                          variant="secondary"
                          aria-label={`ส่องข้อมูล ${player.displayName}`}
                          onClick={() => handleInspect(player.userId, player.displayName, player.gameUid)}
                        >
                          <Eye className="size-3.5" aria-hidden />
                        </PxButton>
                        <PxButton
                          disabled={duelBusy}
                          onClick={() => void handleStartLiveDuel(player.userId, player.displayName)}
                        >
                          ท้าประลองสด
                        </PxButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['cp', 'พลังรบ (CP)'],
                ['tower', 'หอคอยสูงสุด'],
                ['arena', 'คะแนนอารีน่า'],
              ] as const
            ).map(([key, label]) => (
              <PxButton
                key={key}
                variant={sortMetric === key ? 'accent' : 'secondary'}
                onClick={() => setSortMetric(key)}
                className="px-2.5 py-1 text-[11px]"
              >
                {label}
              </PxButton>
            ))}
          </div>
          <div className="space-y-1.5">
            {[...heroes]
              .sort((a, b) =>
                sortMetric === 'tower'
                  ? b.highestTowerFloor - a.highestTowerFloor
                  : sortMetric === 'arena'
                    ? b.arenaRating - a.arenaRating
                    : b.combatPower - a.combatPower,
              )
              .map((h, idx) => {
                const isSelf = h.userId === myUid
                const job = JOBS[normalizeJobId(h.jobId)]
                const metricDisplay =
                  sortMetric === 'tower'
                    ? `ชั้น ${h.highestTowerFloor}`
                    : sortMetric === 'arena'
                      ? `${formatNum(h.arenaRating)} PT`
                      : `${formatNum(h.combatPower)} CP`
                return (
                  <div
                    key={h.userId}
                    className={`flex items-center justify-between gap-2 border p-2.5 text-xs tabular-nums ${
                      isSelf ? 'border-primary bg-primary/10' : 'border-border/70 bg-background/60'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex w-6 shrink-0 items-center justify-center font-bold text-amber-300">
                        {idx === 0 ? <Crown className="size-4" aria-hidden /> : `#${idx + 1}`}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground">
                          {h.name} {isSelf ? '(คุณ)' : ''} {h.guildName ? `[${h.guildName}]` : ''}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Lv.{h.level} {job.name} · หอคอยชั้น {h.highestTowerFloor} · Arena {formatNum(h.arenaRating)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-right">
                      <span className="flex items-center gap-1 font-bold text-primary">
                        <Shield className="size-3.5" aria-hidden /> {metricDisplay}
                      </span>
                      {!isSelf && (
                        <PxButton
                          variant="secondary"
                          aria-label={`ส่องข้อมูล ${h.name}`}
                          onClick={() => handleInspect(h.userId, h.name, h.gameUid)}
                        >
                          <Eye className="size-3.5" aria-hidden />
                        </PxButton>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </PanelFrame>
  )
}
