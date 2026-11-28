'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useGame } from '@/lib/game/use-game'
import { TitleScreen } from './title-screen'

const GamePlayStage = dynamic(
  () => import('./game-play-stage').then((m) => m.GamePlayStage),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#071122] text-xs font-semibold text-sky-100">
        กำลังเข้าสู่โลกผจญภัย...
      </div>
    ),
  },
)

export function Game() {
  const g = useGame()
  const isPlaying = Boolean(g.p)

  useEffect(() => {
    document.body.dataset.state = isPlaying ? 'playing' : 'title'
  }, [isPlaying])

  useEffect(() => {
    if (isPlaying || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('autostart') === '1') return
    // Gently pre-warm the play stage chunk in idle time after TitleScreen paints
    const idleCb = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 450))
    const cancelCb = window.cancelIdleCallback ?? window.clearTimeout
    const id = idleCb(() => {
      void import('./game-play-stage')
    })
    return () => cancelCb(id)
  }, [isPlaying])

  if (!isPlaying) return <TitleScreen />
  return <GamePlayStage />
}
