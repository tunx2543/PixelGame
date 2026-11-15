'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Castle, ChevronDown, ChevronUp, Gem, LogOut, PawPrint, ScrollText, Sparkles, Terminal, Users, UsersRound } from 'lucide-react'
import { useGame } from '@/lib/game/use-game'
import {
  castGmSkill,
  currentJob,
  game,
  getActiveAccountGameUid,
  getStats,
  isCurrentAccountGm,
  notify,
  openPanel,
  quitToTitle,
  saveGame,
} from '@/lib/game/engine'
import { expToNext, MAX_LEVEL } from '@/lib/game/data'
import { useDailyMissions } from '@/lib/game/daily-missions'
import { PERMANENT_GM_GAME_UID } from '@/lib/game/permissions'
import { countClaimableQuests } from '@/lib/game/systems'
import { formatNum } from './format'
import { PWAInstallButton } from './pwa-controls'

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  return (
    <div className="flex items-center gap-1 text-[10px]">
      <span className="w-7 text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-sm bg-muted/60">
        <div className={`h-full ${color} transition-[width]`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="w-16 text-right text-muted-foreground">{formatNum(value)}/{formatNum(max)}</span>
    </div>
  )
}

export function Hud({ onOpenCheckin }: { onOpenCheckin?: () => void }) {
  const { p } = useGame()
  const dailyMissions = useDailyMissions()
  const [isOpenProfile, setIsOpenProfile] = useState(true)

  if (!p) return null

  const s = getStats(p)
  const job = currentJob()
  const need = expToNext(p.level)
  const isGmDev = Boolean(p.gm && isCurrentAccountGm())
  const displayGameUid = isGmDev ? PERMANENT_GM_GAME_UID : (p.gameUid ?? getActiveAccountGameUid())
  const claimableQuests =
    countClaimableQuests(p.questState, p.towerState, p.petState, p.kills) + dailyMissions.claimableCount

  return (
    <div className="pointer-events-auto pixel-panel absolute left-2 top-2 z-20 w-[min(14rem,calc(100vw-1rem))] p-2 shadow-lg md:left-3 md:top-3">
      <button
        type="button"
        onClick={() => setIsOpenProfile((prev) => !prev)}
        aria-expanded={isOpenProfile}
        aria-label={isOpenProfile ? 'พับโปรไฟล์' : 'เปิดโปรไฟล์'}
        className="flex w-full cursor-pointer select-none items-center justify-between gap-1 text-left hover:opacity-90"
      >
        <div className="flex min-w-0 items-center gap-1.5 truncate">
          <p className="truncate text-xs font-semibold text-foreground">
            {isGmDev && <span className="mr-1 text-gold">[GM]</span>}
            {p.name}
          </p>
          <p className="shrink-0 text-[10px] text-primary">Lv.{p.level} {job.name}</p>
        </div>
        <span className="p-0.5 text-muted-foreground">
          {isOpenProfile ? <ChevronUp className="size-3.5" aria-hidden /> : <ChevronDown className="size-3.5" aria-hidden />}
        </span>
      </button>

      {isOpenProfile && (
        <div className="mt-1.5 border-t border-border/60 pt-1.5">
          <div className="flex flex-col gap-0.5">
            <Bar label="HP" value={p.hp} max={s.maxHp} color="bg-hp" />
            <Bar label="MP" value={p.mp} max={s.maxMp} color="bg-mp" />
            <Bar label="EXP" value={p.level >= MAX_LEVEL ? need : p.exp} max={need} color="bg-exp" />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2.5">
              <p className="text-gold">{formatNum(p.gold)} G</p>
              <p className="text-cyan-200">{formatNum(p.diamonds ?? 0)} D</p>
            </div>
            {displayGameUid && (
              <span className={`font-mono text-[10px] font-bold ${isGmDev ? 'text-amber-300' : 'text-muted-foreground'}`}>
                UID:{displayGameUid}
              </span>
            )}
          </div>
          {game.party && (
            <button
              type="button"
              onClick={() => {
                game.partyPanelOpen = !game.partyPanelOpen
                if (game.partyPanelOpen) {
                  game.socialMenuOpen = false
                  game.onlinePanelOpen = false
                }
                game.panel = null
                notify()
              }}
              className={`mt-1 flex w-full items-center justify-between gap-1 border px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${
                game.partySameMapCount > 0
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                  : 'border-purple-400/40 bg-purple-500/15 text-purple-200 hover:bg-purple-500/25'
              }`}
            >
              <span className="truncate">
                ปาร์ตี้ {game.party.memberIds.length}/4
              </span>
              <span className="shrink-0 font-mono">
                {game.partySameMapCount > 0
                  ? `EXP+${Math.round((game.partyExpMul - 1) * 100)}% G+${Math.round((game.partyGoldMul - 1) * 100)}%`
                  : 'ต่างแมพ'}
              </span>
            </button>
          )}
          {isGmDev && (
            <div className="mt-2 border-t border-gold/40 pt-2">
              <p className="mb-1 text-[10px] font-semibold text-gold">GM · DEV TOOLS (UID 0000)</p>
              <div className="grid grid-cols-3 gap-1">
                <button type="button" onClick={() => castGmSkill('invisible')} className="pixel-btn bg-gold/20 px-1 py-1 text-[9px] text-gold">ล่องหน</button>
                <button type="button" onClick={() => castGmSkill('summon')} className="pixel-btn bg-gold/20 px-1 py-1 text-[9px] text-gold">เสกของ</button>
                <button type="button" onClick={() => castGmSkill('immortal')} className="pixel-btn bg-gold/20 px-1 py-1 text-[9px] text-gold">อมตะ</button>
              </div>
              <button
                type="button"
                onClick={() => openPanel('dev-tools')}
                className="pixel-btn mt-1 flex w-full items-center justify-center gap-1 border border-amber-400/60 bg-amber-400/20 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-400/30"
              >
                <Terminal className="size-3" aria-hidden />
                เปิดระบบ Dev Console
              </button>
            </div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-1">
            {p.mapId === 'town' && onOpenCheckin && <button type="button" onClick={onOpenCheckin} className="pixel-btn col-span-2 border border-amber-300/40 bg-amber-300/15 px-2 py-1.5 text-[10px] font-semibold text-amber-200 hover:bg-amber-300/25">เช็คอินรับรางวัลประจำวัน</button>}
            {p.mapId === 'town' && <button type="button" onClick={() => openPanel('gem-shop')} className="pixel-btn col-span-2 flex items-center justify-center gap-1.5 border border-cyan-300/40 bg-cyan-300/10 px-2 py-1.5 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-300/20"><Gem className="size-3.5" aria-hidden /> ร้านค้าเพชร</button>}
            <button type="button" onClick={() => { game.autoFarm = !game.autoFarm; notify() }} className={`pixel-btn col-span-2 px-2 py-1 text-[10px] ${game.autoFarm ? 'bg-green-500/25 text-green-300' : 'bg-secondary text-muted-foreground'}`}>{game.autoFarm ? 'หยุดออโต้ฟาร์ม' : 'เริ่มออโต้ฟาร์ม'}</button>
            <button type="button" disabled={!game.autoFarm} onClick={() => { game.autoSkills = !game.autoSkills; notify() }} className={`pixel-btn col-span-2 px-2 py-1 text-[10px] ${game.autoSkills ? 'bg-purple-500/25 text-purple-300' : 'bg-secondary text-muted-foreground'}`}>ออโต้สกิล: {game.autoSkills ? 'เปิด' : 'ปิด'}</button>
            <button type="button" onClick={() => openPanel('inventory')} className="pixel-btn bg-secondary px-2 py-1 text-[10px] text-foreground hover:bg-secondary/80">กระเป๋า</button>
            <button type="button" onClick={() => openPanel('gacha')} className="pixel-btn bg-primary/20 px-2 py-1 text-[10px] text-primary hover:bg-primary/30">เปิดตู้กาชา</button>
            <button type="button" onClick={() => openPanel('pets')} className="pixel-btn flex items-center justify-center gap-1 bg-accent/15 px-2 py-1 text-[10px] text-accent hover:bg-accent/25">
              <PawPrint className="size-3" aria-hidden /> สัตว์เลี้ยง
            </button>
            <button type="button" onClick={() => openPanel('quests')} className="pixel-btn flex items-center justify-center gap-1 bg-amber-400/15 px-2 py-1 text-[10px] text-amber-200 hover:bg-amber-400/25">
              <ScrollText className="size-3" aria-hidden /> เควสต์{claimableQuests > 0 ? ` (${claimableQuests})` : ''}
            </button>
            <Link
              href="/tower"
              onClick={() => saveGame()}
              className="pixel-btn col-span-2 flex items-center justify-center gap-1.5 bg-primary/20 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/30"
            >
              <Castle className="size-3" aria-hidden /> หอคอยไต่ชั้น (ชั้น {(p.towerState?.highestFloor ?? 0) + 1})
            </Link>
            <button
              type="button"
              onClick={() => openPanel('models')}
              className="pixel-btn col-span-2 flex items-center justify-center gap-1.5 bg-secondary px-2 py-1 text-[10px] font-semibold text-foreground hover:brightness-110"
            >
              <Sparkles className="size-3 text-gold" aria-hidden /> คลังโมเดล 2D
            </button>
            <button
              type="button"
              onClick={() => {
                game.socialMenuOpen = !game.socialMenuOpen
                if (game.socialMenuOpen) {
                  game.onlinePanelOpen = false
                  game.partyPanelOpen = false
                }
                game.panel = null
                notify()
              }}
              className="pixel-btn flex items-center justify-center gap-1 bg-accent/20 px-1.5 py-1 text-[10px] font-semibold text-accent hover:bg-accent/30"
              aria-label="เปิดรายชื่อเพื่อน"
              title="รายชื่อเพื่อน"
            >
              <UsersRound className="size-3" aria-hidden /> เพื่อน
            </button>
            <button
              type="button"
              onClick={() => {
                game.partyPanelOpen = !game.partyPanelOpen
                if (game.partyPanelOpen) {
                  game.socialMenuOpen = false
                  game.onlinePanelOpen = false
                }
                game.panel = null
                notify()
              }}
              aria-expanded={game.partyPanelOpen}
              aria-label="เปิดระบบปาร์ตี้"
              title="ระบบปาร์ตี้"
              className={`pixel-btn flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-semibold ${
                game.partyPanelOpen || game.partyInvites.length > 0
                  ? 'bg-purple-500/35 text-purple-100'
                  : 'bg-purple-500/20 text-purple-200 hover:bg-purple-500/30'
              }`}
            >
              <Users className="size-3" aria-hidden />
              ปาร์ตี้{game.party ? ` (${game.party.memberIds.length}/4)` : game.partyInvites.length > 0 ? ` (${game.partyInvites.length})` : ''}
            </button>
            <button
              type="button"
              onClick={() => quitToTitle()}
              className="pixel-btn col-span-2 flex items-center justify-center gap-1 bg-secondary px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
              title="กลับหน้าล็อคอินตัวละคร"
            >
              <LogOut className="size-3" aria-hidden /> สลับตัว
            </button>
            <PWAInstallButton variant="hud" />
          </div>

          {dailyMissions.board && (
            <button
              type="button"
              onClick={() => openPanel('quests')}
              className="mt-2 w-full border border-border/70 bg-muted/40 p-1.5 text-left transition-colors hover:border-primary/60"
            >
              <div className="mb-1 flex items-center justify-between text-[9px] font-semibold text-primary">
                <span>ภารกิจสุ่มวันนี้</span>
                {dailyMissions.claimableCount > 0 && (
                  <span className="text-accent">รับรางวัลได้ {dailyMissions.claimableCount}</span>
                )}
              </div>
              <div className="space-y-0.5">
                {dailyMissions.board.missions.map((m) => {
                  const done = m.progress >= m.target
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-1 text-[9px]">
                      <span className={`truncate ${m.claimed ? 'text-muted-foreground line-through' : done ? 'text-accent font-semibold' : 'text-foreground/90'}`}>
                        {m.title}
                      </span>
                      <span className={`shrink-0 tabular-nums ${m.claimed ? 'text-muted-foreground' : done ? 'text-accent font-semibold' : 'text-muted-foreground'}`}>
                        {m.claimed ? 'รับแล้ว' : `${Math.min(m.target, m.progress)}/${m.target}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
