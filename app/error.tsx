'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { AlertTriangle, Home, RotateCcw } from 'lucide-react'

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error boundary caught:', error)
  }, [error])

  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-4">
      <div className="pixel-panel flex w-full max-w-md flex-col items-center gap-4 bg-card p-6 text-center">
        <div className="grid size-12 place-items-center border-2 border-destructive/60 bg-destructive/15 text-destructive">
          <AlertTriangle className="size-6" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-foreground">เกิดข้อผิดพลาดระหว่างโหลดหน้านี้</h1>
          <p className="text-xs leading-relaxed text-muted-foreground">
            ระบบตรวจพบปัญหาชั่วคราวระหว่างประมวลผลข้อมูลเกม ข้อมูลเซฟของคุณยังคงปลอดภัย
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="pixel-btn flex flex-1 items-center justify-center gap-1.5 bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:brightness-110"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            ลองโหลดใหม่อีกครั้ง
          </button>
          <Link
            href="/"
            className="pixel-btn flex flex-1 items-center justify-center gap-1.5 bg-secondary px-4 py-2.5 text-xs font-semibold text-foreground hover:brightness-110"
          >
            <Home className="size-3.5" aria-hidden />
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  )
}
