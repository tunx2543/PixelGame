import {
  ITEMS,
  JOBS,
  MAX_LEVEL,
  MONSTERS,
  expToNext,
  normalizeJobId,
  type ItemDef,
  type MonsterDef,
} from './data'
import { executeEnhanceOnSave, type EnhanceOutcome } from './enhance-logic'
import {
  INV_SIZE,
  SAVE_KEY,
  getInventoryCapacity,
  getStats,
  itemPower,
  type InvItem,
  type SaveData,
} from './engine'
import { MAPS, TILE } from './maps'
import { saveUserCharacter } from '@/lib/firebase/characters'
import {
  createDefaultPetState,
  createDefaultQuestState,
  createDefaultTowerState,
  getActivePetBonuses,
  grantActivePetExp,
  recordQuestProgress,
  sanitizePetState,
} from './systems'
import {
  createDefaultRpgExt,
  getAttackElement,
  getElementMultiplier,
  getMonsterElement,
  recordBestiaryKillInState,
  type ElementType,
} from './rpg-systems'
import { computeLevelGapModifiers, type LevelGapTier } from './combat-balance'

export type EncounterRarity = 'normal' | 'elite' | 'boss'

export type EncounterBiome = 'meadow' | 'forest' | 'cave' | 'volcano'

export interface EncounterEnemy {
  uid: string
  def: MonsterDef
  rarity: EncounterRarity
  effectiveLevel: number
  hp: number
  maxHp: number
  atk: number
  defStat: number
  expReward: number
  goldRange: [number, number]
  attackInterval: number
  biome: EncounterBiome
}

export interface CombatDamageBreakdown {
  damage: number
  isCrit: boolean
  critMultiplier: number
  critChance: number
  baseCharacterAtk: number
  weaponBaseAtk: number
  weaponPlus: number
  weaponUpgradeBonus: number
  weaponTotalPower: number
  jobAtkMultiplier: number
  totalAtk: number
  skillMultiplier: number
  enemyDef: number
  attackerElement: ElementType
  defenderElement: ElementType
  elementalMultiplier: number
  elementalEffectiveness: 'super' | 'resist' | 'normal'
  label: string
  isMiss?: boolean
  levelDiff?: number
  levelGapTier?: LevelGapTier
}

export interface EncounterDropReward {
  itemId: string
  name: string
  qty: number
  color: string
  icon: string
}

export interface EncounterVictoryResult {
  nextSave: SaveData
  goldEarned: number
  expEarned: number
  leveledUpFrom: number
  leveledUpTo: number
  drops: EncounterDropReward[]
  overflowDrops: EncounterDropReward[]
}

export interface WeaponEnhanceAttemptResult {
  nextSave: SaveData
  outcome: EnhanceOutcome
  message: string
  newPlus: number
}

function makeUid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1))
}

export function monsterBiomeFor(def: MonsterDef): EncounterBiome {
  if (def.level <= 8) return 'meadow'
  if (def.level <= 19) return 'forest'
  if (def.level <= 34) return 'cave'
  return 'volcano'
}

export function createDefaultEncounterSave(name = 'นักผจญภัย'): SaveData {
  const town = MAPS.town
  const base: SaveData = {
    version: 1,
    name: name.trim().slice(0, 16) || 'นักผจญภัย',
    jobId: 'novice',
    level: 1,
    exp: 0,
    hp: 1,
    mp: 1,
    gold: 300,
    diamonds: 0,
    ownedGemItems: [],
    equippedGemFashion: null,
    equippedGemCompanion: null,
    lootMagnetUntil: 0,
    inventoryCapacityBonus: 0,
    inventory: [
      { uid: makeUid(), itemId: 'red_potion', qty: 15, plus: 0 },
      { uid: makeUid(), itemId: 'blue_potion', qty: 5, plus: 0 },
      { uid: makeUid(), itemId: 'enhance_stone', qty: 2, plus: 0 },
    ],
    storage: [],
    storageGold: 0,
    equipment: {
      weapon: { uid: makeUid(), itemId: 'wooden_stick', qty: 1, plus: 0 },
      armor: { uid: makeUid(), itemId: 'cloth_armor', qty: 1, plus: 0 },
      shoes: null,
      cloak: null,
      accessory: null,
    },
    mapId: 'town',
    x: (town.spawn.x + 0.5) * TILE,
    y: (town.spawn.y + 0.5) * TILE,
    gm: false,
    god: false,
    invisible: false,
    speed: 1,
    playTime: 0,
    kills: 0,
    savedAt: Date.now(),
    statPoints: 0,
    skillPoints: 0,
    skillLevels: {},
    petState: createDefaultPetState(),
    questState: createDefaultQuestState(0),
    towerState: createDefaultTowerState(),
    rpgExt: createDefaultRpgExt(),
  }
  const s = getStats(base)
  base.hp = s.maxHp
  base.mp = s.maxMp
  return base
}

export function encounterSaveStorageKey(userId: string | null, slotId: string): string {
  if (!userId) return SAVE_KEY
  return slotId === 'slot_1' ? `${SAVE_KEY}:user:${userId}` : `${SAVE_KEY}:user:${userId}:${slotId}`
}

export async function persistEncounterSave(
  save: SaveData,
  slotId: string,
  userId: string | null,
): Promise<void> {
  const stamped: SaveData = { ...save, savedAt: Date.now() }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(encounterSaveStorageKey(userId, slotId), JSON.stringify(stamped))
    } catch {
      // Ignore storage quota issues.
    }
  }
  if (userId) {
    await saveUserCharacter(userId, slotId, stamped)
  }
}

/**
 * Selects a level-matched monster pool around `playerLevel` and rolls
 * Normal, rare Elite, or rare Boss Ambush rarity.
 */
export function rollEncounterForLevel(
  playerLevel: number,
  options?: { forcedRarity?: EncounterRarity },
): EncounterEnemy {
  const level = Math.max(1, Math.min(MAX_LEVEL, Math.floor(playerLevel)))
  const allMonsters = Object.values(MONSTERS)
  const normalPoolAll = allMonsters.filter((m) => !m.boss)
  const bossPoolAll = allMonsters.filter((m) => Boolean(m.boss))

  let rarity: EncounterRarity = options?.forcedRarity ?? 'normal'
  if (!options?.forcedRarity) {
    const roll = Math.random()
    if (level >= 10 && roll < 0.11) {
      rarity = 'boss'
    } else if (roll < 0.34) {
      rarity = 'elite'
    }
  }

  let candidate: MonsterDef
  if (rarity === 'boss') {
    let bosses = bossPoolAll.filter((m) => m.level >= level - 10 && m.level <= level + 14)
    if (bosses.length === 0) {
      bosses = [...bossPoolAll].sort(
        (a, b) => Math.abs(a.level - level) - Math.abs(b.level - level),
      )
      bosses = bosses.slice(0, 2)
    }
    candidate = bosses[randInt(0, bosses.length - 1)]
  } else {
    let band = 5
    let pool: MonsterDef[] = []
    while (pool.length === 0 && band <= 70) {
      pool = normalPoolAll.filter((m) => m.level >= level - band && m.level <= level + band + 2)
      band += 4
    }
    if (pool.length === 0) pool = normalPoolAll

    // Prefer closest monsters by weighting inverse distance to playerLevel
    const weighted = pool.flatMap((m) => {
      const dist = Math.abs(m.level - level)
      const weight = dist <= 2 ? 4 : dist <= 5 ? 2 : 1
      return Array.from({ length: weight }, () => m)
    })
    candidate = weighted[randInt(0, weighted.length - 1)]
  }

  // Softly adapt level when player is far from candidate's nominal level
  const levelGap = level - candidate.level
  const effectiveLevel =
    rarity === 'boss'
      ? Math.max(candidate.level, Math.min(MAX_LEVEL, level + 2))
      : rarity === 'elite'
        ? Math.max(1, Math.min(MAX_LEVEL, Math.max(candidate.level, level) + 2))
        : Math.max(1, Math.min(MAX_LEVEL, Math.round(candidate.level + levelGap * 0.35)))

  const levelRatio = Math.max(0.75, Math.min(2.2, effectiveLevel / Math.max(1, candidate.level)))
  const rarityHpMul = rarity === 'boss' ? 1.15 : rarity === 'elite' ? 1.65 : 1
  const rarityAtkMul = rarity === 'boss' ? 1.1 : rarity === 'elite' ? 1.28 : 1
  const rarityDefMul = rarity === 'boss' ? 1.05 : rarity === 'elite' ? 1.18 : 1
  const rarityRewardMul = rarity === 'boss' ? 1.35 : rarity === 'elite' ? 2.2 : 1

  const maxHp = Math.max(20, Math.round(candidate.hp * levelRatio * rarityHpMul))
  const atk = Math.max(4, Math.round(candidate.atk * Math.pow(levelRatio, 0.85) * rarityAtkMul))
  const defStat = Math.max(1, Math.round(candidate.def * Math.pow(levelRatio, 0.85) * rarityDefMul))
  const expReward = Math.max(8, Math.round(candidate.exp * levelRatio * rarityRewardMul))
  const goldMin = Math.max(2, Math.round(candidate.gold[0] * levelRatio * rarityRewardMul))
  const goldMax = Math.max(goldMin + 2, Math.round(candidate.gold[1] * levelRatio * rarityRewardMul))

  const attackInterval = rarity === 'boss' ? 1.85 : rarity === 'elite' ? 1.55 : Math.max(1.25, 2.0 - candidate.speed * 0.01)

  return {
    uid: makeUid(),
    def: candidate,
    rarity,
    effectiveLevel,
    hp: maxHp,
    maxHp,
    atk,
    defStat,
    expReward,
    goldRange: [goldMin, goldMax],
    attackInterval,
    biome: monsterBiomeFor(candidate),
  }
}

export function getWeaponUpgradeBreakdown(save: SaveData) {
  const job = JOBS[normalizeJobId(save.jobId)]
  const weaponItem = save.equipment.weapon
  const weaponDef: ItemDef | null = weaponItem ? ITEMS[weaponItem.itemId] ?? null : null
  const weaponBaseAtk = weaponDef?.atk ?? 0
  const weaponPlus = weaponItem?.plus ?? 0
  const weaponTotalPower = itemPower(weaponItem)
  const weaponUpgradeBonus = Math.max(0, weaponTotalPower - weaponBaseAtk)
  const baseCharacterAtk = Math.floor(8 + save.level * 2.6)
  const stats = getStats(save)

  return {
    job,
    weaponItem,
    weaponDef,
    weaponBaseAtk,
    weaponPlus,
    weaponUpgradeBonus,
    weaponTotalPower,
    baseCharacterAtk,
    totalAtk: stats.atk,
    critChance: Math.min(0.75, stats.crit + weaponPlus * 0.005),
  }
}

const dmgFormula = (atk: number, def: number) => (atk * atk) / Math.max(1, atk + def)

export function calculatePlayerAttack(
  save: SaveData,
  enemy: EncounterEnemy,
  skillMultiplier = 1,
  label = 'โจมตีปกติ',
  skillId?: string | null,
): CombatDamageBreakdown {
  const breakdown = getWeaponUpgradeBreakdown(save)
  const gmStaff = save.equipment.weapon?.itemId === 'gm_golden_staff' && save.gm
  const variance = rand(0.92, 1.08)
  const attackerElement = getAttackElement(skillId, save.rpgExt?.equippedRunes)
  const defenderElement = getMonsterElement(enemy.def.id)
  const elemMatch = getElementMultiplier(attackerElement, defenderElement)
  const gap = computeLevelGapModifiers(save.level, enemy.effectiveLevel, {
    isBoss: enemy.rarity === 'boss',
    isGmStaff: gmStaff,
  })
  const isMiss = !gmStaff && gap.missChance > 0 && Math.random() < gap.missChance
  const rawMitigated = gmStaff
    ? 9999999
    : dmgFormula(breakdown.totalAtk * skillMultiplier, enemy.defStat) *
      elemMatch.multiplier *
      gap.damageMul *
      variance
  const isCrit = !gmStaff && !isMiss && Math.random() < breakdown.critChance
  const critMultiplier = isCrit ? 1.65 + breakdown.weaponPlus * 0.02 : 1
  const damage = isMiss ? 0 : Math.max(gap.minDamageFloor, Math.round(rawMitigated * critMultiplier))

  return {
    damage,
    isCrit,
    critMultiplier,
    critChance: breakdown.critChance,
    baseCharacterAtk: breakdown.baseCharacterAtk,
    weaponBaseAtk: breakdown.weaponBaseAtk,
    weaponPlus: breakdown.weaponPlus,
    weaponUpgradeBonus: breakdown.weaponUpgradeBonus,
    weaponTotalPower: breakdown.weaponTotalPower,
    jobAtkMultiplier: breakdown.job.atkMul,
    totalAtk: breakdown.totalAtk,
    skillMultiplier,
    enemyDef: enemy.defStat,
    attackerElement,
    defenderElement,
    elementalMultiplier: elemMatch.multiplier,
    elementalEffectiveness: elemMatch.effectiveness,
    label,
    isMiss,
    levelDiff: gap.levelDiff,
    levelGapTier: gap.tier,
  }
}

export function calculateEnemyAttack(enemy: EncounterEnemy, save: SaveData): number {
  if (save.god) return 0
  const stats = getStats(save)
  const gap = computeLevelGapModifiers(save.level, enemy.effectiveLevel, {
    isBoss: enemy.rarity === 'boss',
  })
  const raw = dmgFormula(enemy.atk * 1.35, stats.def) * gap.incomingMul * rand(0.88, 1.12)
  return Math.max(1, Math.round(raw))
}

function addItemToSave(save: SaveData, itemId: string, qty = 1, plus = 0): boolean {
  const def = ITEMS[itemId]
  if (!def || qty <= 0) return false
  const cap = getInventoryCapacity(save) || INV_SIZE
  const isStackable = def.kind === 'consumable' || def.kind === 'material'

  if (isStackable) {
    const existing = save.inventory.find((entry) => entry.itemId === itemId)
    if (existing) {
      existing.qty += qty
      return true
    }
    if (save.inventory.length >= cap) return false
    save.inventory.push({ uid: makeUid(), itemId, qty, plus: 0 })
    return true
  }

  for (let i = 0; i < qty; i++) {
    if (save.inventory.length >= cap) return false
    save.inventory.push({ uid: makeUid(), itemId, qty: 1, plus })
  }
  return true
}

export function settleEncounterVictory(
  save: SaveData,
  enemy: EncounterEnemy,
  serverRates?: { expMultiplier?: number; dropMultiplier?: number },
): EncounterVictoryResult {
  const nextSave: SaveData = structuredClone(save)
  const petBonus = getActivePetBonuses(nextSave.petState, nextSave.equippedGemCompanion, nextSave.ownedGemItems)
  const expRate = Math.max(1, Number(serverRates?.expMultiplier ?? 1) || 1)
  const dropRate = Math.max(1, Number(serverRates?.dropMultiplier ?? 1) || 1)
  const baseGold = randInt(enemy.goldRange[0], enemy.goldRange[1])
  const goldEarned = Math.round(baseGold * (petBonus?.goldMul ?? 1))
  const expEarned = Math.round(enemy.expReward * (petBonus?.expMul ?? 1) * expRate)
  const leveledUpFrom = nextSave.level

  nextSave.gold += goldEarned
  nextSave.kills = (nextSave.kills ?? 0) + 1
  nextSave.questState = recordQuestProgress(
    nextSave.questState,
    { kills: 1, bossKills: enemy.rarity !== 'normal' ? 1 : 0 },
    nextSave.kills,
  )
  nextSave.rpgExt = recordBestiaryKillInState(nextSave.rpgExt, enemy.def.id, nextSave)
  const sanitizedPets = sanitizePetState(nextSave.petState, nextSave.ownedGemItems, nextSave.equippedGemCompanion)
  nextSave.petState = grantActivePetExp(sanitizedPets, Math.max(5, Math.round(expEarned * 0.25))).nextPetState

  if (nextSave.level < MAX_LEVEL) {
    nextSave.exp += expEarned
    while (nextSave.level < MAX_LEVEL && nextSave.exp >= expToNext(nextSave.level)) {
      nextSave.exp -= expToNext(nextSave.level)
      nextSave.level += 1
      nextSave.statPoints = (nextSave.statPoints ?? 0) + 3
      nextSave.skillPoints = (nextSave.skillPoints ?? 0) + 1
      nextSave.skillLevels ??= {}
      const job = JOBS[normalizeJobId(nextSave.jobId)]
      const autoSkill = job.skills[(nextSave.level - 1) % Math.max(1, job.skills.length)]
      if (autoSkill) {
        nextSave.skillLevels[autoSkill.id] = (nextSave.skillLevels[autoSkill.id] ?? 1) + 1
      }
    }
    if (nextSave.level >= MAX_LEVEL) nextSave.exp = 0
  }

  const leveledUpTo = nextSave.level
  if (leveledUpTo > leveledUpFrom) {
    const freshStats = getStats(nextSave)
    nextSave.hp = freshStats.maxHp
    nextSave.mp = freshStats.maxMp
  }

  const drops: EncounterDropReward[] = []
  const overflowDrops: EncounterDropReward[] = []

  const bonusDrops: Array<{ itemId: string; chance: number }> = [...enemy.def.drops]
  if (enemy.rarity === 'elite') {
    bonusDrops.push({ itemId: 'enhance_stone', chance: 0.35 })
  } else if (enemy.rarity === 'boss') {
    bonusDrops.push({ itemId: 'enhance_stone', chance: 0.9 })
  }

  const rolled = new Set<string>()
  for (const drop of bonusDrops) {
    if (rolled.has(drop.itemId)) continue
    rolled.add(drop.itemId)
    const def = ITEMS[drop.itemId]
    if (!def) continue
    const baseBonusChance = enemy.rarity === 'elite' ? Math.min(1, drop.chance * 1.45) : drop.chance
    const effectiveChance = Math.min(1, baseBonusChance * dropRate)
    if (Math.random() < effectiveChance) {
      const reward: EncounterDropReward = {
        itemId: def.id,
        name: def.name,
        qty: 1,
        color: def.color,
        icon: def.icon,
      }
      if (addItemToSave(nextSave, def.id, 1, 0)) {
        drops.push(reward)
      } else {
        overflowDrops.push(reward)
      }
    }
  }

  return {
    nextSave,
    goldEarned,
    expEarned,
    leveledUpFrom,
    leveledUpTo,
    drops,
    overflowDrops,
  }
}

export function recoverFromDefeat(save: SaveData): SaveData {
  const nextSave: SaveData = structuredClone(save)
  const stats = getStats(nextSave)
  nextSave.hp = Math.max(1, Math.floor(stats.maxHp * 0.5))
  nextSave.mp = Math.max(0, Math.floor(stats.maxMp * 0.5))
  return nextSave
}

export function equipWeaponFromInventory(
  save: SaveData,
  itemUid: string,
): { nextSave: SaveData; error: string | null } {
  const nextSave: SaveData = structuredClone(save)
  const target = nextSave.inventory.find((i) => i.uid === itemUid)
  if (!target) return { nextSave: save, error: 'ไม่พบอาวุธในกระเป๋า' }
  const def = ITEMS[target.itemId]
  const job = JOBS[normalizeJobId(nextSave.jobId)]
  if (!def || def.kind !== 'weapon') return { nextSave: save, error: 'ไอเทมนี้ไม่ใช่อาวุธ' }
  if ((def.reqLevel ?? 1) > nextSave.level) {
    return { nextSave: save, error: `ต้องการเลเวล ${def.reqLevel}` }
  }
  if (def.weaponType && !job.weaponTypes.includes(def.weaponType)) {
    return { nextSave: save, error: `อาชีพ ${job.name} ใช้อาวุธประเภทนี้ไม่ได้` }
  }

  nextSave.inventory = nextSave.inventory.filter((i) => i.uid !== itemUid)
  if (nextSave.equipment.weapon) {
    nextSave.inventory.push(nextSave.equipment.weapon)
  }
  nextSave.equipment.weapon = target
  return { nextSave, error: null }
}

export function useRecoveryPotion(
  save: SaveData,
  kind: 'hp' | 'mp',
): { nextSave: SaveData; restored: number; itemName: string | null; error: string | null } {
  const nextSave: SaveData = structuredClone(save)
  const stats = getStats(nextSave)
  if (kind === 'hp' && nextSave.hp >= stats.maxHp) {
    return { nextSave: save, restored: 0, itemName: null, error: 'HP เต็มแล้ว' }
  }
  if (kind === 'mp' && nextSave.mp >= stats.maxMp) {
    return { nextSave: save, restored: 0, itemName: null, error: 'MP เต็มแล้ว' }
  }

  const candidates = nextSave.inventory
    .map((entry, idx) => ({ entry, idx, def: ITEMS[entry.itemId] }))
    .filter((x) =>
      x.def?.kind === 'consumable' && (kind === 'hp' ? (x.def.heal ?? 0) > 0 : (x.def.mana ?? 0) > 0),
    )
    .sort((a, b) =>
      kind === 'hp'
        ? (a.def.heal ?? 0) - (b.def.heal ?? 0)
        : (a.def.mana ?? 0) - (b.def.mana ?? 0),
    )

  const chosen = candidates[0]
  if (!chosen) {
    return {
      nextSave: save,
      restored: 0,
      itemName: null,
      error: kind === 'hp' ? 'ไม่มียาฟื้นฟู HP ในกระเป๋า' : 'ไม่มียาฟื้นฟู MP ในกระเป๋า',
    }
  }

  const before = kind === 'hp' ? nextSave.hp : nextSave.mp
  if (kind === 'hp') {
    nextSave.hp = Math.min(stats.maxHp, nextSave.hp + (chosen.def.heal ?? 0))
  } else {
    nextSave.mp = Math.min(stats.maxMp, nextSave.mp + (chosen.def.mana ?? 0))
  }
  const restored = (kind === 'hp' ? nextSave.hp : nextSave.mp) - before

  chosen.entry.qty -= 1
  if (chosen.entry.qty <= 0) {
    nextSave.inventory.splice(chosen.idx, 1)
  }

  return { nextSave, restored, itemName: chosen.def.name, error: null }
}

export function enhanceEquippedWeapon(
  save: SaveData,
  options?: { protectScrollId?: string | null; rng?: () => number },
): WeaponEnhanceAttemptResult {
  const nextSave: SaveData = structuredClone(save)
  const weapon = nextSave.equipment.weapon
  if (!weapon) {
    return { nextSave: save, outcome: 'error', message: 'กรุณาสวมใส่อาวุธก่อนตีบวก', newPlus: 0 }
  }

  const res = executeEnhanceOnSave(nextSave, weapon.uid, {
    protectScrollId: options?.protectScrollId,
    rng: options?.rng,
  })
  if (res.result === 'error') {
    return { nextSave: save, outcome: 'error', message: res.message, newPlus: weapon.plus }
  }

  nextSave.questState = recordQuestProgress(nextSave.questState, { enhances: 1 }, nextSave.kills)
  return {
    nextSave,
    outcome: res.result,
    message: res.message,
    newPlus: res.newPlus ?? 0,
  }
}
