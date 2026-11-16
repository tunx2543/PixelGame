'use client'

import { Users, UsersRound } from 'lucide-react'
import { useGame } from '@/lib/game/use-game'
import { game, notify } from '@/lib/game/engine'

export function SocialBar() {
  const { p } = useGame()
  if (!p) return null

  return (
    <div data-testid="social-bar" className="pointer-events-auto flex flex-col items-end gap-1">
      <div className="pixel-panel flex items-center gap-1 p-1 shadow-lg">
        <button
          type="button"
          onClick={() => {
            game.socialMenuOpen = !game.socialMenuOpen
            if (game.socialMenuOpen) {
              game.onlinePanelOpen = false
              game.partyPanelOpen = false
            }
            game.panel = null
            notify()
          }}
          aria-expanded={game.socialMenuOpen}
          aria-label="เปิดรายชื่อเพื่อน"
          title="รายชื่อเพื่อน"
          className={`pixel-btn flex items-center gap-1 whitespace-nowrap px-2 py-1 text-[10px] font-semibold ${
            game.socialMenuOpen
              ? 'bg-accent/35 text-foreground'
              : 'bg-accent/20 text-accent hover:bg-accent/30'
          }`}
        >
          <UsersRound className="size-3" aria-hidden />
          เพื่อน
        </button>

        <button
          type="button"
          onClick={() => {
            game.partyPanelOpen = !game.partyPanelOpen
            if (game.partyPanelOpen) {
              game.socialMenuOpen = false
              game.onlinePanelOpen = false
            }
            game.panel = null
            notify()
          }}
          aria-expanded={game.partyPanelOpen}
          aria-label="เปิดระบบปาร์ตี้"
          title="ระบบปาร์ตี้"
          className={`pixel-btn flex items-center gap-1 whitespace-nowrap px-2 py-1 text-[10px] font-semibold ${
            game.partyPanelOpen || game.partyInvites.length > 0
              ? 'bg-purple-500/35 text-purple-100'
              : 'bg-purple-500/20 text-purple-200 hover:bg-purple-500/30'
          }`}
        >
          <Users className="size-3" aria-hidden />
          ปาร์ตี้
          {game.party
            ? ` (${game.party.memberIds.length}/4)`
            : game.partyInvites.length > 0
              ? ` (${game.partyInvites.length})`
              : ''}
        </button>
      </div>

      {game.party && (
        <button
          type="button"
          onClick={() => {
            game.partyPanelOpen = !game.partyPanelOpen
            if (game.partyPanelOpen) {
              game.socialMenuOpen = false
              game.onlinePanelOpen = false
            }
            game.panel = null
            notify()
          }}
          className={`pixel-panel flex items-center gap-2 px-2 py-1 text-[9px] font-semibold shadow-md transition-colors ${
            game.partySameMapCount > 0
              ? 'border-emerald-400/50 text-emerald-200'
              : 'border-purple-400/50 text-purple-200'
          }`}
        >
          <span>ปาร์ตี้ {game.party.memberIds.length}/4</span>
          <span className="font-mono tabular-nums">
            {game.partySameMapCount > 0
              ? `EXP+${Math.round((game.partyExpMul - 1) * 100)}% G+${Math.round((game.partyGoldMul - 1) * 100)}%`
              : 'ต่างแมพ'}
          </span>
        </button>
      )}
    </div>
  )
}
