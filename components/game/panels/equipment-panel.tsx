'use client'

import { useState } from 'react'
import { Backpack, Shield, Sparkles, Swords, Zap } from 'lucide-react'
import { ITEMS, type EquipmentSlot } from '@/lib/game/data'
import {
  canEquip,
  currentJob,
  equip,
  getStats,
  hasVipRemoteAccess,
  isNearTownNpcRole,
  itemLabel,
  itemPower,
  openPanel,
  resolvePlayerFashionLoadout,
  unequip,
  unequipAllFashionAction,
} from '@/lib/game/engine'
import {
  EQUIPMENT_RARITY_META,
  formatAffixLabel,
  resolveEffectiveRarity,
} from '@/lib/game/mmo-systems'
import { FASHION_CHARACTER_SLOTS, FASHION_SLOT_LABELS, getFashionItemDef } from '@/lib/game/premium/fashion-pet'
import {
  RUNE_DEFS,
  TITLE_DEFS,
  computeCombatPower,
  computeEquipmentSetBonuses,
  sanitizeRpgExt,
} from '@/lib/game/rpg-systems'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { formatNum } from '../format'
import { ItemIcon } from '../item-icon'
import { ItemVfxBox } from '../item-vfx'
import { SpriteModelCanvas } from '../sprite-model-canvas'
import { PanelFrame, PxButton } from './panels'

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'อาวุธ',
  armor: 'ชุดเกราะ',
  shoes: 'รองเท้า',
  cloak: 'ผ้าคลุม',
  accessory: 'เครื่องประดับ',
}

const SLOTS: EquipmentSlot[] = ['weapon', 'armor', 'shoes', 'cloak', 'accessory']

export function EquipmentPanel() {
  const { p } = useGame()
  const [activeSlot, setActiveSlot] = useState<EquipmentSlot>('weapon')
  const [dragOverSlot, setDragOverSlot] = useState<EquipmentSlot | null>(null)
  const [dropMessage, setDropMessage] = useState<string | null>(null)

  if (!p) return null

  const s = getStats(p)
  const job = currentJob()
  const cp = computeCombatPower(p, s)
  const setBonus = computeEquipmentSetBonuses(p.equipment)
  const rpgExt = sanitizeRpgExt(p.rpgExt)
  const activeTitleDef = rpgExt.activeTitle ? TITLE_DEFS.find((t) => t.id === rpgExt.activeTitle) : null
  const vipRemoteEnhance = hasVipRemoteAccess(p)
  const nearBlacksmith = isNearTownNpcRole('enhance')
  const canOpenEnhance = vipRemoteEnhance || nearBlacksmith
  const fashionLoadout = resolvePlayerFashionLoadout(p)
  const equippedFashionList = FASHION_CHARACTER_SLOTS.map((slot) => ({
    slot,
    def: getFashionItemDef(fashionLoadout[slot]),
  })).filter((entry): entry is { slot: typeof entry.slot; def: NonNullable<typeof entry.def> } => Boolean(entry.def))

  const bagCandidates = p.inventory.filter((it) => {
    const def = ITEMS[it.itemId]
    if (!def || (def.kind !== 'weapon' && def.kind !== 'armor')) return false
    const slot: EquipmentSlot = def.slot ?? (def.kind === 'weapon' ? 'weapon' : 'armor')
    return slot === activeSlot
  })

  const handleDropOnSlot = (slot: EquipmentSlot, e: React.DragEvent) => {
    e.preventDefault()
    setDragOverSlot(null)
    const raw = e.dataTransfer.getData('application/x-pixelquest-item') || e.dataTransfer.getData('text/plain')
    if (!raw) return
    try {
      const payload = JSON.parse(raw) as { uid?: string; itemId?: string }
      if (!payload.uid) return
      const bagItem = p.inventory.find((entry) => entry.uid === payload.uid)
      if (!bagItem) return
      const def = ITEMS[bagItem.itemId]
      if (!def || (def.kind !== 'weapon' && def.kind !== 'armor')) {
        setDropMessage('ลากได้เฉพาะอาวุธ ชุดเกราะ หรือเครื่องประดับลงช่องสวมใส่')
        return
      }
      const targetSlot: EquipmentSlot = def.slot ?? (def.kind === 'weapon' ? 'weapon' : 'armor')
      if (targetSlot !== slot) {
        setDropMessage(`${def.name} ต้องใส่ในช่อง ${SLOT_LABELS[targetSlot]}`)
        return
      }
      const err = canEquip(bagItem)
      if (err) {
        setDropMessage(err)
        return
      }
      equip(bagItem.uid)
      setActiveSlot(slot)
      setDropMessage(null)
    } catch {
      // Ignore malformed drag payload cleanly.
    }
  }

  return (
    <PanelFrame
      title="อุปกรณ์สวมใส่ & สเตตัส"
      subtitle={`${p.name} · ${job.name} · Combat Power ${formatNum(cp)}`}
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[15.5rem_1fr]">
          {/* Left: Character Preview & Core Stats */}
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-1.5 border-2 border-[#0e0f1a] bg-[#131726] p-3">
              <SpriteModelCanvas
                mode="job"
                id={p.jobId}
                action="auto"
                dir="down"
                weaponOverride={p.equipment.weapon ? ITEMS[p.equipment.weapon.itemId]?.weaponType : undefined}
                weaponColorOverride={p.equipment.weapon ? ITEMS[p.equipment.weapon.itemId]?.color : undefined}
                fashion={fashionLoadout}
                size={88}
                isGm={p.gm}
                rebirthCount={p.rebirthCount ?? 0}
                label={`ตัวละคร ${p.name}`}
              />
              <p className="text-xs font-bold text-primary">
                {p.name} <span className="text-muted-foreground">Lv.{p.level}</span>
              </p>
              {activeTitleDef && (
                <span className="border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                  {activeTitleDef.name}
                </span>
              )}
              <div className="mt-1 flex w-full items-center justify-between border-t border-border/60 pt-1.5 text-[11px]">
                <span className="text-muted-foreground">พลังรบรวม</span>
                <span className="font-mono font-bold text-gold tabular-nums">{formatNum(cp)} CP</span>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-y-1 border-2 border-border bg-muted/70 p-2.5 text-xs">
              <dt className="text-muted-foreground">HP สูงสุด</dt>
              <dd className="text-right font-mono font-semibold text-rose-200 tabular-nums">{formatNum(s.maxHp)}</dd>
              <dt className="text-muted-foreground">MP สูงสุด</dt>
              <dd className="text-right font-mono font-semibold text-sky-200 tabular-nums">{formatNum(s.maxMp)}</dd>
              <dt className="text-muted-foreground">พลังโจมตี (ATK)</dt>
              <dd className="text-right font-mono font-semibold text-emerald-300 tabular-nums">{formatNum(s.atk)}</dd>
              <dt className="text-muted-foreground">พลังป้องกัน (DEF)</dt>
              <dd className="text-right font-mono font-semibold text-cyan-200 tabular-nums">{formatNum(s.def)}</dd>
              <dt className="text-muted-foreground">อัตราคริติคอล</dt>
              <dd className="text-right font-mono font-semibold text-amber-200 tabular-nums">{Math.round(s.crit * 100)}%</dd>
              <dt className="text-muted-foreground">ระยะโจมตี</dt>
              <dd className="text-right text-foreground">{job.ranged ? 'ระยะไกล' : 'ระยะประชิด'}</dd>
            </dl>

            <div className="border-2 border-primary/40 bg-primary/5 p-2.5 text-xs">
              <p className="flex items-center gap-1 font-bold text-primary">
                <Sparkles className="size-3.5" aria-hidden /> โบนัสเซ็ตอุปกรณ์
              </p>
              {setBonus.activeLabels.length === 0 ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  สวมใส่อุปกรณ์ระดับเดียวกัน 2 ชิ้นขึ้นไปเพื่อปลดล็อกโบนัสเซ็ต
                </p>
              ) : (
                <ul className="mt-1 space-y-0.5 text-[11px] text-emerald-300">
                  {setBonus.activeLabels.map((lbl) => (
                    <li key={lbl}>• {lbl}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-2 border-cyan-400/35 bg-cyan-950/15 p-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-cyan-200">รูปลักษณ์แฟชั่นที่ใส่อยู่</p>
                <span className="text-[10px] text-muted-foreground">{equippedFashionList.length} ชิ้น</span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                แฟชั่นแยกจากอุปกรณ์จริงและไม่เปลี่ยนค่าสเตตัสตัวละคร
              </p>
              {equippedFashionList.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {equippedFashionList.slice(0, 6).map(({ slot, def }) => (
                    <li key={slot} className="flex items-center gap-1.5 text-[10.5px] text-foreground">
                      {def.iconAsset && <img src={def.iconAsset} alt="" className="size-4 shrink-0 object-contain" />}
                      <span className="truncate font-medium">{def.name}</span>
                      <span className="ml-auto shrink-0 text-[9.5px] text-muted-foreground">
                        {FASHION_SLOT_LABELS[slot].split('(')[0].trim()}
                      </span>
                    </li>
                  ))}
                  {equippedFashionList.length > 6 && (
                    <li className="text-[10px] text-cyan-300">+{equippedFashionList.length - 6} ชิ้นเพิ่มเติม</li>
                  )}
                </ul>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <PxButton variant="primary" className="flex-1 px-2 py-1 text-[10px]" onClick={() => openPanel('wardrobe')}>
                  แต่งตัวแฟชั่น
                </PxButton>
                {equippedFashionList.length > 0 && (
                  <PxButton
                    variant="secondary"
                    className="px-2 py-1 text-[10px]"
                    onClick={() => unequipAllFashionAction()}
                  >
                    ถอดทั้งหมด
                  </PxButton>
                )}
              </div>
            </div>
          </div>

          {/* Right: 5 Paperdoll Equipment Slots + Bag Quick-Equip */}
          <div className="space-y-3">
            {dropMessage && (
              <p className="border border-amber-400/50 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200" role="status">
                {dropMessage}
              </p>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              {SLOTS.map((slot) => {
                const it = p.equipment[slot]
                const def = it ? ITEMS[it.itemId] : undefined
                const rarityMeta = it && def ? EQUIPMENT_RARITY_META[resolveEffectiveRarity(it, def)] : null
                const runeId = rpgExt.equippedRunes[slot]
                const runeDef = runeId ? RUNE_DEFS[runeId] : null
                const isSelected = activeSlot === slot
                const isDragOver = dragOverSlot === slot

                return (
                  <div
                    key={slot}
                    title={it && def ? `${itemLabel(it)} — ${def.description}` : SLOT_LABELS[slot]}
                    onClick={() => setActiveSlot(slot)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (dragOverSlot !== slot) setDragOverSlot(slot)
                    }}
                    onDragLeave={() => {
                      if (dragOverSlot === slot) setDragOverSlot(null)
                    }}
                    onDrop={(e) => handleDropOnSlot(slot, e)}
                    className={cn(
                      'cursor-pointer rounded border-2 bg-card/85 p-2.5 transition-colors',
                      isDragOver
                        ? 'border-accent bg-accent/15 ring-1 ring-accent'
                        : isSelected
                          ? 'border-primary ring-1 ring-primary/60'
                          : rarityMeta
                            ? rarityMeta.borderColorClass
                            : 'border-border hover:border-primary/60',
                    )}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {SLOT_LABELS[slot]}
                      </span>
                      {runeDef && (
                        <span className="border border-purple-400/40 bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-purple-200">
                          {runeDef.name}
                        </span>
                      )}
                    </div>

                    {it && def ? (
                      <div className="flex items-start gap-2.5">
                        <ItemVfxBox
                          itemId={it.itemId}
                          rarity={resolveEffectiveRarity(it, def)}
                          element={def.element}
                          size="sm"
                          className="size-11 shrink-0 p-1"
                        >
                          <ItemIcon itemId={it.itemId} size={34} />
                        </ItemVfxBox>
                        <div className="min-w-0 flex-1">
                          <p className={cn('truncate text-xs font-bold', rarityMeta ? rarityMeta.textColorClass : 'text-foreground')}>
                            {itemLabel(it)}
                          </p>
                          <p className="text-[10px] text-accent tabular-nums">
                            {slot === 'weapon' ? `ATK +${itemPower(it)}` : `DEF +${itemPower(it)}`}
                            {rarityMeta ? ` · ${rarityMeta.thaiLabel}` : ''}
                          </p>
                          {it.affixes && it.affixes.length > 0 && (
                            <p className="mt-0.5 line-clamp-1 text-[9px] text-primary">
                              {it.affixes.map(formatAffixLabel).join(' · ')}
                            </p>
                          )}
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <PxButton
                              variant="secondary"
                              className="px-2 py-0.5 text-[10px]"
                              onClick={(e) => {
                                e?.stopPropagation()
                                unequip(slot)
                              }}
                            >
                              ถอดออก
                            </PxButton>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-11 items-center justify-center rounded border border-dashed border-border/80 bg-muted/30 text-[11px] text-muted-foreground">
                        ว่าง (ลากไอเทมมาวางได้)
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Quick Equip Candidates from Bag */}
            <div className="rounded border border-border bg-secondary/35 p-2.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Swords className="size-3.5 text-primary" aria-hidden />
                  ไอเทมในกระเป๋าสำหรับช่อง {SLOT_LABELS[activeSlot]} ({bagCandidates.length})
                </p>
                <div className="flex items-center gap-1.5">
                  <PxButton variant="secondary" className="px-2 py-0.5 text-[10px]" onClick={() => openPanel('inventory')}>
                    <span className="inline-flex items-center gap-1">
                      <Backpack className="size-3" aria-hidden />
                      เปิดกระเป๋า
                    </span>
                  </PxButton>
                  <PxButton variant="secondary" className="px-2 py-0.5 text-[10px]" onClick={() => openPanel('talents')}>
                    <span className="inline-flex items-center gap-1">
                      <Zap className="size-3" aria-hidden />
                      พรีเซ็ตเซ็ต
                    </span>
                  </PxButton>
                </div>
              </div>

              {bagCandidates.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  ไม่มีอุปกรณ์สำหรับช่อง {SLOT_LABELS[activeSlot]} ในกระเป๋า
                </p>
              ) : (
                <div className="grid max-h-44 gap-1.5 overflow-y-auto sm:grid-cols-2">
                  {bagCandidates.map((it) => {
                    const def = ITEMS[it.itemId]
                    if (!def) return null
                    const err = canEquip(it)
                    const rarityMeta = EQUIPMENT_RARITY_META[resolveEffectiveRarity(it, def)]
                    const currentEq = p.equipment[activeSlot]
                    const delta = itemPower(it) - (currentEq ? itemPower(currentEq) : 0)

                    return (
                      <div
                        key={it.uid}
                        title={`${itemLabel(it)} — ${def.description}`}
                        className={cn('flex items-center justify-between gap-2 rounded border bg-card/85 p-1.5', rarityMeta.borderColorClass)}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <ItemVfxBox
                            itemId={it.itemId}
                            rarity={resolveEffectiveRarity(it, def)}
                            element={def.element}
                            size="xs"
                            className="size-8 shrink-0 p-0.5"
                          >
                            <ItemIcon itemId={it.itemId} size={24} />
                          </ItemVfxBox>
                          <div className="min-w-0">
                            <p className={cn('truncate text-[11px] font-semibold', rarityMeta.textColorClass)}>
                              {itemLabel(it)}
                            </p>
                            <p className="text-[10px] text-muted-foreground tabular-nums">
                              พลัง {itemPower(it)}{' '}
                              <span className={delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-rose-300' : ''}>
                                ({delta > 0 ? `+${delta}` : delta === 0 ? '±0' : delta})
                              </span>
                            </p>
                          </div>
                        </div>
                        <PxButton
                          variant={err ? 'secondary' : 'primary'}
                          disabled={Boolean(err)}
                          className="shrink-0 px-2 py-1 text-[10px]"
                          title={err ?? 'สวมใส่ทันที'}
                          onClick={() => equip(it.uid)}
                        >
                          {err ? 'ล็อก' : 'ใส่'}
                        </PxButton>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Shield className="size-3.5 text-accent" aria-hidden />
                เคล็ดลับ: เปิดหน้าต่างกระเป๋าคู่กันแล้วลากอาวุธ/เกราะมาวางที่ช่องได้ทันที
              </span>
              <PxButton
                variant={canOpenEnhance ? 'secondary' : 'secondary'}
                disabled={!canOpenEnhance}
                title={
                  canOpenEnhance
                    ? 'เปิดหน้าต่างตีบวกอุปกรณ์'
                    : 'คุยกับ ช่างเหล็กบุญมา ในเมือง หรือเปิดใช้งาน VIP เพื่อตีบวกระยะไกล'
                }
                onClick={() => openPanel('enhance')}
              >
                {vipRemoteEnhance && !nearBlacksmith
                  ? 'ตีบวกระยะไกล (VIP)'
                  : canOpenEnhance
                    ? 'ไปตีบวก / อัปเกรด'
                    : 'ตีบวกระยะไกล (เฉพาะ VIP)'}
              </PxButton>
            </div>
          </div>
        </div>
      </div>
    </PanelFrame>
  )
}
