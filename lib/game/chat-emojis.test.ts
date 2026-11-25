import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHAT_EMOJI_CATEGORIES,
  detectNewlyArrivedKeys,
  insertEmojiAtCursor,
} from './chat-emojis'

test('CHAT_EMOJI_CATEGORIES has non-empty unique emojis per category', () => {
  assert.ok(CHAT_EMOJI_CATEGORIES.length >= 3)
  for (const cat of CHAT_EMOJI_CATEGORIES) {
    assert.ok(cat.emojis.length >= 8)
    assert.equal(new Set(cat.emojis).size, cat.emojis.length)
  }
})

test('insertEmojiAtCursor inserts at cursor, replaces selection, and respects maxLength without corrupting emoji', () => {
  const atEnd = insertEmojiAtCursor('สวัสดี', '👋')
  assert.equal(atEnd.inserted, true)
  assert.equal(atEnd.text, 'สวัสดี👋')
  assert.equal(atEnd.nextCursor, 'สวัสดี👋'.length)

  const inMiddle = insertEmojiAtCursor('ลุยบอสกัน', '⚔️', 3, 3)
  assert.equal(inMiddle.inserted, true)
  assert.equal(inMiddle.text, 'ลุย⚔️บอสกัน')
  assert.equal(inMiddle.nextCursor, 5)

  const replaced = insertEmojiAtCursor('hello world', '🔥', 6, 11)
  assert.equal(replaced.inserted, true)
  assert.equal(replaced.text, 'hello 🔥')

  const atLimit = insertEmojiAtCursor('12345', '😀', 5, 5, 6)
  assert.equal(atLimit.inserted, false)
  assert.equal(atLimit.text, '12345')
})

test('detectNewlyArrivedKeys skips initial hydration and channel switches, and detects new keys afterwards', () => {
  const seen = new Set<string>()
  const initial = detectNewlyArrivedKeys({
    seenKeys: seen,
    visibleKeys: ['m1', 'm2'],
    isHydrated: false,
    channelSwitched: false,
  })
  assert.deepEqual(initial, [])
  assert.equal(seen.size, 2)

  const afterArrival = detectNewlyArrivedKeys({
    seenKeys: seen,
    visibleKeys: ['m1', 'm2', 'm3'],
    isHydrated: true,
    channelSwitched: false,
  })
  assert.deepEqual(afterArrival, ['m3'])

  const onTabSwitch = detectNewlyArrivedKeys({
    seenKeys: seen,
    visibleKeys: ['m1', 'm2', 'm3', 'tab_old_1'],
    isHydrated: true,
    channelSwitched: true,
  })
  assert.deepEqual(onTabSwitch, [])
  assert.equal(seen.has('tab_old_1'), true)
})
