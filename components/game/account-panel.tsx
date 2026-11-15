'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { Check, CheckCircle2, Copy, Crown, LogIn, LogOut, ShieldCheck } from 'lucide-react'
import { auth, signInWithGoogle, signOutFirebase } from '@/lib/firebase/client'
import {
  ensureUserProfile,
  getCachedAccountIdentity,
  subscribeAccountIdentity,
  type UserAccountIdentity,
} from '@/lib/firebase/characters'
import { isGmAccountUser, PERMANENT_GM_GAME_UID } from '@/lib/game/permissions'

export function AccountPanel() {
  const [user, setUser] = useState<User | null>(() => auth.currentUser)
  const [identity, setIdentity] = useState<UserAccountIdentity | null>(() => getCachedAccountIdentity())
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const unsubIdentity = subscribeAccountIdentity((next) => {
      setIdentity(next)
    })
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      if (nextUser) {
        setMessage('')
        void ensureUserProfile(nextUser)
          .then((resolved) => {
            setIdentity(resolved)
          })
          .catch((error) => {
            console.error('Failed to sync user profile:', error)
          })
      } else {
        setIdentity(null)
      }
    })
    return () => {
      unsubIdentity()
      unsubscribe()
    }
  }, [])

  const handleGoogleSignIn = async () => {
    setBusy(true)
    setMessage('')
    try {
      const cred = await signInWithGoogle()
      if (cred.user) {
        try {
          const resolved = await ensureUserProfile(cred.user)
          setIdentity(resolved)
        } catch (profileError) {
          console.error('Profile sync error after sign-in:', profileError)
          setMessage('เข้าสู่ระบบสำเร็จ แต่ซิงค์โปรไฟล์กับ Firestore ไม่สำเร็จ กรุณาลองรีเฟรชหน้า')
        }
      }
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
      if (code === 'auth/popup-closed-by-user') {
        setMessage('ยกเลิกการเข้าสู่ระบบ')
      } else if (code === 'auth/cancelled-popup-request') {
        setMessage('มีหน้าต่างเข้าสู่ระบบเปิดอยู่แล้ว กรุณารอสักครู่แล้วลองใหม่')
      } else if (code === 'auth/popup-blocked') {
        setMessage('เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ กรุณาอนุญาต Pop-up แล้วลองใหม่')
      } else if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : ''
        setMessage(`โดเมน ${host} ยังไม่ได้รับอนุญาตใน Firebase Auth Authorized Domains`)
      } else if (code === 'auth/operation-not-allowed') {
        setMessage('ยังไม่ได้เปิดใช้งาน Google Sign-In ใน Firebase Authentication')
      } else if (code === 'auth/network-request-failed') {
        setMessage('เชื่อมต่อเครือข่ายไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่')
      } else {
        setMessage(code ? `เข้าสู่ระบบไม่สำเร็จ (${code})` : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      }
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
          {displayGameUid !== '----' && (
            <button
              type="button"
              onClick={() => void copyUid(displayGameUid)}
              className="flex items-center gap-1 border border-border bg-secondary/70 px-2 py-0.5 text-[10px] text-foreground hover:border-primary"
            >
              {copied ? <Check className="size-3 text-accent" aria-hidden /> : <Copy className="size-3" aria-hidden />}
              {copied ? 'คัดลอกแล้ว' : 'คัดลอก UID'}
            </button>
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
