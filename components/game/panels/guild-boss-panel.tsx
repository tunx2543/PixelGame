'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock, Coins, Crown, Flame, Gift, MapPin, MessageSquare, Send, Shield, Smile, Sparkles, Swords, Trophy, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { ChatEmojiPicker } from '@/components/game/chat-emoji-picker'
import { detectNewlyArrivedKeys, insertEmojiAtCursor } from '@/lib/game/chat-emojis'
import { computeLevelGapModifiers } from '@/lib/game/combat-balance'
import { JOBS, normalizeJobId } from '@/lib/game/data'
import {
  addItem,
  applyFieldBossRewardAction,
  claimWorldBossMilestoneAction,
  closePanel,
  getStats,
  gmEndEventWorldBossTestAction,
  gmSummonEventWorldBossTestAction,
  isCurrentAccountGm,
  recordWorldBossDamageAction,
  saveGame,
  summonWorldBossInField,
  syncGuildStateAction,
  triggerWorldBossCritHit,
  triggerWorldBossVictory,
} from '@/lib/game/engine'
import {
  attackFieldBossOnline,
  claimFieldBossRewardOnline,
  subscribeFieldBoss,
  type FieldBossOnlineState,
} from '@/lib/firebase/mmo-online'
import {
  attackGuildRaid,
  attackWorldBossOnline,
  createGuildOnline,
  donateGuildOnline,
  fetchGuildRaidState,
  fetchWorldBossState,
  joinGuildOnline,
  leaveGuildOnline,
  listGuildsOnline,
  sendGuildMessage,
  subscribeGuildMessages,
  type GuildChatMessage,
  type GuildRaidState,
  type GuildRecord,
  type WorldBossRaidState,
} from '@/lib/firebase/rpg-online'
import {
  FIELD_BOSS_SPECS,
  getFieldBossForMap,
  getWorldBossScheduleList,
  type FieldBossSpec,
} from '@/lib/game/mmo-systems'
import {
  ELEMENT_META,
  WORLD_BOSS_CATALOG,
  WORLD_BOSS_EVENT_SCHEDULE_LABEL,
  formatThaiWorldBossSlotLabel,
  getActiveWorldBoss,
  getAttackElement,
  getElementMultiplier,
  getGuildBuffs,
  guildExpToNext,
  sanitizeRpgExt,
} from '@/lib/game/rpg-systems'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { SpriteModelCanvas } from '../sprite-model-canvas'
import { PanelFrame, PxButton } from './panels'

const FIELD_MAP_OPTIONS: Array<{ id: FieldBossSpec['mapId']; label: string }> = [
  { id: 'meadow', label: 'ทุ่งหญ้า (Lv.10)' },
  { id: 'forest', label: 'ป่าสน (Lv.20)' },
  { id: 'cave', label: 'ถ้ำมืด (Lv.32)' },
  { id: 'volcano', label: 'ภูเขาไฟ (Lv.45)' },
]

const FIELD_BOSS_MONSTER_IDS: Record<FieldBossSpec['mapId'], string> = {
  meadow: 'meadow_dewmother',
  forest: 'forest_tusk_overlord',
  cave: 'cave_drill_colossus',
  volcano: 'volcano_inferno_sovereign',
}

export function GuildBossPanel() {
  const g = useGame()
  const p = g.p
  const [tab, setTab] = useState<'worldboss' | 'guild' | 'ranking'>('worldboss')
  const [guilds, setGuilds] = useState<GuildRecord[]>([])
  const [worldBoss, setWorldBoss] = useState<WorldBossRaidState | null>(null)
  const [selectedFieldMap, setSelectedFieldMap] = useState<FieldBossSpec['mapId']>(() => {
    const mapId = g.p?.mapId
    return mapId === 'meadow' || mapId === 'forest' || mapId === 'cave' || mapId === 'volcano' ? mapId : 'meadow'
  })
  const [fieldBoss, setFieldBoss] = useState<FieldBossOnlineState | null>(null)
  const [fieldCdMs, setFieldCdMs] = useState(0)
  const [guildNameInput, setGuildNameInput] = useState('')
  const [guildTagInput, setGuildTagInput] = useState('')
  const [guildChatMessages, setGuildChatMessages] = useState<GuildChatMessage[]>([])
  const [guildChatInput, setGuildChatInput] = useState('')
  const [guildEmojiOpen, setGuildEmojiOpen] = useState(false)
  const [guildFreshKeys, setGuildFreshKeys] = useState<Record<string, true>>({})
  const guildChatListRef = useRef<HTMLDivElement>(null)
  const guildChatInputRef = useRef<HTMLInputElement>(null)
  const guildCursorPosRef = useRef<{ start: number; end: number } | null>(null)
  const guildSeenKeysRef = useRef<Set<string>>(new Set())
  const guildHydratedRef = useRef(false)
  const guildFreshTimersRef = useRef<number[]>([])
  const [guildRaid, setGuildRaid] = useState<GuildRaidState | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [attackCdMs, setAttackCdMs] = useState(0)
  const [skillCdMs, setSkillCdMs] = useState(0)
  const [wbAnim, setWbAnim] = useState<'idle' | 'attack'>('idle')
  const [busy, setBusy] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [gmTestBossId, setGmTestBossId] = useState<string>('wb_world_golem')
  const [gmTestDurationMin, setGmTestDurationMin] = useState<number>(30)

  const currentGuildId = p ? sanitizeRpgExt(p.rpgExt).guildId : null
  const activeBossSpec = getActiveWorldBoss(nowMs)

  const refreshData = useCallback(async () => {
    const [gList, wb] = await Promise.all([listGuildsOnline(), fetchWorldBossState()])
    setGuilds(gList)
    setWorldBoss(wb)
    if (currentGuildId) {
      const raid = await fetchGuildRaidState(currentGuildId)
      setGuildRaid(raid)
    }
  }, [currentGuildId])

  useEffect(() => {
    void refreshData()
  }, [refreshData, activeBossSpec.cycleKey])

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const unsub = subscribeFieldBoss(selectedFieldMap, setFieldBoss)
    return () => unsub()
  }, [selectedFieldMap])

  useEffect(() => {
    guildSeenKeysRef.current.clear()
    guildHydratedRef.current = false
    setGuildFreshKeys({})
    if (!currentGuildId) {
      setGuildChatMessages([])
      return
    }
    const unsub = subscribeGuildMessages(currentGuildId, setGuildChatMessages)
    return () => unsub()
  }, [currentGuildId])

  useEffect(() => {
    return () => {
      guildFreshTimersRef.current.forEach((id) => window.clearTimeout(id))
      guildFreshTimersRef.current = []
    }
  }, [])

  const guildMsgSignature = guildChatMessages.map((m) => m.messageId).join('\n')
  useEffect(() => {
    const keys = guildMsgSignature ? guildMsgSignature.split('\n') : []
    const newlyArrived = detectNewlyArrivedKeys({
      seenKeys: guildSeenKeysRef.current,
      visibleKeys: keys,
      isHydrated: guildHydratedRef.current,
      channelSwitched: false,
    })
    if (!guildHydratedRef.current) {
      if (keys.length > 0 || currentGuildId) {
        guildHydratedRef.current = true
      }
    } else if (newlyArrived.length > 0) {
      setGuildFreshKeys((prev) => {
        const next = { ...prev }
        for (const k of newlyArrived) next[k] = true
        return next
      })
      const timer = window.setTimeout(() => {
        setGuildFreshKeys((prev) => {
          const next = { ...prev }
          for (const k of newlyArrived) delete next[k]
          return next
        })
      }, 1500)
      guildFreshTimersRef.current.push(timer)
    }

    const el = guildChatListRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [guildMsgSignature, currentGuildId])

  useEffect(() => {
    if (attackCdMs <= 0 && skillCdMs <= 0 && fieldCdMs <= 0) return
    const timer = window.setInterval(() => {
      setAttackCdMs((prev) => Math.max(0, prev - 250))
      setSkillCdMs((prev) => Math.max(0, prev - 250))
      setFieldCdMs((prev) => Math.max(0, prev - 250))
    }, 250)
    return () => window.clearInterval(timer)
  }, [attackCdMs, skillCdMs, fieldCdMs])

  if (!p) return null
  const ext = sanitizeRpgExt(p.rpgExt)
  const bossSpec = activeBossSpec
  const bossElem = ELEMENT_META[bossSpec.element]
  const isGmDev = Boolean(p.gm && isCurrentAccountGm())
  const fieldBossSpec = getFieldBossForMap(selectedFieldMap) ?? FIELD_BOSS_SPECS.meadow
  const fieldBossElem = ELEMENT_META[fieldBossSpec.element]
  const wbSchedule = getWorldBossScheduleList(nowMs, 4)
  const sortedGuilds = [...guilds].sort(
    (a, b) => b.level - a.level || b.totalDonatedGold - a.totalDonatedGold || b.memberCount - a.memberCount,
  )
  const myGuild = guilds.find((item) => item.guildId === ext.guildId) ?? null
  const guildBuffs = ext.guildId ? getGuildBuffs(myGuild?.level ?? ext.guildLevel) : null

  const targetSec = bossSpec.isActive
    ? Math.max(0, Math.floor((bossSpec.endsAtMs - nowMs) / 1000))
    : Math.max(0, Math.floor((bossSpec.startsAtMs - nowMs) / 1000))
  const cdDays = Math.floor(targetSec / 86400)
  const cdHours = Math.floor((targetSec % 86400) / 3600)
  const mins = Math.floor((targetSec % 3600) / 60)
  const secs = targetSec % 60
  const countdownText =
    cdDays > 0
      ? `${cdDays} วัน ${String(cdHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : cdHours > 0
        ? `${String(cdHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const handleCreateGuild = async () => {
    if (busy) return
    setBusy(true)
    const res = await createGuildOnline({
      name: guildNameInput,
      tag: guildTagInput || 'STAR',
      leaderName: p.name,
    })
    setBusy(false)
    if (!res.ok || !res.guild) {
      setNotice(res.error ?? 'สร้างกิลด์ไม่สำเร็จ')
      return
    }
    syncGuildStateAction({
      guildId: res.guild.guildId,
      guildName: res.guild.name,
      guildTag: res.guild.tag,
      guildLevel: res.guild.level,
    })
    setGuildNameInput('')
    setGuildTagInput('')
    setNotice(`ก่อตั้งกิลด์ [${res.guild.tag}] ${res.guild.name} สำเร็จ!`)
    await refreshData()
  }

  const handleJoinGuild = async (guildId: string) => {
    if (busy) return
    setBusy(true)
    const res = await joinGuildOnline(guildId)
    setBusy(false)
    if (!res.ok || !res.guild) {
      setNotice(res.error ?? 'เข้าร่วมกิลด์ไม่สำเร็จ')
      return
    }
    syncGuildStateAction({
      guildId: res.guild.guildId,
      guildName: res.guild.name,
      guildTag: res.guild.tag,
      guildLevel: res.guild.level,
    })
    setNotice(`เข้าร่วมกิลด์ ${res.guild.name} สำเร็จ!`)
    await refreshData()
  }

  const handleDonate = async (amount: number) => {
    if (!ext.guildId || busy) return
    if (p.gold < amount) {
      setNotice(`ทองไม่พอ (ต้องการ ${formatNum(amount)} G)`)
      return
    }
    setBusy(true)
    const res = await donateGuildOnline(ext.guildId, amount)
    setBusy(false)
    if (res.ok) {
      syncGuildStateAction({
        guildId: ext.guildId,
        guildName: ext.guildName,
        guildTag: ext.guildTag,
        guildLevel: res.newLevel,
        donateCostGold: amount,
      })
      setNotice(`บริจาค ${formatNum(amount)} G สำเร็จ! กิลด์ Lv.${res.newLevel}`)
      await refreshData()
    }
  }

  const handleAttackWorldBoss = async () => {
    if (attackCdMs > 0 || busy) return
    if (!bossSpec.isActive) {
      setNotice(`บอสกิจกรรมยังไม่เปิด (${WORLD_BOSS_EVENT_SCHEDULE_LABEL})`)
      return
    }
    setBusy(true)
    setWbAnim('attack')
    window.setTimeout(() => setWbAnim('idle'), 550)
    const s = getStats(p)
    const gmStaff = p.equipment.weapon?.itemId === 'gm_golden_staff' && Boolean(p.gm)
    const gap = computeLevelGapModifiers(p.level, bossSpec.level, {
      isBoss: true,
      isGmStaff: gmStaff,
      isWorldBossRaid: true,
    })
    if (!gmStaff && gap.missChance > 0 && Math.random() < gap.missChance) {
      setAttackCdMs(2500)
      setBusy(false)
      setNotice(`โจมตี ${bossSpec.name} (Lv.${bossSpec.level}) พลาดเป้า! (เลเวลห่าง ${gap.levelDiff})`)
      return
    }
    const atkElem = getAttackElement(null, ext.equippedRunes)
    const elem = getElementMultiplier(atkElem, bossSpec.element)
    const crit = Math.random() < s.crit
    const raw = ((s.atk * 2.2) ** 2) / Math.max(1, s.atk * 2.2 + bossSpec.def)
    const damage = Math.max(
      15,
      Math.round(raw * elem.multiplier * gap.damageMul * (crit ? 1.65 : 1) * (0.92 + Math.random() * 0.16)),
    )

    if (crit) {
      triggerWorldBossCritHit({ isSoulCrit: false, damage })
    }
    recordWorldBossDamageAction(damage)
    const updatedWb = await attackWorldBossOnline({
      playerName: p.name,
      jobId: p.jobId,
      level: p.level,
      damage,
    })
    const prevHp = worldBoss?.currentHp ?? bossSpec.maxHp
    setWorldBoss(updatedWb)
    if (prevHp > 0 && updatedWb.currentHp <= 0) {
      triggerWorldBossVictory({
        bossName: bossSpec.name,
        gold: 0,
        diamonds: 15,
        exp: 0,
      })
    }
    setAttackCdMs(3000)
    setBusy(false)
    setNotice(
      `โจมตี ${bossSpec.name} ทำดาเมจ ${formatNum(damage)}${crit ? ' (คริติคอล!)' : ''}${elem.effectiveness === 'super' ? ' [ชนะธาตุ!]' : ''}`,
    )
  }

  const handleSkillWorldBoss = async () => {
    if (skillCdMs > 0 || busy) return
    if (!bossSpec.isActive) {
      setNotice(`บอสกิจกรรมยังไม่เปิด (${WORLD_BOSS_EVENT_SCHEDULE_LABEL})`)
      return
    }
    const job = JOBS[normalizeJobId(p.jobId)]
    const bestSkill = [...(job?.skills ?? [])]
      .filter((sk) => sk.kind !== 'heal')
      .sort((a, b) => b.mult * (b.hits ?? 1) - a.mult * (a.hits ?? 1))[0]
    const skillMult = bestSkill ? Math.max(2.6, bestSkill.mult * (bestSkill.hits ?? 1) * 0.95) : 3.6
    const skillLabel = bestSkill?.name ?? 'พลังราชันย์สกิล'

    setBusy(true)
    setWbAnim('attack')
    window.setTimeout(() => setWbAnim('idle'), 650)
    const s = getStats(p)
    const gmStaff = p.equipment.weapon?.itemId === 'gm_golden_staff' && Boolean(p.gm)
    const gap = computeLevelGapModifiers(p.level, bossSpec.level, {
      isBoss: true,
      isGmStaff: gmStaff,
      isWorldBossRaid: true,
    })
    const atkElem = getAttackElement(bestSkill?.id ?? null, ext.equippedRunes)
    const elem = getElementMultiplier(atkElem, bossSpec.element)
    const crit = Math.random() < Math.min(0.95, s.crit + 0.15)
    const raw = ((s.atk * skillMult) ** 2) / Math.max(1, s.atk * skillMult + bossSpec.def)
    const damage = Math.max(
      45,
      Math.round(raw * elem.multiplier * gap.damageMul * (crit ? 1.7 : 1) * (0.95 + Math.random() * 0.15)),
    )

    if (crit) {
      triggerWorldBossCritHit({ isSoulCrit: false, damage })
    }
    recordWorldBossDamageAction(damage)
    const updatedWb = await attackWorldBossOnline({
      playerName: p.name,
      jobId: p.jobId,
      level: p.level,
      damage,
    })
    const prevHp = worldBoss?.currentHp ?? bossSpec.maxHp
    setWorldBoss(updatedWb)
    if (prevHp > 0 && updatedWb.currentHp <= 0) {
      triggerWorldBossVictory({
        bossName: bossSpec.name,
        gold: 0,
        diamonds: 15,
        exp: 0,
      })
    }
    setSkillCdMs(5000)
    setBusy(false)
    setNotice(
      `ใช้สกิล "${skillLabel}" ใส่ ${bossSpec.name} ทำดาเมจ ${formatNum(damage)}!${crit ? ' (คริติคอล!)' : ''}${elem.effectiveness === 'super' ? ' [ชนะธาตุ!]' : ''}`,
    )
  }

  const handleSummonWorldBossOnMap = () => {
    const res = summonWorldBossInField()
    if (!res.ok) {
      setNotice(res.message)
      return
    }
    closePanel()
  }

  const handleGmSummonTestWorldBoss = async (summonOnMap: boolean) => {
    if (busy || !isGmDev) return
    setBusy(true)
    const res = await gmSummonEventWorldBossTestAction({
      bossId: gmTestBossId,
      durationMinutes: gmTestDurationMin,
      summonOnMap,
    })
    setBusy(false)
    setNotice(res.message)
    if (res.ok) {
      await refreshData()
      if (summonOnMap) closePanel()
    }
  }

  const handleGmEndTestWorldBoss = async () => {
    if (busy || !isGmDev) return
    setBusy(true)
    const res = await gmEndEventWorldBossTestAction()
    setBusy(false)
    setNotice(res.message)
    if (res.ok) {
      await refreshData()
    }
  }

  const handleAttackFieldBoss = async () => {
    if (fieldCdMs > 0 || busy) return
    setBusy(true)
    const s = getStats(p)
    const gmStaff = p.equipment.weapon?.itemId === 'gm_golden_staff' && Boolean(p.gm)
    const gap = computeLevelGapModifiers(p.level, fieldBossSpec.level, {
      isBoss: true,
      isGmStaff: gmStaff,
    })
    if (!gmStaff && gap.missChance > 0 && Math.random() < gap.missChance) {
      setFieldCdMs(2000)
      setBusy(false)
      setNotice(`โจมตี ${fieldBossSpec.name} (Lv.${fieldBossSpec.level}) พลาดเป้า! (เลเวลห่าง ${gap.levelDiff} เลเวล)`)
      return
    }
    const atkElem = getAttackElement(null, ext.equippedRunes)
    const elem = getElementMultiplier(atkElem, fieldBossSpec.element)
    const crit = Math.random() < s.crit
    const raw = ((s.atk * 2.0) ** 2) / Math.max(1, s.atk * 2.0 + fieldBossSpec.def)
    const damage = Math.max(
      gap.minDamageFloor,
      Math.round(raw * elem.multiplier * gap.damageMul * (crit ? 1.55 : 1) * (0.9 + Math.random() * 0.2)),
    )
    if (damage <= 0) {
      setFieldCdMs(2000)
      setBusy(false)
      setNotice(`พลังโจมตีไม่พอเจาะเกราะ ${fieldBossSpec.name} (Lv.${fieldBossSpec.level})!`)
      return
    }

    const res = await attackFieldBossOnline(selectedFieldMap, damage, p.name)
    if (res.state) setFieldBoss(res.state)
    setFieldCdMs(2000)
    setBusy(false)
    if (!res.ok && res.error) {
      setNotice(res.error)
      return
    }
    setNotice(
      res.defeatedNow
        ? `สังหาร ${fieldBossSpec.name} สำเร็จ! กดรับรางวัลฟิลด์บอสได้เลย`
        : `โจมตี ${fieldBossSpec.name} ทำดาเมจ ${formatNum(damage)}${crit ? ' (คริติคอล!)' : ''}`,
    )
  }

  const handleClaimFieldBoss = async () => {
    if (busy) return
    setBusy(true)
    const res = await claimFieldBossRewardOnline(selectedFieldMap)
    setBusy(false)
    if (!res.ok) {
      setNotice(res.error ?? 'รับรางวัลฟิลด์บอสไม่สำเร็จ')
      return
    }
    applyFieldBossRewardAction({
      gold: res.gold,
      diamonds: res.diamonds,
      stones: res.stones,
      bossName: fieldBossSpec.name,
    })
    setNotice(`รับรางวัล ${fieldBossSpec.name} (+${formatNum(res.gold)} G, +${res.diamonds} เพชร, หิน x${res.stones}) แล้ว!`)
  }

  const fieldContributors = fieldBoss
    ? Object.values(fieldBoss.contributors ?? {}).sort((a, b) => b.damage - a.damage).slice(0, 5)
    : []
  const fieldRespawnSec =
    fieldBoss && fieldBoss.currentHp === 0 && fieldBoss.respawnAtMs > Date.now()
      ? Math.ceil((fieldBoss.respawnAtMs - Date.now()) / 1000)
      : 0

  return (
    <PanelFrame
      title="เวิลด์บอส ฟิลด์บอส & สมาคมกิลด์"
      subtitle="ร่วมมือพิชิตเวิลด์บอส ฟิลด์บอสประจำแมพแบบเรียลไทม์ และสะสมบัฟกิลด์ถาวร"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-border/70 pb-2.5">
        <PxButton
          variant={tab === 'worldboss' ? 'primary' : 'secondary'}
          onClick={() => setTab('worldboss')}
        >
          <span className="flex items-center gap-1.5">
            <Flame className="size-3.5" aria-hidden /> บอสโลก & ฟิลด์บอส
          </span>
        </PxButton>
        <PxButton
          variant={tab === 'guild' ? 'primary' : 'secondary'}
          onClick={() => setTab('guild')}
        >
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" aria-hidden /> กิลด์ {ext.guildTag ? `[${ext.guildTag}]` : ''}
          </span>
        </PxButton>
        <PxButton
          variant={tab === 'ranking' ? 'primary' : 'secondary'}
          onClick={() => setTab('ranking')}
        >
          <span className="flex items-center gap-1.5">
            <Trophy className="size-3.5" aria-hidden /> อันดับกิลด์ ({sortedGuilds.length})
          </span>
        </PxButton>
      </div>

      {notice && (
        <div className="mb-3 border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
          {notice}
        </div>
      )}

      {tab === 'worldboss' && (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
            <div className="space-y-3 border border-border/80 bg-background/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-24 shrink-0 place-items-center border-2 border-rose-400/50 bg-[#0b1024]/90 shadow-[inset_0_0_18px_rgba(244,63,94,0.2)]">
                    <SpriteModelCanvas
                      mode="monster"
                      id={bossSpec.monsterId}
                      action={wbAnim}
                      dir="down"
                      size={88}
                      label={`โมเดลบอสโลก ${bossSpec.name}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-base font-bold text-rose-300">{bossSpec.name}</h3>
                      <span className="border border-amber-400/50 bg-amber-950/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                        Lv.{bossSpec.level}
                      </span>
                      <span
                        className="border border-border/60 px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ color: bossElem.color, background: bossElem.bg }}
                      >
                        {bossElem.label}
                      </span>
                      {bossSpec.isTestMode ? (
                        <span className="border border-cyan-400/70 bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
                          GM TEST · กำลังเปิดทดสอบ
                        </span>
                      ) : bossSpec.isActive ? (
                        <span className="border border-emerald-400/70 bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200">
                          กำลังเปิดศึก!
                        </span>
                      ) : (
                        <span className="border border-slate-400/40 bg-slate-800/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-200">
                          รอเวลาเปิดศึก
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-amber-200">
                      กำหนดการกิจกรรม: {WORLD_BOSS_EVENT_SCHEDULE_LABEL}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {bossSpec.isActive
                        ? `เหลือเวลาอีก ${countdownText}`
                        : `เปิดศึกถัดไปใน ${countdownText} (${formatThaiWorldBossSlotLabel(bossSpec.startsAtMs)})`}
                      {' · '}ดาเมจของคุณ: {formatNum(ext.worldBossDamage)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <PxButton disabled={!bossSpec.isActive || attackCdMs > 0 || busy} onClick={handleAttackWorldBoss}>
                        <span className="flex items-center gap-1">
                          <Swords className="size-3.5" aria-hidden />
                          {!bossSpec.isActive
                            ? 'เปิด 20:00 น.'
                            : attackCdMs > 0
                              ? `รอ ${(attackCdMs / 1000).toFixed(1)}s`
                              : 'โจมตีบอส!'}
                        </span>
                      </PxButton>
                      <PxButton
                        variant="accent"
                        disabled={!bossSpec.isActive || skillCdMs > 0 || busy}
                        onClick={handleSkillWorldBoss}
                      >
                        <span className="flex items-center gap-1">
                          <Sparkles className="size-3.5" aria-hidden />
                          {!bossSpec.isActive
                            ? 'รอเปิดกิจกรรม'
                            : skillCdMs > 0
                              ? `สกิล ${(skillCdMs / 1000).toFixed(1)}s`
                              : 'ใช้สกิลโจมตี!'}
                        </span>
                      </PxButton>
                      <PxButton
                        variant="secondary"
                        disabled={(!bossSpec.isActive && !isGmDev) || busy}
                        onClick={handleSummonWorldBossOnMap}
                      >
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5 text-amber-300" aria-hidden />
                          ปะทะบอสโลกบนแมพ
                        </span>
                      </PxButton>
                    </div>
                  </div>
                </div>
              </div>

              {isGmDev && (
                <div className="space-y-2 border border-gold/50 bg-gold/10 p-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-gold">เครื่องมือ GM · เรียกบอสกิจกรรมเวิลด์บอส (ทดสอบ)</span>
                    <span className="text-[10px] text-amber-200">
                      {bossSpec.isTestMode ? 'กำลังเปิดโหมดทดสอบทั้งเซิร์ฟ' : 'เรียกเทสได้ทุกเวลาโดยไม่ต้องรอ 20:00 น.'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <select
                      value={gmTestBossId}
                      onChange={(e) => setGmTestBossId(e.target.value)}
                      className="min-w-0 flex-1 border border-border bg-background px-2 py-1 text-xs text-foreground"
                    >
                      {WORLD_BOSS_CATALOG.map((wb) => (
                        <option key={wb.bossId} value={wb.bossId}>
                          {wb.name} (Lv.{wb.level})
                        </option>
                      ))}
                    </select>
                    <select
                      value={gmTestDurationMin}
                      onChange={(e) => setGmTestDurationMin(Number(e.target.value) || 30)}
                      className="border border-border bg-background px-2 py-1 text-xs text-foreground"
                    >
                      <option value={15}>15 นาที</option>
                      <option value={30}>30 นาที</option>
                      <option value={60}>60 นาที</option>
                    </select>
                    <PxButton
                      variant="primary"
                      disabled={busy}
                      onClick={() => void handleGmSummonTestWorldBoss(false)}
                    >
                      เปิดบอสเทสทั้งเซิร์ฟ
                    </PxButton>
                    <PxButton
                      variant="accent"
                      disabled={busy}
                      onClick={() => void handleGmSummonTestWorldBoss(true)}
                    >
                      เรียกเทส + ลงแมพ
                    </PxButton>
                    {bossSpec.isTestMode && (
                      <PxButton
                        variant="danger"
                        disabled={busy}
                        onClick={() => void handleGmEndTestWorldBoss()}
                      >
                        ปิดโหมดเทส
                      </PxButton>
                    )}
                  </div>
                </div>
              )}

              {worldBoss && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold tabular-nums">
                    <span className="text-rose-300">HP เวิลด์บอส</span>
                    <span>
                      {formatNum(worldBoss.currentHp)} / {formatNum(worldBoss.maxHp)}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden border border-border bg-muted">
                    <div
                      className="h-full bg-rose-500 transition-[width]"
                      style={{
                        width: `${Math.max(0, Math.round((worldBoss.currentHp / Math.max(1, worldBoss.maxHp)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5 border-t border-border/60 pt-2">
                <p className="text-xs font-bold text-foreground">รางวัลตามยอดดาเมจสะสมรอบนี้</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {bossSpec.milestones.map((ms) => {
                    const claimed = ext.claimedWorldBossMilestones.includes(ms.id)
                    const reached = ext.worldBossDamage >= ms.damage
                    return (
                      <div
                        key={ms.id}
                        className="flex items-center justify-between gap-2 border border-border/70 bg-background/80 p-2 text-[11px] tabular-nums"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-amber-300">{formatNum(ms.damage)} DMG</p>
                          <p className="text-[10px] leading-tight text-muted-foreground">
                            +{formatNum(ms.gold)} G · +{ms.diamonds} เพชร · หิน x{ms.stones}
                          </p>
                        </div>
                        <PxButton
                          variant={claimed ? 'secondary' : 'primary'}
                          disabled={claimed || !reached}
                          className="shrink-0 whitespace-nowrap"
                          onClick={() => {
                            const res = claimWorldBossMilestoneAction(ms.id)
                            setNotice(res.message)
                          }}
                        >
                          {claimed ? 'รับแล้ว' : reached ? 'รับรางวัล' : 'ยังไม่ถึง'}
                        </PxButton>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3 border border-border/80 bg-background/60 p-3">
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <Crown className="size-3.5" aria-hidden /> อันดับดาเมจสูงสุดรอบนี้
                </h3>
                {!worldBoss || worldBoss.contributions.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">ยังไม่มีผู้เปิดฉากโจมตี — เป็นคนแรกที่ได้ขึ้นตารางเลย!</p>
                ) : (
                  <div className="mt-1.5 space-y-1">
                    {worldBoss.contributions.slice(0, 6).map((c, idx) => (
                      <div
                        key={c.userId}
                        className="flex items-center justify-between border border-border/50 bg-background/80 px-2 py-1 text-xs tabular-nums"
                      >
                        <span className="truncate">
                          #{idx + 1} {c.name} <span className="text-muted-foreground">({JOBS[normalizeJobId(c.jobId)]?.name ?? c.jobId})</span>
                        </span>
                        <span className="font-bold text-amber-300">{formatNum(c.damage)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border/60 pt-2">
                <h4 className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Clock className="size-3.5" aria-hidden /> ตารางบอสกิจกรรมเวิลด์บอส (จันทร์·พุธ·ศุกร์ 20:00 น.)
                </h4>
                <div className="mt-1.5 space-y-1">
                  {wbSchedule.map((slot) => {
                    const elem = ELEMENT_META[slot.boss.element]
                    const waitHours = Math.floor(slot.startsInSec / 3600)
                    const waitDays = Math.floor(waitHours / 24)
                    const remHours = waitHours % 24
                    const waitLabel =
                      waitDays > 0
                        ? `อีก ${waitDays} วัน ${remHours} ชม.`
                        : waitHours > 0
                          ? `อีก ${waitHours} ชม. ${Math.floor((slot.startsInSec % 3600) / 60)} น.`
                          : `อีก ${Math.max(1, Math.ceil(slot.startsInSec / 60))} นาที`
                    return (
                      <div
                        key={slot.cycleKey}
                        className={`flex items-center justify-between gap-2 border px-2 py-1 text-[11px] tabular-nums ${
                          slot.isCurrent ? 'border-rose-400/60 bg-rose-500/10' : 'border-border/50 bg-background/80'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="grid size-8 shrink-0 place-items-center border border-border/50 bg-[#0b1024]">
                            <SpriteModelCanvas
                              mode="monster"
                              id={slot.boss.monsterId}
                              action="idle"
                              dir="down"
                              size={30}
                              showAura={false}
                              showShadow={false}
                              label={`ไอคอน ${slot.boss.name}`}
                            />
                          </div>
                          <span className="truncate">
                            <strong className="text-foreground">{slot.slotLabel}</strong> · {slot.boss.name}
                          </span>
                        </div>
                        <span className="shrink-0 text-[10px]" style={{ color: elem.color }}>
                          {slot.boss.isTestMode
                            ? 'GM Test เปิดอยู่'
                            : slot.isCurrent
                              ? 'กำลังเปิดศึก!'
                              : waitLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Shared Field Boss Section */}
          <div className="space-y-2.5 border border-amber-400/50 bg-amber-500/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                  <MapPin className="size-4" aria-hidden /> ฟิลด์บอสประจำแมพ (Shared Field Boss)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  บอสประจำโซนที่ผู้เล่นทุกคนแชร์ HP ร่วมกัน (แมพปัจจุบันของคุณ: {p.mapId})
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {FIELD_MAP_OPTIONS.map((opt) => (
                  <PxButton
                    key={opt.id}
                    variant={selectedFieldMap === opt.id ? 'accent' : 'secondary'}
                    className="px-2 py-1 text-[10px]"
                    onClick={() => setSelectedFieldMap(opt.id)}
                  >
                    {opt.label}
                  </PxButton>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
              <div className="space-y-2 border border-border/70 bg-background/70 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-16 shrink-0 place-items-center border border-amber-400/50 bg-[#0b1024]">
                      <SpriteModelCanvas
                        mode="monster"
                        id={FIELD_BOSS_MONSTER_IDS[selectedFieldMap]}
                        action="idle"
                        dir="down"
                        size={60}
                        label={`โมเดล ${fieldBossSpec.name}`}
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-bold text-foreground">{fieldBossSpec.name}</p>
                        <span
                          className="border border-border/60 px-1.5 py-0.5 text-[10px] font-bold"
                          style={{ color: fieldBossElem.color, background: fieldBossElem.bg }}
                        >
                          {fieldBossElem.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        รางวัลโค่นล้ม: +{formatNum(fieldBossSpec.rewardGold)} G · +{fieldBossSpec.rewardDiamonds} เพชร · หิน x{fieldBossSpec.rewardStones}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <PxButton
                      disabled={fieldCdMs > 0 || busy || fieldRespawnSec > 0}
                      onClick={handleAttackFieldBoss}
                    >
                      <span className="flex items-center gap-1">
                        <Swords className="size-3.5" aria-hidden />
                        {fieldRespawnSec > 0
                          ? `เกิดใหม่ ${fieldRespawnSec}s`
                          : fieldCdMs > 0
                            ? `รอ ${(fieldCdMs / 1000).toFixed(1)}s`
                            : 'โจมตีฟิลด์บอส'}
                      </span>
                    </PxButton>
                    {fieldBoss && fieldBoss.currentHp === 0 && (
                      <PxButton variant="accent" disabled={busy} onClick={handleClaimFieldBoss}>
                        <span className="flex items-center gap-1">
                          <Gift className="size-3.5" aria-hidden /> รับรางวัล
                        </span>
                      </PxButton>
                    )}
                  </div>
                </div>

                {fieldBoss && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold tabular-nums">
                      <span className="text-amber-300">
                        HP ฟิลด์บอส · พิชิตแล้ว {fieldBoss.clearCount} รอบ
                      </span>
                      <span>
                        {formatNum(fieldBoss.currentHp)} / {formatNum(fieldBoss.maxHp)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden border border-border bg-muted">
                      <div
                        className="h-full bg-amber-400 transition-[width]"
                        style={{
                          width: `${Math.max(0, Math.round((fieldBoss.currentHp / Math.max(1, fieldBoss.maxHp)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1 border border-border/70 bg-background/70 p-2.5 text-xs">
                <p className="font-bold text-foreground">ผู้ร่วมโจมตีฟิลด์บอส ({fieldContributors.length})</p>
                {fieldContributors.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">ยังไม่มีผู้โจมตีบอสในโซนนี้</p>
                ) : (
                  <div className="space-y-1 tabular-nums">
                    {fieldContributors.map((c, idx) => (
                      <div key={c.uid} className="flex justify-between border border-border/40 bg-background/80 px-2 py-1 text-[11px]">
                        <span className="truncate">
                          #{idx + 1} {c.name}
                        </span>
                        <span className="font-bold text-amber-300">{formatNum(c.damage)} DMG</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'ranking' && (
        <div className="space-y-2 border border-border/80 bg-background/60 p-3">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
              <Trophy className="size-4" aria-hidden /> อันดับสมาคมกิลด์สูงสุดในเซิร์ฟเวอร์
            </h3>
            <span className="text-[11px] text-muted-foreground">จัดอันดับตามเลเวลและยอดบริจาครวม</span>
          </div>
          {sortedGuilds.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">ยังไม่มีข้อมูลกิลด์ในขณะนี้</p>
          ) : (
            <div className="space-y-1.5">
              {sortedGuilds.map((gd, idx) => {
                const isMine = ext.guildId === gd.guildId
                return (
                  <div
                    key={gd.guildId}
                    className={`flex flex-wrap items-center justify-between gap-2 border p-2.5 text-xs tabular-nums ${
                      isMine ? 'border-primary bg-primary/10' : 'border-border/70 bg-background/80'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex w-7 shrink-0 items-center justify-center font-bold text-amber-300">
                        {idx === 0 ? <Crown className="size-4" aria-hidden /> : `#${idx + 1}`}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground">
                          [{gd.tag}] {gd.name} {isMine ? '(กิลด์ของคุณ)' : ''}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          หัวหน้า: {gd.leaderName} · สมาชิก {gd.memberCount}/30 · บริจาครวม {formatNum(gd.totalDonatedGold)} G
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-bold text-primary">Lv.{gd.level}</span>
                      {!ext.guildId && (
                        <PxButton disabled={busy} onClick={() => handleJoinGuild(gd.guildId)}>
                          เข้าร่วม
                        </PxButton>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'guild' && (
        <div className="space-y-3">
          {ext.guildId ? (
            <div className="space-y-3 border border-primary/50 bg-primary/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-primary">
                    [{ext.guildTag}] {ext.guildName} · Lv.{myGuild?.level ?? ext.guildLevel}
                  </h3>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    สมาชิก {myGuild?.memberCount ?? 1}/30 · บริจาคสะสมของคุณ: {formatNum(ext.guildContribution)} G
                  </p>
                </div>
                <PxButton
                  variant="danger"
                  onClick={async () => {
                    if (!ext.guildId) return
                    await leaveGuildOnline(ext.guildId)
                    syncGuildStateAction({ guildId: null, guildName: null, guildTag: null, guildLevel: 1 })
                    setNotice('ออกจากกิลด์แล้ว')
                    await refreshData()
                  }}
                >
                  ออกจากกิลด์
                </PxButton>
              </div>

              {guildBuffs && (
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 tabular-nums">
                  <div className="border border-border/60 bg-background/70 p-2">
                    <span className="text-muted-foreground">บัฟ ATK กิลด์</span>
                    <p className="font-bold text-rose-300">+{guildBuffs.atkPct}%</p>
                  </div>
                  <div className="border border-border/60 bg-background/70 p-2">
                    <span className="text-muted-foreground">บัฟ DEF กิลด์</span>
                    <p className="font-bold text-sky-300">+{guildBuffs.defPct}%</p>
                  </div>
                  <div className="border border-border/60 bg-background/70 p-2">
                    <span className="text-muted-foreground">โบนัส EXP</span>
                    <p className="font-bold text-purple-300">+{guildBuffs.expPct}%</p>
                  </div>
                  <div className="border border-border/60 bg-background/70 p-2">
                    <span className="text-muted-foreground">โบนัสดรอป Gold</span>
                    <p className="font-bold text-gold">+{guildBuffs.goldPct}%</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  EXP กิลด์: {formatNum(myGuild?.exp ?? 0)} / {formatNum(guildExpToNext(myGuild?.level ?? ext.guildLevel))}
                </span>
                <div className="flex gap-2">
                  <PxButton disabled={busy} onClick={() => handleDonate(200)}>
                    <span className="flex items-center gap-1">
                      <Coins className="size-3.5" aria-hidden /> บริจาค 200 G
                    </span>
                  </PxButton>
                  <PxButton disabled={busy} onClick={() => handleDonate(1000)}>
                    <span className="flex items-center gap-1">
                      <Shield className="size-3.5" aria-hidden /> บริจาค 1,000 G
                    </span>
                  </PxButton>
                </div>
              </div>

              {/* Co-op Guild Raid Boss + Real-Time Guild Chat */}
              <div className="grid gap-3 border-t border-border/70 pt-3 md:grid-cols-2">
                <div className="space-y-2 border border-rose-400/40 bg-background/70 p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="flex items-center gap-1.5 font-bold text-rose-300">
                      <Flame className="size-3.5" aria-hidden /> เรดบอสกิลด์ (Co-op)
                    </h4>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      พิชิตแล้ว {guildRaid?.clears ?? 0} รอบ
                    </span>
                  </div>
                  {guildRaid && (
                    <>
                      <p className="font-bold text-foreground">
                        {guildRaid.bossName} · Lv.{guildRaid.level}
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] tabular-nums">
                          <span>HP บอสกิลด์</span>
                          <span>
                            {formatNum(guildRaid.currentHp)} / {formatNum(guildRaid.maxHp)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden border border-border bg-muted">
                          <div
                            className="h-full bg-rose-500 transition-[width]"
                            style={{
                              width: `${Math.max(0, Math.round((guildRaid.currentHp / Math.max(1, guildRaid.maxHp)) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] text-muted-foreground">โจมตีล่าสุด: {guildRaid.lastHitter}</span>
                        <PxButton
                          variant="danger"
                          disabled={busy || !ext.guildId}
                          onClick={async () => {
                            if (!ext.guildId || busy) return
                            setBusy(true)
                            const s = getStats(p)
                            const dmg = Math.max(60, Math.round(s.atk * 2.8 + (Math.random() < s.crit ? s.atk : 0)))
                            const res = await attackGuildRaid(ext.guildId, { playerName: p.name, damage: dmg })
                            setGuildRaid(res.state)
                            if (res.defeated) {
                              p.gold += res.bonusGold
                              addItem('enhance_stone', res.bonusStones)
                              saveGame()
                              setNotice(
                                `ปราบบอสกิลด์สำเร็จ! ได้รับ +${formatNum(res.bonusGold)} G และหินตีบวก x${res.bonusStones}`,
                              )
                            } else {
                              setNotice(`โจมตีเรดบอสกิลด์ ทำดาเมจ ${formatNum(dmg)}!`)
                            }
                            setBusy(false)
                          }}
                        >
                          <span className="flex items-center gap-1">
                            <Swords className="size-3" aria-hidden /> ตีบอสกิลด์
                          </span>
                        </PxButton>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col justify-between gap-2 border border-border/70 bg-background/70 p-2.5 text-xs">
                  <h4 className="flex items-center gap-1.5 font-bold text-primary">
                    <MessageSquare className="size-3.5" aria-hidden /> แชทกิลด์แบบเรียลไทม์
                  </h4>
                  <div
                    ref={guildChatListRef}
                    className="max-h-28 min-h-[4.5rem] space-y-1 overflow-y-auto border border-border/50 bg-background/60 p-2 text-[11px]"
                  >
                    {guildChatMessages.length === 0 ? (
                      <p className="text-muted-foreground">ยังไม่มีข้อความในกิลด์ — ทักทายเพื่อนร่วมกิลด์เลย!</p>
                    ) : (
                      guildChatMessages.map((msg) => {
                        const isFresh = Boolean(guildFreshKeys[msg.messageId])
                        return (
                          <motion.p
                            key={msg.messageId}
                            initial={isFresh ? { opacity: 0, x: -8, y: 4 } : false}
                            animate={{ opacity: 1, x: 0, y: 0 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            className={`rounded px-1 -mx-1 leading-snug transition-colors duration-700 ${
                              isFresh ? 'bg-sky-400/18' : ''
                            }`}
                          >
                            <strong className="text-amber-300">{msg.senderName}</strong>:{' '}
                            <span className="text-foreground">{msg.text}</span>
                          </motion.p>
                        )
                      })
                    )}
                  </div>
                  <ChatEmojiPicker
                    open={guildEmojiOpen}
                    onSelect={(emoji) => {
                      let nextCursorPos: number | null = null
                      setGuildChatInput((prev) => {
                        const input = guildChatInputRef.current
                        const domStart = input && document.activeElement === input ? input.selectionStart : null
                        const domEnd = input && document.activeElement === input ? input.selectionEnd : null
                        const start = domStart ?? guildCursorPosRef.current?.start ?? prev.length
                        const end = domEnd ?? guildCursorPosRef.current?.end ?? start
                        const res = insertEmojiAtCursor(prev, emoji, start, end, 140)
                        if (!res.inserted) return prev
                        nextCursorPos = res.nextCursor
                        guildCursorPosRef.current = { start: res.nextCursor, end: res.nextCursor }
                        return res.text
                      })
                      window.requestAnimationFrame(() => {
                        const target = guildChatInputRef.current
                        if (!target) return
                        target.focus()
                        if (nextCursorPos !== null) {
                          target.setSelectionRange(nextCursorPos, nextCursorPos)
                        }
                      })
                    }}
                    onClose={() => setGuildEmojiOpen(false)}
                    className="rounded border border-border/60"
                  />
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault()
                      if (!ext.guildId || !guildChatInput.trim()) return
                      const text = guildChatInput.trim()
                      setGuildChatInput('')
                      guildCursorPosRef.current = null
                      setGuildEmojiOpen(false)
                      await sendGuildMessage(ext.guildId, {
                        senderName: p.name,
                        senderGameUid: p.gameUid ?? '1000',
                        jobId: p.jobId,
                        text,
                      })
                    }}
                    className="flex gap-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => setGuildEmojiOpen((open) => !open)}
                      aria-expanded={guildEmojiOpen}
                      aria-label={guildEmojiOpen ? 'ปิดคลังอิโมจิแชทกิลด์' : 'เปิดคลังอิโมจิแชทกิลด์'}
                      className="grid shrink-0 cursor-pointer place-items-center rounded border border-border/70 bg-background/80 px-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-amber-300"
                    >
                      <Smile className="size-3.5" aria-hidden />
                    </button>
                    <input
                      ref={guildChatInputRef}
                      value={guildChatInput}
                      onChange={(e) => {
                        setGuildChatInput(e.target.value)
                        if (typeof e.target.selectionStart === 'number' && typeof e.target.selectionEnd === 'number') {
                          guildCursorPosRef.current = { start: e.target.selectionStart, end: e.target.selectionEnd }
                        }
                      }}
                      onSelect={() => {
                        const input = guildChatInputRef.current
                        if (input && typeof input.selectionStart === 'number' && typeof input.selectionEnd === 'number') {
                          guildCursorPosRef.current = { start: input.selectionStart, end: input.selectionEnd }
                        }
                      }}
                      maxLength={140}
                      placeholder="พิมพ์ข้อความคุยกับกิลด์..."
                      className="pixel-input min-w-0 flex-1 px-2 py-1 text-xs"
                    />
                    <PxButton type="submit" aria-label="ส่งข้อความแชทกิลด์" disabled={!guildChatInput.trim()}>
                      <Send className="size-3.5" aria-hidden />
                    </PxButton>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-[1fr_1.3fr]">
              <div className="space-y-2 border border-border/80 bg-background/60 p-3">
                <h3 className="text-sm font-bold text-primary">ก่อตั้งกิลด์ใหม่</h3>
                <input
                  value={guildNameInput}
                  onChange={(e) => setGuildNameInput(e.target.value)}
                  maxLength={24}
                  placeholder="ชื่อกิลด์ (2-24 ตัวอักษร)"
                  className="pixel-input w-full px-2.5 py-1.5 text-xs"
                />
                <input
                  value={guildTagInput}
                  onChange={(e) => setGuildTagInput(e.target.value.toUpperCase())}
                  maxLength={5}
                  placeholder="แท็กย่อ เช่น STAR"
                  className="pixel-input w-full px-2.5 py-1.5 text-xs uppercase"
                />
                <PxButton disabled={busy || guildNameInput.trim().length < 2} onClick={handleCreateGuild}>
                  สร้างกิลด์ (ฟรี)
                </PxButton>
              </div>

              <div className="space-y-2 border border-border/80 bg-background/60 p-3">
                <h3 className="text-sm font-bold text-foreground">รายชื่อกิลด์ที่เปิดรับ</h3>
                <div className="space-y-1.5">
                  {guilds.map((gd) => (
                    <div
                      key={gd.guildId}
                      className="flex items-center justify-between gap-2 border border-border/70 bg-background/80 p-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground">
                          [{gd.tag}] {gd.name} · Lv.{gd.level}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">{gd.notice}</p>
                      </div>
                      <PxButton disabled={busy} onClick={() => handleJoinGuild(gd.guildId)}>
                        เข้าร่วม
                      </PxButton>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PanelFrame>
  )
}
