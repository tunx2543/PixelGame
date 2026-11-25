import { filterBlockedMessages, type ChatChannel } from './mmo-systems'

export type ChatMessageType = 'system' | 'player' | 'gm' | 'loot' | 'error' | 'npc'

export interface LocalChatMessageInput {
  id: number
  createdAtMs?: number
  type: ChatMessageType
  text: string
  author?: string
  channel?: Exclude<ChatChannel, 'all'>
  senderUid?: string
  senderGameUid?: string
}

export interface RemoteWorldChatInput {
  messageId: string
  channel: Exclude<ChatChannel, 'all'>
  mapId: string
  partyId: string | null
  senderUid: string
  senderName: string
  senderGameUid: string
  isGm: boolean
  text: string
  createdAtMs: number
}

export interface DisplayChatItem {
  key: string
  type: ChatMessageType
  text: string
  author?: string
  channel: Exclude<ChatChannel, 'all'>
  senderUid?: string
  senderGameUid?: string
  orderMs: number
  seq: number
}

const OPTIMISTIC_DEDUP_WINDOW_MS = 15_000

export function resolveLocalChatOrderMs(msg: Pick<LocalChatMessageInput, 'id' | 'createdAtMs'>): number {
  if (typeof msg.createdAtMs === 'number' && Number.isFinite(msg.createdAtMs) && msg.createdAtMs > 0) {
    return msg.createdAtMs
  }
  if (typeof msg.id === 'number' && Number.isFinite(msg.id) && msg.id >= 1_000_000_000_000) {
    return msg.id
  }
  return Math.max(0, Number(msg.id) || 0)
}

export function buildVisibleChatMessages(params: {
  localChat: readonly LocalChatMessageInput[]
  remoteMessages: readonly RemoteWorldChatInput[]
  activeChannel: ChatChannel
  currentMapId: string
  currentPartyId: string | null
  selfUid: string
  blockedUids?: string[]
  limit?: number
}): DisplayChatItem[] {
  const {
    localChat,
    remoteMessages,
    activeChannel,
    currentMapId,
    currentPartyId,
    selfUid,
    blockedUids,
    limit = 60,
  } = params

  const localItems: DisplayChatItem[] = localChat.map((m, idx) => ({
    key: `local_${m.id}_${idx}`,
    type: m.type,
    text: m.text,
    author: m.author,
    channel: m.channel ?? 'world',
    senderUid: m.senderUid,
    senderGameUid: m.senderGameUid,
    orderMs: resolveLocalChatOrderMs(m),
    seq: idx,
  }))

  // Track local optimistic player messages sent by self so the Firestore echo
  // doesn't appear as a duplicate while still allowing older history with the same text.
  const pendingLocalEchoTimes = new Map<string, number[]>()
  for (const item of localItems) {
    if (item.type !== 'player' && item.type !== 'gm') continue
    const effectiveUid = item.senderUid || 'guest_player'
    if (effectiveUid !== selfUid) continue
    const fp = `${effectiveUid}:${item.channel}:${item.text}`
    const list = pendingLocalEchoTimes.get(fp)
    if (list) list.push(item.orderMs)
    else pendingLocalEchoTimes.set(fp, [item.orderMs])
  }

  const remoteItems: DisplayChatItem[] = []
  remoteMessages.forEach((r, idx) => {
    if (r.channel === 'map' && r.mapId !== currentMapId) return
    if (r.channel === 'party' && (!currentPartyId || r.partyId !== currentPartyId)) return

    if (r.senderUid === selfUid) {
      const fp = `${r.senderUid}:${r.channel}:${r.text}`
      const times = pendingLocalEchoTimes.get(fp)
      if (times && times.length > 0) {
        const matchIdx = times.findIndex((t) => Math.abs(r.createdAtMs - t) <= OPTIMISTIC_DEDUP_WINDOW_MS)
        if (matchIdx !== -1) {
          times.splice(matchIdx, 1)
          return
        }
      }
    }

    remoteItems.push({
      key: `remote_${r.messageId}`,
      type: r.isGm ? 'gm' : 'player',
      text: r.text,
      author: r.senderName,
      channel: r.channel,
      senderUid: r.senderUid,
      senderGameUid: r.senderGameUid,
      orderMs: Number.isFinite(r.createdAtMs) ? r.createdAtMs : 0,
      seq: localItems.length + idx,
    })
  })

  return filterBlockedMessages([...localItems, ...remoteItems], blockedUids)
    .filter((msg) => activeChannel === 'all' || msg.channel === activeChannel)
    .sort((a, b) => a.orderMs - b.orderMs || a.seq - b.seq)
    .slice(-Math.max(1, limit))
}
