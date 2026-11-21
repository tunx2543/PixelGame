'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { JOBS } from '@/lib/game/data'
import { rebirth, resolvePlayerFashionLoadout } from '@/lib/game/engine'
import { useGame } from '@/lib/game/use-game'
import { resolveRebirthAuraSpec } from '@/lib/game/vfx-specs'
import { cn } from '@/lib/utils'
import { SpriteModelCanvas } from '../sprite-model-canvas'
import { PanelFrame, PxButton } from './panels'

const REBIRTH_TIERS = [1, 2, 3, 4, 5, 6] as const

export function RebirthPanel() {
  const { p } = useGame()
  const level = p?.level ?? 1
  const count = p?.rebirthCount ?? 0
  const jobId = p?.jobId ?? 'novice'
  const [selectedPreviewTier, setSelectedPreviewTier] = useState<number | null>(null)

  const defaultTier = count > 0 ? Math.min(6, count) : 1
  const previewTier = selectedPreviewTier ?? defaultTier
  const previewSpec = resolveRebirthAuraSpec(previewTier)
  const currentSpec = resolveRebirthAuraSpec(count)
  const nextSpec = resolveRebirthAuraSpec(Math.min(6, count + 1))

  return (
    <PanelFrame title="การจุติ" subtitle="เทวทูตแห่งการจุติ — ออร่า 6 ระดับพลัง">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Top Ascension Stage & Player Status */}
        <div
          className="grid gap-4 border p-4 sm:grid-cols-[152px_1fr] sm:items-center"
          style={{
            borderColor: `${previewSpec.primaryColor}55`,
            background:
              previewTier === 6
                ? 'radial-gradient(circle at 30% 45%, rgba(251,191,36,0.16), rgba(11,15,33,0.92) 72%)'
                : previewTier === 5
                  ? 'radial-gradient(circle at 30% 45%, rgba(168,85,247,0.18), rgba(11,15,33,0.92) 72%)'
                  : 'radial-gradient(circle at 30% 45%, rgba(56,189,248,0.15), rgba(11,15,33,0.92) 72%)',
          }}
        >
          <div className="mx-auto flex flex-col items-center">
            <div
              className="grid size-[144px] place-items-center border bg-[#0b0f21]/90 shadow-inner"
              style={{ borderColor: `${previewSpec.primaryColor}80` }}
            >
              <SpriteModelCanvas
                mode="job"
                id={jobId}
                action="idle"
                dir="down"
                size={136}
                fashion={resolvePlayerFashionLoadout(p)}
                rebirthCount={previewTier}
                label={`ตัวอย่างออร่า ${previewSpec.title}`}
              />
            </div>
            <span className="mt-1.5 text-[11px] font-bold" style={{ color: previewSpec.primaryColor }}>
              {`จุติ ระดับ ${previewTier} · ${previewSpec.shortTitle}`}
            </span>
          </div>

          <div className="flex flex-col justify-between gap-3 text-left">
            <div>
              <h3 className="flex items-center gap-1.5 text-base font-bold text-yellow-300">
                <Sparkles className="size-4 shrink-0" aria-hidden />
                เริ่มต้นใหม่ด้วยพลังเดิมที่เหนือกว่า
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                ต้องมีเลเวล 70 จึงจะจุติได้ (สูงสุด 6 ครั้ง) กลับสู่ {JOBS.novice.name} (ผู้ฝึกหัด) เลเวล 1 โดยคงค่าสเตตัสและอุปกรณ์เดิมทั้งหมด พร้อมปลดล็อกเอฟเฟคออร่าใหม่ทุกระดับ
              </p>
              <p className="mt-1.5 text-xs text-foreground/90">
                <span className="font-semibold" style={{ color: previewSpec.primaryColor }}>
                  {previewSpec.shortTitle}:
                </span>{' '}
                {previewSpec.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs tabular-nums">
              <div className="border border-border/80 bg-background/60 px-2.5 py-2">
                <span className="block text-[10px] text-muted-foreground">เลเวลปัจจุบัน</span>
                <b className={level >= 70 ? 'text-emerald-300' : 'text-primary'}>{level} / 70</b>
              </div>
              <div className="border border-border/80 bg-background/60 px-2.5 py-2">
                <span className="block text-[10px] text-muted-foreground">จุติแล้ว</span>
                <b style={{ color: currentSpec.primaryColor }}>{count} / 6 ครั้ง</b>
              </div>
              <div className="border border-border/80 bg-background/60 px-2.5 py-2">
                <span className="block text-[10px] text-muted-foreground">ระดับถัดไป</span>
                <b className="block truncate" style={{ color: nextSpec.primaryColor }}>
                  {count >= 6 ? 'สูงสุดแล้ว' : nextSpec.shortTitle}
                </b>
              </div>
            </div>

            <PxButton
              className="w-full"
              variant="accent"
              disabled={level < 70 || count >= 6}
              onClick={() => rebirth()}
            >
              {count >= 6
                ? 'จุติครบสูงสุด 6 ครั้งแล้ว'
                : level >= 70
                  ? `จุติครั้งที่ ${count + 1} · ${nextSpec.shortTitle} (กลับเลเวล 1)`
                  : `ต้องการเลเวล 70 (ตอนนี้ ${level})`}
            </PxButton>
          </div>
        </div>

        {/* 6-Tier Visual Showcase Grid */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-foreground">รูปแบบเอฟเฟคจุติทั้ง 6 ระดับ (คลิกเพื่อดูตัวอย่างขนาดใหญ่)</p>
            {selectedPreviewTier !== null && selectedPreviewTier !== defaultTier && (
              <button
                type="button"
                onClick={() => setSelectedPreviewTier(null)}
                className="text-[11px] text-primary underline underline-offset-2 hover:text-primary/80"
              >
                กลับไปดูระดับปัจจุบัน
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {REBIRTH_TIERS.map((tier) => {
              const spec = resolveRebirthAuraSpec(tier)
              const isSelected = previewTier === tier
              const isCurrent = count === tier
              const isUnlocked = count >= tier
              return (
                <button
                  key={tier}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedPreviewTier(tier)}
                  className={cn(
                    'flex flex-col items-center border p-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    isSelected
                      ? 'bg-[#11162c]'
                      : 'border-border/80 bg-[#0b0f21]/75 hover:border-border hover:bg-[#10152a]',
                  )}
                  style={{
                    borderColor: isSelected ? spec.primaryColor : undefined,
                  }}
                >
                  <div
                    className="flex w-full items-center justify-between gap-1 text-[10px]"
                    style={{ color: spec.primaryColor }}
                  >
                    <span className="font-bold">จุติ ระดับ {tier}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {isCurrent ? 'ใช้งานอยู่' : isUnlocked ? 'ปลดล็อกแล้ว' : 'ยังไม่ถึง'}
                    </span>
                  </div>

                  <div
                    className="mt-1.5 grid size-[96px] place-items-center border bg-[#090c1a]"
                    style={{ borderColor: `${spec.primaryColor}45` }}
                  >
                    <SpriteModelCanvas
                      mode="job"
                      id={jobId}
                      action="idle"
                      dir="down"
                      size={90}
                      rebirthCount={tier}
                      label={`ตัวอย่างเอฟเฟค ${spec.title}`}
                    />
                  </div>

                  <p className="mt-2 text-xs font-bold leading-tight" style={{ color: spec.primaryColor }}>
                    {spec.shortTitle}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                    {spec.subtitle}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </PanelFrame>
  )
}
