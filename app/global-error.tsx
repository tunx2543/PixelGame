'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <html lang="th" className="h-full bg-[#0e0f1a] text-[#f5efe6]">
      <body className="flex h-full items-center justify-center p-4 font-sans antialiased">
        <div className="flex w-full max-w-md flex-col items-center gap-4 border-2 border-[#393d5c] bg-[#161829] p-6 text-center shadow-lg">
          <div className="grid size-12 place-items-center border-2 border-red-400/60 bg-red-500/15 text-red-400">
            <AlertTriangle className="size-6" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold">ไม่สามารถโหลดหน้าเกมได้ชั่วคราว</h1>
            <p className="text-xs leading-relaxed text-[#b7b3c7]">
              เกิดข้อผิดพลาดระดับแอปพลิเคชัน กรุณากดลองใหม่อีกครั้งหรือรีเฟรชหน้าเว็บ
            </p>
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="flex w-full items-center justify-center gap-1.5 border-2 border-[#f4b41b] bg-[#f4b41b] px-4 py-2.5 text-xs font-bold text-[#14111c] hover:brightness-110"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            โหลดแอปใหม่อีกครั้ง
          </button>
        </div>
      </body>
    </html>
  )
}
