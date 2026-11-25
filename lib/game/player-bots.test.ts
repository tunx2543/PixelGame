import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PLAYER_BOT_DEFS,
  botsToRemotePlayers,
  buildBotInspectProfile,
  createInitialBotStates,
  getBotDef,
  isBotPlayerId,
  setBotSpeechBubble,
  stepPlayerBots,
} from './player-bots'

test('bot definitions and lookup match 3 distinct player bots', () => {
  assert.equal(PLAYER_BOT_DEFS.length, 3)
  assert.equal(isBotPlayerId('bot_kaito'), true)
  assert.equal(isBotPlayerId('9002'), true)
  assert.equal(isBotPlayerId('real_uid_123'), false)
  assert.equal(getBotDef('9003')?.displayName, 'เซ็กซ์')
})

test('bots roam without crossing blocked tiles and attack monsters on non-safe maps', () => {
  const states = createInitialBotStates(10_000)
  // Put Kaito on meadow near a monster
  const kaito = states[0]
  kaito.mapId = 'meadow'
  kaito.x = 120
  kaito.y = 120
  kaito.attackCd = 0

  let attacks = 0
  let visuals = 0
  stepPlayerBots(states, {
    dt: 0.05,
    nowMs: 10_050,
    timeSec: 5,
    currentMapId: 'meadow',
    mapSafe: false,
    mapWidthPx: 600,
    mapHeightPx: 400,
    tileSize: 16,
    playerX: 100,
    playerY: 120,
    monsters: [
      { uid: 'mob_1', defId: 'slime', name: 'สไลม์เขียว', x: 135, y: 120, hp: 50, maxHp: 50, dead: false },
    ],
    isBlocked: (x) => x > 200,
    onAttackMonster: (_bot, m, dmg) => {
      attacks += 1
      assert.equal(m.uid, 'mob_1')
      assert.ok(dmg > 0)
    },
    onSpawnVisualEffect: () => {
      visuals += 1
    },
    onBotChat: () => {},
  })

  assert.equal(attacks, 1)
  assert.equal(visuals, 1)
  assert.equal(kaito.status, 'combat')
  assert.ok(kaito.attackAnim > 0)
})

test('setBotSpeechBubble attaches and expires speech bubbles cleanly', () => {
  const states = createInitialBotStates(1_000)
  setBotSpeechBubble(states, 'bot_mina', 'หวัดดีจ้า ✨', 10)
  let snapshots = botsToRemotePlayers(states, 2_000)
  assert.equal(snapshots.find((s) => s.userId === 'bot_mina')?.bubble?.text, 'หวัดดีจ้า ✨')

  stepPlayerBots(states, {
    dt: 0.05,
    nowMs: 12_000,
    timeSec: 11,
    currentMapId: 'town',
    mapSafe: true,
    mapWidthPx: 704,
    mapHeightPx: 512,
    tileSize: 16,
    playerX: 350,
    playerY: 290,
    monsters: [],
    isBlocked: () => false,
    onAttackMonster: () => {},
    onSpawnVisualEffect: () => {},
    onBotChat: () => {},
  })

  snapshots = botsToRemotePlayers(states, 12_000)
  assert.equal(snapshots.find((s) => s.userId === 'bot_mina')?.bubble, null)
})

test('buildBotInspectProfile returns full live profile for bots', () => {
  const states = createInitialBotStates(5_000)
  const profile = buildBotInspectProfile('9001', states)
  assert.ok(profile)
  assert.equal(profile.name, 'ไคโตะ')
  assert.equal(profile.isOnline, true)
  assert.equal(profile.mapId, 'town')
})
