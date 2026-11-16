'use client'

import { CalendarCheck2, Gem } from 'lucide-react'
import { useGame } from '@/lib/game/use-game'
import { openPanel } from '@/lib/game/engine'

export function TownServicesWidget({ onOpenCheckin }: { onOpenCheckin?: () => void }) {
  const { p } = useGame()
  if (!p || p.mapId !== 'town') return null

  return (
    <div
      data-testid="town-services-widget"
      className="pointer-events-auto pixel-panel grid w-full grid-cols-2 gap-1 p-1.5 shadow-lg"
    >
      {onOpenCheckin && (
        <button
          type="button"
          onClick={onOpenCheckin}
          className="pixel-btn flex items-center justify-center gap-1 whitespace-nowrap border border-amber-300/40 bg-amber-300/15 px-1.5 py-1 text-[10px] font-semibold text-amber-200 hover:bg-amber-300/25"
        >
          <CalendarCheck2 className="size-3 shrink-0" aria-hidden />
          เช็คอิน
        </button>
      )}
      <button
        type="button"
        onClick={() => openPanel('gem-shop')}
        className="pixel-btn flex items-center justify-center gap-1 whitespace-nowrap border border-cyan-300/40 bg-cyan-300/10 px-1.5 py-1 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-300/20"
      >
        <Gem className="size-3 shrink-0" aria-hidden />
        ร้านเพชร
      </button>
    </div>
  )
}
