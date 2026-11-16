'use client'

import { useState } from 'react'
import { Award, BookOpen, Check, Gem } from 'lucide-react'
import { MONSTERS } from '@/lib/game/data'
import { claimBestiaryRewardAction, equipTitleAction } from '@/lib/game/engine'
import {
  BESTIARY_TIERS,
  ELEMENT_META,
  TITLE_DEFS,
  computeBestiaryAndTitleBonuses,
  evaluateUnlockedTitleIds,
  getMonsterElement,
  sanitizeRpgExt,
} from '@/lib/game/rpg-systems'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { PanelFrame, PxButton } from './panels'

export function CodexPanel() {
  const g = useGame()
  const p = g.p
  const [tab, setTab] = useState<'bestiary' | 'titles'>('bestiary')
  const [notice, setNotice] = useState<string | null>(null)

  if (!p) return null
  const ext = sanitizeRpgExt(p.rpgExt)
  const unlockedTitles = evaluateUnlockedTitleIds({
    kills: p.kills,
    rebirthCount: p.rebirthCount,
    questState: p.questState,
    towerState: p.towerState,
    rpgExt: ext,
  })
  const bonusSummary = computeBestiaryAndTitleBonuses({ ...ext, titles: unlockedTitles })
  const allMonsters = Object.values(MONSTERS).sort((a, b) => a.level - b.level)

  return (
    <PanelFrame
      title="สมุดมอนสเตอร์ & ฉายาผู้กล้า"
      subtitle={`โบนัสสะสมปัจจุบัน: +${formatNum(bonusSummary.hpBonus)} HP · +${formatNum(bonusSummary.atkBonus)} ATK · +${formatNum(bonusSummary.defBonus)} DEF · +${(bonusSummary.critBonus * 100).toFixed(1)}% คริ`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-border/70 pb-2.5">
        <PxButton
          variant={tab === 'bestiary' ? 'primary' : 'secondary'}
          onClick={() => setTab('bestiary')}
        >
          <span className="flex items-center gap-1.5">
            <BookOpen className="size-3.5" aria-hidden /> สมุดล่ามอนสเตอร์ ({allMonsters.length})
          </span>
        </PxButton>
        <PxButton
          variant={tab === 'titles' ? 'primary' : 'secondary'}
          onClick={() => setTab('titles')}
        >
          <span className="flex items-center gap-1.5">
            <Award className="size-3.5" aria-hidden /> ฉายา ({unlockedTitles.length}/{TITLE_DEFS.length})
          </span>
        </PxButton>
      </div>

      {notice && (
        <div className="mb-3 border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
          {notice}
        </div>
      )}

      {tab === 'bestiary' && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {allMonsters.map((m) => {
            const kills = ext.bestiary[m.id] ?? 0
            const claimedTier = ext.claimedBestiaryTiers[m.id] ?? 0
            const nextTier = BESTIARY_TIERS.find((t) => t.tier === claimedTier + 1)
            const canClaim = Boolean(nextTier && kills >= nextTier.target)
            const elem = ELEMENT_META[getMonsterElement(m.id)]
            const bossFactor = m.boss ? 1.5 : 1

            return (
              <div
                key={m.id}
                className="flex flex-col justify-between gap-2 border border-border/80 bg-background/60 p-3 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-3 shrink-0 border border-black"
                        style={{ backgroundColor: m.color }}
                      />
                      <span className="truncate font-bold text-foreground">
                        {m.boss ? '★ ' : ''}{m.name}
                      </span>
                      <span
                        className="shrink-0 border border-border/60 px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ color: elem.color, background: elem.bg }}
                      >
                        {elem.label}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                      Lv.{m.level}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                    <span>กำจัดแล้ว: {formatNum(kills)} ตัว</span>
                    <span>
                      {nextTier ? `ขั้นถัดไป ${kills}/${nextTier.target}` : 'ครบ 3 ขั้นสมบูรณ์'}
                    </span>
                  </div>

                  <div className="mt-1 h-1.5 w-full overflow-hidden border border-border bg-muted">
                    <div
                      className="h-full bg-emerald-400 transition-[width]"
                      style={{
                        width: `${Math.min(100, Math.round((kills / (nextTier?.target ?? 50)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-amber-300 tabular-nums">
                    {nextTier
                      ? `ขั้น ${nextTier.tier}: +${Math.round(nextTier.atk * bossFactor)} ATK, +${Math.round(nextTier.hp * bossFactor)} HP`
                      : 'รับโบนัสครบทั้งหมดแล้ว'}
                  </span>
                  {nextTier ? (
                    <PxButton
                      disabled={!canClaim}
                      onClick={() => {
                        const res = claimBestiaryRewardAction(m.id)
                        setNotice(res.message)
                      }}
                    >
                      <span className="flex items-center gap-1">
                        <Gem className="size-3" aria-hidden /> รับโบนัส
                      </span>
                    </PxButton>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                      <Check className="size-3.5" aria-hidden /> สำเร็จ
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'titles' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            ทุกฉายาที่ปลดล็อกให้โบนัสแบบ Passive 35% และฉายาที่ติดตั้งบนหัวจะแสดงผล 100% เต็ม
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {TITLE_DEFS.map((t) => {
              const unlocked = unlockedTitles.includes(t.id)
              const active = ext.activeTitle === t.id
              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between gap-2 border p-3 text-xs ${
                    active ? 'border-primary bg-primary/10' : 'border-border/80 bg-background/60'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold" style={{ color: unlocked ? t.color : '#64748b' }}>
                      «{t.name}»
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{t.requirement}</p>
                    <p className="mt-1 text-[11px] text-emerald-300 tabular-nums">
                      +{t.hpBonus} HP · +{t.atkBonus} ATK · +{t.defBonus} DEF · +{Math.round(t.critBonus * 100)}% คริ
                    </p>
                  </div>
                  <div className="shrink-0">
                    {active ? (
                      <PxButton
                        variant="secondary"
                        onClick={() => {
                          const res = equipTitleAction(null)
                          setNotice(res.message)
                        }}
                      >
                        ถอดฉายา
                      </PxButton>
                    ) : (
                      <PxButton
                        disabled={!unlocked}
                        onClick={() => {
                          const res = equipTitleAction(t.id)
                          setNotice(res.message)
                        }}
                      >
                        {unlocked ? 'ติดตั้ง' : 'ล็อก'}
                      </PxButton>
                    )}
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
