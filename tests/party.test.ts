import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_PARTY_SIZE,
  type PartyRecord,
  buildPartyMemberSnapshot,
  computePartySynergyBonus,
  normalizePartyName,
  parsePartyDoc,
  parsePartyInviteDoc,
  pickNextLeaderId,
  sortPartyMembers,
} from '../lib/firebase/party-helpers'
import type { RemotePlayerSnapshot } from '../lib/firebase/presence-helpers'

function makeRemote(overrides: Partial<RemotePlayerSnapshot> & { userId: string }): RemotePlayerSnapshot {
  return {
    userId: overrides.userId,
    uid: overrides.uid ?? 1001,
    gameUid: overrides.gameUid ?? '1001',
    displayName: overrides.displayName ?? 'Mate',
    classId: overrides.jobId ?? 'novice',
    jobId: overrides.jobId ?? 'novice',
    mapId: overrides.mapId ?? 'meadow',
    x: overrides.x ?? 200,
    y: overrides.y ?? 200,
    level: overrides.level ?? 10,
    gm: overrides.gm ?? false,
    facing: 'down',
    moving: false,
    status: overrides.status ?? 'idle',
    attackAnim: 0,
    invisible: overrides.invisible ?? false,
    lastSeen: overrides.lastSeen ?? Date.now(),
  }
}

test('normalizePartyName defaults cleanly and truncates long names', () => {
  assert.equal(normalizePartyName('', 'GMTUNX'), 'ปาร์ตี้ของ GMTUNX')
  assert.equal(normalizePartyName('   ', ''), 'ปาร์ตี้ของ นักผจญภัย')
  assert.equal(normalizePartyName('  ทีมล่าบอส Abyss  ', 'Test'), 'ทีมล่าบอส Abyss')
  assert.equal(normalizePartyName('x'.repeat(50)).length, 32)
})

test('buildPartyMemberSnapshot validates GM vs player identities and clamps vitals', () => {
  const gmSnap = buildPartyMemberSnapshot({
    userId: 'gm_uid_1',
    isGm: true,
    gameUid: '9999',
    uid: 9999,
    name: 'GMTUNX',
    jobId: 'archer',
    level: 70,
    hp: 9999,
    maxHp: 5000,
    mapId: 'town',
  })
  assert.ok(gmSnap)
  assert.equal(gmSnap.isGm, true)
  assert.equal(gmSnap.uid, 0)
  assert.equal(gmSnap.gameUid, '0000')
  assert.equal(gmSnap.hp, 5000)

  const playerSnap = buildPartyMemberSnapshot({
    userId: 'player_uid_2',
    isGm: false,
    gameUid: '03042',
    uid: 3042,
    name: 'Test001',
    jobId: 'gm',
    level: 12,
    hp: 150,
    maxHp: 200,
    mapId: 'meadow',
  })
  assert.ok(playerSnap)
  assert.equal(playerSnap.isGm, false)
  assert.equal(playerSnap.uid, 3042)
  assert.equal(playerSnap.gameUid, '03042')
  assert.equal(playerSnap.jobId, 'novice')

  // Rejects non-GM trying to claim 0000 or invalid userId
  assert.equal(
    buildPartyMemberSnapshot({
      userId: 'player_uid_bad',
      isGm: false,
      gameUid: '0000',
      uid: 0,
      name: 'Spoof',
      jobId: 'novice',
      level: 1,
      hp: 100,
      maxHp: 100,
      mapId: 'town',
    }),
    null,
  )
  assert.equal(
    buildPartyMemberSnapshot({
      userId: 'bad$id',
      isGm: false,
      gameUid: '0123',
      uid: 123,
      name: 'Bad',
      jobId: 'novice',
      level: 1,
      hp: 100,
      maxHp: 100,
      mapId: 'town',
    }),
    null,
  )
})

test('parsePartyDoc and parsePartyInviteDoc normalize valid documents', () => {
  const party = parsePartyDoc({
    partyId: 'pty_abc_123',
    name: 'กลุ่มล่ามังกร',
    leaderId: 'u1',
    memberIds: ['u1', 'u2'],
    members: {
      u1: { userId: 'u1', uid: 0, gameUid: '0000', name: 'GMTUNX', jobId: 'archer', level: 70, hp: 5000, maxHp: 5000, mapId: 'town', isGm: true },
      u2: { userId: 'u2', uid: 3042, gameUid: '03042', name: 'Test001', jobId: 'novice', level: 5, hp: 100, maxHp: 120, mapId: 'meadow', isGm: false },
    },
  })
  assert.ok(party)
  assert.equal(party.partyId, 'pty_abc_123')
  assert.equal(party.memberIds.length, 2)
  assert.equal(party.members.u1.isGm, true)
  assert.equal(party.members.u2.gameUid, '03042')

  const invite = parsePartyInviteDoc({
    inviteId: 'pty_abc_123__u3',
    partyId: 'pty_abc_123',
    partyName: 'กลุ่มล่ามังกร',
    fromUid: 'u1',
    toUid: 'u3',
    fromGameUid: '0000',
    toGameUid: '0456',
    fromName: 'GMTUNX',
    toName: 'Mage03',
    fromIsGm: true,
    status: 'pending',
  })
  assert.ok(invite)
  assert.equal(invite.status, 'pending')
  assert.equal(invite.fromIsGm, true)
})

test('sortPartyMembers puts leader first, then GM, then level desc', () => {
  const party: PartyRecord = {
    partyId: 'pty_sort_1',
    name: 'Sort Test',
    leaderId: 'u2',
    memberIds: ['u1', 'u2', 'u3'],
    members: {
      u1: { userId: 'u1', uid: 200, gameUid: '0200', name: 'Low', jobId: 'novice', level: 5, hp: 80, maxHp: 100, mapId: 'town', isGm: false },
      u2: { userId: 'u2', uid: 101, gameUid: '0101', name: 'Leader', jobId: 'warrior', level: 15, hp: 300, maxHp: 300, mapId: 'town', isGm: false },
      u3: { userId: 'u3', uid: 0, gameUid: '0000', name: 'GM', jobId: 'archer', level: 70, hp: 4000, maxHp: 4000, mapId: 'town', isGm: true },
    },
  }
  const sorted = sortPartyMembers(party)
  assert.deepEqual(sorted.map((m) => m.userId), ['u2', 'u3', 'u1'])
})

test('pickNextLeaderId transfers leadership only when leader leaves', () => {
  assert.equal(pickNextLeaderId(['u1', 'u2', 'u3'], 'u1', 'u1'), 'u2')
  assert.equal(pickNextLeaderId(['u1', 'u2', 'u3'], 'u1', 'u2'), 'u1')
  assert.equal(pickNextLeaderId(['u1'], 'u1', 'u1'), null)
})

test('computePartySynergyBonus calculates same-map EXP & Gold bonuses accurately', () => {
  const party: PartyRecord = {
    partyId: 'pty_syn_1',
    name: 'Synergy',
    leaderId: 'self',
    memberIds: ['self', 'mate1', 'mate2', 'mate3', 'mate4'],
    members: {
      self: { userId: 'self', uid: 100, gameUid: '0100', name: 'Self', jobId: 'warrior', level: 20, hp: 500, maxHp: 500, mapId: 'meadow', isGm: false },
      mate1: { userId: 'mate1', uid: 101, gameUid: '0101', name: 'M1', jobId: 'mage', level: 20, hp: 400, maxHp: 400, mapId: 'meadow', isGm: false },
      mate2: { userId: 'mate2', uid: 102, gameUid: '0102', name: 'M2', jobId: 'archer', level: 20, hp: 400, maxHp: 400, mapId: 'forest', isGm: false },
      mate3: { userId: 'mate3', uid: 103, gameUid: '0103', name: 'M3', jobId: 'knight', level: 20, hp: 400, maxHp: 400, mapId: 'meadow', isGm: false },
      mate4: { userId: 'mate4', uid: 104, gameUid: '0104', name: 'M4', jobId: 'novice', level: 20, hp: 400, maxHp: 400, mapId: 'meadow', isGm: false },
    },
  }

  const onlinePlayers: RemotePlayerSnapshot[] = [
    makeRemote({ userId: 'mate1', mapId: 'meadow' }),
    makeRemote({ userId: 'mate2', mapId: 'forest' }), // different map -> online but not same-map bonus
    makeRemote({ userId: 'mate3', mapId: 'meadow', invisible: true }), // invisible ignored
  ]

  const oneMate = computePartySynergyBonus(party, onlinePlayers, 'self', 'meadow')
  assert.equal(oneMate.onlineMates, 2)
  assert.equal(oneMate.sameMapMates, 1)
  assert.equal(oneMate.expMul, 1.15)
  assert.equal(oneMate.goldMul, 1.1)

  const capped = computePartySynergyBonus(
    party,
    [
      makeRemote({ userId: 'mate1', mapId: 'meadow' }),
      makeRemote({ userId: 'mate2', mapId: 'meadow' }),
      makeRemote({ userId: 'mate3', mapId: 'meadow' }),
      makeRemote({ userId: 'mate4', mapId: 'meadow' }),
    ],
    'self',
    'meadow',
  )
  assert.equal(capped.sameMapMates, MAX_PARTY_SIZE - 1)
  assert.equal(capped.expMul, 1.45)
  assert.equal(capped.goldMul, 1.3)

  const solo = computePartySynergyBonus(null, onlinePlayers, 'self', 'meadow')
  assert.equal(solo.sameMapMates, 0)
  assert.equal(solo.expMul, 1)
  assert.equal(solo.goldMul, 1)
})
