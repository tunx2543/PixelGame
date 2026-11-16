'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Coins, Crown, Package, Skull, Sparkles, X } from 'lucide-react'
import { ITEMS } from '@/lib/game/data'
import { dismissKillToast, game, type KillRewardToastItem } from '@/lib/game/engine'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from './format'
import { ItemIcon } from './item-icon'

export function KillRewardToast({
  toasts,
  onDismiss,
}: {
  toasts?: KillRewardToastItem[]
  onDismiss?: (id: number) => void
}) {
  const g = useGame()
  const activeToasts = (toasts ?? g.killToasts)
    .filter((toast) => (toasts ? true : toast.until > game.time))
    .slice(0, 2)

  const handleDismiss = (id: number) => {
    if (onDismiss) onDismiss(id)
    else dismissKillToast(id)
  }

  return (
    <div
      aria-live="polite"
      aria-label="แจ้งเตือนรางวัลการกำจัดมอนสเตอร์"
      data-testid="kill-reward-toast-list"
      className="pointer-events-none absolute right-2 top-11 z-40 flex w-[min(12.25rem,38vw)] flex-col gap-1 sm:top-12 sm:w-[14.25rem] md:right-3"
    >
      <AnimatePresence initial={false}>
        {activeToasts.map((toast) => {
          const isPickup = toast.kind === 'pickup'
          const totalDuration = isPickup ? 2.8 : 3.4
          const remaining = toasts
            ? totalDuration
            : Math.max(0.2, Math.min(totalDuration, toast.until - game.time))
          const shownItems = toast.items.slice(0, 2)
          const extraItems = Math.max(0, toast.items.length - shownItems.length)

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 18, scale: 0.95 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              role="status"
              className={`pointer-events-auto pixel-panel relative overflow-hidden px-2 py-1.5 shadow-lg ${
                toast.isBoss
                  ? 'border-[#ffd60a] bg-[#1b1c2e]/92'
                  : isPickup
                    ? 'border-accent/70 bg-[#1b1c2e]/92'
                    : 'bg-[#1b1c2e]/92'
              }`}
            >
              {/* Compact Header */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={`grid size-4 shrink-0 place-items-center border border-[#0e0f1a] ${
                      toast.isBoss
                        ? 'bg-[#ffd60a]/20 text-[#ffd60a]'
                        : isPickup
                          ? 'bg-accent/20 text-accent'
                          : 'bg-destructive/20 text-[#ff8b8e]'
                    }`}
                  >
                    {toast.isBoss ? (
                      <Crown className="size-2.5" aria-hidden />
                    ) : isPickup ? (
                      <Package className="size-2.5" aria-hidden />
                    ) : (
                      <Skull className="size-2.5" aria-hidden />
                    )}
                  </span>
                  <p className="truncate text-[10px] font-bold leading-tight text-foreground sm:text-[11px]">
                    {isPickup ? toast.monsterName : `กำจัด ${toast.monsterName}`}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="ปิดการแจ้งเตือน"
                  onClick={() => handleDismiss(toast.id)}
                  className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </div>

              {/* Compact Inline Gold & EXP */}
              {(toast.gold > 0 || toast.exp > 0) && (
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] leading-tight sm:text-[10px]">
                  {toast.gold > 0 && (
                    <span className="inline-flex items-center gap-0.5 font-semibold text-gold tabular-nums">
                      <Coins className="size-2.5 shrink-0" aria-hidden />+{formatNum(toast.gold)}G
                    </span>
                  )}
                  {toast.exp > 0 && (
                    <span className="inline-flex items-center gap-0.5 font-semibold text-[#e0b3ff] tabular-nums">
                      <Sparkles className="size-2.5 shrink-0" aria-hidden />+{formatNum(toast.exp)} EXP
                    </span>
                  )}
                </div>
              )}

              {/* Compact Dropped / Received Items */}
              {shownItems.length > 0 && (
                <div className="mt-1 space-y-0.5 border-t border-border/50 pt-1">
                  {shownItems.map((entry, idx) => {
                    const item = ITEMS[entry.itemId]
                    return (
                      <div
                        key={`${entry.itemId}-${idx}`}
                        className="flex items-center justify-between gap-1.5 text-[9px] leading-tight sm:text-[10px]"
                      >
                        <div className="flex min-w-0 items-center gap-1">
                          {item ? (
                            <ItemIcon itemId={entry.itemId} size={13} />
                          ) : (
                            <Package
                              className="size-3 shrink-0 text-[#f3ecd9]"
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
                  {extraItems > 0 && (
                    <p className="text-[9px] text-muted-foreground tabular-nums">+{extraItems} รายการ</p>
                  )}
                </div>
              )}

              {/* Auto-expire Progress Indicator */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: remaining, ease: 'linear' }}
                style={{ transformOrigin: 'left' }}
                className={`mt-1 h-0.5 w-full ${
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
