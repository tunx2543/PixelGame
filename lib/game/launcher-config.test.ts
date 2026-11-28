import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_GAME_LAUNCHER_URL,
  getConfiguredGameLauncherUrl,
  getLauncherHostLabel,
  isRunningOnTargetOrigin,
  normalizeLauncherOrigin,
  resolveInitialLauncherMode,
  resolveLauncherTargetUrl,
} from './launcher-config'

describe('launcher-config', () => {
  it('defaults to the Cloudflare Workers URL', () => {
    assert.equal(DEFAULT_GAME_LAUNCHER_URL, 'https://pixelgame.ffsmilepay53.workers.dev')
    assert.equal(getConfiguredGameLauncherUrl(), 'https://pixelgame.ffsmilepay53.workers.dev')
    assert.equal(getLauncherHostLabel(DEFAULT_GAME_LAUNCHER_URL), 'pixelgame.ffsmilepay53.workers.dev')
  })

  it('normalizes trailing paths and rejects invalid protocols', () => {
    assert.equal(
      normalizeLauncherOrigin('https://pixelgame.ffsmilepay53.workers.dev/some/path?x=1'),
      'https://pixelgame.ffsmilepay53.workers.dev',
    )
    assert.equal(normalizeLauncherOrigin('javascript:alert(1)'), DEFAULT_GAME_LAUNCHER_URL)
    assert.equal(normalizeLauncherOrigin(''), DEFAULT_GAME_LAUNCHER_URL)
  })

  it('prevents iframe/redirect loops when already running on the target Workers origin', () => {
    assert.equal(
      isRunningOnTargetOrigin('https://pixelgame.ffsmilepay53.workers.dev', DEFAULT_GAME_LAUNCHER_URL),
      true,
    )
    assert.equal(isRunningOnTargetOrigin('http://localhost:3000', DEFAULT_GAME_LAUNCHER_URL), false)
    assert.equal(
      isRunningOnTargetOrigin('https://ais-dev-example.run.app', DEFAULT_GAME_LAUNCHER_URL),
      false,
    )
  })

  it('resolves launch target URLs and query/stored modes cleanly', () => {
    assert.equal(
      resolveLauncherTargetUrl(DEFAULT_GAME_LAUNCHER_URL),
      'https://pixelgame.ffsmilepay53.workers.dev',
    )
    assert.equal(
      resolveLauncherTargetUrl(DEFAULT_GAME_LAUNCHER_URL, { autostart: true }),
      'https://pixelgame.ffsmilepay53.workers.dev/?autostart=1',
    )
    assert.equal(resolveInitialLauncherMode('?launcher=workers', 'local'), 'workers')
    assert.equal(resolveInitialLauncherMode('?launcher=local', 'workers'), 'local')
    assert.equal(resolveInitialLauncherMode('', 'workers'), 'workers')
    assert.equal(resolveInitialLauncherMode('', null), 'local')
  })
})
