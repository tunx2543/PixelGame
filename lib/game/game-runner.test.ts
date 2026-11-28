import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeCanvasViewportMetrics,
  createFramePacerState,
  resolveRunnerBackend,
  shouldNotifyUiForCooldowns,
  shouldStepFrame,
  stepFrameDelta,
} from './game-runner-core'
import { LAYERED_PROP_TILES, TOWN_STRUCTURES } from './map-decor-meta'
import { T } from './maps'
import { getUiPreferences, type UiPreferences } from './ui-layout'

const BASE_PREFS: UiPreferences = getUiPreferences()

test('resolveRunnerBackend defaults to sprite-runner and only enables hd-legacy once lazy module is ready', () => {
  const defaultRes = resolveRunnerBackend(BASE_PREFS, false)
  assert.equal(defaultRes.requestedEngine, 'fast')
  assert.equal(defaultRes.activeEngine, 'fast')
  assert.equal(defaultRes.backend, 'sprite-runner')

  const pendingHd = resolveRunnerBackend({ ...BASE_PREFS, renderEngine: 'hd' }, false)
  assert.equal(pendingHd.requestedEngine, 'hd')
  assert.equal(pendingHd.activeEngine, 'fast')
  assert.equal(pendingHd.backend, 'sprite-runner')

  const activeHd = resolveRunnerBackend({ ...BASE_PREFS, renderEngine: 'hd' }, true)
  assert.equal(activeHd.requestedEngine, 'hd')
  assert.equal(activeHd.activeEngine, 'hd')
  assert.equal(activeHd.backend, 'hd-legacy')
})

test('frame pacer respects fpsLimit and clamps delta time cleanly', () => {
  const pacer = createFramePacerState(1000)
  assert.equal(shouldStepFrame(pacer, 1008, 0), true)
  assert.equal(shouldStepFrame(pacer, 1010, 30), false)
  assert.equal(shouldStepFrame(pacer, 1034, 30), true)

  const dtClamped = stepFrameDelta(pacer, 1500)
  assert.equal(dtClamped, 0.06)
  assert.equal(pacer.lastLoopAt, 1500)
  assert.equal(pacer.lastRenderedAt, 1500)
})

test('computeCanvasViewportMetrics returns crisp pixel sizing and runner metadata', () => {
  const metrics = computeCanvasViewportMetrics(1280, 720, 2, BASE_PREFS, false, false)
  assert.equal(metrics.renderEngine, 'fast')
  assert.equal(metrics.backend, 'sprite-runner')
  assert.equal(metrics.dpr, 1.5)
  assert.equal(metrics.width, 1920)
  assert.equal(metrics.height, 1080)
  assert.equal(metrics.imageRendering, 'auto')
})

test('shouldNotifyUiForCooldowns detects active cooldowns or combos without scanning when idle', () => {
  assert.equal(
    shouldNotifyUiForCooldowns({
      skillCd: { a: 0, b: 0 },
      itemCd: { hp: 0 },
      guardCd: 0,
      dashCd: 0,
      comboCount: 0,
    }),
    false,
  )
  assert.equal(
    shouldNotifyUiForCooldowns({
      skillCd: { a: 0.4 },
      itemCd: {},
      guardCd: 0,
      dashCd: 0,
      comboCount: 0,
    }),
    true,
  )
})

test('map-decor-meta exposes town structures and prop tiles without loading HD asset pipeline', () => {
  assert.ok(TOWN_STRUCTURES.length >= 9)
  assert.equal(LAYERED_PROP_TILES.has(T.TREE), true)
  assert.equal(LAYERED_PROP_TILES.has(T.GRASS), false)
})
