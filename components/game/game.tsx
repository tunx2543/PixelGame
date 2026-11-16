'use client'

import { useEffect, useState } from 'react'
import { Eye, RotateCw } from 'lucide-react'
import { useGame } from '@/lib/game/use-game'
import { game, toggleZenHud } from '@/lib/game/engine'
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
import { OfflineAfkModal } from './offline-afk-modal'
import { KillRewardToast } from './kill-reward-toast'
import { ItemIcon } from './item-icon'
import { PlayerInspectModal } from './player-inspect-modal'

function LootToast() {
  const loot = game.lootToast
  const item = loot ? ITEMS[loot.itemId] : null
  if (!loot || !item || loot.until <= game.time) return null
  return (
    <div
      className="pointer-events-auto pixel-panel absolute left-1/2 top-16 z-50 flex -translate-x-1/2 items-center gap-3 px-3 py-2 shadow-2xl"
      role="status"
    >
      <ItemIcon itemId={item.id} size={40} />
      <span>
        <strong className="block text-xs text-yellow-300">บอสทำไอเทมตก!</strong>
        <span className="text-xs text-foreground">{item.name}</span>
        <span className="block text-[10px] text-muted-foreground">โอกาสดรอป 1%</span>
      </span>
    </div>
  )
}

export function Game() {
  const g = useGame()
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
    checkViewport()
    window.addEventListener('resize', checkViewport)
    return () => window.removeEventListener('resize', checkViewport)
  }, [])

  if (!g.p) return <TitleScreen />

  const showTouch = touchOverride ?? isTouchDevice

  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      <GameCanvas />

      <div className="game-ui pointer-events-none absolute inset-0">
        {showTouch && <TouchControls />}

        {/* มุมบนซ้าย: โปรไฟล์ + พลังชีวิต + ภารกิจย่อ */}
        <div className="pointer-events-none absolute left-2 top-12 z-20 flex w-[11rem] flex-col gap-1 sm:top-2 sm:w-[14.5rem]">
          <CharacterBar compact={g.zenHud} />
          <Hud compact={g.zenHud} />
          {!g.zenHud && (
            <>
              <TownServicesWidget onOpenCheckin={() => setShowCheckin(true)} />
              <DailyMissionsWidget />
              <GmToolsWidget />
            </>
          )}
        </div>

        {/* มุมบนขวา: แถบเมนู + มินิแมพ + สังคม */}
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
              />
              <WorldBanner />
            </>
          )}
        </div>

        {!g.zenHud && <AutoFarmWidget compactTouchMode={showTouch} />}

        {!g.zenHud && <ChatBox offsetTouch={showTouch} />}

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
