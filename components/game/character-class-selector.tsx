'use client'

import { useState } from 'react'
import { Coins, Droplets, Footprints, Heart, Play, RotateCw, Shield, Sparkles, Sprout, Swords, Target, Wand2, Zap } from 'lucide-react'
import { JOBS, normalizeJobId, type JobDef } from '@/lib/game/data'
import { MODEL_DIRS, type ModelDir } from '@/lib/game/models-2d'
import { getSkillIconPath, getSkillVfxSpec, resolveRebirthAuraSpec } from '@/lib/game/vfx-specs'
import { formatNum } from './format'
import { SkillVfxPreview } from './skill-vfx-preview'
import { SpriteModelCanvas, type PreviewAction } from './sprite-model-canvas'

export type SelectableClassId = 'novice' | 'swordsman' | 'mage' | 'archer' | 'cleric' | 'merchant' | 'thief'

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
    id: 'novice',
    englishName: 'Wayfarer',
    thaiName: 'ผู้ฝึกหัด',
    tagline: 'คลาสเริ่มต้น Lv.1 คล่องตัวสมดุล พร้อมสกิลฟื้นฟูและฟาดพลัง',
    accentClass: 'border-[#34d399]/70 bg-[#34d399]/15 text-[#6ee7b7]',
    badgeClass: 'bg-[#34d399]/20 text-[#6ee7b7]',
    job: JOBS.novice,
  },
  {
    id: 'swordsman',
    englishName: 'Vanguard',
    thaiName: 'นักดาบ',
    tagline: 'แนวหน้าอึดถึก พลังชีวิตและพลังป้องกันสูง',
    accentClass: 'border-[#e5484d]/70 bg-[#e5484d]/15 text-[#ff8b8e]',
    badgeClass: 'bg-[#e5484d]/20 text-[#ff8b8e]',
    job: JOBS.swordsman,
  },
  {
    id: 'mage',
    englishName: 'Arcanist',
    thaiName: 'นักเวท',
    tagline: 'โจมตีเวทระยะไกล ดาเมจรุนแรง มานามหาศาล',
    accentClass: 'border-[#4c8bf5]/70 bg-[#4c8bf5]/15 text-[#8cb8ff]',
    badgeClass: 'bg-[#4c8bf5]/20 text-[#8cb8ff]',
    job: JOBS.mage,
  },
  {
    id: 'archer',
    englishName: 'Windstalker',
    thaiName: 'นักธนู',
    tagline: 'ยิงไกลคล่องตัว ความเร็วโจมตีและคริติคอลสูง',
    accentClass: 'border-[#4fc3a1]/70 bg-[#4fc3a1]/15 text-[#7de2c4]',
    badgeClass: 'bg-[#4fc3a1]/20 text-[#7de2c4]',
    job: JOBS.archer,
  },
  {
    id: 'cleric',
    englishName: 'Luminary',
    thaiName: 'นักบวช',
    tagline: 'เวทแสงศักดิ์สิทธิ์ ฟื้นฟู HP และช่วยสนับสนุนทีม',
    accentClass: 'border-[#f4d35e]/70 bg-[#f4d35e]/15 text-[#fde68a]',
    badgeClass: 'bg-[#f4d35e]/20 text-[#fde68a]',
    job: JOBS.cleric,
  },
  {
    id: 'merchant',
    englishName: 'Goldweaver',
    thaiName: 'พ่อค้า',
    tagline: 'เชี่ยวชาญการค้า เพิ่มทองดรอป +15% และตีหนัก',
    accentClass: 'border-[#f59e0b]/70 bg-[#f59e0b]/15 text-[#fcd34d]',
    badgeClass: 'bg-[#f59e0b]/20 text-[#fcd34d]',
    job: JOBS.merchant,
  },
  {
    id: 'thief',
    englishName: 'Nightveil',
    thaiName: 'โจร',
    tagline: 'ว่องไวสูงสุด มีดคู่โจมตีเร็วและคริติคอลรุนแรง',
    accentClass: 'border-[#c77dff]/70 bg-[#c77dff]/15 text-[#e9d5ff]',
    badgeClass: 'bg-[#c77dff]/20 text-[#e9d5ff]',
    job: JOBS.thief,
  },
]

export function calculateClassBaseStats(classId: string, level = 10): ComputedBaseStats {
  const job = JOBS[normalizeJobId(classId)] ?? JOBS.novice
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
  if (classId === 'novice') return <Sprout className={className} aria-hidden />
  if (classId === 'swordsman') return <Swords className={className} aria-hidden />
  if (classId === 'mage') return <Wand2 className={className} aria-hidden />
  if (classId === 'cleric') return <Sparkles className={className} aria-hidden />
  if (classId === 'merchant') return <Coins className={className} aria-hidden />
  if (classId === 'thief') return <Zap className={className} aria-hidden />
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
  defaultClassId = 'novice',
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
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [previewRebirth, setPreviewRebirth] = useState<number>(1)
  const [vfxNonce, setVfxNonce] = useState<number>(0)

  const activeClassId = normalizeJobId(value ?? internalClassId)
  const effectiveLevel = value !== undefined ? level : previewLevel
  const activeRole = CLASS_ROLE_OPTIONS.find((r) => r.id === activeClassId) ?? CLASS_ROLE_OPTIONS[0]
  const activeSkill =
    activeRole.job.skills.find((s) => s.id === selectedSkillId) ?? activeRole.job.skills[0] ?? null
  const activeSkillSpec = activeSkill
    ? getSkillVfxSpec(activeSkill.id, activeSkill.color, activeSkill.kind, activeRole.job.weaponTypes[0])
    : null
  const activeAuraSpec = resolveRebirthAuraSpec(previewRebirth)
  const stats = calculateClassBaseStats(activeRole.id, effectiveLevel)

  const selectRole = (role: ClassRoleOption) => {
    if (value === undefined) {
      setInternalClassId(role.id)
    }
    setSelectedSkillId(role.job.skills[0]?.id ?? null)
    setVfxNonce((n) => n + 1)
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
      className="pixel-panel w-full max-w-2xl p-4 text-foreground"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border/70 pb-3">
        <div>
          <h2 className="text-base font-bold text-primary">เลือกสายอาชีพ (Character Class)</h2>
          <p className="text-xs text-muted-foreground">
            เริ่มจาก Wayfarer (ผู้ฝึกหัด) หรือเปรียบเทียบ 6 อาชีพหลัก (Vanguard, Arcanist, Windstalker, Luminary, Goldweaver, Nightveil) เพื่อดูค่าสถานะทันที
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
      <div role="radiogroup" aria-label="สายอาชีพ" className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {CLASS_ROLE_OPTIONS.map((role) => {
          const isSelected = role.id === activeRole.id
          return (
            <button
              key={role.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => selectRole(role)}
              className={`pixel-btn flex min-w-0 flex-col items-start gap-1.5 overflow-hidden p-2.5 text-left transition-all ${
                isSelected
                  ? `${role.accentClass} ring-2 ring-primary/70`
                  : 'bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <div className="flex w-full flex-wrap items-center justify-between gap-1">
                <span className="flex items-center gap-1 text-[13px] font-bold text-foreground">
                  <ClassIcon classId={role.id} className="size-3.5 shrink-0" />
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
        <div className="mmorpg-showcase-card mb-3 flex flex-col items-center justify-between gap-3 p-2.5 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="grid size-24 place-items-center border border-[#c9993f]/45 bg-[#0b1024]/95 shadow-[inset_0_0_16px_rgba(65,105,225,0.18)]">
              <SpriteModelCanvas
                mode="job"
                id={activeRole.id}
                action={previewAction}
                dir={previewDir}
                size={92}
                rebirthCount={previewRebirth}
                label={`โมเดล 2D ${activeRole.englishName}`}
              />
            </div>
            <div>
              <p className="text-xs font-bold text-primary">โมเดล 2D: {activeRole.thaiName}</p>
              <p className="text-[11px] text-muted-foreground">
                อาวุธ: {activeRole.job.weaponTypes[0]} • Idle 4F / Walk 4F / Attack 4F / Skill 4F
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {(
                  [
                    ['auto', 'วนลูป'],
                    ['idle', 'Idle'],
                    ['walk', 'Walk'],
                    ['attack', 'Attack'],
                    ['skill', 'Skill'],
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

        {/* Class Skills & Rebirth Aura Interactive VFX Showcase */}
        <div className="mt-3 border-t border-border/60 pt-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              สกิลประจำสายอาชีพ &amp; ตัวอย่างเอฟเฟคจุติ
            </p>
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="พรีวิวระดับออร่าจุติ">
              {[
                { count: 0, label: 'ปกติ' },
                { count: 1, label: 'จุติ 1' },
                { count: 2, label: 'จุติ 2' },
                { count: 3, label: 'จุติ 3' },
                { count: 4, label: 'จุติ 4' },
                { count: 5, label: 'จุติ 5' },
                { count: 6, label: 'จุติ 6' },
              ].map((tier) => {
                const active = previewRebirth === tier.count
                return (
                  <button
                    key={tier.count}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPreviewRebirth(tier.count)}
                    className={`pixel-btn px-2 py-0.5 text-[10px] font-semibold ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tier.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {activeRole.job.skills.map((skill, idx) => {
              const spec = getSkillVfxSpec(skill.id, skill.color, skill.kind, activeRole.job.weaponTypes[0])
              const isSelected = activeSkill?.id === skill.id
              return (
                <button
                  key={skill.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedSkillId(skill.id)
                    setVfxNonce((n) => n + 1)
                  }}
                  className={`flex items-start gap-2.5 border p-2.5 text-left transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/12 text-foreground'
                      : 'border-border bg-background/70 text-foreground hover:border-primary/60'
                  }`}
                >
                  <img
                    src={getSkillIconPath(skill.id)}
                    alt=""
                    width={32}
                    height={32}
                    className="pixelated size-8 shrink-0 rounded border border-border/80 bg-[#0e0f1a] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 text-xs font-bold">
                      <span className="truncate" style={{ color: spec.primaryColor }}>
                        {idx + 1}. {skill.name}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
                        {skill.mp} MP · {skill.cooldown}s
                      </span>
                    </div>
                    {skill.tag && (
                      <p className="text-[10px] font-semibold text-amber-300/90">{skill.tag}</p>
                    )}
                    <p className="truncate text-[10.5px] font-medium text-emerald-300">
                      {skill.effectSummary ?? spec.effectLabel}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-2.5 grid gap-3 border border-border/80 bg-[#0a0d1c]/70 p-2.5 sm:grid-cols-[1fr_14.5rem] sm:items-center">
            <SkillVfxPreview
              jobId={activeRole.id}
              skillId={activeSkill?.id ?? null}
              rebirthCount={previewRebirth}
              playNonce={vfxNonce}
              width={320}
              height={132}
              label={`จำลองเอฟเฟค ${activeSkill?.name ?? activeRole.thaiName}`}
            />
            <div className="flex flex-col justify-between gap-1.5 text-[11px]">
              <div>
                <p className="font-bold text-foreground">
                  {activeSkill ? activeSkill.name : activeRole.thaiName}
                </p>
                {activeSkill?.tag && (
                  <p className="text-[10px] font-semibold text-amber-300/90">{activeSkill.tag}</p>
                )}
                {activeSkill && (
                  <p className="mt-0.5 font-mono text-[10px] text-sky-300 tabular-nums">
                    {activeSkill.mp} MP · CD {activeSkill.cooldown}s ·{' '}
                    {activeSkill.mult > 0 ? `${activeSkill.mult}x` : 'ฟื้นฟู/บัฟ'}
                    {activeSkill.radius > 0 ? ` · รัศมี ${activeSkill.radius}px` : ''}
                    {(activeSkill.hits ?? 1) > 1 ? ` · ${activeSkill.hits} ฮิต` : ''}
                  </p>
                )}
                {activeSkill?.effectSummary && (
                  <p className="mt-1 text-[10.5px] font-semibold text-emerald-300">
                    {activeSkill.effectSummary}
                  </p>
                )}
                {activeSkill?.description && (
                  <p className="mt-1 text-[10.5px] leading-snug text-slate-200/90">
                    {activeSkill.description}
                  </p>
                )}
                {activeSkillSpec && (
                  <p className="mt-1 text-[10px] leading-snug" style={{ color: activeSkillSpec.primaryColor }}>
                    VFX: {activeSkillSpec.effectLabel}
                  </p>
                )}
              </div>
              <div className="border-t border-border/60 pt-1.5">
                <p className="text-[10px] font-semibold" style={{ color: activeAuraSpec.primaryColor }}>
                  {activeAuraSpec.title}
                </p>
                <p className="text-[10px] leading-snug text-muted-foreground">{activeAuraSpec.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setVfxNonce((n) => n + 1)}
                className="pixel-btn mt-0.5 flex items-center justify-center gap-1 bg-accent px-2.5 py-1 text-[10px] font-bold text-accent-foreground hover:brightness-110"
              >
                <Play className="size-3" aria-hidden />
                เล่นเอฟเฟคอีกครั้ง
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
