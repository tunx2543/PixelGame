'use client'

import { Users } from 'lucide-react'
import { currentMap, game, notify } from '@/lib/game/engine'
import { useGame } from '@/lib/game/use-game'
import { MapMinimap } from './map-minimap'
import { OnlinePlayersPopover } from './online-players-popover'
import { SocialBar } from './social-bar'

export function WorldBanner() {
  useGame()
  const map = currentMap()
  const announcement = game.announcement && game.announcement.until > Date.now() ? game.announcement : null
  const isAbyss = map.id === 'abyss'
  const showDungeonCard = map.id === 'abyss' || map.id === 'volcano'
  const totalOnline = game.onlinePlayers.filter((other) => !other.invisible).length
  const sameMapOnline = game.remotePlayers.filter((other) => !other.invisible && other.mapId === map.id).length

  return (
    <>
      {announcement && (
        <aside className="pointer-events-none absolute left-1/2 top-[6.25rem] z-30 w-[min(92vw,34rem)] -translate-x-1/2 rounded-md border border-yellow-300/50 bg-black/80 px-3 py-2 text-center shadow-xl">
          <div className="text-[9px] font-bold tracking-[0.18em] text-yellow-300">ประกาศจาก GM</div>
          <div className="mt-0.5 truncate text-xs font-semibold text-white">{announcement.body}</div>
        </aside>
      )}
      <div className={`pointer-events-none absolute right-2 top-2 flex flex-col items-end gap-1.5 md:right-3 md:top-3 ${game.onlinePanelOpen ? 'z-40' : 'z-20'}`}>
        <MapMinimap />
        <button
          type="button"
          onClick={() => {
            game.onlinePanelOpen = !game.onlinePanelOpen
            if (game.onlinePanelOpen) {
              game.socialMenuOpen = false
              game.partyPanelOpen = false
            }
            notify()
          }}
          aria-expanded={game.onlinePanelOpen}
          aria-label="เปิดรายชื่อผู้เล่นออนไลน์และตำแหน่ง"
          className="pointer-events-auto pixel-panel flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-lg transition-colors hover:border-cyan-400/70"
        >
          <span
            className={`size-2 rounded-full ${totalOnline > 0 ? 'bg-emerald-400' : 'bg-muted-foreground/60'}`}
            aria-hidden
          />
          <Users className="size-3 text-cyan-300" aria-hidden />
          <span>ออนไลน์ {totalOnline}</span>
          {sameMapOnline > 0 && (
            <span className="text-emerald-300">• แมพนี้ {sameMapOnline}</span>
          )}
        </button>
        <OnlinePlayersPopover />
        <SocialBar />
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
