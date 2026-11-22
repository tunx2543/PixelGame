'use client'

import type { CSSProperties, ReactNode } from 'react'
import { ITEMS } from '@/lib/game/data'
import { resolveItemVfxSpec, type ItemElement } from '@/lib/game/item-vfx'
import type { EquipmentRarity } from '@/lib/game/mmo-systems'
import { cn } from '@/lib/utils'

interface ItemVfxBoxProps {
  itemId: string
  rarity?: EquipmentRarity
  element?: ItemElement
  size?: 'xs' | 'sm' | 'md' | 'lg'
  selected?: boolean
  showVfx?: boolean
  className?: string
  children: ReactNode
}

const PARTICLE_OFFSETS = [
  { left: '16%', delay: '0s' },
  { left: '78%', delay: '0.45s' },
  { left: '46%', delay: '0.9s' },
  { left: '26%', delay: '1.35s' },
  { left: '66%', delay: '1.75s' },
  { left: '54%', delay: '0.25s' },
]

export function ItemVfxBox({
  itemId,
  rarity = 'common',
  element,
  size = 'md',
  selected = false,
  showVfx = true,
  className,
  children,
}: ItemVfxBoxProps) {
  const def = ITEMS[itemId]
  const effectiveRarity = rarity ?? def?.defaultRarity ?? 'common'
  const spec = resolveItemVfxSpec(effectiveRarity, {
    id: itemId,
    name: def?.name,
    element: element ?? def?.element,
    color: def?.color,
  })

  const hasEffect = (kind: (typeof spec.effects)[number]) => showVfx && spec.effects.includes(kind)
  const particleLimit = size === 'xs' ? Math.min(2, spec.particleCount) : size === 'sm' ? Math.min(3, spec.particleCount) : Math.min(6, spec.particleCount)

  return (
    <div
      data-rarity={effectiveRarity}
      data-element={spec.element}
      style={{
        background: spec.slotBgStyle,
        borderColor: selected ? '#facc15' : spec.borderColor,
        boxShadow:
          spec.intensity >= 3
            ? `inset 0 0 12px ${spec.glowColor}, 0 0 ${spec.intensity >= 5 ? 14 : 8}px ${spec.glowColor}`
            : spec.intensity >= 1
              ? `inset 0 0 8px ${spec.glowColor}`
              : undefined,
      } as CSSProperties}
      className={cn(
        'relative isolate flex items-center justify-center overflow-hidden rounded border-2 transition-colors',
        selected && 'ring-1 ring-amber-300',
        className,
      )}
    >
      {/* Layer 1: Breathing / Multi-layer Aura */}
      {hasEffect('glow') && (
        <span
          aria-hidden
          className="item-vfx-breathe pointer-events-none absolute inset-0 rounded"
          style={{
            background:
              effectiveRarity === 'mythic'
                ? `radial-gradient(circle at 50% 48%, ${spec.secondaryColor}48 0%, ${spec.primaryColor}40 42%, transparent 74%)`
                : `radial-gradient(circle at 50% 48%, ${spec.primaryColor}3d 0%, transparent 72%)`,
          }}
        />
      )}

      {/* Layer 2: Rotating Pixel Rune Circle (Epic & Mythic) */}
      {hasEffect('rotating_rune') && (
        <img
          src="/assets/effects/rune_circle.png"
          alt=""
          aria-hidden
          className={cn(
            'pixelated pointer-events-none absolute inset-[6%] size-[88%] object-contain opacity-55',
            effectiveRarity === 'mythic' ? 'item-vfx-rune-spin opacity-80' : 'item-vfx-rune-spin-rev',
          )}
          style={{
            filter: `drop-shadow(0 0 4px ${spec.primaryColor})`,
          }}
        />
      )}

      {/* Layer 3: Elemental Motif (Flame / Lightning / Ice / Shadow / Holy) */}
      {hasEffect('flame') && (
        <span
          aria-hidden
          className="item-vfx-breathe pointer-events-none absolute inset-x-[15%] bottom-0 h-[55%] rounded-t-full"
          style={{
            background: 'radial-gradient(ellipse at bottom, rgba(255,115,29,0.52), rgba(251,191,36,0.18) 55%, transparent 80%)',
          }}
        />
      )}
      {hasEffect('lightning') && (
        <span
          aria-hidden
          className="item-vfx-spark pointer-events-none absolute inset-[14%] rounded-full border border-dashed"
          style={{ borderColor: `${spec.primaryColor}88` }}
        />
      )}
      {hasEffect('ice') && (
        <span
          aria-hidden
          className="item-vfx-breathe pointer-events-none absolute inset-[10%] rounded border border-cyan-200/45"
        />
      )}
      {hasEffect('shadow') && (
        <span
          aria-hidden
          className="item-vfx-breathe pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 60%, rgba(168,85,247,0.45), rgba(15,5,25,0.4) 65%, transparent)',
          }}
        />
      )}
      {hasEffect('holy') && (
        <span
          aria-hidden
          className="item-vfx-breathe pointer-events-none absolute inset-[8%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(254,240,138,0.42), transparent 68%)',
          }}
        />
      )}

      {/* Layer 4: Animated Outer Border Glow (Legendary & Mythic) */}
      {hasEffect('animated_border') && (
        <span
          aria-hidden
          className="item-vfx-border-glow pointer-events-none absolute inset-0 rounded border-2"
          style={{
            borderColor: effectiveRarity === 'mythic' ? spec.secondaryColor : spec.primaryColor,
            boxShadow: `inset 0 0 6px ${spec.primaryColor}`,
          }}
        />
      )}

      {/* Layer 5: Actual Crisp Pixel-Art PNG */}
      <div className="relative z-10 flex items-center justify-center">{children}</div>

      {/* Layer 6: Rising Magic / Element Particles */}
      {hasEffect('aura') &&
        PARTICLE_OFFSETS.slice(0, particleLimit).map((pt, idx) => (
          <span
            key={idx}
            aria-hidden
            className="item-vfx-particle-up pointer-events-none absolute bottom-[18%] z-20 size-1 rounded-none"
            style={{
              left: pt.left,
              animationDelay: pt.delay,
              backgroundColor: idx % 2 === 0 ? spec.primaryColor : spec.secondaryColor,
              boxShadow: `0 0 4px ${spec.primaryColor}`,
            }}
          />
        ))}

      {/* Layer 7: Twinkling Sparks / Star Sparkles */}
      {hasEffect('spark') && (
        <>
          <span
            aria-hidden
            className="item-vfx-spark pointer-events-none absolute right-[14%] top-[14%] z-20 size-1.5"
            style={{
              backgroundColor: spec.secondaryColor,
              boxShadow: `0 0 4px ${spec.secondaryColor}`,
            }}
          />
          {spec.intensity >= 3 && (
            <span
              aria-hidden
              className="item-vfx-spark pointer-events-none absolute bottom-[16%] left-[15%] z-20 size-1"
              style={{
                animationDelay: '0.8s',
                backgroundColor: spec.primaryColor,
              }}
            />
          )}
        </>
      )}
      {hasEffect('star_sparkles') && (
        <img
          src="/assets/effects/spark_star.png"
          alt=""
          aria-hidden
          className="item-vfx-spark pixelated pointer-events-none absolute right-[8%] top-[8%] z-20 size-3.5 object-contain"
          style={{ filter: `drop-shadow(0 0 4px ${spec.secondaryColor})` }}
        />
      )}

      {/* Layer 8: Diagonal Shine Sweep (Rare, Legendary, Mythic) */}
      {hasEffect('shine_sweep') && (
        <span
          aria-hidden
          className="item-vfx-shine pointer-events-none absolute inset-y-0 left-0 z-20 w-[45%]"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.42), transparent)',
          }}
        />
      )}

      {/* Layer 9: Periodic Mini-Burst Ring (Legendary & Mythic) */}
      {hasEffect('periodic_burst') && (
        <span
          aria-hidden
          className="item-vfx-burst pointer-events-none absolute inset-[12%] z-20 rounded-full border"
          style={{
            borderColor: effectiveRarity === 'mythic' ? spec.secondaryColor : spec.primaryColor,
            animationDuration: `${Math.max(1.8, spec.burstIntervalMs / 1000)}s`,
          }}
        />
      )}
    </div>
  )
}
