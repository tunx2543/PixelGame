'use client'

import { useState } from 'react'
import { Coins, Crown, Feather, Gem, Sparkles, Swords } from 'lucide-react'
import { equipCosmeticAction, unlockCosmeticAction } from '@/lib/game/engine'
import {
  COSMETIC_DEFS,
  sanitizeExtV2,
  type CosmeticSlot,
} from '@/lib/game/extended-systems'
import { playQuestClaimSfx } from '@/lib/game/sfx'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { PanelFrame, PxButton } from './panels'

const SLOT_LABELS: Record<CosmeticSlot, { label: string; Icon: typeof Feather }> = {
  wing: { label: 'ปีกประดับหลัง (Wings)', Icon: Feather },
  weaponSkin: { label: 'สกินเอฟเฟกต์อาวุธ', Icon: Swords },
  frame: { label: 'กรอบชื่อเกียรติยศ', Icon: Crown },
}

export function WardrobePanel() {
  const { p } = useGame()
  const [slotFilter, setSlotFilter] = useState<'all' | CosmeticSlot>('all')
  const [notice, setNotice] = useState<string | null>(null)
  if (!p) return null

  const extV2 = sanitizeExtV2(p.extV2)
  const items = slotFilter === 'all' ? COSMETIC_DEFS : COSMETIC_DEFS.filter((c) => c.slot === slotFilter)

  const getEquippedForSlot = (slot: CosmeticSlot) =>
    slot === 'wing' ? extV2.equippedWing : slot === 'weaponSkin' ? extV2.equippedWeaponSkin : extV2.equippedFrame

  return (
    <PanelFrame
      title="ห้องแต่งตัวแฟชั่น & ปีก (Wardrobe)"
      subtitle="ติดตั้งปีก สกินฟันอาวุธ และกรอบชื่อผู้กล้าที่แสดงผลจริงบนตัวละครในฉากเกม"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
        <div className="flex flex-wrap gap-1.5">
          <PxButton variant={slotFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setSlotFilter('all')}>
            ทั้งหมด ({COSMETIC_DEFS.length})
          </PxButton>
          {(['wing', 'weaponSkin', 'frame'] as CosmeticSlot[]).map((slot) => (
            <PxButton
              key={slot}
              variant={slotFilter === slot ? 'primary' : 'secondary'}
              onClick={() => setSlotFilter(slot)}
            >
              {SLOT_LABELS[slot].label}
            </PxButton>
          ))}
        </div>
        <span className="flex items-center gap-1 text-xs font-bold text-cyan-200 tabular-nums">
          <Gem className="size-3.5" aria-hidden /> {formatNum(p.diamonds)} เพชร
        </span>
      </div>

      {notice && (
        <div className="mb-3 border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary" role="status">
          {notice}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((cos) => {
          const owned = extV2.unlockedCosmetics.includes(cos.id)
          const equipped = getEquippedForSlot(cos.slot) === cos.id
          const { Icon, label } = SLOT_LABELS[cos.slot]
          const canAfford =
            (cos.goldCost ? p.gold >= cos.goldCost : true) &&
            (cos.diamondCost > 0 ? p.diamonds >= cos.diamondCost : true)

          return (
            <div
              key={cos.id}
              className={`flex flex-col justify-between gap-3 border-2 p-3 text-xs ${
                equipped ? 'border-accent bg-accent/10' : 'border-border bg-background/60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex size-12 shrink-0 items-center justify-center border-2 border-[#0e0f1a]"
                  style={{
                    background: `linear-gradient(135deg, ${cos.primaryColor}33, ${cos.secondaryColor}44)`,
                    borderColor: cos.primaryColor,
                  }}
                >
                  <Icon className="size-6" style={{ color: cos.primaryColor }} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-bold text-foreground">{cos.name}</p>
                    <span className="text-[10px] text-muted-foreground">{label.split(' ')[0]}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{cos.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                {owned ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                      <Sparkles className="size-3.5" aria-hidden /> {equipped ? 'กำลังสวมใส่' : 'ปลดล็อกแล้ว'}
                    </span>
                    <PxButton
                      variant={equipped ? 'secondary' : 'accent'}
                      onClick={() => {
                        const res = equipCosmeticAction(cos.slot, equipped ? null : cos.id)
                        playQuestClaimSfx(false)
                        setNotice(res.message)
                      }}
                    >
                      {equipped ? 'ถอดออก' : 'สวมใส่เลย'}
                    </PxButton>
                  </>
                ) : (
                  <PxButton
                    variant="primary"
                    className="w-full"
                    disabled={!canAfford}
                    onClick={() => {
                      const res = unlockCosmeticAction(cos.id)
                      if (res.ok) playQuestClaimSfx(true)
                      setNotice(res.message)
                    }}
                  >
                    <span className="flex items-center justify-center gap-1.5 tabular-nums">
                      ปลดล็อก (
                      {cos.goldCost ? (
                        <>
                          <Coins className="size-3 text-gold" aria-hidden /> {formatNum(cos.goldCost)} G
                        </>
                      ) : (
                        <>
                          <Gem className="size-3 text-cyan-200" aria-hidden /> {cos.diamondCost} เพชร
                        </>
                      )}
                      )
                    </span>
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
