import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CharacterStatus } from '@/components/game/character-status'

export default function CharacterStatusPage() {
  return (
    <main className="flex h-dvh w-full flex-col items-center justify-center gap-5 overflow-y-auto bg-background p-4">
      <div className="flex w-full max-w-md items-center justify-between">
        <h1 className="text-lg font-bold text-primary">ตัวอย่าง CharacterStatus</h1>
        <Link
          href="/"
          className="pixel-btn flex items-center gap-1.5 bg-secondary px-3 py-1.5 text-xs text-foreground hover:brightness-110"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          กลับหน้าเกม
        </Link>
      </div>

      <CharacterStatus />
    </main>
  )
}
