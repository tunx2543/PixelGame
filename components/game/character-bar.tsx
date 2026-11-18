'use client'

import { useEffect, useRef, useState } from 'react'
import { Crown, Hammer, LogOut, Store, Warehouse } from 'lucide-react'
import { useGame } from '@/lib/game/use-game'
import {
  currentJob,
  getActiveAccountGameUid,
  isCurrentAccountGm,
  openPanel,
  quitToTitle,
  type PanelId,
} from '@/lib/game/engine'
import { PERMANENT_GM_GAME_UID } from '@/lib/game/permissions'
import { formatVipRemaining, getEffectiveVipBonuses } from '@/lib/game/premium/vip'
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
  const isGmDev = Boolean(p.gm && isCurrentAccountGm())
  const displayGameUid = isGmDev ? PERMANENT_GM_GAME_UID : (p.gameUid ?? getActiveAccountGameUid())
  const vipBonus = getEffectiveVipBonuses(p.premium?.vip)

  const openRemote = (panel: PanelId) => {
    openPanel(panel)
    setVipMenuOpen(false)
  }

  return (
    <div
      ref={containerRef}
      data-testid="character-bar"
      className="pointer-events-auto pixel-panel relative flex w-full items-center justify-between gap-1.5 px-2 py-1 shadow-lg"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <div className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border-2 border-[#e8b84e] bg-gradient-to-b from-[#3d2922] to-[#1d1414] shadow-inner">
          <SpriteModelCanvas
            mode="job"
            id={p.jobId}
            action="idle"
            dir="down"
            size={30}
            variant="portrait"
            isGm={isGmDev}
            showShadow={false}
            showAura={false}
            label={`ภาพโปรไฟล์ ${p.name}`}
          />
        </div>

        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-1 truncate text-[11px] font-bold text-foreground">
            {isGmDev && <span className="text-gold">[GM]</span>}
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
            <span className="truncate">{p.name}</span>
          </div>
          <div className="flex items-center gap-1 truncate text-[9px] text-muted-foreground">
            <span className="font-semibold text-primary tabular-nums">Lv.{p.level}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{job.name}</span>
            {!compact && displayGameUid && (
              <span className="font-mono text-[9px] tabular-nums">#{displayGameUid}</span>
            )}
          </div>
        </div>
      </div>

      {!compact && (
        <button
          type="button"
          onClick={() => quitToTitle()}
          title="กลับหน้าเลือกตัวละคร"
          aria-label="สลับตัวละคร"
          className="pixel-btn flex shrink-0 items-center gap-1 whitespace-nowrap bg-secondary px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-2.5" aria-hidden />
          <span className="hidden sm:inline">สลับตัว</span>
        </button>
      )}

      {vipMenuOpen && vipBonus.active && vipBonus.tierDef && (
        <div
          role="menu"
          data-testid="vip-remote-popover"
          className="pixel-panel absolute left-0 top-full z-50 mt-1.5 w-[min(17rem,calc(100vw-1rem))] space-y-2 border-amber-400/60 bg-[#121628]/96 p-2.5 shadow-2xl"
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
