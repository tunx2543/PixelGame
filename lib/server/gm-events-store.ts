import {
  getDefaultStorePaths,
  getGlobalSingleton,
  isCloudflareWorkersRuntime,
  readJsonStoreFile,
  writeJsonStoreFile,
  type StorePersistenceMode,
} from './runtime-store'
import {
  checkDurableRateLimit,
  detectDurableBackendMode,
  firestoreCommitDoc,
  firestoreGetDoc,
  firestoreListCollection,
  getFirestoreServiceAccountToken,
  hasRemoteDurableBackend,
  mutateDurableNamespace,
  readDurableNamespace,
} from './durable-store'
import {
  DEFAULT_SERVER_RATES,
  getEffectiveServerRates,
  sanitizeServerRates,
  type ServerRatesConfig,
} from '@/lib/game/server-rates'
import {
  isValidWorldBossCycleKey,
  sanitizeWorldBossTestState,
  type WorldBossTestState,
} from '@/lib/game/rpg-systems'
import {
  sanitizeFestivalOverrideState,
  type FestivalOverrideState,
} from '@/lib/game/festival-events'

export type WorldAnnouncementVariant = 'gm' | 'news'
export type WorldNewsCategory = 'gm' | 'enhance' | 'boss_kill' | 'gacha' | 'rare_drop'
export type GmDirectiveAction = 'summon' | 'mute' | 'unmute' | 'kick'

export interface ServerAnnouncementEvent {
  announcementId: string
  authorUid: string
  authorName: string
  authorGameUid: string
  body: string
  variant?: WorldAnnouncementVariant
  category?: WorldNewsCategory
  createdAtMs: number
  expiresAtMs: number
}

export interface ServerGmDirectiveEvent {
  directiveId: string
  action: GmDirectiveAction
  fromUid: string
  fromName: string
  fromGameUid: string
  targetUid: string
  targetGameUid: string
  targetName: string
  mapId: string
  x: number
  y: number
  durationMin?: number
  reason?: string
  createdAtMs: number
  consumed: boolean
  consumedAtMs?: number
}

export interface ServerGiftDropEvent {
  dropId: string
  fromUid: string
  fromName: string
  fromGameUid: string
  subject: string
  body: string
  gold: number
  diamonds: number
  itemId: string | null
  qty: number
  plus: number
  createdAtMs: number
  expiresAtMs: number
}

interface GmEventsStoreData {
  announcements: ServerAnnouncementEvent[]
  directives: ServerGmDirectiveEvent[]
  giftDrops: ServerGiftDropEvent[]
  serverRates: ServerRatesConfig
  worldBossTest: WorldBossTestState | null
  closedWorldBossCycles: string[]
  festivalOverride: FestivalOverrideState | null
}

const NAMESPACE = 'gm-events'

const { primaryDir: PRIMARY_DIR, primaryFile: PRIMARY_FILE, fallbackFile: FALLBACK_FILE } =
  getDefaultStorePaths('gm-events.json')

interface GmEventsSlot {
  data: GmEventsStoreData | null
  mode: StorePersistenceMode
}

function getSlot(): GmEventsSlot {
  return getGlobalSingleton<GmEventsSlot>('pixelquest.gmEventsStore', () => ({
    data: null,
    mode: isCloudflareWorkersRuntime() ? 'isolate_memory_only' : 'durable_disk',
  }))
}

function getWorldNewsRateLimits(): Map<string, number> {
  return getGlobalSingleton<Map<string, number>>('pixelquest.worldNewsRateLimits', () => new Map())
}

export function getGmEventsStorePersistenceMode(): StorePersistenceMode {
  return getSlot().mode
}

export async function getGmEventsStorePersistenceModeAsync(): Promise<StorePersistenceMode> {
  return detectDurableBackendMode(getSlot().mode)
}

function sanitizeClosedCycles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  for (const item of raw) {
    if (isValidWorldBossCycleKey(item)) {
      seen.add(item.trim())
    }
  }
  return [...seen].slice(-24)
}

function pruneStore(data: Partial<GmEventsStoreData> | null | undefined, nowMs = Date.now()): GmEventsStoreData {
  const annCutoff = nowMs - 2 * 60_000
  const dirCutoff = nowMs - 5 * 60_000
  const dropCutoff = nowMs - 14 * 24 * 60 * 60_000
  const closedWorldBossCycles = sanitizeClosedCycles(data?.closedWorldBossCycles)
  const rawTest = sanitizeWorldBossTestState(data?.worldBossTest, nowMs)
  const worldBossTest =
    rawTest && closedWorldBossCycles.includes(rawTest.cycleKey) ? null : rawTest
  return {
    announcements: (Array.isArray(data?.announcements) ? data.announcements : [])
      .filter((a) => a.createdAtMs >= annCutoff)
      .slice(-50),
    directives: (Array.isArray(data?.directives) ? data.directives : [])
      .filter((d) => d.createdAtMs >= dirCutoff)
      .slice(-100),
    giftDrops: (Array.isArray(data?.giftDrops) ? data.giftDrops : [])
      .filter((g) => g.expiresAtMs > nowMs && g.createdAtMs >= dropCutoff)
      .slice(-50),
    serverRates: getEffectiveServerRates(sanitizeServerRates(data?.serverRates), nowMs),
    worldBossTest,
    closedWorldBossCycles,
    festivalOverride: sanitizeFestivalOverrideState(data?.festivalOverride, nowMs),
  }
}

function readStore(): GmEventsStoreData {
  const slot = getSlot()
  if (slot.data) {
    slot.data = pruneStore(slot.data)
    return slot.data
  }
  const parsed = readJsonStoreFile<Partial<GmEventsStoreData>>(PRIMARY_FILE, FALLBACK_FILE)
  if (parsed) {
    slot.data = pruneStore(parsed)
    return slot.data
  }
  slot.data = {
    announcements: [],
    directives: [],
    giftDrops: [],
    serverRates: { ...DEFAULT_SERVER_RATES },
    worldBossTest: null,
    closedWorldBossCycles: [],
    festivalOverride: null,
  }
  return slot.data
}

function writeStore(next: GmEventsStoreData): StorePersistenceMode {
  const slot = getSlot()
  const pruned = pruneStore(next)
  slot.data = pruned
  const mode = writeJsonStoreFile(PRIMARY_DIR, PRIMARY_FILE, FALLBACK_FILE, JSON.stringify(pruned, null, 2))
  slot.mode = mode
  return mode
}

async function resolveBestToken(bearerToken?: string | null): Promise<string | null> {
  if (bearerToken) return bearerToken
  return getFirestoreServiceAccountToken()
}

async function syncWorldStateToFirestore(
  data: GmEventsStoreData,
  actorUid: string,
  bearerToken?: string | null,
): Promise<void> {
  const token = await resolveBestToken(bearerToken)
  if (!token) return
  const payload = {
    serverRates: data.serverRates,
    worldBossTest: data.worldBossTest,
    closedWorldBossCycles: data.closedWorldBossCycles,
    festivalOverride: data.festivalOverride,
  }
  const existing = await firestoreGetDoc('serverConfig/worldState', token)
  const fields: Record<string, unknown> = {
    configId: 'worldState',
    payloadJson: JSON.stringify(payload),
    updatedByUid: actorUid,
    updatedAtMs: Date.now(),
  }
  if (existing.exists) {
    await firestoreCommitDoc({
      docPath: 'serverConfig/worldState',
      fields,
      bearerToken: token,
      updateMaskFieldPaths: ['payloadJson', 'updatedByUid', 'updatedAtMs', 'updatedAt'],
      serverTimestampFields: ['updatedAt'],
    }).catch(() => {})
  } else {
    await firestoreCommitDoc({
      docPath: 'serverConfig/worldState',
      fields,
      bearerToken: token,
      serverTimestampFields: ['createdAt', 'updatedAt'],
    }).catch(() => {})
  }
}

export function resetGmEventsMemoryCacheForTests(): void {
  getSlot().data = null
}

export function canPublishWorldNews(uid: string, cooldownMs = 4_000): boolean {
  const worldNewsRateLimits = getWorldNewsRateLimits()
  const now = Date.now()
  if (worldNewsRateLimits.size > 2000) {
    for (const [k, t] of worldNewsRateLimits.entries()) {
      if (now - t > 60_000) worldNewsRateLimits.delete(k)
    }
  }
  const prev = worldNewsRateLimits.get(uid) ?? 0
  if (now - prev < cooldownMs) return false
  worldNewsRateLimits.set(uid, now)
  return true
}

export async function canPublishWorldNewsDurable(uid: string, cooldownMs = 4_000): Promise<boolean> {
  return checkDurableRateLimit(`worldnews:${uid}`, 1, cooldownMs, () => canPublishWorldNews(uid, cooldownMs))
}

export function setServerRates(nextRates: ServerRatesConfig): ServerRatesConfig {
  const store = readStore()
  const sanitized = getEffectiveServerRates(sanitizeServerRates(nextRates))
  writeStore({
    ...store,
    serverRates: sanitized,
  })
  return sanitized
}

export async function setServerRatesDurable(
  nextRates: ServerRatesConfig,
  opts?: { actorUid?: string; bearerToken?: string | null },
): Promise<ServerRatesConfig> {
  const sanitized = getEffectiveServerRates(sanitizeServerRates(nextRates))
  const res = await mutateDurableNamespace<GmEventsStoreData, GmEventsStoreData>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const pruned = pruneStore(current)
      const next = { ...pruned, serverRates: sanitized }
      return { next, changed: true, result: next }
    },
    onCommitLocal: writeStore,
  })
  await syncWorldStateToFirestore(res.result, opts?.actorUid ?? 'gm', opts?.bearerToken)
  return res.result.serverRates
}

export function getEffectiveStoredServerRates(nowMs = Date.now()): ServerRatesConfig {
  const store = readStore()
  return getEffectiveServerRates(store.serverRates, nowMs)
}

export async function getEffectiveStoredServerRatesDurable(nowMs = Date.now()): Promise<ServerRatesConfig> {
  const { data } = await readDurableNamespace<GmEventsStoreData>(NAMESPACE, readStore)
  return getEffectiveServerRates(pruneStore(data, nowMs).serverRates, nowMs)
}

export function setStoredWorldBossTest(
  nextState: WorldBossTestState | null,
  nowMs = Date.now(),
): WorldBossTestState | null {
  const store = readStore()
  const sanitized = sanitizeWorldBossTestState(nextState, nowMs)
  const closedWorldBossCycles = sanitized
    ? store.closedWorldBossCycles.filter((k) => k !== sanitized.cycleKey)
    : store.closedWorldBossCycles
  writeStore({
    ...store,
    worldBossTest: sanitized,
    closedWorldBossCycles,
  })
  return sanitized
}

export async function setStoredWorldBossTestDurable(
  nextState: WorldBossTestState | null,
  nowMs = Date.now(),
  opts?: { actorUid?: string; bearerToken?: string | null },
): Promise<WorldBossTestState | null> {
  const sanitized = sanitizeWorldBossTestState(nextState, nowMs)
  const res = await mutateDurableNamespace<GmEventsStoreData, GmEventsStoreData>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const pruned = pruneStore(current, nowMs)
      const closedWorldBossCycles = sanitized
        ? pruned.closedWorldBossCycles.filter((k) => k !== sanitized.cycleKey)
        : pruned.closedWorldBossCycles
      const next = { ...pruned, worldBossTest: sanitized, closedWorldBossCycles }
      return { next, changed: true, result: next }
    },
    onCommitLocal: writeStore,
  })
  await syncWorldStateToFirestore(res.result, opts?.actorUid ?? 'gm', opts?.bearerToken)
  return res.result.worldBossTest
}

export function getEffectiveStoredWorldBossTest(nowMs = Date.now()): WorldBossTestState | null {
  const store = readStore()
  return sanitizeWorldBossTestState(store.worldBossTest, nowMs)
}

export async function getEffectiveStoredWorldBossTestDurable(nowMs = Date.now()): Promise<WorldBossTestState | null> {
  const { data } = await readDurableNamespace<GmEventsStoreData>(NAMESPACE, readStore)
  return sanitizeWorldBossTestState(pruneStore(data, nowMs).worldBossTest, nowMs)
}

export function closeStoredWorldBossEvent(
  cycleKey: string,
  nowMs = Date.now(),
): { closedWorldBossCycles: string[]; worldBossTest: WorldBossTestState | null } {
  const store = readStore()
  const cleanKey = isValidWorldBossCycleKey(cycleKey) ? cycleKey.trim() : ''
  const nextClosed = cleanKey
    ? [...new Set([...store.closedWorldBossCycles, cleanKey])].slice(-24)
    : store.closedWorldBossCycles
  const currentTest = sanitizeWorldBossTestState(store.worldBossTest, nowMs)
  const shouldClearTest = Boolean(currentTest && (!cleanKey || currentTest.cycleKey === cleanKey))
  const nextTest = shouldClearTest ? null : currentTest
  writeStore({
    ...store,
    worldBossTest: nextTest,
    closedWorldBossCycles: nextClosed,
  })
  return {
    closedWorldBossCycles: nextClosed,
    worldBossTest: nextTest,
  }
}

export async function closeStoredWorldBossEventDurable(
  cycleKey: string,
  nowMs = Date.now(),
  opts?: { actorUid?: string; isGm?: boolean; bearerToken?: string | null },
): Promise<{ closedWorldBossCycles: string[]; worldBossTest: WorldBossTestState | null }> {
  const cleanKey = isValidWorldBossCycleKey(cycleKey) ? cycleKey.trim() : ''
  const res = await mutateDurableNamespace<GmEventsStoreData, GmEventsStoreData>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const pruned = pruneStore(current, nowMs)
      const nextClosed = cleanKey
        ? [...new Set([...pruned.closedWorldBossCycles, cleanKey])].slice(-24)
        : pruned.closedWorldBossCycles
      const currentTest = sanitizeWorldBossTestState(pruned.worldBossTest, nowMs)
      const shouldClearTest = Boolean(currentTest && (!cleanKey || currentTest.cycleKey === cleanKey))
      const nextTest = shouldClearTest ? null : currentTest
      const next = { ...pruned, worldBossTest: nextTest, closedWorldBossCycles: nextClosed }
      return { next, changed: true, result: next }
    },
    onCommitLocal: writeStore,
  })
  // Only GM or Service Account can write serverConfig/worldState in Firestore
  const saOrGmToken = opts?.isGm ? opts.bearerToken : await getFirestoreServiceAccountToken()
  if (saOrGmToken) {
    await syncWorldStateToFirestore(res.result, opts?.actorUid ?? 'system', saOrGmToken)
  }
  return {
    closedWorldBossCycles: res.result.closedWorldBossCycles,
    worldBossTest: res.result.worldBossTest,
  }
}

export function getEffectiveClosedWorldBossCycles(): string[] {
  return readStore().closedWorldBossCycles
}

export async function getEffectiveClosedWorldBossCyclesDurable(): Promise<string[]> {
  const { data } = await readDurableNamespace<GmEventsStoreData>(NAMESPACE, readStore)
  return pruneStore(data).closedWorldBossCycles
}

export function setStoredFestivalOverride(
  nextState: FestivalOverrideState | null,
  nowMs = Date.now(),
): FestivalOverrideState | null {
  const store = readStore()
  const sanitized = sanitizeFestivalOverrideState(nextState, nowMs)
  writeStore({
    ...store,
    festivalOverride: sanitized,
  })
  return sanitized
}

export async function setStoredFestivalOverrideDurable(
  nextState: FestivalOverrideState | null,
  nowMs = Date.now(),
  opts?: { actorUid?: string; bearerToken?: string | null },
): Promise<FestivalOverrideState | null> {
  const sanitized = sanitizeFestivalOverrideState(nextState, nowMs)
  const res = await mutateDurableNamespace<GmEventsStoreData, GmEventsStoreData>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const pruned = pruneStore(current, nowMs)
      const next = { ...pruned, festivalOverride: sanitized }
      return { next, changed: true, result: next }
    },
    onCommitLocal: writeStore,
  })
  await syncWorldStateToFirestore(res.result, opts?.actorUid ?? 'gm', opts?.bearerToken)
  return res.result.festivalOverride
}

export function getEffectiveStoredFestivalOverride(nowMs = Date.now()): FestivalOverrideState | null {
  const store = readStore()
  return sanitizeFestivalOverrideState(store.festivalOverride, nowMs)
}

export async function getEffectiveStoredFestivalOverrideDurable(nowMs = Date.now()): Promise<FestivalOverrideState | null> {
  const { data } = await readDurableNamespace<GmEventsStoreData>(NAMESPACE, readStore)
  return sanitizeFestivalOverrideState(pruneStore(data, nowMs).festivalOverride, nowMs)
}

export function addServerAnnouncement(event: ServerAnnouncementEvent): ServerAnnouncementEvent {
  const store = readStore()
  const deduped = store.announcements.filter((a) => a.announcementId !== event.announcementId)
  writeStore({
    ...store,
    announcements: [...deduped, event].slice(-50),
  })
  return event
}

export async function addServerAnnouncementDurable(
  event: ServerAnnouncementEvent,
  bearerToken?: string | null,
): Promise<ServerAnnouncementEvent> {
  await mutateDurableNamespace<GmEventsStoreData, ServerAnnouncementEvent>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const pruned = pruneStore(current)
      const deduped = pruned.announcements.filter((a) => a.announcementId !== event.announcementId)
      const next = { ...pruned, announcements: [...deduped, event].slice(-50) }
      return { next, changed: true, result: event }
    },
    onCommitLocal: writeStore,
  })

  if (event.variant === 'gm' && event.authorGameUid === '0000') {
    const token = await resolveBestToken(bearerToken)
    if (token) {
      await firestoreCommitDoc({
        docPath: `worldAnnouncements/${event.announcementId}`,
        fields: {
          announcementId: event.announcementId,
          authorUid: event.authorUid,
          authorName: event.authorName,
          authorGameUid: '0000',
          body: event.body,
          createdAtMs: event.createdAtMs,
          expiresAtMs: event.expiresAtMs,
        },
        bearerToken: token,
        serverTimestampFields: ['createdAt'],
        currentDocument: { exists: false },
      }).catch(() => {})
    }
  }
  return event
}

export function addServerGmDirective(event: ServerGmDirectiveEvent): ServerGmDirectiveEvent {
  const store = readStore()
  const deduped = store.directives.filter((d) => d.directiveId !== event.directiveId)
  writeStore({
    ...store,
    directives: [...deduped, event].slice(-100),
  })
  return event
}

export async function addServerGmDirectiveDurable(
  event: ServerGmDirectiveEvent,
  bearerToken?: string | null,
): Promise<ServerGmDirectiveEvent> {
  await mutateDurableNamespace<GmEventsStoreData, ServerGmDirectiveEvent>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const pruned = pruneStore(current)
      const deduped = pruned.directives.filter((d) => d.directiveId !== event.directiveId)
      const next = { ...pruned, directives: [...deduped, event].slice(-100) }
      return { next, changed: true, result: event }
    },
    onCommitLocal: writeStore,
  })

  const token = await resolveBestToken(bearerToken)
  if (token) {
    await firestoreCommitDoc({
      docPath: `gmDirectives/${event.directiveId}`,
      fields: {
        directiveId: event.directiveId,
        action: event.action,
        fromUid: event.fromUid,
        fromName: event.fromName,
        fromGameUid: event.fromGameUid,
        targetUid: event.targetUid,
        targetGameUid: event.targetGameUid,
        targetName: event.targetName,
        mapId: event.mapId,
        x: event.x,
        y: event.y,
        durationMin: event.durationMin ?? 0,
        reason: event.reason ?? '',
        createdAtMs: event.createdAtMs,
        consumed: false,
        consumedAtMs: null,
      },
      bearerToken: token,
      serverTimestampFields: ['createdAt', 'updatedAt'],
      currentDocument: { exists: false },
    }).catch(() => {})
  }
  return event
}

export function addServerGiftDrop(drop: ServerGiftDropEvent): ServerGiftDropEvent {
  const store = readStore()
  const deduped = store.giftDrops.filter((g) => g.dropId !== drop.dropId)
  writeStore({
    ...store,
    giftDrops: [...deduped, drop].slice(-50),
  })
  return drop
}

export async function addServerGiftDropDurable(
  drop: ServerGiftDropEvent,
  bearerToken?: string | null,
): Promise<ServerGiftDropEvent> {
  await mutateDurableNamespace<GmEventsStoreData, ServerGiftDropEvent>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const pruned = pruneStore(current)
      const deduped = pruned.giftDrops.filter((g) => g.dropId !== drop.dropId)
      const next = { ...pruned, giftDrops: [...deduped, drop].slice(-50) }
      return { next, changed: true, result: drop }
    },
    onCommitLocal: writeStore,
  })

  const token = await resolveBestToken(bearerToken)
  if (token) {
    await firestoreCommitDoc({
      docPath: `serverGiftDrops/${drop.dropId}`,
      fields: {
        dropId: drop.dropId,
        authorUid: drop.fromUid,
        authorName: drop.fromName,
        authorGameUid: drop.fromGameUid,
        subject: drop.subject,
        body: drop.body,
        gold: drop.gold,
        diamonds: drop.diamonds,
        itemId: drop.itemId,
        qty: drop.qty,
        plus: drop.plus,
        createdAtMs: drop.createdAtMs,
        expiresAtMs: drop.expiresAtMs,
      },
      bearerToken: token,
      serverTimestampFields: ['createdAt'],
      currentDocument: { exists: false },
    }).catch(() => {})
  }
  return drop
}

export function getActiveGiftDrops(): ServerGiftDropEvent[] {
  const nowMs = Date.now()
  return readStore()
    .giftDrops.filter((g) => g.expiresAtMs > nowMs)
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
}

export function ackServerGmDirective(directiveId: string, targetUid: string): boolean {
  const store = readStore()
  let updated = false
  const directives = store.directives.map((d) => {
    if (d.directiveId === directiveId && d.targetUid === targetUid && !d.consumed) {
      updated = true
      return { ...d, consumed: true, consumedAtMs: Date.now() }
    }
    return d
  })
  if (updated) {
    writeStore({ ...store, directives })
  }
  return updated
}

export async function ackServerGmDirectiveDurable(
  directiveId: string,
  targetUid: string,
  bearerToken?: string | null,
): Promise<boolean> {
  const nowMs = Date.now()
  const res = await mutateDurableNamespace<GmEventsStoreData, boolean>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const pruned = pruneStore(current, nowMs)
      let updated = false
      const directives = pruned.directives.map((d) => {
        if (d.directiveId === directiveId && d.targetUid === targetUid && !d.consumed) {
          updated = true
          return { ...d, consumed: true, consumedAtMs: nowMs }
        }
        return d
      })
      if (!updated) return { next: pruned, changed: false, result: false }
      return { next: { ...pruned, directives }, changed: true, result: true }
    },
    onCommitLocal: writeStore,
  })

  const token = await resolveBestToken(bearerToken)
  if (token) {
    await firestoreCommitDoc({
      docPath: `gmDirectives/${directiveId}`,
      fields: {
        consumed: true,
        consumedAtMs: nowMs,
      },
      bearerToken: token,
      updateMaskFieldPaths: ['consumed', 'consumedAtMs', 'updatedAt'],
      serverTimestampFields: ['updatedAt'],
    }).catch(() => {})
  }
  return res.result
}

function hydrateWorldStateFromFirestorePayload(
  pruned: GmEventsStoreData,
  fsData: Record<string, unknown>,
  nowMs: number,
): GmEventsStoreData {
  if (typeof fsData.payloadJson !== 'string') return pruned
  try {
    const parsed = JSON.parse(fsData.payloadJson) as Partial<GmEventsStoreData>
    const fsRates = getEffectiveServerRates(sanitizeServerRates(parsed.serverRates), nowMs)
    const fsClosed = sanitizeClosedCycles(parsed.closedWorldBossCycles)
    const fsBossRaw = sanitizeWorldBossTestState(parsed.worldBossTest, nowMs)
    const fsBoss = fsBossRaw && fsClosed.includes(fsBossRaw.cycleKey) ? null : fsBossRaw
    const fsFest = sanitizeFestivalOverrideState(parsed.festivalOverride, nowMs)

    const mergedClosed = [...new Set([...pruned.closedWorldBossCycles, ...fsClosed])].slice(-24)
    const useFsRates = fsRates.updatedAtMs > pruned.serverRates.updatedAtMs
    const useFsBoss =
      fsBoss && (!pruned.worldBossTest || fsBoss.startedAtMs > pruned.worldBossTest.startedAtMs)
    const useFsFest =
      fsFest && (!pruned.festivalOverride || fsFest.startedAtMs > pruned.festivalOverride.startedAtMs)

    return {
      ...pruned,
      serverRates: useFsRates ? fsRates : pruned.serverRates,
      closedWorldBossCycles: mergedClosed,
      worldBossTest: useFsBoss ? fsBoss : pruned.worldBossTest,
      festivalOverride: useFsFest ? fsFest : pruned.festivalOverride,
    }
  } catch {
    return pruned
  }
}

export function getPublicWorldEvents(sinceMs = 0): {
  announcements: ServerAnnouncementEvent[]
  serverRates: ServerRatesConfig
  worldBossTest: WorldBossTestState | null
  closedWorldBossCycles: string[]
  festivalOverride: FestivalOverrideState | null
  serverTimeMs: number
} {
  const nowMs = Date.now()
  const store = readStore()
  const announcements = store.announcements.filter(
    (a) => a.expiresAtMs > nowMs - 1000 && a.createdAtMs >= sinceMs,
  )
  return {
    announcements,
    serverRates: getEffectiveServerRates(store.serverRates, nowMs),
    worldBossTest: sanitizeWorldBossTestState(store.worldBossTest, nowMs),
    closedWorldBossCycles: store.closedWorldBossCycles,
    festivalOverride: sanitizeFestivalOverrideState(store.festivalOverride, nowMs),
    serverTimeMs: nowMs,
  }
}

export async function getPublicWorldEventsDurable(sinceMs = 0): Promise<ReturnType<typeof getPublicWorldEvents>> {
  const nowMs = Date.now()
  const { data } = await readDurableNamespace<GmEventsStoreData>(NAMESPACE, readStore)
  let pruned = pruneStore(data, nowMs)

  if (!hasRemoteDurableBackend()) {
    const saToken = await getFirestoreServiceAccountToken()
    if (saToken) {
      const fsDoc = await firestoreGetDoc('serverConfig/worldState', saToken)
      if (fsDoc.exists && fsDoc.data) {
        pruned = hydrateWorldStateFromFirestorePayload(pruned, fsDoc.data, nowMs)
      }
    }
  }

  const announcements = pruned.announcements.filter(
    (a) => a.expiresAtMs > nowMs - 1000 && a.createdAtMs >= sinceMs,
  )
  return {
    announcements,
    serverRates: getEffectiveServerRates(pruned.serverRates, nowMs),
    worldBossTest: sanitizeWorldBossTestState(pruned.worldBossTest, nowMs),
    closedWorldBossCycles: pruned.closedWorldBossCycles,
    festivalOverride: sanitizeFestivalOverrideState(pruned.festivalOverride, nowMs),
    serverTimeMs: nowMs,
  }
}

export function getEventsForUser(userId: string, sinceMs = 0): {
  announcements: ServerAnnouncementEvent[]
  directives: ServerGmDirectiveEvent[]
  giftDrops: ServerGiftDropEvent[]
  serverRates: ServerRatesConfig
  worldBossTest: WorldBossTestState | null
  closedWorldBossCycles: string[]
  festivalOverride: FestivalOverrideState | null
} {
  const nowMs = Date.now()
  const store = readStore()
  const announcements = store.announcements.filter(
    (a) => a.expiresAtMs > nowMs - 1000 && a.createdAtMs >= sinceMs,
  )
  const directives = store.directives.filter(
    (d) =>
      d.targetUid === userId &&
      !d.consumed &&
      d.createdAtMs >= nowMs - 90_000,
  )
  const giftDrops = store.giftDrops
    .filter((g) => g.expiresAtMs > nowMs)
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, 20)
  return {
    announcements,
    directives,
    giftDrops,
    serverRates: getEffectiveServerRates(store.serverRates, nowMs),
    worldBossTest: sanitizeWorldBossTestState(store.worldBossTest, nowMs),
    closedWorldBossCycles: store.closedWorldBossCycles,
    festivalOverride: sanitizeFestivalOverrideState(store.festivalOverride, nowMs),
  }
}

export async function getEventsForUserDurable(
  userId: string,
  sinceMs = 0,
  bearerToken?: string | null,
): Promise<ReturnType<typeof getEventsForUser>> {
  const nowMs = Date.now()
  const { data } = await readDurableNamespace<GmEventsStoreData>(NAMESPACE, readStore)
  let pruned = pruneStore(data, nowMs)

  const token = await resolveBestToken(bearerToken)
  if (token && !hasRemoteDurableBackend()) {
    const [worldStateDoc, fsGiftRows] = await Promise.all([
      firestoreGetDoc('serverConfig/worldState', token),
      firestoreListCollection('serverGiftDrops', token, { pageSize: 20, orderBy: 'createdAtMs desc' }),
    ])
    if (worldStateDoc.exists && worldStateDoc.data) {
      pruned = hydrateWorldStateFromFirestorePayload(pruned, worldStateDoc.data, nowMs)
    }
    if (fsGiftRows.length > 0 && pruned.giftDrops.length === 0) {
      pruned = {
        ...pruned,
        giftDrops: fsGiftRows
          .map((row) => ({
            dropId: String(row.data.dropId ?? row.id),
            fromUid: String(row.data.authorUid ?? row.data.fromUid ?? ''),
            fromName: String(row.data.authorName ?? row.data.fromName ?? 'GM'),
            fromGameUid: String(row.data.authorGameUid ?? row.data.fromGameUid ?? '0000'),
            subject: String(row.data.subject ?? ''),
            body: String(row.data.body ?? ''),
            gold: Number(row.data.gold ?? 0),
            diamonds: Number(row.data.diamonds ?? 0),
            itemId: typeof row.data.itemId === 'string' ? row.data.itemId : null,
            qty: Number(row.data.qty ?? 0),
            plus: Number(row.data.plus ?? 0),
            createdAtMs: Number(row.data.createdAtMs ?? 0),
            expiresAtMs: Number(row.data.expiresAtMs ?? 0),
          }))
          .filter((g) => g.expiresAtMs > nowMs),
      }
    }
  }

  const announcements = pruned.announcements.filter(
    (a) => a.expiresAtMs > nowMs - 1000 && a.createdAtMs >= sinceMs,
  )
  const directives = pruned.directives.filter(
    (d) =>
      d.targetUid === userId &&
      !d.consumed &&
      d.createdAtMs >= nowMs - 90_000,
  )
  const giftDrops = pruned.giftDrops
    .filter((g) => g.expiresAtMs > nowMs)
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, 20)

  return {
    announcements,
    directives,
    giftDrops,
    serverRates: getEffectiveServerRates(pruned.serverRates, nowMs),
    worldBossTest: sanitizeWorldBossTestState(pruned.worldBossTest, nowMs),
    closedWorldBossCycles: pruned.closedWorldBossCycles,
    festivalOverride: sanitizeFestivalOverrideState(pruned.festivalOverride, nowMs),
  }
}

