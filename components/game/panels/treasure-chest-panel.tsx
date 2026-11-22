'use client'

import { useCallback } from 'react'
import {
  broadcastWorldNewsAction,
  closePanel,
  game,
  getInventoryCapacity,
  notify,
  saveGame,
  say,
} from '@/lib/game/engine'
import {
  applyDailyFreeChestToSave,
  applyMultipleTreasureChestsToSave,
  applyTreasureChestToSave,
  countChestKeys,
  summarizeTreasureChestRewards,
  type ChestPaymentMode,
  type ChestTierId,
  type ClaimDailyFreeChestResult,
  type OpenMultipleTreasureChestsResult,
  type OpenTreasureChestResult,
} from '@/lib/game/treasure-chest'
import type { ItemCategory } from '@/lib/game/item-vfx'
import { useGame } from '@/lib/game/use-game'
import { PanelFrame, PxButton } from './panels'
import { TreasureChest } from '../treasure-chest'

export function TreasureChestPanel() {
  const g = useGame()
  const p = g.p

  const handleOpenChest = useCallback(
    ({
      tierId,
      paymentMode,
      category,
    }: {
      tierId: ChestTierId
      paymentMode: ChestPaymentMode
      category?: ItemCategory
    }): OpenTreasureChestResult => {
      const current = game.p
      if (!current) {
        return { ok: false, error: 'ไม่พบข้อมูลตัวละคร', nextGold: 0, nextInventory: [] }
      }
      const cap = getInventoryCapacity(current)
      const applied = applyTreasureChestToSave(current, {
        tierId,
        paymentMode,
        category,
        maxInventorySlots: cap,
      })

      if (!applied.ok || !applied.reward) {
        return {
          ok: false,
          error: applied.error ?? 'ไม่สามารถเปิดหีบได้',
          nextGold: current.gold,
          nextInventory: current.inventory,
        }
      }

      current.gold = applied.nextSave.gold
      current.inventory = applied.nextSave.inventory
      saveGame()
      notify()

      const { item, goldBonus } = applied.reward
      say('loot', `เปิดหีบสมบัติได้รับ ${item.name} (${item.rarityThaiLabel}) และโบนัส +${goldBonus.toLocaleString()} G!`)
      if (item.rarity === 'mythic' || item.rarity === 'legendary') {
        void broadcastWorldNewsAction(
          'gacha',
          `${current.name} เปิดหีบสมบัติได้รับไอเทมระดับ${item.rarityThaiLabel} "${item.name}"!`,
        )
      }

      return {
        ok: true,
        reward: applied.reward,
        nextGold: current.gold,
        nextInventory: current.inventory,
      }
    },
    [],
  )

  const handleOpenChestBatch = useCallback(
    ({
      tierId,
      paymentMode,
      category,
      count,
    }: {
      tierId: ChestTierId
      paymentMode: ChestPaymentMode
      category?: ItemCategory
      count: number
    }): OpenMultipleTreasureChestsResult => {
      const current = game.p
      if (!current) {
        return {
          ok: false,
          error: 'ไม่พบข้อมูลตัวละคร',
          rewards: [],
          totalGoldBonus: 0,
          totalSpentGold: 0,
          totalSpentKeyQty: 0,
          nextGold: 0,
          nextInventory: [],
        }
      }
      const cap = getInventoryCapacity(current)
      const applied = applyMultipleTreasureChestsToSave(current, {
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
          nextGold: current.gold,
          nextInventory: current.inventory,
        }
      }

      current.gold = applied.nextSave.gold
      current.inventory = applied.nextSave.inventory
      saveGame()
      notify()

      const summary = summarizeTreasureChestRewards(applied.rewards)
      say(
        'loot',
        `Quick Open x${summary.totalCount} ได้รับไอเทม ${summary.totalCount} ชิ้น และโบนัสทองรวม +${applied.totalGoldBonus.toLocaleString()} G!`,
      )

      const bestPull = applied.rewards.find(
        (r) => r.item.rarity === 'mythic' || r.item.rarity === 'legendary',
      )
      if (bestPull) {
        void broadcastWorldNewsAction(
          'gacha',
          `${current.name} เปิดหีบสมบัติ x${summary.totalCount} ได้รับไอเทมระดับ${bestPull.item.rarityThaiLabel} "${bestPull.item.name}"!`,
        )
      }

      return applied
    },
    [],
  )

  const handleClaimDailyFreeChest = useCallback(
    ({ category }: { category?: ItemCategory }): ClaimDailyFreeChestResult => {
      const current = game.p
      if (!current) {
        return {
          ok: false,
          error: 'ไม่พบข้อมูลตัวละคร',
          nextGold: 0,
          nextInventory: [],
          nextClaimedAt: null,
          remainingMs: 0,
        }
      }

      const cap = getInventoryCapacity(current)
      const applied = applyDailyFreeChestToSave(current, {
        maxInventorySlots: cap,
        category,
      })

      if (!applied.ok || !applied.reward) {
        return {
          ...applied,
          ok: false,
          nextGold: current.gold,
          nextInventory: current.inventory,
        }
      }

      current.gold = applied.nextSave.gold
      current.inventory = applied.nextSave.inventory
      current.lastDailyFreeChestAt = applied.nextSave.lastDailyFreeChestAt
      saveGame()
      notify()

      const { item, goldBonus } = applied.reward
      say(
        'loot',
        `เปิดหีบฟรีประจำวันได้รับ ${item.name} (${item.rarityThaiLabel}) และโบนัส +${goldBonus.toLocaleString()} G!`,
      )
      if (item.rarity === 'mythic' || item.rarity === 'legendary') {
        void broadcastWorldNewsAction(
          'gacha',
          `${current.name} เปิดหีบฟรีประจำวันได้รับไอเทมระดับ${item.rarityThaiLabel} "${item.name}"!`,
        )
      }

      return applied
    },
    [],
  )

  if (!p) return null

  const cap = getInventoryCapacity(p)
  const keyCount = countChestKeys(p.inventory)

  return (
    <PanelFrame
      title="หีบสมบัติ & สุ่มไอเทม"
      subtitle="สุ่มไอเทมด้วย generateRandomItem ตามระดับความหายาก 6 ขั้น พร้อมบันทึกเข้ากระเป๋าทันที"
    >
      <div className="space-y-4">
        <TreasureChest
          gold={p.gold}
          keyCount={keyCount}
          playerLevel={p.level}
          inventoryCount={p.inventory.length}
          maxInventorySlots={cap}
          lastDailyFreeChestAt={p.lastDailyFreeChestAt ?? null}
          onOpenChest={handleOpenChest}
          onOpenChestBatch={handleOpenChestBatch}
          onClaimDailyFreeChest={handleClaimDailyFreeChest}
          compact
        />
        <div className="flex justify-end">
          <PxButton variant="secondary" onClick={closePanel}>
            ปิดหน้าต่าง
          </PxButton>
        </div>
      </div>
    </PanelFrame>
  )
}
