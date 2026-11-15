import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAPS,
  MAP_ORDER,
  T,
  TILE,
  boxBlocked,
  isSolidTile,
  tileAt,
  type MapDef,
} from '../lib/game/maps'

function computeReachable(map: MapDef, startX: number, startY: number): Set<number> {
  const visited = new Set<number>()
  if (isSolidTile(map, startX, startY)) return visited
  const queue: [number, number][] = [[startX, startY]]
  visited.add(startY * map.width + startX)

  while (queue.length > 0) {
    const [x, y] = queue.shift()!
    const neighbors: [number, number][] = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue
      const key = ny * map.width + nx
      if (visited.has(key) || isSolidTile(map, nx, ny)) continue
      visited.add(key)
      queue.push([nx, ny])
    }
  }
  return visited
}

describe('All 11 redesigned RPG maps', () => {
  it('defines all expected maps in MAP_ORDER with valid grids and rich objects', () => {
    assert.equal(MAP_ORDER.length, 11)
    for (const id of MAP_ORDER) {
      const map = MAPS[id]
      assert.ok(map, `missing map ${id}`)
      assert.equal(map.tiles.length, map.width * map.height, `${id} tiles size mismatch`)
      assert.equal(map.objSolid.length, map.width * map.height, `${id} objSolid size mismatch`)
      assert.ok(map.objects.length >= 6, `${id} should have >= 6 RPG objects (got ${map.objects.length})`)
      for (const obj of map.objects) {
        assert.ok(obj.tx >= 0 && obj.tx < map.width, `${id} object ${obj.id} tx out of range`)
        assert.ok(obj.ty >= 0 && obj.ty < map.height, `${id} object ${obj.id} ty out of range`)
      }
    }
  })

  it('has unblocked spawn points and sufficient walkable floor across every map', () => {
    for (const id of MAP_ORDER) {
      const map = MAPS[id]
      const sx = map.spawn.x
      const sy = map.spawn.y
      assert.equal(isSolidTile(map, sx, sy), false, `${id} spawn tile (${sx},${sy}) must be walkable`)
      assert.equal(
        boxBlocked(map, (sx + 0.5) * TILE, (sy + 0.5) * TILE),
        false,
        `${id} spawn px (${sx},${sy}) must not be boxBlocked`,
      )

      const reachable = computeReachable(map, sx, sy)
      const walkableRatio = reachable.size / (map.width * map.height)
      assert.ok(reachable.size >= 400, `${id} reachable area too small (${reachable.size})`)
      assert.ok(walkableRatio >= 0.3, `${id} walkable ratio too low (${walkableRatio.toFixed(2)})`)
    }
  })

  it('guarantees every portal and portal landing target is reachable and connected', () => {
    const graphReached = new Set<string>(['town'])
    const queue = ['town']

    for (const id of MAP_ORDER) {
      const map = MAPS[id]
      const reachable = computeReachable(map, map.spawn.x, map.spawn.y)

      for (const pt of map.portals) {
        let touchesReachable = false
        for (let py = pt.y - 1; py <= pt.y + pt.h; py++) {
          for (let px = pt.x - 1; px <= pt.x + pt.w; px++) {
            if (px < 0 || py < 0 || px >= map.width || py >= map.height) continue
            if (reachable.has(py * map.width + px)) {
              touchesReachable = true
              break
            }
          }
          if (touchesReachable) break
        }
        assert.ok(touchesReachable, `${id} portal to ${pt.to} is not reachable from spawn`)

        const dest = MAPS[pt.to]
        assert.ok(dest, `${id} portal target ${pt.to} does not exist`)
        assert.equal(isSolidTile(dest, pt.tx, pt.ty), false, `dest ${pt.to} (${pt.tx},${pt.ty}) is solid`)
        assert.equal(
          boxBlocked(dest, (pt.tx + 0.5) * TILE, (pt.ty + 0.5) * TILE),
          false,
          `dest ${pt.to} (${pt.tx},${pt.ty}) is boxBlocked`,
        )
        const destReach = computeReachable(dest, dest.spawn.x, dest.spawn.y)
        assert.ok(
          destReach.has(pt.ty * dest.width + pt.tx),
          `dest ${pt.to} (${pt.tx},${pt.ty}) does not connect to ${pt.to} spawn`,
        )
      }
    }

    while (queue.length > 0) {
      const cur = queue.shift()!
      for (const pt of MAPS[cur].portals) {
        if (!graphReached.has(pt.to)) {
          graphReached.add(pt.to)
          queue.push(pt.to)
        }
      }
    }
    assert.equal(graphReached.size, MAP_ORDER.length, 'not all 11 maps are reachable from town via portals')
  })

  it('keeps all Town NPCs and Town fountain & bridges properly reachable', () => {
    const town = MAPS.town
    const reachable = computeReachable(town, town.spawn.x, town.spawn.y)

    assert.equal(tileAt(town, 21, 15), T.FOUNTAIN)
    assert.equal(tileAt(town, 22, 16), T.FOUNTAIN)
    assert.equal(tileAt(town, 19, 13), T.MAGIC_CIRCLE)

    // Verify southern park below the canal is reachable over the bridges
    assert.ok(reachable.has(29 * town.width + 22), 'south sakura park below canal must be reachable via bridges')

    for (const npc of town.npcs) {
      const nxPx = npc.x * TILE
      const nyPx = npc.y * TILE + 8
      let canInteract = false
      for (const key of reachable) {
        const tx = key % town.width
        const ty = Math.floor(key / town.width)
        const wx = (tx + 0.5) * TILE
        const wy = (ty + 0.5) * TILE
        if (Math.hypot(wx - nxPx, wy - nyPx) < 28) {
          canInteract = true
          break
        }
      }
      assert.ok(canInteract, `Town NPC ${npc.id} (${npc.name}) is not within interaction range of reachable tiles`)
    }
  })

  it('preserves cave earth_golem west chamber & bridges in river biomes', () => {
    const cave = MAPS.cave
    const caveReach = computeReachable(cave, cave.spawn.x, cave.spawn.y)
    let earthChamberOpen = 0
    for (let ty = 8; ty <= 28; ty++) {
      for (let tx = 8; tx <= 10; tx++) {
        if (caveReach.has(ty * cave.width + tx)) earthChamberOpen++
      }
    }
    assert.ok(earthChamberOpen >= 20, `cave earth_golem west chamber must remain open (got ${earthChamberOpen})`)

    for (const id of ['town', 'meadow', 'forest', 'cave', 'volcano', 'sky_ruins', 'frost_peak', 'dream_garden']) {
      const map = MAPS[id]
      let hasBridge = false
      for (let i = 0; i < map.tiles.length; i++) {
        if (map.tiles[i] === T.BRIDGE_H || map.tiles[i] === T.BRIDGE_V) {
          hasBridge = true
          break
        }
      }
      assert.ok(hasBridge, `${id} should feature bridges`)
    }
  })
})
