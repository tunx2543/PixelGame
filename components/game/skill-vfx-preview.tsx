'use client'

import { useEffect, useRef } from 'react'
import { JOBS, type WeaponType } from '@/lib/game/data'
import { humanSprite, jobHumanColors, monsterSprite } from '@/lib/game/sprites'
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
  }, [jobId, skillId, playNonce])

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
    const startTime = performance.now()
    if (!vfxStartRef.current) vfxStartRef.current = startTime

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

      const { jobId: activeJobId, skillId: activeSkillId, rebirthCount: activeRebirth } = propsRef.current
      const job = JOBS[activeJobId] ?? JOBS.novice
      const weapon: WeaponType = job.weaponTypes[0] ?? 'stick'
      const w = canvas.width
      const h = canvas.height
      const floorY = Math.round(h * 0.8)
      const heroX = Math.round(w * 0.25)
      const enemyX = Math.round(w * 0.75)

      const timeSec = reducedMotion ? 0.8 : (now - startTime) / 1000
      // Loop VFX softly every 2.2s if user leaves stage idle, or play immediately on click
      const elapsedSinceTrigger = Math.max(0, now - vfxStartRef.current)
      const loopMs = elapsedSinceTrigger <= 950 ? elapsedSinceTrigger : elapsedSinceTrigger % 2200
      const vfxDurationMs = 820
      const vfxActive = reducedMotion ? true : loopMs < vfxDurationMs
      const vfxProgress = reducedMotion ? 0.42 : Math.min(1, loopMs / vfxDurationMs)

      ctx.clearRect(0, 0, w, h)
      ctx.imageSmoothingEnabled = false

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

      const activeSkill = job.skills.find((s) => s.id === activeSkillId) ?? job.skills[0] ?? null
      const vfxSpec = activeSkill
        ? getSkillVfxSpec(activeSkill.id, activeSkill.color, activeSkill.kind, weapon)
        : null

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
      const isHeroAttacking = vfxActive && vfxProgress < 0.65
      const heroAttackFrame = isHeroAttacking ? Math.min(3, Math.floor((vfxProgress / 0.65) * 4)) : 0
      const heroIdleFrame = Math.floor(timeSec * 3) % 4
      const lungeX = isHeroAttacking ? Math.round(Math.sin((vfxProgress / 0.65) * Math.PI) * 8) : 0
      const heroCanvas = humanSprite(
        jobHumanColors(job.id, job.colors, job.id === 'gm'),
        'right',
        isHeroAttacking ? heroAttackFrame : heroIdleFrame,
        weapon,
        job.colors.accent,
        isHeroAttacking,
        isHeroAttacking ? 'attack' : 'idle',
        heroAttackFrame,
      )
      const heroScale = 1.95
      const hw = Math.round(heroCanvas.width * heroScale)
      const hh = Math.round(heroCanvas.height * heroScale)
      ctx.drawImage(heroCanvas, Math.round(heroX + lungeX - hw / 2), Math.round(floorY - hh + 4), hw, hh)

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

      // Target training slime on right
      const isHitFlash = vfxActive && vfxSpec?.style !== 'holy_heal' && vfxProgress > 0.2 && vfxProgress < 0.72
      const enemyKnockX = isHitFlash ? Math.round(Math.sin((vfxProgress - 0.2) * Math.PI * 2) * 4) : 0
      const enemyCanvas = monsterSprite(
        'slime',
        isHitFlash ? '#f472b6' : '#8b5cf6',
        Math.floor(timeSec * 3.5) % 4,
        false,
        'idle',
        'left',
        0,
        'slime',
      )
      const ew = Math.round(enemyCanvas.width * 2)
      const eh = Math.round(enemyCanvas.height * 2)
      ctx.drawImage(enemyCanvas, Math.round(enemyX + enemyKnockX - ew / 2), Math.round(floorY - eh + 3), ew, eh)

      // Skill VFX burst
      if (vfxActive) {
        drawStageSkillEffect(ctx, {
          heroX: heroX + lungeX,
          heroY: floorY - 30,
          enemyX: enemyX + enemyKnockX,
          enemyY: floorY - 22,
          floorY,
          skillId: activeSkill?.id ?? null,
          weaponType: weapon,
          progress: vfxProgress,
          color: activeSkill?.color ?? job.colors.accent,
        })
      }

      if (!reducedMotion && isVisible) {
        rafId = requestAnimationFrame(render)
      }
    }

    rafId = requestAnimationFrame(render)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      observer?.disconnect()
    }
  }, [])

  const aura = resolveRebirthAuraSpec(rebirthCount)

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      data-testid="skill-vfx-stage"
      data-job={jobId}
      data-skill={skillId ?? 'basic'}
      data-rebirth={rebirthCount}
      data-rebirth-style={aura.style}
      aria-label={label ?? `เวทีจำลองเอฟเฟคสกิลอาชีพ ${jobId}`}
      className={`pixelated block w-full border border-[#c9993f]/45 bg-[#0a0d1c] ${className}`}
    />
  )
}
