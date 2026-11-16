'use client'

import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { OperationType, auth, db, handleFirestoreError } from './client'
import {
  PRESENCE_QUERY_LIMIT,
  PRESENCE_STALE_MS,
  type BuildPresenceInput,
  type RemotePlayerSnapshot,
  buildWorldPresencePayload,
  extractDocTimestampMs,
  parseWorldPresenceToRemotePlayer,
} from './presence-helpers'

export async function upsertWorldPresence(input: BuildPresenceInput): Promise<boolean> {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== input.userId || !currentUser.emailVerified) {
    return false
  }

  const payload = buildWorldPresencePayload(input)
  if (!payload) {
    return false
  }

  const path = `worldPresence/${currentUser.uid}`
  try {
    await setDoc(doc(db, 'worldPresence', currentUser.uid), {
      ...payload,
      updatedAt: serverTimestamp(),
    })
    return true
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path)
  }
}

export async function removeWorldPresence(userId: string): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== userId || !currentUser.emailVerified) {
    return
  }

  const path = `worldPresence/${userId}`
  try {
    await deleteDoc(doc(db, 'worldPresence', userId))
  } catch (error) {
    if (!auth.currentUser) return
    handleFirestoreError(error, OperationType.DELETE, path)
  }
}

export function subscribeWorldPresence(
  selfUserId: string,
  currentPlayers: Map<string, RemotePlayerSnapshot>,
  onPlayersChange: (players: RemotePlayerSnapshot[]) => void,
  onError?: (error: unknown) => void,
  activeMapId: string = 'town',
): () => void {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== selfUserId || !currentUser.emailVerified) {
    currentPlayers.clear()
    onPlayersChange([])
    return () => {}
  }

  let clockOffsetMs: number | null = null
  let unsubscribed = false
  let activeUnsub: (() => void) | null = null
  let usingMapFallback = false

  const handleSnapshot = (snapshot: {
    docs: Array<{
      id: string
      metadata: { hasPendingWrites: boolean }
      data: () => Record<string, unknown>
    }>
  }) => {
    const nowMs = Date.now()
    const seenUserIds = new Set<string>()

    // Calibrate Firestore server clock offset using our own committed presence doc.
    for (const docSnap of snapshot.docs) {
      if (docSnap.id === selfUserId && !docSnap.metadata.hasPendingWrites) {
        const serverMs = extractDocTimestampMs(docSnap.data().updatedAt)
        if (serverMs !== null) {
          clockOffsetMs = serverMs - nowMs
        }
        break
      }
    }

    for (const docSnap of snapshot.docs) {
      if (docSnap.id === selfUserId) continue
      const parsed = parseWorldPresenceToRemotePlayer(docSnap.data(), {
        selfUserId,
        nowMs,
        clockOffsetMs,
        existing: currentPlayers.get(docSnap.id) ?? null,
        staleMs: PRESENCE_STALE_MS,
      })
      if (parsed) {
        seenUserIds.add(parsed.userId)
        currentPlayers.set(parsed.userId, parsed)
      }
    }

    for (const id of [...currentPlayers.keys()]) {
      if (!seenUserIds.has(id)) {
        currentPlayers.delete(id)
      }
    }

    onPlayersChange([...currentPlayers.values()])
  }

  const attachListener = (mapOnly: boolean) => {
    if (unsubscribed) return
    if (activeUnsub) {
      activeUnsub()
      activeUnsub = null
    }
    const presenceQuery = mapOnly
      ? query(
          collection(db, 'worldPresence'),
          where('mapId', '==', activeMapId || 'town'),
          limit(PRESENCE_QUERY_LIMIT),
        )
      : query(
          collection(db, 'worldPresence'),
          where('heartbeatMs', '>=', 0),
          orderBy('heartbeatMs', 'desc'),
          limit(PRESENCE_QUERY_LIMIT),
        )

    activeUnsub = onSnapshot(
      presenceQuery,
      (snapshot) => {
        handleSnapshot(snapshot)
      },
      (error) => {
        if (unsubscribed) return
        if (!auth.currentUser || auth.currentUser.uid !== selfUserId) {
          currentPlayers.clear()
          onPlayersChange([])
          return
        }
        const msg = error instanceof Error ? error.message : String(error ?? '')
        if (!mapOnly && !usingMapFallback && (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions'))) {
          usingMapFallback = true
          attachListener(true)
          return
        }
        console.error('World presence snapshot error:', error)
        onError?.(error)
      },
    )
  }

  attachListener(false)

  return () => {
    unsubscribed = true
    if (activeUnsub) {
      activeUnsub()
      activeUnsub = null
    }
  }
}
