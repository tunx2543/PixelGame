import type { SaveData } from './engine'

export interface ResolvedSaveResult {
  save: SaveData | null
  source: 'cloud' | 'local' | 'none'
  localIsNewer: boolean
}

export function isValidSaveData(candidate: unknown): candidate is SaveData {
  if (!candidate || typeof candidate !== 'object') return false
  const obj = candidate as Partial<SaveData>
  return obj.version === 1 && typeof obj.name === 'string' && typeof obj.level === 'number'
}

export function pickNewerSave(
  cloudSave: SaveData | null | undefined,
  localSave: SaveData | null | undefined,
): ResolvedSaveResult {
  const hasCloud = isValidSaveData(cloudSave)
  const hasLocal = isValidSaveData(localSave)

  if (!hasCloud && !hasLocal) {
    return { save: null, source: 'none', localIsNewer: false }
  }
  if (!hasCloud && hasLocal) {
    return { save: localSave, source: 'local', localIsNewer: true }
  }
  if (hasCloud && !hasLocal) {
    return { save: cloudSave, source: 'cloud', localIsNewer: false }
  }

  const cloudTs = Number.isFinite(cloudSave!.savedAt) ? cloudSave!.savedAt : 0
  const localTs = Number.isFinite(localSave!.savedAt) ? localSave!.savedAt : 0

  if (localTs > cloudTs) {
    return { save: localSave!, source: 'local', localIsNewer: true }
  }
  return { save: cloudSave!, source: 'cloud', localIsNewer: false }
}
