'use client'

import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { Eye, RotateCw } from 'lucide-react'
import { ITEMS } from '@/lib/game/data'
import {
  cancelNameChangeTicketAction,
  checkPendingStripeTopupAction,
  confirmNameChangeTicketAction,
  game,
  say,
  toggleZenHud,
  verifyStripeTopupAction,
} from '@/lib/game/engine'
import { preloadTileAssets } from '@/lib/game/hd-assets'
import { syncLatestMonsterAssetsAndFirestore } from '@/lib/firebase/monster-sync'
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
  const [mobileCombatReveal, setMobileCombatReveal] = useState(false)
  const [renameInput, setRenameInput] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const handledTopupSessionRef = useRef<string | null>(null)
  const isPlaying = Boolean(g.p)

  useEffect(() => {
    preloadTileAssets()
    void syncLatestMonsterAssetsAndFirestore({ mapId: game.p?.mapId })
  }, [])

  useEffect(() => {
    document.body.dataset.state = isPlaying ? 'playing' : 'title'
  }, [isPlaying])

  useEffect(() => {
    if (!isPlaying || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('topup_session_id')?.trim()
    const cancelled = params.get('topup_cancelled')

    const cleanUrl = () => {
      const url = new URL(window.location.href)
      url.searchParams.delete('topup_session_id')
      url.searchParams.delete('topup_order')
      url.searchParams.delete('topup_cancelled')
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash)
    }

    if (cancelled === '1') {
      cleanUrl()
      say('system', 'ยกเลิกการชำระเงินเติมเพชรแล้ว')
      return
    }

    const tryVerify = () => {
      const user = auth.currentUser
      if (!user || !user.emailVerified) return
      if (!sessionId) {
        if (handledTopupSessionRef.current !== 'checked_pending') {
          handledTopupSessionRef.current = 'checked_pending'
          void checkPendingStripeTopupAction()
        }
        return
      }
      if (handledTopupSessionRef.current === sessionId) return
      handledTopupSessionRef.current = sessionId
      void verifyStripeTopupAction({ sessionId }).then((res) => {
        cleanUrl()
        if (!res.ok) {
          say('system', res.message)
        }
      })
    }

    tryVerify()
    const unsub = onAuthStateChanged(auth, () => {
      tryVerify()
    })
    return () => unsub()
  }, [isPlaying])

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
  const isShortViewport = uiLayout.viewport.height < 560
  const isNarrowTouch = showTouch && uiLayout.viewport.width < 620
  const isCombatActive = g.combatT < 4 || g.autoFarm
  const isMobileCleanCombat =
    (showTouch || isMobileViewport || isShortViewport) &&
    uiLayout.preferences.autoHideCombatHud &&
    isCombatActive
  const hideLeftSecondaryHud = isMobileCleanCombat && !mobileCombatReveal

  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      <GameCanvas />

      <div className="game-ui pointer-events-none absolute inset-0">
        {showTouch && <TouchControls />}

        {/* ZONE 1 & 3: มุมซ้ายบน (Profile, HP/MP/EXP, Gold/Diamond/CP) + ด้านซ้าย (Quest Tracker) */}
        <div className="pointer-events-none absolute left-1.5 top-1.5 z-20 flex w-[11.75rem] flex-col gap-0.5 sm:left-2 sm:top-2 sm:w-[13rem] sm:gap-1 lg:w-[15.25rem]">
          <CharacterBar compact={isCompactHud || isMobileCleanCombat} />
          <Hud compact={isCompactHud || isMobileCleanCombat} slim={isShortViewport || isMobileCleanCombat} />
          {!g.zenHud && !hideLeftSecondaryHud && (
            <>
              <QuestTrackerWidget compactViewport={isShortViewport} />
              <GmToolsWidget />
            </>
          )}
          {!g.zenHud && isMobileCleanCombat && (
            <button
              type="button"
              onClick={() => setMobileCombatReveal((v) => !v)}
              className="pointer-events-auto pixel-panel flex w-fit items-center gap-1 px-2 py-0.5 text-[9px] font-semibold text-amber-200/90 shadow hover:text-foreground"
            >
              <Eye className="size-2.5" aria-hidden />
              {hideLeftSecondaryHud ? 'แสดงภารกิจ' : 'ย่อหน้าจอสู้'}
            </button>
          )}
        </div>

        {/* ZONE 2 & 4: มุมบนขวา (เมนูไอคอนลอยเรียงซ้ายของ Minimap + Minimap/World Info ขวาสุด) */}
        <div className="pointer-events-none absolute right-2 top-1.5 z-20 flex flex-col items-end gap-1 sm:top-2 sm:flex-row sm:items-start sm:justify-end sm:gap-2.5">
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
                isNarrowTouch ? 'bottom-[9.25rem]' : 'bottom-1.5 sm:bottom-2'
              }`}
            >
              {!showTouch && <SkillBar compactTouchMode={isMobileViewport} />}
              <QuickItemBar compact={isMobileViewport || showTouch || isShortViewport} />
            </div>

            {/* Bottom Right: Character Controls (Auto-Farm, Mount, Gather, Combo) */}
            <div
              className={`pointer-events-none absolute right-1.5 z-20 sm:right-2 ${
                showTouch
                  ? uiLayout.viewport.width < 1024
                    ? 'bottom-[5.75rem]'
                    : 'bottom-[7.25rem]'
                  : 'bottom-2'
              }`}
            >
              <CharacterControlBar compactTouchMode={showTouch || isMobileViewport || isShortViewport} />
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

        {g.pendingNameChangeUid && (
          <div
            className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-ticket-title"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const res = confirmNameChangeTicketAction(renameInput)
                if (!res.ok) {
                  setRenameError(res.message)
                  return
                }
                setRenameInput('')
                setRenameError(null)
              }}
              className="pixel-panel w-full max-w-sm space-y-3 p-4 shadow-2xl"
            >
              <div>
                <h2 id="rename-ticket-title" className="text-sm font-bold text-primary">
                  ใช้บัตรเปลี่ยนชื่อตัวละคร
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  ชื่อปัจจุบัน: <strong className="text-foreground">{g.p.name}</strong> · กรอกชื่อใหม่ 1–16 ตัวอักษร
                </p>
              </div>
              <input
                type="text"
                maxLength={16}
                autoFocus
                value={renameInput}
                onChange={(e) => {
                  setRenameInput(e.target.value)
                  if (renameError) setRenameError(null)
                }}
                placeholder="กรอกชื่อตัวละครใหม่..."
                className="w-full border-2 border-border bg-input px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
              {renameError && <p className="text-[11px] font-medium text-destructive">{renameError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRenameInput('')
                    setRenameError(null)
                    cancelNameChangeTicketAction()
                  }}
                  className="pixel-btn bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:brightness-110"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="pixel-btn bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110"
                >
                  ยืนยันเปลี่ยนชื่อ
                </button>
              </div>
            </form>
          </div>
        )}

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
