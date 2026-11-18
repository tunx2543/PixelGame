'use client'

import { Users, UsersRound } from 'lucide-react'
import { game, openPanel } from '@/lib/game/engine'
import { useGame } from '@/lib/game/use-game'

export function SocialBar() {
  const { p } = useGame()
  if (!p) return null

  return (
    <div data-testid="social-bar" className="pointer-events-auto flex w-full flex-col items-end gap-1">
      <div className="pixel-panel grid w-full grid-cols-2 gap-0.5 p-0.5 shadow-lg sm:gap-1 sm:p-1">
        <button
          type="button"
          onClick={() => openPanel('friends')}
          aria-label="เปิดหน้าต่างรายชื่อเพื่อน"
          title="เปิดหน้าต่างรายชื่อเพื่อน"
          className="pixel-btn flex items-center justify-center gap-1 whitespace-nowrap bg-accent/20 px-1 py-0.5 text-[9px] sm:px-1.5 sm:py-1 sm:text-[10px] font-semibold text-accent hover:bg-accent/30"
        >
          <UsersRound className="size-3 shrink-0" aria-hidden />
          <span>เพื่อน</span>
        </button>

        <button
          type="button"
          onClick={() => openPanel('party')}
          aria-label="เปิดหน้าต่างระบบปาร์ตี้"
          title="เปิดหน้าต่างระบบปาร์ตี้"
          className={`pixel-btn flex items-center justify-center gap-1 whitespace-nowrap px-1 py-0.5 text-[9px] font-semibold sm:px-1.5 sm:py-1 sm:text-[10px] ${
            game.partyInvites.length > 0
              ? 'bg-purple-500/35 text-purple-100'
              : 'bg-purple-500/20 text-purple-200 hover:bg-purple-500/30'
          }`}
        >
          <Users className="size-3 shrink-0" aria-hidden />
          <span className="truncate">
            ปาร์ตี้
            {game.party
              ? ` ${game.party.memberIds.length}/4`
              : game.partyInvites.length > 0
                ? ` (${game.partyInvites.length})`
                : ''}
          </span>
        </button>
      </div>

      {game.party && (
        <button
          type="button"
          onClick={() => openPanel('party')}
          className={`pixel-panel flex w-full items-center justify-between gap-2 px-1.5 py-0.5 text-[8.5px] font-semibold shadow-md sm:px-2 sm:text-[9px] transition-colors ${
            game.partySameMapCount > 0
              ? 'border-emerald-400/50 text-emerald-200'
              : 'border-purple-400/50 text-purple-200'
          }`}
        >
          <span className="truncate">{game.party.name}</span>
          <span className="shrink-0 font-mono tabular-nums">
            {game.partySameMapCount > 0
              ? `EXP+${Math.round((game.partyExpMul - 1) * 100)}%`
              : `${game.party.memberIds.length}/4 คน`}
          </span>
        </button>
      )}
    </div>
  )
}
