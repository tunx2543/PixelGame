import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  getDefaultStorePaths,
  getGlobalSingleton,
  getRuntimeEnv,
  isCloudflareWorkersRuntime,
  readJsonStoreFile,
  resetGlobalSingleton,
  writeJsonStoreFile,
  type StoreFsOps,
} from './runtime-store'
import { GET as getTopupConfig } from '@/app/api/topup/config/route'
import { GET as getVersion } from '@/app/api/version/route'
import { GET as getWorldEvents } from '@/app/api/world/events/route'
import { GET as getSystemStatus } from '@/app/api/gm/system-status/route'

const CF_CONTEXT_SYMBOL = Symbol.for('__cloudflare-context__')

afterEach(() => {
  delete (globalThis as Record<PropertyKey, unknown>)[CF_CONTEXT_SYMBOL]
  resetGlobalSingleton('workers_compat_test_singleton')
})

describe('Phase 3 Cloudflare Workers Runtime Compatibility', () => {
  it('detects Workers runtime context and resolves secrets from Cloudflare env bindings', () => {
    const prevSecret = process.env.TEST_CF_WORKER_SECRET
    delete process.env.TEST_CF_WORKER_SECRET

    assert.equal(getRuntimeEnv('TEST_CF_WORKER_SECRET'), null)

    ;(globalThis as Record<PropertyKey, unknown>)[CF_CONTEXT_SYMBOL] = {
      env: {
        TEST_CF_WORKER_SECRET: '  cf-binding-secret-value  ',
      },
    }

    assert.equal(isCloudflareWorkersRuntime(), true)
    assert.equal(getRuntimeEnv('TEST_CF_WORKER_SECRET'), 'cf-binding-secret-value')

    if (prevSecret !== undefined) {
      process.env.TEST_CF_WORKER_SECRET = prevSecret
    }
  })

  it('skips bundle .data directory in Workers mode and degrades cleanly to isolate_memory_only on EROFS', () => {
    const paths = getDefaultStorePaths('test-workers.json')
    const calls: string[] = []

    const erofsFs: StoreFsOps = {
      existsSync: (p) => {
        calls.push(`exists:${p}`)
        return false
      },
      mkdirSync: (p) => {
        calls.push(`mkdir:${p}`)
        throw new Error('EROFS: read-only file system')
      },
      accessSync: (p) => {
        calls.push(`access:${p}`)
        throw new Error('EACCES: read-only')
      },
      readFileSync: () => {
        throw new Error('ENOENT')
      },
      writeFileSync: (p) => {
        calls.push(`write:${p}`)
        throw new Error('EROFS: read-only file system')
      },
      wOkFlag: 2,
    }

    const readRes = readJsonStoreFile(paths.primaryFile, paths.fallbackFile, {
      fsOps: erofsFs,
      workersRuntime: true,
    })
    assert.equal(readRes, null)
    // In Workers mode, primary .data file is not even probed
    assert.equal(calls.some((c) => c.includes('.data')), false)

    const mode = writeJsonStoreFile(paths.primaryDir, paths.primaryFile, paths.fallbackFile, '{"ok":true}', {
      fsOps: erofsFs,
      workersRuntime: true,
    })
    assert.equal(mode, 'isolate_memory_only')
    assert.equal(calls.some((c) => c.startsWith('mkdir:')), false)
    assert.deepEqual(calls.filter((c) => c.startsWith('write:')), [`write:${paths.fallbackFile}`])
  })

  it('retains globalThis singletons across module boundaries inside an isolate', () => {
    const first = getGlobalSingleton('workers_compat_test_singleton', () => ({ count: 1 }))
    first.count = 42
    const second = getGlobalSingleton('workers_compat_test_singleton', () => ({ count: 999 }))
    assert.equal(second.count, 42)
  })

  it('sets no-store Cache-Control on dynamic Workers API responses and keeps system-status GM-only', async () => {
    const configRes = await getTopupConfig()
    assert.equal(configRes.status, 200)
    assert.ok((configRes.headers.get('cache-control') ?? '').includes('no-store'))

    const versionRes = await getVersion()
    assert.equal(versionRes.status, 200)
    assert.ok((versionRes.headers.get('cache-control') ?? '').includes('no-store'))

    const worldRes = await getWorldEvents(new Request('https://example.workers.dev/api/world/events'))
    assert.equal(worldRes.status, 200)
    assert.ok((worldRes.headers.get('cache-control') ?? '').includes('no-store'))

    const guestSysRes = await getSystemStatus(new Request('https://example.workers.dev/api/gm/system-status'))
    assert.equal(guestSysRes.status, 403)
    assert.ok((guestSysRes.headers.get('cache-control') ?? '').includes('no-store'))
  })
})
