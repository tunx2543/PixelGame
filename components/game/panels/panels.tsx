'use client'

import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { closePanel } from '@/lib/game/engine'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { CharacterPanel } from './character-panel'
import { EnhancePanel } from './enhance-panel'
import { GachaPanel } from './gacha-panel'
import { GemShopPanel } from './gem-shop-panel'
import { FriendsPanel } from './friends-panel'
import { GmSummonPanel } from './gm-summon-panel'
import { DevToolsPanel } from './dev-tools-panel'
import { InventoryPanel } from './inventory-panel'
import { RebirthPanel } from './rebirth-panel'
import { JobPanel } from './job-panel'
import { ShopPanel } from './shop-panel'
import { StoragePanel } from './storage-panel'
import { TradePanel } from './trade-panel'
import { PetsPanel } from './pets-panel'
import { QuestsPanel } from './quests-panel'
import { ModelGalleryView } from '../model-gallery-view'

export function Panels() {
  const g = useGame()
  switch (g.panel) {
    case 'shop':
      return <ShopPanel />
    case 'gem-shop':
      return <GemShopPanel />
    case 'enhance':
      return <EnhancePanel />
    case 'gacha':
      return <GachaPanel />
    case 'friends':
      return <FriendsPanel game={g} />
    case 'trade':
      return <TradePanel />
    case 'gm-summon':
      return <GmSummonPanel />
    case 'dev-tools':
      return <DevToolsPanel />
    case 'inventory':
      return <InventoryPanel />
    case 'rebirth':
      return <RebirthPanel />
    case 'job':
      return <JobPanel />
    case 'storage':
      return <StoragePanel />
    case 'character':
      return <CharacterPanel />
    case 'pets':
      return <PetsPanel />
    case 'quests':
      return <QuestsPanel />
    case 'models':
      return (
        <PanelFrame title="คลังโมเดล 2D & แอนิเมชั่น" subtitle="พรีวิวโมเดลครบ 12 อาชีพ และ 17 มอนสเตอร์ พร้อมแอนิเมชั่น Idle / Walk / Attack">
          <ModelGalleryView compact />
        </PanelFrame>
      )
    default:
      return null
  }
}

export function PanelFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const g = useGame()
  return (
    <div
      className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-2 md:p-6"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) closePanel()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="pixel-panel flex max-h-full w-full max-w-3xl flex-col"
      >
        <header className="flex items-center justify-between gap-3 border-b-2 border-border bg-secondary px-4 py-2.5">
          <div className="min-w-0">
            <h2 className="truncate text-lg text-primary">{title}</h2>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm text-gold">{formatNum(g.p?.gold ?? 0)} G</span>
            <button
              type="button"
              onClick={closePanel}
              className="pixel-btn bg-destructive/80 p-1 text-white hover:bg-destructive"
              aria-label="ปิดหน้าต่าง (Esc)"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">{children}</div>
      </section>
    </div>
  )
}

export function PxButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
  type = 'button',
  className,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'accent' | 'danger'
  type?: 'button' | 'submit'
  className?: string
}) {
  const styles = {
    primary: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    accent: 'bg-accent text-accent-foreground',
    danger: 'bg-destructive text-white',
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`pixel-btn px-3 py-1.5 text-xs hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className ?? ''}`}
    >
      {children}
    </button>
  )
}
