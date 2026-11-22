'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Backpack, Flame, Hand, MessageCircle, Move, Shield, Sparkles, Swords, Wind } from 'lucide-react'
import {
  basicAttack,
  castSkill,
  currentJob,
  currentMap,
  game,
  interact,
  openPanel,
  pickupGroundDrop,
  skillCooldown,
  triggerDodgeDash,
  triggerOpenWorldGuard,
  triggerUltimateSkill,
} from '@/lib/game/engine'
import { computeJoystickVector } from '@/lib/game/touch-movement'
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
      className={cn('pixel-btn flex min-h-11 min-w-11 touch-none items-center justify-center text-foreground', className)}
    >
      {children}
    </button>
  )
}

function VirtualJoystick() {
  const padRef = useRef<HTMLDivElement>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const [knob, setKnob] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  })

  useEffect(() => {
    return () => {
      game.virtualMove.x = 0
      game.virtualMove.y = 0
    }
  }, [])

  const updateFromClient = (clientX: number, clientY: number) => {
    const pad = padRef.current
    if (!pad) return
    const rect = pad.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const vec = computeJoystickVector(clientX - cx, clientY - cy, 40, 6)
    game.virtualMove.x = vec.x
    game.virtualMove.y = vec.y
    setKnob({ x: vec.knobX, y: vec.knobY, active: vec.active })
  }

  const releaseStick = () => {
    activePointerIdRef.current = null
    game.virtualMove.x = 0
    game.virtualMove.y = 0
    setKnob({ x: 0, y: 0, active: false })
  }

  return (
    <div
      ref={padRef}
      role="application"
      aria-label="จอยสติ๊กควบคุมทิศทาง"
      data-testid="virtual-joystick"
      onPointerDown={(e) => {
        e.stopPropagation()
        e.preventDefault()
        activePointerIdRef.current = e.pointerId
        ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
        updateFromClient(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (activePointerIdRef.current !== e.pointerId) return
        e.stopPropagation()
        updateFromClient(e.clientX, e.clientY)
      }}
      onPointerUp={(e) => {
        if (activePointerIdRef.current !== e.pointerId) return
        e.stopPropagation()
        releaseStick()
      }}
      onPointerCancel={(e) => {
        if (activePointerIdRef.current !== e.pointerId) return
        e.stopPropagation()
        releaseStick()
      }}
      onLostPointerCapture={() => releaseStick()}
      onContextMenu={(e) => e.preventDefault()}
      className="relative flex size-[116px] touch-none select-none items-center justify-center rounded-full border-2 border-[#c9963b]/70 bg-[#141923]/80 shadow-2xl"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-amber-300/25"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute text-[9px] font-bold tracking-wider text-amber-200/45"
        style={{ top: 6 }}
      >
        N
      </span>
      <div
        aria-hidden
        style={{ transform: `translate3d(${knob.x}px, ${knob.y}px, 0)` }}
        className={cn(
          'pointer-events-none flex size-12 items-center justify-center rounded-full border-2 shadow-lg transition-colors',
          knob.active
            ? 'border-amber-200 bg-gradient-to-b from-amber-400 to-amber-600 text-[#241409]'
            : 'border-[#d4a348]/85 bg-[#2a2220]/95 text-amber-200',
        )}
      >
        <Move className="size-4" aria-hidden />
      </div>
    </div>
  )
}

export function TouchControls() {
  const g = useGame()
  const job = currentJob()
  const nearNpc = !g.panel ? g.nearNpc : null
  const inSafeZone = currentMap().safe

  const p = g.p
  const ownerId = p ? String(p.uid ?? p.name) : ''
  const nearbyDrop = p
    ? g.groundDrops.find(
        (d) => d.ownerId === ownerId && Math.hypot(d.x - p.x, d.y - p.y) <= 56,
      ) ?? null
    : null

  return (
    <div data-testid="touch-controls" className="pointer-events-none absolute inset-0 z-10 touch-none">
      <div className="pointer-events-auto absolute inset-x-0 bottom-1.5 flex items-end justify-between gap-2 px-2 pb-[env(safe-area-inset-bottom)] lg:bottom-2.5 lg:px-3">
        <VirtualJoystick />

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {nearbyDrop && (
              <HoldButton
                label="เก็บไอเทม"
                onDown={() => pickupGroundDrop()}
                className="h-11 gap-1.5 rounded-full border-2 border-amber-300/90 bg-amber-900/95 px-3.5 text-xs font-bold text-amber-100 shadow-lg"
              >
                <Hand className="size-4" aria-hidden />
                <span>เก็บของ</span>
              </HoldButton>
            )}
            {nearNpc && !inSafeZone && (
              <HoldButton
                label={`คุยกับ ${nearNpc.name}`}
                onDown={() => interact()}
                className="h-11 gap-1.5 rounded-full border-2 border-emerald-300/80 bg-emerald-900/95 px-3.5 text-xs font-bold text-emerald-100 shadow-lg"
              >
                <MessageCircle className="size-4" aria-hidden />
                <span>คุยกับ {nearNpc.name}</span>
              </HoldButton>
            )}
          </div>

          <div className="flex max-w-[15rem] flex-wrap items-center justify-end gap-1.5 sm:max-w-none">
            <HoldButton
              label="เปิดกระเป๋า"
              onDown={() => openPanel('inventory')}
              className="size-11 rounded-xl border-2 border-amber-300/60 bg-[#1e2636]/95 text-amber-200 shadow-md"
            >
              <Backpack className="size-4" aria-hidden />
            </HoldButton>
            <HoldButton
              label="แดชหลบ (X)"
              onDown={() => triggerDodgeDash()}
              className={cn(
                'size-11 rounded-xl border-2 border-cyan-300/60 bg-[#18293b]/95 text-cyan-200 shadow-md',
                game.dashCd > 0 && 'opacity-50',
              )}
            >
              <Wind className="size-4" aria-hidden />
            </HoldButton>
            <HoldButton
              label="ป้องกัน (การ์ด)"
              onDown={() => triggerOpenWorldGuard()}
              className={cn(
                'size-11 rounded-xl border-2 border-sky-300/60 bg-[#1c2b42]/95 text-sky-200 shadow-md',
                game.guardCd > 0 && 'opacity-50',
              )}
            >
              <Shield className="size-4" aria-hidden />
            </HoldButton>
            {job.skills.map((sk, i) => (
              <HoldButton
                key={sk.id}
                label={sk.name}
                onDown={() => castSkill(i)}
                className={cn(
                  'relative size-11 overflow-hidden rounded-xl border-2 border-[#d4a348] bg-[#241a18]/95 p-1 text-[9px] leading-tight shadow-lg',
                  g.p && g.p.mp < sk.mp && 'opacity-50',
                )}
              >
                {getSkillIconPath(sk.id) ? (
                  <img src={getSkillIconPath(sk.id)} alt="" className="size-full rounded-md object-cover" />
                ) : (
                  <Sparkles className="size-4" style={{ color: sk.color }} aria-hidden />
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
            <HoldButton
              label="สกิลไม้ตาย (U)"
              onDown={() => triggerUltimateSkill()}
              className="size-11 rounded-xl border-2 border-rose-400/80 bg-rose-950/95 text-rose-200 shadow-md"
            >
              <Flame className="size-4" aria-hidden />
            </HoldButton>
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
              'h-11 min-w-[6.75rem] gap-1.5 rounded-2xl border-2 px-3.5 text-xs font-extrabold shadow-lg',
              nearNpc && inSafeZone
                ? 'border-emerald-200/85 bg-gradient-to-b from-emerald-400 to-emerald-600 text-[#052e16]'
                : 'border-amber-200/80 bg-gradient-to-b from-amber-400 to-amber-600 text-[#241409]',
            )}
          >
            {nearNpc && inSafeZone ? (
              <>
                <MessageCircle className="size-4 shrink-0" aria-hidden />
                <span className="max-w-[9rem] truncate">คุย: {nearNpc.name}</span>
              </>
            ) : (
              <>
                <Swords className="size-4 shrink-0" aria-hidden />
                <span>โจมตี / คุย</span>
              </>
            )}
          </HoldButton>
        </div>
      </div>
    </div>
  )
}
