'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Swords } from 'lucide-react'
import { expToNext } from '@/lib/game/data'
import { CharacterStatus, type CharacterStatusState } from './character-status'
import { ExpProgressionChart } from './exp-progression-chart'

const DEFAULT_STATUS: CharacterStatusState = {
  name: 'นักผจญภัย',
  jobName: 'Vanguard (นักดาบ)',
  level: 12,
  hp: 240,
  maxHp: 320,
  mp: 95,
  maxMp: 140,
  exp: 1050,
  maxExp: expToNext(12),
}

export function CharacterStatusView() {
  const [status, setStatus] = useState<CharacterStatusState>(DEFAULT_STATUS)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 py-2">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary md:text-xl">
            สถานะตัวละคร &amp; ความก้าวหน้าค่าประสบการณ์ (EXP)
          </h1>
          <p className="text-xs text-muted-foreground">
            ติดตามหลอดพลัง เลเวล และเส้นโค้ง EXP เทียบกับเลเวลตัวละครแบบเรียลไทม์
          </p>
        </div>

        <nav className="flex items-center gap-2">
          <Link
            href="/class-selector"
            className="pixel-btn flex items-center gap-1.5 bg-secondary px-3 py-1.5 text-xs text-foreground hover:brightness-110"
          >
            <Swords className="size-3.5" aria-hidden />
            เลือกสายอาชีพ
          </Link>
          <Link
            href="/"
            className="pixel-btn flex items-center gap-1.5 bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            กลับหน้าเกม
          </Link>
        </nav>
      </header>

      <div className="grid w-full items-start gap-5 lg:grid-cols-[minmax(320px,380px)_1fr]">
        <CharacterStatus initialState={DEFAULT_STATUS} onStatusChange={setStatus} />

        <ExpProgressionChart
          level={status.level}
          exp={status.exp}
          maxExp={status.maxExp}
          characterName={status.name}
          jobName={status.jobName}
        />
      </div>
    </div>
  )
}
