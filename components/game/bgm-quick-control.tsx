'use client'

import { useEffect, useRef, useState } from 'react'
import { Music, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react'
import {
  BGM_TRACK_CATALOG,
  getBgmSnapshot,
  setBgmVolume,
  subscribeBgm,
  toggleBgmMute,
  type BgmPlaybackSource,
  type BgmResolveContext,
  type BgmTheme,
} from '@/lib/game/bgm'
import {
  getSfxVolume,
  isSfxMuted,
  playQuestClaimSfx,
  setSfxMuted,
  setSfxVolume,
  subscribeSfx,
} from '@/lib/game/sfx'
import { cn } from '@/lib/utils'

export interface ClientBgmState {
  ready: boolean
  muted: boolean
  volume: number
  desiredTheme: BgmTheme
  activeTheme: BgmTheme | null
  source: BgmPlaybackSource
}

export function useBgmState(): ClientBgmState {
  const [state, setState] = useState<ClientBgmState>({
    ready: false,
    muted: false,
    volume: 0.35,
    desiredTheme: 'login',
    activeTheme: null,
    source: 'idle',
  })

  useEffect(() => {
    const sync = () => {
      const snap = getBgmSnapshot()
      setState({
        ready: true,
        muted: snap.muted,
        volume: snap.volume,
        desiredTheme: snap.desiredTheme,
        activeTheme: snap.activeTheme,
        source: snap.source,
      })
    }
    sync()
    return subscribeBgm(sync)
  }, [])

  return state
}

export interface ClientSfxState {
  ready: boolean
  muted: boolean
  volume: number
}

export function useSfxState(): ClientSfxState {
  const [state, setState] = useState<ClientSfxState>({
    ready: false,
    muted: false,
    volume: 0.8,
  })

  useEffect(() => {
    const sync = () => {
      setState({
        ready: true,
        muted: isSfxMuted(),
        volume: getSfxVolume(),
      })
    }
    sync()
    return subscribeSfx(sync)
  }, [])

  return state
}

export function BgmQuickControl({
  context,
  variant = 'title',
  className,
}: {
  context?: string | BgmResolveContext
  variant?: 'title' | 'dock' | 'arena'
  className?: string
}) {
  const bgm = useBgmState()
  const sfx = useSfxState()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const themeSpec = BGM_TRACK_CATALOG[bgm.desiredTheme]
  const bgmPct = Math.round(bgm.volume * 100)
  const sfxPct = Math.round(sfx.volume * 100)

  return (
    <div ref={rootRef} className={cn('relative inline-flex items-center gap-1', className)}>
      {variant === 'dock' ? (
        <>
          <button
            type="button"
            data-testid="bgm-toggle-btn"
            onClick={() => toggleBgmMute(context)}
            aria-pressed={!bgm.muted}
            aria-label={bgm.muted ? 'เปิดเพลงประกอบ (BGM)' : 'ปิดเพลงประกอบ (BGM)'}
            title={`${bgm.muted ? 'เปิดเพลงประกอบ' : 'ปิดเพลงประกอบ'} (${themeSpec.labelTh})`}
            className={cn(
              'grid size-6 place-items-center rounded-full border shadow transition-colors sm:size-5',
              !bgm.muted
                ? 'border-emerald-300/75 bg-emerald-900/85 text-emerald-200'
                : 'border-white/25 bg-slate-950/75 text-slate-300 hover:border-amber-300/60 hover:text-white',
            )}
          >
            {bgm.muted ? <VolumeX className="size-3.5 sm:size-3" aria-hidden /> : <Volume2 className="size-3.5 sm:size-3" aria-hidden />}
          </button>

          <button
            type="button"
            data-testid="bgm-volume-popover-btn"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="ปรับระดับเสียงเพลง BGM และ SFX"
            title={`ปรับเสียงเพลง (${bgmPct}%)`}
            className={cn(
              'grid size-6 place-items-center rounded-full border shadow transition-colors sm:size-5',
              open
                ? 'border-amber-300/85 bg-amber-900/85 text-amber-200'
                : 'border-white/25 bg-slate-950/75 text-slate-300 hover:border-amber-300/60 hover:text-white',
            )}
          >
            <SlidersHorizontal className="size-3 sm:size-2.5" aria-hidden />
          </button>
        </>
      ) : variant === 'arena' ? (
        <>
          <button
            type="button"
            data-testid="bgm-toggle-btn"
            onClick={() => toggleBgmMute(context)}
            aria-pressed={!bgm.muted}
            aria-label={bgm.muted ? 'เปิดเพลงประกอบ (BGM)' : 'ปิดเพลงประกอบ (BGM)'}
            title={themeSpec.labelTh}
            className={cn(
              'pixel-btn flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-2 text-xs hover:brightness-110 sm:px-3',
              !bgm.muted ? 'bg-emerald-900/60 text-emerald-200' : 'bg-secondary text-foreground',
            )}
          >
            {bgm.muted ? <VolumeX className="size-4" aria-hidden /> : <Music className="size-4" aria-hidden />}
            <span className="hidden sm:inline">{bgm.muted ? 'ปิดเพลง' : 'BGM'}</span>
          </button>
          <button
            type="button"
            data-testid="bgm-volume-popover-btn"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="ปรับระดับเสียงเพลง"
            title={`ปรับความดังเพลง (${bgmPct}%)`}
            className="pixel-btn flex min-h-10 shrink-0 items-center gap-1 bg-secondary px-2 py-2 text-xs text-foreground hover:brightness-110"
          >
            <SlidersHorizontal className="size-3.5" aria-hidden />
            <span className="hidden tabular-nums md:inline">{bgmPct}%</span>
          </button>
        </>
      ) : (
        <div className="flex items-center gap-1 rounded-lg border border-sky-300/30 bg-[#08142b]/88 p-1 shadow-lg backdrop-blur-sm">
          <button
            type="button"
            data-testid="bgm-toggle-btn"
            onClick={() => toggleBgmMute(context)}
            aria-pressed={!bgm.muted}
            aria-label={bgm.muted ? 'เปิดเพลงประกอบ (BGM)' : 'ปิดเพลงประกอบ (BGM)'}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors',
              !bgm.muted
                ? 'bg-emerald-600/30 text-emerald-200 hover:bg-emerald-600/45'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80',
            )}
          >
            {bgm.muted ? <VolumeX className="size-3.5 shrink-0" aria-hidden /> : <Music className="size-3.5 shrink-0 text-amber-300" aria-hidden />}
            <span className="whitespace-nowrap">{bgm.muted ? 'เพลง: ปิด' : themeSpec.labelTh}</span>
          </button>
          <button
            type="button"
            data-testid="bgm-volume-popover-btn"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="ปรับระดับเสียงเพลง"
            className="flex items-center gap-1 rounded-md border border-white/10 bg-[#102244] px-2 py-1.5 text-[11px] font-semibold text-sky-100 hover:border-amber-300/50"
          >
            <SlidersHorizontal className="size-3.5" aria-hidden />
            <span className="tabular-nums">{bgmPct}%</span>
          </button>
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="แผงปรับระดับเสียงเพลงประกอบและเอฟเฟกต์"
          data-testid="bgm-volume-popover"
          className={cn(
            'fixed right-2 z-50 w-[min(17.5rem,calc(100vw-1rem))] rounded-lg border border-sky-400/45 bg-[#0a1529]/96 p-3 text-xs text-slate-100 shadow-2xl backdrop-blur-md sm:absolute sm:right-0 sm:top-full sm:mt-1.5',
            variant === 'dock' ? 'top-[5.75rem]' : 'top-14',
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
            <div className="min-w-0">
              <p className="truncate font-bold text-amber-300">{themeSpec.labelTh}</p>
              <p className="truncate text-[10px] text-slate-400">
                {bgm.muted
                  ? 'ปิดเสียงเพลงอยู่'
                  : bgm.source === 'file'
                    ? 'กำลังเล่นไฟล์เสียง (Loop)'
                    : 'กำลังเล่นซินธ์อัตโนมัติ (Loop)'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleBgmMute(context)}
              className={cn(
                'shrink-0 rounded border px-2 py-1 text-[10px] font-bold',
                !bgm.muted
                  ? 'border-emerald-400/60 bg-emerald-600/25 text-emerald-200'
                  : 'border-slate-500/60 bg-slate-800 text-slate-300',
              )}
            >
              {bgm.muted ? 'เปิดเพลง' : 'ปิดเพลง'}
            </button>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <label htmlFor="quick-bgm-volume" className="font-semibold text-sky-100">
                  ระดับเสียงเพลง (BGM)
                </label>
                <span className="font-mono font-bold text-amber-300 tabular-nums">{bgmPct}%</span>
              </div>
              <input
                id="quick-bgm-volume"
                data-testid="quick-bgm-volume-slider"
                type="range"
                min={0}
                max={100}
                value={bgmPct}
                onChange={(e) => setBgmVolume(Number(e.target.value) / 100)}
                className="h-2 w-full cursor-pointer accent-amber-400"
              />
            </div>

            <div className="border-t border-white/10 pt-2">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <label htmlFor="quick-sfx-volume" className="font-semibold text-sky-100">
                  เสียงเอฟเฟกต์ (SFX)
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sky-300 tabular-nums">{sfxPct}%</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = setSfxMuted(!sfx.muted)
                      if (!next) playQuestClaimSfx(false)
                    }}
                    className={cn(
                      'rounded border px-1.5 py-0.5 text-[10px] font-bold',
                      !sfx.muted
                        ? 'border-sky-400/60 bg-sky-600/25 text-sky-200'
                        : 'border-slate-500/60 bg-slate-800 text-slate-300',
                    )}
                  >
                    {sfx.muted ? 'ปิดอยู่' : 'เปิดอยู่'}
                  </button>
                </div>
              </div>
              <input
                id="quick-sfx-volume"
                data-testid="quick-sfx-volume-slider"
                type="range"
                min={0}
                max={100}
                value={sfxPct}
                onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
                className="h-2 w-full cursor-pointer accent-sky-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
