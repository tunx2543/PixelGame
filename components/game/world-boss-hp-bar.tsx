'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'motion/react'
import { AlertTriangle, Crown, Flame, Swords, Zap } from 'lucide-react'
import { subscribeWorldBossState, type WorldBossRaidState } from '@/lib/firebase/rpg-online'
import { MONSTERS } from '@/lib/game/data'
import { openPanel } from '@/lib/game/engine'
import { ELEMENT_META, getActiveWorldBoss, getMonsterElement } from '@/lib/game/rpg-systems'
import { useGame } from '@/lib/game/use-game'
import {
  WORLD_BOSS_CRIT_SHAKE_MS,
  isWorldBossCritHitActive,
  resolveGlobalWorldBossHpBar,
} from '@/lib/game/world-boss-fx'
import { formatNum } from './format'

function formatCountdown(msRemaining: number): string {
  const totalSec = Math.max(0, Math.floor(msRemaining / 1000))
  const hours = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function WorldBossHpBar() {
  const g = useGame()
  const prefersReducedMotion = useReducedMotion()
  const shakeControls = useAnimationControls()
  const [raidState, setRaidState] = useState<WorldBossRaidState | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [damageFlash, setDamageFlash] = useState(false)
  const [critBurst, setCritBurst] = useState<{ id: number; isSoulCrit: boolean } | null>(null)
  const prevHpRef = useRef<{ key: string; hp: number } | null>(null)
  const lastCritIdRef = useRef<number>(0)

  const playerPresent = Boolean(g.p)
  const activeSpec = getActiveWorldBoss(nowMs)
  const liveMapBoss =
    g.monsters.find((m) => (m.isWorldBoss || m.defId === 'world_golem') && !m.dead) ?? null
  const defeatedOnCurrentMap = g.monsters.some(
    (m) => (m.isWorldBoss || m.defId === 'world_golem') && m.dead,
  )

  useEffect(() => {
    if (!playerPresent) return
    const unsub = subscribeWorldBossState((nextState) => {
      setRaidState(nextState)
    })
    return () => unsub()
  }, [playerPresent, activeSpec.cycleKey, activeSpec.isActive])

  useEffect(() => {
    if (!playerPresent) return
    if (!activeSpec.isActive && !liveMapBoss) return
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [playerPresent, activeSpec.isActive, liveMapBoss])

  const liveDef = liveMapBoss ? MONSTERS[liveMapBoss.defId] : undefined
  const view =
    g.p &&
    resolveGlobalWorldBossHpBar({
      liveMapBoss: liveMapBoss
        ? {
            uid: liveMapBoss.uid,
            name: liveMapBoss.worldBossName || liveDef?.name || activeSpec.name,
            level: liveDef?.level ?? activeSpec.level,
            element: getMonsterElement(liveMapBoss.defId),
            hp: liveMapBoss.hp,
            maxHp: Math.max(1, liveMapBoss.maxHp || liveDef?.hp || activeSpec.maxHp),
            isTestMode: activeSpec.isTestMode,
          }
        : null,
      activeEventSpec: activeSpec,
      globalRaid: raidState
        ? {
            cycleKey: raidState.cycleKey,
            name: raidState.name,
            hp: raidState.currentHp,
            maxHp: raidState.maxHp,
          }
        : null,
      currentMapId: g.p.mapId,
      defeatedOnCurrentMap,
    })

  useEffect(() => {
    if (!view) {
      prevHpRef.current = null
      setDamageFlash(false)
      return
    }
    const prev = prevHpRef.current
    prevHpRef.current = { key: view.key, hp: view.hp }
    if (prev && prev.key === view.key && view.hp < prev.hp) {
      setDamageFlash(true)
      const timer = window.setTimeout(() => setDamageFlash(false), 260)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [view?.key, view?.hp])

  useEffect(() => {
    const critHit = g.worldBossCritHit
    if (!critHit || critHit.id === lastCritIdRef.current) return
    lastCritIdRef.current = critHit.id
    if (!isWorldBossCritHitActive(critHit)) return

    setCritBurst({ id: critHit.id, isSoulCrit: critHit.isSoulCrit })
    if (!prefersReducedMotion) {
      shakeControls.stop()
      shakeControls.set({ x: 0, y: 0, rotate: 0, scale: 1 })
      void shakeControls.start(
        critHit.isSoulCrit
          ? {
              x: [0, -18, 17, -14, 12, -9, 6, -3, 0],
              y: [0, 7, -8, 6, -6, 4, -2, 0],
              rotate: [0, -3.2, 3.0, -2.4, 1.9, -1.0, 0],
              scale: [1, 1.075, 0.97, 1.04, 1],
              transition: { duration: WORLD_BOSS_CRIT_SHAKE_MS / 1000, ease: 'easeOut' },
            }
          : {
              x: [0, -14, 13, -11, 9, -6, 4, -2, 0],
              y: [0, 5, -6, 4, -5, 3, -1, 0],
              rotate: [0, -2.5, 2.2, -1.8, 1.4, -0.8, 0],
              scale: [1, 1.055, 0.98, 1.03, 1],
              transition: { duration: (WORLD_BOSS_CRIT_SHAKE_MS - 30) / 1000, ease: 'easeOut' },
            },
      )
    }

    const timer = window.setTimeout(() => {
      setCritBurst((prev) => (prev?.id === critHit.id ? null : prev))
    }, WORLD_BOSS_CRIT_SHAKE_MS)
    return () => window.clearTimeout(timer)
  }, [g.worldBossCritHit, prefersReducedMotion, shakeControls])

  const warningActive = Boolean(g.worldBossWarning && g.worldBossWarning.remainingSec > 0)
  const critActive = Boolean(critBurst)
  const isSoulCritBurst = Boolean(critBurst?.isSoulCrit)
  const elemMeta =
    view && view.element in ELEMENT_META
      ? ELEMENT_META[view.element as keyof typeof ELEMENT_META]
      : ELEMENT_META.earth
  const remainingLabel =
    view && view.endsAtMs > 0 ? formatCountdown(Math.max(0, view.endsAtMs - nowMs)) : null

  return (
    <AnimatePresence>
      {view && (
        <motion.div
          key={view.key}
          data-testid="global-world-boss-hp-bar"
          role="region"
          aria-label={`พลังชีวิตบอสโลก: ${view.bossName}`}
          initial={{ opacity: 0, y: -14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed left-1/2 top-[10.75rem] z-20 w-[min(23rem,calc(100vw-1.5rem))] -translate-x-1/2 select-none sm:top-2.5 sm:w-[min(24.5rem,calc(100vw-27rem))] xl:w-[min(28.5rem,36vw)]"
        >
          <motion.div
            data-testid="world-boss-hp-shake-container"
            data-crit-shaking={critActive ? 'true' : 'false'}
            animate={shakeControls}
            className="will-change-transform"
          >
            <button
              type="button"
              onClick={() => openPanel('guild')}
              title="เปิดหน้าต่างกิจกรรมเวิลด์บอส"
              className={`pointer-events-auto group block w-full rounded-xl border px-3 py-2 text-left backdrop-blur-md transition-colors duration-100 ${
                critActive
                  ? isSoulCritBurst
                    ? 'border-cyan-300 bg-[#0d1c2e]/95 shadow-[0_0_32px_rgba(34,211,238,0.68)]'
                    : 'border-yellow-300 bg-[#2a0c12]/95 shadow-[0_0_30px_rgba(250,204,21,0.68)]'
                  : warningActive
                    ? 'border-red-400/95 bg-[#1c090d]/92 shadow-[0_0_24px_rgba(239,68,68,0.42)]'
                    : damageFlash
                      ? 'border-amber-300 bg-[#1a0f12]/94 shadow-[0_0_22px_rgba(251,191,36,0.38)]'
                      : 'border-amber-400/70 bg-[#0b1120]/90 shadow-[0_10px_28px_rgba(0,0,0,0.68)] hover:border-amber-300'
              }`}
            >
            {/* Header Row */}
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="grid size-5 shrink-0 place-items-center rounded-md border border-amber-400/60 bg-gradient-to-br from-rose-600/80 to-amber-600/80 text-amber-100 shadow-sm">
                  <Crown className="size-3" aria-hidden />
                </span>
                <span className="shrink-0 rounded border border-rose-400/75 bg-rose-700/85 px-1.5 py-px text-[9px] font-extrabold tracking-wider text-white uppercase">
                  {view.isTestMode ? 'GM TEST' : 'WORLD BOSS'}
                </span>
                <span className="shrink-0 rounded border border-amber-300/60 bg-amber-950/80 px-1.5 py-px font-mono text-[9.5px] font-extrabold text-amber-200 tabular-nums">
                  LV.{view.level}
                </span>
                <span className="truncate text-[11.5px] font-extrabold text-white drop-shadow-[0_1px_2px_#000]">
                  {view.bossName}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {critActive && (
                  <span
                    data-testid="world-boss-hp-crit-badge"
                    className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-px text-[9px] font-black tracking-wide ${
                      isSoulCritBurst
                        ? 'border-cyan-200 bg-cyan-600/90 text-white'
                        : 'border-yellow-200 bg-amber-500/95 text-slate-950'
                    }`}
                  >
                    <Zap className="size-2.5" aria-hidden />
                    {isSoulCritBurst ? 'SOUL CRIT!' : 'CRITICAL!'}
                  </span>
                )}
                {warningActive && (
                  <span className="inline-flex animate-pulse items-center gap-0.5 rounded border border-red-400 bg-red-600/90 px-1.5 py-px text-[9px] font-extrabold text-white">
                    <AlertTriangle className="size-2.5" aria-hidden />
                    สกิลทั้งแมพ
                  </span>
                )}
                <span
                  className="rounded border px-1.5 py-px text-[9px] font-extrabold"
                  style={{
                    color: elemMeta.color,
                    borderColor: `${elemMeta.color}70`,
                    backgroundColor: elemMeta.bg,
                  }}
                >
                  {elemMeta.label}
                </span>
                {remainingLabel && (
                  <span className="hidden rounded border border-sky-400/45 bg-sky-950/75 px-1.5 py-px font-mono text-[9.5px] font-bold text-sky-200 tabular-nums sm:inline-block">
                    {remainingLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Smoothly Scaling Global HP Track (GPU transform scaleX) */}
            <div className="relative h-4 w-full overflow-hidden rounded-full border border-rose-950/90 bg-[#14070b] shadow-inner">
              {/* Delayed Amber/White Trail */}
              <motion.div
                data-testid="world-boss-hp-trail"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-300/70 via-amber-200/75 to-white/80 will-change-transform"
                style={{ transformOrigin: 'left' }}
                initial={{ scaleX: view.ratio }}
                animate={{ scaleX: view.ratio }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              />

              {/* Primary Boss HP Fill */}
              <motion.div
                data-testid="world-boss-hp-fill"
                className="relative h-full w-full rounded-full bg-gradient-to-r from-[#991b1b] via-[#ef4444] to-[#f97316] will-change-transform"
                style={{ transformOrigin: 'left' }}
                initial={{ scaleX: view.ratio }}
                animate={{ scaleX: view.ratio }}
                transition={{ type: 'spring', stiffness: 220, damping: 28, mass: 0.7 }}
              />

              {/* Critical Hit Impact Flash on Track */}
              {critBurst && (
                <motion.span
                  key={`crit-flash-${critBurst.id}`}
                  aria-hidden
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className={`pointer-events-none absolute inset-0 rounded-full ${
                    critBurst.isSoulCrit ? 'bg-cyan-200/75' : 'bg-yellow-100/75'
                  }`}
                />
              )}

              {/* Top Specular Gloss */}
              <span className="pointer-events-none absolute inset-x-2 top-[2px] h-[2px] rounded-full bg-white/25" />

              {/* Quarter Milestone Ticks */}
              <span className="pointer-events-none absolute inset-y-0 left-1/4 w-px bg-black/35" />
              <span className="pointer-events-none absolute inset-y-0 left-2/4 w-px bg-black/35" />
              <span className="pointer-events-none absolute inset-y-0 left-3/4 w-px bg-black/35" />

              {/* HP Numeric Readout */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2.5 font-mono text-[10px] font-extrabold text-white [text-shadow:0_1px_2px_#000] tabular-nums">
                <span className="inline-flex items-center gap-1 text-[9.5px] text-amber-100">
                  {view.isLocalEncounter ? (
                    <Swords className="size-2.5 text-amber-300" aria-hidden />
                  ) : (
                    <Flame className="size-2.5 text-orange-300" aria-hidden />
                  )}
                  {view.isLocalEncounter ? 'ปะทะในแมพ' : 'เรดรวมเซิร์ฟ'}
                </span>
                <span>
                  {formatNum(view.hp)} / {formatNum(view.maxHp)} ({view.percentText})
                </span>
              </div>
            </div>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
