'use client'

import { Sparkles, Zap } from 'lucide-react'
import {
  advanceSpiritStageAction,
  resolvePlayerFashionLoadout,
  upgradeSpiritCoreAction,
} from '@/lib/game/engine'
import { sanitizeExtV2 } from '@/lib/game/extended-systems'
import { isSfxMuted, playEnhanceSfx, playQuestClaimSfx } from '@/lib/game/sfx'
import {
  SPIRIT_CORE_DEFS,
  SPIRIT_STAGE_SPECS,
  canAdvanceSpiritStage,
  canUpgradeSpiritCore,
  computeSpiritAwakeningBonuses,
  getSpiritCoreTotalLevels,
  getSpiritStageSpec,
  sanitizeSpiritAwakeningState,
  type SpiritCoreId,
} from '@/lib/game/spirit-system'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { formatNum } from '../format'
import { GameArtIcon } from '../game-badge-icon'
import { SpriteModelCanvas } from '../sprite-model-canvas'

function formatCoreBonusSummary(coreId: SpiritCoreId, level: number): string {
  const lv = Math.max(1, level)
  if (coreId === 'vitality') return `HP +${48 * lv} · DEF +${4 * lv}`
  if (coreId === 'fury') return `ATK +${6 * lv} · จุจิตคริ +${6 * lv}%`
  if (coreId === 'tempest') return `CRIT +${(1.1 * lv).toFixed(1)}% · SPD +${(1.5 * lv).toFixed(1)}%`
  return `ดูดเลือด +${(0.6 * lv).toFixed(1)}% · MP +${24 * lv}`
}

export function SpiritAwakeningSection({
  onNotice,
  compactPreview = false,
}: {
  onNotice?: (res: { ok: boolean; text: string }) => void
  compactPreview?: boolean
}) {
  const { p } = useGame()
  if (!p) return null

  const extV2 = sanitizeExtV2(p.extV2)
  const spirit = sanitizeSpiritAwakeningState(extV2.spiritAwakening)
  const bonuses = computeSpiritAwakeningBonuses(spirit)
  const stageSpec = getSpiritStageSpec(spirit.awakeningStage)
  const totalCores = getSpiritCoreTotalLevels(spirit)
  const rebirthCount = p.rebirthCount ?? 0
  const advanceCheck = canAdvanceSpiritStage(spirit, rebirthCount, p.gold)
  const fashionLoadout = resolvePlayerFashionLoadout(p)

  const handleUpgradeCore = (coreId: SpiritCoreId) => {
    const res = upgradeSpiritCoreAction(coreId)
    playEnhanceSfx(res.ok, isSfxMuted())
    onNotice?.({ ok: res.ok, text: res.message })
  }

  const handleAdvanceStage = () => {
    const res = advanceSpiritStageAction()
    if (res.ok) playQuestClaimSfx(isSfxMuted())
    else playEnhanceSfx(false, isSfxMuted())
    onNotice?.({ ok: res.ok, text: res.message })
  }

  return (
    <div
      data-testid="spirit-awakening-section"
      className="space-y-3 rounded-lg border border-[#325d99]/80 bg-[#0d1523]/95 p-3 text-xs text-slate-100"
    >
      {/* Top Spirit Awakening Stage Header + Live Lotus Aura Preview */}
      <div
        className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[auto_1fr] sm:items-center"
        style={{
          borderColor: `${stageSpec.primaryColor}66`,
          background:
            'radial-gradient(circle at 22% 50%, rgba(56,189,248,0.14), rgba(11,17,30,0.96) 70%)',
        }}
      >
        <div className="mx-auto flex flex-col items-center gap-1">
          <div
            className={cn(
              'grid place-items-center rounded-xl border bg-[#090e1a]',
              compactPreview ? 'size-24' : 'size-28',
            )}
            style={{ borderColor: `${stageSpec.primaryColor}80` }}
          >
            <SpriteModelCanvas
              mode="job"
              id={p.jobId}
              action="auto"
              dir="down"
              size={compactPreview ? 84 : 96}
              fashion={fashionLoadout}
              isGm={p.gm}
              rebirthCount={rebirthCount}
              spiritStage={spirit.awakeningStage}
              label={stageSpec.title}
            />
          </div>
          <span
            className="text-center text-[11px] font-extrabold"
            style={{ color: stageSpec.primaryColor }}
          >
            {stageSpec.shortTitle} (ขั้น {spirit.awakeningStage}/5)
          </span>
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GameArtIcon iconId="spirit" size={22} />
              <div>
                <h3 className="text-sm font-extrabold text-amber-200">ระบบจุจิต · เบิกเนตรแก่นวิญญาณ</h3>
                <p className="text-[11px] text-slate-300">{stageSpec.subtitle}</p>
              </div>
            </div>
            <span className="flex items-center gap-1 rounded border border-amber-400/50 bg-amber-950/50 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300 tabular-nums">
              <GameArtIcon iconId="gold-coin" size={14} />
              {formatNum(p.gold)} G
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 tabular-nums">
            <div className="rounded border border-[#243d63] bg-[#0a111d] px-2 py-1.5">
              <span className="block text-[9.5px] text-slate-400">ระดับแก่นจิตรวม</span>
              <b className="text-xs text-cyan-300">{totalCores} / 40</b>
            </div>
            <div className="rounded border border-[#243d63] bg-[#0a111d] px-2 py-1.5">
              <span className="block text-[9.5px] text-slate-400">สเตตัสจุจิต</span>
              <b className="text-xs text-emerald-300">+{bonuses.allStatPct}% All Stat</b>
            </div>
            <div className="rounded border border-[#243d63] bg-[#0a111d] px-2 py-1.5">
              <span className="block text-[9.5px] text-slate-400">โอกาส Soul Crit</span>
              <b className="text-xs text-amber-300">{(bonuses.soulCritChance * 100).toFixed(1)}%</b>
            </div>
            <div className="rounded border border-[#243d63] bg-[#0a111d] px-2 py-1.5">
              <span className="block text-[9.5px] text-slate-400">ตัวคูณ Soul Crit</span>
              <b className="text-xs text-fuchsia-300">x{bonuses.soulCritMult.toFixed(2)}</b>
            </div>
          </div>

          {/* Stage Track Pills */}
          <div className="flex flex-wrap items-center gap-1">
            {SPIRIT_STAGE_SPECS.slice(1).map((spec) => {
              const unlocked = spirit.awakeningStage >= spec.stage
              const current = spirit.awakeningStage === spec.stage
              return (
                <span
                  key={spec.stage}
                  title={spec.subtitle}
                  className={cn(
                    'rounded border px-2 py-0.5 text-[10px] font-bold',
                    current
                      ? 'border-amber-300 bg-amber-500/20 text-amber-200'
                      : unlocked
                        ? 'border-sky-400/60 bg-sky-900/35 text-sky-200'
                        : 'border-slate-700 bg-slate-900/60 text-slate-500',
                  )}
                >
                  ขั้น {spec.stage}: {spec.shortTitle}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4 Spirit Cores Upgrade Grid */}
      <div className="grid gap-2 sm:grid-cols-2">
        {SPIRIT_CORE_DEFS.map((core) => {
          const lv = spirit.cores[core.id] ?? 0
          const check = canUpgradeSpiritCore(spirit, core.id, p.gold)
          const isMax = lv >= core.maxLevel
          const pct = (lv / core.maxLevel) * 100

          return (
            <div
              key={core.id}
              className="flex flex-col justify-between gap-2 rounded-lg border border-[#26436b] bg-[#101929] p-2.5"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-extrabold" style={{ color: core.color }}>
                      {core.name}
                    </p>
                    <p className="text-[10px] text-slate-400">{core.englishName}</p>
                  </div>
                  <span className="shrink-0 rounded border border-white/15 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-white tabular-nums">
                    Lv.{lv}/{core.maxLevel}
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                  <div
                    className="h-full rounded-full transition-[width] duration-200"
                    style={{ width: `${pct}%`, backgroundColor: core.color }}
                  />
                </div>

                <p className="text-[10.5px] leading-snug text-slate-300">{core.subtitle}</p>
                <p className="font-mono text-[10px] font-semibold text-sky-200 tabular-nums">
                  {lv > 0
                    ? `ผลปัจจุบัน: ${formatCoreBonusSummary(core.id, lv)}`
                    : `ขั้น 1: ${formatCoreBonusSummary(core.id, 1)}`}
                </p>
              </div>

              <button
                type="button"
                data-testid={`spirit-upgrade-${core.id}`}
                disabled={!check.ok}
                onClick={() => handleUpgradeCore(core.id)}
                className={cn(
                  'flex w-full items-center justify-center gap-1.5 rounded border px-2.5 py-1.5 text-[11px] font-extrabold transition-all tabular-nums disabled:opacity-45',
                  check.ok
                    ? 'border-amber-300/80 bg-gradient-to-b from-[#234d85] to-[#132b4f] text-white hover:brightness-115'
                    : 'border-slate-700 bg-slate-900/80 text-slate-400',
                )}
              >
                <Zap className="size-3.5 text-amber-300" aria-hidden />
                {isMax ? 'หล่อหลอมเต็มระดับแล้ว' : `หล่อหลอมแก่นจิต (${formatNum(check.cost)} G)`}
              </button>
            </div>
          )
        })}
      </div>

      {/* Next Stage Breakthrough Bar */}
      <div className="flex flex-col justify-between gap-2.5 rounded-lg border border-amber-400/45 bg-gradient-to-r from-[#171c2e] via-[#1b2238] to-[#131929] p-3 sm:flex-row sm:items-center">
        <div className="space-y-0.5">
          <p className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
            <Sparkles className="size-4 shrink-0" aria-hidden />
            {advanceCheck.nextSpec
              ? `พิธีเบิกเนตรถัดไป: ${advanceCheck.nextSpec.title}`
              : 'บรรลุขั้นจุจิตสูงสุด (นิรันดร์สุริยเทพ) แล้ว!'}
          </p>
          {advanceCheck.nextSpec && (
            <p className="text-[10.5px] text-slate-300 tabular-nums">
              เงื่อนไข: แก่นจิตรวม {totalCores}/{advanceCheck.nextSpec.requiredCoreTotal} · จุติ{' '}
              {rebirthCount}/{advanceCheck.nextSpec.requiredRebirth} · ทอง{' '}
              {formatNum(advanceCheck.nextSpec.goldCost)} G
            </p>
          )}
          {!advanceCheck.ok && advanceCheck.reason && (
            <p className="text-[10px] font-medium text-amber-200/80">{advanceCheck.reason}</p>
          )}
        </div>

        <button
          type="button"
          data-testid="spirit-advance-stage"
          disabled={!advanceCheck.ok}
          onClick={handleAdvanceStage}
          className={cn(
            'shrink-0 px-4 py-2 text-xs font-extrabold tabular-nums disabled:opacity-45',
            advanceCheck.ok ? 'asura-tab-active' : 'asura-tab',
          )}
        >
          {advanceCheck.nextSpec
            ? `เบิกเนตรจุจิตขั้น ${advanceCheck.nextSpec.stage}`
            : 'เบิกเนตรครบทุกขั้น'}
        </button>
      </div>
    </div>
  )
}
