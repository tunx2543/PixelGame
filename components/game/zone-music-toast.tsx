'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Music } from 'lucide-react'
import { getBgmTrackMeta, type BgmTrackId } from '@/lib/game/bgm'
import { useGame } from '@/lib/game/use-game'
import { useBgmState } from './bgm-quick-control'

export function ZoneMusicToast() {
  const { p } = useGame()
  const bgm = useBgmState()
  const [visibleTrackId, setVisibleTrackId] = useState<BgmTrackId | null>(null)
  const lastAnnouncedRef = useRef<BgmTrackId | null>(null)

  useEffect(() => {
    if (!p) {
      lastAnnouncedRef.current = null
      return
    }
    if (!bgm.ready || bgm.muted) return

    const nextId = bgm.desiredTrackId
    if (lastAnnouncedRef.current === nextId) return
    lastAnnouncedRef.current = nextId

    const showTimer = window.setTimeout(() => {
      setVisibleTrackId(nextId)
    }, 0)
    const hideTimer = window.setTimeout(() => {
      setVisibleTrackId((curr) => (curr === nextId ? null : curr))
    }, 4200)
    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
    }
  }, [p, bgm.ready, bgm.muted, bgm.desiredTrackId])

  if (!p || !bgm.ready || bgm.muted) return null
  const meta = visibleTrackId ? getBgmTrackMeta(visibleTrackId) : null

  return (
    <AnimatePresence>
      {meta && (
        <motion.div
          key={meta.trackId}
          data-testid="zone-music-toast"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed left-1/2 top-[11.25rem] z-25 flex w-max max-w-[min(26rem,calc(100vw-1.5rem))] -translate-x-1/2 items-center gap-2 rounded-md border border-amber-400/55 bg-[#081224]/92 px-3 py-1.5 shadow-[0_8px_22px_rgba(0,0,0,0.65)] sm:top-[7.25rem] xl:top-14"
        >
          <span className="grid size-5 shrink-0 place-items-center rounded border border-amber-300/45 bg-amber-500/15 text-amber-300">
            <Music className="size-3" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold text-amber-200 leading-tight">
              ♪ {meta.labelTh}
            </p>
            <p className="truncate text-[9.5px] text-sky-200/85 leading-tight">
              {meta.titleEn} · {meta.styleTh} ({meta.bpm} BPM)
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
