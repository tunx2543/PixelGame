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
  firestoreGetDoc,
  getFirestoreServiceAccountToken,
  mutateDurableNamespace,
  readDurableNamespace,
} from './durable-store'
import {
  buildVersionPayload,
  sanitizeReleaseNote,
  type ReleaseNote,
  type VersionPayload,
} from '@/lib/game/version'

interface PatchNotesStoreData {
  customNotes: ReleaseNote[]
}

const NAMESPACE = 'patch-notes'

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

export async function getPatchNotesStorePersistenceModeAsync(): Promise<StorePersistenceMode> {
  return detectDurableBackendMode(getSlot().mode)
}

function sanitizePatchStore(parsed: Partial<PatchNotesStoreData> | null | undefined): PatchNotesStoreData {
  const clean = Array.isArray(parsed?.customNotes)
    ? parsed.customNotes.map((n) => sanitizeReleaseNote(n)).filter((n): n is ReleaseNote => Boolean(n)).slice(-30)
    : []
  return { customNotes: clean }
}

function readStore(): PatchNotesStoreData {
  const slot = getSlot()
  if (slot.data) return slot.data
  const parsed = readJsonStoreFile<Partial<PatchNotesStoreData>>(PRIMARY_FILE, FALLBACK_FILE)
  if (parsed) {
    slot.data = sanitizePatchStore(parsed)
    return slot.data
  }
  slot.data = { customNotes: [] }
  return slot.data
}

function writeStore(next: PatchNotesStoreData): StorePersistenceMode {
  const slot = getSlot()
  const sanitized = sanitizePatchStore(next)
  slot.data = sanitized
  const payload = JSON.stringify(sanitized, null, 2)
  const mode = writeJsonStoreFile(PRIMARY_DIR, PRIMARY_FILE, FALLBACK_FILE, payload)
  slot.mode = mode
  return mode
}

async function syncPatchNotesToFirestore(
  notes: ReleaseNote[],
  actorUid: string,
  bearerToken?: string | null,
): Promise<void> {
  const token = bearerToken ?? (await getFirestoreServiceAccountToken())
  if (!token) return
  const existing = await firestoreGetDoc('serverConfig/patchNotes', token)
  const fields: Record<string, unknown> = {
    configId: 'patchNotes',
    payloadJson: JSON.stringify({ customNotes: notes }),
    updatedByUid: actorUid,
    updatedAtMs: Date.now(),
  }
  if (existing.exists) {
    await firestoreCommitDoc({
      docPath: 'serverConfig/patchNotes',
      fields,
      bearerToken: token,
      updateMaskFieldPaths: ['payloadJson', 'updatedByUid', 'updatedAtMs', 'updatedAt'],
      serverTimestampFields: ['updatedAt'],
    }).catch(() => {})
  } else {
    await firestoreCommitDoc({
      docPath: 'serverConfig/patchNotes',
      fields,
      bearerToken: token,
      serverTimestampFields: ['createdAt', 'updatedAt'],
    }).catch(() => {})
  }
}

export function resetPatchNotesMemoryCacheForTests(): void {
  getSlot().data = null
}

export function listCustomPatchNotes(): ReleaseNote[] {
  return [...readStore().customNotes]
}

export function getMergedVersionPayload(
  nowMs = Date.now(),
  meta?: { buildId?: string; deployVersionId?: string | null },
): VersionPayload {
  return buildVersionPayload(readStore().customNotes, nowMs, meta)
}

export async function getMergedVersionPayloadDurable(
  nowMs = Date.now(),
  meta?: { buildId?: string; deployVersionId?: string | null; bearerToken?: string | null },
): Promise<VersionPayload> {
  const { data } = await readDurableNamespace<PatchNotesStoreData>(NAMESPACE, readStore)
  let notes = sanitizePatchStore(data).customNotes

  const token = meta?.bearerToken ?? (await getFirestoreServiceAccountToken())
  if (token) {
    const fsDoc = await firestoreGetDoc('serverConfig/patchNotes', token)
    if (fsDoc.exists && fsDoc.data && typeof fsDoc.data.payloadJson === 'string') {
      try {
        const parsed = JSON.parse(fsDoc.data.payloadJson) as Partial<PatchNotesStoreData>
        const fsNotes = sanitizePatchStore(parsed).customNotes
        if (notes.length === 0 && fsNotes.length > 0) {
          notes = fsNotes
        }
      } catch {
        // Ignore malformed config JSON
      }
    }
  }
  return buildVersionPayload(notes, nowMs, meta)
}

export function upsertLivePatchNote(
  rawNote: unknown,
): { ok: true; note: ReleaseNote; payload: VersionPayload } | { ok: false; message: string } {
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

export async function upsertLivePatchNoteDurable(
  rawNote: unknown,
  opts?: { actorUid?: string; bearerToken?: string | null; buildId?: string; deployVersionId?: string | null },
): Promise<{ ok: true; note: ReleaseNote; payload: VersionPayload } | { ok: false; message: string }> {
  const note = sanitizeReleaseNote(rawNote)
  if (!note) {
    return {
      ok: false,
      message: 'ข้อมูล Patch Note ไม่ถูกต้อง (ต้องระบุเวอร์ชั่น เช่น 1.4.3, ชื่อแพตช์ และรายการอย่างน้อย 1 ข้อ)',
    }
  }
  const res = await mutateDurableNamespace<PatchNotesStoreData, PatchNotesStoreData>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const sanitized = sanitizePatchStore(current)
      const filtered = sanitized.customNotes.filter((item) => item.version !== note.version)
      const next = sanitizePatchStore({ customNotes: [note, ...filtered] })
      return { next, changed: true, result: next }
    },
    onCommitLocal: writeStore,
  })

  await syncPatchNotesToFirestore(res.result.customNotes, opts?.actorUid ?? 'gm', opts?.bearerToken)

  return {
    ok: true,
    note,
    payload: buildVersionPayload(res.result.customNotes, Date.now(), opts),
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

export async function deleteLivePatchNoteDurable(
  version: string,
  opts?: { actorUid?: string; bearerToken?: string | null; buildId?: string; deployVersionId?: string | null },
): Promise<{ ok: boolean; payload: VersionPayload }> {
  const cleanVersion = version.trim().replace(/^v/i, '')
  const res = await mutateDurableNamespace<PatchNotesStoreData, { removed: boolean; notes: ReleaseNote[] }>({
    namespace: NAMESPACE,
    fallbackInit: readStore,
    mutator: (current) => {
      const sanitized = sanitizePatchStore(current)
      const nextNotes = sanitized.customNotes.filter((item) => item.version !== cleanVersion)
      const removed = nextNotes.length !== sanitized.customNotes.length
      const next = { customNotes: nextNotes }
      return { next, changed: removed, result: { removed, notes: nextNotes } }
    },
    onCommitLocal: writeStore,
  })

  if (res.result.removed) {
    await syncPatchNotesToFirestore(res.result.notes, opts?.actorUid ?? 'gm', opts?.bearerToken)
  }

  return {
    ok: res.result.removed,
    payload: buildVersionPayload(res.result.notes, Date.now(), opts),
  }
}
