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

import { TOWN_STRUCTURES, type TownStructureSpec } from './map-decor-meta'
export { TOWN_STRUCTURES, type TownStructureSpec }

function drawSoftShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, alpha = 0.28) {
  ctx.save()
  ctx.fillStyle = `rgba(18, 12, 24, ${alpha})`
  ctx.beginPath()
  ctx.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2)
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
            const p = (((t * 0.9 + i * 0.33) % 1) + 1) % 1
            ctx.strokeStyle = `rgba(224, 242, 254, ${(1 - p) * 0.65})`
            ctx.lineWidth = 1.1
            ctx.beginPath()
            ctx.ellipse(cx, baseY - 14, Math.max(0.5, 7 + p * 14), Math.max(0.5, 3.5 + p * 7), 0, 0, Math.PI * 2)
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
    const snowy = map.theme === 'frost' || map.theme === 'snow'
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
          ctx.drawImage(img, cx - dw / 2, baseY - dh + 2, dw, dh)
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
          ctx.drawImage(img, cx - dw / 2, baseY - dh + 1, dw, dh)
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
          ctx.drawImage(img, cx - dw / 2, baseY - dh + 2, dw, dh)
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
    ctx.drawImage(img, ox - dw / 2, oy - dh + 3, dw, dh)
    return
  }

  // Hand-drawn HD Canvas2D renderings for biome-specific objects not in the Town sheet
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'medium'
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
      drawSoftShadow(ctx, ox, oy + 1, 11, 4, 0.28)
      // Stone ring pebbles
      ctx.fillStyle = '#64748b'
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1
      for (const [sx, sy] of [
        [-7, -1], [7, -1], [-4, 1.5], [4, 1.5], [0, 2.2],
      ] as const) {
        ctx.beginPath()
        ctx.ellipse(ox + sx, oy + sy, 2.6, 1.6, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      // Crossed firewood logs
      ctx.fillStyle = '#78350f'
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.1
      ctx.beginPath()
      ctx.roundRect(ox - 7.5, oy - 3.5, 15, 3, 1.2)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.roundRect(ox - 5.5, oy - 5, 11, 2.8, 1.2)
      ctx.fill()
      ctx.stroke()
      // Animated multi-tone flame + spark motes
      const f = Math.sin(t * 11 + obj.tx) * 1.4
      const g = ctx.createRadialGradient(ox, oy - 10, 1, ox, oy - 10, 9)
      g.addColorStop(0, '#fffbeb')
      g.addColorStop(0.5, '#fbbf24')
      g.addColorStop(1, '#ea580c')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(ox - 5.5, oy - 3.5)
      ctx.quadraticCurveTo(ox - 6.5, oy - 12, ox + f, oy - 17.5)
      ctx.quadraticCurveTo(ox + 6.5, oy - 12, ox + 5.5, oy - 3.5)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#fef08a'
      ctx.beginPath()
      ctx.arc(ox + f * 0.4, oy - 7.5, 2.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    case 'torch': {
      drawSoftShadow(ctx, ox, oy + 1, 7, 2.6, 0.25)
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1.15
      ctx.fillStyle = '#475569'
      ctx.fillRect(ox - 2, oy - 18, 4, 18)
      ctx.strokeRect(ox - 2, oy - 18, 4, 18)
      ctx.fillStyle = '#78350f'
      ctx.beginPath()
      ctx.roundRect(ox - 4, oy - 20, 8, 3.5, 1)
      ctx.fill()
      ctx.stroke()
      const fl = Math.sin(t * 10 + obj.tx) * 1.1
      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.moveTo(ox - 4, oy - 19.5)
      ctx.quadraticCurveTo(ox - 4.5, oy - 26, ox + fl, oy - 28.5)
      ctx.quadraticCurveTo(ox + 4.5, oy - 26, ox + 4, oy - 19.5)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#fef08a'
      ctx.beginPath()
      ctx.arc(ox + fl * 0.3, oy - 22.5, 2.2, 0, Math.PI * 2)
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
    case 'colosseum_pillar': {
      const cracked = obj.variant === 1
      drawSoftShadow(ctx, ox, oy + 1, 13, 4.2, 0.28)
      ctx.strokeStyle = '#291f17'
      ctx.lineWidth = 1.2
      // Plinth base
      const baseG = ctx.createLinearGradient(ox - 10, oy - 7, ox + 10, oy)
      baseG.addColorStop(0, '#e5d5b3')
      baseG.addColorStop(0.6, '#cbb68a')
      baseG.addColorStop(1, '#9c865b')
      ctx.fillStyle = baseG
      ctx.beginPath()
      ctx.roundRect(ox - 10, oy - 6, 20, 6.5, 1.5)
      ctx.fill()
      ctx.stroke()
      // Fluted marble shaft
      const colH = cracked ? 21 : 30
      const shaftG = ctx.createLinearGradient(ox - 7, oy - colH, ox + 7, oy - 5)
      shaftG.addColorStop(0, '#f8f2e2')
      shaftG.addColorStop(0.55, '#e7d9ba')
      shaftG.addColorStop(1, '#b6a178')
      ctx.fillStyle = shaftG
      ctx.beginPath()
      if (cracked) {
        ctx.moveTo(ox - 6.5, oy - 5.5)
        ctx.lineTo(ox - 6.5, oy - colH)
        ctx.lineTo(ox - 1, oy - colH - 3)
        ctx.lineTo(ox + 2.5, oy - colH + 2)
        ctx.lineTo(ox + 6.5, oy - colH - 1)
        ctx.lineTo(ox + 6.5, oy - 5.5)
        ctx.closePath()
      } else {
        ctx.roundRect(ox - 6.5, oy - colH, 13, colH - 5.5, 1)
      }
      ctx.fill()
      ctx.stroke()
      // Fluting lines
      ctx.strokeStyle = 'rgba(120, 98, 62, 0.45)'
      ctx.lineWidth = 0.85
      for (const fx of [-3.2, 0, 3.2]) {
        ctx.beginPath()
        ctx.moveTo(ox + fx, oy - colH + 3)
        ctx.lineTo(ox + fx, oy - 7)
        ctx.stroke()
      }
      if (!cracked) {
        // Golden Corinthian capital
        ctx.fillStyle = '#eab308'
        ctx.strokeStyle = '#422006'
        ctx.lineWidth = 1.15
        ctx.beginPath()
        ctx.roundRect(ox - 9.5, oy - colH - 5, 19, 5.5, 1.5)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#fef08a'
        ctx.fillRect(ox - 7.5, oy - colH - 4, 15, 1.4)
      } else {
        // Fallen masonry rubble beside cracked column
        ctx.fillStyle = '#cbb68a'
        ctx.strokeStyle = '#291f17'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(ox + 6, oy - 4, 6, 4.2, 1.2)
        ctx.fill()
        ctx.stroke()
      }
      ctx.restore()
      return
    }
    case 'ruin_pillar': {
      drawSoftShadow(ctx, ox, oy + 1, 12, 4, 0.28)
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1.2
      // Stone pedestal
      ctx.fillStyle = '#64748b'
      ctx.beginPath()
      ctx.roundRect(ox - 9, oy - 5.5, 18, 5.8, 1.5)
      ctx.fill()
      ctx.stroke()
      // Broken carved column
      const rpG = ctx.createLinearGradient(ox - 6, oy - 24, ox + 6, oy - 5)
      rpG.addColorStop(0, '#cbd5e1')
      rpG.addColorStop(0.6, '#94a3b8')
      rpG.addColorStop(1, '#475569')
      ctx.fillStyle = rpG
      ctx.beginPath()
      ctx.moveTo(ox - 6, oy - 5)
      ctx.lineTo(ox - 6, oy - 23)
      ctx.lineTo(ox - 1, oy - 26)
      ctx.lineTo(ox + 2.5, oy - 21)
      ctx.lineTo(ox + 6, oy - 24)
      ctx.lineTo(ox + 6, oy - 5)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // Glowing carved rune glyph
      const runeGlow = 0.65 + Math.sin(t * 3 + obj.tx) * 0.25
      ctx.strokeStyle = `rgba(56, 189, 248, ${runeGlow})`
      ctx.lineWidth = 1.1
      ctx.beginPath()
      ctx.moveTo(ox - 1.5, oy - 18)
      ctx.lineTo(ox + 1.5, oy - 15)
      ctx.lineTo(ox - 1.5, oy - 12)
      ctx.stroke()
      // Clinging emerald moss patches
      ctx.fillStyle = '#4d7c0f'
      ctx.beginPath()
      ctx.arc(ox - 4, oy - 8, 3.2, 0, Math.PI * 2)
      ctx.arc(ox + 4.5, oy - 17, 2.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    case 'tent': {
      drawSoftShadow(ctx, ox, oy + 1, 18, 5.5, 0.3)
      const v = obj.variant ?? 0
      const mainA = v === 2 ? '#b91c1c' : v === 1 ? '#15803d' : '#c2854c'
      const mainB = v === 2 ? '#7f1d1d' : v === 1 ? '#14532d' : '#925b2a'
      const stripe = v === 2 ? '#f59e0b' : v === 1 ? '#fef3c7' : '#fef3c7'
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.25
      // Guy ropes & wooden stakes
      ctx.strokeStyle = '#78350f'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(ox - 14, oy - 6)
      ctx.lineTo(ox - 17, oy)
      ctx.moveTo(ox + 14, oy - 6)
      ctx.lineTo(ox + 17, oy)
      ctx.stroke()
      // Canvas pavilion roof & walls
      const tentG = ctx.createLinearGradient(ox - 15, oy - 24, ox + 15, oy)
      tentG.addColorStop(0, mainA)
      tentG.addColorStop(1, mainB)
      ctx.fillStyle = tentG
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.25
      ctx.beginPath()
      ctx.moveTo(ox, oy - 25)
      ctx.quadraticCurveTo(ox + 12, oy - 14, ox + 15.5, oy - 1)
      ctx.lineTo(ox - 15.5, oy - 1)
      ctx.quadraticCurveTo(ox - 12, oy - 14, ox, oy - 25)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // Decorative center stripe & trim
      ctx.fillStyle = stripe
      ctx.beginPath()
      ctx.moveTo(ox, oy - 25)
      ctx.lineTo(ox + 5, oy - 11)
      ctx.lineTo(ox - 5, oy - 11)
      ctx.closePath()
      ctx.fill()
      // Open dark entrance flap
      ctx.fillStyle = '#1e1b24'
      ctx.beginPath()
      ctx.moveTo(ox, oy - 13)
      ctx.lineTo(ox + 5.5, oy - 1)
      ctx.lineTo(ox - 5.5, oy - 1)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // Gold finial pole & pennant
      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      ctx.arc(ox, oy - 26.5, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    case 'skull_pile': {
      drawSoftShadow(ctx, ox, oy + 1, 11, 3.8, 0.28)
      ctx.strokeStyle = '#292524'
      ctx.lineWidth = 1.1
      // Crossed femurs underneath
      ctx.fillStyle = '#d6d3d1'
      ctx.beginPath()
      ctx.roundRect(ox - 9, oy - 4, 18, 3, 1.5)
      ctx.fill()
      ctx.stroke()
      // Left & right secondary skulls
      for (const [sx, sy, r] of [
        [ox - 4.5, oy - 5.5, 4.2],
        [ox + 4.5, oy - 5.2, 4],
      ] as const) {
        ctx.fillStyle = '#e7e5e4'
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      // Crown center skull
      ctx.fillStyle = obj.variant === 1 ? '#fde68a' : '#f5f5f4'
      ctx.beginPath()
      ctx.arc(ox, oy - 9.5, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      // Eye sockets + glowing wisp if variant === 1
      ctx.fillStyle = obj.variant === 1 ? '#a855f7' : '#1c1917'
      ctx.beginPath()
      ctx.arc(ox - 1.8, oy - 9.2, 1.15, 0, Math.PI * 2)
      ctx.arc(ox + 1.8, oy - 9.2, 1.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    case 'totem': {
      drawSoftShadow(ctx, ox, oy + 1, 10, 3.5, 0.28)
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.2
      // Carved timber totem column
      const totG = ctx.createLinearGradient(ox - 5, oy - 28, ox + 5, oy)
      totG.addColorStop(0, '#9a6338')
      totG.addColorStop(1, '#5c3419')
      ctx.fillStyle = totG
      ctx.beginPath()
      ctx.roundRect(ox - 5, oy - 27, 10, 27, 2)
      ctx.fill()
      ctx.stroke()
      // Outstretched carved spirit wings
      ctx.fillStyle = '#d97706'
      ctx.beginPath()
      ctx.moveTo(ox - 5, oy - 22)
      ctx.lineTo(ox - 12, oy - 25)
      ctx.lineTo(ox - 10, oy - 18)
      ctx.lineTo(ox - 5, oy - 17)
      ctx.moveTo(ox + 5, oy - 22)
      ctx.lineTo(ox + 12, oy - 25)
      ctx.lineTo(ox + 10, oy - 18)
      ctx.lineTo(ox + 5, oy - 17)
      ctx.fill()
      ctx.stroke()
      // Glowing painted mask eyes & mouth
      const eyePulse = 0.75 + Math.sin(t * 5 + obj.tx) * 0.25
      ctx.fillStyle = `rgba(239, 68, 68, ${eyePulse})`
      ctx.fillRect(ox - 3.2, oy - 21, 2.2, 1.8)
      ctx.fillRect(ox + 1, oy - 21, 2.2, 1.8)
      ctx.fillStyle = '#fbbf24'
      ctx.fillRect(ox - 2.5, oy - 14, 5, 2)
      ctx.restore()
      return
    }
    case 'dream_shrine': {
      drawSoftShadow(ctx, ox, oy + 1, 17, 5, 0.26)
      ctx.strokeStyle = '#450a0a'
      ctx.lineWidth = 1.25
      // Vermilion torii pillars on stone plinths
      for (const px of [ox - 10, ox + 10]) {
        ctx.fillStyle = '#64748b'
        ctx.fillRect(px - 2.8, oy - 3, 5.6, 3.5)
        ctx.strokeRect(px - 2.8, oy - 3, 5.6, 3.5)
        const pG = ctx.createLinearGradient(px - 2.2, oy - 25, px + 2.2, oy - 3)
        pG.addColorStop(0, '#ef4444')
        pG.addColorStop(1, '#991b1b')
        ctx.fillStyle = pG
        ctx.fillRect(px - 2.2, oy - 25, 4.4, 22)
        ctx.strokeRect(px - 2.2, oy - 25, 4.4, 22)
      }
      // Lower tie beam (nuki)
      ctx.fillStyle = '#dc2626'
      ctx.beginPath()
      ctx.roundRect(ox - 14, oy - 20, 28, 3.2, 1)
      ctx.fill()
      ctx.stroke()
      // Curved upper kasagi lintel + dark slate roof cap
      ctx.fillStyle = '#b91c1c'
      ctx.beginPath()
      ctx.moveTo(ox - 17, oy - 27.5)
      ctx.quadraticCurveTo(ox, oy - 25, ox + 17, oy - 27.5)
      ctx.lineTo(ox + 15, oy - 23.5)
      ctx.quadraticCurveTo(ox, oy - 22, ox - 15, oy - 23.5)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#1e293b'
      ctx.beginPath()
      ctx.moveTo(ox - 18, oy - 28.5)
      ctx.quadraticCurveTo(ox, oy - 26, ox + 18, oy - 28.5)
      ctx.lineTo(ox + 17, oy - 26.5)
      ctx.quadraticCurveTo(ox, oy - 24.5, ox - 17, oy - 26.5)
      ctx.closePath()
      ctx.fill()
      // Gold plaque + hanging paper shide
      ctx.fillStyle = '#facc15'
      ctx.fillRect(ox - 2.5, oy - 23, 5, 4)
      ctx.strokeRect(ox - 2.5, oy - 23, 5, 4)
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(ox - 6, oy - 16.8, 2, 3.2)
      ctx.fillRect(ox + 4, oy - 16.8, 2, 3.2)
      ctx.restore()
      return
    }
    case 'sky_arch': {
      drawSoftShadow(ctx, ox, oy + 1, 18, 5, 0.25)
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 1.2
      const marbG = ctx.createLinearGradient(ox - 14, oy - 30, ox + 14, oy)
      marbG.addColorStop(0, '#ffffff')
      marbG.addColorStop(0.6, '#e2e8f0')
      marbG.addColorStop(1, '#94a3b8')
      ctx.fillStyle = marbG
      ctx.beginPath()
      ctx.roundRect(ox - 14, oy - 24, 5.5, 24, 1.5)
      ctx.roundRect(ox + 8.5, oy - 24, 5.5, 24, 1.5)
      ctx.fill()
      ctx.stroke()
      // Arched celestial bridge lintel
      ctx.beginPath()
      ctx.roundRect(ox - 16.5, oy - 29, 33, 6, 3)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#facc15'
      ctx.fillRect(ox - 13, oy - 27, 26, 2)
      // Hovering sky crystal in archway center
      const hover = Math.sin(t * 3 + obj.tx) * 1.6
      ctx.fillStyle = '#38bdf8'
      ctx.beginPath()
      ctx.moveTo(ox, oy - 21 + hover)
      ctx.lineTo(ox + 3.2, oy - 16 + hover)
      ctx.lineTo(ox, oy - 11 + hover)
      ctx.lineTo(ox - 3.2, oy - 16 + hover)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      return
    }
    case 'scarecrow': {
      drawSoftShadow(ctx, ox, oy + 1, 9, 3, 0.24)
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.15
      ctx.fillStyle = '#78350f'
      ctx.fillRect(ox - 1.5, oy - 20, 3, 20)
      ctx.fillRect(ox - 9, oy - 14, 18, 2.5)
      // Tunic
      ctx.fillStyle = '#2563eb'
      ctx.beginPath()
      ctx.roundRect(ox - 5, oy - 15, 10, 9, 1.5)
      ctx.fill()
      ctx.stroke()
      // Pumpkin / straw head & brimmed hat
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.arc(ox, oy - 19, 4.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#92400e'
      ctx.beginPath()
      ctx.ellipse(ox, oy - 22.5, 7, 2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      return
    }
    case 'mine_cart': {
      drawSoftShadow(ctx, ox, oy + 1, 13, 4, 0.28)
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1.15
      // Ore mound
      ctx.fillStyle = '#475569'
      ctx.beginPath()
      ctx.ellipse(ox, oy - 12, 8.5, 4, 0, Math.PI, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#38bdf8'
      ctx.fillRect(ox - 4, oy - 15, 3, 3)
      ctx.fillStyle = '#facc15'
      ctx.fillRect(ox + 1.5, oy - 14.5, 3.2, 3)
      // Iron cart tub
      ctx.fillStyle = '#64748b'
      ctx.beginPath()
      ctx.moveTo(ox - 11, oy - 12)
      ctx.lineTo(ox + 11, oy - 12)
      ctx.lineTo(ox + 8.5, oy - 3.5)
      ctx.lineTo(ox - 8.5, oy - 3.5)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // Iron wheels
      for (const wx of [ox - 6, ox + 6]) {
        ctx.fillStyle = '#1e293b'
        ctx.beginPath()
        ctx.arc(wx, oy - 2, 2.8, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      ctx.restore()
      return
    }
    case 'ballista_turret': {
      drawSoftShadow(ctx, ox, oy + 1, 15, 4.8, 0.3)
      const faceRight = (obj.variant ?? 0) % 2 === 0 ? 1 : -1
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.2
      // Heavy timber base & iron pivot
      const woodG = ctx.createLinearGradient(ox - 12, oy - 12, ox + 12, oy)
      woodG.addColorStop(0, '#b47844')
      woodG.addColorStop(1, '#6b3e1e')
      ctx.fillStyle = woodG
      ctx.beginPath()
      ctx.roundRect(ox - 11, oy - 7, 22, 6.5, 2)
      ctx.fill()
      ctx.stroke()
      // Wheels
      for (const wx of [ox - 7.5, ox + 7.5]) {
        ctx.fillStyle = '#451a03'
        ctx.beginPath()
        ctx.arc(wx, oy - 1.5, 3.3, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      // Support pedestal & crossbow rail
      ctx.fillStyle = '#78350f'
      ctx.fillRect(ox - 3, oy - 15, 6, 9)
      ctx.strokeRect(ox - 3, oy - 15, 6, 9)
      ctx.fillStyle = '#92400e'
      ctx.beginPath()
      ctx.roundRect(ox - 10, oy - 18, 20, 4, 1.5)
      ctx.fill()
      ctx.stroke()
      // Steel torsion bow arms
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(ox + faceRight * 6, oy - 23)
      ctx.quadraticCurveTo(ox + faceRight * 12, oy - 16, ox + faceRight * 6, oy - 9)
      ctx.stroke()
      // Loaded heavy iron bolt
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(ox - faceRight * 7, oy - 16)
      ctx.lineTo(ox + faceRight * 13, oy - 16)
      ctx.stroke()
      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      ctx.moveTo(ox + faceRight * 15, oy - 16)
      ctx.lineTo(ox + faceRight * 10, oy - 18.5)
      ctx.lineTo(ox + faceRight * 10, oy - 13.5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      return
    }
    case 'palisade': {
      drawSoftShadow(ctx, ox, oy + 1, 14, 4, 0.28)
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.15
      // Five sharpened defense stakes
      for (const sx of [-10, -5, 0, 5, 10]) {
        const h = 18 + (Math.abs(sx) % 4)
        const sG = ctx.createLinearGradient(ox + sx - 2, oy - h, ox + sx + 2, oy)
        sG.addColorStop(0, '#c2854c')
        sG.addColorStop(1, '#6b3e1e')
        ctx.fillStyle = sG
        ctx.beginPath()
        ctx.moveTo(ox + sx - 2.3, oy)
        ctx.lineTo(ox + sx - 2.3, oy - h + 4)
        ctx.lineTo(ox + sx, oy - h)
        ctx.lineTo(ox + sx + 2.3, oy - h + 4)
        ctx.lineTo(ox + sx + 2.3, oy)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
      // Cross timber brace & iron rivets
      ctx.fillStyle = '#5c3317'
      ctx.beginPath()
      ctx.roundRect(ox - 13, oy - 10, 26, 3.5, 1)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      return
    }
    case 'weapon_rack': {
      drawSoftShadow(ctx, ox, oy + 1, 13, 4, 0.26)
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.15
      // Timber frame
      ctx.fillStyle = '#78350f'
      ctx.fillRect(ox - 10, oy - 22, 2.8, 22)
      ctx.strokeRect(ox - 10, oy - 22, 2.8, 22)
      ctx.fillRect(ox + 7.2, oy - 22, 2.8, 22)
      ctx.strokeRect(ox + 7.2, oy - 22, 2.8, 22)
      ctx.fillStyle = '#9a5b2d'
      ctx.fillRect(ox - 11.5, oy - 21, 23, 2.8)
      ctx.strokeRect(ox - 11.5, oy - 21, 23, 2.8)
      ctx.fillRect(ox - 11, oy - 4, 22, 3)
      ctx.strokeRect(ox - 11, oy - 4, 22, 3)
      // Mounted gleaming swords, spear & round shield
      for (const [wx, bladeCol] of [
        [ox - 4.5, '#e2e8f0'],
        [ox, '#bae6fd'],
        [ox + 4.5, '#fde68a'],
      ] as const) {
        ctx.fillStyle = bladeCol
        ctx.fillRect(wx - 1, oy - 24, 2, 18)
        ctx.fillStyle = '#f59e0b'
        ctx.fillRect(wx - 2.6, oy - 18, 5.2, 1.8)
      }
      if ((obj.variant ?? 0) % 2 === 1) {
        ctx.fillStyle = '#b91c1c'
        ctx.strokeStyle = '#facc15'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.arc(ox + 5, oy - 11, 4.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      ctx.restore()
      return
    }
    case 'war_drum': {
      drawSoftShadow(ctx, ox, oy + 1, 11, 4, 0.28)
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.2
      // Timber stand legs
      ctx.fillStyle = '#5c3317'
      ctx.fillRect(ox - 8, oy - 7, 3, 7)
      ctx.fillRect(ox + 5, oy - 7, 3, 7)
      // Crimson lacquered drum body
      const drumG = ctx.createLinearGradient(ox - 9, oy - 19, ox + 9, oy - 5)
      drumG.addColorStop(0, '#ef4444')
      drumG.addColorStop(0.5, '#b91c1c')
      drumG.addColorStop(1, '#7f1d1d')
      ctx.fillStyle = drumG
      ctx.beginPath()
      ctx.roundRect(ox - 8.5, oy - 19, 17, 13.5, 4)
      ctx.fill()
      ctx.stroke()
      // Gold rings & parchment drumhead
      ctx.fillStyle = '#facc15'
      ctx.fillRect(ox - 8.8, oy - 16, 17.6, 1.8)
      ctx.fillRect(ox - 8.8, oy - 9.5, 17.6, 1.8)
      ctx.fillStyle = '#fef3c7'
      ctx.beginPath()
      ctx.ellipse(ox, oy - 19, 7.5, 3, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      // Crossed drumsticks resting on top
      ctx.strokeStyle = '#d97706'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.moveTo(ox - 5, oy - 21)
      ctx.lineTo(ox + 5, oy - 18)
      ctx.stroke()
      ctx.restore()
      return
    }
    case 'war_standard': {
      drawSoftShadow(ctx, ox, oy + 1, 9, 3.5, 0.26)
      const v = obj.variant ?? 0
      const flagA = v === 1 ? '#ef4444' : v === 2 ? '#a855f7' : '#3b82f6'
      const flagB = v === 1 ? '#991b1b' : v === 2 ? '#6b21a8' : '#1d4ed8'
      const wave = Math.sin(t * 5.5 + obj.tx * 0.9) * 2.2
      // Stone base + steel spear pole
      ctx.fillStyle = '#475569'
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.roundRect(ox - 5, oy - 4, 10, 4.5, 1.5)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#cbd5e1'
      ctx.fillRect(ox - 1.3, oy - 34, 2.6, 30)
      ctx.strokeRect(ox - 1.3, oy - 34, 2.6, 30)
      // Golden spear tip & crossbar
      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      ctx.moveTo(ox, oy - 39)
      ctx.lineTo(ox + 2.5, oy - 34)
      ctx.lineTo(ox - 2.5, oy - 34)
      ctx.closePath()
      ctx.fill()
      ctx.fillRect(ox - 6, oy - 31, 12, 2)
      // Billowing pennant banner
      const flG = ctx.createLinearGradient(ox, oy - 30, ox + 12, oy - 11)
      flG.addColorStop(0, flagA)
      flG.addColorStop(1, flagB)
      ctx.fillStyle = flG
      ctx.beginPath()
      ctx.moveTo(ox - 5, oy - 29.5)
      ctx.lineTo(ox + 6 + wave * 0.4, oy - 29.5)
      ctx.quadraticCurveTo(ox + 7 + wave, oy - 19, ox + 5 + wave * 0.5, oy - 11)
      ctx.lineTo(ox + 0.5 + wave * 0.3, oy - 14.5)
      ctx.lineTo(ox - 4.5 + wave * 0.2, oy - 11)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // Gold crest diamond
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.moveTo(ox + 0.5 + wave * 0.3, oy - 25)
      ctx.lineTo(ox + 3 + wave * 0.3, oy - 21.5)
      ctx.lineTo(ox + 0.5 + wave * 0.3, oy - 18)
      ctx.lineTo(ox - 2 + wave * 0.3, oy - 21.5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      return
    }
    case 'sword_monument': {
      drawSoftShadow(ctx, ox, oy + 1, 14, 4.5, 0.3)
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1.2
      // Two-tier carved stone dais
      ctx.fillStyle = '#64748b'
      ctx.beginPath()
      ctx.roundRect(ox - 12, oy - 6, 24, 6.5, 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#94a3b8'
      ctx.beginPath()
      ctx.roundRect(ox - 9, oy - 10, 18, 4.5, 1.5)
      ctx.fill()
      ctx.stroke()
      // Giant gleaming greatsword embedded into the stone
      const bladeG = ctx.createLinearGradient(ox - 3, oy - 35, ox + 3, oy - 9)
      bladeG.addColorStop(0, '#f0f9ff')
      bladeG.addColorStop(0.5, '#bae6fd')
      bladeG.addColorStop(1, '#64748b')
      ctx.fillStyle = bladeG
      ctx.beginPath()
      ctx.moveTo(ox - 3, oy - 9.5)
      ctx.lineTo(ox - 2.6, oy - 27)
      ctx.lineTo(ox + 2.6, oy - 27)
      ctx.lineTo(ox + 3, oy - 9.5)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // Golden crossguard & glowing hilt gem
      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      ctx.moveTo(ox - 8.5, oy - 27.5)
      ctx.lineTo(ox + 8.5, oy - 27.5)
      ctx.lineTo(ox + 6, oy - 24.5)
      ctx.lineTo(ox - 6, oy - 24.5)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#1e3a8a'
      ctx.fillRect(ox - 1.5, oy - 34, 3, 6.5)
      ctx.strokeRect(ox - 1.5, oy - 34, 3, 6.5)
      ctx.fillStyle = '#38bdf8'
      ctx.beginPath()
      ctx.arc(ox, oy - 35.5, 2.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      return
    }
    case 'obelisk': {
      drawSoftShadow(ctx, ox, oy + 1, 13, 4.2, 0.3)
      const isViolet = obj.variant === 1
      const runeColor = isViolet ? '#e879f9' : '#38bdf8'
      const pulse = 0.72 + Math.sin(t * 3.8 + obj.tx) * 0.28
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1.2
      // Basalt base plinth
      ctx.fillStyle = '#1e293b'
      ctx.beginPath()
      ctx.roundRect(ox - 10, oy - 6, 20, 6.5, 1.5)
      ctx.fill()
      ctx.stroke()
      // Tapered obsidian monolith shaft
      const obG = ctx.createLinearGradient(ox - 6, oy - 29, ox + 6, oy - 5)
      obG.addColorStop(0, '#64748b')
      obG.addColorStop(0.5, '#334155')
      obG.addColorStop(1, '#1e293b')
      ctx.fillStyle = obG
      ctx.beginPath()
      ctx.moveTo(ox - 6.5, oy - 5.5)
      ctx.lineTo(ox - 4, oy - 28)
      ctx.lineTo(ox + 4, oy - 28)
      ctx.lineTo(ox + 6.5, oy - 5.5)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // Glowing carved vertical rune glyphs
      ctx.strokeStyle = runeColor
      ctx.globalAlpha = pulse
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.moveTo(ox, oy - 24)
      ctx.lineTo(ox, oy - 10)
      ctx.moveTo(ox - 2.5, oy - 20)
      ctx.lineTo(ox + 2.5, oy - 17)
      ctx.moveTo(ox + 2.5, oy - 14)
      ctx.lineTo(ox - 2.5, oy - 11)
      ctx.stroke()
      ctx.globalAlpha = 1
      // Hovering pyramidion capstone
      const hover = Math.sin(t * 2.8 + obj.ty) * 1.6
      ctx.fillStyle = runeColor
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1.1
      ctx.beginPath()
      ctx.moveTo(ox, oy - 38 + hover)
      ctx.lineTo(ox + 4.5, oy - 30.5 + hover)
      ctx.lineTo(ox - 4.5, oy - 30.5 + hover)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      return
    }
    case 'palm_tree': {
      drawSoftShadow(ctx, ox, oy + 1, 16, 5, 0.26)
      const lean = (obj.variant ?? 0) % 2 === 0 ? 1 : -1
      const sway = Math.sin(t * 2.2 + obj.tx) * 1.4
      const topX = ox + lean * 3.5 + sway
      const topY = oy - 31
      // Curved segmented palm trunk
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.2
      ctx.fillStyle = '#9a6338'
      ctx.beginPath()
      ctx.moveTo(ox - 3.6, oy + 1)
      ctx.quadraticCurveTo(ox + lean * 2, oy - 15, topX - 2, topY)
      ctx.lineTo(topX + 2, topY)
      ctx.quadraticCurveTo(ox + lean * 3.5 + 3, oy - 15, ox + 3.6, oy + 1)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // Coconuts cluster under crown
      ctx.fillStyle = '#5c3317'
      for (const [cx, cy] of [
        [topX - 2.2, topY + 2],
        [topX + 2.2, topY + 2],
        [topX, topY + 3.5],
      ] as const) {
        ctx.beginPath()
        ctx.arc(cx, cy, 2, 0, Math.PI * 2)
        ctx.fill()
      }
      // Lush arching tropical fronds
      const fronds: ReadonlyArray<readonly [number, number, number, number, string]> = [
        [-14, 4, -8, -5, '#15803d'],
        [14, 4, 8, -5, '#15803d'],
        [-13, -6, -6, -9, '#16a34a'],
        [13, -6, 6, -9, '#16a34a'],
        [-5, -10, -2, -8, '#22c55e'],
        [6, -10, 2, -8, '#4ade80'],
      ]
      for (const [dx, dy, cx, cy, col] of fronds) {
        ctx.fillStyle = col
        ctx.strokeStyle = '#14532d'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(topX, topY)
        ctx.quadraticCurveTo(topX + cx, topY + cy, topX + dx + sway * 0.5, topY + dy)
        ctx.quadraticCurveTo(topX + cx * 0.7, topY + cy + 4, topX, topY + 1.5)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
      ctx.restore()
      return
    }
    case 'shipwreck': {
      drawSoftShadow(ctx, ox, oy + 1, 20, 6.5, 0.3)
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.25
      // Broken angled wooden hull half-buried in sand
      const hullG = ctx.createLinearGradient(ox - 18, oy - 14, ox + 18, oy)
      hullG.addColorStop(0, '#9a6338')
      hullG.addColorStop(0.6, '#6b3e1e')
      hullG.addColorStop(1, '#3b2110')
      ctx.fillStyle = hullG
      ctx.beginPath()
      ctx.moveTo(ox - 18, oy - 9)
      ctx.lineTo(ox - 4, oy - 6)
      ctx.lineTo(ox + 17, oy - 13)
      ctx.lineTo(ox + 13, oy - 1)
      ctx.lineTo(ox - 14, oy)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // Deck ribs
      ctx.strokeStyle = '#451a03'
      ctx.lineWidth = 1
      for (const rx of [-10, -3, 4, 10]) {
        ctx.beginPath()
        ctx.moveTo(ox + rx, oy - 8)
        ctx.lineTo(ox + rx - 1.5, oy - 1)
        ctx.stroke()
      }
      // Snapped mast & tattered pirate sail fluttering in the sea breeze
      ctx.fillStyle = '#5c3317'
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.15
      ctx.fillRect(ox - 1, oy - 31, 3, 24)
      ctx.strokeRect(ox - 1, oy - 31, 3, 24)
      ctx.fillRect(ox - 9, oy - 27, 18, 2.2)
      const sailFlutter = Math.sin(t * 4 + obj.tx) * 1.5
      ctx.fillStyle = '#f1f5f9'
      ctx.beginPath()
      ctx.moveTo(ox - 8, oy - 25)
      ctx.lineTo(ox + 8, oy - 25)
      ctx.quadraticCurveTo(ox + 10 + sailFlutter, oy - 18, ox + 6, oy - 13)
      ctx.lineTo(ox + 1, oy - 15)
      ctx.lineTo(ox - 6, oy - 12)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      return
    }
    case 'anchor_post': {
      drawSoftShadow(ctx, ox, oy + 1, 10, 3.5, 0.26)
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1.2
      // Wooden harbor mooring bollard + coiled rope
      ctx.fillStyle = '#78350f'
      ctx.beginPath()
      ctx.roundRect(ox - 4, oy - 15, 8, 15, 2)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = '#d97706'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.ellipse(ox, oy - 3.5, 6.2, 2.4, 0, 0, Math.PI * 2)
      ctx.stroke()
      // Heavy iron ship anchor leaning against post
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(ox + 4, oy - 18)
      ctx.lineTo(ox + 4, oy - 3)
      ctx.moveTo(ox + 1, oy - 15)
      ctx.lineTo(ox + 7, oy - 15)
      ctx.moveTo(ox - 1, oy - 6)
      ctx.quadraticCurveTo(ox + 4, oy, ox + 9, oy - 6)
      ctx.stroke()
      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      ctx.arc(ox + 4, oy - 19, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    case 'treasure_altar': {
      drawSoftShadow(ctx, ox, oy + 1, 16, 5, 0.3)
      ctx.strokeStyle = '#422006'
      ctx.lineWidth = 1.2
      // Carved sandstone pedestal steps
      ctx.fillStyle = '#94a3b8'
      ctx.beginPath()
      ctx.roundRect(ox - 14, oy - 5.5, 28, 6, 2)
      ctx.fill()
      ctx.stroke()
      const goldPed = ctx.createLinearGradient(ox - 10, oy - 17, ox + 10, oy - 5)
      goldPed.addColorStop(0, '#fde047')
      goldPed.addColorStop(0.5, '#eab308')
      goldPed.addColorStop(1, '#a16207')
      ctx.fillStyle = goldPed
      ctx.beginPath()
      ctx.roundRect(ox - 9.5, oy - 16, 19, 11, 2)
      ctx.fill()
      ctx.stroke()
      // Floating glowing Sun Idol & crimson ruby core
      const hover = Math.sin(t * 3.5) * 1.4
      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      ctx.arc(ox, oy - 24 + hover, 6.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.moveTo(ox, oy - 27 + hover)
      ctx.lineTo(ox + 3, oy - 24 + hover)
      ctx.lineTo(ox, oy - 21 + hover)
      ctx.lineTo(ox - 3, oy - 24 + hover)
      ctx.closePath()
      ctx.fill()
      // Scattered gold coins around pedestal
      ctx.fillStyle = '#fde047'
      for (const [cx, cy] of [
        [ox - 12, oy - 1],
        [ox + 11, oy - 1.5],
        [ox - 6, oy + 0.5],
        [ox + 7, oy + 0.5],
      ] as const) {
        ctx.beginPath()
        ctx.ellipse(cx, cy, 2, 1.2, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      return
    }
    case 'wooden_boat': {
      const bob = Math.sin(t * 2.6 + obj.tx * 0.8) * 1.4
      const flip = (obj.variant ?? 0) % 2 === 0 ? 1 : -1
      // Gentle concentric water ripple ring
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.45)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(ox, oy - 1, 16, 6, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.2
      // Wooden hull
      const boatG = ctx.createLinearGradient(ox - 14, oy - 10 + bob, ox + 14, oy + bob)
      boatG.addColorStop(0, '#c2854c')
      boatG.addColorStop(1, '#78350f')
      ctx.fillStyle = boatG
      ctx.beginPath()
      ctx.moveTo(ox - 14 * flip, oy - 7 + bob)
      ctx.quadraticCurveTo(ox, oy - 3 + bob, ox + 15 * flip, oy - 8 + bob)
      ctx.quadraticCurveTo(ox + 10 * flip, oy + 1 + bob, ox - 11 * flip, oy + bob)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // Inner bench & wooden oars
      ctx.fillStyle = '#fde68a'
      ctx.fillRect(ox - 5, oy - 6 + bob, 10, 2)
      ctx.strokeStyle = '#92400e'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(ox - 3, oy - 6 + bob)
      ctx.lineTo(ox - 8, oy + 2 + bob)
      ctx.moveTo(ox + 3, oy - 6 + bob)
      ctx.lineTo(ox + 8, oy + 2 + bob)
      ctx.stroke()
      // Small warm bow lantern
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.arc(ox + 11 * flip, oy - 9.5 + bob, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    case 'lantern_float': {
      const bob = Math.sin(t * 3.1 + obj.tx + obj.ty) * 1.2
      // Soft water reflection ripple
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(ox, oy - 1, 9, 4, 0, 0, Math.PI * 2)
      ctx.stroke()
      // Floating lotus wood raft
      ctx.fillStyle = '#78350f'
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(ox, oy - 3 + bob, 6.5, 2.8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      // Glowing paper lantern box + vermilion cap
      const lanG = ctx.createRadialGradient(ox, oy - 7 + bob, 0.5, ox, oy - 7 + bob, 5)
      lanG.addColorStop(0, '#fef9c3')
      lanG.addColorStop(1, '#f59e0b')
      ctx.fillStyle = lanG
      ctx.fillRect(ox - 3.5, oy - 10.5 + bob, 7, 7)
      ctx.strokeRect(ox - 3.5, oy - 10.5 + bob, 7, 7)
      ctx.fillStyle = '#dc2626'
      ctx.beginPath()
      ctx.moveTo(ox, oy - 13.5 + bob)
      ctx.lineTo(ox + 5, oy - 10.5 + bob)
      ctx.lineTo(ox - 5, oy - 10.5 + bob)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      return
    }
    case 'lotus_lily': {
      const bob = Math.sin(t * 2.3 + obj.tx) * 0.7
      // Emerald lily pads
      ctx.fillStyle = '#15803d'
      ctx.strokeStyle = '#052e16'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(ox - 2.5, oy - 3 + bob, 6.5, 3.6, -0.15, 0.25, Math.PI * 2)
      ctx.lineTo(ox - 2.5, oy - 3 + bob)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.ellipse(ox + 4.5, oy - 1.5 + bob, 4.5, 2.6, 0.2, 0, Math.PI * 1.85)
      ctx.fill()
      ctx.stroke()
      // Blooming pink or golden lotus flower
      const isGold = (obj.variant ?? 0) % 2 === 1
      ctx.fillStyle = isGold ? '#facc15' : '#f472b6'
      ctx.strokeStyle = isGold ? '#854d0e' : '#831843'
      ctx.lineWidth = 0.9
      for (const [px, py] of [
        [ox - 4.5, oy - 5.5 + bob],
        [ox - 0.5, oy - 5.5 + bob],
        [ox - 2.5, oy - 7.5 + bob],
      ] as const) {
        ctx.beginPath()
        ctx.ellipse(px, py, 2.4, 3.2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      ctx.fillStyle = '#fef9c3'
      ctx.beginPath()
      ctx.arc(ox - 2.5, oy - 5.5 + bob, 1.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    case 'fish_rack': {
      drawSoftShadow(ctx, ox, oy + 1, 13, 4, 0.26)
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.15
      // Bamboo A-frame drying rack
      ctx.fillStyle = '#b47844'
      ctx.fillRect(ox - 10, oy - 21, 2.5, 21)
      ctx.strokeRect(ox - 10, oy - 21, 2.5, 21)
      ctx.fillRect(ox + 7.5, oy - 21, 2.5, 21)
      ctx.strokeRect(ox + 7.5, oy - 21, 2.5, 21)
      ctx.fillStyle = '#d4945a'
      ctx.fillRect(ox - 11.5, oy - 19.5, 23, 2.6)
      ctx.strokeRect(ox - 11.5, oy - 19.5, 23, 2.6)
      // Hung silver & golden trophy fish swaying slightly
      const sway = Math.sin(t * 3 + obj.tx) * 0.7
      for (const [fx, col] of [
        [ox - 4.5, '#7dd3fc'],
        [ox + 0.5, '#fde047'],
        [ox + 5, '#38bdf8'],
      ] as const) {
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.ellipse(fx + sway, oy - 12, 2.2, 5, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      // Woven fish basket at base
      ctx.fillStyle = '#c2854c'
      ctx.beginPath()
      ctx.roundRect(ox - 5, oy - 5, 10, 5, 1.5)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      return
    }
    case 'lamp_post': {
      drawSoftShadow(ctx, ox, oy + 1, 7.5, 3, 0.26)
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1.15
      ctx.fillStyle = '#334155'
      ctx.beginPath()
      ctx.roundRect(ox - 4.5, oy - 3.5, 9, 3.8, 1)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#475569'
      ctx.fillRect(ox - 1.6, oy - 24, 3.2, 21)
      ctx.strokeRect(ox - 1.6, oy - 24, 3.2, 21)
      // Iron lantern cage + warm glowing flame
      const pulse = 0.85 + Math.sin(t * 7 + obj.tx) * 0.15
      ctx.fillStyle = `rgba(253, 224, 71, ${pulse})`
      ctx.beginPath()
      ctx.roundRect(ox - 4.2, oy - 30.5, 8.4, 7, 1.5)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#fef9c3'
      ctx.fillRect(ox - 2, oy - 29, 4, 4)
      ctx.fillStyle = '#1e293b'
      ctx.beginPath()
      ctx.moveTo(ox, oy - 34)
      ctx.lineTo(ox + 5.5, oy - 30)
      ctx.lineTo(ox - 5.5, oy - 30)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      return
    }
    case 'guild_banner': {
      drawSoftShadow(ctx, ox, oy + 1, 8, 3, 0.25)
      const isViolet = (obj.variant ?? 0) % 2 === 1
      const wave = Math.sin(t * 4.5 + obj.tx) * 1.4
      ctx.strokeStyle = '#1e1b24'
      ctx.lineWidth = 1.15
      ctx.fillStyle = '#94a3b8'
      ctx.fillRect(ox - 1.3, oy - 29, 2.6, 29)
      ctx.strokeRect(ox - 1.3, oy - 29, 2.6, 29)
      ctx.fillStyle = '#facc15'
      ctx.fillRect(ox - 6.5, oy - 26, 13, 2)
      ctx.fillStyle = isViolet ? '#7e22ce' : '#dc2626'
      ctx.beginPath()
      ctx.moveTo(ox - 5.5, oy - 24.5)
      ctx.lineTo(ox + 5.5, oy - 24.5)
      ctx.lineTo(ox + 5 + wave * 0.5, oy - 8)
      ctx.lineTo(ox + wave * 0.3, oy - 11.5)
      ctx.lineTo(ox - 5 + wave * 0.4, oy - 8)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#fde047'
      ctx.fillRect(ox - 1.5 + wave * 0.2, oy - 20, 3, 5)
      ctx.restore()
      return
    }
    case 'chest_decor': {
      drawSoftShadow(ctx, ox, oy + 1, 11, 3.8, 0.28)
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.15
      const cG = ctx.createLinearGradient(ox - 8, oy - 12, ox + 8, oy)
      cG.addColorStop(0, '#c2854c')
      cG.addColorStop(1, '#78350f')
      ctx.fillStyle = cG
      ctx.beginPath()
      ctx.roundRect(ox - 8.5, oy - 12, 17, 12, 2.5)
      ctx.fill()
      ctx.stroke()
      // Gold straps & clasp
      ctx.fillStyle = '#eab308'
      ctx.fillRect(ox - 8.5, oy - 7.5, 17, 2)
      ctx.fillRect(ox - 6.5, oy - 12, 2, 12)
      ctx.fillRect(ox + 4.5, oy - 12, 2, 12)
      ctx.fillStyle = '#fde047'
      ctx.fillRect(ox - 1.8, oy - 8.5, 3.6, 4.2)
      ctx.strokeRect(ox - 1.8, oy - 8.5, 3.6, 4.2)
      ctx.restore()
      return
    }
    case 'barrel_cluster': {
      drawSoftShadow(ctx, ox, oy + 1, 13, 4.2, 0.28)
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.15
      for (const [bx, by, w, h] of [
        [ox - 5, oy - 13, 9, 13],
        [ox + 4, oy - 11, 9, 11],
      ] as const) {
        const bG = ctx.createLinearGradient(bx - 4, by, bx + 5, by)
        bG.addColorStop(0, '#b47844')
        bG.addColorStop(1, '#6b3e1e')
        ctx.fillStyle = bG
        ctx.beginPath()
        ctx.roundRect(bx - w / 2, by, w, h, 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#475569'
        ctx.fillRect(bx - w / 2, by + 2.5, w, 1.6)
        ctx.fillRect(bx - w / 2, by + h - 3.8, w, 1.6)
      }
      ctx.restore()
      return
    }
    case 'flower_cart': {
      drawSoftShadow(ctx, ox, oy + 1, 12, 4, 0.26)
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.15
      // Wooden planter trough
      ctx.fillStyle = '#9a5b2d'
      ctx.beginPath()
      ctx.roundRect(ox - 10, oy - 9, 20, 7.5, 1.8)
      ctx.fill()
      ctx.stroke()
      // Wheels
      for (const wx of [ox - 6, ox + 6]) {
        ctx.fillStyle = '#475569'
        ctx.beginPath()
        ctx.arc(wx, oy - 1.5, 2.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      // Lush flowers
      ctx.fillStyle = '#16a34a'
      ctx.beginPath()
      ctx.roundRect(ox - 9, oy - 12.5, 18, 4.5, 2)
      ctx.fill()
      for (const [fx, fy, col] of [
        [ox - 6, oy - 12, '#f472b6'],
        [ox - 1, oy - 13.5, '#fde047'],
        [ox + 4, oy - 12, '#fb7185'],
        [ox + 7, oy - 11, '#38bdf8'],
      ] as const) {
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(fx, fy, 2.6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      return
    }
    case 'wagon': {
      drawSoftShadow(ctx, ox, oy + 1, 17, 5, 0.28)
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.2
      // Canvas cover hoops
      ctx.fillStyle = '#f1f5f9'
      ctx.beginPath()
      ctx.roundRect(ox - 13, oy - 22, 22, 13, [8, 8, 2, 2])
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = '#cbd5e1'
      ctx.beginPath()
      ctx.moveTo(ox - 5, oy - 21)
      ctx.lineTo(ox - 5, oy - 9)
      ctx.moveTo(ox + 2, oy - 21)
      ctx.lineTo(ox + 2, oy - 9)
      ctx.stroke()
      // Timber wagon bed
      ctx.strokeStyle = '#291713'
      ctx.fillStyle = '#9a5b2d'
      ctx.beginPath()
      ctx.roundRect(ox - 14, oy - 10, 26, 7, 1.5)
      ctx.fill()
      ctx.stroke()
      // Spoked wheels
      for (const wx of [ox - 8.5, ox + 6.5]) {
        ctx.fillStyle = '#5c3317'
        ctx.beginPath()
        ctx.arc(wx, oy - 2.5, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#cbd5e1'
        ctx.beginPath()
        ctx.arc(wx, oy - 2.5, 1.3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      return
    }
    case 'well': {
      drawSoftShadow(ctx, ox, oy + 1, 13, 4.5, 0.28)
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1.15
      ctx.fillStyle = '#94a3b8'
      ctx.beginPath()
      ctx.roundRect(ox - 9, oy - 10, 18, 10, 3)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#38bdf8'
      ctx.beginPath()
      ctx.ellipse(ox, oy - 9, 6.5, 2.2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#78350f'
      ctx.fillRect(ox - 7.5, oy - 21, 2.2, 12)
      ctx.fillRect(ox + 5.3, oy - 21, 2.2, 12)
      ctx.fillStyle = '#b91c1c'
      ctx.beginPath()
      ctx.moveTo(ox, oy - 28)
      ctx.lineTo(ox + 12, oy - 20)
      ctx.lineTo(ox - 12, oy - 20)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      return
    }
    case 'statue': {
      drawSoftShadow(ctx, ox, oy + 1, 12, 4.2, 0.28)
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 1.15
      ctx.fillStyle = '#94a3b8'
      ctx.beginPath()
      ctx.roundRect(ox - 9, oy - 7, 18, 7, 1.5)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#e2e8f0'
      ctx.beginPath()
      ctx.roundRect(ox - 5.5, oy - 22, 11, 15, 2)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(ox, oy - 26, 4.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      // Golden laurel / sword accent
      ctx.fillStyle = '#facc15'
      ctx.fillRect(ox + 5, oy - 24, 2, 14)
      ctx.fillRect(ox + 3, oy - 14, 6, 1.8)
      ctx.restore()
      return
    }
    case 'notice_board': {
      drawSoftShadow(ctx, ox, oy + 1, 12, 3.8, 0.26)
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.15
      ctx.fillStyle = '#5c3317'
      ctx.fillRect(ox - 8, oy - 14, 2.5, 14)
      ctx.fillRect(ox + 5.5, oy - 14, 2.5, 14)
      ctx.fillStyle = '#9a5b2d'
      ctx.beginPath()
      ctx.roundRect(ox - 11, oy - 25, 22, 14, 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#fef3c7'
      ctx.fillRect(ox - 8, oy - 22, 6, 7)
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(ox + 1, oy - 21.5, 7, 6)
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(ox - 5, oy - 22, 1.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    case 'sign_arrow': {
      drawSoftShadow(ctx, ox, oy + 1, 7, 2.6, 0.25)
      ctx.strokeStyle = '#291713'
      ctx.lineWidth = 1.15
      ctx.fillStyle = '#6b3e1e'
      ctx.fillRect(ox - 1.5, oy - 18, 3, 18)
      ctx.strokeRect(ox - 1.5, oy - 18, 3, 18)
      ctx.fillStyle = '#d4945a'
      ctx.beginPath()
      ctx.moveTo(ox - 7, oy - 21)
      ctx.lineTo(ox + 6, oy - 21)
      ctx.lineTo(ox + 10, oy - 17.5)
      ctx.lineTo(ox + 6, oy - 14)
      ctx.lineTo(ox - 7, oy - 14)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
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
