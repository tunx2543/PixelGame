import test from 'node:test'
import assert from 'node:assert/strict'
import { MAPS } from './maps'
import {
  BGM_BATTLE_HOLD_SEC,
  BGM_MAP_TRACK_CATALOG,
  BGM_THEMES,
  BGM_TRACK_CATALOG,
  BGM_TRACK_IDS,
  clampBgmVolume,
  getBgmTrackMeta,
  isDungeonBgmMapId,
  isSpecialEventBgmMapId,
  pickPlayableAudioUrl,
  resolveBgmTheme,
  resolveBgmTrackId,
} from './bgm-tracks'
import {
  BGM_ORCHESTRAL_SCORES,
  getOrchestralScore,
  noteToHz,
  validateAllOrchestralScores,
} from './bgm-scores'

test('BGM catalog covers all 7 required themes with OGG and MP3 candidates', () => {
  assert.deepEqual([...BGM_THEMES], ['login', 'town', 'field', 'dungeon', 'battle', 'boss', 'event'])
  for (const theme of BGM_THEMES) {
    const spec = BGM_TRACK_CATALOG[theme]
    assert.ok(spec, `Missing catalog entry for ${theme}`)
    assert.ok(spec.labelTh.length > 0)
    assert.equal(spec.candidates[0], `/audio/bgm/${theme}.ogg`)
    assert.equal(spec.candidates[1], `/audio/bgm/${theme}.mp3`)
  }
})

test('resolveBgmTheme maps all 7 game situations and respects priority precedence', () => {
  // 1. Login screen
  assert.equal(resolveBgmTheme({ screen: 'login' }), 'login')
  assert.equal(resolveBgmTheme({ screen: 'login', bossActive: true, eventActive: true }), 'login')

  // 2. Main town
  assert.equal(resolveBgmTheme({ screen: 'game', mapId: 'town' }), 'town')
  assert.equal(resolveBgmTheme('town'), 'town')

  // 3. Leveling / field maps
  for (const mapId of ['meadow', 'vale', 'woods', 'forest', 'coast', 'desert', 'isles', 'snow', 'sky', 'world']) {
    assert.equal(resolveBgmTheme({ screen: 'game', mapId }), 'field', `${mapId} without boss should be field`)
  }

  // 4. Dungeon maps & normal tower floors
  for (const mapId of ['cave', 'volcano', 'abyss', 'graveyard', 'ruins', 'crystal']) {
    assert.equal(isDungeonBgmMapId(mapId), true)
    assert.equal(resolveBgmTheme({ screen: 'game', mapId }), 'dungeon')
  }
  assert.equal(resolveBgmTheme({ screen: 'tower', bossActive: false }), 'dungeon')
  assert.equal(resolveBgmTheme({ screen: 'game', mapId: 'town', dungeonActive: true }), 'dungeon')

  // 5. Monster battle theme
  assert.equal(resolveBgmTheme({ screen: 'game', mapId: 'meadow', inCombat: true }), 'battle')
  assert.equal(resolveBgmTheme({ screen: 'game', mapId: 'cave', combatElapsedSec: 2.5 }), 'battle')
  assert.equal(resolveBgmTheme({ screen: 'encounter', mapId: 'meadow', inCombat: true }), 'battle')
  // Town stays calm unless event/boss
  assert.equal(resolveBgmTheme({ screen: 'game', mapId: 'town', inCombat: true }), 'town')

  // 6. Boss combat overrides field, dungeon, tower, and normal battle
  assert.equal(resolveBgmTheme({ screen: 'game', mapId: 'world', bossActive: true }), 'boss')
  assert.equal(resolveBgmTheme({ screen: 'game', mapId: 'cave', bossActive: true, inCombat: true }), 'boss')
  assert.equal(resolveBgmTheme({ screen: 'tower', bossActive: true }), 'boss')
  assert.equal(resolveBgmTheme({ screen: 'game', mapId: 'act_boss_rush' }), 'boss')

  // 7. Special event maps & town invasion
  for (const mapId of ['act_invasion', 'act_guild_war', 'act_bounty', 'act_treasure', 'act_fishing']) {
    assert.equal(isSpecialEventBgmMapId(mapId), true)
    assert.equal(resolveBgmTheme({ screen: 'game', mapId }), 'event')
  }
  assert.equal(resolveBgmTheme({ screen: 'game', mapId: 'town', eventActive: true, inCombat: true }), 'event')
})

test('combat BGM hysteresis holds battle music for BGM_BATTLE_HOLD_SEC then returns to map music', () => {
  assert.equal(resolveBgmTheme({ screen: 'game', mapId: 'forest', combatElapsedSec: 0 }), 'battle')
  assert.equal(
    resolveBgmTheme({ screen: 'game', mapId: 'forest', combatElapsedSec: BGM_BATTLE_HOLD_SEC - 0.1 }),
    'battle',
  )
  assert.equal(
    resolveBgmTheme({ screen: 'game', mapId: 'forest', combatElapsedSec: BGM_BATTLE_HOLD_SEC }),
    'field',
  )
  assert.equal(
    resolveBgmTheme({ screen: 'game', mapId: 'ruins', combatElapsedSec: BGM_BATTLE_HOLD_SEC + 1 }),
    'dungeon',
  )
})

test('every game map resolves to its own distinct MMORPG Open World track ID and score', () => {
  const seenPerMapIds = new Set<string>()
  for (const mapDef of Object.values(MAPS)) {
    const trackId = resolveBgmTrackId({ screen: 'game', mapId: mapDef.id })
    const expected = mapDef.id === 'act_boss_rush' ? 'boss' : mapDef.id
    assert.equal(trackId, expected, `Map ${mapDef.id} should resolve to track ${expected}`)
    seenPerMapIds.add(trackId)

    const meta = getBgmTrackMeta(trackId)
    assert.equal(meta.trackId, trackId)
    assert.ok(meta.labelTh.length > 0)
    assert.ok(meta.styleTh.length > 0)
    assert.ok(meta.bpm >= 60 && meta.bpm <= 170)

    const score = getOrchestralScore(trackId)
    assert.equal(score.trackId, trackId)
    assert.equal(score.steps.length, 32, `Score for ${trackId} should have 32 steps (4 bars)`)
  }
  assert.equal(seenPerMapIds.size, Object.keys(MAPS).length)
})

test('battle/boss precedence overrides map exploration track then restores exact map track', () => {
  assert.equal(resolveBgmTrackId({ screen: 'game', mapId: 'desert', inCombat: true }), 'battle')
  assert.equal(
    resolveBgmTrackId({ screen: 'game', mapId: 'desert', combatElapsedSec: BGM_BATTLE_HOLD_SEC }),
    'desert',
  )
  assert.equal(resolveBgmTrackId({ screen: 'game', mapId: 'snow', bossActive: true }), 'boss')
  assert.equal(resolveBgmTrackId({ screen: 'game', mapId: 'snow', bossActive: false }), 'snow')
  assert.equal(resolveBgmTrackId({ screen: 'game', mapId: 'volcano' }), 'volcano')
  assert.equal(resolveBgmTrackId({ screen: 'game', mapId: 'act_fishing' }), 'act_fishing')
})

test('all 27 BGM_TRACK_IDS have valid orchestral scores and positive note frequencies', () => {
  assert.equal(validateAllOrchestralScores(), true)
  assert.equal(noteToHz('A4'), 440)
  assert.ok(Math.abs(noteToHz('C4') - 261.63) < 0.05)
  assert.equal(noteToHz(null), 0)

  const distinctBpmTimbrePairs = new Set<string>()
  for (const id of BGM_TRACK_IDS) {
    assert.ok(BGM_MAP_TRACK_CATALOG[id], `Missing map track meta for ${id}`)
    const score = BGM_ORCHESTRAL_SCORES[id]
    assert.ok(score, `Missing orchestral score for ${id}`)
    assert.equal(score.steps.length, 32)
    distinctBpmTimbrePairs.add(`${id}:${score.bpm}:${score.leadTimbre}:${score.arpTimbre}:${score.padTimbre}`)

    let hasMelody = false
    let hasChord = false
    for (const step of score.steps) {
      if (step.melody) {
        assert.ok(noteToHz(step.melody) > 0, `Invalid melody note ${step.melody} in ${id}`)
        hasMelody = true
      }
      if (step.arp) {
        assert.ok(noteToHz(step.arp) > 0, `Invalid arp note ${step.arp} in ${id}`)
      }
      if (step.bass) {
        assert.ok(noteToHz(step.bass) > 0, `Invalid bass note ${step.bass} in ${id}`)
      }
      if (step.chord) {
        hasChord = true
        for (const n of step.chord) {
          assert.ok(noteToHz(n) > 0, `Invalid chord note ${n} in ${id}`)
        }
      }
    }
    assert.ok(hasMelody, `Score ${id} must contain melody notes`)
    assert.ok(hasChord, `Score ${id} must contain harmonic chords`)
  }
  assert.equal(distinctBpmTimbrePairs.size, BGM_TRACK_IDS.length)
})

test('pickPlayableAudioUrl selects OGG when supported and falls back to MP3 when OGG is unsupported', () => {
  const urls = ['/audio/bgm/town.ogg', '/audio/bgm/town.mp3']

  // Chrome / Firefox / Android Chrome supporting OGG Vorbis
  const androidCanPlay = (mime: string) =>
    mime.includes('ogg') || mime.includes('mpeg') ? 'probably' : ''
  assert.equal(pickPlayableAudioUrl(urls, androidCanPlay), '/audio/bgm/town.ogg')

  // Safari / iOS environment supporting MP3 only
  const mp3OnlyCanPlay = (mime: string) => (mime.includes('mpeg') ? 'probably' : '')
  assert.equal(pickPlayableAudioUrl(urls, mp3OnlyCanPlay), '/audio/bgm/town.mp3')

  // Empty manifest
  assert.equal(pickPlayableAudioUrl([], androidCanPlay), null)
  assert.equal(pickPlayableAudioUrl(undefined, androidCanPlay), null)
})

test('clampBgmVolume bounds player volume between 0 and 1', () => {
  assert.equal(clampBgmVolume(-0.4), 0)
  assert.equal(clampBgmVolume(0), 0)
  assert.equal(clampBgmVolume(0.45), 0.45)
  assert.equal(clampBgmVolume(1.8), 1)
  assert.equal(clampBgmVolume(Number.NaN), 0.35)
})
