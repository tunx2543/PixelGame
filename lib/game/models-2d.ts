import { JOBS, MONSTERS, type JobDef, type MonsterDef, type MonsterSprite, type WeaponType } from './data'

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

export type ArmorStyle =
  | 'tunic'
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
  | 'pink_slime'
  | 'mushroom'
  | 'rabbit'
  | 'wolf'
  | 'goblin'
  | 'goblin_chief'
  | 'bat'
  | 'skeleton'
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
    armorStyle: 'tunic',
    hairStyle: 'spiky',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'stick',
    hatColor: '#c9b27c',
    scarfColor: '#e9c46a',
    backpack: true,
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, attack: 4 },
  },
  swordsman: {
    jobId: 'swordsman',
    name: JOBS.swordsman.name,
    tier: 1,
    hatStyle: 'bandana',
    armorStyle: 'brigandine',
    hairStyle: 'spiky',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'sword',
    hatColor: '#e63946',
    scarfColor: '#d62828',
    shieldColor: '#8d99ae',
    shieldCrestColor: '#e9c46a',
    shoulderPads: true,
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, attack: 4 },
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
    hatColor: '#5b3f8c',
    capeColor: '#3a2a5c',
    auraColor: '#c77dff',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, attack: 4 },
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
    hatColor: '#3f7d4e',
    capeColor: '#2d6a4f',
    scarfColor: '#e9c46a',
    quiver: true,
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, attack: 4 },
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
    hatColor: '#b23a48',
    scarfColor: '#e63946',
    capeColor: '#262633',
    dualDaggers: true,
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, attack: 4 },
  },
  knight: {
    jobId: 'knight',
    name: JOBS.knight.name,
    tier: 2,
    hatStyle: 'helm',
    armorStyle: 'plate',
    hairStyle: 'parted',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'sword',
    hatColor: '#9aa5b1',
    capeColor: '#e63946',
    shieldColor: '#cbd5e1',
    shieldCrestColor: '#e63946',
    shoulderPads: true,
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, attack: 4 },
  },
  paladin: {
    jobId: 'paladin',
    name: JOBS.paladin.name,
    tier: 2,
    hatStyle: 'paladin_helm',
    armorStyle: 'paladin_plate',
    hairStyle: 'royal',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'sword',
    hatColor: '#e2e8f0',
    capeColor: '#2563eb',
    shieldColor: '#fef08a',
    shieldCrestColor: '#3a86ff',
    shoulderPads: true,
    halo: true,
    auraColor: '#fde047',
    wingStyle: 'angel',
    animationFrames: { idle: 4, walk: 6, attack: 4 },
  },
  wizard: {
    jobId: 'wizard',
    name: JOBS.wizard.name,
    tier: 2,
    hatStyle: 'archmage',
    armorStyle: 'arch_robe',
    hairStyle: 'long',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'staff',
    hatColor: '#1d3557',
    capeColor: '#457b9d',
    shoulderPads: true,
    auraColor: '#67e8f9',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, attack: 4 },
  },
  cleric: {
    jobId: 'cleric',
    name: JOBS.cleric.name,
    tier: 2,
    hatStyle: 'mitre',
    armorStyle: 'vestment',
    hairStyle: 'braid',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'staff',
    hatColor: '#f8fafc',
    capeColor: '#f4d35e',
    halo: true,
    wings: true,
    wingStyle: 'angel',
    auraColor: '#bef264',
    animationFrames: { idle: 4, walk: 6, attack: 4 },
  },
  hunter: {
    jobId: 'hunter',
    name: JOBS.hunter.name,
    tier: 2,
    hatStyle: 'ranger_hood',
    armorStyle: 'leather',
    hairStyle: 'ponytail',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'bow',
    hatColor: '#1b4332',
    capeColor: '#40916c',
    scarfColor: '#ffb703',
    shoulderPads: true,
    quiver: true,
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, attack: 4 },
  },
  assassin: {
    jobId: 'assassin',
    name: JOBS.assassin.name,
    tier: 2,
    hatStyle: 'cowl',
    armorStyle: 'shadow',
    hairStyle: 'swept',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'dagger',
    hatColor: '#1b1b2f',
    capeColor: '#5a189a',
    scarfColor: '#e63946',
    shoulderPads: true,
    dualDaggers: true,
    auraColor: '#9d4edd',
    wingStyle: 'none',
    animationFrames: { idle: 4, walk: 6, attack: 4 },
  },
  gm: {
    jobId: 'gm',
    name: JOBS.gm.name,
    tier: 2,
    hatStyle: 'crown',
    armorStyle: 'sovereign',
    hairStyle: 'royal',
    canvasSize: { ...HUMAN_MODEL_CANVAS_SIZE },
    weapon: 'staff',
    hatColor: '#ffd60a',
    capeColor: '#b5179e',
    shoulderPads: true,
    halo: true,
    wings: true,
    wingStyle: 'seraph',
    auraColor: '#ffd60a',
    animationFrames: { idle: 4, walk: 6, attack: 4 },
  },
}

const ARCHETYPE_BY_ID: Record<string, MonsterModelArchetype> = {
  slime: 'slime',
  pink_slime: 'pink_slime',
  mushroom: 'mushroom',
  rabbit: 'rabbit',
  wolf: 'wolf',
  goblin: 'goblin',
  goblin_chief: 'goblin_chief',
  bat: 'bat',
  skeleton: 'skeleton',
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
  skeleton: 'skeleton',
  ghost: 'ghost',
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
    archetype === 'abyss_dragon' ||
    archetype === 'gale_sentinel'
  const supports4Way =
    archetype === 'goblin' ||
    archetype === 'goblin_chief' ||
    archetype === 'skeleton' ||
    archetype === 'abyss_knight' ||
    archetype === 'gale_sentinel' ||
    archetype === 'demon' ||
    archetype === 'demon_lord'

  const canvasSize =
    archetype === 'abyss_dragon'
      ? { width: 42, height: 34 }
      : archetype === 'demon_lord' || archetype === 'earth_golem' || archetype === 'goblin_chief'
        ? { width: 34, height: 32 }
        : archetype === 'abyss_knight' || archetype === 'gale_sentinel' || archetype === 'fire_golem'
          ? { width: 32, height: 30 }
          : archetype === 'wolf'
            ? { width: 30, height: 24 }
            : { width: 28, height: 26 }

  const accentColor =
    archetype === 'pink_slime'
      ? '#ffd6e0'
      : archetype === 'goblin_chief'
        ? '#ffd60a'
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
