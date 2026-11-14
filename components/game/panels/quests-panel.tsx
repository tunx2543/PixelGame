'use client'

import { useState } from 'react'
import { Check, Coins, Gem, Hammer, Sparkles } from 'lucide-react'
import { claimQuestReward } from '@/lib/game/engine'
import { playQuestClaimSfx } from '@/lib/game/sfx'
import {
  QUEST_DEFS,
  getQuestMetricValue,
  isQuestClaimed,
  sanitizePetState,
  sanitizeQuestState,
  sanitizeTowerState,
  type QuestCategory,
} from '@/lib/game/systems'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { PanelFrame, PxButton } from './panels'

export function QuestsPanel() {
  const { p } = useGame()
  const [tab, setTab] = useState<QuestCategory>('daily')
  const [notice, setNotice] = useState<string | null>(null)
  if (!p) return null

  const qs = sanitizeQuestState(p.questState, p.kills)
  const ts = sanitizeTowerState(p.towerState)
  const ps = sanitizePetState(p.petState, p.ownedGemItems, p.equippedGemCompanion)

  const filtered = QUEST_DEFS.filter((q) => q.category === tab)

  return (
    <PanelFrame
      title="กระดานเควสต์และภารกิจ"
      subtitle={`ภารกิจรายวัน (${qs.dailyDate}) รีเซ็ตทุกวัน · เควสต์ความสำเร็จรับได้ตลอด`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 border border-border bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => setTab('daily')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === 'daily' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ภารกิจรายวัน
            </button>
            <button
              type="button"
              onClick={() => setTab('milestone')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === 'milestone' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ภารกิจความสำเร็จ
            </button>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            กำจัดมอนสเตอร์วันนี้: {formatNum(qs.dailyKills)} · รวมทั้งหมด: {formatNum(qs.totalKills)}
          </span>
        </div>

        {notice && (
          <p className="border border-accent/50 bg-accent/10 px-3 py-2 text-xs text-accent" role="status">
            {notice}
          </p>
        )}

        <div className="space-y-2.5">
          {filtered.map((quest) => {
            const current = Math.min(quest.target, getQuestMetricValue(quest.metric, qs, ts, ps))
            const claimed = isQuestClaimed(quest, qs)
            const ready = !claimed && current >= quest.target
            const pct = Math.min(100, Math.round((current / Math.max(1, quest.target)) * 100))

            return (
              <div
                key={quest.id}
                className={`border-2 p-3 ${
                  ready
                    ? 'border-accent bg-accent/10'
                    : claimed
                      ? 'border-border/50 bg-muted/30 opacity-75'
                      : 'border-border bg-background/50'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">{quest.title}</h3>
                      {claimed && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-accent">
                          <Check className="size-3.5" aria-hidden /> รับแล้ว
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{quest.description}</p>

                    <div className="flex items-center gap-2 pt-1">
                      <div className="h-2 flex-1 overflow-hidden border border-[#0e0f1a] bg-muted">
                        <div
                          className={`h-full transition-[width] ${ready || claimed ? 'bg-accent' : 'bg-primary'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        {formatNum(current)} / {formatNum(quest.target)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] tabular-nums">
                      {quest.rewardGold > 0 && (
                        <span className="inline-flex items-center gap-1 text-gold">
                          <Coins className="size-3" aria-hidden /> +{formatNum(quest.rewardGold)} G
                        </span>
                      )}
                      {quest.rewardDiamonds > 0 && (
                        <span className="inline-flex items-center gap-1 text-cyan-200">
                          <Gem className="size-3" aria-hidden /> +{formatNum(quest.rewardDiamonds)} เพชร
                        </span>
                      )}
                      {quest.rewardExp > 0 && (
                        <span className="inline-flex items-center gap-1 text-[#dca8ff]">
                          <Sparkles className="size-3" aria-hidden /> +{formatNum(quest.rewardExp)} EXP
                        </span>
                      )}
                      {(quest.rewardStones ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-foreground">
                          <Hammer className="size-3" aria-hidden /> หินตีบวก x{quest.rewardStones}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 self-center">
                    <PxButton
                      variant={ready ? 'accent' : 'secondary'}
                      disabled={!ready}
                      onClick={() => {
                        const res = claimQuestReward(quest.id)
                        if (res.ok) playQuestClaimSfx(false)
                        setNotice(res.message)
                      }}
                    >
                      {claimed ? 'รับรางวัลแล้ว' : ready ? 'รับรางวัล' : 'ยังไม่ครบ'}
                    </PxButton>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PanelFrame>
  )
}
