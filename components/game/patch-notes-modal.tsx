'use client'

import { Bug, CheckCircle2, RefreshCw, Sparkles, Wrench, X } from 'lucide-react'
import {
  applyGameUpdateReload,
  checkForGameUpdates,
  closeChangelogModal,
  useVersionUpdate,
} from '@/lib/game/use-version-update'
import { compareSemver, type ReleaseNote } from '@/lib/game/version'

export interface PatchNotesModalProps {
  open?: boolean
  onClose?: () => void
  isNewUpdateBanner?: boolean
}

function PatchSection({
  label,
  items,
  tone,
  icon,
}: {
  label: string
  items: string[]
  tone: 'update' | 'improvement' | 'bugfix'
  icon: React.ReactNode
}) {
  if (items.length === 0) return null

  const badgeStyle =
    tone === 'update'
      ? 'text-amber-300'
      : tone === 'improvement'
        ? 'text-sky-300'
        : 'text-emerald-300'

  const dotStyle =
    tone === 'update'
      ? 'bg-amber-400'
      : tone === 'improvement'
        ? 'bg-sky-400'
        : 'bg-emerald-400'

  return (
    <div className="space-y-1">
      <p className={`flex items-center gap-1.5 text-[11px] font-bold ${badgeStyle}`}>
        {icon}
        {label}
      </p>
      <ul className="space-y-1 pl-1 text-[11px] leading-relaxed text-muted-foreground">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dotStyle}`} aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ReleaseCard({
  entry,
  index,
  currentVersion,
}: {
  entry: ReleaseNote
  index: number
  currentVersion: string
}) {
  const isCurrent = entry.version === currentVersion
  const isNewerThanClient = compareSemver(entry.version, currentVersion) > 0

  const updates = entry.updates?.length ? entry.updates : entry.highlights ?? []
  const improvements = entry.improvements ?? []
  const bugFixes = entry.bugFixes ?? []

  return (
    <div
      className={`rounded-lg border p-3 ${
        isNewerThanClient
          ? 'border-emerald-400/65 bg-emerald-500/10'
          : isCurrent
            ? 'border-amber-400/60 bg-[#23191c]/90'
            : 'border-border bg-secondary/35'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded border border-[#c9963b]/60 bg-[#140f12] px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
            v{entry.version}
          </span>
          {isNewerThanClient ? (
            <span className="rounded bg-emerald-500/25 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
              ใหม่บนเซิร์ฟเวอร์
            </span>
          ) : isCurrent || index === 0 ? (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
              <CheckCircle2 className="size-3" aria-hidden />
              เวอร์ชั่นปัจจุบัน
            </span>
          ) : null}
        </div>
        <span className="text-[11px] text-muted-foreground">{entry.date}</span>
      </div>

      <p className="mt-1.5 text-xs font-bold text-foreground">{entry.title}</p>

      <div className="mt-2.5 space-y-2.5">
        <PatchSection
          label="อัปเดตใหม่ (Updates)"
          items={updates}
          tone="update"
          icon={<Sparkles className="size-3 shrink-0" aria-hidden />}
        />
        <PatchSection
          label="การปรับปรุง (Improvements)"
          items={improvements}
          tone="improvement"
          icon={<Wrench className="size-3 shrink-0" aria-hidden />}
        />
        <PatchSection
          label="แก้ไขบั๊ก (Bug Fixes)"
          items={bugFixes}
          tone="bugfix"
          icon={<Bug className="size-3 shrink-0" aria-hidden />}
        />
      </div>
    </div>
  )
}

export function PatchNotesModal({ open, onClose, isNewUpdateBanner }: PatchNotesModalProps = {}) {
  const v = useVersionUpdate()
  const isOpen = open ?? v.changelogOpen

  if (!isOpen) return null

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      closeChangelogModal()
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="บันทึกแพตช์และอัปเดตเกม Pixel Quest"
      data-testid="patch-notes-modal"
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/75 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="pixel-panel flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden p-4 text-left text-foreground shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="flex items-center gap-1.5 text-base font-bold text-amber-300">
                <Sparkles className="size-4 shrink-0" aria-hidden />
                บันทึกการอัปเดต (Patch Notes)
              </h2>
              <span className="rounded border border-amber-400/50 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-200">
                v{v.currentVersion}
              </span>
              {(isNewUpdateBanner || v.unseenUpdate) && (
                <span className="rounded bg-emerald-500/25 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  อัปเดตใหม่!
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              อัปเดตล่าสุด {v.buildDate} •{' '}
              {v.updateAvailable
                ? `พบเวอร์ชั่นใหม่ v${v.remoteVersion ?? v.currentVersion} บนเซิร์ฟเวอร์`
                : 'ใช้งานเวอร์ชั่นล่าสุดแล้ว'}
            </p>
          </div>
          <button
            type="button"
            aria-label="ปิดหน้าต่างบันทึกการอัปเดต"
            onClick={handleClose}
            className="pixel-btn shrink-0 bg-secondary p-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {v.updateAvailable && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-400/60 bg-amber-500/15 px-3 py-2 text-xs">
            <div className="min-w-0">
              <p className="font-bold text-amber-200">
                ตรวจพบอัปเดตใหม่บนเซิร์ฟเวอร์{v.remoteVersion ? ` (v${v.remoteVersion})` : ''}
              </p>
              <p className="text-[11px] text-foreground/85">กดปุ่มรีโหลดเพื่อดึงเวอร์ชั่นล่าสุดทันที</p>
            </div>
            <button
              type="button"
              onClick={() => void applyGameUpdateReload()}
              className="pixel-btn inline-flex items-center gap-1 bg-gradient-to-b from-amber-400 to-amber-600 px-3 py-1.5 text-[11px] font-bold text-[#241409] hover:brightness-110"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              อัปเดตและรีโหลด
            </button>
          </div>
        )}

        <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
          {v.changelog.map((entry, idx) => (
            <ReleaseCard
              key={entry.version}
              entry={entry}
              index={idx}
              currentVersion={v.currentVersion}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="text-[11px] text-muted-foreground">
            {v.checkStatusText || `เวอร์ชั่นในเครื่อง v${v.currentVersion}`}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={v.checking}
              onClick={() => void checkForGameUpdates(true)}
              className="pixel-btn inline-flex items-center gap-1.5 bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:brightness-110 disabled:opacity-60"
            >
              <RefreshCw className={`size-3.5 ${v.checking ? 'animate-spin' : ''}`} aria-hidden />
              {v.checking ? 'กำลังตรวจสอบ...' : 'ตรวจสอบอัปเดต'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="pixel-btn bg-gradient-to-b from-amber-400 to-amber-600 px-3.5 py-1.5 text-xs font-bold text-[#241409] hover:brightness-110"
            >
              รับทราบ / เข้าสู่เกม
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
