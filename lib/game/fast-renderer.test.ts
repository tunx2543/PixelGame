import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  FastSpriteLruCache,
  buildLabelCacheKey,
  buildStaticMapPropDescriptors,
  computeFastCanvasDpr,
  computeVisibleTileBounds,
  resolveEffectiveRenderEngine,
} from './fast-renderer'
import { MAPS } from './maps'

describe('fast-renderer pure helpers', () => {
  it('defaults render engine to fast when unset or invalid', () => {
    assert.equal(resolveEffectiveRenderEngine(undefined), 'fast')
    assert.equal(resolveEffectiveRenderEngine({}), 'fast')
    assert.equal(resolveEffectiveRenderEngine({ renderEngine: 'fast' }), 'fast')
    assert.equal(resolveEffectiveRenderEngine({ renderEngine: 'hd' }), 'hd')
  })

  it('caps DPR sensibly in fast mode to cut fill-rate overhead', () => {
    assert.equal(computeFastCanvasDpr(3, 'high', 1, false, 'fast', false), 1.5)
    assert.equal(computeFastCanvasDpr(3, 'high', 1, true, 'fast', false), 1.25)
    assert.equal(computeFastCanvasDpr(3, 'medium', 1, false, 'fast', false), 1.15)
    assert.equal(computeFastCanvasDpr(3, 'low', 1, false, 'fast', false), 1)
    assert.equal(computeFastCanvasDpr(2, 'high', 1, false, 'fast', true), 1)
    assert.equal(computeFastCanvasDpr(2, 'high', 0.7, false, 'fast', false), 1.05)
    assert.equal(computeFastCanvasDpr(2, 'high', 1, false, 'hd', false), 2)
  })

  it('computes clamped visible tile bounds around camera', () => {
    const b = computeVisibleTileBounds(-10, 16, 160, 128, 48, 36, 16, 2)
    assert.deepEqual(b, { minTx: 0, maxTx: 12, minTy: 0, maxTy: 12 })

    const bEnd = computeVisibleTileBounds(680, 500, 160, 128, 48, 36, 16, 2)
    assert.deepEqual(bEnd, { minTx: 40, maxTx: 47, minTy: 29, maxTy: 35 })
  })

  it('builds deterministic label cache keys', () => {
    const k1 = buildLabelCacheKey('Slime Lv.1', '#ffffff', 14, false)
    const k2 = buildLabelCacheKey('Slime Lv.1', '#ffffff', 14, true)
    assert.notEqual(k1, k2)
    assert.equal(k1, '0|14|#ffffff|Slime Lv.1')
  })

  it('evicts least recently used items cleanly in FastSpriteLruCache', () => {
    const cache = new FastSpriteLruCache<number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    assert.equal(cache.get('a'), 1) // 'a' becomes MRU; 'b' is LRU
    cache.set('c', 3)
    assert.equal(cache.size, 2)
    assert.equal(cache.get('b'), undefined)
    assert.equal(cache.get('a'), 1)
    assert.equal(cache.get('c'), 3)
  })

  it('indexes static props and tree overhead zones from map tile grid without DOM', () => {
    const town = MAPS.town
    assert.ok(town, 'town map should exist')
    const props = buildStaticMapPropDescriptors(town)
    assert.ok(props.length > 0, 'town should have static layered props')
    const trees = props.filter((p) => p.kind === 'tree' || p.kind === 'pine')
    assert.ok(trees.length > 0, 'town should include tree/pine props')
    for (const t of trees) {
      assert.ok(t.overheadZone, 'tree/pine prop should define overheadZone')
      assert.ok(t.overheadZone.x1 > t.overheadZone.x0)
      assert.ok(t.overheadZone.y1 > t.overheadZone.y0)
    }
  })
})
