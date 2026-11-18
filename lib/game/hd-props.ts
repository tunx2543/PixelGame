import { T, TILE, type MapDef, type MapObject, type MapObjectKind } from './maps'
import { getHdImage, type HdAssetKey } from './hd-assets'
import type { OverheadBounds } from './camera'

export interface HdDepthDrawable {
  y: number
  zBias?: number
  draw: (ctx: CanvasRenderingContext2D) => void
  overheadZone?: OverheadBounds
  drawOverhead?: (ctx: CanvasRenderingContext2D, alpha?: number) => void
}

export interface TownStructureSpec {
  id: string
  assetKey: HdAssetKey
  tx: number
  ty: number
  tw: number
  th: number
  baseYOffsetTiles: number
  overheadSplitRatio: number
  tint?: string
  animatedForge?: boolean
  kind: 'building' | 'watchtower' | 'fountain'
}

// Pure Town structure layout matching maps.ts buildTown() coordinates without altering collision grid.
export const TOWN_STRUCTURES: TownStructureSpec[] = [
  // NW District: General Market & Merchant Inn (house(5, 3, 8, T.ROOF_RED))
  {
    id: 'town_guild_inn',
    assetKey: 'guildInn',
    tx: 5,
    ty: 3,
    tw: 8,
    th: 4,
    baseYOffsetTiles: 0.15,
    overheadSplitRatio: 0.44,
    kind: 'building',
  },
  // NE District: Royal Blacksmith & Forge (house(31, 3, 8, T.ROOF_BLUE))
  {
    id: 'town_blacksmith',
    assetKey: 'blacksmithForge',
    tx: 31,
    ty: 3,
    tw: 8,
    th: 4,
    baseYOffsetTiles: 0.15,
    overheadSplitRatio: 0.42,
    animatedForge: true,
    kind: 'building',
  },
  // SW District: Adventurer & Job Master Guild Hall (house(5, 18, 8, T.ROOF_PURPLE))
  {
    id: 'town_job_hall',
    assetKey: 'blueCottage',
    tx: 5,
    ty: 18,
    tw: 8,
    th: 4,
    baseYOffsetTiles: 0.15,
    overheadSplitRatio: 0.44,
    tint: 'rgba(139, 92, 246, 0.22)',
    kind: 'building',
  },
  // SE District: Vault Bank & Storage House (house(31, 18, 8, T.ROOF_GREEN))
  {
    id: 'town_storage_vault',
    assetKey: 'blueCottage',
    tx: 31,
    ty: 18,
    tw: 8,
    th: 4,
    baseYOffsetTiles: 0.15,
    overheadSplitRatio: 0.44,
    tint: 'rgba(16, 185, 129, 0.2)',
    kind: 'building',
  },
  // Corner Castle Watchtowers (watchtower(1,1), (40,1), (1,27), (40,27))
  { id: 'tower_nw', assetKey: 'blueCottage', tx: 1, ty: 1, tw: 3, th: 4, baseYOffsetTiles: 0.1, overheadSplitRatio: 0.45, kind: 'watchtower' },
  { id: 'tower_ne', assetKey: 'blueCottage', tx: 40, ty: 1, tw: 3, th: 4, baseYOffsetTiles: 0.1, overheadSplitRatio: 0.45, kind: 'watchtower' },
  { id: 'tower_sw', assetKey: 'blueCottage', tx: 1, ty: 27, tw: 3, th: 4, baseYOffsetTiles: 0.1, overheadSplitRatio: 0.45, kind: 'watchtower' },
  { id: 'tower_se', assetKey: 'blueCottage', tx: 40, ty: 27, tw: 3, th: 4, baseYOffsetTiles: 0.1, overheadSplitRatio: 0.45, kind: 'watchtower' },
  // Central Plaza Angel Fountain (21..22, 15..16)
  {
    id: 'town_angel_fountain',
    assetKey: 'angelFountain',
    tx: 21,
    ty: 15,
    tw: 2,
    th: 2,
    baseYOffsetTiles: 0.35,
    overheadSplitRatio: 0.38,
    kind: 'fountain',
  },
]

function drawSoftShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, alpha = 0.28) {
  ctx.save()
  ctx.fillStyle = `rgba(18, 12, 24, ${alpha})`
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawSplitImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  splitYRatio: number,
  part: 'lower' | 'upper',
  alpha = 1,
) {
  const sySplit = Math.round(img.height * splitYRatio)
  const dySplit = dy + dh * splitYRatio
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'medium'
  ctx.globalAlpha *= alpha
  if (part === 'upper') {
    ctx.drawImage(img, 0, 0, img.width, sySplit, dx, dy, dw, dySplit - dy)
  } else {
    ctx.drawImage(img, 0, sySplit, img.width, img.height - sySplit, dx, dySplit, dw, dy + dh - dySplit)
  }
  ctx.restore()
}

function drawFallbackBuilding(
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  roofCol: string,
  part: 'full' | 'lower' | 'upper',
) {
  ctx.save()
  const roofH = dh * 0.52
  const wallY = dy + roofH * 0.88
  const wallH = dy + dh - wallY
  if (part === 'full' || part === 'lower') {
    ctx.fillStyle = '#f3e5cb'
    ctx.strokeStyle = '#2d1c15'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.roundRect(dx + 4, wallY, dw - 8, wallH, 3)
    ctx.fill()
    ctx.stroke()
    // Timber beams & door
    ctx.fillStyle = '#8b5a34'
    ctx.fillRect(dx + dw * 0.42, wallY + wallH * 0.28, dw * 0.16, wallH * 0.72)
  }
  if (part === 'full' || part === 'upper') {
    ctx.fillStyle = roofCol
    ctx.strokeStyle = '#2d1c15'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(dx, wallY + 4)
    ctx.lineTo(dx + dw / 2, dy)
    ctx.lineTo(dx + dw, wallY + 4)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}

function drawWatchtowerCanvas(
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  part: 'lower' | 'upper',
  alpha = 1,
) {
  ctx.save()
  ctx.globalAlpha *= alpha
  const splitY = dy + dh * 0.48
  if (part === 'lower') {
    const g = ctx.createLinearGradient(dx, splitY, dx + dw, splitY)
    g.addColorStop(0, '#cbd5e1')
    g.addColorStop(0.6, '#94a3b8')
    g.addColorStop(1, '#64748b')
    ctx.fillStyle = g
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.roundRect(dx + 3, splitY - 4, dw - 6, dy + dh - splitY + 4, 3)
    ctx.fill()
    ctx.stroke()
    // Arched door & window
    ctx.fillStyle = '#784421'
    ctx.beginPath()
    ctx.roundRect(dx + dw * 0.36, dy + dh - 17, dw * 0.28, 17, [8, 8, 0, 0])
    ctx.fill()
    ctx.stroke()
  } else {
    // Blue tile spire roof
    const rg = ctx.createLinearGradient(dx, dy, dx + dw, splitY)
    rg.addColorStop(0, '#3b82f6')
    rg.addColorStop(1, '#1d4ed8')
    ctx.fillStyle = rg
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(dx - 2, splitY + 2)
    ctx.lineTo(dx + dw * 0.5, dy - 4)
    ctx.lineTo(dx + dw + 2, splitY + 2)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // Gold spire tip
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.arc(dx + dw * 0.5, dy - 4, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function buildTownStructureDrawables(t: number): HdDepthDrawable[] {
  const result: HdDepthDrawable[] = []

  for (const s of TOWN_STRUCTURES) {
    if (s.kind === 'fountain') {
      const cx = (s.tx + s.tw / 2) * TILE
      const baseY = (s.ty + s.th) * TILE
      const dw = 58
      const dh = 50
      const dx = cx - dw / 2
      const dy = baseY - dh + 4
      const img = getHdImage('angelFountain')

      result.push({
        y: baseY - 4,
        overheadZone: {
          x0: cx - 22,
          y0: dy,
          x1: cx + 22,
          y1: baseY - 12,
          baseY: baseY - 4,
        },
        draw: (ctx) => {
          drawSoftShadow(ctx, cx, baseY - 2, dw * 0.48, 12, 0.25)
          if (img) {
            drawSplitImage(ctx, img, dx, dy, dw, dh, s.overheadSplitRatio, 'lower')
          } else {
            ctx.fillStyle = '#38bdf8'
            ctx.beginPath()
            ctx.ellipse(cx, baseY - 12, 24, 14, 0, 0, Math.PI * 2)
            ctx.fill()
          }
          // Animated sparkling water ripples
          ctx.save()
          for (let i = 0; i < 3; i++) {
            const p = ((t * 0.9 + i * 0.33) % 1)
            ctx.strokeStyle = `rgba(224, 242, 254, ${(1 - p) * 0.65})`
            ctx.lineWidth = 1.1
            ctx.beginPath()
            ctx.ellipse(cx, baseY - 14, 7 + p * 14, 3.5 + p * 7, 0, 0, Math.PI * 2)
            ctx.stroke()
          }
          ctx.restore()
        },
        drawOverhead: (ctx, alpha = 1) => {
          if (img) {
            drawSplitImage(ctx, img, dx, dy, dw, dh, s.overheadSplitRatio, 'upper', alpha)
          }
        },
      })
      continue
    }

    if (s.kind === 'watchtower') {
      const dx = s.tx * TILE - 3
      const dw = s.tw * TILE + 6
      const dh = 76
      const baseY = (s.ty + s.th) * TILE + s.baseYOffsetTiles * TILE
      const dy = baseY - dh
      result.push({
        y: baseY,
        overheadZone: {
          x0: dx + 4,
          y0: dy,
          x1: dx + dw - 4,
          y1: baseY - 14,
          baseY,
        },
        draw: (ctx) => {
          drawSoftShadow(ctx, dx + dw / 2, baseY - 1, dw * 0.52, 8, 0.26)
          drawWatchtowerCanvas(ctx, dx, dy, dw, dh, 'lower')
        },
        drawOverhead: (ctx, alpha = 1) => {
          drawWatchtowerCanvas(ctx, dx, dy, dw, dh, 'upper', alpha)
        },
      })
      continue
    }

    // Town Houses (Guild Inn, Blacksmith Forge, Job Hall, Storage Vault)
    const img = getHdImage(s.assetKey)
    const footprintW = s.tw * TILE
    const dw = footprintW + 18
    const aspect = img ? img.height / img.width : 0.86
    const dh = Math.round(dw * aspect)
    const dx = s.tx * TILE - 9
    const baseY = (s.ty + s.th) * TILE + s.baseYOffsetTiles * TILE
    const dy = baseY - dh

    result.push({
      y: baseY,
      overheadZone: {
        x0: s.tx * TILE + 2,
        y0: dy,
        x1: (s.tx + s.tw) * TILE - 2,
        y1: baseY - TILE * 1.4,
        baseY,
      },
      draw: (ctx) => {
        drawSoftShadow(ctx, dx + dw / 2, baseY - 1, dw * 0.48, 10, 0.28)
        if (img) {
          drawSplitImage(ctx, img, dx, dy, dw, dh, s.overheadSplitRatio, 'lower')
          if (s.tint) {
            ctx.save()
            ctx.fillStyle = s.tint
            ctx.globalCompositeOperation = 'source-atop'
            ctx.fillRect(dx, dy + dh * s.overheadSplitRatio, dw, dh * (1 - s.overheadSplitRatio))
            ctx.restore()
          }
          if (s.animatedForge) {
            const flicker = 0.22 + Math.sin(t * 9) * 0.08
            ctx.save()
            ctx.fillStyle = `rgba(255, 130, 30, ${flicker})`
            ctx.beginPath()
            ctx.ellipse(dx + dw * 0.45, baseY - 14, 18, 10, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
          }
        } else {
          const fallbackRoof =
            s.id === 'town_blacksmith'
              ? '#2563eb'
              : s.id === 'town_job_hall'
                ? '#7c3aed'
                : s.id === 'town_storage_vault'
                  ? '#059669'
                  : '#dc2626'
          drawFallbackBuilding(ctx, dx, dy, dw, dh, fallbackRoof, 'lower')
        }
      },
      drawOverhead: (ctx, alpha = 1) => {
        if (img) {
          drawSplitImage(ctx, img, dx, dy, dw, dh, s.overheadSplitRatio, 'upper', alpha)
          if (s.tint) {
            ctx.save()
            ctx.globalAlpha *= alpha * 0.6
            ctx.fillStyle = s.tint
            ctx.beginPath()
            ctx.moveTo(dx + dw * 0.1, dy + dh * s.overheadSplitRatio)
            ctx.lineTo(dx + dw * 0.5, dy + 4)
            ctx.lineTo(dx + dw * 0.9, dy + dh * s.overheadSplitRatio)
            ctx.closePath()
            ctx.fill()
            ctx.restore()
          }
        } else {
          const fallbackRoof =
            s.id === 'town_blacksmith'
              ? '#2563eb'
              : s.id === 'town_job_hall'
                ? '#7c3aed'
                : s.id === 'town_storage_vault'
                  ? '#059669'
                  : '#dc2626'
          drawFallbackBuilding(ctx, dx, dy, dw, dh, fallbackRoof, 'upper')
        }
      },
    })
  }

  return result
}

export function buildTilePropDrawable(
  map: MapDef,
  tx: number,
  ty: number,
  tile: number,
): HdDepthDrawable | null {
  const cx = (tx + 0.5) * TILE
  const baseY = (ty + 0.95) * TILE
  const variant = (tx * 7 + ty * 13) & 3

  if (tile === T.TREE) {
    const key: HdAssetKey = variant === 0 ? 'oakLarge' : variant === 1 ? 'oakMedium' : 'oakSmall'
    const img = getHdImage(key)
    const targetH = variant === 0 ? 44 : variant === 1 ? 38 : 34
    const aspect = img ? img.width / img.height : 0.72
    const dw = Math.round(targetH * aspect)
    const dh = targetH
    const dx = cx - dw / 2
    const dy = baseY - dh + 3
    return {
      y: baseY,
      overheadZone: { x0: cx - dw * 0.42, y0: dy, x1: cx + dw * 0.42, y1: baseY - 8, baseY },
      draw: (ctx) => {
        drawSoftShadow(ctx, cx, baseY - 1, dw * 0.4, 5, 0.26)
        if (img) {
          drawSplitImage(ctx, img, dx, dy, dw, dh, 0.58, 'lower')
        } else {
          ctx.fillStyle = '#6b4226'
          ctx.fillRect(cx - 3, baseY - 14, 6, 14)
        }
      },
      drawOverhead: (ctx, alpha = 1) => {
        if (img) {
          drawSplitImage(ctx, img, dx, dy, dw, dh, 0.58, 'upper', alpha)
        } else {
          ctx.save()
          ctx.globalAlpha *= alpha
          ctx.fillStyle = '#2d8a34'
          ctx.beginPath()
          ctx.arc(cx, baseY - 22, 13, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      },
    }
  }

  if (tile === T.PINE) {
    const key: HdAssetKey = variant % 2 === 0 ? 'pineLarge' : 'pinePair'
    const img = getHdImage(key)
    const targetH = variant % 2 === 0 ? 42 : 44
    const aspect = img ? img.width / img.height : 0.72
    const dw = Math.round(targetH * aspect)
    const dh = targetH
    const dx = cx - dw / 2
    const dy = baseY - dh + 3
    const snowy = map.theme === 'frost'
    return {
      y: baseY,
      overheadZone: { x0: cx - dw * 0.38, y0: dy, x1: cx + dw * 0.38, y1: baseY - 8, baseY },
      draw: (ctx) => {
        drawSoftShadow(ctx, cx, baseY - 1, dw * 0.38, 4.5, 0.26)
        if (img && !snowy) {
          drawSplitImage(ctx, img, dx, dy, dw, dh, 0.62, 'lower')
        } else {
          ctx.fillStyle = '#5c3d2e'
          ctx.fillRect(cx - 3, baseY - 10, 6, 10)
        }
      },
      drawOverhead: (ctx, alpha = 1) => {
        if (img && !snowy) {
          drawSplitImage(ctx, img, dx, dy, dw, dh, 0.62, 'upper', alpha)
        } else {
          ctx.save()
          ctx.globalAlpha *= alpha
          ctx.fillStyle = snowy ? '#1d4d44' : '#1b5e36'
          ctx.strokeStyle = '#182420'
          ctx.lineWidth = 1.4
          ctx.beginPath()
          ctx.moveTo(cx, dy)
          ctx.lineTo(cx + 12, baseY - 8)
          ctx.lineTo(cx - 12, baseY - 8)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          if (snowy) {
            ctx.fillStyle = '#e0f2fe'
            ctx.beginPath()
            ctx.moveTo(cx, dy)
            ctx.lineTo(cx + 6, dy + 12)
            ctx.lineTo(cx - 6, dy + 12)
            ctx.closePath()
            ctx.fill()
          }
          ctx.restore()
        }
      },
    }
  }

  if (tile === T.BUSH) {
    const key: HdAssetKey =
      variant === 0 ? 'bushRound1' : variant === 1 ? 'bushRound2' : variant === 2 ? 'bushFlowers1' : 'bushFlowers2'
    const img = getHdImage(key)
    return {
      y: baseY - 2,
      draw: (ctx) => {
        drawSoftShadow(ctx, cx, baseY - 1, 9, 3.5, 0.24)
        if (img) {
          const dw = 20
          const dh = Math.round(dw * (img.height / img.width))
          ctx.save()
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, cx - dw / 2, baseY - dh + 2, dw, dh)
          ctx.restore()
        } else {
          ctx.fillStyle = '#2d7a36'
          ctx.beginPath()
          ctx.arc(cx, baseY - 7, 7.5, 0, Math.PI * 2)
          ctx.fill()
        }
      },
    }
  }

  if (tile === T.FENCE) {
    const img = getHdImage('fenceWood')
    return {
      y: baseY - 1,
      draw: (ctx) => {
        drawSoftShadow(ctx, cx, baseY, 8, 2.5, 0.2)
        if (img) {
          const dw = 18
          const dh = Math.round(dw * (img.height / img.width))
          ctx.save()
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, cx - dw / 2, baseY - dh + 1, dw, dh)
          ctx.restore()
        } else {
          ctx.fillStyle = '#9c6644'
          ctx.strokeStyle = '#2d1c15'
          ctx.lineWidth = 1.2
          ctx.fillRect(cx - 8, baseY - 10, 16, 4)
          ctx.strokeRect(cx - 8, baseY - 10, 16, 4)
        }
      },
    }
  }

  if (tile === T.SIGN) {
    const img = getHdImage('signpost')
    return {
      y: baseY,
      draw: (ctx) => {
        drawSoftShadow(ctx, cx, baseY, 6, 2.5, 0.24)
        if (img) {
          const dh = 24
          const dw = Math.round(dh * (img.width / img.height))
          ctx.save()
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, cx - dw / 2, baseY - dh + 2, dw, dh)
          ctx.restore()
        } else {
          ctx.fillStyle = '#8b5a34'
          ctx.fillRect(cx - 1.5, baseY - 12, 3, 12)
          ctx.fillStyle = '#c8956b'
          ctx.fillRect(cx - 7, baseY - 16, 14, 7)
        }
      },
    }
  }

  if (tile === T.ROCK) {
    return {
      y: baseY - 2,
      draw: (ctx) => {
        drawSoftShadow(ctx, cx, baseY - 1, 8, 3.5, 0.28)
        ctx.save()
        const g = ctx.createLinearGradient(cx - 8, baseY - 14, cx + 8, baseY)
        g.addColorStop(0, '#cbd5e1')
        g.addColorStop(0.5, '#94a3b8')
        g.addColorStop(1, '#475569')
        ctx.fillStyle = g
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(cx - 8, baseY - 2)
        ctx.quadraticCurveTo(cx - 9, baseY - 12, cx - 1, baseY - 14)
        ctx.quadraticCurveTo(cx + 8, baseY - 13, cx + 8, baseY - 2)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      },
    }
  }

  if (tile === T.CRYSTAL) {
    return {
      y: baseY - 1,
      draw: (ctx) => {
        drawSoftShadow(ctx, cx, baseY, 7, 3, 0.25)
        ctx.save()
        ctx.fillStyle = '#56cfe1'
        ctx.strokeStyle = '#164e63'
        ctx.lineWidth = 1.3
        ctx.beginPath()
        ctx.moveTo(cx, baseY - 18)
        ctx.lineTo(cx + 5, baseY - 7)
        ctx.lineTo(cx + 2, baseY - 1)
        ctx.lineTo(cx - 3, baseY - 1)
        ctx.lineTo(cx - 5, baseY - 8)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#e0fbfc'
        ctx.beginPath()
        ctx.moveTo(cx, baseY - 16)
        ctx.lineTo(cx + 2, baseY - 8)
        ctx.lineTo(cx - 1, baseY - 5)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      },
    }
  }

  return null
}

// Map MapObjectKind -> primary extracted HD PNG asset (when available on sheet)
const OBJECT_HD_ASSET: Partial<Record<MapObjectKind, { key: HdAssetKey; targetH: number }>> = {
  market_stall: { key: 'marketStall', targetH: 38 },
  well: { key: 'stoneWell', targetH: 36 },
  notice_board: { key: 'noticeBoard', targetH: 32 },
  sign_arrow: { key: 'signpost', targetH: 26 },
  lamp_post: { key: 'lampPost', targetH: 32 },
  guild_banner: { key: 'bannerPost', targetH: 30 },
  wagon: { key: 'treasureCart', targetH: 28 },
  barrel_cluster: { key: 'barrelPair', targetH: 22 },
  flower_cart: { key: 'planterWide', targetH: 22 },
  chest_decor: { key: 'crateBox', targetH: 20 },
  statue: { key: 'crystalShrine', targetH: 34 },
}

export function drawHdMapObject(
  ctx: CanvasRenderingContext2D,
  obj: MapObject,
  ox: number,
  oy: number,
  t: number,
  fallbackSprite: HTMLCanvasElement,
): void {
  const spec = OBJECT_HD_ASSET[obj.kind]
  const key: HdAssetKey | null =
    obj.kind === 'lamp_post' && (obj.tx + obj.ty) % 2 === 1
      ? 'lampBanner'
      : obj.kind === 'flower_cart' && (obj.variant ?? 0) % 2 === 1
        ? 'planterMed'
        : spec?.key ?? null

  const img = key ? getHdImage(key) : null
  if (img && spec) {
    const dh = spec.targetH
    const dw = Math.round(dh * (img.width / img.height))
    drawSoftShadow(ctx, ox, oy, Math.min(18, dw * 0.42), 4.5, 0.25)
    ctx.save()
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, ox - dw / 2, oy - dh + 3, dw, dh)
    ctx.restore()
    return
  }

  // Hand-drawn HD Canvas2D renderings for biome-specific objects not in the Town sheet
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  switch (obj.kind) {
    case 'sakura_tree': {
      drawSoftShadow(ctx, ox, oy + 1, 18, 6, 0.28)
      // Rooted gnarled trunk with warm bark highlight
      ctx.fillStyle = '#5c3828'
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(ox - 5.5, oy + 1)
      ctx.quadraticCurveTo(ox - 3, oy - 9, ox - 3, oy - 21)
      ctx.lineTo(ox + 3, oy - 21)
      ctx.quadraticCurveTo(ox + 3, oy - 9, ox + 5.5, oy + 1)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#8b5a3c'
      ctx.fillRect(ox - 1.5, oy - 18, 2, 15)

      // Painterly sakura canopy: dark outline silhouette behind, then soft layered blossom clusters
      const sway = Math.sin(t * 2 + obj.tx) * 0.7
      const clusters: ReadonlyArray<readonly [number, number, number, string]> = [
        [ox - 9 + sway, oy - 21, 9.5, '#ec4899'],
        [ox + 9 + sway, oy - 20, 9.5, '#ec4899'],
        [ox + sway, oy - 19, 10, '#f472b6'],
        [ox - 6 + sway, oy - 27, 10, '#f472b6'],
        [ox + 6 + sway, oy - 26, 10, '#f472b6'],
        [ox + sway, oy - 30, 11, '#f9a8d4'],
        [ox - 3 + sway, oy - 24, 8, '#fbcfe8'],
        [ox + 3 + sway, oy - 31, 7, '#fdf2f8'],
      ]
      // Outer ink silhouette pass
      ctx.fillStyle = '#501b36'
      for (const [bx, by, br] of clusters) {
        ctx.beginPath()
        ctx.arc(bx, by, br + 1.4, 0, Math.PI * 2)
        ctx.fill()
      }
      // Blossom fill pass (no harsh interior rings)
      for (const [bx, by, br, col] of clusters) {
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(bx, by, br, 0, Math.PI * 2)
        ctx.fill()
      }
      // Tiny petal highlights + floating petals
      ctx.fillStyle = '#fff1f2'
      for (let i = 0; i < 5; i++) {
        const px = ox - 10 + i * 5 + Math.sin(t * 2.5 + i) * 2
        const py = oy - 14 + ((t * 9 + i * 5) % 15)
        ctx.beginPath()
        ctx.ellipse(px, py, 1.8, 1, t + i, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      return
    }
    case 'campfire': {
      drawSoftShadow(ctx, ox, oy, 10, 4, 0.24)
      ctx.fillStyle = '#6b4226'
      ctx.strokeStyle = '#2d1c15'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.ellipse(ox, oy - 2, 8, 3.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      const f = Math.sin(t * 11 + obj.tx) * 1.4
      const g = ctx.createRadialGradient(ox, oy - 9, 1, ox, oy - 9, 9)
      g.addColorStop(0, '#fffbeb')
      g.addColorStop(0.5, '#fbbf24')
      g.addColorStop(1, '#ea580c')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(ox - 5, oy - 3)
      ctx.quadraticCurveTo(ox - 6, oy - 11, ox + f, oy - 16)
      ctx.quadraticCurveTo(ox + 6, oy - 11, ox + 5, oy - 3)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      return
    }
    case 'torch': {
      drawSoftShadow(ctx, ox, oy, 6, 2.5, 0.24)
      ctx.fillStyle = '#475569'
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1.2
      ctx.fillRect(ox - 1.5, oy - 18, 3, 18)
      ctx.strokeRect(ox - 1.5, oy - 18, 3, 18)
      const fl = Math.sin(t * 10 + obj.tx) * 1
      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.arc(ox + fl * 0.5, oy - 20, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fef08a'
      ctx.beginPath()
      ctx.arc(ox + fl * 0.3, oy - 20, 2.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    case 'anvil_forge': {
      drawSoftShadow(ctx, ox + 1, oy + 1, 15, 5, 0.32)
      // Soot hearth stone pad
      ctx.fillStyle = '#334155'
      ctx.beginPath()
      ctx.ellipse(ox, oy, 13.5, 4.2, 0, 0, Math.PI * 2)
      ctx.fill()

      // Drifting forge chimney smoke wisps
      for (let i = 0; i < 3; i++) {
        const phase = ((t * 0.7 + obj.tx * 0.31 + i * 0.33) % 1)
        const sx = ox - 5 + Math.sin(t * 2.2 + i * 2.1) * (1.8 + phase * 2.5)
        const sy = oy - 24 - phase * 11
        ctx.fillStyle = `rgba(226, 232, 240, ${(1 - phase) * 0.28})`
        ctx.beginPath()
        ctx.arc(sx, sy, 1.8 + phase * 2.4, 0, Math.PI * 2)
        ctx.fill()
      }

      // Chimney stack
      const chimG = ctx.createLinearGradient(ox - 10, oy - 25, ox - 2, oy - 16)
      chimG.addColorStop(0, '#64748b')
      chimG.addColorStop(1, '#334155')
      ctx.fillStyle = chimG
      ctx.strokeStyle = '#1e1b24'
      ctx.lineWidth = 1.15
      ctx.beginPath()
      ctx.roundRect(ox - 9.5, oy - 24, 9, 8, [1.5, 1.5, 0, 0])
      ctx.fill()
      ctx.stroke()
      // Chimney iron rim cap
      ctx.fillStyle = '#1f2937'
      ctx.beginPath()
      ctx.roundRect(ox - 10.5, oy - 25, 11, 2.4, 1)
      ctx.fill()
      ctx.stroke()

      // Main brick & mortar forge body
      const stoneG = ctx.createLinearGradient(ox - 13, oy - 18, ox + 2, oy)
      stoneG.addColorStop(0, '#94a3b8')
      stoneG.addColorStop(0.5, '#64748b')
      stoneG.addColorStop(1, '#3b4252')
      ctx.fillStyle = stoneG
      ctx.beginPath()
      ctx.roundRect(ox - 13, oy - 18, 15, 18, [3, 3, 1.5, 1.5])
      ctx.fill()
      ctx.stroke()

      // Stone masonry courses
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(ox - 12.5, oy - 13.5)
      ctx.lineTo(ox + 1.5, oy - 13.5)
      ctx.moveTo(ox - 8, oy - 18)
      ctx.lineTo(ox - 8, oy - 13.5)
      ctx.moveTo(ox - 3, oy - 18)
      ctx.lineTo(ox - 3, oy - 13.5)
      ctx.stroke()

      // Stone arch border + dark hearth recess
      ctx.fillStyle = '#1a1110'
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(ox - 10.5, oy - 11.5, 10, 10, [5, 5, 1, 1])
      ctx.fill()
      ctx.stroke()

      // Glowing charcoal embers & animated flame tongue
      const glow = 0.82 + Math.sin(t * 10 + obj.tx) * 0.18
      const flickerX = Math.sin(t * 13 + obj.ty) * 0.7
      ctx.fillStyle = '#9a3412'
      ctx.beginPath()
      ctx.roundRect(ox - 9.5, oy - 4.5, 8, 2.6, 1)
      ctx.fill()
      ctx.fillStyle = '#ea580c'
      ctx.beginPath()
      ctx.arc(ox - 5.5, oy - 5.2, 3.6 * glow, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.moveTo(ox - 8, oy - 3.5)
      ctx.quadraticCurveTo(ox - 5.5 + flickerX, oy - 10.5, ox - 3, oy - 3.5)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = `rgba(254, 240, 138, ${glow})`
      ctx.beginPath()
      ctx.arc(ox - 5.5 + flickerX * 0.4, oy - 5.3, 1.8, 0, Math.PI * 2)
      ctx.fill()

      // Oak wood chopping/anvil stump on right
      const woodG = ctx.createLinearGradient(ox + 4, oy - 6, ox + 12, oy)
      woodG.addColorStop(0, '#9a5b2d')
      woodG.addColorStop(1, '#5c3317')
      ctx.fillStyle = woodG
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.1
      ctx.beginPath()
      ctx.roundRect(ox + 4, oy - 6, 8, 6.2, 1.2)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = 'rgba(41, 23, 19, 0.5)'
      ctx.lineWidth = 0.7
      ctx.beginPath()
      ctx.moveTo(ox + 6.5, oy - 5)
      ctx.lineTo(ox + 6.5, oy - 0.5)
      ctx.moveTo(ox + 9.5, oy - 4.5)
      ctx.lineTo(ox + 9.5, oy - 0.5)
      ctx.stroke()

      // Horned iron blacksmith anvil sitting on the oak stump
      const anvilG = ctx.createLinearGradient(ox + 2, oy - 11.5, ox + 14, oy - 6)
      anvilG.addColorStop(0, '#cbd5e1')
      anvilG.addColorStop(0.45, '#64748b')
      anvilG.addColorStop(1, '#334155')
      ctx.fillStyle = anvilG
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(ox + 2.2, oy - 10.2) // tapered horn tip
      ctx.lineTo(ox + 13.2, oy - 10.2) // heel
      ctx.lineTo(ox + 12.2, oy - 8.2)
      ctx.lineTo(ox + 10.6, oy - 8.2)
      ctx.lineTo(ox + 11.4, oy - 5.8) // base foot right
      ctx.lineTo(ox + 4.6, oy - 5.8) // base foot left
      ctx.lineTo(ox + 5.6, oy - 8.4)
      ctx.lineTo(ox + 2.2, oy - 9.4)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Specular anvil face shine + resting smithing hammer
      ctx.fillStyle = 'rgba(248, 250, 252, 0.6)'
      ctx.fillRect(ox + 5.2, oy - 9.8, 6.8, 0.9)
      ctx.strokeStyle = '#78350f'
      ctx.lineWidth = 1.1
      ctx.beginPath()
      ctx.moveTo(ox + 7.5, oy - 10.3)
      ctx.lineTo(ox + 10.8, oy - 12.6)
      ctx.stroke()
      ctx.fillStyle = '#94a3b8'
      ctx.fillRect(ox + 9.8, oy - 13.6, 2.8, 1.8)
      ctx.restore()
      return
    }
    case 'crystal_spire':
    case 'ice_spire': {
      const isIce = obj.kind === 'ice_spire'
      drawSoftShadow(ctx, ox, oy, 10, 4, 0.24)
      const g = ctx.createLinearGradient(ox, oy - 28, ox, oy)
      g.addColorStop(0, isIce ? '#ffffff' : '#e0fbfc')
      g.addColorStop(0.5, isIce ? '#67e8f9' : '#4cc9f0')
      g.addColorStop(1, isIce ? '#0284c7' : '#7209b7')
      ctx.fillStyle = g
      ctx.strokeStyle = '#164e63'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(ox, oy - 28)
      ctx.lineTo(ox + 6, oy - 9)
      ctx.lineTo(ox + 3, oy)
      ctx.lineTo(ox - 4, oy)
      ctx.lineTo(ox - 6, oy - 10)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      return
    }
    case 'magma_brazier': {
      drawSoftShadow(ctx, ox, oy, 10, 4, 0.26)
      ctx.fillStyle = '#334155'
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.roundRect(ox - 7, oy - 11, 14, 10, 2)
      ctx.fill()
      ctx.stroke()
      const f = Math.sin(t * 9 + obj.tx) * 1.2
      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.arc(ox, oy - 14 + f * 0.4, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fef08a'
      ctx.beginPath()
      ctx.arc(ox, oy - 14, 3.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    case 'bench': {
      drawSoftShadow(ctx, ox, oy + 1, 13, 3.8, 0.24)
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.2
      // Wrought-iron legs
      ctx.fillStyle = '#334155'
      ctx.fillRect(ox - 10, oy - 6, 2.5, 6)
      ctx.fillRect(ox + 7.5, oy - 6, 2.5, 6)
      // Carved oak backrest with plank highlights
      ctx.fillStyle = '#a46434'
      ctx.beginPath()
      ctx.roundRect(ox - 11, oy - 13, 22, 6, 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#d4945a'
      ctx.fillRect(ox - 9, oy - 11.5, 18, 1.5)
      // Seat cushion plank
      ctx.fillStyle = '#c47e45'
      ctx.beginPath()
      ctx.roundRect(ox - 12, oy - 7, 24, 4, 1.5)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      return
    }
    default: {
      drawSoftShadow(ctx, ox, oy, Math.min(11, Math.max(5, fallbackSprite.width * 0.34)), 4, 0.25)
      ctx.drawImage(fallbackSprite, Math.round(ox - fallbackSprite.width / 2), Math.round(oy - fallbackSprite.height + 2))
      ctx.restore()
    }
  }
}
