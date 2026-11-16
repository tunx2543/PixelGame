'use client'

import { useGame } from '@/lib/game/use-game'
import { getStats } from '@/lib/game/engine'
import { buildVitalsSnapshot } from '@/lib/game/hud-vitals'
import { computeCombatPower } from '@/lib/game/rpg-systems'
import { formatNum } from './format'

const BAR_STYLES = {
  hp: {
    fill: 'bg-gradient-to-b from-[#ff6b72] via-[#ef4444] to-[#b91c1c]',
    text: 'text-[#ffb3b8]',
  },
  mp: {
    fill: 'bg-gradient-to-b from-[#6bb6ff] via-[#3b82f6] to-[#1d4ed8]',
    text: 'text-[#9ecaff]',
  },
  exp: {
    fill: 'bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#b45309]',
    text: 'text-[#fde68a]',
  },
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
    <div className="flex items-center gap-1.5 text-[9px]">
      <span className={`w-6 shrink-0 font-bold tracking-wide ${tone.text}`}>{label}</span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={current}
        className="relative h-2.5 flex-1 overflow-hidden rounded-full border border-[#3d281f] bg-[#160f10]/90 shadow-inner"
      >
        <div
          className={`h-full rounded-full ${tone.fill} transition-[width] duration-150`}
          style={{ width: `${percent}%` }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-1 top-0.5 h-[2px] rounded-full bg-white/30"
        />
      </div>
      <span className="w-[4.1rem] shrink-0 text-right font-mono text-[9px] text-amber-100/80 tabular-nums">
        {formatNum(current)}/{formatNum(max)}
      </span>
    </div>
  )
}

export function Hud({ compact = false }: { compact?: boolean }) {
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
  const cp = computeCombatPower(p, s)
  const bars = compact ? vitals.bars.filter((b) => b.key !== 'exp') : vitals.bars

  return (
    <section
      aria-label="แถบสถานะพลังชีวิตและทรัพยากร"
      data-testid="vitals-hud"
      className="pointer-events-auto pixel-panel w-full px-2 py-1.5 shadow-lg"
    >
      <div className="flex flex-col gap-1">
        {bars.map((bar) => (
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

      {!compact && (
        <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-[#c9963b]/30 pt-1 text-[10px] font-semibold">
          <span className="flex items-center gap-1 text-gold tabular-nums">
            <img src="/assets/hd/ui/coin_gold.png" alt="" width={14} height={14} className="size-3.5 shrink-0 object-contain" />
            <span>{formatNum(vitals.gold)} G</span>
          </span>
          <span className="font-mono text-[9px] text-amber-100/75 tabular-nums">
            CP {formatNum(cp)}
          </span>
          <span className="flex items-center gap-1 text-cyan-200 tabular-nums">
            <img src="/assets/hd/ui/gem_blue.png" alt="" width={14} height={14} className="size-3.5 shrink-0 object-contain" />
            <span>{formatNum(vitals.diamonds)} D</span>
          </span>
        </div>
      )}
    </section>
  )
}
