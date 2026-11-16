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
