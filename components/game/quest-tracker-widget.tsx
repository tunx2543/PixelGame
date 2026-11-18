'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Eye, EyeOff, ScrollText } from 'lucide-react'
import { useDailyMissions } from '@/lib/game/daily-missions'
import { openPanel } from '@/lib/game/engine'
import {
  QUEST_DEFS,
  getQuestMetricValue,
  isQuestClaimed,
  sanitizePetState,
  sanitizeQuestState,
  sanitizeTowerState,
} from '@/lib/game/systems'
import { updateUiPref, useUiLayout } from '@/lib/game/ui-layout'
import { useGame } from '@/lib/game/use-game'

interface TrackedQuestItem {
  id: string
  title: string
  current: number
  target: number
  ready: boolean
  tag: string
}

export function QuestTrackerWidget({ compactViewport = false }: { compactViewport?: boolean }) {
  const { p } = useGame()
  const dailyMissions = useDailyMissions()
  const layout = useUiLayout()
  const [shortExpanded, setShortExpanded] = useState(false)

  if (!p) return null

  const { questTrackerCollapsed, questTrackerHidden } = layout.preferences
  const effectiveCollapsed = compactViewport ? !shortExpanded : questTrackerCollapsed

  if (questTrackerHidden) {
    return (
      <button
        type="button"
        data-testid="quest-tracker-restore"
        onClick={() => updateUiPref('questTrackerHidden', false)}
        aria-label="แสดงแถบติดตามภารกิจ"
        className="pointer-events-auto pixel-panel flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold text-primary shadow-md hover:bg-secondary/80"
      >
        <Eye className="size-3" aria-hidden />
        <span>ภารกิจ</span>
        {dailyMissions.claimableCount > 0 && (
          <span className="rounded bg-accent px-1 text-[9px] font-bold text-accent-foreground tabular-nums">
            {dailyMissions.claimableCount}
          </span>
        )}
      </button>
    )
  }

  const tracked: TrackedQuestItem[] = []

  // Prioritize daily random missions (unclaimed first)
  const dailyList = dailyMissions.board?.missions ?? []
  const sortedDaily = [...dailyList].sort((a, b) => {
    if (a.claimed !== b.claimed) return a.claimed ? 1 : -1
    const aReady = a.progress >= a.target
    const bReady = b.progress >= b.target
    if (aReady !== bReady) return aReady ? -1 : 1
    return 0
  })

  for (const m of sortedDaily) {
    if (tracked.length >= 3) break
    if (m.claimed) continue
    tracked.push({
      id: `dm-${m.id}`,
      title: m.title,
      current: Math.min(m.target, m.progress),
      target: m.target,
      ready: m.progress >= m.target,
      tag: 'รายวัน',
    })
  }

  // Fill up to 3 items with active milestone/daily QUEST_DEFS
  if (tracked.length < 3) {
    const qs = sanitizeQuestState(p.questState, p.kills)
    const ts = sanitizeTowerState(p.towerState)
    const ps = sanitizePetState(p.petState, p.ownedGemItems, p.equippedGemCompanion)
    for (const q of QUEST_DEFS) {
      if (tracked.length >= 3) break
      if (isQuestClaimed(q, qs)) continue
      const cur = Math.min(q.target, getQuestMetricValue(q.metric, qs, ts, ps))
      tracked.push({
        id: `q-${q.id}`,
        title: q.title,
        current: cur,
        target: q.target,
        ready: cur >= q.target,
        tag: q.category === 'milestone' ? 'เป้าหมาย' : 'เควสต์',
      })
    }
  }

  const readyCount = tracked.filter((t) => t.ready).length + dailyMissions.claimableCount

  return (
    <section
      data-testid="daily-missions-widget"
      aria-label="ตัวติดตามภารกิจ"
      className="pointer-events-auto pixel-panel w-full px-2 py-1.5 shadow-lg"
    >
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => openPanel('quests')}
          className="flex min-w-0 items-center gap-1 text-left text-[10px] font-bold text-primary hover:underline"
        >
          <ScrollText className="size-3 shrink-0" aria-hidden />
          <span className="truncate">ภารกิจ ({tracked.length}/3)</span>
          {readyCount > 0 && (
            <span className="shrink-0 rounded bg-accent/25 px-1 text-[9px] font-bold text-accent tabular-nums">
              รับได้
            </span>
          )}
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              if (compactViewport) setShortExpanded((v) => !v)
              else updateUiPref('questTrackerCollapsed', !questTrackerCollapsed)
            }}
            aria-expanded={!effectiveCollapsed}
            aria-label={effectiveCollapsed ? 'ขยายแถบภารกิจ' : 'ย่อแถบภารกิจ'}
            title={effectiveCollapsed ? 'ขยาย' : 'ย่อ'}
            className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            {effectiveCollapsed ? <ChevronDown className="size-3.5" aria-hidden /> : <ChevronUp className="size-3.5" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={() => updateUiPref('questTrackerHidden', true)}
            aria-label="ซ่อนแถบภารกิจ"
            title="ซ่อนแถบภารกิจ"
            className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <EyeOff className="size-3" aria-hidden />
          </button>
        </div>
      </div>

      {!effectiveCollapsed && (
        <div className={`mt-1.5 space-y-1 border-t border-border/60 pt-1.5 ${compactViewport ? 'max-h-24 overflow-y-auto' : ''}`}>
          {tracked.length === 0 ? (
            <button
              type="button"
              onClick={() => openPanel('quests')}
              className="block w-full py-1 text-center text-[10px] text-muted-foreground hover:text-foreground"
            >
              ทำภารกิจทั้งหมดครบแล้ว! คลิกเพื่อดูรางวัล
            </button>
          ) : (
            tracked.map((item) => {
              const pct = Math.min(100, Math.round((item.current / Math.max(1, item.target)) * 100))
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openPanel('quests')}
                  className="block w-full rounded border border-border/50 bg-background/45 px-1.5 py-1 text-left transition-colors hover:border-primary/60"
                >
                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    <span className={`flex min-w-0 items-center gap-1 truncate font-semibold ${item.ready ? 'text-accent' : 'text-foreground'}`}>
                      {item.ready && <CheckCircle2 className="size-2.5 shrink-0 text-accent" aria-hidden />}
                      <span className="truncate">{item.title}</span>
                    </span>
                    <span className={`shrink-0 font-mono text-[9px] tabular-nums ${item.ready ? 'font-bold text-accent' : 'text-muted-foreground'}`}>
                      {item.current}/{item.target}
                    </span>
                  </div>
                  <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-muted/80">
                    <div
                      className={`h-full transition-[width] ${item.ready ? 'bg-accent' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </section>
  )
}
