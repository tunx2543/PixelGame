'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Droplets, Heart, RotateCcw, Shield, Sparkles, Swords } from 'lucide-react'
import { formatNum } from './format'

export interface CharacterStatusState {
  name: string
  jobName: string
  level: number
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  exp: number
  maxExp: number
}

const INITIAL_CHARACTER_STATE: CharacterStatusState = {
  name: 'นักผจญภัยฝึกหัด',
  jobName: 'นักรบพิกเซล',
  level: 12,
  hp: 240,
  maxHp: 320,
  mp: 95,
  maxMp: 140,
  exp: 680,
  maxExp: 1000,
}

interface FloatingParticle {
  id: number
  startX: number
  startY: number
  dx: number
  dy: number
  size: number
  color: string
}

interface ProgressBurst {
  id: number
  kind: 'exp' | 'levelup'
  label: string
  particles: FloatingParticle[]
}

const PARTICLE_COLORS_EXP = ['#c77dff', '#e0b3ff', '#4fc3a1', '#f3ecd9']
const PARTICLE_COLORS_LEVEL = ['#ffd60a', '#e8b64c', '#fff3b0', '#c77dff', '#4fc3a1']

function createParticles(burstId: number, isLevelUp: boolean): FloatingParticle[] {
  const count = isLevelUp ? 14 : 8
  const palette = isLevelUp ? PARTICLE_COLORS_LEVEL : PARTICLE_COLORS_EXP
  return Array.from({ length: count }, (_, idx) => {
    const spread = ((idx / Math.max(1, count - 1)) - 0.5) * (isLevelUp ? 170 : 120)
    const jitterX = ((idx * 37) % 18) - 9
    return {
      id: burstId * 100 + idx,
      startX: isLevelUp ? 72 + ((idx % 5) - 2) * 14 : 50 + ((idx % 4) - 1.5) * 18,
      startY: isLevelUp ? 22 : 66,
      dx: spread + jitterX,
      dy: isLevelUp ? -(34 + (idx % 4) * 14) : -(22 + (idx % 3) * 10),
      size: isLevelUp ? (idx % 2 === 0 ? 6 : 4) : 4,
      color: palette[idx % palette.length],
    }
  })
}

interface StatusBarProps {
  label: string
  icon: React.ReactNode
  value: number
  max: number
  barClassName: string
  textClassName: string
  flashKey?: number
  flashColorClass?: string
}

function StatusBar({
  label,
  icon,
  value,
  max,
  barClassName,
  textClassName,
  flashKey,
  flashColorClass = 'bg-white/55',
}: StatusBarProps) {
  const safeMax = Math.max(1, max)
  const clampedValue = Math.min(safeMax, Math.max(0, value))
  const percentage = Math.round((clampedValue / safeMax) * 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1.5 font-medium ${textClassName}`}>
          {icon}
          {label}
        </span>
        <span className="tabular-nums text-foreground/90">
          {formatNum(clampedValue)} / {formatNum(safeMax)}{' '}
          <span className="text-[11px] text-muted-foreground">({percentage}%)</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clampedValue}
        className="relative h-3 w-full overflow-hidden border-2 border-[#0e0f1a] bg-muted/80"
      >
        <div
          className={`h-full transition-[width] duration-300 ease-out ${barClassName}`}
          style={{ width: `${percentage}%` }}
        />
        <AnimatePresence>
          {flashKey ? (
            <motion.div
              key={flashKey}
              initial={{ opacity: 0.9, x: '-100%' }}
              animate={{ opacity: 0, x: '120%' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className={`pointer-events-none absolute inset-y-0 w-1/2 ${flashColorClass}`}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function CharacterStatus({
  initialState = INITIAL_CHARACTER_STATE,
  showSimulator = true,
}: {
  initialState?: CharacterStatusState
  showSimulator?: boolean
}) {
  const [status, setStatus] = useState<CharacterStatusState>(initialState)
  const [burst, setBurst] = useState<ProgressBurst | null>(null)
  const [expFlashId, setExpFlashId] = useState(0)

  const prevRef = useRef({ level: initialState.level, exp: initialState.exp })
  const burstSeqRef = useRef(0)
  const skipNextFxRef = useRef(false)

  useEffect(() => {
    const prev = prevRef.current
    if (skipNextFxRef.current) {
      skipNextFxRef.current = false
      prevRef.current = { level: status.level, exp: status.exp }
      return
    }

    if (prev.level === status.level && prev.exp === status.exp) return

    const leveledUp = status.level > prev.level
    const expDelta = status.exp - prev.exp
    prevRef.current = { level: status.level, exp: status.exp }

    const nextId = ++burstSeqRef.current
    setExpFlashId(nextId)
    setBurst({
      id: nextId,
      kind: leveledUp ? 'levelup' : 'exp',
      label: leveledUp
        ? `LEVEL UP! Lv.${status.level}`
        : expDelta > 0
          ? `+${formatNum(expDelta)} EXP`
          : `EXP ${formatNum(status.exp)}`,
      particles: createParticles(nextId, leveledUp),
    })

    const timer = window.setTimeout(() => {
      setBurst((current) => (current?.id === nextId ? null : current))
    }, 950)

    return () => window.clearTimeout(timer)
  }, [status.level, status.exp])

  const takeDamage = (amount = 35) => {
    setStatus((prev) => ({
      ...prev,
      hp: Math.max(0, prev.hp - amount),
    }))
  }

  const useMana = (amount = 20) => {
    setStatus((prev) => {
      if (prev.mp < amount) return prev
      return {
        ...prev,
        mp: prev.mp - amount,
      }
    })
  }

  const recoverAll = () => {
    setStatus((prev) => ({
      ...prev,
      hp: prev.maxHp,
      mp: prev.maxMp,
    }))
  }

  const gainExp = (amount = 180) => {
    setStatus((prev) => {
      let nextLevel = prev.level
      let nextExp = prev.exp + amount
      let nextMaxExp = prev.maxExp
      let nextMaxHp = prev.maxHp
      let nextMaxMp = prev.maxMp
      let nextHp = prev.hp
      let nextMp = prev.mp

      while (nextExp >= nextMaxExp) {
        nextExp -= nextMaxExp
        nextLevel += 1
        nextMaxExp = Math.round(nextMaxExp * 1.25)
        nextMaxHp += 30
        nextMaxMp += 15
        nextHp = nextMaxHp
        nextMp = nextMaxMp
      }

      return {
        ...prev,
        level: nextLevel,
        exp: nextExp,
        maxExp: nextMaxExp,
        maxHp: nextMaxHp,
        maxMp: nextMaxMp,
        hp: nextHp,
        mp: nextMp,
      }
    })
  }

  const resetState = () => {
    skipNextFxRef.current = true
    setBurst(null)
    setStatus(initialState)
  }

  return (
    <section
      aria-label="สถานะตัวละคร"
      className="pixel-panel relative w-full max-w-md overflow-visible p-4 text-foreground"
    >
      {/* Panel Flash Overlay on Level Up or EXP Gain */}
      <AnimatePresence>
        {burst && (
          <motion.div
            key={`flash-${burst.id}`}
            initial={{ opacity: burst.kind === 'levelup' ? 0.55 : 0.25 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: burst.kind === 'levelup' ? 0.75 : 0.45, ease: 'easeOut' }}
            className={`pointer-events-none absolute inset-0 z-20 border-2 ${
              burst.kind === 'levelup'
                ? 'border-[#ffd60a] bg-[radial-gradient(circle_at_top_right,rgba(255,214,10,0.45),rgba(199,125,255,0.16),transparent_70%)]'
                : 'border-[#c77dff] bg-[radial-gradient(circle_at_bottom,rgba(199,125,255,0.28),transparent_70%)]'
            }`}
          />
        )}
      </AnimatePresence>

      {/* Floating Particles & Callout */}
      <AnimatePresence>
        {burst && (
          <div
            key={`fx-${burst.id}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-30 overflow-visible"
          >
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.85 }}
              animate={{ opacity: [0, 1, 1, 0], y: -26, scale: burst.kind === 'levelup' ? 1.08 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className={`absolute right-3 -top-2 border-2 border-[#0e0f1a] px-2 py-0.5 text-xs font-bold shadow-[2px_2px_0_#0e0f1a] ${
                burst.kind === 'levelup'
                  ? 'bg-[#ffd60a] text-[#1a1423]'
                  : 'bg-[#c77dff] text-[#1a1423]'
              }`}
            >
              {burst.label}
            </motion.div>

            {burst.particles.map((pt) => (
              <motion.span
                key={pt.id}
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{ opacity: 0, x: pt.dx, y: pt.dy, scale: 0.35 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  right: `${pt.startX}px`,
                  top: `${pt.startY}%`,
                  width: `${pt.size}px`,
                  height: `${pt.size}px`,
                  backgroundColor: pt.color,
                  boxShadow: `0 0 6px ${pt.color}`,
                }}
                className="pixelated absolute block"
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Header: Name, Job & Level */}
      <div className="relative z-10 flex items-center justify-between gap-3 border-b-2 border-border/70 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-10 shrink-0 place-items-center border-2 border-[#0e0f1a] bg-secondary text-primary">
            <Shield className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-foreground">
              {status.name}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              อาชีพ: {status.jobName}
            </p>
          </div>
        </div>

        <motion.div
          key={`lv-${status.level}`}
          initial={{ scale: 1 }}
          animate={
            burst?.kind === 'levelup'
              ? { scale: [1, 1.24, 0.96, 1], boxShadow: ['0 0 0 rgba(255,214,10,0)', '0 0 18px rgba(255,214,10,0.85)', '0 0 0 rgba(255,214,10,0)'] }
              : { scale: 1 }
          }
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="shrink-0 border-2 border-[#0e0f1a] bg-primary/15 px-3 py-1 text-right"
        >
          <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
            Level
          </span>
          <span className="text-lg font-bold leading-none text-primary tabular-nums">
            Lv.{status.level}
          </span>
        </motion.div>
      </div>

      {/* Status Bars: HP, MP, EXP */}
      <div className="relative z-10 mt-4 space-y-3">
        <StatusBar
          label="เลือด (HP)"
          icon={<Heart className="size-3.5" aria-hidden />}
          value={status.hp}
          max={status.maxHp}
          barClassName="bg-hp"
          textClassName="text-[#ff7b7f]"
        />

        <StatusBar
          label="มานา (MP)"
          icon={<Droplets className="size-3.5" aria-hidden />}
          value={status.mp}
          max={status.maxMp}
          barClassName="bg-mp"
          textClassName="text-[#7fb0ff]"
        />

        <StatusBar
          label="ค่าประสบการณ์ (EXP)"
          icon={<Sparkles className="size-3.5" aria-hidden />}
          value={status.exp}
          max={status.maxExp}
          barClassName="bg-exp"
          textClassName="text-[#dca8ff]"
          flashKey={expFlashId}
          flashColorClass={burst?.kind === 'levelup' ? 'bg-[#ffd60a]/80' : 'bg-white/60'}
        />
      </div>

      {/* Simulated State Controls */}
      {showSimulator && (
        <div className="relative z-10 mt-4 border-t-2 border-border/70 pt-3">
          <p className="mb-2 text-[11px] text-muted-foreground">
            จำลองการเปลี่ยนแปลงสถานะ (Mock State)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => takeDamage(35)}
              disabled={status.hp <= 0}
              className="pixel-btn flex items-center justify-center gap-1.5 bg-destructive/20 px-2.5 py-1.5 text-[#ff8b8e] hover:bg-destructive/30 disabled:opacity-45"
            >
              <Swords className="size-3.5" aria-hidden />
              โดนโจมตี (-35 HP)
            </button>

            <button
              type="button"
              onClick={() => useMana(20)}
              disabled={status.mp < 20}
              className="pixel-btn flex items-center justify-center gap-1.5 bg-[#4c8bf5]/20 px-2.5 py-1.5 text-[#8cb8ff] hover:bg-[#4c8bf5]/30 disabled:opacity-45"
            >
              <Droplets className="size-3.5" aria-hidden />
              ใช้สกิล (-20 MP)
            </button>

            <button
              type="button"
              onClick={() => gainExp(180)}
              className="pixel-btn flex items-center justify-center gap-1.5 bg-[#c77dff]/20 px-2.5 py-1.5 text-[#e0b3ff] hover:bg-[#c77dff]/30"
            >
              <Sparkles className="size-3.5" aria-hidden />
              รับ EXP (+180)
            </button>

            <button
              type="button"
              onClick={recoverAll}
              className="pixel-btn flex items-center justify-center gap-1.5 bg-accent/20 px-2.5 py-1.5 text-accent hover:bg-accent/30"
            >
              <Heart className="size-3.5" aria-hidden />
              ฟื้นฟูเต็มหลอด
            </button>
          </div>

          <button
            type="button"
            onClick={resetState}
            className="pixel-btn mt-2 flex w-full items-center justify-center gap-1.5 bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            รีเซ็ตค่าเริ่มต้น
          </button>
        </div>
      )}
    </section>
  )
}
