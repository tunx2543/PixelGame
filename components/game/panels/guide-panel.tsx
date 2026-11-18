'use client'

import { useState } from 'react'
import { CheckCircle2, Compass, Flame, ShieldAlert, Sun } from 'lucide-react'
import {
  claimBeginnerGuideStepAction,
  hasVipRemoteAccess,
  isBeginnerGuideStepReady,
  isNearTownNpcRole,
  openPanel,
  startTownInvasionAction,
} from '@/lib/game/engine'
import {
  BEGINNER_GUIDE_STEPS,
  getWorldTimePhase,
  sanitizeExtV2,
} from '@/lib/game/extended-systems'
import { playQuestClaimSfx } from '@/lib/game/sfx'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { PanelFrame, PxButton } from './panels'

export function GuidePanel() {
  const { p } = useGame()
  const [notice, setNotice] = useState<string | null>(null)
  if (!p) return null

  const extV2 = sanitizeExtV2(p.extV2)
  const completedCount = extV2.claimedGuideSteps.length
  const worldPhase = getWorldTimePhase()

  return (
    <PanelFrame
      title="คู่มือผู้กล้าใหม่ & อีเวนต์ป้องกันเมือง"
      subtitle={`ทำภารกิจแนะนำ 6 ขั้นเพื่อรับเพชรฟรี (${completedCount}/${BEGINNER_GUIDE_STEPS.length}) และเปิดศึกป้องกันเมือง`}
    >
      {notice && (
        <div className="mb-3 border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary" role="status">
          {notice}
        </div>
      )}

      {/* World Time Phase & Town Invasion Launcher */}
      <div className="mb-4 grid gap-2.5 sm:grid-cols-2">
        <div className="border border-border/80 bg-background/60 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-200">
            <Sun className="size-4" aria-hidden /> วัฏจักรโลกปัจจุบัน: {worldPhase.label}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            ช่วงกลางวัน ยามเย็น และกลางคืนหมุนเวียนอัตโนมัติ — ช่วงยามเย็นและกลางคืนรับโบนัส EXP +{worldPhase.expBonusPct}%
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border border-rose-400/40 bg-rose-500/10 p-3 text-xs">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-bold text-rose-200">
              <ShieldAlert className="size-4 shrink-0" aria-hidden /> กิจกรรมป้องกันเมือง (Wave Defense)
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
              ปราบ 3 เวฟรับ +15 เพชร (เคลียร์แล้ว {extV2.invasionWavesCleared} ครั้ง)
            </p>
          </div>
          <PxButton
            variant="danger"
            onClick={() => {
              const res = startTownInvasionAction()
              setNotice(res.message)
            }}
          >
            <span className="flex items-center gap-1">
              <Flame className="size-3.5" aria-hidden /> เริ่มป้องกันเมือง
            </span>
          </PxButton>
        </div>
      </div>

      {/* 6-Step Interactive Guide */}
      <div className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-xs font-bold text-primary">
          <Compass className="size-3.5" aria-hidden /> เส้นทางฝึกฝนผู้กล้า 6 ขั้น
        </h3>
        {BEGINNER_GUIDE_STEPS.map((step) => {
          const claimed = extV2.claimedGuideSteps.includes(step.id)
          const ready = isBeginnerGuideStepReady(step.id, p)
          return (
            <div
              key={step.id}
              className={`flex flex-wrap items-center justify-between gap-2 border p-2.5 text-xs ${
                claimed
                  ? 'border-emerald-400/40 bg-emerald-500/5 opacity-75'
                  : ready
                    ? 'border-primary/70 bg-primary/10'
                    : 'border-border/70 bg-background/60'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground">
                  ขั้นที่ {step.stepNumber}: {step.title}
                </p>
                <p className="text-[11px] text-muted-foreground">{step.description}</p>
                <p className="mt-0.5 text-[11px] text-amber-200 tabular-nums">
                  รางวัล: +{formatNum(step.rewardGold)} G · +{step.rewardDiamonds} เพชร · หินตีบวก x{step.rewardStones}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {claimed ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300">
                    <CheckCircle2 className="size-4" aria-hidden /> สำเร็จแล้ว
                  </span>
                ) : ready ? (
                  <PxButton
                    variant="accent"
                    onClick={() => {
                      const res = claimBeginnerGuideStepAction(step.id)
                      if (res.ok) playQuestClaimSfx(true)
                      setNotice(res.message)
                    }}
                  >
                    รับรางวัล
                  </PxButton>
                ) : step.targetPanel ? (
                  <PxButton
                    variant="secondary"
                    onClick={() => {
                      if (
                        step.targetPanel === 'enhance' &&
                        !hasVipRemoteAccess(p) &&
                        !isNearTownNpcRole('enhance')
                      ) {
                        setNotice('กรุณาเดินไปคุยกับ ช่างเหล็กบุญมา ในเมือง เพื่อตีบวก (หรือเปิด VIP เพื่อตีบวกระยะไกล)')
                        return
                      }
                      openPanel(step.targetPanel!)
                    }}
                  >
                    {step.targetPanel === 'enhance' && !hasVipRemoteAccess(p) && !isNearTownNpcRole('enhance')
                      ? 'คุยช่างเหล็กในเมือง'
                      : 'ไปยังเมนู'}
                  </PxButton>
                ) : (
                  <span className="text-[11px] text-muted-foreground">กำลังดำเนินการ...</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </PanelFrame>
  )
}
