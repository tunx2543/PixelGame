export interface EmojiCategory {
  id: 'mood' | 'adventure' | 'social'
  label: string
  emojis: readonly string[]
}

export const CHAT_EMOJI_CATEGORIES: readonly EmojiCategory[] = [
  {
    id: 'mood',
    label: 'อารมณ์',
    emojis: [
      '😀', '😂', '😍', '🥳', '😎', '😭', '😡', '😱',
      '🤔', '😴', '🙏', '👍', '👏', '❤️', '🔥', '✨',
    ],
  },
  {
    id: 'adventure',
    label: 'ผจญภัย',
    emojis: [
      '⚔️', '🛡️', '🏹', '🪄', '💎', '👑', '🐉', '💀',
      '🧪', '🪙', '🎒', '🗺️', '⚡', '🌟', '🏆', '🎉',
    ],
  },
  {
    id: 'social',
    label: 'ทักทาย',
    emojis: [
      '👋', '🤝', '🙌', '💪', '🫡', '🫶', '👀', '💬',
      '🎯', '🍀', '🎁', '🐾', '🏠', '🔔', '💥', '🌈',
    ],
  },
] as const

export function insertEmojiAtCursor(
  current: string,
  emoji: string,
  selectionStart?: number | null,
  selectionEnd?: number | null,
  maxLength = 140,
): { text: string; nextCursor: number; inserted: boolean } {
  const safeMax = Math.max(1, Math.floor(maxLength))
  const len = current.length
  const rawStart = typeof selectionStart === 'number' && Number.isFinite(selectionStart) ? selectionStart : len
  const rawEnd = typeof selectionEnd === 'number' && Number.isFinite(selectionEnd) ? selectionEnd : rawStart
  const start = Math.max(0, Math.min(len, Math.floor(rawStart)))
  const end = Math.max(start, Math.min(len, Math.floor(rawEnd)))

  const before = current.slice(0, start)
  const after = current.slice(end)
  const nextText = `${before}${emoji}${after}`

  if (nextText.length > safeMax) {
    return { text: current, nextCursor: end, inserted: false }
  }

  return {
    text: nextText,
    nextCursor: start + emoji.length,
    inserted: true,
  }
}

export function detectNewlyArrivedKeys(params: {
  seenKeys: Set<string>
  visibleKeys: readonly string[]
  isHydrated: boolean
  channelSwitched: boolean
}): string[] {
  const { seenKeys, visibleKeys, isHydrated, channelSwitched } = params
  if (!isHydrated || channelSwitched) {
    for (const k of visibleKeys) seenKeys.add(k)
    return []
  }

  const newlyArrived: string[] = []
  for (const k of visibleKeys) {
    if (!seenKeys.has(k)) {
      seenKeys.add(k)
      newlyArrived.push(k)
    }
  }
  return newlyArrived
}
