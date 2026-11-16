'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Backpack, Castle, ChevronDown, ChevronUp, Gift, LayoutGrid, PawPrint, ScrollText, Sparkles } from 'lucide-react'
import { useGame } from '@/lib/game/use-game'
import { openPanel, saveGame } from '@/lib/game/engine'
import { useDailyMissions } from '@/lib/game/daily-missions'
import { countClaimableQuests } from '@/lib/game/systems'

export function MenuDock({ layout = 'desktop' }: { layout?: 'desktop' | 'mobile' }) {
  const { p } = useGame()
  const dailyMissions = useDailyMissions()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!p) return null

  const claimableQuests =
    countClaimableQuests(p.questState, p.towerState, p.petState, p.kills) + dailyMissions.claimableCount
  const nextTowerFloor = (p.towerState?.highestFloor ?? 0) + 1

  const openAndCloseMobile = (panel: 'inventory' | 'gacha' | 'pets' | 'quests' | 'models') => {
    openPanel(panel)
    setMobileOpen(false)
  }

  if (layout === 'mobile') {
    return (
      <div className="pointer-events-auto relative w-full md:hidden">
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'ซ่อนเมนูเกม' : 'เปิดเมนูเกม'}
          onClick={() => setMobileOpen((prev) => !prev)}
          className="pixel-panel flex w-full items-center justify-between gap-1.5 px-2 py-1 text-[10px] font-bold text-primary shadow-lg"
        >
          <span className="flex items-center gap-1">
            <LayoutGrid className="size-3" aria-hidden />
            เมนูระบบ{claimableQuests > 0 ? ` (${claimableQuests})` : ''}
          </span>
          {mobileOpen ? <ChevronUp className="size-3.5" aria-hidden /> : <ChevronDown className="size-3.5" aria-hidden />}
        </button>

        {mobileOpen && (
          <div className="pixel-panel absolute left-0 right-0 top-full z-40 mt-1 grid grid-cols-2 gap-1 p-1.5 shadow-2xl">
            <button
              type="button"
              onClick={() => openAndCloseMobile('inventory')}
              className="pixel-btn flex items-center justify-center gap-1 bg-secondary px-1.5 py-1.5 text-[10px] font-semibold text-foreground"
            >
              <Backpack className="size-3 text-amber-200" aria-hidden />
              กระเป๋า
            </button>
            <button
              type="button"
              onClick={() => openAndCloseMobile('gacha')}
              className="pixel-btn flex items-center justify-center gap-1 bg-primary/20 px-1.5 py-1.5 text-[10px] font-semibold text-primary"
            >
              <Gift className="size-3" aria-hidden />
              กาชา
            </button>
            <button
              type="button"
              onClick={() => openAndCloseMobile('pets')}
              className="pixel-btn flex items-center justify-center gap-1 bg-accent/15 px-1.5 py-1.5 text-[10px] font-semibold text-accent"
            >
              <PawPrint className="size-3" aria-hidden />
              สัตว์เลี้ยง
            </button>
            <button
              type="button"
              onClick={() => openAndCloseMobile('quests')}
              className="pixel-btn flex items-center justify-center gap-1 bg-amber-400/15 px-1.5 py-1.5 text-[10px] font-semibold text-amber-200"
            >
              <ScrollText className="size-3" aria-hidden />
              เควสต์{claimableQuests > 0 ? ` (${claimableQuests})` : ''}
            </button>
            <Link
              href="/tower"
              onClick={() => saveGame()}
              className="pixel-btn col-span-2 flex items-center justify-center gap-1 bg-primary/20 px-2 py-1.5 text-[10px] font-semibold text-primary"
            >
              <Castle className="size-3" aria-hidden />
              หอคอย (ชั้น {nextTowerFloor})
            </Link>
            <button
              type="button"
              onClick={() => openAndCloseMobile('models')}
              className="pixel-btn col-span-2 flex items-center justify-center gap-1 bg-secondary px-2 py-1.5 text-[10px] font-semibold text-foreground"
            >
              <Sparkles className="size-3 text-gold" aria-hidden />
              คลังโมเดล 2D
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <nav
      aria-label="เมนูระบบตัวละครและผจญภัย"
      data-testid="menu-dock"
      className="pointer-events-auto pixel-panel hidden items-center gap-1 p-1 shadow-lg md:flex"
    >
      <button
        type="button"
        onClick={() => openPanel('inventory')}
        className="pixel-btn flex items-center gap-1 whitespace-nowrap bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary/80"
      >
        <Backpack className="size-3.5 text-amber-200" aria-hidden />
        กระเป๋า
      </button>
      <button
        type="button"
        onClick={() => openPanel('gacha')}
        className="pixel-btn flex items-center gap-1 whitespace-nowrap bg-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/30"
      >
        <Gift className="size-3.5" aria-hidden />
        เปิดตู้กาชา
      </button>
      <button
        type="button"
        onClick={() => openPanel('pets')}
        className="pixel-btn flex items-center gap-1 whitespace-nowrap bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent hover:bg-accent/25"
      >
        <PawPrint className="size-3.5" aria-hidden />
        สัตว์เลี้ยง
      </button>
      <button
        type="button"
        onClick={() => openPanel('quests')}
        className="pixel-btn flex items-center gap-1 whitespace-nowrap bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-400/25"
      >
        <ScrollText className="size-3.5" aria-hidden />
        เควสต์{claimableQuests > 0 ? ` (${claimableQuests})` : ''}
      </button>
      <Link
        href="/tower"
        onClick={() => saveGame()}
        className="pixel-btn flex items-center gap-1 whitespace-nowrap bg-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/30"
      >
        <Castle className="size-3.5" aria-hidden />
        หอคอย (ชั้น {nextTowerFloor})
      </Link>
      <button
        type="button"
        onClick={() => openPanel('models')}
        className="pixel-btn flex items-center gap-1 whitespace-nowrap bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground hover:brightness-110"
      >
        <Sparkles className="size-3.5 text-gold" aria-hidden />
        คลังโมเดล 2D
      </button>
    </nav>
  )
}
