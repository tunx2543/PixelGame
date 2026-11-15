'use client'

import { useState } from 'react'
import { auth as firebaseAuth } from '@/lib/firebase/client'
import { formatGameUid } from '@/lib/game/permissions'
import { createTrade, sendFriendRequest, sendWhisper } from '@/lib/game/social'
import { game, notify, openPanel } from '@/lib/game/engine'

export function PlayerActionMenu() {
  const [copied, setCopied] = useState(false)
  if (!game.socialTargetId) return null

  const target = game.remotePlayers.find((player) => player.userId === game.socialTargetId)
  const fallback =
    !target && game.socialTargetMeta?.userId === game.socialTargetId ? game.socialTargetMeta : null
  if (!target && !fallback) return null

  const closeMenu = () => {
    game.socialTargetId = null
    game.socialTargetMeta = null
    notify()
  }

  const run = (task: Promise<{ message: string }>) => {
    void task
      .then((result) => {
        game.chat.push({ id: Date.now(), type: 'system', text: result.message })
        closeMenu()
      })
      .catch(() => {
        game.chat.push({ id: Date.now(), type: 'error', text: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' })
        closeMenu()
      })
  }

  if (!target && fallback) {
    const copyUid = async () => {
      if (!fallback.gameUid) return
      try {
        await navigator.clipboard.writeText(fallback.gameUid)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      } catch {
        // Ignore clipboard failures.
      }
    }

    return (
      <div
        className="pointer-events-auto absolute left-1/2 top-1/2 z-40 w-60 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-primary/50 bg-background/95 p-3 shadow-2xl"
        role="dialog"
        aria-label={`ข้อมูลเพื่อน ${fallback.displayName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-foreground">{fallback.displayName}</p>
            {fallback.gameUid && (
              <p className="font-mono text-[10px] text-primary">UID {fallback.gameUid}</p>
            )}
          </div>
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-secondary"
            aria-label="ปิดเมนู"
            onClick={closeMenu}
          >
            ×
          </button>
        </div>
        <p className="mb-2.5 text-[11px] text-muted-foreground">
          กระซิบและแลกเปลี่ยนแบบเรียลไทม์ใช้งานได้เมื่อผู้เล่นออนไลน์อยู่ในห้องเดียวกัน
        </p>
        <div className="flex gap-1.5">
          {fallback.gameUid && (
            <button
              type="button"
              className="pixel-button secondary flex-1 px-2 py-1.5 text-[10px]"
              onClick={() => void copyUid()}
            >
              {copied ? 'คัดลอก UID แล้ว' : 'คัดลอก UID'}
            </button>
          )}
          <button
            type="button"
            className="pixel-button secondary flex-1 px-2 py-1.5 text-[10px]"
            onClick={closeMenu}
          >
            ปิด
          </button>
        </div>
      </div>
    )
  }

  if (!target) return null
  const targetGameUid = target.gameUid ?? formatGameUid(target.uid)
  const friendTargetArg = firebaseAuth.currentUser ? targetGameUid : target.userId

  return (
    <div
      className="pointer-events-auto absolute left-1/2 top-1/2 z-40 w-52 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-primary/50 bg-background/95 p-2 shadow-2xl"
      role="dialog"
      aria-label={`เมนูผู้เล่น ${target.displayName}`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-foreground">{target.displayName}</p>
          <p className="text-[10px] text-primary">UID {targetGameUid} • Lv.{target.level}</p>
        </div>
        <button
          type="button"
          className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-secondary"
          aria-label="ปิดเมนู"
          onClick={closeMenu}
        >
          ×
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          className="pixel-button secondary px-1 py-2 text-[10px]"
          onClick={() => run(sendFriendRequest(friendTargetArg))}
        >
          เพิ่มเพื่อน
        </button>
        <button
          type="button"
          className="pixel-button secondary px-1 py-2 text-[10px]"
          onClick={() =>
            void createTrade(target.userId)
              .then((result) => {
                if (result.ok && result.tradeId) {
                  game.tradeTargetId = target.userId
                  game.tradeId = result.tradeId
                  game.socialTargetId = null
                  game.socialTargetMeta = null
                  openPanel('trade')
                } else {
                  game.chat.push({ id: Date.now(), type: 'error', text: result.message })
                  notify()
                }
              })
              .catch(() => {
                game.chat.push({ id: Date.now(), type: 'error', text: 'ส่งคำขอแลกเปลี่ยนไม่สำเร็จ' })
                notify()
              })
          }
        >
          แลกเปลี่ยน
        </button>
        <button
          type="button"
          className="pixel-button secondary px-1 py-2 text-[10px]"
          onClick={() => run(sendWhisper(target.userId, 'สวัสดี'))}
        >
          กระซิบ
        </button>
      </div>
    </div>
  )
}

