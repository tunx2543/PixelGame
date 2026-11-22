export type SpiritCoreId = 'vitality' | 'fury' | 'tempest' | 'nirvana'

export interface SpiritCoreDef {
  id: SpiritCoreId
  name: string
  englishName: string
  subtitle: string
  color: string
  glowColor: string
  maxLevel: number
  baseGoldCost: number
  goldStep: number
  hpPerLv: number
  mpPerLv: number
  atkPerLv: number
  defPerLv: number
  critPctPerLv: number
  speedPctPerLv: number
  soulCritChancePerLv: number
  soulCritBonusPctPerLv: number
  lifestealPctPerLv: number
}

export interface SpiritAwakeningState {
  cores: Record<SpiritCoreId, number>
  awakeningStage: number
  totalInfusions: number
}

export interface SpiritAwakeningBonuses {
  hpFlat: number
  mpFlat: number
  atkFlat: number
  defFlat: number
  critBonus: number
  speedPct: number
  soulCritChance: number
  soulCritMult: number
  lifestealPct: number
  allStatPct: number
  totalCoreLevels: number
  stage: number
}

export interface SpiritStageSpec {
  stage: number
  title: string
  shortTitle: string
  subtitle: string
  primaryColor: string
  secondaryColor: string
  requiredCoreTotal: number
  requiredRebirth: number
  goldCost: number
  allStatPct: number
  soulCritBonusMult: number
}

export const SPIRIT_CORE_DEFS: readonly SpiritCoreDef[] = [
  {
    id: 'vitality',
    name: 'จิตปฐพี (กายาอมตะ)',
    englishName: 'Terra Core',
    subtitle: 'เสริมพลังชีวิต พลังป้องกัน และความทนทานของจิตวิญญาณ',
    color: '#34d399',
    glowColor: '#10b981',
    maxLevel: 10,
    baseGoldCost: 180,
    goldStep: 140,
    hpPerLv: 48,
    mpPerLv: 10,
    atkPerLv: 1,
    defPerLv: 4,
    critPctPerLv: 0,
    speedPctPerLv: 0,
    soulCritChancePerLv: 0.4,
    soulCritBonusPctPerLv: 2,
    lifestealPctPerLv: 0,
  },
  {
    id: 'fury',
    name: 'จิตอัคคี (เพลิงทลาย)',
    englishName: 'Blaze Core',
    subtitle: 'เพิ่มพลังโจมตีหลักและตัวคูณความเสียหาย จุจิตคริติคอล (Soul Crit)',
    color: '#fb923c',
    glowColor: '#f97316',
    maxLevel: 10,
    baseGoldCost: 220,
    goldStep: 160,
    hpPerLv: 12,
    mpPerLv: 8,
    atkPerLv: 6,
    defPerLv: 1,
    critPctPerLv: 0.5,
    speedPctPerLv: 0,
    soulCritChancePerLv: 0.8,
    soulCritBonusPctPerLv: 6,
    lifestealPctPerLv: 0,
  },
  {
    id: 'tempest',
    name: 'จิตวายุ (สายลมไร้เงา)',
    englishName: 'Zephyr Core',
    subtitle: 'เร่งความเร็วเคลื่อนที่ อัตราคริติคอล และโอกาสปลดปล่อยจิตคริติคอล',
    color: '#38bdf8',
    glowColor: '#0ea5e9',
    maxLevel: 10,
    baseGoldCost: 200,
    goldStep: 150,
    hpPerLv: 10,
    mpPerLv: 14,
    atkPerLv: 3,
    defPerLv: 1,
    critPctPerLv: 1.1,
    speedPctPerLv: 1.5,
    soulCritChancePerLv: 1.2,
    soulCritBonusPctPerLv: 3,
    lifestealPctPerLv: 0,
  },
  {
    id: 'nirvana',
    name: 'จิตสุริยัน (นิรันดร์กาล)',
    englishName: 'Astral Core',
    subtitle: 'ดูดซับพลังชีวิตจากศัตรู ขยายขอบเขตมานาและแก่นพลังจุจิตขั้นสูง',
    color: '#c084fc',
    glowColor: '#a855f7',
    maxLevel: 10,
    baseGoldCost: 260,
    goldStep: 190,
    hpPerLv: 22,
    mpPerLv: 24,
    atkPerLv: 4,
    defPerLv: 2,
    critPctPerLv: 0.6,
    speedPctPerLv: 0.6,
    soulCritChancePerLv: 1.0,
    soulCritBonusPctPerLv: 5,
    lifestealPctPerLv: 0.6,
  },
] as const

export const SPIRIT_STAGE_SPECS: readonly SpiritStageSpec[] = [
  {
    stage: 0,
    title: 'จิตปุถุชน',
    shortTitle: 'ยังไม่จุจิต',
    subtitle: 'หล่อหลอมแก่นจิตวิญญาณครบ 4 ขั้นเพื่อเบิกเนตรจุจิตขั้นแรก',
    primaryColor: '#94a3b8',
    secondaryColor: '#475569',
    requiredCoreTotal: 0,
    requiredRebirth: 0,
    goldCost: 0,
    allStatPct: 0,
    soulCritBonusMult: 0,
  },
  {
    stage: 1,
    title: 'จุจิตขั้น 1 · ปฐมวิญญาณ',
    shortTitle: 'ปฐมวิญญาณ',
    subtitle: 'ปลุกแสงออร่าจิตสีฟ้ามรกต +6% สเตตัสหลัก & +15% Soul Crit',
    primaryColor: '#38bdf8',
    secondaryColor: '#34d399',
    requiredCoreTotal: 4,
    requiredRebirth: 0,
    goldCost: 400,
    allStatPct: 6,
    soulCritBonusMult: 0.15,
  },
  {
    stage: 2,
    title: 'จุจิตขั้น 2 · จิตพยัคฆ์คำราม',
    shortTitle: 'พยัคฆ์คำราม',
    subtitle: 'อักขระเพลิงฟ้าหมุนวนรอบกาย +12% สเตตัสหลัก & +30% Soul Crit',
    primaryColor: '#fbbf24',
    secondaryColor: '#38bdf8',
    requiredCoreTotal: 12,
    requiredRebirth: 0,
    goldCost: 1200,
    allStatPct: 12,
    soulCritBonusMult: 0.3,
  },
  {
    stage: 3,
    title: 'จุจิตขั้น 3 · เนตรอสูรเทวา',
    shortTitle: 'เนตรอสูรเทวา',
    subtitle: 'ดอกบัวแสงวิญญาณ 4 กลีบล้อมตัว +20% สเตตัสหลัก & +50% Soul Crit',
    primaryColor: '#c084fc',
    secondaryColor: '#fb7185',
    requiredCoreTotal: 22,
    requiredRebirth: 1,
    goldCost: 2600,
    allStatPct: 20,
    soulCritBonusMult: 0.5,
  },
  {
    stage: 4,
    title: 'จุจิตขั้น 4 · ราชันย์แห่งจิต',
    shortTitle: 'ราชันย์แห่งจิต',
    subtitle: 'กลีบจักรวาลทองม่วงหมุนประสาน +30% สเตตัสหลัก & +75% Soul Crit',
    primaryColor: '#f472b6',
    secondaryColor: '#fde047',
    requiredCoreTotal: 32,
    requiredRebirth: 2,
    goldCost: 5000,
    allStatPct: 30,
    soulCritBonusMult: 0.75,
  },
  {
    stage: 5,
    title: 'จุจิตขั้น 5 · นิรันดร์สุริยเทพ',
    shortTitle: 'นิรันดร์สุริยเทพ',
    subtitle: 'จุดสูงสุดแห่งการจุติและจุจิต +45% สเตตัสหลัก & +110% Soul Crit',
    primaryColor: '#fde047',
    secondaryColor: '#38bdf8',
    requiredCoreTotal: 40,
    requiredRebirth: 3,
    goldCost: 9000,
    allStatPct: 45,
    soulCritBonusMult: 1.1,
  },
] as const

export function createDefaultSpiritAwakeningState(): SpiritAwakeningState {
  return {
    cores: {
      vitality: 0,
      fury: 0,
      tempest: 0,
      nirvana: 0,
    },
    awakeningStage: 0,
    totalInfusions: 0,
  }
}

export function sanitizeSpiritAwakeningState(raw: unknown): SpiritAwakeningState {
  const def = createDefaultSpiritAwakeningState()
  if (!raw || typeof raw !== 'object') return def
  const obj = raw as Partial<SpiritAwakeningState>
  const rawCores = (obj.cores && typeof obj.cores === 'object' ? obj.cores : {}) as Partial<Record<SpiritCoreId, unknown>>

  const cores: Record<SpiritCoreId, number> = {
    vitality: 0,
    fury: 0,
    tempest: 0,
    nirvana: 0,
  }
  for (const coreDef of SPIRIT_CORE_DEFS) {
    const val = Math.floor(Number(rawCores[coreDef.id] ?? 0) || 0)
    cores[coreDef.id] = Math.max(0, Math.min(coreDef.maxLevel, val))
  }

  return {
    cores,
    awakeningStage: Math.max(0, Math.min(5, Math.floor(Number(obj.awakeningStage ?? 0) || 0))),
    totalInfusions: Math.max(0, Math.floor(Number(obj.totalInfusions ?? 0) || 0)),
  }
}

export function getSpiritCoreDef(coreId: SpiritCoreId): SpiritCoreDef {
  return SPIRIT_CORE_DEFS.find((c) => c.id === coreId) ?? SPIRIT_CORE_DEFS[0]
}

export function getSpiritCoreTotalLevels(state: SpiritAwakeningState): number {
  return (
    state.cores.vitality +
    state.cores.fury +
    state.cores.tempest +
    state.cores.nirvana
  )
}

export function getSpiritStageSpec(stage: number): SpiritStageSpec {
  const idx = Math.max(0, Math.min(SPIRIT_STAGE_SPECS.length - 1, Math.floor(stage)))
  return SPIRIT_STAGE_SPECS[idx]
}

export function getSpiritCoreUpgradeCost(coreId: SpiritCoreId, currentLevel: number): number {
  const def = getSpiritCoreDef(coreId)
  const lv = Math.max(0, Math.min(def.maxLevel, Math.floor(currentLevel)))
  return def.baseGoldCost + lv * def.goldStep
}

export function canUpgradeSpiritCore(
  state: SpiritAwakeningState,
  coreId: SpiritCoreId,
  gold: number,
): { ok: boolean; cost: number; reason?: string } {
  const def = getSpiritCoreDef(coreId)
  const curLv = state.cores[coreId] ?? 0
  if (curLv >= def.maxLevel) {
    return { ok: false, cost: 0, reason: `${def.name} ถึงระดับสูงสุด (Lv.${def.maxLevel}) แล้ว` }
  }
  const cost = getSpiritCoreUpgradeCost(coreId, curLv)
  if (gold < cost) {
    return { ok: false, cost, reason: `ทองไม่พอหล่อหลอม (ต้องการ ${cost.toLocaleString()} G)` }
  }
  return { ok: true, cost }
}

export function upgradeSpiritCoreState(
  state: SpiritAwakeningState,
  coreId: SpiritCoreId,
  gold: number,
): { ok: boolean; nextState: SpiritAwakeningState; nextGold: number; spentGold: number; newLevel: number; message: string } {
  const clean = sanitizeSpiritAwakeningState(state)
  const check = canUpgradeSpiritCore(clean, coreId, gold)
  const def = getSpiritCoreDef(coreId)
  if (!check.ok) {
    return {
      ok: false,
      nextState: clean,
      nextGold: gold,
      spentGold: 0,
      newLevel: clean.cores[coreId],
      message: check.reason ?? 'ไม่สามารถหล่อหลอมแก่นจิตได้',
    }
  }
  const newLevel = clean.cores[coreId] + 1
  return {
    ok: true,
    nextState: {
      ...clean,
      cores: {
        ...clean.cores,
        [coreId]: newLevel,
      },
      totalInfusions: clean.totalInfusions + 1,
    },
    nextGold: gold - check.cost,
    spentGold: check.cost,
    newLevel,
    message: `หล่อหลอม ${def.name} สำเร็จ -> Lv.${newLevel}!`,
  }
}

export function canAdvanceSpiritStage(
  state: SpiritAwakeningState,
  rebirthCount: number,
  gold: number,
): { ok: boolean; nextSpec: SpiritStageSpec | null; reason?: string } {
  const clean = sanitizeSpiritAwakeningState(state)
  if (clean.awakeningStage >= SPIRIT_STAGE_SPECS.length - 1) {
    return { ok: false, nextSpec: null, reason: 'บรรลุขั้นจุติจิตระดับสูงสุดแล้ว!' }
  }
  const nextSpec = getSpiritStageSpec(clean.awakeningStage + 1)
  const totalCores = getSpiritCoreTotalLevels(clean)
  if (totalCores < nextSpec.requiredCoreTotal) {
    return {
      ok: false,
      nextSpec,
      reason: `ต้องมีระดับแก่นจิตรวม ${nextSpec.requiredCoreTotal} (ปัจจุบัน ${totalCores}/${nextSpec.requiredCoreTotal})`,
    }
  }
  if (rebirthCount < nextSpec.requiredRebirth) {
    return {
      ok: false,
      nextSpec,
      reason: `ต้องผ่านการจุติอย่างน้อย ${nextSpec.requiredRebirth} ครั้ง (ปัจจุบัน ${rebirthCount}/${nextSpec.requiredRebirth})`,
    }
  }
  if (gold < nextSpec.goldCost) {
    return {
      ok: false,
      nextSpec,
      reason: `ต้องการทอง ${nextSpec.goldCost.toLocaleString()} G สำหรับพิธีเบิกจิต`,
    }
  }
  return { ok: true, nextSpec }
}

export function advanceSpiritStageState(
  state: SpiritAwakeningState,
  rebirthCount: number,
  gold: number,
): { ok: boolean; nextState: SpiritAwakeningState; nextGold: number; spentGold: number; stage: number; message: string } {
  const clean = sanitizeSpiritAwakeningState(state)
  const check = canAdvanceSpiritStage(clean, rebirthCount, gold)
  if (!check.ok || !check.nextSpec) {
    return {
      ok: false,
      nextState: clean,
      nextGold: gold,
      spentGold: 0,
      stage: clean.awakeningStage,
      message: check.reason ?? 'ยังไม่ผ่านเงื่อนไขเบิกจิตขั้นถัดไป',
    }
  }
  return {
    ok: true,
    nextState: {
      ...clean,
      awakeningStage: check.nextSpec.stage,
      totalInfusions: clean.totalInfusions + 1,
    },
    nextGold: gold - check.nextSpec.goldCost,
    spentGold: check.nextSpec.goldCost,
    stage: check.nextSpec.stage,
    message: `เบิกจิตสำเร็จ! บรรลุ "${check.nextSpec.title}"`,
  }
}

export function computeSpiritAwakeningBonuses(rawState: unknown): SpiritAwakeningBonuses {
  const state = sanitizeSpiritAwakeningState(rawState)
  const stageSpec = getSpiritStageSpec(state.awakeningStage)
  let hpFlat = 0
  let mpFlat = 0
  let atkFlat = 0
  let defFlat = 0
  let critPct = 0
  let speedPct = 0
  let soulCritChancePct = 0
  let soulCritBonusPct = 0
  let lifestealPct = 0

  for (const def of SPIRIT_CORE_DEFS) {
    const lv = state.cores[def.id] ?? 0
    if (lv <= 0) continue
    hpFlat += def.hpPerLv * lv
    mpFlat += def.mpPerLv * lv
    atkFlat += def.atkPerLv * lv
    defFlat += def.defPerLv * lv
    critPct += def.critPctPerLv * lv
    speedPct += def.speedPctPerLv * lv
    soulCritChancePct += def.soulCritChancePerLv * lv
    soulCritBonusPct += def.soulCritBonusPctPerLv * lv
    lifestealPct += def.lifestealPctPerLv * lv
  }

  return {
    hpFlat,
    mpFlat,
    atkFlat,
    defFlat,
    critBonus: Math.min(0.28, critPct / 100),
    speedPct,
    soulCritChance: Math.min(0.45, soulCritChancePct / 100),
    soulCritMult: 2.0 + soulCritBonusPct / 100 + stageSpec.soulCritBonusMult,
    lifestealPct: Math.round(lifestealPct * 10) / 10,
    allStatPct: stageSpec.allStatPct,
    totalCoreLevels: getSpiritCoreTotalLevels(state),
    stage: state.awakeningStage,
  }
}
