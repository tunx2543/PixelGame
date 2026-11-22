'use client'

import { motion } from 'motion/react'
import { MONSTERS } from '@/lib/game/data'
import { getTargetMonster } from '@/lib/game/engine'
import { ELEMENT_META, getMonsterElement } from '@/lib/game/rpg-systems'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from './format'
import { GameArtIcon } from './game-badge-icon'

export function TargetMonsterBar({ offsetTouch = false }: { offsetTouch?: boolean }) {
  const { p } = useGame()
  if (!p) return null

  const target = getTargetMonster()
  if (!target || target.dead) return null

  const def = MONSTERS[target.defId]
  if (!def) return null

  const maxHp = Math.max(1, target.maxHp || def.hp)
  const hp = Math.max(0, Math.min(maxHp, Math.round(target.hp)))
  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  const elem = getMonsterElement(target.defId)
  const elemMeta = ELEMENT_META[elem]
  const displayName = target.worldBossName || def.name
  const isBoss = Boolean(def.boss || target.worldBossName)

  return (
    <motion.div
      key={target.uid}
      data-testid="target-monster-bar"
      role="status"
      aria-label={`เป้าหมาย: ${displayName}`}
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={`pointer-events-none fixed left-1/2 z-20 w-[min(19rem,58vw)] -translate-x-1/2 select-none sm:w-[min(19rem,42vw)] ${
        offsetTouch ? 'bottom-[10.75rem] sm:bottom-11' : 'bottom-10'
      }`}
    >
      <div className="rounded-lg border border-[#d69f4c]/85 bg-[#0c1422]/94 px-2.5 py-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.68)]">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <GameArtIcon iconId="pk-swords" size={16} />
            <span className="shrink-0 rounded border border-amber-300/60 bg-amber-950/75 px-1.5 py-px font-mono text-[10px] font-extrabold text-amber-200 tabular-nums">
              LV.{def.level}
            </span>
            <span className="truncate text-[11px] font-extrabold text-white drop-shadow-[0_1px_2px_#000]">
              {displayName}
            </span>
            {isBoss && (
              <span className="shrink-0 rounded border border-rose-400/75 bg-rose-700/85 px-1 py-px text-[9px] font-extrabold text-white">
                BOSS
              </span>
            )}
          </div>

          <span
            className="shrink-0 rounded border px-1.5 py-px text-[9px] font-extrabold"
            style={{
              color: elemMeta.color,
              borderColor: `${elemMeta.color}66`,
              backgroundColor: elemMeta.bg,
            }}
          >
            {elemMeta.label}
          </span>
        </div>

        <div className="relative h-3.5 w-full overflow-hidden rounded-full border border-[#2a1216] bg-[#160b0e] shadow-inner">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-amber-200/55"
            animate={{ width: `${hpPct}%` }}
            transition={{ duration: 0.42, ease: 'easeOut' }}
          />
          <motion.div
            className="relative h-full rounded-full bg-gradient-to-r from-[#b91c1c] via-[#ef4444] to-[#f59e0b]"
            animate={{ width: `${hpPct}%` }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          />
          <span className="pointer-events-none absolute inset-x-1.5 top-0.5 h-[2px] rounded-full bg-white/25" />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[9.5px] font-extrabold text-white [text-shadow:0_1px_2px_#000] tabular-nums">
            {formatNum(hp)} / {formatNum(maxHp)} ({Math.ceil(hpPct)}%)
          </span>
        </div>
      </div>
    </motion.div>
  )
}
