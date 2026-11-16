'use client'

import { useState } from 'react'
import { Lock, Sparkles } from 'lucide-react'
import { ITEMS } from '@/lib/game/data'
import {
  canEquip,
  consumeItem,
  currentJob,
  getActiveAccountGameUid,
  getInventoryCapacity,
  getStats,
  isCurrentAccountGm,
  itemLabel,
  itemPower,
  unequip,
} from '@/lib/game/engine'
import {
  EQUIPMENT_RARITY_META,
  formatAffixLabel,
  resolveEffectiveRarity,
} from '@/lib/game/mmo-systems'
import { PERMANENT_GM_GAME_UID } from '@/lib/game/permissions'
import { computeEquipmentSetBonuses } from '@/lib/game/rpg-systems'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { formatNum, formatPlayTime } from '../format'
import { ItemIcon, ItemSlot } from '../item-icon'
import { SpriteModelCanvas } from '../sprite-model-canvas'
import { PanelFrame, PxButton } from './panels'

export function CharacterPanel() {
  const g = useGame()
  const [selected, setSelected] = useState<string | null>(null)
  if (!g.p) return null
  const p = g.p
  const s = getStats()
  const job = currentJob()
  const item = p.inventory.find((i) => i.uid === selected) ?? null
  const def = item ? ITEMS[item.itemId] : null
  const equipErr = item && def && (def.kind === 'weapon' || def.kind === 'armor') ? canEquip(item) : null
  const setBonus = computeEquipmentSetBonuses(p.equipment)
  const itemRarity = item && def ? resolveEffectiveRarity(item, def) : 'common'
  const itemRarityMeta = EQUIPMENT_RARITY_META[itemRarity]

  const isGmDev = Boolean(p.gm && isCurrentAccountGm())
  const displayGameUid = isGmDev ? PERMANENT_GM_GAME_UID : (p.gameUid ?? getActiveAccountGameUid() ?? '-')

  const stats: [string, string][] = [
    ['UID', isGmDev ? `${displayGameUid} (GM·DEV)` : displayGameUid],
    ['อาชีพ', job.name],
    ['เลเวล', String(p.level)],
    ['แต้มสเตตัส', String(p.statPoints ?? 0)],
    ['แต้มสกิล', String(p.skillPoints ?? 0)],
    ['HP สูงสุด', formatNum(s.maxHp)],
    ['MP สูงสุด', formatNum(s.maxMp)],
    ['พลังโจมตี', formatNum(s.atk)],
    ['พลังป้องกัน', formatNum(s.def)],
    ['คริติคอล', `${Math.round(s.crit * 100)}%`],
    ['ระยะโจมตี', job.ranged ? 'ไกล' : 'ประชิด'],
    ['ปราบมอนสเตอร์', formatNum(p.kills)],
    ['เวลาเล่น', formatPlayTime(p.playTime)],
  ]

  return (
    <PanelFrame title="ตัวละคร & กระเป๋า" subtitle={`${p.name} • อาวุธที่ใช้ได้: ${job.weaponTypes.join(', ')}`}>
      <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col items-center gap-1 border-2 border-[#0e0f1a] bg-[#131726] p-2.5">
            <SpriteModelCanvas
              mode="job"
              id={p.jobId}
              action="auto"
              dir="down"
              weaponOverride={p.equipment.weapon ? ITEMS[p.equipment.weapon.itemId]?.weaponType : undefined}
              weaponColorOverride={p.equipment.weapon ? ITEMS[p.equipment.weapon.itemId]?.color : undefined}
              size={84}
              isGm={p.gm}
              rebirthCount={p.rebirthCount ?? 0}
              label={`โมเดลตัวละคร ${p.name}`}
            />
            <p className="text-xs font-bold text-primary">
              {job.name} <span className="text-muted-foreground">Lv.{p.level}</span>
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-y-1 border-2 border-border bg-muted p-2.5 text-xs">
            {stats.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="grid grid-cols-2 gap-2">
            {(['weapon', 'armor', 'shoes', 'cloak', 'accessory'] as const).map((slot) => {
              const it = p.equipment[slot]
              const itDef = it ? ITEMS[it.itemId] : undefined
              const rMeta = it && itDef ? EQUIPMENT_RARITY_META[resolveEffectiveRarity(it, itDef)] : null
              return (
                <div
                  key={slot}
                  className={cn(
                    'flex flex-col items-center gap-1 border-2 bg-muted p-2',
                    rMeta ? rMeta.borderColorClass : 'border-border',
                  )}
                >
                  <p className="text-[10px] text-muted-foreground">{{ weapon: 'อาวุธ', armor: 'เกราะ', shoes: 'รองเท้า', cloak: 'ผ้าคลุม', accessory: 'เครื่องประดับ' }[slot]}</p>
                  <div className="w-12">
                    <ItemSlot item={it} label="ว่าง" />
                  </div>
                  <p className="line-clamp-1 text-center text-[10px] text-foreground">{it ? itemLabel(it) : '-'}</p>
                  {it && (
                    <>
                      {rMeta && (
                        <span className={cn('px-1 py-0.5 text-[9px] font-bold', rMeta.badgeBgClass, rMeta.textColorClass)}>
                          {rMeta.thaiLabel}
                        </span>
                      )}
                      <p className="text-[10px] text-accent">
                        {slot === 'weapon' ? 'ATK' : 'DEF'} +{itemPower(it)}
                      </p>
                      {it.affixes && it.affixes.length > 0 && (
                        <p className="line-clamp-2 text-center text-[9px] leading-tight text-primary">
                          {it.affixes.map(formatAffixLabel).join(' · ')}
                        </p>
                      )}
                      <button type="button" onClick={() => unequip(slot)} className="text-[10px] text-destructive hover:underline">
                        ถอด
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Active Equipment Set Bonuses */}
          <div className="border-2 border-primary/40 bg-primary/5 p-2 text-[11px]">
            <p className="flex items-center gap-1 font-bold text-primary">
              <Sparkles className="size-3.5" aria-hidden /> โบนัสเซ็ตอุปกรณ์
            </p>
            {setBonus.activeLabels.length === 0 ? (
              <p className="mt-1 text-[10px] text-muted-foreground">
                สวมใส่อุปกรณ์ 2 ชิ้นขึ้นไปเพื่อรับโบนัสเซ็ตถาวร
              </p>
            ) : (
              <ul className="mt-1 space-y-0.5 text-[10px] text-emerald-300">
                {setBonus.activeLabels.map((lbl) => (
                  <li key={lbl}>• {lbl}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            กระเป๋า ({p.inventory.length}/{getInventoryCapacity(p)})
          </p>
          <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
            {Array.from({ length: getInventoryCapacity(p) }).map((_, i) => {
              const it = p.inventory[i] ?? null
              return (
                <ItemSlot
                  key={it?.uid ?? `empty-${i}`}
                  item={it}
                  selected={!!it && it.uid === selected}
                  onClick={it ? () => setSelected(it.uid) : undefined}
                />
              )
            })}
          </div>

          {item && def ? (
            <div className={cn('flex items-center gap-3 border-2 bg-muted p-2.5', itemRarityMeta.borderColorClass)}>
              <ItemIcon itemId={item.itemId} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-bold text-foreground">
                    {itemLabel(item)} {item.qty > 1 && <span className="text-muted-foreground">x{item.qty}</span>}
                  </p>
                  {(def.kind === 'weapon' || def.kind === 'armor') && (
                    <span className={cn('px-1.5 py-0.5 text-[10px] font-bold', itemRarityMeta.badgeBgClass, itemRarityMeta.textColorClass)}>
                      {itemRarityMeta.thaiLabel}
                    </span>
                  )}
                  {item.bound && (
                    <span className="inline-flex items-center gap-0.5 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                      <Lock className="size-2.5" aria-hidden /> ผูกมัด
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {def.description}
                  {(def.kind === 'weapon' || def.kind === 'armor') && ` • พลังจริง ${itemPower(item)}`}
                  {def.reqLevel && def.reqLevel > 1 ? ` • Lv.${def.reqLevel}` : ''}
                </p>
                {item.affixes && item.affixes.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.affixes.map((af, idx) => (
                      <span
                        key={`${af.stat}-${idx}`}
                        className="border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                      >
                        {formatAffixLabel(af)}
                      </span>
                    ))}
                  </div>
                )}
                {equipErr && <p className="text-[11px] text-destructive">{equipErr}</p>}
              </div>
              {def.kind === 'consumable' && <PxButton onClick={() => consumeItem(item.uid)}>ใช้</PxButton>}
              {(def.kind === 'weapon' || def.kind === 'armor') && (
                <PxButton
                  onClick={() => {
                    consumeItem(item.uid)
                    setSelected(null)
                  }}
                  disabled={!!equipErr}
                >
                  สวมใส่
                </PxButton>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">คลิกไอเทมเพื่อดูรายละเอียด • ขายของได้ที่พ่อค้า • ฝากของได้ที่คลัง</p>
          )}
        </div>
      </div>
    </PanelFrame>
  )
}
