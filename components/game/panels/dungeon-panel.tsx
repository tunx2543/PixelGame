'use client'

import { useCallback, useEffect, useState } from 'react'
import { Coins, Gem, Hammer, Swords, Users } from 'lucide-react'
import { ITEMS } from '@/lib/game/data'
import {
  attackPartyCoopBoss,
  fetchPartyCoopState,
  type PartyCoopState,
} from '@/lib/firebase/rpg-online'
import {
  completeDailyDungeonAction,
  game,
  getStats,
  recordCoopDungeonClearAction,
} from '@/lib/game/engine'
import {
  DAILY_DUNGEONS,
  ELEMENT_META,
  RUNE_DEFS,
  getAttackElement,
  getElementMultiplier,
  sanitizeRpgExt,
  todayIsoDate,
  type DailyDungeonDef,
} from '@/lib/game/rpg-systems'
import { playQuestClaimSfx } from '@/lib/game/sfx'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { PanelFrame, PxButton } from './panels'

export function DungeonPanel() {
  const g = useGame()
  const p = g.p
  const [notice, setNotice] = useState<string | null>(null)
  const [coopState, setCoopState] = useState<PartyCoopState | null>(null)
  const [busyCoop, setBusyCoop] = useState(false)

  const activePartyId = game.party?.partyId ?? 'local_solo_party'
  const playerName = p?.name ?? 'ผู้กล้า'

  const refreshCoop = useCallback(async () => {
    const state = await fetchPartyCoopState(activePartyId, playerName)
    setCoopState(state)
  }, [activePartyId, playerName])

  useEffect(() => {
    void refreshCoop()
  }, [refreshCoop])

  if (!p) return null
  const ext = sanitizeRpgExt(p.rpgExt)
  const today = todayIsoDate()
  const stats = getStats(p)
  const atkElem = getAttackElement(null, ext.equippedRunes)

  const handleEnterDungeon = (d: DailyDungeonDef) => {
    const elem = getElementMultiplier(atkElem, d.element)
    const powerRatio = Math.max(0.85, Math.min(1.6, stats.atk / Math.max(18, d.recommendedLevel * 4)))
    const bonusFactor = Number((powerRatio * elem.multiplier).toFixed(2))
    const res = completeDailyDungeonAction(d.id, bonusFactor)
    if (!res.ok || !res.rewards) {
      setNotice(res.message)
      return
    }
    const extraParts: string[] = []
    if (res.rewards.materialId) extraParts.push(`${ITEMS[res.rewards.materialId]?.name ?? res.rewards.materialId} x2`)
    if (res.rewards.runeId) extraParts.push(RUNE_DEFS[res.rewards.runeId]?.name ?? res.rewards.runeId)
    setNotice(`${res.message}${extraParts.length ? ` · โบนัส: ${extraParts.join(', ')}` : ''}`)
  }

  const handleCoopAttack = async () => {
    if (busyCoop) return
    setBusyCoop(true)
    const partyMult = 1 + Math.max(0, (game.party?.memberIds.length ?? 1) - 1) * 0.25
    const dmg = Math.max(85, Math.round(stats.atk * 3.1 * partyMult))
    const res = await attackPartyCoopBoss(activePartyId, { playerName: p.name, damage: dmg })
    setCoopState(res.state)
    if (res.defeated) {
      recordCoopDungeonClearAction(res.rewards.gold, res.rewards.diamonds, res.rewards.exp, res.rewards.stones)
      playQuestClaimSfx(true)
      setNotice(
        `พิชิตบอสปาร์ตี้สำเร็จ! +${formatNum(res.rewards.gold)} G · +${res.rewards.diamonds} เพชร · หิน x${res.rewards.stones}`,
      )
    } else {
      setNotice(`โจมตีบอส Co-op ทำดาเมจ ${formatNum(dmg)}!`)
    }
    setBusyCoop(false)
  }

  return (
    <PanelFrame
      title="ดันเจี้ยนทรัพยากร & Co-op ปาร์ตี้เรด"
      subtitle={`โควต้าประจำวัน (${today}) · สูงสุดโหมดละ 3 รอบ/วัน + โถงบอส Co-op ไม่จำกัดรอบ`}
    >
      {notice && (
        <div className="mb-3 border border-emerald-400/60 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
          {notice}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {DAILY_DUNGEONS.map((d) => {
          const used = ext.dailyDungeonDate === today ? (ext.dailyDungeonRuns[d.id] ?? 0) : 0
          const left = Math.max(0, d.dailyLimit - used)
          const elem = ELEMENT_META[d.element]
          return (
            <div
              key={d.id}
              className="flex flex-col justify-between gap-3 border border-border/80 bg-background/60 p-3 text-xs"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="border border-border/60 px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ color: elem.color, background: elem.bg }}
                  >
                    {elem.label}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                    เหลือ {left}/{d.dailyLimit} รอบ
                  </span>
                </div>
                <h3 className="text-sm font-bold text-primary">{d.name}</h3>
                <p className="text-[11px] text-muted-foreground">{d.subtitle}</p>
                <div className="space-y-1 border-t border-border/60 pt-2 text-[11px] tabular-nums">
                  <p className="flex items-center gap-1.5 text-gold">
                    <Coins className="size-3.5" aria-hidden /> ทองพื้นฐาน +{formatNum(d.baseGold)} G
                  </p>
                  <p className="flex items-center gap-1.5 text-cyan-300">
                    <Gem className="size-3.5" aria-hidden /> เพชร +{d.baseDiamonds} · EXP +{formatNum(d.baseExp)}
                  </p>
                  <p className="flex items-center gap-1.5 text-amber-300">
                    <Hammer className="size-3.5" aria-hidden /> หินตีบวก x{d.baseStones}
                    {d.bonusRuneId ? ` · มีสิทธิ์รับ ${RUNE_DEFS[d.bonusRuneId]?.name}` : ''}
                  </p>
                </div>
              </div>

              <PxButton
                disabled={left <= 0}
                onClick={() => handleEnterDungeon(d)}
                className="w-full"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Swords className="size-3.5" aria-hidden />
                  {left > 0 ? `บุกทลาย (${left} รอบ)` : 'ครบโควต้าวันนี้แล้ว'}
                </span>
              </PxButton>
            </div>
          )
        })}
      </div>

      {/* Co-op Party Raid Section */}
      {coopState && (
        <div className="mt-4 border border-purple-400/50 bg-purple-500/10 p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-purple-200">
                <Users className="size-4" aria-hidden /> โถงเรดปาร์ตี้ Co-op: {coopState.bossName} (Lv.{coopState.level})
              </h3>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                โหมด: {game.party ? `ปาร์ตี้ "${game.party.name}" (${game.party.memberIds.length} คน)` : 'โหมดซ้อมเดี่ยว (สร้างปาร์ตี้เพื่อเพิ่มดาเมจทีม)'} · พิชิตแล้ว {coopState.clears} ครั้ง
              </p>
            </div>
            <PxButton variant="accent" disabled={busyCoop} onClick={handleCoopAttack}>
              <span className="flex items-center gap-1.5">
                <Swords className="size-3.5" aria-hidden /> ช่วยกันตีบอส Co-op!
              </span>
            </PxButton>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-[11px] tabular-nums">
              <span className="text-purple-200">HP บอส Co-op</span>
              <span>
                {formatNum(coopState.currentHp)} / {formatNum(coopState.maxHp)}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden border border-border bg-muted">
              <div
                className="h-full bg-purple-400 transition-[width]"
                style={{
                  width: `${Math.max(0, Math.round((coopState.currentHp / Math.max(1, coopState.maxHp)) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </PanelFrame>
  )
}

