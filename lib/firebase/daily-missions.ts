'use client'

import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
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

const inFlightMissionLoad = new Map<string, Promise<DailyMissionBoard>>()
const inFlightMissionSave = new Map<string, Promise<void>>()

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
    if (!currentUser || currentUser.uid !== userId) {
      return {
        dateKey: safeDateKey,
        ownerId: userId,
        missions: rollRandomDailyMissions(),
      }
    }

    await ensureUserProfile(currentUser)

    const docPath = `users/${userId}/dailyMissions/${safeDateKey}`
    const docRef = doc(db, 'users', userId, 'dailyMissions', safeDateKey)

    let snap
    try {
      snap = await getDoc(docRef)
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath)
    }

    if (snap.exists()) {
      const data = snap.data()
      const rawMissions = Array.isArray(data?.missions) ? data.missions : []
      if (rawMissions.length === 3) {
        return {
          dateKey: safeDateKey,
          ownerId: userId,
          missions: [
            sanitizeMissionEntry(rawMissions[0], 0),
            sanitizeMissionEntry(rawMissions[1], 1),
            sanitizeMissionEntry(rawMissions[2], 2),
          ],
        }
      }
    }

    const missions = rollRandomDailyMissions()
    try {
      await setDoc(docRef, {
        dateKey: safeDateKey,
        ownerId: userId,
        missions,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath)
    }

    return {
      dateKey: safeDateKey,
      ownerId: userId,
      missions,
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
): Promise<void> {
  const safeDateKey = isValidDateKey(dateKey) ? dateKey : getTodayDateKey()
  const key = `${userId}:${safeDateKey}`
  const normalized: DailyMissionEntry[] = [
    sanitizeMissionEntry(missions[0], 0),
    sanitizeMissionEntry(missions[1], 1),
    sanitizeMissionEntry(missions[2], 2),
  ]

  const previous = inFlightMissionSave.get(key) ?? Promise.resolve()
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      const currentUser = auth.currentUser
      if (!currentUser || currentUser.uid !== userId) return

      await ensureUserProfile(currentUser)
      const docPath = `users/${userId}/dailyMissions/${safeDateKey}`
      const docRef = doc(db, 'users', userId, 'dailyMissions', safeDateKey)

      let existingSnap
      try {
        existingSnap = await getDoc(docRef)
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, docPath)
      }

      if (!existingSnap.exists()) {
        try {
          await setDoc(docRef, {
            dateKey: safeDateKey,
            ownerId: userId,
            missions: normalized,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, docPath)
        }
        return
      }

      const existingData = existingSnap.data()
      const existingList = Array.isArray(existingData?.missions) ? existingData.missions : []
      if (existingList.length === 3) {
        // Preserve server mission definitions and guarantee monotonic progress/claim transitions.
        const merged: DailyMissionEntry[] = [0, 1, 2].map((idx) => {
          const prevEntry = sanitizeMissionEntry(existingList[idx], idx)
          const cand = normalized.find((m) => m.id === prevEntry.id) ?? normalized[idx]
          const nextProgress = Math.min(prevEntry.target, Math.max(prevEntry.progress, cand?.progress ?? 0))
          const nextClaimed = prevEntry.claimed || (Boolean(cand?.claimed) && nextProgress >= prevEntry.target)
          return {
            ...prevEntry,
            progress: nextProgress,
            claimed: nextClaimed,
          }
        })
        try {
          await updateDoc(docRef, {
            missions: merged,
            updatedAt: serverTimestamp(),
          })
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, docPath)
        }
      }
    })

  inFlightMissionSave.set(key, next)
  try {
    await next
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
