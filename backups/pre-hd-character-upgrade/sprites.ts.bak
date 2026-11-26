import { normalizeJobId, type MonsterSprite, type WeaponType } from './data'
import { normalizeMonsterId } from './biome-monsters'
import { T, TILE, type MapDef, type MapObjectKind } from './maps'
import {
  getJobModelSpec,
  getMountModelSpec,
  getPetModelSpec,
  type ArmorStyle,
  type HatStyle as RegistryHatStyle,
  type MountModelSpec,
  type PetModelSpec,
} from './models-2d'
import {
  computeGmPoseSpec,
  GM_CANVAS_SIZE,
  GM_ROTATION_OFFSET,
  getGmSpritePaths,
  type GmAnimAction,
} from './gm-sprite'
import {
  drawMountLevelAndSkinFx,
  drawPetLevelAndStarFx,
  renderHdHumanSprite,
  renderHdMountSprite,
  renderHdPetSprite,
} from './hd-characters'
import { getMountVisualTier } from './mounts'
import { getPetVisualTier } from './pet-follow'
import { getCatalogMonsterAtlas, hasCatalogMonsterAtlas } from './catalog-sprites'
import { buildHdMapCanvas } from './hd-tiles'
import {
  drawSheetFrameSpec,
  getHeroSheetFrame,
  getHeroSheetFrameSpec,
  getMonsterSheetFrameSpec,
  getMountSheetFrameSpec,
  getNpcSheetFrameSpec,
  getPetSheetFrameSpec,
  MOUNT_FOOT_PAD_FRAC,
  PET_FOOT_PAD_FRAC,
  preloadPetSpriteSheet,
  type SheetFrameDrawSpec,
} from './sprite-sheets'

const OUTLINE = '#1a1423'

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6)
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return [
    Number.isFinite(r) ? r : 128,
    Number.isFinite(g) ? g : 128,
    Number.isFinite(b) ? b : 128,
  ]
}

export function shade(hex: string, amt: number) {
  const [r, g, b] = hexToRgb(hex)
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)))
  return `#${[f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return { c, ctx }
}

function renderTemplate(rows: string[], palette: Record<string, string>, outline = true) {
  const w = Math.max(...rows.map((r) => r.length))
  const h = rows.length
  const pad = outline ? 1 : 0
  const { c, ctx } = makeCanvas(w + pad * 2, h + pad * 2)
  const filled: boolean[][] = Array.from({ length: h + pad * 2 }, () => Array(w + pad * 2).fill(false))
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      const col = palette[ch]
      if (!col) continue
      filled[y + pad][x + pad] = true
    }
  })
  if (outline) {
    ctx.fillStyle = OUTLINE
    for (let y = 0; y < filled.length; y++)
      for (let x = 0; x < filled[0].length; x++) {
        if (filled[y][x]) continue
        const n =
          filled[y - 1]?.[x] || filled[y + 1]?.[x] || filled[y]?.[x - 1] || filled[y]?.[x + 1]
        if (n) ctx.fillRect(x, y, 1, 1)
      }
  }
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = palette[row[x]]
      if (!col) continue
      ctx.fillStyle = col
      ctx.fillRect(x + pad, y + pad, 1, 1)
    }
  })
  return c
}

class PixelSurface {
  readonly w: number
  readonly h: number
  private grid: (string | null)[][]

  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.grid = Array.from({ length: h }, () => Array<string | null>(w).fill(null))
  }

  px(x: number, y: number, color: string) {
    const ix = Math.round(x)
    const iy = Math.round(y)
    if (ix >= 0 && ix < this.w && iy >= 0 && iy < this.h) {
      this.grid[iy][ix] = color
    }
  }

  rect(x: number, y: number, w: number, h: number, color: string) {
    const x0 = Math.round(x)
    const y0 = Math.round(y)
    const iw = Math.round(w)
    const ih = Math.round(h)
    for (let dy = 0; dy < ih; dy++) {
      for (let dx = 0; dx < iw; dx++) {
        this.px(x0 + dx, y0 + dy, color)
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, color: string, thick = 1) {
    let ix0 = Math.round(x0)
    let iy0 = Math.round(y0)
    const ix1 = Math.round(x1)
    const iy1 = Math.round(y1)
    const dx = Math.abs(ix1 - ix0)
    const dy = Math.abs(iy1 - iy0)
    const sx = ix0 < ix1 ? 1 : -1
    const sy = iy0 < iy1 ? 1 : -1
    let err = dx - dy
    while (true) {
      this.px(ix0, iy0, color)
      if (thick >= 2) {
        if (dx >= dy) this.px(ix0, iy0 + 1, color)
        else this.px(ix0 + 1, iy0, color)
      }
      if (ix0 === ix1 && iy0 === iy1) break
      const e2 = 2 * err
      if (e2 > -dy) { err -= dy; ix0 += sx }
      if (e2 < dx) { err += dx; iy0 += sy }
    }
  }

  toCanvas(outline = true, mirrorX = false): HTMLCanvasElement {
    const { c, ctx } = makeCanvas(this.w, this.h)
    const get = (x: number, y: number) => {
      const sx = mirrorX ? this.w - 1 - x : x
      return this.grid[y]?.[sx] ?? null
    }
    if (outline) {
      ctx.fillStyle = OUTLINE
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          if (get(x, y)) continue
          if (get(x - 1, y) || get(x + 1, y) || get(x, y - 1) || get(x, y + 1)) {
            ctx.fillRect(x, y, 1, 1)
          }
        }
      }
    }
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const col = get(x, y)
        if (!col) continue
        ctx.fillStyle = col
        ctx.fillRect(x, y, 1, 1)
      }
    }
    return c
  }
}

const MAX_SPRITE_CACHE = 720
const MAX_GM_CACHE = 48
const cache = new Map<string, HTMLCanvasElement>()
const gmOutfitCache = new Map<string, HTMLImageElement>()
const gmEpicImageCache = new Map<string, HTMLImageElement>()
const gmEpicFrameCache = new Map<string, HTMLCanvasElement>()
const npcSpriteCache = new Map<string, HTMLImageElement>()
const rebirthAuraCache = new Map<string, HTMLImageElement>()
let gmEpicPreloaded = false

function setBoundedCanvasCache(
  target: Map<string, HTMLCanvasElement>,
  key: string,
  canvas: HTMLCanvasElement,
  limit: number,
) {
  target.delete(key)
  target.set(key, canvas)
  while (target.size > limit) {
    const oldestKey = target.keys().next().value
    if (oldestKey === undefined) break
    const oldest = target.get(oldestKey)
    target.delete(oldestKey)
    if (oldest) {
      try {
        oldest.width = 0
        oldest.height = 0
      } catch {
        // ignore cleanup errors
      }
    }
  }
}

function loadGmEpicImage(path: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null
  if (!gmEpicPreloaded) {
    gmEpicPreloaded = true
    const paths = getGmSpritePaths()
    for (const url of [...Object.values(paths.rotations), ...paths.walkSouth]) {
      if (!gmEpicImageCache.has(url)) {
        const img = new Image()
        img.src = url
        gmEpicImageCache.set(url, img)
      }
    }
  }
  let image = gmEpicImageCache.get(path)
  if (!image) {
    image = new Image()
    image.src = path
    gmEpicImageCache.set(path, image)
  }
  return image.complete && image.naturalWidth > 0 ? image : null
}

export function gmEpicSprite(
  dir: Dir,
  action: GmAnimAction,
  frame: number,
  skillColor?: string,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const pose = computeGmPoseSpec(dir, action, frame)
  const paths = getGmSpritePaths()
  const srcPath = pose.useWalkSouthSheet
    ? paths.walkSouth[pose.walkSouthIndex]
    : paths.rotations[pose.compass]
  const srcImg = loadGmEpicImage(srcPath)
  if (!srcImg) return null

  const accentColor = skillColor ?? pose.secondaryAuraColor
  const key = `gm-epic|${pose.dir}|${pose.action}|${pose.frame}|${accentColor}`
  const cachedCanvas = gmEpicFrameCache.get(key)
  if (cachedCanvas) {
    if (cachedCanvas.width > 0 && cachedCanvas.height > 0) {
      gmEpicFrameCache.delete(key)
      gmEpicFrameCache.set(key, cachedCanvas)
      return cachedCanvas
    }
    gmEpicFrameCache.delete(key)
  }

  const { c, ctx } = makeCanvas(GM_CANVAS_SIZE, GM_CANVAS_SIZE)
  const cx = Math.round(GM_CANVAS_SIZE / 2)
  const groundY = 39

  // 1. Ground arcane sigil circle during skill cast
  if (pose.ringRadius > 0) {
    ctx.save()
    const rx = pose.ringRadius
    const ry = Math.max(4, Math.round(rx * 0.36))
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 1.4
    ctx.globalAlpha = 0.82
    ctx.beginPath()
    ctx.ellipse(cx, groundY, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = accentColor
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.65
    ctx.beginPath()
    ctx.ellipse(cx, groundY, Math.max(4, rx * 0.65), Math.max(2, ry * 0.65), 0, 0, Math.PI * 2)
    ctx.stroke()

    for (let i = 0; i < 4; i++) {
      const a = pose.ringPhase + (i * Math.PI) / 2
      const rxDot = Math.round(cx + Math.cos(a) * rx)
      const ryDot = Math.round(groundY + Math.sin(a) * ry)
      ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#67e8f9'
      ctx.fillRect(rxDot - 1, ryDot - 1, 2, 2)
    }
    ctx.restore()
  }

  // 2. Celestial light pillar & holographic wing flare behind GM
  if (pose.beamAlpha > 0) {
    ctx.save()
    const grad = ctx.createLinearGradient(cx, 2, cx, groundY + 2)
    grad.addColorStop(0, 'rgba(253, 224, 71, 0)')
    grad.addColorStop(0.35, 'rgba(56, 189, 248, 0.35)')
    grad.addColorStop(0.8, 'rgba(253, 224, 71, 0.45)')
    grad.addColorStop(1, 'rgba(253, 224, 71, 0)')
    ctx.globalAlpha = pose.beamAlpha
    ctx.fillStyle = grad
    ctx.fillRect(cx - 8, 2, 16, groundY)
    ctx.restore()
  }

  if (pose.wingFlare > 0.55) {
    ctx.save()
    ctx.globalAlpha = (pose.wingFlare - 0.5) * 0.72
    ctx.fillStyle = '#38bdf8'
    const wingY = 17 + pose.bodyDy
    ctx.fillRect(cx - 17, wingY - 6, 4, 9)
    ctx.fillRect(cx + 13, wingY - 6, 4, 9)
    ctx.fillStyle = '#e0f2fe'
    ctx.fillRect(cx - 18, wingY - 8, 2, 5)
    ctx.fillRect(cx + 16, wingY - 8, 2, 5)
    ctx.restore()
  }

  // 3. Draw GM sprite (real 8-frame walk south, or sliced stride / directional pose)
  const ox = GM_ROTATION_OFFSET + Math.round(pose.bodyDx)
  const oy = GM_ROTATION_OFFSET + Math.round(pose.bodyDy)

  if (pose.action === 'attack' && (pose.frame === 1 || pose.frame === 2)) {
    ctx.save()
    ctx.globalAlpha = 0.3
    const ghostX = ox - Math.sign(pose.bodyDx || 1) * 2
    const ghostY = oy - Math.sign(pose.bodyDy || 0)
    ctx.drawImage(srcImg, ghostX, ghostY)
    ctx.restore()
  }

  if (pose.useWalkSouthSheet) {
    ctx.drawImage(srcImg, 0, 0)
  } else if (pose.action === 'walk') {
    // Upper torso + crown + wings (rows 0..22)
    ctx.drawImage(srcImg, 0, 0, 32, 22, ox, oy, 32, 22)
    // Flowing cape hem (rows 22..26)
    ctx.drawImage(srcImg, 0, 22, 32, 4, ox + pose.capeSwayX, oy + 22, 32, 4)
    // Left half lower leg/boot stride (cols 0..16, rows 26..32)
    ctx.drawImage(
      srcImg,
      0,
      26,
      16,
      6,
      ox + pose.leftFootDx,
      oy + 26 + pose.leftFootDy,
      16,
      6,
    )
    // Right half lower leg/boot stride (cols 16..32, rows 26..32)
    ctx.drawImage(
      srcImg,
      16,
      26,
      16,
      6,
      ox + 16 + pose.rightFootDx,
      oy + 26 + pose.rightFootDy,
      16,
      6,
    )
    // Subtle stepping dust puff
    if (pose.frame === 1 || pose.frame === 4) {
      ctx.fillStyle = 'rgba(224, 242, 254, 0.55)'
      const dustX = pose.dir === 'right' ? ox + 7 : pose.dir === 'left' ? ox + 22 : cx
      ctx.fillRect(dustX, groundY - 1, 2, 1)
    }
  } else {
    ctx.drawImage(srcImg, ox, oy)
  }

  // 4. Floating crown sparkle
  if (pose.crownGlow >= 0.65) {
    ctx.save()
    ctx.fillStyle = '#fef08a'
    const cyCrown = 7 + Math.round(pose.bodyDy)
    ctx.fillRect(cx - 1, cyCrown, 2, 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(cx - 5, cyCrown + 1, 1, 1)
    ctx.fillRect(cx + 4, cyCrown + 1, 1, 1)
    ctx.restore()
  }

  // 5. Attack slash crescent & sovereign impact burst
  if (pose.slashAlpha > 0) {
    ctx.save()
    const reach = 11
    const fx =
      cx +
      pose.bodyDx +
      (pose.dir === 'left' ? -reach : pose.dir === 'right' ? reach : 0)
    const fy =
      24 +
      pose.bodyDy +
      (pose.dir === 'up' ? -reach : pose.dir === 'down' ? reach : 0)

    ctx.globalAlpha = pose.slashAlpha
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(cx + pose.bodyDx, 24 + pose.bodyDy, 14, pose.slashAngle - 0.95, pose.slashAngle + 0.95)
    ctx.stroke()

    ctx.strokeStyle = '#fde047'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(cx + pose.bodyDx, 24 + pose.bodyDy, 15, pose.slashAngle - 0.85, pose.slashAngle + 0.85)
    ctx.stroke()

    if (pose.impactRadius > 0) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(Math.round(fx - 1), Math.round(fy - 4), 2, 8)
      ctx.fillRect(Math.round(fx - 4), Math.round(fy - 1), 8, 2)
      ctx.fillStyle = accentColor
      ctx.fillRect(Math.round(fx - 3), Math.round(fy - 3), 2, 2)
      ctx.fillRect(Math.round(fx + 2), Math.round(fy + 2), 2, 2)
    }
    ctx.restore()
  }

  // 6. Skill cast orbiting mana orbs & rising crown starlight
  if (pose.action === 'skill') {
    ctx.save()
    for (let i = 0; i < 3; i++) {
      const a = pose.orbAngle + (i * Math.PI * 2) / 3
      const oxDot = Math.round(cx + Math.cos(a) * 14)
      const oyDot = Math.round(23 + pose.bodyDy + Math.sin(a) * 6)
      ctx.fillStyle = i === 0 ? accentColor : i === 1 ? '#38bdf8' : '#fef08a'
      ctx.fillRect(oxDot - 1, oyDot - 1, 3, 3)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(oxDot, oyDot, 1, 1)
    }
    ctx.restore()
  }

  c.dataset.gmReady = '1'
  setBoundedCanvasCache(gmEpicFrameCache, key, c, MAX_GM_CACHE)
  return c
}

export function rebirthAuraSprite(dir: Dir): HTMLImageElement | null {
  const direction = dir === 'down' ? 'south' : dir === 'up' ? 'north' : dir === 'left' ? 'west' : 'east'
  let image = rebirthAuraCache.get(direction)
  if (!image) {
    image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ground-sigil-jQzDvfBW2V54R6DRMeDoP55hG7byck.gif'
    rebirthAuraCache.set(direction, image)
  }
  return image.complete && image.naturalWidth > 0 ? image : null
}

export function npcSprite(id: string): HTMLImageElement | null {
  let image = npcSpriteCache.get(id)
  if (!image) {
    image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = `/images/npcs/${id}.png`
    npcSpriteCache.set(id, image)
  }
  return image.complete && image.naturalWidth > 0 ? image : null
}

type GmAnimation = 'idle' | 'walk' | 'attack'

export function gmOutfitSprite(dir: Dir, animation: GmAnimation = 'idle'): HTMLImageElement | null {
  const direction = dir === 'down' ? 'south' : dir === 'up' ? 'north' : dir === 'left' ? 'west' : 'east'
  const key = `gm-${animation}-${direction}`
  let image = gmOutfitCache.get(key)
  if (!image) {
    image = new Image()
    image.crossOrigin = 'anonymous'
    const useWalk = animation === 'walk' && direction === 'south'
    const filename = animation === 'attack' ? `attack-${direction}.gif` : useWalk ? 'walk-south.gif' : `outfit-${direction}.png`
    image.src = `/images/characters/gm/${filename}`
    gmOutfitCache.set(key, image)
  }
  return image.complete && image.naturalWidth > 0 ? image : null
}

function cached(key: string, make: () => HTMLCanvasElement) {
  let c = cache.get(key)
  if (c && c.width > 0 && c.height > 0) {
    cache.delete(key)
    cache.set(key, c)
    return c
  }
  if (c) cache.delete(key)
  c = make()
  setBoundedCanvasCache(cache, key, c, MAX_SPRITE_CACHE)
  return c
}

export interface ResolvedDrawable {
  width: number
  height: number
  hdScale: number
  sheetId?: string
  gmReady?: boolean
  canvas?: HTMLCanvasElement
  sheetSpec?: SheetFrameDrawSpec
}

export function canvasToResolvedDrawable(canvas: HTMLCanvasElement): ResolvedDrawable {
  return {
    width: canvas.width,
    height: canvas.height,
    hdScale: canvas.dataset?.hdScale ? Number(canvas.dataset.hdScale) : 1,
    sheetId: canvas.dataset?.sheetId,
    gmReady: canvas.dataset?.gmReady === '1',
    canvas,
  }
}

export function sheetSpecToResolvedDrawable(spec: SheetFrameDrawSpec): ResolvedDrawable {
  return {
    width: spec.boxW ?? spec.sw,
    height: spec.boxH ?? spec.sh,
    hdScale: spec.hdScale,
    sheetId: spec.sheetId,
    sheetSpec: spec,
  }
}

export function drawResolvedDrawable(
  ctx: CanvasRenderingContext2D,
  drawable: ResolvedDrawable,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  if (drawable.sheetSpec) {
    drawSheetFrameSpec(ctx, drawable.sheetSpec, dx, dy, dw, dh)
    return
  }
  if (drawable.canvas && drawable.canvas.width > 0 && drawable.canvas.height > 0) {
    ctx.drawImage(drawable.canvas, dx, dy, dw, dh)
  }
}

export function drawResolvedPortrait(
  ctx: CanvasRenderingContext2D,
  drawable: ResolvedDrawable,
  sxCrop: number,
  syCrop: number,
  swCrop: number,
  shCrop: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  if (drawable.sheetSpec) {
    const spec = drawable.sheetSpec
    if (!spec.image.complete || spec.image.naturalWidth <= 0) return
    if (!spec.flipX) {
      ctx.drawImage(spec.image, spec.sx + sxCrop, spec.sy + syCrop, swCrop, shCrop, dx, dy, dw, dh)
      return
    }
    ctx.save()
    ctx.translate(dx + dw, dy)
    ctx.scale(-1, 1)
    ctx.drawImage(spec.image, spec.sx + (spec.sw - sxCrop - swCrop), spec.sy + syCrop, swCrop, shCrop, 0, 0, dw, dh)
    ctx.restore()
    return
  }
  if (drawable.canvas && drawable.canvas.width > 0 && drawable.canvas.height > 0) {
    ctx.drawImage(drawable.canvas, sxCrop, syCrop, swCrop, shCrop, dx, dy, dw, dh)
  }
}

export function resolveHumanDrawable(
  colors: HumanColors,
  dir: Dir,
  frame: number,
  weapon: WeaponType | null = null,
  weaponColor = '#ced4da',
  attacking = false,
  actionOverride?: SpriteAction,
  attackFrameOverride?: number,
): ResolvedDrawable {
  const requestedAction: SpriteAction = attacking ? 'attack' : actionOverride ?? (frame > 0 ? 'walk' : 'idle')
  if (typeof document !== 'undefined' && colors.jobId && !colors.skeleton && !colors.goblinEars) {
    const sheetFrameIdx = requestedAction === 'attack' ? (attackFrameOverride ?? frame) : frame
    const spec = getHeroSheetFrameSpec(colors.jobId, dir, requestedAction, sheetFrameIdx)
    if (spec) return sheetSpecToResolvedDrawable(spec)
  }
  return canvasToResolvedDrawable(
    humanSprite(colors, dir, frame, weapon, weaponColor, attacking, actionOverride, attackFrameOverride),
  )
}

export function resolveMonsterDrawable(
  sprite: MonsterSprite,
  _color: string,
  frame: number,
  attacking = false,
  actionOverride?: SpriteAction,
  dir: Dir = 'down',
  attackFrameOverride?: number,
  defId?: string,
): ResolvedDrawable {
  const action: SpriteAction = attacking ? 'attack' : actionOverride ?? (frame > 0 ? 'walk' : 'idle')
  const resolvedId = normalizeMonsterId(defId ?? sprite)
  if (typeof document !== 'undefined' && hasCatalogMonsterAtlas(resolvedId)) {
    const sheetFrameIdx = action === 'attack' || action === 'skill' ? (attackFrameOverride ?? frame) : frame
    const spec = getMonsterSheetFrameSpec(resolvedId, sprite, dir, action, sheetFrameIdx)
    if (spec) return sheetSpecToResolvedDrawable(spec)
  }
  const atlas = getCatalogMonsterAtlas(resolvedId)
  return {
    width: atlas?.boxW ?? 64,
    height: atlas?.boxH ?? 64,
    hdScale: 2,
  }
}

export function resolveNpcDrawable(
  npcId: string,
  colors: HumanColors,
  idleFrame: number,
  sheetFrame: number,
): ResolvedDrawable {
  if (typeof document !== 'undefined') {
    const spec = getNpcSheetFrameSpec(npcId, sheetFrame)
    if (spec) return sheetSpecToResolvedDrawable(spec)
  }
  return canvasToResolvedDrawable(humanSprite(colors, 'down', idleFrame, null, '#ced4da', false, 'idle'))
}

/* ---------------- Articulated Humanoids (All 12 Jobs) ---------------- */

export type Dir = 'down' | 'up' | 'left' | 'right'
export type SpriteAction = 'idle' | 'walk' | 'run' | 'follow' | 'mount' | 'dismount' | 'attack' | 'skill'
export type HatStyle = RegistryHatStyle

export interface HumanColors {
  jobId?: string
  hair: string
  body: string
  legs: string
  accent: string
  skin?: string
  hat?: string
  hatStyle?: HatStyle
  armorStyle?: ArmorStyle
  hairStyle?: 'spiky' | 'swept' | 'long' | 'ponytail' | 'braid' | 'parted' | 'royal'
  cape?: string
  scarf?: string
  shieldColor?: string
  shieldCrest?: string
  wings?: boolean
  wingStyle?: 'angel' | 'seraph' | 'none'
  halo?: boolean
  quiver?: boolean
  backpack?: boolean
  shoulderPads?: boolean
  dualDaggers?: boolean
  horns?: boolean
  goblinEars?: boolean
  skeleton?: boolean
  eye?: string
  auraColor?: string
}

export function jobHumanColors(
  jobId: string,
  base: { hair: string; body: string; legs: string; accent: string; skin?: string; hat?: string },
  _isGm = false,
): HumanColors {
  const effectiveJobId = normalizeJobId(jobId)
  const spec = getJobModelSpec(effectiveJobId)
  return {
    ...base,
    jobId: effectiveJobId,
    hat: spec.hatColor ?? base.hat,
    hatStyle: spec.hatStyle,
    armorStyle: spec.armorStyle,
    hairStyle: spec.hairStyle,
    cape: spec.capeColor,
    scarf: spec.scarfColor,
    shieldColor: spec.shieldColor,
    shieldCrest: spec.shieldCrestColor,
    wings: spec.wings,
    wingStyle: spec.wingStyle,
    halo: spec.halo,
    quiver: spec.quiver,
    backpack: spec.backpack,
    shoulderPads: spec.shoulderPads,
    dualDaggers: spec.dualDaggers,
    auraColor: spec.auraColor,
  }
}

interface Pt {
  x: number
  y: number
}

function drawWeaponInHand(
  s: PixelSurface,
  hand: Pt,
  weapon: WeaponType | null,
  weaponColor: string,
  angleRad: number,
  action: SpriteAction,
  atkF: number,
  drawHandPoint?: Pt,
  jobId?: string,
) {
  if (!weapon) return
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  const perpX = -sin
  const perpY = cos
  const hilt = '#6b4226'
  const hiltDark = '#4a2c18'
  const guard = jobId === 'templar' || jobId === 'the_king' ? '#ffd60a' : '#e9c46a'
  const guardDark = shade(guard, -0.3)
  const bladeHi = shade(weaponColor, 0.45)
  const bladeDark = shade(weaponColor, -0.28)

  if (weapon === 'sword') {
    const isHeavy = jobId === 'knight' || jobId === 'paladin'
    const bladeLen = isHeavy ? 13 : 11
    s.px(hand.x - cos * 2, hand.y - sin * 2, guard)
    s.line(hand.x - cos, hand.y - sin, hand.x + cos, hand.y + sin, hilt, 1)
    // Ornate crossguard
    s.line(
      hand.x + cos * 1.5 - perpX * 2,
      hand.y + sin * 1.5 - perpY * 2,
      hand.x + cos * 1.5 + perpX * 2,
      hand.y + sin * 1.5 + perpY * 2,
      guard,
      1,
    )
    s.px(hand.x + cos * 1.5 + perpX * 2, hand.y + sin * 1.5 + perpY * 2, guardDark)
    const tipX = hand.x + cos * bladeLen
    const tipY = hand.y + sin * bladeLen
    s.line(hand.x + cos * 2.5, hand.y + sin * 2.5, tipX, tipY, bladeDark, isHeavy ? 2 : 1)
    s.line(
      hand.x + cos * 2.5 + perpX * 0.6,
      hand.y + sin * 2.5 + perpY * 0.6,
      tipX - cos + perpX * 0.5,
      tipY - sin + perpY * 0.5,
      weaponColor,
      1,
    )
    s.line(
      hand.x + cos * 3 + perpX * 0.8,
      hand.y + sin * 3 + perpY * 0.8,
      tipX - cos * 1.5 + perpX * 0.8,
      tipY - sin * 1.5 + perpY * 0.8,
      bladeHi,
      1,
    )
    s.px(tipX, tipY, '#ffffff')
    if (jobId === 'paladin') {
      s.px(hand.x + cos * 4, hand.y + sin * 4, '#ffd60a')
    }
    if (action === 'attack' && (atkF === 1 || atkF === 2)) {
      s.px(tipX + cos, tipY + sin, '#ffffff')
      s.px(tipX + perpX * 1.5, tipY + perpY * 1.5, bladeHi)
    }
    return
  }

  if (weapon === 'dagger') {
    s.px(hand.x - cos * 1.5, hand.y - sin * 1.5, hiltDark)
    s.px(hand.x - cos, hand.y - sin, hilt)
    s.line(hand.x + perpX * 1.5, hand.y + perpY * 1.5, hand.x - perpX * 1.5, hand.y - perpY * 1.5, guard, 1)
    const tipX = hand.x + cos * 7
    const tipY = hand.y + sin * 7
    s.line(hand.x + cos, hand.y + sin, tipX, tipY, bladeDark, 1)
    s.line(hand.x + cos * 1.5 + perpX * 0.7, hand.y + sin * 1.5 + perpY * 0.7, tipX - cos, tipY - sin, bladeHi, 1)
    s.px(tipX, tipY, '#ffffff')
    if (action === 'attack' && (atkF === 1 || atkF === 2)) {
      s.px(tipX + cos, tipY + sin, '#ffffff')
    }
    return
  }

  if (weapon === 'stick') {
    const tipX = hand.x + cos * 10
    const tipY = hand.y + sin * 10
    s.line(hand.x - cos * 3, hand.y - sin * 3, tipX, tipY, shade(weaponColor, -0.2), 1)
    s.line(hand.x - cos * 2, hand.y - sin * 2, tipX - cos, tipY - sin, weaponColor, 1)
    s.px(tipX, tipY, shade(weaponColor, 0.25))
    s.px(tipX + perpX, tipY + perpY, '#80ed99')
    return
  }

  if (weapon === 'staff') {
    const len = jobId === 'wizard' || jobId === 'gm' || jobId === 'cleric' ? 11 : 10
    const shaftStart = { x: hand.x - cos * 5, y: hand.y - sin * 5 }
    const orbCenter = { x: hand.x + cos * len, y: hand.y + sin * len }
    const isGoldShaft = jobId === 'cleric' || jobId === 'gm'
    s.line(shaftStart.x, shaftStart.y, orbCenter.x - cos, orbCenter.y - sin, isGoldShaft ? '#d4a038' : hilt, 1)
    s.px(shaftStart.x, shaftStart.y, guardDark)
    s.px(orbCenter.x - cos * 2, orbCenter.y - sin * 2, '#ffd60a')
    if (jobId === 'cleric') {
      s.line(orbCenter.x - perpX * 2.5, orbCenter.y - perpY * 2.5, orbCenter.x + perpX * 2.5, orbCenter.y + perpY * 2.5, '#ffd60a', 1)
      s.line(orbCenter.x - cos * 1.5, orbCenter.y - sin * 1.5, orbCenter.x + cos * 2.5, orbCenter.y + sin * 2.5, '#ffd60a', 1)
      s.px(orbCenter.x, orbCenter.y, '#80ed99')
      s.px(orbCenter.x + cos * 2.5, orbCenter.y + sin * 2.5, '#fff3b0')
    } else {
      // Crystal orb cradle + gem specular
      s.px(orbCenter.x + cos, orbCenter.y + sin, weaponColor)
      s.px(orbCenter.x + cos * 2, orbCenter.y + sin * 2, bladeHi)
      s.px(orbCenter.x + perpX * 1.4, orbCenter.y + perpY * 1.4, bladeHi)
      s.px(orbCenter.x - perpX * 1.4, orbCenter.y - perpY * 1.4, bladeDark)
      s.px(orbCenter.x, orbCenter.y, '#ffffff')
    }
    if (action === 'attack' && (atkF === 1 || atkF === 2)) {
      s.px(orbCenter.x + cos * 3, orbCenter.y + sin * 3, '#fff3b0')
      s.px(orbCenter.x + perpX * 2.5, orbCenter.y + perpY * 2.5, '#ffffff')
    }
    return
  }

  if (weapon === 'bow') {
    const limbSpan = jobId === 'hunter' ? 7 : 6
    const topTip = { x: hand.x - cos * 2 + perpX * limbSpan, y: hand.y - sin * 2 + perpY * limbSpan }
    const botTip = { x: hand.x - cos * 2 - perpX * limbSpan, y: hand.y - sin * 2 - perpY * limbSpan }
    const topMid = { x: hand.x + cos * 2 + perpX * (limbSpan - 2), y: hand.y + sin * 2 + perpY * (limbSpan - 2) }
    const botMid = { x: hand.x + cos * 2 - perpX * (limbSpan - 2), y: hand.y + sin * 2 - perpY * (limbSpan - 2) }
    const grip = { x: hand.x + cos * 2.5, y: hand.y + sin * 2.5 }

    s.line(topTip.x, topTip.y, topMid.x, topMid.y, weaponColor, 1)
    s.line(topMid.x, topMid.y, grip.x, grip.y, bladeHi, 1)
    s.line(grip.x, grip.y, botMid.x, botMid.y, weaponColor, 1)
    s.line(botMid.x, botMid.y, botTip.x, botTip.y, bladeDark, 1)
    s.px(grip.x, grip.y, hilt)
    if (jobId === 'hunter') {
      s.px(topTip.x, topTip.y, '#ffd60a')
      s.px(botTip.x, botTip.y, '#ffd60a')
    }

    const pull = drawHandPoint ?? { x: hand.x - cos * 2, y: hand.y - sin * 2 }
    if (action === 'attack' && atkF === 1) {
      s.line(topTip.x, topTip.y, pull.x, pull.y, '#e2e8f0', 1)
      s.line(botTip.x, botTip.y, pull.x, pull.y, '#e2e8f0', 1)
      s.line(pull.x, pull.y, hand.x + cos * 7, hand.y + sin * 7, '#f8fafc', 1)
      s.px(hand.x + cos * 7, hand.y + sin * 7, '#ffd60a')
    } else {
      s.line(topTip.x, topTip.y, botTip.x, botTip.y, '#e2e8f0', 1)
      if (action === 'attack' && atkF === 2) {
        s.line(hand.x + cos * 3, hand.y + sin * 3, hand.x + cos * 11, hand.y + sin * 11, '#f8fafc', 1)
        s.px(hand.x + cos * 11, hand.y + sin * 11, '#ffd60a')
      }
    }
  }
}

function drawLeg(
  s: PixelSurface,
  hip: Pt,
  knee: Pt,
  foot: Pt,
  legCol: string,
  bootCol: string,
  footDirX = 1,
) {
  const legHi = shade(legCol, 0.16)
  const legDark = shade(legCol, -0.24)
  const bootHi = shade(bootCol, 0.28)
  const bootDark = shade(bootCol, -0.3)

  // Thigh & shin (3px thick trousers/greaves with cel highlight)
  s.line(hip.x, hip.y, knee.x, knee.y, legCol, 2)
  s.line(hip.x - 1, hip.y, knee.x - 1, knee.y, legDark, 1)
  s.px(hip.x + (footDirX > 0 ? 1 : 0), hip.y + 1, legHi)
  s.line(knee.x, knee.y, foot.x, foot.y - 2, legCol, 2)

  // Detailed cuffed boot (4px tall, grounded sole)
  const bx = Math.round(foot.x)
  const by = Math.round(foot.y)
  s.rect(bx - 1, by - 3, 3, 1, bootHi) // boot cuff fold
  s.rect(bx - 1, by - 2, 3, 2, bootCol)
  s.px(bx + footDirX, by - 1, bootCol) // toe cap
  s.px(bx + footDirX, by, bootDark) // sole toe
  s.rect(bx - 1, by, 3, 1, bootDark) // boot sole
}

function drawArm(
  s: PixelSurface,
  shoulder: Pt,
  elbow: Pt,
  hand: Pt,
  sleeveCol: string,
  handCol: string,
  cuffCol?: string,
) {
  const sleeveHi = shade(sleeveCol, 0.22)
  const sleeveDark = shade(sleeveCol, -0.24)
  const handDark = shade(handCol, -0.2)
  s.line(shoulder.x, shoulder.y, elbow.x, elbow.y, sleeveCol, 2)
  s.px(shoulder.x, shoulder.y, sleeveHi)
  s.line(elbow.x, elbow.y, hand.x, hand.y, sleeveDark, 2)
  if (cuffCol) {
    s.px(hand.x - (hand.x - elbow.x >= 0 ? 1 : -1), hand.y - 1, cuffCol)
  }
  s.rect(Math.round(hand.x), Math.round(hand.y), 2, 2, handCol)
  s.px(Math.round(hand.x), Math.round(hand.y) + 1, handDark)
}

function drawHairBackLayer(
  s: PixelSurface,
  cx: number,
  headTopY: number,
  dir: 'down' | 'up' | 'side',
  colors: HumanColors,
) {
  if (colors.skeleton) return
  const hairCol = colors.hair
  const hairDark = shade(hairCol, -0.28)
  const style = colors.hairStyle ?? 'spiky'

  // Long hair, ponytail, braid, or royal locks flowing behind neck/shoulders on front/side
  if (dir === 'down') {
    if (style === 'long' || style === 'royal') {
      s.rect(cx - 6, headTopY + 5, 2, 7, hairDark)
      s.rect(cx + 5, headTopY + 5, 2, 7, hairDark)
      s.px(cx - 5, headTopY + 12, hairCol)
      s.px(cx + 5, headTopY + 12, hairCol)
    } else if (style === 'braid') {
      s.rect(cx - 6, headTopY + 6, 2, 6, hairCol)
      s.rect(cx + 5, headTopY + 6, 2, 6, hairCol)
      s.px(cx - 5, headTopY + 9, colors.accent)
      s.px(cx + 5, headTopY + 9, colors.accent)
    }
    return
  }

  if (dir === 'side') {
    if (style === 'ponytail') {
      s.rect(cx - 6, headTopY + 2, 3, 3, hairCol)
      s.line(cx - 6, headTopY + 4, cx - 8, headTopY + 9, hairDark, 2)
      s.px(cx - 5, headTopY + 3, colors.accent)
    } else if (style === 'long' || style === 'royal' || style === 'braid') {
      s.rect(cx - 6, headTopY + 2, 3, 9, hairDark)
      s.rect(cx - 5, headTopY + 3, 2, 7, hairCol)
      s.px(cx - 6, headTopY + 11, hairDark)
    } else {
      s.rect(cx - 5, headTopY + 3, 2, 5, hairDark)
    }
  }
}

function drawHatOrHair(
  s: PixelSurface,
  cx: number,
  headTopY: number,
  dir: 'down' | 'up' | 'side',
  colors: HumanColors,
) {
  if (colors.skeleton) return
  const hairCol = colors.hair
  const hairDark = shade(hairCol, -0.28)
  const hairHi = shade(hairCol, 0.25)
  const hairStyle = colors.hairStyle ?? 'spiky'
  const hatCol = colors.hat ?? colors.accent
  const hatDark = shade(hatCol, -0.3)
  const hatHi = shade(hatCol, 0.26)
  const style = colors.hatStyle ?? (colors.hat ? 'wizard' : 'none')

  // Base sculpted hair crown & bangs visible underneath/around headgear
  const drawBaseHair = (includeTopCrown: boolean) => {
    if (dir === 'down') {
      if (includeTopCrown) {
        s.rect(cx - 5, headTopY - 2, 11, 4, hairCol)
        s.rect(cx - 3, headTopY - 3, 7, 2, hairCol)
        s.rect(cx - 2, headTopY - 2, 5, 1, hairHi)
        s.px(cx - 4, headTopY - 1, hairHi)
        s.px(cx + 3, headTopY - 1, hairHi)
      }
      // Side temple hair locks framing face
      s.rect(cx - 5, headTopY + 1, 2, 6, hairCol)
      s.rect(cx + 4, headTopY + 1, 2, 6, hairCol)
      s.px(cx - 5, headTopY + 6, hairDark)
      s.px(cx + 5, headTopY + 6, hairDark)
      // Stylish parted/spiky forehead bangs
      if (hairStyle === 'spiky') {
        s.rect(cx - 4, headTopY + 1, 9, 2, hairCol)
        s.px(cx - 3, headTopY + 3, hairDark)
        s.px(cx, headTopY + 3, hairCol)
        s.px(cx + 3, headTopY + 3, hairDark)
        if (includeTopCrown) {
          s.px(cx - 4, headTopY - 3, hairHi)
          s.px(cx + 1, headTopY - 4, hairHi)
          s.px(cx + 4, headTopY - 3, hairCol)
        }
      } else if (hairStyle === 'swept') {
        s.rect(cx - 4, headTopY + 1, 8, 2, hairCol)
        s.line(cx - 2, headTopY + 2, cx + 2, headTopY + 4, hairDark, 1)
        s.px(cx - 4, headTopY + 3, hairCol)
      } else {
        // Parted / long / royal bangs
        s.rect(cx - 4, headTopY + 1, 4, 2, hairCol)
        s.rect(cx + 1, headTopY + 1, 4, 2, hairCol)
        s.px(cx - 2, headTopY + 3, hairDark)
        s.px(cx + 2, headTopY + 3, hairDark)
      }
    } else if (dir === 'side') {
      if (includeTopCrown) {
        s.rect(cx - 4, headTopY - 2, 9, 4, hairCol)
        s.rect(cx - 3, headTopY - 3, 6, 1, hairCol)
        s.rect(cx - 1, headTopY - 2, 4, 1, hairHi)
        if (hairStyle === 'spiky') {
          s.px(cx - 4, headTopY - 3, hairHi)
          s.px(cx + 3, headTopY - 1, hairHi)
        }
      }
      // Front swept bangs + sideburn
      s.rect(cx - 4, headTopY + 1, 4, 5, hairDark)
      s.rect(cx, headTopY + 1, 5, 2, hairCol)
      s.px(cx + 4, headTopY + 3, hairDark)
    } else {
      // dir === 'up': full lush back hair
      s.rect(cx - 5, headTopY - 2, 11, 10, hairCol)
      if (includeTopCrown) {
        s.rect(cx - 3, headTopY - 3, 7, 2, hairCol)
        s.rect(cx - 3, headTopY - 1, 7, 1, hairHi)
      }
      s.rect(cx - 4, headTopY + 7, 9, 2, hairDark)
      if (hairStyle === 'long' || hairStyle === 'royal') {
        s.rect(cx - 4, headTopY + 9, 9, 3, hairCol)
        s.rect(cx - 3, headTopY + 11, 7, 1, hairDark)
      } else if (hairStyle === 'ponytail') {
        s.rect(cx - 1, headTopY + 4, 3, 2, colors.accent)
        s.rect(cx - 2, headTopY + 6, 5, 5, hairDark)
        s.rect(cx - 1, headTopY + 6, 3, 4, hairCol)
      } else if (hairStyle === 'braid') {
        s.rect(cx - 5, headTopY + 7, 2, 5, hairDark)
        s.rect(cx + 4, headTopY + 7, 2, 5, hairDark)
      }
    }
  }

  if (style === 'none') {
    drawBaseHair(true)
    return
  }

  if (style === 'bandana' || style === 'novice_bandana') {
    drawBaseHair(true)
    s.rect(cx - 5, headTopY, 11, 2, hatCol)
    s.rect(cx - 4, headTopY, 9, 1, hatHi)
    if (style === 'novice_bandana') {
      // Cute Novice leaf sprout on crown
      s.px(cx + 1, headTopY - 3, '#4ade80')
      s.px(cx + 2, headTopY - 4, '#86efac')
      s.px(cx + 3, headTopY - 4, '#4ade80')
    }
    if (dir === 'side') {
      s.line(cx - 5, headTopY + 1, cx - 8, headTopY + 4, hatCol, 1)
      s.line(cx - 5, headTopY, cx - 8, headTopY + 2, hatDark, 1)
    } else if (dir === 'up') {
      s.rect(cx - 1, headTopY + 1, 3, 2, hatDark)
      s.line(cx - 1, headTopY + 2, cx - 3, headTopY + 5, hatCol, 1)
      s.line(cx + 1, headTopY + 2, cx + 3, headTopY + 5, hatCol, 1)
    } else {
      s.px(cx, headTopY, '#ffd60a')
    }
    return
  }

  if (style === 'wizard' || style === 'archmage') {
    drawBaseHair(false)
    const brimW = style === 'archmage' ? 15 : 13
    const brimLeft = cx - Math.floor(brimW / 2)
    // Shaded curved brim
    s.rect(brimLeft, headTopY + 1, brimW, 2, hatDark)
    s.rect(brimLeft + 1, headTopY + 1, brimW - 2, 1, hatCol)
    // Tall pointed cone with crooked wizard tip
    s.rect(cx - 4, headTopY - 2, 9, 3, hatCol)
    s.rect(cx - 3, headTopY - 4, 7, 2, hatCol)
    s.rect(cx - 2, headTopY - 6, 5, 2, hatHi)
    s.rect(dir === 'side' ? cx - 3 : cx - 1, headTopY - 8, 3, 2, hatCol)
    s.px(dir === 'side' ? cx - 4 : cx + 1, headTopY - 9, style === 'archmage' ? '#67e8f9' : hatHi)
    // Gold hatband & arcane buckle
    s.rect(cx - 4, headTopY, 9, 1, colors.accent)
    if (dir !== 'up') {
      s.px(cx, headTopY, '#ffd60a')
      if (style === 'archmage') {
        s.px(cx, headTopY - 3, '#fff3b0')
        s.px(cx - 2, headTopY - 5, '#67e8f9')
      }
    }
    return
  }

  if (style === 'hood' || style === 'ranger_hood') {
    drawBaseHair(false)
    s.rect(cx - 6, headTopY - 2, 13, 3, hatCol)
    s.rect(cx - 4, headTopY - 3, 9, 2, hatHi)
    if (dir === 'side') {
      s.rect(cx - 6, headTopY, 5, 9, hatDark)
      s.rect(cx - 5, headTopY, 3, 7, hatCol)
    } else if (dir === 'up') {
      s.rect(cx - 6, headTopY, 13, 9, hatCol)
      s.rect(cx - 4, headTopY + 2, 9, 6, hatDark)
    } else {
      s.rect(cx - 6, headTopY + 1, 2, 7, hatDark)
      s.rect(cx + 5, headTopY + 1, 2, 7, hatDark)
      s.rect(cx - 4, headTopY, 9, 1, colors.accent)
    }
    // Curved ranger feather
    const featherCol = style === 'ranger_hood' ? '#ffb703' : '#e9f5db'
    s.line(cx - 3, headTopY - 2, cx - 7, headTopY - 6, featherCol, 1)
    s.px(cx - 7, headTopY - 7, style === 'ranger_hood' ? '#fb8500' : '#ffffff')
    return
  }

  if (style === 'cowl') {
    drawBaseHair(false)
    // Dark tactical ninja/corsair hood + lower face mask
    s.rect(cx - 5, headTopY - 2, 11, 3, hatCol)
    s.rect(cx - 3, headTopY - 3, 7, 1, hatHi)
    s.rect(cx - 5, headTopY, 11, 1, colors.accent)
    if (dir === 'side') {
      s.rect(cx - 5, headTopY, 5, 9, hatDark)
      s.rect(cx - 1, headTopY + 7, 6, 3, colors.scarf ?? '#e63946')
      s.rect(cx + 1, headTopY + 7, 4, 2, hatCol)
    } else if (dir === 'up') {
      s.rect(cx - 5, headTopY, 11, 10, hatCol)
      s.rect(cx - 3, headTopY + 2, 7, 6, hatDark)
    } else {
      s.rect(cx - 5, headTopY + 1, 2, 7, hatDark)
      s.rect(cx + 4, headTopY + 1, 2, 7, hatDark)
      // Face mask over nose & mouth (leaving sharp eyes + bangs visible!)
      s.rect(cx - 4, headTopY + 7, 9, 3, hatDark)
      s.rect(cx - 3, headTopY + 7, 7, 2, hatCol)
    }
    s.px(cx, headTopY, '#ffd60a')
    return
  }

  if (style === 'helm' || style === 'paladin_helm') {
    drawBaseHair(false)
    const plumeCol = style === 'paladin_helm' ? '#3a86ff' : '#e63946'
    const plumeHi = shade(plumeCol, 0.3)
    const trimCol = style === 'paladin_helm' ? '#ffd60a' : '#e9c46a'
    // Flowing knight plume crest
    s.rect(cx - 2, headTopY - 5, 5, 3, plumeCol)
    s.rect(cx - 1, headTopY - 6, 3, 2, plumeHi)
    if (dir === 'side' || dir === 'up') {
      s.rect(cx - 5, headTopY - 4, 4, 3, plumeCol)
      s.px(cx - 6, headTopY - 2, shade(plumeCol, -0.25))
    }
    // Steel helmet dome + cheekguards
    s.rect(cx - 5, headTopY - 2, 11, 4, hatCol)
    s.rect(cx - 4, headTopY - 3, 9, 2, hatHi)
    s.rect(cx - 5, headTopY + 1, 11, 1, trimCol)
    if (dir === 'side') {
      s.rect(cx - 5, headTopY + 1, 4, 8, hatDark)
      s.rect(cx - 3, headTopY + 2, 2, 6, hatCol)
      s.px(cx + 4, headTopY + 2, trimCol)
    } else if (dir === 'up') {
      s.rect(cx - 5, headTopY + 1, 11, 8, hatDark)
      s.rect(cx - 3, headTopY + 2, 7, 6, hatCol)
    } else {
      s.rect(cx - 5, headTopY + 2, 2, 6, hatDark)
      s.rect(cx + 4, headTopY + 2, 2, 6, hatDark)
      s.px(cx, headTopY + 2, trimCol) // noseguard
      s.px(cx, headTopY + 3, hatHi)
    }
    return
  }

  if (style === 'crown') {
    drawBaseHair(true)
    s.rect(cx - 5, headTopY - 2, 11, 2, '#d4a017')
    s.rect(cx - 4, headTopY - 2, 9, 1, '#ffd60a')
    s.px(cx - 4, headTopY - 4, '#ffd60a')
    s.px(cx - 2, headTopY - 3, '#fff3b0')
    s.px(cx, headTopY - 5, '#ffd60a')
    s.px(cx + 2, headTopY - 3, '#fff3b0')
    s.px(cx + 4, headTopY - 4, '#ffd60a')
    s.px(cx, headTopY - 3, '#ff4d6d')
    return
  }

  if (style === 'mitre') {
    drawBaseHair(false)
    s.rect(cx - 5, headTopY - 1, 11, 3, hatCol)
    s.rect(cx - 4, headTopY - 4, 9, 3, hatCol)
    s.rect(cx - 3, headTopY - 6, 7, 2, hatHi)
    s.rect(cx - 1, headTopY - 7, 3, 1, hatHi)
    s.rect(cx - 5, headTopY + 1, 11, 1, '#ffd60a')
    s.line(cx, headTopY - 5, cx, headTopY + 1, '#ffd60a', 1)
    s.line(cx - 2, headTopY - 3, cx + 2, headTopY - 3, '#ffd60a', 1)
    return
  }

  if (style === 'merchant_beret') {
    drawBaseHair(true)
    // Puffed merchant beret with gold coin crest and plume
    s.rect(cx - 6, headTopY - 1, 13, 2, hatDark)
    s.rect(cx - 5, headTopY - 3, 11, 3, hatCol)
    s.rect(cx - 3, headTopY - 4, 7, 2, hatHi)
    s.rect(cx - 4, headTopY, 9, 1, colors.accent)
    if (dir !== 'up') {
      s.px(cx + 1, headTopY - 1, '#ffd60a')
      s.px(cx + 2, headTopY - 1, '#fef08a')
    }
    s.line(cx - 4, headTopY - 2, cx - 7, headTopY - 5, '#fef08a', 1)
    return
  }

  if (style === 'cat_hood') {
    drawBaseHair(true)
    // Cat-ear alchemy hood & brass goggles (Nekobaku)
    s.rect(cx - 5, headTopY - 1, 11, 2, hatDark)
    s.rect(cx - 4, headTopY - 2, 9, 2, hatCol)
    // Twin cat ears
    s.rect(cx - 5, headTopY - 5, 3, 3, hatCol)
    s.rect(cx + 3, headTopY - 5, 3, 3, hatCol)
    s.px(cx - 4, headTopY - 6, hatHi)
    s.px(cx + 4, headTopY - 6, hatHi)
    s.px(cx - 4, headTopY - 4, '#fda4af')
    s.px(cx + 4, headTopY - 4, '#fda4af')
    if (dir !== 'up') {
      // Forehead alchemy goggles
      s.rect(cx - 4, headTopY - 1, 3, 2, '#38bdf8')
      s.rect(cx + 2, headTopY - 1, 3, 2, '#fbbf24')
      s.px(cx, headTopY - 1, '#cbd5e1')
    }
    return
  }
}

export function humanSprite(
  colors: HumanColors,
  dir: Dir,
  frame: number,
  weapon: WeaponType | null = null,
  weaponColor = '#ced4da',
  attacking = false,
  actionOverride?: SpriteAction,
  attackFrameOverride?: number,
) {
  const requestedAction: SpriteAction = attacking ? 'attack' : actionOverride ?? (frame > 0 ? 'walk' : 'idle')

  if (typeof document !== 'undefined' && colors.jobId && !colors.skeleton && !colors.goblinEars) {
    const sheetFrameIdx =
      requestedAction === 'attack'
        ? (attackFrameOverride ?? frame)
        : frame
    const sheetCanvas = getHeroSheetFrame(colors.jobId, dir, requestedAction, sheetFrameIdx)
    if (sheetCanvas) return sheetCanvas
  }

  const action: 'idle' | 'walk' | 'attack' =
    requestedAction === 'skill'
      ? 'attack'
      : requestedAction === 'run' || requestedAction === 'follow'
        ? 'walk'
        : requestedAction === 'mount' || requestedAction === 'dismount'
          ? 'idle'
          : requestedAction
  const f = action === 'attack'
    ? Math.abs(attackFrameOverride ?? frame) % 4
    : action === 'walk'
      ? Math.abs(frame) % 6
      : frame === -1
        ? -1
        : Math.abs(frame) % 4

  const key = `hd_ha48|${JSON.stringify(colors)}|${dir}|${requestedAction}|${f}|${weapon ?? 'none'}|${weaponColor}`
  return cached(key, () => {
    if (typeof document !== 'undefined') {
      return renderHdHumanSprite(colors, dir, f, weapon, weaponColor, attacking, requestedAction, attackFrameOverride)
    }
    const W = 42
    const H = 48
    const s = new PixelSurface(W, H)

    const skin = colors.skin ?? '#f4c794'
    const skinHi = shade(skin, 0.16)
    const skinDark = shade(skin, -0.22)
    const skinDeep = shade(skin, -0.35)
    const body = colors.body
    const bodyDark = shade(body, -0.28)
    const bodyHi = shade(body, 0.24)
    const legCol = colors.legs
    const legDark = shade(legCol, -0.28)
    const bootCol = colors.armorStyle === 'plate' || colors.armorStyle === 'paladin_plate' ? '#64748b' : '#4a2e1f'
    const bootDark = shade(bootCol, -0.3)
    const eyeCol = colors.eye ?? '#1a1423'
    const blink = !attacking && f === -1

    const cx = 20
    const footY = 44
    const hipY = 34
    const torsoBaseY = 23
    const headBaseY = 12

    if (dir === 'left' || dir === 'right') {
      let bob = 0
      let lean = 0
      let backHip: Pt = { x: cx - 1, y: hipY }
      let backKnee: Pt = { x: cx - 2, y: 39 }
      let backFoot: Pt = { x: cx - 2, y: footY }
      let frontHip: Pt = { x: cx + 1, y: hipY }
      let frontKnee: Pt = { x: cx + 1, y: 39 }
      let frontFoot: Pt = { x: cx + 1, y: footY }

      let backElbow: Pt = { x: cx + 2, y: 27 }
      let backHand: Pt = { x: cx + 4, y: 30 }
      let frontElbow: Pt = { x: cx - 2, y: 27 }
      let frontHand: Pt = { x: cx + 1, y: 30 }
      let weaponAngle = -0.35

      if (action === 'idle') {
        const breath = f === 1 ? 1 : 0
        bob = breath
        backHip = { x: cx - 1, y: hipY + breath }
        backKnee = { x: cx - 2, y: 39 }
        backFoot = { x: cx - 2, y: footY }
        frontHip = { x: cx + 1, y: hipY + breath }
        frontKnee = { x: cx + 2, y: 39 }
        frontFoot = { x: cx + 2, y: footY }
        backElbow = { x: cx + 3, y: 27 + breath }
        backHand = { x: cx + 5, y: 29 + breath }
        frontElbow = { x: cx - 1, y: 27 + breath }
        frontHand = { x: cx + 2, y: 30 + breath }
        weaponAngle = weapon === 'staff' ? -1.4 : weapon === 'bow' ? 0 : -0.6
      } else if (action === 'walk') {
        const walkFrames: Array<{
          bob: number; lean: number
          bk: Pt; bf: Pt; fk: Pt; ff: Pt
          be: Pt; bh: Pt; fe: Pt; fh: Pt; wa: number
        }> = [
          { bob: 0, lean: 1, bk: { x: cx - 3, y: 39 }, bf: { x: cx - 5, y: footY }, fk: { x: cx + 3, y: 39 }, ff: { x: cx + 4, y: footY }, be: { x: cx + 3, y: 27 }, bh: { x: cx + 6, y: 29 }, fe: { x: cx - 2, y: 27 }, fh: { x: cx - 5, y: 30 }, wa: 0.35 },
          { bob: -1, lean: 1, bk: { x: cx, y: 37 }, bf: { x: cx - 2, y: footY - 2 }, fk: { x: cx + 1, y: 39 }, ff: { x: cx + 1, y: footY }, be: { x: cx + 2, y: 26 }, bh: { x: cx + 4, y: 28 }, fe: { x: cx - 1, y: 26 }, fh: { x: cx - 1, y: 29 }, wa: -0.1 },
          { bob: 0, lean: 1, bk: { x: cx + 4, y: 38 }, bf: { x: cx + 3, y: footY - 1 }, fk: { x: cx - 2, y: 39 }, ff: { x: cx - 4, y: footY }, be: { x: cx - 2, y: 27 }, bh: { x: cx - 5, y: 30 }, fe: { x: cx + 3, y: 27 }, fh: { x: cx + 6, y: 29 }, wa: -0.6 },
          { bob: 0, lean: 1, bk: { x: cx + 3, y: 39 }, bf: { x: cx + 4, y: footY }, fk: { x: cx - 3, y: 39 }, ff: { x: cx - 5, y: footY }, be: { x: cx - 2, y: 27 }, bh: { x: cx - 5, y: 30 }, fe: { x: cx + 3, y: 27 }, fh: { x: cx + 6, y: 29 }, wa: -0.8 },
          { bob: -1, lean: 1, bk: { x: cx + 1, y: 39 }, bf: { x: cx + 1, y: footY }, fk: { x: cx, y: 37 }, ff: { x: cx - 2, y: footY - 2 }, be: { x: cx + 2, y: 26 }, bh: { x: cx + 3, y: 28 }, fe: { x: cx, y: 26 }, fh: { x: cx + 1, y: 29 }, wa: -0.35 },
          { bob: 0, lean: 1, bk: { x: cx - 2, y: 39 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 4, y: 38 }, ff: { x: cx + 3, y: footY - 1 }, be: { x: cx + 3, y: 27 }, bh: { x: cx + 6, y: 29 }, fe: { x: cx - 2, y: 27 }, fh: { x: cx - 5, y: 30 }, wa: 0.2 },
        ]
        const wf = walkFrames[f]
        bob = wf.bob; lean = wf.lean
        backHip = { x: cx - 1 + lean, y: hipY + bob }; backKnee = wf.bk; backFoot = wf.bf
        frontHip = { x: cx + 1 + lean, y: hipY + bob }; frontKnee = wf.fk; frontFoot = wf.ff
        backElbow = wf.be; backHand = wf.bh
        frontElbow = wf.fe; frontHand = wf.fh
        weaponAngle = weapon === 'staff' ? wf.wa - 0.7 : weapon === 'bow' ? wf.wa * 0.25 : wf.wa
      } else {
        if (weapon === 'bow') {
          const bowAtk = [
            { bob: 0, lean: 0, bk: { x: cx - 3, y: 39 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 3, y: 39 }, ff: { x: cx + 4, y: footY }, be: { x: cx + 4, y: 25 }, bh: { x: cx + 7, y: 25 }, fe: { x: cx + 1, y: 25 }, fh: { x: cx + 4, y: 25 }, wa: 0 },
            { bob: 1, lean: -1, bk: { x: cx - 4, y: 39 }, bf: { x: cx - 5, y: footY }, fk: { x: cx + 3, y: 39 }, ff: { x: cx + 4, y: footY }, be: { x: cx + 4, y: 25 }, bh: { x: cx + 8, y: 25 }, fe: { x: cx - 3, y: 25 }, fh: { x: cx - 4, y: 25 }, wa: 0 },
            { bob: 0, lean: 1, bk: { x: cx - 4, y: 39 }, bf: { x: cx - 5, y: footY }, fk: { x: cx + 4, y: 39 }, ff: { x: cx + 5, y: footY }, be: { x: cx + 4, y: 25 }, bh: { x: cx + 9, y: 25 }, fe: { x: cx - 4, y: 25 }, fh: { x: cx - 5, y: 25 }, wa: 0 },
            { bob: 0, lean: 0, bk: { x: cx - 3, y: 39 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 3, y: 39 }, ff: { x: cx + 4, y: footY }, be: { x: cx + 3, y: 26 }, bh: { x: cx + 6, y: 28 }, fe: { x: cx - 1, y: 26 }, fh: { x: cx + 2, y: 28 }, wa: 0.1 },
          ][f]
          bob = bowAtk.bob; lean = bowAtk.lean
          backHip = { x: cx - 1 + lean, y: hipY + bob }; backKnee = bowAtk.bk; backFoot = bowAtk.bf
          frontHip = { x: cx + 1 + lean, y: hipY + bob }; frontKnee = bowAtk.fk; frontFoot = bowAtk.ff
          backElbow = bowAtk.be; backHand = bowAtk.bh
          frontElbow = bowAtk.fe; frontHand = bowAtk.fh
          weaponAngle = bowAtk.wa
        } else if (weapon === 'staff') {
          const staffAtk = [
            { bob: 1, lean: -1, bk: { x: cx - 3, y: 39 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 3, y: 39 }, ff: { x: cx + 4, y: footY }, be: { x: cx + 2, y: 22 }, bh: { x: cx + 2, y: 18 }, fe: { x: cx - 1, y: 22 }, fh: { x: cx + 1, y: 19 }, wa: -1.6 },
            { bob: 0, lean: 1, bk: { x: cx - 4, y: 39 }, bf: { x: cx - 5, y: footY }, fk: { x: cx + 4, y: 39 }, ff: { x: cx + 5, y: footY }, be: { x: cx + 4, y: 24 }, bh: { x: cx + 7, y: 22 }, fe: { x: cx + 3, y: 24 }, fh: { x: cx + 6, y: 24 }, wa: -0.7 },
            { bob: 1, lean: 2, bk: { x: cx - 4, y: 39 }, bf: { x: cx - 6, y: footY }, fk: { x: cx + 5, y: 39 }, ff: { x: cx + 7, y: footY }, be: { x: cx + 5, y: 26 }, bh: { x: cx + 9, y: 25 }, fe: { x: cx + 5, y: 25 }, fh: { x: cx + 9, y: 25 }, wa: -0.1 },
            { bob: 0, lean: 1, bk: { x: cx - 3, y: 39 }, bf: { x: cx - 5, y: footY }, fk: { x: cx + 4, y: 39 }, ff: { x: cx + 5, y: footY }, be: { x: cx + 4, y: 27 }, bh: { x: cx + 6, y: 29 }, fe: { x: cx + 2, y: 27 }, fh: { x: cx + 5, y: 29 }, wa: -0.9 },
          ][f]
          bob = staffAtk.bob; lean = staffAtk.lean
          backHip = { x: cx - 1 + lean, y: hipY + bob }; backKnee = staffAtk.bk; backFoot = staffAtk.bf
          frontHip = { x: cx + 1 + lean, y: hipY + bob }; frontKnee = staffAtk.fk; frontFoot = staffAtk.ff
          backElbow = staffAtk.be; backHand = staffAtk.bh
          frontElbow = staffAtk.fe; frontHand = staffAtk.fh
          weaponAngle = staffAtk.wa
        } else {
          const meleeAtk = [
            { bob: 1, lean: -1, bk: { x: cx - 3, y: 39 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 3, y: 39 }, ff: { x: cx + 4, y: footY }, be: { x: cx + 4, y: 27 }, bh: { x: cx + 7, y: 28 }, fe: { x: cx - 3, y: 22 }, fh: { x: cx - 5, y: 18 }, wa: -2.2 },
            { bob: 0, lean: 1, bk: { x: cx - 4, y: 39 }, bf: { x: cx - 5, y: footY }, fk: { x: cx + 4, y: 39 }, ff: { x: cx + 6, y: footY }, be: { x: cx + 2, y: 27 }, bh: { x: cx - 1, y: 29 }, fe: { x: cx + 4, y: 22 }, fh: { x: cx + 8, y: 23 }, wa: -0.45 },
            { bob: 1, lean: 2, bk: { x: cx - 4, y: 39 }, bf: { x: cx - 6, y: footY }, fk: { x: cx + 5, y: 39 }, ff: { x: cx + 8, y: footY }, be: { x: cx + (weapon === 'dagger' ? 6 : -1), y: 27 }, bh: { x: cx + (weapon === 'dagger' ? 9 : -4), y: 27 }, fe: { x: cx + 5, y: 26 }, fh: { x: cx + 10, y: 26 }, wa: 0.25 },
            { bob: 0, lean: 1, bk: { x: cx - 3, y: 39 }, bf: { x: cx - 4, y: footY }, fk: { x: cx + 4, y: 39 }, ff: { x: cx + 5, y: footY }, be: { x: cx + 3, y: 27 }, bh: { x: cx + 5, y: 30 }, fe: { x: cx + 4, y: 27 }, fh: { x: cx + 7, y: 30 }, wa: 0.75 },
          ][f]
          bob = meleeAtk.bob; lean = meleeAtk.lean
          backHip = { x: cx - 1 + lean, y: hipY + bob }; backKnee = meleeAtk.bk; backFoot = meleeAtk.bf
          frontHip = { x: cx + 1 + lean, y: hipY + bob }; frontKnee = meleeAtk.fk; frontFoot = meleeAtk.ff
          backElbow = meleeAtk.be; backHand = meleeAtk.bh
          frontElbow = meleeAtk.fe; frontHand = meleeAtk.fh
          weaponAngle = meleeAtk.wa
        }
      }

      const bx = cx + lean
      const by = torsoBaseY + bob
      const headY = headBaseY + bob

      // Quiver on back
      if (colors.quiver) {
        s.line(bx - 4, by - 2, bx - 7, by + 6, '#7f5539', 2)
        s.px(bx - 5, by - 3, '#f8fafc')
        s.px(bx - 3, by - 3, '#ffd60a')
        s.px(bx - 4, by - 4, '#e63946')
      }

      // Backpack for Novice
      if (colors.backpack) {
        s.rect(bx - 7, by + 1, 4, 8, '#7f5539')
        s.rect(bx - 7, by + 1, 4, 2, '#c9b27c')
        s.px(bx - 6, by + 5, '#ffd60a')
      }

      // Wings behind torso
      if (colors.wings) {
        const flap = action === 'walk' ? (f % 3) - 1 : action === 'attack' ? (f === 0 ? -2 : 1) : (f === 1 ? 1 : 0)
        const wCol = colors.wingStyle === 'angel' || colors.wingStyle === 'seraph' ? '#f8fafc' : shade(body, -0.3)
        const wTip = colors.wingStyle === 'seraph' ? '#ffd60a' : colors.wingStyle === 'angel' ? '#cbd5e1' : colors.accent
        s.line(bx - 3, by + 2, bx - 10, by - 4 + flap, wCol, 2)
        s.line(bx - 10, by - 4 + flap, bx - 13, by + 1 + flap, wTip, 2)
        s.line(bx - 7, by + 3 + flap, bx - 11, by + 7 + flap, shade(wCol, -0.18), 1)
      }

      // Flowing Hero Cape / Scarf behind torso
      if (colors.cape) {
        const sway = action === 'walk' ? (f % 2 === 0 ? -3 : -1) : action === 'attack' ? -4 : 0
        s.line(bx - 3, by + 1, bx - 8 + sway, by + 12, colors.cape, 3)
        s.line(bx - 4, by + 2, bx - 7 + sway, by + 13, shade(colors.cape, -0.25), 2)
      }
      if (colors.scarf) {
        const scarfSway = action === 'walk' ? (f % 2 === 0 ? -3 : -1) : action === 'attack' ? -3 : 0
        s.line(bx - 2, by, bx - 7 + scarfSway, by + 4, colors.scarf, 2)
      }

      drawLeg(s, backHip, backKnee, backFoot, legDark, bootDark, 1)
      if (weapon === 'bow') {
        drawWeaponInHand(s, backHand, 'bow', weaponColor, weaponAngle, action, f, frontHand, colors.jobId)
      }
      drawArm(s, { x: bx + 2, y: by + 2 }, backElbow, backHand, bodyDark, skinDark, colors.accent)
      if ((weapon === 'dagger' || colors.dualDaggers) && (action === 'attack' || colors.jobId === 'assassin')) {
        drawWeaponInHand(s, backHand, 'dagger', weaponColor, action === 'attack' && f === 2 ? -0.1 : 0.4, action, f, undefined, colors.jobId)
      }

      if (colors.shieldColor) {
        s.rect(backHand.x - 1, backHand.y - 3, 5, 7, shade(colors.shieldColor, -0.2))
        s.rect(backHand.x, backHand.y - 2, 3, 5, colors.shieldColor)
        s.rect(backHand.x + 1, backHand.y - 1, 2, 3, colors.shieldCrest ?? colors.accent)
      }

      // Torso (layered tunic/armor + belt + skirt/coat hem)
      s.rect(bx - 3, by, 7, 10, body)
      s.rect(bx - 3, by, 2, 10, bodyDark) // rear shading
      s.rect(bx + 1, by + 1, 3, 4, bodyHi) // chest highlight
      // Collar / neck sash
      s.rect(bx - 2, by, 5, 2, colors.scarf ?? bodyHi)
      // Leather/gold belt & buckle
      s.rect(bx - 3, by + 7, 7, 1, shade(colors.accent, -0.2))
      s.rect(bx + 1, by + 7, 2, 1, '#ffd60a')
      // Lower coat/tunic skirt
      if (colors.armorStyle === 'robe' || colors.armorStyle === 'arch_robe' || colors.armorStyle === 'vestment') {
        s.rect(bx - 4, by + 8, 8, 6, bodyDark)
        s.rect(bx - 2, by + 8, 5, 6, body)
        s.rect(bx + 1, by + 8, 2, 6, colors.accent)
      } else {
        s.rect(bx - 3, by + 8, 7, 3, bodyDark)
      }
      if (colors.skeleton) {
        s.px(bx, by + 2, bodyDark); s.px(bx, by + 4, bodyDark); s.px(bx, by + 6, bodyDark)
      }

      drawLeg(s, frontHip, frontKnee, frontFoot, legCol, bootCol, 1)

      // Back hair locks (if long/ponytail)
      drawHairBackLayer(s, bx, headY, 'side', colors)

      // Head (sculpted rounded profile)
      s.rect(bx - 4, headY, 8, 2, skinHi)
      s.rect(bx - 4, headY + 2, 9, 5, skin)
      s.rect(bx - 3, headY + 7, 8, 2, skin)
      s.rect(bx - 2, headY + 9, 6, 1, skinDark)
      s.rect(bx - 1, headY + 10, 3, 1, skinDeep) // neck
      s.px(bx - 3, headY + 5, skinDark) // ear

      if (colors.goblinEars) {
        s.line(bx - 4, headY + 4, bx - 8, headY + 2, skin, 2)
        s.px(bx - 8, headY + 2, skinDark)
      }
      if (!blink) {
        s.px(bx + 3, headY + 5, eyeCol)
        s.px(bx + 2, headY + 5, '#ffffff')
        s.px(bx + 2, headY + 6, eyeCol)
        s.px(bx + 3, headY + 6, eyeCol)
      } else {
        s.rect(bx + 2, headY + 6, 2, 1, skinDark)
      }
      if (!colors.skeleton) {
        s.px(bx + 1, headY + 7, shade(skin, -0.08))
      }
      s.px(bx + 3, headY + 8, skinDark)

      drawHatOrHair(s, bx, headY, 'side', colors)
      if (colors.halo) {
        s.rect(bx - 3, headY - 6, 7, 1, '#ffd60a')
        s.px(cx + lean, headY - 6, '#ffffff')
      }
      if (colors.horns) {
        s.px(bx - 3, headY - 1, '#f1e9d2'); s.px(bx - 4, headY - 3, '#f1e9d2')
        s.px(bx + 2, headY - 1, '#f1e9d2'); s.px(bx + 3, headY - 3, '#f1e9d2')
      }

      // Sculpted shoulder pauldron
      if (colors.shoulderPads) {
        s.rect(bx - 2, by, 5, 3, bodyHi)
        s.rect(bx - 1, by + 2, 4, 1, bodyDark)
        s.rect(bx - 1, by, 3, 1, colors.accent)
      }

      drawArm(s, { x: bx, y: by + 2 }, frontElbow, frontHand, body, skin, colors.accent)
      if (weapon !== 'bow') {
        drawWeaponInHand(s, frontHand, weapon, weaponColor, weaponAngle, action, f, undefined, colors.jobId)
      }

      return s.toCanvas(true, dir === 'left')
    }

    // Front ('down') or Back ('up') orthographic rig
    const isUp = dir === 'up'
    let bob = 0
    let leftHip: Pt = { x: cx - 2, y: hipY }
    let leftKnee: Pt = { x: cx - 2, y: 39 }
    let leftFoot: Pt = { x: cx - 2, y: footY }
    let rightHip: Pt = { x: cx + 2, y: hipY }
    let rightKnee: Pt = { x: cx + 2, y: 39 }
    let rightFoot: Pt = { x: cx + 2, y: footY }

    let leftElbow: Pt = { x: cx - 6, y: 27 }
    let leftHand: Pt = { x: cx - 6, y: 30 }
    let rightElbow: Pt = { x: cx + 6, y: 27 }
    let rightHand: Pt = { x: cx + 6, y: 30 }
    let weaponAngle = isUp ? -1.4 : 0.7

    if (action === 'idle') {
      const br = f === 1 ? 1 : 0
      bob = br
      leftHip = { x: cx - 2, y: hipY + br }
      rightHip = { x: cx + 2, y: hipY + br }
      leftElbow = { x: cx - 6, y: 27 + br }
      leftHand = { x: cx - 6, y: 30 + br }
      rightElbow = { x: cx + 6, y: 27 + br }
      rightHand = { x: cx + 6, y: 30 + br }
      weaponAngle = weapon === 'staff' ? -1.5 : isUp ? -1.4 : -0.9
    } else if (action === 'walk') {
      const fWalk = [
        { bob: 0, lk: { x: cx - 2, y: 39 }, lf: { x: cx - 2, y: footY }, rk: { x: cx + 2, y: 38 }, rf: { x: cx + 2, y: footY - 2 }, le: { x: cx - 6, y: 26 }, lh: { x: cx - 7, y: 28 }, re: { x: cx + 6, y: 27 }, rh: { x: cx + 6, y: 31 }, wa: isUp ? -1.6 : 0.4 },
        { bob: -1, lk: { x: cx - 2, y: 39 }, lf: { x: cx - 2, y: footY }, rk: { x: cx + 2, y: 37 }, rf: { x: cx + 2, y: footY - 3 }, le: { x: cx - 6, y: 26 }, lh: { x: cx - 6, y: 30 }, re: { x: cx + 6, y: 26 }, rh: { x: cx + 6, y: 29 }, wa: isUp ? -1.4 : -0.4 },
        { bob: 0, lk: { x: cx - 2, y: 38 }, lf: { x: cx - 2, y: footY - 2 }, rk: { x: cx + 2, y: 39 }, rf: { x: cx + 2, y: footY }, le: { x: cx - 6, y: 27 }, lh: { x: cx - 6, y: 31 }, re: { x: cx + 6, y: 26 }, rh: { x: cx + 7, y: 28 }, wa: isUp ? -1.2 : -1.1 },
        { bob: 0, lk: { x: cx - 2, y: 38 }, lf: { x: cx - 2, y: footY - 2 }, rk: { x: cx + 2, y: 39 }, rf: { x: cx + 2, y: footY }, le: { x: cx - 6, y: 27 }, lh: { x: cx - 6, y: 31 }, re: { x: cx + 6, y: 26 }, rh: { x: cx + 7, y: 28 }, wa: isUp ? -1.2 : -1.0 },
        { bob: -1, lk: { x: cx - 2, y: 37 }, lf: { x: cx - 2, y: footY - 3 }, rk: { x: cx + 2, y: 39 }, rf: { x: cx + 2, y: footY }, le: { x: cx - 6, y: 26 }, lh: { x: cx - 6, y: 29 }, re: { x: cx + 6, y: 26 }, rh: { x: cx + 6, y: 30 }, wa: isUp ? -1.4 : -0.3 },
        { bob: 0, lk: { x: cx - 2, y: 39 }, lf: { x: cx - 2, y: footY }, rk: { x: cx + 2, y: 38 }, rf: { x: cx + 2, y: footY - 2 }, le: { x: cx - 6, y: 26 }, lh: { x: cx - 7, y: 28 }, re: { x: cx + 6, y: 27 }, rh: { x: cx + 6, y: 31 }, wa: isUp ? -1.6 : 0.4 },
      ][f]
      bob = fWalk.bob
      leftHip = { x: cx - 2, y: hipY + bob }; leftKnee = fWalk.lk; leftFoot = fWalk.lf
      rightHip = { x: cx + 2, y: hipY + bob }; rightKnee = fWalk.rk; rightFoot = fWalk.rf
      leftElbow = fWalk.le; leftHand = fWalk.lh
      rightElbow = fWalk.re; rightHand = fWalk.rh
      weaponAngle = weapon === 'staff' ? -1.5 : fWalk.wa
    } else {
      const fAtk = [
        { bob: 1, lf: { x: cx - 3, y: footY }, rf: { x: cx + 3, y: footY }, le: { x: cx - 7, y: 26 }, lh: { x: cx - 7, y: 29 }, re: { x: cx + 6, y: 22 }, rh: { x: cx + 7, y: 18 }, wa: isUp ? -2.1 : -2.2 },
        { bob: 0, lf: { x: cx - 3, y: footY }, rf: { x: cx + 3, y: footY }, le: { x: cx - 6, y: 27 }, lh: { x: cx - 7, y: 30 }, re: { x: cx + 7, y: 24 }, rh: { x: cx + 8, y: isUp ? 19 : 25 }, wa: isUp ? -1.6 : 0.3 },
        { bob: 1, lf: { x: cx - 3, y: footY }, rf: { x: cx + 3, y: footY }, le: { x: cx - 7, y: 26 }, lh: { x: cx - 7, y: isUp ? 22 : 31 }, re: { x: cx + 5, y: isUp ? 20 : 28 }, rh: { x: cx + 4, y: isUp ? 15 : 33 }, wa: isUp ? -1.55 : 1.35 },
        { bob: 0, lf: { x: cx - 2, y: footY }, rf: { x: cx + 2, y: footY }, le: { x: cx - 6, y: 27 }, lh: { x: cx - 6, y: 30 }, re: { x: cx + 6, y: 27 }, rh: { x: cx + 6, y: 31 }, wa: isUp ? -1.4 : 0.8 },
      ][f]
      bob = fAtk.bob
      leftHip = { x: cx - 2, y: hipY + bob }; leftKnee = { x: cx - 3, y: 39 }; leftFoot = fAtk.lf
      rightHip = { x: cx + 2, y: hipY + bob }; rightKnee = { x: cx + 3, y: 39 }; rightFoot = fAtk.rf
      leftElbow = fAtk.le; leftHand = fAtk.lh
      rightElbow = fAtk.re; rightHand = fAtk.rh
      weaponAngle = weapon === 'bow' ? (isUp ? -1.57 : 1.57) : fAtk.wa
    }

    const by = torsoBaseY + bob
    const headY = headBaseY + bob

    if (colors.wings) {
      const flap = action === 'walk' ? (f % 3) - 1 : action === 'attack' ? (f === 0 ? -2 : 1) : (f === 1 ? 1 : 0)
      const wCol = colors.wingStyle === 'angel' || colors.wingStyle === 'seraph' ? '#f8fafc' : shade(body, -0.3)
      const wTip = colors.wingStyle === 'seraph' ? '#ffd60a' : colors.wingStyle === 'angel' ? '#cbd5e1' : colors.accent
      s.line(cx - 4, by + 2, cx - 12, by - 4 + flap, wCol, 2)
      s.line(cx + 4, by + 2, cx + 12, by - 4 + flap, wCol, 2)
      s.line(cx - 12, by - 4 + flap, cx - 14, by + 1 + flap, wTip, 2)
      s.line(cx + 12, by - 4 + flap, cx + 14, by + 1 + flap, wTip, 2)
      s.line(cx - 8, by + 3 + flap, cx - 12, by + 6 + flap, shade(wCol, -0.18), 1)
      s.line(cx + 8, by + 3 + flap, cx + 12, by + 6 + flap, shade(wCol, -0.18), 1)
    }

    if (colors.cape && !isUp) {
      const sway = action === 'walk' && f % 2 === 1 ? 1 : 0
      s.rect(cx - 6 - sway, by + 2, 2, 12, shade(colors.cape, -0.25))
      s.rect(cx + 5 + sway, by + 2, 2, 12, shade(colors.cape, -0.25))
    }

    if (isUp && weapon) {
      drawWeaponInHand(s, rightHand, weapon, weaponColor, weaponAngle, action, f, leftHand, colors.jobId)
    }

    const leftBack = leftFoot.y < footY
    const rightBack = rightFoot.y < footY
    drawLeg(s, leftHip, leftKnee, leftFoot, leftBack ? legDark : legCol, leftBack ? bootDark : bootCol, -1)
    drawLeg(s, rightHip, rightKnee, rightFoot, rightBack ? legDark : legCol, rightBack ? bootDark : bootCol, 1)

    // Layered Torso (9px wide chest, 3-tone shading, collar, belt + buckle, coat/robe skirt)
    s.rect(cx - 4, by, 9, 10, body)
    s.rect(cx - 4, by + 1, 1, 9, bodyDark)
    s.rect(cx + 4, by + 1, 1, 9, bodyDark)
    s.rect(cx - 2, by + 1, 5, 4, bodyHi)
    // Collar / scarf
    s.rect(cx - 3, by, 7, 2, colors.scarf ?? bodyHi)
    s.px(cx, by + 2, colors.accent)
    // Belt + gold buckle
    s.rect(cx - 4, by + 7, 9, 1, shade(colors.accent, -0.25))
    s.rect(cx - 1, by + 7, 3, 1, '#ffd60a')
    // Lower tunic/robe/armor hem
    if (colors.armorStyle === 'robe' || colors.armorStyle === 'arch_robe' || colors.armorStyle === 'vestment') {
      s.rect(cx - 4, by + 8, 9, 6, bodyDark)
      s.rect(cx - 3, by + 8, 7, 5, body)
      s.rect(cx - 1, by + 8, 3, 6, colors.accent)
    } else {
      s.rect(cx - 4, by + 8, 9, 3, bodyDark)
      s.rect(cx - 2, by + 8, 5, 2, body)
    }
    if (colors.armorStyle === 'paladin_plate') {
      s.line(cx, by + 2, cx, by + 5, '#ffd60a', 1)
      s.line(cx - 1, by + 3, cx + 1, by + 3, '#ffd60a', 1)
    }
    if (colors.skeleton) {
      s.px(cx - 1, by + 2, bodyDark); s.px(cx + 1, by + 2, bodyDark)
      s.px(cx - 1, by + 4, bodyDark); s.px(cx + 1, by + 4, bodyDark)
      s.px(cx - 1, by + 6, bodyDark); s.px(cx + 1, by + 6, bodyDark)
    }
    if (colors.backpack && isUp) {
      s.rect(cx - 3, by + 2, 7, 7, '#7f5539')
      s.rect(cx - 3, by + 2, 7, 2, '#c9b27c')
      s.px(cx, by + 5, '#ffd60a')
    }
    if (colors.quiver && isUp) {
      s.line(cx + 3, by - 2, cx - 2, by + 7, '#7f5539', 2)
      s.px(cx + 3, by - 3, '#f8fafc')
      s.px(cx + 4, by - 3, '#ffd60a')
      s.px(cx + 2, by - 4, '#e63946')
    }
    if (colors.cape && isUp) {
      const sway = action === 'walk' && f % 2 === 1 ? 1 : 0
      s.rect(cx - 4, by + 1, 9, 11 + sway, colors.cape)
      s.rect(cx - 3, by + 2, 7, 9 + sway, shade(colors.cape, -0.22))
    }

    // Back hair flowing down behind shoulders
    drawHairBackLayer(s, cx, headY, isUp ? 'up' : 'down', colors)

    // Head (11px wide sculpted anime/MMORPG chibi face)
    s.rect(cx - 4, headY, 9, 2, skinHi)
    s.rect(cx - 5, headY + 2, 11, 5, skin)
    s.rect(cx - 4, headY + 7, 9, 2, skin)
    s.rect(cx - 3, headY + 9, 7, 1, skinDark)
    s.rect(cx - 1, headY + 10, 3, 1, skinDeep) // neck
    if (!isUp) {
      s.px(cx - 6, headY + 4, skinDark); s.px(cx - 6, headY + 5, skinDark)
      s.px(cx + 6, headY + 4, skinDark); s.px(cx + 6, headY + 5, skinDark)
    }
    if (colors.goblinEars) {
      s.line(cx - 5, headY + 4, cx - 9, headY + 2, skin, 2)
      s.line(cx + 5, headY + 4, cx + 9, headY + 2, skin, 2)
    }
    if (!isUp) {
      if (!blink) {
        // Expressive 2px-tall eyes with white highlight
        s.px(cx - 3, headY + 5, '#ffffff')
        s.px(cx - 2, headY + 5, eyeCol)
        s.px(cx - 3, headY + 6, eyeCol)
        s.px(cx - 2, headY + 6, eyeCol)

        s.px(cx + 3, headY + 5, '#ffffff')
        s.px(cx + 2, headY + 5, eyeCol)
        s.px(cx + 2, headY + 6, eyeCol)
        s.px(cx + 3, headY + 6, eyeCol)
      } else {
        s.rect(cx - 3, headY + 6, 2, 1, skinDark)
        s.rect(cx + 2, headY + 6, 2, 1, skinDark)
      }
      if (!colors.skeleton) {
        s.px(cx - 4, headY + 7, shade(skin, -0.08))
        s.px(cx + 4, headY + 7, shade(skin, -0.08))
      }
      s.px(cx, headY + 8, skinDark)
    }

    drawHatOrHair(s, cx, headY, isUp ? 'up' : 'down', colors)
    if (colors.halo) {
      s.rect(cx - 3, headY - 6, 7, 1, '#ffd60a')
      s.px(cx, headY - 6, '#ffffff')
    }
    if (colors.horns) {
      s.px(cx - 4, headY - 1, '#f1e9d2'); s.px(cx - 5, headY - 3, '#f1e9d2')
      s.px(cx + 4, headY - 1, '#f1e9d2'); s.px(cx + 5, headY - 3, '#f1e9d2')
    }

    // Shoulder pauldrons
    if (colors.shoulderPads) {
      s.rect(cx - 7, by, 4, 3, bodyHi)
      s.rect(cx + 4, by, 4, 3, bodyHi)
      s.rect(cx - 6, by, 3, 1, colors.accent)
      s.rect(cx + 4, by, 3, 1, colors.accent)
    }

    drawArm(s, { x: cx - 5, y: by + 2 }, leftElbow, leftHand, bodyDark, skinDark, colors.accent)
    drawArm(s, { x: cx + 5, y: by + 2 }, rightElbow, rightHand, body, skin, colors.accent)

    if (colors.shieldColor) {
      s.rect(leftHand.x - 2, leftHand.y - 3, 6, 7, shade(colors.shieldColor, -0.22))
      s.rect(leftHand.x - 1, leftHand.y - 2, 4, 5, colors.shieldColor)
      s.rect(leftHand.x, leftHand.y - 1, 2, 3, colors.shieldCrest ?? colors.accent)
    }

    if (!isUp && weapon) {
      drawWeaponInHand(s, rightHand, weapon, weaponColor, weaponAngle, action, f, leftHand, colors.jobId)
    }
    if ((weapon === 'dagger' || colors.dualDaggers) && ((action === 'attack' && f === 2) || colors.jobId === 'assassin')) {
      drawWeaponInHand(s, leftHand, 'dagger', weaponColor, isUp ? -1.7 : 1.7, action, f, undefined, colors.jobId)
    }

    return s.toCanvas(true, false)
  })
}

/* ---------------- Pets & ผอบ (Phao-ob) 2D Models ---------------- */

function renderPhaoPet(spec: PetModelSpec, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(28, 30)
  const primary = spec.colors.primary
  const secondary = spec.colors.secondary
  const accent = spec.colors.accent
  const dark = shade(secondary, -0.35)
  const hi = shade(primary, 0.35)
  const gold = spec.petId === 'phao_phantom' ? '#c084fc' : '#f59e0b'
  const goldHi = spec.petId === 'phao_phantom' ? '#f0abfc' : '#fef08a'
  const cx = 14

  let bob = 0
  let leanX = 0
  let lidLift = 0
  let orbPulse = 0

  if (action === 'idle') {
    bob = f === 1 ? -1 : f === 3 ? 1 : 0
    orbPulse = f % 2
  } else if (action === 'walk') {
    bob = [-1, -2, -1, 0, -1, 0][f % 6]
    leanX = dir === 'right' || dir === 'left' ? 1 : 0
    orbPulse = f % 3 === 0 ? 1 : 0
  } else {
    const seq = [
      { bob: -1, lift: 1, pulse: 1 },
      { bob: -2, lift: 4, pulse: 2 },
      { bob: -1, lift: 3, pulse: 2 },
      { bob: 0, lift: 1, pulse: 1 },
    ][f % 4]
    bob = seq.bob
    lidLift = seq.lift
    orbPulse = seq.pulse
  }

  const by = 18 + bob
  const bx = cx + leanX

  // Ethereal spirit mist & aura sparks under/around the Phao-ob
  if (action === 'walk') {
    const mistX = bx - 5 - (f % 3)
    s.px(mistX, by + 5, accent)
    s.px(mistX - 2, by + 4, hi)
  }

  // Stepped Thai Lotus Pedestal Base (ฐานบัว)
  s.rect(bx - 5, by + 6, 11, 2, dark)
  s.rect(bx - 4, by + 5, 9, 1, gold)
  s.rect(bx - 2, by + 3, 5, 2, secondary)
  s.rect(bx - 4, by + 2, 9, 2, gold)
  // Upturned lotus petals around the base collar
  s.px(bx - 5, by + 1, hi)
  s.px(bx - 3, by + 1, accent)
  s.px(bx, by + 1, goldHi)
  s.px(bx + 3, by + 1, accent)
  s.px(bx + 5, by + 1, hi)

  // Ceremonial Rounded Bowl Body (ตัวผอบ)
  s.rect(bx - 5, by - 4, 11, 6, primary)
  s.rect(bx - 6, by - 3, 13, 4, secondary)
  s.rect(bx - 5, by - 3, 11, 4, primary)
  s.rect(bx - 4, by - 2, 4, 2, hi)
  // Rim filigree band
  s.rect(bx - 6, by - 4, 13, 1, gold)
  s.rect(bx - 5, by + 1, 11, 1, gold)

  // Archetype-specific ornaments on the body & side kanok fins (ลายกนก)
  if (spec.petId === 'phao_lotus') {
    // Glass lotus petals cradling the bowl
    s.line(bx - 6, by, bx - 7, by - 3, hi, 1)
    s.line(bx + 6, by, bx + 7, by - 3, hi, 1)
    s.px(bx - 7, by - 4, accent)
    s.px(bx + 7, by - 4, accent)
  } else if (spec.petId === 'phao_gold_naga') {
    // Twin Naga crests curving upward from shoulders
    s.line(bx - 6, by - 2, bx - 8, by - 6, gold, 1)
    s.px(bx - 8, by - 7, accent)
    s.line(bx + 6, by - 2, bx + 8, by - 6, gold, 1)
    s.px(bx + 8, by - 7, accent)
  } else if (spec.petId === 'phao_celestial') {
    // Orbiting Sun (gold) and Crescent Moon (cyan-white)
    const orbit = action === 'idle' ? f % 4 : f % 6
    const sunX = bx + (orbit < 2 ? -8 : 8)
    const moonX = bx + (orbit < 2 ? 8 : -8)
    s.rect(sunX, by - 5, 2, 2, '#fbbf24')
    s.px(moonX, by - 3, '#67e8f9')
    s.px(moonX, by - 4, '#ffffff')
  } else if (spec.petId === 'phao_phantom') {
    // Spirit seal talisman strips & ghostly wisps
    s.rect(bx - 1, by - 2, 3, 3, '#f43f5e')
    const wispY = by - 5 - (f % 2)
    s.px(bx - 8, wispY, accent)
    s.px(bx + 8, wispY - 1, hi)
  }

  // Directional Emblem / Core Clasp
  if (dir === 'down') {
    s.rect(bx - 1, by - 3, 3, 3, accent)
    s.px(bx, by - 2, '#ffffff')
  } else if (dir === 'up') {
    s.rect(bx - 2, by - 3, 5, 3, dark)
    s.px(bx, by - 2, gold)
  } else {
    // Side profile medallion + kanok tail fin on back side
    s.rect(bx + 2, by - 3, 2, 3, accent)
    s.line(bx - 6, by - 2, bx - 8, by - 5, gold, 1)
  }

  // Glowing Spirit Core revealed when the Lid lifts open on Attack!
  if (lidLift > 0) {
    const coreY = by - 5 - Math.floor(lidLift / 2)
    s.rect(bx - 3, coreY, 7, 3, accent)
    s.rect(bx - 1, coreY, 3, 2, '#ffffff')
    if (lidLift >= 3) {
      // Bursting spirit bolts around the open mouth
      s.px(bx - 7, coreY - 2, goldHi)
      s.px(bx + 7, coreY - 2, goldHi)
      s.px(bx, coreY - 3, '#ffffff')
    }
  } else if (orbPulse > 0) {
    s.px(bx, by - 2, '#ffffff')
  }

  // Conical Tiered Spire Lid (ฝาผอบทรงยอดแหลม / ยอดฉัตร)
  const lidY = by - 5 - lidLift
  s.rect(bx - 5, lidY, 11, 2, primary)
  s.rect(bx - 6, lidY + 1, 13, 1, gold)
  s.rect(bx - 4, lidY - 2, 9, 2, secondary)
  s.rect(bx - 3, lidY - 3, 7, 1, goldHi)
  s.rect(bx - 2, lidY - 5, 5, 2, primary)
  s.rect(bx - 1, lidY - 7, 3, 2, gold)
  // Sacred jewel finial tip (ยอดเม็ดน้ำค้าง)
  s.px(bx, lidY - 8, accent)
  s.px(bx, lidY - 9, orbPulse > 0 || lidLift > 0 ? '#ffffff' : goldHi)

  return s.toCanvas(true, dir === 'left')
}

function renderCreaturePet(spec: PetModelSpec, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(28, 30)
  const c1 = spec.colors.primary
  const c2 = spec.colors.secondary
  const c3 = spec.colors.accent
  const hi = shade(c1, 0.35)
  const dark = shade(c2, -0.25)
  const cx = 14
  const footY = 25

  const bob =
    action === 'idle'
      ? f === 1
        ? -1
        : 0
      : action === 'walk'
        ? [-1, -2, 0, -1, -2, 0][f % 6]
        : [-1, -2, 1, 0][f % 4]

  switch (spec.archetype) {
    case 'buddy_slime': {
      const squish = action === 'attack' && (f === 1 || f === 2) ? 2 : action === 'walk' && f % 3 === 1 ? 1 : 0
      const by = 18 + bob + squish
      s.rect(cx - 5 - squish, by, 11 + squish * 2, 6 - Math.min(2, squish), c1)
      s.rect(cx - 4, by - 3 + squish, 9, 4, c1)
      s.rect(cx - 2, by - 4 + squish, 5, 2, hi)
      s.rect(cx - 4 - squish, by + 4 - squish, 9 + squish * 2, 2, c2)
      s.px(cx - 2, by - 2 + squish, c3)
      if (dir !== 'up') {
        const ex = dir === 'right' ? 2 : 0
        s.px(cx - 2 + ex, by + squish, '#1a1423')
        s.px(cx + 2 + ex, by + squish, '#1a1423')
        s.px(cx - 3 + ex, by + 1 + squish, '#ff9aa2')
        s.px(cx + 3 + ex, by + 1 + squish, '#ff9aa2')
      }
      if (action === 'attack' && f >= 1 && f <= 2) {
        s.rect(cx + 6, by, 3, 2, c3)
      }
      return s.toCanvas(true, dir === 'left')
    }

    case 'flame_fox': {
      const by = 17 + bob
      const wag = f % 2 === 0 ? -1 : 1
      const stride = action === 'walk' ? (f % 2 === 0 ? 1 : -1) : 0
      // Flame tail
      s.line(cx - 4, by + 3, cx - 9, by - 1 + wag, c1, 3)
      s.line(cx - 8, by - 1 + wag, cx - 10, by - 4 + wag, c3, 2)
      // Legs
      s.line(cx - 3, by + 5, cx - 3 + stride, footY, c2, 2)
      s.line(cx + 3, by + 5, cx + 3 - stride, footY, c1, 2)
      // Torso & white chest ruff
      s.rect(cx - 4, by + 1, 8, 5, c1)
      s.rect(cx + 1, by + 1, 3, 4, '#fff3e0')
      // Fox head & pointed ears
      s.rect(cx - 2, by - 5, 8, 6, c1)
      s.rect(cx + 4, by - 2, 3, 2, hi)
      s.line(cx - 1, by - 5, cx - 2, by - 9, c2, 2)
      s.line(cx + 3, by - 5, cx + 4, by - 9, c2, 2)
      s.px(cx - 2, by - 9, c3)
      s.px(cx + 4, by - 9, c3)
      if (dir !== 'up') {
        s.px(cx + 3, by - 3, '#1a1423')
        s.px(cx + 6, by - 2, '#1a1423')
      }
      if (action === 'attack' && (f === 1 || f === 2)) {
        s.rect(cx + 7, by - 3, 3, 3, c3)
        s.px(cx + 9, by - 2, '#ffffff')
      }
      return s.toCanvas(true, dir === 'left')
    }

    case 'crystal_owl': {
      const by = 14 + bob
      const flap = action === 'idle' ? (f % 2 === 0 ? 0 : -1) : [-3, -1, 2, 3, 1, -2][f % 6]
      // Wings
      s.line(cx - 4, by + 2, cx - 9, by + flap, c2, 2)
      s.line(cx + 4, by + 2, cx + 9, by + flap, c2, 2)
      // Feathered oval body
      s.rect(cx - 4, by, 9, 8, c1)
      s.rect(cx - 2, by + 2, 5, 5, hi)
      s.rect(cx - 1, by + 3, 3, 3, c3) // crystal core on chest
      // Ear tufts
      s.line(cx - 3, by - 3, cx - 5, by - 6, c2, 2)
      s.line(cx + 3, by - 3, cx + 5, by - 6, c2, 2)
      s.rect(cx - 4, by - 4, 9, 5, c1)
      if (dir !== 'up') {
        s.rect(cx - 3, by - 2, 2, 2, c3)
        s.rect(cx + 2, by - 2, 2, 2, c3)
        s.px(cx, by, '#fbbf24')
      }
      // Talons
      s.px(cx - 2, by + 8, '#fbbf24')
      s.px(cx + 2, by + 8, '#fbbf24')
      if (action === 'attack' && (f === 1 || f === 2)) {
        s.px(cx, by - 7, '#ffffff')
        s.rect(cx + 6, by - 1, 3, 2, c3)
      }
      return s.toCanvas(true, dir === 'left')
    }

    case 'moonlight_firefly': {
      const by = 14 + bob
      const flap = [-2, 0, 2, 0, -2, 1][f % 6]
      // Iridescent fairy wings
      s.rect(cx - 7, by - 2 + flap, 4, 4, '#e0f2fe')
      s.rect(cx + 4, by - 2 + flap, 4, 4, '#e0f2fe')
      // Glowing lantern abdomen
      s.rect(cx - 3, by - 2, 7, 7, c2)
      s.rect(cx - 2, by, 5, 5, c1)
      s.rect(cx - 1, by + 2, 3, 3, c3)
      // Antennae
      s.line(cx - 1, by - 2, cx - 3, by - 6, hi, 1)
      s.line(cx + 1, by - 2, cx + 3, by - 6, hi, 1)
      s.px(cx - 3, by - 6, c3)
      s.px(cx + 3, by - 6, c3)
      if (dir !== 'up') {
        s.px(cx - 1, by, '#1a1423')
        s.px(cx + 1, by, '#1a1423')
      }
      if (action === 'attack' && (f === 1 || f === 2)) {
        s.px(cx - 6, by + 5, '#ffffff')
        s.px(cx + 6, by + 5, '#ffffff')
      }
      return s.toCanvas(true, dir === 'left')
    }

    case 'gem_raccoon': {
      const by = 16 + bob
      const stride = action === 'walk' ? (f % 2 === 0 ? 1 : -1) : 0
      // Striped tail
      s.line(cx - 4, by + 5, cx - 9, by + 2 + (f % 2), c2, 3)
      s.px(cx - 7, by + 3, hi)
      s.px(cx - 9, by + 2 + (f % 2), dark)
      // Legs & body
      s.line(cx - 2, by + 6, cx - 3 + stride, footY, dark, 2)
      s.line(cx + 2, by + 6, cx + 3 - stride, footY, c2, 2)
      s.rect(cx - 4, by + 1, 9, 6, c1)
      s.rect(cx - 4, by + 4, 4, 3, '#b45309') // merchant satchel
      // Raccoon head & bandit mask
      s.rect(cx - 4, by - 5, 9, 6, c1)
      s.px(cx - 4, by - 6, c2)
      s.px(cx + 4, by - 6, c2)
      if (dir !== 'up') {
        s.rect(cx - 3, by - 3, 7, 2, dark)
        s.px(cx - 2, by - 3, '#ffffff')
        s.px(cx + 2, by - 3, '#ffffff')
      }
      // Sparkling gem held in paws
      s.rect(cx + 4, by + 2, 3, 3, c3)
      if (action === 'attack' || f % 2 === 0) s.px(cx + 5, by + 2, '#ffffff')
      return s.toCanvas(true, dir === 'left')
    }

    case 'aurora_cloud_dragon':
    default: {
      const by = 14 + bob
      const wing = [-3, -1, 2, 0, -2, 1][f % 6]
      // Swirling serpentine tail & cloud tuft
      s.line(cx - 4, by + 5, cx - 10, by + 3 + (f % 2), c2, 2)
      s.px(cx - 11, by + 2 + (f % 2), c3)
      // Wings
      s.line(cx - 2, by, cx - 8, by - 5 + wing, c2, 2)
      s.line(cx + 1, by, cx - 4, by - 6 + wing, c3, 2)
      // Torso & head
      s.rect(cx - 4, by + 1, 9, 6, c1)
      s.rect(cx - 2, by + 4, 5, 3, '#e0f2fe')
      s.rect(cx + 1, by - 5, 7, 5, c1)
      s.rect(cx + 5, by - 3, 4, 3, hi)
      // Crystal horns
      s.line(cx + 2, by - 5, cx, by - 9, c3, 1)
      s.line(cx + 4, by - 5, cx + 3, by - 9, '#ffffff', 1)
      if (dir !== 'up') {
        s.px(cx + 5, by - 4, '#ffd60a')
      }
      if (action === 'attack' && (f === 1 || f === 2)) {
        s.rect(cx + 9, by - 3, 4, 2, c3)
        s.px(cx + 12, by - 3, '#ffffff')
      }
      return s.toCanvas(true, dir === 'left')
    }
  }
}

export function petSprite(
  petId: string,
  dir: Dir = 'down',
  action: SpriteAction = 'idle',
  frame = 0,
  attackFrameOverride?: number,
  level = 1,
  stars = 1,
): HTMLCanvasElement {
  const normAction: SpriteAction =
    action === 'skill'
      ? 'attack'
      : action === 'mount' || action === 'dismount'
        ? 'idle'
        : action
  const f =
    normAction === 'attack'
      ? Math.abs(attackFrameOverride ?? frame) % 4
      : normAction === 'walk' || normAction === 'run' || normAction === 'follow'
        ? Math.abs(frame) % 6
        : Math.abs(frame) % 4
  const spec = getPetModelSpec(petId)
  const tier = getPetVisualTier(level, stars)
  if (typeof document !== 'undefined') {
    preloadPetSpriteSheet(spec.petId)
  }
  const frameSpec = typeof document !== 'undefined' ? getPetSheetFrameSpec(spec.petId, dir, normAction, f) : null
  const sheetReadyFlag = frameSpec ? 's1' : 's0'
  const key = `hd_pet2d|${spec.petId}|${dir}|${normAction}|${f}|t${tier}|${sheetReadyFlag}`
  return cached(key, () => {
    if (frameSpec && typeof document !== 'undefined') {
      const c = document.createElement('canvas')
      c.width = frameSpec.sw
      c.height = frameSpec.sh
      c.dataset.hdScale = String(frameSpec.hdScale)
      c.dataset.sheetId = frameSpec.sheetId
      c.dataset.anchorX = String(frameSpec.anchorX)
      c.dataset.anchorY = String(frameSpec.anchorY)
      c.dataset.footPadFrac = String(frameSpec.footPadFrac ?? PET_FOOT_PAD_FRAC)
      const ctx = c.getContext('2d')
      if (ctx) {
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        drawSheetFrameSpec(ctx, frameSpec, 0, 0, frameSpec.sw, frameSpec.sh)
        drawPetLevelAndStarFx(ctx, frameSpec.sw, frameSpec.sh, spec, dir, normAction, f, level, stars)
        return c
      }
    }
    return renderHdPetSprite(spec, dir, normAction, f, level, stars)
  })
}

/* ---------------- Mounts 2D Models ---------------- */

function renderMountModel(spec: MountModelSpec, dir: Dir, action: SpriteAction, f: number): HTMLCanvasElement {
  const s = new PixelSurface(44, 38)
  const c1 = spec.colors.primary
  const c2 = spec.colors.secondary
  const accent = spec.colors.accent
  const saddle = spec.colors.saddle
  const hi = shade(c1, 0.32)
  const dark = shade(c2, -0.25)
  const cx = 22
  const footY = 34

  let bob = 0
  let rearTilt = 0
  let wingFlap = 0
  let stride = 0

  if (action === 'idle') {
    bob = f === 1 ? -1 : 0
    wingFlap = [-1, 1, 2, 0][f % 4]
  } else if (action === 'walk') {
    bob = [-1, -2, 0, -1, -2, 0][f % 6]
    stride = [-3, -1, 2, 3, 1, -2][f % 6]
    wingFlap = [-4, -1, 3, 5, 2, -2][f % 6]
  } else {
    const seq = [
      { bob: -1, tilt: -1, wf: -4, st: -2 },
      { bob: -3, tilt: -3, wf: 2, st: 3 },
      { bob: -2, tilt: -2, wf: 4, st: 4 },
      { bob: 0, tilt: 0, wf: 0, st: 1 },
    ][f % 4]
    bob = seq.bob
    rearTilt = seq.tilt
    wingFlap = seq.wf
    stride = seq.st
  }

  const by = 22 + bob

  // Front or Rear perspective (down / up)
  if (dir === 'down' || dir === 'up') {
    const isFront = dir === 'down'
    const lLegY = action === 'walk' && f % 2 === 0 ? footY - 2 : footY
    const rLegY = action === 'walk' && f % 2 === 1 ? footY - 2 : footY

    // Flying wings for dragon
    if (spec.flying) {
      const span = spec.archetype === 'dragon' ? 16 : 14
      s.line(cx - 5, by - 1, cx - span, by - 7 + wingFlap, c2, 3)
      s.line(cx - span, by - 7 + wingFlap, cx - span - 2, by + wingFlap, c1, 2)
      s.line(cx - 5, by, cx - span + 3, by - 4 + wingFlap, accent, 1)
      s.line(cx + 5, by - 1, cx + span, by - 7 + wingFlap, c2, 3)
      s.line(cx + span, by - 7 + wingFlap, cx + span + 2, by + wingFlap, c1, 2)
      s.line(cx + 5, by, cx + span - 3, by - 4 + wingFlap, accent, 1)
    }

    // 4 Legs (front pair & hind peek)
    s.line(cx - 5, by + 6, cx - 5, lLegY, dark, 2)
    s.line(cx + 5, by + 6, cx + 5, rLegY, dark, 2)
    s.line(cx - 3, by + 5, cx - 3, rLegY - 1, c1, 2)
    s.line(cx + 3, by + 5, cx + 3, lLegY - 1, c1, 2)
    if (spec.archetype === 'dragon') {
      s.px(cx - 3, rLegY - 1, accent)
      s.px(cx + 3, lLegY - 1, accent)
    }

    // Broad Chest / Hindquarters
    s.rect(cx - 6, by - 2, 13, 9, c1)
    s.rect(cx - 5, by, 11, 5, hi)
    // Ornate Saddle & Stirrups
    s.rect(cx - 6, by - 3, 13, 3, saddle)
    s.rect(cx - 4, by - 3, 9, 1, accent)

    if (isFront) {
      // Neck & Head facing viewer
      s.rect(cx - 4, by - 10 + rearTilt, 9, 8, c1)
      s.rect(cx - 3, by - 11 + rearTilt, 7, 5, hi)
      // Ears / Horns / Beak
      if (spec.archetype === 'horse') {
        s.line(cx - 3, by - 11 + rearTilt, cx - 4, by - 15 + rearTilt, c2, 1)
        s.line(cx + 3, by - 11 + rearTilt, cx + 4, by - 15 + rearTilt, c2, 1)
        s.rect(cx - 1, by - 12 + rearTilt, 3, 3, accent)
      } else if (spec.archetype === 'wolf' || spec.archetype === 'dog' || spec.archetype === 'cat') {
        s.line(cx - 3, by - 11 + rearTilt, cx - 5, by - 15 + rearTilt, c2, 2)
        s.line(cx + 3, by - 11 + rearTilt, cx + 5, by - 15 + rearTilt, c2, 2)
        s.rect(cx - 2, by - 7 + rearTilt, 5, 3, '#e2e8f0')
      } else if (spec.archetype === 'chocobo') {
        s.rect(cx - 3, by - 12 + rearTilt, 7, 5, '#fef08a')
        s.rect(cx - 1, by - 9 + rearTilt, 3, 3, '#f59e0b') // chocobo beak
      } else if (spec.archetype === 'dragon') {
        s.line(cx - 2, by - 12 + rearTilt, cx - 6, by - 17 + rearTilt, c2, 1)
        s.line(cx + 2, by - 12 + rearTilt, cx + 6, by - 17 + rearTilt, c2, 1)
        s.px(cx, by - 13 + rearTilt, accent)
      }
      // Eyes & Bridle
      s.px(cx - 2, by - 9 + rearTilt, spec.archetype === 'wolf' || spec.archetype === 'chocobo' ? accent : '#ffd60a')
      s.px(cx + 2, by - 9 + rearTilt, spec.archetype === 'wolf' || spec.archetype === 'chocobo' ? accent : '#ffd60a')
      s.rect(cx - 5, by - 1, 11, 1, accent)
    } else {
      // Rear Tail view (up)
      const tailSway = action === 'walk' ? (f % 2 === 0 ? -1 : 1) : 0
      s.line(cx, by + 1, cx + tailSway, by + 9, c2, 3)
      s.line(cx + tailSway, by + 5, cx + tailSway * 2, by + 11, accent, 2)
      s.rect(cx - 3, by - 9, 7, 6, c1)
    }

    return s.toCanvas(true, false)
  }

  // Side profile (right; mirrored automatically for left)
  const tailWave = action === 'walk' ? (f % 2 === 0 ? -2 : 1) : f % 2

  // Flowing Tail
  if (spec.archetype === 'dragon') {
    s.line(cx - 9, by + 2, cx - 16, by + tailWave, c1, 3)
    s.line(cx - 16, by + tailWave, cx - 20, by - 4 + tailWave, accent, 2)
    s.px(cx - 20, by - 5 + tailWave, '#ffffff')
  } else if (spec.archetype === 'wolf' || spec.archetype === 'dog' || spec.archetype === 'cat') {
    s.line(cx - 9, by + 2, cx - 17, by - 1 + tailWave, c1, 3)
    s.px(cx - 18, by - 2 + tailWave, '#e0f2fe')
  } else {
    s.line(cx - 9, by + 1, cx - 15, by + 4 + tailWave, c2, 3)
    s.line(cx - 13, by + 3 + tailWave, cx - 17, by + 7 + tailWave, dark, 2)
  }

  // Far Wings (for flying mounts)
  if (spec.flying) {
    s.line(cx - 2, by - 1, cx - 11, by - 10 + wingFlap, c2, 3)
    s.line(cx - 11, by - 10 + wingFlap, cx - 17, by - 3 + wingFlap, c1, 2)
    s.line(cx - 9, by - 8 + wingFlap, cx - 12, by + wingFlap, accent, 1)
  }

  // 4 Galloping Legs (far & near)
  const fStride = stride
  const hStride = -stride
  // Far legs
  s.line(cx - 6, by + 5, cx - 7 + Math.round(hStride * 0.7), footY - 1, dark, 2)
  s.line(cx + 6, by + 5, cx + 7 - Math.round(fStride * 0.7), footY - 1, dark, 2)
  // Near legs
  s.line(cx - 7, by + 5, cx - 8 - hStride, footY, c2, 2)
  s.line(cx + 7, by + 5, cx + 8 + fStride, footY, c1, 2)
  if (spec.archetype === 'dragon') {
    s.px(cx - 8 - hStride, footY, accent)
    s.px(cx + 8 + fStride, footY, accent)
  } else if (spec.archetype === 'horse') {
    s.px(cx - 8 - hStride, footY, '#343a40')
    s.px(cx + 8 + fStride, footY, '#343a40')
  }

  // Muscular Body Barrel
  s.rect(cx - 9, by - 2 + Math.round(rearTilt * 0.3), 19, 8, c1)
  s.rect(cx - 7, by - 1 + Math.round(rearTilt * 0.3), 15, 5, hi)
  s.rect(cx - 7, by + 4 + Math.round(rearTilt * 0.3), 14, 2, c2)

  // Ornate Saddle & Rider Blanket
  s.rect(cx - 4, by - 4 + Math.round(rearTilt * 0.3), 9, 4, saddle)
  s.rect(cx - 3, by - 4 + Math.round(rearTilt * 0.3), 7, 1, accent)
  s.px(cx, by, '#fbbf24') // stirrup buckle

  // Neck & Archetype-Distinct Head (facing right)
  const hx = cx + 10
  const hy = by - 9 + rearTilt
  s.line(cx + 6, by, hx, hy + 4, c1, 4)

  if (spec.archetype === 'horse') {
    s.line(cx + 4, by - 2, hx - 2, hy + 1, c2, 2)
    s.rect(hx - 1, hy, 6, 5, c1)
    s.rect(hx + 4, hy + 2, 4, 3, hi)
    s.line(hx, hy, hx - 1, hy - 3, c1, 1)
    s.px(hx + 3, hy + 1, '#1a1423')
    s.line(hx + 1, hy + 3, hx + 6, hy + 4, accent, 1)
  } else if (spec.archetype === 'wolf' || spec.archetype === 'dog' || spec.archetype === 'cat') {
    s.rect(cx + 5, by - 3 + rearTilt, 5, 5, accent)
    s.rect(hx - 1, hy + 1, 7, 5, c1)
    s.rect(hx + 5, hy + 3, 4, 2, hi)
    s.line(hx, hy + 1, hx - 2, hy - 3, c2, 2)
    s.px(hx + 4, hy + 2, '#0f172a')
  } else if (spec.archetype === 'chocobo') {
    s.rect(cx + 5, by - 3 + rearTilt, 5, 5, accent)
    s.rect(hx - 1, hy, 6, 5, hi)
    s.rect(hx + 5, hy + 2, 3, 2, '#f97316')
    s.line(hx, hy, hx - 3, hy - 3, hi, 1)
    s.px(hx + 3, hy + 1, '#0f172a')
  } else if (spec.archetype === 'elephant') {
    s.rect(hx - 1, hy, 7, 6, c1)
    s.line(hx + 6, hy + 3, hx + 8, hy + 8, c1, 2) // trunk
    s.px(hx + 5, hy + 5, '#ffffff') // tusk
  } else if (spec.archetype === 'panda') {
    s.rect(hx - 1, hy, 7, 6, '#f8fafc')
    s.px(hx + 1, hy - 1, c2) // black ear
    s.px(hx + 4, hy + 2, c2) // eye patch
  } else if (spec.archetype === 'turtle') {
    s.rect(hx - 1, hy + 3, 6, 5, c1)
    s.px(hx + 3, hy + 4, '#0f172a')
  } else {
    // Dragon head & horns
    s.line(cx + 4, by - 2 + rearTilt, hx - 2, hy + 2, accent, 2)
    s.rect(hx - 1, hy, 7, 5, c1)
    s.rect(hx + 5, hy + 2, 4, 3, hi)
    s.line(hx, hy, hx - 4, hy - 5, c2, 2)
    s.line(hx + 2, hy, hx - 1, hy - 5, c2, 1)
    s.px(hx + 4, hy + 1, '#ffd60a')
  }

  // Near Wing (for flying mounts)
  if (spec.flying) {
    s.line(cx, by - 1, cx - 6, by - 12 + wingFlap, hi, 2)
    s.line(cx - 6, by - 12 + wingFlap, cx - 14, by - 6 + wingFlap, c1, 2)
    s.line(cx - 5, by - 10 + wingFlap, cx - 4, by - 2 + wingFlap, accent, 1)
  }

  return s.toCanvas(true, dir === 'left')
}

export function mountSprite(
  mountId: string,
  dir: Dir = 'right',
  action: SpriteAction = 'idle',
  frame = 0,
  attackFrameOverride?: number,
  level = 1,
  mountSkinId?: string | null,
): HTMLCanvasElement {
  const f =
    action === 'attack' || action === 'skill'
      ? Math.abs(attackFrameOverride ?? frame) % 4
      : action === 'walk' || action === 'run'
        ? Math.abs(frame) % 6
        : Math.abs(frame) % 4
  const spec = getMountModelSpec(mountId)
  const tier = getMountVisualTier(level)
  const skinKey = mountSkinId ?? ''
  const frameSpec = typeof document !== 'undefined' ? getMountSheetFrameSpec(spec.mountId, dir, action, f) : null
  const sheetReadyFlag = frameSpec ? 's1' : 's0'
  const key = `hd_mount2d|${spec.mountId}|${dir}|${action}|${f}|t${tier}|${skinKey}|${sheetReadyFlag}`

  return cached(key, () => {
    if (frameSpec && typeof document !== 'undefined') {
      const c = document.createElement('canvas')
      c.width = frameSpec.sw
      c.height = frameSpec.sh
      c.dataset.hdScale = String(frameSpec.hdScale)
      c.dataset.sheetId = frameSpec.sheetId
      c.dataset.anchorX = String(frameSpec.anchorX)
      c.dataset.anchorY = String(frameSpec.anchorY)
      c.dataset.footPadFrac = String(frameSpec.footPadFrac ?? MOUNT_FOOT_PAD_FRAC)
      const ctx = c.getContext('2d')
      if (ctx) {
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        drawSheetFrameSpec(ctx, frameSpec, 0, 0, frameSpec.sw, frameSpec.sh)
        drawMountLevelAndSkinFx(ctx, frameSpec.sw, frameSpec.sh, spec, dir, action, f, level, mountSkinId)
        return c
      }
    }
    return renderHdMountSprite(spec, dir, action, f, level, mountSkinId)
  })
}

/* ---------------- Tiles ---------------- */

function speckle(ctx: CanvasRenderingContext2D, rng: () => number, base: string, cols: string[], density: number) {
  ctx.fillStyle = base
  ctx.fillRect(0, 0, TILE, TILE)
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++)
      if (rng() < density) {
        ctx.fillStyle = cols[Math.floor(rng() * cols.length)]
        ctx.fillRect(x, y, 1, 1)
      }
}

function rngFrom(seed: number) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const ROOF_COLORS: Record<number, string> = {
  [T.ROOF_RED]: '#b23a48',
  [T.ROOF_BLUE]: '#3a6ea5',
  [T.ROOF_PURPLE]: '#6a4c93',
  [T.ROOF_GREEN]: '#3f7d4e',
}

function drawBase(ctx: CanvasRenderingContext2D, tile: number, rng: () => number) {
  switch (tile) {
    case T.GRASS:
      return speckle(ctx, rng, '#5a9e4b', ['#6bb35a', '#4c8a3f', '#78c267'], 0.12)
    case T.DARKGRASS:
      return speckle(ctx, rng, '#2f6b3a', ['#3a7d45', '#25572f', '#447f4c'], 0.14)
    case T.SAKURA_GRASS:
      return speckle(ctx, rng, '#4b9b69', ['#5eb57a', '#ffb7d5', '#ffd6e7', '#3c8557'], 0.16)
    case T.PATH:
      return speckle(ctx, rng, '#c9a86a', ['#b8955a', '#d9bc84', '#a88850'], 0.16)
    case T.SAND:
      return speckle(ctx, rng, '#e6cf8f', ['#d6bd7c', '#f0dca4'], 0.12)
    case T.SNOW:
      return speckle(ctx, rng, '#e6eff8', ['#d4e4f4', '#ffffff', '#c5d8ec'], 0.15)
    case T.ICE: {
      speckle(ctx, rng, '#9be0f7', ['#bfefff', '#74c6e8', '#e6fbff'], 0.16)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(3, 4, 4, 1)
      ctx.fillRect(10, 11, 3, 1)
      return
    }
    case T.COBBLESTONE: {
      speckle(ctx, rng, '#8a92a6', ['#98a0b5', '#7b8396', '#a4adc2'], 0.16)
      ctx.fillStyle = '#5e6578'
      ctx.fillRect(0, 7, TILE, 1)
      ctx.fillRect(0, 15, TILE, 1)
      ctx.fillRect(7, 0, 1, 7)
      ctx.fillRect(15, 8, 1, 7)
      ctx.fillStyle = '#b4bdd1'
      ctx.fillRect(1, 1, 5, 1)
      ctx.fillRect(9, 9, 5, 1)
      return
    }
    case T.WOOD_FLOOR: {
      ctx.fillStyle = '#a47148'
      ctx.fillRect(0, 0, TILE, TILE)
      ctx.fillStyle = '#8a5a3b'
      for (let y = 3; y < TILE; y += 4) ctx.fillRect(0, y, TILE, 1)
      ctx.fillStyle = '#ba8558'
      ctx.fillRect(2, 1, 5, 1)
      ctx.fillRect(9, 9, 5, 1)
      return
    }
    case T.CARPET: {
      ctx.fillStyle = '#9e2a2b'
      ctx.fillRect(0, 0, TILE, TILE)
      ctx.fillStyle = '#f4d35e'
      ctx.fillRect(0, 0, 1, TILE)
      ctx.fillRect(TILE - 1, 0, 1, TILE)
      ctx.fillStyle = '#b83739'
      ctx.fillRect(4, 4, 8, 8)
      return
    }
    case T.PLAZA: {
      speckle(ctx, rng, '#a6aec2', ['#98a0b5', '#b5bdd1'], 0.14)
      ctx.fillStyle = '#6c748a'
      ctx.fillRect(0, 0, TILE, 1)
      ctx.fillRect(0, 8, TILE, 1)
      ctx.fillRect(0, 0, 1, 8)
      ctx.fillRect(8, 8, 1, 8)
      ctx.fillStyle = '#cad2e6'
      ctx.fillRect(1, 1, 14, 1)
      ctx.fillRect(1, 9, 6, 1)
      ctx.fillRect(9, 9, 6, 1)
      return
    }
    case T.SKY_TILE: {
      speckle(ctx, rng, '#e8eef5', ['#ffffff', '#cfd9e8', '#f5f0dc'], 0.14)
      ctx.fillStyle = '#c8b37a'
      ctx.fillRect(0, 0, TILE, 1)
      ctx.fillRect(0, 0, 1, TILE)
      return
    }
    case T.RUINS_FLOOR: {
      speckle(ctx, rng, '#737582', ['#626470', '#878998', '#4f6d52'], 0.18)
      ctx.fillStyle = '#4e505c'
      ctx.fillRect(0, 0, TILE, 1)
      ctx.fillRect(8, 0, 1, 8)
      ctx.fillRect(0, 8, TILE, 1)
      return
    }
    case T.GOLD_PAVING: {
      speckle(ctx, rng, '#d8cba8', ['#ece2c6', '#c2b38c'], 0.12)
      ctx.fillStyle = '#e0aa3e'
      ctx.fillRect(0, 0, TILE, 1)
      ctx.fillRect(0, 0, 1, TILE)
      ctx.fillStyle = '#b38629'
      ctx.fillRect(7, 7, 2, 2)
      return
    }
    case T.MAGIC_CIRCLE: {
      drawBase(ctx, T.PLAZA, rng)
      ctx.strokeStyle = '#9d4edd'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(8, 8, 6, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#e0aaff'
      ctx.fillRect(7, 2, 2, 2)
      ctx.fillRect(7, 12, 2, 2)
      ctx.fillRect(2, 7, 2, 2)
      ctx.fillRect(12, 7, 2, 2)
      ctx.fillStyle = '#72efdd'
      ctx.fillRect(7, 7, 2, 2)
      return
    }
    case T.BRIDGE_H: {
      ctx.fillStyle = '#7f5539'
      ctx.fillRect(0, 0, TILE, TILE)
      for (let x = 0; x < TILE; x += 4) {
        ctx.fillStyle = x % 8 === 0 ? '#a47148' : '#94623d'
        ctx.fillRect(x, 2, 3, TILE - 4)
        ctx.fillStyle = '#583823'
        ctx.fillRect(x + 3, 2, 1, TILE - 4)
      }
      ctx.fillStyle = '#c8956b'
      ctx.fillRect(0, 0, TILE, 2)
      ctx.fillRect(0, TILE - 2, TILE, 2)
      ctx.fillStyle = '#4a2e1b'
      ctx.fillRect(0, 2, TILE, 1)
      return
    }
    case T.BRIDGE_V: {
      ctx.fillStyle = '#7f5539'
      ctx.fillRect(0, 0, TILE, TILE)
      for (let y = 0; y < TILE; y += 4) {
        ctx.fillStyle = y % 8 === 0 ? '#a47148' : '#94623d'
        ctx.fillRect(2, y, TILE - 4, 3)
        ctx.fillStyle = '#583823'
        ctx.fillRect(2, y + 3, TILE - 4, 1)
      }
      ctx.fillStyle = '#c8956b'
      ctx.fillRect(0, 0, 2, TILE)
      ctx.fillRect(TILE - 2, 0, 2, TILE)
      return
    }
    case T.CAVEFLOOR:
      return speckle(ctx, rng, '#46495f', ['#3b3d52', '#53566e', '#3f4258'], 0.18)
    case T.VOLCFLOOR: {
      speckle(ctx, rng, '#3b2a2a', ['#4a3434', '#2c1f1f', '#523a3a'], 0.18)
      if (rng() < 0.3) {
        ctx.fillStyle = '#ff6b35'
        ctx.fillRect(Math.floor(rng() * 14), Math.floor(rng() * 14), 1, 1)
      }
      return
    }
    default:
      return speckle(ctx, rng, '#5a9e4b', ['#6bb35a', '#4c8a3f'], 0.12)
  }
}

function drawTile(ctx: CanvasRenderingContext2D, tile: number, base: number, variant: number) {
  const rng = rngFrom(tile * 1000 + base * 37 + variant * 7 + 1)
  const p = (x: number, y: number, c: string, w = 1, h = 1) => {
    ctx.fillStyle = c
    ctx.fillRect(x, y, w, h)
  }
  switch (tile) {
    case T.FLOWER: {
      drawBase(ctx, base === T.SAKURA_GRASS ? T.SAKURA_GRASS : T.GRASS, rng)
      const cols = ['#ffd6e0', '#fff3b0', '#ff5d8f', '#cdb4db', '#ffffff']
      for (let i = 0; i < 3; i++) {
        const x = 2 + Math.floor(rng() * 11)
        const y = 2 + Math.floor(rng() * 11)
        const c = cols[Math.floor(rng() * cols.length)]
        p(x, y - 1, c)
        p(x - 1, y, c)
        p(x + 1, y, c)
        p(x, y + 1, c)
        p(x, y, '#f4a261')
      }
      return
    }
    case T.WATER: {
      p(0, 0, '#3a7bd5', TILE, TILE)
      for (let i = 0; i < 4; i++) {
        const x = Math.floor(rng() * 12)
        const y = Math.floor(rng() * 15)
        p(x, y, '#6aa6ef', 3, 1)
      }
      p(0, 0, '#2f66b3', TILE, 1)
      return
    }
    case T.CLOUD_VOID: {
      p(0, 0, '#72aee6', TILE, TILE)
      p(1, 3, '#cde8ff', 10, 6)
      p(4, 2, '#ffffff', 8, 5)
      p(7, 9, '#a5d1f8', 7, 5)
      return
    }
    case T.CASTLE_WALL: {
      p(0, 0, '#6c757d', TILE, TILE)
      p(0, 0, '#adb5bd', TILE, 2)
      p(2, 0, '#495057', 3, 2)
      p(10, 0, '#495057', 3, 2)
      p(0, 7, '#495057', TILE, 1)
      p(7, 3, '#495057', 1, 4)
      p(14, 8, '#495057', 1, 7)
      p(0, 14, '#343a40', TILE, 2)
      return
    }
    case T.TREE: {
      drawBase(ctx, base, rng)
      p(6, 11, '#6b4226', 4, 5)
      p(7, 11, '#8a5a3b', 1, 4)
      p(3, 14, 'rgba(0,0,0,0.2)', 10, 2)
      const canopy = [
        [5, 0, 6],
        [3, 1, 10],
        [2, 2, 12],
        [1, 3, 14],
        [1, 4, 14],
        [1, 5, 14],
        [1, 6, 14],
        [2, 7, 12],
        [2, 8, 12],
        [3, 9, 10],
        [5, 10, 6],
      ]
      for (const [x, y, w] of canopy) p(x, y, '#2d6a2e', w, 1)
      p(3, 2, '#3f8f3f', 5, 2)
      p(2, 4, '#3f8f3f', 3, 2)
      p(5, 1, '#5aa95a', 2, 1)
      p(4, 8, '#1e4d20', 9, 1)
      p(5, 9, '#1e4d20', 7, 1)
      return
    }
    case T.PINE: {
      drawBase(ctx, base, rng)
      p(7, 12, '#5c3d2e', 2, 4)
      p(3, 14, 'rgba(0,0,0,0.25)', 10, 2)
      const isSnowy = base === T.SNOW
      const mainCol = isSnowy ? '#225444' : '#1b4332'
      const hiCol = isSnowy ? '#d8ecfa' : '#2d6a4f'
      const layers = [
        [7, 0, 2],
        [6, 1, 4],
        [5, 2, 6],
        [6, 3, 4],
        [4, 4, 8],
        [3, 5, 10],
        [5, 6, 6],
        [3, 7, 10],
        [2, 8, 12],
        [1, 9, 14],
        [2, 10, 12],
        [3, 11, 10],
      ]
      for (const [x, y, w] of layers) p(x, y, mainCol, w, 1)
      p(6, 2, hiCol, 2, 2)
      p(5, 5, hiCol, 3, 1)
      p(4, 8, hiCol, 3, 2)
      p(10, 9, '#081c15', 4, 2)
      return
    }
    case T.BUSH: {
      drawBase(ctx, base, rng)
      p(2, 13, 'rgba(0,0,0,0.2)', 12, 2)
      p(3, 5, '#2f7a33', 10, 9)
      p(2, 7, '#2f7a33', 12, 5)
      p(4, 4, '#2f7a33', 8, 1)
      p(4, 6, '#46a046', 4, 2)
      p(9, 8, '#46a046', 2, 2)
      p(3, 12, '#1f5222', 10, 1)
      p(6, 7, '#e63946')
      p(10, 10, '#e63946')
      return
    }
    case T.ROCK: {
      drawBase(ctx, base, rng)
      p(2, 13, 'rgba(0,0,0,0.25)', 12, 2)
      p(3, 5, '#8d99ae', 10, 8)
      p(2, 7, '#8d99ae', 12, 5)
      p(5, 4, '#8d99ae', 6, 1)
      p(4, 5, '#adb5bd', 4, 2)
      p(3, 11, '#6c757d', 10, 2)
      p(9, 7, '#6c757d', 1, 3)
      return
    }
    case T.CRYSTAL: {
      drawBase(ctx, base === T.CAVEFLOOR ? T.CAVEFLOOR : base, rng)
      p(3, 13, 'rgba(0,0,0,0.3)', 10, 2)
      p(7, 2, '#72efdd', 2, 11)
      p(4, 6, '#56cfe1', 2, 7)
      p(10, 5, '#64dfdf', 2, 8)
      p(7, 2, '#e0fbfc', 1, 4)
      p(4, 6, '#e0fbfc', 1, 2)
      return
    }
    case T.CAVEWALL: {
      p(0, 0, base === T.VOLCFLOOR ? '#1f1414' : '#22223b', TILE, TILE)
      for (let i = 0; i < 6; i++) p(Math.floor(rng() * 14), Math.floor(rng() * 14), base === T.VOLCFLOOR ? '#3a2323' : '#343a5a', 2, 2)
      p(0, 14, base === T.VOLCFLOOR ? '#120b0b' : '#15152a', TILE, 2)
      return
    }
    case T.LAVA: {
      p(0, 0, '#e85d04', TILE, TILE)
      for (let i = 0; i < 5; i++) p(Math.floor(rng() * 14), Math.floor(rng() * 14), '#ffb703', 2, 1)
      for (let i = 0; i < 3; i++) p(Math.floor(rng() * 14), Math.floor(rng() * 14), '#9d0208', 2, 2)
      return
    }
    case T.WALL:
    case T.WINDOW:
    case T.DOOR: {
      p(0, 0, '#e9d8a6', TILE, TILE)
      p(0, 5, '#cdb57f', TILE, 1)
      p(0, 11, '#cdb57f', TILE, 1)
      p(0, 0, '#c9b27c', 1, TILE)
      p(15, 0, '#b39a62', 1, TILE)
      if (tile === T.WINDOW) {
        p(3, 3, '#6b4226', 10, 9)
        p(4, 4, '#8ecae6', 8, 7)
        p(4, 4, '#caf0f8', 3, 2)
        p(7, 4, '#6b4226', 1, 7)
        p(4, 7, '#6b4226', 8, 1)
      }
      if (tile === T.DOOR) {
        p(3, 2, '#5c3d2e', 10, 14)
        p(4, 3, '#7f5539', 8, 13)
        p(7, 3, '#5c3d2e', 1, 13)
        p(10, 9, '#f4d35e', 1, 2)
      }
      return
    }
    case T.ROOF_RED:
    case T.ROOF_BLUE:
    case T.ROOF_PURPLE:
    case T.ROOF_GREEN: {
      const c = ROOF_COLORS[tile]
      p(0, 0, c, TILE, TILE)
      for (let y = 0; y < TILE; y += 4) {
        p(0, y + 3, shade(c, -0.3), TILE, 1)
        for (let x = (y / 4) % 2 === 0 ? 0 : 4; x < TILE; x += 8) p(x, y, shade(c, -0.18), 1, 3)
      }
      p(0, 0, shade(c, 0.2), TILE, 1)
      return
    }
    case T.FENCE: {
      drawBase(ctx, base, rng)
      p(0, 6, '#8a5a3b', TILE, 2)
      p(0, 10, '#8a5a3b', TILE, 2)
      p(2, 3, '#a47148', 3, 12)
      p(11, 3, '#a47148', 3, 12)
      p(2, 3, '#c8956b', 3, 1)
      p(11, 3, '#c8956b', 3, 1)
      return
    }
    case T.SIGN: {
      drawBase(ctx, base, rng)
      p(7, 9, '#6b4226', 2, 7)
      p(1, 2, '#6b4226', 14, 8)
      p(2, 3, '#c8956b', 12, 6)
      p(4, 5, '#6b4226', 6, 1)
      p(10, 4, '#6b4226', 1, 3)
      p(11, 5, '#6b4226', 1, 1)
      return
    }
    case T.MUSHROOMS: {
      drawBase(ctx, base, rng)
      p(4, 9, '#f1e3c8', 2, 3)
      p(3, 7, '#e63946', 4, 2)
      p(4, 7, '#ffffff')
      p(10, 11, '#f1e3c8', 2, 2)
      p(9, 9, '#f4a261', 4, 2)
      return
    }
    case T.BONES: {
      drawBase(ctx, base, rng)
      p(3, 8, '#e9e3d5', 8, 1)
      p(2, 7, '#e9e3d5', 2, 3)
      p(10, 7, '#e9e3d5', 2, 3)
      p(9, 11, '#d6d0c0', 3, 2)
      return
    }
    case T.FOUNTAIN:
      return drawBase(ctx, T.PLAZA, rng)
    default:
      return drawBase(ctx, tile, rng)
  }
}

function tileCanvas(tile: number, base: number, variant: number) {
  return cached(`t|${tile}|${base}|${variant}`, () => {
    const { c, ctx } = makeCanvas(TILE, TILE)
    drawTile(ctx, tile, base, variant)
    return c
  })
}

export function mapCanvas(map: MapDef) {
  return buildHdMapCanvas(map)
}

export function mapObjectSprite(kind: MapObjectKind, frame = 0, variant = 0): HTMLCanvasElement {
  const f = Math.abs(frame) % 3
  return cached(`obj2d|${kind}|${f}|${variant}`, () => {
    switch (kind) {
      case 'lamp_post': {
        const s = new PixelSurface(16, 28)
        s.rect(6, 23, 4, 2, '#343a40')
        s.line(7, 9, 7, 23, '#495057', 2)
        s.rect(5, 5, 6, 4, '#ffd166')
        s.rect(6, 6, 4, 2, f === 1 ? '#fff3b0' : '#ffea85')
        s.rect(4, 4, 8, 1, '#212529')
        s.px(7, 3, '#495057')
        return s.toCanvas(true)
      }
      case 'market_stall': {
        const s = new PixelSurface(34, 30)
        const clothA = variant % 2 === 0 ? '#275dad' : '#b23a48'
        const clothADark = shade(clothA, -0.25)
        const clothB = '#f4efe6'
        const clothBDark = '#d9d0c1'
        // Wooden counter & crates
        s.rect(4, 19, 26, 8, '#7f5539')
        s.rect(5, 20, 24, 6, '#9c6644')
        s.rect(3, 18, 28, 2, '#c8956b')
        s.rect(4, 26, 26, 1, '#4a2e1b')
        // Corner timber posts with gold finials
        s.rect(4, 9, 2, 10, '#5c3d2e')
        s.rect(28, 9, 2, 10, '#5c3d2e')
        s.rect(3, 2, 2, 2, '#ffd60a')
        s.rect(29, 2, 2, 2, '#ffd60a')
        // Peaked striped awning canopy
        for (let row = 0; row < 7; row++) {
          const left = 5 - Math.floor(row * 0.45)
          const right = 29 + Math.floor(row * 0.45)
          for (let x = left; x <= right; x++) {
            const stripe = Math.floor((x - 2) / 3) % 2 === 0
            const isRim = row >= 5
            s.px(x, 3 + row, stripe ? (isRim ? clothADark : clothA) : (isRim ? clothBDark : clothB))
          }
        }
        // Gold awning trim
        s.rect(2, 9, 30, 1, '#e9c46a')
        // Stocked wares: potions, apples, herbs, gems on counter
        s.rect(6, 15, 4, 3, '#e63946')
        s.px(7, 14, '#ffffff')
        s.rect(12, 15, 3, 3, '#4cc9f0')
        s.px(13, 14, '#caf0f8')
        s.rect(17, 15, 4, 3, '#7ae582')
        s.rect(23, 14, 5, 4, '#f4a261')
        s.px(24, 14, '#ffd60a')
        return s.toCanvas(true)
      }
      case 'anvil_forge': {
        const s = new PixelSurface(24, 24)
        // Stone hearth + fire glow
        s.rect(2, 6, 10, 14, '#6c757d')
        s.rect(4, 3, 6, 4, '#495057')
        s.rect(4, 13, 6, 5, '#e85d04')
        s.rect(5, 14 + (f % 2), 4, 3, f === 0 ? '#ffb703' : '#ffd166')
        // Iron anvil beside forge
        s.rect(14, 17, 7, 3, '#495057')
        s.rect(16, 14, 4, 3, '#adb5bd')
        s.rect(13, 12, 9, 2, '#ced4da')
        s.px(19, 10, '#f4a261')
        return s.toCanvas(true)
      }
      case 'well': {
        const s = new PixelSurface(20, 24)
        s.rect(4, 13, 12, 8, '#8d99ae')
        s.rect(6, 14, 8, 3, '#3a7bd5')
        s.rect(5, 7, 2, 7, '#6b4226')
        s.rect(13, 7, 2, 7, '#6b4226')
        s.rect(3, 4, 14, 3, '#b23a48')
        s.rect(9, 8, 2, 5, '#cdb57f')
        return s.toCanvas(true)
      }
      case 'statue': {
        const s = new PixelSurface(18, 28)
        s.rect(4, 21, 10, 5, '#8d99ae')
        s.rect(5, 19, 8, 2, '#adb5bd')
        s.rect(6, 11, 6, 8, '#ced4da')
        s.rect(7, 6, 4, 5, '#e9ecef')
        s.rect(5, 12, 2, 5, '#adb5bd')
        s.line(12, 8, 12, 17, '#ffd166', 1)
        s.px(9, 4, '#ffd60a')
        return s.toCanvas(true)
      }
      case 'barrel_cluster': {
        const s = new PixelSurface(20, 18)
        s.rect(2, 7, 7, 9, '#8a5a3b')
        s.rect(2, 9, 7, 1, '#495057')
        s.rect(2, 13, 7, 1, '#495057')
        s.rect(10, 8, 8, 8, '#b07d4f')
        s.line(10, 8, 17, 15, '#6b4226', 1)
        s.rect(5, 3, 6, 5, '#7f5539')
        return s.toCanvas(true)
      }
      case 'bench': {
        const s = new PixelSurface(22, 16)
        s.rect(3, 5, 16, 4, '#a47148')
        s.rect(3, 9, 16, 3, '#c8956b')
        s.rect(4, 12, 2, 3, '#343a40')
        s.rect(16, 12, 2, 3, '#343a40')
        return s.toCanvas(true)
      }
      case 'notice_board': {
        const s = new PixelSurface(22, 22)
        s.rect(5, 14, 2, 6, '#5c3d2e')
        s.rect(15, 14, 2, 6, '#5c3d2e')
        s.rect(3, 4, 16, 11, '#8a5a3b')
        s.rect(4, 5, 14, 9, '#6b4226')
        s.rect(5, 6, 4, 5, '#fff3b0')
        s.rect(11, 6, 5, 4, '#f8f9fa')
        s.px(7, 6, '#e63946')
        s.px(13, 6, '#4cc9f0')
        return s.toCanvas(true)
      }
      case 'guild_banner': {
        const s = new PixelSurface(14, 26)
        const flagCol = variant % 2 === 0 ? '#c1121f' : '#5a189a'
        s.rect(6, 3, 2, 21, '#adb5bd')
        s.rect(3, 5, 8, 1, '#ffd166')
        s.rect(4, 6, 6, 11, flagCol)
        s.rect(6, 8, 2, 4, '#ffd60a')
        s.px(4, 17, flagCol)
        s.px(9, 17, flagCol)
        return s.toCanvas(true)
      }
      case 'campfire': {
        const s = new PixelSurface(18, 18)
        s.rect(4, 12, 10, 3, '#6b4226')
        s.rect(5, 14, 8, 2, '#8d99ae')
        s.rect(6, 8 - (f % 2), 6, 5, '#f77f00')
        s.rect(7, 6 + (f % 2), 4, 5, '#fcbf49')
        s.px(8, 5, '#fff3b0')
        if (f === 2) s.px(10, 4, '#fff3b0')
        return s.toCanvas(true)
      }
      case 'tent': {
        const s = new PixelSurface(26, 22)
        for (let row = 0; row < 12; row++) {
          const half = Math.floor(row * 0.85) + 2
          s.rect(13 - half, 5 + row, half * 2, 1, variant % 2 === 0 ? '#d4a373' : '#4a7c59')
        }
        s.rect(10, 11, 6, 6, '#2b2d42')
        s.line(13, 4, 13, 17, '#7f5539', 1)
        return s.toCanvas(true)
      }
      case 'scarecrow': {
        const s = new PixelSurface(18, 24)
        s.rect(8, 10, 2, 12, '#6b4226')
        s.rect(3, 11, 12, 2, '#6b4226')
        s.rect(6, 10, 6, 6, '#3a86ff')
        s.rect(7, 6, 4, 4, '#f4d35e')
        s.rect(5, 5, 8, 2, '#b07d4f')
        return s.toCanvas(true)
      }
      case 'ruin_pillar': {
        const s = new PixelSurface(16, 26)
        s.rect(4, 20, 8, 4, '#6c757d')
        s.rect(5, 7, 6, 13, '#8d99ae')
        s.rect(4, 5, 7, 2, '#adb5bd')
        s.rect(5, 13, 3, 3, '#4f772d')
        return s.toCanvas(true)
      }
      case 'chest_decor': {
        const s = new PixelSurface(16, 16)
        s.rect(2, 5, 12, 9, '#8a5a3b')
        s.rect(2, 5, 12, 2, '#e9c46a')
        s.rect(2, 9, 12, 1, '#e9c46a')
        s.rect(7, 8, 2, 3, '#ffd60a')
        return s.toCanvas(true)
      }
      case 'totem': {
        const s = new PixelSurface(16, 26)
        s.rect(6, 6, 4, 18, '#7f5539')
        s.rect(4, 8, 8, 5, '#a47148')
        s.px(5, 10, '#e63946')
        s.px(9, 10, '#e63946')
        s.rect(3, 5, 2, 2, '#ffb703')
        s.rect(11, 5, 2, 2, '#ffb703')
        return s.toCanvas(true)
      }
      case 'torch': {
        const s = new PixelSurface(14, 24)
        s.rect(6, 10, 2, 12, '#495057')
        s.rect(5, 8, 4, 3, '#6c757d')
        s.rect(5, 4 + (f % 2), 4, 4, '#ff7b00')
        s.rect(6, 3 + (f % 2), 2, 3, '#ffd166')
        return s.toCanvas(true)
      }
      case 'mine_cart': {
        const s = new PixelSurface(22, 18)
        s.rect(2, 15, 18, 2, '#5c3d2e')
        s.rect(4, 7, 14, 7, '#6c757d')
        s.rect(5, 5, 4, 3, '#ffd60a')
        s.rect(10, 4, 4, 4, '#72efdd')
        s.rect(5, 13, 3, 3, '#343a40')
        s.rect(14, 13, 3, 3, '#343a40')
        return s.toCanvas(true)
      }
      case 'crystal_spire': {
        const s = new PixelSurface(18, 26)
        s.rect(7, 3, 4, 19, '#4cc9f0')
        s.rect(4, 10, 3, 12, '#7209b7')
        s.rect(11, 9, 3, 13, '#4895ef')
        s.rect(8, 4, 2, 10, '#e0fbfc')
        return s.toCanvas(true)
      }
      case 'magma_brazier': {
        const s = new PixelSurface(18, 22)
        s.rect(4, 12, 10, 7, '#343a40')
        s.rect(3, 10, 12, 3, '#495057')
        s.rect(5, 5 + (f % 2), 8, 5, '#e85d04')
        s.rect(6, 3 + (f % 2), 6, 4, '#ffb703')
        s.px(8, 2, '#fff3b0')
        return s.toCanvas(true)
      }
      case 'skull_pile': {
        const s = new PixelSurface(18, 16)
        s.rect(5, 6, 8, 7, '#e9e3d5')
        s.rect(6, 9, 2, 2, '#2b2d42')
        s.rect(10, 9, 2, 2, '#2b2d42')
        s.rect(3, 12, 12, 2, '#d6d0c0')
        return s.toCanvas(true)
      }
      case 'sky_arch': {
        const s = new PixelSurface(26, 28)
        s.rect(3, 8, 4, 18, '#e9ecef')
        s.rect(19, 8, 4, 18, '#e9ecef')
        s.rect(2, 4, 22, 4, '#f8f9fa')
        s.rect(5, 5, 16, 2, '#ffd166')
        return s.toCanvas(true)
      }
      case 'ice_spire': {
        const s = new PixelSurface(18, 26)
        s.rect(7, 3, 4, 20, '#90e0ef')
        s.rect(4, 11, 3, 12, '#48cae4')
        s.rect(11, 10, 3, 13, '#ade8f4')
        s.rect(8, 4, 2, 11, '#ffffff')
        return s.toCanvas(true)
      }
      case 'sakura_tree': {
        const s = new PixelSurface(24, 28)
        s.rect(10, 15, 4, 11, '#6b4226')
        s.rect(5, 5, 14, 11, '#ff8fab')
        s.rect(3, 7, 18, 7, '#ffb3c6')
        s.rect(6, 4, 10, 4, '#ffc2d1')
        s.px(7, 8, '#ffe5ec')
        s.px(14, 10, '#ffe5ec')
        return s.toCanvas(true)
      }
      case 'dream_shrine': {
        const s = new PixelSurface(24, 26)
        s.rect(5, 8, 3, 16, '#d62828')
        s.rect(16, 8, 3, 16, '#d62828')
        s.rect(2, 4, 20, 3, '#d62828')
        s.rect(4, 9, 16, 2, '#b5171e')
        s.rect(10, 7, 4, 2, '#ffd166')
        return s.toCanvas(true)
      }
      case 'colosseum_pillar': {
        const s = new PixelSurface(18, 28)
        s.rect(4, 22, 10, 4, '#c2b38c')
        s.rect(5, 6, 8, 16, '#ece2c6')
        s.rect(7, 7, 1, 14, '#d8cba8')
        s.rect(10, 7, 1, 14, '#d8cba8')
        s.rect(3, 4, 12, 3, '#e0aa3e')
        return s.toCanvas(true)
      }
      case 'wagon': {
        const s = new PixelSurface(26, 20)
        s.rect(4, 6, 16, 7, '#b07d4f')
        s.rect(5, 4, 12, 4, '#e9ecef')
        s.rect(3, 12, 20, 2, '#7f5539')
        s.rect(5, 13, 4, 4, '#5c3d2e')
        s.rect(16, 13, 4, 4, '#5c3d2e')
        return s.toCanvas(true)
      }
      case 'flower_cart': {
        const s = new PixelSurface(22, 18)
        s.rect(4, 9, 14, 5, '#8a5a3b')
        s.rect(5, 6, 4, 3, '#ff5d8f')
        s.rect(10, 5, 4, 4, '#fff3b0')
        s.rect(14, 7, 3, 2, '#72efdd')
        s.rect(6, 14, 3, 3, '#495057')
        s.rect(13, 14, 3, 3, '#495057')
        return s.toCanvas(true)
      }
      case 'ballista_turret': {
        const s = new PixelSurface(24, 22)
        s.rect(5, 13, 14, 6, '#7f5539')
        s.rect(9, 8, 6, 7, '#5c3d2e')
        s.rect(4, 5, 16, 3, '#b07d4f')
        s.rect(10, 3, 4, 9, '#adb5bd')
        s.px(11, 2, '#e9ecef')
        return s.toCanvas(true)
      }
      case 'palisade': {
        const s = new PixelSurface(20, 22)
        for (const px of [2, 6, 10, 14]) {
          s.rect(px, 6, 3, 14, '#7f5539')
          s.px(px + 1, 5, '#c8956b')
        }
        s.rect(1, 12, 18, 2, '#5c3d2e')
        return s.toCanvas(true)
      }
      case 'weapon_rack': {
        const s = new PixelSurface(22, 22)
        s.rect(4, 17, 14, 3, '#6b4226')
        s.rect(4, 5, 2, 13, '#7f5539')
        s.rect(16, 5, 2, 13, '#7f5539')
        s.rect(3, 4, 16, 2, '#9c6644')
        s.line(8, 6, 8, 16, '#ced4da', 1)
        s.line(11, 5, 11, 16, '#ffd166', 1)
        s.line(14, 6, 14, 16, '#94d2bd', 1)
        return s.toCanvas(true)
      }
      case 'war_drum': {
        const s = new PixelSurface(18, 20)
        s.rect(4, 14, 10, 4, '#5c3d2e')
        s.rect(4, 6, 10, 8, '#c1121f')
        s.rect(5, 4, 8, 3, '#f4efe6')
        s.rect(3, 8, 12, 2, '#ffd166')
        return s.toCanvas(true)
      }
      case 'war_standard': {
        const s = new PixelSurface(16, 28)
        const flagCol = variant === 1 ? '#d62828' : variant === 2 ? '#7209b7' : '#2563eb'
        s.rect(7, 2, 2, 24, '#cbd5e1')
        s.rect(4, 5, 8, 1, '#ffd166')
        s.rect(8 + (f === 1 ? 1 : 0), 6, 6, 11, flagCol)
        s.rect(10, 9, 2, 4, '#ffd60a')
        return s.toCanvas(true)
      }
      case 'sword_monument': {
        const s = new PixelSurface(20, 28)
        s.rect(4, 20, 12, 6, '#6c757d')
        s.rect(6, 17, 8, 3, '#adb5bd')
        s.rect(9, 4, 2, 14, '#e0fbfc')
        s.rect(6, 8, 8, 2, '#ffd166')
        s.px(9, 2, '#90e0ef')
        return s.toCanvas(true)
      }
      case 'obelisk': {
        const s = new PixelSurface(18, 30)
        s.rect(4, 22, 10, 6, '#334155')
        s.rect(6, 9, 6, 14, '#475569')
        s.rect(7, 5, 4, 4, '#64748b')
        s.px(8, 12, variant === 1 ? '#e879f9' : '#38bdf8')
        s.px(9, 16, variant === 1 ? '#e879f9' : '#38bdf8')
        return s.toCanvas(true)
      }
      case 'palm_tree': {
        const s = new PixelSurface(24, 30)
        s.rect(10, 12, 4, 15, '#8a5a3b')
        s.rect(4, 7, 16, 4, '#2d9d4e')
        s.rect(6, 4, 12, 5, '#52b788')
        s.px(10, 11, '#5c3d2e')
        s.px(13, 11, '#5c3d2e')
        return s.toCanvas(true)
      }
      case 'shipwreck': {
        const s = new PixelSurface(28, 22)
        s.rect(3, 12, 22, 7, '#6b4226')
        s.rect(5, 10, 16, 3, '#9c6644')
        s.line(13, 2, 13, 13, '#5c3d2e', 2)
        s.rect(14, 4, 7, 6, '#e5e5e5')
        return s.toCanvas(true)
      }
      case 'anchor_post': {
        const s = new PixelSurface(18, 20)
        s.rect(7, 5, 4, 12, '#475569')
        s.rect(4, 8, 10, 2, '#64748b')
        s.rect(5, 14, 8, 3, '#334155')
        s.px(8, 4, '#ffd166')
        return s.toCanvas(true)
      }
      case 'treasure_altar': {
        const s = new PixelSurface(24, 26)
        s.rect(4, 18, 16, 6, '#8d99ae')
        s.rect(6, 12, 12, 6, '#e9c46a')
        s.rect(9, 6, 6, 6, '#ffd60a')
        s.px(11, 8, '#ef233c')
        return s.toCanvas(true)
      }
      case 'wooden_boat': {
        const s = new PixelSurface(26, 16)
        s.rect(3, 7 + (f % 2), 20, 6, '#8a5a3b')
        s.rect(6, 8 + (f % 2), 14, 3, '#b07d4f')
        s.rect(10, 5 + (f % 2), 6, 2, '#e9c46a')
        return s.toCanvas(true)
      }
      case 'lantern_float': {
        const s = new PixelSurface(16, 16)
        s.rect(4, 10, 8, 3, '#7f5539')
        s.rect(5, 5, 6, 5, '#ffd166')
        s.rect(6, 6, 4, 3, f === 1 ? '#fff3b0' : '#ffb703')
        s.rect(4, 4, 8, 1, '#b23a48')
        return s.toCanvas(true)
      }
      case 'lotus_lily': {
        const s = new PixelSurface(18, 14)
        s.rect(3, 7, 12, 4, '#2d9d4e')
        s.rect(6, 4, 6, 4, variant % 2 === 0 ? '#ff8fab' : '#ffd166')
        s.px(8, 5, '#fff0f3')
        return s.toCanvas(true)
      }
      case 'fish_rack': {
        const s = new PixelSurface(22, 22)
        s.rect(4, 5, 2, 15, '#8a5a3b')
        s.rect(16, 5, 2, 15, '#8a5a3b')
        s.rect(3, 6, 16, 2, '#c8956b')
        s.rect(7, 9, 2, 6, '#90e0ef')
        s.rect(11, 9, 2, 7, '#ffd166')
        s.rect(14, 10, 2, 5, '#48cae4')
        return s.toCanvas(true)
      }
      case 'sign_arrow':
      default: {
        const s = new PixelSurface(16, 20)
        s.rect(7, 8, 2, 10, '#6b4226')
        s.rect(3, 4, 10, 5, '#c8956b')
        s.rect(11, 5, 2, 3, '#c8956b')
        s.rect(5, 6, 5, 1, '#5c3d2e')
        return s.toCanvas(true)
      }
    }
  })
}

const iconCache = new Map<string, string>()

/* ---------------- Item icons ---------------- */

const ICONS: Record<string, string[]> = {
  potion: ['....kk....', '....ww....', '...kccl...', '..cccccc..', '.ccllcccc.', '.cclccccc.', '.cccccccd.', '.ccccccdd.', '..cccddd..', '...dddd...'],
  sword: ['........ll', '.......lcl', '......lcl.', '.....lcl..', '....lcl...', '.g.lcl....', '..gcl.....', '..gg......', '.n..g.....', 'n.........'],
  staff: ['.......oo.', '......oyyo', '......oyyo', '.......oo.', '......n...', '.....n....', '....n.....', '...n......', '..n.......', '.n........'],
  bow: ['....nn....', '...n..w...', '..n...w...', '.n....w...', '.n....wcc.', '.n....w...', '..n...w...', '...n..w...', '....nn....', '..........'],
  dagger: ['..........', '.......ll.', '......lcl.', '.....lcl..', '....lcl...', '..g.cl....', '...gg.....', '..n.g.....', '.n........', '..........'],
  stick: ['........cc', '.......ccd', '......ccd.', '.....ccd..', '....ccd...', '...ccd....', '..ccd.....', '.ccd......', 'ccd.......', 'cd........'],
  armor: ['.cc....cc.', 'cccc..cccc', 'cclccccccc', '.clcccccc.', '.cccyyccc.', '.ccccccccd', '.ccccccccd', '.cccccccdd', '..ccccddd.', '..........'],
  stone: ['..........', '....ll....', '...lccc...', '..lcccccc.', '.lccwccccd', '.ccccccccd', '..cccccdd.', '...ccddd..', '....dd....', '..........'],
  gel: ['..........', '....cc....', '...cccc...', '..clcccc..', '.cclccccc.', '.ccccccccd', '.ccccccccd', '..ccccccd.', '...dddd...', '..........'],
  fang: ['..........', '..cc......', '..ccc.....', '...ccc....', '...cccc...', '....cccc..', '.....cccd.', '......ccd.', '.......dd.', '..........'],
  bone: ['.cc.......', 'cccc......', '.cccc.....', '...ccc....', '....ccc...', '.....ccc..', '......cccc', '.......ccc', '........c.', '..........'],
  core: ['..........', '...oooo...', '..occcco..', '.occyyco..', '.occyycco.', '.occcccco.', '..occccod.', '...oooo...', '..........', '..........'],
  scroll: ['..........', '.nnnnnnnn.', '.cccccccc.', '.ckkkkkkc.', '.cccccccc.', '.ckkkkcc..', '.cccccccc.', '.nnnnnnnn.', '..........', '..........'],
  ticket: ['..........', '.cccccccc.', 'ccyyccyycc', 'cccccccccc', 'ccwwkkwwcc', 'cccccccccc', 'ccyyccyycc', '.cccccccc.', '..........', '..........'],
  bag: ['..........', '...gggg...', '..nccccn..', '.cccccccc.', '.cclcccdd.', '.cccccccc.', '.ccccccdd.', '.ddddddddd', '..ddddddd.', '..........'],
  crystal: ['....ll....', '...lwwl...', '..lccccd..', '.lcwcccd..', '.lccccccd.', '..lccccd..', '...lccd...', '....dd....', '..........', '..........'],
}

export function itemIconUrl(icon: string, color: string) {
  const key = `25d|${icon}|${color}`
  const hit = iconCache.get(key)
  if (hit) return hit

  const size = 48
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const light = shade(color, 0.45)
  const dark = shade(color, -0.35)

  // Subtle 2.5D drop shadow
  ctx.fillStyle = 'rgba(5, 8, 18, 0.48)'
  ctx.beginPath()
  ctx.ellipse(25, 41, 14, 4.5, 0, 0, Math.PI * 2)
  ctx.fill()

  const grad = ctx.createLinearGradient(8, 8, 40, 40)
  grad.addColorStop(0, light)
  grad.addColorStop(0.5, color)
  grad.addColorStop(1, dark)

  ctx.strokeStyle = '#101424'
  ctx.lineWidth = 2.4
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  if (icon === 'potion') {
    ctx.fillStyle = '#b47844'
    ctx.beginPath()
    ctx.roundRect(19, 6, 10, 6, 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(24, 28, 13, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.beginPath()
    ctx.ellipse(19, 23, 3.5, 5.5, -0.4, 0, Math.PI * 2)
    ctx.fill()
  } else if (icon === 'sword' || icon === 'dagger') {
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(39, 8)
    ctx.lineTo(35, 19)
    ctx.lineTo(20, 34)
    ctx.lineTo(14, 28)
    ctx.lineTo(29, 13)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#f5be48'
    ctx.beginPath()
    ctx.roundRect(11, 27, 14, 5, 2)
    ctx.fill()
    ctx.stroke()
  } else if (icon === 'armor' || icon === 'cloak') {
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(14, 10)
    ctx.lineTo(34, 10)
    ctx.lineTo(40, 38)
    ctx.lineTo(24, 41)
    ctx.lineTo(8, 38)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  } else if (icon === 'shoes') {
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(13, 12, 12, 22, 4)
    ctx.roundRect(13, 28, 23, 10, 4)
    ctx.fill()
    ctx.stroke()
  } else if (icon === 'accessory') {
    ctx.strokeStyle = '#f5be48'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(24, 26, 12, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(24, 9)
    ctx.lineTo(31, 16)
    ctx.lineTo(24, 23)
    ctx.lineTo(17, 16)
    ctx.closePath()
    ctx.fill()
  } else if (icon === 'bag') {
    // 2.5D Treasure Chest / Random Box with gold trim & gem lock
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(8, 12, 32, 26, 5)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#facc15'
    ctx.beginPath()
    ctx.roundRect(8, 21, 32, 4.5, 1)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.roundRect(20, 19, 8, 9, 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillRect(12, 14, 24, 3)
  } else if (icon === 'ticket') {
    // Ornate Guild / Bounty Seal Medallion
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(24, 24, 15, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = '#fef08a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(24, 24, 10, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = '#fef9c3'
    ctx.beginPath()
    ctx.moveTo(24, 15)
    ctx.lineTo(29, 24)
    ctx.lineTo(24, 33)
    ctx.lineTo(19, 24)
    ctx.closePath()
    ctx.fill()
  } else if (icon === 'scroll') {
    // Rolled Parchment Scroll
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(12, 9, 24, 30, 4)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#facc15'
    ctx.beginPath()
    ctx.roundRect(9, 8, 30, 6, 3)
    ctx.roundRect(9, 34, 30, 6, 3)
    ctx.fill()
    ctx.stroke()
  } else if (icon === 'core') {
    // Luminous Orb / Compass Core
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(24, 24, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.arc(19, 19, 4.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#fef08a'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(24, 13)
    ctx.lineTo(27, 24)
    ctx.lineTo(24, 35)
    ctx.lineTo(21, 24)
    ctx.closePath()
    ctx.stroke()
  } else {
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(24, 7)
    ctx.lineTo(38, 18)
    ctx.lineTo(32, 38)
    ctx.lineTo(16, 38)
    ctx.lineTo(10, 18)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  const url = c.toDataURL()
  iconCache.set(key, url)
  return url
}
