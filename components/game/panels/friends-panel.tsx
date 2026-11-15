'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { Check, Copy, Crown, LogIn, Search, Trash2, UserPlus, UserRound, X } from 'lucide-react'
import { auth, formatFirebaseAuthError, signInWithGoogle } from '@/lib/firebase/client'
import {
  ensureUserProfile,
  getCachedAccountIdentity,
  subscribeAccountIdentity,
  type UserAccountIdentity,
} from '@/lib/firebase/characters'
import {
  lookupPlayerByGameUid,
  removeFriendshipOrRequest,
  respondToFriendRequest,
  sendFriendRequestByGameUid,
  subscribeFriendSocialState,
  type FriendSocialSnapshot,
  type PlayerUidProfile,
} from '@/lib/firebase/friends'
import { JOBS } from '@/lib/game/data'
import { closePanel, game as gameState, notify, saveGame, setGameAccountIdentity } from '@/lib/game/engine'
import { isGmAccountUser, PERMANENT_GM_GAME_UID, PERMANENT_GM_UID } from '@/lib/game/permissions'

export function FriendsPanel({ game }: { game: typeof gameState }) {
  const [user, setUser] = useState<User | null>(() => auth.currentUser)
  const [identity, setIdentity] = useState<UserAccountIdentity | null>(() => getCachedAccountIdentity())
  const [social, setSocial] = useState<FriendSocialSnapshot>({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
  })
  const [uidInput, setUidInput] = useState('')
  const [preview, setPreview] = useState<PlayerUidProfile | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [copiedUid, setCopiedUid] = useState<string | null>(null)

  useEffect(() => {
    const unsubIdentity = subscribeAccountIdentity((next) => setIdentity(next))
    const unsubAuth = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      if (nextUser) {
        void ensureUserProfile(nextUser)
          .then((resolved) => setIdentity(resolved))
          .catch(() => undefined)
      } else {
        setIdentity(null)
        setSocial({ friends: [], incomingRequests: [], outgoingRequests: [] })
      }
    })
    return () => {
      unsubIdentity()
      unsubAuth()
    }
  }, [])

  useEffect(() => {
    if (!user || !user.emailVerified) {
      setSocial({ friends: [], incomingRequests: [], outgoingRequests: [] })
      return
    }
    const unsub = subscribeFriendSocialState(user.uid, (next) => {
      setSocial(next)
    })
    return () => unsub()
  }, [user])

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedUid(value)
      window.setTimeout(() => setCopiedUid(null), 1600)
    } catch {
      // Ignore clipboard failures.
    }
  }

  const handleLookup = async () => {
    if (!uidInput.trim()) {
      setPreview(null)
      setFeedback({ type: 'error', text: 'กรุณาใส่ UID ที่ต้องการค้นหา เช่น 0000' })
      return
    }
    setBusy(true)
    setFeedback(null)
    try {
      const found = await lookupPlayerByGameUid(uidInput)
      setPreview(found)
      if (!found) {
        setFeedback({ type: 'error', text: `ไม่พบผู้เล่นที่มี UID ${uidInput.trim()}` })
      }
    } catch {
      setFeedback({ type: 'error', text: 'ค้นหา UID ไม่สำเร็จ กรุณาลองใหม่' })
    } finally {
      setBusy(false)
    }
  }

  const handleAddFriend = async (targetUid?: string) => {
    const queryUid = (targetUid ?? uidInput).trim()
    if (!queryUid) {
      setFeedback({ type: 'error', text: 'กรุณาใส่ UID เช่น 0000 หรือ 0123' })
      return
    }
    setBusy(true)
    setFeedback(null)
    try {
      const result = await sendFriendRequestByGameUid(queryUid, game.p?.name)
      setFeedback({ type: result.ok ? 'ok' : 'error', text: result.message })
      if (result.ok) {
        setUidInput('')
        setPreview(null)
      }
    } catch {
      setFeedback({ type: 'error', text: 'ส่งคำขอเพื่อนไม่สำเร็จ กรุณาลองใหม่' })
    } finally {
      setBusy(false)
    }
  }

  const handleRespond = async (fromUid: string, decision: 'accepted' | 'declined') => {
    setBusy(true)
    try {
      const result = await respondToFriendRequest(fromUid, decision)
      setFeedback({ type: result.ok ? 'ok' : 'error', text: result.message })
    } catch {
      setFeedback({ type: 'error', text: 'ดำเนินการไม่สำเร็จ' })
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (requestId: string) => {
    setBusy(true)
    try {
      const result = await removeFriendshipOrRequest(requestId)
      setFeedback({ type: result.ok ? 'ok' : 'error', text: result.message })
    } catch {
      setFeedback({ type: 'error', text: 'ลบรายการไม่สำเร็จ' })
    } finally {
      setBusy(false)
    }
  }

  const handleSignInFromFriends = async () => {
    setBusy(true)
    setFeedback(null)
    try {
      const cred = await signInWithGoogle()
      if (cred.user) {
        const resolved = await ensureUserProfile(cred.user)
        setIdentity(resolved)
        const numericUid = resolved.isGm ? PERMANENT_GM_UID : Number(resolved.gameUid)
        setGameAccountIdentity(cred.user.uid, numericUid, resolved.gameUid, resolved.isGm)
        if (game.p) {
          game.p.gameUid = resolved.gameUid
          game.p.uid = numericUid
          game.p.gm = resolved.isGm
          saveGame()
          notify()
        }
        setFeedback({ type: 'ok', text: `เข้าสู่ระบบสำเร็จ! UID ของคุณคือ ${resolved.gameUid}` })
      }
    } catch (error) {
      setFeedback({ type: 'error', text: formatFirebaseAuthError(error) })
    } finally {
      setBusy(false)
    }
  }

  const isGm = identity?.isGm ?? isGmAccountUser(user)
  const myGameUid = identity?.gameUid ?? game.p?.gameUid ?? (isGm ? PERMANENT_GM_GAME_UID : '----')

  return (
    <section className="game-panel friends-panel space-y-3 p-2 text-xs" aria-label="Friends">
      {!user ? (
        <div className="space-y-2.5 rounded-lg border border-border bg-secondary/40 p-3 text-center">
          <p className="font-semibold text-primary">ระบบแอดเพื่อนด้วย UID</p>
          <p className="text-[11px] text-muted-foreground">
            กรุณาเข้าสู่ระบบด้วย Google เพื่อรับ UID ประจำตัวและเพิ่มเพื่อน
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSignInFromFriends()}
            className="pixel-btn mx-auto inline-flex items-center gap-1.5 bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
          >
            <LogIn className="size-3.5" aria-hidden />
            {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ Google'}
          </button>
          {feedback && (
            <p className={`text-[11px] ${feedback.type === 'ok' ? 'text-accent' : 'text-destructive'}`}>
              {feedback.text}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-2">
            <div className="min-w-0">
              <span className="block text-[10px] text-muted-foreground">UID ของคุณ (ให้เพื่อนใช้แอด)</span>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className={`font-mono text-sm font-bold tracking-wider ${isGm ? 'text-amber-300' : 'text-primary'}`}>
                  {myGameUid}
                </span>
                {isGm && (
                  <span className="inline-flex items-center gap-0.5 border border-amber-400/60 bg-amber-400/20 px-1 py-0.5 text-[9px] font-bold text-amber-300">
                    <Crown className="size-2.5" aria-hidden />
                    GM · DEV
                  </span>
                )}
              </div>
            </div>
            {myGameUid !== '----' && (
              <button
                type="button"
                onClick={() => void copyText(myGameUid)}
                className="flex shrink-0 items-center gap-1 rounded border border-border bg-background/80 px-2 py-1 text-[10px] text-foreground hover:border-primary"
              >
                {copiedUid === myGameUid ? <Check className="size-3 text-accent" aria-hidden /> : <Copy className="size-3" aria-hidden />}
                {copiedUid === myGameUid ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </button>
            )}
          </div>

          <form
            className="space-y-2 rounded-lg border border-border bg-secondary/30 p-2.5"
            onSubmit={(e) => {
              e.preventDefault()
              void handleAddFriend()
            }}
          >
            <label htmlFor="friend-uid-input" className="block text-[10px] font-semibold text-foreground">
              เพิ่มเพื่อนด้วย UID
            </label>
            <div className="flex gap-1.5">
              <input
                id="friend-uid-input"
                value={uidInput}
                onChange={(e) => {
                  setUidInput(e.target.value)
                  if (preview) setPreview(null)
                }}
                onFocus={() => {
                  game.keys.clear()
                  game.attackHeld = false
                }}
                placeholder="ใส่ UID เช่น 0000"
                maxLength={10}
                className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleLookup()}
                aria-label="ค้นหา UID"
                className="flex shrink-0 items-center gap-1 rounded border border-border bg-secondary px-2 py-1.5 text-[11px] text-foreground hover:border-primary disabled:opacity-50"
              >
                <Search className="size-3.5" aria-hidden />
              </button>
              <button
                type="submit"
                disabled={busy}
                className="pixel-btn flex shrink-0 items-center gap-1 bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
              >
                <UserPlus className="size-3.5" aria-hidden />
                แอด
              </button>
            </div>

            {preview && (
              <div className="flex items-center justify-between gap-2 rounded border border-accent/40 bg-accent/10 p-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-xs font-semibold text-foreground">
                    {preview.isGm && <span className="text-amber-300">[GM]</span>}
                    <span className="truncate">{preview.characterName}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    UID {preview.gameUid} • Lv.{preview.level} {JOBS[preview.jobId]?.name ?? 'ผู้ฝึกหัด'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleAddFriend(preview.gameUid)}
                  className="pixel-btn shrink-0 bg-accent px-2 py-1 text-[10px] font-semibold text-accent-foreground"
                >
                  ส่งคำขอ
                </button>
              </div>
            )}

            {feedback && (
              <p className={`text-[11px] ${feedback.type === 'ok' ? 'text-accent' : 'text-destructive'}`}>
                {feedback.text}
              </p>
            )}
          </form>

          {social.incomingRequests.length > 0 && (
            <div className="space-y-1.5 rounded-lg border border-amber-400/40 bg-amber-400/5 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-300">
                  คำขอเป็นเพื่อน ({social.incomingRequests.length})
                </span>
              </div>
              {social.incomingRequests.map((req) => (
                <div
                  key={req.requestId}
                  className="flex items-center justify-between gap-2 rounded border border-border bg-background/70 px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-foreground">
                      {req.fromIsGm && <span className="mr-1 text-amber-300">[GM]</span>}
                      {req.fromName}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">UID {req.fromGameUid}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleRespond(req.fromUid, 'accepted')}
                      className="pixel-btn bg-accent px-2 py-1 text-[10px] font-semibold text-accent-foreground"
                    >
                      รับ
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleRespond(req.fromUid, 'declined')}
                      className="pixel-btn bg-secondary px-2 py-1 text-[10px] text-foreground"
                    >
                      ปฏิเสธ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-border bg-secondary/30 p-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground">
                รายชื่อเพื่อน ({social.friends.length})
              </span>
              <span className="text-[10px] text-primary">คำขอรอ {social.incomingRequests.length}</span>
            </div>
            <div className="mt-2 space-y-1.5">
              {social.friends.map((friend) => (
                <div
                  key={friend.requestId}
                  className="flex items-center justify-between gap-2 rounded border border-border bg-background/70 px-2 py-1.5"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => {
                      game.socialTargetId = friend.userId
                      notify()
                    }}
                  >
                    <span className={`grid size-7 shrink-0 place-items-center rounded-full ${friend.isGm ? 'bg-amber-400/20 text-amber-300' : 'bg-primary/20 text-primary'}`}>
                      {friend.isGm ? <Crown className="size-3.5" aria-hidden /> : <UserRound className="size-3.5" aria-hidden />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-semibold text-foreground">
                        {friend.isGm && <span className="mr-1 text-amber-300">[GM]</span>}
                        {friend.name}
                      </span>
                      <span className="block font-mono text-[10px] text-muted-foreground">
                        UID {friend.gameUid}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void copyText(friend.gameUid)}
                      aria-label={`คัดลอก UID ${friend.gameUid}`}
                      className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      {copiedUid === friend.gameUid ? <Check className="size-3 text-accent" aria-hidden /> : <Copy className="size-3" aria-hidden />}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleRemove(friend.requestId)}
                      aria-label={`ลบเพื่อน ${friend.name}`}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                    >
                      <Trash2 className="size-3" aria-hidden />
                    </button>
                  </div>
                </div>
              ))}
              {!social.friends.length && (
                <p className="py-1 text-[11px] text-muted-foreground">
                  ยังไม่มีเพื่อน — ใส่ UID ด้านบนเพื่อส่งคำขอเพิ่มเพื่อนได้เลย
                </p>
              )}
            </div>
          </div>

          {social.outgoingRequests.length > 0 && (
            <div className="space-y-1 rounded-lg border border-border bg-secondary/20 p-2">
              <span className="text-[10px] text-muted-foreground">
                คำขอที่ส่งออก ({social.outgoingRequests.length})
              </span>
              {social.outgoingRequests.map((req) => (
                <div
                  key={req.requestId}
                  className="flex items-center justify-between gap-2 rounded border border-border/60 bg-background/50 px-2 py-1"
                >
                  <span className="truncate text-[10px] text-foreground">
                    {req.toIsGm && <span className="mr-1 text-amber-300">[GM]</span>}
                    {req.toName} <span className="font-mono text-muted-foreground">(UID {req.toGameUid})</span>
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRemove(req.requestId)}
                    aria-label="ยกเลิกคำขอ"
                    className="flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3" aria-hidden />
                    ยกเลิก
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {game.panel === 'friends' && (
        <button type="button" className="pixel-button secondary w-full py-1.5" onClick={closePanel}>
          ปิด
        </button>
      )}
    </section>
  )
}
