import crypto from 'node:crypto'
import firebaseConfig from '@/firebase-applet-config.json'
import {
  getGlobalSingleton,
  getRuntimeBinding,
  getRuntimeEnv,
  isCloudflareWorkersRuntime,
  type StorePersistenceMode,
} from './runtime-store'

export interface CloudflareD1PreparedStatement {
  bind: (...values: unknown[]) => CloudflareD1PreparedStatement
  first: <T = Record<string, unknown>>(colName?: string) => Promise<T | null>
  run: () => Promise<{ success?: boolean; meta?: { changes?: number } }>
  all: <T = Record<string, unknown>>() => Promise<{ results?: T[]; success?: boolean }>
}

export interface CloudflareD1Database {
  prepare: (query: string) => CloudflareD1PreparedStatement
  exec?: (query: string) => Promise<unknown>
}

export interface CloudflareKVNamespace {
  get: <T = unknown>(key: string, type?: 'text' | 'json') => Promise<T | null>
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>
  delete: (key: string) => Promise<void>
}

export interface CloudflareDurableObjectStub {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export interface CloudflareDurableObjectNamespace {
  idFromName: (name: string) => unknown
  get: (id: unknown) => CloudflareDurableObjectStub
}

interface Envelope<T> {
  version: number
  updatedAtMs: number
  data: T
}

interface ServiceAccountCreds {
  clientEmail: string
  privateKey: string
  projectId: string
}

interface SaTokenSlot {
  cacheKey: string
  accessToken: string
  expiresAtMs: number
}

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(firebaseConfig.firestoreDatabaseId)}`
const FIRESTORE_DOC_PREFIX = `projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`

function getD1Binding(): CloudflareD1Database | null {
  const db =
    getRuntimeBinding<CloudflareD1Database>('PIXELQUEST_DB') ??
    getRuntimeBinding<CloudflareD1Database>('DB')
  return db && typeof db.prepare === 'function' ? db : null
}

function getKvBinding(): CloudflareKVNamespace | null {
  const kv =
    getRuntimeBinding<CloudflareKVNamespace>('PIXELQUEST_KV') ??
    getRuntimeBinding<CloudflareKVNamespace>('KV')
  return kv && typeof kv.get === 'function' && typeof kv.put === 'function' ? kv : null
}

function getDoBinding(): CloudflareDurableObjectNamespace | null {
  const ns = getRuntimeBinding<CloudflareDurableObjectNamespace>('PIXELQUEST_STORE_DO')
  return ns && typeof ns.idFromName === 'function' && typeof ns.get === 'function' ? ns : null
}

function getUpstashConfig(): { url: string; token: string } | null {
  const url = getRuntimeEnv('UPSTASH_REDIS_REST_URL')
  const token = getRuntimeEnv('UPSTASH_REDIS_REST_TOKEN')
  if (!url || !token) return null
  return { url: url.replace(/\/+$/, ''), token }
}

function parseServiceAccountCredentials(): ServiceAccountCreds | null {
  const rawJson = getRuntimeEnv('FIREBASE_SERVICE_ACCOUNT_JSON')
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as {
        client_email?: string
        private_key?: string
        project_id?: string
      }
      if (parsed?.client_email && parsed?.private_key) {
        return {
          clientEmail: parsed.client_email.trim(),
          privateKey: parsed.private_key.replace(/\\n/g, '\n'),
          projectId: (parsed.project_id || firebaseConfig.projectId).trim(),
        }
      }
    } catch {
      // Ignore malformed JSON and try individual env keys
    }
  }
  const clientEmail = getRuntimeEnv('FIREBASE_CLIENT_EMAIL')
  const privateKeyRaw = getRuntimeEnv('FIREBASE_PRIVATE_KEY')
  if (clientEmail && privateKeyRaw) {
    return {
      clientEmail,
      privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
      projectId: firebaseConfig.projectId,
    }
  }
  return null
}

export function hasRemoteDurableBackend(): boolean {
  return Boolean(
    getD1Binding() ||
      getDoBinding() ||
      getKvBinding() ||
      getUpstashConfig() ||
      parseServiceAccountCredentials(),
  )
}

export function detectDurableBackendMode(localFallbackMode?: StorePersistenceMode): StorePersistenceMode {
  if (getD1Binding()) return 'durable_d1'
  if (getDoBinding()) return 'durable_do'
  if (getKvBinding()) return 'durable_kv'
  if (getUpstashConfig()) return 'durable_redis'
  if (parseServiceAccountCredentials()) return 'durable_firestore'
  if (localFallbackMode) return localFallbackMode
  return isCloudflareWorkersRuntime() ? 'isolate_memory_only' : 'durable_disk'
}

// ---------- Service Account OAuth2 (Pure node:crypto, Workers safe) ----------

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export async function getFirestoreServiceAccountToken(): Promise<string | null> {
  const creds = parseServiceAccountCredentials()
  if (!creds) return null

  const cacheKey = `${creds.projectId}:${creds.clientEmail}`
  const slot = getGlobalSingleton<{ entry: SaTokenSlot | null }>('pixelquest.saTokenCache', () => ({
    entry: null,
  }))
  const nowMs = Date.now()
  if (slot.entry && slot.entry.cacheKey === cacheKey && nowMs < slot.entry.expiresAtMs - 60_000) {
    return slot.entry.accessToken
  }

  const nowSec = Math.floor(nowMs / 1000)
  const headerB64 = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claimB64 = base64UrlEncode(
    JSON.stringify({
      iss: creds.clientEmail,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: nowSec,
      exp: nowSec + 3600,
    }),
  )
  const signingInput = `${headerB64}.${claimB64}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(signingInput)
  signer.end()
  const sigB64 = base64UrlEncode(signer.sign(creds.privateKey))
  const assertion = `${signingInput}.${sigB64}`

  const form = new URLSearchParams()
  form.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer')
  form.set('assertion', assertion)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = (await res.json().catch(() => null)) as {
    access_token?: string
    expires_in?: number
  } | null
  if (!json?.access_token) return null

  slot.entry = {
    cacheKey,
    accessToken: json.access_token,
    expiresAtMs: nowMs + Math.max(300, Number(json.expires_in ?? 3600)) * 1000,
  }
  return json.access_token
}

// ---------- Firestore REST Helpers (Caller Bearer Token or Service Account) ----------

export interface FirestoreRestValue {
  stringValue?: string
  integerValue?: string
  doubleValue?: number
  booleanValue?: boolean
  nullValue?: null
  timestampValue?: string
  mapValue?: { fields?: Record<string, FirestoreRestValue> }
  arrayValue?: { values?: FirestoreRestValue[] }
}

export function decodeFirestoreValue(val: FirestoreRestValue | undefined): unknown {
  if (!val || typeof val !== 'object') return undefined
  if ('stringValue' in val) return String(val.stringValue ?? '')
  if ('integerValue' in val) return Number(val.integerValue ?? 0)
  if ('doubleValue' in val) return Number(val.doubleValue ?? 0)
  if ('booleanValue' in val) return Boolean(val.booleanValue)
  if ('nullValue' in val) return null
  if ('timestampValue' in val) return String(val.timestampValue ?? '')
  if ('mapValue' in val) {
    const out: Record<string, unknown> = {}
    const fields = val.mapValue?.fields ?? {}
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(v)
    }
    return out
  }
  if ('arrayValue' in val) {
    return (val.arrayValue?.values ?? []).map((item) => decodeFirestoreValue(item))
  }
  return undefined
}

export function encodeFirestoreValue(val: unknown): FirestoreRestValue {
  if (val === null || val === undefined) return { nullValue: null }
  if (typeof val === 'boolean') return { booleanValue: val }
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { integerValue: '0' }
    if (Number.isInteger(val) && Number.isSafeInteger(val)) {
      return { integerValue: String(val) }
    }
    return { doubleValue: val }
  }
  if (typeof val === 'string') return { stringValue: val }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => encodeFirestoreValue(item)) } }
  }
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreRestValue> = {}
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = encodeFirestoreValue(v)
      }
    }
    return { mapValue: { fields } }
  }
  return { stringValue: String(val) }
}

export function encodeFirestoreFields(obj: Record<string, unknown>): Record<string, FirestoreRestValue> {
  const out: Record<string, FirestoreRestValue> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = encodeFirestoreValue(v)
    }
  }
  return out
}

export function decodeFirestoreDocFields(fields: Record<string, FirestoreRestValue> | undefined): Record<string, unknown> {
  if (!fields) return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fields)) {
    out[k] = decodeFirestoreValue(v)
  }
  return out
}

function encodeDocPath(docPath: string): string {
  return docPath
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join('/')
}

export async function firestoreGetDoc(
  docPath: string,
  bearerToken: string,
): Promise<{ exists: boolean; data: Record<string, unknown> | null; updateTime?: string }> {
  try {
    const res = await fetch(`${FIRESTORE_BASE}/documents/${encodeDocPath(docPath)}`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      cache: 'no-store',
    })
    if (res.status === 404) {
      return { exists: false, data: null }
    }
    if (!res.ok) {
      return { exists: false, data: null }
    }
    const json = (await res.json().catch(() => null)) as {
      fields?: Record<string, FirestoreRestValue>
      updateTime?: string
    } | null
    if (!json?.fields) return { exists: false, data: null }
    return {
      exists: true,
      data: decodeFirestoreDocFields(json.fields),
      updateTime: json.updateTime,
    }
  } catch {
    return { exists: false, data: null }
  }
}

export async function firestoreCommitDoc(input: {
  docPath: string
  fields: Record<string, unknown>
  bearerToken: string
  serverTimestampFields?: string[]
  updateMaskFieldPaths?: string[]
  currentDocument?: { exists?: boolean; updateTime?: string }
}): Promise<{ ok: boolean; status: number }> {
  try {
    const encodedFields = encodeFirestoreFields(input.fields)
    const write: Record<string, unknown> = {
      update: {
        name: `${FIRESTORE_DOC_PREFIX}/${input.docPath.replace(/^\/+/, '')}`,
        fields: encodedFields,
      },
    }
    if (input.updateMaskFieldPaths && input.updateMaskFieldPaths.length > 0) {
      write.updateMask = { fieldPaths: input.updateMaskFieldPaths }
    }
    if (input.serverTimestampFields && input.serverTimestampFields.length > 0) {
      write.updateTransforms = input.serverTimestampFields.map((fieldPath) => ({
        fieldPath,
        setToServerValue: 'REQUEST_TIME',
      }))
    }
    if (input.currentDocument) {
      write.currentDocument = input.currentDocument
    }

    const res = await fetch(`${FIRESTORE_BASE}/documents:commit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.bearerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ writes: [write] }),
      cache: 'no-store',
    })
    return { ok: res.ok, status: res.status }
  } catch {
    return { ok: false, status: 500 }
  }
}

export async function firestoreDeleteDoc(
  docPath: string,
  bearerToken: string,
): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(`${FIRESTORE_BASE}/documents/${encodeDocPath(docPath)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${bearerToken}` },
      cache: 'no-store',
    })
    return { ok: res.ok || res.status === 404, status: res.status }
  } catch {
    return { ok: false, status: 500 }
  }
}

export async function firestoreListCollection(
  collectionPath: string,
  bearerToken: string,
  opts?: { pageSize?: number; orderBy?: string },
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  try {
    const params = new URLSearchParams()
    params.set('pageSize', String(Math.max(1, Math.min(100, opts?.pageSize ?? 50))))
    if (opts?.orderBy) {
      params.set('orderBy', opts.orderBy)
    }
    const res = await fetch(`${FIRESTORE_BASE}/documents/${encodeDocPath(collectionPath)}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const json = (await res.json().catch(() => null)) as {
      documents?: Array<{ name?: string; fields?: Record<string, FirestoreRestValue> }>
    } | null
    if (!Array.isArray(json?.documents)) return []
    return json.documents
      .filter((d) => d?.fields)
      .map((d) => ({
        id: (d.name ?? '').split('/').pop() ?? '',
        data: decodeFirestoreDocFields(d.fields),
      }))
  } catch {
    return []
  }
}

export async function firestoreRunStructuredQuery(
  structuredQuery: Record<string, unknown>,
  bearerToken: string,
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  try {
    const res = await fetch(`${FIRESTORE_BASE}/documents:runQuery`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ structuredQuery }),
      cache: 'no-store',
    })
    if (!res.ok) return []
    const rows = (await res.json().catch(() => null)) as Array<{
      document?: { name?: string; fields?: Record<string, FirestoreRestValue> }
    }> | null
    if (!Array.isArray(rows)) return []
    return rows
      .filter((r) => r?.document?.fields)
      .map((r) => ({
        id: (r.document!.name ?? '').split('/').pop() ?? '',
        data: decodeFirestoreDocFields(r.document!.fields),
      }))
  } catch {
    return []
  }
}

// ---------- Cloudflare D1 Helpers ----------

const d1InitializedSet = new WeakSet<CloudflareD1Database>()

async function ensureD1Schema(db: CloudflareD1Database): Promise<void> {
  if (d1InitializedSet.has(db)) return
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS pixelquest_kv_store (k TEXT PRIMARY KEY, value TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL)',
    )
    .run()
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS pixelquest_locks (k TEXT PRIMARY KEY, owner TEXT NOT NULL, expires_at INTEGER NOT NULL)',
    )
    .run()
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS pixelquest_rate_limits (k TEXT PRIMARY KEY, count INTEGER NOT NULL, window_end INTEGER NOT NULL)',
    )
    .run()
  d1InitializedSet.add(db)
}

async function d1ReadEnvelope<T>(db: CloudflareD1Database, key: string): Promise<Envelope<T> | null> {
  await ensureD1Schema(db)
  const row = await db
    .prepare('SELECT value, version, updated_at FROM pixelquest_kv_store WHERE k = ?')
    .bind(key)
    .first<{ value?: string; version?: number; updated_at?: number }>()
  if (!row || typeof row.value !== 'string') return null
  try {
    return {
      version: Number(row.version ?? 1),
      updatedAtMs: Number(row.updated_at ?? Date.now()),
      data: JSON.parse(row.value) as T,
    }
  } catch {
    return null
  }
}

async function d1WriteEnvelopeCas<T>(
  db: CloudflareD1Database,
  key: string,
  expectedVersion: number | null,
  nextData: T,
): Promise<boolean> {
  await ensureD1Schema(db)
  const nowMs = Date.now()
  const payload = JSON.stringify(nextData)
  if (expectedVersion === null) {
    const res = await db
      .prepare('INSERT OR IGNORE INTO pixelquest_kv_store (k, value, version, updated_at) VALUES (?, ?, 1, ?)')
      .bind(key, payload, nowMs)
      .run()
    return (res.meta?.changes ?? 0) === 1
  }
  const res = await db
    .prepare('UPDATE pixelquest_kv_store SET value = ?, version = ?, updated_at = ? WHERE k = ? AND version = ?')
    .bind(payload, expectedVersion + 1, nowMs, key, expectedVersion)
    .run()
  return (res.meta?.changes ?? 0) === 1
}

async function d1ClaimLock(db: CloudflareD1Database, key: string, owner: string, ttlMs: number): Promise<boolean> {
  await ensureD1Schema(db)
  const nowMs = Date.now()
  const expiresAt = nowMs + Math.max(1000, ttlMs)
  await db.prepare('DELETE FROM pixelquest_locks WHERE k = ? AND expires_at <= ?').bind(key, nowMs).run()
  const res = await db
    .prepare('INSERT OR IGNORE INTO pixelquest_locks (k, owner, expires_at) VALUES (?, ?, ?)')
    .bind(key, owner, expiresAt)
    .run()
  return (res.meta?.changes ?? 0) === 1
}

async function d1CheckRateLimit(
  db: CloudflareD1Database,
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  await ensureD1Schema(db)
  const nowMs = Date.now()
  const nextWindowEnd = nowMs + Math.max(1000, windowMs)
  await db.prepare('DELETE FROM pixelquest_rate_limits WHERE k = ? AND window_end <= ?').bind(key, nowMs).run()
  await db
    .prepare(
      'INSERT INTO pixelquest_rate_limits (k, count, window_end) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET count = count + 1',
    )
    .bind(key, nextWindowEnd)
    .run()
  const row = await db
    .prepare('SELECT count FROM pixelquest_rate_limits WHERE k = ?')
    .bind(key)
    .first<{ count?: number }>()
  return Number(row?.count ?? 1) <= maxRequests
}

// ---------- Cloudflare KV Helpers ----------

async function kvReadEnvelope<T>(kv: CloudflareKVNamespace, key: string): Promise<Envelope<T> | null> {
  const raw = await kv.get<string>(key, 'text')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Envelope<T>>
    if (parsed && typeof parsed === 'object' && 'data' in parsed && typeof parsed.version === 'number') {
      return parsed as Envelope<T>
    }
    return { version: 1, updatedAtMs: Date.now(), data: parsed as T }
  } catch {
    return null
  }
}

async function kvWriteEnvelope<T>(kv: CloudflareKVNamespace, key: string, version: number, data: T): Promise<void> {
  const env: Envelope<T> = { version, updatedAtMs: Date.now(), data }
  await kv.put(key, JSON.stringify(env))
}

async function kvClaimLock(kv: CloudflareKVNamespace, key: string, owner: string, ttlMs: number): Promise<boolean> {
  const nowMs = Date.now()
  const existingRaw = await kv.get<string>(key, 'text')
  if (existingRaw) {
    try {
      const parsed = JSON.parse(existingRaw) as { expiresAt?: number }
      if (typeof parsed.expiresAt === 'number' && parsed.expiresAt > nowMs) {
        return false
      }
    } catch {
      return false
    }
  }
  const ttlSec = Math.max(60, Math.ceil(ttlMs / 1000))
  await kv.put(key, JSON.stringify({ owner, expiresAt: nowMs + ttlMs }), { expirationTtl: ttlSec })
  return true
}

async function kvCheckRateLimit(
  kv: CloudflareKVNamespace,
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const nowMs = Date.now()
  const raw = await kv.get<string>(key, 'text')
  let count = 0
  let windowEnd = nowMs + windowMs
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { count?: number; windowEnd?: number }
      if (typeof parsed.windowEnd === 'number' && parsed.windowEnd > nowMs) {
        count = Number(parsed.count ?? 0)
        windowEnd = parsed.windowEnd
      }
    } catch {
      count = 0
    }
  }
  if (count >= maxRequests) return false
  const ttlSec = Math.max(60, Math.ceil((windowEnd - nowMs) / 1000))
  await kv.put(key, JSON.stringify({ count: count + 1, windowEnd }), { expirationTtl: ttlSec })
  return true
}

// ---------- Cloudflare Durable Object Helpers ----------

async function doCall<T>(ns: CloudflareDurableObjectNamespace, payload: Record<string, unknown>): Promise<T | null> {
  try {
    const id = ns.idFromName('pixelquest-global-store')
    const stub = ns.get(id)
    const res = await stub.fetch('https://pixelquest-do.internal/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return null
    return (await res.json().catch(() => null)) as T | null
  } catch {
    return null
  }
}

// ---------- Upstash Redis REST Helpers ----------

async function upstashCmd<T = unknown>(cfg: { url: string; token: string }, args: (string | number)[]): Promise<T | null> {
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = (await res.json().catch(() => null)) as { result?: T; error?: string } | null
  if (!json || json.error) return null
  return json.result ?? null
}

async function upstashReadEnvelope<T>(cfg: { url: string; token: string }, key: string): Promise<Envelope<T> | null> {
  const raw = await upstashCmd<string | null>(cfg, ['GET', key])
  if (!raw || typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw) as Partial<Envelope<T>>
    if (parsed && typeof parsed === 'object' && 'data' in parsed && typeof parsed.version === 'number') {
      return parsed as Envelope<T>
    }
    return { version: 1, updatedAtMs: Date.now(), data: parsed as T }
  } catch {
    return null
  }
}

async function upstashWriteEnvelope<T>(
  cfg: { url: string; token: string },
  key: string,
  version: number,
  data: T,
): Promise<boolean> {
  const env: Envelope<T> = { version, updatedAtMs: Date.now(), data }
  const res = await upstashCmd<string>(cfg, ['SET', key, JSON.stringify(env)])
  return res === 'OK'
}

// ---------- Firestore Server State Helpers (via Service Account) ----------

function safeDocIdForBackend(raw: string): string {
  const clean = raw.replace(/[^a-zA-Z0-9_-]/g, '_')
  if (clean.length <= 120) return clean || 'empty'
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 64)
}

async function fsReadEnvelope<T>(namespace: string, token: string): Promise<{ env: Envelope<T>; updateTime?: string } | null> {
  const doc = await firestoreGetDoc(`_serverState/${safeDocIdForBackend(namespace)}`, token)
  if (!doc.exists || !doc.data) return null
  const payloadJson = typeof doc.data.payloadJson === 'string' ? doc.data.payloadJson : ''
  if (!payloadJson) return null
  try {
    return {
      env: {
        version: Number(doc.data.version ?? 1),
        updatedAtMs: Number(doc.data.updatedAtMs ?? Date.now()),
        data: JSON.parse(payloadJson) as T,
      },
      updateTime: doc.updateTime,
    }
  } catch {
    return null
  }
}

async function fsWriteEnvelopeCas<T>(
  namespace: string,
  token: string,
  version: number,
  data: T,
  currentUpdateTime?: string,
): Promise<boolean> {
  const res = await firestoreCommitDoc({
    docPath: `_serverState/${safeDocIdForBackend(namespace)}`,
    fields: {
      namespace,
      version,
      updatedAtMs: Date.now(),
      payloadJson: JSON.stringify(data),
    },
    bearerToken: token,
    currentDocument: currentUpdateTime ? { updateTime: currentUpdateTime } : { exists: false },
  })
  return res.ok
}

// ---------- Unified Cross-Isolate Operations ----------

export async function readDurableNamespace<T>(
  namespace: string,
  fallbackRead: () => T,
): Promise<{ data: T; mode: StorePersistenceMode }> {
  const key = `pq:ns:${namespace}`

  const d1 = getD1Binding()
  if (d1) {
    try {
      const env = await d1ReadEnvelope<T>(d1, key)
      return { data: env ? env.data : fallbackRead(), mode: 'durable_d1' }
    } catch {
      return { data: fallbackRead(), mode: 'durable_d1' }
    }
  }

  const doNs = getDoBinding()
  if (doNs) {
    const res = await doCall<{ found?: boolean; envelope?: Envelope<T> }>(doNs, { op: 'get', key })
    if (res?.found && res.envelope) {
      return { data: res.envelope.data, mode: 'durable_do' }
    }
    return { data: fallbackRead(), mode: 'durable_do' }
  }

  const kv = getKvBinding()
  if (kv) {
    try {
      const env = await kvReadEnvelope<T>(kv, key)
      return { data: env ? env.data : fallbackRead(), mode: 'durable_kv' }
    } catch {
      return { data: fallbackRead(), mode: 'durable_kv' }
    }
  }

  const upstash = getUpstashConfig()
  if (upstash) {
    try {
      const env = await upstashReadEnvelope<T>(upstash, key)
      return { data: env ? env.data : fallbackRead(), mode: 'durable_redis' }
    } catch {
      return { data: fallbackRead(), mode: 'durable_redis' }
    }
  }

  const saToken = await getFirestoreServiceAccountToken()
  if (saToken) {
    try {
      const res = await fsReadEnvelope<T>(namespace, saToken)
      return { data: res ? res.env.data : fallbackRead(), mode: 'durable_firestore' }
    } catch {
      return { data: fallbackRead(), mode: 'durable_firestore' }
    }
  }

  return {
    data: fallbackRead(),
    mode: isCloudflareWorkersRuntime() ? 'isolate_memory_only' : 'durable_disk',
  }
}

export async function mutateDurableNamespace<T, R = void>(input: {
  namespace: string
  fallbackInit: () => T
  mutator: (current: T) => { next: T; changed: boolean; result: R } | Promise<{ next: T; changed: boolean; result: R }>
  onCommitLocal: (next: T) => StorePersistenceMode
}): Promise<{ result: R; mode: StorePersistenceMode; data: T }> {
  const key = `pq:ns:${input.namespace}`

  const d1 = getD1Binding()
  if (d1) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const existing = await d1ReadEnvelope<T>(d1, key)
      const base = existing ? existing.data : input.fallbackInit()
      const outcome = await input.mutator(base)
      if (!outcome.changed) {
        input.onCommitLocal(outcome.next)
        return { result: outcome.result, mode: 'durable_d1', data: outcome.next }
      }
      const ok = await d1WriteEnvelopeCas(d1, key, existing ? existing.version : null, outcome.next)
      if (ok) {
        input.onCommitLocal(outcome.next)
        return { result: outcome.result, mode: 'durable_d1', data: outcome.next }
      }
    }
  }

  const doNs = getDoBinding()
  if (doNs) {
    const existing = await doCall<{ found?: boolean; envelope?: Envelope<T> }>(doNs, { op: 'get', key })
    const base = existing?.found && existing.envelope ? existing.envelope.data : input.fallbackInit()
    const outcome = await input.mutator(base)
    if (outcome.changed) {
      await doCall(doNs, {
        op: 'set',
        key,
        envelope: {
          version: (existing?.envelope?.version ?? 0) + 1,
          updatedAtMs: Date.now(),
          data: outcome.next,
        },
      })
    }
    input.onCommitLocal(outcome.next)
    return { result: outcome.result, mode: 'durable_do', data: outcome.next }
  }

  const kv = getKvBinding()
  if (kv) {
    const existing = await kvReadEnvelope<T>(kv, key)
    const base = existing ? existing.data : input.fallbackInit()
    const outcome = await input.mutator(base)
    if (outcome.changed) {
      await kvWriteEnvelope(kv, key, (existing?.version ?? 0) + 1, outcome.next)
    }
    input.onCommitLocal(outcome.next)
    return { result: outcome.result, mode: 'durable_kv', data: outcome.next }
  }

  const upstash = getUpstashConfig()
  if (upstash) {
    const existing = await upstashReadEnvelope<T>(upstash, key)
    const base = existing ? existing.data : input.fallbackInit()
    const outcome = await input.mutator(base)
    if (outcome.changed) {
      await upstashWriteEnvelope(upstash, key, (existing?.version ?? 0) + 1, outcome.next)
    }
    input.onCommitLocal(outcome.next)
    return { result: outcome.result, mode: 'durable_redis', data: outcome.next }
  }

  const saToken = await getFirestoreServiceAccountToken()
  if (saToken) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await fsReadEnvelope<T>(input.namespace, saToken)
      const base = existing ? existing.env.data : input.fallbackInit()
      const outcome = await input.mutator(base)
      if (!outcome.changed) {
        input.onCommitLocal(outcome.next)
        return { result: outcome.result, mode: 'durable_firestore', data: outcome.next }
      }
      const ok = await fsWriteEnvelopeCas(
        input.namespace,
        saToken,
        (existing?.env.version ?? 0) + 1,
        outcome.next,
        existing?.updateTime,
      )
      if (ok) {
        input.onCommitLocal(outcome.next)
        return { result: outcome.result, mode: 'durable_firestore', data: outcome.next }
      }
    }
  }

  const localBase = input.fallbackInit()
  const outcome = await input.mutator(localBase)
  const localMode = outcome.changed
    ? input.onCommitLocal(outcome.next)
    : isCloudflareWorkersRuntime()
      ? 'isolate_memory_only'
      : 'durable_disk'
  return { result: outcome.result, mode: localMode, data: outcome.next }
}

export async function claimDurableLock(
  lockKey: string,
  owner: string,
  ttlMs: number,
  fallbackClaim: () => boolean,
): Promise<boolean> {
  const key = `pq:lock:${lockKey}`

  const d1 = getD1Binding()
  if (d1) {
    try {
      return await d1ClaimLock(d1, key, owner, ttlMs)
    } catch {
      return fallbackClaim()
    }
  }

  const doNs = getDoBinding()
  if (doNs) {
    const res = await doCall<{ claimed?: boolean }>(doNs, { op: 'claimLock', key, owner, ttlMs })
    if (res && typeof res.claimed === 'boolean') return res.claimed
  }

  const upstash = getUpstashConfig()
  if (upstash) {
    const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000))
    const res = await upstashCmd<string | null>(upstash, ['SET', key, owner, 'EX', ttlSec, 'NX'])
    if (res === 'OK') return true
    if (res === null) {
      const checkVal = await upstashCmd<string | null>(upstash, ['GET', key])
      if (checkVal !== null) return false
    }
  }

  const kv = getKvBinding()
  if (kv) {
    try {
      return await kvClaimLock(kv, key, owner, ttlMs)
    } catch {
      return fallbackClaim()
    }
  }

  const saToken = await getFirestoreServiceAccountToken()
  if (saToken) {
    const lockId = safeDocIdForBackend(lockKey)
    const nowMs = Date.now()
    const expiresAtMs = nowMs + Math.max(1000, ttlMs)
    const createRes = await firestoreCommitDoc({
      docPath: `_serverLocks/${lockId}`,
      fields: { lockKey, owner, createdAtMs: nowMs, expiresAtMs },
      bearerToken: saToken,
      currentDocument: { exists: false },
    })
    if (createRes.ok) return true
    if (createRes.status === 409 || createRes.status === 400 || createRes.status === 412) {
      const existing = await firestoreGetDoc(`_serverLocks/${lockId}`, saToken)
      if (!existing.exists || !existing.data) return false
      const prevExp = Number(existing.data.expiresAtMs ?? 0)
      if (prevExp > nowMs) return false
      const takeOver = await firestoreCommitDoc({
        docPath: `_serverLocks/${lockId}`,
        fields: { lockKey, owner, createdAtMs: nowMs, expiresAtMs },
        bearerToken: saToken,
        currentDocument: existing.updateTime ? { updateTime: existing.updateTime } : undefined,
      })
      return takeOver.ok
    }
  }

  return fallbackClaim()
}

export async function checkDurableRateLimit(
  rateKey: string,
  maxRequests: number,
  windowMs: number,
  fallbackCheck: () => boolean,
): Promise<boolean> {
  const key = `pq:rl:${rateKey.slice(0, 128)}`

  const d1 = getD1Binding()
  if (d1) {
    try {
      return await d1CheckRateLimit(d1, key, maxRequests, windowMs)
    } catch {
      return fallbackCheck()
    }
  }

  const doNs = getDoBinding()
  if (doNs) {
    const res = await doCall<{ allowed?: boolean }>(doNs, {
      op: 'checkRateLimit',
      key,
      maxRequests,
      windowMs,
    })
    if (res && typeof res.allowed === 'boolean') return res.allowed
  }

  const upstash = getUpstashConfig()
  if (upstash) {
    try {
      const count = await upstashCmd<number>(upstash, ['INCR', key])
      if (typeof count === 'number') {
        if (count === 1) {
          await upstashCmd(upstash, ['PEXPIRE', key, Math.max(1000, windowMs)])
        }
        return count <= maxRequests
      }
    } catch {
      // Fall through
    }
  }

  const kv = getKvBinding()
  if (kv) {
    try {
      return await kvCheckRateLimit(kv, key, maxRequests, windowMs)
    } catch {
      return fallbackCheck()
    }
  }

  const saToken = await getFirestoreServiceAccountToken()
  if (saToken) {
    try {
      const docId = safeDocIdForBackend(rateKey)
      const nowMs = Date.now()
      const existing = await firestoreGetDoc(`_serverRateLimits/${docId}`, saToken)
      if (!existing.exists || !existing.data || Number(existing.data.windowEndMs ?? 0) <= nowMs) {
        const res = await firestoreCommitDoc({
          docPath: `_serverRateLimits/${docId}`,
          fields: { rateKey, count: 1, windowEndMs: nowMs + windowMs },
          bearerToken: saToken,
        })
        return res.ok ? true : fallbackCheck()
      }
      const currentCount = Number(existing.data.count ?? 0)
      if (currentCount >= maxRequests) return false
      const res = await firestoreCommitDoc({
        docPath: `_serverRateLimits/${docId}`,
        fields: {
          rateKey,
          count: currentCount + 1,
          windowEndMs: Number(existing.data.windowEndMs),
        },
        bearerToken: saToken,
        currentDocument: existing.updateTime ? { updateTime: existing.updateTime } : undefined,
      })
      if (res.ok) return true
    } catch {
      // Fall through
    }
  }

  return fallbackCheck()
}
