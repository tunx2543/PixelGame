import fs from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_SERVER_RATES,
  getEffectiveServerRates,
  sanitizeServerRates,
  type ServerRatesConfig,
} from '@/lib/game/server-rates'

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
}

const PRIMARY_DIR = path.join(process.cwd(), '.data')
const PRIMARY_FILE = path.join(PRIMARY_DIR, 'gm-events.json')
const FALLBACK_FILE = '/tmp/pixelquest-gm-events.json'

let memoryStore: GmEventsStoreData | null = null
const worldNewsRateLimits = new Map<string, number>()

function resolveStorePath(): string {
  try {
    fs.mkdirSync(PRIMARY_DIR, { recursive: true })
    fs.accessSync(PRIMARY_DIR, fs.constants.W_OK)
    return PRIMARY_FILE
  } catch {
    return FALLBACK_FILE
  }
}

function pruneStore(data: GmEventsStoreData, nowMs = Date.now()): GmEventsStoreData {
  const annCutoff = nowMs - 2 * 60_000
  const dirCutoff = nowMs - 5 * 60_000
  const dropCutoff = nowMs - 14 * 24 * 60 * 60_000
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
  }
}

function readStore(): GmEventsStoreData {
  if (memoryStore) {
    memoryStore = pruneStore(memoryStore)
    return memoryStore
  }
  const candidates = [PRIMARY_FILE, FALLBACK_FILE]
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8')
        const parsed = JSON.parse(raw) as Partial<GmEventsStoreData>
        memoryStore = pruneStore({
          announcements: Array.isArray(parsed.announcements) ? parsed.announcements : [],
          directives: Array.isArray(parsed.directives) ? parsed.directives : [],
          giftDrops: Array.isArray(parsed.giftDrops) ? parsed.giftDrops : [],
          serverRates: sanitizeServerRates(parsed.serverRates),
        })
        return memoryStore
      }
    } catch {
      // Ignore unreadable store and fallback
    }
  }
  memoryStore = {
    announcements: [],
    directives: [],
    giftDrops: [],
    serverRates: { ...DEFAULT_SERVER_RATES },
  }
  return memoryStore
}

function writeStore(next: GmEventsStoreData): void {
  const pruned = pruneStore(next)
  memoryStore = pruned
  const target = resolveStorePath()
  try {
    fs.writeFileSync(target, JSON.stringify(pruned, null, 2), 'utf8')
  } catch {
    try {
      fs.writeFileSync(FALLBACK_FILE, JSON.stringify(pruned, null, 2), 'utf8')
    } catch {
      // Memory cache stays active
    }
  }
}

export function resetGmEventsMemoryCacheForTests(): void {
  memoryStore = null
}

export function canPublishWorldNews(uid: string, cooldownMs = 4_000): boolean {
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
    serverTimeMs: nowMs,
  }
}

export function getEventsForUser(userId: string, sinceMs = 0): {
  announcements: ServerAnnouncementEvent[]
  directives: ServerGmDirectiveEvent[]
  giftDrops: ServerGiftDropEvent[]
  serverRates: ServerRatesConfig
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
  }
}
