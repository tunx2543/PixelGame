'use client'

import { GripHorizontal, Maximize2, Minimize2, Minus, X } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { closePanel, type PanelId } from '@/lib/game/engine'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { formatNum } from '../format'
import { WindowManager } from '../window-manager'
import { useWindowContext } from '../window-context'
import { EnhancePanel } from './enhance-panel'
import { GachaPanel } from './gacha-panel'
import { GemShopPanel } from './gem-shop-panel'
import { FriendsPanel } from './friends-panel'
import { GmSummonPanel } from './gm-summon-panel'
import { DevToolsPanel } from './dev-tools-panel'
import { PartyPanel } from './party-panel'
import { RebirthPanel } from './rebirth-panel'
import { SettingsPanel } from './settings-panel'
import { ShopPanel } from './shop-panel'
import { StoragePanel } from './storage-panel'
import { TradePanel } from './trade-panel'
import { PetsPanel } from './pets-panel'
import { QuestsPanel } from './quests-panel'
import { CraftPanel } from './craft-panel'
import { CodexPanel } from './codex-panel'
import { GuildBossPanel } from './guild-boss-panel'
import { ArenaPanel } from './arena-panel'
import { DungeonPanel } from './dungeon-panel'
import { MarketPanel } from './market-panel'
import { MailPanel } from './mail-panel'
import { PassPanel } from './pass-panel'
import { LifeSkillsPanel } from './lifeskills-panel'
import { WardrobePanel } from './wardrobe-panel'
import { GuidePanel } from './guide-panel'
import { RedeemCodePanel } from './redeem-code-panel'
import { TreasureChestPanel } from './treasure-chest-panel'
import { EventsPanel } from './events-panel'
import { ModelGalleryView } from '../model-gallery-view'
import { AsuraCharacterHub } from './asura-character-hub'

export function renderPanelById(id: PanelId, g: ReturnType<typeof useGame>): ReactNode {
  switch (id) {
    case 'shop':
      return <ShopPanel />
    case 'gem-shop':
      return <GemShopPanel />
    case 'enhance':
      return <EnhancePanel />
    case 'gacha':
      return <GachaPanel />
    case 'friends':
      return (
        <PanelFrame title="เพื่อน & UID" subtitle="ค้นหา UID · คำขอเป็นเพื่อน · สถานะออนไลน์">
          <FriendsPanel game={g} />
        </PanelFrame>
      )
    case 'party':
      return <PartyPanel />
    case 'trade':
      return <TradePanel />
    case 'gm-summon':
      return <GmSummonPanel />
    case 'dev-tools':
      return <DevToolsPanel />
    case 'inventory':
      return <AsuraCharacterHub key="hub-inventory" initialTab="inventory" />
    case 'equipment':
      return <AsuraCharacterHub key="hub-equipment" initialTab="inventory" />
    case 'settings':
      return <SettingsPanel />
    case 'rebirth':
      return <RebirthPanel />
    case 'job':
      return <AsuraCharacterHub key="hub-job" initialTab="job" />
    case 'storage':
      return <StoragePanel />
    case 'character':
      return <AsuraCharacterHub key="hub-character" initialTab="status" />
    case 'pets':
      return <PetsPanel />
    case 'quests':
      return <QuestsPanel />
    case 'craft':
      return <CraftPanel />
    case 'codex':
      return <CodexPanel />
    case 'guild':
      return <GuildBossPanel />
    case 'arena':
      return <ArenaPanel />
    case 'dungeon':
      return <DungeonPanel />
    case 'market':
      return <MarketPanel />
    case 'mail':
      return <MailPanel />
    case 'pass':
      return <PassPanel />
    case 'lifeskills':
      return <LifeSkillsPanel />
    case 'talents':
      return <AsuraCharacterHub key="hub-talents" initialTab="skills" />
    case 'wardrobe':
      return <WardrobePanel />
    case 'guide':
      return <GuidePanel />
    case 'treasure-chest':
      return <TreasureChestPanel />
    case 'redeem':
      return <RedeemCodePanel />
    case 'events':
      return <EventsPanel />
    case 'models':
      return (
        <PanelFrame title="คลังโมเดล 2D & แอนิเมชั่น" subtitle="พรีวิวโมเดลครบทุกอาชีพ, 17 มอนสเตอร์, 5 สัตว์ขี่ และ 10 สัตว์เลี้ยง/ผอบ">
          <ModelGalleryView compact />
        </PanelFrame>
      )
    default:
      return null
  }
}

export function Panels() {
  return <WindowManager />
}

export function PanelFrame({
  title,
  subtitle,
  children,
  onClose,
  hideGold = false,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  onClose?: () => void
  hideGold?: boolean
}) {
  const g = useGame()
  const winCtx = useWindowContext()
  const handleClose = onClose ?? closePanel

  if (winCtx?.insideWindowManager) {
    return (
      <section
        role="dialog"
        aria-label={title}
        className="pixel-panel flex h-full w-full flex-col overflow-hidden shadow-2xl"
      >
        <header
          onPointerDown={winCtx.startDrag}
          className={cn(
            'flex items-center justify-between gap-2 border-b-2 border-border bg-secondary px-3 py-2 sm:px-3.5',
            winCtx.startDrag && 'cursor-grab select-none active:cursor-grabbing',
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {winCtx.startDrag && (
              <GripHorizontal className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-primary sm:text-base">{title}</h2>
              {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {!hideGold && (
              <span className="mr-1 hidden text-xs font-semibold text-gold tabular-nums sm:inline">
                {formatNum(g.p?.gold ?? 0)} G
              </span>
            )}
            <button
              type="button"
              onClick={winCtx.minimize}
              className="pixel-btn bg-background/70 p-1 text-muted-foreground hover:text-foreground"
              aria-label={`ย่อหน้าต่าง ${title}`}
              title="ย่อหน้าต่าง"
            >
              <Minus className="size-3.5" aria-hidden />
            </button>
            {!winCtx.isMobileSheet && (
              <button
                type="button"
                onClick={winCtx.toggleMaximize}
                className="pixel-btn bg-background/70 p-1 text-muted-foreground hover:text-foreground"
                aria-label={winCtx.maximized ? `คืนขนาด ${title}` : `ขยายเต็มพื้นที่ ${title}`}
                title={winCtx.maximized ? 'คืนขนาด' : 'ขยาย'}
              >
                {winCtx.maximized ? <Minimize2 className="size-3.5" aria-hidden /> : <Maximize2 className="size-3.5" aria-hidden />}
              </button>
            )}
            <button
              type="button"
              onClick={winCtx.close}
              className="pixel-btn bg-destructive/80 p-1 text-white hover:bg-destructive"
              aria-label={`ปิดหน้าต่าง ${title} (Esc)`}
              title="ปิดหน้าต่าง (Esc)"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">{children}</div>
      </section>
    )
  }

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-1.5 sm:p-3 md:p-5"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="pixel-panel flex max-h-[calc(100dvh-0.75rem)] w-full max-w-3xl flex-col sm:max-h-[calc(100dvh-1.5rem)]"
      >
        <header className="flex items-center justify-between gap-2 border-b-2 border-border bg-secondary px-3 py-2 sm:px-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg text-primary">{title}</h2>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {!hideGold && <span className="text-sm text-gold">{formatNum(g.p?.gold ?? 0)} G</span>}
            <button
              type="button"
              onClick={() => handleClose()}
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
  ...rest
}: {
  children: ReactNode
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'accent' | 'danger'
  type?: 'button' | 'submit'
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick' | 'disabled' | 'type' | 'className'>) {
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
      {...rest}
    >
      {children}
    </button>
  )
}
