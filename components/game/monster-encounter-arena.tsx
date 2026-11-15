'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowLeft,
  Coins,
  Droplets,
  Flame,
  Hammer,
  Heart,
  RefreshCw,
  Shield,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { auth } from '@/lib/firebase/client'
import { listUserCharacters } from '@/lib/firebase/characters'
import { ITEMS, JOBS, MAX_LEVEL, MAX_PLUS, enhanceCost, enhanceRate, expToNext, type SkillDef } from '@/lib/game/data'
import {
  SAVE_KEY,
  getActiveCharacterSlot,
  getStats,
  setActiveCharacterSlot,
  setGameAccountIdentity,
  type SaveData,
} from '@/lib/game/engine'
import { recordDailyMissionProgress } from '@/lib/game/daily-missions'
import {
  calculateEnemyAttack,
  calculatePlayerAttack,
  createDefaultEncounterSave,
  encounterSaveStorageKey,
  enhanceEquippedWeapon,
  equipWeaponFromInventory,
  getWeaponUpgradeBreakdown,
  persistEncounterSave,
  recoverFromDefeat,
  rollEncounterForLevel,
  settleEncounterVictory,
  useRecoveryPotion,
  type CombatDamageBreakdown,
  type EncounterEnemy,
  type EncounterRarity,
  type EncounterVictoryResult,
} from '@/lib/game/encounter'
import {
  playAttackSfx,
  playCritSfx,
  playEnemyHitSfx,
  playEnhanceSfx,
  playLevelUpSfx,
  playPetAttackSfx,
  playSkillSfx,
  playVictorySfx,
} from '@/lib/game/sfx'
import { getActivePetBonuses } from '@/lib/game/systems'
import { formatNum } from './format'
import { EncounterStageCanvas, type StagePopup } from './encounter-stage-canvas'

type ArenaPhase = 'LOADING' | 'READY' | 'FIGHTING' | 'VICTORY' | 'DEFEAT'

interface CombatLogEntry {
  id: number
  text: string
  tone: 'hero' | 'crit' | 'enemy' | 'loot' | 'system'
}

const RARITY_LABELS: Record<EncounterRarity, { title: string; className: string }> = {
  normal: { title: 'มอนสเตอร์ทั่วไป', className: 'text-foreground/85' },
  elite: { title: 'มอนสเตอร์ระดับอีลีท', className: 'text-[#c77dff]' },
  boss: { title: 'บอสซุ่มโจมตี', className: 'text-[#ff7b7f]' },
}

const BIOME_LABELS: Record<EncounterEnemy['biome'], string> = {
  meadow: 'ทุ่งหญ้าเริ่มต้น',
  forest: 'ป่าทึบ',
  cave: 'ถ้ำผลึก',
  volcano: 'ภูเขาไฟอเวจี',
}

function MeterBar({
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

export function MonsterEncounterArena() {
  const [phase, setPhase] = useState<ArenaPhase>('LOADING')
  const [user, setUser] = useState<User | null>(null)
  const [slotId, setSlotId] = useState<string>('slot_1')
  const [save, setSave] = useState<SaveData | null>(null)
  const [enemy, setEnemy] = useState<EncounterEnemy | null>(null)
  const [muted, setMuted] = useState(false)
  const [syncNotice, setSyncNotice] = useState<string>('กำลังซิงค์ข้อมูลตัวละคร...')

  const [attackCd, setAttackCd] = useState(0)
  const [skillCds, setSkillCds] = useState<Record<string, number>>({})
  const [enemyAttackProgress, setEnemyAttackProgress] = useState(0)

  const [lastBreakdown, setLastBreakdown] = useState<CombatDamageBreakdown | null>(null)
  const [victoryResult, setVictoryResult] = useState<EncounterVictoryResult | null>(null)
  const [streak, setStreak] = useState(0)
  const [logs, setLogs] = useState<CombatLogEntry[]>([])
  const [enhanceNotice, setEnhanceNotice] = useState<string | null>(null)

  const [playerAttackPulse, setPlayerAttackPulse] = useState(0)
  const [playerSkillColor, setPlayerSkillColor] = useState<string | null>(null)
  const [playerHitPulse, setPlayerHitPulse] = useState(0)
  const [enemyAttackPulse, setEnemyAttackPulse] = useState(0)
  const [enemyHitPulse, setEnemyHitPulse] = useState(0)
  const [petAttackPulse, setPetAttackPulse] = useState(0)
  const [popups, setPopups] = useState<StagePopup[]>([])

  const saveRef = useRef<SaveData | null>(null)
  const enemyRef = useRef<EncounterEnemy | null>(null)
  const phaseRef = useRef<ArenaPhase>('LOADING')
  const userRef = useRef<User | null>(null)
  const slotRef = useRef<string>('slot_1')
  const mutedRef = useRef<boolean>(false)
  const logSeqRef = useRef(0)
  const popupSeqRef = useRef(0)

  saveRef.current = save
  enemyRef.current = enemy
  phaseRef.current = phase
  userRef.current = user
  slotRef.current = slotId
  mutedRef.current = muted

  const appendLog = useCallback((text: string, tone: CombatLogEntry['tone'] = 'system') => {
    const id = ++logSeqRef.current
    setLogs((prev) => [{ id, text, tone }, ...prev].slice(0, 12))
  }, [])

  const pushPopup = useCallback((target: 'player' | 'enemy', text: string, color: string, crit = false) => {
    const id = ++popupSeqRef.current
    const createdAt = performance.now()
    setPopups((prev) => [...prev.filter((p) => createdAt - p.createdAt < 900), { id, target, text, color, crit, createdAt }])
  }, [])

  const syncSaveToStorageAndCloud = useCallback(async (nextSave: SaveData, activeUser: User | null, activeSlot: string) => {
    try {
      await persistEncounterSave(nextSave, activeSlot, activeUser?.uid ?? null)
      setSyncNotice(activeUser ? `ซิงค์เซฟตัวละคร (${activeSlot}) กับคลาวด์แล้ว` : 'บันทึกความคืบหน้าลงเครื่องแล้ว')
    } catch {
      setSyncNotice('บันทึกในเครื่องแล้ว (รอซิงค์คลาวด์)')
    }
  }, [])

  // Load active character save (Firebase Firestore slot or Guest localStorage)
  useEffect(() => {
    let active = true
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!active) return
      setUser(nextUser)
      const preferredSlot = getActiveCharacterSlot() || 'slot_1'
      let resolvedSave: SaveData | null = null
      let resolvedSlot = preferredSlot

      if (nextUser) {
        setGameAccountIdentity(nextUser.uid)
        try {
          const chars = await listUserCharacters(nextUser.uid)
          const match = chars.find((c) => c.id === preferredSlot) ?? chars[0]
          if (match) {
            resolvedSlot = match.id
            setActiveCharacterSlot(match.id)
            resolvedSave = match.saveData
          }
        } catch {
          // Fall back to local key below
        }
        if (!resolvedSave && typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(encounterSaveStorageKey(nextUser.uid, resolvedSlot))
            if (raw) resolvedSave = JSON.parse(raw) as SaveData
          } catch {
            // Ignore malformed JSON
          }
        }
      } else {
        setGameAccountIdentity(null)
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(SAVE_KEY)
            if (raw) resolvedSave = JSON.parse(raw) as SaveData
          } catch {
            // Ignore malformed JSON
          }
        }
      }

      if (!resolvedSave || resolvedSave.version !== 1) {
        resolvedSave = createDefaultEncounterSave(nextUser?.displayName || 'นักผจญภัย')
        await persistEncounterSave(resolvedSave, resolvedSlot, nextUser?.uid ?? null)
      }

      const stats = getStats(resolvedSave)
      if (resolvedSave.hp <= 0) resolvedSave = { ...resolvedSave, hp: stats.maxHp }

      if (!active) return
      setSlotId(resolvedSlot)
      setSave(resolvedSave)
      const initialEnemy = rollEncounterForLevel(resolvedSave.level)
      setEnemy(initialEnemy)
      setPhase('READY')
      setSyncNotice(
        nextUser
          ? `เชื่อมต่อเซฟ ${resolvedSave.name} (${resolvedSlot}) แล้ว`
          : `โหมดผู้เล่นทั่วไป: ${resolvedSave.name}`,
      )
      appendLog(
        `พบ ${initialEnemy.def.name} Lv.${initialEnemy.effectiveLevel} (${RARITY_LABELS[initialEnemy.rarity].title})`,
        'system',
      )
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [appendLog])

  const spawnNextEncounter = useCallback(
    (forcedRarity?: EncounterRarity) => {
      const currentSave = saveRef.current
      if (!currentSave) return
      const nextEnemy = rollEncounterForLevel(currentSave.level, forcedRarity ? { forcedRarity } : undefined)
      setEnemy(nextEnemy)
      setVictoryResult(null)
      setLastBreakdown(null)
      setAttackCd(0)
      setSkillCds({})
      setEnemyAttackProgress(0)
      setPhase('READY')
      appendLog(
        `สุ่มพบ ${nextEnemy.def.name} Lv.${nextEnemy.effectiveLevel} (${RARITY_LABELS[nextEnemy.rarity].title})`,
        nextEnemy.rarity === 'normal' ? 'system' : 'crit',
      )
    },
    [appendLog],
  )

  const handleVictory = useCallback(
    (currentSave: SaveData, defeatedEnemy: EncounterEnemy) => {
      if (phaseRef.current === 'VICTORY') return
      phaseRef.current = 'VICTORY'
      const outcome = settleEncounterVictory(currentSave, defeatedEnemy)
      saveRef.current = outcome.nextSave
      setSave(outcome.nextSave)
      setVictoryResult(outcome)
      setStreak((s) => s + 1)
      setPhase('VICTORY')
      recordDailyMissionProgress({
        kills: 1,
        bossKills: defeatedEnemy.rarity !== 'normal' ? 1 : 0,
        goldEarned: outcome.goldEarned,
        itemsLooted: outcome.drops.length,
      })

      if (outcome.leveledUpTo > outcome.leveledUpFrom) {
        playLevelUpSfx(mutedRef.current)
        appendLog(
          `เลเวลอัป! เลื่อนระดับเป็น Lv.${outcome.leveledUpTo} (HP/MP ฟื้นฟูเต็มหลอด)`,
          'crit',
        )
      } else {
        playVictorySfx(mutedRef.current)
      }

      const dropSummary =
        outcome.drops.length > 0
          ? ` | ดรอป: ${outcome.drops.map((d) => `${d.name} x${d.qty}`).join(', ')}`
          : ''
      appendLog(
        `ปราบ ${defeatedEnemy.def.name} สำเร็จ! +${formatNum(outcome.goldEarned)} G, +${formatNum(outcome.expEarned)} EXP${dropSummary}`,
        'loot',
      )

      void syncSaveToStorageAndCloud(outcome.nextSave, userRef.current, slotRef.current)
    },
    [appendLog, syncSaveToStorageAndCloud],
  )

  const executeHeroAttack = useCallback(
    (skill?: SkillDef) => {
      const currentSave = saveRef.current
      const currentEnemy = enemyRef.current
      const currentPhase = phaseRef.current
      if (!currentSave || !currentEnemy || (currentPhase !== 'READY' && currentPhase !== 'FIGHTING')) return

      if (skill) {
        if ((skillCds[skill.id] ?? 0) > 0) return
        if (currentSave.mp < skill.mp) {
          appendLog('MP ไม่เพียงพอสำหรับสกิลนี้', 'system')
          return
        }
      } else if (attackCd > 0) {
        return
      }

      if (currentPhase === 'READY') {
        setPhase('FIGHTING')
      }

      const nextSave: SaveData = structuredClone(currentSave)
      const job = JOBS[nextSave.jobId] ?? JOBS.novice

      if (skill) {
        nextSave.mp -= skill.mp
        setSkillCds((prev) => ({ ...prev, [skill.id]: skill.cooldown }))
        setAttackCd(Math.max(attackCd, 0.2))
        recordDailyMissionProgress({ skillsUsed: 1 })
      } else {
        setAttackCd(job.attackSpeed)
      }

      // Handle Heal skill directly
      if (skill && skill.kind === 'heal') {
        const stats = getStats(nextSave)
        const skillLv = nextSave.skillLevels?.[skill.id] ?? 1
        const healRatio = skill.mult * (1 + (skillLv - 1) * 0.08)
        const recovered = Math.max(10, Math.round(stats.maxHp * healRatio))
        nextSave.hp = Math.min(stats.maxHp, nextSave.hp + recovered)
        setSave(nextSave)
        setPlayerAttackPulse(performance.now())
        setPlayerSkillColor(skill.color)
        playSkillSfx(mutedRef.current)
        pushPopup('player', `+${formatNum(recovered)} HP`, '#4fc3a1')
        appendLog(`${skill.name} ฟื้นฟู ${formatNum(recovered)} HP`, 'hero')
        return
      }

      const skillLv = skill ? nextSave.skillLevels?.[skill.id] ?? 1 : 1
      const mult = skill
        ? skill.mult * (skill.hits ?? 1) * (1 + (skillLv - 1) * 0.08)
        : 1

      const breakdown = calculatePlayerAttack(
        nextSave,
        currentEnemy,
        mult,
        skill ? skill.name : 'โจมตีปกติ',
      )

      setSave(nextSave)
      setLastBreakdown(breakdown)
      setPlayerAttackPulse(performance.now())
      setPlayerSkillColor(skill ? skill.color : null)
      setEnemyHitPulse(performance.now())

      if (breakdown.isCrit) {
        playCritSfx(mutedRef.current)
      } else if (skill) {
        playSkillSfx(mutedRef.current)
      } else {
        playAttackSfx(mutedRef.current)
      }

      pushPopup(
        'enemy',
        breakdown.isCrit ? `${formatNum(breakdown.damage)}! คริติคอล` : `${formatNum(breakdown.damage)}`,
        breakdown.isCrit ? '#ffd60a' : '#ffffff',
        breakdown.isCrit,
      )

      appendLog(
        `${breakdown.label} ทำความเสียหาย ${formatNum(breakdown.damage)}${breakdown.isCrit ? ' (คริติคอล!)' : ''}`,
        breakdown.isCrit ? 'crit' : 'hero',
      )

      const nextHp = Math.max(0, currentEnemy.hp - breakdown.damage)
      const updatedEnemy = { ...currentEnemy, hp: nextHp }
      enemyRef.current = updatedEnemy
      saveRef.current = nextSave
      setEnemy(updatedEnemy)

      if (nextHp <= 0) {
        handleVictory(nextSave, updatedEnemy)
      }
    },
    [appendLog, attackCd, handleVictory, pushPopup, skillCds],
  )

  const handleUsePotion = useCallback(
    (kind: 'hp' | 'mp') => {
      const currentSave = saveRef.current
      if (!currentSave || phaseRef.current === 'VICTORY' || phaseRef.current === 'DEFEAT') return
      const res = useRecoveryPotion(currentSave, kind)
      if (res.error) {
        appendLog(res.error, 'system')
        return
      }
      setSave(res.nextSave)
      playSkillSfx(mutedRef.current)
      pushPopup(
        'player',
        `+${formatNum(res.restored)} ${kind.toUpperCase()}`,
        kind === 'hp' ? '#4fc3a1' : '#7fb0ff',
      )
      appendLog(`ใช้ ${res.itemName} ฟื้นฟู ${formatNum(res.restored)} ${kind.toUpperCase()}`, 'hero')
      void syncSaveToStorageAndCloud(res.nextSave, userRef.current, slotRef.current)
    },
    [appendLog, pushPopup, syncSaveToStorageAndCloud],
  )

  const handleFlee = useCallback(() => {
    if (phaseRef.current !== 'FIGHTING') return
    setStreak(0)
    appendLog('ถอนตัวจากการต่อสู้ และสุ่มพบศัตรูใหม่', 'system')
    spawnNextEncounter()
  }, [appendLog, spawnNextEncounter])

  const handleRetryAfterDefeat = useCallback(() => {
    const currentSave = saveRef.current
    if (!currentSave) return
    const recovered = recoverFromDefeat(currentSave)
    setSave(recovered)
    setStreak(0)
    void syncSaveToStorageAndCloud(recovered, userRef.current, slotRef.current)
    const freshEnemy = rollEncounterForLevel(recovered.level)
    setEnemy(freshEnemy)
    setVictoryResult(null)
    setEnemyAttackProgress(0)
    setAttackCd(0)
    setSkillCds({})
    setPhase('READY')
    appendLog(`ฟื้นฟู HP/MP 50% และเริ่มท้าทาย ${freshEnemy.def.name} Lv.${freshEnemy.effectiveLevel}`, 'system')
  }, [appendLog, syncSaveToStorageAndCloud])

  const handleEquipWeapon = useCallback(
    (itemUid: string) => {
      const currentSave = saveRef.current
      if (!currentSave) return
      const res = equipWeaponFromInventory(currentSave, itemUid)
      if (res.error) {
        setEnhanceNotice(res.error)
        return
      }
      setSave(res.nextSave)
      setEnhanceNotice(`สวมใส่ ${ITEMS[res.nextSave.equipment.weapon!.itemId]?.name ?? 'อาวุธ'} แล้ว`)
      void syncSaveToStorageAndCloud(res.nextSave, userRef.current, slotRef.current)
    },
    [syncSaveToStorageAndCloud],
  )

  const handleEnhanceWeapon = useCallback(() => {
    const currentSave = saveRef.current
    if (!currentSave) return
    const res = enhanceEquippedWeapon(currentSave)
    setEnhanceNotice(res.message)
    if (res.outcome === 'error') return
    setSave(res.nextSave)
    recordDailyMissionProgress({ enhances: 1 })
    playEnhanceSfx(res.outcome === 'success', mutedRef.current)
    appendLog(res.message, res.outcome === 'success' ? 'crit' : 'system')
    void syncSaveToStorageAndCloud(res.nextSave, userRef.current, slotRef.current)
  }, [appendLog, syncSaveToStorageAndCloud])

  // Real-time Action Combat loop (cooldowns, enemy counter-attacks, passive MP regen)
  useEffect(() => {
    if (phase !== 'FIGHTING' && phase !== 'READY') return

    let last = performance.now()
    let enemyTimer = 0
    let petTimer = 0
    let regenAccum = 0

    const interval = window.setInterval(() => {
      const now = performance.now()
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now

      setAttackCd((cd) => Math.max(0, cd - dt))
      setSkillCds((prev) => {
        let changed = false
        const next: Record<string, number> = {}
        for (const [k, v] of Object.entries(prev)) {
          if (v > 0) {
            next[k] = Math.max(0, v - dt)
            changed = true
          }
        }
        return changed ? next : prev
      })

      if (phaseRef.current !== 'FIGHTING') return

      const currentEnemy = enemyRef.current
      const currentSave = saveRef.current
      if (!currentEnemy || !currentSave || currentEnemy.hp <= 0) return

      let workingEnemy = currentEnemy
      let workingSave = currentSave
      // Gentle passive MP regen during combat
      regenAccum += dt
      if (regenAccum >= 1.5) {
        regenAccum -= 1.5
        const st = getStats(workingSave)
        if (workingSave.mp < st.maxMp) {
          workingSave = { ...workingSave, mp: Math.min(st.maxMp, workingSave.mp + 2) }
          saveRef.current = workingSave
          setSave(workingSave)
        }
      }

      // Active combat pet auto-assist
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
          playPetAttackSfx(mutedRef.current)
          pushPopup('enemy', `${formatNum(petDmg)}`, activePet.def.colors.accent)
          appendLog(`${activePet.def.name} ช่วยโจมตี ${formatNum(petDmg)} ดาเมจ`, 'hero')
          if (nextEnemyHp <= 0) {
            handleVictory(workingSave, workingEnemy)
            return
          }
        }
      }

      enemyTimer += dt
      setEnemyAttackProgress(Math.min(1, enemyTimer / workingEnemy.attackInterval))

      if (enemyTimer >= workingEnemy.attackInterval) {
        enemyTimer -= workingEnemy.attackInterval
        setEnemyAttackProgress(0)
        const incomingDmg = calculateEnemyAttack(workingEnemy, workingSave)
        setEnemyAttackPulse(performance.now())
        setPlayerHitPulse(performance.now())
        playEnemyHitSfx(mutedRef.current)
        pushPopup('player', `-${formatNum(incomingDmg)}`, '#ff4d4d')
        appendLog(`${workingEnemy.def.name} โจมตีสวนกลับ ${formatNum(incomingDmg)} ความเสียหาย`, 'enemy')

        const nextHp = Math.max(0, workingSave.hp - incomingDmg)
        const updated = { ...workingSave, hp: nextHp }
        saveRef.current = updated
        setSave(updated)
        if (nextHp <= 0) {
          phaseRef.current = 'DEFEAT'
          setPhase('DEFEAT')
          setStreak(0)
          appendLog('คุณพ่ายแพ้ในการปะทะ! กด "ฟื้นฟูและสู้ต่อ" เพื่อกลับมาท้าทายใหม่', 'enemy')
          void syncSaveToStorageAndCloud(updated, userRef.current, slotRef.current)
        }
      }
    }, 50)

    return () => window.clearInterval(interval)
  }, [appendLog, handleVictory, phase, pushPopup, syncSaveToStorageAndCloud])

  // Keyboard shortcuts for snappy action combat
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const key = e.key.toLowerCase()
      if (e.code === 'Space') {
        e.preventDefault()
        if (phaseRef.current === 'VICTORY') {
          spawnNextEncounter()
        } else if (phaseRef.current === 'READY' || phaseRef.current === 'FIGHTING') {
          executeHeroAttack()
        }
        return
      }
      if (key === '1' || key === '2' || key === '3') {
        const s = saveRef.current
        if (!s) return
        const job = JOBS[s.jobId] ?? JOBS.novice
        const skill = job.skills[Number(key) - 1]
        if (skill) executeHeroAttack(skill)
      } else if (key === 'q') {
        handleUsePotion('hp')
      } else if (key === 'r') {
        handleUsePotion('mp')
      } else if (e.key === 'Escape') {
        handleFlee()
      } else if (e.key === 'Enter' && phaseRef.current === 'VICTORY') {
        spawnNextEncounter()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [executeHeroAttack, handleFlee, handleUsePotion, spawnNextEncounter])

  const weaponInfo = useMemo(() => (save ? getWeaponUpgradeBreakdown(save) : null), [save])
  const heroStats = useMemo(() => (save ? getStats(save) : null), [save])

  const ownedWeapons = useMemo(() => {
    if (!save) return []
    const job = JOBS[save.jobId] ?? JOBS.novice
    return save.inventory.filter((item) => {
      const def = ITEMS[item.itemId]
      return (
        def?.kind === 'weapon' &&
        (def.reqLevel ?? 1) <= save.level &&
        (!def.weaponType || job.weaponTypes.includes(def.weaponType))
      )
    })
  }, [save])

  const enhanceStones = useMemo(() => {
    if (!save) return 0
    return save.inventory
      .filter((i) => i.itemId === 'enhance_stone')
      .reduce((sum, i) => sum + i.qty, 0)
  }, [save])

  if (phase === 'LOADING' || !save || !heroStats || !weaponInfo) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-background p-6">
        <div className="pixel-panel px-6 py-5 text-center">
          <p className="text-sm font-semibold text-primary">กำลังโหลดข้อมูลตัวละครและสนามต่อสู้...</p>
        </div>
      </main>
    )
  }

  const job = weaponInfo.job
  const expNeed = expToNext(save.level)
  const rarityMeta = enemy ? RARITY_LABELS[enemy.rarity] : RARITY_LABELS.normal
  const nextEnhanceCost = weaponInfo.weaponDef
    ? enhanceCost(weaponInfo.weaponPlus, weaponInfo.weaponDef.tier ?? 1)
    : null
  const nextEnhanceRate = enhanceRate(weaponInfo.weaponPlus)

  return (
    <main className="h-dvh w-full overflow-y-auto bg-background text-foreground">
      {/* 3-Zone Top Bar */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-8 border-b-2 border-border px-4 py-3 md:px-6">
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
          <Link href="/tower" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">
            หอคอยไต่ชั้น
          </Link>
          <Link href="/class-selector" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">
            สายอาชีพ
          </Link>
          <Link href="/character-status" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">
            สถานะตัวละคร
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'เปิดเสียงเอฟเฟกต์' : 'ปิดเสียงเอฟเฟกต์'}
            className="pixel-btn flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap bg-secondary px-3 py-2 text-xs text-foreground hover:brightness-110"
          >
            {muted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
            {muted ? 'ปิดเสียง' : 'เสียง 8-bit'}
          </button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-4 p-4 md:grid-cols-[1.55fr_1fr] md:p-6">
        {/* Primary Arena Column */}
        <section aria-label="สนามต่อสู้มอนสเตอร์" className="flex flex-col gap-4">
          {/* Encounter Header & Unboxed Metadata */}
          <div className="pixel-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
              <div>
                <h1 className="text-lg font-bold text-foreground">สนามประลองล่ามอนสเตอร์</h1>
                <p className="text-xs text-muted-foreground">
                  {syncNotice} · ชนะต่อเนื่อง <span className="font-bold text-primary tabular-nums">{streak}</span> รอบ
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => spawnNextEncounter()}
                  disabled={phase === 'FIGHTING'}
                  className="pixel-btn flex min-h-10 items-center gap-1.5 whitespace-nowrap bg-secondary px-3 py-2 text-xs font-semibold text-foreground hover:brightness-110 disabled:opacity-45"
                >
                  <RefreshCw className="size-3.5" aria-hidden />
                  สุ่มมอนสเตอร์ใหม่
                </button>
                <button
                  type="button"
                  onClick={() => spawnNextEncounter('boss')}
                  disabled={phase === 'FIGHTING'}
                  className="pixel-btn flex min-h-10 items-center gap-1.5 whitespace-nowrap bg-destructive/20 px-3 py-2 text-xs font-semibold text-[#ff8b8e] hover:bg-destructive/30 disabled:opacity-45"
                >
                  <Flame className="size-3.5" aria-hidden />
                  ท้าทายบอส
                </button>
              </div>
            </div>

            {/* Hero vs Enemy Vital Meters */}
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 border border-border/60 bg-background/50 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-bold text-foreground">{save.name}</span>
                  <span className="shrink-0 text-xs text-primary tabular-nums">
                    Lv.{save.level} · {job.name}
                  </span>
                </div>
                <MeterBar label="HP" value={save.hp} max={heroStats.maxHp} colorClass="bg-hp" textClassName="text-[#ff8b8e]" />
                <MeterBar label="MP" value={save.mp} max={heroStats.maxMp} colorClass="bg-mp" textClassName="text-[#7fb0ff]" />
                <MeterBar
                  label="EXP"
                  value={save.level >= MAX_LEVEL ? expNeed : save.exp}
                  max={expNeed}
                  colorClass="bg-exp"
                  textClassName="text-[#dca8ff]"
                />
              </div>

              {enemy && (
                <div className="space-y-2 border border-border/60 bg-background/50 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-bold text-foreground">{enemy.def.name}</span>
                    <span className={`shrink-0 text-xs font-semibold tabular-nums ${rarityMeta.className}`}>
                      Lv.{enemy.effectiveLevel} · {rarityMeta.title}
                    </span>
                  </div>
                  <MeterBar label="HP มอนสเตอร์" value={enemy.hp} max={enemy.maxHp} colorClass="bg-destructive" textClassName="text-[#ff8b8e]" />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>เกจโจมตีศัตรู</span>
                      <span className="tabular-nums">
                        ATK {formatNum(enemy.atk)} · DEF {formatNum(enemy.defStat)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden border border-[#0e0f1a] bg-muted/80">
                      <div
                        className="h-full bg-amber-400 transition-[width] duration-75"
                        style={{ width: `${Math.round(enemyAttackProgress * 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    พื้นที่: {BIOME_LABELS[enemy.biome]} · รางวัล {formatNum(enemy.goldRange[0])}–{formatNum(enemy.goldRange[1])} G · {formatNum(enemy.expReward)} EXP
                  </p>
                </div>
              )}
            </div>

            {/* Battle Stage Canvas + Outcome Overlay */}
            <div className="relative mt-3">
              <EncounterStageCanvas
                save={save}
                enemy={enemy}
                phase={phase}
                playerAttackPulse={playerAttackPulse}
                playerSkillColor={playerSkillColor}
                playerHitPulse={playerHitPulse}
                enemyAttackPulse={enemyAttackPulse}
                enemyHitPulse={enemyHitPulse}
                petAttackPulse={petAttackPulse}
                popups={popups}
              />

              <AnimatePresence>
                {phase === 'VICTORY' && victoryResult && enemy && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-[#0e0f1a]/88 p-4 text-center backdrop-blur-[1px]"
                  >
                    <p className="text-xs font-semibold text-accent">
                      ชนะการต่อสู้ · บันทึกรางวัลเข้าเซฟตัวละครแล้ว
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-primary">
                      ปราบ {enemy.def.name} สำเร็จ!
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-sm font-semibold tabular-nums">
                      <span className="flex items-center gap-1 text-gold">
                        <Coins className="size-4" aria-hidden />+{formatNum(victoryResult.goldEarned)} G
                      </span>
                      <span className="flex items-center gap-1 text-[#dca8ff]">
                        <Sparkles className="size-4" aria-hidden />+{formatNum(victoryResult.expEarned)} EXP
                      </span>
                      {victoryResult.leveledUpTo > victoryResult.leveledUpFrom && (
                        <span className="text-[#ffd60a]">
                          เลเวลอัป! Lv.{victoryResult.leveledUpFrom} → Lv.{victoryResult.leveledUpTo}
                        </span>
                      )}
                    </div>
                    {victoryResult.drops.length > 0 && (
                      <p className="mt-2 text-xs text-foreground/90">
                        ไอเทมที่ได้รับ:{' '}
                        {victoryResult.drops.map((d) => `${d.name} x${d.qty}`).join(' · ')}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => spawnNextEncounter()}
                        className="pixel-btn min-h-11 bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:brightness-110"
                      >
                        ลุยมอนสเตอร์ตัวถัดไป (กด Enter)
                      </button>
                      <Link
                        href="/"
                        className="pixel-btn min-h-11 bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:brightness-110"
                      >
                        กลับเข้าสู่โลกเกม
                      </Link>
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
                    <h2 className="text-xl font-bold text-[#ff7b7f]">ตัวละครหมดสติ</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      ฟื้นฟู HP/MP 50% เพื่อเริ่มการปะทะรอบใหม่ได้ทันที
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleRetryAfterDefeat}
                        className="pixel-btn min-h-11 bg-accent px-4 py-2 text-xs font-bold text-accent-foreground hover:brightness-110"
                      >
                        ฟื้นฟูและสู้ต่อ
                      </button>
                      <Link
                        href="/"
                        className="pixel-btn min-h-11 bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:brightness-110"
                      >
                        กลับเข้าสู่โลกเกม
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Combat Controls */}
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => executeHeroAttack()}
                disabled={attackCd > 0 || phase === 'VICTORY' || phase === 'DEFEAT'}
                className="pixel-btn flex min-h-11 items-center justify-center gap-2 bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
              >
                <Swords className="size-4" aria-hidden />
                <span className="whitespace-nowrap">
                  โจมตี (ปุ่ม Space) {attackCd > 0 ? `${attackCd.toFixed(1)}s` : ''}
                </span>
              </button>

              {job.skills.slice(0, 3).map((skill, idx) => {
                const cd = skillCds[skill.id] ?? 0
                const noMp = save.mp < skill.mp
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => executeHeroAttack(skill)}
                    disabled={cd > 0 || noMp || phase === 'VICTORY' || phase === 'DEFEAT'}
                    className="pixel-btn flex min-h-11 flex-col items-center justify-center bg-secondary px-3 py-1.5 text-xs text-foreground hover:brightness-110 disabled:opacity-45"
                  >
                    <span className="font-semibold">
                      [{idx + 1}] {skill.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {cd > 0 ? `CD ${cd.toFixed(1)}s` : `${skill.mp} MP · ${skill.mult}x`}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Recovery & Retreat Row */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
              <div className="flex flex-wrap items-center gap-2">
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

              <button
                type="button"
                onClick={handleFlee}
                disabled={phase !== 'FIGHTING'}
                className="pixel-btn min-h-10 bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                หนี / เปลี่ยนศัตรู (Esc)
              </button>
            </div>
          </div>

          {/* Combat Log */}
          <div className="pixel-panel p-4">
            <h2 className="text-sm font-bold text-foreground">บันทึกการต่อสู้</h2>
            <ul className="mt-2 space-y-1 text-xs">
              {logs.length === 0 ? (
                <li className="text-muted-foreground">กดปุ่มโจมตีหรือ Spacebar เพื่อเริ่มการต่อสู้</li>
              ) : (
                logs.map((entry) => (
                  <li
                    key={entry.id}
                    className={
                      entry.tone === 'crit'
                        ? 'font-semibold text-[#ffd60a]'
                        : entry.tone === 'hero'
                          ? 'text-foreground'
                          : entry.tone === 'enemy'
                            ? 'text-[#ff8b8e]'
                            : entry.tone === 'loot'
                              ? 'font-semibold text-accent'
                              : 'text-muted-foreground'
                    }
                  >
                    {entry.text}
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        {/* Stats, Weapon Upgrade Impact & Loadout Column */}
        <aside aria-label="พลังอาวุธและอุปกรณ์" className="flex flex-col gap-4">
          {/* Combat Stat & Weapon Upgrade Breakdown */}
          <div className="pixel-panel p-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-primary">
                <Shield className="size-4" aria-hidden />
                พลังโจมตีและโบนัสอาวุธ
              </h2>
              <span className="text-xs font-bold text-gold tabular-nums">
                {formatNum(save.gold)} G
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs tabular-nums">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">อาวุธที่สวมใส่</span>
                <span className="font-bold text-foreground">
                  {weaponInfo.weaponDef ? weaponInfo.weaponDef.name : 'มือเปล่า'}
                  {weaponInfo.weaponPlus > 0 ? ` +${weaponInfo.weaponPlus}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">พลังโจมตีพื้นฐานตัวละคร</span>
                <span>{formatNum(weaponInfo.baseCharacterAtk)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">พลังอาวุธพื้นฐาน</span>
                <span>+{formatNum(weaponInfo.weaponBaseAtk)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">โบนัสตีบวก (+{weaponInfo.weaponPlus})</span>
                <span className="font-semibold text-accent">
                  +{formatNum(weaponInfo.weaponUpgradeBonus)} ATK · +{(weaponInfo.weaponPlus * 0.5).toFixed(1)}% คริ
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-2">
                <span className="font-semibold text-foreground">พลังโจมตีรวม (×{weaponInfo.job.atkMul} อาชีพ)</span>
                <span className="text-sm font-bold text-primary">{formatNum(weaponInfo.totalAtk)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">พลังป้องกัน / โอกาสคริติคอล</span>
                <span>
                  {formatNum(heroStats.def)} DEF · {Math.round(weaponInfo.critChance * 100)}%
                </span>
              </div>
            </div>

            {lastBreakdown && (
              <div className="mt-3 border border-border/70 bg-background/60 p-2.5 text-xs tabular-nums">
                <p className="font-semibold text-foreground">
                  การโจมตีล่าสุด: {lastBreakdown.label}
                </p>
                <p className="mt-1 text-muted-foreground">
                  พลังรวม {formatNum(lastBreakdown.totalAtk)} × {lastBreakdown.skillMultiplier.toFixed(1)}x ปะทะป้องกัน {formatNum(lastBreakdown.enemyDef)}
                  {lastBreakdown.isCrit ? ` × ${lastBreakdown.critMultiplier.toFixed(2)} คริติคอล` : ''} ={' '}
                  <span className="font-bold text-primary">{formatNum(lastBreakdown.damage)} ดาเมจ</span>
                </p>
              </div>
            )}

            {/* Real Blacksmith Weapon Enhancement */}
            {weaponInfo.weaponItem && nextEnhanceCost && (
              <div className="mt-3 border-t border-border/70 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">ตีบวกอาวุธทันที</span>
                  <span className="text-muted-foreground tabular-nums">
                    หินตีบวก: {formatNum(enhanceStones)} ก้อน
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                  {weaponInfo.weaponPlus >= MAX_PLUS
                    ? 'อาวุธตีบวกถึงระดับสูงสุดแล้ว'
                    : `อัปเกรดเป็น +${weaponInfo.weaponPlus + 1} · อัตราสำเร็จ ${Math.round(nextEnhanceRate * 100)}% · ใช้ ${formatNum(nextEnhanceCost.gold)} G และหิน ${nextEnhanceCost.stones} ก้อน`}
                </p>
                <button
                  type="button"
                  onClick={handleEnhanceWeapon}
                  disabled={weaponInfo.weaponPlus >= MAX_PLUS}
                  className="pixel-btn mt-2 flex min-h-10 w-full items-center justify-center gap-1.5 bg-accent/20 px-3 py-2 text-xs font-bold text-accent hover:bg-accent/30 disabled:opacity-45"
                >
                  <Hammer className="size-3.5" aria-hidden />
                  ตีบวกอาวุธ (+{weaponInfo.weaponPlus} → +{Math.min(MAX_PLUS, weaponInfo.weaponPlus + 1)})
                </button>
                {enhanceNotice && (
                  <p className="mt-1.5 text-xs text-primary">{enhanceNotice}</p>
                )}
              </div>
            )}
          </div>

          {/* Owned Weapons Switcher */}
          <div className="pixel-panel p-4">
            <h2 className="text-sm font-bold text-foreground">สลับอาวุธในกระเป๋า ({ownedWeapons.length})</h2>
            {ownedWeapons.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                ยังไม่มีอาวุธสำรองที่อาชีพนี้ใช้ได้ในกระเป๋า
              </p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {ownedWeapons.map((item) => {
                  const def = ITEMS[item.itemId]
                  if (!def) return null
                  return (
                    <div
                      key={item.uid}
                      className="flex items-center justify-between gap-2 border border-border/60 bg-background/50 px-2.5 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {def.name}
                          {item.plus > 0 ? ` +${item.plus}` : ''}
                        </p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          ATK +{formatNum(def.atk ?? 0)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEquipWeapon(item.uid)}
                        className="pixel-btn shrink-0 bg-secondary px-2.5 py-1.5 text-xs font-semibold text-foreground hover:brightness-110"
                      >
                        สวมใส่
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}
