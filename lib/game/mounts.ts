export type MountArchetype = 'warhorse' | 'direwolf' | 'griffin' | 'kirin' | 'cloud_dragon'

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
    name: 'อาชาทุ่งหญ้า',
    rarity: 'ทั่วไป',
    archetype: 'warhorse',
    description: 'ม้าศึกแกร่งคู่ใจนักเดินทาง วิ่งคล่องบนทุกเส้นทางและช่วยรับแรงกระแทก',
    unlockGold: 1500,
    speedBonusPct: 25,
    hpBonus: 45,
    atkBonus: 6,
    defBonus: 8,
    seatOffsetY: -6,
    flying: false,
    colors: {
      primary: '#b56537',
      secondary: '#5c3317',
      accent: '#ffd60a',
      saddle: '#9b2226',
    },
  },
  {
    id: 'frost_wolf',
    name: 'หมาป่าหิมะพเนจร',
    rarity: 'หายาก',
    archetype: 'direwolf',
    description: 'หมาป่าแดนเหนือขนสีเงินคราม พุ่งทะยานว่องไวพร้อมเขี้ยวคมกล้า',
    unlockGold: 6500,
    speedBonusPct: 35,
    hpBonus: 105,
    atkBonus: 18,
    defBonus: 14,
    seatOffsetY: -6,
    flying: false,
    auraColor: '#67e8f9',
    colors: {
      primary: '#94a3b8',
      secondary: '#334155',
      accent: '#67e8f9',
      saddle: '#1d4ed8',
    },
  },
  {
    id: 'royal_griffin',
    name: 'กริฟฟินราชันย์',
    rarity: 'อีปิก',
    archetype: 'griffin',
    description: 'พญากริฟฟินครึ่งอินทรีครึ่งราชสีห์ กระพือปีกทองคำโผทะยานเหนือพื้นพิภพ',
    unlockGold: 18000,
    speedBonusPct: 45,
    hpBonus: 190,
    atkBonus: 34,
    defBonus: 24,
    seatOffsetY: -8,
    flying: true,
    auraColor: '#fde047',
    colors: {
      primary: '#eab308',
      secondary: '#78350f',
      accent: '#fef08a',
      saddle: '#7c2d12',
    },
  },
  {
    id: 'starlight_kirin',
    name: 'กิเลนแสงดารา',
    rarity: 'ตำนาน',
    archetype: 'kirin',
    description: 'สัตว์เทพกิเลนเขาดารา ย่างก้าวกลางอากาศด้วยประกายดวงดาวนิรันดร์',
    unlockGold: 38000,
    speedBonusPct: 55,
    hpBonus: 300,
    atkBonus: 54,
    defBonus: 38,
    seatOffsetY: -8,
    flying: true,
    auraColor: '#c084fc',
    colors: {
      primary: '#a855f7',
      secondary: '#3b0764',
      accent: '#38bdf8',
      saddle: '#f59e0b',
    },
  },
  {
    id: 'aurora_cloud_dragon',
    name: 'มังกรเมฆาออโรรา',
    rarity: 'มายา',
    archetype: 'cloud_dragon',
    description: 'มังกรเมฆาแห่งแสงเหนือผู้ยิ่งใหญ่ โผบินเคียงข้างสายลมแห่งจักรวาล',
    linkedGemItemId: 'aurora_cloud_dragon',
    speedBonusPct: 65,
    hpBonus: 380,
    atkBonus: 70,
    defBonus: 48,
    seatOffsetY: -9,
    flying: true,
    auraColor: '#5eead4',
    colors: {
      primary: '#5eead4',
      secondary: '#3730a3',
      accent: '#f0abfc',
      saddle: '#f4d35e',
    },
  },
]

export function getMountDef(mountId: string | null | undefined): MountDef | null {
  if (!mountId) return null
  return MOUNT_DEFS.find((m) => m.id === mountId) ?? null
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
      if (!getMountDef(id)) continue
      const level = Math.max(1, Math.min(MAX_MOUNT_LEVEL, Math.floor(Number(entry?.level ?? 1) || 1)))
      ownedMounts[id] = { level }
    }
  }

  for (const gemId of ownedGemItems) {
    const linked = MOUNT_DEFS.find((m) => m.linkedGemItemId === gemId)
    if (linked && !ownedMounts[linked.id]) {
      ownedMounts[linked.id] = { level: 1 }
    }
  }

  const activeMountId =
    typeof obj.activeMountId === 'string' && ownedMounts[obj.activeMountId] ? obj.activeMountId : null
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
  if (!next.ownedMounts[mountId]) return next
  return {
    ...next,
    activeMountId: mountId,
    mounted: autoMount ? true : next.mounted,
  }
}

export function summonMountState(
  rawState: MountState | undefined,
  mountId: string,
  ownedGemItems: string[] = [],
): MountState {
  const next = sanitizeMountState(rawState, ownedGemItems)
  if (!next.ownedMounts[mountId]) return next
  return {
    ...next,
    activeMountId: mountId,
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
  meadow_pony: { down: [0, -10.5], side: [-2, -10], up: [0, -10.5], clip: 0.19 },
  frost_wolf: { down: [0, -10], side: [-2.5, -9.5], up: [0, -10], clip: 0.2 },
  royal_griffin: { down: [0, -12.5], side: [-2, -12], up: [0, -12.5], clip: 0.21 },
  starlight_kirin: { down: [0, -12.5], side: [-2, -12], up: [0, -12.5], clip: 0.21 },
  aurora_cloud_dragon: { down: [0, -13.5], side: [-2.5, -13], up: [0, -13.5], clip: 0.22 },
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
  const cfg = (mountId && MOUNT_SEAT_BASE[mountId]) || MOUNT_SEAT_BASE.meadow_pony
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

