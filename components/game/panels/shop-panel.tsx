'use client'

import { useState } from 'react'
import { ITEMS, SHOP_STOCK } from '@/lib/game/data'
import { buyItem, hasVipRemoteAccess, isNearTownNpcRole, itemLabel, sellItem, sellPrice } from '@/lib/game/engine'
import { compareEquipmentItem } from '@/lib/game/item-compare'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { formatNum } from '../format'
import { ItemIcon } from '../item-icon'
import { PanelFrame, PxButton } from './panels'

const TYPE_NAME: Record<string, string> = { stick: 'กระบอง', sword: 'ดาบ', staff: 'คทา', bow: 'ธนู', dagger: 'มีด' }

export function ShopPanel() {
  const g = useGame()
  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)
  if (!g.p) return null
  const p = g.p
  const isRemoteVip = hasVipRemoteAccess(p) && !isNearTownNpcRole('shop')
  const tooltipDef = hoveredItemId ? ITEMS[hoveredItemId] : null

  return (
    <PanelFrame
      title={isRemoteVip ? 'ร้านค้าลุงสมปอง (VIP ระยะไกล)' : 'ร้านค้าลุงสมปอง'}
      subtitle={
        isRemoteVip
          ? 'สิทธิ์ VIP ระยะไกล — ซื้อยา อุปกรณ์ หินตีบวก และขายไอเทมได้จากทุกแผนที่'
          : 'ซื้อยา อุปกรณ์ และหินตีบวก หรือขายของที่หามาได้'
      }
    >
      <div className="mb-3 flex gap-1.5" role="tablist">
        {(['buy', 'sell'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn('pixel-btn px-4 py-1.5 text-sm', tab === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}
          >
            {t === 'buy' ? 'ซื้อ' : 'ขาย'}
          </button>
        ))}
      </div>

      {tooltipDef && (
        <div className="mb-3 flex items-center gap-3 border-2 border-primary/50 bg-background/80 p-2.5 text-xs">
          <div className="grid size-11 shrink-0 place-items-center border border-border bg-muted">
            <ItemIcon itemId={tooltipDef.id} size={36} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-primary">{tooltipDef.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {tooltipDef.description}
              {tooltipDef.atk ? ` · ATK +${tooltipDef.atk}` : ''}
              {tooltipDef.def ? ` · DEF +${tooltipDef.def}` : ''}
              {tooltipDef.reqLevel && tooltipDef.reqLevel > 1 ? ` · Lv.${tooltipDef.reqLevel}` : ''}
            </p>
          </div>
        </div>
      )}

      {tab === 'buy' ? (
        <ul className="grid gap-2 md:grid-cols-2">
          {SHOP_STOCK.map((id) => {
            const def = ITEMS[id]
            if (!def) return null
            const stack = def.kind === 'consumable' || def.kind === 'material'
            const cmp = compareEquipmentItem({ itemId: id, plus: 0 }, p)
            return (
              <li
                key={id}
                title={`${def.name} — ${def.description}`}
                onMouseEnter={() => setHoveredItemId(id)}
                onMouseLeave={() => setHoveredItemId((cur) => (cur === id ? null : cur))}
                className="flex items-center gap-3 border-2 border-border bg-muted p-2"
              >
                <ItemIcon itemId={id} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm text-foreground">{def.name}</p>
                    {cmp && !cmp.isCompatibleJob && (
                      <span className="rounded bg-slate-700/80 px-1 py-0.5 text-[9px] font-semibold text-slate-300">
                        ไม่ตรงสาย
                      </span>
                    )}
                    {cmp && cmp.isCompatibleJob && cmp.powerDelta !== 0 && (
                      <span
                        title={`เทียบกับ ${cmp.equippedName ?? 'ช่องว่าง'}`}
                        className={cn(
                          'rounded px-1.5 py-0.5 font-mono text-[9.5px] font-extrabold tabular-nums',
                          cmp.powerDelta > 0
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300',
                        )}
                      >
                        {cmp.powerDelta > 0 ? `▲ +${cmp.powerDelta} พลัง` : `▼ ${cmp.powerDelta} พลัง`}
                      </span>
                    )}
                    {cmp && cmp.isCompatibleJob && cmp.powerDelta === 0 && (
                      <span className="rounded bg-secondary px-1 py-0.5 text-[9px] text-muted-foreground">
                        พลังเท่าเดิม
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {def.weaponType ? `${TYPE_NAME[def.weaponType]} ATK +${def.atk}` : def.description}
                    {def.reqLevel && def.reqLevel > 1 ? ` • Lv.${def.reqLevel}` : ''}
                  </p>
                  <p className="text-xs text-gold">{formatNum(def.price)} G</p>
                </div>
                <div className="flex flex-col gap-1">
                  <PxButton onClick={() => buyItem(id, 1)} disabled={p.gold < def.price}>
                    ซื้อ
                  </PxButton>
                  {stack && (
                    <PxButton variant="secondary" onClick={() => buyItem(id, 10)} disabled={p.gold < def.price * 10}>
                      x10
                    </PxButton>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : p.inventory.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">กระเป๋าว่างเปล่า</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {p.inventory.map((it) => {
            const def = ITEMS[it.itemId]
            return (
              <li
                key={it.uid}
                title={def ? `${def.name} — ${def.description}` : undefined}
                onMouseEnter={() => setHoveredItemId(it.itemId)}
                onMouseLeave={() => setHoveredItemId((cur) => (cur === it.itemId ? null : cur))}
                className="flex items-center gap-3 border-2 border-border bg-muted p-2"
              >
                <ItemIcon itemId={it.itemId} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {itemLabel(it)} {it.qty > 1 && <span className="text-muted-foreground">x{it.qty}</span>}
                  </p>
                  <p className="text-xs text-gold">{formatNum(sellPrice(it))} G / ชิ้น</p>
                </div>
                <div className="flex flex-col gap-1">
                  <PxButton variant="accent" onClick={() => sellItem(it.uid, 1)}>
                    ขาย
                  </PxButton>
                  {it.qty > 1 && (
                    <PxButton variant="secondary" onClick={() => sellItem(it.uid, it.qty)}>
                      ทั้งหมด
                    </PxButton>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </PanelFrame>
  )
}
