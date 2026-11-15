'use client'

import { useSyncExternalStore } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { isGmAccountUser } from '@/lib/game/permissions'
import {
  devRerollDailyMissionsDoc,
  getTodayDateKey,
  loadOrCreateDailyMissionsDoc,
  rollRandomDailyMissions,
  sanitizeMissionEntry,
  saveDailyMissionsDoc,
  type DailyMissionBoard,
  type DailyMissionEntry,
  type DailyMissionType,
} from '@/lib/firebase/daily-missions'

export type DailyMissionProgressEvent = Partial<Record<DailyMissionType, number>>

export interface DailyMissionStoreState {
  board: DailyMissionBoard | null
  loading: boolean
  syncing: boolean
  isCloud: boolean
  error: string | null
  claimableCount: number
  lastCompletedTitle: string | null
}

const LOCAL_STORAGE_PREFIX = 'pixel-rpg-daily-missions-v1'

let state: DailyMissionStoreState = {
  board: null,
  loading: true,
  syncing: false,
  isCloud: false,
  error: null,
  claimableCount: 0,
  lastCompletedTitle: null,
}

let activeUserId: string | null = null
let pendingDelta: DailyMissionProgressEvent = {}
let flushTimer: ReturnType<typeof setTimeout> | null = null
let initialized = false

const listeners = new Set<() => void>()
const completionListeners = new Set<(mission: DailyMissionEntry) => void>()

function emit() {
  for (const listener of listeners) listener()
}

function countClaimable(board: DailyMissionBoard | null): number {
  if (!board) return 0
  return board.missions.filter((m) => !m.claimed && m.progress >= m.target).length
}

function localStorageKey(userId: string | null, dateKey: string): string {
  return userId
    ? `${LOCAL_STORAGE_PREFIX}:user:${userId}:${dateKey}`
    : `${LOCAL_STORAGE_PREFIX}:guest:${dateKey}`
}

function readLocalBoard(userId: string | null, dateKey: string): DailyMissionBoard | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(localStorageKey(userId, dateKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<DailyMissionBoard>
    if (parsed.dateKey !== dateKey || !Array.isArray(parsed.missions) || parsed.missions.length !== 3) {
      return null
    }
    return {
      dateKey,
      ownerId: userId ?? 'guest',
      missions: [
        sanitizeMissionEntry(parsed.missions[0], 0),
        sanitizeMissionEntry(parsed.missions[1], 1),
        sanitizeMissionEntry(parsed.missions[2], 2),
      ],
    }
  } catch {
    return null
  }
}

function writeLocalBoard(userId: string | null, board: DailyMissionBoard) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(localStorageKey(userId, board.dateKey), JSON.stringify(board))
  } catch {
    // Ignore storage quota errors.
  }
}

function applyDeltaToBoard(board: DailyMissionBoard, delta: DailyMissionProgressEvent): {
  nextBoard: DailyMissionBoard
  changed: boolean
  newlyCompleted: DailyMissionEntry[]
} {
  let changed = false
  const newlyCompleted: DailyMissionEntry[] = []

  const missions = board.missions.map((mission) => {
    const add = Math.max(0, Math.floor(delta[mission.type] ?? 0))
    if (add <= 0 || mission.progress >= mission.target) return mission
    const nextProgress = Math.min(mission.target, mission.progress + add)
    if (nextProgress === mission.progress) return mission
    changed = true
    const updated = { ...mission, progress: nextProgress }
    if (mission.progress < mission.target && nextProgress >= mission.target) {
      newlyCompleted.push(updated)
    }
    return updated
  })

  return {
    nextBoard: changed ? { ...board, missions } : board,
    changed,
    newlyCompleted,
  }
}

async function flushCloudSave() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  const board = state.board
  const userId = activeUserId
  if (!board || !userId || !auth.currentUser || auth.currentUser.uid !== userId) return

  state = { ...state, syncing: true, error: null }
  emit()

  try {
    await saveDailyMissionsDoc(userId, board.dateKey, board.missions)
    state = { ...state, syncing: false, isCloud: true, error: null }
  } catch (err) {
    console.error('Failed to save daily mission progress to Firestore:', err)
    state = {
      ...state,
      syncing: false,
      error: 'ซิงค์ความคืบหน้าภารกิจรายวันกับ Firestore ไม่สำเร็จ',
    }
  }
  emit()
}

function scheduleCloudSave(immediate = false) {
  if (!activeUserId) return
  if (immediate) {
    void flushCloudSave()
    return
  }
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushCloudSave()
  }, 1200)
}

async function loadBoardForUser(userId: string | null) {
  const dateKey = getTodayDateKey()
  activeUserId = userId

  if (!userId) {
    const existingGuest = readLocalBoard(null, dateKey)
    let board: DailyMissionBoard = existingGuest ?? {
      dateKey,
      ownerId: 'guest',
      missions: rollRandomDailyMissions(),
    }
    if (Object.keys(pendingDelta).length > 0) {
      const applied = applyDeltaToBoard(board, pendingDelta)
      board = applied.nextBoard
      pendingDelta = {}
    }
    writeLocalBoard(null, board)
    state = {
      board,
      loading: false,
      syncing: false,
      isCloud: false,
      error: null,
      claimableCount: countClaimable(board),
      lastCompletedTitle: state.lastCompletedTitle,
    }
    emit()
    return
  }

  state = { ...state, loading: true, error: null, isCloud: true }
  emit()

  try {
    let board = await loadOrCreateDailyMissionsDoc(userId, dateKey)
    if (activeUserId !== userId) return

    // Merge any higher progress cached locally from the same date/user (e.g. offline/pre-load kills).
    const cached = readLocalBoard(userId, dateKey)
    let needsCloudSync = false
    if (cached) {
      const mergedMissions = board.missions.map((srv, idx) => {
        const local = cached.missions.find((m) => m.id === srv.id) ?? cached.missions[idx]
        if (!local) return srv
        const progress = Math.min(srv.target, Math.max(srv.progress, local.progress))
        const claimed = srv.claimed || (local.claimed && progress >= srv.target)
        if (progress > srv.progress || claimed !== srv.claimed) needsCloudSync = true
        return { ...srv, progress, claimed }
      })
      board = { ...board, missions: mergedMissions }
    }

    if (Object.keys(pendingDelta).length > 0) {
      const applied = applyDeltaToBoard(board, pendingDelta)
      board = applied.nextBoard
      if (applied.changed) needsCloudSync = true
      pendingDelta = {}
    }

    writeLocalBoard(userId, board)
    state = {
      board,
      loading: false,
      syncing: false,
      isCloud: true,
      error: null,
      claimableCount: countClaimable(board),
      lastCompletedTitle: state.lastCompletedTitle,
    }
    emit()

    if (needsCloudSync) {
      scheduleCloudSave(true)
    }
  } catch (err) {
    console.error('Failed to load daily missions from Firestore:', err)
    const fallback = readLocalBoard(userId, dateKey) ?? {
      dateKey,
      ownerId: userId,
      missions: rollRandomDailyMissions(),
    }
    writeLocalBoard(userId, fallback)
    state = {
      board: fallback,
      loading: false,
      syncing: false,
      isCloud: false,
      error: 'โหลดภารกิจรายวันจาก Firestore ไม่สำเร็จ (ใช้ข้อมูลสำรองชั่วคราว)',
      claimableCount: countClaimable(fallback),
      lastCompletedTitle: state.lastCompletedTitle,
    }
    emit()
  }
}

export function initDailyMissionsStore() {
  if (typeof window === 'undefined' || initialized) return
  initialized = true

  queueMicrotask(() => {
    onAuthStateChanged(auth, (user) => {
      void loadBoardForUser(user?.uid ?? null)
    })
  })

  window.addEventListener('pagehide', () => {
    void flushCloudSave()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void flushCloudSave()
    }
  })
}

export function refreshDailyMissions(): Promise<void> {
  initDailyMissionsStore()
  return loadBoardForUser(auth.currentUser?.uid ?? null)
}

export function onDailyMissionCompleted(cb: (mission: DailyMissionEntry) => void): () => void {
  completionListeners.add(cb)
  return () => {
    completionListeners.delete(cb)
  }
}

export function recordDailyMissionProgress(event: DailyMissionProgressEvent) {
  initDailyMissionsStore()
  const today = getTodayDateKey()

  // Roll over cleanly if local midnight passed while playing.
  if (state.board && state.board.dateKey !== today) {
    for (const [k, v] of Object.entries(event)) {
      const key = k as DailyMissionType
      pendingDelta[key] = (pendingDelta[key] ?? 0) + (v ?? 0)
    }
    void loadBoardForUser(auth.currentUser?.uid ?? null)
    return
  }

  if (!state.board || state.loading) {
    for (const [k, v] of Object.entries(event)) {
      const key = k as DailyMissionType
      pendingDelta[key] = (pendingDelta[key] ?? 0) + (v ?? 0)
    }
    return
  }

  const { nextBoard, changed, newlyCompleted } = applyDeltaToBoard(state.board, event)
  if (!changed) return

  writeLocalBoard(activeUserId, nextBoard)
  state = {
    ...state,
    board: nextBoard,
    claimableCount: countClaimable(nextBoard),
    lastCompletedTitle: newlyCompleted[0]?.title ?? state.lastCompletedTitle,
  }
  emit()

  for (const m of newlyCompleted) {
    for (const cb of completionListeners) cb(m)
  }

  scheduleCloudSave(newlyCompleted.length > 0)
}

export async function claimDailyMission(
  missionId: string,
  grantRewards: (mission: DailyMissionEntry) => boolean,
): Promise<{ ok: boolean; message: string; mission?: DailyMissionEntry }> {
  initDailyMissionsStore()
  const board = state.board
  if (!board) return { ok: false, message: 'กำลังโหลดภารกิจรายวัน กรุณารอสักครู่' }

  const index = board.missions.findIndex((m) => m.id === missionId)
  if (index === -1) return { ok: false, message: 'ไม่พบภารกิจรายวันรายการนี้' }

  const targetMission = board.missions[index]
  if (targetMission.claimed) return { ok: false, message: 'รับรางวัลภารกิจนี้ไปแล้ว' }
  if (targetMission.progress < targetMission.target) {
    return { ok: false, message: 'ภารกิจยังไม่ครบตามเป้าหมาย' }
  }

  const granted = grantRewards(targetMission)
  if (!granted) {
    return { ok: false, message: 'ไม่สามารถรับรางวัลได้ในขณะนี้' }
  }

  const nextMissions = board.missions.map((m, i) => (i === index ? { ...m, claimed: true } : m))
  const nextBoard: DailyMissionBoard = { ...board, missions: nextMissions }
  writeLocalBoard(activeUserId, nextBoard)

  state = {
    ...state,
    board: nextBoard,
    claimableCount: countClaimable(nextBoard),
  }
  emit()

  if (activeUserId) {
    await flushCloudSave()
  }

  const parts = [`+${targetMission.rewardGold.toLocaleString()} G`]
  if (targetMission.rewardDiamonds > 0) parts.push(`+${targetMission.rewardDiamonds} เพชร`)
  if (targetMission.rewardExp > 0) parts.push(`+${targetMission.rewardExp} EXP`)
  if (targetMission.rewardStones > 0) parts.push(`+หินตีบวก x${targetMission.rewardStones}`)

  return {
    ok: true,
    message: `สำเร็จภารกิจ "${targetMission.title}" (${parts.join(' · ')})`,
    mission: nextMissions[index],
  }
}

export function getDailyMissionSnapshot(): DailyMissionStoreState {
  initDailyMissionsStore()
  return state
}

export function useDailyMissions(): DailyMissionStoreState {
  initDailyMissionsStore()
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
    () => state,
  )
}

export async function devCompleteAllDailyMissions(): Promise<{ ok: boolean; message: string }> {
  if (!isGmAccountUser(auth.currentUser)) {
    return { ok: false, message: 'สงวนสิทธิ์เฉพาะบัญชี GM (ffsmilepay53@gmail.com)' }
  }
  initDailyMissionsStore()
  if (!state.board) return { ok: false, message: 'ยังไม่มีข้อมูลภารกิจวันนี้' }
  const missions = state.board.missions.map((m) => ({ ...m, progress: m.target }))
  const nextBoard: DailyMissionBoard = { ...state.board, missions }
  writeLocalBoard(activeUserId, nextBoard)
  state = {
    ...state,
    board: nextBoard,
    claimableCount: countClaimable(nextBoard),
  }
  emit()
  if (activeUserId) await flushCloudSave()
  return { ok: true, message: 'เติมความคืบหน้าภารกิจรายวันครบ 100% แล้ว' }
}

export async function devRerollDailyMissions(): Promise<{ ok: boolean; message: string }> {
  const user = auth.currentUser
  if (!isGmAccountUser(user) || !user) {
    return { ok: false, message: 'สงวนสิทธิ์เฉพาะบัญชี GM (ffsmilepay53@gmail.com)' }
  }
  initDailyMissionsStore()
  const dateKey = getTodayDateKey()
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(localStorageKey(user.uid, dateKey))
    } catch {
      // Ignore storage errors.
    }
  }
  const board = await devRerollDailyMissionsDoc(user.uid, dateKey)
  if (!board) return { ok: false, message: 'รีสุ่มภารกิจไม่สำเร็จ' }
  writeLocalBoard(user.uid, board)
  state = {
    ...state,
    board,
    loading: false,
    syncing: false,
    isCloud: true,
    error: null,
    claimableCount: countClaimable(board),
  }
  emit()
  return { ok: true, message: 'รีสุ่มภารกิจรายวันใหม่เรียบร้อยแล้ว' }
}
