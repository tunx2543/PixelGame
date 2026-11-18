'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, MessageSquare, VolumeX } from 'lucide-react'
import { auth as firebaseAuth } from '@/lib/firebase/client'
import {
  sendWorldChatMessage,
  subscribeWorldChatMessages,
  type WorldChatMessageRecord,
} from '@/lib/firebase/mmo-online'
import { game, getActiveMuteRemainingSec, notify, submitChat, type ChatType } from '@/lib/game/engine'
import {
  CHAT_CHANNEL_META,
  filterBlockedMessages,
  type ChatChannel,
} from '@/lib/game/mmo-systems'
import { useUiLayout } from '@/lib/game/ui-layout'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'

const TYPE_STYLE: Record<ChatType, string> = {
  system: 'text-accent',
  player: 'text-foreground',
  gm: 'text-gold',
  loot: 'text-[#7ae582]',
  error: 'text-destructive',
  npc: 'text-[#ffd6a5]',
}

const TYPE_TAG: Record<ChatType, string> = {
  system: '[ระบบ]',
  player: '',
  gm: '[GM]',
  loot: '[ไอเทม]',
  error: '[!]',
  npc: '[NPC]',
}

const CHANNEL_TAG: Record<Exclude<ChatChannel, 'all'>, string> = {
  world: 'โลก',
  map: 'แมพ',
  party: 'ปาร์ตี้',
  trade: 'ค้าขาย',
}

interface DisplayChatItem {
  key: string
  type: ChatType
  text: string
  author?: string
  channel: Exclude<ChatChannel, 'all'>
  senderUid?: string
  senderGameUid?: string
  orderMs: number
}

export function ChatBox({ offsetTouch = false }: { offsetTouch?: boolean }) {
  const g = useGame()
  const layout = useUiLayout()
  const inlineNextToDpad = offsetTouch && layout.viewport.width >= 760
  const [text, setText] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [remoteMessages, setRemoteMessages] = useState<WorldChatMessageRecord[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  const [nowMs, setNowMs] = useState(() => Date.now())
  const activeChannel = g.chatChannel
  const selfUid = firebaseAuth.currentUser?.uid ?? 'guest_player'
  const currentMapId = g.p?.mapId ?? 'town'
  const currentPartyId = g.party?.partyId ?? null
  const blockedUids = g.p?.blockedUids
  const mutedUntilMs = g.p?.mutedUntilMs ?? 0
  const muteRemainingSec = mutedUntilMs > nowMs && !g.p?.gm ? Math.ceil((mutedUntilMs - nowMs) / 1000) : 0

  useEffect(() => {
    if (mutedUntilMs <= Date.now() || g.p?.gm) return
    setNowMs(Date.now())
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [mutedUntilMs, g.p?.gm])

  useEffect(() => {
    const onOpenChat = () => setIsOpen(true)
    window.addEventListener('pixelquest:open-chat', onOpenChat)
    return () => window.removeEventListener('pixelquest:open-chat', onOpenChat)
  }, [])

  useEffect(() => {
    const unsub = subscribeWorldChatMessages(setRemoteMessages)
    return () => unsub()
  }, [])

  const visibleMessages = useMemo(() => {
    const localItems: DisplayChatItem[] = g.chat.map((m, idx) => ({
      key: `local_${m.id}_${idx}`,
      type: m.type,
      text: m.text,
      author: m.author,
      channel: m.channel ?? 'world',
      senderUid: m.senderUid,
      senderGameUid: m.senderGameUid,
      orderMs: m.id,
    }))

    const localFingerprints = new Set(
      localItems.map((l) => `${l.senderUid ?? l.author ?? ''}:${l.channel}:${l.text}`),
    )

    const remoteItems: DisplayChatItem[] = remoteMessages
      .filter((r) => {
        if (r.channel === 'map' && r.mapId !== currentMapId) return false
        if (r.channel === 'party' && (!currentPartyId || r.partyId !== currentPartyId)) return false
        const fp = `${r.senderUid}:${r.channel}:${r.text}`
        if (r.senderUid === selfUid && localFingerprints.has(fp)) return false
        return true
      })
      .map((r) => ({
        key: `remote_${r.messageId}`,
        type: r.isGm ? 'gm' : 'player',
        text: r.text,
        author: r.senderName,
        channel: r.channel,
        senderUid: r.senderUid,
        senderGameUid: r.senderGameUid,
        orderMs: r.createdAtMs,
      }))

    const merged = filterBlockedMessages([...localItems, ...remoteItems], blockedUids)
      .filter((msg) => activeChannel === 'all' || msg.channel === activeChannel)
      .sort((a, b) => a.orderMs - b.orderMs)
      .slice(-60)

    return merged
  }, [g.chat, remoteMessages, activeChannel, currentMapId, currentPartyId, selfUid, blockedUids])

  const lastKey = visibleMessages.at(-1)?.key ?? ''

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lastKey, isOpen, activeChannel])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const raw = text.trim()
    if (!raw || !g.p) return
    const targetChannel: Exclude<ChatChannel, 'all'> =
      activeChannel === 'all' ? 'world' : activeChannel

    const activeMuteSec = getActiveMuteRemainingSec()
    if (!raw.startsWith('/') && activeMuteSec > 0) {
      submitChat(raw, targetChannel)
      setText('')
      ;(document.activeElement as HTMLElement | null)?.blur()
      return
    }

    submitChat(raw, targetChannel)
    if (!raw.startsWith('/')) {
      void sendWorldChatMessage({
        channel: targetChannel,
        mapId: g.p.mapId,
        partyId: g.party?.partyId ?? null,
        senderName: g.p.name,
        senderGameUid: g.p.gameUid ?? '1000',
        jobId: g.p.jobId,
        isGm: Boolean(g.p.gm),
        text: raw,
      })
    }
    setText('')
    ;(document.activeElement as HTMLElement | null)?.blur()
  }

  return (
    <div
      data-testid="chat-box"
      onPointerDown={(event) => event.stopPropagation()}
      className={cn(
        'pointer-events-auto pixel-panel absolute flex flex-col bg-card/90 shadow-lg transition-[width]',
        isOpen ? 'z-40 w-[min(19rem,calc(100vw-1rem))]' : 'z-20',
        !isOpen && (inlineNextToDpad ? 'w-[5.75rem]' : 'w-24 sm:w-32'),
        offsetTouch
          ? inlineNextToDpad
            ? 'bottom-1.5 left-[8.25rem] lg:left-[10.25rem]'
            : 'bottom-[8.75rem] left-2'
          : 'bottom-2 left-2',
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'พับหน้าต่างแชท' : 'เปิดหน้าต่างแชท'}
        className="flex w-full cursor-pointer select-none items-center justify-between px-2 py-1 text-[10px] font-semibold text-foreground hover:bg-secondary/60"
      >
        <span className="flex items-center gap-1 truncate">
          <MessageSquare className="size-3 shrink-0 text-primary" aria-hidden />
          แชท ({visibleMessages.length})
        </span>
        <span className="shrink-0 text-muted-foreground" aria-hidden>
          {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="flex flex-wrap gap-1 border-t border-border bg-background/50 px-1.5 py-1" role="tablist" aria-label="ช่องแชท">
            {CHAT_CHANNEL_META.map((ch) => {
              const active = activeChannel === ch.id
              return (
                <button
                  key={ch.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    game.chatChannel = ch.id
                    notify()
                  }}
                  className={cn(
                    'px-1.5 py-0.5 text-[10px] font-semibold transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/70 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {ch.label}
                </button>
              )
            })}
          </div>
          <div
            ref={listRef}
            className="h-28 overflow-y-auto border-t border-border px-2 py-1 text-[11px] leading-snug"
            role="log"
            aria-live="polite"
            aria-label="ช่องแชท"
          >
            {visibleMessages.length === 0 ? (
              <p className="py-4 text-center text-[10px] text-muted-foreground">
                ยังไม่มีข้อความในช่อง{CHAT_CHANNEL_META.find((c) => c.id === activeChannel)?.label ?? 'นี้'}
              </p>
            ) : (
              visibleMessages.map((m) => (
                <p key={m.key} className={cn('break-words', TYPE_STYLE[m.type])}>
                  <span className="mr-1 text-[9px] text-muted-foreground">[{CHANNEL_TAG[m.channel]}]</span>
                  {TYPE_TAG[m.type] && <span className="mr-1 opacity-80">{TYPE_TAG[m.type]}</span>}
                  {m.author && (
                    <button
                      type="button"
                      onClick={() => {
                        game.inspectTarget = {
                          userId: m.senderUid || m.author!,
                          displayName: m.author!,
                          gameUid: m.senderGameUid,
                        }
                        notify()
                      }}
                      className="mr-1 font-semibold text-primary hover:underline"
                    >
                      {m.author}:
                    </button>
                  )}
                  {m.text}
                </p>
              ))
            )}
          </div>
          {muteRemainingSec > 0 && (
            <div className="flex items-center gap-1.5 border-t border-destructive/40 bg-destructive/15 px-2 py-1 text-[10px] font-semibold text-destructive">
              <VolumeX className="size-3 shrink-0" aria-hidden />
              <span className="truncate">
                ถูก GM ใบ้แชทอีก {Math.floor(muteRemainingSec / 60)}:{String(muteRemainingSec % 60).padStart(2, '0')} นาที
                {g.p?.muteReason ? ` (${g.p.muteReason})` : ''}
              </span>
            </div>
          )}
          <form className="flex border-t border-border" onSubmit={handleSubmit}>
            <label htmlFor="chat-input" className="sr-only">
              พิมพ์ข้อความแชท
            </label>
            <input
              id="chat-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => {
                game.keys.clear()
                game.attackHeld = false
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') (e.target as HTMLInputElement).blur()
                if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
              }}
              maxLength={140}
              autoComplete="off"
              placeholder={
                muteRemainingSec > 0
                  ? 'ถูกใบ้แชทชั่วคราว (ใช้ /help ได้)...'
                  : `พิมพ์ในช่อง${activeChannel === 'all' ? 'โลก' : (CHAT_CHANNEL_META.find((c) => c.id === activeChannel)?.label ?? '')}...`
              }
              className="min-w-0 flex-1 bg-transparent px-2 py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button type="submit" className="px-2.5 py-1 text-xs font-semibold text-primary hover:bg-secondary">
              ส่ง
            </button>
          </form>
        </>
      )}
    </div>
  )
}
