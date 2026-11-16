'use client'

import { Bot, Zap } from 'lucide-react'
import { useGame } from '@/lib/game/use-game'
import { game, notify } from '@/lib/game/engine'

export function AutoFarmWidget() {
  const { p } = useGame()
  if (!p) return null

  return (
    <div
      data-testid="auto-farm-widget"
      className="pointer-events-auto pixel-panel absolute bottom-[9.55rem] right-2 z-20 flex items-center gap-1 p-1 shadow-lg md:bottom-[9.35rem] md:right-3"
    >
      <button
        type="button"
        aria-pressed={game.autoFarm}
        onClick={() => {
          game.autoFarm = !game.autoFarm
          notify()
        }}
        className={`pixel-btn flex items-center gap-1 whitespace-nowrap px-1.5 py-1 text-[9px] font-semibold sm:px-2 sm:text-[10px] ${
          game.autoFarm
            ? 'bg-emerald-500/25 text-emerald-300'
            : 'bg-secondary text-muted-foreground hover:text-foreground'
        }`}
      >
        <Bot className="size-3" aria-hidden />
        {game.autoFarm ? 'หยุดออโต้' : 'ออโต้ฟาร์ม'}
      </button>
      <button
        type="button"
        disabled={!game.autoFarm}
        aria-pressed={game.autoSkills}
        onClick={() => {
          game.autoSkills = !game.autoSkills
          notify()
        }}
        className={`pixel-btn flex items-center gap-1 whitespace-nowrap px-1.5 py-1 text-[9px] font-semibold disabled:opacity-45 sm:px-2 sm:text-[10px] ${
          game.autoSkills && game.autoFarm
            ? 'bg-purple-500/25 text-purple-200'
            : 'bg-secondary text-muted-foreground hover:text-foreground'
        }`}
      >
        <Zap className="size-3" aria-hidden />
        สกิล: {game.autoSkills ? 'เปิด' : 'ปิด'}
      </button>
    </div>
  )
}
