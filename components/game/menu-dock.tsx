'use client'

import { useEffect, useState } from 'react'
import {
  ClipboardCheck,
  EyeOff,
  Gamepad2,
  Home,
  RotateCcw,
  ShoppingBag,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { isBgmMuted, toggleBgmMute } from '@/lib/game/bgm'
import { useDailyMissions } from '@/lib/game/daily-missions'
import {
  ensurePremiumState,
  isCurrentAccountGm,
  openPanel,
  toggleZenHud,
} from '@/lib/game/engine'
import { TOPUP_MILESTONES } from '@/lib/game/premium/topup'
import { todayIsoDate } from '@/lib/game/rpg-systems'
import { countClaimableQuests } from '@/lib/game/systems'
import { resetUiLayout } from '@/lib/game/ui-layout'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { AsuraDailyHelperModal, AsuraMenuModal } from './asura-menu-modal'

export function MenuDock({
  showTouch = false,
  onToggleTouch,
  onOpenCheckin,
}: {
  layout?: 'desktop' | 'mobile'
  showTouch?: boolean
  onToggleTouch?: () => void
  onOpenCheckin?: () => void
}) {
  const { p, partyInvites, topupBadge } = useGame()
  const dailyMissions = useDailyMissions()
  const [menuOpen, setMenuOpen] = useState(false)
  const [helperOpen, setHelperOpen] = useState(false)
  const [bgmMuted, setBgmMutedState] = useState(true)

  useEffect(() => {
    setBgmMutedState(isBgmMuted())
  }, [])

  if (!p) return null

  const prem = ensurePremiumState(p)
  const today = todayIsoDate()
  const claimableMilestones = TOPUP_MILESTONES.filter(
    (m) => (prem.totalTopupThb ?? 0) >= m.thresholdThb && !(prem.claimedTopupMilestones ?? []).includes(m.id),
  ).length
  const claimableDailyTopup = prem.lastDailyTopupDate === today && prem.claimedDailyTopupDate !== today ? 1 : 0
  const isGmDev = Boolean(p.gm && isCurrentAccountGm())
  const gemShopBadge =
    topupBadge.approvedUnclaimed + (isGmDev ? topupBadge.gmPending : 0) + claimableMilestones + claimableDailyTopup
  const claimableQuests =
    countClaimableQuests(p.questState, p.towerState, p.petState, p.kills) + dailyMissions.claimableCount
  const menuBadgeCount = partyInvites.length + (p.statPoints ?? 0) + (p.skillPoints ?? 0)

  const toggleBgm = () => {
    const nextMuted = toggleBgmMute(p.mapId)
    setBgmMutedState(nextMuted)
  }

  return (
    <>
      <nav
        aria-label="แถบเมนูหลักอสุรา"
        data-testid="menu-dock"
        className="pointer-events-auto relative flex items-start gap-1.5 sm:gap-2"
      >
        {/* 3 Glossy Circular Asura Buttons: ตัวช่วย, ร้าน, เมนู */}
        <div className="flex items-start gap-1.5 sm:gap-2.5">
          <button
            type="button"
            onClick={() => setHelperOpen(true)}
            title="ตัวช่วยภารกิจประจำวัน"
            className="group relative flex flex-col items-center gap-0.5 transition-transform hover:-translate-y-0.5"
          >
            <span className="relative grid size-9 place-items-center rounded-full border-2 border-[#7eb0ee]/90 bg-gradient-to-b from-[#274166] to-[#111e33] shadow-[0_3px_10px_rgba(0,0,0,0.55)] sm:size-11">
              <ClipboardCheck className="size-4 text-amber-200 sm:size-5" aria-hidden />
              {claimableQuests > 0 && (
                <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full border border-white bg-rose-600 text-[9px] font-extrabold text-white shadow">
                  !
                </span>
              )}
            </span>
            <span className="whitespace-nowrap text-[9.5px] font-bold text-white [text-shadow:0_1px_3px_#000,0_0_4px_#000] sm:text-[10.5px]">
              ตัวช่วย
            </span>
          </button>

          <button
            type="button"
            data-testid="menu-btn-gem-shop"
            onClick={() => openPanel('gem-shop')}
            title="ร้านค้าโซล"
            className="group relative flex flex-col items-center gap-0.5 transition-transform hover:-translate-y-0.5"
          >
            <span className="relative grid size-9 place-items-center rounded-full border-2 border-amber-300/90 bg-gradient-to-b from-[#2f496f] to-[#132036] shadow-[0_3px_10px_rgba(0,0,0,0.55)] sm:size-11">
              <ShoppingBag className="size-4 text-amber-300 sm:size-5" aria-hidden />
              {gemShopBadge > 0 && (
                <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full border border-white bg-rose-600 text-[9px] font-extrabold text-white shadow">
                  !
                </span>
              )}
            </span>
            <span className="whitespace-nowrap text-[9.5px] font-bold text-white [text-shadow:0_1px_3px_#000,0_0_4px_#000] sm:text-[10.5px]">
              ร้าน
            </span>
          </button>

          <button
            type="button"
            data-testid="menu-btn-main"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            title="เปิดเมนูระบบเกมทั้งหมด"
            className="group relative flex flex-col items-center gap-0.5 transition-transform hover:-translate-y-0.5"
          >
            <span className="relative grid size-9 place-items-center rounded-full border-2 border-[#7eb0ee]/90 bg-gradient-to-b from-[#274166] to-[#111e33] shadow-[0_3px_10px_rgba(0,0,0,0.55)] sm:size-11">
              <Home className="size-4 text-sky-200 sm:size-5" aria-hidden />
              {menuBadgeCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-rose-600 px-1 font-mono text-[8.5px] font-extrabold text-white shadow tabular-nums">
                  {menuBadgeCount > 99 ? '99+' : '!'}
                </span>
              )}
            </span>
            <span className="whitespace-nowrap text-[9.5px] font-bold text-white [text-shadow:0_1px_3px_#000,0_0_4px_#000] sm:text-[10.5px]">
              เมนู
            </span>
          </button>
        </div>

        {/* Subtle Utility Micro Buttons */}
        <div className="hidden grid-cols-2 gap-1 pt-0.5 sm:grid">
          <button
            type="button"
            onClick={toggleBgm}
            aria-pressed={!bgmMuted}
            aria-label={bgmMuted ? 'เปิดเพลงประกอบ (BGM)' : 'ปิดเพลงประกอบ (BGM)'}
            title={bgmMuted ? 'เปิดเพลงประกอบ (BGM)' : 'ปิดเพลงประกอบ (BGM)'}
            className={cn(
              'grid size-5 place-items-center rounded-full border shadow transition-colors',
              !bgmMuted
                ? 'border-emerald-300/70 bg-emerald-900/80 text-emerald-200'
                : 'border-white/25 bg-slate-950/70 text-slate-300 hover:border-amber-300/60 hover:text-white',
            )}
          >
            {bgmMuted ? <VolumeX className="size-3" aria-hidden /> : <Volume2 className="size-3" aria-hidden />}
          </button>

          <button
            type="button"
            onClick={() => toggleZenHud(true)}
            aria-label="ซ่อน UI รอบจอ (กด H)"
            title="ซ่อน UI รอบจอ (กด H)"
            className="grid size-5 place-items-center rounded-full border border-white/25 bg-slate-950/70 text-slate-300 shadow transition-colors hover:border-amber-300/60 hover:text-white"
          >
            <EyeOff className="size-3" aria-hidden />
          </button>

          {onToggleTouch && (
            <button
              type="button"
              onClick={onToggleTouch}
              aria-pressed={showTouch}
              aria-label={showTouch ? 'ซ่อนปุ่มควบคุมบนจอ' : 'แสดงปุ่มควบคุมบนจอ'}
              title={showTouch ? 'ซ่อนปุ่มสัมผัส' : 'แสดงปุ่มสัมผัส'}
              className={cn(
                'grid size-5 place-items-center rounded-full border shadow transition-colors',
                showTouch
                  ? 'border-amber-300/75 bg-amber-900/80 text-amber-200'
                  : 'border-white/25 bg-slate-950/70 text-slate-300 hover:border-amber-300/60 hover:text-white',
              )}
            >
              <Gamepad2 className="size-3" aria-hidden />
            </button>
          )}

          <button
            type="button"
            onClick={() => resetUiLayout()}
            aria-label="Reset UI Layout"
            title="จัดเรียงหน้าต่างและ HUD ใหม่"
            className="grid size-5 place-items-center rounded-full border border-white/25 bg-slate-950/70 text-slate-300 shadow transition-colors hover:border-amber-300/60 hover:text-white"
          >
            <RotateCcw className="size-3" aria-hidden />
          </button>
        </div>
      </nav>

      <AsuraMenuModal
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenCheckin={onOpenCheckin}
        onOpenDailyHelper={() => setHelperOpen(true)}
      />

      <AsuraDailyHelperModal
        open={helperOpen}
        onClose={() => setHelperOpen(false)}
        onOpenCheckin={onOpenCheckin}
      />
    </>
  )
}
