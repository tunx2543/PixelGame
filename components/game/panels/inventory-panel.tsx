'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowUpDown,
  Backpack,
  Crown,
  Eye,
  Feather,
  Gem,
  Lock,
  PawPrint,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Wind,
} from 'lucide-react'
import { ITEMS, JOBS, type EquipmentSlot, type ItemDef } from '@/lib/game/data'
import {
  canEquip,
  closePanel,
  consumeItem,
  ensurePremiumState,
  equip,
  equipCombatPet,
  equipCosmeticAction,
  equipFashionAction,
  equipMount,
  getInventoryCapacity,
  getQuickSlots,
  itemLabel,
  itemPower,
  openPanel,
  resolvePlayerFashionLoadout,
  saveGame,
  setQuickSlot,
  toggleMountRiding,
  unequipAllFashionAction,
} from '@/lib/game/engine'
import type { FashionLoadout } from '@/lib/game/fashion-renderer'
import {
  COSMETIC_DEFS,
  QUICK_SLOT_COUNT,
  sanitizeExtV2,
} from '@/lib/game/extended-systems'
import {
  FASHION_CHARACTER_SLOTS,
  FASHION_SLOT_LABELS,
  PREMIUM_FASHION_ITEMS,
  getFashionItemDef,
} from '@/lib/game/premium/fashion-pet'
import type { FashionSlot } from '@/lib/game/premium/types'
import { getEffectiveVipBonuses } from '@/lib/game/premium/vip'
import type { Dir } from '@/lib/game/sprites'
import { getMountDef, sanitizeMountState } from '@/lib/game/mounts'
import { compareEquipmentItem } from '@/lib/game/item-compare'
import {
  EQUIPMENT_RARITY_META,
  formatAffixLabel,
  resolveEffectiveRarity,
  type EquipmentRarity,
} from '@/lib/game/mmo-systems'
import {
  getCombatPetDef,
  sanitizePetState,
} from '@/lib/game/systems'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { ItemIcon } from '../item-icon'
import { SpriteModelCanvas } from '../sprite-model-canvas'
import { PanelFrame, PxButton } from './panels'

type InventoryTabId =
  | 'all'
  | 'equipment'
  | 'accessories'
  | 'consumables'
  | 'materials'
  | 'quest'
  | 'fashion'
  | 'pets'

type RarityFilter = 'all' | EquipmentRarity
type TypeFilter = 'all' | 'weapon' | 'armor' | 'shoes' | 'cloak' | 'potion' | 'food' | 'scroll'
type SortOption = 'default' | 'level-desc' | 'level-asc' | 'rarity-desc' | 'rarity-asc' | 'power-desc'

const TABS: Array<{ id: InventoryTabId; label: string }> = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'equipment', label: 'อุปกรณ์' },
  { id: 'accessories', label: 'เครื่องประดับ' },
  { id: 'consumables', label: 'ของใช้' },
  { id: 'materials', label: 'วัตถุดิบ' },
  { id: 'quest', label: 'ภารกิจ' },
  { id: 'fashion', label: 'แฟชั่น' },
  { id: 'pets', label: 'สัตว์เลี้ยง' },
]

const RARITY_ORDER: Record<EquipmentRarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
}

const QUEST_ITEM_IDS = new Set([
  'earth_core',
  'ember_core',
  'abyss_crystal',
  'demon_horn',
  'pet_essence',
  'town_warp_tome',
  'astral_bag_expansion',
  'name_change_ticket',
])

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'อาวุธ',
  armor: 'เกราะ',
  shoes: 'รองเท้า',
  cloak: 'ผ้าคลุม',
  accessory: 'เครื่องประดับ',
}

function getEffectiveRarityForAny(item: { itemId: string; rarity?: EquipmentRarity }, def: ItemDef): EquipmentRarity {
  if (def.kind === 'weapon' || def.kind === 'armor') {
    return resolveEffectiveRarity(item, def)
  }
  if (def.id === 'astral_bag_expansion' || def.id === 'starlight_loot_magnet' || def.id === 'abyss_crystal') {
    return 'legendary'
  }
  if (def.id === 'earth_core' || def.id === 'pet_essence' || def.id === 'food_dragon_soup' || def.id === 'food_hero_feast') {
    return 'epic'
  }
  if (def.id === 'enhance_stone' || def.id === 'white_potion' || def.id === 'purple_potion' || def.id === 'town_warp_tome') {
    return 'rare'
  }
  if (def.id === 'orange_potion' || def.id === 'return_scroll' || def.id === 'ore_mythril' || def.id === 'herb_moon' || def.id === 'fish_golden') {
    return 'uncommon'
  }
  return 'common'
}

export function InventoryPanel() {
  const { p } = useGame()
  const [tab, setTab] = useState<InventoryTabId>('all')
  const [search, setSearch] = useState('')
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('default')
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [hoveredUid, setHoveredUid] = useState<string | null>(null)
  const [assignFeedback, setAssignFeedback] = useState<string | null>(null)
  const [fashionSlotFilter, setFashionSlotFilter] = useState<'all' | FashionSlot>('all')
  const [fashionPreviewOverrides, setFashionPreviewOverrides] = useState<Partial<Record<FashionSlot, string | null>>>({})
  const [fashionPreviewDir, setFashionPreviewDir] = useState<Dir>('down')

  const inventory = p?.inventory ?? []
  const capacity = p ? getInventoryCapacity(p) : 40
  const usedSlots = inventory.length
  const freeSlots = Math.max(0, capacity - usedSlots)

  const filteredItems = useMemo(() => {
    if (tab === 'fashion' || tab === 'pets') return []
    const q = search.trim().toLowerCase()

    const list = inventory.filter((item) => {
      const def = ITEMS[item.itemId]
      if (!def) return false

      // Tab filter
      if (tab === 'equipment') {
        const slot = def.slot ?? (def.kind === 'weapon' ? 'weapon' : 'armor')
        if ((def.kind !== 'weapon' && def.kind !== 'armor') || slot === 'accessory') return false
      } else if (tab === 'accessories') {
        if (def.kind !== 'armor' || def.slot !== 'accessory') return false
      } else if (tab === 'consumables') {
        if (def.kind !== 'consumable') return false
      } else if (tab === 'materials') {
        if (def.kind !== 'material') return false
      } else if (tab === 'quest') {
        if (!QUEST_ITEM_IDS.has(item.itemId)) return false
      }

      // Type sub-filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'weapon' && def.kind !== 'weapon') return false
        if (typeFilter === 'armor' && !(def.kind === 'armor' && (def.slot ?? 'armor') === 'armor')) return false
        if (typeFilter === 'shoes' && def.slot !== 'shoes') return false
        if (typeFilter === 'cloak' && def.slot !== 'cloak') return false
        if (typeFilter === 'potion' && !(def.kind === 'consumable' && (def.heal || def.mana) && !def.id.startsWith('food_'))) return false
        if (typeFilter === 'food' && !def.id.startsWith('food_')) return false
        if (typeFilter === 'scroll' && !(def.kind === 'consumable' && (def.icon === 'scroll' || def.icon === 'ticket' || def.icon === 'core'))) return false
      }

      // Rarity filter
      const rarity = getEffectiveRarityForAny(item, def)
      if (rarityFilter !== 'all' && rarity !== rarityFilter) return false

      // Search query
      if (q) {
        const nameMatch = def.name.toLowerCase().includes(q)
        const descMatch = def.description.toLowerCase().includes(q)
        const affixMatch = item.affixes?.some((af) => formatAffixLabel(af).toLowerCase().includes(q)) ?? false
        if (!nameMatch && !descMatch && !affixMatch) return false
      }

      return true
    })

    if (sortBy === 'default') return list

    return [...list].sort((a, b) => {
      const da = ITEMS[a.itemId]
      const db = ITEMS[b.itemId]
      if (!da || !db) return 0
      if (sortBy === 'level-desc') return (db.reqLevel ?? 1) - (da.reqLevel ?? 1)
      if (sortBy === 'level-asc') return (da.reqLevel ?? 1) - (db.reqLevel ?? 1)
      if (sortBy === 'rarity-desc') {
        return RARITY_ORDER[getEffectiveRarityForAny(b, db)] - RARITY_ORDER[getEffectiveRarityForAny(a, da)]
      }
      if (sortBy === 'rarity-asc') {
        return RARITY_ORDER[getEffectiveRarityForAny(a, da)] - RARITY_ORDER[getEffectiveRarityForAny(b, db)]
      }
      if (sortBy === 'power-desc') {
        const pa = da.kind === 'weapon' || da.kind === 'armor' ? itemPower(a) : da.price
        const pb = db.kind === 'weapon' || db.kind === 'armor' ? itemPower(b) : db.price
        return pb - pa
      }
      return 0
    })
  }, [inventory, tab, search, rarityFilter, typeFilter, sortBy])

  if (!p) return null

  const quickSlots = getQuickSlots()
  const prem = ensurePremiumState(p)
  const vipBonuses = getEffectiveVipBonuses(prem.vip)
  const extV2 = sanitizeExtV2(p.extV2)
  const petState = sanitizePetState(p.petState, p.ownedGemItems, p.equippedGemCompanion)
  const mountState = sanitizeMountState(p.mountState, p.ownedGemItems)

  const currentFashionLoadout = resolvePlayerFashionLoadout(p)
  const ownedFashionItems = PREMIUM_FASHION_ITEMS.filter((f) => {
    const isVip = vipBonuses.active && vipBonuses.exclusiveFashionIds.includes(f.id)
    return prem.fashion.unlockedIds.includes(f.id) || isVip || Boolean(f.freeStarter)
  })
  const unlockedFrames = COSMETIC_DEFS.filter((c) => c.slot === 'frame' && extV2.unlockedCosmetics.includes(c.id))
  const ownedPetIds = Object.keys(petState.ownedPets)
  const ownedMountIds = Object.keys(mountState.ownedMounts)

  const inspectUid = hoveredUid ?? selectedUid
  const selectedInvItem = selectedUid ? p.inventory.find((entry) => entry.uid === selectedUid) ?? null : null
  const inspectInvItem = inspectUid ? p.inventory.find((entry) => entry.uid === inspectUid) ?? selectedInvItem : null
  const inspectDef = inspectInvItem ? ITEMS[inspectInvItem.itemId] : null
  const inspectRarity = inspectInvItem && inspectDef ? getEffectiveRarityForAny(inspectInvItem, inspectDef) : 'common'
  const inspectRarityMeta = EQUIPMENT_RARITY_META[inspectRarity]

  const getItemMeta = (def: ItemDef) => ({
    jobs:
      def.kind === 'weapon'
        ? def.weaponType
          ? Object.values(JOBS)
              .filter((job) => job.weaponTypes.includes(def.weaponType!))
              .map((job) => job.name)
              .join(', ')
          : 'ทุกอาชีพ'
        : def.allowedJobs?.length
          ? def.allowedJobs.map((id) => JOBS[id]?.name ?? id).join(', ')
          : 'ทุกอาชีพ',
    level: def.reqLevel ?? 1,
    slot:
      def.kind === 'weapon'
        ? 'อาวุธ'
        : def.kind === 'armor'
          ? SLOT_LABELS[def.slot ?? 'armor']
          : def.kind === 'consumable'
            ? 'ไอเทมใช้งาน'
            : 'วัตถุดิบ',
  })

  const assignConsumableToNextSlot = (itemId: string, preferredSlot?: number) => {
    let targetIdx = preferredSlot
    if (targetIdx === undefined) {
      const existingIdx = quickSlots.findIndex((s) => s === itemId)
      if (existingIdx >= 0) {
        setAssignFeedback(`${ITEMS[itemId]?.name ?? itemId} อยู่ในช่องลัดที่ ${existingIdx === 9 ? 0 : existingIdx + 1} แล้ว`)
        return
      }
      targetIdx = quickSlots.findIndex((s) => s === null)
      if (targetIdx < 0) targetIdx = 0
    }
    const res = setQuickSlot(targetIdx, itemId)
    if (res.ok) {
      const keyNum = targetIdx === 9 ? '0' : String(targetIdx + 1)
      setAssignFeedback(`ใส่ ${ITEMS[itemId]?.name ?? itemId} ลงช่องลัด [${keyNum}] แล้ว`)
    }
  }

  return (
    <PanelFrame
      title="กระเป๋าเก็บของ (Inventory)"
      subtitle={`ใช้ไป ${usedSlots} / ${capacity} ช่อง · ว่าง ${freeSlots} ช่อง`}
    >
      <div className="space-y-3">
        {/* Capacity Bar & Shortcut Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-secondary/40 px-2.5 py-1.5 text-[11px]">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Backpack className="size-4 shrink-0 text-amber-300" aria-hidden />
            <div className="min-w-[8rem] flex-1">
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="font-semibold text-foreground">ความจุกระเป๋า</span>
                <span className="font-mono text-amber-200 tabular-nums">
                  {usedSlots}/{capacity} (ว่าง {freeSlots})
                </span>
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-background/80">
                <div
                  className={cn(
                    'h-full transition-[width]',
                    usedSlots / Math.max(1, capacity) > 0.85 ? 'bg-rose-400' : 'bg-amber-400',
                  )}
                  style={{ width: `${Math.min(100, Math.round((usedSlots / Math.max(1, capacity)) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <PxButton variant="secondary" className="px-2 py-1 text-[10px]" onClick={() => openPanel('equipment')}>
              เปิดหน้าต่างอุปกรณ์
            </PxButton>
            <Link
              href="/inventory"
              onClick={() => saveGame()}
              className="pixel-btn bg-primary/20 px-2 py-1 text-[10px] font-semibold text-primary hover:brightness-110"
            >
              คลังเต็มจอ
            </Link>
          </div>
        </div>

        {/* 8 Category Tabs */}
        <div
          role="tablist"
          aria-label="หมวดหมู่กระเป๋า"
          className="flex flex-wrap gap-1 border-b border-border/80 pb-2"
        >
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  'pixel-btn px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/80 text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Search, Filter, & Sort Controls (for bag item tabs) */}
        {tab !== 'fashion' && tab !== 'pets' && (
          <div className="grid gap-1.5 sm:grid-cols-[1fr_auto_auto_auto]">
            <label className="relative flex items-center">
              <Search className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อไอเทม, ออฟชั่น..."
                aria-label="ค้นหาไอเทม"
                className="w-full rounded border border-border bg-background/80 py-1 pl-7 pr-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>

            <select
              aria-label="กรองตามประเภท"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="rounded border border-border bg-secondary px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary"
            >
              <option value="all">ทุกประเภท</option>
              <option value="weapon">อาวุธ</option>
              <option value="armor">ชุดเกราะ</option>
              <option value="shoes">รองเท้า</option>
              <option value="cloak">ผ้าคลุม</option>
              <option value="potion">ยาฟื้นฟู</option>
              <option value="food">อาหารบัฟ</option>
              <option value="scroll">คัมภีร์ / ตั๋ว</option>
            </select>

            <select
              aria-label="กรองตามระดับความหายาก"
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value as RarityFilter)}
              className="rounded border border-border bg-secondary px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary"
            >
              <option value="all">ทุกระดับหายาก</option>
              <option value="common">ธรรมดา</option>
              <option value="uncommon">ไม่ธรรมดา</option>
              <option value="rare">หายาก</option>
              <option value="epic">อีปิก</option>
              <option value="legendary">ตำนาน</option>
            </select>

            <div className="flex items-center gap-1">
              <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <select
                aria-label="เรียงลำดับไอเทม"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded border border-border bg-secondary px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary"
              >
                <option value="default">ลำดับในกระเป๋า</option>
                <option value="rarity-desc">หายากมาก → น้อย</option>
                <option value="rarity-asc">หายากน้อย → มาก</option>
                <option value="level-desc">Lv สูง → ต่ำ</option>
                <option value="level-asc">Lv ต่ำ → สูง</option>
                <option value="power-desc">พลัง / ราคาสูงสุด</option>
              </select>
            </div>
          </div>
        )}

        {assignFeedback && (
          <p className="border border-accent/50 bg-accent/10 px-2.5 py-1.5 text-xs text-accent" role="status">
            {assignFeedback}
          </p>
        )}

        {/* Tab 7: Fashion */}
        {tab === 'fashion' && (() => {
          const hasPreview = Object.keys(fashionPreviewOverrides).length > 0
          const previewLoadout: FashionLoadout = {
            ...currentFashionLoadout,
            ...fashionPreviewOverrides,
          }
          const visibleFashionItems =
            fashionSlotFilter === 'all'
              ? ownedFashionItems
              : ownedFashionItems.filter((f) => f.slot === fashionSlotFilter)
          const equippedFashionCount = FASHION_CHARACTER_SLOTS.filter((slot) => Boolean(currentFashionLoadout[slot])).length

          return (
          <div className="space-y-3">
            {/* Live Fashion Preview Header */}
            <div className="grid gap-3 rounded border-2 border-border bg-muted/50 p-2.5 sm:grid-cols-[136px_1fr] sm:items-center">
              <div className="flex flex-col items-center gap-1.5 rounded border border-border bg-[#0d111f] p-2">
                <span
                  className={cn(
                    'rounded border px-1.5 py-0.5 text-[9.5px] font-semibold',
                    hasPreview
                      ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                      : 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200',
                  )}
                >
                  {hasPreview ? 'กำลังพรีวิวก่อนใส่' : 'ชุดที่สวมใส่จริง'}
                </span>
                <SpriteModelCanvas
                  mode="job"
                  id={p.jobId}
                  action="auto"
                  dir={fashionPreviewDir}
                  weaponOverride={p.equipment.weapon ? ITEMS[p.equipment.weapon.itemId]?.weaponType : undefined}
                  weaponColorOverride={p.equipment.weapon ? ITEMS[p.equipment.weapon.itemId]?.color : undefined}
                  fashion={previewLoadout}
                  size={84}
                  isGm={p.gm}
                  rebirthCount={p.rebirthCount ?? 0}
                  label={`พรีวิวแฟชั่น ${p.name}`}
                />
                <div className="flex flex-wrap justify-center gap-1">
                  {(['down', 'left', 'right', 'up'] as Dir[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFashionPreviewDir(d)}
                      className={cn(
                        'rounded border px-1 py-0.5 text-[9px]',
                        fashionPreviewDir === d
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-secondary text-muted-foreground',
                      )}
                    >
                      {{ down: 'หน้า', left: 'ซ้าย', right: 'ขวา', up: 'หลัง' }[d]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-foreground">
                      แฟชั่นที่ปลดล็อก: {ownedFashionItems.length} ชิ้น · สวมใส่อยู่ {equippedFashionCount} ส่วน
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-emerald-300">
                      <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
                      แยกจากสเตตัสอุปกรณ์จริง — กดพรีวิวก่อนสวมใส่ได้ทันที
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {hasPreview && (
                      <PxButton variant="secondary" className="px-2 py-1 text-[10px]" onClick={() => setFashionPreviewOverrides({})}>
                        <span className="inline-flex items-center gap-1">
                          <RotateCcw className="size-3" aria-hidden />
                          ล้างพรีวิว
                        </span>
                      </PxButton>
                    )}
                    <PxButton
                      variant="secondary"
                      disabled={equippedFashionCount === 0}
                      className="px-2 py-1 text-[10px]"
                      onClick={() => {
                        const res = unequipAllFashionAction()
                        setFashionPreviewOverrides({})
                        setAssignFeedback(res.message)
                      }}
                    >
                      ถอดทั้งหมด
                    </PxButton>
                    <PxButton variant="secondary" className="px-2 py-1 text-[10px]" onClick={() => openPanel('wardrobe')}>
                      <span className="inline-flex items-center gap-1">
                        <Feather className="size-3" aria-hidden />
                        ห้องแต่งตัว
                      </span>
                    </PxButton>
                    <PxButton variant="secondary" className="px-2 py-1 text-[10px]" onClick={() => openPanel('gem-shop')}>
                      <span className="inline-flex items-center gap-1">
                        <Gem className="size-3" aria-hidden />
                        ร้านค้า
                      </span>
                    </PxButton>
                  </div>
                </div>

                {/* Quick active slot summary */}
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                  {FASHION_CHARACTER_SLOTS.slice(0, 9).map((slot) => {
                    const activeId = fashionPreviewOverrides[slot] !== undefined ? fashionPreviewOverrides[slot] : currentFashionLoadout[slot]
                    const def = getFashionItemDef(activeId)
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setFashionSlotFilter(slot)}
                        className={cn(
                          'flex items-center justify-between gap-1 rounded border px-1.5 py-0.5 text-left text-[10px]',
                          fashionSlotFilter === slot ? 'border-primary bg-primary/10' : 'border-border/60 bg-background/60',
                        )}
                      >
                        <span className="truncate text-muted-foreground">{FASHION_SLOT_LABELS[slot].split('(')[0].trim()}</span>
                        <span className="truncate font-semibold text-foreground">{def?.name ?? '-'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Slot filter pills */}
            <div className="flex flex-wrap gap-1">
              <PxButton
                variant={fashionSlotFilter === 'all' ? 'primary' : 'secondary'}
                className="px-2 py-0.5 text-[10px]"
                onClick={() => setFashionSlotFilter('all')}
              >
                ทั้งหมด ({ownedFashionItems.length})
              </PxButton>
              {FASHION_CHARACTER_SLOTS.map((slot) => {
                const cnt = ownedFashionItems.filter((f) => f.slot === slot).length
                if (cnt === 0) return null
                return (
                  <PxButton
                    key={slot}
                    variant={fashionSlotFilter === slot ? 'primary' : 'secondary'}
                    className="px-2 py-0.5 text-[10px]"
                    onClick={() => setFashionSlotFilter(slot)}
                  >
                    {FASHION_SLOT_LABELS[slot].split('(')[0].trim()} ({cnt})
                  </PxButton>
                )
              })}
            </div>

            {visibleFashionItems.length === 0 && (fashionSlotFilter !== 'all' || unlockedFrames.length === 0) ? (
              <p className="rounded border border-border/70 bg-secondary/20 py-8 text-center text-xs text-muted-foreground">
                ยังไม่มีแฟชั่นในหมวดนี้ — เลือกปลดล็อกเพิ่มได้ที่ห้องแต่งตัวแฟชั่น หรือร้านค้าเพชร
              </p>
            ) : (
              <div className="grid max-h-[16.5rem] gap-2 overflow-y-auto pr-0.5 sm:grid-cols-2">
                {visibleFashionItems.map((f) => {
                  const equipped = currentFashionLoadout[f.slot] === f.id
                  const isPreviewing = fashionPreviewOverrides[f.slot] === f.id
                  const vipBlocked = Boolean(f.vipRequired && (!vipBonuses.active || vipBonuses.level < f.vipRequired))

                  return (
                    <div
                      key={f.id}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded border-2 p-2 text-xs',
                        equipped
                          ? 'border-cyan-400 bg-cyan-500/10'
                          : isPreviewing
                            ? 'border-amber-400 bg-amber-500/10'
                            : 'border-border bg-card/80',
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="grid size-10 shrink-0 place-items-center overflow-hidden rounded border bg-[#0d1220]"
                          style={{ borderColor: f.primaryColor }}
                        >
                          <img
                            src={f.iconAsset ?? `/assets/fashion/icons/${f.id}.png`}
                            alt={f.name}
                            className="size-9 object-contain"
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-foreground">{f.name}</p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {FASHION_SLOT_LABELS[f.slot].split('(')[0].trim()} · {f.rarity}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setFashionPreviewOverrides((prev) => {
                              if (prev[f.slot] === f.id) {
                                const next = { ...prev }
                                delete next[f.slot]
                                return next
                              }
                              return { ...prev, [f.slot]: f.id }
                            })
                          }
                          title="พรีวิวก่อนใส่"
                          className={cn(
                            'pixel-btn inline-flex items-center gap-1 px-2 py-1 text-[10px]',
                            isPreviewing ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400' : 'bg-secondary text-foreground',
                          )}
                        >
                          <Eye className="size-3" aria-hidden />
                          {isPreviewing ? 'ปิด' : 'ดู'}
                        </button>
                        <PxButton
                          variant={equipped ? 'secondary' : 'accent'}
                          disabled={vipBlocked}
                          className="px-2 py-1 text-[10px]"
                          onClick={() => {
                            const res = equipFashionAction(f.slot, equipped ? null : f.id)
                            setAssignFeedback(res.message)
                            if (res.ok) {
                              setFashionPreviewOverrides((prev) => {
                                if (!(f.slot in prev)) return prev
                                const next = { ...prev }
                                delete next[f.slot]
                                return next
                              })
                            }
                          }}
                        >
                          {vipBlocked ? `VIP ${f.vipRequired}` : equipped ? 'ถอด' : 'สวมใส่'}
                        </PxButton>
                      </div>
                    </div>
                  )
                })}

                {fashionSlotFilter === 'all' &&
                  unlockedFrames.map((cos) => {
                    const equipped = extV2.equippedFrame === cos.id
                    return (
                      <div
                        key={cos.id}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded border-2 p-2 text-xs',
                          equipped ? 'border-accent bg-accent/10' : 'border-border bg-card/80',
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="grid size-10 shrink-0 place-items-center overflow-hidden rounded border bg-[#0d1220]"
                            style={{ borderColor: cos.primaryColor }}
                          >
                            <img src={`/assets/fashion/icons/${cos.id}.png`} alt={cos.name} className="size-9 object-contain" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-foreground">{cos.name}</p>
                            <p className="flex items-center gap-1 truncate text-[10px] text-amber-300">
                              <Crown className="size-3" aria-hidden /> กรอบชื่อ
                            </p>
                          </div>
                        </div>
                        <PxButton
                          variant={equipped ? 'secondary' : 'accent'}
                          className="px-2 py-1 text-[10px]"
                          onClick={() => equipCosmeticAction('frame', equipped ? null : cos.id)}
                        >
                          {equipped ? 'ถอด' : 'สวมใส่'}
                        </PxButton>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
          )
        })()}

        {/* Tab 8: Pets & Mounts */}
        {tab === 'pets' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <p className="text-muted-foreground">
                สัตว์เลี้ยง (ผอบ/คู่หู): {ownedPetIds.length} ตัว · สัตว์ขี่: {ownedMountIds.length} ตัว
              </p>
              <PxButton variant="secondary" onClick={() => openPanel('pets')}>
                <span className="inline-flex items-center gap-1">
                  <PawPrint className="size-3" aria-hidden />
                  จัดการอัปเกรดสัตว์เลี้ยง & สัตว์ขี่
                </span>
              </PxButton>
            </div>

            {ownedPetIds.length === 0 && ownedMountIds.length === 0 ? (
              <p className="rounded border border-border/70 bg-secondary/20 py-8 text-center text-xs text-muted-foreground">
                ยังไม่มีสัตว์เลี้ยงหรือสัตว์ขี่ — ปลดล็อกได้ในหน้าต่าง สัตว์เลี้ยง (ผอบ) & สัตว์ขี่
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {ownedPetIds.map((petId) => {
                  const def = getCombatPetDef(petId)
                  const prog = petState.ownedPets[petId]
                  if (!def || !prog) return null
                  const active = petState.activePetId === petId
                  return (
                    <div
                      key={petId}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded border-2 p-2.5 text-xs',
                        active ? 'border-emerald-400 bg-emerald-500/10' : 'border-border bg-card/80',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground">
                          {def.name} <span className="text-amber-300">Lv.{prog.level}</span>
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {def.rarity} · ★{prog.stars ?? 1} · ATK +{def.atkBuff}
                        </p>
                      </div>
                      <PxButton
                        variant={active ? 'secondary' : 'accent'}
                        onClick={() => equipCombatPet(active ? null : petId)}
                      >
                        {active ? 'พักตัว' : 'เรียกใช้'}
                      </PxButton>
                    </div>
                  )
                })}
                {ownedMountIds.map((mountId) => {
                  const def = getMountDef(mountId)
                  const prog = mountState.ownedMounts[mountId]
                  if (!def || !prog) return null
                  const active = mountState.activeMountId === mountId
                  const riding = active && mountState.mounted
                  return (
                    <div
                      key={mountId}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded border-2 p-2.5 text-xs',
                        riding ? 'border-amber-400 bg-amber-500/10' : 'border-border bg-card/80',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 truncate font-bold text-foreground">
                          <Wind className="size-3.5 text-amber-300" aria-hidden />
                          {def.name} <span className="text-amber-300">Lv.{prog.level}</span>
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          ความเร็ว +{def.speedBonusPct}% · {riding ? 'กำลังขี่อยู่' : active ? 'เลือกเป็นพาหนะหลัก' : 'พาหนะ'}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {!active ? (
                          <PxButton variant="primary" onClick={() => equipMount(mountId)}>
                            เลือกใช้
                          </PxButton>
                        ) : (
                          <PxButton variant={riding ? 'secondary' : 'accent'} onClick={() => toggleMountRiding()}>
                            {riding ? 'ลงขี่' : 'ขึ้นขี่'}
                          </PxButton>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Item Grid (Tabs 1..6) */}
        {tab !== 'fashion' && tab !== 'pets' && (
          <>
            <div className="grid max-h-[16.5rem] grid-cols-2 gap-1.5 overflow-y-auto pr-0.5 sm:grid-cols-3 md:grid-cols-4">
              {filteredItems.map((item) => {
                const def = ITEMS[item.itemId]
                if (!def) return null
                const rarity = getEffectiveRarityForAny(item, def)
                const rMeta = EQUIPMENT_RARITY_META[rarity]
                const isSelected = selectedUid === item.uid
                const equipable = def.kind === 'weapon' || def.kind === 'armor'
                const consumable = def.kind === 'consumable'
                const cardCmp = equipable ? compareEquipmentItem(item, p) : null

                return (
                  <div
                    key={item.uid}
                    draggable={equipable || consumable}
                    onDragStart={(e) => {
                      const payload = JSON.stringify({
                        uid: item.uid,
                        itemId: item.itemId,
                        kind: def.kind,
                        slot: def.slot,
                      })
                      e.dataTransfer.setData('application/x-pixelquest-item', payload)
                      e.dataTransfer.setData('text/plain', payload)
                      e.dataTransfer.effectAllowed = 'copyMove'
                    }}
                    onMouseEnter={() => setHoveredUid(item.uid)}
                    onMouseLeave={() => setHoveredUid((cur) => (cur === item.uid ? null : cur))}
                    className={cn(
                      'group flex flex-col justify-between rounded border-2 bg-card/85 p-2 transition',
                      (equipable || consumable) && 'cursor-grab active:cursor-grabbing',
                      isSelected
                        ? 'border-primary ring-1 ring-primary'
                        : rMeta.borderColorClass,
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedUid(item.uid)}
                      className="mb-1.5 flex w-full items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span
                        className="relative grid size-9 shrink-0 place-items-center rounded border border-white/20"
                        style={{ backgroundColor: `${def.color}2b` }}
                      >
                        <ItemIcon itemId={item.itemId} size={28} />
                        {item.qty > 1 && (
                          <span className="absolute -bottom-1 -right-1 rounded bg-black/85 px-1 font-mono text-[9px] font-bold text-amber-200 tabular-nums">
                            x{item.qty}
                          </span>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn('truncate text-[11px] font-bold', rMeta.textColorClass)}>
                          {itemLabel(item)}
                        </p>
                        <p className="flex flex-wrap items-center gap-1 text-[9px] text-muted-foreground">
                          <span>{rMeta.thaiLabel}</span>
                          {def.reqLevel && def.reqLevel > 1 ? <span>· Lv.{def.reqLevel}</span> : null}
                          {item.bound && <Lock className="size-2.5 text-amber-300" aria-label="ผูกมัด" />}
                          {cardCmp && cardCmp.isCompatibleJob && cardCmp.powerDelta !== 0 && (
                            <span
                              className={cn(
                                'rounded px-1 font-mono text-[8.5px] font-extrabold tabular-nums',
                                cardCmp.powerDelta > 0
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300',
                              )}
                            >
                              {cardCmp.powerDelta > 0 ? `▲ +${cardCmp.powerDelta}` : `▼ ${cardCmp.powerDelta}`}
                            </span>
                          )}
                        </p>
                      </div>
                    </button>

                    <div className="flex gap-1">
                      {equipable && (
                        <PxButton
                          className="w-full py-1 text-[10px]"
                          onClick={() => equip(item.uid)}
                        >
                          สวมใส่
                        </PxButton>
                      )}
                      {consumable && (
                        <>
                          <PxButton
                            className="flex-1 py-1 text-[10px]"
                            onClick={() => consumeItem(item.uid)}
                          >
                            ใช้
                          </PxButton>
                          <PxButton
                            variant="secondary"
                            title="ใส่ลง Quick Item Bar อัตโนมัติ (หรือลากลงช่อง 1-0 ด้านล่าง)"
                            className="px-2 py-1 text-[10px]"
                            onClick={() => assignConsumableToNextSlot(item.itemId)}
                          >
                            +ลัด
                          </PxButton>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {filteredItems.length === 0 && (
              <p className="rounded border border-border/60 bg-secondary/20 py-7 text-center text-xs text-muted-foreground">
                ไม่พบไอเทมที่ตรงกับหมวดหมู่หรือคำค้นหา
              </p>
            )}

            {/* Hover Tooltip / Selected Item Inspector */}
            {inspectInvItem && inspectDef && (
              <div className={cn('rounded border-2 bg-muted/85 p-3', inspectRarityMeta.borderColorClass)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded border border-white/20"
                      style={{ backgroundColor: `${inspectDef.color}33` }}
                    >
                      <ItemIcon itemId={inspectInvItem.itemId} size={32} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className={cn('text-sm font-bold', inspectRarityMeta.textColorClass)}>
                          {itemLabel(inspectInvItem)}
                        </p>
                        <span className={cn('px-1.5 py-0.5 text-[10px] font-bold', inspectRarityMeta.badgeBgClass, inspectRarityMeta.textColorClass)}>
                          {inspectRarityMeta.thaiLabel}
                        </span>
                        {inspectInvItem.bound && (
                          <span className="inline-flex items-center gap-0.5 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                            <Lock className="size-2.5" aria-hidden /> ผูกมัด
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{inspectDef.description}</p>
                    </div>
                  </div>
                  {selectedUid && (
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setSelectedUid(null)
                        setHoveredUid(null)
                      }}
                    >
                      ปิด
                    </button>
                  )}
                </div>

                {inspectInvItem.affixes && inspectInvItem.affixes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {inspectInvItem.affixes.map((af, idx) => (
                      <span
                        key={`${af.stat}-${idx}`}
                        className="border border-primary/40 bg-background/60 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                      >
                        {formatAffixLabel(af)}
                      </span>
                    ))}
                  </div>
                )}

                {(() => {
                  const meta = getItemMeta(inspectDef)
                  const isEq = inspectDef.kind === 'weapon' || inspectDef.kind === 'armor'
                  const cmp = isEq ? compareEquipmentItem(inspectInvItem, p) : null
                  const equipErr = isEq ? canEquip(inspectInvItem) : null

                  const statBadges = cmp
                    ? [
                        { label: 'พลัง', val: cmp.powerDelta, suffix: '' },
                        { label: 'ATK', val: cmp.atkDelta, suffix: '' },
                        { label: 'DEF', val: cmp.defDelta, suffix: '' },
                        { label: 'HP', val: cmp.hpDelta, suffix: '' },
                        { label: 'Crit', val: cmp.critDeltaPct, suffix: '%' },
                      ].filter((b) => b.val !== 0)
                    : []

                  return (
                    <div className="mt-2.5 space-y-2 border-t border-border/60 pt-2 text-[11px]">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                        <div>
                          <span className="text-muted-foreground">ประเภท: </span>
                          <span className="text-foreground">{meta.slot}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">จำนวน: </span>
                          <span className="font-mono text-foreground tabular-nums">x{inspectInvItem.qty}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">เลเวลขั้นต่ำ: </span>
                          <span className="text-foreground">Lv.{meta.level}</span>
                        </div>
                      </div>

                      {cmp && (
                        <div className="flex flex-wrap items-center gap-1.5 rounded border border-border/70 bg-background/60 px-2 py-1 text-[10.5px]">
                          <span className="text-muted-foreground">
                            เทียบกับที่ใส่อยู่ ({cmp.equippedName ?? 'ช่องว่าง'}):
                          </span>
                          {statBadges.length === 0 ? (
                            <span className="font-semibold text-slate-300">ค่าสถานะเท่าเดิม</span>
                          ) : (
                            statBadges.map((b) => (
                              <span
                                key={b.label}
                                className={cn(
                                  'rounded px-1.5 py-0.5 font-mono font-bold tabular-nums',
                                  b.val > 0
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/20 text-rose-300',
                                )}
                              >
                                {b.label} {b.val > 0 ? `+${b.val}` : b.val}
                                {b.suffix}
                              </span>
                            ))
                          )}
                        </div>
                      )}

                      {isEq && (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-primary">อาชีพ: {meta.jobs}</span>
                          {equipErr ? (
                            <span className="text-destructive">{equipErr}</span>
                          ) : (
                            <span className="text-emerald-300">ลากไปวางในหน้าต่างอุปกรณ์ หรือกด &quot;สวมใส่&quot; ได้เลย</span>
                          )}
                        </div>
                      )}

                      {inspectDef.kind === 'consumable' && (
                        <div className="space-y-1">
                          <p className="text-muted-foreground">
                            ใส่ลง Quick Item Bar (ช่อง 1–0) หรือลากการ์ดไอเทมลงแถบด้านล่าง:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {Array.from({ length: QUICK_SLOT_COUNT }).map((_, slotIdx) => {
                              const keyLabel = slotIdx === 9 ? '0' : String(slotIdx + 1)
                              const isHere = quickSlots[slotIdx] === inspectInvItem.itemId
                              return (
                                <button
                                  key={slotIdx}
                                  type="button"
                                  onClick={() => assignConsumableToNextSlot(inspectInvItem.itemId, slotIdx)}
                                  className={cn(
                                    'pixel-btn px-2 py-0.5 font-mono text-[10px] font-bold',
                                    isHere ? 'bg-accent text-accent-foreground' : 'bg-secondary text-foreground hover:bg-primary/25',
                                  )}
                                >
                                  [{keyLabel}]
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="size-3 text-primary" aria-hidden />
            ลากยา/อาหารลง Quick Item Bar (1-0) · ลากอาวุธ/เกราะลงช่องอุปกรณ์
          </span>
          <PxButton variant="secondary" onClick={() => closePanel('inventory')}>
            ปิด
          </PxButton>
        </div>
      </div>
    </PanelFrame>
  )
}
