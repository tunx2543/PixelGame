'use client'

import { useState } from 'react'
import { Flame, Hammer, Layers, Sparkles, Wrench } from 'lucide-react'
import { ITEMS, type EquipmentSlot } from '@/lib/game/data'
import {
  craftRecipeAction,
  dismantleItemAction,
  socketRuneAction,
} from '@/lib/game/engine'
import {
  CRAFT_RECIPES,
  ELEMENT_META,
  RUNE_DEFS,
  calculateDismantleYield,
  canCraftRecipe,
  computeEquipmentSetBonuses,
  computeRuneBonuses,
  countInventoryItem,
  sanitizeRpgExt,
} from '@/lib/game/rpg-systems'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { ItemIcon } from '../item-icon'
import { PanelFrame, PxButton } from './panels'

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'อาวุธ',
  armor: 'ชุดเกราะ',
  shoes: 'รองเท้า',
  cloak: 'ผ้าคลุม',
  accessory: 'เครื่องประดับ',
}

export function CraftPanel() {
  const g = useGame()
  const p = g.p
  const [tab, setTab] = useState<'craft' | 'dismantle' | 'runes'>('craft')
  const [notice, setNotice] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot>('weapon')

  if (!p) return null
  const ext = sanitizeRpgExt(p.rpgExt)
  const setBonus = computeEquipmentSetBonuses(p.equipment)
  const runeBonus = computeRuneBonuses(ext)
  const equipItems = p.inventory.filter((it) => {
    const def = ITEMS[it.itemId]
    return def && (def.kind === 'weapon' || def.kind === 'armor')
  })

  return (
    <PanelFrame
      title="โรงตีเหล็ก คราฟต์ & รูน"
      subtitle="แปรรูปวัตถุดิบ ย่อยอุปกรณ์ส่วนเกิน ฝังรูนธาตุ และตรวจเช็กโบนัสเซต"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-border/70 pb-2.5">
        <PxButton
          variant={tab === 'craft' ? 'primary' : 'secondary'}
          onClick={() => setTab('craft')}
        >
          <span className="flex items-center gap-1.5">
            <Hammer className="size-3.5" aria-hidden /> คราฟต์ไอเทม ({CRAFT_RECIPES.length})
          </span>
        </PxButton>
        <PxButton
          variant={tab === 'dismantle' ? 'primary' : 'secondary'}
          onClick={() => setTab('dismantle')}
        >
          <span className="flex items-center gap-1.5">
            <Wrench className="size-3.5" aria-hidden /> ย่อยอุปกรณ์ ({equipItems.length})
          </span>
        </PxButton>
        <PxButton
          variant={tab === 'runes' ? 'primary' : 'secondary'}
          onClick={() => setTab('runes')}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5" aria-hidden /> ฝังรูน & เซตโบนัส
          </span>
        </PxButton>
      </div>

      {notice && (
        <div className="mb-3 border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
          {notice}
        </div>
      )}

      {tab === 'craft' && (
        <div className="grid gap-2.5 md:grid-cols-2">
          {CRAFT_RECIPES.map((recipe) => {
            const check = canCraftRecipe(recipe, p.inventory, p.gold)
            const resultRune = recipe.resultRuneId ? RUNE_DEFS[recipe.resultRuneId] : null
            const resultItem = recipe.resultItemId ? ITEMS[recipe.resultItemId] : null
            return (
              <div
                key={recipe.id}
                className="flex flex-col justify-between gap-2 border border-border/80 bg-background/60 p-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {recipe.resultItemId && (
                        <div className="grid size-8 shrink-0 place-items-center border border-border/70 bg-muted">
                          <ItemIcon itemId={recipe.resultItemId} size={26} />
                        </div>
                      )}
                      <p
                        className="truncate text-sm font-bold"
                        style={{ color: resultRune?.color ?? resultItem?.color ?? '#f8fafc' }}
                      >
                        {recipe.name}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-gold tabular-nums">
                      {formatNum(recipe.goldCost)} G
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{recipe.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] tabular-nums">
                    {recipe.ingredients.map((ing) => {
                      const have = countInventoryItem(p.inventory, ing.itemId)
                      const ok = have >= ing.qty
                      return (
                        <span
                          key={ing.itemId}
                          className={`border px-1.5 py-0.5 ${
                            ok
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                              : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                          }`}
                        >
                          {ITEMS[ing.itemId]?.name ?? ing.itemId} {have}/{ing.qty}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    {check.ok ? 'พร้อมสร้างทันที' : check.reason}
                  </span>
                  <PxButton
                    disabled={!check.ok}
                    onClick={() => {
                      const res = craftRecipeAction(recipe.id)
                      setNotice(res.message)
                    }}
                  >
                    สร้างเลย
                  </PxButton>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'dismantle' && (
        <div className="space-y-2">
          {equipItems.length === 0 ? (
            <div className="border border-border/70 bg-background/50 p-6 text-center text-xs text-muted-foreground">
              ไม่มีอาวุธหรือชุดเกราะสำรองในกระเป๋าสำหรับย่อย (ไอเทมที่สวมใส่อยู่จะไม่ถูกแสดง)
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {equipItems.map((it) => {
                const def = ITEMS[it.itemId]
                const y = calculateDismantleYield(it)
                if (!def) return null
                return (
                  <div
                    key={it.uid}
                    className="flex items-center justify-between gap-2 border border-border/80 bg-background/60 p-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <ItemIcon itemId={it.itemId} size={28} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold" style={{ color: def.color }}>
                          {def.name}
                          {it.plus > 0 ? ` +${it.plus}` : ''}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                          ได้รับ: +{formatNum(y.gold)} G · หินตีบวก x{y.stones}
                          {y.bonusRuneId ? ` · ${RUNE_DEFS[y.bonusRuneId]?.name}` : ''}
                        </p>
                      </div>
                    </div>
                    <PxButton
                      variant="danger"
                      onClick={() => {
                        const res = dismantleItemAction(it.uid)
                        setNotice(res.message)
                      }}
                    >
                      ย่อยไอเทม
                    </PxButton>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'runes' && (
        <div className="space-y-4">
          {/* Set Bonus Card */}
          <div className="border border-amber-400/50 bg-amber-500/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                <Layers className="size-4" aria-hidden />
                โบนัสเซตอุปกรณ์ ({setBonus.equippedCount}/5 ช่อง)
              </h3>
              <span className="text-xs font-semibold text-foreground tabular-nums">
                รวม +{setBonus.hpBonus} HP · +{setBonus.atkBonus} ATK · +{setBonus.defBonus} DEF · +{Math.round(setBonus.critBonus * 100)}% คริ
              </span>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              {setBonus.activeLabels.length === 0 ? (
                <p>สวมใส่อุปกรณ์อย่างน้อย 2 ชิ้น หรือระดับ Tier 3 / Tier 4 เพื่อเปิดใช้งานโบนัสเซต</p>
              ) : (
                setBonus.activeLabels.map((lbl) => (
                  <p key={lbl} className="text-emerald-300">
                    ✓ {lbl}
                  </p>
                ))
              )}
            </div>
          </div>

          {/* Rune Summary */}
          <div className="grid gap-3 md:grid-cols-[1.1fr_1fr]">
            <div className="space-y-2 border border-border/80 bg-background/60 p-3">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <Flame className="size-3.5" aria-hidden /> ช่องฝังรูน (รวม +{runeBonus.atkBonus} ATK / +{runeBonus.defBonus} DEF / ดูดเลือด {runeBonus.lifestealPct}%)
                </h3>
              </div>
              <div className="space-y-1.5">
                {(['weapon', 'armor', 'shoes', 'cloak', 'accessory'] as EquipmentSlot[]).map((slot) => {
                  const rId = ext.equippedRunes[slot]
                  const rune = rId ? RUNE_DEFS[rId] : null
                  const active = selectedSlot === slot
                  return (
                    <div
                      key={slot}
                      className={`flex items-center justify-between gap-2 border p-2 text-xs ${
                        active ? 'border-primary bg-primary/10' : 'border-border/70 bg-background/70'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="font-semibold text-foreground">{SLOT_LABELS[slot]}</p>
                        <p className="truncate text-[11px]" style={{ color: rune?.color ?? '#94a3b8' }}>
                          {rune ? `${rune.name} (${ELEMENT_META[rune.element].label})` : 'ว่าง — กดเพื่อเลือกฝังรูน'}
                        </p>
                      </button>
                      {rune && (
                        <PxButton
                          variant="secondary"
                          onClick={() => {
                            const res = socketRuneAction(slot, null)
                            setNotice(res.message)
                          }}
                        >
                          ถอดรูน
                        </PxButton>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2 border border-border/80 bg-background/60 p-3">
              <h3 className="text-xs font-bold text-foreground">
                กระเป๋ารูน (เลือกฝังลงช่อง: <span className="text-primary">{SLOT_LABELS[selectedSlot]}</span>)
              </h3>
              {Object.keys(ext.runeBag).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  ยังไม่มีรูนสำรอง — สามารถคราฟต์รูน ย่อยอุปกรณ์ Tier 3+ หรือลงดันเจี้ยนรายวัน
                </p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(ext.runeBag).map(([runeId, qty]) => {
                    const rune = RUNE_DEFS[runeId]
                    if (!rune || qty <= 0) return null
                    return (
                      <div
                        key={runeId}
                        className="flex items-center justify-between gap-2 border border-border/70 bg-background/80 p-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold" style={{ color: rune.color }}>
                            {rune.name} ×{qty}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{rune.description}</p>
                        </div>
                        <PxButton
                          onClick={() => {
                            const res = socketRuneAction(selectedSlot, runeId)
                            setNotice(res.message)
                          }}
                        >
                          ฝัง
                        </PxButton>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PanelFrame>
  )
}
