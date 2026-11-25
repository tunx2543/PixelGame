import { BIOME_SPAWNS } from './biome-monsters'

export const TILE = 16

export const T = {
  GRASS: 0,
  FLOWER: 1,
  PATH: 2,
  WATER: 3,
  TREE: 4,
  WALL: 5,
  ROOF_RED: 6,
  DOOR: 7,
  FENCE: 8,
  PLAZA: 9,
  FOUNTAIN: 10,
  DARKGRASS: 11,
  BUSH: 12,
  ROCK: 13,
  CAVEFLOOR: 14,
  CAVEWALL: 15,
  VOLCFLOOR: 16,
  LAVA: 17,
  SAND: 18,
  WINDOW: 19,
  PINE: 20,
  CRYSTAL: 21,
  ROOF_BLUE: 22,
  ROOF_PURPLE: 23,
  ROOF_GREEN: 24,
  SIGN: 25,
  MUSHROOMS: 26,
  BONES: 27,
  BRIDGE_H: 28,
  BRIDGE_V: 29,
  COBBLESTONE: 30,
  WOOD_FLOOR: 31,
  CARPET: 32,
  CASTLE_WALL: 33,
  SNOW: 34,
  ICE: 35,
  SKY_TILE: 36,
  CLOUD_VOID: 37,
  RUINS_FLOOR: 38,
  MAGIC_CIRCLE: 39,
  SAKURA_GRASS: 40,
  GOLD_PAVING: 41,
} as const

export type TileId = (typeof T)[keyof typeof T]

export const SOLID = new Set<number>([
  T.WATER,
  T.TREE,
  T.WALL,
  T.ROOF_RED,
  T.ROOF_BLUE,
  T.ROOF_PURPLE,
  T.ROOF_GREEN,
  T.DOOR,
  T.FENCE,
  T.FOUNTAIN,
  T.BUSH,
  T.ROCK,
  T.CAVEWALL,
  T.LAVA,
  T.WINDOW,
  T.PINE,
  T.CRYSTAL,
  T.SIGN,
  T.CASTLE_WALL,
  T.CLOUD_VOID,
])

export type Theme =
  | 'town'
  | 'meadow'
  | 'vale'
  | 'woods'
  | 'forest'
  | 'coast'
  | 'cave'
  | 'desert'
  | 'graveyard'
  | 'isles'
  | 'snow'
  | 'ruins'
  | 'volcano'
  | 'sky'
  | 'abyss'
  | 'world'
  | 'crystal'
  | 'frost'
  | 'dream'
  | 'colosseum'

export type NpcRole = 'shop' | 'enhance' | 'job' | 'storage' | 'gacha' | 'wing_gacha' | 'rebirth'

export type MapObjectKind =
  | 'lamp_post'
  | 'market_stall'
  | 'anvil_forge'
  | 'well'
  | 'statue'
  | 'barrel_cluster'
  | 'bench'
  | 'notice_board'
  | 'guild_banner'
  | 'campfire'
  | 'tent'
  | 'scarecrow'
  | 'ruin_pillar'
  | 'chest_decor'
  | 'totem'
  | 'torch'
  | 'mine_cart'
  | 'crystal_spire'
  | 'magma_brazier'
  | 'skull_pile'
  | 'sky_arch'
  | 'ice_spire'
  | 'sakura_tree'
  | 'dream_shrine'
  | 'colosseum_pillar'
  | 'wagon'
  | 'flower_cart'
  | 'sign_arrow'

export interface MapObject {
  id: string
  kind: MapObjectKind
  tx: number
  ty: number
  solid: boolean
  variant?: number
  label?: string
}

export type PortalDirection = 'north' | 'south' | 'west' | 'east'
export type PortalGateStyle = 'townArchway' | 'woodGate' | 'crystalShrine'

export interface Portal {
  x: number
  y: number
  w: number
  h: number
  to: string
  tx: number
  ty: number
  label: string
  dir?: PortalDirection
  gate?: PortalGateStyle
}

export interface PortalLink {
  to: string
  tx: number
  ty: number
  label: string
  gate?: PortalGateStyle
}

export interface NpcDef {
  id: string
  name: string
  title: string
  role: NpcRole
  x: number
  y: number
  colors: { hair: string; body: string; legs: string; accent: string; skin?: string; hat?: string }
  greeting: string
}

export interface MapDef {
  id: string
  name: string
  levelLabel: string
  safe: boolean
  theme: Theme
  width: number
  height: number
  base: number
  tiles: Uint8Array
  objects: MapObject[]
  objSolid: Uint8Array
  portals: Portal[]
  spawns: { monsterId: string; count: number }[]
  npcs: NpcDef[]
  spawn: { x: number; y: number }
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

class Grid {
  tiles: Uint8Array
  objects: MapObject[] = []
  private objIdx = 0

  constructor(
    public w: number,
    public h: number,
    fill: number,
  ) {
    this.tiles = new Uint8Array(w * h).fill(fill)
  }

  set(x: number, y: number, t: number) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.tiles[y * this.w + x] = t
  }

  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return T.CAVEWALL
    return this.tiles[y * this.w + x]
  }

  rect(x: number, y: number, w: number, h: number, t: number) {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) this.set(i, j, t)
    }
  }

  ring(cx: number, cy: number, r: number, t: number) {
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        const d = Math.hypot(i, j)
        if (d <= r + 0.3 && d >= r - 0.85) this.set(cx + i, cy + j, t)
      }
    }
  }

  disc(cx: number, cy: number, r: number, t: number) {
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        if (Math.hypot(i, j) <= r + 0.25) this.set(cx + i, cy + j, t)
      }
    }
  }

  border(t: number, thickness: number) {
    for (let k = 0; k < thickness; k++) {
      this.rect(0, k, this.w, 1, t)
      this.rect(0, this.h - 1 - k, this.w, 1, t)
      this.rect(k, 0, 1, this.h, t)
      this.rect(this.w - 1 - k, 0, 1, this.h, t)
    }
  }

  obj(kind: MapObjectKind, tx: number, ty: number, solid = true, variant = 0, label?: string) {
    if (tx < 1 || ty < 1 || tx >= this.w - 1 || ty >= this.h - 1) return
    if (this.objects.some((o) => o.tx === tx && o.ty === ty)) return
    this.objects.push({
      id: `obj_${++this.objIdx}_${kind}_${tx}_${ty}`,
      kind,
      tx,
      ty,
      solid,
      variant,
      label,
    })
  }

  buildObjSolid(): Uint8Array {
    const arr = new Uint8Array(this.w * this.h)
    for (const o of this.objects) {
      if (!o.solid) continue
      if (o.tx >= 0 && o.ty >= 0 && o.tx < this.w && o.ty < this.h) {
        arr[o.ty * this.w + o.tx] = 1
      }
    }
    return arr
  }
}

function house(g: Grid, x: number, y: number, w: number, roof: number) {
  g.rect(x, y, w, 2, roof)
  g.rect(x, y + 2, w, 2, T.WALL)
  g.set(x + 1, y + 2, T.WINDOW)
  g.set(x + w - 2, y + 2, T.WINDOW)
  if (w >= 8) g.set(x + Math.floor(w / 2), y + 2, T.WINDOW)
  g.set(x + Math.floor(w / 2), y + 3, T.DOOR)
}

function watchtower(g: Grid, x: number, y: number, roof: number) {
  g.rect(x, y, 3, 2, roof)
  g.rect(x, y + 2, 3, 2, T.WALL)
  g.set(x + 1, y + 2, T.WINDOW)
  g.set(x + 1, y + 3, T.DOOR)
}

function buildTown(): MapDef {
  const W = 44
  const H = 32
  const rng = mulberry32(2026)
  const g = new Grid(W, H, T.GRASS)

  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      if (rng() < 0.08) g.set(x, y, T.FLOWER)
    }
  }

  g.border(T.CASTLE_WALL, 2)
  watchtower(g, 1, 1, T.ROOF_BLUE)
  watchtower(g, W - 4, 1, T.ROOF_BLUE)
  watchtower(g, 1, H - 5, T.ROOF_BLUE)
  watchtower(g, W - 4, H - 5, T.ROOF_BLUE)

  // Scenic town canal at bottom park (y = 25..26) with 3 wooden bridges
  g.rect(2, 25, W - 4, 2, T.WATER)
  for (const bx of [8, 21, 34]) {
    g.rect(bx, 25, 2, 2, T.BRIDGE_V)
  }

  // Main cobblestone boulevards
  g.rect(2, 14, W - 4, 3, T.COBBLESTONE)
  g.rect(20, 2, 4, H - 4, T.COBBLESTONE)
  g.rect(8, 8, 2, 16, T.PATH)
  g.rect(34, 8, 2, 16, T.PATH)

  // Grand Central Plaza
  g.rect(16, 10, 12, 11, T.PLAZA)
  g.rect(18, 12, 8, 7, T.COBBLESTONE)
  g.rect(21, 15, 2, 2, T.FOUNTAIN)
  g.set(19, 13, T.MAGIC_CIRCLE)

  // Northern Shrine Promenade (keep central avenue x=20..23 open for North gate)
  g.rect(18, 4, 8, 5, T.PLAZA)
  g.rect(21, 2, 2, 7, T.CARPET)
  g.obj('statue', 18, 5, true, 0, 'อนุสาวรีย์ผู้กล้า')
  g.obj('guild_banner', 19, 4, true, 0)
  g.obj('guild_banner', 24, 4, true, 0)
  g.obj('lamp_post', 18, 8, true)
  g.obj('lamp_post', 25, 8, true)

  // 1. NW District: General Market & Merchant Inn
  house(g, 5, 3, 8, T.ROOF_RED)
  g.rect(5, 8, 9, 4, T.WOOD_FLOOR)
  g.obj('market_stall', 6, 9, true, 0, 'แผงค้าขาย')
  g.obj('market_stall', 11, 9, true, 1)
  g.obj('barrel_cluster', 5, 11, true)
  g.obj('wagon', 13, 10, true)
  g.obj('lamp_post', 7, 13, true)

  // 2. NE District: Royal Blacksmith & Forge Yard
  house(g, 31, 3, 8, T.ROOF_BLUE)
  g.rect(30, 8, 10, 4, T.COBBLESTONE)
  g.obj('anvil_forge', 32, 9, true, 0, 'เตาหลอมตีบวก')
  g.obj('anvil_forge', 37, 9, true, 1)
  g.obj('barrel_cluster', 39, 11, true)
  g.obj('lamp_post', 36, 13, true)

  // 3. SW District: Adventurer & Job Master Guild Hall
  house(g, 5, 18, 8, T.ROOF_PURPLE)
  g.rect(5, 22, 9, 2, T.PLAZA)
  g.rect(8, 22, 2, 2, T.CARPET)
  g.obj('guild_banner', 6, 22, true, 1, 'สมาคมเปลี่ยนอาชีพ')
  g.obj('guild_banner', 11, 22, true, 1)
  g.obj('lamp_post', 13, 22, true)

  // 4. SE District: Vault Bank & Storage House
  house(g, 31, 18, 8, T.ROOF_GREEN)
  g.rect(30, 22, 9, 2, T.PLAZA)
  g.obj('chest_decor', 32, 22, true, 0, 'หีบคลังสมบัติ')
  g.obj('barrel_cluster', 38, 22, true)
  g.obj('lamp_post', 30, 22, true)

  // Cozy Plaza Lamps, Notice Board, Well, Benches & Flower Cart
  g.obj('lamp_post', 16, 11, true)
  g.obj('lamp_post', 27, 11, true)
  g.obj('lamp_post', 16, 19, true)
  g.obj('lamp_post', 27, 19, true)
  g.obj('notice_board', 25, 18, true, 0, 'กระดานภารกิจ')
  g.obj('flower_cart', 17, 17, true)
  g.obj('bench', 17, 13, true)
  g.obj('bench', 26, 13, true)
  g.obj('well', 14, 7, true)

  // South Riverside Garden Promenade
  g.rect(4, 28, W - 8, 2, T.PATH)
  g.rect(16, 27, 12, 3, T.FLOWER)
  g.rect(20, 27, 4, 3, T.COBBLESTONE)
  g.obj('bench', 18, 28, true)
  g.obj('bench', 25, 28, true)
  g.obj('sakura_tree', 6, 28, true)
  g.obj('sakura_tree', 38, 28, true)

  // Decorative Trees & Fenced Herb Gardens inside town
  for (const [tx, ty] of [
    [3, 7],
    [3, 12],
    [3, 21],
    [40, 7],
    [40, 12],
    [40, 21],
    [15, 4],
    [28, 4],
  ]) {
    g.set(tx, ty, T.TREE)
  }
  g.rect(14, 20, 3, 1, T.FENCE)
  g.rect(27, 20, 3, 1, T.FENCE)

  // Carve all 4 Castle Gates (North, South, West, East)
  g.rect(20, 0, 4, 4, T.COBBLESTONE) // North gate -> ป่าละเมาะ
  g.obj('sign_arrow', 19, 2, true, 0)
  g.rect(20, H - 4, 4, 4, T.COBBLESTONE) // South gate -> ถ้ำ
  g.obj('sign_arrow', 24, H - 3, true, 0)
  g.rect(0, 14, 5, 4, T.COBBLESTONE) // West gate -> ป่าลึก
  g.obj('sign_arrow', 3, 13, true, 0)
  g.rect(W - 5, 14, 5, 4, T.COBBLESTONE) // East gate -> ทุ่งหญ้า
  g.set(W - 4, 13, T.SIGN)
  g.obj('lamp_post', W - 4, 18, true)
  g.obj('sign_arrow', W - 5, 13, true, 0)

  // Ensure bridge stays walkable at central canal for South gate path
  g.rect(21, 25, 2, 2, T.BRIDGE_V)

  return {
    id: 'town',
    name: 'เมืองปราการเริ่มต้น',
    levelLabel: 'เขตปลอดภัย',
    safe: true,
    theme: 'town',
    width: W,
    height: H,
    base: T.GRASS,
    tiles: g.tiles,
    objects: g.objects,
    objSolid: g.buildObjSolid(),
    portals: [
      { x: 20, y: 0, w: 4, h: 1, dir: 'north', gate: 'townArchway', to: 'woods', tx: 26, ty: 32, label: 'ป่าละเมาะ Lv.9-16' },
      { x: 20, y: H - 1, w: 4, h: 1, dir: 'south', gate: 'townArchway', to: 'cave', tx: 26, ty: 3, label: 'ถ้ำ Lv.24-36' },
      { x: 0, y: 14, w: 1, h: 4, dir: 'west', gate: 'townArchway', to: 'forest', tx: 48, ty: 18, label: 'ป่าลึก Lv.14-26' },
      { x: W - 1, y: 14, w: 1, h: 4, dir: 'east', gate: 'townArchway', to: 'meadow', tx: 3, ty: 18, label: 'ทุ่งหญ้า Lv.1-10' },
    ],
    spawns: [],
    spawn: { x: 22, y: 18 },
    npcs: [
      {
        id: 'merchant',
        name: 'ลุงสมปอง',
        title: 'พ่อค้า',
        role: 'shop',
        x: 9.0,
        y: 9.6,
        colors: { hair: '#5c4033', body: '#c44536', legs: '#4a3728', accent: '#f4d35e', hat: '#8c5a2b' },
        greeting: 'ยินดีต้อนรับ! ของดีราคาถูก มีครบทุกอย่างสำหรับนักผจญภัย',
      },
      {
        id: 'blacksmith',
        name: 'ช่างเหล็กบุญมา',
        title: 'ช่างตีบวก',
        role: 'enhance',
        x: 35.0,
        y: 9.6,
        colors: { hair: '#2b2b2b', body: '#6c757d', legs: '#343a40', accent: '#e76f51', skin: '#c68863' },
        greeting: 'ส่งอาวุธมา ข้าจะทำให้มันแข็งแกร่งขึ้น... ถ้าโชคดีนะ',
      },
      {
        id: 'goddess',
        name: 'ปรมาจารย์อาร์ค',
        title: 'เปลี่ยนอาชีพ',
        role: 'job',
        x: 9.0,
        y: 22.4,
        colors: { hair: '#f1f1f1', body: '#3a0ca3', legs: '#240046', accent: '#ffd60a', hat: '#3a0ca3' },
        greeting: 'เจ้าพร้อมจะก้าวไปสู่เส้นทางใหม่แล้วหรือยัง?',
      },
      {
        id: 'keeper',
        name: 'พี่มณี',
        title: 'คลังเก็บของ',
        role: 'storage',
        x: 35.0,
        y: 22.4,
        colors: { hair: '#8b2635', body: '#2a9d8f', legs: '#264653', accent: '#e9c46a' },
        greeting: 'ฝากของไว้กับฉันได้เลย ปลอดภัยแน่นอนจ้า',
      },
      {
        id: 'gacha',
        name: 'มาดามแคปซูล',
        title: 'ตู้สุ่มชา',
        role: 'gacha',
        x: 24.5,
        y: 14.5,
        colors: { hair: '#f1f1f1', body: '#7b2cbf', legs: '#3c096c', accent: '#ffd166', skin: '#f2c6a0' },
        greeting: 'ยินดีต้อนรับสู่ตู้สุ่มชา ลองเสี่ยงโชคเพื่อรับไอเท็มหายากดูไหม?',
      },
      {
        id: 'rebirth',
        name: 'เทวทูตแห่งการจุติ',
        title: 'จุติ',
        role: 'rebirth',
        x: 19.5,
        y: 14.5,
        colors: { hair: '#ffffff', body: '#e0fbfc', legs: '#98c1d9', accent: '#ffd166', skin: '#f2c6a0' },
        greeting: 'เมื่อเจ้าพร้อม ข้าจะนำทางสู่การจุติและการเริ่มต้นใหม่',
      },
      {
        id: 'wing_gacha_machine',
        name: 'ตู้ไข่สุ่มปีก',
        title: 'สุ่มปีก 16 แบบ',
        role: 'wing_gacha',
        x: 23.5,
        y: 16.9,
        colors: { hair: '#67e8f9', body: '#0284c7', legs: '#1e293b', accent: '#fde047' },
        greeting: 'ตู้ไข่สุ่มปีกแห่งน้ำพุเมือง! ลองเสี่ยงโชคสุ่มปีก 16 แบบเลยไหม?',
      },
    ],
  }
}

const WW = 52
const WH = 36
const MIDX = 26
const MIDY = 18

function carveWindingRoad(g: Grid, pathTile: number, seed: number) {
  const rng = mulberry32(seed)
  let wy = MIDY
  for (let x = 2; x < WW - 2; x++) {
    if (x > 6 && x < WW - 7 && rng() < 0.25) {
      wy = Math.max(8, Math.min(WH - 9, wy + (rng() < 0.5 ? -1 : 1)))
    }
    if (x >= WW - 8) wy += Math.sign(MIDY - wy)
    g.rect(x, wy - 1, 1, 3, pathTile)
  }
  // North-South cross avenue leading smoothly between North & South portals
  g.rect(MIDX - 1, 2, 3, WH - 4, pathTile)
}

function ensureBridgesOnCrossroads(g: Grid) {
  for (let x = 2; x < WW - 2; x++) {
    for (let y = MIDY - 1; y <= MIDY + 1; y++) {
      const tile = g.get(x, y)
      if (tile === T.WATER || tile === T.LAVA || tile === T.CLOUD_VOID) {
        g.set(x, y, T.BRIDGE_H)
      }
    }
  }
  for (let y = 2; y < WH - 2; y++) {
    for (let x = MIDX - 1; x <= MIDX + 1; x++) {
      const tile = g.get(x, y)
      if (tile === T.WATER || tile === T.LAVA || tile === T.CLOUD_VOID) {
        g.set(x, y, T.BRIDGE_V)
      }
    }
  }
}

function inPortalZone(x: number, y: number): boolean {
  const west = x <= 6 && Math.abs(y - MIDY) <= 4
  const east = x >= WW - 7 && Math.abs(y - MIDY) <= 4
  const north = Math.abs(x - MIDX) <= 4 && y <= 6
  const south = Math.abs(x - MIDX) <= 4 && y >= WH - 7
  return west || east || north || south
}

function scatterClean(
  g: Grid,
  base: number,
  seed: number,
  obstacles: { tile: number; chance: number }[],
  decor: { tile: number; chance: number }[],
) {
  const rng = mulberry32(seed)
  for (let y = 3; y < WH - 3; y++) {
    for (let x = 3; x < WW - 3; x++) {
      if (g.get(x, y) !== base) continue
      if (inPortalZone(x, y)) continue
      const r = rng()
      let acc = 0
      let placed = false
      for (const o of obstacles) {
        acc += o.chance
        if (r < acc) {
          g.set(x, y, o.tile)
          placed = true
          break
        }
      }
      if (!placed) {
        const r2 = rng()
        let acc2 = 0
        for (const d of decor) {
          acc2 += d.chance
          if (r2 < acc2) {
            g.set(x, y, d.tile)
            break
          }
        }
      }
    }
  }
}

interface WildPortalsSpec {
  north?: PortalLink | null
  south?: PortalLink | null
  west?: PortalLink | null
  east?: PortalLink | null
}

function finalizeWild(
  g: Grid,
  id: string,
  name: string,
  levelLabel: string,
  theme: Theme,
  base: number,
  wall: number,
  pathTile: number,
  portalsSpec: WildPortalsSpec,
  spawns?: { monsterId: string; count: number }[],
): MapDef {
  g.border(wall, 2)
  const portals: Portal[] = []

  if (portalsSpec.north) {
    g.rect(MIDX - 2, 0, 4, 6, pathTile)
    portals.push({
      x: MIDX - 2,
      y: 0,
      w: 4,
      h: 1,
      dir: 'north',
      gate: portalsSpec.north.gate ?? 'woodGate',
      ...portalsSpec.north,
    })
  }
  if (portalsSpec.south) {
    g.rect(MIDX - 2, WH - 6, 4, 6, pathTile)
    portals.push({
      x: MIDX - 2,
      y: WH - 1,
      w: 4,
      h: 1,
      dir: 'south',
      gate: portalsSpec.south.gate ?? 'woodGate',
      ...portalsSpec.south,
    })
  }
  if (portalsSpec.west) {
    g.rect(0, MIDY - 2, 6, 4, pathTile)
    portals.push({
      x: 0,
      y: MIDY - 2,
      w: 1,
      h: 4,
      dir: 'west',
      gate: portalsSpec.west.gate ?? 'woodGate',
      ...portalsSpec.west,
    })
  }
  if (portalsSpec.east) {
    g.rect(WW - 6, MIDY - 2, 6, 4, pathTile)
    portals.push({
      x: WW - 1,
      y: MIDY - 2,
      w: 1,
      h: 4,
      dir: 'east',
      gate: portalsSpec.east.gate ?? 'woodGate',
      ...portalsSpec.east,
    })
  }

  // Ensure center spawn & portal entry lanes are clean and unobstructed
  g.objects = g.objects.filter((o) => {
    const blkNorth = portalsSpec.north && Math.abs(o.tx - MIDX) <= 3 && o.ty <= 5
    const blkSouth = portalsSpec.south && Math.abs(o.tx - MIDX) <= 3 && o.ty >= WH - 6
    const blkWest = portalsSpec.west && o.tx <= 5 && Math.abs(o.ty - MIDY) <= 3
    const blkEast = portalsSpec.east && o.tx >= WW - 6 && Math.abs(o.ty - MIDY) <= 3
    return !blkNorth && !blkSouth && !blkWest && !blkEast
  })

  const defaultSpawn =
    portalsSpec.west
      ? { x: 4, y: MIDY }
      : portalsSpec.south
        ? { x: MIDX, y: WH - 5 }
        : portalsSpec.north
          ? { x: MIDX, y: 4 }
          : { x: WW - 5, y: MIDY }

  return {
    id,
    name,
    levelLabel,
    safe: false,
    theme,
    width: WW,
    height: WH,
    base,
    tiles: g.tiles,
    objects: g.objects,
    objSolid: g.buildObjSolid(),
    portals,
    spawns: spawns ?? BIOME_SPAWNS[id] ?? [],
    npcs: [],
    spawn: defaultSpawn,
  }
}

// 1. ทุ่งหญ้า (meadow) — (2,2)
function buildMeadow(): MapDef {
  const g = new Grid(WW, WH, T.GRASS)
  for (let y = 2; y < WH - 2; y++) {
    const rx = 20 + Math.round(Math.sin(y * 0.25) * 1.4)
    g.rect(rx, y, 2, 1, T.WATER)
  }
  carveWindingRoad(g, T.PATH, 101)
  ensureBridgesOnCrossroads(g)
  for (const by of [8, 9, 27, 28]) {
    for (let x = 18; x <= 23; x++) {
      if (g.get(x, by) === T.WATER) g.set(x, by, T.BRIDGE_H)
    }
  }
  scatterClean(
    g,
    T.GRASS,
    111,
    [
      { tile: T.TREE, chance: 0.032 },
      { tile: T.BUSH, chance: 0.025 },
      { tile: T.ROCK, chance: 0.008 },
    ],
    [{ tile: T.FLOWER, chance: 0.09 }],
  )

  g.rect(8, 7, 6, 5, T.PATH)
  g.obj('tent', 9, 8, true, 0, 'ค่ายนักผจญภัย')
  g.obj('campfire', 11, 10, true)
  g.obj('barrel_cluster', 12, 8, true)

  g.rect(7, 23, 8, 5, T.FLOWER)
  g.rect(7, 22, 8, 1, T.FENCE)
  g.rect(7, 28, 8, 1, T.FENCE)
  g.obj('scarecrow', 10, 25, true)
  g.obj('scarecrow', 13, 25, true)
  g.obj('wagon', 16, 25, true)

  g.rect(36, 8, 6, 6, T.PLAZA)
  g.obj('well', 38, 10, true)
  g.obj('bench', 40, 11, true)
  g.obj('lamp_post', 22, 16, true)
  g.obj('chest_decor', 42, 27, true)

  return finalizeWild(g, 'meadow', 'ทุ่งหญ้า', 'Lv.1-10', 'meadow', T.GRASS, T.TREE, T.PATH, {
    north: { to: 'ruins', tx: 26, ty: 32, label: 'ซากปราสาท Lv.56-68', gate: 'townArchway' },
    south: { to: 'desert', tx: 26, ty: 3, label: 'ทะเลทราย Lv.30-42', gate: 'crystalShrine' },
    west: { to: 'town', tx: 40, ty: 15, label: 'เมืองปราการเริ่มต้น', gate: 'townArchway' },
    east: { to: 'coast', tx: 3, ty: 18, label: 'ชายฝั่ง Lv.20-32', gate: 'woodGate' },
  })
}

// 2. หุบเขาเขียว (vale) — (0,1)
function buildVale(): MapDef {
  const g = new Grid(WW, WH, T.GRASS)
  for (let y = 2; y < WH - 2; y++) {
    const rx = 31 + Math.round(Math.sin(y * 0.25) * 1.5)
    g.rect(rx, y, 2, 1, T.WATER)
  }
  carveWindingRoad(g, T.PATH, 102)
  ensureBridgesOnCrossroads(g)
  for (const by of [9, 10, 26, 27]) {
    for (let x = 29; x <= 34; x++) {
      if (g.get(x, by) === T.WATER) g.set(x, by, T.BRIDGE_H)
    }
  }
  scatterClean(
    g,
    T.GRASS,
    122,
    [
      { tile: T.PINE, chance: 0.045 },
      { tile: T.ROCK, chance: 0.02 },
      { tile: T.CRYSTAL, chance: 0.008 },
    ],
    [{ tile: T.FLOWER, chance: 0.08 }],
  )

  g.rect(10, 10, 7, 5, T.PLAZA)
  g.obj('crystal_spire', 12, 11, true, 0, 'ศิลาหุบเขาเขียว')
  g.obj('campfire', 14, 13, true)
  g.obj('tent', 11, 24, true)
  g.obj('chest_decor', 39, 9, true)
  g.obj('lamp_post', 24, 15, true)

  return finalizeWild(g, 'vale', 'หุบเขาเขียว', 'Lv.7-15', 'vale', T.GRASS, T.PINE, T.PATH, {
    north: { to: 'snow', tx: 26, ty: 32, label: 'แดนหิมะ Lv.50-60', gate: 'crystalShrine' },
    south: { to: 'forest', tx: 26, ty: 3, label: 'ป่าลึก Lv.14-26', gate: 'woodGate' },
    east: { to: 'woods', tx: 3, ty: 18, label: 'ป่าละเมาะ Lv.9-16', gate: 'woodGate' },
  })
}

// 3. ป่าละเมาะ (woods) — (1,1)
function buildWoods(): MapDef {
  const g = new Grid(WW, WH, T.GRASS)
  carveWindingRoad(g, T.PATH, 103)
  scatterClean(
    g,
    T.GRASS,
    133,
    [
      { tile: T.TREE, chance: 0.045 },
      { tile: T.BUSH, chance: 0.045 },
      { tile: T.ROCK, chance: 0.01 },
    ],
    [
      { tile: T.FLOWER, chance: 0.06 },
      { tile: T.MUSHROOMS, chance: 0.02 },
    ],
  )

  g.rect(12, 11, 6, 4, T.PATH)
  g.obj('campfire', 14, 13, true, 0, 'จุดพักนายพราน')
  g.obj('tent', 13, 11, true)
  g.obj('wagon', 35, 22, true)
  g.obj('scarecrow', 38, 10, true)

  return finalizeWild(g, 'woods', 'ป่าละเมาะ', 'Lv.9-16', 'woods', T.GRASS, T.TREE, T.PATH, {
    north: { to: 'sky', tx: 26, ty: 32, label: 'แดนลอยฟ้า Lv.68-78', gate: 'crystalShrine' },
    south: { to: 'town', tx: 22, ty: 3, label: 'เมืองปราการเริ่มต้น', gate: 'townArchway' },
    west: { to: 'vale', tx: 48, ty: 18, label: 'หุบเขาเขียว Lv.7-15', gate: 'woodGate' },
    east: { to: 'ruins', tx: 3, ty: 18, label: 'ซากปราสาท Lv.56-68', gate: 'townArchway' },
  })
}

// 4. ป่าลึก (forest) — (0,2)
function buildForest(): MapDef {
  const g = new Grid(WW, WH, T.DARKGRASS)
  for (let y = 2; y < WH - 2; y++) {
    const rx = 18 + Math.round(Math.cos(y * 0.22) * 1.6)
    g.rect(rx, y, 2, 1, T.WATER)
  }
  carveWindingRoad(g, T.PATH, 202)
  ensureBridgesOnCrossroads(g)
  for (const by of [9, 10, 27, 28]) {
    for (let x = 15; x <= 22; x++) {
      if (g.get(x, by) === T.WATER) g.set(x, by, T.BRIDGE_H)
    }
  }
  scatterClean(
    g,
    T.DARKGRASS,
    222,
    [
      { tile: T.PINE, chance: 0.08 },
      { tile: T.BUSH, chance: 0.03 },
    ],
    [{ tile: T.MUSHROOMS, chance: 0.045 }],
  )

  g.rect(31, 6, 10, 7, T.PATH)
  g.obj('totem', 32, 7, true, 0, 'ค่ายกอบลิน')
  g.obj('totem', 39, 7, true, 0)
  g.obj('tent', 34, 8, true, 1)
  g.obj('campfire', 36, 10, true)
  g.obj('barrel_cluster', 33, 11, true)
  g.obj('chest_decor', 39, 10, true)

  g.rect(33, 24, 9, 7, T.RUINS_FLOOR)
  g.obj('ruin_pillar', 34, 25, true)
  g.obj('ruin_pillar', 40, 25, true)
  g.obj('statue', 37, 26, true)
  g.obj('torch', 24, 15, true)

  return finalizeWild(g, 'forest', 'ป่าลึก', 'Lv.14-26', 'forest', T.DARKGRASS, T.PINE, T.PATH, {
    north: { to: 'vale', tx: 26, ty: 32, label: 'หุบเขาเขียว Lv.7-15', gate: 'woodGate' },
    south: { to: 'graveyard', tx: 26, ty: 3, label: 'สุสาน Lv.34-46', gate: 'crystalShrine' },
    east: { to: 'town', tx: 3, ty: 15, label: 'เมืองปราการเริ่มต้น', gate: 'townArchway' },
  })
}

// 5. ชายฝั่ง (coast) — (3,2)
function buildCoast(): MapDef {
  const g = new Grid(WW, WH, T.SAND)
  // Turquoise sea along outer right cove + winding tidal lagoon with wooden piers
  g.rect(37, 3, 12, WH - 6, T.WATER)
  g.rect(33, 10, 12, 16, T.SAND) // Sandy cape peninsula
  g.rect(35, 16, 15, 4, T.BRIDGE_H) // Pier road toward East shore
  for (let y = 2; y < WH - 2; y++) {
    const rx = 20 + Math.round(Math.sin(y * 0.25) * 1.4)
    g.rect(rx, y, 2, 1, T.WATER)
  }
  carveWindingRoad(g, T.PATH, 250)
  ensureBridgesOnCrossroads(g)
  for (const by of [9, 10, 26, 27]) {
    for (let x = 17; x <= 23; x++) {
      if (g.get(x, by) === T.WATER) g.set(x, by, T.BRIDGE_H)
    }
  }
  scatterClean(
    g,
    T.SAND,
    251,
    [
      { tile: T.TREE, chance: 0.025 },
      { tile: T.ROCK, chance: 0.02 },
    ],
    [{ tile: T.FLOWER, chance: 0.025 }],
  )

  g.rect(10, 8, 6, 4, T.WOOD_FLOOR)
  g.obj('barrel_cluster', 11, 9, true, 0, 'ท่าเรือชายฝั่ง')
  g.obj('campfire', 13, 10, true)
  g.obj('tent', 11, 25, true)
  g.obj('chest_decor', 41, 13, true)
  g.obj('lamp_post', 34, 15, true)

  return finalizeWild(g, 'coast', 'ชายฝั่ง', 'Lv.20-32', 'coast', T.SAND, T.ROCK, T.SAND, {
    north: { to: 'volcano', tx: 26, ty: 32, label: 'ภูเขาไฟ Lv.62-74', gate: 'crystalShrine' },
    south: { to: 'isles', tx: 26, ty: 3, label: 'หมู่เกาะตะวันออก Lv.40-52', gate: 'woodGate' },
    west: { to: 'meadow', tx: 48, ty: 18, label: 'ทุ่งหญ้า Lv.1-10', gate: 'woodGate' },
  })
}

// 6. ถ้ำ (cave) — (1,3)
function buildCave(): MapDef {
  const g = new Grid(WW, WH, T.CAVEWALL)
  g.disc(11, 18, 9, T.CAVEFLOOR)
  g.disc(26, 18, 11, T.CAVEFLOOR)
  g.disc(40, 18, 9, T.CAVEFLOOR)
  g.disc(26, 8, 6, T.CAVEFLOOR)
  g.disc(26, 28, 6, T.CAVEFLOOR)
  g.rect(4, 15, WW - 8, 6, T.CAVEFLOOR)
  g.rect(23, 3, 6, WH - 6, T.CAVEFLOOR)

  g.rect(20, 6, 2, 24, T.WATER)
  g.rect(19, 16, 4, 4, T.BRIDGE_H)
  g.rect(19, 26, 4, 2, T.BRIDGE_H)
  ensureBridgesOnCrossroads(g)

  scatterClean(
    g,
    T.CAVEFLOOR,
    333,
    [
      { tile: T.ROCK, chance: 0.035 },
      { tile: T.CRYSTAL, chance: 0.015 },
    ],
    [{ tile: T.BONES, chance: 0.025 }],
  )

  g.rect(8, 16, 4, 4, T.CAVEFLOOR)
  g.obj('ruin_pillar', 7, 12, true)
  g.obj('ruin_pillar', 14, 12, true)
  g.obj('torch', 13, 15, true)
  g.obj('torch', 13, 21, true)
  g.obj('crystal_spire', 25, 7, true)
  g.obj('crystal_spire', 28, 8, true)
  g.obj('mine_cart', 38, 14, true, 0, 'รถรางเหมือง')
  g.obj('mine_cart', 41, 21, true)
  g.obj('chest_decor', 26, 29, true)
  g.obj('skull_pile', 35, 22, true)

  return finalizeWild(g, 'cave', 'ถ้ำ', 'Lv.24-36', 'cave', T.CAVEFLOOR, T.CAVEWALL, T.CAVEFLOOR, {
    north: { to: 'town', tx: 22, ty: 28, label: 'เมืองปราการเริ่มต้น', gate: 'townArchway' },
    west: { to: 'graveyard', tx: 48, ty: 18, label: 'สุสาน Lv.34-46', gate: 'crystalShrine' },
    east: { to: 'desert', tx: 3, ty: 18, label: 'ทะเลทราย Lv.30-42', gate: 'crystalShrine' },
  })
}

// 7. ทะเลทราย (desert) — (2,3)
function buildDesert(): MapDef {
  const g = new Grid(WW, WH, T.SAND)
  // Central Desert Oasis Pond + Ancient Sandstone Temple Courtyard
  g.disc(34, 12, 5, T.WATER)
  g.rect(31, 11, 6, 2, T.BRIDGE_H)
  g.rect(10, 22, 10, 8, T.RUINS_FLOOR)
  carveWindingRoad(g, T.PATH, 355)
  ensureBridgesOnCrossroads(g)
  scatterClean(
    g,
    T.SAND,
    356,
    [
      { tile: T.ROCK, chance: 0.025 },
      { tile: T.BUSH, chance: 0.015 },
    ],
    [{ tile: T.BONES, chance: 0.03 }],
  )

  g.obj('ruin_pillar', 11, 23, true, 0, 'ซากวิหารทะเลทราย')
  g.obj('ruin_pillar', 18, 23, true)
  g.obj('ruin_pillar', 11, 28, true)
  g.obj('ruin_pillar', 18, 28, true)
  g.obj('statue', 14, 25, true)
  g.obj('tent', 31, 23, true)
  g.obj('campfire', 33, 25, true)
  g.obj('skull_pile', 16, 9, true)
  g.obj('chest_decor', 14, 27, true)

  return finalizeWild(g, 'desert', 'ทะเลทราย', 'Lv.30-42', 'desert', T.SAND, T.ROCK, T.PATH, {
    north: { to: 'meadow', tx: 26, ty: 32, label: 'ทุ่งหญ้า Lv.1-10', gate: 'woodGate' },
    west: { to: 'cave', tx: 48, ty: 18, label: 'ถ้ำ Lv.24-36', gate: 'crystalShrine' },
    east: { to: 'isles', tx: 3, ty: 18, label: 'หมู่เกาะตะวันออก Lv.40-52', gate: 'woodGate' },
  })
}

// 8. สุสาน (graveyard) — (0,3)
function buildGraveyard(): MapDef {
  const g = new Grid(WW, WH, T.DARKGRASS)
  g.rect(10, 7, 14, 9, T.RUINS_FLOOR)
  g.rect(28, 20, 14, 9, T.RUINS_FLOOR)
  carveWindingRoad(g, T.COBBLESTONE, 388)
  ensureBridgesOnCrossroads(g)
  scatterClean(
    g,
    T.DARKGRASS,
    389,
    [
      { tile: T.FENCE, chance: 0.03 },
      { tile: T.ROCK, chance: 0.022 },
      { tile: T.PINE, chance: 0.03 },
    ],
    [{ tile: T.BONES, chance: 0.055 }],
  )

  g.obj('skull_pile', 14, 10, true, 0, 'แท่นสุสานต้องสาป')
  g.obj('torch', 12, 9, true)
  g.obj('torch', 21, 9, true)
  g.obj('ruin_pillar', 12, 13, true)
  g.obj('ruin_pillar', 21, 13, true)
  g.obj('torch', 30, 22, true)
  g.obj('torch', 39, 22, true)
  g.obj('statue', 35, 24, true)
  g.obj('chest_decor', 35, 11, true)

  return finalizeWild(g, 'graveyard', 'สุสาน', 'Lv.34-46', 'graveyard', T.DARKGRASS, T.PINE, T.COBBLESTONE, {
    north: { to: 'forest', tx: 26, ty: 32, label: 'ป่าลึก Lv.14-26', gate: 'woodGate' },
    east: { to: 'cave', tx: 3, ty: 18, label: 'ถ้ำ Lv.24-36', gate: 'crystalShrine' },
  })
}

// 9. หมู่เกาะตะวันออก (isles) — (3,3)
function buildIsles(): MapDef {
  const g = new Grid(WW, WH, T.SAKURA_GRASS)
  g.disc(26, 18, 7, T.WATER)
  g.disc(26, 18, 4, T.PLAZA)
  g.rect(18, 17, 6, 3, T.BRIDGE_H)
  g.rect(28, 17, 6, 3, T.BRIDGE_H)
  g.rect(25, 10, 3, 5, T.BRIDGE_V)
  g.rect(25, 21, 3, 5, T.BRIDGE_V)

  carveWindingRoad(g, T.PATH, 909)
  ensureBridgesOnCrossroads(g)
  scatterClean(
    g,
    T.SAKURA_GRASS,
    999,
    [
      { tile: T.TREE, chance: 0.03 },
      { tile: T.BUSH, chance: 0.025 },
    ],
    [{ tile: T.FLOWER, chance: 0.14 }],
  )

  g.obj('dream_shrine', 26, 17, true, 0, 'ศาลเจ้าซากุระ')
  for (const [sx, sy] of [
    [10, 9],
    [14, 26],
    [38, 9],
    [40, 26],
  ]) {
    g.obj('sakura_tree', sx, sy, true)
  }
  g.obj('flower_cart', 14, 15, true)
  g.obj('bench', 12, 21, true)
  g.obj('bench', 38, 21, true)
  g.obj('lamp_post', 22, 16, true)
  g.obj('lamp_post', 29, 16, true)

  return finalizeWild(g, 'isles', 'หมู่เกาะตะวันออก', 'Lv.40-52', 'isles', T.SAKURA_GRASS, T.TREE, T.PATH, {
    north: { to: 'coast', tx: 26, ty: 32, label: 'ชายฝั่ง Lv.20-32', gate: 'woodGate' },
    west: { to: 'desert', tx: 48, ty: 18, label: 'ทะเลทราย Lv.30-42', gate: 'crystalShrine' },
  })
}

// 10. แดนหิมะ (snow) — (0,0)
function buildSnow(): MapDef {
  const g = new Grid(WW, WH, T.SNOW)
  g.disc(26, 18, 8, T.WATER)
  g.disc(26, 18, 6, T.ICE)
  g.rect(16, 17, 6, 3, T.BRIDGE_H)
  g.rect(30, 17, 6, 3, T.BRIDGE_H)
  g.rect(25, 9, 3, 4, T.BRIDGE_V)
  g.rect(25, 24, 3, 4, T.BRIDGE_V)

  carveWindingRoad(g, T.PATH, 808)
  ensureBridgesOnCrossroads(g)
  scatterClean(
    g,
    T.SNOW,
    888,
    [
      { tile: T.PINE, chance: 0.065 },
      { tile: T.ROCK, chance: 0.025 },
    ],
    [{ tile: T.BONES, chance: 0.015 }],
  )

  g.obj('ice_spire', 20, 10, true)
  g.obj('ice_spire', 32, 10, true)
  g.obj('ice_spire', 20, 26, true)
  g.obj('ice_spire', 32, 26, true)
  g.obj('campfire', 10, 13, true)
  g.obj('tent', 9, 11, true)
  g.obj('campfire', 41, 23, true)
  g.obj('chest_decor', 26, 18, true)

  return finalizeWild(g, 'snow', 'แดนหิมะ', 'Lv.50-60', 'snow', T.SNOW, T.PINE, T.PATH, {
    south: { to: 'vale', tx: 26, ty: 3, label: 'หุบเขาเขียว Lv.7-15', gate: 'woodGate' },
    east: { to: 'sky', tx: 3, ty: 18, label: 'แดนลอยฟ้า Lv.68-78', gate: 'crystalShrine' },
  })
}

// 11. ซากปราสาท (ruins) — (2,1)
function buildRuins(): MapDef {
  const g = new Grid(WW, WH, T.RUINS_FLOOR)
  g.rect(8, 6, WW - 16, WH - 12, T.COBBLESTONE)
  g.rect(12, 9, WW - 24, WH - 18, T.RUINS_FLOOR)
  g.rect(4, MIDY - 1, WW - 8, 3, T.CARPET)
  g.rect(MIDX - 1, 4, 3, WH - 8, T.CARPET)
  g.set(MIDX, MIDY, T.MAGIC_CIRCLE)

  // Broken inner castle walls with wide openings
  g.rect(14, 10, 8, 1, T.CASTLE_WALL)
  g.rect(30, 10, 8, 1, T.CASTLE_WALL)
  g.rect(14, 25, 8, 1, T.CASTLE_WALL)
  g.rect(30, 25, 8, 1, T.CASTLE_WALL)

  scatterClean(
    g,
    T.RUINS_FLOOR,
    711,
    [
      { tile: T.ROCK, chance: 0.02 },
      { tile: T.CRYSTAL, chance: 0.008 },
    ],
    [{ tile: T.BONES, chance: 0.02 }],
  )

  for (const [px, py] of [
    [11, 13],
    [11, 22],
    [40, 13],
    [40, 22],
    [20, 12],
    [32, 12],
    [20, 24],
    [32, 24],
  ]) {
    g.obj('colosseum_pillar', px, py, true)
  }
  g.obj('statue', 22, 14, true, 0, 'อนุสาวรีย์ราชาแห่งซาก')
  g.obj('guild_banner', 18, 14, true)
  g.obj('guild_banner', 34, 14, true)
  g.obj('chest_decor', 11, 8, true)
  g.obj('chest_decor', 40, 27, true)

  return finalizeWild(g, 'ruins', 'ซากปราสาท', 'Lv.56-68', 'ruins', T.RUINS_FLOOR, T.CASTLE_WALL, T.COBBLESTONE, {
    north: { to: 'abyss', tx: 26, ty: 32, label: 'ห้วงอเวจี Lv.76-90', gate: 'crystalShrine' },
    south: { to: 'meadow', tx: 26, ty: 3, label: 'ทุ่งหญ้า Lv.1-10', gate: 'woodGate' },
    west: { to: 'woods', tx: 48, ty: 18, label: 'ป่าละเมาะ Lv.9-16', gate: 'woodGate' },
    east: { to: 'volcano', tx: 3, ty: 18, label: 'ภูเขาไฟ Lv.62-74', gate: 'crystalShrine' },
  })
}

// 12. ภูเขาไฟ (volcano) — (3,1)
function buildVolcano(): MapDef {
  const g = new Grid(WW, WH, T.VOLCFLOOR)
  for (let y = 2; y < WH - 2; y++) {
    const rx1 = 17 + Math.round(Math.sin(y * 0.3) * 1.4)
    const rx2 = 34 + Math.round(Math.cos(y * 0.25) * 1.4)
    g.rect(rx1, y, 2, 1, T.LAVA)
    g.rect(rx2, y, 2, 1, T.LAVA)
  }
  carveWindingRoad(g, T.RUINS_FLOOR, 404)
  ensureBridgesOnCrossroads(g)
  for (const by of [9, 10, 27, 28]) {
    for (let x = 14; x <= 38; x++) {
      if (g.get(x, by) === T.LAVA) g.set(x, by, T.BRIDGE_H)
    }
  }
  scatterClean(
    g,
    T.VOLCFLOOR,
    444,
    [{ tile: T.ROCK, chance: 0.04 }],
    [{ tile: T.BONES, chance: 0.02 }],
  )

  g.rect(38, 13, 8, 10, T.RUINS_FLOOR)
  g.set(42, 18, T.MAGIC_CIRCLE)
  g.obj('magma_brazier', 39, 14, true)
  g.obj('magma_brazier', 45, 14, true)
  g.obj('magma_brazier', 39, 22, true)
  g.obj('magma_brazier', 45, 22, true)
  g.obj('skull_pile', 24, 10, true)
  g.obj('skull_pile', 27, 26, true)

  return finalizeWild(g, 'volcano', 'ภูเขาไฟ', 'Lv.62-74', 'volcano', T.VOLCFLOOR, T.CAVEWALL, T.RUINS_FLOOR, {
    north: { to: 'world', tx: 26, ty: 32, label: 'บอสโลก Lv.90+', gate: 'crystalShrine' },
    south: { to: 'coast', tx: 26, ty: 3, label: 'ชายฝั่ง Lv.20-32', gate: 'woodGate' },
    west: { to: 'ruins', tx: 48, ty: 18, label: 'ซากปราสาท Lv.56-68', gate: 'townArchway' },
  })
}

// 13. แดนลอยฟ้า (sky) — (1,0)
function buildSky(): MapDef {
  const g = new Grid(WW, WH, T.CLOUD_VOID)
  g.rect(4, 9, 13, 18, T.SKY_TILE)
  g.rect(19, 4, 14, 28, T.SKY_TILE)
  g.rect(35, 9, 13, 18, T.SKY_TILE)
  g.rect(21, 9, 10, 18, T.PLAZA)

  g.rect(16, 16, 4, 4, T.BRIDGE_H)
  g.rect(32, 16, 4, 4, T.BRIDGE_H)
  g.rect(16, 10, 4, 2, T.BRIDGE_H)
  g.rect(32, 24, 4, 2, T.BRIDGE_H)
  ensureBridgesOnCrossroads(g)

  g.rect(24, 11, 4, 3, T.WATER)
  g.rect(24, 22, 4, 3, T.WATER)
  for (const [fx, fy] of [
    [6, 11],
    [6, 24],
    [45, 11],
    [45, 24],
  ]) {
    g.rect(fx, fy, 2, 2, T.FLOWER)
  }

  g.obj('sky_arch', 25, 8, true, 0, 'ซุ้มประตูฟ้า')
  g.obj('statue', 26, 18, true)
  g.obj('ruin_pillar', 9, 12, true)
  g.obj('ruin_pillar', 9, 23, true)
  g.obj('ruin_pillar', 42, 12, true)
  g.obj('ruin_pillar', 42, 23, true)
  g.obj('lamp_post', 19, 15, true)
  g.obj('lamp_post', 32, 15, true)
  g.obj('chest_decor', 26, 27, true)

  return finalizeWild(g, 'sky', 'แดนลอยฟ้า', 'Lv.68-78', 'sky', T.SKY_TILE, T.CLOUD_VOID, T.SKY_TILE, {
    south: { to: 'woods', tx: 26, ty: 3, label: 'ป่าละเมาะ Lv.9-16', gate: 'woodGate' },
    west: { to: 'snow', tx: 48, ty: 18, label: 'แดนหิมะ Lv.50-60', gate: 'crystalShrine' },
    east: { to: 'abyss', tx: 3, ty: 18, label: 'ห้วงอเวจี Lv.76-90', gate: 'crystalShrine' },
  })
}

// 14. ห้วงอเวจี (abyss) — (2,0)
function buildAbyss(): MapDef {
  const g = new Grid(WW, WH, T.CAVEFLOOR)
  g.rect(6, 5, WW - 12, WH - 10, T.RUINS_FLOOR)
  g.rect(6, MIDY - 1, WW - 12, 3, T.CARPET)
  g.rect(MIDX - 1, 5, 3, WH - 10, T.CARPET)

  g.rect(3, 3, WW - 6, 2, T.LAVA)
  g.rect(3, WH - 5, WW - 6, 2, T.LAVA)
  g.rect(3, 3, 2, WH - 6, T.LAVA)
  g.rect(WW - 5, 3, 2, WH - 6, T.LAVA)
  ensureBridgesOnCrossroads(g)

  for (const px of [12, 18, 33, 39]) {
    g.obj('colosseum_pillar', px, 13, true)
    g.obj('colosseum_pillar', px, 23, true)
    g.obj('torch', px, 15, true)
    g.obj('torch', px, 21, true)
  }
  g.set(MIDX, MIDY, T.MAGIC_CIRCLE)
  g.obj('skull_pile', 10, 8, true)
  g.obj('skull_pile', 41, 8, true)
  g.obj('chest_decor', 10, 27, true)
  g.obj('chest_decor', 41, 27, true)

  return finalizeWild(g, 'abyss', 'ห้วงอเวจี', 'Lv.76-90', 'abyss', T.CAVEFLOOR, T.CAVEWALL, T.RUINS_FLOOR, {
    south: { to: 'ruins', tx: 26, ty: 3, label: 'ซากปราสาท Lv.56-68', gate: 'townArchway' },
    west: { to: 'sky', tx: 48, ty: 18, label: 'แดนลอยฟ้า Lv.68-78', gate: 'crystalShrine' },
    east: { to: 'world', tx: 3, ty: 18, label: 'บอสโลก Lv.90+', gate: 'crystalShrine' },
  })
}

// 15. บอสโลก (world) — (3,0)
function buildWorldBossSanctum(): MapDef {
  const g = new Grid(WW, WH, T.COBBLESTONE)
  g.border(T.CASTLE_WALL, 2)
  g.disc(MIDX, MIDY, 13, T.GOLD_PAVING)
  g.ring(MIDX, MIDY, 14, T.COBBLESTONE)
  g.rect(4, MIDY - 2, WW - 8, 4, T.GOLD_PAVING)
  g.rect(MIDX - 2, 4, 4, WH - 8, T.GOLD_PAVING)
  g.set(MIDX, MIDY, T.MAGIC_CIRCLE)

  const ringPts = [
    [16, 10],
    [26, 6],
    [36, 10],
    [16, 26],
    [26, 30],
    [36, 26],
    [13, 14],
    [13, 22],
    [39, 14],
    [39, 22],
  ]
  for (const [px, py] of ringPts) {
    g.obj('colosseum_pillar', px, py, true)
  }
  for (const [bx, by] of [
    [19, 11],
    [33, 11],
    [19, 25],
    [33, 25],
  ]) {
    g.obj('magma_brazier', bx, by, true)
  }
  g.obj('statue', 26, 9, true, 0, 'แท่นบูชาบอสโลก')
  g.obj('guild_banner', 23, 9, true)
  g.obj('guild_banner', 29, 9, true)

  return finalizeWild(g, 'world', 'บอสโลก', 'Lv.90+ บอสโลก', 'world', T.COBBLESTONE, T.CASTLE_WALL, T.GOLD_PAVING, {
    south: { to: 'volcano', tx: 26, ty: 3, label: 'ภูเขาไฟ Lv.62-74', gate: 'crystalShrine' },
    west: { to: 'abyss', tx: 48, ty: 18, label: 'ห้วงอเวจี Lv.76-90', gate: 'crystalShrine' },
  })
}

export const MAPS: Record<string, MapDef> = {
  town: buildTown(),
  meadow: buildMeadow(),
  vale: buildVale(),
  woods: buildWoods(),
  forest: buildForest(),
  coast: buildCoast(),
  cave: buildCave(),
  desert: buildDesert(),
  graveyard: buildGraveyard(),
  isles: buildIsles(),
  snow: buildSnow(),
  ruins: buildRuins(),
  volcano: buildVolcano(),
  sky: buildSky(),
  abyss: buildAbyss(),
  world: buildWorldBossSanctum(),
}

export const MAP_ORDER = [
  'town',
  'meadow',
  'vale',
  'woods',
  'forest',
  'coast',
  'cave',
  'desert',
  'graveyard',
  'isles',
  'snow',
  'ruins',
  'volcano',
  'sky',
  'abyss',
  'world',
]

export const LEGACY_MAP_ALIASES: Record<string, string> = {
  sky_ruins: 'sky',
  crystal_vale: 'vale',
  frost_peak: 'snow',
  frost: 'snow',
  dream_garden: 'isles',
  celestial_colosseum: 'ruins',
}

export function normalizeMapId(mapId?: string | null): string {
  if (!mapId || typeof mapId !== 'string') return 'town'
  if (MAPS[mapId]) return mapId
  const mapped = LEGACY_MAP_ALIASES[mapId]
  return mapped && MAPS[mapped] ? mapped : 'town'
}

export function tileAt(map: MapDef, tx: number, ty: number) {
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return T.CAVEWALL
  return map.tiles[ty * map.width + tx]
}

export function isSolidTile(map: MapDef, tx: number, ty: number) {
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return true
  const tile = map.tiles[ty * map.width + tx]
  if (SOLID.has(tile)) return true
  return map.objSolid[ty * map.width + tx] === 1
}

export function isSolidPx(map: MapDef, px: number, py: number) {
  return isSolidTile(map, Math.floor(px / TILE), Math.floor(py / TILE))
}

export function boxBlocked(map: MapDef, x: number, y: number, hw = 4, hh = 3) {
  return (
    isSolidPx(map, x - hw, y - hh) ||
    isSolidPx(map, x + hw, y - hh) ||
    isSolidPx(map, x - hw, y) ||
    isSolidPx(map, x + hw, y)
  )
}
