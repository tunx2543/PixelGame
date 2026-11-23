import fs from 'node:fs'
import path from 'node:path'
import {
  buildVersionPayload,
  sanitizeReleaseNote,
  type ReleaseNote,
  type VersionPayload,
} from '@/lib/game/version'

interface PatchNotesStoreData {
  customNotes: ReleaseNote[]
}

const PRIMARY_DIR = path.join(process.cwd(), '.data')
const PRIMARY_FILE = path.join(PRIMARY_DIR, 'patch-notes.json')
const FALLBACK_FILE = '/tmp/pixelquest-patch-notes.json'

let memoryStore: PatchNotesStoreData | null = null

function resolveStorePath(): string {
  try {
    fs.mkdirSync(PRIMARY_DIR, { recursive: true })
    fs.accessSync(PRIMARY_DIR, fs.constants.W_OK)
    return PRIMARY_FILE
  } catch {
    return FALLBACK_FILE
  }
}

function readStore(): PatchNotesStoreData {
  if (memoryStore) return memoryStore
  for (const candidate of [PRIMARY_FILE, FALLBACK_FILE]) {
    try {
      if (fs.existsSync(candidate)) {
        const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8')) as Partial<PatchNotesStoreData>
        const clean = Array.isArray(parsed.customNotes)
          ? parsed.customNotes.map((n) => sanitizeReleaseNote(n)).filter((n): n is ReleaseNote => Boolean(n))
          : []
        memoryStore = { customNotes: clean }
        return memoryStore
      }
    } catch {
      // Try fallback
    }
  }
  memoryStore = { customNotes: [] }
  return memoryStore
}

function writeStore(next: PatchNotesStoreData): void {
  const clean = next.customNotes
    .map((n) => sanitizeReleaseNote(n))
    .filter((n): n is ReleaseNote => Boolean(n))
    .slice(-30)
  memoryStore = { customNotes: clean }
  const target = resolveStorePath()
  const payload = JSON.stringify(memoryStore, null, 2)
  try {
    fs.writeFileSync(target, payload, 'utf8')
  } catch {
    try {
      fs.writeFileSync(FALLBACK_FILE, payload, 'utf8')
    } catch {
      // Keep memory cache active
    }
  }
}

export function resetPatchNotesMemoryCacheForTests(): void {
  memoryStore = null
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
