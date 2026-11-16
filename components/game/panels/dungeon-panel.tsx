'use client'

import { useState } from 'react'
import { Coins, Gem, Hammer, Swords } from 'lucide-react'
import { ITEMS } from '@/lib/game/data'
import { completeDailyDungeonAction, getStats } from '@/lib/game/engine'
import {
  DAILY_DUNGEONS,
  ELEMENT_META,
  RUNE_DEFS,
  getAttackElement,
  getElementMultiplier,
  sanitizeRpgExt,
  todayIsoDate,
  type DailyDungeonDef,
} from '@/lib/game/rpg-systems'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { PanelFrame, PxButton } from './panels'

export function DungeonPanel() {
  const g = useGame()
  const p = g.p
  const [notice, setNotice] = useState<string | null>(null)

  if (!p) return null
  const ext = sanitizeRpgExt(p.rpgExt)
  const today = todayIsoDate()
  const stats = getStats(p)
  const atkElem = getAttackElement(null, ext.equippedRunes)

  const handleEnterDungeon = (d: DailyDungeonDef) => {
    const elem = getElementMultiplier(atkElem, d.element)
    const powerRatio = Math.max(0.85, Math.min(1.6, stats.atk / Math.max(18, d.recommendedLevel * 4)))
    const bonusFactor = Number((powerRatio * elem.multiplier).toFixed(2))
    const res = completeDailyDungeonAction(d.id, bonusFactor)
    if (!res.ok || !res.rewards) {
      setNotice(res.message)
      return
    }
    const extraParts: string[] = []
    if (res.rewards.materialId) extraParts.push(`${ITEMS[res.rewards.materialId]?.name ?? res.rewards.materialId} x2`)
    if (res.rewards.runeId) extraParts.push(RUNE_DEFS[res.rewards.runeId]?.name ?? res.rewards.runeId)
    setNotice(`${res.message}${extraParts.length ? ` · โบนัส: ${extraParts.join(', ')}` : ''}`)
  }

  return (
    <PanelFrame
      title="ดันเจี้ยนทรัพยากรรายวัน"
      subtitle={`โควต้าประจำวัน (${today}) · สูงสุดโหมดละ 3 รอบ/วัน · ปรับรางวัลตามเลเวลและธาตุอาวุธของคุณ`}
    >
      {notice && (
        <div className="mb-3 border border-emerald-400/60 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
          {notice}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {DAILY_DUNGEONS.map((d) => {
          const used = ext.dailyDungeonDate === today ? (ext.dailyDungeonRuns[d.id] ?? 0) : 0
          const left = Math.max(0, d.dailyLimit - used)
          const elem = ELEMENT_META[d.element]
          return (
            <div
              key={d.id}
              className="flex flex-col justify-between gap-3 border border-border/80 bg-background/60 p-3 text-xs"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="border border-border/60 px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ color: elem.color, background: elem.bg }}
                  >
                    {elem.label}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                    เหลือ {left}/{d.dailyLimit} รอบ
                  </span>
                </div>
                <h3 className="text-sm font-bold text-primary">{d.name}</h3>
                <p className="text-[11px] text-muted-foreground">{d.subtitle}</p>
                <div className="space-y-1 border-t border-border/60 pt-2 text-[11px] tabular-nums">
                  <p className="flex items-center gap-1.5 text-gold">
                    <Coins className="size-3.5" aria-hidden /> ทองพื้นฐาน +{formatNum(d.baseGold)} G
                  </p>
                  <p className="flex items-center gap-1.5 text-cyan-300">
                    <Gem className="size-3.5" aria-hidden /> เพชร +{d.baseDiamonds} · EXP +{formatNum(d.baseExp)}
                  </p>
                  <p className="flex items-center gap-1.5 text-amber-300">
                    <Hammer className="size-3.5" aria-hidden /> หินตีบวก x{d.baseStones}
                    {d.bonusRuneId ? ` · มีสิทธิ์รับ ${RUNE_DEFS[d.bonusRuneId]?.name}` : ''}
                  </p>
                </div>
              </div>

              <PxButton
                disabled={left <= 0}
                onClick={() => handleEnterDungeon(d)}
                className="w-full"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Swords className="size-3.5" aria-hidden />
                  {left > 0 ? `บุกทลาย (${left} รอบ)` : 'ครบโควต้าวันนี้แล้ว'}
                </span>
              </PxButton>
            </div>
          )
        })}
      </div>
    </PanelFrame>
  )
}
