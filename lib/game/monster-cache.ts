export const MONSTER_CATALOG_VERSION = '288-v2'
export const MONSTER_CATALOG_VERSION_KEY = 'pixel-rpg-monster-catalog-version'

const STALE_MONSTER_LOCAL_CACHE_KEYS = [
  'pixel-rpg-local-worldboss-v1',
  'pixel-rpg-local-field-boss-v1',
] as const

const LEGACY_FIELD_OR_WORLD_BOSS_IDS = new Set([
  'fb_king_slime',
  'fb_elder_treant',
  'fb_crystal_golem',
  'fb_ifrit_lord',
  'slime',
  'goblin',
  'skeleton',
  'wolf',
  'earth_golem',
  'ifrit_lord',
  'abyss_dragon',
  'demon_lord',
])

let activeRevision = MONSTER_CATALOG_VERSION
const cacheInvalidationListeners = new Set<() => void>()
let staleLocalCachesChecked = false

function notifyInvalidationListeners(): void {
  for (const listener of cacheInvalidationListeners) {
    try {
      listener()
    } catch {
      // Ignore subscriber errors during cache busting.
    }
  }
}

export function getMonsterCacheRevision(): string {
  return activeRevision
}

export function setMonsterCacheRevision(revision: string): boolean {
  const clean = revision.trim()
  if (!clean || clean === activeRevision) return false
  activeRevision = clean
  notifyInvalidationListeners()
  return true
}

export function invalidateMonsterAssetCache(nextRevision?: string): string {
  const candidate =
    nextRevision?.trim() ||
    `${MONSTER_CATALOG_VERSION}-${Date.now().toString(36)}`
  activeRevision = candidate
  notifyInvalidationListeners()
  return activeRevision
}

export function subscribeMonsterCacheInvalidation(listener: () => void): () => void {
  cacheInvalidationListeners.add(listener)
  return () => {
    cacheInvalidationListeners.delete(listener)
  }
}

export function withMonsterCacheBust(url: string, revisionOverride?: string): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url
  const rev = encodeURIComponent((revisionOverride ?? activeRevision).trim() || MONSTER_CATALOG_VERSION)
  const sep = url.includes('?') ? '&' : '?'
  if (/[?&]v=/.test(url)) {
    return url.replace(/([?&]v=)[^&]*/, `$1${rev}`)
  }
  return `${url}${sep}v=${rev}`
}

export function purgeStaleLocalMonsterCaches(force = false): boolean {
  if (typeof window === 'undefined') return false
  if (staleLocalCachesChecked && !force) return false
  staleLocalCachesChecked = true

  let purged = false
  try {
    const storedVersion = window.localStorage.getItem(MONSTER_CATALOG_VERSION_KEY)
    const versionMismatch = storedVersion !== MONSTER_CATALOG_VERSION

    if (versionMismatch || force) {
      for (const key of STALE_MONSTER_LOCAL_CACHE_KEYS) {
        const raw = window.localStorage.getItem(key)
        if (!raw) continue
        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>
          if (key === 'pixel-rpg-local-worldboss-v1') {
            const bossId = typeof parsed?.bossId === 'string' ? parsed.bossId : ''
            if (!bossId || LEGACY_FIELD_OR_WORLD_BOSS_IDS.has(bossId) || versionMismatch) {
              window.localStorage.removeItem(key)
              purged = true
            }
          } else {
            const entries = Object.values(parsed ?? {})
            const hasLegacy = entries.some(
              (entry) =>
                Boolean(entry) &&
                typeof entry === 'object' &&
                LEGACY_FIELD_OR_WORLD_BOSS_IDS.has(String((entry as { bossId?: string }).bossId ?? '')),
            )
            if (hasLegacy || versionMismatch) {
              window.localStorage.removeItem(key)
              purged = true
            }
          }
        } catch {
          window.localStorage.removeItem(key)
          purged = true
        }
      }
      window.localStorage.setItem(MONSTER_CATALOG_VERSION_KEY, MONSTER_CATALOG_VERSION)
    }
  } catch {
    // Ignore storage access errors in restricted environments.
  }

  return purged
}
