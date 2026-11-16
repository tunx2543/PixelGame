'use client'

import { useEffect } from 'react'
import { Coins, Hammer, Sparkles, Timer, X } from 'lucide-react'
import { MAPS } from '@/lib/game/maps'
import { claimOfflineAfkAction } from '@/lib/game/engine'
import { playQuestClaimSfx } from '@/lib/game/sfx'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from './format'

export function OfflineAfkModal() {
  const g = useGame()
  const summary = g.offlineAfkReward

  useEffect(() => {
    if (!summary) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        claimOfflineAfkAction()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [summary])

  if (!summary) return null

  const claimAndClose = () => {
    claimOfflineAfkAction()
    playQuestClaimSfx(true)
  }

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) claimAndClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="รางวัลฟาร์มออฟไลน์"
        className="pixel-panel w-full max-w-md border-2 border-primary/70 p-4 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-2 border-b border-border pb-2.5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-primary">
              <Timer className="size-4" aria-hidden /> ยินดีต้อนรับกลับมา! (ฟาร์มออฟไลน์)
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              คู่หูออกลาดตระเวนที่ {MAPS[summary.mapId]?.name ?? summary.mapId} นาน {summary.elapsedMinutes} นาที
            </p>
          </div>
          <button
            type="button"
            onClick={claimAndClose}
            className="pixel-btn bg-secondary p-1 text-foreground hover:bg-destructive hover:text-white"
            aria-label="ปิดหน้าต่างรางวัลออฟไลน์"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="my-4 grid grid-cols-3 gap-2 text-center text-xs tabular-nums">
          <div className="border border-border bg-background/70 p-2.5">
            <Coins className="mx-auto size-5 text-gold" aria-hidden />
            <p className="mt-1 font-bold text-gold">+{formatNum(summary.gold)} G</p>
            <p className="text-[10px] text-muted-foreground">เหรียญทอง</p>
          </div>
          <div className="border border-border bg-background/70 p-2.5">
            <Sparkles className="mx-auto size-5 text-purple-300" aria-hidden />
            <p className="mt-1 font-bold text-purple-300">+{formatNum(summary.exp)}</p>
            <p className="text-[10px] text-muted-foreground">ค่าประสบการณ์</p>
          </div>
          <div className="border border-border bg-background/70 p-2.5">
            <Hammer className="mx-auto size-5 text-amber-300" aria-hidden />
            <p className="mt-1 font-bold text-amber-300">x{summary.stones}</p>
            <p className="text-[10px] text-muted-foreground">หินตีบวก</p>
          </div>
        </div>

        <button
          type="button"
          onClick={claimAndClose}
          className="pixel-btn w-full bg-primary py-2 text-xs font-bold text-primary-foreground hover:brightness-110"
        >
          รับรางวัลทั้งหมดและเริ่มผจญภัย!
        </button>
      </section>
    </div>
  )
}
