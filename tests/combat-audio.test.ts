import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearCombatAudioTriggers,
  COMBAT_AUDIO_ASSETS,
  getRecentCombatAudioTriggers,
  registerCombatAudioHandler,
  triggerAttackSound,
  triggerCritSound,
  triggerDefeatSound,
  triggerEnhanceSound,
  triggerHitSound,
  triggerLevelUpSound,
  triggerPetAttackSound,
  triggerSkillSound,
  triggerVictorySound,
  type CombatAudioTriggerEvent,
} from '../lib/game/combat-audio'

test('combat-audio placeholder triggers', async (t) => {
  t.beforeEach(() => {
    clearCombatAudioTriggers()
  })

  await t.test('triggers attack_sound, hit_sound, and crit_sound with reserved asset paths', () => {
    const atk = triggerAttackSound({ source: 'encounter', detail: { isSkill: false } })
    const hit = triggerHitSound({ source: 'encounter', detail: { target: 'enemy', damage: 24 } })
    const crit = triggerCritSound({ source: 'tower', detail: { target: 'enemy', damage: 52 } })

    assert.equal(atk.cue, 'attack_sound')
    assert.equal(atk.assetPath, COMBAT_AUDIO_ASSETS.attack_sound.assetPath)
    assert.equal(atk.source, 'encounter')

    assert.equal(hit.cue, 'hit_sound')
    assert.equal(hit.assetPath, COMBAT_AUDIO_ASSETS.hit_sound.assetPath)

    assert.equal(crit.cue, 'crit_sound')
    assert.equal(crit.assetPath, COMBAT_AUDIO_ASSETS.crit_sound.assetPath)
    assert.equal(crit.source, 'tower')

    assert.equal(getRecentCombatAudioTriggers().length, 3)
  })

  await t.test('forwards events to registered custom audio asset handlers and supports unsubscribe', () => {
    const received: CombatAudioTriggerEvent[] = []
    const unsub = registerCombatAudioHandler((evt) => {
      received.push(evt)
    })

    triggerSkillSound({ source: 'encounter' })
    triggerPetAttackSound({ source: 'tower' })
    triggerVictorySound({ source: 'tower' })
    triggerLevelUpSound({ source: 'encounter' })
    triggerDefeatSound({ source: 'tower' })
    triggerEnhanceSound(true, { source: 'encounter' })
    triggerEnhanceSound(false, { source: 'encounter' })

    assert.deepEqual(
      received.map((e) => e.cue),
      [
        'skill_sound',
        'pet_attack_sound',
        'victory_sound',
        'level_up_sound',
        'defeat_sound',
        'enhance_success_sound',
        'enhance_fail_sound',
      ],
    )

    unsub()
    triggerAttackSound({ muted: true })
    assert.equal(received.length, 7)
    assert.equal(getRecentCombatAudioTriggers().at(-1)?.muted, true)
  })
})
