/**
 * Computes responsive 2D pixel camera zoom factoring in both viewport width and height.
 * On wide-but-short mobile landscape screens (e.g. 844x390), capping zoom by height
 * keeps at least ~280 world pixels (~17.5 tiles) visible vertically so sprites don't fill the screen.
 */
export function computeCameraZoom(cssWidth: number, cssHeight: number): number {
  const widthZoom = cssWidth < 700 ? 1.6 : 2.4
  if (!Number.isFinite(cssHeight) || cssHeight <= 0) return widthZoom
  const heightZoomCap = Math.max(1.15, cssHeight / 280)
  return Math.round(Math.min(widthZoom, heightZoomCap) * 100) / 100
}
