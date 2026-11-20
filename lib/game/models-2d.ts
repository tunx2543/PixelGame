import { MONSTER_CATALOG_META, normalizeMonsterId } from './biome-monsters'
import { getCatalogMonsterAtlas } from './catalog-sprites'
import { JOBS, MONSTERS, type JobDef, type MonsterDef, type MonsterSprite, type WeaponType } from './data'
import { MOUNT_DEFS, type MountArchetype, type MountDef } from './mounts'
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
    attack: number
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

export const JOB_MODEL_SPECS: Record<string, JobModelSpec> = {
  novice: {
    jobId: 'novice',
    name: JOBS.novice.name,
    tier: 0,
    hatStyle: 'none',
    armorStyle: 'novice_tunic',
    hairStyle: 'spiky',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'stick',
    hatColor: '#7f5338',
    scarfColor: '#dc2626',
    backpack: false,
    auraColor: '#60a5fa',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 4, attack: 4 },
  },
  swordsman: {
    jobId: 'swordsman',
    name: JOBS.swordsman.name,
    tier: 1,
    hatStyle: 'none',
    armorStyle: 'brigandine',
    hairStyle: 'spiky',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'sword',
    hatColor: '#e11d48',
    capeColor: '#be123c',
    shieldColor: '#94a3b8',
    shieldCrestColor: '#f43f5e',
    shoulderPads: true,
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 4, attack: 4 },
  },
  mage: {
    jobId: 'mage',
    name: JOBS.mage.name,
    tier: 1,
    hatStyle: 'wizard',
    armorStyle: 'robe',
    hairStyle: 'long',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'staff',
    hatColor: '#5b21b6',
    capeColor: '#3b0764',
    auraColor: '#38bdf8',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 4, attack: 4 },
  },
  archer: {
    jobId: 'archer',
    name: JOBS.archer.name,
    tier: 1,
    hatStyle: 'hood',
    armorStyle: 'leather',
    hairStyle: 'ponytail',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'bow',
    hatColor: '#15803d',
    capeColor: '#166534',
    scarfColor: '#e9c46a',
    quiver: true,
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 4, attack: 4 },
  },
  cleric: {
    jobId: 'cleric',
    name: JOBS.cleric.name,
    tier: 1,
    hatStyle: 'mitre',
    armorStyle: 'vestment',
    hairStyle: 'long',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'staff',
    hatColor: '#f8fafc',
    capeColor: '#facc15',
    halo: true,
    auraColor: '#fde047',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 4, attack: 4 },
  },
  merchant: {
    jobId: 'merchant',
    name: JOBS.merchant.name,
    tier: 1,
    hatStyle: 'merchant_beret',
    armorStyle: 'brigandine',
    hairStyle: 'parted',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'sword',
    hatColor: '#b45309',
    scarfColor: '#fbbf24',
    backpack: true,
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 4, attack: 4 },
  },
  thief: {
    jobId: 'thief',
    name: JOBS.thief.name,
    tier: 1,
    hatStyle: 'bandana',
    armorStyle: 'shadow',
    hairStyle: 'swept',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'dagger',
    hatColor: '#9f1239',
    scarfColor: '#e11d48',
    capeColor: '#1e1b2e',
    dualDaggers: true,
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 4, attack: 4 },
  },
  kensei: {
    jobId: 'kensei',
    name: JOBS.kensei.name,
    tier: 2,
    hatStyle: 'none',
    armorStyle: 'brigandine',
    hairStyle: 'ponytail',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'sword',
    hatColor: '#1e3a8a',
    capeColor: '#0f172a',
    scarfColor: '#38bdf8',
    shoulderPads: true,
    auraColor: '#38bdf8',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 4, attack: 4 },
  },
  iron_fist: {
    jobId: 'iron_fist',
    name: JOBS.iron_fist.name,
    tier: 2,
    hatStyle: 'none',
    armorStyle: 'plate',
    hairStyle: 'spiky',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'sword',
    hatColor: '#ea580c',
    scarfColor: '#fb923c',
    shieldColor: '#78716c',
    shieldCrestColor: '#f97316',
    shoulderPads: true,
    auraColor: '#fb923c',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 4, attack: 4 },
  },
  wicked_necromancer: {
    jobId: 'wicked_necromancer',
    name: JOBS.wicked_necromancer.name,
    tier: 2,
    hatStyle: 'archmage',
    armorStyle: 'arch_robe',
    hairStyle: 'long',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'staff',
    hatColor: '#3b0764',
    capeColor: '#1e1b4b',
    scarfColor: '#c084fc',
    shoulderPads: true,
    auraColor: '#a855f7',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 4, attack: 4 },
  },
  the_king: {
    jobId: 'the_king',
    name: JOBS.the_king.name,
    tier: 2,
    hatStyle: 'crown',
    armorStyle: 'sovereign',
    hairStyle: 'royal',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'staff',
    hatColor: '#facc15',
    capeColor: '#991b1b',
    shoulderPads: true,
    halo: true,
    auraColor: '#facc15',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 4, attack: 4 },
  },
  sinister: {
    jobId: 'sinister',
    name: JOBS.sinister.name,
    tier: 2,
    hatStyle: 'cowl',
    armorStyle: 'shadow',
    hairStyle: 'swept',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'dagger',
    hatColor: '#18181b',
    capeColor: '#881337',
    scarfColor: '#e11d48',
    shoulderPads: true,
    dualDaggers: true,
    auraColor: '#e11d48',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 4, attack: 4 },
  },
  templar: {
    jobId: 'templar',
    name: JOBS.templar.name,
    tier: 2,
    hatStyle: 'paladin_helm',
    armorStyle: 'paladin_plate',
    hairStyle: 'royal',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'sword',
    hatColor: '#f8fafc',
    capeColor: '#2563eb',
    shieldColor: '#fef3c7',
    shieldCrestColor: '#3b82f6',
    shoulderPads: true,
    halo: true,
    auraColor: '#60a5fa',
    wingStyle: 'angel',
    animationFrames: { idle: 4, walk: 4, attack: 4 },
  },
  nekobaku: {
    jobId: 'nekobaku',
    name: JOBS.nekobaku.name,
    tier: 2,
    hatStyle: 'cat_hood',
    armorStyle: 'leather',
    hairStyle: 'ponytail',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'bow',
    hatColor: '#be185d',
    capeColor: '#831843',
    scarfColor: '#f472b6',
    backpack: true,
    quiver: true,
    auraColor: '#f472b6',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 4, attack: 4 },
  },
  mamushi: {
    jobId: 'mamushi',
    name: JOBS.mamushi.name,
    tier: 2,
    hatStyle: 'cowl',
    armorStyle: 'shadow',
    hairStyle: 'swept',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'bow',
    hatColor: '#064e3b',
    capeColor: '#022c22',
    scarfColor: '#4ade80',
    quiver: true,
    auraColor: '#22c55e',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 4, attack: 4 },
  },
}

function buildMonsterSpec(def: MonsterDef): MonsterModelSpec {
  const catalogMeta = MONSTER_CATALOG_META[def.id]
  const catalogAtlas = getCatalogMonsterAtlas(def.id)
  const archetype: MonsterModelArchetype = def.id
  const flying = Boolean(catalogAtlas?.flying || catalogMeta?.flying)
  const supports4Way = false

  const canvasSize = catalogMeta
    ? catalogMeta.boss
      ? catalogMeta.tribe === 'มังกร' || catalogMeta.id === 'world_goat' || catalogMeta.id === 'coast_drowned_captain'
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
  return JOB_MODEL_SPECS[jobId] ?? JOB_MODEL_SPECS.novice
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
  if (mountId && MOUNT_MODEL_SPECS[mountId]) {
    return MOUNT_MODEL_SPECS[mountId]
  }
  return MOUNT_MODEL_SPECS.meadow_pony
}

export function getAllMountModels(): Array<{ mount: MountDef; model: MountModelSpec }> {
  return MOUNT_DEFS.map((mount) => ({
    mount,
    model: getMountModelSpec(mount.id),
  }))
}

