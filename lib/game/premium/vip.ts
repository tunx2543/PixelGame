import type { VipState, VipTierDef, VipTierId } from './types'

export const VIP_EXP_BONUS_CAP_PCT = 25
export const VIP_EXTRA_INVENTORY_CAP = 30
export const VIP_EXTRA_STORAGE_CAP = 60

export const VIP_TIERS: VipTierDef[] = [
  {
    level: 1,
    code: 'BRONZE',
    name: 'VIP 1 — Bronze',
    badgeLabel: 'VIP 1',
    badgeColor: '#f59e0b',
    badgeBg: 'rgba(180, 83, 9, 0.25)',
    badgeBorder: 'rgba(245, 158, 11, 0.55)',
    expRequired: 0,
    expBonusPct: 5,
    extraInventorySlots: 5,
    extraStorageSlots: 10,
    exclusiveFashionIds: ['hair_bronze_crest'],
    dailyReward: {
      gold: 500,
      diamonds: 10,
      enhanceStones: 2,
      petEssence: 1,
      label: '500 G · 10 เพชร · หินตีบวก x2 · ผลึกคู่หู x1',
    },
    tierReward: {
      gold: 2000,
      diamonds: 50,
      enhanceStones: 5,
      fashionId: 'hair_bronze_crest',
      label: '2,000 G · 50 เพชร · หิน x5 · ทรงผม Bronze Crest',
    },
    benefits: [
      'บริการ VIP ระยะไกล: เปิดร้านค้า, ตีบวกอุปกรณ์ และฝาก-ถอนคลังได้ทุกแผนที่',
      'ตราสัญลักษณ์ VIP 1 Bronze บนโปรไฟล์และชื่อตัวละคร',
      'โบนัส EXP ในเกม +5% (ภายในเพดานรวม +25%)',
      'เพิ่มช่องกระเป๋า +5 ช่อง และช่องคลังเก็บของ +10 ช่อง',
      'สิทธิ์รับของรางวัล VIP ประจำวัน + ทรงผม Bronze Crest',
    ],
  },
  {
    level: 2,
    code: 'SILVER',
    name: 'VIP 2 — Silver',
    badgeLabel: 'VIP 2',
    badgeColor: '#e2e8f0',
    badgeBg: 'rgba(100, 116, 139, 0.28)',
    badgeBorder: 'rgba(226, 232, 240, 0.55)',
    expRequired: 300,
    expBonusPct: 10,
    extraInventorySlots: 10,
    extraStorageSlots: 20,
    exclusiveFashionIds: ['hair_bronze_crest', 'aura_silver_mist'],
    dailyReward: {
      gold: 1000,
      diamonds: 20,
      enhanceStones: 3,
      petEssence: 2,
      label: '1,000 G · 20 เพชร · หินตีบวก x3 · ผลึกคู่หู x2',
    },
    tierReward: {
      gold: 4500,
      diamonds: 120,
      enhanceStones: 8,
      fashionId: 'aura_silver_mist',
      label: '4,500 G · 120 เพชร · หิน x8 · ออร่าหมอกเงิน',
    },
    benefits: [
      'บริการ VIP ระยะไกล: ร้านค้า, ตีบวกอุปกรณ์ และคลังเก็บของทุกแผนที่',
      'ตราสัญลักษณ์ VIP 2 Silver บนโปรไฟล์และชื่อตัวละคร',
      'โบนัส EXP ในเกม +10% (ภายในเพดานรวม +25%)',
      'เพิ่มช่องกระเป๋า +10 ช่อง และช่องคลังเก็บของ +20 ช่อง',
      'ปลดล็อกออร่าพิเศษ Silver Mist + รางวัลรายวันเพิ่มเท่าตัว',
    ],
  },
  {
    level: 3,
    code: 'GOLD',
    name: 'VIP 3 — Gold',
    badgeLabel: 'VIP 3',
    badgeColor: '#fde047',
    badgeBg: 'rgba(202, 138, 4, 0.28)',
    badgeBorder: 'rgba(253, 224, 71, 0.65)',
    expRequired: 900,
    expBonusPct: 15,
    extraInventorySlots: 15,
    extraStorageSlots: 30,
    exclusiveFashionIds: ['hair_bronze_crest', 'aura_silver_mist', 'costume_vip_gold_regalia'],
    dailyReward: {
      gold: 1800,
      diamonds: 35,
      enhanceStones: 5,
      petEssence: 3,
      label: '1,800 G · 35 เพชร · หินตีบวก x5 · ผลึกคู่หู x3',
    },
    tierReward: {
      gold: 9000,
      diamonds: 250,
      enhanceStones: 12,
      fashionId: 'costume_vip_gold_regalia',
      label: '9,000 G · 250 เพชร · หิน x12 · ชุดคลุมราชันย์ทองคำ',
    },
    benefits: [
      'บริการ VIP ระยะไกล: ร้านค้า, ตีบวกอุปกรณ์ และคลังเก็บของทุกแผนที่',
      'ตราสัญลักษณ์ VIP 3 Gold ประกายทองบนโปรไฟล์',
      'โบนัส EXP ในเกม +15% (ภายในเพดานรวม +25%)',
      'เพิ่มช่องกระเป๋า +15 ช่อง และช่องคลังเก็บของ +30 ช่อง',
      'ปลดล็อกชุดแฟชั่นเฉพาะสมาชิก Gold Regalia',
    ],
  },
  {
    level: 4,
    code: 'PLATINUM',
    name: 'VIP 4 — Platinum',
    badgeLabel: 'VIP 4',
    badgeColor: '#67e8f9',
    badgeBg: 'rgba(8, 145, 178, 0.28)',
    badgeBorder: 'rgba(103, 232, 249, 0.65)',
    expRequired: 2200,
    expBonusPct: 20,
    extraInventorySlots: 20,
    extraStorageSlots: 45,
    exclusiveFashionIds: [
      'hair_bronze_crest',
      'aura_silver_mist',
      'costume_vip_gold_regalia',
    ],
    dailyReward: {
      gold: 3000,
      diamonds: 55,
      enhanceStones: 7,
      petEssence: 4,
      label: '3,000 G · 55 เพชร · หินตีบวก x7 · ผลึกคู่หู x4',
    },
    tierReward: {
      gold: 16000,
      diamonds: 450,
      enhanceStones: 18,
      label: '16,000 G · 450 เพชร · หิน x18',
    },
    benefits: [
      'บริการ VIP ระยะไกล: ร้านค้า, ตีบวกอุปกรณ์ และคลังเก็บของทุกแผนที่',
      'ตราสัญลักษณ์ VIP 4 Platinum เรืองแสงสีฟ้าคริสตัล',
      'โบนัส EXP ในเกม +20% (ภายในเพดานรวม +25%)',
      'เพิ่มช่องกระเป๋า +20 ช่อง และช่องคลังเก็บของ +45 ช่อง',
      'รางวัลเลื่อนขั้น 16,000 G · 450 เพชร · หินตีบวก x18 + รางวัลรายวันเพิ่มระดับ',
    ],
  },
  {
    level: 5,
    code: 'DIAMOND',
    name: 'VIP 5 — Diamond',
    badgeLabel: 'VIP 5',
    badgeColor: '#f0abfc',
    badgeBg: 'rgba(147, 51, 234, 0.30)',
    badgeBorder: 'rgba(240, 171, 252, 0.72)',
    expRequired: 5000,
    expBonusPct: 25,
    extraInventorySlots: 30,
    extraStorageSlots: 60,
    exclusiveFashionIds: [
      'hair_bronze_crest',
      'aura_silver_mist',
      'costume_vip_gold_regalia',
      'mount_skin_diamond_royal',
    ],
    dailyReward: {
      gold: 5000,
      diamonds: 90,
      enhanceStones: 10,
      petEssence: 6,
      label: '5,000 G · 90 เพชร · หินตีบวก x10 · ผลึกคู่หู x6',
    },
    tierReward: {
      gold: 30000,
      diamonds: 800,
      enhanceStones: 28,
      fashionId: 'mount_skin_diamond_royal',
      label: '30,000 G · 800 เพชร · หิน x28 · สกินสัตว์ขี่ Diamond Royal',
    },
    benefits: [
      'บริการ VIP ระยะไกล: ร้านค้า, ตีบวกอุปกรณ์ และคลังเก็บของทุกแผนที่',
      'ตราสัญลักษณ์ VIP 5 Diamond สูงสุดบนโปรไฟล์และหัวตัวละคร',
      'โบนัส EXP ในเกมสูงสุด +25% (เต็มเพดานสมดุล)',
      'เพิ่มช่องกระเป๋า +30 ช่อง และช่องคลังเก็บของ +60 ช่อง',
      'ปลดล็อกสกินสัตว์ขี่ Diamond Royal + รางวัลรายวันสูงสุด',
    ],
  },
]

export function createDefaultVipState(): VipState {
  return {
    vipLevel: 0,
    vipExp: 0,
    expiresAtMs: null,
    claimedTierRewards: [],
    lastDailyClaimDate: null,
  }
}

export function resolveVipLevelFromExp(vipExp: number): VipTierId {
  const safeExp = Math.max(0, Math.floor(vipExp || 0))
  let tier: VipTierId = 1
  for (const def of VIP_TIERS) {
    if (safeExp >= def.expRequired) {
      tier = def.level
    }
  }
  return tier
}

export function isVipActive(vip: VipState | undefined, nowMs = Date.now()): boolean {
  if (!vip) return false
  if (vip.vipLevel < 1) return false
  return typeof vip.expiresAtMs === 'number' && Number.isFinite(vip.expiresAtMs) && vip.expiresAtMs > nowMs
}

export function getVipTierDef(level: VipTierId | number): VipTierDef | null {
  return VIP_TIERS.find((t) => t.level === level) ?? null
}

export function getEffectiveVipBonuses(vip: VipState | undefined, nowMs = Date.now()) {
  if (!vip || !isVipActive(vip, nowMs)) {
    return {
      active: false,
      level: 0 as VipTierId,
      tierDef: null as VipTierDef | null,
      expBonusPct: 0,
      expMul: 1,
      extraInventorySlots: 0,
      extraStorageSlots: 0,
      remainingMs: 0,
      remainingDays: 0,
      exclusiveFashionIds: [] as string[],
    }
  }
  const tierDef = getVipTierDef(vip.vipLevel)
  if (!tierDef) {
    return {
      active: false,
      level: 0 as VipTierId,
      tierDef: null as VipTierDef | null,
      expBonusPct: 0,
      expMul: 1,
      extraInventorySlots: 0,
      extraStorageSlots: 0,
      remainingMs: 0,
      remainingDays: 0,
      exclusiveFashionIds: [] as string[],
    }
  }
  const expBonusPct = Math.min(VIP_EXP_BONUS_CAP_PCT, Math.max(0, tierDef.expBonusPct))
  const extraInventorySlots = Math.min(VIP_EXTRA_INVENTORY_CAP, Math.max(0, tierDef.extraInventorySlots))
  const extraStorageSlots = Math.min(VIP_EXTRA_STORAGE_CAP, Math.max(0, tierDef.extraStorageSlots))
  const remainingMs = Math.max(0, (vip.expiresAtMs ?? 0) - nowMs)

  return {
    active: true,
    level: tierDef.level,
    tierDef,
    expBonusPct,
    expMul: 1 + expBonusPct / 100,
    extraInventorySlots,
    extraStorageSlots,
    remainingMs,
    remainingDays: Math.ceil(remainingMs / (24 * 60 * 60 * 1000)),
    exclusiveFashionIds: tierDef.exclusiveFashionIds,
  }
}

export function sanitizeVipState(raw: unknown): VipState {
  const def = createDefaultVipState()
  if (!raw || typeof raw !== 'object') return def
  const obj = raw as Partial<VipState>
  const vipExp = Math.max(0, Math.min(1_000_000, Math.floor(Number(obj.vipExp ?? 0) || 0)))
  const rawLevel = Math.max(0, Math.min(5, Math.floor(Number(obj.vipLevel ?? 0) || 0))) as VipTierId
  const expiresAtMs =
    typeof obj.expiresAtMs === 'number' && Number.isFinite(obj.expiresAtMs) && obj.expiresAtMs > 0
      ? Math.floor(obj.expiresAtMs)
      : null
  const computedLevel = expiresAtMs ? Math.max(rawLevel, resolveVipLevelFromExp(vipExp)) as VipTierId : rawLevel
  const claimedTierRewards = Array.isArray(obj.claimedTierRewards)
    ? [...new Set(obj.claimedTierRewards.filter((n): n is number => typeof n === 'number' && n >= 1 && n <= 5))]
    : []
  const lastDailyClaimDate =
    typeof obj.lastDailyClaimDate === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(obj.lastDailyClaimDate)
      ? obj.lastDailyClaimDate
      : null

  return {
    vipLevel: computedLevel,
    vipExp,
    expiresAtMs,
    claimedTierRewards,
    lastDailyClaimDate,
  }
}

export function formatVipRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return 'หมดอายุ'
  const totalHours = Math.floor(remainingMs / (60 * 60 * 1000))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days > 0) return `${days} วัน ${hours} ชม.`
  const mins = Math.max(1, Math.floor((remainingMs % (60 * 60 * 1000)) / 60000))
  return `${hours} ชม. ${mins} นาที`
}
