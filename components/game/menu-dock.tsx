'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  Award,
  Backpack,
  BookOpen,
  Castle,
  ChevronDown,
  Compass,
  Crown,
  EyeOff,
  Feather,
  Gamepad2,
  Gift,
  Hammer,
  LayoutGrid,
  Leaf,
  Mail,
  PawPrint,
  ScrollText,
  Shield,
  ShoppingBag,
  Sparkles,
  Swords,
  User,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'
import { isBgmMuted, toggleBgmMute } from '@/lib/game/bgm'
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
  { panel: 'pass', label: 'Battle Pass', hint: 'รางวัลซีซัน 20 ขั้น', Icon: Award, tone: 'text-amber-300' },
  { panel: 'market', label: 'ตลาดประมูล', hint: 'ซื้อขายไอเทมผู้เล่น', Icon: ShoppingBag, tone: 'text-gold' },
  { panel: 'mail', label: 'จดหมาย & ของขวัญ', hint: 'รับรางวัล / ส่งให้เพื่อน', Icon: Mail, tone: 'text-sky-300' },
  { panel: 'lifeskills', label: 'ทักษะชีวิต & ทำอาหาร', hint: 'ตกปลา / ขุดแร่ / บัฟ', Icon: Leaf, tone: 'text-emerald-300' },
  { panel: 'talents', label: 'Talent & สลับเซ็ต', hint: '3 สาย / อัปสกิล / พรีเซ็ต', Icon: Zap, tone: 'text-purple-300' },
  { panel: 'wardrobe', label: 'แฟชั่น & ปีก', hint: 'ปีก / สกินอาวุธ / กรอบชื่อ', Icon: Feather, tone: 'text-pink-300' },
  { panel: 'guide', label: 'คู่มือ & ป้องกันเมือง', hint: 'ภารกิจ 6 ขั้น + Wave', Icon: Compass, tone: 'text-cyan-300' },
  { panel: 'craft', label: 'คราฟต์ & รูน', hint: 'สร้าง / ย่อย / ฝังรูน', Icon: Hammer, tone: 'text-amber-300' },
  { panel: 'codex', label: 'สมุดภาพ & ฉายา', hint: 'รางวัลล่ามอนสเตอร์', Icon: BookOpen, tone: 'text-cyan-300' },
  { panel: 'guild', label: 'กิลด์ & บอสโลก', hint: 'แชท / เรดกิลด์ / บอสโลก', Icon: Shield, tone: 'text-emerald-300' },
  { panel: 'arena', label: 'ลานประลอง & อันดับ', hint: 'PvP 1v1 / ตารางอันดับ', Icon: Swords, tone: 'text-rose-300' },
  { panel: 'dungeon', label: 'ดันเจี้ยน & Co-op', hint: 'รายวัน / ปาร์ตี้เรดบอส', Icon: Castle, tone: 'text-purple-300' },
  { panel: 'quests', label: 'ภารกิจ & เควสต์', hint: 'รางวัลความก้าวหน้า', Icon: ScrollText, tone: 'text-amber-200' },
  { panel: 'pets', label: 'สัตว์เลี้ยง (ผอบ) & สัตว์ขี่', hint: 'ผอบ / คู่หู / สัตว์ขี่เพิ่มเร็ว', Icon: PawPrint, tone: 'text-accent' },
  { panel: 'gacha', label: 'เปิดตู้กาชา', hint: 'สุ่มอาวุธหายาก', Icon: Gift, tone: 'text-primary' },
  { panel: 'character', label: 'ตัวละคร & สกิล', hint: 'อัปสเตตัส / สวมใส่', Icon: User, tone: 'text-foreground' },
  { panel: 'job', label: 'เปลี่ยนอาชีพ & สายคลาส', hint: '21 อาชีพ (รวม Lumivara)', Icon: Crown, tone: 'text-amber-300' },
  { panel: 'shop', label: 'ร้านค้า & โพชั่น', hint: 'ซื้อยา / อุปกรณ์เริ่มต้น', Icon: ShoppingBag, tone: 'text-emerald-200' },
  { panel: 'models', label: 'คลังโมเดล 2D', hint: 'อาชีพ / มอน / สัตว์ขี่ / ผอบ', Icon: Sparkles, tone: 'text-gold' },
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
  const [bgmMuted, setBgmMutedState] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setBgmMutedState(isBgmMuted())
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const handleOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('pointerdown', handleOutside)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('pointerdown', handleOutside)
      window.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  if (!p) return null

  const claimableQuests =
    countClaimableQuests(p.questState, p.towerState, p.petState, p.kills) + dailyMissions.claimableCount
  const nextTowerFloor = (p.towerState?.highestFloor ?? 0) + 1

  const openFromMenu = (panel: PanelId) => {
    openPanel(panel)
    setMenuOpen(false)
  }

  const toggleBgm = () => {
    const nextMuted = toggleBgmMute(p.mapId)
    setBgmMutedState(nextMuted)
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

      <button
        type="button"
        onClick={toggleBgm}
        aria-pressed={!bgmMuted}
        aria-label={bgmMuted ? 'เปิดเพลงประกอบ (BGM)' : 'ปิดเพลงประกอบ (BGM)'}
        title={bgmMuted ? 'เปิดเพลงประกอบ (BGM)' : 'ปิดเพลงประกอบ (BGM)'}
        className={`pixel-btn p-1 text-[10px] ${
          !bgmMuted ? 'bg-emerald-500/25 text-emerald-200' : 'bg-secondary text-muted-foreground hover:text-foreground'
        }`}
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
          className="pixel-panel absolute right-0 top-full z-40 mt-1 grid max-h-[75dvh] w-72 grid-cols-2 gap-1 overflow-y-auto bg-[#0f1423]/95 p-1.5 shadow-2xl sm:w-[27rem] sm:grid-cols-3"
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

