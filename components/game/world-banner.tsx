'use client'

import { currentMap, game } from '@/lib/game/engine'
import { useGame } from '@/lib/game/use-game'
import { MapMinimap } from './map-minimap'

export function WorldBanner() {
  useGame()
  const map = currentMap()
  const announcement = game.announcement && game.announcement.until > Date.now() ? game.announcement : null
  const isAbyss = map.id === 'abyss'
  const showDungeonCard = map.id === 'abyss' || map.id === 'volcano'

  return (
    <>
      {announcement && (
        <aside className="pointer-events-none absolute left-1/2 top-2 z-30 w-[min(92vw,34rem)] -translate-x-1/2 rounded-md border border-yellow-300/50 bg-black/80 px-3 py-2 text-center shadow-xl">
          <div className="text-[9px] font-bold tracking-[0.18em] text-yellow-300">ประกาศจาก GM</div>
          <div className="mt-0.5 truncate text-xs font-semibold text-white">{announcement.body}</div>
        </aside>
      )}
      <div className="pointer-events-none absolute right-2 top-2 z-20 flex flex-col items-end gap-1.5 md:right-3 md:top-3">
        <MapMinimap />
        {showDungeonCard && (
          <aside className="pointer-events-none hidden w-44 overflow-hidden border-2 border-border bg-card/90 shadow-xl sm:block">
            <img
              src={isAbyss ? '/images/art/dungeon-banner.png' : '/images/art/demon-lord.png'}
              alt={isAbyss ? 'ภาพดันเจี้ยน Abyss' : 'ภาพราชาปีศาจ'}
              className="asset-no-bg h-14 w-full object-cover opacity-85"
            />
            <div className="px-2 py-1 text-[10px] font-semibold tracking-wide text-white/90">
              {isAbyss ? 'ABYSS DUNGEON' : 'DEMON LORD CITADEL'}
            </div>
          </aside>
        )}
      </div>
    </>
  )
}
