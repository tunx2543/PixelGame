import { MONSTER_CATALOG_META, normalizeMonsterId } from './biome-monsters'
import { getCatalogMonsterAtlas } from './catalog-sprites'
import { JOBS, MONSTERS, normalizeJobId, type JobDef, type MonsterDef, type MonsterSprite, type WeaponType } from './data'
import { MOUNT_DEFS, resolveMountId, type MountArchetype, type MountDef } from './mounts'
import { COMBAT_PETS, type CombatPetDef } from './systems'

export type ModelDir = 'down' | 'up' | 'left' | 'right'
export type ModelAction = 'idle' | 'walk' | 'attack'

export type HatStyle =
  | 'none'
  | 'wizard'
  | 'archmage'
  | 'hood'
  | 'ranger_hood'
  | 'cowl'
  | 'helm'
  | 'paladin_helm'
  | 'crown'
  | 'mitre'
  | 'bandana'
  | 'novice_bandana'
  | 'merchant_beret'
  | 'cat_hood'

export type ArmorStyle =
  | 'tunic'
  | 'novice_tunic'
  | 'brigandine'
  | 'plate'
  | 'paladin_plate'
  | 'robe'
  | 'arch_robe'
  | 'vestment'
  | 'leather'
  | 'shadow'
  | 'sovereign'

export type HairStyle =
  | 'spiky'
  | 'swept'
  | 'long'
  | 'ponytail'
  | 'braid'
  | 'parted'
  | 'royal'

export interface JobModelSpec {
  jobId: string
  name: string
  tier: 0 | 1 | 2
  hatStyle: HatStyle
  armorStyle: ArmorStyle
  hairStyle?: HairStyle
  canvasSize?: { width: number; height: number }
  weapon: WeaponType
  hatColor: string
  capeColor?: string
  scarfColor?: string
  shieldColor?: string
  shieldCrestColor?: string
  quiver?: boolean
  halo?: boolean
  wings?: boolean
  wingStyle?: 'angel' | 'seraph' | 'none'
  shoulderPads?: boolean
  auraColor?: string
  dualDaggers?: boolean
  backpack?: boolean
  animationFrames: {
    idle: number
    walk: number
    run?: number
    attack: number
    skill?: number
    hit?: number
    death?: number
    victory?: number
  }
}

export type MonsterModelArchetype = string & {}

export interface MonsterModelSpec {
  monsterId: string
  name: string
  level: number
  boss: boolean
  archetype: MonsterModelArchetype
  sprite: MonsterSprite
  color: string
  accentColor: string
  canvasSize: { width: number; height: number }
  supports4Way: boolean
  flying: boolean
  auraColor?: string
  animationFrames: {
    idle: number
    walk: number
    attack: number
  }
}

export const MODEL_DIRS: readonly ModelDir[] = ['down', 'right', 'up', 'left'] as const
export const MODEL_ACTIONS: readonly ModelAction[] = ['idle', 'walk', 'attack'] as const

export const HUMAN_MODEL_CANVAS_SIZE = { width: 42, height: 48 } as const
export const HERO_MODEL_CANVAS_SIZE = { width: 168, height: 192 } as const

export const JOB_MODEL_SPECS: Record<string, JobModelSpec> = {
  novice: {
    jobId: 'novice',
    name: JOBS.novice.name,
    tier: 0,
    hatStyle: 'none',
    armorStyle: 'novice_tunic',
    hairStyle: 'spiky',
    canvasSize: { ...HERO_MODEL_CANVAS_SIZE },
    weapon: 'sword',
    hatColor: '#3f2519',
    capeColor: '#c81e1e',
    scarfColor: '#dc2626',
    backpack: false,
    auraColor: '#ef4444',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, run: 6, attack: 5, skill: 6, hit: 3, death: 5, victory: 5 },
  },
  swordsman: {
    jobId: 'swordsman',
    name: JOBS.swordsman.name,
    tier: 1,
    hatStyle: 'none',
    armorStyle: 'plate',
    hairStyle: 'spiky',
    canvasSize: { ...HERO_MODEL_CANVAS_SIZE },
    weapon: 'sword',
    hatColor: '#291e1a',
    capeColor: '#cbd5e1',
    shieldColor: '#475569',
    shieldCrestColor: '#fbbf24',
    shoulderPads: true,
    auraColor: '#f59e0b',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, run: 6, attack: 5, skill: 6, hit: 3, death: 5, victory: 5 },
  },
  mage: {
    jobId: 'mage',
    name: JOBS.mage.name,
    tier: 1,
    hatStyle: 'none',
    armorStyle: 'robe',
    hairStyle: 'spiky',
    canvasSize: { ...HERO_MODEL_CANVAS_SIZE },
    weapon: 'staff',
    hatColor: '#5b21b6',
    capeColor: '#4c1d95',
    shoulderPads: true,
    auraColor: '#a855f7',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, run: 6, attack: 5, skill: 6, hit: 3, death: 5, victory: 5 },
  },
  archer: {
    jobId: 'archer',
    name: JOBS.archer.name,
    tier: 1,
    hatStyle: 'ranger_hood',
    armorStyle: 'leather',
    hairStyle: 'spiky',
    canvasSize: { ...HERO_MODEL_CANVAS_SIZE },
    weapon: 'bow',
    hatColor: '#1f6f3b',
    capeColor: '#14532d',
    quiver: true,
    auraColor: '#22c55e',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, run: 6, attack: 5, skill: 6, hit: 3, death: 5, victory: 5 },
  },
  cleric: {
    jobId: 'cleric',
    name: JOBS.cleric.name,
    tier: 1,
    hatStyle: 'none',
    armorStyle: 'vestment',
    hairStyle: 'swept',
    canvasSize: { ...HERO_MODEL_CANVAS_SIZE },
    weapon: 'staff',
    hatColor: '#f1f5f9',
    capeColor: '#dbeafe',
    shoulderPads: true,
    auraColor: '#facc15',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, run: 6, attack: 5, skill: 6, hit: 3, death: 5, victory: 5 },
  },
  merchant: {
    jobId: 'merchant',
    name: JOBS.merchant.name,
    tier: 1,
    hatStyle: 'none',
    armorStyle: 'plate',
    hairStyle: 'spiky',
    canvasSize: { ...HERO_MODEL_CANVAS_SIZE },
    weapon: 'sword',
    hatColor: '#b45309',
    capeColor: '#92400e',
    shoulderPads: true,
    backpack: false,
    auraColor: '#fbbf24',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, run: 6, attack: 5, skill: 6, hit: 3, death: 5, victory: 5 },
  },
  thief: {
    jobId: 'thief',
    name: JOBS.thief.name,
    tier: 1,
    hatStyle: 'none',
    armorStyle: 'shadow',
    hairStyle: 'spiky',
    canvasSize: { ...HERO_MODEL_CANVAS_SIZE },
    weapon: 'dagger',
    hatColor: '#1f1d24',
    scarfColor: '#dc2626',
    dualDaggers: true,
    auraColor: '#f43f5e',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, run: 6, attack: 5, skill: 6, hit: 3, death: 5, victory: 5 },
  },
  kensei: {
    jobId: 'kensei',
    name: JOBS.kensei.name,
    tier: 2,
    hatStyle: 'none',
    armorStyle: 'vestment',
    hairStyle: 'ponytail',
    canvasSize: { ...HERO_MODEL_CANVAS_SIZE },
    weapon: 'sword',
    hatColor: '#dc2626',
    scarfColor: '#dc2626',
    shoulderPads: true,
    auraColor: '#38bdf8',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, run: 6, attack: 5, skill: 6, hit: 3, death: 5, victory: 5 },
  },
  iron_fist: {
    jobId: 'iron_fist',
    name: JOBS.iron_fist.name,
    tier: 2,
    hatStyle: 'none',
    armorStyle: 'leather',
    hairStyle: 'spiky',
    canvasSize: { ...HERO_MODEL_CANVAS_SIZE },
    weapon: 'sword',
    hatColor: '#2b1e19',
    scarfColor: '#dc2626',
    auraColor: '#f97316',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, run: 6, attack: 5, skill: 6, hit: 3, death: 5, victory: 5 },
  },
  wicked_necromancer: {
    jobId: 'wicked_necromancer',
    name: JOBS.wicked_necromancer.name,
    tier: 2,
    hatStyle: 'none',
    armorStyle: 'arch_robe',
    hairStyle: 'spiky',
    canvasSize: { ...HERO_MODEL_CANVAS_SIZE },
    weapon: 'staff',
    hatColor: '#26183b',
    capeColor: '#1b1330',
    shoulderPads: true,
    auraColor: '#c084fc',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, run: 6, attack: 5, skill: 6, hit: 3, death: 5, victory: 5 },
  },
  the_king: {
    jobId: 'the_king',
    name: JOBS.the_king.name,
    tier: 2,
    hatStyle: 'crown',
    armorStyle: 'sovereign',
    hairStyle: 'royal',
    canvasSize: { ...HERO_MODEL_CANVAS_SIZE },
    weapon: 'staff',
    hatColor: '#fbbf24',
    capeColor: '#991b1b',
    shoulderPads: true,
    auraColor: '#fbbf24',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, run: 6, attack: 5, skill: 6, hit: 3, death: 5, victory: 5 },
  },
  sinister: {
    jobId: 'sinister',
    name: JOBS.sinister.name,
    tier: 2,
    hatStyle: 'none',
    armorStyle: 'shadow',
    hairStyle: 'spiky',
    canvasSize: { ...HERO_MODEL_CANVAS_SIZE },
    weapon: 'dagger',
    hatColor: '#18181b',
    capeColor: '#2d234a',
    shoulderPads: true,
    dualDaggers: true,
    auraColor: '#a855f7',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, run: 6, attack: 5, skill: 6, hit: 3, death: 5, victory: 5 },
  },
  templar: {
    jobId: 'templar',
    name: JOBS.templar.name,
    tier: 2,
    hatStyle: 'none',
    armorStyle: 'paladin_plate',
    hairStyle: 'swept',
    canvasSize: { ...HERO_MODEL_CANVAS_SIZE },
    weapon: 'sword',
    hatColor: '#2e2018',
    capeColor: '#1e3a8a',
    shieldColor: '#1e40af',
    shieldCrestColor: '#fbbf24',
    shoulderPads: true,
    auraColor: '#60a5fa',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, run: 6, attack: 5, skill: 6, hit: 3, death: 5, victory: 5 },
  },
  nekobaku: {
    jobId: 'nekobaku',
    name: JOBS.nekobaku.name,
    tier: 2,
    hatStyle: 'none',
    armorStyle: 'robe',
    hairStyle: 'spiky',
    canvasSize: { ...HERO_MODEL_CANVAS_SIZE },
    weapon: 'staff',
    hatColor: '#4ade80',
    capeColor: '#cbd5e1',
    shoulderPads: true,
    auraColor: '#4ade80',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, run: 6, attack: 5, skill: 6, hit: 3, death: 5, victory: 5 },
  },
  mamushi: {
    jobId: 'mamushi',
    name: JOBS.mamushi.name,
    tier: 2,
    hatStyle: 'none',
    armorStyle: 'shadow',
    hairStyle: 'spiky',
    canvasSize: { ...HERO_MODEL_CANVAS_SIZE },
    weapon: 'dagger',
    hatColor: '#1b1d24',
    capeColor: '#2e1065',
    shoulderPads: true,
    auraColor: '#22c55e',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, run: 6, attack: 5, skill: 6, hit: 3, death: 5, victory: 5 },
  },
}

function buildMonsterSpec(def: MonsterDef): MonsterModelSpec {
  const catalogMeta = MONSTER_CATALOG_META[def.id]
  const catalogAtlas = getCatalogMonsterAtlas(def.id)
  const archetype: MonsterModelArchetype = def.id
  const flying = Boolean(catalogAtlas?.flying || catalogMeta?.flying)
  const supports4Way = def.id === 'world_golem'

  const canvasSize = catalogMeta
    ? catalogMeta.boss
      ? catalogMeta.tribe === 'มังกร' ||
        catalogMeta.id === 'world_golem' ||
        catalogMeta.id === 'world_goat' ||
        catalogMeta.id === 'coast_drowned_captain'
        ? { width: 42, height: 38 }
        : { width: 38, height: 36 }
      : catalogMeta.size === 'ใหญ่'
        ? { width: 36, height: 34 }
        : catalogMeta.size === 'กลาง'
          ? { width: 32, height: 30 }
          : { width: 28, height: 26 }
    : { width: 32, height: 30 }

  const catalogElementAccent: Record<string, string> = {
    fire: '#fb923c',
    water: '#38bdf8',
    ice: '#67e8f9',
    earth: '#d4a373',
    wind: '#4ade80',
    poison: '#c084fc',
    light: '#fde047',
    dark: '#a855f7',
    neutral: '#fbbf24',
  }

  const accentColor = catalogMeta
    ? (def.boss ? '#f5c441' : catalogElementAccent[catalogMeta.elementType] ?? def.color)
    : def.color

  return {
    monsterId: def.id,
    name: def.name,
    level: def.level,
    boss: Boolean(def.boss),
    archetype,
    sprite: def.sprite,
    color: def.color,
    accentColor,
    canvasSize,
    supports4Way,
    flying,
    auraColor: def.boss ? '#f5c441' : undefined,
    animationFrames: catalogAtlas
      ? {
          idle:
            catalogAtlas.anims.idle?.frames.length ??
            (catalogAtlas.flying ? catalogAtlas.anims.walk?.frames.length ?? 1 : 1),
          walk: catalogAtlas.anims.walk?.frames.length ?? catalogAtlas.anims.idle?.frames.length ?? 1,
          attack: catalogAtlas.anims.attack?.frames.length ?? catalogAtlas.anims.skill?.frames.length ?? 4,
        }
      : { idle: 4, walk: 6, attack: 4 },
  }
}

export const MONSTER_MODEL_SPECS: Record<string, MonsterModelSpec> = Object.fromEntries(
  Object.values(MONSTERS).map((def) => [def.id, buildMonsterSpec(def)]),
)

export function getJobModelSpec(jobId: string): JobModelSpec {
  const canonical = normalizeJobId(jobId)
  return JOB_MODEL_SPECS[canonical] ?? JOB_MODEL_SPECS.novice
}

export function getMonsterModelSpec(defId?: string, sprite?: MonsterSprite, color?: string): MonsterModelSpec {
  const normalizedId = defId ? normalizeMonsterId(defId) : undefined
  if (normalizedId && MONSTER_MODEL_SPECS[normalizedId]) {
    return MONSTER_MODEL_SPECS[normalizedId]
  }
  const fallbackDef =
    (sprite ? Object.values(MONSTERS).find((m) => m.sprite === sprite) : undefined) ??
    MONSTERS.meadow_blob ??
    Object.values(MONSTERS)[0]
  const spec = MONSTER_MODEL_SPECS[fallbackDef.id]
  return {
    ...spec,
    color: color ?? spec.color,
  }
}

export function getAllJobModels(): Array<{ job: JobDef; model: JobModelSpec }> {
  return Object.values(JOBS).map((job) => ({
    job,
    model: getJobModelSpec(job.id),
  }))
}

export function getAllMonsterModels(): Array<{ monster: MonsterDef; model: MonsterModelSpec }> {
  return Object.values(MONSTERS)
    .sort((a, b) => a.level - b.level)
    .map((monster) => ({
      monster,
      model: getMonsterModelSpec(monster.id, monster.sprite, monster.color),
    }))
}

export type PetModelArchetype =
  | 'phao_lotus'
  | 'phao_gold_naga'
  | 'phao_celestial'
  | 'phao_phantom'
  | 'buddy_slime'
  | 'flame_fox'
  | 'crystal_owl'
  | 'moonlight_firefly'
  | 'gem_raccoon'
  | 'aurora_cloud_dragon'
  | 'phao_water_slime'
  | 'phao_dawn_rooster'
  | 'phao_husky_kitten'
  | 'phao_shiba_scarf'
  | 'phao_spear_goblin'
  | 'phao_silver_wolf'
  | 'phao_ribbon_bunny'
  | 'phao_acorn_squirrel'
  | 'phao_ember_ninetail'
  | 'phao_sky_eagle'
  | 'phao_frost_penguin'
  | 'phao_stone_tortoise'
  | 'phao_crimson_dragon'
  | 'phao_prism_unicorn'
  | 'phao_sapphire_wisp'
  | 'phao_abyss_neko'
  | 'phao_sacred_kitsune'
  | 'phao_solar_phoenix'
  | 'phao_glacial_wolf'
  | 'phao_armored_lion'
  | 'phao_obsidian_dragon'
  | 'phao_seraph_cat'
  | 'phao_violet_hound'
  | 'phao_rune_golem'
  | 'phao_astral_dragon'
  | 'phao_frost_stag'
  | 'phao_celestial_owl'
  | 'phao_golden_seraph'

const FLOATING_PET_ARCHETYPES = new Set<string>([
  'phao_lotus',
  'phao_gold_naga',
  'phao_celestial',
  'phao_phantom',
  'crystal_owl',
  'moonlight_firefly',
  'aurora_cloud_dragon',
  'phao_sky_eagle',
  'phao_crimson_dragon',
  'phao_prism_unicorn',
  'phao_sapphire_wisp',
  'phao_solar_phoenix',
  'phao_glacial_wolf',
  'phao_armored_lion',
  'phao_obsidian_dragon',
  'phao_seraph_cat',
  'phao_violet_hound',
  'phao_astral_dragon',
  'phao_celestial_owl',
  'phao_golden_seraph',
])

export interface PetModelSpec {
  petId: string
  name: string
  category: 'phao' | 'companion'
  rarity: CombatPetDef['rarity']
  archetype: PetModelArchetype
  colors: CombatPetDef['colors']
  canvasSize: { width: number; height: number }
  supports4Way: boolean
  floating: boolean
  auraColor: string
  animationFrames: {
    idle: number
    walk: number
    run: number
    follow: number
    attack: number
  }
}

export const PET_MODEL_CANVAS_SIZE = { width: 34, height: 34 } as const

function buildPetModelSpec(def: CombatPetDef): PetModelSpec {
  const category = def.category ?? (def.id.startsWith('phao_') ? 'phao' : 'companion')
  const archetype = (def.id as PetModelArchetype) ?? 'buddy_slime'
  const floating = FLOATING_PET_ARCHETYPES.has(def.id)
  return {
    petId: def.id,
    name: def.name,
    category,
    rarity: def.rarity,
    archetype,
    colors: def.colors,
    canvasSize: { ...PET_MODEL_CANVAS_SIZE },
    supports4Way: true,
    floating,
    auraColor: def.colors.accent,
    animationFrames: { idle: 4, walk: 6, run: 6, follow: 6, attack: 4 },
  }
}

export const PET_MODEL_SPECS: Record<string, PetModelSpec> = Object.fromEntries(
  COMBAT_PETS.map((def) => [def.id, buildPetModelSpec(def)]),
)

export function getPetModelSpec(petId?: string | null): PetModelSpec {
  if (petId && PET_MODEL_SPECS[petId]) {
    return PET_MODEL_SPECS[petId]
  }
  return PET_MODEL_SPECS.phao_lotus ?? PET_MODEL_SPECS.buddy_slime
}

export function getAllPetModels(): Array<{ pet: CombatPetDef; model: PetModelSpec }> {
  return COMBAT_PETS.map((pet) => ({
    pet,
    model: getPetModelSpec(pet.id),
  }))
}

export interface MountModelSpec {
  mountId: string
  name: string
  rarity: MountDef['rarity']
  archetype: MountArchetype
  colors: MountDef['colors']
  canvasSize: { width: number; height: number }
  seatOffsetY: number
  supports4Way: boolean
  flying: boolean
  auraColor?: string
  animationFrames: {
    idle: number
    walk: number
    run: number
    mount: number
    dismount: number
    attack: number
  }
}

export const MOUNT_MODEL_CANVAS_SIZE = { width: 56, height: 48 } as const

function buildMountModelSpec(def: MountDef): MountModelSpec {
  return {
    mountId: def.id,
    name: def.name,
    rarity: def.rarity,
    archetype: def.archetype,
    colors: def.colors,
    canvasSize: { ...MOUNT_MODEL_CANVAS_SIZE },
    seatOffsetY: def.seatOffsetY,
    supports4Way: true,
    flying: def.flying,
    auraColor: def.auraColor,
    animationFrames: { idle: 4, walk: 6, run: 6, mount: 4, dismount: 4, attack: 4 },
  }
}

export const MOUNT_MODEL_SPECS: Record<string, MountModelSpec> = Object.fromEntries(
  MOUNT_DEFS.map((def) => [def.id, buildMountModelSpec(def)]),
)

export function getMountModelSpec(mountId?: string | null): MountModelSpec {
  const resolved = resolveMountId(mountId)
  if (resolved && MOUNT_MODEL_SPECS[resolved]) {
    return MOUNT_MODEL_SPECS[resolved]
  }
  return MOUNT_MODEL_SPECS.meadow_pony
}

export function getAllMountModels(): Array<{ mount: MountDef; model: MountModelSpec }> {
  return MOUNT_DEFS.map((mount) => ({
    mount,
    model: getMountModelSpec(mount.id),
  }))
}

