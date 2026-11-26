'use client'

import { testConnection } from './client'
import { preloadMapCatalogSprites, refreshCatalogMonsterSprites } from '@/lib/game/catalog-sprites'
import {
  getMonsterCacheRevision,
  MONSTER_CATALOG_VERSION,
  purgeStaleLocalMonsterCaches,
} from '@/lib/game/monster-cache'

let activeSyncPromise: Promise<{ revision: string; fromServer: boolean }> | null = null

/**
 * Synchronizes monster asset cache revision with fresh Firestore server connectivity
 * and purges any stale legacy monster caches in browser storage.
 */
export async function syncLatestMonsterAssetsAndFirestore(options?: {
  mapId?: string
  forceBust?: boolean
}): Promise<{ revision: string; fromServer: boolean }> {
  if (typeof window === 'undefined') {
    return { revision: MONSTER_CATALOG_VERSION, fromServer: false }
  }

  if (activeSyncPromise && !options?.forceBust) {
    return activeSyncPromise
  }

  const run = async (): Promise<{ revision: string; fromServer: boolean }> => {
    const purged = purgeStaleLocalMonsterCaches(Boolean(options?.forceBust))
    const fromServer = await testConnection()

    const revision =
      options?.forceBust || purged
        ? refreshCatalogMonsterSprites()
        : getMonsterCacheRevision()

    if (options?.mapId) {
      preloadMapCatalogSprites(options.mapId, Boolean(options?.forceBust || purged))
    }

    return { revision, fromServer }
  }

  activeSyncPromise = run().finally(() => {
    activeSyncPromise = null
  })

  return activeSyncPromise
}
