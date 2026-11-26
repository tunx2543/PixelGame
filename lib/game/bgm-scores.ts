import { BGM_TRACK_IDS, type BgmTrackId } from './bgm-tracks'

export type LeadTimbre =
  | 'flute'
  | 'whistle'
  | 'oboe'
  | 'harp'
  | 'celesta'
  | 'horn'
  | 'organ'
  | 'koto'
  | 'oud'
  | 'strings'

export type ArpTimbre = 'harp' | 'lute' | 'koto' | 'celesta' | 'strings'
export type PadTimbre = 'strings' | 'choir' | 'organ' | 'breeze'
export type PercHit = 'kick' | 'snare' | 'shaker' | 'timpani'

export interface ScoreStep {
  melody?: string | null
  melodyDurSteps?: number
  arp?: string | null
  bass?: string | null
  chord?: readonly string[] | null
  chordDurSteps?: number
  perc?: PercHit | null
}

export interface OrchestralScore {
  trackId: BgmTrackId
  bpm: number
  stepSec: number
  leadTimbre: LeadTimbre
  arpTimbre: ArpTimbre
  padTimbre: PadTimbre
  reverbMix: number
  leadGain: number
  arpGain: number
  padGain: number
  bassGain: number
  percGain: number
  steps: readonly ScoreStep[]
}

const SEMITONES: Record<string, number> = {
  Cb: -1,
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  'E#': 5,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  'B#': 12,
}

export function noteToHz(note: string | null | undefined): number {
  if (!note) return 0
  const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(note.trim())
  if (!m) return 0
  const semi = SEMITONES[m[1]]
  if (semi === undefined) return 0
  const octave = Number(m[2])
  const midi = (octave + 1) * 12 + semi
  return 440 * Math.pow(2, (midi - 69) / 12)
}

interface BarSpec {
  chord: readonly [string, string, string]
  bass: string
  arp: readonly (string | null)[] // length 8
  melody: readonly (string | null)[] // length 8
  perc?: readonly (PercHit | null)[] // length 8
}

function buildScoreFromBars(
  trackId: BgmTrackId,
  config: Omit<OrchestralScore, 'trackId' | 'stepSec' | 'steps'>,
  bars: readonly BarSpec[],
): OrchestralScore {
  const stepSec = Math.round(((60 / config.bpm) / 2) * 1000) / 1000
  const steps: ScoreStep[] = []

  for (const bar of bars) {
    for (let s = 0; s < 8; s++) {
      const mNote = bar.melody[s] ?? null
      let holdSteps = 1
      if (mNote) {
        for (let k = s + 1; k < 8 && !bar.melody[k]; k++) {
          holdSteps += 1
        }
      }
      steps.push({
        melody: mNote,
        melodyDurSteps: mNote ? Math.max(1.2, holdSteps * 0.92) : undefined,
        arp: bar.arp[s] ?? null,
        bass: s === 0 ? bar.bass : s === 4 ? bar.chord[0].replace(/\d$/, (d) => String(Math.max(2, Number(d) - 1))) : null,
        chord: s === 0 ? bar.chord : null,
        chordDurSteps: s === 0 ? 7.8 : undefined,
        perc: bar.perc?.[s] ?? null,
      })
    }
  }

  return {
    trackId,
    stepSec,
    ...config,
    steps,
  }
}

const PERC_FOLK: readonly (PercHit | null)[] = ['kick', null, 'shaker', null, 'kick', 'shaker', 'snare', null]
const PERC_MARCH: readonly (PercHit | null)[] = ['kick', 'shaker', 'snare', 'shaker', 'kick', 'kick', 'snare', 'shaker']
const PERC_EPIC: readonly (PercHit | null)[] = ['timpani', 'shaker', 'snare', 'kick', 'timpani', 'snare', 'kick', 'snare']
const PERC_DESERT: readonly (PercHit | null)[] = ['kick', null, 'kick', 'shaker', 'snare', null, 'kick', 'shaker']
const PERC_WALTZ: readonly (PercHit | null)[] = ['kick', null, null, 'shaker', null, 'shaker', null, null]
const PERC_NONE: readonly (PercHit | null)[] = [null, null, null, null, null, null, null, null]

export const BGM_ORCHESTRAL_SCORES: Record<BgmTrackId, OrchestralScore> = {
  // 1. Login: Dawn of the Realm (C Major / Lydian grandeur)
  login: buildScoreFromBars(
    'login',
    {
      bpm: 78,
      leadTimbre: 'horn',
      arpTimbre: 'harp',
      padTimbre: 'choir',
      reverbMix: 0.45,
      leadGain: 0.13,
      arpGain: 0.085,
      padGain: 0.075,
      bassGain: 0.1,
      percGain: 0.05,
    },
    [
      {
        chord: ['C4', 'E4', 'G4'],
        bass: 'C2',
        arp: ['C4', 'G4', 'E5', 'G4', 'C5', 'G4', 'E4', 'G4'],
        melody: ['G4', null, 'C5', null, 'D5', 'E5', 'G5', null],
        perc: PERC_WALTZ,
      },
      {
        chord: ['G3', 'B3', 'D4'],
        bass: 'G2',
        arp: ['G3', 'D4', 'B4', 'D4', 'G4', 'D4', 'B4', 'D4'],
        melody: ['F#5', null, 'D5', null, 'B4', null, 'D5', null],
        perc: PERC_WALTZ,
      },
      {
        chord: ['A3', 'C4', 'E4'],
        bass: 'A2',
        arp: ['A3', 'E4', 'C5', 'E4', 'A4', 'E4', 'C5', 'E4'],
        melody: ['E5', null, 'C5', 'D5', 'E5', null, 'A4', null],
        perc: PERC_WALTZ,
      },
      {
        chord: ['F3', 'A3', 'C4'],
        bass: 'F2',
        arp: ['F3', 'C4', 'A4', 'C4', 'G4', 'B4', 'D5', 'B4'],
        melody: ['C5', null, 'A4', null, 'B4', null, 'G4', null],
        perc: ['timpani', null, null, null, null, null, 'shaker', null],
      },
    ],
  ),

  // 2. Town: Haven of First Light (G Major warm lute & flute)
  town: buildScoreFromBars(
    'town',
    {
      bpm: 92,
      leadTimbre: 'flute',
      arpTimbre: 'lute',
      padTimbre: 'strings',
      reverbMix: 0.36,
      leadGain: 0.14,
      arpGain: 0.095,
      padGain: 0.065,
      bassGain: 0.095,
      percGain: 0.04,
    },
    [
      {
        chord: ['G3', 'B3', 'D4'],
        bass: 'G2',
        arp: ['G3', 'D4', 'B4', 'D4', 'G4', 'D4', 'B4', 'D4'],
        melody: ['B4', null, 'D5', 'E5', 'D5', null, 'B4', 'A4'],
        perc: PERC_NONE,
      },
      {
        chord: ['C4', 'E4', 'G4'],
        bass: 'C3',
        arp: ['C4', 'G4', 'E5', 'G4', 'C5', 'G4', 'E4', 'G4'],
        melody: ['G4', null, 'E5', null, 'D5', 'C5', 'B4', null],
        perc: PERC_NONE,
      },
      {
        chord: ['E3', 'G3', 'B3'],
        bass: 'E2',
        arp: ['E3', 'B3', 'G4', 'B3', 'E4', 'B3', 'G4', 'B3'],
        melody: ['G4', 'A4', 'B4', null, 'E5', null, 'D5', 'B4'],
        perc: PERC_NONE,
      },
      {
        chord: ['D3', 'F#3', 'A3'],
        bass: 'D2',
        arp: ['D3', 'A3', 'F#4', 'A3', 'D4', 'A3', 'F#4', 'A3'],
        melody: ['A4', null, 'B4', 'A4', 'G4', null, 'D4', null],
        perc: PERC_NONE,
      },
    ],
  ),

  // 3. Generic Field fallback: Boundless Horizon
  field: buildScoreFromBars(
    'field',
    {
      bpm: 104,
      leadTimbre: 'whistle',
      arpTimbre: 'harp',
      padTimbre: 'strings',
      reverbMix: 0.38,
      leadGain: 0.135,
      arpGain: 0.09,
      padGain: 0.07,
      bassGain: 0.095,
      percGain: 0.055,
    },
    [
      {
        chord: ['F3', 'A3', 'C4'],
        bass: 'F2',
        arp: ['F3', 'C4', 'A4', 'C4', 'F4', 'C4', 'A4', 'C4'],
        melody: ['C5', null, 'F5', 'E5', 'D5', null, 'C5', null],
        perc: PERC_FOLK,
      },
      {
        chord: ['C4', 'E4', 'G4'],
        bass: 'C3',
        arp: ['C4', 'G4', 'E5', 'G4', 'C5', 'G4', 'E4', 'G4'],
        melody: ['G4', 'A4', 'C5', null, 'E5', null, 'D5', 'C5'],
        perc: PERC_FOLK,
      },
      {
        chord: ['D3', 'F3', 'A3'],
        bass: 'D2',
        arp: ['D3', 'A3', 'F4', 'A3', 'D4', 'A3', 'F4', 'A3'],
        melody: ['A4', null, 'D5', 'E5', 'F5', null, 'D5', null],
        perc: PERC_FOLK,
      },
      {
        chord: ['Bb3', 'D4', 'F4'],
        bass: 'Bb2',
        arp: ['Bb3', 'F4', 'D5', 'F4', 'C4', 'G4', 'E5', 'G4'],
        melody: ['D5', 'C5', 'Bb4', null, 'C5', null, 'G4', null],
        perc: PERC_FOLK,
      },
    ],
  ),

  // 4. Meadow: Emerald Breeze Plains (F Major joyful starter plains)
  meadow: buildScoreFromBars(
    'meadow',
    {
      bpm: 106,
      leadTimbre: 'whistle',
      arpTimbre: 'harp',
      padTimbre: 'strings',
      reverbMix: 0.36,
      leadGain: 0.14,
      arpGain: 0.095,
      padGain: 0.068,
      bassGain: 0.095,
      percGain: 0.055,
    },
    [
      {
        chord: ['F3', 'A3', 'C4'],
        bass: 'F2',
        arp: ['F3', 'C4', 'A4', 'C5', 'A4', 'C4', 'F4', 'C4'],
        melody: ['A4', 'C5', 'F5', null, 'E5', 'D5', 'C5', null],
        perc: PERC_FOLK,
      },
      {
        chord: ['Bb3', 'D4', 'F4'],
        bass: 'Bb2',
        arp: ['Bb3', 'F4', 'D5', 'F4', 'Bb4', 'F4', 'D4', 'F4'],
        melody: ['D5', null, 'F5', 'G5', 'F5', null, 'D5', 'C5'],
        perc: PERC_FOLK,
      },
      {
        chord: ['G3', 'Bb3', 'D4'],
        bass: 'G2',
        arp: ['G3', 'D4', 'Bb4', 'D4', 'G4', 'D4', 'Bb4', 'D4'],
        melody: ['Bb4', 'C5', 'D5', null, 'G5', 'F5', 'E5', 'D5'],
        perc: PERC_FOLK,
      },
      {
        chord: ['C4', 'E4', 'G4'],
        bass: 'C3',
        arp: ['C4', 'G4', 'E5', 'G4', 'C5', 'G4', 'E4', 'G4'],
        melody: ['C5', null, 'A4', 'G4', 'E4', null, 'G4', null],
        perc: PERC_FOLK,
      },
    ],
  ),

  // 5. Vale: Verdant Valley Echoes (D Major sweeping highland strings)
  vale: buildScoreFromBars(
    'vale',
    {
      bpm: 100,
      leadTimbre: 'strings',
      arpTimbre: 'lute',
      padTimbre: 'strings',
      reverbMix: 0.42,
      leadGain: 0.135,
      arpGain: 0.09,
      padGain: 0.075,
      bassGain: 0.1,
      percGain: 0.05,
    },
    [
      {
        chord: ['D4', 'F#4', 'A4'],
        bass: 'D2',
        arp: ['D4', 'A4', 'F#5', 'A4', 'D5', 'A4', 'F#4', 'A4'],
        melody: ['F#5', null, 'E5', 'D5', 'A4', null, 'D5', null],
        perc: PERC_WALTZ,
      },
      {
        chord: ['A3', 'C#4', 'E4'],
        bass: 'A2',
        arp: ['A3', 'E4', 'C#5', 'E4', 'A4', 'E4', 'C#5', 'E4'],
        melody: ['E5', null, 'C#5', 'A4', 'B4', 'C#5', 'E5', null],
        perc: PERC_WALTZ,
      },
      {
        chord: ['B3', 'D4', 'F#4'],
        bass: 'B2',
        arp: ['B3', 'F#4', 'D5', 'F#4', 'B4', 'F#4', 'D5', 'F#4'],
        melody: ['D5', 'E5', 'F#5', null, 'B4', null, 'D5', 'E5'],
        perc: PERC_WALTZ,
      },
      {
        chord: ['G3', 'B3', 'D4'],
        bass: 'G2',
        arp: ['G3', 'D4', 'B4', 'D4', 'A3', 'E4', 'C#5', 'E4'],
        melody: ['G5', null, 'F#5', 'D5', 'E5', null, 'A4', null],
        perc: PERC_WALTZ,
      },
    ],
  ),

  // 6. Woods: Whispering Canopy (A Dorian enchanted woods)
  woods: buildScoreFromBars(
    'woods',
    {
      bpm: 94,
      leadTimbre: 'flute',
      arpTimbre: 'lute',
      padTimbre: 'breeze',
      reverbMix: 0.44,
      leadGain: 0.135,
      arpGain: 0.09,
      padGain: 0.07,
      bassGain: 0.095,
      percGain: 0.05,
    },
    [
      {
        chord: ['A3', 'C4', 'E4'],
        bass: 'A2',
        arp: ['A3', 'E4', 'C5', 'E4', 'B4', 'E4', 'A4', 'E4'],
        melody: ['E5', null, 'F#5', 'E5', 'C5', null, 'B4', 'A4'],
        perc: ['kick', null, 'shaker', null, null, 'shaker', null, null],
      },
      {
        chord: ['G3', 'B3', 'D4'],
        bass: 'G2',
        arp: ['G3', 'D4', 'B4', 'D4', 'G4', 'D4', 'B4', 'D4'],
        melody: ['B4', 'D5', 'E5', null, 'D5', null, 'B4', null],
        perc: ['kick', null, 'shaker', null, null, 'shaker', null, null],
      },
      {
        chord: ['F#3', 'A3', 'C#4'],
        bass: 'F#2',
        arp: ['F#3', 'C#4', 'A4', 'C#4', 'F#4', 'C#4', 'A4', 'C#4'],
        melody: ['C#5', null, 'D5', 'E5', 'F#5', null, 'E5', 'C#5'],
        perc: ['kick', null, 'shaker', null, null, 'shaker', null, null],
      },
      {
        chord: ['E3', 'G3', 'B3'],
        bass: 'E2',
        arp: ['E3', 'B3', 'G4', 'B3', 'E4', 'B3', 'D5', 'B4'],
        melody: ['B4', null, 'A4', 'G4', 'A4', null, 'E4', null],
        perc: ['kick', null, 'shaker', null, 'snare', null, 'shaker', null],
      },
    ],
  ),

  // 7. Forest: Ancient Sylvan Heart (E Minor deep mystical forest)
  forest: buildScoreFromBars(
    'forest',
    {
      bpm: 86,
      leadTimbre: 'flute',
      arpTimbre: 'celesta',
      padTimbre: 'breeze',
      reverbMix: 0.48,
      leadGain: 0.135,
      arpGain: 0.085,
      padGain: 0.075,
      bassGain: 0.095,
      percGain: 0.04,
    },
    [
      {
        chord: ['E3', 'G3', 'B3'],
        bass: 'E2',
        arp: ['E4', 'B4', 'G5', 'B4', 'E5', 'B4', 'G4', 'B4'],
        melody: ['B4', null, 'E5', 'F#5', 'G5', null, 'F#5', 'E5'],
        perc: PERC_WALTZ,
      },
      {
        chord: ['C4', 'E4', 'G4'],
        bass: 'C3',
        arp: ['C4', 'G4', 'E5', 'G4', 'B4', 'G4', 'C5', 'G4'],
        melody: ['E5', null, 'C5', null, 'D5', 'E5', 'G5', null],
        perc: PERC_WALTZ,
      },
      {
        chord: ['D4', 'F#4', 'A4'],
        bass: 'D2',
        arp: ['D4', 'A4', 'F#5', 'A4', 'D5', 'A4', 'F#4', 'A4'],
        melody: ['F#5', null, 'D5', 'E5', 'F#5', null, 'A5', 'G5'],
        perc: PERC_WALTZ,
      },
      {
        chord: ['B3', 'D4', 'F#4'],
        bass: 'B2',
        arp: ['B3', 'F#4', 'D5', 'F#4', 'B4', 'F#4', 'D4', 'F#4'],
        melody: ['F#5', null, 'E5', 'D5', 'B4', null, null, null],
        perc: PERC_WALTZ,
      },
    ],
  ),

  // 8. Coast: Azure Tide Promenade (C Mixolydian breezy ocean port)
  coast: buildScoreFromBars(
    'coast',
    {
      bpm: 98,
      leadTimbre: 'oboe',
      arpTimbre: 'harp',
      padTimbre: 'breeze',
      reverbMix: 0.44,
      leadGain: 0.13,
      arpGain: 0.095,
      padGain: 0.072,
      bassGain: 0.09,
      percGain: 0.05,
    },
    [
      {
        chord: ['C4', 'E4', 'G4'],
        bass: 'C3',
        arp: ['C4', 'G4', 'E5', 'G4', 'C5', 'G4', 'E4', 'G4'],
        melody: ['G4', 'C5', 'E5', null, 'D5', 'C5', 'Bb4', 'G4'],
        perc: ['kick', null, 'shaker', null, null, 'shaker', 'kick', null],
      },
      {
        chord: ['Bb3', 'D4', 'F4'],
        bass: 'Bb2',
        arp: ['Bb3', 'F4', 'D5', 'F4', 'Bb4', 'F4', 'D4', 'F4'],
        melody: ['F4', 'Bb4', 'D5', null, 'C5', null, 'Bb4', 'A4'],
        perc: ['kick', null, 'shaker', null, null, 'shaker', 'kick', null],
      },
      {
        chord: ['F3', 'A3', 'C4'],
        bass: 'F2',
        arp: ['F3', 'C4', 'A4', 'C4', 'F4', 'C4', 'A4', 'C4'],
        melody: ['A4', 'C5', 'F5', null, 'E5', 'D5', 'C5', 'A4'],
        perc: ['kick', null, 'shaker', null, null, 'shaker', 'kick', null],
      },
      {
        chord: ['G3', 'B3', 'D4'],
        bass: 'G2',
        arp: ['G3', 'D4', 'B4', 'D4', 'F4', 'D4', 'B4', 'D4'],
        melody: ['G4', null, 'A4', 'B4', 'C5', null, 'G4', null],
        perc: ['kick', null, 'shaker', null, 'snare', null, 'shaker', null],
      },
    ],
  ),

  // 9. Cave: Crystal Cavern Resonance (C# Minor echoing crystal bells)
  cave: buildScoreFromBars(
    'cave',
    {
      bpm: 78,
      leadTimbre: 'celesta',
      arpTimbre: 'celesta',
      padTimbre: 'organ',
      reverbMix: 0.56,
      leadGain: 0.13,
      arpGain: 0.08,
      padGain: 0.075,
      bassGain: 0.105,
      percGain: 0.055,
    },
    [
      {
        chord: ['C#3', 'E3', 'G#3'],
        bass: 'C#2',
        arp: ['C#4', null, 'G#4', 'E5', null, 'B4', 'G#4', null],
        melody: ['G#5', null, null, 'E5', 'F#5', null, 'E5', 'C#5'],
        perc: ['timpani', null, null, null, null, null, 'shaker', null],
      },
      {
        chord: ['A3', 'C#4', 'E4'],
        bass: 'A2',
        arp: ['A3', null, 'E4', 'C#5', null, 'A4', 'E4', null],
        melody: ['E5', null, 'C#5', null, 'B4', null, 'A4', null],
        perc: ['timpani', null, null, null, null, null, 'shaker', null],
      },
      {
        chord: ['F#3', 'A3', 'C#4'],
        bass: 'F#2',
        arp: ['F#3', null, 'C#4', 'A4', null, 'F#4', 'C#4', null],
        melody: ['A4', 'B4', 'C#5', null, 'F#5', null, 'E5', 'D#5'],
        perc: ['timpani', null, null, null, null, null, 'shaker', null],
      },
      {
        chord: ['G#3', 'B3', 'D#4'],
        bass: 'G#2',
        arp: ['G#3', null, 'D#4', 'B4', null, 'G#4', 'D#4', null],
        melody: ['D#5', null, 'C#5', 'B4', 'G#4', null, null, null],
        perc: ['timpani', null, null, null, 'kick', null, null, null],
      },
    ],
  ),

  // 10. Desert: Dunes of Golden Mirage (D Hijaz / Phrygian Dominant exotic caravan)
  desert: buildScoreFromBars(
    'desert',
    {
      bpm: 98,
      leadTimbre: 'oud',
      arpTimbre: 'lute',
      padTimbre: 'breeze',
      reverbMix: 0.42,
      leadGain: 0.135,
      arpGain: 0.095,
      padGain: 0.07,
      bassGain: 0.1,
      percGain: 0.065,
    },
    [
      {
        chord: ['D3', 'F#3', 'A3'],
        bass: 'D2',
        arp: ['D4', 'Eb4', 'F#4', 'A4', 'Bb4', 'A4', 'F#4', 'Eb4'],
        melody: ['A4', null, 'Bb4', 'A4', 'F#4', 'Eb4', 'D4', null],
        perc: PERC_DESERT,
      },
      {
        chord: ['Eb3', 'G3', 'Bb3'],
        bass: 'Eb2',
        arp: ['Eb4', 'G4', 'Bb4', 'G4', 'Eb4', 'G4', 'Bb4', 'G4'],
        melody: ['Bb4', 'C5', 'D5', null, 'C5', 'Bb4', 'A4', null],
        perc: PERC_DESERT,
      },
      {
        chord: ['G3', 'Bb3', 'D4'],
        bass: 'G2',
        arp: ['G3', 'Bb3', 'D4', 'F#4', 'G4', 'F#4', 'D4', 'Bb3'],
        melody: ['D5', null, 'Eb5', 'D5', 'C5', 'Bb4', 'A4', 'G4'],
        perc: PERC_DESERT,
      },
      {
        chord: ['D3', 'F#3', 'A3'],
        bass: 'D2',
        arp: ['D4', 'A4', 'F#4', 'Eb4', 'D4', 'A3', 'D4', 'F#4'],
        melody: ['F#4', 'G4', 'A4', 'F#4', 'Eb4', null, 'D4', null],
        perc: PERC_DESERT,
      },
    ],
  ),

  // 11. Graveyard: Moonlit Requiem (B Minor gothic organ & cello)
  graveyard: buildScoreFromBars(
    'graveyard',
    {
      bpm: 72,
      leadTimbre: 'organ',
      arpTimbre: 'celesta',
      padTimbre: 'organ',
      reverbMix: 0.54,
      leadGain: 0.12,
      arpGain: 0.08,
      padGain: 0.08,
      bassGain: 0.11,
      percGain: 0.04,
    },
    [
      {
        chord: ['B3', 'D4', 'F#4'],
        bass: 'B1',
        arp: ['B4', null, 'F#5', null, 'D5', null, 'F#5', null],
        melody: ['F#4', null, 'G4', 'F#4', 'D4', null, 'B3', null],
        perc: ['timpani', null, null, null, null, null, null, null],
      },
      {
        chord: ['G3', 'B3', 'D4'],
        bass: 'G2',
        arp: ['G4', null, 'D5', null, 'B4', null, 'D5', null],
        melody: ['G4', null, 'A4', 'B4', 'A4', null, 'F#4', null],
        perc: ['timpani', null, null, null, null, null, null, null],
      },
      {
        chord: ['E3', 'G3', 'B3'],
        bass: 'E2',
        arp: ['E4', null, 'B4', null, 'G4', null, 'B4', null],
        melody: ['E4', 'F#4', 'G4', null, 'B4', null, 'A#4', null],
        perc: ['timpani', null, null, null, null, null, null, null],
      },
      {
        chord: ['F#3', 'A#3', 'C#4'],
        bass: 'F#2',
        arp: ['F#4', null, 'C#5', null, 'A#4', null, 'F#4', null],
        melody: ['F#4', null, 'C#5', 'B4', 'A#4', null, 'F#4', null],
        perc: ['timpani', null, null, null, 'shaker', null, null, null],
      },
    ],
  ),

  // 12. Isles: Eastern Archipelago Voyage (D Pentatonic Koto & Bamboo Flute)
  isles: buildScoreFromBars(
    'isles',
    {
      bpm: 104,
      leadTimbre: 'koto',
      arpTimbre: 'koto',
      padTimbre: 'strings',
      reverbMix: 0.42,
      leadGain: 0.14,
      arpGain: 0.095,
      padGain: 0.068,
      bassGain: 0.095,
      percGain: 0.055,
    },
    [
      {
        chord: ['D4', 'F#4', 'A4'],
        bass: 'D2',
        arp: ['D4', 'E4', 'A4', 'B4', 'D5', 'B4', 'A4', 'E4'],
        melody: ['A4', 'B4', 'D5', null, 'E5', 'F#5', 'A5', null],
        perc: PERC_FOLK,
      },
      {
        chord: ['B3', 'D4', 'F#4'],
        bass: 'B2',
        arp: ['B3', 'D4', 'F#4', 'A4', 'B4', 'A4', 'F#4', 'D4'],
        melody: ['F#5', null, 'E5', 'D5', 'B4', null, 'A4', null],
        perc: PERC_FOLK,
      },
      {
        chord: ['G3', 'B3', 'D4'],
        bass: 'G2',
        arp: ['G3', 'A3', 'D4', 'E4', 'B4', 'E4', 'D4', 'A3'],
        melody: ['B4', 'D5', 'E5', null, 'F#5', 'E5', 'D5', 'B4'],
        perc: PERC_FOLK,
      },
      {
        chord: ['A3', 'D4', 'E4'],
        bass: 'A2',
        arp: ['A3', 'D4', 'E4', 'A4', 'B4', 'A4', 'E4', 'D4'],
        melody: ['E5', null, 'D5', 'B4', 'A4', null, 'D5', null],
        perc: PERC_FOLK,
      },
    ],
  ),

  // 13. Snow: Frostpeak Nocturne (Eb Major crystalline ice harp & celesta)
  snow: buildScoreFromBars(
    'snow',
    {
      bpm: 76,
      leadTimbre: 'celesta',
      arpTimbre: 'harp',
      padTimbre: 'choir',
      reverbMix: 0.54,
      leadGain: 0.13,
      arpGain: 0.088,
      padGain: 0.075,
      bassGain: 0.09,
      percGain: 0.03,
    },
    [
      {
        chord: ['Eb4', 'G4', 'Bb4'],
        bass: 'Eb2',
        arp: ['Eb4', 'Bb4', 'G5', 'Bb4', 'F5', 'Bb4', 'Eb5', 'Bb4'],
        melody: ['Bb5', null, 'G5', null, 'F5', 'Eb5', 'D5', null],
        perc: PERC_NONE,
      },
      {
        chord: ['C4', 'Eb4', 'G4'],
        bass: 'C3',
        arp: ['C4', 'G4', 'Eb5', 'G4', 'D5', 'G4', 'C5', 'G4'],
        melody: ['Eb5', null, 'C5', null, 'D5', 'Eb5', 'G5', null],
        perc: PERC_NONE,
      },
      {
        chord: ['Ab3', 'C4', 'Eb4'],
        bass: 'Ab2',
        arp: ['Ab3', 'Eb4', 'C5', 'Eb4', 'Ab4', 'Eb4', 'C5', 'Eb4'],
        melody: ['Ab5', null, 'G5', 'F5', 'Eb5', null, 'C5', null],
        perc: PERC_NONE,
      },
      {
        chord: ['Bb3', 'D4', 'F4'],
        bass: 'Bb2',
        arp: ['Bb3', 'F4', 'D5', 'F4', 'Bb4', 'F4', 'D4', 'F4'],
        melody: ['F5', null, 'D5', 'Eb5', 'F5', null, 'Bb4', null],
        perc: PERC_NONE,
      },
    ],
  ),

  // 14. Ruins: Fallen Citadel Elegy (F# Minor noble melancholic strings)
  ruins: buildScoreFromBars(
    'ruins',
    {
      bpm: 84,
      leadTimbre: 'strings',
      arpTimbre: 'harp',
      padTimbre: 'strings',
      reverbMix: 0.5,
      leadGain: 0.135,
      arpGain: 0.085,
      padGain: 0.078,
      bassGain: 0.105,
      percGain: 0.045,
    },
    [
      {
        chord: ['F#3', 'A3', 'C#4'],
        bass: 'F#2',
        arp: ['F#3', 'C#4', 'A4', 'C#4', 'F#4', 'C#4', 'A4', 'C#4'],
        melody: ['C#5', null, 'D5', 'C#5', 'A4', null, 'F#4', null],
        perc: PERC_WALTZ,
      },
      {
        chord: ['D4', 'F#4', 'A4'],
        bass: 'D2',
        arp: ['D4', 'A4', 'F#5', 'A4', 'D5', 'A4', 'F#4', 'A4'],
        melody: ['A4', 'B4', 'C#5', null, 'F#5', null, 'E5', 'D5'],
        perc: PERC_WALTZ,
      },
      {
        chord: ['B3', 'D4', 'F#4'],
        bass: 'B2',
        arp: ['B3', 'F#4', 'D5', 'F#4', 'B4', 'F#4', 'D5', 'F#4'],
        melody: ['D5', null, 'B4', 'C#5', 'D5', null, 'B4', null],
        perc: PERC_WALTZ,
      },
      {
        chord: ['C#4', 'E#4', 'G#4'],
        bass: 'C#2',
        arp: ['C#4', 'G#4', 'E#5', 'G#4', 'C#5', 'G#4', 'B4', 'G#4'],
        melody: ['C#5', null, 'B4', 'A4', 'G#4', null, 'C#5', null],
        perc: ['timpani', null, null, null, null, null, 'shaker', null],
      },
    ],
  ),

  // 15. Volcano: Obsidian Caldera (E Phrygian brooding brass & war drums)
  volcano: buildScoreFromBars(
    'volcano',
    {
      bpm: 112,
      leadTimbre: 'horn',
      arpTimbre: 'strings',
      padTimbre: 'organ',
      reverbMix: 0.42,
      leadGain: 0.13,
      arpGain: 0.08,
      padGain: 0.075,
      bassGain: 0.115,
      percGain: 0.075,
    },
    [
      {
        chord: ['E3', 'G3', 'B3'],
        bass: 'E2',
        arp: ['E3', 'B3', 'E4', 'B3', 'F4', 'B3', 'E4', 'B3'],
        melody: ['E4', null, 'F4', 'G4', 'A4', null, 'F4', 'E4'],
        perc: PERC_MARCH,
      },
      {
        chord: ['F3', 'A3', 'C4'],
        bass: 'F2',
        arp: ['F3', 'C4', 'F4', 'C4', 'G4', 'C4', 'F4', 'C4'],
        melody: ['F4', null, 'G4', 'A4', 'Bb4', null, 'A4', 'G4'],
        perc: PERC_MARCH,
      },
      {
        chord: ['D3', 'F3', 'A3'],
        bass: 'D2',
        arp: ['D3', 'A3', 'D4', 'A3', 'F4', 'A3', 'D4', 'A3'],
        melody: ['A4', null, 'G4', 'F4', 'E4', null, 'D4', null],
        perc: PERC_MARCH,
      },
      {
        chord: ['E3', 'G#3', 'B3'],
        bass: 'E2',
        arp: ['E3', 'B3', 'E4', 'F4', 'G#4', 'F4', 'E4', 'B3'],
        melody: ['E4', 'F4', 'G#4', null, 'B4', null, 'E4', null],
        perc: PERC_EPIC,
      },
    ],
  ),

  // 16. Sky: Celestial Cloudsea (A Lydian luminous sky archipelago)
  sky: buildScoreFromBars(
    'sky',
    {
      bpm: 94,
      leadTimbre: 'flute',
      arpTimbre: 'harp',
      padTimbre: 'choir',
      reverbMix: 0.52,
      leadGain: 0.135,
      arpGain: 0.092,
      padGain: 0.078,
      bassGain: 0.09,
      percGain: 0.03,
    },
    [
      {
        chord: ['A3', 'C#4', 'E4'],
        bass: 'A2',
        arp: ['A3', 'E4', 'B4', 'C#5', 'E5', 'D#5', 'E5', 'C#5'],
        melody: ['E5', null, 'D#5', 'E5', 'A5', null, 'G#5', 'E5'],
        perc: PERC_NONE,
      },
      {
        chord: ['B3', 'D#4', 'F#4'],
        bass: 'B2',
        arp: ['B3', 'F#4', 'D#5', 'F#4', 'B4', 'F#4', 'D#5', 'F#4'],
        melody: ['F#5', null, 'D#5', null, 'E5', 'F#5', 'G#5', null],
        perc: PERC_NONE,
      },
      {
        chord: ['F#3', 'A3', 'C#4'],
        bass: 'F#2',
        arp: ['F#3', 'C#4', 'A4', 'C#5', 'E5', 'C#5', 'A4', 'C#4'],
        melody: ['C#5', 'D#5', 'E5', null, 'F#5', null, 'C#5', null],
        perc: PERC_NONE,
      },
      {
        chord: ['E4', 'G#4', 'B4'],
        bass: 'E2',
        arp: ['E4', 'B4', 'G#5', 'B4', 'E5', 'B4', 'G#4', 'B4'],
        melody: ['B4', null, 'C#5', 'D#5', 'E5', null, 'B4', null],
        perc: PERC_NONE,
      },
    ],
  ),

  // 17. Abyss: Void Sanctum (C Minor dark ominous organ & bells)
  abyss: buildScoreFromBars(
    'abyss',
    {
      bpm: 82,
      leadTimbre: 'organ',
      arpTimbre: 'celesta',
      padTimbre: 'organ',
      reverbMix: 0.56,
      leadGain: 0.12,
      arpGain: 0.08,
      padGain: 0.08,
      bassGain: 0.115,
      percGain: 0.055,
    },
    [
      {
        chord: ['C3', 'Eb3', 'G3'],
        bass: 'C2',
        arp: ['C4', null, 'G4', 'Eb5', null, 'B4', 'G4', null],
        melody: ['G4', null, 'Ab4', 'G4', 'Eb4', null, 'D4', null],
        perc: ['timpani', null, null, null, null, null, 'kick', null],
      },
      {
        chord: ['Ab3', 'C4', 'Eb4'],
        bass: 'Ab1',
        arp: ['Ab3', null, 'Eb4', 'C5', null, 'G4', 'Eb4', null],
        melody: ['Ab4', null, 'Bb4', 'C5', 'B4', null, 'G4', null],
        perc: ['timpani', null, null, null, null, null, 'kick', null],
      },
      {
        chord: ['F3', 'Ab3', 'C4'],
        bass: 'F2',
        arp: ['F3', null, 'C4', 'Ab4', null, 'F4', 'C4', null],
        melody: ['F4', 'G4', 'Ab4', null, 'D5', null, 'C5', 'B4'],
        perc: ['timpani', null, null, null, null, null, 'kick', null],
      },
      {
        chord: ['G3', 'B3', 'D4'],
        bass: 'G1',
        arp: ['G3', null, 'D4', 'B4', null, 'G4', 'D4', null],
        melody: ['G4', null, 'F#4', 'G4', 'B4', null, 'G4', null],
        perc: ['timpani', null, null, null, 'snare', null, 'timpani', null],
      },
    ],
  ),

  // 18. World Boss Sanctum (pre-spawn): Sanctum of the Titan
  world: buildScoreFromBars(
    'world',
    {
      bpm: 116,
      leadTimbre: 'horn',
      arpTimbre: 'strings',
      padTimbre: 'choir',
      reverbMix: 0.48,
      leadGain: 0.135,
      arpGain: 0.085,
      padGain: 0.078,
      bassGain: 0.11,
      percGain: 0.065,
    },
    [
      {
        chord: ['D3', 'F3', 'A3'],
        bass: 'D2',
        arp: ['D4', 'A4', 'F4', 'A4', 'D5', 'A4', 'F4', 'A4'],
        melody: ['D5', null, 'E5', 'F5', 'A5', null, 'G5', 'F5'],
        perc: PERC_MARCH,
      },
      {
        chord: ['Bb3', 'D4', 'F4'],
        bass: 'Bb1',
        arp: ['Bb3', 'F4', 'D5', 'F4', 'Bb4', 'F4', 'D4', 'F4'],
        melody: ['F5', null, 'D5', null, 'E5', 'F5', 'G5', null],
        perc: PERC_MARCH,
      },
      {
        chord: ['C4', 'E4', 'G4'],
        bass: 'C2',
        arp: ['C4', 'G4', 'E5', 'G4', 'C5', 'G4', 'E4', 'G4'],
        melody: ['E5', null, 'C5', 'D5', 'E5', null, 'G5', null],
        perc: PERC_MARCH,
      },
      {
        chord: ['A3', 'C#4', 'E4'],
        bass: 'A1',
        arp: ['A3', 'E4', 'C#5', 'E4', 'A4', 'E4', 'C#4', 'E4'],
        melody: ['A5', null, 'G5', 'F5', 'E5', null, 'C#5', null],
        perc: PERC_EPIC,
      },
    ],
  ),

  // 19. Dungeon / Tower normal floors: Labyrinth Ascent
  dungeon: buildScoreFromBars(
    'dungeon',
    {
      bpm: 102,
      leadTimbre: 'oboe',
      arpTimbre: 'strings',
      padTimbre: 'organ',
      reverbMix: 0.46,
      leadGain: 0.13,
      arpGain: 0.085,
      padGain: 0.072,
      bassGain: 0.105,
      percGain: 0.06,
    },
    [
      {
        chord: ['A3', 'C4', 'E4'],
        bass: 'A2',
        arp: ['A3', 'E4', 'C5', 'E4', 'A4', 'E4', 'B4', 'E4'],
        melody: ['E5', null, 'C5', 'D5', 'E5', null, 'B4', null],
        perc: PERC_MARCH,
      },
      {
        chord: ['F3', 'A3', 'C4'],
        bass: 'F2',
        arp: ['F3', 'C4', 'A4', 'C4', 'F4', 'C4', 'G4', 'C4'],
        melody: ['C5', null, 'A4', 'B4', 'C5', null, 'F4', null],
        perc: PERC_MARCH,
      },
      {
        chord: ['D3', 'F3', 'A3'],
        bass: 'D2',
        arp: ['D3', 'A3', 'F4', 'A3', 'D4', 'A3', 'E4', 'A3'],
        melody: ['F4', 'G4', 'A4', null, 'D5', null, 'C5', 'B4'],
        perc: PERC_MARCH,
      },
      {
        chord: ['E3', 'G#3', 'B3'],
        bass: 'E2',
        arp: ['E3', 'B3', 'G#4', 'B3', 'E4', 'B3', 'D5', 'B4'],
        melody: ['B4', null, 'G#4', 'A4', 'B4', null, 'E4', null],
        perc: PERC_MARCH,
      },
    ],
  ),

  // 20. Monster Battle: Blade & Valor (E Minor fast energetic action theme)
  battle: buildScoreFromBars(
    'battle',
    {
      bpm: 132,
      leadTimbre: 'strings',
      arpTimbre: 'strings',
      padTimbre: 'strings',
      reverbMix: 0.28,
      leadGain: 0.145,
      arpGain: 0.09,
      padGain: 0.06,
      bassGain: 0.115,
      percGain: 0.08,
    },
    [
      {
        chord: ['E3', 'G3', 'B3'],
        bass: 'E2',
        arp: ['E4', 'B4', 'G4', 'B4', 'E5', 'B4', 'G4', 'B4'],
        melody: ['E5', 'F#5', 'G5', null, 'F#5', 'E5', 'D5', 'B4'],
        perc: PERC_EPIC,
      },
      {
        chord: ['C4', 'E4', 'G4'],
        bass: 'C2',
        arp: ['C4', 'G4', 'E5', 'G4', 'C5', 'G4', 'E4', 'G4'],
        melody: ['C5', 'D5', 'E5', null, 'G5', 'F#5', 'E5', 'D5'],
        perc: PERC_EPIC,
      },
      {
        chord: ['D4', 'F#4', 'A4'],
        bass: 'D2',
        arp: ['D4', 'A4', 'F#5', 'A4', 'D5', 'A4', 'F#4', 'A4'],
        melody: ['D5', null, 'F#5', 'G5', 'A5', null, 'G5', 'F#5'],
        perc: PERC_EPIC,
      },
      {
        chord: ['B3', 'D#4', 'F#4'],
        bass: 'B1',
        arp: ['B3', 'F#4', 'D#5', 'F#4', 'B4', 'F#4', 'A4', 'F#4'],
        melody: ['F#5', null, 'E5', 'D#5', 'B4', null, 'D#5', 'F#5'],
        perc: PERC_EPIC,
      },
    ],
  ),

  // 21. Boss Combat: Clash of Legends (D Minor epic orchestral fanfare)
  boss: buildScoreFromBars(
    'boss',
    {
      bpm: 144,
      leadTimbre: 'horn',
      arpTimbre: 'strings',
      padTimbre: 'choir',
      reverbMix: 0.32,
      leadGain: 0.15,
      arpGain: 0.095,
      padGain: 0.075,
      bassGain: 0.125,
      percGain: 0.09,
    },
    [
      {
        chord: ['D3', 'F3', 'A3'],
        bass: 'D2',
        arp: ['D4', 'A4', 'F4', 'A4', 'D5', 'A4', 'F4', 'A4'],
        melody: ['D5', null, 'F5', 'E5', 'D5', 'A4', 'Bb4', 'C5'],
        perc: PERC_EPIC,
      },
      {
        chord: ['Bb3', 'D4', 'F4'],
        bass: 'Bb1',
        arp: ['Bb3', 'F4', 'D5', 'F4', 'Bb4', 'F4', 'D4', 'F4'],
        melody: ['D5', 'F5', 'G5', null, 'F5', 'E5', 'D5', 'C5'],
        perc: PERC_EPIC,
      },
      {
        chord: ['G3', 'Bb3', 'D4'],
        bass: 'G1',
        arp: ['G3', 'D4', 'Bb4', 'D4', 'G4', 'D4', 'Bb4', 'D4'],
        melody: ['Bb4', 'C5', 'D5', 'F5', 'G5', null, 'A5', 'G5'],
        perc: PERC_EPIC,
      },
      {
        chord: ['A3', 'C#4', 'E4'],
        bass: 'A1',
        arp: ['A3', 'E4', 'C#5', 'E4', 'A4', 'E4', 'G4', 'E4'],
        melody: ['A5', null, 'G5', 'F5', 'E5', null, 'C#5', 'E5'],
        perc: PERC_EPIC,
      },
    ],
  ),

  // 22. Generic Event / Festival: Grand Realm Festival (G Major celebratory)
  event: buildScoreFromBars(
    'event',
    {
      bpm: 120,
      leadTimbre: 'whistle',
      arpTimbre: 'lute',
      padTimbre: 'strings',
      reverbMix: 0.34,
      leadGain: 0.145,
      arpGain: 0.095,
      padGain: 0.068,
      bassGain: 0.1,
      percGain: 0.07,
    },
    [
      {
        chord: ['G3', 'B3', 'D4'],
        bass: 'G2',
        arp: ['G3', 'D4', 'B4', 'D4', 'G4', 'D4', 'B4', 'D4'],
        melody: ['G4', 'B4', 'D5', null, 'G5', 'F#5', 'E5', 'D5'],
        perc: PERC_FOLK,
      },
      {
        chord: ['C4', 'E4', 'G4'],
        bass: 'C3',
        arp: ['C4', 'G4', 'E5', 'G4', 'C5', 'G4', 'E4', 'G4'],
        melody: ['E5', null, 'G5', 'E5', 'D5', 'C5', 'B4', 'G4'],
        perc: PERC_FOLK,
      },
      {
        chord: ['A3', 'C4', 'E4'],
        bass: 'A2',
        arp: ['A3', 'E4', 'C5', 'E4', 'A4', 'E4', 'C5', 'E4'],
        melody: ['A4', 'B4', 'C5', 'D5', 'E5', null, 'C5', 'A4'],
        perc: PERC_FOLK,
      },
      {
        chord: ['D4', 'F#4', 'A4'],
        bass: 'D2',
        arp: ['D4', 'A4', 'F#5', 'A4', 'D5', 'A4', 'F#4', 'A4'],
        melody: ['D5', null, 'F#5', 'E5', 'D5', null, 'A4', null],
        perc: PERC_FOLK,
      },
    ],
  ),

  // 23. Activity: Invasion Siege Defense (D Minor urgent bastion march)
  act_invasion: buildScoreFromBars(
    'act_invasion',
    {
      bpm: 128,
      leadTimbre: 'horn',
      arpTimbre: 'strings',
      padTimbre: 'strings',
      reverbMix: 0.34,
      leadGain: 0.145,
      arpGain: 0.09,
      padGain: 0.068,
      bassGain: 0.115,
      percGain: 0.08,
    },
    [
      {
        chord: ['D3', 'F3', 'A3'],
        bass: 'D2',
        arp: ['D4', 'A4', 'F4', 'A4', 'D5', 'A4', 'F4', 'A4'],
        melody: ['A4', null, 'D5', 'E5', 'F5', null, 'E5', 'D5'],
        perc: PERC_MARCH,
      },
      {
        chord: ['C4', 'E4', 'G4'],
        bass: 'C2',
        arp: ['C4', 'G4', 'E5', 'G4', 'C5', 'G4', 'E4', 'G4'],
        melody: ['G4', 'A4', 'C5', null, 'E5', 'D5', 'C5', 'A4'],
        perc: PERC_MARCH,
      },
      {
        chord: ['Bb3', 'D4', 'F4'],
        bass: 'Bb1',
        arp: ['Bb3', 'F4', 'D5', 'F4', 'Bb4', 'F4', 'D4', 'F4'],
        melody: ['Bb4', null, 'D5', 'F5', 'G5', null, 'F5', 'D5'],
        perc: PERC_MARCH,
      },
      {
        chord: ['A3', 'C#4', 'E4'],
        bass: 'A1',
        arp: ['A3', 'E4', 'C#5', 'E4', 'A4', 'E4', 'G4', 'E4'],
        melody: ['E5', null, 'D5', 'C#5', 'A4', null, 'E5', null],
        perc: PERC_EPIC,
      },
    ],
  ),

  // 24. Activity: Guild War (C Minor heroic banner anthem)
  act_guild_war: buildScoreFromBars(
    'act_guild_war',
    {
      bpm: 126,
      leadTimbre: 'horn',
      arpTimbre: 'strings',
      padTimbre: 'choir',
      reverbMix: 0.36,
      leadGain: 0.145,
      arpGain: 0.09,
      padGain: 0.072,
      bassGain: 0.115,
      percGain: 0.08,
    },
    [
      {
        chord: ['C3', 'Eb3', 'G3'],
        bass: 'C2',
        arp: ['C4', 'G4', 'Eb5', 'G4', 'C5', 'G4', 'Eb4', 'G4'],
        melody: ['G4', null, 'C5', 'D5', 'Eb5', null, 'D5', 'C5'],
        perc: PERC_MARCH,
      },
      {
        chord: ['Ab3', 'C4', 'Eb4'],
        bass: 'Ab1',
        arp: ['Ab3', 'Eb4', 'C5', 'Eb4', 'Ab4', 'Eb4', 'C4', 'Eb4'],
        melody: ['Ab4', 'Bb4', 'C5', null, 'Eb5', null, 'C5', 'Bb4'],
        perc: PERC_MARCH,
      },
      {
        chord: ['Bb3', 'D4', 'F4'],
        bass: 'Bb1',
        arp: ['Bb3', 'F4', 'D5', 'F4', 'Bb4', 'F4', 'D4', 'F4'],
        melody: ['D5', null, 'F5', 'G5', 'F5', null, 'D5', 'Bb4'],
        perc: PERC_MARCH,
      },
      {
        chord: ['G3', 'B3', 'D4'],
        bass: 'G1',
        arp: ['G3', 'D4', 'B4', 'D4', 'G4', 'D4', 'F4', 'D4'],
        melody: ['G5', null, 'F5', 'D5', 'B4', null, 'D5', null],
        perc: PERC_EPIC,
      },
    ],
  ),

  // 25. Activity: Bounty Hunt (A Minor hunter's trail groove)
  act_bounty: buildScoreFromBars(
    'act_bounty',
    {
      bpm: 114,
      leadTimbre: 'oud',
      arpTimbre: 'lute',
      padTimbre: 'strings',
      reverbMix: 0.34,
      leadGain: 0.14,
      arpGain: 0.095,
      padGain: 0.065,
      bassGain: 0.105,
      percGain: 0.068,
    },
    [
      {
        chord: ['A3', 'C4', 'E4'],
        bass: 'A2',
        arp: ['A3', 'E4', 'A4', 'C5', 'E5', 'C5', 'A4', 'E4'],
        melody: ['E5', null, 'G5', 'E5', 'D5', 'C5', 'A4', null],
        perc: PERC_DESERT,
      },
      {
        chord: ['G3', 'B3', 'D4'],
        bass: 'G2',
        arp: ['G3', 'D4', 'G4', 'B4', 'D5', 'B4', 'G4', 'D4'],
        melody: ['D5', null, 'E5', 'D5', 'B4', 'A4', 'G4', null],
        perc: PERC_DESERT,
      },
      {
        chord: ['F3', 'A3', 'C4'],
        bass: 'F2',
        arp: ['F3', 'C4', 'F4', 'A4', 'C5', 'A4', 'F4', 'C4'],
        melody: ['A4', 'C5', 'D5', null, 'E5', null, 'C5', 'A4'],
        perc: PERC_DESERT,
      },
      {
        chord: ['E3', 'G#3', 'B3'],
        bass: 'E2',
        arp: ['E3', 'B3', 'E4', 'G#4', 'B4', 'G#4', 'E4', 'B3'],
        melody: ['B4', null, 'D5', 'C5', 'B4', null, 'E4', null],
        perc: PERC_DESERT,
      },
    ],
  ),

  // 26. Activity: Treasure Isle (G Mixolydian nautical adventure jig)
  act_treasure: buildScoreFromBars(
    'act_treasure',
    {
      bpm: 116,
      leadTimbre: 'whistle',
      arpTimbre: 'lute',
      padTimbre: 'breeze',
      reverbMix: 0.36,
      leadGain: 0.145,
      arpGain: 0.095,
      padGain: 0.065,
      bassGain: 0.1,
      percGain: 0.068,
    },
    [
      {
        chord: ['G3', 'B3', 'D4'],
        bass: 'G2',
        arp: ['G3', 'D4', 'B4', 'D4', 'F4', 'D4', 'B4', 'D4'],
        melody: ['D5', 'B4', 'G4', 'B4', 'D5', 'E5', 'F5', 'D5'],
        perc: PERC_FOLK,
      },
      {
        chord: ['F3', 'A3', 'C4'],
        bass: 'F2',
        arp: ['F3', 'C4', 'A4', 'C4', 'F4', 'C4', 'A4', 'C4'],
        melody: ['C5', 'A4', 'F4', 'A4', 'C5', 'D5', 'E5', 'C5'],
        perc: PERC_FOLK,
      },
      {
        chord: ['C4', 'E4', 'G4'],
        bass: 'C3',
        arp: ['C4', 'G4', 'E5', 'G4', 'C5', 'G4', 'E4', 'G4'],
        melody: ['G5', null, 'E5', 'D5', 'C5', 'B4', 'A4', 'G4'],
        perc: PERC_FOLK,
      },
      {
        chord: ['D4', 'F#4', 'A4'],
        bass: 'D2',
        arp: ['D4', 'A4', 'F#5', 'A4', 'D5', 'A4', 'C5', 'A4'],
        melody: ['D5', null, 'F5', 'D5', 'B4', null, 'G4', null],
        perc: PERC_FOLK,
      },
    ],
  ),

  // 27. Activity: Fishing Derby (F Major serene lakeside acoustic)
  act_fishing: buildScoreFromBars(
    'act_fishing',
    {
      bpm: 88,
      leadTimbre: 'flute',
      arpTimbre: 'harp',
      padTimbre: 'breeze',
      reverbMix: 0.44,
      leadGain: 0.135,
      arpGain: 0.095,
      padGain: 0.068,
      bassGain: 0.088,
      percGain: 0.025,
    },
    [
      {
        chord: ['F3', 'A3', 'C4'],
        bass: 'F2',
        arp: ['F3', 'C4', 'A4', 'C4', 'F4', 'C4', 'A4', 'C4'],
        melody: ['A4', null, 'C5', null, 'F5', 'E5', 'D5', 'C5'],
        perc: PERC_NONE,
      },
      {
        chord: ['D3', 'F3', 'A3'],
        bass: 'D2',
        arp: ['D3', 'A3', 'F4', 'A3', 'D4', 'A3', 'F4', 'A3'],
        melody: ['A4', null, 'F4', 'G4', 'A4', null, 'D4', null],
        perc: PERC_NONE,
      },
      {
        chord: ['Bb3', 'D4', 'F4'],
        bass: 'Bb2',
        arp: ['Bb3', 'F4', 'D5', 'F4', 'Bb4', 'F4', 'D4', 'F4'],
        melody: ['Bb4', 'C5', 'D5', null, 'F5', null, 'D5', 'C5'],
        perc: PERC_NONE,
      },
      {
        chord: ['C4', 'E4', 'G4'],
        bass: 'C3',
        arp: ['C4', 'G4', 'E5', 'G4', 'C5', 'G4', 'E4', 'G4'],
        melody: ['G4', null, 'A4', 'G4', 'F4', null, 'C5', null],
        perc: PERC_NONE,
      },
    ],
  ),
}

export function getOrchestralScore(trackId: BgmTrackId): OrchestralScore {
  return BGM_ORCHESTRAL_SCORES[trackId] ?? BGM_ORCHESTRAL_SCORES.town
}

export function validateAllOrchestralScores(): boolean {
  for (const id of BGM_TRACK_IDS) {
    const score = BGM_ORCHESTRAL_SCORES[id]
    if (!score || score.steps.length < 16) return false
  }
  return true
}
