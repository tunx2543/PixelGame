'use client'

import { useEffect, useMemo } from 'react'
import { X, Zap } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { dismissWorldBossEntrance } from '@/lib/game/engine'
import { ELEMENT_META } from '@/lib/game/rpg-systems'
import { useUiLayout } from '@/lib/game/ui-layout'
import { useGame } from '@/lib/game/use-game'
import {
  WORLD_BOSS_ENTRANCE_DURATION_MS,
  buildEntranceLightningBolts,
  buildEntranceSparks,
} from '@/lib/game/world-boss-fx'

export function WorldBossEntranceOverlay() {
  const g = useGame()
  const uiLayout = useUiLayout()
  const prefersReducedMotion = useReducedMotion()
  const entrance = g.worldBossEntrance
  const reduceParticles =
    Boolean(prefersReducedMotion) ||
    uiLayout.preferences.reduceParticles ||
    uiLayout.preferences.graphicsQuality === 'low'
  const disableGlow = Boolean(prefersReducedMotion) || uiLayout.preferences.disableShadowsAndGlow

  useEffect(() => {
    if (!entrance) return
    const durationMs = prefersReducedMotion ? 1800 : WORLD_BOSS_ENTRANCE_DURATION_MS
    const timer = window.setTimeout(() => {
      dismissWorldBossEntrance()
    }, durationMs)
    return () => window.clearTimeout(timer)
  }, [entrance, prefersReducedMotion])

  const bolts = useMemo(() => {
    if (!entrance) return []
    return buildEntranceLightningBolts(entrance.id, reduceParticles ? 2 : 5)
  }, [entrance, reduceParticles])

  const sparks = useMemo(() => {
    if (!entrance) return []
    return buildEntranceSparks(entrance.id, reduceParticles ? 10 : 26)
  }, [entrance, reduceParticles])

  const elemMeta =
    entrance && entrance.element in ELEMENT_META
      ? ELEMENT_META[entrance.element as keyof typeof ELEMENT_META]
      : ELEMENT_META.earth

  return (
    <AnimatePresence>
      {entrance && (
        <motion.div
          key={`wb-entrance-${entrance.id}`}
          data-testid="world-boss-entrance-overlay"
          role="status"
          aria-live="assertive"
          aria-label={`บอสโลกปรากฏตัว: ${entrance.bossName}`}
          initial={{ opacity: 0 }}
          animate={
            prefersReducedMotion
              ? { opacity: 1 }
              : {
                  opacity: [0, 1, 1, 1],
                  x: [0, 0, -9, 9, -6, 5, -2, 0],
                  y: [0, 0, 11, -7, 6, -3, 1, 0],
                }
          }
          exit={{ opacity: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.25 }
              : {
                  opacity: { duration: 0.2 },
                  x: { duration: 0.85, times: [0, 0.38, 0.42, 0.48, 0.55, 0.63, 0.74, 0.9] },
                  y: { duration: 0.85, times: [0, 0.38, 0.42, 0.48, 0.55, 0.63, 0.74, 0.9] },
                }
          }
          className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Storm Sky Dimming Scrim */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.78, 0.62, 0] }}
            transition={{ duration: WORLD_BOSS_ENTRANCE_DURATION_MS / 1000, times: [0, 0.14, 0.78, 1] }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(14,32,58,0.58)_0%,rgba(5,9,20,0.88)_72%)]"
          />

          {/* Electric Lightning Flash */}
          {!disableGlow && (
            <motion.div
              aria-hidden
              data-testid="world-boss-entrance-lightning-flash"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.88, 0.14, 0.92, 0.2, 0] }}
              transition={{ duration: 0.68, times: [0, 0.1, 0.22, 0.48, 0.66, 1], ease: 'easeOut' }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(224,242,254,0.95)_0%,rgba(56,189,248,0.55)_38%,rgba(15,23,42,0.1)_85%)]"
            />
          )}

          {/* Vertical Sky-to-Ground Lightning Strikes */}
          {!prefersReducedMotion && (
            <div
              aria-hidden
              data-testid="world-boss-entrance-bolts"
              className="pointer-events-none absolute inset-x-0 top-0 flex h-[74%] justify-center overflow-hidden"
            >
              <svg
                viewBox="0 0 400 600"
                preserveAspectRatio="none"
                className="h-full w-[min(36rem,96vw)] overflow-visible"
              >
                {bolts.map((bolt) => (
                  <g key={bolt.id}>
                    {!disableGlow && (
                      <motion.polyline
                        points={bolt.points}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth={bolt.strokeWidth * 3.1}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                          pathLength: [0, 1, 1],
                          opacity: [0, bolt.opacity * 0.65, 0],
                        }}
                        transition={{
                          duration: bolt.durationSec,
                          delay: bolt.delaySec,
                          times: [0, 0.35, 1],
                          ease: 'easeOut',
                        }}
                      />
                    )}
                    <motion.polyline
                      points={bolt.points}
                      fill="none"
                      stroke="#f0f9ff"
                      strokeWidth={bolt.strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{
                        pathLength: [0, 1, 1],
                        opacity: [0, bolt.opacity, bolt.opacity * 0.8, 0],
                      }}
                      transition={{
                        duration: bolt.durationSec,
                        delay: bolt.delaySec,
                        times: [0, 0.32, 0.55, 1],
                        ease: 'easeOut',
                      }}
                    />
                  </g>
                ))}
              </svg>
            </div>
          )}

          {/* Center Landing Zone: Shockwaves, Sparks & Descending Boss */}
          <div className="relative flex flex-col items-center justify-center">
            {/* Landing Crater / Electric Ground Halo */}
            {!disableGlow && (
              <motion.div
                aria-hidden
                initial={{ opacity: 0, scale: 0.25 }}
                animate={{ opacity: [0, 0.95, 0.45, 0], scale: [0.25, 1.35, 1.85, 2.1] }}
                transition={{ duration: 1.15, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute top-[58%] h-24 w-72 rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(186,230,253,0.9)_0%,rgba(56,189,248,0.45)_45%,transparent_75%)] will-change-transform"
              />
            )}

            {/* Expanding Shockwave Rings on Impact */}
            {!prefersReducedMotion && (
              <>
                <motion.div
                  aria-hidden
                  initial={{ opacity: 0, scale: 0.18 }}
                  animate={{ opacity: [0, 0.95, 0], scale: [0.18, 2.5] }}
                  transition={{ duration: 0.85, delay: 0.34, ease: [0.16, 1, 0.3, 1] }}
                  className="pointer-events-none absolute top-[58%] h-24 w-64 rounded-[100%] border-4 border-sky-200 will-change-transform"
                />
                <motion.div
                  aria-hidden
                  initial={{ opacity: 0, scale: 0.2 }}
                  animate={{ opacity: [0, 0.8, 0], scale: [0.2, 2.15] }}
                  transition={{ duration: 0.72, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="pointer-events-none absolute top-[60%] h-20 w-56 rounded-[100%] border-2 border-amber-300 will-change-transform"
                />
              </>
            )}

            {/* Radial Impact Spark Burst */}
            {!prefersReducedMotion && (
              <div aria-hidden className="pointer-events-none absolute top-[62%] left-1/2">
                {sparks.map((spark) => (
                  <motion.div
                    key={spark.id}
                    style={{
                      width: spark.sizePx,
                      height: spark.sizePx,
                      backgroundColor: spark.color,
                      marginLeft: -spark.sizePx / 2,
                      marginTop: -spark.sizePx / 2,
                    }}
                    initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
                    animate={{
                      x: spark.endX,
                      y: spark.endY,
                      scale: [0.6, 1.3, 0.2],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: spark.durationSec,
                      delay: spark.delaySec,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="absolute rounded-full will-change-transform"
                  />
                ))}
              </div>
            )}

            {/* Descending World Boss Sprite */}
            <motion.div
              data-testid="world-boss-entrance-sprite"
              initial={prefersReducedMotion ? { opacity: 0, scale: 0.92 } : { y: '-68vh', scale: 0.7, opacity: 0.95 }}
              animate={
                prefersReducedMotion
                  ? { opacity: [0, 1, 1, 0], scale: 1 }
                  : {
                      y: ['-68vh', 6, -14, 0, 0],
                      scale: [0.7, 1.2, 1.0, 1.04, 0.98],
                      opacity: [0.95, 1, 1, 1, 0],
                    }
              }
              transition={
                prefersReducedMotion
                  ? { duration: 1.6, times: [0, 0.2, 0.8, 1] }
                  : {
                      duration: 2.45,
                      times: [0, 0.16, 0.24, 0.34, 1],
                      ease: [0.22, 1, 0.36, 1],
                    }
              }
              className="relative z-10 flex items-center justify-center will-change-transform"
            >
              <img
                src={entrance.spriteUrl}
                alt={entrance.bossName}
                referrerPolicy="no-referrer"
                className="pixelated h-36 w-36 object-contain drop-shadow-[0_12px_28px_rgba(56,189,248,0.72)] sm:h-48 sm:w-48"
              />
            </motion.div>

            {/* Boss Arrival Banner */}
            <motion.div
              initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 1.18, y: 18 }}
              animate={{ opacity: [0, 1, 1, 0], scale: 1, y: 0 }}
              transition={{
                duration: 2.3,
                delay: prefersReducedMotion ? 0.05 : 0.36,
                times: [0, 0.14, 0.84, 1],
                ease: [0.16, 1, 0.3, 1],
              }}
              className="pointer-events-auto relative z-20 mt-3 w-[min(26rem,calc(100vw-2rem))] rounded-xl border-2 border-sky-300/80 bg-[#070d1a]/92 px-6 py-4 text-center shadow-[0_18px_42px_rgba(0,0,0,0.85)]"
            >
              <button
                type="button"
                onClick={() => dismissWorldBossEntrance()}
                aria-label="ข้ามฉากเปิดตัวบอส"
                className="absolute right-2.5 top-2.5 rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" aria-hidden />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-[0.22em] text-sky-300">
                <Zap className="size-3.5 text-amber-300" aria-hidden />
                <span>{entrance.isTestMode ? 'GM TEST WORLD BOSS' : 'WORLD BOSS DESCENDS'}</span>
                <Zap className="size-3.5 text-amber-300" aria-hidden />
              </div>

              <h2 className="mt-1 text-balance text-xl font-black tracking-wide text-white drop-shadow-[0_2px_10px_rgba(56,189,248,0.5)] sm:text-2xl">
                {entrance.bossName}
              </h2>

              <div className="mt-1.5 flex items-center justify-center gap-2 text-xs font-medium text-slate-300 tabular-nums">
                <span>LV.{entrance.level}</span>
                <span aria-hidden>·</span>
                <span style={{ color: elemMeta.color }}>ธาตุ{elemMeta.label}</span>
                <span aria-hidden>·</span>
                <span className="text-amber-300">ศึกเวิลด์บอสเปิดฉากแล้ว</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
