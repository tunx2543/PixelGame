'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

let deferredPromptCache: BeforeInstallPromptEvent | null = null

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getOnlineSnapshot() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

function getStandaloneSnapshot() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function subscribeStandalone(callback: () => void) {
  const mqlStandalone = window.matchMedia('(display-mode: standalone)')
  const mqlFullscreen = window.matchMedia('(display-mode: fullscreen)')
  mqlStandalone.addEventListener('change', callback)
  mqlFullscreen.addEventListener('change', callback)
  window.addEventListener('appinstalled', callback)
  return () => {
    mqlStandalone.removeEventListener('change', callback)
    mqlFullscreen.removeEventListener('change', callback)
    window.removeEventListener('appinstalled', callback)
  }
}

function getIOSSnapshot() {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
}

const noopSubscribe = () => () => undefined

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => deferredPromptCache,
  )
  const [installedOverride, setInstalledOverride] = useState(false)
  const standaloneMatched = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    () => false,
  )
  const isIOS = useSyncExternalStore(noopSubscribe, getIOSSnapshot, () => false)

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const evt = e as BeforeInstallPromptEvent
      deferredPromptCache = evt
      setDeferredPrompt(evt)
    }

    const onAppInstalled = () => {
      deferredPromptCache = null
      setDeferredPrompt(null)
      setInstalledOverride(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const install = async (): Promise<boolean> => {
    const promptEvt = deferredPrompt ?? deferredPromptCache
    if (!promptEvt) return false
    await promptEvt.prompt()
    const { outcome } = await promptEvt.userChoice
    if (outcome === 'accepted') {
      deferredPromptCache = null
      setDeferredPrompt(null)
      setInstalledOverride(true)
      return true
    }
    return false
  }

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled: installedOverride || standaloneMatched,
    isIOS,
    install,
  }
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribeOnline, getOnlineSnapshot, () => true)
}
