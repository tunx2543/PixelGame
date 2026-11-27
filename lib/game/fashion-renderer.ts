import type { PlayerExtensionV2 } from './extended-systems'
import { getFashionItemDef } from './premium/fashion-pet'
import type { FashionSlot, PremiumState } from './premium/types'
import {
  HERO_ANIMATION_DEFS,
  drawSheetFrameSpec,
  getHeroSheetFrameSpec,
  preloadHeroLayerSheets,
} from './sprite-sheets'
import type { Dir, ResolvedDrawable, SpriteAction } from './sprites'

export type FashionLoadout = Partial<Record<FashionSlot, string | null>>

const HERO_SHEET_FRAME_W = 168
const HERO_SHEET_FRAME_H = 192
const HERO_DIRS: readonly Dir[] = ['down', 'up', 'left', 'right']

const WEARABLE_FASHION_SLOTS: readonly FashionSlot[] = [
  'hat',
  'hair',
  'costume',
  'pants',
  'shoes',
  'wings',
  'back',
  'accessory',
  'aura',
]

const layerImageCache = new Map<string, HTMLImageElement | null>()

export function getFashionLayerImage(fashionId: string | null | undefined): HTMLImageElement | null {
  if (!fashionId || typeof document === 'undefined') return null
  const def = getFashionItemDef(fashionId)
  const assetSrc = def?.wingAnimSheetAsset ?? def?.wingSpriteAsset ?? def?.layerSheetAsset
  if (!assetSrc) return null
  const cached = layerImageCache.get(fashionId)
  if (cached !== undefined) return cached
  const img = new Image()
  img.src = assetSrc
  layerImageCache.set(fashionId, img)
  return img
}

function isFashionImageReady(fashionId: string | null | undefined): HTMLImageElement | null {
  const img = getFashionLayerImage(fashionId)
  return img && img.complete && img.naturalWidth > 0 ? img : null
}

export function getEquippedFashionImages(loadout: FashionLoadout | null | undefined): HTMLImageElement[] {
  if (!loadout || typeof document === 'undefined') return []
  const imgs: HTMLImageElement[] = []
  for (const slot of WEARABLE_FASHION_SLOTS) {
    const id = loadout[slot]
    if (!id) continue
    const img = getFashionLayerImage(id)
    if (img) imgs.push(img)
  }
  return imgs
}

export function hasWearableFashionLoadout(loadout: FashionLoadout | null | undefined): boolean {
  if (!loadout) return false
  for (const slot of WEARABLE_FASHION_SLOTS) {
    if (loadout[slot]) return true
  }
  return false
}

export function preloadFashionLayers(loadout: FashionLoadout | null | undefined): void {
  if (!loadout || typeof document === 'undefined') return
  for (const slot of WEARABLE_FASHION_SLOTS) {
    const id = loadout[slot]
    if (id) {
      getFashionLayerImage(id)
    }
  }
}

function sanitizeResolvedWingId(candidate: string | null | undefined): string | null {
  if (!candidate) return null
  const def = getFashionItemDef(candidate)
  if (!def || def.slot !== 'wings') return null
  if (!def.wingAnimSheetAsset && !def.wingSpriteAsset) return null
  return def.id
}

function sanitizeWearableFashionId(slot: FashionSlot, candidate: string | null | undefined): string | null {
  if (!candidate) return null
  const def = getFashionItemDef(candidate)
  if (!def || def.slot !== slot) return null
  if (slot === 'wings') return sanitizeResolvedWingId(candidate)
  if (!def.layerSheetAsset) return null
  return def.id
}

export function resolveFashionLoadoutFromSave(source: {
  premium?: Partial<PremiumState> | null
  equippedGemFashion?: string | null
  extV2?: Partial<PlayerExtensionV2> | null
}): FashionLoadout {
  const eq = source.premium?.fashion?.equipped
  const gem = source.equippedGemFashion ?? null
  const ext = source.extV2

  const hat = eq?.hat ?? (gem === 'aurora_cat_hood' ? 'aurora_cat_hood' : null)
  const aura = eq?.aura ?? (gem === 'sunfire_aura' ? 'sunfire_aura' : null)
  const wings = sanitizeResolvedWingId(eq?.wings) ?? sanitizeResolvedWingId(ext?.equippedWing)
  const weaponSkin = eq?.weaponSkin ?? ext?.equippedWeaponSkin ?? null

  return {
    hat: hat ?? null,
    hair: eq?.hair ?? null,
    costume: eq?.costume ?? null,
    pants: eq?.pants ?? null,
    shoes: eq?.shoes ?? null,
    wings: wings ?? null,
    back: eq?.back ?? null,
    accessory: eq?.accessory ?? null,
    aura: aura ?? null,
    weaponSkin: weaponSkin ?? null,
    mountAppearance: eq?.mountAppearance ?? null,
  }
}

export function resolveFashionLoadoutFromRemote(other: {
  fashionCostume?: string | null
  fashionHair?: string | null
  fashionAura?: string | null
  fashionWings?: string | null
  cosmeticWing?: string | null
  weaponSkinId?: string | null
  gemFashionId?: string | null
  mountSkinId?: string | null
}): FashionLoadout {
  return {
    hat: other.gemFashionId === 'aurora_cat_hood' ? 'aurora_cat_hood' : null,
    hair: other.fashionHair ?? null,
    costume: other.fashionCostume ?? null,
    pants: null,
    shoes: null,
    wings: sanitizeResolvedWingId(other.fashionWings) ?? sanitizeResolvedWingId(other.cosmeticWing),
    back: null,
    accessory: null,
    aura: other.fashionAura ?? (other.gemFashionId === 'sunfire_aura' ? 'sunfire_aura' : null),
    weaponSkin: other.weaponSkinId ?? null,
    mountAppearance: other.mountSkinId ?? null,
  }
}

export interface FashionSheetCoords {
  row: number
  col: number
  sx: number
  sy: number
  sw: number
  sh: number
}

export function resolveFashionSheetCoords(
  action: SpriteAction | undefined,
  dir: Dir,
  frame: number,
): FashionSheetCoords {
  const rawAction: SpriteAction = action ?? (frame > 0 ? 'walk' : 'idle')
  const normalizedAction =
    rawAction === 'follow'
      ? 'walk'
      : rawAction === 'mount' || rawAction === 'dismount'
        ? 'idle'
        : rawAction

  let animIndex = HERO_ANIMATION_DEFS.findIndex((d) => d.name === normalizedAction)
  if (animIndex < 0) animIndex = 0
  const animDef = HERO_ANIMATION_DEFS[animIndex]
  const dirIndex = Math.max(0, HERO_DIRS.indexOf(dir))
  const row = animIndex * HERO_DIRS.length + dirIndex
  const col =
    animDef.name === 'idle' && frame < 0
      ? 2 % animDef.frames
      : Math.max(0, Math.floor(Math.abs(frame))) % animDef.frames

  return {
    row,
    col,
    sx: col * HERO_SHEET_FRAME_W,
    sy: row * HERO_SHEET_FRAME_H,
    sw: HERO_SHEET_FRAME_W,
    sh: HERO_SHEET_FRAME_H,
  }
}

export interface WingFollowMotion {
  anchorXFrac: number
  anchorYFrac: number
  profileScaleX: number
  flapScaleX: number
  flapScaleY: number
  tiltRad: number
  flipX: boolean
  bobPx: number
  lungePx: number
}

const IDLE_BOB_SEQ = [0, 1.8, 0.6, -0.8] as const
const WALK_BOB_SEQ = [0, -4.5, 0, -4.5] as const
const ATTACK_BOB_SEQ = [1, -4, -1, 1] as const
const ATTACK_LUNGE_SEQ = [-4, 10, 13, 3] as const
const SKILL_BOB_SEQ = [3, -7, -4.5, 1] as const
const SKILL_LUNGE_SEQ = [-2, 4, 7, 2] as const
const HIT_BOB_SEQ = [2, 4, 1] as const
const HIT_LUNGE_SEQ = [-6, -4, -1] as const
const VICTORY_BOB_SEQ = [0, -8, -11, -2, 0] as const

export function resolveWingFollowMotion(opts: {
  dir: Dir
  action?: SpriteAction
  frame: number
  timeSec?: number
  isAnimatedSheet?: boolean
}): WingFollowMotion {
  const { dir, action, frame, timeSec = 0, isAnimatedSheet = false } = opts
  const rawAction: SpriteAction = action ?? (frame > 0 ? 'walk' : 'idle')
  const normalizedAction: 'idle' | 'walk' | 'run' | 'attack' | 'skill' | 'hit' | 'death' | 'victory' =
    rawAction === 'follow'
      ? 'walk'
      : rawAction === 'mount' || rawAction === 'dismount'
        ? 'idle'
        : rawAction === 'run' ||
            rawAction === 'attack' ||
            rawAction === 'skill' ||
            rawAction === 'walk' ||
            rawAction === 'hit' ||
            rawAction === 'death' ||
            rawAction === 'victory'
          ? rawAction
          : 'idle'

  const safeFrame = frame < 0 ? 0 : Math.floor(frame)
  const f = safeFrame % 4

  let bobPx = 0
  let lungePx = 0
  if (normalizedAction === 'idle') {
    bobPx = IDLE_BOB_SEQ[f]
  } else if (normalizedAction === 'walk') {
    bobPx = WALK_BOB_SEQ[f]
  } else if (normalizedAction === 'run') {
    const rf = safeFrame % 6
    bobPx = [-1.5, -4.5, -6, -1.5, -4.5, -6][rf]
    lungePx = 4
  } else if (normalizedAction === 'skill') {
    bobPx = SKILL_BOB_SEQ[f]
    lungePx = SKILL_LUNGE_SEQ[f]
  } else if (normalizedAction === 'hit') {
    const hf = safeFrame % 3
    bobPx = HIT_BOB_SEQ[hf]
    lungePx = HIT_LUNGE_SEQ[hf]
  } else if (normalizedAction === 'death') {
    const df = Math.min(4, safeFrame)
    bobPx = [4, 14, 24, 32, 34][df]
  } else if (normalizedAction === 'victory') {
    const vf = safeFrame % 5
    bobPx = VICTORY_BOB_SEQ[vf]
  } else {
    bobPx = ATTACK_BOB_SEQ[f]
    lungePx = ATTACK_LUNGE_SEQ[f]
  }

  const dirSign = dir === 'left' ? -1 : dir === 'right' ? 1 : 0
  const flipX = dir === 'left'
  const profileScaleX = dir === 'left' || dir === 'right' ? 0.78 : 1
  const backOffsetXFrac = -dirSign * 0.065
  const lungeXFrac = dirSign * (lungePx / 168)
  const anchorXFrac = 0.5 + backOffsetXFrac + lungeXFrac
  const baseAnchorYFrac = dir === 'up' ? 0.51 : 0.49
  const anchorYFrac = baseAnchorYFrac + bobPx / 192

  let flapScaleX = 1
  let flapScaleY = 1
  let tiltRad = 0

  if (normalizedAction === 'idle' || normalizedAction === 'victory') {
    const breath = isAnimatedSheet ? 0 : Math.sin(timeSec * 2.8) * 0.024
    flapScaleX = 1 + breath
    flapScaleY = 1 + breath * 0.8
  } else if (normalizedAction === 'walk' || normalizedAction === 'run') {
    const strideLift = f === 1 || f === 3 ? 1 : 0
    const strideFlex = isAnimatedSheet ? 0 : strideLift * 0.04 + Math.sin(timeSec * 8) * 0.012
    flapScaleX = 1 + strideFlex
    flapScaleY = 1 + strideFlex * 0.75
    tiltRad = -dirSign * (0.045 + strideLift * 0.018)
  } else if (normalizedAction === 'hit' || normalizedAction === 'death') {
    flapScaleX = normalizedAction === 'death' ? 0.85 : 0.94
    flapScaleY = normalizedAction === 'death' ? 0.65 : 0.94
    tiltRad = dirSign * 0.06
  } else {
    const combatFlex = isAnimatedSheet ? 0 : f === 0 ? -0.045 : f === 1 || f === 2 ? 0.075 : 0.02
    flapScaleX = 1 + combatFlex
    flapScaleY = 1 + combatFlex * 0.75
    const combatTilt = f === 0 ? -0.035 : f === 1 || f === 2 ? 0.075 : 0.02
    tiltRad = -dirSign * combatTilt
  }

  return {
    anchorXFrac,
    anchorYFrac,
    profileScaleX,
    flapScaleX,
    flapScaleY,
    tiltRad,
    flipX,
    bobPx,
    lungePx,
  }
}

export function getFashionRenderSignature(
  loadout: FashionLoadout | null | undefined,
  timeSec?: number,
): string {
  if (!loadout) return ''
  const parts: string[] = []
  for (const slot of WEARABLE_FASHION_SLOTS) {
    const itemId = sanitizeWearableFashionId(slot, loadout[slot])
    if (!itemId) continue
    const img = getFashionLayerImage(itemId)
    const ready = img ? (img.complete && img.naturalWidth > 0 ? '1' : '0') : 'n'
    if (slot === 'wings') {
      if (timeSec !== undefined) {
        const def = getFashionItemDef(itemId)
        if (def?.wingAnimSheetAsset) {
          const frames = Math.max(1, def.wingAnimFrames ?? 16)
          parts.push(`wings:${itemId}@${ready}:f${Math.floor(timeSec * 16) % frames}`)
          continue
        }
        if (def?.wingSpriteAsset) {
          parts.push(`wings:${itemId}@${ready}:w${Math.floor(timeSec * 8) % 16}`)
          continue
        }
      }
      parts.push(`wings:${itemId}@${ready}`)
    } else if (slot === 'aura') {
      const animTick = timeSec !== undefined ? `:a${Math.floor(timeSec * 8) % 6}` : ''
      parts.push(`aura:${itemId}@${ready}${animTick}`)
    } else {
      parts.push(`${slot}:${itemId}@${ready}`)
    }
  }
  return parts.join('|')
}

function drawSynchronizedLayerSlot(opts: {
  ctx: CanvasRenderingContext2D
  slot: FashionSlot
  itemId: string | null | undefined
  dir: Dir
  action?: SpriteAction
  frame: number
  dx: number
  dy: number
  dw: number
  dh: number
  alpha?: number
}): boolean {
  const { ctx, slot, itemId, dir, action, frame, dx, dy, dw, dh, alpha = 1 } = opts
  const validId = sanitizeWearableFashionId(slot, itemId)
  if (!validId) return false
  const img = isFashionImageReady(validId)
  if (!img) return false
  const coords = resolveFashionSheetCoords(action, dir, frame)
  ctx.save()
  if (alpha < 1) {
    ctx.globalAlpha *= alpha
  }
  ctx.imageSmoothingEnabled = dw < HERO_SHEET_FRAME_W
  ctx.drawImage(img, coords.sx, coords.sy, coords.sw, coords.sh, dx, dy, dw, dh)
  ctx.restore()
  return true
}

function drawWingSlot(opts: {
  ctx: CanvasRenderingContext2D
  wingId: string
  dir: Dir
  action?: SpriteAction
  frame: number
  dx: number
  dy: number
  dw: number
  dh: number
  alpha?: number
  timeSec?: number
}): boolean {
  const { ctx, wingId, dir, action, frame, dx, dy, dw, dh, alpha = 1, timeSec } = opts
  const def = getFashionItemDef(wingId)
  const img = isFashionImageReady(wingId)
  if (!def || !img) return false

  const isAnimatedSheet = Boolean(def.wingAnimSheetAsset)
  if (!isAnimatedSheet && !def.wingSpriteAsset) return false

  const t = timeSec ?? (typeof performance !== 'undefined' ? performance.now() / 1000 : 0)
  const motion = resolveWingFollowMotion({
    dir,
    action,
    frame,
    timeSec: t,
    isAnimatedSheet,
  })

  const targetH = dh * (isAnimatedSheet ? 0.96 : 0.88)
  const targetW = dw * (isAnimatedSheet ? 1.24 : 1.14) * motion.profileScaleX
  const anchorX = dx + dw * motion.anchorXFrac
  const anchorY = dy + dh * motion.anchorYFrac

  ctx.save()
  if (alpha < 1) {
    ctx.globalAlpha *= alpha
  }
  ctx.imageSmoothingEnabled = false
  ctx.translate(anchorX, anchorY)
  if (motion.tiltRad !== 0) {
    ctx.rotate(motion.tiltRad)
  }
  ctx.scale((motion.flipX ? -1 : 1) * motion.flapScaleX, motion.flapScaleY)

  if (isAnimatedSheet) {
    const frames = Math.max(1, def.wingAnimFrames ?? 16)
    const frameW = Math.max(1, Math.floor(img.naturalWidth / frames))
    const frameH = Math.max(1, img.naturalHeight)
    const frameIdx = Math.floor(t * 16) % frames
    ctx.drawImage(
      img,
      frameIdx * frameW,
      0,
      frameW,
      frameH,
      -targetW / 2,
      -targetH / 2,
      targetW,
      targetH,
    )
  } else {
    ctx.drawImage(
      img,
      0,
      0,
      img.naturalWidth,
      img.naturalHeight,
      -targetW / 2,
      -targetH / 2,
      targetW,
      targetH,
    )
  }

  ctx.restore()
  return true
}

export function drawCharacterFashionLayers(opts: {
  ctx: CanvasRenderingContext2D
  loadout: FashionLoadout | null | undefined
  phase: 'behind' | 'overBody' | 'overBack'
  dir: Dir
  action?: SpriteAction
  frame: number
  dx: number
  dy: number
  dw: number
  dh: number
  alpha?: number
  timeSec?: number
}): boolean {
  const { ctx, loadout, phase, dir, action, frame, dx, dy, dw, dh, alpha = 1, timeSec } = opts
  if (!loadout) return false

  let drew = false
  const t = timeSec ?? (typeof performance !== 'undefined' ? performance.now() / 1000 : 0)

  if (phase === 'behind') {
    if (loadout.aura) {
      const auraFrame = Math.floor(t * 8) % 6
      if (
        drawSynchronizedLayerSlot({
          ctx,
          slot: 'aura',
          itemId: loadout.aura,
          dir,
          action: action ?? 'idle',
          frame: action === 'idle' || !action ? auraFrame : frame,
          dx,
          dy,
          dw,
          dh,
          alpha,
        })
      ) {
        drew = true
      }
    }
    if (dir !== 'up' && loadout.back) {
      if (
        drawSynchronizedLayerSlot({
          ctx,
          slot: 'back',
          itemId: loadout.back,
          dir,
          action,
          frame,
          dx,
          dy,
          dw,
          dh,
          alpha,
        })
      ) {
        drew = true
      }
    }
    const wingId = sanitizeResolvedWingId(loadout.wings)
    if (dir !== 'up' && wingId) {
      if (drawWingSlot({ ctx, wingId, dir, action, frame, dx, dy, dw, dh, alpha, timeSec: t })) {
        drew = true
      }
    }
    return drew
  }

  if (phase === 'overBody') {
    for (const slot of ['pants', 'shoes', 'costume', 'hair', 'hat', 'accessory'] as const) {
      const id = loadout[slot]
      if (!id) continue
      if (
        drawSynchronizedLayerSlot({
          ctx,
          slot,
          itemId: id,
          dir,
          action,
          frame,
          dx,
          dy,
          dw,
          dh,
          alpha,
        })
      ) {
        drew = true
      }
    }
    return drew
  }

  // phase === 'overBack' (facing away: back accessory & wings sit over body)
  if (dir === 'up') {
    const wingId = sanitizeResolvedWingId(loadout.wings)
    if (wingId) {
      if (drawWingSlot({ ctx, wingId, dir, action, frame, dx, dy, dw, dh, alpha, timeSec: t })) {
        drew = true
      }
    }
    if (loadout.back) {
      if (
        drawSynchronizedLayerSlot({
          ctx,
          slot: 'back',
          itemId: loadout.back,
          dir,
          action,
          frame,
          dx,
          dy,
          dw,
          dh,
          alpha,
        })
      ) {
        drew = true
      }
    }
  }
  return drew
}

export function drawHeroDrawableWithFashion(opts: {
  ctx: CanvasRenderingContext2D
  jobId: string | undefined
  drawable: ResolvedDrawable
  loadout: FashionLoadout | null | undefined
  dir: Dir
  action?: SpriteAction
  frame: number
  dx: number
  dy: number
  dw: number
  dh: number
  alpha?: number
  timeSec?: number
  drawBase: () => void
}): void {
  const { ctx, jobId, drawable, loadout, dir, action, frame, dx, dy, dw, dh, alpha = 1, timeSec, drawBase } = opts
  if (loadout) {
    preloadFashionLayers(loadout)
  }

  drawCharacterFashionLayers({
    ctx,
    loadout,
    phase: 'behind',
    dir,
    action,
    frame,
    dx,
    dy,
    dw,
    dh,
    alpha,
    timeSec,
  })

  const costumeId = sanitizeWearableFashionId('costume', loadout?.costume)
  const hairId = sanitizeWearableFashionId('hair', loadout?.hair)
  const replaceArmor = Boolean(costumeId && isFashionImageReady(costumeId))
  const replaceHair = Boolean(hairId && isFashionImageReady(hairId))

  if (jobId && drawable.sheetId && (replaceArmor || replaceHair)) {
    preloadHeroLayerSheets(jobId)
    const actionKey: SpriteAction = action ?? (frame > 0 ? 'walk' : 'idle')
    const bodySpec = getHeroSheetFrameSpec(jobId, dir, actionKey, frame, 'body')
    const armorSpec = replaceArmor ? null : getHeroSheetFrameSpec(jobId, dir, actionKey, frame, 'armor')
    const hairSpec = replaceHair ? null : getHeroSheetFrameSpec(jobId, dir, actionKey, frame, 'hair')
    const weaponSpec = getHeroSheetFrameSpec(jobId, dir, actionKey, frame, 'weapon')

    const modularReady =
      Boolean(bodySpec) &&
      Boolean(weaponSpec) &&
      (replaceArmor || Boolean(armorSpec)) &&
      (replaceHair || Boolean(hairSpec))

    if (modularReady && bodySpec && weaponSpec) {
      if (dir === 'up') {
        drawSheetFrameSpec(ctx, weaponSpec, dx, dy, dw, dh)
      }
      drawSheetFrameSpec(ctx, bodySpec, dx, dy, dw, dh)

      if (replaceArmor && costumeId) {
        drawSynchronizedLayerSlot({ ctx, slot: 'pants', itemId: loadout?.pants, dir, action, frame, dx, dy, dw, dh, alpha })
        drawSynchronizedLayerSlot({ ctx, slot: 'shoes', itemId: loadout?.shoes, dir, action, frame, dx, dy, dw, dh, alpha })
        drawSynchronizedLayerSlot({ ctx, slot: 'costume', itemId: costumeId, dir, action, frame, dx, dy, dw, dh, alpha })
      } else if (armorSpec) {
        drawSheetFrameSpec(ctx, armorSpec, dx, dy, dw, dh)
        drawSynchronizedLayerSlot({ ctx, slot: 'pants', itemId: loadout?.pants, dir, action, frame, dx, dy, dw, dh, alpha })
        drawSynchronizedLayerSlot({ ctx, slot: 'shoes', itemId: loadout?.shoes, dir, action, frame, dx, dy, dw, dh, alpha })
      }

      if (replaceHair && hairId) {
        drawSynchronizedLayerSlot({ ctx, slot: 'hair', itemId: hairId, dir, action, frame, dx, dy, dw, dh, alpha })
      } else if (hairSpec) {
        drawSheetFrameSpec(ctx, hairSpec, dx, dy, dw, dh)
      }

      drawSynchronizedLayerSlot({ ctx, slot: 'hat', itemId: loadout?.hat, dir, action, frame, dx, dy, dw, dh, alpha })
      drawSynchronizedLayerSlot({ ctx, slot: 'accessory', itemId: loadout?.accessory, dir, action, frame, dx, dy, dw, dh, alpha })

      if (dir !== 'up') {
        drawSheetFrameSpec(ctx, weaponSpec, dx, dy, dw, dh)
      }

      drawCharacterFashionLayers({
        ctx,
        loadout,
        phase: 'overBack',
        dir,
        action,
        frame,
        dx,
        dy,
        dw,
        dh,
        alpha,
        timeSec,
      })
      return
    }
  }

  // Default: base composite sheet + overBody accessories/hats/pants/shoes + overBack
  drawBase()
  if (loadout) {
    drawCharacterFashionLayers({
      ctx,
      loadout,
      phase: 'overBody',
      dir,
      action,
      frame,
      dx,
      dy,
      dw,
      dh,
      alpha,
      timeSec,
    })
    drawCharacterFashionLayers({
      ctx,
      loadout,
      phase: 'overBack',
      dir,
      action,
      frame,
      dx,
      dy,
      dw,
      dh,
      alpha,
      timeSec,
    })
  }
}
