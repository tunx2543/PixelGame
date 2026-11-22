'use client'

import { useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  Backpack,
  Check,
  Crown,
  Feather,
  GripHorizontal,
  Info,
  Layers,
  Maximize2,
  Minimize2,
  Minus,
  PawPrint,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  Shield,
  Sparkles,
  Star,
  Swords,
  Trash2,
  User,
  Weight,
  X,
  Zap,
} from 'lucide-react'
import { ITEMS, JOBS, expToNext, normalizeJobId, type EquipmentSlot, type JobDef } from '@/lib/game/data'
import {
  allocateStatPointsAction,
  applyLoadoutAction,
  availableJobs,
  canEquip,
  changeJob,
  closePanel,
  consumeItemWithFeedback,
  countItem,
  currentJob,
  ensurePremiumState,
  equip,
  equipCombatPet,
  equipFashionAction,
  getActiveAccountGameUid,
  getInventoryWeightSummary,
  getPlayerAttributeBreakdown,
  getQuickSlots,
  getStats,
  isCurrentAccountGm,
  itemLabel,
  itemPower,
  jobExpToNext,
  openPanel,
  rebirth,
  resetJobClassAction,
  resetSkillsAction,
  resetStatPointsAction,
  resetTalentsAction,
  resolvePlayerFashionLoadout,
  saveLoadoutAction,
  sellItem,
  setQuickSlot,
  socketRuneAction,
  toggleMountRiding,
  unequip,
  unequipAllFashionAction,
  updatePlayerAliasAction,
  upgradeSkillAction,
  upgradeTalentAction,
  type PlayerAttributes,
} from '@/lib/game/engine'
import {
  LIFE_SKILL_META,
  MAX_SKILL_UPGRADE,
  TALENT_BRANCH_META,
  TALENT_NODES,
  computeTalentBonuses,
  getActiveAsuraBoostSummary,
  sanitizeExtV2,
  skillUpgradeCost,
  type TalentBranch,
} from '@/lib/game/extended-systems'
import {
  EQUIPMENT_RARITY_META,
  formatAffixLabel,
  resolveEffectiveRarity,
} from '@/lib/game/mmo-systems'
import { PERMANENT_GM_GAME_UID } from '@/lib/game/permissions'
import {
  FASHION_CHARACTER_SLOTS,
  FASHION_SLOT_LABELS,
  PREMIUM_FASHION_ITEMS,
  getFashionItemDef,
} from '@/lib/game/premium/fashion-pet'
import { getEffectiveVipBonuses } from '@/lib/game/premium/vip'
import { RUNE_DEFS, computeCombatPower, computeEquipmentSetBonuses, sanitizeRpgExt } from '@/lib/game/rpg-systems'
import { isSfxMuted, playEnhanceSfx, playQuestClaimSfx } from '@/lib/game/sfx'
import type { Dir } from '@/lib/game/sprites'
import { getCombatPetDef, sanitizePetState } from '@/lib/game/systems'
import { useGame } from '@/lib/game/use-game'
import { getSkillIconPath, getSkillVfxSpec, resolveRebirthAuraSpec } from '@/lib/game/vfx-specs'
import { cn } from '@/lib/utils'
import { formatNum, formatPlayTime } from '../format'
import { GameArtIcon } from '../game-badge-icon'
import { ItemIcon, ItemSlot } from '../item-icon'
import { SkillVfxPreview } from '../skill-vfx-preview'
import { SpriteModelCanvas } from '../sprite-model-canvas'
import { useWindowContext } from '../window-context'
import { SpiritAwakeningSection } from './spirit-awakening-section'

export type AsuraHubTab = 'inventory' | 'status' | 'job' | 'skills' | 'training' | 'spirit'

const HUB_TABS: Array<{ id: AsuraHubTab; label: string }> = [
  { id: 'inventory', label: 'สัมภาระ' },
  { id: 'status', label: 'สถานะ' },
  { id: 'job', label: 'อาชีพ' },
  { id: 'skills', label: 'ทักษะ' },
  { id: 'training', label: 'ฝึกฝน' },
  { id: 'spirit', label: 'จิต' },
]

const TAB_TITLES: Record<AsuraHubTab, string> = {
  inventory: 'สัมภาระติดตัว',
  status: 'สถานะตัวละคร',
  job: 'สายอาชีพ',
  skills: 'ทักษะประจำอาชีพ',
  training: 'ฝึกฝน & พรสวรรค์',
  spirit: 'จิต & การจุติ',
}

type BagFilterId = 'all' | 'consumable' | 'equip' | 'material' | 'pet' | 'quest' | 'fashion'

const ATTR_LIST: Array<{ key: keyof PlayerAttributes; label: string; desc: string }> = [
  { key: 'str', label: 'STR', desc: 'เพิ่มพลังโจมตีกายภาพและน้ำหนักบรรทุก (+1.45 ATK / +18 MaxWeight)' },
  { key: 'vit', label: 'VIT', desc: 'เพิ่มพลังชีวิตสูงสุดและพลังป้องกัน (+18 HP / +0.85 DEF)' },
  { key: 'dex', label: 'DEX', desc: 'เพิ่มความแม่นยำ ดาเมจเสริม และคริติคอล (+0.9 ATK / +CRIT)' },
  { key: 'agi', label: 'AGI', desc: 'เพิ่มความเร็วการเคลื่อนที่และความเร็วโจมตี (+Speed / -AtkCD)' },
  { key: 'int', label: 'INT', desc: 'เพิ่ม MP สูงสุดและพลังโจมตีสายเวท (+6 MP / +1.6 Magic ATK)' },
  { key: 'luk', label: 'LUK', desc: 'เพิ่มโอกาสคริติคอลและโบนัสทองดรอป (+CRIT / +Gold%)' },
]

const DIRS: Dir[] = ['down', 'left', 'up', 'right']

const WEAPON_LABELS: Record<string, string> = {
  stick: 'ไม้พลอง',
  sword: 'ดาบ',
  staff: 'คทา / ไม้เท้า',
  bow: 'ธนู',
  dagger: 'มีด / กริช',
  axe: 'ขวาน / สนับมือ',
}

function AsuraMandalaWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -bottom-16 -left-14 size-72 select-none rounded-full border border-sky-400/10"
    >
      <div className="absolute inset-5 rounded-full border border-dashed border-sky-300/10" />
      <div className="absolute inset-12 rounded-full border border-amber-300/10" />
      <div className="absolute inset-20 rounded-full border border-sky-400/10 bg-[radial-gradient(circle,rgba(56,189,248,0.06)_0%,transparent_70%)]" />
    </div>
  )
}

export function AsuraCharacterHub({ initialTab = 'inventory' }: { initialTab?: AsuraHubTab }) {
  const g = useGame()
  const winCtx = useWindowContext()
  const [activeTab, setActiveTab] = useState<AsuraHubTab>(initialTab)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  // Inventory tab state
  const [leftInvSub, setLeftInvSub] = useState<'gear' | 'rune' | 'fashion'>('gear')
  const [bagFilter, setBagFilter] = useState<BagFilterId>('all')
  const [bagSearch, setBagSearch] = useState('')
  const [selectedBagUid, setSelectedBagUid] = useState<string | null>(null)
  const [selectedEqSlot, setSelectedEqSlot] = useState<EquipmentSlot | null>(null)
  const [previewDirIdx, setPreviewDirIdx] = useState(0)
  const [quickSellMode, setQuickSellMode] = useState(false)

  // Status tab state
  const [pendingStats, setPendingStats] = useState<Record<keyof PlayerAttributes, number>>({
    str: 0,
    vit: 0,
    dex: 0,
    agi: 0,
    int: 0,
    luk: 0,
  })
  const [editingAlias, setEditingAlias] = useState(false)
  const [aliasInput, setAliasInput] = useState('')
  const [statusSubView, setStatusSubView] = useState<'character' | 'combat' | 'buffs' | 'expiry'>('character')
  const [showStatFormulaInfo, setShowStatFormulaInfo] = useState(false)

  // Job tab state
  const [selectedTreeJobId, setSelectedTreeJobId] = useState<string | null>(null)

  // Skills tab state
  const [skillTierTab, setSkillTierTab] = useState<'novice' | 'tier1' | 'tier2' | 'special'>('tier1')
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [vfxNonce, setVfxNonce] = useState(0)

  // Training / Spirit tab state
  const [loadoutName, setLoadoutName] = useState('')
  const [selectedLoadoutIdx, setSelectedLoadoutIdx] = useState(0)
  const [rebirthPreviewTier, setRebirthPreviewTier] = useState<number | null>(null)

  const p = g.p
  const invFiltered = useMemo(() => {
    if (!p) return []
    const q = bagSearch.trim().toLowerCase()
    return p.inventory.filter((it) => {
      const def = ITEMS[it.itemId]
      if (!def) return false
      if (bagFilter === 'consumable' && def.kind !== 'consumable') return false
      if (bagFilter === 'equip' && def.kind !== 'weapon' && def.kind !== 'armor') return false
      if (bagFilter === 'material' && def.kind !== 'material') return false
      if (
        bagFilter === 'quest' &&
        !['earth_core', 'ember_core', 'abyss_crystal', 'demon_horn', 'pet_essence', 'town_warp_tome', 'astral_bag_expansion'].includes(it.itemId)
      ) {
        return false
      }
      if (bagFilter === 'pet' && it.itemId !== 'pet_essence') return false
      if (q && !def.name.toLowerCase().includes(q) && !def.description.toLowerCase().includes(q)) return false
      return true
    })
  }, [p, bagFilter, bagSearch])

  if (!p) return null

  const job = currentJob()
  const stats = getStats(p)
  const attrBreakdown = getPlayerAttributeBreakdown(p)
  const weightSummary = getInventoryWeightSummary(p)
  const cp = computeCombatPower(p, stats)
  const extV2 = sanitizeExtV2(p.extV2)
  const rpgExt = sanitizeRpgExt(p.rpgExt)
  const prem = ensurePremiumState(p)
  const vipBonuses = getEffectiveVipBonuses(prem.vip)
  const petState = sanitizePetState(p.petState, p.ownedGemItems, p.equippedGemCompanion)
  const fashionLoadout = resolvePlayerFashionLoadout(p)
  const setBonus = computeEquipmentSetBonuses(p.equipment)
  const quickSlots = getQuickSlots()
  const boostSummary = getActiveAsuraBoostSummary(extV2)
  const statResetPotCount = countItem('stat_reset_potion')
  const skillResetPotCount = countItem('skill_reset_potion')
  const jobResetPotCount = countItem('job_reset_potion')

  const isGmDev = Boolean(p.gm && isCurrentAccountGm())
  const displayCid = isGmDev ? PERMANENT_GM_GAME_UID : (p.gameUid ?? getActiveAccountGameUid() ?? String(p.uid ?? '100001'))
  const jobLevel = Math.max(1, p.jobLevel ?? 1)
  const jobExp = Math.max(0, p.jobExp ?? 0)
  const jobExpMax = jobExpToNext(jobLevel)
  const levelExpMax = expToNext(p.level)
  const levelExpPct = p.level >= 99 ? 100 : Math.min(100, Math.round((p.exp / Math.max(1, levelExpMax)) * 1000) / 10)
  const jobExpPct = jobLevel >= 99 ? 100 : Math.min(100, Math.round((jobExp / Math.max(1, jobExpMax)) * 1000) / 10)

  const pendingTotal = Object.values(pendingStats).reduce((a, b) => a + b, 0)
  const remainingBonusPoints = Math.max(0, (p.statPoints ?? 0) - pendingTotal)

  const selectedBagItem = selectedBagUid ? p.inventory.find((i) => i.uid === selectedBagUid) ?? null : null
  const selectedBagDef = selectedBagItem ? ITEMS[selectedBagItem.itemId] : null
  const selectedEqItem = selectedEqSlot ? p.equipment[selectedEqSlot] : null
  const selectedEqDef = selectedEqItem ? ITEMS[selectedEqItem.itemId] : null
  const inspectedItem = selectedBagItem ?? selectedEqItem
  const inspectedDef = selectedBagDef ?? selectedEqDef
  const inspectedRarity = inspectedItem && inspectedDef ? resolveEffectiveRarity(inspectedItem, inspectedDef) : 'common'
  const inspectedRarityMeta = EQUIPMENT_RARITY_META[inspectedRarity]

  const treeJobId = selectedTreeJobId ?? normalizeJobId(p.jobId)
  const treeJob: JobDef = JOBS[treeJobId] ?? job
  const promoOptions = availableJobs()
  const canPromoteTreeJob = promoOptions.some((j) => j.id === treeJob.id)

  const skillTierJobs = useMemo(() => {
    if (skillTierTab === 'novice') return [JOBS.novice]
    if (skillTierTab === 'tier1') {
      const currentT1 = job.tier === 1 ? [job] : []
      const others = Object.values(JOBS).filter((j) => j.tier === 1 && j.id !== job.id)
      return [...currentT1, ...others]
    }
    if (skillTierTab === 'tier2') {
      const currentT2 = job.tier === 2 ? [job] : []
      const others = Object.values(JOBS).filter((j) => j.tier === 2 && j.id !== job.id)
      return [...currentT2, ...others]
    }
    return [job]
  }, [skillTierTab, job])

  const displayedSkillList = useMemo(() => {
    if (skillTierTab === 'novice') return JOBS.novice.skills.map((s) => ({ skill: s, ownerJob: JOBS.novice }))
    if (skillTierTab === 'special') return job.skills.map((s) => ({ skill: s, ownerJob: job }))
    const targetJob = skillTierJobs.find((j) => j.id === job.id) ?? skillTierJobs[0] ?? job
    return targetJob.skills.map((s) => ({ skill: s, ownerJob: targetJob }))
  }, [skillTierTab, skillTierJobs, job])

  const activeSkillEntry =
    displayedSkillList.find((e) => e.skill.id === selectedSkillId) ?? displayedSkillList[0] ?? null
  const activeVfxSpec = activeSkillEntry
    ? getSkillVfxSpec(
        activeSkillEntry.skill.id,
        activeSkillEntry.skill.color,
        activeSkillEntry.skill.kind,
        activeSkillEntry.ownerJob.weaponTypes[0],
      )
    : null

  const activePetDef = petState.activePetId ? getCombatPetDef(petState.activePetId) : null

  const stageStatDelta = (key: keyof PlayerAttributes, amount: number) => {
    setPendingStats((prev) => {
      if (amount > 0) {
        const take = Math.min(amount, remainingBonusPoints)
        if (take <= 0) return prev
        return { ...prev, [key]: prev[key] + take }
      }
      return { ...prev, [key]: Math.max(0, prev[key] + amount) }
    })
  }

  const handleClose = () => {
    if (winCtx?.close) winCtx.close()
    else closePanel()
  }

  const tier1TreeJobs = ['swordsman', 'mage', 'archer', 'cleric', 'merchant', 'thief']
    .map((id) => JOBS[id])
    .filter(Boolean)
  const tier2TreeJobs = [
    'templar',
    'kensei',
    'iron_fist',
    'wicked_necromancer',
    'sinister',
    'mamushi',
    'the_king',
    'nekobaku',
  ]
    .map((id) => JOBS[id])
    .filter(Boolean)

  return (
    <section
      role="dialog"
      aria-label={TAB_TITLES[activeTab]}
      className="asura-panel relative flex h-full w-full flex-col overflow-hidden text-slate-100"
    >
      <AsuraMandalaWatermark />

      {/* Top Asura Header Bar */}
      <header
        onPointerDown={winCtx?.startDrag}
        className={cn(
          'relative z-10 flex items-center justify-between gap-2 border-b border-[#295596] bg-[#162336]/95 px-3 py-1.5',
          winCtx?.startDrag && 'cursor-grab select-none active:cursor-grabbing',
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-amber-400/80 bg-[#0d1522] shadow-inner">
            <SpriteModelCanvas
              mode="job"
              id={p.jobId}
              action="idle"
              dir="down"
              variant="portrait"
              size={30}
              showShadow={false}
              showAura={false}
              fashion={fashionLoadout}
              label={p.name}
            />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-bold text-amber-300">{p.name}</span>
              <span className="text-[10px] text-sky-300 tabular-nums">Lv.{p.level}</span>
            </div>
            <h2 className="truncate text-sm font-bold text-white sm:text-base">{TAB_TITLES[activeTab]}</h2>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {winCtx?.startDrag && (
            <GripHorizontal className="hidden size-4 text-slate-400 sm:block" aria-hidden />
          )}
          <div className="hidden items-center gap-2 rounded border border-[#2d4e80] bg-[#0f1724] px-2.5 py-1 text-[11px] tabular-nums sm:flex">
            <span className="flex items-center gap-1 font-semibold text-amber-300">
              <GameArtIcon iconId="gold-coin" size={14} />
              {formatNum(p.gold)}
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1 font-semibold text-sky-300">
              <GameArtIcon iconId="soul-gem" size={14} />
              {formatNum(p.diamonds ?? 0)}
            </span>
          </div>
          {winCtx?.minimize && (
            <button
              type="button"
              onClick={winCtx.minimize}
              aria-label="ย่อหน้าต่าง"
              className="rounded border border-slate-600/60 bg-[#1a283d] p-1 text-slate-300 hover:bg-[#243957] hover:text-white"
            >
              <Minus className="size-3.5" aria-hidden />
            </button>
          )}
          {winCtx?.toggleMaximize && !winCtx.isMobileSheet && (
            <button
              type="button"
              onClick={winCtx.toggleMaximize}
              aria-label={winCtx.maximized ? 'คืนขนาด' : 'ขยาย'}
              className="rounded border border-slate-600/60 bg-[#1a283d] p-1 text-slate-300 hover:bg-[#243957] hover:text-white"
            >
              {winCtx.maximized ? <Minimize2 className="size-3.5" aria-hidden /> : <Maximize2 className="size-3.5" aria-hidden />}
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            aria-label="ปิดหน้าต่าง (Esc)"
            className="rounded border border-rose-400/50 bg-rose-600/80 p-1 text-white hover:bg-rose-500"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className={cn(
            'relative z-10 mx-3 mt-2 flex items-center justify-between gap-2 rounded border px-3 py-1.5 text-xs font-medium',
            notice.ok
              ? 'border-emerald-400/40 bg-emerald-950/70 text-emerald-200'
              : 'border-rose-400/40 bg-rose-950/70 text-rose-200',
          )}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="ซ่อนข้อความ"
            className="text-current/70 hover:text-current"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      )}

      {/* Body: Left 6-Tab Vertical Rail + Right Workspace */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-2.5 p-2.5 sm:flex-row sm:p-3">
        {/* Vertical Rail (horizontal scroll strip on small mobile) */}
        <nav
          aria-label="เมนูตัวละคร"
          className="flex shrink-0 gap-1.5 overflow-x-auto pb-1 sm:w-24 sm:flex-col sm:overflow-visible sm:pb-0"
        >
          {HUB_TABS.map((t) => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id)
                  setNotice(null)
                }}
                aria-pressed={active}
                className={cn(
                  'shrink-0 px-3 py-2.5 text-center text-xs font-bold whitespace-nowrap transition-all sm:w-full',
                  active ? 'asura-tab-active' : 'asura-tab',
                )}
              >
                {t.label}
              </button>
            )
          })}
        </nav>

        {/* Main Content Pane */}
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-[#26446e]/80 bg-[#0e1520]/80 p-2.5 sm:p-3">
          {/* ================= TAB 1: INVENTORY & GEAR ================= */}
          {activeTab === 'inventory' && (
            <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[17.5rem_1fr]">
              {/* Left Column: Paper-doll + Inspect Detail */}
              <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      ['gear', 'อุปกรณ์'],
                      ['rune', 'รูน'],
                      ['fashion', 'แฟชั่น'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setLeftInvSub(id)}
                      className={cn(
                        'py-1.5 text-xs font-bold',
                        leftInvSub === id ? 'asura-tab-active' : 'asura-tab',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {leftInvSub === 'gear' && (
                  <div className="rounded-lg border border-[#28456e] bg-[#121c2b]/90 p-2.5">
                    <div className="grid grid-cols-[3rem_1fr_3rem] items-center gap-2">
                      {/* Left gear column */}
                      <div className="flex flex-col gap-1.5">
                        {(['armor', 'shoes'] as EquipmentSlot[]).map((slot) => {
                          const it = p.equipment[slot]
                          const selected = selectedEqSlot === slot && !selectedBagUid
                          const romanTier = it ? ['I', 'II', 'III', 'IV'][Math.min(3, Math.max(0, (ITEMS[it.itemId]?.tier ?? 1) - 1))] : null
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                setSelectedBagUid(null)
                                setSelectedEqSlot(slot)
                              }}
                              title={it ? itemLabel(it) : slot}
                              className={cn(
                                'relative rounded border p-0.5 transition-colors',
                                selected
                                  ? 'border-amber-400 bg-amber-500/15'
                                  : 'border-[#2e4b76] bg-[#172336] hover:border-sky-400',
                              )}
                            >
                              <ItemSlot item={it} label={slot === 'armor' ? 'เกราะ' : 'เท้า'} />
                              {romanTier && (
                                <span className="pointer-events-none absolute left-0.5 top-0.5 rounded bg-slate-950/85 px-1 text-[8.5px] font-black text-sky-300">
                                  {romanTier}
                                </span>
                              )}
                              {it && it.plus > 0 && (
                                <span className="absolute -right-1 -top-1 rounded bg-amber-500 px-1 text-[9px] font-bold text-slate-950 tabular-nums">
                                  +{it.plus}
                                </span>
                              )}
                            </button>
                          )
                        })}
                        {/* Pet slot */}
                        <button
                          type="button"
                          onClick={() => openPanel('pets')}
                          title={activePetDef ? `ผอบ: ${activePetDef.name}` : 'เปิดหน้าต่างผอบ/สัตว์เลี้ยง'}
                          className="relative flex aspect-square flex-col items-center justify-center rounded border border-pink-400/50 bg-[#1a2033] text-[9px] text-pink-200 hover:border-pink-300"
                        >
                          {activePetDef && (
                            <span className="absolute -right-1 -top-1 rounded bg-amber-400 px-1 text-[8.5px] font-black text-slate-950">
                              S
                            </span>
                          )}
                          <PawPrint className="size-4 text-pink-300" aria-hidden />
                          <span className="mt-0.5 max-w-full truncate px-0.5">
                            {activePetDef ? activePetDef.name.slice(0, 5) : 'ผอบ'}
                          </span>
                        </button>
                      </div>

                      {/* Center Rotatable Hero Preview */}
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewDirIdx((d) => (d + 3) % 4)}
                            aria-label="หมุนตัวละครซ้าย"
                            className="rounded border border-[#2c4b76] bg-[#172336] p-1 text-slate-300 hover:text-white"
                          >
                            <RotateCcw className="size-3" aria-hidden />
                          </button>
                          <div className="grid size-24 place-items-center rounded-lg border border-[#264166] bg-radial from-[#1b2d47] to-[#0d1420]">
                            <SpriteModelCanvas
                              mode="job"
                              id={p.jobId}
                              action="auto"
                              dir={DIRS[previewDirIdx]}
                              weaponOverride={p.equipment.weapon ? ITEMS[p.equipment.weapon.itemId]?.weaponType : undefined}
                              weaponColorOverride={p.equipment.weapon ? ITEMS[p.equipment.weapon.itemId]?.color : undefined}
                              fashion={fashionLoadout}
                              size={84}
                              isGm={p.gm}
                              rebirthCount={p.rebirthCount ?? 0}
                              spiritStage={extV2.spiritAwakening?.awakeningStage ?? 0}
                              label={p.name}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewDirIdx((d) => (d + 1) % 4)}
                            aria-label="หมุนตัวละครขวา"
                            className="rounded border border-[#2c4b76] bg-[#172336] p-1 text-slate-300 hover:text-white"
                          >
                            <RotateCw className="size-3" aria-hidden />
                          </button>
                        </div>
                        <div className="flex gap-1">
                          {(['weapon', 'accessory'] as EquipmentSlot[]).map((slot) => {
                            const it = p.equipment[slot]
                            const selected = selectedEqSlot === slot && !selectedBagUid
                            const romanTier = it ? ['I', 'II', 'III', 'IV'][Math.min(3, Math.max(0, (ITEMS[it.itemId]?.tier ?? 1) - 1))] : null
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => {
                                  setSelectedBagUid(null)
                                  setSelectedEqSlot(slot)
                                }}
                                title={it ? itemLabel(it) : slot}
                                className={cn(
                                  'relative w-10 rounded border p-0.5',
                                  selected
                                    ? 'border-amber-400 bg-amber-500/15'
                                    : 'border-[#2e4b76] bg-[#172336] hover:border-sky-400',
                                )}
                              >
                                <ItemSlot item={it} label={slot === 'weapon' ? 'อาวุธ' : 'แหวน'} />
                                {romanTier && (
                                  <span className="pointer-events-none absolute left-0.5 top-0.5 rounded bg-slate-950/85 px-1 text-[8px] font-black text-sky-300">
                                    {romanTier}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Right gear column */}
                      <div className="flex flex-col gap-1.5">
                        {(['cloak'] as EquipmentSlot[]).map((slot) => {
                          const it = p.equipment[slot]
                          const selected = selectedEqSlot === slot && !selectedBagUid
                          const romanTier = it ? ['I', 'II', 'III', 'IV'][Math.min(3, Math.max(0, (ITEMS[it.itemId]?.tier ?? 1) - 1))] : null
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                setSelectedBagUid(null)
                                setSelectedEqSlot(slot)
                              }}
                              title={it ? itemLabel(it) : 'ผ้าคลุม'}
                              className={cn(
                                'relative rounded border p-0.5',
                                selected
                                  ? 'border-amber-400 bg-amber-500/15'
                                  : 'border-[#2e4b76] bg-[#172336] hover:border-sky-400',
                              )}
                            >
                              <ItemSlot item={it} label="คลุม" />
                              {romanTier && (
                                <span className="pointer-events-none absolute left-0.5 top-0.5 rounded bg-slate-950/85 px-1 text-[8.5px] font-black text-sky-300">
                                  {romanTier}
                                </span>
                              )}
                            </button>
                          )
                        })}
                        <button
                          type="button"
                          onClick={() => openPanel('enhance')}
                          title="ตีบวกอุปกรณ์"
                          className="flex aspect-square flex-col items-center justify-center rounded border border-amber-500/40 bg-[#1a2434] text-[9px] text-amber-300 hover:border-amber-300"
                        >
                          <Sparkles className="size-3.5" aria-hidden />
                          <span>ตีบวก</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeftInvSub('fashion')}
                          title="แฟชั่น & ปีก"
                          className="flex aspect-square flex-col items-center justify-center rounded border border-dashed border-slate-500/70 bg-[#141d2b] text-slate-300 hover:border-sky-400 hover:text-white"
                        >
                          <Plus className="size-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {leftInvSub === 'rune' && (
                  <div className="space-y-1.5 rounded-lg border border-[#28456e] bg-[#121c2b]/90 p-2.5 text-xs">
                    <p className="font-bold text-sky-300">รูนประจำอุปกรณ์</p>
                    {(['weapon', 'armor', 'shoes', 'cloak', 'accessory'] as EquipmentSlot[]).map((slot) => {
                      const runeId = rpgExt.equippedRunes[slot]
                      const runeDef = runeId ? RUNE_DEFS[runeId] ?? null : null
                      const ownedRunes = Object.entries(rpgExt.runeBag).filter(([, qty]) => qty > 0)
                      return (
                        <div key={slot} className="flex items-center justify-between gap-2 rounded border border-[#22395a] bg-[#0e1623] px-2 py-1">
                          <span className="text-[11px] text-slate-300">{slot}</span>
                          <select
                            aria-label={`รูนช่อง ${slot}`}
                            value={runeId ?? ''}
                            onChange={(e) => {
                              const res = socketRuneAction(slot, e.target.value || null)
                              setNotice({ ok: res.ok, text: res.message })
                            }}
                            className="max-w-[9.5rem] rounded border border-[#2d4d7a] bg-[#162336] px-1.5 py-0.5 text-[10px] text-slate-100"
                          >
                            <option value="">{runeDef ? runeDef.name : '- ว่าง -'}</option>
                            {ownedRunes.map(([id, qty]) => {
                              const r = RUNE_DEFS[id]
                              return (
                                <option key={id} value={id}>
                                  {r?.name ?? id} ({qty})
                                </option>
                              )
                            })}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                )}

                {leftInvSub === 'fashion' && (
                  <div className="space-y-2 rounded-lg border border-[#28456e] bg-[#121c2b]/90 p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-300">แฟชั่นสวมใส่</span>
                      <button
                        type="button"
                        onClick={() => {
                          const res = unequipAllFashionAction()
                          setNotice({ ok: res.ok, text: res.message })
                        }}
                        className="rounded border border-rose-400/40 bg-rose-950/50 px-2 py-0.5 text-[10px] text-rose-200 hover:bg-rose-900/60"
                      >
                        ถอดทั้งหมด
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {FASHION_CHARACTER_SLOTS.map((fSlot) => {
                        const eqId = fashionLoadout[fSlot]
                        const eqDef = eqId ? getFashionItemDef(eqId) : null
                        const ownedInSlot = PREMIUM_FASHION_ITEMS.filter(
                          (f) =>
                            f.slot === fSlot &&
                            (prem.fashion.unlockedIds.includes(f.id) ||
                              (vipBonuses.active && vipBonuses.exclusiveFashionIds.includes(f.id)) ||
                              Boolean(f.freeStarter)),
                        )
                        return (
                          <div key={fSlot} className="rounded border border-[#243d61] bg-[#0e1623] p-1.5">
                            <p className="text-[10px] text-slate-400">{FASHION_SLOT_LABELS[fSlot]}</p>
                            <select
                              aria-label={FASHION_SLOT_LABELS[fSlot]}
                              value={eqId ?? ''}
                              onChange={(e) => {
                                const res = equipFashionAction(fSlot, e.target.value || null)
                                setNotice({ ok: res.ok, text: res.message })
                              }}
                              className="mt-0.5 w-full rounded border border-[#2c4b76] bg-[#162336] px-1 py-0.5 text-[10px] text-slate-100"
                            >
                              <option value="">{eqDef ? eqDef.name : '- ไม่มี -'}</option>
                              {ownedInSlot.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleMountRiding()}
                      className="w-full rounded border border-sky-400/40 bg-[#182942] py-1.5 text-[11px] font-bold text-sky-200 hover:brightness-110"
                    >
                      สลับขี่สัตว์พาหนะ / เปิดแฟชั่นปีก
                    </button>
                  </div>
                )}

                {/* Bottom Selected Item Card ("ไม่มีข้อมูล" when empty) */}
                <div className="flex min-h-[9.5rem] flex-1 flex-col justify-between rounded-lg border border-[#28456e] bg-[#111926]/95 p-2.5 text-xs">
                  {!inspectedItem || !inspectedDef ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                      <p className="font-semibold">ไม่มีข้อมูล</p>
                      <p className="mt-0.5 text-[10px]">คลิกไอเทมในกระเป๋าหรือช่องสวมใส่</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <div className="flex items-start gap-2">
                          <div className="grid size-10 shrink-0 place-items-center rounded border border-[#2d4e80] bg-[#172336]">
                            <ItemIcon itemId={inspectedItem.itemId} size={28} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={cn('truncate font-bold', inspectedRarityMeta.textColorClass)}>
                              {itemLabel(inspectedItem)}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Lv.{inspectedDef.reqLevel ?? 1} · {inspectedRarityMeta.thaiLabel}
                              {inspectedDef.kind === 'weapon' || inspectedDef.kind === 'armor'
                                ? ` · พลัง ${itemPower(inspectedItem)}`
                                : ''}
                            </p>
                          </div>
                        </div>
                        <p className="line-clamp-2 text-[11px] leading-snug text-slate-300">
                          {inspectedDef.description}
                        </p>
                        {inspectedItem.affixes && inspectedItem.affixes.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {inspectedItem.affixes.map((af, idx) => (
                              <span
                                key={idx}
                                className="rounded bg-sky-950/80 px-1.5 py-0.5 text-[9.5px] text-sky-300"
                              >
                                {formatAffixLabel(af)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedBagItem && (inspectedDef.kind === 'weapon' || inspectedDef.kind === 'armor') && (
                          <button
                            type="button"
                            disabled={Boolean(canEquip(selectedBagItem))}
                            onClick={() => {
                              const err = canEquip(selectedBagItem)
                              if (err) {
                                setNotice({ ok: false, text: err })
                                return
                              }
                              equip(selectedBagItem.uid)
                              setSelectedBagUid(null)
                            }}
                            className="asura-tab-active px-2.5 py-1 text-[11px] font-bold disabled:opacity-40"
                          >
                            {canEquip(selectedBagItem) ?? 'สวมใส่'}
                          </button>
                        )}
                        {selectedBagItem && inspectedDef.kind === 'consumable' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const uid = selectedBagItem.uid
                                const res = consumeItemWithFeedback(uid)
                                setNotice({ ok: res.ok, text: res.message })
                                if (!p.inventory.some((i) => i.uid === uid)) setSelectedBagUid(null)
                              }}
                              className="asura-tab-active px-2.5 py-1 text-[11px] font-bold"
                            >
                              ใช้งาน
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const idx = Math.max(0, quickSlots.findIndex((x) => !x))
                                setQuickSlot(idx, selectedBagItem.itemId)
                                setNotice({ ok: true, text: `ใส่ ${inspectedDef.name} ลงช่องด่วน ${idx + 1} แล้ว` })
                              }}
                              className="asura-tab px-2 py-1 text-[11px]"
                            >
                              + ช่องด่วน
                            </button>
                          </>
                        )}
                        {selectedBagItem && quickSellMode && (
                          <button
                            type="button"
                            onClick={() => {
                              sellItem(selectedBagItem.uid, 1)
                              setSelectedBagUid(null)
                              setNotice({ ok: true, text: `ขาย ${inspectedDef.name} x1 แล้ว` })
                            }}
                            className="rounded border border-rose-400/50 bg-rose-700/80 px-2.5 py-1 text-[11px] font-bold text-white"
                          >
                            ขาย 1 ชิ้น
                          </button>
                        )}
                        {selectedEqSlot && selectedEqItem && !selectedBagItem && (
                          <button
                            type="button"
                            onClick={() => {
                              unequip(selectedEqSlot)
                              setSelectedEqSlot(null)
                            }}
                            className="rounded border border-amber-400/50 bg-amber-700/70 px-2.5 py-1 text-[11px] font-bold text-white"
                          >
                            ถอดออก
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: 7 Asura Filter Tabs + Item Grid + Currencies + Weight Footer */}
              <div className="flex min-h-0 flex-col gap-2">
                <div className="grid grid-cols-7 gap-1">
                  {(
                    [
                      ['all', 'ALL', null],
                      ['consumable', 'ยา', Sparkles],
                      ['equip', 'อาวุธ', Swords],
                      ['material', 'แร่', Layers],
                      ['pet', 'สัตว์', PawPrint],
                      ['quest', 'พิเศษ', Star],
                      ['fashion', 'ขนนก', Feather],
                    ] as const
                  ).map(([id, text, Icon]) => {
                    const active = bagFilter === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setBagFilter(id)}
                        title={text}
                        className={cn(
                          'flex items-center justify-center py-1.5 text-[11px] font-extrabold',
                          active ? 'asura-tab-active' : 'asura-tab',
                        )}
                      >
                        {Icon ? <Icon className="size-4" aria-hidden /> : <span>{text}</span>}
                      </button>
                    )
                  })}
                </div>

                {/* Bag Grid */}
                <div className="min-h-[14rem] flex-1 overflow-y-auto rounded-lg border border-[#264166] bg-[#0b111b]/95 p-2">
                  {invFiltered.length === 0 ? (
                    <div className="flex h-40 flex-col items-center justify-center text-xs text-slate-500">
                      <Backpack className="mb-1 size-6 opacity-50" aria-hidden />
                      ไม่มีไอเทมในหมวดนี้
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-9">
                      {invFiltered.map((it) => {
                        const def = ITEMS[it.itemId]
                        const selected = selectedBagUid === it.uid
                        const rarity = def ? resolveEffectiveRarity(it, def) : 'common'
                        const rMeta = EQUIPMENT_RARITY_META[rarity]
                        return (
                          <button
                            key={it.uid}
                            type="button"
                            onClick={() => {
                              setSelectedEqSlot(null)
                              setSelectedBagUid(it.uid)
                            }}
                            title={itemLabel(it)}
                            className={cn(
                              'relative flex aspect-square items-center justify-center rounded border bg-[#142033] p-1 transition-all hover:brightness-110',
                              selected
                                ? 'border-amber-400 ring-1 ring-amber-400/70'
                                : rarity !== 'common'
                                  ? rMeta.borderColorClass
                                  : 'border-[#27436b]',
                            )}
                          >
                            <ItemIcon itemId={it.itemId} size={30} />
                            {it.qty > 1 && (
                              <span className="absolute bottom-0.5 right-1 rounded bg-black/70 px-1 text-[9.5px] font-bold text-white tabular-nums">
                                {it.qty}
                              </span>
                            )}
                            {it.plus > 0 && (
                              <span className="absolute left-0.5 top-0.5 rounded bg-amber-500 px-1 text-[8.5px] font-bold text-slate-950 tabular-nums">
                                +{it.plus}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Currencies Row */}
                <div className="flex flex-wrap items-center justify-end gap-5 rounded border border-[#233d60] bg-[#111a28] px-3 py-1.5 text-xs tabular-nums">
                  <span className="flex items-center gap-1.5 font-bold text-amber-300">
                    <GameArtIcon iconId="gold-coin" size={14} />
                    {formatNum(p.gold)}
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-cyan-200">
                    <GameArtIcon iconId="soul-gem" size={14} />
                    {formatNum(p.diamonds ?? 0)}
                  </span>
                </div>

                {/* Search + Action Bar */}
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-1.5">
                  <label className="relative flex items-center">
                    <Search className="pointer-events-none absolute left-2.5 size-3.5 text-slate-400" aria-hidden />
                    <input
                      type="text"
                      value={bagSearch}
                      onChange={(e) => setBagSearch(e.target.value)}
                      placeholder="ค้นหาไอเทม..."
                      className="w-full rounded border border-[#2d4e80] bg-[#162336] py-1.5 pl-8 pr-2 text-xs text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedBagItem && selectedBagDef?.kind === 'consumable') {
                        const uid = selectedBagItem.uid
                        const res = consumeItemWithFeedback(uid)
                        setNotice({ ok: res.ok, text: res.message })
                        if (!p.inventory.some((i) => i.uid === uid)) setSelectedBagUid(null)
                      } else if (selectedBagItem && (selectedBagDef?.kind === 'weapon' || selectedBagDef?.kind === 'armor')) {
                        const err = canEquip(selectedBagItem)
                        if (err) setNotice({ ok: false, text: err })
                        else equip(selectedBagItem.uid)
                      } else {
                        openPanel('storage')
                      }
                    }}
                    className="asura-tab px-4 py-1.5 text-xs font-bold whitespace-nowrap"
                  >
                    {selectedBagItem ? 'ใช้งาน / สวมใส่' : 'เปิดคลังเก็บของ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSellMode((v) => !v)}
                    aria-pressed={quickSellMode}
                    title="โหมดขายไอเทม"
                    className={cn(
                      'rounded border px-2.5 py-1.5',
                      quickSellMode
                        ? 'border-rose-400 bg-rose-700/80 text-white'
                        : 'border-[#2d4e80] bg-[#162336] text-slate-300 hover:text-white',
                    )}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>

                {/* Slots & Weight Footer */}
                <div className="flex items-center justify-between px-1 text-xs font-semibold text-slate-200 tabular-nums">
                  <span className="flex items-center gap-1.5">
                    <Backpack className="size-4 text-amber-400" aria-hidden />
                    <span>
                      {weightSummary.slotsUsed} / {weightSummary.slotsMax}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Weight className="size-4 text-slate-300" aria-hidden />
                    <span>
                      {weightSummary.usedWeight.toLocaleString('en-US', { minimumFractionDigits: 1 })} /{' '}
                      {weightSummary.maxWeight.toLocaleString('en-US', { minimumFractionDigits: 1 })} [
                      {weightSummary.pct.toFixed(1)}%]
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: CHARACTER STATUS ================= */}
          {activeTab === 'status' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
              {/* Left: STR / VIT / DEX / AGI / INT / LUK */}
              <div className="flex flex-col justify-between gap-2 rounded-lg border border-[#254068] bg-[#111a28]/90 p-3">
                <div className="space-y-1.5">
                  {ATTR_LIST.map(({ key, label, desc }) => {
                    const baseVal = attrBreakdown.base[key]
                    const bonusVal = attrBreakdown.bonus[key]
                    const pendingVal = pendingStats[key]
                    return (
                      <div
                        key={key}
                        title={desc}
                        className="grid grid-cols-[3.4rem_3.4rem_4rem_1fr_auto] items-center gap-2 rounded border border-[#1f3554] bg-[#0d1521]/90 px-2.5 py-1.5 text-xs"
                      >
                        <span className="font-extrabold tracking-wide text-white">{label}</span>
                        <span className="text-right font-bold text-amber-400 tabular-nums">
                          {baseVal}
                          {pendingVal > 0 && <span className="text-emerald-400">+{pendingVal}</span>}
                        </span>
                        <span className="font-bold text-sky-400 tabular-nums">+ {bonusVal}</span>
                        <span className="hidden truncate text-[10px] text-slate-400 xl:block">
                          รวม {baseVal + bonusVal + pendingVal}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={pendingVal <= 0}
                            onClick={() => stageStatDelta(key, -1)}
                            aria-label={`ลด ${label}`}
                            className="asura-tab grid size-7 place-items-center text-sm font-bold disabled:opacity-35"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            disabled={remainingBonusPoints <= 0}
                            onClick={(e) => stageStatDelta(key, e.shiftKey ? 5 : 1)}
                            aria-label={`เพิ่ม ${label}`}
                            className="asura-tab grid size-7 place-items-center text-sm font-bold disabled:opacity-35"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Bonus Points & Confirm / Cancel / Info / Reset */}
                <div className="space-y-2 border-t border-[#254068] pt-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-bold text-slate-300">โบนัส</span>
                      <span
                        className={cn(
                          'text-sm font-extrabold tabular-nums',
                          remainingBonusPoints > 0 ? 'text-emerald-400' : 'text-slate-400',
                        )}
                      >
                        {remainingBonusPoints}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={pendingTotal === 0}
                        onClick={() =>
                          setPendingStats({ str: 0, vit: 0, dex: 0, agi: 0, int: 0, luk: 0 })
                        }
                        className="asura-tab px-3 py-1.5 text-xs font-bold disabled:opacity-40"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        disabled={pendingTotal === 0}
                        onClick={() => {
                          const res = allocateStatPointsAction(pendingStats)
                          setNotice({ ok: res.ok, text: res.message })
                          if (res.ok) {
                            setPendingStats({ str: 0, vit: 0, dex: 0, agi: 0, int: 0, luk: 0 })
                            playEnhanceSfx(true, isSfxMuted())
                          }
                        }}
                        className="asura-tab-active px-3.5 py-1.5 text-xs font-bold disabled:opacity-40"
                      >
                        ยืนยัน
                      </button>
                    </div>
                  </div>

                  <p className="text-center text-[10px] text-slate-400">
                    กด Shift + ปุ่มบวก เพื่ออัปทีละ 5 แต้ม · ค่าสถานะส่งผลต่อ HP / ATK / DEF / SPD / CRIT ทันที
                  </p>

                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowStatFormulaInfo((v) => !v)}
                      aria-label="ดูรายละเอียดสูตรค่าสถานะ"
                      className="asura-tab flex items-center gap-1 px-4 py-1.5 text-xs font-bold"
                    >
                      <Info className="size-3.5 text-sky-300" aria-hidden />
                      ข้อมูล
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const res = resetStatPointsAction()
                        setNotice({ ok: res.ok, text: res.message })
                      }}
                      className="asura-tab px-5 py-1.5 text-xs font-bold text-amber-200"
                    >
                      {statResetPotCount > 0 ? `ล้าง (น้ำยาหวนกลับ x${statResetPotCount})` : 'ล้าง (500 G)'}
                    </button>
                  </div>

                  {showStatFormulaInfo && (
                    <div className="rounded border border-sky-400/30 bg-sky-950/40 p-2 text-[10.5px] text-sky-100">
                      {ATTR_LIST.map((a) => (
                        <p key={a.key}>
                          <b className="text-amber-300">{a.label}:</b> {a.desc}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Race/Class/Rebirth + Avatar + EXP/JP Bars + Alias + 4 Sub-views */}
              <div className="flex flex-col justify-between gap-2.5 rounded-lg border border-[#254068] bg-[#111a28]/90 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <GameArtIcon iconId="race-human" size={20} />
                      <span className="font-semibold text-slate-200">เผ่ามนุษย์</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GameArtIcon iconId="class-star" size={20} />
                      <span className="font-semibold text-amber-300">{job.name}</span>
                      <span
                        className={cn(
                          'rounded border px-1.5 py-0.5 text-[9.5px] font-bold',
                          job.ranged
                            ? 'border-sky-400/50 bg-sky-500/15 text-sky-300'
                            : 'border-rose-400/50 bg-rose-500/15 text-rose-300',
                        )}
                      >
                        {job.ranged ? `ตีไกล · ${job.range}px` : `ตีใกล้ · ${job.range}px`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(extV2.spiritAwakening?.awakeningStage ?? 0) > 0 && (
                      <span className="flex items-center gap-1 rounded border border-cyan-400/50 bg-cyan-950/60 px-2 py-0.5 text-xs font-bold text-cyan-200 tabular-nums">
                        <GameArtIcon iconId="spirit" size={14} />
                        จิต {extV2.spiritAwakening?.awakeningStage}
                      </span>
                    )}
                    <span className="flex items-center gap-1 rounded border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-300 tabular-nums">
                      <Crown className="size-3.5" aria-hidden />
                      จุติ {p.rebirthCount ?? 0}
                    </span>
                  </div>
                </div>

                {/* Middle Sub-view Switch */}
                {statusSubView === 'character' && (
                  <div className="flex flex-col items-center gap-1.5 py-1">
                    <div className="grid size-24 place-items-center rounded-xl border border-[#294874] bg-radial from-[#1b2e4a] to-[#0b121d]">
                      <SpriteModelCanvas
                        mode="job"
                        id={p.jobId}
                        action="auto"
                        dir="down"
                        size={86}
                        fashion={fashionLoadout}
                        isGm={p.gm}
                        rebirthCount={p.rebirthCount ?? 0}
                        spiritStage={extV2.spiritAwakening?.awakeningStage ?? 0}
                        label={p.name}
                      />
                    </div>
                    <p className="text-xs font-bold text-white tabular-nums">
                      {p.name} <span className="text-slate-400">(cid:{displayCid})</span>
                    </p>
                  </div>
                )}

                {statusSubView === 'combat' && (
                  <div className="grid grid-cols-2 gap-1.5 rounded border border-[#233d62] bg-[#0b121e] p-2.5 text-xs tabular-nums">
                    <div>พลังรบ (CP): <b className="text-amber-300">{formatNum(cp)}</b></div>
                    <div>ระยะโจมตี: <b className={job.ranged ? 'text-sky-300' : 'text-rose-300'}>{job.ranged ? `ตีไกล ${job.range}px` : `ตีใกล้ ${job.range}px`}</b></div>
                    <div>HP สูงสุด: <b className="text-emerald-300">{formatNum(stats.maxHp)}</b></div>
                    <div>MP สูงสุด: <b className="text-sky-300">{formatNum(stats.maxMp)}</b></div>
                    <div>ATK: <b className="text-rose-300">{formatNum(stats.atk)}</b></div>
                    <div>DEF: <b className="text-indigo-300">{formatNum(stats.def)}</b></div>
                    <div>CRIT: <b className="text-amber-200">{Math.round(stats.crit * 100)}%</b></div>
                    <div>SOUL CRIT: <b className="text-fuchsia-300">{((stats.soulCritChance ?? 0) * 100).toFixed(1)}% (x{(stats.soulCritMult ?? 2).toFixed(2)})</b></div>
                    <div>ความเร็ว: <b className="text-cyan-300">{Math.round(stats.speed)}</b></div>
                    <div>ดูดเลือด: <b className="text-pink-300">{(stats.lifestealPct * 100).toFixed(1)}%</b></div>
                    <div>สังหาร: <b className="text-slate-200">{formatNum(p.kills)}</b></div>
                    <div>เวลาเล่น: <b className="text-slate-300">{formatPlayTime(p.playTime)}</b></div>
                  </div>
                )}

                {statusSubView === 'buffs' && (
                  <div className="max-h-36 space-y-1.5 overflow-y-auto rounded border border-[#233d62] bg-[#0b121e] p-2.5 text-xs">
                    <p className="font-bold text-sky-300">บัฟที่เปิดใช้งานอยู่</p>
                    <div className="grid gap-1 text-[11px]">
                      <div className="flex justify-between">
                        <span>VIP Advantage</span>
                        <b className={vipBonuses.active ? 'text-amber-300' : 'text-slate-500'}>
                          {vipBonuses.active
                            ? `${vipBonuses.tierDef?.badgeLabel ?? `VIP ${vipBonuses.level}`} (+EXP ${vipBonuses.expBonusPct}%)`
                            : 'ไม่มี'}
                        </b>
                      </div>
                      <div className="flex justify-between">
                        <span>บัฟอาหาร</span>
                        <b className="text-emerald-300">
                          {extV2.activeFoodBuff && extV2.activeFoodBuff.expiresAtMs > Date.now()
                            ? extV2.activeFoodBuff.name
                            : 'ไม่มี'}
                        </b>
                      </div>
                      {boostSummary.activeList.map((b) => (
                        <div key={b.id} className="flex justify-between">
                          <span>{b.label}</span>
                          <b className="text-amber-300 tabular-nums">
                            {b.kind === 'weight' ? `+${b.value} น้ำหนัก` : `+${b.value}%`}
                          </b>
                        </div>
                      ))}
                      <div className="flex justify-between">
                        <span>โบนัสเซ็ตอุปกรณ์</span>
                        <b className="text-sky-300">{setBonus.activeLabels.length} เซ็ต</b>
                      </div>
                      <div className="flex justify-between">
                        <span>โบนัสกิลด์</span>
                        <b className="text-indigo-300">{rpgExt.guildName || 'ไม่มีกิลด์'}</b>
                      </div>
                    </div>
                  </div>
                )}

                {statusSubView === 'expiry' && (
                  <div className="max-h-36 space-y-1.5 overflow-y-auto rounded border border-[#233d62] bg-[#0b121e] p-2.5 text-xs tabular-nums">
                    <p className="font-bold text-amber-300">เวลาคงเหลือสิทธิพิเศษ & ยาเสริมพลัง</p>
                    <div className="flex justify-between text-[11px]">
                      <span>VIP Pass</span>
                      <b>
                        {vipBonuses.active
                          ? `เหลืออีก ${Math.max(1, Math.ceil(((prem.vip.expiresAtMs ?? Date.now()) - Date.now()) / 86400000))} วัน`
                          : 'หมดอายุ / ยังไม่เปิดใช้'}
                      </b>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>แม่เหล็กดูดของ</span>
                      <b>
                        {(p.lootMagnetUntil ?? 0) > Date.now()
                          ? `${Math.ceil(((p.lootMagnetUntil ?? 0) - Date.now()) / 60000)} นาที`
                          : 'ไม่ได้เปิดใช้'}
                      </b>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>บัฟอาหาร</span>
                      <b>
                        {extV2.activeFoodBuff && extV2.activeFoodBuff.expiresAtMs > Date.now()
                          ? `${Math.ceil((extV2.activeFoodBuff.expiresAtMs - Date.now()) / 60000)} นาที`
                          : 'ไม่มี'}
                      </b>
                    </div>
                    {boostSummary.activeList.map((b) => {
                      const remSec = Math.max(1, Math.ceil((b.expiresAtMs - Date.now()) / 1000))
                      const remLabel = remSec >= 60 ? `${Math.ceil(remSec / 60)} นาที` : `${remSec} วินาที`
                      return (
                        <div key={b.id} className="flex justify-between text-[11px]">
                          <span className="text-sky-200">{b.label}</span>
                          <b className="text-amber-300">{remLabel}</b>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* EXP & Job Level Bars */}
                <div className="space-y-1.5 text-xs tabular-nums">
                  <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
                    <span className="font-bold text-slate-200">เลเวล {p.level}</span>
                    <div className="relative h-4 overflow-hidden rounded border border-[#263f63] bg-[#090e17]">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400"
                        style={{ width: `${levelExpPct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
                        {formatNum(p.exp)} / {formatNum(levelExpMax)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
                    <span className="font-bold text-slate-200">อาชีพ {jobLevel}</span>
                    <div className="relative h-4 overflow-hidden rounded border border-[#263f63] bg-[#090e17]">
                      <div
                        className="h-full bg-gradient-to-r from-orange-600 to-rose-500"
                        style={{ width: `${jobExpPct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
                        {formatNum(jobExp)} / {formatNum(jobExpMax)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Alias Row */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-slate-400">นามแฝง</span>
                    {editingAlias ? (
                      <input
                        type="text"
                        value={aliasInput}
                        onChange={(e) => setAliasInput(e.target.value)}
                        maxLength={24}
                        placeholder="ตั้งนามแฝง..."
                        className="w-36 rounded border border-sky-400 bg-[#0d1521] px-2 py-0.5 text-xs text-white focus:outline-none"
                      />
                    ) : (
                      <span className="truncate font-semibold text-sky-300">
                        {p.alias || 'ยังไม่ได้ตั้ง'}
                      </span>
                    )}
                  </div>
                  {editingAlias ? (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const res = updatePlayerAliasAction(aliasInput)
                          setNotice({ ok: res.ok, text: res.message })
                          setEditingAlias(false)
                        }}
                        className="asura-tab-active flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold"
                      >
                        <Check className="size-3" aria-hidden /> บันทึก
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAlias(false)}
                        className="asura-tab px-2 py-1 text-[11px]"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAliasInput(p.alias ?? '')
                        setEditingAlias(true)
                      }}
                      className="asura-tab-active flex items-center gap-1.5 px-3 py-1 text-xs font-bold"
                    >
                      <Pencil className="size-3" aria-hidden /> แก้ไข
                    </button>
                  )}
                </div>

                {/* Bottom 4 Circular Sub-view Toggles */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {(
                    [
                      ['character', 'ตัวละคร', User],
                      ['combat', 'ค่าพลัง', Swords],
                      ['buffs', 'บัฟ', Sparkles],
                      ['expiry', 'วันหมดอายุ', Info],
                    ] as const
                  ).map(([id, label, Icon]) => {
                    const active = statusSubView === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setStatusSubView(id)}
                        className="flex flex-col items-center gap-1"
                      >
                        <span
                          className={cn(
                            'grid size-11 place-items-center rounded-full border-2 transition-transform hover:scale-105',
                            active
                              ? 'border-amber-300 bg-amber-400/20 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                              : 'border-[#3b6bb3] bg-[#162740] text-sky-300',
                          )}
                        >
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <span className="rounded bg-[#19283e] px-2 py-0.5 text-[10px] font-bold text-slate-200">
                          {label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: JOB TREE ================= */}
          {activeTab === 'job' && (
            <div className="flex h-full flex-col justify-between gap-3">
              {/* Orthogonal Asura Job Branch Tree */}
              <div className="rounded-lg border border-[#243d63] bg-[#101824]/95 p-3">
                {/* Tier 0 Novice */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setSelectedTreeJobId('novice')}
                    className={cn(
                      'grid size-12 place-items-center rounded-full border-2 transition-transform hover:scale-105',
                      treeJob.id === 'novice'
                        ? 'border-amber-300 bg-purple-600 ring-2 ring-amber-300/60'
                        : p.jobId === 'novice'
                          ? 'border-sky-300 bg-purple-600'
                          : 'border-slate-500 bg-purple-900/70',
                    )}
                    title={JOBS.novice.name}
                  >
                    <SpriteModelCanvas mode="job" id="novice" action="idle" dir="down" size={34} showAura={false} showShadow={false} />
                  </button>
                  <span className="mt-1 text-[10px] font-bold text-slate-300">{JOBS.novice.name}</span>
                  <div className="h-3 w-1 bg-white/90" />
                </div>

                {/* Tier 1 Row + Orthogonal Connectors */}
                <div className="relative mx-auto max-w-2xl">
                  <div className="mx-6 h-1 bg-white/90" />
                  <div className="grid grid-cols-6 gap-1.5 pt-2">
                    {tier1TreeJobs.map((j) => {
                      const picked = treeJob.id === j.id
                      const isCurrent = normalizeJobId(p.jobId) === j.id
                      return (
                        <div key={j.id} className="relative flex flex-col items-center">
                          <div className="absolute -top-2 h-2 w-1 bg-white/90" />
                          <button
                            type="button"
                            onClick={() => setSelectedTreeJobId(j.id)}
                            className={cn(
                              'grid size-11 place-items-center rounded-full border-2 transition-transform hover:scale-105',
                              picked
                                ? 'border-amber-300 bg-sky-600 ring-2 ring-amber-300/70'
                                : isCurrent
                                  ? 'border-sky-300 bg-sky-700'
                                  : 'border-slate-500 bg-[#1a2b42]',
                            )}
                            title={`${j.name} (Lv.${j.reqLevel})`}
                          >
                            <SpriteModelCanvas mode="job" id={j.id} action="idle" dir="down" size={32} showAura={false} showShadow={false} />
                          </button>
                          <span className="mt-0.5 truncate text-center text-[9.5px] font-bold text-slate-200">
                            {j.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Yellow Tier Link Bar */}
                  <div className="mx-8 my-1.5 h-1 rounded bg-amber-400/90" />

                  {/* Tier 2 Row */}
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {tier2TreeJobs.map((j) => {
                      const picked = treeJob.id === j.id
                      const isCurrent = normalizeJobId(p.jobId) === j.id
                      return (
                        <div key={j.id} className="flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => setSelectedTreeJobId(j.id)}
                            className={cn(
                              'grid size-10 place-items-center rounded-full border-2 transition-transform hover:scale-105',
                              picked
                                ? 'border-amber-300 bg-amber-500/80 ring-2 ring-amber-300/70'
                                : isCurrent
                                  ? 'border-sky-300 bg-amber-600/60'
                                  : 'border-slate-600 bg-[#192332]',
                            )}
                            title={`${j.name} (Lv.${j.reqLevel})`}
                          >
                            <SpriteModelCanvas mode="job" id={j.id} action="idle" dir="down" size={30} showAura={false} showShadow={false} />
                          </button>
                          <span className="mt-0.5 line-clamp-1 text-center text-[9px] text-slate-300">
                            {j.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Selected Job Detail & Promotion */}
              <div className="flex flex-col gap-3 rounded-lg border border-[#243d63] bg-[#111926]/95 p-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 items-start gap-3">
                  <div className="grid size-16 shrink-0 place-items-center rounded-lg border border-[#2d4e80] bg-[#162336]">
                    <SpriteModelCanvas
                      mode="job"
                      id={treeJob.id}
                      action="auto"
                      dir="down"
                      size={58}
                      label={treeJob.name}
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">{treeJob.name}</span>
                      <span
                        className={cn(
                          'rounded border px-1.5 py-0.5 text-[10px] font-bold',
                          treeJob.ranged
                            ? 'border-sky-400/50 bg-sky-500/15 text-sky-300'
                            : 'border-rose-400/50 bg-rose-500/15 text-rose-300',
                        )}
                      >
                        {treeJob.ranged ? `ตีไกล (Ranged · ${treeJob.range}px)` : `ตีใกล้ (Melee · ${treeJob.range}px)`}
                      </span>
                      <span className="rounded bg-[#1a2b44] px-1.5 py-0.5 text-[10px] text-sky-300 tabular-nums">
                        ปลดล็อก Lv.{treeJob.reqLevel}
                      </span>
                      {treeJob.cost > 0 && (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 tabular-nums">
                          {formatNum(treeJob.cost)} G
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-sky-300">{treeJob.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10px] text-slate-300">
                      <span className="text-slate-400">อาวุธ:</span>
                      {treeJob.weaponTypes.map((wt) => (
                        <span key={wt} className="rounded border border-[#2d4e80] bg-[#172336] px-1.5 py-0.5">
                          {WEAPON_LABELS[wt] ?? wt}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {treeJob.skills.map((sk) => (
                        <button
                          key={sk.id}
                          type="button"
                          onClick={() => {
                            setSelectedSkillId(sk.id)
                            setSkillTierTab(treeJob.tier === 0 ? 'novice' : treeJob.tier === 1 ? 'tier1' : 'tier2')
                            setActiveTab('skills')
                          }}
                          className="flex items-center gap-1 rounded border border-[#2c4b76] bg-[#162438] px-1.5 py-0.5 text-[10px] hover:border-amber-300"
                        >
                          <img src={getSkillIconPath(sk.id)} alt="" width={16} height={16} className="size-4 rounded-sm" />
                          <span>{sk.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end justify-center gap-1.5">
                  <div className="text-right text-[10px] font-bold text-amber-300 tabular-nums">
                    อาชีพปัจจุบัน: {job.name} (JLv.{jobLevel} · {jobExpPct}%)
                  </div>
                  <div className="flex items-center gap-2">
                    {normalizeJobId(p.jobId) !== 'novice' && (
                      <button
                        type="button"
                        onClick={() => {
                          const res = resetJobClassAction()
                          setNotice({ ok: res.ok, text: res.message })
                          if (res.ok) playQuestClaimSfx(isSfxMuted())
                        }}
                        className="asura-tab px-2.5 py-1.5 text-[10.5px] font-bold text-amber-200 whitespace-nowrap"
                      >
                        {jobResetPotCount > 0
                          ? `เปลี่ยนสายอาชีพ (น้ำยา x${jobResetPotCount})`
                          : 'รีเซ็ตสายอาชีพ (1,500 G)'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!canPromoteTreeJob || p.level < treeJob.reqLevel || p.gold < treeJob.cost}
                      onClick={() => changeJob(treeJob.id)}
                      className={cn(
                        'flex size-16 flex-col items-center justify-center rounded-full border-2 text-[11px] font-extrabold transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40',
                        canPromoteTreeJob && p.level >= treeJob.reqLevel && p.gold >= treeJob.cost
                          ? 'border-amber-300 bg-gradient-to-b from-sky-500 to-blue-700 text-white shadow-lg'
                          : 'border-slate-500 bg-[#1c2838] text-slate-300',
                      )}
                    >
                      <Crown className="mb-0.5 size-4 text-amber-300" aria-hidden />
                      <span>เลื่อนชั้น</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: SKILLS & VFX ================= */}
          {activeTab === 'skills' && (
            <div className="flex h-full flex-col gap-2.5">
              {/* Top Tier Sub-Tabs */}
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['novice', 'เริ่มต้น'],
                    ['tier1', 'คลาส 1'],
                    ['tier2', 'คลาส 2'],
                    ['special', 'พิเศษ'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSkillTierTab(id)}
                    className={cn(
                      'px-4 py-1.5 text-xs font-bold',
                      skillTierTab === id ? 'asura-tab-active' : 'asura-tab',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_19rem]">
                {/* Skill Cards Grid */}
                <div className="relative flex flex-col items-center justify-center rounded-lg border border-[#243d63] bg-[#0d1420]/95 p-4">
                  <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:grid-cols-4">
                    {displayedSkillList.map(({ skill, ownerJob }) => {
                      const lv = p.skillLevels?.[skill.id] ?? 1
                      const maxed = lv >= MAX_SKILL_UPGRADE
                      const cost = skillUpgradeCost(lv)
                      const selected = activeSkillEntry?.skill.id === skill.id
                      const isCurrentJobSkill = ownerJob.id === normalizeJobId(p.jobId)
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => {
                            setSelectedSkillId(skill.id)
                            setVfxNonce((n) => n + 1)
                          }}
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-lg border-2 p-2 text-center transition-all hover:brightness-110',
                            selected
                              ? 'border-amber-300 bg-sky-900/50 shadow-[0_0_14px_rgba(251,191,36,0.3)]'
                              : maxed
                                ? 'border-amber-500/70 bg-[#2a2216]'
                                : isCurrentJobSkill
                                  ? 'border-sky-400/80 bg-[#142742]'
                                  : 'border-[#294369] bg-[#141f2f]',
                          )}
                        >
                          <img
                            src={getSkillIconPath(skill.id)}
                            alt={skill.name}
                            width={40}
                            height={40}
                            className="size-10 rounded border border-white/20 bg-[#0b111c] object-cover"
                          />
                          <p className="line-clamp-1 text-[10.5px] font-bold text-white">{skill.name}</p>
                          <div className="flex items-center gap-1 text-[10px] font-extrabold tabular-nums">
                            {maxed ? (
                              <span className="text-amber-300">MAX</span>
                            ) : (
                              <>
                                <span className="inline-block size-3 rounded-full bg-gradient-to-br from-fuchsia-400 to-purple-700" />
                                <span className="text-purple-200">{cost.skillPoints}</span>
                              </>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-sky-300 tabular-nums">
                            {lv}/{MAX_SKILL_UPGRADE}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Right SP + Skill Detail + VFX Stage */}
                <div className="flex flex-col justify-between gap-2 rounded-lg border border-[#243d63] bg-[#111a28]/95 p-3">
                  <div className="flex items-center justify-between gap-2 border-b border-[#243d63] pb-2">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-amber-300 tabular-nums">
                      <span className="inline-block size-5 rounded-full bg-gradient-to-br from-fuchsia-400 to-purple-700 shadow" />
                      <span>{p.skillPoints ?? 0} SP</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const res = resetSkillsAction()
                        setNotice({ ok: res.ok, text: res.message })
                      }}
                      className="asura-tab px-3 py-1 text-xs font-bold whitespace-nowrap"
                    >
                      {skillResetPotCount > 0 ? `ล้าง (น้ำยาลืมทักษะ x${skillResetPotCount})` : 'ล้าง (500 G)'}
                    </button>
                  </div>
                  {skillTierTab === 'special' && (
                    <div className="grid grid-cols-3 gap-1 rounded border border-[#243d63] bg-[#0d1521] p-1.5 text-[10px] tabular-nums">
                      <div>
                        <span className="block text-slate-400">พลังจุติ</span>
                        <b className="text-amber-300">จุติ {p.rebirthCount ?? 0}/6</b>
                      </div>
                      <div>
                        <span className="block text-slate-400">พรสวรรค์</span>
                        <b className="text-sky-300">+{computeTalentBonuses(extV2.talents).atkPct}% ATK</b>
                      </div>
                      <div>
                        <span className="block text-slate-400">สิทธิ์ VIP</span>
                        <b className="text-emerald-300">{vipBonuses.active ? `VIP ${vipBonuses.level}` : 'ไม่มี'}</b>
                      </div>
                    </div>
                  )}

                  {activeSkillEntry ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white">{activeSkillEntry.skill.name}</span>
                        <span className="font-mono text-[10px] text-sky-300 tabular-nums">
                          {activeSkillEntry.skill.mp} MP · CD {activeSkillEntry.skill.cooldown}s
                        </span>
                      </div>
                      <SkillVfxPreview
                        jobId={activeSkillEntry.ownerJob.id}
                        skillId={activeSkillEntry.skill.id}
                        rebirthCount={p.rebirthCount ?? 0}
                        playNonce={vfxNonce}
                        width={260}
                        height={112}
                        label={activeSkillEntry.skill.name}
                      />
                      <p className="text-[11px] leading-snug text-slate-300">
                        {activeSkillEntry.skill.description}
                      </p>
                      {activeVfxSpec && (
                        <p className="text-[10px]" style={{ color: activeVfxSpec.primaryColor }}>
                          VFX: {activeVfxSpec.effectLabel}
                        </p>
                      )}
                      <div className="flex gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setVfxNonce((n) => n + 1)}
                          className="asura-tab flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold"
                        >
                          <Play className="size-3" aria-hidden /> เล่น VFX
                        </button>
                        {activeSkillEntry.ownerJob.id === normalizeJobId(p.jobId) && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = upgradeSkillAction(activeSkillEntry.skill.id)
                              setNotice({ ok: res.ok, text: res.message })
                              if (res.ok) playQuestClaimSfx(isSfxMuted())
                            }}
                            className="asura-tab-active flex-1 py-1.5 text-[11px] font-bold"
                          >
                            อัปเกรดสกิล (ยืนยัน)
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-xs text-slate-400">เลือกทักษะเพื่อดูรายละเอียด</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 5: TRAINING (TALENTS & LOADOUTS & LIFESKILLS) ================= */}
          {activeTab === 'training' && (
            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#243d63] bg-[#111a28] p-2.5 tabular-nums">
                <span className="font-semibold text-sky-200">
                  โบนัสพรสวรรค์: ATK +{computeTalentBonuses(extV2.talents).atkPct}% · DEF +
                  {computeTalentBonuses(extV2.talents).defPct}% · HP +
                  {computeTalentBonuses(extV2.talents).hpPct}% · CRIT +
                  {(computeTalentBonuses(extV2.talents).critBonus * 100).toFixed(1)}%
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => openPanel('lifeskills')}
                    className="asura-tab px-2.5 py-1 font-bold"
                  >
                    หน้าต่างทักษะชีวิต
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const res = resetTalentsAction()
                      setNotice({ ok: res.ok, text: res.message })
                    }}
                    className="rounded border border-rose-400/50 bg-rose-700/80 px-2.5 py-1 font-bold text-white"
                  >
                    รีเซ็ต Talent (500 G)
                  </button>
                </div>
              </div>

              <div className="grid gap-2.5 md:grid-cols-3">
                {(['crimson', 'bastion', 'swift'] as TalentBranch[]).map((branch) => {
                  const meta = TALENT_BRANCH_META[branch]
                  const nodes = TALENT_NODES.filter((n) => n.branch === branch)
                  return (
                    <div key={branch} className="space-y-2 rounded-lg border border-[#243d63] bg-[#101824] p-2.5">
                      <div>
                        <h3 className="font-bold" style={{ color: meta.color }}>
                          {meta.name}
                        </h3>
                        <p className="text-[10px] text-slate-400">{meta.desc}</p>
                      </div>
                      {nodes.map((node) => {
                        const rank = extV2.talents[node.id] ?? 0
                        const maxed = rank >= node.maxRank
                        const goldCost = 200 * (rank + 1)
                        return (
                          <div key={node.id} className="rounded border border-[#213859] bg-[#0b121c] p-2">
                            <div className="flex justify-between font-bold">
                              <span>{node.name}</span>
                              <span className="text-sky-300 tabular-nums">
                                {rank}/{node.maxRank}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[10px] text-slate-400">{node.description}</p>
                            <button
                              type="button"
                              disabled={maxed}
                              onClick={() => {
                                const res = upgradeTalentAction(node.id)
                                setNotice({ ok: res.ok, text: res.message })
                                if (res.ok) playEnhanceSfx(true, isSfxMuted())
                              }}
                              className="asura-tab-active mt-1.5 w-full py-1 text-[10px] font-bold disabled:opacity-40"
                            >
                              {maxed ? 'เต็มขั้นแล้ว' : `อัปเกรด (1 SP + ${formatNum(goldCost)} G)`}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* Quick Loadout Presets + Life Skills Summary */}
              <div className="grid gap-2.5 md:grid-cols-2">
                <div className="space-y-2 rounded-lg border border-[#243d63] bg-[#101824] p-2.5">
                  <p className="font-bold text-amber-300">พรีเซ็ตอุปกรณ์ ({extV2.loadouts.length}/3)</p>
                  <div className="flex gap-1.5">
                    <select
                      aria-label="เลือกช่องพรีเซ็ต"
                      value={selectedLoadoutIdx}
                      onChange={(e) => setSelectedLoadoutIdx(Number(e.target.value) || 0)}
                      className="rounded border border-[#2d4e80] bg-[#162336] px-2 py-1 text-xs text-white"
                    >
                      {extV2.loadouts.map((lo, idx) => (
                        <option key={lo.id} value={idx}>
                          ช่อง {idx + 1}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={loadoutName}
                      onChange={(e) => setLoadoutName(e.target.value)}
                      placeholder="ชื่อพรีเซ็ต..."
                      className="flex-1 rounded border border-[#2d4e80] bg-[#162336] px-2 py-1 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const res = saveLoadoutAction(selectedLoadoutIdx, loadoutName || undefined)
                        setNotice({ ok: res.ok, text: res.message })
                        setLoadoutName('')
                      }}
                      className="asura-tab-active px-3 py-1 font-bold"
                    >
                      บันทึก
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {extV2.loadouts.map((lo, idx) => (
                      <button
                        key={lo.id}
                        type="button"
                        onClick={() => {
                          setSelectedLoadoutIdx(idx)
                          const res = applyLoadoutAction(idx)
                          setNotice({ ok: res.ok, text: res.message })
                        }}
                        className="asura-tab flex items-center gap-1 px-2.5 py-1 text-[11px]"
                      >
                        <ArrowLeftRight className="size-3" aria-hidden />
                        {lo.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-[#243d63] bg-[#101824] p-2.5">
                  <p className="font-bold text-emerald-300">ระดับทักษะการฝึกฝน</p>
                  <div className="grid grid-cols-3 gap-1.5 tabular-nums">
                    {(['fishing', 'mining', 'herbalism'] as const).map((sk) => {
                      const progress = extV2.lifeSkills[sk]
                      const meta = LIFE_SKILL_META[sk]
                      return (
                        <div key={sk} className="rounded border border-[#223959] bg-[#0b121c] p-2 text-center">
                          <p className="font-bold" style={{ color: meta.color }}>
                            {meta.label}
                          </p>
                          <p className="text-sm font-extrabold text-white">Lv.{progress.level}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 6: SPIRIT (SOUL AWAKENING, REBIRTH & COMPANIONS) ================= */}
          {activeTab === 'spirit' && (
            <div className="space-y-3">
              <SpiritAwakeningSection onNotice={setNotice} compactPreview />

              <div className="grid gap-3 md:grid-cols-[13.5rem_1fr]">
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-[#243d63] bg-[#101824] p-3">
                  {(() => {
                    const tier = rebirthPreviewTier ?? Math.max(1, p.rebirthCount ?? 0)
                    const spec = resolveRebirthAuraSpec(tier)
                    return (
                      <>
                        <div className="grid size-32 place-items-center rounded-xl border border-[#2c4b76] bg-[#0b121d]">
                          <SpriteModelCanvas
                            mode="job"
                            id={p.jobId}
                            action="idle"
                            dir="down"
                            size={112}
                            fashion={fashionLoadout}
                            rebirthCount={tier}
                            spiritStage={extV2.spiritAwakening?.awakeningStage ?? 0}
                            label={spec.title}
                          />
                        </div>
                        <span className="text-xs font-bold" style={{ color: spec.primaryColor }}>
                          จุติระดับ {tier} · {spec.shortTitle}
                        </span>
                        <div className="flex flex-wrap justify-center gap-1">
                          {[1, 2, 3, 4, 5, 6].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setRebirthPreviewTier(t)}
                              className={cn(
                                'px-2 py-0.5 text-[10px] font-bold',
                                tier === t ? 'asura-tab-active' : 'asura-tab',
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </>
                    )
                  })()}
                </div>

                <div className="flex flex-col justify-between gap-3 rounded-lg border border-[#243d63] bg-[#101824] p-3 text-xs">
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                      <GameArtIcon iconId="rebirth" size={18} />
                      การจุติ 6 ขั้น & พันธะผอบคู่หู
                    </h3>
                    <p className="text-slate-300">
                      จุติได้ที่ Lv.70 (สูงสุด 6 ครั้ง) เพื่อรีเซ็ตกลับสู่ผู้ฝึกหัดพร้อมเก็บค่าพลังและอุปกรณ์ทั้งหมดไว้
                      และปลดล็อกเงื่อนไขเบิกเนตรจุจิตขั้นสูง
                    </p>
                    <div className="grid grid-cols-3 gap-2 tabular-nums">
                      <div className="rounded border border-[#213859] bg-[#0b121c] p-2">
                        <span className="block text-[10px] text-slate-400">เลเวลปัจจุบัน</span>
                        <b className="text-sm text-amber-300">{p.level} / 70</b>
                      </div>
                      <div className="rounded border border-[#213859] bg-[#0b121c] p-2">
                        <span className="block text-[10px] text-slate-400">จำนวนครั้งจุติ</span>
                        <b className="text-sm text-sky-300">{p.rebirthCount ?? 0} / 6</b>
                      </div>
                      <div className="rounded border border-[#213859] bg-[#0b121c] p-2">
                        <span className="block text-[10px] text-slate-400">คู่หูที่เรียกใช้</span>
                        <b className="block truncate text-sm text-pink-300">
                          {activePetDef?.name ?? 'ยังไม่เรียก'}
                        </b>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={p.level < 70 || (p.rebirthCount ?? 0) >= 6}
                      onClick={() => rebirth()}
                      className="asura-tab-active px-4 py-2 font-bold disabled:opacity-40"
                    >
                      ทำพิธีจุติทันที
                    </button>
                    <button
                      type="button"
                      onClick={() => openPanel('pets')}
                      className="asura-tab px-4 py-2 font-bold"
                    >
                      จัดการผอบ & สัตว์ขี่
                    </button>
                    <button
                      type="button"
                      onClick={() => openPanel('codex')}
                      className="asura-tab px-4 py-2 font-bold"
                    >
                      สมุดภาพ & ฉายา
                    </button>
                    {Object.keys(petState.ownedPets).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const firstPet = Object.keys(petState.ownedPets)[0]
                          equipCombatPet(petState.activePetId ? null : firstPet)
                        }}
                        className="asura-tab px-3 py-2 font-bold"
                      >
                        {petState.activePetId ? 'เก็บผอบ' : 'เรียกผอบ'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
