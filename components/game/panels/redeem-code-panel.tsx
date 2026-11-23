'use client'

import { useState } from 'react'
import { CheckCircle2, ClipboardPaste, Gift, Mail, Sparkles, XCircle } from 'lucide-react'
import { playQuestClaimSfx } from '@/lib/game/combat-audio'
import { openPanel, redeemGiftCodeAction } from '@/lib/game/engine'
import { normalizeRedeemCodeInput } from '@/lib/firebase/redeem-codes'
import { PanelFrame, PxButton } from './panels'

export function RedeemCodePanel() {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [recentClaims, setRecentClaims] = useState<Array<{ code: string; message: string }>>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    const clean = normalizeRedeemCodeInput(code)
    if (clean.length < 4) {
      setFeedback({ ok: false, text: 'กรุณากรอกโค้ดรางวัลอย่างน้อย 4 ตัวอักษร (A-Z, 0-9, -, _)' })
      return
    }
    setBusy(true)
    setFeedback(null)
    try {
      const res = await redeemGiftCodeAction(clean)
      setFeedback({ ok: res.ok, text: res.message })
      if (res.ok) {
        playQuestClaimSfx(true)
        setRecentClaims((prev) => [{ code: clean, message: res.message }, ...prev].slice(0, 6))
        setCode('')
      }
    } finally {
      setBusy(false)
    }
  }

  const handlePaste = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return
      const text = await navigator.clipboard.readText()
      const clean = normalizeRedeemCodeInput(text)
      if (clean) setCode(clean)
    } catch {
      // Clipboard permission may be restricted inside iframe
    }
  }

  return (
    <PanelFrame
      title="แลกไอเทมโค้ด (Redeem Code)"
      subtitle="กรอกโค้ดของขวัญจากกิจกรรมหรือ GM เพื่อรับเพชร ทอง VIP EXP และไอเทม"
    >
      <div className="space-y-3 text-xs">
        <div className="border-2 border-fuchsia-400/45 bg-gradient-to-r from-fuchsia-950/35 via-indigo-950/30 to-background p-3">
          <div className="flex items-start gap-2.5">
            <div className="grid size-9 shrink-0 place-items-center border border-fuchsia-300/60 bg-fuchsia-500/20 text-fuchsia-200">
              <Gift className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-sm font-bold text-fuchsia-200">ศูนย์แลกรางวัลโค้ด Pixel Quest</h3>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                กรอกรหัสโค้ดตัวพิมพ์ใหญ่ (A-Z, 0-9, -, _) แล้วกดรับรางวัล รางวัลจะส่งเข้ากระเป๋าทันที
                และหากกระเป๋าเต็มระบบจะส่งไอเทมเข้าคลังเก็บของให้อัตโนมัติ
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2.5 border-2 border-border bg-muted/40 p-3">
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-foreground">รหัสไอเทมโค้ด (Gift Code)</span>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                data-testid="redeem-code-input"
                value={code}
                onChange={(e) => setCode(normalizeRedeemCodeInput(e.target.value))}
                placeholder="เช่น PIXEL2026"
                maxLength={32}
                disabled={busy}
                className="min-w-0 flex-1 border-2 border-border bg-background px-3 py-2 font-mono text-sm font-bold tracking-wider uppercase text-foreground outline-none focus:border-fuchsia-400 disabled:opacity-60"
              />
              <PxButton
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void handlePaste()}
                title="วางโค้ดจากคลิปบอร์ด"
              >
                <ClipboardPaste className="mr-1 inline size-3.5" aria-hidden />
                วางโค้ด
              </PxButton>
              <PxButton
                type="submit"
                variant="accent"
                data-testid="redeem-code-submit"
                disabled={busy || normalizeRedeemCodeInput(code).length < 4}
                className="px-4 py-2 text-xs font-bold"
              >
                <Sparkles className="mr-1 inline size-3.5" aria-hidden />
                {busy ? 'กำลังตรวจสอบ...' : 'แลกรับรางวัล'}
              </PxButton>
            </div>
          </label>

          {feedback && (
            <div
              role="status"
              data-testid="redeem-code-feedback"
              className={`flex items-start gap-2 border px-3 py-2 text-[11px] font-semibold ${
                feedback.ok
                  ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                  : 'border-rose-400/60 bg-rose-500/15 text-rose-200'
              }`}
            >
              {feedback.ok ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-rose-300" aria-hidden />
              )}
              <span>{feedback.text}</span>
            </div>
          )}
        </form>

        {recentClaims.length > 0 && (
          <div className="space-y-1.5 border border-emerald-400/40 bg-emerald-950/15 p-2.5">
            <p className="text-[11px] font-bold text-emerald-200">โค้ดที่เพิ่งรับในเซสชันนี้</p>
            <div className="space-y-1">
              {recentClaims.map((entry) => (
                <div
                  key={`${entry.code}_${entry.message}`}
                  className="flex flex-wrap items-center justify-between gap-2 border border-border/60 bg-background/70 px-2.5 py-1.5 text-[11px]"
                >
                  <span className="font-mono font-bold text-amber-300">{entry.code}</span>
                  <span className="text-emerald-200">{entry.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border border-border/70 bg-background/60 px-3 py-2 text-[11px] text-muted-foreground">
          <span>จำกัด 1 สิทธิ์ต่อ 1 บัญชี/อุปกรณ์ต่อรหัสโค้ด</span>
          <div className="flex gap-1.5">
            <PxButton type="button" variant="secondary" onClick={() => openPanel('mail')}>
              <Mail className="mr-1 inline size-3.5" aria-hidden />
              เปิดกล่องจดหมาย
            </PxButton>
            <PxButton type="button" variant="secondary" onClick={() => openPanel('inventory')}>
              เปิดกระเป๋า
            </PxButton>
          </div>
        </div>
      </div>
    </PanelFrame>
  )
}
