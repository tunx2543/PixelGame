'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  ArrowLeft,
  ArrowUpRight,
  Backpack,
  Check,
  Eye,
  Lock,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  Skull,
  Sparkles,
  Swords,
  X,
} from 'lucide-react'
import { auth } from '@/lib/firebase/client'
import { listUserCharacters } from '@/lib/firebase/characters'
import { AccountPanel } from './account-panel'
import { formatNum } from './format'
import { ItemIcon } from './item-icon'
import { SpriteModelCanvas } from './sprite-model-canvas'
import { ITEMS, JOBS, normalizeJobId, type EquipmentSlot } from '@/lib/game/data'
import {
  SAVE_KEY,
  getActiveCharacterSlot,
  getStats,
  setActiveCharacterSlot,
  setGameAccountIdentity,
  type SaveData,
} from '@/lib/game/engine'
import {
  createDefaultEncounterSave,
  encounterSaveStorageKey,
  persistEncounterSave,
} from '@/lib/game/encounter'
import {
  buildEquipmentSlotCards,
  formatEquippedItemName,
  summarizeEquipmentBonuses,
} from '@/lib/game/equipment-ui'
import {
  equipInventoryItem,
  filterAndSortInventory,
  formatAllowedJobsLabel,
  getInventorySummary,
  getItemKindThaiLabel,
  getItemRarityMeta,
  getSlotThaiLabel,
  previewEquipStatDelta,
  previewUnequipStatDelta,
  renameWithTicketInSave,
  resolveItemRarity,
  unequipInventorySlot,
  useConsumableInInventory,
  type InventoryFilterTab,
  type InventoryItemEntry,
  type InventorySortMode,
  type ItemRarity,
} from '@/lib/game/inventory-screen'
import {
  EQUIPMENT_RARITY_META,
  formatAffixLabel,
  resolveEffectiveRarity,
} from '@/lib/game/mmo-systems'
import { resolveFashionLoadoutFromSave, type FashionLoadout } from '@/lib/game/fashion-renderer'
import { sanitizeExtV2 } from '@/lib/game/extended-systems'
import {
  FASHION_CHARACTER_SLOTS,
  FASHION_SLOT_LABELS,
  PREMIUM_FASHION_ITEMS,
  getFashionItemDef,
} from '@/lib/game/premium/fashion-pet'
import type { FashionSlot } from '@/lib/game/premium/types'
import { getEffectiveVipBonuses } from '@/lib/game/premium/vip'
import { sanitizePremiumState } from '@/lib/game/premium/wallet'
import { computeEquipmentSetBonuses } from '@/lib/game/rpg-systems'
import { pickNewerSave } from '@/lib/game/save-sync'
import type { Dir } from '@/lib/game/sprites'
import { cn } from '@/lib/utils'

type FullInventoryTab = InventoryFilterTab | 'fashion'

const FILTER_TABS: ReadonlyArray<{ id: FullInventoryTab; label: string }> = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'monster_drops', label: 'ดรอปจากมอนสเตอร์' },
  { id: 'equipable', label: 'สวมใส่ได้' },
  { id: 'weapon', label: 'อาวุธ' },
  { id: 'armor', label: 'ชุดเกราะ & ประดับ' },
  { id: 'consumable_material', label: 'ยา & วัสดุ' },
  { id: 'fashion', label: 'แฟชั่น' },
]

const RARITY_STYLES: Record<
  ItemRarity,
  {
    card: string
    slot: string
    iconBox: string
    text: string
    inspectorBox: string
  }
> = {
  common: {
    card: 'border-slate-500/45 bg-slate-900/50 hover:border-slate-400/80 hover:bg-slate-900/70',
    slot: 'border-slate-500/50 bg-slate-900/45',
    iconBox: 'border-slate-500/55 bg-slate-900/80',
    text: 'text-slate-300',
    inspectorBox: 'border-slate-500/55 bg-slate-900/45',
  },
  rare: {
    card: 'border-sky-400/65 bg-sky-950/35 hover:border-sky-300 hover:bg-sky-950/50',
    slot: 'border-sky-400/60 bg-sky-950/35',
    iconBox: 'border-sky-400/75 bg-sky-950/75',
    text: 'text-sky-300',
    inspectorBox: 'border-sky-400/65 bg-sky-950/30',
  },
  epic: {
    card: 'border-violet-400/75 bg-violet-950/40 hover:border-violet-300 hover:bg-violet-950/55',
    slot: 'border-violet-400/65 bg-violet-950/35',
    iconBox: 'border-violet-400/80 bg-violet-950/80',
    text: 'text-violet-300',
    inspectorBox: 'border-violet-400/70 bg-violet-950/30',
  },
  legendary: {
    card: 'border-amber-400/85 bg-amber-950/35 shadow-[inset_0_0_18px_rgba(251,191,36,0.12)] hover:border-amber-300 hover:bg-amber-950/50',
    slot: 'border-amber-400/75 bg-amber-950/35 shadow-[inset_0_0_14px_rgba(251,191,36,0.1)]',
    iconBox: 'border-amber-400/90 bg-amber-950/75',
    text: 'text-amber-300',
    inspectorBox: 'border-amber-400/75 bg-amber-950/30',
  },
}

function formatSignedDelta(value: number, suffix = ''): string {
  if (value > 0) return `+${formatNum(value)}${suffix}`
  if (value < 0) return `${formatNum(value)}${suffix}`
  return `0${suffix}`
}

export function InventoryScreen() {
  const [user, setUser] = useState<User | null>(null)
  const [slotId, setSlotId] = useState<string>('slot_1')
  const [save, setSave] = useState<SaveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncNotice, setSyncNotice] = useState<string>('กำลังโหลดข้อมูลคลังไอเทม...')

  const [tab, setTab] = useState<FullInventoryTab>('all')
  const [slotFilter, setSlotFilter] = useState<EquipmentSlot | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<InventorySortMode>('power')
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [inspectedEquippedSlot, setInspectedEquippedSlot] = useState<EquipmentSlot | null>(null)
  const [actionFeedback, setActionFeedback] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [pendingRenameUid, setPendingRenameUid] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [renameErr, setRenameErr] = useState<string | null>(null)
  const [fashionSlotFilter, setFashionSlotFilter] = useState<'all' | FashionSlot>('all')
  const [fashionPreviewOverrides, setFashionPreviewOverrides] = useState<Partial<Record<FashionSlot, string | null>>>({})
  const [previewDir, setPreviewDir] = useState<Dir>('down')

  const saveRef = useRef<SaveData | null>(null)
  saveRef.current = save

  const syncSave = useCallback(async (nextSave: SaveData, activeUser: User | null, activeSlot: string) => {
    const cloudUid = activeUser && activeUser.emailVerified ? activeUser.uid : null
    try {
      await persistEncounterSave(nextSave, activeSlot, cloudUid)
      setSyncNotice(cloudUid ? `ซิงค์ข้อมูลคลังไอเทม (${activeSlot}) แล้ว` : 'บันทึกการสวมใส่ลงเครื่องแล้ว')
    } catch {
      setSyncNotice('บันทึกในเครื่องแล้ว (รอซิงค์คลาวด์)')
    }
  }, [])

  useEffect(() => {
    let active = true
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!active) return
      const cloudUid = nextUser && nextUser.emailVerified ? nextUser.uid : null
      setUser(nextUser)
      const preferredSlot = getActiveCharacterSlot() || 'slot_1'
      let resolvedSave: SaveData | null = null
      let resolvedSlot = preferredSlot

      if (cloudUid) {
        setGameAccountIdentity(cloudUid)
        let cloudSave: SaveData | null = null
        try {
          const chars = await listUserCharacters(cloudUid)
          const match = chars.find((c) => c.id === preferredSlot) ?? chars[0]
          if (match) {
            resolvedSlot = match.id
            setActiveCharacterSlot(match.id)
            cloudSave = match.saveData
          }
        } catch {
          // Fall back to local save
        }

        let localSave: SaveData | null = null
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(encounterSaveStorageKey(cloudUid, resolvedSlot))
            if (raw) localSave = JSON.parse(raw) as SaveData
          } catch {
            // Ignore malformed JSON
          }
        }

        const resolved = pickNewerSave(cloudSave, localSave)
        resolvedSave = resolved.save
        if (resolved.localIsNewer && resolved.save) {
          void persistEncounterSave(resolved.save, resolvedSlot, cloudUid).catch(() => undefined)
        }
      } else {
        setGameAccountIdentity(null)
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(SAVE_KEY)
            if (raw) resolvedSave = JSON.parse(raw) as SaveData
          } catch {
            // Ignore malformed JSON
          }
        }
      }

      if (!resolvedSave || resolvedSave.version !== 1) {
        resolvedSave = createDefaultEncounterSave(nextUser?.displayName || 'นักผจญภัย')
        try {
          await persistEncounterSave(resolvedSave, resolvedSlot, cloudUid)
        } catch {
          // Keep initialized default save in local memory
        }
      }

      if (!active) return
      saveRef.current = resolvedSave
      setSlotId(resolvedSlot)
      setSave(resolvedSave)
      setLoading(false)
      setSyncNotice(
        nextUser
          ? `เชื่อมต่อคลังของ ${resolvedSave.name} (${resolvedSlot})`
          : `โหมด Guest · ${resolvedSave.name}`,
      )
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const currentStats = useMemo(() => (save ? getStats(save) : null), [save])
  const slotCards = useMemo(() => (save ? buildEquipmentSlotCards(save.equipment) : null), [save])
  const equipBonusSummary = useMemo(
    () => (save ? summarizeEquipmentBonuses(save.equipment) : null),
    [save],
  )
  const setBonusSummary = useMemo(
    () => (save ? computeEquipmentSetBonuses(save.equipment) : null),
    [save],
  )
  const summary = useMemo(() => (save ? getInventorySummary(save) : null), [save])

  const filteredEntries = useMemo(() => {
    if (!save || tab === 'fashion') return []
    const base = filterAndSortInventory(save, { tab, search, sort })
    if (!slotFilter) return base
    return base.filter((entry) => entry.targetSlot === slotFilter)
  }, [save, tab, search, sort, slotFilter])

  const selectedBagEntry: InventoryItemEntry | null = useMemo(() => {
    if (!selectedUid) return null
    return filteredEntries.find((e) => e.item.uid === selectedUid)
      ?? (save ? filterAndSortInventory(save).find((e) => e.item.uid === selectedUid) ?? null : null)
  }, [filteredEntries, save, selectedUid])

  useEffect(() => {
    if (!selectedUid && !inspectedEquippedSlot && filteredEntries.length > 0) {
      setSelectedUid(filteredEntries[0].item.uid)
    }
  }, [filteredEntries, inspectedEquippedSlot, selectedUid])

  const statDeltaPreview = useMemo(() => {
    if (!save) return null
    if (selectedBagEntry && selectedBagEntry.targetSlot) {
      return previewEquipStatDelta(save, selectedBagEntry.item)
    }
    if (inspectedEquippedSlot) {
      return previewUnequipStatDelta(save, inspectedEquippedSlot)
    }
    return null
  }, [inspectedEquippedSlot, save, selectedBagEntry])

  const handleEquipEntry = useCallback(
    (itemUid: string) => {
      const currentSave = saveRef.current
      if (!currentSave) return
      const res = equipInventoryItem(currentSave, itemUid)
      if (res.error) {
        setActionFeedback({ tone: 'err', text: res.error })
        return
      }
      saveRef.current = res.nextSave
      setSave(res.nextSave)
      setSelectedUid(null)
      setInspectedEquippedSlot(null)
      const label = res.equippedItem ? formatEquippedItemName(res.equippedItem) : 'อุปกรณ์'
      setActionFeedback({ tone: 'ok', text: `สวมใส่ ${label} สำเร็จ — ค่าสถานะอัปเดตแล้ว` })
      void syncSave(res.nextSave, user, slotId)
    },
    [slotId, syncSave, user],
  )

  const handleUnequipSlot = useCallback(
    (slot: EquipmentSlot) => {
      const currentSave = saveRef.current
      if (!currentSave) return
      const res = unequipInventorySlot(currentSave, slot)
      if (res.error) {
        setActionFeedback({ tone: 'err', text: res.error })
        return
      }
      saveRef.current = res.nextSave
      setSave(res.nextSave)
      if (res.unequippedItem) {
        setSelectedUid(res.unequippedItem.uid)
      }
      setInspectedEquippedSlot(null)
      const label = res.unequippedItem ? formatEquippedItemName(res.unequippedItem) : getSlotThaiLabel(slot)
      setActionFeedback({ tone: 'ok', text: `ถอด ${label} กลับเข้ากระเป๋าแล้ว` })
      void syncSave(res.nextSave, user, slotId)
    },
    [slotId, syncSave, user],
  )

  const handleUseConsumable = useCallback(
    (itemUid: string) => {
      const currentSave = saveRef.current
      if (!currentSave) return
      const res = useConsumableInInventory(currentSave, itemUid)
      if (res.error) {
        setActionFeedback({ tone: 'err', text: res.error })
        return
      }
      if (res.requiresNameInput) {
        setPendingRenameUid(itemUid)
        setRenameDraft('')
        setRenameErr(null)
        return
      }
      saveRef.current = res.nextSave
      setSave(res.nextSave)
      if (!res.nextSave.inventory.some((i) => i.uid === itemUid)) {
        setSelectedUid((prev) => (prev === itemUid ? null : prev))
      }
      setActionFeedback({ tone: 'ok', text: res.message })
      void syncSave(res.nextSave, user, slotId)
    },
    [slotId, syncSave, user],
  )

  const handleConfirmRename = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const currentSave = saveRef.current
      if (!currentSave || !pendingRenameUid) return
      const res = renameWithTicketInSave(currentSave, pendingRenameUid, renameDraft)
      if (res.error) {
        setRenameErr(res.error)
        return
      }
      saveRef.current = res.nextSave
      setSave(res.nextSave)
      setPendingRenameUid(null)
      setRenameDraft('')
      setRenameErr(null)
      setActionFeedback({ tone: 'ok', text: res.message })
      void syncSave(res.nextSave, user, slotId)
    },
    [pendingRenameUid, renameDraft, slotId, syncSave, user],
  )

  const handleEquipFashion = useCallback(
    (slot: FashionSlot, fashionId: string | null) => {
      const currentSave = saveRef.current
      if (!currentSave) return
      const extV2 = sanitizeExtV2(currentSave.extV2)
      const prem = sanitizePremiumState(currentSave.premium, {
        characterId: String(currentSave.gameUid ?? currentSave.uid ?? 'char_local'),
        diamonds: currentSave.diamonds ?? 0,
        ownedGemItems: currentSave.ownedGemItems,
        equippedGemFashion: currentSave.equippedGemFashion,
        unlockedCosmetics: extV2.unlockedCosmetics,
        equippedWing: extV2.equippedWing,
        equippedWeaponSkin: extV2.equippedWeaponSkin,
      })
      const vipBonuses = getEffectiveVipBonuses(prem.vip)

      let nextGemFashion = currentSave.equippedGemFashion ?? null
      const nextExtV2 = { ...extV2 }

      if (fashionId === null) {
        const prevId = prem.fashion.equipped[slot]
        prem.fashion.equipped[slot] = null
        if (prevId) {
          const prevDef = getFashionItemDef(prevId)
          if (prevDef?.linkedGemItemId && nextGemFashion === prevDef.linkedGemItemId) {
            nextGemFashion = null
          }
          if (prevDef?.linkedLegacyCosmeticId) {
            if (nextExtV2.equippedWing === prevDef.linkedLegacyCosmeticId) nextExtV2.equippedWing = null
            if (nextExtV2.equippedWeaponSkin === prevDef.linkedLegacyCosmeticId) nextExtV2.equippedWeaponSkin = null
          }
        }
        const nextSave: SaveData = {
          ...currentSave,
          premium: prem,
          equippedGemFashion: nextGemFashion,
          extV2: nextExtV2,
          savedAt: Date.now(),
        }
        saveRef.current = nextSave
        setSave(nextSave)
        setActionFeedback({ tone: 'ok', text: `ถอดแฟชั่นช่อง ${FASHION_SLOT_LABELS[slot].split('(')[0].trim()} แล้ว (ค่าสถานะคงเดิม)` })
        void syncSave(nextSave, user, slotId)
        return
      }

      const def = getFashionItemDef(fashionId)
      if (!def || def.slot !== slot) return
      const isVipExclusive = vipBonuses.active && vipBonuses.exclusiveFashionIds.includes(fashionId)
      const unlocked = prem.fashion.unlockedIds.includes(fashionId) || isVipExclusive || Boolean(def.freeStarter)
      if (!unlocked) {
        setActionFeedback({ tone: 'err', text: 'ยังไม่ได้ปลดล็อกแฟชั่นชิ้นนี้' })
        return
      }
      if (def.vipRequired && (!vipBonuses.active || vipBonuses.level < def.vipRequired)) {
        setActionFeedback({ tone: 'err', text: `ต้องมี VIP ${def.vipRequired} จึงจะสวมใส่ได้` })
        return
      }
      if (!prem.fashion.unlockedIds.includes(fashionId)) {
        prem.fashion.unlockedIds.push(fashionId)
      }
      prem.fashion.equipped[slot] = fashionId
      if (def.linkedGemItemId) nextGemFashion = def.linkedGemItemId
      if (def.linkedLegacyCosmeticId) {
        if (!nextExtV2.unlockedCosmetics.includes(def.linkedLegacyCosmeticId)) {
          nextExtV2.unlockedCosmetics.push(def.linkedLegacyCosmeticId)
        }
        if (def.slot === 'wings') nextExtV2.equippedWing = def.linkedLegacyCosmeticId
        if (def.slot === 'weaponSkin') nextExtV2.equippedWeaponSkin = def.linkedLegacyCosmeticId
      }

      const nextSave: SaveData = {
        ...currentSave,
        premium: prem,
        equippedGemFashion: nextGemFashion,
        extV2: nextExtV2,
        savedAt: Date.now(),
      }
      saveRef.current = nextSave
      setSave(nextSave)
      setFashionPreviewOverrides((prev) => {
        if (!(slot in prev)) return prev
        const next = { ...prev }
        delete next[slot]
        return next
      })
      setActionFeedback({ tone: 'ok', text: `สวมใส่แฟชั่น ${def.name} สำเร็จ (ค่าสถานะคงเดิม)` })
      void syncSave(nextSave, user, slotId)
    },
    [slotId, syncSave, user],
  )

  const handleUnequipAllFashion = useCallback(() => {
    const currentSave = saveRef.current
    if (!currentSave) return
    const extV2 = sanitizeExtV2(currentSave.extV2)
    const prem = sanitizePremiumState(currentSave.premium, {
      characterId: String(currentSave.gameUid ?? currentSave.uid ?? 'char_local'),
      diamonds: currentSave.diamonds ?? 0,
      ownedGemItems: currentSave.ownedGemItems,
      equippedGemFashion: currentSave.equippedGemFashion,
      unlockedCosmetics: extV2.unlockedCosmetics,
      equippedWing: extV2.equippedWing,
      equippedWeaponSkin: extV2.equippedWeaponSkin,
    })
    for (const slot of FASHION_CHARACTER_SLOTS) {
      prem.fashion.equipped[slot] = null
    }
    extV2.equippedWing = null
    extV2.equippedWeaponSkin = null
    const nextSave: SaveData = {
      ...currentSave,
      premium: prem,
      equippedGemFashion: null,
      extV2,
      savedAt: Date.now(),
    }
    saveRef.current = nextSave
    setSave(nextSave)
    setFashionPreviewOverrides({})
    setActionFeedback({ tone: 'ok', text: 'ถอดแฟชั่นทั้งหมดแล้ว (ค่าสถานะคงเดิม)' })
    void syncSave(nextSave, user, slotId)
  }, [slotId, syncSave, user])

  if (loading || !save || !currentStats || !slotCards || !equipBonusSummary || !summary) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-background p-6">
        <div className="pixel-panel px-6 py-5 text-center">
          <p role="status" className="text-sm font-semibold text-primary">
            กำลังโหลดคลังไอเทมและอุปกรณ์...
          </p>
        </div>
      </main>
    )
  }

  const job = JOBS[normalizeJobId(save.jobId)]
  const weaponDef = save.equipment.weapon ? ITEMS[save.equipment.weapon.itemId] : undefined
  const inspectedEquippedItem = inspectedEquippedSlot ? save.equipment[inspectedEquippedSlot] : null
  const inspectedEquippedDef = inspectedEquippedItem ? ITEMS[inspectedEquippedItem.itemId] : null
  const saveExtV2 = sanitizeExtV2(save.extV2)
  const savePrem = sanitizePremiumState(save.premium, {
    characterId: String(save.gameUid ?? save.uid ?? 'char_local'),
    diamonds: save.diamonds ?? 0,
    ownedGemItems: save.ownedGemItems,
    equippedGemFashion: save.equippedGemFashion,
    unlockedCosmetics: saveExtV2.unlockedCosmetics,
    equippedWing: saveExtV2.equippedWing,
    equippedWeaponSkin: saveExtV2.equippedWeaponSkin,
  })
  const vipBonuses = getEffectiveVipBonuses(savePrem.vip)
  const equippedFashionLoadout = resolveFashionLoadoutFromSave({
    premium: savePrem,
    equippedGemFashion: save.equippedGemFashion,
    extV2: saveExtV2,
  })
  const hasFashionPreview = Object.keys(fashionPreviewOverrides).length > 0
  const previewFashionLoadout: FashionLoadout = {
    ...equippedFashionLoadout,
    ...fashionPreviewOverrides,
  }
  const ownedFashionList = PREMIUM_FASHION_ITEMS.filter((f) => {
    const isVip = vipBonuses.active && vipBonuses.exclusiveFashionIds.includes(f.id)
    return savePrem.fashion.unlockedIds.includes(f.id) || isVip || Boolean(f.freeStarter)
  })
  const equippedFashionCount = FASHION_CHARACTER_SLOTS.filter((slot) => Boolean(equippedFashionLoadout[slot])).length

  return (
    <main className="h-dvh w-full overflow-y-auto bg-background text-foreground">
      {/* 3-Zone Top Bar */}
      <header className="mx-auto flex w-full max-w-6xl flex-nowrap items-center justify-between gap-3 border-b-2 border-border px-4 py-2.5 md:gap-8 md:px-6 md:py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 whitespace-nowrap text-base font-bold tracking-tight text-primary hover:brightness-110"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Pixel Quest
        </Link>

        <nav aria-label="นำทางหลัก" className="hidden items-center gap-6 text-xs font-medium text-muted-foreground md:flex">
          <Link href="/" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">
            โลกผจญภัย
          </Link>
          <Link href="/encounter" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">
            สนามล่ามอนสเตอร์
          </Link>
          <Link href="/tower" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">
            หอคอยไต่ชั้น
          </Link>
          <Link href="/class-selector" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">
            สายอาชีพ
          </Link>
          <Link href="/character-status" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">
            สถานะตัวละคร
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden sm:block">
            <AccountPanel compact />
          </div>
          <Link
            href="/encounter"
            className="pixel-btn flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110 sm:min-h-10 sm:py-2"
          >
            <Swords className="size-3.5" aria-hidden />
            ล่ามอนสเตอร์
          </Link>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-5 p-4 lg:grid-cols-[360px_1fr] lg:p-6">
        {/* Left Column: Character Loadout, Live Stats & 5 Equipment Slots */}
        <aside aria-label="อุปกรณ์ที่สวมใส่และค่าสถานะ" className="flex flex-col gap-4">
          {/* Character Preview + Live Stat Table */}
          <section className="pixel-panel p-4">
            <div className="flex items-center gap-3 border-b border-border/70 pb-3">
              <div className="flex flex-col items-center gap-1">
                <div className="grid size-20 shrink-0 place-items-center border-2 border-[#0e0f1a] bg-[#131726]">
                  <SpriteModelCanvas
                    mode="job"
                    id={save.jobId}
                    action="auto"
                    dir={previewDir}
                    weaponOverride={weaponDef?.weaponType}
                    weaponColorOverride={weaponDef?.color}
                    fashion={previewFashionLoadout}
                    size={76}
                    isGm={save.gm}
                    rebirthCount={save.rebirthCount ?? 0}
                    label={`ตัวละคร ${save.name}`}
                  />
                </div>
                <div className="flex gap-0.5">
                  {(['down', 'left', 'right', 'up'] as Dir[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPreviewDir(d)}
                      className={cn(
                        'rounded border px-1 py-0 text-[9px]',
                        previewDir === d
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-secondary text-muted-foreground',
                      )}
                    >
                      {{ down: 'หน้า', left: 'ซ้าย', right: 'ขวา', up: 'หลัง' }[d]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold text-primary">{save.name}</h2>
                <p className="text-xs text-foreground">
                  Lv.{save.level} · {job.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{syncNotice}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="rounded border border-cyan-400/40 bg-cyan-500/10 px-1.5 py-0.5 text-cyan-200">
                    {hasFashionPreview ? 'พรีวิวแฟชั่น' : `แฟชั่น ${equippedFashionCount} ชิ้น`}
                  </span>
                  {hasFashionPreview && (
                    <button
                      type="button"
                      onClick={() => setFashionPreviewOverrides({})}
                      className="inline-flex items-center gap-0.5 text-amber-300 hover:underline"
                    >
                      <RotateCcw className="size-3" aria-hidden /> ล้างพรีวิว
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>ค่าสถานะตัวละครรวมอุปกรณ์</span>
              <span className="tabular-nums text-gold">{formatNum(save.gold)} G</span>
            </div>

            <dl className="mt-2 grid grid-cols-2 gap-2 text-xs tabular-nums">
              {[
                {
                  key: 'atk',
                  label: 'พลังโจมตี (ATK)',
                  value: currentStats.atk,
                  delta: statDeltaPreview?.delta.atk ?? 0,
                  suffix: '',
                },
                {
                  key: 'def',
                  label: 'พลังป้องกัน (DEF)',
                  value: currentStats.def,
                  delta: statDeltaPreview?.delta.def ?? 0,
                  suffix: '',
                },
                {
                  key: 'maxHp',
                  label: 'HP สูงสุด',
                  value: currentStats.maxHp,
                  delta: statDeltaPreview?.delta.maxHp ?? 0,
                  suffix: '',
                },
                {
                  key: 'maxMp',
                  label: 'MP สูงสุด',
                  value: currentStats.maxMp,
                  delta: statDeltaPreview?.delta.maxMp ?? 0,
                  suffix: '',
                },
                {
                  key: 'crit',
                  label: 'โอกาสคริติคอล',
                  value: Math.round(currentStats.crit * 100),
                  delta: Math.round((statDeltaPreview?.delta.crit ?? 0) * 100),
                  suffix: '%',
                },
                {
                  key: 'speed',
                  label: 'ความเร็วเคลื่อนที่',
                  value: Math.round(currentStats.speed),
                  delta: 0,
                  suffix: '',
                },
              ].map((stat) => (
                <div key={stat.key} className="border border-border/70 bg-background/60 px-2.5 py-2">
                  <dt className="text-[11px] text-muted-foreground">{stat.label}</dt>
                  <dd className="mt-0.5 flex items-baseline justify-between gap-1 font-bold text-foreground">
                    <span>
                      {formatNum(stat.value)}
                      {stat.suffix}
                    </span>
                    {stat.delta !== 0 && (
                      <span
                        className={cn(
                          'text-[11px] font-semibold',
                          stat.delta > 0 ? 'text-accent' : 'text-[#ff8b8e]',
                        )}
                      >
                        {formatSignedDelta(stat.delta, stat.suffix)}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground tabular-nums">
              <span>โบนัสอาวุธ +{formatNum(equipBonusSummary.totalAtkBonus)} ATK</span>
              <span>โบนัสเกราะ +{formatNum(equipBonusSummary.totalDefBonus)} DEF</span>
            </div>
          </section>

          {/* 5 Equipment Slots */}
          <section className="pixel-panel p-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <Shield className="size-4 text-primary" aria-hidden />
                ช่องสวมใส่อุปกรณ์ ({equipBonusSummary.totalEquippedCount}/{equipBonusSummary.totalSlotCount})
              </h2>
              {slotFilter && (
                <button
                  type="button"
                  onClick={() => setSlotFilter(null)}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  ล้างตัวกรองช่อง
                </button>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {[...slotCards.primary, ...slotCards.secondary].map((card) => {
                const isSelectedSlot = inspectedEquippedSlot === card.meta.slot
                const isFilteredSlot = slotFilter === card.meta.slot
                const equippedDef = card.equipped ? ITEMS[card.equipped.itemId] : undefined
                const equippedRarity = equippedDef ? resolveItemRarity(equippedDef) : null
                const rarityStyle = equippedRarity ? RARITY_STYLES[equippedRarity] : null
                const rarityMeta = equippedRarity ? getItemRarityMeta(equippedRarity) : null
                return (
                  <div
                    key={card.meta.slot}
                    data-rarity={equippedRarity ?? undefined}
                    className={cn(
                      'flex items-center justify-between gap-2.5 border p-2.5 transition-colors',
                      rarityStyle ? rarityStyle.slot : 'border-border/70 bg-background/50',
                      (isSelectedSlot || isFilteredSlot) && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (card.equipped) {
                          setSelectedUid(null)
                          setInspectedEquippedSlot(card.meta.slot)
                        } else {
                          setInspectedEquippedSlot(null)
                          setTab('equipable')
                          setSlotFilter((prev) => (prev === card.meta.slot ? null : card.meta.slot))
                        }
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div
                        className={cn(
                          'grid size-10 shrink-0 place-items-center border',
                          rarityStyle ? rarityStyle.iconBox : 'border-border bg-muted/80',
                        )}
                      >
                        {card.equipped ? (
                          <ItemIcon itemId={card.equipped.itemId} size={32} />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">ว่าง</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] text-muted-foreground">
                          {card.meta.thaiLabel} · {card.meta.statTag}
                          {rarityMeta && rarityStyle && (
                            <>
                              {' · '}
                              <span className={cn('font-semibold', rarityStyle.text)}>{rarityMeta.label}</span>
                            </>
                          )}
                        </p>
                        {card.equipped && card.displayName ? (
                          <p className="truncate text-xs font-bold text-foreground">
                            {card.displayName}
                            <span className="ml-1.5 font-semibold text-accent tabular-nums">
                              +{formatNum(card.power)} {card.meta.statPrefix}
                            </span>
                          </p>
                        ) : (
                          <p className="truncate text-xs text-muted-foreground">
                            ยังไม่ได้สวมใส่ (กดเพื่อกรองของใส่ช่องนี้)
                          </p>
                        )}
                      </div>
                    </button>

                    {card.equipped ? (
                      <button
                        type="button"
                        onClick={() => handleUnequipSlot(card.meta.slot)}
                        aria-label={`ถอด ${card.displayName ?? card.meta.thaiLabel}`}
                        className="pixel-btn min-h-9 shrink-0 bg-secondary px-2.5 py-1.5 text-xs font-semibold text-foreground hover:brightness-110"
                      >
                        ถอด
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>

            {setBonusSummary && (
              <div className="mt-3 border border-primary/40 bg-primary/5 p-2.5 text-xs">
                <p className="flex items-center gap-1.5 font-bold text-primary">
                  <Sparkles className="size-3.5" aria-hidden /> โบนัสเซ็ตอุปกรณ์
                </p>
                {setBonusSummary.activeLabels.length === 0 ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    สวมใส่อุปกรณ์ 2 ชิ้นขึ้นไปเพื่อปลดล็อกโบนัสเซ็ตถาวร
                  </p>
                ) : (
                  <ul className="mt-1 space-y-0.5 text-[11px] text-emerald-300">
                    {setBonusSummary.activeLabels.map((lbl) => (
                      <li key={lbl}>• {lbl}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        </aside>

        {/* Right Column: Item Inspector & Collected Items Bag */}
        <section aria-label="กระเป๋าไอเทมและรายละเอียด" className="flex flex-col gap-4">
          {/* Item Inspector Panel (Always visible above the fold on desktop) */}
          <div className="pixel-panel p-4" aria-label="รายละเอียดไอเทมที่เลือก">
            {selectedBagEntry ? (
              (() => {
                const inspectorRarity = RARITY_STYLES[selectedBagEntry.rarity]
                const inspectorRarityMeta = getItemRarityMeta(selectedBagEntry.rarity)
                return (
              <div className="flex flex-col gap-3">
                <div className={cn('flex flex-wrap items-start justify-between gap-3 border p-3', inspectorRarity.inspectorBox)}>
                  <div className="flex items-start gap-3">
                    <div
                      className={cn('grid size-14 shrink-0 place-items-center border-2', inspectorRarity.iconBox)}
                      style={{ backgroundColor: `${selectedBagEntry.def.color}22` }}
                    >
                      <ItemIcon itemId={selectedBagEntry.item.itemId} size={42} />
                    </div>
                    <div>
                      <h2 className="flex flex-wrap items-center gap-1.5 text-base font-bold text-foreground">
                        <span>
                          {selectedBagEntry.def.name}
                          {selectedBagEntry.item.plus > 0 ? ` +${selectedBagEntry.item.plus}` : ''}
                        </span>
                        {(() => {
                          const eff = resolveEffectiveRarity(selectedBagEntry.item, selectedBagEntry.def)
                          const mmoMeta = EQUIPMENT_RARITY_META[eff]
                          return (selectedBagEntry.def.kind === 'weapon' || selectedBagEntry.def.kind === 'armor') ? (
                            <span className={cn('px-1.5 py-0.5 text-[10px] font-bold', mmoMeta.badgeBgClass, mmoMeta.textColorClass)}>
                              {mmoMeta.thaiLabel}
                            </span>
                          ) : null
                        })()}
                        {selectedBagEntry.item.bound && (
                          <span className="inline-flex items-center gap-0.5 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                            <Lock className="size-2.5" aria-hidden /> ผูกมัด
                          </span>
                        )}
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                        <span className={cn('font-semibold', inspectorRarity.text)}>
                          {inspectorRarityMeta.label} ({inspectorRarityMeta.thaiLabel})
                        </span>
                        {' · '}
                        {getItemKindThaiLabel(selectedBagEntry.def.kind, selectedBagEntry.targetSlot)} · ต้องการ Lv.{selectedBagEntry.def.reqLevel ?? 1} · อาชีพ: {formatAllowedJobsLabel(selectedBagEntry.def)}
                      </p>
                      <p className="mt-1 text-xs text-foreground/90">{selectedBagEntry.def.description}</p>
                      {selectedBagEntry.item.affixes && selectedBagEntry.item.affixes.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {selectedBagEntry.item.affixes.map((af, idx) => (
                            <span
                              key={`${af.stat}-${idx}`}
                              className="border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                            >
                              {formatAffixLabel(af)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedBagEntry.targetSlot ? (
                    <button
                      type="button"
                      onClick={() => handleEquipEntry(selectedBagEntry.item.uid)}
                      disabled={!selectedBagEntry.canEquip}
                      className="pixel-btn min-h-10 shrink-0 bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {selectedBagEntry.canEquip ? 'สวมใส่ไอเทมนี้' : (selectedBagEntry.equipError ?? 'ใส่ไม่ได้')}
                    </button>
                  ) : selectedBagEntry.def.kind === 'consumable' ? (
                    <button
                      type="button"
                      onClick={() => handleUseConsumable(selectedBagEntry.item.uid)}
                      className="pixel-btn min-h-10 shrink-0 bg-accent px-4 py-2 text-xs font-bold text-accent-foreground hover:brightness-110"
                    >
                      ใช้ 1 ชิ้น
                    </button>
                  ) : null}
                </div>

                <div className={cn('grid gap-3', statDeltaPreview && selectedBagEntry.targetSlot ? 'md:grid-cols-2' : 'grid-cols-1')}>
                  {/* Live Stat Comparison */}
                  {statDeltaPreview && selectedBagEntry.targetSlot && (
                    <div className="border border-border/70 bg-background/50 p-3 text-xs tabular-nums">
                      <p className="font-semibold text-foreground">
                        ผลกระทบต่อสเตตัส ({getSlotThaiLabel(selectedBagEntry.targetSlot)})
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        เทียบกับที่ใส่อยู่:{' '}
                        {statDeltaPreview.currentlyEquipped
                          ? formatEquippedItemName(statDeltaPreview.currentlyEquipped)
                          : 'ยังว่าง'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          ATK: {formatNum(statDeltaPreview.before.atk)} →{' '}
                          <strong className="text-foreground">{formatNum(statDeltaPreview.after.atk)}</strong>{' '}
                          {statDeltaPreview.delta.atk !== 0 && (
                            <span className={statDeltaPreview.delta.atk > 0 ? 'text-accent' : 'text-[#ff8b8e]'}>
                              ({formatSignedDelta(statDeltaPreview.delta.atk)})
                            </span>
                          )}
                        </span>
                        <span>
                          DEF: {formatNum(statDeltaPreview.before.def)} →{' '}
                          <strong className="text-foreground">{formatNum(statDeltaPreview.after.def)}</strong>{' '}
                          {statDeltaPreview.delta.def !== 0 && (
                            <span className={statDeltaPreview.delta.def > 0 ? 'text-accent' : 'text-[#ff8b8e]'}>
                              ({formatSignedDelta(statDeltaPreview.delta.def)})
                            </span>
                          )}
                        </span>
                        <span>
                          Max HP: {formatNum(statDeltaPreview.before.maxHp)} →{' '}
                          <strong className="text-foreground">{formatNum(statDeltaPreview.after.maxHp)}</strong>{' '}
                          {statDeltaPreview.delta.maxHp !== 0 && (
                            <span className={statDeltaPreview.delta.maxHp > 0 ? 'text-accent' : 'text-[#ff8b8e]'}>
                              ({formatSignedDelta(statDeltaPreview.delta.maxHp)})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Monster Encounter Drop Sources */}
                  <div className="border border-border/70 bg-background/50 p-3 text-xs">
                    <p className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Skull className="size-3.5 text-primary" aria-hidden />
                      แหล่งที่มาจากการปราบมอนสเตอร์
                    </p>
                    {selectedBagEntry.monsterSources.length > 0 ? (
                      <p className="mt-1 text-muted-foreground tabular-nums">
                        {selectedBagEntry.monsterSources
                          .map(
                            (src) =>
                              `${src.monsterName} (Lv.${src.monsterLevel}${src.isBoss ? ' · บอส' : ''} · ${Math.round(src.chance * 100)}%)`,
                          )
                          .join(' · ')}
                      </p>
                    ) : (
                      <p className="mt-1 text-muted-foreground">
                        ได้รับจากร้านค้า ตู้กาชา หรืออุปกรณ์เริ่มต้นของนักผจญภัย
                      </p>
                    )}
                  </div>
                </div>
              </div>
                )
              })()
            ) : inspectedEquippedItem && inspectedEquippedDef && inspectedEquippedSlot ? (
              (() => {
                const eqRarity = resolveItemRarity(inspectedEquippedDef)
                const eqRarityStyle = RARITY_STYLES[eqRarity]
                const eqRarityMeta = getItemRarityMeta(eqRarity)
                return (
              <div className="flex flex-col gap-3">
                <div className={cn('flex flex-wrap items-start justify-between gap-3 border p-3', eqRarityStyle.inspectorBox)}>
                  <div className="flex items-start gap-3">
                    <div
                      className={cn('grid size-14 shrink-0 place-items-center border-2', eqRarityStyle.iconBox)}
                      style={{ backgroundColor: `${inspectedEquippedDef.color}22` }}
                    >
                      <ItemIcon itemId={inspectedEquippedItem.itemId} size={42} />
                    </div>
                    <div>
                      <h2 className="flex flex-wrap items-center gap-1.5 text-base font-bold text-foreground">
                        <span>{formatEquippedItemName(inspectedEquippedItem)}</span>
                        {(() => {
                          const eff = resolveEffectiveRarity(inspectedEquippedItem, inspectedEquippedDef)
                          const mmoMeta = EQUIPMENT_RARITY_META[eff]
                          return (
                            <span className={cn('px-1.5 py-0.5 text-[10px] font-bold', mmoMeta.badgeBgClass, mmoMeta.textColorClass)}>
                              {mmoMeta.thaiLabel}
                            </span>
                          )
                        })()}
                        {inspectedEquippedItem.bound && (
                          <span className="inline-flex items-center gap-0.5 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                            <Lock className="size-2.5" aria-hidden /> ผูกมัด
                          </span>
                        )}
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className={cn('font-semibold', eqRarityStyle.text)}>
                          {eqRarityMeta.label} ({eqRarityMeta.thaiLabel})
                        </span>
                        {' · '}
                        กำลังสวมใส่ในช่อง {getSlotThaiLabel(inspectedEquippedSlot)} · {inspectedEquippedDef.description}
                      </p>
                      {inspectedEquippedItem.affixes && inspectedEquippedItem.affixes.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {inspectedEquippedItem.affixes.map((af, idx) => (
                            <span
                              key={`${af.stat}-${idx}`}
                              className="border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                            >
                              {formatAffixLabel(af)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUnequipSlot(inspectedEquippedSlot)}
                    className="pixel-btn min-h-10 shrink-0 bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:brightness-110"
                  >
                    ถอดเก็บเข้ากระเป๋า
                  </button>
                </div>

                {statDeltaPreview && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    หากถอดออก: ATK {formatSignedDelta(statDeltaPreview.delta.atk)} · DEF{' '}
                    {formatSignedDelta(statDeltaPreview.delta.def)} · Max HP{' '}
                    {formatSignedDelta(statDeltaPreview.delta.maxHp)}
                  </p>
                )}
              </div>
                )
              })()
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="size-4 text-primary" aria-hidden />
                <span>เลือกไอเทมในกระเป๋าหรือช่องสวมใส่ เพื่อดูค่าพลังที่เพิ่มขึ้นและแหล่งที่มาจากมอนสเตอร์</span>
              </div>
            )}
          </div>

          {/* Bag Toolbar, Filter Bar & Item Grid */}
          <div className="pixel-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
              <div>
                <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Backpack className="size-5 text-primary" aria-hidden />
                  คลังไอเทมและของดรอปจากมอนสเตอร์
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  ความจุ {formatNum(summary.usedSlots)}/{formatNum(summary.maxSlots)} ช่อง · อุปกรณ์ {formatNum(summary.equipableCount)} ชิ้น · ดรอปจากมอนสเตอร์ {formatNum(summary.monsterDropStackCount)} รายการ
                </p>
              </div>
              <Link
                href="/encounter"
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
              >
                <Swords className="size-3.5" aria-hidden />
                ไปหามอนสเตอร์เพิ่มดรอป
              </Link>
            </div>

            {actionFeedback && (
              <div
                role="status"
                className={cn(
                  'mt-3 flex items-center justify-between gap-2 border px-3 py-2 text-xs font-medium',
                  actionFeedback.tone === 'ok'
                    ? 'border-accent/60 bg-accent/15 text-accent'
                    : 'border-destructive/60 bg-destructive/15 text-[#ff8b8e]',
                )}
              >
                <span className="flex items-center gap-1.5">
                  {actionFeedback.tone === 'ok' ? (
                    <Check className="size-3.5 shrink-0" aria-hidden />
                  ) : (
                    <X className="size-3.5 shrink-0" aria-hidden />
                  )}
                  {actionFeedback.text}
                </span>
                <button
                  type="button"
                  onClick={() => setActionFeedback(null)}
                  aria-label="ปิดการแจ้งเตือน"
                  className="text-current/80 hover:text-current"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            )}

            {/* Search & Sort Controls */}
            <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <label htmlFor="inventory-search" className="sr-only">
                  ค้นหาไอเทมหรือชื่อมอนสเตอร์ที่ดรอป
                </label>
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  id="inventory-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อไอเทม หรือชื่อมอนสเตอร์ (เช่น โครงกระดูก, ดาบ)..."
                  className="min-h-10 w-full border-2 border-border bg-input pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label htmlFor="inventory-sort" className="text-xs text-muted-foreground whitespace-nowrap">
                  เรียงตาม
                </label>
                <select
                  id="inventory-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as InventorySortMode)}
                  className="min-h-10 border-2 border-border bg-input px-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="power">พลังและอัปเกรดสูงสุด</option>
                  <option value="rarity">ระดับความหายากสูงสุด</option>
                  <option value="monster_drops">ของดรอปจากมอนสเตอร์ก่อน</option>
                  <option value="name">ชื่อไอเทม (ก-ฮ)</option>
                </select>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="หมวดหมู่ไอเทม">
              {FILTER_TABS.map((itemTab) => {
                const active = tab === itemTab.id
                return (
                  <button
                    key={itemTab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setTab(itemTab.id)
                      if (itemTab.id === 'consumable_material' || itemTab.id === 'all') {
                        setSlotFilter(null)
                      }
                    }}
                    className={cn(
                      'min-h-9 whitespace-nowrap shrink-0 border px-3 py-1.5 text-xs font-semibold transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-secondary/70 text-foreground/85 hover:border-primary/60 hover:text-foreground',
                    )}
                  >
                    {itemTab.label}
                  </button>
                )
              })}
              {slotFilter && (
                <button
                  type="button"
                  onClick={() => setSlotFilter(null)}
                  className="flex min-h-9 items-center gap-1 whitespace-nowrap shrink-0 border border-accent/60 bg-accent/15 px-2.5 py-1.5 text-xs font-semibold text-accent"
                >
                  ช่อง: {getSlotThaiLabel(slotFilter)}
                  <X className="size-3" aria-hidden />
                </button>
              )}
            </div>

            {/* Collected Items Grid OR Fashion Wardrobe */}
            {tab === 'fashion' ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border border-emerald-400/35 bg-emerald-950/15 px-3 py-2 text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-200">
                    <ShieldCheck className="size-4 shrink-0" aria-hidden />
                    แฟชั่นปลดล็อกแล้ว {ownedFashionList.length} ชิ้น · กำลังใส่ {equippedFashionCount} ส่วน (ไม่เปลี่ยนสเตตัสอุปกรณ์จริง)
                  </span>
                  <div className="flex gap-1.5">
                    {hasFashionPreview && (
                      <button
                        type="button"
                        onClick={() => setFashionPreviewOverrides({})}
                        className="pixel-btn bg-secondary px-2.5 py-1 text-[11px] text-foreground"
                      >
                        ล้างพรีวิว
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={equippedFashionCount === 0}
                      onClick={handleUnequipAllFashion}
                      className="pixel-btn bg-secondary px-2.5 py-1 text-[11px] text-foreground disabled:opacity-45"
                    >
                      ถอดแฟชั่นทั้งหมด
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFashionSlotFilter('all')}
                    className={cn(
                      'border px-2.5 py-1 text-[11px] font-semibold',
                      fashionSlotFilter === 'all'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-secondary/70 text-foreground/80',
                    )}
                  >
                    ทั้งหมด ({ownedFashionList.length})
                  </button>
                  {FASHION_CHARACTER_SLOTS.map((slot) => {
                    const count = ownedFashionList.filter((f) => f.slot === slot).length
                    if (count === 0) return null
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setFashionSlotFilter(slot)}
                        className={cn(
                          'border px-2.5 py-1 text-[11px] font-semibold',
                          fashionSlotFilter === slot
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-secondary/70 text-foreground/80',
                        )}
                      >
                        {FASHION_SLOT_LABELS[slot].split('(')[0].trim()} ({count})
                      </button>
                    )
                  })}
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {(fashionSlotFilter === 'all'
                    ? ownedFashionList
                    : ownedFashionList.filter((f) => f.slot === fashionSlotFilter)
                  ).map((f) => {
                    const equipped = equippedFashionLoadout[f.slot] === f.id
                    const isPreviewing = fashionPreviewOverrides[f.slot] === f.id
                    const vipBlocked = Boolean(f.vipRequired && (!vipBonuses.active || vipBonuses.level < f.vipRequired))

                    return (
                      <div
                        key={f.id}
                        className={cn(
                          'flex flex-col justify-between gap-2.5 border-2 p-3 text-xs',
                          equipped
                            ? 'border-cyan-400 bg-cyan-500/10'
                            : isPreviewing
                              ? 'border-amber-400 bg-amber-500/10'
                              : 'border-border bg-card/70',
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className="grid size-12 shrink-0 place-items-center overflow-hidden border bg-[#0d1220]"
                            style={{ borderColor: f.primaryColor }}
                          >
                            <img
                              src={f.iconAsset ?? `/assets/fashion/icons/${f.id}.png`}
                              alt={f.name}
                              className="size-11 object-contain"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-foreground">{f.name}</p>
                            <p className="mt-0.5 text-[10.5px] text-primary">
                              {FASHION_SLOT_LABELS[f.slot].split('(')[0].trim()} · {f.rarity}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{f.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2">
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
                            className={cn(
                              'pixel-btn inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px]',
                              isPreviewing
                                ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400'
                                : 'bg-secondary text-foreground',
                            )}
                          >
                            <Eye className="size-3.5" aria-hidden />
                            {isPreviewing ? 'ปิดพรีวิว' : 'พรีวิว'}
                          </button>
                          <button
                            type="button"
                            disabled={vipBlocked}
                            onClick={() => handleEquipFashion(f.slot, equipped ? null : f.id)}
                            className={cn(
                              'pixel-btn px-3 py-1.5 text-xs font-bold disabled:opacity-45',
                              equipped
                                ? 'bg-secondary text-foreground hover:brightness-110'
                                : 'bg-accent text-accent-foreground hover:brightness-110',
                            )}
                          >
                            {vipBlocked ? `ต้องมี VIP ${f.vipRequired}` : equipped ? 'ถอดออก' : 'สวมใส่'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="mt-4 border border-border/70 bg-background/50 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-foreground">
                  ไม่พบไอเทมในหมวดนี้
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {search || slotFilter || tab !== 'all'
                    ? 'ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง เพื่อดูไอเทมทั้งหมดในกระเป๋า'
                    : 'ออกล่ามอนสเตอร์ในสนามประลองเพื่อสะสมอาวุธ ชุดเกราะ และวัตถุดิบหายาก'}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {(search || slotFilter || tab !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab('all')
                        setSlotFilter(null)
                        setSearch('')
                      }}
                      className="pixel-btn min-h-10 bg-secondary px-3 py-2 text-xs font-semibold text-foreground hover:brightness-110"
                    >
                      แสดงไอเทมทั้งหมด
                    </button>
                  )}
                  <Link
                    href="/encounter"
                    className="pixel-btn min-h-10 bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:brightness-110"
                  >
                    ไปล่ามอนสเตอร์
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredEntries.map((entry) => {
                  const isSelected = selectedUid === entry.item.uid
                  const nameWithPlus = `${entry.def.name}${entry.item.plus > 0 ? ` +${entry.item.plus}` : ''}`
                  const rarityStyle = RARITY_STYLES[entry.rarity]
                  const rarityMeta = getItemRarityMeta(entry.rarity)
                  return (
                    <div
                      key={entry.item.uid}
                      data-rarity={entry.rarity}
                      className={cn(
                        'flex flex-col justify-between border-2 p-3 transition-colors',
                        rarityStyle.card,
                        isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setInspectedEquippedSlot(null)
                          setSelectedUid(entry.item.uid)
                        }}
                        className="flex w-full items-start gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div
                          className={cn('grid size-11 shrink-0 place-items-center border', rarityStyle.iconBox)}
                          style={{ backgroundColor: `${entry.def.color}22` }}
                        >
                          <ItemIcon itemId={entry.item.itemId} size={32} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-foreground">
                            {nameWithPlus}
                            {entry.item.bound ? ' 🔒' : ''}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground tabular-nums">
                            <span className={cn('font-semibold', rarityStyle.text)}>{rarityMeta.label}</span>
                            {' · '}
                            {entry.targetSlot
                              ? `${entry.statLabel} +${formatNum(entry.power)} · Lv.${entry.def.reqLevel ?? 1}`
                              : `${getItemKindThaiLabel(entry.def.kind)} · x${formatNum(entry.item.qty)}`}
                          </p>
                          {entry.item.affixes && entry.item.affixes.length > 0 ? (
                            <p className="mt-0.5 truncate text-[10px] font-medium text-primary">
                              {entry.item.affixes.map(formatAffixLabel).join(' · ')}
                            </p>
                          ) : (
                            <p className="mt-0.5 truncate text-[11px] tabular-nums">
                              {entry.isUpgradeForSlot ? (
                                <span className="inline-flex items-center gap-0.5 font-semibold text-accent">
                                  <ArrowUpRight className="size-3" aria-hidden />
                                  แรงกว่าที่ใส่อยู่
                                </span>
                              ) : entry.equipError ? (
                                <span className="text-[#ff8b8e]">{entry.equipError}</span>
                              ) : entry.isMonsterDrop ? (
                                <span className="text-primary/90">
                                  ดรอปจาก {entry.monsterSources[0].monsterName}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">ไอเทมทั่วไป</span>
                              )}
                            </p>
                          )}
                        </div>
                      </button>

                      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {entry.targetSlot ? getSlotThaiLabel(entry.targetSlot) : `จำนวน ${formatNum(entry.item.qty)}`}
                        </span>

                        {entry.targetSlot ? (
                          <button
                            type="button"
                            onClick={() => handleEquipEntry(entry.item.uid)}
                            disabled={!entry.canEquip}
                            className="pixel-btn min-h-9 shrink-0 bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            สวมใส่
                          </button>
                        ) : entry.def.kind === 'consumable' ? (
                          <button
                            type="button"
                            onClick={() => handleUseConsumable(entry.item.uid)}
                            className="pixel-btn min-h-9 shrink-0 bg-accent px-3 py-1 text-xs font-bold text-accent-foreground hover:brightness-110"
                          >
                            ใช้งาน
                          </button>
                        ) : (
                          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                            มูลค่า {formatNum(entry.def.price)} G
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {pendingRenameUid && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inv-rename-title"
        >
          <form onSubmit={handleConfirmRename} className="pixel-panel w-full max-w-sm space-y-3 p-4 shadow-2xl">
            <div>
              <h2 id="inv-rename-title" className="text-sm font-bold text-primary">
                ใช้บัตรเปลี่ยนชื่อตัวละคร
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                ชื่อปัจจุบัน: <strong className="text-foreground">{save.name}</strong> · กรอกชื่อใหม่ 1–16 ตัวอักษร
              </p>
            </div>
            <input
              type="text"
              maxLength={16}
              autoFocus
              value={renameDraft}
              onChange={(e) => {
                setRenameDraft(e.target.value)
                if (renameErr) setRenameErr(null)
              }}
              placeholder="กรอกชื่อตัวละครใหม่..."
              className="w-full border-2 border-border bg-input px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
            {renameErr && <p className="text-[11px] font-medium text-destructive">{renameErr}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingRenameUid(null)
                  setRenameDraft('')
                  setRenameErr(null)
                }}
                className="pixel-btn bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:brightness-110"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="pixel-btn bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110"
              >
                ยืนยันเปลี่ยนชื่อ
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}
