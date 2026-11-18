'use client'

import { useGame } from '@/lib/game/use-game'
import { getStats } from '@/lib/game/engine'
import { buildVitalsSnapshot } from '@/lib/game/hud-vitals'
import { computeCombatPower } from '@/lib/game/rpg-systems'
import { formatCompactNum, formatNum } from './format'

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
  slim = false,
}: {
  barKey: 'hp' | 'mp' | 'exp'
  label: string
  current: number
  max: number
  percent: number
  slim?: boolean
}) {
  const tone = BAR_STYLES[barKey]

  return (
    <div
      title={`${label}: ${formatNum(current)} / ${formatNum(max)}`}
      className={`flex items-center gap-1 ${slim ? 'text-[8.5px]' : 'text-[9px]'}`}
    >
      <span className={`w-5 shrink-0 font-bold tracking-wide ${tone.text}`}>{label}</span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={current}
        className={`relative flex-1 overflow-hidden rounded-full border border-[#3d281f] bg-[#160f10]/90 shadow-inner ${slim ? 'h-2' : 'h-2.5'}`}
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
      <span
        className={`shrink-0 whitespace-nowrap text-right font-mono text-amber-100/85 tabular-nums ${
          slim ? 'min-w-[3.8rem] text-[8.5px]' : 'min-w-[4.6rem] text-[9px]'
        }`}
      >
        {formatCompactNum(current)}/{formatCompactNum(max)}
      </span>
    </div>
  )
}

export function Hud({ compact = false, slim = false }: { compact?: boolean; slim?: boolean }) {
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
      className={`pointer-events-auto pixel-panel w-full shadow-lg ${slim ? 'px-1.5 py-1' : 'px-2 py-1.5'}`}
    >
      <div className={`flex flex-col ${slim ? 'gap-0.5' : 'gap-1'}`}>
        {bars.map((bar) => (
          <VitalBar
            key={bar.key}
            barKey={bar.key}
            label={bar.label}
            current={bar.current}
            max={bar.max}
            percent={bar.percent}
            slim={slim}
          />
        ))}
      </div>

      {!compact && (
        <div
          className={`flex items-center justify-between gap-1.5 border-t border-[#c9963b]/30 font-semibold ${
            slim ? 'mt-1 pt-0.5 text-[9px]' : 'mt-1.5 pt-1 text-[10px]'
          }`}
        >
          <span
            title={`Gold: ${formatNum(vitals.gold)} G`}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap text-gold tabular-nums"
          >
            <img src="/assets/hd/ui/coin_gold.png" alt="" width={14} height={14} className="size-3.5 shrink-0 object-contain" />
            <span>{formatCompactNum(vitals.gold)} G</span>
          </span>
          <span
            title={`พลังรบรวม (Combat Power): ${formatNum(cp)}`}
            className="shrink-0 whitespace-nowrap font-mono text-[9px] text-amber-100/80 tabular-nums"
          >
            CP {formatCompactNum(cp)}
          </span>
          <span
            title={`เพชร (Diamonds): ${formatNum(vitals.diamonds)} D`}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap text-cyan-200 tabular-nums"
          >
            <img src="/assets/hd/ui/gem_blue.png" alt="" width={14} height={14} className="size-3.5 shrink-0 object-contain" />
            <span>{formatCompactNum(vitals.diamonds)} D</span>
          </span>
        </div>
      )}
    </section>
  )
}
