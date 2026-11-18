'use client'

import { useEffect, useRef } from 'react'
import {
  action,
  castSkill,
  closePanel,
  currentMap,
  drinkPotion,
  game,
  interactWithNpc,
  notify,
  openPanel,
  saveGame,
  toggleMountRiding,
  toggleZenHud,
  triggerDodgeDash,
  triggerOpenWorldGuard,
  triggerUltimateSkill,
  update,
  useQuickSlot,
} from '@/lib/game/engine'
import { TILE } from '@/lib/game/maps'
import { render, screenToWorld } from '@/lib/game/renderer'
import { getUiPreferences } from '@/lib/game/ui-layout'

const MOVE_KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'])

export function GameCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  const hitTestWorldTargets = (clientX: number, clientY: number) => {
    const canvas = ref.current
    const p = game.p
    if (!canvas || !p) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    const world = screenToWorld(clientX - rect.left, clientY - rect.top, rect.width, rect.height)
    const map = currentMap()

    let bestNpc: (typeof map.npcs)[number] | null = null
    let bestNpcScore = Number.POSITIVE_INFINITY
    for (const n of map.npcs) {
      const fx = n.x * TILE
      const fy = n.y * TILE + 8
      const withinBodyOrLabel =
        world.x >= fx - 20 &&
        world.x <= fx + 20 &&
        world.y >= fy - 56 &&
        world.y <= fy + 12
      if (!withinBodyOrLabel) continue
      const score = Math.hypot(world.x - fx, world.y - (fy - 16))
      if (score < bestNpcScore) {
        bestNpcScore = score
        bestNpc = n
      }
    }
    if (bestNpc) {
      return { kind: 'npc' as const, npc: bestNpc }
    }

    const clickedRemote = game.remotePlayers
      .filter((other) => !other.invisible && other.mapId === p.mapId)
      .filter((other) => {
        const rx = other.x
        const ry = other.y
        return world.x >= rx - 20 && world.x <= rx + 20 && world.y >= ry - 52 && world.y <= ry + 12
      })
      .sort((a, b) => Math.hypot(a.x - world.x, a.y - world.y) - Math.hypot(b.x - world.x, b.y - world.y))[0]

    if (clickedRemote && Math.hypot(clickedRemote.x - p.x, clickedRemote.y - p.y) < 110) {
      return { kind: 'remote' as const, remote: clickedRemote }
    }

    return null
  }

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const font = getComputedStyle(document.body).fontFamily
    let dpr = 1
    let raf = 0
    let last = performance.now()
    let uiAcc = 0

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const r = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(r.width * dpr))
      canvas.height = Math.max(1, Math.floor(r.height * dpr))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      try {
        update(dt)
        render(ctx, canvas.width, canvas.height, dpr, font)
      } catch (error) {
        console.error('[v0] Game frame error:', error)
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.globalAlpha = 1
      }
      uiAcc += dt
      if (uiAcc > 0.12) {
        uiAcc = 0
        let hasActiveSkillCd = false
        for (const k in game.skillCd) {
          if (game.skillCd[k] > 0) {
            hasActiveSkillCd = true
            break
          }
        }
        let hasActiveItemCd = false
        for (const k in game.itemCd) {
          if (game.itemCd[k] > 0) {
            hasActiveItemCd = true
            break
          }
        }
        if (hasActiveSkillCd || hasActiveItemCd || game.guardCd > 0 || game.dashCd > 0 || game.comboCount > 0) {
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

      // Quick Item Bar 1-0 (always active in 'f-keys' preset, or Shift+Digit in 'legacy-1-3')
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
      cancelAnimationFrame(raf)
      ro.disconnect()
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
      onPointerMove={(e) => {
        const canvas = ref.current
        if (!canvas) return
        const hit = hitTestWorldTargets(e.clientX, e.clientY)
        canvas.style.cursor = hit ? 'pointer' : 'default'
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.cursor = 'default'
      }}
      onClick={(e) => {
        const hit = hitTestWorldTargets(e.clientX, e.clientY)
        if (hit?.kind === 'npc') {
          interactWithNpc(hit.npc, 120)
          return
        }
        if (hit?.kind === 'remote') {
          game.socialTargetId = hit.remote.userId
          notify()
          return
        }
        const target = game.remotePlayers
          .filter((other) => !other.invisible && other.mapId === game.p?.mapId)
          .sort((a, b) => Math.hypot(a.x - (game.p?.x ?? 0), a.y - (game.p?.y ?? 0)) - Math.hypot(b.x - (game.p?.x ?? 0), b.y - (game.p?.y ?? 0)))[0]
        if (target && game.p && Math.hypot(target.x - game.p.x, target.y - game.p.y) < 64) {
          game.socialTargetId = target.userId
          notify()
        }
      }}
      className="absolute inset-0 h-full w-full touch-none"
      aria-label="หน้าจอเกม ใช้ WASD หรือปุ่มลูกศรเพื่อเดิน คลิก NPC หรือตัวละครใกล้เคียงเพื่อใช้งาน"
    />
  )
}
