import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PRESENCE_STALE_MS,
  type RemotePlayerSnapshot,
  buildWorldPresencePayload,
  filterPlayersForMap,
  formatPresenceStatusLabel,
  parseWorldPresenceToRemotePlayer,
  pruneStaleRemotePlayers,
  resolvePresenceStatus,
} from '../lib/firebase/presence-helpers'

test('resolvePresenceStatus and formatPresenceStatusLabel compute accurate player states', () => {
  assert.equal(resolvePresenceStatus({ mapId: 'town', moving: false, attackAnim: 0 }), 'town')
  assert.equal(resolvePresenceStatus({ mapId: 'meadow', moving: false, attackAnim: 0 }), 'idle')
  assert.equal(resolvePresenceStatus({ mapId: 'meadow', moving: true, attackAnim: 0 }), 'moving')
  assert.equal(resolvePresenceStatus({ mapId: 'meadow', moving: true, attackAnim: 0.2 }), 'combat')
  assert.equal(resolvePresenceStatus({ mapId: 'meadow', moving: false, attackAnim: 0, inCombat: true }), 'combat')

  assert.equal(formatPresenceStatusLabel('town', 'town'), 'อยู่ในเมือง')
  assert.equal(formatPresenceStatusLabel('moving', 'meadow'), 'กำลังเดิน')
  assert.equal(formatPresenceStatusLabel('combat', 'meadow'), 'กำลังต่อสู้')
  assert.equal(formatPresenceStatusLabel('idle', 'forest'), 'สำรวจพื้นที่')
})

test('buildWorldPresencePayload builds valid GM payload with UID 0, 0000, and status', () => {
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
  assert.equal(payload.status, 'town')
  assert.equal(payload.x, 416.2)
  assert.equal(payload.y, 448.7)
  assert.equal(payload.invisible, false)
})

test('buildWorldPresencePayload blocks non-GM spoofing, sanitizes gm jobId, and sets combat status', () => {
  const payload = buildWorldPresencePayload({
    userId: 'player_uid_abc',
    isGm: false,
    gameUid: '03042',
    uid: 3042,
    name: 'Test001',
    jobId: 'gm',
    mapId: 'meadow',
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
  assert.equal(payload.status, 'combat')
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

test('parseWorldPresenceToRemotePlayer supports global world parsing and map filtering', () => {
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
    status: 'town',
    attackAnim: 0,
    invisible: false,
    updatedAt: { toMillis: () => now - 2_000 },
  }

  // Self is filtered out
  assert.equal(
    parseWorldPresenceToRemotePlayer(
      { ...baseDoc, userId: 'self_user' },
      { selfUserId: 'self_user', nowMs: now },
    ),
    null,
  )

  // Global world subscription keeps player on other maps so location & status show in online list
  const meadowPlayer = parseWorldPresenceToRemotePlayer(
    { ...baseDoc, mapId: 'meadow', status: 'combat', moving: true },
    { selfUserId: 'self_user', nowMs: now },
  )
  assert.ok(meadowPlayer)
  assert.equal(meadowPlayer.mapId, 'meadow')
  assert.equal(meadowPlayer.status, 'combat')

  // filterPlayersForMap isolates players rendered on the local canvas
  assert.equal(filterPlayersForMap([meadowPlayer], 'town').length, 0)
  assert.equal(filterPlayersForMap([meadowPlayer], 'meadow').length, 1)

  // Explicit activeMapId filter excludes wrong map
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
      { selfUserId: 'self_user', nowMs: now },
    ),
    null,
  )

  // Stale filtered out
  assert.equal(
    parseWorldPresenceToRemotePlayer(
      { ...baseDoc, updatedAt: { toMillis: () => now - PRESENCE_STALE_MS - 1_000 } },
      { selfUserId: 'self_user', nowMs: now },
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
  assert.equal(first.status, 'town')
  assert.equal(first.previousX, 432)

  const second = parseWorldPresenceToRemotePlayer(
    { ...baseDoc, x: 448, y: 464, status: 'moving', moving: true },
    { selfUserId: 'self_user', activeMapId: 'town', nowMs: now + 200, existing: first },
  )
  assert.ok(second)
  assert.equal(second.previousX, 432)
  assert.equal(second.x, 448)
  assert.equal(second.status, 'moving')
})

test('parseWorldPresenceToRemotePlayer handles skewed device clocks using calibrated server offset', () => {
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
    status: 'town',
    attackAnim: 0,
    invisible: false,
    updatedAt: { toMillis: () => serverNow - 1_500 },
  }

  const parsed = parseWorldPresenceToRemotePlayer(freshOnServerDoc, {
    selfUserId: 'self_user',
    nowMs: deviceNow,
    clockOffsetMs,
  })
  assert.ok(parsed)
  assert.equal(parsed.gm, true)
  assert.equal(parsed.uid, 0)
  assert.equal(parsed.status, 'town')

  const map = new Map<string, RemotePlayerSnapshot>([[parsed.userId, parsed]])
  assert.equal(pruneStaleRemotePlayers(map, deviceNow + 10_000).length, 1)
  assert.equal(pruneStaleRemotePlayers(map, deviceNow + PRESENCE_STALE_MS + 1_000).length, 0)
})
