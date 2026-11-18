'use client'

import { useState } from 'react'
import { Warehouse } from 'lucide-react'
import {
  deposit,
  getInventoryCapacity,
  getInventoryCapacityBreakdown,
  getStorageCapacity,
  getStorageCapacityBreakdown,
  moveGold,
  openPanel,
  withdraw,
} from '@/lib/game/engine'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { formatNum } from '../format'
import { ItemSlot } from '../item-icon'
import { PanelFrame, PxButton } from './panels'

type MoveQtyMode = 1 | 10 | 'all'

export function StoragePanel() {
  const g = useGame()
  const [amount, setAmount] = useState('')
  const [qtyMode, setQtyMode] = useState<MoveQtyMode>('all')
  const [notice, setNotice] = useState<string | null>(null)
  if (!g.p) return null
  const p = g.p
  const invCap = getInventoryCapacity(p)
  const storCap = getStorageCapacity(p)
  const invBreakdown = getInventoryCapacityBreakdown(p)
  const storBreakdown = getStorageCapacityBreakdown(p)
  const moveQty = qtyMode === 'all' ? Infinity : qtyMode

  return (
    <PanelFrame title="คลังเก็บของพี่มณี" subtitle="คลิกไอเทมเพื่อย้ายระหว่างกระเป๋าและคลัง (รองรับขยายช่องถาวร + โบนัส VIP)">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-2 border-border bg-muted/60 px-3 py-2 text-[11px]">
        <div className="space-y-0.5 text-muted-foreground tabular-nums">
          <p>
            กระเป๋า: <strong className="text-foreground">{p.inventory.length}/{invCap}</strong> (พื้นฐาน{' '}
            {invBreakdown.base} + ดวงดาว {invBreakdown.scrollBonus} + พรีเมียม {invBreakdown.premiumExtra} + VIP{' '}
            {invBreakdown.vipExtra})
          </p>
          <p>
            คลังเก็บของ: <strong className="text-amber-200">{p.storage.length}/{storCap}</strong> (พื้นฐาน{' '}
            {storBreakdown.base} + พรีเมียม {storBreakdown.premiumExtra} + VIP {storBreakdown.vipExtra})
          </p>
        </div>
        <PxButton variant="secondary" onClick={() => openPanel('gem-shop')}>
          <Warehouse className="mr-1 inline size-3.5" aria-hidden />
          ขยายกระเป๋า & คลัง
        </PxButton>
      </div>

      <div className="mb-3 flex flex-col gap-2 border-2 border-border bg-muted p-3 md:flex-row md:items-center">
        <div className="flex-1 text-xs">
          <p className="text-muted-foreground">
            เงินในตัว: <span className="text-gold">{formatNum(p.gold)} G</span>
          </p>
          <p className="text-muted-foreground">
            เงินในคลัง: <span className="text-gold">{formatNum(p.storageGold)} G</span>
          </p>
        </div>
        <label htmlFor="gold-amount" className="sr-only">
          จำนวนเงิน
        </label>
        <input
          id="gold-amount"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          placeholder="จำนวนเงิน"
          className="w-full border-2 border-border bg-input px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary md:w-32"
        />
        <div className="flex gap-1.5">
          <PxButton onClick={() => moveGold(Number(amount || p.gold), true)}>ฝาก{amount ? '' : 'ทั้งหมด'}</PxButton>
          <PxButton variant="accent" onClick={() => moveGold(Number(amount || p.storageGold), false)}>
            ถอน{amount ? '' : 'ทั้งหมด'}
          </PxButton>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">จำนวนต่อการคลิก (ไอเทมซ้อน):</span>
        <div className="flex gap-1.5">
          {(
            [
              [1, '1 ชิ้น'],
              [10, '10 ชิ้น'],
              ['all', 'ทั้งหมด'],
            ] as const
          ).map(([val, label]) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => setQtyMode(val)}
              className={cn(
                'pixel-btn px-2.5 py-1 text-[11px]',
                qtyMode === val ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <p className="mb-3 border border-amber-400/50 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200" role="status">
          {notice}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">
            กระเป๋า ({p.inventory.length}/{invCap}) — คลิกเพื่อฝาก
          </p>
          <div className="grid grid-cols-8 gap-1">
            {p.inventory.map((it) => (
              <ItemSlot
                key={it.uid}
                item={it}
                onClick={() => {
                  const res = deposit(it.uid, moveQty)
                  setNotice(res.ok ? null : res.message ?? 'ไม่สามารถฝากไอเทมได้')
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">
            คลัง ({p.storage.length}/{storCap}) — คลิกเพื่อถอน
          </p>
          {p.storage.length === 0 ? (
            <p className="border-2 border-dashed border-border p-4 text-center text-xs text-muted-foreground">คลังว่างเปล่า</p>
          ) : (
            <div className="grid grid-cols-8 gap-1">
              {p.storage.map((it) => (
                <ItemSlot
                  key={it.uid}
                  item={it}
                  onClick={() => {
                    const res = withdraw(it.uid, moveQty)
                    setNotice(res.ok ? null : res.message ?? 'ไม่สามารถถอนไอเทมได้')
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PanelFrame>
  )
}
