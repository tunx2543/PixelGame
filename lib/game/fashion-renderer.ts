import type { PlayerExtensionV2 } from './extended-systems'
import { getFashionItemDef } from './premium/fashion-pet'
import type { FashionSlot, PremiumState } from './premium/types'
import type { Dir } from './sprites'

export type FashionLoadout = Partial<Record<FashionSlot, string | null>>

const layerImageCache = new Map<string, HTMLImageElement | null>()

export function getFashionLayerImage(fashionId: string | null | undefined): HTMLImageElement | null {
  if (!fashionId || typeof document === 'undefined') return null
  const def = getFashionItemDef(fashionId)
  if (!def?.layerSheetAsset) return null
  const cached = layerImageCache.get(fashionId)
  if (cached !== undefined) return cached
  const img = new Image()
  img.src = def.layerSheetAsset
  layerImageCache.set(fashionId, img)
  return img
}

export function preloadFashionLayers(loadout: FashionLoadout | null | undefined): void {
  if (!loadout || typeof document === 'undefined') return
  for (const id of Object.values(loadout)) {
    if (id) getFashionLayerImage(id)
  }
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
  const wings =
    eq?.wings ??
    ext?.equippedWing ??
    (gem === 'nebula_dragon_wings' ? 'nebula_dragon_wings' : null)
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
    wings:
      other.fashionWings ??
      other.cosmeticWing ??
      (other.gemFashionId === 'nebula_dragon_wings' ? 'nebula_dragon_wings' : null),
    back: null,
    accessory: null,
    aura: other.fashionAura ?? (other.gemFashionId === 'sunfire_aura' ? 'sunfire_aura' : null),
    weaponSkin: other.weaponSkinId ?? null,
    mountAppearance: other.mountSkinId ?? null,
  }
}

export function getFashionRenderSignature(loadout: FashionLoadout | null | undefined): string {
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
}): boolean {
  const { ctx, loadout, phase, dir, frame, dx, dy, dw, dh, alpha = 1 } = opts
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
    const img = getFashionLayerImage(id)
    if (!img || !img.complete || img.naturalWidth <= 0) continue
    ctx.drawImage(img, sx, sy, 168, 192, dx, dy, dw, dh)
    drewAny = true
  }

  ctx.restore()
  return drewAny
}
