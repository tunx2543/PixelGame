import { T, TILE, type MapDef } from './maps'
import { getHdImage, getHdTileLoadVersion, HD_TILE, preloadTileAssets, type HdAssetKey } from './hd-assets'

// Tiles that represent vertical 3D objects/buildings/trees rendered in the depth-sorted entity & overhead pass.
// On Layer 0 (ground canvas), we paint clean underlying terrain beneath them so characters can walk behind & in front!
export const LAYERED_PROP_TILES = new Set<number>([
  T.TREE,
  T.PINE,
  T.BUSH,
  T.ROCK,
  T.CRYSTAL,
  T.FENCE,
  T.SIGN,
  T.FOUNTAIN,
])

export const TOWN_BUILDING_TILE_MASK = new Set<number>([
  T.WALL,
  T.WINDOW,
  T.DOOR,
  T.ROOF_RED,
  T.ROOF_BLUE,
  T.ROOF_PURPLE,
  T.ROOF_GREEN,
])

function tileRng(seed: number) {
  let a = (seed | 0) + 1
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeHdCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  return { c, ctx }
}

function drawRoundedCobbleStone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  hi: string,
  shadow: string,
  outline = '#3a332d',
) {
  const r = Math.min(6, w * 0.25, h * 0.25)
  ctx.beginPath()
  ctx.roundRect(x + 1, y + 1, w - 2, h - 2, r)
  const g = ctx.createLinearGradient(x, y, x, y + h)
  g.addColorStop(0, hi)
  g.addColorStop(0.55, fill)
  g.addColorStop(1, shadow)
  ctx.fillStyle = g
  ctx.fill()
  ctx.lineWidth = 1.6
  ctx.strokeStyle = outline
  ctx.stroke()

  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(x + r + 1, y + 3)
  ctx.lineTo(x + w - r - 2, y + 3)
  ctx.stroke()
}

function paintProceduralHdTile(
  ctx: CanvasRenderingContext2D,
  tile: number,
  base: number,
  variant: number,
  theme: string,
) {
  const S = HD_TILE
  const rng = tileRng(tile * 997 + variant * 131 + base * 37)

  const paintExtracted = (key: HdAssetKey): boolean => {
    const img = getHdImage(key)
    if (!img) return false
    const pad = Math.min(4, Math.floor(Math.min(img.width, img.height) * 0.04))
    ctx.save()
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'medium'
    ctx.drawImage(img, pad, pad, img.width - pad * 2, img.height - pad * 2, 0, 0, S, S)
    ctx.restore()
    return true
  }

  // Paint hand-drawn base fallback or real extracted tile
  const paintGrass = (dark = false) => {
    if (!dark && paintExtracted('grassPlain')) return
    const g = ctx.createLinearGradient(0, 0, S, S)
    if (dark) {
      g.addColorStop(0, '#3a7a28')
      g.addColorStop(0.5, '#2d6822')
      g.addColorStop(1, '#22531c')
    } else {
      g.addColorStop(0, '#7cc632')
      g.addColorStop(0.55, '#68b226')
      g.addColorStop(1, '#559b1d')
    }
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
    for (let i = 0; i < 18; i++) {
      const gx = rng() * (S - 8) + 4
      const gy = rng() * (S - 8) + 4
      ctx.fillStyle = rng() > 0.45 ? (dark ? '#4b9433' : '#96d845') : dark ? '#204d18' : '#4a8e19'
      ctx.beginPath()
      ctx.ellipse(gx, gy, 3 + rng() * 3.5, 1.8 + rng() * 1.5, rng() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    // Delicate hand-drawn grass blades
    ctx.strokeStyle = dark ? '#58a83e' : '#a7e258'
    ctx.lineWidth = 1.6
    ctx.lineCap = 'round'
    for (let i = 0; i < 6; i++) {
      const bx = 6 + rng() * (S - 12)
      const by = 10 + rng() * (S - 14)
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.quadraticCurveTo(bx - 2, by - 5, bx - 4, by - 7)
      ctx.moveTo(bx + 2, by)
      ctx.quadraticCurveTo(bx + 4, by - 5, bx + 6, by - 6)
      ctx.stroke()
    }
  }

  switch (tile) {
    case T.GRASS: {
      paintGrass(false)
      return
    }
    case T.DARKGRASS: {
      paintGrass(true)
      return
    }
    case T.FLOWER: {
      const fKey: HdAssetKey =
        variant % 3 === 0 ? 'grassFlower1' : variant % 3 === 1 ? 'grassFlower2' : 'grassFlower3'
      if (paintExtracted(fKey)) return
      paintGrass(false)
      const spots = [
        [18, 22],
        [44, 18],
        [32, 44],
        [16, 48],
        [48, 42],
      ]
      for (let i = 0; i < spots.length; i++) {
        const [fx, fy] = spots[i]
        const col = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#ffb5c5' : '#ffe066'
        ctx.fillStyle = '#3d8b26'
        ctx.beginPath()
        ctx.arc(fx, fy + 2, 5.5, 0, Math.PI * 2)
        ctx.fill()
        for (let p = 0; p < 5; p++) {
          const a = (p * Math.PI * 2) / 5
          ctx.fillStyle = col
          ctx.beginPath()
          ctx.arc(fx + Math.cos(a) * 3.5, fy + Math.sin(a) * 3.5, 2.3, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = '#f59e0b'
        ctx.beginPath()
        ctx.arc(fx, fy, 2.1, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }
    case T.PATH: {
      if (paintExtracted(variant % 2 === 0 ? 'dirtGrass' : 'dirtSand')) return
      const g = ctx.createLinearGradient(0, 0, S, S)
      g.addColorStop(0, '#ebd0a2')
      g.addColorStop(0.5, '#dcb67f')
      g.addColorStop(1, '#c99c62')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = rng() > 0.5 ? '#b9894f' : '#f3dfc0'
        ctx.beginPath()
        ctx.ellipse(rng() * S, rng() * S, 2.5 + rng() * 3, 1.8 + rng() * 2, rng() * Math.PI, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }
    case T.SAND: {
      if (paintExtracted('dirtSand')) return
      const g = ctx.createLinearGradient(0, 0, 0, S)
      g.addColorStop(0, '#f4deae')
      g.addColorStop(1, '#dfc085')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
      return
    }
    case T.COBBLESTONE: {
      if (paintExtracted(variant % 2 === 0 ? 'cobbleGrey' : 'cobbleTan')) return
      ctx.fillStyle = '#5c5550'
      ctx.fillRect(0, 0, S, S)
      const rows = [
        [0, 0, 22, 16], [22, 0, 20, 16], [42, 0, 22, 16],
        [0, 16, 14, 16], [14, 16, 24, 16], [38, 16, 26, 16],
        [0, 32, 24, 16], [24, 32, 18, 16], [42, 32, 22, 16],
        [0, 48, 18, 16], [18, 48, 24, 16], [42, 48, 22, 16],
      ]
      for (const [rx, ry, rw, rh] of rows) {
        const shadeShift = rng() > 0.5
        drawRoundedCobbleStone(
          ctx,
          rx,
          ry,
          rw,
          rh,
          shadeShift ? '#b2aba4' : '#9c958e',
          shadeShift ? '#ccc5bd' : '#bab2aa',
          '#78716b',
        )
      }
      return
    }
    case T.PLAZA: {
      if (paintExtracted(variant % 2 === 0 ? 'tileTan' : 'slateStone')) return
      ctx.fillStyle = '#6f655c'
      ctx.fillRect(0, 0, S, S)
      for (let py = 0; py < 2; py++) {
        for (let px = 0; px < 2; px++) {
          drawRoundedCobbleStone(ctx, px * 32, py * 32, 32, 32, '#cfc1ae', '#e3d7c6', '#a89a87', '#4f463e')
        }
      }
      return
    }
    case T.GOLD_PAVING: {
      ctx.fillStyle = '#7c5d26'
      ctx.fillRect(0, 0, S, S)
      for (let py = 0; py < 2; py++) {
        for (let px = 0; px < 2; px++) {
          drawRoundedCobbleStone(ctx, px * 32, py * 32, 32, 32, '#eab343', '#fde08d', '#b88321', '#5c4114')
        }
      }
      return
    }
    case T.WATER: {
      if (paintExtracted(variant % 2 === 0 ? 'water1' : 'water2')) return
      const g = ctx.createLinearGradient(0, 0, S, S)
      g.addColorStop(0, '#1e88e5')
      g.addColorStop(0.5, '#1976d2')
      g.addColorStop(1, '#1565c0')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)'
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      for (let i = 0; i < 4; i++) {
        const wy = 10 + i * 15 + (variant % 2) * 3
        const wx = 6 + ((i * 17 + variant * 9) % 20)
        ctx.beginPath()
        ctx.moveTo(wx, wy)
        ctx.quadraticCurveTo(wx + 10, wy - 4, wx + 22, wy)
        ctx.stroke()
      }
      return
    }
    case T.BRIDGE_H:
    case T.BRIDGE_V: {
      if (paintExtracted(tile === T.BRIDGE_V ? 'bridgeWood' : 'bridgeStone')) return
      ctx.fillStyle = '#3f2616'
      ctx.fillRect(0, 0, S, S)
      const count = 4
      for (let i = 0; i < count; i++) {
        if (tile === T.BRIDGE_V) {
          drawRoundedCobbleStone(ctx, 2, i * 16, S - 4, 16, '#b77942', '#d49a5d', '#8c582c', '#452915')
        } else {
          drawRoundedCobbleStone(ctx, i * 16, 2, 16, S - 4, '#b77942', '#d49a5d', '#8c582c', '#452915')
        }
      }
      return
    }
    case T.WOOD_FLOOR: {
      ctx.fillStyle = '#5c3b24'
      ctx.fillRect(0, 0, S, S)
      for (let i = 0; i < 4; i++) {
        drawRoundedCobbleStone(ctx, 0, i * 16, S, 16, i % 2 === 0 ? '#b67d4b' : '#a86f3f', '#cd9460', '#87542b', '#452a16')
      }
      return
    }
    case T.CARPET: {
      const g = ctx.createLinearGradient(0, 0, S, 0)
      g.addColorStop(0, '#9f1239')
      g.addColorStop(0.15, '#e11d48')
      g.addColorStop(0.85, '#be123c')
      g.addColorStop(1, '#881337')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
      ctx.fillStyle = '#fbbf24'
      ctx.fillRect(4, 0, 4, S)
      ctx.fillRect(S - 8, 0, 4, S)
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)'
      ctx.lineWidth = 2
      ctx.strokeRect(12, 6, S - 24, S - 12)
      return
    }
    case T.MAGIC_CIRCLE: {
      paintProceduralHdTile(ctx, T.COBBLESTONE, base, variant, theme)
      ctx.save()
      ctx.strokeStyle = '#c084fc'
      ctx.lineWidth = 2.6
      ctx.beginPath()
      ctx.arc(S / 2, S / 2, S * 0.42, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = '#67e8f9'
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.arc(S / 2, S / 2, S * 0.27, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
      return
    }
    case T.CASTLE_WALL: {
      ctx.fillStyle = '#475569'
      ctx.fillRect(0, 0, S, S)
      drawRoundedCobbleStone(ctx, 0, 0, 32, 22, '#94a3b8', '#cbd5e1', '#64748b', '#1e293b')
      drawRoundedCobbleStone(ctx, 32, 0, 32, 22, '#8695aa', '#cbd5e1', '#64748b', '#1e293b')
      drawRoundedCobbleStone(ctx, 0, 22, 22, 22, '#7d8ca1', '#94a3b8', '#526074', '#1e293b')
      drawRoundedCobbleStone(ctx, 22, 22, 26, 22, '#8796ab', '#b0becf', '#58667b', '#1e293b')
      drawRoundedCobbleStone(ctx, 48, 22, 16, 22, '#758498', '#94a3b8', '#4f5d70', '#1e293b')
      drawRoundedCobbleStone(ctx, 0, 44, 34, 20, '#6c7a8f', '#8a99ad', '#475569', '#1e293b')
      drawRoundedCobbleStone(ctx, 34, 44, 30, 20, '#647287', '#8290a5', '#3e4c60', '#1e293b')
      return
    }
    case T.CAVEFLOOR: {
      const g = ctx.createLinearGradient(0, 0, S, S)
      if (theme === 'crystal') {
        g.addColorStop(0, '#312b54')
        g.addColorStop(1, '#231e40')
      } else {
        g.addColorStop(0, '#443f59')
        g.addColorStop(1, '#312d42')
      }
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
      for (let i = 0; i < 6; i++) {
        drawRoundedCobbleStone(
          ctx,
          rng() * (S - 18),
          rng() * (S - 16),
          14 + rng() * 12,
          10 + rng() * 10,
          theme === 'crystal' ? '#3d3566' : '#534e6b',
          theme === 'crystal' ? '#574d8a' : '#6b6587',
          theme === 'crystal' ? '#241f42' : '#2b273b',
          '#1b1829',
        )
      }
      return
    }
    case T.CAVEWALL: {
      const g = ctx.createLinearGradient(0, 0, 0, S)
      if (theme === 'volcano') {
        g.addColorStop(0, '#3e2424')
        g.addColorStop(1, '#1f1010')
      } else {
        g.addColorStop(0, '#343652')
        g.addColorStop(1, '#1a1b2e')
      }
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
      drawRoundedCobbleStone(ctx, 4, 4, 28, 26, theme === 'volcano' ? '#4a2c2b' : '#3d4061', theme === 'volcano' ? '#633c3b' : '#525680', '#151626', '#10101c')
      drawRoundedCobbleStone(ctx, 32, 6, 28, 24, theme === 'volcano' ? '#432726' : '#353857', theme === 'volcano' ? '#5b3635' : '#4a4e75', '#151626', '#10101c')
      drawRoundedCobbleStone(ctx, 8, 32, 48, 28, theme === 'volcano' ? '#361f1f' : '#2d304a', theme === 'volcano' ? '#4d2e2d' : '#414568', '#12121f', '#0d0d17')
      return
    }
    case T.VOLCFLOOR: {
      const g = ctx.createLinearGradient(0, 0, S, S)
      g.addColorStop(0, '#5a2d27')
      g.addColorStop(1, '#3b1c19')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
      for (let i = 0; i < 4; i++) {
        drawRoundedCobbleStone(ctx, rng() * (S - 20), rng() * (S - 20), 18, 14, '#6b362e', '#85453b', '#3a1a16', '#24100d')
      }
      return
    }
    case T.LAVA: {
      const g = ctx.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S * 0.7)
      g.addColorStop(0, '#ffd166')
      g.addColorStop(0.55, '#f97316')
      g.addColorStop(1, '#b91c1c')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
      ctx.fillStyle = 'rgba(127, 29, 29, 0.55)'
      ctx.beginPath()
      ctx.ellipse(S * 0.3, S * 0.35, 11, 7, 0.4, 0, Math.PI * 2)
      ctx.ellipse(S * 0.72, S * 0.7, 9, 6, -0.3, 0, Math.PI * 2)
      ctx.fill()
      return
    }
    case T.RUINS_FLOOR: {
      const fill = theme === 'abyss' || theme === 'graveyard' ? '#574670' : theme === 'volcano' ? '#704439' : '#8a8599'
      const hi = theme === 'abyss' || theme === 'graveyard' ? '#725d91' : theme === 'volcano' ? '#8c5648' : '#a8a2b8'
      const sh = theme === 'abyss' || theme === 'graveyard' ? '#3b2e4f' : theme === 'volcano' ? '#4a2b24' : '#656073'
      ctx.fillStyle = sh
      ctx.fillRect(0, 0, S, S)
      drawRoundedCobbleStone(ctx, 0, 0, 32, 32, fill, hi, sh, '#241e2e')
      drawRoundedCobbleStone(ctx, 32, 0, 32, 32, fill, hi, sh, '#241e2e')
      drawRoundedCobbleStone(ctx, 0, 32, 32, 32, fill, hi, sh, '#241e2e')
      drawRoundedCobbleStone(ctx, 32, 32, 32, 32, fill, hi, sh, '#241e2e')
      return
    }
    case T.SNOW: {
      const g = ctx.createLinearGradient(0, 0, S, S)
      g.addColorStop(0, '#f0f7ff')
      g.addColorStop(1, '#cfe3f7')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
      ctx.fillStyle = 'rgba(147, 197, 253, 0.35)'
      ctx.beginPath()
      ctx.ellipse(S * 0.3, S * 0.6, 14, 5, 0.2, 0, Math.PI * 2)
      ctx.ellipse(S * 0.72, S * 0.28, 11, 4, -0.2, 0, Math.PI * 2)
      ctx.fill()
      return
    }
    case T.ICE: {
      const g = ctx.createLinearGradient(0, 0, S, S)
      g.addColorStop(0, '#a5f3fc')
      g.addColorStop(0.5, '#67e8f9')
      g.addColorStop(1, '#38bdf8')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
      ctx.strokeStyle = 'rgba(255,255,255,0.65)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(10, 44)
      ctx.lineTo(44, 10)
      ctx.moveTo(24, 54)
      ctx.lineTo(54, 24)
      ctx.stroke()
      return
    }
    case T.SKY_TILE: {
      ctx.fillStyle = '#d4c8b0'
      ctx.fillRect(0, 0, S, S)
      drawRoundedCobbleStone(ctx, 0, 0, 32, 32, '#f8f5ed', '#ffffff', '#dfd8c8', '#9a8f7a')
      drawRoundedCobbleStone(ctx, 32, 0, 32, 32, '#f2ede1', '#ffffff', '#d8d0be', '#9a8f7a')
      drawRoundedCobbleStone(ctx, 0, 32, 32, 32, '#f2ede1', '#ffffff', '#d8d0be', '#9a8f7a')
      drawRoundedCobbleStone(ctx, 32, 32, 32, 32, '#f8f5ed', '#ffffff', '#dfd8c8', '#9a8f7a')
      return
    }
    case T.CLOUD_VOID: {
      const g = ctx.createLinearGradient(0, 0, 0, S)
      g.addColorStop(0, '#6eaee8')
      g.addColorStop(1, '#93c5fd')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
      ctx.fillStyle = 'rgba(255,255,255,0.82)'
      ctx.beginPath()
      ctx.arc(20, 28, 13, 0, Math.PI * 2)
      ctx.arc(34, 24, 16, 0, Math.PI * 2)
      ctx.arc(48, 30, 11, 0, Math.PI * 2)
      ctx.fill()
      return
    }
    case T.SAKURA_GRASS: {
      const g = ctx.createLinearGradient(0, 0, S, S)
      g.addColorStop(0, '#85cc6b')
      g.addColorStop(1, '#5ea84f')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#ffb3c6' : '#ffe5ec'
        ctx.beginPath()
        ctx.ellipse(rng() * (S - 10) + 5, rng() * (S - 10) + 5, 3.5, 2, rng() * Math.PI, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }
    case T.MUSHROOMS: {
      paintProceduralHdTile(ctx, base, base, variant, theme)
      // Draw cute cel-shaded mushrooms
      for (const [mx, my, r, col] of [
        [20, 40, 9, '#ef4444'],
        [44, 46, 7, '#f97316'],
      ] as const) {
        ctx.fillStyle = '#fef3c7'
        ctx.strokeStyle = '#2d1c15'
        ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.roundRect(mx - r * 0.35, my - 2, r * 0.7, r * 0.9, 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(mx, my - 2, r, Math.PI, 0)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(mx - r * 0.3, my - r * 0.45, 2, 0, Math.PI * 2)
        ctx.arc(mx + r * 0.35, my - r * 0.3, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }
    case T.BONES: {
      paintProceduralHdTile(ctx, base, base, variant, theme)
      ctx.save()
      ctx.strokeStyle = '#2d1c15'
      ctx.fillStyle = '#ede7dc'
      ctx.lineWidth = 2
      ctx.translate(32, 34)
      ctx.rotate(-0.35)
      ctx.beginPath()
      ctx.roundRect(-14, -3, 28, 6, 3)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      return
    }
    case T.FOUNTAIN: {
      paintProceduralHdTile(ctx, T.PLAZA, base, variant, theme)
      return
    }
    default: {
      paintProceduralHdTile(ctx, base, base, variant, theme)
    }
  }
}

const MAX_TILE_CACHE = 96
const MAX_CHUNK_CACHE = 80
const MAX_FULL_MAP_CACHE = 1
const CHUNK_TILES = 4

const tileHdCache = new Map<string, HTMLCanvasElement>()
const chunkHdCache = new Map<string, HTMLCanvasElement>()
const mapHdCache = new Map<string, HTMLCanvasElement>()
let lastTileCacheVersion = -1

function releaseCanvas(c: HTMLCanvasElement | undefined) {
  if (!c) return
  try {
    c.width = 0
    c.height = 0
  } catch {
    // ignore cleanup errors
  }
}

function clearCanvasCache(target: Map<string, HTMLCanvasElement>) {
  for (const c of target.values()) {
    releaseCanvas(c)
  }
  target.clear()
}

function touchLru<T extends HTMLCanvasElement>(mapCache: Map<string, T>, key: string): T | undefined {
  const hit = mapCache.get(key)
  if (!hit) return undefined
  if (hit.width === 0 || hit.height === 0) {
    mapCache.delete(key)
    return undefined
  }
  mapCache.delete(key)
  mapCache.set(key, hit)
  return hit
}

function setLru(mapCache: Map<string, HTMLCanvasElement>, key: string, value: HTMLCanvasElement, limit: number) {
  const prev = mapCache.get(key)
  if (prev && prev !== value) {
    releaseCanvas(prev)
  }
  mapCache.delete(key)
  mapCache.set(key, value)
  while (mapCache.size > limit) {
    const oldestKey = mapCache.keys().next().value
    if (oldestKey === undefined) break
    const oldestCanvas = mapCache.get(oldestKey)
    mapCache.delete(oldestKey)
    releaseCanvas(oldestCanvas)
  }
}

function syncTileCacheVersion() {
  preloadTileAssets()
  const curVer = getHdTileLoadVersion()
  if (curVer !== lastTileCacheVersion) {
    clearCanvasCache(tileHdCache)
    clearCanvasCache(chunkHdCache)
    clearCanvasCache(mapHdCache)
    lastTileCacheVersion = curVer
  }
}

function getHdTileCanvas(tile: number, base: number, variant: number, theme: string): HTMLCanvasElement {
  syncTileCacheVersion()
  const key = `${tile}|${base}|${variant}|${theme}`
  let hit = touchLru(tileHdCache, key)
  if (!hit) {
    const made = makeHdCanvas(HD_TILE, HD_TILE)
    paintProceduralHdTile(made.ctx, tile, base, variant, theme)
    hit = made.c
    setLru(tileHdCache, key, hit, MAX_TILE_CACHE)
  }
  return hit
}

function groundTileUnderProp(map: MapDef, tx: number, ty: number, tile: number): number {
  if (tile === T.FOUNTAIN) return T.PLAZA
  if (map.id === 'town' && TOWN_BUILDING_TILE_MASK.has(tile)) {
    const below = map.tiles[(ty + 1) * map.width + tx]
    if (below === T.PLAZA || below === T.COBBLESTONE) return below
    if (ty <= 7 && tx < 16) return T.COBBLESTONE
    if (ty <= 7 && tx > 28) return T.COBBLESTONE
    if (ty >= 18) return T.PLAZA
    return T.COBBLESTONE
  }
  if (LAYERED_PROP_TILES.has(tile)) {
    for (const [dx, dy] of [
      [0, 1],
      [-1, 0],
      [1, 0],
      [0, -1],
    ]) {
      const nx = tx + dx
      const ny = ty + dy
      if (nx >= 0 && ny >= 0 && nx < map.width && ny < map.height) {
        const nt = map.tiles[ny * map.width + nx]
        if (!LAYERED_PROP_TILES.has(nt) && !TOWN_BUILDING_TILE_MASK.has(nt) && nt !== T.WATER && nt !== T.LAVA) {
          return nt
        }
      }
    }
    return map.base
  }
  return tile
}

function paintMapTileRect(
  ctx: CanvasRenderingContext2D,
  map: MapDef,
  txStart: number,
  tyStart: number,
  txEnd: number,
  tyEnd: number,
  offsetX = 0,
  offsetY = 0,
) {
  for (let y = tyStart; y < tyEnd; y++) {
    for (let x = txStart; x < txEnd; x++) {
      const rawTile = map.tiles[y * map.width + x]
      const drawTile =
        rawTile === T.CAVEWALL || rawTile === T.CASTLE_WALL
          ? rawTile
          : groundTileUnderProp(map, x, y, rawTile)
      const variant = (x * 7 + y * 13) & 3
      ctx.drawImage(
        getHdTileCanvas(drawTile, map.base, variant, map.theme),
        (x - txStart) * HD_TILE + offsetX,
        (y - tyStart) * HD_TILE + offsetY,
      )
    }
  }

  for (let y = tyStart; y < tyEnd; y++) {
    for (let x = txStart; x < txEnd; x++) {
      const t = map.tiles[y * map.width + x]
      const px = (x - txStart) * HD_TILE + offsetX
      const py = (y - tyStart) * HD_TILE + offsetY

      if (t === T.WATER || t === T.LAVA) {
        const up = y > 0 ? map.tiles[(y - 1) * map.width + x] : t
        const left = x > 0 ? map.tiles[y * map.width + x - 1] : t
        const right = x < map.width - 1 ? map.tiles[y * map.width + x + 1] : t
        const down = y < map.height - 1 ? map.tiles[(y + 1) * map.width + x] : t
        if (up !== t && up !== T.BRIDGE_H && up !== T.BRIDGE_V) {
          if (t === T.WATER && map.theme === 'town') {
            ctx.fillStyle = '#9b8d7e'
            ctx.fillRect(px, py, HD_TILE, 8)
            ctx.fillStyle = '#d6cab8'
            ctx.fillRect(px, py, HD_TILE, 3)
            ctx.fillStyle = '#4f463d'
            ctx.fillRect(px, py + 7, HD_TILE, 2)
          }
          const bankG = ctx.createLinearGradient(px, py + (map.theme === 'town' && t === T.WATER ? 9 : 0), px, py + 20)
          bankG.addColorStop(0, t === T.WATER ? 'rgba(18, 66, 114, 0.72)' : 'rgba(30, 14, 12, 0.85)')
          bankG.addColorStop(0.55, t === T.WATER ? 'rgba(14, 80, 138, 0.35)' : 'rgba(120, 30, 10, 0.4)')
          bankG.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = bankG
          ctx.fillRect(px, py + (map.theme === 'town' && t === T.WATER ? 9 : 0), HD_TILE, 18)
        }
        if (down !== t && down !== T.BRIDGE_H && down !== T.BRIDGE_V) {
          ctx.fillStyle = t === T.WATER ? 'rgba(186, 230, 253, 0.25)' : 'rgba(255, 190, 90, 0.25)'
          ctx.fillRect(px, py + HD_TILE - 5, HD_TILE, 5)
        }
        if (left !== t && left !== T.BRIDGE_H && left !== T.BRIDGE_V) {
          ctx.fillStyle = 'rgba(0,0,0,0.22)'
          ctx.fillRect(px, py, 6, HD_TILE)
        }
        if (right !== t && right !== T.BRIDGE_H && right !== T.BRIDGE_V) {
          ctx.fillStyle = 'rgba(0,0,0,0.22)'
          ctx.fillRect(px + HD_TILE - 6, py, 6, HD_TILE)
        }
      }

      if (t !== T.CASTLE_WALL && t !== T.CAVEWALL && y > 0) {
        const north = map.tiles[(y - 1) * map.width + x]
        if (north === T.CASTLE_WALL || north === T.CAVEWALL) {
          const shG = ctx.createLinearGradient(px, py, px, py + 22)
          shG.addColorStop(0, 'rgba(14, 10, 20, 0.42)')
          shG.addColorStop(1, 'rgba(14, 10, 20, 0)')
          ctx.fillStyle = shG
          ctx.fillRect(px, py, HD_TILE, 22)
        }
      }
    }
  }
}

function getHdMapChunkCanvas(map: MapDef, cx: number, cy: number): HTMLCanvasElement {
  syncTileCacheVersion()
  const key = `${map.id}|${cx}|${cy}`
  const existing = touchLru(chunkHdCache, key)
  if (existing) return existing

  const txStart = cx * CHUNK_TILES
  const tyStart = cy * CHUNK_TILES
  const txEnd = Math.min(map.width, txStart + CHUNK_TILES)
  const tyEnd = Math.min(map.height, tyStart + CHUNK_TILES)
  const w = Math.max(1, (txEnd - txStart) * HD_TILE)
  const h = Math.max(1, (tyEnd - tyStart) * HD_TILE)

  const made = makeHdCanvas(w, h)
  paintMapTileRect(made.ctx, map, txStart, tyStart, txEnd, tyEnd, 0, 0)
  setLru(chunkHdCache, key, made.c, MAX_CHUNK_CACHE)
  return made.c
}

/**
 * Draws only the visible world viewport [vx0, vy0, vx1, vy1] onto the target context
 * using bounded 512x512 HD map chunks. Prevents multi-megabyte full-map texture exhaustion on mobile.
 */
export function drawHdMapViewport(
  ctx: CanvasRenderingContext2D,
  map: MapDef,
  vx0: number,
  vy0: number,
  vx1: number,
  vy1: number,
): void {
  if (vx1 <= vx0 || vy1 <= vy0) return
  syncTileCacheVersion()

  const minTx = Math.max(0, Math.floor(vx0 / TILE))
  const maxTx = Math.min(map.width - 1, Math.floor((vx1 - 0.001) / TILE))
  const minTy = Math.max(0, Math.floor(vy0 / TILE))
  const maxTy = Math.min(map.height - 1, Math.floor((vy1 - 0.001) / TILE))

  const minCx = Math.floor(minTx / CHUNK_TILES)
  const maxCx = Math.floor(maxTx / CHUNK_TILES)
  const minCy = Math.floor(minTy / CHUNK_TILES)
  const maxCy = Math.floor(maxTy / CHUNK_TILES)
  const hdPerWorld = HD_TILE / TILE

  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      const chunkCanvas = getHdMapChunkCanvas(map, cx, cy)
      if (chunkCanvas.width <= 0 || chunkCanvas.height <= 0) continue

      const chunkWorldX0 = cx * CHUNK_TILES * TILE
      const chunkWorldY0 = cy * CHUNK_TILES * TILE
      const chunkWorldX1 = Math.min(map.width * TILE, chunkWorldX0 + CHUNK_TILES * TILE)
      const chunkWorldY1 = Math.min(map.height * TILE, chunkWorldY0 + CHUNK_TILES * TILE)

      const ix0 = Math.max(vx0, chunkWorldX0)
      const iy0 = Math.max(vy0, chunkWorldY0)
      const ix1 = Math.min(vx1, chunkWorldX1)
      const iy1 = Math.min(vy1, chunkWorldY1)
      if (ix1 <= ix0 || iy1 <= iy0) continue

      const sx = (ix0 - chunkWorldX0) * hdPerWorld
      const sy = (iy0 - chunkWorldY0) * hdPerWorld
      const sw = (ix1 - ix0) * hdPerWorld
      const sh = (iy1 - iy0) * hdPerWorld

      ctx.drawImage(chunkCanvas, sx, sy, sw, sh, ix0, iy0, ix1 - ix0, iy1 - iy0)
    }
  }
}

export function buildHdMapCanvas(map: MapDef): HTMLCanvasElement {
  syncTileCacheVersion()

  const cached = touchLru(mapHdCache, map.id)
  if (cached) return cached

  const made = makeHdCanvas(map.width * HD_TILE, map.height * HD_TILE)
  paintMapTileRect(made.ctx, map, 0, 0, map.width, map.height, 0, 0)
  setLru(mapHdCache, map.id, made.c, MAX_FULL_MAP_CACHE)
  return made.c
}
