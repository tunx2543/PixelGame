'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { CheckCircle2, LogIn, LogOut, ShieldCheck } from 'lucide-react'
import { auth, signInWithGoogle, signOutFirebase } from '@/lib/firebase/client'
import { ensureUserProfile } from '@/lib/firebase/characters'

export function AccountPanel() {
  const [user, setUser] = useState<User | null>(() => auth.currentUser)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      if (nextUser) {
        setMessage('')
        void ensureUserProfile(nextUser).catch(() => {})
      }
    })
    return () => unsubscribe()
  }, [])

  const handleGoogleSignIn = async () => {
    setBusy(true)
    setMessage('')
    try {
      const cred = await signInWithGoogle()
      if (cred.user) {
        await ensureUserProfile(cred.user)
      }
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
      if (code === 'auth/popup-closed-by-user') {
        setMessage('ยกเลิกการเข้าสู่ระบบ')
      } else if (code === 'auth/popup-blocked') {
        setMessage('เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ กรุณาอนุญาต Pop-up แล้วลองใหม่')
      } else {
        setMessage('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
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

  if (user) {
    return (
      <div className="pixel-panel w-full border-primary/50 bg-card/95 p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid size-8 shrink-0 place-items-center border-2 border-[#0e0f1a] bg-primary/15 text-primary">
              <ShieldCheck className="size-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate font-semibold text-foreground">
                <span>{user.displayName || 'นักผจญภัย'}</span>
                <CheckCircle2 className="size-3.5 shrink-0 text-accent" aria-hidden />
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
            ล็อคอินด้วย Google เพื่อบันทึกและเลือกตัวละครข้ามอุปกรณ์
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
