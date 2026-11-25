import type { TopupOrderRecord } from './topup'

export type DiamondTxType = 'earn' | 'spend' | 'sandbox_grant' | 'refund'

export interface DiamondTransaction {
  txId: string
  requestId: string
  characterId: string
  type: DiamondTxType
  source: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  productId?: string
  itemId?: string
  note: string
  createdAtMs: number
  actorUid: string
  isGm: boolean
  serverVerified: boolean
  serverSignature?: string
}

export interface DiamondWallet {
  characterId: string
  diamondBalance: number
  totalEarned: number
  totalSpent: number
  transactionHistory: DiamondTransaction[]
  processedRequestIds: string[]
}

export type PremiumCategory =
  | 'diamond-items'
  | 'fashion'
  | 'costume'
  | 'pet'
  | 'mount'
  | 'storage-expansion'
  | 'consumables'
  | 'special-collection'

export type PremiumRarity = 'ทั่วไป' | 'หายาก' | 'อีปิก' | 'ตำนาน' | 'มายา'

export type PremiumRewardKind =
  | 'item'
  | 'gem_fashion'
  | 'gem_companion'
  | 'fashion'
  | 'pet'
  | 'mount'
  | 'vip_pass'
  | 'vip_exp'
  | 'bag_expansion'
  | 'storage_expansion'
  | 'bundle'

export interface PremiumProduct {
  productId: string
  itemId: string
  name: string
  description: string
  icon: string
  diamondPrice: number
  category: PremiumCategory
  rarity: PremiumRarity
  /** Remaining global/seasonal stock; null means unlimited */
  stock: number | null
  /** Maximum times a single character can buy this product; null means unlimited */
  purchaseLimit: number | null
  enabled: boolean
  /** Expiration timestamp in ms; null means permanent */
  expiration: number | null
  rewardKind: PremiumRewardKind
  /** Optional quantity granted per purchase */
  qty?: number
  /** Optional minimum VIP tier required */
  vipRequired?: VipTierId
  /** Optional VIP EXP granted upon purchase */
  vipExpGrant?: number
  /** Extra metadata depending on rewardKind */
  payload?: {
    vipDays?: number
    vipTierFloor?: VipTierId
    vipExp?: number
    bagSlots?: number
    storageSlots?: number
    fashionId?: string
    petId?: string
    mountId?: string
    bundleItems?: Array<{ itemId: string; qty: number }>
    bundleBonusDiamonds?: number
    bundleFashionId?: string
    bundlePetId?: string
    bundleVipDays?: number
  }
}

export interface PurchaseReceipt {
  receiptId: string
  txId: string
  requestId: string
  characterId: string
  productId: string
  itemId: string
  productName: string
  category: PremiumCategory
  qty: number
  diamondPrice: number
  totalPaid: number
  purchasedAtMs: number
  status: 'completed'
  serverVerified: boolean
}

export interface AuditLogEntry {
  logId: string
  action:
    | 'SANDBOX_GRANT'
    | 'DIAMOND_EARN'
    | 'DIAMOND_SPEND'
    | 'PREMIUM_PURCHASE'
    | 'VIP_ACTIVATE'
    | 'VIP_CLAIM_TIER'
    | 'VIP_CLAIM_DAILY'
    | 'PASS_UNLOCK'
    | 'PASS_CLAIM'
    | 'PASS_ARCHIVE_CLAIM'
    | 'STORAGE_EXPAND'
    | 'FASHION_EQUIP'
    | 'TOPUP_MILESTONE_CLAIM'
    | 'DAILY_TOPUP_CLAIM'
    | 'REDEEM_CODE'
  characterId: string
  actorUid: string
  actorRole: 'gm' | 'player'
  txId?: string
  details: string
  verifiedByServer: boolean
  createdAtMs: number
}

export type VipTierId = 0 | 1 | 2 | 3 | 4 | 5

export interface VipTierDef {
  level: VipTierId
  code: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND'
  name: string
  badgeLabel: string
  badgeColor: string
  badgeBg: string
  badgeBorder: string
  expRequired: number
  expBonusPct: number
  extraInventorySlots: number
  extraStorageSlots: number
  exclusiveFashionIds: string[]
  dailyReward: {
    gold: number
    diamonds: number
    enhanceStones: number
    petEssence: number
    label: string
  }
  tierReward: {
    gold: number
    diamonds: number
    enhanceStones: number
    fashionId?: string
    label: string
  }
  benefits: string[]
}

export interface VipState {
  vipLevel: VipTierId
  vipExp: number
  expiresAtMs: number | null
  claimedTierRewards: number[]
  lastDailyClaimDate: string | null
}

export type FashionSlot =
  | 'hat'
  | 'hair'
  | 'costume'
  | 'pants'
  | 'shoes'
  | 'wings'
  | 'back'
  | 'accessory'
  | 'aura'
  | 'weaponSkin'
  | 'mountAppearance'

export interface FashionItemDef {
  id: string
  slot: FashionSlot
  name: string
  description: string
  rarity: PremiumRarity
  primaryColor: string
  secondaryColor: string
  accentColor: string
  iconAsset?: string
  layerSheetAsset?: string
  wingSpriteAsset?: string
  wingAnimSheetAsset?: string
  wingAnimFrames?: number
  gachaOnly?: boolean
  goldPrice?: number
  diamondPrice?: number
  freeStarter?: boolean
  /** Optional sprite override palette for costumes / hair / mount appearances */
  paletteOverride?: {
    hair?: string
    body?: string
    legs?: string
    accent?: string
    hat?: string
    auraGlow?: string
  }
  vipRequired?: VipTierId
  linkedLegacyCosmeticId?: string
  linkedGemItemId?: string
}

export interface FashionState {
  unlockedIds: string[]
  gachaUnlockedIds?: string[]
  equipped: Record<FashionSlot, string | null>
}

export interface PremiumStorageState {
  extraInventorySlots: number
  extraStorageSlots: number
}

export interface PremiumState {
  version: 1
  wallet: DiamondWallet
  vip: VipState
  fashion: FashionState
  storage: PremiumStorageState
  purchaseCounts: Record<string, number>
  purchaseHistory: PurchaseReceipt[]
  auditLogs: AuditLogEntry[]
  firstTopupPackages?: string[]
  topupOrders?: TopupOrderRecord[]
  totalTopupThb?: number
  claimedTopupMilestones?: string[]
  lastDailyTopupDate?: string | null
  claimedDailyTopupDate?: string | null
}
