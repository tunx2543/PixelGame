'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { ArrowLeft, Backpack, Coins } from 'lucide-react'
import { auth } from '@/lib/firebase/client'
import { listUserCharacters } from '@/lib/firebase/characters'
import {
  SAVE_KEY,
  getActiveCharacterSlot,
  getInventoryCapacity,
  setActiveCharacterSlot,
  setGameAccountIdentity,
  type SaveData,
} from '@/lib/game/engine'
import {
  createDefaultEncounterSave,
  encounterSaveStorageKey,
  persistEncounterSave,
} from '@/lib/game/encounter'
import { pickNewerSave } from '@/lib/game/save-sync'
import {
  applyDailyFreeChestToSave,
  applyMultipleTreasureChestsToSave,
  applyTreasureChestToSave,
  countChestKeys,
  type ChestPaymentMode,
  type ChestTierId,
  type ClaimDailyFreeChestResult,
  type OpenMultipleTreasureChestsResult,
  type OpenTreasureChestResult,
} from '@/lib/game/treasure-chest'
import type { ItemCategory } from '@/lib/game/item-vfx'
import { formatNum } from './format'
import { TreasureChest } from './treasure-chest'

export function TreasureChestScreen() {
  const [user, setUser] = useState<User | null>(null)
  const [slotId, setSlotId] = useState('slot_1')
  const [save, setSave] = useState<SaveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncNotice, setSyncNotice] = useState('กำลังโหลดข้อมูลหีบสมบัติ...')

  useEffect(() => {
    let active = true
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
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
        resolvedSave = pickNewerSave(cloudSave, localSave).save
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

      if (!resolvedSave) {
        resolvedSave = createDefaultEncounterSave()
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(resolvedSave))
          } catch {
            // Ignore storage errors
          }
        }
      }

      if (!active) return
      setSlotId(resolvedSlot)
      setSave(resolvedSave)
      setSyncNotice(cloudUid ? `พร้อมใช้งาน (${resolvedSlot})` : 'ซิงค์กับเซฟในเครื่องพร้อมใช้งาน')
      setLoading(false)
    })

    return () => {
      active = false
      unsub()
    }
  }, [])

  const handleOpenChest = useCallback(
    async ({
      tierId,
      paymentMode,
      category,
    }: {
      tierId: ChestTierId
      paymentMode: ChestPaymentMode
      category?: ItemCategory
    }): Promise<OpenTreasureChestResult> => {
      if (!save) {
        return { ok: false, error: 'กำลังโหลดข้อมูลตัวละคร', nextGold: 0, nextInventory: [] }
      }
      const cap = getInventoryCapacity(save)
      const applied = applyTreasureChestToSave(save, {
        tierId,
        paymentMode,
        category,
        maxInventorySlots: cap,
      })

      if (!applied.ok || !applied.reward) {
        return {
          ok: false,
          error: applied.error,
          nextGold: save.gold,
          nextInventory: save.inventory,
        }
      }

      setSave(applied.nextSave)
      const cloudUid = user && user.emailVerified ? user.uid : null
      try {
        await persistEncounterSave(applied.nextSave, slotId, cloudUid)
        setSyncNotice(`บันทึกรางวัล "${applied.reward.item.name}" ลงคลังเรียบร้อยแล้ว`)
      } catch {
        setSyncNotice(`บันทึกรางวัล "${applied.reward.item.name}" ในเครื่องแล้ว`)
      }

      return {
        ok: true,
        reward: applied.reward,
        nextGold: applied.nextSave.gold,
        nextInventory: applied.nextSave.inventory,
      }
    },
    [save, slotId, user],
  )

  const handleOpenChestBatch = useCallback(
    async ({
      tierId,
      paymentMode,
      category,
      count,
    }: {
      tierId: ChestTierId
      paymentMode: ChestPaymentMode
      category?: ItemCategory
      count: number
    }): Promise<OpenMultipleTreasureChestsResult> => {
      if (!save) {
        return {
          ok: false,
          error: 'กำลังโหลดข้อมูลตัวละคร',
          rewards: [],
          totalGoldBonus: 0,
          totalSpentGold: 0,
          totalSpentKeyQty: 0,
          nextGold: 0,
          nextInventory: [],
        }
      }
      const cap = getInventoryCapacity(save)
      const applied = applyMultipleTreasureChestsToSave(save, {
        tierId,
        paymentMode,
        category,
        maxInventorySlots: cap,
        count,
      })

      if (!applied.ok || applied.rewards.length === 0) {
        return {
          ...applied,
          ok: false,
          nextGold: save.gold,
          nextInventory: save.inventory,
        }
      }

      setSave(applied.nextSave)
      const cloudUid = user && user.emailVerified ? user.uid : null
      try {
        await persistEncounterSave(applied.nextSave, slotId, cloudUid)
        setSyncNotice(`บันทึกรางวัล x${applied.rewards.length} ลงคลังเรียบร้อยแล้ว (+${formatNum(applied.totalGoldBonus)} G)`)
      } catch {
        setSyncNotice(`บันทึกรางวัล x${applied.rewards.length} ในเครื่องแล้ว (+${formatNum(applied.totalGoldBonus)} G)`)
      }

      return applied
    },
    [save, slotId, user],
  )

  const handleClaimDailyFreeChest = useCallback(
    async ({
      category,
    }: {
      category?: ItemCategory
    }): Promise<ClaimDailyFreeChestResult> => {
      if (!save) {
        return {
          ok: false,
          error: 'กำลังโหลดข้อมูลตัวละคร',
          nextGold: 0,
          nextInventory: [],
          nextClaimedAt: null,
          remainingMs: 0,
        }
      }

      const cap = getInventoryCapacity(save)
      const applied = applyDailyFreeChestToSave(save, {
        maxInventorySlots: cap,
        category,
      })

      if (!applied.ok || !applied.reward) {
        return {
          ...applied,
          ok: false,
          nextGold: save.gold,
          nextInventory: save.inventory,
        }
      }

      setSave(applied.nextSave)
      const cloudUid = user && user.emailVerified ? user.uid : null
      try {
        await persistEncounterSave(applied.nextSave, slotId, cloudUid)
        setSyncNotice(`รับหีบฟรีประจำวัน "${applied.reward.item.name}" ลงคลังเรียบร้อยแล้ว`)
      } catch {
        setSyncNotice(`รับหีบฟรีประจำวัน "${applied.reward.item.name}" ในเครื่องแล้ว`)
      }

      return applied
    },
    [save, slotId, user],
  )

  const maxSlots = save ? getInventoryCapacity(save) : 80
  const keyCount = save ? countChestKeys(save.inventory) : 0

  return (
    <main className="min-h-dvh bg-[#0a0f18] text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 whitespace-nowrap hover:border-sky-400 hover:text-white"
            >
              <ArrowLeft className="size-4" aria-hidden />
              กลับหน้าหลัก
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-amber-200 sm:text-2xl">
                หีบสมบัติผจญภัย (Treasure Chest)
              </h1>
              <p className="text-xs text-slate-400">
                {syncNotice}
                {save ? ` · ${save.name} Lv.${save.level}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {save && (
              <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs tabular-nums">
                <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                  <Coins className="size-3.5" aria-hidden />
                  {formatNum(save.gold)} G
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300">
                  กระเป๋า {save.inventory.length} / {maxSlots}
                </span>
              </div>
            )}
            <Link
              href="/inventory"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-bold text-slate-950 whitespace-nowrap hover:bg-sky-400"
            >
              <Backpack className="size-4" aria-hidden />
              ไปที่คลังไอเทม
            </Link>
          </div>
        </header>

        {loading || !save ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-300">
            กำลังโหลดข้อมูลหีบสมบัติ...
          </div>
        ) : (
          <TreasureChest
            gold={save.gold}
            keyCount={keyCount}
            playerLevel={save.level}
            inventoryCount={save.inventory.length}
            maxInventorySlots={maxSlots}
            lastDailyFreeChestAt={save.lastDailyFreeChestAt ?? null}
            onOpenChest={handleOpenChest}
            onOpenChestBatch={handleOpenChestBatch}
            onClaimDailyFreeChest={handleClaimDailyFreeChest}
            inventoryHref="/inventory"
          />
        )}
      </div>
    </main>
  )
}
