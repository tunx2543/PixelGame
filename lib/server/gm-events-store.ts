import {
  getDefaultStorePaths,
  getGlobalSingleton,
  isCloudflareWorkersRuntime,
  readJsonStoreFile,
  writeJsonStoreFile,
  type StorePersistenceMode,
} from './runtime-store'
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

function pruneStore(data: GmEventsStoreData, nowMs = Date.now()): GmEventsStoreData {
  const annCutoff = nowMs - 2 * 60_000
  const dirCutoff = nowMs - 5 * 60_000
  const dropCutoff = nowMs - 14 * 24 * 60 * 60_000
  const closedWorldBossCycles = sanitizeClosedCycles(data.closedWorldBossCycles)
  const rawTest = sanitizeWorldBossTestState(data.worldBossTest, nowMs)
  const worldBossTest =
    rawTest && closedWorldBossCycles.includes(rawTest.cycleKey) ? null : rawTest
  return {
    announcements: data.announcements
      .filter((a) => a.createdAtMs >= annCutoff)
      .slice(-50),
    directives: data.directives
      .filter((d) => d.createdAtMs >= dirCutoff)
      .slice(-100),
    giftDrops: (data.giftDrops ?? [])
      .filter((g) => g.expiresAtMs > nowMs && g.createdAtMs >= dropCutoff)
      .slice(-50),
    serverRates: getEffectiveServerRates(data.serverRates, nowMs),
    worldBossTest,
    closedWorldBossCycles,
    festivalOverride: sanitizeFestivalOverrideState(data.festivalOverride, nowMs),
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
    slot.data = pruneStore({
      announcements: Array.isArray(parsed.announcements) ? parsed.announcements : [],
      directives: Array.isArray(parsed.directives) ? parsed.directives : [],
      giftDrops: Array.isArray(parsed.giftDrops) ? parsed.giftDrops : [],
      serverRates: sanitizeServerRates(parsed.serverRates),
      worldBossTest: sanitizeWorldBossTestState(parsed.worldBossTest),
      closedWorldBossCycles: sanitizeClosedCycles(parsed.closedWorldBossCycles),
      festivalOverride: sanitizeFestivalOverrideState(parsed.festivalOverride),
    })
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

function writeStore(next: GmEventsStoreData): void {
  const slot = getSlot()
  const pruned = pruneStore(next)
  slot.data = pruned
  slot.mode = writeJsonStoreFile(PRIMARY_DIR, PRIMARY_FILE, FALLBACK_FILE, JSON.stringify(pruned, null, 2))
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

export function setServerRates(nextRates: ServerRatesConfig): ServerRatesConfig {
  const store = readStore()
  const sanitized = getEffectiveServerRates(sanitizeServerRates(nextRates))
  writeStore({
    ...store,
    serverRates: sanitized,
  })
  return sanitized
}

export function getEffectiveStoredServerRates(nowMs = Date.now()): ServerRatesConfig {
  const store = readStore()
  return getEffectiveServerRates(store.serverRates, nowMs)
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

export function getEffectiveStoredWorldBossTest(nowMs = Date.now()): WorldBossTestState | null {
  const store = readStore()
  return sanitizeWorldBossTestState(store.worldBossTest, nowMs)
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

export function getEffectiveClosedWorldBossCycles(): string[] {
  return readStore().closedWorldBossCycles
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

export function getEffectiveStoredFestivalOverride(nowMs = Date.now()): FestivalOverrideState | null {
  const store = readStore()
  return sanitizeFestivalOverrideState(store.festivalOverride, nowMs)
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

export function addServerGmDirective(event: ServerGmDirectiveEvent): ServerGmDirectiveEvent {
  const store = readStore()
  const deduped = store.directives.filter((d) => d.directiveId !== event.directiveId)
  writeStore({
    ...store,
    directives: [...deduped, event].slice(-100),
  })
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
