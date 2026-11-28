import { computeFastCanvasDpr, resolveEffectiveRenderEngine } from './fast-renderer'
import type { FpsLimit, RenderEngine, UiPreferences } from './ui-layout'

export type RunnerBackendId = 'sprite-runner' | 'hd-legacy'

export interface FramePacerState {
  lastLoopAt: number
  lastRenderedAt: number
  uiAccumulator: number
}

export interface CanvasViewportMetrics {
  width: number
  height: number
  dpr: number
  imageRendering: 'pixelated' | 'auto'
  renderEngine: RenderEngine
  backend: RunnerBackendId
}

export interface CooldownNotifySnapshot {
  skillCd: Record<string, number>
  itemCd: Record<string, number>
  guardCd: number
  dashCd: number
  comboCount: number
}

export function resolveRunnerBackend(
  prefs?: Partial<UiPreferences> | null,
  hdRendererLoaded = false,
): { requestedEngine: RenderEngine; activeEngine: RenderEngine; backend: RunnerBackendId } {
  const requestedEngine = resolveEffectiveRenderEngine(prefs)
  if (requestedEngine === 'hd' && hdRendererLoaded) {
    return {
      requestedEngine,
      activeEngine: 'hd',
      backend: 'hd-legacy',
    }
  }
  return {
    requestedEngine,
    activeEngine: 'fast',
    backend: 'sprite-runner',
  }
}

export function createFramePacerState(nowMs: number): FramePacerState {
  return {
    lastLoopAt: nowMs,
    lastRenderedAt: nowMs,
    uiAccumulator: 0,
  }
}

export function shouldStepFrame(state: FramePacerState, nowMs: number, fpsLimit: FpsLimit): boolean {
  if (fpsLimit <= 0) return true
  const minFrameMs = 1000 / fpsLimit
  return nowMs - state.lastRenderedAt >= minFrameMs - 1.5
}

export function stepFrameDelta(state: FramePacerState, nowMs: number): number {
  const dt = Math.max(0, Math.min(0.06, (nowMs - state.lastLoopAt) / 1000))
  state.lastLoopAt = nowMs
  state.lastRenderedAt = nowMs
  return dt
}

export function computeCanvasViewportMetrics(
  cssW: number,
  cssH: number,
  windowDpr: number,
  prefs: UiPreferences,
  isCompact: boolean,
  hdRendererLoaded: boolean,
): CanvasViewportMetrics {
  const resolved = resolveRunnerBackend(prefs, hdRendererLoaded)
  const dpr = computeFastCanvasDpr(
    windowDpr,
    prefs.graphicsQuality,
    prefs.resolutionScale || 1,
    isCompact,
    resolved.requestedEngine,
    prefs.crispPixelScale,
  )
  return {
    width: Math.max(1, Math.floor(Math.max(1, cssW) * dpr)),
    height: Math.max(1, Math.floor(Math.max(1, cssH) * dpr)),
    dpr,
    imageRendering: prefs.crispPixelScale ? 'pixelated' : 'auto',
    renderEngine: resolved.activeEngine,
    backend: resolved.backend,
  }
}

export function shouldNotifyUiForCooldowns(snapshot: CooldownNotifySnapshot): boolean {
  if (snapshot.guardCd > 0 || snapshot.dashCd > 0 || snapshot.comboCount > 0) return true
  for (const k in snapshot.skillCd) {
    if (snapshot.skillCd[k] > 0) return true
  }
  for (const k in snapshot.itemCd) {
    if (snapshot.itemCd[k] > 0) return true
  }
  return false
}
