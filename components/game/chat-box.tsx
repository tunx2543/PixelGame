'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { ArrowDown, ChevronDown, ChevronUp, Smile, VolumeX } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { ChatEmojiPicker } from '@/components/game/chat-emoji-picker'
import { auth as firebaseAuth } from '@/lib/firebase/client'
import {
  sendWorldChatMessage,
  subscribeWorldChatMessages,
  type WorldChatMessageRecord,
} from '@/lib/firebase/mmo-online'
import { detectNewlyArrivedKeys, insertEmojiAtCursor } from '@/lib/game/chat-emojis'
import { buildVisibleChatMessages } from '@/lib/game/chat-realtime'
import { game, getActiveMuteRemainingSec, notify, submitChat, type ChatType } from '@/lib/game/engine'
import {
  CHAT_CHANNEL_META,
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

export function ChatBox({ offsetTouch = false }: { offsetTouch?: boolean }) {
  const g = useGame()
  const [text, setText] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [remoteMessages, setRemoteMessages] = useState<WorldChatMessageRecord[]>([])
  const [authUid, setAuthUid] = useState<string | null>(() => firebaseAuth.currentUser?.uid ?? null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [freshKeys, setFreshKeys] = useState<Record<string, true>>({})
  const [barPulse, setBarPulse] = useState(false)
  const [hasNewWhileScrolledUp, setHasNewWhileScrolledUp] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cursorPosRef = useRef<{ start: number; end: number } | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const prevLatestKeyRef = useRef<string>('')
  const hydratedRef = useRef(false)
  const seenKeysRef = useRef<Set<string>>(new Set())
  const prevChannelRef = useRef<ChatChannel>(g.chatChannel)
  const freshTimersRef = useRef<number[]>([])

  const [nowMs, setNowMs] = useState(() => Date.now())
  const activeChannel = g.chatChannel
  const selfUid = authUid ?? 'guest_player'
  const currentMapId = g.p?.mapId ?? 'town'
  const currentPartyId = g.party?.partyId ?? null
  const blockedUids = g.p?.blockedUids
  const mutedUntilMs = g.p?.mutedUntilMs ?? 0
  const muteRemainingSec = mutedUntilMs > nowMs && !g.p?.gm ? Math.ceil((mutedUntilMs - nowMs) / 1000) : 0

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(firebaseAuth, (user) => {
      setAuthUid(user?.uid ?? null)
    })
    return () => unsubAuth()
  }, [])

  useEffect(() => {
    if (mutedUntilMs <= Date.now() || g.p?.gm) return
    setNowMs(Date.now())
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [mutedUntilMs, g.p?.gm])

  useEffect(() => {
    const onOpenChat = () => {
      stickToBottomRef.current = true
      setIsOpen(true)
      setUnreadCount(0)
      setHasNewWhileScrolledUp(false)
    }
    window.addEventListener('pixelquest:open-chat', onOpenChat)
    return () => window.removeEventListener('pixelquest:open-chat', onOpenChat)
  }, [])

  useEffect(() => {
    const unsub = subscribeWorldChatMessages(setRemoteMessages)
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!emojiOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setEmojiOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [emojiOpen])

  useEffect(() => {
    return () => {
      freshTimersRef.current.forEach((id) => window.clearTimeout(id))
      freshTimersRef.current = []
    }
  }, [])

  const visibleMessages = useMemo(
    () =>
      buildVisibleChatMessages({
        localChat: g.chat,
        remoteMessages,
        activeChannel,
        currentMapId,
        currentPartyId,
        selfUid,
        blockedUids,
        limit: 60,
      }),
    // g.version ensures updates even when external panels mutate game.chat in place before notify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [g.version, g.chat, remoteMessages, activeChannel, currentMapId, currentPartyId, selfUid, blockedUids],
  )

  const lastKey = visibleMessages.at(-1)?.key ?? ''
  const latestMsg = visibleMessages.at(-1)
  const visibleKeysSignature = visibleMessages.map((m) => m.key).join('\n')

  useEffect(() => {
    const channelSwitched = prevChannelRef.current !== activeChannel
    prevChannelRef.current = activeChannel
    const visibleKeys = visibleKeysSignature ? visibleKeysSignature.split('\n') : []
    const newlyArrived = detectNewlyArrivedKeys({
      seenKeys: seenKeysRef.current,
      visibleKeys,
      isHydrated: hydratedRef.current,
      channelSwitched,
    })

    if (!hydratedRef.current) {
      hydratedRef.current = true
      prevLatestKeyRef.current = lastKey
      return
    }

    if (newlyArrived.length > 0) {
      setFreshKeys((prev) => {
        const next = { ...prev }
        for (const k of newlyArrived) next[k] = true
        return next
      })
      const fadeTimer = window.setTimeout(() => {
        setFreshKeys((prev) => {
          const next = { ...prev }
          for (const k of newlyArrived) delete next[k]
          return next
        })
      }, 1500)
      freshTimersRef.current.push(fadeTimer)

      if (isOpen && !stickToBottomRef.current) {
        setHasNewWhileScrolledUp(true)
      }
    }

    if (lastKey && lastKey !== prevLatestKeyRef.current) {
      prevLatestKeyRef.current = lastKey
      if (!isOpen) {
        setUnreadCount((c) => Math.min(99, c + 1))
        setBarPulse(true)
        const pulseTimer = window.setTimeout(() => setBarPulse(false), 900)
        freshTimersRef.current.push(pulseTimer)
      }
    }
  }, [visibleKeysSignature, lastKey, isOpen, activeChannel])

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
      setBarPulse(false)
      setHasNewWhileScrolledUp(false)
      stickToBottomRef.current = true
    } else {
      setEmojiOpen(false)
    }
  }, [isOpen, activeChannel])

  useEffect(() => {
    const el = listRef.current
    if (el && isOpen && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [lastKey, isOpen, activeChannel, visibleMessages.length])

  const syncCursorFromInput = () => {
    const input = inputRef.current
    if (!input) return
    if (typeof input.selectionStart === 'number' && typeof input.selectionEnd === 'number') {
      cursorPosRef.current = { start: input.selectionStart, end: input.selectionEnd }
    }
  }

  const handleInsertEmoji = (emoji: string) => {
    let nextCursorPos: number | null = null
    setText((prev) => {
      const input = inputRef.current
      const domStart = input && document.activeElement === input ? input.selectionStart : null
      const domEnd = input && document.activeElement === input ? input.selectionEnd : null
      const start = domStart ?? cursorPosRef.current?.start ?? prev.length
      const end = domEnd ?? cursorPosRef.current?.end ?? start
      const res = insertEmojiAtCursor(prev, emoji, start, end, 140)
      if (!res.inserted) return prev
      nextCursorPos = res.nextCursor
      cursorPosRef.current = { start: res.nextCursor, end: res.nextCursor }
      return res.text
    })
    window.requestAnimationFrame(() => {
      const target = inputRef.current
      if (!target) return
      target.focus()
      if (nextCursorPos !== null) {
        target.setSelectionRange(nextCursorPos, nextCursorPos)
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const raw = text.trim()
    if (!raw || !g.p) return
    const targetChannel: Exclude<ChatChannel, 'all'> =
      activeChannel === 'all' ? 'world' : activeChannel

    stickToBottomRef.current = true
    setHasNewWhileScrolledUp(false)
    setEmojiOpen(false)
    cursorPosRef.current = null
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
      ref={rootRef}
      data-testid="chat-box"
      onPointerDown={(event) => event.stopPropagation()}
      className={cn(
        'pointer-events-auto fixed left-1/2 flex -translate-x-1/2 flex-col overflow-hidden rounded border bg-[#080d15]/92 shadow-xl transition-colors duration-300',
        barPulse && !isOpen
          ? 'border-sky-400/95 ring-1 ring-sky-400/50'
          : 'border-[#2c4e7c]/85',
        isOpen
          ? 'z-40 w-[min(24rem,calc(100vw-1rem))]'
          : 'z-20 w-[min(16.5rem,44vw)] sm:w-[min(19rem,38vw)]',
        offsetTouch ? 'bottom-[8.5rem] sm:bottom-1.5' : 'bottom-1.5',
      )}
    >
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="chat-panel-body"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="flex flex-col"
          >
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
                      stickToBottomRef.current = true
                      setHasNewWhileScrolledUp(false)
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

            <div className="relative">
              <div
                ref={listRef}
                onScroll={() => {
                  const el = listRef.current
                  if (!el) return
                  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48
                  stickToBottomRef.current = nearBottom
                  if (nearBottom && hasNewWhileScrolledUp) {
                    setHasNewWhileScrolledUp(false)
                  }
                }}
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
                  visibleMessages.map((m) => {
                    const isFresh = Boolean(freshKeys[m.key])
                    return (
                      <motion.p
                        key={m.key}
                        initial={isFresh ? { opacity: 0, x: -8, y: 5 } : false}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        className={cn(
                          'break-words rounded px-1 -mx-1 transition-colors duration-700',
                          isFresh && 'bg-sky-400/20',
                          TYPE_STYLE[m.type],
                        )}
                      >
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
                      </motion.p>
                    )
                  })
                )}
              </div>

              <AnimatePresence>
                {hasNewWhileScrolledUp && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 6, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.92 }}
                    transition={{ duration: 0.16 }}
                    onClick={() => {
                      const el = listRef.current
                      if (el) {
                        el.scrollTop = el.scrollHeight
                      }
                      stickToBottomRef.current = true
                      setHasNewWhileScrolledUp(false)
                    }}
                    className="absolute right-2 bottom-1.5 flex cursor-pointer items-center gap-1 rounded border border-sky-400/60 bg-sky-600/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-md hover:bg-sky-500"
                  >
                    <span>ข้อความใหม่</span>
                    <ArrowDown className="size-3" aria-hidden />
                  </motion.button>
                )}
              </AnimatePresence>
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

            <ChatEmojiPicker
              open={emojiOpen}
              onSelect={handleInsertEmoji}
              onClose={() => setEmojiOpen(false)}
            />

            <form className="flex items-center border-t border-[#244168] bg-[#0b1320]" onSubmit={handleSubmit}>
              <label htmlFor="chat-input" className="sr-only">
                พิมพ์ข้อความแชท
              </label>
              <button
                type="button"
                data-testid="chat-emoji-toggle"
                onClick={() => setEmojiOpen((open) => !open)}
                aria-expanded={emojiOpen}
                aria-label={emojiOpen ? 'ปิดคลังอิโมจิ' : 'เปิดคลังอิโมจิ'}
                className={cn(
                  'grid h-7 w-8 shrink-0 cursor-pointer place-items-center border-r border-[#1f395c] transition-colors',
                  emojiOpen
                    ? 'bg-sky-600/30 text-sky-300'
                    : 'text-slate-300 hover:bg-white/5 hover:text-amber-300',
                )}
              >
                <Smile className="size-3.5" aria-hidden />
              </button>
              <input
                ref={inputRef}
                id="chat-input"
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  if (typeof e.target.selectionStart === 'number' && typeof e.target.selectionEnd === 'number') {
                    cursorPosRef.current = { start: e.target.selectionStart, end: e.target.selectionEnd }
                  }
                }}
                onSelect={syncCursorFromInput}
                onClick={syncCursorFromInput}
                onKeyUp={syncCursorFromInput}
                onFocus={() => {
                  game.keys.clear()
                  game.attackHeld = false
                  syncCursorFromInput()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    if (emojiOpen) {
                      setEmojiOpen(false)
                    } else {
                      ;(e.target as HTMLInputElement).blur()
                    }
                  }
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
              <button type="submit" className="h-7 cursor-pointer bg-sky-700/85 px-3 text-xs font-bold text-white transition-colors hover:bg-sky-600">
                ส่ง
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Bottom Asura Dark Bar with ▲ Toggle */}
      <button
        type="button"
        data-testid="chat-toggle"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'พับหน้าต่างแชท' : 'เปิดหน้าต่างแชท'}
        className="flex h-7 w-full cursor-pointer select-none items-center justify-between gap-2 px-2.5 text-[10.5px] text-slate-200 hover:bg-white/5"
      >
        <span className="min-w-0 flex-1 overflow-hidden text-left">
          <AnimatePresence mode="wait" initial={false}>
            {latestMsg ? (
              <motion.span
                key={lastKey}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={cn('block truncate', TYPE_STYLE[latestMsg.type])}
              >
                {latestMsg.author ? `${latestMsg.author}: ` : ''}
                {latestMsg.text}
              </motion.span>
            ) : (
              <motion.span
                key="empty-preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="block truncate text-slate-400"
              >
                คลิกหรือกด Enter เพื่อเปิดแชท...
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {!isOpen && unreadCount > 0 && (
            <motion.span
              key={`unread-${unreadCount}`}
              data-testid="chat-unread-badge"
              initial={{ scale: 0.55, opacity: 0.6 }}
              animate={{ scale: [1.22, 1], opacity: 1 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="rounded bg-sky-600 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white tabular-nums"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
          <span className="grid size-5 place-items-center rounded bg-white/10 text-white">
            {isOpen ? <ChevronDown className="size-3.5" aria-hidden /> : <ChevronUp className="size-3.5" aria-hidden />}
          </span>
        </span>
      </button>
    </div>
  )
}
