type Rgb = readonly [number, number, number]

const ICON_SIZE = 24
const bmpCache = new Map<string, string>()

function parseHex(hex: string, fallback: Rgb): Rgb {
  const clean = hex.trim().replace('#', '')
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b]
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16)
    const g = parseInt(clean.slice(2, 4), 16)
    const b = parseInt(clean.slice(4, 6), 16)
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b]
  }
  return fallback
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.max(0, Math.min(1, t))
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ]
}

function encodeBmp24(pixels: Uint8Array, width: number, height: number): string {
  const rowSize = width * 3 // 24 * 3 = 72 bytes (multiple of 4, zero padding needed)
  const pixelBytes = rowSize * height
  const totalBytes = 54 + pixelBytes
  const buf = new Uint8Array(totalBytes)
  const view = new DataView(buf.buffer)

  // BITMAPFILEHEADER (14 bytes)
  buf[0] = 0x42 // 'B'
  buf[1] = 0x4d // 'M'
  view.setUint32(2, totalBytes, true)
  view.setUint32(6, 0, true)
  view.setUint32(10, 54, true)

  // BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true) // positive = bottom-up rows
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(30, 0, true) // BI_RGB
  view.setUint32(34, pixelBytes, true)
  view.setInt32(38, 2835, true)
  view.setInt32(42, 2835, true)
  view.setUint32(46, 0, true)
  view.setUint32(50, 0, true)

  let offset = 54
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3
      buf[offset++] = pixels[idx + 2] // B
      buf[offset++] = pixels[idx + 1] // G
      buf[offset++] = pixels[idx] // R
    }
  }

  if (typeof Buffer !== 'undefined') {
    return `data:image/bmp;base64,${Buffer.from(buf).toString('base64')}`
  }

  let binary = ''
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i])
  }
  return `data:image/bmp;base64,${btoa(binary)}`
}

export function renderSkillIconBmpDataUrl(
  style: string,
  primaryHex: string,
  secondaryHex: string,
): string {
  const cacheKey = `${style}|${primaryHex}|${secondaryHex}`
  const existing = bmpCache.get(cacheKey)
  if (existing) return existing

  const primary = parseHex(primaryHex, [96, 165, 250])
  const secondary = parseHex(secondaryHex, [254, 240, 138])
  const darkInk: Rgb = [9, 13, 24]
  const white: Rgb = [255, 255, 255]
  const bgDeep: Rgb = [12, 20, 36]
  const bgMid = mixRgb(bgDeep, primary, 0.24)
  const bgGlow = mixRgb(bgDeep, primary, 0.44)
  const rimLight = mixRgb([120, 158, 212], primary, 0.32)
  const rimShadow: Rgb = [24, 38, 66]
  const steelLight: Rgb = [226, 232, 240]
  const steelDark: Rgb = [100, 116, 139]
  const gold: Rgb = [251, 191, 36]

  const pixels = new Uint8Array(ICON_SIZE * ICON_SIZE * 3)
  const fgMask = new Uint8Array(ICON_SIZE * ICON_SIZE)

  // 1) Paint beveled dark-sapphire background frame with element glow
  for (let y = 0; y < ICON_SIZE; y++) {
    for (let x = 0; x < ICON_SIZE; x++) {
      const dx = (x - 11.5) / 11.5
      const dy = (y - 11.5) / 11.5
      const dist = Math.sqrt(dx * dx + dy * dy)
      let c = mixRgb(bgGlow, bgDeep, Math.min(1, dist * 1.05))
      if (y > 4 && y < 19 && x > 4 && x < 19) {
        c = mixRgb(c, bgMid, 0.28)
      }
      // Subtle pixel bevel frame
      const isCornerCut =
        (x === 0 || x === ICON_SIZE - 1) && (y === 0 || y === ICON_SIZE - 1)
      if (isCornerCut) {
        c = darkInk
      } else if (x === 0 || y === 0 || x === ICON_SIZE - 1 || y === ICON_SIZE - 1) {
        c = [16, 28, 48]
      } else if (x === 1 || y === 1) {
        c = rimLight
      } else if (x === ICON_SIZE - 2 || y === ICON_SIZE - 2) {
        c = rimShadow
      }
      const idx = (y * ICON_SIZE + x) * 3
      pixels[idx] = c[0]
      pixels[idx + 1] = c[1]
      pixels[idx + 2] = c[2]
    }
  }

  const fgPixels = new Uint8Array(ICON_SIZE * ICON_SIZE * 3)
  const setFg = (x: number, y: number, c: Rgb) => {
    const rx = Math.round(x)
    const ry = Math.round(y)
    if (rx < 2 || rx >= ICON_SIZE - 2 || ry < 2 || ry >= ICON_SIZE - 2) return
    const p = ry * ICON_SIZE + rx
    fgMask[p] = 1
    fgPixels[p * 3] = c[0]
    fgPixels[p * 3 + 1] = c[1]
    fgPixels[p * 3 + 2] = c[2]
  }

  const line = (x0: number, y0: number, x1: number, y1: number, c: Rgb) => {
    let ix0 = Math.round(x0)
    let iy0 = Math.round(y0)
    const ix1 = Math.round(x1)
    const iy1 = Math.round(y1)
    const dx = Math.abs(ix1 - ix0)
    const sx = ix0 < ix1 ? 1 : -1
    const dy = -Math.abs(iy1 - iy0)
    const sy = iy0 < iy1 ? 1 : -1
    let err = dx + dy
    while (true) {
      setFg(ix0, iy0, c)
      if (ix0 === ix1 && iy0 === iy1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        ix0 += sx
      }
      if (e2 <= dx) {
        err += dx
        iy0 += sy
      }
    }
  }

  const fillRect = (x: number, y: number, w: number, h: number, c: Rgb) => {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        setFg(xx, yy, c)
      }
    }
  }

  const fillCircle = (cx: number, cy: number, r: number, c: Rgb) => {
    const rr = r * r
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx
        const dy = y - cy
        if (dx * dx + dy * dy <= rr) {
          setFg(x, y, c)
        }
      }
    }
  }

  const strokeCircle = (cx: number, cy: number, r: number, c: Rgb) => {
    for (let a = 0; a < 36; a++) {
      const rad = (a / 36) * Math.PI * 2
      setFg(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r, c)
    }
  }

  const drawSword = (offsetX = 0, offsetY = 0, bladeColor = steelLight, edgeColor = primary) => {
    // Diagonal blade top-right -> bottom-left
    line(7 + offsetX, 16 + offsetY, 18 + offsetX, 5 + offsetY, edgeColor)
    line(6 + offsetX, 15 + offsetY, 17 + offsetX, 4 + offsetY, bladeColor)
    line(8 + offsetX, 16 + offsetY, 18 + offsetX, 6 + offsetY, bladeColor)
    setFg(18 + offsetX, 5 + offsetY, white)
    // Hilt & crossguard
    line(5 + offsetX, 13 + offsetY, 10 + offsetX, 18 + offsetY, gold)
    line(4 + offsetX, 19 + offsetY, 7 + offsetX, 16 + offsetY, steelDark)
    setFg(4 + offsetX, 19 + offsetY, gold)
  }

  // 2) Draw distinct glyph per SkillVfxStyle
  switch (style) {
    case 'heavy_cleave': {
      // Sweeping slash arc + broadsword
      for (let a = -0.8; a <= 1.4; a += 0.14) {
        setFg(11 + Math.cos(a) * 7.5, 11 + Math.sin(a) * 7.5, primary)
        setFg(11 + Math.cos(a) * 6.5, 11 + Math.sin(a) * 6.5, secondary)
      }
      drawSword(-1, 0, steelLight, secondary)
      break
    }
    case 'holy_cleave': {
      for (let a = -1.2; a <= 1.2; a += 0.14) {
        setFg(12 + Math.cos(a) * 7, 12 + Math.sin(a) * 7, secondary)
      }
      drawSword(0, 0, white, primary)
      setFg(6, 6, secondary)
      setFg(17, 17, secondary)
      break
    }
    case 'holy_sword_beam': {
      // Vertical radiant sword + beam aura
      fillRect(10, 4, 4, 11, primary)
      fillRect(11, 4, 2, 11, white)
      line(11, 3, 12, 3, white)
      fillRect(7, 15, 10, 2, gold)
      fillRect(11, 17, 2, 3, steelDark)
      setFg(11, 20, gold)
      line(8, 6, 8, 12, secondary)
      line(15, 6, 15, 12, secondary)
      break
    }
    case 'whirl_blades': {
      strokeCircle(12, 12, 6.5, primary)
      strokeCircle(12, 12, 5.2, secondary)
      // 4 spinning blades
      line(12, 4, 15, 7, white)
      line(20, 12, 17, 15, white)
      line(12, 20, 9, 17, white)
      line(4, 12, 7, 9, white)
      fillCircle(12, 12, 2, secondary)
      setFg(12, 12, white)
      break
    }
    case 'light_judgment': {
      // Descending beam + sunburst cross
      fillRect(10, 3, 4, 18, primary)
      fillRect(11, 3, 2, 18, white)
      fillRect(5, 8, 14, 3, secondary)
      fillRect(6, 9, 12, 1, white)
      line(6, 5, 17, 16, gold)
      line(17, 5, 6, 16, gold)
      break
    }
    case 'holy_heal': {
      // Bright cross + sparkles
      fillRect(10, 5, 4, 14, primary)
      fillRect(5, 10, 14, 4, primary)
      fillRect(11, 6, 2, 12, secondary)
      fillRect(6, 11, 12, 2, secondary)
      setFg(6, 6, white)
      setFg(17, 6, white)
      setFg(6, 17, white)
      setFg(17, 17, white)
      break
    }
    case 'fire_comet': {
      // Flaming comet head top-right/bottom-left tail
      line(18, 5, 10, 13, primary)
      line(17, 4, 8, 12, secondary)
      line(19, 7, 12, 15, primary)
      fillCircle(9, 14, 4.2, primary)
      fillCircle(9, 14, 2.5, secondary)
      fillCircle(8, 15, 1.3, white)
      setFg(17, 9, gold)
      setFg(14, 5, gold)
      break
    }
    case 'meteor_strike': {
      // Crashing meteor rock + fiery wake + impact rim
      line(5, 4, 12, 11, secondary)
      line(8, 3, 14, 9, primary)
      line(4, 7, 10, 13, primary)
      fillCircle(14, 13, 4.3, primary)
      fillCircle(14, 13, 2.8, secondary)
      fillCircle(13, 12, 1.5, white)
      line(6, 18, 18, 18, primary)
      line(8, 19, 16, 19, secondary)
      break
    }
    case 'blizzard_storm': {
      // Crisp 6-way ice crystal
      line(12, 4, 12, 19, primary)
      line(5, 8, 19, 16, primary)
      line(19, 8, 5, 16, primary)
      line(12, 6, 12, 17, secondary)
      line(7, 9, 17, 15, secondary)
      line(17, 9, 7, 15, secondary)
      fillCircle(12, 12, 1.8, white)
      setFg(6, 5, white)
      setFg(18, 18, white)
      break
    }
    case 'holy_lance': {
      // Winged spear thrust
      line(5, 18, 18, 5, primary)
      line(6, 18, 19, 5, white)
      // Spear tip
      line(15, 5, 19, 5, secondary)
      line(18, 5, 18, 9, secondary)
      // Wings at base
      line(7, 13, 11, 13, gold)
      line(11, 13, 11, 17, gold)
      break
    }
    case 'sanctuary_circle': {
      strokeCircle(12, 12, 7.2, primary)
      strokeCircle(12, 12, 4.6, secondary)
      line(12, 4, 12, 19, primary)
      line(4, 12, 19, 12, primary)
      fillCircle(12, 12, 2.2, white)
      break
    }
    case 'arrow_barrage': {
      // Two parallel flying arrows
      for (const [ox, oy] of [
        [0, 0],
        [-3, 3],
      ]) {
        line(6 + ox, 16 + oy, 17 + ox, 5 + oy, secondary)
        line(14 + ox, 5 + oy, 17 + ox, 5 + oy, white)
        line(17 + ox, 5 + oy, 17 + ox, 8 + oy, white)
        line(5 + ox, 14 + oy, 7 + ox, 16 + oy, primary)
        line(6 + ox, 17 + oy, 8 + ox, 15 + oy, primary)
      }
      break
    }
    case 'arrow_rain': {
      for (const x of [7, 12, 17]) {
        const yOff = x === 12 ? 2 : 0
        line(x, 4 + yOff, x, 16 + yOff, secondary)
        setFg(x - 1, 14 + yOff, white)
        setFg(x + 1, 14 + yOff, white)
        setFg(x, 16 + yOff, white)
        setFg(x - 1, 5 + yOff, primary)
        setFg(x + 1, 5 + yOff, primary)
      }
      break
    }
    case 'sniper_pierce': {
      strokeCircle(12, 12, 6, primary)
      line(12, 4, 12, 8, secondary)
      line(12, 16, 12, 20, secondary)
      line(4, 12, 8, 12, secondary)
      line(16, 12, 20, 12, secondary)
      // Piercing streak
      line(5, 16, 18, 6, white)
      fillCircle(12, 12, 1.5, white)
      break
    }
    case 'twin_slash': {
      // X-shaped gleaming blades
      line(5, 6, 18, 17, primary)
      line(6, 5, 19, 16, white)
      line(5, 17, 18, 6, secondary)
      line(6, 18, 19, 7, white)
      fillCircle(12, 12, 1.8, white)
      break
    }
    case 'shadow_backstab': {
      // Curved stealth blade + crescent shadow
      for (let a = 2.2; a <= 4.8; a += 0.14) {
        setFg(12 + Math.cos(a) * 6.5, 12 + Math.sin(a) * 6.5, primary)
      }
      drawSword(1, -1, primary, secondary)
      setFg(17, 15, white)
      break
    }
    case 'shadow_vortex': {
      strokeCircle(12, 12, 7, primary)
      for (let t = 0.2; t < 11; t += 0.25) {
        const r = t * 0.62
        setFg(12 + Math.cos(t * 1.1) * r, 12 + Math.sin(t * 1.1) * r, secondary)
      }
      fillCircle(12, 12, 2.2, white)
      break
    }
    case 'iaijutsu_wave': {
      // Crescent katana slash wave
      for (let a = -1.3; a <= 1.3; a += 0.1) {
        setFg(9 + Math.cos(a) * 8.5, 12 + Math.sin(a) * 7.5, primary)
        setFg(10 + Math.cos(a) * 7.5, 12 + Math.sin(a) * 6.5, white)
      }
      line(5, 18, 14, 9, secondary)
      break
    }
    case 'fist_shockwave': {
      // Impact gauntlet + shock arcs
      fillRect(7, 9, 8, 7, primary)
      fillRect(8, 8, 6, 2, secondary)
      line(8, 11, 14, 11, white)
      fillRect(8, 16, 6, 2, steelDark)
      for (let a = -1.1; a <= 1.1; a += 0.18) {
        setFg(15 + Math.cos(a) * 4, 12 + Math.sin(a) * 5, secondary)
      }
      break
    }
    case 'alchemy_flask_burst': {
      // Potion flask + bubbles
      fillRect(10, 5, 4, 3, steelLight)
      fillRect(9, 4, 6, 1, gold)
      fillCircle(12, 14, 5, steelLight)
      fillCircle(12, 14, 4, primary)
      fillCircle(12, 15, 3, secondary)
      setFg(10, 12, white)
      setFg(8, 7, secondary)
      setFg(16, 6, primary)
      break
    }
    case 'venom_fang_strike': {
      // Twin curved fangs + venom drops
      line(7, 6, 9, 15, white)
      line(8, 6, 10, 14, primary)
      line(16, 6, 14, 15, white)
      line(15, 6, 13, 14, primary)
      fillCircle(9, 17, 1.3, secondary)
      fillCircle(14, 18, 1.4, primary)
      break
    }
    case 'shadow_skull_mist': {
      // Pixel skull + glowing eyes
      fillCircle(12, 10, 4.5, steelLight)
      fillRect(9, 13, 6, 4, steelLight)
      setFg(10, 10, primary)
      setFg(14, 10, primary)
      setFg(10, 16, darkInk)
      setFg(12, 16, darkInk)
      setFg(14, 16, darkInk)
      line(5, 17, 18, 18, primary)
      setFg(6, 7, secondary)
      setFg(17, 7, secondary)
      break
    }
    case 'demon_pentagram': {
      strokeCircle(12, 12, 7.2, primary)
      const pts: [number, number][] = []
      for (let i = 0; i < 5; i++) {
        const ang = (i * 2 * Math.PI) / 5 + Math.PI / 2
        pts.push([12 + Math.cos(ang) * 6.4, 12 + Math.sin(ang) * 6.4])
      }
      for (let i = 0; i < 5; i++) {
        const a = pts[i]
        const b = pts[(i + 2) % 5]
        line(a[0], a[1], b[0], b[1], secondary)
      }
      fillCircle(12, 12, 1.5, white)
      break
    }
    case 'arcane_rune_pulse': {
      // Diamond magic sigil + core orb
      line(12, 4, 19, 12, primary)
      line(19, 12, 12, 19, primary)
      line(12, 19, 5, 12, primary)
      line(5, 12, 12, 4, primary)
      fillCircle(12, 12, 3, secondary)
      fillCircle(12, 12, 1.5, white)
      setFg(6, 6, secondary)
      setFg(18, 6, secondary)
      setFg(6, 18, secondary)
      setFg(18, 18, secondary)
      break
    }
    case 'coin_rain': {
      // Stacked gold coins + glint
      for (const [cx, cy] of [
        [9, 14],
        [15, 13],
        [12, 8],
      ]) {
        fillCircle(cx, cy, 3.2, primary)
        fillCircle(cx, cy, 2.0, secondary)
        setFg(cx - 1, cy - 1, white)
      }
      setFg(7, 6, white)
      setFg(17, 17, gold)
      break
    }
    case 'aegis_shield_slam': {
      // Heater shield + radiant cross crest
      fillRect(7, 5, 10, 8, primary)
      fillRect(8, 13, 8, 3, primary)
      fillRect(10, 16, 4, 3, primary)
      line(12, 6, 12, 17, secondary)
      line(8, 10, 16, 10, secondary)
      setFg(12, 10, white)
      setFg(8, 6, white)
      break
    }
    default: {
      drawSword(0, 0, steelLight, primary)
      break
    }
  }

  // 3) Composite dark outline around foreground glyph + foreground colors onto background
  for (let y = 1; y < ICON_SIZE - 1; y++) {
    for (let x = 1; x < ICON_SIZE - 1; x++) {
      const p = y * ICON_SIZE + x
      if (fgMask[p]) continue
      const hasNeighbor =
        fgMask[p - 1] ||
        fgMask[p + 1] ||
        fgMask[p - ICON_SIZE] ||
        fgMask[p + ICON_SIZE]
      if (hasNeighbor) {
        const idx = p * 3
        pixels[idx] = darkInk[0]
        pixels[idx + 1] = darkInk[1]
        pixels[idx + 2] = darkInk[2]
      }
    }
  }

  for (let p = 0; p < ICON_SIZE * ICON_SIZE; p++) {
    if (!fgMask[p]) continue
    const idx = p * 3
    pixels[idx] = fgPixels[idx]
    pixels[idx + 1] = fgPixels[idx + 1]
    pixels[idx + 2] = fgPixels[idx + 2]
  }

  const url = encodeBmp24(pixels, ICON_SIZE, ICON_SIZE)
  bmpCache.set(cacheKey, url)
  return url
}
