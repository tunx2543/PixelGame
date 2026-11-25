'use client'

import {
  BGM_THEMES,
  BGM_TRACK_CATALOG,
  clampBgmVolume,
  pickPlayableAudioUrl,
  resolveBgmTheme,
  type BgmResolveContext,
  type BgmTheme,
} from './bgm-tracks'

export {
  BGM_BATTLE_HOLD_SEC,
  BGM_THEMES,
  BGM_TRACK_CATALOG,
  isDungeonBgmMapId,
  isSpecialEventBgmMapId,
  resolveBgmTheme,
  type BgmResolveContext,
  type BgmTheme,
  type BgmTrackSpec,
} from './bgm-tracks'

export type BgmPlaybackSource = 'file' | 'synth' | 'idle'

export interface BgmSnapshot {
  muted: boolean
  volume: number
  desiredTheme: BgmTheme
  activeTheme: BgmTheme | null
  source: BgmPlaybackSource
  activeUrl: string | null
  availableTracks: Record<BgmTheme, string[]>
}

const BGM_MUTED_KEY = 'pixel-quest-bgm-muted'
const BGM_VOLUME_KEY = 'pixel-quest-bgm-volume'
const DEFAULT_BGM_VOLUME = 0.35

interface SynthVoicePattern {
  stepSec: number
  leadWave: OscillatorType
  bassWave: OscillatorType
  leadGain: number
  bassGain: number
  /** Frequency in Hz (0 = rest), paired with optional bass note in Hz */
  steps: ReadonlyArray<readonly [number, number]>
}

/**
 * Original, royalty-free procedural chiptune/RPG motifs used when
 * custom .ogg / .mp3 files are not yet placed in /public/audio/bgm/.
 * Each pattern wraps cleanly at step 0 for seamless looping.
 */
const SYNTH_PATTERNS: Record<BgmTheme, SynthVoicePattern> = {
  login: {
    stepSec: 0.34,
    leadWave: 'triangle',
    bassWave: 'sine',
    leadGain: 0.085,
    bassGain: 0.06,
    steps: [
      [523.25, 130.81],
      [659.25, 0],
      [783.99, 196.0],
      [659.25, 0],
      [587.33, 146.83],
      [659.25, 0],
      [783.99, 196.0],
      [1046.5, 0],
      [880.0, 174.61],
      [783.99, 0],
      [659.25, 164.81],
      [587.33, 0],
      [523.25, 130.81],
      [587.33, 0],
      [659.25, 196.0],
      [523.25, 0],
    ],
  },
  town: {
    stepSec: 0.32,
    leadWave: 'triangle',
    bassWave: 'sine',
    leadGain: 0.08,
    bassGain: 0.055,
    steps: [
      [523.25, 130.81],
      [587.33, 0],
      [659.25, 196.0],
      [523.25, 0],
      [659.25, 174.61],
      [783.99, 0],
      [659.25, 130.81],
      [587.33, 0],
      [523.25, 146.83],
      [440.0, 0],
      [493.88, 196.0],
      [587.33, 0],
      [659.25, 130.81],
      [587.33, 0],
      [523.25, 196.0],
      [392.0, 0],
    ],
  },
  field: {
    stepSec: 0.24,
    leadWave: 'square',
    bassWave: 'triangle',
    leadGain: 0.055,
    bassGain: 0.06,
    steps: [
      [440.0, 110.0],
      [523.25, 0],
      [587.33, 146.83],
      [659.25, 0],
      [783.99, 164.81],
      [659.25, 0],
      [587.33, 146.83],
      [523.25, 0],
      [440.0, 130.81],
      [493.88, 0],
      [523.25, 164.81],
      [659.25, 0],
      [587.33, 196.0],
      [523.25, 0],
      [493.88, 146.83],
      [392.0, 0],
    ],
  },
  dungeon: {
    stepSec: 0.26,
    leadWave: 'sawtooth',
    bassWave: 'triangle',
    leadGain: 0.042,
    bassGain: 0.065,
    steps: [
      [220.0, 110.0],
      [261.63, 0],
      [246.94, 98.0],
      [196.0, 0],
      [220.0, 110.0],
      [293.66, 0],
      [261.63, 103.83],
      [246.94, 0],
      [220.0, 87.31],
      [196.0, 0],
      [174.61, 82.41],
      [196.0, 0],
      [220.0, 110.0],
      [246.94, 0],
      [220.0, 98.0],
      [164.81, 0],
    ],
  },
  battle: {
    stepSec: 0.17,
    leadWave: 'square',
    bassWave: 'sawtooth',
    leadGain: 0.055,
    bassGain: 0.042,
    steps: [
      [329.63, 110.0],
      [392.0, 110.0],
      [440.0, 130.81],
      [392.0, 110.0],
      [493.88, 146.83],
      [440.0, 110.0],
      [392.0, 130.81],
      [329.63, 110.0],
      [349.23, 87.31],
      [440.0, 87.31],
      [523.25, 98.0],
      [440.0, 87.31],
      [392.0, 98.0],
      [349.23, 98.0],
      [329.63, 82.41],
      [293.66, 98.0],
    ],
  },
  boss: {
    stepSec: 0.15,
    leadWave: 'sawtooth',
    bassWave: 'square',
    leadGain: 0.05,
    bassGain: 0.048,
    steps: [
      [293.66, 73.42],
      [349.23, 73.42],
      [329.63, 87.31],
      [440.0, 73.42],
      [466.16, 98.0],
      [440.0, 73.42],
      [392.0, 82.41],
      [349.23, 73.42],
      [293.66, 65.41],
      [349.23, 65.41],
      [440.0, 73.42],
      [523.25, 87.31],
      [493.88, 82.41],
      [440.0, 73.42],
      [392.0, 65.41],
      [329.63, 73.42],
    ],
  },
  event: {
    stepSec: 0.2,
    leadWave: 'triangle',
    bassWave: 'triangle',
    leadGain: 0.085,
    bassGain: 0.06,
    steps: [
      [587.33, 146.83],
      [659.25, 0],
      [783.99, 196.0],
      [880.0, 146.83],
      [783.99, 164.81],
      [659.25, 0],
      [587.33, 196.0],
      [783.99, 146.83],
      [880.0, 174.61],
      [987.77, 0],
      [1046.5, 196.0],
      [880.0, 174.61],
      [783.99, 146.83],
      [659.25, 196.0],
      [783.99, 146.83],
      [587.33, 0],
    ],
  },
}

const emptyAvailableTracks = (): Record<BgmTheme, string[]> => ({
  login: [],
  town: [],
  field: [],
  dungeon: [],
  battle: [],
  boss: [],
  event: [],
})

let bgmCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let activeBufferSource: AudioBufferSourceNode | null = null
let activeHtmlAudio: HTMLAudioElement | null = null
let synthTimer: number | null = null
let nextSynthNoteTime = 0
let synthStepIdx = 0

let bgmMuted = false
let bgmVolume = DEFAULT_BGM_VOLUME
let desiredTheme: BgmTheme = 'login'
let activeTheme: BgmTheme | null = null
let activeSource: BgmPlaybackSource = 'idle'
let activeUrl: string | null = null
let lastContext: BgmResolveContext = { screen: 'login' }
let transitionSeq = 0

let manifestCache: Record<BgmTheme, string[]> = emptyAvailableTracks()
let manifestPromise: Promise<Record<BgmTheme, string[]>> | null = null
const decodedBufferCache = new Map<string, AudioBuffer>()
const listeners = new Set<() => void>()
let lifecycleHooksInstalled = false

if (typeof window !== 'undefined') {
  try {
    const savedMute = window.localStorage.getItem(BGM_MUTED_KEY)
    bgmMuted = savedMute === '1'
    const rawVol = window.localStorage.getItem(BGM_VOLUME_KEY)
    if (rawVol !== null) {
      const parsed = Number(rawVol)
      if (Number.isFinite(parsed)) {
        bgmVolume = clampBgmVolume(parsed)
      }
    }
  } catch {
    // Ignore storage access errors cleanly.
  }
}

function emitChange() {
  for (const listener of listeners) {
    try {
      listener()
    } catch {
      // Never break audio loop on listener errors.
    }
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!bgmCtx) {
    bgmCtx = new Ctx()
    masterGain = bgmCtx.createGain()
    masterGain.gain.setValueAtTime(bgmMuted ? 0 : bgmVolume, bgmCtx.currentTime)
    masterGain.connect(bgmCtx.destination)
  }
  return bgmCtx
}

function applyMasterGain() {
  const target = bgmMuted ? 0 : bgmVolume
  if (bgmCtx && masterGain) {
    try {
      masterGain.gain.setTargetAtTime(target, bgmCtx.currentTime, 0.025)
    } catch {
      masterGain.gain.value = target
    }
  }
  if (activeHtmlAudio) {
    activeHtmlAudio.volume = target
  }
}

function stopActivePlayback(clearTheme = true) {
  if (synthTimer !== null && typeof window !== 'undefined') {
    window.clearInterval(synthTimer)
    synthTimer = null
  }
  if (activeBufferSource) {
    try {
      activeBufferSource.onended = null
      activeBufferSource.stop()
      activeBufferSource.disconnect()
    } catch {
      // Already stopped.
    }
    activeBufferSource = null
  }
  if (activeHtmlAudio) {
    try {
      activeHtmlAudio.pause()
      activeHtmlAudio.currentTime = 0
      activeHtmlAudio.src = ''
    } catch {
      // Ignore cleanup failures.
    }
    activeHtmlAudio = null
  }
  if (clearTheme) {
    activeTheme = null
    activeSource = 'idle'
    activeUrl = null
  }
}

function canPlayUrlHelper(): ((mimeType: string) => string) | undefined {
  if (typeof document === 'undefined') return undefined
  try {
    const probe = document.createElement('audio')
    return (mime) => probe.canPlayType(mime)
  } catch {
    return undefined
  }
}

async function loadTrackManifest(): Promise<Record<BgmTheme, string[]>> {
  if (typeof window === 'undefined') return manifestCache
  if (!manifestPromise) {
    manifestPromise = fetch('/api/audio/bgm-manifest', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return emptyAvailableTracks()
        const json = (await res.json()) as { tracks?: Partial<Record<BgmTheme, string[]>> }
        const merged = emptyAvailableTracks()
        for (const theme of BGM_THEMES) {
          const list = json.tracks?.[theme]
          merged[theme] = Array.isArray(list) ? list.filter((u): u is string => typeof u === 'string') : []
        }
        manifestCache = merged
        emitChange()
        return merged
      })
      .catch(() => manifestCache)
  }
  return manifestPromise
}

function scheduleSynthStep(ctx: AudioContext, dest: AudioNode, theme: BgmTheme, when: number, stepIndex: number) {
  const pattern = SYNTH_PATTERNS[theme]
  const [leadFreq, bassFreq] = pattern.steps[stepIndex % pattern.steps.length]
  const dur = Math.min(0.32, pattern.stepSec * 0.88)

  if (leadFreq > 0) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = pattern.leadWave
    osc.frequency.setValueAtTime(leadFreq, when)
    g.gain.setValueAtTime(0.0001, when)
    g.gain.linearRampToValueAtTime(pattern.leadGain, when + 0.018)
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    osc.connect(g)
    g.connect(dest)
    osc.start(when)
    osc.stop(when + dur + 0.02)
  }

  if (bassFreq > 0) {
    const bOsc = ctx.createOscillator()
    const bGain = ctx.createGain()
    bOsc.type = pattern.bassWave
    bOsc.frequency.setValueAtTime(bassFreq, when)
    bGain.gain.setValueAtTime(0.0001, when)
    bGain.gain.linearRampToValueAtTime(pattern.bassGain, when + 0.02)
    bGain.gain.exponentialRampToValueAtTime(0.0001, when + dur * 1.15)
    bOsc.connect(bGain)
    bGain.connect(dest)
    bOsc.start(when)
    bOsc.stop(when + dur * 1.2 + 0.02)
  }
}

function startSynthLoop(theme: BgmTheme) {
  const ctx = getAudioContext()
  if (!ctx || !masterGain || typeof window === 'undefined') return
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined)
  }
  applyMasterGain()

  const pattern = SYNTH_PATTERNS[theme]
  synthStepIdx = 0
  nextSynthNoteTime = ctx.currentTime + 0.04
  activeTheme = theme
  activeSource = 'synth'
  activeUrl = null

  const pump = () => {
    if (bgmMuted || activeTheme !== theme || activeSource !== 'synth' || !bgmCtx || !masterGain) return
    if (bgmCtx.state === 'suspended') return
    if (nextSynthNoteTime < bgmCtx.currentTime - 0.5) {
      nextSynthNoteTime = bgmCtx.currentTime + 0.04
    }
    const lookahead = bgmCtx.currentTime + 0.28
    while (nextSynthNoteTime < lookahead) {
      scheduleSynthStep(bgmCtx, masterGain, theme, nextSynthNoteTime, synthStepIdx)
      nextSynthNoteTime += pattern.stepSec
      synthStepIdx = (synthStepIdx + 1) % pattern.steps.length
    }
  }

  pump()
  synthTimer = window.setInterval(pump, 60)
  emitChange()
}

async function startFileOrFallbackLoop(theme: BgmTheme, seq: number) {
  const manifest = await loadTrackManifest()
  if (seq !== transitionSeq || bgmMuted || desiredTheme !== theme) return

  const selectedUrl = pickPlayableAudioUrl(manifest[theme], canPlayUrlHelper())
  if (!selectedUrl) {
    startSynthLoop(theme)
    return
  }

  const ctx = getAudioContext()
  if (ctx && masterGain) {
    try {
      let buffer = decodedBufferCache.get(selectedUrl)
      if (!buffer) {
        const res = await fetch(selectedUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const arrayBuf = await res.arrayBuffer()
        if (seq !== transitionSeq || bgmMuted || desiredTheme !== theme) return
        buffer = await ctx.decodeAudioData(arrayBuf)
        decodedBufferCache.set(selectedUrl, buffer)
      }
      if (seq !== transitionSeq || bgmMuted || desiredTheme !== theme) return
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => undefined)
      }
      applyMasterGain()
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.loop = true
      src.connect(masterGain)
      src.start(0)
      activeBufferSource = src
      activeTheme = theme
      activeSource = 'file'
      activeUrl = selectedUrl
      emitChange()
      return
    } catch {
      if (seq !== transitionSeq || bgmMuted || desiredTheme !== theme) return
    }
  }

  // Fallback to HTMLAudioElement loop if Web Audio decodeAudioData fails
  if (typeof Audio !== 'undefined') {
    try {
      const el = new Audio(selectedUrl)
      el.loop = true
      el.preload = 'auto'
      el.volume = bgmMuted ? 0 : bgmVolume
      activeHtmlAudio = el
      activeTheme = theme
      activeSource = 'file'
      activeUrl = selectedUrl
      emitChange()
      void el.play().catch(() => undefined)
      return
    } catch {
      if (seq !== transitionSeq || bgmMuted || desiredTheme !== theme) return
    }
  }

  startSynthLoop(theme)
}

function ensureLifecycleHooks() {
  if (lifecycleHooksInstalled || typeof window === 'undefined') return
  lifecycleHooksInstalled = true

  const unlockAudio = () => {
    if (bgmMuted) return
    const ctx = getAudioContext()
    if (ctx && ctx.state === 'suspended') {
      void ctx
        .resume()
        .then(() => {
          if (!bgmMuted && activeSource === 'synth' && activeTheme) {
            nextSynthNoteTime = ctx.currentTime + 0.04
          }
        })
        .catch(() => undefined)
    }
    if (activeHtmlAudio && activeHtmlAudio.paused && !bgmMuted) {
      void activeHtmlAudio.play().catch(() => undefined)
    }
  }

  const onVisibilityChange = () => {
    if (typeof document === 'undefined') return
    if (document.hidden) {
      if (bgmCtx && bgmCtx.state === 'running') {
        void bgmCtx.suspend().catch(() => undefined)
      }
      if (activeHtmlAudio && !activeHtmlAudio.paused) {
        activeHtmlAudio.pause()
      }
    } else if (!bgmMuted) {
      if (bgmCtx && bgmCtx.state === 'suspended') {
        void bgmCtx
          .resume()
          .then(() => {
            if (bgmCtx && activeSource === 'synth') {
              nextSynthNoteTime = bgmCtx.currentTime + 0.04
            }
          })
          .catch(() => undefined)
      }
      if (activeHtmlAudio && activeHtmlAudio.paused) {
        void activeHtmlAudio.play().catch(() => undefined)
      }
      if (!activeTheme) {
        syncBgmContext(lastContext)
      }
    }
  }

  window.addEventListener('pointerdown', unlockAudio, { passive: true })
  window.addEventListener('touchstart', unlockAudio, { passive: true })
  window.addEventListener('keydown', unlockAudio, { passive: true })
  window.addEventListener('click', unlockAudio, { passive: true })
  document.addEventListener('visibilitychange', onVisibilityChange)
}

export function isBgmMuted(): boolean {
  return bgmMuted
}

export function getBgmVolume(): number {
  return bgmVolume
}

export function getBgmSnapshot(): BgmSnapshot {
  return {
    muted: bgmMuted,
    volume: bgmVolume,
    desiredTheme,
    activeTheme,
    source: activeSource,
    activeUrl,
    availableTracks: manifestCache,
  }
}

export function subscribeBgm(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setBgmVolume(vol: number): number {
  bgmVolume = clampBgmVolume(vol)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(BGM_VOLUME_KEY, String(bgmVolume))
    } catch {
      // Ignore storage access errors.
    }
  }
  applyMasterGain()
  emitChange()
  return bgmVolume
}

export function stopBgm() {
  transitionSeq += 1
  stopActivePlayback(true)
  emitChange()
}

export function syncBgmContext(ctxInput: BgmResolveContext, forceRestart = false) {
  lastContext = ctxInput
  const nextTheme = resolveBgmTheme(ctxInput)
  const themeChanged = desiredTheme !== nextTheme
  desiredTheme = nextTheme

  if (typeof window === 'undefined') return
  ensureLifecycleHooks()

  if (bgmMuted) {
    if (activeTheme !== null || activeSource !== 'idle') {
      stopBgm()
    } else if (themeChanged) {
      emitChange()
    }
    return
  }

  const isRunning = activeTheme === nextTheme && (activeBufferSource !== null || activeHtmlAudio !== null || synthTimer !== null)
  if (isRunning && !forceRestart) {
    return
  }

  transitionSeq += 1
  const mySeq = transitionSeq
  stopActivePlayback(true)
  emitChange()
  void startFileOrFallbackLoop(nextTheme, mySeq)
}

export function syncBgmForMap(mapId: string, bossActive = false) {
  syncBgmContext({ screen: 'game', mapId, bossActive })
}

export function setBgmMuted(muted: boolean, contextOrMapId?: string | BgmResolveContext): boolean {
  bgmMuted = muted
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(BGM_MUTED_KEY, bgmMuted ? '1' : '0')
    } catch {
      // Ignore storage access errors.
    }
  }

  const nextCtx: BgmResolveContext =
    typeof contextOrMapId === 'string'
      ? { screen: 'game', mapId: contextOrMapId, bossActive: lastContext.bossActive }
      : contextOrMapId ?? lastContext

  if (bgmMuted) {
    lastContext = nextCtx
    desiredTheme = resolveBgmTheme(nextCtx)
    stopBgm()
  } else {
    syncBgmContext(nextCtx, true)
  }
  return bgmMuted
}

export function toggleBgmMute(contextOrMapId?: string | BgmResolveContext): boolean {
  return setBgmMuted(!bgmMuted, contextOrMapId)
}

export function refreshBgmManifest(): Promise<Record<BgmTheme, string[]>> {
  manifestPromise = null
  return loadTrackManifest()
}

export function getBgmThemeLabel(theme: BgmTheme): string {
  return BGM_TRACK_CATALOG[theme].labelTh
}
