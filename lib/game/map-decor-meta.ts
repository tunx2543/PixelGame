import { T } from './maps'

export interface TownStructureSpec {
  id: string
  assetKey: string
  tx: number
  ty: number
  tw: number
  th: number
  baseYOffsetTiles: number
  overheadSplitRatio: number
  tint?: string
  animatedForge?: boolean
  kind: 'building' | 'watchtower' | 'fountain'
}

// Tiles that represent vertical 3D objects/buildings/trees rendered in the depth-sorted entity & overhead pass.
export const LAYERED_PROP_TILES = new Set<number>([
  T.TREE,
  T.PINE,
  T.BUSH,
  T.ROCK,
  T.CRYSTAL,
  T.FENCE,
  T.SIGN,
  T.FOUNTAIN,
])

export const TOWN_BUILDING_TILE_MASK = new Set<number>([
  T.WALL,
  T.WINDOW,
  T.DOOR,
  T.ROOF_RED,
  T.ROOF_BLUE,
  T.ROOF_PURPLE,
  T.ROOF_GREEN,
])

// Pure Town structure layout matching maps.ts buildTown() coordinates without altering collision grid.
export const TOWN_STRUCTURES: TownStructureSpec[] = [
  {
    id: 'town_guild_inn',
    assetKey: 'guildInn',
    tx: 5,
    ty: 3,
    tw: 8,
    th: 4,
    baseYOffsetTiles: 0.15,
    overheadSplitRatio: 0.44,
    kind: 'building',
  },
  {
    id: 'town_blacksmith',
    assetKey: 'blacksmithForge',
    tx: 31,
    ty: 3,
    tw: 8,
    th: 4,
    baseYOffsetTiles: 0.15,
    overheadSplitRatio: 0.42,
    animatedForge: true,
    kind: 'building',
  },
  {
    id: 'town_job_hall',
    assetKey: 'blueCottage',
    tx: 5,
    ty: 18,
    tw: 8,
    th: 4,
    baseYOffsetTiles: 0.15,
    overheadSplitRatio: 0.44,
    tint: 'rgba(139, 92, 246, 0.22)',
    kind: 'building',
  },
  {
    id: 'town_storage_vault',
    assetKey: 'blueCottage',
    tx: 31,
    ty: 18,
    tw: 8,
    th: 4,
    baseYOffsetTiles: 0.15,
    overheadSplitRatio: 0.44,
    tint: 'rgba(16, 185, 129, 0.2)',
    kind: 'building',
  },
  { id: 'tower_nw', assetKey: 'blueCottage', tx: 1, ty: 1, tw: 3, th: 4, baseYOffsetTiles: 0.1, overheadSplitRatio: 0.45, kind: 'watchtower' },
  { id: 'tower_ne', assetKey: 'blueCottage', tx: 40, ty: 1, tw: 3, th: 4, baseYOffsetTiles: 0.1, overheadSplitRatio: 0.45, kind: 'watchtower' },
  { id: 'tower_sw', assetKey: 'blueCottage', tx: 1, ty: 27, tw: 3, th: 4, baseYOffsetTiles: 0.1, overheadSplitRatio: 0.45, kind: 'watchtower' },
  { id: 'tower_se', assetKey: 'blueCottage', tx: 40, ty: 27, tw: 3, th: 4, baseYOffsetTiles: 0.1, overheadSplitRatio: 0.45, kind: 'watchtower' },
  {
    id: 'town_angel_fountain',
    assetKey: 'angelFountain',
    tx: 21,
    ty: 15,
    tw: 2,
    th: 2,
    baseYOffsetTiles: 0.35,
    overheadSplitRatio: 0.38,
    kind: 'fountain',
  },
]
