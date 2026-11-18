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

export type MonsterModelArchetype =
  | 'slime'
  | 'slime_blue'
  | 'pink_slime'
  | 'mushroom'
  | 'rabbit'
  | 'boss_wolf'
  | 'wolf'
  | 'goblin'
  | 'boss_spider_queen'
  | 'goblin_chief'
  | 'boss_lich'
  | 'bat'
  | 'spider'
  | 'boss_fire_dragon'
  | 'skeleton'
  | 'orc'
  | 'golem'
  | 'boss_demon_king'
  | 'ghost'
  | 'fire_golem'
  | 'earth_golem'
  | 'demon'
  | 'demon_lord'
  | 'abyss_knight'
  | 'gale_sentinel'
  | 'abyss_dragon'

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
    scarfColor: '#784421',
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

const ARCHETYPE_BY_ID: Record<string, MonsterModelArchetype> = {
  slime: 'slime',
  slime_blue: 'slime_blue',
  pink_slime: 'pink_slime',
  mushroom: 'mushroom',
  rabbit: 'rabbit',
  boss_wolf: 'boss_wolf',
  wolf: 'wolf',
  goblin: 'goblin',
  boss_spider_queen: 'boss_spider_queen',
  goblin_chief: 'goblin_chief',
  boss_lich: 'boss_lich',
  bat: 'bat',
  spider: 'spider',
  boss_fire_dragon: 'boss_fire_dragon',
  skeleton: 'skeleton',
  orc: 'orc',
  golem: 'golem',
  boss_demon_king: 'boss_demon_king',
  ghost: 'ghost',
  fire_golem: 'fire_golem',
  earth_golem: 'earth_golem',
  demon: 'demon',
  demon_lord: 'demon_lord',
  abyss_knight: 'abyss_knight',
  gale_sentinel: 'gale_sentinel',
  abyss_dragon: 'abyss_dragon',
}

const ARCHETYPE_BY_SPRITE: Record<MonsterSprite, MonsterModelArchetype> = {
  slime: 'slime',
  mushroom: 'mushroom',
  rabbit: 'rabbit',
  wolf: 'wolf',
  goblin: 'goblin',
  bat: 'bat',
  spider: 'spider',
  skeleton: 'skeleton',
  ghost: 'ghost',
  orc: 'orc',
  golem: 'fire_golem',
  earth_golem: 'earth_golem',
  demon: 'demon',
  gale_sentinel: 'gale_sentinel',
}

function buildMonsterSpec(def: MonsterDef): MonsterModelSpec {
  const archetype = ARCHETYPE_BY_ID[def.id] ?? ARCHETYPE_BY_SPRITE[def.sprite] ?? 'slime'
  const flying =
    archetype === 'bat' ||
    archetype === 'ghost' ||
    archetype === 'boss_fire_dragon' ||
    archetype === 'abyss_dragon' ||
    archetype === 'gale_sentinel'
  const supports4Way =
    archetype === 'goblin' ||
    archetype === 'goblin_chief' ||
    archetype === 'orc' ||
    archetype === 'skeleton' ||
    archetype === 'boss_lich' ||
    archetype === 'abyss_knight' ||
    archetype === 'gale_sentinel' ||
    archetype === 'demon' ||
    archetype === 'boss_demon_king' ||
    archetype === 'demon_lord'

  const canvasSize =
    archetype === 'abyss_dragon' || archetype === 'boss_fire_dragon'
      ? { width: 42, height: 34 }
      : archetype === 'demon_lord' ||
          archetype === 'boss_demon_king' ||
          archetype === 'boss_wolf' ||
          archetype === 'boss_spider_queen' ||
          archetype === 'boss_lich' ||
          archetype === 'earth_golem' ||
          archetype === 'goblin_chief'
        ? { width: 34, height: 32 }
        : archetype === 'abyss_knight' ||
            archetype === 'gale_sentinel' ||
            archetype === 'fire_golem' ||
            archetype === 'orc' ||
            archetype === 'golem'
          ? { width: 32, height: 30 }
          : archetype === 'wolf'
            ? { width: 30, height: 24 }
            : { width: 28, height: 26 }

  const accentColor =
    archetype === 'slime_blue'
      ? '#bae6fd'
      : archetype === 'pink_slime'
        ? '#ffd6e0'
        : archetype === 'boss_wolf'
          ? '#fb923c'
          : archetype === 'spider'
            ? '#f43f5e'
            : archetype === 'boss_spider_queen'
              ? '#fde047'
              : archetype === 'goblin_chief'
                ? '#ffd60a'
                : archetype === 'boss_lich'
                  ? '#c084fc'
                  : archetype === 'boss_fire_dragon'
                    ? '#ffb703'
                    : archetype === 'orc'
                      ? '#fde047'
                      : archetype === 'golem'
                        ? '#a8a29e'
                        : archetype === 'boss_demon_king'
                          ? '#f43f5e'
                          : archetype === 'fire_golem'
                            ? '#ffb703'
                            : archetype === 'earth_golem'
                              ? '#a3e635'
                              : archetype === 'abyss_knight'
                                ? '#c77dff'
                                : archetype === 'gale_sentinel'
                                  ? '#ffd60a'
                                  : archetype === 'demon_lord'
                                    ? '#ff9e00'
                                    : archetype === 'abyss_dragon'
                                      ? '#e0aaff'
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
    auraColor: def.boss ? accentColor : archetype === 'abyss_knight' ? '#9d4edd' : undefined,
    animationFrames: { idle: 4, walk: 6, attack: 4 },
  }
}

export const MONSTER_MODEL_SPECS: Record<string, MonsterModelSpec> = Object.fromEntries(
  Object.values(MONSTERS).map((def) => [def.id, buildMonsterSpec(def)]),
)

export function getJobModelSpec(jobId: string): JobModelSpec {
  return JOB_MODEL_SPECS[jobId] ?? JOB_MODEL_SPECS.novice
}

export function getMonsterModelSpec(defId?: string, sprite?: MonsterSprite, color?: string): MonsterModelSpec {
  if (defId && MONSTER_MODEL_SPECS[defId]) {
    return MONSTER_MODEL_SPECS[defId]
  }
  const archetype = sprite ? ARCHETYPE_BY_SPRITE[sprite] ?? 'slime' : 'slime'
  const fallbackDef = Object.values(MONSTERS).find((m) => m.sprite === sprite) ?? MONSTERS.slime
  const spec = MONSTER_MODEL_SPECS[fallbackDef.id]
  return {
    ...spec,
    archetype,
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
    attack: number
  }
}

export const PET_MODEL_CANVAS_SIZE = { width: 28, height: 30 } as const

function buildPetModelSpec(def: CombatPetDef): PetModelSpec {
  const category = def.category ?? (def.id.startsWith('phao_') ? 'phao' : 'companion')
  const archetype = (def.id as PetModelArchetype) ?? 'buddy_slime'
  const floating =
    category === 'phao' ||
    def.id === 'crystal_owl' ||
    def.id === 'moonlight_firefly' ||
    def.id === 'aurora_cloud_dragon'
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
    animationFrames: { idle: 4, walk: 6, attack: 4 },
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
    attack: number
  }
}

export const MOUNT_MODEL_CANVAS_SIZE = { width: 44, height: 38 } as const

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
    animationFrames: { idle: 4, walk: 6, attack: 4 },
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

