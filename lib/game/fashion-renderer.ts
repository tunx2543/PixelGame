import type { PlayerExtensionV2 } from './extended-systems'
import { getFashionItemDef } from './premium/fashion-pet'
import type { FashionSlot, PremiumState } from './premium/types'
import type { Dir } from './sprites'

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
  for (const id of Object.values(loadout)) {
    if (id) getFashionLayerImage(id)
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

export function getFashionRenderSignature(
  loadout: FashionLoadout | null | undefined,
  timeSec?: number,
): string {
  if (!loadout) return ''
  const orderedSlots: FashionSlot[] = [
    'hat',
    'hair',
    'costume',
    'pants',
    'shoes',
    'wings',
    'back',
    'accessory',
    'aura',
    'weaponSkin',
    'mountAppearance',
  ]
  return orderedSlots
    .map((slot) => {
      const id = loadout[slot] ?? ''
      if (!id) return ''
      const img = getFashionLayerImage(id)
      const ready = img ? (img.complete && img.naturalWidth > 0 ? '1' : '0') : 'n'
      if (slot === 'wings' && timeSec !== undefined) {
        const def = getFashionItemDef(id)
        if (def?.wingAnimSheetAsset) {
          const frames = Math.max(1, def.wingAnimFrames ?? 16)
          return `${slot}:${id}@${ready}:f${Math.floor(timeSec * 12) % frames}`
        }
        if (def?.wingSpriteAsset) {
          return `${slot}:${id}@${ready}:w${Math.floor(timeSec * 6) % 8}`
        }
      }
      return `${slot}:${id}@${ready}`
    })
    .filter(Boolean)
    .join(',')
}

const DIR_ROW: Record<Dir, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
}

export function drawCharacterFashionLayers(opts: {
  ctx: CanvasRenderingContext2D
  loadout: FashionLoadout | null | undefined
  phase: 'behind' | 'overBody' | 'overBack'
  dir: Dir
  frame: number
  dx: number
  dy: number
  dw: number
  dh: number
  alpha?: number
  timeSec?: number
}): boolean {
  const { ctx, loadout, phase, dir, frame, dx, dy, dw, dh, alpha = 1, timeSec } = opts
  if (!loadout) return false

  let slots: FashionSlot[] = []
  if (phase === 'behind') {
    slots = dir === 'up' ? ['aura'] : ['aura', 'wings', 'back']
  } else if (phase === 'overBody') {
    slots = ['shoes', 'pants', 'costume', 'hair', 'hat', 'accessory']
  } else if (phase === 'overBack') {
    slots = dir === 'up' ? ['back', 'wings'] : []
  }

  if (slots.length === 0) return false

  const t = timeSec ?? (typeof performance !== 'undefined' ? performance.now() / 1000 : 0)
  const row = DIR_ROW[dir] ?? 0
  const col = Math.abs(frame < 0 ? 0 : Math.floor(frame)) % 4
  const sx = col * 168
  const sy = row * 192
  let drewAny = false

  ctx.save()
  if (alpha < 1) {
    ctx.globalAlpha *= alpha
  }

  for (const slot of slots) {
    const id = loadout[slot]
    if (!id) continue
    const def = getFashionItemDef(id)
    const img = getFashionLayerImage(id)
    if (!img || !img.complete || img.naturalWidth <= 0) continue

    if (slot === 'wings' && (def?.wingAnimSheetAsset || def?.wingSpriteAsset)) {
      const sideBiasX = dir === 'left' ? dw * 0.12 : dir === 'right' ? -dw * 0.12 : 0
      const scaleX = dir === 'left' || dir === 'right' ? 0.72 : 1
      const flapBob = def.wingAnimSheetAsset ? 0 : Math.sin(t * 5.2) * (dh * 0.025)
      const flapScaleY = def.wingAnimSheetAsset ? 1 : 1 + Math.sin(t * 5.2) * 0.055
      const targetH = dh * (def.wingAnimSheetAsset ? 0.96 : 0.88)
      const targetW = dw * (def.wingAnimSheetAsset ? 1.24 : 1.14) * scaleX
      const anchorX = dx + dw * 0.5 + sideBiasX
      const anchorY = dy + dh * (dir === 'up' ? 0.45 : 0.42) + flapBob

      ctx.save()
      ctx.imageSmoothingEnabled = false
      ctx.translate(anchorX, anchorY)
      ctx.scale(1, flapScaleY)

      if (def.wingAnimSheetAsset) {
        const frames = Math.max(1, def.wingAnimFrames ?? 16)
        const frameW = Math.max(1, Math.floor(img.naturalWidth / frames))
        const frameH = Math.max(1, img.naturalHeight)
        const frameIdx = Math.floor(t * 12) % frames
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
      drewAny = true
      continue
    }

    ctx.drawImage(img, sx, sy, 168, 192, dx, dy, dw, dh)
    drewAny = true
  }

  ctx.restore()
  return drewAny
}
