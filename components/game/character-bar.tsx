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
import { PWAInstallButton } from './pwa-controls'
import { SpriteModelCanvas } from './sprite-model-canvas'

export function CharacterBar({ layout = 'desktop' }: { layout?: 'desktop' | 'mobile' }) {
  const { p } = useGame()
  if (!p) return null

  const job = currentJob()
  const isGmDev = Boolean(p.gm && isCurrentAccountGm())
  const displayGameUid = isGmDev ? PERMANENT_GM_GAME_UID : (p.gameUid ?? getActiveAccountGameUid())

  if (layout === 'mobile') {
    return (
      <div
        data-testid="character-bar-mobile"
        className="pointer-events-auto pixel-panel flex w-full items-center justify-between gap-1.5 px-1.5 py-1 shadow-lg md:hidden"
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
          <div className="min-w-0 truncate text-[10px]">
            <span className="font-bold text-foreground">
              {isGmDev && <span className="mr-0.5 text-gold">[GM]</span>}
              {p.name}
            </span>
            <span className="mx-1 text-muted-foreground">·</span>
            <span className="font-semibold text-primary">Lv.{p.level}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => quitToTitle()}
          aria-label="สลับตัวละคร"
          title="สลับตัวละคร"
          className="pixel-btn flex shrink-0 items-center gap-1 whitespace-nowrap bg-secondary px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-2.5" aria-hidden />
          สลับตัว
        </button>
      </div>
    )
  }

  return (
    <div
      data-testid="character-bar"
      className="pointer-events-auto pixel-panel hidden items-center gap-2.5 px-2.5 py-1.5 shadow-lg md:flex"
    >
      <div className="grid size-9 shrink-0 place-items-center overflow-hidden border-2 border-[#d4a446] bg-[#0b0e1c] shadow-[inset_0_0_8px_rgba(242,201,76,0.2)]">
        <SpriteModelCanvas
          mode="job"
          id={p.jobId}
          action="idle"
          dir="down"
          size={36}
          variant="portrait"
          isGm={isGmDev}
          showShadow={false}
          showAura={false}
          label={`ภาพโปรไฟล์ ${p.name}`}
        />
      </div>

      <div className="flex min-w-0 items-center gap-2 text-xs">
        <span className="max-w-[10rem] truncate font-bold text-foreground">
          {isGmDev && <span className="mr-1 text-gold">[GM]</span>}
          {p.name}
        </span>
        <span className="text-border" aria-hidden="true">·</span>
        <span className="whitespace-nowrap font-semibold text-primary">
          Lv.{p.level} {job.name}
        </span>
        {displayGameUid && (
          <>
            <span className="text-border" aria-hidden="true">·</span>
            <span className={`whitespace-nowrap font-mono text-[11px] font-bold tabular-nums ${isGmDev ? 'text-amber-300' : 'text-muted-foreground'}`}>
              UID:{displayGameUid}
            </span>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 border-l border-border/70 pl-2.5">
        <PWAInstallButton variant="hud" />
        <button
          type="button"
          onClick={() => quitToTitle()}
          title="กลับหน้าล็อคอินตัวละคร"
          className="pixel-btn flex items-center gap-1 whitespace-nowrap bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-3" aria-hidden />
          สลับตัว
        </button>
      </div>
    </div>
  )
}
