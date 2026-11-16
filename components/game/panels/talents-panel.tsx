'use client'

import { useState } from 'react'
import { Bookmark, Layers, RotateCcw, Sparkles, Swords, Zap } from 'lucide-react'
import {
  applyLoadoutAction,
  currentJob,
  resetTalentsAction,
  saveLoadoutAction,
  upgradeSkillAction,
  upgradeTalentAction,
} from '@/lib/game/engine'
import {
  MAX_SKILL_UPGRADE,
  TALENT_BRANCH_META,
  TALENT_NODES,
  computeTalentBonuses,
  sanitizeExtV2,
  skillUpgradeCost,
  type TalentBranch,
} from '@/lib/game/extended-systems'
import { playEnhanceSfx, playQuestClaimSfx } from '@/lib/game/sfx'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { PanelFrame, PxButton } from './panels'

export function TalentsPanel() {
  const { p } = useGame()
  const [tab, setTab] = useState<'talents' | 'skills' | 'loadouts'>('talents')
  const [notice, setNotice] = useState<string | null>(null)
  if (!p) return null

  const extV2 = sanitizeExtV2(p.extV2)
  const bonuses = computeTalentBonuses(extV2.talents)
  const job = currentJob()
  const skillPoints = p.skillPoints ?? 0

  return (
    <PanelFrame
      title="สกิล & สาย Talent & เซ็ตอุปกรณ์"
      subtitle={`แต้มสกิลคงเหลือ: ${skillPoints} แต้ม (ได้จากการอัปเลเวล) · ปรับแต่งสายบู๊ ป้องกัน หรือฟาร์มไวได้อิสระ`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
        <div className="flex flex-wrap gap-2">
          <PxButton variant={tab === 'talents' ? 'primary' : 'secondary'} onClick={() => setTab('talents')}>
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3.5" aria-hidden /> สายพรสวรรค์ (Talent)
            </span>
          </PxButton>
          <PxButton variant={tab === 'skills' ? 'primary' : 'secondary'} onClick={() => setTab('skills')}>
            <span className="flex items-center gap-1.5">
              <Zap className="size-3.5" aria-hidden /> อัปเกรดสกิลอาชีพ
            </span>
          </PxButton>
          <PxButton variant={tab === 'loadouts' ? 'primary' : 'secondary'} onClick={() => setTab('loadouts')}>
            <span className="flex items-center gap-1.5">
              <Layers className="size-3.5" aria-hidden /> สลับเซ็ตอุปกรณ์ ({extV2.loadouts.length})
            </span>
          </PxButton>
        </div>
        <span className="border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary tabular-nums">
          SP คงเหลือ: {skillPoints}
        </span>
      </div>

      {notice && (
        <div className="mb-3 border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary" role="status">
          {notice}
        </div>
      )}

      {tab === 'talents' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border border-border/70 bg-background/60 px-3 py-2 text-[11px] tabular-nums">
            <span className="text-muted-foreground">
              รวมบัฟ Talent: ATK +{bonuses.atkPct}% · DEF +{bonuses.defPct}% · HP +{bonuses.hpPct}% · CRIT +
              {(bonuses.critBonus * 100).toFixed(1)}% · ดูดเลือด {(bonuses.lifestealPct * 100).toFixed(1)}% · เร็ว +{bonuses.speedPct}%
            </span>
            <PxButton
              variant="danger"
              onClick={() => {
                const res = resetTalentsAction()
                setNotice(res.message)
              }}
            >
              <span className="flex items-center gap-1">
                <RotateCcw className="size-3" aria-hidden /> รีเซ็ต (500 G)
              </span>
            </PxButton>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {(['crimson', 'bastion', 'swift'] as TalentBranch[]).map((branch) => {
              const meta = TALENT_BRANCH_META[branch]
              const nodes = TALENT_NODES.filter((n) => n.branch === branch)
              return (
                <div key={branch} className="space-y-2 border border-border/80 bg-background/60 p-3">
                  <div>
                    <h3 className="text-xs font-bold" style={{ color: meta.color }}>
                      {meta.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">{meta.desc}</p>
                  </div>
                  <div className="space-y-2">
                    {nodes.map((node) => {
                      const rank = extV2.talents[node.id] ?? 0
                      const maxed = rank >= node.maxRank
                      const goldCost = 200 * (rank + 1)
                      return (
                        <div key={node.id} className="border border-border/60 bg-background/85 p-2 text-xs">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-foreground">{node.name}</span>
                            <span className="text-[11px] font-bold text-primary tabular-nums">
                              {rank}/{node.maxRank}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{node.description}</p>
                          <PxButton
                            variant={maxed ? 'secondary' : 'primary'}
                            disabled={maxed || skillPoints < 1 || p.gold < goldCost}
                            className="mt-2 w-full py-1 text-[10px]"
                            onClick={() => {
                              const res = upgradeTalentAction(node.id)
                              playEnhanceSfx(res.ok, false)
                              setNotice(res.message)
                            }}
                          >
                            {maxed ? 'ระดับสูงสุดแล้ว' : `อัปขั้น (1 SP + ${formatNum(goldCost)} G)`}
                          </PxButton>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'skills' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            อาชีพปัจจุบัน: <strong className="text-primary">{job.name}</strong> — การอัปเกรดสกิลเพิ่มความแรงสกิล +15% ต่อขั้นและลดคูลดาวน์
          </p>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {job.skills.map((sk, idx) => {
              const lv = p.skillLevels?.[sk.id] ?? 1
              const maxed = lv >= MAX_SKILL_UPGRADE
              const cost = skillUpgradeCost(lv)
              return (
                <div key={sk.id} className="flex flex-col justify-between gap-2 border border-border/80 bg-background/60 p-3 text-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold" style={{ color: sk.color }}>
                        [{idx + 1}] {sk.name}
                      </span>
                      <span className="font-bold text-primary tabular-nums">Lv.{lv}/{MAX_SKILL_UPGRADE}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                      ใช้ {sk.mp} MP · รูปแบบ {sk.kind === 'heal' ? 'ฟื้นฟูพลังชีวิต' : sk.kind === 'aoe-self' || sk.kind === 'aoe-target' ? 'โจมตีวงกว้าง' : sk.kind === 'multi' ? `โจมตีต่อเนื่อง ${sk.hits ?? 2} ครั้ง` : 'โจมตีเป้าหมายเดี่ยว'}
                    </p>
                    <p className="mt-1.5 text-[10px] text-amber-200 tabular-nums">
                      ตัวคูณปัจจุบัน: x{(sk.mult * (1 + (lv - 1) * 0.15)).toFixed(2)} · CD {Math.max(1.2, sk.cooldown - (lv - 1) * 0.2).toFixed(1)}s
                    </p>
                  </div>
                  <PxButton
                    disabled={maxed || skillPoints < cost.skillPoints || p.gold < cost.gold}
                    onClick={() => {
                      const res = upgradeSkillAction(sk.id)
                      playEnhanceSfx(res.ok, false)
                      setNotice(res.message)
                    }}
                  >
                    <span className="flex items-center justify-center gap-1 tabular-nums">
                      <Swords className="size-3.5" aria-hidden />
                      {maxed ? 'สกิลเต็มแล้ว' : `อัปสกิล (${cost.skillPoints} SP + ${formatNum(cost.gold)} G)`}
                    </span>
                  </PxButton>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'loadouts' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            บันทึกชุดอุปกรณ์และแฟชั่นที่สวมใส่อยู่ลงในช่องพรีเซ็ต เพื่อสลับเซ็ตฟาร์มไว เซ็ตตีบอส หรือเซ็ต PvP ได้ในคลิกเดียว
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {extV2.loadouts.map((preset, idx) => {
              const savedCount = Object.values(preset.equipmentUids).filter(Boolean).length
              return (
                <div key={preset.id} className="flex flex-col justify-between gap-3 border border-border/80 bg-background/60 p-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-primary">
                      <Bookmark className="size-3.5" aria-hidden />
                      {preset.name}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                      บันทึกอุปกรณ์แล้ว {savedCount}/5 ช่อง
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <PxButton
                      variant="accent"
                      onClick={() => {
                        const res = saveLoadoutAction(idx)
                        if (res.ok) playQuestClaimSfx(false)
                        setNotice(res.message)
                      }}
                    >
                      บันทึกชุดที่ใส่อยู่ลงช่องนี้
                    </PxButton>
                    <PxButton
                      variant="primary"
                      onClick={() => {
                        const res = applyLoadoutAction(idx)
                        if (res.ok) playQuestClaimSfx(false)
                        setNotice(res.message)
                      }}
                    >
                      สลับมาใช้เซ็ตนี้
                    </PxButton>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </PanelFrame>
  )
}
