'use client'

import { Sparkles } from 'lucide-react'
import {
  CHEST_ARTWORK_SHEET_SIZE,
  CHEST_ARTWORK_SHEET_SRC,
  type ChestSpriteCropSpec,
} from '@/lib/game/treasure-chest'
import { cn } from '@/lib/utils'

export function ChestArtworkSprite({
  crop,
  alt,
  size = 112,
  open = false,
  squareFit = false,
  showGlow = true,
  testId,
  dataTier,
  className,
}: {
  crop: ChestSpriteCropSpec
  alt: string
  size?: number
  open?: boolean
  squareFit?: boolean
  showGlow?: boolean
  testId?: string
  dataTier?: string
  className?: string
}) {
  const aspect = crop.sw / crop.sh
  const width = squareFit
    ? aspect >= 1
      ? size
      : Math.max(1, Math.round(size * aspect))
    : size
  const height = squareFit
    ? aspect >= 1
      ? Math.max(1, Math.round(size / aspect))
      : size
    : Math.round(size / aspect)

  const src = crop.src ?? CHEST_ARTWORK_SHEET_SRC
  const sheetW = crop.sheetWidth ?? CHEST_ARTWORK_SHEET_SIZE
  const sheetH = crop.sheetHeight ?? CHEST_ARTWORK_SHEET_SIZE

  const spriteNode = (
    <div
      data-testid={testId}
      data-chest-tier={dataTier}
      data-chest-open={open ? 'true' : 'false'}
      style={{ width, height }}
      className={cn(
        'relative shrink-0 select-none overflow-visible',
        open && 'scale-[1.04] transition-transform duration-200',
        !squareFit && className,
      )}
    >
      {showGlow && (
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-x-1 bottom-0 rounded-full blur-md transition-opacity',
            open ? 'top-0 opacity-75' : 'top-1/3 opacity-45',
          )}
          style={{
            background: open
              ? `radial-gradient(circle, #fef08a 0%, ${crop.glowHex}88 55%, transparent 80%)`
              : `radial-gradient(circle, ${crop.glowHex}77 0%, transparent 72%)`,
          }}
        />
      )}

      <div
        className="relative h-full w-full overflow-hidden rounded-lg"
        style={{
          WebkitMaskImage:
            'radial-gradient(ellipse 86% 84% at 50% 52%, #000 62%, transparent 99%)',
          maskImage:
            'radial-gradient(ellipse 86% 84% at 50% 52%, #000 62%, transparent 99%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          title={alt}
          draggable={false}
          className={cn(
            'pointer-events-none absolute max-w-none select-none transition-[filter] duration-200',
            open ? 'brightness-125 saturate-115' : 'brightness-105',
          )}
          style={{
            width: `${(sheetW / crop.sw) * 100}%`,
            height: `${(sheetH / crop.sh) * 100}%`,
            left: `${-(crop.sx / crop.sw) * 100}%`,
            top: `${-(crop.sy / crop.sh) * 100}%`,
            imageRendering: 'pixelated',
          }}
        />
      </div>

      {open && (
        <Sparkles
          aria-hidden="true"
          className="pointer-events-none absolute -right-1 -top-1 size-4 text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]"
        />
      )}
    </div>
  )

  if (!squareFit) {
    return spriteNode
  }

  return (
    <span
      style={{ width: size, height: size }}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
    >
      {spriteNode}
    </span>
  )
}
