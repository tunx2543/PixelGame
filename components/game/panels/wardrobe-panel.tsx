'use client'

import { useMemo, useState } from 'react'
import { Coins, Crown, Eye, Gem, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { ITEMS } from '@/lib/game/data'
import {
  ensurePremiumState,
  equipCosmeticAction,
  equipFashionAction,
  openPanel,
  resolvePlayerFashionLoadout,
  unequipAllFashionAction,
  unlockCosmeticAction,
  unlockFashionShopItemAction,
} from '@/lib/game/engine'
import type { FashionLoadout } from '@/lib/game/fashion-renderer'
import { COSMETIC_DEFS, sanitizeExtV2 } from '@/lib/game/extended-systems'
import { PREMIUM_CATALOG } from '@/lib/game/premium/catalog'
import {
  FASHION_CHARACTER_SLOTS,
  FASHION_SLOT_LABELS,
  PREMIUM_FASHION_ITEMS,
  getFashionItemDef,
} from '@/lib/game/premium/fashion-pet'
import type { FashionSlot, PremiumRarity } from '@/lib/game/premium/types'
import { getEffectiveVipBonuses } from '@/lib/game/premium/vip'
import { playQuestClaimSfx } from '@/lib/game/sfx'
import type { Dir } from '@/lib/game/sprites'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { formatNum } from '../format'
import { SpriteModelCanvas, type PreviewAction } from '../sprite-model-canvas'
import { PanelFrame, PxButton } from './panels'

type WardrobeFilterTab = 'all' | FashionSlot | 'frame'

const DIR_LABELS: Array<{ dir: Dir; label: string }> = [
  { dir: 'down', label: 'หน้า' },
  { dir: 'left', label: 'ซ้าย' },
  { dir: 'right', label: 'ขวา' },
  { dir: 'up', label: 'หลัง' },
]

const ACTION_LABELS: Array<{ action: PreviewAction; label: string }> = [
  { action: 'idle', label: 'ยืน' },
  { action: 'walk', label: 'เดิน' },
  { action: 'attack', label: 'โจมตี' },
  { action: 'auto', label: 'อัตโนมัติ' },
]

function rarityClass(rarity: PremiumRarity): string {
  switch (rarity) {
    case 'เทพ':
      return 'border-amber-300 bg-gradient-to-r from-amber-500/35 via-rose-500/30 to-yellow-400/30 text-amber-100'
    case 'มายา':
      return 'border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-200'
    case 'ตำนาน':
      return 'border-amber-400/60 bg-amber-500/20 text-amber-200'
    case 'อีปิก':
      return 'border-violet-400/60 bg-violet-500/20 text-violet-200'
    case 'หายาก':
      return 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200'
    default:
      return 'border-border bg-muted text-muted-foreground'
  }
}

export function WardrobePanel() {
  const { p } = useGame()
  const [slotFilter, setSlotFilter] = useState<WardrobeFilterTab>('all')
  const [previewOverrides, setPreviewOverrides] = useState<Partial<Record<FashionSlot, string | null>>>({})
  const [previewDir, setPreviewDir] = useState<Dir>('down')
  const [previewAction, setPreviewAction] = useState<PreviewAction>('auto')
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const equippedLoadout = useMemo<FashionLoadout>(() => (p ? resolvePlayerFashionLoadout(p) : {}), [p])

  if (!p) return null

  const prem = ensurePremiumState(p)
  const extV2 = sanitizeExtV2(p.extV2)
  const vipBonuses = getEffectiveVipBonuses(prem.vip)

  const hasPreview = Object.keys(previewOverrides).length > 0
  const effectivePreviewLoadout: FashionLoadout = {
    ...equippedLoadout,
    ...previewOverrides,
  }

  const equippedCount = FASHION_CHARACTER_SLOTS.filter((slot) => Boolean(equippedLoadout[slot])).length
  const fashionItems =
    slotFilter === 'frame'
      ? []
      : slotFilter === 'all'
        ? PREMIUM_FASHION_ITEMS
        : PREMIUM_FASHION_ITEMS.filter((item) => item.slot === slotFilter)
  const frameCosmetics =
    slotFilter === 'all' || slotFilter === 'frame'
      ? COSMETIC_DEFS.filter((c) => c.slot === 'frame')
      : []

  const togglePreview = (slot: FashionSlot, fashionId: string) => {
    setPreviewOverrides((prev) => {
      if (prev[slot] === fashionId) {
        const next = { ...prev }
        delete next[slot]
        return next
      }
      return { ...prev, [slot]: fashionId }
    })
  }

  return (
    <PanelFrame
      title="ห้องแต่งตัวแฟชั่นครบส่วน (Wardrobe)"
      subtitle="ลองพรีวิวและสวมใส่แฟชั่นหลายส่วนพร้อมกัน แยกจากอุปกรณ์จริง 100% โดยไม่เปลี่ยนค่าสเตตัส"
    >
      <div className="space-y-3">
        {/* Live Preview Stage + Active Loadout Bar */}
        <div className="grid gap-3 border-2 border-border bg-muted/50 p-3 md:grid-cols-[200px_1fr]">
          <div className="flex flex-col items-center gap-2 border border-border bg-[#0d111f] p-2.5">
            <div className="flex w-full items-center justify-between text-[10px]">
              <span
                className={cn(
                  'rounded border px-1.5 py-0.5 font-semibold',
                  hasPreview
                    ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                    : 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200',
                )}
              >
                {hasPreview ? 'กำลังพรีวิวก่อนใส่' : 'ชุดที่สวมใส่จริง'}
              </span>
              {hasPreview && (
                <button
                  type="button"
                  onClick={() => setPreviewOverrides({})}
                  className="inline-flex items-center gap-0.5 text-[10px] text-amber-300 hover:underline"
                >
                  <RotateCcw className="size-3" aria-hidden />
                  ล้างพรีวิว
                </button>
              )}
            </div>

            <SpriteModelCanvas
              mode="job"
              id={p.jobId}
              action={previewAction}
              dir={previewDir}
              weaponOverride={p.equipment.weapon ? ITEMS[p.equipment.weapon.itemId]?.weaponType : undefined}
              weaponColorOverride={p.equipment.weapon ? ITEMS[p.equipment.weapon.itemId]?.color : undefined}
              fashion={effectivePreviewLoadout}
              size={112}
              isGm={p.gm}
              rebirthCount={p.rebirthCount ?? 0}
              label={`พรีวิวแฟชั่นของ ${p.name}`}
            />

            <div className="flex flex-wrap justify-center gap-1">
              {DIR_LABELS.map((item) => (
                <button
                  key={item.dir}
                  type="button"
                  onClick={() => setPreviewDir(item.dir)}
                  className={cn(
                    'rounded border px-1.5 py-0.5 text-[10px] font-semibold',
                    previewDir === item.dir
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-secondary/70 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-1">
              {ACTION_LABELS.map((item) => (
                <button
                  key={item.action}
                  type="button"
                  onClick={() => setPreviewAction(item.action)}
                  className={cn(
                    'rounded border px-1.5 py-0.5 text-[9.5px]',
                    previewAction === item.action
                      ? 'border-accent bg-accent/25 text-accent'
                      : 'border-border bg-background/60 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-2.5 text-xs">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                  <ShieldCheck className="size-4 shrink-0" aria-hidden />
                  <span className="font-semibold">
                    แฟชั่นแยกจากอุปกรณ์จริง — สวมใส่เพื่อเปลี่ยนรูปลักษณ์เท่านั้น ค่าสเตตัสคงเดิม
                  </span>
                </div>
                <div className="flex items-center gap-3 tabular-nums">
                  <span className="inline-flex items-center gap-1 font-bold text-gold">
                    <Coins className="size-3.5" aria-hidden /> {formatNum(p.gold)} G
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-cyan-200">
                    <Gem className="size-3.5" aria-hidden /> {formatNum(p.diamonds)} เพชร
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {FASHION_CHARACTER_SLOTS.map((slot) => {
                  const previewId = previewOverrides[slot]
                  const eqId = equippedLoadout[slot] ?? null
                  const shownId = previewId !== undefined ? previewId : eqId
                  const def = getFashionItemDef(shownId)
                  const isPreviewingSlot = previewId !== undefined && previewId !== eqId

                  return (
                    <div
                      key={slot}
                      className={cn(
                        'flex items-center justify-between gap-1.5 rounded border px-2 py-1 text-[10.5px]',
                        isPreviewingSlot
                          ? 'border-amber-400/70 bg-amber-500/15'
                          : eqId
                            ? 'border-cyan-400/45 bg-cyan-500/10'
                            : 'border-border/70 bg-background/60',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSlotFilter(slot)}
                        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                      >
                        {def?.iconAsset ? (
                          <img src={def.iconAsset} alt="" className="size-5 shrink-0 object-contain" />
                        ) : (
                          <span className="grid size-5 shrink-0 place-items-center rounded border border-border/50 bg-muted/50 text-[9px] text-muted-foreground">
                            -
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-[9.5px] text-muted-foreground">
                            {FASHION_SLOT_LABELS[slot].split('(')[0].trim()}
                            {isPreviewingSlot ? ' (พรีวิว)' : ''}
                          </span>
                          <span className="block truncate font-semibold text-foreground">
                            {def?.name ?? 'ยังไม่สวม'}
                          </span>
                        </span>
                      </button>
                      {eqId && (
                        <button
                          type="button"
                          title={`ถอด ${FASHION_SLOT_LABELS[slot]}`}
                          onClick={() => {
                            const res = equipFashionAction(slot, null)
                            setNotice({ ok: res.ok, text: res.message })
                          }}
                          className="shrink-0 rounded px-1 text-[10px] font-bold text-rose-300 hover:bg-rose-500/20"
                        >
                          ถอด
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
              <span className="text-[11px] text-muted-foreground">
                ปลดล็อกแล้ว {prem.fashion.unlockedIds.length}/{PREMIUM_FASHION_ITEMS.length} ชิ้น · กำลังสวมใส่ {equippedCount} ส่วน
              </span>
              <div className="flex flex-wrap gap-1.5">
                {hasPreview && (
                  <PxButton variant="secondary" onClick={() => setPreviewOverrides({})}>
                    รีเซ็ตพรีวิว
                  </PxButton>
                )}
                <PxButton
                  variant="secondary"
                  disabled={equippedCount === 0}
                  onClick={() => {
                    const res = unequipAllFashionAction()
                    setPreviewOverrides({})
                    setNotice({ ok: res.ok, text: res.message })
                  }}
                >
                  ถอดแฟชั่นทั้งหมด
                </PxButton>
              </div>
            </div>
          </div>
        </div>

        {/* Slot Filter Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-border/70 pb-2.5">
          <PxButton
            variant={slotFilter === 'all' ? 'primary' : 'secondary'}
            className="px-2.5 py-1 text-[11px]"
            onClick={() => setSlotFilter('all')}
          >
            ทั้งหมด ({PREMIUM_FASHION_ITEMS.length + COSMETIC_DEFS.filter((c) => c.slot === 'frame').length})
          </PxButton>
          {FASHION_CHARACTER_SLOTS.map((slot) => (
            <PxButton
              key={slot}
              variant={slotFilter === slot ? 'primary' : 'secondary'}
              className="px-2.5 py-1 text-[11px]"
              onClick={() => setSlotFilter(slot)}
            >
              {FASHION_SLOT_LABELS[slot].split('(')[0].trim()}
            </PxButton>
          ))}
          <PxButton
            variant={slotFilter === 'frame' ? 'primary' : 'secondary'}
            className="px-2.5 py-1 text-[11px]"
            onClick={() => setSlotFilter('frame')}
          >
            กรอบชื่อ
          </PxButton>
        </div>

        {notice && (
          <div
            role="status"
            className={cn(
              'border px-3 py-2 text-xs font-semibold',
              notice.ok
                ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-400/50 bg-rose-500/10 text-rose-200',
            )}
          >
            {notice.text}
          </div>
        )}

        {/* Fashion Item Grid */}
        <div className="grid gap-2.5 sm:grid-cols-2">
          {fashionItems.map((f) => {
            const isVipExclusive = vipBonuses.active && vipBonuses.exclusiveFashionIds.includes(f.id)
            const gachaUnlocked = Boolean(prem.fashion.gachaUnlockedIds?.includes(f.id))
            const unlocked = prem.fashion.unlockedIds.includes(f.id) || gachaUnlocked || isVipExclusive || Boolean(f.freeStarter)
            const equipped = equippedLoadout[f.slot] === f.id
            const isPreviewing = previewOverrides[f.slot] === f.id
            const vipBlocked = !gachaUnlocked && Boolean(f.vipRequired && (!vipBonuses.active || vipBonuses.level < f.vipRequired))
            const linkedProd = PREMIUM_CATALOG.find(
              (prod) => prod.payload?.fashionId === f.id || prod.itemId === f.linkedGemItemId,
            )

            return (
              <div
                key={f.id}
                className={cn(
                  'flex flex-col justify-between gap-2.5 border-2 p-3 text-xs transition-colors',
                  equipped
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : isPreviewing
                      ? 'border-amber-400 bg-amber-500/10'
                      : 'border-border bg-background/70',
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="grid size-12 shrink-0 place-items-center overflow-hidden rounded border-2 bg-[#0d1220]"
                    style={{ borderColor: f.primaryColor }}
                  >
                    <img
                      src={f.iconAsset ?? `/assets/fashion/icons/${f.id}.png`}
                      alt={f.name}
                      className="size-11 object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate font-bold text-foreground">{f.name}</p>
                      <span className={cn('border px-1.5 py-0.5 text-[9px] font-semibold', rarityClass(f.rarity))}>
                        {f.rarity}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-primary">
                      {FASHION_SLOT_LABELS[f.slot].split('(')[0].trim()} · ไม่เปลี่ยนค่าสเตตัส
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{f.description}</p>
                    {f.vipRequired && (
                      <p className="mt-0.5 text-[10px] font-semibold text-amber-300">
                        สิทธิ์ VIP {f.vipRequired}+
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-border/50 pt-2">
                  <button
                    type="button"
                    onClick={() => togglePreview(f.slot, f.id)}
                    className={cn(
                      'pixel-btn inline-flex items-center gap-1 px-2.5 py-1 text-[11px]',
                      isPreviewing
                        ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400'
                        : 'bg-secondary text-foreground hover:brightness-110',
                    )}
                  >
                    <Eye className="size-3" aria-hidden />
                    {isPreviewing ? 'ปิดพรีวิว' : 'พรีวิว'}
                  </button>

                  {unlocked ? (
                    <PxButton
                      variant={equipped ? 'secondary' : 'accent'}
                      disabled={vipBlocked}
                      onClick={() => {
                        const res = equipFashionAction(f.slot, equipped ? null : f.id)
                        if (res.ok) {
                          playQuestClaimSfx(false)
                          setPreviewOverrides((prev) => {
                            if (!(f.slot in prev)) return prev
                            const next = { ...prev }
                            delete next[f.slot]
                            return next
                          })
                        }
                        setNotice({ ok: res.ok, text: res.message })
                      }}
                    >
                      {vipBlocked ? `ต้องมี VIP ${f.vipRequired}` : equipped ? 'ถอดออก' : 'สวมใส่'}
                    </PxButton>
                  ) : f.goldPrice ? (
                    <PxButton
                      variant="primary"
                      disabled={p.gold < f.goldPrice}
                      onClick={() => {
                        const res = unlockFashionShopItemAction(f.id)
                        if (res.ok) playQuestClaimSfx(true)
                        setNotice({ ok: res.ok, text: res.message })
                      }}
                    >
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Coins className="size-3 text-gold" aria-hidden />
                        ซื้อ {formatNum(f.goldPrice)} G
                      </span>
                    </PxButton>
                  ) : f.diamondPrice ? (
                    <PxButton
                      variant="primary"
                      disabled={(p.diamonds ?? 0) < f.diamondPrice}
                      onClick={() => {
                        const res = unlockFashionShopItemAction(f.id)
                        if (res.ok) playQuestClaimSfx(true)
                        setNotice({ ok: res.ok, text: res.message })
                      }}
                    >
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Gem className="size-3 text-cyan-200" aria-hidden />
                        ซื้อ {formatNum(f.diamondPrice)} เพชร
                      </span>
                    </PxButton>
                  ) : f.gachaOnly ? (
                    <PxButton variant="secondary" onClick={() => openPanel('wing-gacha')}>
                      สุ่มได้ที่ตู้ปีกน้ำพุเมือง
                    </PxButton>
                  ) : linkedProd ? (
                    <PxButton variant="secondary" onClick={() => openPanel('gem-shop')}>
                      ดูในร้านค้า ({formatNum(linkedProd.diamondPrice)} เพชร)
                    </PxButton>
                  ) : (
                    <PxButton variant="secondary" onClick={() => openPanel('gem-shop')}>
                      {f.vipRequired ? `ปลดล็อก VIP ${f.vipRequired}+` : 'ดูร้านค้า/กิจกรรม'}
                    </PxButton>
                  )}
                </div>
              </div>
            )
          })}

          {frameCosmetics.map((cos) => {
            const owned = extV2.unlockedCosmetics.includes(cos.id)
            const equipped = extV2.equippedFrame === cos.id
            const canAfford =
              (cos.goldCost ? p.gold >= cos.goldCost : true) &&
              (cos.diamondCost > 0 ? p.diamonds >= cos.diamondCost : true)

            return (
              <div
                key={cos.id}
                className={cn(
                  'flex flex-col justify-between gap-2.5 border-2 p-3 text-xs',
                  equipped ? 'border-cyan-400 bg-cyan-500/10' : 'border-border bg-background/70',
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="grid size-12 shrink-0 place-items-center overflow-hidden rounded border-2 bg-[#0d1220]"
                    style={{ borderColor: cos.primaryColor }}
                  >
                    <img
                      src={`/assets/fashion/icons/${cos.id}.png`}
                      alt={cos.name}
                      className="size-11 object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-bold text-foreground">{cos.name}</p>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-300">
                        <Crown className="size-3" aria-hidden /> กรอบชื่อ
                      </span>
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
                          const res = equipCosmeticAction('frame', equipped ? null : cos.id)
                          playQuestClaimSfx(false)
                          setNotice({ ok: res.ok, text: res.message })
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
                        setNotice({ ok: res.ok, text: res.message })
                      }}
                    >
                      <span className="flex items-center justify-center gap-1.5 tabular-nums">
                        ปลดล็อก ({cos.goldCost ? `${formatNum(cos.goldCost)} G` : `${cos.diamondCost} เพชร`})
                      </span>
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
