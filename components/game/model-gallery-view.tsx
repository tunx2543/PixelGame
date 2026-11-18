'use client'

import { useMemo, useState } from 'react'
import { Crown, Eye, Flame, Footprints, Pause, PawPrint, Play, RotateCw, Shield, Sparkles, Swords, Wind } from 'lucide-react'
import { ITEMS } from '@/lib/game/data'
import {
  getAllJobModels,
  getAllMonsterModels,
  getAllMountModels,
  getAllPetModels,
  MODEL_DIRS,
  type ModelDir,
} from '@/lib/game/models-2d'
import type { SpriteAction } from '@/lib/game/sprites'
import { getSkillIconPath, getSkillVfxSpec, resolveRebirthAuraSpec } from '@/lib/game/vfx-specs'
import { formatNum } from './format'
import { SkillVfxPreview } from './skill-vfx-preview'
import { SpriteModelCanvas, type PreviewAction } from './sprite-model-canvas'

const ACTION_OPTIONS: Array<{ id: PreviewAction; label: string; short: string }> = [
  { id: 'auto', label: 'เล่นวนอัตโนมัติ', short: 'อัตโนมัติ' },
  { id: 'idle', label: 'ยืนหายใจ (Idle)', short: 'Idle' },
  { id: 'walk', label: 'เดิน (Walk)', short: 'Walk' },
  { id: 'attack', label: 'โจมตี (Attack)', short: 'Attack' },
  { id: 'skill', label: 'ใช้สกิล (Skill)', short: 'Skill' },
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
  skill: 'ใช้สกิล',
}

function getJobTraitTags(jobId: string): string[] {
  const map: Record<string, string[]> = {
    novice: ['ผมน้ำตาลฟู + ผ้าพันคอแดง + เสื้อคลุมสีขาว', 'สายสะพายหนังคาดเฉียง + กระเป๋าคาดเอว', 'รองเท้าบูทหนังพับขอบ + ไม้พลอง & สกิลฟาดพลังมือใหม่'],
    swordsman: ['นักดาบผมแดง + ผ้าคลุมเพลิง', 'เกราะเหล็กอัศวิน', 'ดาบ + ทักษะฟันกระแทก'],
    mage: ['หมวกจอมเวทปลายแหลม', 'อาภรณ์ม่วงดารา', 'คทาผลึกอัญมณีฟ้า'],
    archer: ['หมวกพรานขนนกมรกต', 'ซองธนูสะพายหลัง', 'คันธนู + ทักษะฝนธนู'],
    cleric: ['หมวกมิเตอร์กางเขนทอง', 'อาภรณ์นักบวชสีขาว-ทอง', 'คทาศักดิ์สิทธิ์ + ฮีลทีม'],
    merchant: ['แว่นกอกเกิล + หมวกนักประดิษฐ์', 'เป้ขวดยา + โบนัส +15% Gold', 'ฟาดเหรียญทอง + รถเข็นพุ่งชน'],
    thief: ['ผ้าพันคอแดง + หน้ากากโจร', 'มีดคู่ (ซ้าย-ขวา)', 'แทงสองครั้ง + แทงข้างหลัง'],
    kensei: ['หางม้าซามูไร + กิโมโนขาว-คราม', 'ดาบคาตานะสายฟ้า', 'อิไอจุตสึ + พายุเคนเซย์'],
    iron_fist: ['ลูกประคำทอง + กางเกงนักสู้ส้ม', 'หมัดเพลิงออร่าทองคำ', 'พุ่งซัดหมัดเหล็ก & ทุบพสุธา'],
    wicked_necromancer: ['เขาทมิฬ + ผมเงินต้องสาป', 'อาภรณ์อเวจีม่วง-ดำ', 'มนต์แมวดำ + เสียงเพรียกอเวจี'],
    the_king: ['มงกุฎทองคำ + ผ้าคลุมราชันย์', 'โบนัส +25% Gold', 'พายุแท่งเทียน + ตัดขาดทุนพิฆาต'],
    sinister: ['ปีกเงาโลหิต + นัยน์ตาสีชาด', 'ออร่าเพลิงอเวจี', 'กากบาททมิฬ + จันทราโลหิต'],
    templar: ['หมวกเกราะอัศวินวิหาร', 'โล่กางเขนทอง + เกราะขาว-น้ำเงิน', 'ฟันศักดิ์สิทธิ์ + โล่เทมพลาร์'],
    nekobaku: ['หูแมว + หางปุกปุย + โบว์ชมพู', 'ออร่าพลังระเบิดสีชมพู', 'ขวดระเบิด Fizz Flask & ฝนระเบิดเนโกะ'],
    mamushi: ['ผ้าคาดหัวอสรพิษ + หางมังกรเขียว', 'เขี้ยวพิษ + วงแหวนมรกต', 'เขี้ยวอสรพิษ + ดาวกระจายสะท้อน'],
  }
  return map[jobId] ?? []
}

function getMonsterTraitLabel(archetype: string): string {
  const map: Record<string, string> = {
    slime: 'หยดเจลสีเขียวใส + ไฮไลต์กระดอน',
    slime_blue: 'สไลม์สีฟ้าสดใส + ออร่าหยดน้ำ',
    pink_slime: 'สไลม์ชมพู + ฟองอากาศ',
    mushroom: 'หมวกเห็ดลายจุด + ท่าพุ่งโหม่ง',
    rabbit: 'หูยาวขยับตามจังหวะ + กระโดดพุ่ง',
    boss_wolf: 'บอสหมาป่าใหญ่สวมเกราะทอง + กรงเล็บพายุ',
    wolf: 'หมาป่าสี่ขา + เขี้ยวตวัด',
    goblin: 'ก๊อบลินหูแหลม + กระบองไม้ (4 ทิศ)',
    boss_spider_queen: 'บอสราชินีแมงมุมสวมมงกุฎทอง + ใยพิษ',
    goblin_chief: 'บอสหัวหน้าก๊อบลินมงกุฎเขา + กระบองหนาม',
    boss_lich: 'บอสจอมเวทโครงกระดูกมงกุฎกษัตริย์ + คทามรณะ',
    bat: 'ค้างคาวปีกกระพือ + บินลอยกลางอากาศ',
    spider: 'แมงมุมพิษ 8 ขา + ดวงตาสีชาด',
    boss_fire_dragon: 'บอสมังกรไฟปีกเพลิง + พ่นลูกไฟ',
    skeleton: 'โครงกระดูกเกราะอก + ดาบกระดูก (4 ทิศ)',
    orc: 'ออร์คนักรบกล้ามโต + ขวานศึก',
    golem: 'โกเลมศิลาโบราณ + หมัดหินกระแทก',
    boss_demon_king: 'บอสราชาปีศาจเขาคู่ + ปีกอเวจี + ดาบมาร',
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

function getPetTraitTags(petId: string): string[] {
  const map: Record<string, string[]> = {
    phao_lotus: ['ฐานบัวแก้วมงคล', 'ลายกนกข้างตัวผอบ', 'เปิดฝาปล่อยกลีบบัว'],
    phao_gold_naga: ['ผอบทองคำยอดพญานาค', 'เขี้ยวนาคาคู่', 'เปิดฝาพ่นลูกแก้วมรกต'],
    phao_celestial: ['ลายเบญจรงค์สุริยัน-จันทรา', 'ดาวเคราะห์โคจรรอบผอบ', 'ลำแสงทวิธาตุ'],
    phao_phantom: ['ผอบสัมฤทธิ์ดำผนึกยันต์', 'ดวงไฟวิญญาณลอยรอบ', 'เปิดฝาปล่อยเพลิงอเวจี'],
    buddy_slime: ['หยดเจลเด้งดึ๋ง', 'ใบหน้าน่ารัก', 'กระสุนเมือกสีเขียว'],
    flame_fox: ['หางเปลวไฟคู่', 'หูแหลมปลายทอง', 'ลูกไฟพิกเซล'],
    crystal_owl: ['ปีกผลึกเวทกระพือ', 'แก่นคริสตัลกลางอก', 'ลำแสงผลึก'],
    moonlight_firefly: ['ปีกภูตโปร่งแสง', 'ตะเกียงแสงจันทร์', 'ดูดไอเทมอัตโนมัติ'],
    gem_raccoon: ['หน้ากากแรคคูน + หางลาย', 'กระเป๋าพ่อค้า', 'ผลึกอัญมณีสีฟ้า'],
    aurora_cloud_dragon: ['เขาคริสตัล', 'ปีกแสงเหนือ', 'ลมหายใจออโรรา'],
  }
  return map[petId] ?? ['โมเดล 2D 4 ทิศทาง']
}

function getMountTraitTags(archetype: string): string[] {
  const map: Record<string, string[]> = {
    warhorse: ['อานศึกสีชาดขอบทอง', 'แผงคอพลิ้ว + บังเหียนทอง', 'ท่าควบ 4 ขา 6 เฟรม'],
    direwolf: ['แผงขนน้ำแข็งสีเงิน', 'เขี้ยวหิมะ + ดวงตาคริสตัล', 'หางพวงน้ำแข็ง'],
    griffin: ['หัวพญาอินทรี + จะงอยปากทอง', 'ปีกทองกระพือกลางอากาศ', 'ร่างราชสีห์สี่ขา'],
    kirin: ['เขากิเลนคู่ประกายดารา', 'แผงคอดวงดาว', 'กีบแสงดาวเรืองรอง'],
    cloud_dragon: ['มังกรฟ้าหนวดยาว', 'ปีกเมฆาแสงเหนือ', 'หางมังกรพลิ้วไสว'],
  }
  return map[archetype] ?? ['โมเดลสัตว์ขี่ 4 ทิศทาง']
}

export function ModelGalleryView({ compact = false }: { compact?: boolean }) {
  const jobModels = useMemo(() => getAllJobModels(), [])
  const monsterModels = useMemo(() => getAllMonsterModels(), [])
  const mountModels = useMemo(() => getAllMountModels(), [])
  const petModels = useMemo(() => getAllPetModels(), [])

  const [tab, setTab] = useState<'jobs' | 'monsters' | 'mounts' | 'pets'>('jobs')
  const [selectedJobId, setSelectedJobId] = useState<string>('novice')
  const [selectedMonsterId, setSelectedMonsterId] = useState<string>('abyss_dragon')
  const [selectedMountId, setSelectedMountId] = useState<string>('starlight_kirin')
  const [selectedPetId, setSelectedPetId] = useState<string>('phao_gold_naga')
  const [action, setAction] = useState<PreviewAction>('auto')
  const [dir, setDir] = useState<ModelDir>('down')
  const [liveAutoPhase, setLiveAutoPhase] = useState<SpriteAction>('idle')
  const [previewRebirth, setPreviewRebirth] = useState<number>(1)
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [vfxNonce, setVfxNonce] = useState<number>(0)

  const selectedJobEntry =
    jobModels.find((entry) => entry.job.id === selectedJobId) ?? jobModels[0]
  const selectedMonsterEntry =
    monsterModels.find((entry) => entry.monster.id === selectedMonsterId) ?? monsterModels[0]
  const selectedMountEntry =
    mountModels.find((entry) => entry.mount.id === selectedMountId) ?? mountModels[0]
  const selectedPetEntry =
    petModels.find((entry) => entry.pet.id === selectedPetId) ?? petModels[0]
  const activeJobSkill =
    selectedJobEntry.job.skills.find((s) => s.id === selectedSkillId) ?? selectedJobEntry.job.skills[0] ?? null
  const activeRebirthSpec = resolveRebirthAuraSpec(previewRebirth)

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
            อาชีพ ({jobModels.length})
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
            มอนสเตอร์ ({monsterModels.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'mounts'}
            onClick={() => setTab('mounts')}
            className={`pixel-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ${
              tab === 'mounts'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wind className="size-3.5" aria-hidden />
            สัตว์ขี่ ({mountModels.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'pets'}
            onClick={() => setTab('pets')}
            className={`pixel-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ${
              tab === 'pets'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <PawPrint className="size-3.5" aria-hidden />
            สัตว์เลี้ยง &amp; ผอบ ({petModels.length})
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
                ) : opt.id === 'skill' ? (
                  <Sparkles className="size-3" aria-hidden />
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
                {selectedJobEntry.job.tier === 0 ? 'คลาส 0 (เริ่มต้น)' : `คลาส ${selectedJobEntry.job.tier}`}
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
                rebirthCount={previewRebirth}
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
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
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
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  สกิลประจำอาชีพ &amp; เอฟเฟคจุติ (<span style={{ color: activeRebirthSpec.primaryColor }}>{activeRebirthSpec.title}</span>)
                </p>
                <div className="flex flex-wrap gap-1" role="group" aria-label="ออร่าจุติในแกลเลอรี">
                  {[
                    { count: 0, label: 'ปกติ' },
                    { count: 1, label: 'จุติ 1' },
                    { count: 2, label: 'จุติ 2' },
                    { count: 3, label: 'จุติ 3' },
                    { count: 4, label: 'จุติ 4' },
                    { count: 5, label: 'จุติ 5' },
                    { count: 6, label: 'จุติ 6' },
                  ].map((tier) => (
                    <button
                      key={tier.count}
                      type="button"
                      aria-pressed={previewRebirth === tier.count}
                      onClick={() => setPreviewRebirth(tier.count)}
                      className={`pixel-btn px-1.5 py-0.5 text-[10px] font-semibold ${
                        previewRebirth === tier.count
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {selectedJobEntry.job.skills.length > 0 ? (
                  selectedJobEntry.job.skills.map((s) => {
                    const vfx = getSkillVfxSpec(s.id, s.color, s.kind, selectedJobEntry.job.weaponTypes[0])
                    const isPicked = activeJobSkill?.id === s.id
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={isPicked}
                        onClick={() => {
                          setSelectedSkillId(s.id)
                          setVfxNonce((n) => n + 1)
                        }}
                        className={`flex items-center gap-1.5 border px-2 py-1 text-[11px] transition-colors ${
                          isPicked
                            ? 'border-primary bg-primary/15 text-foreground'
                            : 'border-border bg-background hover:border-primary/60'
                        }`}
                      >
                        <img src={getSkillIconPath(s.id)} alt="" width={16} height={16} className="pixelated size-4 shrink-0" />
                        <span className="font-semibold" style={{ color: vfx.primaryColor }}>
                          {s.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          ({s.mp}MP · {s.mult}x)
                        </span>
                      </button>
                    )
                  })
                ) : (
                  <span className="border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] text-gold">
                    พลัง GM พิเศษ: พิพากษาสวรรค์ [1] / คลื่นพลังราชันย์ [2] / ปาฏิหาริย์ GM [3] / ล่องหน / เสกของ / อมตะ
                  </span>
                )}
                <span className="ml-auto font-mono text-[10px] text-muted-foreground tabular-nums">
                  Idle 4F • Walk 4F (4 ทิศ) • Attack 4F • Skill 4F
                </span>
              </div>

              {selectedJobEntry.job.skills.length > 0 && activeJobSkill && (
                <div className="mt-2 grid gap-2 border border-border/70 bg-[#0a0d1c]/70 p-2 sm:grid-cols-[17rem_1fr] sm:items-center">
                  <SkillVfxPreview
                    jobId={selectedJobEntry.job.id}
                    skillId={activeJobSkill.id}
                    rebirthCount={previewRebirth}
                    playNonce={vfxNonce}
                    width={272}
                    height={112}
                    label={`ตัวอย่างเอฟเฟคสกิล ${activeJobSkill.name}`}
                  />
                  <div className="flex flex-col gap-1 text-[11px]">
                    <p className="font-bold text-foreground">{activeJobSkill.name}</p>
                    <p className="text-[10px]" style={{ color: getSkillVfxSpec(activeJobSkill.id, activeJobSkill.color).primaryColor }}>
                      {getSkillVfxSpec(activeJobSkill.id, activeJobSkill.color).effectLabel}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{activeRebirthSpec.subtitle}</p>
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
          </div>
        </section>
      ) : tab === 'monsters' ? (
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
      ) : tab === 'mounts' ? (
        <section
          aria-label={`ตัวอย่างโมเดลสัตว์ขี่ ${selectedMountEntry.mount.name}`}
          className="grid gap-3 border-2 border-amber-400/50 bg-muted p-3 md:grid-cols-[11.5rem_1fr]"
        >
          <div className="mmorpg-showcase-card flex flex-col items-center justify-between p-2.5">
            <div className="flex w-full items-center justify-between text-[10px]">
              <span className="border border-amber-400/50 bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-200">
                {selectedMountEntry.mount.rarity}
              </span>
              <span className="text-accent">
                {action === 'auto' ? ACTION_THAI[liveAutoPhase] : ACTION_THAI[action]}
              </span>
            </div>

            <div className="relative my-1.5 flex items-center justify-center rounded-sm border border-[#c9993f]/40 bg-[#0b0f21]/85 p-2 shadow-inner">
              <SpriteModelCanvas
                mode="mount"
                id={selectedMountEntry.mount.id}
                action={action}
                dir={dir}
                size={compact ? 124 : 144}
                onAutoPhaseChange={setLiveAutoPhase}
                label={`โมเดลสัตว์ขี่ ${selectedMountEntry.mount.name}`}
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
                  <h3 className="text-lg font-bold text-amber-300">
                    {selectedMountEntry.mount.name}
                    <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                      ({selectedMountEntry.mount.id})
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">{selectedMountEntry.mount.description}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="border border-border bg-background px-2 py-0.5 text-accent">
                    {selectedMountEntry.model.flying ? 'ลอย/บินได้' : 'วิ่งบนพื้น'}
                  </span>
                  <span className="border border-border bg-background px-2 py-0.5 text-gold tabular-nums">
                    +{selectedMountEntry.mount.speedBonusPct}% ความเร็ว
                  </span>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {getMountTraitTags(selectedMountEntry.model.archetype).map((trait) => (
                  <span key={trait} className="border border-amber-400/35 bg-amber-500/10 px-2 py-0.5 text-[11px] text-foreground">
                    <Sparkles className="mr-1 inline size-3 text-amber-300" aria-hidden />
                    {trait}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-center text-[11px] sm:grid-cols-4">
              {[
                ['ความเร็วขี่', `+${selectedMountEntry.mount.speedBonusPct}%`],
                ['HP เสริม', `+${formatNum(selectedMountEntry.mount.hpBonus)}`],
                ['ATK เสริม', `+${formatNum(selectedMountEntry.mount.atkBonus)}`],
                ['DEF เสริม', `+${formatNum(selectedMountEntry.mount.defBonus)}`],
              ].map(([k, v]) => (
                <div key={k} className="border border-border bg-background/80 px-1.5 py-1">
                  <p className="text-[10px] text-muted-foreground">{k}</p>
                  <p className="font-bold tabular-nums text-foreground">{v}</p>
                </div>
              ))}
            </div>

            <p className="font-mono text-[10px] text-muted-foreground tabular-nums">
              {selectedMountEntry.model.canvasSize.width}x{selectedMountEntry.model.canvasSize.height}px • 4 ทิศทาง • Idle 4F / Gallop 6F / Dash 4F
            </p>
          </div>
        </section>
      ) : (
        <section
          aria-label={`ตัวอย่างโมเดล ${selectedPetEntry.pet.name}`}
          className="grid gap-3 border-2 border-emerald-400/50 bg-muted p-3 md:grid-cols-[11.5rem_1fr]"
        >
          <div className="mmorpg-showcase-card flex flex-col items-center justify-between p-2.5">
            <div className="flex w-full items-center justify-between text-[10px]">
              <span className="border border-emerald-400/50 bg-emerald-500/15 px-1.5 py-0.5 font-semibold text-emerald-200">
                {selectedPetEntry.model.category === 'phao' ? 'ผอบ (Phao-ob)' : 'คู่หูสัตว์'}
              </span>
              <span className="text-accent">
                {action === 'auto' ? ACTION_THAI[liveAutoPhase] : ACTION_THAI[action]}
              </span>
            </div>

            <div className="relative my-1.5 flex items-center justify-center rounded-sm border border-[#c9993f]/40 bg-[#0b0f21]/85 p-2 shadow-inner">
              <SpriteModelCanvas
                mode="pet"
                id={selectedPetEntry.pet.id}
                action={action}
                dir={dir}
                size={compact ? 124 : 144}
                onAutoPhaseChange={setLiveAutoPhase}
                label={`โมเดล ${selectedPetEntry.pet.name}`}
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
                  <h3 className="text-lg font-bold text-emerald-300">
                    {selectedPetEntry.pet.name}
                    <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                      ({selectedPetEntry.pet.id})
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">{selectedPetEntry.pet.description}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="border border-border bg-background px-2 py-0.5 text-amber-300">
                    {selectedPetEntry.pet.rarity}
                  </span>
                  <span className="border border-border bg-background px-2 py-0.5 text-accent">
                    {selectedPetEntry.model.floating ? 'ลอยอารักขา' : 'เดินตามข้างกาย'}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {getPetTraitTags(selectedPetEntry.pet.id).map((trait) => (
                  <span key={trait} className="border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-foreground">
                    <Sparkles className="mr-1 inline size-3 text-emerald-300" aria-hidden />
                    {trait}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] sm:grid-cols-5">
              {[
                ['พลังยิง', formatNum(selectedPetEntry.pet.baseAtk)],
                ['ATK บัฟ', `+${selectedPetEntry.pet.atkBuff}`],
                ['HP บัฟ', `+${selectedPetEntry.pet.hpBonus}`],
                ['EXP บัฟ', `+${selectedPetEntry.pet.expBonusPct}%`],
                ['ทอง บัฟ', `+${selectedPetEntry.pet.goldBonusPct}%`],
              ].map(([k, v]) => (
                <div key={k} className="border border-border bg-background/80 px-1.5 py-1">
                  <p className="text-[10px] text-muted-foreground">{k}</p>
                  <p className="font-bold tabular-nums text-foreground">{v}</p>
                </div>
              ))}
            </div>

            <p className="font-mono text-[10px] text-muted-foreground tabular-nums">
              {selectedPetEntry.model.canvasSize.width}x{selectedPetEntry.model.canvasSize.height}px • 4 ทิศทาง • Idle 4F / Walk 6F / Attack (เปิดฝาผอบ) 4F
            </p>
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
                onClick={() => {
                  setSelectedJobId(job.id)
                  setSelectedSkillId(job.skills[0]?.id ?? null)
                  setVfxNonce((n) => n + 1)
                }}
                aria-pressed={selected}
                className={`flex flex-col items-center gap-1.5 p-2 text-center transition-all hover:brightness-110 ${
                  selected
                    ? 'mmorpg-showcase-card-active'
                    : 'mmorpg-showcase-card'
                }`}
              >
                <div className="flex w-full items-center justify-between text-[10px]">
                  <span className="font-semibold text-primary">
                    {job.tier === 0 ? 'T0 เริ่มต้น' : `T${job.tier}`}
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
      ) : tab === 'monsters' ? (
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
      ) : tab === 'mounts' ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {mountModels.map(({ mount, model }) => {
            const selected = mount.id === selectedMountEntry.mount.id
            return (
              <button
                key={mount.id}
                type="button"
                onClick={() => setSelectedMountId(mount.id)}
                aria-pressed={selected}
                className={`flex flex-col items-center gap-1.5 p-2 text-center transition-all hover:brightness-110 ${
                  selected ? 'mmorpg-showcase-card-active border-amber-400' : 'mmorpg-showcase-card'
                }`}
              >
                <div className="flex w-full items-center justify-between text-[10px]">
                  <span className="font-semibold text-amber-300">{mount.rarity}</span>
                  <span className="font-mono text-accent tabular-nums">+{mount.speedBonusPct}%</span>
                </div>
                <div className="grid size-24 place-items-center border border-[#c9993f]/35 bg-[#0b1024]/90 shadow-[inset_0_0_16px_rgba(245,158,11,0.16)]">
                  <SpriteModelCanvas
                    mode="mount"
                    id={mount.id}
                    action={compact && !selected && action === 'auto' ? 'idle' : action}
                    dir={dir}
                    size={88}
                    label={`พรีวิวสัตว์ขี่ ${mount.name}`}
                  />
                </div>
                <div className="mmorpg-ribbon w-full px-2 py-1">
                  <p className="truncate text-xs font-bold text-[#ffeaa7]">{mount.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {model.flying ? 'บิน/ลอยตัว' : 'วิ่งพื้นดิน'} • +{mount.atkBonus} ATK
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {petModels.map(({ pet, model }) => {
            const selected = pet.id === selectedPetEntry.pet.id
            return (
              <button
                key={pet.id}
                type="button"
                onClick={() => setSelectedPetId(pet.id)}
                aria-pressed={selected}
                className={`flex flex-col items-center gap-1.5 p-2 text-center transition-all hover:brightness-110 ${
                  selected ? 'mmorpg-showcase-card-active border-emerald-400' : 'mmorpg-showcase-card'
                }`}
              >
                <div className="flex w-full items-center justify-between text-[10px]">
                  <span className={`font-semibold ${model.category === 'phao' ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {model.category === 'phao' ? 'ผอบ' : 'คู่หู'}
                  </span>
                  <span className="font-mono text-muted-foreground tabular-nums">{pet.rarity}</span>
                </div>
                <div className="grid size-24 place-items-center border border-[#c9993f]/35 bg-[#0b1024]/90 shadow-[inset_0_0_16px_rgba(16,185,129,0.16)]">
                  <SpriteModelCanvas
                    mode="pet"
                    id={pet.id}
                    action={compact && !selected && action === 'auto' ? 'idle' : action}
                    dir={dir}
                    size={88}
                    label={`พรีวิว ${pet.name}`}
                  />
                </div>
                <div className="mmorpg-ribbon w-full px-2 py-1">
                  <p className="truncate text-xs font-bold text-foreground">{pet.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    ยิง {pet.baseAtk} • +{pet.hpBonus} HP
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
          ครบทั้ง {jobModels.length} อาชีพ • {monsterModels.length} มอนสเตอร์ • {mountModels.length} สัตว์ขี่ • {petModels.length} ผอบ/สัตว์เลี้ยง
        </span>
      </p>
    </div>
  )
}
