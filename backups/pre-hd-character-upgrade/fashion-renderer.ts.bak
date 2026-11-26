import type { PlayerExtensionV2 } from './extended-systems'
import { getFashionItemDef } from './premium/fashion-pet'
import type { FashionSlot, PremiumState } from './premium/types'
import type { Dir, SpriteAction } from './sprites'

export type FashionLoadout = Partial<Record<FashionSlot, string | null>>

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

export function preloadFashionLayers(loadout: FashionLoadout | null | undefined): void {
  if (!loadout || typeof document === 'undefined') return
  if (loadout.wings) {
    getFashionLayerImage(loadout.wings)
  }
}

function sanitizeResolvedWingId(candidate: string | null | undefined): string | null {
  if (!candidate) return null
  const def = getFashionItemDef(candidate)
  if (!def || def.slot !== 'wings') return null
  if (!def.wingAnimSheetAsset && !def.wingSpriteAsset) return null
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

export function resolveWingFollowMotion(opts: {
  dir: Dir
  action?: SpriteAction
  frame: number
  timeSec?: number
  isAnimatedSheet?: boolean
}): WingFollowMotion {
  const { dir, action, frame, timeSec = 0, isAnimatedSheet = false } = opts
  const rawAction: SpriteAction = action ?? (frame > 0 ? 'walk' : 'idle')
  const normalizedAction: 'idle' | 'walk' | 'attack' | 'skill' =
    rawAction === 'run' || rawAction === 'follow'
      ? 'walk'
      : rawAction === 'mount' || rawAction === 'dismount'
        ? 'idle'
        : rawAction === 'attack' || rawAction === 'skill' || rawAction === 'walk'
          ? rawAction
          : 'idle'

  const f = frame < 0 ? 0 : Math.floor(frame) % 4

  let bobPx = 0
  let lungePx = 0
  if (normalizedAction === 'idle') {
    bobPx = IDLE_BOB_SEQ[f]
  } else if (normalizedAction === 'walk') {
    bobPx = WALK_BOB_SEQ[f]
  } else if (normalizedAction === 'skill') {
    bobPx = SKILL_BOB_SEQ[f]
    lungePx = SKILL_LUNGE_SEQ[f]
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

  if (normalizedAction === 'idle') {
    const breath = isAnimatedSheet ? 0 : Math.sin(timeSec * 2.8) * 0.024
    flapScaleX = 1 + breath
    flapScaleY = 1 + breath * 0.8
  } else if (normalizedAction === 'walk') {
    const strideLift = f === 1 || f === 3 ? 1 : 0
    const strideFlex = isAnimatedSheet ? 0 : strideLift * 0.04 + Math.sin(timeSec * 8) * 0.012
    flapScaleX = 1 + strideFlex
    flapScaleY = 1 + strideFlex * 0.75
    tiltRad = -dirSign * (0.045 + strideLift * 0.018)
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
  const wingId = sanitizeResolvedWingId(loadout?.wings)
  if (!wingId) return ''
  const img = getFashionLayerImage(wingId)
  const ready = img ? (img.complete && img.naturalWidth > 0 ? '1' : '0') : 'n'
  if (timeSec !== undefined) {
    const def = getFashionItemDef(wingId)
    if (def?.wingAnimSheetAsset) {
      const frames = Math.max(1, def.wingAnimFrames ?? 16)
      return `wings:${wingId}@${ready}:f${Math.floor(timeSec * 16) % frames}`
    }
    if (def?.wingSpriteAsset) {
      return `wings:${wingId}@${ready}:w${Math.floor(timeSec * 8) % 16}`
    }
  }
  return `wings:${wingId}@${ready}`
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
  const wingId = sanitizeResolvedWingId(loadout?.wings)
  if (!wingId) return false

  const shouldDrawWings =
    (phase === 'behind' && dir !== 'up') ||
    (phase === 'overBack' && dir === 'up')
  if (!shouldDrawWings) return false

  const def = getFashionItemDef(wingId)
  const img = getFashionLayerImage(wingId)
  if (!def || !img || !img.complete || img.naturalWidth <= 0) return false

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
