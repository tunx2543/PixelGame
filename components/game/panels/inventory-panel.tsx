'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Lock, Sparkles } from 'lucide-react'
import { ITEMS, JOBS } from '@/lib/game/data'
import { closePanel, consumeItem, drinkPotion, equip, getInventoryCapacity, itemLabel, saveGame, unequip } from '@/lib/game/engine'
import {
  EQUIPMENT_RARITY_META,
  formatAffixLabel,
  resolveEffectiveRarity,
} from '@/lib/game/mmo-systems'
import { computeEquipmentSetBonuses } from '@/lib/game/rpg-systems'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { ItemIcon } from '../item-icon'
import { PanelFrame, PxButton } from './panels'

export function InventoryPanel() {
  const { p } = useGame()
  const [tab, setTab] = useState<'items' | 'use'>('items')
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  if (!p) return null

  const selectedInvItem = selectedUid ? p.inventory.find((entry) => entry.uid === selectedUid) ?? null : null
  const selectedItem = selectedInvItem ? ITEMS[selectedInvItem.itemId] : null
  const selectedRarity = selectedInvItem && selectedItem ? resolveEffectiveRarity(selectedInvItem, selectedItem) : 'common'
  const selectedRarityMeta = EQUIPMENT_RARITY_META[selectedRarity]
  const setBonus = computeEquipmentSetBonuses(p.equipment)

  const selectedMeta = selectedItem ? {
    jobs: selectedItem.kind === 'weapon'
      ? (selectedItem.weaponType
          ? Object.values(JOBS).filter((job) => job.weaponTypes.includes(selectedItem.weaponType!)).map((job) => job.name).join(', ')
          : 'ทุกอาชีพ')
      : 'ทุกอาชีพ',
    level: selectedItem.reqLevel ?? 1,
    slot: selectedItem.kind === 'weapon' ? 'อาวุธ' : selectedItem.kind === 'armor' ? 'เกราะ' : 'ไอเทมทั่วไป',
  } : null
  const visibleItems = p.inventory.filter((item) => tab === 'items'
    ? ITEMS[item.itemId]?.kind === 'weapon' || ITEMS[item.itemId]?.kind === 'armor'
    : ITEMS[item.itemId]?.kind === 'consumable')

  return (
    <PanelFrame title="กระเป๋าและอุปกรณ์" subtitle={`${p.inventory.length} / ${getInventoryCapacity(p)} ช่องที่ใช้`}>
      <div className="mb-3 grid grid-cols-2 gap-1">
        <PxButton variant={tab === 'items' ? 'primary' : 'secondary'} onClick={() => setTab('items')}>อุปกรณ์</PxButton>
        <PxButton variant={tab === 'use' ? 'primary' : 'secondary'} onClick={() => setTab('use')}>ใช้ไอเทม</PxButton>
      </div>
      {tab === 'use' && (
        <div className="mb-3 flex gap-2">
          <PxButton onClick={() => drinkPotion('hp')}>ใช้ยา HP</PxButton>
          <PxButton onClick={() => drinkPotion('mp')}>ใช้ยา MP</PxButton>
        </div>
      )}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(['weapon', 'armor', 'shoes', 'cloak', 'accessory'] as const).map((slot) => {
          const item = p.equipment[slot]
          const def = item ? ITEMS[item.itemId] : undefined
          const rMeta = item && def ? EQUIPMENT_RARITY_META[resolveEffectiveRarity(item, def)] : null
          return (
            <div key={slot} className={cn('rounded border bg-secondary/60 p-2', rMeta ? rMeta.borderColorClass : 'border-border')}>
              <p className="mb-1 text-[10px] text-muted-foreground">{{ weapon: 'อาวุธ', armor: 'เกราะ', shoes: 'รองเท้า', cloak: 'ผ้าคลุม', accessory: 'เครื่องประดับ' }[slot]}</p>
              {item ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('truncate text-xs font-semibold', rMeta ? rMeta.textColorClass : 'text-primary')}>
                      {itemLabel(item)}
                    </span>
                    <PxButton variant="secondary" onClick={() => unequip(slot)}>ถอด</PxButton>
                  </div>
                  {item.affixes && item.affixes.length > 0 && (
                    <p className="truncate text-[10px] text-primary">
                      {item.affixes.map(formatAffixLabel).join(' · ')}
                    </p>
                  )}
                </div>
              ) : <span className="text-xs text-muted-foreground">ว่าง</span>}
            </div>
          )
        })}
      </div>

      {/* Active Set Bonuses */}
      <div className="mb-3 rounded border border-primary/40 bg-primary/5 p-2 text-xs">
        <p className="flex items-center gap-1 font-bold text-primary">
          <Sparkles className="size-3.5" aria-hidden /> โบนัสเซ็ตอุปกรณ์
        </p>
        {setBonus.activeLabels.length === 0 ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">สวมใส่อุปกรณ์ 2 ชิ้นขึ้นไปเพื่อปลดล็อกโบนัสเซ็ต</p>
        ) : (
          <p className="mt-0.5 text-[11px] text-emerald-300">{setBonus.activeLabels.join(' · ')}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visibleItems.map((item) => {
          const def = ITEMS[item.itemId]
          if (!def) return null
          const equipable = def.kind === 'weapon' || def.kind === 'armor'
          const rMeta = equipable ? EQUIPMENT_RARITY_META[resolveEffectiveRarity(item, def)] : null
          return (
            <div
              key={item.uid}
              className={cn(
                'flex flex-col justify-between rounded border bg-card/80 p-2 transition',
                selectedUid === item.uid
                  ? 'border-primary ring-1 ring-primary'
                  : rMeta
                    ? rMeta.borderColorClass
                    : 'border-border hover:border-primary/70',
              )}
            >
              <button
                type="button"
                onClick={() => setSelectedUid(item.uid)}
                className="mb-2 flex w-full items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded border border-white/20" style={{ backgroundColor: `${def.color}33` }}>
                  <ItemIcon itemId={item.itemId} size={30} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{itemLabel(item)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {rMeta ? <span className={rMeta.textColorClass}>{rMeta.thaiLabel} · </span> : null}
                    x{item.qty}
                    {item.bound ? ' · ผูกมัด' : ''}
                  </p>
                  {item.affixes && item.affixes.length > 0 && (
                    <p className="truncate text-[9px] text-primary">
                      {item.affixes.map(formatAffixLabel).join(' · ')}
                    </p>
                  )}
                </div>
              </button>
              {equipable && <PxButton className="w-full" onClick={() => equip(item.uid)}>สวมใส่</PxButton>}
              {def.kind === 'consumable' && <PxButton className="w-full" onClick={() => consumeItem(item.uid)}>ใช้ 1 ชิ้น</PxButton>}
            </div>
          )
        })}
      </div>
      {visibleItems.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">ไม่มีไอเทมในหมวดนี้</p>}
      {selectedInvItem && selectedItem && selectedMeta && (
        <div className="mt-4 rounded border border-primary/50 bg-primary/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-pixel text-sm text-primary">รายละเอียดไอเทม</h3>
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelectedUid(null)} aria-label="ปิดรายละเอียด">ปิด</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-pixel text-base text-foreground">{itemLabel(selectedInvItem)}</p>
            {(selectedItem.kind === 'weapon' || selectedItem.kind === 'armor') && (
              <span className={cn('px-1.5 py-0.5 text-[10px] font-bold', selectedRarityMeta.badgeBgClass, selectedRarityMeta.textColorClass)}>
                {selectedRarityMeta.thaiLabel}
              </span>
            )}
            {selectedInvItem.bound && (
              <span className="inline-flex items-center gap-0.5 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                <Lock className="size-2.5" aria-hidden /> ผูกมัด
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{selectedItem.description}</p>
          {selectedInvItem.affixes && selectedInvItem.affixes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedInvItem.affixes.map((af, idx) => (
                <span key={`${af.stat}-${idx}`} className="border border-primary/40 bg-background/60 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {formatAffixLabel(af)}
                </span>
              ))}
            </div>
          )}
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-muted-foreground">ช่องสวมใส่</dt><dd className="text-foreground">{selectedMeta.slot}</dd></div>
            <div><dt className="text-muted-foreground">เลเวลที่ใช้ได้</dt><dd className="text-foreground">Lv. {selectedMeta.level} ขึ้นไป</dd></div>
            {selectedItem.atk !== undefined && <div><dt className="text-muted-foreground">พลังโจมตี</dt><dd className="text-emerald-300">+{selectedItem.atk}</dd></div>}
            {selectedItem.def !== undefined && <div><dt className="text-muted-foreground">พลังป้องกัน</dt><dd className="text-sky-300">+{selectedItem.def}</dd></div>}
            <div className="col-span-2"><dt className="text-muted-foreground">อาชีพที่ใส่ได้</dt><dd className="text-primary">{selectedMeta.jobs}</dd></div>
          </dl>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between gap-2">
        <Link
          href="/inventory"
          onClick={() => saveGame()}
          className="pixel-btn bg-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:brightness-110"
        >
          เปิดคลังไอเทมเต็มจอ
        </Link>
        <PxButton variant="secondary" onClick={closePanel}>ปิด</PxButton>
      </div>
    </PanelFrame>
  )
}
