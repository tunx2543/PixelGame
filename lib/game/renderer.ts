import { ITEMS, JOBS, MONSTERS, type MonsterSprite } from './data'
import { GEM_SHOP_ITEMS } from './gem-shop'
import { currentMap, game, getStats } from './engine'
import {
  compareDepthOrder,
  computeCameraZoom,
  createCameraState,
  isEntityOccludedByOverhead,
  stepSmoothCamera,
} from './camera'
import { T, TILE } from './maps'
import { getMonsterModelSpec } from './models-2d'
import { buildTilePropDrawable, buildTownStructureDrawables, drawHdMapObject, type HdDepthDrawable } from './hd-props'
import { LAYERED_PROP_TILES } from './hd-tiles'
import {
  type Dir,
  humanSprite,
  jobHumanColors,
  mapCanvas,
  mapObjectSprite,
  monsterSprite,
  mountSprite,
  petSprite,
  type SpriteAction,
} from './sprites'
import { getActivePetBonuses } from './systems'
import { getActiveMountBonuses } from './mounts'
import { TITLE_DEFS } from './rpg-systems'
import { GATHERING_NODES, getCosmeticDef, getWorldTimePhase, sanitizeExtV2 } from './extended-systems'
import { drawOverworldSkillEffect, drawRebirthAura } from './vfx-canvas'
import { preloadAllSpriteSheets } from './sprite-sheets'

const cameraState = createCameraState('town')
let prevRenderTime = 0

const THEME_BG: Record<string, string> = {
  town: '#2d5a27',
  meadow: '#2d5a27',
  forest: '#10291a',
  cave: '#0b0b16',
  volcano: '#140808',
  abyss: '#0c0814',
  sky: '#72aee6',
  crystal: '#121029',
  frost: '#b8d0e8',
  dream: '#315743',
  colosseum: '#3c3228',
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
  preloadAllSpriteSheets()
  const p = game.p
  if (!p) return
  const map = currentMap()
  const t = game.time
  const dt = prevRenderTime > 0 ? Math.min(0.05, Math.max(0, t - prevRenderTime)) : 0.016
  prevRenderTime = t
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'medium'

  const cssW = cw / dpr
  const cssH = ch / dpr
  const zoom = computeCameraZoom(cssW, cssH)
  const s = zoom * dpr
  const viewW = cw / s
  const viewH = ch / s
  const mapW = map.width * TILE
  const mapH = map.height * TILE
  const cam = stepSmoothCamera(cameraState, p.x, p.y, viewW, viewH, mapW, mapH, map.id, dt, game.facing)
  const camX = cam.x
  const camY = cam.y

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = THEME_BG[map.theme]
  ctx.fillRect(0, 0, cw, ch)
  ctx.setTransform(s, 0, 0, s, -camX * s, -camY * s)
  const mc = mapCanvas(map)
  const hdScaleX = mc.width / mapW
  const hdScaleY = mc.height / mapH
  const vx0 = Math.max(0, camX)
  const vy0 = Math.max(0, camY)
  const vx1 = Math.min(mapW, camX + viewW)
  const vy1 = Math.min(mapH, camY + viewH)
  if (vx1 > vx0 && vy1 > vy0) {
    ctx.drawImage(
      mc,
      vx0 * hdScaleX,
      vy0 * hdScaleY,
      (vx1 - vx0) * hdScaleX,
      (vy1 - vy0) * hdScaleY,
      vx0,
      vy0,
      vx1 - vx0,
      vy1 - vy0,
    )
  }

  const minTx = Math.max(0, Math.floor(camX / TILE) - 2)
  const maxTx = Math.min(map.width - 1, Math.ceil((camX + viewW) / TILE) + 2)
  const minTy = Math.max(0, Math.floor(camY / TILE) - 2)
  const maxTy = Math.min(map.height - 1, Math.ceil((camY + viewH) / TILE) + 3)

  // Subtle animated tile glints (water, lava, ice, magic circles)
  const glintPhase = Math.floor(t * 2.4)
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const tile = map.tiles[ty * map.width + tx]
      if (tile === T.WATER && (tx * 7 + ty * 13 + glintPhase) % 11 === 0) {
        ctx.fillStyle = 'rgba(202, 240, 248, 0.35)'
        ctx.fillRect(tx * TILE + 3 + ((tx + glintPhase) % 6), ty * TILE + 4 + ((ty * 3) % 7), 4, 1)
      } else if (tile === T.LAVA && (tx * 5 + ty * 11 + glintPhase) % 9 === 0) {
        ctx.fillStyle = 'rgba(255, 224, 102, 0.55)'
        ctx.fillRect(tx * TILE + 4 + ((tx * 2 + glintPhase) % 5), ty * TILE + 5 + ((ty * 3) % 6), 3, 2)
      } else if (tile === T.MAGIC_CIRCLE) {
        const cx = (tx + 0.5) * TILE
        const cy = (ty + 0.5) * TILE
        const pulse = 0.45 + Math.sin(t * 3.5 + tx) * 0.25
        ctx.save()
        ctx.strokeStyle = `rgba(199, 125, 255, ${pulse})`
        ctx.lineWidth = 1.1
        ctx.beginPath()
        ctx.ellipse(cx, cy, 9 + Math.sin(t * 2.5) * 1.5, 6 + Math.sin(t * 2.5), 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
    }
  }

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

  // Town fountain is now rendered via Y-sorted HD structures below.

  const visibleObjects = map.objects.filter(
    (obj) => obj.tx >= minTx - 1 && obj.tx <= maxTx + 1 && obj.ty >= minTy - 1 && obj.ty <= maxTy + 2,
  )

  // Ground glow halos for light-emitting RPG objects
  for (const obj of visibleObjects) {
    const ox = (obj.tx + 0.5) * TILE
    const oy = (obj.ty + 0.72) * TILE
    const flicker = 0.85 + Math.sin(t * 7 + obj.tx * 1.7 + obj.ty) * 0.15
    if (obj.kind === 'lamp_post' || obj.kind === 'torch' || obj.kind === 'campfire' || obj.kind === 'anvil_forge') {
      ctx.fillStyle = `rgba(255, 190, 90, ${0.14 * flicker})`
      ctx.beginPath()
      ctx.ellipse(ox, oy, 16 * flicker, 11 * flicker, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (obj.kind === 'magma_brazier') {
      ctx.fillStyle = `rgba(255, 105, 30, ${0.18 * flicker})`
      ctx.beginPath()
      ctx.ellipse(ox, oy, 18 * flicker, 12 * flicker, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (obj.kind === 'crystal_spire' || obj.kind === 'ice_spire') {
      ctx.fillStyle = `rgba(114, 239, 221, ${0.13 * flicker})`
      ctx.beginPath()
      ctx.ellipse(ox, oy, 15, 10, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (obj.kind === 'dream_shrine') {
      ctx.fillStyle = `rgba(255, 179, 198, ${0.16 * flicker})`
      ctx.beginPath()
      ctx.ellipse(ox, oy, 20, 13, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

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

  for (const node of GATHERING_NODES) {
    if (node.mapId !== map.id) continue
    const nx = (node.tx + 0.5) * TILE
    const ny = (node.ty + 0.5) * TILE
    const pulse = 0.55 + Math.sin(t * 4 + node.tx) * 0.3
    ctx.save()
    ctx.fillStyle = node.color
    ctx.globalAlpha = 0.22 * pulse
    ctx.beginPath()
    ctx.ellipse(nx, ny + 2, 10, 6, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.9
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(nx, ny - 7)
    ctx.lineTo(nx + 4, ny - 2)
    ctx.lineTo(nx, ny + 3)
    ctx.lineTo(nx - 4, ny - 2)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  const ents: HdDepthDrawable[] = []
  const overheads: HdDepthDrawable[] = []

  // Town HD Buildings, Watchtowers, and Central Angel Fountain
  if (map.id === 'town') {
    for (const st of buildTownStructureDrawables(t)) {
      ents.push(st)
      if (st.drawOverhead) overheads.push(st)
    }
  }

  // Y-sorted HD Trees, Pines, Bushes, Fences, Rocks, Crystals, Signs
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const tile = map.tiles[ty * map.width + tx]
      if (!LAYERED_PROP_TILES.has(tile) || tile === T.FOUNTAIN) continue
      const prop = buildTilePropDrawable(map, tx, ty, tile)
      if (prop) {
        ents.push(prop)
        if (prop.drawOverhead) overheads.push(prop)
      }
    }
  }

  for (const obj of visibleObjects) {
    const ox = (obj.tx + 0.5) * TILE
    const oy = (obj.ty + 0.88) * TILE
    const objFrame = Math.floor(t * 5 + obj.tx * 0.7 + obj.ty) % 3
    const img = mapObjectSprite(obj.kind, objFrame, obj.variant ?? 0)
    ents.push({
      y: oy,
      draw: () => {
        drawHdMapObject(ctx, obj, ox, oy, t, img)
      },
    })
  }

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
        const img = humanSprite(n.colors, 'down', idleF, null, '#ced4da', false, 'idle')
        const targetNpcH = 33
        const baseScale = targetNpcH / Math.max(1, img.height)
        const drawW = img.width * baseScale
        const drawH = img.height * baseScale
        const nearHop = near ? -Math.abs(Math.sin(t * 5)) * 1.6 : 0
        shadow(ctx, fx, fy, 6.5 - breath * 0.3)
        ctx.save()
        ctx.translate(fx, fy + nearHop)
        ctx.scale(scaleX, scaleY)
        ctx.drawImage(img, Math.round(-drawW / 2), Math.round(-drawH + 2), drawW, drawH)
        if (near) {
          ctx.fillStyle = `rgba(122, 229, 130, ${0.45 + Math.sin(t * 6) * 0.25})`
          ctx.fillRect(-1, -drawH - 2, 2, 2)
        }
        ctx.restore()
      },
    })
  }

  for (const m of game.monsters) {
    const dying = m.dead && (m.dyingT ?? 0) > 0
    if (m.dead && !dying) continue
    const def = MONSTERS[m.defId]
    if (!def) continue
    ents.push({
      y: m.y,
      draw: () => {
        const mSpec = getMonsterModelSpec(def.id, def.sprite, def.color)
        const walking = !dying && m.moving
        const attacking = !dying && m.lunge > 0
        const action: SpriteAction = attacking ? 'attack' : walking ? 'walk' : 'idle'
        const dir = monsterFacing(def.id, def.sprite, m.x, m.y, m.vx, m.vy, m.flip, m.provoked)
        const speedMul = m.provoked ? 1.3 : 1
        const attackProgress = attacking ? Math.max(0, Math.min(1, 1 - m.lunge / 0.3)) : 0
        const attackFrame = Math.min(3, Math.floor(attackProgress * 4))
        const walkFrame = Math.floor(m.animT * 10 * speedMul) % 6
        const idleFrame = Math.floor(m.animT * 2.8) % 4
        const frame = attacking ? attackFrame : walking ? walkFrame : idleFrame

        const img = monsterSprite(def.sprite, def.color, frame, attacking, action, dir, attackFrame, def.id)
        const hdFactor = img.dataset?.hdScale ? Number(img.dataset.hdScale) : 1
        const isHumanRigMob = mSpec.archetype === 'goblin' || mSpec.archetype === 'skeleton'
        const scale = isHumanRigMob ? 31 / Math.max(1, img.height) : (def.boss ? 1.65 : 1.05) / hdFactor
        const w = img.width * scale
        const h = img.height * scale

        if (dying) {
          const dieRatio = Math.max(0, Math.min(1, (m.dyingT ?? 0) / 0.55))
          const collapse = 1 - dieRatio
          ctx.save()
          ctx.globalAlpha = dieRatio
          ctx.translate(m.x, m.y)
          ctx.rotate((m.flip ? -1 : 1) * collapse * 1.15)
          ctx.scale(1 + collapse * 0.12, Math.max(0.25, dieRatio))
          ctx.drawImage(img, -w / 2, -h + 2 * scale * hdFactor, w, h)
          ctx.restore()
          return
        }

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
        if (def.boss || mSpec.auraColor || m.isWorldBoss) {
          ctx.save()
          ctx.strokeStyle = m.isWorldBoss ? '#fde047' : mSpec.auraColor ?? def.color
          ctx.globalAlpha = (def.boss || m.isWorldBoss ? 0.34 : 0.16) + Math.sin(t * 4) * 0.1
          ctx.lineWidth = m.isWorldBoss ? 1.8 : def.boss ? 1.3 : 1
          ctx.beginPath()
          ctx.ellipse(m.x, m.y, w * (m.isWorldBoss ? 0.38 : 0.32), w * (m.isWorldBoss ? 0.14 : 0.12), 0, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }

        ctx.save()
        if (m.hitFlash > 0) ctx.globalAlpha = 0.65
        if (def.sprite === 'ghost') ctx.globalAlpha *= 0.8 + Math.sin(m.animT * 4) * 0.08
        ctx.translate(
          m.x + hoverX + hitShake + faceX * attackReach,
          m.y + faceY * attackReach + hover,
        )
        ctx.drawImage(img, -w / 2, -h + 2 * scale * hdFactor, w, h)

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
    const isRemoteGm = Boolean(other.gm || other.jobId === 'gm')
    const remoteAction: SpriteAction = remoteAttacking ? 'attack' : other.moving ? 'walk' : 'idle'
    const atkProgress = remoteAttacking ? Math.max(0, Math.min(1, 1 - other.attackAnim / 0.3)) : 0
    const remoteAtkFrame = Math.min(3, Math.floor(atkProgress * 4))
    const remoteWalkMod = isRemoteGm && other.facing === 'down' ? 8 : 6
    const remoteFrame = remoteAttacking
      ? remoteAtkFrame
      : other.moving
        ? Math.floor(t * (remoteWalkMod === 8 ? 13 : 11)) % remoteWalkMod
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
    const isRemoteGmEpic = remoteImg.dataset?.gmReady === '1'
    const remoteScale = (isRemoteGmEpic ? 50 : 33) / Math.max(1, remoteImg.height)
    const remoteW = remoteImg.width * remoteScale
    const remoteH = remoteImg.height * remoteScale
    const remoteFootOffset = isRemoteGmEpic ? 10 : 2
    ents.push({
      y: remoteY,
      draw: () => {
        const lungeDist = remoteAttacking ? Math.sin(atkProgress * Math.PI) * 3 : 0
        const ox = other.facing === 'left' ? -lungeDist : other.facing === 'right' ? lungeDist : 0
        const oy = other.facing === 'up' ? -lungeDist : other.facing === 'down' ? lungeDist : 0
        shadow(ctx, remoteX, remoteY, 6.5)
        if (other.gm) {
          ctx.fillStyle = `rgba(255, 214, 10, ${0.18 + Math.sin(t * 5) * 0.08})`
          ctx.beginPath()
          ctx.ellipse(remoteX, remoteY, 10, 4, 0, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.save()
        ctx.translate(Math.round(remoteX + ox), Math.round(remoteY + oy))
        ctx.drawImage(remoteImg, Math.round(-remoteW / 2), Math.round(-remoteH + remoteFootOffset), remoteW, remoteH)
        if (remoteAttacking && !isRemoteGmEpic && !remoteImg.dataset?.sheetId) {
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
  const activeMount = getActiveMountBonuses(p.mountState, p.ownedGemItems)
  const extV2 = sanitizeExtV2(p.extV2)
  const equippedWing = getCosmeticDef(extV2.equippedWing)
  const equippedWeaponSkin = getCosmeticDef(extV2.equippedWeaponSkin)
  const equippedFrame = getCosmeticDef(extV2.equippedFrame)
  ents.push({
    y: p.y,
    draw: () => {
      const castingSkill = game.skillAnim > 0
      const attacking = !castingSkill && game.attackAnim > 0
      const action: SpriteAction = castingSkill ? 'skill' : attacking ? 'attack' : game.moving ? 'walk' : 'idle'
      const atkProgress = attacking ? Math.max(0, Math.min(1, 1 - game.attackAnim / 0.3)) : 0
      const atkFrame = Math.min(3, Math.floor(atkProgress * 4))
      const skillProgress = castingSkill
        ? Math.max(0, Math.min(1, 1 - game.skillAnim / Math.max(0.2, game.skillAnimMax || 0.55)))
        : 0
      const skillFrame = Math.min(5, Math.floor(skillProgress * 6))
      const isGmChar = Boolean(p.gm || p.jobId === 'gm')
      const walkMod = isGmChar && game.facing === 'down' ? 8 : 6
      const frame = castingSkill
        ? skillFrame
        : attacking
          ? atkFrame
          : game.moving
            ? Math.floor(game.walkT * (walkMod === 8 ? 13 : 11)) % walkMod
            : (Math.sin(t * 1.4) > 0.96 ? -1 : Math.floor(t * 2.4) % 4)
      const weaponType = weapon?.weaponType ?? job.weaponTypes[0] ?? 'stick'
      const styledColors = jobHumanColors(p.jobId, job.colors, p.gm)
      const weaponDrawColor = castingSkill
        ? game.skillVfxColor
        : (equippedWeaponSkin?.primaryColor ?? weapon?.color ?? job.colors.accent)
      const img = humanSprite(
        styledColors,
        game.facing,
        frame,
        weaponType,
        weaponDrawColor,
        attacking,
        action,
        atkFrame,
      )
      const isGmEpic = img.dataset?.gmReady === '1'
      const drawScale = (isGmEpic ? 50 : 33) / Math.max(1, img.height)
      const drawW = img.width * drawScale
      const drawH = img.height * drawScale
      const footOffset = isGmEpic ? 10 : 2
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

      const isMounted = Boolean(activeMount?.mounted)
      const mountHover =
        isMounted && activeMount?.def.flying ? Math.round(Math.sin(t * 4.2) * 1.5 - 2) : 0
      const riderSeatY = isMounted && activeMount ? activeMount.def.seatOffsetY + mountHover : 0

      shadow(ctx, p.x, p.y, isMounted ? 9 : 6)
      if (game.invulnUntil > t) {
        ctx.save()
        ctx.strokeStyle = '#22d3ee'
        ctx.lineWidth = 1.6
        ctx.globalAlpha = 0.75
        ctx.beginPath()
        ctx.ellipse(p.x, p.y - 6, 13, 8, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
      if (game.moving && !p.invisible) {
        ctx.save()
        ctx.fillStyle = isMounted && activeMount?.def.auraColor ? activeMount.def.auraColor : 'rgba(255,255,255,0.28)'
        const dustPhase = (game.walkT * 4) % 1
        ctx.globalAlpha = (1 - dustPhase) * (isMounted ? 0.6 : 0.45)
        const dx = game.facing === 'left' ? 5 : game.facing === 'right' ? -5 : (stride > 0 ? -3 : 3)
        ctx.fillRect(Math.round(p.x + dx - dustPhase * dx), Math.round(p.y - 1 - dustPhase * 2), isMounted ? 3 : 2, 1.5)
        ctx.restore()
      }
      ctx.globalAlpha = p.invisible ? 0.18 : 1
      if (isMounted && activeMount?.def.auraColor) {
        ctx.save()
        ctx.strokeStyle = activeMount.def.auraColor
        ctx.lineWidth = 1.2
        ctx.globalAlpha = (p.invisible ? 0.12 : 0.38) + Math.sin(t * 4) * 0.12
        ctx.beginPath()
        ctx.ellipse(p.x, p.y - 1, 13, 5, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
      if (p.gm) {
        ctx.fillStyle = `rgba(255, 214, 10, ${0.18 + Math.sin(t * 5) * 0.08})`
        ctx.beginPath()
        ctx.ellipse(p.x, p.y, 10, 4, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      if ((p.rebirthCount ?? 0) > 0) {
        drawRebirthAura(ctx, {
          x: p.x,
          y: p.y,
          timeSec: t,
          rebirthCount: p.rebirthCount ?? 0,
          radiusX: 12,
          spriteHeight: drawH,
          alphaScale: p.invisible ? 0.25 : 1,
          layer: 'back',
        })
      }
      if (isMounted && activeMount) {
        const mAction: SpriteAction = game.moving ? 'walk' : attacking ? 'attack' : 'idle'
        const mFrame =
          mAction === 'walk'
            ? Math.floor(game.walkT * 10) % 6
            : mAction === 'attack'
              ? atkFrame
              : Math.floor(t * 2.5) % 4
        const mImg = mountSprite(activeMount.mountId, game.facing, mAction, mFrame, atkFrame)
        const mHd = mImg.dataset?.hdScale ? Number(mImg.dataset.hdScale) : 1
        const mDrawW = (mImg.width * 0.78) / mHd
        const mDrawH = (mImg.height * 0.78) / mHd
        ctx.drawImage(
          mImg,
          p.x + ox * 0.4 - mDrawW / 2,
          p.y + oy * 0.4 + mountHover - mDrawH + 3,
          mDrawW,
          mDrawH,
        )
      }
      if (equippedWing) {
        ctx.save()
        ctx.globalAlpha = p.invisible ? 0.15 : 0.9
        const flap = Math.sin(t * 6) * 2.5
        ctx.fillStyle = equippedWing.primaryColor
        ctx.strokeStyle = equippedWing.secondaryColor
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(p.x - 2, p.y + riderSeatY - 15)
        ctx.lineTo(p.x - 14, p.y + riderSeatY - 23 - flap)
        ctx.lineTo(p.x - 10, p.y + riderSeatY - 11 - flap * 0.4)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(p.x + 2, p.y + riderSeatY - 15)
        ctx.lineTo(p.x + 14, p.y + riderSeatY - 23 - flap)
        ctx.lineTo(p.x + 10, p.y + riderSeatY - 11 - flap * 0.4)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }
      if (gemFashion?.id === 'nebula_dragon_wings') {
        ctx.save()
        ctx.globalAlpha = p.invisible ? 0.14 : 0.86
        const wingBob = Math.sin(t * 5) * 0.7
        drawGemItemPixels(ctx, gemFashion, p.x - 8, p.y + riderSeatY - drawH + 5 + wingBob, 2)
        ctx.restore()
      }
      ctx.save()
      ctx.translate(Math.round(p.x + ox), Math.round(p.y + oy + riderSeatY))
      ctx.drawImage(img, Math.round(-drawW / 2), Math.round(-drawH + footOffset), drawW, drawH)
      if ((attacking || (castingSkill && !isGmEpic)) && !isGmEpic && !img.dataset?.sheetId) {
        drawWeaponAttackOverlay(
          ctx,
          game.facing,
          weaponType,
          attacking ? atkProgress : skillProgress,
          weaponDrawColor,
        )
      }
      ctx.restore()
      if ((p.rebirthCount ?? 0) > 0) {
        drawRebirthAura(ctx, {
          x: p.x,
          y: p.y + riderSeatY,
          timeSec: t,
          rebirthCount: p.rebirthCount ?? 0,
          radiusX: 12,
          spriteHeight: drawH,
          alphaScale: p.invisible ? 0.25 : 1,
          layer: 'front',
        })
      }
      if (gemFashion?.id === 'aurora_cat_hood') {
        drawGemItemPixels(ctx, gemFashion, p.x - 5, p.y + riderSeatY - drawH - 1, 1.25)
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
    const isPhao = activePet.def.category === 'phao' || activePet.petId.startsWith('phao_')
    const petOffsetX = game.facing === 'left' ? 14 : game.facing === 'right' ? -14 : -15
    const petX = p.x + petOffsetX + Math.sin(t * 2.5) * 1.5
    const petY = p.y - (isPhao ? 5 : 3) + Math.sin(t * 4) * (isPhao ? 2.4 : 1.6)
    const petAttacking = game.petAttackAnim > 0
    const petAtkProgress = petAttacking ? Math.max(0, Math.min(1, 1 - game.petAttackAnim / 0.45)) : 0
    const petAtkFrame = Math.min(3, Math.floor(petAtkProgress * 4))
    const petAction: SpriteAction = petAttacking ? 'attack' : game.moving ? 'walk' : 'idle'
    const petFrame = petAttacking
      ? petAtkFrame
      : petAction === 'walk'
        ? Math.floor(game.walkT * 9) % 6
        : Math.floor(t * 2.6) % 4
    const pImg = petSprite(activePet.petId, game.facing, petAction, petFrame, petAtkFrame)
    const pHd = pImg.dataset?.hdScale ? Number(pImg.dataset.hdScale) : 1
    const pScale = (activePet.petId === 'aurora_cloud_dragon' ? 0.85 : isPhao ? 0.74 : 0.7) / pHd
    const pDrawW = pImg.width * pScale
    const pDrawH = pImg.height * pScale

    ents.push({
      y: p.y + 1,
      draw: () => {
        ctx.save()
        ctx.globalAlpha = p.invisible ? 0.18 : 1
        shadow(ctx, petX, p.y + 1, isPhao ? 5 : 4)
        if (isPhao) {
          ctx.save()
          ctx.strokeStyle = activePet.def.colors.accent
          ctx.globalAlpha = (p.invisible ? 0.1 : 0.45) + Math.sin(t * 5) * 0.15
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.ellipse(petX, petY + 1, 7, 2.5, 0, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }
        ctx.drawImage(pImg, petX - pDrawW / 2, petY - pDrawH + 2, pDrawW, pDrawH)
        ctx.restore()
      },
    })
  }

  ents.sort(compareDepthOrder)
  for (const e of ents) e.draw(ctx)

  // Layer 3: Overhead roofs, tree canopies, watchtower spires & angel wings
  // Allows walking cleanly behind buildings/trees with subtle translucency if player stands directly behind.
  overheads.sort(compareDepthOrder)
  for (const ov of overheads) {
    if (!ov.drawOverhead) continue
    const occluded = ov.overheadZone ? isEntityOccludedByOverhead(p.x, p.y, ov.overheadZone) : false
    ov.drawOverhead(ctx, occluded ? 0.72 : 1)
  }

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
    const alpha = Math.max(0, e.life / e.max)
    if (e.vfxStyle) {
      drawOverworldSkillEffect(ctx, {
        style: e.vfxStyle,
        primaryColor: e.color,
        secondaryColor: e.secondaryColor,
        sourceX: e.sourceX,
        sourceY: e.sourceY,
        targetX: e.x,
        targetY: e.y,
        radius: e.r,
        progress: k,
        alpha,
      })
      continue
    }
    ctx.save()
    ctx.globalAlpha = alpha
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

  // Ambient weather / biome particles in screen space
  if (map.theme === 'frost' || map.theme === 'dream' || map.theme === 'volcano' || map.theme === 'abyss' || map.theme === 'forest' || map.theme === 'crystal' || map.theme === 'sky') {
    ctx.save()
    const count = map.theme === 'sky' ? 14 : 24
    for (let i = 0; i < count; i++) {
      if (map.theme === 'sky') {
        const px = ((i * 197 + t * (16 + (i % 4) * 5)) % (cw + 80)) - 40
        const py = ((i * 113 + Math.sin(t * 0.4 + i) * 10) % ch)
        ctx.fillStyle = 'rgba(255,255,255,0.22)'
        ctx.fillRect(Math.round(px), Math.round(py), Math.round(14 * dpr), Math.round(4 * dpr))
      } else if (map.theme === 'volcano' || map.theme === 'abyss') {
        const px = ((i * 173 + Math.sin(t * 1.5 + i) * 20) % cw + cw) % cw
        const py = ch - ((t * (28 + (i % 5) * 8) + i * 91) % ch)
        ctx.fillStyle = i % 2 ? '#ff7b00' : '#ffd166'
        ctx.globalAlpha = 0.55
        ctx.fillRect(Math.round(px), Math.round(py), Math.max(2, Math.round(1.5 * dpr)), Math.max(2, Math.round(1.5 * dpr)))
      } else if (map.theme === 'frost') {
        const px = ((i * 151 + t * 18 + Math.sin(t * 1.2 + i) * 16) % cw + cw) % cw
        const py = (t * (32 + (i % 4) * 10) + i * 83) % ch
        ctx.fillStyle = i % 2 ? '#ffffff' : '#caf0f8'
        ctx.globalAlpha = 0.72
        ctx.fillRect(Math.round(px), Math.round(py), Math.max(2, Math.round(1.6 * dpr)), Math.max(2, Math.round(1.6 * dpr)))
      } else if (map.theme === 'dream') {
        const px = ((i * 163 + t * 22 + Math.sin(t + i) * 24) % cw + cw) % cw
        const py = (t * (20 + (i % 3) * 8) + i * 79) % ch
        ctx.fillStyle = i % 2 ? '#ffb3c6' : '#ffe5ec'
        ctx.globalAlpha = 0.8
        ctx.fillRect(Math.round(px), Math.round(py), Math.max(2, Math.round(2 * dpr)), Math.max(2, Math.round(1.3 * dpr)))
      } else if (map.theme === 'forest') {
        const px = ((i * 139 + Math.sin(t * 0.9 + i * 2) * 32) % cw + cw) % cw
        const py = ((i * 107 + Math.cos(t * 0.7 + i) * 26) % ch + ch) % ch
        ctx.fillStyle = i % 2 ? '#d9ed92' : '#99e2b4'
        ctx.globalAlpha = 0.35 + Math.sin(t * 3 + i) * 0.25
        ctx.fillRect(Math.round(px), Math.round(py), Math.max(2, Math.round(1.5 * dpr)), Math.max(2, Math.round(1.5 * dpr)))
      } else {
        const px = ((i * 149 + Math.cos(t * 0.8 + i) * 28) % cw + cw) % cw
        const py = ch - ((t * 18 + i * 89) % ch)
        ctx.fillStyle = i % 2 ? '#72efdd' : '#c77dff'
        ctx.globalAlpha = 0.55
        ctx.fillRect(Math.round(px), Math.round(py), Math.max(2, Math.round(1.5 * dpr)), Math.max(2, Math.round(1.5 * dpr)))
      }
    }
    ctx.restore()
  }

  if (map.theme === 'cave' || map.theme === 'forest' || map.theme === 'volcano' || map.theme === 'abyss' || map.theme === 'crystal') {
    const sx = (p.x - camX) * s
    const sy = (p.y - 8 - camY) * s
    const inner = (map.theme === 'cave' ? 54 : map.theme === 'abyss' ? 95 : 110) * s
    const outer = (map.theme === 'cave' ? 165 : map.theme === 'abyss' ? 245 : 270) * s
    const g = ctx.createRadialGradient(sx, sy, inner, sx, sy, outer)
    const dark =
      map.theme === 'cave'
        ? 'rgba(3,3,12,0.84)'
        : map.theme === 'forest'
          ? 'rgba(5,20,10,0.42)'
          : map.theme === 'abyss'
            ? 'rgba(14,4,26,0.58)'
            : map.theme === 'crystal'
              ? 'rgba(12,8,34,0.38)'
              : 'rgba(30,0,0,0.48)'
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, dark)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, cw, ch)
  }

  // Day / Dusk / Night atmospheric tint
  const worldPhase = getWorldTimePhase()
  if (worldPhase.phase !== 'day') {
    ctx.fillStyle = worldPhase.tintCss
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

  for (const node of GATHERING_NODES) {
    if (node.mapId !== map.id) continue
    const nx = (node.tx + 0.5) * TILE
    const ny = (node.ty + 0.5) * TILE
    const dist = Math.hypot(p.x - nx, p.y - ny)
    const [lx, ly] = toS(nx, ny - 16)
    text(node.label, lx, ly, node.color, 7.5)
    if (dist <= 42 && !game.panel) {
      const [hx, hy] = toS(nx, ny + 12)
      text('กด E เก็บเกี่ยว', hx, hy, '#7ae582', 8.5)
    }
  }

  for (const obj of visibleObjects) {
    if (!obj.label) continue
    const ox = (obj.tx + 0.5) * TILE
    const oy = (obj.ty + 0.5) * TILE
    if (Math.hypot(p.x - ox, p.y - oy) < 42) {
      const [lx, ly] = toS(ox, oy - 22)
      text(obj.label, lx, ly, '#ffe8a3', 8)
    }
  }

  for (const pt of map.portals) {
    const [x, y] = toS((pt.x + pt.w / 2) * TILE + (pt.x === 0 ? 14 : -14), (pt.y - 0.3) * TILE)
    text(pt.label, x, y, '#caf0f8', 9)
  }

  for (const n of map.npcs) {
    const npcOffset = 35
    const npcWorldX = n.x * TILE
    const npcWorldY = n.y * TILE + 8
    const [x, y] = toS(npcWorldX, npcWorldY - npcOffset)
    const distToPlayer = Math.hypot(p.x - npcWorldX, p.y - npcWorldY)
    const showBubble = (distToPlayer < 88 || game.nearNpc?.id === n.id) && !game.panel

    if (showBubble && n.greeting) {
      const bubbleFontSize = Math.round(9.5 * dpr * (zoom / 3) * 1.2)
      ctx.font = `${bubbleFontSize}px ${font}`
      const maxBubbleW = 165 * dpr
      const label = n.greeting.length > 34 ? `${n.greeting.slice(0, 32)}…` : n.greeting
      const tw = Math.min(ctx.measureText(label).width, maxBubbleW)
      const bw = tw + 14 * dpr
      const bh = 18 * dpr
      const bx = x - bw / 2
      const by = y - 42 * dpr
      ctx.save()
      ctx.fillStyle = '#120e1a'
      ctx.fillRect(Math.round(bx - 1.5 * dpr), Math.round(by - 1.5 * dpr), Math.round(bw + 3 * dpr), Math.round(bh + 3 * dpr))
      ctx.fillStyle = 'rgba(255, 252, 244, 0.96)'
      ctx.fillRect(Math.round(bx), Math.round(by), Math.round(bw), Math.round(bh))
      ctx.fillStyle = '#120e1a'
      ctx.beginPath()
      ctx.moveTo(x - 4 * dpr, by + bh)
      ctx.lineTo(x + 4 * dpr, by + bh)
      ctx.lineTo(x, by + bh + 5 * dpr)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(255, 252, 244, 0.96)'
      ctx.beginPath()
      ctx.moveTo(x - 2.5 * dpr, by + bh - 0.5 * dpr)
      ctx.lineTo(x + 2.5 * dpr, by + bh - 0.5 * dpr)
      ctx.lineTo(x, by + bh + 3.5 * dpr)
      ctx.closePath()
      ctx.fill()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#181424'
      ctx.fillText(label, x, by + bh / 2, maxBubbleW)
      ctx.restore()
    }

    text(`[${n.title}]`, x, y - 12 * dpr, '#f2c94c', 8.5)
    text(n.name, x, y, '#ffffff', 9.5)
    if (game.nearNpc?.id === n.id && !game.panel) {
      const [bx, by] = toS(npcWorldX, npcWorldY + 6)
      text('กด E เพื่อคุย', bx, by + 8 * dpr, '#7ae582', 9)
    }
  }

  for (const m of game.monsters) {
    if (m.dead) continue
    const def = MONSTERS[m.defId]
    if (!def) continue
    const mSpec = getMonsterModelSpec(def.id, def.sprite, def.color)
    const isHumanRigMob = mSpec.archetype === 'goblin' || mSpec.archetype === 'skeleton'
    const mScale = def.boss ? 1.65 : 1.05
    const h = isHumanRigMob
      ? 31
      : Math.round(mSpec.canvasSize.height * mScale * 0.78) + (mSpec.flying ? 5 : 0)
    const [x, y] = toS(m.x, m.y - h)
    const isAnyBoss = Boolean(def.boss || m.isWorldBoss)
    const color = m.isWorldBoss ? '#fde047' : def.boss ? '#ff6b6b' : def.level > p.level + 5 ? '#ff8fa3' : def.level < p.level - 5 ? '#a0a0a0' : '#ffffff'
    const label = m.isWorldBoss ? `[บอสโลก] ${m.worldBossName ?? def.name}` : `${def.boss ? '★ ' : ''}${def.name} Lv.${def.level}`
    text(label, x, y - 8 * dpr, color, isAnyBoss ? 10 : 8)
    if (m.hp < m.maxHp || isAnyBoss) {
      const bw = (m.isWorldBoss ? 48 : def.boss ? 40 : 18) * s
      const bh = (m.isWorldBoss ? 2.5 : 2) * s
      ctx.fillStyle = 'rgba(10,8,20,0.9)'
      ctx.fillRect(x - bw / 2 - dpr, y - dpr, bw + 2 * dpr, bh + 2 * dpr)
      ctx.fillStyle = '#3a0d12'
      ctx.fillRect(x - bw / 2, y, bw, bh)
      ctx.fillStyle = m.isWorldBoss ? '#f43f5e' : '#e5484d'
      ctx.fillRect(x - bw / 2, y, bw * Math.max(0, m.hp / m.maxHp), bh)
    }
  }

  for (const other of game.remotePlayers) {
    if (other.invisible || other.mapId !== map.id) continue
    const networkBlend = other.receivedAt ? Math.min(1, (Date.now() - other.receivedAt) / 100) : 1
    const remoteX = (other.previousX ?? other.x) + (other.x - (other.previousX ?? other.x)) * networkBlend
    const remoteY = (other.previousY ?? other.y) + (other.y - (other.previousY ?? other.y)) * networkBlend
    const [x, y] = toS(remoteX, remoteY - 35)
    if (other.gm) text('[GM]', x, y - 12 * dpr, '#ffd60a', 8)
    text(`${other.displayName} [${String(other.uid).padStart(5, '0')}] Lv.${other.level}`, x, y, other.gm ? '#ffd60a' : '#8be9fd', 9)
  }

  {
    const [x, y] = toS(p.x, p.y - 38)
    // Overhead micro HP/MP bar matching 2D MMORPG reference
    const stats = getStats(p)
    if (stats) {
      const bw = 22 * s
      const hpH = 1.9 * s
      const mpH = 1.2 * s
      const barY = y + 6 * dpr
      ctx.fillStyle = 'rgba(10, 8, 20, 0.92)'
      ctx.fillRect(Math.round(x - bw / 2 - dpr), Math.round(barY - dpr), Math.round(bw + 2 * dpr), Math.round(hpH + mpH + 2.5 * dpr))
      ctx.fillStyle = '#3a0d12'
      ctx.fillRect(Math.round(x - bw / 2), Math.round(barY), Math.round(bw), Math.round(hpH))
      ctx.fillStyle = '#e5484d'
      ctx.fillRect(Math.round(x - bw / 2), Math.round(barY), Math.round(bw * Math.max(0, Math.min(1, p.hp / Math.max(1, stats.maxHp)))), Math.round(hpH))
      ctx.fillStyle = '#132445'
      ctx.fillRect(Math.round(x - bw / 2), Math.round(barY + hpH + 0.5 * dpr), Math.round(bw), Math.round(mpH))
      ctx.fillStyle = '#4c8bf5'
      ctx.fillRect(Math.round(x - bw / 2), Math.round(barY + hpH + 0.5 * dpr), Math.round(bw * Math.max(0, Math.min(1, p.mp / Math.max(1, stats.maxMp)))), Math.round(mpH))
    }
    const activeTitleDef = p.rpgExt?.activeTitle ? TITLE_DEFS.find((item) => item.id === p.rpgExt?.activeTitle) : null
    const guildTagPrefix = p.rpgExt?.guildTag ? `[${p.rpgExt.guildTag}] ` : ''
    const displayNameLine = `${guildTagPrefix}${p.name} [${p.uid === undefined ? 'Guest' : String(p.uid).padStart(5, '0')}]`
    if (equippedFrame) {
      ctx.save()
      ctx.strokeStyle = equippedFrame.primaryColor
      ctx.fillStyle = equippedFrame.secondaryColor
      ctx.globalAlpha = 0.72
      const fw = Math.max(76, displayNameLine.length * 4.8) * dpr
      const fh = 12 * dpr
      ctx.fillRect(Math.round(x - fw / 2), Math.round(y - 5 * dpr - fh / 2), Math.round(fw), Math.round(fh))
      ctx.lineWidth = 1.2 * dpr
      ctx.strokeRect(Math.round(x - fw / 2), Math.round(y - 5 * dpr - fh / 2), Math.round(fw), Math.round(fh))
      ctx.restore()
    }
    text(`✦ ${job.name} ✦`, x, y - 18 * dpr, p.gm ? '#ffd60a' : '#72efdd', 8)
    text(displayNameLine, x, y - 5 * dpr, p.gm ? '#ffd60a' : equippedFrame?.primaryColor ?? '#ffffff', 9.5)
    if (activeTitleDef) {
      text(`«${activeTitleDef.name}»`, x, y - 31 * dpr, activeTitleDef.color, 7.8)
    }
    if (p.gm) text('[GM]', x, y - (activeTitleDef ? 43 : 31) * dpr, '#ffd60a', 8)
    if (game.bubble) {
      ctx.font = `${Math.round(11 * dpr * (zoom / 3) * 1.2)}px ${font}`
      const tw = Math.min(ctx.measureText(game.bubble.text).width, 260 * dpr)
      const by = y - (p.gm ? 56 : activeTitleDef ? 48 : 38) * dpr
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
  ctx.ellipse(cx, cy, 19, 14.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#a19d92'
  ctx.beginPath()
  ctx.ellipse(cx, cy - 1, 18, 13.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#3a7bd5'
  ctx.beginPath()
  ctx.ellipse(cx, cy, 14.5, 10, 0, 0, Math.PI * 2)
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
