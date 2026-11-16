'use client'

import { Flame, Moon, Skull, Sun, Users, Utensils } from 'lucide-react'
import { currentMap, game, notify, openPanel } from '@/lib/game/engine'
import { getActiveFoodBuffBonuses, getWorldTimePhase, sanitizeExtV2 } from '@/lib/game/extended-systems'
import { getFieldBossForMap } from '@/lib/game/mmo-systems'
import { getActiveWorldBoss } from '@/lib/game/rpg-systems'
import { useGame } from '@/lib/game/use-game'
import { MapMinimap } from './map-minimap'
import { OnlinePlayersPopover } from './online-players-popover'
import { SocialBar } from './social-bar'

export function WorldBanner() {
  const { p } = useGame()
  const map = currentMap()
  const announcement = game.announcement && game.announcement.until > Date.now() ? game.announcement : null
  const totalOnline = game.onlinePlayers.filter((other) => !other.invisible).length
  const sameMapOnline = game.remotePlayers.filter((other) => !other.invisible && other.mapId === map.id).length
  const worldPhase = getWorldTimePhase()
  const extV2 = p ? sanitizeExtV2(p.extV2) : null
  const foodBuff = extV2 ? getActiveFoodBuffBonuses(extV2.activeFoodBuff) : null
  const worldBoss = getActiveWorldBoss()
  const wbRemainSec = Math.max(0, Math.floor((worldBoss.endsAtMs - Date.now()) / 1000))
  const wbMin = Math.floor(wbRemainSec / 60)
  const wbSec = wbRemainSec % 60
  const fieldBoss = getFieldBossForMap(map.id)

  return (
    <>
      {announcement && (
        <aside className="pointer-events-none absolute left-1/2 top-12 z-30 w-[min(90vw,30rem)] -translate-x-1/2 border border-yellow-300/50 bg-black/85 px-3 py-1.5 text-center shadow-xl">
          <div className="text-[9px] font-bold tracking-[0.18em] text-yellow-300">ประกาศจาก GM</div>
          <div className="mt-0.5 truncate text-xs font-semibold text-white">{announcement.body}</div>
        </aside>
      )}
      <div className={`pointer-events-none flex flex-col items-end gap-1 ${game.onlinePanelOpen ? 'z-40' : 'z-20'}`}>
        <MapMinimap />
        <div className="flex max-w-[11.25rem] flex-wrap items-center justify-end gap-1 sm:max-w-none">
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
            className="pointer-events-auto pixel-panel flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold text-foreground shadow-lg transition-colors hover:border-cyan-400/70"
          >
            <span
              className={`size-2 ${totalOnline > 0 ? 'bg-emerald-400' : 'bg-muted-foreground/60'}`}
              aria-hidden
            />
            <Users className="size-3 text-cyan-300" aria-hidden />
            <span className="tabular-nums">ออนไลน์ {totalOnline}</span>
            {sameMapOnline > 0 && (
              <span className="text-emerald-300 tabular-nums">· แมพนี้ {sameMapOnline}</span>
            )}
          </button>
          <SocialBar />
        </div>
        <div className="flex max-w-[11.25rem] flex-wrap items-center justify-end gap-1 text-[10px] sm:max-w-none">
          <button
            type="button"
            onClick={() => openPanel('guild')}
            aria-label="เปิดหน้าต่างเวิลด์บอสและฟิลด์บอส"
            className="pointer-events-auto pixel-panel flex items-center gap-1 border-rose-400/50 px-2 py-0.5 font-semibold text-rose-200 shadow hover:border-rose-400 tabular-nums"
          >
            <Flame className="size-3 text-rose-400" aria-hidden />
            <span>บอสโลก {String(wbMin).padStart(2, '0')}:{String(wbSec).padStart(2, '0')}</span>
          </button>
          {fieldBoss && (
            <button
              type="button"
              onClick={() => openPanel('guild')}
              aria-label={`เปิดฟิลด์บอส ${fieldBoss.name}`}
              className="pointer-events-auto pixel-panel flex items-center gap-1 border-amber-400/50 px-2 py-0.5 font-semibold text-amber-200 shadow hover:border-amber-400"
            >
              <Skull className="size-3 text-amber-300" aria-hidden />
              <span>ฟิลด์บอส Lv.{fieldBoss.level}</span>
            </button>
          )}
          <span className="pixel-panel flex items-center gap-1 px-2 py-0.5 font-semibold text-amber-100/90 shadow">
            {worldPhase.phase === 'night' ? (
              <Moon className="size-3 text-indigo-300" aria-hidden />
            ) : (
              <Sun className="size-3 text-amber-300" aria-hidden />
            )}
            <span>{worldPhase.label}</span>
          </span>
          {foodBuff?.active && extV2?.activeFoodBuff && (
            <span className="pixel-panel flex items-center gap-1 border-amber-400/50 px-2 py-0.5 font-semibold text-amber-200 shadow tabular-nums">
              <Utensils className="size-3" aria-hidden />
              <span>
                {extV2.activeFoodBuff.name} ({foodBuff.remainingSec}s)
              </span>
            </span>
          )}
        </div>
        <OnlinePlayersPopover />
      </div>
    </>
  )
}

