'use client'

import { useState } from 'react'
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Flame,
  Leaf,
  MessageCircle,
  MessageSquare,
  Shield,
  Wind,
  Zap,
} from 'lucide-react'
import {
  action,
  castSkill,
  currentJob,
  game,
  gatherNearbyNodeAction,
  getJobBasicAttackRange,
  getSkillCastRange,
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
import { GameArtIcon } from './game-badge-icon'
import { QuickItemBar } from './quick-item-bar'

export function SkillBar({ compactTouchMode = false }: { compactTouchMode?: boolean }) {
  const { p } = useGame()
  const layout = useUiLayout()
  const [page, setPage] = useState<1 | 2>(1)

  if (!p) return null

  const job = currentJob()
  const ultPct = Math.min(100, Math.round(game.ultimateCharge))
  const useFKeys = layout.preferences.hotkeyPreset === 'f-keys'

  return (
    <div
      data-testid="skill-bar"
      aria-label="แถบสกิลแนวตั้งอสุรา"
      className={cn(
        'pointer-events-auto flex flex-col items-end gap-1.5 select-none',
        compactTouchMode && 'scale-95 origin-bottom-right',
      )}
    >
      {/* Page Switcher Header: < 1 > */}
      <div className="flex items-center gap-1 rounded border border-[#3a639a]/80 bg-[#0c1626]/90 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow">
        <button
          type="button"
          onClick={() => setPage((cur) => (cur === 1 ? 2 : 1))}
          aria-label="หน้าสกิลก่อนหน้า"
          className="rounded p-0.5 text-slate-300 hover:bg-[#1e3352] hover:text-white"
        >
          <ChevronLeft className="size-3" aria-hidden />
        </button>
        <span className="min-w-4 text-center font-mono text-amber-300 tabular-nums">{page}</span>
        <button
          type="button"
          onClick={() => setPage((cur) => (cur === 1 ? 2 : 1))}
          aria-label="หน้าสกิลถัดไป"
          className="rounded p-0.5 text-slate-300 hover:bg-[#1e3352] hover:text-white"
        >
          <ChevronRight className="size-3" aria-hidden />
        </button>
      </div>

      {/* Page 1: 2-Column Vertical Skills + Ultimate + Dash + Guard */}
      {page === 1 ? (
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#3a639a]/75 bg-[#0b1320]/82 p-1 shadow-xl">
          {job.skills.map((sk, i) => {
            const cd = skillCooldown(sk)
            const lowMp = p.mp < sk.mp
            const ready = cd <= 0 && !lowMp
            const hotkeyLabel = useFKeys ? `F${i + 1}` : String(i + 1)
            const vfxSpec = getSkillVfxSpec(sk.id, sk.color, sk.kind, job.weaponTypes[0])
            const castRange = Math.round(getSkillCastRange(job, sk))
            const rangeLabel =
              sk.kind === 'heal'
                ? 'ฟื้นฟูตัวเอง'
                : sk.kind === 'aoe-self'
                  ? `รอบตัว ${sk.radius ?? 40}px`
                  : job.ranged
                    ? `ตีไกล ${castRange}px`
                    : `ตีใกล้ ${castRange}px`
            const statParts = [
              `${sk.mp} MP`,
              `CD ${sk.cooldown}s`,
              `${sk.mult > 0 ? `${sk.mult}x` : 'ฟื้นฟู/บัฟ'}`,
              rangeLabel,
              (sk.radius ?? 0) > 0 && sk.kind === 'aoe-target' ? `ระเบิด ${sk.radius}px` : null,
              (sk.hits ?? 1) > 1 ? `${sk.hits} ฮิต` : null,
            ].filter(Boolean)

            return (
              <div key={sk.id} className="group/skill relative">
                <button
                  type="button"
                  onClick={() => castSkill(i)}
                  disabled={lowMp && cd <= 0}
                  title={`${sk.name} · ${sk.effectSummary ?? vfxSpec.effectLabel} (${sk.mp} MP · CD ${sk.cooldown}s) [${hotkeyLabel}]`}
                  aria-label={`${sk.name} (${hotkeyLabel})`}
                  className={cn(
                    'relative flex size-9 items-center justify-center overflow-hidden rounded-md border transition hover:brightness-110 disabled:opacity-45 sm:size-10',
                    ready
                      ? 'border-amber-300/90 bg-[#1a2b44] shadow-[0_0_8px_rgba(251,191,36,0.28)]'
                      : 'border-[#335582] bg-[#101a2a]',
                  )}
                >
                  {getSkillIconPath(sk.id) ? (
                    <img src={getSkillIconPath(sk.id)} alt="" className="size-7 rounded object-cover sm:size-8" />
                  ) : (
                    <span className="text-[10px] font-bold" style={{ color: sk.color }}>
                      {sk.name.slice(0, 2)}
                    </span>
                  )}
                  <span className="absolute left-0.5 top-0 font-mono text-[7.5px] font-bold text-white/95 drop-shadow">
                    {hotkeyLabel}
                  </span>
                  <span className="absolute bottom-0 right-0.5 rounded bg-black/75 px-0.5 font-mono text-[7.5px] font-semibold text-sky-300 tabular-nums">
                    {sk.mp}
                  </span>
                  {cd > 0 && (
                    <span className="absolute inset-0 grid place-items-center bg-black/75 font-mono text-[9.5px] font-bold text-amber-200 tabular-nums">
                      {cd.toFixed(1)}
                    </span>
                  )}
                </button>

                <div
                  role="tooltip"
                  className="pointer-events-none invisible absolute right-full top-1/2 z-50 mr-2 hidden w-60 -translate-y-1/2 rounded-lg border border-[#d4a348]/85 bg-[#12101a]/95 p-2.5 text-left opacity-0 shadow-2xl transition duration-150 sm:block group-hover/skill:visible group-hover/skill:opacity-100"
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
                      {sk.tag && <p className="text-[10px] font-medium text-amber-200/90">{sk.tag}</p>}
                    </div>
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] font-semibold text-sky-200 tabular-nums">
                    {statParts.join(' · ')}
                  </p>
                  {sk.effectSummary && (
                    <p className="mt-1 text-[10px] font-semibold text-emerald-300">ผลสกิล: {sk.effectSummary}</p>
                  )}
                  <p className="mt-1 text-[10px] leading-snug text-slate-200/90">{sk.description}</p>
                </div>
              </div>
            )
          })}

          {/* Ultimate [U] */}
          <button
            type="button"
            onClick={() => triggerUltimateSkill()}
            disabled={ultPct < 100}
            aria-label={`สกิลไม้ตาย Ultimate (${ultPct}%) [U]`}
            title="สกิลไม้ตาย Ultimate [U]"
            className={cn(
              'relative flex size-9 flex-col items-center justify-center rounded-md border text-[8.5px] font-extrabold tabular-nums disabled:opacity-50 sm:size-10',
              ultPct >= 100
                ? 'border-amber-300 bg-gradient-to-b from-amber-500/85 to-orange-800/90 text-white shadow-[0_0_10px_rgba(251,191,36,0.45)]'
                : 'border-[#335582] bg-[#101a2a] text-slate-300',
            )}
          >
            <Flame className="size-4 text-amber-300" aria-hidden />
            <span>{ultPct >= 100 ? 'ULT' : `${ultPct}%`}</span>
            <span className="absolute left-0.5 top-0 font-mono text-[7px] text-white/80">U</span>
          </button>

          {/* Dodge Dash [X] */}
          <button
            type="button"
            onClick={() => triggerDodgeDash()}
            disabled={game.dashCd > 0}
            title="พุ่งหลบอมตะ 0.45 วิ [X]"
            aria-label="พุ่งหลบ [X]"
            className="relative flex size-9 flex-col items-center justify-center rounded-md border border-cyan-400/60 bg-[#11263c] text-[8.5px] font-bold text-cyan-200 hover:brightness-110 disabled:opacity-45 tabular-nums sm:size-10"
          >
            <Wind className="size-4" aria-hidden />
            <span>{game.dashCd > 0 ? `${game.dashCd.toFixed(1)}` : 'แดช'}</span>
            <span className="absolute left-0.5 top-0 font-mono text-[7px] text-white/80">X</span>
          </button>

          {/* Guard [Shift] */}
          <button
            type="button"
            onClick={() => triggerOpenWorldGuard()}
            disabled={game.guardCd > 0}
            title="ตั้งการ์ดลดดาเมจ 75% [Shift]"
            aria-label="ตั้งการ์ด [Shift]"
            className={cn(
              'relative flex size-9 flex-col items-center justify-center rounded-md border text-[8.5px] font-bold disabled:opacity-45 sm:size-10',
              game.guardUntil > game.time
                ? 'border-sky-300 bg-sky-600/80 text-white'
                : 'border-sky-400/60 bg-[#122238] text-sky-200 hover:brightness-110',
            )}
          >
            <Shield className="size-4" aria-hidden />
            <span>การ์ด</span>
            <span className="absolute left-0.5 top-0 font-mono text-[7px] text-white/80">Shf</span>
          </button>
        </div>
      ) : (
        <QuickItemBar layoutMode="vertical-grid" />
      )}

      {/* Bottom-Right Primary Action Row: Attack / Interact + Quick Chat Focus */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('pixelquest:open-chat'))
            window.setTimeout(() => document.getElementById('chat-input')?.focus(), 30)
          }}
          title="เปิดพิมพ์แชท [Enter]"
          aria-label="เปิดพิมพ์แชท"
          className="grid size-10 place-items-center rounded-lg border-2 border-[#7eb0ee]/80 bg-gradient-to-b from-[#233b5e] to-[#0f1b2d] text-sky-200 shadow-lg hover:brightness-110 sm:size-11"
        >
          <MessageSquare className="size-5" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => action()}
          title={
            game.nearNpc && !game.panel
              ? `คุยกับ ${game.nearNpc.name} [Space / E]`
              : `${job.ranged ? `โจมตีระยะไกล (${Math.round(getJobBasicAttackRange(job))}px)` : `โจมตีระยะประชิด (${Math.round(getJobBasicAttackRange(job))}px)`} / โต้ตอบ [Space]`
          }
          aria-label={game.nearNpc && !game.panel ? `คุยกับ ${game.nearNpc.name}` : 'โจมตี'}
          className={cn(
            'grid size-10 place-items-center rounded-lg border-2 shadow-lg transition-transform hover:scale-105 sm:size-11',
            game.nearNpc && !game.panel
              ? 'border-emerald-300 bg-gradient-to-b from-emerald-500 to-emerald-800 text-white'
              : 'border-amber-300 bg-gradient-to-b from-[#345480] to-[#14253d] text-amber-200',
          )}
        >
          {game.nearNpc && !game.panel ? (
            <MessageCircle className="size-5" aria-hidden />
          ) : (
            <GameArtIcon iconId="pk-swords" size={24} />
          )}
        </button>
      </div>
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
      className="pointer-events-none flex flex-col items-end gap-1"
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
            aria-pressed={isMounted}
            onClick={() => toggleMountRiding()}
            className="pixel-btn flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold"
          >
            <Wind className="size-3" aria-hidden />
            <span>{isMounted ? 'ลงขี่' : 'ขึ้นขี่'}</span>
          </button>
        )}

        <button
          type="button"
          aria-pressed={game.autoFarm}
          onClick={() => {
            game.autoFarm = !game.autoFarm
            notify()
          }}
          className="pixel-btn flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold"
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
          className="pixel-btn flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold disabled:opacity-45"
        >
          <Zap className="size-3" aria-hidden />
          สกิล
        </button>
      </div>
    </div>
  )
}
