'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ScrollText } from 'lucide-react'
import { useDailyMissions } from '@/lib/game/daily-missions'
import { openPanel } from '@/lib/game/engine'

export function DailyMissionsWidget() {
  const dailyMissions = useDailyMissions()
  const [expanded, setExpanded] = useState(false)

  if (!dailyMissions.board) return null

  const completedCount = dailyMissions.board.missions.filter((m) => m.claimed || m.progress >= m.target).length
  const totalCount = dailyMissions.board.missions.length

  return (
    <div
      data-testid="daily-missions-widget"
      className="pointer-events-auto pixel-panel w-full px-2 py-1 shadow-lg"
    >
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => openPanel('quests')}
          className="flex min-w-0 items-center gap-1 text-left text-[10px] font-semibold text-primary hover:underline"
        >
          <ScrollText className="size-3 shrink-0" aria-hidden />
          <span className="truncate">ภารกิจ</span>
          <span className="shrink-0 font-mono text-[9px] text-muted-foreground tabular-nums">
            {completedCount}/{totalCount}
          </span>
          {dailyMissions.claimableCount > 0 && (
            <span className="shrink-0 font-bold text-accent">• รับได้ {dailyMissions.claimableCount}</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-label={expanded ? 'ย่อภารกิจวันนี้' : 'ขยายภารกิจวันนี้'}
          className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="size-3" aria-hidden /> : <ChevronDown className="size-3" aria-hidden />}
        </button>
      </div>

      {expanded && (
        <button
          type="button"
          onClick={() => openPanel('quests')}
          className="mt-1 block w-full space-y-0.5 border-t border-border/60 pt-1 text-left transition-colors hover:opacity-90"
        >
          {dailyMissions.board.missions.map((m) => {
            const done = m.progress >= m.target
            return (
              <div key={m.id} className="flex items-center justify-between gap-1 text-[9px]">
                <span
                  className={`truncate ${
                    m.claimed
                      ? 'text-muted-foreground line-through'
                      : done
                        ? 'font-semibold text-accent'
                        : 'text-foreground/90'
                  }`}
                >
                  {m.title}
                </span>
                <span
                  className={`shrink-0 tabular-nums ${
                    m.claimed
                      ? 'text-muted-foreground'
                      : done
                        ? 'font-semibold text-accent'
                        : 'text-muted-foreground'
                  }`}
                >
                  {m.claimed ? 'รับแล้ว' : `${Math.min(m.target, m.progress)}/${m.target}`}
                </span>
              </div>
            )
          })}
        </button>
      )}
    </div>
  )
}
