'use client'

import { ITEMS } from '@/lib/game/data'
import type { InvItem } from '@/lib/game/engine'
import { resolveEffectiveRarity, type EquipmentRarity } from '@/lib/game/mmo-systems'
import { itemIconUrl } from '@/lib/game/sprites'
import { cn } from '@/lib/utils'
import { ItemVfxBox } from './item-vfx'

export function ItemIcon({ itemId, size = 32, className }: { itemId: string; size?: number; className?: string }) {
  const def = ITEMS[itemId]
  if (!def) return null

  return (
    <img
      src={def.asset ? def.asset : itemIconUrl(def.icon, def.color)}
      onError={(event) => {
        event.currentTarget.onerror = null
        event.currentTarget.src = itemIconUrl(def.icon, def.color)
      }}
      alt={def.name}
      title={def.name}
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      className={cn('pixelated shrink-0 object-contain', className)}
      draggable={false}
    />
  )
}

export function ItemSlot({
  item,
  selected,
  onClick,
  label,
  rarity,
  showVfx = true,
}: {
  item: InvItem | null
  selected?: boolean
  onClick?: () => void
  label?: string
  rarity?: EquipmentRarity
  showVfx?: boolean
}) {
  const def = item ? ITEMS[item.itemId] : null
  const effectiveRarity = item && def ? (rarity ?? resolveEffectiveRarity(item, def)) : 'common'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!item && !onClick}
      title={def ? `${def.name}${item!.plus ? ` +${item!.plus}` : ''} - ${def.description}` : label}
      aria-label={def ? `${def.name}${item!.plus ? ` +${item!.plus}` : ''} จำนวน ${item!.qty}` : (label ?? 'ช่องว่าง')}
      className={cn(
        'relative flex aspect-square w-full items-center justify-center rounded transition-transform active:scale-95',
        !item && 'border-2 border-border bg-muted/80 hover:border-primary/60',
        selected && !item && 'border-primary bg-secondary',
      )}
    >
      {item ? (
        <ItemVfxBox
          itemId={item.itemId}
          rarity={effectiveRarity}
          element={def?.element}
          size="sm"
          selected={selected}
          showVfx={showVfx}
          className="size-full p-1"
        >
          <ItemIcon itemId={item.itemId} size={30} />
          {item.plus > 0 && (
            <span className="absolute left-0.5 top-0 z-30 text-[10px] font-bold leading-none text-amber-300 drop-shadow-[1px_1px_0_#000] tabular-nums">
              +{item.plus}
            </span>
          )}
          {item.qty > 1 && (
            <span className="absolute bottom-0 right-0.5 z-30 text-[10px] font-bold leading-none text-white drop-shadow-[1px_1px_0_#000] tabular-nums">
              {item.qty}
            </span>
          )}
        </ItemVfxBox>
      ) : (
        label && <span className="text-[10px] text-muted-foreground">{label}</span>
      )}
    </button>
  )
}
