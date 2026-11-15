'use client'

import {
  deleteDoc,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { isGmAccountUser } from '@/lib/game/permissions'
import { OperationType, auth, db, handleFirestoreError } from './client'
import { ensureUserProfile } from './characters'

export type DailyMissionType =
  | 'kills'
  | 'bossKills'
  | 'skillsUsed'
  | 'enhances'
  | 'towerClears'
  | 'goldEarned'
  | 'itemsLooted'

export interface DailyMissionEntry {
  id: string
  type: DailyMissionType
  title: string
  description: string
  target: number
  progress: number
  claimed: boolean
  rewardGold: number
  rewardDiamonds: number
  rewardExp: number
  rewardStones: number
}

export interface DailyMissionBoard {
  dateKey: string
  ownerId: string
  missions: DailyMissionEntry[]
}

export interface DailyMissionTemplate {
  id: string
  type: DailyMissionType
  title: string
  description: string
  target: number
  rewardGold: number
  rewardDiamonds: number
  rewardExp: number
  rewardStones: number
}

export const DAILY_MISSION_POOL: DailyMissionTemplate[] = [
  {
    id: 'defeat_5_monsters',
    type: 'kills',
    title: 'Defeat 5 monsters',
    description: 'ปราบมอนสเตอร์ 5 ตัวในแผนที่โลก สนามล่า หรือหอคอย',
    target: 5,
    rewardGold: 250,
    rewardDiamonds: 8,
    rewardExp: 120,
    rewardStones: 1,
  },
  {
    id: 'defeat_12_monsters',
    type: 'kills',
    title: 'Defeat 12 monsters',
    description: 'ออกล่าและปราบมอนสเตอร์ครบ 12 ตัววันนี้',
    target: 12,
    rewardGold: 520,
    rewardDiamonds: 14,
    rewardExp: 260,
    rewardStones: 2,
  },
  {
    id: 'defeat_20_monsters',
    type: 'kills',
    title: 'Defeat 20 monsters',
    description: 'กวาดล้างมอนสเตอร์สะสมครบ 20 ตัวภายในวันนี้',
    target: 20,
    rewardGold: 850,
    rewardDiamonds: 22,
    rewardExp: 420,
    rewardStones: 3,
  },
  {
    id: 'defeat_boss_1',
    type: 'bossKills',
    title: 'Defeat 1 Boss or Elite',
    description: 'โค่นมอนสเตอร์ระดับบอสหรืออีลีท 1 ตัว',
    target: 1,
    rewardGold: 600,
    rewardDiamonds: 18,
    rewardExp: 320,
    rewardStones: 2,
  },
  {
    id: 'defeat_boss_2',
    type: 'bossKills',
    title: 'Defeat 2 Bosses or Elites',
    description: 'ปราบมอนสเตอร์ระดับบอสหรืออีลีทครบ 2 ตัว',
    target: 2,
    rewardGold: 1100,
    rewardDiamonds: 28,
    rewardExp: 550,
    rewardStones: 3,
  },
  {
    id: 'cast_skills_5',
    type: 'skillsUsed',
    title: 'Use 5 combat skills',
    description: 'ใช้สกิลโจมตีหรือฟื้นฟูระหว่างการต่อสู้ครบ 5 ครั้ง',
    target: 5,
    rewardGold: 260,
    rewardDiamonds: 8,
    rewardExp: 130,
    rewardStones: 1,
  },
  {
    id: 'cast_skills_12',
    type: 'skillsUsed',
    title: 'Use 12 combat skills',
    description: 'ปลดปล่อยพลังสกิลต่อสู้ครบ 12 ครั้งวันนี้',
    target: 12,
    rewardGold: 540,
    rewardDiamonds: 15,
    rewardExp: 260,
    rewardStones: 2,
  },
  {
    id: 'earn_gold_300',
    type: 'goldEarned',
    title: 'Earn 300 Gold',
    description: 'สะสมทองจากการล่ามอนสเตอร์หรือภารกิจต่อสู้ครบ 300 G',
    target: 300,
    rewardGold: 320,
    rewardDiamonds: 10,
    rewardExp: 140,
    rewardStones: 1,
  },
  {
    id: 'earn_gold_800',
    type: 'goldEarned',
    title: 'Earn 800 Gold',
    description: 'สะสมทองจากการล่ามอนสเตอร์ครบ 800 G ภายในวันนี้',
    target: 800,
    rewardGold: 720,
    rewardDiamonds: 18,
    rewardExp: 320,
    rewardStones: 2,
  },
  {
    id: 'collect_drops_3',
    type: 'itemsLooted',
    title: 'Collect 3 dropped items',
    description: 'เก็บไอเท็มที่ดรอปจากมอนสเตอร์ครบ 3 ชิ้น',
    target: 3,
    rewardGold: 300,
    rewardDiamonds: 10,
    rewardExp: 130,
    rewardStones: 1,
  },
  {
    id: 'enhance_gear_1',
    type: 'enhances',
    title: 'Enhance equipment 1 time',
    description: 'ทดลองตีบวกอาวุธหรือชุดเกราะ 1 ครั้ง',
    target: 1,
    rewardGold: 380,
    rewardDiamonds: 12,
    rewardExp: 150,
    rewardStones: 2,
  },
  {
    id: 'clear_tower_1',
    type: 'towerClears',
    title: 'Clear 1 Tower floor',
    description: 'ผ่านด่านในโหมดหอคอยไต่ชั้นอย่างน้อย 1 ชั้น',
    target: 1,
    rewardGold: 480,
    rewardDiamonds: 16,
    rewardExp: 240,
    rewardStones: 2,
  },
]

const VALID_TYPES = new Set<DailyMissionType>([
  'kills',
  'bossKills',
  'skillsUsed',
  'enhances',
  'towerClears',
  'goldEarned',
  'itemsLooted',
])

export function getTodayDateKey(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isValidDateKey(dateKey: string): boolean {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateKey)
}

function sanitizeSafeMissionId(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  return cleaned || 'defeat_5_monsters'
}

export function sanitizeMissionEntry(raw: unknown, fallbackIndex = 0): DailyMissionEntry {
  const obj = raw && typeof raw === 'object' ? (raw as Partial<DailyMissionEntry>) : {}
  const fallback = DAILY_MISSION_POOL[fallbackIndex % DAILY_MISSION_POOL.length]
  const type = typeof obj.type === 'string' && VALID_TYPES.has(obj.type as DailyMissionType)
    ? (obj.type as DailyMissionType)
    : fallback.type
  const target = Math.max(1, Math.min(100000, Math.floor(Number(obj.target ?? fallback.target) || fallback.target)))
  const progress = Math.max(0, Math.min(target, Math.floor(Number(obj.progress ?? 0) || 0)))
  const claimed = Boolean(obj.claimed) && progress >= target

  return {
    id: sanitizeSafeMissionId(typeof obj.id === 'string' ? obj.id : fallback.id),
    type,
    title: (typeof obj.title === 'string' ? obj.title : fallback.title).trim().slice(0, 80) || fallback.title,
    description:
      (typeof obj.description === 'string' ? obj.description : fallback.description).trim().slice(0, 200) ||
      fallback.description,
    target,
    progress,
    claimed,
    rewardGold: Math.max(0, Math.min(100000, Math.floor(Number(obj.rewardGold ?? fallback.rewardGold) || 0))),
    rewardDiamonds: Math.max(0, Math.min(10000, Math.floor(Number(obj.rewardDiamonds ?? fallback.rewardDiamonds) || 0))),
    rewardExp: Math.max(0, Math.min(100000, Math.floor(Number(obj.rewardExp ?? fallback.rewardExp) || 0))),
    rewardStones: Math.max(0, Math.min(1000, Math.floor(Number(obj.rewardStones ?? fallback.rewardStones) || 0))),
  }
}

export function rollRandomDailyMissions(): DailyMissionEntry[] {
  const byType = new Map<DailyMissionType, DailyMissionTemplate[]>()
  for (const tpl of DAILY_MISSION_POOL) {
    const bucket = byType.get(tpl.type) ?? []
    bucket.push(tpl)
    byType.set(tpl.type, bucket)
  }

  const types = [...byType.keys()]
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[types[i], types[j]] = [types[j], types[i]]
  }

  const chosenTypes = types.slice(0, 3)
  return chosenTypes.map((type, idx) => {
    const bucket = byType.get(type) ?? [DAILY_MISSION_POOL[idx]]
    const picked = bucket[Math.floor(Math.random() * bucket.length)]
    return sanitizeMissionEntry({ ...picked, progress: 0, claimed: false }, idx)
  })
}

function isValidRemoteMissionEntry(raw: unknown): raw is DailyMissionEntry {
  if (!raw || typeof raw !== 'object') return false
  const m = raw as Record<string, unknown>
  const keys = Object.keys(m)
  if (keys.length !== 11) return false
  return (
    typeof m.id === 'string' &&
    m.id.length >= 1 &&
    m.id.length <= 64 &&
    /^[a-zA-Z0-9_-]+$/.test(m.id) &&
    typeof m.type === 'string' &&
    VALID_TYPES.has(m.type as DailyMissionType) &&
    typeof m.title === 'string' &&
    m.title.length >= 1 &&
    m.title.length <= 80 &&
    typeof m.description === 'string' &&
    m.description.length >= 1 &&
    m.description.length <= 200 &&
    typeof m.target === 'number' &&
    Number.isInteger(m.target) &&
    m.target >= 1 &&
    m.target <= 100000 &&
    typeof m.progress === 'number' &&
    Number.isInteger(m.progress) &&
    m.progress >= 0 &&
    m.progress <= 100000 &&
    typeof m.claimed === 'boolean' &&
    typeof m.rewardGold === 'number' &&
    Number.isInteger(m.rewardGold) &&
    m.rewardGold >= 0 &&
    m.rewardGold <= 100000 &&
    typeof m.rewardDiamonds === 'number' &&
    Number.isInteger(m.rewardDiamonds) &&
    m.rewardDiamonds >= 0 &&
    m.rewardDiamonds <= 10000 &&
    typeof m.rewardExp === 'number' &&
    Number.isInteger(m.rewardExp) &&
    m.rewardExp >= 0 &&
    m.rewardExp <= 100000 &&
    typeof m.rewardStones === 'number' &&
    Number.isInteger(m.rewardStones) &&
    m.rewardStones >= 0 &&
    m.rewardStones <= 1000
  )
}

function isFirestoreTimestamp(val: unknown): boolean {
  if (!val || typeof val !== 'object') return false
  const t = val as { toMillis?: unknown; seconds?: unknown; nanoseconds?: unknown }
  return typeof t.toMillis === 'function' || (typeof t.seconds === 'number' && typeof t.nanoseconds === 'number')
}

function isValidRemoteBoard(data: unknown, dateKey: string, userId: string): boolean {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  if (Object.keys(d).length !== 5) return false
  if (d.dateKey !== dateKey || d.ownerId !== userId) return false
  if (!isFirestoreTimestamp(d.createdAt) || !isFirestoreTimestamp(d.updatedAt)) return false
  if (!Array.isArray(d.missions) || d.missions.length !== 3) return false
  return (
    isValidRemoteMissionEntry(d.missions[0]) &&
    isValidRemoteMissionEntry(d.missions[1]) &&
    isValidRemoteMissionEntry(d.missions[2])
  )
}

function buildCleanMission(entry: DailyMissionEntry): DailyMissionEntry {
  const safeTarget = Math.max(1, Math.min(100000, Math.floor(entry.target)))
  const safeProgress = Math.max(0, Math.min(100000, Math.floor(entry.progress)))
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    description: entry.description,
    target: safeTarget,
    progress: safeProgress,
    claimed: Boolean(entry.claimed) && safeProgress >= safeTarget,
    rewardGold: Math.max(0, Math.min(100000, Math.floor(entry.rewardGold))),
    rewardDiamonds: Math.max(0, Math.min(10000, Math.floor(entry.rewardDiamonds))),
    rewardExp: Math.max(0, Math.min(100000, Math.floor(entry.rewardExp))),
    rewardStones: Math.max(0, Math.min(1000, Math.floor(entry.rewardStones))),
  }
}

const inFlightMissionLoad = new Map<string, Promise<DailyMissionBoard>>()
const inFlightMissionSave = new Map<string, Promise<DailyMissionEntry[] | null>>()

export async function loadOrCreateDailyMissionsDoc(
  userId: string,
  dateKey: string = getTodayDateKey(),
): Promise<DailyMissionBoard> {
  const safeDateKey = isValidDateKey(dateKey) ? dateKey : getTodayDateKey()
  const key = `${userId}:${safeDateKey}`
  const existing = inFlightMissionLoad.get(key)
  if (existing) return existing

  const task = (async (): Promise<DailyMissionBoard> => {
    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== userId || !currentUser.emailVerified) {
      return {
        dateKey: safeDateKey,
        ownerId: userId,
        missions: rollRandomDailyMissions(),
      }
    }

    await ensureUserProfile(currentUser)

    const docPath = `users/${userId}/dailyMissions/${safeDateKey}`
    const docRef = doc(db, 'users', userId, 'dailyMissions', safeDateKey)
    const rolledMissions = rollRandomDailyMissions()

    let activeOp = OperationType.GET
    try {
      const missions = await runTransaction(db, async (tx) => {
        activeOp = OperationType.GET
        const snap = await tx.get(docRef)
        if (snap.exists()) {
          const data = snap.data()
          if (isValidRemoteBoard(data, safeDateKey, userId)) {
            const rawMissions = data.missions as DailyMissionEntry[]
            return [
              buildCleanMission(rawMissions[0]),
              buildCleanMission(rawMissions[1]),
              buildCleanMission(rawMissions[2]),
            ]
          }
          // Existing legacy or corrupted board: sanitize and repair atomically
          const rawList = Array.isArray(data?.missions) ? data.missions : []
          const repaired: DailyMissionEntry[] =
            rawList.length === 3
              ? [
                  sanitizeMissionEntry(rawList[0], 0),
                  sanitizeMissionEntry(rawList[1], 1),
                  sanitizeMissionEntry(rawList[2], 2),
                ]
              : rolledMissions
          activeOp = OperationType.UPDATE
          tx.set(docRef, {
            dateKey: safeDateKey,
            ownerId: userId,
            missions: repaired,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
          return repaired
        }

        activeOp = OperationType.CREATE
        tx.set(docRef, {
          dateKey: safeDateKey,
          ownerId: userId,
          missions: rolledMissions,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        return rolledMissions
      })

      return {
        dateKey: safeDateKey,
        ownerId: userId,
        missions,
      }
    } catch (error) {
      handleFirestoreError(error, activeOp, docPath)
    }
  })()

  inFlightMissionLoad.set(key, task)
  try {
    return await task
  } finally {
    if (inFlightMissionLoad.get(key) === task) {
      inFlightMissionLoad.delete(key)
    }
  }
}

export async function saveDailyMissionsDoc(
  userId: string,
  dateKey: string,
  missions: DailyMissionEntry[],
): Promise<DailyMissionEntry[] | null> {
  const safeDateKey = isValidDateKey(dateKey) ? dateKey : getTodayDateKey()
  const key = `${userId}:${safeDateKey}`
  const normalized: DailyMissionEntry[] = [
    sanitizeMissionEntry(missions[0], 0),
    sanitizeMissionEntry(missions[1], 1),
    sanitizeMissionEntry(missions[2], 2),
  ]

  const previous = inFlightMissionSave.get(key) ?? Promise.resolve(null)
  const next = previous
    .catch(() => null)
    .then(async (): Promise<DailyMissionEntry[] | null> => {
      const pendingLoad = inFlightMissionLoad.get(key)
      if (pendingLoad) {
        await pendingLoad.catch(() => undefined)
      }

      const currentUser = auth.currentUser
      if (!currentUser || currentUser.uid !== userId || !currentUser.emailVerified) return null

      await ensureUserProfile(currentUser)
      const docPath = `users/${userId}/dailyMissions/${safeDateKey}`
      const docRef = doc(db, 'users', userId, 'dailyMissions', safeDateKey)

      let activeOp = OperationType.GET
      try {
        return await runTransaction(db, async (tx) => {
          activeOp = OperationType.GET
          const existingSnap = await tx.get(docRef)

          if (!existingSnap.exists()) {
            activeOp = OperationType.CREATE
            tx.set(docRef, {
              dateKey: safeDateKey,
              ownerId: userId,
              missions: normalized,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
            return normalized
          }

          const existingData = existingSnap.data()
          if (!isValidRemoteBoard(existingData, safeDateKey, userId)) {
            const rawList = Array.isArray(existingData?.missions) ? existingData.missions : []
            const repairedBase: DailyMissionEntry[] =
              rawList.length === 3
                ? [
                    sanitizeMissionEntry(rawList[0], 0),
                    sanitizeMissionEntry(rawList[1], 1),
                    sanitizeMissionEntry(rawList[2], 2),
                  ]
                : normalized
            const repaired = repairedBase.map((base) => {
              const cand = normalized.find((m) => m.id === base.id)
              const nextProgress = cand
                ? Math.max(base.progress, Math.min(base.target, Math.floor(cand.progress)))
                : base.progress
              const nextClaimed = base.claimed || (Boolean(cand?.claimed) && nextProgress >= base.target)
              return buildCleanMission({
                ...base,
                progress: nextProgress,
                claimed: nextClaimed,
              })
            })
            activeOp = OperationType.UPDATE
            tx.set(docRef, {
              dateKey: safeDateKey,
              ownerId: userId,
              missions: repaired,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
            return repaired
          }

          const existingList = existingData.missions as DailyMissionEntry[]
          let hasChanges = false
          const merged = [0, 1, 2].map((idx) => {
            const prev = buildCleanMission(existingList[idx])
            const cand = normalized.find((m) => m.id === prev.id)
            const candProgress = cand && Number.isFinite(cand.progress)
              ? Math.max(0, Math.min(prev.target, Math.floor(cand.progress)))
              : 0
            const nextProgress = Math.max(prev.progress, Math.min(prev.target, candProgress))
            const nextClaimed = prev.claimed || (Boolean(cand?.claimed) && nextProgress >= prev.target)

            if (nextProgress !== prev.progress || nextClaimed !== prev.claimed) {
              hasChanges = true
            }

            return {
              id: prev.id,
              type: prev.type,
              title: prev.title,
              description: prev.description,
              target: prev.target,
              progress: nextProgress,
              claimed: nextClaimed,
              rewardGold: prev.rewardGold,
              rewardDiamonds: prev.rewardDiamonds,
              rewardExp: prev.rewardExp,
              rewardStones: prev.rewardStones,
            }
          })

          if (hasChanges) {
            activeOp = OperationType.UPDATE
            tx.update(docRef, {
              missions: merged,
              updatedAt: serverTimestamp(),
            })
          }

          return merged
        })
      } catch (error) {
        handleFirestoreError(error, activeOp, docPath)
      }
    })

  inFlightMissionSave.set(key, next)
  try {
    return await next
  } finally {
    if (inFlightMissionSave.get(key) === next) {
      inFlightMissionSave.delete(key)
    }
  }
}

export async function devRerollDailyMissionsDoc(
  userId: string,
  dateKey: string = getTodayDateKey(),
): Promise<DailyMissionBoard | null> {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== userId || !isGmAccountUser(currentUser)) {
    return null
  }
  const safeDateKey = isValidDateKey(dateKey) ? dateKey : getTodayDateKey()
  const docPath = `users/${userId}/dailyMissions/${safeDateKey}`
  const docRef = doc(db, 'users', userId, 'dailyMissions', safeDateKey)
  try {
    await deleteDoc(docRef)
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath)
  }
  return loadOrCreateDailyMissionsDoc(userId, safeDateKey)
}
