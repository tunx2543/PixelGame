'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import {
  CharacterClassSelector,
  CLASS_ROLE_OPTIONS,
  calculateClassBaseStats,
  type SelectableClassId,
} from '@/components/game/character-class-selector'
import { CharacterStatus } from '@/components/game/character-status'

export default function ClassSelectorPage() {
  const [selectedClass, setSelectedClass] = useState<SelectableClassId>('novice')
  const [level, setLevel] = useState<number>(1)

  const role = CLASS_ROLE_OPTIONS.find((r) => r.id === selectedClass) ?? CLASS_ROLE_OPTIONS[0]
  const stats = calculateClassBaseStats(selectedClass, level)

  return (
    <main className="flex h-dvh w-full flex-col items-center overflow-y-auto bg-background p-4 md:justify-center">
      <div className="mb-4 flex w-full max-w-4xl items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary">Character Class & Base Stats</h1>
          <p className="text-xs text-muted-foreground">
            ทดลองสลับสายอาชีพ Wayfarer / Vanguard / Arcanist / Windstalker / Luminary / Goldweaver / Nightveil เพื่อดูโมเดล 2D และค่าสถานะแบบเรียลไทม์
          </p>
        </div>

        <Link
          href="/"
          className="pixel-btn flex shrink-0 items-center gap-1.5 bg-secondary px-3 py-1.5 text-xs text-foreground hover:brightness-110"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          กลับหน้าเกม
        </Link>
      </div>

      <div className="grid w-full max-w-4xl items-start gap-4 lg:grid-cols-[1.25fr_0.9fr]">
        <div className="flex flex-col gap-3">
          <div className="pixel-panel flex items-center justify-between px-4 py-2.5 text-xs">
            <span className="text-muted-foreground">ระดับตัวละครที่ใช้คำนวณ Base Stats</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLevel((l) => Math.max(1, l - 5))}
                className="pixel-btn bg-secondary px-2 py-1 hover:brightness-110"
              >
                -5
              </button>
              <span className="min-w-12 text-center text-sm font-bold text-primary tabular-nums">
                Lv.{level}
              </span>
              <button
                type="button"
                onClick={() => setLevel((l) => Math.min(99, l + 5))}
                className="pixel-btn bg-secondary px-2 py-1 hover:brightness-110"
              >
                +5
              </button>
            </div>
          </div>

          <CharacterClassSelector
            value={selectedClass}
            level={level}
            onClassChange={(nextClass) => setSelectedClass(nextClass)}
          />
        </div>

        <CharacterStatus
          key={`${selectedClass}-${level}`}
          initialState={{
            name: 'นักผจญภัยพิกเซล',
            jobName: `${role.englishName} (${role.thaiName})`,
            level,
            hp: stats.maxHp,
            maxHp: stats.maxHp,
            mp: stats.maxMp,
            maxMp: stats.maxMp,
            exp: 420,
            maxExp: 1000,
          }}
        />
      </div>
    </main>
  )
}
