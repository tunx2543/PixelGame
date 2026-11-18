'use client'

import { useState } from 'react'
import { Archive, Award, Check, Clock, Crown, Gem, Lock } from 'lucide-react'
import {
  claimBattlePassTierAction,
  claimExpiredPassArchiveAction,
  unlockBattlePassPremiumAction,
} from '@/lib/game/engine'
import {
  BATTLE_PASS_TIERS,
  BP_EXP_PER_LEVEL,
  BP_MAX_LEVEL,
  BP_PREMIUM_DIAMOND_COST,
  CURRENT_BP_SEASON_META,
  sanitizeExtV2,
} from '@/lib/game/extended-systems'
import { playQuestClaimSfx } from '@/lib/game/sfx'
import { useGame } from '@/lib/game/use-game'
import { PanelFrame, PxButton } from './panels'

function formatSeasonCountdown(endAtMs: number): string {
  const diff = Math.max(0, endAtMs - Date.now())
  if (diff <= 0) return 'สิ้นสุดซีซันแล้ว'
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  return `เหลือเวลา ${days} วัน ${hours} ชม.`
}

export function PassPanel() {
  const { p } = useGame()
  const [notice, setNotice] = useState<string | null>(null)
  if (!p) return null

  const extV2 = sanitizeExtV2(p.extV2)
  const bp = extV2.battlePass
  const expiredArchive = bp.expiredArchive ?? []
  const pct = bp.level >= BP_MAX_LEVEL ? 100 : Math.min(100, Math.round((bp.exp / BP_EXP_PER_LEVEL) * 100))

  const handleClaimAll = () => {
    let claimed = 0
    for (const tier of BATTLE_PASS_TIERS) {
      if (tier.level > bp.level) break
      if (!bp.claimedFree.includes(tier.level)) {
        if (claimBattlePassTierAction(tier.level, 'free').ok) claimed += 1
      }
      if (bp.premiumUnlocked && !bp.claimedPrem.includes(tier.level)) {
        if (claimBattlePassTierAction(tier.level, 'prem').ok) claimed += 1
      }
    }
    if (claimed > 0) {
      playQuestClaimSfx(true)
      setNotice(`รับรางวัล Battle Pass ทั้งหมด ${claimed} ช่องสำเร็จ!`)
    } else {
      setNotice('ไม่มีรางวัลที่รับได้ในขณะนี้')
    }
  }

  return (
    <PanelFrame
      title={`${CURRENT_BP_SEASON_META.seasonName} (Lv.1–20)`}
      subtitle="ล่ามอนสเตอร์ เก็บเกี่ยววัตถุดิบ และลงดันเจี้ยนเพื่อสะสม EXP ปลดล็อกปีกและเพชรฟรี"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border border-primary/50 bg-primary/10 p-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-primary">
              <Award className="size-4" aria-hidden /> ระดับซีซัน: Lv.{bp.level} / {BP_MAX_LEVEL}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-cyan-200">
              <Clock className="size-3.5" aria-hidden />
              {formatSeasonCountdown(bp.seasonEndAtMs ?? CURRENT_BP_SEASON_META.seasonEndAtMs)}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {bp.level >= BP_MAX_LEVEL ? 'MAX LEVEL' : `${bp.exp} / ${BP_EXP_PER_LEVEL} EXP`}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden border border-border bg-muted">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <PxButton variant="accent" onClick={handleClaimAll}>
            รับทั้งหมดที่ปลดล็อก
          </PxButton>
          {!bp.premiumUnlocked ? (
            <PxButton
              variant="primary"
              disabled={p.diamonds < BP_PREMIUM_DIAMOND_COST}
              onClick={() => {
                const res = unlockBattlePassPremiumAction()
                if (res.ok) playQuestClaimSfx(true)
                setNotice(res.message)
              }}
            >
              <span className="flex items-center gap-1 tabular-nums">
                <Crown className="size-3.5" aria-hidden /> ปลดล็อก Premium ({BP_PREMIUM_DIAMOND_COST} <Gem className="size-3 text-cyan-200" aria-hidden />)
              </span>
            </PxButton>
          ) : (
            <span className="border border-amber-400/50 bg-amber-400/15 px-2.5 py-1.5 text-xs font-bold text-amber-200">
              เปิดใช้ Premium แล้ว
            </span>
          )}
        </div>
      </div>

      {expiredArchive.length > 0 && (
        <div className="mb-3 space-y-2 border-2 border-amber-400/50 bg-amber-500/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
                <Archive className="size-4" aria-hidden />
                รางวัลซีซันเก่าที่ปลดล็อกไว้ ({expiredArchive.length} รายการ)
              </p>
              <p className="text-[11px] text-muted-foreground">
                ระบบเก็บรักษารางวัลที่ยังไม่ได้รับจากซีซันก่อนหน้าให้คุณกดรับย้อนหลังได้
              </p>
            </div>
            <PxButton
              variant="accent"
              onClick={() => {
                const res = claimExpiredPassArchiveAction()
                if (res.ok) playQuestClaimSfx(true)
                setNotice(res.message)
              }}
            >
              รับย้อนหลังทั้งหมด ({expiredArchive.length})
            </PxButton>
          </div>
        </div>
      )}

      {notice && (
        <div className="mb-3 border border-emerald-400/60 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300" role="status">
          {notice}
        </div>
      )}

      <div className="space-y-1.5">
        {BATTLE_PASS_TIERS.map((tier) => {
          const unlocked = bp.level >= tier.level
          const freeClaimed = bp.claimedFree.includes(tier.level)
          const premClaimed = bp.claimedPrem.includes(tier.level)
          return (
            <div
              key={tier.level}
              className={`grid items-center gap-2 border p-2 text-xs sm:grid-cols-[4.5rem_1fr_1fr] ${
                unlocked ? 'border-border bg-background/70' : 'border-border/50 bg-background/35 opacity-75'
              }`}
            >
              <div className="font-bold text-primary tabular-nums">Lv.{tier.level}</div>

              <div className="flex items-center justify-between gap-2 border border-border/60 bg-background/80 px-2.5 py-1.5">
                <span className="truncate text-[11px]">ฟรี: {tier.freeReward.label}</span>
                {freeClaimed ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300">
                    <Check className="size-3" aria-hidden /> รับแล้ว
                  </span>
                ) : (
                  <PxButton
                    disabled={!unlocked}
                    onClick={() => {
                      const res = claimBattlePassTierAction(tier.level, 'free')
                      if (res.ok) playQuestClaimSfx(false)
                      setNotice(res.message)
                    }}
                    className="px-2 py-1 text-[10px]"
                  >
                    {unlocked ? 'รับ' : 'ล็อก'}
                  </PxButton>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 border border-amber-400/40 bg-amber-400/5 px-2.5 py-1.5">
                <span className="truncate text-[11px] text-amber-200">พรีเมียม: {tier.premReward.label}</span>
                {!bp.premiumUnlocked ? (
                  <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                ) : premClaimed ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300">
                    <Check className="size-3" aria-hidden /> รับแล้ว
                  </span>
                ) : (
                  <PxButton
                    variant="accent"
                    disabled={!unlocked}
                    onClick={() => {
                      const res = claimBattlePassTierAction(tier.level, 'prem')
                      if (res.ok) playQuestClaimSfx(false)
                      setNotice(res.message)
                    }}
                    className="px-2 py-1 text-[10px]"
                  >
                    {unlocked ? 'รับ' : 'ล็อก'}
                  </PxButton>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </PanelFrame>
  )
}
