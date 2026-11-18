'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  Award,
  Backpack,
  BookOpen,
  CalendarCheck2,
  Castle,
  ChevronDown,
  Compass,
  Crown,
  EyeOff,
  Feather,
  Gamepad2,
  Gem,
  Gift,
  Hammer,
  LayoutGrid,
  Leaf,
  Mail,
  Menu,
  PawPrint,
  RotateCcw,
  ScrollText,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Swords,
  Terminal,
  User,
  Users,
  UsersRound,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'
import { isBgmMuted, toggleBgmMute } from '@/lib/game/bgm'
import { useDailyMissions } from '@/lib/game/daily-missions'
import { isCurrentAccountGm, openPanel, saveGame, toggleZenHud, type PanelId } from '@/lib/game/engine'
import { countClaimableQuests } from '@/lib/game/systems'
import { resetUiLayout } from '@/lib/game/ui-layout'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'

const PRIMARY_MENU_ITEMS: Array<{
  panel: PanelId
  label: string
  Icon: typeof Backpack
  tone: string
}> = [
  { panel: 'inventory', label: 'กระเป๋า', Icon: Backpack, tone: 'text-amber-200' },
  { panel: 'equipment', label: 'อุปกรณ์', Icon: Shield, tone: 'text-sky-200' },
  { panel: 'shop', label: 'ร้านค้า', Icon: ShoppingBag, tone: 'text-emerald-200' },
  { panel: 'quests', label: 'ภารกิจ', Icon: ScrollText, tone: 'text-amber-300' },
  { panel: 'friends', label: 'เพื่อน', Icon: UsersRound, tone: 'text-accent' },
  { panel: 'party', label: 'ปาร์ตี้', Icon: Users, tone: 'text-purple-300' },
  { panel: 'settings', label: 'ตั้งค่า', Icon: Settings, tone: 'text-slate-200' },
]

const RPG_SYSTEM_ITEMS: Array<{
  panel: PanelId
  label: string
  hint: string
  Icon: typeof Hammer
  tone: string
}> = [
  { panel: 'character', label: 'ตัวละคร & สกิล', hint: 'อัปสเตตัส / ข้อมูลตัวละคร', Icon: User, tone: 'text-foreground' },
  { panel: 'job', label: 'เปลี่ยนอาชีพ & คลาส', hint: '21 อาชีพ (รวม Lumivara)', Icon: Crown, tone: 'text-amber-300' },
  { panel: 'gem-shop', label: 'ร้านค้าเพชร', hint: 'แฟชั่น / คู่หู / ยูทิลิตี้', Icon: Gem, tone: 'text-cyan-200' },
  { panel: 'pass', label: 'Battle Pass', hint: 'รางวัลซีซัน 20 ขั้น', Icon: Award, tone: 'text-amber-300' },
  { panel: 'enhance', label: 'ตีบวกอุปกรณ์', hint: 'เสริมพลังอาวุธ & เกราะ', Icon: Hammer, tone: 'text-orange-300' },
  { panel: 'craft', label: 'คราฟต์ & รูน', hint: 'สร้าง / ย่อย / ฝังรูน', Icon: Sparkles, tone: 'text-amber-300' },
  { panel: 'pets', label: 'สัตว์เลี้ยง & สัตว์ขี่', hint: 'ผอบ / คู่หู / พาหนะ', Icon: PawPrint, tone: 'text-accent' },
  { panel: 'wardrobe', label: 'แฟชั่น & ปีก', hint: 'ปีก / สกินอาวุธ / กรอบชื่อ', Icon: Feather, tone: 'text-pink-300' },
  { panel: 'talents', label: 'Talent & สลับเซ็ต', hint: '3 สาย / อัปสกิล / พรีเซ็ต', Icon: Zap, tone: 'text-purple-300' },
  { panel: 'lifeskills', label: 'ทักษะชีวิต & อาหาร', hint: 'ตกปลา / ขุดแร่ / บัฟ', Icon: Leaf, tone: 'text-emerald-300' },
  { panel: 'dungeon', label: 'ดันเจี้ยน & Co-op', hint: 'รายวัน / ปาร์ตี้เรดบอส', Icon: Castle, tone: 'text-purple-300' },
  { panel: 'guild', label: 'กิลด์ & บอสโลก', hint: 'แชท / เรดกิลด์ / บอสโลก', Icon: Shield, tone: 'text-emerald-300' },
  { panel: 'arena', label: 'ลานประลอง & อันดับ', hint: 'PvP 1v1 / ตารางอันดับ', Icon: Swords, tone: 'text-rose-300' },
  { panel: 'market', label: 'ตลาดประมูล', hint: 'ซื้อขายไอเทมผู้เล่น', Icon: ShoppingBag, tone: 'text-gold' },
  { panel: 'mail', label: 'จดหมาย & ของขวัญ', hint: 'รับรางวัล / ส่งให้เพื่อน', Icon: Mail, tone: 'text-sky-300' },
  { panel: 'codex', label: 'สมุดภาพ & ฉายา', hint: 'รางวัลล่ามอนสเตอร์', Icon: BookOpen, tone: 'text-cyan-300' },
  { panel: 'gacha', label: 'เปิดตู้กาชา', hint: 'สุ่มอาวุธหายาก', Icon: Gift, tone: 'text-primary' },
  { panel: 'guide', label: 'คู่มือ & ป้องกันเมือง', hint: 'ภารกิจ 6 ขั้น + Wave', Icon: Compass, tone: 'text-cyan-300' },
  { panel: 'models', label: 'คลังโมเดล 2D', hint: 'พรีวิวอาชีพ / มอน / ผอบ', Icon: Sparkles, tone: 'text-gold' },
]

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
  const { p, partyInvites } = useGame()
  const dailyMissions = useDailyMissions()
  const [rpgOpen, setRpgOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [bgmMuted, setBgmMutedState] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setBgmMutedState(isBgmMuted())
  }, [])

  useEffect(() => {
    if (!rpgOpen && !mobileMenuOpen) return
    const handleOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setRpgOpen(false)
        setMobileMenuOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRpgOpen(false)
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', handleOutside)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('pointerdown', handleOutside)
      window.removeEventListener('keydown', handleKey)
    }
  }, [rpgOpen, mobileMenuOpen])

  if (!p) return null

  const claimableQuests =
    countClaimableQuests(p.questState, p.towerState, p.petState, p.kills) + dailyMissions.claimableCount
  const nextTowerFloor = (p.towerState?.highestFloor ?? 0) + 1
  const isGmDev = Boolean(p.gm && isCurrentAccountGm())

  const openFromMenu = (panel: PanelId) => {
    openPanel(panel)
    setRpgOpen(false)
    setMobileMenuOpen(false)
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
      className="pointer-events-auto relative flex items-center gap-1 pixel-panel bg-[#1b1414]/95 p-1 shadow-lg"
    >
      {/* Desktop / Tablet Primary Buttons (7 core menus) */}
      <div className="hidden items-center gap-1 lg:flex">
        {PRIMARY_MENU_ITEMS.map(({ panel, label, Icon, tone }) => {
          const badge =
            panel === 'quests' && claimableQuests > 0
              ? claimableQuests
              : panel === 'party' && partyInvites.length > 0
                ? partyInvites.length
                : 0
          return (
            <button
              key={panel}
              type="button"
              data-testid={`menu-btn-${panel}`}
              onClick={() => openFromMenu(panel)}
              className="pixel-btn relative flex items-center gap-1 whitespace-nowrap bg-secondary/95 px-2 py-1 text-[10px] font-semibold text-foreground hover:bg-secondary"
            >
              <Icon className={cn('size-3.5 shrink-0', tone)} aria-hidden />
              <span>{label}</span>
              {badge > 0 && (
                <span className="rounded bg-accent px-1 font-mono text-[9px] font-bold text-accent-foreground tabular-nums">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Compact Quick Buttons on Medium/Mobile (<1024px) */}
      <div className="flex items-center gap-1 lg:hidden">
        <button
          type="button"
          onClick={() => openFromMenu('inventory')}
          className="pixel-btn flex items-center gap-1 bg-secondary px-2 py-1 text-[10px] font-semibold text-foreground"
        >
          <Backpack className="size-3.5 text-amber-200" aria-hidden />
          <span className="hidden sm:inline">กระเป๋า</span>
        </button>
        <button
          type="button"
          onClick={() => openFromMenu('equipment')}
          className="pixel-btn flex items-center gap-1 bg-secondary px-2 py-1 text-[10px] font-semibold text-foreground"
        >
          <Shield className="size-3.5 text-sky-200" aria-hidden />
          <span className="hidden sm:inline">อุปกรณ์</span>
        </button>
        <button
          type="button"
          onClick={() => openFromMenu('quests')}
          className="pixel-btn relative flex items-center gap-1 bg-secondary px-2 py-1 text-[10px] font-semibold text-foreground"
        >
          <ScrollText className="size-3.5 text-amber-300" aria-hidden />
          <span className="hidden sm:inline">ภารกิจ</span>
          {claimableQuests > 0 && (
            <span className="rounded bg-accent px-1 font-mono text-[9px] font-bold text-accent-foreground tabular-nums">
              {claimableQuests}
            </span>
          )}
        </button>
        <button
          type="button"
          aria-expanded={mobileMenuOpen}
          aria-label="เปิดเมนูทั้งหมด"
          onClick={() => {
            setMobileMenuOpen((v) => !v)
            setRpgOpen(false)
          }}
          className="pixel-btn flex items-center gap-1 bg-primary/20 px-2 py-1 text-[10px] font-semibold text-primary"
        >
          <Menu className="size-3.5" aria-hidden />
          <span>เมนู</span>
        </button>
      </div>

      {/* Tower Quick Link & RPG Systems Dropdown */}
      <Link
        href="/tower"
        onClick={() => saveGame()}
        className="pixel-btn hidden items-center gap-1 whitespace-nowrap bg-primary/20 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/30 sm:flex"
      >
        <Castle className="size-3.5" aria-hidden />
        <span>หอคอย {nextTowerFloor}</span>
      </Link>

      <button
        type="button"
        aria-expanded={rpgOpen}
        aria-haspopup="menu"
        onClick={() => {
          setRpgOpen((prev) => !prev)
          setMobileMenuOpen(false)
        }}
        className="pixel-btn hidden items-center gap-1 whitespace-nowrap bg-accent/15 px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent/25 sm:flex"
      >
        <LayoutGrid className="size-3.5" aria-hidden />
        <span>ระบบ RPG</span>
        <ChevronDown className={cn('size-3 transition-transform', rpgOpen && 'rotate-180')} aria-hidden />
      </button>

      {/* Utility Controls: Reset Layout, BGM, Touch, Zen */}
      <button
        type="button"
        onClick={() => resetUiLayout()}
        aria-label="Reset UI Layout"
        title="Reset UI Layout (จัดเรียงหน้าต่างและ HUD ใหม่)"
        className="pixel-btn bg-secondary p-1 text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="size-3.5" aria-hidden />
      </button>

      <button
        type="button"
        onClick={toggleBgm}
        aria-pressed={!bgmMuted}
        aria-label={bgmMuted ? 'เปิดเพลงประกอบ (BGM)' : 'ปิดเพลงประกอบ (BGM)'}
        title={bgmMuted ? 'เปิดเพลงประกอบ (BGM)' : 'ปิดเพลงประกอบ (BGM)'}
        className={cn(
          'pixel-btn p-1 text-[10px]',
          !bgmMuted ? 'bg-emerald-500/25 text-emerald-200' : 'bg-secondary text-muted-foreground hover:text-foreground',
        )}
      >
        {bgmMuted ? <VolumeX className="size-3.5" aria-hidden /> : <Volume2 className="size-3.5" aria-hidden />}
      </button>

      {onToggleTouch && (
        <button
          type="button"
          onClick={onToggleTouch}
          aria-pressed={showTouch}
          aria-label={showTouch ? 'ซ่อนปุ่มควบคุมบนจอ' : 'แสดงปุ่มควบคุมบนจอ'}
          title={showTouch ? 'ซ่อนปุ่มสัมผัส' : 'แสดงปุ่มสัมผัส'}
          className={cn(
            'pixel-btn p-1 text-[10px]',
            showTouch ? 'bg-primary/25 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground',
          )}
        >
          <Gamepad2 className="size-3.5" aria-hidden />
        </button>
      )}

      <button
        type="button"
        onClick={() => toggleZenHud(true)}
        aria-label="ซ่อน UI รอบจอ (กด H)"
        title="ซ่อน UI รอบจอ (กด H)"
        className="pixel-btn bg-secondary p-1 text-muted-foreground hover:text-foreground"
      >
        <EyeOff className="size-3.5" aria-hidden />
      </button>

      {/* Mobile / Medium Drawer */}
      {mobileMenuOpen && (
        <div
          role="menu"
          className="pixel-panel absolute right-0 top-full z-50 mt-1 max-h-[75dvh] w-[min(20rem,calc(100vw-1rem))] space-y-2 overflow-y-auto bg-[#0f1423]/95 p-2 shadow-2xl"
        >
          <div className="grid grid-cols-2 gap-1">
            {PRIMARY_MENU_ITEMS.map(({ panel, label, Icon, tone }) => (
              <button
                key={panel}
                type="button"
                role="menuitem"
                onClick={() => openFromMenu(panel)}
                className="pixel-btn flex items-center gap-1.5 bg-secondary px-2 py-2 text-left text-[11px] font-semibold text-foreground"
              >
                <Icon className={cn('size-3.5 shrink-0', tone)} aria-hidden />
                <span className="truncate">{label}</span>
              </button>
            ))}
            {onOpenCheckin && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMobileMenuOpen(false)
                  onOpenCheckin()
                }}
                className="pixel-btn flex items-center gap-1.5 bg-amber-500/20 px-2 py-2 text-left text-[11px] font-semibold text-amber-200"
              >
                <CalendarCheck2 className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">เช็คอินรายวัน</span>
              </button>
            )}
          </div>
          <div className="border-t border-border/60 pt-2">
            <p className="mb-1 text-[10px] font-bold text-accent">ระบบ RPG ทั้งหมด</p>
            <div className="grid grid-cols-2 gap-1">
              {RPG_SYSTEM_ITEMS.map(({ panel, label, Icon, tone }) => (
                <button
                  key={panel}
                  type="button"
                  role="menuitem"
                  onClick={() => openFromMenu(panel)}
                  className="pixel-btn flex items-center gap-1.5 bg-secondary/75 px-2 py-1.5 text-left text-[10px] text-foreground"
                >
                  <Icon className={cn('size-3 shrink-0', tone)} aria-hidden />
                  <span className="truncate">{label}</span>
                </button>
              ))}
              {isGmDev && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openFromMenu('dev-tools')}
                  className="pixel-btn flex items-center gap-1.5 bg-amber-500/20 px-2 py-1.5 text-left text-[10px] text-amber-200"
                >
                  <Terminal className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">Dev Console</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop RPG Systems Drawer */}
      {rpgOpen && (
        <div
          role="menu"
          className="pixel-panel absolute right-0 top-full z-50 mt-1 max-h-[75dvh] w-[min(28rem,calc(100vw-1rem))] space-y-2 overflow-y-auto bg-[#0f1423]/95 p-2 shadow-2xl"
        >
          {onOpenCheckin && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setRpgOpen(false)
                onOpenCheckin()
              }}
              className="pixel-btn flex w-full items-center justify-center gap-1.5 border border-amber-300/40 bg-amber-500/15 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25"
            >
              <CalendarCheck2 className="size-3.5" aria-hidden />
              เช็คอินรับรางวัลประจำวัน
            </button>
          )}

          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {RPG_SYSTEM_ITEMS.map(({ panel, label, hint, Icon, tone }) => (
              <button
                key={panel}
                type="button"
                role="menuitem"
                onClick={() => openFromMenu(panel)}
                className="pixel-btn flex items-start gap-1.5 bg-secondary/90 px-2 py-1.5 text-left hover:bg-secondary"
              >
                <Icon className={cn('mt-0.5 size-3.5 shrink-0', tone)} aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-semibold text-foreground">{label}</span>
                  <span className="block truncate text-[8px] text-muted-foreground">{hint}</span>
                </span>
              </button>
            ))}
            {isGmDev && (
              <button
                type="button"
                role="menuitem"
                onClick={() => openFromMenu('dev-tools')}
                className="pixel-btn flex items-start gap-1.5 bg-amber-500/20 px-2 py-1.5 text-left hover:bg-amber-500/30"
              >
                <Terminal className="mt-0.5 size-3.5 shrink-0 text-amber-300" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-semibold text-amber-200">Dev Console</span>
                  <span className="block truncate text-[8px] text-amber-100/70">เครื่องมือผู้ดูแลระบบ</span>
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
