'use client'

import { Terminal } from 'lucide-react'
import { useGame } from '@/lib/game/use-game'
import { castGmSkill, isCurrentAccountGm, openPanel } from '@/lib/game/engine'

export function GmToolsWidget() {
  const { p } = useGame()
  if (!p) return null

  const isGmDev = Boolean(p.gm && isCurrentAccountGm())
  if (!isGmDev) return null

  return (
    <div
      data-testid="gm-tools-widget"
      className="pointer-events-auto pixel-panel w-full border-gold/50 p-1.5 shadow-lg"
    >
      <p className="mb-1 text-[9px] font-bold tracking-wide text-gold">GM · DEV TOOLS</p>
      <div className="grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => castGmSkill('invisible')}
          className="pixel-btn bg-gold/20 px-1 py-1 text-[9px] font-semibold text-gold hover:bg-gold/30"
        >
          ล่องหน
        </button>
        <button
          type="button"
          onClick={() => castGmSkill('summon')}
          className="pixel-btn bg-gold/20 px-1 py-1 text-[9px] font-semibold text-gold hover:bg-gold/30"
        >
          เสกของ
        </button>
        <button
          type="button"
          onClick={() => castGmSkill('immortal')}
          className="pixel-btn bg-gold/20 px-1 py-1 text-[9px] font-semibold text-gold hover:bg-gold/30"
        >
          อมตะ
        </button>
      </div>
      <button
        type="button"
        onClick={() => openPanel('dev-tools')}
        className="pixel-btn mt-1 flex w-full items-center justify-center gap-1 border border-amber-400/60 bg-amber-400/20 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-400/30"
      >
        <Terminal className="size-3" aria-hidden />
        เปิดระบบ Dev Console
      </button>
    </div>
  )
}
