'use client'

import { RefreshCw, Sparkles, X } from 'lucide-react'
import {
  applyGameUpdateReload,
  closeChangelogModal,
  dismissUpdateBanner,
  openChangelogModal,
  useVersionUpdate,
} from '@/lib/game/use-version-update'
import { compareSemver } from '@/lib/game/version'
import { PatchNotesModal } from './patch-notes-modal'

export function VersionUpdateBanner() {
  const v = useVersionUpdate()

  if (!v.updateAvailable || v.bannerDismissed) return null

  const targetVersion =
    v.remoteVersion && compareSemver(v.remoteVersion, v.currentVersion) > 0
      ? v.remoteVersion
      : null

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="version-update-banner"
      className="fixed left-1/2 top-2.5 z-50 flex w-[min(94vw,30rem)] -translate-x-1/2 items-center justify-between gap-2 rounded-lg border-2 border-amber-400/80 bg-[#1a1316]/95 px-3 py-2 text-xs text-foreground shadow-2xl backdrop-blur-sm"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-md border border-amber-400/50 bg-amber-500/20 text-amber-300">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate font-bold text-amber-300">
            {targetVersion
              ? `มีอัปเดตเวอร์ชั่นใหม่ v${targetVersion} พร้อมให้เล่นแล้ว!`
              : 'พบไฟล์เกมเวอร์ชั่นใหม่พร้อมอัปเดต!'}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {v.remoteReleaseTitle || `เวอร์ชั่นปัจจุบันของคุณ v${v.currentVersion}`}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => openChangelogModal()}
          className="pixel-btn bg-secondary px-2 py-1 text-[10px] font-semibold text-foreground hover:brightness-110"
        >
          รายละเอียด
        </button>
        <button
          type="button"
          onClick={() => void applyGameUpdateReload()}
          className="pixel-btn inline-flex items-center gap-1 bg-gradient-to-b from-amber-400 to-amber-600 px-2.5 py-1 text-[10px] font-bold text-[#241409] hover:brightness-110"
        >
          <RefreshCw className="size-3" aria-hidden />
          อัปเดตเลย
        </button>
        <button
          type="button"
          aria-label="ปิดการแจ้งเตือนอัปเดตชั่วคราว"
          onClick={() => dismissUpdateBanner()}
          className="p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  )
}

export function VersionChangelogModal() {
  const v = useVersionUpdate()

  if (v.hasExternalChangelogHost) return null

  return <PatchNotesModal open={v.changelogOpen} onClose={closeChangelogModal} />
}
