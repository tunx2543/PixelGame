'use client'

import { useState } from 'react'
import { Keyboard, Layout, RotateCcw, Sliders, Volume2, VolumeX } from 'lucide-react'
import { getBgmVolume, isBgmMuted, setBgmVolume, toggleBgmMute } from '@/lib/game/bgm'
import { toggleZenHud } from '@/lib/game/engine'
import { isSfxMuted, playQuestClaimSfx, setSfxMuted } from '@/lib/game/sfx'
import {
  resetUiLayout,
  setDockMode,
  updateUiPref,
  useUiLayout,
  type DockMode,
  type HotkeyPreset,
} from '@/lib/game/ui-layout'
import { useGame } from '@/lib/game/use-game'
import { PanelFrame, PxButton } from './panels'

const HOTKEY_GUIDE: Array<{ key: string; action: string }> = [
  { key: 'WASD / ลูกศร', action: 'เคลื่อนที่ตัวละคร' },
  { key: '1 - 0', action: 'ใช้ไอเทมใน Quick Item Bar ช่องที่ 1 - 10' },
  { key: 'F1 - F4', action: 'ใช้สกิลอาชีพ (สลับกับ 1-3 ได้ด้านล่าง)' },
  { key: 'Space / J', action: 'โจมตีพื้นฐาน / คุยกับ NPC' },
  { key: 'E', action: 'เก็บเกี่ยวทรัพยากร / โต้ตอบ' },
  { key: 'X / Shift', action: 'พุ่งหลบอมตะ (Dash) / ตั้งการ์ด (Guard)' },
  { key: 'U / M', action: 'ใช้สกิล Ultimate / ขี่-ลงจากสัตว์ขี่' },
  { key: 'Q / R', action: 'ดื่มยา HP / MP ด่วน (ปรับเปิด-ปิดได้)' },
  { key: 'I / C / K', action: 'เปิดหน้าต่าง กระเป๋า / ตัวละคร / ภารกิจ' },
  { key: 'H / Esc', action: 'ซ่อน HUD รอบจอ / ปิดหน้าต่างบนสุด' },
]

export function SettingsPanel() {
  const { p, zenHud } = useGame()
  const layout = useUiLayout()
  const [bgmMuted, setBgmMutedState] = useState(() => isBgmMuted())
  const [bgmVol, setBgmVolState] = useState(() => Math.round(getBgmVolume() * 100))
  const [sfxMuted, setSfxMutedState] = useState(() => isSfxMuted())
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  if (!p) return null

  const handleToggleBgm = () => {
    const next = toggleBgmMute(p.mapId)
    setBgmMutedState(next)
  }

  const handleVolumeChange = (nextPct: number) => {
    setBgmVolState(nextPct)
    setBgmVolume(nextPct / 100)
  }

  const handleToggleSfx = () => {
    const next = setSfxMuted(!sfxMuted)
    setSfxMutedState(next)
    if (!next) playQuestClaimSfx(false)
  }

  const handleResetLayout = () => {
    resetUiLayout()
    setStatusMsg('รีเซ็ตตำแหน่งหน้าต่างและแถบ HUD เป็นค่าเริ่มต้นแล้ว')
  }

  return (
    <PanelFrame
      title="ตั้งค่าระบบ & การควบคุม"
      subtitle="เสียงเพลง เอฟเฟกต์ การจัดหน้าต่าง HUD และปุ่มลัดคีย์บอร์ด"
    >
      <div className="space-y-4 text-xs">
        {statusMsg && (
          <p className="border border-accent/50 bg-accent/10 px-3 py-2 text-accent" role="status">
            {statusMsg}
          </p>
        )}

        {/* Audio Section */}
        <section className="space-y-2.5 rounded border border-border bg-secondary/35 p-3">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-primary">
            <Volume2 className="size-4" aria-hidden />
            เสียงเพลง & เอฟเฟกต์ (Audio)
          </h3>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">เพลงประกอบพื้นหลัง (BGM)</p>
              <p className="text-[11px] text-muted-foreground">ปรับเปลี่ยนอัตโนมัติตามแผนที่และบอส</p>
            </div>
            <PxButton variant={bgmMuted ? 'secondary' : 'accent'} onClick={handleToggleBgm}>
              <span className="inline-flex items-center gap-1.5">
                {bgmMuted ? <VolumeX className="size-3.5" aria-hidden /> : <Volume2 className="size-3.5" aria-hidden />}
                {bgmMuted ? 'ปิดเสียง BGM' : 'เปิดเสียง BGM'}
              </span>
            </PxButton>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="bgm-volume-range" className="w-24 shrink-0 text-[11px] text-muted-foreground">
              ความดังเพลง ({bgmVol}%)
            </label>
            <input
              id="bgm-volume-range"
              type="range"
              min={0}
              max={100}
              value={bgmVol}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="flex-1 accent-amber-400"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
            <div>
              <p className="font-semibold text-foreground">เสียงเอฟเฟกต์ต่อสู้ & ปุ่มกด (SFX)</p>
              <p className="text-[11px] text-muted-foreground">เสียงตีมอนสเตอร์ สกิล ตีบวก และรับรางวัล</p>
            </div>
            <PxButton variant={sfxMuted ? 'secondary' : 'accent'} onClick={handleToggleSfx}>
              {sfxMuted ? 'ปิดเสียง SFX' : 'เปิดเสียง SFX'}
            </PxButton>
          </div>
        </section>

        {/* Window & HUD Management */}
        <section className="space-y-3 rounded border border-border bg-secondary/35 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-primary">
              <Layout className="size-4" aria-hidden />
              หน้าต่าง & การจัดวาง HUD
            </h3>
            <PxButton variant="danger" onClick={handleResetLayout}>
              <span className="inline-flex items-center gap-1">
                <RotateCcw className="size-3" aria-hidden />
                Reset UI Layout
              </span>
            </PxButton>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-foreground">โหมดเปิดหลายหน้าต่างพร้อมกัน</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ['auto', 'อัตโนมัติ (แนะนำ)', 'ลอยได้ 2 จอ, 3+ จอรวมเป็นแท็บ'],
                  ['floating', 'ลอยอิสระ (Floating)', 'ลากย้ายวางคู่กันได้หลายหน้าต่าง'],
                  ['tabbed', 'รวมแท็บ (Tabbed)', 'รวมทุกหน้าต่างไว้ในกรอบเดียว'],
                ] as Array<[DockMode, string, string]>
              ).map(([mode, label, desc]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDockMode(mode)}
                  className={`pixel-btn p-2 text-left transition-colors ${
                    layout.preferences.dockMode === mode
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background/70 text-foreground hover:bg-secondary'
                  }`}
                >
                  <p className="font-bold">{label}</p>
                  <p className={`mt-0.5 text-[10px] ${layout.preferences.dockMode === mode ? 'opacity-90' : 'text-muted-foreground'}`}>
                    {desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => updateUiPref('questTrackerHidden', !layout.preferences.questTrackerHidden)}
              className="flex items-center justify-between rounded border border-border bg-background/60 px-2.5 py-2 text-left hover:border-primary/60"
            >
              <span>แถบภารกิจด้านซ้าย (Quest Tracker)</span>
              <span className={`font-bold ${layout.preferences.questTrackerHidden ? 'text-muted-foreground' : 'text-emerald-300'}`}>
                {layout.preferences.questTrackerHidden ? 'ซ่อนอยู่' : 'แสดงผล'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => toggleZenHud(!zenHud)}
              className="flex items-center justify-between rounded border border-border bg-background/60 px-2.5 py-2 text-left hover:border-primary/60"
            >
              <span>โหมดซ่อน UI รอบจอ (Zen HUD [H])</span>
              <span className={`font-bold ${zenHud ? 'text-amber-300' : 'text-muted-foreground'}`}>
                {zenHud ? 'กำลังซ่อน' : 'ปกติ'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => updateUiPref('compactHud', !layout.preferences.compactHud)}
              className="flex items-center justify-between rounded border border-border bg-background/60 px-2.5 py-2 text-left hover:border-primary/60"
            >
              <span>ย่อขนาด HUD มุมซ้าย</span>
              <span className={`font-bold ${layout.preferences.compactHud ? 'text-emerald-300' : 'text-muted-foreground'}`}>
                {layout.preferences.compactHud ? 'กะทัดรัด' : 'มาตรฐาน'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('pixelquest:toggle-touch'))}
              className="flex items-center justify-between rounded border border-border bg-background/60 px-2.5 py-2 text-left hover:border-primary/60"
            >
              <span>ปุ่มควบคุมแบบสัมผัสมือถือ</span>
              <span className="font-bold text-primary">สลับแสดงผล</span>
            </button>
          </div>
        </section>

        {/* Controls & Hotkey Preset */}
        <section className="space-y-2.5 rounded border border-border bg-secondary/35 p-3">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-primary">
            <Sliders className="size-4" aria-hidden />
            ตั้งค่าปุ่มลัดคีย์บอร์ด
          </h3>

          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['f-keys', 'มาตรฐานใหม่: 1-0 ใช้ไอเทม · F1-F4 สกิล'],
                ['legacy-1-3', 'คลาสสิก: Shift+1-0 ไอเทม · 1-3 สกิล'],
              ] as Array<[HotkeyPreset, string]>
            ).map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => updateUiPref('hotkeyPreset', preset)}
                className={`pixel-btn px-2.5 py-2 text-left text-[11px] font-semibold ${
                  layout.preferences.hotkeyPreset === preset
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background/70 text-foreground hover:bg-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => updateUiPref('legacyQuickPotions', !layout.preferences.legacyQuickPotions)}
            className="flex w-full items-center justify-between rounded border border-border bg-background/60 px-2.5 py-2 text-left hover:border-primary/60"
          >
            <span>เปิดใช้ปุ่มลัดด่วน Q (ดื่มยา HP) / R (ดื่มยา MP)</span>
            <span className={`font-bold ${layout.preferences.legacyQuickPotions ? 'text-emerald-300' : 'text-muted-foreground'}`}>
              {layout.preferences.legacyQuickPotions ? 'เปิดใช้งาน' : 'ปิด'}
            </span>
          </button>

          <div className="rounded border border-border/70 bg-background/50 p-2.5">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-foreground">
              <Keyboard className="size-3.5 text-accent" aria-hidden />
              สรุปปุ่มลัดทั้งหมด
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {HOTKEY_GUIDE.map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-2 text-[11px]">
                  <kbd className="shrink-0 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-200">
                    {row.key}
                  </kbd>
                  <span className="truncate text-right text-muted-foreground">{row.action}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </PanelFrame>
  )
}
