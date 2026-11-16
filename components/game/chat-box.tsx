'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import { game, submitChat, type ChatType } from '@/lib/game/engine'
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

export function ChatBox({ offsetTouch = false }: { offsetTouch?: boolean }) {
  const g = useGame()
  const [text, setText] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const lastId = g.chat.at(-1)?.id ?? 0

  useEffect(() => {
    const onOpenChat = () => setIsOpen(true)
    window.addEventListener('pixelquest:open-chat', onOpenChat)
    return () => window.removeEventListener('pixelquest:open-chat', onOpenChat)
  }, [])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lastId, isOpen])

  return (
    <div
      data-testid="chat-box"
      onPointerDown={(event) => event.stopPropagation()}
      className={cn(
        'pointer-events-auto pixel-panel absolute bottom-2 z-20 flex flex-col bg-card/90 shadow-lg transition-[width]',
        offsetTouch ? 'left-[8.25rem]' : 'left-2',
        isOpen ? 'w-[min(17.5rem,calc(100vw-1rem))]' : 'w-28 sm:w-36',
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
          แชท ({g.chat.length})
        </span>
        <span className="shrink-0 text-muted-foreground" aria-hidden>
          {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            ref={listRef}
            className="h-24 overflow-y-auto border-t border-border px-2 py-1 text-[11px] leading-snug"
            role="log"
            aria-live="polite"
            aria-label="ช่องแชท"
          >
            {g.chat.map((m) => (
              <p key={m.id} className={cn('break-words', TYPE_STYLE[m.type])}>
                {TYPE_TAG[m.type] && <span className="mr-1 opacity-80">{TYPE_TAG[m.type]}</span>}
                {m.author && <span className="mr-1 text-primary">{m.author}:</span>}
                {m.text}
              </p>
            ))}
          </div>
          <form
            className="flex border-t border-border"
            onSubmit={(e) => {
              e.preventDefault()
              submitChat(text)
              setText('')
              ;(document.activeElement as HTMLElement | null)?.blur()
            }}
          >
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
              placeholder="พิมพ์แชท... (Enter)"
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
