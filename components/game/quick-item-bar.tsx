'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { ITEMS } from '@/lib/game/data'
import {
  countItem,
  getItemCooldownDuration,
  getQuickSlots,
  itemCooldownRemaining,
  openPanel,
  setQuickSlot,
  swapQuickSlots,
  useQuickSlot,
} from '@/lib/game/engine'
import { QUICK_SLOT_COUNT } from '@/lib/game/extended-systems'
import { useUiLayout } from '@/lib/game/ui-layout'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { ItemIcon } from './item-icon'

function CooldownSweep({ remaining, duration }: { remaining: number; duration: number }) {
  if (remaining <= 0 || duration <= 0) return null
  const ratio = Math.max(0, Math.min(1, remaining / duration))
  const r = 14
  const c = 2 * Math.PI * r
  const offset = c * (1 - ratio)

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-black/65">
      <svg viewBox="0 0 36 36" className="size-5 sm:size-6 -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="#fbbf24"
          strokeWidth="3"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute font-mono text-[8px] font-bold text-white tabular-nums">
        {remaining.toFixed(1)}
      </span>
    </div>
  )
}

export function QuickItemBar({ compact = false }: { compact?: boolean }) {
  const { p } = useGame()
  const layout = useUiLayout()
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [barFeedback, setBarFeedback] = useState<string | null>(null)

  if (!p) return null

  const slots = getQuickSlots()
  const useShiftPrefix = layout.preferences.hotkeyPreset === 'legacy-1-3'

  const showFeedback = (msg: string) => {
    setBarFeedback(msg)
    window.setTimeout(() => {
      setBarFeedback((cur) => (cur === msg ? null : cur))
    }, 2200)
  }

  const handleDrop = (targetIdx: number, e: React.DragEvent) => {
    e.preventDefault()
    setDragOverIdx(null)

    const slotRaw = e.dataTransfer.getData('application/x-pixelquest-quickslot')
    if (slotRaw) {
      try {
        const parsed = JSON.parse(slotRaw) as { fromIndex?: number }
        if (typeof parsed.fromIndex === 'number') {
          swapQuickSlots(parsed.fromIndex, targetIdx)
          return
        }
      } catch {
        // Ignore malformed drag payload.
      }
    }

    const itemRaw =
      e.dataTransfer.getData('application/x-pixelquest-item') ||
      e.dataTransfer.getData('text/plain')
    if (!itemRaw) return
    try {
      const parsed = JSON.parse(itemRaw) as { itemId?: string }
      if (!parsed.itemId) return
      const res = setQuickSlot(targetIdx, parsed.itemId)
      if (!res.ok && res.message) {
        showFeedback(res.message)
      }
    } catch {
      // Ignore malformed drag payload.
    }
  }

  return (
    <div
      data-testid="quick-item-bar"
      aria-label="แถบช่องลัดไอเทม 1 ถึง 0"
      className="pointer-events-auto relative flex flex-col items-center gap-1"
    >
      {barFeedback && (
        <div
          role="status"
          className="pixel-panel border-amber-400/70 bg-black/90 px-2.5 py-0.5 text-[10px] font-semibold text-amber-200 shadow-lg"
        >
          {barFeedback}
        </div>
      )}

      <div
        className={cn(
          'pixel-panel flex items-center bg-[#161113]/92 shadow-xl',
          compact
            ? 'max-w-[calc(100vw-0.75rem)] gap-0.5 overflow-x-auto p-0.5'
            : 'gap-1 p-1',
        )}
      >
        {Array.from({ length: QUICK_SLOT_COUNT }).map((_, idx) => {
          const itemId = slots[idx] ?? null
          const def = itemId ? ITEMS[itemId] : undefined
          const qty = itemId ? countItem(itemId) : 0
          const hasItem = Boolean(itemId && def && qty > 0)
          const cdRem = hasItem && itemId ? itemCooldownRemaining(itemId) : 0
          const cdDur = hasItem && itemId ? getItemCooldownDuration(itemId) : 0
          const keyLabel = idx === 9 ? '0' : String(idx + 1)
          const hotkeyDisplay = useShiftPrefix ? `S+${keyLabel}` : keyLabel

          return (
            <div
              key={idx}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragOverIdx !== idx) setDragOverIdx(idx)
              }}
              onDragLeave={() => {
                if (dragOverIdx === idx) setDragOverIdx(null)
              }}
              onDrop={(e) => handleDrop(idx, e)}
              className="group relative"
            >
              <button
                type="button"
                data-testid={`quick-slot-${idx}`}
                draggable={hasItem}
                onDragStart={(e) => {
                  if (!hasItem || !itemId) return
                  e.dataTransfer.setData(
                    'application/x-pixelquest-quickslot',
                    JSON.stringify({ fromIndex: idx, itemId }),
                  )
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onClick={() => {
                  if (hasItem) {
                    useQuickSlot(idx)
                  } else {
                    openPanel('inventory')
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (itemId) setQuickSlot(idx, null)
                }}
                disabled={cdRem > 0}
                title={
                  hasItem && def
                    ? `${def.name} (คงเหลือ ${qty}) · กด [${hotkeyDisplay}] เพื่อใช้ · คลิกขวาเพื่อถอด`
                    : `ช่องลัด [${hotkeyDisplay}] ว่าง — ลากยา/อาหารจากกระเป๋ามาวาง`
                }
                aria-label={
                  hasItem && def
                    ? `ช่องลัด ${keyLabel}: ${def.name} คงเหลือ ${qty}`
                    : `ช่องลัด ${keyLabel}: ว่าง`
                }
                className={cn(
                  'pixel-btn relative flex shrink-0 items-center justify-center overflow-hidden rounded-md transition',
                  compact ? 'size-7' : 'size-8 sm:size-9',
                  dragOverIdx === idx
                    ? 'border-accent bg-accent/25 ring-2 ring-accent'
                    : hasItem
                      ? 'border-[#d4a348]/80 bg-[#2a1f1c] hover:brightness-110'
                      : 'border-border/70 bg-[#121018]/90 hover:border-primary/50',
                )}
              >
                {hasItem && itemId ? (
                  <>
                    <ItemIcon itemId={itemId} size={compact ? 18 : 22} />
                    <span
                      data-testid={`quick-slot-qty-${idx}`}
                      className={cn(
                        "absolute bottom-0 right-0 rounded bg-black/85 font-mono font-bold leading-none text-amber-200 tabular-nums",
                        compact ? "px-0.5 text-[8px]" : "px-1 text-[9px]",
                      )}
                    >
                      {qty}
                    </span>
                    <CooldownSweep remaining={cdRem} duration={cdDur} />
                  </>
                ) : (
                  <Plus className={cn("text-muted-foreground/45 group-hover:text-primary/70", compact ? "size-2.5" : "size-3.5")} aria-hidden />
                )}

                <span className={cn("pointer-events-none absolute left-0.5 top-0 font-mono font-bold leading-none text-white/85 drop-shadow", compact ? "text-[7px]" : "text-[8px]")}>
                  {hotkeyDisplay}
                </span>
              </button>

              {hasItem && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setQuickSlot(idx, null)
                  }}
                  aria-label={`ล้างช่องลัด ${keyLabel}`}
                  className="absolute -right-1 -top-1 hidden size-4 items-center justify-center rounded-full border border-border bg-destructive text-white shadow group-hover:flex"
                >
                  <X className="size-2.5" aria-hidden />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
