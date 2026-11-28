'use client'

import { useSyncExternalStore } from 'react'
import { game, notify, registerWindowBridge, type PanelId } from './engine'

export type DockMode = 'auto' | 'floating' | 'tabbed'
export type HotkeyPreset = 'f-keys' | 'legacy-1-3'
export type GraphicsQuality = 'high' | 'medium' | 'low'
export type FpsLimit = 0 | 30 | 60
export type ResolutionScale = 1 | 0.85 | 0.7
export type RenderEngine = 'fast' | 'hd'

export interface WindowLayoutRect {
  x: number
  y: number
  width: number
  height: number
}

export interface OpenWindowEntry {
  id: PanelId
  zIndex: number
  minimized: boolean
  maximized: boolean
}

export interface UiPreferences {
  questTrackerCollapsed: boolean
  questTrackerHidden: boolean
  leaderboardCollapsed: boolean
  leaderboardHidden: boolean
  townServicesOpen: boolean
  gmToolsCollapsed: boolean
  legacyQuickPotions: boolean
  dockMode: DockMode
  hotkeyPreset: HotkeyPreset
  compactHud: boolean
  autoHideCombatHud: boolean
  graphicsQuality: GraphicsQuality
  renderEngine: RenderEngine
  fpsLimit: FpsLimit
  resolutionScale: ResolutionScale
  reduceParticles: boolean
  disableShadowsAndGlow: boolean
  crispPixelScale: boolean
}

export interface UiLayoutSnapshot {
  windows: OpenWindowEntry[]
  activeDockTab: PanelId | null
  layouts: Record<string, WindowLayoutRect>
  preferences: UiPreferences
  viewport: { width: number; height: number }
}

const STORAGE_KEY = 'pixel-rpg-ui-layout-v2'

export const GRAPHICS_QUALITY_PRESETS: Record<
  GraphicsQuality,
  Pick<
    UiPreferences,
    | 'graphicsQuality'
    | 'fpsLimit'
    | 'resolutionScale'
    | 'reduceParticles'
    | 'disableShadowsAndGlow'
    | 'crispPixelScale'
  >
> = {
  high: {
    graphicsQuality: 'high',
    fpsLimit: 0,
    resolutionScale: 1,
    reduceParticles: false,
    disableShadowsAndGlow: false,
    crispPixelScale: false,
  },
  medium: {
    graphicsQuality: 'medium',
    fpsLimit: 60,
    resolutionScale: 0.85,
    reduceParticles: true,
    disableShadowsAndGlow: false,
    crispPixelScale: false,
  },
  low: {
    graphicsQuality: 'low',
    fpsLimit: 30,
    resolutionScale: 0.7,
    reduceParticles: true,
    disableShadowsAndGlow: true,
    crispPixelScale: true,
  },
}

const DEFAULT_PREFERENCES: UiPreferences = {
  questTrackerCollapsed: false,
  questTrackerHidden: false,
  leaderboardCollapsed: false,
  leaderboardHidden: false,
  townServicesOpen: false,
  gmToolsCollapsed: true,
  legacyQuickPotions: true,
  dockMode: 'auto',
  hotkeyPreset: 'f-keys',
  compactHud: false,
  autoHideCombatHud: true,
  renderEngine: 'fast',
  ...GRAPHICS_QUALITY_PRESETS.high,
}

export const WINDOW_META: Record<PanelId, { title: string; defaultW: number; defaultH: number }> = {
  inventory: { title: 'สัมภาระ & ตัวละคร', defaultW: 840, defaultH: 540 },
  equipment: { title: 'อุปกรณ์สวมใส่ & สเตตัส', defaultW: 840, defaultH: 540 },
  character: { title: 'ตัวละคร & ค่าสถานะ', defaultW: 840, defaultH: 540 },
  shop: { title: 'ร้านค้าทั่วไป', defaultW: 660, defaultH: 510 },
  'gem-shop': { title: 'ร้านค้าโซล & เติมเงิน', defaultW: 840, defaultH: 560 },
  quests: { title: 'ภารกิจ & เควสต์', defaultW: 660, defaultH: 520 },
  friends: { title: 'เพื่อน & UID', defaultW: 480, defaultH: 510 },
  party: { title: 'ระบบปาร์ตี้', defaultW: 480, defaultH: 520 },
  settings: { title: 'ตั้งค่าระบบ & ปุ่มลัด', defaultW: 560, defaultH: 510 },
  enhance: { title: 'อัพเกรด & ตีบวก', defaultW: 640, defaultH: 510 },
  job: { title: 'สายอาชีพ & เลื่อนขั้น', defaultW: 840, defaultH: 540 },
  storage: { title: 'คลังเก็บของ', defaultW: 660, defaultH: 510 },
  gacha: { title: 'สุ่มกาชา', defaultW: 660, defaultH: 520 },
  rebirth: { title: 'จุติ (Rebirth)', defaultW: 700, defaultH: 560 },
  trade: { title: 'แลกเปลี่ยนผู้เล่น', defaultW: 640, defaultH: 510 },
  'gm-summon': { title: 'เสกไอเทม GM', defaultW: 660, defaultH: 510 },
  'dev-tools': { title: 'Dev Console', defaultW: 700, defaultH: 540 },
  pets: { title: 'สัตว์เลี้ยง & คู่หู', defaultW: 680, defaultH: 520 },
  models: { title: 'คลังโมเดล 2D', defaultW: 760, defaultH: 550 },
  craft: { title: 'คราฟต์ & ย่อยสลาย', defaultW: 680, defaultH: 520 },
  codex: { title: 'สมุดภาพ & ฉายา', defaultW: 680, defaultH: 520 },
  guild: { title: 'กิลด์ & บอสโลก', defaultW: 680, defaultH: 520 },
  arena: { title: 'ลานประลอง & อันดับ', defaultW: 660, defaultH: 520 },
  dungeon: { title: 'ดันเจี้ยนรายวัน', defaultW: 660, defaultH: 510 },
  market: { title: 'ตลาดประมูล', defaultW: 700, defaultH: 520 },
  mail: { title: 'จดหมาย & ของขวัญ', defaultW: 640, defaultH: 510 },
  pass: { title: 'Battle Pass', defaultW: 680, defaultH: 520 },
  lifeskills: { title: 'ทักษะชีวิต & ฝึกฝน', defaultW: 660, defaultH: 520 },
  talents: { title: 'ทักษะ & ฝึกฝน', defaultW: 840, defaultH: 540 },
  wardrobe: { title: 'แฟชั่น & ปีก', defaultW: 660, defaultH: 520 },
  guide: { title: 'คู่มือ & แจ้งข้อมูล', defaultW: 640, defaultH: 510 },
  'treasure-chest': { title: 'หีบสมบัติ & สุ่มไอเทม', defaultW: 820, defaultH: 560 },
  redeem: { title: 'แลกไอเทมโค้ด (Redeem Code)', defaultW: 540, defaultH: 480 },
  events: { title: 'เทศกาล & กิจกรรมเซิร์ฟเวอร์', defaultW: 780, defaultH: 560 },
  activities: { title: 'กิจกรรมพิเศษ (วาร์ปเข้า-ออก)', defaultW: 820, defaultH: 560 },
  'wing-gacha': { title: 'ตู้ไข่สุ่มปีกแห่งน้ำพุเมือง', defaultW: 740, defaultH: 560 },
}

export function getSafeZoneBounds(vw: number, vh: number) {
  if (vw < 768) {
    return { left: 8, top: 44, right: 8, bottom: 72 }
  }
  if (vw < 1024) {
    return { left: 16, top: 52, right: 120, bottom: 56 }
  }
  return { left: 24, top: 56, right: 136, bottom: 62 }
}

const listeners = new Set<() => void>()
let nextZ = 40
let initialized = false

let state: UiLayoutSnapshot = {
  windows: [],
  activeDockTab: null,
  layouts: {},
  preferences: { ...DEFAULT_PREFERENCES },
  viewport: { width: 1280, height: 800 },
}

const SERVER_SNAPSHOT: UiLayoutSnapshot = {
  windows: [],
  activeDockTab: null,
  layouts: {},
  preferences: { ...DEFAULT_PREFERENCES },
  viewport: { width: 1280, height: 800 },
}

function clampRect(rect: WindowLayoutRect, vw: number, vh: number): WindowLayoutRect {
  const safe = getSafeZoneBounds(vw, vh)
  const availW = Math.max(280, vw - safe.left - safe.right)
  const availH = Math.max(240, vh - safe.top - safe.bottom)
  const width = Math.max(300, Math.min(rect.width, availW))
  const height = Math.max(240, Math.min(rect.height, availH))
  const maxX = Math.max(safe.left, vw - safe.right - width)
  const maxY = Math.max(safe.top, vh - safe.bottom - height)
  const x = Math.max(safe.left, Math.min(maxX, rect.x))
  const y = Math.max(safe.top, Math.min(maxY, rect.y))
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }
}

function rectsOverlap(a: WindowLayoutRect, b: WindowLayoutRect): boolean {
  const pad = 12
  return !(
    a.x + a.width + pad <= b.x ||
    b.x + b.width + pad <= a.x ||
    a.y + a.height + pad <= b.y ||
    b.y + b.height + pad <= a.y
  )
}

function computeInitialRect(id: PanelId): WindowLayoutRect {
  const { width: vw, height: vh } = state.viewport
  const safe = getSafeZoneBounds(vw, vh)
  const availW = Math.max(320, vw - safe.left - safe.right)
  const availH = Math.max(280, vh - safe.top - safe.bottom)
  const meta = WINDOW_META[id] ?? { title: id, defaultW: 620, defaultH: 500 }

  const width = Math.min(meta.defaultW, availW)
  const height = Math.min(meta.defaultH, availH)

  const openRects = state.windows
    .filter((w) => !w.minimized && w.id !== id)
    .map((w) => state.layouts[w.id])
    .filter((r): r is WindowLayoutRect => Boolean(r))

  // Candidate slots: right-side companion if 1 window is open on left, or centered, or stepped cascade
  const candidates: WindowLayoutRect[] = []
  if (openRects.length === 1 && availW >= 820) {
    // Try placing cleanly side-by-side when space allows (e.g. Equipment + Inventory)
    const other = openRects[0]
    const wFit = Math.min(width, Math.floor((availW - 16) / 2))
    candidates.push(clampRect({ x: safe.left + availW - wFit, y: safe.top, width: wFit, height }, vw, vh))
    candidates.push(clampRect({ x: other.x + other.width + 16, y: safe.top, width: wFit, height }, vw, vh))
    candidates.push(clampRect({ x: safe.left, y: safe.top, width: wFit, height }, vw, vh))
  }

  const centerX = safe.left + Math.round((availW - width) / 2)
  const centerY = safe.top + Math.round((availH - height) / 2)
  candidates.push(clampRect({ x: centerX, y: centerY, width, height }, vw, vh))

  for (let step = 1; step <= 4; step++) {
    candidates.push(clampRect({ x: centerX + step * 34, y: centerY + step * 26, width, height }, vw, vh))
    candidates.push(clampRect({ x: centerX - step * 34, y: centerY + step * 20, width, height }, vw, vh))
  }

  for (const cand of candidates) {
    if (!openRects.some((r) => rectsOverlap(cand, r))) {
      return cand
    }
  }

  const offset = (openRects.length % 4) * 28
  return clampRect({ x: safe.left + 16 + offset, y: safe.top + 16 + offset, width, height }, vw, vh)
}

function persist() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        layouts: state.layouts,
        preferences: state.preferences,
      }),
    )
  } catch {
    // Ignore quota errors cleanly.
  }
}

function syncEnginePanelState() {
  const visible = state.windows
    .filter((w) => !w.minimized)
    .sort((a, b) => b.zIndex - a.zIndex)

  const top = visible[0]?.id ?? null
  const isMobile = state.viewport.width < 768
  const shouldBlock = top === 'trade' || (isMobile && visible.length > 0)

  if (game.panel !== top || game.blockingUi !== shouldBlock) {
    game.panel = top
    game.blockingUi = shouldBlock
    notify()
  }
}

function emit() {
  state = {
    ...state,
    windows: [...state.windows],
    layouts: { ...state.layouts },
    preferences: { ...state.preferences },
  }
  syncEnginePanelState()
  for (const fn of listeners) fn()
}

export function initUiLayoutBridge() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as {
        layouts?: Record<string, WindowLayoutRect>
        preferences?: Partial<UiPreferences>
      }
      if (parsed.preferences && typeof parsed.preferences === 'object') {
        const merged = { ...DEFAULT_PREFERENCES, ...parsed.preferences }
        if (parsed.preferences.renderEngine !== 'fast' && parsed.preferences.renderEngine !== 'hd') {
          merged.renderEngine = 'fast'
        }
        state.preferences = merged
      }
      if (parsed.layouts && typeof parsed.layouts === 'object') {
        const clean: Record<string, WindowLayoutRect> = {}
        for (const [k, v] of Object.entries(parsed.layouts)) {
          if (
            v &&
            typeof v.x === 'number' &&
            typeof v.y === 'number' &&
            typeof v.width === 'number' &&
            typeof v.height === 'number'
          ) {
            clean[k] = v
          }
        }
        state.layouts = clean
      }
    }
  } catch {
    // Ignore malformed saved layout cleanly.
  }

  const updateViewport = () => {
    const width = window.innerWidth || 1280
    const height = window.innerHeight || 800
    if (state.viewport.width === width && state.viewport.height === height) return
    const nextLayouts: Record<string, WindowLayoutRect> = {}
    for (const [k, rect] of Object.entries(state.layouts)) {
      nextLayouts[k] = clampRect(rect, width, height)
    }
    state = {
      ...state,
      viewport: { width, height },
      layouts: nextLayouts,
    }
    emit()
  }

  state.viewport = {
    width: window.innerWidth || 1280,
    height: window.innerHeight || 800,
  }
  window.addEventListener('resize', updateViewport)

  registerWindowBridge({
    open: (id) => openWindow(id),
    close: (id) => closeWindow(id),
    closeAll: () => closeAllWindows(),
  })
}

export function isEffectiveTabbedMode(snapshot: UiLayoutSnapshot = state): boolean {
  const visibleCount = snapshot.windows.filter((w) => !w.minimized).length
  if (snapshot.viewport.width < 768) return visibleCount > 0
  if (snapshot.preferences.dockMode === 'tabbed') return visibleCount > 0
  if (snapshot.preferences.dockMode === 'floating') return false
  // Auto mode: dock into clean tabbed container when >= 3 windows open or viewport < 1024px
  if (snapshot.viewport.width < 1024 && visibleCount >= 2) return true
  return visibleCount >= 3
}

export function openWindow(id: PanelId) {
  initUiLayoutBridge()
  const existing = state.windows.find((w) => w.id === id)
  nextZ += 1
  if (existing) {
    state.windows = state.windows.map((w) =>
      w.id === id ? { ...w, minimized: false, zIndex: nextZ } : w,
    )
  } else {
    const existingRect = state.layouts[id]
    if (!existingRect) {
      state.layouts[id] = computeInitialRect(id)
    } else {
      state.layouts[id] = clampRect(existingRect, state.viewport.width, state.viewport.height)
    }
    state.windows = [
      ...state.windows,
      { id, zIndex: nextZ, minimized: false, maximized: false },
    ]
  }
  state.activeDockTab = id
  persist()
  emit()
}

export function closeWindow(id?: PanelId) {
  const target =
    id ??
    state.windows
      .filter((w) => !w.minimized)
      .sort((a, b) => b.zIndex - a.zIndex)[0]?.id ??
    state.activeDockTab

  if (!target) return
  state.windows = state.windows.filter((w) => w.id !== target)
  if (state.activeDockTab === target) {
    const nextTop = state.windows
      .filter((w) => !w.minimized)
      .sort((a, b) => b.zIndex - a.zIndex)[0]
    state.activeDockTab = nextTop?.id ?? state.windows[0]?.id ?? null
  }
  emit()
}

export function closeAllWindows() {
  if (state.windows.length === 0) return
  state.windows = []
  state.activeDockTab = null
  emit()
}

export function focusWindow(id: PanelId) {
  const target = state.windows.find((w) => w.id === id)
  if (!target) return
  nextZ += 1
  state.windows = state.windows.map((w) =>
    w.id === id ? { ...w, minimized: false, zIndex: nextZ } : w,
  )
  state.activeDockTab = id
  emit()
}

export function toggleMinimizeWindow(id: PanelId) {
  const target = state.windows.find((w) => w.id === id)
  if (!target) return
  const nextMin = !target.minimized
  nextZ += 1
  state.windows = state.windows.map((w) =>
    w.id === id ? { ...w, minimized: nextMin, zIndex: nextMin ? w.zIndex : nextZ } : w,
  )
  if (!nextMin) {
    state.activeDockTab = id
  } else if (state.activeDockTab === id) {
    const nextTop = state.windows
      .filter((w) => !w.minimized && w.id !== id)
      .sort((a, b) => b.zIndex - a.zIndex)[0]
    state.activeDockTab = nextTop?.id ?? null
  }
  emit()
}

export function toggleMaximizeWindow(id: PanelId) {
  const target = state.windows.find((w) => w.id === id)
  if (!target) return
  nextZ += 1
  state.windows = state.windows.map((w) =>
    w.id === id ? { ...w, maximized: !w.maximized, minimized: false, zIndex: nextZ } : w,
  )
  emit()
}

export function moveWindow(id: PanelId, x: number, y: number, commit = false) {
  const cur = state.layouts[id] ?? computeInitialRect(id)
  const clamped = clampRect({ ...cur, x, y }, state.viewport.width, state.viewport.height)
  state.layouts[id] = clamped
  if (commit) persist()
  emit()
}

export function resizeWindow(id: PanelId, width: number, height: number, commit = false) {
  const cur = state.layouts[id] ?? computeInitialRect(id)
  const clamped = clampRect({ ...cur, width, height }, state.viewport.width, state.viewport.height)
  state.layouts[id] = clamped
  if (commit) persist()
  emit()
}

export function setActiveDockTab(id: PanelId) {
  focusWindow(id)
}

export function setDockMode(mode: DockMode) {
  state.preferences.dockMode = mode
  persist()
  emit()
}

export function updateUiPref<K extends keyof UiPreferences>(key: K, val: UiPreferences[K]) {
  state.preferences = { ...state.preferences, [key]: val }
  persist()
  emit()
}

export function setGraphicsQualityPreset(preset: GraphicsQuality) {
  state.preferences = {
    ...state.preferences,
    ...GRAPHICS_QUALITY_PRESETS[preset],
  }
  persist()
  emit()
}

export function getUiPreferences(): UiPreferences {
  return state.preferences
}

export function subscribeUiLayout(cb: () => void): () => void {
  initUiLayoutBridge()
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function resetUiLayout() {
  state.layouts = {}
  state.preferences = { ...DEFAULT_PREFERENCES }
  const openIds = state.windows.map((w) => w.id)
  const tempOpen = [...state.windows]
  state.windows = []
  for (let i = 0; i < openIds.length; i++) {
    const id = openIds[i]
    const prev = tempOpen[i]
    state.layouts[id] = computeInitialRect(id)
    state.windows.push({ ...prev, minimized: false, maximized: false })
  }
  persist()
  emit()
}

export function useUiLayout(): UiLayoutSnapshot {
  return useSyncExternalStore(
    subscribeUiLayout,
    () => state,
    () => SERVER_SNAPSHOT,
  )
}
