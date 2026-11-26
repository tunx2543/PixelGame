'use client'

import { useState } from 'react'
import {
  CalendarDays,
  Clock,
  Compass,
  Crosshair,
  DoorOpen,
  Fish,
  Flag,
  Gift,
  Lock,
  MapPin,
  ShieldAlert,
  Sparkles,
  Timer,
  Trophy,
} from 'lucide-react'
import {
  ACTIVITY_DEFS,
  BOUNTY_TARGETS,
  DISPLAY_WEEKDAY_ORDER,
  THAI_WEEKDAY_SHORT,
  getActivityByMapId,
  getActivityScheduleStatus,
  getBountyTargetById,
  getTodayOpenActivities,
  isActivityMapId,
  type ActivityId,
} from '@/lib/game/activities'
import {
  enterActivityAction,
  exitActivityAction,
  setSelectedActivityBountyAction,
} from '@/lib/game/engine'
import { ITEMS } from '@/lib/game/data'
import { sanitizeExtV2 } from '@/lib/game/extended-systems'
import { ITEM_RARITY_META } from '@/lib/game/items'
import { MAPS } from '@/lib/game/maps'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { ItemIcon } from '../item-icon'
import { PanelFrame, PxButton } from './panels'

const ACTIVITY_ICON_MAP = {
  invasion: ShieldAlert,
  guild_war: Flag,
  bounty: Crosshair,
  treasure: Compass,
  boss_rush: Timer,
  fishing: Fish,
} as const

export function ActivitiesPanel() {
  const { p } = useGame()
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  if (!p) return null

  const extV2 = sanitizeExtV2(p.extV2)
  const actProg = extV2.activities
  const insideActivity = getActivityByMapId(p.mapId)
  const selectedBountyId = actProg?.selectedBountyId ?? BOUNTY_TARGETS[0].id
  const nowMs = Date.now()
  const openTodayCount = getTodayOpenActivities(nowMs).length
  const sampleSchedule = getActivityScheduleStatus(ACTIVITY_DEFS[0].id, nowMs)

  const orderedDefs = [...ACTIVITY_DEFS].sort((a, b) => {
    const aHere = isActivityMapId(p.mapId) && p.mapId === a.mapId ? 1 : 0
    const bHere = isActivityMapId(p.mapId) && p.mapId === b.mapId ? 1 : 0
    if (aHere !== bHere) return bHere - aHere
    const aOpen = getActivityScheduleStatus(a.id, nowMs).open ? 1 : 0
    const bOpen = getActivityScheduleStatus(b.id, nowMs).open ? 1 : 0
    return bOpen - aOpen
  })

  const handleEnter = (activityId: ActivityId) => {
    const res = enterActivityAction(
      activityId,
      activityId === 'bounty' ? { bountyId: selectedBountyId } : undefined,
    )
    setNotice({ ok: res.ok, text: res.message })
  }

  const handleExit = () => {
    const res = exitActivityAction()
    setNotice({ ok: res.ok, text: res.message })
  }

  const handleSelectBounty = (bountyId: string) => {
    const res = setSelectedActivityBountyAction(bountyId)
    setNotice({ ok: res.ok, text: res.message })
  }

  return (
    <PanelFrame
      title="กิจกรรมพิเศษประจำวัน (Non-Festival)"
      subtitle="เปิดคละวันตามตารางเวลาไทย (UTC+7) · วาร์ปเข้า-ออกแต่ละแผนที่กิจกรรมได้จากหน้านี้เท่านั้น"
    >
      <div className="space-y-3">
        {insideActivity ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-amber-400/70 bg-amber-950/35 px-3 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <MapPin className="size-4 shrink-0" aria-hidden />
                <span>กำลังอยู่ในแผนที่: {MAPS[insideActivity.mapId]?.name ?? insideActivity.name}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-amber-100/80">
                ไม่มีประตูวาร์ปออกตามขอบแผนที่ — กดปุ่มวาร์ปออกด้านขวาเมื่อต้องการกลับจุดเดิม
              </p>
            </div>
            <PxButton variant="danger" onClick={handleExit} className="flex shrink-0 items-center gap-1.5 font-bold">
              <DoorOpen className="size-3.5" aria-hidden />
              วาร์ปออกจากกิจกรรม
            </PxButton>
          </div>
        ) : (
          <div
            data-testid="activities-schedule-banner"
            className="flex flex-wrap items-center justify-between gap-2 border border-sky-400/40 bg-sky-950/25 px-3 py-2 text-xs text-sky-100/90"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 shrink-0 text-sky-300" aria-hidden />
              <span>
                วันนี้วัน{sampleSchedule.currentWeekdayFull} · เปิดให้เข้าเล่น{' '}
                <strong className="text-emerald-300 tabular-nums">
                  {openTodayCount}/{ACTIVITY_DEFS.length}
                </strong>{' '}
                กิจกรรม (สลับหมุนเวียนวันเปิดตลอดสัปดาห์)
              </span>
            </div>
            <span className="text-[11px] font-semibold text-amber-300 tabular-nums">
              Lv.ปัจจุบัน: {p.level}
            </span>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className={cn(
              'border px-3 py-1.5 text-xs font-medium',
              notice.ok
                ? 'border-emerald-400/60 bg-emerald-950/40 text-emerald-200'
                : 'border-rose-400/60 bg-rose-950/40 text-rose-200',
            )}
          >
            {notice.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {orderedDefs.map((def) => {
            const Icon = ACTIVITY_ICON_MAP[def.id]
            const schedule = getActivityScheduleStatus(def.id, nowMs)
            const dailyClears = actProg?.dailyClears[def.id] ?? 0
            const totalClears = actProg?.totalClears[def.id] ?? 0
            const isHere = isActivityMapId(p.mapId) && p.mapId === def.mapId
            const targetMapName = MAPS[def.mapId]?.name ?? def.name
            const selectedBounty = def.id === 'bounty' ? getBountyTargetById(selectedBountyId) : null

            let recordText = `เคลียร์สะสม ${totalClears} ครั้ง`
            if (def.id === 'boss_rush' && actProg?.bossRushBestSec != null) {
              recordText = `สถิติไวสุด ${actProg.bossRushBestSec.toFixed(1)} วิ`
            } else if (def.id === 'fishing' && (actProg?.fishingBestScore ?? 0) > 0) {
              recordText = `คะแนนสูงสุด ${actProg?.fishingBestScore} แต้ม`
            } else if (def.id === 'guild_war' && (actProg?.guildWarPoints ?? 0) > 0) {
              recordText = `เกียรติยศกิลด์ ${actProg?.guildWarPoints} แต้ม`
            }

            return (
              <article
                key={def.id}
                data-testid={`activity-card-${def.id}`}
                data-open={schedule.open ? 'true' : 'false'}
                className={cn(
                  'flex flex-col justify-between gap-2.5 border-2 p-3 transition-colors',
                  isHere
                    ? 'border-amber-400/85 bg-[#1b1f33]'
                    : schedule.open
                      ? 'border-border/80 bg-[#111827]/95 hover:border-primary/60'
                      : 'border-slate-800/90 bg-[#0b101b]/90 opacity-85',
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className="grid size-9 shrink-0 place-items-center border border-white/15 bg-black/40"
                        style={{ color: schedule.open ? def.accentColor : '#64748b' }}
                      >
                        <Icon className="size-5" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-foreground">{def.name}</h3>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          {def.subtitle} · <span className="text-sky-300/90">แมพ: {targetMapName}</span>
                        </p>
                      </div>
                    </div>
                    <span
                      data-testid={`activity-status-${def.id}`}
                      className={cn(
                        'shrink-0 border px-1.5 py-0.5 text-[10px] font-bold',
                        !schedule.open
                          ? 'border-slate-600/70 bg-slate-800/80 text-slate-300'
                          : schedule.isPeakBonus
                            ? 'border-amber-400/70 bg-amber-500/15 text-amber-200'
                            : 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200',
                      )}
                    >
                      {schedule.badgeText}
                    </span>
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-300">{def.description}</p>

                  <div className="space-y-1.5 border border-white/10 bg-black/30 p-2">
                    <div className="flex items-center justify-between gap-2 text-[10.5px]">
                      <span className="flex items-center gap-1 font-semibold text-sky-200">
                        <CalendarDays className="size-3 shrink-0 text-sky-300" aria-hidden />
                        เปิดวัน {schedule.openDaysLabel}
                      </span>
                      {!schedule.open && (
                        <span className="shrink-0 text-[10px] text-amber-300/90">
                          เปิดถัดไป: วัน{schedule.nextOpenDayFull}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-7 gap-1" aria-label={`ตารางวันเปิดของ ${def.name}`}>
                      {DISPLAY_WEEKDAY_ORDER.map((weekday) => {
                        const isOpenDay = schedule.openWeekdays.includes(weekday)
                        const isToday = schedule.currentWeekday === weekday
                        return (
                          <div
                            key={weekday}
                            className={cn(
                              'border py-0.5 text-center text-[10px] font-bold tabular-nums',
                              isToday && isOpenDay
                                ? 'border-emerald-400 bg-emerald-500/25 text-emerald-100'
                                : isToday && !isOpenDay
                                  ? 'border-rose-400/70 bg-rose-950/50 text-rose-200'
                                  : isOpenDay
                                    ? 'border-sky-500/35 bg-sky-950/35 text-sky-200'
                                    : 'border-white/5 bg-black/40 text-slate-500',
                            )}
                          >
                            {THAI_WEEKDAY_SHORT[weekday]}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {def.id === 'bounty' && selectedBounty && (
                    <div className="space-y-1 border border-amber-500/35 bg-black/30 p-2">
                      <label htmlFor="bounty-target-select" className="block text-[10px] font-bold text-amber-300">
                        เลือกประกาศค่าหัวเป้าหมาย:
                      </label>
                      <select
                        id="bounty-target-select"
                        value={selectedBounty.id}
                        onChange={(e) => handleSelectBounty(e.target.value)}
                        className="w-full border border-border bg-[#0b101b] px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                      >
                        {BOUNTY_TARGETS.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.tierLabel} · {b.name} (+{b.bonusGold.toLocaleString()} G / +{b.bonusDiamonds} เพชร)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5 border border-white/10 bg-black/30 p-2">
                    <div className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-300">
                      <Gift className="size-3 shrink-0" aria-hidden />
                      <span className="truncate">{def.rewardSummary}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5" data-testid={`activity-items-${def.id}`}>
                      {def.featuredItemIds.map((itemId) => {
                        const itemDef = ITEMS[itemId]
                        if (!itemDef) return null
                        const rarityMeta = ITEM_RARITY_META[itemDef.defaultRarity ?? 'rare']
                        const isWeaponBox = itemId.startsWith('act_weapon_box_')
                        return (
                          <div
                            key={itemId}
                            title={`${itemDef.name} — ${itemDef.description}`}
                            className={cn(
                              'flex min-w-0 items-center gap-1.5 border bg-[#0b101b]/90 px-1.5 py-1',
                              rarityMeta.borderColorClass,
                            )}
                          >
                            <ItemIcon itemId={itemId} size={18} />
                            <div className="min-w-0 leading-tight">
                              <div className={cn('truncate text-[10.5px] font-bold', rarityMeta.textColorClass)}>
                                {itemDef.name}
                              </div>
                              <div className="text-[9px] text-slate-400">
                                {isWeaponBox
                                  ? 'กล่องสุ่มอาวุธ'
                                  : itemId.startsWith('act_item_')
                                    ? 'ของเฉพาะกิจกรรม'
                                    : itemId === 'pet_essence'
                                      ? 'วัตถุดิบคู่หู'
                                      : 'ปลาระดับตำนาน'}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 border-t border-white/10 pt-2 text-[11px]">
                    <div className="flex items-center gap-1 text-slate-300">
                      <Clock className="size-3 shrink-0 text-sky-300" aria-hidden />
                      <span>
                        เวลา {Math.round(def.durationSec / 60)} นาที · Lv.{def.recommendedLevel}+
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1 font-semibold text-amber-200 tabular-nums">
                      <Trophy className="size-3 shrink-0 text-amber-300" aria-hidden />
                      <span>
                        โควต้าวันนี้ {Math.min(dailyClears, def.dailyCap)}/{def.dailyCap}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2">
                  <span className="truncate text-[10.5px] font-medium text-slate-400 tabular-nums">
                    {recordText}
                  </span>
                  {isHere ? (
                    <PxButton
                      variant="danger"
                      onClick={handleExit}
                      data-testid={`activity-exit-${def.id}`}
                      className="flex shrink-0 items-center gap-1 font-bold"
                    >
                      <DoorOpen className="size-3.5" aria-hidden />
                      วาร์ปออก
                    </PxButton>
                  ) : schedule.open ? (
                    <PxButton
                      variant="primary"
                      onClick={() => handleEnter(def.id)}
                      data-testid={`activity-enter-${def.id}`}
                      className="shrink-0 font-bold"
                    >
                      วาร์ปเข้ากิจกรรม
                    </PxButton>
                  ) : (
                    <PxButton
                      variant="secondary"
                      disabled
                      data-testid={`activity-enter-${def.id}`}
                      className="flex shrink-0 items-center gap-1 font-bold"
                    >
                      <Lock className="size-3" aria-hidden />
                      ปิดวันนี้ (เปิด{schedule.nextOpenDayShort})
                    </PxButton>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </PanelFrame>
  )
}

