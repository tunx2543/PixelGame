'use client'

import { useState } from 'react'
import { Droplets, Footprints, Heart, RotateCw, Shield, Sparkles, Swords, Target, Wand2, Zap } from 'lucide-react'
import { JOBS, type JobDef } from '@/lib/game/data'
import { MODEL_DIRS, type ModelDir } from '@/lib/game/models-2d'
import { formatNum } from './format'
import { SpriteModelCanvas, type PreviewAction } from './sprite-model-canvas'

export type SelectableClassId = 'swordsman' | 'mage' | 'archer'

const DIR_LABELS: Record<ModelDir, string> = {
  down: 'หน้า',
  right: 'ขวา',
  up: 'หลัง',
  left: 'ซ้าย',
}

export interface ClassRoleOption {
  id: SelectableClassId
  englishName: string
  thaiName: string
  tagline: string
  accentClass: string
  badgeClass: string
  job: JobDef
}

export interface ComputedBaseStats {
  maxHp: number
  maxMp: number
  atk: number
  def: number
  speed: number
  critPercent: number
  attackSpeed: number
  range: number
}

export const CLASS_ROLE_OPTIONS: ClassRoleOption[] = [
  {
    id: 'swordsman',
    englishName: 'Warrior',
    thaiName: 'นักดาบ',
    tagline: 'แนวหน้าอึดถึก พลังชีวิตและพลังป้องกันสูง',
    accentClass: 'border-[#e5484d]/70 bg-[#e5484d]/15 text-[#ff8b8e]',
    badgeClass: 'bg-[#e5484d]/20 text-[#ff8b8e]',
    job: JOBS.swordsman,
  },
  {
    id: 'mage',
    englishName: 'Mage',
    thaiName: 'นักเวท',
    tagline: 'โจมตีเวทระยะไกล ดาเมจรุนแรง มานามหาศาล',
    accentClass: 'border-[#4c8bf5]/70 bg-[#4c8bf5]/15 text-[#8cb8ff]',
    badgeClass: 'bg-[#4c8bf5]/20 text-[#8cb8ff]',
    job: JOBS.mage,
  },
  {
    id: 'archer',
    englishName: 'Archer',
    thaiName: 'นักธนู',
    tagline: 'ยิงไกลคล่องตัว ความเร็วโจมตีและคริติคอลสูง',
    accentClass: 'border-[#4fc3a1]/70 bg-[#4fc3a1]/15 text-[#7de2c4]',
    badgeClass: 'bg-[#4fc3a1]/20 text-[#7de2c4]',
    job: JOBS.archer,
  },
]

export function calculateClassBaseStats(classId: string, level = 10): ComputedBaseStats {
  const job = JOBS[classId] ?? JOBS.swordsman
  const safeLevel = Math.max(1, Math.min(999, Math.floor(level)))
  return {
    maxHp: Math.floor((80 + safeLevel * 22) * job.hpMul),
    maxMp: Math.floor((30 + safeLevel * 7) * job.mpMul),
    atk: Math.floor((8 + safeLevel * 2.6) * job.atkMul),
    def: Math.floor((3 + safeLevel * 1.4) * job.defMul),
    speed: Math.round(72 * job.speedMul),
    critPercent: Math.round(job.crit * 100),
    attackSpeed: job.attackSpeed,
    range: job.range,
  }
}

function ClassIcon({ classId, className }: { classId: SelectableClassId; className?: string }) {
  if (classId === 'swordsman') return <Swords className={className} aria-hidden />
  if (classId === 'mage') return <Wand2 className={className} aria-hidden />
  return <Target className={className} aria-hidden />
}

function StatMeter({
  label,
  value,
  maxReference,
  unit = '',
  icon,
  barColor,
}: {
  label: string
  value: number
  maxReference: number
  unit?: string
  icon: React.ReactNode
  barColor: string
}) {
  const pct = Math.min(100, Math.max(6, Math.round((value / Math.max(1, maxReference)) * 100)))

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="font-semibold tabular-nums text-foreground">
          {formatNum(value)}
          {unit}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden border-2 border-[#0e0f1a] bg-muted/80">
        <div
          className={`h-full transition-[width] duration-300 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function CharacterClassSelector({
  value,
  defaultClassId = 'swordsman',
  level = 10,
  onClassChange,
}: {
  value?: SelectableClassId
  defaultClassId?: SelectableClassId
  level?: number
  onClassChange?: (classId: SelectableClassId, stats: ComputedBaseStats, role: ClassRoleOption) => void
}) {
  const [internalClassId, setInternalClassId] = useState<SelectableClassId>(defaultClassId)
  const [previewLevel, setPreviewLevel] = useState<number>(level)
  const [previewAction, setPreviewAction] = useState<PreviewAction>('auto')
  const [previewDir, setPreviewDir] = useState<ModelDir>('down')

  const activeClassId = value ?? internalClassId
  const effectiveLevel = value !== undefined ? level : previewLevel
  const activeRole = CLASS_ROLE_OPTIONS.find((r) => r.id === activeClassId) ?? CLASS_ROLE_OPTIONS[0]
  const stats = calculateClassBaseStats(activeRole.id, effectiveLevel)

  const selectRole = (role: ClassRoleOption) => {
    if (value === undefined) {
      setInternalClassId(role.id)
    }
    const nextStats = calculateClassBaseStats(role.id, effectiveLevel)
    onClassChange?.(role.id, nextStats, role)
  }

  // Reference ceilings at current level for clean proportional stat bars
  const maxHpRef = Math.floor((80 + effectiveLevel * 22) * 1.6)
  const maxMpRef = Math.floor((30 + effectiveLevel * 7) * 2.0)
  const maxAtkRef = Math.floor((8 + effectiveLevel * 2.6) * 1.65)
  const maxDefRef = Math.floor((3 + effectiveLevel * 1.4) * 1.5)

  return (
    <section
      aria-label="เลือกสายอาชีพตัวละคร"
      className="pixel-panel w-full max-w-xl p-4 text-foreground"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border/70 pb-3">
        <div>
          <h2 className="text-base font-bold text-primary">เลือกสายอาชีพ (Character Class)</h2>
          <p className="text-xs text-muted-foreground">
            สลับระหว่าง Warrior, Mage และ Archer เพื่อปรับค่าสถานะพื้นฐานทันที
          </p>
        </div>

        {value === undefined && (
          <div className="flex items-center gap-2 border-2 border-[#0e0f1a] bg-muted px-2.5 py-1 text-xs">
            <span className="text-muted-foreground">จำลอง Lv.</span>
            <button
              type="button"
              onClick={() => {
                const next = Math.max(1, previewLevel - 5)
                setPreviewLevel(next)
                onClassChange?.(activeRole.id, calculateClassBaseStats(activeRole.id, next), activeRole)
              }}
              className="pixel-btn bg-secondary px-1.5 py-0.5 text-[11px] hover:brightness-110"
            >
              -5
            </button>
            <span className="min-w-6 text-center font-bold tabular-nums text-primary">{effectiveLevel}</span>
            <button
              type="button"
              onClick={() => {
                const next = Math.min(99, previewLevel + 5)
                setPreviewLevel(next)
                onClassChange?.(activeRole.id, calculateClassBaseStats(activeRole.id, next), activeRole)
              }}
              className="pixel-btn bg-secondary px-1.5 py-0.5 text-[11px] hover:brightness-110"
            >
              +5
            </button>
          </div>
        )}
      </div>

      {/* Class Selector Buttons */}
      <div role="radiogroup" aria-label="สายอาชีพ" className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {CLASS_ROLE_OPTIONS.map((role) => {
          const isSelected = role.id === activeRole.id
          return (
            <button
              key={role.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => selectRole(role)}
              className={`pixel-btn flex flex-col items-start gap-1.5 p-3 text-left transition-all ${
                isSelected
                  ? `${role.accentClass} ring-2 ring-primary/70`
                  : 'bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <ClassIcon classId={role.id} className="size-4" />
                  {role.englishName}
                </span>
                <span className={`shrink-0 whitespace-nowrap px-1.5 py-0.5 text-[10px] font-semibold ${role.badgeClass}`}>
                  {role.thaiName}
                </span>
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">{role.tagline}</p>
            </button>
          )
        })}
      </div>

      {/* Dynamic Base Stats Panel */}
      <div className="mt-4 border-2 border-border bg-muted/60 p-3.5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <div className={`grid size-8 place-items-center border-2 border-[#0e0f1a] ${activeRole.badgeClass}`}>
              <ClassIcon classId={activeRole.id} className="size-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {activeRole.englishName} ({activeRole.thaiName})
              </p>
              <p className="text-[11px] text-muted-foreground">
                Base Stats ที่ Lv.{effectiveLevel} • {activeRole.job.ranged ? 'โจมตีระยะไกล' : 'โจมตีระยะประชิด'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="border border-border bg-background/60 px-2 py-0.5 text-primary">
              Crit {stats.critPercent}%
            </span>
            <span className="border border-border bg-background/60 px-2 py-0.5 text-accent">
              ระยะ {stats.range}px
            </span>
          </div>
        </div>

        {/* Live 2D Animated Class Model Stage */}
        <div className="mb-3 flex flex-col items-center justify-between gap-3 border-2 border-[#0e0f1a] bg-[#131726] p-2.5 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="grid size-24 place-items-center border border-border/50 bg-[#0d101c]">
              <SpriteModelCanvas
                mode="job"
                id={activeRole.id}
                action={previewAction}
                dir={previewDir}
                size={92}
                label={`โมเดล 2D ${activeRole.englishName}`}
              />
            </div>
            <div>
              <p className="text-xs font-bold text-primary">โมเดล 2D: {activeRole.thaiName}</p>
              <p className="text-[11px] text-muted-foreground">
                อาวุธ: {activeRole.job.weaponTypes[0]} • Idle 4F / Walk 6F / Attack 4F
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {(
                  [
                    ['auto', 'วนลูป'],
                    ['idle', 'Idle'],
                    ['walk', 'Walk'],
                    ['attack', 'Attack'],
                  ] as Array<[PreviewAction, string]>
                ).map(([act, lbl]) => (
                  <button
                    key={act}
                    type="button"
                    aria-pressed={previewAction === act}
                    onClick={() => setPreviewAction(act)}
                    className={`pixel-btn px-2 py-0.5 text-[10px] font-semibold ${
                      previewAction === act
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPreviewDir(MODEL_DIRS[(MODEL_DIRS.indexOf(previewDir) + 1) % MODEL_DIRS.length])}
            className="pixel-btn flex items-center gap-1 bg-secondary px-2.5 py-1.5 text-[11px] text-foreground hover:brightness-110"
          >
            <RotateCw className="size-3" aria-hidden />
            หมุน ({DIR_LABELS[previewDir]})
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <StatMeter
            label="HP พื้นฐาน"
            value={stats.maxHp}
            maxReference={maxHpRef}
            icon={<Heart className="size-3.5 text-[#ff7b7f]" aria-hidden />}
            barColor="bg-hp"
          />
          <StatMeter
            label="MP พื้นฐาน"
            value={stats.maxMp}
            maxReference={maxMpRef}
            icon={<Droplets className="size-3.5 text-[#7fb0ff]" aria-hidden />}
            barColor="bg-mp"
          />
          <StatMeter
            label="พลังโจมตี (ATK)"
            value={stats.atk}
            maxReference={maxAtkRef}
            icon={<Swords className="size-3.5 text-primary" aria-hidden />}
            barColor="bg-primary"
          />
          <StatMeter
            label="พลังป้องกัน (DEF)"
            value={stats.def}
            maxReference={maxDefRef}
            icon={<Shield className="size-3.5 text-accent" aria-hidden />}
            barColor="bg-accent"
          />
          <StatMeter
            label="ความเร็วเดิน (SPD)"
            value={stats.speed}
            maxReference={100}
            icon={<Footprints className="size-3.5 text-[#e9c46a]" aria-hidden />}
            barColor="bg-[#e9c46a]"
          />
          <StatMeter
            label="อัตราคริติคอล (CRIT)"
            value={stats.critPercent}
            maxReference={25}
            unit="%"
            icon={<Zap className="size-3.5 text-[#c77dff]" aria-hidden />}
            barColor="bg-exp"
          />
        </div>

        {/* Class Skills Summary */}
        <div className="mt-3 border-t border-border/60 pt-2.5">
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <Sparkles className="size-3 text-primary" aria-hidden />
            สกิลประจำสายอาชีพ
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeRole.job.skills.map((skill) => (
              <span
                key={skill.id}
                className="border border-border bg-background/70 px-2 py-0.5 text-[11px] text-foreground"
              >
                {skill.name} <span className="text-muted-foreground">({skill.mp} MP • {skill.mult}x)</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
