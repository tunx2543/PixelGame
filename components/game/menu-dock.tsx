'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  Backpack,
  BookOpen,
  Castle,
  ChevronDown,
  EyeOff,
  Gamepad2,
  Gift,
  Hammer,
  LayoutGrid,
  PawPrint,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  User,
} from 'lucide-react'
import { useGame } from '@/lib/game/use-game'
import { openPanel, saveGame, toggleZenHud, type PanelId } from '@/lib/game/engine'
import { useDailyMissions } from '@/lib/game/daily-missions'
import { countClaimableQuests } from '@/lib/game/systems'

const RPG_MENU_ITEMS: Array<{
  panel: PanelId
  label: string
  hint: string
  Icon: typeof Hammer
  tone: string
}> = [
  { panel: 'craft', label: 'คราฟต์ & รูน', hint: 'สร้าง / ย่อย / ฝังรูน', Icon: Hammer, tone: 'text-amber-300' },
  { panel: 'codex', label: 'สมุดภาพ & ฉายา', hint: 'รางวัลล่ามอนสเตอร์', Icon: BookOpen, tone: 'text-cyan-300' },
  { panel: 'guild', label: 'กิลด์ & บอสโลก', hint: 'บัฟกิลด์ / เรดบอส', Icon: Shield, tone: 'text-emerald-300' },
  { panel: 'arena', label: 'ลานประลอง PvP', hint: 'ชิงอันดับท้าดวล', Icon: Swords, tone: 'text-rose-300' },
  { panel: 'dungeon', label: 'ดันเจี้ยนรายวัน', hint: 'ทอง / หิน / บอส', Icon: Castle, tone: 'text-purple-300' },
  { panel: 'quests', label: 'ภารกิจ & เควสต์', hint: 'รางวัลความก้าวหน้า', Icon: ScrollText, tone: 'text-amber-200' },
  { panel: 'pets', label: 'สัตว์เลี้ยง', hint: 'คู่หูช่วยต่อสู้', Icon: PawPrint, tone: 'text-accent' },
  { panel: 'gacha', label: 'เปิดตู้กาชา', hint: 'สุ่มอาวุธหายาก', Icon: Gift, tone: 'text-primary' },
  { panel: 'character', label: 'ตัวละคร & สกิล', hint: 'อัปสเตตัส / สวมใส่', Icon: User, tone: 'text-foreground' },
  { panel: 'models', label: 'คลังโมเดล 2D', hint: 'พรีวิวอาชีพและมอน', Icon: Sparkles, tone: 'text-gold' },
]

export function MenuDock({
  showTouch = false,
  onToggleTouch,
}: {
  layout?: 'desktop' | 'mobile'
  showTouch?: boolean
  onToggleTouch?: () => void
}) {
  const { p } = useGame()
  const dailyMissions = useDailyMissions()
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', handleOutside)
    return () => window.removeEventListener('pointerdown', handleOutside)
  }, [menuOpen])

  if (!p) return null

  const claimableQuests =
    countClaimableQuests(p.questState, p.towerState, p.petState, p.kills) + dailyMissions.claimableCount
  const nextTowerFloor = (p.towerState?.highestFloor ?? 0) + 1

  const openFromMenu = (panel: PanelId) => {
    openPanel(panel)
    setMenuOpen(false)
  }

  return (
    <nav
      ref={containerRef}
      aria-label="เมนูระบบตัวละครและผจญภัย"
      data-testid="menu-dock"
      className="pointer-events-auto relative flex items-center gap-1 pixel-panel p-1 shadow-lg"
    >
      <button
        type="button"
        onClick={() => openPanel('inventory')}
        className="pixel-btn flex items-center gap-1 whitespace-nowrap bg-secondary px-2 py-1 text-[10px] font-semibold text-foreground hover:bg-secondary/80"
      >
        <Backpack className="size-3.5 text-amber-200" aria-hidden />
        <span>กระเป๋า</span>
      </button>

      <Link
        href="/tower"
        onClick={() => saveGame()}
        className="pixel-btn flex items-center gap-1 whitespace-nowrap bg-primary/20 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/30"
      >
        <Castle className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">หอคอย (ชั้น {nextTowerFloor})</span>
        <span className="sm:hidden">หอคอย</span>
      </Link>

      <button
        type="button"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="pixel-btn flex items-center gap-1 whitespace-nowrap bg-accent/15 px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent/25"
      >
        <LayoutGrid className="size-3.5" aria-hidden />
        <span>ระบบ RPG</span>
        {claimableQuests > 0 && (
          <span className="font-mono text-[9px] font-bold text-amber-300 tabular-nums">
            ({claimableQuests})
          </span>
        )}
        <ChevronDown className={`size-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {onToggleTouch && (
        <button
          type="button"
          onClick={onToggleTouch}
          aria-pressed={showTouch}
          aria-label={showTouch ? 'ซ่อนปุ่มควบคุมบนจอ' : 'แสดงปุ่มควบคุมบนจอ'}
          title={showTouch ? 'ซ่อนปุ่มสัมผัส' : 'แสดงปุ่มสัมผัส'}
          className={`pixel-btn p-1 text-[10px] ${
            showTouch ? 'bg-primary/25 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
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

      {menuOpen && (
        <div
          role="menu"
          className="pixel-panel absolute right-0 top-full z-40 mt-1 grid w-64 grid-cols-2 gap-1 p-1.5 shadow-2xl sm:w-72"
        >
          {RPG_MENU_ITEMS.map(({ panel, label, hint, Icon, tone }) => (
            <button
              key={panel}
              type="button"
              role="menuitem"
              onClick={() => openFromMenu(panel)}
              className="pixel-btn flex items-start gap-1.5 bg-secondary/90 px-2 py-1.5 text-left hover:bg-secondary"
            >
              <Icon className={`mt-0.5 size-3.5 shrink-0 ${tone}`} aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-[10px] font-semibold text-foreground">
                  {label}
                  {panel === 'quests' && claimableQuests > 0 ? ` (${claimableQuests})` : ''}
                </span>
                <span className="block truncate text-[8px] text-muted-foreground">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}
