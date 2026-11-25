'use client'

import { clampBgmVolume } from './bgm-tracks'

let sharedAudioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctor()
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume().catch(() => {})
  }
  return sharedAudioCtx
}

const SFX_MUTED_KEY = 'pixel-quest-sfx-muted'
const SFX_VOLUME_KEY = 'pixel-quest-sfx-volume'
const DEFAULT_SFX_VOLUME = 0.8

let globalSfxMuted = false
let globalSfxVolume = DEFAULT_SFX_VOLUME
const sfxListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  try {
    globalSfxMuted = window.localStorage.getItem(SFX_MUTED_KEY) === '1'
    const rawVol = window.localStorage.getItem(SFX_VOLUME_KEY)
    if (rawVol !== null) {
      const parsed = Number(rawVol)
      if (Number.isFinite(parsed)) {
        globalSfxVolume = clampBgmVolume(parsed)
      }
    }
  } catch {
    // Ignore storage errors cleanly.
  }
}

function emitSfxChange() {
  for (const listener of sfxListeners) {
    try {
      listener()
    } catch {
      // Never break SFX on listener errors.
    }
  }
}

export function isSfxMuted(): boolean {
  return globalSfxMuted
}

export function getSfxVolume(): number {
  return globalSfxVolume
}

export function setSfxMuted(muted: boolean): boolean {
  globalSfxMuted = muted
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SFX_MUTED_KEY, muted ? '1' : '0')
    } catch {
      // Ignore storage errors cleanly.
    }
  }
  emitSfxChange()
  return globalSfxMuted
}

export function setSfxVolume(vol: number): number {
  globalSfxVolume = clampBgmVolume(vol)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SFX_VOLUME_KEY, String(globalSfxVolume))
    } catch {
      // Ignore storage errors cleanly.
    }
  }
  emitSfxChange()
  return globalSfxVolume
}

export function subscribeSfx(listener: () => void): () => void {
  sfxListeners.add(listener)
  return () => {
    sfxListeners.delete(listener)
  }
}

function playTone(
  freqStart: number,
  freqEnd: number,
  duration: number,
  type: OscillatorType = 'square',
  gainValue = 0.06,
  delay = 0,
) {
  if (globalSfxMuted || globalSfxVolume <= 0) return
  const ctx = getCtx()
  if (!ctx) return
  try {
    const startAt = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const scaledGain = Math.max(0.0002, gainValue * globalSfxVolume)
    osc.type = type
    osc.frequency.setValueAtTime(freqStart, startAt)
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), startAt + duration)
    gain.gain.setValueAtTime(scaledGain, startAt)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(startAt)
    osc.stop(startAt + duration + 0.01)
  } catch {
    // Ignore audio context errors when autoplay is blocked.
  }
}

export function playAttackSfx(muted: boolean) {
  if (muted) return
  playTone(340, 140, 0.09, 'square', 0.05)
}

export function playCritSfx(muted: boolean) {
  if (muted) return
  playTone(520, 880, 0.08, 'triangle', 0.07)
  playTone(740, 260, 0.12, 'sawtooth', 0.05, 0.05)
}

export function playSkillSfx(muted: boolean) {
  if (muted) return
  playTone(392, 659, 0.1, 'triangle', 0.06)
  playTone(587, 987, 0.14, 'square', 0.045, 0.06)
}

export function playEnemyHitSfx(muted: boolean) {
  if (muted) return
  playTone(170, 75, 0.11, 'sawtooth', 0.055)
}

export function playVictorySfx(muted: boolean) {
  if (muted) return
  playTone(523.25, 523.25, 0.09, 'square', 0.05, 0)
  playTone(659.25, 659.25, 0.09, 'square', 0.05, 0.08)
  playTone(783.99, 1046.5, 0.18, 'triangle', 0.065, 0.16)
}

export function playLevelUpSfx(muted: boolean) {
  if (muted) return
  playTone(523.25, 523.25, 0.08, 'triangle', 0.06, 0)
  playTone(659.25, 659.25, 0.08, 'triangle', 0.06, 0.07)
  playTone(783.99, 783.99, 0.08, 'triangle', 0.06, 0.14)
  playTone(1046.5, 1174.66, 0.24, 'triangle', 0.075, 0.21)
}

export function playEnhanceSfx(success: boolean, muted: boolean) {
  if (muted) return
  if (success) {
    playTone(440, 880, 0.14, 'triangle', 0.065)
    playTone(880, 1320, 0.16, 'sine', 0.055, 0.09)
  } else {
    playTone(210, 95, 0.18, 'sawtooth', 0.05)
  }
}

export function playPetAttackSfx(muted: boolean) {
  if (muted) return
  playTone(620, 920, 0.07, 'sine', 0.04)
}

export function playQuestClaimSfx(muted: boolean) {
  if (muted) return
  playTone(587.33, 587.33, 0.07, 'triangle', 0.05, 0)
  playTone(783.99, 1046.5, 0.14, 'triangle', 0.06, 0.06)
}
