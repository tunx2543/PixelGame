'use client'

import { rebirth } from '@/lib/game/engine'
import { useGame } from '@/lib/game/use-game'
import { resolveRebirthAuraSpec } from '@/lib/game/vfx-specs'
import { cn } from '@/lib/utils'
import { SpriteModelCanvas } from '../sprite-model-canvas'
import { PanelFrame, PxButton } from './panels'

const REBIRTH_STAGES = [
  { key: '1-4', previewCount: 1, range: 'จุติ 1–4', activeCheck: (c: number) => c >= 1 && c <= 4 },
  { key: '5', previewCount: 5, range: 'จุติ 5', activeCheck: (c: number) => c === 5 },
  { key: '6', previewCount: 6, range: 'จุติ 6', activeCheck: (c: number) => c >= 6 },
] as const

export function RebirthPanel() {
  const { p } = useGame()
  const level = p?.level ?? 1
  const count = p?.rebirthCount ?? 0
  const jobId = p?.jobId ?? 'novice'
  const currentAura = resolveRebirthAuraSpec(count)
  const nextAura = resolveRebirthAuraSpec(Math.min(6, count + 1))

  return (
    <PanelFrame title="การจุติ" subtitle="เทวทูตแห่งการจุติ — ออร่า 3 ระดับพลัง">
      <div className="mx-auto max-w-2xl border border-yellow-400/40 bg-yellow-400/5 p-4 text-center">
        <div className="mx-auto grid size-24 place-items-center border border-yellow-300/50 bg-[#131726]">
          <SpriteModelCanvas
            mode="job"
            id={jobId}
            action="idle"
            dir="down"
            size={88}
            isGm={p?.gm}
            rebirthCount={count}
            label={`ออร่าจุติปัจจุบัน ${currentAura.title}`}
          />
        </div>
        <h3 className="mt-3 text-lg font-bold text-yellow-300">เริ่มต้นใหม่ด้วยพลังเดิม</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          ต้องมีเลเวล 70 จึงจะจุติได้ (สูงสุด 6 ครั้ง) คงค่าสเตตัสและอุปกรณ์เดิมทั้งหมด พร้อมปลดล็อกเอฟเฟคจุติใหม่
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2 text-left text-xs tabular-nums">
          <div className="border border-border bg-background/60 p-2">
            <span className="block text-[10px] text-muted-foreground">เลเวลปัจจุบัน</span>
            <b className="text-primary">{level} / 70</b>
          </div>
          <div className="border border-border bg-background/60 p-2">
            <span className="block text-[10px] text-muted-foreground">จุติแล้ว</span>
            <b className="text-yellow-300">{count} / 6 ครั้ง</b>
          </div>
          <div className="border border-border bg-background/60 p-2">
            <span className="block text-[10px] text-muted-foreground">เอฟเฟคถัดไป</span>
            <b style={{ color: nextAura.primaryColor }}>{nextAura.title.split(' ')[0]}</b>
          </div>
        </div>

        {/* Visual Showcase of Rebirth Tiers 1-4 (same), 5 (changed), 6 (distinct) */}
        <div className="mt-4 text-left">
          <p className="mb-2 text-xs font-semibold text-foreground">รูปแบบเอฟเฟคออร่าจุติทั้ง 3 ขั้น</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {REBIRTH_STAGES.map((stage) => {
              const spec = resolveRebirthAuraSpec(stage.previewCount)
              const isCurrent = stage.activeCheck(count)
              return (
                <div
                  key={stage.key}
                  className={cn(
                    'flex flex-col items-center border p-2.5 text-center',
                    isCurrent ? 'border-primary bg-primary/10' : 'border-border/80 bg-background/50',
                  )}
                >
                  <div className="grid size-20 place-items-center border border-[#0e0f1a] bg-[#131726]">
                    <SpriteModelCanvas
                      mode="job"
                      id={jobId}
                      action="idle"
                      dir="down"
                      size={76}
                      rebirthCount={stage.previewCount}
                      label={`ตัวอย่างเอฟเฟค ${stage.range}`}
                    />
                  </div>
                  <p className="mt-1.5 text-xs font-bold" style={{ color: spec.primaryColor }}>
                    {stage.range}
                    {isCurrent ? ' · ปัจจุบัน' : ''}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-foreground">{spec.title.replace(/\s*\(.*?\)/, '')}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{spec.subtitle}</p>
                </div>
              )
            })}
          </div>
        </div>

        <PxButton className="mt-4 w-full" variant="accent" disabled={level < 70 || count >= 6} onClick={() => rebirth()}>
          {count >= 6 ? 'จุติครบสูงสุด 6 ครั้งแล้ว' : level >= 70 ? `จุติครั้งที่ ${count + 1} (กลับเลเวล 1)` : `ต้องการเลเวล 70 (ตอนนี้ ${level})`}
        </PxButton>
      </div>
    </PanelFrame>
  )
}
