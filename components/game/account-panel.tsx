'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { Check, CheckCircle2, Copy, Crown, LogIn, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { auth, formatFirebaseAuthError, signInWithGoogle, signOutFirebase } from '@/lib/firebase/client'
import {
  ensureUserProfile,
  getCachedAccountIdentity,
  subscribeAccountIdentity,
  type UserAccountIdentity,
} from '@/lib/firebase/characters'
import { isGmAccountUser, PERMANENT_GM_GAME_UID } from '@/lib/game/permissions'

export function AccountPanel({
  compact = false,
  onAuthSuccess,
}: {
  compact?: boolean
  onAuthSuccess?: (user: User, identity: UserAccountIdentity) => void
}) {
  const [user, setUser] = useState<User | null>(() => auth.currentUser)
  const [authReady, setAuthReady] = useState<boolean>(() => Boolean(auth.currentUser))
  const [identity, setIdentity] = useState<UserAccountIdentity | null>(() => getCachedAccountIdentity())
  const [message, setMessage] = useState('')
  const [syncFailed, setSyncFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const onAuthSuccessRef = useRef(onAuthSuccess)
  onAuthSuccessRef.current = onAuthSuccess

  const syncProfile = useCallback(
    async (targetUser: User, notifySuccess = false) => {
      setSyncFailed(false)
      try {
        const resolved = await ensureUserProfile(targetUser)
        setIdentity(resolved)
        setMessage('')
        if (notifySuccess) {
          onAuthSuccessRef.current?.(targetUser, resolved)
        }
        return resolved
      } catch (error) {
        console.error('Failed to sync user profile:', error)
        setSyncFailed(true)
        setMessage('เข้าสู่ระบบแล้ว แต่ซิงค์โปรไฟล์กับคลาวด์ไม่สำเร็จ กรุณากดซิงค์อีกครั้ง')
        return null
      }
    },
    [],
  )

  useEffect(() => {
    const unsubIdentity = subscribeAccountIdentity((next) => {
      setIdentity(next)
    })
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setAuthReady(true)
      if (nextUser) {
        setMessage('')
        void syncProfile(nextUser)
      } else {
        setIdentity(null)
        setSyncFailed(false)
      }
    })
    return () => {
      unsubIdentity()
      unsubscribe()
    }
  }, [syncProfile])

  const handleGoogleSignIn = async () => {
    setBusy(true)
    setMessage('')
    setSyncFailed(false)
    try {
      const cred = await signInWithGoogle()
      if (cred.user) {
        await syncProfile(cred.user, true)
      }
    } catch (error) {
      setMessage(formatFirebaseAuthError(error))
    } finally {
      setBusy(false)
    }
  }

  const handleSignOut = async () => {
    setBusy(true)
    setMessage('')
    try {
      await signOutFirebase()
    } catch {
      setMessage('ออกจากระบบไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setBusy(false)
    }
  }

  const copyUid = async (uidText: string) => {
    try {
      await navigator.clipboard.writeText(uidText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Ignore clipboard permission errors.
    }
  }

  if (compact) {
    if (!authReady) {
      return (
        <span className="inline-flex min-h-10 items-center border border-border bg-secondary/70 px-3 py-1.5 text-[11px] text-muted-foreground">
          กำลังตรวจบัญชี...
        </span>
      )
    }

    if (user) {
      const isGm = identity?.isGm ?? isGmAccountUser(user)
      const displayGameUid = identity?.gameUid ?? (isGm ? PERMANENT_GM_GAME_UID : '----')
      return (
        <div className="flex items-center gap-1.5">
          <div className="hidden items-center gap-1.5 border border-border bg-card/90 px-2.5 py-1.5 text-[11px] sm:flex">
            {isGm ? <Crown className="size-3.5 text-amber-300" aria-hidden /> : <ShieldCheck className="size-3.5 text-accent" aria-hidden />}
            <span className="max-w-28 truncate font-medium text-foreground">{user.displayName || 'นักผจญภัย'}</span>
            <span className={`font-mono text-[10px] font-bold ${isGm ? 'text-amber-300' : 'text-accent'}`}>
              #{displayGameUid}
            </span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSignOut()}
            title="ออกจากระบบ Google"
            className="pixel-btn flex min-h-10 items-center gap-1 bg-secondary px-2.5 py-2 text-xs text-foreground hover:brightness-110 disabled:opacity-50"
          >
            <LogOut className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">ออกระบบ</span>
          </button>
        </div>
      )
    }

    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleGoogleSignIn()}
        title={message || 'เข้าสู่ระบบด้วย Google เพื่อซิงค์เซฟข้ามอุปกรณ์'}
        className="pixel-btn flex min-h-10 items-center gap-1.5 whitespace-nowrap bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
      >
        <LogIn className="size-3.5" aria-hidden />
        {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ Google'}
      </button>
    )
  }

  if (!authReady) {
    return (
      <div className="pixel-panel w-full bg-card/90 p-3">
        <p role="status" className="text-center text-xs text-muted-foreground">
          กำลังตรวจสอบสถานะการเข้าสู่ระบบ...
        </p>
      </div>
    )
  }

  if (user) {
    const isGm = identity?.isGm ?? isGmAccountUser(user)
    const displayGameUid = identity?.gameUid ?? (isGm ? PERMANENT_GM_GAME_UID : '----')

    return (
      <div
        className={`pixel-panel w-full bg-card/95 p-3 text-xs ${isGm ? 'border-amber-400/70' : 'border-primary/50'}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={`grid size-8 shrink-0 place-items-center border-2 border-[#0e0f1a] ${isGm ? 'bg-amber-400/20 text-amber-300' : 'bg-primary/15 text-primary'}`}
            >
              {isGm ? <Crown className="size-4" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate font-semibold text-foreground">
                <span className="truncate">{user.displayName || 'นักผจญภัย'}</span>
                <CheckCircle2 className="size-3.5 shrink-0 text-accent" aria-hidden />
                {isGm && (
                  <span className="shrink-0 border border-amber-400/60 bg-amber-400/20 px-1 py-0.5 text-[9px] font-bold text-amber-300">
                    GM · DEV
                  </span>
                )}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSignOut()}
            className="pixel-btn flex shrink-0 items-center gap-1 bg-secondary px-2.5 py-1.5 text-[11px] text-foreground hover:brightness-110 disabled:opacity-50"
          >
            <LogOut className="size-3.5" aria-hidden />
            ออกจากระบบ
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-muted-foreground">UID แอดเพื่อน:</span>
            <span className={`font-mono font-bold tracking-wider ${isGm ? 'text-amber-300' : 'text-accent'}`}>
              {displayGameUid}
            </span>
          </div>
          {syncFailed ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void syncProfile(user, true)}
              className="flex items-center gap-1 border border-primary/60 bg-primary/15 px-2 py-0.5 text-[10px] text-primary hover:brightness-110 disabled:opacity-50"
            >
              <RefreshCw className="size-3" aria-hidden />
              ซิงค์อีกครั้ง
            </button>
          ) : (
            displayGameUid !== '----' && (
              <button
                type="button"
                onClick={() => void copyUid(displayGameUid)}
                className="flex items-center gap-1 border border-border bg-secondary/70 px-2 py-0.5 text-[10px] text-foreground hover:border-primary"
              >
                {copied ? <Check className="size-3 text-accent" aria-hidden /> : <Copy className="size-3" aria-hidden />}
                {copied ? 'คัดลอกแล้ว' : 'คัดลอก UID'}
              </button>
            )
          )}
        </div>

        {message && <p className="mt-2 text-[11px] text-destructive">{message}</p>}
      </div>
    )
  }

  return (
    <div className="pixel-panel w-full bg-card/90 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary">ระบบบัญชีและคลาวด์เซฟ</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            ล็อคอินด้วย Google เพื่อรับ UID แอดเพื่อนและบันทึกตัวละครข้ามอุปกรณ์
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleGoogleSignIn()}
          className="pixel-btn flex shrink-0 items-center gap-1.5 bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
        >
          <LogIn className="size-3.5" aria-hidden />
          {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ Google'}
        </button>
      </div>
      {message && <p className="mt-2 text-[11px] text-destructive">{message}</p>}
    </div>
  )
}
