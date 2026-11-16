'use client'

import { LogOut } from 'lucide-react'
import { useGame } from '@/lib/game/use-game'
import {
  currentJob,
  getActiveAccountGameUid,
  isCurrentAccountGm,
  quitToTitle,
} from '@/lib/game/engine'
import { PERMANENT_GM_GAME_UID } from '@/lib/game/permissions'
import { SpriteModelCanvas } from './sprite-model-canvas'

export function CharacterBar({ compact = false }: { compact?: boolean; layout?: 'desktop' | 'mobile' }) {
  const { p } = useGame()
  if (!p) return null

  const job = currentJob()
  const isGmDev = Boolean(p.gm && isCurrentAccountGm())
  const displayGameUid = isGmDev ? PERMANENT_GM_GAME_UID : (p.gameUid ?? getActiveAccountGameUid())

  return (
    <div
      data-testid="character-bar"
      className="pointer-events-auto pixel-panel flex w-full items-center justify-between gap-1.5 px-2 py-1 shadow-lg"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <div className="grid size-7 shrink-0 place-items-center overflow-hidden border border-[#d4a446] bg-[#0b0e1c]">
          <SpriteModelCanvas
            mode="job"
            id={p.jobId}
            action="idle"
            dir="down"
            size={26}
            variant="portrait"
            isGm={isGmDev}
            showShadow={false}
            showAura={false}
            label={`ภาพโปรไฟล์ ${p.name}`}
          />
        </div>

        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-1 truncate text-[11px] font-bold text-foreground">
            {isGmDev && <span className="text-gold">[GM]</span>}
            <span className="truncate">{p.name}</span>
          </div>
          <div className="flex items-center gap-1 truncate text-[9px] text-muted-foreground">
            <span className="font-semibold text-primary tabular-nums">Lv.{p.level}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{job.name}</span>
            {!compact && displayGameUid && (
              <span className="font-mono text-[9px] tabular-nums">#{displayGameUid}</span>
            )}
          </div>
        </div>
      </div>

      {!compact && (
        <button
          type="button"
          onClick={() => quitToTitle()}
          title="กลับหน้าเลือกตัวละคร"
          aria-label="สลับตัวละคร"
          className="pixel-btn flex shrink-0 items-center gap-1 whitespace-nowrap bg-secondary px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-2.5" aria-hidden />
          <span className="hidden sm:inline">สลับตัว</span>
        </button>
      )}
    </div>
  )
}
