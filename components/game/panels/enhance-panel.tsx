'use client'

import { useState } from 'react'
import { Flame, Lock, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { ITEMS, MAX_PLUS, enhanceCost, enhanceRate } from '@/lib/game/data'
import {
  countItem,
  enhance,
  findEquipment,
  hasVipRemoteAccess,
  isNearTownNpcRole,
  itemLabel,
  itemPower,
  reforgeEquipmentAction,
  type EnhanceResult,
  type InvItem,
} from '@/lib/game/engine'
import {
  EQUIPMENT_RARITY_META,
  formatAffixLabel,
  reforgeCost,
  resolveEffectiveRarity,
} from '@/lib/game/mmo-systems'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { formatNum } from '../format'
import { ItemIcon, ItemSlot } from '../item-icon'
import { PanelFrame, PxButton } from './panels'

const CHANCE_SCROLL_OPTIONS: Array<{ id: string; label: string; bonusPct: number }> = [
  { id: 'enhance_chance_scroll_1', label: 'ใบเพิ่มโอกาส +10%', bonusPct: 10 },
  { id: 'enhance_chance_scroll_2', label: 'ใบเพิ่มโอกาสชั้นดี +20%', bonusPct: 20 },
  { id: 'enhance_chance_scroll_3', label: 'ใบเพิ่มโอกาสชั้นเยี่ยม +35%', bonusPct: 35 },
  { id: 'enhance_chance_scroll_4', label: 'ใบเพิ่มโอกาสคหบดี +50%', bonusPct: 50 },
]

const PROTECT_SCROLL_OPTIONS: Array<{ id: string; label: string; desc: string }> = [
  { id: 'enhance_protect_scroll_1', label: 'ใบประกันความเสียหาย', desc: 'กันระดับลด' },
  { id: 'enhance_protect_scroll_2', label: 'ใบประกันชั้นดี', desc: 'กันลด + คืนหิน 50%' },
]

export function EnhancePanel() {
  const g = useGame()
  const [selected, setSelected] = useState<string | null>(null)
  const [chanceScrollId, setChanceScrollId] = useState<string | null>(null)
  const [protectScrollId, setProtectScrollId] = useState<string | null>(null)
  const [result, setResult] = useState<EnhanceResult | null>(null)
  const [reforgeNotice, setReforgeNotice] = useState<{ ok: boolean; text: string } | null>(null)
  if (!g.p) return null
  const p = g.p
  const gear: { it: InvItem; equipped: boolean }[] = [
    ...(['weapon', 'armor', 'shoes', 'cloak', 'accessory'] as const).flatMap((slot) =>
      p.equipment[slot] ? [{ it: p.equipment[slot]!, equipped: true }] : [],
    ),
    ...p.inventory
      .filter((i) => {
        const itemDef = ITEMS[i.itemId]
        return Boolean(itemDef && (itemDef.kind === 'weapon' || itemDef.kind === 'armor'))
      })
      .map((it) => ({ it, equipped: false })),
  ]
  const activeSelected = gear.some((entry) => entry.it.uid === selected) ? selected : (gear[0]?.it.uid ?? null)
  const item = activeSelected ? findEquipment(activeSelected) : null
  const def = item ? ITEMS[item.itemId] : null
  const stones = countItem('enhance_stone')
  const cost = item && def ? enhanceCost(item.plus, def.tier ?? 1) : null
  const baseRate = item ? enhanceRate(item.plus) : 0
  const activeChanceOpt = CHANCE_SCROLL_OPTIONS.find((opt) => opt.id === chanceScrollId && countItem(opt.id) > 0) ?? null
  const activeProtectOpt =
    PROTECT_SCROLL_OPTIONS.find((opt) => opt.id === protectScrollId && countItem(opt.id) > 0) ?? null
  const bonusChance = activeChanceOpt ? activeChanceOpt.bonusPct / 100 : 0
  const rate = Math.min(1, baseRate + bonusChance)
  const maxed = item ? item.plus >= MAX_PLUS : false
  const rarity = item && def ? resolveEffectiveRarity(item, def) : 'common'
  const rarityMeta = EQUIPMENT_RARITY_META[rarity]
  const rfCost = item && def ? reforgeCost(def.tier ?? 1, rarity) : null
  const isRemoteVip = hasVipRemoteAccess(p) && !isNearTownNpcRole('enhance')

  return (
    <PanelFrame
      title={isRemoteVip ? 'โรงตีเหล็กบุญมา (VIP ระยะไกล)' : 'โรงตีเหล็กบุญมา & รีสุ่มออปชัน'}
      subtitle={
        isRemoteVip
          ? 'สิทธิ์ VIP ระยะไกล — ตีบวกอุปกรณ์ (+15) และ Reforge ออปชันได้จากทุกแผนที่'
          : 'ตีบวกเพิ่มพลัง (สูงสุด +15) ใช้ใบเพิ่มโอกาส / ใบประกันความเสียหาย หรือ Reforge ออปชันใหม่'
      }
    >
      <div className="grid gap-4 md:grid-cols-[1fr_1.25fr]">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">เลือกอุปกรณ์ ({gear.length})</p>
          {gear.length === 0 ? (
            <p className="text-sm text-muted-foreground">ไม่มีอุปกรณ์ที่ตีบวกได้</p>
          ) : (
            <div className="grid grid-cols-5 gap-1.5">
              {gear.map(({ it, equipped }) => (
                <div key={it.uid} className="relative">
                  <ItemSlot
                    item={it}
                    selected={activeSelected === it.uid}
                    onClick={() => {
                      setSelected(it.uid)
                      setResult(null)
                      setReforgeNotice(null)
                    }}
                  />
                  {equipped && <span className="pointer-events-none absolute bottom-0 left-0.5 text-[9px] text-accent">E</span>}
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            หินตีบวกที่มี: <span className="text-[#4cc9f0] tabular-nums">{stones}</span> ก้อน (ซื้อได้ที่พ่อค้า / ร้านโซล หรือดรอปจากมอนสเตอร์)
          </p>
        </div>

        {item && def && cost && rfCost ? (
          <div className={cn('flex flex-col gap-3 border-2 bg-muted p-3', rarityMeta.borderColorClass)}>
            <div className="flex items-center gap-3">
              <div className={cn('border-2 bg-background p-1', rarityMeta.borderColorClass)}>
                <ItemIcon itemId={item.itemId} size={48} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-base font-bold text-foreground">{itemLabel(item)}</p>
                  <span className={cn('px-1.5 py-0.5 text-[10px] font-bold', rarityMeta.badgeBgClass, rarityMeta.textColorClass)}>
                    {rarityMeta.thaiLabel}
                  </span>
                  {item.bound && (
                    <span className="inline-flex items-center gap-0.5 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                      <Lock className="size-2.5" aria-hidden /> ผูกมัด
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {def.kind === 'weapon' ? 'พลังโจมตี' : 'พลังป้องกัน'} {itemPower(item)}
                  {!maxed && (
                    <span className="text-accent"> → {itemPower({ ...item, plus: item.plus + 1 })}</span>
                  )}
                </p>
                {item.affixes && item.affixes.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.affixes.map((af, idx) => (
                      <span
                        key={`${af.stat}-${idx}`}
                        className="border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                      >
                        {formatAffixLabel(af)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {maxed ? (
              <p className="text-sm text-gold">อุปกรณ์นี้ตีบวกถึงระดับสูงสุดแล้ว!</p>
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-muted-foreground">ระดับ</dt>
                  <dd className="text-right text-foreground tabular-nums">
                    +{item.plus} → <span className="text-gold">+{item.plus + 1}</span>
                  </dd>
                  <dt className="text-muted-foreground">โอกาสสำเร็จ</dt>
                  <dd className={cn('text-right font-bold tabular-nums', rate >= 0.8 ? 'text-accent' : rate >= 0.4 ? 'text-gold' : 'text-destructive')}>
                    {Math.round(baseRate * 100)}%
                    {activeChanceOpt ? (
                      <span className="text-emerald-300">
                        {' '}
                        (+{activeChanceOpt.bonusPct}% → {Math.round(rate * 100)}%)
                      </span>
                    ) : null}
                  </dd>
                  <dt className="text-muted-foreground">ค่าตีบวก</dt>
                  <dd className={cn('text-right tabular-nums', p.gold >= cost.gold ? 'text-gold' : 'text-destructive')}>
                    {formatNum(cost.gold)} G
                  </dd>
                  <dt className="text-muted-foreground">หินตีบวก</dt>
                  <dd className={cn('text-right tabular-nums', stones >= cost.stones ? 'text-[#4cc9f0]' : 'text-destructive')}>
                    {cost.stones} ก้อน
                  </dd>
                </dl>

                {/* Asura Upgrade Boosters: Chance Scrolls & Insurance Scrolls */}
                <div className="space-y-2 rounded border border-[#2d4e80] bg-background/70 p-2 text-[11px]">
                  <div>
                    <p className="mb-1 flex items-center gap-1 font-bold text-amber-300">
                      <Sparkles className="size-3.5" aria-hidden /> ใบเพิ่มโอกาสตีบวก
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {CHANCE_SCROLL_OPTIONS.map((opt) => {
                        const qty = countItem(opt.id)
                        const active = activeChanceOpt?.id === opt.id
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={qty <= 0}
                            onClick={() => setChanceScrollId(active ? null : opt.id)}
                            className={cn(
                              'rounded border px-2 py-1 text-[10px] font-semibold transition-colors disabled:opacity-35',
                              active
                                ? 'border-amber-300 bg-amber-500/20 text-amber-200'
                                : 'border-border bg-secondary/70 text-slate-200 hover:border-sky-400',
                            )}
                          >
                            +{opt.bonusPct}% ({qty})
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 flex items-center gap-1 font-bold text-cyan-300">
                      <ShieldCheck className="size-3.5" aria-hidden /> ใบประกันความเสียหาย (+6 ขึ้นไป)
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {PROTECT_SCROLL_OPTIONS.map((opt) => {
                        const qty = countItem(opt.id)
                        const active = activeProtectOpt?.id === opt.id
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={qty <= 0}
                            onClick={() => setProtectScrollId(active ? null : opt.id)}
                            className={cn(
                              'rounded border px-2 py-1 text-[10px] font-semibold transition-colors disabled:opacity-35',
                              active
                                ? 'border-cyan-300 bg-cyan-500/20 text-cyan-200'
                                : 'border-border bg-secondary/70 text-slate-200 hover:border-sky-400',
                            )}
                          >
                            {opt.label} · {opt.desc} ({qty})
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {!maxed && item.plus >= 6 && !activeProtectOpt && (
              <p className="border-2 border-destructive/60 bg-destructive/10 p-2 text-[11px] text-destructive">
                คำเตือน: ตั้งแต่ +6 ขึ้นไป หากล้มเหลวระดับจะลดลง 1 (สามารถเลือกใช้ใบประกันความเสียหายได้)
              </p>
            )}

            {!maxed && item.plus >= 6 && activeProtectOpt && (
              <p className="flex items-center gap-1.5 border border-cyan-400/50 bg-cyan-950/40 p-2 text-[11px] text-cyan-200">
                <Flame className="size-3.5 shrink-0 text-cyan-300" aria-hidden />
                <span>เปิดใช้ {activeProtectOpt.label}: ป้องกันระดับลดลงเมื่อตีบวกล้มเหลว ({activeProtectOpt.desc})</span>
              </p>
            )}

            <PxButton
              onClick={() => {
                const res = enhance(item.uid, {
                  chanceScrollId: activeChanceOpt?.id ?? null,
                  protectScrollId: activeProtectOpt?.id ?? null,
                })
                setResult(res)
                if (activeChanceOpt && countItem(activeChanceOpt.id) <= 0) setChanceScrollId(null)
                if (activeProtectOpt && countItem(activeProtectOpt.id) <= 0) setProtectScrollId(null)
              }}
              disabled={maxed || p.gold < cost.gold || stones < cost.stones}
              className="py-2.5 text-sm"
            >
              ตีบวก!
            </PxButton>

            {result && (
              <p
                role="status"
                className={cn(
                  'border-2 p-2 text-center text-sm',
                  result.result === 'success' && 'border-accent bg-accent/15 text-accent',
                  result.result === 'fail' && 'border-border bg-background text-muted-foreground',
                  (result.result === 'down' || result.result === 'error') && 'border-destructive bg-destructive/15 text-destructive',
                )}
              >
                {result.message}
              </p>
            )}

            {/* Reforge Sub-stats Section */}
            <div className="space-y-2 border-t border-border/70 pt-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-amber-300">รีสุ่มออปชันเสริม (Reforge)</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    ใช้ {formatNum(rfCost.gold)} G + หิน {rfCost.stones} ก้อน (มีโอกาสเลื่อนระดับและได้ออปชันใหม่)
                  </p>
                </div>
                <PxButton
                  variant="accent"
                  disabled={p.gold < rfCost.gold || stones < rfCost.stones}
                  onClick={() => {
                    const rf = reforgeEquipmentAction(item.uid)
                    setReforgeNotice({ ok: rf.ok, text: rf.message })
                  }}
                >
                  <span className="flex items-center gap-1">
                    <RefreshCw className="size-3.5" aria-hidden /> รีสุ่ม
                  </span>
                </PxButton>
              </div>
              {reforgeNotice && (
                <p
                  role="status"
                  className={cn(
                    'border p-2 text-center text-xs font-semibold',
                    reforgeNotice.ok ? 'border-amber-400/60 bg-amber-500/10 text-amber-300' : 'border-destructive bg-destructive/10 text-destructive',
                  )}
                >
                  {reforgeNotice.text}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">เลือกอุปกรณ์ทางซ้ายเพื่อตีบวก</p>
        )}
      </div>
    </PanelFrame>
  )
}
