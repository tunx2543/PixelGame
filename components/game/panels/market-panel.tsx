'use client'

import { useCallback, useEffect, useState } from 'react'
import { Coins, PlusCircle, RefreshCw, Search, ShoppingBag, Trash2 } from 'lucide-react'
import { ITEMS } from '@/lib/game/data'
import { auth } from '@/lib/firebase/client'
import {
  buyMarketListing,
  cancelMarketListing,
  createMarketListing,
  listMarketListings,
  type MarketListingRecord,
} from '@/lib/firebase/rpg-online'
import {
  addItem,
  completeMarketPurchaseAction,
  listInventoryItemForMarketAction,
  receiveMarketProceedsAction,
} from '@/lib/game/engine'
import { isItemListableOnMarket } from '@/lib/game/extended-systems'
import { playQuestClaimSfx } from '@/lib/game/sfx'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { ItemIcon } from '../item-icon'
import { PanelFrame, PxButton } from './panels'

export function MarketPanel() {
  const { p } = useGame()
  const [tab, setTab] = useState<'browse' | 'sell'>('browse')
  const [listings, setListings] = useState<MarketListingRecord[]>([])
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | 'weapon' | 'armor' | 'material' | 'consumable'>('all')
  const [selectedUid, setSelectedUid] = useState<string>('')
  const [sellQty, setSellQty] = useState('1')
  const [sellPrice, setSellPrice] = useState('300')
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refreshListings = useCallback(async () => {
    const items = await listMarketListings()
    setListings(items)
  }, [])

  useEffect(() => {
    void refreshListings()
  }, [refreshListings])

  if (!p) return null
  const currentUid = auth.currentUser?.uid ?? 'guest_player'
  const sellableItems = p.inventory.filter((it) => isItemListableOnMarket(ITEMS[it.itemId]))

  const filtered = listings.filter((l) => {
    if (kindFilter !== 'all' && l.kind !== kindFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      return l.itemName.toLowerCase().includes(q) || l.sellerName.toLowerCase().includes(q)
    }
    return true
  })

  const handleBuy = async (listing: MarketListingRecord) => {
    if (busy) return
    if (p.gold < listing.priceGold) {
      setNotice(`ทองไม่พอ (ต้องการ ${formatNum(listing.priceGold)} G)`)
      return
    }
    setBusy(true)
    const res = await buyMarketListing(listing.listingId, p.name)
    if (!res.ok || !res.listing) {
      setBusy(false)
      setNotice(res.error ?? 'ไม่สามารถซื้อรายการนี้ได้')
      await refreshListings()
      return
    }
    const buyResult = completeMarketPurchaseAction(res.listing.priceGold, {
      itemId: res.listing.itemId,
      qty: res.listing.qty,
      plus: res.listing.plus,
    })
    setBusy(false)
    if (buyResult.ok) playQuestClaimSfx(false)
    setNotice(buyResult.message)
    await refreshListings()
  }

  const handleCancel = async (listing: MarketListingRecord) => {
    if (busy) return
    setBusy(true)
    const res = await cancelMarketListing(listing.listingId)
    if (res.ok) {
      addItem(listing.itemId, listing.qty, listing.plus)
      setNotice(`ยกเลิกการขายและคืน ${listing.itemName} x${listing.qty} เข้ากระเป๋าแล้ว`)
    } else {
      setNotice(res.error ?? 'ยกเลิกไม่สำเร็จ')
    }
    setBusy(false)
    await refreshListings()
  }

  const handleListForSale = async () => {
    if (busy) return
    const targetItem = sellableItems.find((i) => i.uid === selectedUid) ?? sellableItems[0]
    if (!targetItem) {
      setNotice('ไม่มีไอเทมในกระเป๋าที่ลงตลาดได้')
      return
    }
    const qty = Math.max(1, Math.min(targetItem.qty, Math.floor(Number(sellQty) || 1)))
    const price = Math.max(10, Math.min(100_000_000, Math.floor(Number(sellPrice) || 100)))

    setBusy(true)
    const take = listInventoryItemForMarketAction(targetItem.uid, qty)
    if (!take.ok || !take.item) {
      setBusy(false)
      setNotice(take.message)
      return
    }

    const res = await createMarketListing({
      sellerName: p.name,
      sellerGameUid: p.gameUid ?? '1000',
      itemId: take.item.itemId,
      itemName: take.item.itemName,
      kind: take.item.kind,
      qty: take.item.qty,
      plus: take.item.plus,
      priceGold: price,
    })

    if (!res.ok) {
      addItem(take.item.itemId, take.item.qty, take.item.plus)
      setNotice(res.error ?? 'ลงขายไม่สำเร็จ')
    } else {
      setNotice(`ลงขาย ${take.item.itemName} x${take.item.qty} ราคา ${formatNum(price)} G สำเร็จ!`)
      setSelectedUid('')
      setTab('browse')
    }
    setBusy(false)
    await refreshListings()
  }

  return (
    <PanelFrame
      title="ตลาดกลางผู้เล่น (Auction House)"
      subtitle="ซื้อขายอาวุธ ชุดเกราะ แร่วัตถุดิบ และอาหารบัฟกับผู้เล่นอื่น"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
        <div className="flex flex-wrap gap-2">
          <PxButton variant={tab === 'browse' ? 'primary' : 'secondary'} onClick={() => setTab('browse')}>
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="size-3.5" aria-hidden /> เดินตลาด ({listings.length})
            </span>
          </PxButton>
          <PxButton variant={tab === 'sell' ? 'primary' : 'secondary'} onClick={() => setTab('sell')}>
            <span className="flex items-center gap-1.5">
              <PlusCircle className="size-3.5" aria-hidden /> ลงขายไอเทม ({sellableItems.length})
            </span>
          </PxButton>
        </div>
        <PxButton variant="secondary" onClick={() => void refreshListings()}>
          <span className="flex items-center gap-1">
            <RefreshCw className="size-3.5" aria-hidden /> รีเฟรช
          </span>
        </PxButton>
      </div>

      {notice && (
        <div className="mb-3 border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary" role="status">
          {notice}
        </div>
      )}

      {tab === 'browse' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[12rem]">
              <Search className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-muted-foreground" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อไอเทม หรือผู้ขาย..."
                className="pixel-input w-full py-1.5 pl-8 pr-2.5 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ['all', 'ทั้งหมด'],
                  ['weapon', 'อาวุธ'],
                  ['armor', 'ชุด/เครื่องประดับ'],
                  ['material', 'วัตถุดิบ'],
                  ['consumable', 'ยา/อาหาร'],
                ] as const
              ).map(([key, label]) => (
                <PxButton
                  key={key}
                  variant={kindFilter === key ? 'accent' : 'secondary'}
                  onClick={() => setKindFilter(key)}
                  className="px-2 py-1 text-[11px]"
                >
                  {label}
                </PxButton>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="border border-border/70 bg-background/50 p-4 text-center text-xs text-muted-foreground">
              ไม่พบสินค้าที่ตรงกับคำค้นหา
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filtered.map((item) => {
                const isOwn = item.sellerUid === currentUid && !item.listingId.startsWith('seed_mkt_')
                return (
                  <div
                    key={item.listingId}
                    className="flex items-center justify-between gap-2 border border-border/80 bg-background/60 p-2.5 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-muted/80">
                        <ItemIcon itemId={item.itemId} size={28} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground">
                          {item.itemName}
                          {item.plus > 0 ? <span className="text-gold"> +{item.plus}</span> : ''}
                          {item.qty > 1 ? ` x${item.qty}` : ''}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          ผู้ขาย: {item.sellerName} #{item.sellerGameUid}
                        </p>
                        <p className="flex items-center gap-1 font-bold text-gold tabular-nums">
                          <Coins className="size-3" aria-hidden /> {formatNum(item.priceGold)} G
                        </p>
                      </div>
                    </div>
                    {isOwn ? (
                      <PxButton variant="danger" disabled={busy} onClick={() => handleCancel(item)}>
                        <span className="flex items-center gap-1">
                          <Trash2 className="size-3" aria-hidden /> ยกเลิก
                        </span>
                      </PxButton>
                    ) : (
                      <PxButton
                        variant="primary"
                        disabled={busy || p.gold < item.priceGold}
                        onClick={() => handleBuy(item)}
                      >
                        ซื้อเลย
                      </PxButton>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'sell' && (
        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-2 border border-border/80 bg-background/60 p-3">
            <h3 className="text-xs font-bold text-primary">เลือกไอเทมจากกระเป๋าที่จะลงขาย</h3>
            {sellableItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">ไม่มีไอเทมที่ลงขายได้ในกระเป๋า</p>
            ) : (
              <div className="grid max-h-60 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {sellableItems.map((it) => {
                  const def = ITEMS[it.itemId]
                  const active = (selectedUid || sellableItems[0]?.uid) === it.uid
                  return (
                    <button
                      key={it.uid}
                      type="button"
                      onClick={() => {
                        setSelectedUid(it.uid)
                        setSellQty('1')
                        setSellPrice(String(Math.max(50, (def?.price ?? 80) * 2)))
                      }}
                      className={`flex items-center gap-2 border p-2 text-left text-xs ${
                        active ? 'border-primary bg-primary/15' : 'border-border/70 bg-background/80 hover:border-primary/60'
                      }`}
                    >
                      <ItemIcon itemId={it.itemId} size={24} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">
                          {def?.name ?? it.itemId}
                          {it.plus > 0 ? ` +${it.plus}` : ''}
                        </p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">มี x{it.qty}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-3 border border-border/80 bg-background/60 p-3 text-xs">
            <h3 className="font-bold text-primary">ตั้งราคาขาย</h3>
            <label className="block space-y-1">
              <span className="text-muted-foreground">จำนวนที่ลงขาย</span>
              <input
                type="number"
                min={1}
                value={sellQty}
                onChange={(e) => setSellQty(e.target.value)}
                className="pixel-input w-full px-2.5 py-1.5 text-xs tabular-nums"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-muted-foreground">ราคารวมทั้งหมด (Gold)</span>
              <input
                type="number"
                min={10}
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="pixel-input w-full px-2.5 py-1.5 text-xs tabular-nums"
              />
            </label>
            <PxButton
              variant="accent"
              className="w-full"
              disabled={busy || sellableItems.length === 0}
              onClick={handleListForSale}
            >
              ลงประกาศขายในตลาดกลาง
            </PxButton>
            <button
              type="button"
              onClick={() => {
                receiveMarketProceedsAction(0)
              }}
              className="hidden"
            />
          </div>
        </div>
      )}
    </PanelFrame>
  )
}
