import {
  playAttackSfx,
  playCritSfx,
  playEnemyHitSfx,
  playEnhanceSfx,
  playLevelUpSfx,
  playPetAttackSfx,
  playQuestClaimSfx,
  playSkillSfx,
  playVictorySfx,
} from './sfx'

export type CombatAudioCue =
  | 'attack_sound'
  | 'hit_sound'
  | 'crit_sound'
  | 'skill_sound'
  | 'pet_attack_sound'
  | 'victory_sound'
  | 'level_up_sound'
  | 'defeat_sound'
  | 'enhance_success_sound'
  | 'enhance_fail_sound'

export type CombatAudioSource = 'encounter' | 'tower' | 'arena'

export interface CombatAudioAssetSpec {
  cue: CombatAudioCue
  /** Placeholder asset path reserved for future audio file integration */
  assetPath: string
  defaultVolume: number
}

export interface CombatAudioTriggerOptions {
  muted?: boolean
  source?: CombatAudioSource
  playSynthFallback?: boolean
  detail?: Record<string, unknown>
}

export interface CombatAudioTriggerEvent {
  id: number
  cue: CombatAudioCue
  assetPath: string
  muted: boolean
  source: CombatAudioSource
  timestamp: number
  detail?: Record<string, unknown>
}

export type CombatAudioHandler = (event: CombatAudioTriggerEvent) => void

export const COMBAT_AUDIO_ASSETS: Record<CombatAudioCue, CombatAudioAssetSpec> = {
  attack_sound: {
    cue: 'attack_sound',
    assetPath: '/audio/combat/attack_sound.wav',
    defaultVolume: 0.75,
  },
  hit_sound: {
    cue: 'hit_sound',
    assetPath: '/audio/combat/hit_sound.wav',
    defaultVolume: 0.8,
  },
  crit_sound: {
    cue: 'crit_sound',
    assetPath: '/audio/combat/crit_sound.wav',
    defaultVolume: 0.95,
  },
  skill_sound: {
    cue: 'skill_sound',
    assetPath: '/audio/combat/skill_sound.wav',
    defaultVolume: 0.8,
  },
  pet_attack_sound: {
    cue: 'pet_attack_sound',
    assetPath: '/audio/combat/pet_attack_sound.wav',
    defaultVolume: 0.65,
  },
  victory_sound: {
    cue: 'victory_sound',
    assetPath: '/audio/combat/victory_sound.wav',
    defaultVolume: 0.85,
  },
  level_up_sound: {
    cue: 'level_up_sound',
    assetPath: '/audio/combat/level_up_sound.wav',
    defaultVolume: 0.9,
  },
  defeat_sound: {
    cue: 'defeat_sound',
    assetPath: '/audio/combat/defeat_sound.wav',
    defaultVolume: 0.8,
  },
  enhance_success_sound: {
    cue: 'enhance_success_sound',
    assetPath: '/audio/combat/enhance_success_sound.wav',
    defaultVolume: 0.85,
  },
  enhance_fail_sound: {
    cue: 'enhance_fail_sound',
    assetPath: '/audio/combat/enhance_fail_sound.wav',
    defaultVolume: 0.75,
  },
}

const handlers = new Set<CombatAudioHandler>()
const recentTriggers: CombatAudioTriggerEvent[] = []
let triggerSeq = 0
const MAX_RECENT_TRIGGERS = 25

function runSynthFallback(cue: CombatAudioCue, muted: boolean) {
  if (muted || typeof window === 'undefined') return
  switch (cue) {
    case 'attack_sound':
      playAttackSfx(false)
      break
    case 'hit_sound':
      playEnemyHitSfx(false)
      break
    case 'crit_sound':
      playCritSfx(false)
      break
    case 'skill_sound':
      playSkillSfx(false)
      break
    case 'pet_attack_sound':
      playPetAttackSfx(false)
      break
    case 'victory_sound':
      playVictorySfx(false)
      break
    case 'level_up_sound':
      playLevelUpSfx(false)
      break
    case 'defeat_sound':
      playEnemyHitSfx(false)
      break
    case 'enhance_success_sound':
      playEnhanceSfx(true, false)
      break
    case 'enhance_fail_sound':
      playEnhanceSfx(false, false)
      break
  }
}

/**
 * Registers a future audio playback engine/handler to receive combat sound cue triggers.
 * Returns an unsubscribe callback.
 */
export function registerCombatAudioHandler(handler: CombatAudioHandler): () => void {
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
  }
}

export function getRecentCombatAudioTriggers(): readonly CombatAudioTriggerEvent[] {
  return recentTriggers
}

export function clearCombatAudioTriggers(): void {
  recentTriggers.length = 0
  triggerSeq = 0
}

/**
 * Core placeholder audio trigger dispatcher for the combat arena.
 * Emits a structured cue event for future audio asset playback and optionally
 * plays the built-in Web Audio synth fallback when unmuted.
 */
export function triggerCombatAudio(
  cue: CombatAudioCue,
  options: CombatAudioTriggerOptions = {},
): CombatAudioTriggerEvent {
  const spec = COMBAT_AUDIO_ASSETS[cue]
  const muted = Boolean(options.muted)
  const event: CombatAudioTriggerEvent = {
    id: ++triggerSeq,
    cue,
    assetPath: spec.assetPath,
    muted,
    source: options.source ?? 'arena',
    timestamp: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    detail: options.detail,
  }

  recentTriggers.push(event)
  if (recentTriggers.length > MAX_RECENT_TRIGGERS) {
    recentTriggers.shift()
  }

  for (const handler of handlers) {
    try {
      handler(event)
    } catch {
      // Never let an external audio hook interrupt combat flow.
    }
  }

  if (options.playSynthFallback !== false) {
    runSynthFallback(cue, muted)
  }

  return event
}

// Explicit placeholder trigger helpers for common combat arena actions

export function triggerAttackSound(options: CombatAudioTriggerOptions = {}): CombatAudioTriggerEvent {
  return triggerCombatAudio('attack_sound', options)
}

export function triggerHitSound(options: CombatAudioTriggerOptions = {}): CombatAudioTriggerEvent {
  return triggerCombatAudio('hit_sound', options)
}

export function triggerCritSound(options: CombatAudioTriggerOptions = {}): CombatAudioTriggerEvent {
  return triggerCombatAudio('crit_sound', options)
}

export function triggerSkillSound(options: CombatAudioTriggerOptions = {}): CombatAudioTriggerEvent {
  return triggerCombatAudio('skill_sound', options)
}

export function triggerPetAttackSound(options: CombatAudioTriggerOptions = {}): CombatAudioTriggerEvent {
  return triggerCombatAudio('pet_attack_sound', options)
}

export function triggerVictorySound(options: CombatAudioTriggerOptions = {}): CombatAudioTriggerEvent {
  return triggerCombatAudio('victory_sound', options)
}

export function triggerLevelUpSound(options: CombatAudioTriggerOptions = {}): CombatAudioTriggerEvent {
  return triggerCombatAudio('level_up_sound', options)
}

export function triggerDefeatSound(options: CombatAudioTriggerOptions = {}): CombatAudioTriggerEvent {
  return triggerCombatAudio('defeat_sound', options)
}

export function triggerEnhanceSound(
  success: boolean,
  options: CombatAudioTriggerOptions = {},
): CombatAudioTriggerEvent {
  return triggerCombatAudio(success ? 'enhance_success_sound' : 'enhance_fail_sound', options)
}

export { playQuestClaimSfx }
