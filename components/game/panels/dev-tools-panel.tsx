'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownToLine,
  Ban,
  CheckCircle2,
  Compass,
  Copy,
  Crown,
  Flag,
  Flame,
  Gem,
  Gift,
  Heart,
  Mail,
  Megaphone,
  Navigation,
  Newspaper,
  PackagePlus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Shield,
  ShieldAlert,
  Skull,
  Sparkles,
  Swords,
  Terminal,
  Trash2,
  TrendingUp,
  UserX,
  VolumeX,
  XCircle,
  Zap,
} from 'lucide-react'
import { auth } from '@/lib/firebase/client'
import { listPlayerReports, type PlayerReportRecord } from '@/lib/firebase/mmo-online'
import {
  createOrUpdateRedeemCodeForGm,
  deleteRedeemCodeForGm,
  listRedeemCodesForGm,
  toggleRedeemCodeActiveForGm,
  type RedeemCodeRecord,
} from '@/lib/firebase/redeem-codes'
import firebaseConfig from '../../../firebase-applet-config.json'
import { ITEMS, JOBS, MAX_LEVEL, MAX_PLUS, MONSTERS, getJobSlug, normalizeJobId } from '@/lib/game/data'
import { devCompleteAllDailyMissions, devRerollDailyMissions } from '@/lib/game/daily-missions'
import {
  castGmSkill,
  closePanel,
  devAddDiamonds,
  devAddGold,
  devAddPoints,
  devBroadcastAnnouncement,
  devChangeJob,
  devGiveItem,
  devHealFull,
  devKillAllMonsters,
  devSetLevel,
  devSetSpeed,
  devSetTowerFloor,
  devSpawnMonster,
  devTeleport,
  getActiveCharacterSlot,
  getActiveServerRates,
  getStats,
  gmBroadcastGiftAll,
  gmKickPlayer,
  gmMutePlayer,
  gmSendSingleGiftMail,
  gmSetServerRatesAction,
  gmSummonPlayer,
  gmUnmutePlayer,
  gmWarpToPlayer,
  isCurrentAccountGm,
  openPanel,
  saveGame,
} from '@/lib/game/engine'
import { MAPS, MAP_ORDER, TILE } from '@/lib/game/maps'
import { GM_EMAIL, PERMANENT_GM_GAME_UID } from '@/lib/game/permissions'
import { formatServerRateSummary, isServerRateBoostActive } from '@/lib/game/server-rates'
import { createBan } from '@/lib/game/social'
import { useGame } from '@/lib/game/use-game'
import { checkForGameUpdates, openChangelogModal, useVersionUpdate } from '@/lib/game/use-version-update'
import { GAME_VERSION, type VersionPayload } from '@/lib/game/version'
import { formatNum } from '../format'
import { PanelFrame, PxButton } from './panels'

type DevTab = 'player' | 'world' | 'items' | 'mod' | 'system'

interface ServerSystemStatus {
  firebaseProjectId: string
  firestoreDatabaseId: string
  topup: {
    stripeConfigured: boolean
    stripeWebhookConfigured: boolean
    slipOkConfigured: boolean
    easySlipConfigured: boolean
    promptPayConfigured: boolean
    merchantQrReady: boolean
    premiumSecretConfigured: boolean
    appUrlConfigured: boolean
  }
}

export function DevToolsPanel() {
  const g = useGame()
  const p = g.p
  const [tab, setTab] = useState<DevTab>('player')
  const [levelInput, setLevelInput] = useState(String(p?.level ?? 1))
  const [goldInput, setGoldInput] = useState('100000')
  const [gemInput, setGemInput] = useState('10000')
  const [towerInput, setTowerInput] = useState(String(p?.towerState?.highestFloor ?? 0))
  const [selectedMonster, setSelectedMonster] = useState(() => Object.keys(MONSTERS)[0] ?? 'meadow_blob')
  const [spawnCount, setSpawnCount] = useState(3)
  const [itemQuery, setItemQuery] = useState('')
  const [itemQty, setItemQty] = useState(1)
  const [itemPlus, setItemPlus] = useState(0)
  const [announceText, setAnnounceText] = useState('')
  const [targetPlayerQuery, setTargetPlayerQuery] = useState('')
  const [statusMsg, setStatusMsg] = useState('')

  // GM Mail & Compensation state
  const [giftMode, setGiftMode] = useState<'all' | 'single'>('all')
  const [giftTargetQuery, setGiftTargetQuery] = useState('')
  const [giftSubject, setGiftSubject] = useState('ชดเชยเซิร์ฟเวอร์จากทีมงาน GM')
  const [giftBody, setGiftBody] = useState('ขอบคุณทุกท่านที่ร่วมผจญภัยใน Pixel Quest!')
  const [giftGold, setGiftGold] = useState('5000')
  const [giftDiamonds, setGiftDiamonds] = useState('30')
  const [giftItemId, setGiftItemId] = useState<string>('')
  const [giftItemQty, setGiftItemQty] = useState('1')
  const [giftItemPlus, setGiftItemPlus] = useState('0')
  const [giftBusy, setGiftBusy] = useState(false)

  // GM Moderation & Reports state
  const [modTargetQuery, setModTargetQuery] = useState('')
  const [modMuteMinutes, setModMuteMinutes] = useState(15)
  const [modReason, setModReason] = useState('')
  const [modBusy, setModBusy] = useState(false)
  const [reports, setReports] = useState<PlayerReportRecord[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState('')

  // System Readiness Diagnostics state
  const [sysStatus, setSysStatus] = useState<ServerSystemStatus | null>(null)
  const [sysLoading, setSysLoading] = useState(false)

  const versionUpdate = useVersionUpdate()

  // GM Redeem Code Manager state
  const [redeemCodes, setRedeemCodes] = useState<RedeemCodeRecord[]>([])
  const [rcCode, setRcCode] = useState('')
  const [rcLabel, setRcLabel] = useState('โค้ดของขวัญ GM')
  const [rcGold, setRcGold] = useState('10000')
  const [rcDiamonds, setRcDiamonds] = useState('50')
  const [rcVipExp, setRcVipExp] = useState('0')
  const [rcItemId, setRcItemId] = useState('')
  const [rcItemFilter, setRcItemFilter] = useState('')
  const [rcItemQty, setRcItemQty] = useState('1')
  const [rcItemPlus, setRcItemPlus] = useState('0')
  const [rcMaxUses, setRcMaxUses] = useState('100')
  const [rcExpiresHours, setRcExpiresHours] = useState('168')
  const [rcBusy, setRcBusy] = useState(false)

  // Server EXP / Drop Multiplier state
  const [rateExpMul, setRateExpMul] = useState('2')
  const [rateDropMul, setRateDropMul] = useState('2')
  const [rateDurationMin, setRateDurationMin] = useState('60')
  const [rateLabel, setRateLabel] = useState('กิจกรรมคูณเซิร์ฟเวอร์')
  const [rateBusy, setRateBusy] = useState(false)

  // Live Patch Notes Publisher state
  const [pnVersion, setPnVersion] = useState('1.4.3')
  const [pnDate, setPnDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [pnTitle, setPnTitle] = useState('')
  const [pnUpdates, setPnUpdates] = useState('')
  const [pnImprovements, setPnImprovements] = useState('')
  const [pnBugFixes, setPnBugFixes] = useState('')
  const [pnAnnounce, setPnAnnounce] = useState(true)
  const [pnBusy, setPnBusy] = useState(false)
  const [customPatchVersions, setCustomPatchVersions] = useState<string[]>([])

  const allItems = useMemo(() => {
    const q = itemQuery.trim().toLowerCase()
    const list = Object.values(ITEMS)
    if (!q) return list.slice(0, 36)
    return list.filter((it) => it.id.toLowerCase().includes(q) || it.name.toLowerCase().includes(q)).slice(0, 48)
  }, [itemQuery])

  const giftItemOptions = useMemo(() => Object.values(ITEMS), [])

  const filteredRedeemItemOptions = useMemo(() => {
    const q = rcItemFilter.trim().toLowerCase()
    if (!q) return giftItemOptions
    return giftItemOptions.filter(
      (it) => it.id === rcItemId || it.name.toLowerCase().includes(q) || it.id.toLowerCase().includes(q),
    )
  }, [giftItemOptions, rcItemFilter, rcItemId])

  const loadReports = useCallback(async () => {
    setReportsLoading(true)
    setReportsError('')
    try {
      const res = await listPlayerReports(40)
      if (res.ok) {
        setReports(res.reports)
      } else {
        setReportsError(res.error ?? 'ไม่สามารถโหลดรายงานผู้เล่นได้')
      }
    } finally {
      setReportsLoading(false)
    }
  }, [])

  const loadRedeemCodes = useCallback(async () => {
    try {
      const list = await listRedeemCodesForGm(40)
      setRedeemCodes(list)
    } catch {
      // Non-blocking redeem list fetch
    }
  }, [])

  const loadSystemStatus = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    setSysLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/gm/system-status', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const json = (await res.json().catch(() => null)) as (ServerSystemStatus & { ok?: boolean }) | null
      if (res.ok && json?.ok) {
        setSysStatus(json)
      }
    } catch {
      // Non-blocking diagnostics refresh
    } finally {
      setSysLoading(false)
    }
  }, [])

  const loadVersionMeta = useCallback(async () => {
    try {
      const res = await fetch(`/api/version?t=${Date.now()}`, { cache: 'no-store' })
      const json = (await res.json().catch(() => null)) as VersionPayload | null
      if (res.ok && json && Array.isArray(json.customVersions)) {
        setCustomPatchVersions(json.customVersions)
      }
    } catch {
      // Non-blocking patch version fetch
    }
  }, [])

  useEffect(() => {
    if (tab === 'mod') {
      void loadReports()
      void loadRedeemCodes()
    } else if (tab === 'system') {
      void loadSystemStatus()
      void loadVersionMeta()
    }
  }, [tab, loadReports, loadRedeemCodes, loadSystemStatus, loadVersionMeta])

  if (!p || !p.gm || !isCurrentAccountGm()) {
    return (
      <PanelFrame title="DEV CONSOLE" subtitle="ไม่มีสิทธิ์เข้าถึง">
        <div className="space-y-3 py-6 text-center text-xs">
          <p className="font-semibold text-destructive">
            ระบบ Dev สงวนสิทธิ์เฉพาะบัญชี GM {GM_EMAIL} (UID {PERMANENT_GM_GAME_UID}) เท่านั้น
          </p>
          <PxButton variant="secondary" onClick={closePanel}>
            ปิดหน้าต่าง
          </PxButton>
        </div>
      </PanelFrame>
    )
  }

  const s = getStats(p)
  const fbUser = auth.currentUser

  const handleSendGiftMail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (giftBusy) return
    setGiftBusy(true)
    try {
      const payload = {
        subject: giftSubject,
        body: giftBody,
        gold: Math.max(0, Math.floor(Number(giftGold) || 0)),
        diamonds: Math.max(0, Math.floor(Number(giftDiamonds) || 0)),
        itemId: giftItemId || null,
        qty: giftItemId ? Math.max(1, Math.min(999, Math.floor(Number(giftItemQty) || 1))) : 0,
        plus: giftItemId ? Math.max(0, Math.min(MAX_PLUS, Math.floor(Number(giftItemPlus) || 0))) : 0,
      }
      const res =
        giftMode === 'all'
          ? await gmBroadcastGiftAll(payload)
          : await gmSendSingleGiftMail({
              ...payload,
              targetQuery: giftTargetQuery,
            })
      setStatusMsg(res.message)
    } finally {
      setGiftBusy(false)
    }
  }

  const runModAction = async (fn: () => Promise<{ message: string }>) => {
    if (modBusy) return
    setModBusy(true)
    try {
      const res = await fn()
      setStatusMsg(res.message)
    } finally {
      setModBusy(false)
    }
  }

  return (
    <PanelFrame
      title={`DEV CONSOLE · UID ${PERMANENT_GM_GAME_UID}`}
      subtitle={`บัญชีผู้พัฒนาหลัก: ${fbUser?.email ?? GM_EMAIL} • สิทธิ์ GM สูงสุด`}
    >
      <div className="space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-amber-400/50 bg-amber-400/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <Crown className="size-4 text-amber-300" aria-hidden />
            <div>
              <p className="font-bold text-amber-300">GM / DEV MODE ACTIVE</p>
              <p className="text-[11px] text-muted-foreground">
                UID: <span className="font-mono font-bold text-foreground">{PERMANENT_GM_GAME_UID}</span> • Lv.{p.level}{' '}
                {JOBS[normalizeJobId(p.jobId)]?.name ?? p.jobId}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <PxButton variant={p.god ? 'accent' : 'secondary'} onClick={() => castGmSkill('immortal')}>
              <Shield className="mr-1 inline size-3.5" aria-hidden />
              อมตะ: {p.god ? 'ON' : 'OFF'}
            </PxButton>
            <PxButton variant={p.invisible ? 'accent' : 'secondary'} onClick={() => castGmSkill('invisible')}>
              ล่องหน: {p.invisible ? 'ON' : 'OFF'}
            </PxButton>
            <PxButton variant="primary" onClick={devHealFull}>
              <Heart className="mr-1 inline size-3.5" aria-hidden />
              ฟื้นฟูเต็ม
            </PxButton>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {(
            [
              ['player', 'ตัวละคร', Swords],
              ['world', 'แมพ/มอน', Compass],
              ['items', 'ไอเทม/ภารกิจ', PackagePlus],
              ['mod', 'จดหมาย/ดูแล', ShieldAlert],
              ['system', 'ระบบ/ประกาศ', Terminal],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`pixel-btn flex items-center justify-center gap-1 px-2 py-2 text-[11px] font-semibold ${
                tab === id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-3.5" aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {statusMsg && (
          <p className="border border-accent/50 bg-accent/10 px-2.5 py-1.5 text-[11px] text-accent" role="status">
            {statusMsg}
          </p>
        )}

        {tab === 'player' && (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
                <p className="font-semibold text-primary">เลเวล & ความเร็ว</p>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={MAX_LEVEL}
                    value={levelInput}
                    onChange={(e) => setLevelInput(e.target.value)}
                    className="w-24 border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
                  />
                  <PxButton onClick={() => devSetLevel(Number(levelInput) || 1)}>ตั้งเลเวล</PxButton>
                  <PxButton variant="secondary" onClick={() => devSetLevel(p.level + 10)}>
                    +10
                  </PxButton>
                  <PxButton variant="accent" onClick={() => devSetLevel(MAX_LEVEL)}>
                    MAX
                  </PxButton>
                </div>
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="mr-1 text-[11px] text-muted-foreground">ความเร็ว:</span>
                  {[0.5, 1, 2, 3, 5].map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => devSetSpeed(sp)}
                      className={`border px-2 py-0.5 text-[10px] ${
                        p.speed === sp
                          ? 'border-primary bg-primary/25 font-bold text-primary'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      x{sp}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
                <p className="font-semibold text-primary">การเงิน & แต้มตัวละคร</p>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={goldInput}
                    onChange={(e) => setGoldInput(e.target.value)}
                    className="min-w-0 flex-1 border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
                  />
                  <PxButton onClick={() => devAddGold(Number(goldInput) || 0)}>+Gold</PxButton>
                  <PxButton variant="secondary" onClick={() => devAddGold(1_000_000)}>
                    +1M
                  </PxButton>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={gemInput}
                    onChange={(e) => setGemInput(e.target.value)}
                    className="min-w-0 flex-1 border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
                  />
                  <PxButton variant="accent" onClick={() => devAddDiamonds(Number(gemInput) || 0)}>
                    <Gem className="mr-1 inline size-3" aria-hidden />
                    +เพชร
                  </PxButton>
                </div>
                <div className="flex gap-1.5 pt-0.5">
                  <PxButton variant="secondary" onClick={() => devAddPoints(50, 0)}>
                    +50 สเตตัส
                  </PxButton>
                  <PxButton variant="secondary" onClick={() => devAddPoints(0, 50)}>
                    +50 แต้มสกิล
                  </PxButton>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
              <p className="font-semibold text-primary">เปลี่ยนอาชีพทันที ({Object.keys(JOBS).length} อาชีพ)</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {Object.values(JOBS).map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => devChangeJob(job.id)}
                    className={`border px-2 py-1.5 text-left text-[11px] transition-colors ${
                      p.jobId === job.id
                        ? 'border-primary bg-primary/20 font-bold text-primary'
                        : 'border-border bg-background/70 text-foreground hover:border-primary/60'
                    }`}
                  >
                    <span className="block truncate">{job.name}</span>
                    <span className="block text-[9px] text-muted-foreground">{getJobSlug(job.id)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'world' && (
          <div className="space-y-3">
            <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
              <p className="font-semibold text-primary">วาร์ปข้ามแผนที่</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {MAP_ORDER.map((id) => {
                  const m = MAPS[id]
                  if (!m) return null
                  return (
                    <PxButton
                      key={id}
                      variant={p.mapId === id ? 'accent' : 'secondary'}
                      onClick={() => devTeleport(id)}
                      className="text-left"
                    >
                      <span className="block truncate">{m.name}</span>
                      <span className="block text-[9px] opacity-75">{id}</span>
                    </PxButton>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
                <p className="font-semibold text-primary">เสกมอนสเตอร์ / บอสในแผนที่</p>
                <div className="flex gap-1.5">
                  <select
                    value={selectedMonster}
                    onChange={(e) => setSelectedMonster(e.target.value)}
                    className="min-w-0 flex-1 border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                  >
                    {Object.values(MONSTERS).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (Lv.{m.level}
                        {m.boss ? ' · BOSS' : ''})
                      </option>
                    ))}
                  </select>
                  <select
                    value={spawnCount}
                    onChange={(e) => setSpawnCount(Number(e.target.value))}
                    className="w-16 border border-border bg-background px-1.5 py-1.5 text-xs text-foreground"
                  >
                    <option value={1}>x1</option>
                    <option value={3}>x3</option>
                    <option value={5}>x5</option>
                    <option value={10}>x10</option>
                  </select>
                </div>
                <div className="flex gap-1.5">
                  <PxButton onClick={() => devSpawnMonster(selectedMonster, spawnCount)}>
                    <Flame className="mr-1 inline size-3.5" aria-hidden />
                    เสกมอนสเตอร์
                  </PxButton>
                  <PxButton variant="danger" onClick={devKillAllMonsters}>
                    <Skull className="mr-1 inline size-3.5" aria-hidden />
                    ฆ่าทั้งแมพ
                  </PxButton>
                </div>
              </div>

              <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
                <p className="font-semibold text-primary">หอคอยไต่ชั้น (Tower Dev)</p>
                <p className="text-[11px] text-muted-foreground">
                  ชั้นสูงสุดปัจจุบัน: {p.towerState?.highestFloor ?? 0}
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={towerInput}
                    onChange={(e) => setTowerInput(e.target.value)}
                    className="w-24 border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
                  />
                  <PxButton onClick={() => devSetTowerFloor(Number(towerInput) || 0)}>ตั้งชั้นหอคอย</PxButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'items' && (
          <div className="space-y-3">
            <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-primary">ระบบทดสอบภารกิจรายวัน (Daily Missions Dev)</p>
                <div className="flex gap-1.5">
                  <PxButton
                    variant="accent"
                    onClick={() =>
                      void devCompleteAllDailyMissions().then((res) => setStatusMsg(res.message))
                    }
                  >
                    <Zap className="mr-1 inline size-3.5" aria-hidden />
                    ทำภารกิจวันนี้ครบ 100%
                  </PxButton>
                  <PxButton
                    variant="secondary"
                    onClick={() =>
                      void devRerollDailyMissions().then((res) => setStatusMsg(res.message))
                    }
                  >
                    <RefreshCw className="mr-1 inline size-3.5" aria-hidden />
                    รีสุ่มภารกิจใหม่
                  </PxButton>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-primary">เสกไอเทมทุกชนิดในเกม</p>
                <div className="flex gap-1.5">
                  <PxButton variant="secondary" onClick={() => devGiveItem('enhance_stone', 100)}>
                    +100 หินตีบวก
                  </PxButton>
                  <PxButton variant="primary" onClick={() => openPanel('gm-summon')}>
                    <Sparkles className="mr-1 inline size-3.5" aria-hidden />
                    เปิดหน้าต่างของ GM
                  </PxButton>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <input
                  value={itemQuery}
                  onChange={(e) => setItemQuery(e.target.value)}
                  placeholder="ค้นหาชื่อไอเทม หรือ ID..."
                  className="min-w-0 flex-1 border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
                />
                <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  จำนวน:
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={itemQty}
                    onChange={(e) => setItemQty(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
                    className="w-14 border border-border bg-background px-1.5 py-1 text-foreground"
                  />
                </label>
                <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  บวก:
                  <input
                    type="number"
                    min={0}
                    max={MAX_PLUS}
                    value={itemPlus}
                    onChange={(e) => setItemPlus(Math.max(0, Math.min(MAX_PLUS, Number(e.target.value) || 0)))}
                    className="w-14 border border-border bg-background px-1.5 py-1 text-foreground"
                  />
                </label>
              </div>

              <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
                {allItems.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      const ok = devGiveItem(it.id, itemQty, itemPlus)
                      setStatusMsg(ok ? `เสก ${it.name} x${itemQty}${itemPlus ? ` +${itemPlus}` : ''} สำเร็จ` : 'กระเป๋าเต็ม')
                    }}
                    className="flex items-center justify-between gap-1 border border-border bg-background/80 px-2 py-1.5 text-left hover:border-primary"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-foreground">{it.name}</span>
                      <span className="block truncate font-mono text-[9px] text-muted-foreground">{it.id}</span>
                    </span>
                    <span className="shrink-0 text-[10px] text-primary">+เสก</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'mod' && (
          <div className="space-y-3">
            {/* Section A: GM Mail / Compensation & Server Gift Drop */}
            <form onSubmit={handleSendGiftMail} className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 font-semibold text-primary">
                  <Mail className="size-3.5" aria-hidden />
                  ส่งจดหมายของขวัญ / ชดเชยเข้ากล่องจดหมาย
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setGiftSubject('ชดเชยเซิร์ฟเวอร์จากทีมงาน GM')
                      setGiftBody('ขออภัยในความไม่สะดวก รับรางวัลชดเชยได้เลย!')
                      setGiftGold('5000')
                      setGiftDiamonds('30')
                      setGiftItemId('enhance_stone')
                      setGiftItemQty('5')
                      setGiftItemPlus('0')
                    }}
                    className="border border-amber-400/50 bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200 hover:bg-amber-400/25"
                  >
                    สูตรชดเชยด่วน
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGiftSubject('ของขวัญกิจกรรมพิเศษ Pixel Quest!')
                      setGiftBody('สุขสันต์วันพิเศษ ขอให้สนุกกับการผจญภัย!')
                      setGiftGold('10000')
                      setGiftDiamonds('50')
                      setGiftItemId('enhance_stone')
                      setGiftItemQty('10')
                      setGiftItemPlus('0')
                    }}
                    className="border border-cyan-400/50 bg-cyan-400/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-200 hover:bg-cyan-400/25"
                  >
                    สูตรกิจกรรม
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setGiftMode('all')}
                  className={`border px-2 py-1.5 text-[11px] font-semibold ${
                    giftMode === 'all'
                      ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                      : 'border-border bg-background/70 text-muted-foreground'
                  }`}
                >
                  แจกผู้เล่นทั้งเซิร์ฟเวอร์ (Global Drop)
                </button>
                <button
                  type="button"
                  onClick={() => setGiftMode('single')}
                  className={`border px-2 py-1.5 text-[11px] font-semibold ${
                    giftMode === 'single'
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border bg-background/70 text-muted-foreground'
                  }`}
                >
                  ส่งเฉพาะรายคน (ระบุชื่อ / UID)
                </button>
              </div>

              {giftMode === 'single' && (
                <input
                  value={giftTargetQuery}
                  onChange={(e) => setGiftTargetQuery(e.target.value)}
                  placeholder="ชื่อตัวละคร หรือ Game UID ผู้รับ (เช่น 1001)..."
                  className="w-full border border-border bg-background px-2 py-1.5 text-foreground outline-none focus:border-primary"
                />
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={giftSubject}
                  onChange={(e) => setGiftSubject(e.target.value)}
                  maxLength={60}
                  placeholder="หัวข้อจดหมาย..."
                  className="border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
                />
                <input
                  value={giftBody}
                  onChange={(e) => setGiftBody(e.target.value)}
                  maxLength={200}
                  placeholder="ข้อความแนบท้าย..."
                  className="border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>ทอง (Gold)</span>
                  <input
                    type="number"
                    min={0}
                    value={giftGold}
                    onChange={(e) => setGiftGold(e.target.value)}
                    className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground"
                  />
                </label>
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>เพชร (Diamonds)</span>
                  <input
                    type="number"
                    min={0}
                    value={giftDiamonds}
                    onChange={(e) => setGiftDiamonds(e.target.value)}
                    className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground"
                  />
                </label>
                <label className="col-span-2 space-y-0.5 text-[10px] text-muted-foreground sm:col-span-1">
                  <span>แนบไอเทม</span>
                  <select
                    value={giftItemId}
                    onChange={(e) => setGiftItemId(e.target.value)}
                    className="w-full border border-border bg-background px-1.5 py-1 text-xs text-foreground"
                  >
                    <option value="">ไม่แนบไอเทม</option>
                    {giftItemOptions.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>จำนวน</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    disabled={!giftItemId}
                    value={giftItemQty}
                    onChange={(e) => setGiftItemQty(e.target.value)}
                    className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground disabled:opacity-45"
                  />
                </label>
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>บวก (+)</span>
                  <input
                    type="number"
                    min={0}
                    max={MAX_PLUS}
                    disabled={!giftItemId}
                    value={giftItemPlus}
                    onChange={(e) => setGiftItemPlus(e.target.value)}
                    className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground disabled:opacity-45"
                  />
                </label>
              </div>

              <PxButton type="submit" variant="accent" disabled={giftBusy}>
                <Send className="mr-1 inline size-3.5" aria-hidden />
                {giftBusy
                  ? 'กำลังส่ง...'
                  : giftMode === 'all'
                    ? 'ส่งของขวัญให้ผู้เล่นทั้งเซิร์ฟเวอร์'
                    : 'ส่งจดหมายให้ผู้เล่นนี้'}
              </PxButton>
            </form>

            {/* Section A2: GM Redeem / Gift Code Manager */}
            <form
              className="space-y-2.5 border-2 border-fuchsia-400/45 bg-fuchsia-950/15 p-2.5"
              onSubmit={async (e) => {
                e.preventDefault()
                if (rcBusy) return
                setRcBusy(true)
                try {
                  const created = await createOrUpdateRedeemCodeForGm({
                    code: rcCode,
                    label: rcLabel,
                    gold: Number(rcGold) || 0,
                    diamonds: Number(rcDiamonds) || 0,
                    vipExp: Number(rcVipExp) || 0,
                    itemId: rcItemId || null,
                    qty: Number(rcItemQty) || 1,
                    plus: rcItemId ? Math.max(0, Math.min(MAX_PLUS, Number(rcItemPlus) || 0)) : 0,
                    maxUses: Number(rcMaxUses) || 100,
                    expiresHours: Number(rcExpiresHours) || null,
                  })
                  setStatusMsg(`สร้างโค้ด ${created.code} สำเร็จ (ใช้ได้ ${created.maxUses} ครั้ง)`)
                  setRcCode('')
                  await loadRedeemCodes()
                } catch (err) {
                  setStatusMsg(err instanceof Error ? err.message : 'สร้างโค้ดรางวัลไม่สำเร็จ')
                } finally {
                  setRcBusy(false)
                }
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 font-semibold text-fuchsia-200">
                  <Gift className="size-3.5 text-fuchsia-300" aria-hidden />
                  สร้างโค้ดรางวัล / กิฟต์โค้ด (Redeem Code Generator)
                </p>
                <div className="flex items-center gap-1.5">
                  <PxButton type="button" variant="secondary" onClick={() => openPanel('redeem')}>
                    เปิดหน้าแลกโค้ด
                  </PxButton>
                  <PxButton type="button" variant="secondary" onClick={() => void loadRedeemCodes()}>
                    <RefreshCw className="mr-1 inline size-3" aria-hidden />
                    รีเฟรช
                  </PxButton>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>รหัสโค้ด (A-Z, 0-9)</span>
                  <input
                    value={rcCode}
                    onChange={(e) => setRcCode(e.target.value.toUpperCase())}
                    placeholder="เช่น PIXEL2026"
                    maxLength={32}
                    className="w-full border border-border bg-background px-2 py-1 font-mono text-xs uppercase text-foreground"
                  />
                </label>
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>ชื่อกิจกรรม / คำอธิบาย</span>
                  <input
                    value={rcLabel}
                    onChange={(e) => setRcLabel(e.target.value)}
                    maxLength={80}
                    className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground"
                  />
                </label>
                <div className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>ค้นหา & แนบไอเทม ({filteredRedeemItemOptions.length} ชิ้น)</span>
                  <div className="flex gap-1">
                    <input
                      value={rcItemFilter}
                      onChange={(e) => setRcItemFilter(e.target.value)}
                      placeholder="ค้นหาชื่อ/ID..."
                      className="w-24 border border-border bg-background px-1.5 py-1 text-[11px] text-foreground"
                    />
                    <select
                      value={rcItemId}
                      onChange={(e) => setRcItemId(e.target.value)}
                      className="min-w-0 flex-1 border border-border bg-background px-1.5 py-1 text-xs text-foreground"
                    >
                      <option value="">ไม่แนบไอเทม</option>
                      {filteredRedeemItemOptions.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} ({it.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>เพชร (D)</span>
                  <input
                    type="number"
                    min={0}
                    value={rcDiamonds}
                    onChange={(e) => setRcDiamonds(e.target.value)}
                    className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground"
                  />
                </label>
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>ทอง (G)</span>
                  <input
                    type="number"
                    min={0}
                    value={rcGold}
                    onChange={(e) => setRcGold(e.target.value)}
                    className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground"
                  />
                </label>
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>VIP EXP</span>
                  <input
                    type="number"
                    min={0}
                    value={rcVipExp}
                    onChange={(e) => setRcVipExp(e.target.value)}
                    className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground"
                  />
                </label>
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>จำนวนไอเทม</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    disabled={!rcItemId}
                    value={rcItemQty}
                    onChange={(e) => setRcItemQty(e.target.value)}
                    className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground disabled:opacity-45"
                  />
                </label>
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>ตีบวก (+0-{MAX_PLUS})</span>
                  <input
                    type="number"
                    min={0}
                    max={MAX_PLUS}
                    disabled={!rcItemId}
                    value={rcItemPlus}
                    onChange={(e) => setRcItemPlus(e.target.value)}
                    className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground disabled:opacity-45"
                  />
                </label>
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>จำนวนสิทธิ์สูงสุด</span>
                  <input
                    type="number"
                    min={1}
                    value={rcMaxUses}
                    onChange={(e) => setRcMaxUses(e.target.value)}
                    className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground"
                  />
                </label>
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>หมดอายุ (ชม.)</span>
                  <input
                    type="number"
                    min={0}
                    value={rcExpiresHours}
                    onChange={(e) => setRcExpiresHours(e.target.value)}
                    className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <PxButton type="submit" variant="accent" disabled={rcBusy || rcCode.trim().length < 4}>
                  <Gift className="mr-1 inline size-3.5" aria-hidden />
                  {rcBusy ? 'กำลังสร้าง...' : 'บันทึกโค้ดรางวัล'}
                </PxButton>
                <span className="text-[10px] text-muted-foreground">
                  โค้ดทั้งหมด: {redeemCodes.length} รายการ (กดที่เมนู → ไอเทมโค้ด เพื่อทดสอบรับได้ทันที)
                </span>
              </div>

              {redeemCodes.length > 0 && (
                <div className="max-h-48 space-y-1 overflow-y-auto border-t border-border/60 pt-2">
                  {redeemCodes.map((rc) => {
                    const itemDef = rc.itemId ? ITEMS[rc.itemId] : null
                    return (
                      <div
                        key={rc.code}
                        className="flex flex-wrap items-center justify-between gap-2 border border-border bg-background/70 px-2 py-1.5 text-[11px]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-bold text-fuchsia-200">{rc.code}</span>
                            <span className="text-muted-foreground">{rc.label}</span>
                            {!rc.active && (
                              <span className="border border-rose-500/40 bg-rose-500/15 px-1 text-[9px] text-rose-200">
                                ปิดใช้งาน
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-cyan-200">
                            {rc.diamonds > 0 ? `+${formatNum(rc.diamonds)} D ` : ''}
                            {rc.gold > 0 ? `+${formatNum(rc.gold)} G ` : ''}
                            {rc.vipExp > 0 ? `+${rc.vipExp} VIP ` : ''}
                            {rc.itemId
                              ? `· ${itemDef?.name ?? rc.itemId}${rc.plus > 0 ? ` +${rc.plus}` : ''} x${Math.max(1, rc.qty)} `
                              : ''}
                            · ใช้แล้ว {rc.usedCount}/{rc.maxUses}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <PxButton
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                void navigator.clipboard.writeText(rc.code).then(
                                  () => setStatusMsg(`คัดลอกโค้ด ${rc.code} แล้ว`),
                                  () => setStatusMsg(`รหัสโค้ด: ${rc.code}`),
                                )
                              } else {
                                setStatusMsg(`รหัสโค้ด: ${rc.code}`)
                              }
                            }}
                          >
                            <Copy className="mr-1 inline size-3" aria-hidden />
                            คัดลอก
                          </PxButton>
                          <PxButton
                            type="button"
                            variant={rc.active ? 'secondary' : 'primary'}
                            onClick={async () => {
                              try {
                                await toggleRedeemCodeActiveForGm(rc.code, !rc.active)
                                setStatusMsg(`${rc.active ? 'ปิด' : 'เปิด'}ใช้งานโค้ด ${rc.code} แล้ว`)
                                await loadRedeemCodes()
                              } catch (err) {
                                setStatusMsg(err instanceof Error ? err.message : 'เปลี่ยนสถานะโค้ดไม่สำเร็จ')
                              }
                            }}
                          >
                            {rc.active ? 'ปิดโค้ด' : 'เปิดใช้'}
                          </PxButton>
                          <PxButton
                            type="button"
                            variant="danger"
                            onClick={async () => {
                              try {
                                await deleteRedeemCodeForGm(rc.code)
                                setStatusMsg(`ลบโค้ด ${rc.code} เรียบร้อยแล้ว`)
                                await loadRedeemCodes()
                              } catch (err) {
                                setStatusMsg(err instanceof Error ? err.message : 'ลบโค้ดไม่สำเร็จ')
                              }
                            }}
                          >
                            <Trash2 className="size-3" aria-hidden />
                          </PxButton>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </form>

            {/* Section B: GM Moderation Controls */}
            <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 font-semibold text-primary">
                  <ShieldAlert className="size-3.5" aria-hidden />
                  จัดการผู้เล่น (ใบ้แชท / เตะ / แบน)
                </p>
                <span className="font-mono text-[10px] text-muted-foreground">/mute · /unmute · /kick · /ban</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={modTargetQuery}
                  onChange={(e) => setModTargetQuery(e.target.value)}
                  placeholder="ชื่อตัวละคร หรือ UID เป้าหมาย..."
                  className="border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
                />
                <input
                  value={modReason}
                  onChange={(e) => setModReason(e.target.value)}
                  maxLength={120}
                  placeholder="เหตุผล (เช่น สแปมแชท / ตรวจสอบบัญชี)..."
                  className="border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">ระยะใบ้:</span>
                {[5, 15, 60, 1440].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setModMuteMinutes(min)}
                    className={`border px-2 py-0.5 text-[10px] ${
                      modMuteMinutes === min
                        ? 'border-rose-400 bg-rose-500/20 font-bold text-rose-200'
                        : 'border-border bg-background text-muted-foreground'
                    }`}
                  >
                    {min >= 60 ? `${min / 60} ชม.` : `${min} นาที`}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <PxButton
                  variant="secondary"
                  disabled={modBusy || !modTargetQuery.trim()}
                  onClick={() => void runModAction(() => gmMutePlayer(modTargetQuery, modMuteMinutes, modReason))}
                >
                  <VolumeX className="mr-1 inline size-3.5" aria-hidden />
                  ใบ้แชท ({modMuteMinutes >= 60 ? `${modMuteMinutes / 60} ชม.` : `${modMuteMinutes} น.`})
                </PxButton>
                <PxButton
                  variant="primary"
                  disabled={modBusy || !modTargetQuery.trim()}
                  onClick={() => void runModAction(() => gmUnmutePlayer(modTargetQuery))}
                >
                  ปลดใบ้แชท
                </PxButton>
                <PxButton
                  variant="danger"
                  disabled={modBusy || !modTargetQuery.trim()}
                  onClick={() => void runModAction(() => gmKickPlayer(modTargetQuery, modReason))}
                >
                  <UserX className="mr-1 inline size-3.5" aria-hidden />
                  เตะออกจากเกม (Kick)
                </PxButton>
                <PxButton
                  variant="danger"
                  disabled={modBusy || !modTargetQuery.trim()}
                  onClick={() =>
                    void runModAction(() => createBan(modTargetQuery, 3600, modReason || 'GM แบนชั่วคราว 1 ชม.'))
                  }
                >
                  <Ban className="mr-1 inline size-3.5" aria-hidden />
                  แบน 1 ชม.
                </PxButton>
              </div>
            </div>

            {/* Section C: Player Reports Viewer */}
            <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 font-semibold text-primary">
                  <Flag className="size-3.5" aria-hidden />
                  รายงานผู้เล่นจากในเกม ({reports.length})
                </p>
                <PxButton variant="secondary" disabled={reportsLoading} onClick={() => void loadReports()}>
                  <RefreshCw className={`mr-1 inline size-3 ${reportsLoading ? 'animate-spin' : ''}`} aria-hidden />
                  รีเฟรช
                </PxButton>
              </div>
              {reportsError && <p className="text-[11px] text-destructive">{reportsError}</p>}
              {!reportsLoading && reports.length === 0 && !reportsError ? (
                <p className="border border-border/60 bg-background/50 p-3 text-center text-[11px] text-muted-foreground">
                  ยังไม่มีรายการรายงานผู้เล่นเข้ามา
                </p>
              ) : (
                <div className="max-h-48 space-y-1.5 overflow-y-auto">
                  {reports.map((rep) => (
                    <div
                      key={rep.reportId}
                      className="flex flex-wrap items-center justify-between gap-2 border border-border bg-background/70 p-2 text-[11px]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground">
                          {rep.targetName}{' '}
                          <span className="font-mono text-[10px] text-primary">#{rep.targetGameUid}</span>
                          <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                            {new Date(rep.createdAtMs).toLocaleString('th-TH')}
                          </span>
                        </p>
                        <p className="text-rose-300">เหตุผล: {rep.reason}</p>
                        {rep.details && <p className="text-[10px] text-muted-foreground">{rep.details}</p>}
                      </div>
                      <div className="flex flex-wrap shrink-0 gap-1">
                        <PxButton
                          variant="secondary"
                          onClick={() => void gmWarpToPlayer(rep.targetGameUid).then((r) => setStatusMsg(r.message))}
                        >
                          วาร์ปดู
                        </PxButton>
                        <PxButton
                          variant="secondary"
                          onClick={() =>
                            void runModAction(() => gmMutePlayer(rep.targetGameUid, 15, rep.reason))
                          }
                        >
                          ใบ้ 15น.
                        </PxButton>
                        <PxButton
                          variant="danger"
                          onClick={() => void runModAction(() => gmKickPlayer(rep.targetGameUid, rep.reason))}
                        >
                          เตะออก
                        </PxButton>
                        <PxButton
                          variant="primary"
                          onClick={() => {
                            setModTargetQuery(rep.targetGameUid)
                            setModReason(rep.reason)
                          }}
                        >
                          เลือก
                        </PxButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'system' && (
          <div className="space-y-3">
            <form
              className="space-y-2 border-2 border-border bg-muted/50 p-2.5"
              onSubmit={(e) => {
                e.preventDefault()
                devBroadcastAnnouncement(announceText)
                setStatusMsg('ส่งประกาศ GM ถึงผู้เล่นทั้งเซิร์ฟเวอร์เรียบร้อย')
                setAnnounceText('')
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-primary">ประกาศ GM ทั้งเซิร์ฟเวอร์ (ทุกคนเห็นทุกแมพ)</p>
                <span className="font-mono text-[10px] text-amber-300">/announce หรือ /ประกาศ</span>
              </div>
              <div className="flex gap-1.5">
                <input
                  value={announceText}
                  onChange={(e) => setAnnounceText(e.target.value)}
                  maxLength={200}
                  placeholder="พิมพ์ข้อความประกาศถึงผู้เล่นทุกคนในเซิร์ฟเวอร์..."
                  className="min-w-0 flex-1 border border-border bg-background px-2 py-1.5 text-foreground outline-none focus:border-primary"
                />
                <PxButton type="submit">
                  <Megaphone className="mr-1 inline size-3.5" aria-hidden />
                  ประกาศทั้งเซิร์ฟ
                </PxButton>
              </div>
            </form>

            {/* Server EXP & Drop Multiplier Controls */}
            {(() => {
              const activeRates = getActiveServerRates()
              const boostOn = isServerRateBoostActive(activeRates)
              const remainingMin =
                activeRates.expiresAtMs && activeRates.expiresAtMs > Date.now()
                  ? Math.max(1, Math.ceil((activeRates.expiresAtMs - Date.now()) / 60_000))
                  : null
              return (
                <form
                  className="space-y-2.5 border-2 border-amber-400/50 bg-amber-950/15 p-2.5"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (rateBusy) return
                    setRateBusy(true)
                    try {
                      const res = await gmSetServerRatesAction({
                        expMultiplier: Number(rateExpMul) || 1,
                        dropMultiplier: Number(rateDropMul) || 1,
                        durationMinutes: Math.max(0, Math.floor(Number(rateDurationMin) || 0)),
                        label: rateLabel,
                      })
                      setStatusMsg(res.message)
                    } finally {
                      setRateBusy(false)
                    }
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 font-semibold text-amber-200">
                      <TrendingUp className="size-3.5 text-amber-300" aria-hidden />
                      คูณ EXP & คูณดรอปทั้งเซิร์ฟเวอร์ (Server Multiplier Event)
                    </p>
                    <span className="font-mono text-[10px] text-amber-300">/rate · /exprate · /droprate</span>
                  </div>

                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 border px-2.5 py-1.5 text-[11px] ${
                      boostOn
                        ? 'border-amber-400/60 bg-amber-500/15 text-amber-100'
                        : 'border-border bg-background/70 text-muted-foreground'
                    }`}
                  >
                    <span className="font-semibold">
                      สถานะเซิร์ฟเวอร์ตอนนี้: {formatServerRateSummary(activeRates)}
                    </span>
                    <span className="font-mono text-[10px]">
                      {boostOn
                        ? remainingMin !== null
                          ? `เหลืออีก ~${remainingMin} นาที`
                          : 'เปิดต่อเนื่อง'
                        : 'ปกติ x1'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: 'EXP x1.5', exp: 1.5, drop: 1, min: 60 },
                      { label: 'EXP x2', exp: 2, drop: 1, min: 60 },
                      { label: 'EXP & DROP x2', exp: 2, drop: 2, min: 60 },
                      { label: 'EXP & DROP x3', exp: 3, drop: 3, min: 120 },
                      { label: 'กิจกรรมใหญ่ x5', exp: 5, drop: 5, min: 60 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        disabled={rateBusy}
                        onClick={() => {
                          setRateExpMul(String(preset.exp))
                          setRateDropMul(String(preset.drop))
                          setRateDurationMin(String(preset.min))
                          setRateBusy(true)
                          void gmSetServerRatesAction({
                            expMultiplier: preset.exp,
                            dropMultiplier: preset.drop,
                            durationMinutes: preset.min,
                            label: preset.label,
                          })
                            .then((r) => setStatusMsg(r.message))
                            .finally(() => setRateBusy(false))
                        }}
                        className="border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold text-amber-200 hover:bg-amber-400/20 disabled:opacity-45"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <label className="space-y-0.5 text-[10px] text-muted-foreground">
                      <span>คูณ EXP (1 - 10)</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        step={0.5}
                        value={rateExpMul}
                        onChange={(e) => setRateExpMul(e.target.value)}
                        className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground"
                      />
                    </label>
                    <label className="space-y-0.5 text-[10px] text-muted-foreground">
                      <span>คูณดรอป (1 - 10)</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        step={0.5}
                        value={rateDropMul}
                        onChange={(e) => setRateDropMul(e.target.value)}
                        className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground"
                      />
                    </label>
                    <label className="space-y-0.5 text-[10px] text-muted-foreground">
                      <span>เวลา (นาที, 0=ไม่จำกัด)</span>
                      <input
                        type="number"
                        min={0}
                        max={10080}
                        value={rateDurationMin}
                        onChange={(e) => setRateDurationMin(e.target.value)}
                        className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground"
                      />
                    </label>
                    <label className="space-y-0.5 text-[10px] text-muted-foreground">
                      <span>ชื่อกิจกรรม</span>
                      <input
                        value={rateLabel}
                        onChange={(e) => setRateLabel(e.target.value)}
                        maxLength={80}
                        className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <PxButton type="submit" variant="accent" disabled={rateBusy}>
                      <TrendingUp className="mr-1 inline size-3.5" aria-hidden />
                      {rateBusy ? 'กำลังตั้งค่า...' : 'เปิดคูณทั้งเซิร์ฟเวอร์'}
                    </PxButton>
                    <PxButton
                      type="button"
                      variant="secondary"
                      disabled={rateBusy || !boostOn}
                      onClick={() => {
                        setRateBusy(true)
                        void gmSetServerRatesAction({
                          expMultiplier: 1,
                          dropMultiplier: 1,
                          reset: true,
                        })
                          .then((r) => setStatusMsg(r.message))
                          .finally(() => setRateBusy(false))
                      }}
                    >
                      <RotateCcw className="mr-1 inline size-3.5" aria-hidden />
                      รีเซ็ตกลับ x1
                    </PxButton>
                  </div>
                </form>
              )
            })()}

            {/* Live Patch Notes Publisher */}
            <form
              className="space-y-2.5 border-2 border-cyan-400/45 bg-cyan-950/15 p-2.5"
              onSubmit={async (e) => {
                e.preventDefault()
                if (pnBusy) return
                const user = auth.currentUser
                if (!user) {
                  setStatusMsg('กรุณาล็อกอินบัญชี GM ก่อนเผยแพร่ Patch Notes')
                  return
                }
                const parseLines = (text: string) =>
                  text
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean)
                setPnBusy(true)
                try {
                  const token = await user.getIdToken()
                  const res = await fetch('/api/version', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      announce: pnAnnounce,
                      authorName: p.name,
                      note: {
                        version: pnVersion,
                        date: pnDate,
                        title: pnTitle,
                        updates: parseLines(pnUpdates),
                        improvements: parseLines(pnImprovements),
                        bugFixes: parseLines(pnBugFixes),
                      },
                    }),
                  })
                  const json = (await res.json().catch(() => null)) as {
                    ok?: boolean
                    message?: string
                    payload?: VersionPayload
                  } | null
                  if (!res.ok || !json?.ok) {
                    setStatusMsg(json?.message || 'เผยแพร่ Patch Notes ไม่สำเร็จ')
                    return
                  }
                  if (json.payload?.customVersions) {
                    setCustomPatchVersions(json.payload.customVersions)
                  }
                  await checkForGameUpdates(true)
                  setStatusMsg(json.message || `เผยแพร่ Patch Notes v${pnVersion} แล้ว`)
                } catch {
                  setStatusMsg('เชื่อมต่อเซิร์ฟเวอร์เพื่อเผยแพร่ Patch Notes ไม่สำเร็จ')
                } finally {
                  setPnBusy(false)
                }
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 font-semibold text-cyan-200">
                  <Newspaper className="size-3.5 text-cyan-300" aria-hidden />
                  เผยแพร่ Patch Notes แบบเรียลไทม์ (Live Patch Notes)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <PxButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const latest = versionUpdate.changelog[0]
                      if (!latest) return
                      setPnVersion(latest.version)
                      setPnDate(latest.date)
                      setPnTitle(latest.title)
                      setPnUpdates(latest.updates.join('\n'))
                      setPnImprovements(latest.improvements.join('\n'))
                      setPnBugFixes(latest.bugFixes.join('\n'))
                      setStatusMsg(`โหลดข้อมูล Patch Notes v${latest.version} เข้าแบบฟอร์มแล้ว`)
                    }}
                  >
                    ดึงล่าสุดมาแก้
                  </PxButton>
                  <PxButton type="button" variant="secondary" onClick={() => openChangelogModal()}>
                    เปิดดู Patch Notes
                  </PxButton>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground">
                เวอร์ชั่นไคลเอนต์: v{GAME_VERSION} · เวอร์ชั่นล่าสุดบนเซิร์ฟ: v{versionUpdate.remoteVersion ?? GAME_VERSION}
              </p>

              <div className="grid gap-2 sm:grid-cols-3">
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>เวอร์ชั่น (X.Y.Z)</span>
                  <input
                    value={pnVersion}
                    onChange={(e) => setPnVersion(e.target.value)}
                    placeholder="1.4.3"
                    className="w-full border border-border bg-background px-2 py-1 font-mono text-xs text-foreground"
                  />
                </label>
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>วันที่ (YYYY-MM-DD)</span>
                  <input
                    value={pnDate}
                    onChange={(e) => setPnDate(e.target.value)}
                    placeholder="2026-11-22"
                    className="w-full border border-border bg-background px-2 py-1 font-mono text-xs text-foreground"
                  />
                </label>
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>หัวข้อแพตช์</span>
                  <input
                    value={pnTitle}
                    onChange={(e) => setPnTitle(e.target.value)}
                    maxLength={140}
                    placeholder="เช่น อัปเดตกิจกรรมวันหยุด x2..."
                    className="w-full border border-border bg-background px-2 py-1 text-xs text-foreground"
                  />
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>อัปเดตใหม่ (ขึ้นบรรทัดใหม่ต่อข้อ)</span>
                  <textarea
                    rows={3}
                    value={pnUpdates}
                    onChange={(e) => setPnUpdates(e.target.value)}
                    placeholder="เพิ่มบอสกิจกรรมใหม่..."
                    className="w-full border border-border bg-background px-2 py-1 text-[11px] text-foreground"
                  />
                </label>
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>ปรับปรุงสมดุล (ขึ้นบรรทัดใหม่ต่อข้อ)</span>
                  <textarea
                    rows={3}
                    value={pnImprovements}
                    onChange={(e) => setPnImprovements(e.target.value)}
                    placeholder="ปรับความเร็วในการฟาร์ม..."
                    className="w-full border border-border bg-background px-2 py-1 text-[11px] text-foreground"
                  />
                </label>
                <label className="space-y-0.5 text-[10px] text-muted-foreground">
                  <span>แก้ไขบั๊ก (ขึ้นบรรทัดใหม่ต่อข้อ)</span>
                  <textarea
                    rows={3}
                    value={pnBugFixes}
                    onChange={(e) => setPnBugFixes(e.target.value)}
                    placeholder="แก้ไขแสดงผลไอเทม..."
                    className="w-full border border-border bg-background px-2 py-1 text-[11px] text-foreground"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-[11px] text-foreground">
                  <input
                    type="checkbox"
                    checked={pnAnnounce}
                    onChange={(e) => setPnAnnounce(e.target.checked)}
                    className="accent-cyan-400"
                  />
                  <span>ประกาศแจ้งผู้เล่นทั้งเซิร์ฟเวอร์เมื่อเผยแพร่</span>
                </label>
                <PxButton type="submit" variant="primary" disabled={pnBusy || !pnTitle.trim()}>
                  <Newspaper className="mr-1 inline size-3.5" aria-hidden />
                  {pnBusy ? 'กำลังบันทึก...' : 'เผยแพร่ Patch Notes'}
                </PxButton>
              </div>

              {customPatchVersions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2 text-[10px]">
                  <span className="text-muted-foreground">Patch Note แบบกำหนดเองบนเซิร์ฟ:</span>
                  {customPatchVersions.map((ver) => (
                    <span
                      key={ver}
                      className="inline-flex items-center gap-1 border border-cyan-400/40 bg-cyan-500/15 px-1.5 py-0.5 font-mono text-cyan-200"
                    >
                      v{ver}
                      <button
                        type="button"
                        onClick={async () => {
                          const user = auth.currentUser
                          if (!user) return
                          try {
                            const token = await user.getIdToken()
                            const res = await fetch(`/api/version?version=${encodeURIComponent(ver)}`, {
                              method: 'DELETE',
                              headers: { Authorization: `Bearer ${token}` },
                            })
                            const json = (await res.json().catch(() => null)) as {
                              ok?: boolean
                              message?: string
                              payload?: VersionPayload
                            } | null
                            if (res.ok && json?.ok) {
                              setCustomPatchVersions(json.payload?.customVersions ?? [])
                              await checkForGameUpdates(true)
                            }
                            setStatusMsg(json?.message || `ลบ Patch Note v${ver} แล้ว`)
                          } catch {
                            setStatusMsg('ลบ Patch Note ไม่สำเร็จ')
                          }
                        }}
                        className="text-rose-300 hover:text-rose-100"
                        aria-label={`ลบ Patch Note v${ver}`}
                      >
                        <Trash2 className="size-3" aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </form>

            <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-primary">วาร์ปไปหา / ดึงตัวผู้เล่นอื่นมาหา</p>
                <span className="font-mono text-[10px] text-cyan-300">/goto · /pull · /tp</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <input
                  value={targetPlayerQuery}
                  onChange={(e) => setTargetPlayerQuery(e.target.value)}
                  placeholder="ระบุชื่อตัวละคร หรือ UID (เช่น 1001)..."
                  className="min-w-0 flex-1 border border-border bg-background px-2 py-1.5 text-foreground outline-none focus:border-primary"
                />
                <PxButton
                  variant="secondary"
                  onClick={() => {
                    void gmWarpToPlayer(targetPlayerQuery).then((res) => setStatusMsg(res.message))
                  }}
                >
                  <Navigation className="mr-1 inline size-3.5" aria-hidden />
                  วาร์ปไปหา
                </PxButton>
                <PxButton
                  variant="accent"
                  onClick={() => {
                    void gmSummonPlayer(targetPlayerQuery).then((res) => setStatusMsg(res.message))
                  }}
                >
                  <ArrowDownToLine className="mr-1 inline size-3.5" aria-hidden />
                  ดึงมาหา
                </PxButton>
              </div>
              {g.onlinePlayers.filter((other) => !other.invisible).length > 0 && (
                <div className="max-h-36 space-y-1 overflow-y-auto border-t border-border/60 pt-2">
                  {g.onlinePlayers
                    .filter((other) => !other.invisible)
                    .map((other) => {
                      const mapName = MAPS[other.mapId]?.name ?? other.mapId
                      const tx = Math.floor(other.x / TILE)
                      const ty = Math.floor(other.y / TILE)
                      return (
                        <div
                          key={other.userId}
                          className="flex flex-wrap items-center justify-between gap-2 border border-border bg-background/70 px-2 py-1"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground">{other.displayName}</span>
                            <span className="ml-1.5 font-mono text-[10px] text-primary">
                              #{other.gameUid ?? '----'}
                            </span>
                            <span className="ml-2 text-[10px] text-muted-foreground">
                              {mapName} ({tx}, {ty})
                            </span>
                          </div>
                          <div className="flex flex-wrap shrink-0 gap-1">
                            <PxButton
                              variant="secondary"
                              onClick={() => {
                                void gmWarpToPlayer(other).then((res) => setStatusMsg(res.message))
                              }}
                            >
                              <Navigation className="mr-1 inline size-3" aria-hidden />
                              วาร์ปไป
                            </PxButton>
                            <PxButton
                              variant="accent"
                              onClick={() => {
                                void gmSummonPlayer(other).then((res) => setStatusMsg(res.message))
                              }}
                            >
                              <ArrowDownToLine className="mr-1 inline size-3" aria-hidden />
                              ดึงมา
                            </PxButton>
                            <PxButton
                              variant="secondary"
                              onClick={() => {
                                void gmMutePlayer(other.gameUid ?? other.userId, 15, 'GM ใบ้แชท').then((res) =>
                                  setStatusMsg(res.message),
                                )
                              }}
                            >
                              <VolumeX className="mr-1 inline size-3" aria-hidden />
                              ใบ้ 15น.
                            </PxButton>
                            <PxButton
                              variant="danger"
                              onClick={() => {
                                void gmKickPlayer(other.gameUid ?? other.userId, 'GM ตัดการเชื่อมต่อ').then((res) =>
                                  setStatusMsg(res.message),
                                )
                              }}
                            >
                              <UserX className="mr-1 inline size-3" aria-hidden />
                              เตะ
                            </PxButton>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Server Readiness Checklist */}
            <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-primary">ความพร้อมระบบชำระเงิน & เซิร์ฟเวอร์ (Readiness Checklist)</p>
                <PxButton variant="secondary" disabled={sysLoading} onClick={() => void loadSystemStatus()}>
                  <RefreshCw className={`mr-1 inline size-3 ${sysLoading ? 'animate-spin' : ''}`} aria-hidden />
                  ตรวจสอบ
                </PxButton>
              </div>
              {sysStatus ? (
                <div className="grid grid-cols-1 gap-1.5 text-[11px] sm:grid-cols-2">
                  {[
                    {
                      label: 'QR พร้อมเพย์ร้านค้า (PromptPay / SCB QR)',
                      ok: sysStatus.topup.merchantQrReady,
                      hint: sysStatus.topup.merchantQrReady ? 'พร้อมให้ลูกค้าสแกนโอนแล้ว' : 'ยังไม่ตั้งค่า QR',
                    },
                    {
                      label: 'ตรวจสลิปอัตโนมัติ (SlipOK)',
                      ok: sysStatus.topup.slipOkConfigured,
                      hint: sysStatus.topup.slipOkConfigured ? 'SLIPOK พร้อมทำงาน' : 'ยังไม่ใส่ SLIPOK_API_KEY / BRANCH_ID',
                    },
                    {
                      label: 'ตรวจสลิปอัตโนมัติ (EasySlip)',
                      ok: sysStatus.topup.easySlipConfigured,
                      hint: sysStatus.topup.easySlipConfigured ? 'EASYSLIP พร้อมทำงาน' : 'ยังไม่ใส่ EASYSLIP_API_KEY',
                    },
                    {
                      label: 'Stripe บัตรเครดิต / QR',
                      ok: sysStatus.topup.stripeConfigured,
                      hint: sysStatus.topup.stripeConfigured ? 'STRIPE_SECRET_KEY พร้อมทำงาน' : 'ยังไม่ใส่ STRIPE_SECRET_KEY',
                    },
                    {
                      label: 'Stripe Webhook Secret',
                      ok: sysStatus.topup.stripeWebhookConfigured,
                      hint: sysStatus.topup.stripeWebhookConfigured ? 'ตั้งค่าแล้ว' : 'ยังไม่ใส่ STRIPE_WEBHOOK_SECRET',
                    },
                    {
                      label: 'ลายเซ็นเพชรเซิร์ฟเวอร์ (PREMIUM_TX_SECRET)',
                      ok: sysStatus.topup.premiumSecretConfigured,
                      hint: sysStatus.topup.premiumSecretConfigured ? 'Production Secret พร้อม' : 'ใช้ Dev Fallback ชั่วคราว',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-start gap-2 border px-2.5 py-1.5 ${
                        item.ok
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                          : 'border-border bg-background/70 text-muted-foreground'
                      }`}
                    >
                      {item.ok ? (
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" aria-hidden />
                      ) : (
                        <XCircle className="mt-0.5 size-3.5 shrink-0 text-amber-400" aria-hidden />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{item.label}</p>
                        <p className="truncate text-[10px]">{item.hint}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">กำลังดึงสถานะความพร้อมจากเซิร์ฟเวอร์...</p>
              )}
            </div>

            <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-primary">ข้อมูลระบบและคลาวด์ (Diagnostics)</p>
                <PxButton
                  variant="accent"
                  onClick={() => {
                    saveGame()
                    setStatusMsg('บันทึกข้อมูลตัวละครขึ้น Firestore แล้ว')
                  }}
                >
                  <Save className="mr-1 inline size-3.5" aria-hidden />
                  Force Cloud Save
                </PxButton>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Game UID (Sole GM)</dt>
                  <dd className="font-mono font-bold text-amber-300">{PERMANENT_GM_GAME_UID}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email ผู้พัฒนา</dt>
                  <dd className="truncate font-mono text-foreground">{fbUser?.email ?? GM_EMAIL}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Firebase Auth UID</dt>
                  <dd className="truncate font-mono text-foreground">{fbUser?.uid ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Save Slot</dt>
                  <dd className="font-mono text-foreground">{getActiveCharacterSlot()}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Firestore DB</dt>
                  <dd className="truncate font-mono text-foreground">{firebaseConfig.firestoreDatabaseId}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">ตำแหน่งปัจจุบัน</dt>
                  <dd className="font-mono text-foreground">
                    {p.mapId} ({Math.floor(p.x / TILE)}, {Math.floor(p.y / TILE)})
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Stats (ATK / DEF / CRIT)</dt>
                  <dd className="font-mono text-accent">
                    {formatNum(s.atk)} / {formatNum(s.def)} / {Math.round(s.crit * 100)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Max HP / MP</dt>
                  <dd className="font-mono text-foreground">
                    {formatNum(s.maxHp)} / {formatNum(s.maxMp)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Monsters Active</dt>
                  <dd className="font-mono text-foreground">{g.monsters.filter((m) => !m.dead).length}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </PanelFrame>
  )
}
