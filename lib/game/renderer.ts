import { ITEMS, JOBS, MONSTERS, type MonsterSprite } from './data'
import { GEM_SHOP_ITEMS } from './gem-shop'
import { currentMap, game } from './engine'
import { TILE } from './maps'
import { getMonsterModelSpec } from './models-2d'
import {
  type Dir,
  humanSprite,
  jobHumanColors,
  mapCanvas,
  monsterSprite,
  npcSprite,
  type SpriteAction,
} from './sprites'
import { getActivePetBonuses } from './systems'

const THEME_BG: Record<string, string> = {
  town: '#2d5a27',
  meadow: '#2d5a27',
  forest: '#10291a',
  cave: '#0b0b16',
  volcano: '#140808',
}

function drawGemItemPixels(
  ctx: CanvasRenderingContext2D,
  item: { pixels: string[]; colors: { primary: string; secondary: string; accent: string } },
  x: number,
  y: number,
  cellSize = 1,
) {
  const colors = { '1': item.colors.primary, '2': item.colors.secondary, '3': item.colors.accent }
  ctx.save()
  item.pixels.forEach((row, rowIndex) => {
    Array.from(row.padEnd(8, '.').slice(0, 8)).forEach((pixel, columnIndex) => {
      if (pixel === '.') return
      ctx.fillStyle = colors[pixel as keyof typeof colors]
      ctx.fillRect(Math.round(x + columnIndex * cellSize), Math.round(y + rowIndex * cellSize), cellSize, cellSize)
    })
  })
  ctx.restore()
}

function drawWeaponAttackOverlay(
  ctx: CanvasRenderingContext2D,
  dir: string,
  weaponType: string,
  progress: number,
  color: string,
) {
  const angleMap: Record<string, number> = {
    right: 0,
    down: Math.PI / 2,
    left: Math.PI,
    up: -Math.PI / 2,
  }
  const baseAngle = angleMap[dir] ?? Math.PI / 2
  const fade = Math.max(0, 1 - progress * 0.85)
  ctx.save()
  ctx.globalAlpha *= fade
  if (weaponType === 'staff') {
    const r = 7 + progress * 8
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(Math.cos(baseAngle) * 8, -12 + Math.sin(baseAngle) * 6, r * 0.55, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#fff3b0'
    for (let i = 0; i < 4; i++) {
      const a = baseAngle + progress * 4 + (i * Math.PI) / 2
      ctx.fillRect(
        Math.round(Math.cos(baseAngle) * 8 + Math.cos(a) * r * 0.6),
        Math.round(-12 + Math.sin(baseAngle) * 6 + Math.sin(a) * r * 0.6),
        1.5,
        1.5,
      )
    }
  } else if (weaponType === 'bow') {
    const dist = 8 + progress * 10
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(Math.cos(baseAngle) * (dist - 4), -11 + Math.sin(baseAngle) * (dist - 4))
    ctx.lineTo(Math.cos(baseAngle) * (dist + 5), -11 + Math.sin(baseAngle) * (dist + 5))
    ctx.stroke()
  } else if (weaponType === 'dagger') {
    const cx = Math.cos(baseAngle) * 10
    const cy = -10 + Math.sin(baseAngle) * 7
    ctx.strokeStyle = color
    ctx.lineWidth = 1.6
    const sweep = (progress - 0.5) * 1.4
    ctx.beginPath()
    ctx.arc(cx, cy, 8, baseAngle - 0.9 + sweep, baseAngle + 0.3 + sweep)
    ctx.stroke()
    ctx.strokeStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(cx, cy, 6, baseAngle - 0.3 - sweep, baseAngle + 0.9 - sweep)
    ctx.stroke()
  } else {
    const cx = Math.cos(baseAngle) * 7
    const cy = -10 + Math.sin(baseAngle) * 5
    const sweepStart = baseAngle - 1.05 + progress * 0.5
    const sweepEnd = baseAngle + 0.95 + progress * 0.4
    ctx.strokeStyle = color
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.arc(cx, cy, 12, sweepStart, sweepEnd)
    ctx.stroke()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.arc(cx, cy, 10.5, sweepStart + 0.15, sweepEnd - 0.15)
    ctx.stroke()
  }
  ctx.restore()
}

function monsterFacing(
  defId: string,
  sprite: MonsterSprite,
  x: number,
  y: number,
  vx: number,
  vy: number,
  flip: boolean,
  provoked: boolean,
): Dir {
  const spec = getMonsterModelSpec(defId, sprite)
  if (!spec.supports4Way) {
    return flip ? 'left' : 'right'
  }
  if (provoked) {
    const dx = (game.p?.x ?? x) - x
    const dy = (game.p?.y ?? y) - y
    if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right'
    return dy < 0 ? 'up' : 'down'
  }
  if (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) {
    if (Math.abs(vx) >= Math.abs(vy)) return vx < 0 ? 'left' : 'right'
    return vy < 0 ? 'up' : 'down'
  }
  return flip ? 'left' : 'down'
}

export function render(ctx: CanvasRenderingContext2D, cw: number, ch: number, dpr: number, font: string) {
  const p = game.p
  if (!p) return
  const map = currentMap()
  const t = game.time
  ctx.imageSmoothingEnabled = false

  const cssW = cw / dpr
  const zoom = cssW < 700 ? 1.6 : 2.4
  const s = zoom * dpr
  const viewW = cw / s
  const viewH = ch / s
  const mapW = map.width * TILE
  const mapH = map.height * TILE
  let camX = p.x - viewW / 2
  let camY = p.y - 8 - viewH / 2
  camX = mapW <= viewW ? (mapW - viewW) / 2 : Math.max(0, Math.min(mapW - viewW, camX))
  camY = mapH <= viewH ? (mapH - viewH) / 2 : Math.max(0, Math.min(mapH - viewH, camY))
  camX = Math.round(camX * s) / s
  camY = Math.round(camY * s) / s

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = THEME_BG[map.theme]
  ctx.fillRect(0, 0, cw, ch)
  ctx.setTransform(s, 0, 0, s, -camX * s, -camY * s)
  ctx.drawImage(mapCanvas(map), 0, 0)

  if (map.theme === 'volcano') {
    ctx.fillStyle = `rgba(255,120,0,${0.04 + Math.sin(t * 2) * 0.02})`
    ctx.fillRect(0, 0, mapW, mapH)
  }

  for (const pt of map.portals) {
    const cx = (pt.x + pt.w / 2) * TILE
    const cy = (pt.y + pt.h / 2) * TILE
    const pulse = 0.6 + Math.sin(t * 4) * 0.2
    ctx.fillStyle = `rgba(120, 80, 255, ${0.25 * pulse})`
    ctx.beginPath()
    ctx.ellipse(cx, cy, 14, 34, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = `rgba(150, 230, 255, ${0.5 * pulse})`
    ctx.beginPath()
    ctx.ellipse(cx, cy, 7, 26, 0, 0, Math.PI * 2)
    ctx.fill()
    for (let i = 0; i < 6; i++) {
      const a = t * 2 + i
      ctx.fillStyle = i % 2 ? '#e0aaff' : '#caf0f8'
      ctx.fillRect(Math.round(cx + Math.cos(a) * 9), Math.round(cy + Math.sin(a * 1.3) * 26), 1, 1)
    }
  }

  if (map.id === 'town') drawFountain(ctx, 20 * TILE, 14 * TILE, t)

  for (const drop of game.groundDrops) {
    const item = ITEMS[drop.itemId]
    if (!item) continue
    const bob = Math.sin(t * 5 + drop.x) * 1.5
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(Math.round(drop.x - 4), Math.round(drop.y + 3), 9, 3)
    ctx.fillStyle = item.color
    ctx.fillRect(Math.round(drop.x - 3), Math.round(drop.y - 5 + bob), 7, 7)
    ctx.strokeStyle = '#fff3b0'
    ctx.strokeRect(Math.round(drop.x - 4), Math.round(drop.y - 6 + bob), 9, 9)
    ctx.fillStyle = item.color
    ctx.font = `6px ${font}`
    ctx.textAlign = 'center'
    ctx.fillText(`${item.name} x${drop.qty}`, drop.x, drop.y - 10 + bob)
    ctx.textAlign = 'start'
  }

  type Ent = { y: number; draw: () => void }
  const ents: Ent[] = []

  for (const n of map.npcs) {
    const fx = n.x * TILE
    const fy = n.y * TILE + 8
    const near = game.nearNpc?.id === n.id
    ents.push({
      y: fy,
      draw: () => {
        const phase = t * 2.6 + fx * 0.15
        const breath = Math.sin(phase)
        const scaleX = 1 - breath * 0.02
        const scaleY = 1 + breath * 0.024
        const idleF = Math.sin(t * 1.1 + fx) > 0.96 ? -1 : Math.floor(t * 2 + fx) % 4
        const rawNpc = npcSprite(n.id)
        const img = rawNpc ?? humanSprite(n.colors, 'down', idleF, null, '#ced4da', false, 'idle')
        const baseScale = rawNpc ? 1.15 : 1
        const drawW = img.width * baseScale
        const drawH = img.height * baseScale
        const nearHop = near ? -Math.abs(Math.sin(t * 5)) * 1.6 : 0
        shadow(ctx, fx, fy, 6 - breath * 0.3)
        ctx.save()
        ctx.translate(fx, fy + nearHop)
        ctx.scale(scaleX, scaleY)
        ctx.drawImage(img, Math.round(-drawW / 2), Math.round(-drawH), drawW, drawH)
        if (near) {
          ctx.fillStyle = `rgba(122, 229, 130, ${0.45 + Math.sin(t * 6) * 0.25})`
          ctx.fillRect(-1, -drawH - 4, 2, 2)
        }
        ctx.restore()
      },
    })
  }

  for (const m of game.monsters) {
    if (m.dead) continue
    const def = MONSTERS[m.defId]
    if (!def) continue
    ents.push({
      y: m.y,
      draw: () => {
        const mSpec = getMonsterModelSpec(def.id, def.sprite, def.color)
        const walking = m.moving
        const attacking = m.lunge > 0
        const action: SpriteAction = attacking ? 'attack' : walking ? 'walk' : 'idle'
        const dir = monsterFacing(def.id, def.sprite, m.x, m.y, m.vx, m.vy, m.flip, m.provoked)
        const speedMul = m.provoked ? 1.3 : 1
        const attackProgress = attacking ? Math.max(0, Math.min(1, 1 - m.lunge / 0.3)) : 0
        const attackFrame = Math.min(3, Math.floor(attackProgress * 4))
        const walkFrame = Math.floor(m.animT * 10 * speedMul) % 6
        const idleFrame = Math.floor(m.animT * 2.8) % 4
        const frame = attacking ? attackFrame : walking ? walkFrame : idleFrame

        const img = monsterSprite(def.sprite, def.color, frame, attacking, action, dir, attackFrame, def.id)
        const scale = def.boss ? 1.65 : 1.05
        const w = img.width * scale
        const h = img.height * scale

        const flying = mSpec.flying
        const hover = flying ? Math.round(Math.sin(m.animT * 4.2) * 2.4) - (mSpec.archetype === 'abyss_dragon' ? 3 : 4) : 0
        const hoverX = flying ? Math.cos(m.animT * 2.4) * 1.4 : 0
        const faceDx = (game.p?.x ?? m.x) - m.x
        const faceDy = (game.p?.y ?? m.y) - m.y
        const faceLen = Math.hypot(faceDx, faceDy) || 1
        const faceX = faceDx / faceLen
        const faceY = faceDy / faceLen
        const attackReach = attacking ? Math.sin(attackProgress * Math.PI) * (def.boss ? 5 : 3.5) : 0
        const hitShake = m.hitFlash > 0 ? Math.sin(m.hitFlash * 95) * 2.2 : 0

        shadow(ctx, m.x + hoverX, m.y, (5.5 - (flying ? Math.sin(m.animT * 4.2) * 0.4 : 0)) * (def.boss ? 1.55 : 1))
        if (def.boss || mSpec.auraColor) {
          ctx.save()
          ctx.strokeStyle = mSpec.auraColor ?? def.color
          ctx.globalAlpha = (def.boss ? 0.28 : 0.16) + Math.sin(t * 4) * 0.1
          ctx.lineWidth = def.boss ? 1.3 : 1
          ctx.beginPath()
          ctx.ellipse(m.x, m.y, (w * 0.32), (w * 0.12), 0, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }

        ctx.save()
        if (m.hitFlash > 0) ctx.globalAlpha = 0.65
        if (def.sprite === 'ghost') ctx.globalAlpha *= 0.8 + Math.sin(m.animT * 4) * 0.08
        ctx.translate(
          Math.round(m.x + hoverX + hitShake + faceX * attackReach),
          Math.round(m.y + faceY * attackReach + hover),
        )
        ctx.drawImage(img, Math.round(-w / 2), Math.round(-h + 2 * scale), w, h)

        if (m.hitFlash > 0) {
          ctx.globalAlpha = Math.min(0.55, m.hitFlash * 4)
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.ellipse(0, -h / 2, w * 0.32, h * 0.32, 0, 0, Math.PI * 2)
          ctx.fill()
        }
        if (attacking) {
          ctx.globalAlpha = Math.min(1, m.lunge / 0.12)
          ctx.strokeStyle = def.boss ? (mSpec.accentColor || '#ff6b6b') : '#fff1ad'
          ctx.lineWidth = def.boss ? 2.2 : 1.6
          ctx.beginPath()
          ctx.arc(0, -h * 0.45, Math.max(w, h) * 0.55, Math.atan2(faceY, faceX) - 0.8, Math.atan2(faceY, faceX) + 0.8)
          ctx.stroke()
        }
        ctx.restore()
      },
    })
  }

  for (const other of game.remotePlayers) {
    if (other.invisible || other.mapId !== map.id) continue
    const networkBlend = other.receivedAt ? Math.min(1, (Date.now() - other.receivedAt) / 100) : 1
    const remoteX = (other.previousX ?? other.x) + (other.x - (other.previousX ?? other.x)) * networkBlend
    const remoteY = (other.previousY ?? other.y) + (other.y - (other.previousY ?? other.y)) * networkBlend
    const remoteJob = JOBS[other.jobId] ?? JOBS.novice
    const remoteAttacking = other.attackAnim > 0
    const remoteAction: SpriteAction = remoteAttacking ? 'attack' : other.moving ? 'walk' : 'idle'
    const atkProgress = remoteAttacking ? Math.max(0, Math.min(1, 1 - other.attackAnim / 0.3)) : 0
    const remoteAtkFrame = Math.min(3, Math.floor(atkProgress * 4))
    const remoteFrame = remoteAttacking
      ? remoteAtkFrame
      : other.moving
        ? Math.floor(t * 11) % 6
        : (Math.sin(t * 1.3 + remoteX) > 0.96 ? -1 : Math.floor(t * 2.4) % 4)
    const remoteWeapon = remoteJob.weaponTypes[0] ?? 'stick'
    const styledColors = jobHumanColors(other.jobId, remoteJob.colors, other.gm)
    const remoteImg = humanSprite(
      styledColors,
      other.facing,
      remoteFrame,
      remoteWeapon,
      remoteJob.colors.accent,
      remoteAttacking,
      remoteAction,
      remoteAtkFrame,
    )
    const remoteW = remoteImg.width
    const remoteH = remoteImg.height
    ents.push({
      y: remoteY,
      draw: () => {
        const lungeDist = remoteAttacking ? Math.sin(atkProgress * Math.PI) * 3 : 0
        const ox = other.facing === 'left' ? -lungeDist : other.facing === 'right' ? lungeDist : 0
        const oy = other.facing === 'up' ? -lungeDist : other.facing === 'down' ? lungeDist : 0
        shadow(ctx, remoteX, remoteY, 6)
        if (other.gm) {
          ctx.fillStyle = `rgba(255, 214, 10, ${0.18 + Math.sin(t * 5) * 0.08})`
          ctx.beginPath()
          ctx.ellipse(remoteX, remoteY, 10, 4, 0, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.save()
        ctx.translate(Math.round(remoteX + ox), Math.round(remoteY + oy))
        ctx.drawImage(remoteImg, Math.round(-remoteW / 2), Math.round(-remoteH + 2), remoteW, remoteH)
        if (remoteAttacking) {
          drawWeaponAttackOverlay(ctx, other.facing, remoteWeapon, atkProgress, remoteJob.colors.accent)
        }
        ctx.restore()
      },
    })
  }

  const job = JOBS[p.jobId] ?? JOBS.novice
  const weapon = p.equipment.weapon ? ITEMS[p.equipment.weapon.itemId] : null
  const gemFashion = GEM_SHOP_ITEMS.find((item) => item.id === p.equippedGemFashion)
  const activePet = getActivePetBonuses(p.petState, p.equippedGemCompanion, p.ownedGemItems)
  ents.push({
    y: p.y,
    draw: () => {
      const attacking = game.attackAnim > 0
      const action: SpriteAction = attacking ? 'attack' : game.moving ? 'walk' : 'idle'
      const atkProgress = attacking ? Math.max(0, Math.min(1, 1 - game.attackAnim / 0.3)) : 0
      const atkFrame = Math.min(3, Math.floor(atkProgress * 4))
      const frame = attacking
        ? atkFrame
        : game.moving
          ? Math.floor(game.walkT * 11) % 6
          : (Math.sin(t * 1.4) > 0.96 ? -1 : Math.floor(t * 2.4) % 4)
      const weaponType = weapon?.weaponType ?? job.weaponTypes[0] ?? 'stick'
      const styledColors = jobHumanColors(p.jobId, job.colors, p.gm)
      const img = humanSprite(
        styledColors,
        game.facing,
        frame,
        weaponType,
        weapon?.color ?? job.colors.accent,
        attacking,
        action,
        atkFrame,
      )
      const drawW = img.width
      const drawH = img.height
      const stride = game.moving ? Math.sin(game.walkT * 11 * Math.PI / 3) : 0
      const lungeDist = attacking ? Math.sin(atkProgress * Math.PI) * 3.5 : 0
      let ox = 0
      let oy = 0
      if (attacking) {
        if (game.facing === 'left') ox = -lungeDist
        else if (game.facing === 'right') ox = lungeDist
        else if (game.facing === 'up') oy = -lungeDist
        else oy = lungeDist
      }

      shadow(ctx, p.x, p.y, 6)
      if (game.moving && !p.invisible) {
        ctx.save()
        ctx.fillStyle = 'rgba(255,255,255,0.28)'
        const dustPhase = (game.walkT * 4) % 1
        ctx.globalAlpha = (1 - dustPhase) * 0.45
        const dx = game.facing === 'left' ? 4 : game.facing === 'right' ? -4 : (stride > 0 ? -3 : 3)
        ctx.fillRect(Math.round(p.x + dx - dustPhase * dx), Math.round(p.y - 1 - dustPhase * 2), 2, 1.5)
        ctx.restore()
      }
      ctx.globalAlpha = p.invisible ? 0.18 : 1
      if (p.gm) {
        ctx.fillStyle = `rgba(255, 214, 10, ${0.18 + Math.sin(t * 5) * 0.08})`
        ctx.beginPath()
        ctx.ellipse(p.x, p.y, 10, 4, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      if ((p.rebirthCount ?? 0) > 0) {
        ctx.save()
        const rebirthTier = Math.min(6, p.rebirthCount ?? 1)
        const pulse = 0.55 + Math.sin(t * (7 + rebirthTier)) * 0.2
        const colors = ['#b9f6ff', '#8fe9ff', '#72c7ff', '#a78bfa', '#f0abfc', '#ffe08a']
        ctx.globalAlpha = pulse
        ctx.strokeStyle = colors[rebirthTier - 1]
        ctx.shadowColor = colors[rebirthTier - 1]
        ctx.shadowBlur = 7 + rebirthTier * 2
        ctx.lineWidth = 1.2 + rebirthTier * 0.18
        const radius = 9 + rebirthTier * 1.6
        ctx.beginPath()
        ctx.ellipse(p.x, p.y - 8, radius, 3.2 + rebirthTier * 0.35, t * 0.35, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = pulse * 0.7
        ctx.beginPath()
        ctx.ellipse(p.x, p.y - 8, radius + 3, 2.2 + rebirthTier * 0.25, -t * 0.55, 0, Math.PI * 2)
        ctx.stroke()
        for (let spark = 0; spark < 4 + rebirthTier; spark++) {
          const angle = t * 1.8 + spark * (Math.PI * 2 / (4 + rebirthTier))
          const x = p.x + Math.cos(angle) * (radius + 2)
          const y = p.y - 9 + Math.sin(angle) * (4 + rebirthTier * 0.5)
          const size = 1 + (spark % 2)
          ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size)
        }
        ctx.restore()
      }
      if (gemFashion?.id === 'nebula_dragon_wings') {
        ctx.save()
        ctx.globalAlpha = p.invisible ? 0.14 : 0.86
        const wingBob = Math.sin(t * 5) * 0.7
        drawGemItemPixels(ctx, gemFashion, p.x - 8, p.y - drawH + 4 + wingBob, 2)
        ctx.restore()
      }
      ctx.save()
      ctx.translate(Math.round(p.x + ox), Math.round(p.y + oy))
      ctx.drawImage(img, Math.round(-drawW / 2), Math.round(-drawH + 2), drawW, drawH)
      if (attacking) {
        drawWeaponAttackOverlay(ctx, game.facing, weaponType, atkProgress, weapon?.color ?? job.colors.accent)
      }
      ctx.restore()
      if (gemFashion?.id === 'aurora_cat_hood') {
        drawGemItemPixels(ctx, gemFashion, p.x - 5, p.y - drawH - 2, 1.25)
      }
      if (gemFashion?.id === 'sunfire_aura') {
        ctx.save()
        ctx.globalAlpha = p.invisible ? 0.12 : 0.72
        ctx.strokeStyle = gemFashion.colors.primary
        ctx.shadowColor = gemFashion.colors.accent
        ctx.shadowBlur = 7
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.ellipse(p.x, p.y - 7, 12 + Math.sin(t * 4) * 1.5, 8, t * 0.3, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = gemFashion.colors.accent
        for (let spark = 0; spark < 4; spark++) {
          const angle = t * 2 + spark * (Math.PI / 2)
          ctx.fillRect(Math.round(p.x + Math.cos(angle) * 13), Math.round(p.y - 8 + Math.sin(angle) * 9), 2, 2)
        }
        ctx.restore()
      }
      ctx.globalAlpha = 1
    },
  })

  if (activePet) {
    const petOffsetX = game.facing === 'left' ? 12 : game.facing === 'right' ? -12 : -14
    const petX = p.x + petOffsetX + Math.sin(t * 2.5) * 1.5
    const petY = p.y - 8 + Math.sin(t * 4) * 2
    const petScale = activePet.petId === 'aurora_cloud_dragon' ? 2 : 1.5
    ents.push({
      y: petY,
      draw: () => {
        ctx.save()
        ctx.globalAlpha = p.invisible ? 0.18 : 1
        shadow(ctx, petX, petY + 1, activePet.petId === 'aurora_cloud_dragon' ? 6 : 4)
        drawGemItemPixels(ctx, activePet.def, petX - 4 * petScale, petY - 6 * petScale, petScale)
        ctx.restore()
      },
    })
  }

  ents.sort((a, b) => a.y - b.y)
  for (const e of ents) e.draw()

  for (const pr of game.projectiles) {
    if (pr.delay > 0) continue
    ctx.fillStyle = pr.color
    ctx.globalAlpha = 0.4
    ctx.fillRect(Math.round(pr.x - pr.size), Math.round(pr.y - pr.size), pr.size * 2 + 1, pr.size * 2 + 1)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(Math.round(pr.x), Math.round(pr.y), 1 + Math.floor(pr.size / 2), 1 + Math.floor(pr.size / 2))
  }

  for (const e of game.effects) {
    const k = 1 - e.life / e.max
    ctx.save()
    ctx.globalAlpha = Math.max(0, e.life / e.max)
    ctx.strokeStyle = e.color
    ctx.fillStyle = e.color
    if (e.type === 'slash') {
      ctx.lineWidth = 2
      ctx.beginPath()
      const a = e.angle ?? 0
      ctx.arc(e.x, e.y, e.r * (0.6 + k * 0.4), a, a + Math.PI * 0.9)
      ctx.stroke()
    } else if (e.type === 'ring') {
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(e.x, e.y, e.r * (0.3 + k * 0.7), 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha *= 0.2
      ctx.fill()
    } else if (e.type === 'burst') {
      ctx.globalAlpha *= 0.45
      ctx.beginPath()
      ctx.arc(e.x, e.y, e.r * (0.4 + k * 0.6), 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = Math.max(0, e.life / e.max)
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        ctx.fillRect(Math.round(e.x + Math.cos(a) * e.r * k), Math.round(e.y + Math.sin(a) * e.r * k), 2, 2)
      }
    } else if (e.type === 'spark') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        ctx.fillRect(Math.round(e.x + Math.cos(a) * e.r * k), Math.round(e.y + Math.sin(a) * e.r * k), 1, 1)
      }
    } else if (e.type === 'levelup') {
      ctx.globalAlpha *= 0.35
      ctx.fillRect(e.x - 8, e.y - 40 * (0.3 + k), 16, 40 * (0.3 + k))
      ctx.globalAlpha = Math.max(0, e.life / e.max)
      for (let i = 0; i < 12; i++) {
        const px = e.x + Math.sin(i * 2.3) * 12
        const py = e.y - ((k * 50 + i * 7) % 50)
        ctx.fillRect(Math.round(px), Math.round(py), 1, 2)
      }
    }
    ctx.restore()
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0)

  if (map.theme === 'cave' || map.theme === 'forest' || map.theme === 'volcano') {
    const sx = (p.x - camX) * s
    const sy = (p.y - 8 - camY) * s
    const inner = (map.theme === 'cave' ? 50 : 110) * s
    const outer = (map.theme === 'cave' ? 150 : 260) * s
    const g = ctx.createRadialGradient(sx, sy, inner, sx, sy, outer)
    const dark = map.theme === 'cave' ? 'rgba(3,3,12,0.88)' : map.theme === 'forest' ? 'rgba(5,20,10,0.45)' : 'rgba(30,0,0,0.5)'
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, dark)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, cw, ch)
  }

  const toS = (wx: number, wy: number) => [(wx - camX) * s, (wy - camY) * s] as const
  const text = (str: string, x: number, y: number, color: string, size = 10, align: CanvasTextAlign = 'center') => {
    ctx.font = `${Math.round(size * dpr * (zoom / 3) * 1.2)}px ${font}`
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 3 * dpr
    ctx.strokeStyle = 'rgba(10,8,20,0.9)'
    ctx.lineJoin = 'round'
    ctx.strokeText(str, x, y)
    ctx.fillStyle = color
    ctx.fillText(str, x, y)
  }

  for (const pt of map.portals) {
    const [x, y] = toS((pt.x + pt.w / 2) * TILE + (pt.x === 0 ? 14 : -14), (pt.y - 0.3) * TILE)
    text(pt.label, x, y, '#caf0f8', 9)
  }

  for (const n of map.npcs) {
    const npcOffset = npcSprite(n.id) ? 33 : 26
    const [x, y] = toS(n.x * TILE, n.y * TILE + 8 - npcOffset)
    text(`[${n.title}]`, x, y - 13 * dpr, '#f2c94c', 9)
    text(n.name, x, y, '#ffffff', 10)
    if (game.nearNpc?.id === n.id && !game.panel) {
      const [bx, by] = toS(n.x * TILE, n.y * TILE + 14)
      text('กด E เพื่อคุย', bx, by + 8 * dpr, '#7ae582', 9)
    }
  }

  for (const m of game.monsters) {
    if (m.dead) continue
    const def = MONSTERS[m.defId]
    if (!def) continue
    const mSpec = getMonsterModelSpec(def.id, def.sprite, def.color)
    const mScale = def.boss ? 1.65 : 1.05
    const h = Math.round(mSpec.canvasSize.height * mScale * 0.78) + (mSpec.flying ? 5 : 0)
    const [x, y] = toS(m.x, m.y - h)
    const color = def.boss ? '#ff6b6b' : def.level > p.level + 5 ? '#ff8fa3' : def.level < p.level - 5 ? '#a0a0a0' : '#ffffff'
    text(`${def.boss ? '★ ' : ''}${def.name} Lv.${def.level}`, x, y - 8 * dpr, color, def.boss ? 10 : 8)
    if (m.hp < m.maxHp || def.boss) {
      const bw = (def.boss ? 40 : 18) * s
      const bh = 2 * s
      ctx.fillStyle = 'rgba(10,8,20,0.9)'
      ctx.fillRect(x - bw / 2 - dpr, y - dpr, bw + 2 * dpr, bh + 2 * dpr)
      ctx.fillStyle = '#3a0d12'
      ctx.fillRect(x - bw / 2, y, bw, bh)
      ctx.fillStyle = '#e5484d'
      ctx.fillRect(x - bw / 2, y, bw * Math.max(0, m.hp / m.maxHp), bh)
    }
  }

  for (const other of game.remotePlayers) {
    if (other.invisible || other.mapId !== map.id) continue
    const networkBlend = other.receivedAt ? Math.min(1, (Date.now() - other.receivedAt) / 100) : 1
    const remoteX = (other.previousX ?? other.x) + (other.x - (other.previousX ?? other.x)) * networkBlend
    const remoteY = (other.previousY ?? other.y) + (other.y - (other.previousY ?? other.y)) * networkBlend
    const [x, y] = toS(remoteX, remoteY - 28)
    if (other.gm) text('[GM]', x, y - 12 * dpr, '#ffd60a', 8)
    text(`${other.displayName} [${String(other.uid).padStart(5, '0')}] Lv.${other.level}`, x, y, other.gm ? '#ffd60a' : '#8be9fd', 9)
  }

  {
    const [x, y] = toS(p.x, p.y - 28)
    text(`${p.name} [${p.uid === undefined ? 'Guest' : String(p.uid).padStart(5, '0')}]`, x, y, p.gm ? '#ffd60a' : '#ffffff', 10)
    if (p.gm) text('[GM]', x, y - 12 * dpr, '#ffd60a', 8)
    if (game.bubble) {
      ctx.font = `${Math.round(11 * dpr * (zoom / 3) * 1.2)}px ${font}`
      const tw = Math.min(ctx.measureText(game.bubble.text).width, 260 * dpr)
      const by = y - (p.gm ? 34 : 24) * dpr
      ctx.fillStyle = 'rgba(255,250,235,0.95)'
      ctx.fillRect(x - tw / 2 - 6 * dpr, by - 10 * dpr, tw + 12 * dpr, 20 * dpr)
      ctx.fillStyle = 'rgba(10,8,20,0.9)'
      ctx.fillRect(x - 2 * dpr, by + 10 * dpr, 4 * dpr, 3 * dpr)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#1a1423'
      ctx.fillText(game.bubble.text, x, by, 260 * dpr)
    }
  }

  for (const f of game.floats) {
    const [x, y] = toS(f.x, f.y)
    ctx.globalAlpha = Math.min(1, f.life / f.max + 0.2)
    text(f.text, x, y, f.color, f.size)
    ctx.globalAlpha = 1
  }
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath()
  ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawFountain(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  ctx.fillStyle = '#7d7a72'
  ctx.beginPath()
  ctx.ellipse(cx, cy, 17, 13, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#a19d92'
  ctx.beginPath()
  ctx.ellipse(cx, cy - 1, 16, 12, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#3a7bd5'
  ctx.beginPath()
  ctx.ellipse(cx, cy, 13, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(170, 215, 255, 0.7)'
  ctx.lineWidth = 1
  const r = (t * 6) % 10
  ctx.beginPath()
  ctx.ellipse(cx, cy, 3 + r, 2 + r * 0.7, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#8f8a80'
  ctx.fillRect(cx - 2, cy - 12, 4, 12)
  ctx.fillStyle = '#c4bfb4'
  ctx.fillRect(cx - 4, cy - 13, 8, 2)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t
    const k = (t * 1.5 + i * 0.13) % 1
    ctx.fillStyle = i % 2 ? '#caf0f8' : '#90e0ef'
    ctx.fillRect(Math.round(cx + Math.cos(a) * 8 * k), Math.round(cy - 14 + k * k * 12 - Math.sin(k * Math.PI) * 6), 1, 1)
  }
}
