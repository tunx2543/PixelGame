'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowLeft,
  Castle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Droplets,
  Flame,
  Gem,
  Hammer,
  Heart,
  PawPrint,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { auth } from '@/lib/firebase/client'
import { listUserCharacters } from '@/lib/firebase/characters'
import { AccountPanel } from './account-panel'
import { JOBS, MAX_LEVEL, expToNext, normalizeJobId, type SkillDef } from '@/lib/game/data'
import { getSkillIconPath, getSkillVfxSpec } from '@/lib/game/vfx-specs'
import {
  SAVE_KEY,
  getActiveCharacterSlot,
  getInventoryCapacity,
  getStats,
  setActiveCharacterSlot,
  setGameAccountIdentity,
  syncExternalDiamondDelta,
  type SaveData,
} from '@/lib/game/engine'
import { recordDailyMissionProgress } from '@/lib/game/daily-missions'
import {
  calculateEnemyAttack,
  calculatePlayerAttack,
  createDefaultEncounterSave,
  encounterSaveStorageKey,
  persistEncounterSave,
  recoverFromDefeat,
  useRecoveryPotion,
  type EncounterEnemy,
} from '@/lib/game/encounter'
import {
  playQuestClaimSfx,
  triggerAttackSound,
  triggerCritSound,
  triggerDefeatSound,
  triggerHitSound,
  triggerLevelUpSound,
  triggerPetAttackSound,
  triggerSkillSound,
  triggerVictorySound,
} from '@/lib/game/combat-audio'
import {
  COMBAT_PETS,
  applyLevelAndRewards,
  generateTowerFloor,
  getActivePetBonuses,
  grantActivePetExp,
  recordQuestProgress,
  sanitizePetState,
  sanitizeQuestState,
  sanitizeTowerState,
  type TowerFloorEncounter,
} from '@/lib/game/systems'
import { formatNum } from './format'
import { EncounterStageCanvas, type StagePopup } from './encounter-stage-canvas'
import {
  createFloatingPopup,
  pruneExpiredPopups,
  type FloatingPopupKind,
} from '@/lib/game/floating-damage'
import { evaluateAttackShake, type ScreenShakeEvent } from '@/lib/game/screen-shake'
import { pickNewerSave } from '@/lib/game/save-sync'
import {
  ELEMENT_META,
  STATUS_META,
  evaluateGuardAction,
  getMonsterElement,
  recordBestiaryKillInState,
  rollStatusInfliction,
  type StatusEffectType,
} from '@/lib/game/rpg-systems'

type TowerPhase = 'LOADING' | 'READY' | 'FIGHTING' | 'VICTORY' | 'DEFEAT'

interface TowerVictoryOutcome {
  floor: number
  isFirstClear: boolean
  goldEarned: number
  expEarned: number
  diamondsEarned: number
  stonesEarned: number
  leveledFrom: number
  leveledTo: number
}

interface TowerLogEntry {
  id: number
  text: string
  tone: 'hero' | 'pet' | 'crit' | 'enemy' | 'loot' | 'system'
}

function TowerMeter({
  label,
  value,
  max,
  colorClass,
  textClassName,
}: {
  label: string
  value: number
  max: number
  colorClass: string
  textClassName: string
}) {
  const safeMax = Math.max(1, max)
  const clamped = Math.max(0, Math.min(safeMax, value))
  const pct = Math.round((clamped / safeMax) * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-semibold ${textClassName}`}>{label}</span>
        <span className="tabular-nums text-foreground/90">
          {formatNum(clamped)} / {formatNum(safeMax)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clamped}
        className="h-2.5 w-full overflow-hidden border border-[#0e0f1a] bg-muted/80"
      >
        <div className={`h-full transition-[width] duration-150 ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function TowerArena() {
  const [phase, setPhase] = useState<TowerPhase>('LOADING')
  const [user, setUser] = useState<User | null>(null)
  const [slotId, setSlotId] = useState<string>('slot_1')
  const [save, setSave] = useState<SaveData | null>(null)
  const [floorSpec, setFloorSpec] = useState<TowerFloorEncounter | null>(null)
  const [enemy, setEnemy] = useState<EncounterEnemy | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(30)
  const [muted, setMuted] = useState(false)
  const [syncNotice, setSyncNotice] = useState('กำลังเชื่อมต่อข้อมูลหอคอย...')

  const [attackCd, setAttackCd] = useState(0)
  const [skillCds, setSkillCds] = useState<Record<string, number>>({})
  const [enemyAttackProgress, setEnemyAttackProgress] = useState(0)
  const [guardCd, setGuardCd] = useState(0)
  const [enemyStatuses, setEnemyStatuses] = useState<Partial<Record<StatusEffectType, number>>>({})
  const [playerShieldSec, setPlayerShieldSec] = useState(0)
  const [victoryOutcome, setVictoryOutcome] = useState<TowerVictoryOutcome | null>(null)
  const [defeatReason, setDefeatReason] = useState<'hp' | 'timeout'>('hp')
  const [logs, setLogs] = useState<TowerLogEntry[]>([])

  const [playerAttackPulse, setPlayerAttackPulse] = useState(0)
  const [playerSkillColor, setPlayerSkillColor] = useState<string | null>(null)
  const [playerSkillId, setPlayerSkillId] = useState<string | null>(null)
  const [playerHitPulse, setPlayerHitPulse] = useState(0)
  const [enemyAttackPulse, setEnemyAttackPulse] = useState(0)
  const [enemyHitPulse, setEnemyHitPulse] = useState(0)
  const [petAttackPulse, setPetAttackPulse] = useState(0)
  const [popups, setPopups] = useState<StagePopup[]>([])
  const [shakeEvent, setShakeEvent] = useState<ScreenShakeEvent | null>(null)

  const saveRef = useRef<SaveData | null>(null)
  const floorSpecRef = useRef<TowerFloorEncounter | null>(null)
  const enemyRef = useRef<EncounterEnemy | null>(null)
  const phaseRef = useRef<TowerPhase>('LOADING')
  const userRef = useRef<User | null>(null)
  const slotRef = useRef<string>('slot_1')
  const mutedRef = useRef<boolean>(false)
  const timeLeftRef = useRef<number>(30)
  const attackCdRef = useRef<number>(0)
  const skillCdsRef = useRef<Record<string, number>>({})
  const guardCdRef = useRef<number>(0)
  const enemyProgressRef = useRef<number>(0)
  const enemyTimerResetReqRef = useRef<boolean>(false)
  const enemyStatusesRef = useRef<Partial<Record<StatusEffectType, number>>>({})
  const playerShieldRef = useRef<number>(0)
  const logSeqRef = useRef(0)
  const popupSeqRef = useRef(0)
  const shakeSeqRef = useRef(0)

  saveRef.current = save
  floorSpecRef.current = floorSpec
  enemyRef.current = enemy
  phaseRef.current = phase
  userRef.current = user
  slotRef.current = slotId
  mutedRef.current = muted

  const appendLog = useCallback((text: string, tone: TowerLogEntry['tone'] = 'system') => {
    const id = ++logSeqRef.current
    setLogs((prev) => [{ id, text, tone }, ...prev].slice(0, 12))
  }, [])

  const popupTimersRef = useRef<number[]>([])

  useEffect(() => {
    return () => {
      for (const timer of popupTimersRef.current) {
        window.clearTimeout(timer)
      }
      popupTimersRef.current = []
    }
  }, [])

  const pushPopup = useCallback(
    (
      target: 'player' | 'enemy',
      amount: number,
      kind: FloatingPopupKind,
      color: string,
      options?: { badge?: string; prefix?: string; suffix?: string },
    ) => {
      const id = ++popupSeqRef.current
      const now = performance.now()
      let createdDuration = 950
      setPopups((prev) => {
        const active = pruneExpiredPopups(prev, now)
        const nextPopup = createFloatingPopup({
          id,
          target,
          kind,
          amount,
          color,
          now,
          activePopups: active,
          badge: options?.badge,
          prefix: options?.prefix,
          suffix: options?.suffix,
        })
        createdDuration = nextPopup.durationMs
        return [...active, nextPopup]
      })
      const timer = window.setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== id))
      }, createdDuration + 60)
      popupTimersRef.current.push(timer)
    },
    [],
  )

  const syncSave = useCallback(async (nextSave: SaveData, activeUser: User | null, activeSlot: string) => {
    const cloudUid = activeUser && activeUser.emailVerified ? activeUser.uid : null
    try {
      await persistEncounterSave(nextSave, activeSlot, cloudUid)
      setSyncNotice(cloudUid ? `ซิงค์ข้อมูลหอคอยกับคลาวด์แล้ว (${activeSlot})` : 'บันทึกความคืบหน้าลงเครื่องแล้ว')
    } catch {
      setSyncNotice('บันทึกในเครื่องแล้ว (รอซิงค์คลาวด์)')
    }
  }, [])

  const loadFloor = useCallback(
    (targetFloor: number) => {
      const clampedFloor = Math.max(1, targetFloor)
      const spec = generateTowerFloor(clampedFloor)
      setFloorSpec(spec)
      setEnemy(spec.enemy)
      timeLeftRef.current = spec.timeLimitSec
      setTimeLeft(spec.timeLimitSec)
      setVictoryOutcome(null)
      setShakeEvent(null)
      attackCdRef.current = 0
      skillCdsRef.current = {}
      guardCdRef.current = 0
      enemyProgressRef.current = 0
      enemyStatusesRef.current = {}
      playerShieldRef.current = 0
      setAttackCd(0)
      setSkillCds({})
      setGuardCd(0)
      setEnemyStatuses({})
      setPlayerShieldSec(0)
      setEnemyAttackProgress(0)
      setPhase('READY')
      appendLog(
        `เข้าสู่หอคอยชั้นที่ ${spec.floor}: ${spec.enemy.def.name}${spec.isBossFloor ? ' (บอสประจำชั้น!)' : ''}`,
        spec.isBossFloor ? 'crit' : 'system',
      )
    },
    [appendLog],
  )

  useEffect(() => {
    let active = true
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!active) return
      const cloudUid = nextUser && nextUser.emailVerified ? nextUser.uid : null
      setUser(nextUser)
      const preferredSlot = getActiveCharacterSlot() || 'slot_1'
      let resolvedSave: SaveData | null = null
      let resolvedSlot = preferredSlot

      if (cloudUid) {
        setGameAccountIdentity(cloudUid)
        let cloudSave: SaveData | null = null
        try {
          const chars = await listUserCharacters(cloudUid)
          const match = chars.find((c) => c.id === preferredSlot) ?? chars[0]
          if (match) {
            resolvedSlot = match.id
            setActiveCharacterSlot(match.id)
            cloudSave = match.saveData
          }
        } catch {
          // Fall back to localStorage
        }
        let localSave: SaveData | null = null
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(encounterSaveStorageKey(cloudUid, resolvedSlot))
            if (raw) localSave = JSON.parse(raw) as SaveData
          } catch {
            // Ignore malformed save
          }
        }
        const resolved = pickNewerSave(cloudSave, localSave)
        resolvedSave = resolved.save
        if (resolved.localIsNewer && resolved.save) {
          void persistEncounterSave(resolved.save, resolvedSlot, cloudUid).catch(() => undefined)
        }
      } else {
        setGameAccountIdentity(null)
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(SAVE_KEY)
            if (raw) resolvedSave = JSON.parse(raw) as SaveData
          } catch {
            // Ignore malformed save
          }
        }
      }

      if (!resolvedSave || resolvedSave.version !== 1) {
        resolvedSave = createDefaultEncounterSave(nextUser?.displayName || 'นักผจญภัย')
        try {
          await persistEncounterSave(resolvedSave, resolvedSlot, cloudUid)
        } catch {
          // Keep initialized default save in local memory even if cloud sync fails.
        }
      }

      resolvedSave = {
        ...resolvedSave,
        petState: sanitizePetState(resolvedSave.petState, resolvedSave.ownedGemItems, resolvedSave.equippedGemCompanion),
        questState: sanitizeQuestState(resolvedSave.questState, resolvedSave.kills),
        towerState: sanitizeTowerState(resolvedSave.towerState),
      }
      const stats = getStats(resolvedSave)
      if (resolvedSave.hp <= 0) resolvedSave.hp = stats.maxHp

      if (!active) return
      setSlotId(resolvedSlot)
      setSave(resolvedSave)
      const startFloor = Math.max(1, (resolvedSave.towerState?.highestFloor ?? 0) + 1)
      loadFloor(startFloor)
      setSyncNotice(
        nextUser ? `เชื่อมต่อเซฟ ${resolvedSave.name} (${resolvedSlot}) แล้ว` : `โหมดผู้เล่นทั่วไป: ${resolvedSave.name}`,
      )
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [loadFloor])

  const handleVictory = useCallback(
    (currentSave: SaveData, spec: TowerFloorEncounter) => {
      if (phaseRef.current === 'VICTORY') return
      phaseRef.current = 'VICTORY'

      const nextSave: SaveData = structuredClone(currentSave)
      const prevTower = sanitizeTowerState(nextSave.towerState)
      const isFirstClear = spec.floor > prevTower.highestFloor
      const petBonus = getActivePetBonuses(nextSave.petState, nextSave.equippedGemCompanion, nextSave.ownedGemItems)

      const goldEarned = Math.round(spec.clearGold * (petBonus?.goldMul ?? 1))
      const expEarned = Math.round(spec.clearExp * (petBonus?.expMul ?? 1))
      const diamondsEarned = isFirstClear ? spec.firstClearDiamonds : spec.isBossFloor ? 5 : 1

      nextSave.kills = (nextSave.kills ?? 0) + 1
      nextSave.rpgExt = recordBestiaryKillInState(nextSave.rpgExt, spec.enemy.def.id, nextSave)
      nextSave.towerState = {
        highestFloor: Math.max(prevTower.highestFloor, spec.floor),
        currentFloor: Math.max(prevTower.highestFloor, spec.floor) + 1,
        totalClears: prevTower.totalClears + 1,
        bossClears: prevTower.bossClears + (spec.isBossFloor ? 1 : 0),
        lastDailyClaimDate: prevTower.lastDailyClaimDate,
      }
      nextSave.questState = recordQuestProgress(
        nextSave.questState,
        { kills: 1, bossKills: spec.isBossFloor ? 1 : 0, towerClears: 1 },
        nextSave.kills,
      )
      const sanitizedPets = sanitizePetState(nextSave.petState, nextSave.ownedGemItems, nextSave.equippedGemCompanion)
      nextSave.petState = grantActivePetExp(sanitizedPets, Math.max(8, Math.round(expEarned * 0.3))).nextPetState

      const beforeDiamonds = nextSave.diamonds ?? 0
      const applied = applyLevelAndRewards(
        nextSave,
        {
          gold: goldEarned,
          exp: expEarned,
          diamonds: diamondsEarned,
          stones: spec.clearStones,
        },
        () => getStats(nextSave),
        getInventoryCapacity(nextSave),
      )
      const gainedDiamonds = (nextSave.diamonds ?? 0) - beforeDiamonds
      if (gainedDiamonds > 0) {
        nextSave.diamonds = beforeDiamonds
        syncExternalDiamondDelta(nextSave, gainedDiamonds, 'tower_floor', `พิชิตหอคอยชั้น ${spec.floor}`)
      }

      saveRef.current = nextSave
      setSave(nextSave)
      setVictoryOutcome({
        floor: spec.floor,
        isFirstClear,
        goldEarned,
        expEarned,
        diamondsEarned,
        stonesEarned: applied.stonesAdded,
        leveledFrom: applied.leveledFrom,
        leveledTo: applied.leveledTo,
      })
      setPhase('VICTORY')
      recordDailyMissionProgress({
        kills: 1,
        bossKills: spec.isBossFloor ? 1 : 0,
        towerClears: 1,
        goldEarned,
      })

      if (applied.leveledTo > applied.leveledFrom) {
        triggerLevelUpSound({ muted: mutedRef.current, source: 'tower', detail: { floor: spec.floor, level: applied.leveledTo } })
        appendLog(`เลเวลอัป! เลื่อนระดับเป็น Lv.${applied.leveledTo}`, 'crit')
      } else {
        triggerVictorySound({ muted: mutedRef.current, source: 'tower', detail: { floor: spec.floor } })
      }

      appendLog(
        `พิชิตชั้นที่ ${spec.floor} สำเร็จ! +${formatNum(goldEarned)} G, +${formatNum(diamondsEarned)} เพชร, +${formatNum(expEarned)} EXP`,
        'loot',
      )
      void syncSave(nextSave, userRef.current, slotRef.current)
    },
    [appendLog, syncSave],
  )

  const executeHeroAttack = useCallback(
    (skill?: SkillDef) => {
      const currentSave = saveRef.current
      const currentEnemy = enemyRef.current
      const currentSpec = floorSpecRef.current
      const currentPhase = phaseRef.current
      if (!currentSave || !currentEnemy || !currentSpec || (currentPhase !== 'READY' && currentPhase !== 'FIGHTING')) return

      if (skill) {
        if ((skillCdsRef.current[skill.id] ?? 0) > 0) return
        if (currentSave.mp < skill.mp) {
          appendLog('MP ไม่เพียงพอสำหรับสกิลนี้', 'system')
          return
        }
      } else if (attackCdRef.current > 0) {
        return
      }

      if (currentPhase === 'READY') {
        phaseRef.current = 'FIGHTING'
        setPhase('FIGHTING')
      }

      const nextSave: SaveData = structuredClone(currentSave)
      const job = JOBS[normalizeJobId(nextSave.jobId)]

      if (skill) {
        nextSave.mp -= skill.mp
        const nextSkills = { ...skillCdsRef.current, [skill.id]: skill.cooldown }
        skillCdsRef.current = nextSkills
        setSkillCds(nextSkills)
        const nextAttackCd = Math.max(attackCdRef.current, 0.2)
        attackCdRef.current = nextAttackCd
        setAttackCd(nextAttackCd)
        recordDailyMissionProgress({ skillsUsed: 1 })
      } else {
        attackCdRef.current = job.attackSpeed
        setAttackCd(job.attackSpeed)
      }

      if (skill && skill.kind === 'heal') {
        const stats = getStats(nextSave)
        const skillLv = nextSave.skillLevels?.[skill.id] ?? 1
        const healRatio = skill.mult * (1 + (skillLv - 1) * 0.08)
        const recovered = Math.max(12, Math.round(stats.maxHp * healRatio))
        nextSave.hp = Math.min(stats.maxHp, nextSave.hp + recovered)
        saveRef.current = nextSave
        setSave(nextSave)
        setPlayerAttackPulse(performance.now())
        setPlayerSkillColor(skill.color)
        setPlayerSkillId(skill.id)
        triggerSkillSound({ muted: mutedRef.current, source: 'tower', detail: { skillId: skill.id, kind: 'heal' } })
        pushPopup('player', recovered, 'heal', '#4fc3a1', { prefix: '+', suffix: ' HP' })
        appendLog(`${skill.name} ฟื้นฟู ${formatNum(recovered)} HP`, 'hero')
        return
      }

      const skillLv = skill ? nextSave.skillLevels?.[skill.id] ?? 1 : 1
      const mult = skill ? skill.mult * (skill.hits ?? 1) * (1 + (skillLv - 1) * 0.08) : 1
      const breakdown = calculatePlayerAttack(nextSave, currentEnemy, mult, skill ? skill.name : 'โจมตีปกติ', skill?.id ?? null)
      const inflicted = rollStatusInfliction(skill?.id ?? null, nextSave.rpgExt?.equippedRunes)
      if (inflicted === 'shield') {
        playerShieldRef.current = 4.0
        setPlayerShieldSec(4.0)
      } else if (inflicted) {
        const dur = inflicted === 'stun' ? 2.0 : 4.5
        const nextSt = { ...enemyStatusesRef.current, [inflicted]: dur }
        enemyStatusesRef.current = nextSt
        setEnemyStatuses(nextSt)
        if (inflicted === 'stun') enemyTimerResetReqRef.current = true
      }

      setPlayerAttackPulse(performance.now())
      setPlayerSkillColor(skill ? skill.color : null)
      setPlayerSkillId(skill ? skill.id : null)
      setEnemyHitPulse(performance.now())

      if (breakdown.isCrit) {
        triggerAttackSound({
          muted: mutedRef.current,
          source: 'tower',
          playSynthFallback: false,
          detail: { actor: 'player', isSkill: Boolean(skill), skillId: skill?.id },
        })
        triggerCritSound({
          muted: mutedRef.current,
          source: 'tower',
          detail: { target: 'enemy', damage: breakdown.damage, skillId: skill?.id },
        })
        triggerHitSound({
          muted: mutedRef.current,
          source: 'tower',
          playSynthFallback: false,
          detail: { target: 'enemy', damage: breakdown.damage, isCrit: true },
        })
      } else if (skill) {
        triggerAttackSound({
          muted: mutedRef.current,
          source: 'tower',
          playSynthFallback: false,
          detail: { actor: 'player', isSkill: true, skillId: skill.id },
        })
        triggerSkillSound({
          muted: mutedRef.current,
          source: 'tower',
          detail: { skillId: skill.id, damage: breakdown.damage },
        })
        triggerHitSound({
          muted: mutedRef.current,
          source: 'tower',
          playSynthFallback: false,
          detail: { target: 'enemy', damage: breakdown.damage, isCrit: false },
        })
      } else {
        triggerAttackSound({
          muted: mutedRef.current,
          source: 'tower',
          detail: { actor: 'player', isSkill: false },
        })
        triggerHitSound({
          muted: mutedRef.current,
          source: 'tower',
          playSynthFallback: false,
          detail: { target: 'enemy', damage: breakdown.damage, isCrit: false },
        })
      }

      pushPopup(
        'enemy',
        breakdown.damage,
        breakdown.isCrit ? 'crit' : 'damage',
        breakdown.isCrit ? '#ffd60a' : '#ffffff',
        breakdown.isCrit ? { badge: 'CRIT!' } : undefined,
      )

      const shakeDecision = evaluateAttackShake({
        damage: breakdown.damage,
        enemyMaxHp: currentEnemy.maxHp,
        isCrit: breakdown.isCrit,
        skillMultiplier: mult,
      })
      if (shakeDecision.shouldShake && shakeDecision.reason !== 'none') {
        setShakeEvent({
          id: ++shakeSeqRef.current,
          intensity: shakeDecision.intensity,
          durationMs: shakeDecision.durationMs,
          isCrit: breakdown.isCrit,
          reason: shakeDecision.reason,
          startedAt: performance.now(),
        })
      }
      appendLog(
        `${breakdown.label} ทำความเสียหาย ${formatNum(breakdown.damage)}${breakdown.isCrit ? ' (คริติคอล!)' : ''}`,
        breakdown.isCrit ? 'crit' : 'hero',
      )

      const nextHp = Math.max(0, currentEnemy.hp - breakdown.damage)
      const updatedEnemy = { ...currentEnemy, hp: nextHp }
      enemyRef.current = updatedEnemy
      saveRef.current = nextSave
      setEnemy(updatedEnemy)
      setSave(nextSave)

      if (nextHp <= 0) {
        handleVictory(nextSave, currentSpec)
      }
    },
    [appendLog, handleVictory, pushPopup],
  )

  const handleGuardAction = useCallback(() => {
    const currentSave = saveRef.current
    const currentEnemy = enemyRef.current
    const currentSpec = floorSpecRef.current
    if (!currentSave || !currentEnemy || !currentSpec || (phaseRef.current !== 'FIGHTING' && phaseRef.current !== 'READY')) return
    const telegraph = enemyProgressRef.current >= 0.5
    const evalRes = evaluateGuardAction(telegraph, enemyProgressRef.current, guardCdRef.current)
    if (evalRes.outcome === 'cooldown') return

    guardCdRef.current = 3.2
    setGuardCd(3.2)

    if (evalRes.outcome === 'perfect_counter') {
      enemyTimerResetReqRef.current = true
      enemyProgressRef.current = 0
      setEnemyAttackProgress(0)
      const counterBreakdown = calculatePlayerAttack(currentSave, currentEnemy, evalRes.counterMultiplier, 'โต้กลับ Parry!')
      pushPopup('enemy', counterBreakdown.damage, 'crit', '#38bdf8', { badge: 'PARRY!' })
      appendLog(`PERFECT PARRY! โต้กลับ ${formatNum(counterBreakdown.damage)} ดาเมจ!`, 'crit')
      triggerCritSound({ muted: mutedRef.current, source: 'tower', detail: { parry: true } })
      setPlayerAttackPulse(performance.now())
      setEnemyHitPulse(performance.now())
      const nextHp = Math.max(0, currentEnemy.hp - counterBreakdown.damage)
      const updatedEnemy = { ...currentEnemy, hp: nextHp }
      enemyRef.current = updatedEnemy
      setEnemy(updatedEnemy)
      if (nextHp <= 0) handleVictory(currentSave, currentSpec)
    } else {
      playerShieldRef.current = 2.4
      setPlayerShieldSec(2.4)
      pushPopup('player', 0, 'heal', '#60a5fa', { badge: 'GUARD' })
      appendLog(evalRes.label, 'hero')
    }
  }, [appendLog, handleVictory, pushPopup])

  const handleUsePotion = useCallback(
    (kind: 'hp' | 'mp') => {
      const currentSave = saveRef.current
      if (!currentSave || phaseRef.current === 'VICTORY' || phaseRef.current === 'DEFEAT') return
      const res = useRecoveryPotion(currentSave, kind)
      if (res.error) {
        appendLog(res.error, 'system')
        return
      }
      saveRef.current = res.nextSave
      setSave(res.nextSave)
      triggerSkillSound({ muted: mutedRef.current, source: 'tower', detail: { potion: kind } })
      pushPopup(
        'player',
        res.restored,
        'heal',
        kind === 'hp' ? '#4fc3a1' : '#7fb0ff',
        { prefix: '+', suffix: ` ${kind.toUpperCase()}` },
      )
      appendLog(`ใช้ ${res.itemName} ฟื้นฟู ${formatNum(res.restored)} ${kind.toUpperCase()}`, 'hero')
      void syncSave(res.nextSave, userRef.current, slotRef.current)
    },
    [appendLog, pushPopup, syncSave],
  )

  const handleSwitchPet = useCallback(
    (petId: string) => {
      const currentSave = saveRef.current
      if (!currentSave || phaseRef.current === 'FIGHTING') return
      const nextSave: SaveData = structuredClone(currentSave)
      const pets = sanitizePetState(nextSave.petState, nextSave.ownedGemItems, nextSave.equippedGemCompanion)
      if (!pets.ownedPets[petId]) return
      const def = COMBAT_PETS.find((x) => x.id === petId)
      pets.activePetId = pets.activePetId === petId ? null : petId
      nextSave.petState = pets
      nextSave.equippedGemCompanion = pets.activePetId && def?.linkedGemItemId ? def.linkedGemItemId : null
      saveRef.current = nextSave
      setSave(nextSave)
      playQuestClaimSfx(mutedRef.current)
      appendLog(
        pets.activePetId ? `เรียกคู่หู ${def?.name ?? petId} ร่วมลุยหอคอยแล้ว` : 'เก็บคู่หูเข้ากระเป๋าแล้ว',
        'pet',
      )
      void syncSave(nextSave, userRef.current, slotRef.current)
    },
    [appendLog, syncSave],
  )

  const handleRetryFloor = useCallback(() => {
    const currentSave = saveRef.current
    const currentSpec = floorSpecRef.current
    if (!currentSave || !currentSpec) return
    const recovered = recoverFromDefeat(currentSave)
    saveRef.current = recovered
    setSave(recovered)
    void syncSave(recovered, userRef.current, slotRef.current)
    loadFloor(currentSpec.floor)
  }, [loadFloor, syncSave])

  // Real-time Tower Action Combat Loop (timer, enemy counter-attack, active pet auto-strike)
  useEffect(() => {
    if (phase !== 'FIGHTING' && phase !== 'READY') return

    let last = performance.now()
    let enemyTimer = 0
    let petTimer = 0
    let regenTimer = 0
    let dotTimer = 0

    const interval = window.setInterval(() => {
      const now = performance.now()
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now

      if (attackCdRef.current > 0) {
        const nextCd = Math.max(0, attackCdRef.current - dt)
        attackCdRef.current = nextCd
        setAttackCd(nextCd)
      }
      if (guardCdRef.current > 0) {
        const nextGuard = Math.max(0, guardCdRef.current - dt)
        guardCdRef.current = nextGuard
        setGuardCd(nextGuard)
      }
      if (playerShieldRef.current > 0) {
        const nextSh = Math.max(0, playerShieldRef.current - dt)
        playerShieldRef.current = nextSh
        setPlayerShieldSec(nextSh)
      }
      if (Object.keys(skillCdsRef.current).length > 0) {
        let changed = false
        const nextSkills: Record<string, number> = {}
        for (const [k, v] of Object.entries(skillCdsRef.current)) {
          if (v > 0) {
            const rem = Math.max(0, v - dt)
            if (rem > 0) nextSkills[k] = rem
            changed = true
          }
        }
        if (changed) {
          skillCdsRef.current = nextSkills
          setSkillCds(nextSkills)
        }
      }

      if (phaseRef.current !== 'FIGHTING') return

      const currentEnemy = enemyRef.current
      const currentSave = saveRef.current
      const currentSpec = floorSpecRef.current
      if (!currentEnemy || !currentSave || !currentSpec || currentEnemy.hp <= 0) return

      let workingEnemy = currentEnemy
      let workingSave = currentSave

      // Tick status effects on enemy
      const curStatuses = { ...enemyStatusesRef.current }
      let statusChanged = false
      for (const sKey of ['burn', 'freeze', 'stun', 'poison'] as StatusEffectType[]) {
        const rem = curStatuses[sKey]
        if (rem && rem > 0) {
          const nextRem = Math.max(0, rem - dt)
          if (nextRem > 0) curStatuses[sKey] = nextRem
          else delete curStatuses[sKey]
          statusChanged = true
        }
      }
      if (statusChanged) {
        enemyStatusesRef.current = curStatuses
        setEnemyStatuses(curStatuses)
      }

      dotTimer += dt
      if (dotTimer >= 1.0) {
        dotTimer -= 1.0
        let dotDmg = 0
        if (curStatuses.burn) dotDmg += Math.max(5, Math.round(workingEnemy.maxHp * 0.035))
        if (curStatuses.poison) dotDmg += Math.max(6, Math.round(workingEnemy.maxHp * 0.04))
        if (dotDmg > 0) {
          const nextHpDot = Math.max(0, workingEnemy.hp - dotDmg)
          workingEnemy = { ...workingEnemy, hp: nextHpDot }
          enemyRef.current = workingEnemy
          setEnemy(workingEnemy)
          pushPopup('enemy', dotDmg, 'damage', curStatuses.burn ? '#fb923c' : '#4ade80', { badge: curStatuses.burn ? 'BURN' : 'POISON' })
          if (nextHpDot <= 0) {
            handleVictory(workingSave, currentSpec)
            return
          }
        }
      }

      // Countdown floor timer
      const nextT = Math.max(0, timeLeftRef.current - dt)
      timeLeftRef.current = nextT
      setTimeLeft(nextT)
      if (nextT <= 0 && phaseRef.current === 'FIGHTING') {
        phaseRef.current = 'DEFEAT'
        setDefeatReason('timeout')
        setPhase('DEFEAT')
        triggerDefeatSound({ muted: mutedRef.current, source: 'tower', detail: { reason: 'timeout' } })
        appendLog(`หมดเวลาท้าทายชั้นที่ ${currentSpec.floor}! ลองอัปเกรดอาวุธหรือคู่หูแล้วสู้ใหม่`, 'enemy')
        void syncSave(workingSave, userRef.current, slotRef.current)
        return
      }

      // Passive MP regen
      regenTimer += dt
      if (regenTimer >= 1.5) {
        regenTimer -= 1.5
        const st = getStats(workingSave)
        if (workingSave.mp < st.maxMp) {
          workingSave = { ...workingSave, mp: Math.min(st.maxMp, workingSave.mp + 2) }
          saveRef.current = workingSave
          setSave(workingSave)
        }
      }

      // Active Combat Pet auto-attack
      const activePet = getActivePetBonuses(
        workingSave.petState,
        workingSave.equippedGemCompanion,
        workingSave.ownedGemItems,
      )
      if (activePet) {
        petTimer += dt
        if (petTimer >= activePet.attackInterval) {
          petTimer -= activePet.attackInterval
          const rawPet = (activePet.companionAtk * activePet.companionAtk) / Math.max(1, activePet.companionAtk + workingEnemy.defStat * 0.5)
          const petDmg = Math.max(3, Math.round(rawPet * (0.94 + Math.random() * 0.12)))
          const nextEnemyHp = Math.max(0, workingEnemy.hp - petDmg)
          workingEnemy = { ...workingEnemy, hp: nextEnemyHp }
          enemyRef.current = workingEnemy
          setEnemy(workingEnemy)
          setPetAttackPulse(performance.now())
          setEnemyHitPulse(performance.now())
          triggerPetAttackSound({ muted: mutedRef.current, source: 'tower', detail: { petId: activePet.def.id, damage: petDmg } })
          triggerHitSound({ muted: mutedRef.current, source: 'tower', playSynthFallback: false, detail: { actor: 'pet', target: 'enemy', damage: petDmg } })
          pushPopup('enemy', petDmg, 'pet', activePet.def.colors.accent, { badge: 'PET' })
          appendLog(`${activePet.def.name} ช่วยโจมตี ${formatNum(petDmg)} ดาเมจ`, 'pet')
          if (nextEnemyHp <= 0) {
            handleVictory(workingSave, currentSpec)
            return
          }
        }
      }

      if (enemyTimerResetReqRef.current) {
        enemyTimer = 0
        enemyTimerResetReqRef.current = false
      }
      if (!curStatuses.stun) {
        const freezeFactor = curStatuses.freeze ? 0.68 : 1
        enemyTimer += dt * freezeFactor
      }
      const progress = Math.min(1, enemyTimer / workingEnemy.attackInterval)
      enemyProgressRef.current = progress
      setEnemyAttackProgress(progress)

      if (enemyTimer >= workingEnemy.attackInterval) {
        enemyTimer -= workingEnemy.attackInterval
        enemyProgressRef.current = 0
        setEnemyAttackProgress(0)
        const rawIncoming = calculateEnemyAttack(workingEnemy, workingSave)
        const shieldMitigated = playerShieldRef.current > 0 ? Math.max(1, Math.round(rawIncoming * 0.35)) : rawIncoming
        setEnemyAttackPulse(performance.now())
        setPlayerHitPulse(performance.now())
        triggerAttackSound({ muted: mutedRef.current, source: 'tower', playSynthFallback: false, detail: { actor: 'enemy' } })
        triggerHitSound({ muted: mutedRef.current, source: 'tower', detail: { actor: 'enemy', target: 'player', damage: shieldMitigated } })
        pushPopup('player', shieldMitigated, 'incoming', playerShieldRef.current > 0 ? '#60a5fa' : '#ff4d4d', {
          prefix: '-',
          badge: playerShieldRef.current > 0 ? 'GUARDED' : undefined,
        })
        appendLog(
          `${workingEnemy.def.name} โจมตีกลับ ${formatNum(shieldMitigated)} ดาเมจ${playerShieldRef.current > 0 ? ' (ลดทอนโดยโล่)' : ''}`,
          'enemy',
        )

        const nextHp = Math.max(0, workingSave.hp - shieldMitigated)
        const updated = { ...workingSave, hp: nextHp }
        saveRef.current = updated
        setSave(updated)
        if (nextHp <= 0) {
          phaseRef.current = 'DEFEAT'
          setDefeatReason('hp')
          setPhase('DEFEAT')
          triggerDefeatSound({ muted: mutedRef.current, source: 'tower', playSynthFallback: false, detail: { reason: 'hp' } })
          appendLog('คุณพ่ายแพ้ในการไต่หอคอย กด "ฟื้นฟูและสู้ใหม่" เพื่อเริ่มชั้นนี้ต่อได้ทันที', 'enemy')
          void syncSave(updated, userRef.current, slotRef.current)
        }
      }
    }, 50)

    return () => window.clearInterval(interval)
  }, [appendLog, handleVictory, phase, pushPopup, syncSave])

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const key = e.key.toLowerCase()
      if (e.code === 'Space') {
        e.preventDefault()
        if (phaseRef.current === 'VICTORY' && floorSpecRef.current) {
          loadFloor(floorSpecRef.current.floor + 1)
        } else if (phaseRef.current === 'READY' || phaseRef.current === 'FIGHTING') {
          executeHeroAttack()
        }
        return
      }
      if (e.key === 'Shift') {
        e.preventDefault()
        handleGuardAction()
        return
      }
      if (key === '1' || key === '2' || key === '3') {
        const s = saveRef.current
        if (!s) return
        const job = JOBS[normalizeJobId(s.jobId)]
        const skill = job.skills[Number(key) - 1]
        if (skill) executeHeroAttack(skill)
      } else if (key === 'q') {
        handleUsePotion('hp')
      } else if (key === 'r') {
        handleUsePotion('mp')
      } else if (e.key === 'Enter' && phaseRef.current === 'VICTORY' && floorSpecRef.current) {
        loadFloor(floorSpecRef.current.floor + 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [executeHeroAttack, handleGuardAction, handleUsePotion, loadFloor])

  const heroStats = useMemo(() => (save ? getStats(save) : null), [save])
  const activePet = useMemo(
    () => (save ? getActivePetBonuses(save.petState, save.equippedGemCompanion, save.ownedGemItems) : null),
    [save],
  )
  const ownedPetIds = useMemo(() => {
    if (!save) return []
    const pets = sanitizePetState(save.petState, save.ownedGemItems, save.equippedGemCompanion)
    return Object.keys(pets.ownedPets)
  }, [save])

  if (phase === 'LOADING' || !save || !heroStats || !floorSpec || !enemy) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-background p-6">
        <div className="pixel-panel px-6 py-5 text-center">
          <p className="text-sm font-semibold text-primary">กำลังโหลดหอคอยไต่ชั้นและข้อมูลตัวละคร...</p>
        </div>
      </main>
    )
  }

  const job = JOBS[normalizeJobId(save.jobId)]
  const towerState = sanitizeTowerState(save.towerState)
  const maxSelectableFloor = towerState.highestFloor + 1
  const expNeed = expToNext(save.level)

  return (
    <main className="h-dvh w-full overflow-y-auto bg-background text-foreground">
      {/* Top Bar */}
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-b-2 border-border px-4 py-3 md:flex-nowrap md:gap-8 md:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 whitespace-nowrap text-base font-bold tracking-tight text-primary hover:brightness-110"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Pixel Quest
        </Link>

        <nav aria-label="นำทางหลัก" className="hidden items-center gap-6 text-xs font-medium text-muted-foreground md:flex">
          <Link href="/" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">
            โลกผจญภัย
          </Link>
          <Link href="/encounter" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">
            สนามล่ามอนสเตอร์
          </Link>
          <Link href="/inventory" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">
            คลังไอเทม
          </Link>
          <Link href="/class-selector" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">
            สายอาชีพ
          </Link>
          <Link href="/character-status" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">
            สถานะตัวละคร
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <AccountPanel compact />
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'เปิดเสียงเอฟเฟกต์' : 'ปิดเสียงเอฟเฟกต์'}
            className="pixel-btn flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap bg-secondary px-2.5 py-2 text-xs text-foreground hover:brightness-110 sm:px-3"
          >
            {muted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
            <span className="hidden sm:inline">{muted ? 'ปิดเสียง' : 'เสียง 8-bit'}</span>
          </button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-4 p-4 md:grid-cols-[1.55fr_1fr] md:p-6">
        {/* Tower Battle Stage Column */}
        <section aria-label="สนามต่อสู้หอคอยไต่ชั้น" className="flex flex-col gap-4">
          <div className="pixel-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
              <div>
                <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Castle className="size-5 text-primary" aria-hidden />
                  หอคอยไต่ชั้น · ชั้นที่ {floorSpec.floor}
                  {floorSpec.isBossFloor && (
                    <span className="text-xs font-semibold text-[#ff7b7f]">· ชั้นบอส</span>
                  )}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {syncNotice} · ผ่านสูงสุดชั้นที่ <span className="font-bold text-primary tabular-nums">{towerState.highestFloor}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadFloor(floorSpec.floor - 1)}
                  disabled={phase === 'FIGHTING' || floorSpec.floor <= 1}
                  aria-label="ชั้นก่อนหน้า"
                  className="pixel-btn flex min-h-10 items-center gap-1 bg-secondary px-2.5 py-2 text-xs text-foreground hover:brightness-110 disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  ชั้นก่อน
                </button>
                <button
                  type="button"
                  onClick={() => loadFloor(floorSpec.floor + 1)}
                  disabled={phase === 'FIGHTING' || floorSpec.floor >= maxSelectableFloor}
                  aria-label="ชั้นถัดไป"
                  className="pixel-btn flex min-h-10 items-center gap-1 bg-secondary px-2.5 py-2 text-xs text-foreground hover:brightness-110 disabled:opacity-40"
                >
                  ชั้นถัดไป
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
            </div>

            {/* Timer & Vital Bars */}
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 border border-border/60 bg-background/50 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-bold text-foreground">{save.name}</span>
                  <span className="shrink-0 text-xs text-primary tabular-nums">
                    Lv.{save.level} · {job.name}
                  </span>
                </div>
                <TowerMeter label="HP" value={save.hp} max={heroStats.maxHp} colorClass="bg-hp" textClassName="text-[#ff8b8e]" />
                <TowerMeter label="MP" value={save.mp} max={heroStats.maxMp} colorClass="bg-mp" textClassName="text-[#7fb0ff]" />
                <TowerMeter
                  label="EXP"
                  value={save.level >= MAX_LEVEL ? expNeed : save.exp}
                  max={expNeed}
                  colorClass="bg-exp"
                  textClassName="text-[#dca8ff]"
                />
              </div>

              <div className="space-y-2 border border-border/60 bg-background/50 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-bold text-foreground">
                      {enemy.def.name}
                    </span>
                    <span
                      className="shrink-0 border border-border/60 px-1.5 py-0.5 text-[10px] font-bold"
                      style={{
                        color: ELEMENT_META[getMonsterElement(enemy.def.id)].color,
                        background: ELEMENT_META[getMonsterElement(enemy.def.id)].bg,
                      }}
                    >
                      {ELEMENT_META[getMonsterElement(enemy.def.id)].label}
                    </span>
                  </div>
                  <span className={`flex shrink-0 items-center gap-1 text-xs font-bold tabular-nums ${timeLeft <= 8 ? 'text-[#ff7b7f]' : 'text-amber-300'}`}>
                    <Clock className="size-3.5" aria-hidden />
                    {timeLeft.toFixed(1)} วินาที
                  </span>
                </div>
                <TowerMeter
                  label={floorSpec.isBossFloor ? 'HP บอสประจำชั้น' : 'HP ศัตรู'}
                  value={enemy.hp}
                  max={enemy.maxHp}
                  colorClass="bg-destructive"
                  textClassName="text-[#ff8b8e]"
                />
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className={enemyAttackProgress >= 0.5 ? 'font-bold text-amber-300' : ''}>
                      {enemyAttackProgress >= 0.5 ? '⚠ ศัตรูง้างตี! กด Shift โต้กลับ!' : 'จังหวะศัตรูโจมตี'}
                    </span>
                    <span className="tabular-nums">
                      ATK {formatNum(enemy.atk)} · DEF {formatNum(enemy.defStat)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden border border-[#0e0f1a] bg-muted/80">
                    <div
                      className={`h-full transition-[width] duration-75 ${enemyAttackProgress >= 0.5 ? 'bg-rose-400' : 'bg-amber-400'}`}
                      style={{ width: `${Math.round(enemyAttackProgress * 100)}%` }}
                    />
                  </div>
                </div>
                {(Object.keys(enemyStatuses).length > 0 || playerShieldSec > 0) && (
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
                    {(Object.entries(enemyStatuses) as Array<[StatusEffectType, number]>).map(([k, sec]) => (
                      <span key={k} className="border border-border/60 bg-background/80 px-1.5 py-0.5" style={{ color: STATUS_META[k].color }}>
                        {STATUS_META[k].label} {sec.toFixed(1)}s
                      </span>
                    ))}
                    {playerShieldSec > 0 && (
                      <span className="border border-sky-400/50 bg-sky-500/15 px-1.5 py-0.5 text-sky-300">
                        โล่ป้องกัน {playerShieldSec.toFixed(1)}s
                      </span>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  รางวัลผ่านชั้น: {formatNum(floorSpec.clearGold)} G · {formatNum(floorSpec.clearExp)} EXP ·{' '}
                  {floorSpec.floor > towerState.highestFloor
                    ? `พิชิตครั้งแรก +${floorSpec.firstClearDiamonds} เพชร`
                    : `ซ้ำ +${floorSpec.isBossFloor ? 5 : 1} เพชร`}
                </p>
              </div>
            </div>

            {/* Stage Canvas */}
            <div className="relative mt-3">
              <EncounterStageCanvas
                save={save}
                enemy={enemy}
                phase={phase}
                playerAttackPulse={playerAttackPulse}
                playerSkillColor={playerSkillColor}
                playerSkillId={playerSkillId}
                playerHitPulse={playerHitPulse}
                enemyAttackPulse={enemyAttackPulse}
                enemyHitPulse={enemyHitPulse}
                petAttackPulse={petAttackPulse}
                popups={popups}
                shakeEvent={shakeEvent}
              />

              <AnimatePresence>
                {phase === 'VICTORY' && victoryOutcome && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: 0.42 }}
                    className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0e0f1a]/90 p-4 text-center"
                  >
                    <p className="text-xs font-semibold text-accent">
                      {victoryOutcome.isFirstClear ? 'พิชิตชั้นใหม่สำเร็จครั้งแรก!' : 'ผ่านด่านหอคอยสำเร็จ'} · ซิงค์เซฟแล้ว
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-primary">
                      ผ่านหอคอยชั้นที่ {victoryOutcome.floor}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-sm font-semibold tabular-nums">
                      <span className="flex items-center gap-1 text-gold">
                        <Coins className="size-4" aria-hidden />+{formatNum(victoryOutcome.goldEarned)} G
                      </span>
                      <span className="flex items-center gap-1 text-cyan-200">
                        <Gem className="size-4" aria-hidden />+{formatNum(victoryOutcome.diamondsEarned)} เพชร
                      </span>
                      <span className="flex items-center gap-1 text-[#dca8ff]">
                        <Sparkles className="size-4" aria-hidden />+{formatNum(victoryOutcome.expEarned)} EXP
                      </span>
                      {victoryOutcome.stonesEarned > 0 && (
                        <span className="flex items-center gap-1 text-foreground">
                          <Hammer className="size-4" aria-hidden />หินตีบวก x{victoryOutcome.stonesEarned}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadFloor(victoryOutcome.floor + 1)}
                        className="pixel-btn min-h-11 bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:brightness-110"
                      >
                        ไต่ขึ้นชั้นที่ {victoryOutcome.floor + 1} (กด Enter)
                      </button>
                      <button
                        type="button"
                        onClick={() => loadFloor(victoryOutcome.floor)}
                        className="pixel-btn min-h-11 bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:brightness-110"
                      >
                        ท้าทายชั้นนี้ซ้ำ
                      </button>
                    </div>
                  </motion.div>
                )}

                {phase === 'DEFEAT' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-[#0e0f1a]/90 p-4 text-center"
                  >
                    <h2 className="text-xl font-bold text-[#ff7b7f]">
                      {defeatReason === 'timeout' ? 'หมดเวลาท้าทายชั้นนี้' : 'ตัวละครหมดสติ'}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      ฟื้นฟู HP/MP 50% แล้วลองไต่หอคอยชั้นที่ {floorSpec.floor} ใหม่อีกครั้งได้เลย
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleRetryFloor}
                        className="pixel-btn min-h-11 bg-accent px-4 py-2 text-xs font-bold text-accent-foreground hover:brightness-110"
                      >
                        ฟื้นฟูและสู้ใหม่
                      </button>
                      <Link
                        href="/"
                        className="pixel-btn min-h-11 bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:brightness-110"
                      >
                        กลับไปอัปเกรดในเมือง
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Controls */}
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[0.9fr_1fr_1fr_1fr]">
              <button
                type="button"
                onClick={() => executeHeroAttack()}
                disabled={attackCd > 0 || phase === 'VICTORY' || phase === 'DEFEAT'}
                className="pixel-btn flex min-h-11 items-center justify-center gap-1.5 bg-primary px-2.5 py-2 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
              >
                <Swords className="size-3.5 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">
                  โจมตี (Space) {attackCd > 0 ? `${attackCd.toFixed(1)}s` : ''}
                </span>
              </button>

              {job.skills.slice(0, 3).map((skill, idx) => {
                const cd = skillCds[skill.id] ?? 0
                const noMp = save.mp < skill.mp
                const vfx = getSkillVfxSpec(skill.id, skill.color, skill.kind, job.weaponTypes[0])
                return (
                  <button
                    key={skill.id}
                    type="button"
                    title={vfx.effectLabel}
                    onClick={() => executeHeroAttack(skill)}
                    disabled={cd > 0 || noMp || phase === 'VICTORY' || phase === 'DEFEAT'}
                    className="pixel-btn flex min-h-11 items-center justify-start gap-1.5 bg-secondary px-2 py-1.5 text-left text-xs text-foreground hover:brightness-110 disabled:opacity-45"
                    style={{ borderColor: vfx.primaryColor }}
                  >
                    <img
                      src={getSkillIconPath(skill.id)}
                      alt=""
                      width={20}
                      height={20}
                      className="pixelated size-5 shrink-0 border border-border/80 bg-[#0e0f1a]"
                    />
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-[11px] font-semibold" style={{ color: vfx.primaryColor }}>
                        [{idx + 1}] {skill.name}
                      </span>
                      <span className="block text-[10px] text-muted-foreground tabular-nums">
                        {cd > 0 ? `CD ${cd.toFixed(1)}s` : `${skill.mp} MP · ${skill.mult}x`}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleGuardAction}
                  disabled={guardCd > 0 || phase === 'VICTORY' || phase === 'DEFEAT'}
                  className={`pixel-btn flex min-h-10 items-center gap-1.5 px-3 py-1.5 text-xs font-bold disabled:opacity-45 ${
                    enemyAttackProgress >= 0.5
                      ? 'bg-sky-500 text-slate-950 animate-pulse'
                      : 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'
                  }`}
                >
                  <Shield className="size-3.5" aria-hidden />
                  {guardCd > 0 ? `เกราะ ${guardCd.toFixed(1)}s` : enemyAttackProgress >= 0.5 ? 'Parry โต้กลับ! (Shift)' : 'ป้องกัน (Shift)'}
                </button>
                <button
                  type="button"
                  onClick={() => handleUsePotion('hp')}
                  disabled={phase === 'VICTORY' || phase === 'DEFEAT'}
                  className="pixel-btn flex min-h-10 items-center gap-1.5 bg-destructive/20 px-3 py-1.5 text-xs text-[#ff8b8e] hover:bg-destructive/30 disabled:opacity-45"
                >
                  <Heart className="size-3.5" aria-hidden />
                  ยา HP (Q)
                </button>
                <button
                  type="button"
                  onClick={() => handleUsePotion('mp')}
                  disabled={phase === 'VICTORY' || phase === 'DEFEAT'}
                  className="pixel-btn flex min-h-10 items-center gap-1.5 bg-[#4c8bf5]/20 px-3 py-1.5 text-xs text-[#8cb8ff] hover:bg-[#4c8bf5]/30 disabled:opacity-45"
                >
                  <Droplets className="size-3.5" aria-hidden />
                  ยา MP (R)
                </button>
              </div>

              <span className="text-xs text-muted-foreground tabular-nums">
                ATK {formatNum(heroStats.atk)} · DEF {formatNum(heroStats.def)}
              </span>
            </div>
          </div>

          {/* Tower Combat Log */}
          <div className="pixel-panel p-4">
            <h2 className="text-sm font-bold text-foreground">บันทึกการไต่หอคอย</h2>
            <ul className="mt-2 space-y-1 text-xs">
              {logs.length === 0 ? (
                <li className="text-muted-foreground">กดปุ่มโจมตีหรือปุ่ม Space เพื่อเริ่มท้าทายชั้นนี้</li>
              ) : (
                logs.map((entry) => (
                  <li
                    key={entry.id}
                    className={
                      entry.tone === 'crit'
                        ? 'font-semibold text-[#ffd60a]'
                        : entry.tone === 'pet'
                          ? 'font-semibold text-accent'
                          : entry.tone === 'enemy'
                            ? 'text-[#ff8b8e]'
                            : entry.tone === 'loot'
                              ? 'font-semibold text-primary'
                              : 'text-foreground/90'
                    }
                  >
                    {entry.text}
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        {/* Tower Progress & Active Pet Column */}
        <aside aria-label="ข้อมูลหอคอยและคู่หู" className="flex flex-col gap-4">
          <div className="pixel-panel p-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-primary">
                <Trophy className="size-4" aria-hidden />
                สถิติหอคอยไต่ชั้น
              </h2>
              <span className="text-xs font-bold text-cyan-200 tabular-nums">
                {formatNum(save.diamonds ?? 0)} เพชร
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs tabular-nums">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ชั้นสูงสุดที่ผ่าน</span>
                <span className="font-bold text-primary">ชั้นที่ {towerState.highestFloor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">จำนวนด่านที่ผ่านรวม</span>
                <span>{formatNum(towerState.totalClears)} ครั้ง</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">บอสหอคอยที่ปราบได้</span>
                <span className="flex items-center gap-1 text-[#ff8b8e]">
                  <Flame className="size-3.5" aria-hidden /> {formatNum(towerState.bossClears)} ตัว
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ทองคงเหลือ</span>
                <span className="font-semibold text-gold">{formatNum(save.gold)} G</span>
              </div>
            </div>

            <div className="mt-3 border-t border-border/70 pt-3">
              <p className="text-xs font-semibold text-foreground">เลือกชั้นท้าทายด่วน</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from({ length: Math.min(8, maxSelectableFloor) }, (_, idx) => {
                  const floorNum = Math.max(1, maxSelectableFloor - 7) + idx
                  const isBoss = floorNum % 5 === 0
                  const active = floorNum === floorSpec.floor
                  return (
                    <button
                      key={floorNum}
                      type="button"
                      disabled={phase === 'FIGHTING'}
                      onClick={() => loadFloor(floorNum)}
                      className={`pixel-btn px-2.5 py-1 text-xs font-semibold tabular-nums disabled:opacity-45 ${
                        active
                          ? 'bg-primary text-primary-foreground'
                          : isBoss
                            ? 'bg-destructive/20 text-[#ff8b8e]'
                            : 'bg-secondary text-foreground'
                      }`}
                    >
                      ชั้น {floorNum}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Active Combat Pet Helper */}
          <div className="pixel-panel p-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-accent">
                <PawPrint className="size-4" aria-hidden />
                คู่หูช่วยสู้ในหอคอย
              </h2>
              {activePet && (
                <span className="text-xs font-semibold text-primary tabular-nums">
                  Lv.{activePet.level}
                </span>
              )}
            </div>

            {activePet ? (
              <div className="mt-3 space-y-1.5 text-xs tabular-nums">
                <p className="font-bold text-foreground">{activePet.def.name}</p>
                <p className="text-muted-foreground">
                  ช่วยยิงอัตโนมัติ {formatNum(activePet.companionAtk)} ดาเมจ ทุก {activePet.attackInterval.toFixed(1)} วินาที
                </p>
                <p className="text-accent">
                  บัฟ: +{formatNum(activePet.atkBonus)} ATK · +{formatNum(activePet.defBonus)} DEF · +{formatNum(activePet.hpBonus)} HP
                </p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                ยังไม่ได้เรียกคู่หู — สามารถปลดล็อกและอัปเกรดสัตว์เลี้ยงได้ที่ปุ่ม “สัตว์เลี้ยง” ในหน้าหลักเกม
              </p>
            )}

            {ownedPetIds.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-border/70 pt-3">
                <p className="text-xs font-semibold text-foreground">สลับคู่หูที่ปลดล็อกแล้ว</p>
                <div className="flex flex-wrap gap-1.5">
                  {ownedPetIds.map((pid) => {
                    const pDef = COMBAT_PETS.find((x) => x.id === pid)
                    if (!pDef) return null
                    const isEquipped = activePet?.petId === pid
                    return (
                      <button
                        key={pid}
                        type="button"
                        disabled={phase === 'FIGHTING'}
                        onClick={() => handleSwitchPet(pid)}
                        className={`pixel-btn px-2.5 py-1.5 text-xs font-semibold disabled:opacity-45 ${
                          isEquipped ? 'bg-accent text-accent-foreground' : 'bg-secondary text-foreground'
                        }`}
                      >
                        {pDef.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}
