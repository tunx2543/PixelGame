import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  buildBgmManifestFromExistingSet,
  resolveBgmManifest,
  type AssetsFetcher,
} from './bgm-manifest'

test('Node.js filesystem scan preserves exact theme and map track order', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgm-node-test-'))
  try {
    fs.writeFileSync(path.join(tmpDir, 'town.mp3'), 'stub')
    fs.writeFileSync(path.join(tmpDir, 'town.ogg'), 'stub')
    fs.writeFileSync(path.join(tmpDir, 'map_meadow.mp3'), 'stub')
    fs.writeFileSync(path.join(tmpDir, 'meadow.ogg'), 'stub')

    const manifest = await resolveBgmManifest({ bgmDir: tmpDir })
    assert.deepEqual(manifest.tracks.town, ['/audio/bgm/town.ogg', '/audio/bgm/town.mp3'])
    assert.deepEqual(manifest.tracks.battle, [])
    assert.deepEqual(manifest.mapTracks.town, ['/audio/bgm/town.ogg', '/audio/bgm/town.mp3'])
    assert.deepEqual(manifest.mapTracks.meadow, [
      '/audio/bgm/map_meadow.mp3',
      '/audio/bgm/meadow.ogg',
    ])
    assert.equal(manifest.mapTracks.cave, undefined)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})

test('Cloudflare ASSETS binding fallback resolves audio files when disk directory is absent', async () => {
  const virtualAssets = new Set(['/audio/bgm/login.ogg', '/audio/bgm/map_volcano.mp3', '/audio/bgm/boss.mp3'])
  const mockAssets: AssetsFetcher = {
    async fetch(input) {
      const req = input instanceof Request ? input : new Request(String(input))
      const pathname = new URL(req.url).pathname
      return new Response(null, { status: virtualAssets.has(pathname) ? 200 : 404 })
    },
  }

  const missingDir = path.join(os.tmpdir(), `nonexistent-bgm-${Date.now()}`)
  const manifest = await resolveBgmManifest({
    bgmDir: missingDir,
    requestUrl: 'https://pixel-saga.workers.dev/api/audio/bgm-manifest',
    assets: mockAssets,
  })

  assert.deepEqual(manifest.tracks.login, ['/audio/bgm/login.ogg'])
  assert.deepEqual(manifest.tracks.boss, ['/audio/bgm/boss.mp3'])
  assert.deepEqual(manifest.mapTracks.volcano, ['/audio/bgm/map_volcano.mp3'])
  assert.deepEqual(manifest.tracks.town, [])
})

test('Gracefully returns empty manifest when neither Node directory nor ASSETS binding exists', async () => {
  const missingDir = path.join(os.tmpdir(), `nonexistent-bgm-empty-${Date.now()}`)
  const manifest = await resolveBgmManifest({
    bgmDir: missingDir,
    assets: null,
  })
  assert.deepEqual(manifest, buildBgmManifestFromExistingSet(new Set()))
  assert.deepEqual(manifest.tracks.town, [])
  assert.deepEqual(manifest.mapTracks, {})
})
