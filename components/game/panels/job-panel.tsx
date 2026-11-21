'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import { JOBS, type JobDef } from '@/lib/game/data'
import { availableJobs, changeJob, currentJob, resolvePlayerFashionLoadout } from '@/lib/game/engine'
import { getSkillIconPath, getSkillVfxSpec } from '@/lib/game/vfx-specs'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { SkillVfxPreview } from '../skill-vfx-preview'
import { SpriteModelCanvas, type PreviewAction } from '../sprite-model-canvas'
import { PanelFrame, PxButton } from './panels'

const STAT_LABELS: [keyof JobDef, string][] = [
  ['hpMul', 'HP'],
  ['mpMul', 'MP'],
  ['atkMul', 'ATK'],
  ['defMul', 'DEF'],
  ['speedMul', 'SPD'],
]

function StatBars({ job }: { job: JobDef }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {STAT_LABELS.map(([k, label]) => {
        const v = job[k] as number
        return (
          <div key={k} className="text-center">
            <div className="flex h-10 items-end border-2 border-border bg-background">
              <div className="w-full bg-accent" style={{ height: `${Math.min(100, (v / 2.6) * 100)}%` }} />
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
            <p className="text-[10px] text-foreground">x{v}</p>
          </div>
        )
      })}
    </div>
  )
}

function JobTree({ currentJobId }: { currentJobId: string }) {
  const novice = JOBS.novice
  const roots = Object.values(JOBS).filter((j) => j.tier === 1)
  return (
    <div className="space-y-2 text-[11px]">
      {novice && (
        <div className="flex flex-col items-center">
          <div
            className={`flex items-center gap-2 border-2 bg-background px-3 py-1.5 ${
              currentJobId === 'novice' ? 'border-primary' : 'border-border'
            }`}
          >
            <div className="grid size-10 place-items-center border border-[#0e0f1a] bg-[#131726]">
              <SpriteModelCanvas mode="job" id="novice" action="idle" dir="down" size={38} showAura={false} label={`โมเดล ${novice.name}`} />
            </div>
            <div className="text-left leading-tight">
              <p className="font-semibold text-foreground">{novice.name}</p>
              <p className="text-[10px] text-emerald-300">คลาสเริ่มต้น • Lv.1</p>
            </div>
          </div>
          <p className="mt-0.5 text-primary">↓</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-6">
      {roots.map((j) => {
        const nextJobs = Object.values(JOBS).filter(
          (nextJob) => nextJob.from === j.id || Boolean(nextJob.alsoFrom?.includes(j.id)),
        )
        const activeRoot = currentJobId === j.id
        return (
          <div key={j.id} className={`border-2 bg-background p-1.5 text-center ${activeRoot ? 'border-primary' : 'border-border'}`}>
            <div className="mx-auto mb-1 grid size-10 place-items-center border border-[#0e0f1a] bg-[#131726]">
              <SpriteModelCanvas mode="job" id={j.id} action="idle" dir="down" size={38} showAura={false} label={`โมเดล ${j.name}`} />
            </div>
            <p className="font-semibold text-foreground">{j.name}</p>
            <p className="text-muted-foreground">
              Lv.{j.reqLevel}
            </p>
            {nextJobs.length > 0 && <p className="my-0.5 text-primary">↓</p>}
            <div className="flex flex-col gap-1">
              {nextJobs.map((nextJob) => (
                <div
                  key={`${j.id}-${nextJob.id}`}
                  className={`flex items-center justify-center gap-1 border px-1 py-0.5 ${
                    currentJobId === nextJob.id ? 'border-primary bg-primary/10' : 'border-border/60 bg-muted/40'
                  }`}
                >
                  <SpriteModelCanvas mode="job" id={nextJob.id} action="idle" dir="down" size={28} showAura={false} showShadow={false} label={`โมเดล ${nextJob.name}`} />
                  <div className="min-w-0 text-left leading-tight">
                    <p className="truncate text-foreground">{nextJob.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Lv.{nextJob.reqLevel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}

export function JobPanel() {
  const g = useGame()
  const [previewAction, setPreviewAction] = useState<PreviewAction>('auto')
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [vfxNonce, setVfxNonce] = useState(0)
  if (!g.p) return null
  const p = g.p
  const job = currentJob()
  const options = availableJobs()
  const activeSkill = job.skills.find((s) => s.id === selectedSkillId) ?? job.skills[0] ?? null
  const activeVfxSpec = activeSkill
    ? getSkillVfxSpec(activeSkill.id, activeSkill.color, activeSkill.kind, job.weaponTypes[0])
    : null

  return (
    <PanelFrame title="หอปรมาจารย์อาร์ค" subtitle="เปลี่ยนอาชีพเพื่อปลดล็อกสกิลและพลังใหม่">
      <div className="mb-4 border-2 border-border bg-muted p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-20 shrink-0 place-items-center border-2 border-[#0e0f1a] bg-[#131726]">
              <SpriteModelCanvas
                mode="job"
                id={job.id}
                action={previewAction}
                dir="down"
                size={76}
                fashion={resolvePlayerFashionLoadout(p)}
                rebirthCount={p.rebirthCount ?? 0}
                label={`โมเดลอาชีพ ${job.name}`}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">อาชีพปัจจุบัน</p>
              <p className="text-lg text-primary">
                {job.name} <span className="text-sm text-foreground tabular-nums">Lv.{p.level}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{job.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ['auto', 'วนลูป'],
                ['idle', 'ยืน'],
                ['walk', 'เดิน'],
                ['attack', 'โจมตี'],
                ['skill', 'ใช้สกิล'],
              ] as Array<[PreviewAction, string]>
            ).map(([act, lbl]) => (
              <button
                key={act}
                type="button"
                onClick={() => setPreviewAction(act)}
                className={`pixel-btn px-2 py-1 text-[10px] ${
                  previewAction === act ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {job.skills.length > 0 && (
          <div className="mt-3 border-t border-border/60 pt-3">
            <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
              สกิลประจำอาชีพทั้ง {job.skills.length} ท่า (คลิกเพื่อดูรายละเอียดและตัวอย่าง VFX)
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
              {job.skills.map((s, idx) => {
                const vfx = getSkillVfxSpec(s.id, s.color, s.kind, job.weaponTypes[0])
                const picked = activeSkill?.id === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={picked}
                    onClick={() => {
                      setSelectedSkillId(s.id)
                      setVfxNonce((n) => n + 1)
                    }}
                    className={`flex items-center gap-2 border p-1.5 text-left transition-colors ${
                      picked
                        ? 'border-primary bg-primary/15 text-foreground'
                        : 'border-border bg-background/70 hover:border-primary/60'
                    }`}
                  >
                    <img
                      src={getSkillIconPath(s.id)}
                      alt=""
                      width={28}
                      height={28}
                      className="pixelated size-7 shrink-0 rounded border border-border/80 bg-[#0e0f1a] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold" style={{ color: vfx.primaryColor }}>
                        {idx + 1}. {s.name}
                      </p>
                      <p className="truncate font-mono text-[9.5px] text-muted-foreground tabular-nums">
                        {s.mp} MP · CD {s.cooldown}s · {s.mult > 0 ? `${s.mult}x` : 'บัฟ/ฮีล'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {activeSkill && (
              <div className="mt-2 grid gap-2.5 border border-border/70 bg-[#0a0d1c]/75 p-2 sm:grid-cols-[17rem_1fr] sm:items-center">
                <SkillVfxPreview
                  jobId={job.id}
                  skillId={activeSkill.id}
                  rebirthCount={p.rebirthCount ?? 0}
                  playNonce={vfxNonce}
                  width={272}
                  height={116}
                  label={`ตัวอย่างเอฟเฟค ${activeSkill.name}`}
                />
                <div className="flex flex-col gap-1 text-[11px]">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="font-bold text-foreground">{activeSkill.name}</p>
                    {activeSkill.tag && (
                      <span className="text-[10px] font-semibold text-amber-300/90">{activeSkill.tag}</span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-sky-300 tabular-nums">
                    {activeSkill.mp} MP · CD {activeSkill.cooldown}s ·{' '}
                    {activeSkill.mult > 0 ? `ความแรง ${activeSkill.mult}x` : 'ฟื้นฟู/บัฟ'}
                    {(activeSkill.radius ?? 0) > 0 ? ` · รัศมี ${activeSkill.radius}px` : ' · เป้าหมายเดี่ยว'}
                    {(activeSkill.hits ?? 1) > 1 ? ` · ${activeSkill.hits} ฮิต` : ''}
                  </p>
                  {activeSkill.effectSummary && (
                    <p className="text-[10.5px] font-semibold text-emerald-300">
                      ผลสกิล: {activeSkill.effectSummary}
                    </p>
                  )}
                  <p className="text-[10.5px] leading-snug text-slate-200/90">{activeSkill.description}</p>
                  {activeVfxSpec && (
                    <p className="text-[10px]" style={{ color: activeVfxSpec.primaryColor }}>
                      VFX: {activeVfxSpec.effectLabel}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setVfxNonce((n) => n + 1)}
                    className="pixel-btn mt-1 inline-flex w-fit items-center gap-1 bg-accent px-2.5 py-1 text-[10px] font-bold text-accent-foreground hover:brightness-110"
                  >
                    <Play className="size-3" aria-hidden />
                    ทดสอบเอฟเฟคสกิล
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {options.length === 0 ? (
        <p className="py-6 text-center text-sm text-gold">คุณถึงอาชีพขั้นสูงสุดแล้ว! ยอดเยี่ยมมาก นักผจญภัย</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {options.map((j) => {
            const levelOk = p.level >= j.reqLevel
            const goldOk = p.gold >= j.cost
            return (
              <li key={j.id} className="flex flex-col gap-2.5 border-2 border-border bg-muted p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-16 shrink-0 place-items-center border-2 border-[#0e0f1a] bg-[#131726]">
                      <SpriteModelCanvas
                        mode="job"
                        id={j.id}
                        action={previewAction}
                        dir="down"
                        size={62}
                        label={`โมเดล ${j.name}`}
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-base text-foreground">{j.name}</p>
                        {j.goldBonus ? (
                          <span className="border border-gold/50 bg-gold/10 px-1.5 py-0.5 text-[9px] font-bold text-gold tabular-nums">
                            +{Math.round(j.goldBonus * 100)}% Gold
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{j.description}</p>
                    </div>
                  </div>
                  <span className="shrink-0 border-2 border-border px-1.5 text-[10px] text-accent">
                    {j.ranged ? 'ระยะไกล' : 'ระยะประชิด'}
                  </span>
                </div>
                <StatBars job={j} />
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-muted-foreground">สกิลสายอาชีพ ({j.skills.length} ท่า)</p>
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {j.skills.map((s) => {
                      const vfx = getSkillVfxSpec(s.id, s.color, s.kind, j.weaponTypes[0])
                      return (
                        <li
                          key={s.id}
                          className="flex items-start gap-1.5 border border-border/80 bg-background/80 p-1.5 text-[10px]"
                        >
                          <img
                            src={getSkillIconPath(s.id)}
                            alt=""
                            width={24}
                            height={24}
                            className="pixelated size-6 shrink-0 rounded border border-border/70 bg-[#0e0f1a] object-cover"
                          />
                          <div className="min-w-0 flex-1 leading-tight">
                            <p className="truncate font-bold" style={{ color: vfx.primaryColor }}>
                              {s.name}
                            </p>
                            <p className="font-mono text-[9px] text-muted-foreground tabular-nums">
                              {s.mp} MP · {s.cooldown}s · {s.mult > 0 ? `${s.mult}x` : 'ฮีล/บัฟ'}
                            </p>
                            {s.effectSummary && (
                              <p className="truncate text-[9.5px] text-emerald-300">{s.effectSummary}</p>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className={levelOk ? 'text-accent' : 'text-destructive'}>ต้องการ Lv.{j.reqLevel}</span>
                  <span className={goldOk ? 'text-gold' : 'text-destructive'}>{j.cost ? `${formatNum(j.cost)} G` : 'ฟรี'}</span>
                </div>
                <PxButton onClick={() => changeJob(j.id)} disabled={!levelOk || !goldOk} className="py-2 text-sm">
                  เปลี่ยนเป็น {j.name}
                </PxButton>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-4">
        <p className="mb-1.5 text-xs text-muted-foreground">สายอาชีพทั้งหมด ({JOBS.novice.name} → 6 คลาสหลัก → 8 คลาส 2)</p>
        <JobTree currentJobId={p.jobId} />
      </div>
    </PanelFrame>
  )
}
