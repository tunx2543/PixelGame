/**
 * Computes responsive 2D pixel camera zoom factoring in both viewport width and height.
 * On wide-but-short mobile landscape screens (e.g. 844x390), capping zoom by height
 * keeps at least ~280 world pixels (~17.5 tiles) visible vertically so sprites don't fill the screen.
 */
export function computeCameraZoom(cssWidth: number, cssHeight: number, scale = 1): number {
  const widthZoom = cssWidth < 700 ? 1.6 : 2.4
  const safeScale = Number.isFinite(scale) ? Math.max(0.7, Math.min(1.5, scale)) : 1
  if (!Number.isFinite(cssHeight) || cssHeight <= 0) return Math.round(widthZoom * safeScale * 100) / 100
  const heightZoomCap = Math.max(1.15, cssHeight / 280)
  const baseZoom = Math.min(widthZoom, heightZoomCap)
  return Math.round(baseZoom * safeScale * 100) / 100
}

export interface SmoothCameraState {
  x: number
  y: number
  mapId: string
  initialized: boolean
}

export function createCameraState(mapId = 'town'): SmoothCameraState {
  return { x: 0, y: 0, mapId, initialized: false }
}

export function clampCameraPosition(
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  mapW: number,
  mapH: number,
): { x: number; y: number } {
  const clampedX =
    mapW <= viewW ? (mapW - viewW) / 2 : Math.max(0, Math.min(mapW - viewW, camX))
  const clampedY =
    mapH <= viewH ? (mapH - viewH) / 2 : Math.max(0, Math.min(mapH - viewH, camY))
  return { x: clampedX, y: clampedY }
}

export function stepSmoothCamera(
  state: SmoothCameraState,
  targetWorldX: number,
  targetWorldY: number,
  viewW: number,
  viewH: number,
  mapW: number,
  mapH: number,
  mapId: string,
  dt: number,
  facing?: 'up' | 'down' | 'left' | 'right',
): { x: number; y: number } {
  const lookAheadX = facing === 'left' ? -6 : facing === 'right' ? 6 : 0
  const lookAheadY = facing === 'up' ? -5 : facing === 'down' ? 4 : 0
  const desired = clampCameraPosition(
    targetWorldX + lookAheadX - viewW / 2,
    targetWorldY - 8 + lookAheadY - viewH / 2,
    viewW,
    viewH,
    mapW,
    mapH,
  )

  const mapChanged = !state.initialized || state.mapId !== mapId
  const jumpDist = Math.hypot(desired.x - state.x, desired.y - state.y)
  if (mapChanged || jumpDist > 96 || dt <= 0) {
    state.x = desired.x
    state.y = desired.y
    state.mapId = mapId
    state.initialized = true
    return { x: state.x, y: state.y }
  }

  const safeDt = Math.min(0.05, Math.max(0.001, dt))
  const followAlpha = 1 - Math.exp(-9.5 * safeDt)
  state.x += (desired.x - state.x) * followAlpha
  state.y += (desired.y - state.y) * followAlpha

  const clamped = clampCameraPosition(state.x, state.y, viewW, viewH, mapW, mapH)
  state.x = clamped.x
  state.y = clamped.y
  return { x: state.x, y: state.y }
}

export interface DepthSortable {
  y: number
  zBias?: number
}

export function compareDepthOrder(a: DepthSortable, b: DepthSortable): number {
  const ay = a.y + (a.zBias ?? 0)
  const by = b.y + (b.zBias ?? 0)
  return ay - by
}

export interface OverheadBounds {
  x0: number
  y0: number
  x1: number
  y1: number
  baseY: number
}

export function isEntityOccludedByOverhead(
  entityX: number,
  entityBaseY: number,
  zone: OverheadBounds,
): boolean {
  return (
    entityBaseY < zone.baseY &&
    entityX >= zone.x0 - 10 &&
    entityX <= zone.x1 + 10 &&
    entityBaseY >= zone.y0 - 6 &&
    entityBaseY <= zone.baseY + 2
  )
}

