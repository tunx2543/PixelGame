'use client'

import { Bot, Flame, Leaf, Shield, Swords, Wind, Zap } from 'lucide-react'
import { useGame } from '@/lib/game/use-game'
import {
  action,
  castSkill,
  currentJob,
  drinkPotion,
  game,
  gatherNearbyNodeAction,
  notify,
  skillCooldown,
  triggerDodgeDash,
  triggerOpenWorldGuard,
  triggerUltimateSkill,
} from '@/lib/game/engine'
import { findNearbyGatheringNode } from '@/lib/game/extended-systems'
import { getSkillIconPath } from '@/lib/game/vfx-specs'

export function AutoFarmWidget({ compactTouchMode = false }: { compactTouchMode?: boolean }) {
  const { p } = useGame()
  if (!p) return null

  const job = currentJob()
  const ultPct = Math.min(100, Math.round(game.ultimateCharge))
  const nearbyNode = findNearbyGatheringNode(p.mapId, p.x, p.y)
  const comboActive = game.comboCount > 1 && game.comboUntil > game.time

  if (compactTouchMode) {
    return (
      <div
        data-testid="auto-farm-widget"
        className="pointer-events-auto pixel-panel absolute bottom-[7.6rem] right-2 z-20 flex items-center gap-1 p-1 shadow-lg"
      >
        {nearbyNode && (
          <button
            type="button"
            onClick={() => gatherNearbyNodeAction(nearbyNode.id)}
            className="pixel-btn flex items-center gap-1 whitespace-nowrap bg-emerald-500/25 px-1.5 py-1 text-[9px] font-semibold text-emerald-200"
          >
            <Leaf className="size-3" aria-hidden />
            เก็บ
          </button>
        )}
        <button
          type="button"
          disabled={game.dashCd > 0}
          onClick={() => triggerDodgeDash()}
          className="pixel-btn flex items-center gap-1 whitespace-nowrap bg-cyan-500/20 px-1.5 py-1 text-[9px] font-semibold text-cyan-200 disabled:opacity-45"
        >
          <Wind className="size-3" aria-hidden />
          แดช
        </button>
        <button
          type="button"
          disabled={ultPct < 100}
          onClick={() => triggerUltimateSkill()}
          aria-label={`สกิลไม้ตาย Ultimate (${ultPct}%) [U]`}
          className={`pixel-btn flex items-center gap-1 whitespace-nowrap px-1.5 py-1 text-[9px] font-semibold disabled:opacity-45 ${
            ultPct >= 100 ? 'bg-amber-400/30 text-amber-200' : 'bg-secondary text-muted-foreground'
          }`}
        >
          <Flame className="size-3" aria-hidden />
          {ultPct}%
        </button>
        <button
          type="button"
          aria-pressed={game.autoFarm}
          onClick={() => {
            game.autoFarm = !game.autoFarm
            notify()
          }}
          className={`pixel-btn flex items-center gap-1 whitespace-nowrap px-1.5 py-1 text-[9px] font-semibold ${
            game.autoFarm
              ? 'bg-emerald-500/25 text-emerald-300'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bot className="size-3" aria-hidden />
          {game.autoFarm ? 'หยุดออโต้' : 'ออโต้'}
        </button>
        <button
          type="button"
          disabled={!game.autoFarm}
          aria-pressed={game.autoSkills}
          onClick={() => {
            game.autoSkills = !game.autoSkills
            notify()
          }}
          className={`pixel-btn flex items-center gap-1 whitespace-nowrap px-1.5 py-1 text-[9px] font-semibold disabled:opacity-45 ${
            game.autoSkills && game.autoFarm
              ? 'bg-purple-500/25 text-purple-200'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          <Zap className="size-3" aria-hidden />
          สกิล
        </button>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute bottom-11 right-2 z-20 flex max-w-[calc(100vw-1rem)] flex-col items-end gap-1 sm:bottom-2">
      {(comboActive || game.invasion?.active || nearbyNode) && (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
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
        data-testid="auto-farm-widget"
        className="pointer-events-auto pixel-panel flex max-w-full flex-wrap items-center justify-end gap-1 p-1 shadow-lg"
      >
        <button
          type="button"
          onClick={() => action()}
          title="โจมตี / คุย NPC / เก็บเกี่ยว (Space)"
          className="pixel-btn flex items-center gap-1 bg-primary/20 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/30"
        >
          <Swords className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">โจมตี</span>
          <span className="font-mono text-[8px] opacity-75">[Space]</span>
        </button>

        {job.skills.map((sk, i) => {
          const cd = skillCooldown(sk)
          const lowMp = p.mp < sk.mp
          return (
            <button
              key={sk.id}
              type="button"
              onClick={() => castSkill(i)}
              disabled={lowMp && cd <= 0}
              title={`${sk.name} (MP ${sk.mp}) [${i + 1}]`}
              className="pixel-btn relative flex size-8 shrink-0 items-center justify-center overflow-hidden bg-secondary hover:brightness-110 disabled:opacity-45"
            >
              {getSkillIconPath(sk.id) ? (
                <img src={getSkillIconPath(sk.id)} alt={sk.name} className="asset-no-bg size-6 object-cover" />
              ) : (
                <span className="text-[9px] font-bold" style={{ color: sk.color }}>
                  {i + 1}
                </span>
              )}
              <span className="absolute left-0.5 top-0 font-mono text-[8px] font-bold text-white/90">
                {i + 1}
              </span>
              {cd > 0 && (
                <span className="absolute inset-0 grid place-items-center bg-black/70 font-mono text-[9px] font-bold text-white tabular-nums">
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
          title="สกิลไม้ตาย Ultimate (U)"
          className={`pixel-btn flex items-center gap-1 px-1.5 py-1 text-[10px] font-bold tabular-nums disabled:opacity-50 ${
            ultPct >= 100 ? 'bg-amber-400/30 text-amber-200 hover:bg-amber-400/40' : 'bg-secondary text-muted-foreground'
          }`}
        >
          <Flame className="size-3.5" aria-hidden />
          <span>{ultPct >= 100 ? 'อัลติ [U]' : `${ultPct}%`}</span>
        </button>

        <button
          type="button"
          onClick={() => triggerDodgeDash()}
          disabled={game.dashCd > 0}
          title="พุ่งหลบอมตะ 0.45 วิ (X)"
          className="pixel-btn flex items-center gap-1 bg-cyan-500/15 px-1.5 py-1 text-[10px] font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-45 tabular-nums"
        >
          <Wind className="size-3.5" aria-hidden />
          <span className="hidden md:inline">{game.dashCd > 0 ? `${game.dashCd.toFixed(1)}s` : 'แดช'}</span>
          <span className="font-mono text-[8px] opacity-75">[X]</span>
        </button>

        <button
          type="button"
          onClick={() => triggerOpenWorldGuard()}
          disabled={game.guardCd > 0}
          title="ตั้งการ์ดลดดาเมจ 75% (Shift)"
          className={`pixel-btn relative flex items-center gap-1 px-1.5 py-1 text-[10px] font-semibold disabled:opacity-50 ${
            game.guardUntil > game.time
              ? 'bg-sky-500/35 text-sky-200'
              : 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
          }`}
        >
          <Shield className="size-3.5" aria-hidden />
          <span className="hidden md:inline">การ์ด</span>
          <span className="font-mono text-[8px] opacity-75">[Shift]</span>
        </button>

        <button
          type="button"
          onClick={() => drinkPotion('hp')}
          title="ดื่มยา HP (Q)"
          className="pixel-btn bg-hp/20 px-1.5 py-1 text-[10px] font-bold text-[#ff9aa2] hover:bg-hp/30"
        >
          HP <span className="font-mono text-[8px] opacity-75">[Q]</span>
        </button>
        <button
          type="button"
          onClick={() => drinkPotion('mp')}
          title="ดื่มยา MP (R)"
          className="pixel-btn bg-mp/20 px-1.5 py-1 text-[10px] font-bold text-[#8bb8ff] hover:bg-mp/30"
        >
          MP <span className="font-mono text-[8px] opacity-75">[R]</span>
        </button>

        <div className="mx-0.5 h-5 w-px bg-border/70" aria-hidden="true" />

        <button
          type="button"
          aria-pressed={game.autoFarm}
          onClick={() => {
            game.autoFarm = !game.autoFarm
            notify()
          }}
          className={`pixel-btn flex items-center gap-1 whitespace-nowrap px-1.5 py-1 text-[10px] font-semibold ${
            game.autoFarm
              ? 'bg-emerald-500/25 text-emerald-300'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bot className="size-3" aria-hidden />
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
          className={`pixel-btn flex items-center gap-1 whitespace-nowrap px-1.5 py-1 text-[10px] font-semibold disabled:opacity-45 ${
            game.autoSkills && game.autoFarm
              ? 'bg-purple-500/25 text-purple-200'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          <Zap className="size-3" aria-hidden />
          สกิล
        </button>
      </div>
    </div>
  )
}

