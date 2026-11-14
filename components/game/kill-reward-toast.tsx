'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Coins, Crown, Package, Skull, Sparkles, X } from 'lucide-react'
import { ITEMS } from '@/lib/game/data'
import { dismissKillToast, game, type KillRewardToastItem } from '@/lib/game/engine'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from './format'

export function KillRewardToast({
  toasts,
  onDismiss,
}: {
  toasts?: KillRewardToastItem[]
  onDismiss?: (id: number) => void
}) {
  const g = useGame()
  const activeToasts = (toasts ?? g.killToasts).filter((toast) =>
    toasts ? true : toast.until > game.time,
  )

  const handleDismiss = (id: number) => {
    if (onDismiss) onDismiss(id)
    else dismissKillToast(id)
  }

  return (
    <div
      aria-live="polite"
      aria-label="แจ้งเตือนรางวัลการกำจัดมอนสเตอร์"
      className="pointer-events-none absolute right-2 top-2 z-40 flex w-[min(17.5rem,calc(100vw-1rem))] flex-col gap-2 md:right-3 md:top-3"
    >
      <AnimatePresence initial={false}>
        {activeToasts.map((toast) => {
          const isPickup = toast.kind === 'pickup'
          const totalDuration = isPickup ? 2.8 : 3.4
          const remaining = toasts
            ? totalDuration
            : Math.max(0.2, Math.min(totalDuration, toast.until - game.time))

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 28, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.94 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              role="status"
              className={`pointer-events-auto pixel-panel relative overflow-hidden p-2.5 shadow-xl ${
                toast.isBoss
                  ? 'border-[#ffd60a] bg-[#1b1c2e]/95'
                  : isPickup
                    ? 'border-accent/70 bg-[#1b1c2e]/95'
                    : 'bg-[#1b1c2e]/95'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={`grid size-6 shrink-0 place-items-center border border-[#0e0f1a] ${
                      toast.isBoss
                        ? 'bg-[#ffd60a]/20 text-[#ffd60a]'
                        : isPickup
                          ? 'bg-accent/20 text-accent'
                          : 'bg-destructive/20 text-[#ff8b8e]'
                    }`}
                  >
                    {toast.isBoss ? (
                      <Crown className="size-3.5" aria-hidden />
                    ) : isPickup ? (
                      <Package className="size-3.5" aria-hidden />
                    ) : (
                      <Skull className="size-3.5" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">
                      {isPickup ? toast.monsterName : `กำจัด ${toast.monsterName}`}
                    </p>
                    {toast.isBoss && (
                      <span className="text-[10px] font-semibold text-[#ffd60a]">
                        BOSS DEFEATED
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="ปิดการแจ้งเตือน"
                  onClick={() => handleDismiss(toast.id)}
                  className="p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>

              {/* Gold & EXP Rewards */}
              {(toast.gold > 0 || toast.exp > 0) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  {toast.gold > 0 && (
                    <span className="flex items-center gap-1 border border-[#0e0f1a] bg-gold/15 px-1.5 py-0.5 font-semibold text-gold tabular-nums">
                      <Coins className="size-3" aria-hidden />
                      +{formatNum(toast.gold)} Gold
                    </span>
                  )}
                  {toast.exp > 0 && (
                    <span className="flex items-center gap-1 border border-[#0e0f1a] bg-exp/15 px-1.5 py-0.5 font-semibold text-[#e0b3ff] tabular-nums">
                      <Sparkles className="size-3" aria-hidden />
                      +{formatNum(toast.exp)} EXP
                    </span>
                  )}
                </div>
              )}

              {/* Dropped / Received Items */}
              {toast.items.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-border/60 pt-1.5">
                  {toast.items.map((entry, idx) => {
                    const item = ITEMS[entry.itemId]
                    return (
                      <div
                        key={`${entry.itemId}-${idx}`}
                        className="flex items-center justify-between gap-2 text-[11px]"
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          {item?.asset ? (
                            <img
                              src={item.asset}
                              alt={item.name}
                              width={18}
                              height={18}
                              className="pixelated size-4.5 shrink-0 object-contain"
                            />
                          ) : (
                            <Package
                              className="size-3.5 shrink-0"
                              style={{ color: item?.color ?? '#f3ecd9' }}
                              aria-hidden
                            />
                          )}
                          <span
                            className="truncate font-medium"
                            style={{ color: item?.color ?? '#f3ecd9' }}
                          >
                            {item?.name ?? entry.itemId}
                          </span>
                        </div>
                        <span className="shrink-0 font-semibold text-foreground/90 tabular-nums">
                          x{formatNum(entry.qty)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Auto-expire Progress Indicator */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: remaining, ease: 'linear' }}
                style={{ transformOrigin: 'left' }}
                className={`mt-2 h-0.5 w-full ${
                  toast.isBoss ? 'bg-[#ffd60a]' : isPickup ? 'bg-accent' : 'bg-primary'
                }`}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
