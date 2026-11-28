'use client'

import { useEffect, useRef } from 'react'
import {
  action,
  basicAttack,
  castSkill,
  closePanel,
  currentJob,
  currentMap,
  drinkPotion,
  game,
  interactWithNpc,
  notify,
  openPanel,
  pickupGroundDrop,
  saveGame,
  toggleMountRiding,
  toggleZenHud,
  triggerDodgeDash,
  triggerOpenWorldGuard,
  triggerUltimateSkill,
  update,
  useQuickSlot,
} from '@/lib/game/engine'
import { renderFastWorld, screenToWorldFast } from '@/lib/game/fast-renderer'
import {
  computeCanvasViewportMetrics,
  createFramePacerState,
  resolveRunnerBackend,
  shouldNotifyUiForCooldowns,
  shouldStepFrame,
  stepFrameDelta,
} from '@/lib/game/game-runner-core'
import { TILE } from '@/lib/game/maps'
import { resolveCanvasTapAction } from '@/lib/game/touch-movement'
import { getUiPreferences, subscribeUiLayout } from '@/lib/game/ui-layout'

const MOVE_KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'])

interface HdLegacyRendererModule {
  render: (
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    dpr: number,
    font: string,
  ) => void
  screenToWorld: (cssX: number, cssY: number, cssW: number, cssH: number) => { x: number; y: number }
}

export function GameRunner() {
  const ref = useRef<HTMLCanvasElement>(null)
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null)
  const lastHoverCheckRef = useRef(0)
  const hdModuleRef = useRef<HdLegacyRendererModule | null>(null)
  const hdLoadingRef = useRef(false)

  const resolveCanvasHit = (clientX: number, clientY: number) => {
    const canvas = ref.current
    const p = game.p
    if (!canvas || !p) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    const prefs = getUiPreferences()
    const resolved = resolveRunnerBackend(prefs, Boolean(hdModuleRef.current))
    const project =
      resolved.activeEngine === 'hd' && hdModuleRef.current
        ? hdModuleRef.current.screenToWorld
        : screenToWorldFast
    const world = project(clientX - rect.left, clientY - rect.top, rect.width, rect.height)
    const map = currentMap()
    return resolveCanvasTapAction(world.x, world.y, {
      tileSize: TILE,
      playerMapId: p.mapId,
      playerOwnerId: String(p.uid ?? p.name),
      npcs: map.npcs,
      groundDrops: game.groundDrops,
      monsters: game.monsters,
      remotePlayers: game.remotePlayers,
    })
  }

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let active = true
    const font = getComputedStyle(document.body).fontFamily
    let dpr = 1
    let raf = 0
    const pacer = createFramePacerState(performance.now())

    const ensureHdBackendIfRequested = (prefs: ReturnType<typeof getUiPreferences>) => {
      if (prefs.renderEngine !== 'hd' || hdModuleRef.current || hdLoadingRef.current) return
      hdLoadingRef.current = true
      void Promise.all([import('@/lib/game/renderer'), import('@/lib/game/hd-assets')])
        .then(([rendererMod, hdAssetsMod]) => {
          if (!active) return
          hdAssetsMod.preloadTileAssets()
          hdModuleRef.current = {
            render: rendererMod.render,
            screenToWorld: rendererMod.screenToWorld,
          }
          resize()
        })
        .catch((err) => {
          console.error('[game-runner] Failed to lazy-load legacy HD renderer:', err)
        })
        .finally(() => {
          hdLoadingRef.current = false
        })
    }

    const resize = () => {
      const prefs = getUiPreferences()
      ensureHdBackendIfRequested(prefs)
      const isCompact =
        window.innerWidth <= 960 ||
        window.innerHeight <= 560 ||
        (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches)
      const r = canvas.getBoundingClientRect()
      const metrics = computeCanvasViewportMetrics(
        r.width,
        r.height,
        window.devicePixelRatio || 1,
        prefs,
        isCompact,
        Boolean(hdModuleRef.current),
      )
      dpr = metrics.dpr
      canvas.width = metrics.width
      canvas.height = metrics.height
      canvas.style.imageRendering = metrics.imageRendering
      canvas.dataset.renderEngine = metrics.renderEngine
      canvas.dataset.runner = metrics.backend
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const unsubUiPrefs = subscribeUiLayout(() => {
      resize()
    })

    const loop = (now: number) => {
      const prefs = getUiPreferences()
      if (!shouldStepFrame(pacer, now, prefs.fpsLimit)) {
        raf = requestAnimationFrame(loop)
        return
      }
      const dt = stepFrameDelta(pacer, now)
      try {
        update(dt)
        const resolved = resolveRunnerBackend(prefs, Boolean(hdModuleRef.current))
        if (resolved.activeEngine === 'hd' && hdModuleRef.current) {
          hdModuleRef.current.render(ctx, canvas.width, canvas.height, dpr, font)
        } else {
          renderFastWorld(ctx, canvas.width, canvas.height, dpr, font)
        }
      } catch (error) {
        console.error('[game-runner] Frame error:', error)
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.globalAlpha = 1
      }
      pacer.uiAccumulator += dt
      if (pacer.uiAccumulator > 0.12) {
        pacer.uiAccumulator = 0
        if (
          shouldNotifyUiForCooldowns({
            skillCd: game.skillCd,
            itemCd: game.itemCd,
            guardCd: game.guardCd,
            dashCd: game.dashCd,
            comboCount: game.comboCount,
          })
        ) {
          notify()
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      const k = e.key.toLowerCase()
      const prefs = getUiPreferences()

      if (k === 'enter') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('pixelquest:open-chat'))
        window.setTimeout(() => document.getElementById('chat-input')?.focus(), 20)
        return
      }
      if (k === 'escape') {
        closePanel()
        return
      }
      if (MOVE_KEYS.has(k)) {
        game.keys.add(k)
        e.preventDefault()
        return
      }
      if (e.repeat) return

      // Skill bar F1-F4
      if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3' || e.key === 'F4') {
        e.preventDefault()
        castSkill(Number(e.key.slice(1)) - 1)
        return
      }

      // Quick Item Bar 1-0
      if (/^Digit[0-9]$/.test(e.code)) {
        const digit = Number(e.code.slice(5))
        const slotIdx = digit === 0 ? 9 : digit - 1
        if (prefs.hotkeyPreset === 'f-keys') {
          e.preventDefault()
          useQuickSlot(slotIdx)
          return
        }
        if (e.shiftKey) {
          e.preventDefault()
          useQuickSlot(slotIdx)
          return
        }
        if (digit >= 1 && digit <= 3) {
          castSkill(digit - 1)
          return
        }
      }

      if (k === ' ' || k === 'j' || k === 'e') {
        e.preventDefault()
        action()
      } else if (e.key === 'Shift') {
        e.preventDefault()
        triggerOpenWorldGuard()
      } else if (k === 'x') {
        e.preventDefault()
        triggerDodgeDash()
      } else if (k === 'u') {
        e.preventDefault()
        triggerUltimateSkill()
      } else if (k === 'h') {
        e.preventDefault()
        toggleZenHud()
      } else if (k === 'm') {
        e.preventDefault()
        toggleMountRiding()
      } else if (k === 'q' && prefs.legacyQuickPotions) {
        drinkPotion('hp')
      } else if (k === 'r' && prefs.legacyQuickPotions) {
        drinkPotion('mp')
      } else if (k === 'i') {
        openPanel('inventory')
      } else if (k === 'c') {
        openPanel('character')
      } else if (k === 'k') {
        openPanel('quests')
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      game.keys.delete(k)
      if (k === ' ' || k === 'j') game.attackHeld = false
    }
    const onBlur = () => {
      game.keys.clear()
      game.attackHeld = false
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') saveGame()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('beforeunload', saveGame)
    document.addEventListener('visibilitychange', onHide)

    return () => {
      active = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      unsubUiPrefs()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('beforeunload', saveGame)
      document.removeEventListener('visibilitychange', onHide)
      saveGame()
    }
  }, [])

  return (
    <canvas
      ref={ref}
      data-testid="game-canvas"
      onPointerDown={(e) => {
        pointerDownPosRef.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerMove={(e) => {
        const canvas = ref.current
        if (!canvas) return
        if (game.panel) {
          if (canvas.style.cursor !== 'default') canvas.style.cursor = 'default'
          return
        }
        const now = performance.now()
        if (now - lastHoverCheckRef.current < 45) return
        lastHoverCheckRef.current = now
        const hit = resolveCanvasHit(e.clientX, e.clientY)
        canvas.style.cursor = hit && hit.kind !== 'walk' ? 'pointer' : 'default'
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.cursor = 'default'
      }}
      onClick={(e) => {
        const down = pointerDownPosRef.current
        pointerDownPosRef.current = null
        if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) >= 10) {
          return
        }
        const p = game.p
        if (!p || game.panel) return
        const hit = resolveCanvasHit(e.clientX, e.clientY)
        if (!hit) return

        if (hit.kind === 'npc') {
          const dist = Math.hypot(hit.worldX - p.x, hit.worldY - p.y)
          if (dist <= 72) {
            interactWithNpc(hit.npc, 72)
          } else {
            game.moveTarget = { kind: 'npc', x: hit.worldX, y: hit.worldY, npcId: hit.npc.id }
          }
          return
        }

        if (hit.kind === 'drop') {
          const dist = Math.hypot(hit.worldX - p.x, hit.worldY - p.y)
          if (dist <= 36) {
            pickupGroundDrop(hit.drop.uid)
          } else {
            game.moveTarget = { kind: 'drop', x: hit.worldX, y: hit.worldY, targetUid: hit.drop.uid }
          }
          return
        }

        if (hit.kind === 'monster') {
          game.targetMonsterUid = hit.monster.uid
          game.targetMonsterExpiresAt = game.time + 12
          const dist = Math.hypot(hit.worldX - p.x, hit.worldY - p.y)
          const bodyBonus = hit.monster.isWorldBoss || hit.monster.defId === 'world_golem' ? 28 : 0
          const attackReach = Math.max(24, currentJob().range * 0.9) + bodyBonus
          if (dist <= attackReach) {
            basicAttack()
          } else {
            game.moveTarget = {
              kind: 'monster',
              x: hit.worldX,
              y: hit.worldY,
              targetUid: hit.monster.uid,
            }
          }
          notify()
          return
        }

        if (hit.kind === 'remote') {
          const dist = Math.hypot(hit.worldX - p.x, hit.worldY - p.y)
          if (dist < 110) {
            game.socialTargetId = hit.remote.userId
            notify()
          } else {
            game.moveTarget = { kind: 'walk', x: hit.worldX, y: hit.worldY }
          }
          return
        }

        game.moveTarget = { kind: 'walk', x: hit.worldX, y: hit.worldY }
      }}
      className="absolute inset-0 h-full w-full touch-none"
      aria-label="หน้าจอเกม แตะหรือคลิกเพื่อเดิน เก็บไอเทม โจมตี หรือคุยกับ NPC"
    />
  )
}
