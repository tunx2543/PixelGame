import { formatPromptPayTarget, type PromptPayShopSettings, type TopupSlipRequestRecord } from '@/lib/game/premium/topup'
import {
  getDefaultStorePaths,
  getGlobalSingleton,
  isCloudflareWorkersRuntime,
  readJsonStoreFile,
  writeJsonStoreFile,
  type StorePersistenceMode,
} from './runtime-store'
import {
  claimDurableLock,
  detectDurableBackendMode,
  firestoreCommitDoc,
  firestoreGetDoc,
  firestoreListCollection,
  firestoreRunStructuredQuery,
  getFirestoreServiceAccountToken,
  hasRemoteDurableBackend,
  mutateDurableNamespace,
  readDurableNamespace,
} from './durable-store'

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

const NAMESPACE = 'topup-store'
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

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

export async function getTopupStorePersistenceModeAsync(): Promise<StorePersistenceMode> {
  return detectDurableBackendMode(getSlot().mode)
}

function normalizeStoreData(parsed: Partial<TopupStoreData> | null | undefined): TopupStoreData {
  if (!parsed || typeof parsed !== 'object') {
    return {
      merchantQr: DEFAULT_MERCHANT_QR,
      slipRequests: [],
      usedSlipRefs: [],
      usedSlipHashes: [],
      stripeFulfillments: [],
    }
  }
  return {
    merchantQr: parsed.merchantQr ?? DEFAULT_MERCHANT_QR,
    slipRequests: Array.isArray(parsed.slipRequests) ? parsed.slipRequests.slice(0, 200) : [],
    usedSlipRefs: Array.isArray(parsed.usedSlipRefs) ? parsed.usedSlipRefs.slice(-500) : [],
    usedSlipHashes: Array.isArray(parsed.usedSlipHashes) ? parsed.usedSlipHashes.slice(-500) : [],
    stripeFulfillments: Array.isArray(parsed.stripeFulfillments) ? parsed.stripeFulfillments.slice(-200) : [],
  }
}

function readStore(): TopupStoreData {
  const slot = getSlot()
  if (slot.data) return slot.data
  const parsed = readJsonStoreFile<Partial<TopupStoreData>>(PRIMARY_FILE, FALLBACK_FILE)
  if (parsed) {
    slot.data = normalizeStoreData(parsed)
    return slot.data
  }
  slot.data = normalizeStoreData(null)
  return slot.data
}

function writeStore(next: TopupStoreData): StorePersistenceMode {
  const slot = getSlot()
  const normalized = normalizeStoreData(next)
  slot.data = normalized
  const mode = writeJsonStoreFile(PRIMARY_DIR, PRIMARY_FILE, FALLBACK_FILE, JSON.stringify(normalized, null, 2))
  slot.mode = mode
  return mode
}

function mapSlipFromFirestore(id: string, d: Record<string, unknown>): TopupSlipRequestRecord {
  const baseDiamonds = Number(d.baseDiamonds ?? 0)
  const bonusDiamonds = Number(d.bonusDiamonds ?? 0)
  return {
    requestId: String(d.requestId ?? id),
    ownerId: String(d.ownerId ?? ''),
    ownerEmail: String(d.ownerEmail ?? ''),
    playerName: String(d.playerName ?? 'Player'),
    gameUid: String(d.gameUid ?? '----'),
    characterId: String(d.characterId ?? 'slot_1'),
    packageId: String(d.packageId ?? ''),
    packageName: String(d.packageName ?? ''),
    amountThb: Number(d.amountThb ?? 0),
    baseDiamonds,
    bonusDiamonds,
    totalDiamonds: Number(d.totalDiamonds ?? baseDiamonds + bonusDiamonds),
    vipExpGranted: Number(d.vipExpGranted ?? 0),
    slipDataUrl: String(d.slipDataUrl ?? ''),
    slipNote: String(d.slipNote ?? ''),
    status: d.status === 'approved' || d.status === 'rejected' ? d.status : 'pending',
    claimed: Boolean(d.claimed),
    claimedAtMs: typeof d.claimedAtMs === 'number' ? d.claimedAtMs : null,
    reviewedByUid: typeof d.reviewedByUid === 'string' ? d.reviewedByUid : null,
    reviewNote: typeof d.reviewNote === 'string' ? d.reviewNote : null,
    slipHash: typeof d.slipHash === 'string' ? d.slipHash : null,
    createdAtMs: Number(d.createdAtMs ?? 0),
  }
}

function mergeSlipLists(primary: TopupSlipRequestRecord[], secondary: TopupSlipRequestRecord[]): TopupSlipRequestRecord[] {
  const byId = new Map<string, TopupSlipRequestRecord>()
  for (const r of secondary) {
    if (r?.requestId) byId.set(r.requestId, r)
  }
  for (const r of primary) {
    if (!r?.requestId) continue
    const prev = byId.get(r.requestId)
    if (!prev) {
      byId.set(r.requestId, r)
    } else {
      // Prefer whichever progressed further in lifecycle (claimed > approved/rejected > pending)
      const rank = (row: TopupSlipRequestRecord) => (row.claimed ? 3 : row.status !== 'pending' ? 2 : 1)
      byId.set(r.requestId, rank(r) >= rank(prev) ? r : prev)
    }
  }
  return [...byId.values()].sort((a, b) => b.createdAtMs - a.createdAtMs)
}

async function resolveBestFirestoreToken(bearerToken?: string | null): Promise<string | null> {
  if (bearerToken) return bearerToken
  return getFirestoreServiceAccountToken()
}

export function isPersistentSlipRefUsed(transRef: string): boolean {
  const clean = transRef.trim()
  if (!clean) return false
  return (readStore().usedSlipRefs ?? []).includes(clean)
}

export async function isPersistentSlipRefUsedDurable(transRef: string): Promise<boolean> {
  const clean = transRef.trim().slice(0, 120)
  if (!clean) return false
  const { data } = await readDurableNamespace<TopupStoreData>(NAMESPACE, readStore)
  return (data.usedSlipRefs ?? []).includes(clean)
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

export async function claimPersistentSlipRefDurable(transRef: string): Promise<boolean> {
  const clean = transRef.trim().slice(0, 120)
  if (!clean) return false
  const lockWon = await claimDurableLock(`slipref:${clean}`, 'topup', ONE_YEAR_MS, () => true)
  if (!lockWon) return false

  const res = await mutateDurableNamespace<TopupStoreData, boolean>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const normalized = normalizeStoreData(current)
      const existing = normalized.usedSlipRefs ?? []
      if (existing.includes(clean)) {
        return { next: normalized, changed: false, result: false }
      }
      return {
        next: { ...normalized, usedSlipRefs: [...existing, clean].slice(-500) },
        changed: true,
        result: true,
      }
    },
    onCommitLocal: writeStore,
  })
  return res.result
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

export async function isPersistentSlipHashUsedDurable(slipHash: string | null | undefined): Promise<boolean> {
  const clean = typeof slipHash === 'string' ? slipHash.trim().toLowerCase() : ''
  if (!clean || clean.length < 16) return false
  const { data } = await readDurableNamespace<TopupStoreData>(NAMESPACE, readStore)
  const normalized = normalizeStoreData(data)
  if ((normalized.usedSlipHashes ?? []).includes(clean)) return true
  return normalized.slipRequests.some(
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

export async function claimPersistentSlipHashDurable(slipHash: string | null | undefined): Promise<boolean> {
  const clean = typeof slipHash === 'string' ? slipHash.trim().toLowerCase().slice(0, 128) : ''
  if (!clean || clean.length < 16) return true
  const lockWon = await claimDurableLock(`sliphash:${clean}`, 'topup', ONE_YEAR_MS, () => true)
  if (!lockWon) return false

  const res = await mutateDurableNamespace<TopupStoreData, boolean>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const normalized = normalizeStoreData(current)
      const existing = normalized.usedSlipHashes ?? []
      if (existing.includes(clean)) {
        return { next: normalized, changed: false, result: false }
      }
      return {
        next: { ...normalized, usedSlipHashes: [...existing, clean].slice(-500) },
        changed: true,
        result: true,
      }
    },
    onCommitLocal: writeStore,
  })
  return res.result
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

export async function recordStripeWebhookFulfillmentDurable(order: PendingWebhookOrder): Promise<void> {
  await mutateDurableNamespace<TopupStoreData, void>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const normalized = normalizeStoreData(current)
      const list = normalized.stripeFulfillments ?? []
      const idx = list.findIndex((item) => item.gatewayRef === order.gatewayRef)
      if (idx !== -1 && list[idx].claimed) {
        return { next: normalized, changed: false, result: undefined }
      }
      const nextList =
        idx !== -1
          ? list.map((item, i) => (i === idx ? { ...order, claimed: item.claimed } : item))
          : [order, ...list].slice(0, 200)
      return {
        next: { ...normalized, stripeFulfillments: nextList },
        changed: true,
        result: undefined,
      }
    },
    onCommitLocal: writeStore,
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

export async function markStripeWebhookFailedDurable(gatewayRef: string): Promise<void> {
  await mutateDurableNamespace<TopupStoreData, void>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const normalized = normalizeStoreData(current)
      const list = normalized.stripeFulfillments ?? []
      const idx = list.findIndex((item) => item.gatewayRef === gatewayRef)
      if (idx === -1) return { next: normalized, changed: false, result: undefined }
      const nextList = list.map((item, i) => (i === idx ? { ...item, status: 'failed' as const } : item))
      return { next: { ...normalized, stripeFulfillments: nextList }, changed: true, result: undefined }
    },
    onCommitLocal: writeStore,
  })
}

export function listPendingStripeFulfillmentsForUid(uid: string): PendingWebhookOrder[] {
  const store = readStore()
  return (store.stripeFulfillments ?? []).filter(
    (item) => item.uid === uid && item.status === 'paid' && !item.claimed,
  )
}

export async function listPendingStripeFulfillmentsForUidDurable(uid: string): Promise<PendingWebhookOrder[]> {
  const { data } = await readDurableNamespace<TopupStoreData>(NAMESPACE, readStore)
  return (normalizeStoreData(data).stripeFulfillments ?? []).filter(
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

export async function markStripeWebhookOrderClaimedDurable(gatewayRef: string, uid: string): Promise<void> {
  await mutateDurableNamespace<TopupStoreData, void>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const normalized = normalizeStoreData(current)
      const list = normalized.stripeFulfillments ?? []
      const idx = list.findIndex((item) => item.gatewayRef === gatewayRef && item.uid === uid)
      if (idx === -1 || list[idx].claimed) {
        return { next: normalized, changed: false, result: undefined }
      }
      const nextList = list.map((item, i) => (i === idx ? { ...item, claimed: true } : item))
      return { next: { ...normalized, stripeFulfillments: nextList }, changed: true, result: undefined }
    },
    onCommitLocal: writeStore,
  })
}

export function getStoredMerchantQr(): PromptPayShopSettings | null {
  return readStore().merchantQr
}

export async function getStoredMerchantQrDurable(bearerToken?: string | null): Promise<PromptPayShopSettings | null> {
  const { data } = await readDurableNamespace<TopupStoreData>(NAMESPACE, readStore)
  const localQr = normalizeStoreData(data).merchantQr

  const token = await resolveBestFirestoreToken(bearerToken)
  if (token) {
    const fsDoc = await firestoreGetDoc('shopSettings/promptpay', token)
    if (fsDoc.exists && fsDoc.data) {
      const d = fsDoc.data
      const fsQr: PromptPayShopSettings = {
        settingId: 'promptpay',
        promptPayId: String(d.promptPayId ?? ''),
        accountName: String(d.accountName ?? 'Pixel Quest Shop'),
        customQrDataUrl: typeof d.customQrDataUrl === 'string' ? d.customQrDataUrl : null,
        enabled: Boolean(d.enabled),
        updatedByUid: String(d.updatedByUid ?? ''),
        createdAtMs: Number(d.createdAtMs ?? 0),
        updatedAtMs: Number(d.updatedAtMs ?? 0),
      }
      if (!localQr || fsQr.updatedAtMs >= localQr.updatedAtMs) {
        return fsQr
      }
    }
  }
  return localQr
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

export async function saveStoredMerchantQrDurable(
  input: {
    promptPayId: string
    accountName: string
    customQrDataUrl: string | null
    enabled: boolean
    updatedByUid: string
  },
  bearerToken?: string | null,
): Promise<PromptPayShopSettings> {
  const nowMs = Date.now()
  const cleanId = input.promptPayId.replace(/\D/g, '').slice(0, 32)
  const cleanName = input.accountName.trim().slice(0, 80) || 'ร้าน Pixel Quest'
  const cleanQr =
    input.customQrDataUrl && input.customQrDataUrl.length >= 20
      ? input.customQrDataUrl.slice(0, 350000)
      : null

  const res = await mutateDurableNamespace<TopupStoreData, PromptPayShopSettings>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const normalized = normalizeStoreData(current)
      const prev = normalized.merchantQr
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
      return { next: { ...normalized, merchantQr: nextQr }, changed: true, result: nextQr }
    },
    onCommitLocal: writeStore,
  })

  const token = await resolveBestFirestoreToken(bearerToken)
  if (token) {
    const existing = await firestoreGetDoc('shopSettings/promptpay', token)
    if (existing.exists && existing.data) {
      await firestoreCommitDoc({
        docPath: 'shopSettings/promptpay',
        fields: {
          promptPayId: res.result.promptPayId,
          accountName: res.result.accountName,
          customQrDataUrl: res.result.customQrDataUrl,
          enabled: res.result.enabled,
          updatedByUid: res.result.updatedByUid,
          updatedAtMs: res.result.updatedAtMs,
        },
        bearerToken: token,
        updateMaskFieldPaths: [
          'promptPayId',
          'accountName',
          'customQrDataUrl',
          'enabled',
          'updatedByUid',
          'updatedAtMs',
          'updatedAt',
        ],
        serverTimestampFields: ['updatedAt'],
      }).catch(() => {})
    } else {
      await firestoreCommitDoc({
        docPath: 'shopSettings/promptpay',
        fields: {
          settingId: 'promptpay',
          promptPayId: res.result.promptPayId,
          accountName: res.result.accountName,
          customQrDataUrl: res.result.customQrDataUrl,
          enabled: res.result.enabled,
          updatedByUid: res.result.updatedByUid,
          createdAtMs: res.result.createdAtMs,
          updatedAtMs: res.result.updatedAtMs,
        },
        bearerToken: token,
        serverTimestampFields: ['createdAt', 'updatedAt'],
      }).catch(() => {})
    }
  }

  return res.result
}

export function addStoredSlipRequest(req: TopupSlipRequestRecord): TopupSlipRequestRecord {
  const store = readStore()
  const nextList = [req, ...store.slipRequests.filter((r) => r.requestId !== req.requestId)].slice(0, 200)
  writeStore({ ...store, slipRequests: nextList })
  return req
}

export async function addStoredSlipRequestDurable(
  req: TopupSlipRequestRecord,
  bearerToken?: string | null,
): Promise<TopupSlipRequestRecord> {
  await mutateDurableNamespace<TopupStoreData, TopupSlipRequestRecord>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const normalized = normalizeStoreData(current)
      const nextList = [req, ...normalized.slipRequests.filter((r) => r.requestId !== req.requestId)].slice(0, 200)
      return { next: { ...normalized, slipRequests: nextList }, changed: true, result: req }
    },
    onCommitLocal: writeStore,
  })

  const token = await resolveBestFirestoreToken(bearerToken)
  if (token) {
    await firestoreCommitDoc({
      docPath: `topupSlipRequests/${req.requestId}`,
      fields: {
        requestId: req.requestId,
        ownerId: req.ownerId,
        ownerEmail: req.ownerEmail,
        playerName: req.playerName,
        gameUid: req.gameUid,
        characterId: req.characterId,
        packageId: req.packageId,
        packageName: req.packageName,
        amountThb: req.amountThb,
        baseDiamonds: req.baseDiamonds,
        bonusDiamonds: req.bonusDiamonds,
        totalDiamonds: req.totalDiamonds,
        vipExpGranted: req.vipExpGranted,
        slipDataUrl: req.slipDataUrl,
        slipNote: req.slipNote,
        status: 'pending',
        claimed: false,
        claimedAtMs: null,
        reviewedByUid: null,
        reviewNote: null,
        slipHash: req.slipHash ?? null,
        createdAtMs: req.createdAtMs,
      },
      bearerToken: token,
      serverTimestampFields: ['createdAt', 'updatedAt'],
      currentDocument: { exists: false },
    }).catch(() => {})
  }

  return req
}

export function getStoredSlipRequest(requestId: string): TopupSlipRequestRecord | null {
  const store = readStore()
  return store.slipRequests.find((r) => r.requestId === requestId) ?? null
}

export async function getStoredSlipRequestDurable(
  requestId: string,
  bearerToken?: string | null,
): Promise<TopupSlipRequestRecord | null> {
  const { data } = await readDurableNamespace<TopupStoreData>(NAMESPACE, readStore)
  const localMatch = normalizeStoreData(data).slipRequests.find((r) => r.requestId === requestId) ?? null
  if (localMatch && (hasRemoteDurableBackend() || localMatch.claimed)) {
    return localMatch
  }
  const token = await resolveBestFirestoreToken(bearerToken)
  if (token) {
    const fsDoc = await firestoreGetDoc(`topupSlipRequests/${requestId}`, token)
    if (fsDoc.exists && fsDoc.data) {
      const mapped = mapSlipFromFirestore(requestId, fsDoc.data)
      if (!localMatch) return mapped
      return mergeSlipLists([mapped], [localMatch])[0] ?? mapped
    }
  }
  return localMatch
}

export function listStoredSlipRequestsForOwner(ownerId: string): TopupSlipRequestRecord[] {
  return readStore()
    .slipRequests.filter((r) => r.ownerId === ownerId)
    .slice(0, 30)
}

export async function listStoredSlipRequestsForOwnerDurable(
  ownerId: string,
  bearerToken?: string | null,
): Promise<TopupSlipRequestRecord[]> {
  const { data } = await readDurableNamespace<TopupStoreData>(NAMESPACE, readStore)
  const durableRows = normalizeStoreData(data).slipRequests.filter((r) => r.ownerId === ownerId)

  const token = await resolveBestFirestoreToken(bearerToken)
  if (token) {
    const fsRows = await firestoreRunStructuredQuery(
      {
        from: [{ collectionId: 'topupSlipRequests' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'ownerId' },
            op: 'EQUAL',
            value: { stringValue: ownerId },
          },
        },
        limit: 30,
      },
      token,
    )
    if (fsRows.length > 0) {
      const mapped = fsRows.map((row) => mapSlipFromFirestore(row.id, row.data))
      return mergeSlipLists(durableRows, mapped).slice(0, 30)
    }
  }
  return durableRows.slice(0, 30)
}

export function listAllStoredSlipRequests(maxRows = 50): TopupSlipRequestRecord[] {
  return readStore().slipRequests.slice(0, Math.max(1, Math.min(100, maxRows)))
}

export async function listAllStoredSlipRequestsDurable(
  maxRows = 50,
  bearerToken?: string | null,
): Promise<TopupSlipRequestRecord[]> {
  const safeMax = Math.max(1, Math.min(100, maxRows))
  const { data } = await readDurableNamespace<TopupStoreData>(NAMESPACE, readStore)
  const durableRows = normalizeStoreData(data).slipRequests

  const token = await resolveBestFirestoreToken(bearerToken)
  if (token) {
    const fsRows = await firestoreListCollection('topupSlipRequests', token, {
      pageSize: Math.min(50, safeMax),
      orderBy: 'createdAtMs desc',
    })
    if (fsRows.length > 0) {
      const mapped = fsRows.map((row) => mapSlipFromFirestore(row.id, row.data))
      return mergeSlipLists(durableRows, mapped).slice(0, safeMax)
    }
  }
  return durableRows.slice(0, safeMax)
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

export async function reviewStoredSlipRequestDurable(
  requestId: string,
  decision: 'approved' | 'rejected',
  reviewerUid: string,
  reviewNote?: string,
  bearerToken?: string | null,
): Promise<TopupSlipRequestRecord | null> {
  const cleanNote = reviewNote ? reviewNote.trim().slice(0, 180) : null
  const token = await resolveBestFirestoreToken(bearerToken)

  // If missing from durable namespace (e.g., submitted from client SDK directly to Firestore), hydrate first
  let hydratedFromFirestore: TopupSlipRequestRecord | null = null
  const preCheck = await readDurableNamespace<TopupStoreData>(NAMESPACE, readStore)
  if (!normalizeStoreData(preCheck.data).slipRequests.some((r) => r.requestId === requestId) && token) {
    const fsDoc = await firestoreGetDoc(`topupSlipRequests/${requestId}`, token)
    if (fsDoc.exists && fsDoc.data) {
      hydratedFromFirestore = mapSlipFromFirestore(requestId, fsDoc.data)
    }
  }

  const res = await mutateDurableNamespace<TopupStoreData, TopupSlipRequestRecord | null>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const normalized = normalizeStoreData(current)
      let list = normalized.slipRequests
      if (!list.some((r) => r.requestId === requestId) && hydratedFromFirestore) {
        list = [hydratedFromFirestore, ...list].slice(0, 200)
      }
      const idx = list.findIndex((r) => r.requestId === requestId)
      if (idx === -1) return { next: normalized, changed: false, result: null }
      const existing = list[idx]
      if (existing.status !== 'pending') {
        return { next: normalized, changed: false, result: existing }
      }
      const updated: TopupSlipRequestRecord = {
        ...existing,
        status: decision,
        reviewedByUid: reviewerUid,
        reviewNote: cleanNote,
      }
      const nextList = [...list]
      nextList[idx] = updated
      return { next: { ...normalized, slipRequests: nextList }, changed: true, result: updated }
    },
    onCommitLocal: writeStore,
  })

  if (res.result && token) {
    await firestoreCommitDoc({
      docPath: `topupSlipRequests/${requestId}`,
      fields: {
        status: decision,
        reviewedByUid: reviewerUid,
        reviewNote: cleanNote,
      },
      bearerToken: token,
      updateMaskFieldPaths: ['status', 'reviewedByUid', 'reviewNote', 'updatedAt'],
      serverTimestampFields: ['updatedAt'],
    }).catch(() => {})
  }

  return res.result
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

export async function markStoredSlipRequestClaimedDurable(
  requestId: string,
  ownerId: string,
  bearerToken?: string | null,
): Promise<TopupSlipRequestRecord | null> {
  const claimedAtMs = Date.now()
  const res = await mutateDurableNamespace<TopupStoreData, TopupSlipRequestRecord | null>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const normalized = normalizeStoreData(current)
      const idx = normalized.slipRequests.findIndex(
        (r) => r.requestId === requestId && r.ownerId === ownerId,
      )
      if (idx === -1) return { next: normalized, changed: false, result: null }
      const existing = normalized.slipRequests[idx]
      if (existing.status !== 'approved' || existing.claimed) {
        return { next: normalized, changed: false, result: null }
      }
      const updated: TopupSlipRequestRecord = {
        ...existing,
        claimed: true,
        claimedAtMs,
      }
      const nextList = [...normalized.slipRequests]
      nextList[idx] = updated
      return { next: { ...normalized, slipRequests: nextList }, changed: true, result: updated }
    },
    onCommitLocal: writeStore,
  })

  const token = await resolveBestFirestoreToken(bearerToken)
  if (token) {
    await firestoreCommitDoc({
      docPath: `topupSlipRequests/${requestId}`,
      fields: {
        claimed: true,
        claimedAtMs,
      },
      bearerToken: token,
      updateMaskFieldPaths: ['claimed', 'claimedAtMs', 'updatedAt'],
      serverTimestampFields: ['updatedAt'],
    }).catch(() => {})
  }

  return res.result
}
