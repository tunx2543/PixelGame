'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  ArrowDownToLine,
  CalendarDays,
  Check,
  Clock,
  Coins,
  Crown,
  Flame,
  Gem,
  Gift,
  ShoppingBag,
  Sparkles,
  Swords,
  Ticket,
} from 'lucide-react'
import { ITEMS } from '@/lib/game/data'
import {
  claimFestivalDailyGiftAction,
  claimFestivalMissionAction,
  depositAllEventTokensFromBagAction,
  exchangeFestivalShopRewardAction,
  exchangeUniversalEventShopRewardAction,
  getActiveFestivalState,
  isCurrentAccountGm,
  openPanel,
} from '@/lib/game/engine'
import { getCosmeticDef, sanitizeExtV2 } from '@/lib/game/extended-systems'
import {
  EVENT_TOKEN_NAME,
  EVENT_TOKEN_SHOP_REWARDS,
  FESTIVAL_EVENTS,
  canClaimFestivalDailyGift,
  formatFestivalRemaining,
  getEventTokenShopCycleKey,
  getFestivalCycleProgress,
  getFestivalMissionClaimKey,
  getFestivalMissionMetricValue,
  getFestivalShopPurchaseKey,
  getFestivalTokenCount,
  getUniversalEventTokenCount,
  type FestivalEventId,
} from '@/lib/game/festival-events'
import { TITLE_DEFS, sanitizeRpgExt } from '@/lib/game/rpg-systems'
import { playQuestClaimSfx } from '@/lib/game/sfx'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { formatNum } from '../format'
import { ItemIcon } from '../item-icon'
import { PanelFrame, PxButton } from './panels'

type EventsTab = 'missions' | 'shop' | 'event-shop' | 'calendar'

function CosmeticIconThumb({ cosmeticId, name }: { cosmeticId: string; name: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return <Sparkles className="size-5 text-pink-300" aria-hidden />
  }
  return (
    <img
      src={`/assets/fashion/icons/${cosmeticId}.png`}
      alt={name}
      width={28}
      height={28}
      onError={() => setFailed(true)}
      className="size-7 object-contain"
    />
  )
}

const EVENT_THEME_CLASSES: Record<
  FestivalEventId,
  {
    banner: string
    accentText: string
    badge: string
    barFill: string
  }
> = {
  loy_krathong: {
    banner: 'border-amber-400/55 bg-gradient-to-br from-amber-950/65 via-[#0c1626] to-sky-950/65',
    accentText: 'text-amber-300',
    badge: 'border-amber-300/60 bg-amber-500/15 text-amber-200',
    barFill: 'bg-gradient-to-r from-amber-400 to-sky-400',
  },
  new_year: {
    banner: 'border-sky-400/55 bg-gradient-to-br from-sky-950/65 via-[#0c1626] to-rose-950/55',
    accentText: 'text-sky-300',
    badge: 'border-sky-300/60 bg-sky-500/15 text-sky-200',
    barFill: 'bg-gradient-to-r from-sky-400 to-rose-400',
  },
  lunar_new_year: {
    banner: 'border-red-400/55 bg-gradient-to-br from-red-950/65 via-[#1b0b12] to-amber-950/60',
    accentText: 'text-amber-300',
    badge: 'border-red-300/60 bg-red-500/15 text-amber-200',
    barFill: 'bg-gradient-to-r from-red-500 to-amber-400',
  },
  songkran: {
    banner: 'border-cyan-400/55 bg-gradient-to-br from-cyan-950/65 via-[#0a1b2a] to-amber-950/45',
    accentText: 'text-cyan-300',
    badge: 'border-cyan-300/60 bg-cyan-500/15 text-cyan-200',
    barFill: 'bg-gradient-to-r from-cyan-400 to-amber-300',
  },
  halloween: {
    banner: 'border-purple-400/55 bg-gradient-to-br from-purple-950/70 via-[#150d26] to-orange-950/60',
    accentText: 'text-purple-300',
    badge: 'border-purple-300/60 bg-purple-500/15 text-orange-200',
    barFill: 'bg-gradient-to-r from-purple-400 to-orange-400',
  },
  weekend_hunter: {
    banner: 'border-orange-400/55 bg-gradient-to-br from-orange-950/65 via-[#18111a] to-amber-950/55',
    accentText: 'text-orange-300',
    badge: 'border-orange-300/60 bg-orange-500/15 text-amber-200',
    barFill: 'bg-gradient-to-r from-orange-400 to-yellow-400',
  },
  guild_boss_rush: {
    banner: 'border-rose-400/55 bg-gradient-to-br from-rose-950/65 via-[#190c1b] to-purple-950/55',
    accentText: 'text-rose-300',
    badge: 'border-rose-300/60 bg-rose-500/15 text-rose-200',
    barFill: 'bg-gradient-to-r from-rose-400 to-purple-400',
  },
  harvest_blessing: {
    banner: 'border-emerald-400/55 bg-gradient-to-br from-emerald-950/65 via-[#0b1b18] to-amber-950/45',
    accentText: 'text-emerald-300',
    badge: 'border-emerald-300/60 bg-emerald-500/15 text-emerald-200',
    barFill: 'bg-gradient-to-r from-emerald-400 to-amber-400',
  },
}

export function EventsPanel() {
  const { p } = useGame()
  const [tab, setTab] = useState<EventsTab>('missions')
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  if (!p) return null

  const extV2 = sanitizeExtV2(p.extV2)
  const rpgExt = sanitizeRpgExt(p.rpgExt)
  const fest = extV2.festival
  const active = getActiveFestivalState(nowMs)
  const theme = EVENT_THEME_CLASSES[active.def.id]
  const tokenBalance = getFestivalTokenCount(fest, active.def.id)
  const universalBalance = getUniversalEventTokenCount(fest)
  const bagEventTokens = p.inventory
    .filter((it) => it.itemId === 'event_token' && it.qty > 0)
    .reduce((sum, it) => sum + it.qty, 0)
  const dailyReady = canClaimFestivalDailyGift(fest, active.def.id, nowMs)
  const dailyUniversalTokens = Math.max(8, Math.round(active.def.dailyGift.tokens * 0.75))
  const cycleProgress = getFestivalCycleProgress(fest, active.cycleKey)
  const isGmDev = Boolean(p.gm && isCurrentAccountGm())

  const claimableMissionsCount = active.def.missions.filter((m) => {
    const claimed = Boolean(fest?.claimedMissionKeys.includes(getFestivalMissionClaimKey(active.cycleKey, m.id)))
    const val = getFestivalMissionMetricValue(cycleProgress, m.metric)
    return !claimed && val >= m.target
  }).length

  const handleClaimDaily = () => {
    const res = claimFestivalDailyGiftAction()
    if (res.ok) playQuestClaimSfx(true)
    setNotice({ ok: res.ok, text: res.message })
  }

  const handleClaimMission = (missionId: string) => {
    const res = claimFestivalMissionAction(missionId)
    if (res.ok) playQuestClaimSfx(false)
    setNotice({ ok: res.ok, text: res.message })
  }

  const handleExchangeReward = (rewardId: string) => {
    const res = exchangeFestivalShopRewardAction(rewardId)
    if (res.ok) playQuestClaimSfx(true)
    setNotice({ ok: res.ok, text: res.message })
  }

  const handleDepositBagTokens = () => {
    const res = depositAllEventTokensFromBagAction()
    if (res.ok) playQuestClaimSfx(false)
    setNotice({ ok: res.ok, text: res.message })
  }

  const handleExchangeUniversalReward = (rewardId: string) => {
    const res = exchangeUniversalEventShopRewardAction(rewardId)
    if (res.ok) playQuestClaimSfx(true)
    setNotice({ ok: res.ok, text: res.message })
  }

  return (
    <PanelFrame
      title="เทศกาลตามฤดูกาล & กิจกรรมเซิร์ฟเวอร์"
      subtitle="กิจกรรมสลับตามปฏิทินไทย (UTC+7) และระบบโทเคนกิจกรรมสำหรับแลกไอเทมและของสะสมถาวร"
    >
      <div className="space-y-4">
        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className={cn('relative overflow-hidden border-2 p-3.5 shadow-lg', theme.banner)}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                <span className={cn('inline-flex items-center gap-1 border px-2 py-0.5', theme.badge)}>
                  <Sparkles className="size-3" aria-hidden />
                  {active.def.kind === 'seasonal' ? 'เทศกาลตามฤดูกาล' : 'กิจกรรมในเกม'}
                </span>
                {active.isGmOverride && (
                  <span className="inline-flex items-center gap-1 border border-fuchsia-300/70 bg-fuchsia-600/25 px-2 py-0.5 text-fuchsia-200">
                    <Crown className="size-3" aria-hidden />
                    GM เปิดพิเศษ ({active.triggeredByName || 'GM'})
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-slate-300 tabular-nums">
                  <Clock className="size-3 text-sky-300" aria-hidden />
                  {formatFestivalRemaining(active.endsAtMs, nowMs)}
                </span>
              </div>

              <h3 className={cn('text-base font-extrabold tracking-tight sm:text-lg', theme.accentText)}>
                {active.title}
              </h3>
              <p className="text-xs leading-relaxed text-slate-200/90">{active.def.description}</p>

              <p className="text-[11px] font-semibold text-amber-100/95 tabular-nums">
                โบนัสทั้งเซิร์ฟเวอร์: EXP +{active.expBonusPct}% · DROP +{active.dropBonusPct}% · Gold +{active.goldBonusPct}%
              </p>
              <p className="text-[10.5px] text-slate-400">
                ช่วงเวลา: {active.def.scheduleLabel} · หา{active.def.tokenName}และ{EVENT_TOKEN_NAME}ได้จากมอนสเตอร์ บอส และภารกิจ
              </p>
              <div className="pt-1">
                <PxButton
                  variant="secondary"
                  onClick={() => openPanel('activities')}
                  className="inline-flex items-center gap-1.5 border border-sky-400/60 bg-sky-950/60 text-sky-200 hover:bg-sky-900/70"
                >
                  <Swords className="size-3.5 text-sky-300" aria-hidden />
                  เปิดหน้ากิจกรรมพิเศษ (6 แมพวาร์ปเข้า-ออก)
                </PxButton>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 border border-white/15 bg-black/45 p-2.5 md:w-64">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                    <Ticket className="size-3.5 text-amber-300" aria-hidden />
                    {active.def.tokenName}
                  </span>
                  <span className="font-mono text-sm font-extrabold text-amber-300 tabular-nums">
                    {formatNum(tokenBalance)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-200">
                    <ItemIcon itemId="event_token" size={16} />
                    {EVENT_TOKEN_NAME}
                  </span>
                  <span className="font-mono text-sm font-extrabold text-sky-300 tabular-nums">
                    {formatNum(universalBalance)}
                  </span>
                </div>

                {bagEventTokens > 0 && (
                  <PxButton
                    variant="secondary"
                    onClick={handleDepositBagTokens}
                    className="w-full"
                  >
                    <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <ArrowDownToLine className="size-3.5 text-sky-300" aria-hidden />
                      ฝากเข้าคลัง (+{formatNum(bagEventTokens)})
                    </span>
                  </PxButton>
                )}
              </div>

              <div className="border-t border-white/10 pt-2">
                <p className="mb-1.5 text-[10.5px] text-slate-300 tabular-nums">
                  ของขวัญรายวัน: +{active.def.dailyGift.tokens} {active.def.tokenName} · +{dailyUniversalTokens} โทเคนกิจกรรม · +{formatNum(active.def.dailyGift.gold)} G · +{active.def.dailyGift.diamonds} เพชร
                </p>
                <PxButton
                  variant={dailyReady ? 'accent' : 'secondary'}
                  disabled={!dailyReady}
                  onClick={handleClaimDaily}
                  className="w-full"
                >
                  {dailyReady ? (
                    <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <Gift className="size-3.5" aria-hidden />
                      รับของขวัญเทศกาลวันนี้
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <Check className="size-3.5" aria-hidden />
                      รับของขวัญวันนี้แล้ว
                    </span>
                  )}
                </PxButton>
              </div>
            </div>
          </div>
        </motion.div>

        {notice && (
          <p
            role="status"
            className={cn(
              'border px-3 py-2 text-xs font-medium',
              notice.ok
                ? 'border-emerald-400/60 bg-emerald-950/40 text-emerald-200'
                : 'border-rose-400/60 bg-rose-950/40 text-rose-200',
            )}
          >
            {notice.text}
          </p>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1 border border-border bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => setTab('missions')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap',
                tab === 'missions'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Swords className="size-3.5" aria-hidden />
              ภารกิจกิจกรรม{claimableMissionsCount > 0 ? ` (${claimableMissionsCount})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setTab('shop')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap',
                tab === 'shop'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ShoppingBag className="size-3.5" aria-hidden />
              ร้านค้าเทศกาล
            </button>
            <button
              type="button"
              onClick={() => setTab('event-shop')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap',
                tab === 'event-shop'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ItemIcon itemId="event_token" size={14} />
              ร้านโทเคนกิจกรรม
            </button>
            <button
              type="button"
              onClick={() => setTab('calendar')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap',
                tab === 'calendar'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <CalendarDays className="size-3.5" aria-hidden />
              ปฏิทินกิจกรรมทั้งหมด
            </button>
          </div>

          {isGmDev && (
            <PxButton variant="secondary" onClick={() => openPanel('dev-tools')}>
              <Crown className="mr-1 inline size-3.5 text-amber-300" aria-hidden />
              ตั้งค่าเปิดกิจกรรม (GM)
            </PxButton>
          )}
        </div>

        {/* Tab 1: Event Missions */}
        {tab === 'missions' && (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground tabular-nums">
              <span>ความคืบหน้ารอบนี้: ล่ามอนสเตอร์ {formatNum(cycleProgress.kills)} ตัว · ปราบบอส/หอคอย {formatNum(cycleProgress.bossKills + cycleProgress.towerClears)} ครั้ง · เก็บเกี่ยว {formatNum(cycleProgress.gathers)} ครั้ง</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {active.def.missions.map((mission) => {
                const claimKey = getFestivalMissionClaimKey(active.cycleKey, mission.id)
                const claimed = Boolean(fest?.claimedMissionKeys.includes(claimKey))
                const rawProgress = getFestivalMissionMetricValue(cycleProgress, mission.metric)
                const current = Math.min(mission.target, rawProgress)
                const pct = Math.min(100, Math.round((current / Math.max(1, mission.target)) * 100))
                const ready = !claimed && current >= mission.target
                const missionUniversalTokens = Math.max(8, Math.round(mission.rewardTokens * 0.7))

                return (
                  <div
                    key={mission.id}
                    className={cn(
                      'flex flex-col justify-between gap-2.5 border-2 p-3 transition-colors',
                      claimed
                        ? 'border-border/60 bg-muted/25 opacity-75'
                        : ready
                          ? 'border-amber-400/70 bg-amber-950/20'
                          : 'border-border bg-muted/45',
                    )}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-foreground">{mission.title}</h4>
                        <span className="shrink-0 font-mono text-[11px] font-bold text-amber-300 tabular-nums">
                          {formatNum(current)} / {formatNum(mission.target)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{mission.description}</p>

                      <div className="h-2 w-full overflow-hidden border border-border bg-background/80">
                        <motion.div
                          initial={false}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className={cn('h-full', theme.barFill)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tabular-nums">
                        <span className="inline-flex items-center gap-1 text-amber-300">
                          <Ticket className="size-3" aria-hidden />
                          +{mission.rewardTokens}
                        </span>
                        <span className="inline-flex items-center gap-1 text-sky-300">
                          <ItemIcon itemId="event_token" size={14} />
                          +{missionUniversalTokens}
                        </span>
                        {mission.rewardGold > 0 && (
                          <span className="inline-flex items-center gap-1 text-gold">
                            <Coins className="size-3" aria-hidden />
                            +{formatNum(mission.rewardGold)} G
                          </span>
                        )}
                        {mission.rewardDiamonds > 0 && (
                          <span className="inline-flex items-center gap-1 text-cyan-300">
                            <Gem className="size-3" aria-hidden />
                            +{mission.rewardDiamonds} เพชร
                          </span>
                        )}
                      </div>

                      <PxButton
                        variant={ready ? 'accent' : 'secondary'}
                        disabled={!ready}
                        onClick={() => handleClaimMission(mission.id)}
                      >
                        {claimed ? 'รับแล้ว' : ready ? 'รับรางวัล' : 'ยังไม่ครบ'}
                      </PxButton>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Seasonal Token Exchange Shop */}
        {tab === 'shop' && (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border border-amber-400/35 bg-amber-950/15 px-3 py-2 text-xs">
              <span className="text-slate-200">
                ใช้ <strong className="text-amber-300">{active.def.tokenName}</strong> แลกของรางวัลพิเศษเฉพาะเทศกาล (แฟชั่นและฉายาที่แลกแล้วจะติดตั้งและเก็บถาวร)
              </span>
              <span className="font-mono font-bold text-amber-300 tabular-nums">
                คงเหลือ: {formatNum(tokenBalance)}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {active.def.shopRewards.map((reward) => {
                const purchaseKey = getFestivalShopPurchaseKey(active.cycleKey, reward.id)
                const boughtCount = fest?.shopPurchases[purchaseKey] ?? 0
                const limitReached = boughtCount >= reward.limitPerCycle
                const itemDef = reward.itemId ? ITEMS[reward.itemId] : null
                const cosDef = reward.cosmeticId ? getCosmeticDef(reward.cosmeticId) : null
                const titleDef = reward.titleId ? TITLE_DEFS.find((t) => t.id === reward.titleId) : null
                const alreadyOwnedCosmetic = Boolean(
                  reward.kind === 'cosmetic' &&
                    reward.cosmeticId &&
                    extV2.unlockedCosmetics.includes(reward.cosmeticId),
                )
                const alreadyOwnedTitle = Boolean(
                  reward.kind === 'title' && reward.titleId && rpgExt.titles.includes(reward.titleId),
                )
                const owned = alreadyOwnedCosmetic || alreadyOwnedTitle
                const canAfford = tokenBalance >= reward.costTokens
                const canBuy = !owned && !limitReached && canAfford

                return (
                  <div
                    key={reward.id}
                    className={cn(
                      'flex flex-col justify-between gap-2.5 border-2 p-3',
                      owned || limitReached
                        ? 'border-border/60 bg-muted/25 opacity-80'
                        : canAfford
                          ? 'border-border bg-muted/50 hover:border-amber-300/60'
                          : 'border-border bg-muted/35',
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="grid size-10 shrink-0 place-items-center border border-border bg-background/80">
                        {itemDef ? (
                          <ItemIcon itemId={itemDef.id} size={28} />
                        ) : cosDef ? (
                          <CosmeticIconThumb cosmeticId={cosDef.id} name={cosDef.name} />
                        ) : titleDef ? (
                          <Crown className="size-5 text-amber-300" aria-hidden />
                        ) : (
                          <Gem className="size-5 text-cyan-300" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="truncate text-xs font-bold text-foreground">{reward.name}</h4>
                          <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground tabular-nums">
                            {boughtCount}/{reward.limitPerCycle}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{reward.description}</p>
                        {cosDef && (
                          <p className="mt-1 text-[10px] font-semibold text-pink-300">
                            แฟชั่นถาวร: {cosDef.name}
                          </p>
                        )}
                        {titleDef && (
                          <p className="mt-1 text-[10px] font-semibold text-amber-300 tabular-nums">
                            โบนัสฉายา: +{titleDef.hpBonus} HP · +{titleDef.atkBonus} ATK · +{titleDef.defBonus} DEF · +{Math.round(titleDef.critBonus * 100)}% CRIT
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-amber-300 tabular-nums">
                        <Ticket className="size-3.5" aria-hidden />
                        {formatNum(reward.costTokens)} {active.def.tokenName}
                      </span>

                      <PxButton
                        variant={canBuy ? 'accent' : 'secondary'}
                        disabled={!canBuy}
                        onClick={() => handleExchangeReward(reward.id)}
                      >
                        {owned
                          ? 'ครอบครองแล้ว'
                          : limitReached
                            ? 'แลกครบสิทธิ์'
                            : canAfford
                              ? 'แลกรางวัล'
                              : 'โทเคนไม่พอ'}
                      </PxButton>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Universal Event Token Exchange */}
        {tab === 'event-shop' && (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border border-sky-400/40 bg-sky-950/20 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 text-slate-200">
                <ItemIcon itemId="event_token" size={20} />
                <span>
                  ใช้ <strong className="text-sky-300">{EVENT_TOKEN_NAME}</strong> แลกไอเทมกิจกรรม กล่องสุ่ม เครื่องราง และของสะสมถาวรได้ทุกฤดูกาล
                </span>
              </div>
              <div className="flex items-center gap-2">
                {bagEventTokens > 0 && (
                  <PxButton variant="secondary" onClick={handleDepositBagTokens}>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <ArrowDownToLine className="size-3 text-sky-300" aria-hidden />
                      ฝากจากกระเป๋า (+{formatNum(bagEventTokens)})
                    </span>
                  </PxButton>
                )}
                <span className="font-mono font-bold text-sky-300 tabular-nums">
                  คงเหลือ: {formatNum(universalBalance)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {EVENT_TOKEN_SHOP_REWARDS.map((reward) => {
                const cycleKey = getEventTokenShopCycleKey(reward, nowMs)
                const purchaseKey = getFestivalShopPurchaseKey(cycleKey, reward.id)
                const boughtCount = fest?.shopPurchases[purchaseKey] ?? 0
                const limitReached = boughtCount >= reward.limitPerCycle
                const itemDef = reward.itemId ? ITEMS[reward.itemId] : null
                const cosDef = reward.cosmeticId ? getCosmeticDef(reward.cosmeticId) : null
                const titleDef = reward.titleId ? TITLE_DEFS.find((t) => t.id === reward.titleId) : null
                const alreadyOwnedCosmetic = Boolean(
                  reward.kind === 'cosmetic' &&
                    reward.cosmeticId &&
                    extV2.unlockedCosmetics.includes(reward.cosmeticId),
                )
                const alreadyOwnedTitle = Boolean(
                  reward.kind === 'title' && reward.titleId && rpgExt.titles.includes(reward.titleId),
                )
                const owned = alreadyOwnedCosmetic || alreadyOwnedTitle
                const canAfford = universalBalance >= reward.costTokens
                const canBuy = !owned && !limitReached && canAfford

                return (
                  <div
                    key={reward.id}
                    className={cn(
                      'flex flex-col justify-between gap-2.5 border-2 p-3',
                      owned || limitReached
                        ? 'border-border/60 bg-muted/25 opacity-80'
                        : canAfford
                          ? 'border-border bg-muted/50 hover:border-sky-300/60'
                          : 'border-border bg-muted/35',
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="grid size-10 shrink-0 place-items-center border border-border bg-background/80">
                        {itemDef ? (
                          <ItemIcon itemId={itemDef.id} size={28} />
                        ) : cosDef ? (
                          <CosmeticIconThumb cosmeticId={cosDef.id} name={cosDef.name} />
                        ) : titleDef ? (
                          <Crown className="size-5 text-amber-300" aria-hidden />
                        ) : (
                          <Gem className="size-5 text-cyan-300" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="truncate text-xs font-bold text-foreground">{reward.name}</h4>
                          <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground tabular-nums">
                            {boughtCount}/{reward.limitPerCycle}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{reward.description}</p>
                        {cosDef && (
                          <p className="mt-1 text-[10px] font-semibold text-pink-300">
                            ของกิจกรรมถาวร: {cosDef.name}
                          </p>
                        )}
                        {titleDef && (
                          <p className="mt-1 text-[10px] font-semibold text-amber-300 tabular-nums">
                            โบนัสฉายา: +{titleDef.hpBonus} HP · +{titleDef.atkBonus} ATK · +{titleDef.defBonus} DEF · +{Math.round(titleDef.critBonus * 100)}% CRIT
                          </p>
                        )}
                        {!cosDef && !titleDef && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            จำกัดสัปดาห์ละ {reward.limitPerCycle} ครั้ง
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-sky-300 tabular-nums">
                        <ItemIcon itemId="event_token" size={16} />
                        {formatNum(reward.costTokens)} {EVENT_TOKEN_NAME}
                      </span>

                      <PxButton
                        variant={canBuy ? 'accent' : 'secondary'}
                        disabled={!canBuy}
                        onClick={() => handleExchangeUniversalReward(reward.id)}
                      >
                        {owned
                          ? 'ครอบครองแล้ว'
                          : limitReached
                            ? 'แลกครบสิทธิ์'
                            : canAfford
                              ? 'แลกรางวัล'
                              : 'โทเคนไม่พอ'}
                      </PxButton>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              <strong className="text-foreground">วิธีหาโทเคนกิจกรรม:</strong> ปราบมอนสเตอร์และบอสบนแมพ · รับของขวัญเทศกาลรายวัน · เคลียร์ภารกิจกิจกรรม · เปิดกล่องสุ่มของขวัญกิจกรรม (หากมีเหรียญในกระเป๋ากด &ldquo;ฝากเข้าคลัง&rdquo; หรือกดใช้จากกระเป๋าได้ทันที)
            </div>
          </div>
        )}

        {/* Tab 4: All Festivals & In-Game Schedule Calendar */}
        {tab === 'calendar' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <Sparkles className="size-3.5" aria-hidden />
                ปฏิทินเทศกาลตามฤดูกาล (เปิดอัตโนมัติตามเวลาไทย UTC+7)
              </h4>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {FESTIVAL_EVENTS.filter((e) => e.kind === 'seasonal').map((ev) => {
                  const isLive = active.def.id === ev.id
                  const evTokens = getFestivalTokenCount(fest, ev.id)
                  return (
                    <div
                      key={ev.id}
                      className={cn(
                        'space-y-1 border-2 p-2.5 text-xs',
                        isLive ? 'border-amber-400 bg-amber-950/25' : 'border-border bg-muted/40',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground">{ev.name}</span>
                        {isLive && (
                          <span className="border border-emerald-400/60 bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                            กำลังจัดอยู่
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-sky-300">{ev.scheduleLabel}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        EXP +{ev.expBonusPct}% · DROP +{ev.dropBonusPct}% · Gold +{ev.goldBonusPct}% · โทเคน: {ev.tokenName}
                        {evTokens > 0 ? ` (มี ${formatNum(evTokens)})` : ''}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                <Flame className="size-3.5" aria-hidden />
                กิจกรรมหมุนเวียนจากเกม (เปิดอัตโนมัติเมื่อไม่อยู่ในช่วงเทศกาล)
              </h4>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {FESTIVAL_EVENTS.filter((e) => e.kind === 'ingame').map((ev) => {
                  const isLive = active.def.id === ev.id
                  const evTokens = getFestivalTokenCount(fest, ev.id)
                  return (
                    <div
                      key={ev.id}
                      className={cn(
                        'space-y-1 border-2 p-2.5 text-xs',
                        isLive ? 'border-cyan-400 bg-cyan-950/25' : 'border-border bg-muted/40',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground">{ev.name}</span>
                        {isLive && (
                          <span className="border border-emerald-400/60 bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                            LIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-cyan-300">{ev.scheduleLabel}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        EXP +{ev.expBonusPct}% · DROP +{ev.dropBonusPct}% · Gold +{ev.goldBonusPct}%
                        {evTokens > 0 ? ` · มี ${formatNum(evTokens)}` : ''}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </PanelFrame>
  )
}
