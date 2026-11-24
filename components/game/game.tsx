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
import { AsuraBuffAndToggleStrip, Hud } from './hud'
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
import { SkillBar } from './skill-bar'
import { SocialNotifications } from './social-notifications'
import { SocialPopover } from './social-popover'
import { TargetMonsterBar } from './target-monster-bar'
import { TitleScreen } from './title-screen'
import { TouchControls } from './touch-controls'
import { TopAnnouncementTicker, WorldBanner } from './world-banner'
import { WorldBossVictoryOverlay } from './world-boss-victory-overlay'

function LootToast() {
  const loot = game.lootToast
  const item = loot ? ITEMS[loot.itemId] : null
  if (!loot || !item || loot.until <= game.time) return null
  return (
    <div
      data-testid="rare-loot-toast"
      className="pointer-events-auto pixel-panel absolute left-1/2 top-9 z-50 flex max-w-[min(16rem,72vw)] -translate-x-1/2 items-center gap-2 px-2.5 py-1 shadow-xl"
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
      setIsTouchDevice((prev) => prev || coarse)
      setNarrowPortrait(window.innerWidth < 640 && window.innerHeight > window.innerWidth)
    }
    const handleFirstTouch = () => {
      setIsTouchDevice(true)
    }
    const handleToggleTouch = () => {
      setTouchOverride((prev) => !(prev ?? isTouchDevice))
    }
    checkViewport()
    window.addEventListener('resize', checkViewport)
    window.addEventListener('touchstart', handleFirstTouch, { passive: true, once: true })
    window.addEventListener('pixelquest:toggle-touch', handleToggleTouch)
    return () => {
      window.removeEventListener('resize', checkViewport)
      window.removeEventListener('touchstart', handleFirstTouch)
      window.removeEventListener('pixelquest:toggle-touch', handleToggleTouch)
    }
  }, [isTouchDevice])

  if (!g.p) return <TitleScreen />

  const showTouch = touchOverride ?? isTouchDevice
  const isCompactHud = g.zenHud || uiLayout.preferences.compactHud
  const isMobileViewport = uiLayout.viewport.width < 768
  const isShortViewport = uiLayout.viewport.height < 560
  const isCombatActive = g.combatT < 4 || g.autoFarm
  const isMobileCleanCombat =
    (showTouch || isMobileViewport || isShortViewport) &&
    uiLayout.preferences.autoHideCombatHud &&
    isCombatActive
  const hideLeftSecondaryHud = isMobileCleanCombat && !mobileCombatReveal
  const wbFx = g.worldBossMapFx
  const showWbScreenFlash = Boolean(
    wbFx &&
      !uiLayout.preferences.disableShadowsAndGlow &&
      g.time >= wbFx.startedAt &&
      g.time - wbFx.startedAt < wbFx.duration,
  )
  const reduceFlashIntensity = uiLayout.preferences.reduceParticles || uiLayout.preferences.graphicsQuality === 'low'

  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      <GameCanvas />

      {showWbScreenFlash && wbFx && (
        <div
          key={`wb-flash-${wbFx.id}`}
          aria-hidden
          data-testid="world-boss-screen-flash"
          className={`pointer-events-none absolute inset-0 z-[25] bg-white world-boss-screen-flash ${
            reduceFlashIntensity ? '[--wb-flash-peak:0.38]' : '[--wb-flash-peak:0.78]'
          }`}
        />
      )}

      <div className="game-ui pointer-events-none absolute inset-0">
        {showTouch && <TouchControls />}

        {/* Top Announcement Ticker */}
        {!g.zenHud && <TopAnnouncementTicker />}

        {/* ZONE 1: มุมซ้ายบน — Unit Frame + Quest/Party Strip + Buff Timer Strip + PK/Auto/Mount Toggles */}
        <div className="pointer-events-none absolute left-1.5 top-1.5 z-20 flex items-start gap-2 sm:left-2 sm:top-2">
          <div className="flex w-[11.25rem] flex-col gap-1 sm:w-[13.5rem]">
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

          {!g.zenHud && (
            <div className="hidden pt-1 sm:block">
              <AsuraBuffAndToggleStrip />
            </div>
          )}
        </div>

        {/* ZONE 2: มุมบนขวา — 3 Circular Asura Buttons (ตัวช่วย, ร้าน, เมนู) + Translucent Square Minimap + 4 Shortcut Circles */}
        <div className="pointer-events-none absolute right-1.5 top-1.5 z-20 flex items-start justify-end gap-1.5 sm:right-2 sm:top-2 sm:gap-2.5">
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

        {/* ZONE 3: ล่างกลาง (Chat ▲), ขวาล่าง (2-Column Vertical Skill/Item Hotbar) */}
        {!g.zenHud && (
          <>
            <TargetMonsterBar offsetTouch={showTouch} />

            <ChatBox offsetTouch={showTouch} />

            {!showTouch && (
              <div className="pointer-events-none fixed bottom-1.5 right-1.5 z-20 sm:bottom-2 sm:right-2">
                <SkillBar compactTouchMode={isMobileViewport || isShortViewport} />
              </div>
            )}
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
        <WorldBossVictoryOverlay />

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
