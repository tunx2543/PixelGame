import { sanitizeFashionState } from './fashion-pet'
import type { TopupOrderRecord } from './topup'
import type {
  AuditLogEntry,
  DiamondTransaction,
  DiamondTxType,
  DiamondWallet,
  PremiumState,
  PremiumStorageState,
  PurchaseReceipt,
} from './types'
import { createDefaultVipState, getEffectiveVipBonuses, sanitizeVipState } from './vip'

export const EXTRA_INVENTORY_SCROLL_CAP = 40
export const EXTRA_STORAGE_SCROLL_CAP = 120
export const MAX_TRANSACTION_HISTORY_LOCAL = 120
export const MAX_PURCHASE_HISTORY_LOCAL = 100
export const MAX_AUDIT_LOGS_LOCAL = 120
export const MAX_PROCESSED_REQUEST_IDS = 120

export function generateUniqueTxId(prefix = 'TX'): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
      : Math.random().toString(36).slice(2, 12).toUpperCase()
  return `${prefix}-${ts}-${rand}`
}

export function createDefaultWallet(characterId = 'slot_1', initialBalance = 0): DiamondWallet {
  return {
    characterId,
    diamondBalance: Math.max(0, Math.floor(initialBalance || 0)),
    totalEarned: Math.max(0, Math.floor(initialBalance || 0)),
    totalSpent: 0,
    transactionHistory: [],
    processedRequestIds: [],
  }
}

export function createDefaultPremiumStorage(): PremiumStorageState {
  return {
    extraInventorySlots: 0,
    extraStorageSlots: 0,
  }
}

export function createDefaultPremiumState(characterId = 'slot_1', initialBalance = 0): PremiumState {
  return {
    version: 1,
    wallet: createDefaultWallet(characterId, initialBalance),
    vip: createDefaultVipState(),
    fashion: sanitizeFashionState(undefined),
    storage: createDefaultPremiumStorage(),
    purchaseCounts: {},
    purchaseHistory: [],
    auditLogs: [],
    firstTopupPackages: [],
    topupOrders: [],
    totalTopupThb: 0,
    claimedTopupMilestones: [],
    lastDailyTopupDate: null,
    claimedDailyTopupDate: null,
  }
}

export function sanitizePremiumState(
  raw: unknown,
  context: {
    characterId: string
    diamonds: number
    ownedGemItems?: string[]
    equippedGemFashion?: string | null
    unlockedCosmetics?: string[]
    equippedWing?: string | null
  },
): PremiumState {
  const safeBalance = Math.max(0, Math.floor(Number(context.diamonds ?? 0) || 0))
  const obj = raw && typeof raw === 'object' ? (raw as Partial<PremiumState>) : {}

  // Wallet
  const wRaw = obj.wallet && typeof obj.wallet === 'object' ? obj.wallet : ({} as Partial<DiamondWallet>)
  const history = Array.isArray(wRaw.transactionHistory)
    ? wRaw.transactionHistory
        .filter((tx): tx is DiamondTransaction => Boolean(tx && typeof tx.txId === 'string' && typeof tx.amount === 'number'))
        .slice(0, MAX_TRANSACTION_HISTORY_LOCAL)
    : []
  const processedRequestIds = Array.isArray(wRaw.processedRequestIds)
    ? [...new Set(wRaw.processedRequestIds.filter((id): id is string => typeof id === 'string'))].slice(
        -MAX_PROCESSED_REQUEST_IDS,
      )
    : []

  const wallet: DiamondWallet = {
    characterId: context.characterId || wRaw.characterId || 'slot_1',
    diamondBalance: safeBalance,
    totalEarned: Math.max(safeBalance, Math.floor(Number(wRaw.totalEarned ?? safeBalance) || 0)),
    totalSpent: Math.max(0, Math.floor(Number(wRaw.totalSpent ?? 0) || 0)),
    transactionHistory: history,
    processedRequestIds,
  }

  // VIP
  const vip = sanitizeVipState(obj.vip)

  // Auto-grant exclusive VIP fashion unlocks when VIP is active
  const vipBonuses = getEffectiveVipBonuses(vip)
  const fashion = sanitizeFashionState(obj.fashion, {
    ownedGemItems: context.ownedGemItems,
    equippedGemFashion: context.equippedGemFashion,
    unlockedCosmetics: context.unlockedCosmetics,
    equippedWing: context.equippedWing,
  })
  if (vipBonuses.active) {
    for (const fId of vipBonuses.exclusiveFashionIds) {
      if (!fashion.unlockedIds.includes(fId)) {
        fashion.unlockedIds.push(fId)
      }
    }
  }

  // Storage
  const stRaw = obj.storage && typeof obj.storage === 'object' ? obj.storage : {}
  const storage: PremiumStorageState = {
    extraInventorySlots: Math.max(
      0,
      Math.min(EXTRA_INVENTORY_SCROLL_CAP, Math.floor(Number((stRaw as Partial<PremiumStorageState>).extraInventorySlots ?? 0) || 0)),
    ),
    extraStorageSlots: Math.max(
      0,
      Math.min(EXTRA_STORAGE_SCROLL_CAP, Math.floor(Number((stRaw as Partial<PremiumStorageState>).extraStorageSlots ?? 0) || 0)),
    ),
  }

  // Purchase counts
  const purchaseCounts: Record<string, number> = {}
  if (obj.purchaseCounts && typeof obj.purchaseCounts === 'object') {
    for (const [k, v] of Object.entries(obj.purchaseCounts)) {
      const count = Math.floor(Number(v ?? 0) || 0)
      if (k && count > 0) purchaseCounts[k] = count
    }
  }

  // Receipts
  const purchaseHistory = Array.isArray(obj.purchaseHistory)
    ? obj.purchaseHistory
        .filter((r): r is PurchaseReceipt => Boolean(r && typeof r.receiptId === 'string' && typeof r.productId === 'string'))
        .slice(0, MAX_PURCHASE_HISTORY_LOCAL)
    : []

  const firstTopupPackages = Array.isArray(obj.firstTopupPackages)
    ? [...new Set(obj.firstTopupPackages.filter((id): id is string => typeof id === 'string'))].slice(0, 32)
    : []

  const topupOrders = Array.isArray(obj.topupOrders)
    ? obj.topupOrders
        .filter((o): o is TopupOrderRecord => Boolean(o && typeof o.orderId === 'string' && typeof o.totalDiamonds === 'number'))
        .slice(0, 40)
    : []

  // Audit logs
  const auditLogs = Array.isArray(obj.auditLogs)
    ? obj.auditLogs
        .filter((a): a is AuditLogEntry => Boolean(a && typeof a.logId === 'string' && typeof a.action === 'string'))
        .slice(0, MAX_AUDIT_LOGS_LOCAL)
    : []

  const computedFromOrders = topupOrders.reduce((sum, ord) => sum + Math.max(0, Number(ord.amountThb) || 0), 0)
  const rawTotalThb = Number(obj.totalTopupThb ?? 0)
  const totalTopupThb = Math.max(computedFromOrders, Number.isFinite(rawTotalThb) ? Math.floor(rawTotalThb) : 0)
  const claimedTopupMilestones = Array.isArray(obj.claimedTopupMilestones)
    ? [...new Set(obj.claimedTopupMilestones.filter((id): id is string => typeof id === 'string'))].slice(0, 32)
    : []
  const lastDailyTopupDate =
    typeof obj.lastDailyTopupDate === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(obj.lastDailyTopupDate)
      ? obj.lastDailyTopupDate
      : null
  const claimedDailyTopupDate =
    typeof obj.claimedDailyTopupDate === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(obj.claimedDailyTopupDate)
      ? obj.claimedDailyTopupDate
      : null

  return {
    version: 1,
    wallet,
    vip,
    fashion,
    storage,
    purchaseCounts,
    purchaseHistory,
    auditLogs,
    firstTopupPackages,
    topupOrders,
    totalTopupThb,
    claimedTopupMilestones,
    lastDailyTopupDate,
    claimedDailyTopupDate,
  }
}

export interface ApplyDiamondTxInput {
  type: DiamondTxType
  amount: number
  source: string
  note: string
  actorUid: string
  isGm: boolean
  requestId?: string
  txId?: string
  productId?: string
  itemId?: string
  serverVerified?: boolean
  serverSignature?: string
  timestampMs?: number
}

export interface ApplyDiamondTxResult {
  ok: boolean
  duplicate?: boolean
  message: string
  tx?: DiamondTransaction
  nextBalance: number
}

/**
 * Central Diamond Wallet mutation guard.
 * Enforces non-negative balance, idempotent requestId check, unique txId, and full ledger logging.
 */
export function applyDiamondTransaction(
  state: PremiumState,
  currentDiamonds: number,
  input: ApplyDiamondTxInput,
): ApplyDiamondTxResult {
  const safeCurrent = Math.max(0, Math.floor(Number(currentDiamonds) || 0))
  const amt = Math.floor(Number(input.amount) || 0)
  const requestId = input.requestId || generateUniqueTxId('REQ')

  if (amt <= 0) {
    return { ok: false, message: 'จำนวนเพชรต้องมากกว่า 0', nextBalance: safeCurrent }
  }

  if (state.wallet.processedRequestIds.includes(requestId)) {
    return {
      ok: false,
      duplicate: true,
      message: 'คำขอนี้ถูกดำเนินการไปแล้ว (ป้องกันทำรายการซ้ำ)',
      nextBalance: safeCurrent,
    }
  }

  let nextBalance = safeCurrent
  if (input.type === 'spend') {
    if (safeCurrent < amt) {
      return {
        ok: false,
        message: `เพชรไม่พอ (มี ${safeCurrent.toLocaleString()} D / ต้องการ ${amt.toLocaleString()} D)`,
        nextBalance: safeCurrent,
      }
    }
    nextBalance = safeCurrent - amt
    state.wallet.totalSpent += amt
  } else {
    nextBalance = Math.min(1_000_000_000, safeCurrent + amt)
    state.wallet.totalEarned += nextBalance - safeCurrent
  }

  const tx: DiamondTransaction = {
    txId: input.txId || generateUniqueTxId('TX'),
    requestId,
    characterId: state.wallet.characterId,
    type: input.type,
    source: input.source,
    amount: amt,
    balanceBefore: safeCurrent,
    balanceAfter: nextBalance,
    productId: input.productId,
    itemId: input.itemId,
    note: input.note.slice(0, 180),
    createdAtMs: input.timestampMs ?? Date.now(),
    actorUid: input.actorUid,
    isGm: input.isGm,
    serverVerified: Boolean(input.serverVerified),
    serverSignature: input.serverSignature,
  }

  state.wallet.diamondBalance = nextBalance
  state.wallet.transactionHistory.unshift(tx)
  if (state.wallet.transactionHistory.length > MAX_TRANSACTION_HISTORY_LOCAL) {
    state.wallet.transactionHistory.length = MAX_TRANSACTION_HISTORY_LOCAL
  }
  state.wallet.processedRequestIds.push(requestId)
  if (state.wallet.processedRequestIds.length > MAX_PROCESSED_REQUEST_IDS) {
    state.wallet.processedRequestIds.splice(
      0,
      state.wallet.processedRequestIds.length - MAX_PROCESSED_REQUEST_IDS,
    )
  }

  return {
    ok: true,
    message: 'บันทึกรายการเพชรสำเร็จ',
    tx,
    nextBalance,
  }
}

export function appendPurchaseReceipt(state: PremiumState, receipt: PurchaseReceipt) {
  state.purchaseHistory.unshift(receipt)
  if (state.purchaseHistory.length > MAX_PURCHASE_HISTORY_LOCAL) {
    state.purchaseHistory.length = MAX_PURCHASE_HISTORY_LOCAL
  }
  state.purchaseCounts[receipt.productId] = (state.purchaseCounts[receipt.productId] ?? 0) + receipt.qty
}

export function appendAuditLog(
  state: PremiumState,
  entry: Omit<AuditLogEntry, 'logId' | 'createdAtMs'> & { logId?: string; createdAtMs?: number },
): AuditLogEntry {
  const full: AuditLogEntry = {
    logId: entry.logId || generateUniqueTxId('AUD'),
    createdAtMs: entry.createdAtMs ?? Date.now(),
    action: entry.action,
    characterId: entry.characterId,
    actorUid: entry.actorUid,
    actorRole: entry.actorRole,
    txId: entry.txId,
    details: entry.details.slice(0, 240),
    verifiedByServer: entry.verifiedByServer,
  }
  state.auditLogs.unshift(full)
  if (state.auditLogs.length > MAX_AUDIT_LOGS_LOCAL) {
    state.auditLogs.length = MAX_AUDIT_LOGS_LOCAL
  }
  return full
}
