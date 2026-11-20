import { ITEMS, JOBS, MONSTERS, normalizeJobId, type MonsterSprite } from './data'
import { GEM_SHOP_ITEMS } from './gem-shop'
import { currentMap, game, getStats } from './engine'
import {
  compareDepthOrder,
  computeCameraZoom,
  createCameraState,
  isEntityOccludedByOverhead,
  stepSmoothCamera,
} from './camera'
import { T, TILE, type PortalDirection, type PortalGateStyle } from './maps'
import {
  getCatalogMonsterAtlas,
  getCatalogMonsterFrameCount,
  preloadMapCatalogSprites,
} from './catalog-sprites'
import { getHdImage } from './hd-assets'
import { getMonsterModelSpec, getPetModelSpec } from './models-2d'
import { buildTilePropDrawable, buildTownStructureDrawables, drawHdMapObject, type HdDepthDrawable } from './hd-props'
import { drawHdMapViewport, LAYERED_PROP_TILES } from './hd-tiles'
import {
  type Dir,
  drawResolvedDrawable,
  jobHumanColors,
  mapObjectSprite,
  mountSprite,
  petSprite,
  resolveHumanDrawable,
  resolveMonsterDrawable,
  resolveNpcDrawable,
  type SpriteAction,
} from './sprites'
import { getActivePetBonuses, getCombatPetDef } from './systems'
import {
  getActiveMountBonuses,
  getMountDef,
  getMountRiderSeatOffset,
  getMountVisualTier,
  resolveMountAnimationState,
  type MountDef,
} from './mounts'
import { preloadMountSpriteSheet } from './sprite-sheets'
import { TITLE_DEFS } from './rpg-systems'
import { GATHERING_NODES, getCosmeticDef, getWorldTimePhase, sanitizeExtV2 } from './extended-systems'
import { drawOverworldSkillEffect, drawRebirthAura } from './vfx-canvas'
import {
  drawCharacterFashionLayers,
  getFashionLayerImage,
  preloadFashionLayers,
  resolveFashionLoadoutFromRemote,
  resolveFashionLoadoutFromSave,
} from './fashion-renderer'
import { getFashionItemDef } from './premium/fashion-pet'
import { getEffectiveVipBonuses, getVipTierDef } from './premium/vip'
import { sanitizePremiumState } from './premium/wallet'

const cameraState = createCameraState('town')
let prevRenderTime = 0
let lastRenderCam = { mapId: 'town', x: 0, y: 0 }

function drawMountForegroundSaddleStrap(
  ctx: CanvasRenderingContext2D,
  seatX: number,
  seatY: number,
  dir: Dir,
  def: MountDef,
  level = 1,
  skinColor?: string,
) {
  const tier = getMountVisualTier(level)
  const trimCol = skinColor ?? (tier >= 5 ? '#fef08a' : tier >= 3 ? '#fbbf24' : def.colors.accent)
  const saddleCol = def.colors.saddle
  ctx.save()
  ctx.fillStyle = saddleCol
  ctx.strokeStyle = '#1a1224'
  ctx.lineWidth = 0.8
  if (dir === 'up') {
    // High rear saddle cantle & thigh guard visible behind rider's back
    ctx.beginPath()
    ctx.roundRect(seatX - 4.5, seatY - 3, 9, 4, 1.5)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = trimCol
    ctx.fillRect(seatX - 3.5, seatY - 2.6, 7, 1)
  } else if (dir === 'down') {
    // Saddle pommel & flank knees wrap in front of lower boots
    ctx.beginPath()
    ctx.roundRect(seatX - 4.2, seatY - 2.5, 8.4, 3.2, 1.4)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = trimCol
    ctx.fillRect(seatX - 2, seatY - 2.2, 4, 1.2)
  } else {
    // Side view: outer saddle flap, stirrup leather strap & gold buckle over rider's thigh
    const flapX = dir === 'right' ? seatX - 3.2 : seatX - 4.8
    ctx.beginPath()
    ctx.roundRect(flapX, seatY - 3, 8, 4.2, 1.5)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = trimCol
    ctx.fillRect(flapX + 1, seatY - 2.6, 6, 1)
    ctx.fillRect(seatX - 0.8, seatY + 0.2, 1.8, 1.8)
  }
  ctx.restore()
}

export function screenToWorld(cssX: number, cssY: number, cssW: number, cssH: number): { x: number; y: number } {
  const safeW = Math.max(1, cssW)
  const safeH = Math.max(1, cssH)
  const zoom = computeCameraZoom(safeW, safeH)
  const mapId = currentMap().id
  const camX = lastRenderCam.mapId === mapId ? lastRenderCam.x : cameraState.x
  const camY = lastRenderCam.mapId === mapId ? lastRenderCam.y : cameraState.y
  return {
    x: camX + cssX / zoom,
    y: camY + cssY / zoom,
  }
}

const THEME_BG: Record<string, string> = {
  town: '#2d5a27',
  meadow: '#2d5a27',
  vale: '#255228',
  woods: '#1d4423',
  forest: '#10291a',
  coast: '#1b6ca8',
  cave: '#0b0b16',
  desert: '#8f6b3e',
  graveyard: '#181a28',
  isles: '#2e6351',
  snow: '#b8d0e8',
  ruins: '#242230',
  volcano: '#140808',
  sky: '#72aee6',
  abyss: '#0c0814',
  world: '#2a1829',
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
  _defId: string,
  _sprite: MonsterSprite,
  x: number,
  _y: number,
  vx: number,
  _vy: number,
  flip: boolean,
  provoked: boolean,
): Dir {
  if (provoked) {
    const dx = (game.p?.x ?? x) - x
    if (Math.abs(dx) > 1) return dx < 0 ? 'left' : 'right'
  }
  if (Math.abs(vx) > 0.05) return vx < 0 ? 'left' : 'right'
  return flip ? 'left' : 'right'
}

export function render(ctx: CanvasRenderingContext2D, cw: number, ch: number, dpr: number, font: string) {
  const p = game.p
  if (!p) return
  const map = currentMap()
  preloadMapCatalogSprites(map.id)
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
  lastRenderCam = { mapId: map.id, x: camX, y: camY }

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = THEME_BG[map.theme]
  ctx.fillRect(0, 0, cw, ch)
  ctx.setTransform(s, 0, 0, s, -camX * s, -camY * s)
  const vx0 = Math.max(0, camX)
  const vy0 = Math.max(0, camY)
  const vx1 = Math.min(mapW, camX + viewW)
  const vy1 = Math.min(mapH, camY + viewH)
  if (vx1 > vx0 && vy1 > vy0) {
    drawHdMapViewport(ctx, map, vx0, vy0, vx1, vy1)
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
    const dir: PortalDirection =
      pt.dir ?? (pt.x === 0 ? 'west' : pt.x >= map.width - 2 ? 'east' : pt.y === 0 ? 'north' : 'south')
    const isHorizontalEdge = dir === 'north' || dir === 'south'
    const cx = (pt.x + pt.w / 2) * TILE
    const cy = (pt.y + pt.h / 2) * TILE
    const padX = dir === 'west' ? cx + 6 : dir === 'east' ? cx - 6 : cx
    const padY = dir === 'north' ? cy + 8 : dir === 'south' ? cy - 8 : cy
    const rx = isHorizontalEdge ? 26 : 11
    const ry = isHorizontalEdge ? 10 : 25
    const pulse = 0.6 + Math.sin(t * 4) * 0.2
    const gate: PortalGateStyle = pt.gate ?? 'woodGate'
    const outerCol =
      gate === 'townArchway'
        ? `rgba(245, 180, 60, ${0.24 * pulse})`
        : gate === 'crystalShrine'
          ? `rgba(120, 80, 255, ${0.26 * pulse})`
          : `rgba(52, 211, 153, ${0.24 * pulse})`
    const innerCol =
      gate === 'townArchway'
        ? `rgba(125, 211, 252, ${0.46 * pulse})`
        : gate === 'crystalShrine'
          ? `rgba(150, 230, 255, ${0.5 * pulse})`
          : `rgba(167, 243, 208, ${0.46 * pulse})`

    ctx.fillStyle = outerCol
    ctx.beginPath()
    ctx.ellipse(padX, padY, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = innerCol
    ctx.beginPath()
    ctx.ellipse(padX, padY, rx * 0.56, ry * 0.58, 0, 0, Math.PI * 2)
    ctx.fill()
    for (let i = 0; i < 6; i++) {
      const a = t * 2 + i * 1.05
      ctx.fillStyle = i % 2 ? '#e0aaff' : '#caf0f8'
      ctx.fillRect(
        Math.round(padX + Math.cos(a) * (rx * 0.72)),
        Math.round(padY + Math.sin(a * 1.3) * (ry * 0.72)),
        1.2,
        1.2,
      )
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

  for (const visibleObj of visibleObjects) {
    const ox = (visibleObj.tx + 0.5) * TILE
    const oy = (visibleObj.ty + 0.88) * TILE
    const objFrame = Math.floor(t * 5 + visibleObj.tx * 0.7 + visibleObj.ty) % 3
    const img = mapObjectSprite(visibleObj.kind, objFrame, visibleObj.variant ?? 0)
    ents.push({
      y: oy,
      draw: () => {
        drawHdMapObject(ctx, visibleObj, ox, oy, t, img)
      },
    })
  }

  for (const pt of map.portals) {
    const dir: PortalDirection =
      pt.dir ?? (pt.x === 0 ? 'west' : pt.x >= map.width - 2 ? 'east' : pt.y === 0 ? 'north' : 'south')
    const gate: PortalGateStyle = pt.gate ?? 'woodGate'
    const gateImg = getHdImage(gate)
    const gx =
      dir === 'west'
        ? (pt.x + 1.2) * TILE
        : dir === 'east'
          ? (pt.x - 0.2) * TILE
          : (pt.x + pt.w / 2) * TILE
    const baseY =
      dir === 'north'
        ? (pt.y + 2.0) * TILE
        : dir === 'south'
          ? (pt.y + 0.95) * TILE
          : (pt.y + pt.h * 0.7) * TILE
    const targetH = gate === 'townArchway' ? 36 : gate === 'crystalShrine' ? 32 : 34
    const aspect = gateImg ? gateImg.width / Math.max(1, gateImg.height) : 1
    const dw = Math.round(targetH * aspect)
    const dh = targetH

    ents.push({
      y: dir === 'north' ? baseY - 12 : baseY,
      draw: () => {
        shadow(ctx, gx, baseY - 1, Math.min(18, dw * 0.42))
        if (gateImg && gateImg.naturalWidth > 0) {
          ctx.drawImage(gateImg, Math.round(gx - dw / 2), Math.round(baseY - dh + 2), dw, dh)
        } else {
          ctx.save()
          ctx.fillStyle = gate === 'crystalShrine' ? '#67e8f9' : '#c8956b'
          ctx.strokeStyle = '#1e1b2e'
          ctx.lineWidth = 1.4
          ctx.fillRect(Math.round(gx - 12), Math.round(baseY - 26), 24, 24)
          ctx.strokeRect(Math.round(gx - 12), Math.round(baseY - 26), 24, 24)
          ctx.restore()
        }
      },
    })
  }

  const cullX0 = camX - 80
  const cullX1 = camX + viewW + 80
  const cullY0 = camY - 64
  const cullY1 = camY + viewH + 96

  for (const n of map.npcs) {
    const fx = n.x * TILE
    const fy = n.y * TILE + 8
    if (fx < cullX0 || fx > cullX1 || fy < cullY0 || fy > cullY1) continue
    const near = game.nearNpc?.id === n.id
    ents.push({
      y: fy,
      draw: () => {
        const phase = t * 2.6 + fx * 0.15
        const breath = Math.sin(phase)
        const scaleX = 1 - breath * 0.018
        const scaleY = 1 + breath * 0.022
        const idleF = Math.sin(t * 1.1 + fx) > 0.96 ? -1 : Math.floor(t * 2 + fx) % 4
        const drawable = resolveNpcDrawable(n.id, n.colors, idleF, Math.floor(t * 2.2 + fx) % 4)
        const targetNpcH = 34
        const baseScale = targetNpcH / Math.max(1, drawable.height)
        const drawW = drawable.width * baseScale
        const drawH = drawable.height * baseScale
        const nearHop = near ? -Math.abs(Math.sin(t * 5)) * 1.6 : 0
        shadow(ctx, fx, fy, 6.5 - breath * 0.3)
        if (near && !game.panel) {
          const pulse = 0.5 + Math.sin(t * 6) * 0.25
          ctx.save()
          ctx.strokeStyle = `rgba(250, 204, 21, ${pulse})`
          ctx.fillStyle = `rgba(250, 204, 21, ${pulse * 0.22})`
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.ellipse(fx, fy + 1, 11.5, 4.8, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          ctx.restore()
        }
        ctx.save()
        ctx.translate(fx, fy + nearHop)
        ctx.scale(scaleX, scaleY)
        drawResolvedDrawable(ctx, drawable, Math.round(-drawW / 2), Math.round(-drawH + 2), drawW, drawH)
        ctx.restore()
      },
    })
  }

  for (const m of game.monsters) {
    const dying = m.dead && (m.dyingT ?? 0) > 0
    if (m.dead && !dying) continue
    if (m.x < cullX0 || m.x > cullX1 || m.y < cullY0 || m.y > cullY1) continue
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
        const atkCount = getCatalogMonsterFrameCount(def.id, 'attack')
        const walkCount = getCatalogMonsterFrameCount(def.id, 'walk')
        const idleCount = getCatalogMonsterFrameCount(def.id, 'idle')
        const attackProgress = attacking ? Math.max(0, Math.min(1, 1 - m.lunge / 0.3)) : 0
        const attackFrame = Math.min(atkCount - 1, Math.floor(attackProgress * atkCount))
        const walkFrame = Math.floor(m.animT * 7.5 * speedMul) % walkCount
        const idleFrame = Math.floor(m.animT * 5.0) % idleCount
        const frame = attacking ? attackFrame : walking ? walkFrame : idleFrame

        const drawable = resolveMonsterDrawable(def.sprite, def.color, frame, attacking, action, dir, attackFrame, def.id)
        const hdFactor = drawable.hdScale
        const scale = (def.boss ? 1.65 : 1.05) / hdFactor
        const w = drawable.width * scale
        const h = drawable.height * scale
        const footPad =
          drawable.sheetSpec?.footPadFrac !== undefined
            ? drawable.sheetSpec.footPadFrac * h
            : 2 * scale * hdFactor

        if (dying) {
          const dieRatio = Math.max(0, Math.min(1, (m.dyingT ?? 0) / 0.55))
          const collapse = 1 - dieRatio
          ctx.save()
          ctx.globalAlpha = dieRatio
          ctx.translate(m.x, m.y)
          ctx.rotate((m.flip ? -1 : 1) * collapse * 1.15)
          ctx.scale(1 + collapse * 0.12, Math.max(0.25, dieRatio))
          drawResolvedDrawable(ctx, drawable, -w / 2, -h + footPad, w, h)
          ctx.restore()
          return
        }

        const flying = mSpec.flying
        const hover = flying ? Math.round(Math.sin(m.animT * 4.2) * 2.4) - 4 : 0
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

        const breathPhase = Math.sin(t * 2.8 + m.x * 0.1)
        const walkSx = walking ? 1 : 1 - breathPhase * 0.012
        const walkSy = walking ? 1 : 1 + breathPhase * 0.014

        ctx.save()
        if (m.hitFlash > 0) ctx.globalAlpha = 0.65
        if (def.sprite === 'ghost') ctx.globalAlpha *= 0.8 + Math.sin(m.animT * 4) * 0.08
        ctx.translate(
          m.x + hoverX + hitShake + faceX * attackReach,
          m.y + faceY * attackReach + hover,
        )
        ctx.scale(walkSx, walkSy)
        drawResolvedDrawable(ctx, drawable, -w / 2, -h + footPad, w, h)

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
    if (remoteX < cullX0 || remoteX > cullX1 || remoteY < cullY0 || remoteY > cullY1) continue
    const remoteJob = JOBS[normalizeJobId(other.jobId)]
    const remoteAttacking = other.attackAnim > 0
    const remoteAction: SpriteAction = remoteAttacking ? 'attack' : other.moving ? 'walk' : 'idle'
    const atkProgress = remoteAttacking ? Math.max(0, Math.min(1, 1 - other.attackAnim / 0.3)) : 0
    const remoteAtkFrame = Math.min(3, Math.floor(atkProgress * 4))
    const remoteWalkMod = 4
    const remoteFrame = remoteAttacking
      ? remoteAtkFrame
      : other.moving
        ? Math.floor(t * 10) % remoteWalkMod
        : (Math.sin(t * 1.3 + remoteX) > 0.96 ? -1 : Math.floor(t * 2.4) % 4)

    const remoteRebirth = Math.max(0, Math.min(6, Math.floor(other.rebirthCount ?? 0)))
    const gemFashion = other.gemFashionId ? GEM_SHOP_ITEMS.find((item) => item.id === other.gemFashionId) : undefined
    const costumeFashion = getFashionItemDef(other.fashionCostume)
    const hairFashion = getFashionItemDef(other.fashionHair)
    const auraFashion = getFashionItemDef(other.fashionAura)
    const wingsFashion = getFashionItemDef(other.fashionWings)
    const mountSkinFashion = getFashionItemDef(other.mountSkinId)
    const equippedWing = getCosmeticDef(other.cosmeticWing)
    const equippedWeaponSkin = getCosmeticDef(other.weaponSkinId)
    const activeMountDef = other.mountId ? getMountDef(other.mountId) : null
    const activePetDef = other.petId ? getCombatPetDef(other.petId) : null
    const remoteLoadout = resolveFashionLoadoutFromRemote(other)
    preloadFashionLayers(remoteLoadout)

    const remoteWeapon = other.weaponType ?? remoteJob.weaponTypes[0] ?? 'stick'
    const remoteWeaponColor = equippedWeaponSkin?.primaryColor ?? (other.weaponColor || remoteJob.colors.accent)
    const baseStyledColors = jobHumanColors(remoteJob.id, remoteJob.colors, false)
    const styledColors = {
      ...baseStyledColors,
      ...(costumeFashion?.paletteOverride?.body ? { body: costumeFashion.paletteOverride.body } : {}),
      ...(costumeFashion?.paletteOverride?.legs ? { legs: costumeFashion.paletteOverride.legs } : {}),
      ...(costumeFashion?.paletteOverride?.accent ? { accent: costumeFashion.paletteOverride.accent } : {}),
      ...(costumeFashion?.paletteOverride?.hat ? { hat: costumeFashion.paletteOverride.hat } : {}),
      ...(hairFashion?.paletteOverride?.hair ? { hair: hairFashion.paletteOverride.hair } : {}),
    }
    const remoteDrawable = resolveHumanDrawable(
      styledColors,
      other.facing,
      remoteFrame,
      remoteWeapon,
      remoteWeaponColor,
      remoteAttacking,
      remoteAction,
      remoteAtkFrame,
    )
    const isRemoteGmEpic = Boolean(remoteDrawable.gmReady)
    const remoteScale = (isRemoteGmEpic ? 50 : 33) / Math.max(1, remoteDrawable.height)
    const remoteW = remoteDrawable.width * remoteScale
    const remoteH = remoteDrawable.height * remoteScale
    const remoteFootOffset = isRemoteGmEpic ? 10 : 2

    const isMounted = Boolean(activeMountDef)
    const remoteMountAnim = isMounted && activeMountDef
      ? resolveMountAnimationState({
          mounted: true,
          flying: activeMountDef.flying,
          moving: other.moving,
          moveHoldT: other.moving ? 0.5 : 0,
          attacking: remoteAttacking,
          attackFrame: remoteAtkFrame,
          transition: 'none',
          animRemaining: 0,
          animMax: 0.4,
          walkT: t,
          timeSec: t,
        })
      : null
    const mountHover = remoteMountAnim?.mountHoverY ?? 0
    const remoteSeat =
      isMounted && activeMountDef && remoteMountAnim
        ? getMountRiderSeatOffset(activeMountDef.id, other.facing, remoteMountAnim.action, remoteMountAnim.frame)
        : null
    const riderSeatX = remoteSeat?.x ?? 0
    const riderSeatY = remoteSeat ? remoteSeat.y + mountHover : 0
    const remoteRiderDrawable =
      isMounted && !remoteAttacking
        ? resolveHumanDrawable(
            styledColors,
            other.facing,
            0,
            remoteWeapon,
            remoteWeaponColor,
            false,
            'idle',
            undefined,
          )
        : remoteDrawable

    ents.push({
      y: remoteY,
      draw: () => {
        const lungeDist = remoteAttacking ? Math.sin(atkProgress * Math.PI) * 3 : 0
        const ox = other.facing === 'left' ? -lungeDist : other.facing === 'right' ? lungeDist : 0
        const oy = other.facing === 'up' ? -lungeDist : other.facing === 'down' ? lungeDist : 0
        shadow(ctx, remoteX, remoteY, isMounted ? 9 : 6.5)

        if (other.moving) {
          ctx.save()
          ctx.fillStyle = isMounted && activeMountDef?.auraColor ? activeMountDef.auraColor : 'rgba(255,255,255,0.28)'
          const dustPhase = (t * 4) % 1
          ctx.globalAlpha = (1 - dustPhase) * (isMounted ? 0.6 : 0.45)
          const dx = other.facing === 'left' ? 5 : other.facing === 'right' ? -5 : 3
          ctx.fillRect(Math.round(remoteX + dx - dustPhase * dx), Math.round(remoteY - 1 - dustPhase * 2), isMounted ? 3 : 2, 1.5)
          ctx.restore()
        }

        if (isMounted && (activeMountDef?.auraColor || mountSkinFashion)) {
          ctx.save()
          ctx.strokeStyle = mountSkinFashion?.primaryColor ?? activeMountDef?.auraColor ?? '#38bdf8'
          ctx.lineWidth = mountSkinFashion ? 1.8 : 1.2
          ctx.globalAlpha = 0.45 + Math.sin(t * 4) * 0.14
          ctx.beginPath()
          ctx.ellipse(remoteX, remoteY - 1, mountSkinFashion ? 15 : 13, 5.5, 0, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }

        if (other.gm) {
          ctx.fillStyle = `rgba(255, 214, 10, ${0.18 + Math.sin(t * 5) * 0.08})`
          ctx.beginPath()
          ctx.ellipse(remoteX, remoteY, 10, 4, 0, 0, Math.PI * 2)
          ctx.fill()
        }

        if (remoteRebirth > 0) {
          drawRebirthAura(ctx, {
            x: remoteX,
            y: remoteY,
            timeSec: t,
            rebirthCount: remoteRebirth,
            radiusX: 12,
            spriteHeight: remoteH,
            layer: 'back',
          })
        }

        if (isMounted && activeMountDef && remoteMountAnim) {
          preloadMountSpriteSheet(activeMountDef.id)
          const mImg = mountSprite(
            activeMountDef.id,
            other.facing,
            remoteMountAnim.action,
            remoteMountAnim.frame,
            remoteAtkFrame,
            1,
            mountSkinFashion?.id,
          )
          if (mImg.width > 0 && mImg.height > 0) {
            const mHd = mImg.dataset?.hdScale ? Number(mImg.dataset.hdScale) : 1
            const mDrawW = (mImg.width * 0.78) / mHd
            const mDrawH = (mImg.height * 0.78) / mHd
            ctx.drawImage(
              mImg,
              remoteX + ox * 0.4 - mDrawW / 2,
              remoteY + oy * 0.4 + mountHover - mDrawH + 3,
              mDrawW,
              mDrawH,
            )
          }
        }

        const remoteWingImg = getFashionLayerImage(remoteLoadout.wings)
        const hasLoadedRemoteWing = Boolean(remoteWingImg && remoteWingImg.complete && remoteWingImg.naturalWidth > 0)
        const activeWingColors = !hasLoadedRemoteWing
          ? (equippedWing
              ? { primary: equippedWing.primaryColor, secondary: equippedWing.secondaryColor }
              : wingsFashion && !wingsFashion.linkedGemItemId
                ? { primary: wingsFashion.primaryColor, secondary: wingsFashion.secondaryColor }
                : null)
          : null
        if (activeWingColors) {
          ctx.save()
          ctx.globalAlpha = 0.9
          const flap = Math.sin(t * 6) * 2.5
          ctx.fillStyle = activeWingColors.primary
          ctx.strokeStyle = activeWingColors.secondary
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(remoteX + riderSeatX - 2, remoteY + riderSeatY - 15)
          ctx.lineTo(remoteX + riderSeatX - 14, remoteY + riderSeatY - 23 - flap)
          ctx.lineTo(remoteX + riderSeatX - 10, remoteY + riderSeatY - 11 - flap * 0.4)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(remoteX + riderSeatX + 2, remoteY + riderSeatY - 15)
          ctx.lineTo(remoteX + riderSeatX + 14, remoteY + riderSeatY - 23 - flap)
          ctx.lineTo(remoteX + riderSeatX + 10, remoteY + riderSeatY - 11 - flap * 0.4)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          ctx.restore()
        }

        if (!hasLoadedRemoteWing && (gemFashion?.id === 'nebula_dragon_wings' || wingsFashion?.id === 'nebula_dragon_wings')) {
          const wingGem =
            gemFashion?.id === 'nebula_dragon_wings'
              ? gemFashion
              : GEM_SHOP_ITEMS.find((g) => g.id === 'nebula_dragon_wings')
          if (wingGem) {
            ctx.save()
            ctx.globalAlpha = 0.86
            const wingBob = Math.sin(t * 5) * 0.7
            drawGemItemPixels(ctx, wingGem, remoteX + riderSeatX - 8, remoteY + riderSeatY - remoteH + 5 + wingBob, 2)
            ctx.restore()
          }
        }

        const remoteDx = Math.round(-remoteW / 2)
        const remoteDy = Math.round(-remoteH + remoteFootOffset)
        const remoteClipH = isMounted && remoteSeat ? Math.round(remoteH * remoteSeat.legClipRatio) : 0
        const remoteRiderFrame = isMounted && !remoteAttacking ? 0 : remoteFrame
        ctx.save()
        ctx.translate(Math.round(remoteX + riderSeatX + ox), Math.round(remoteY + oy + riderSeatY))
        if (remoteClipH > 0) {
          ctx.beginPath()
          ctx.rect(remoteDx - 12, remoteDy - 12, remoteW + 24, remoteH - remoteClipH + 14)
          ctx.clip()
        }
        drawCharacterFashionLayers({
          ctx,
          loadout: remoteLoadout,
          phase: 'behind',
          dir: other.facing,
          frame: remoteRiderFrame,
          dx: remoteDx,
          dy: remoteDy,
          dw: remoteW,
          dh: remoteH,
        })
        drawResolvedDrawable(
          ctx,
          remoteRiderDrawable,
          remoteDx,
          remoteDy,
          remoteW,
          remoteH,
        )
        drawCharacterFashionLayers({
          ctx,
          loadout: remoteLoadout,
          phase: 'overBody',
          dir: other.facing,
          frame: remoteRiderFrame,
          dx: remoteDx,
          dy: remoteDy,
          dw: remoteW,
          dh: remoteH,
        })
        drawCharacterFashionLayers({
          ctx,
          loadout: remoteLoadout,
          phase: 'overBack',
          dir: other.facing,
          frame: remoteRiderFrame,
          dx: remoteDx,
          dy: remoteDy,
          dw: remoteW,
          dh: remoteH,
        })
        if (remoteAttacking && !isRemoteGmEpic && !remoteRiderDrawable.sheetId) {
          drawWeaponAttackOverlay(ctx, other.facing, remoteWeapon, atkProgress, remoteWeaponColor)
        }
        ctx.restore()
        if (isMounted && activeMountDef) {
          drawMountForegroundSaddleStrap(
            ctx,
            Math.round(remoteX + riderSeatX + ox * 0.6),
            Math.round(remoteY + oy * 0.6 + riderSeatY),
            other.facing,
            activeMountDef,
            1,
            mountSkinFashion?.primaryColor,
          )
        }

        if (remoteRebirth > 0) {
          drawRebirthAura(ctx, {
            x: remoteX,
            y: remoteY + riderSeatY,
            timeSec: t,
            rebirthCount: remoteRebirth,
            radiusX: 12,
            spriteHeight: remoteH,
            layer: 'front',
          })
        }

        const remoteHatImg = getFashionLayerImage(remoteLoadout.hat)
        const hasLoadedRemoteHat = Boolean(remoteHatImg && remoteHatImg.complete && remoteHatImg.naturalWidth > 0)
        if (!hasLoadedRemoteHat && (gemFashion?.id === 'aurora_cat_hood' || hairFashion?.id === 'aurora_cat_hood')) {
          const catGem =
            gemFashion?.id === 'aurora_cat_hood'
              ? gemFashion
              : GEM_SHOP_ITEMS.find((g) => g.id === 'aurora_cat_hood')
          if (catGem) {
            drawGemItemPixels(ctx, catGem, remoteX - 5, remoteY + riderSeatY - remoteH - 1, 1.25)
          }
        }

        if (gemFashion?.id === 'sunfire_aura' || (auraFashion && !auraFashion.linkedGemItemId)) {
          const pCol = auraFashion?.primaryColor ?? gemFashion?.colors.primary ?? '#fbbf24'
          const aCol = auraFashion?.accentColor ?? gemFashion?.colors.accent ?? '#fde047'
          ctx.save()
          ctx.globalAlpha = 0.72
          ctx.strokeStyle = pCol
          ctx.shadowColor = aCol
          ctx.shadowBlur = 7
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.ellipse(remoteX, remoteY - 7, 12 + Math.sin(t * 4) * 1.5, 8, t * 0.3, 0, Math.PI * 2)
          ctx.stroke()
          ctx.fillStyle = aCol
          for (let spark = 0; spark < 4; spark++) {
            const angle = t * 2 + spark * (Math.PI / 2)
            ctx.fillRect(
              Math.round(remoteX + Math.cos(angle) * 13),
              Math.round(remoteY - 8 + Math.sin(angle) * 9),
              2,
              2,
            )
          }
          ctx.restore()
        }
      },
    })

    if (activePetDef) {
      const isPhao = activePetDef.category === 'phao' || activePetDef.id.startsWith('phao_')
      const petSpec = getPetModelSpec(activePetDef.id)
      const isFloating = petSpec.floating
      const petOffsetX = other.facing === 'left' ? 14 : other.facing === 'right' ? -14 : -15
      const petX = remoteX + petOffsetX + Math.sin(t * 2.5 + remoteX * 0.1) * 1.4
      const petY =
        remoteY -
        (isFloating ? 5 : 1) +
        (isFloating ? Math.sin(t * 4 + remoteY * 0.1) * 2.2 : other.moving ? -Math.abs(Math.sin(t * 9)) * 1.8 : 0)
      const petAction: SpriteAction = remoteAttacking ? 'attack' : other.moving ? 'walk' : 'idle'
      const petFrame = remoteAttacking
        ? remoteAtkFrame
        : petAction === 'walk'
          ? Math.floor(t * 9) % 6
          : Math.floor(t * 2.6) % 4
      const pImg = petSprite(activePetDef.id, other.facing, petAction, petFrame, remoteAtkFrame)
      const pHd = pImg.dataset?.hdScale ? Number(pImg.dataset.hdScale) : 1
      const pScale = (activePetDef.id === 'aurora_cloud_dragon' ? 0.78 : isPhao ? 0.72 : 0.68) / pHd
      const pDrawW = pImg.width * pScale
      const pDrawH = pImg.height * pScale

      ents.push({
        y: remoteY + 1,
        draw: () => {
          ctx.save()
          shadow(ctx, petX, remoteY + 1, isPhao ? 5 : 4)
          if (isPhao) {
            ctx.save()
            ctx.strokeStyle = activePetDef.colors.accent
            ctx.globalAlpha = 0.45 + Math.sin(t * 5) * 0.15
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.ellipse(petX, petY + 1, 7, 2.5, 0, 0, Math.PI * 2)
            ctx.stroke()
            ctx.restore()
          }
          if (pImg.width > 0 && pImg.height > 0) {
            ctx.drawImage(pImg, petX - pDrawW / 2, petY - pDrawH + 2, pDrawW, pDrawH)
          }
          ctx.restore()
        },
      })
    }
  }

  const job = JOBS[normalizeJobId(p.jobId)]
  const weapon = p.equipment.weapon ? ITEMS[p.equipment.weapon.itemId] : null
  const gemFashion = GEM_SHOP_ITEMS.find((item) => item.id === p.equippedGemFashion)
  const activePet = getActivePetBonuses(p.petState, p.equippedGemCompanion, p.ownedGemItems)
  const activeMount = getActiveMountBonuses(p.mountState, p.ownedGemItems)
  const extV2 = sanitizeExtV2(p.extV2)
  const prem = sanitizePremiumState(p.premium, {
    characterId: 'slot_1',
    diamonds: p.diamonds ?? 0,
    ownedGemItems: p.ownedGemItems,
    equippedGemFashion: p.equippedGemFashion,
    unlockedCosmetics: extV2.unlockedCosmetics,
    equippedWing: extV2.equippedWing,
    equippedWeaponSkin: extV2.equippedWeaponSkin,
  })
  const vipBonus = getEffectiveVipBonuses(prem.vip)
  const localLoadout = resolveFashionLoadoutFromSave({
    premium: prem,
    equippedGemFashion: p.equippedGemFashion,
    extV2,
  })
  preloadFashionLayers(localLoadout)
  const costumeFashion = getFashionItemDef(localLoadout.costume)
  const hairFashion = getFashionItemDef(localLoadout.hair)
  const auraFashion = getFashionItemDef(localLoadout.aura)
  const wingsFashion = getFashionItemDef(localLoadout.wings)
  const mountSkinFashion = getFashionItemDef(localLoadout.mountAppearance)
  const equippedWing = getCosmeticDef(extV2.equippedWing)
  const equippedWeaponSkin = getCosmeticDef(localLoadout.weaponSkin ?? extV2.equippedWeaponSkin)
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
      const skillFrame = Math.min(3, Math.floor(skillProgress * 4))
      const walkMod = 4
      const frame = castingSkill
        ? skillFrame
        : attacking
          ? atkFrame
          : game.moving
            ? Math.floor(game.walkT * 10) % walkMod
            : (Math.sin(t * 1.4) > 0.96 ? -1 : Math.floor(t * 2.4) % 4)
      const weaponType = weapon?.weaponType ?? job.weaponTypes[0] ?? 'stick'
      const baseStyledColors = jobHumanColors(job.id, job.colors, false)
      const styledColors = {
        ...baseStyledColors,
        ...(costumeFashion?.paletteOverride?.body ? { body: costumeFashion.paletteOverride.body } : {}),
        ...(costumeFashion?.paletteOverride?.legs ? { legs: costumeFashion.paletteOverride.legs } : {}),
        ...(costumeFashion?.paletteOverride?.accent ? { accent: costumeFashion.paletteOverride.accent } : {}),
        ...(costumeFashion?.paletteOverride?.hat ? { hat: costumeFashion.paletteOverride.hat } : {}),
        ...(hairFashion?.paletteOverride?.hair ? { hair: hairFashion.paletteOverride.hair } : {}),
      }
      const weaponDrawColor = castingSkill
        ? game.skillVfxColor
        : (equippedWeaponSkin?.primaryColor ?? weapon?.color ?? job.colors.accent)
      const drawable = resolveHumanDrawable(
        styledColors,
        game.facing,
        frame,
        weaponType,
        weaponDrawColor,
        attacking,
        action,
        attacking ? atkFrame : castingSkill ? skillFrame : undefined,
      )
      const isGmEpic = Boolean(drawable.gmReady)
      const drawScale = (isGmEpic ? 50 : 33) / Math.max(1, drawable.height)
      const drawW = drawable.width * drawScale
      const drawH = drawable.height * drawScale
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

      const hasTransitionMount = Boolean(
        activeMount && (game.mountTransition === 'mounting' || game.mountTransition === 'dismounting'),
      )
      const isRidingOrHopping = Boolean(activeMount && (activeMount.mounted || hasTransitionMount))
      const isSummonedCompanion = Boolean(activeMount && !activeMount.mounted && !hasTransitionMount)
      const mountAnimState = activeMount
        ? resolveMountAnimationState({
            mounted: Boolean(activeMount.mounted),
            flying: activeMount.def.flying,
            moving: game.moving,
            moveHoldT: game.moveHoldT,
            walkOnly: game.mountWalkOnly,
            attacking: attacking || castingSkill,
            attackFrame: castingSkill ? skillFrame : atkFrame,
            transition: game.mountTransition,
            animRemaining: game.mountAnim,
            animMax: game.mountAnimMax,
            walkT: game.walkT,
            timeSec: t,
          })
        : null
      const mountHover = mountAnimState?.mountHoverY ?? 0
      const seatOffset =
        isRidingOrHopping && activeMount && mountAnimState
          ? getMountRiderSeatOffset(activeMount.mountId, game.facing, mountAnimState.action, mountAnimState.frame)
          : null
      const transitionRatio =
        game.mountTransition === 'mounting'
          ? mountAnimState?.transitionProgress ?? 1
          : game.mountTransition === 'dismounting'
            ? 1 - (mountAnimState?.transitionProgress ?? 0)
            : activeMount?.mounted
              ? 1
              : 0
      const riderSeatX =
        seatOffset && mountAnimState
          ? seatOffset.x * transitionRatio + mountAnimState.riderArcX
          : 0
      const riderSeatY =
        seatOffset && mountAnimState
          ? seatOffset.y * transitionRatio + mountHover + mountAnimState.riderArcY
          : 0
      const isSeatedInSaddle = isRidingOrHopping && transitionRatio > 0.45

      const localRiderDrawable =
        isSeatedInSaddle && !attacking && !castingSkill
          ? resolveHumanDrawable(
              styledColors,
              game.facing,
              0,
              weaponType,
              weaponDrawColor,
              false,
              'idle',
              undefined,
            )
          : drawable

      shadow(ctx, p.x, p.y, isRidingOrHopping ? 9 : 6)
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
        const isSprintingMount = isRidingOrHopping && mountAnimState?.action === 'run'
        ctx.fillStyle = isRidingOrHopping && activeMount?.def.auraColor ? activeMount.def.auraColor : 'rgba(255,255,255,0.28)'
        const dustPhase = (game.walkT * (isSprintingMount ? 5.5 : 4)) % 1
        ctx.globalAlpha = (1 - dustPhase) * (isSprintingMount ? 0.78 : isRidingOrHopping ? 0.6 : 0.45)
        const dx = game.facing === 'left' ? 5 : game.facing === 'right' ? -5 : (stride > 0 ? -3 : 3)
        ctx.fillRect(Math.round(p.x + dx - dustPhase * dx), Math.round(p.y - 1 - dustPhase * 2), isSprintingMount ? 4 : isRidingOrHopping ? 3 : 2, isSprintingMount ? 2 : 1.5)
        ctx.restore()
      }
      ctx.globalAlpha = p.invisible ? 0.18 : 1
      if (isRidingOrHopping && activeMount && (activeMount.def.auraColor || mountSkinFashion || activeMount.level >= 5)) {
        const tier = getMountVisualTier(activeMount.level)
        ctx.save()
        ctx.strokeStyle = mountSkinFashion?.primaryColor ?? activeMount.def.auraColor ?? (tier >= 3 ? '#fbbf24' : '#38bdf8')
        ctx.lineWidth = mountSkinFashion || tier >= 4 ? 1.8 : 1.2
        ctx.globalAlpha = (p.invisible ? 0.12 : 0.45) + Math.sin(t * 4) * 0.14
        ctx.beginPath()
        ctx.ellipse(p.x, p.y - 1, mountSkinFashion || tier >= 4 ? 15 : 13, 5.5, 0, 0, Math.PI * 2)
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

      const drawSummonedCompanionMount = () => {
        if (!isSummonedCompanion || !activeMount || !mountAnimState) return
        preloadMountSpriteSheet(activeMount.mountId)
        const compX = p.x + (game.facing === 'left' ? 19 : game.facing === 'right' ? -19 : -18)
        const compY = p.y + (game.facing === 'up' ? -4 : 3)
        shadow(ctx, compX, compY, 7.5)
        const mImg = mountSprite(
          activeMount.mountId,
          game.facing,
          mountAnimState.action,
          mountAnimState.frame,
          atkFrame,
          activeMount.level,
          mountSkinFashion?.id,
        )
        if (mImg.width > 0 && mImg.height > 0) {
          const mHd = mImg.dataset?.hdScale ? Number(mImg.dataset.hdScale) : 1
          const mDrawW = (mImg.width * 0.72) / mHd
          const mDrawH = (mImg.height * 0.72) / mHd
          ctx.drawImage(
            mImg,
            compX - mDrawW / 2,
            compY + mountHover * 0.75 - mDrawH + 3,
            mDrawW,
            mDrawH,
          )
        }
      }

      if (isSummonedCompanion && game.facing === 'up') {
        drawSummonedCompanionMount()
      }

      if (isRidingOrHopping && activeMount && mountAnimState) {
        preloadMountSpriteSheet(activeMount.mountId)
        const mImg = mountSprite(
          activeMount.mountId,
          game.facing,
          mountAnimState.action,
          mountAnimState.frame,
          atkFrame,
          activeMount.level,
          mountSkinFashion?.id,
        )
        if (mImg.width > 0 && mImg.height > 0) {
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
      }
      const localWingImg = getFashionLayerImage(localLoadout.wings)
      const hasLoadedLocalWing = Boolean(localWingImg && localWingImg.complete && localWingImg.naturalWidth > 0)
      const activeWingColors = !hasLoadedLocalWing
        ? (equippedWing
            ? { primary: equippedWing.primaryColor, secondary: equippedWing.secondaryColor }
            : wingsFashion && !wingsFashion.linkedGemItemId
              ? { primary: wingsFashion.primaryColor, secondary: wingsFashion.secondaryColor }
              : null)
        : null
      if (activeWingColors) {
        ctx.save()
        ctx.globalAlpha = p.invisible ? 0.15 : 0.9
        const flap = Math.sin(t * 6) * 2.5
        ctx.fillStyle = activeWingColors.primary
        ctx.strokeStyle = activeWingColors.secondary
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(p.x + riderSeatX - 2, p.y + riderSeatY - 15)
        ctx.lineTo(p.x + riderSeatX - 14, p.y + riderSeatY - 23 - flap)
        ctx.lineTo(p.x + riderSeatX - 10, p.y + riderSeatY - 11 - flap * 0.4)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(p.x + riderSeatX + 2, p.y + riderSeatY - 15)
        ctx.lineTo(p.x + riderSeatX + 14, p.y + riderSeatY - 23 - flap)
        ctx.lineTo(p.x + riderSeatX + 10, p.y + riderSeatY - 11 - flap * 0.4)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }
      if (!hasLoadedLocalWing && (gemFashion?.id === 'nebula_dragon_wings' || wingsFashion?.id === 'nebula_dragon_wings')) {
        const wingGem = gemFashion?.id === 'nebula_dragon_wings' ? gemFashion : GEM_SHOP_ITEMS.find((g) => g.id === 'nebula_dragon_wings')
        if (wingGem) {
          ctx.save()
          ctx.globalAlpha = p.invisible ? 0.14 : 0.86
          const wingBob = Math.sin(t * 5) * 0.7
          drawGemItemPixels(ctx, wingGem, p.x + riderSeatX - 8, p.y + riderSeatY - drawH + 5 + wingBob, 2)
          ctx.restore()
        }
      }
      const localDx = Math.round(-drawW / 2)
      const localDy = Math.round(-drawH + footOffset)
      const localClipH = isSeatedInSaddle && seatOffset ? Math.round(drawH * seatOffset.legClipRatio) : 0
      const riderFrame = isSeatedInSaddle && !attacking && !castingSkill ? 0 : frame
      ctx.save()
      ctx.translate(Math.round(p.x + riderSeatX + ox), Math.round(p.y + oy + riderSeatY))
      if (localClipH > 0) {
        ctx.beginPath()
        ctx.rect(localDx - 12, localDy - 12, drawW + 24, drawH - localClipH + 14)
        ctx.clip()
      }
      drawCharacterFashionLayers({
        ctx,
        loadout: localLoadout,
        phase: 'behind',
        dir: game.facing,
        frame: riderFrame,
        dx: localDx,
        dy: localDy,
        dw: drawW,
        dh: drawH,
        alpha: p.invisible ? 0.2 : 1,
      })
      drawResolvedDrawable(ctx, localRiderDrawable, localDx, localDy, drawW, drawH)
      drawCharacterFashionLayers({
        ctx,
        loadout: localLoadout,
        phase: 'overBody',
        dir: game.facing,
        frame: riderFrame,
        dx: localDx,
        dy: localDy,
        dw: drawW,
        dh: drawH,
        alpha: p.invisible ? 0.2 : 1,
      })
      drawCharacterFashionLayers({
        ctx,
        loadout: localLoadout,
        phase: 'overBack',
        dir: game.facing,
        frame: riderFrame,
        dx: localDx,
        dy: localDy,
        dw: drawW,
        dh: drawH,
        alpha: p.invisible ? 0.2 : 1,
      })
      if ((attacking || (castingSkill && !isGmEpic)) && !isGmEpic && !localRiderDrawable.sheetId) {
        drawWeaponAttackOverlay(
          ctx,
          game.facing,
          weaponType,
          attacking ? atkProgress : skillProgress,
          weaponDrawColor,
        )
      }
      ctx.restore()
      if (isSeatedInSaddle && activeMount) {
        drawMountForegroundSaddleStrap(
          ctx,
          Math.round(p.x + riderSeatX + ox * 0.6),
          Math.round(p.y + oy * 0.6 + riderSeatY),
          game.facing,
          activeMount.def,
          activeMount.level,
          mountSkinFashion?.primaryColor,
        )
      }
      if (isSummonedCompanion && game.facing !== 'up') {
        drawSummonedCompanionMount()
      }
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
      const localHatImg = getFashionLayerImage(localLoadout.hat)
      const hasLoadedLocalHat = Boolean(localHatImg && localHatImg.complete && localHatImg.naturalWidth > 0)
      if (!hasLoadedLocalHat && (gemFashion?.id === 'aurora_cat_hood' || hairFashion?.id === 'aurora_cat_hood')) {
        const catGem = gemFashion?.id === 'aurora_cat_hood' ? gemFashion : GEM_SHOP_ITEMS.find((g) => g.id === 'aurora_cat_hood')
        if (catGem) {
          drawGemItemPixels(ctx, catGem, p.x - 5, p.y + riderSeatY - drawH - 1, 1.25)
        }
      }
      if (gemFashion?.id === 'sunfire_aura' || (auraFashion && !auraFashion.linkedGemItemId)) {
        const pCol = auraFashion?.primaryColor ?? gemFashion?.colors.primary ?? '#fbbf24'
        const aCol = auraFashion?.accentColor ?? gemFashion?.colors.accent ?? '#fde047'
        ctx.save()
        ctx.globalAlpha = p.invisible ? 0.12 : 0.72
        ctx.strokeStyle = pCol
        ctx.shadowColor = aCol
        ctx.shadowBlur = 7
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.ellipse(p.x, p.y - 7, 12 + Math.sin(t * 4) * 1.5, 8, t * 0.3, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = aCol
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
    const petSpec = getPetModelSpec(activePet.petId)
    const isFloating = petSpec.floating
    const petOffsetX = game.facing === 'left' ? 14 : game.facing === 'right' ? -14 : -15
    const petX = p.x + petOffsetX + Math.sin(t * 2.5) * 1.4
    const petY =
      p.y -
      (isFloating ? 5 : 1) +
      (isFloating ? Math.sin(t * 4) * 2.2 : game.moving ? -Math.abs(Math.sin(game.walkT * 9)) * 1.8 : 0)
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
    const pScale = (activePet.petId === 'aurora_cloud_dragon' ? 0.78 : isPhao ? 0.72 : 0.68) / pHd
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
        if (pImg.width > 0 && pImg.height > 0) {
          ctx.drawImage(pImg, petX - pDrawW / 2, petY - pDrawH + 2, pDrawW, pDrawH)
        }
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
  if (
    map.theme === 'frost' ||
    map.theme === 'snow' ||
    map.theme === 'dream' ||
    map.theme === 'isles' ||
    map.theme === 'volcano' ||
    map.theme === 'abyss' ||
    map.theme === 'forest' ||
    map.theme === 'crystal' ||
    map.theme === 'sky' ||
    map.theme === 'world'
  ) {
    ctx.save()
    const count = map.theme === 'sky' ? 14 : 24
    for (let i = 0; i < count; i++) {
      if (map.theme === 'sky') {
        const px = ((i * 197 + t * (16 + (i % 4) * 5)) % (cw + 80)) - 40
        const py = ((i * 113 + Math.sin(t * 0.4 + i) * 10) % ch)
        ctx.fillStyle = 'rgba(255,255,255,0.22)'
        ctx.fillRect(Math.round(px), Math.round(py), Math.round(14 * dpr), Math.round(4 * dpr))
      } else if (map.theme === 'volcano' || map.theme === 'abyss' || map.theme === 'world') {
        const px = ((i * 173 + Math.sin(t * 1.5 + i) * 20) % cw + cw) % cw
        const py = ch - ((t * (28 + (i % 5) * 8) + i * 91) % ch)
        ctx.fillStyle = i % 2 ? '#ff7b00' : '#ffd166'
        ctx.globalAlpha = 0.55
        ctx.fillRect(Math.round(px), Math.round(py), Math.max(2, Math.round(1.5 * dpr)), Math.max(2, Math.round(1.5 * dpr)))
      } else if (map.theme === 'frost' || map.theme === 'snow') {
        const px = ((i * 151 + t * 18 + Math.sin(t * 1.2 + i) * 16) % cw + cw) % cw
        const py = (t * (32 + (i % 4) * 10) + i * 83) % ch
        ctx.fillStyle = i % 2 ? '#ffffff' : '#caf0f8'
        ctx.globalAlpha = 0.72
        ctx.fillRect(Math.round(px), Math.round(py), Math.max(2, Math.round(1.6 * dpr)), Math.max(2, Math.round(1.6 * dpr)))
      } else if (map.theme === 'dream' || map.theme === 'isles') {
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

  if (
    map.theme === 'cave' ||
    map.theme === 'forest' ||
    map.theme === 'volcano' ||
    map.theme === 'abyss' ||
    map.theme === 'graveyard' ||
    map.theme === 'ruins' ||
    map.theme === 'crystal'
  ) {
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
            : map.theme === 'graveyard' || map.theme === 'ruins'
              ? 'rgba(10,12,24,0.42)'
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
    const dir: PortalDirection =
      pt.dir ?? (pt.x === 0 ? 'west' : pt.x >= map.width - 2 ? 'east' : pt.y === 0 ? 'north' : 'south')
    const wx =
      dir === 'west'
        ? (pt.x + 2.5) * TILE
        : dir === 'east'
          ? (pt.x - 1.5) * TILE
          : (pt.x + pt.w / 2) * TILE
    const wy =
      dir === 'north'
        ? (pt.y + 2.8) * TILE
        : dir === 'south'
          ? (pt.y - 1.5) * TILE
          : (pt.y - 0.25) * TILE
    const arrow = dir === 'north' ? '▲' : dir === 'south' ? '▼' : dir === 'west' ? '◀' : '▶'
    const [x, y] = toS(wx, wy)
    text(`${arrow} ${pt.label}`, x, y, '#caf0f8', 9)
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
      const bob = Math.sin(t * 6) * 1.5 * dpr
      const [bx, by] = toS(npcWorldX, npcWorldY + 7)
      const promptLabel = `คุย (E) · คลิก`
      ctx.save()
      ctx.font = `bold ${Math.round(8.2 * dpr * (zoom / 3) * 1.1)}px ${font}`
      const pw = ctx.measureText(promptLabel).width + 10 * dpr
      const ph = 13 * dpr
      const px = bx - pw / 2
      const py = by + 3 * dpr + bob
      ctx.fillStyle = 'rgba(6, 78, 59, 0.92)'
      ctx.strokeStyle = '#6ee7b7'
      ctx.lineWidth = dpr
      ctx.beginPath()
      ctx.roundRect(px, py, pw, ph, 4 * dpr)
      ctx.fill()
      ctx.stroke()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ecfdf5'
      ctx.fillText(promptLabel, bx, py + ph / 2)
      ctx.restore()
    }
  }

  for (const m of game.monsters) {
    if (m.dead) continue
    if (m.x < cullX0 || m.x > cullX1 || m.y < cullY0 || m.y > cullY1) continue
    const def = MONSTERS[m.defId]
    if (!def) continue
    const catalogAtlas = getCatalogMonsterAtlas(def.id)
    const mSpec = getMonsterModelSpec(def.id, def.sprite, def.color)
    const mScale = def.boss ? 1.65 : 1.05
    const h = catalogAtlas
      ? Math.round(
          Math.max(18, Math.min(72, 16 + catalogAtlas.heightWorld * 0.28)) *
            (1 - catalogAtlas.footPadFrac),
        ) + (mSpec.flying ? 5 : 2)
      : Math.round(mSpec.canvasSize.height * mScale * 0.78) + (mSpec.flying ? 5 : 0)
    const [x, y] = toS(m.x, m.y - h)
    const isAnyBoss = Boolean(def.boss || m.isWorldBoss)
    const color = m.isWorldBoss ? '#fde047' : def.boss ? '#ff6b6b' : def.level > p.level + 5 ? '#ff8fa3' : def.level < p.level - 5 ? '#a0a0a0' : '#ffffff'
    const label = m.isWorldBoss ? `[บอสโลก] ${m.worldBossName ?? def.name}` : `${def.boss ? '★ ' : ''}${def.name} Lv.${def.level}`
    text(label, x, y - 8 * dpr, color, isAnyBoss ? 10 : 8)
    if (m.hp < m.maxHp || isAnyBoss) {
      const bw = (m.isWorldBoss ? 48 : def.boss ? 40 : 18) * s
      const bh = (m.isWorldBoss ? 2.5 : 2) * s
      ctx.fillStyle = isAnyBoss ? '#f5c441' : 'rgba(10,8,20,0.9)'
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
    const isRemoteMounted = Boolean(other.mountId && getMountDef(other.mountId))
    const [x, y] = toS(remoteX, remoteY - (isRemoteMounted ? 44 : 38))
    const remoteJob = JOBS[normalizeJobId(other.jobId)]
    const activeTitleDef = other.activeTitle ? TITLE_DEFS.find((item) => item.id === other.activeTitle) : null
    const vipTierDef = (other.vipLevel ?? 0) > 0 ? getVipTierDef(other.vipLevel ?? 0) : null
    const equippedFrame = getCosmeticDef(other.frameId)
    const gmPrefix = other.gm ? '[GM] ' : ''
    const guildTagPrefix = other.guildTag ? `[${other.guildTag}] ` : ''
    const vipPrefix = vipTierDef ? `[${vipTierDef.badgeLabel}] ` : ''
    const displayNameLine = `${gmPrefix}${vipPrefix}${guildTagPrefix}${other.displayName} [${other.gm ? '0000' : String(other.uid).padStart(5, '0')}] Lv.${other.level}`

    if (equippedFrame) {
      ctx.save()
      ctx.strokeStyle = equippedFrame.primaryColor
      ctx.fillStyle = equippedFrame.secondaryColor
      ctx.globalAlpha = 0.72
      const fw = Math.max(76, displayNameLine.length * 4.5) * dpr
      const fh = 12 * dpr
      ctx.fillRect(Math.round(x - fw / 2), Math.round(y - 5 * dpr - fh / 2), Math.round(fw), Math.round(fh))
      ctx.lineWidth = 1.2 * dpr
      ctx.strokeRect(Math.round(x - fw / 2), Math.round(y - 5 * dpr - fh / 2), Math.round(fw), Math.round(fh))
      ctx.restore()
    }
    text(`✦ ${remoteJob.name} ✦`, x, y - 16 * dpr, other.gm ? '#ffd60a' : '#72efdd', 7.8)
    text(
      displayNameLine,
      x,
      y - 5 * dpr,
      other.gm ? '#ffd60a' : equippedFrame?.primaryColor ?? vipTierDef?.badgeColor ?? '#8be9fd',
      9.2,
    )
    if (activeTitleDef) {
      text(`«${activeTitleDef.name}»`, x, y - 27 * dpr, activeTitleDef.color, 7.6)
    }
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
    const gmPrefix = p.gm ? '[GM] ' : ''
    const guildTagPrefix = p.rpgExt?.guildTag ? `[${p.rpgExt.guildTag}] ` : ''
    const vipPrefix = vipBonus.active && vipBonus.tierDef ? `[${vipBonus.tierDef.badgeLabel}] ` : ''
    const displayNameLine = `${gmPrefix}${vipPrefix}${guildTagPrefix}${p.name} [${p.uid === undefined ? 'Guest' : String(p.uid).padStart(5, '0')}]`
    if (equippedFrame) {
      ctx.save()
      ctx.strokeStyle = equippedFrame.primaryColor
      ctx.fillStyle = equippedFrame.secondaryColor
      ctx.globalAlpha = 0.72
      const fw = Math.max(76, displayNameLine.length * 4.5) * dpr
      const fh = 12 * dpr
      ctx.fillRect(Math.round(x - fw / 2), Math.round(y - 5 * dpr - fh / 2), Math.round(fw), Math.round(fh))
      ctx.lineWidth = 1.2 * dpr
      ctx.strokeRect(Math.round(x - fw / 2), Math.round(y - 5 * dpr - fh / 2), Math.round(fw), Math.round(fh))
      ctx.restore()
    }
    text(`✦ ${job.name} ✦`, x, y - 16 * dpr, p.gm ? '#ffd60a' : '#72efdd', 7.8)
    text(
      displayNameLine,
      x,
      y - 5 * dpr,
      p.gm ? '#ffd60a' : equippedFrame?.primaryColor ?? (vipBonus.active && vipBonus.tierDef ? vipBonus.tierDef.badgeColor : '#ffffff'),
      9.5,
    )
    if (activeTitleDef) {
      text(`«${activeTitleDef.name}»`, x, y - 27 * dpr, activeTitleDef.color, 7.6)
    }
    if (game.bubble) {
      ctx.font = `${Math.round(11 * dpr * (zoom / 3) * 1.2)}px ${font}`
      const tw = Math.min(ctx.measureText(game.bubble.text).width, 260 * dpr)
      const by = y - (activeTitleDef ? 42 : 31) * dpr
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
