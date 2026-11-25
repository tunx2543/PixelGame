import type { Item25dArchetype, Item25dVisualSpec } from './item-25d-archetypes'

const SS = 128
const OUT = 64

const MAT_MATTE = 0
const MAT_METAL = 1
const MAT_GEM = 2
const MAT_WOOD = 3
const MAT_GLASS = 4
const MAT_EMISSIVE = 5

type Rgb = [number, number, number]

function hexToRgb(hex: string): Rgb {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6)
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return [
    Number.isFinite(r) ? r : 160,
    Number.isFinite(g) ? g : 160,
    Number.isFinite(b) ? b : 160,
  ]
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.max(0, Math.min(1, t))
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}

function shadeRgb(c: Rgb, amt: number): Rgb {
  if (amt >= 0) return mixRgb(c, [255, 255, 255], amt)
  return mixRgb(c, [8, 10, 20], -amt)
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

// Signed distance primitives in SS pixel space
function sdCircle(px: number, py: number, cx: number, cy: number, r: number): number {
  return Math.hypot(px - cx, py - cy) - r
}

function sdEllipse(px: number, py: number, cx: number, cy: number, rx: number, ry: number): number {
  const dx = (px - cx) / rx
  const dy = (py - cy) / ry
  const d = Math.hypot(dx, dy)
  return (d - 1) * Math.min(rx, ry)
}

function sdCapsule(px: number, py: number, ax: number, ay: number, bx: number, by: number, r: number): number {
  const pax = px - ax
  const pay = py - ay
  const bax = bx - ax
  const bay = by - ay
  const h = clamp01((pax * bax + pay * bay) / (bax * bax + bay * bay || 1))
  return Math.hypot(pax - bax * h, pay - bay * h) - r
}

function sdTaperCapsule(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  ra: number,
  rb: number,
): { dist: number; t: number; r: number } {
  const pax = px - ax
  const pay = py - ay
  const bax = bx - ax
  const bay = by - ay
  const t = clamp01((pax * bax + pay * bay) / (bax * bax + bay * bay || 1))
  const r = ra + (rb - ra) * t
  return { dist: Math.hypot(pax - bax * t, pay - bay * t) - r, t, r }
}

function sdRoundBox(
  px: number,
  py: number,
  cx: number,
  cy: number,
  hx: number,
  hy: number,
  r: number,
  angle = 0,
): number {
  const cos = Math.cos(-angle)
  const sin = Math.sin(-angle)
  const dx = px - cx
  const dy = py - cy
  const lx = dx * cos - dy * sin
  const ly = dx * sin + dy * cos
  const qx = Math.abs(lx) - hx + r
  const qy = Math.abs(ly) - hy + r
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}

function sdDiamond(
  px: number,
  py: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  angle = 0,
): number {
  const cos = Math.cos(-angle)
  const sin = Math.sin(-angle)
  const dx = px - cx
  const dy = py - cy
  const lx = Math.abs(dx * cos - dy * sin) / rx
  const ly = Math.abs(dx * sin + dy * cos) / ry
  return ((lx + ly - 1) * Math.min(rx, ry)) * 0.72
}

function sdPolygon(px: number, py: number, pts: ReadonlyArray<[number, number]>): number {
  let d = Infinity
  let s = 1
  const n = pts.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [ix, iy] = pts[i]
    const [jx, jy] = pts[j]
    const ex = jx - ix
    const ey = jy - iy
    const wx = px - ix
    const wy = py - iy
    const proj = clamp01((wx * ex + wy * ey) / (ex * ex + ey * ey || 1))
    const bx = wx - ex * proj
    const by = wy - ey * proj
    d = Math.min(d, bx * bx + by * by)
    const c1 = py >= iy
    const c2 = py < jy
    const c3 = ex * wy > ey * wx
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s
  }
  return s * Math.sqrt(d)
}

class Scene25d {
  readonly r = new Float32Array(SS * SS)
  readonly g = new Float32Array(SS * SS)
  readonly b = new Float32Array(SS * SS)
  readonly a = new Float32Array(SS * SS)
  readonly z = new Float32Array(SS * SS)
  readonly mat = new Uint8Array(SS * SS)
  readonly glow = new Float32Array(SS * SS)

  paint(
    dist: number,
    px: number,
    py: number,
    rgb: Rgb,
    heightVal: number,
    material: number,
    opacity = 1,
    aaWidth = 1.35,
  ) {
    if (dist > aaWidth) return
    const cov = clamp01(1 - (dist + aaWidth * 0.5) / aaWidth) * opacity
    if (cov <= 0.004) return
    const idx = py * SS + px
    const prevA = this.a[idx]
    const outA = cov + prevA * (1 - cov)
    if (outA > 0) {
      const wNew = cov / outA
      const wOld = (prevA * (1 - cov)) / outA
      this.r[idx] = this.r[idx] * wOld + rgb[0] * wNew
      this.g[idx] = this.g[idx] * wOld + rgb[1] * wNew
      this.b[idx] = this.b[idx] * wOld + rgb[2] * wNew
      this.a[idx] = outA
    }
    if (cov > 0.35) {
      this.z[idx] = Math.max(this.z[idx], heightVal)
      this.mat[idx] = material
    } else if (heightVal > this.z[idx]) {
      this.z[idx] = this.z[idx] * (1 - cov) + heightVal * cov
    }
    if (material === MAT_EMISSIVE) {
      this.glow[idx] = Math.max(this.glow[idx], cov)
    }
  }

  addGlow(dist: number, px: number, py: number, rgb: Rgb, radius: number, strength: number) {
    if (dist > radius || dist < -radius * 0.5) return
    const falloff = clamp01(1 - Math.max(0, dist) / radius)
    const k = falloff * falloff * strength
    const idx = py * SS + px
    this.r[idx] = Math.min(255, this.r[idx] + rgb[0] * k)
    this.g[idx] = Math.min(255, this.g[idx] + rgb[1] * k)
    this.b[idx] = Math.min(255, this.b[idx] + rgb[2] * k)
    this.a[idx] = Math.max(this.a[idx], k * 0.65)
    this.glow[idx] = Math.max(this.glow[idx], k)
  }
}

function domeHeight(dist: number, radius: number, base: number, peak: number): number {
  const depth = clamp01(-dist / Math.max(1, radius))
  return base + Math.sqrt(Math.max(0, depth * (2 - depth))) * (peak - base)
}

function bevelHeight(dist: number, bevelPx: number, base: number, peak: number): number {
  const d = clamp01(-dist / Math.max(0.5, bevelPx))
  return base + Math.pow(d, 0.72) * (peak - base)
}

function drawSwordLike(
  scene: Scene25d,
  spec: Item25dVisualSpec,
  variant: 'sword' | 'greatsword' | 'katana' | 'dagger',
) {
  const pri = hexToRgb(spec.primaryHex)
  const sec = hexToRgb(spec.secondaryHex)
  const acc = hexToRgb(spec.accentHex)
  const glow = hexToRgb(spec.glowHex)
  const isDagger = variant === 'dagger'
  const isGreat = variant === 'greatsword'
  const isKatana = variant === 'katana'
  const bladeMetal = spec.element === 'physical' ? mixRgb([216, 228, 242], pri, 0.25) : mixRgb([210, 224, 240], pri, 0.42)
  const guardCol = spec.tier >= 3 || spec.isMythicOrLegend ? [245, 190, 62] as Rgb : shadeRgb(sec, -0.08)
  const gripCol = shadeRgb(pri, -0.45)

  const tipX = isDagger ? 94 : 105
  const tipY = isDagger ? 34 : 23
  const baseBladeX = isDagger ? 48 : 40
  const baseBladeY = isDagger ? 80 : 88
  const pommelX = isDagger ? 29 : 22
  const pommelY = isDagger ? 99 : 106
  const guardX = isDagger ? 45 : 37
  const guardY = isDagger ? 83 : 91

  // Direction unit vectors (handle -> tip)
  const dx = tipX - baseBladeX
  const dy = tipY - baseBladeY
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  const nx = -uy
  const ny = ux

  const halfW = isGreat ? 11.5 : isDagger ? 6.5 : isKatana ? 6.2 : 8.2
  const angle = Math.atan2(dy, dx)

  for (let py = 0; py < SS; py++) {
    for (let px = 0; px < SS; px++) {
      // Grip (wood/leather)
      const grip = sdCapsule(px, py, pommelX, pommelY, guardX, guardY, isGreat ? 4.4 : 3.6)
      if (grip < 2) {
        const stripe = Math.sin((px * ux + py * uy) * 0.9) > 0.25 ? 0.12 : -0.1
        scene.paint(grip, px, py, shadeRgb(gripCol, stripe), domeHeight(grip, 4, 0.18, 0.46), MAT_WOOD)
      }

      // Pommel gem/metal cap
      const pom = sdCircle(px, py, pommelX - ux * 1.5, pommelY - uy * 1.5, isGreat ? 7.2 : 5.6)
      if (pom < 2) {
        scene.paint(pom, px, py, guardCol, domeHeight(pom, 6, 0.28, 0.65), MAT_METAL)
      }
      const pomGem = sdCircle(px, py, pommelX - ux * 1.5, pommelY - uy * 1.5, 2.7)
      if (pomGem < 1.5) {
        scene.paint(pomGem, px, py, acc, domeHeight(pomGem, 3, 0.62, 0.85), MAT_GEM)
      }

      // Blade geometry
      let bladeDist = 999
      let ridgeDist = 0
      if (isKatana) {
        // Curved katana arc
        const t = clamp01(((px - baseBladeX) * ux + (py - baseBladeY) * uy) / len)
        const bend = Math.sin(t * Math.PI) * 7.5
        const cx = baseBladeX + ux * len * t + nx * bend
        const cy = baseBladeY + uy * len * t + ny * bend
        const w = (1 - Math.pow(t, 2.2) * 0.82) * halfW
        bladeDist = Math.hypot(px - cx, py - cy) - w
        ridgeDist = ((px - cx) * nx + (py - cy) * ny) / Math.max(1, w)
      } else {
        // Double-beveled tapered blade polygon with sharp tip
        const b1x = baseBladeX + nx * halfW
        const b1y = baseBladeY + ny * halfW
        const b2x = baseBladeX - nx * halfW
        const b2y = baseBladeY - ny * halfW
        const m1x = baseBladeX + ux * len * 0.78 + nx * (halfW * (isGreat ? 0.95 : 0.72))
        const m1y = baseBladeY + uy * len * 0.78 + ny * (halfW * (isGreat ? 0.95 : 0.72))
        const m2x = baseBladeX + ux * len * 0.78 - nx * (halfW * (isGreat ? 0.95 : 0.72))
        const m2y = baseBladeY + uy * len * 0.78 - ny * (halfW * (isGreat ? 0.95 : 0.72))
        bladeDist = sdPolygon(px, py, [
          [b1x, b1y],
          [m1x, m1y],
          [tipX, tipY],
          [m2x, m2y],
          [b2x, b2y],
        ])
        ridgeDist = ((px - baseBladeX) * nx + (py - baseBladeY) * ny) / halfW
      }

      if (bladeDist < 8 && spec.element !== 'physical') {
        scene.addGlow(bladeDist, px, py, glow, 8, 0.25)
      }
      if (bladeDist < 2) {
        // Sharp center bevel ridge! One facet brighter, other facet deeper
        const isUpperSide = ridgeDist <= 0
        const ridgeHeight = 0.35 + (1 - Math.min(1, Math.abs(ridgeDist))) * 0.52
        const facetCol = isUpperSide ? shadeRgb(bladeMetal, 0.16) : shadeRgb(bladeMetal, -0.22)
        const isFuller = Math.abs(ridgeDist) < 0.17 && ((px - baseBladeX) * ux + (py - baseBladeY) * uy) < len * 0.62
        const finalBladeCol = isFuller && isGreat ? mixRgb(facetCol, acc, 0.55) : facetCol
        const matType = isFuller && isGreat && spec.element !== 'physical' ? MAT_EMISSIVE : MAT_METAL
        scene.paint(bladeDist, px, py, finalBladeCol, ridgeHeight, matType)
      }

      // Crossguard (overlaps blade base)
      const guardLen = isGreat ? 19 : isDagger ? 11 : isKatana ? 10 : 15
      const guardThick = isGreat ? 5.2 : isKatana ? 3.2 : 4.2
      const guardDist = sdRoundBox(px, py, guardX, guardY, guardThick, guardLen, 2.2, angle)
      if (guardDist < 2) {
        scene.paint(guardDist, px, py, guardCol, bevelHeight(guardDist, 4.5, 0.48, 0.86), MAT_METAL)
      }
      // Guard center jewel
      const gGem = sdDiamond(px, py, guardX, guardY, 4.2, 4.2, angle)
      if (gGem < 1.5) {
        scene.paint(gGem, px, py, acc, bevelHeight(gGem, 3, 0.78, 0.98), MAT_GEM)
      }
    }
  }
}

function drawStaff(scene: Scene25d, spec: Item25dVisualSpec) {
  const pri = hexToRgb(spec.primaryHex)
  const sec = hexToRgb(spec.secondaryHex)
  const acc = hexToRgb(spec.accentHex)
  const glow = hexToRgb(spec.glowHex)
  const wood = spec.tier >= 4 ? mixRgb([90, 58, 44], pri, 0.28) : [140, 88, 52] as Rgb
  const gold = [244, 192, 68] as Rgb

  const orbX = 87
  const orbY = 39
  const baseX = 24
  const baseY = 104
  const neckX = 72
  const neckY = 54

  for (let py = 0; py < SS; py++) {
    for (let px = 0; px < SS; px++) {
      // Shaft
      const shaft = sdCapsule(px, py, baseX, baseY, neckX, neckY, 4.4)
      if (shaft < 2) {
        scene.paint(shaft, px, py, wood, domeHeight(shaft, 4.5, 0.22, 0.56), MAT_WOOD)
      }
      // Golden butt cap & collar rings
      const cap = sdCircle(px, py, baseX, baseY, 5.2)
      if (cap < 2) {
        scene.paint(cap, px, py, gold, domeHeight(cap, 5, 0.35, 0.72), MAT_METAL)
      }
      const collar = sdCapsule(px, py, neckX - 4, neckY + 4, neckX + 3, neckY - 3, 6.4)
      if (collar < 2) {
        scene.paint(collar, px, py, gold, domeHeight(collar, 6, 0.45, 0.82), MAT_METAL)
      }

      // Twin curved crescent prongs cradling the floating orb
      const prong1 = sdCapsule(px, py, 74, 52, 70, 29, 3.2)
      const prong2 = sdCapsule(px, py, 74, 52, 99, 56, 3.2)
      const prong3 = sdCapsule(px, py, 70, 29, 82, 22, 2.6)
      const prong4 = sdCapsule(px, py, 99, 56, 105, 44, 2.6)
      const prongD = Math.min(prong1, prong2, prong3, prong4)
      if (prongD < 2) {
        scene.paint(prongD, px, py, gold, domeHeight(prongD, 3.5, 0.48, 0.82), MAT_METAL)
      }

      // Glowing magic crystal orb
      const orbD = sdCircle(px, py, orbX, orbY, 13.5)
      if (orbD < 14) {
        scene.addGlow(orbD, px, py, glow, 14, 0.42)
      }
      if (orbD < 2) {
        const innerDist = Math.hypot(px - (orbX - 3.5), py - (orbY - 3.5))
        const coreCol = mixRgb(acc, [255, 255, 255], clamp01(1 - innerDist / 12) * 0.6)
        scene.paint(orbD, px, py, coreCol, domeHeight(orbD, 13.5, 0.5, 1.0), MAT_GEM)
      }
      // Small orbiting rune spark
      const s1 = sdDiamond(px, py, 103, 25, 4.2, 4.2)
      if (s1 < 2) {
        scene.paint(s1, px, py, glow, 0.95, MAT_EMISSIVE)
      }
    }
  }
}

function drawHammerOrClub(scene: Scene25d, spec: Item25dVisualSpec, isHammer: boolean) {
  const pri = hexToRgb(spec.primaryHex)
  const wood: Rgb = [148, 92, 50]
  const steel: Rgb = mixRgb([180, 194, 212], pri, 0.3)
  const gold: Rgb = [240, 186, 62]
  const angle = -Math.PI / 4

  for (let py = 0; py < SS; py++) {
    for (let px = 0; px < SS; px++) {
      if (isHammer) {
        const shaft = sdCapsule(px, py, 24, 104, 82, 46, 4.6)
        if (shaft < 2) scene.paint(shaft, px, py, wood, domeHeight(shaft, 4.6, 0.2, 0.54), MAT_WOOD)
        const head = sdRoundBox(px, py, 82, 46, 15, 24, 4, angle)
        if (head < 2) scene.paint(head, px, py, steel, bevelHeight(head, 8, 0.4, 0.92), MAT_METAL)
        const band = sdRoundBox(px, py, 82, 46, 16, 6, 2, angle)
        if (band < 2) scene.paint(band, px, py, gold, bevelHeight(band, 4, 0.65, 0.98), MAT_METAL)
      } else {
        const tap = sdTaperCapsule(px, py, 25, 103, 94, 34, 3.6, 11.2)
        if (tap.dist < 2) {
          const grain = Math.sin(tap.t * 16 + (px - py) * 0.2) * 0.08
          scene.paint(tap.dist, px, py, shadeRgb(mixRgb(wood, pri, 0.35), grain), domeHeight(tap.dist, tap.r, 0.25, 0.8), MAT_WOOD)
        }
        const stud1 = sdCircle(px, py, 84, 35, 3.2)
        const stud2 = sdCircle(px, py, 93, 44, 3.2)
        const stud = Math.min(stud1, stud2)
        if (stud < 2) scene.paint(stud, px, py, gold, domeHeight(stud, 3, 0.72, 0.96), MAT_METAL)
      }
    }
  }
}

function drawBow(scene: Scene25d, spec: Item25dVisualSpec, isCrossbow: boolean) {
  const pri = hexToRgb(spec.primaryHex)
  const acc = hexToRgb(spec.accentHex)
  const glow = hexToRgb(spec.glowHex)
  const staveCol = spec.element === 'physical' ? mixRgb([155, 96, 52], pri, 0.32) : mixRgb([120, 82, 58], pri, 0.52)
  const gold: Rgb = [238, 185, 64]

  for (let py = 0; py < SS; py++) {
    for (let px = 0; px < SS; px++) {
      if (isCrossbow) {
        const stock = sdCapsule(px, py, 30, 98, 86, 42, 4.8)
        if (stock < 2) scene.paint(stock, px, py, staveCol, domeHeight(stock, 4.8, 0.25, 0.6), MAT_WOOD)
        const prod = Math.abs(sdCircle(px, py, 64, 64, 34)) - 3.6
        const mask = sdRoundBox(px, py, 84, 44, 24, 24, 6, -Math.PI / 4)
        const prodCut = Math.max(prod, mask)
        if (prodCut < 2) scene.paint(prodCut, px, py, gold, domeHeight(prodCut, 4, 0.45, 0.85), MAT_METAL)
        const str1 = sdCapsule(px, py, 56, 36, 42, 86, 1.3)
        const str2 = sdCapsule(px, py, 92, 72, 42, 86, 1.3)
        const str = Math.min(str1, str2)
        if (str < 1.8) scene.paint(str, px, py, [226, 232, 240], 0.35, MAT_MATTE)
        const bolt = sdCapsule(px, py, 42, 86, 98, 30, 2.2)
        if (bolt < 2) scene.paint(bolt, px, py, [226, 232, 240], 0.72, MAT_METAL)
        const tip = sdDiamond(px, py, 100, 28, 5.5, 5.5, -Math.PI / 4)
        if (tip < 2) scene.paint(tip, px, py, acc, 0.9, MAT_METAL)
      } else {
        // Recurve bow arc along top-left -> bottom-right diagonal
        const limb = Math.abs(sdCircle(px, py, 38, 38, 50)) - 4.2
        const halfPlane = (px - 64) + (py - 64) // negative toward top-left
        const limbBox = Math.max(limb, -halfPlane + 2, sdCircle(px, py, 64, 64, 46))
        if (limbBox < 2) {
          scene.paint(limbBox, px, py, staveCol, domeHeight(limbBox, 4.5, 0.35, 0.78), MAT_WOOD)
        }
        // Bowstring from (88, 30) to (30, 88) pulled back slightly to (38, 90)? Wait: pulled back to (36, 92)
        const s1 = sdCapsule(px, py, 86, 30, 38, 88, 1.2)
        if (s1 < 1.8) scene.paint(s1, px, py, [232, 238, 246], 0.32, MAT_MATTE)
        // Grip wrap
        const grip = sdCapsule(px, py, 68, 68, 76, 60, 5.4)
        if (grip < 2) scene.paint(grip, px, py, gold, domeHeight(grip, 5, 0.45, 0.84), MAT_METAL)
        // Nocked glowing arrow pointing up-right!
        const arrowShaft = sdCapsule(px, py, 34, 94, 94, 34, 2.2)
        if (arrowShaft < 2) scene.paint(arrowShaft, px, py, [215, 175, 118], 0.65, MAT_WOOD)
        const arrowTip = sdDiamond(px, py, 97, 31, 7, 5, -Math.PI / 4)
        if (arrowTip < 8 && spec.element !== 'physical') scene.addGlow(arrowTip, px, py, glow, 8, 0.3)
        if (arrowTip < 2) scene.paint(arrowTip, px, py, acc, bevelHeight(arrowTip, 3, 0.72, 0.98), MAT_METAL)
        const fletch = sdPolygon(px, py, [
          [28, 100],
          [26, 90],
          [38, 90],
          [38, 102],
        ])
        if (fletch < 2) scene.paint(fletch, px, py, pri, 0.62, MAT_MATTE)
      }
    }
  }
}

function drawClawOrShurikenOrWrist(
  scene: Scene25d,
  spec: Item25dVisualSpec,
  mode: 'claw' | 'shuriken' | 'wristblade',
) {
  const pri = hexToRgb(spec.primaryHex)
  const acc = hexToRgb(spec.accentHex)
  const glow = hexToRgb(spec.glowHex)
  const steel: Rgb = mixRgb([214, 224, 238], pri, 0.25)

  for (let py = 0; py < SS; py++) {
    for (let px = 0; px < SS; px++) {
      if (mode === 'shuriken') {
        const star1 = sdDiamond(px, py, 64, 64, 42, 12, Math.PI / 4)
        const star2 = sdDiamond(px, py, 64, 64, 42, 12, -Math.PI / 4)
        const star = Math.min(star1, star2)
        const hole = sdCircle(px, py, 64, 64, 9)
        const ring = Math.abs(sdCircle(px, py, 64, 64, 13)) - 3.5
        const finalD = Math.max(star, -hole)
        if (finalD < 2) scene.paint(finalD, px, py, steel, bevelHeight(finalD, 6, 0.35, 0.88), MAT_METAL)
        if (ring < 2) scene.paint(ring, px, py, acc, domeHeight(ring, 3.5, 0.65, 0.96), MAT_METAL)
      } else if (mode === 'claw') {
        // Gauntlet base + 3 curved parallel talons
        const base = sdRoundBox(px, py, 38, 90, 15, 13, 6, -Math.PI / 4)
        if (base < 2) scene.paint(base, px, py, shadeRgb(pri, -0.35), bevelHeight(base, 6, 0.3, 0.72), MAT_WOOD)
        for (let k = -1; k <= 1; k++) {
          const ox = k * 11
          const oy = -k * 11
          const t = sdTaperCapsule(px, py, 44 + ox, 82 + oy, 92 + ox * 0.7, 34 + oy * 0.7, 4.2, 1.0)
          if (t.dist < 6 && spec.element !== 'physical') scene.addGlow(t.dist, px, py, glow, 6, 0.2)
          if (t.dist < 2) scene.paint(t.dist, px, py, steel, domeHeight(t.dist, t.r + 1, 0.5, 0.94), MAT_METAL)
        }
      } else {
        // Wristblade bracer
        const bracer = sdRoundBox(px, py, 44, 84, 18, 12, 5, -Math.PI / 4)
        if (bracer < 2) scene.paint(bracer, px, py, mixRgb([90, 95, 110], pri, 0.4), bevelHeight(bracer, 6, 0.35, 0.78), MAT_METAL)
        const b1 = sdTaperCapsule(px, py, 52, 70, 98, 28, 4.4, 1.1)
        const b2 = sdTaperCapsule(px, py, 58, 76, 102, 42, 4.0, 1.0)
        const b = Math.min(b1.dist, b2.dist)
        if (b < 2) scene.paint(b, px, py, steel, 0.85, MAT_METAL)
      }
    }
  }
}

function drawTome(scene: Scene25d, spec: Item25dVisualSpec) {
  const pri = hexToRgb(spec.primaryHex)
  const acc = hexToRgb(spec.accentHex)
  const glow = hexToRgb(spec.glowHex)
  const cover = shadeRgb(pri, -0.18)
  const gold: Rgb = [242, 192, 68]
  const paper: Rgb = [245, 236, 214]
  const angle = -0.22

  for (let py = 0; py < SS; py++) {
    for (let px = 0; px < SS; px++) {
      // Back cover + pages thickness (2.5D isometric book stack!)
      const backCover = sdRoundBox(px, py, 66, 70, 32, 38, 6, angle)
      if (backCover < 2) scene.paint(backCover, px, py, shadeRgb(cover, -0.35), 0.2, MAT_WOOD)

      const pages = sdRoundBox(px, py, 64, 67, 30, 35, 4, angle)
      if (pages < 2) scene.paint(pages, px, py, paper, 0.38, MAT_MATTE)

      const frontCover = sdRoundBox(px, py, 60, 61, 31, 37, 6, angle)
      if (frontCover < 2) {
        scene.paint(frontCover, px, py, cover, bevelHeight(frontCover, 6, 0.55, 0.86), MAT_WOOD)
      }
      // Spine gold bands
      const spine = sdRoundBox(px, py, 34, 67, 6, 36, 3, angle)
      if (spine < 2) scene.paint(spine, px, py, shadeRgb(cover, -0.25), domeHeight(spine, 6, 0.6, 0.9), MAT_WOOD)

      // Gold corner frame & center arcane sigil gem
      const gem = sdDiamond(px, py, 63, 60, 11, 14, angle)
      if (gem < 10) scene.addGlow(gem, px, py, glow, 10, 0.3)
      if (gem < 2) scene.paint(gem, px, py, acc, bevelHeight(gem, 5, 0.78, 1.0), MAT_GEM)
      const rim = Math.abs(sdCircle(px, py, 63, 60, 15)) - 2
      if (rim < 2) scene.paint(rim, px, py, gold, 0.92, MAT_METAL)
    }
  }
}

function drawPotionOrFlask(scene: Scene25d, spec: Item25dVisualSpec, isBombFlask: boolean) {
  const pri = hexToRgb(spec.primaryHex)
  const acc = hexToRgb(spec.accentHex)
  const glow = hexToRgb(spec.glowHex)
  const glassCol: Rgb = [215, 232, 248]
  const corkCol: Rgb = [180, 124, 72]
  const gold: Rgb = [242, 192, 66]

  for (let py = 0; py < SS; py++) {
    for (let px = 0; px < SS; px++) {
      // Cork or lit fuse
      if (isBombFlask) {
        const fuse = sdCapsule(px, py, 64, 34, 74, 20, 2.2)
        if (fuse < 2) scene.paint(fuse, px, py, corkCol, 0.55, MAT_WOOD)
        const spark = sdCircle(px, py, 76, 18, 5.5)
        if (spark < 10) scene.addGlow(spark, px, py, [255, 190, 60], 10, 0.5)
        if (spark < 2) scene.paint(spark, px, py, [255, 236, 140], 0.95, MAT_EMISSIVE)
      } else {
        const cork = sdRoundBox(px, py, 64, 25, 8.5, 6.5, 2.5)
        if (cork < 2) scene.paint(cork, px, py, corkCol, domeHeight(cork, 7, 0.35, 0.65), MAT_WOOD)
      }

      // Bottle neck & lip
      const neck = sdRoundBox(px, py, 64, 37, 8, 9, 2)
      const lip = sdRoundBox(px, py, 64, 32, 12.5, 3.5, 2)
      const bulb = sdCircle(px, py, 64, 74, 31)
      const bottle = Math.min(neck, lip, bulb)

      if (bottle < 10 && isBombFlask) scene.addGlow(bottle, px, py, glow, 10, 0.25)

      if (bottle < 2) {
        // Glass shell
        const rimShade = glassCol
        scene.paint(bottle, px, py, rimShade, domeHeight(bulb, 31, 0.35, 0.92), MAT_GLASS, 0.94)
      }

      // Glowing liquid inside bottom ~62% of bulb
      const liqClip = Math.max(bulb + 4, 62 - py)
      if (liqClip < 2) {
        const meniscus = Math.abs(py - 62) < 3.5 ? shadeRgb(pri, 0.35) : pri
        scene.paint(liqClip, px, py, meniscus, domeHeight(bulb + 4, 27, 0.45, 0.94), isBombFlask ? MAT_EMISSIVE : MAT_GEM, 0.95)
      }

      // Specular curved glass highlight streak on upper-left of bulb
      const specArc = Math.abs(sdCircle(px, py, 64, 74, 21)) - 2.4
      const specMask = Math.max(specArc, px - 58, py - 74)
      if (specMask < 1.5) {
        scene.paint(specMask, px, py, [255, 255, 255], 0.98, MAT_EMISSIVE, 0.85)
      }

      if (isBombFlask) {
        const collar = sdRoundBox(px, py, 64, 43, 12, 3.5, 2)
        if (collar < 2) scene.paint(collar, px, py, gold, 0.92, MAT_METAL)
        const emblem = sdDiamond(px, py, 64, 76, 7.5, 7.5)
        if (emblem < 2) scene.paint(emblem, px, py, acc, 0.96, MAT_EMISSIVE)
      }
    }
  }
}

function drawArmorOrCloakOrHelm(
  scene: Scene25d,
  spec: Item25dVisualSpec,
  mode: 'armor_plate' | 'armor_robe' | 'armor_leather' | 'cloak' | 'helmet_helm' | 'helmet_hood' | 'helmet_crown',
) {
  const pri = hexToRgb(spec.primaryHex)
  const sec = hexToRgb(spec.secondaryHex)
  const acc = hexToRgb(spec.accentHex)
  const glow = hexToRgb(spec.glowHex)
  const gold: Rgb = [238, 188, 66]

  for (let py = 0; py < SS; py++) {
    for (let px = 0; px < SS; px++) {
      if (mode === 'cloak') {
        const shoulders = sdEllipse(px, py, 64, 38, 30, 14)
        const drape = sdPolygon(px, py, [
          [38, 32],
          [90, 32],
          [104, 96],
          [82, 108],
          [64, 101],
          [46, 108],
          [24, 96],
        ])
        const cape = Math.min(shoulders, drape)
        const collar = sdEllipse(px, py, 64, 27, 21, 10)
        const cowlShadow = sdEllipse(px, py, 64, 30, 14, 6)
        if (cape < 2) {
          const foldWave = Math.sin((px - 64) * 0.22) * Math.max(0, (py - 32) / 70)
          const col = shadeRgb(pri, foldWave * 0.22)
          const h = bevelHeight(cape, 16, 0.32, 0.84) + foldWave * 0.14
          scene.paint(cape, px, py, col, h, MAT_MATTE)
          if (py > 94 && cape < -1) {
            scene.paint(cape, px, py, mixRgb(gold, acc, 0.25), h + 0.04, MAT_METAL, 0.72)
          }
        }
        if (collar < 2) {
          scene.paint(collar, px, py, shadeRgb(pri, -0.18), domeHeight(collar, 12, 0.62, 0.9), MAT_MATTE)
        }
        if (cowlShadow < 2) {
          scene.paint(cowlShadow, px, py, shadeRgb(pri, -0.52), 0.35, MAT_MATTE)
        }
        const claspRim = sdCircle(px, py, 64, 38, 7.5)
        if (claspRim < 2) scene.paint(claspRim, px, py, gold, domeHeight(claspRim, 7.5, 0.76, 0.96), MAT_METAL)
        const claspGem = sdDiamond(px, py, 64, 38, 4.2, 4.8)
        if (claspGem < 2) scene.paint(claspGem, px, py, acc, 1.0, MAT_GEM)
      } else if (mode === 'helmet_crown') {
        const band = sdRoundBox(px, py, 64, 82, 32, 10, 4)
        const sp1 = sdPolygon(px, py, [[34, 78], [30, 42], [48, 68]])
        const sp2 = sdPolygon(px, py, [[50, 76], [64, 26], [78, 76]])
        const sp3 = sdPolygon(px, py, [[80, 68], [98, 42], [94, 78]])
        const crown = Math.min(band, sp1, sp2, sp3)
        if (crown < 8) scene.addGlow(crown, px, py, glow, 8, 0.25)
        if (crown < 2) scene.paint(crown, px, py, mixRgb(gold, pri, 0.35), bevelHeight(crown, 6, 0.45, 0.94), MAT_METAL)
        const gem = sdDiamond(px, py, 64, 68, 7, 10)
        if (gem < 2) scene.paint(gem, px, py, acc, 0.98, MAT_GEM)
      } else if (mode === 'helmet_hood') {
        const hood = sdCircle(px, py, 64, 58, 34)
        const capeTail = sdPolygon(px, py, [[30, 62], [98, 62], [104, 104], [24, 104]])
        const hole = sdCircle(px, py, 64, 62, 19)
        const cowl = Math.min(hood, capeTail)
        if (cowl < 2) scene.paint(cowl, px, py, pri, domeHeight(cowl, 22, 0.3, 0.82), MAT_MATTE)
        if (hole < 2) scene.paint(hole, px, py, [16, 18, 30], 0.18, MAT_MATTE)
        const headband = sdRoundBox(px, py, 64, 46, 26, 4.5, 2)
        if (headband < 2) scene.paint(headband, px, py, acc, 0.88, MAT_METAL)
      } else if (mode === 'helmet_helm') {
        const dome = sdCircle(px, py, 64, 58, 32)
        const cheek = sdRoundBox(px, py, 64, 74, 28, 22, 6)
        const helm = Math.min(dome, cheek)
        const visor = sdRoundBox(px, py, 64, 68, 17, 5, 2)
        if (helm < 2) scene.paint(helm, px, py, mixRgb([188, 198, 214], pri, 0.3), domeHeight(helm, 24, 0.35, 0.92), MAT_METAL)
        if (visor < 2) scene.paint(visor, px, py, [16, 20, 32], 0.2, MAT_MATTE)
        const crest = sdCapsule(px, py, 64, 20, 64, 52, 4.2)
        if (crest < 2) scene.paint(crest, px, py, gold, domeHeight(crest, 4, 0.72, 0.98), MAT_METAL)
      } else {
        // Chest armor / robe / leather
        const isPlate = mode === 'armor_plate'
        const mat = isPlate ? MAT_METAL : mode === 'armor_leather' ? MAT_WOOD : MAT_MATTE
        const body = sdPolygon(px, py, [
          [38, 28],
          [90, 28],
          [96, 54],
          [84, 102],
          [44, 102],
          [32, 54],
        ])
        const pLeft = sdEllipse(px, py, 32, 42, 16, 13)
        const pRight = sdEllipse(px, py, 96, 42, 16, 13)
        const neck = sdCircle(px, py, 64, 24, 13)
        const torso = Math.max(Math.min(body, pLeft, pRight), -neck)
        if (torso < 2) {
          const isLowTierSteel = isPlate && spec.element === 'physical' && spec.tier <= 2
          const base = isPlate
            ? isLowTierSteel
              ? mixRgb([188, 200, 218], pri, 0.35)
              : mixRgb(pri, [215, 224, 238], 0.16)
            : pri
          const ridge = isPlate ? Math.max(0, 1 - Math.abs(px - 64) / 16) * 0.08 : 0
          scene.paint(torso, px, py, base, bevelHeight(torso, 18, 0.35, 0.88) + ridge, mat)
          if (isPlate && Math.min(pLeft, pRight) < 1 && Math.min(pLeft, pRight) > -3.5) {
            scene.paint(Math.min(pLeft, pRight), px, py, gold, 0.9, MAT_METAL, 0.85)
          }
        }
        // Center belt & chest crest
        const belt = sdRoundBox(px, py, 64, 80, 23, 5, 2)
        if (belt < 2) scene.paint(belt, px, py, shadeRgb(sec, -0.25), 0.78, MAT_WOOD)
        const buckle = sdRoundBox(px, py, 64, 80, 7, 6, 2)
        if (buckle < 2) scene.paint(buckle, px, py, gold, 0.92, MAT_METAL)
        const crest = sdDiamond(px, py, 64, 54, 9, 11)
        if (crest < 2) scene.paint(crest, px, py, acc, 0.95, MAT_GEM)
      }
    }
  }
}

function drawShield(scene: Scene25d, spec: Item25dVisualSpec, style: 'wood' | 'steel' | 'serpent' | 'dark') {
  const pri = hexToRgb(spec.primaryHex)
  const acc = hexToRgb(spec.accentHex)
  const glow = hexToRgb(spec.glowHex)
  const bodyCol: Rgb =
    style === 'wood'
      ? [145, 92, 50]
      : style === 'serpent'
        ? [34, 135, 86]
        : style === 'dark'
          ? [68, 42, 108]
          : mixRgb([145, 165, 194], pri, 0.35)
  const rimCol: Rgb = style === 'dark' ? [168, 85, 247] : [232, 186, 68]

  for (let py = 0; py < SS; py++) {
    for (let px = 0; px < SS; px++) {
      const shield = sdPolygon(px, py, [
        [28, 26],
        [100, 26],
        [98, 66],
        [64, 106],
        [30, 66],
      ])
      if (shield < 8 && style === 'dark') scene.addGlow(shield, px, py, glow, 8, 0.25)
      if (shield < 2) {
        const inner = shield < -8
        const col = inner ? bodyCol : rimCol
        const mat = !inner || style !== 'wood' ? MAT_METAL : MAT_WOOD
        // Domed 3D kite shield!
        scene.paint(shield, px, py, col, domeHeight(shield, 34, 0.35, 0.92), mat)
      }
      const boss = sdCircle(px, py, 64, 60, 12)
      if (boss < 2) scene.paint(boss, px, py, rimCol, domeHeight(boss, 12, 0.78, 1.0), MAT_METAL)
      const gem = sdDiamond(px, py, 64, 60, 6, 8)
      if (gem < 2) scene.paint(gem, px, py, acc, 1.0, MAT_GEM)
    }
  }
}

function drawBootsOrGloves(scene: Scene25d, spec: Item25dVisualSpec, isBoots: boolean) {
  const pri = hexToRgb(spec.primaryHex)
  const gold: Rgb = [232, 182, 62]
  const baseCol = spec.tier >= 4 ? mixRgb([150, 165, 188], pri, 0.45) : mixRgb([124, 78, 44], pri, 0.45)

  for (let py = 0; py < SS; py++) {
    for (let px = 0; px < SS; px++) {
      if (isBoots) {
        const shaft = sdRoundBox(px, py, 50, 56, 15, 28, 6, -0.06)
        const foot = sdRoundBox(px, py, 68, 86, 26, 13, 8, 0.04)
        const boot = Math.min(shaft, foot)
        if (boot < 2) scene.paint(boot, px, py, baseCol, bevelHeight(boot, 14, 0.3, 0.85), MAT_WOOD)
        const sole = sdRoundBox(px, py, 68, 98, 28, 5, 3)
        if (sole < 2) scene.paint(sole, px, py, [38, 30, 28], 0.45, MAT_MATTE)
        const cuff = sdRoundBox(px, py, 49, 32, 18, 7, 3, -0.06)
        if (cuff < 2) scene.paint(cuff, px, py, gold, bevelHeight(cuff, 5, 0.55, 0.92), MAT_METAL)
      } else {
        const palm = sdRoundBox(px, py, 64, 74, 22, 22, 8)
        const thumb = sdCapsule(px, py, 42, 74, 30, 58, 7)
        const f1 = sdCapsule(px, py, 50, 52, 50, 30, 5.5)
        const f2 = sdCapsule(px, py, 64, 48, 64, 24, 5.5)
        const f3 = sdCapsule(px, py, 78, 52, 78, 30, 5.5)
        const glove = Math.min(palm, thumb, f1, f2, f3)
        if (glove < 2) scene.paint(glove, px, py, baseCol, bevelHeight(glove, 12, 0.35, 0.86), MAT_METAL)
        const cuff = sdRoundBox(px, py, 64, 96, 22, 7, 3)
        if (cuff < 2) scene.paint(cuff, px, py, gold, 0.88, MAT_METAL)
      }
    }
  }
}

function drawRingOrNecklaceOrCharm(
  scene: Scene25d,
  spec: Item25dVisualSpec,
  mode: 'ring' | 'necklace' | 'earring' | 'charm',
) {
  const pri = hexToRgb(spec.primaryHex)
  const acc = hexToRgb(spec.accentHex)
  const glow = hexToRgb(spec.glowHex)
  const gold: Rgb = [244, 194, 68]

  for (let py = 0; py < SS; py++) {
    for (let px = 0; px < SS; px++) {
      if (mode === 'ring') {
        const outer = sdEllipse(px, py, 64, 70, 30, 22)
        const inner = sdEllipse(px, py, 64, 70, 19, 13)
        const band = Math.max(outer, -inner)
        if (band < 2) scene.paint(band, px, py, gold, domeHeight(band, 7, 0.35, 0.86), MAT_METAL)
        const bezel = sdCircle(px, py, 64, 44, 14)
        if (bezel < 2) scene.paint(bezel, px, py, gold, domeHeight(bezel, 14, 0.65, 0.92), MAT_METAL)
        const gem = sdDiamond(px, py, 64, 44, 11, 11)
        if (gem < 10) scene.addGlow(gem, px, py, glow, 10, 0.35)
        if (gem < 2) scene.paint(gem, px, py, mixRgb(pri, acc, 0.4), bevelHeight(gem, 6, 0.8, 1.0), MAT_GEM)
      } else if (mode === 'necklace') {
        const chain = Math.abs(sdCircle(px, py, 64, 48, 32)) - 3.2
        const chainMask = Math.max(chain, 22 - py, py - 74)
        if (chainMask < 2) scene.paint(chainMask, px, py, gold, domeHeight(chainMask, 3.2, 0.4, 0.78), MAT_METAL)
        const frame = sdCircle(px, py, 64, 84, 18)
        if (frame < 2) scene.paint(frame, px, py, gold, domeHeight(frame, 18, 0.5, 0.88), MAT_METAL)
        const gem = sdDiamond(px, py, 64, 84, 13, 15)
        if (gem < 10) scene.addGlow(gem, px, py, glow, 10, 0.35)
        if (gem < 2) scene.paint(gem, px, py, mixRgb(pri, acc, 0.35), bevelHeight(gem, 7, 0.76, 1.0), MAT_GEM)
      } else if (mode === 'earring') {
        const crescent = Math.max(sdCircle(px, py, 64, 62, 26), -sdCircle(px, py, 74, 56, 21))
        if (crescent < 8) scene.addGlow(crescent, px, py, glow, 8, 0.25)
        if (crescent < 2) scene.paint(crescent, px, py, gold, domeHeight(crescent, 10, 0.45, 0.92), MAT_METAL)
        const gem = sdCircle(px, py, 56, 86, 7.5)
        if (gem < 2) scene.paint(gem, px, py, acc, domeHeight(gem, 7.5, 0.75, 0.98), MAT_GEM)
      } else {
        // Charm / talisman
        const cord = sdCapsule(px, py, 64, 18, 64, 34, 2.5)
        if (cord < 2) scene.paint(cord, px, py, [220, 68, 72], 0.45, MAT_MATTE)
        const tablet = sdRoundBox(px, py, 64, 68, 24, 32, 8)
        if (tablet < 8) scene.addGlow(tablet, px, py, glow, 8, 0.25)
        if (tablet < 2) scene.paint(tablet, px, py, pri, bevelHeight(tablet, 8, 0.42, 0.88), MAT_GEM)
        const sigil = Math.abs(sdCircle(px, py, 64, 68, 13)) - 2.5
        if (sigil < 2) scene.paint(sigil, px, py, acc, 0.95, MAT_EMISSIVE)
      }
    }
  }
}

function drawScrollOrTicketOrBag(
  scene: Scene25d,
  spec: Item25dVisualSpec,
  mode: 'scroll' | 'ticket' | 'bag' | 'chest_box' | 'key' | 'crystal' | 'orb' | 'emblem' | 'magnet',
) {
  const pri = hexToRgb(spec.primaryHex)
  const acc = hexToRgb(spec.accentHex)
  const glow = hexToRgb(spec.glowHex)
  const gold: Rgb = [244, 192, 66]
  const paper: Rgb = [244, 232, 200]

  for (let py = 0; py < SS; py++) {
    for (let px = 0; px < SS; px++) {
      if (mode === 'scroll') {
        const body = sdRoundBox(px, py, 64, 64, 26, 32, 4, -0.35)
        if (body < 2) scene.paint(body, px, py, paper, bevelHeight(body, 8, 0.35, 0.75), MAT_MATTE)
        const topRoll = sdCapsule(px, py, 36, 44, 78, 28, 7.5)
        const botRoll = sdCapsule(px, py, 50, 98, 92, 82, 7.5)
        const rolls = Math.min(topRoll, botRoll)
        if (rolls < 2) scene.paint(rolls, px, py, shadeRgb(paper, -0.1), domeHeight(rolls, 7.5, 0.5, 0.88), MAT_MATTE)
        const ribbon = sdRoundBox(px, py, 64, 64, 27, 5, 2, -0.35)
        if (ribbon < 2) scene.paint(ribbon, px, py, pri, 0.84, MAT_MATTE)
        const seal = sdCircle(px, py, 64, 64, 7.5)
        if (seal < 2) scene.paint(seal, px, py, acc, domeHeight(seal, 7.5, 0.75, 0.98), MAT_GEM)
      } else if (mode === 'ticket') {
        const card = sdRoundBox(px, py, 64, 64, 38, 24, 5, -0.22)
        if (card < 2) scene.paint(card, px, py, pri, bevelHeight(card, 6, 0.42, 0.86), MAT_METAL)
        const stripe = sdRoundBox(px, py, 64, 64, 32, 18, 3, -0.22)
        if (stripe < 2 && Math.abs(stripe) < 3) scene.paint(stripe, px, py, gold, 0.9, MAT_METAL)
        const crown = sdDiamond(px, py, 64, 64, 11, 11, -0.22)
        if (crown < 2) scene.paint(crown, px, py, acc, 0.96, MAT_GEM)
      } else if (mode === 'bag') {
        const sack = sdCircle(px, py, 64, 74, 29)
        const neck = sdPolygon(px, py, [[46, 30], [82, 30], [74, 50], [54, 50]])
        const bag = Math.min(sack, neck)
        if (bag < 2) scene.paint(bag, px, py, pri, domeHeight(bag, 24, 0.3, 0.86), MAT_WOOD)
        const tie = sdRoundBox(px, py, 64, 48, 13, 4, 2)
        if (tie < 2) scene.paint(tie, px, py, gold, 0.92, MAT_METAL)
      } else if (mode === 'chest_box') {
        const box = sdRoundBox(px, py, 64, 72, 34, 24, 6)
        const lid = sdRoundBox(px, py, 64, 48, 36, 16, 8)
        if (box < 2) scene.paint(box, px, py, pri, bevelHeight(box, 10, 0.35, 0.8), MAT_WOOD)
        if (lid < 2) scene.paint(lid, px, py, shadeRgb(pri, 0.14), domeHeight(lid, 16, 0.5, 0.9), MAT_WOOD)
        const lock = sdRoundBox(px, py, 64, 64, 8, 9, 2)
        if (lock < 2) scene.paint(lock, px, py, gold, 0.96, MAT_METAL)
      } else if (mode === 'key') {
        const bow = Math.max(sdCircle(px, py, 40, 88, 17), -sdCircle(px, py, 40, 88, 8))
        const shaft = sdCapsule(px, py, 50, 78, 96, 32, 4.2)
        const bit1 = sdRoundBox(px, py, 86, 48, 7, 4, 1.5, Math.PI / 4)
        const bit2 = sdRoundBox(px, py, 94, 40, 5, 4, 1.5, Math.PI / 4)
        const keyD = Math.min(bow, shaft, bit1, bit2)
        if (keyD < 2) scene.paint(keyD, px, py, gold, domeHeight(keyD, 5, 0.45, 0.94), MAT_METAL)
        const gem = sdCircle(px, py, 40, 88, 5)
        if (gem < 2) scene.paint(gem, px, py, acc, 0.98, MAT_GEM)
      } else if (mode === 'orb' || mode === 'emblem') {
        const orb = sdCircle(px, py, 64, 64, 30)
        if (orb < 12) scene.addGlow(orb, px, py, glow, 12, 0.4)
        if (orb < 2) {
          scene.paint(orb, px, py, pri, domeHeight(orb, 30, 0.35, 1.0), mode === 'emblem' ? MAT_METAL : MAT_GEM)
        }
        const core = sdDiamond(px, py, 64, 64, 14, 14)
        if (core < 2) scene.paint(core, px, py, acc, 0.98, MAT_EMISSIVE)
      } else if (mode === 'magnet') {
        const arch = Math.max(sdCircle(px, py, 64, 64, 32), -sdCircle(px, py, 64, 64, 16), py - 76)
        const legL = sdRoundBox(px, py, 40, 84, 8, 14, 2)
        const legR = sdRoundBox(px, py, 88, 84, 8, 14, 2)
        const mag = Math.min(arch, legL, legR)
        if (mag < 2) {
          const isTip = py > 80
          scene.paint(mag, px, py, isTip ? [224, 232, 245] : pri, domeHeight(mag, 8, 0.4, 0.88), MAT_METAL)
        }
      } else {
        // Crystal / stone
        const mainC = sdPolygon(px, py, [[64, 20], [92, 52], [80, 102], [48, 102], [36, 52]])
        const sideC = sdPolygon(px, py, [[30, 56], [46, 46], [52, 98], [26, 94]])
        const sideR = sdPolygon(px, py, [[82, 46], [98, 58], [102, 94], [76, 98]])
        const cry = Math.min(mainC, sideC, sideR)
        if (cry < 10) scene.addGlow(cry, px, py, glow, 10, 0.35)
        if (cry < 2) {
          const facet = px < 64 ? shadeRgb(pri, 0.18) : shadeRgb(pri, -0.18)
          scene.paint(cry, px, py, facet, bevelHeight(cry, 16, 0.4, 0.98), MAT_GEM)
        }
      }
    }
  }
}

function drawMaterialOrFood(
  scene: Scene25d,
  spec: Item25dVisualSpec,
  mode: 'ore' | 'herb' | 'fish' | 'food_bowl' | 'food_platter' | 'gel' | 'mushroom' | 'ectoplasm' | 'fang' | 'horn' | 'bone' | 'cloth' | 'scrap',
) {
  const pri = hexToRgb(spec.primaryHex)
  const acc = hexToRgb(spec.accentHex)
  const glow = hexToRgb(spec.glowHex)

  for (let py = 0; py < SS; py++) {
    for (let px = 0; px < SS; px++) {
      if (mode === 'ore') {
        const rock = sdPolygon(px, py, [[34, 46], [62, 26], [96, 42], [98, 86], [58, 102], [28, 82]])
        if (rock < 2) scene.paint(rock, px, py, [92, 102, 118], bevelHeight(rock, 14, 0.3, 0.85), MAT_MATTE)
        const v1 = sdDiamond(px, py, 56, 56, 10, 14, 0.3)
        const v2 = sdDiamond(px, py, 76, 68, 9, 12, -0.4)
        const vein = Math.min(v1, v2)
        if (vein < 2) scene.paint(vein, px, py, pri, 0.94, MAT_GEM)
      } else if (mode === 'herb') {
        const stem = sdCapsule(px, py, 64, 102, 64, 48, 3.2)
        const l1 = sdEllipse(px, py, 46, 66, 20, 11)
        const l2 = sdEllipse(px, py, 82, 62, 20, 11)
        const top = sdCircle(px, py, 64, 38, 14)
        const herb = Math.min(stem, l1, l2, top)
        if (herb < 2) scene.paint(herb, px, py, pri, domeHeight(herb, 12, 0.35, 0.86), MAT_MATTE)
      } else if (mode === 'fish' || mode === 'food_platter') {
        const body = sdEllipse(px, py, 62, 64, 32, 17)
        const tail = sdPolygon(px, py, [[90, 64], [108, 46], [108, 82]])
        const fish = Math.min(body, tail)
        if (fish < 2) scene.paint(fish, px, py, pri, domeHeight(fish, 16, 0.35, 0.9), mode === 'fish' ? MAT_METAL : MAT_MATTE)
        const eye = sdCircle(px, py, 42, 60, 3.2)
        if (eye < 2) scene.paint(eye, px, py, [20, 24, 34], 0.95, MAT_GLASS)
      } else if (mode === 'food_bowl') {
        const bowl = Math.max(sdCircle(px, py, 64, 62, 34), 60 - py)
        const soup = sdEllipse(px, py, 64, 60, 32, 12)
        if (bowl < 2) scene.paint(bowl, px, py, [180, 82, 54], domeHeight(bowl, 24, 0.3, 0.82), MAT_MATTE)
        if (soup < 2) scene.paint(soup, px, py, pri, 0.65, MAT_GLASS)
      } else if (mode === 'mushroom') {
        const stem = sdRoundBox(px, py, 64, 82, 13, 18, 5)
        const cap = Math.max(sdEllipse(px, py, 64, 58, 34, 24), py - 66)
        if (stem < 2) scene.paint(stem, px, py, [242, 232, 210], domeHeight(stem, 13, 0.3, 0.72), MAT_MATTE)
        if (cap < 2) scene.paint(cap, px, py, pri, domeHeight(cap, 24, 0.45, 0.95), MAT_MATTE)
        const spot = sdCircle(px, py, 52, 48, 5.5)
        if (spot < 2) scene.paint(spot, px, py, [252, 248, 240], 0.96, MAT_MATTE)
      } else if (mode === 'gel' || mode === 'ectoplasm') {
        const blob = sdEllipse(px, py, 64, 72, 29, 25)
        if (blob < 10) scene.addGlow(blob, px, py, glow, 10, 0.3)
        if (blob < 2) scene.paint(blob, px, py, pri, domeHeight(blob, 26, 0.35, 0.96), MAT_GLASS, 0.92)
      } else if (mode === 'fang' || mode === 'horn') {
        const t = sdTaperCapsule(px, py, 36, 30, 86, 98, 12, 2)
        if (t.dist < 2) scene.paint(t.dist, px, py, pri, domeHeight(t.dist, t.r + 2, 0.35, 0.92), MAT_MATTE)
      } else if (mode === 'bone') {
        const shaft = sdCapsule(px, py, 34, 94, 94, 34, 7)
        const k1 = sdCircle(px, py, 30, 90, 9)
        const k2 = sdCircle(px, py, 38, 98, 9)
        const k3 = sdCircle(px, py, 90, 30, 9)
        const k4 = sdCircle(px, py, 98, 38, 9)
        const b = Math.min(shaft, k1, k2, k3, k4)
        if (b < 2) scene.paint(b, px, py, pri, domeHeight(b, 8, 0.35, 0.84), MAT_MATTE)
      } else {
        // cloth / scrap
        const rag = sdRoundBox(px, py, 64, 64, 28, 22, 6, 0.25)
        if (rag < 2) scene.paint(rag, px, py, pri, bevelHeight(rag, 10, 0.3, 0.78), mode === 'scrap' ? MAT_METAL : MAT_MATTE)
      }
    }
  }
}

function renderSceneTo64Rgba(scene: Scene25d, spec: Item25dVisualSpec): Uint8Array {
  const litR = new Float32Array(SS * SS)
  const litG = new Float32Array(SS * SS)
  const litB = new Float32Array(SS * SS)
  const litA = new Float32Array(SS * SS)

  // Key light (-0.55, -0.68, 0.48), Half vector H1 = normalize(L1 + (0,0,1))
  const lx = -0.55, ly = -0.68, lz = 0.48
  const hx = lx, hy = ly, hz = lz + 1
  const hLen = Math.hypot(hx, hy, hz)
  const hnx = hx / hLen, hny = hy / hLen, hnz = hz / hLen
  const glowRgb = hexToRgb(spec.glowHex)

  // Step 1: 2.5D normal-mapped lighting + outline + drop shadow at 128x128
  for (let py = 0; py < SS; py++) {
    for (let px = 0; px < SS; px++) {
      const idx = py * SS + px
      const cov = scene.a[idx]

      if (cov > 0.02) {
        const zL = scene.z[py * SS + Math.max(0, px - 1)]
        const zR = scene.z[py * SS + Math.min(SS - 1, px + 1)]
        const zU = scene.z[Math.max(0, py - 1) * SS + px]
        const zD = scene.z[Math.min(SS - 1, py + 1) * SS + px]
        const nx = (zL - zR) * 6.5
        const ny = (zU - zD) * 6.5
        const nz = 1.0
        const nLen = Math.hypot(nx, ny, nz)
        const ux = nx / nLen, uy = ny / nLen, uz = nz / nLen

        const ndotl = Math.max(0, ux * lx + uy * ly + uz * lz)
        const ndoth = Math.max(0, ux * hnx + uy * hny + uz * hnz)
        const bounce = Math.max(0, ux * 0.5 + uy * 0.65 + uz * 0.35)
        const m = scene.mat[idx]

        let diff = 0.46 + 0.64 * ndotl + 0.16 * bounce
        let specPow = 16
        let specAmt = 0.15
        if (m === MAT_METAL) {
          diff = 0.34 + 0.72 * ndotl + 0.22 * bounce + 0.14 * clamp01(0.5 - uy * 0.6)
          specPow = 42
          specAmt = 0.72
        } else if (m === MAT_GEM) {
          diff = 0.45 + 0.62 * ndotl + 0.25 * bounce
          specPow = 54
          specAmt = 0.85
        } else if (m === MAT_GLASS) {
          diff = 0.55 + 0.45 * ndotl
          specPow = 64
          specAmt = 0.92
        } else if (m === MAT_WOOD) {
          diff = 0.42 + 0.62 * ndotl + 0.12 * bounce
          specPow = 14
          specAmt = 0.2
        } else if (m === MAT_EMISSIVE) {
          diff = 1.08
          specPow = 24
          specAmt = 0.35
        }

        const sp = Math.pow(ndoth, specPow) * specAmt
        const r = Math.min(255, scene.r[idx] * diff + 255 * sp + glowRgb[0] * scene.glow[idx] * 0.22)
        const g = Math.min(255, scene.g[idx] * diff + 255 * sp + glowRgb[1] * scene.glow[idx] * 0.22)
        const b = Math.min(255, scene.b[idx] * diff + 255 * sp + glowRgb[2] * scene.glow[idx] * 0.22)

        litR[idx] = r
        litG[idx] = g
        litB[idx] = b
        litA[idx] = cov
      }
    }
  }

  // Step 2: Crisp dark rim outline + 2.5D contact drop shadow behind subject
  const compR = new Float32Array(SS * SS)
  const compG = new Float32Array(SS * SS)
  const compB = new Float32Array(SS * SS)
  const compA = new Float32Array(SS * SS)

  for (let py = 0; py < SS; py++) {
    for (let px = 0; px < SS; px++) {
      const idx = py * SS + px
      // Contact shadow offset (-4, -6) in source space -> shifted (+4, +6)
      const sx = px - 4
      const sy = py - 6
      let shadowA = 0
      if (sx >= 1 && sx < SS - 1 && sy >= 1 && sy < SS - 1) {
        shadowA =
          (scene.a[sy * SS + sx] * 0.4 +
            scene.a[sy * SS + sx - 1] * 0.15 +
            scene.a[sy * SS + sx + 1] * 0.15 +
            scene.a[(sy - 1) * SS + sx] * 0.15 +
            scene.a[(sy + 1) * SS + sx] * 0.15) *
          0.42
      }

      // 2px dark contour around silhouette
      let maxNeighborA = 0
      for (let dy = -2; dy <= 2; dy++) {
        const ny = py + dy
        if (ny < 0 || ny >= SS) continue
        for (let dx = -2; dx <= 2; dx++) {
          if (dx * dx + dy * dy > 5) continue
          const nx = px + dx
          if (nx < 0 || nx >= SS) continue
          maxNeighborA = Math.max(maxNeighborA, scene.a[ny * SS + nx])
        }
      }
      const outlineA = clamp01((maxNeighborA - scene.a[idx]) * 0.92)

      // Composite order: shadow -> dark outline -> foreground lit pixel
      let cr = 6, cg = 9, cb = 18, ca = shadowA
      if (outlineA > 0.01) {
        const outColR = 14, outColG = 18, outColB = 34
        const newA = outlineA + ca * (1 - outlineA)
        if (newA > 0) {
          cr = (outColR * outlineA + cr * ca * (1 - outlineA)) / newA
          cg = (outColG * outlineA + cg * ca * (1 - outlineA)) / newA
          cb = (outColB * outlineA + cb * ca * (1 - outlineA)) / newA
          ca = newA
        }
      }
      const fgA = litA[idx]
      if (fgA > 0.005) {
        const newA = fgA + ca * (1 - fgA)
        if (newA > 0) {
          cr = (litR[idx] * fgA + cr * ca * (1 - fgA)) / newA
          cg = (litG[idx] * fgA + cg * ca * (1 - fgA)) / newA
          cb = (litB[idx] * fgA + cb * ca * (1 - fgA)) / newA
          ca = newA
        }
      }

      compR[idx] = cr
      compG[idx] = cg
      compB[idx] = cb
      compA[idx] = ca
    }
  }

  // Step 3: Premultiplied 2x2 downsample to crisp 64x64 RGBA
  const out = new Uint8Array(OUT * OUT * 4)
  for (let y = 0; y < OUT; y++) {
    for (let x = 0; x < OUT; x++) {
      let sumR = 0, sumG = 0, sumB = 0, sumA = 0
      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const i = (y * 2 + sy) * SS + (x * 2 + sx)
          const a = compA[i]
          sumR += compR[i] * a
          sumG += compG[i] * a
          sumB += compB[i] * a
          sumA += a
        }
      }
      const avgA = sumA * 0.25
      const o = (y * OUT + x) * 4
      if (avgA > 0.004) {
        out[o] = Math.max(0, Math.min(255, Math.round(sumR / sumA)))
        out[o + 1] = Math.max(0, Math.min(255, Math.round(sumG / sumA)))
        out[o + 2] = Math.max(0, Math.min(255, Math.round(sumB / sumA)))
        out[o + 3] = Math.max(0, Math.min(255, Math.round(avgA * 255)))
      }
    }
  }

  return out
}

function dispatchArchetype(scene: Scene25d, spec: Item25dVisualSpec) {
  const arch: Item25dArchetype = spec.archetype
  switch (arch) {
    case 'sword':
    case 'greatsword':
    case 'katana':
    case 'dagger':
      return drawSwordLike(scene, spec, arch)
    case 'staff':
      return drawStaff(scene, spec)
    case 'tome':
    case 'tome_item':
      return drawTome(scene, spec)
    case 'hammer':
      return drawHammerOrClub(scene, spec, true)
    case 'club':
      return drawHammerOrClub(scene, spec, false)
    case 'bow':
      return drawBow(scene, spec, false)
    case 'crossbow':
      return drawBow(scene, spec, true)
    case 'claw':
    case 'shuriken':
    case 'wristblade':
      return drawClawOrShurikenOrWrist(scene, spec, arch)
    case 'flask_bomb':
      return drawPotionOrFlask(scene, spec, true)
    case 'potion':
      return drawPotionOrFlask(scene, spec, false)
    case 'armor_plate':
    case 'armor_robe':
    case 'armor_leather':
    case 'cloak':
    case 'helmet_helm':
    case 'helmet_hood':
    case 'helmet_crown':
      return drawArmorOrCloakOrHelm(scene, spec, arch)
    case 'shield_wood':
      return drawShield(scene, spec, 'wood')
    case 'shield_steel':
      return drawShield(scene, spec, 'steel')
    case 'shield_serpent':
      return drawShield(scene, spec, 'serpent')
    case 'shield_dark':
      return drawShield(scene, spec, 'dark')
    case 'boots':
      return drawBootsOrGloves(scene, spec, true)
    case 'gloves':
      return drawBootsOrGloves(scene, spec, false)
    case 'ring':
    case 'necklace':
    case 'earring':
    case 'charm':
      return drawRingOrNecklaceOrCharm(scene, spec, arch)
    case 'scroll':
    case 'ticket':
    case 'bag':
    case 'chest_box':
    case 'key':
    case 'crystal':
    case 'orb':
    case 'emblem':
    case 'magnet':
      return drawScrollOrTicketOrBag(scene, spec, arch)
    default:
      return drawMaterialOrFood(scene, spec, arch)
  }
}

export function rasterizeItem25dRgba64(spec: Item25dVisualSpec): Uint8Array {
  const scene = new Scene25d()
  dispatchArchetype(scene, spec)
  return renderSceneTo64Rgba(scene, spec)
}
