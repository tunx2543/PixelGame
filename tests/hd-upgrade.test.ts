import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  clampCameraPosition,
  compareDepthOrder,
  createCameraState,
  isEntityOccludedByOverhead,
  stepSmoothCamera,
} from '../lib/game/camera'
import { HD_ASSET_PATHS, HD_TILE } from '../lib/game/hd-assets'
import { TOWN_STRUCTURES } from '../lib/game/hd-props'
import { MAPS, T, TILE, boxBlocked, isSolidTile, tileAt } from '../lib/game/maps'

describe('HD Camera, Layer Z-index & Occlusion', () => {
  it('damps smoothly during movement and snaps immediately when map changes', () => {
    const cam = createCameraState('town')
    const first = stepSmoothCamera(cam, 360, 260, 400, 250, 704, 512, 'town', 0.016, 'right')
    assert.equal(cam.initialized, true)
    assert.equal(cam.mapId, 'town')

    // Small movement eases toward desired camera without teleporting in one frame
    const next = stepSmoothCamera(cam, 385, 260, 400, 250, 704, 512, 'town', 0.016, 'right')
    assert.ok(next.x > first.x, 'camera should move toward target')
    assert.ok(next.x < 385 + 6 - 200, 'camera should damp smoothly instead of jumping immediately')

    // Large map transition snaps cleanly to new map target
    const meadowCam = stepSmoothCamera(cam, 80, 220, 400, 250, 832, 576, 'meadow', 0.016, 'right')
    assert.equal(cam.mapId, 'meadow')
    assert.ok(meadowCam.x >= 0 && meadowCam.y >= 0)
  })

  it('clamps camera within map bounds and centers maps smaller than viewport', () => {
    const small = clampCameraPosition(100, 100, 800, 600, 400, 300)
    assert.equal(small.x, -200)
    assert.equal(small.y, -150)

    const large = clampCameraPosition(-50, 999, 320, 240, 704, 512)
    assert.equal(large.x, 0)
    assert.equal(large.y, 512 - 240)
  })

  it('orders drawables by Y foot coordinate so entities walk behind and in front of objects', () => {
    const treeFootY = 200
    const playerBehind = { y: 185 }
    const playerInFront = { y: 215 }

    assert.ok(compareDepthOrder(playerBehind, { y: treeFootY }) < 0)
    assert.ok(compareDepthOrder(playerInFront, { y: treeFootY }) > 0)
  })

  it('detects Layer 3 overhead occlusion only when entity stands directly behind roof/canopy zone', () => {
    const roofZone = { x0: 80, y0: 40, x1: 208, y1: 112, baseY: 114 }
    assert.equal(isEntityOccludedByOverhead(140, 96, roofZone), true)
    assert.equal(isEntityOccludedByOverhead(140, 128, roofZone), false)
    assert.equal(isEntityOccludedByOverhead(30, 96, roofZone), false)
  })
})

describe('HD Assets & Town Obstacle Alignment', () => {
  it('uses HD_TILE = 64 (4x world TILE) and has all extracted HD asset files present on disk', () => {
    assert.equal(HD_TILE, TILE * 4)
    const keys = Object.keys(HD_ASSET_PATHS) as Array<keyof typeof HD_ASSET_PATHS>
    assert.ok(keys.length >= 35, `expected rich HD asset manifest, got ${keys.length}`)

    for (const key of keys) {
      const rel = HD_ASSET_PATHS[key].replace(/^\//, '')
      const fullPath = path.join(process.cwd(), 'public', rel)
      assert.equal(fs.existsSync(fullPath), true, `missing HD asset file on disk: public/${rel}`)
      const stat = fs.statSync(fullPath)
      assert.ok(stat.size > 100, `HD asset file looks empty: public/${rel}`)
    }
  })

  it('aligns TOWN_STRUCTURES footprints with MAPS.town solid buildings and Angel Fountain collision', () => {
    const town = MAPS.town
    assert.ok(TOWN_STRUCTURES.length >= 9)

    const inn = TOWN_STRUCTURES.find((s) => s.id === 'town_guild_inn')
    const forge = TOWN_STRUCTURES.find((s) => s.id === 'town_blacksmith')
    const fountain = TOWN_STRUCTURES.find((s) => s.id === 'town_angel_fountain')
    assert.ok(inn && forge && fountain)

    // Building footprints must be solid so hero collides cleanly with HD buildings
    assert.equal(isSolidTile(town, inn.tx + 2, inn.ty + 1), true)
    assert.equal(boxBlocked(town, (inn.tx + 2.5) * TILE, (inn.ty + 1.5) * TILE), true)
    assert.equal(isSolidTile(town, forge.tx + 2, forge.ty + 1), true)

    // Angel fountain tiles must be FOUNTAIN & blocked while surrounding plaza is walkable
    assert.equal(tileAt(town, fountain.tx, fountain.ty), T.FOUNTAIN)
    assert.equal(boxBlocked(town, (fountain.tx + 0.5) * TILE, (fountain.ty + 0.5) * TILE), true)
    assert.equal(boxBlocked(town, (fountain.tx - 1.5) * TILE, (fountain.ty + 0.5) * TILE), false)

    // Town canal water (y=25) is blocked, while wooden bridge over canal (bx=8) is walkable
    assert.equal(tileAt(town, 12, 25), T.WATER)
    assert.equal(boxBlocked(town, 12.5 * TILE, 25.5 * TILE), true)
    assert.equal(tileAt(town, 8, 25), T.BRIDGE_V)
    assert.equal(boxBlocked(town, 8.5 * TILE, 25.5 * TILE), false)
  })
})
