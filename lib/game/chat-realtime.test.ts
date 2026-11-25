import test from 'node:test'
import assert from 'node:assert/strict'
import { buildVisibleChatMessages, resolveLocalChatOrderMs } from './chat-realtime'

test('resolveLocalChatOrderMs prefers createdAtMs over small sequential ids', () => {
  assert.equal(resolveLocalChatOrderMs({ id: 1, createdAtMs: 1_795_000_000_100 }), 1_795_000_000_100)
  assert.equal(resolveLocalChatOrderMs({ id: 1_795_000_000_200 }), 1_795_000_000_200)
  assert.equal(resolveLocalChatOrderMs({ id: 4 }), 4)
})

test('local messages with createdAtMs sort chronologically after older remote messages', () => {
  const result = buildVisibleChatMessages({
    localChat: [
      {
        id: 1,
        createdAtMs: 1_795_000_005_000,
        type: 'player',
        text: 'ข้อความใหม่ล่าสุด',
        author: 'ผู้กล้า',
        channel: 'world',
        senderUid: 'user_1',
      },
      {
        id: 2,
        createdAtMs: 1_795_000_006_000,
        type: 'system',
        text: 'เก็บเหรียญ +100 G',
        channel: 'world',
      },
    ],
    remoteMessages: [
      {
        messageId: 'wc_old',
        channel: 'world',
        mapId: 'town',
        partyId: null,
        senderUid: 'user_2',
        senderName: 'เพื่อน',
        senderGameUid: '1002',
        isGm: false,
        text: 'ข้อความเก่า',
        createdAtMs: 1_795_000_001_000,
      },
    ],
    activeChannel: 'all',
    currentMapId: 'town',
    currentPartyId: null,
    selfUid: 'user_1',
  })

  assert.deepEqual(
    result.map((m) => m.text),
    ['ข้อความเก่า', 'ข้อความใหม่ล่าสุด', 'เก็บเหรียญ +100 G'],
  )
})

test('deduplicates recent self echo 1-to-1 while preserving older identical messages', () => {
  const result = buildVisibleChatMessages({
    localChat: [
      {
        id: 10,
        createdAtMs: 1_795_000_100_000,
        type: 'player',
        text: 'สวัสดี',
        author: 'ผู้กล้า',
        channel: 'world',
        senderUid: 'user_1',
      },
    ],
    remoteMessages: [
      {
        messageId: 'wc_old_hello',
        channel: 'world',
        mapId: 'town',
        partyId: null,
        senderUid: 'user_1',
        senderName: 'ผู้กล้า',
        senderGameUid: '1001',
        isGm: false,
        text: 'สวัสดี',
        createdAtMs: 1_795_000_000_000,
      },
      {
        messageId: 'wc_new_echo',
        channel: 'world',
        mapId: 'town',
        partyId: null,
        senderUid: 'user_1',
        senderName: 'ผู้กล้า',
        senderGameUid: '1001',
        isGm: false,
        text: 'สวัสดี',
        createdAtMs: 1_795_000_100_120,
      },
    ],
    activeChannel: 'world',
    currentMapId: 'town',
    currentPartyId: null,
    selfUid: 'user_1',
  })

  assert.equal(result.length, 2)
  assert.equal(result[0]?.key, 'remote_wc_old_hello')
  assert.equal(result[1]?.key, 'local_10_0')
})

test('preserves insertion order for same-millisecond local messages and filters map/party/blocked', () => {
  const result = buildVisibleChatMessages({
    localChat: [
      { id: 1, createdAtMs: 1_795_000_200_000, type: 'system', text: 'บรรทัด 1', channel: 'world' },
      { id: 2, createdAtMs: 1_795_000_200_000, type: 'system', text: 'บรรทัด 2', channel: 'world' },
    ],
    remoteMessages: [
      {
        messageId: 'wc_map_other',
        channel: 'map',
        mapId: 'forest',
        partyId: null,
        senderUid: 'user_2',
        senderName: 'คนป่า',
        senderGameUid: '1002',
        isGm: false,
        text: 'อยู่ป่า',
        createdAtMs: 1_795_000_200_010,
      },
      {
        messageId: 'wc_map_same',
        channel: 'map',
        mapId: 'town',
        partyId: null,
        senderUid: 'user_3',
        senderName: 'คนเมือง',
        senderGameUid: '1003',
        isGm: false,
        text: 'อยู่เมือง',
        createdAtMs: 1_795_000_200_020,
      },
      {
        messageId: 'wc_blocked',
        channel: 'world',
        mapId: 'town',
        partyId: null,
        senderUid: 'bad_user',
        senderName: 'สแปม',
        senderGameUid: '9999',
        isGm: false,
        text: 'ห้ามเห็น',
        createdAtMs: 1_795_000_200_030,
      },
    ],
    activeChannel: 'all',
    currentMapId: 'town',
    currentPartyId: 'party_1',
    selfUid: 'user_1',
    blockedUids: ['bad_user'],
  })

  assert.deepEqual(
    result.map((m) => m.text),
    ['บรรทัด 1', 'บรรทัด 2', 'อยู่เมือง'],
  )
})
