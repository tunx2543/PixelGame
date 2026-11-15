'use client'

import { useEffect, useRef } from 'react'
import { ITEMS, JOBS, type WeaponType } from '@/lib/game/data'
import type { SaveData } from '@/lib/game/engine'
import type { EncounterBiome, EncounterEnemy } from '@/lib/game/encounter'
import { getMonsterModelSpec } from '@/lib/game/models-2d'
import { humanSprite, jobHumanColors, monsterSprite, type SpriteAction } from '@/lib/game/sprites'
import { getActivePetBonuses } from '@/lib/game/systems'

export interface StagePopup {
  id: number
  target: 'player' | 'enemy'
  text: string
  color: string
  crit?: boolean
  createdAt: number
}

interface EncounterStageCanvasProps {
  save: SaveData
  enemy: EncounterEnemy | null
  phase: 'LOADING' | 'READY' | 'FIGHTING' | 'VICTORY' | 'DEFEAT'
  playerAttackPulse: number
  playerSkillColor: string | null
  playerHitPulse: number
  enemyAttackPulse: number
  enemyHitPulse: number
  petAttackPulse?: number
  popups: StagePopup[]
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
  playerHitPulse,
  enemyAttackPulse,
  enemyHitPulse,
  petAttackPulse = 0,
  popups,
}: EncounterStageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const latestRef = useRef({
    save,
    enemy,
    phase,
    playerAttackPulse,
    playerSkillColor,
    playerHitPulse,
    enemyAttackPulse,
    enemyHitPulse,
    petAttackPulse,
    popups,
  })
  latestRef.current = {
    save,
    enemy,
    phase,
    playerAttackPulse,
    playerSkillColor,
    playerHitPulse,
    enemyAttackPulse,
    enemyHitPulse,
    petAttackPulse,
    popups,
  }

  useEffect(() => {
    let rafId = 0
    const start = performance.now()

    const draw = (now: number) => {
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const {
            save: s,
            enemy: mon,
            phase: ph,
            playerAttackPulse: pAtk,
            playerSkillColor: pSkillCol,
            playerHitPulse: pHit,
            enemyAttackPulse: eAtk,
            enemyHitPulse: eHit,
            petAttackPulse: petAtk,
            popups: activePopups,
          } = latestRef.current

          const w = canvas.width
          const h = canvas.height
          const t = (now - start) / 1000
          const biome: EncounterBiome = mon?.biome ?? 'meadow'
          const pal = BIOME_PALETTE[biome]

          ctx.imageSmoothingEnabled = false

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
          const job = JOBS[s.jobId] ?? JOBS.novice
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
              ? Math.floor(pAtkAge * 24) % 6
              : Math.sin(t * 1.4) > 0.96
                ? -1
                : Math.floor(t * (ph === 'FIGHTING' ? 3.2 : 2.2)) % 4
          const styledJobColors = jobHumanColors(s.jobId, job.colors, s.gm)
          const heroSprite = humanSprite(
            styledJobColors,
            'right',
            heroFrame,
            weaponType,
            weaponColor,
            heroStrike,
            heroAction,
            heroAttackFrame,
          )
          const heroScale = 2.75
          const hw = heroSprite.width * heroScale
          const hh = heroSprite.height * heroScale

          // Hero shadow
          ctx.fillStyle = 'rgba(0,0,0,0.36)'
          ctx.beginPath()
          ctx.ellipse(heroX + heroLunge, floorY + 2, 22, 7, 0, 0, Math.PI * 2)
          ctx.fill()

          ctx.save()
          if (ph === 'DEFEAT') ctx.globalAlpha = 0.45
          else if (isPlayerHurt) ctx.globalAlpha = 0.65
          ctx.translate(heroX + heroLunge + heroShake, floorY)
          ctx.drawImage(heroSprite, Math.round(-hw / 2), Math.round(-hh + 2 * heroScale), hw, hh)
          ctx.restore()

          // --- Active Combat Pet Sprite ---
          const activePet = getActivePetBonuses(s.petState, s.equippedGemCompanion, s.ownedGemItems)
          const petX = heroX - 54 + Math.sin(t * 2.5) * 4
          const petY = floorY - 38 + Math.sin(t * 4) * 5
          if (activePet) {
            const pCell = 3.5
            const pPalette = {
              '1': activePet.def.colors.primary,
              '2': activePet.def.colors.secondary,
              '3': activePet.def.colors.accent,
            }
            ctx.fillStyle = 'rgba(0,0,0,0.28)'
            ctx.beginPath()
            ctx.ellipse(petX, floorY + 1, 12, 4, 0, 0, Math.PI * 2)
            ctx.fill()

            ctx.save()
            activePet.def.pixels.forEach((row, rIdx) => {
              Array.from(row.padEnd(8, '.').slice(0, 8)).forEach((cell, cIdx) => {
                if (cell === '.') return
                ctx.fillStyle = pPalette[cell as keyof typeof pPalette]
                ctx.fillRect(
                  Math.round(petX - 4 * pCell + cIdx * pCell),
                  Math.round(petY - 4 * pCell + rIdx * pCell),
                  pCell,
                  pCell,
                )
              })
            })
            ctx.restore()

            const petBoltAge = (now - petAtk) / 260
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
            const mHover = flying ? Math.sin(t * 4.2) * 5.5 - (mSpec.archetype === 'abyss_dragon' ? 8 : 10) : 0
            const mLunge = isEnemyAttacking ? -Math.sin(eAtkAge * Math.PI) * 36 : 0
            const mShake = isEnemyHurt ? Math.sin(eHitAge * 28) * 6 : 0
            const mStepIn = isEnemyAttacking && eAtkAge < 0.25
            const mStrike = isEnemyAttacking && eAtkAge >= 0.25
            const mAction: SpriteAction = mStrike ? 'attack' : mStepIn ? 'walk' : ph === 'FIGHTING' && flying ? 'walk' : 'idle'
            const mAtkFrame = mStrike ? Math.min(3, Math.floor(((eAtkAge - 0.25) / 0.75) * 4)) : 0
            const mFrame = mStrike
              ? mAtkFrame
              : mStepIn
                ? Math.floor(eAtkAge * 24) % 6
                : flying
                  ? Math.floor(t * 8) % 6
                  : Math.floor(t * 2.8) % 4
            const mImg = monsterSprite(
              mon.def.sprite,
              mon.def.color,
              mFrame,
              mStrike,
              mAction,
              'left',
              mAtkFrame,
              mon.def.id,
            )

            const targetHeight = mon.rarity === 'boss' ? 94 : mon.rarity === 'elite' ? 82 : 74
            const baseMonsterScale = Math.max(2.2, Math.min(3.1, targetHeight / Math.max(1, mImg.height)))
            const mw = mImg.width * baseMonsterScale
            const mh = mImg.height * baseMonsterScale

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.38)'
            ctx.beginPath()
            ctx.ellipse(enemyX + mLunge, floorY + 2, mw * 0.36, 8, 0, 0, Math.PI * 2)
            ctx.fill()

            // Rarity aura
            if (!isDead && mon.rarity !== 'normal') {
              ctx.save()
              ctx.strokeStyle = mon.rarity === 'boss' ? (mSpec.auraColor || '#e5484d') : '#c77dff'
              ctx.lineWidth = 2
              ctx.globalAlpha = 0.4 + Math.sin(t * 5) * 0.2
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
            ctx.drawImage(mImg, Math.round(-mw / 2), Math.round(-mh + 2 * baseMonsterScale), mw, mh)

            if (isEnemyHurt && !isDead) {
              ctx.globalAlpha = 0.55
              ctx.fillStyle = '#ffffff'
              ctx.beginPath()
              ctx.ellipse(0, -mh / 2, mw * 0.34, mh * 0.34, 0, 0, Math.PI * 2)
              ctx.fill()
            }
            ctx.restore()

            if (isPlayerAttacking) {
              drawSlashEffect(
                ctx,
                enemyX - 10,
                floorY - mh * 0.45,
                weaponType,
                pAtkAge,
                pSkillCol || weaponColor || '#ffd60a',
              )
            }
            if (isEnemyAttacking) {
              const enemyFxType: WeaponType =
                mSpec.archetype === 'abyss_dragon' || mSpec.archetype === 'demon_lord' || mSpec.archetype === 'demon'
                  ? 'staff'
                  : mSpec.archetype === 'abyss_knight'
                    ? 'sword'
                    : 'dagger'
              const enemyFxColor =
                mSpec.archetype === 'abyss_dragon'
                  ? '#e0aaff'
                  : mSpec.archetype === 'abyss_knight'
                    ? '#c77dff'
                    : mSpec.archetype === 'gale_sentinel'
                      ? '#ffd60a'
                      : '#ff6b6b'
              drawSlashEffect(ctx, heroX + 12, floorY - hh * 0.45, enemyFxType, eAtkAge, enemyFxColor)
            }
          }

          // Floating damage popups
          for (const pop of activePopups) {
            const age = (now - pop.createdAt) / 850
            if (age < 0 || age > 1) continue
            const px = pop.target === 'enemy' ? enemyX : heroX
            const py = floorY - 68 - age * 28
            ctx.save()
            ctx.globalAlpha = Math.max(0, 1 - Math.pow(age, 1.8))
            ctx.font = `bold ${pop.crit ? 19 : 15}px var(--font-pixel), sans-serif`
            ctx.textAlign = 'center'
            ctx.lineWidth = 4
            ctx.strokeStyle = '#0e0f1a'
            ctx.strokeText(pop.text, px, py)
            ctx.fillStyle = pop.color
            ctx.fillText(pop.text, px, py)
            ctx.restore()
          }
        }
      }
      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div className="relative w-full overflow-hidden border-2 border-[#0e0f1a] bg-[#0e0f1a]">
      <canvas
        ref={canvasRef}
        width={560}
        height={230}
        aria-label="เวทีต่อสู้ Pixel Quest"
        className="pixelated block h-48 w-full object-cover sm:h-56"
      />
    </div>
  )
}
