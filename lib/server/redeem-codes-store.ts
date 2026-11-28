import {
  getDefaultStorePaths,
  getGlobalSingleton,
  isCloudflareWorkersRuntime,
  readJsonStoreFile,
  writeJsonStoreFile,
  type StorePersistenceMode,
} from './runtime-store'
import {
  detectDurableBackendMode,
  firestoreCommitDoc,
  firestoreDeleteDoc,
  firestoreGetDoc,
  firestoreListCollection,
  getFirestoreServiceAccountToken,
  hasRemoteDurableBackend,
  mutateDurableNamespace,
  readDurableNamespace,
} from './durable-store'

export interface RedeemCodeServerRecord {
  code: string
  label: string
  gold: number
  diamonds: number
  itemId: string | null
  qty: number
  plus: number
  vipExp: number
  maxUses: number
  usedCount: number
  active: boolean
  expiresAtMs: number | null
  createdByUid: string
  createdAtMs: number
  updatedAtMs: number
}

export interface RedeemClaimReceipt {
  claimKey: string
  uid: string
  authMode: 'firebase' | 'guest_sandbox'
  characterId: string
  playerName: string
  gameUid: string
  claimedAtMs: number
}

interface RedeemStoreData {
  codes: Record<string, RedeemCodeServerRecord>
  claimsByCode: Record<string, Record<string, RedeemClaimReceipt>>
}

const NAMESPACE = 'redeem-codes'

const { primaryDir: PRIMARY_DIR, primaryFile: PRIMARY_FILE, fallbackFile: FALLBACK_FILE } =
  getDefaultStorePaths('redeem-codes.json')

interface RedeemStoreSlot {
  data: RedeemStoreData | null
  mode: StorePersistenceMode
}

function getSlot(): RedeemStoreSlot {
  return getGlobalSingleton<RedeemStoreSlot>('pixelquest.redeemCodesStore', () => ({
    data: null,
    mode: isCloudflareWorkersRuntime() ? 'isolate_memory_only' : 'durable_disk',
  }))
}

export function getRedeemStorePersistenceMode(): StorePersistenceMode {
  return getSlot().mode
}

export async function getRedeemStorePersistenceModeAsync(): Promise<StorePersistenceMode> {
  return detectDurableBackendMode(getSlot().mode)
}

export function normalizeRedeemCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32)
}

function normalizeStore(parsed: Partial<RedeemStoreData> | null | undefined): RedeemStoreData {
  return {
    codes: parsed?.codes && typeof parsed.codes === 'object' ? parsed.codes : {},
    claimsByCode:
      parsed?.claimsByCode && typeof parsed.claimsByCode === 'object' ? parsed.claimsByCode : {},
  }
}

function readStore(): RedeemStoreData {
  const slot = getSlot()
  if (slot.data) return slot.data
  const parsed = readJsonStoreFile<Partial<RedeemStoreData>>(PRIMARY_FILE, FALLBACK_FILE)
  if (parsed) {
    slot.data = normalizeStore(parsed)
    return slot.data
  }
  slot.data = { codes: {}, claimsByCode: {} }
  return slot.data
}

function writeStore(next: RedeemStoreData): StorePersistenceMode {
  const slot = getSlot()
  const normalized = normalizeStore(next)
  slot.data = normalized
  const mode = writeJsonStoreFile(PRIMARY_DIR, PRIMARY_FILE, FALLBACK_FILE, JSON.stringify(normalized, null, 2))
  slot.mode = mode
  return mode
}

function mapCodeFromFirestore(id: string, d: Record<string, unknown>): RedeemCodeServerRecord {
  return {
    code: normalizeRedeemCode(String(d.code ?? id)),
    label: String(d.label ?? 'โค้ดรางวัลจาก GM'),
    gold: Math.max(0, Math.floor(Number(d.gold ?? 0) || 0)),
    diamonds: Math.max(0, Math.floor(Number(d.diamonds ?? 0) || 0)),
    itemId: typeof d.itemId === 'string' && d.itemId.trim() ? d.itemId : null,
    qty: Math.max(0, Math.floor(Number(d.qty ?? 0) || 0)),
    plus: Math.max(0, Math.floor(Number(d.plus ?? 0) || 0)),
    vipExp: Math.max(0, Math.floor(Number(d.vipExp ?? 0) || 0)),
    maxUses: Math.max(1, Math.floor(Number(d.maxUses ?? 1) || 1)),
    usedCount: Math.max(0, Math.floor(Number(d.usedCount ?? 0) || 0)),
    active: Boolean(d.active),
    expiresAtMs: typeof d.expiresAtMs === 'number' ? d.expiresAtMs : null,
    createdByUid: String(d.createdByUid ?? ''),
    createdAtMs: Number(d.createdAtMs ?? 0),
    updatedAtMs: Number(d.updatedAtMs ?? d.createdAtMs ?? 0),
  }
}

async function resolveBestToken(bearerToken?: string | null): Promise<string | null> {
  if (bearerToken) return bearerToken
  return getFirestoreServiceAccountToken()
}

export function resetRedeemStoreMemoryCacheForTests(): void {
  getSlot().data = null
}

export function listRedeemCodesFromStore(): RedeemCodeServerRecord[] {
  const store = readStore()
  return Object.values(store.codes).sort((a, b) => b.createdAtMs - a.createdAtMs)
}

export async function listRedeemCodesDurable(bearerToken?: string | null): Promise<RedeemCodeServerRecord[]> {
  const { data } = await readDurableNamespace<RedeemStoreData>(NAMESPACE, readStore)
  const byCode = new Map<string, RedeemCodeServerRecord>()
  for (const item of Object.values(normalizeStore(data).codes)) {
    if (item?.code) byCode.set(item.code, item)
  }

  const token = await resolveBestToken(bearerToken)
  if (token) {
    const fsDocs = await firestoreListCollection('redeemCodes', token, {
      pageSize: 50,
      orderBy: 'createdAtMs desc',
    })
    for (const d of fsDocs) {
      const mapped = mapCodeFromFirestore(d.id, d.data)
      if (!mapped.code) continue
      const existing = byCode.get(mapped.code)
      if (!existing) {
        byCode.set(mapped.code, mapped)
      } else {
        byCode.set(mapped.code, {
          ...existing,
          usedCount: Math.max(existing.usedCount, mapped.usedCount),
        })
      }
    }
  }

  return [...byCode.values()].sort((a, b) => b.createdAtMs - a.createdAtMs)
}

export function getRedeemCodeFromStore(rawCode: string): RedeemCodeServerRecord | null {
  const code = normalizeRedeemCode(rawCode)
  if (!code) return null
  return readStore().codes[code] ?? null
}

function buildValidatedRedeemRecord(
  input: {
    code: string
    label?: string
    gold?: number
    diamonds?: number
    itemId?: string | null
    qty?: number
    plus?: number
    vipExp?: number
    maxUses?: number
    expiresHours?: number | null
    active?: boolean
    createdByUid: string
    nowMs?: number
  },
  existing?: RedeemCodeServerRecord,
): { ok: true; record: RedeemCodeServerRecord } | { ok: false; message: string } {
  const code = normalizeRedeemCode(input.code)
  if (code.length < 4) {
    return { ok: false, message: 'รหัสโค้ดต้องมีอย่างน้อย 4 ตัวอักษร (A-Z, 0-9, -, _)' }
  }
  const nowMs = input.nowMs ?? Date.now()
  const itemId =
    typeof input.itemId === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(input.itemId.trim())
      ? input.itemId.trim()
      : null
  const qty = itemId ? Math.max(1, Math.min(99, Math.floor(Number(input.qty) || 1))) : 0
  const plus = itemId ? Math.max(0, Math.min(15, Math.floor(Number(input.plus) || 0))) : 0
  const gold = Math.max(0, Math.min(10_000_000, Math.floor(Number(input.gold) || 0)))
  const diamonds = Math.max(0, Math.min(100_000, Math.floor(Number(input.diamonds) || 0)))
  const vipExp = Math.max(0, Math.min(50_000, Math.floor(Number(input.vipExp) || 0)))
  const maxUses = Math.max(1, Math.min(100_000, Math.floor(Number(input.maxUses) || 1)))
  const expiresAtMs =
    typeof input.expiresHours === 'number' && Number.isFinite(input.expiresHours) && input.expiresHours > 0
      ? nowMs + Math.round(input.expiresHours * 3_600_000)
      : null

  if (gold <= 0 && diamonds <= 0 && vipExp <= 0 && !itemId) {
    return { ok: false, message: 'กรุณาระบุรางวัลอย่างน้อย 1 อย่าง (เพชร ทอง VIP EXP หรือไอเทม)' }
  }

  return {
    ok: true,
    record: {
      code,
      label: (input.label?.trim() || `โค้ด ${code}`).slice(0, 80),
      gold,
      diamonds,
      itemId,
      qty,
      plus,
      vipExp,
      maxUses,
      usedCount: existing ? Math.min(maxUses, existing.usedCount) : 0,
      active: input.active ?? true,
      expiresAtMs,
      createdByUid: existing?.createdByUid ?? input.createdByUid,
      createdAtMs: existing?.createdAtMs ?? nowMs,
      updatedAtMs: nowMs,
    },
  }
}

export function upsertRedeemCodeInStore(input: {
  code: string
  label?: string
  gold?: number
  diamonds?: number
  itemId?: string | null
  qty?: number
  plus?: number
  vipExp?: number
  maxUses?: number
  expiresHours?: number | null
  active?: boolean
  createdByUid: string
  nowMs?: number
}): { ok: true; record: RedeemCodeServerRecord } | { ok: false; message: string } {
  const code = normalizeRedeemCode(input.code)
  const store = readStore()
  const validated = buildValidatedRedeemRecord(input, store.codes[code])
  if (!validated.ok) return validated

  writeStore({
    codes: { ...store.codes, [code]: validated.record },
    claimsByCode: store.claimsByCode,
  })
  return validated
}

export async function upsertRedeemCodeDurable(
  input: Parameters<typeof upsertRedeemCodeInStore>[0],
  bearerToken?: string | null,
): Promise<{ ok: true; record: RedeemCodeServerRecord } | { ok: false; message: string }> {
  const code = normalizeRedeemCode(input.code)
  const preCheck = buildValidatedRedeemRecord(input)
  if (!preCheck.ok) return preCheck

  const res = await mutateDurableNamespace<
    RedeemStoreData,
    { ok: true; record: RedeemCodeServerRecord } | { ok: false; message: string }
  >({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const normalized = normalizeStore(current)
      const built = buildValidatedRedeemRecord(input, normalized.codes[code])
      if (!built.ok) return { next: normalized, changed: false, result: built }
      return {
        next: {
          codes: { ...normalized.codes, [code]: built.record },
          claimsByCode: normalized.claimsByCode,
        },
        changed: true,
        result: built,
      }
    },
    onCommitLocal: writeStore,
  })

  if (res.result.ok) {
    const token = await resolveBestToken(bearerToken)
    if (token) {
      const r = res.result.record
      const fsExisting = await firestoreGetDoc(`redeemCodes/${code}`, token)
      if (!fsExisting.exists) {
        await firestoreCommitDoc({
          docPath: `redeemCodes/${code}`,
          fields: {
            code: r.code,
            label: r.label,
            gold: r.gold,
            diamonds: r.diamonds,
            itemId: r.itemId,
            qty: r.qty,
            plus: r.plus,
            vipExp: r.vipExp,
            maxUses: r.maxUses,
            usedCount: r.usedCount,
            active: r.active,
            expiresAtMs: r.expiresAtMs,
            createdByUid: r.createdByUid,
            createdAtMs: r.createdAtMs,
          },
          bearerToken: token,
          serverTimestampFields: ['createdAt', 'updatedAt'],
        }).catch(() => {})
      } else {
        await firestoreCommitDoc({
          docPath: `redeemCodes/${code}`,
          fields: { active: r.active },
          bearerToken: token,
          updateMaskFieldPaths: ['active', 'updatedAt'],
          serverTimestampFields: ['updatedAt'],
        }).catch(() => {})
      }
    }
  }

  return res.result
}

export function toggleRedeemCodeInStore(
  rawCode: string,
  active: boolean,
): { ok: true; record: RedeemCodeServerRecord } | { ok: false; message: string } {
  const code = normalizeRedeemCode(rawCode)
  const store = readStore()
  const existing = store.codes[code]
  if (!existing) {
    return { ok: false, message: 'ไม่พบโค้ดรางวัลนี้ในระบบเซิร์ฟเวอร์' }
  }
  const updated: RedeemCodeServerRecord = {
    ...existing,
    active: Boolean(active),
    updatedAtMs: Date.now(),
  }
  writeStore({
    codes: { ...store.codes, [code]: updated },
    claimsByCode: store.claimsByCode,
  })
  return { ok: true, record: updated }
}

export async function toggleRedeemCodeDurable(
  rawCode: string,
  active: boolean,
  bearerToken?: string | null,
): Promise<{ ok: true; record: RedeemCodeServerRecord } | { ok: false; message: string }> {
  const code = normalizeRedeemCode(rawCode)
  const token = await resolveBestToken(bearerToken)

  let fsFallbackRecord: RedeemCodeServerRecord | null = null
  const preCheck = await readDurableNamespace<RedeemStoreData>(NAMESPACE, readStore)
  if (!normalizeStore(preCheck.data).codes[code] && token && code) {
    const fsDoc = await firestoreGetDoc(`redeemCodes/${code}`, token)
    if (fsDoc.exists && fsDoc.data) {
      fsFallbackRecord = mapCodeFromFirestore(code, fsDoc.data)
    }
  }

  const res = await mutateDurableNamespace<
    RedeemStoreData,
    { ok: true; record: RedeemCodeServerRecord } | { ok: false; message: string }
  >({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const normalized = normalizeStore(current)
      const existing = normalized.codes[code] ?? fsFallbackRecord
      if (!existing) {
        return {
          next: normalized,
          changed: false,
          result: { ok: false, message: 'ไม่พบโค้ดรางวัลนี้ในระบบเซิร์ฟเวอร์' },
        }
      }
      const updated: RedeemCodeServerRecord = {
        ...existing,
        active: Boolean(active),
        updatedAtMs: Date.now(),
      }
      return {
        next: {
          codes: { ...normalized.codes, [code]: updated },
          claimsByCode: normalized.claimsByCode,
        },
        changed: true,
        result: { ok: true, record: updated },
      }
    },
    onCommitLocal: writeStore,
  })

  if (res.result.ok && token) {
    await firestoreCommitDoc({
      docPath: `redeemCodes/${code}`,
      fields: { active: Boolean(active) },
      bearerToken: token,
      updateMaskFieldPaths: ['active', 'updatedAt'],
      serverTimestampFields: ['updatedAt'],
    }).catch(() => {})
  }

  return res.result
}

export function deleteRedeemCodeFromStore(rawCode: string): boolean {
  const code = normalizeRedeemCode(rawCode)
  const store = readStore()
  if (!store.codes[code]) return false
  const nextCodes = { ...store.codes }
  delete nextCodes[code]
  const nextClaims = { ...store.claimsByCode }
  delete nextClaims[code]
  writeStore({
    codes: nextCodes,
    claimsByCode: nextClaims,
  })
  return true
}

export async function deleteRedeemCodeDurable(
  rawCode: string,
  bearerToken?: string | null,
): Promise<boolean> {
  const code = normalizeRedeemCode(rawCode)
  if (!code) return false
  const res = await mutateDurableNamespace<RedeemStoreData, boolean>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const normalized = normalizeStore(current)
      if (!normalized.codes[code]) {
        return { next: normalized, changed: false, result: false }
      }
      const nextCodes = { ...normalized.codes }
      delete nextCodes[code]
      const nextClaims = { ...normalized.claimsByCode }
      delete nextClaims[code]
      return { next: { codes: nextCodes, claimsByCode: nextClaims }, changed: true, result: true }
    },
    onCommitLocal: writeStore,
  })

  const token = await resolveBestToken(bearerToken)
  let deletedFs = false
  if (token) {
    const delRes = await firestoreDeleteDoc(`redeemCodes/${code}`, token).catch(() => ({ ok: false, status: 500 }))
    deletedFs = delRes.ok && delRes.status !== 404
  }
  return res.result || deletedFs
}

function applyClaimInState(
  store: RedeemStoreData,
  input: {
    code: string
    claimKey: string
    uid: string
    authMode: 'firebase' | 'guest_sandbox'
    characterId: string
    playerName: string
    gameUid: string
    nowMs?: number
  },
  hydratedRecord?: RedeemCodeServerRecord | null,
  alreadyClaimedRemote?: boolean,
):
  | { ok: true; next: RedeemStoreData; record: RedeemCodeServerRecord; receipt: RedeemClaimReceipt }
  | { ok: false; status: number; code: 'not_found' | 'inactive' | 'expired' | 'exhausted' | 'already_claimed' | 'invalid'; message: string } {
  const code = normalizeRedeemCode(input.code)
  if (code.length < 4) {
    return { ok: false, status: 400, code: 'invalid', message: 'รูปแบบโค้ดรางวัลไม่ถูกต้อง (อย่างน้อย 4 ตัวอักษร)' }
  }
  const cleanClaimKey = input.claimKey.replace(/[^a-zA-Z0-9_:-]/g, '').slice(0, 128)
  if (!cleanClaimKey) {
    return { ok: false, status: 400, code: 'invalid', message: 'ไม่สามารถระบุตัวตนผู้รับโค้ดได้' }
  }

  const nowMs = input.nowMs ?? Date.now()
  const rec = store.codes[code] ?? hydratedRecord
  if (!rec) {
    return { ok: false, status: 404, code: 'not_found', message: 'ไม่พบโค้ดรางวัลนี้ในระบบ' }
  }
  if (!rec.active) {
    return { ok: false, status: 400, code: 'inactive', message: 'โค้ดรางวัลนี้ถูกปิดใช้งานแล้ว' }
  }
  if (rec.expiresAtMs !== null && nowMs > rec.expiresAtMs) {
    return { ok: false, status: 400, code: 'expired', message: 'โค้ดรางวัลนี้หมดอายุแล้ว' }
  }
  if (rec.usedCount >= rec.maxUses) {
    return { ok: false, status: 400, code: 'exhausted', message: 'โค้ดรางวัลนี้ถูกใช้ครบจำนวนสิทธิ์แล้ว' }
  }

  const claimsForCode = store.claimsByCode[code] ?? {}
  if (claimsForCode[cleanClaimKey] || alreadyClaimedRemote) {
    return {
      ok: false,
      status: 409,
      code: 'already_claimed',
      message: 'บัญชี/อุปกรณ์นี้ใช้โค้ดรางวัลนี้ไปแล้ว (จำกัด 1 ครั้งต่อบัญชี)',
    }
  }

  const receipt: RedeemClaimReceipt = {
    claimKey: cleanClaimKey,
    uid: input.uid.slice(0, 128),
    authMode: input.authMode,
    characterId: input.characterId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'slot_1',
    playerName: (input.playerName.trim() || 'นักผจญภัย').slice(0, 40),
    gameUid: /^\d{4,8}$/.test(input.gameUid.trim()) ? input.gameUid.trim() : '1000',
    claimedAtMs: nowMs,
  }

  const updatedRec: RedeemCodeServerRecord = {
    ...rec,
    usedCount: rec.usedCount + 1,
    updatedAtMs: nowMs,
  }

  return {
    ok: true,
    next: {
      codes: { ...store.codes, [code]: updatedRec },
      claimsByCode: {
        ...store.claimsByCode,
        [code]: {
          ...claimsForCode,
          [cleanClaimKey]: receipt,
        },
      },
    },
    record: updatedRec,
    receipt,
  }
}

export function claimRedeemCodeInStore(input: {
  code: string
  claimKey: string
  uid: string
  authMode: 'firebase' | 'guest_sandbox'
  characterId: string
  playerName: string
  gameUid: string
  nowMs?: number
}):
  | { ok: true; record: RedeemCodeServerRecord; receipt: RedeemClaimReceipt }
  | { ok: false; status: number; code: 'not_found' | 'inactive' | 'expired' | 'exhausted' | 'already_claimed' | 'invalid'; message: string } {
  const store = readStore()
  const applied = applyClaimInState(store, input)
  if (!applied.ok) return applied
  writeStore(applied.next)
  return { ok: true, record: applied.record, receipt: applied.receipt }
}

export async function claimRedeemCodeDurable(
  input: Parameters<typeof claimRedeemCodeInStore>[0],
  bearerToken?: string | null,
): Promise<ReturnType<typeof claimRedeemCodeInStore>> {
  const code = normalizeRedeemCode(input.code)
  let hydratedRecord: RedeemCodeServerRecord | null = null
  let alreadyClaimedRemote = false

  const token = await resolveBestToken(bearerToken)
  if (token && code.length >= 4) {
    const preRead = await readDurableNamespace<RedeemStoreData>(NAMESPACE, readStore)
    if (!normalizeStore(preRead.data).codes[code] || !hasRemoteDurableBackend()) {
      const [fsCode, fsClaim] = await Promise.all([
        firestoreGetDoc(`redeemCodes/${code}`, token),
        input.authMode === 'firebase'
          ? firestoreGetDoc(`redeemCodes/${code}/claims/${input.uid}`, token)
          : Promise.resolve({ exists: false, data: null }),
      ])
      if (fsCode.exists && fsCode.data) {
        hydratedRecord = mapCodeFromFirestore(code, fsCode.data)
      }
      if (fsClaim.exists) {
        alreadyClaimedRemote = true
      }
    }
  }

  const res = await mutateDurableNamespace<RedeemStoreData, ReturnType<typeof claimRedeemCodeInStore>>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const normalized = normalizeStore(current)
      const applied = applyClaimInState(normalized, input, hydratedRecord, alreadyClaimedRemote)
      if (!applied.ok) {
        return { next: normalized, changed: false, result: applied }
      }
      return {
        next: applied.next,
        changed: true,
        result: { ok: true, record: applied.record, receipt: applied.receipt },
      }
    },
    onCommitLocal: writeStore,
  })

  return res.result
}
