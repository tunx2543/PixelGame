'use client'

import { useState } from 'react'
import { Coins, Gem, PawPrint, Shield, Sparkles, Star, Swords, Wind } from 'lucide-react'
import {
  countItem,
  equipCombatPet,
  equipMount,
  evolveCombatPetAction,
  feedCombatPet,
  openPanel,
  storeMount,
  summonMount,
  toggleMountRiding,
  unlockCombatPet,
  unlockMount,
  upgradeMount,
} from '@/lib/game/engine'
import {
  MAX_MOUNT_LEVEL,
  MOUNT_DEFS,
  getActiveMountBonuses,
  getMountVisualTierLabel,
  mountUpgradeCost,
  sanitizeMountState,
} from '@/lib/game/mounts'
import { playEnhanceSfx, playQuestClaimSfx } from '@/lib/game/sfx'
import {
  COMBAT_PETS,
  MAX_PET_LEVEL,
  MAX_PET_STARS,
  getActivePetBonuses,
  getPetStarMultiplier,
  petEvolveCost,
  petExpToNext,
  petFeedCost,
  sanitizePetState,
} from '@/lib/game/systems'
import { PET_STAT_CAPS } from '@/lib/game/premium/fashion-pet'
import { getPetVisualTierLabel } from '@/lib/game/pet-follow'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import type { Dir } from '@/lib/game/sprites'
import type { PreviewAction } from '../sprite-model-canvas'
import { SpriteModelCanvas } from '../sprite-model-canvas'
import { PanelFrame, PxButton } from './panels'

type MainTab = 'pets' | 'mounts'
type PetFilter = 'all' | 'phao' | 'companion'
type RarityFilter = 'all' | 'ทั่วไป' | 'ไม่ธรรมดา' | 'หายาก' | 'อีปิก' | 'ตำนาน' | 'มายา' | 'เทพเจ้า'

const RARITY_BADGE_STYLE: Record<string, string> = {
  ทั่วไป: 'border-slate-400/50 bg-slate-500/15 text-slate-200',
  ไม่ธรรมดา: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300',
  หายาก: 'border-sky-400/50 bg-sky-500/15 text-sky-300',
  อีปิก: 'border-purple-400/50 bg-purple-500/15 text-purple-300',
  ตำนาน: 'border-amber-400/50 bg-amber-500/15 text-amber-300',
  มายา: 'border-rose-400/50 bg-rose-500/15 text-rose-300',
  เทพเจ้า: 'border-cyan-300/60 bg-cyan-400/20 text-cyan-200',
}

export function PetsPanel() {
  const { p } = useGame()
  const [mainTab, setMainTab] = useState<MainTab>('pets')
  const [petFilter, setPetFilter] = useState<PetFilter>('phao')
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all')
  const [previewAction, setPreviewAction] = useState<PreviewAction>('auto')
  const [previewDir, setPreviewDir] = useState<Dir>('right')
  const [showMountRider, setShowMountRider] = useState<boolean>(false)
  const [notice, setNotice] = useState<string | null>(null)
  if (!p) return null

  const petState = sanitizePetState(p.petState, p.ownedGemItems, p.equippedGemCompanion)
  const activeBonus = getActivePetBonuses(petState, p.equippedGemCompanion, p.ownedGemItems)
  const mountState = sanitizeMountState(p.mountState, p.ownedGemItems)
  const activeMountBonus = getActiveMountBonuses(mountState, p.ownedGemItems)

  const phaoCount = COMBAT_PETS.filter((pet) => (pet.category ?? (pet.id.startsWith('phao_') ? 'phao' : 'companion')) === 'phao').length
  const companionCount = COMBAT_PETS.length - phaoCount

  const filteredPets = COMBAT_PETS.filter((pet) => {
    const cat = pet.category ?? (pet.id.startsWith('phao_') ? 'phao' : 'companion')
    if (petFilter === 'phao' && cat !== 'phao') return false
    if (petFilter === 'companion' && cat !== 'companion') return false
    if (rarityFilter !== 'all' && pet.rarity !== rarityFilter) return false
    return true
  })

  return (
    <PanelFrame
      title="สัตว์เลี้ยง (ผอบ) & สัตว์ขี่"
      subtitle="ผอบอารักขา คู่หูช่วยต่อสู้ และสัตว์ขี่เพิ่มความเร็วเคลื่อนที่พร้อมโบนัสสเตตัส"
    >
      <div className="space-y-4">
        {/* Top Mode Tabs */}
        <div role="tablist" aria-label="หมวดหมู่สัตว์เลี้ยงและสัตว์ขี่" className="flex flex-wrap gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === 'pets'}
            onClick={() => setMainTab('pets')}
            className={`pixel-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ${
              mainTab === 'pets'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <PawPrint className="size-3.5" aria-hidden />
            สัตว์เลี้ยง &amp; ผอบ ({COMBAT_PETS.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === 'mounts'}
            onClick={() => setMainTab('mounts')}
            className={`pixel-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ${
              mainTab === 'mounts'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wind className="size-3.5" aria-hidden />
            สัตว์ขี่ ({MOUNT_DEFS.length})
          </button>
        </div>

        {notice && (
          <p className="border border-primary/50 bg-primary/10 px-3 py-2 text-xs text-primary" role="status">
            {notice}
          </p>
        )}

        {mainTab === 'pets' ? (
          <>
            {/* Active Companion Summary */}
            <div className="border-2 border-border bg-muted/60 p-3">
              {activeBonus ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-14 shrink-0 place-items-center border-2 border-[#0e0f1a] bg-[#0b1024]/90">
                      <SpriteModelCanvas
                        mode="pet"
                        id={activeBonus.petId}
                        action={previewAction}
                        dir={previewDir}
                        petLevel={activeBonus.level}
                        petStars={activeBonus.stars}
                        size={52}
                        label={`พรีวิว ${activeBonus.def.name}`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">
                        กำลังใช้งาน: {activeBonus.def.name} (Lv.{activeBonus.level} · {'★'.repeat(activeBonus.stars)})
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-emerald-300">
                        {getPetVisualTierLabel(activeBonus.level, activeBonus.stars)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                        พลังช่วยยิง {formatNum(activeBonus.companionAtk)}/{formatNum(PET_STAT_CAPS.maxCompanionAtk)} · ยิงทุก{' '}
                        {activeBonus.attackInterval.toFixed(1)} วินาที
                        {activeBonus.autoLootMagnet ? ' · ดูดไอเทมตกอัตโนมัติ (2★+)' : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-accent tabular-nums">
                        บัฟตัวละคร: +{formatNum(activeBonus.atkBonus)}/{PET_STAT_CAPS.maxAtkBonus} ATK · +
                        {formatNum(activeBonus.defBonus)}/{PET_STAT_CAPS.maxDefBonus} DEF · +
                        {formatNum(activeBonus.hpBonus)}/{PET_STAT_CAPS.maxHpBonus} HP
                        {activeBonus.def.expBonusPct > 0 ? ` · EXP +${Math.round((activeBonus.expMul - 1) * 100)}%` : ''}
                        {activeBonus.def.goldBonusPct > 0 ? ` · ทอง +${Math.round((activeBonus.goldMul - 1) * 100)}%` : ''}
                      </p>
                      <p className="mt-0.5 text-[11px] text-cyan-200">
                        สกิล: <strong>{activeBonus.skill.name}</strong> ({activeBonus.skill.triggerLabel}) —{' '}
                        {activeBonus.skill.description}
                        {activeBonus.isCapped ? ' · [ติดเพดานสมดุลระบบ]' : ''}
                      </p>
                    </div>
                  </div>
                  <PxButton variant="secondary" onClick={() => equipCombatPet(null)}>
                    เก็บคู่หู
                  </PxButton>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  ยังไม่ได้เรียกสัตว์เลี้ยงหรือผอบคู่หู — ปลดล็อกหรือเลือกคู่หูด้านล่างเพื่อช่วยยิงสู้และรับบัฟสเตตัสทันที
                </p>
              )}
            </div>

            {/* Pet Category Filter + Animation Preview Controls */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="กรองประเภทสัตว์เลี้ยงและผอบ">
                  {(
                    [
                      ['phao', `ผอบ (${phaoCount})`],
                      ['all', `ทั้งหมด (${COMBAT_PETS.length})`],
                      ['companion', `คู่หูสัตว์ (${companionCount})`],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={petFilter === key}
                      onClick={() => setPetFilter(key)}
                      className={`pixel-btn px-2.5 py-1 text-[11px] font-semibold ${
                        petFilter === key
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => openPanel('models')}
                  className="pixel-btn bg-secondary px-2.5 py-1 text-[11px] text-gold hover:brightness-110"
                >
                  ดูคลังโมเดล 2D 4 ทิศทาง
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border border-border/70 bg-muted/40 p-2">
                <div className="flex flex-wrap gap-1" role="group" aria-label="กรองระดับความหายาก">
                  {(['all', 'ทั่วไป', 'ไม่ธรรมดา', 'หายาก', 'อีปิก', 'ตำนาน', 'มายา', 'เทพเจ้า'] as const).map((rar) => (
                    <button
                      key={rar}
                      type="button"
                      aria-pressed={rarityFilter === rar}
                      onClick={() => setRarityFilter(rar)}
                      className={`pixel-btn px-2 py-0.5 text-[10px] font-semibold ${
                        rarityFilter === rar
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {rar === 'all' ? 'ทุกระดับ' : rar}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="โหมดแอนิเมชั่นพรีวิว">
                  {(
                    [
                      ['auto', 'อัตโนมัติ'],
                      ['walk', 'เดิน'],
                      ['follow', 'เดินตาม'],
                      ['run', 'วิ่งตาม'],
                      ['attack', 'โจมตี'],
                    ] as const
                  ).map(([act, label]) => (
                    <button
                      key={act}
                      type="button"
                      aria-pressed={previewAction === act}
                      onClick={() => setPreviewAction(act)}
                      className={`pixel-btn px-2 py-0.5 text-[10px] font-semibold ${
                        previewAction === act
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const order: Dir[] = ['down', 'right', 'up', 'left']
                      setPreviewDir(order[(order.indexOf(previewDir) + 1) % order.length])
                    }}
                    className="pixel-btn bg-secondary px-2 py-0.5 text-[10px] text-foreground hover:brightness-110"
                  >
                    หัน: {previewDir === 'down' ? 'หน้า' : previewDir === 'right' ? 'ขวา' : previewDir === 'up' ? 'หลัง' : 'ซ้าย'}
                  </button>
                </div>
              </div>
            </div>

            {/* Pet & Phao-ob Roster */}
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredPets.map((pet) => {
                const owned = petState.ownedPets[pet.id]
                const isActive = petState.activePetId === pet.id
                const isPhao = (pet.category ?? (pet.id.startsWith('phao_') ? 'phao' : 'companion')) === 'phao'
                const lv = owned?.level ?? 1
                const stars = owned?.stars ?? 1
                const scale = (1 + (lv - 1) * 0.14) * getPetStarMultiplier(stars)
                const previewAtk = Math.round((pet.baseAtk + (lv - 1) * pet.atkPerLevel) * getPetStarMultiplier(stars))
                const feedCost = petFeedCost(lv)
                const evolveCost = petEvolveCost(stars)
                const needExp = petExpToNext(lv)
                const essenceOwned = countItem('pet_essence')
                const rarityClass = RARITY_BADGE_STYLE[pet.rarity] ?? 'border-border bg-secondary text-amber-300'

                return (
                  <div
                    key={pet.id}
                    className={`flex flex-col justify-between gap-3 border-2 p-3 ${
                      isActive
                        ? 'border-accent bg-accent/10'
                        : isPhao
                          ? 'border-amber-500/35 bg-background/60'
                          : 'border-border bg-background/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid size-16 shrink-0 place-items-center border-2 border-[#0e0f1a] bg-[#0b1024]/90">
                        <SpriteModelCanvas
                          mode="pet"
                          id={pet.id}
                          action={previewAction}
                          dir={previewDir}
                          petLevel={lv}
                          petStars={stars}
                          size={60}
                          label={`โมเดล ${pet.name}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="truncate text-sm font-bold text-foreground">{pet.name}</h3>
                          <span className={`shrink-0 border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${rarityClass}`}>
                            {owned ? `Lv.${lv} · ${'★'.repeat(stars)}` : pet.rarity}
                          </span>
                        </div>
                        {(pet.tierLabel || owned) && (
                          <p className="mt-0.5 font-mono text-[10px] text-amber-300/90">
                            {isPhao ? 'ผอบ · ' : ''}
                            {pet.tierLabel}
                            {owned ? ` · ${getPetVisualTierLabel(lv, stars)}` : ''}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{pet.description}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] tabular-nums text-foreground/90">
                          <span className="inline-flex items-center gap-1">
                            <Swords className="size-3 text-primary" aria-hidden /> ยิง {formatNum(previewAtk)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Shield className="size-3 text-accent" aria-hidden /> +{formatNum(Math.round(pet.atkBuff * scale))} ATK / +{formatNum(Math.round(pet.hpBonus * scale))} HP
                          </span>
                        </div>
                        {owned && lv < MAX_PET_LEVEL && (
                          <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                            EXP คู่หู: {formatNum(owned.exp)} / {formatNum(needExp)} · ผลึกวิวัฒนาการที่มี: {essenceOwned}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-border/60 pt-2">
                      {owned ? (
                        <>
                          <PxButton
                            variant={isActive ? 'secondary' : 'accent'}
                            onClick={() => {
                              equipCombatPet(isActive ? null : pet.id)
                              playQuestClaimSfx(false)
                              setNotice(isActive ? `เก็บ ${pet.name} แล้ว` : `เรียกคู่หู ${pet.name} ออกช่วยสู้แล้ว`)
                            }}
                          >
                            {isActive ? 'กำลังใช้งาน' : 'เรียกใช้งาน'}
                          </PxButton>
                          <PxButton
                            variant="primary"
                            disabled={lv >= MAX_PET_LEVEL || p.gold < feedCost}
                            onClick={() => {
                              const res = feedCombatPet(pet.id)
                              playEnhanceSfx(res.ok, false)
                              setNotice(res.message)
                            }}
                          >
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Sparkles className="size-3" aria-hidden />
                              {lv >= MAX_PET_LEVEL ? 'เลเวลเต็ม' : `อัปเลเวล (${formatNum(feedCost)} G)`}
                            </span>
                          </PxButton>
                          <PxButton
                            variant="secondary"
                            disabled={stars >= MAX_PET_STARS || p.gold < evolveCost.gold || essenceOwned < evolveCost.essence}
                            onClick={() => {
                              const res = evolveCombatPetAction(pet.id)
                              playEnhanceSfx(res.ok, false)
                              setNotice(res.message)
                            }}
                          >
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Star className="size-3 text-amber-300" aria-hidden />
                              {stars >= MAX_PET_STARS
                                ? '5★ สูงสุด'
                                : `ดาวถัดไป (ผลึก ${evolveCost.essence} + ${formatNum(evolveCost.gold)} G)`}
                            </span>
                          </PxButton>
                        </>
                      ) : pet.linkedGemItemId ? (
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] text-cyan-200">
                            <Gem className="size-3.5" aria-hidden /> ปลดล็อกในร้านค้าเพชร
                          </span>
                          <PxButton variant="secondary" onClick={() => openPanel('gem-shop')}>
                            ไปร้านเพชร
                          </PxButton>
                        </div>
                      ) : (
                        <PxButton
                          variant="primary"
                          className="w-full"
                          disabled={p.gold < (pet.unlockGold ?? 0)}
                          onClick={() => {
                            const res = unlockCombatPet(pet.id)
                            playQuestClaimSfx(false)
                            setNotice(res.message)
                          }}
                        >
                          <span className="inline-flex items-center justify-center gap-1.5 tabular-nums">
                            <Coins className="size-3.5" aria-hidden />
                            ปลดล็อก{isPhao ? 'ผอบ' : 'คู่หู'} ({formatNum(pet.unlockGold ?? 0)} G)
                          </span>
                        </PxButton>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <>
            {/* Active Mount Summary */}
            <div className="border-2 border-amber-500/40 bg-muted/60 p-3">
              {activeMountBonus ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-16 shrink-0 place-items-center border-2 border-[#0e0f1a] bg-[#0b1024]/90">
                      <SpriteModelCanvas
                        mode="mount"
                        id={activeMountBonus.mountId}
                        action={activeMountBonus.mounted ? 'run' : 'idle'}
                        dir={previewDir}
                        mountLevel={activeMountBonus.level}
                        mountSkinId={null}
                        showRider={showMountRider || activeMountBonus.mounted}
                        riderJobId={p.jobId}
                        size={60}
                        label={`พรีวิว ${activeMountBonus.def.name}`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-300">
                        สัตว์ขี่ที่เลือก: {activeMountBonus.def.name} (Lv.{activeMountBonus.level}) •{' '}
                        {activeMountBonus.mounted ? 'กำลังขี่อยู่' : 'ถูกเรียกไว้ข้างกาย'}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-emerald-300">
                        {getMountVisualTierLabel(activeMountBonus.level)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                        ความเร็วขณะขี่ +{activeMountBonus.speedBonusPct}% · โบนัสติดตัว +{formatNum(activeMountBonus.hpBonus)} HP · +
                        {formatNum(activeMountBonus.atkBonus)} ATK · +{formatNum(activeMountBonus.defBonus)} DEF
                      </p>
                      <p className="mt-0.5 text-[11px] text-cyan-300">กดปุ่ม [M] ในฉากเกมเพื่อขึ้นขี่หรือลงจากสัตว์ขี่ได้ทันที</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <PxButton
                      variant={activeMountBonus.mounted ? 'secondary' : 'accent'}
                      onClick={() => {
                        const res = toggleMountRiding()
                        playQuestClaimSfx(false)
                        setNotice(res.message)
                      }}
                    >
                      {activeMountBonus.mounted ? 'ลงจากสัตว์ขี่ [M]' : 'ขึ้นขี่เลย [M]'}
                    </PxButton>
                    <PxButton
                      variant="secondary"
                      onClick={() => {
                        const res = storeMount()
                        setNotice(res.message)
                      }}
                    >
                      เก็บสัตว์ขี่
                    </PxButton>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  ยังไม่ได้เรียกสัตว์ขี่ — กด "เรียกสัตว์ขี่" หรือ "ขึ้นขี่" ด้านล่างเพื่อใช้งานและกด [M] ขึ้น/ลงได้ทันที
                </p>
              )}
            </div>

            {/* 4-Way Mount Facing & Rider Preview Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border border-border/70 bg-muted/40 p-2">
              <div className="flex flex-wrap items-center gap-1" role="group" aria-label="หมุนทิศพรีวิวสัตว์ขี่">
                <span className="mr-1 text-[11px] font-semibold text-muted-foreground">หันทิศสัตว์ขี่:</span>
                {(
                  [
                    ['down', 'หน้า'],
                    ['right', 'ขวา'],
                    ['up', 'หลัง'],
                    ['left', 'ซ้าย'],
                  ] as const
                ).map(([d, label]) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={previewDir === d}
                    onClick={() => setPreviewDir(d)}
                    className={`pixel-btn px-2 py-0.5 text-[10px] font-semibold ${
                      previewDir === d
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-pressed={showMountRider}
                onClick={() => setShowMountRider((v) => !v)}
                className={`pixel-btn px-2 py-0.5 text-[10px] font-semibold ${
                  showMountRider ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {showMountRider ? 'แสดงคนขี่: เปิด' : 'แสดงคนขี่: ปิด'}
              </button>
            </div>

            {/* Mount Roster */}
            <div className="grid gap-3 sm:grid-cols-2">
              {MOUNT_DEFS.map((mount) => {
                const owned = mountState.ownedMounts[mount.id]
                const isSelected = mountState.activeMountId === mount.id
                const isRiding = isSelected && mountState.mounted
                const lv = owned?.level ?? 1
                const lvScale = 1 + (lv - 1) * 0.16
                const speedPct = mount.speedBonusPct + (lv - 1) * 3
                const upgCost = mountUpgradeCost(lv)

                return (
                  <div
                    key={mount.id}
                    className={`flex flex-col justify-between gap-3 border-2 p-3 ${
                      isRiding
                        ? 'border-amber-400 bg-amber-500/10'
                        : isSelected
                          ? 'border-accent bg-accent/10'
                          : 'border-border bg-background/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid size-16 shrink-0 place-items-center border-2 border-[#0e0f1a] bg-[#0b1024]/90">
                        <SpriteModelCanvas
                          mode="mount"
                          id={mount.id}
                          action={isRiding ? 'run' : isSelected ? 'walk' : 'idle'}
                          dir={previewDir}
                          mountLevel={lv}
                          mountSkinId={null}
                          showRider={showMountRider}
                          riderJobId={p.jobId}
                          size={62}
                          label={`โมเดลสัตว์ขี่ ${mount.name}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="truncate text-sm font-bold text-foreground">{mount.name}</h3>
                          <span className="shrink-0 text-[11px] font-semibold text-amber-300 tabular-nums">
                            {owned ? `Lv.${lv}/${MAX_MOUNT_LEVEL}` : mount.rarity}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px] font-semibold text-emerald-300/90">
                          {mount.rarity} · {getMountVisualTierLabel(lv)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{mount.description}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] tabular-nums text-foreground/90">
                          <span className="inline-flex items-center gap-1 text-cyan-300">
                            <Wind className="size-3" aria-hidden /> วิ่งเร็ว +{speedPct}%
                          </span>
                          <span className="inline-flex items-center gap-1 text-accent">
                            <Shield className="size-3" aria-hidden /> +{formatNum(Math.round(mount.hpBonus * lvScale))} HP / +
                            {formatNum(Math.round(mount.atkBonus * lvScale))} ATK
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-border/60 pt-2">
                      {owned ? (
                        <>
                          <div className="flex flex-wrap gap-1">
                            {!isSelected || isRiding ? (
                              <PxButton
                                variant="secondary"
                                onClick={() => {
                                  const res = summonMount(mount.id)
                                  playQuestClaimSfx(false)
                                  setNotice(res.message)
                                }}
                              >
                                {isRiding ? 'ลงมายืนข้าง' : 'เรียกสัตว์ขี่'}
                              </PxButton>
                            ) : (
                              <PxButton
                                variant="secondary"
                                onClick={() => {
                                  const res = storeMount()
                                  setNotice(res.message)
                                }}
                              >
                                เก็บสัตว์ขี่
                              </PxButton>
                            )}
                            <PxButton
                              variant={isRiding ? 'secondary' : 'accent'}
                              onClick={() => {
                                if (isRiding) {
                                  const res = toggleMountRiding()
                                  setNotice(res.message)
                                } else {
                                  equipMount(mount.id)
                                  playQuestClaimSfx(false)
                                  setNotice(`ขึ้นขี่ ${mount.name} แล้ว`)
                                }
                              }}
                            >
                              {isRiding ? 'ลงขี่' : 'ขึ้นขี่'}
                            </PxButton>
                          </div>
                          <PxButton
                            variant="primary"
                            disabled={lv >= MAX_MOUNT_LEVEL || p.gold < upgCost}
                            onClick={() => {
                              const res = upgradeMount(mount.id)
                              playEnhanceSfx(res.ok, false)
                              setNotice(res.message)
                            }}
                          >
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Sparkles className="size-3" aria-hidden />
                              {lv >= MAX_MOUNT_LEVEL ? 'เลเวลเต็ม' : `อัปเกรด (${formatNum(upgCost)} G)`}
                            </span>
                          </PxButton>
                        </>
                      ) : mount.linkedGemItemId ? (
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] text-cyan-200">
                            <Gem className="size-3.5" aria-hidden /> ปลดล็อกในร้านค้าเพชร
                          </span>
                          <PxButton variant="secondary" onClick={() => openPanel('gem-shop')}>
                            ไปร้านเพชร
                          </PxButton>
                        </div>
                      ) : (
                        <PxButton
                          variant="primary"
                          className="w-full"
                          disabled={p.gold < (mount.unlockGold ?? 0)}
                          onClick={() => {
                            const res = unlockMount(mount.id)
                            playQuestClaimSfx(false)
                            setNotice(res.message)
                          }}
                        >
                          <span className="inline-flex items-center justify-center gap-1.5 tabular-nums">
                            <Coins className="size-3.5" aria-hidden />
                            ปลดล็อกสัตว์ขี่ ({formatNum(mount.unlockGold ?? 0)} G)
                          </span>
                        </PxButton>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </PanelFrame>
  )
}
