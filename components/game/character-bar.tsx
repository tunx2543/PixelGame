'use client'

import { useEffect, useRef, useState } from 'react'
import { Crown, Hammer, LogOut, Star, Store, Warehouse, Weight } from 'lucide-react'
import {
  currentJob,
  getActiveAccountGameUid,
  getInventoryWeightSummary,
  getStats,
  isCurrentAccountGm,
  openPanel,
  quitToTitle,
  resolvePlayerFashionLoadout,
  type PanelId,
} from '@/lib/game/engine'
import { PERMANENT_GM_GAME_UID } from '@/lib/game/permissions'
import { formatVipRemaining, getEffectiveVipBonuses } from '@/lib/game/premium/vip'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from './format'
import { SpriteModelCanvas } from './sprite-model-canvas'

export function CharacterBar({ compact = false }: { compact?: boolean; layout?: 'desktop' | 'mobile' }) {
  const { p } = useGame()
  const [vipMenuOpen, setVipMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!vipMenuOpen) return
    const handleOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setVipMenuOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setVipMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', handleOutside)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('pointerdown', handleOutside)
      window.removeEventListener('keydown', handleKey)
    }
  }, [vipMenuOpen])

  if (!p) return null

  const job = currentJob()
  const s = getStats(p)
  const weightSummary = getInventoryWeightSummary(p)
  const isGmDev = Boolean(p.gm && isCurrentAccountGm())
  const displayGameUid = isGmDev ? PERMANENT_GM_GAME_UID : (p.gameUid ?? getActiveAccountGameUid())
  const vipBonus = getEffectiveVipBonuses(p.premium?.vip)
  const hpPct = Math.max(0, Math.min(100, (p.hp / Math.max(1, s.maxHp)) * 100))
  const mpPct = Math.max(0, Math.min(100, (p.mp / Math.max(1, s.maxMp)) * 100))
  const jobLevel = Math.max(1, p.jobLevel ?? 1)

  const openRemote = (panel: PanelId) => {
    openPanel(panel)
    setVipMenuOpen(false)
  }

  return (
    <div
      ref={containerRef}
      data-testid="character-bar"
      className="pointer-events-auto relative flex w-full items-start gap-1.5 select-none"
    >
      {/* Left: Circular Asura Portrait + Lv / JLv + Weight % */}
      <div className="flex shrink-0 flex-col items-center">
        <button
          type="button"
          onClick={() => openPanel('character')}
          title={`${p.name} · ${job.name} (#${displayGameUid ?? 'Guest'}) — เปิดหน้าต่างตัวละคร`}
          className="relative grid size-11 place-items-center overflow-hidden rounded-full border-2 border-[#8ec5ff] bg-gradient-to-b from-[#29436b] to-[#0e1726] shadow-[0_3px_10px_rgba(0,0,0,0.65)] transition-transform hover:scale-105 sm:size-12"
        >
          <SpriteModelCanvas
            mode="job"
            id={p.jobId}
            action="idle"
            dir="down"
            size={38}
            variant="portrait"
            fashion={resolvePlayerFashionLoadout(p)}
            isGm={isGmDev}
            showShadow={false}
            showAura={false}
            label={`ภาพโปรไฟล์ ${p.name}`}
          />
        </button>
        <div className="-mt-1.5 flex items-center gap-1 rounded bg-[#0a101b]/90 px-1 py-px font-mono text-[9.5px] font-extrabold leading-none shadow tabular-nums">
          <span className="text-amber-300" title="เลเวลตัวละคร">
            {p.level}
          </span>
          <span className="text-orange-400" title="เลเวลอาชีพ (JLv)">
            {jobLevel}
          </span>
        </div>
        {!compact && (
          <button
            type="button"
            onClick={() => openPanel('inventory')}
            title={`น้ำหนักสัมภาระ: ${weightSummary.usedWeight.toFixed(1)} / ${weightSummary.maxWeight.toFixed(1)}`}
            className="mt-0.5 flex items-center gap-0.5 rounded bg-[#0a101b]/80 px-1 py-px text-[9px] font-bold text-slate-200 hover:text-amber-200 tabular-nums"
          >
            <Weight className="size-2.5 text-slate-300" aria-hidden />
            <span>{Math.round(weightSummary.pct)} %</span>
          </button>
        )}
      </div>

      {/* Right: Name + HP Bar + MP Bar */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <div className="flex items-center justify-between gap-1">
          <div className="flex min-w-0 items-center gap-1 text-[11px] font-bold text-white [text-shadow:0_1px_3px_#000] sm:text-xs">
            <span className="grid size-4 shrink-0 place-items-center rounded-full border border-amber-300/70 bg-amber-500/20">
              <Star className="size-2.5 text-amber-300" aria-hidden />
            </span>
            {isGmDev && <span className="shrink-0 text-gold">[GM]</span>}
            {vipBonus.active && vipBonus.tierDef && (
              <button
                type="button"
                data-testid="vip-remote-trigger"
                aria-expanded={vipMenuOpen}
                aria-haspopup="menu"
                onClick={() => setVipMenuOpen((prev) => !prev)}
                title="คลิกเพื่อเปิดบริการ VIP ระยะไกล (ร้านค้า / ตีบวก / คลัง)"
                className="inline-flex shrink-0 cursor-pointer items-center gap-0.5 rounded px-1 py-0 text-[8px] font-extrabold leading-tight transition-transform hover:scale-105"
                style={{
                  color: vipBonus.tierDef.badgeColor,
                  backgroundColor: vipBonus.tierDef.badgeBg,
                  border: `1px solid ${vipBonus.tierDef.badgeBorder}`,
                }}
              >
                <Crown className="size-2.5" aria-hidden />
                {vipBonus.tierDef.badgeLabel}
              </button>
            )}
            <span className="min-w-0 truncate">{p.name}</span>
          </div>

          {!compact && (
            <button
              type="button"
              onClick={() => quitToTitle()}
              title="กลับหน้าเลือกตัวละคร"
              aria-label="สลับตัวละคร"
              className="grid size-5 shrink-0 place-items-center rounded border border-[#3a639a]/60 bg-[#0d1726]/85 text-slate-300 hover:border-amber-300 hover:text-white"
            >
              <LogOut className="size-2.5" aria-hidden />
            </button>
          )}
        </div>

        {/* Emerald HP Bar */}
        <div
          role="progressbar"
          aria-label="HP"
          aria-valuemin={0}
          aria-valuemax={s.maxHp}
          aria-valuenow={p.hp}
          className="relative h-3.5 w-full overflow-hidden rounded-full border border-[#0b1912] bg-[#0a130e]/90 shadow-inner sm:h-4"
        >
          <div
            className="h-full rounded-full bg-gradient-to-b from-[#7bf179] via-[#22c55e] to-[#15803d] transition-[width] duration-150"
            style={{ width: `${hpPct}%` }}
          />
          <span className="pointer-events-none absolute inset-x-1 top-0.5 h-[2px] rounded-full bg-white/30" />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[9.5px] font-extrabold text-white [text-shadow:0_1px_2px_#000] tabular-nums">
            {formatNum(p.hp)} / {formatNum(s.maxHp)}
          </span>
        </div>

        {/* Azure MP Bar */}
        <div
          role="progressbar"
          aria-label="MP"
          aria-valuemin={0}
          aria-valuemax={s.maxMp}
          aria-valuenow={p.mp}
          className="relative h-3.5 w-full overflow-hidden rounded-full border border-[#0a1629] bg-[#091220]/90 shadow-inner sm:h-4"
        >
          <div
            className="h-full rounded-full bg-gradient-to-b from-[#67e8f9] via-[#0ea5e9] to-[#0369a1] transition-[width] duration-150"
            style={{ width: `${mpPct}%` }}
          />
          <span className="pointer-events-none absolute inset-x-1 top-0.5 h-[2px] rounded-full bg-white/30" />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[9.5px] font-extrabold text-white [text-shadow:0_1px_2px_#000] tabular-nums">
            {formatNum(p.mp)} / {formatNum(s.maxMp)}
          </span>
        </div>
      </div>

      {/* VIP Remote Popover */}
      {vipMenuOpen && vipBonus.active && vipBonus.tierDef && (
        <div
          role="menu"
          data-testid="vip-remote-popover"
          className="asura-panel absolute left-0 top-full z-50 mt-1.5 w-[min(17rem,calc(100vw-1rem))] space-y-2 border-amber-400/60 p-2.5 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-amber-400/25 pb-1">
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-200">
              <Crown className="size-3 text-amber-300" aria-hidden />
              บริการ VIP ระยะไกล
            </span>
            <span className="text-[9px] text-muted-foreground">{formatVipRemaining(vipBonus.remainingMs)}</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => openRemote('shop')}
              className="flex flex-col items-center gap-1 rounded border border-amber-400/30 bg-amber-500/10 p-1.5 text-center text-[9.5px] font-semibold text-amber-100 transition-colors hover:border-amber-300 hover:bg-amber-500/20"
            >
              <Store className="size-4 text-amber-300" aria-hidden />
              <span>ร้านค้าระยะไกล</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openRemote('enhance')}
              className="flex flex-col items-center gap-1 rounded border border-cyan-400/30 bg-cyan-500/10 p-1.5 text-center text-[9.5px] font-semibold text-cyan-100 transition-colors hover:border-cyan-300 hover:bg-cyan-500/20"
            >
              <Hammer className="size-4 text-cyan-300" aria-hidden />
              <span>ตีบวกระยะไกล</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openRemote('storage')}
              className="flex flex-col items-center gap-1 rounded border border-emerald-400/30 bg-emerald-500/10 p-1.5 text-center text-[9.5px] font-semibold text-emerald-100 transition-colors hover:border-emerald-300 hover:bg-emerald-500/20"
            >
              <Warehouse className="size-4 text-emerald-300" aria-hidden />
              <span>คลังระยะไกล</span>
            </button>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => openRemote('gem-shop')}
            className="w-full rounded border border-border bg-secondary/70 py-1 text-center text-[10px] font-semibold text-muted-foreground hover:text-foreground"
          >
            ดูสิทธิ์ & จัดการ VIP ทั้งหมด
          </button>
        </div>
      )}
    </div>
  )
}
