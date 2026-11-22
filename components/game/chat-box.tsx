'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, VolumeX } from 'lucide-react'
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
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'

const TYPE_STYLE: Record<ChatType, string> = {
  system: 'text-amber-300',
  player: 'text-slate-100',
  gm: 'text-yellow-300',
  loot: 'text-emerald-300',
  error: 'text-rose-400',
  npc: 'text-orange-200',
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

    return filterBlockedMessages([...localItems, ...remoteItems], blockedUids)
      .filter((msg) => activeChannel === 'all' || msg.channel === activeChannel)
      .sort((a, b) => a.orderMs - b.orderMs)
      .slice(-60)
  }, [g.chat, remoteMessages, activeChannel, currentMapId, currentPartyId, selfUid, blockedUids])

  const lastKey = visibleMessages.at(-1)?.key ?? ''
  const latestMsg = visibleMessages.at(-1)

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
        'pointer-events-auto fixed left-1/2 flex -translate-x-1/2 flex-col overflow-hidden rounded border border-[#2c4e7c]/85 bg-[#080d15]/92 shadow-xl transition-all',
        isOpen
          ? 'z-40 w-[min(24rem,calc(100vw-1rem))]'
          : 'z-20 w-[min(17.5rem,44vw)] sm:w-[21rem]',
        offsetTouch ? 'bottom-[5.25rem] sm:bottom-2' : 'bottom-1.5',
      )}
    >
      {isOpen && (
        <>
          <div className="flex flex-wrap gap-1 border-b border-[#244168] bg-[#0d1626]/95 px-2 py-1" role="tablist" aria-label="ช่องแชท">
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
                    'rounded px-2 py-0.5 text-[10px] font-bold transition-colors',
                    active ? 'bg-sky-600 text-white' : 'bg-[#15243b] text-slate-300 hover:text-white',
                  )}
                >
                  {ch.label}
                </button>
              )
            })}
          </div>

          <div
            ref={listRef}
            className="h-32 overflow-y-auto px-2.5 py-1.5 text-[11px] leading-snug"
            role="log"
            aria-live="polite"
            aria-label="ช่องแชท"
          >
            {visibleMessages.length === 0 ? (
              <p className="py-5 text-center text-[10px] text-slate-400">
                ยังไม่มีข้อความในช่อง{CHAT_CHANNEL_META.find((c) => c.id === activeChannel)?.label ?? 'นี้'}
              </p>
            ) : (
              visibleMessages.map((m) => (
                <p key={m.key} className={cn('break-words', TYPE_STYLE[m.type])}>
                  <span className="mr-1 text-[9px] text-slate-400">[{CHANNEL_TAG[m.channel]}]</span>
                  {TYPE_TAG[m.type] && <span className="mr-1 opacity-85">{TYPE_TAG[m.type]}</span>}
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
                      className="mr-1 font-bold text-amber-300 hover:underline"
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

          <form className="flex border-t border-[#244168] bg-[#0b1320]" onSubmit={handleSubmit}>
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
              className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-slate-400"
            />
            <button type="submit" className="bg-sky-700/80 px-3 py-1 text-xs font-bold text-white hover:bg-sky-600">
              ส่ง
            </button>
          </form>
        </>
      )}

      {/* Compact Bottom Asura Dark Bar with ▲ Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'พับหน้าต่างแชท' : 'เปิดหน้าต่างแชท'}
        className="flex h-7 w-full cursor-pointer select-none items-center justify-between gap-2 px-2.5 text-[10.5px] text-slate-200 hover:bg-white/5"
      >
        <span className="min-w-0 truncate text-left">
          {latestMsg ? (
            <span className={TYPE_STYLE[latestMsg.type]}>
              {latestMsg.author ? `${latestMsg.author}: ` : ''}
              {latestMsg.text}
            </span>
          ) : (
            <span className="text-slate-400">คลิกหรือกด Enter เพื่อเปิดแชท...</span>
          )}
        </span>
        <span className="grid size-5 shrink-0 place-items-center rounded bg-white/10 text-white">
          {isOpen ? <ChevronDown className="size-3.5" aria-hidden /> : <ChevronUp className="size-3.5" aria-hidden />}
        </span>
      </button>
    </div>
  )
}
