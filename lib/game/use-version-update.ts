'use client'

import { useEffect, useSyncExternalStore } from 'react'
import {
  GAME_BUILD_DATE,
  GAME_CHANGELOG,
  GAME_RELEASE_TITLE,
  GAME_VERSION,
  LOCAL_SEEN_VERSION_KEY,
  hasRemoteUpdate,
  isVersionUnseen,
  type ReleaseNote,
  type VersionPayload,
} from './version'

export interface VersionUpdateState {
  currentVersion: string
  buildDate: string
  releaseTitle: string
  remoteVersion: string | null
  remoteReleaseTitle: string | null
  changelog: ReleaseNote[]
  updateAvailable: boolean
  swUpdateReady: boolean
  unseenUpdate: boolean
  bannerDismissed: boolean
  checking: boolean
  lastCheckedAt: number | null
  checkStatusText: string | null
  checkError: string | null
  changelogOpen: boolean
  hasExternalChangelogHost: boolean
}

const INITIAL_STATE: VersionUpdateState = {
  currentVersion: GAME_VERSION,
  buildDate: GAME_BUILD_DATE,
  releaseTitle: GAME_RELEASE_TITLE,
  remoteVersion: null,
  remoteReleaseTitle: null,
  changelog: GAME_CHANGELOG,
  updateAvailable: false,
  swUpdateReady: false,
  unseenUpdate: false,
  bannerDismissed: false,
  checking: false,
  lastCheckedAt: null,
  checkStatusText: null,
  checkError: null,
  changelogOpen: false,
  hasExternalChangelogHost: false,
}

let state: VersionUpdateState = INITIAL_STATE
const listeners = new Set<() => void>()
let initialized = false
let inFlightCheck: Promise<boolean> | null = null
let lastCheckAttemptMs = 0

const AUTO_CHECK_INTERVAL_MS = 180_000
const AUTO_CHECK_THROTTLE_MS = 45_000

function emit(patch: Partial<VersionUpdateState>) {
  state = { ...state, ...patch }
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): VersionUpdateState {
  return state
}

function getServerSnapshot(): VersionUpdateState {
  return INITIAL_STATE
}

function readSeenVersion(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(LOCAL_SEEN_VERSION_KEY)
  } catch {
    return null
  }
}

function writeSeenVersion(version: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_SEEN_VERSION_KEY, version)
  } catch {
    // Ignore storage quota / privacy mode failures
  }
}

export function setExternalChangelogHost(active: boolean) {
  if (state.hasExternalChangelogHost !== active) {
    emit({ hasExternalChangelogHost: active })
  }
}

export function markVersionSeen() {
  writeSeenVersion(GAME_VERSION)
  if (state.unseenUpdate) {
    emit({ unseenUpdate: false })
  }
}

export function openChangelogModal() {
  markVersionSeen()
  emit({ changelogOpen: true })
}

export function closeChangelogModal() {
  markVersionSeen()
  emit({ changelogOpen: false })
}

export function dismissUpdateBanner() {
  emit({ bannerDismissed: true })
}

export function markServiceWorkerUpdateReady() {
  emit({
    swUpdateReady: true,
    updateAvailable: true,
    bannerDismissed: false,
    checkStatusText: 'พบไฟล์อัปเดตใหม่พร้อมติดตั้ง กรุณารีโหลดเกม',
  })
}

export async function checkForGameUpdates(manual = false): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (inFlightCheck) return inFlightCheck

  const now = Date.now()
  if (!manual && now - lastCheckAttemptMs < AUTO_CHECK_THROTTLE_MS) {
    return state.updateAvailable
  }
  lastCheckAttemptMs = now

  emit({
    checking: true,
    checkError: null,
    ...(manual ? { checkStatusText: 'กำลังตรวจสอบเวอร์ชั่นล่าสุด...' } : {}),
  })

  inFlightCheck = (async () => {
    try {
      const res = await fetch(`/api/version?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const payload = (await res.json()) as VersionPayload
      const remoteVersion = typeof payload.version === 'string' ? payload.version.trim() : GAME_VERSION
      const hasNewer = hasRemoteUpdate(GAME_VERSION, remoteVersion) || state.swUpdateReady
      const remoteNotes = Array.isArray(payload.changelog) && payload.changelog.length > 0
        ? payload.changelog
        : GAME_CHANGELOG

      emit({
        checking: false,
        remoteVersion,
        remoteReleaseTitle: payload.title || GAME_RELEASE_TITLE,
        changelog: remoteNotes,
        updateAvailable: hasNewer,
        bannerDismissed: hasNewer ? false : state.bannerDismissed,
        lastCheckedAt: Date.now(),
        checkError: null,
        checkStatusText: hasNewer
          ? `พบเวอร์ชั่นใหม่ v${remoteVersion} พร้อมอัปเดตแล้ว!`
          : `คุณกำลังใช้งานเวอร์ชั่นล่าสุด (v${GAME_VERSION})`,
      })
      return hasNewer
    } catch {
      emit({
        checking: false,
        lastCheckedAt: Date.now(),
        checkError: manual ? 'ไม่สามารถตรวจสอบอัปเดตได้ในขณะนี้' : null,
        checkStatusText: manual ? 'ตรวจสอบอัปเดตไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' : state.checkStatusText,
      })
      return false
    } finally {
      inFlightCheck = null
    }
  })()

  return inFlightCheck
}

export async function applyGameUpdateReload() {
  if (typeof window === 'undefined') return
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const reg of regs) {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
        await reg.update().catch(() => undefined)
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith('pixel-quest-pwa'))
          .map((key) => caches.delete(key)),
      )
    }
  } catch {
    // Proceed directly to hard reload if cache/SW cleanup is restricted
  }
  window.location.reload()
}

function bootstrapVersionMonitor() {
  if (typeof window === 'undefined' || initialized) return
  initialized = true

  const seenVersion = readSeenVersion()
  emit({
    unseenUpdate: isVersionUnseen(seenVersion, GAME_VERSION),
  })

  void checkForGameUpdates(false)

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      void checkForGameUpdates(false)
    }
  }
  const handleFocus = () => {
    void checkForGameUpdates(false)
  }

  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('focus', handleFocus)
  window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      void checkForGameUpdates(false)
    }
  }, AUTO_CHECK_INTERVAL_MS)
}

export function useVersionUpdate() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    bootstrapVersionMonitor()
  }, [])

  return snapshot
}
