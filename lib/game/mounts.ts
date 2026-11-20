export type MountArchetype =
  | 'horse'
  | 'wolf'
  | 'chocobo'
  | 'dragon'
  | 'elephant'
  | 'cat'
  | 'dog'
  | 'turtle'
  | 'panda'

export interface MountDef {
  id: string
  name: string
  rarity: 'ทั่วไป' | 'หายาก' | 'อีปิก' | 'ตำนาน' | 'มายา'
  archetype: MountArchetype
  description: string
  unlockGold?: number
  linkedGemItemId?: string
  speedBonusPct: number
  hpBonus: number
  atkBonus: number
  defBonus: number
  seatOffsetY: number
  flying: boolean
  auraColor?: string
  colors: {
    primary: string
    secondary: string
    accent: string
    saddle: string
  }
}

export interface MountProgress {
  level: number
}

export interface MountState {
  activeMountId: string | null
  mounted: boolean
  ownedMounts: Record<string, MountProgress>
}

export interface ActiveMountBonuses {
  mountId: string
  def: MountDef
  level: number
  mounted: boolean
  speedMul: number
  speedBonusPct: number
  hpBonus: number
  atkBonus: number
  defBonus: number
}

export const MAX_MOUNT_LEVEL = 10

export const MOUNT_DEFS: MountDef[] = [
  {
    id: 'meadow_pony',
    name: 'อาชาทุ่งหญ้า (Horse)',
    rarity: 'ทั่วไป',
    archetype: 'horse',
    description: 'ม้าศึกแกร่งขนน้ำตาลอานหนังคู่ใจนักเดินทาง วิ่งคล่องบนทุกเส้นทาง',
    unlockGold: 1500,
    speedBonusPct: 25,
    hpBonus: 45,
    atkBonus: 6,
    defBonus: 8,
    seatOffsetY: -6,
    flying: false,
    colors: {
      primary: '#9c522b',
      secondary: '#4a2511',
      accent: '#f5c451',
      saddle: '#7c431f',
    },
  },
  {
    id: 'dog',
    name: 'ชิบะคู่ใจ (Dog)',
    rarity: 'ทั่วไป',
    archetype: 'dog',
    description: 'สุนัขชิบะแสนซื่อสัตย์ผูกผ้าพันคอมรกต วิ่งฉับไวและคอยคุ้มกันเจ้านาย',
    unlockGold: 2200,
    speedBonusPct: 28,
    hpBonus: 60,
    atkBonus: 10,
    defBonus: 10,
    seatOffsetY: -4,
    flying: false,
    colors: {
      primary: '#d97724',
      secondary: '#fef3c7',
      accent: '#15803d',
      saddle: '#854d0e',
    },
  },
  {
    id: 'cat',
    name: 'เหมียวขนฟู (Cat)',
    rarity: 'ทั่วไป',
    archetype: 'cat',
    description: 'แมวขนปุยสีเทา-ขาวผูกผ้าพันคอแดง ก้าวย่างปราดเปรียวคล่องตัว',
    unlockGold: 3200,
    speedBonusPct: 32,
    hpBonus: 75,
    atkBonus: 14,
    defBonus: 11,
    seatOffsetY: -4,
    flying: false,
    colors: {
      primary: '#e2e8f0',
      secondary: '#94a3b8',
      accent: '#dc2626',
      saddle: '#7f1d1d',
    },
  },
  {
    id: 'turtle',
    name: 'เต่าศิลาพิทักษ์ (Turtle)',
    rarity: 'หายาก',
    archetype: 'turtle',
    description: 'เต่ายักษ์กระดองแกร่งบรรทุกอานน้ำเงิน ป้องกันสูงเป็นเลิศและเดินมั่นคง',
    unlockGold: 4800,
    speedBonusPct: 30,
    hpBonus: 150,
    atkBonus: 12,
    defBonus: 26,
    seatOffsetY: -5,
    flying: false,
    auraColor: '#4ade80',
    colors: {
      primary: '#4ade80',
      secondary: '#6b4226',
      accent: '#2563eb',
      saddle: '#1d4ed8',
    },
  },
  {
    id: 'frost_wolf',
    name: 'หมาป่าเงิน (Wolf)',
    rarity: 'หายาก',
    archetype: 'wolf',
    description: 'หมาป่าขนเงินผูกผ้าพันคอคราม พุ่งทะยานว่องไวพร้อมเขี้ยวคมกล้า',
    unlockGold: 6500,
    speedBonusPct: 38,
    hpBonus: 115,
    atkBonus: 22,
    defBonus: 15,
    seatOffsetY: -6,
    flying: false,
    auraColor: '#67e8f9',
    colors: {
      primary: '#cbd5e1',
      secondary: '#475569',
      accent: '#2563eb',
      saddle: '#7c431f',
    },
  },
  {
    id: 'panda',
    name: 'แพนด้าต้นกล้า (Panda)',
    rarity: 'อีปิก',
    archetype: 'panda',
    description: 'แพนด้ายักษ์ใจดีพร้อมกระเป๋าอานและใบไม้มงคล เสริมพลังชีวิตและเกราะป้องกัน',
    unlockGold: 11000,
    speedBonusPct: 42,
    hpBonus: 200,
    atkBonus: 28,
    defBonus: 24,
    seatOffsetY: -6,
    flying: false,
    auraColor: '#4ade80',
    colors: {
      primary: '#f8fafc',
      secondary: '#1e293b',
      accent: '#22c55e',
      saddle: '#7c431f',
    },
  },
  {
    id: 'chocobo',
    name: 'โจโคโบะ (Chocobo)',
    rarity: 'อีปิก',
    archetype: 'chocobo',
    description: 'วิหคโจโคโบะขนสีทองอร่ามอานน้ำเงิน วิ่งโฉบเฉี่ยวไวเหนือใคร',
    unlockGold: 18000,
    speedBonusPct: 50,
    hpBonus: 190,
    atkBonus: 36,
    defBonus: 22,
    seatOffsetY: -7,
    flying: false,
    auraColor: '#fde047',
    colors: {
      primary: '#f59e0b',
      secondary: '#b45309',
      accent: '#2563eb',
      saddle: '#1d4ed8',
    },
  },
  {
    id: 'elephant',
    name: 'ช้างศึกอัญมณี (Elephant)',
    rarity: 'ตำนาน',
    archetype: 'elephant',
    description: 'พญาช้างศึกทรงเครื่องพรมทองน้ำเงิน ร่างมหึมาพลังชีวิตและเกราะแกร่งมหาศาล',
    unlockGold: 28000,
    speedBonusPct: 52,
    hpBonus: 340,
    atkBonus: 48,
    defBonus: 44,
    seatOffsetY: -9,
    flying: false,
    auraColor: '#facc15',
    colors: {
      primary: '#94a3b8',
      secondary: '#475569',
      accent: '#fbbf24',
      saddle: '#1e40af',
    },
  },
  {
    id: 'aurora_cloud_dragon',
    name: 'มังกรแดงชาด (Dragon)',
    rarity: 'มายา',
    archetype: 'dragon',
    description: 'มังกรเพลิงเกล็ดชาดสยายปีกกว้าง ผู้พิชิตน่านฟ้าและสมรภูมิระดับตำนาน',
    linkedGemItemId: 'aurora_cloud_dragon',
    speedBonusPct: 65,
    hpBonus: 380,
    atkBonus: 70,
    defBonus: 48,
    seatOffsetY: -9,
    flying: true,
    auraColor: '#fb7185',
    colors: {
      primary: '#dc2626',
      secondary: '#7f1d1d',
      accent: '#fde047',
      saddle: '#7c431f',
    },
  },
]

const LEGACY_MOUNT_ALIASES: Record<string, string> = {
  horse: 'meadow_pony',
  wolf: 'frost_wolf',
  dragon: 'aurora_cloud_dragon',
  royal_griffin: 'chocobo',
  starlight_kirin: 'elephant',
}

export function resolveMountId(mountId: string | null | undefined): string | null {
  if (!mountId) return null
  const mapped = LEGACY_MOUNT_ALIASES[mountId] ?? mountId
  return MOUNT_DEFS.some((m) => m.id === mapped) ? mapped : null
}

export function getMountDef(mountId: string | null | undefined): MountDef | null {
  const resolved = resolveMountId(mountId)
  if (!resolved) return null
  return MOUNT_DEFS.find((m) => m.id === resolved) ?? null
}

export function mountUpgradeCost(currentLevel: number): number {
  const lv = Math.max(1, Math.min(MAX_MOUNT_LEVEL, Math.floor(currentLevel || 1)))
  return 450 * lv * lv
}

export function createDefaultMountState(ownedGemItems: string[] = []): MountState {
  const ownedMounts: Record<string, MountProgress> = {}
  for (const gemId of ownedGemItems) {
    const linked = MOUNT_DEFS.find((m) => m.linkedGemItemId === gemId)
    if (linked) {
      ownedMounts[linked.id] = { level: 1 }
    }
  }
  const activeMountId = Object.keys(ownedMounts)[0] ?? null
  return {
    activeMountId,
    mounted: Boolean(activeMountId),
    ownedMounts,
  }
}

export function sanitizeMountState(raw: unknown, ownedGemItems: string[] = []): MountState {
  const obj = raw && typeof raw === 'object' ? (raw as Partial<MountState>) : {}
  const ownedMounts: Record<string, MountProgress> = {}

  if (obj.ownedMounts && typeof obj.ownedMounts === 'object') {
    for (const [id, entry] of Object.entries(obj.ownedMounts)) {
      const resolvedId = resolveMountId(id)
      if (!resolvedId) continue
      const level = Math.max(1, Math.min(MAX_MOUNT_LEVEL, Math.floor(Number(entry?.level ?? 1) || 1)))
      const prev = ownedMounts[resolvedId]
      ownedMounts[resolvedId] = { level: prev ? Math.max(prev.level, level) : level }
    }
  }

  for (const gemId of ownedGemItems) {
    const linked = MOUNT_DEFS.find((m) => m.linkedGemItemId === gemId)
    if (linked && !ownedMounts[linked.id]) {
      ownedMounts[linked.id] = { level: 1 }
    }
  }

  const resolvedActive = resolveMountId(typeof obj.activeMountId === 'string' ? obj.activeMountId : null)
  const activeMountId = resolvedActive && ownedMounts[resolvedActive] ? resolvedActive : null
  const mounted = Boolean(activeMountId && obj.mounted)

  return {
    activeMountId,
    mounted,
    ownedMounts,
  }
}

export function getActiveMountBonuses(
  mountState: MountState | undefined,
  ownedGemItems: string[] = [],
): ActiveMountBonuses | null {
  const state = sanitizeMountState(mountState, ownedGemItems)
  if (!state.activeMountId) return null
  const def = getMountDef(state.activeMountId)
  const progress = state.ownedMounts[state.activeMountId]
  if (!def || !progress) return null

  const lv = progress.level
  const lvScale = 1 + (lv - 1) * 0.16
  const totalSpeedPct = def.speedBonusPct + (lv - 1) * 3

  return {
    mountId: state.activeMountId,
    def,
    level: lv,
    mounted: state.mounted,
    speedBonusPct: totalSpeedPct,
    speedMul: state.mounted ? 1 + totalSpeedPct / 100 : 1,
    hpBonus: Math.round(def.hpBonus * lvScale),
    atkBonus: Math.round(def.atkBonus * lvScale),
    defBonus: Math.round(def.defBonus * lvScale),
  }
}

export type MountVisualTier = 1 | 2 | 3 | 4 | 5
export type MountDir = 'down' | 'up' | 'left' | 'right'
export type MountAnimAction = 'idle' | 'walk' | 'run' | 'mount' | 'dismount' | 'attack'
export type MountTransitionPhase = 'none' | 'mounting' | 'dismounting'

export const MOUNT_ANIM_FRAME_COUNTS: Record<MountAnimAction, number> = {
  idle: 4,
  walk: 6,
  run: 6,
  mount: 4,
  dismount: 4,
  attack: 4,
}

export const MOUNT_TRANSITION_DURATION = {
  mount: 0.42,
  dismount: 0.36,
} as const

export const MOUNT_RUN_HOLD_SEC = 0.28

export function getMountVisualTier(level: number): MountVisualTier {
  const lv = Math.max(1, Math.min(MAX_MOUNT_LEVEL, Math.floor(level || 1)))
  if (lv >= 9) return 5
  if (lv >= 7) return 4
  if (lv >= 5) return 3
  if (lv >= 3) return 2
  return 1
}

export function getMountVisualTierLabel(level: number): string {
  switch (getMountVisualTier(level)) {
    case 5:
      return 'ขั้น 5 มงกุฎเทพดารา (Lv.9-10)'
    case 4:
      return 'ขั้น 4 อาร์เคนเรืองแสง (Lv.7-8)'
    case 3:
      return 'ขั้น 3 เกราะทองคำ (Lv.5-6)'
    case 2:
      return 'ขั้น 2 เกราะเงิน (Lv.3-4)'
    default:
      return 'ขั้น 1 พื้นฐาน (Lv.1-2)'
  }
}

export function selectMountState(
  rawState: MountState | undefined,
  mountId: string,
  ownedGemItems: string[] = [],
  autoMount = false,
): MountState {
  const next = sanitizeMountState(rawState, ownedGemItems)
  const resolved = resolveMountId(mountId)
  if (!resolved || !next.ownedMounts[resolved]) return next
  return {
    ...next,
    activeMountId: resolved,
    mounted: autoMount ? true : next.mounted,
  }
}

export function summonMountState(
  rawState: MountState | undefined,
  mountId: string,
  ownedGemItems: string[] = [],
): MountState {
  const next = sanitizeMountState(rawState, ownedGemItems)
  const resolved = resolveMountId(mountId)
  if (!resolved || !next.ownedMounts[resolved]) return next
  return {
    ...next,
    activeMountId: resolved,
    mounted: false,
  }
}

export function storeMountState(
  rawState: MountState | undefined,
  ownedGemItems: string[] = [],
): MountState {
  const next = sanitizeMountState(rawState, ownedGemItems)
  return {
    ...next,
    activeMountId: null,
    mounted: false,
  }
}

export function setMountRidingState(
  rawState: MountState | undefined,
  mounted: boolean,
  ownedGemItems: string[] = [],
): MountState {
  const next = sanitizeMountState(rawState, ownedGemItems)
  let targetId = next.activeMountId
  if (!targetId && mounted) {
    targetId = Object.keys(next.ownedMounts)[0] ?? null
  }
  if (!targetId || !next.ownedMounts[targetId]) {
    return { ...next, activeMountId: null, mounted: false }
  }
  return {
    ...next,
    activeMountId: targetId,
    mounted,
  }
}

export interface MountSeatPlacement {
  /** Horizontal offset in world units from mount anchor center */
  x: number
  /** Vertical offset in world units from mount anchor ground Y */
  y: number
  /** Fraction of character height at feet clipped behind saddle rim/flank when seated */
  legClipRatio: number
}

const MOUNT_SEAT_BASE: Record<string, { down: [number, number]; side: [number, number]; up: [number, number]; clip: number }> = {
  meadow_pony: { down: [0, -14.0], side: [-1.4, -14.0], up: [0, -14.0], clip: 0.2 },
  frost_wolf: { down: [0, -13.0], side: [-2.2, -13.0], up: [0, -13.0], clip: 0.2 },
  chocobo: { down: [0, -13.0], side: [-2.0, -13.0], up: [0, -13.0], clip: 0.2 },
  aurora_cloud_dragon: { down: [0, -12.0], side: [-1.2, -12.0], up: [0, -12.0], clip: 0.21 },
  elephant: { down: [0, -18.5], side: [-4.0, -18.5], up: [0, -18.5], clip: 0.22 },
  cat: { down: [0, -8.5], side: [-2.2, -8.5], up: [0, -8.5], clip: 0.18 },
  dog: { down: [0, -9.5], side: [-2.8, -9.5], up: [0, -9.5], clip: 0.19 },
  turtle: { down: [0, -11.0], side: [-2.8, -11.0], up: [0, -11.0], clip: 0.19 },
  panda: { down: [0, -13.5], side: [-4.2, -13.5], up: [0, -13.5], clip: 0.21 },
}

export function getMountAnimFrameBobY(action: MountAnimAction, frame: number): number {
  const f = Math.abs(Math.floor(frame))
  if (action === 'walk') {
    return [-0.6, -1.2, -0.3, 0.4, -0.8, -0.2][f % 6]
  }
  if (action === 'run') {
    return [-1.4, -2.0, -0.6, 0.6, -1.5, -0.5][f % 6]
  }
  if (action === 'mount') {
    return [1.4, 2.2, 0.5, -0.6][f % 4]
  }
  if (action === 'dismount') {
    return [-0.4, 1.5, 2.0, 0.4][f % 4]
  }
  if (action === 'attack') {
    return [-0.6, -2.2, -1.6, 0][f % 4]
  }
  return [0, -0.7, -0.9, -0.3][f % 4]
}

export function getMountRiderSeatOffset(
  mountId: string | null | undefined,
  dir: MountDir,
  action: MountAnimAction,
  frame: number,
): MountSeatPlacement {
  const resolved = resolveMountId(mountId)
  const cfg = (resolved && MOUNT_SEAT_BASE[resolved]) || MOUNT_SEAT_BASE.meadow_pony
  const base = dir === 'down' ? cfg.down : dir === 'up' ? cfg.up : cfg.side
  const sign = dir === 'left' ? -1 : 1
  const leanX = action === 'run' ? (dir === 'right' ? 1.2 : dir === 'left' ? -1.2 : 0) : 0
  return {
    x: base[0] * sign + leanX,
    y: base[1] + getMountAnimFrameBobY(action, frame),
    legClipRatio: cfg.clip,
  }
}

export function resolveMountAnimationState(params: {
  mounted: boolean
  flying: boolean
  moving: boolean
  moveHoldT: number
  walkOnly?: boolean
  attacking: boolean
  attackFrame: number
  transition: MountTransitionPhase
  animRemaining: number
  animMax: number
  walkT: number
  timeSec: number
}): {
  action: MountAnimAction
  frame: number
  transitionProgress: number
  mountHoverY: number
  riderArcX: number
  riderArcY: number
} {
  const {
    mounted,
    flying,
    moving,
    moveHoldT,
    walkOnly = false,
    attacking,
    attackFrame,
    transition,
    animRemaining,
    animMax,
    walkT,
    timeSec,
  } = params

  const hoverWave = flying ? Math.round((Math.sin(timeSec * 4.2) * 1.4 - 2.2) * 10) / 10 : 0

  if (transition === 'mounting' && animRemaining > 0) {
    const prog = Math.max(0, Math.min(1, 1 - animRemaining / Math.max(0.05, animMax)))
    const frame = Math.min(3, Math.floor(prog * 4))
    const arc = -Math.sin(prog * Math.PI) * 9.5
    const xSlide = (1 - prog) * -10
    return {
      action: 'mount',
      frame,
      transitionProgress: prog,
      mountHoverY: hoverWave * prog,
      riderArcX: xSlide,
      riderArcY: (1 - prog) * 10 + arc,
    }
  }

  if (transition === 'dismounting' && animRemaining > 0) {
    const prog = Math.max(0, Math.min(1, 1 - animRemaining / Math.max(0.05, animMax)))
    const frame = Math.min(3, Math.floor(prog * 4))
    const arc = -Math.sin(prog * Math.PI) * 8.5
    return {
      action: 'dismount',
      frame,
      transitionProgress: prog,
      mountHoverY: hoverWave * (1 - prog),
      riderArcX: -prog * 11,
      riderArcY: arc,
    }
  }

  if (attacking) {
    return {
      action: 'attack',
      frame: Math.abs(attackFrame) % 4,
      transitionProgress: 1,
      mountHoverY: mounted ? hoverWave : 0,
      riderArcX: 0,
      riderArcY: 0,
    }
  }

  if (moving) {
    const isRun = mounted && !walkOnly && moveHoldT >= MOUNT_RUN_HOLD_SEC
    const action: MountAnimAction = isRun ? 'run' : 'walk'
    const fps = isRun ? 13 : 9.5
    return {
      action,
      frame: Math.floor(walkT * fps) % 6,
      transitionProgress: 1,
      mountHoverY: mounted ? hoverWave : flying ? hoverWave * 0.65 : 0,
      riderArcX: 0,
      riderArcY: 0,
    }
  }

  return {
    action: 'idle',
    frame: Math.floor(timeSec * 2.8) % 4,
    transitionProgress: 1,
    mountHoverY: mounted ? hoverWave : flying ? hoverWave * 0.65 : 0,
    riderArcX: 0,
    riderArcY: 0,
  }
}

