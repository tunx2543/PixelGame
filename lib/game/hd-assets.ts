// Central loader and manifest for extracted HD hand-drawn fantasy RPG assets
// stored under /public/assets/hd/. Safe under SSR and node:test (guards Image/document).

export const HD_TILE = 64

export const HD_ASSET_PATHS = {
  // Tiles
  grassPlain: '/assets/hd/tiles/grass_plain.png',
  grassFlower1: '/assets/hd/tiles/grass_flower_1.png',
  grassFlower2: '/assets/hd/tiles/grass_flower_2.png',
  grassFlower3: '/assets/hd/tiles/grass_flower_3.png',
  dirtGrass: '/assets/hd/tiles/dirt_grass.png',
  dirtSand: '/assets/hd/tiles/dirt_sand.png',
  cobbleGrey: '/assets/hd/tiles/cobble_grey.png',
  cobbleTan: '/assets/hd/tiles/cobble_tan.png',
  tileTan: '/assets/hd/tiles/tile_tan.png',
  slateStone: '/assets/hd/tiles/slate_stone.png',
  water1: '/assets/hd/tiles/water_1.png',
  water2: '/assets/hd/tiles/water_2.png',
  bridgeWood: '/assets/hd/tiles/bridge_wood.png',
  bridgeStone: '/assets/hd/tiles/bridge_stone.png',

  // Buildings
  guildInn: '/assets/hd/buildings/guild_inn.png',
  marketStall: '/assets/hd/buildings/market_stall.png',
  blueCottage: '/assets/hd/buildings/blue_cottage.png',
  blacksmithForge: '/assets/hd/buildings/blacksmith_forge.png',

  // Landmarks
  angelFountain: '/assets/hd/landmarks/angel_fountain.png',
  stoneWell: '/assets/hd/landmarks/stone_well.png',
  noticeBoard: '/assets/hd/landmarks/notice_board.png',
  signpost: '/assets/hd/landmarks/signpost.png',
  crystalShrine: '/assets/hd/landmarks/crystal_shrine.png',
  townArchway: '/assets/hd/landmarks/town_archway.png',
  woodGate: '/assets/hd/landmarks/wood_gate.png',
  lampBanner: '/assets/hd/landmarks/lamp_banner.png',
  lampPost: '/assets/hd/landmarks/lamp_post.png',
  treasureCart: '/assets/hd/landmarks/treasure_cart.png',
  bannerPost: '/assets/hd/landmarks/banner_post.png',

  // Trees & bushes
  oakLarge: '/assets/hd/trees/oak_large.png',
  oakMedium: '/assets/hd/trees/oak_medium.png',
  oakSmall: '/assets/hd/trees/oak_small.png',
  pineLarge: '/assets/hd/trees/pine_large.png',
  pinePair: '/assets/hd/trees/pine_pair.png',
  bushRound1: '/assets/hd/trees/bush_round_1.png',
  bushRound2: '/assets/hd/trees/bush_round_2.png',

  // Props
  barrelPair: '/assets/hd/props/barrel_pair.png',
  crateBox: '/assets/hd/props/crate_box.png',
  crateSmall: '/assets/hd/props/crate_small.png',
  planterWide: '/assets/hd/props/planter_wide.png',
  planterMed: '/assets/hd/props/planter_med.png',
  fenceWood: '/assets/hd/props/fence_wood.png',
  haystack: '/assets/hd/props/haystack.png',
  bushFlowers1: '/assets/hd/props/bush_flowers_1.png',
  bushFlowers2: '/assets/hd/props/bush_flowers_2.png',
  bushFlowers3: '/assets/hd/props/bush_flowers_3.png',

  // Characters & UI
  heroPortrait: '/assets/hd/ui/portrait_frame.png',
  coinGold: '/assets/hd/ui/coin_gold.png',
  gemBlue: '/assets/hd/ui/gem_blue.png',
  skillFire: '/assets/hd/ui/skill_fire.png',
  skillIce: '/assets/hd/ui/skill_ice.png',
  skillArcane: '/assets/hd/ui/skill_arcane.png',
  skillHeal: '/assets/hd/ui/skill_heal.png',
} as const

export type HdAssetKey = keyof typeof HD_ASSET_PATHS

const imgCache = new Map<string, HTMLImageElement>()
const listeners = new Set<() => void>()
let loadVersion = 0
let preloaded = false

function notifyLoaded() {
  loadVersion++
  for (const cb of listeners) {
    try {
      cb()
    } catch {
      // ignore listener errors
    }
  }
}

export function getHdLoadVersion(): number {
  return loadVersion
}

export function subscribeHdAssets(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getHdImage(keyOrPath: HdAssetKey | string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null
  const src = keyOrPath in HD_ASSET_PATHS ? HD_ASSET_PATHS[keyOrPath as HdAssetKey] : keyOrPath
  let img = imgCache.get(src)
  if (!img) {
    img = new Image()
    img.onload = () => notifyLoaded()
    img.src = src
    imgCache.set(src, img)
  }
  return img.complete && img.naturalWidth > 0 ? img : null
}

export function preloadHdAssets(): void {
  if (preloaded || typeof Image === 'undefined') return
  preloaded = true
  for (const path of Object.values(HD_ASSET_PATHS)) {
    getHdImage(path)
  }
}

export function isHdSpriteReady(key: HdAssetKey): boolean {
  return getHdImage(key) !== null
}
