'use client'

import { useEffect, useState } from 'react'
import { Download, Smartphone, WifiOff, X } from 'lucide-react'
import { useOnlineStatus, usePWAInstall } from '@/lib/game/use-pwa'

export function PwaRuntime() {
  const isOnline = useOnlineStatus()

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => undefined)
  }, [])

  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap border-2 border-[#0e0f1a] bg-amber-600/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg"
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden />
      <span>โหมดออฟไลน์ — ใช้ข้อมูลในเครื่อง</span>
    </div>
  )
}

export function PWAInstallButton({ variant = 'title' }: { variant?: 'title' | 'hud' }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall()
  const [showGuide, setShowGuide] = useState(false)

  if (isInstalled) return null

  // Inside gameplay HUD, only surface the button when native install or iOS guide is applicable
  if (variant === 'hud' && !isInstallable && !isIOS) {
    return null
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install()
      return
    }
    setShowGuide(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        className={
          variant === 'hud'
            ? 'pixel-btn col-span-2 flex items-center justify-center gap-1.5 border border-emerald-400/50 bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-500/25'
            : 'pixel-btn flex items-center gap-1.5 border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:brightness-110'
        }
      >
        {isIOS ? <Smartphone className="size-3.5" aria-hidden /> : <Download className="size-3.5" aria-hidden />}
        {isIOS ? 'ติดตั้งลง iPhone / iPad' : 'ติดตั้งแอป (PWA)'}
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="วิธีติดตั้งแอป Pixel Quest"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setShowGuide(false)
          }}
        >
          <div className="pixel-panel w-full max-w-sm p-4 text-left text-foreground">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-primary">
                <Smartphone className="size-4" aria-hidden />
                {isIOS ? 'วิธีติดตั้งบน iPhone / iPad' : 'ติดตั้งแอป & สร้างไฟล์ APK'}
              </h3>
              <button
                type="button"
                aria-label="ปิดหน้าต่างแนะนำการติดตั้ง"
                onClick={() => setShowGuide(false)}
                className="pixel-btn bg-secondary p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li>
                  1. เปิดเกมในเบราว์เซอร์ <strong className="text-foreground">Safari</strong>
                </li>
                <li>
                  2. กดปุ่ม <strong className="text-foreground">แชร์ (Share)</strong> ที่แถบด้านล่าง
                </li>
                <li>
                  3. เลื่อนลงแล้วเลือก <strong className="text-foreground">เพิ่มลงในหน้าจอโฮม (Add to Home Screen)</strong>
                </li>
              </ol>
            ) : (
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <p>
                  ระบบ PWA พร้อมใช้งานแล้ว! คุณสามารถติดตั้งเกมลงหน้าจอมือถือหรือแปลงเป็นไฟล์{' '}
                  <strong className="text-foreground">.APK</strong> ได้ทันที:
                </p>
                <ul className="space-y-1.5 border border-border bg-muted/60 p-2.5">
                  <li>
                    <strong className="text-foreground">บน Android Chrome / Edge:</strong> เปิดลิงก์เกมในแท็บเต็ม แล้วกดเมนูเบราว์เซอร์ {'->'}{' '}
                    <strong className="text-emerald-300">ติดตั้งแอป (Install app)</strong>
                  </li>
                  <li>
                    <strong className="text-foreground">แปลงเป็นไฟล์ .APK:</strong> นำ URL ของเกมไปวางใน{' '}
                    <span className="font-mono text-primary">pwabuilder.com</span> เพื่อแพ็กไฟล์ Android APK
                  </li>
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="pixel-btn mt-4 w-full bg-primary py-2 text-xs font-semibold text-primary-foreground hover:brightness-110"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}
    </>
  )
}
