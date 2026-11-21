'use client'

import { Bot, Flame, Leaf, MessageCircle, Shield, Swords, Wind, Zap } from 'lucide-react'
import {
  action,
  castSkill,
  currentJob,
  game,
  gatherNearbyNodeAction,
  interact,
  notify,
  skillCooldown,
  toggleMountRiding,
  triggerDodgeDash,
  triggerOpenWorldGuard,
  triggerUltimateSkill,
} from '@/lib/game/engine'
import { findNearbyGatheringNode } from '@/lib/game/extended-systems'
import { sanitizeMountState } from '@/lib/game/mounts'
import { useUiLayout } from '@/lib/game/ui-layout'
import { useGame } from '@/lib/game/use-game'
import { getSkillIconPath, getSkillVfxSpec } from '@/lib/game/vfx-specs'
import { cn } from '@/lib/utils'

export function SkillBar({ compactTouchMode = false }: { compactTouchMode?: boolean }) {
  const { p } = useGame()
  const layout = useUiLayout()
  if (!p) return null

  const job = currentJob()
  const ultPct = Math.min(100, Math.round(game.ultimateCharge))
  const useFKeys = layout.preferences.hotkeyPreset === 'f-keys'

  return (
    <div
      data-testid="skill-bar"
      aria-label="แถบสกิลอาชีพ"
      className={cn(
        'pointer-events-auto pixel-panel flex items-center gap-1 bg-[#1b1414]/95 p-1 shadow-xl',
        compactTouchMode && 'max-w-[calc(100vw-1rem)] overflow-x-auto',
      )}
    >
      <button
        type="button"
        onClick={() => action()}
        title={game.nearNpc && !game.panel ? `คุยกับ ${game.nearNpc.name} (Space / E)` : 'โจมตี / คุย NPC / เก็บเกี่ยว (Space)'}
        className={cn(
          'pixel-btn flex h-10 items-center gap-1 px-2.5 text-[10px] font-bold',
          game.nearNpc && !game.panel
            ? 'bg-emerald-500/25 text-emerald-200 hover:bg-emerald-500/35'
            : 'bg-primary/20 text-primary hover:bg-primary/30',
        )}
      >
        {game.nearNpc && !game.panel ? (
          <MessageCircle className="size-3.5" aria-hidden />
        ) : (
          <Swords className="size-3.5" aria-hidden />
        )}
        <span className="hidden sm:inline">{game.nearNpc && !game.panel ? 'คุย NPC' : 'โจมตี'}</span>
        <span className="font-mono text-[8px] opacity-80">[Space]</span>
      </button>

      {job.skills.map((sk, i) => {
        const cd = skillCooldown(sk)
        const lowMp = p.mp < sk.mp
        const ready = cd <= 0 && !lowMp
        const hotkeyLabel = useFKeys ? `F${i + 1}` : String(i + 1)
        const vfxSpec = getSkillVfxSpec(sk.id, sk.color, sk.kind, job.weaponTypes[0])
        const statParts = [
          `${sk.mp} MP`,
          `CD ${sk.cooldown}s`,
          `${sk.mult > 0 ? `${sk.mult}x` : 'ฟื้นฟู/บัฟ'}`,
          sk.radius > 0 ? `รัศมี ${sk.radius}px` : 'เป้าหมายเดี่ยว',
          (sk.hits ?? 1) > 1 ? `${sk.hits} ฮิต` : null,
        ].filter(Boolean)

        return (
          <div key={sk.id} className="group/skill relative shrink-0">
            <button
              type="button"
              onClick={() => castSkill(i)}
              disabled={lowMp && cd <= 0}
              title={`${sk.name} · ${sk.effectSummary ?? vfxSpec.effectLabel} (${sk.mp} MP · CD ${sk.cooldown}s) [${hotkeyLabel}]`}
              aria-label={`${sk.name} (${hotkeyLabel}) ${sk.effectSummary ?? ''} ใช้ ${sk.mp} MP`}
              className={cn(
                'pixel-btn relative flex size-10 items-center justify-center overflow-hidden rounded-lg bg-[#2b1f1c] transition hover:brightness-110 disabled:opacity-45',
                ready
                  ? 'border-[#e8b84e] shadow-[0_0_8px_rgba(232,184,78,0.28)]'
                  : 'border-border/70',
              )}
            >
              {getSkillIconPath(sk.id) ? (
                <img src={getSkillIconPath(sk.id)} alt="" className="size-7 rounded object-cover" />
              ) : (
                <span className="text-[10px] font-bold" style={{ color: sk.color }}>
                  {sk.name.slice(0, 2)}
                </span>
              )}
              <span className="absolute left-0.5 top-0 font-mono text-[8px] font-bold text-white/95 drop-shadow">
                {hotkeyLabel}
              </span>
              <span className="absolute bottom-0 right-0.5 rounded bg-black/75 px-0.5 font-mono text-[8px] font-semibold text-sky-300 tabular-nums">
                {sk.mp}
              </span>
              {cd > 0 && (
                <span className="absolute inset-0 grid place-items-center bg-black/75 font-mono text-[10px] font-bold text-amber-200 tabular-nums">
                  {cd.toFixed(1)}
                </span>
              )}
            </button>

            <div
              role="tooltip"
              className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-lg border border-[#d4a348]/85 bg-[#12101a]/95 p-2.5 text-left opacity-0 shadow-2xl transition duration-150 sm:block group-hover/skill:visible group-hover/skill:opacity-100 group-focus-within/skill:visible group-focus-within/skill:opacity-100"
            >
              <div className="flex items-start gap-2 border-b border-white/10 pb-1.5">
                <img
                  src={getSkillIconPath(sk.id)}
                  alt=""
                  className="size-8 shrink-0 rounded border border-white/20 bg-black/60 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="truncate text-xs font-bold" style={{ color: vfxSpec.primaryColor }}>
                      {sk.name}
                    </p>
                    <span className="shrink-0 font-mono text-[10px] text-white/70">[{hotkeyLabel}]</span>
                  </div>
                  {sk.tag && (
                    <p className="text-[10px] font-medium text-amber-200/90">{sk.tag}</p>
                  )}
                </div>
              </div>
              <p className="mt-1.5 font-mono text-[10px] font-semibold text-sky-200 tabular-nums">
                {statParts.join(' · ')}
              </p>
              {sk.effectSummary && (
                <p className="mt-1 text-[10.5px] font-semibold text-emerald-300">
                  ผลสกิล: {sk.effectSummary}
                </p>
              )}
              <p className="mt-1 text-[10.5px] leading-snug text-slate-200/90">
                {sk.description}
              </p>
              <p className="mt-1 border-t border-white/10 pt-1 text-[9.5px] text-slate-400">
                VFX: {vfxSpec.effectLabel}
              </p>
            </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={() => triggerUltimateSkill()}
        disabled={ultPct < 100}
        aria-label={`สกิลไม้ตาย Ultimate (${ultPct}%) [U]`}
        title="สกิลไม้ตาย Ultimate [U]"
        className={cn(
          'pixel-btn flex h-10 items-center gap-1 px-2 text-[10px] font-bold tabular-nums disabled:opacity-45',
          ultPct >= 100
            ? 'border-amber-300 bg-amber-400/30 text-amber-100 hover:bg-amber-400/40'
            : 'bg-secondary text-muted-foreground',
        )}
      >
        <Flame className="size-3.5" aria-hidden />
        <span>{ultPct >= 100 ? 'อัลติ [U]' : `${ultPct}%`}</span>
      </button>

      <button
        type="button"
        onClick={() => triggerDodgeDash()}
        disabled={game.dashCd > 0}
        title="พุ่งหลบอมตะ 0.45 วิ [X]"
        aria-label="พุ่งหลบ [X]"
        className="pixel-btn flex h-10 items-center gap-1 bg-cyan-500/15 px-2 text-[10px] font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-45 tabular-nums"
      >
        <Wind className="size-3.5" aria-hidden />
        <span className="hidden md:inline">{game.dashCd > 0 ? `${game.dashCd.toFixed(1)}s` : 'แดช'}</span>
        <span className="font-mono text-[8px] opacity-75">[X]</span>
      </button>

      <button
        type="button"
        onClick={() => triggerOpenWorldGuard()}
        disabled={game.guardCd > 0}
        title="ตั้งการ์ดลดดาเมจ 75% [Shift]"
        aria-label="ตั้งการ์ด [Shift]"
        className={cn(
          'pixel-btn flex h-10 items-center gap-1 px-2 text-[10px] font-semibold disabled:opacity-45',
          game.guardUntil > game.time
            ? 'bg-sky-500/35 text-sky-100'
            : 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25',
        )}
      >
        <Shield className="size-3.5" aria-hidden />
        <span className="hidden md:inline">การ์ด</span>
        <span className="font-mono text-[8px] opacity-75">[Shift]</span>
      </button>
    </div>
  )
}

export function CharacterControlBar({ compactTouchMode = false }: { compactTouchMode?: boolean }) {
  const { p } = useGame()
  if (!p) return null

  const nearbyNode = findNearbyGatheringNode(p.mapId, p.x, p.y)
  const comboActive = game.comboCount > 1 && game.comboUntil > game.time
  const mountState = sanitizeMountState(p.mountState, p.ownedGemItems)
  const hasMount = Object.keys(mountState.ownedMounts).length > 0
  const isMounted = Boolean(mountState.activeMountId && mountState.mounted)

  const nearNpc = !game.panel ? game.nearNpc : null

  return (
    <div
      data-testid="auto-farm-widget"
      className={cn(
        'pointer-events-none flex flex-col items-end gap-1',
        compactTouchMode ? '' : '',
      )}
    >
      {(comboActive || game.invasion?.active || nearbyNode || nearNpc) && (
        <div className="flex flex-wrap items-center justify-end gap-1">
          {nearNpc && (
            <button
              type="button"
              onClick={() => interact()}
              className="pointer-events-auto pixel-btn flex items-center gap-1 border border-emerald-300/75 bg-emerald-950/95 px-2.5 py-0.5 text-[10px] font-bold text-emerald-200 shadow-lg hover:brightness-110"
            >
              <MessageCircle className="size-3" aria-hidden />
              คุยกับ {nearNpc.name} [E]
            </button>
          )}
          {game.invasion?.active && (
            <div className="pointer-events-auto border border-rose-400/70 bg-rose-950/90 px-2 py-0.5 text-[10px] font-bold text-rose-200 shadow tabular-nums">
              ป้องกันเมือง Wave {game.invasion.wave}/{game.invasion.maxWaves}
            </div>
          )}
          {comboActive && (
            <div className="border border-amber-400/70 bg-black/85 px-2 py-0.5 text-[10px] font-bold text-amber-300 shadow tabular-nums">
              {game.comboCount}x COMBO!
            </div>
          )}
          {nearbyNode && (
            <button
              type="button"
              onClick={() => gatherNearbyNodeAction(nearbyNode.id)}
              className="pointer-events-auto pixel-btn flex items-center gap-1 border border-emerald-400/60 bg-emerald-950/90 px-2 py-0.5 text-[10px] font-bold text-emerald-200 hover:brightness-110"
            >
              <Leaf className="size-3" aria-hidden />
              {nearbyNode.label} [E]
            </button>
          )}
        </div>
      )}

      <div
        className={cn(
          'pointer-events-auto pixel-panel flex items-center shadow-lg',
          compactTouchMode ? 'gap-0.5 p-0.5' : 'gap-1 p-1',
        )}
      >
        {hasMount && (
          <button
            type="button"
            data-testid="hud-mount-toggle"
            aria-pressed={isMounted}
            onClick={() => toggleMountRiding()}
            title={
              isMounted
                ? 'ลงจากสัตว์ขี่ [M]'
                : mountState.activeMountId
                  ? 'ขึ้นขี่สัตว์ที่เรียกไว้ [M]'
                  : 'เรียกและขึ้นขี่สัตว์ [M]'
            }
            className={cn(
              'pixel-btn flex items-center gap-1 whitespace-nowrap font-semibold',
              compactTouchMode ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]',
              isMounted
                ? 'bg-amber-500/30 text-amber-200 hover:bg-amber-500/40'
                : mountState.activeMountId
                  ? 'bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'
                  : 'bg-secondary text-muted-foreground hover:text-foreground',
            )}
          >
            <Wind className="size-3" aria-hidden />
            <span>{isMounted ? 'ลงขี่' : 'ขึ้นขี่'}</span>
            {!compactTouchMode && <span className="font-mono text-[8px] opacity-75">[M]</span>}
          </button>
        )}

        <button
          type="button"
          aria-pressed={game.autoFarm}
          onClick={() => {
            game.autoFarm = !game.autoFarm
            notify()
          }}
          className={cn(
            'pixel-btn flex items-center gap-1 whitespace-nowrap font-semibold',
            compactTouchMode ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]',
            game.autoFarm
              ? 'bg-emerald-500/25 text-emerald-300'
              : 'bg-secondary text-muted-foreground hover:text-foreground',
          )}
        >
          <Bot className={compactTouchMode ? 'size-3' : 'size-3.5'} aria-hidden />
          {game.autoFarm ? 'หยุดออโต้' : 'ออโต้ฟาร์ม'}
        </button>

        <button
          type="button"
          disabled={!game.autoFarm}
          aria-pressed={game.autoSkills}
          onClick={() => {
            game.autoSkills = !game.autoSkills
            notify()
          }}
          className={cn(
            'pixel-btn flex items-center gap-1 whitespace-nowrap font-semibold disabled:opacity-45',
            compactTouchMode ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]',
            game.autoSkills && game.autoFarm
              ? 'bg-purple-500/25 text-purple-200'
              : 'bg-secondary text-muted-foreground hover:text-foreground',
          )}
        >
          <Zap className={compactTouchMode ? 'size-3' : 'size-3.5'} aria-hidden />
          ออโต้สกิล
        </button>
      </div>
    </div>
  )
}
