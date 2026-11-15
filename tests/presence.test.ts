import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PRESENCE_STALE_MS,
  type RemotePlayerSnapshot,
  buildWorldPresencePayload,
  parseWorldPresenceToRemotePlayer,
  pruneStaleRemotePlayers,
} from '../lib/firebase/presence-helpers'

test('buildWorldPresencePayload builds valid GM payload with UID 0 and 0000', () => {
  const payload = buildWorldPresencePayload({
    userId: 'gm_firebase_uid_123',
    isGm: true,
    gameUid: '9999', // must normalize to 0000 for GM
    uid: 9999,
    name: 'GMTUNX',
    jobId: 'archer',
    mapId: 'town',
    x: 416.24,
    y: 448.66,
    level: 70,
    facing: 'down',
    moving: false,
    attackAnim: 0,
    invisible: false,
    nowMs: 1_700_000_000_000,
  })

  assert.ok(payload)
  assert.equal(payload.gm, true)
  assert.equal(payload.uid, 0)
  assert.equal(payload.gameUid, '0000')
  assert.equal(payload.displayName, 'GMTUNX')
  assert.equal(payload.x, 416.2)
  assert.equal(payload.y, 448.7)
  assert.equal(payload.invisible, false)
})

test('buildWorldPresencePayload blocks non-GM spoofing and strips gm jobId', () => {
  const payload = buildWorldPresencePayload({
    userId: 'player_uid_abc',
    isGm: false,
    gameUid: '03042',
    uid: 3042,
    name: 'Test001',
    jobId: 'gm',
    mapId: 'town',
    x: 420,
    y: 450,
    level: 1,
    facing: 'right',
    moving: true,
    attackAnim: 0.25,
    invisible: false,
    nowMs: 1_700_000_000_000,
  })

  assert.ok(payload)
  assert.equal(payload.gm, false)
  assert.equal(payload.uid, 3042)
  assert.equal(payload.gameUid, '03042')
  assert.equal(payload.jobId, 'novice')
})

test('buildWorldPresencePayload returns null when invisible, invalid UID, or non-GM lacks UID', () => {
  assert.equal(
    buildWorldPresencePayload({
      userId: 'gm_uid',
      isGm: true,
      name: 'GMTUNX',
      jobId: 'archer',
      mapId: 'town',
      x: 400,
      y: 400,
      level: 70,
      facing: 'down',
      moving: false,
      attackAnim: 0,
      invisible: true,
    }),
    null,
  )

  assert.equal(
    buildWorldPresencePayload({
      userId: 'player_uid',
      isGm: false,
      gameUid: '0000',
      uid: 0,
      name: 'Test001',
      jobId: 'novice',
      mapId: 'town',
      x: 400,
      y: 400,
      level: 1,
      facing: 'down',
      moving: false,
      attackAnim: 0,
      invisible: false,
    }),
    null,
  )

  assert.equal(
    buildWorldPresencePayload({
      userId: 'bad$uid',
      isGm: false,
      gameUid: '1234',
      uid: 1234,
      name: 'Test001',
      jobId: 'novice',
      mapId: 'town',
      x: 400,
      y: 400,
      level: 1,
      facing: 'down',
      moving: false,
      attackAnim: 0,
    }),
    null,
  )
})

test('parseWorldPresenceToRemotePlayer filters self, different maps, invisible, and stale records', () => {
  const now = 1_700_000_100_000
  const baseDoc = {
    userId: 'other_user',
    gameUid: '03042',
    uid: 3042,
    displayName: 'Test001',
    jobId: 'novice',
    mapId: 'town',
    x: 432,
    y: 464,
    level: 1,
    gm: false,
    facing: 'down',
    moving: false,
    attackAnim: 0,
    invisible: false,
    updatedAt: { toMillis: () => now - 2_000 },
  }

  // Self is filtered out
  assert.equal(
    parseWorldPresenceToRemotePlayer(
      { ...baseDoc, userId: 'self_user' },
      { selfUserId: 'self_user', activeMapId: 'town', nowMs: now },
    ),
    null,
  )

  // Wrong map filtered out
  assert.equal(
    parseWorldPresenceToRemotePlayer(
      { ...baseDoc, mapId: 'meadow' },
      { selfUserId: 'self_user', activeMapId: 'town', nowMs: now },
    ),
    null,
  )

  // Invisible filtered out
  assert.equal(
    parseWorldPresenceToRemotePlayer(
      { ...baseDoc, invisible: true },
      { selfUserId: 'self_user', activeMapId: 'town', nowMs: now },
    ),
    null,
  )

  // Stale filtered out
  assert.equal(
    parseWorldPresenceToRemotePlayer(
      { ...baseDoc, updatedAt: { toMillis: () => now - PRESENCE_STALE_MS - 1_000 } },
      { selfUserId: 'self_user', activeMapId: 'town', nowMs: now },
    ),
    null,
  )

  // Valid player parses cleanly and interpolates previous position
  const first = parseWorldPresenceToRemotePlayer(baseDoc, {
    selfUserId: 'self_user',
    activeMapId: 'town',
    nowMs: now,
  })
  assert.ok(first)
  assert.equal(first.displayName, 'Test001')
  assert.equal(first.gameUid, '03042')
  assert.equal(first.uid, 3042)
  assert.equal(first.previousX, 432)

  const second = parseWorldPresenceToRemotePlayer(
    { ...baseDoc, x: 448, y: 464 },
    { selfUserId: 'self_user', activeMapId: 'town', nowMs: now + 200, existing: first },
  )
  assert.ok(second)
  assert.equal(second.previousX, 432)
  assert.equal(second.x, 448)
})

test('parseWorldPresenceToRemotePlayer handles skewed device clocks using calibrated server offset', () => {
  // Simulate device clock lagging 5 minutes (300,000 ms) behind Google server time
  const deviceNow = 1_700_000_000_000
  const serverNow = deviceNow + 300_000
  const clockOffsetMs = serverNow - deviceNow

  const freshOnServerDoc = {
    userId: 'other_user',
    gameUid: '0000',
    uid: 0,
    displayName: 'GMTUNX',
    jobId: 'archer',
    mapId: 'town',
    x: 416,
    y: 448,
    level: 70,
    gm: true,
    facing: 'down',
    moving: false,
    attackAnim: 0,
    invisible: false,
    updatedAt: { toMillis: () => serverNow - 1_500 },
  }

  const parsed = parseWorldPresenceToRemotePlayer(freshOnServerDoc, {
    selfUserId: 'self_user',
    activeMapId: 'town',
    nowMs: deviceNow,
    clockOffsetMs,
  })
  assert.ok(parsed)
  assert.equal(parsed.gm, true)
  assert.equal(parsed.uid, 0)

  // And pruning uses the converted localLastSeen accurately
  const map = new Map<string, RemotePlayerSnapshot>([[parsed.userId, parsed]])
  assert.equal(pruneStaleRemotePlayers(map, deviceNow + 10_000).length, 1)
  assert.equal(pruneStaleRemotePlayers(map, deviceNow + PRESENCE_STALE_MS + 1_000).length, 0)
})
