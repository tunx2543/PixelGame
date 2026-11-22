'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, MapPin, Minus, Plus } from 'lucide-react'
import { MONSTERS } from '@/lib/game/data'
import { adjustCameraZoomAction, currentMap, game } from '@/lib/game/engine'
import { T, TILE, type MapDef } from '@/lib/game/maps'
import { useGame } from '@/lib/game/use-game'

const MINIMAP_SCALE = 2
const baseLayerCache = new Map<string, HTMLCanvasElement>()

function tileMinimapColor(tile: number, map: MapDef): string {
  switch (tile) {
    case T.WATER:
      return '#2d7ec7'
    case T.LAVA:
      return '#e85d04'
    case T.BRIDGE_H:
    case T.BRIDGE_V:
      return '#c8956b'
    case T.PATH:
    case T.SAND:
      return '#cfa77b'
    case T.PLAZA:
    case T.COBBLESTONE:
      return '#8f939e'
    case T.GOLD_PAVING:
      return '#e0aa3e'
    case T.RUINS_FLOOR:
      return map.theme === 'abyss' || map.theme === 'graveyard' ? '#4a3d61' : map.theme === 'volcano' ? '#5e3830' : '#7b7888'
    case T.CARPET:
      return '#b5173e'
    case T.WOOD_FLOOR:
      return '#9c6644'
    case T.MAGIC_CIRCLE:
      return '#c77dff'
    case T.WALL:
    case T.CASTLE_WALL:
    case T.CAVEWALL:
    case T.WINDOW:
    case T.DOOR:
      return '#1a2232'
    case T.ROOF_RED:
      return '#a8363a'
    case T.ROOF_BLUE:
      return '#36588c'
    case T.ROOF_PURPLE:
      return '#673b88'
    case T.ROOF_GREEN:
      return '#2d6a4f'
    case T.TREE:
    case T.PINE:
    case T.BUSH:
      return map.theme === 'frost' || map.theme === 'snow' ? '#4f7a7c' : '#244d28'
    case T.FLOWER:
      return '#e57aa4'
    case T.DARKGRASS:
      return '#1d4d2c'
    case T.CAVEFLOOR:
      return map.theme === 'crystal' ? '#2c254a' : '#353147'
    case T.VOLCFLOOR:
      return '#402220'
    case T.SNOW:
      return '#dce8f5'
    case T.ICE:
      return '#8be0f0'
    case T.SKY_TILE:
      return '#f0ead6'
    case T.CLOUD_VOID:
      return '#6da7dc'
    case T.SAKURA_GRASS:
      return '#52875e'
    case T.CRYSTAL:
      return '#72efdd'
    case T.ROCK:
      return '#545b6b'
    case T.FOUNTAIN:
      return '#56cfe1'
    default:
      return '#39623d'
  }
}

function getBaseMinimapCanvas(map: MapDef): HTMLCanvasElement {
  const cached = baseLayerCache.get(map.id)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = map.width * MINIMAP_SCALE
  canvas.height = map.height * MINIMAP_SCALE
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      ctx.fillStyle = tileMinimapColor(map.tiles[y * map.width + x], map)
      ctx.fillRect(x * MINIMAP_SCALE, y * MINIMAP_SCALE, MINIMAP_SCALE, MINIMAP_SCALE)
    }
  }

  for (const obj of map.objects) {
    ctx.fillStyle =
      obj.kind === 'campfire' || obj.kind === 'magma_brazier' || obj.kind === 'torch'
        ? '#ffb703'
        : obj.kind === 'crystal_spire' || obj.kind === 'ice_spire'
          ? '#72efdd'
          : obj.kind === 'sakura_tree' || obj.kind === 'dream_shrine'
            ? '#ff8fab'
            : '#d9c79e'
    ctx.fillRect(obj.tx * MINIMAP_SCALE, obj.ty * MINIMAP_SCALE, MINIMAP_SCALE, MINIMAP_SCALE)
  }

  baseLayerCache.set(map.id, canvas)
  return canvas
}

export function MapMinimap() {
  const { p } = useGame()
  const [expanded, setExpanded] = useState(true)
  const [coords, setCoords] = useState({ mapId: '', tx: 0, ty: 0 })
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const syncExpanded = () => {
      setExpanded(window.innerWidth >= 640 && window.innerHeight >= 460)
    }
    syncExpanded()
    window.addEventListener('resize', syncExpanded)
    return () => window.removeEventListener('resize', syncExpanded)
  }, [])

  const drawOverlay = useCallback(() => {
    const player = game.p
    if (!player) return
    const cur = currentMap()
    const nextTx = Math.floor(player.x / TILE)
    const nextTy = Math.floor(player.y / TILE)

    setCoords((prev) =>
      prev.mapId === cur.id && prev.tx === nextTx && prev.ty === nextTy
        ? prev
        : { mapId: cur.id, tx: nextTx, ty: nextTy },
    )

    if (!expanded) return
    const canvas = canvasRef.current
    if (!canvas) return
    if (canvas.width !== cur.width * MINIMAP_SCALE || canvas.height !== cur.height * MINIMAP_SCALE) {
      canvas.width = cur.width * MINIMAP_SCALE
      canvas.height = cur.height * MINIMAP_SCALE
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    const base = getBaseMinimapCanvas(cur)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(base, 0, 0)

    // Portals (cyan)
    const maxPx = canvas.width - 3
    const maxPy = canvas.height - 3
    for (const pt of cur.portals) {
      const px = Math.max(2, Math.min(maxPx, Math.round((pt.x + pt.w / 2) * MINIMAP_SCALE)))
      const py = Math.max(2, Math.min(maxPy, Math.round((pt.y + pt.h / 2) * MINIMAP_SCALE)))
      ctx.fillStyle = '#0e0f1a'
      ctx.fillRect(px - 2, py - 2, 5, 5)
      ctx.fillStyle = '#4cc9f0'
      ctx.fillRect(px - 1, py - 1, 3, 3)
    }

    // NPCs (gold)
    for (const npc of cur.npcs) {
      const nx = Math.round(npc.x * MINIMAP_SCALE)
      const ny = Math.round(npc.y * MINIMAP_SCALE)
      ctx.fillStyle = '#0e0f1a'
      ctx.fillRect(nx - 2, ny - 2, 4, 4)
      ctx.fillStyle = '#f2c94c'
      ctx.fillRect(nx - 1, ny - 1, 2, 2)
    }

    // Active Monsters
    for (const m of game.monsters) {
      if (m.dead) continue
      const def = MONSTERS[m.defId]
      const mx = Math.round((m.x / TILE) * MINIMAP_SCALE)
      const my = Math.round((m.y / TILE) * MINIMAP_SCALE)
      if (def?.boss) {
        ctx.fillStyle = '#0e0f1a'
        ctx.fillRect(mx - 2, my - 2, 5, 5)
        ctx.fillStyle = '#ff2a6d'
        ctx.fillRect(mx - 1, my - 1, 3, 3)
      } else {
        ctx.fillStyle = '#ff6b6b'
        ctx.fillRect(mx, my, 2, 2)
      }
    }

    // Remote Players
    const partySet = new Set(game.party?.memberIds ?? [])
    for (const other of game.remotePlayers) {
      if (other.invisible || other.mapId !== cur.id) continue
      const rx = Math.round((other.x / TILE) * MINIMAP_SCALE)
      const ry = Math.round((other.y / TILE) * MINIMAP_SCALE)
      const isMate = partySet.has(other.userId)
      ctx.fillStyle = '#0e0f1a'
      ctx.fillRect(rx - 2, ry - 2, isMate ? 5 : 4, isMate ? 5 : 4)
      ctx.fillStyle = isMate ? '#c77dff' : other.gm ? '#ffd60a' : '#8be9fd'
      ctx.fillRect(rx - 1, ry - 1, isMate ? 3 : 2, isMate ? 3 : 2)
    }

    // Player Marker (bright yellow-gold dot matching Asura radar)
    const playerX = Math.round((player.x / TILE) * MINIMAP_SCALE)
    const playerY = Math.round((player.y / TILE) * MINIMAP_SCALE)
    ctx.fillStyle = '#0e0f1a'
    ctx.fillRect(playerX - 2, playerY - 2, 5, 5)
    ctx.fillStyle = '#facc15'
    ctx.fillRect(playerX - 1, playerY - 1, 3, 3)
  }, [expanded])

  useEffect(() => {
    if (!p) return
    drawOverlay()
    const timer = window.setInterval(drawOverlay, 120)
    return () => window.clearInterval(timer)
  }, [p, drawOverlay])

  if (!p) return null

  const map = currentMap()
  const displayTx = coords.mapId === map.id ? coords.tx : Math.floor(p.x / TILE)
  const displayTy = coords.mapId === map.id ? coords.ty : Math.floor(p.y / TILE)
  const zoomVal = game.cameraZoomScale ?? 1

  return (
    <div className="pointer-events-auto relative w-full overflow-hidden rounded-md border border-[#3a639a]/85 bg-[#080d16]/90 shadow-xl">
      {/* Top Bar: Map Name / Toggle & Zoom x 1.0 - + */}
      <div className="flex items-center justify-between gap-1 border-b border-[#264268]/70 bg-[#0d1626]/85 px-1.5 py-0.5 text-[9.5px]">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-label={expanded ? 'ย่อมินิแมพ' : 'เปิดมินิแมพ'}
          className="flex min-w-0 flex-1 items-center gap-1 text-left font-bold text-slate-100 hover:text-amber-200"
        >
          {expanded ? <ChevronUp className="size-3 shrink-0 text-sky-300" aria-hidden /> : <ChevronDown className="size-3 shrink-0 text-sky-300" aria-hidden />}
          <span className="truncate">{map.name}</span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5 font-mono text-[9px] font-bold text-white tabular-nums">
          <span className="mr-0.5 text-slate-200">x {zoomVal.toFixed(1)}</span>
          <button
            type="button"
            onClick={() => adjustCameraZoomAction(-0.15)}
            aria-label="ซูมออก"
            title="ซูมออก"
            className="grid size-4 place-items-center rounded bg-[#182942] text-slate-200 hover:bg-[#243d61] hover:text-white"
          >
            <Minus className="size-2.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => adjustCameraZoomAction(0.15)}
            aria-label="ซูมเข้า"
            title="ซูมเข้า"
            className="grid size-4 place-items-center rounded bg-[#182942] text-slate-200 hover:bg-[#243d61] hover:text-white"
          >
            <Plus className="size-2.5" aria-hidden />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="relative bg-[#070b13]/85">
          <canvas
            ref={canvasRef}
            width={map.width * MINIMAP_SCALE}
            height={map.height * MINIMAP_SCALE}
            className="block h-auto max-h-[6.5rem] w-full object-contain opacity-85"
            aria-label={`แผนที่ย่อ ${map.name}`}
          />
          <span className="pointer-events-none absolute bottom-0.5 right-1 rounded bg-black/70 px-1 font-mono text-[9.5px] font-bold text-white shadow tabular-nums">
            {displayTx},{displayTy}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between px-1.5 py-0.5 text-[9px] text-slate-300 tabular-nums">
          <span className="flex items-center gap-0.5 truncate">
            <MapPin className="size-2.5 text-amber-300" aria-hidden />
            {map.levelLabel}
          </span>
          <span className="font-mono font-bold text-white">
            {displayTx},{displayTy}
          </span>
        </div>
      )}
    </div>
  )
}
