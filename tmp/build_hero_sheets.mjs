import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const HERO_IDS = [
  'novice',
  'swordsman',
  'mage',
  'archer',
  'cleric',
  'merchant',
  'thief',
  'kensei',
  'iron_fist',
  'wicked_necromancer',
  'the_king',
  'sinister',
  'templar',
  'nekobaku',
  'mamushi',
]

const DIRS = ['down', 'up', 'left', 'right']
const ANIMS = [
  { name: 'idle', frames: 4 },
  { name: 'walk', frames: 6 },
  { name: 'run', frames: 6 },
  { name: 'attack', frames: 5 },
  { name: 'skill', frames: 6 },
  { name: 'hit', frames: 3 },
  { name: 'death', frames: 5 },
  { name: 'victory', frames: 5 },
]

// Exact frame geometry matching lib/game/sprite-sheets.ts
const FW = 168
const FH = 192
const SW = FW * 2 // 336 supersampled canvas width
const SH = FH * 2 // 384 supersampled canvas height
const ANCHOR_Y_SS = 178 * 2 // 356 foot baseline
const CX_SS = 84 * 2 // 168 center X

const CLASS_STYLES = {
  novice:             { primary: '#ef4444', secondary: '#fbbf24', skin: [224, 178, 146], tunic: [88, 108, 134], vfx: 'slash', weaponSide: 'left', wideProp: false },
  swordsman:          { primary: '#f59e0b', secondary: '#e2e8f0', skin: [220, 170, 138], tunic: [75, 85, 99],   vfx: 'cleave', weaponSide: 'both', wideProp: true },
  mage:               { primary: '#a855f7', secondary: '#e879f9', skin: [236, 198, 178], tunic: [76, 48, 118],  vfx: 'arcane', weaponSide: 'left', wideProp: false },
  archer:             { primary: '#22c55e', secondary: '#bef264', skin: [222, 176, 144], tunic: [45, 90, 56],   vfx: 'arrow',  weaponSide: 'both', wideProp: true },
  cleric:             { primary: '#facc15', secondary: '#60a5fa', skin: [234, 194, 168], tunic: [96, 152, 212], vfx: 'holy',   weaponSide: 'left', wideProp: false },
  merchant:           { primary: '#fbbf24', secondary: '#34d399', skin: [222, 174, 140], tunic: [164, 106, 42], vfx: 'gold',   weaponSide: 'both', wideProp: true },
  thief:              { primary: '#f43f5e', secondary: '#94a3b8', skin: [218, 172, 142], tunic: [48, 48, 56],   vfx: 'dual',   weaponSide: 'both', wideProp: false },
  kensei:             { primary: '#38bdf8', secondary: '#f43f5e', skin: [226, 182, 150], tunic: [54, 48, 56],   vfx: 'iaido',  weaponSide: 'both', wideProp: true },
  iron_fist:          { primary: '#f97316', secondary: '#fde047', skin: [214, 158, 122], tunic: [44, 44, 52],   vfx: 'fist',   weaponSide: 'both', wideProp: false },
  wicked_necromancer: { primary: '#c084fc', secondary: '#7e22ce', skin: [204, 192, 214], tunic: [54, 38, 74],   vfx: 'necro',  weaponSide: 'both', wideProp: true },
  the_king:           { primary: '#fbbf24', secondary: '#ef4444', skin: [222, 174, 140], tunic: [138, 34, 38],  vfx: 'royal',  weaponSide: 'left', wideProp: true },
  sinister:           { primary: '#a855f7', secondary: '#ef4444', skin: [212, 162, 142], tunic: [42, 32, 46],   vfx: 'shadow', weaponSide: 'both', wideProp: true },
  templar:            { primary: '#60a5fa', secondary: '#fde047', skin: [226, 180, 148], tunic: [48, 86, 156],  vfx: 'lance',  weaponSide: 'both', wideProp: true },
  nekobaku:           { primary: '#4ade80', secondary: '#ec4899', skin: [234, 192, 162], tunic: [84, 72, 62],   vfx: 'potion', weaponSide: 'right', wideProp: false },
  mamushi:            { primary: '#22c55e', secondary: '#a855f7', skin: [210, 176, 150], tunic: [42, 74, 58],   vfx: 'venom',  weaponSide: 'both', wideProp: true },
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

function measureMaster(data, w, h) {
  let minX = w, maxX = -1, minY = h, maxY = -1
  let coreSumX = 0, coreCnt = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3]
      if (a > 24) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        if (y >= 200 && y <= 860 && x >= 260 && x <= 636) {
          coreSumX += x
          coreCnt++
        }
      }
    }
  }
  const coreX = coreCnt > 0 ? Math.round(coreSumX / coreCnt) : Math.round((minX + maxX) / 2)
  let footY = maxY
  for (let y = h - 1; y >= 840; y--) {
    let solid = 0
    for (let x = Math.max(0, coreX - 165); x <= Math.min(w - 1, coreX + 165); x++) {
      if (data[(y * w + x) * 4 + 3] > 180) solid++
    }
    if (solid >= 16) {
      footY = y
      break
    }
  }
  return { minX, maxX, minY, maxY, footY, coreX }
}

// Resample master (896x1200) into exact aligned 336x384 supersampled pose canvas
async function alignMasterToSS(pngPath, targetScale, isDirSide = false) {
  const raw = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = raw.info.width, h = raw.info.height
  const bounds = measureMaster(raw.data, w, h)
  const scaledW = Math.max(1, Math.round(w * targetScale))
  const scaledH = Math.max(1, Math.round(h * targetScale))

  const resized = await sharp(raw.data, { raw: { width: w, height: h, channels: 4 } })
    .resize(scaledW, scaledH, { kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer()

  const ssCoreX = bounds.coreX * targetScale
  const ssFootY = bounds.footY * targetScale
  const ssMinX = bounds.minX * targetScale
  const ssMaxX = bounds.maxX * targetScale
  const ssMinY = bounds.minY * targetScale

  // Center coreX on CX_SS (168), but nudge softly if wide prop/bow/cart clips frame margin [6..330]
  let offsetX = Math.round(CX_SS - ssCoreX)
  if (ssMinX + offsetX < 8) offsetX = Math.round(8 - ssMinX)
  if (ssMaxX + offsetX > SW - 8) offsetX = Math.round(SW - 8 - ssMaxX)
  // Clamp max horizontal nudge so portrait stays centered on face
  offsetX = clamp(offsetX, Math.round(CX_SS - ssCoreX) - 18, Math.round(CX_SS - ssCoreX) + 18)

  let offsetY = Math.round(ANCHOR_Y_SS - ssFootY)
  if (ssMinY + offsetY < 14) offsetY = Math.round(14 - ssMinY)

  const out = Buffer.alloc(SW * SH * 4)
  for (let y = 0; y < scaledH; y++) {
    const dy = y + offsetY
    if (dy < 0 || dy >= SH) continue
    for (let x = 0; x < scaledW; x++) {
      const dx = x + offsetX
      if (dx < 0 || dx >= SW) continue
      const si = (y * scaledW + x) * 4
      const di = (dy * SW + dx) * 4
      out[di] = resized[si]
      out[di + 1] = resized[si + 1]
      out[di + 2] = resized[si + 2]
      out[di + 3] = resized[si + 3]
    }
  }

  // Re-measure exact landmarks in 336x384 space
  const ssBounds = measureAlignedSS(out)
  return { data: out, landmarks: ssBounds, isDirSide }
}

function measureAlignedSS(data) {
  let minX = SW, maxX = -1, minY = SH, maxY = -1
  let coreSumX = 0, coreCnt = 0
  for (let y = 0; y < SH; y++) {
    for (let x = 0; x < SW; x++) {
      if (data[(y * SW + x) * 4 + 3] > 24) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        if (y >= 80 && y <= 280 && x >= 96 && x <= 240) {
          coreSumX += x
          coreCnt++
        }
      }
    }
  }
  const cx = coreCnt > 0 ? Math.round(coreSumX / coreCnt) : CX_SS
  let footY = maxY
  for (let y = SH - 1; y >= 270; y--) {
    let solid = 0
    for (let x = Math.max(0, cx - 55); x <= Math.min(SW - 1, cx + 55); x++) {
      if (data[(y * SW + x) * 4 + 3] > 170) solid++
    }
    if (solid >= 6) { footY = y; break }
  }
  // Find true head top within central column [cx - 46, cx + 46] (ignores taller raised staves/halos)
  let headTopY = minY
  for (let y = 10; y < footY - 120; y++) {
    let solid = 0
    for (let x = Math.max(0, cx - 40); x <= Math.min(SW - 1, cx + 40); x++) {
      if (data[(y * SW + x) * 4 + 3] > 180) solid++
    }
    if (solid >= 12) { headTopY = y; break }
  }
  const bodyH = Math.max(120, footY - headTopY)
  const neckY = Math.round(headTopY + bodyH * 0.34)
  const waistY = Math.round(headTopY + bodyH * 0.62)
  const hipY = Math.round(headTopY + bodyH * 0.70)
  const eyeY = Math.round(headTopY + bodyH * 0.215)
  return { minX, maxX, minY, maxY, footY, headTopY, bodyH, cx, neckY, waistY, hipY, eyeY }
}

// Bilinear pixel sampling with zero-clamp edge
function sampleBilinear(buf, w, h, sx, sy, outRgba) {
  const x0 = Math.floor(sx), y0 = Math.floor(sy)
  const fx = sx - x0, fy = sy - y0
  let r = 0, g = 0, b = 0, a = 0, wSum = 0
  const pts = [
    [x0, y0, (1 - fx) * (1 - fy)],
    [x0 + 1, y0, fx * (1 - fy)],
    [x0, y0 + 1, (1 - fx) * fy],
    [x0 + 1, y0 + 1, fx * fy],
  ]
  for (const [px, py, wt] of pts) {
    if (px < 0 || px >= w || py < 0 || py >= h || wt <= 0) continue
    const idx = (py * w + px) * 4
    const pa = buf[idx + 3]
    a += pa * wt
    if (pa > 0) {
      const cw = wt * pa
      r += buf[idx] * cw
      g += buf[idx + 1] * cw
      b += buf[idx + 2] * cw
      wSum += cw
    }
  }
  outRgba[0] = wSum > 0 ? Math.round(r / wSum) : 0
  outRgba[1] = wSum > 0 ? Math.round(g / wSum) : 0
  outRgba[2] = wSum > 0 ? Math.round(b / wSum) : 0
  outRgba[3] = Math.round(clamp(a, 0, 255))
}

function alphaOver(dst, dstIdx, r, g, b, a) {
  if (a <= 0) return
  const sa = a / 255
  const da = dst[dstIdx + 3] / 255
  const outA = sa + da * (1 - sa)
  if (outA <= 0) return
  dst[dstIdx] = Math.round((r * sa + dst[dstIdx] * da * (1 - sa)) / outA)
  dst[dstIdx + 1] = Math.round((g * sa + dst[dstIdx + 1] * da * (1 - sa)) / outA)
  dst[dstIdx + 2] = Math.round((b * sa + dst[dstIdx + 2] * da * (1 - sa)) / outA)
  dst[dstIdx + 3] = Math.round(outA * 255)
}

function drawTransformedPart(dst, src, w, h, maskFn, pivotX, pivotY, tx, ty, rotRad, scaleX = 1, scaleY = 1, tint = null) {
  const cos = Math.cos(-rotRad), sin = Math.sin(-rotRad)
  const pxRgba = [0, 0, 0, 0]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Inverse transform destination -> source
      const dx = (x - (pivotX + tx)) / scaleX
      const dy = (y - (pivotY + ty)) / scaleY
      const sx = pivotX + dx * cos - dy * sin
      const sy = pivotY + dx * sin + dy * cos
      if (sx < 0 || sx >= w - 1 || sy < 0 || sy >= h - 1) continue
      const m = maskFn(sx, sy)
      if (m <= 0.01) continue
      sampleBilinear(src, w, h, sx, sy, pxRgba)
      const a = Math.round(pxRgba[3] * m)
      if (a < 3) continue
      let r = pxRgba[0], g = pxRgba[1], b = pxRgba[2]
      if (tint) {
        r = Math.round(lerp(r, tint[0], tint[3]))
        g = Math.round(lerp(g, tint[1], tint[3]))
        b = Math.round(lerp(b, tint[2], tint[3]))
      }
      alphaOver(dst, (y * w + x) * 4, r, g, b, a)
    }
  }
}

// Compute natural eye-blink overlay in 336x384 space for idle frame 2
function applyBlink(buf, lm, dir) {
  if (dir === 'up') return // back view has no visible eyes
  const eyeCenterY = lm.eyeY
  const cx = lm.cx + (dir === 'left' ? -10 : dir === 'right' ? 10 : 0)
  // Paint gentle closed eyelid curve over left & right eye bands where dark/bright eye contrast lives
  const eyeXs = dir === 'down' ? [cx - 19, cx + 19] : [cx - 12, cx + 8]
  for (const ex of eyeXs) {
    // Verify skin tone nearby
    let skinR = 222, skinG = 176, skinB = 144, sCnt = 0
    for (let sy = eyeCenterY - 12; sy <= eyeCenterY + 12; sy += 2) {
      for (let sx = ex - 10; sx <= ex + 10; sx += 2) {
        if (sx < 0 || sx >= SW || sy < 0 || sy >= SH) continue
        const p = (sy * SW + sx) * 4
        if (buf[p + 3] > 200 && buf[p] > buf[p + 2] + 18 && buf[p] > 155) {
          skinR += buf[p]; skinG += buf[p + 1]; skinB += buf[p + 2]; sCnt++
        }
      }
    }
    if (sCnt === 0) continue
    skinR = Math.round(skinR / (sCnt + 1))
    skinG = Math.round(skinG / (sCnt + 1))
    skinB = Math.round(skinB / (sCnt + 1))
    for (let dy = -6; dy <= 5; dy++) {
      for (let dx = -9; dx <= 9; dx++) {
        const x = Math.round(ex + dx), y = Math.round(eyeCenterY + dy)
        if (x < 0 || x >= SW || y < 0 || y >= SH) continue
        const p = (y * SW + x) * 4
        if (buf[p + 3] < 180) continue
        // Only cover bright sclera/iris pixels or very dark pupils inside small eye oval
        const lum = 0.299 * buf[p] + 0.587 * buf[p + 1] + 0.114 * buf[p + 2]
        const dist = (dx * dx) / 81 + (dy * dy) / 36
        if (dist > 1) continue
        // Eyelash curve at dy = 2 + dx*dx*0.025
        const lashY = 1.6 + (dx * dx) * 0.022
        if (Math.abs(dy - lashY) < 1.25) {
          buf[p] = 52; buf[p + 1] = 36; buf[p + 2] = 34
        } else if (lum > 185 || lum < 90 || (buf[p + 2] > buf[p] + 8)) {
          buf[p] = Math.round(lerp(buf[p], skinR, 0.85))
          buf[p + 1] = Math.round(lerp(buf[p + 1], skinG, 0.85))
          buf[p + 2] = Math.round(lerp(buf[p + 2], skinB, 0.85))
        }
      }
    }
  }
}

// Draw crisp anti-aliased SDF combat VFX in 336x384 space
function drawCombatVfx(dst, style, dir, anim, frameIdx, lm) {
  const pCol = hexToRgb(style.primary)
  const sCol = hexToRgb(style.secondary)
  const dirX = dir === 'left' ? -1 : dir === 'right' ? 1 : 0
  const dirY = dir === 'up' ? -1 : dir === 'down' ? 1 : 0
  const cx = lm.cx + dirX * 28
  const cy = Math.round((lm.neckY + lm.hipY) * 0.52) + dirY * 14

  const plotAdd = (x, y, col, alpha) => {
    const ix = Math.round(x), iy = Math.round(y)
    if (ix < 0 || ix >= SW || iy < 0 || iy >= SH || alpha <= 0.01) return
    const di = (iy * SW + ix) * 4
    const a = clamp(alpha, 0, 1)
    // Screen-like luminous blend over transparent or opaque pixels
    const prevA = dst[di + 3] / 255
    const outA = clamp(prevA + a * (1 - prevA * 0.5), 0, 1)
    if (outA <= 0) return
    dst[di] = clamp(Math.round(dst[di] * (1 - a * 0.3) + col[0] * a * 1.15), 0, 255)
    dst[di + 1] = clamp(Math.round(dst[di + 1] * (1 - a * 0.3) + col[1] * a * 1.15), 0, 255)
    dst[di + 2] = clamp(Math.round(dst[di + 2] * (1 - a * 0.3) + col[2] * a * 1.15), 0, 255)
    dst[di + 3] = Math.round(outA * 255)
  }

  // Run dust puffs at ground
  if (anim === 'run' && (frameIdx === 1 || frameIdx === 4)) {
    const puffX = lm.cx - dirX * 36 + (frameIdx === 1 ? -14 : 14)
    const puffY = ANCHOR_Y_SS - 6
    for (let dy = -12; dy <= 10; dy++) {
      for (let dx = -20; dx <= 20; dx++) {
        const d = Math.hypot(dx / 18, dy / 10)
        if (d < 1) plotAdd(puffX + dx, puffY + dy, [226, 232, 240], (1 - d) * 0.42)
      }
    }
    return
  }

  // Attack slash arc / projectile burst (frames 1, 2, 3)
  if (anim === 'attack' && frameIdx >= 1 && frameIdx <= 3) {
    const prog = frameIdx === 1 ? 0.45 : frameIdx === 2 ? 1.0 : 0.55
    const baseAngle = dir === 'left' ? Math.PI : dir === 'right' ? 0 : dir === 'up' ? -Math.PI * 0.5 : Math.PI * 0.5
    const radius = style.vfx === 'lance' ? 92 : 76
    const arcSpan = style.vfx === 'dual' ? 1.45 : 1.18

    // Draw sweeping crescent arc
    for (let y = Math.max(0, cy - 110); y < Math.min(SH, cy + 110); y++) {
      for (let x = Math.max(0, cx - 110); x < Math.min(SW, cx + 110); x++) {
        const vx = x - cx, vy = y - cy
        const r = Math.hypot(vx, vy)
        if (r < 24 || r > radius + 16) continue
        let ang = Math.atan2(vy, vx) - baseAngle
        while (ang > Math.PI) ang -= Math.PI * 2
        while (ang < -Math.PI) ang += Math.PI * 2
        if (Math.abs(ang) > arcSpan) continue

        const edgeFade = 1 - Math.abs(ang) / arcSpan
        const thick = (style.vfx === 'cleave' || style.vfx === 'royal' ? 18 : 13) * edgeFade
        const targetR = radius * (0.86 + 0.14 * edgeFade)
        const dist = Math.abs(r - targetR)
        if (dist < thick) {
          const core = 1 - dist / thick
          const col = core > 0.65 ? [255, 255, 255] : core > 0.32 ? sCol : pCol
          plotAdd(x, y, col, core * prog * 0.92)
        }
        // Second inner cross-slash for dual-dagger / venom / iaido
        if ((style.vfx === 'dual' || style.vfx === 'venom' || style.vfx === 'iaido') && Math.abs(r - radius * 0.66) < 8 * edgeFade) {
          const core2 = 1 - Math.abs(r - radius * 0.66) / (8 * edgeFade)
          plotAdd(x, y, pCol, core2 * prog * 0.72)
        }
      }
    }

    // Projectile streak for archer / mage / cleric / nekobaku / necro
    if (style.vfx === 'arrow' || style.vfx === 'arcane' || style.vfx === 'holy' || style.vfx === 'potion' || style.vfx === 'necro') {
      const tipX = cx + (dirX || (dir === 'up' ? 0 : 0.4)) * (64 + frameIdx * 16)
      const tipY = cy + (dirY || -0.15) * (46 + frameIdx * 10)
      for (let dy = -22; dy <= 22; dy++) {
        for (let dx = -22; dx <= 22; dx++) {
          const d = Math.hypot(dx, dy)
          if (d < 20) {
            const k = (1 - d / 20)
            plotAdd(tipX + dx, tipY + dy, d < 7 ? [255, 255, 255] : sCol, k * k * prog * 0.9)
          }
        }
      }
    }
    return
  }

  // Skill magic circle + vertical aura burst (frames 0..5)
  if (anim === 'skill') {
    const power = frameIdx === 0 ? 0.35 : frameIdx <= 3 ? 0.95 : frameIdx === 4 ? 0.65 : 0.25
    const gx = lm.cx, gy = ANCHOR_Y_SS - 8
    const rx = 86 + frameIdx * 5, ry = 26 + frameIdx * 1.5
    // Ground rune ellipse
    for (let y = Math.max(0, gy - 44); y < Math.min(SH, gy + 44); y++) {
      for (let x = Math.max(0, gx - 120); x < Math.min(SW, gx + 120); x++) {
        const nx = (x - gx) / rx, ny = (y - gy) / ry
        const ell = Math.hypot(nx, ny)
        if (Math.abs(ell - 1) < 0.085 || Math.abs(ell - 0.72) < 0.06) {
          plotAdd(x, y, pCol, power * 0.85)
        } else if (ell < 0.7) {
          plotAdd(x, y, sCol, (1 - ell) * power * 0.22)
        }
      }
    }
    // Orbiting energy orbs & vertical burst rays (frames 1..4)
    if (frameIdx >= 1 && frameIdx <= 4) {
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2 + frameIdx * 0.8
        const ox = lm.cx + Math.cos(ang) * 76
        const oy = lm.neckY + 54 + Math.sin(ang) * 28 - frameIdx * 12
        for (let dy = -12; dy <= 12; dy++) {
          for (let dx = -12; dx <= 12; dx++) {
            const d = Math.hypot(dx, dy)
            if (d < 11) {
              const b = 1 - d / 11
              plotAdd(ox + dx, oy + dy, d < 4 ? [255, 255, 255] : sCol, b * b * power)
            }
          }
        }
      }
    }
    return
  }

  // Victory sparkles (frames 1..4)
  if (anim === 'victory' && frameIdx >= 1) {
    const fade = frameIdx === 4 ? 0.55 : 0.95
    const stars = [
      [lm.cx - 64, lm.headTopY + 12 - frameIdx * 4],
      [lm.cx + 68, lm.headTopY + 24 - frameIdx * 3],
      [lm.cx - 46, lm.waistY - frameIdx * 5],
      [lm.cx + 52, lm.neckY + 18 - frameIdx * 4],
    ]
    for (const [sx, sy] of stars) {
      for (let d = -14; d <= 14; d++) {
        const fall = 1 - Math.abs(d) / 14
        plotAdd(sx + d, sy, [255, 248, 190], fall * fade)
        plotAdd(sx, sy + d, [255, 248, 190], fall * fade)
      }
      for (let dy = -5; dy <= 5; dy++) {
        for (let dx = -5; dx <= 5; dx++) {
          const dist = Math.hypot(dx, dy)
          if (dist < 5) plotAdd(sx + dx, sy + dy, [255, 255, 255], (1 - dist / 5) * fade)
        }
      }
    }
  }
}

// Render 1 pose frame (336x384 RGBA) via articulated parts & soft overlap
function renderArticulatedPose(aligned, style, dir, anim, frameIdx) {
  const { data: src, landmarks: lm } = aligned
  const out = Buffer.alloc(SW * SH * 4)
  const dirSign = dir === 'left' ? -1 : dir === 'right' ? 1 : 0

  // Pose parameters per animation & frame
  let bodyDy = 0, bodyDx = 0, bodyRot = 0
  let headDy = 0, headRot = 0
  let lLegDx = 0, lLegDy = 0, lLegRot = 0
  let rLegDx = 0, rLegDy = 0, rLegRot = 0
  let weaponDx = 0, weaponDy = 0, weaponRot = 0
  let capeTilt = 0
  let tint = null
  let globalAlpha = 1

  if (anim === 'idle') {
    const seq = [0, 3, 1, -2]
    bodyDy = seq[frameIdx] ?? 0
    headDy = bodyDy * 1.15
    weaponDy = (seq[(frameIdx + 3) % 4] ?? 0) * 0.9
    capeTilt = Math.sin(frameIdx * Math.PI * 0.5) * 0.025
  } else if (anim === 'walk') {
    const phase = (frameIdx / 6) * Math.PI * 2
    const stride = Math.sin(phase)
    const lLift = Math.max(0, Math.cos(phase))
    const rLift = Math.max(0, -Math.cos(phase))
    bodyDy = -Math.abs(Math.cos(phase)) * 6
    headDy = bodyDy * 0.85
    bodyRot = dirSign * 0.03
    if (dir === 'left' || dir === 'right') {
      lLegDx = stride * 14
      rLegDx = -stride * 14
      lLegRot = -stride * 0.14
      rLegRot = stride * 0.14
    } else {
      lLegDx = -stride * 4
      rLegDx = stride * 4
      lLegRot = stride * 0.06
      rLegRot = -stride * 0.06
    }
    lLegDy = -lLift * 10
    rLegDy = -rLift * 10
    weaponDx = -stride * (dirSign || 1) * 5
    weaponRot = -stride * 0.10
    capeTilt = 0.04 + Math.sin(phase) * 0.04
  } else if (anim === 'run') {
    const phase = (frameIdx / 6) * Math.PI * 2
    const stride = Math.sin(phase)
    const lLift = Math.max(0, Math.cos(phase))
    const rLift = Math.max(0, -Math.cos(phase))
    bodyDy = -Math.abs(Math.cos(phase)) * 10
    headDy = bodyDy * 0.8
    bodyDx = dirSign * 6
    bodyRot = dirSign * 0.10
    headRot = -dirSign * 0.04
    lLegDx = (dir === 'left' || dir === 'right') ? stride * 20 : -stride * 5
    rLegDx = (dir === 'left' || dir === 'right') ? -stride * 20 : stride * 5
    lLegDy = -lLift * 15
    rLegDy = -rLift * 15
    lLegRot = -stride * 0.22
    rLegRot = stride * 0.22
    weaponDx = -dirSign * 8 - stride * 7
    weaponRot = -dirSign * 0.18
    capeTilt = 0.10 + Math.sin(phase) * 0.06
  } else if (anim === 'attack') {
    const k = frameIdx // 0..4
    if (k === 0) {
      bodyDx = -dirSign * 8; bodyDy = 4; bodyRot = -dirSign * 0.09
      weaponDx = -dirSign * 10; weaponDy = -6; weaponRot = -(dirSign || 1) * 0.32
      lLegDx = -dirSign * 4; rLegDx = dirSign * 4
    } else if (k === 1) {
      bodyDx = dirSign * 12; bodyDy = -3; bodyRot = dirSign * 0.11
      weaponDx = dirSign * 14; weaponDy = 4; weaponRot = (dirSign || 1) * 0.42
      lLegDx = -dirSign * 8; rLegDx = dirSign * 12
    } else if (k === 2) {
      bodyDx = dirSign * 16; bodyDy = -1; bodyRot = dirSign * 0.14
      weaponDx = dirSign * 18; weaponDy = 8; weaponRot = (dirSign || 1) * 0.56
      lLegDx = -dirSign * 10; rLegDx = dirSign * 15
    } else if (k === 3) {
      bodyDx = dirSign * 10; bodyDy = 2; bodyRot = dirSign * 0.07
      weaponDx = dirSign * 10; weaponDy = 6; weaponRot = (dirSign || 1) * 0.34
      lLegDx = -dirSign * 5; rLegDx = dirSign * 8
    } else {
      bodyDx = dirSign * 3; bodyDy = 0; bodyRot = dirSign * 0.02
      weaponDx = dirSign * 3; weaponRot = (dirSign || 1) * 0.10
    }
    headDy = bodyDy
  } else if (anim === 'skill') {
    const seqY = [6, -6, -14, -12, -5, 1]
    const wRot = [-0.22, -0.45, -0.58, -0.48, -0.25, -0.05]
    bodyDy = seqY[frameIdx] ?? 0
    headDy = bodyDy * 1.08
    weaponDy = bodyDy - (frameIdx >= 1 && frameIdx <= 3 ? 8 : 0)
    weaponRot = (dirSign || 1) * (wRot[frameIdx] ?? 0)
    lLegDy = bodyDy * 0.85
    rLegDy = bodyDy * 0.85
    capeTilt = frameIdx >= 1 && frameIdx <= 3 ? 0.12 : 0.03
  } else if (anim === 'hit') {
    const k = frameIdx
    bodyDx = -dirSign * (k === 0 ? 12 : k === 1 ? 6 : 2)
    bodyDy = k === 0 ? 4 : k === 1 ? 2 : 0
    bodyRot = -(dirSign || 1) * (k === 0 ? 0.16 : k === 1 ? 0.08 : 0.02)
    headRot = bodyRot * 1.25
    weaponRot = (dirSign || 1) * (k === 0 ? 0.22 : 0.08)
    if (k === 0) tint = [255, 95, 95, 0.36]
    else if (k === 1) tint = [255, 180, 180, 0.18]
  } else if (anim === 'death') {
    const k = frameIdx
    const rots = [0.18, 0.52, 1.02, 1.42, 1.52]
    const dys = [6, 28, 60, 88, 94]
    const dxs = [-8, -14, -18, -16, -16]
    const sign = dir === 'right' ? -1 : 1
    bodyRot = -sign * rots[k]
    bodyDy = dys[k]
    bodyDx = sign * dxs[k]
    headDy = bodyDy
    lLegDy = bodyDy
    rLegDy = bodyDy
    weaponDy = bodyDy
    weaponRot = bodyRot
    globalAlpha = k === 4 ? 0.84 : k === 3 ? 0.90 : 1
    // Rotate full unified figure cleanly around mid-hip/ankle for natural collapse onto floor
    const pivotY = Math.round(ANCHOR_Y_SS - 74)
    drawTransformedPart(
      out, src, SW, SH,
      () => 1,
      lm.cx, pivotY,
      bodyDx, bodyDy, bodyRot, 1, 1,
      k <= 1 ? [255, 120, 120, 0.22] : null,
    )
    if (globalAlpha < 1) {
      for (let i = 3; i < out.length; i += 4) out[i] = Math.round(out[i] * globalAlpha)
    }
    return out
  } else if (anim === 'victory') {
    const seqY = [5, -18, -24, -4, 0]
    const wLift = [-0.1, -0.45, -0.55, -0.25, -0.18]
    bodyDy = seqY[frameIdx] ?? 0
    headDy = bodyDy * 1.1
    lLegDy = bodyDy * (frameIdx === 1 || frameIdx === 2 ? 0.92 : 0.6)
    rLegDy = bodyDy * (frameIdx === 1 || frameIdx === 2 ? 0.92 : 0.6)
    weaponDy = bodyDy - (frameIdx === 1 || frameIdx === 2 ? 6 : 0)
    weaponRot = (dirSign || 1) * (wLift[frameIdx] ?? 0)
  }

  // Smooth anatomical masks in 336x384 space (overlap feathered so zero seams!)
  const hipPivotY = lm.hipY
  const shoulderPivotY = lm.neckY + 24

  // Determine left/right leg zones
  const leftLegMask = (x, y) => {
    const yW = smoothstep(lm.hipY - 14, lm.hipY + 12, y)
    const xW = smoothstep(lm.cx + 8, lm.cx - 8, x)
    return yW * xW
  }
  const rightLegMask = (x, y) => {
    const yW = smoothstep(lm.hipY - 14, lm.hipY + 12, y)
    const xW = smoothstep(lm.cx - 8, lm.cx + 8, x)
    return yW * xW
  }
  // Upper torso + arms + head (everything above hipY+8, feathering smoothly into waist/hip)
  const upperMask = (x, y) => smoothstep(lm.hipY + 12, lm.hipY - 12, y)

  // Weapon/outer-arm side boost zone (outside torso core width)
  const outerWeaponMask = (x, y) => {
    const distFromCx = Math.abs(x - lm.cx)
    const torsoHalf = y < lm.neckY ? 56 : 44
    const xW = smoothstep(torsoHalf, torsoHalf + 18, distFromCx)
    const yW = smoothstep(lm.neckY - 40, lm.neckY + 10, y) * smoothstep(ANCHOR_Y_SS - 10, lm.hipY + 20, y)
    return xW * yW
  }

  // Paint in strict back-to-front anatomical order
  // 1. Legs (back leg first depending on direction)
  if (dir === 'right') {
    drawTransformedPart(out, src, SW, SH, leftLegMask, lm.cx - 18, hipPivotY, lLegDx + bodyDx * 0.4, lLegDy, lLegRot, 1, 1, tint)
    drawTransformedPart(out, src, SW, SH, rightLegMask, lm.cx + 18, hipPivotY, rLegDx + bodyDx * 0.4, rLegDy, rLegRot, 1, 1, tint)
  } else {
    drawTransformedPart(out, src, SW, SH, rightLegMask, lm.cx + 18, hipPivotY, rLegDx + bodyDx * 0.4, rLegDy, rLegRot, 1, 1, tint)
    drawTransformedPart(out, src, SW, SH, leftLegMask, lm.cx - 18, hipPivotY, lLegDx + bodyDx * 0.4, lLegDy, lLegRot, 1, 1, tint)
  }

  // 2. Torso & Head (unified above hipY + 12, minus outer weapon wing so weapon doesn't double)
  const torsoBodyMask = (x, y) => {
    const u = upperMask(x, y)
    if (u <= 0) return 0
    // Subtract outer weapon swing region only during dynamic weapon swings
    const wMask = Math.abs(weaponRot) > 0.08 ? outerWeaponMask(x, y) : 0
    return u * (1 - wMask)
  }
  drawTransformedPart(out, src, SW, SH, torsoBodyMask, lm.cx, lm.waistY, bodyDx, bodyDy, bodyRot + capeTilt * 0.35, 1, 1, tint)

  // 3. Dynamic weapon/outer-arm overlay during swings/run/attack/skill/victory
  if (Math.abs(weaponRot) > 0.08) {
    const wPivotX = lm.cx + (dirSign !== 0 ? dirSign * 38 : -44)
    drawTransformedPart(out, src, SW, SH, outerWeaponMask, wPivotX, shoulderPivotY, weaponDx + bodyDx * 0.7, weaponDy + bodyDy * 0.7, weaponRot, 1, 1, tint)
  }

  // 4. Eye Blink on idle col 2
  if (anim === 'idle' && frameIdx === 2) {
    applyBlink(out, lm, dir)
  }

  // 5. Combat/Run/Skill/Victory VFX
  drawCombatVfx(out, style, dir, anim, frameIdx, lm)

  return out
}

// Segment a rendered 336x384 composite frame into 4 paperdoll layers: body, armor, hair, weapon
function splitLayersFromComposite(composite, style, lm, anim, frameIdx) {
  const body = Buffer.alloc(SW * SH * 4)
  const armor = Buffer.alloc(SW * SH * 4)
  const hair = Buffer.alloc(SW * SH * 4)
  const weapon = Buffer.alloc(SW * SH * 4)

  const hairLimitY = lm.eyeY + 12
  const faceCenterX = lm.cx
  const neckY = lm.neckY

  for (let y = 0; y < SH; y++) {
    for (let x = 0; x < SW; x++) {
      const i = (y * SW + x) * 4
      const a = composite[i + 3]
      if (a < 4) continue
      const r = composite[i], g = composite[i + 1], b = composite[i + 2]

      const dx = Math.abs(x - faceCenterX)
      const isWeaponZone =
        (dx > (y < neckY ? 60 : 50) && y > lm.headTopY + 10) ||
        (anim === 'attack' && frameIdx >= 1 && frameIdx <= 3 && r > 220 && g > 220 && b > 220) ||
        (anim === 'skill' && y > ANCHOR_Y_SS - 30)

      if (isWeaponZone) {
        weapon[i] = r; weapon[i + 1] = g; weapon[i + 2] = b; weapon[i + 3] = a
        continue
      }

      if (y < neckY + 8) {
        // Head region: separate skin/face onto `body` and hair/hats onto `hair`
        const isSkinOrEye =
          y > lm.headTopY + 26 &&
          dx < 34 &&
          (
            (r > b + 16 && r > 125 && g > 85) || // warm skin
            (r > 205 && g > 205 && b > 205 && Math.abs(y - lm.eyeY) < 12) // eye sclera
          )
        if (isSkinOrEye || y > hairLimitY) {
          body[i] = r; body[i + 1] = g; body[i + 2] = b; body[i + 3] = a
        } else {
          hair[i] = r; hair[i + 1] = g; hair[i + 2] = b; hair[i + 3] = a
          // Put clean skin-toned base head fill underneath hair so replacing hair never creates bald gap
          body[i] = style.skin[0]; body[i + 1] = style.skin[1]; body[i + 2] = style.skin[2]
          body[i + 3] = Math.round(a * (y > lm.headTopY + 14 ? 0.92 : 0))
        }
      } else {
        // Body below neck: armor owns outfit/boots, body owns neutral inner silhouette underneath
        armor[i] = r; armor[i + 1] = g; armor[i + 2] = b; armor[i + 3] = a
        // Paint clean inner base silhouette onto `body` (hands/skin kept natural, core torso painted neutral under-tunic)
        const isSkinHand = r > b + 20 && r > 140 && dx > 34
        if (isSkinHand) {
          body[i] = r; body[i + 1] = g; body[i + 2] = b; body[i + 3] = a
        } else {
          // Tapered inner silhouette under armor
          const coreScale = dx < 36 ? 1 : 0.7
          body[i] = style.tunic[0]
          body[i + 1] = style.tunic[1]
          body[i + 2] = style.tunic[2]
          body[i + 3] = Math.round(a * coreScale)
        }
      }
    }
  }
  return { body, armor, hair, weapon }
}

async function downsampleSS(buf) {
  return sharp(buf, { raw: { width: SW, height: SH, channels: 4 } })
    .resize(FW, FH, { kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer()
}

function blitCell(atlas, atlasW, cellBuf, row, col) {
  const ox = col * FW
  const oy = row * FH
  for (let y = 0; y < FH; y++) {
    const srcStart = y * FW * 4
    const dstStart = ((oy + y) * atlasW + ox) * 4
    cellBuf.copy(atlas, dstStart, srcStart, srcStart + FW * 4)
  }
}

async function buildJob(jobId) {
  const style = CLASS_STYLES[jobId]
  const masterDir = path.join('/tmp/hd_build', jobId)
  const outDir = path.join(process.cwd(), 'public', 'assets', 'hd', 'characters', jobId)
  fs.mkdirSync(outDir, { recursive: true })

  // Calculate unified scale from front master so all 4 directions share identical proportions
  const frontRaw = await sharp(path.join(masterDir, 'front.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const fBounds = measureMaster(frontRaw.data, frontRaw.info.width, frontRaw.info.height)
  const rawBodyH = Math.max(200, fBounds.footY - fBounds.minY)
  const rawW = Math.max(100, fBounds.maxX - fBounds.minX)
  const targetBodyH = style.wideProp ? 292 : 304
  const targetScale = Math.min(targetBodyH / rawBodyH, (SW - 18) / rawW)

  const alignedDirs = {}
  alignedDirs.down = await alignMasterToSS(path.join(masterDir, 'front.png'), targetScale, false)
  alignedDirs.up = await alignMasterToSS(path.join(masterDir, 'back.png'), targetScale, false)
  alignedDirs.left = await alignMasterToSS(path.join(masterDir, 'left.png'), targetScale, true)
  alignedDirs.right = await alignMasterToSS(path.join(masterDir, 'right.png'), targetScale, true)

  const atlasW = FW * 6 // 1008
  const atlasH = FH * 32 // 6144
  const atlasFull = Buffer.alloc(atlasW * atlasH * 4)
  const atlasBody = Buffer.alloc(atlasW * atlasH * 4)
  const atlasArmor = Buffer.alloc(atlasW * atlasH * 4)
  const atlasHair = Buffer.alloc(atlasW * atlasH * 4)
  const atlasWeapon = Buffer.alloc(atlasW * atlasH * 4)

  let rowIdx = 0
  let portraitBuf = null

  for (const anim of ANIMS) {
    for (const dir of DIRS) {
      const animDirPath = path.join(outDir, anim.name, dir)
      fs.mkdirSync(animDirPath, { recursive: true })
      const aligned = alignedDirs[dir]

      for (let f = 0; f < anim.frames; f++) {
        const ssFull = renderArticulatedPose(aligned, style, dir, anim.name, f)
        const { body: ssBody, armor: ssArmor, hair: ssHair, weapon: ssWeapon } =
          splitLayersFromComposite(ssFull, style, aligned.landmarks, anim.name, f)

        const [cellFull, cellBody, cellArmor, cellHair, cellWeapon] = await Promise.all([
          downsampleSS(ssFull),
          downsampleSS(ssBody),
          downsampleSS(ssArmor),
          downsampleSS(ssHair),
          downsampleSS(ssWeapon),
        ])

        blitCell(atlasFull, atlasW, cellFull, rowIdx, f)
        blitCell(atlasBody, atlasW, cellBody, rowIdx, f)
        blitCell(atlasArmor, atlasW, cellArmor, rowIdx, f)
        blitCell(atlasHair, atlasW, cellHair, rowIdx, f)
        blitCell(atlasWeapon, atlasW, cellWeapon, rowIdx, f)

        // Write individual 168x192 RGBA frame PNG
        await sharp(cellFull, { raw: { width: FW, height: FH, channels: 4 } })
          .png({ compressionLevel: 9 })
          .toFile(path.join(animDirPath, `${f}.png`))

        if (anim.name === 'idle' && dir === 'down' && f === 0) {
          portraitBuf = cellFull
        }
      }
      rowIdx += 1
    }
  }

  // Write 5 layer atlases (1008x6144 RGBA colorType 6)
  await Promise.all([
    sharp(atlasFull, { raw: { width: atlasW, height: atlasH, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(outDir, 'sheet.png')),
    sharp(atlasBody, { raw: { width: atlasW, height: atlasH, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(outDir, 'body_sheet.png')),
    sharp(atlasArmor, { raw: { width: atlasW, height: atlasH, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(outDir, 'armor_sheet.png')),
    sharp(atlasHair, { raw: { width: atlasW, height: atlasH, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(outDir, 'hair_sheet.png')),
    sharp(atlasWeapon, { raw: { width: atlasW, height: atlasH, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(outDir, 'weapon_sheet.png')),
    sharp(portraitBuf, { raw: { width: FW, height: FH, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(outDir, 'portrait.png')),
  ])

  // Write metadata.json matching hero-sprite-sheets.test.ts assertions
  const lm = alignedDirs.down.landmarks
  const metadata = {
    jobId,
    frameWidth: FW,
    frameHeight: FH,
    cols: 6,
    rows: 32,
    anchorX: 0.5,
    anchorY: 178 / FH,
    handSockets: {
      down: { x: Math.round(lm.cx / 2) - 24, y: Math.round((lm.neckY + lm.waistY) / 4) },
      up: { x: Math.round(lm.cx / 2) + 24, y: Math.round((lm.neckY + lm.waistY) / 4) },
      left: { x: Math.round(lm.cx / 2) - 20, y: Math.round((lm.neckY + lm.waistY) / 4) },
      right: { x: Math.round(lm.cx / 2) + 20, y: Math.round((lm.neckY + lm.waistY) / 4) },
    },
    headSockets: {
      down: { x: Math.round(lm.cx / 2), y: Math.round(lm.headTopY / 2) },
      up: { x: Math.round(lm.cx / 2), y: Math.round(lm.headTopY / 2) },
      left: { x: Math.round(lm.cx / 2) - 2, y: Math.round(lm.headTopY / 2) },
      right: { x: Math.round(lm.cx / 2) + 2, y: Math.round(lm.headTopY / 2) },
    },
    animations: ANIMS,
  }
  fs.writeFileSync(path.join(outDir, 'metadata.json'), JSON.stringify(metadata, null, 2))
  console.log(`Built 100% sheets & 160 frames for ${jobId} (scale=${targetScale.toFixed(3)}, headY=${Math.round(lm.headTopY/2)}, footY=${Math.round(lm.footY/2)})`)
}

async function main() {
  for (const id of HERO_IDS) {
    await buildJob(id)
  }
  console.log('ALL 15 HERO SPRITE SHEETS COMPLETE!')
}

main().catch((e) => { console.error(e); process.exit(1) })
