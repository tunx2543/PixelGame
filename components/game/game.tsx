'use client'

import { useState } from 'react'
import { useGame } from '@/lib/game/use-game'
import { game } from '@/lib/game/engine'
import { AutoFarmWidget } from './auto-farm-widget'
import { CharacterBar } from './character-bar'
import { ChatBox } from './chat-box'
import { DailyMissionsWidget } from './daily-missions-widget'
import { GameCanvas } from './game-canvas'
import { GmToolsWidget } from './gm-tools-widget'
import { Hud } from './hud'
import { MenuDock } from './menu-dock'
import { Panels } from './panels/panels'
import { TitleScreen } from './title-screen'
import { PresenceSync } from './presence-sync'
import { TownServicesWidget } from './town-services-widget'
import { WorldBanner } from './world-banner'
import { TouchControls } from './touch-controls'
import { PlayerActionMenu } from './player-action-menu'
import { PartyPopover } from './party-popover'
import { SocialNotifications } from './social-notifications'
import { SocialPopover } from './social-popover'
import { ITEMS } from '@/lib/game/data'
import { CheckinModal } from './checkin-modal'
import { KillRewardToast } from './kill-reward-toast'
import { ItemIcon } from './item-icon'

function LootToast() {
  const loot = game.lootToast
  const item = loot ? ITEMS[loot.itemId] : null
  if (!loot || !item || loot.until <= game.time) return null
  return (
    <div className="pointer-events-auto absolute left-1/2 top-24 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-yellow-300/60 bg-background/95 px-3 py-2 shadow-2xl backdrop-blur" role="status">
      <ItemIcon itemId={item.id} size={44} className="rounded-md" />
      <span><strong className="block text-xs text-yellow-300">บอสทำไอเทมตก!</strong><span className="text-xs text-foreground">{item.name}</span><span className="block text-[10px] text-muted-foreground">โอกาสดรอป 1%</span></span>
    </div>
  )
}

export function Game() {
  const g = useGame()
  const [showCheckin, setShowCheckin] = useState(false)
  if (!g.p) return <TitleScreen />
  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      <GameCanvas />
      <div className="game-ui pointer-events-none absolute inset-0">
        <TouchControls />
        <div className="pointer-events-none absolute left-2 top-2 z-20 flex w-[min(12.25rem,calc(100vw-10.5rem))] flex-col gap-1.5 sm:w-[14.25rem] md:left-3 md:top-3">
          <Hud />
          <CharacterBar layout="mobile" />
          <MenuDock layout="mobile" />
          <TownServicesWidget onOpenCheckin={() => setShowCheckin(true)} />
          <DailyMissionsWidget />
          <GmToolsWidget />
        </div>
        <div className="pointer-events-none hidden md:flex absolute left-1/2 top-3 z-20 -translate-x-1/2 flex-col items-center gap-1.5">
          <CharacterBar layout="desktop" />
          <MenuDock layout="desktop" />
        </div>
        <AutoFarmWidget />
        <WorldBanner />
        <PlayerActionMenu />
        <SocialNotifications />
        <SocialPopover />
        <PartyPopover />
        <LootToast />
        <KillRewardToast />
        <ChatBox />
        <PresenceSync />
        <Panels />
        {showCheckin && <CheckinModal onClose={() => setShowCheckin(false)} />}
      </div>
    </div>
  )
}
