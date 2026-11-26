'use client'

import {
  BGM_MAP_TRACK_CATALOG,
  BGM_THEMES,
  BGM_TRACK_CATALOG,
  BGM_TRACK_IDS,
  clampBgmVolume,
  getBgmTrackMeta,
  pickPlayableAudioUrl,
  resolveBgmTheme,
  resolveBgmTrackId,
  type BgmMapTrackMeta,
  type BgmResolveContext,
  type BgmTheme,
  type BgmTrackId,
} from './bgm-tracks'
import {
  getOrchestralScore,
  noteToHz,
  type ArpTimbre,
  type LeadTimbre,
  type OrchestralScore,
  type PadTimbre,
  type PercHit,
  type ScoreStep,
} from './bgm-scores'

export {
  BGM_BATTLE_HOLD_SEC,
  BGM_MAP_TRACK_CATALOG,
  BGM_THEMES,
  BGM_TRACK_CATALOG,
  BGM_TRACK_IDS,
  getBgmTrackMeta,
  isDungeonBgmMapId,
  isSpecialEventBgmMapId,
  resolveBgmTheme,
  resolveBgmTrackId,
  type BgmMapTrackMeta,
  type BgmResolveContext,
  type BgmTheme,
  type BgmTrackId,
  type BgmTrackSpec,
} from './bgm-tracks'

export type BgmPlaybackSource = 'file' | 'synth' | 'idle'

export interface BgmSnapshot {
  muted: boolean
  volume: number
  desiredTheme: BgmTheme
  activeTheme: BgmTheme | null
  desiredTrackId: BgmTrackId
  activeTrackId: BgmTrackId | null
  source: BgmPlaybackSource
  activeUrl: string | null
  availableTracks: Record<BgmTheme, string[]>
  availableMapTracks: Partial<Record<BgmTrackId, string[]>>
}

interface BgmManifestData {
  tracks: Record<BgmTheme, string[]>
  mapTracks: Partial<Record<BgmTrackId, string[]>>
}

const BGM_MUTED_KEY = 'pixel-quest-bgm-muted'
const BGM_VOLUME_KEY = 'pixel-quest-bgm-volume'
const DEFAULT_BGM_VOLUME = 0.35

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
let mixCompressor: DynamicsCompressorNode | null = null
let reverbNode: ConvolverNode | null = null
let reverbBufferCache: AudioBuffer | null = null
let whiteNoiseBufferCache: AudioBuffer | null = null

let activeTrackDryGain: GainNode | null = null
let activeTrackWetGain: GainNode | null = null
let activeBufferSource: AudioBufferSourceNode | null = null
let activeHtmlAudio: HTMLAudioElement | null = null
let synthTimer: number | null = null
let nextSynthNoteTime = 0
let synthStepIdx = 0

let bgmMuted = false
let bgmVolume = DEFAULT_BGM_VOLUME
let desiredTheme: BgmTheme = 'login'
let activeTheme: BgmTheme | null = null
let desiredTrackId: BgmTrackId = 'login'
let activeTrackId: BgmTrackId | null = null
let activeSource: BgmPlaybackSource = 'idle'
let activeUrl: string | null = null
let lastContext: BgmResolveContext = { screen: 'login' }
let transitionSeq = 0

let manifestCache: BgmManifestData = {
  tracks: emptyAvailableTracks(),
  mapTracks: {},
}
let manifestPromise: Promise<BgmManifestData> | null = null
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

function createHallImpulseResponse(ctx: AudioContext): AudioBuffer {
  const durationSec = 1.85
  const length = Math.max(1, Math.floor(ctx.sampleRate * durationSec))
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    let lp = 0
    for (let i = 0; i < length; i++) {
      const t = i / length
      // Early reflection pre-delay + smooth warm concert hall decay
      const env = t < 0.014 ? t / 0.014 : Math.pow(1 - t, 2.85)
      const white = Math.random() * 2 - 1
      // One-pole low-pass damping so reverb feels silky rather than metallic
      lp = lp * 0.72 + white * 0.28
      data[i] = lp * env * 0.48
    }
  }
  return impulse
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (whiteNoiseBufferCache && whiteNoiseBufferCache.sampleRate === ctx.sampleRate) {
    return whiteNoiseBufferCache
  }
  const len = Math.floor(ctx.sampleRate * 0.5)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1
  }
  whiteNoiseBufferCache = buf
  return buf
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

    mixCompressor = bgmCtx.createDynamicsCompressor()
    mixCompressor.threshold.setValueAtTime(-16, bgmCtx.currentTime)
    mixCompressor.knee.setValueAtTime(14, bgmCtx.currentTime)
    mixCompressor.ratio.setValueAtTime(3.2, bgmCtx.currentTime)
    mixCompressor.attack.setValueAtTime(0.01, bgmCtx.currentTime)
    mixCompressor.release.setValueAtTime(0.22, bgmCtx.currentTime)
    mixCompressor.connect(masterGain)

    reverbBufferCache = createHallImpulseResponse(bgmCtx)
    reverbNode = bgmCtx.createConvolver()
    reverbNode.buffer = reverbBufferCache
    reverbNode.connect(mixCompressor)
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

function releaseActiveTrackBuses(immediate = false) {
  const dry = activeTrackDryGain
  const wet = activeTrackWetGain
  activeTrackDryGain = null
  activeTrackWetGain = null

  if (!bgmCtx || (!dry && !wet)) return

  const now = bgmCtx.currentTime
  const fadeOutSec = immediate ? 0.015 : 0.09

  for (const bus of [dry, wet]) {
    if (!bus) continue
    try {
      bus.gain.cancelScheduledValues(now)
      bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), now)
      bus.gain.linearRampToValueAtTime(0.0001, now + fadeOutSec)
      window.setTimeout(() => {
        try {
          bus.disconnect()
        } catch {
          // Already disconnected.
        }
      }, Math.ceil((fadeOutSec + 0.04) * 1000))
    } catch {
      try {
        bus.disconnect()
      } catch {
        // Ignore cleanup errors.
      }
    }
  }
}

function stopActivePlayback(clearTrack = true, immediateFade = false) {
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
  releaseActiveTrackBuses(immediateFade)
  if (clearTrack) {
    activeTheme = null
    activeTrackId = null
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

async function loadTrackManifest(): Promise<BgmManifestData> {
  if (typeof window === 'undefined') return manifestCache
  if (!manifestPromise) {
    manifestPromise = fetch('/api/audio/bgm-manifest', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return manifestCache
        const json = (await res.json()) as {
          tracks?: Partial<Record<BgmTheme, string[]>>
          mapTracks?: Partial<Record<BgmTrackId, string[]>>
        }
        const mergedTracks = emptyAvailableTracks()
        for (const theme of BGM_THEMES) {
          const list = json.tracks?.[theme]
          mergedTracks[theme] = Array.isArray(list)
            ? list.filter((u): u is string => typeof u === 'string')
            : []
        }
        const mergedMapTracks: Partial<Record<BgmTrackId, string[]>> = {}
        if (json.mapTracks) {
          for (const id of BGM_TRACK_IDS) {
            const list = json.mapTracks[id]
            if (Array.isArray(list) && list.length > 0) {
              mergedMapTracks[id] = list.filter((u): u is string => typeof u === 'string')
            }
          }
        }
        manifestCache = {
          tracks: mergedTracks,
          mapTracks: mergedMapTracks,
        }
        emitChange()
        return manifestCache
      })
      .catch(() => manifestCache)
  }
  return manifestPromise
}

/* ============================================================================
 * Multi-Instrument MMORPG Open World Orchestral Synthesis
 * ============================================================================ */

function connectVoice(
  node: AudioNode,
  dryBus: AudioNode,
  wetBus: AudioNode | null,
  reverbSendRatio = 1,
) {
  node.connect(dryBus)
  if (wetBus && reverbSendRatio > 0) {
    node.connect(wetBus)
  }
}

function schedulePadChord(
  ctx: AudioContext,
  dryBus: AudioNode,
  wetBus: AudioNode | null,
  notes: readonly string[],
  timbre: PadTimbre,
  when: number,
  durSec: number,
  gainAmount: number,
) {
  if (notes.length === 0 || gainAmount <= 0) return

  const chordBus = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'

  const cutoff =
    timbre === 'choir'
      ? 1650
      : timbre === 'organ'
        ? 2100
        : timbre === 'breeze'
          ? 1350
          : 1550
  filter.frequency.setValueAtTime(cutoff, when)
  filter.Q.setValueAtTime(timbre === 'choir' ? 1.8 : 0.7, when)

  const attack = Math.min(0.42, durSec * 0.25)
  const release = Math.min(0.55, durSec * 0.28)
  const perVoiceGain = gainAmount / Math.max(1.6, Math.sqrt(notes.length))

  chordBus.gain.setValueAtTime(0.0001, when)
  chordBus.gain.linearRampToValueAtTime(perVoiceGain, when + attack)
  chordBus.gain.setValueAtTime(perVoiceGain * 0.92, Math.max(when + attack, when + durSec - release))
  chordBus.gain.exponentialRampToValueAtTime(0.0001, when + durSec)

  chordBus.connect(filter)
  connectVoice(filter, dryBus, wetBus)

  for (let i = 0; i < notes.length; i++) {
    const hz = noteToHz(notes[i])
    if (hz <= 0) continue

    if (timbre === 'organ') {
      // Cathedral pipe organ: fundamental + warm 2nd harmonic + gentle 3rd partial
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const g2 = ctx.createGain()
      osc1.type = 'triangle'
      osc1.frequency.setValueAtTime(hz, when)
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(hz * 2, when)
      g2.gain.setValueAtTime(0.32, when)

      osc1.connect(chordBus)
      osc2.connect(g2)
      g2.connect(chordBus)
      osc1.start(when)
      osc2.start(when)
      osc1.stop(when + durSec + 0.05)
      osc2.stop(when + durSec + 0.05)
    } else {
      // Warm stereo-detuned string / choir ensemble pair
      const oscA = ctx.createOscillator()
      const oscB = ctx.createOscillator()
      oscA.type = timbre === 'breeze' ? 'sine' : 'sawtooth'
      oscB.type = timbre === 'choir' ? 'triangle' : 'sawtooth'
      oscA.frequency.setValueAtTime(hz, when)
      oscB.frequency.setValueAtTime(hz, when)
      oscA.detune.setValueAtTime(-5.5 + i * 1.2, when)
      oscB.detune.setValueAtTime(5.5 - i * 1.1, when)

      const subGain = ctx.createGain()
      subGain.gain.setValueAtTime(0.5, when)
      oscA.connect(subGain)
      oscB.connect(subGain)
      subGain.connect(chordBus)

      oscA.start(when)
      oscB.start(when)
      oscA.stop(when + durSec + 0.05)
      oscB.stop(when + durSec + 0.05)
    }
  }
}

function scheduleArpNote(
  ctx: AudioContext,
  dryBus: AudioNode,
  wetBus: AudioNode | null,
  note: string,
  timbre: ArpTimbre,
  when: number,
  stepSec: number,
  gainAmount: number,
) {
  const hz = noteToHz(note)
  if (hz <= 0 || gainAmount <= 0) return

  const dur =
    timbre === 'harp'
      ? Math.max(0.55, stepSec * 2.8)
      : timbre === 'celesta'
        ? Math.max(0.65, stepSec * 3.1)
        : timbre === 'koto'
          ? Math.max(0.38, stepSec * 1.9)
          : Math.max(0.45, stepSec * 2.2)

  const osc = ctx.createOscillator()
  const overtone = ctx.createOscillator()
  const overGain = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  const env = ctx.createGain()

  filter.type = 'lowpass'

  if (timbre === 'harp') {
    osc.type = 'triangle'
    overtone.type = 'sine'
    overtone.frequency.setValueAtTime(hz * 2, when)
    overGain.gain.setValueAtTime(0.24, when)
    filter.frequency.setValueAtTime(Math.min(4800, hz * 5.5), when)
    filter.frequency.exponentialRampToValueAtTime(Math.max(420, hz * 1.4), when + dur)
  } else if (timbre === 'celesta') {
    osc.type = 'sine'
    overtone.type = 'triangle'
    overtone.frequency.setValueAtTime(hz * 2, when)
    overGain.gain.setValueAtTime(0.3, when)
    overGain.gain.exponentialRampToValueAtTime(0.02, when + dur * 0.45)
    filter.frequency.setValueAtTime(6200, when)
  } else if (timbre === 'koto') {
    osc.type = 'sawtooth'
    overtone.type = 'triangle'
    overtone.frequency.setValueAtTime(hz * 2, when)
    overGain.gain.setValueAtTime(0.18, when)
    filter.frequency.setValueAtTime(Math.min(5200, hz * 7), when)
    filter.frequency.exponentialRampToValueAtTime(Math.max(500, hz * 1.3), when + dur * 0.65)
  } else if (timbre === 'lute') {
    osc.type = 'triangle'
    overtone.type = 'sawtooth'
    overtone.frequency.setValueAtTime(hz, when)
    overGain.gain.setValueAtTime(0.28, when)
    filter.frequency.setValueAtTime(Math.min(3600, hz * 4.5), when)
    filter.frequency.exponentialRampToValueAtTime(Math.max(380, hz * 1.2), when + dur * 0.8)
  } else {
    // strings pizzicato / spiccato arpeggio
    osc.type = 'sawtooth'
    overtone.type = 'triangle'
    overtone.frequency.setValueAtTime(hz, when)
    overGain.gain.setValueAtTime(0.4, when)
    filter.frequency.setValueAtTime(2400, when)
  }

  osc.frequency.setValueAtTime(hz, when)

  env.gain.setValueAtTime(0.0001, when)
  env.gain.linearRampToValueAtTime(gainAmount, when + 0.009)
  env.gain.exponentialRampToValueAtTime(gainAmount * 0.34, when + dur * 0.25)
  env.gain.exponentialRampToValueAtTime(0.0001, when + dur)

  osc.connect(filter)
  overtone.connect(overGain)
  overGain.connect(filter)
  filter.connect(env)
  connectVoice(env, dryBus, wetBus)

  osc.start(when)
  overtone.start(when)
  osc.stop(when + dur + 0.03)
  overtone.stop(when + dur + 0.03)
}

function scheduleLeadNote(
  ctx: AudioContext,
  dryBus: AudioNode,
  wetBus: AudioNode | null,
  note: string,
  timbre: LeadTimbre,
  when: number,
  durSec: number,
  gainAmount: number,
) {
  const hz = noteToHz(note)
  if (hz <= 0 || gainAmount <= 0) return

  const osc1 = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  const osc2Gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  const env = ctx.createGain()

  filter.type = 'lowpass'

  let attack = 0.045
  let vibRate = 5.2
  let vibDepth = 4.5
  let vibratoDelay = 0.08

  switch (timbre) {
    case 'flute':
    case 'whistle': {
      osc1.type = 'sine'
      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(hz * 2, when)
      osc2Gain.gain.setValueAtTime(timbre === 'whistle' ? 0.16 : 0.11, when)
      filter.frequency.setValueAtTime(3600, when)
      attack = 0.055
      vibRate = timbre === 'whistle' ? 5.8 : 5.0
      vibDepth = 5.0
      break
    }
    case 'oboe': {
      osc1.type = 'sawtooth'
      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(hz, when)
      osc2Gain.gain.setValueAtTime(0.35, when)
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(Math.min(2400, hz * 2.2), when)
      filter.Q.setValueAtTime(1.4, when)
      attack = 0.04
      vibRate = 5.4
      vibDepth = 4.0
      break
    }
    case 'horn': {
      osc1.type = 'sawtooth'
      osc2.type = 'sawtooth'
      osc2.frequency.setValueAtTime(hz, when)
      osc2.detune.setValueAtTime(6, when)
      osc2Gain.gain.setValueAtTime(0.65, when)
      filter.frequency.setValueAtTime(680, when)
      filter.frequency.linearRampToValueAtTime(Math.min(2600, hz * 3.8), when + Math.min(0.16, durSec * 0.35))
      filter.frequency.linearRampToValueAtTime(Math.max(700, hz * 2.1), when + durSec)
      attack = 0.065
      vibRate = 4.4
      vibDepth = 3.0
      break
    }
    case 'strings': {
      osc1.type = 'sawtooth'
      osc2.type = 'sawtooth'
      osc2.frequency.setValueAtTime(hz, when)
      osc1.detune.setValueAtTime(-7, when)
      osc2.detune.setValueAtTime(7, when)
      osc2Gain.gain.setValueAtTime(0.85, when)
      filter.frequency.setValueAtTime(2400, when)
      attack = Math.min(0.11, durSec * 0.25)
      vibRate = 5.4
      vibDepth = 6.0
      break
    }
    case 'organ': {
      osc1.type = 'triangle'
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(hz * 2, when)
      osc2Gain.gain.setValueAtTime(0.38, when)
      filter.frequency.setValueAtTime(2600, when)
      attack = 0.03
      vibDepth = 1.5
      break
    }
    case 'harp':
    case 'celesta': {
      osc1.type = timbre === 'celesta' ? 'sine' : 'triangle'
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(hz * 2, when)
      osc2Gain.gain.setValueAtTime(0.28, when)
      filter.frequency.setValueAtTime(4800, when)
      attack = 0.01
      vibDepth = 0
      vibratoDelay = 99
      break
    }
    case 'koto':
    case 'oud': {
      osc1.type = 'sawtooth'
      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(hz * (timbre === 'koto' ? 2 : 1), when)
      osc2Gain.gain.setValueAtTime(0.4, when)
      filter.frequency.setValueAtTime(Math.min(4800, hz * 6), when)
      filter.frequency.exponentialRampToValueAtTime(Math.max(480, hz * 1.5), when + durSec)
      attack = 0.008
      vibRate = 4.8
      vibDepth = timbre === 'oud' ? 5.0 : 2.5
      vibratoDelay = 0.06
      break
    }
  }

  osc1.frequency.setValueAtTime(hz, when)
  if (timbre !== 'horn' && timbre !== 'strings') {
    osc2.frequency.setValueAtTime(
      timbre === 'flute' || timbre === 'whistle' || timbre === 'organ' || timbre === 'harp' || timbre === 'celesta' || timbre === 'koto'
        ? hz * 2
        : hz,
      when,
    )
  }

  // Expressive vibrato for sustained orchestral instruments
  let lfo: OscillatorNode | null = null
  if (vibDepth > 0 && durSec > 0.2) {
    lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.type = 'sine'
    lfo.frequency.setValueAtTime(vibRate, when)
    lfoGain.gain.setValueAtTime(0, when)
    lfoGain.gain.linearRampToValueAtTime(vibDepth, when + Math.min(durSec * 0.45, vibratoDelay + 0.14))
    lfo.connect(lfoGain)
    lfoGain.connect(osc1.detune)
    lfo.start(when)
    lfo.stop(when + durSec + 0.06)
  }

  const release = Math.min(0.18, durSec * 0.35)
  env.gain.setValueAtTime(0.0001, when)
  env.gain.linearRampToValueAtTime(gainAmount, when + attack)
  if (timbre === 'harp' || timbre === 'celesta' || timbre === 'koto' || timbre === 'oud') {
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainAmount * 0.28), when + durSec * 0.55)
    env.gain.exponentialRampToValueAtTime(0.0001, when + durSec)
  } else {
    env.gain.setValueAtTime(gainAmount * 0.88, Math.max(when + attack, when + durSec - release))
    env.gain.exponentialRampToValueAtTime(0.0001, when + durSec)
  }

  osc1.connect(filter)
  osc2.connect(osc2Gain)
  osc2Gain.connect(filter)
  filter.connect(env)
  connectVoice(env, dryBus, wetBus)

  osc1.start(when)
  osc2.start(when)
  osc1.stop(when + durSec + 0.05)
  osc2.stop(when + durSec + 0.05)
}

function scheduleBassNote(
  ctx: AudioContext,
  dryBus: AudioNode,
  wetBus: AudioNode | null,
  note: string,
  when: number,
  durSec: number,
  gainAmount: number,
) {
  const hz = noteToHz(note)
  if (hz <= 0 || gainAmount <= 0) return

  const sub = ctx.createOscillator()
  const cello = ctx.createOscillator()
  const celloGain = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  const env = ctx.createGain()

  sub.type = 'sine'
  sub.frequency.setValueAtTime(hz, when)

  cello.type = 'triangle'
  cello.frequency.setValueAtTime(hz, when)
  celloGain.gain.setValueAtTime(0.45, when)

  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(420, when)

  const attack = 0.035
  env.gain.setValueAtTime(0.0001, when)
  env.gain.linearRampToValueAtTime(gainAmount, when + attack)
  env.gain.setValueAtTime(gainAmount * 0.85, Math.max(when + attack, when + durSec * 0.72))
  env.gain.exponentialRampToValueAtTime(0.0001, when + durSec)

  sub.connect(filter)
  cello.connect(celloGain)
  celloGain.connect(filter)
  filter.connect(env)
  connectVoice(env, dryBus, wetBus)

  sub.start(when)
  cello.start(when)
  sub.stop(when + durSec + 0.05)
  cello.stop(when + durSec + 0.05)
}

function schedulePercHit(
  ctx: AudioContext,
  dryBus: AudioNode,
  wetBus: AudioNode | null,
  hit: PercHit,
  when: number,
  gainAmount: number,
) {
  if (gainAmount <= 0) return

  if (hit === 'kick' || hit === 'timpani') {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = 'sine'
    const startHz = hit === 'timpani' ? 115 : 132
    const endHz = hit === 'timpani' ? 58 : 44
    const dur = hit === 'timpani' ? 0.42 : 0.22

    osc.frequency.setValueAtTime(startHz, when)
    osc.frequency.exponentialRampToValueAtTime(endHz, when + dur * 0.55)

    env.gain.setValueAtTime(0.0001, when)
    env.gain.linearRampToValueAtTime(gainAmount * (hit === 'timpani' ? 1.15 : 0.95), when + 0.008)
    env.gain.exponentialRampToValueAtTime(0.0001, when + dur)

    osc.connect(env)
    connectVoice(env, dryBus, wetBus)
    osc.start(when)
    osc.stop(when + dur + 0.03)
    return
  }

  // Noise-based snare / shaker
  const noiseSrc = ctx.createBufferSource()
  noiseSrc.buffer = getNoiseBuffer(ctx)

  const filter = ctx.createBiquadFilter()
  const env = ctx.createGain()

  if (hit === 'snare') {
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(1750, when)
    filter.Q.setValueAtTime(1.1, when)
    env.gain.setValueAtTime(0.0001, when)
    env.gain.linearRampToValueAtTime(gainAmount * 0.72, when + 0.005)
    env.gain.exponentialRampToValueAtTime(0.0001, when + 0.16)
    noiseSrc.connect(filter)
    filter.connect(env)
    connectVoice(env, dryBus, wetBus)
    noiseSrc.start(when)
    noiseSrc.stop(when + 0.18)
  } else {
    // subtle shaker / tambourine
    filter.type = 'highpass'
    filter.frequency.setValueAtTime(5200, when)
    env.gain.setValueAtTime(0.0001, when)
    env.gain.linearRampToValueAtTime(gainAmount * 0.42, when + 0.006)
    env.gain.exponentialRampToValueAtTime(0.0001, when + 0.075)
    noiseSrc.connect(filter)
    filter.connect(env)
    connectVoice(env, dryBus, wetBus)
    noiseSrc.start(when)
    noiseSrc.stop(when + 0.09)
  }
}

function scheduleOrchestralStep(
  ctx: AudioContext,
  dryBus: AudioNode,
  wetBus: AudioNode | null,
  score: OrchestralScore,
  when: number,
  stepIndex: number,
) {
  const step: ScoreStep = score.steps[stepIndex % score.steps.length]

  if (step.chord && step.chord.length > 0) {
    const chordDur = (step.chordDurSteps ?? 7.8) * score.stepSec
    schedulePadChord(ctx, dryBus, wetBus, step.chord, score.padTimbre, when, chordDur, score.padGain)
  }

  if (step.bass) {
    scheduleBassNote(ctx, dryBus, wetBus, step.bass, when, score.stepSec * 3.85, score.bassGain)
  }

  if (step.arp) {
    scheduleArpNote(ctx, dryBus, wetBus, step.arp, score.arpTimbre, when, score.stepSec, score.arpGain)
  }

  if (step.melody) {
    const melDur = Math.max(score.stepSec * 0.85, (step.melodyDurSteps ?? 1.4) * score.stepSec)
    scheduleLeadNote(ctx, dryBus, wetBus, step.melody, score.leadTimbre, when, melDur, score.leadGain)
  }

  if (step.perc) {
    schedulePercHit(ctx, dryBus, wetBus, step.perc, when, score.percGain)
  }
}

function startSynthLoop(trackId: BgmTrackId, theme: BgmTheme) {
  const ctx = getAudioContext()
  if (!ctx || !mixCompressor || !masterGain || typeof window === 'undefined') return
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined)
  }
  applyMasterGain()

  const score = getOrchestralScore(trackId)

  const dryBus = ctx.createGain()
  dryBus.gain.setValueAtTime(0.88, ctx.currentTime)
  dryBus.connect(mixCompressor)

  let wetBus: GainNode | null = null
  if (reverbNode) {
    wetBus = ctx.createGain()
    wetBus.gain.setValueAtTime(score.reverbMix, ctx.currentTime)
    wetBus.connect(reverbNode)
  }

  activeTrackDryGain = dryBus
  activeTrackWetGain = wetBus

  synthStepIdx = 0
  nextSynthNoteTime = ctx.currentTime + 0.05
  activeTheme = theme
  activeTrackId = trackId
  activeSource = 'synth'
  activeUrl = null

  const pump = () => {
    if (bgmMuted || activeTrackId !== trackId || activeSource !== 'synth' || !bgmCtx || !activeTrackDryGain) {
      return
    }
    if (bgmCtx.state === 'suspended') return
    if (nextSynthNoteTime < bgmCtx.currentTime - 0.5) {
      nextSynthNoteTime = bgmCtx.currentTime + 0.05
    }
    const lookahead = bgmCtx.currentTime + 0.32
    while (nextSynthNoteTime < lookahead) {
      scheduleOrchestralStep(bgmCtx, activeTrackDryGain, activeTrackWetGain, score, nextSynthNoteTime, synthStepIdx)
      nextSynthNoteTime += score.stepSec
      synthStepIdx = (synthStepIdx + 1) % score.steps.length
    }
  }

  pump()
  synthTimer = window.setInterval(pump, 55)
  emitChange()
}

async function startFileOrFallbackLoop(trackId: BgmTrackId, theme: BgmTheme, seq: number) {
  const manifest = await loadTrackManifest()
  if (seq !== transitionSeq || bgmMuted || desiredTrackId !== trackId) return

  const mapCandidates = manifest.mapTracks[trackId]
  const themeCandidates = manifest.tracks[theme]
  const canPlay = canPlayUrlHelper()
  const selectedUrl =
    pickPlayableAudioUrl(mapCandidates, canPlay) ??
    pickPlayableAudioUrl(themeCandidates, canPlay)

  if (!selectedUrl) {
    startSynthLoop(trackId, theme)
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
        if (seq !== transitionSeq || bgmMuted || desiredTrackId !== trackId) return
        buffer = await ctx.decodeAudioData(arrayBuf)
        decodedBufferCache.set(selectedUrl, buffer)
      }
      if (seq !== transitionSeq || bgmMuted || desiredTrackId !== trackId) return
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
      activeTrackId = trackId
      activeSource = 'file'
      activeUrl = selectedUrl
      emitChange()
      return
    } catch {
      if (seq !== transitionSeq || bgmMuted || desiredTrackId !== trackId) return
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
      activeTrackId = trackId
      activeSource = 'file'
      activeUrl = selectedUrl
      emitChange()
      void el.play().catch(() => undefined)
      return
    } catch {
      if (seq !== transitionSeq || bgmMuted || desiredTrackId !== trackId) return
    }
  }

  startSynthLoop(trackId, theme)
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
          if (!bgmMuted && activeSource === 'synth' && activeTrackId) {
            nextSynthNoteTime = ctx.currentTime + 0.05
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
              nextSynthNoteTime = bgmCtx.currentTime + 0.05
            }
          })
          .catch(() => undefined)
      }
      if (activeHtmlAudio && activeHtmlAudio.paused) {
        void activeHtmlAudio.play().catch(() => undefined)
      }
      if (!activeTrackId) {
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
    desiredTrackId,
    activeTrackId,
    source: activeSource,
    activeUrl,
    availableTracks: manifestCache.tracks,
    availableMapTracks: manifestCache.mapTracks,
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
  stopActivePlayback(true, true)
  emitChange()
}

export function syncBgmContext(ctxInput: BgmResolveContext, forceRestart = false) {
  lastContext = ctxInput
  const nextTheme = resolveBgmTheme(ctxInput)
  const nextTrackId = resolveBgmTrackId(ctxInput)
  const changed = desiredTheme !== nextTheme || desiredTrackId !== nextTrackId
  desiredTheme = nextTheme
  desiredTrackId = nextTrackId

  if (typeof window === 'undefined') return
  ensureLifecycleHooks()

  if (bgmMuted) {
    if (activeTrackId !== null || activeSource !== 'idle') {
      stopBgm()
    } else if (changed) {
      emitChange()
    }
    return
  }

  const isRunning =
    activeTrackId === nextTrackId &&
    (activeBufferSource !== null || activeHtmlAudio !== null || synthTimer !== null)
  if (isRunning && !forceRestart) {
    return
  }

  transitionSeq += 1
  const mySeq = transitionSeq
  stopActivePlayback(true, false)
  emitChange()
  void startFileOrFallbackLoop(nextTrackId, nextTheme, mySeq)
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
    desiredTrackId = resolveBgmTrackId(nextCtx)
    stopBgm()
  } else {
    syncBgmContext(nextCtx, true)
  }
  return bgmMuted
}

export function toggleBgmMute(contextOrMapId?: string | BgmResolveContext): boolean {
  return setBgmMuted(!bgmMuted, contextOrMapId)
}

export async function refreshBgmManifest(): Promise<Record<BgmTheme, string[]>> {
  manifestPromise = null
  const data = await loadTrackManifest()
  return data.tracks
}

export function getBgmThemeLabel(theme: BgmTheme): string {
  return BGM_TRACK_CATALOG[theme].labelTh
}

export function getBgmTrackLabel(trackId: BgmTrackId): string {
  return getBgmTrackMeta(trackId).labelTh
}
