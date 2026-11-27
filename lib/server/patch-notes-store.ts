import {
  getDefaultStorePaths,
  getGlobalSingleton,
  isCloudflareWorkersRuntime,
  readJsonStoreFile,
  writeJsonStoreFile,
  type StorePersistenceMode,
} from './runtime-store'
import {
  buildVersionPayload,
  sanitizeReleaseNote,
  type ReleaseNote,
  type VersionPayload,
} from '@/lib/game/version'

interface PatchNotesStoreData {
  customNotes: ReleaseNote[]
}

const { primaryDir: PRIMARY_DIR, primaryFile: PRIMARY_FILE, fallbackFile: FALLBACK_FILE } =
  getDefaultStorePaths('patch-notes.json')

interface PatchNotesSlot {
  data: PatchNotesStoreData | null
  mode: StorePersistenceMode
}

function getSlot(): PatchNotesSlot {
  return getGlobalSingleton<PatchNotesSlot>('pixelquest.patchNotesStore', () => ({
    data: null,
    mode: isCloudflareWorkersRuntime() ? 'isolate_memory_only' : 'durable_disk',
  }))
}

export function getPatchNotesStorePersistenceMode(): StorePersistenceMode {
  return getSlot().mode
}

function readStore(): PatchNotesStoreData {
  const slot = getSlot()
  if (slot.data) return slot.data
  const parsed = readJsonStoreFile<Partial<PatchNotesStoreData>>(PRIMARY_FILE, FALLBACK_FILE)
  if (parsed) {
    const clean = Array.isArray(parsed.customNotes)
      ? parsed.customNotes.map((n) => sanitizeReleaseNote(n)).filter((n): n is ReleaseNote => Boolean(n))
      : []
    slot.data = { customNotes: clean }
    return slot.data
  }
  slot.data = { customNotes: [] }
  return slot.data
}

function writeStore(next: PatchNotesStoreData): void {
  const slot = getSlot()
  const clean = next.customNotes
    .map((n) => sanitizeReleaseNote(n))
    .filter((n): n is ReleaseNote => Boolean(n))
    .slice(-30)
  slot.data = { customNotes: clean }
  const payload = JSON.stringify(slot.data, null, 2)
  slot.mode = writeJsonStoreFile(PRIMARY_DIR, PRIMARY_FILE, FALLBACK_FILE, payload)
}

export function resetPatchNotesMemoryCacheForTests(): void {
  getSlot().data = null
}

export function listCustomPatchNotes(): ReleaseNote[] {
  return [...readStore().customNotes]
}

export function getMergedVersionPayload(nowMs = Date.now()): VersionPayload {
  return buildVersionPayload(readStore().customNotes, nowMs)
}

export function upsertLivePatchNote(rawNote: unknown): { ok: true; note: ReleaseNote; payload: VersionPayload } | { ok: false; message: string } {
  const note = sanitizeReleaseNote(rawNote)
  if (!note) {
    return {
      ok: false,
      message: 'ข้อมูล Patch Note ไม่ถูกต้อง (ต้องระบุเวอร์ชั่น เช่น 1.4.3, ชื่อแพตช์ และรายการอย่างน้อย 1 ข้อ)',
    }
  }
  const store = readStore()
  const filtered = store.customNotes.filter((item) => item.version !== note.version)
  writeStore({ customNotes: [note, ...filtered] })
  return {
    ok: true,
    note,
    payload: getMergedVersionPayload(),
  }
}

export function deleteLivePatchNote(version: string): { ok: boolean; payload: VersionPayload } {
  const cleanVersion = version.trim().replace(/^v/i, '')
  const store = readStore()
  const next = store.customNotes.filter((item) => item.version !== cleanVersion)
  const removed = next.length !== store.customNotes.length
  if (removed) {
    writeStore({ customNotes: next })
  }
  return {
    ok: removed,
    payload: getMergedVersionPayload(),
  }
}
