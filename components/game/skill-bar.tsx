'use client'

import { Bot, Flame, Leaf, Shield, Swords, Wind, Zap } from 'lucide-react'
import {
  action,
  castSkill,
  currentJob,
  game,
  gatherNearbyNodeAction,
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
import { getSkillIconPath } from '@/lib/game/vfx-specs'
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
        title="โจมตี / คุย NPC / เก็บเกี่ยว (Space)"
        className="pixel-btn flex h-10 items-center gap-1 bg-primary/20 px-2.5 text-[10px] font-bold text-primary hover:bg-primary/30"
      >
        <Swords className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">โจมตี</span>
        <span className="font-mono text-[8px] opacity-80">[Space]</span>
      </button>

      {job.skills.map((sk, i) => {
        const cd = skillCooldown(sk)
        const lowMp = p.mp < sk.mp
        const ready = cd <= 0 && !lowMp
        const hotkeyLabel = useFKeys ? `F${i + 1}` : String(i + 1)

        return (
          <button
            key={sk.id}
            type="button"
            onClick={() => castSkill(i)}
            disabled={lowMp && cd <= 0}
            title={`${sk.name} · ใช้ ${sk.mp} MP · คูลดาวน์ ${sk.cooldown}s [${hotkeyLabel}]`}
            aria-label={`${sk.name} (${hotkeyLabel}) ใช้ ${sk.mp} MP`}
            className={cn(
              'pixel-btn relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#2b1f1c] transition hover:brightness-110 disabled:opacity-45',
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

  return (
    <div
      data-testid="auto-farm-widget"
      className={cn(
        'pointer-events-none flex flex-col items-end gap-1',
        compactTouchMode ? '' : '',
      )}
    >
      {(comboActive || game.invasion?.active || nearbyNode) && (
        <div className="flex flex-wrap items-center justify-end gap-1">
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
            aria-pressed={isMounted}
            onClick={() => toggleMountRiding()}
            title="ขึ้นขี่ / ลงจากสัตว์ขี่ [M]"
            className={cn(
              'pixel-btn flex items-center gap-1 whitespace-nowrap font-semibold',
              compactTouchMode ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]',
              isMounted
                ? 'bg-amber-500/30 text-amber-200 hover:bg-amber-500/40'
                : 'bg-secondary text-muted-foreground hover:text-foreground',
            )}
          >
            <Wind className="size-3" aria-hidden />
            <span>{isMounted ? 'ลงขี่' : 'ขี่สัตว์'}</span>
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
