'use client'

import { useEffect, useRef, useState } from 'react'
import { Crown, Hammer, LogOut, Store, Warehouse, Weight } from 'lucide-react'
import { MotionConfig, motion } from 'motion/react'
import {
  currentJob,
  getActiveAccountGameUid,
  getInventoryWeightSummary,
  getStats,
  isCurrentAccountGm,
  openPanel,
  quitToTitle,
  resolvePlayerFashionLoadout,
  type PanelId,
} from '@/lib/game/engine'
import { getNameColorPresentation, sanitizeExtV2 } from '@/lib/game/extended-systems'
import { cn } from '@/lib/utils'
import { PERMANENT_GM_GAME_UID } from '@/lib/game/permissions'
import { computeProfileProgressBars } from '@/lib/game/hud-vitals'
import { formatVipRemaining, getEffectiveVipBonuses } from '@/lib/game/premium/vip'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from './format'
import { GameArtIcon } from './game-badge-icon'
import { SpriteModelCanvas } from './sprite-model-canvas'

export function CharacterBar({ compact = false }: { compact?: boolean; layout?: 'desktop' | 'mobile' }) {
  const { p } = useGame()
  const [vipMenuOpen, setVipMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!vipMenuOpen) return
    const handleOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setVipMenuOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setVipMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', handleOutside)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('pointerdown', handleOutside)
      window.removeEventListener('keydown', handleKey)
    }
  }, [vipMenuOpen])

  const [hpPulse, setHpPulse] = useState<'damage' | 'heal' | 'idle'>('idle')
  const [mpPulse, setMpPulse] = useState<'spend' | 'regen' | 'idle'>('idle')
  const [xpGainSeq, setXpGainSeq] = useState(0)
  const [jpGainSeq, setJpGainSeq] = useState(0)

  const prevHpRef = useRef<number | null>(null)
  const prevMpRef = useRef<number | null>(null)
  const prevExpRef = useRef<{ level: number; exp: number } | null>(null)
  const prevJpRef = useRef<{ jobLevel: number; jobExp: number } | null>(null)

  const curHp = p?.hp ?? 0
  const curMp = p?.mp ?? 0
  const curLevel = p?.level ?? 1
  const curExp = p?.exp ?? 0
  const curJobLevel = p?.jobLevel ?? 1
  const curJobExp = p?.jobExp ?? 0

  useEffect(() => {
    if (!p) {
      prevHpRef.current = null
      return
    }
    const prev = prevHpRef.current
    prevHpRef.current = curHp
    if (prev === null || prev === curHp) return
    setHpPulse(curHp < prev ? 'damage' : 'heal')
    const id = window.setTimeout(() => setHpPulse('idle'), 280)
    return () => window.clearTimeout(id)
  }, [Boolean(p), curHp])

  useEffect(() => {
    if (!p) {
      prevMpRef.current = null
      return
    }
    const prev = prevMpRef.current
    prevMpRef.current = curMp
    if (prev === null || prev === curMp) return
    setMpPulse(curMp < prev ? 'spend' : 'regen')
    const id = window.setTimeout(() => setMpPulse('idle'), 260)
    return () => window.clearTimeout(id)
  }, [Boolean(p), curMp])

  useEffect(() => {
    if (!p) {
      prevExpRef.current = null
      return
    }
    const prev = prevExpRef.current
    prevExpRef.current = { level: curLevel, exp: curExp }
    if (!prev) return
    if (curLevel > prev.level || curExp > prev.exp) {
      setXpGainSeq((seq) => seq + 1)
    }
  }, [Boolean(p), curLevel, curExp])

  useEffect(() => {
    if (!p) {
      prevJpRef.current = null
      return
    }
    const prev = prevJpRef.current
    prevJpRef.current = { jobLevel: curJobLevel, jobExp: curJobExp }
    if (!prev) return
    if (curJobLevel > prev.jobLevel || curJobExp > prev.jobExp) {
      setJpGainSeq((seq) => seq + 1)
    }
  }, [Boolean(p), curJobLevel, curJobExp])

  if (!p) return null

  const job = currentJob()
  const s = getStats(p)
  const weightSummary = getInventoryWeightSummary(p)
  const isGmDev = Boolean(p.gm && isCurrentAccountGm())
  const displayGameUid = isGmDev ? PERMANENT_GM_GAME_UID : (p.gameUid ?? getActiveAccountGameUid())
  const vipBonus = getEffectiveVipBonuses(p.premium?.vip)
  const hpPct = Math.max(0, Math.min(100, (p.hp / Math.max(1, s.maxHp)) * 100))
  const mpPct = Math.max(0, Math.min(100, (p.mp / Math.max(1, s.maxMp)) * 100))
  const isLowHp = hpPct > 0 && hpPct <= 25
  const expBars = computeProfileProgressBars({
    level: p.level,
    exp: p.exp,
    jobLevel: p.jobLevel,
    jobExp: p.jobExp,
  })
  const jobLevel = expBars.jobLevel
  const spiritStage = s.spiritStage ?? 0

  const openRemote = (panel: PanelId) => {
    openPanel(panel)
    setVipMenuOpen(false)
  }

  return (
    <MotionConfig reducedMotion="user">
    <div
      ref={containerRef}
      data-testid="character-bar"
      className="pointer-events-auto relative flex w-full items-start gap-1.5 select-none"
    >
      {/* Left: Circular Portrait + Lv / JLv + Weight % */}
      <div className="flex shrink-0 flex-col items-center">
        <button
          type="button"
          onClick={() => openPanel('character')}
          title={`${p.name} · ${job.name} (#${displayGameUid ?? 'Guest'}) — เปิดหน้าต่างตัวละคร`}
          className="relative grid size-11 place-items-center overflow-hidden rounded-full border-2 border-[#8ec5ff] bg-gradient-to-b from-[#29436b] to-[#0e1726] shadow-[0_3px_10px_rgba(0,0,0,0.65)] transition-transform hover:scale-105 sm:size-12"
        >
          <SpriteModelCanvas
            mode="job"
            id={p.jobId}
            action="idle"
            dir="down"
            size={38}
            variant="portrait"
            fashion={resolvePlayerFashionLoadout(p)}
            isGm={isGmDev}
            showShadow={false}
            showAura={false}
            label={`ภาพโปรไฟล์ ${p.name}`}
          />
        </button>
        <div className="relative z-10 -mt-1.5 flex items-center gap-1 rounded border border-[#2c4a75]/90 bg-[#0a101b]/95 px-1.5 py-0.5 font-mono text-[9.5px] font-extrabold leading-none shadow tabular-nums">
          <span className="text-amber-300" title="เลเวลตัวละคร">
            {p.level}
          </span>
          <span className="text-orange-400" title="เลเวลอาชีพ (JLv)">
            {jobLevel}
          </span>
        </div>
        {!compact && (
          <button
            type="button"
            onClick={() => openPanel('inventory')}
            title={`น้ำหนักสัมภาระ: ${weightSummary.usedWeight.toFixed(1)} / ${weightSummary.maxWeight.toFixed(1)}`}
            className="mt-0.5 flex items-center gap-0.5 rounded bg-[#0a101b]/80 px-1 py-px text-[9px] font-bold text-slate-200 hover:text-amber-200 tabular-nums"
          >
            <Weight className="size-2.5 text-slate-300" aria-hidden />
            <span>{Math.round(weightSummary.pct)} %</span>
          </button>
        )}
      </div>

      {/* Right: Name + HP Bar + MP Bar + XP/JP Bars */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <div className="flex items-center justify-between gap-1">
          <div className="flex min-w-0 items-center gap-1 text-[11px] font-bold text-white [text-shadow:0_1px_3px_#000] sm:text-xs">
            <GameArtIcon iconId="class-star" size={16} />
            {spiritStage > 0 && (
              <span
                title={`จุจิตขั้น ${spiritStage}`}
                className="shrink-0 rounded border border-cyan-300/75 bg-cyan-950/90 px-1 py-0 font-mono text-[8px] font-extrabold text-cyan-200 tabular-nums"
              >
                จิต{spiritStage}
              </span>
            )}
            {isGmDev && <span className="shrink-0 text-gold">[GM]</span>}
            {vipBonus.active && vipBonus.tierDef && (
              <button
                type="button"
                data-testid="vip-remote-trigger"
                aria-expanded={vipMenuOpen}
                aria-haspopup="menu"
                onClick={() => setVipMenuOpen((prev) => !prev)}
                title="คลิกเพื่อเปิดบริการ VIP ระยะไกล (ร้านค้า / ตีบวก / คลัง)"
                className="inline-flex shrink-0 cursor-pointer items-center gap-0.5 rounded px-1 py-0 text-[8px] font-extrabold leading-tight transition-transform hover:scale-105"
                style={{
                  color: vipBonus.tierDef.badgeColor,
                  backgroundColor: vipBonus.tierDef.badgeBg,
                  border: `1px solid ${vipBonus.tierDef.badgeBorder}`,
                }}
              >
                <Crown className="size-2.5" aria-hidden />
                {vipBonus.tierDef.badgeLabel}
              </button>
            )}
            {(() => {
              const namePres = getNameColorPresentation(sanitizeExtV2(p.extV2).nameColor, 'subtle')
              return (
                <span
                  data-testid="character-bar-name"
                  className={cn('min-w-0 truncate px-0.5 leading-snug', namePres.className)}
                  style={namePres.style}
                >
                  {p.name}
                </span>
              )
            })()}
          </div>

          {!compact && (
            <button
              type="button"
              onClick={() => quitToTitle()}
              title="กลับหน้าเลือกตัวละคร"
              aria-label="สลับตัวละคร"
              className="grid size-5 shrink-0 place-items-center rounded border border-[#3a639a]/60 bg-[#0d1726]/85 text-slate-300 hover:border-amber-300 hover:text-white"
            >
              <LogOut className="size-2.5" aria-hidden />
            </button>
          )}
        </div>

        {/* Emerald HP Bar */}
        <motion.div
          role="progressbar"
          data-testid="profile-hp-bar"
          aria-label="HP"
          aria-valuemin={0}
          aria-valuemax={s.maxHp}
          aria-valuenow={p.hp}
          initial={{ opacity: 0, x: -8, scaleX: 0.95 }}
          animate={{
            opacity: 1,
            x: hpPulse === 'damage' ? [0, -2.5, 2.5, -1, 0] : 0,
            scaleX: 1,
            boxShadow:
              hpPulse === 'damage'
                ? '0 0 10px rgba(244, 63, 94, 0.55)'
                : hpPulse === 'heal'
                  ? '0 0 10px rgba(74, 222, 128, 0.5)'
                  : '0 0 0px rgba(0, 0, 0, 0)',
          }}
          whileHover={{
            scale: 1.02,
            y: -0.5,
            boxShadow: '0 0 10px rgba(34, 197, 94, 0.45)',
          }}
          transition={{
            opacity: { duration: 0.22, delay: 0.04, ease: [0.22, 1, 0.36, 1] },
            scaleX: { duration: 0.24, delay: 0.04, ease: [0.22, 1, 0.36, 1] },
            x: { duration: hpPulse === 'damage' ? 0.24 : 0.22, delay: hpPulse === 'damage' ? 0 : 0.04 },
            scale: { type: 'spring', stiffness: 420, damping: 28 },
            y: { type: 'spring', stiffness: 420, damping: 28 },
            boxShadow: { duration: 0.2 },
          }}
          style={{ transformOrigin: 'left center' }}
          className="group relative h-3.5 w-full overflow-hidden rounded-full border border-[#0b1912] bg-[#0a130e]/90 shadow-inner sm:h-4"
        >
          {/* Delayed damage trail */}
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-rose-300/65"
            animate={{ width: `${hpPct}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
          {/* Primary HP fill */}
          <motion.div
            className="relative h-full rounded-full bg-gradient-to-b from-[#7bf179] via-[#22c55e] to-[#15803d]"
            animate={{
              width: `${hpPct}%`,
              filter: hpPulse === 'heal' ? 'brightness(1.22)' : 'brightness(1)',
            }}
            transition={{
              width: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
              filter: { duration: 0.22 },
            }}
          />
          {/* Low HP subtle pulse */}
          {isLowHp && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-rose-400/80"
              animate={{ opacity: [0.2, 0.85, 0.2] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          {/* Hover sheen */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-500 group-hover:left-[120%] group-hover:opacity-100"
          />
          <span className="pointer-events-none absolute inset-x-1 top-0.5 h-[2px] rounded-full bg-white/30" />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[9.5px] font-extrabold text-white [text-shadow:0_1px_2px_#000] tabular-nums">
            {formatNum(p.hp)} / {formatNum(s.maxHp)}
          </span>
        </motion.div>

        {/* Azure MP Bar */}
        <motion.div
          role="progressbar"
          data-testid="profile-mp-bar"
          aria-label="MP"
          aria-valuemin={0}
          aria-valuemax={s.maxMp}
          aria-valuenow={p.mp}
          initial={{ opacity: 0, x: -8, scaleX: 0.95 }}
          animate={{
            opacity: 1,
            x: 0,
            scaleX: 1,
            boxShadow:
              mpPulse === 'regen'
                ? '0 0 9px rgba(56, 189, 248, 0.5)'
                : mpPulse === 'spend'
                  ? '0 0 8px rgba(14, 165, 233, 0.45)'
                  : '0 0 0px rgba(0, 0, 0, 0)',
          }}
          whileHover={{
            scale: 1.02,
            y: -0.5,
            boxShadow: '0 0 10px rgba(56, 189, 248, 0.45)',
          }}
          transition={{
            opacity: { duration: 0.22, delay: 0.09, ease: [0.22, 1, 0.36, 1] },
            scaleX: { duration: 0.24, delay: 0.09, ease: [0.22, 1, 0.36, 1] },
            x: { duration: 0.22, delay: 0.09, ease: [0.22, 1, 0.36, 1] },
            scale: { type: 'spring', stiffness: 420, damping: 28 },
            y: { type: 'spring', stiffness: 420, damping: 28 },
            boxShadow: { duration: 0.2 },
          }}
          style={{ transformOrigin: 'left center' }}
          className="group relative h-3.5 w-full overflow-hidden rounded-full border border-[#0a1629] bg-[#091220]/90 shadow-inner sm:h-4"
        >
          {/* Delayed mana drain trail */}
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-cyan-200/55"
            animate={{ width: `${mpPct}%` }}
            transition={{ duration: 0.42, ease: 'easeOut' }}
          />
          {/* Primary MP fill */}
          <motion.div
            className="relative h-full rounded-full bg-gradient-to-b from-[#67e8f9] via-[#0ea5e9] to-[#0369a1]"
            animate={{
              width: `${mpPct}%`,
              filter: mpPulse === 'regen' ? 'brightness(1.2)' : 'brightness(1)',
            }}
            transition={{
              width: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
              filter: { duration: 0.22 },
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-500 group-hover:left-[120%] group-hover:opacity-100"
          />
          <span className="pointer-events-none absolute inset-x-1 top-0.5 h-[2px] rounded-full bg-white/30" />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[9.5px] font-extrabold text-white [text-shadow:0_1px_2px_#000] tabular-nums">
            {formatNum(p.mp)} / {formatNum(s.maxMp)}
          </span>
        </motion.div>

        {/* Compact Inline XP & JP Mini Bars inside Profile */}
        <div data-testid="profile-exp-bars" className="grid grid-cols-2 gap-1 pt-0.5">
          <motion.button
            type="button"
            data-testid="profile-xp-bar"
            onClick={() => openPanel('character')}
            title={`ค่าประสบการณ์ตัวละคร: ${formatNum(expBars.exp)} / ${formatNum(expBars.maxExp)} (${expBars.xpPct.toFixed(2)}%)`}
            aria-label={`XP ${expBars.xpPct.toFixed(2)}%`}
            initial={{ opacity: 0, x: -6, scaleX: 0.94 }}
            animate={{ opacity: 1, x: 0, scaleX: 1 }}
            whileHover={{
              scale: 1.03,
              y: -0.5,
              boxShadow: '0 0 9px rgba(56, 189, 248, 0.45)',
            }}
            whileTap={{ scale: 0.98 }}
            transition={{
              opacity: { duration: 0.22, delay: 0.14, ease: [0.22, 1, 0.36, 1] },
              scaleX: { duration: 0.24, delay: 0.14, ease: [0.22, 1, 0.36, 1] },
              x: { duration: 0.22, delay: 0.14, ease: [0.22, 1, 0.36, 1] },
              scale: { type: 'spring', stiffness: 450, damping: 28 },
              y: { type: 'spring', stiffness: 450, damping: 28 },
            }}
            style={{ transformOrigin: 'left center' }}
            className="group relative h-3 w-full overflow-hidden rounded-full border border-[#1d3f73]/90 bg-[#08101c]/95 shadow-inner hover:brightness-110"
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#38bdf8]"
              animate={{ width: `${expBars.xpPct}%` }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            />
            {xpGainSeq > 0 && (
              <motion.span
                key={xpGainSeq}
                aria-hidden
                initial={{ x: '-100%', opacity: 0.9 }}
                animate={{ x: '220%', opacity: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-sky-200/75 to-transparent"
              />
            )}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-500 group-hover:left-[120%] group-hover:opacity-100"
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[7.5px] font-extrabold leading-none text-white [text-shadow:0_1px_1.5px_#000] tabular-nums sm:text-[8px]">
              XP {expBars.xpPct.toFixed(1)}%
            </span>
          </motion.button>

          <motion.button
            type="button"
            data-testid="profile-jp-bar"
            onClick={() => openPanel('job')}
            title={`ค่าประสบการณ์อาชีพ: ${formatNum(expBars.jobExp)} / ${formatNum(expBars.maxJp)} (${expBars.jpPct.toFixed(2)}%)`}
            aria-label={`JP ${expBars.jpPct.toFixed(2)}%`}
            initial={{ opacity: 0, x: -6, scaleX: 0.94 }}
            animate={{ opacity: 1, x: 0, scaleX: 1 }}
            whileHover={{
              scale: 1.03,
              y: -0.5,
              boxShadow: '0 0 9px rgba(251, 191, 36, 0.45)',
            }}
            whileTap={{ scale: 0.98 }}
            transition={{
              opacity: { duration: 0.22, delay: 0.18, ease: [0.22, 1, 0.36, 1] },
              scaleX: { duration: 0.24, delay: 0.18, ease: [0.22, 1, 0.36, 1] },
              x: { duration: 0.22, delay: 0.18, ease: [0.22, 1, 0.36, 1] },
              scale: { type: 'spring', stiffness: 450, damping: 28 },
              y: { type: 'spring', stiffness: 450, damping: 28 },
            }}
            style={{ transformOrigin: 'left center' }}
            className="group relative h-3 w-full overflow-hidden rounded-full border border-[#61380e]/90 bg-[#140d06]/95 shadow-inner hover:brightness-110"
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#b45309] via-[#d97706] to-[#fbbf24]"
              animate={{ width: `${expBars.jpPct}%` }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            />
            {jpGainSeq > 0 && (
              <motion.span
                key={jpGainSeq}
                aria-hidden
                initial={{ x: '-100%', opacity: 0.9 }}
                animate={{ x: '220%', opacity: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-amber-100/80 to-transparent"
              />
            )}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-500 group-hover:left-[120%] group-hover:opacity-100"
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[7.5px] font-extrabold leading-none text-white [text-shadow:0_1px_1.5px_#000] tabular-nums sm:text-[8px]">
              JP {expBars.jpPct.toFixed(1)}%
            </span>
          </motion.button>
        </div>
      </div>

      {/* VIP Remote Popover */}
      {vipMenuOpen && vipBonus.active && vipBonus.tierDef && (
        <div
          role="menu"
          data-testid="vip-remote-popover"
          className="asura-panel absolute left-0 top-full z-50 mt-1.5 w-[min(17rem,calc(100vw-1rem))] space-y-2 border-amber-400/60 p-2.5 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-amber-400/25 pb-1">
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-200">
              <Crown className="size-3 text-amber-300" aria-hidden />
              บริการ VIP ระยะไกล
            </span>
            <span className="text-[9px] text-muted-foreground">{formatVipRemaining(vipBonus.remainingMs)}</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => openRemote('shop')}
              className="flex flex-col items-center gap-1 rounded border border-amber-400/30 bg-amber-500/10 p-1.5 text-center text-[9.5px] font-semibold text-amber-100 transition-colors hover:border-amber-300 hover:bg-amber-500/20"
            >
              <Store className="size-4 text-amber-300" aria-hidden />
              <span>ร้านค้าระยะไกล</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openRemote('enhance')}
              className="flex flex-col items-center gap-1 rounded border border-cyan-400/30 bg-cyan-500/10 p-1.5 text-center text-[9.5px] font-semibold text-cyan-100 transition-colors hover:border-cyan-300 hover:bg-cyan-500/20"
            >
              <Hammer className="size-4 text-cyan-300" aria-hidden />
              <span>ตีบวกระยะไกล</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openRemote('storage')}
              className="flex flex-col items-center gap-1 rounded border border-emerald-400/30 bg-emerald-500/10 p-1.5 text-center text-[9.5px] font-semibold text-emerald-100 transition-colors hover:border-emerald-300 hover:bg-emerald-500/20"
            >
              <Warehouse className="size-4 text-emerald-300" aria-hidden />
              <span>คลังระยะไกล</span>
            </button>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => openRemote('gem-shop')}
            className="w-full rounded border border-border bg-secondary/70 py-1 text-center text-[10px] font-semibold text-muted-foreground hover:text-foreground"
          >
            ดูสิทธิ์ & จัดการ VIP ทั้งหมด
          </button>
        </div>
      )}
    </div>
    </MotionConfig>
  )
}
