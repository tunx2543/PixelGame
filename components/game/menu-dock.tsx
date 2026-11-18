'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  Backpack,
  Castle,
  Crown,
  EyeOff,
  Gamepad2,
  LayoutGrid,
  RotateCcw,
  ScrollText,
  Shield,
  User,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'
import { isBgmMuted, toggleBgmMute } from '@/lib/game/bgm'
import { useDailyMissions } from '@/lib/game/daily-missions'
import {
  ensurePremiumState,
  getInventoryCapacityBreakdown,
  isCurrentAccountGm,
  openPanel,
  saveGame,
  toggleZenHud,
  type PanelId,
} from '@/lib/game/engine'
import { getMenuIconUrl, type MenuIconId } from '@/lib/game/menu-icons'
import { TOPUP_MILESTONES } from '@/lib/game/premium/topup'
import { todayIsoDate } from '@/lib/game/rpg-systems'
import { countClaimableQuests } from '@/lib/game/systems'
import { resetUiLayout } from '@/lib/game/ui-layout'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'

interface TopMenuItem {
  panel: PanelId
  label: string
  iconId: MenuIconId
  FallbackIcon: typeof User
  hideOnXs?: boolean
}

const TOP_MENU_ITEMS: TopMenuItem[] = [
  { panel: 'character', label: 'สถานะ', iconId: 'status', FallbackIcon: User },
  { panel: 'talents', label: 'สกิล', iconId: 'skills', FallbackIcon: Zap, hideOnXs: true },
  { panel: 'quests', label: 'เควส', iconId: 'quests', FallbackIcon: ScrollText },
  { panel: 'equipment', label: 'อุปกรณ์', iconId: 'equipment', FallbackIcon: Shield },
  { panel: 'inventory', label: 'กระเป๋า', iconId: 'inventory', FallbackIcon: Backpack },
  { panel: 'gem-shop', label: 'ร้านเพชร', iconId: 'gem-shop', FallbackIcon: Crown, hideOnXs: true },
]

const MORE_MENU_ITEMS: Array<{
  panel: PanelId
  label: string
  iconId: MenuIconId
  hint: string
}> = [
  { panel: 'talents', label: 'สกิล & เซ็ต', iconId: 'skills', hint: '3 สาย / อัปสกิล' },
  { panel: 'gem-shop', label: 'ร้านเพชร & VIP', iconId: 'gem-shop', hint: 'VIP / เติมเงิน / แฟชั่น' },
  { panel: 'pass', label: 'Battle Pass', iconId: 'pass', hint: 'รางวัลซีซัน 20 ขั้น' },
  { panel: 'craft', label: 'คราฟต์', iconId: 'craft', hint: 'สร้าง / ย่อย / ฝังรูน' },
  { panel: 'pets', label: 'สัตว์เลี้ยง', iconId: 'pets', hint: 'ผอบ / คู่หู / พาหนะ' },
  { panel: 'wardrobe', label: 'แฟชั่น', iconId: 'wardrobe', hint: 'ปีก / สกินอาวุธ' },
  { panel: 'dungeon', label: 'ดันเจี้ยน', iconId: 'dungeon', hint: 'รายวัน / Co-op บอส' },
  { panel: 'guild', label: 'กิลด์ & บอส', iconId: 'guild', hint: 'เรดกิลด์ / บอสโลก' },
  { panel: 'arena', label: 'ลานประลอง', iconId: 'arena', hint: 'PvP 1v1 / อันดับ' },
  { panel: 'market', label: 'ตลาดกลาง', iconId: 'market', hint: 'ซื้อขายกับผู้เล่น' },
  { panel: 'lifeskills', label: 'ทักษะชีวิต', iconId: 'lifeskills', hint: 'ตกปลา / ขุดแร่ / อาหาร' },
  { panel: 'mail', label: 'จดหมาย', iconId: 'mail', hint: 'รับรางวัล / ส่งของขวัญ' },
  { panel: 'codex', label: 'สมุดภาพ', iconId: 'codex', hint: 'รางวัลล่ามอนสเตอร์' },
  { panel: 'friends', label: 'เพื่อน', iconId: 'friends', hint: 'รายชื่อ & แชทเพื่อน' },
  { panel: 'party', label: 'ปาร์ตี้', iconId: 'party', hint: 'จัดตี้ล่าบอส' },
  { panel: 'models', label: 'คลังโมเดล', iconId: 'models', hint: 'พรีวิวโมเดล 2D' },
  { panel: 'guide', label: 'คู่มือเกม', iconId: 'guide', hint: 'ภารกิจ & ป้องกันเมือง' },
  { panel: 'settings', label: 'ตั้งค่า', iconId: 'settings', hint: 'เสียง / ปุ่ม / บัญชี' },
]

const LABEL_SHADOW_CLASS =
  '[text-shadow:-1px_-1px_0_#130d19,1px_-1px_0_#130d19,-1px_1px_0_#130d19,1px_1px_0_#130d19,0_2px_4px_rgba(0,0,0,0.95)]'

function PixelMenuIcon({
  iconId,
  FallbackIcon,
  alt,
  size = 32,
  className,
}: {
  iconId: MenuIconId
  FallbackIcon?: typeof User
  alt: string
  size?: number
  className?: string
}) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    setSrc(getMenuIconUrl(iconId))
  }, [iconId])

  if (!src) {
    return FallbackIcon ? (
      <FallbackIcon className={cn('size-6 text-amber-200 drop-shadow-[0_2px_2px_rgba(0,0,0,0.85)]', className)} aria-hidden />
    ) : (
      <span className={cn('block', className)} style={{ width: size, height: size }} aria-hidden />
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      className={cn(
        'shrink-0 select-none object-contain [image-rendering:pixelated] drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]',
        className,
      )}
      style={{ width: size, height: size }}
    />
  )
}

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
  const [moreOpen, setMoreOpen] = useState(false)
  const [bgmMuted, setBgmMutedState] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setBgmMutedState(isBgmMuted())
  }, [])

  useEffect(() => {
    if (!moreOpen) return
    const handleOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setMoreOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreOpen(false)
      }
    }
    window.addEventListener('pointerdown', handleOutside)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('pointerdown', handleOutside)
      window.removeEventListener('keydown', handleKey)
    }
  }, [moreOpen])

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
  const statPoints = p.statPoints ?? 0
  const skillPoints = p.skillPoints ?? 0
  const invTotal = Math.max(1, getInventoryCapacityBreakdown(p).total)
  const bagPct = Math.min(100, Math.round((p.inventory.length / invTotal) * 100))
  const nextTowerFloor = (p.towerState?.highestFloor ?? 0) + 1
  const moreBadgeCount = partyInvites.length + gemShopBadge

  const openFromMenu = (panel: PanelId) => {
    openPanel(panel)
    setMoreOpen(false)
  }

  const toggleBgm = () => {
    const nextMuted = toggleBgmMute(p.mapId)
    setBgmMutedState(nextMuted)
  }

  return (
    <nav
      ref={containerRef}
      aria-label="แถบเมนูหลักมุมบนขวา"
      data-testid="menu-dock"
      className="pointer-events-auto relative flex items-start gap-1 sm:gap-2"
    >
      {/* Clean Floating Top Menu Icons */}
      <div className="flex items-start gap-1.5 sm:gap-2.5">
        {TOP_MENU_ITEMS.map(({ panel, label, iconId, FallbackIcon, hideOnXs }) => {
          const urgentBadge =
            panel === 'quests'
              ? claimableQuests
              : panel === 'gem-shop'
                ? gemShopBadge
                : 0
          const pointBadge =
            panel === 'character'
              ? statPoints
              : panel === 'talents'
                ? skillPoints
                : 0

          return (
            <button
              key={panel}
              type="button"
              data-testid={`menu-btn-${panel}`}
              onClick={() => openFromMenu(panel)}
              title={
                pointBadge > 0
                  ? `${label} (มีแต้มคงเหลือ ${pointBadge} แต้ม)`
                  : label
              }
              className={cn(
                'group relative flex min-w-[34px] flex-col items-center gap-0.5 pt-0.5 transition-transform duration-100 hover:-translate-y-0.5 active:translate-y-0 sm:min-w-[40px]',
                hideOnXs ? 'hidden md:flex' : 'flex',
              )}
            >
              <span className="relative grid size-8 place-items-center sm:size-9">
                <PixelMenuIcon
                  iconId={iconId}
                  FallbackIcon={FallbackIcon}
                  alt={label}
                  size={32}
                  className="size-7 transition-transform duration-100 group-hover:scale-105 sm:size-8"
                />
                {panel === 'inventory' ? (
                  <span
                    className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full border border-emerald-200/80 bg-emerald-600 px-1 py-px font-mono text-[8px] font-extrabold leading-none text-white shadow tabular-nums"
                    aria-label={`ความจุกระเป๋า ${bagPct}%`}
                  >
                    {bagPct}%
                  </span>
                ) : urgentBadge > 0 ? (
                  <span className="absolute -right-1 -top-0.5 flex h-[15px] min-w-[16px] items-center justify-center rounded-full border border-white/80 bg-rose-600 px-1 font-mono text-[8px] font-extrabold leading-none text-white shadow tabular-nums">
                    +{urgentBadge > 99 ? '99+' : urgentBadge}
                  </span>
                ) : pointBadge > 0 ? (
                  <span className="absolute -right-1 -top-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full border border-amber-100/85 bg-amber-500 px-1 font-mono text-[7.5px] font-extrabold leading-none text-[#1e1204] shadow tabular-nums">
                    {pointBadge > 99 ? '99+' : `+${pointBadge}`}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap text-[9.5px] font-bold leading-none text-white sm:text-[10.5px]',
                  LABEL_SHADOW_CLASS,
                )}
              >
                {label}
              </span>
            </button>
          )
        })}

        {/* หอคอย (Quick Link to /tower) */}
        <Link
          href="/tower"
          onClick={() => saveGame()}
          title={`เข้าหอคอยชั้น ${nextTowerFloor}`}
          className="group relative hidden min-w-[40px] flex-col items-center gap-0.5 pt-0.5 transition-transform duration-100 hover:-translate-y-0.5 active:translate-y-0 lg:flex"
        >
          <span className="relative grid size-8 place-items-center sm:size-9">
            <PixelMenuIcon
              iconId="tower"
              FallbackIcon={Castle}
              alt="หอคอย"
              size={32}
              className="size-7 transition-transform duration-100 group-hover:scale-105 sm:size-8"
            />
            <span className="absolute -right-1 -top-0.5 flex h-[14px] min-w-[15px] items-center justify-center rounded-full border border-amber-200/80 bg-amber-600 px-1 font-mono text-[8px] font-extrabold leading-none text-white shadow tabular-nums">
              {nextTowerFloor}
            </span>
          </span>
          <span className={cn('whitespace-nowrap text-[10.5px] font-bold leading-none text-white', LABEL_SHADOW_CLASS)}>
            หอคอย
          </span>
        </Link>

        {/* เพิ่มเติม (4-Gem Grid Trigger) */}
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          aria-label="เปิดเมนูเพิ่มเติมทั้งหมด"
          onClick={() => setMoreOpen((prev) => !prev)}
          title="เมนูระบบ RPG ทั้งหมด"
          className="group relative flex min-w-[34px] flex-col items-center gap-0.5 pt-0.5 transition-transform duration-100 hover:-translate-y-0.5 active:translate-y-0 sm:min-w-[40px]"
        >
          <span className="relative grid size-8 place-items-center sm:size-9">
            <PixelMenuIcon
              iconId="more"
              FallbackIcon={LayoutGrid}
              alt="เพิ่มเติม"
              size={30}
              className={cn(
                'size-7 transition-transform duration-100 group-hover:scale-105 sm:size-[30px]',
                moreOpen && 'scale-105 brightness-110',
              )}
            />
            {moreBadgeCount > 0 && (
              <span className="absolute -right-1 -top-0.5 flex h-[15px] min-w-[16px] items-center justify-center rounded-full border border-white/80 bg-rose-600 px-1 font-mono text-[8px] font-extrabold leading-none text-white shadow tabular-nums">
                +{moreBadgeCount}
              </span>
            )}
          </span>
          <span
            className={cn(
              'whitespace-nowrap text-[9.5px] font-bold leading-none sm:text-[10.5px]',
              moreOpen ? 'text-amber-300' : 'text-white',
              LABEL_SHADOW_CLASS,
            )}
          >
            เพิ่มเติม
          </span>
        </button>
      </div>

      {/* Compact 2x2 Circular Utility Controls (Unobtrusive & matching row height) */}
      <div className="grid grid-cols-2 gap-1 pt-1">
        <button
          type="button"
          onClick={toggleBgm}
          aria-pressed={!bgmMuted}
          aria-label={bgmMuted ? 'เปิดเพลงประกอบ (BGM)' : 'ปิดเพลงประกอบ (BGM)'}
          title={bgmMuted ? 'เปิดเพลงประกอบ (BGM)' : 'ปิดเพลงประกอบ (BGM)'}
          className={cn(
            'grid size-5 place-items-center rounded-full border shadow transition-colors sm:size-[22px]',
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
          className="grid size-5 place-items-center rounded-full border border-white/25 bg-slate-950/70 text-slate-300 shadow transition-colors hover:border-amber-300/60 hover:text-white sm:size-[22px]"
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
              'grid size-5 place-items-center rounded-full border shadow transition-colors sm:size-[22px]',
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
          className="grid size-5 place-items-center rounded-full border border-white/25 bg-slate-950/70 text-slate-300 shadow transition-colors hover:border-amber-300/60 hover:text-white sm:size-[22px]"
        >
          <RotateCcw className="size-3" aria-hidden />
        </button>
      </div>

      {/* Expanded "เพิ่มเติม" RPG Systems Grid Drawer */}
      {moreOpen && (
        <div
          role="menu"
          className="pixel-panel absolute right-0 top-full z-50 mt-2 max-h-[75dvh] w-[min(23rem,calc(100vw-1rem))] space-y-2.5 overflow-y-auto bg-[#121628]/96 p-2.5 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2 border-b border-amber-400/25 pb-1.5">
            <span className="text-[11px] font-bold text-amber-200">เมนูระบบเกมทั้งหมด</span>
            {onOpenCheckin && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMoreOpen(false)
                  onOpenCheckin()
                }}
                className="flex items-center gap-1 rounded border border-amber-300/50 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-200 hover:bg-amber-500/30"
              >
                <PixelMenuIcon iconId="checkin" alt="เช็คอิน" size={16} />
                <span>เช็คอินรายวัน</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
            <Link
              href="/tower"
              onClick={() => {
                saveGame()
                setMoreOpen(false)
              }}
              className="group flex flex-col items-center gap-1 rounded-md border border-transparent p-1.5 text-center transition-colors hover:border-amber-400/40 hover:bg-white/5"
            >
              <PixelMenuIcon iconId="tower" FallbackIcon={Castle} alt="หอคอย" size={28} />
              <span className="w-full truncate text-[9.5px] font-semibold text-foreground">หอคอย {nextTowerFloor}</span>
            </Link>

            {MORE_MENU_ITEMS.map(({ panel, label, iconId, hint }) => (
              <button
                key={panel}
                type="button"
                role="menuitem"
                title={hint}
                onClick={() => openFromMenu(panel)}
                className="group relative flex flex-col items-center gap-1 rounded-md border border-transparent p-1.5 text-center transition-colors hover:border-amber-400/40 hover:bg-white/5"
              >
                <PixelMenuIcon iconId={iconId} alt={label} size={28} className="transition-transform group-hover:scale-105" />
                <span className="w-full truncate text-[9.5px] font-semibold text-foreground">{label}</span>
                {panel === 'party' && partyInvites.length > 0 && (
                  <span className="absolute right-1 top-1 rounded-full bg-rose-600 px-1 text-[8px] font-bold text-white">
                    {partyInvites.length}
                  </span>
                )}
                {panel === 'gem-shop' && gemShopBadge > 0 && (
                  <span className="absolute right-1 top-1 rounded-full bg-rose-600 px-1 text-[8px] font-bold text-white">
                    {gemShopBadge > 99 ? '99' : gemShopBadge}
                  </span>
                )}
              </button>
            ))}

            {isGmDev && (
              <button
                type="button"
                role="menuitem"
                title="เครื่องมือผู้ดูแลระบบ"
                onClick={() => openFromMenu('dev-tools')}
                className="group flex flex-col items-center gap-1 rounded-md border border-amber-400/35 bg-amber-500/10 p-1.5 text-center transition-colors hover:bg-amber-500/20"
              >
                <PixelMenuIcon iconId="dev-tools" alt="Dev Console" size={28} />
                <span className="w-full truncate text-[9.5px] font-semibold text-amber-200">Dev Console</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
