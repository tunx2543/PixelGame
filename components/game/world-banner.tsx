'use client'

import {
  Flame,
  Megaphone,
  Moon,
  Shield,
  Sun,
  Users,
} from 'lucide-react'
import { useDailyMissions } from '@/lib/game/daily-missions'
import { ensurePremiumState, game, isCurrentAccountGm, notify, openPanel } from '@/lib/game/engine'
import { getWorldTimePhase } from '@/lib/game/extended-systems'
import { getFieldBossForMap } from '@/lib/game/mmo-systems'
import { TOPUP_MILESTONES } from '@/lib/game/premium/topup'
import { getActiveWorldBoss, todayIsoDate } from '@/lib/game/rpg-systems'
import { countClaimableQuests } from '@/lib/game/systems'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { GameBadgeMedallion } from './game-badge-icon'
import { MapMinimap } from './map-minimap'
import { OnlinePlayersPopover } from './online-players-popover'
import { SocialBar } from './social-bar'

export function TopAnnouncementTicker() {
  const { p } = useGame()
  if (!p) return null

  const map = game.p ? p.mapId : 'town'
  const announcement = game.announcement && game.announcement.until > Date.now() ? game.announcement : null
  const worldBoss = getActiveWorldBoss()
  const wbRemainSec = Math.max(0, Math.floor((worldBoss.endsAtMs - Date.now()) / 1000))
  const wbMin = Math.floor(wbRemainSec / 60)
  const fieldBoss = getFieldBossForMap(map)

  let headline = `ยินดีต้อนรับสู่โลกอสุรา · บอสโลก ${worldBoss.name} เหลือเวลาอีก ${wbMin} นาที`
  let iconKind: 'megaphone' | 'shield' | 'flame' = 'flame'
  if (announcement) {
    headline = `${announcement.authorName ? `[${announcement.authorName}] ` : ''}${announcement.body}`
    iconKind = 'megaphone'
  } else if (game.invasion?.active) {
    headline = `กิจกรรม ปกป้องหมู่บ้าน Wave ${game.invasion.wave}/${game.invasion.maxWaves} กำลังเปิดฉาก!`
    iconKind = 'shield'
  } else if (fieldBoss) {
    headline = `ฟิลด์บอสประจำแมพ: ${fieldBoss.name} (Lv.${fieldBoss.level}) ปรากฏตัวแล้ว!`
    iconKind = 'shield'
  }

  return (
    <button
      type="button"
      onClick={() => openPanel('guild')}
      aria-label="ประกาศกิจกรรมเซิร์ฟเวอร์"
      className="pointer-events-auto fixed left-[42%] top-0.5 z-20 flex max-w-[min(34vw,19rem)] -translate-x-1/2 items-center gap-2 rounded-b-md border border-t-0 border-[#3b6bb3]/75 bg-[#09101c]/94 px-2.5 py-1 text-left shadow-lg transition-colors hover:border-amber-300/75 lg:left-1/2 lg:max-w-[min(44vw,28rem)] lg:px-3"
    >
      <span className="grid size-4 shrink-0 place-items-center rounded bg-sky-500/25 text-amber-300">
        {iconKind === 'megaphone' ? (
          <Megaphone className="size-3" aria-hidden />
        ) : iconKind === 'shield' ? (
          <Shield className="size-3" aria-hidden />
        ) : (
          <Flame className="size-3 text-rose-400" aria-hidden />
        )}
      </span>
      <span className="truncate text-[11px] font-bold text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
        {headline}
      </span>
    </button>
  )
}

export function WorldBanner() {
  const { p, topupBadge } = useGame()
  const dailyMissions = useDailyMissions()
  if (!p) return null

  const map = game.p ? p.mapId : 'town'
  const totalOnline = game.onlinePlayers.filter((other) => !other.invisible).length
  const worldPhase = getWorldTimePhase()
  const worldBoss = getActiveWorldBoss()
  const wbRemainSec = Math.max(0, Math.floor((worldBoss.endsAtMs - Date.now()) / 1000))
  const wbMin = Math.floor(wbRemainSec / 60)
  const fieldBoss = getFieldBossForMap(map)

  const prem = ensurePremiumState(p)
  const today = todayIsoDate()
  const claimableMilestones = TOPUP_MILESTONES.filter(
    (m) => (prem.totalTopupThb ?? 0) >= m.thresholdThb && !(prem.claimedTopupMilestones ?? []).includes(m.id),
  ).length
  const claimableDailyTopup = prem.lastDailyTopupDate === today && prem.claimedDailyTopupDate !== today ? 1 : 0
  const isGmDev = Boolean(p.gm && isCurrentAccountGm())
  const shopAlert =
    topupBadge.approvedUnclaimed + (isGmDev ? topupBadge.gmPending : 0) + claimableMilestones + claimableDailyTopup > 0
  const questAlert =
    countClaimableQuests(p.questState, p.towerState, p.petState, p.kills) + dailyMissions.claimableCount > 0
  const bpArchiveCount = p.extV2?.battlePass?.expiredArchive?.length ?? 0

  return (
    <div
      data-testid="right-hud-panel"
      className={cn(
        'pointer-events-none flex w-[8.75rem] flex-col items-end gap-1 sm:w-[10.5rem]',
        game.onlinePanelOpen ? 'z-40' : 'z-20',
      )}
    >
      {/* 1. Translucent Square Minimap + Zoom Controls + Coordinates */}
      <MapMinimap />

      {/* 2. Four Circular Shortcut Badges directly below Minimap: กิจกรรม, สุดคุ้ม, GP, BP */}
      <div className="pointer-events-auto grid w-full grid-cols-4 gap-1 pt-0.5">
        <button
          type="button"
          onClick={() => openPanel('quests')}
          title="กิจกรรม & เควสต์รายวัน"
          className="group relative flex flex-col items-center gap-0.5"
        >
          <GameBadgeMedallion
            iconId="event-flash"
            size="sm"
            tone="border-amber-300/85 bg-[radial-gradient(circle_at_35%_28%,#62471d_0%,#2d210e_60%,#140e06_100%)] group-hover:scale-105"
            badgeAlert={Boolean(questAlert || game.invasion?.active)}
          />
          <span className="font-mono text-[8.5px] font-bold text-white [text-shadow:0_1px_2px_#000] tabular-nums">
            {wbMin}m
          </span>
        </button>

        <button
          type="button"
          onClick={() => openPanel('gem-shop')}
          title="แพ็กเกจสุดคุ้ม & ร้านโซล"
          className="group relative flex flex-col items-center gap-0.5"
        >
          <GameBadgeMedallion
            iconId="soul-shop"
            size="sm"
            tone="border-amber-200/85 bg-[radial-gradient(circle_at_35%_28%,#69481e_0%,#31210e_60%,#150e06_100%)] group-hover:scale-105"
            badgeAlert={shopAlert}
          />
          <span className="whitespace-nowrap text-[8.5px] font-bold text-white [text-shadow:0_1px_2px_#000]">
            สุดคุ้ม
          </span>
        </button>

        <button
          type="button"
          onClick={() => openPanel('guild')}
          title="กิลด์พ้อยต์ & เวิลด์บอส (GP)"
          className="group relative flex flex-col items-center gap-0.5"
        >
          <GameBadgeMedallion
            iconId="gp-trophy"
            size="sm"
            tone="border-sky-300/85 bg-[radial-gradient(circle_at_35%_28%,#2f5487_0%,#172c4a_60%,#0c1626_100%)] group-hover:scale-105"
            badgeAlert={Boolean(fieldBoss)}
          />
          <span className="whitespace-nowrap text-[8.5px] font-bold text-white [text-shadow:0_1px_2px_#000]">
            GP
          </span>
        </button>

        <button
          type="button"
          onClick={() => openPanel('pass')}
          title="Battle Pass (BP)"
          className="group relative flex flex-col items-center gap-0.5"
        >
          <GameBadgeMedallion
            iconId="bp-wings"
            size="sm"
            tone="border-cyan-300/85 bg-[radial-gradient(circle_at_35%_28%,#255269_0%,#122b38_60%,#09151c_100%)] group-hover:scale-105"
            badgeAlert={bpArchiveCount > 0}
          />
          <span className="whitespace-nowrap text-[8.5px] font-bold text-white [text-shadow:0_1px_2px_#000]">
            BP
          </span>
        </button>
      </div>

      {/* 3. Subtle World Time + Online Trigger */}
      <div className="pointer-events-auto flex w-full items-center justify-end gap-1 pt-0.5 text-[9px]">
        <span className="flex items-center gap-0.5 rounded border border-[#294976]/75 bg-[#09101c]/80 px-1.5 py-0.5 font-semibold text-amber-100/90">
          {worldPhase.phase === 'night' ? (
            <Moon className="size-2.5 text-indigo-300" aria-hidden />
          ) : (
            <Sun className="size-2.5 text-amber-300" aria-hidden />
          )}
          <span className="hidden sm:inline">{worldPhase.label}</span>
        </span>
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
          className="flex items-center gap-1 rounded border border-[#294976]/75 bg-[#09101c]/80 px-1.5 py-0.5 font-bold text-cyan-200 transition-colors hover:border-cyan-300 tabular-nums"
        >
          <span className={cn('size-1.5 rounded-full', totalOnline > 0 ? 'bg-emerald-400' : 'bg-slate-500')} />
          <Users className="size-2.5" aria-hidden />
          <span>{totalOnline}</span>
        </button>
      </div>

      <SocialBar />
      <OnlinePlayersPopover />
    </div>
  )
}
