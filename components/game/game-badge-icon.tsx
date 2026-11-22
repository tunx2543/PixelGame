'use client'

import { useMemo } from 'react'
import { getMenuIconUrl, type MenuIconId } from '@/lib/game/menu-icons'
import { cn } from '@/lib/utils'

export function GameArtIcon({
  iconId,
  size = 24,
  alt = '',
  className,
}: {
  iconId: MenuIconId
  size?: number
  alt?: string
  className?: string
}) {
  const src = useMemo(() => getMenuIconUrl(iconId), [iconId])
  if (!src) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className={cn('inline-block rounded bg-slate-700/40', className)}
      />
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
      className={cn('shrink-0 select-none object-contain', className)}
    />
  )
}

export function GameBadgeMedallion({
  iconId,
  tone = 'border-[#7eb0ee]/90 bg-[radial-gradient(circle_at_35%_28%,#3b649c_0%,#1c3050_58%,#0e192b_100%)]',
  size = 'md',
  iconSize,
  badgeCount = 0,
  badgeAlert = false,
  className,
}: {
  iconId: MenuIconId
  tone?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  iconSize?: number
  badgeCount?: number
  badgeAlert?: boolean
  className?: string
}) {
  const showBadge = badgeAlert || badgeCount > 0
  const sizeClass =
    size === 'xs'
      ? 'size-6 border'
      : size === 'sm'
        ? 'size-8 border-2 sm:size-9'
        : size === 'lg'
          ? 'size-11 border-2 sm:size-12'
          : 'size-9 border-2 sm:size-11'
  const resolvedIconSize =
    iconSize ?? (size === 'xs' ? 15 : size === 'sm' ? 20 : size === 'lg' ? 28 : 24)

  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center rounded-full shadow-md transition-transform duration-150',
        sizeClass,
        tone,
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[2px] rounded-full border border-white/20"
      />
      <GameArtIcon iconId={iconId} size={resolvedIconSize} />
      {showBadge && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-rose-600 px-1 font-mono text-[8.5px] font-extrabold leading-none text-white shadow tabular-nums">
          {badgeCount > 0 ? (badgeCount > 99 ? '99+' : badgeCount > 9 ? '9+' : badgeCount) : '!'}
        </span>
      )}
    </span>
  )
}
