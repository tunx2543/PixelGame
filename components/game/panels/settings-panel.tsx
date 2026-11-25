'use client'

import { useState } from 'react'
import { Gauge, Keyboard, Layout, Music, PackageCheck, RefreshCw, RotateCcw, Sliders, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { BGM_TRACK_CATALOG, setBgmMuted, setBgmVolume } from '@/lib/game/bgm'
import { getEngineBgmContext, toggleZenHud } from '@/lib/game/engine'
import { playQuestClaimSfx, setSfxMuted, setSfxVolume } from '@/lib/game/sfx'
import {
  resetUiLayout,
  setDockMode,
  setGraphicsQualityPreset,
  updateUiPref,
  useUiLayout,
  type DockMode,
  type FpsLimit,
  type GraphicsQuality,
  type HotkeyPreset,
  type ResolutionScale,
} from '@/lib/game/ui-layout'
import { useGame } from '@/lib/game/use-game'
import {
  applyGameUpdateReload,
  checkForGameUpdates,
  openChangelogModal,
  useVersionUpdate,
} from '@/lib/game/use-version-update'
import { useBgmState, useSfxState } from '../bgm-quick-control'
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

export function SettingsPanel({ onClose }: { onClose?: () => void } = {}) {
  const { p, zenHud } = useGame()
  const layout = useUiLayout()
  const versionInfo = useVersionUpdate()
  const bgm = useBgmState()
  const sfx = useSfxState()
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const bgmVol = Math.round(bgm.volume * 100)
  const sfxVol = Math.round(sfx.volume * 100)
  const currentTrack = BGM_TRACK_CATALOG[bgm.desiredTheme]

  const handleToggleBgm = () => {
    setBgmMuted(!bgm.muted, p ? getEngineBgmContext() : { screen: 'login' })
  }

  const handleVolumeChange = (nextPct: number) => {
    setBgmVolume(nextPct / 100)
  }

  const handleToggleSfx = () => {
    const next = setSfxMuted(!sfx.muted)
    if (!next) playQuestClaimSfx(false)
  }

  const handleSfxVolumeChange = (nextPct: number) => {
    setSfxVolume(nextPct / 100)
  }

  const handleResetLayout = () => {
    resetUiLayout()
    setStatusMsg('รีเซ็ตตำแหน่งหน้าต่างและแถบ HUD เป็นค่าเริ่มต้นแล้ว')
  }

  return (
    <PanelFrame
      title="ตั้งค่าระบบ & การควบคุม"
      subtitle="เสียงเพลง เอฟเฟกต์ การจัดหน้าต่าง HUD และปุ่มลัดคีย์บอร์ด"
      onClose={onClose}
      hideGold={!p}
    >
      <div className="space-y-4 text-xs">
        {statusMsg && (
          <p className="border border-accent/50 bg-accent/10 px-3 py-2 text-accent" role="status">
            {statusMsg}
          </p>
        )}

        {/* Audio Section: Separated BGM and SFX */}
        <section className="space-y-3 rounded border border-border bg-secondary/35 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-primary">
              <Music className="size-4" aria-hidden />
              เสียงเพลงประกอบ & เอฟเฟกต์ (Audio)
            </h3>
            <span className="rounded border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">
              {currentTrack.labelTh} · {bgm.muted ? 'ปิดอยู่' : bgm.source === 'file' ? 'MP3/OGG Loop' : '8-bit Synth Loop'}
            </span>
          </div>

          <div className="space-y-2 rounded border border-border/60 bg-background/45 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">เพลงประกอบพื้นหลัง (BGM)</p>
                <p className="text-[11px] text-muted-foreground">
                  เปลี่ยนอัตโนมัติ 7 สถานการณ์ (Login · เมือง · ฟาร์ม · ดันเจี้ยน · สู้มอน · สู้บอส · กิจกรรม)
                </p>
              </div>
              <PxButton variant={bgm.muted ? 'secondary' : 'accent'} onClick={handleToggleBgm}>
                <span className="inline-flex items-center gap-1.5">
                  {bgm.muted ? <VolumeX className="size-3.5" aria-hidden /> : <Volume2 className="size-3.5" aria-hidden />}
                  {bgm.muted ? 'ปิดเสียง BGM' : 'เปิดเสียง BGM'}
                </span>
              </PxButton>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="bgm-volume-range" className="w-28 shrink-0 text-[11px] text-muted-foreground tabular-nums">
                ความดังเพลง ({bgmVol}%)
              </label>
              <input
                id="bgm-volume-range"
                type="range"
                min={0}
                max={100}
                value={bgmVol}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="flex-1 cursor-pointer accent-amber-400"
              />
            </div>
          </div>

          <div className="space-y-2 rounded border border-border/60 bg-background/45 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">เสียงเอฟเฟกต์ต่อสู้ & ปุ่มกด (SFX)</p>
                <p className="text-[11px] text-muted-foreground">แยกอิสระจากเสียงเพลง · ตีมอนสเตอร์ สกิล ตีบวก และรับรางวัล</p>
              </div>
              <PxButton variant={sfx.muted ? 'secondary' : 'accent'} onClick={handleToggleSfx}>
                <span className="inline-flex items-center gap-1.5">
                  {sfx.muted ? <VolumeX className="size-3.5" aria-hidden /> : <Volume2 className="size-3.5" aria-hidden />}
                  {sfx.muted ? 'ปิดเสียง SFX' : 'เปิดเสียง SFX'}
                </span>
              </PxButton>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="sfx-volume-range" className="w-28 shrink-0 text-[11px] text-muted-foreground tabular-nums">
                ความดัง SFX ({sfxVol}%)
              </label>
              <input
                id="sfx-volume-range"
                type="range"
                min={0}
                max={100}
                value={sfxVol}
                onChange={(e) => handleSfxVolumeChange(Number(e.target.value))}
                className="flex-1 cursor-pointer accent-sky-400"
              />
            </div>
          </div>
        </section>

        {/* Graphics & Performance Section */}
        <section className="space-y-3 rounded border border-border bg-secondary/35 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-primary">
              <Gauge className="size-4" aria-hidden />
              กราฟิก & ลดอาการหน่วง (Graphics & Performance)
            </h3>
            <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              {layout.preferences.graphicsQuality === 'high'
                ? 'คุณภาพสูง'
                : layout.preferences.graphicsQuality === 'medium'
                  ? 'กลาง · สมดุลลื่น'
                  : 'ประหยัด · ลดแลคสูงสุด'}
            </span>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-foreground">พรีเซ็ตคุณภาพกราฟิก</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ['high', 'สูง (High)', 'ภาพคมชัด 100% · เอฟเฟกต์และเงาครบ'],
                  ['medium', 'กลาง (Medium)', '85% · 60 FPS · ลดอนุภาคนิดหน่อย'],
                  ['low', 'ลื่นพิเศษ (Low)', '70% · 30 FPS · ปิดเงา/แสงฟุ้ง ลดหน่วง'],
                ] as Array<[GraphicsQuality, string, string]>
              ).map(([preset, label, desc]) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setGraphicsQualityPreset(preset)
                    setStatusMsg(`ปรับกราฟิกเป็นโหมด "${label}" แล้ว`)
                  }}
                  className={`pixel-btn p-2 text-left transition-colors ${
                    layout.preferences.graphicsQuality === preset
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background/70 text-foreground hover:bg-secondary'
                  }`}
                >
                  <p className="font-bold">{label}</p>
                  <p className={`mt-0.5 text-[10px] ${layout.preferences.graphicsQuality === preset ? 'opacity-90' : 'text-muted-foreground'}`}>
                    {desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-semibold text-foreground">จำกัดเฟรมเรต (FPS Cap)</p>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    [0, 'อัตโนมัติ'],
                    [60, '60 FPS'],
                    [30, '30 FPS'],
                  ] as Array<[FpsLimit, string]>
                ).map(([cap, label]) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => updateUiPref('fpsLimit', cap)}
                    className={`pixel-btn px-2 py-1.5 text-center text-[11px] font-bold ${
                      layout.preferences.fpsLimit === cap
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-background/70 text-foreground hover:bg-secondary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 font-semibold text-foreground">ความละเอียดเรนเดอร์ (Resolution)</p>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    [1, '100%'],
                    [0.85, '85%'],
                    [0.7, '70% (ลื่น)'],
                  ] as Array<[ResolutionScale, string]>
                ).map(([scale, label]) => (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => updateUiPref('resolutionScale', scale)}
                    className={`pixel-btn px-2 py-1.5 text-center text-[11px] font-bold ${
                      layout.preferences.resolutionScale === scale
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-background/70 text-foreground hover:bg-secondary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => updateUiPref('reduceParticles', !layout.preferences.reduceParticles)}
              className="flex items-center justify-between rounded border border-border bg-background/60 px-2.5 py-2 text-left hover:border-primary/60"
            >
              <span>ลดอนุภาค & อากาศ</span>
              <span className={`font-bold ${layout.preferences.reduceParticles ? 'text-emerald-300' : 'text-muted-foreground'}`}>
                {layout.preferences.reduceParticles ? 'เปิด' : 'ปิด'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => updateUiPref('disableShadowsAndGlow', !layout.preferences.disableShadowsAndGlow)}
              className="flex items-center justify-between rounded border border-border bg-background/60 px-2.5 py-2 text-left hover:border-primary/60"
            >
              <span>ปิดเงา & แสงฟุ้ง</span>
              <span className={`font-bold ${layout.preferences.disableShadowsAndGlow ? 'text-emerald-300' : 'text-muted-foreground'}`}>
                {layout.preferences.disableShadowsAndGlow ? 'เปิด' : 'ปิด'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => updateUiPref('crispPixelScale', !layout.preferences.crispPixelScale)}
              className="flex items-center justify-between rounded border border-border bg-background/60 px-2.5 py-2 text-left hover:border-primary/60"
            >
              <span>พิกเซลคมชัด</span>
              <span className={`font-bold ${layout.preferences.crispPixelScale ? 'text-emerald-300' : 'text-muted-foreground'}`}>
                {layout.preferences.crispPixelScale ? 'เปิด' : 'ปิด'}
              </span>
            </button>
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
              onClick={() => updateUiPref('autoHideCombatHud', !layout.preferences.autoHideCombatHud)}
              className="flex items-center justify-between rounded border border-border bg-background/60 px-2.5 py-2 text-left hover:border-primary/60"
            >
              <span>ซ่อนเควสต์/GM อัตโนมัติตอนต่อสู้บนมือถือ</span>
              <span className={`font-bold ${layout.preferences.autoHideCombatHud ? 'text-emerald-300' : 'text-muted-foreground'}`}>
                {layout.preferences.autoHideCombatHud ? 'เปิด (จอโล่ง)' : 'ปิด (แสดงตลอด)'}
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

        {/* Version & Update Status */}
        <section className="space-y-2.5 rounded border border-border bg-secondary/35 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-primary">
              <PackageCheck className="size-4" aria-hidden />
              เวอร์ชั่นเกม & การอัปเดต
            </h3>
            <span className="rounded border border-amber-400/50 bg-amber-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
              v{versionInfo.currentVersion}
            </span>
          </div>

          <div className="rounded border border-border/70 bg-background/50 p-2.5">
            <p className="font-semibold text-foreground">{versionInfo.releaseTitle}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              บิลด์วันที่ {versionInfo.buildDate}
              {versionInfo.lastCheckedAt
                ? ` • ตรวจล่าสุด ${new Date(versionInfo.lastCheckedAt).toLocaleTimeString('th-TH')}`
                : ''}
            </p>
            {versionInfo.checkStatusText && (
              <p
                className={`mt-1.5 text-[11px] font-semibold ${
                  versionInfo.updateAvailable
                    ? 'text-emerald-300'
                    : versionInfo.checkError
                      ? 'text-destructive'
                      : 'text-amber-200'
                }`}
              >
                {versionInfo.checkStatusText}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PxButton
              variant="secondary"
              disabled={versionInfo.checking}
              onClick={() => void checkForGameUpdates(true)}
            >
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className={`size-3.5 ${versionInfo.checking ? 'animate-spin' : ''}`} aria-hidden />
                {versionInfo.checking ? 'กำลังตรวจสอบ...' : 'ตรวจสอบอัปเดตล่าสุด'}
              </span>
            </PxButton>
            <PxButton variant="secondary" onClick={() => openChangelogModal()}>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-300" aria-hidden />
                ดูบันทึกอัปเดต (Changelog)
                {versionInfo.unseenUpdate && (
                  <span className="rounded bg-amber-500/25 px-1 text-[9px] font-bold text-amber-300">ใหม่</span>
                )}
              </span>
            </PxButton>
            {versionInfo.updateAvailable && (
              <PxButton variant="accent" onClick={() => void applyGameUpdateReload()}>
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw className="size-3.5" aria-hidden />
                  อัปเดตเป็น v{versionInfo.remoteVersion ?? versionInfo.currentVersion}
                </span>
              </PxButton>
            )}
          </div>
        </section>
      </div>
    </PanelFrame>
  )
}
