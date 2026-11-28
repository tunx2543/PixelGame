'use client'

import dynamic from 'next/dynamic'
import { Component, useCallback, useEffect, useState, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, ExternalLink, Globe, Home, RotateCcw } from 'lucide-react'
import { quitToTitle } from '@/lib/game/engine'
import {
  getConfiguredGameLauncherUrl,
  getLauncherHostLabel,
  isRunningOnTargetOrigin,
  readStoredLauncherMode,
  setStoredLauncherMode,
  subscribeLauncherMode,
  type LauncherTargetMode,
} from '@/lib/game/launcher-config'
import {
  closeChangelogModal,
  setExternalChangelogHost,
  useVersionUpdate,
} from '@/lib/game/use-version-update'
import { PatchNotesModal } from './patch-notes-modal'

const Game = dynamic(() => import('./game').then((m) => m.Game), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground">กำลังโหลดเกม...</div>
  ),
})

interface BoundaryState {
  hasError: boolean
  errorMessage: string
}

class GameErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = {
    hasError: false,
    errorMessage: '',
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'เกิดข้อผิดพลาดขณะแสดงผลหน้าจอเกม',
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('GameErrorBoundary caught runtime error:', error, info)
  }

  private handleReloadGame = () => {
    this.setState({ hasError: false, errorMessage: '' })
  }

  private handleBackToTitle = () => {
    try {
      quitToTitle()
    } catch {
      // Ignore engine state errors during recovery.
    }
    this.setState({ hasError: false, errorMessage: '' })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-background p-4">
          <div className="pixel-panel flex w-full max-w-md flex-col items-center gap-4 bg-card p-6 text-center">
            <div className="grid size-12 place-items-center border-2 border-destructive/60 bg-destructive/15 text-destructive">
              <AlertTriangle className="size-6" aria-hidden />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-foreground">หน้าจอเกมหยุดทำงานชั่วคราว</h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                ระบบป้องกันการเด้งทำงานแล้ว ข้อมูลตัวละครของคุณถูกเก็บรักษาไว้สามารถกดโหลดใหม่ได้ทันที
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={this.handleReloadGame}
                className="pixel-btn flex flex-1 items-center justify-center gap-1.5 bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110"
              >
                <RotateCcw className="size-3.5" aria-hidden />
                ลองโหลดหน้าจอเกมใหม่
              </button>
              <button
                type="button"
                onClick={this.handleBackToTitle}
                className="pixel-btn flex flex-1 items-center justify-center gap-1.5 bg-secondary px-3 py-2 text-xs font-semibold text-foreground hover:brightness-110"
              >
                <Home className="size-3.5" aria-hidden />
                กลับหน้าเลือกตัวละคร
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export function GameLoader() {
  const versionInfo = useVersionUpdate()
  const launcherUrl = getConfiguredGameLauncherUrl()
  const launcherHost = getLauncherHostLabel(launcherUrl)
  const [launcherMode, setLauncherMode] = useState<LauncherTargetMode>('local')
  const [isSameOriginHost, setIsSameOriginHost] = useState(false)

  useEffect(() => {
    setExternalChangelogHost(true)
    return () => {
      setExternalChangelogHost(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsSameOriginHost(isRunningOnTargetOrigin(window.location.origin, launcherUrl))
    setLauncherMode(readStoredLauncherMode())
    return subscribeLauncherMode(setLauncherMode)
  }, [launcherUrl])

  const handleClosePatchNotes = useCallback(() => {
    closeChangelogModal()
  }, [])

  if (!isSameOriginHost && launcherMode === 'workers') {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#071122]" data-testid="workers-launcher-stage">
        <div className="fixed left-3 top-3 z-40 flex flex-wrap items-center gap-1.5 rounded-lg border border-sky-400/45 bg-[#071326]/92 px-2.5 py-1.5 text-[11px] text-slate-100 shadow-lg backdrop-blur-sm">
          <Globe className="size-3.5 shrink-0 text-emerald-400" aria-hidden />
          <span className="font-mono font-bold text-emerald-300">{launcherHost}</span>
          <a
            href={launcherUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded border border-emerald-400/50 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-500/30"
          >
            เปิดแท็บใหม่
            <ExternalLink className="size-3" aria-hidden />
          </a>
          <button
            type="button"
            data-testid="switch-local-launcher"
            onClick={() => setStoredLauncherMode('local')}
            className="rounded border border-slate-500/60 bg-slate-800/90 px-2 py-0.5 text-[10px] font-semibold text-slate-200 hover:text-white"
          >
            กลับตัวเกมในเครื่อง
          </button>
        </div>

        <iframe
          src={launcherUrl}
          title={`Pixel Quest - ${launcherHost}`}
          allow="autoplay; fullscreen; clipboard-read; clipboard-write"
          className="h-full w-full border-0 bg-[#071122]"
        />
      </div>
    )
  }

  return (
    <GameErrorBoundary>
      <Game />
      <PatchNotesModal
        open={versionInfo.changelogOpen}
        onClose={handleClosePatchNotes}
        isNewUpdateBanner={versionInfo.unseenUpdate}
      />
    </GameErrorBoundary>
  )
}
