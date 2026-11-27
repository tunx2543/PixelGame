import {
  getDefaultStorePaths,
  getGlobalSingleton,
  isCloudflareWorkersRuntime,
  readJsonStoreFile,
  writeJsonStoreFile,
  type StorePersistenceMode,
} from './runtime-store'

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

export function normalizeRedeemCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32)
}

function readStore(): RedeemStoreData {
  const slot = getSlot()
  if (slot.data) return slot.data
  const parsed = readJsonStoreFile<Partial<RedeemStoreData>>(PRIMARY_FILE, FALLBACK_FILE)
  if (parsed) {
    slot.data = {
      codes: parsed.codes && typeof parsed.codes === 'object' ? parsed.codes : {},
      claimsByCode:
        parsed.claimsByCode && typeof parsed.claimsByCode === 'object' ? parsed.claimsByCode : {},
    }
    return slot.data
  }
  slot.data = { codes: {}, claimsByCode: {} }
  return slot.data
}

function writeStore(next: RedeemStoreData): void {
  const slot = getSlot()
  slot.data = next
  slot.mode = writeJsonStoreFile(PRIMARY_DIR, PRIMARY_FILE, FALLBACK_FILE, JSON.stringify(next, null, 2))
}

export function resetRedeemStoreMemoryCacheForTests(): void {
  getSlot().data = null
}

export function listRedeemCodesFromStore(): RedeemCodeServerRecord[] {
  const store = readStore()
  return Object.values(store.codes).sort((a, b) => b.createdAtMs - a.createdAtMs)
}

export function getRedeemCodeFromStore(rawCode: string): RedeemCodeServerRecord | null {
  const code = normalizeRedeemCode(rawCode)
  if (!code) return null
  return readStore().codes[code] ?? null
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
  if (code.length < 4) {
    return { ok: false, message: 'รหัสโค้ดต้องมีอย่างน้อย 4 ตัวอักษร (A-Z, 0-9, -, _)' }
  }
  const nowMs = input.nowMs ?? Date.now()
  const store = readStore()
  const existing = store.codes[code]

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

  const record: RedeemCodeServerRecord = {
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
  }

  writeStore({
    codes: { ...store.codes, [code]: record },
    claimsByCode: store.claimsByCode,
  })
  return { ok: true, record }
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
  const code = normalizeRedeemCode(input.code)
  if (code.length < 4) {
    return { ok: false, status: 400, code: 'invalid', message: 'รูปแบบโค้ดรางวัลไม่ถูกต้อง (อย่างน้อย 4 ตัวอักษร)' }
  }
  const cleanClaimKey = input.claimKey.replace(/[^a-zA-Z0-9_:-]/g, '').slice(0, 128)
  if (!cleanClaimKey) {
    return { ok: false, status: 400, code: 'invalid', message: 'ไม่สามารถระบุตัวตนผู้รับโค้ดได้' }
  }

  const nowMs = input.nowMs ?? Date.now()
  const store = readStore()
  const rec = store.codes[code]
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
  if (claimsForCode[cleanClaimKey]) {
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

  writeStore({
    codes: { ...store.codes, [code]: updatedRec },
    claimsByCode: {
      ...store.claimsByCode,
      [code]: {
        ...claimsForCode,
        [cleanClaimKey]: receipt,
      },
    },
  })

  return { ok: true, record: updatedRec, receipt }
}
