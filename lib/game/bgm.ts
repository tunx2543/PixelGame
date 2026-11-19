'use client'

export type BgmTheme = 'town' | 'field' | 'dungeon' | 'boss'

const BGM_MUTED_KEY = 'pixel-quest-bgm-muted'
const BGM_VOLUME_KEY = 'pixel-quest-bgm-volume'

const MELODIES: Record<BgmTheme, { tempoMs: number; notes: number[]; wave: OscillatorType }> = {
  town: {
    tempoMs: 360,
    wave: 'triangle',
    notes: [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 523.25, 392.0],
  },
  field: {
    tempoMs: 280,
    wave: 'square',
    notes: [440.0, 523.25, 587.33, 659.25, 587.33, 523.25, 440.0, 392.0],
  },
  dungeon: {
    tempoMs: 250,
    wave: 'sawtooth',
    notes: [220.0, 261.63, 246.94, 196.0, 220.0, 293.66, 261.63, 196.0],
  },
  boss: {
    tempoMs: 185,
    wave: 'sawtooth',
    notes: [293.66, 349.23, 329.63, 440.0, 392.0, 349.23, 329.63, 261.63],
  },
}

let audioCtx: AudioContext | null = null
let loopTimer: number | null = null
let stepIdx = 0
let currentTheme: BgmTheme | null = null
let bgmMuted = true
let bgmVolume = 0.25

if (typeof window !== 'undefined') {
  try {
    const savedMute = window.localStorage.getItem(BGM_MUTED_KEY)
    bgmMuted = savedMute === null ? true : savedMute === '1'
    const savedVol = Number(window.localStorage.getItem(BGM_VOLUME_KEY))
    if (Number.isFinite(savedVol) && savedVol >= 0 && savedVol <= 1) bgmVolume = savedVol
  } catch {
    // Ignore storage access errors cleanly.
  }
}

export function resolveBgmTheme(mapId: string, bossActive = false): BgmTheme {
  if (bossActive || mapId === 'world') return 'boss'
  if (mapId === 'town') return 'town'
  if (
    mapId === 'cave' ||
    mapId === 'volcano' ||
    mapId === 'abyss' ||
    mapId === 'graveyard' ||
    mapId === 'ruins' ||
    mapId === 'crystal'
  ) {
    return 'dungeon'
  }
  return 'field'
}

export function isBgmMuted(): boolean {
  return bgmMuted
}

export function getBgmVolume(): number {
  return bgmVolume
}

export function setBgmVolume(vol: number) {
  bgmVolume = Math.max(0, Math.min(1, vol))
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(BGM_VOLUME_KEY, String(bgmVolume))
    } catch {
      // Ignore storage access errors.
    }
  }
}

function playNote(freq: number, wave: OscillatorType, durationSec: number) {
  if (bgmMuted || typeof window === 'undefined') return
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return
  if (!audioCtx) audioCtx = new Ctx()
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => undefined)
  }

  try {
    const now = audioCtx.currentTime
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = wave
    osc.frequency.setValueAtTime(freq, now)
    const peak = Math.max(0.005, bgmVolume * 0.065)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start(now)
    osc.stop(now + durationSec + 0.02)
  } catch {
    // Ignore Web Audio restriction errors cleanly.
  }
}

export function stopBgm() {
  if (loopTimer !== null && typeof window !== 'undefined') {
    window.clearInterval(loopTimer)
    loopTimer = null
  }
  currentTheme = null
}

export function syncBgmForMap(mapId: string, bossActive = false) {
  if (typeof window === 'undefined') return
  const nextTheme = resolveBgmTheme(mapId, bossActive)
  if (bgmMuted) {
    stopBgm()
    return
  }
  if (currentTheme === nextTheme && loopTimer !== null) return
  stopBgm()
  currentTheme = nextTheme
  stepIdx = 0
  const spec = MELODIES[nextTheme]
  loopTimer = window.setInterval(() => {
    if (bgmMuted || !currentTheme) return
    const note = spec.notes[stepIdx % spec.notes.length]
    stepIdx += 1
    playNote(note, spec.wave, Math.min(0.32, (spec.tempoMs / 1000) * 0.85))
  }, spec.tempoMs)
}

export function toggleBgmMute(mapId: string): boolean {
  bgmMuted = !bgmMuted
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(BGM_MUTED_KEY, bgmMuted ? '1' : '0')
    } catch {
      // Ignore storage access errors.
    }
  }
  if (bgmMuted) stopBgm()
  else syncBgmForMap(mapId)
  return bgmMuted
}
