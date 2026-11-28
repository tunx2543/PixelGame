import fs from 'node:fs'
import path from 'node:path'

const CF_CONTEXT_SYMBOL = Symbol.for('__cloudflare-context__')
const SINGLETON_MAP_SYMBOL = Symbol.for('pixelquest.runtime.singletons')

export type StorePersistenceMode =
  | 'durable_d1'
  | 'durable_kv'
  | 'durable_do'
  | 'durable_redis'
  | 'durable_firestore'
  | 'durable_disk'
  | 'ephemeral_tmp'
  | 'isolate_memory_only'

export function isDurablePersistenceMode(mode: StorePersistenceMode): boolean {
  return (
    mode === 'durable_d1' ||
    mode === 'durable_kv' ||
    mode === 'durable_do' ||
    mode === 'durable_redis' ||
    mode === 'durable_firestore' ||
    mode === 'durable_disk'
  )
}

export interface StoreFsOps {
  existsSync: (p: string) => boolean
  mkdirSync: (p: string, opts?: { recursive?: boolean }) => unknown
  accessSync: (p: string, mode?: number) => void
  readFileSync: (p: string, encoding: 'utf8') => string
  writeFileSync: (p: string, data: string, encoding: 'utf8') => void
  wOkFlag: number
}

const NODE_FS_OPS: StoreFsOps = {
  existsSync: (p) => fs.existsSync(p),
  mkdirSync: (p, opts) => fs.mkdirSync(p, opts),
  accessSync: (p, mode) => fs.accessSync(p, mode),
  readFileSync: (p, encoding) => fs.readFileSync(p, encoding),
  writeFileSync: (p, data, encoding) => fs.writeFileSync(p, data, encoding),
  wOkFlag: fs.constants?.W_OK ?? 2,
}

export function isCloudflareWorkersRuntime(): boolean {
  const g = globalThis as Record<PropertyKey, unknown>
  if (g[CF_CONTEXT_SYMBOL]) return true
  if (typeof (g as { WebSocketPair?: unknown }).WebSocketPair !== 'undefined') return true
  if (typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers') return true
  return false
}

export function getRuntimeBinding<T = unknown>(key: string): T | null {
  const cfCtx = (globalThis as Record<PropertyKey, unknown>)[CF_CONTEXT_SYMBOL] as
    | { env?: Record<string, unknown> }
    | undefined
  const val = cfCtx?.env?.[key]
  return val !== undefined && val !== null ? (val as T) : null
}

export function getRuntimeEnv(key: string): string | null {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[key]?.trim() : undefined
  if (fromProcess) return fromProcess
  const cfCtx = (globalThis as Record<PropertyKey, unknown>)[CF_CONTEXT_SYMBOL] as
    | { env?: Record<string, unknown> }
    | undefined
  const fromCf = cfCtx?.env?.[key]
  if (typeof fromCf === 'string' && fromCf.trim()) {
    return fromCf.trim()
  }
  return null
}

export function getGlobalSingleton<T>(key: string, init: () => T): T {
  const g = globalThis as Record<PropertyKey, unknown>
  let bag = g[SINGLETON_MAP_SYMBOL] as Map<string, unknown> | undefined
  if (!bag) {
    bag = new Map<string, unknown>()
    g[SINGLETON_MAP_SYMBOL] = bag
  }
  if (!bag.has(key)) {
    bag.set(key, init())
  }
  return bag.get(key) as T
}

export function resetGlobalSingleton(key: string): void {
  const g = globalThis as Record<PropertyKey, unknown>
  const bag = g[SINGLETON_MAP_SYMBOL] as Map<string, unknown> | undefined
  bag?.delete(key)
}

export function getDefaultStorePaths(fileName: string): {
  primaryDir: string
  primaryFile: string
  fallbackFile: string
} {
  const primaryDir = path.join(process.cwd(), '.data')
  return {
    primaryDir,
    primaryFile: path.join(primaryDir, fileName),
    fallbackFile: `/tmp/pixelquest-${fileName}`,
  }
}

export function readJsonStoreFile<T>(
  primaryFile: string,
  fallbackFile: string,
  options?: { fsOps?: StoreFsOps; workersRuntime?: boolean },
): T | null {
  const fsOps = options?.fsOps ?? NODE_FS_OPS
  const isWorkers = options?.workersRuntime ?? isCloudflareWorkersRuntime()
  const candidates = isWorkers ? [fallbackFile] : [primaryFile, fallbackFile]
  for (const filePath of candidates) {
    try {
      if (fsOps.existsSync(filePath)) {
        const raw = fsOps.readFileSync(filePath, 'utf8')
        return JSON.parse(raw) as T
      }
    } catch {
      // Ignore missing or unreadable store file and try next candidate
    }
  }
  return null
}

export function writeJsonStoreFile(
  primaryDir: string,
  primaryFile: string,
  fallbackFile: string,
  payload: string,
  options?: { fsOps?: StoreFsOps; workersRuntime?: boolean },
): StorePersistenceMode {
  const fsOps = options?.fsOps ?? NODE_FS_OPS
  const isWorkers = options?.workersRuntime ?? isCloudflareWorkersRuntime()

  if (!isWorkers) {
    try {
      fsOps.mkdirSync(primaryDir, { recursive: true })
      fsOps.accessSync(primaryDir, fsOps.wOkFlag)
      fsOps.writeFileSync(primaryFile, payload, 'utf8')
      return 'durable_disk'
    } catch {
      // Fall through to ephemeral /tmp or memory-only mode
    }
  }

  try {
    fsOps.writeFileSync(fallbackFile, payload, 'utf8')
    return 'ephemeral_tmp'
  } catch {
    return 'isolate_memory_only'
  }
}
