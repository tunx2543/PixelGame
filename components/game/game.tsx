'use client'

import { useEffect, useState } from 'react'
import { Eye, RotateCw } from 'lucide-react'
import { ITEMS } from '@/lib/game/data'
import { game, toggleZenHud } from '@/lib/game/engine'
import { useUiLayout } from '@/lib/game/ui-layout'
import { useGame } from '@/lib/game/use-game'
import { CharacterBar } from './character-bar'
import { ChatBox } from './chat-box'
import { CheckinModal } from './checkin-modal'
import { GameCanvas } from './game-canvas'
import { GmToolsWidget } from './gm-tools-widget'
import { Hud } from './hud'
import { ItemIcon } from './item-icon'
import { KillRewardToast } from './kill-reward-toast'
import { MenuDock } from './menu-dock'
import { OfflineAfkModal } from './offline-afk-modal'
import { Panels } from './panels/panels'
import { PartyPopover } from './party-popover'
import { PlayerActionMenu } from './player-action-menu'
import { PlayerInspectModal } from './player-inspect-modal'
import { PresenceSync } from './presence-sync'
import { QuestTrackerWidget } from './quest-tracker-widget'
import { QuickItemBar } from './quick-item-bar'
import { CharacterControlBar, SkillBar } from './skill-bar'
import { SocialNotifications } from './social-notifications'
import { SocialPopover } from './social-popover'
import { TitleScreen } from './title-screen'
import { TouchControls } from './touch-controls'
import { WorldBanner } from './world-banner'

function LootToast() {
  const loot = game.lootToast
  const item = loot ? ITEMS[loot.itemId] : null
  if (!loot || !item || loot.until <= game.time) return null
  return (
    <div
      data-testid="rare-loot-toast"
      className="pointer-events-auto pixel-panel absolute left-1/2 top-2 z-50 flex max-w-[min(16rem,72vw)] -translate-x-1/2 items-center gap-2 px-2.5 py-1 shadow-xl sm:top-3"
      role="status"
    >
      <ItemIcon itemId={item.id} size={22} />
      <span className="min-w-0 leading-tight">
        <strong className="block truncate text-[10px] text-yellow-300">ดรอปแรร์! {item.name}</strong>
        <span className="block text-[9px] text-muted-foreground">โอกาสดรอป 1%</span>
      </span>
    </div>
  )
}

export function Game() {
  const g = useGame()
  const uiLayout = useUiLayout()
  const [showCheckin, setShowCheckin] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [touchOverride, setTouchOverride] = useState<boolean | null>(null)
  const [narrowPortrait, setNarrowPortrait] = useState(false)
  const [portraitDismissed, setPortraitDismissed] = useState(false)

  useEffect(() => {
    document.body.dataset.state = g.p ? 'playing' : 'title'
  }, [g.p])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const checkViewport = () => {
      const coarse = window.matchMedia('(pointer: coarse)').matches
      setIsTouchDevice(coarse)
      setNarrowPortrait(window.innerWidth < 640 && window.innerHeight > window.innerWidth)
    }
    const handleToggleTouch = () => {
      setTouchOverride((prev) => !(prev ?? isTouchDevice))
    }
    checkViewport()
    window.addEventListener('resize', checkViewport)
    window.addEventListener('pixelquest:toggle-touch', handleToggleTouch)
    return () => {
      window.removeEventListener('resize', checkViewport)
      window.removeEventListener('pixelquest:toggle-touch', handleToggleTouch)
    }
  }, [isTouchDevice])

  if (!g.p) return <TitleScreen />

  const showTouch = touchOverride ?? isTouchDevice
  const isCompactHud = g.zenHud || uiLayout.preferences.compactHud
  const isMobileViewport = uiLayout.viewport.width < 768

  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      <GameCanvas />

      <div className="game-ui pointer-events-none absolute inset-0">
        {showTouch && <TouchControls />}

        {/* ZONE 1 & 3: มุมซ้ายบน (Profile, HP/MP/EXP, Gold/Diamond/CP) + ด้านซ้าย (Quest Tracker) */}
        <div className="pointer-events-none absolute left-2 top-2 z-20 flex w-[11rem] flex-col gap-1 sm:w-[14.75rem]">
          <CharacterBar compact={isCompactHud} />
          <Hud compact={isCompactHud} />
          {!g.zenHud && (
            <>
              <QuestTrackerWidget />
              <GmToolsWidget />
            </>
          )}
        </div>

        {/* ZONE 2 & 4: มุมบนขวา (Primary Menu Dock) + ด้านขวา (Minimap, Friends, Party, World Info) */}
        <div className="pointer-events-none absolute right-2 top-2 z-20 flex flex-col items-end gap-1">
          {g.zenHud ? (
            <button
              type="button"
              onClick={() => toggleZenHud(false)}
              className="pointer-events-auto pixel-panel flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold text-primary shadow-lg hover:bg-secondary"
            >
              <Eye className="size-3.5" aria-hidden />
              แสดง UI (H)
            </button>
          ) : (
            <>
              <MenuDock
                showTouch={showTouch}
                onToggleTouch={() => setTouchOverride((prev) => !(prev ?? isTouchDevice))}
                onOpenCheckin={() => setShowCheckin(true)}
              />
              <WorldBanner />
            </>
          )}
        </div>

        {/* ZONE 5: ด้านล่าง (Chat ซ้าย, Skill Bar + Quick Item Bar กลาง, Character Controls ขวา) */}
        {!g.zenHud && (
          <>
            <ChatBox offsetTouch={showTouch} />

            {/* Bottom Center: Separated Skill Bar & 10-Slot Quick Item Bar */}
            <div
              className={`pointer-events-none absolute left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 ${
                showTouch && uiLayout.viewport.width < 920 ? 'bottom-[9.75rem]' : 'bottom-2'
              }`}
            >
              {!showTouch && <SkillBar compactTouchMode={isMobileViewport} />}
              <QuickItemBar compact={isMobileViewport || showTouch} />
            </div>

            {/* Bottom Right: Character Controls (Auto-Farm, Mount, Gather, Combo) */}
            <div
              className={`pointer-events-none absolute right-2 z-20 ${
                showTouch ? 'bottom-[13.5rem]' : 'bottom-2'
              }`}
            >
              <CharacterControlBar compactTouchMode={showTouch || isMobileViewport} />
            </div>
          </>
        )}

        <PlayerActionMenu />
        <PlayerInspectModal />
        <SocialNotifications />
        <SocialPopover />
        <PartyPopover />
        <LootToast />
        <KillRewardToast />
        <PresenceSync />
        <Panels />
        {showCheckin && <CheckinModal onClose={() => setShowCheckin(false)} />}
        <OfflineAfkModal />

        {narrowPortrait && !portraitDismissed && (
          <div className="pointer-events-auto absolute inset-x-3 top-1/2 z-50 -translate-y-1/2 pixel-panel p-4 text-center shadow-2xl">
            <RotateCw className="mx-auto size-7 text-primary" aria-hidden />
            <p className="mt-2 text-sm font-bold text-primary">แนะนำให้หมุนจอเป็นแนวนอน</p>
            <p className="mt-1 text-xs text-muted-foreground">
              เกมออกแบบให้เล่นแบบแนวนอนเพื่อให้เห็นแผนที่ มอนสเตอร์ และปุ่มควบคุมได้ชัดเจนไม่บังจอ
            </p>
            <button
              type="button"
              onClick={() => setPortraitDismissed(true)}
              className="pixel-btn mt-3 bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:brightness-110"
            >
              เล่นต่อในแนวตั้ง
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
