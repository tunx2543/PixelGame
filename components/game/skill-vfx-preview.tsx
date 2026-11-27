'use client'

import { useEffect, useRef } from 'react'
import { JOBS, normalizeJobId, type WeaponType } from '@/lib/game/data'
import {
  getClassCombatVfxProfile,
  getCombatVfxDurationMs,
  resolveSkillCombatTier,
} from '@/lib/game/combat-vfx-system'
import { preloadHeroSheet, subscribeSpriteSheetLoad } from '@/lib/game/sprite-sheets'
import { drawResolvedDrawable, jobHumanColors, resolveHumanDrawable, resolveMonsterDrawable } from '@/lib/game/sprites'
import { drawRebirthAura, drawStageSkillEffect } from '@/lib/game/vfx-canvas'
import { getSkillVfxSpec, resolveRebirthAuraSpec } from '@/lib/game/vfx-specs'

export interface SkillVfxPreviewProps {
  jobId: string
  skillId: string | null
  rebirthCount?: number
  playNonce?: number
  width?: number
  height?: number
  className?: string
  label?: string
}

export function SkillVfxPreview({
  jobId,
  skillId,
  rebirthCount = 0,
  playNonce = 0,
  width = 304,
  height = 136,
  className = '',
  label,
}: SkillVfxPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const propsRef = useRef({ jobId, skillId, rebirthCount })
  propsRef.current = { jobId, skillId, rebirthCount }

  const vfxStartRef = useRef<number>(0)

  // Restart the skill VFX burst whenever job, skill, or replay nonce updates
  useEffect(() => {
    vfxStartRef.current = typeof performance !== 'undefined' ? performance.now() : 0
    preloadHeroSheet(normalizeJobId(jobId))
  }, [jobId, skillId, playNonce])

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
    const startTime = performance.now()
    if (!vfxStartRef.current) vfxStartRef.current = startTime
    preloadHeroSheet(normalizeJobId(propsRef.current.jobId))

    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              const visible = entries[0]?.isIntersecting ?? true
              isVisible = visible
              if (visible && !reducedMotion && rafId === 0) {
                rafId = requestAnimationFrame(render)
              }
            },
            { threshold: 0.05 },
          )
        : null
    observer?.observe(canvas)

    const render = (now: number) => {
      rafId = 0
      if (!isVisible) return

      const { jobId: activeJobId, skillId: rawSkillId, rebirthCount: activeRebirth } = propsRef.current
      const canonicalJobId = normalizeJobId(activeJobId)
      const job = JOBS[canonicalJobId]
      const weapon: WeaponType = job.weaponTypes[0] ?? 'stick'
      const isBasicMode = rawSkillId === null || rawSkillId === 'basic'
      const activeSkill = isBasicMode
        ? null
        : (job.skills.find((s) => s.id === rawSkillId) ?? job.skills[0] ?? null)
      const effectiveSkillId = isBasicMode ? null : (activeSkill?.id ?? null)

      const w = canvas.width
      const h = canvas.height
      const floorY = Math.round(h * 0.8)
      const heroX = Math.round(w * 0.25)
      const enemyX = Math.round(w * 0.75)

      const timeSec = reducedMotion ? 0.8 : (now - startTime) / 1000
      const vfxDurationMs = getCombatVfxDurationMs(canonicalJobId, effectiveSkillId)
      const loopCycleMs = Math.max(2000, vfxDurationMs + 900)
      const elapsedSinceTrigger = Math.max(0, now - vfxStartRef.current)
      const loopMs = elapsedSinceTrigger <= vfxDurationMs + 140 ? elapsedSinceTrigger : elapsedSinceTrigger % loopCycleMs
      const vfxActive = reducedMotion ? true : loopMs < vfxDurationMs
      const vfxProgress = reducedMotion ? 0.45 : Math.min(1, loopMs / Math.max(1, vfxDurationMs))

      ctx.clearRect(0, 0, w, h)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'medium'

      // Dark astral dojo background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
      bgGrad.addColorStop(0, '#0a0d1c')
      bgGrad.addColorStop(0.68, '#131a33')
      bgGrad.addColorStop(1, '#1a2038')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, w, h)

      // Subtle arena horizon & stone floor grid
      ctx.fillStyle = '#1f2847'
      ctx.fillRect(0, floorY - 8, w, 1)
      ctx.fillStyle = '#161c34'
      ctx.fillRect(0, floorY - 7, w, h - floorY + 7)
      ctx.fillStyle = 'rgba(201, 153, 63, 0.14)'
      for (let gx = 16; gx < w; gx += 32) {
        ctx.fillRect(gx, floorY - 7, 1, h - floorY + 7)
      }

      const vfxSpec = activeSkill
        ? getSkillVfxSpec(activeSkill.id, activeSkill.color, activeSkill.kind, weapon)
        : null
      const profile = getClassCombatVfxProfile(canonicalJobId)

      // Shadows
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)'
      ctx.beginPath()
      ctx.ellipse(heroX, floorY, 18, 6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(enemyX, floorY, 17, 6, 0, 0, Math.PI * 2)
      ctx.fill()

      // Back layer of rebirth aura
      if (activeRebirth > 0) {
        drawRebirthAura(ctx, {
          x: heroX,
          y: floorY,
          timeSec,
          rebirthCount: activeRebirth,
          radiusX: 22,
          spriteHeight: 60,
          layer: 'back',
        })
      }

      // Hero sprite
      const poseCutoff = isBasicMode ? 0.85 : 0.65
      const isHeroCasting = vfxActive && vfxProgress < poseCutoff
      const heroAction = isHeroCasting ? (isBasicMode ? 'attack' : 'skill') : 'idle'
      const heroPoseFrame = isHeroCasting ? Math.min(isBasicMode ? 4 : 5, Math.floor((vfxProgress / poseCutoff) * (isBasicMode ? 5 : 6))) : 0
      const heroIdleFrame = Math.floor(timeSec * 3) % 4
      const lungeX = isHeroCasting ? Math.round(Math.sin((vfxProgress / poseCutoff) * Math.PI) * 8) : 0
      const heroDrawable = resolveHumanDrawable(
        jobHumanColors(job.id, job.colors, false),
        'right',
        isHeroCasting ? heroPoseFrame : heroIdleFrame,
        weapon,
        job.colors.accent,
        isBasicMode && isHeroCasting,
        heroAction,
        isHeroCasting ? heroPoseFrame : undefined,
      )
      const isGmEpic = Boolean(heroDrawable.gmReady)
      const heroHd = heroDrawable.hdScale
      const heroScale = isGmEpic ? 2.35 : 1.95 / Math.max(1, heroHd)
      const hw = Math.round(heroDrawable.width * heroScale)
      const hh = Math.round(heroDrawable.height * heroScale)
      const footOffset = isGmEpic ? 18 : 4
      drawResolvedDrawable(ctx, heroDrawable, Math.round(heroX + lungeX - hw / 2), Math.round(floorY - hh + footOffset), hw, hh)

      // Front layer of rebirth aura (floating crown halo / orbiting star shards / rising motes)
      if (activeRebirth > 0) {
        drawRebirthAura(ctx, {
          x: heroX,
          y: floorY,
          timeSec,
          rebirthCount: activeRebirth,
          radiusX: 22,
          spriteHeight: 60,
          layer: 'front',
        })
      }

      // Target training monster on right
      const isHitFlash = vfxActive && vfxSpec?.style !== 'holy_heal' && vfxProgress > 0.25 && vfxProgress < 0.78
      const enemyKnockX = isHitFlash ? Math.round(Math.sin((vfxProgress - 0.25) * Math.PI * 2) * 4) : 0
      const enemyDrawable = resolveMonsterDrawable(
        'slime',
        '#f78087',
        Math.floor(timeSec * 4) % 4,
        false,
        'idle',
        'left',
        0,
        'meadow_blob',
      )
      const enemyHd = enemyDrawable.hdScale
      const enemyScale = 1.45 / Math.max(1, enemyHd)
      const ew = Math.round(enemyDrawable.width * enemyScale)
      const eh = Math.round(enemyDrawable.height * enemyScale)
      const enemyFootPad =
        enemyDrawable.sheetSpec?.footPadFrac !== undefined
          ? Math.round(enemyDrawable.sheetSpec.footPadFrac * eh)
          : 2
      ctx.save()
      if (isHitFlash) ctx.globalAlpha = 0.75
      drawResolvedDrawable(
        ctx,
        enemyDrawable,
        Math.round(enemyX + enemyKnockX - ew / 2),
        Math.round(floorY - eh + enemyFootPad),
        ew,
        eh,
      )
      ctx.restore()

      // 6-phase Class Combat VFX burst
      if (vfxActive) {
        drawStageSkillEffect(ctx, {
          jobId: canonicalJobId,
          heroX: heroX + lungeX,
          heroY: floorY - 30,
          enemyX: enemyX + enemyKnockX,
          enemyY: floorY - 22,
          floorY,
          skillId: effectiveSkillId,
          weaponType: weapon,
          progress: vfxProgress,
          color: vfxSpec?.primaryColor ?? profile.palette.primary,
        })
      }

      if (!cancelled && !reducedMotion && isVisible) {
        rafId = requestAnimationFrame(render)
      }
    }

    const unsubscribeSheetLoad = subscribeSpriteSheetLoad(() => {
      if (!cancelled && isVisible && (reducedMotion || rafId === 0)) {
        render(performance.now())
      }
    })

    rafId = requestAnimationFrame(render)
    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
      unsubscribeSheetLoad()
      observer?.disconnect()
    }
  }, [])

  const aura = resolveRebirthAuraSpec(rebirthCount)
  const tier = skillId === null || skillId === 'basic' ? 'basic' : resolveSkillCombatTier(skillId)

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      data-testid="skill-vfx-stage"
      data-job={jobId}
      data-skill={skillId ?? 'basic'}
      data-vfx-tier={tier}
      data-rebirth={rebirthCount}
      data-rebirth-style={aura.style}
      aria-label={label ?? `เวทีจำลองเอฟเฟคสกิลอาชีพ ${jobId}`}
      className={`block w-full rounded-lg border border-[#c9993f]/55 bg-[#12162b] ${className}`}
    />
  )
}
