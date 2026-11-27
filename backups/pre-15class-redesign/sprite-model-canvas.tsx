'use client'

import { useEffect, useRef } from 'react'
import { normalizeMonsterId } from '@/lib/game/biome-monsters'
import { getCatalogMonsterFrameCount } from '@/lib/game/catalog-sprites'
import { JOBS, MONSTERS, normalizeJobId, type WeaponType } from '@/lib/game/data'
import { getJobModelSpec, getMonsterModelSpec, getMountModelSpec, getPetModelSpec } from '@/lib/game/models-2d'
import { getMountDef, getMountRiderSeatOffset, type MountAnimAction } from '@/lib/game/mounts'
import { getPetVisualTier } from '@/lib/game/pet-follow'
import { preloadMountSpriteSheet, preloadPetSpriteSheet } from '@/lib/game/sprite-sheets'
import {
  canvasToResolvedDrawable,
  type Dir,
  drawResolvedDrawable,
  drawResolvedPortrait,
  jobHumanColors,
  mountSprite,
  petSprite,
  type ResolvedDrawable,
  resolveHumanDrawable,
  resolveMonsterDrawable,
  type SpriteAction,
} from '@/lib/game/sprites'
import {
  drawCharacterFashionLayers,
  getFashionLayerImage,
  getFashionRenderSignature,
  preloadFashionLayers,
  type FashionLoadout,
} from '@/lib/game/fashion-renderer'
import { drawRebirthAura, drawSpiritAwakeningAura } from '@/lib/game/vfx-canvas'

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
  spiritStage?: number
  showShadow?: boolean
  showAura?: boolean
  variant?: 'full' | 'portrait'
  fashion?: FashionLoadout | null
  mountLevel?: number
  mountSkinId?: string | null
  petLevel?: number
  petStars?: number
  showRider?: boolean
  riderJobId?: string
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
  spiritStage = 0,
  showShadow = true,
  showAura = true,
  variant = 'full',
  fashion,
  mountLevel = 1,
  mountSkinId = null,
  petLevel = 1,
  petStars = 1,
  showRider = false,
  riderJobId = 'swordsman',
  className = '',
  label,
  onAutoPhaseChange,
}: SpriteModelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const phaseCallbackRef = useRef(onAutoPhaseChange)
  phaseCallbackRef.current = onAutoPhaseChange

  const fashionDep = fashion?.wings ?? ''

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let cancelled = false
    let rafId = 0
    let isVisible = true
    let lastDrawAt = 0
    let lastSig = ''
    let lastPhase: SpriteAction | null = null
    let offscreenPortraitCanvas: HTMLCanvasElement | null = null
    const start = performance.now()

    if (mode === 'job' && fashion) {
      preloadFashionLayers(fashion)
    }
    if (mode === 'mount') {
      preloadMountSpriteSheet(id)
    }
    if (mode === 'pet') {
      preloadPetSpriteSheet(id)
    }

    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              const visible = entries[0]?.isIntersecting ?? true
              isVisible = visible
              if (visible) {
                lastSig = ''
                lastDrawAt = 0
                if (!reducedMotion && rafId === 0) {
                  rafId = requestAnimationFrame(renderFrame)
                }
              }
            },
            { threshold: 0.05 },
          )
        : null
    observer?.observe(canvas)

    const renderFrame = (now: number) => {
      rafId = 0
      if (!isVisible) return
      if (canvas.width === 0 || canvas.height === 0) return

      const elapsed = reducedMotion ? 0 : (now - start) / 1000
      let effectiveAction: SpriteAction = action === 'auto' ? 'idle' : action
      let attackProgress = 0

      if (action === 'auto' && !reducedMotion) {
        if (mode === 'mount') {
          const cycle = elapsed % 6.2
          if (cycle < 1.2) {
            effectiveAction = 'idle'
          } else if (cycle < 2.5) {
            effectiveAction = 'walk'
          } else if (cycle < 3.9) {
            effectiveAction = 'run'
          } else if (cycle < 5.05) {
            effectiveAction = 'mount'
            attackProgress = (cycle - 3.9) / 1.15
          } else {
            effectiveAction = 'dismount'
            attackProgress = (cycle - 5.05) / 1.15
          }
        } else if (mode === 'pet') {
          const cycle = elapsed % 6.4
          if (cycle < 1.15) {
            effectiveAction = 'idle'
          } else if (cycle < 2.4) {
            effectiveAction = 'walk'
          } else if (cycle < 3.7) {
            effectiveAction = 'follow'
          } else if (cycle < 5.05) {
            effectiveAction = 'run'
          } else {
            effectiveAction = 'attack'
            attackProgress = (cycle - 5.05) / 1.35
          }
        } else if (mode === 'job') {
          const cycle = elapsed % 8.4
          if (cycle < 1.2) {
            effectiveAction = 'idle'
          } else if (cycle < 2.4) {
            effectiveAction = 'walk'
          } else if (cycle < 3.6) {
            effectiveAction = 'run'
          } else if (cycle < 4.7) {
            effectiveAction = 'attack'
            attackProgress = (cycle - 3.6) / 1.1
          } else if (cycle < 6.0) {
            effectiveAction = 'skill'
            attackProgress = (cycle - 4.7) / 1.3
          } else if (cycle < 6.8) {
            effectiveAction = 'hit'
            attackProgress = (cycle - 6.0) / 0.8
          } else {
            effectiveAction = 'victory'
            attackProgress = (cycle - 6.8) / 1.6
          }
        } else {
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
        }
      } else if (
        action === 'attack' ||
        action === 'skill' ||
        action === 'hit' ||
        action === 'death' ||
        action === 'victory' ||
        action === 'mount' ||
        action === 'dismount'
      ) {
        const speed = action === 'hit' ? 1.85 : action === 'death' ? 0.95 : 1.25
        attackProgress = reducedMotion ? 0.5 : (elapsed * speed) % 1
      }

      if (lastPhase !== effectiveAction) {
        lastPhase = effectiveAction
        phaseCallbackRef.current?.(effectiveAction)
      }

      const throttleMs =
        variant === 'portrait' && effectiveAction === 'idle'
          ? 240
          : mode === 'monster' && effectiveAction === 'walk'
            ? 40
            : effectiveAction === 'idle'
              ? 120
              : 75
      if (!reducedMotion && lastDrawAt > 0 && now - lastDrawAt < throttleMs) {
        rafId = requestAnimationFrame(renderFrame)
        return
      }
      lastDrawAt = now

      const resolvedMonsterId = mode === 'monster' ? normalizeMonsterId(id) : id
      const isCatalogMonster = mode === 'monster'
      const jobAnimSpec = mode === 'job' ? getJobModelSpec(normalizeJobId(id)).animationFrames : null
      const isAttack = effectiveAction === 'attack'
      const isSkill = effectiveAction === 'skill'
      const isHit = effectiveAction === 'hit'
      const isDeath = effectiveAction === 'death'
      const isVictory = effectiveAction === 'victory'
      const isMountHop = effectiveAction === 'mount' || effectiveAction === 'dismount'
      const atkCount = jobAnimSpec
        ? jobAnimSpec.attack
        : isCatalogMonster
          ? getCatalogMonsterFrameCount(resolvedMonsterId, 'attack', dir)
          : 4
      const skillCount = jobAnimSpec
        ? (jobAnimSpec.skill ?? 4)
        : isCatalogMonster
          ? getCatalogMonsterFrameCount(resolvedMonsterId, 'skill', dir)
          : 4
      const walkMod = jobAnimSpec
        ? (effectiveAction === 'run' ? (jobAnimSpec.run ?? jobAnimSpec.walk) : jobAnimSpec.walk)
        : isCatalogMonster
          ? getCatalogMonsterFrameCount(resolvedMonsterId, 'walk', dir)
          : 6
      const idleCount = jobAnimSpec
        ? jobAnimSpec.idle
        : isCatalogMonster
          ? getCatalogMonsterFrameCount(resolvedMonsterId, 'idle', dir)
          : 4
      const hitCount = jobAnimSpec?.hit ?? 3
      const deathCount = jobAnimSpec?.death ?? 5
      const victoryCount = jobAnimSpec?.victory ?? 5
      const attackFrame = isAttack ? Math.min(atkCount - 1, Math.floor(attackProgress * atkCount)) : 0
      const skillFrame = isSkill ? Math.min(skillCount - 1, Math.floor(attackProgress * skillCount)) : 0
      const hitFrame = isHit ? Math.min(hitCount - 1, Math.floor(attackProgress * hitCount)) : 0
      const deathFrame = isDeath ? Math.min(deathCount - 1, Math.floor(attackProgress * deathCount)) : 0
      const victoryFrame = isVictory ? Math.min(victoryCount - 1, Math.floor(attackProgress * victoryCount)) : 0
      const hopFrame = isMountHop ? Math.min(3, Math.floor(attackProgress * 4)) : 0
      const frame = isSkill
        ? skillFrame
        : isAttack
          ? attackFrame
          : isHit
            ? hitFrame
            : isDeath
              ? deathFrame
              : isVictory
                ? victoryFrame
                : isMountHop
                  ? hopFrame
                  : effectiveAction === 'run'
                    ? Math.floor(elapsed * 12) % walkMod
                    : effectiveAction === 'follow'
                      ? Math.floor(elapsed * 9.5) % walkMod
                      : effectiveAction === 'walk'
                        ? Math.floor(elapsed * (isCatalogMonster ? 7.5 : 8.5)) % walkMod
                        : mode === 'job' && !reducedMotion && Math.sin(elapsed * 1.4) > 0.96
                          ? -1
                          : Math.floor(elapsed * (isCatalogMonster ? 5.0 : 2.6)) % idleCount

      let drawable: ResolvedDrawable
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
        drawable = resolveHumanDrawable(
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
        drawable = canvasToResolvedDrawable(
          petSprite(spec.petId, dir, petAction, frame, attackFrame, petLevel, petStars),
        )
        auraColor = spec.auraColor
        isFlying = spec.floating
      } else if (mode === 'mount') {
        const spec = getMountModelSpec(id)
        const mountAction: SpriteAction = effectiveAction === 'skill' ? 'attack' : effectiveAction
        drawable = canvasToResolvedDrawable(
          mountSprite(spec.mountId, dir, mountAction, frame, attackFrame, mountLevel, mountSkinId),
        )
        auraColor = spec.auraColor
        isFlying = spec.flying
      } else {
        const monDef = MONSTERS[resolvedMonsterId] ?? MONSTERS.meadow_blob ?? Object.values(MONSTERS)[0]
        const spec = getMonsterModelSpec(monDef.id, monDef.sprite, monDef.color)
        drawable = resolveMonsterDrawable(
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
      const hasSpirit = mode === 'job' && spiritStage > 0
      const auraBucket =
        showAura && (auraColor || hasRebirth || hasSpirit) && !reducedMotion
          ? Math.round(elapsed * 8)
          : 0
      const gmReady = Boolean(drawable.gmReady)
      const mMotionBucket =
        mode === 'monster' && (effectiveAction === 'walk' || effectiveAction === 'idle') && !reducedMotion
          ? Math.round(elapsed * 24)
          : 0
      const sheetId = drawable.sheetId ?? ''
      const sourceReady = drawable.sheetSpec
        ? drawable.sheetSpec.image.complete && drawable.sheetSpec.image.naturalWidth > 0
        : Boolean(drawable.canvas && drawable.canvas.width > 0 && drawable.canvas.height > 0)
      const fashionSig = mode === 'job' ? getFashionRenderSignature(fashion, reducedMotion ? undefined : elapsed) : ''
      const mountSig = mode === 'mount' ? `m${mountLevel}|${mountSkinId ?? ''}|${showRider ? riderJobId : ''}` : ''
      const petSig = mode === 'pet' ? `p${getPetVisualTier(petLevel, petStars)}` : ''
      const sig = `${effectiveAction}|${frame}|${hoverY}|${lungeOffset}|${slashBucket}|${auraBucket}|${rebirthCount}|${spiritStage}|${gmReady ? '1' : '0'}|${sheetId}|${sourceReady ? '1' : '0'}|${mMotionBucket}|${fashionSig}|${mountSig}|${petSig}|${canvas.width}x${canvas.height}`

      if (sig !== lastSig) {
        lastSig = sig
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'medium'

        const hdScale = drawable.hdScale
        if (variant === 'portrait' && mode === 'job') {
          const isSheet = Boolean(drawable.sheetId)
          const baseCropW = gmReady ? 30 : isSheet ? 30 : 28
          const baseCropH = gmReady ? 26 : isSheet ? 28 : 24
          const cropW = Math.min(drawable.width, Math.round(baseCropW * hdScale))
          const cropH = Math.min(drawable.height, Math.round(baseCropH * hdScale))
          const sx = Math.max(0, Math.round((drawable.width - cropW) / 2))
          const hasWearableFashion = Boolean(fashion?.wings)
          const rawSy = gmReady ? 7 : Math.round((isSheet ? 5 : 3) * hdScale)
          const sy = hasWearableFashion ? Math.max(0, rawSy - Math.round(1.5 * hdScale)) : rawSy

          if (hasWearableFashion && typeof document !== 'undefined') {
            if (!offscreenPortraitCanvas) {
              offscreenPortraitCanvas = document.createElement('canvas')
            }
            if (offscreenPortraitCanvas.width !== drawable.width || offscreenPortraitCanvas.height !== drawable.height) {
              offscreenPortraitCanvas.width = drawable.width
              offscreenPortraitCanvas.height = drawable.height
            }
            const offCtx = offscreenPortraitCanvas.getContext('2d')
            if (offCtx) {
              offCtx.clearRect(0, 0, offscreenPortraitCanvas.width, offscreenPortraitCanvas.height)
              offCtx.imageSmoothingEnabled = true
              offCtx.imageSmoothingQuality = 'medium'
              drawCharacterFashionLayers({
                ctx: offCtx,
                loadout: fashion,
                phase: 'behind',
                dir,
                action: effectiveAction,
                frame,
                dx: 0,
                dy: 0,
                dw: drawable.width,
                dh: drawable.height,
                timeSec: elapsed,
              })
              drawResolvedDrawable(offCtx, drawable, 0, 0, drawable.width, drawable.height)
              drawCharacterFashionLayers({
                ctx: offCtx,
                loadout: fashion,
                phase: 'overBody',
                dir,
                action: effectiveAction,
                frame,
                dx: 0,
                dy: 0,
                dw: drawable.width,
                dh: drawable.height,
                timeSec: elapsed,
              })
              drawCharacterFashionLayers({
                ctx: offCtx,
                loadout: fashion,
                phase: 'overBack',
                dir,
                action: effectiveAction,
                frame,
                dx: 0,
                dy: 0,
                dw: drawable.width,
                dh: drawable.height,
                timeSec: elapsed,
              })
              ctx.drawImage(offscreenPortraitCanvas, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height)
            } else {
              drawResolvedPortrait(ctx, drawable, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height)
            }
          } else {
            drawResolvedPortrait(ctx, drawable, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height)
          }
        } else {
          const padW = canvas.width * (hasRebirth && showAura ? (rebirthCount >= 5 ? 0.54 : 0.66) : gmReady ? 0.98 : 0.9)
          const padH = canvas.height * (hasRebirth && showAura ? (rebirthCount >= 5 ? 0.54 : 0.66) : gmReady ? 0.96 : 0.86)
          const computedScale =
            scale ??
            Math.max(0.4, Math.min(padW / Math.max(1, drawable.width), padH / Math.max(1, drawable.height)))
          const drawW = Math.round(drawable.width * computedScale)
          const drawH = Math.round(drawable.height * computedScale)

          const centerX = Math.round(canvas.width / 2)
          const baseFloorY = Math.round(canvas.height * (hasRebirth && showAura ? (rebirthCount >= 5 ? 0.81 : 0.84) : 0.89))
          const footPad =
            drawable.sheetSpec?.footPadFrac !== undefined
              ? Math.round(drawable.sheetSpec.footPadFrac * drawH)
              : gmReady
                ? Math.round(9 * computedScale)
                : Math.round(2 * computedScale)
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
          if (showAura && hasSpirit) {
            drawSpiritAwakeningAura(ctx, {
              x: centerX + lungeOffset,
              y: baseFloorY,
              timeSec: elapsed,
              stage: spiritStage,
              radiusX: auraRadiusX,
              spriteHeight: drawH,
            })
          }

          ctx.save()
          if (isGhost) {
            ctx.globalAlpha = 0.84 + (reducedMotion ? 0 : Math.sin(elapsed * 4) * 0.08)
          }
          const drawX = Math.round(centerX + lungeOffset)
          const drawAnchorY = Math.round(baseFloorY + hoverY)
          const dx = Math.round(-drawW / 2)
          const dy = Math.round(-drawH + footPad)
          ctx.save()
          ctx.translate(drawX, drawAnchorY)
          if (mode === 'job' && fashion) {
            drawCharacterFashionLayers({
              ctx,
              loadout: fashion,
              phase: 'behind',
              dir,
              action: effectiveAction,
              frame,
              dx,
              dy,
              dw: drawW,
              dh: drawH,
              timeSec: elapsed,
            })
          }
          drawResolvedDrawable(ctx, drawable, dx, dy, drawW, drawH)
          if (mode === 'mount' && showRider) {
            const jobDef = JOBS[normalizeJobId(riderJobId)]
            const riderColors = jobHumanColors(jobDef.id, jobDef.colors, false)
            const riderWeapon = jobDef.weaponTypes[0] ?? 'stick'
            const riderDrawable = resolveHumanDrawable(
              riderColors,
              dir,
              0,
              riderWeapon,
              jobDef.colors.accent,
              false,
              'idle',
              undefined,
            )
            const seatAction: MountAnimAction =
              effectiveAction === 'walk' ||
              effectiveAction === 'run' ||
              effectiveAction === 'mount' ||
              effectiveAction === 'dismount' ||
              effectiveAction === 'attack'
                ? effectiveAction
                : 'idle'
            const seat = getMountRiderSeatOffset(id, dir, seatAction, frame)
            const worldToPreviewScale = drawW / Math.max(1, drawable.width / Math.max(1, drawable.hdScale))
            const seatPxX = Math.round(seat.x * worldToPreviewScale)
            const seatPxY = Math.round(-footPad + seat.y * worldToPreviewScale)
            const riderH = Math.round(33 * worldToPreviewScale)
            const riderW = Math.round(riderH * (riderDrawable.width / Math.max(1, riderDrawable.height)))
            const riderClip = Math.round(riderH * seat.legClipRatio)
            const riderFootOffset = Math.round(2 * worldToPreviewScale)
            const riderDx = Math.round(seatPxX - riderW / 2)
            const riderDy = Math.round(seatPxY - riderH + riderFootOffset)
            ctx.save()
            ctx.beginPath()
            ctx.rect(riderDx - 8, riderDy - 8, riderW + 16, riderH - riderClip + 10)
            ctx.clip()
            drawResolvedDrawable(ctx, riderDrawable, riderDx, riderDy, riderW, riderH)
            ctx.restore()
            const mDef = getMountDef(id)
            if (mDef) {
              ctx.fillStyle = mDef.colors.saddle
              ctx.fillRect(seatPxX - Math.round(4 * worldToPreviewScale), seatPxY - Math.round(2.5 * worldToPreviewScale), Math.round(8 * worldToPreviewScale), Math.round(3.2 * worldToPreviewScale))
              ctx.fillStyle = mDef.colors.accent
              ctx.fillRect(seatPxX - Math.round(2.5 * worldToPreviewScale), seatPxY - Math.round(2.2 * worldToPreviewScale), Math.round(5 * worldToPreviewScale), Math.round(1.1 * worldToPreviewScale))
            }
          }
          if (mode === 'job' && fashion) {
            drawCharacterFashionLayers({
              ctx,
              loadout: fashion,
              phase: 'overBody',
              dir,
              action: effectiveAction,
              frame,
              dx,
              dy,
              dw: drawW,
              dh: drawH,
              timeSec: elapsed,
            })
            drawCharacterFashionLayers({
              ctx,
              loadout: fashion,
              phase: 'overBack',
              dir,
              action: effectiveAction,
              frame,
              dx,
              dy,
              dw: drawW,
              dh: drawH,
              timeSec: elapsed,
            })
          }
          ctx.restore()

          if (isAttack && !gmReady && !drawable.sheetId && attackProgress > 0.2 && attackProgress < 0.85) {
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

    if (reducedMotion && mode === 'job' && fashion?.wings) {
      const img = getFashionLayerImage(fashion.wings)
      if (img && !img.complete) {
        img.addEventListener(
          'load',
          () => {
            if (!cancelled && isVisible) {
              lastSig = ''
              renderFrame(performance.now())
            }
          },
          { once: true },
        )
      }
    }

    rafId = requestAnimationFrame(renderFrame)
    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
      observer?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id, action, dir, weaponOverride, weaponColorOverride, size, scale, isGm, rebirthCount, spiritStage, showShadow, showAura, variant, fashionDep, mountLevel, mountSkinId, petLevel, petStars, showRider, riderJobId])

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
