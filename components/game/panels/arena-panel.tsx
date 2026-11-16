'use client'

import { useCallback, useEffect, useState } from 'react'
import { Crown, Shield, Swords, Trophy } from 'lucide-react'
import { JOBS } from '@/lib/game/data'
import { auth } from '@/lib/firebase/client'
import { fetchLeaderboardHeroes, syncLeaderboardHero } from '@/lib/firebase/rpg-online'
import { getStats, recordPvpResultAction } from '@/lib/game/engine'
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
  const [tab, setTab] = useState<'arena' | 'leaderboard'>('arena')
  const [sortMetric, setSortMetric] = useState<'cp' | 'tower' | 'arena'>('cp')
  const [heroes, setHeroes] = useState<LeaderboardHeroEntry[]>([])
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

  if (!p) return null
  const ext = sanitizeRpgExt(p.rpgExt)
  const myStats = getStats(p)
  const myPower = computeCombatPower(p, myStats)
  const myUid = auth.currentUser?.uid ?? 'self_local'
  const opponents = heroes.filter((h) => h.userId !== myUid)

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

  return (
    <PanelFrame
      title="อารีน่า PvP & ตารางจัดอันดับผู้กล้า"
      subtitle={`พลังรบของคุณ: ${formatNum(myPower)} CP · คะแนนอารีน่า ${formatNum(ext.arenaRating)} (${ext.arenaWins}W / ${ext.arenaLosses}L)`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-border/70 pb-2.5">
        <PxButton
          variant={tab === 'arena' ? 'primary' : 'secondary'}
          onClick={() => setTab('arena')}
        >
          <span className="flex items-center gap-1.5">
            <Swords className="size-3.5" aria-hidden /> ท้าดวล PvP 1v1
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

      {battleReport && (
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
            const job = JOBS[opp.jobId] ?? JOBS.novice
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
                <PxButton onClick={() => handleChallenge(opp)}>ท้าดวล!</PxButton>
              </div>
            )
          })}
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
                const job = JOBS[h.jobId] ?? JOBS.novice
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
                    <div className="shrink-0 text-right">
                      <span className="flex items-center gap-1 font-bold text-primary">
                        <Shield className="size-3.5" aria-hidden /> {metricDisplay}
                      </span>
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
