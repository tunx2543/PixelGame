'use client'

import type { ReactNode } from 'react'
import { MessageCircle, Shield } from 'lucide-react'
import {
  basicAttack,
  castSkill,
  currentJob,
  currentMap,
  game,
  interact,
  skillCooldown,
  triggerOpenWorldGuard,
} from '@/lib/game/engine'
import { useGame } from '@/lib/game/use-game'
import { getSkillIconPath } from '@/lib/game/vfx-specs'
import { cn } from '@/lib/utils'

function HoldButton({
  onDown,
  onUp,
  className,
  label,
  children,
}: {
  onDown: () => void
  onUp?: () => void
  className?: string
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.stopPropagation()
        e.preventDefault()
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
        onDown()
      }}
      onPointerUp={(e) => {
        e.stopPropagation()
        onUp?.()
      }}
      onPointerCancel={(e) => {
        e.stopPropagation()
        onUp?.()
      }}
      onLostPointerCapture={(e) => {
        e.stopPropagation()
        onUp?.()
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={cn('pixel-btn flex touch-none items-center justify-center text-foreground', className)}
    >
      {children}
    </button>
  )
}

export function TouchControls() {
  const g = useGame()
  const job = currentJob()
  const nearNpc = !g.panel ? g.nearNpc : null
  const inSafeZone = currentMap().safe

  const setKey = (key: string, active: boolean) => {
    if (active) game.keys.add(key)
    else game.keys.delete(key)
  }

  return (
    <div data-testid="touch-controls" className="pointer-events-none absolute inset-0 z-10 touch-none">
      <div className="pointer-events-auto absolute inset-x-0 bottom-1.5 flex items-end justify-between gap-2 px-1.5 pb-[env(safe-area-inset-bottom)] lg:bottom-2 lg:px-2">
        <div className="grid grid-cols-3 grid-rows-3 gap-0.5 rounded-xl border-2 border-[#c9963b]/65 bg-[#1b1414]/85 p-1 shadow-xl lg:gap-1 lg:rounded-2xl lg:p-1.5">
          <span />
          <HoldButton label="เดินขึ้น" onDown={() => setKey('arrowup', true)} onUp={() => setKey('arrowup', false)} className="size-9 rounded-lg bg-[#382721]/95 text-sm font-bold text-amber-100 lg:size-11 lg:rounded-xl lg:text-base">▲</HoldButton>
          <span />
          <HoldButton label="เดินซ้าย" onDown={() => setKey('arrowleft', true)} onUp={() => setKey('arrowleft', false)} className="size-9 rounded-lg bg-[#382721]/95 text-sm font-bold text-amber-100 lg:size-11 lg:rounded-xl lg:text-base">◀</HoldButton>
          <span className="grid size-9 place-items-center rounded-full border border-[#c9963b]/40 bg-amber-500/20 text-[9px] font-bold text-amber-200 lg:size-11 lg:text-[10px]">เดิน</span>
          <HoldButton label="เดินขวา" onDown={() => setKey('arrowright', true)} onUp={() => setKey('arrowright', false)} className="size-9 rounded-lg bg-[#382721]/95 text-sm font-bold text-amber-100 lg:size-11 lg:rounded-xl lg:text-base">▶</HoldButton>
          <span />
          <HoldButton label="เดินลง" onDown={() => setKey('arrowdown', true)} onUp={() => setKey('arrowdown', false)} className="size-9 rounded-lg bg-[#382721]/95 text-sm font-bold text-amber-100 lg:size-11 lg:rounded-xl lg:text-base">▼</HoldButton>
          <span />
        </div>

        <div className="flex flex-col items-end gap-1 lg:gap-1.5">
          {nearNpc && !inSafeZone && (
            <HoldButton
              label={`คุยกับ ${nearNpc.name}`}
              onDown={() => interact()}
              className="h-8 gap-1.5 rounded-full border-2 border-emerald-300/80 bg-emerald-900/95 px-3 text-[10.5px] font-bold text-emerald-100 shadow-lg"
            >
              <MessageCircle className="size-3.5" aria-hidden />
              <span>คุยกับ {nearNpc.name}</span>
            </HoldButton>
          )}
          <div className="flex max-w-[13.5rem] flex-wrap items-center justify-end gap-1 sm:max-w-none lg:gap-1.5">
            <HoldButton
              label="ป้องกัน (การ์ด)"
              onDown={() => triggerOpenWorldGuard()}
              className={cn(
                'size-8 rounded-lg border-2 border-sky-300/50 bg-[#1c2b42]/90 text-sky-200 shadow-md sm:size-9 lg:size-11 lg:rounded-xl',
                game.guardCd > 0 && 'opacity-50',
              )}
            >
              <Shield className="size-3.5 sm:size-4" aria-hidden />
            </HoldButton>
            {job.skills.map((sk, i) => (
              <HoldButton
                key={sk.id}
                label={sk.name}
                onDown={() => castSkill(i)}
                className={cn(
                  'relative size-8 overflow-hidden rounded-lg border-2 border-[#d4a348] bg-[#241a18]/95 p-0.5 text-[8px] leading-tight shadow-lg sm:size-9 lg:size-11 lg:rounded-xl lg:p-1 lg:text-[9px]',
                  g.p && g.p.mp < sk.mp && 'opacity-50',
                )}
              >
                {getSkillIconPath(sk.id) ? (
                  <img src={getSkillIconPath(sk.id)} alt="" className="size-full rounded-md object-cover" />
                ) : (
                  <span style={{ color: sk.color }}>{sk.name}</span>
                )}
                <span className="sr-only">{sk.name}</span>
                {skillCooldown(sk) > 0 && (
                  <span
                    className="absolute inset-x-0 bottom-0 bg-black/65"
                    style={{ height: `${(skillCooldown(sk) / sk.cooldown) * 100}%` }}
                    aria-hidden
                  />
                )}
              </HoldButton>
            ))}
          </div>
          <HoldButton
            label={nearNpc ? `คุยกับ ${nearNpc.name}` : 'โจมตี'}
            onDown={() => {
              if (nearNpc && inSafeZone) {
                interact()
                return
              }
              game.attackHeld = true
              if (!interact()) basicAttack()
            }}
            onUp={() => {
              game.attackHeld = false
            }}
            className={cn(
              'h-10 min-w-[5.75rem] gap-1.5 rounded-xl border-2 px-2.5 text-[11px] font-extrabold shadow-lg lg:h-12 lg:min-w-[7rem] lg:rounded-2xl lg:px-3 lg:text-xs',
              nearNpc && inSafeZone
                ? 'border-emerald-200/85 bg-gradient-to-b from-emerald-400 to-emerald-600 text-[#052e16]'
                : 'border-amber-200/80 bg-gradient-to-b from-amber-400 to-amber-600 text-[#241409]',
            )}
          >
            {nearNpc && inSafeZone ? (
              <>
                <MessageCircle className="size-3.5 shrink-0" aria-hidden />
                <span className="max-w-[9rem] truncate">คุย: {nearNpc.name}</span>
              </>
            ) : (
              'โจมตี / คุย'
            )}
          </HoldButton>
        </div>
      </div>
    </div>
  )
}
