'use client'

import { ChevronDown, ChevronUp, Terminal } from 'lucide-react'
import { castGmSkill, isCurrentAccountGm, openPanel } from '@/lib/game/engine'
import { updateUiPref, useUiLayout } from '@/lib/game/ui-layout'
import { useGame } from '@/lib/game/use-game'

export function GmToolsWidget() {
  const { p } = useGame()
  const layout = useUiLayout()
  if (!p) return null

  const isGmDev = Boolean(p.gm && isCurrentAccountGm())
  if (!isGmDev) return null

  const collapsed = layout.preferences.gmToolsCollapsed

  return (
    <div
      data-testid="gm-tools-widget"
      className="pointer-events-auto pixel-panel w-full border-gold/50 p-1.5 shadow-lg"
    >
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => updateUiPref('gmToolsCollapsed', !collapsed)}
          aria-expanded={!collapsed}
          className="flex flex-1 items-center gap-1 text-left text-[9px] font-bold tracking-wide text-gold"
        >
          <Terminal className="size-3 shrink-0" aria-hidden />
          <span>GM · DEV TOOLS</span>
        </button>
        <button
          type="button"
          onClick={() => updateUiPref('gmToolsCollapsed', !collapsed)}
          aria-label={collapsed ? 'ขยายเครื่องมือ GM' : 'ย่อเครื่องมือ GM'}
          className="rounded p-0.5 text-gold/80 hover:bg-secondary hover:text-gold"
        >
          {collapsed ? <ChevronDown className="size-3" aria-hidden /> : <ChevronUp className="size-3" aria-hidden />}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-1.5 space-y-1 border-t border-gold/25 pt-1.5">
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => castGmSkill('invisible')}
              className="pixel-btn bg-gold/20 px-1 py-1 text-[9px] font-semibold text-gold hover:bg-gold/30"
            >
              ล่องหน
            </button>
            <button
              type="button"
              onClick={() => castGmSkill('summon')}
              className="pixel-btn bg-gold/20 px-1 py-1 text-[9px] font-semibold text-gold hover:bg-gold/30"
            >
              เสกของ
            </button>
            <button
              type="button"
              onClick={() => castGmSkill('immortal')}
              className="pixel-btn bg-gold/20 px-1 py-1 text-[9px] font-semibold text-gold hover:bg-gold/30"
            >
              อมตะ
            </button>
            <button
              type="button"
              onClick={() => castGmSkill('judgment')}
              className="pixel-btn bg-cyan-500/20 px-1 py-1 text-[9px] font-semibold text-cyan-200 hover:bg-cyan-500/30"
            >
              พิพากษา
            </button>
            <button
              type="button"
              onClick={() => castGmSkill('nova')}
              className="pixel-btn bg-cyan-500/20 px-1 py-1 text-[9px] font-semibold text-cyan-200 hover:bg-cyan-500/30"
            >
              คลื่นราชันย์
            </button>
            <button
              type="button"
              onClick={() => castGmSkill('miracle')}
              className="pixel-btn bg-cyan-500/20 px-1 py-1 text-[9px] font-semibold text-cyan-200 hover:bg-cyan-500/30"
            >
              ฟื้นฟู GM
            </button>
          </div>
          <button
            type="button"
            onClick={() => openPanel('dev-tools')}
            className="pixel-btn flex w-full items-center justify-center gap-1 border border-amber-400/60 bg-amber-400/20 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-400/30"
          >
            <Terminal className="size-3" aria-hidden />
            เปิดระบบ Dev Console
          </button>
        </div>
      )}
    </div>
  )
}
