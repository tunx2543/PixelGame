'use client'

import { useEffect, useRef } from 'react'
import { JOBS, MONSTERS, normalizeJobId, type WeaponType } from '@/lib/game/data'
import { getJobModelSpec, getMonsterModelSpec, getMountModelSpec, getPetModelSpec } from '@/lib/game/models-2d'
import {
  type Dir,
  humanSprite,
  jobHumanColors,
  monsterSprite,
  mountSprite,
  petSprite,
  type SpriteAction,
} from '@/lib/game/sprites'
import { drawRebirthAura } from '@/lib/game/vfx-canvas'

export type PreviewAction = SpriteAction | 'auto'

export interface SpriteModelCanvasProps {
  mode: 'job' | 'monster' | 'pet' | 'mount'
  id: string
  action?: PreviewAction
  dir?: Dir
  weaponOverride?: WeaponType | null
  weaponColorOverride?: string
  size?: number
  scale?: number
  isGm?: boolean
  rebirthCount?: number
  showShadow?: boolean
  showAura?: boolean
  variant?: 'full' | 'portrait'
  className?: string
  label?: string
  onAutoPhaseChange?: (phase: SpriteAction) => void
}

export function SpriteModelCanvas({
  mode,
  id,
  action = 'idle',
  dir = 'down',
  weaponOverride,
  weaponColorOverride,
  size = 88,
  scale,
  isGm,
  rebirthCount = 0,
  showShadow = true,
  showAura = true,
  variant = 'full',
  className = '',
  label,
  onAutoPhaseChange,
}: SpriteModelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const phaseCallbackRef = useRef(onAutoPhaseChange)
  phaseCallbackRef.current = onAutoPhaseChange

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let rafId = 0
    let isVisible = true
    let lastDrawAt = 0
    let lastSig = ''
    let lastPhase: SpriteAction | null = null
    const start = performance.now()

    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              const visible = entries[0]?.isIntersecting ?? true
              isVisible = visible
              if (visible && !reducedMotion && rafId === 0) {
                lastDrawAt = 0
                rafId = requestAnimationFrame(renderFrame)
              }
            },
            { threshold: 0.05 },
          )
        : null
    observer?.observe(canvas)

    const renderFrame = (now: number) => {
      rafId = 0
      if (!isVisible) return

      const elapsed = reducedMotion ? 0 : (now - start) / 1000
      let effectiveAction: SpriteAction = action === 'auto' ? 'idle' : action
      let attackProgress = 0

      if (action === 'auto' && !reducedMotion) {
        const cycle = elapsed % 5.1
        if (cycle < 1.35) {
          effectiveAction = 'idle'
        } else if (cycle < 2.7) {
          effectiveAction = 'walk'
        } else if (cycle < 3.8) {
          effectiveAction = 'attack'
          attackProgress = (cycle - 2.7) / 1.1
        } else {
          effectiveAction = 'skill'
          attackProgress = (cycle - 3.8) / 1.3
        }
      } else if (action === 'attack' || action === 'skill') {
        attackProgress = reducedMotion ? 0.5 : (elapsed * 1.45) % 1
      }

      if (lastPhase !== effectiveAction) {
        lastPhase = effectiveAction
        phaseCallbackRef.current?.(effectiveAction)
      }

      const throttleMs = mode === 'monster' && effectiveAction === 'walk' ? 40 : effectiveAction === 'idle' ? 110 : 75
      if (!reducedMotion && lastDrawAt > 0 && now - lastDrawAt < throttleMs) {
        rafId = requestAnimationFrame(renderFrame)
        return
      }
      lastDrawAt = now

      const isAttack = effectiveAction === 'attack'
      const isSkill = effectiveAction === 'skill'
      const attackFrame = isAttack ? Math.min(3, Math.floor(attackProgress * 4)) : 0
      const skillFrame = isSkill ? Math.min(3, Math.floor(attackProgress * 4)) : 0
      const walkMod = 4
      const frame = isSkill
        ? skillFrame
        : isAttack
          ? attackFrame
          : effectiveAction === 'walk'
            ? Math.floor(elapsed * (mode === 'job' ? 8.5 : 8.0)) % walkMod
            : mode === 'job' && !reducedMotion && Math.sin(elapsed * 1.4) > 0.96
              ? -1
              : Math.floor(elapsed * 2.6) % 4

      let spriteImg: HTMLCanvasElement
      let auraColor: string | undefined
      let isFlying = false
      let isGhost = false
      let isBoss = false

      if (mode === 'job') {
        const jobDef = JOBS[normalizeJobId(id)]
        const spec = getJobModelSpec(jobDef.id)
        const colors = jobHumanColors(jobDef.id, jobDef.colors, false)
        const weapon = weaponOverride !== undefined ? weaponOverride : (jobDef.weaponTypes[0] ?? 'stick')
        const wColor = weaponColorOverride ?? jobDef.colors.accent
        spriteImg = humanSprite(
          colors,
          dir,
          frame,
          weapon,
          wColor,
          isAttack,
          effectiveAction,
          isAttack ? attackFrame : isSkill ? skillFrame : undefined,
        )
        auraColor = spec.auraColor
      } else if (mode === 'pet') {
        const spec = getPetModelSpec(id)
        const petAction: SpriteAction = effectiveAction === 'skill' ? 'attack' : effectiveAction
        spriteImg = petSprite(spec.petId, dir, petAction, frame, attackFrame)
        auraColor = spec.auraColor
        isFlying = spec.floating
      } else if (mode === 'mount') {
        const spec = getMountModelSpec(id)
        const mountAction: SpriteAction = effectiveAction === 'skill' ? 'attack' : effectiveAction
        spriteImg = mountSprite(spec.mountId, dir, mountAction, frame, attackFrame)
        auraColor = spec.auraColor
        isFlying = spec.flying
      } else {
        const monDef = MONSTERS[id] ?? MONSTERS.slime
        const spec = getMonsterModelSpec(monDef.id, monDef.sprite, monDef.color)
        spriteImg = monsterSprite(
          monDef.sprite,
          monDef.color,
          frame,
          isAttack,
          effectiveAction,
          dir,
          attackFrame,
          monDef.id,
        )
        auraColor = spec.auraColor
        isFlying = spec.flying
        isGhost = monDef.sprite === 'ghost'
        isBoss = Boolean(monDef.boss)
      }

      const hoverY = isFlying && !reducedMotion ? Math.round(Math.sin(elapsed * 4.2) * 3 - 4) : 0
      const lungeOffset =
        isAttack && !reducedMotion
          ? Math.round(Math.sin(attackProgress * Math.PI) * (dir === 'left' ? -4 : dir === 'right' ? 4 : 0))
          : 0
      const slashBucket = isAttack && attackProgress > 0.2 && attackProgress < 0.85 ? Math.round(attackProgress * 6) : -1
      const hasRebirth = mode === 'job' && rebirthCount > 0
      const auraBucket =
        showAura && (auraColor || hasRebirth) && !reducedMotion
          ? Math.round(elapsed * 8)
          : 0
      const gmReady = spriteImg.dataset?.gmReady === '1'
      const mMotionBucket =
        mode === 'monster' && (effectiveAction === 'walk' || effectiveAction === 'idle') && !reducedMotion
          ? Math.round(elapsed * 24)
          : 0
      const sheetId = spriteImg.dataset?.sheetId ?? ''
      const sig = `${effectiveAction}|${frame}|${hoverY}|${lungeOffset}|${slashBucket}|${auraBucket}|${rebirthCount}|${gmReady ? '1' : '0'}|${sheetId}|${mMotionBucket}`

      if (sig !== lastSig) {
        lastSig = sig
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        const hdScale = spriteImg.dataset?.hdScale ? Number(spriteImg.dataset.hdScale) : 1
        if (variant === 'portrait' && mode === 'job') {
          const isSheet = Boolean(spriteImg.dataset?.sheetId)
          const baseCropW = gmReady ? 30 : isSheet ? 30 : 28
          const baseCropH = gmReady ? 26 : isSheet ? 28 : 24
          const cropW = Math.min(spriteImg.width, Math.round(baseCropW * hdScale))
          const cropH = Math.min(spriteImg.height, Math.round(baseCropH * hdScale))
          const sx = Math.max(0, Math.round((spriteImg.width - cropW) / 2))
          const sy = gmReady ? 7 : Math.round((isSheet ? 5 : 3) * hdScale)
          ctx.drawImage(spriteImg, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height)
        } else {
          const padW = canvas.width * (hasRebirth && showAura ? (rebirthCount >= 5 ? 0.54 : 0.66) : gmReady ? 0.98 : 0.9)
          const padH = canvas.height * (hasRebirth && showAura ? (rebirthCount >= 5 ? 0.54 : 0.66) : gmReady ? 0.96 : 0.86)
          const computedScale =
            scale ??
            Math.max(0.4, Math.min(padW / spriteImg.width, padH / spriteImg.height))
          const drawW = Math.round(spriteImg.width * computedScale)
          const drawH = Math.round(spriteImg.height * computedScale)

          const centerX = Math.round(canvas.width / 2)
          const baseFloorY = Math.round(canvas.height * (hasRebirth && showAura ? (rebirthCount >= 5 ? 0.81 : 0.84) : 0.89))
          const footPad = gmReady ? Math.round(9 * computedScale) : Math.round(2 * computedScale)
          const auraRadiusX = Math.max(11, Math.round(drawW * (rebirthCount >= 5 ? 0.48 : 0.45)))

          if (showShadow) {
            ctx.save()
            ctx.fillStyle = 'rgba(0, 0, 0, 0.38)'
            const shadowRx = Math.max(8, Math.round(drawW * 0.3))
            const shadowRy = Math.max(3, Math.round(shadowRx * 0.34))
            ctx.beginPath()
            ctx.ellipse(centerX + lungeOffset, baseFloorY, shadowRx, shadowRy, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
          }

          if (showAura && hasRebirth) {
            drawRebirthAura(ctx, {
              x: centerX + lungeOffset,
              y: baseFloorY,
              timeSec: elapsed,
              rebirthCount,
              radiusX: auraRadiusX,
              spriteHeight: drawH,
              layer: 'back',
            })
          } else if (showAura && auraColor) {
            ctx.save()
            ctx.strokeStyle = auraColor
            ctx.lineWidth = isBoss ? 2 : 1.5
            ctx.globalAlpha = 0.34 + (reducedMotion ? 0 : Math.sin(elapsed * 4.2) * 0.14)
            const auraRx = Math.max(11, Math.round(drawW * 0.38))
            const auraRy = Math.max(4, Math.round(auraRx * 0.34))
            ctx.beginPath()
            ctx.ellipse(centerX + lungeOffset, baseFloorY - 1, auraRx, auraRy, 0, 0, Math.PI * 2)
            ctx.stroke()
            ctx.restore()
          }

          ctx.save()
          if (isGhost) {
            ctx.globalAlpha = 0.84 + (reducedMotion ? 0 : Math.sin(elapsed * 4) * 0.08)
          }
          const isMonsterWalk = mode === 'monster' && effectiveAction === 'walk' && !reducedMotion
          const isMonsterIdle = mode === 'monster' && effectiveAction === 'idle' && !reducedMotion
          const isBouncyMonster = mode === 'monster' && (id.includes('slime') || id === 'mushroom' || id === 'rabbit')
          const mBounce = isMonsterWalk
            ? -Math.abs(Math.sin(elapsed * 9.0)) * (isBouncyMonster ? 6 : isFlying ? 3 : 4)
            : 0
          const mSx = isMonsterWalk
            ? (isBouncyMonster ? 1 - Math.sin(elapsed * 18) * 0.055 : 1 + Math.cos(elapsed * 9) * 0.025)
            : isMonsterIdle
              ? 1 - Math.sin(elapsed * 2.8) * 0.018
              : 1
          const mSy = isMonsterWalk
            ? (isBouncyMonster ? 1 + Math.sin(elapsed * 18) * 0.055 : 1 - Math.cos(elapsed * 9) * 0.025)
            : isMonsterIdle
              ? 1 + Math.sin(elapsed * 2.8) * 0.022
              : 1
          const mTilt = isMonsterWalk && !isBouncyMonster ? Math.sin(elapsed * 9.0) * 0.04 : 0

          const drawX = Math.round(centerX + lungeOffset)
          const drawAnchorY = Math.round(baseFloorY + hoverY + mBounce)
          ctx.save()
          ctx.translate(drawX, drawAnchorY)
          if (mTilt !== 0) ctx.rotate(mTilt)
          ctx.scale(mSx, mSy)
          ctx.drawImage(
            spriteImg,
            Math.round(-drawW / 2),
            Math.round(-drawH + footPad),
            drawW,
            drawH,
          )
          ctx.restore()

          if (isAttack && !gmReady && !spriteImg.dataset?.sheetId && attackProgress > 0.2 && attackProgress < 0.85) {
            const slashAlpha = Math.max(0, 1 - Math.abs(attackProgress - 0.5) * 2.4)
            ctx.globalAlpha = slashAlpha
            ctx.strokeStyle = auraColor ?? '#ffd60a'
            ctx.lineWidth = 2
            const arcCenterX =
              centerX + lungeOffset + (dir === 'left' ? -drawW * 0.14 : dir === 'right' ? drawW * 0.14 : 0)
            const arcCenterY = baseFloorY + hoverY - drawH * 0.45
            const arcRadius = Math.min(Math.round(canvas.width * 0.24), Math.max(9, Math.round(drawW * 0.28)))
            const baseA = dir === 'left' ? Math.PI : dir === 'up' ? -Math.PI / 2 : dir === 'down' ? Math.PI / 2 : 0
            ctx.beginPath()
            ctx.arc(arcCenterX, arcCenterY, arcRadius, baseA - 0.85, baseA + 0.85)
            ctx.stroke()
          }
          ctx.restore()

          if (showAura && hasRebirth) {
            drawRebirthAura(ctx, {
              x: centerX + lungeOffset,
              y: baseFloorY,
              timeSec: elapsed,
              rebirthCount,
              radiusX: auraRadiusX,
              spriteHeight: drawH,
              layer: 'front',
            })
          }
        }
      }

      if (!reducedMotion && isVisible) {
        rafId = requestAnimationFrame(renderFrame)
      }
    }

    rafId = requestAnimationFrame(renderFrame)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      observer?.disconnect()
    }
  }, [mode, id, action, dir, weaponOverride, weaponColorOverride, size, scale, isGm, rebirthCount, showShadow, showAura, variant])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      aria-label={label ?? `โมเดล 2D ${id}`}
      className={`block shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
