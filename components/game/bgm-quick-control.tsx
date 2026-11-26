'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Disc3, Music, Play, RotateCcw, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react'
import {
  BGM_TRACK_CATEGORY_LABELS,
  getBgmSnapshot,
  getBgmTrackMeta,
  getBgmTracksByCategory,
  setBgmVolume,
  setPinnedBgmTrack,
  subscribeBgm,
  toggleBgmMute,
  type BgmPlaybackSource,
  type BgmResolveContext,
  type BgmTheme,
  type BgmTrackCategory,
  type BgmTrackId,
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
  desiredTrackId: BgmTrackId
  activeTrackId: BgmTrackId | null
  pinnedTrackId: BgmTrackId | null
  source: BgmPlaybackSource
}

export function useBgmState(): ClientBgmState {
  const [state, setState] = useState<ClientBgmState>({
    ready: false,
    muted: false,
    volume: 0.35,
    desiredTheme: 'login',
    activeTheme: null,
    desiredTrackId: 'login',
    activeTrackId: null,
    pinnedTrackId: null,
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
        desiredTrackId: snap.desiredTrackId,
        activeTrackId: snap.activeTrackId,
        pinnedTrackId: snap.pinnedTrackId,
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

const JUKEBOX_CATEGORIES: Array<{ id: BgmTrackCategory | 'all'; label: string }> = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'town', label: 'เมือง' },
  { id: 'field', label: 'Open World' },
  { id: 'dungeon', label: 'ดันเจี้ยน' },
  { id: 'activity', label: 'กิจกรรม' },
  { id: 'combat', label: 'ต่อสู้/บอส' },
]

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
  const [jukeboxOpen, setJukeboxOpen] = useState(false)
  const [category, setCategory] = useState<BgmTrackCategory | 'all'>('town')
  const rootRef = useRef<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number; maxHeight: number } | null>(null)

  useEffect(() => {
    if (!open) return
    const updatePos = () => {
      const el = rootRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const top = Math.max(8, Math.min(Math.round(rect.bottom + 6), Math.max(8, vh - 180)))
      const right = Math.max(8, Math.min(Math.round(vw - rect.right), Math.max(8, vw - 352)))
      const maxHeight = Math.max(180, vh - top - 8)
      setPopoverPos({ top, right, maxHeight })
    }
    updatePos()

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        (!popoverRef.current || !popoverRef.current.contains(target))
      ) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', updatePos)
    }
  }, [open])

  const trackMeta = getBgmTrackMeta(bgm.desiredTrackId)
  const bgmPct = Math.round(bgm.volume * 100)
  const sfxPct = Math.round(sfx.volume * 100)
  const trackList = useMemo(() => getBgmTracksByCategory(category), [category])

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
            title={`${bgm.muted ? 'เปิดเพลงประกอบ' : 'ปิดเพลงประกอบ'} (${trackMeta.labelTh})`}
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
            aria-label="ปรับระดับเสียงและเลือกเพลงประจำเมือง"
            title={`เลือกเพลงเมือง & ปรับเสียง (${bgmPct}%)`}
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
            title={trackMeta.labelTh}
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
            aria-label="ปรับระดับเสียงและเลือกเพลง"
            title={`ปรับความดังเพลง (${bgmPct}%)`}
            className="pixel-btn flex min-h-10 shrink-0 items-center gap-1 bg-secondary px-2 py-2 text-xs text-foreground hover:brightness-110"
          >
            <SlidersHorizontal className="size-3.5" aria-hidden />
            <span className="hidden tabular-nums md:inline">{bgmPct}%</span>
          </button>
        </>
      ) : (
        <div className="flex items-center gap-1 rounded-lg border border-sky-300/30 bg-[#08142b]/92 p-1 shadow-lg">
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
            <span className="max-w-[14rem] truncate whitespace-nowrap">
              {bgm.muted ? 'เพลง: ปิด' : trackMeta.labelTh}
            </span>
          </button>
          <button
            type="button"
            data-testid="bgm-volume-popover-btn"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="ปรับระดับเสียงและเลือกเพลงประจำเมือง"
            className="flex items-center gap-1 rounded-md border border-white/10 bg-[#102244] px-2 py-1.5 text-[11px] font-semibold text-sky-100 hover:border-amber-300/50"
          >
            <SlidersHorizontal className="size-3.5" aria-hidden />
            <span className="tabular-nums">{bgmPct}%</span>
          </button>
        </div>
      )}

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="แผงปรับระดับเสียงและคลังเพลงประจำเมือง Open World"
            data-testid="bgm-volume-popover"
            style={
              popoverPos
                ? {
                    top: `${popoverPos.top}px`,
                    right: `${popoverPos.right}px`,
                    maxHeight: `${popoverPos.maxHeight}px`,
                  }
                : undefined
            }
            className="pointer-events-auto fixed z-[70] w-[min(21.5rem,calc(100vw-1rem))] overflow-y-auto rounded-lg border border-sky-400/50 bg-[#0a1529]/97 p-3 text-xs text-slate-100 shadow-2xl"
          >
          <div className="mb-2 flex items-start justify-between gap-2 border-b border-white/10 pb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate font-bold text-amber-300" data-testid="bgm-current-track-label">
                  {trackMeta.labelTh}
                </p>
                {bgm.pinnedTrackId && (
                  <span className="shrink-0 rounded border border-amber-400/50 bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-200">
                    ฟังแยก
                  </span>
                )}
              </div>
              <p className="truncate text-[10px] text-slate-300">
                {trackMeta.titleEn} · {trackMeta.keyLabel} · {trackMeta.bpm} BPM
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {bgm.muted
                  ? 'ปิดเสียงเพลงอยู่'
                  : bgm.source === 'file'
                    ? `กำลังเล่นไฟล์เสียง · ${trackMeta.styleTh}`
                    : `${trackMeta.styleTh}`}
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

            {/* World Music Jukebox Toggle & Auto-Map Restore */}
            <div className="border-t border-white/10 pt-2">
              <div className="flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  data-testid="bgm-jukebox-toggle-btn"
                  aria-expanded={jukeboxOpen}
                  onClick={() => setJukeboxOpen((v) => !v)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded border px-2 py-1.5 text-[11px] font-bold transition-colors',
                    jukeboxOpen
                      ? 'border-amber-300/60 bg-amber-500/20 text-amber-200'
                      : 'border-sky-400/40 bg-sky-500/15 text-sky-200 hover:border-amber-300/50',
                  )}
                >
                  <Disc3 className={cn('size-3.5', jukeboxOpen && 'animate-spin')} aria-hidden />
                  {jukeboxOpen ? 'ซ่อนคลังเพลงเมือง' : 'เลือกฟังเพลงประจำเมือง (Open World)'}
                </button>
                {bgm.pinnedTrackId && (
                  <button
                    type="button"
                    data-testid="bgm-auto-map-btn"
                    onClick={() => setPinnedBgmTrack(null)}
                    title="กลับไปเปลี่ยนเพลงอัตโนมัติตามแผนที่ที่เดินอยู่"
                    className="flex shrink-0 items-center gap-1 rounded border border-emerald-400/50 bg-emerald-600/25 px-2 py-1.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-600/40"
                  >
                    <RotateCcw className="size-3" aria-hidden />
                    ตามแผนที่
                  </button>
                )}
              </div>

              {jukeboxOpen && (
                <div className="mt-2 space-y-2" data-testid="bgm-jukebox-drawer">
                  <div className="flex flex-wrap gap-1">
                    {JUKEBOX_CATEGORIES.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCategory(tab.id)}
                        className={cn(
                          'rounded border px-1.5 py-0.5 text-[10px] font-semibold transition-colors',
                          category === tab.id
                            ? 'border-amber-300/75 bg-amber-500/25 text-amber-200'
                            : 'border-white/10 bg-slate-900/70 text-slate-300 hover:border-white/30',
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                    {trackList.map((item) => {
                      const active = bgm.desiredTrackId === item.trackId
                      return (
                        <button
                          key={item.trackId}
                          type="button"
                          data-testid={`bgm-jukebox-track-${item.trackId}`}
                          onClick={() => setPinnedBgmTrack(item.trackId, true)}
                          className={cn(
                            'flex w-full items-center justify-between gap-2 rounded border px-2 py-1.5 text-left transition-colors',
                            active
                              ? 'border-amber-300/80 bg-amber-500/20 text-amber-100'
                              : 'border-white/10 bg-slate-900/70 text-slate-200 hover:border-sky-300/50 hover:bg-slate-800/80',
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-bold">
                              {item.labelTh}
                            </p>
                            <p className="truncate text-[9.5px] text-slate-400">
                              {BGM_TRACK_CATEGORY_LABELS[item.category]} · {item.styleTh} ({item.bpm} BPM)
                            </p>
                          </div>
                          <span
                            className={cn(
                              'grid size-5 shrink-0 place-items-center rounded border text-[9px]',
                              active
                                ? 'border-amber-300 bg-amber-400/25 text-amber-200'
                                : 'border-white/15 bg-slate-800 text-slate-300',
                            )}
                          >
                            <Play className="size-2.5" aria-hidden />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
          document.body,
        )}
    </div>
  )
}

