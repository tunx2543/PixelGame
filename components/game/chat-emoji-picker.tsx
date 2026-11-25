'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { CHAT_EMOJI_CATEGORIES, type EmojiCategory } from '@/lib/game/chat-emojis'
import { cn } from '@/lib/utils'

interface ChatEmojiPickerProps {
  open: boolean
  onSelect: (emoji: string) => void
  onClose: () => void
  className?: string
}

export function ChatEmojiPicker({ open, onSelect, onClose, className }: ChatEmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<EmojiCategory['id']>('mood')
  const currentCategory =
    CHAT_EMOJI_CATEGORIES.find((cat) => cat.id === activeCategory) ?? CHAT_EMOJI_CATEGORIES[0]

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="chat-emoji-drawer"
          data-testid="chat-emoji-picker"
          role="region"
          aria-label="คลังอิโมจิ"
          initial={{ opacity: 0, height: 0, y: 6 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: 4 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={cn(
            'overflow-hidden border-t border-[#244168] bg-[#0a1322]/98',
            className,
          )}
        >
          <div className="flex items-center justify-between gap-1 border-b border-[#1d3557] px-2 py-1">
            <div className="flex items-center gap-1" role="tablist" aria-label="หมวดหมู่อิโมจิ">
              {CHAT_EMOJI_CATEGORIES.map((cat) => {
                const selected = cat.id === currentCategory.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      'cursor-pointer rounded px-2 py-0.5 text-[10px] font-bold transition-colors',
                      selected
                        ? 'bg-sky-600 text-white'
                        : 'bg-[#132238] text-slate-300 hover:bg-[#1a2f4d] hover:text-white',
                    )}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดคลังอิโมจิ"
              className="grid size-5 cursor-pointer place-items-center rounded text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-3" aria-hidden />
            </button>
          </div>

          <div className="grid grid-cols-8 gap-1 p-1.5">
            {currentCategory.emojis.map((emoji) => (
              <motion.button
                key={`${currentCategory.id}_${emoji}`}
                type="button"
                whileHover={{ scale: 1.18 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onSelect(emoji)}
                aria-label={`ใส่อิโมจิ ${emoji}`}
                className="grid h-7 cursor-pointer place-items-center rounded bg-[#111d30]/75 text-base leading-none transition-colors hover:bg-[#1d3354]"
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
