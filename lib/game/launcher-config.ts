export const DEFAULT_GAME_LAUNCHER_URL = 'https://pixelgame.ffsmilepay53.workers.dev'
export const LAUNCHER_MODE_STORAGE_KEY = 'pixelquest_launcher_mode'

export type LauncherTargetMode = 'local' | 'workers'

const LAUNCHER_MODE_EVENT = 'pixelquest:launcher-mode-change'

export function normalizeLauncherOrigin(raw?: string | null): string {
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  if (!trimmed) return DEFAULT_GAME_LAUNCHER_URL
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return DEFAULT_GAME_LAUNCHER_URL
    }
    return parsed.origin
  } catch {
    return DEFAULT_GAME_LAUNCHER_URL
  }
}

export function getConfiguredGameLauncherUrl(): string {
  const envUrl =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GAME_LAUNCHER_URL) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_URL) ||
    ''
  return normalizeLauncherOrigin(envUrl)
}

export function getLauncherHostLabel(targetUrl: string): string {
  try {
    return new URL(normalizeLauncherOrigin(targetUrl)).host
  } catch {
    return 'pixelgame.ffsmilepay53.workers.dev'
  }
}

export function resolveLauncherTargetUrl(
  baseUrl: string = getConfiguredGameLauncherUrl(),
  options?: { autostart?: boolean },
): string {
  const origin = normalizeLauncherOrigin(baseUrl)
  if (options?.autostart) {
    return `${origin}/?autostart=1`
  }
  return origin
}

export function isRunningOnTargetOrigin(
  currentOrigin: string | null | undefined,
  targetUrl: string = getConfiguredGameLauncherUrl(),
): boolean {
  if (!currentOrigin || typeof currentOrigin !== 'string') return false
  try {
    return new URL(currentOrigin).origin === new URL(normalizeLauncherOrigin(targetUrl)).origin
  } catch {
    return false
  }
}

export function resolveInitialLauncherMode(
  search?: string | null,
  storedMode?: string | null,
): LauncherTargetMode {
  if (typeof search === 'string' && search.trim()) {
    try {
      const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
      const q = params.get('launcher')?.trim().toLowerCase()
      if (q === 'workers') return 'workers'
      if (q === 'local') return 'local'
    } catch {
      // Ignore malformed query strings
    }
  }
  return storedMode === 'workers' ? 'workers' : 'local'
}

export function readStoredLauncherMode(): LauncherTargetMode {
  if (typeof window === 'undefined') return 'local'
  try {
    return resolveInitialLauncherMode(window.location.search, window.localStorage.getItem(LAUNCHER_MODE_STORAGE_KEY))
  } catch {
    return 'local'
  }
}

export function setStoredLauncherMode(mode: LauncherTargetMode): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LAUNCHER_MODE_STORAGE_KEY, mode)
  } catch {
    // Ignore storage quota or private mode failures
  }
  window.dispatchEvent(new CustomEvent<LauncherTargetMode>(LAUNCHER_MODE_EVENT, { detail: mode }))
}

export function subscribeLauncherMode(listener: (mode: LauncherTargetMode) => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<LauncherTargetMode>).detail
    listener(detail === 'workers' ? 'workers' : 'local')
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === LAUNCHER_MODE_STORAGE_KEY) {
      listener(event.newValue === 'workers' ? 'workers' : 'local')
    }
  }
  window.addEventListener(LAUNCHER_MODE_EVENT, onCustom)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(LAUNCHER_MODE_EVENT, onCustom)
    window.removeEventListener('storage', onStorage)
  }
}
