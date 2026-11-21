import { normalizeJobId, type JobId, type WeaponType } from './data'

export type JobAttackStyle =
  | 'sword_slash'
  | 'katana_iaijutsu'
  | 'dagger_cross'
  | 'fist_punch'
  | 'bow_shoot'
  | 'staff_cast'
  | 'alchemy_toss'
  | 'ninja_throw'

export interface JobMeshProfile {
  neckY: number
  shoulderY: number
  waistY: number
  bootY0: number
  bootMinX: number
  legSplitX: number
  bootMaxX: number
  seamLeftX: number
  seamRightX: number
  weaponSide: 'right' | 'left' | 'both'
  attackStyle: JobAttackStyle
  capeWaveScale: number
}

const RIG_SIZE = 256
const STRIP_ROWS = 27 // covers y = 0 .. 216 cleanly (8px per strip)
const BOOT_Y_DEFAULT = 216

export const JOB_MESH_PROFILES: Record<JobId, JobMeshProfile> = {
  novice: {
    neckY: 98,
    shoulderY: 112,
    waistY: 168,
    bootY0: 216,
    bootMinX: 60,
    legSplitX: 148,
    bootMaxX: 224,
    seamLeftX: 74,
    seamRightX: 174,
    weaponSide: 'right',
    attackStyle: 'sword_slash',
    capeWaveScale: 1.1,
  },
  swordsman: {
    neckY: 94,
    shoulderY: 108,
    waistY: 168,
    bootY0: 216,
    bootMinX: 68,
    legSplitX: 136,
    bootMaxX: 228,
    seamLeftX: 76,
    seamRightX: 174,
    weaponSide: 'right',
    attackStyle: 'sword_slash',
    capeWaveScale: 1.15,
  },
  mage: {
    neckY: 100,
    shoulderY: 116,
    waistY: 168,
    bootY0: 216,
    bootMinX: 72,
    legSplitX: 130,
    bootMaxX: 180,
    seamLeftX: 76,
    seamRightX: 174,
    weaponSide: 'right',
    attackStyle: 'staff_cast',
    capeWaveScale: 0.75,
  },
  archer: {
    neckY: 105,
    shoulderY: 118,
    waistY: 168,
    bootY0: 216,
    bootMinX: 44,
    legSplitX: 122,
    bootMaxX: 202,
    seamLeftX: 74,
    seamRightX: 162,
    weaponSide: 'right',
    attackStyle: 'bow_shoot',
    capeWaveScale: 1.05,
  },
  cleric: {
    neckY: 96,
    shoulderY: 112,
    waistY: 168,
    bootY0: 216,
    bootMinX: 64,
    legSplitX: 136,
    bootMaxX: 194,
    seamLeftX: 72,
    seamRightX: 182,
    weaponSide: 'right',
    attackStyle: 'staff_cast',
    capeWaveScale: 0.85,
  },
  merchant: {
    neckY: 96,
    shoulderY: 112,
    waistY: 166,
    bootY0: 216,
    bootMinX: 48,
    legSplitX: 124,
    bootMaxX: 192,
    seamLeftX: 82,
    seamRightX: 164,
    weaponSide: 'right',
    attackStyle: 'alchemy_toss',
    capeWaveScale: 0.4,
  },
  thief: {
    neckY: 96,
    shoulderY: 112,
    waistY: 168,
    bootY0: 216,
    bootMinX: 38,
    legSplitX: 138,
    bootMaxX: 236,
    seamLeftX: 76,
    seamRightX: 170,
    weaponSide: 'both',
    attackStyle: 'dagger_cross',
    capeWaveScale: 1.1,
  },
  kensei: {
    neckY: 98,
    shoulderY: 114,
    waistY: 164,
    bootY0: 216,
    bootMinX: 48,
    legSplitX: 134,
    bootMaxX: 212,
    seamLeftX: 74,
    seamRightX: 168,
    weaponSide: 'right',
    attackStyle: 'katana_iaijutsu',
    capeWaveScale: 0.95,
  },
  iron_fist: {
    neckY: 108,
    shoulderY: 120,
    waistY: 162,
    bootY0: 216,
    bootMinX: 34,
    legSplitX: 124,
    bootMaxX: 224,
    seamLeftX: 82,
    seamRightX: 162,
    weaponSide: 'right',
    attackStyle: 'fist_punch',
    capeWaveScale: 0.9,
  },
  wicked_necromancer: {
    neckY: 104,
    shoulderY: 118,
    waistY: 170,
    bootY0: 216,
    bootMinX: 66,
    legSplitX: 138,
    bootMaxX: 216,
    seamLeftX: 74,
    seamRightX: 176,
    weaponSide: 'right',
    attackStyle: 'staff_cast',
    capeWaveScale: 0.85,
  },
  the_king: {
    neckY: 94,
    shoulderY: 110,
    waistY: 168,
    bootY0: 216,
    bootMinX: 104,
    legSplitX: 148,
    bootMaxX: 200,
    seamLeftX: 72,
    seamRightX: 168,
    weaponSide: 'left',
    attackStyle: 'sword_slash',
    capeWaveScale: 0.95,
  },
  sinister: {
    neckY: 96,
    shoulderY: 112,
    waistY: 168,
    bootY0: 216,
    bootMinX: 76,
    legSplitX: 148,
    bootMaxX: 212,
    seamLeftX: 74,
    seamRightX: 174,
    weaponSide: 'both',
    attackStyle: 'dagger_cross',
    capeWaveScale: 1.0,
  },
  templar: {
    neckY: 94,
    shoulderY: 110,
    waistY: 168,
    bootY0: 216,
    bootMinX: 64,
    legSplitX: 140,
    bootMaxX: 210,
    seamLeftX: 72,
    seamRightX: 172,
    weaponSide: 'left',
    attackStyle: 'sword_slash',
    capeWaveScale: 0.7,
  },
  nekobaku: {
    neckY: 114,
    shoulderY: 128,
    waistY: 170,
    bootY0: 216,
    bootMinX: 106,
    legSplitX: 166,
    bootMaxX: 230,
    seamLeftX: 78,
    seamRightX: 168,
    weaponSide: 'right',
    attackStyle: 'alchemy_toss',
    capeWaveScale: 1.05,
  },
  mamushi: {
    neckY: 105,
    shoulderY: 118,
    waistY: 164,
    bootY0: 216,
    bootMinX: 46,
    legSplitX: 130,
    bootMaxX: 190,
    seamLeftX: 78,
    seamRightX: 178,
    weaponSide: 'both',
    attackStyle: 'ninja_throw',
    capeWaveScale: 0.9,
  },
}

export interface ArticulatedJobDrawInput {
  jobId: string
  image: HTMLImageElement
  flipX: boolean
  dir: 'down' | 'up' | 'left' | 'right'
  action: 'idle' | 'walk' | 'run' | 'follow' | 'attack' | 'skill' | 'mount' | 'dismount'
  frame: number
  cycleFrames: number
  progress: number
  weapon: WeaponType | null
  accentColor: string
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(0.0001, edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function easeOutCubic(t: number): number {
  const c = clamp01(t)
  return 1 - Math.pow(1 - c, 3)
}

/**
 * Renders the 256x256 character using a 100%-connected 3-column horizontal strip mesh
 * (cape/left side · core spine · weapon/right side) sharing exact seam vertices, plus
 * welded ankle-pinned boots below `bootY0`. Zero detached chunks or cut holes.
 */
export function drawArticulatedJobSprite(
  ctx: CanvasRenderingContext2D,
  input: ArticulatedJobDrawInput,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const { image, flipX, dir, action, frame, cycleFrames, progress, accentColor } = input
  if (!image.complete || image.naturalWidth <= 0) return

  const jobId = normalizeJobId(input.jobId) as JobId
  const prof = JOB_MESH_PROFILES[jobId] ?? JOB_MESH_PROFILES.novice
  const baseAlpha = ctx.globalAlpha
  const safeFrames = Math.max(1, cycleFrames || 4)
  const rawPhase = frame < 0 ? 0 : (progress >= 0 ? progress : (frame % safeFrames) / safeFrames)
  const p = rawPhase * Math.PI * 2

  // Whole-stance transform anchored near ground center `(128, 244)`
  let stanceX = 0
  let stanceY = 0
  let stanceRot = 0
  let stanceScaleX = 1
  let stanceScaleY = 1

  // Continuous spine & lateral deformation parameters in native 256px coordinates
  let spineTopShiftX = 0
  let headBobY = 0
  let chestStretchX = 0
  let capeFlutterAmp = 0
  let capeTrailX = 0
  let weaponReachX = 0
  let weaponLiftY = 0
  let armWalkSwingY = 0

  // Grounded boot stride (rotates & lifts around ankle top `bootY0`, 0px gap!)
  let bootRearRot = 0
  let bootRearScaleY = 1
  let bootFrontRot = 0
  let bootFrontScaleY = 1

  const isMoving = action === 'walk' || action === 'run' || action === 'follow'
  const isAtk = action === 'attack' || action === 'skill'

  if (isMoving) {
    const isRun = action === 'run'
    const swing = Math.sin(p)
    const liftF = Math.max(0, Math.cos(p))
    const liftR = Math.max(0, -Math.cos(p))
    const bounce = Math.abs(Math.cos(p))

    // Natural step bounce & forward run lean
    stanceY = -bounce * (isRun ? 5.5 : 3.8) + 1.2
    stanceRot = isRun ? 0.055 : 0.032
    stanceScaleY = 1 + Math.cos(p * 2) * (isRun ? 0.022 : 0.014)

    // Smooth spine bend from waist -> head + natural head nod
    spineTopShiftX = (isRun ? 4.5 : 2.5) + swing * (isRun ? 2.2 : 1.4)
    headBobY = Math.cos(p * 2 - 0.5) * 1.4

    // Fluttering cape wave + subtle counter-arm swing
    capeTrailX = isRun ? -6.5 : -3.5
    capeFlutterAmp = (isRun ? 5.5 : 3.6) * prof.capeWaveScale
    armWalkSwingY = -swing * (isRun ? 4.2 : 2.8)
    weaponReachX = -swing * (isRun ? 3.5 : 2.2)

    // Alternating boots tucked cleanly under row `bootY0`
    const legAng = isRun ? 0.14 : 0.10
    const legLift = isRun ? 0.22 : 0.15
    bootFrontRot = -swing * legAng
    bootFrontScaleY = 1 - liftF * legLift
    bootRearRot = swing * legAng
    bootRearScaleY = 1 - liftR * legLift
  } else if (isAtk) {
    const t = clamp01(rawPhase)
    const skillMul = action === 'skill' ? 1.15 : 1.0

    // Anticipation (0..0.28) -> Explosive Strike (0.28..0.52) -> Recovery (0.52..1.0)
    let u = 0
    let s = 0
    if (t < 0.28) {
      u = easeOutCubic(t / 0.28)
    } else if (t < 0.44) {
      const k = easeOutCubic((t - 0.28) / 0.16)
      u = 1 - k
      s = k
    } else if (t < 0.62) {
      s = 1 - (t - 0.44) * 0.4
    } else {
      s = Math.max(0, (1 - (t - 0.62) / 0.38) * 0.92)
    }

    stanceX = (-5 * u + 12 * s) * skillMul
    stanceY = 3.0 * u - 1.5 * s
    stanceRot = (-0.075 * u + 0.095 * s) * skillMul
    stanceScaleY = 1 - 0.035 * u + 0.015 * s
    stanceScaleX = 1 + 0.025 * u - 0.015 * s

    spineTopShiftX = (-5 * u + 8 * s) * skillMul
    capeTrailX = (4 * u - 9 * s) * prof.capeWaveScale
    capeFlutterAmp = (2.5 * u + 4.5 * s) * prof.capeWaveScale

    // Braced combat stance boots
    bootRearRot = 0.05 * u + 0.09 * s
    bootFrontRot = 0.04 * u - 0.10 * s
    bootFrontScaleY = 1 - 0.08 * u

    // Smooth connected reach & lift of the weapon shoulder/arm band
    switch (prof.attackStyle) {
      case 'fist_punch':
        weaponReachX = (-9 * u + 18 * s) * skillMul
        weaponLiftY = 2 * u - 5 * s
        chestStretchX = 3 * s
        break
      case 'katana_iaijutsu':
        stanceY += 3.5 * u
        weaponReachX = (-8 * u + 15 * s) * skillMul
        weaponLiftY = 4 * u - 4 * s
        break
      case 'bow_shoot':
        weaponReachX = (-7 * u + 7 * s) * skillMul
        weaponLiftY = -4 * u + 2 * s
        break
      case 'staff_cast':
        weaponReachX = (-3 * u + 10 * s) * skillMul
        weaponLiftY = (-10 * u - 2 * s) * skillMul
        break
      case 'alchemy_toss':
      case 'ninja_throw':
        weaponReachX = (-6 * u + 12 * s) * skillMul
        weaponLiftY = (-8 * u + 3 * s) * skillMul
        break
      case 'dagger_cross':
        stanceY += 2.5 * u
        weaponReachX = (-6 * u + 13 * s) * skillMul
        weaponLiftY = -5 * u + 3 * s
        break
      default: // sword_slash
        weaponReachX = (-6 * u + 13 * s) * skillMul
        weaponLiftY = (-8 * u + 4 * s) * skillMul
        break
    }
  } else {
    // Calm idle breathing wave
    const breath = Math.sin(p)
    stanceY = breath * 1.4
    stanceScaleY = 1 + breath * 0.012
    stanceScaleX = 1 - breath * 0.006
    if (dir === 'up') stanceScaleY *= 0.97

    chestStretchX = breath * 1.5
    headBobY = Math.sin(p - 0.4) * 1.0
    capeFlutterAmp = 2.0 * prof.capeWaveScale
    weaponLiftY = Math.sin(p - 0.5) * 1.8
  }

  const sxScale = dw / RIG_SIZE
  const syScale = dh / RIG_SIZE
  const footCx = dx + dw / 2
  const footCy = dy + dh
  const forward = flipX ? -1 : 1

  // Skill aura & footsteps drawn under character
  if (action === 'skill') {
    ctx.save()
    ctx.globalAlpha = baseAlpha * 0.68
    ctx.strokeStyle = accentColor
    ctx.lineWidth = Math.max(1.3, dw * 0.028)
    ctx.beginPath()
    ctx.ellipse(footCx, footCy - dh * 0.04, dw * 0.36, dh * 0.1, 0, 0, Math.PI * 2)
    ctx.stroke()
    for (let i = 0; i < 3; i++) {
      const ang = p + (i * Math.PI * 2) / 3
      const ox = footCx + Math.cos(ang) * dw * 0.34
      const oy = footCy - dh * 0.34 + Math.sin(ang) * dh * 0.22
      ctx.fillStyle = i === 0 ? '#ffffff' : accentColor
      const sparkSize = Math.max(2, Math.round(dw * 0.042))
      ctx.fillRect(Math.round(ox - sparkSize / 2), Math.round(oy - sparkSize / 2), sparkSize, sparkSize)
    }
    ctx.restore()
  }

  if ((action === 'walk' || action === 'run') && Math.abs(Math.sin(p)) > 0.68) {
    ctx.save()
    ctx.globalAlpha = baseAlpha * 0.28
    ctx.fillStyle = '#e2e8f0'
    ctx.beginPath()
    ctx.ellipse(footCx - forward * dw * 0.15, footCy - dh * 0.03, dw * 0.08, dh * 0.03, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Subtle attack motion afterimage
  if (isAtk && rawPhase >= 0.28 && rawPhase <= 0.58) {
    ctx.save()
    ctx.globalAlpha = baseAlpha * 0.22
    ctx.translate(footCx + stanceX * sxScale * forward - forward * dw * 0.08, footCy)
    if (flipX) ctx.scale(-sxScale, syScale)
    else ctx.scale(sxScale, syScale)
    ctx.translate(-128, -RIG_SIZE)
    ctx.drawImage(image, 0, 0, RIG_SIZE, RIG_SIZE)
    ctx.restore()
  }

  // Main connected character draw inside native 0..256 coordinates
  ctx.save()
  ctx.translate(footCx, footCy)
  if (flipX) ctx.scale(-sxScale, syScale)
  else ctx.scale(sxScale, syScale)
  ctx.translate(-128, -RIG_SIZE)

  // Stance transform anchored near feet `(128, 242)`
  const anchorX = 128
  const anchorY = 242
  ctx.save()
  ctx.translate(anchorX + stanceX, anchorY + stanceY)
  if (stanceRot !== 0) ctx.rotate(stanceRot)
  if (stanceScaleX !== 1 || stanceScaleY !== 1) ctx.scale(stanceScaleX, stanceScaleY)
  ctx.translate(-anchorX, -anchorY)

  const bootY0 = prof.bootY0 || BOOT_Y_DEFAULT
  const rowH = bootY0 / STRIP_ROWS // exact 8px strip
  const seamL = prof.seamLeftX
  const seamR = prof.seamRightX
  const leftW = seamL
  const midW = seamR - seamL
  const rightW = RIG_SIZE - seamR

  // Compute vertex grid offsets so row i+1 connects pixel-tight to row i AND col j+1 connects to col j!
  const rowEdgeY = (y: number): number => {
    const chestWeight = smoothstep(bootY0, prof.neckY, y) * (1 - smoothstep(prof.neckY + 10, prof.neckY - 24, y))
    const headWeight = smoothstep(prof.neckY + 8, prof.neckY - 14, y)
    return y + headWeight * headBobY - chestWeight * (stanceScaleY - 1) * 18
  }

  const spineCenterOffset = (y: number): number => {
    // Taper bend smoothly from 0 at ankles (`bootY0`) up to full `spineTopShiftX` at top
    return spineTopShiftX * smoothstep(bootY0, 24, y)
  }

  const leftColShift = (y: number): number => {
    const upperWeight = smoothstep(bootY0, prof.shoulderY - 16, y)
    const capeWave = Math.sin(p - y * 0.035) * capeFlutterAmp
    const leftAtk =
      prof.weaponSide === 'left' || prof.weaponSide === 'both'
        ? -weaponReachX * smoothstep(prof.waistY + 30, prof.shoulderY, y) * smoothstep(20, prof.shoulderY, y)
        : 0
    return spineCenterOffset(y) + (capeTrailX + capeWave) * upperWeight + leftAtk
  }

  const rightColShift = (y: number): number => {
    const armBand = smoothstep(bootY0 + 10, prof.waistY - 8, y) * smoothstep(14, prof.shoulderY - 12, y)
    const rightAtk =
      prof.weaponSide === 'right' || prof.weaponSide === 'both' ? weaponReachX * armBand : 0
    return spineCenterOffset(y) + chestStretchX * 0.5 + rightAtk
  }

  // First draw Lower Grounded Props & Boots (y = bootY0 .. 256) anchored at exact `bootY0` seam!
  const seamAnchorY = rowEdgeY(bootY0)
  const seamAnchorShift = spineCenterOffset(bootY0)
  const seamLPos = seamL + seamAnchorShift - chestStretchX * 0.5
  const seamRPos = seamR + seamAnchorShift + chestStretchX * 0.5

  // 1) Any props outside [bootMinX .. bootMaxX] on bottom (cape tail, lowered sword tip, chest)
  if (prof.bootMinX > 0) {
    const outW = prof.bootMinX
    const targetLeft = Math.min(0, leftColShift(bootY0))
    const targetRight = Math.min(seamLPos, outW + seamAnchorShift)
    ctx.drawImage(
      image,
      0,
      bootY0 - 1,
      outW + 1,
      RIG_SIZE - bootY0 + 1,
      targetLeft,
      seamAnchorY - 1,
      Math.max(1, targetRight - targetLeft + 1),
      RIG_SIZE - seamAnchorY + 1,
    )
  }
  if (prof.bootMaxX < RIG_SIZE) {
    const sx = prof.bootMaxX
    const outW = RIG_SIZE - sx
    ctx.drawImage(
      image,
      sx - 1,
      bootY0 - 1,
      outW + 1,
      RIG_SIZE - bootY0 + 1,
      Math.max(seamRPos, sx + seamAnchorShift) - 1,
      seamAnchorY - 1,
      outW + 2,
      RIG_SIZE - seamAnchorY + 1,
    )
  }

  // 2) Rear Boot (bootMinX .. legSplitX), pinned cleanly at ankle top `seamAnchorY`
  const rearBootW = prof.legSplitX - prof.bootMinX
  if (rearBootW > 2) {
    const pivotX = prof.bootMinX + rearBootW * 0.55 + seamAnchorShift
    const pivotY = seamAnchorY
    ctx.save()
    ctx.translate(pivotX, pivotY)
    if (bootRearRot !== 0) ctx.rotate(bootRearRot)
    if (bootRearScaleY !== 1) ctx.scale(1, bootRearScaleY)
    ctx.drawImage(
      image,
      prof.bootMinX,
      bootY0 - 2,
      rearBootW + 2,
      RIG_SIZE - bootY0 + 2,
      prof.bootMinX - pivotX + seamAnchorShift,
      -2,
      rearBootW + 2,
      RIG_SIZE - bootY0 + 2,
    )
    ctx.restore()
  }

  // 3) Front Boot (legSplitX .. bootMaxX), pinned cleanly at ankle top `seamAnchorY`
  const frontBootW = prof.bootMaxX - prof.legSplitX
  if (frontBootW > 2) {
    const pivotX = prof.legSplitX + frontBootW * 0.45 + seamAnchorShift
    const pivotY = seamAnchorY
    ctx.save()
    ctx.translate(pivotX, pivotY)
    if (bootFrontRot !== 0) ctx.rotate(bootFrontRot)
    if (bootFrontScaleY !== 1) ctx.scale(1, bootFrontScaleY)
    ctx.drawImage(
      image,
      prof.legSplitX - 1,
      bootY0 - 2,
      frontBootW + 2,
      RIG_SIZE - bootY0 + 2,
      prof.legSplitX - 1 - pivotX + seamAnchorShift,
      -2,
      frontBootW + 2,
      RIG_SIZE - bootY0 + 2,
    )
    ctx.restore()
  }

  // Second draw Continuous Connected Upper Mesh (rows 0..STRIP_ROWS-1) overlapping `bootY0` seamlessly!
  for (let r = 0; r < STRIP_ROWS; r++) {
    const sy0 = r * rowH
    const sy1 = Math.min(bootY0, (r + 1) * rowH)
    const yMid = (sy0 + sy1) * 0.5
    const dy0 = rowEdgeY(sy0)
    const dy1 = rowEdgeY(sy1)
    const dhStrip = Math.max(1, dy1 - dy0) + 0.9

    const spineDx = spineCenterOffset(yMid)
    const chestExpand = chestStretchX * smoothstep(bootY0, prof.shoulderY, yMid) * (1 - smoothstep(prof.neckY + 8, prof.neckY - 12, yMid))

    const x1 = seamL + spineDx - chestExpand * 0.5
    const x2 = seamR + spineDx + chestExpand * 0.5
    const x0 = Math.min(x1 - 12, leftColShift(yMid))
    const x3 = Math.max(x2 + 12, RIG_SIZE + rightColShift(yMid))

    // Subtle vertical counter-swing on left/right side edges (only inside torso/weapon Y band)
    const armBandWeight = smoothstep(bootY0, prof.waistY, yMid) * smoothstep(32, prof.shoulderY - 12, yMid)

    // Left 4 sub-columns (cape / left arm / left wing) -> tapers smoothly to 0 vertical offset at `x1`!
    const subCols = 4
    const leftVertFull = (prof.weaponSide === 'left' || prof.weaponSide === 'both' ? weaponLiftY : -armWalkSwingY) * armBandWeight * 0.7
    for (let sc = 0; sc < subCols; sc++) {
      const t0 = sc / subCols
      const t1 = (sc + 1) / subCols
      const sx0 = t0 * leftW
      const sxW = leftW / subCols
      const dx0 = x0 + t0 * (x1 - x0)
      const dx1 = x0 + t1 * (x1 - x0)
      const uL = 1 - t0
      const vShift = leftVertFull * uL * uL
      ctx.drawImage(
        image,
        sx0,
        sy0,
        sxW,
        rowH,
        dx0,
        dy0 + vShift,
        Math.max(1, dx1 - dx0) + 0.9,
        dhStrip,
      )
    }

    // Center column (core spine: boots-top / waist / chest / neck / head)
    ctx.drawImage(
      image,
      seamL,
      sy0,
      midW,
      rowH,
      x1,
      dy0,
      Math.max(1, x2 - x1) + 0.9,
      dhStrip,
    )

    // Right 4 sub-columns (front weapon / shield / bow / staff / fist) -> tapers smoothly from 0 at `x2`!
    const rightVertFull = (prof.weaponSide === 'right' || prof.weaponSide === 'both' ? weaponLiftY : armWalkSwingY) * armBandWeight * 0.85
    for (let sc = 0; sc < subCols; sc++) {
      const t0 = sc / subCols
      const t1 = (sc + 1) / subCols
      const sx0 = seamR + t0 * rightW
      const sxW = rightW / subCols
      const dx0 = x2 + t0 * (x3 - x2)
      const dx1 = x2 + t1 * (x3 - x2)
      const vShift = rightVertFull * (t0 * t0)
      ctx.drawImage(
        image,
        sx0,
        sy0,
        sxW,
        rowH,
        dx0,
        dy0 + vShift,
        Math.max(1, dx1 - dx0) + (sc < subCols - 1 ? 0.9 : 0),
        dhStrip,
      )
    }
  }

  ctx.restore() // end stance pivot

  // Clean weapon-specific attack slash / shockwave VFX ahead of sprite during impact
  if (isAtk && rawPhase >= 0.26 && rawPhase <= 0.64) {
    const strikeFade = 1 - Math.abs(rawPhase - 0.42) / 0.22
    ctx.save()
    ctx.globalAlpha = baseAlpha * clamp01(strikeFade) * 0.92
    if (prof.attackStyle === 'fist_punch') {
      ctx.strokeStyle = accentColor
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.ellipse(226 + stanceX, 124 + stanceY, 16, 34, 0, -Math.PI * 0.45, Math.PI * 0.45)
      ctx.stroke()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(222 + stanceX, 124 + stanceY, 12, 26, 0, -Math.PI * 0.4, Math.PI * 0.4)
      ctx.stroke()
    } else if (prof.attackStyle === 'bow_shoot') {
      const arrowProg = Math.max(0, (rawPhase - 0.28) / 0.36)
      const ax = 190 + arrowProg * 58
      ctx.strokeStyle = accentColor
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(ax - 40, 126 + stanceY)
      ctx.lineTo(ax + 10, 126 + stanceY)
      ctx.stroke()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(ax - 24, 126 + stanceY)
      ctx.lineTo(ax + 12, 126 + stanceY)
      ctx.stroke()
    } else if (prof.attackStyle === 'staff_cast' || prof.attackStyle === 'alchemy_toss') {
      const tipX = 208 + stanceX
      const tipY = 86 + stanceY
      const r = 14 + (rawPhase - 0.26) * 58
      ctx.strokeStyle = accentColor
      ctx.lineWidth = 5.5
      ctx.beginPath()
      ctx.arc(tipX, tipY, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.arc(tipX, tipY, r * 0.68, 0, Math.PI * 2)
      ctx.stroke()
    } else if (prof.attackStyle === 'dagger_cross' || prof.attackStyle === 'ninja_throw') {
      ctx.lineCap = 'round'
      ctx.strokeStyle = accentColor
      ctx.lineWidth = 7.5
      ctx.beginPath()
      ctx.moveTo(154 + stanceX, 92 + stanceY)
      ctx.lineTo(240 + stanceX, 176 + stanceY)
      ctx.moveTo(158 + stanceX, 176 + stanceY)
      ctx.lineTo(238 + stanceX, 96 + stanceY)
      ctx.stroke()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.8
      ctx.beginPath()
      ctx.moveTo(160 + stanceX, 98 + stanceY)
      ctx.lineTo(234 + stanceX, 170 + stanceY)
      ctx.moveTo(164 + stanceX, 170 + stanceY)
      ctx.lineTo(232 + stanceX, 102 + stanceY)
      ctx.stroke()
    } else {
      const isKatana = prof.attackStyle === 'katana_iaijutsu'
      ctx.lineCap = 'round'
      ctx.strokeStyle = accentColor
      ctx.lineWidth = isKatana ? 10.5 : 12
      ctx.beginPath()
      if (isKatana) {
        ctx.arc(178 + stanceX, 150 + stanceY, 70, -Math.PI * 0.36, Math.PI * 0.24)
      } else {
        ctx.arc(176 + stanceX, 138 + stanceY, 68, -Math.PI * 0.42, Math.PI * 0.38)
      }
      ctx.stroke()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 4.5
      ctx.beginPath()
      if (isKatana) {
        ctx.arc(180 + stanceX, 150 + stanceY, 64, -Math.PI * 0.30, Math.PI * 0.18)
      } else {
        ctx.arc(178 + stanceX, 138 + stanceY, 62, -Math.PI * 0.35, Math.PI * 0.30)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  ctx.restore()
}
