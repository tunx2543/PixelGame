'use client'

import { useMemo, useState } from 'react'
import { Crown, Eye, Flame, Footprints, Pause, Play, RotateCw, Shield, Sparkles, Swords } from 'lucide-react'
import { ITEMS } from '@/lib/game/data'
import {
  getAllJobModels,
  getAllMonsterModels,
  MODEL_DIRS,
  type ModelDir,
} from '@/lib/game/models-2d'
import type { SpriteAction } from '@/lib/game/sprites'
import { formatNum } from './format'
import { SpriteModelCanvas, type PreviewAction } from './sprite-model-canvas'

const ACTION_OPTIONS: Array<{ id: PreviewAction; label: string; short: string }> = [
  { id: 'auto', label: 'เล่นวนอัตโนมัติ', short: 'อัตโนมัติ' },
  { id: 'idle', label: 'ยืนหายใจ (Idle)', short: 'Idle' },
  { id: 'walk', label: 'เดิน (Walk)', short: 'Walk' },
  { id: 'attack', label: 'โจมตี (Attack)', short: 'Attack' },
]

const DIR_LABELS: Record<ModelDir, string> = {
  down: 'หน้า',
  right: 'ขวา',
  up: 'หลัง',
  left: 'ซ้าย',
}

const ACTION_THAI: Record<SpriteAction, string> = {
  idle: 'ยืนหายใจ',
  walk: 'กำลังเดิน',
  attack: 'โจมตี',
}

function getJobTraitTags(jobId: string): string[] {
  const map: Record<string, string[]> = {
    novice: ['กระเป๋าเดินทาง', 'ผ้าพันคอผู้เริ่มต้น', 'ไม้พลองฝึกหัด'],
    swordsman: ['ผ้าคาดหัวแดง', 'เกราะไหล่เหล็ก', 'โล่ + ดาบเหล็ก'],
    mage: ['หมวกพ่อมดปลายแหลม', 'ผ้าคลุมเวท', 'คทาอัญมณี'],
    archer: ['ฮู้ดพรานขนนก', 'ซองธนูสะพายหลัง', 'คันธนูยาว'],
    thief: ['ผ้าปิดปากโจร', 'มีดคู่ (ซ้าย-ขวา)', 'ผ้าคลุมเงา'],
    knight: ['หมวกเกราะขนนกแดง', 'เกราะหนักเต็มยศ', 'โล่ตราอัศวิน'],
    paladin: ['วงแหวนศักดิ์สิทธิ์', 'เกราะขาว-ทอง', 'โล่กางเขนสุริยัน'],
    wizard: ['หมวกจอมเวทประดับดาว', 'ชุดคลุมอาร์คเมจ', 'คทาผลึกฟ้า'],
    cleric: ['หมวกมิเตอร์กางเขน', 'ปีกเทวทูต + วงแหวน', 'คทาศักดิ์สิทธิ์'],
    hunter: ['ฮู้ดพรานป่าชั้นสูง', 'เกราะหนังประดับทอง', 'ธนูพราน + ซองธนู'],
    assassin: ['หน้ากากนินจาเงา', 'มีดคู่ม่วงอเวจี', 'ผ้าคลุมรัตติกาล'],
    gm: ['มงกุฎราชาทองคำ', 'ปีกเซราฟิม + วงแหวน', 'คทาทองคำ GM'],
  }
  return map[jobId] ?? []
}

function getMonsterTraitLabel(archetype: string): string {
  const map: Record<string, string> = {
    slime: 'หยดเจลใส + ไฮไลต์กระดอน',
    pink_slime: 'สไลม์มงกุฎน้อย + ฟองอากาศ',
    mushroom: 'หมวกเห็ดลายจุด + ท่าพุ่งโหม่ง',
    rabbit: 'หูยาวขยับตามจังหวะ + กระโดดพุ่ง',
    wolf: 'หมาป่าสี่ขา + เขี้ยวตวัด',
    goblin: 'ก๊อบลินหูแหลม + กระบองไม้ (4 ทิศ)',
    goblin_chief: 'บอสหัวหน้าก๊อบลินมงกุฎเขา + กระบองหนาม',
    bat: 'ค้างคาวปีกกระพือ + บินลอยกลางอากาศ',
    skeleton: 'โครงกระดูกเกราะอก + ดาบกระดูก (4 ทิศ)',
    ghost: 'วิญญาณโปร่งแสง + ผ้าคลุมพลิ้ว',
    fire_golem: 'โกเลมหินปล่องภูเขาไฟ + รอยแยกแมกมา',
    earth_golem: 'บอสยักษ์ศิลามอส + แก่นคริสตัลมรกต',
    demon: 'ปีศาจมีปีก + หางแหลม + คทาไฟ (4 ทิศ)',
    demon_lord: 'บอสราชาปีศาจสวมมงกุฎเพลิง + ดาบมาร',
    abyss_knight: 'อัศวินเกราะทมิฬมีเขา + ดาบอเวจี (4 ทิศ)',
    gale_sentinel: 'ผู้พิทักษ์สายลมมีปีกแสง + หอกวายุ (4 ทิศ)',
    abyss_dragon: 'บอสมังกรอเวจีมีปีก + พ่นไฟ/ลมหายใจมืด',
  }
  return map[archetype] ?? archetype
}

export function ModelGalleryView({ compact = false }: { compact?: boolean }) {
  const jobModels = useMemo(() => getAllJobModels(), [])
  const monsterModels = useMemo(() => getAllMonsterModels(), [])

  const [tab, setTab] = useState<'jobs' | 'monsters'>('jobs')
  const [selectedJobId, setSelectedJobId] = useState<string>('paladin')
  const [selectedMonsterId, setSelectedMonsterId] = useState<string>('abyss_dragon')
  const [action, setAction] = useState<PreviewAction>('auto')
  const [dir, setDir] = useState<ModelDir>('down')
  const [liveAutoPhase, setLiveAutoPhase] = useState<SpriteAction>('idle')

  const selectedJobEntry =
    jobModels.find((entry) => entry.job.id === selectedJobId) ?? jobModels[0]
  const selectedMonsterEntry =
    monsterModels.find((entry) => entry.monster.id === selectedMonsterId) ?? monsterModels[0]

  const rotateDir = () => {
    const idx = MODEL_DIRS.indexOf(dir)
    setDir(MODEL_DIRS[(idx + 1) % MODEL_DIRS.length])
  }

  return (
    <div className="flex flex-col gap-3 text-foreground">
      {/* Top Toolbar: Tabs + Global Action + Direction Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-border bg-muted/80 p-2.5">
        <div role="tablist" aria-label="หมวดหมู่โมเดล 2D" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'jobs'}
            onClick={() => setTab('jobs')}
            className={`pixel-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ${
              tab === 'jobs'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Swords className="size-3.5" aria-hidden />
            อาชีพทั้งหมด ({jobModels.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'monsters'}
            onClick={() => setTab('monsters')}
            className={`pixel-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ${
              tab === 'monsters'
                ? 'bg-destructive text-white'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Flame className="size-3.5" aria-hidden />
            มอนสเตอร์ &amp; บอส ({monsterModels.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex flex-wrap gap-1" role="group" aria-label="เลือกแอนิเมชั่น">
            {ACTION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={action === opt.id}
                onClick={() => setAction(opt.id)}
                className={`pixel-btn flex items-center gap-1 px-2 py-1 text-[11px] font-semibold ${
                  action === opt.id
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.id === 'auto' ? (
                  <Play className="size-3" aria-hidden />
                ) : opt.id === 'idle' ? (
                  <Pause className="size-3" aria-hidden />
                ) : opt.id === 'walk' ? (
                  <Footprints className="size-3" aria-hidden />
                ) : (
                  <Swords className="size-3" aria-hidden />
                )}
                {opt.short}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 border-l border-border pl-1.5" role="group" aria-label="ทิศทางโมเดล">
            {MODEL_DIRS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={dir === d}
                onClick={() => setDir(d)}
                className={`pixel-btn px-2 py-1 text-[11px] ${
                  dir === d
                    ? 'bg-primary/25 text-primary ring-1 ring-primary'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {DIR_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Spotlight Preview Stage */}
      {tab === 'jobs' ? (
        <section
          aria-label={`ตัวอย่างโมเดล ${selectedJobEntry.job.name}`}
          className="grid gap-3 border-2 border-primary/50 bg-muted p-3 md:grid-cols-[11.5rem_1fr]"
        >
          <div className="mmorpg-showcase-card flex flex-col items-center justify-between p-2.5">
            <div className="flex w-full items-center justify-between text-[10px]">
              <span className="border border-primary/40 bg-primary/15 px-1.5 py-0.5 font-semibold text-primary">
                {selectedJobEntry.job.id === 'gm'
                  ? 'GM พิเศษ'
                  : selectedJobEntry.job.tier === 0
                    ? 'เริ่มต้น'
                    : `คลาส ${selectedJobEntry.job.tier}`}
              </span>
              <span className="text-accent">
                {action === 'auto' ? ACTION_THAI[liveAutoPhase] : ACTION_THAI[action]}
              </span>
            </div>

            <div className="relative my-1.5 flex items-center justify-center rounded-sm border border-[#c9993f]/40 bg-[#0b0f21]/85 p-2 shadow-inner">
              <SpriteModelCanvas
                mode="job"
                id={selectedJobEntry.job.id}
                action={action}
                dir={dir}
                size={compact ? 124 : 144}
                isGm={selectedJobEntry.job.id === 'gm'}
                onAutoPhaseChange={setLiveAutoPhase}
                label={`โมเดลอาชีพ ${selectedJobEntry.job.name}`}
              />
            </div>

            <button
              type="button"
              onClick={rotateDir}
              className="pixel-btn flex w-full items-center justify-center gap-1 bg-secondary px-2 py-1 text-[11px] text-foreground hover:brightness-110"
            >
              <RotateCw className="size-3" aria-hidden />
              หมุนทิศ ({DIR_LABELS[dir]})
            </button>
          </div>

          <div className="flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-primary">
                    {selectedJobEntry.job.name}
                    <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                      ({selectedJobEntry.job.id})
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">{selectedJobEntry.job.description}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="border border-border bg-background px-2 py-0.5 text-accent">
                    {selectedJobEntry.job.ranged ? 'โจมตีระยะไกล' : 'โจมตีระยะประชิด'}
                  </span>
                  <span className="border border-border bg-background px-2 py-0.5 text-gold tabular-nums">
                    Lv.{selectedJobEntry.job.reqLevel}+
                  </span>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {getJobTraitTags(selectedJobEntry.job.id).map((trait) => (
                  <span
                    key={trait}
                    className="border border-primary/35 bg-primary/10 px-2 py-0.5 text-[11px] text-foreground"
                  >
                    <Sparkles className="mr-1 inline size-3 text-primary" aria-hidden />
                    {trait}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] sm:grid-cols-5">
              {[
                ['HP', `x${selectedJobEntry.job.hpMul}`],
                ['MP', `x${selectedJobEntry.job.mpMul}`],
                ['ATK', `x${selectedJobEntry.job.atkMul}`],
                ['DEF', `x${selectedJobEntry.job.defMul}`],
                ['SPD', `x${selectedJobEntry.job.speedMul}`],
              ].map(([k, v]) => (
                <div key={k} className="border border-border bg-background/80 px-1.5 py-1">
                  <p className="text-[10px] text-muted-foreground">{k}</p>
                  <p className="font-bold tabular-nums text-foreground">{v}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-1 text-[11px] text-muted-foreground">สกิลประจำอาชีพ &amp; เฟรมแอนิเมชั่น</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedJobEntry.job.skills.length > 0 ? (
                  selectedJobEntry.job.skills.map((s) => (
                    <span
                      key={s.id}
                      className="border border-border bg-background px-2 py-0.5 text-[11px]"
                      style={{ color: s.color }}
                    >
                      {s.name} ({s.mp}MP • {s.mult}x)
                    </span>
                  ))
                ) : (
                  <span className="border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] text-gold">
                    พลัง GM พิเศษ: ล่องหน / เสกของ / อมตะ / โจมตี 9,999,999
                  </span>
                )}
                <span className="ml-auto font-mono text-[10px] text-muted-foreground tabular-nums">
                  Idle 4F • Walk 6F • Attack 4F
                </span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section
          aria-label={`ตัวอย่างโมเดล ${selectedMonsterEntry.monster.name}`}
          className="grid gap-3 border-2 border-destructive/50 bg-muted p-3 md:grid-cols-[11.5rem_1fr]"
        >
          <div className="flex flex-col items-center justify-between border-2 border-[#0e0f1a] bg-[#131726] p-2.5">
            <div className="flex w-full items-center justify-between text-[10px]">
              <span
                className={`border px-1.5 py-0.5 font-semibold ${
                  selectedMonsterEntry.monster.boss
                    ? 'border-destructive/60 bg-destructive/20 text-[#ff8b8e]'
                    : 'border-border bg-secondary text-muted-foreground'
                }`}
              >
                {selectedMonsterEntry.monster.boss ? '★ บอส' : 'มอนสเตอร์'}
              </span>
              <span className="text-accent">
                {action === 'auto' ? ACTION_THAI[liveAutoPhase] : ACTION_THAI[action]}
              </span>
            </div>

            <div className="relative my-1 flex items-center justify-center">
              <SpriteModelCanvas
                mode="monster"
                id={selectedMonsterEntry.monster.id}
                action={action}
                dir={dir}
                size={compact ? 124 : 144}
                onAutoPhaseChange={setLiveAutoPhase}
                label={`โมเดลมอนสเตอร์ ${selectedMonsterEntry.monster.name}`}
              />
            </div>

            <button
              type="button"
              onClick={rotateDir}
              className="pixel-btn flex w-full items-center justify-center gap-1 bg-secondary px-2 py-1 text-[11px] text-foreground hover:brightness-110"
            >
              <RotateCw className="size-3" aria-hidden />
              หมุนทิศ ({DIR_LABELS[dir]})
            </button>
          </div>

          <div className="flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-1.5 text-lg font-bold text-[#ff8b8e]">
                    {selectedMonsterEntry.monster.boss && <Crown className="size-4 text-gold" aria-hidden />}
                    {selectedMonsterEntry.monster.name}
                    <span className="ml-1 font-mono text-xs font-normal text-muted-foreground">
                      ({selectedMonsterEntry.monster.id})
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {getMonsterTraitLabel(selectedMonsterEntry.model.archetype)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="border border-border bg-background px-2 py-0.5 text-foreground tabular-nums">
                    Lv.{selectedMonsterEntry.monster.level}
                  </span>
                  <span className="border border-border bg-background px-2 py-0.5 text-accent">
                    {selectedMonsterEntry.model.flying ? 'บินลอยกลางอากาศ' : 'เคลื่อนที่บนพื้น'}
                  </span>
                  <span className="border border-border bg-background px-2 py-0.5 text-primary">
                    {selectedMonsterEntry.model.supports4Way ? 'หัน 4 ทิศ' : 'หันซ้าย-ขวา'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] sm:grid-cols-5">
              {[
                ['HP', formatNum(selectedMonsterEntry.monster.hp)],
                ['ATK', formatNum(selectedMonsterEntry.monster.atk)],
                ['DEF', formatNum(selectedMonsterEntry.monster.def)],
                ['EXP', formatNum(selectedMonsterEntry.monster.exp)],
                ['GOLD', `${formatNum(selectedMonsterEntry.monster.gold[0])}-${formatNum(selectedMonsterEntry.monster.gold[1])}`],
              ].map(([k, v]) => (
                <div key={k} className="border border-border bg-background/80 px-1.5 py-1">
                  <p className="text-[10px] text-muted-foreground">{k}</p>
                  <p className="font-bold tabular-nums text-foreground">{v}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-1 text-[11px] text-muted-foreground">ไอเทมดรอป &amp; ขนาดแคนวาสโมเดล</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedMonsterEntry.monster.drops.slice(0, 5).map((d) => (
                  <span key={d.itemId} className="border border-border bg-background px-2 py-0.5 text-[11px] text-foreground">
                    {ITEMS[d.itemId]?.name ?? d.itemId} ({Math.round(d.chance * 100)}%)
                  </span>
                ))}
                <span className="ml-auto font-mono text-[10px] text-muted-foreground tabular-nums">
                  {selectedMonsterEntry.model.canvasSize.width}x{selectedMonsterEntry.model.canvasSize.height}px • Idle 4F / Walk 6F / Atk 4F
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Grid of All Models */}
      {tab === 'jobs' ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {jobModels.map(({ job }) => {
            const selected = job.id === selectedJobEntry.job.id
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => setSelectedJobId(job.id)}
                aria-pressed={selected}
                className={`flex flex-col items-center gap-1.5 p-2 text-center transition-all hover:brightness-110 ${
                  selected
                    ? 'mmorpg-showcase-card-active'
                    : 'mmorpg-showcase-card'
                }`}
              >
                <div className="flex w-full items-center justify-between text-[10px]">
                  <span className="font-semibold text-primary">
                    {job.id === 'gm' ? 'GM' : `T${job.tier}`}
                  </span>
                  <span className="font-mono text-muted-foreground">Lv.{job.reqLevel}</span>
                </div>
                <div className="grid size-24 place-items-center border border-[#c9993f]/35 bg-[#0b1024]/90 shadow-[inset_0_0_16px_rgba(65,105,225,0.16)]">
                  <SpriteModelCanvas
                    mode="job"
                    id={job.id}
                    action={compact && !selected && action === 'auto' ? 'idle' : action}
                    dir={dir}
                    size={88}
                    isGm={job.id === 'gm'}
                    label={`พรีวิวอาชีพ ${job.name}`}
                  />
                </div>
                <div className="mmorpg-ribbon w-full px-2 py-1">
                  <p className="truncate text-xs font-bold text-[#ffeaa7]">{job.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {job.ranged ? 'ระยะไกล' : 'ระยะประชิด'} • {job.weaponTypes[0]}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {monsterModels.map(({ monster, model }) => {
            const selected = monster.id === selectedMonsterEntry.monster.id
            return (
              <button
                key={monster.id}
                type="button"
                onClick={() => setSelectedMonsterId(monster.id)}
                aria-pressed={selected}
                className={`flex flex-col items-center gap-1.5 p-2 text-center transition-all hover:brightness-110 ${
                  selected
                    ? 'mmorpg-showcase-card-active border-destructive'
                    : 'mmorpg-showcase-card'
                }`}
              >
                <div className="flex w-full items-center justify-between text-[10px]">
                  <span className={`font-semibold ${monster.boss ? 'text-[#ff8b8e]' : 'text-accent'}`}>
                    {monster.boss ? '★ BOSS' : 'MOB'}
                  </span>
                  <span className="font-mono text-muted-foreground tabular-nums">Lv.{monster.level}</span>
                </div>
                <div className="grid size-24 place-items-center border border-[#c9993f]/35 bg-[#0b1024]/90 shadow-[inset_0_0_16px_rgba(65,105,225,0.14)]">
                  <SpriteModelCanvas
                    mode="monster"
                    id={monster.id}
                    action={compact && !selected && action === 'auto' ? 'idle' : action}
                    dir={dir}
                    size={88}
                    label={`พรีวิวมอนสเตอร์ ${monster.name}`}
                  />
                </div>
                <div className="mmorpg-ribbon w-full px-2 py-1">
                  <p className="truncate text-xs font-bold text-foreground">{monster.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    HP {formatNum(monster.hp)} • {model.flying ? 'บิน' : 'พื้นดิน'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <p className="flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Eye className="size-3.5 text-primary" aria-hidden />
          คลิกการ์ดเพื่อขยายดูแอนิเมชั่นแบบละเอียด 4 ทิศทาง (Idle 4 เฟรม / Walk 6 เฟรม / Attack 4 เฟรม)
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <Shield className="size-3 text-accent" aria-hidden />
          ครบทั้ง 12 อาชีพ และ 17 มอนสเตอร์
        </span>
      </p>
    </div>
  )
}
