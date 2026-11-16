import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeCameraZoom } from '../lib/game/camera'

describe('computeCameraZoom', () => {
  it('keeps full 2.4x zoom on standard desktop screens', () => {
    assert.equal(computeCameraZoom(1440, 900), 2.4)
    assert.equal(computeCameraZoom(1280, 720), 2.4)
  })

  it('keeps 1.6x zoom on mobile portrait screens', () => {
    assert.equal(computeCameraZoom(390, 844), 1.6)
    assert.equal(computeCameraZoom(412, 915), 1.6)
  })

  it('scales zoom down on wide-but-short mobile landscape screens so character does not fill screen', () => {
    const landscapeZoom = computeCameraZoom(844, 390)
    assert.ok(landscapeZoom < 1.5, `Expected landscape zoom < 1.5, got ${landscapeZoom}`)
    assert.ok(landscapeZoom >= 1.15, `Expected landscape zoom >= 1.15, got ${landscapeZoom}`)
    // Ensure at least ~270+ world px visible vertically
    assert.ok(390 / landscapeZoom >= 275)

    const smallLandscape = computeCameraZoom(667, 375)
    assert.ok(smallLandscape < 1.5)
    assert.ok(375 / smallLandscape >= 275)
  })
})
