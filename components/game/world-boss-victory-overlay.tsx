'use client'

import { useEffect, useMemo } from 'react'
import { Crown, Sparkles, Trophy, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { dismissWorldBossVictory } from '@/lib/game/engine'
import { useUiLayout } from '@/lib/game/ui-layout'
import { useGame } from '@/lib/game/use-game'
import { buildVictoryCoinParticles } from '@/lib/game/world-boss-fx'
import { formatNum } from './format'

function GoldCoinGlyph({ size }: { size: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center rounded-full border-2 border-amber-200 bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-600 shadow-[0_0_10px_rgba(251,191,36,0.65)]"
    >
      <div className="h-[62%] w-[62%] rounded-full border border-amber-100/75 bg-gradient-to-b from-amber-300 to-amber-500 flex items-center justify-center">
        <span
          style={{ fontSize: Math.max(8, Math.round(size * 0.46)) }}
          className="font-black leading-none text-amber-950 select-none"
        >
          G
        </span>
      </div>
    </div>
  )
}

export function WorldBossVictoryOverlay() {
  const g = useGame()
  const uiLayout = useUiLayout()
  const victory = g.worldBossVictory
  const reduceParticles =
    uiLayout.preferences.reduceParticles || uiLayout.preferences.graphicsQuality === 'low'
  const disableGlow = uiLayout.preferences.disableShadowsAndGlow

  useEffect(() => {
    if (!victory) return
    const timer = window.setTimeout(() => {
      dismissWorldBossVictory()
    }, 5800)
    return () => window.clearTimeout(timer)
  }, [victory])

  const coins = useMemo(() => {
    if (!victory) return []
    return buildVictoryCoinParticles(victory.id, reduceParticles ? 14 : 36)
  }, [victory, reduceParticles])

  return (
    <AnimatePresence>
      {victory && (
        <motion.div
          key={`wb-victory-${victory.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          data-testid="world-boss-victory-overlay"
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-hidden"
        >
          {/* Subtle golden atmospheric wash */}
          {!disableGlow && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.36, 0.22] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.34)_0%,rgba(217,119,6,0.12)_45%,rgba(0,0,0,0)_78%)]"
            />
          )}

          {/* Gold-coin particle rain */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {coins.map((coin) => (
              <motion.div
                key={coin.id}
                style={{ left: `${coin.leftPct}%`, top: '-44px' }}
                initial={{ y: -44, x: 0, rotate: 0, opacity: 0 }}
                animate={{
                  y: '108vh',
                  x: [0, coin.swayPx, -coin.swayPx * 0.6, coin.swayPx * 0.35],
                  rotate: 360 * coin.spinTurns,
                  opacity: [0, coin.opacity, coin.opacity, 0],
                }}
                transition={{
                  duration: coin.durationSec,
                  delay: coin.delaySec,
                  ease: 'linear',
                  repeat: Infinity,
                }}
                className="absolute will-change-transform"
              >
                <GoldCoinGlyph size={coin.sizePx} />
              </motion.div>
            ))}
          </div>

          {/* Centered celebration banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 26 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -18 }}
            transition={{ type: 'spring', stiffness: 280, damping: 21 }}
            className="pointer-events-auto relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border-2 border-amber-300/90 bg-gradient-to-b from-[#23180c]/95 via-[#18121f]/96 to-[#0f1320]/96 px-6 py-5 text-center shadow-[0_0_48px_rgba(251,191,36,0.38)]"
          >
            {/* Animated top light sweep */}
            {!disableGlow && (
              <motion.div
                aria-hidden
                initial={{ x: '-120%' }}
                animate={{ x: '220%' }}
                transition={{ duration: 1.4, delay: 0.15, ease: 'easeInOut' }}
                className="pointer-events-none absolute inset-y-0 w-1/2 skew-x-[-20deg] bg-gradient-to-r from-transparent via-amber-200/20 to-transparent"
              />
            )}

            <button
              type="button"
              onClick={() => dismissWorldBossVictory()}
              aria-label="ปิดหน้าต่างชัยชนะ"
              className="absolute right-2.5 top-2.5 rounded-md border border-amber-400/35 bg-black/40 p-1 text-amber-200/80 transition hover:bg-amber-500/20 hover:text-amber-100"
            >
              <X className="size-4" aria-hidden />
            </button>

            {/* Emblem */}
            <motion.div
              initial={{ scale: 0.4, rotate: -18 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 16, delay: 0.08 }}
              className="mx-auto mb-2.5 flex size-14 items-center justify-center rounded-full border-2 border-amber-300 bg-gradient-to-b from-amber-400/35 to-amber-700/35 shadow-[0_0_24px_rgba(251,191,36,0.5)]"
            >
              <Trophy className="size-7 text-amber-300" aria-hidden />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-[0.28em] text-amber-300 uppercase"
            >
              <Crown className="size-3.5 text-amber-300" aria-hidden />
              <span>WORLD BOSS DEFEATED</span>
              <Crown className="size-3.5 text-amber-300" aria-hidden />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.18 }}
              className="mt-1 bg-gradient-to-b from-yellow-100 via-amber-300 to-amber-500 bg-clip-text text-3xl font-black tracking-[0.16em] text-transparent drop-shadow-[0_2px_10px_rgba(251,191,36,0.45)]"
            >
              VICTORY!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              className="mt-1 text-sm font-bold text-amber-100"
            >
              พิชิต {victory.bossName} สำเร็จ!
            </motion.p>

            {/* Rewards row */}
            {(victory.gold > 0 || victory.diamonds > 0 || victory.exp > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-3.5 flex flex-wrap items-center justify-center gap-2"
              >
                {victory.gold > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/55 bg-amber-950/70 px-3 py-1 text-xs font-bold text-amber-200 tabular-nums">
                    +{formatNum(victory.gold)} G
                  </span>
                )}
                {victory.diamonds > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/55 bg-cyan-950/70 px-3 py-1 text-xs font-bold text-cyan-200 tabular-nums">
                    +{formatNum(victory.diamonds)} เพชร
                  </span>
                )}
                {victory.exp > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/55 bg-emerald-950/70 px-3 py-1 text-xs font-bold text-emerald-200 tabular-nums">
                    <Sparkles className="size-3" aria-hidden />
                    +{formatNum(victory.exp)} EXP
                  </span>
                )}
              </motion.div>
            )}

            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.38 }}
              onClick={() => dismissWorldBossVictory()}
              className="pixel-btn mt-4 bg-gradient-to-b from-amber-500 to-amber-700 px-5 py-1.5 text-xs font-extrabold text-amber-950 shadow hover:brightness-110"
            >
              รับชัยชนะ
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
