'use client'

import { useState } from 'react'
import { Coins, Gem, Shield, Sparkles, Star, Swords } from 'lucide-react'
import { countItem, equipCombatPet, evolveCombatPetAction, feedCombatPet, openPanel, unlockCombatPet } from '@/lib/game/engine'
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
  type CombatPetDef,
} from '@/lib/game/systems'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { PanelFrame, PxButton } from './panels'

function PetPixelPreview({ pet }: { pet: CombatPetDef }) {
  const palette = {
    '1': pet.colors.primary,
    '2': pet.colors.secondary,
    '3': pet.colors.accent,
  }
  return (
    <div
      aria-hidden
      className="grid size-12 shrink-0 grid-cols-8 grid-rows-8 border-2 border-[#0e0f1a] bg-background/80 p-1"
    >
      {pet.pixels.flatMap((row, rIdx) =>
        Array.from(row.padEnd(8, '.').slice(0, 8)).map((cell, cIdx) => (
          <span
            key={`${rIdx}-${cIdx}`}
            style={{
              backgroundColor: cell === '.' ? 'transparent' : palette[cell as keyof typeof palette],
            }}
          />
        )),
      )}
    </div>
  )
}

export function PetsPanel() {
  const { p } = useGame()
  const [notice, setNotice] = useState<string | null>(null)
  if (!p) return null

  const petState = sanitizePetState(p.petState, p.ownedGemItems, p.equippedGemCompanion)
  const activeBonus = getActivePetBonuses(petState, p.equippedGemCompanion, p.ownedGemItems)

  return (
    <PanelFrame title="ระบบสัตว์เลี้ยงคู่หู" subtitle="คู่หูช่วยยิงโจมตีมอนสเตอร์และเพิ่มบัฟสเตตัสให้ตัวละคร">
      <div className="space-y-4">
        {/* Active Companion Summary */}
        <div className="border-2 border-border bg-muted/60 p-3">
          {activeBonus ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <PetPixelPreview pet={activeBonus.def} />
                <div>
                  <p className="text-sm font-bold text-primary">
                    กำลังใช้งาน: {activeBonus.def.name} (Lv.{activeBonus.level} · {'★'.repeat(activeBonus.stars)})
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    พลังช่วยยิง {formatNum(activeBonus.companionAtk)} · ยิงทุก {activeBonus.attackInterval.toFixed(1)} วินาที
                    {activeBonus.autoLootMagnet ? ' · ดูดไอเทมตกอัตโนมัติ (2★+)' : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-accent tabular-nums">
                    บัฟตัวละคร: +{formatNum(activeBonus.atkBonus)} ATK · +{formatNum(activeBonus.defBonus)} DEF · +{formatNum(activeBonus.hpBonus)} HP
                    {activeBonus.def.expBonusPct > 0 ? ` · EXP +${Math.round((activeBonus.expMul - 1) * 100)}%` : ''}
                    {activeBonus.def.goldBonusPct > 0 ? ` · ทอง +${Math.round((activeBonus.goldMul - 1) * 100)}%` : ''}
                  </p>
                </div>
              </div>
              <PxButton variant="secondary" onClick={() => equipCombatPet(null)}>
                เก็บคู่หู
              </PxButton>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              ยังไม่ได้เรียกสัตว์เลี้ยงคู่หู — ปลดล็อกหรือเลือกคู่หูด้านล่างเพื่อช่วยสู้และรับบัฟสเตตัสทันที
            </p>
          )}
        </div>

        {notice && (
          <p className="border border-primary/50 bg-primary/10 px-3 py-2 text-xs text-primary" role="status">
            {notice}
          </p>
        )}

        {/* Pet Roster */}
        <div className="grid gap-3 sm:grid-cols-2">
          {COMBAT_PETS.map((pet) => {
            const owned = petState.ownedPets[pet.id]
            const isActive = petState.activePetId === pet.id
            const lv = owned?.level ?? 1
            const stars = owned?.stars ?? 1
            const scale = (1 + (lv - 1) * 0.14) * getPetStarMultiplier(stars)
            const previewAtk = Math.round((pet.baseAtk + (lv - 1) * pet.atkPerLevel) * getPetStarMultiplier(stars))
            const feedCost = petFeedCost(lv)
            const evolveCost = petEvolveCost(stars)
            const needExp = petExpToNext(lv)
            const essenceOwned = countItem('pet_essence')

            return (
              <div
                key={pet.id}
                className={`flex flex-col justify-between gap-3 border-2 p-3 ${
                  isActive ? 'border-accent bg-accent/10' : 'border-border bg-background/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <PetPixelPreview pet={pet} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="truncate text-sm font-bold text-foreground">{pet.name}</h3>
                      <span className="shrink-0 text-[11px] font-semibold text-amber-300 tabular-nums">
                        {owned ? `Lv.${lv} · ${'★'.repeat(stars)}` : pet.rarity}
                      </span>
                    </div>
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
                        ปลดล็อกคู่หู ({formatNum(pet.unlockGold ?? 0)} G)
                      </span>
                    </PxButton>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PanelFrame>
  )
}
