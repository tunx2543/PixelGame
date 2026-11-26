'use client'

import { ITEMS } from '@/lib/game/data'
import type { InvItem } from '@/lib/game/engine'
import { resolveItemImagePath } from '@/lib/game/items'
import { resolveEffectiveRarity, type EquipmentRarity } from '@/lib/game/mmo-systems'
import { itemIconUrl } from '@/lib/game/sprites'
import {
  COMPANION_BOX_SPRITE_CROP,
  EVENT_CHEST_SPRITE_CROP,
  EVENT_LUCKY_BOX_SPRITE_CROP,
  getShopCustomArtworkCrop,
} from '@/lib/game/treasure-chest'
import { cn } from '@/lib/utils'
import { ChestArtworkSprite } from './chest-artwork'
import { ItemVfxBox } from './item-vfx'

export function ItemIcon({ itemId, size = 32, className }: { itemId: string; size?: number; className?: string }) {
  const def = ITEMS[itemId]
  if (!def) return null

  const shopCustomCrop = getShopCustomArtworkCrop(itemId)
  if (shopCustomCrop) {
    return (
      <ChestArtworkSprite
        crop={shopCustomCrop}
        alt={def.name}
        size={size}
        squareFit
        maskMode="wide"
        showGlow={size >= 24}
        testId={`shop-art-${itemId}`}
        className={className}
      />
    )
  }

  if (itemId === 'companion_gacha_box') {
    return (
      <ChestArtworkSprite
        crop={COMPANION_BOX_SPRITE_CROP}
        alt={def.name}
        size={size}
        squareFit
        showGlow={size >= 24}
        testId="companion-box-item-icon"
        className={className}
      />
    )
  }

  if (itemId === 'event_lucky_box') {
    return (
      <ChestArtworkSprite
        crop={EVENT_LUCKY_BOX_SPRITE_CROP}
        alt={def.name}
        size={size}
        squareFit
        showGlow={size >= 24}
        testId="event-lucky-box-item-icon"
        className={className}
      />
    )
  }

  if (itemId === 'event_mythic_chest') {
    return (
      <ChestArtworkSprite
        crop={EVENT_CHEST_SPRITE_CROP}
        alt={def.name}
        size={size}
        squareFit
        showGlow={size >= 24}
        testId="event-chest-item-icon"
        className={className}
      />
    )
  }

  const primarySrc = resolveItemImagePath(def)

  return (
    <img
      src={primarySrc}
      onError={(event) => {
        event.currentTarget.onerror = null
        event.currentTarget.src = itemIconUrl(def.icon, def.color)
      }}
      alt={def.name}
      title={def.name}
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      className={cn('shrink-0 object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.58)]', className)}
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

  const inner = item ? (
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
  )

  const sharedClassName = cn(
    'relative flex aspect-square w-full items-center justify-center rounded transition-transform',
    onClick && 'active:scale-95',
    !item && 'border-2 border-border bg-muted/80 hover:border-primary/60',
    selected && !item && 'border-primary bg-secondary',
  )
  const sharedTitle = def ? `${def.name}${item!.plus ? ` +${item!.plus}` : ''} - ${def.description}` : label
  const sharedAriaLabel = def ? `${def.name}${item!.plus ? ` +${item!.plus}` : ''} จำนวน ${item!.qty}` : (label ?? 'ช่องว่าง')

  if (!onClick) {
    return (
      <div title={sharedTitle} aria-label={sharedAriaLabel} className={sharedClassName}>
        {inner}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={sharedTitle}
      aria-label={sharedAriaLabel}
      className={sharedClassName}
    >
      {inner}
    </button>
  )
}
