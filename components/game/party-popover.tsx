'use client'

import { Users, X } from 'lucide-react'
import { game, notify } from '@/lib/game/engine'
import { useGame } from '@/lib/game/use-game'
import { PartyManagerContent } from './panels/party-panel'

export function PartyPopover() {
  useGame()

  if (!game.partyPanelOpen || !game.p) return null

  const closePopover = () => {
    game.partyPanelOpen = false
    notify()
  }

  return (
    <div
      className="pointer-events-auto pixel-panel absolute right-2 top-14 z-50 w-[min(22rem,calc(100vw-1rem))] p-2.5 shadow-2xl md:right-[12.25rem] md:top-3"
      role="dialog"
      aria-label="ระบบปาร์ตี้"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-border pb-1.5">
        <div className="flex items-center gap-1.5">
          <Users className="size-4 text-purple-300" aria-hidden />
          <p className="text-xs font-bold text-purple-200">ระบบปาร์ตี้ด่วน</p>
        </div>
        <button
          type="button"
          onClick={closePopover}
          aria-label="ปิดหน้าต่างปาร์ตี้"
          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="max-h-[min(26rem,68vh)] overflow-y-auto pr-0.5">
        <PartyManagerContent active={game.partyPanelOpen} />
      </div>
    </div>
  )
}
