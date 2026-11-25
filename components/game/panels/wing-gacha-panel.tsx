'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Coins, Feather, Gem, Sparkles } from 'lucide-react'
import {
  closePanel,
  ensurePremiumState,
  equipFashionAction,
  openPanel,
  resolvePlayerFashionLoadout,
  rollWingGachaAction,
} from '@/lib/game/engine'
import type { PremiumRarity } from '@/lib/game/premium/types'
import { getEffectiveVipBonuses } from '@/lib/game/premium/vip'
import { playQuestClaimSfx } from '@/lib/game/sfx'
import { useGame } from '@/lib/game/use-game'
import {
  getWingDuplicateReward,
  getWingGachaCost,
  WING_GACHA_POOL,
  type WingGachaBatchResult,
  type WingGachaCount,
  type WingGachaCurrency,
} from '@/lib/game/wing-gacha'
import { cn } from '@/lib/utils'
import { formatNum } from '../format'
import { PanelFrame, PxButton } from './panels'

const RARITY_ORDER: Record<PremiumRarity, number> = {
  เทพ: 0,
  มายา: 1,
  ตำนาน: 2,
  อีปิก: 3,
  หายาก: 4,
  ทั่วไป: 5,
}

function rarityBadgeClass(rarity: PremiumRarity): string {
  switch (rarity) {
    case 'เทพ':
      return 'border-amber-300 bg-gradient-to-r from-amber-500/35 via-rose-500/30 to-yellow-400/30 text-amber-100'
    case 'มายา':
      return 'border-fuchsia-400/70 bg-fuchsia-500/20 text-fuchsia-200'
    case 'ตำนาน':
      return 'border-amber-400/70 bg-amber-500/20 text-amber-200'
    case 'อีปิก':
      return 'border-violet-400/70 bg-violet-500/20 text-violet-200'
    case 'หายาก':
      return 'border-cyan-400/70 bg-cyan-500/20 text-cyan-200'
    default:
      return 'border-border bg-muted text-muted-foreground'
  }
}

export function WingGachaPanel() {
  const { p } = useGame()
  const [rolling, setRolling] = useState(false)
  const [onlyUnowned, setOnlyUnowned] = useState(false)
  const [lastBatch, setLastBatch] = useState<WingGachaBatchResult | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const sortedPool = useMemo(
    () =>
      [...WING_GACHA_POOL].sort((a, b) => {
        const diff = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]
        return diff !== 0 ? diff : a.rate - b.rate
      }),
    [],
  )

  if (!p) return null

  const prem = ensurePremiumState(p)
  const vipBonuses = getEffectiveVipBonuses(prem.vip)
  const equippedLoadout = resolvePlayerFashionLoadout(p)
  const unlockedSet = new Set([
    ...prem.fashion.unlockedIds,
    ...(prem.fashion.gachaUnlockedIds ?? []),
    ...(vipBonuses.active ? vipBonuses.exclusiveFashionIds : []),
  ])
  const ownedWingCount = WING_GACHA_POOL.filter((entry) => unlockedSet.has(entry.fashionId)).length
  const shownPool = onlyUnowned
    ? sortedPool.filter((entry) => !unlockedSet.has(entry.fashionId))
    : sortedPool

  const handlePull = (currency: WingGachaCurrency, count: WingGachaCount) => {
    if (rolling) return
    const cost = getWingGachaCost(currency, count)
    if (currency === 'gold' && p.gold < cost) {
      setNotice({ ok: false, text: `ทองไม่พอ (ต้องการ ${formatNum(cost)} G)` })
      return
    }
    if (currency === 'diamond' && (p.diamonds ?? 0) < cost) {
      setNotice({ ok: false, text: `เพชรไม่พอ (ต้องการ ${formatNum(cost)} เพชร)` })
      return
    }

    setRolling(true)
    setNotice(null)
    window.setTimeout(() => {
      const res = rollWingGachaAction(currency, count)
      setRolling(false)
      if (!res.ok) {
        setNotice({ ok: false, text: res.error ?? 'ไม่สามารถสุ่มปีกได้' })
        return
      }
      const hasRare = res.results.some((r) => r.rarity === 'ตำนาน' || r.rarity === 'มายา' || r.rarity === 'เทพ')
      playQuestClaimSfx(hasRare)
      setLastBatch(res)
      const newCount = res.results.filter((r) => r.isNew).length
      setNotice({
        ok: true,
        text: `สุ่มสำเร็จ ${count} ครั้ง!${newCount > 0 ? ` ปลดล็อกปีกใหม่ ${newCount} แบบ` : ''}${
          res.totalDuplicateGold > 0
            ? ` · ชดเชยซ้ำ +${formatNum(res.totalDuplicateGold)} G และหินตีบวก x${res.totalDuplicateStones}`
            : ''
        }`,
      })
    }, 320)
  }

  const handleQuickEquip = (fashionId: string) => {
    const equipped = equippedLoadout.wings === fashionId
    const res = equipFashionAction('wings', equipped ? null : fashionId)
    if (res.ok) playQuestClaimSfx(false)
    setNotice({ ok: res.ok, text: res.message })
  }

  const gold1 = getWingGachaCost('gold', 1)
  const gold5 = getWingGachaCost('gold', 5)
  const dia1 = getWingGachaCost('diamond', 1)
  const dia5 = getWingGachaCost('diamond', 5)

  return (
    <PanelFrame
      title="ตู้ไข่สุ่มปีกแห่งน้ำพุเมือง (Wing Gacha)"
      subtitle={`สุ่มสะสมปีกแฟชั่นครบทั้ง ${WING_GACHA_POOL.length} แบบ รวมปีกเพลิงอนิเมชัน 16 เฟรม · อัตราดรอปเปิดเผยรวม 100%`}
    >
      <div className="space-y-3 text-xs">
        {/* Top Currency & Collection Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-cyan-400/40 bg-cyan-950/25 p-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-bold text-cyan-200">
              <Feather className="size-4 text-cyan-300" aria-hidden />
              สะสมปีก {ownedWingCount}/{WING_GACHA_POOL.length} แบบ
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-gold tabular-nums">
              <Coins className="size-3.5" aria-hidden /> {formatNum(p.gold)} G
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-cyan-200 tabular-nums">
              <Gem className="size-3.5" aria-hidden /> {formatNum(p.diamonds ?? 0)} เพชร
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <PxButton variant="secondary" onClick={() => openPanel('wardrobe')}>
              เปิดห้องแต่งตัว (Wardrobe)
            </PxButton>
          </div>
        </div>

        {/* Roll Controls */}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-2 border-2 border-amber-400/40 bg-amber-950/20 p-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-200">สุ่มด้วยเหรียญทอง (Gold)</span>
              <span className="text-[10px] text-amber-300/80">สุ่ม x5 ประหยัด 10%</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <PxButton
                variant="primary"
                disabled={rolling || p.gold < gold1}
                onClick={() => handlePull('gold', 1)}
              >
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Coins className="size-3" aria-hidden />
                  {rolling ? 'กำลังสุ่ม...' : `1 ครั้ง · ${formatNum(gold1)} G`}
                </span>
              </PxButton>
              <PxButton
                variant="accent"
                disabled={rolling || p.gold < gold5}
                onClick={() => handlePull('gold', 5)}
              >
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Sparkles className="size-3" aria-hidden />
                  {rolling ? 'กำลังสุ่ม...' : `5 ครั้ง · ${formatNum(gold5)} G`}
                </span>
              </PxButton>
            </div>
          </div>

          <div className="space-y-2 border-2 border-cyan-400/40 bg-cyan-950/20 p-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-200">สุ่มด้วยเพชร (Diamond)</span>
              <span className="text-[10px] text-cyan-300/80">สุ่ม x5 ประหยัด 9%</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <PxButton
                variant="primary"
                disabled={rolling || (p.diamonds ?? 0) < dia1}
                onClick={() => handlePull('diamond', 1)}
              >
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Gem className="size-3" aria-hidden />
                  {rolling ? 'กำลังสุ่ม...' : `1 ครั้ง · ${formatNum(dia1)} เพชร`}
                </span>
              </PxButton>
              <PxButton
                variant="accent"
                disabled={rolling || (p.diamonds ?? 0) < dia5}
                onClick={() => handlePull('diamond', 5)}
              >
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Sparkles className="size-3" aria-hidden />
                  {rolling ? 'กำลังสุ่ม...' : `5 ครั้ง · ${formatNum(dia5)} เพชร`}
                </span>
              </PxButton>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          เมื่อสุ่มได้ปีกซ้ำ ระบบจะแปลงเป็น Gold (250–25,000 G) และหินตีบวก (1–50 ก้อน) ตามระดับความหายากให้อัตโนมัติ และปีกที่สุ่มได้สามารถสวมใส่ได้ทันทีแม้ไม่มี VIP
        </p>

        {notice && (
          <div
            role="status"
            className={cn(
              'border px-3 py-2 font-semibold',
              notice.ok
                ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-400/60 bg-rose-500/10 text-rose-200',
            )}
          >
            {notice.text}
          </div>
        )}

        {/* Latest Pull Results */}
        {lastBatch && lastBatch.results.length > 0 && (
          <div className="space-y-2 border-2 border-fuchsia-400/50 bg-[#120d22] p-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-fuchsia-200">
                ผลการสุ่มล่าสุด ({lastBatch.results.length} ชิ้น)
              </span>
              <span className="text-[10px] text-muted-foreground">
                กดปุ่ม &quot;สวมใส่ทันที&quot; เพื่อติดปีกบนตัวละครได้เลย
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {lastBatch.results.map((item, idx) => {
                const isEquipped = equippedLoadout.wings === item.fashionId
                return (
                  <div
                    key={`${item.fashionId}-${idx}`}
                    className={cn(
                      'flex items-center gap-2 border p-2',
                      item.isNew
                        ? 'border-emerald-400/70 bg-emerald-500/10'
                        : 'border-border bg-background/70',
                    )}
                  >
                    <div
                      className="grid size-11 shrink-0 place-items-center overflow-hidden rounded border bg-[#0d1220]"
                      style={{ borderColor: item.def.primaryColor }}
                    >
                      <img
                        src={item.def.iconAsset ?? `/assets/fashion/icons/${item.fashionId}.png`}
                        alt={item.def.name}
                        className="size-10 object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className={cn('border px-1 py-0.2 text-[9px] font-bold', rarityBadgeClass(item.rarity))}>
                          {item.rarity}
                        </span>
                        <span
                          className={cn(
                            'rounded px-1 text-[9px] font-bold',
                            item.isNew ? 'bg-emerald-500/30 text-emerald-200' : 'bg-amber-500/20 text-amber-200',
                          )}
                        >
                          {item.isNew ? 'ใหม่!' : `+${formatNum(item.duplicateGold)}G / +${item.duplicateStones}หิน`}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate font-bold text-foreground">{item.def.name}</p>
                      <button
                        type="button"
                        onClick={() => handleQuickEquip(item.fashionId)}
                        className={cn(
                          'mt-1 rounded border px-2 py-0.5 text-[10px] font-semibold',
                          isEquipped
                            ? 'border-cyan-400 bg-cyan-500/25 text-cyan-200'
                            : 'border-primary/60 bg-primary/20 text-primary hover:bg-primary/30',
                        )}
                      >
                        {isEquipped ? 'กำลังสวม (คลิกเพื่อถอด)' : 'สวมใส่ทันที'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Pool List Header + Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2">
          <span className="font-bold text-foreground">
            ตารางไอเทมและอัตราดรอปทั้งหมด ({shownPool.length}/{WING_GACHA_POOL.length} แบบ · รวม 100%)
          </span>
          <button
            type="button"
            onClick={() => setOnlyUnowned((v) => !v)}
            className={cn(
              'rounded border px-2 py-0.5 text-[10.5px] font-semibold',
              onlyUnowned
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                : 'border-border bg-secondary/70 text-muted-foreground hover:text-foreground',
            )}
          >
            {onlyUnowned ? 'แสดงเฉพาะปีกที่ยังไม่มี' : `แสดงปีกทั้งหมด (${WING_GACHA_POOL.length} แบบ)`}
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {shownPool.map((entry) => {
            const owned = unlockedSet.has(entry.fashionId)
            const equipped = equippedLoadout.wings === entry.fashionId
            const dup = getWingDuplicateReward(entry.rarity)

            return (
              <div
                key={entry.fashionId}
                className={cn(
                  'flex items-center gap-2.5 border-2 p-2',
                  equipped
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : owned
                      ? 'border-emerald-500/40 bg-emerald-950/15'
                      : 'border-border bg-background/70',
                )}
              >
                <div
                  className="grid size-12 shrink-0 place-items-center overflow-hidden rounded border-2 bg-[#0d1220]"
                  style={{ borderColor: entry.def.primaryColor }}
                >
                  <img
                    src={entry.def.iconAsset ?? `/assets/fashion/icons/${entry.fashionId}.png`}
                    alt={entry.def.name}
                    className="size-11 object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className={cn('border px-1.5 py-0.2 text-[9px] font-semibold', rarityBadgeClass(entry.rarity))}>
                      {entry.rarity}
                    </span>
                    <span className="text-[10px] font-bold text-primary tabular-nums">{entry.rate}%</span>
                    {entry.def.wingAnimSheetAsset && (
                      <span className="rounded bg-fuchsia-500/25 px-1 text-[9px] font-semibold text-fuchsia-200">
                        อนิเมชัน 16 เฟรม
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate font-bold text-foreground">{entry.def.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    ซ้ำ: +{formatNum(dup.gold)} G, +{dup.enhanceStones} หินตีบวก
                  </p>
                </div>
                {owned ? (
                  <button
                    type="button"
                    onClick={() => handleQuickEquip(entry.fashionId)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold',
                      equipped
                        ? 'border-cyan-400 bg-cyan-500/25 text-cyan-200'
                        : 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30',
                    )}
                  >
                    <CheckCircle2 className="size-3" aria-hidden />
                    {equipped ? 'กำลังสวม' : 'สวมใส่'}
                  </button>
                ) : (
                  <span className="shrink-0 rounded border border-border/70 px-2 py-1 text-[10px] text-muted-foreground">
                    ยังไม่ปลดล็อก
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex justify-end pt-1">
          <PxButton variant="secondary" onClick={closePanel}>
            ปิดหน้าต่าง
          </PxButton>
        </div>
      </div>
    </PanelFrame>
  )
}
