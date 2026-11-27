import { formatPromptPayTarget, type PromptPayShopSettings, type TopupSlipRequestRecord } from '@/lib/game/premium/topup'
import {
  getDefaultStorePaths,
  getGlobalSingleton,
  isCloudflareWorkersRuntime,
  readJsonStoreFile,
  writeJsonStoreFile,
  type StorePersistenceMode,
} from './runtime-store'

export interface PendingWebhookOrder {
  gatewayRef: string
  orderId: string
  uid: string
  characterId: string
  packageId: string
  packageName: string
  provider: 'stripe_checkout' | 'stripe_promptpay'
  amountThb: number
  baseDiamonds: number
  bonusDiamonds: number
  totalDiamonds: number
  vipExpGranted: number
  status: 'paid' | 'failed'
  claimed: boolean
  createdAtMs: number
}

interface TopupStoreData {
  merchantQr: PromptPayShopSettings | null
  slipRequests: TopupSlipRequestRecord[]
  usedSlipRefs?: string[]
  usedSlipHashes?: string[]
  stripeFulfillments?: PendingWebhookOrder[]
}

const { primaryDir: PRIMARY_DIR, primaryFile: PRIMARY_FILE, fallbackFile: FALLBACK_FILE } =
  getDefaultStorePaths('topup-store.json')

export const DEFAULT_MERCHANT_QR: PromptPayShopSettings = {
  settingId: 'promptpay',
  promptPayId: '',
  accountName: 'พร้อมเพย์ SCB (xxx-xxx-6682)',
  customQrDataUrl: '/assets/aistudio/Moment_1794989254278_6a17875f.jpg',
  enabled: true,
  updatedByUid: 'system_default',
  createdAtMs: 1763400000000,
  updatedAtMs: 1763400000000,
}

interface TopupStoreSlot {
  data: TopupStoreData | null
  mode: StorePersistenceMode
}

function getSlot(): TopupStoreSlot {
  return getGlobalSingleton<TopupStoreSlot>('pixelquest.topupStore', () => ({
    data: null,
    mode: isCloudflareWorkersRuntime() ? 'isolate_memory_only' : 'durable_disk',
  }))
}

export function getTopupStorePersistenceMode(): StorePersistenceMode {
  return getSlot().mode
}

function readStore(): TopupStoreData {
  const slot = getSlot()
  if (slot.data) return slot.data
  const parsed = readJsonStoreFile<Partial<TopupStoreData>>(PRIMARY_FILE, FALLBACK_FILE)
  if (parsed) {
    slot.data = {
      merchantQr: parsed.merchantQr ?? DEFAULT_MERCHANT_QR,
      slipRequests: Array.isArray(parsed.slipRequests) ? parsed.slipRequests.slice(0, 200) : [],
      usedSlipRefs: Array.isArray(parsed.usedSlipRefs) ? parsed.usedSlipRefs.slice(-500) : [],
      usedSlipHashes: Array.isArray(parsed.usedSlipHashes) ? parsed.usedSlipHashes.slice(-500) : [],
      stripeFulfillments: Array.isArray(parsed.stripeFulfillments) ? parsed.stripeFulfillments.slice(-200) : [],
    }
    return slot.data
  }
  slot.data = {
    merchantQr: DEFAULT_MERCHANT_QR,
    slipRequests: [],
    usedSlipRefs: [],
    usedSlipHashes: [],
    stripeFulfillments: [],
  }
  return slot.data
}

function writeStore(next: TopupStoreData): void {
  const slot = getSlot()
  slot.data = next
  slot.mode = writeJsonStoreFile(PRIMARY_DIR, PRIMARY_FILE, FALLBACK_FILE, JSON.stringify(next, null, 2))
}

export function isPersistentSlipRefUsed(transRef: string): boolean {
  const clean = transRef.trim()
  if (!clean) return false
  return (readStore().usedSlipRefs ?? []).includes(clean)
}

export function claimPersistentSlipRef(transRef: string): boolean {
  const clean = transRef.trim().slice(0, 120)
  if (!clean) return false
  const store = readStore()
  const existing = store.usedSlipRefs ?? []
  if (existing.includes(clean)) return false
  writeStore({
    ...store,
    usedSlipRefs: [...existing, clean].slice(-500),
  })
  return true
}

export function isPersistentSlipHashUsed(slipHash: string | null | undefined): boolean {
  const clean = typeof slipHash === 'string' ? slipHash.trim().toLowerCase() : ''
  if (!clean || clean.length < 16) return false
  const store = readStore()
  if ((store.usedSlipHashes ?? []).includes(clean)) return true
  return store.slipRequests.some(
    (r) => r.slipHash?.toLowerCase() === clean && (r.status === 'pending' || r.status === 'approved'),
  )
}

export function claimPersistentSlipHash(slipHash: string | null | undefined): boolean {
  const clean = typeof slipHash === 'string' ? slipHash.trim().toLowerCase().slice(0, 128) : ''
  if (!clean || clean.length < 16) return true
  const store = readStore()
  const existing = store.usedSlipHashes ?? []
  if (existing.includes(clean)) return false
  writeStore({
    ...store,
    usedSlipHashes: [...existing, clean].slice(-500),
  })
  return true
}

export function recordStripeWebhookFulfillment(order: PendingWebhookOrder): void {
  const store = readStore()
  const list = store.stripeFulfillments ?? []
  const idx = list.findIndex((item) => item.gatewayRef === order.gatewayRef)
  if (idx !== -1 && list[idx].claimed) {
    return
  }
  const nextList =
    idx !== -1
      ? list.map((item, i) => (i === idx ? { ...order, claimed: item.claimed } : item))
      : [order, ...list].slice(0, 200)
  writeStore({
    ...store,
    stripeFulfillments: nextList,
  })
}

export function markStripeWebhookFailed(gatewayRef: string): void {
  const store = readStore()
  const list = store.stripeFulfillments ?? []
  const idx = list.findIndex((item) => item.gatewayRef === gatewayRef)
  if (idx === -1) return
  const nextList = list.map((item, i) => (i === idx ? { ...item, status: 'failed' as const } : item))
  writeStore({
    ...store,
    stripeFulfillments: nextList,
  })
}

export function listPendingStripeFulfillmentsForUid(uid: string): PendingWebhookOrder[] {
  const store = readStore()
  return (store.stripeFulfillments ?? []).filter(
    (item) => item.uid === uid && item.status === 'paid' && !item.claimed,
  )
}

export function markStripeWebhookOrderClaimed(gatewayRef: string, uid: string): void {
  const store = readStore()
  const list = store.stripeFulfillments ?? []
  const idx = list.findIndex((item) => item.gatewayRef === gatewayRef && item.uid === uid)
  if (idx === -1) return
  const nextList = list.map((item, i) => (i === idx ? { ...item, claimed: true } : item))
  writeStore({
    ...store,
    stripeFulfillments: nextList,
  })
}

export function getStoredMerchantQr(): PromptPayShopSettings | null {
  return readStore().merchantQr
}

export function isStoredMerchantQrActive(): boolean {
  const qr = getStoredMerchantQr()
  if (!qr || !qr.enabled) return false
  return Boolean(formatPromptPayTarget(qr.promptPayId) || qr.customQrDataUrl)
}

export function saveStoredMerchantQr(input: {
  promptPayId: string
  accountName: string
  customQrDataUrl: string | null
  enabled: boolean
  updatedByUid: string
}): PromptPayShopSettings {
  const store = readStore()
  const nowMs = Date.now()
  const prev = store.merchantQr
  const cleanId = input.promptPayId.replace(/\D/g, '').slice(0, 32)
  const cleanName = input.accountName.trim().slice(0, 80) || 'ร้าน Pixel Quest'
  const cleanQr =
    input.customQrDataUrl && input.customQrDataUrl.length >= 20
      ? input.customQrDataUrl.slice(0, 350000)
      : null

  const nextQr: PromptPayShopSettings = {
    settingId: 'promptpay',
    promptPayId: cleanId,
    accountName: cleanName,
    customQrDataUrl: cleanQr,
    enabled: Boolean(input.enabled),
    updatedByUid: input.updatedByUid,
    createdAtMs: prev?.createdAtMs ?? nowMs,
    updatedAtMs: nowMs,
  }
  writeStore({ ...store, merchantQr: nextQr })
  return nextQr
}

export function addStoredSlipRequest(req: TopupSlipRequestRecord): TopupSlipRequestRecord {
  const store = readStore()
  const nextList = [req, ...store.slipRequests.filter((r) => r.requestId !== req.requestId)].slice(0, 200)
  writeStore({ ...store, slipRequests: nextList })
  return req
}

export function getStoredSlipRequest(requestId: string): TopupSlipRequestRecord | null {
  const store = readStore()
  return store.slipRequests.find((r) => r.requestId === requestId) ?? null
}

export function listStoredSlipRequestsForOwner(ownerId: string): TopupSlipRequestRecord[] {
  return readStore()
    .slipRequests.filter((r) => r.ownerId === ownerId)
    .slice(0, 30)
}

export function listAllStoredSlipRequests(maxRows = 50): TopupSlipRequestRecord[] {
  return readStore().slipRequests.slice(0, Math.max(1, Math.min(100, maxRows)))
}

export function reviewStoredSlipRequest(
  requestId: string,
  decision: 'approved' | 'rejected',
  reviewerUid: string,
  reviewNote?: string,
): TopupSlipRequestRecord | null {
  const store = readStore()
  const idx = store.slipRequests.findIndex((r) => r.requestId === requestId)
  if (idx === -1) return null
  const existing = store.slipRequests[idx]
  if (existing.status !== 'pending') return existing
  const updated: TopupSlipRequestRecord = {
    ...existing,
    status: decision,
    reviewedByUid: reviewerUid,
    reviewNote: reviewNote ? reviewNote.trim().slice(0, 180) : null,
  }
  const nextList = [...store.slipRequests]
  nextList[idx] = updated
  writeStore({ ...store, slipRequests: nextList })
  return updated
}

export function markStoredSlipRequestClaimed(requestId: string, ownerId: string): TopupSlipRequestRecord | null {
  const store = readStore()
  const idx = store.slipRequests.findIndex((r) => r.requestId === requestId && r.ownerId === ownerId)
  if (idx === -1) return null
  const existing = store.slipRequests[idx]
  if (existing.status !== 'approved' || existing.claimed) return null
  const updated: TopupSlipRequestRecord = {
    ...existing,
    claimed: true,
    claimedAtMs: Date.now(),
  }
  const nextList = [...store.slipRequests]
  nextList[idx] = updated
  writeStore({ ...store, slipRequests: nextList })
  return updated
}
