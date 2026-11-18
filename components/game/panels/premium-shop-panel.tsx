'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  Award,
  Backpack,
  Check,
  Clock,
  Coins,
  Crown,
  FlaskConical,
  Gem,
  History,
  Lock,
  Package,
  PawPrint,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  UserCheck,
  Warehouse,
  X,
} from 'lucide-react'
import {
  claimBattlePassTierAction,
  claimExpiredPassArchiveAction,
  claimVipDailyRewardAction,
  claimVipTierRewardAction,
  ensurePremiumState,
  equipFashionAction,
  getInventoryCapacityBreakdown,
  getStorageCapacityBreakdown,
  openPanel,
  purchasePremiumProductAction,
  sandboxGrantDiamondsAction,
  unlockBattlePassPremiumAction,
} from '@/lib/game/engine'
import { ITEMS } from '@/lib/game/data'
import {
  BATTLE_PASS_TIERS,
  BP_EXP_PER_LEVEL,
  BP_MAX_LEVEL,
  BP_PREMIUM_DIAMOND_COST,
  CURRENT_BP_SEASON_META,
  sanitizeExtV2,
} from '@/lib/game/extended-systems'
import {
  PREMIUM_CATALOG,
  PREMIUM_CATEGORY_META,
  getPremiumProduct,
} from '@/lib/game/premium/catalog'
import {
  FASHION_SLOT_LABELS,
  PET_STAT_CAPS,
  PREMIUM_FASHION_ITEMS,
} from '@/lib/game/premium/fashion-pet'
import type {
  FashionSlot,
  PremiumCategory,
  PremiumProduct,
  PremiumRarity,
} from '@/lib/game/premium/types'
import {
  VIP_EXP_BONUS_CAP_PCT,
  VIP_EXTRA_INVENTORY_CAP,
  VIP_EXTRA_STORAGE_CAP,
  VIP_TIERS,
  formatVipRemaining,
  getEffectiveVipBonuses,
  isVipActive,
} from '@/lib/game/premium/vip'
import {
  EXTRA_INVENTORY_SCROLL_CAP,
  EXTRA_STORAGE_SCROLL_CAP,
} from '@/lib/game/premium/wallet'
import { playQuestClaimSfx } from '@/lib/game/sfx'
import {
  COMBAT_PETS,
  getActivePetBonuses,
  sanitizePetState,
} from '@/lib/game/systems'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { formatNum } from '../format'
import { ItemIcon } from '../item-icon'
import { SpriteModelCanvas } from '../sprite-model-canvas'
import { PanelFrame, PxButton } from './panels'

type PremiumTabId =
  | 'overview'
  | 'diamond'
  | 'vip'
  | 'pass'
  | 'fashion'
  | 'pet'
  | 'storage'
  | 'history'

type StoreCategoryFilter = 'all' | PremiumCategory

const TABS: Array<{ id: PremiumTabId; label: string; icon: typeof Store }> = [
  { id: 'overview', label: 'ภาพรวม & ร้านค้า', icon: Store },
  { id: 'diamond', label: 'เพชร & Sandbox', icon: Gem },
  { id: 'vip', label: 'สมาชิก VIP', icon: Crown },
  { id: 'pass', label: 'Season Pass', icon: Award },
  { id: 'fashion', label: 'แฟชั่น 5 ส่วน', icon: Sparkles },
  { id: 'pet', label: 'สัตว์เลี้ยงพรีเมียม', icon: PawPrint },
  { id: 'storage', label: 'กระเป๋า & คลัง', icon: Warehouse },
  { id: 'history', label: 'ประวัติ & Audit', icon: History },
]

const SANDBOX_PRESETS = [500, 2000, 10000, 50000] as const

const FASHION_SLOTS: FashionSlot[] = ['costume', 'hair', 'aura', 'wings', 'mountAppearance']

function rarityBadgeClass(rarity: PremiumRarity): string {
  switch (rarity) {
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

function formatCountdown(targetMs: number, nowMs: number): string {
  const diff = Math.max(0, targetMs - nowMs)
  if (diff <= 0) return 'สิ้นสุดซีซันแล้ว'
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  return `เหลือเวลา ${days} วัน ${hours} ชม.`
}

function formatDateTime(ms: number): string {
  try {
    return new Date(ms).toLocaleString('th-TH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(ms)
  }
}

function ProductThumb({ product }: { product: PremiumProduct }) {
  if (ITEMS[product.itemId]) {
    return <ItemIcon itemId={product.itemId} size={32} />
  }
  if (product.payload?.petId) {
    return (
      <SpriteModelCanvas
        mode="pet"
        id={product.payload.petId}
        action="idle"
        dir="down"
        size={36}
        showShadow={false}
        showAura={false}
      />
    )
  }
  if (product.category === 'mount' && product.payload?.mountId) {
    return (
      <SpriteModelCanvas
        mode="mount"
        id={product.payload.mountId}
        action="idle"
        dir="right"
        size={36}
        showShadow={false}
        showAura={false}
      />
    )
  }
  if (product.category === 'storage-expansion') {
    return <Warehouse className="size-6 text-amber-300" aria-hidden />
  }
  if (product.category === 'diamond-items') {
    return <Crown className="size-6 text-amber-300" aria-hidden />
  }
  if (product.category === 'special-collection') {
    return <Package className="size-6 text-fuchsia-300" aria-hidden />
  }
  return <Sparkles className="size-6 text-cyan-300" aria-hidden />
}

export function PremiumShopPanel() {
  const { p } = useGame()
  const [activeTab, setActiveTab] = useState<PremiumTabId>('overview')
  const [storeCategory, setStoreCategory] = useState<StoreCategoryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [fashionSlot, setFashionSlot] = useState<FashionSlot>('costume')
  const [customDiamonds, setCustomDiamonds] = useState('5000')
  const [confirmProduct, setConfirmProduct] = useState<PremiumProduct | null>(null)
  const [confirmQty, setConfirmQty] = useState(1)
  const [inFlight, setInFlight] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const catalogFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return PREMIUM_CATALOG.filter((prod) => {
      if (!prod.enabled) return false
      if (storeCategory !== 'all' && prod.category !== storeCategory) return false
      if (!q) return true
      return (
        prod.name.toLowerCase().includes(q) ||
        prod.description.toLowerCase().includes(q) ||
        prod.productId.toLowerCase().includes(q)
      )
    })
  }, [searchQuery, storeCategory])

  if (!p) return null

  const prem = ensurePremiumState(p)
  const wallet = prem.wallet
  const vip = prem.vip
  const vipActive = isVipActive(vip, nowMs)
  const vipBonuses = getEffectiveVipBonuses(vip, nowMs)
  const nextVipTier = VIP_TIERS.find((t) => t.level === Math.min(5, (vipActive ? vip.vipLevel : 0) + 1)) ?? VIP_TIERS[4]
  const invBreakdown = getInventoryCapacityBreakdown(p)
  const storBreakdown = getStorageCapacityBreakdown(p)
  const extV2 = sanitizeExtV2(p.extV2)
  const bp = extV2.battlePass
  const expiredArchive = bp.expiredArchive ?? []
  const petState = sanitizePetState(p.petState, p.ownedGemItems, p.equippedGemCompanion)
  const activePetBonus = getActivePetBonuses(petState, p.equippedGemCompanion, p.ownedGemItems)
  const todayIso = new Date(nowMs).toISOString().slice(0, 10)
  const canClaimDailyVip = vipActive && vip.lastDailyClaimDate !== todayIso

  const isProductOwnedOrMaxed = (prod: PremiumProduct): { locked: boolean; label: string } => {
    const bought = prem.purchaseCounts[prod.productId] ?? 0
    if (prod.purchaseLimit !== null && bought >= prod.purchaseLimit) {
      return { locked: true, label: `ครบจำกัด (${bought}/${prod.purchaseLimit})` }
    }
    if ((prod.rewardKind === 'gem_fashion' || prod.rewardKind === 'gem_companion') && p.ownedGemItems.includes(prod.itemId)) {
      return { locked: true, label: 'เป็นเจ้าของแล้ว' }
    }
    if (prod.rewardKind === 'fashion' && prod.payload?.fashionId && prem.fashion.unlockedIds.includes(prod.payload.fashionId)) {
      return { locked: true, label: 'ปลดล็อกแล้ว' }
    }
    if (prod.itemId === 'astral_bag_expansion' && (p.inventoryCapacityBonus ?? 0) >= 60) {
      return { locked: true, label: 'กระเป๋าดาวเต็ม +60' }
    }
    if (prod.rewardKind === 'bag_expansion' && prem.storage.extraInventorySlots >= EXTRA_INVENTORY_SCROLL_CAP) {
      return { locked: true, label: `ครบ +${EXTRA_INVENTORY_SCROLL_CAP} ช่องแล้ว` }
    }
    if (prod.rewardKind === 'storage_expansion' && prem.storage.extraStorageSlots >= EXTRA_STORAGE_SCROLL_CAP) {
      return { locked: true, label: `ครบ +${EXTRA_STORAGE_SCROLL_CAP} ช่องแล้ว` }
    }
    if (prod.expiration !== null && prod.expiration <= nowMs) {
      return { locked: true, label: 'หมดเขตจำหน่าย' }
    }
    return { locked: false, label: 'ซื้อด้วยเพชร' }
  }

  const openBuyModal = (prod: PremiumProduct) => {
    setConfirmProduct(prod)
    setConfirmQty(1)
  }

  const handleSandboxGrant = async (amount: number) => {
    if (inFlight) return
    setInFlight(true)
    try {
      const res = await sandboxGrantDiamondsAction(amount)
      if (res.ok) playQuestClaimSfx(true)
      setNotice({ ok: res.ok, text: res.message })
    } finally {
      setInFlight(false)
    }
  }

  const handleConfirmPurchase = async () => {
    if (!confirmProduct || inFlight) return
    setInFlight(true)
    try {
      const res = await purchasePremiumProductAction(confirmProduct.productId, confirmQty)
      if (res.ok) {
        playQuestClaimSfx(true)
        setConfirmProduct(null)
      }
      setNotice({ ok: res.ok, text: res.message })
    } finally {
      setInFlight(false)
    }
  }

  const handleClaimVipTier = async (level: number) => {
    if (inFlight) return
    setInFlight(true)
    try {
      const res = await claimVipTierRewardAction(level)
      if (res.ok) playQuestClaimSfx(true)
      setNotice({ ok: res.ok, text: res.message })
    } finally {
      setInFlight(false)
    }
  }

  const handleClaimVipDaily = async () => {
    if (inFlight) return
    setInFlight(true)
    try {
      const res = await claimVipDailyRewardAction()
      if (res.ok) playQuestClaimSfx(true)
      setNotice({ ok: res.ok, text: res.message })
    } finally {
      setInFlight(false)
    }
  }

  const renderProductCard = (prod: PremiumProduct) => {
    const status = isProductOwnedOrMaxed(prod)
    const bought = prem.purchaseCounts[prod.productId] ?? 0
    const canAfford = (p.diamonds ?? 0) >= prod.diamondPrice
    return (
      <div
        key={prod.productId}
        className="flex flex-col justify-between gap-2.5 border-2 border-border bg-background/70 p-2.5 transition-colors hover:border-cyan-400/50"
      >
        <div className="flex items-start gap-2.5">
          <div className="grid size-11 shrink-0 place-items-center border border-border bg-slate-950/80">
            <ProductThumb product={prod} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="truncate text-xs font-bold text-foreground">{prod.name}</h4>
              <span className={cn('border px-1.5 py-0.5 text-[9px] font-semibold', rarityBadgeClass(prod.rarity))}>
                {prod.rarity}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{prod.description}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-muted-foreground">
              {prod.purchaseLimit !== null && (
                <span>
                  จำกัด {bought}/{prod.purchaseLimit} ครั้ง
                </span>
              )}
              {prod.stock !== null && <span>สต็อก {prod.stock}</span>}
              {prod.vipExpGrant ? <span className="text-amber-300">+{prod.vipExpGrant} VIP EXP</span> : null}
              {prod.expiration ? <span className="text-fuchsia-300">{formatCountdown(prod.expiration, nowMs)}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
          <span className="flex items-center gap-1 text-xs font-bold text-cyan-200 tabular-nums">
            <Gem className="size-3.5 text-cyan-300" aria-hidden />
            {formatNum(prod.diamondPrice)} D
          </span>
          <PxButton
            variant={status.locked ? 'secondary' : canAfford ? 'accent' : 'primary'}
            disabled={status.locked || !canAfford || inFlight}
            onClick={() => openBuyModal(prod)}
            className="px-2.5 py-1 text-[10px]"
          >
            {status.locked ? status.label : canAfford ? 'ซื้อสินค้า' : 'เพชรไม่พอ'}
          </PxButton>
        </div>
      </div>
    )
  }

  return (
    <PanelFrame
      title="ศูนย์พรีเมียม & ร้านค้าเพชร (Sandbox MMORPG)"
      subtitle="Diamond Wallet · VIP 1–5 · Season Pass · แฟชั่น 5 ส่วน · สัตว์เลี้ยง · ขยายกระเป๋า/คลัง"
    >
      {/* Top Banner: Sandbox Notice + Wallet Strip */}
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-cyan-400/40 bg-cyan-950/30 px-3 py-2">
          <div className="flex items-center gap-2 text-[11px] text-cyan-100">
            <FlaskConical className="size-4 shrink-0 text-cyan-300" aria-hidden />
            <span>
              <strong className="text-cyan-200">Sandbox Only:</strong> เพชรและรายการเติมทั้งหมดเป็นการจำลองทดสอบในเกมเท่านั้น
              ไม่มีการเชื่อมต่อเงินจริง บัตรเครดิต หรือบัญชีธนาคาร
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {vipActive && vipBonuses.tierDef && (
              <span
                className="inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-bold"
                style={{
                  color: vipBonuses.tierDef.badgeColor,
                  backgroundColor: vipBonuses.tierDef.badgeBg,
                  borderColor: vipBonuses.tierDef.badgeBorder,
                }}
              >
                <Crown className="size-3" aria-hidden />
                {vipBonuses.tierDef.badgeLabel} ({formatVipRemaining(vipBonuses.remainingMs)})
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 border border-cyan-300/40 bg-cyan-400/10 px-2.5 py-1 text-xs font-bold text-cyan-100 tabular-nums">
              <Gem className="size-3.5 text-cyan-300" aria-hidden />
              {formatNum(p.diamonds ?? 0)} D
            </span>
          </div>
        </div>

        {/* 8-Tab Navigation */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="หมวดหมู่ระบบพรีเมียม">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'pixel-btn flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold',
                activeTab === id
                  ? 'bg-cyan-300 text-slate-950'
                  : 'bg-secondary text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              <span>{label}</span>
              {id === 'pass' && expiredArchive.length > 0 && (
                <span className="bg-amber-400 px-1 text-[9px] font-bold text-slate-950">{expiredArchive.length}</span>
              )}
            </button>
          ))}
        </div>

        {notice && (
          <div
            role="status"
            className={cn(
              'flex items-center justify-between gap-2 border px-3 py-2 text-xs font-semibold',
              notice.ok
                ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                : 'border-destructive/60 bg-destructive/15 text-red-200',
            )}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="ปิดการแจ้งเตือน"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: OVERVIEW & FULL 8-CATEGORY STOREFRONT */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border-2 border-cyan-400/35 bg-muted/60 p-2.5">
              <p className="text-[10px] text-muted-foreground">ยอดเพชรคงเหลือ (Wallet)</p>
              <p className="mt-1 flex items-center gap-1.5 text-base font-bold text-cyan-200 tabular-nums">
                <Gem className="size-4 text-cyan-300" aria-hidden />
                {formatNum(p.diamonds ?? 0)} D
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                รับรวม {formatNum(wallet.totalEarned)} · ใช้รวม {formatNum(wallet.totalSpent)}
              </p>
            </div>

            <div className="border-2 border-amber-400/35 bg-muted/60 p-2.5">
              <p className="text-[10px] text-muted-foreground">สถานะสมาชิก VIP</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-amber-200">
                <Crown className="size-4 text-amber-300" aria-hidden />
                {vipActive && vipBonuses.tierDef ? vipBonuses.tierDef.name : 'ยังไม่ได้เปิดใช้งาน VIP'}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                {vipActive
                  ? `EXP +${vipBonuses.expBonusPct}% · คงเหลือ ${formatVipRemaining(vipBonuses.remainingMs)}`
                  : `สะสม ${formatNum(vip.vipExp)} VIP EXP`}
              </p>
            </div>

            <div className="border-2 border-border bg-muted/60 p-2.5">
              <p className="text-[10px] text-muted-foreground">ความจุกระเป๋า & คลัง</p>
              <p className="mt-1 text-sm font-bold text-foreground tabular-nums">
                กระเป๋า {p.inventory.length}/{invBreakdown.total} · คลัง {p.storage.length}/{storBreakdown.total}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                โบนัส VIP +{invBreakdown.vipExtra} กระเป๋า / +{storBreakdown.vipExtra} คลัง
              </p>
            </div>

            <div className="border-2 border-border bg-muted/60 p-2.5">
              <p className="text-[10px] text-muted-foreground">แฟชั่น & คู่หูที่สวมใส่</p>
              <div className="mt-1 flex items-center gap-2">
                <SpriteModelCanvas
                  mode="job"
                  id={p.jobId}
                  action="idle"
                  dir="down"
                  size={34}
                  isGm={p.gm}
                  rebirthCount={p.rebirthCount}
                  showShadow={false}
                />
                <div className="min-w-0 text-[10px] text-muted-foreground">
                  <p className="truncate font-semibold text-foreground">
                    แฟชั่น {prem.fashion.unlockedIds.length} ชิ้น
                  </p>
                  <p className="truncate">
                    คู่หู: {activePetBonus ? activePetBonus.def.name : 'ไม่ได้เรียก'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 8-Category Premium Storefront */}
          <div className="space-y-3 border-2 border-border bg-muted/35 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-primary">
                  <Tag className="size-4" aria-hidden />
                  ร้านค้าพรีเมียมครบ 8 หมวดหมู่
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  ทุกการสั่งซื้อตรวจสอบราคา สต็อก และป้องกันรายการซ้ำผ่านเซิร์ฟเวอร์
                </p>
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาสินค้าพรีเมียม..."
                className="w-full border border-border bg-background px-2.5 py-1 text-xs text-foreground outline-none focus:border-cyan-400 sm:w-52"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setStoreCategory('all')}
                className={cn(
                  'pixel-btn shrink-0 px-2.5 py-1 text-[10px]',
                  storeCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
                )}
              >
                ทั้งหมด ({PREMIUM_CATALOG.length})
              </button>
              {PREMIUM_CATEGORY_META.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setStoreCategory(cat.id)}
                  className={cn(
                    'pixel-btn shrink-0 px-2.5 py-1 text-[10px]',
                    storeCategory === cat.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground',
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {catalogFiltered.map(renderProductCard)}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DIAMOND WALLET & SANDBOX TEST CONSOLE */}
      {activeTab === 'diamond' && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2.5 border-2 border-cyan-400/40 bg-cyan-950/20 p-3">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-cyan-200">
                  <FlaskConical className="size-4" aria-hidden />
                  Sandbox Test Console (เติมเพชรทดลอง)
                </h3>
                <span className="border border-cyan-300/40 bg-cyan-400/15 px-1.5 py-0.5 text-[9px] font-bold text-cyan-200">
                  SANDBOX
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                ปุ่มด้านล่างสำหรับทดสอบระบบ Premium MMORPG ด้วยเพชรจำลองเท่านั้น ห้ามใช้เงินจริง และทุกธุรกรรมจะถูกบันทึกพร้อม
                <code className="mx-1 text-cyan-200">txId</code> และลายเซ็นตรวจสอบจากเซิร์ฟเวอร์
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {SANDBOX_PRESETS.map((amt) => (
                  <PxButton
                    key={amt}
                    variant="accent"
                    disabled={inFlight}
                    onClick={() => void handleSandboxGrant(amt)}
                    className="py-2 text-[11px] tabular-nums"
                  >
                    +{formatNum(amt)} D
                  </PxButton>
                ))}
              </div>
              <form
                className="flex gap-1.5 pt-1"
                onSubmit={(e) => {
                  e.preventDefault()
                  void handleSandboxGrant(Number(customDiamonds) || 0)
                }}
              >
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={customDiamonds}
                  onChange={(e) => setCustomDiamonds(e.target.value)}
                  aria-label="จำนวนเพชรทดลอง"
                  className="min-w-0 flex-1 border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-cyan-400"
                />
                <PxButton type="submit" disabled={inFlight}>
                  <Gem className="mr-1 inline size-3.5" aria-hidden />
                  เติมเพชรทดลอง
                </PxButton>
              </form>
            </div>

            <div className="space-y-2 border-2 border-border bg-muted/50 p-3">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-primary">
                <ShieldCheck className="size-4" aria-hidden />
                สรุปกระเป๋าเพชร ({wallet.characterId})
              </h3>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="border border-border/60 bg-background/70 p-2">
                  <dt className="text-[10px] text-muted-foreground">ยอดเพชรปัจจุบัน</dt>
                  <dd className="mt-0.5 text-base font-bold text-cyan-200 tabular-nums">
                    {formatNum(p.diamonds ?? 0)} D
                  </dd>
                </div>
                <div className="border border-border/60 bg-background/70 p-2">
                  <dt className="text-[10px] text-muted-foreground">จำนวนธุรกรรมทั้งหมด</dt>
                  <dd className="mt-0.5 text-base font-bold text-foreground tabular-nums">
                    {wallet.transactionHistory.length} รายการ
                  </dd>
                </div>
                <div className="border border-border/60 bg-background/70 p-2">
                  <dt className="text-[10px] text-muted-foreground">ได้รับสะสม (Total Earned)</dt>
                  <dd className="mt-0.5 font-bold text-emerald-300 tabular-nums">
                    +{formatNum(wallet.totalEarned)} D
                  </dd>
                </div>
                <div className="border border-border/60 bg-background/70 p-2">
                  <dt className="text-[10px] text-muted-foreground">ใช้จ่ายสะสม (Total Spent)</dt>
                  <dd className="mt-0.5 font-bold text-amber-300 tabular-nums">
                    -{formatNum(wallet.totalSpent)} D
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Transaction History Table */}
          <div className="space-y-2 border-2 border-border bg-muted/40 p-3">
            <h3 className="text-xs font-bold text-primary">ประวัติการรับและใช้เพชร (Diamond Ledger)</h3>
            {wallet.transactionHistory.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                ยังไม่มีประวัติธุรกรรมเพชร — ลองกดเติมเพชรทดลองด้านบนเพื่อเริ่มทดสอบ
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-border/60">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-secondary text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5">Tx ID</th>
                      <th className="px-2 py-1.5">ประเภท</th>
                      <th className="px-2 py-1.5">รายการ</th>
                      <th className="px-2 py-1.5 text-right">จำนวน</th>
                      <th className="px-2 py-1.5 text-right">ยอดก่อน → หลัง</th>
                      <th className="px-2 py-1.5 text-center">ยืนยัน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 bg-background/70">
                    {wallet.transactionHistory.slice(0, 40).map((tx) => (
                      <tr key={tx.txId}>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">{tx.txId}</td>
                        <td className="px-2 py-1.5">
                          <span
                            className={cn(
                              'px-1.5 py-0.5 text-[9px] font-bold',
                              tx.type === 'spend'
                                ? 'bg-amber-500/20 text-amber-200'
                                : 'bg-emerald-500/20 text-emerald-200',
                            )}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="max-w-48 truncate px-2 py-1.5 text-foreground" title={tx.note}>
                          {tx.note}
                        </td>
                        <td
                          className={cn(
                            'px-2 py-1.5 text-right font-bold tabular-nums',
                            tx.type === 'spend' ? 'text-amber-300' : 'text-emerald-300',
                          )}
                        >
                          {tx.type === 'spend' ? '-' : '+'}
                          {formatNum(tx.amount)} D
                        </td>
                        <td className="px-2 py-1.5 text-right text-muted-foreground tabular-nums">
                          {formatNum(tx.balanceBefore)} → {formatNum(tx.balanceAfter)}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {tx.serverVerified ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-300" title="Server Verified">
                              <ShieldCheck className="size-3" aria-hidden /> OK
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Local</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: VIP MEMBERSHIP (TIERS 1-5) */}
      {activeTab === 'vip' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-amber-400/45 bg-amber-950/20 p-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Crown className="size-4 text-amber-300" aria-hidden />
                <h3 className="text-sm font-bold text-amber-200">
                  {vipActive && vipBonuses.tierDef ? vipBonuses.tierDef.name : 'VIP ยังไม่เปิดใช้งาน'}
                </h3>
                <span className="border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-200">
                  {vipActive ? `หมดอายุใน ${formatVipRemaining(vipBonuses.remainingMs)}` : 'ซื้อบัตร VIP เพื่อเริ่มใช้งาน'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                VIP EXP: {formatNum(vip.vipExp)} / ขั้นถัดไป {formatNum(nextVipTier.expRequired)} ({nextVipTier.name}) ·
                เพดานสมดุล EXP +{VIP_EXP_BONUS_CAP_PCT}% / กระเป๋า +{VIP_EXTRA_INVENTORY_CAP} / คลัง +{VIP_EXTRA_STORAGE_CAP}
              </p>
              <div className="h-2.5 w-full overflow-hidden border border-border bg-muted">
                <div
                  className="h-full bg-amber-400 transition-[width]"
                  style={{
                    width: `${
                      nextVipTier.expRequired <= 0
                        ? 100
                        : Math.min(100, Math.round((vip.vipExp / nextVipTier.expRequired) * 100))
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <PxButton
                variant="accent"
                disabled={!canClaimDailyVip || inFlight}
                onClick={() => void handleClaimVipDaily()}
              >
                {vipActive
                  ? canClaimDailyVip
                    ? 'รับรางวัล VIP รายวัน'
                    : 'รับรายวันวันนี้แล้ว'
                  : 'ต้องเปิดใช้งาน VIP'}
              </PxButton>
              <PxButton
                variant="primary"
                disabled={inFlight}
                onClick={() => {
                  const p7 = getPremiumProduct('prod_vip_card_7d')
                  if (p7) openBuyModal(p7)
                }}
              >
                ซื้อบัตร VIP 7 วัน (150 D)
              </PxButton>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {VIP_TIERS.map((tier) => {
              const reached = vipActive && vip.vipLevel >= tier.level
              const claimed = vip.claimedTierRewards.includes(tier.level)
              return (
                <div
                  key={tier.level}
                  className={cn(
                    'flex flex-col justify-between gap-2.5 border-2 p-3',
                    reached ? 'border-amber-400/60 bg-amber-500/10' : 'border-border bg-background/60',
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-bold"
                        style={{
                          color: tier.badgeColor,
                          backgroundColor: tier.badgeBg,
                          borderColor: tier.badgeBorder,
                        }}
                      >
                        <Crown className="size-3" aria-hidden />
                        {tier.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        ต้องการ {formatNum(tier.expRequired)} VIP EXP
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 text-[11px] text-foreground/90">
                      {tier.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-1.5">
                          <Check className="mt-0.5 size-3 shrink-0 text-emerald-400" aria-hidden />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 space-y-1 border-t border-border/60 pt-2 text-[10px]">
                      <p className="text-cyan-200">รางวัลเลื่อนขั้น: {tier.tierReward.label}</p>
                      <p className="text-amber-200">รางวัลรายวัน: {tier.dailyReward.label}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end border-t border-border/60 pt-2">
                    {claimed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                        <Check className="size-3.5" aria-hidden /> รับรางวัลขั้นนี้แล้ว
                      </span>
                    ) : (
                      <PxButton
                        variant={reached ? 'accent' : 'secondary'}
                        disabled={!reached || inFlight}
                        onClick={() => void handleClaimVipTier(tier.level)}
                      >
                        {reached ? 'รับรางวัลเลื่อนขั้น VIP' : `ปลดล็อกที่ VIP ${tier.level}`}
                      </PxButton>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 4: PREMIUM PASS & EXPIRED ARCHIVE */}
      {activeTab === 'pass' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-primary/45 bg-primary/10 p-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Award className="size-4 text-primary" aria-hidden />
                <h3 className="text-sm font-bold text-primary">{CURRENT_BP_SEASON_META.seasonName}</h3>
                <span className="inline-flex items-center gap-1 border border-border bg-background/70 px-2 py-0.5 text-[10px] text-cyan-200">
                  <Clock className="size-3" aria-hidden />
                  {formatCountdown(CURRENT_BP_SEASON_META.seasonEndAtMs, nowMs)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                ระดับปัจจุบัน Lv.{bp.level}/{BP_MAX_LEVEL} · EXP {bp.exp}/{BP_EXP_PER_LEVEL}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!bp.premiumUnlocked ? (
                <PxButton
                  variant="primary"
                  disabled={(p.diamonds ?? 0) < BP_PREMIUM_DIAMOND_COST || inFlight}
                  onClick={() => {
                    const res = unlockBattlePassPremiumAction()
                    if (res.ok) playQuestClaimSfx(true)
                    setNotice({ ok: res.ok, text: res.message })
                  }}
                >
                  ปลดล็อก Premium Pass ({BP_PREMIUM_DIAMOND_COST} D)
                </PxButton>
              ) : (
                <span className="border border-amber-400/50 bg-amber-400/15 px-2.5 py-1.5 text-xs font-bold text-amber-200">
                  Premium Pass เปิดใช้งานแล้ว
                </span>
              )}
              <PxButton variant="secondary" onClick={() => openPanel('pass')}>
                เปิดหน้าต่าง Battle Pass เต็ม
              </PxButton>
            </div>
          </div>

          {expiredArchive.length > 0 && (
            <div className="space-y-2 border-2 border-amber-400/50 bg-amber-500/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
                    <Archive className="size-4" aria-hidden />
                    รางวัลซีซันเก่าที่ยังไม่ได้รับ ({expiredArchive.length} รายการ)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    ระบบเก็บรักษารางวัลที่ปลดล็อกแล้วจากซีซันก่อนหน้าให้คุณกดรับย้อนหลังได้ไม่สูญหาย
                  </p>
                </div>
                <PxButton
                  variant="accent"
                  onClick={() => {
                    const res = claimExpiredPassArchiveAction()
                    if (res.ok) playQuestClaimSfx(true)
                    setNotice({ ok: res.ok, text: res.message })
                  }}
                >
                  รับย้อนหลังทั้งหมด ({expiredArchive.length})
                </PxButton>
              </div>
              <div className="grid max-h-40 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {expiredArchive.map((entry) => (
                  <div
                    key={entry.archiveId}
                    className="flex items-center justify-between gap-2 border border-border/60 bg-background/70 px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="truncate">
                      [{entry.seasonId}] Lv.{entry.level} ({entry.track}): {entry.label}
                    </span>
                    <PxButton
                      variant="secondary"
                      className="px-2 py-0.5 text-[10px]"
                      onClick={() => {
                        const res = claimExpiredPassArchiveAction(entry.archiveId)
                        if (res.ok) playQuestClaimSfx(false)
                        setNotice({ ok: res.ok, text: res.message })
                      }}
                    >
                      รับ
                    </PxButton>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid max-h-64 gap-1.5 overflow-y-auto sm:grid-cols-2">
            {BATTLE_PASS_TIERS.slice(0, 10).map((tier) => {
              const unlocked = bp.level >= tier.level
              const freeClaimed = bp.claimedFree.includes(tier.level)
              const premClaimed = bp.claimedPrem.includes(tier.level)
              return (
                <div key={tier.level} className="space-y-1 border border-border bg-background/70 p-2 text-[11px]">
                  <div className="flex items-center justify-between font-bold text-primary">
                    <span>Lv.{tier.level}</span>
                    {!unlocked && <Lock className="size-3 text-muted-foreground" aria-hidden />}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-muted-foreground">ฟรี: {tier.freeReward.label}</span>
                    {freeClaimed ? (
                      <span className="text-[10px] text-emerald-300">รับแล้ว</span>
                    ) : (
                      <PxButton
                        disabled={!unlocked}
                        className="px-2 py-0.5 text-[10px]"
                        onClick={() => {
                          const res = claimBattlePassTierAction(tier.level, 'free')
                          if (res.ok) playQuestClaimSfx(false)
                          setNotice({ ok: res.ok, text: res.message })
                        }}
                      >
                        รับ
                      </PxButton>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-amber-200">พรีเมียม: {tier.premReward.label}</span>
                    {!bp.premiumUnlocked ? (
                      <Lock className="size-3 text-muted-foreground" aria-hidden />
                    ) : premClaimed ? (
                      <span className="text-[10px] text-emerald-300">รับแล้ว</span>
                    ) : (
                      <PxButton
                        variant="accent"
                        disabled={!unlocked}
                        className="px-2 py-0.5 text-[10px]"
                        onClick={() => {
                          const res = claimBattlePassTierAction(tier.level, 'prem')
                          if (res.ok) playQuestClaimSfx(false)
                          setNotice({ ok: res.ok, text: res.message })
                        }}
                      >
                        รับ
                      </PxButton>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 5: 5-SLOT FASHION SYSTEM */}
      {activeTab === 'fashion' && (
        <div className="space-y-4">
          <div className="grid gap-3 border-2 border-border bg-muted/50 p-3 sm:grid-cols-[120px_1fr] sm:items-center">
            <div className="grid place-items-center border border-border bg-slate-950/90 p-2">
              <SpriteModelCanvas
                mode="job"
                id={p.jobId}
                action="auto"
                dir="down"
                size={84}
                isGm={p.gm}
                rebirthCount={p.rebirthCount}
                label="พรีวิวตัวละครพร้อมแฟชั่น 5 ส่วน"
              />
            </div>
            <div className="space-y-1.5 text-xs">
              <p className="font-bold text-primary">แฟชั่น 5 ส่วนที่แสดงผลจริงบนตัวละคร</p>
              <div className="grid gap-1 sm:grid-cols-2">
                {FASHION_SLOTS.map((slot) => {
                  const eqId = prem.fashion.equipped[slot]
                  const eqDef = PREMIUM_FASHION_ITEMS.find((f) => f.id === eqId)
                  return (
                    <div key={slot} className="flex items-center justify-between gap-2 border border-border/60 bg-background/70 px-2 py-1 text-[11px]">
                      <span className="truncate text-muted-foreground">{FASHION_SLOT_LABELS[slot].split('(')[0]}</span>
                      <span className="truncate font-semibold text-foreground">{eqDef?.name ?? 'ยังไม่สวม'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FASHION_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setFashionSlot(slot)}
                className={cn(
                  'pixel-btn px-2.5 py-1 text-[11px]',
                  fashionSlot === slot ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
                )}
              >
                {FASHION_SLOT_LABELS[slot]}
              </button>
            ))}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {PREMIUM_FASHION_ITEMS.filter((f) => f.slot === fashionSlot).map((f) => {
              const isVipExclusive = vipBonuses.active && vipBonuses.exclusiveFashionIds.includes(f.id)
              const unlocked = prem.fashion.unlockedIds.includes(f.id) || isVipExclusive
              const equipped = prem.fashion.equipped[f.slot] === f.id
              const linkedProd = PREMIUM_CATALOG.find(
                (prod) => prod.payload?.fashionId === f.id || prod.itemId === f.linkedGemItemId,
              )
              const vipBlocked = Boolean(f.vipRequired && (!vipBonuses.active || vipBonuses.level < f.vipRequired))

              return (
                <div
                  key={f.id}
                  className={cn(
                    'flex flex-col justify-between gap-2 border-2 p-3',
                    equipped ? 'border-cyan-400 bg-cyan-500/10' : 'border-border bg-background/70',
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="grid size-10 shrink-0 place-items-center border border-border"
                      style={{
                        background: `linear-gradient(135deg, ${f.primaryColor}, ${f.secondaryColor})`,
                      }}
                    >
                      <Sparkles className="size-4 text-white" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h4 className="truncate text-xs font-bold text-foreground">{f.name}</h4>
                        <span className={cn('border px-1.5 py-0.5 text-[9px]', rarityBadgeClass(f.rarity))}>
                          {f.rarity}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{f.description}</p>
                      {f.vipRequired && (
                        <p className="mt-1 text-[10px] text-amber-300">สิทธิ์เฉพาะสมาชิก VIP {f.vipRequired}+</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {equipped ? 'กำลังสวมใส่' : unlocked ? 'ปลดล็อกแล้ว' : linkedProd ? `${formatNum(linkedProd.diamondPrice)} D` : 'ปลดล็อกจาก VIP/กิจกรรม'}
                    </span>
                    {unlocked ? (
                      <PxButton
                        variant={equipped ? 'secondary' : 'accent'}
                        disabled={vipBlocked}
                        onClick={() => {
                          const res = equipFashionAction(f.slot, equipped ? null : f.id)
                          if (res.ok) playQuestClaimSfx(false)
                          setNotice({ ok: res.ok, text: res.message })
                        }}
                      >
                        {vipBlocked ? `ต้องมี VIP ${f.vipRequired}` : equipped ? 'ถอดแฟชั่น' : 'สวมใส่'}
                      </PxButton>
                    ) : linkedProd ? (
                      <PxButton variant="primary" disabled={inFlight} onClick={() => openBuyModal(linkedProd)}>
                        ซื้อ ({formatNum(linkedProd.diamondPrice)} D)
                      </PxButton>
                    ) : (
                      <PxButton variant="secondary" onClick={() => setActiveTab('vip')}>
                        ดูสิทธิ์ VIP
                      </PxButton>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 6: PREMIUM PETS & MOUNTS WITH STAT CAPS */}
      {activeTab === 'pet' && (
        <div className="space-y-4">
          <div className="border-2 border-emerald-400/40 bg-emerald-950/20 p-3">
            {activePetBonus ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-14 place-items-center border border-border bg-slate-950/90">
                    <SpriteModelCanvas mode="pet" id={activePetBonus.petId} action="auto" dir="down" size={48} />
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <p className="font-bold text-emerald-300">
                      คู่หูที่ใช้งาน: {activePetBonus.def.name} (Lv.{activePetBonus.level} · {'★'.repeat(activePetBonus.stars)})
                    </p>
                    <p className="text-[11px] text-cyan-200">
                      สกิล: <strong>{activePetBonus.skill.name}</strong> ({activePetBonus.skill.triggerLabel}) —{' '}
                      {activePetBonus.skill.description}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      ATK +{activePetBonus.atkBonus}/{PET_STAT_CAPS.maxAtkBonus} · DEF +{activePetBonus.defBonus}/
                      {PET_STAT_CAPS.maxDefBonus} · HP +{activePetBonus.hpBonus}/{PET_STAT_CAPS.maxHpBonus} · พลังยิง{' '}
                      {activePetBonus.companionAtk}/{PET_STAT_CAPS.maxCompanionAtk}
                      {activePetBonus.isCapped ? ' · [ติดเพดานสมดุล]' : ''}
                    </p>
                  </div>
                </div>
                <PxButton variant="secondary" onClick={() => openPanel('pets')}>
                  จัดการ/วิวัฒนาการสัตว์เลี้ยง
                </PxButton>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  เพดานสมดุลสัตว์เลี้ยง: ATK +{PET_STAT_CAPS.maxAtkBonus}, DEF +{PET_STAT_CAPS.maxDefBonus}, HP +
                  {PET_STAT_CAPS.maxHpBonus}, EXP +{PET_STAT_CAPS.maxExpBonusPct}%, Gold +{PET_STAT_CAPS.maxGoldBonusPct}%
                </span>
                <PxButton variant="secondary" onClick={() => openPanel('pets')}>
                  เปิดหน้าสัตว์เลี้ยง ({COMBAT_PETS.length} ตัว)
                </PxButton>
              </div>
            )}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {PREMIUM_CATALOG.filter((prod) => prod.category === 'pet' || prod.category === 'mount').map(renderProductCard)}
          </div>
        </div>
      )}

      {/* TAB 7: INVENTORY & STORAGE EXPANSION */}
      {activeTab === 'storage' && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5 border-2 border-border bg-muted/50 p-3 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 font-bold text-primary">
                  <Backpack className="size-4" aria-hidden />
                  ความจุกระเป๋าตัวละคร
                </h3>
                <span className="font-bold text-cyan-200 tabular-nums">
                  {p.inventory.length} / {invBreakdown.total} ช่อง
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                พื้นฐาน {invBreakdown.base} + กระเป๋าดวงดาว {invBreakdown.scrollBonus} + คัมภีร์พรีเมียม{' '}
                {invBreakdown.premiumExtra}/{EXTRA_INVENTORY_SCROLL_CAP} + VIP +{invBreakdown.vipExtra}
              </p>
            </div>

            <div className="space-y-1.5 border-2 border-border bg-muted/50 p-3 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Warehouse className="size-4" aria-hidden />
                  ความจุคลังเก็บของพี่มณี
                </h3>
                <span className="font-bold text-amber-200 tabular-nums">
                  {p.storage.length} / {storBreakdown.total} ช่อง
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                พื้นฐาน {storBreakdown.base} + คัมภีร์ขยายคลัง {storBreakdown.premiumExtra}/{EXTRA_STORAGE_SCROLL_CAP} + VIP +
                {storBreakdown.vipExtra}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <PxButton variant="secondary" onClick={() => openPanel('storage')}>
              <Warehouse className="mr-1 inline size-3.5" aria-hidden />
              เปิดหน้าต่างคลังเก็บของ
            </PxButton>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {PREMIUM_CATALOG.filter((prod) => prod.category === 'storage-expansion').map(renderProductCard)}
          </div>
        </div>
      )}

      {/* TAB 8: PURCHASE HISTORY & AUDIT LOGS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="space-y-2 border-2 border-border bg-muted/40 p-3">
            <h3 className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Receipt className="size-4" aria-hidden />
              ใบเสร็จการสั่งซื้อพรีเมียม ({prem.purchaseHistory.length})
            </h3>
            {prem.purchaseHistory.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">ยังไม่มีประวัติการซื้อสินค้าพรีเมียม</p>
            ) : (
              <div className="max-h-52 overflow-y-auto border border-border/60">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-secondary text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5">Receipt ID</th>
                      <th className="px-2 py-1.5">สินค้า</th>
                      <th className="px-2 py-1.5 text-right">จำนวน</th>
                      <th className="px-2 py-1.5 text-right">ยอดชำระ</th>
                      <th className="px-2 py-1.5">เวลา</th>
                      <th className="px-2 py-1.5 text-center">Server</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 bg-background/70">
                    {prem.purchaseHistory.map((r) => (
                      <tr key={r.receiptId}>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">{r.receiptId}</td>
                        <td className="px-2 py-1.5 font-semibold text-foreground">{r.productName}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">x{r.qty}</td>
                        <td className="px-2 py-1.5 text-right font-bold text-cyan-200 tabular-nums">
                          {formatNum(r.totalPaid)} D
                        </td>
                        <td className="px-2 py-1.5 text-[10px] text-muted-foreground">
                          {formatDateTime(r.purchasedAtMs)}
                        </td>
                        <td className="px-2 py-1.5 text-center text-emerald-300">
                          {r.serverVerified ? 'Verified' : 'Local'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-2 border-2 border-border bg-muted/40 p-3">
            <h3 className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <UserCheck className="size-4" aria-hidden />
              บันทึกตรวจสอบระบบ (Audit Logs · {prem.auditLogs.length})
            </h3>
            {prem.auditLogs.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">ยังไม่มีบันทึก Audit</p>
            ) : (
              <div className="max-h-52 space-y-1 overflow-y-auto">
                {prem.auditLogs.map((log) => (
                  <div
                    key={log.logId}
                    className="flex flex-wrap items-center justify-between gap-2 border border-border/50 bg-background/70 px-2.5 py-1.5 text-[11px]"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="mr-1.5 border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9px] text-cyan-200">
                        {log.action}
                      </span>
                      <span className="text-foreground">{log.details}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{log.verifiedByServer ? 'Server OK' : 'Local'}</span>
                      <span>{formatDateTime(log.createdAtMs)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PURCHASE CONFIRMATION MODAL */}
      {confirmProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`ยืนยันการซื้อ ${confirmProduct.name}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget && !inFlight) setConfirmProduct(null)
          }}
        >
          <div className="pixel-panel w-full max-w-md space-y-3 border-2 border-cyan-400/60 bg-slate-950 p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-2 border-b border-border pb-2">
              <div className="flex items-center gap-2.5">
                <div className="grid size-11 place-items-center border border-border bg-muted">
                  <ProductThumb product={confirmProduct} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{confirmProduct.name}</h3>
                  <span className={cn('inline-block border px-1.5 py-0.5 text-[9px]', rarityBadgeClass(confirmProduct.rarity))}>
                    {confirmProduct.rarity}
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={inFlight}
                onClick={() => setConfirmProduct(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="ปิดหน้าต่างยืนยัน"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">{confirmProduct.description}</p>

            {confirmProduct.purchaseLimit !== 1 && confirmProduct.rewardKind === 'item' && (
              <div className="flex items-center justify-between text-xs">
                <span>จำนวนที่ต้องการซื้อ:</span>
                <div className="flex items-center gap-1.5">
                  {[1, 3, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={inFlight}
                      onClick={() => setConfirmQty(n)}
                      className={cn(
                        'pixel-btn px-2 py-0.5 text-[11px]',
                        confirmQty === n ? 'bg-cyan-300 text-slate-950' : 'bg-secondary text-foreground',
                      )}
                    >
                      x{n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <dl className="space-y-1.5 border border-border bg-muted/60 p-2.5 text-xs tabular-nums">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">ยอดชำระ (Sandbox Diamonds)</dt>
                <dd className="font-bold text-cyan-200">
                  {formatNum(confirmProduct.diamondPrice * confirmQty)} D
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">เพชรปัจจุบัน → คงเหลือหลังซื้อ</dt>
                <dd
                  className={cn(
                    'font-semibold',
                    (p.diamonds ?? 0) >= confirmProduct.diamondPrice * confirmQty
                      ? 'text-emerald-300'
                      : 'text-destructive',
                  )}
                >
                  {formatNum(p.diamonds ?? 0)} D →{' '}
                  {formatNum((p.diamonds ?? 0) - confirmProduct.diamondPrice * confirmQty)} D
                </dd>
              </div>
              {confirmProduct.vipExpGrant ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">โบนัส VIP EXP ที่ได้รับ</dt>
                  <dd className="font-semibold text-amber-300">
                    +{formatNum(confirmProduct.vipExpGrant * confirmQty)} VIP EXP
                  </dd>
                </div>
              ) : null}
            </dl>

            <div className="flex items-center justify-end gap-2 pt-1">
              <PxButton variant="secondary" disabled={inFlight} onClick={() => setConfirmProduct(null)}>
                ยกเลิก
              </PxButton>
              <PxButton
                variant="accent"
                disabled={inFlight || (p.diamonds ?? 0) < confirmProduct.diamondPrice * confirmQty}
                onClick={() => void handleConfirmPurchase()}
              >
                {inFlight ? (
                  <span className="inline-flex items-center gap-1">
                    <RefreshCw className="size-3 animate-spin" aria-hidden /> กำลังตรวจสอบ...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Coins className="size-3.5" aria-hidden /> ยืนยันการซื้อ
                  </span>
                )}
              </PxButton>
            </div>
          </div>
        </div>
      )}
    </PanelFrame>
  )
}
