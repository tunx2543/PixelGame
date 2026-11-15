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
  | 'forest'
  | 'cave'
  | 'volcano'
  | 'abyss'
  | 'sky'
  | 'crystal'
  | 'frost'
  | 'dream'
  | 'colosseum'

export type NpcRole = 'shop' | 'enhance' | 'job' | 'storage' | 'gacha' | 'rebirth'

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

export interface Portal {
  x: number
  y: number
  w: number
  h: number
  to: string
  tx: number
  ty: number
  label: string
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

  blob(cx: number, cy: number, r: number, t: number, rng: () => number) {
    for (let j = -r - 1; j <= r + 1; j++) {
      for (let i = -r - 1; i <= r + 1; i++) {
        const d = Math.sqrt(i * i + j * j) + rng() * 0.85
        if (d <= r) this.set(cx + i, cy + j, t)
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
    // Prevent stacking duplicate objects on identical tile
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

  // Subtle meadows & flowers in outer park corners
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      if (rng() < 0.08) g.set(x, y, T.FLOWER)
    }
  }

  // Castle stone battlement border + corner watchtowers
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
  g.rect(4, 14, W - 6, 3, T.COBBLESTONE) // East-West grand boulevard
  g.rect(20, 4, 4, H - 7, T.COBBLESTONE) // North-South central avenue
  g.rect(8, 8, 2, 16, T.PATH) // West district lane
  g.rect(34, 8, 2, 16, T.PATH) // East district lane

  // Grand Central Plaza (around Fountain + Rebirth Altar)
  g.rect(16, 10, 12, 11, T.PLAZA)
  g.rect(18, 12, 8, 7, T.COBBLESTONE)
  g.rect(21, 15, 2, 2, T.FOUNTAIN)
  g.set(19, 13, T.MAGIC_CIRCLE) // Rebirth Shrine floor sigil

  // Northern Shrine Promenade
  g.rect(18, 4, 8, 5, T.PLAZA)
  g.rect(21, 4, 2, 5, T.CARPET)
  g.obj('statue', 21, 5, true, 0, 'อนุสาวรีย์ผู้กล้า')
  g.obj('guild_banner', 19, 5, true, 0)
  g.obj('guild_banner', 24, 5, true, 0)
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

  // South Riverside Garden Promenade (y = 27..29)
  g.rect(4, 28, W - 8, 2, T.PATH)
  g.rect(16, 27, 12, 3, T.FLOWER)
  g.rect(20, 27, 4, 3, T.PATH)
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

  // Eastern Castle Gate leading out to Meadow
  g.rect(W - 3, 14, 3, 4, T.COBBLESTONE)
  g.set(W - 4, 13, T.SIGN)
  g.obj('lamp_post', W - 4, 18, true)
  g.obj('sign_arrow', W - 5, 13, true, 0)

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
    portals: [{ x: W - 1, y: 14, w: 1, h: 4, to: 'meadow', tx: 3, ty: 18, label: 'ทุ่งหญ้าสายลม Lv.1-10' }],
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
    ],
  }
}

const WW = 52
const WH = 36
const MID = 18

function carveWindingRoad(g: Grid, pathTile: number, seed: number) {
  const rng = mulberry32(seed)
  let wy = MID
  for (let x = 2; x < WW - 2; x++) {
    if (x > 6 && x < WW - 7 && rng() < 0.28) {
      wy = Math.max(7, Math.min(WH - 8, wy + (rng() < 0.5 ? -1 : 1)))
    }
    if (x >= WW - 8) wy += Math.sign(MID - wy)
    g.rect(x, wy - 1, 1, 3, pathTile)
  }
  // North-South cross trail at center
  const cx = Math.floor(WW / 2)
  g.rect(cx - 1, 4, 3, WH - 8, pathTile)
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
      // Keep portal zones wide open
      if ((x < 7 || x > WW - 8) && Math.abs(y - MID) <= 4) continue
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

function finalizeWild(
  g: Grid,
  id: string,
  name: string,
  levelLabel: string,
  theme: Theme,
  base: number,
  wall: number,
  pathTile: number,
  west: { to: string; tx: number; ty: number; label: string } | null,
  east: { to: string; tx: number; ty: number; label: string } | null,
  spawns: { monsterId: string; count: number }[],
): MapDef {
  g.border(wall, 2)
  const portals: Portal[] = []
  if (west) {
    g.rect(0, MID - 2, 6, 4, pathTile)
    portals.push({ x: 0, y: MID - 2, w: 1, h: 4, ...west })
  }
  if (east) {
    g.rect(WW - 6, MID - 2, 6, 4, pathTile)
    portals.push({ x: WW - 1, y: MID - 2, w: 1, h: 4, ...east })
  }
  // Remove any object blocking immediate portal lanes
  g.objects = g.objects.filter((o) => {
    const inWest = west && o.tx <= 5 && Math.abs(o.ty - MID) <= 3
    const inEast = east && o.tx >= WW - 6 && Math.abs(o.ty - MID) <= 3
    return !inWest && !inEast
  })

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
    spawns,
    npcs: [],
    spawn: { x: 3, y: MID },
  }
}

function buildMeadow(): MapDef {
  const g = new Grid(WW, WH, T.GRASS)
  const rng = mulberry32(101)
  // North-South flowing river
  for (let y = 2; y < WH - 2; y++) {
    const rx = 25 + Math.round(Math.sin(y * 0.25) * 1.5)
    g.rect(rx, y, 2, 1, T.WATER)
  }
  carveWindingRoad(g, T.PATH, 101)
  // Bridges over the river at center road & upper meadow
  for (const by of [8, 9, 17, 18, 19, 27, 28]) {
    for (let x = 22; x <= 29; x++) {
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

  // NW Adventurer Camp
  g.rect(8, 7, 6, 5, T.PATH)
  g.obj('tent', 9, 8, true, 0, 'ค่ายนักผจญภัย')
  g.obj('campfire', 11, 10, true)
  g.obj('barrel_cluster', 12, 8, true)

  // SW Farm Plot & Scarecrow
  g.rect(7, 23, 8, 5, T.FLOWER)
  g.rect(7, 22, 8, 1, T.FENCE)
  g.rect(7, 28, 8, 1, T.FENCE)
  g.obj('scarecrow', 10, 25, true)
  g.obj('scarecrow', 13, 25, true)
  g.obj('wagon', 16, 25, true)

  // East Woodland Shrine & Supply Chest
  g.rect(36, 8, 6, 6, T.PLAZA)
  g.obj('well', 38, 10, true)
  g.obj('bench', 40, 11, true)
  g.obj('sign_arrow', 6, 15, true)
  g.obj('sign_arrow', 44, 15, true)
  g.obj('chest_decor', 42, 27, true)
  if (rng() > 0) g.obj('lamp_post', 22, 16, true)

  return finalizeWild(
    g,
    'meadow',
    'ทุ่งหญ้าสายลม',
    'Lv.1-10',
    'meadow',
    T.GRASS,
    T.TREE,
    T.PATH,
    { to: 'town', tx: 40, ty: 15, label: 'เมืองปราการเริ่มต้น' },
    { to: 'forest', tx: 3, ty: 18, label: 'ป่าลึกลับ Lv.10-20' },
    [
      { monsterId: 'slime', count: 10 },
      { monsterId: 'pink_slime', count: 7 },
      { monsterId: 'mushroom', count: 6 },
      { monsterId: 'rabbit', count: 5 },
    ],
  )
}

function buildForest(): MapDef {
  const g = new Grid(WW, WH, T.DARKGRASS)
  // Woodland pond & brook
  for (let y = 2; y < WH - 2; y++) {
    const rx = 18 + Math.round(Math.cos(y * 0.22) * 1.6)
    g.rect(rx, y, 2, 1, T.WATER)
  }
  carveWindingRoad(g, T.PATH, 202)
  for (const by of [9, 10, 17, 18, 19, 27, 28]) {
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

  // NE Goblin Encampment
  g.rect(31, 6, 10, 7, T.PATH)
  g.obj('totem', 32, 7, true, 0, 'ค่ายกอบลิน')
  g.obj('totem', 39, 7, true, 0)
  g.obj('tent', 34, 8, true, 1)
  g.obj('campfire', 36, 10, true)
  g.obj('barrel_cluster', 33, 11, true)
  g.obj('chest_decor', 39, 10, true)

  // SE Ancient Forest Ruins
  g.rect(33, 24, 9, 7, T.RUINS_FLOOR)
  g.obj('ruin_pillar', 34, 25, true)
  g.obj('ruin_pillar', 40, 25, true)
  g.obj('statue', 37, 26, true)
  g.obj('ruin_pillar', 34, 29, true)
  g.obj('ruin_pillar', 40, 29, true)
  g.obj('torch', 24, 15, true)
  g.obj('sign_arrow', 9, 15, true)

  return finalizeWild(
    g,
    'forest',
    'ป่าลึกลับ',
    'Lv.10-20',
    'forest',
    T.DARKGRASS,
    T.PINE,
    T.PATH,
    { to: 'meadow', tx: 48, ty: 18, label: 'ทุ่งหญ้าสายลม Lv.1-10' },
    { to: 'cave', tx: 3, ty: 18, label: 'ถ้ำมืด Lv.20-35' },
    [
      { monsterId: 'wolf', count: 11 },
      { monsterId: 'goblin', count: 10 },
      { monsterId: 'goblin_chief', count: 1 },
    ],
  )
}

function buildCave(): MapDef {
  const g = new Grid(WW, WH, T.CAVEWALL)
  // Carve multi-chamber cavern halls (West Earth Golem Hall, Central Crystal Cavern, East Mine)
  g.disc(11, 18, 9, T.CAVEFLOOR)
  g.disc(26, 18, 11, T.CAVEFLOOR)
  g.disc(40, 18, 9, T.CAVEFLOOR)
  g.disc(26, 8, 6, T.CAVEFLOOR)
  g.disc(26, 28, 6, T.CAVEFLOOR)
  g.rect(4, 15, WW - 8, 6, T.CAVEFLOOR) // wide main cavern passage
  g.rect(23, 6, 6, 24, T.CAVEFLOOR)

  // Underground river inside central cavern + stone bridge
  g.rect(20, 6, 2, 24, T.WATER)
  g.rect(19, 16, 4, 4, T.BRIDGE_H)
  g.rect(19, 26, 4, 2, T.BRIDGE_H)

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

  // Boss Sanctuary (West — keep tx=8..10 walkable for Earth Golem)
  g.rect(8, 16, 4, 4, T.CAVEFLOOR)
  g.obj('ruin_pillar', 7, 12, true)
  g.obj('ruin_pillar', 14, 12, true)
  g.obj('torch', 13, 15, true)
  g.obj('torch', 13, 21, true)

  // Crystal Chamber & Mining Props
  g.obj('crystal_spire', 25, 7, true)
  g.obj('crystal_spire', 28, 8, true)
  g.obj('mine_cart', 38, 14, true, 0, 'รถรางเหมือง')
  g.obj('mine_cart', 41, 21, true)
  g.obj('torch', 24, 15, true)
  g.obj('torch', 24, 21, true)
  g.obj('chest_decor', 26, 29, true)
  g.obj('skull_pile', 35, 22, true)

  return finalizeWild(
    g,
    'cave',
    'ถ้ำมืด',
    'Lv.20-35',
    'cave',
    T.CAVEFLOOR,
    T.CAVEWALL,
    T.CAVEFLOOR,
    { to: 'forest', tx: 48, ty: 18, label: 'ป่าลึกลับ Lv.10-20' },
    { to: 'volcano', tx: 3, ty: 18, label: 'แมพลาวา Lv.35-50' },
    [
      { monsterId: 'bat', count: 11 },
      { monsterId: 'skeleton', count: 10 },
      { monsterId: 'ghost', count: 8 },
      { monsterId: 'earth_golem', count: 1 },
    ],
  )
}

function buildVolcano(): MapDef {
  const g = new Grid(WW, WH, T.VOLCFLOOR)
  // Twin jagged magma rivers crossed by reinforced bridges
  for (let y = 2; y < WH - 2; y++) {
    const rx1 = 17 + Math.round(Math.sin(y * 0.3) * 1.4)
    const rx2 = 34 + Math.round(Math.cos(y * 0.25) * 1.4)
    g.rect(rx1, y, 2, 1, T.LAVA)
    g.rect(rx2, y, 2, 1, T.LAVA)
  }
  carveWindingRoad(g, T.RUINS_FLOOR, 404)
  for (const by of [9, 10, 17, 18, 19, 27, 28]) {
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

  // East Demon Lord Altar
  g.rect(38, 13, 8, 10, T.RUINS_FLOOR)
  g.set(42, 18, T.MAGIC_CIRCLE)
  g.obj('magma_brazier', 39, 14, true)
  g.obj('magma_brazier', 45, 14, true)
  g.obj('magma_brazier', 39, 22, true)
  g.obj('magma_brazier', 45, 22, true)
  g.obj('skull_pile', 24, 10, true)
  g.obj('skull_pile', 27, 26, true)
  g.obj('ruin_pillar', 12, 13, true)
  g.obj('ruin_pillar', 12, 23, true)

  return finalizeWild(
    g,
    'volcano',
    'แมพลาวา',
    'Lv.35-50 • เขตลาวา',
    'volcano',
    T.VOLCFLOOR,
    T.CAVEWALL,
    T.RUINS_FLOOR,
    { to: 'cave', tx: 48, ty: 18, label: 'ถ้ำมืด Lv.20-35' },
    { to: 'abyss', tx: 3, ty: 18, label: 'ดันเจี้ยนห้วงอเวจี Lv.50+' },
    [
      { monsterId: 'fire_golem', count: 11 },
      { monsterId: 'demon', count: 9 },
      { monsterId: 'demon_lord', count: 1 },
    ],
  )
}

function buildAbyss(): MapDef {
  const g = new Grid(WW, WH, T.CAVEFLOOR)
  // Symmetrical Dungeon Fortress Hall with Crimson Carpet & Obsidian Pillars
  g.rect(6, 5, WW - 12, WH - 10, T.RUINS_FLOOR)
  g.rect(6, MID - 1, WW - 12, 3, T.CARPET)
  g.rect(23, 5, 6, WH - 10, T.CARPET)

  // Outer Abyss Lava Moat Inside Perimeter
  g.rect(3, 3, WW - 6, 2, T.LAVA)
  g.rect(3, WH - 5, WW - 6, 2, T.LAVA)
  g.rect(3, 3, 2, WH - 6, T.LAVA)
  g.rect(WW - 5, 3, 2, WH - 6, T.LAVA)
  // Bridges over moat west & east
  g.rect(3, MID - 2, 3, 4, T.BRIDGE_H)
  g.rect(WW - 6, MID - 2, 3, 4, T.BRIDGE_H)

  // Pillar Corridor & Magic Altar
  for (const px of [12, 18, 33, 39]) {
    g.obj('colosseum_pillar', px, 13, true)
    g.obj('colosseum_pillar', px, 23, true)
    g.obj('torch', px, 15, true)
    g.obj('torch', px, 21, true)
  }
  g.set(26, 18, T.MAGIC_CIRCLE)
  g.obj('skull_pile', 10, 8, true)
  g.obj('skull_pile', 41, 8, true)
  g.obj('chest_decor', 10, 27, true)
  g.obj('chest_decor', 41, 27, true)

  return finalizeWild(
    g,
    'abyss',
    'ดันเจี้ยนห้วงอเวจี',
    'Lv.50+ ดันเจี้ยนบอส',
    'abyss',
    T.CAVEFLOOR,
    T.CAVEWALL,
    T.RUINS_FLOOR,
    { to: 'volcano', tx: 48, ty: 18, label: 'แมพลาวา Lv.35-50' },
    { to: 'sky_ruins', tx: 3, ty: 18, label: 'ซากฟ้าลอยฟ้า Lv.60+' },
    [
      { monsterId: 'demon', count: 10 },
      { monsterId: 'abyss_knight', count: 6 },
      { monsterId: 'abyss_dragon', count: 1 },
    ],
  )
}

function buildSkyRuins(): MapDef {
  const g = new Grid(WW, WH, T.CLOUD_VOID)
  // Floating Marble & Grass Sky Islands connected by Sky Bridges
  g.rect(4, 9, 13, 18, T.SKY_TILE)
  g.rect(19, 6, 14, 24, T.SKY_TILE)
  g.rect(35, 9, 13, 18, T.SKY_TILE)
  g.rect(21, 9, 10, 18, T.PLAZA)

  // Bridges linking the 3 floating islands
  g.rect(16, 16, 4, 4, T.BRIDGE_H)
  g.rect(32, 16, 4, 4, T.BRIDGE_H)
  g.rect(16, 10, 4, 2, T.BRIDGE_H)
  g.rect(32, 24, 4, 2, T.BRIDGE_H)

  // Sacred Sky Pools & Flower Borders
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

  return finalizeWild(
    g,
    'sky_ruins',
    'ซากฟ้าลอยฟ้า',
    'Lv.60-70',
    'sky',
    T.SKY_TILE,
    T.CLOUD_VOID,
    T.SKY_TILE,
    { to: 'abyss', tx: 48, ty: 18, label: 'ดันเจี้ยนห้วงอเวจี Lv.50+' },
    { to: 'crystal_vale', tx: 3, ty: 18, label: 'หุบเขาคริสตัล Lv.70+' },
    [
      { monsterId: 'gale_sentinel', count: 8 },
      { monsterId: 'abyss_knight', count: 8 },
      { monsterId: 'demon_lord', count: 3 },
    ],
  )
}

function buildCrystalVale(): MapDef {
  const g = new Grid(WW, WH, T.CAVEFLOOR)
  // Luminous underground river & twin crystal islands
  for (let y = 2; y < WH - 2; y++) {
    const rx = 26 + Math.round(Math.sin(y * 0.25) * 2)
    g.rect(rx, y, 2, 1, T.WATER)
  }
  carveWindingRoad(g, T.PLAZA, 707)
  for (const by of [9, 10, 17, 18, 19, 27, 28]) {
    for (let x = 22; x <= 30; x++) {
      if (g.get(x, by) === T.WATER) g.set(x, by, T.BRIDGE_H)
    }
  }
  scatterClean(
    g,
    T.CAVEFLOOR,
    777,
    [
      { tile: T.CRYSTAL, chance: 0.055 },
      { tile: T.ROCK, chance: 0.025 },
    ],
    [{ tile: T.MAGIC_CIRCLE, chance: 0.01 }],
  )

  for (const [cx, cy] of [
    [10, 9],
    [14, 26],
    [36, 9],
    [40, 26],
    [22, 14],
    [31, 21],
  ]) {
    g.obj('crystal_spire', cx, cy, true)
  }
  g.obj('torch', 19, 16, true)
  g.obj('torch', 33, 16, true)
  g.obj('chest_decor', 11, 27, true)
  g.obj('chest_decor', 41, 8, true)

  return finalizeWild(
    g,
    'crystal_vale',
    'หุบเขาคริสตัล',
    'Lv.70-80',
    'crystal',
    T.CAVEFLOOR,
    T.CAVEWALL,
    T.PLAZA,
    { to: 'sky_ruins', tx: 48, ty: 18, label: 'ซากฟ้าลอยฟ้า Lv.60+' },
    { to: 'frost_peak', tx: 3, ty: 18, label: 'ยอดเขาเหมันต์ Lv.80+' },
    [
      { monsterId: 'ghost', count: 10 },
      { monsterId: 'abyss_dragon', count: 2 },
    ],
  )
}

function buildFrostPeak(): MapDef {
  const g = new Grid(WW, WH, T.SNOW)
  // Large walkable frozen lake in the center framed by icy water moat + bridges
  g.disc(26, 18, 8, T.WATER)
  g.disc(26, 18, 6, T.ICE)
  g.rect(16, 17, 6, 3, T.BRIDGE_H)
  g.rect(30, 17, 6, 3, T.BRIDGE_H)
  g.rect(25, 9, 3, 4, T.BRIDGE_V)
  g.rect(25, 24, 3, 4, T.BRIDGE_V)

  carveWindingRoad(g, T.PATH, 808)
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

  return finalizeWild(
    g,
    'frost_peak',
    'ยอดเขาเหมันต์',
    'Lv.80-90',
    'frost',
    T.SNOW,
    T.PINE,
    T.PATH,
    { to: 'crystal_vale', tx: 48, ty: 18, label: 'หุบเขาคริสตัล Lv.70+' },
    { to: 'dream_garden', tx: 3, ty: 18, label: 'สวนฝันนิรันดร์ Lv.90+' },
    [
      { monsterId: 'demon', count: 10 },
      { monsterId: 'demon_lord', count: 2 },
    ],
  )
}

function buildDreamGarden(): MapDef {
  const g = new Grid(WW, WH, T.SAKURA_GRASS)
  // Serene curved lotus lake & sakura shrines
  g.disc(26, 18, 7, T.WATER)
  g.disc(26, 18, 4, T.PLAZA) // Center Island Shrine!
  g.rect(18, 17, 6, 3, T.BRIDGE_H)
  g.rect(28, 17, 6, 3, T.BRIDGE_H)
  g.rect(25, 10, 3, 5, T.BRIDGE_V)
  g.rect(25, 21, 3, 5, T.BRIDGE_V)

  carveWindingRoad(g, T.PATH, 909)
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

  g.obj('dream_shrine', 26, 17, true, 0, 'ศาลเจ้าแห่งความฝัน')
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

  return finalizeWild(
    g,
    'dream_garden',
    'สวนฝันนิรันดร์',
    'Lv.90-100',
    'dream',
    T.SAKURA_GRASS,
    T.TREE,
    T.PATH,
    { to: 'frost_peak', tx: 48, ty: 18, label: 'ยอดเขาเหมันต์ Lv.80+' },
    { to: 'celestial_colosseum', tx: 3, ty: 18, label: 'โคลอสเซียมสวรรค์ Lv.100+' },
    [
      { monsterId: 'fire_golem', count: 8 },
      { monsterId: 'abyss_knight', count: 4 },
    ],
  )
}

function buildColosseum(): MapDef {
  const g = new Grid(WW, WH, T.COBBLESTONE)
  // Grand Roman/Celestial Colosseum Arena
  g.border(T.CASTLE_WALL, 2)
  g.disc(26, 18, 13, T.GOLD_PAVING)
  g.ring(26, 18, 14, T.COBBLESTONE)
  g.rect(4, MID - 2, WW - 8, 4, T.GOLD_PAVING)
  g.rect(24, 4, 4, WH - 8, T.GOLD_PAVING)
  g.set(26, 18, T.MAGIC_CIRCLE)

  // Colosseum Pillars & Burning Braziers ringing the arena
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
  g.obj('statue', 26, 9, true, 0, 'เทพีแห่งชัยชนะ')
  g.obj('guild_banner', 23, 9, true)
  g.obj('guild_banner', 29, 9, true)
  g.obj('chest_decor', 26, 28, true)

  return finalizeWild(
    g,
    'celestial_colosseum',
    'โคลอสเซียมสวรรค์',
    'Lv.100+ เขตบอส',
    'colosseum',
    T.COBBLESTONE,
    T.CASTLE_WALL,
    T.GOLD_PAVING,
    { to: 'dream_garden', tx: 48, ty: 18, label: 'สวนฝันนิรันดร์ Lv.90+' },
    null,
    [
      { monsterId: 'demon_lord', count: 6 },
      { monsterId: 'abyss_dragon', count: 2 },
    ],
  )
}

export const MAPS: Record<string, MapDef> = {
  town: buildTown(),
  meadow: buildMeadow(),
  forest: buildForest(),
  cave: buildCave(),
  volcano: buildVolcano(),
  abyss: buildAbyss(),
  sky_ruins: buildSkyRuins(),
  crystal_vale: buildCrystalVale(),
  frost_peak: buildFrostPeak(),
  dream_garden: buildDreamGarden(),
  celestial_colosseum: buildColosseum(),
}

export const MAP_ORDER = [
  'town',
  'meadow',
  'forest',
  'cave',
  'volcano',
  'abyss',
  'sky_ruins',
  'crystal_vale',
  'frost_peak',
  'dream_garden',
  'celestial_colosseum',
]

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
