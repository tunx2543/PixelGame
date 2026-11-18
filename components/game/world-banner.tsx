'use client'

import { Flame, Megaphone, Moon, Skull, Sparkles, Sun, Users, Utensils } from 'lucide-react'
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
        <aside
          className={`pointer-events-none fixed left-1/2 top-12 z-30 w-[min(92vw,32rem)] -translate-x-1/2 border-2 bg-black/90 px-3.5 py-2 text-center shadow-2xl ${
            announcement.variant === 'news'
              ? 'border-cyan-300/80'
              : 'border-yellow-300/75'
          }`}
        >
          <div
            className={`flex items-center justify-center gap-1.5 text-[10px] font-bold tracking-[0.14em] ${
              announcement.variant === 'news' ? 'text-cyan-300' : 'text-yellow-300'
            }`}
          >
            {announcement.variant === 'news' ? (
              <Sparkles className="size-3.5 shrink-0 text-cyan-300" aria-hidden />
            ) : (
              <Megaphone className="size-3.5 shrink-0 text-yellow-300" aria-hidden />
            )}
            <span>
              {announcement.variant === 'news'
                ? `ข่าวเซิร์ฟเวอร์${announcement.authorName ? ` · ${announcement.authorName}` : ''}`
                : `ประกาศจาก GM${announcement.authorName ? ` · ${announcement.authorName}` : ''}`}
            </span>
          </div>
          <div className="mt-0.5 break-words text-xs font-semibold text-white">{announcement.body}</div>
        </aside>
      )}
      <div
        data-testid="right-hud-panel"
        className={`pointer-events-none flex w-[9.25rem] flex-col items-end gap-0.5 sm:w-[10.75rem] sm:gap-1 ${game.onlinePanelOpen ? 'z-40' : 'z-20'}`}
      >
        {/* 1. Mini Map & Location */}
        <MapMinimap />

        {/* 2. Friends Online & Party Status */}
        <div className="flex w-full flex-col items-end gap-1">
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
            aria-label="เปิดรายชื่อผู้เล่นและเพื่อนออนไลน์"
            className="pointer-events-auto pixel-panel flex w-full items-center justify-between gap-1 px-1.5 py-0.5 text-[9px] sm:px-2 sm:py-1 sm:text-[10px] font-semibold text-foreground shadow-lg transition-colors hover:border-cyan-400/70"
          >
            <span className="flex items-center gap-1.5 truncate">
              <span
                className={`size-2 shrink-0 rounded-full ${totalOnline > 0 ? 'bg-emerald-400' : 'bg-muted-foreground/60'}`}
                aria-hidden
              />
              <Users className="size-3 shrink-0 text-cyan-300" aria-hidden />
              <span className="truncate tabular-nums">ออนไลน์ {totalOnline}</span>
            </span>
            {sameMapOnline > 0 && (
              <span className="shrink-0 text-[9px] text-emerald-300 tabular-nums">แมพนี้ {sameMapOnline}</span>
            )}
          </button>
          <SocialBar />
        </div>

        {/* 3. World Information */}
        <div className="flex w-full flex-wrap items-center justify-end gap-0.5 text-[8.5px] sm:gap-1 sm:text-[9.5px]">
          <button
            type="button"
            onClick={() => openPanel('guild')}
            aria-label="เปิดหน้าต่างเวิลด์บอสและฟิลด์บอส"
            className="pointer-events-auto pixel-panel flex items-center gap-1 border-rose-400/50 px-1.5 py-0.5 font-semibold text-rose-200 shadow hover:border-rose-400 tabular-nums"
          >
            <Flame className="size-3 text-rose-400" aria-hidden />
            <span>บอสโลก {String(wbMin).padStart(2, '0')}:{String(wbSec).padStart(2, '0')}</span>
          </button>
          {fieldBoss && (
            <button
              type="button"
              onClick={() => openPanel('guild')}
              aria-label={`เปิดฟิลด์บอส ${fieldBoss.name}`}
              className="pointer-events-auto pixel-panel flex items-center gap-1 border-amber-400/50 px-1.5 py-0.5 font-semibold text-amber-200 shadow hover:border-amber-400"
            >
              <Skull className="size-3 text-amber-300" aria-hidden />
              <span>ฟิลด์บอส Lv.{fieldBoss.level}</span>
            </button>
          )}
          <span className="pixel-panel flex items-center gap-1 px-1.5 py-0.5 font-semibold text-amber-100/90 shadow">
            {worldPhase.phase === 'night' ? (
              <Moon className="size-3 text-indigo-300" aria-hidden />
            ) : (
              <Sun className="size-3 text-amber-300" aria-hidden />
            )}
            <span>{worldPhase.label}</span>
          </span>
          {foodBuff?.active && extV2?.activeFoodBuff && (
            <span className="pixel-panel flex items-center gap-1 border-amber-400/50 px-1.5 py-0.5 font-semibold text-amber-200 shadow tabular-nums">
              <Utensils className="size-3" aria-hidden />
              <span className="truncate">
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
