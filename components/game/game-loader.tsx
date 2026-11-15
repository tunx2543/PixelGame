'use client'

import dynamic from 'next/dynamic'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, Home, RotateCcw } from 'lucide-react'
import { quitToTitle } from '@/lib/game/engine'

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
  return (
    <GameErrorBoundary>
      <Game />
    </GameErrorBoundary>
  )
}

