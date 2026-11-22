'use client'

import { useEffect, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Leaf,
  MessageCircle,
  ScrollText,
  Users,
} from 'lucide-react'
import { expToNext } from '@/lib/game/data'
import {
  game,
  gatherNearbyNodeAction,
  interact,
  jobExpToNext,
  notify,
  openPanel,
  toggleMountRiding,
  togglePkModeAction,
} from '@/lib/game/engine'
import {
  findNearbyGatheringNode,
  getActiveAsuraBoostSummary,
  getActiveFoodBuffBonuses,
  sanitizeExtV2,
} from '@/lib/game/extended-systems'
import { sanitizeMountState } from '@/lib/game/mounts'
import { getEffectiveVipBonuses } from '@/lib/game/premium/vip'
import { updateUiPref, useUiLayout } from '@/lib/game/ui-layout'
import { useGame } from '@/lib/game/use-game'
import type { MenuIconId } from '@/lib/game/menu-icons'
import { cn } from '@/lib/utils'
import { formatCompactNum } from './format'
import { GameArtIcon } from './game-badge-icon'

function formatBuffRemain(remainMs: number): string {
  const sec = Math.max(1, Math.ceil(remainMs / 1000))
  if (sec < 60) return `${sec}s`
  const mins = Math.ceil(sec / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h`
}

export function Hud({ compact = false, slim = false }: { compact?: boolean; slim?: boolean }) {
  const { p } = useGame()
  const layout = useUiLayout()
  if (!p) return null

  const partyCount = game.party?.memberIds.length ?? 0

  return (
    <section
      aria-label="แถบสถานะภารกิจ ปาร์ตี้ และทรัพยากร"
      data-testid="vitals-hud"
      className="pointer-events-auto flex w-full flex-col gap-1"
    >
      {/* Compact Quest & Party Dropdown Strip matching Asura HUD */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => updateUiPref('questTrackerHidden', !layout.preferences.questTrackerHidden)}
          title="พับ/แสดงแถบภารกิจ"
          className="flex flex-1 items-center justify-between gap-1 rounded border border-[#32578a]/75 bg-[#0b1320]/85 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-200 hover:border-amber-300/75"
        >
          <span className="flex items-center gap-1 truncate">
            <ScrollText className="size-3 shrink-0 text-amber-300" aria-hidden />
            <span className="truncate">ภารกิจ</span>
          </span>
          <ChevronDown className="size-3 shrink-0 text-slate-300" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => {
            game.partyPanelOpen = !game.partyPanelOpen
            if (game.partyPanelOpen) {
              game.onlinePanelOpen = false
              game.socialMenuOpen = false
            }
            notify()
          }}
          title="หน้าต่างปาร์ตี้"
          className="flex flex-1 items-center justify-between gap-1 rounded border border-[#32578a]/75 bg-[#0b1320]/85 px-1.5 py-0.5 text-[9.5px] font-bold text-sky-200 hover:border-sky-300/75 tabular-nums"
        >
          <span className="flex items-center gap-1 truncate">
            <Users className="size-3 shrink-0 text-sky-300" aria-hidden />
            <span className="truncate">{partyCount > 0 ? `ตี้ (${partyCount})` : 'ปาร์ตี้'}</span>
          </span>
          <ChevronDown className="size-3 shrink-0 text-slate-300" aria-hidden />
        </button>
      </div>

      {!compact && (
        <div
          className={cn(
            'flex items-center justify-between gap-1.5 rounded border border-[#2a4a78]/70 bg-[#09101c]/82 px-2 py-0.5 font-semibold',
            slim ? 'text-[9px]' : 'text-[10px]',
          )}
        >
          <button
            type="button"
            onClick={() => openPanel('inventory')}
            className="flex items-center gap-1 whitespace-nowrap text-gold tabular-nums hover:brightness-110"
          >
            <GameArtIcon iconId="gold-coin" size={14} />
            <span>{formatCompactNum(p.gold)} G</span>
          </button>
          <button
            type="button"
            onClick={() => openPanel('gem-shop')}
            className="flex items-center gap-1 whitespace-nowrap text-cyan-200 tabular-nums hover:brightness-110"
          >
            <GameArtIcon iconId="soul-gem" size={14} />
            <span>{formatCompactNum(p.diamonds ?? 0)} โซล</span>
          </button>
        </div>
      )}
    </section>
  )
}

export function AsuraBuffAndToggleStrip() {
  const { p } = useGame()
  const [buffExpanded, setBuffExpanded] = useState(true)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const extV2 = p ? sanitizeExtV2(p.extV2) : null
  const boostSummary = extV2 ? getActiveAsuraBoostSummary(extV2, nowMs) : null
  const activeBoostCount = boostSummary?.activeList.length ?? 0
  const hasAnyTimedBuff = Boolean(
    activeBoostCount > 0 ||
      (extV2?.activeFoodBuff && extV2.activeFoodBuff.expiresAtMs > nowMs) ||
      (p && (p.lootMagnetUntil ?? 0) > nowMs),
  )

  useEffect(() => {
    if (!hasAnyTimedBuff) return
    const timer = window.setInterval(() => setNowMs(Date.now()), 5000)
    return () => window.clearInterval(timer)
  }, [hasAnyTimedBuff])

  if (!p || !extV2 || !boostSummary) return null

  const vipBonus = getEffectiveVipBonuses(p.premium?.vip, nowMs)
  const foodBuff = getActiveFoodBuffBonuses(extV2.activeFoodBuff, nowMs)
  const mountState = sanitizeMountState(p.mountState, p.ownedGemItems)
  const hasMount = Object.keys(mountState.ownedMounts).length > 0
  const isMounted = Boolean(mountState.activeMountId && mountState.mounted)
  const nearbyNode = findNearbyGatheringNode(p.mapId, p.x, p.y)
  const nearNpc = !game.panel ? game.nearNpc : null

  const buffBadges: Array<{
    key: string
    tag: string
    title: string
    remain: string
    tone: string
    iconId: MenuIconId
  }> = []

  for (const b of boostSummary.activeList) {
    const tagMap: Record<string, string> = {
      exp: 'XP',
      jp: 'JP',
      lifeskill: 'LS',
      speed: 'SPD',
      weight: 'WT',
      stat: 'ALL',
    }
    const toneMap: Record<string, string> = {
      exp: 'border-amber-300/85 bg-amber-950/90 text-amber-200',
      jp: 'border-orange-300/85 bg-orange-950/90 text-orange-200',
      lifeskill: 'border-emerald-300/85 bg-emerald-950/90 text-emerald-200',
      speed: 'border-cyan-300/85 bg-cyan-950/90 text-cyan-200',
      weight: 'border-sky-300/85 bg-sky-950/90 text-sky-200',
      stat: 'border-fuchsia-300/85 bg-fuchsia-950/90 text-fuchsia-200',
    }
    const iconId: MenuIconId = b.kind === 'jp' ? 'buff-jp' : b.kind === 'speed' ? 'mount-wind' : 'buff-xp'
    buffBadges.push({
      key: `boost_${b.id}`,
      tag: b.shortTag || tagMap[b.kind] || 'BUF',
      title: `${b.label} (${formatBuffRemain(b.expiresAtMs - nowMs)})`,
      remain: formatBuffRemain(b.expiresAtMs - nowMs),
      tone: toneMap[b.kind] ?? 'border-sky-300/80 bg-slate-900/90 text-white',
      iconId,
    })
  }

  if (foodBuff.active && extV2.activeFoodBuff) {
    buffBadges.push({
      key: 'food',
      tag: 'FOOD',
      title: `${extV2.activeFoodBuff.name} (${foodBuff.remainingSec}s)`,
      remain: formatBuffRemain(foodBuff.remainingSec * 1000),
      tone: 'border-lime-300/85 bg-lime-950/90 text-lime-200',
      iconId: 'buff-food',
    })
  }

  if (vipBonus.active && vipBonus.tierDef) {
    buffBadges.push({
      key: 'vip',
      tag: 'VIP',
      title: `${vipBonus.tierDef.name} (+EXP ${vipBonus.expBonusPct}%)`,
      remain: `${Math.max(1, Math.ceil(vipBonus.remainingMs / 86400000))}d`,
      tone: 'border-yellow-300/85 bg-yellow-950/90 text-yellow-200',
      iconId: 'buff-vip',
    })
  }

  if ((p.lootMagnetUntil ?? 0) > nowMs) {
    buffBadges.push({
      key: 'magnet',
      tag: 'MAG',
      title: 'แม่เหล็กดูดไอเทมอัตโนมัติ',
      remain: formatBuffRemain((p.lootMagnetUntil ?? 0) - nowMs),
      tone: 'border-cyan-300/85 bg-cyan-950/90 text-cyan-200',
      iconId: 'buff-magnet',
    })
  }

  return (
    <div
      data-testid="auto-farm-widget"
      className="pointer-events-auto flex flex-col items-start gap-1 select-none"
    >
      {/* Row 1: Expandable Buff Timer Strip */}
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => setBuffExpanded((v) => !v)}
          aria-expanded={buffExpanded}
          title={buffExpanded ? 'ย่อแถบเวลาบัฟ' : 'ขยายแถบเวลาบัฟ'}
          className="grid size-6 place-items-center rounded border border-[#3b6bb3]/75 bg-[#0c1624]/85 text-white hover:border-amber-300"
        >
          {buffExpanded ? <ChevronLeft className="size-3.5" aria-hidden /> : <ChevronRight className="size-3.5" aria-hidden />}
        </button>

        {buffExpanded &&
          buffBadges.map((b) => (
            <div
              key={b.key}
              title={b.title}
              className={cn(
                'relative flex size-7 flex-col items-center justify-between rounded border px-0.5 py-0.5 shadow-md sm:size-7',
                b.tone,
              )}
            >
              <GameArtIcon iconId={b.iconId} size={14} />
              <span className="font-mono text-[7.5px] font-extrabold leading-none text-white tabular-nums">
                {b.remain}
              </span>
              <span className="sr-only">{b.tag}</span>
            </div>
          ))}
      </div>

      {/* Row 2: Quick Action Toggles (AutoSkill, AutoFarm, PK, Mount) + Context Prompt */}
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          aria-pressed={game.autoSkills}
          onClick={() => {
            if (!game.autoFarm) game.autoFarm = true
            game.autoSkills = !game.autoSkills
            notify()
          }}
          title="สลับใช้ออโต้สกิล"
          className={cn(
            'grid size-7 place-items-center rounded border shadow transition-all hover:brightness-115',
            game.autoSkills && game.autoFarm
              ? 'border-purple-300 bg-purple-700/90 text-white'
              : 'border-[#3b6bb3]/80 bg-[#0d1726]/92 text-slate-300',
          )}
        >
          <GameArtIcon iconId="auto-skill" size={18} />
        </button>

        <button
          type="button"
          aria-pressed={game.autoFarm}
          onClick={() => {
            game.autoFarm = !game.autoFarm
            notify()
          }}
          title={game.autoFarm ? 'ปิดออโต้ฟาร์ม' : 'เปิดออโต้ฟาร์ม'}
          className={cn(
            'grid size-7 place-items-center rounded border shadow transition-all hover:brightness-115',
            game.autoFarm
              ? 'border-emerald-300 bg-emerald-700/90 text-white'
              : 'border-[#3b6bb3]/80 bg-[#0d1726]/92 text-slate-300',
          )}
        >
          <GameArtIcon iconId="auto-farm" size={18} />
        </button>

        <button
          type="button"
          aria-pressed={extV2.pkEnabled}
          onClick={() => togglePkModeAction()}
          title={extV2.pkEnabled ? 'สถานะ PK เปิดอยู่ (คลิกเพื่อปิด)' : 'สถานะ PK ปิดอยู่ (คลิกเพื่อเปิดโหมดท้าสู้)'}
          className={cn(
            'flex h-7 min-w-7 items-center justify-center gap-0.5 rounded border px-1.5 font-mono text-[9.5px] font-extrabold shadow transition-all hover:brightness-115',
            extV2.pkEnabled
              ? 'border-rose-300 bg-rose-700/95 text-white shadow-[0_0_8px_rgba(244,63,94,0.5)]'
              : 'border-[#3b6bb3]/80 bg-[#0d1726]/92 text-slate-300 hover:border-rose-300/60 hover:text-white',
          )}
        >
          <GameArtIcon iconId="pk-swords" size={15} />
          <span>PK</span>
        </button>

        <button
          type="button"
          data-testid="hud-mount-toggle"
          aria-pressed={isMounted}
          onClick={() => (hasMount ? toggleMountRiding() : openPanel('pets'))}
          title={hasMount ? (isMounted ? 'ลงจากสัตว์ขี่ [M]' : 'ขึ้นขี่สัตว์ [M]') : 'ดูสัตว์ขี่และคู่หู'}
          className={cn(
            'grid size-7 place-items-center rounded border shadow transition-all hover:brightness-115',
            isMounted
              ? 'border-amber-300 bg-amber-600/90 text-white'
              : 'border-[#3b6bb3]/80 bg-[#0d1726]/92 text-cyan-200 hover:border-amber-300/70',
          )}
        >
          <GameArtIcon iconId="mount-wind" size={18} />
        </button>

        {nearNpc && (
          <button
            type="button"
            onClick={() => interact()}
            className="flex h-7 items-center gap-1 rounded border border-emerald-300/80 bg-emerald-950/90 px-2 text-[10px] font-bold text-emerald-200 shadow-lg hover:brightness-110"
          >
            <MessageCircle className="size-3" aria-hidden />
            คุย: {nearNpc.name} [E]
          </button>
        )}

        {nearbyNode && (
          <button
            type="button"
            onClick={() => gatherNearbyNodeAction(nearbyNode.id)}
            className="flex h-7 items-center gap-1 rounded border border-lime-300/70 bg-lime-950/90 px-2 text-[10px] font-bold text-lime-200 shadow-lg hover:brightness-110"
          >
            <Leaf className="size-3" aria-hidden />
            {nearbyNode.label} [E]
          </button>
        )}
      </div>
    </div>
  )
}

export function AsuraExpStrip() {
  const { p } = useGame()
  if (!p) return null

  const maxExp = expToNext(p.level)
  const xpPct = p.level >= 99 ? 100 : Math.min(100, (p.exp / Math.max(1, maxExp)) * 100)
  const jLv = Math.max(1, p.jobLevel ?? 1)
  const maxJp = jobExpToNext(jLv)
  const jpPct = jLv >= 99 ? 100 : Math.min(100, ((p.jobExp ?? 0) / Math.max(1, maxJp)) * 100)

  return (
    <div
      data-testid="asura-exp-strip"
      className="pointer-events-auto flex items-center gap-1.5 select-none"
    >
      <button
        type="button"
        onClick={() => openPanel('character')}
        title={`ค่าประสบการณ์ตัวละคร: ${p.exp} / ${maxExp}`}
        className="relative h-5 w-28 overflow-hidden rounded border border-[#3b6bb3]/85 bg-[#0c1626]/92 shadow-md sm:w-36"
      >
        <div
          className="h-full bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#38bdf8] transition-[width] duration-200"
          style={{ width: `${xpPct}%` }}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[10px] font-extrabold text-white [text-shadow:0_1px_2px_#000] tabular-nums">
          XP {xpPct.toFixed(2)} %
        </span>
      </button>

      <button
        type="button"
        onClick={() => openPanel('job')}
        title={`ค่าประสบการณ์อาชีพ: ${p.jobExp ?? 0} / ${maxJp}`}
        className="relative h-5 w-28 overflow-hidden rounded border border-[#3b6bb3]/85 bg-[#0c1626]/92 shadow-md sm:w-36"
      >
        <div
          className="h-full bg-gradient-to-r from-[#b45309] via-[#d97706] to-[#fbbf24] transition-[width] duration-200"
          style={{ width: `${jpPct}%` }}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[10px] font-extrabold text-white [text-shadow:0_1px_2px_#000] tabular-nums">
          JP {jpPct.toFixed(2)} %
        </span>
      </button>
    </div>
  )
}
