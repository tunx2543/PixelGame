'use client'

import { useState } from 'react'
import { Flame, Leaf, Pickaxe, Sparkles, Utensils } from 'lucide-react'
import { ITEMS } from '@/lib/game/data'
import { MAPS } from '@/lib/game/maps'
import {
  consumeItemWithFeedback,
  cookFoodAction,
  countItem,
  gatherNearbyNodeAction,
} from '@/lib/game/engine'
import {
  FOOD_BUFF_DEFS,
  GATHERING_NODES,
  LIFE_SKILL_META,
  findNearbyGatheringNode,
  getActiveFoodBuffBonuses,
  lifeSkillExpToNext,
  sanitizeExtV2,
  type LifeSkillType,
} from '@/lib/game/extended-systems'
import { playQuestClaimSfx } from '@/lib/game/sfx'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { ItemIcon } from '../item-icon'
import { PanelFrame, PxButton } from './panels'

const SKILL_ICONS: Record<LifeSkillType, typeof Leaf> = {
  fishing: Sparkles,
  mining: Pickaxe,
  herbalism: Leaf,
}

export function LifeSkillsPanel() {
  const { p } = useGame()
  const [notice, setNotice] = useState<string | null>(null)
  if (!p) return null

  const extV2 = sanitizeExtV2(p.extV2)
  const nearbyNode = findNearbyGatheringNode(p.mapId, p.x, p.y)
  const activeBuff = getActiveFoodBuffBonuses(extV2.activeFoodBuff)

  return (
    <PanelFrame
      title="ทักษะชีวิต & ทำอาหารบัฟ (Life Skills)"
      subtitle="เดินไปใกล้จุดเก็บเกี่ยวในแผนที่แล้วกด [E] เพื่อตกปลา ขุดแร่ เก็บสมุนไพร และปรุงอาหารบัฟ"
    >
      {notice && (
        <div className="mb-3 border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary" role="status">
          {notice}
        </div>
      )}

      {/* Life Skill Levels + Nearby Gather Action */}
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {(['fishing', 'mining', 'herbalism'] as const).map((sk) => {
          const meta = LIFE_SKILL_META[sk]
          const prog = extV2.lifeSkills[sk]
          const need = lifeSkillExpToNext(prog.level)
          const pct = Math.min(100, Math.round((prog.exp / Math.max(1, need)) * 100))
          const Icon = SKILL_ICONS[sk]
          return (
            <div key={sk} className="border border-border/80 bg-background/60 p-2.5 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5" style={{ color: meta.color }}>
                  <Icon className="size-3.5" aria-hidden /> {meta.label}
                </span>
                <span className="tabular-nums text-foreground">Lv.{prog.level}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden border border-border bg-muted">
                <div className="h-full transition-[width]" style={{ width: `${pct}%`, background: meta.color }} />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                EXP {formatNum(prog.exp)} / {formatNum(need)}
              </p>
            </div>
          )
        })}
      </div>

      {/* Nearby Node Quick Bar & Map Directory */}
      <div className="mb-4 border border-border/80 bg-background/60 p-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-bold text-primary">
              {nearbyNode
                ? `อยู่ใกล้: ${nearbyNode.label}`
                : 'ตำแหน่งแหล่งวัตถุดิบทั้งหมดในโลก Pixel Quest'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {nearbyNode
                ? 'สามารถกดเก็บเกี่ยวได้ทันที หรือกดปุ่ม [E] บนแผนที่'
                : 'เดินไปยังจุดคริสตัลเรืองแสงในแผนที่ต่างๆ เพื่อเก็บวัตถุดิบและสุ่มรับผลึกวิวัฒนาการคู่หู'}
            </p>
          </div>
          {nearbyNode && (
            <PxButton
              variant="accent"
              onClick={() => {
                const res = gatherNearbyNodeAction(nearbyNode.id)
                if (res.ok) playQuestClaimSfx(false)
                setNotice(res.message)
              }}
            >
              เก็บเกี่ยวทันที!
            </PxButton>
          )}
        </div>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2 md:grid-cols-3">
          {GATHERING_NODES.map((n) => (
            <div
              key={n.id}
              className={`border px-2 py-1.5 text-[11px] ${
                nearbyNode?.id === n.id
                  ? 'border-emerald-400/70 bg-emerald-500/10'
                  : 'border-border/60 bg-background/80'
              }`}
            >
              <p className="truncate font-bold" style={{ color: n.color }}>
                {n.label}
              </p>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                แมพ: {MAPS[n.mapId]?.name ?? n.mapId} (X:{n.tx}, Y:{n.ty})
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Food Buff */}
      {activeBuff.active && extV2.activeFoodBuff && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border border-amber-400/60 bg-amber-400/10 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 font-bold text-amber-200">
            <Flame className="size-4" aria-hidden /> บัฟอาหารทำงานอยู่: {extV2.activeFoodBuff.name}
          </span>
          <span className="tabular-nums text-[11px] text-amber-100">
            เหลืออีก {activeBuff.remainingSec} วินาที · ATK +{activeBuff.atkPct}% · DEF +{activeBuff.defPct}% · EXP x{activeBuff.expMul}
          </span>
        </div>
      )}

      {/* Cooking Section */}
      <div className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-xs font-bold text-primary">
          <Utensils className="size-3.5" aria-hidden /> ครัวปรุงอาหารเพิ่มพลัง (Food Buffs)
        </h3>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {FOOD_BUFF_DEFS.map((food) => {
            const ownedCount = countItem(food.itemId)
            const hasAllIngredients =
              p.gold >= food.goldCost && food.ingredients.every((ing) => countItem(ing.itemId) >= ing.qty)
            return (
              <div key={food.itemId} className="flex flex-col justify-between gap-2 border border-border/80 bg-background/60 p-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-muted/80">
                    <ItemIcon itemId={food.itemId} size={28} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-bold text-foreground">{food.name}</p>
                      <span className="text-[11px] text-muted-foreground tabular-nums">มีในตัว {ownedCount}</span>
                    </div>
                    <p className="text-[11px] text-emerald-300 tabular-nums">
                      ATK +{food.atkPct}% · DEF +{food.defPct}% · CRIT +{Math.round(food.critBonus * 100)}% · EXP x{food.expMul} ({food.durationSec}s)
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                      วัตถุดิบ:{' '}
                      {food.ingredients
                        .map((i) => `${ITEMS[i.itemId]?.name ?? i.itemId} (${countItem(i.itemId)}/${i.qty})`)
                        .join(', ')}{' '}
                      · {formatNum(food.goldCost)} G
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-border/50 pt-2">
                  <PxButton
                    variant="primary"
                    className="flex-1"
                    disabled={!hasAllIngredients}
                    onClick={() => {
                      const res = cookFoodAction(food.itemId)
                      if (res.ok) playQuestClaimSfx(false)
                      setNotice(res.message)
                    }}
                  >
                    ปรุงอาหาร ({formatNum(food.goldCost)} G)
                  </PxButton>
                  {ownedCount > 0 && (
                    <PxButton
                      variant="accent"
                      onClick={() => {
                        const target = p.inventory.find((i) => i.itemId === food.itemId)
                        if (target) {
                          const res = consumeItemWithFeedback(target.uid)
                          if (res.ok) playQuestClaimSfx(false)
                          setNotice(res.message)
                        }
                      }}
                    >
                      กินเลย
                    </PxButton>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PanelFrame>
  )
}
