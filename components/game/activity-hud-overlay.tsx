'use client'

import {
  Compass,
  Crosshair,
  DoorOpen,
  Fish,
  Flag,
  LayoutGrid,
  RotateCcw,
  ShieldAlert,
  Timer,
} from 'lucide-react'
import {
  computeTreasureCompassHint,
  getActivityDef,
  isActivityMapId,
} from '@/lib/game/activities'
import {
  exitActivityAction,
  game,
  getNearbyActivityPrompt,
  interactActivityObjective,
  openPanel,
  restartCurrentActivityAction,
} from '@/lib/game/engine'
import { TILE } from '@/lib/game/maps'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'

const ACTIVITY_HUD_ICONS = {
  invasion: ShieldAlert,
  guild_war: Flag,
  bounty: Crosshair,
  treasure: Compass,
  boss_rush: Timer,
  fishing: Fish,
} as const

function formatCountdown(sec: number): string {
  const safe = Math.max(0, Math.ceil(sec))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function ActivityHudOverlay() {
  const g = useGame()
  const p = g.p
  const session = g.activitySession

  if (!p || !session || g.zenHud || !isActivityMapId(p.mapId) || session.mapId !== p.mapId) {
    return null
  }

  const def = getActivityDef(session.activityId)
  const Icon = ACTIVITY_HUD_ICONS[session.activityId]
  const aliveMobs = g.monsters.filter((m) => !m.dead).length
  const prompt = getNearbyActivityPrompt()
  const lowTime = session.phase === 'active' && session.remainingSec <= 25

  let objectiveText = ''
  if (session.activityId === 'invasion') {
    objectiveText = `ระลอก ${session.wave}/${session.maxWaves} · ศัตรูคงเหลือ ${aliveMobs} ตัว`
  } else if (session.activityId === 'guild_war') {
    const owned = session.flags.filter((f) => f.owner === 'player').length
    objectiveText = `แต้มสงคราม ${Math.floor(session.score)}/${session.targetScore} · ยึดธงแล้ว ${owned}/3`
  } else if (session.activityId === 'bounty') {
    objectiveText = `${session.bountyName} · เป้าหมายเหลือ ${aliveMobs} ตัว`
  } else if (session.activityId === 'treasure' && session.digSpot) {
    if (!session.digSpot.revealed) {
      const ptx = Math.floor(p.x / TILE)
      const pty = Math.floor(p.y / TILE)
      const hint = computeTreasureCompassHint(ptx, pty, session.digSpot.tx, session.digSpot.ty)
      objectiveText = hint.heatLabel
    } else {
      objectiveText = `พบหีบสมบัติแล้ว! ปราบผู้พิทักษ์ (${aliveMobs} ตัว)`
    }
  } else if (session.activityId === 'boss_rush') {
    objectiveText = `บอสด่าน ${session.stage}/${session.maxStages} · เวลาที่ใช้ ${session.elapsedSec.toFixed(1)} วิ`
  } else if (session.activityId === 'fishing') {
    objectiveText = `คะแนนตกปลา ${Math.floor(session.score)}/${session.targetScore}${
      session.lastCatchText ? ` · ล่าสุด: ${session.lastCatchText}` : ''
    }`
  }

  return (
    <div
      data-testid="activity-hud-overlay"
      className="pointer-events-auto fixed left-1/2 top-2 z-20 flex w-[min(92vw,31rem)] -translate-x-1/2 flex-col gap-1.5 border-2 border-[#3a639a] bg-[#0a101d]/95 px-3 py-2 text-xs shadow-2xl"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon className="size-4 shrink-0" style={{ color: def.accentColor }} aria-hidden />
          <span className="truncate font-bold text-amber-200">{def.name}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              'border px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums',
              lowTime
                ? 'border-rose-400/80 bg-rose-950/60 text-rose-200'
                : 'border-sky-400/40 bg-sky-950/50 text-sky-200',
            )}
          >
            {formatCountdown(session.remainingSec)}
          </span>
          <button
            type="button"
            onClick={() => openPanel('activities')}
            title="เปลี่ยนกิจกรรม"
            className="flex items-center gap-1 border border-slate-500/70 bg-slate-800/90 px-2 py-0.5 text-[10.5px] font-semibold text-slate-100 hover:bg-slate-700"
          >
            <LayoutGrid className="size-3" aria-hidden />
            กิจกรรม
          </button>
          <button
            type="button"
            onClick={() => exitActivityAction()}
            data-testid="activity-hud-exit-btn"
            className="flex items-center gap-1 border border-rose-400/80 bg-rose-800/90 px-2 py-0.5 text-[10.5px] font-bold text-white hover:bg-rose-700"
          >
            <DoorOpen className="size-3" aria-hidden />
            วาร์ปออก
          </button>
        </div>
      </div>

      {session.phase === 'active' ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-1">
          <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-200">{objectiveText}</p>
          {prompt && (
            <button
              type="button"
              onClick={() => interactActivityObjective()}
              data-testid="activity-hud-interact-btn"
              className="shrink-0 animate-pulse border border-amber-300 bg-amber-500/90 px-2.5 py-0.5 text-[11px] font-bold text-slate-950 hover:bg-amber-400"
            >
              กด [E] {prompt.label}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-1">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'truncate text-[11px] font-bold',
                session.phase === 'victory' ? 'text-emerald-300' : 'text-rose-300',
              )}
            >
              {session.phase === 'victory' ? 'ภารกิจสำเร็จ! ' : 'หมดเวลา! '}
              {session.summaryText ?? 'กดเริ่มรอบใหม่หรือวาร์ปออกจากกิจกรรม'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => restartCurrentActivityAction()}
              data-testid="activity-hud-restart-btn"
              className="flex items-center gap-1 border border-emerald-400/80 bg-emerald-700/90 px-2 py-0.5 text-[10.5px] font-bold text-white hover:bg-emerald-600"
            >
              <RotateCcw className="size-3" aria-hidden />
              เริ่มใหม่
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
