'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Backpack, Clock, Coins, Gift, KeyRound, LockOpen, RotateCw, Sparkles, X, Zap } from 'lucide-react'
import {
  ITEM_CATEGORY_THAI_LABEL,
  ITEM_ELEMENT_THAI_LABEL,
  type ItemCategory,
} from '@/lib/game/item-vfx'
import {
  EQUIPMENT_RARITY_META,
  EQUIPMENT_RARITY_ORDER,
  formatAffixLabel,
} from '@/lib/game/mmo-systems'
import { isSfxMuted, playEnhanceSfx, playLevelUpSfx, playVictorySfx } from '@/lib/game/sfx'
import {
  CHEST_TIERS,
  CHEST_TIER_ORDER,
  CHEST_TIER_SPRITE_CROPS,
  DAILY_FREE_CHEST_TIER_ID,
  calculateChestRarityProbabilities,
  claimDailyFreeTreasureChest,
  formatCooldownDuration,
  getDailyFreeChestStatus,
  rollTreasureChestReward,
  summarizeTreasureChestRewards,
  type ChestPaymentMode,
  type ChestTierDef,
  type ChestTierId,
  type ClaimDailyFreeChestResult,
  type OpenMultipleTreasureChestsResult,
  type OpenTreasureChestResult,
  type TreasureChestReward,
} from '@/lib/game/treasure-chest'
import { cn } from '@/lib/utils'
import { formatNum } from './format'
import { ChestArtworkSprite } from './chest-artwork'
import { ItemIcon } from './item-icon'
import { ItemVfxBox } from './item-vfx'

const DAILY_CHEST_FALLBACK_STORAGE_KEY = 'pixel_quest_daily_free_chest_at'

type ChestPhase = 'idle' | 'opening' | 'revealed'

const CHEST_OPEN_ANIMATION_MS = 780

const CHEST_CATEGORY_OPTIONS: ReadonlyArray<{ id: 'all' | ItemCategory; label: string }> = [
  { id: 'all', label: 'สุ่มทุกประเภท' },
  { id: 'weapon', label: 'อาวุธ' },
  { id: 'helmet', label: 'หมวก' },
  { id: 'armor', label: 'เสื้อเกราะ' },
  { id: 'gloves', label: 'ถุงมือ' },
  { id: 'boots', label: 'รองเท้า' },
  { id: 'shield', label: 'โล่' },
  { id: 'ring', label: 'แหวน' },
  { id: 'necklace', label: 'สร้อย' },
  { id: 'charm', label: 'เครื่องราง' },
  { id: 'special', label: 'พิเศษ' },
]

interface ChestPalette {
  outline: string
  bodyDark: string
  bodyMid: string
  bodyLight: string
  trimDark: string
  trimMid: string
  trimLight: string
  gem: string
  gemGlow: string
  interior: string
  gold: string
}

const CHEST_PALETTES: Record<ChestTierId, ChestPalette> = {
  wooden: {
    outline: '#16110e',
    bodyDark: '#5c3317',
    bodyMid: '#8b4f24',
    bodyLight: '#b9743c',
    trimDark: '#475569',
    trimMid: '#94a3b8',
    trimLight: '#cbd5e1',
    gem: '#fbbf24',
    gemGlow: '#fef08a',
    interior: '#26140c',
    gold: '#f59e0b',
  },
  silver: {
    outline: '#0f172a',
    bodyDark: '#1e3a5f',
    bodyMid: '#2c5282',
    bodyLight: '#4a7bb5',
    trimDark: '#64748b',
    trimMid: '#cbd5e1',
    trimLight: '#f8fafc',
    gem: '#38bdf8',
    gemGlow: '#bae6fd',
    interior: '#0f1d32',
    gold: '#60a5fa',
  },
  golden: {
    outline: '#1a1007',
    bodyDark: '#7c2d12',
    bodyMid: '#b45309',
    bodyLight: '#d97706',
    trimDark: '#92400e',
    trimMid: '#fbbf24',
    trimLight: '#fef08a',
    gem: '#ef4444',
    gemGlow: '#fecaca',
    interior: '#3b1508',
    gold: '#fbbf24',
  },
  mythic: {
    outline: '#16091b',
    bodyDark: '#5b0c1c',
    bodyMid: '#9f1239',
    bodyLight: '#e11d48',
    trimDark: '#92400e',
    trimMid: '#fbbf24',
    trimLight: '#fef08a',
    gem: '#f43f5e',
    gemGlow: '#fef08a',
    interior: '#260612',
    gold: '#fde047',
  },
}

export function PixelChestCanvas({
  tierId,
  open,
  size = 112,
  className,
}: {
  tierId: ChestTierId
  open: boolean
  size?: number
  className?: string
}) {
  const crop = CHEST_TIER_SPRITE_CROPS[tierId] ?? CHEST_TIER_SPRITE_CROPS.wooden
  const tierDef = CHEST_TIERS[tierId] ?? CHEST_TIERS.wooden

  return (
    <ChestArtworkSprite
      crop={crop}
      alt={`${tierDef.tierBadgeTh} (${tierDef.name})`}
      size={size}
      open={open}
      testId={`chest-artwork-${tierId}`}
      dataTier={tierId}
      className={className}
    />
  )
}

export function TreasureChestRewardScreen({
  reward,
  onClose,
  onOpenAgain,
  canOpenAgain = true,
  inventoryHref,
}: {
  reward: TreasureChestReward
  onClose: () => void
  onOpenAgain?: () => void
  canOpenAgain?: boolean
  inventoryHref?: string
}) {
  const { item } = reward
  const rarityMeta = EQUIPMENT_RARITY_META[item.rarity] ?? EQUIPMENT_RARITY_META.common
  const categoryLabel = ITEM_CATEGORY_THAI_LABEL[item.category] ?? item.category
  const elementInfo = ITEM_ELEMENT_THAI_LABEL[item.element]
  const elementLabel = elementInfo?.label ?? item.element

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  const statRows = [
    item.stats.atk > 0 ? { label: 'พลังโจมตี (ATK)', val: `+${formatNum(item.stats.atk)}` } : null,
    item.stats.def > 0 ? { label: 'พลังป้องกัน (DEF)', val: `+${formatNum(item.stats.def)}` } : null,
    item.stats.hp > 0 ? { label: 'HP สูงสุด', val: `+${formatNum(item.stats.hp)}` } : null,
    item.stats.critPct > 0 ? { label: 'โอกาสคริติคอล', val: `+${item.stats.critPct}%` } : null,
    item.stats.speedBonus > 0 ? { label: 'ความเร็วเคลื่อนที่', val: `+${item.stats.speedBonus}` } : null,
    item.stats.heal > 0 ? { label: 'ฟื้นฟู HP', val: `+${formatNum(item.stats.heal)}` } : null,
    item.stats.mana > 0 ? { label: 'ฟื้นฟู MP', val: `+${formatNum(item.stats.mana)}` } : null,
  ].filter((row): row is { label: string; val: string } => Boolean(row))

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ผลรางวัลจากการเปิดหีบสมบัติ"
      data-testid="treasure-reward-modal"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-3 sm:p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.section
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-xl border-2 bg-[#0e1522] text-slate-100 shadow-2xl',
          rarityMeta.borderColorClass,
        )}
      >
        <header className="flex items-center justify-between border-b border-slate-700/80 bg-[#131d2e] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <PixelChestCanvas tierId={reward.chestTierId} open size={38} />
            <div className="min-w-0">
              <p className="text-xs text-slate-400">{reward.chestName}</p>
              <h2 className={cn('truncate text-base font-bold sm:text-lg', rarityMeta.textColorClass)}>
                ได้รับรางวัลระดับ {rarityMeta.thaiLabel} ({rarityMeta.label})
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างรางวัล"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500 hover:text-white"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* Hero Reward Reveal Showcase */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative flex items-center justify-center py-2">
              <ItemVfxBox
                itemId={item.itemId}
                rarity={item.rarity}
                element={item.element}
                size="lg"
                className="size-24 p-2 sm:size-28"
              >
                <ItemIcon itemId={item.itemId} size={64} className="size-16 sm:size-20" />
                {item.plus > 0 && (
                  <span className="absolute left-1.5 top-1 z-30 rounded bg-slate-950/90 px-1.5 py-0.5 text-xs font-extrabold text-amber-300 tabular-nums">
                    +{item.plus}
                  </span>
                )}
              </ItemVfxBox>
            </div>

            <div className="space-y-1">
              <h3 className={cn('text-lg font-extrabold text-balance sm:text-xl', rarityMeta.textColorClass)}>
                {item.name}
                {item.plus > 0 ? ` +${item.plus}` : ''}
              </h3>
              <p className="text-xs text-slate-300">
                <span>Lv.{item.reqLevel}</span>
                <span aria-hidden="true"> · </span>
                <span>{categoryLabel}</span>
                <span aria-hidden="true"> · </span>
                <span className={rarityMeta.textColorClass}>{rarityMeta.thaiLabel}</span>
                <span aria-hidden="true"> · </span>
                <span>{elementLabel}</span>
              </p>
              <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-300">
                {item.description}
              </p>
            </div>
          </div>

          {/* Stats & Bonus Readout */}
          <div className="space-y-3 border-t border-slate-800 pt-3">
            {statRows.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {statRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-2 border-b border-slate-800/70 pb-1">
                    <dt className="text-slate-400">{row.label}</dt>
                    <dd className="font-bold text-emerald-300 tabular-nums">{row.val}</dd>
                  </div>
                ))}
              </dl>
            )}

            {item.affixes.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-sky-300">ออปชันเสริม ({item.affixes.length} แถว)</p>
                <ul className="grid grid-cols-1 gap-1 text-xs text-slate-200 sm:grid-cols-2">
                  {item.affixes.map((affix, idx) => (
                    <li key={`${affix.stat}-${idx}`} className="tabular-nums text-amber-200">
                      • {formatAffixLabel(affix)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2.5 text-xs">
              <div className="flex items-center gap-1.5 text-amber-300 tabular-nums">
                <Coins className="size-4 shrink-0" aria-hidden />
                <span>โบนัสทองคำจากหีบ: +{formatNum(reward.goldBonus)} G</span>
              </div>
              <span className="text-slate-300 tabular-nums">
                ราคาขาย: {formatNum(item.sellPrice)} G
              </span>
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 bg-[#121a28] px-4 py-3">
          {inventoryHref && (
            <Link
              href={inventoryHref}
              onClick={onClose}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 whitespace-nowrap hover:border-sky-400 hover:text-white"
            >
              <Backpack className="size-4" aria-hidden />
              ดูในคลังไอเทม
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 whitespace-nowrap hover:border-slate-400"
          >
            รับเข้ากระเป๋า & ปิด
          </button>
          {onOpenAgain && (
            <button
              type="button"
              disabled={!canOpenAgain}
              onClick={onOpenAgain}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-extrabold text-slate-950 whitespace-nowrap hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <RotateCw className="size-4" aria-hidden />
              เปิดหีบอีกครั้ง
            </button>
          )}
        </footer>
      </motion.section>
    </div>
  )
}

export function TreasureChestBatchRewardScreen({
  rewards,
  stoppedEarlyReason,
  onClose,
  onOpenBatchAgain,
  canOpenBatchAgain = true,
  inventoryHref,
}: {
  rewards: TreasureChestReward[]
  stoppedEarlyReason?: string
  onClose: () => void
  onOpenBatchAgain?: () => void
  canOpenBatchAgain?: boolean
  inventoryHref?: string
}) {
  const summary = useMemo(() => summarizeTreasureChestRewards(rewards), [rewards])
  const bestIndex = useMemo(() => {
    let bestIdx = 0
    let bestRank = -1
    rewards.forEach((r, idx) => {
      const rank = EQUIPMENT_RARITY_ORDER.indexOf(r.item.rarity)
      if (rank > bestRank) {
        bestRank = rank
        bestIdx = idx
      }
    })
    return bestIdx
  }, [rewards])

  const [selectedIndex, setSelectedIndex] = useState<number>(bestIndex)
  useEffect(() => {
    setSelectedIndex(bestIndex)
  }, [bestIndex, rewards])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  const selectedReward = rewards[selectedIndex] ?? rewards[0]
  if (!selectedReward) return null

  const highestMeta = EQUIPMENT_RARITY_META[summary.highestRarity] ?? EQUIPMENT_RARITY_META.common
  const selectedItem = selectedReward.item
  const selectedRarityMeta = EQUIPMENT_RARITY_META[selectedItem.rarity] ?? EQUIPMENT_RARITY_META.common
  const selectedCatLabel = ITEM_CATEGORY_THAI_LABEL[selectedItem.category] ?? selectedItem.category
  const selectedElemLabel = ITEM_ELEMENT_THAI_LABEL[selectedItem.element]?.label ?? selectedItem.element

  const nonZeroRarities = EQUIPMENT_RARITY_ORDER.filter((r) => summary.rarityCounts[r] > 0)

  const selectedStats = [
    selectedItem.stats.atk > 0 ? `ATK +${formatNum(selectedItem.stats.atk)}` : null,
    selectedItem.stats.def > 0 ? `DEF +${formatNum(selectedItem.stats.def)}` : null,
    selectedItem.stats.hp > 0 ? `HP +${formatNum(selectedItem.stats.hp)}` : null,
    selectedItem.stats.critPct > 0 ? `CRIT +${selectedItem.stats.critPct}%` : null,
    selectedItem.stats.speedBonus > 0 ? `SPD +${selectedItem.stats.speedBonus}` : null,
    selectedItem.stats.heal > 0 ? `ฟื้นฟู HP +${formatNum(selectedItem.stats.heal)}` : null,
    selectedItem.stats.mana > 0 ? `ฟื้นฟู MP +${formatNum(selectedItem.stats.mana)}` : null,
  ].filter((val): val is string => Boolean(val))

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="สรุปรางวัล Quick Open x10"
      data-testid="treasure-batch-reward-modal"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-3 sm:p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.section
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border-2 bg-[#0e1522] text-slate-100 shadow-2xl',
          highestMeta.borderColorClass,
        )}
      >
        <header className="flex items-center justify-between border-b border-slate-700/80 bg-[#131d2e] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <PixelChestCanvas tierId={selectedReward.chestTierId} open size={38} />
            <div className="min-w-0">
              <p className="text-xs text-slate-400">
                {selectedReward.chestName} · เปิดต่อเนื่อง {summary.totalCount} ครั้ง
              </p>
              <h2 className={cn('truncate text-base font-bold sm:text-lg', highestMeta.textColorClass)}>
                สรุปรางวัล Quick Open x{summary.totalCount} (สูงสุดระดับ{highestMeta.thaiLabel})
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างสรุปรางวัล x10"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500 hover:text-white"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* Batch Summary Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#121a29] px-3.5 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-3 tabular-nums">
              <span className="font-bold text-slate-100">
                ได้รับไอเทมทั้งหมด {summary.totalCount} ชิ้น
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                <Coins className="size-3.5" aria-hidden />
                โบนัสทองรวม +{formatNum(summary.totalGoldBonus)} G
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-[11px] tabular-nums">
              {nonZeroRarities.map((rarity) => {
                const meta = EQUIPMENT_RARITY_META[rarity]
                return (
                  <span key={rarity} className={cn('font-semibold', meta.textColorClass)}>
                    {meta.thaiLabel} ×{summary.rarityCounts[rarity]}
                  </span>
                )
              })}
            </div>
          </div>

          {stoppedEarlyReason && (
            <p className="rounded-lg border border-amber-500/50 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
              หยุดเปิดอัตโนมัติหลังได้รับ {summary.totalCount} ชิ้น: {stoppedEarlyReason}
            </p>
          )}

          {/* 10-Reward Summary Grid */}
          <div
            data-testid="treasure-batch-grid"
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-5"
          >
            {rewards.map((entry, idx) => {
              const rMeta = EQUIPMENT_RARITY_META[entry.item.rarity] ?? EQUIPMENT_RARITY_META.common
              const isSelected = idx === selectedIndex
              return (
                <button
                  key={`${entry.item.uid}-${idx}`}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border bg-slate-900/75 p-2.5 text-center transition-colors',
                    isSelected
                      ? 'border-amber-400 bg-amber-500/12 ring-1 ring-amber-400/50'
                      : cn('hover:border-slate-500', rMeta.borderColorClass),
                  )}
                >
                  <div className="flex w-full items-center justify-between text-[10px] tabular-nums">
                    <span className="font-semibold text-slate-400">#{idx + 1}</span>
                    {entry.item.plus > 0 ? (
                      <span className="font-extrabold text-amber-300">+{entry.item.plus}</span>
                    ) : (
                      <span className="text-slate-500">Lv.{entry.item.reqLevel}</span>
                    )}
                  </div>

                  <ItemVfxBox
                    itemId={entry.item.itemId}
                    rarity={entry.item.rarity}
                    element={entry.item.element}
                    size="sm"
                    className="size-14 p-1"
                  >
                    <ItemIcon itemId={entry.item.itemId} size={42} />
                  </ItemVfxBox>

                  <div className="w-full space-y-0.5">
                    <p className={cn('truncate text-xs font-bold', rMeta.textColorClass)}>
                      {entry.item.name}
                    </p>
                    <p className="text-[10.5px] text-slate-400 tabular-nums">
                      <span className={rMeta.textColorClass}>{rMeta.thaiLabel}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="text-amber-300">+{formatNum(entry.goldBonus)}G</span>
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Selected Item Inspector */}
          <div
            data-testid="treasure-batch-inspector"
            className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#111927] p-3.5 sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-3">
              <ItemVfxBox
                itemId={selectedItem.itemId}
                rarity={selectedItem.rarity}
                element={selectedItem.element}
                size="md"
                className="size-16 shrink-0 p-1.5"
              >
                <ItemIcon itemId={selectedItem.itemId} size={48} />
              </ItemVfxBox>
              <div className="min-w-0 space-y-0.5">
                <p className={cn('text-sm font-extrabold', selectedRarityMeta.textColorClass)}>
                  #{selectedIndex + 1} {selectedItem.name}
                  {selectedItem.plus > 0 ? ` +${selectedItem.plus}` : ''}
                </p>
                <p className="text-xs text-slate-300">
                  Lv.{selectedItem.reqLevel} · {selectedCatLabel} · {selectedRarityMeta.thaiLabel} · {selectedElemLabel}
                </p>
                <p className="text-[11px] text-slate-400">{selectedItem.description}</p>
              </div>
            </div>

            <div className="flex flex-1 flex-wrap items-center justify-start gap-x-4 gap-y-1 border-t border-slate-800 pt-2 text-xs sm:justify-end sm:border-t-0 sm:pt-0">
              {selectedStats.map((stat) => (
                <span key={stat} className="font-bold text-emerald-300 tabular-nums">
                  {stat}
                </span>
              ))}
              {selectedItem.affixes.map((affix, idx) => (
                <span key={`${affix.stat}-${idx}`} className="text-amber-200 tabular-nums">
                  {formatAffixLabel(affix)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 bg-[#121a28] px-4 py-3">
          {inventoryHref && (
            <Link
              href={inventoryHref}
              onClick={onClose}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 whitespace-nowrap hover:border-sky-400 hover:text-white"
            >
              <Backpack className="size-4" aria-hidden />
              ดูในคลังไอเทม
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 whitespace-nowrap hover:border-slate-400"
          >
            รับทั้งหมดเข้ากระเป๋า & ปิด
          </button>
          {onOpenBatchAgain && (
            <button
              type="button"
              disabled={!canOpenBatchAgain}
              onClick={onOpenBatchAgain}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-extrabold text-slate-950 whitespace-nowrap hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Zap className="size-4" aria-hidden />
              Quick Open x10 อีกครั้ง
            </button>
          )}
        </footer>
      </motion.section>
    </div>
  )
}

export function TreasureChest({
  gold = 5000,
  keyCount = 0,
  playerLevel = 100,
  inventoryCount = 0,
  maxInventorySlots = 80,
  lastDailyFreeChestAt,
  onOpenChest,
  onOpenChestBatch,
  onClaimDailyFreeChest,
  inventoryHref,
  compact = false,
}: {
  gold?: number
  keyCount?: number
  playerLevel?: number
  inventoryCount?: number
  maxInventorySlots?: number
  lastDailyFreeChestAt?: number | null
  onOpenChest?: (params: {
    tierId: ChestTierId
    paymentMode: ChestPaymentMode
    category?: ItemCategory
  }) => OpenTreasureChestResult | Promise<OpenTreasureChestResult>
  onOpenChestBatch?: (params: {
    tierId: ChestTierId
    paymentMode: ChestPaymentMode
    category?: ItemCategory
    count: number
  }) => OpenMultipleTreasureChestsResult | Promise<OpenMultipleTreasureChestsResult>
  onClaimDailyFreeChest?: (params: {
    category?: ItemCategory
  }) => ClaimDailyFreeChestResult | Promise<ClaimDailyFreeChestResult>
  inventoryHref?: string
  compact?: boolean
}) {
  const [selectedTier, setSelectedTier] = useState<ChestTierId>(() => {
    if (gold >= CHEST_TIERS.golden.costGold || keyCount >= (CHEST_TIERS.golden.keyQty ?? 1)) {
      return 'golden'
    }
    if (gold >= CHEST_TIERS.silver.costGold) return 'silver'
    return 'wooden'
  })
  const [paymentMode, setPaymentMode] = useState<ChestPaymentMode>('gold')
  const [selectedCategory, setSelectedCategory] = useState<'all' | ItemCategory>('all')
  const [phase, setPhase] = useState<ChestPhase>('idle')
  const [openSeq, setOpenSeq] = useState(0)
  const [activeReward, setActiveReward] = useState<TreasureChestReward | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [batchRewards, setBatchRewards] = useState<TreasureChestReward[]>([])
  const [batchStopReason, setBatchStopReason] = useState<string | undefined>(undefined)
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [history, setHistory] = useState<TreasureChestReward[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [localDailyClaimedAt, setLocalDailyClaimedAt] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState<number>(() => Date.now())
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (onClaimDailyFreeChest || typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(DAILY_CHEST_FALLBACK_STORAGE_KEY)
      const parsed = raw ? Number(raw) : NaN
      if (Number.isFinite(parsed) && parsed > 0) {
        setLocalDailyClaimedAt(parsed)
      }
    } catch {
      // Ignore storage errors
    }
  }, [onClaimDailyFreeChest])

  const effectiveDailyClaimedAt = onClaimDailyFreeChest
    ? (lastDailyFreeChestAt ?? null)
    : (lastDailyFreeChestAt ?? localDailyClaimedAt)

  const dailyStatus = useMemo(
    () => getDailyFreeChestStatus(effectiveDailyClaimedAt, nowMs),
    [effectiveDailyClaimedAt, nowMs],
  )

  useEffect(() => {
    if (dailyStatus.isAvailable) return
    const id = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)
    return () => window.clearInterval(id)
  }, [dailyStatus.isAvailable, effectiveDailyClaimedAt])

  const tierDef: ChestTierDef = CHEST_TIERS[selectedTier]
  const tierPalette = CHEST_PALETTES[selectedTier] ?? CHEST_PALETTES.wooden
  const supportsKey = Boolean(tierDef.keyItemId && (tierDef.keyQty ?? 0) > 0)
  const effectivePaymentMode: ChestPaymentMode =
    supportsKey && paymentMode === 'key' ? 'key' : 'gold'

  const bagFull = inventoryCount >= maxInventorySlots
  const rarityProbabilities = useMemo(
    () => calculateChestRarityProbabilities(selectedTier),
    [selectedTier],
  )
  const canAfford = useMemo(() => {
    if (bagFull) return false
    if (effectivePaymentMode === 'key') {
      return keyCount >= (tierDef.keyQty ?? 1)
    }
    return gold >= tierDef.costGold
  }, [bagFull, effectivePaymentMode, gold, keyCount, tierDef.costGold, tierDef.keyQty])

  const canAffordTen = useMemo(() => {
    if (bagFull) return false
    if (effectivePaymentMode === 'key') {
      return keyCount >= (tierDef.keyQty ?? 1) * 10
    }
    return gold >= tierDef.costGold * 10
  }, [bagFull, effectivePaymentMode, gold, keyCount, tierDef.costGold, tierDef.keyQty])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  const triggerOpen = useCallback(() => {
    if (phase === 'opening') return
    if (!canAfford) {
      if (bagFull) {
        setErrorMsg('กระเป๋าเต็ม กรุณาเคลียร์ช่องเก็บของก่อนเปิดหีบ')
      } else if (effectivePaymentMode === 'key') {
        setErrorMsg(`กุญแจทองคำราชันย์ไม่พอ (ต้องการ ${tierDef.keyQty ?? 1} ดอก)`)
      } else {
        setErrorMsg(`ทองคำไม่พอ (ต้องการ ${formatNum(tierDef.costGold)} G)`)
      }
      return
    }

    setErrorMsg(null)
    setModalOpen(false)
    setBatchModalOpen(false)
    setOpenSeq((seq) => seq + 1)
    setPhase('opening')

    const category = selectedCategory === 'all' ? undefined : selectedCategory

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
    }

    timerRef.current = window.setTimeout(async () => {
      timerRef.current = null
      try {
        let reward: TreasureChestReward | undefined
        if (onOpenChest) {
          const res = await onOpenChest({
            tierId: selectedTier,
            paymentMode: effectivePaymentMode,
            category,
          })
          if (!res.ok || !res.reward) {
            setErrorMsg(res.error ?? 'ไม่สามารถเปิดหีบสมบัติได้')
            setPhase('idle')
            return
          }
          reward = res.reward
        } else {
          reward = rollTreasureChestReward({
            tierId: selectedTier,
            category,
            playerLevel,
            spentGold: effectivePaymentMode === 'gold' ? tierDef.costGold : 0,
            spentKeyId: effectivePaymentMode === 'key' ? tierDef.keyItemId : undefined,
            spentKeyQty: effectivePaymentMode === 'key' ? (tierDef.keyQty ?? 1) : 0,
          })
        }

        const muted = isSfxMuted()
        if (reward.item.rarity === 'mythic' || reward.item.rarity === 'legendary') {
          playLevelUpSfx(muted)
        } else if (reward.item.rarity === 'epic' || reward.item.rarity === 'rare') {
          playVictorySfx(muted)
        } else {
          playEnhanceSfx(true, muted)
        }

        setActiveReward(reward)
        setHistory((prev) => [reward!, ...prev].slice(0, 20))
        setPhase('revealed')
        setModalOpen(true)
      } catch {
        setErrorMsg('เกิดข้อผิดพลาดระหว่างสุ่มของรางวัล')
        setPhase('idle')
      }
    }, CHEST_OPEN_ANIMATION_MS)
  }, [
    bagFull,
    canAfford,
    effectivePaymentMode,
    onOpenChest,
    phase,
    playerLevel,
    selectedCategory,
    selectedTier,
    tierDef.costGold,
    tierDef.keyItemId,
    tierDef.keyQty,
  ])

  const triggerQuickOpen10 = useCallback(() => {
    if (phase === 'opening') return
    if (!canAffordTen) {
      if (bagFull) {
        setErrorMsg('กระเป๋าเต็ม กรุณาเคลียร์ช่องเก็บของก่อนเปิดหีบ')
      } else if (effectivePaymentMode === 'key') {
        setErrorMsg(`กุญแจทองคำราชันย์ไม่พอสำหรับ x10 (ต้องการ ${(tierDef.keyQty ?? 1) * 10} ดอก)`)
      } else {
        setErrorMsg(`ทองคำไม่พอสำหรับ x10 (ต้องการ ${formatNum(tierDef.costGold * 10)} G)`)
      }
      return
    }

    setErrorMsg(null)
    setModalOpen(false)
    setBatchModalOpen(false)
    setOpenSeq((seq) => seq + 1)
    setPhase('opening')

    const category = selectedCategory === 'all' ? undefined : selectedCategory

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
    }

    timerRef.current = window.setTimeout(async () => {
      timerRef.current = null
      try {
        let rewards: TreasureChestReward[] = []
        let stoppedReason: string | undefined

        if (onOpenChestBatch) {
          const res = await onOpenChestBatch({
            tierId: selectedTier,
            paymentMode: effectivePaymentMode,
            category,
            count: 10,
          })
          if (!res.ok || res.rewards.length === 0) {
            setErrorMsg(res.error ?? 'ไม่สามารถเปิดหีบสมบัติ x10 ได้')
            setPhase('idle')
            return
          }
          rewards = res.rewards
          stoppedReason = res.stoppedEarlyReason
        } else if (onOpenChest) {
          for (let i = 0; i < 10; i++) {
            const res = await onOpenChest({
              tierId: selectedTier,
              paymentMode: effectivePaymentMode,
              category,
            })
            if (!res.ok || !res.reward) {
              if (i === 0) {
                setErrorMsg(res.error ?? 'ไม่สามารถเปิดหีบสมบัติ x10 ได้')
                setPhase('idle')
                return
              }
              stoppedReason = res.error
              break
            }
            rewards.push(res.reward)
          }
        } else {
          for (let i = 0; i < 10; i++) {
            rewards.push(
              rollTreasureChestReward({
                tierId: selectedTier,
                category,
                playerLevel,
                spentGold: effectivePaymentMode === 'gold' ? tierDef.costGold : 0,
                spentKeyId: effectivePaymentMode === 'key' ? tierDef.keyItemId : undefined,
                spentKeyQty: effectivePaymentMode === 'key' ? (tierDef.keyQty ?? 1) : 0,
              }),
            )
          }
        }

        const batchSummary = summarizeTreasureChestRewards(rewards)
        const muted = isSfxMuted()
        if (batchSummary.highestRarity === 'mythic' || batchSummary.highestRarity === 'legendary') {
          playLevelUpSfx(muted)
        } else if (batchSummary.highestRarity === 'epic' || batchSummary.highestRarity === 'rare') {
          playVictorySfx(muted)
        } else {
          playEnhanceSfx(true, muted)
        }

        setBatchRewards(rewards)
        setBatchStopReason(stoppedReason)
        setHistory((prev) => [...[...rewards].reverse(), ...prev].slice(0, 20))
        setPhase('revealed')
        setBatchModalOpen(true)
      } catch {
        setErrorMsg('เกิดข้อผิดพลาดระหว่างสุ่มของรางวัล x10')
        setPhase('idle')
      }
    }, CHEST_OPEN_ANIMATION_MS)
  }, [
    bagFull,
    canAffordTen,
    effectivePaymentMode,
    onOpenChest,
    onOpenChestBatch,
    phase,
    playerLevel,
    selectedCategory,
    selectedTier,
    tierDef.costGold,
    tierDef.keyItemId,
    tierDef.keyQty,
  ])

  const triggerDailyFreeOpen = useCallback(() => {
    if (phase === 'opening') return
    if (!dailyStatus.isAvailable) {
      setErrorMsg(`หีบฟรีประจำวันยังไม่พร้อม (รออีก ${formatCooldownDuration(dailyStatus.remainingMs)})`)
      return
    }
    if (bagFull) {
      setErrorMsg('กระเป๋าเต็ม กรุณาเคลียร์ช่องเก็บของก่อนเปิดหีบ')
      return
    }

    setErrorMsg(null)
    setModalOpen(false)
    setBatchModalOpen(false)
    setSelectedTier(DAILY_FREE_CHEST_TIER_ID)
    setOpenSeq((seq) => seq + 1)
    setPhase('opening')

    const category = selectedCategory === 'all' ? undefined : selectedCategory

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
    }

    timerRef.current = window.setTimeout(async () => {
      timerRef.current = null
      try {
        let res: ClaimDailyFreeChestResult
        if (onClaimDailyFreeChest) {
          res = await onClaimDailyFreeChest({ category })
        } else {
          res = claimDailyFreeTreasureChest({
            lastClaimedAt: effectiveDailyClaimedAt,
            playerLevel,
            category,
            gold,
            inventory: [],
            maxInventorySlots,
          })
          if (res.ok && res.nextClaimedAt) {
            setLocalDailyClaimedAt(res.nextClaimedAt)
            if (typeof window !== 'undefined') {
              try {
                window.localStorage.setItem(DAILY_CHEST_FALLBACK_STORAGE_KEY, String(res.nextClaimedAt))
              } catch {
                // Ignore storage errors
              }
            }
          }
        }

        if (!res.ok || !res.reward) {
          setErrorMsg(res.error ?? 'ไม่สามารถเปิดหีบฟรีประจำวันได้')
          setPhase('idle')
          return
        }

        const muted = isSfxMuted()
        if (res.reward.item.rarity === 'mythic' || res.reward.item.rarity === 'legendary') {
          playLevelUpSfx(muted)
        } else if (res.reward.item.rarity === 'epic' || res.reward.item.rarity === 'rare') {
          playVictorySfx(muted)
        } else {
          playEnhanceSfx(true, muted)
        }

        setNowMs(Date.now())
        setActiveReward(res.reward)
        setHistory((prev) => [res.reward!, ...prev].slice(0, 20))
        setPhase('revealed')
        setModalOpen(true)
      } catch {
        setErrorMsg('เกิดข้อผิดพลาดระหว่างเปิดหีบฟรีประจำวัน')
        setPhase('idle')
      }
    }, CHEST_OPEN_ANIMATION_MS)
  }, [
    bagFull,
    dailyStatus.isAvailable,
    dailyStatus.remainingMs,
    effectiveDailyClaimedAt,
    gold,
    maxInventorySlots,
    onClaimDailyFreeChest,
    phase,
    playerLevel,
    selectedCategory,
  ])

  const minRarityMeta = EQUIPMENT_RARITY_META[tierDef.minRarity]
  const dailyChestTierDef = CHEST_TIERS[DAILY_FREE_CHEST_TIER_ID]
  const canClaimDaily = dailyStatus.isAvailable && !bagFull && phase !== 'opening'

  return (
    <div
      data-testid="treasure-chest-root"
      data-chest-phase={phase}
      className={cn(
        'grid gap-4 text-slate-100',
        compact ? 'grid-cols-1 lg:grid-cols-[1.05fr_1fr]' : 'grid-cols-1 lg:grid-cols-[1.15fr_1fr]',
      )}
    >
      {/* Top Banner: 24-Hour Daily Free Standard Chest */}
      <section
        data-testid="daily-free-chest-card"
        className={cn(
          'flex flex-col justify-between gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:px-5 sm:py-4 lg:col-span-2',
          dailyStatus.isAvailable
            ? 'border-emerald-400/75 bg-gradient-to-r from-emerald-950/60 via-[#101e2b] to-[#101826]'
            : 'border-slate-700/80 bg-[#101826]',
        )}
      >
        <div className="flex items-center gap-3.5">
          <div className="shrink-0">
            <PixelChestCanvas
              tierId={DAILY_FREE_CHEST_TIER_ID}
              open={!dailyStatus.isAvailable}
              size={56}
            />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold text-emerald-200 sm:text-base">
                หีบสมบัติฟรีประจำวัน · {dailyChestTierDef.name}
              </h3>
              <span
                className={cn(
                  'text-xs font-bold tabular-nums',
                  dailyStatus.isAvailable ? 'text-emerald-300' : 'text-amber-300',
                )}
              >
                {dailyStatus.isAvailable
                  ? 'พร้อมเปิดรับฟรี (ทุก 24 ชม.)'
                  : `รีเซ็ตใน ${formatCooldownDuration(dailyStatus.remainingMs)}`}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              เปิดหีบอัศวินเงินมาตรฐานฟรี 1 ครั้งทุก 24 ชั่วโมง · การันตีไม่ธรรมดาขึ้นไป + โบนัสทอง{' '}
              {formatNum(dailyChestTierDef.goldBonusRange[0])}–{formatNum(dailyChestTierDef.goldBonusRange[1])} G
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            data-testid="daily-free-chest-btn"
            disabled={!canClaimDaily}
            onClick={triggerDailyFreeOpen}
            className={cn(
              'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-extrabold whitespace-nowrap shadow-md transition-all sm:w-auto',
              canClaimDaily
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95'
                : 'cursor-not-allowed border border-slate-700 bg-slate-800/80 text-slate-400',
            )}
          >
            {dailyStatus.isAvailable ? (
              <>
                <Gift className="size-4" aria-hidden />
                {bagFull
                  ? 'กระเป๋าเต็ม'
                  : phase === 'opening'
                    ? 'กำลังเปิดหีบ...'
                    : 'เปิดหีบฟรีประจำวัน'}
              </>
            ) : (
              <>
                <Clock className="size-4" aria-hidden />
                <span className="tabular-nums">
                  รับแล้ว · รอ {formatCooldownDuration(dailyStatus.remainingMs)}
                </span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Left Stage: Interactive Chest Opening Chamber */}
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-slate-700/80 bg-[#101826] p-4 sm:p-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded border px-1.5 py-0.5 text-[10px] font-bold"
                  style={{
                    borderColor: `${tierDef.accentHex}80`,
                    backgroundColor: `${tierDef.accentHex}22`,
                    color: tierDef.accentHex,
                  }}
                >
                  {tierDef.tierBadgeTh}
                </span>
                <h3 className="text-base font-bold text-amber-200 sm:text-lg">{tierDef.name}</h3>
              </div>
              <p className="text-xs text-slate-300">{tierDef.subtitle}</p>
            </div>
            <div className="flex items-center gap-3 text-xs tabular-nums">
              <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                <Coins className="size-3.5" aria-hidden />
                {formatNum(gold)} G
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-sky-300">
                <KeyRound className="size-3.5" aria-hidden />
                {keyCount} กุญแจ
              </span>
            </div>
          </div>

          {/* Category Target Filter */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-400">กรองหมวดหมู่ไอเทมที่ต้องการสุ่ม</p>
            <div className="flex flex-wrap gap-1.5">
              {CHEST_CATEGORY_OPTIONS.map((opt) => {
                const active = selectedCategory === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedCategory(opt.id)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-md px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
                      active
                        ? 'bg-amber-500 text-slate-950'
                        : 'border border-slate-700 bg-slate-800/75 text-slate-300 hover:border-slate-500 hover:text-white',
                    )}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Centerpiece Chest Display */}
        <div className="relative flex min-h-[168px] flex-col items-center justify-center gap-2.5 overflow-hidden rounded-xl border border-slate-800 bg-[radial-gradient(circle_at_50%_45%,rgba(251,191,36,0.12),rgba(11,17,28,0.95)_70%)] px-4 py-4">
          {phase === 'opening' && (
            <div
              key={`halo-${openSeq}`}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
            >
              {/* Charging radial light halo behind chest */}
              <div
                className="chest-opening-halo size-40 rounded-full blur-md"
                style={{
                  background: `radial-gradient(circle, #ffffff 0%, ${tierPalette.gold} 42%, transparent 72%)`,
                }}
              />
            </div>
          )}

          <div
            key={phase === 'opening' ? `shake-${openSeq}` : phase}
            className={cn(
              'relative z-10 flex items-center justify-center transition-transform',
              phase === 'opening' && 'chest-opening-shake',
              phase === 'revealed' && 'chest-revealed-pop',
            )}
          >
            <PixelChestCanvas tierId={selectedTier} open={phase === 'revealed'} size={116} />
          </div>

          {phase === 'opening' && (
            <div
              key={`fx-${openSeq}`}
              data-testid="chest-flash-overlay"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
            >
              {/* Climax shockwave ring */}
              <div
                className="chest-opening-ring absolute size-24 rounded-full border-2"
                style={{
                  borderColor: tierPalette.gemGlow,
                  boxShadow: `0 0 18px ${tierPalette.gold}`,
                }}
              />
              {/* Full-chamber flash burst */}
              <div
                className="chest-opening-flash absolute inset-0 rounded-xl"
                style={{
                  background: `radial-gradient(circle at 50% 44%, rgba(255,255,255,0.96) 0%, ${tierPalette.gemGlow} 32%, ${tierPalette.gold}44 65%, transparent 92%)`,
                }}
              />
            </div>
          )}

          <div className="relative z-10 text-center text-xs text-slate-300">
            <span className="whitespace-nowrap">โบนัสทอง {formatNum(tierDef.goldBonusRange[0])}–{formatNum(tierDef.goldBonusRange[1])} G</span>
            <span aria-hidden="true"> · </span>
            <span className="whitespace-nowrap">ตีบวก +{tierDef.plusRange[0]} ถึง +{tierDef.plusRange[1]}</span>
            <span aria-hidden="true"> · </span>
            <span className={cn('whitespace-nowrap font-semibold', minRarityMeta.textColorClass)}>
              ขั้นต่ำ {minRarityMeta.thaiLabel}
            </span>
          </div>
        </div>

        {/* Rarity Drop Probabilities */}
        <div
          data-testid="chest-odds-panel"
          className="space-y-2 border-t border-slate-800/90 pt-3"
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-200">โอกาสออกแต่ละระดับความหายาก</span>
            <span className="text-slate-400">อัตราดรอปจริง · {tierDef.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {rarityProbabilities.map((entry) => (
              <div
                key={entry.rarity}
                className={cn(
                  'space-y-1',
                  !entry.isAvailable && 'opacity-40',
                )}
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className={cn('truncate font-semibold', entry.textColorClass)}>
                    {entry.thaiLabel}
                  </span>
                  <span className="font-bold text-slate-200 tabular-nums">
                    {entry.percentage}%
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, entry.percentage))}%`,
                      backgroundColor: entry.hexColor,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls & Payment Mode */}
        <div className="space-y-2.5">
          {supportsKey && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('gold')}
                aria-pressed={effectivePaymentMode === 'gold'}
                className={cn(
                  'min-h-10 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
                  effectivePaymentMode === 'gold'
                    ? 'bg-sky-500 text-slate-950'
                    : 'border border-slate-700 bg-slate-800 text-slate-300 hover:text-white',
                )}
              >
                จ่ายด้วยทอง ({formatNum(tierDef.costGold)} G)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('key')}
                aria-pressed={effectivePaymentMode === 'key'}
                className={cn(
                  'min-h-10 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
                  effectivePaymentMode === 'key'
                    ? 'bg-amber-500 text-slate-950'
                    : 'border border-slate-700 bg-slate-800 text-slate-300 hover:text-white',
                )}
              >
                ใช้กุญแจราชันย์ ({tierDef.keyQty ?? 1} ดอก)
              </button>
            </div>
          )}

          {errorMsg && (
            <p role="alert" className="rounded-lg border border-rose-500/60 bg-rose-950/50 px-3 py-2 text-xs font-medium text-rose-200">
              {errorMsg}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400 tabular-nums">
              {tierDef.costGold === 0
                ? 'เปิดฟรี · ใช้ได้ทันที (รวม x10)'
                : effectivePaymentMode === 'key'
                  ? `ค่าเปิด: กุญแจทองคำราชันย์ x${tierDef.keyQty ?? 1} (x10: ${(tierDef.keyQty ?? 1) * 10})`
                  : `ค่าเปิด: ${formatNum(tierDef.costGold)} G (x10: ${formatNum(tierDef.costGold * 10)} G)`}
              {!canAfford && (
                <span className="ml-1.5 font-semibold text-rose-300">
                  {bagFull
                    ? '· กระเป๋าเต็ม'
                    : effectivePaymentMode === 'key'
                      ? `· กุญแจไม่พอ (มี ${keyCount})`
                      : `· ขาดอีก ${formatNum(Math.max(0, tierDef.costGold - gold))} G`}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="quick-open-10-btn"
                disabled={phase === 'opening' || !canAffordTen}
                onClick={triggerQuickOpen10}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-sky-400/75 bg-sky-500/20 px-4 py-2.5 text-sm font-extrabold text-sky-200 whitespace-nowrap shadow-md transition-all hover:bg-sky-500/30 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Zap className="size-4" aria-hidden />
                {phase === 'opening' ? 'กำลังเปิด...' : 'Quick Open x10'}
              </button>
              <button
                type="button"
                data-testid="open-chest-btn"
                disabled={phase === 'opening' || !canAfford}
                onClick={triggerOpen}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-extrabold text-slate-950 whitespace-nowrap shadow-md transition-transform hover:bg-amber-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <LockOpen className="size-4" aria-hidden />
                {phase === 'opening' ? 'กำลังเปิดหีบ...' : 'เปิดหีบสมบัติ'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Right Column: Chest Tiers & Recent Pulls */}
      <div className="flex flex-col gap-4">
        <section className="rounded-xl border border-slate-700/80 bg-[#101826] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-100">เลือกประเภทหีบสมบัติ</h3>
            <span className="text-[11px] text-slate-400">{CHEST_TIER_ORDER.length} ระดับ</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CHEST_TIER_ORDER.map((id) => {
              const def = CHEST_TIERS[id]
              const selected = selectedTier === id
              const minMeta = EQUIPMENT_RARITY_META[def.minRarity]
              return (
                <button
                  key={id}
                  type="button"
                  data-testid={`chest-tier-btn-${id}`}
                  onClick={() => {
                    if (timerRef.current !== null) {
                      window.clearTimeout(timerRef.current)
                      timerRef.current = null
                    }
                    setSelectedTier(id)
                    setPhase('idle')
                    setErrorMsg(null)
                  }}
                  aria-pressed={selected}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors',
                    selected
                      ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/40'
                      : 'border-slate-700/80 bg-slate-900/60 hover:border-slate-500',
                  )}
                >
                  <div className="shrink-0">
                    <PixelChestCanvas tierId={id} open={false} size={52} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-bold leading-none"
                        style={{
                          backgroundColor: `${def.accentHex}24`,
                          color: def.accentHex,
                        }}
                      >
                        {def.tierBadgeTh}
                      </span>
                      <span className={cn('text-[10.5px] font-medium whitespace-nowrap', minMeta.textColorClass)}>
                        ขั้นต่ำ {minMeta.thaiLabel}
                      </span>
                    </div>
                    <p className="text-xs font-bold leading-snug text-white">{def.name}</p>
                    <p className="text-[11px] text-amber-300 tabular-nums">
                      {def.costGold === 0 ? 'เปิดฟรี' : `${formatNum(def.costGold)} G`}
                      {def.keyQty ? ` / ${def.keyQty} กุญแจ` : ''}
                      <span className="text-slate-400"> · +{def.plusRange[0]}–{def.plusRange[1]}</span>
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="flex flex-1 flex-col rounded-xl border border-slate-700/80 bg-[#101826] p-4">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-100">รางวัลที่เปิดได้ล่าสุด</h3>
            <span className="text-xs text-slate-400 tabular-nums">{history.length} ชิ้น</span>
          </div>

          {history.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-800 px-4 py-6 text-center text-xs text-slate-400">
              <Sparkles className="size-5 text-slate-500" aria-hidden />
              <p>กดปุ่ม “เปิดหีบสมบัติ” เพื่อสุ่มรับอุปกรณ์และของรางวัล</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {history.map((entry, idx) => {
                const rMeta = EQUIPMENT_RARITY_META[entry.item.rarity]
                return (
                  <button
                    key={`${entry.item.uid}-${idx}`}
                    type="button"
                    onClick={() => {
                      setActiveReward(entry)
                      setModalOpen(true)
                    }}
                    title={`${entry.item.name} (${rMeta.thaiLabel})`}
                    className="flex flex-col items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/70 p-2 text-center hover:border-amber-400"
                  >
                    <ItemVfxBox
                      itemId={entry.item.itemId}
                      rarity={entry.item.rarity}
                      element={entry.item.element}
                      size="sm"
                      className="size-12 p-1"
                    >
                      <ItemIcon itemId={entry.item.itemId} size={36} />
                      {entry.item.plus > 0 && (
                        <span className="absolute left-0.5 top-0 z-30 text-[10px] font-bold text-amber-300 tabular-nums">
                          +{entry.item.plus}
                        </span>
                      )}
                    </ItemVfxBox>
                    <p className={cn('w-full truncate text-[10.5px] font-semibold', rMeta.textColorClass)}>
                      {entry.item.name}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {modalOpen && activeReward && (
        <TreasureChestRewardScreen
          reward={activeReward}
          onClose={() => setModalOpen(false)}
          onOpenAgain={triggerOpen}
          canOpenAgain={canAfford && phase !== 'opening'}
          inventoryHref={inventoryHref}
        />
      )}

      {batchModalOpen && batchRewards.length > 0 && (
        <TreasureChestBatchRewardScreen
          rewards={batchRewards}
          stoppedEarlyReason={batchStopReason}
          onClose={() => setBatchModalOpen(false)}
          onOpenBatchAgain={triggerQuickOpen10}
          canOpenBatchAgain={canAffordTen && phase !== 'opening'}
          inventoryHref={inventoryHref}
        />
      )}
    </div>
  )
}
