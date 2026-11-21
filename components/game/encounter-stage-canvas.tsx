'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ITEMS, JOBS, normalizeJobId, type WeaponType } from '@/lib/game/data'
import type { SaveData } from '@/lib/game/engine'
import type { EncounterBiome, EncounterEnemy } from '@/lib/game/encounter'
import type { FloatingDamagePopup } from '@/lib/game/floating-damage'
import { registerCombatAudioHandler } from '@/lib/game/combat-audio'
import { computeShakeFrame, type ScreenShakeEvent } from '@/lib/game/screen-shake'
import { getCatalogMonsterFrameCount } from '@/lib/game/catalog-sprites'
import { getMonsterModelSpec } from '@/lib/game/models-2d'
import {
  drawResolvedDrawable,
  jobHumanColors,
  petSprite,
  resolveHumanDrawable,
  resolveMonsterDrawable,
  type SpriteAction,
} from '@/lib/game/sprites'
import { getActivePetBonuses } from '@/lib/game/systems'
import { drawRebirthAura, drawStageSkillEffect } from '@/lib/game/vfx-canvas'

export type StagePopup = FloatingDamagePopup

interface EncounterStageCanvasProps {
  save: SaveData
  enemy: EncounterEnemy | null
  phase: 'LOADING' | 'READY' | 'FIGHTING' | 'VICTORY' | 'DEFEAT'
  playerAttackPulse: number
  playerSkillColor: string | null
  playerSkillId?: string | null
  playerHitPulse: number
  enemyAttackPulse: number
  enemyHitPulse: number
  petAttackPulse?: number
  popups: StagePopup[]
  shakeEvent?: ScreenShakeEvent | null
}

const BIOME_PALETTE: Record<
  EncounterBiome,
  { skyTop: string; skyBottom: string; horizon: string; ground: string; stripe: string; particle: string }
> = {
  meadow: {
    skyTop: '#16283c',
    skyBottom: '#2b4d63',
    horizon: '#2d5a27',
    ground: '#4c8a3f',
    stripe: '#3f7634',
    particle: '#fff3b0',
  },
  forest: {
    skyTop: '#0d1b18',
    skyBottom: '#163229',
    horizon: '#10291a',
    ground: '#25572f',
    stripe: '#1d4425',
    particle: '#80ed99',
  },
  cave: {
    skyTop: '#0a0b16',
    skyBottom: '#181a30',
    horizon: '#22223b',
    ground: '#3b3d52',
    stripe: '#2f3144',
    particle: '#72efdd',
  },
  volcano: {
    skyTop: '#16080a',
    skyBottom: '#2f1111',
    horizon: '#4a1812',
    ground: '#3b2a2a',
    stripe: '#2c1f1f',
    particle: '#ff7b39',
  },
}

function drawSlashEffect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  weaponType: WeaponType,
  progress: number,
  color: string,
) {
  ctx.save()
  ctx.globalAlpha = Math.max(0, 1 - progress)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  if (weaponType === 'staff') {
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(x, y, 12 + progress * 24, 0, Math.PI * 2)
    ctx.stroke()
    for (let i = 0; i < 6; i++) {
      const a = progress * 3 + (i * Math.PI) / 3
      const r = 10 + progress * 22
      ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 3, 3)
    }
  } else if (weaponType === 'bow') {
    ctx.lineWidth = 2.5
    const startX = x - 75 + progress * 75
    ctx.beginPath()
    ctx.moveTo(startX - 18, y)
    ctx.lineTo(startX + 4, y)
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(Math.round(startX + 2), Math.round(y - 1), 4, 3)
  } else {
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.arc(x - 10, y, 22 + progress * 8, -0.95 + progress * 0.4, 0.95 + progress * 0.4)
    ctx.stroke()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x - 10, y, 18 + progress * 8, -0.8 + progress * 0.4, 0.8 + progress * 0.4)
    ctx.stroke()
  }
  ctx.restore()
}

export function EncounterStageCanvas({
  save,
  enemy,
  phase,
  playerAttackPulse,
  playerSkillColor,
  playerSkillId = null,
  playerHitPulse,
  enemyAttackPulse,
  enemyHitPulse,
  petAttackPulse = 0,
  popups,
  shakeEvent = null,
}: EncounterStageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageWrapperRef = useRef<HTMLDivElement | null>(null)
  const lastShakingStateRef = useRef(false)
  const latestRef = useRef({
    save,
    enemy,
    phase,
    playerAttackPulse,
    playerSkillColor,
    playerSkillId,
    playerHitPulse,
    enemyAttackPulse,
    enemyHitPulse,
    petAttackPulse,
    popups,
    shakeEvent,
  })
  latestRef.current = {
    save,
    enemy,
    phase,
    playerAttackPulse,
    playerSkillColor,
    playerSkillId,
    playerHitPulse,
    enemyAttackPulse,
    enemyHitPulse,
    petAttackPulse,
    popups,
    shakeEvent,
  }

  useEffect(() => {
    const stageEl = stageWrapperRef.current
    if (!stageEl) return
    if (!shakeEvent) {
      if (lastShakingStateRef.current) {
        lastShakingStateRef.current = false
        stageEl.style.transform = ''
        stageEl.dataset.shaking = 'false'
      }
      return
    }
    const shake = computeShakeFrame(shakeEvent, Math.max(performance.now(), shakeEvent.startedAt))
    if (shake.active) {
      stageEl.style.transform = `translate3d(${shake.dx}px, ${shake.dy}px, 0) rotate(${shake.rotDeg}deg)`
      lastShakingStateRef.current = true
      stageEl.dataset.shaking = 'true'
    }
  }, [shakeEvent])

  useEffect(() => {
    const recent: string[] = []
    return registerCombatAudioHandler((event) => {
      const stageEl = stageWrapperRef.current
      if (!stageEl) return
      recent.push(event.cue)
      if (recent.length > 8) recent.shift()
      stageEl.dataset.lastAudioCue = event.cue
      stageEl.dataset.audioCues = recent.join(',')
    })
  }, [])

  useEffect(() => {
    let rafId = 0
    const start = performance.now()

    const draw = (now: number) => {
      const frameNow = performance.now()
      const canvas = canvasRef.current
      const {
        save: s,
        enemy: mon,
        phase: ph,
        playerAttackPulse: pAtk,
        playerSkillColor: pSkillCol,
        playerSkillId: pSkillId,
        playerHitPulse: pHit,
        enemyAttackPulse: eAtk,
        enemyHitPulse: eHit,
        petAttackPulse: petAtk,
        shakeEvent: activeShake,
      } = latestRef.current

      const shake = computeShakeFrame(activeShake, frameNow)
      const stageEl = stageWrapperRef.current
      if (stageEl) {
        if (shake.active) {
          stageEl.style.transform = `translate3d(${shake.dx}px, ${shake.dy}px, 0) rotate(${shake.rotDeg}deg)`
          if (!lastShakingStateRef.current) {
            lastShakingStateRef.current = true
            stageEl.dataset.shaking = 'true'
          }
        } else if (lastShakingStateRef.current) {
          lastShakingStateRef.current = false
          stageEl.style.transform = ''
          stageEl.dataset.shaking = 'false'
        }
      }

      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const w = canvas.width
          const h = canvas.height
          const t = (now - start) / 1000
          const biome: EncounterBiome = mon?.biome ?? 'meadow'
          const pal = BIOME_PALETTE[biome]

          ctx.save()
          if (shake.active) {
            ctx.translate(shake.dx * 0.55, shake.dy * 0.55)
          }

          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          // Sky gradient
          const grad = ctx.createLinearGradient(0, 0, 0, h * 0.62)
          grad.addColorStop(0, pal.skyTop)
          grad.addColorStop(1, pal.skyBottom)
          ctx.fillStyle = grad
          ctx.fillRect(0, 0, w, h)

          // Distant pixel hills / silhouettes
          ctx.fillStyle = pal.horizon
          for (let x = 0; x < w; x += 28) {
            const hillH = 14 + Math.round(Math.sin(x * 0.05) * 8)
            ctx.fillRect(x, Math.round(h * 0.56 - hillH), 30, hillH + 8)
          }

          // Arena ground plane
          const groundY = Math.round(h * 0.58)
          ctx.fillStyle = pal.ground
          ctx.fillRect(0, groundY, w, h - groundY)
          ctx.fillStyle = pal.stripe
          for (let row = groundY + 8; row < h; row += 14) {
            ctx.fillRect(0, row, w, 3)
          }

          // Ambient biome motes
          ctx.fillStyle = pal.particle
          for (let i = 0; i < 10; i++) {
            const mx = ((i * 53 + t * (12 + (i % 3) * 4)) % (w + 16)) - 8
            const my = 22 + ((i * 31) % (groundY - 20)) + Math.sin(t * 2 + i) * 6
            ctx.globalAlpha = 0.28 + Math.sin(t * 3 + i) * 0.2
            ctx.fillRect(Math.round(mx), Math.round(my), 2, 2)
          }
          ctx.globalAlpha = 1

          const floorY = Math.round(h * 0.78)
          const heroX = Math.round(w * 0.25)
          const enemyX = Math.round(w * 0.73)

          // --- Hero Sprite ---
          const job = JOBS[normalizeJobId(s.jobId)]
          const equippedWeapon = s.equipment.weapon ? ITEMS[s.equipment.weapon.itemId] : null
          const weaponType: WeaponType = equippedWeapon?.weaponType ?? job.weaponTypes[0] ?? 'stick'
          const weaponColor = equippedWeapon?.color ?? job.colors.accent

          const pAtkAge = (now - pAtk) / 360
          const isPlayerAttacking = pAtk > 0 && pAtkAge >= 0 && pAtkAge < 1
          const pHitAge = (now - pHit) / 220
          const isPlayerHurt = pHit > 0 && pHitAge >= 0 && pHitAge < 1

          const heroStepIn = isPlayerAttacking && pAtkAge < 0.25
          const heroStrike = isPlayerAttacking && pAtkAge >= 0.25
          const heroLunge = isPlayerAttacking ? Math.sin(pAtkAge * Math.PI) * 34 : 0
          const heroShake = isPlayerHurt ? Math.sin(pHitAge * 26) * 5 : 0
          const heroAction: SpriteAction = heroStrike ? 'attack' : heroStepIn ? 'walk' : 'idle'
          const heroAttackFrame = heroStrike ? Math.min(3, Math.floor(((pAtkAge - 0.25) / 0.75) * 4)) : 0
          const heroFrame = heroStrike
            ? heroAttackFrame
            : heroStepIn
              ? Math.floor(pAtkAge * 16) % 4
              : Math.sin(t * 1.4) > 0.96
                ? -1
                : Math.floor(t * (ph === 'FIGHTING' ? 3.2 : 2.2)) % 4
          const styledJobColors = jobHumanColors(job.id, job.colors, false)
          const heroStrikeProg = heroStrike ? Math.max(0, Math.min(1, (pAtkAge - 0.2) / 0.8)) : 0
          const heroWalkProg = heroStepIn ? (pAtkAge / 0.25) % 1 : 0
          const heroIdleProg = (t * 0.6) % 1
          const heroDrawable = resolveHumanDrawable(
            styledJobColors,
            'right',
            heroFrame,
            weaponType,
            weaponColor,
            heroStrike,
            heroAction,
            heroAttackFrame,
            {
              progress: heroStrike ? heroStrikeProg : heroStepIn ? heroWalkProg : heroIdleProg,
              cycleFrames: 8,
            },
          )
          const isGmEpic = Boolean(heroDrawable.gmReady)
          const isJobSprite = Boolean(heroDrawable.jobSprite)
          const heroHd = heroDrawable.hdScale
          const heroTargetHeight = isGmEpic ? 112 : isJobSprite ? 96 : 82
          const heroScale = isGmEpic
            ? Math.max(1.5, Math.min(3.0, heroTargetHeight / Math.max(1, heroDrawable.height)))
            : heroTargetHeight / Math.max(1, heroDrawable.height)
          const hw = heroDrawable.width * heroScale
          const hh = heroDrawable.height * heroScale
          const heroFootOffset = isGmEpic ? 9 * heroScale : isJobSprite ? Math.round(hh * 0.035) : 2 * heroScale * heroHd

          // Hero shadow
          ctx.fillStyle = 'rgba(0,0,0,0.36)'
          ctx.beginPath()
          ctx.ellipse(heroX + heroLunge, floorY + 2, 22, 7, 0, 0, Math.PI * 2)
          ctx.fill()

          if ((s.rebirthCount ?? 0) > 0 && ph !== 'DEFEAT') {
            drawRebirthAura(ctx, {
              x: heroX + heroLunge + heroShake,
              y: floorY,
              timeSec: t,
              rebirthCount: s.rebirthCount ?? 0,
              radiusX: 28,
              spriteHeight: hh,
              alphaScale: isPlayerHurt ? 0.65 : 1,
              layer: 'back',
            })
          }

          ctx.save()
          if (ph === 'DEFEAT') ctx.globalAlpha = 0.45
          else if (isPlayerHurt) ctx.globalAlpha = 0.65
          ctx.translate(heroX + heroLunge + heroShake, floorY)
          drawResolvedDrawable(ctx, heroDrawable, Math.round(-hw / 2), Math.round(-hh + heroFootOffset), hw, hh)
          ctx.restore()

          if ((s.rebirthCount ?? 0) > 0 && ph !== 'DEFEAT') {
            drawRebirthAura(ctx, {
              x: heroX + heroLunge + heroShake,
              y: floorY,
              timeSec: t,
              rebirthCount: s.rebirthCount ?? 0,
              radiusX: 28,
              spriteHeight: hh,
              alphaScale: isPlayerHurt ? 0.65 : 1,
              layer: 'front',
            })
          }

          // --- Active Combat Pet Sprite (2D Pet / ผอบ Model) ---
          const activePet = getActivePetBonuses(s.petState, s.equippedGemCompanion, s.ownedGemItems)
          const petX = heroX - 54 + Math.sin(t * 2.5) * 4
          const petY = floorY - 12 + Math.sin(t * 4) * 4
          if (activePet) {
            const petBoltAge = (now - petAtk) / 260
            const petIsAttacking = petAtk > 0 && petBoltAge >= 0 && petBoltAge < 1.3
            const petAction: SpriteAction = petIsAttacking ? 'attack' : ph === 'FIGHTING' ? 'follow' : 'idle'
            const petAtkFrame = petIsAttacking ? Math.min(3, Math.floor((petBoltAge / 1.3) * 4)) : 0
            const petFrame = petIsAttacking ? petAtkFrame : Math.floor(t * 3.2) % 6
            const pImg = petSprite(
              activePet.petId,
              'right',
              petAction,
              petFrame,
              petAtkFrame,
              activePet.level,
              activePet.stars,
            )
            const pHd = pImg.dataset?.hdScale ? Number(pImg.dataset.hdScale) : 1
            const pScale = 1.9 / Math.max(1, pHd)
            const pw = Math.round(pImg.width * pScale)
            const phPx = Math.round(pImg.height * pScale)

            ctx.fillStyle = 'rgba(0,0,0,0.28)'
            ctx.beginPath()
            ctx.ellipse(petX, floorY + 1, 14, 4.5, 0, 0, Math.PI * 2)
            ctx.fill()

            if (pImg.width > 0 && pImg.height > 0) {
              ctx.drawImage(pImg, Math.round(petX - pw / 2), Math.round(petY - phPx + 6), pw, phPx)
            }

            if (petAtk > 0 && petBoltAge >= 0 && petBoltAge < 1 && mon) {
              const bx = petX + (enemyX - petX) * petBoltAge
              const by = petY + (floorY - 36 - petY) * petBoltAge
              ctx.save()
              ctx.fillStyle = activePet.def.colors.accent
              ctx.fillRect(Math.round(bx - 5), Math.round(by - 5), 10, 10)
              ctx.fillStyle = '#ffffff'
              ctx.fillRect(Math.round(bx - 2), Math.round(by - 2), 4, 4)
              ctx.restore()
            }
          }

          // --- Monster Sprite ---
          if (mon) {
            const eAtkAge = (now - eAtk) / 360
            const isEnemyAttacking = eAtk > 0 && eAtkAge >= 0 && eAtkAge < 1
            const eHitAge = (now - eHit) / 220
            const isEnemyHurt = eHit > 0 && eHitAge >= 0 && eHitAge < 1
            const isDead = mon.hp <= 0 || ph === 'VICTORY'

            const mSpec = getMonsterModelSpec(mon.def.id, mon.def.sprite, mon.def.color)
            const flying = mSpec.flying
            const mHover = flying ? Math.sin(t * 4.2) * 5.5 - (mon.def.boss ? 8 : 10) : 0
            const mLunge = isEnemyAttacking ? -Math.sin(eAtkAge * Math.PI) * 36 : 0
            const mShake = isEnemyHurt ? Math.sin(eHitAge * 28) * 6 : 0
            const mStepIn = isEnemyAttacking && eAtkAge < 0.25
            const mStrike = isEnemyAttacking && eAtkAge >= 0.25
            const mAction: SpriteAction = mStrike ? 'attack' : mStepIn ? 'walk' : ph === 'FIGHTING' && flying ? 'walk' : 'idle'
            const atkCount = getCatalogMonsterFrameCount(mon.def.id, 'attack')
            const walkCount = getCatalogMonsterFrameCount(mon.def.id, 'walk')
            const idleCount = getCatalogMonsterFrameCount(mon.def.id, 'idle')
            const mAtkFrame = mStrike ? Math.min(atkCount - 1, Math.floor(((eAtkAge - 0.25) / 0.75) * atkCount)) : 0
            const mFrame = mStrike
              ? mAtkFrame
              : mStepIn
                ? Math.floor(eAtkAge * 24) % walkCount
                : flying
                  ? Math.floor(t * 7.5) % walkCount
                  : Math.floor(t * 5.0) % idleCount
            const mDrawable = resolveMonsterDrawable(
              mon.def.sprite,
              mon.def.color,
              mFrame,
              mStrike,
              mAction,
              'left',
              mAtkFrame,
              mon.def.id,
            )

            const targetHeight = mon.rarity === 'boss' || mon.def.boss ? 94 : mon.rarity === 'elite' ? 82 : 74
            const baseMonsterScale = targetHeight / Math.max(1, mDrawable.height)
            const mw = mDrawable.width * baseMonsterScale
            const mh = mDrawable.height * baseMonsterScale

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.38)'
            ctx.beginPath()
            ctx.ellipse(enemyX + mLunge, floorY + 2, mw * 0.36, 8, 0, 0, Math.PI * 2)
            ctx.fill()

            // Rarity aura
            if (!isDead && (mon.rarity !== 'normal' || mon.def.boss)) {
              ctx.save()
              ctx.strokeStyle = mon.rarity === 'boss' || mon.def.boss ? (mSpec.auraColor || '#f5c441') : '#c77dff'
              ctx.lineWidth = mon.rarity === 'boss' || mon.def.boss ? 2.4 : 2
              ctx.globalAlpha = 0.45 + Math.sin(t * 5) * 0.2
              ctx.beginPath()
              ctx.ellipse(enemyX + mLunge, floorY + 1, mw * 0.46, 11, 0, 0, Math.PI * 2)
              ctx.stroke()
              ctx.restore()
            }

            ctx.save()
            if (isDead) {
              ctx.globalAlpha = 0.22
            } else if (mon.def.sprite === 'ghost') {
              ctx.globalAlpha = 0.8
            }
            ctx.translate(enemyX + mLunge + mShake, floorY + mHover)
            if (isDead) {
              ctx.rotate(0.45)
              ctx.scale(1.15, 0.45)
            }
            const mHd = mDrawable.hdScale
            const mFootOffset =
              mDrawable.sheetSpec?.footPadFrac !== undefined
                ? mDrawable.sheetSpec.footPadFrac * mh
                : 2 * baseMonsterScale * mHd
            drawResolvedDrawable(ctx, mDrawable, Math.round(-mw / 2), Math.round(-mh + mFootOffset), mw, mh)

            if (isEnemyHurt && !isDead) {
              ctx.globalAlpha = 0.55
              ctx.fillStyle = '#ffffff'
              ctx.beginPath()
              ctx.ellipse(0, -mh / 2, mw * 0.34, mh * 0.34, 0, 0, Math.PI * 2)
              ctx.fill()
            }
            ctx.restore()

            if (isPlayerAttacking) {
              drawStageSkillEffect(ctx, {
                heroX: heroX + heroLunge,
                heroY: floorY,
                enemyX: enemyX - 10,
                enemyY: floorY - mh * 0.45,
                floorY,
                skillId: pSkillId ?? null,
                weaponType,
                progress: pAtkAge,
                color: pSkillCol || weaponColor || '#ffd60a',
              })
            }
            if (isEnemyAttacking) {
              const enemyFxType: WeaponType =
                mon.def.sprite === 'demon' || mon.def.sprite === 'ghost'
                  ? 'staff'
                  : mon.def.sprite === 'abyss_knight' || mon.def.sprite === 'gale_sentinel'
                    ? 'sword'
                    : 'dagger'
              const enemyFxColor = mSpec.accentColor || '#ff6b6b'
              drawSlashEffect(ctx, heroX + 12, floorY - hh * 0.45, enemyFxType, eAtkAge, enemyFxColor)
            }
          }

          // Impact particle burst & flash for critical hits / high-damage strikes
          if (shake.active && activeShake) {
            const burstAge = Math.min(
              1,
              Math.max(0, (frameNow - activeShake.startedAt) / Math.max(1, activeShake.durationMs)),
            )
            const burstOriginX = enemyX - 6
            const burstOriginY = floorY - 38
            ctx.save()
            ctx.globalAlpha = Math.max(0, 1 - burstAge)
            for (let i = 0; i < 12; i++) {
              const angle = (i / 12) * Math.PI * 2 + (activeShake.id % 5) * 0.4
              const dist = (10 + (i % 3) * 8) * burstAge * (0.8 + activeShake.intensity * 0.6)
              const px = Math.round(burstOriginX + Math.cos(angle) * dist)
              const py = Math.round(burstOriginY + Math.sin(angle) * dist * 0.75)
              ctx.fillStyle = activeShake.isCrit ? (i % 2 === 0 ? '#ffd60a' : '#ffffff') : (i % 2 === 0 ? '#ff9f1c' : '#ffffff')
              const size = activeShake.isCrit && i % 3 === 0 ? 4 : 3
              ctx.fillRect(px, py, size, size)
            }
            ctx.restore()

            if (shake.flashAlpha > 0) {
              ctx.save()
              ctx.globalAlpha = shake.flashAlpha
              ctx.fillStyle = activeShake.isCrit ? '#ffd60a' : '#ffffff'
              ctx.fillRect(-16, -16, w + 32, h + 32)
              ctx.restore()
            }
          }

          ctx.restore()
        }
      }
      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div
      ref={stageWrapperRef}
      data-testid="arena-stage"
      data-shaking="false"
      data-shake-count={shakeEvent?.id ?? 0}
      data-shake-reason={shakeEvent?.reason ?? 'none'}
      className="relative w-full overflow-hidden border-2 border-[#0e0f1a] bg-[#0e0f1a] will-change-transform"
    >
      <canvas
        ref={canvasRef}
        width={560}
        height={230}
        aria-label="เวทีต่อสู้ Pixel Quest"
        className="block h-48 w-full object-cover sm:h-56"
      />

      {/* Crisp floating damage & combat text overlay */}
      <div
        aria-live="off"
        className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none"
      >
        <AnimatePresence>
          {popups.map((pop) => {
            const isEnemyTarget = pop.target === 'enemy'
            const durationSec = pop.durationMs / 1000
            const riseY = pop.crit ? -58 : -46
            return (
              <motion.div
                key={pop.id}
                data-testid="arena-floating-damage"
                data-target={pop.target}
                data-kind={pop.kind}
                data-amount={pop.amount}
                initial={{
                  opacity: 0,
                  x: pop.offsetX,
                  y: pop.offsetY + 10,
                  scale: pop.crit ? 0.55 : 0.75,
                }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  x: [
                    pop.offsetX,
                    pop.offsetX + pop.arcX * 0.45,
                    pop.offsetX + pop.arcX * 0.8,
                    pop.offsetX + pop.arcX,
                  ],
                  y: [
                    pop.offsetY + 8,
                    pop.offsetY + riseY * 0.45,
                    pop.offsetY + riseY * 0.82,
                    pop.offsetY + riseY,
                  ],
                  scale: pop.crit ? [0.6, 1.38, 1.06, 0.96] : [0.78, 1.2, 1.0, 0.94],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: durationSec,
                  times: [0, 0.16, 0.68, 1],
                  ease: 'easeOut',
                }}
                style={{
                  left: isEnemyTarget ? '73%' : '25%',
                  top: isEnemyTarget ? '42%' : '45%',
                  color: pop.color,
                  textShadow:
                    '-2px -2px 0 #0e0f1a, 2px -2px 0 #0e0f1a, -2px 2px 0 #0e0f1a, 2px 2px 0 #0e0f1a, 0 -2px 0 #0e0f1a, 0 2px 0 #0e0f1a, -2px 0 0 #0e0f1a, 2px 0 0 #0e0f1a, 0 4px 0 rgba(0,0,0,0.65)',
                }}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center whitespace-nowrap font-bold leading-none"
              >
                {pop.badge && (
                  <span className="mb-0.5 text-[10px] tracking-wider uppercase sm:text-[11px]">
                    {pop.badge}
                  </span>
                )}
                <span
                  className={
                    pop.crit
                      ? 'text-2xl tabular-nums sm:text-3xl'
                      : pop.kind === 'pet'
                        ? 'text-base tabular-nums sm:text-lg'
                        : 'text-lg tabular-nums sm:text-2xl'
                  }
                >
                  {pop.text}
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
