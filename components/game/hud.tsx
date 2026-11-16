'use client'

import { Coins, Gem } from 'lucide-react'
import { useGame } from '@/lib/game/use-game'
import { getStats } from '@/lib/game/engine'
import { buildVitalsSnapshot } from '@/lib/game/hud-vitals'
import { formatNum } from './format'

const BAR_STYLES = {
  hp: { color: 'bg-hp', text: 'text-[#ff9aa2]' },
  mp: { color: 'bg-mp', text: 'text-[#8bb8ff]' },
  exp: { color: 'bg-exp', text: 'text-[#e0b3ff]' },
} as const

function VitalBar({
  barKey,
  label,
  current,
  max,
  percent,
}: {
  barKey: 'hp' | 'mp' | 'exp'
  label: string
  current: number
  max: number
  percent: number
}) {
  const tone = BAR_STYLES[barKey]

  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className={`w-7 shrink-0 font-bold tracking-wide ${tone.text}`}>{label}</span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={current}
        className="h-2.5 flex-1 overflow-hidden border border-[#0e0f1a] bg-muted/70"
      >
        <div
          className={`h-full ${tone.color} transition-[width] duration-150`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-[4.5rem] shrink-0 text-right font-mono text-[10px] text-muted-foreground tabular-nums">
        {formatNum(current)}/{formatNum(max)}
      </span>
    </div>
  )
}

export function Hud() {
  const { p } = useGame()
  if (!p) return null

  const s = getStats(p)
  const vitals = buildVitalsSnapshot({
    hp: p.hp,
    maxHp: s.maxHp,
    mp: p.mp,
    maxMp: s.maxMp,
    level: p.level,
    exp: p.exp,
    gold: p.gold,
    diamonds: p.diamonds,
  })

  return (
    <section
      aria-label="แถบสถานะพลังชีวิตและทรัพยากร"
      data-testid="vitals-hud"
      className="pointer-events-auto pixel-panel w-full p-2 shadow-lg"
    >
      <div className="flex flex-col gap-1">
        {vitals.bars.map((bar) => (
          <VitalBar
            key={bar.key}
            barKey={bar.key}
            label={bar.label}
            current={bar.current}
            max={bar.max}
            percent={bar.percent}
          />
        ))}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-border/60 pt-1 text-[11px] font-semibold">
        <span className="flex items-center gap-1 text-gold tabular-nums">
          <Coins className="size-3 shrink-0" aria-hidden />
          <span>{formatNum(vitals.gold)} G</span>
        </span>
        <span className="flex items-center gap-1 text-cyan-200 tabular-nums">
          <Gem className="size-3 shrink-0" aria-hidden />
          <span>{formatNum(vitals.diamonds)} D</span>
        </span>
      </div>
    </section>
  )
}
