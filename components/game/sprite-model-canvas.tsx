'use client'

import { useEffect, useRef } from 'react'
import { normalizeMonsterId } from '@/lib/game/biome-monsters'
import { getCatalogMonsterFrameCount } from '@/lib/game/catalog-sprites'
import { JOBS, MONSTERS, normalizeJobId, type WeaponType } from '@/lib/game/data'
import { getJobModelSpec, getMonsterModelSpec, getMountModelSpec, getPetModelSpec } from '@/lib/game/models-2d'
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
import { getFashionItemDef } from '@/lib/game/premium/fashion-pet'
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
  fashion?: FashionLoadout | null
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
  fashion,
  className = '',
  label,
  onAutoPhaseChange,
}: SpriteModelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const phaseCallbackRef = useRef(onAutoPhaseChange)
  phaseCallbackRef.current = onAutoPhaseChange

  const fashionDep = fashion
    ? [
        fashion.hat ?? '',
        fashion.hair ?? '',
        fashion.costume ?? '',
        fashion.pants ?? '',
        fashion.shoes ?? '',
        fashion.wings ?? '',
        fashion.back ?? '',
        fashion.accessory ?? '',
        fashion.aura ?? '',
        fashion.weaponSkin ?? '',
        fashion.mountAppearance ?? '',
      ].join('|')
    : ''

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
      const isAttack = effectiveAction === 'attack'
      const isSkill = effectiveAction === 'skill'
      const atkCount = isCatalogMonster ? getCatalogMonsterFrameCount(resolvedMonsterId, 'attack') : 4
      const skillCount = isCatalogMonster ? getCatalogMonsterFrameCount(resolvedMonsterId, 'skill') : 4
      const walkMod = mode === 'job' ? 4 : isCatalogMonster ? getCatalogMonsterFrameCount(resolvedMonsterId, 'walk') : 6
      const idleCount = isCatalogMonster ? getCatalogMonsterFrameCount(resolvedMonsterId, 'idle') : 4
      const attackFrame = isAttack ? Math.min(atkCount - 1, Math.floor(attackProgress * atkCount)) : 0
      const skillFrame = isSkill ? Math.min(skillCount - 1, Math.floor(attackProgress * skillCount)) : 0
      const frame = isSkill
        ? skillFrame
        : isAttack
          ? attackFrame
          : effectiveAction === 'walk'
            ? Math.floor(elapsed * (mode === 'job' ? 8.5 : isCatalogMonster ? 7.5 : 8.0)) % walkMod
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
        const baseColors = jobHumanColors(jobDef.id, jobDef.colors, false)
        const costumeDef = getFashionItemDef(fashion?.costume)
        const hairDef = getFashionItemDef(fashion?.hair)
        const auraDef = getFashionItemDef(fashion?.aura)
        const weaponSkinDef = getFashionItemDef(fashion?.weaponSkin)
        const colors = {
          ...baseColors,
          ...(costumeDef?.paletteOverride ?? {}),
          ...(hairDef?.paletteOverride ?? {}),
          ...(auraDef?.paletteOverride ?? {}),
        }
        const weapon = weaponOverride !== undefined ? weaponOverride : (jobDef.weaponTypes[0] ?? 'stick')
        const wColor = weaponSkinDef?.primaryColor ?? weaponColorOverride ?? jobDef.colors.accent
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
        auraColor = auraDef?.primaryColor ?? spec.auraColor
      } else if (mode === 'pet') {
        const spec = getPetModelSpec(id)
        const petAction: SpriteAction = effectiveAction === 'skill' ? 'attack' : effectiveAction
        drawable = canvasToResolvedDrawable(petSprite(spec.petId, dir, petAction, frame, attackFrame))
        auraColor = spec.auraColor
        isFlying = spec.floating
      } else if (mode === 'mount') {
        const spec = getMountModelSpec(id)
        const mountAction: SpriteAction = effectiveAction === 'skill' ? 'attack' : effectiveAction
        drawable = canvasToResolvedDrawable(mountSprite(spec.mountId, dir, mountAction, frame, attackFrame))
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
      const auraBucket =
        showAura && (auraColor || hasRebirth) && !reducedMotion
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
      const fashionSig = mode === 'job' ? getFashionRenderSignature(fashion) : ''
      const sig = `${effectiveAction}|${frame}|${hoverY}|${lungeOffset}|${slashBucket}|${auraBucket}|${rebirthCount}|${gmReady ? '1' : '0'}|${sheetId}|${sourceReady ? '1' : '0'}|${mMotionBucket}|${fashionSig}|${canvas.width}x${canvas.height}`

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
          const hasWearableFashion = Boolean(
            fashion &&
              (fashion.hat ||
                fashion.hair ||
                fashion.costume ||
                fashion.accessory ||
                fashion.wings ||
                fashion.back ||
                fashion.aura),
          )
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
                frame,
                dx: 0,
                dy: 0,
                dw: drawable.width,
                dh: drawable.height,
              })
              drawResolvedDrawable(offCtx, drawable, 0, 0, drawable.width, drawable.height)
              drawCharacterFashionLayers({
                ctx: offCtx,
                loadout: fashion,
                phase: 'overBody',
                dir,
                frame,
                dx: 0,
                dy: 0,
                dw: drawable.width,
                dh: drawable.height,
              })
              drawCharacterFashionLayers({
                ctx: offCtx,
                loadout: fashion,
                phase: 'overBack',
                dir,
                frame,
                dx: 0,
                dy: 0,
                dw: drawable.width,
                dh: drawable.height,
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
              frame,
              dx,
              dy,
              dw: drawW,
              dh: drawH,
            })
          }
          drawResolvedDrawable(ctx, drawable, dx, dy, drawW, drawH)
          if (mode === 'job' && fashion) {
            drawCharacterFashionLayers({
              ctx,
              loadout: fashion,
              phase: 'overBody',
              dir,
              frame,
              dx,
              dy,
              dw: drawW,
              dh: drawH,
            })
            drawCharacterFashionLayers({
              ctx,
              loadout: fashion,
              phase: 'overBack',
              dir,
              frame,
              dx,
              dy,
              dw: drawW,
              dh: drawH,
            })
          }
          ctx.restore()

          if (isAttack && !gmReady && !drawable.sheetId && attackProgress > 0.2 && attackProgress < 0.85) {
            const slashAlpha = Math.max(0, 1 - Math.abs(attackProgress - 0.5) * 2.4)
            const weaponSkinDef = mode === 'job' ? getFashionItemDef(fashion?.weaponSkin) : null
            ctx.globalAlpha = slashAlpha
            ctx.strokeStyle = weaponSkinDef?.primaryColor ?? auraColor ?? '#ffd60a'
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

    if (reducedMotion && mode === 'job' && fashion) {
      for (const fId of Object.values(fashion)) {
        if (!fId) continue
        const img = getFashionLayerImage(fId)
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
    }

    rafId = requestAnimationFrame(renderFrame)
    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
      observer?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id, action, dir, weaponOverride, weaponColorOverride, size, scale, isGm, rebirthCount, showShadow, showAura, variant, fashionDep])

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
