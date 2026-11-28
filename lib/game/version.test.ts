import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GAME_CHANGELOG,
  GAME_VERSION,
  compareSemver,
  getLatestReleaseNote,
  getVersionPayload,
  hasRemoteBuildUpdate,
  hasRemoteUpdate,
  isVersionUnseen,
} from './version'

test('compareSemver compares major, minor, patch, and v-prefixed strings accurately', () => {
  assert.equal(compareSemver('1.4.0', '1.4.0'), 0)
  assert.equal(compareSemver('v1.4.0', '1.4.0'), 0)
  assert.equal(compareSemver('1.4.1', '1.4.0'), 1)
  assert.equal(compareSemver('1.5.0', '1.4.9'), 1)
  assert.equal(compareSemver('2.0.0', '1.99.99'), 1)
  assert.equal(compareSemver('1.3.9', '1.4.0'), -1)
  assert.equal(compareSemver('1.4', '1.4.0'), 0)
  assert.equal(compareSemver('1.4.0.1', '1.4.0'), 1)
})

test('hasRemoteUpdate only triggers when remote version is strictly newer', () => {
  assert.equal(hasRemoteUpdate('1.4.0', '1.4.0'), false)
  assert.equal(hasRemoteUpdate('1.4.0', '1.3.9'), false)
  assert.equal(hasRemoteUpdate('1.4.0', null), false)
  assert.equal(hasRemoteUpdate('1.4.0', '1.4.1'), true)
  assert.equal(hasRemoteUpdate('1.4.0', 'v1.5.0'), true)
  assert.equal(hasRemoteUpdate('1.4.0', '2.0.0'), true)
})

test('hasRemoteBuildUpdate detects real-time code deployments via buildId or Cloudflare deployVersionId', () => {
  assert.equal(
    hasRemoteBuildUpdate({
      clientVersion: '1.4.2',
      remoteVersion: '1.4.2',
      clientBuildId: 'dev-local',
      remoteBuildId: 'build-abc',
    }),
    false,
  )
  assert.equal(
    hasRemoteBuildUpdate({
      clientVersion: '1.4.2',
      remoteVersion: '1.4.2',
      clientBuildId: 'build-1',
      remoteBuildId: 'build-1',
      initialDeployVersionId: 'cf-ver-1',
      remoteDeployVersionId: 'cf-ver-1',
    }),
    false,
  )
  assert.equal(
    hasRemoteBuildUpdate({
      clientVersion: '1.4.2',
      remoteVersion: '1.4.2',
      clientBuildId: 'build-1',
      remoteBuildId: 'build-2',
    }),
    true,
  )
  assert.equal(
    hasRemoteBuildUpdate({
      clientVersion: '1.4.2',
      remoteVersion: '1.4.2',
      clientBuildId: 'build-1',
      remoteBuildId: 'build-1',
      initialDeployVersionId: 'cf-ver-1',
      remoteDeployVersionId: 'cf-ver-2',
    }),
    true,
  )
})

test('isVersionUnseen detects first launch and newer client builds', () => {
  assert.equal(isVersionUnseen(null, '1.4.0'), true)
  assert.equal(isVersionUnseen('', '1.4.0'), true)
  assert.equal(isVersionUnseen('1.3.0', '1.4.0'), true)
  assert.equal(isVersionUnseen('1.4.0', '1.4.0'), false)
  assert.equal(isVersionUnseen('1.5.0', '1.4.0'), false)
})

test('getVersionPayload exposes current version and chronological changelog', () => {
  const payload = getVersionPayload()
  const latest = getLatestReleaseNote()
  assert.equal(payload.version, GAME_VERSION)
  assert.equal(payload.changelog.length, GAME_CHANGELOG.length)
  assert.ok(payload.changelog.length >= 1)
  assert.equal(latest.version, GAME_VERSION)
  assert.ok(latest.updates.length >= 1)
  assert.ok(latest.improvements.length >= 1)
  assert.ok(latest.bugFixes.length >= 1)
  assert.ok(payload.latestNotes.length >= 1)
  assert.equal(typeof payload.serverTimeMs, 'number')
})
