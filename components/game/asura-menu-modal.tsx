'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Award,
  Backpack,
  BookOpen,
  CalendarCheck,
  Camera,
  Castle,
  ClipboardCheck,
  Compass,
  Crown,
  Flame,
  Gem,
  Hammer,
  Info,
  Layers,
  LogOut,
  Mail,
  PawPrint,
  Pickaxe,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  Star,
  Store,
  Swords,
  Terminal,
  User,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useDailyMissions } from '@/lib/game/daily-missions'
import {
  ensurePremiumState,
  isCurrentAccountGm,
  openPanel,
  quitToTitle,
  saveGame,
  say,
  type PanelId,
} from '@/lib/game/engine'
import { TOPUP_MILESTONES } from '@/lib/game/premium/topup'
import { todayIsoDate } from '@/lib/game/rpg-systems'
import { countClaimableQuests } from '@/lib/game/systems'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'

interface MenuGridEntry {
  id: string
  label: string
  icon: typeof User
  tone: string
  panel?: PanelId
  href?: string
  badgeCount?: number
  badgeAlert?: boolean
  onClick?: () => void
}

function MenuCircleButton({ entry }: { entry: MenuGridEntry }) {
  const Icon = entry.icon
  const badgeVal = entry.badgeCount ?? 0
  const showAlert = Boolean(entry.badgeAlert || badgeVal > 0)

  const inner = (
    <>
      <span
        className={cn(
          'relative grid size-11 place-items-center rounded-full border-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_10px_rgba(0,0,0,0.45)] transition-transform duration-150 group-hover:scale-105 sm:size-12',
          entry.tone,
        )}
      >
        <Icon className="size-5 text-white drop-shadow sm:size-6" aria-hidden />
        {showAlert && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white/90 bg-rose-600 px-1 font-mono text-[9px] font-extrabold leading-none text-white shadow tabular-nums">
            {badgeVal > 0 ? (badgeVal > 9 ? '9+' : badgeVal) : '!'}
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-[10.5px] font-bold text-slate-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
        {entry.label}
      </span>
    </>
  )

  if (entry.href) {
    return (
      <Link
        href={entry.href}
        onClick={() => {
          saveGame()
          entry.onClick?.()
        }}
        className="group flex flex-col items-center gap-1 rounded-lg p-1.5 transition-colors hover:bg-white/5"
      >
        {inner}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={entry.onClick}
      className="group flex flex-col items-center gap-1 rounded-lg p-1.5 transition-colors hover:bg-white/5"
    >
      {inner}
    </button>
  )
}

export function AsuraDailyHelperModal({
  open,
  onClose,
  onOpenCheckin,
}: {
  open: boolean
  onClose: () => void
  onOpenCheckin?: () => void
}) {
  const { p } = useGame()
  const dailyMissions = useDailyMissions()

  if (!open || !p) return null

  const prem = ensurePremiumState(p)
  const bpLevel = p.extV2?.battlePass?.level ?? 1
  const today = todayIsoDate()
  const checkedInToday = (() => {
    try {
      const now = new Date()
      const localKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      return window.localStorage.getItem('pixel-quest-checkin-v2') === localKey
    } catch {
      return false
    }
  })()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ตัวช่วยภารกิจประจำวัน"
      className="pointer-events-auto fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-3 backdrop-blur-xs"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="asura-panel relative w-full max-w-lg overflow-hidden p-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#295596] pb-2.5">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-amber-300" aria-hidden />
            <div>
              <h3 className="text-sm font-bold text-white">ตัวช่วยอสุราประจำวัน</h3>
              <p className="text-[10.5px] text-sky-300">เช็กรายการรับรางวัลฟรีและโบนัสรายวัน ({today})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างตัวช่วย"
            className="rounded border border-rose-400/50 bg-rose-600/80 p-1 text-white hover:bg-rose-500"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="mt-3 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-[#284874] bg-[#0e1726]/90 p-2.5">
            <div>
              <p className="font-bold text-amber-200">1. เช็คอินรับแสตมป์รายวัน</p>
              <p className="text-[10.5px] text-slate-300">
                {checkedInToday ? 'รับรางวัลเช็คอินวันนี้เรียบร้อยแล้ว' : 'ยังไม่ได้รับรางวัลเช็คอินวันนี้!'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenCheckin?.()
              }}
              className={cn(
                'px-3 py-1.5 text-xs font-bold whitespace-nowrap',
                checkedInToday ? 'asura-tab' : 'asura-tab-active',
              )}
            >
              {checkedInToday ? 'ดูปฏิทิน' : 'เช็คอินเลย!'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-[#284874] bg-[#0e1726]/90 p-2.5">
            <div>
              <p className="font-bold text-emerald-300">2. ภารกิจรายวัน & เควสต์ ({dailyMissions.claimableCount} พร้อมรับ)</p>
              <p className="text-[10.5px] text-slate-300">รับ XP, ทอง และเพชรจากการล่ามอนสเตอร์ประจำวัน</p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose()
                openPanel('quests')
              }}
              className={cn(
                'px-3 py-1.5 text-xs font-bold whitespace-nowrap',
                dailyMissions.claimableCount > 0 ? 'asura-tab-active' : 'asura-tab',
              )}
            >
              เปิดภารกิจ
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-[#284874] bg-[#0e1726]/90 p-2.5">
            <div>
              <p className="font-bold text-cyan-300">3. หอคอยท้าทาย & Battle Pass (Lv.{bpLevel})</p>
              <p className="text-[10.5px] text-slate-300">ชั้นสูงสุด: {p.towerState?.highestFloor ?? 0} · VIP Lv.{prem.vip.vipLevel}</p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  openPanel('pass')
                }}
                className="asura-tab px-2.5 py-1.5 text-xs font-bold whitespace-nowrap"
              >
                BP
              </button>
              <Link
                href="/tower"
                onClick={() => {
                  saveGame()
                  onClose()
                }}
                className="asura-tab-active px-2.5 py-1.5 text-xs font-bold whitespace-nowrap"
              >
                ลงหอคอย
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AsuraMenuModal({
  open,
  onClose,
  onOpenCheckin,
  onOpenDailyHelper,
}: {
  open: boolean
  onClose: () => void
  onOpenCheckin?: () => void
  onOpenDailyHelper: () => void
}) {
  const { p, partyInvites, topupBadge } = useGame()
  const dailyMissions = useDailyMissions()
  const [ratingOpen, setRatingOpen] = useState(false)
  const [ratingDone, setRatingDone] = useState(0)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [open, onClose])

  if (!open || !p) return null

  const prem = ensurePremiumState(p)
  const today = todayIsoDate()
  const claimableMilestones = TOPUP_MILESTONES.filter(
    (m) => (prem.totalTopupThb ?? 0) >= m.thresholdThb && !(prem.claimedTopupMilestones ?? []).includes(m.id),
  ).length
  const claimableDailyTopup = prem.lastDailyTopupDate === today && prem.claimedDailyTopupDate !== today ? 1 : 0
  const isGmDev = Boolean(p.gm && isCurrentAccountGm())
  const gemShopBadge =
    topupBadge.approvedUnclaimed + (isGmDev ? topupBadge.gmPending : 0) + claimableMilestones + claimableDailyTopup
  const claimableQuests =
    countClaimableQuests(p.questState, p.towerState, p.petState, p.kills) + dailyMissions.claimableCount

  const openAndClose = (panel: PanelId) => {
    onClose()
    openPanel(panel)
  }

  const handleCaptureScreenshot = () => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-testid="game-canvas"]')
    if (!canvas) {
      say('system', 'ไม่พบหน้าจอเกมสำหรับถ่ายภาพ')
      onClose()
      return
    }
    try {
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `asura-screenshot-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      say('system', 'บันทึกภาพหน้าจอ (PNG) เรียบร้อยแล้ว!')
    } catch {
      say('system', 'ไม่สามารถถ่ายภาพหน้าจอได้ในขณะนี้')
    }
    onClose()
  }

  const charEntries: MenuGridEntry[] = [
    {
      id: 'inventory',
      label: 'สัมภาระ',
      icon: Backpack,
      tone: 'border-amber-300/75 bg-gradient-to-b from-amber-600/80 to-amber-900/90',
      onClick: () => openAndClose('inventory'),
    },
    {
      id: 'character',
      label: 'สถานะ',
      icon: User,
      tone: 'border-sky-300/75 bg-gradient-to-b from-sky-600/80 to-blue-900/90',
      badgeCount: p.statPoints ?? 0,
      onClick: () => openAndClose('character'),
    },
    {
      id: 'job',
      label: 'อาชีพ',
      icon: Crown,
      tone: 'border-indigo-300/75 bg-gradient-to-b from-indigo-600/80 to-indigo-950/90',
      onClick: () => openAndClose('job'),
    },
    {
      id: 'talents',
      label: 'ทักษะ',
      icon: Zap,
      tone: 'border-violet-300/75 bg-gradient-to-b from-violet-600/80 to-purple-950/90',
      badgeCount: p.skillPoints ?? 0,
      onClick: () => openAndClose('talents'),
    },
    {
      id: 'codex',
      label: 'ฉายา/สมุด',
      icon: BookOpen,
      tone: 'border-teal-300/75 bg-gradient-to-b from-teal-600/80 to-teal-950/90',
      onClick: () => openAndClose('codex'),
    },
    {
      id: 'wardrobe',
      label: 'แฟชั่น',
      icon: Sparkles,
      tone: 'border-pink-300/75 bg-gradient-to-b from-pink-600/80 to-rose-950/90',
      onClick: () => openAndClose('wardrobe'),
    },
    {
      id: 'pets',
      label: 'สัตว์เลี้ยง',
      icon: PawPrint,
      tone: 'border-emerald-300/75 bg-gradient-to-b from-emerald-600/80 to-emerald-950/90',
      onClick: () => openAndClose('pets'),
    },
    {
      id: 'arena',
      label: 'อารีน่า',
      icon: Swords,
      tone: 'border-rose-300/75 bg-gradient-to-b from-rose-600/80 to-red-950/90',
      onClick: () => openAndClose('arena'),
    },
    {
      id: 'lifeskills',
      label: 'ทักษะชีวิต',
      icon: Pickaxe,
      tone: 'border-lime-300/75 bg-gradient-to-b from-lime-600/80 to-green-950/90',
      onClick: () => openAndClose('lifeskills'),
    },
  ]

  const playEntries: MenuGridEntry[] = [
    {
      id: 'quests',
      label: 'ภารกิจ',
      icon: ScrollText,
      tone: 'border-amber-300/75 bg-gradient-to-b from-amber-500/85 to-orange-900/90',
      badgeCount: claimableQuests,
      onClick: () => openAndClose('quests'),
    },
    {
      id: 'checkin',
      label: 'แสตมป์',
      icon: CalendarCheck,
      tone: 'border-yellow-300/75 bg-gradient-to-b from-yellow-500/85 to-amber-900/90',
      onClick: () => {
        onClose()
        onOpenCheckin?.()
      },
    },
    {
      id: 'tower',
      label: 'อันดับ/หอคอย',
      icon: Castle,
      tone: 'border-cyan-300/75 bg-gradient-to-b from-cyan-600/80 to-blue-950/90',
      href: '/tower',
      onClick: onClose,
    },
    {
      id: 'enhance',
      label: 'ตีบวก',
      icon: Flame,
      tone: 'border-orange-300/75 bg-gradient-to-b from-orange-600/80 to-red-950/90',
      onClick: () => openAndClose('enhance'),
    },
    {
      id: 'craft',
      label: 'คราฟต์',
      icon: Hammer,
      tone: 'border-stone-300/75 bg-gradient-to-b from-stone-600/80 to-slate-900/90',
      onClick: () => openAndClose('craft'),
    },
    {
      id: 'market',
      label: 'ตลาดกลาง',
      icon: Store,
      tone: 'border-emerald-300/75 bg-gradient-to-b from-emerald-600/80 to-teal-950/90',
      onClick: () => openAndClose('market'),
    },
    {
      id: 'guild',
      label: 'กิลด์ & บอส',
      icon: Shield,
      tone: 'border-blue-300/75 bg-gradient-to-b from-blue-600/80 to-slate-900/90',
      onClick: () => openAndClose('guild'),
    },
    {
      id: 'dungeon',
      label: 'ดันเจี้ยน',
      icon: Compass,
      tone: 'border-purple-300/75 bg-gradient-to-b from-purple-600/80 to-indigo-950/90',
      onClick: () => openAndClose('dungeon'),
    },
    {
      id: 'mail',
      label: 'จดหมาย',
      icon: Mail,
      tone: 'border-sky-300/75 bg-gradient-to-b from-sky-500/80 to-blue-950/90',
      onClick: () => openAndClose('mail'),
    },
    {
      id: 'gem-shop',
      label: 'ร้านค้าโซล',
      icon: Gem,
      tone: 'border-fuchsia-300/75 bg-gradient-to-b from-fuchsia-600/80 to-purple-950/90',
      badgeCount: gemShopBadge,
      onClick: () => openAndClose('gem-shop'),
    },
    {
      id: 'pass',
      label: 'Battle Pass',
      icon: Award,
      tone: 'border-amber-300/75 bg-gradient-to-b from-amber-600/80 to-rose-900/90',
      onClick: () => openAndClose('pass'),
    },
  ]

  const helperEntries: MenuGridEntry[] = [
    {
      id: 'party',
      label: 'ปาร์ตี้',
      icon: Users,
      tone: 'border-cyan-300/75 bg-gradient-to-b from-cyan-600/80 to-blue-950/90',
      badgeCount: partyInvites.length,
      onClick: () => openAndClose('party'),
    },
    {
      id: 'friends',
      label: 'เพื่อน',
      icon: UserPlus,
      tone: 'border-emerald-300/75 bg-gradient-to-b from-emerald-600/80 to-green-950/90',
      onClick: () => openAndClose('friends'),
    },
    {
      id: 'helper',
      label: 'ตัวช่วย',
      icon: ClipboardCheck,
      tone: 'border-amber-300/75 bg-gradient-to-b from-amber-600/80 to-amber-950/90',
      badgeAlert: claimableQuests > 0,
      onClick: () => {
        onClose()
        onOpenDailyHelper()
      },
    },
    {
      id: 'rate',
      label: 'ให้คะแนน',
      icon: Star,
      tone: 'border-yellow-300/75 bg-gradient-to-b from-yellow-500/80 to-orange-900/90',
      onClick: () => setRatingOpen(true),
    },
    {
      id: 'screenshot',
      label: 'ถ่ายภาพ',
      icon: Camera,
      tone: 'border-sky-300/75 bg-gradient-to-b from-sky-600/80 to-slate-900/90',
      onClick: handleCaptureScreenshot,
    },
    {
      id: 'settings',
      label: 'ตั้งค่า',
      icon: Settings,
      tone: 'border-slate-300/75 bg-gradient-to-b from-slate-600/80 to-slate-900/90',
      onClick: () => openAndClose('settings'),
    },
    {
      id: 'models',
      label: 'คลังโมเดล',
      icon: Layers,
      tone: 'border-indigo-300/75 bg-gradient-to-b from-indigo-600/80 to-slate-900/90',
      onClick: () => openAndClose('models'),
    },
    {
      id: 'guide',
      label: 'คู่มือเกม',
      icon: Info,
      tone: 'border-teal-300/75 bg-gradient-to-b from-teal-600/80 to-slate-900/90',
      onClick: () => openAndClose('guide'),
    },
    {
      id: 'switch-char',
      label: 'สลับตัว',
      icon: LogOut,
      tone: 'border-rose-300/75 bg-gradient-to-b from-rose-600/80 to-rose-950/90',
      onClick: () => {
        onClose()
        quitToTitle()
      },
    },
  ]

  if (isGmDev) {
    helperEntries.push({
      id: 'dev-tools',
      label: 'Dev Console',
      icon: Terminal,
      tone: 'border-amber-300/80 bg-gradient-to-b from-amber-500/85 to-red-900/90',
      onClick: () => openAndClose('dev-tools'),
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="เมนูอสุรา"
      className="pointer-events-auto fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-3 backdrop-blur-xs"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="asura-panel relative flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#295596] bg-[#162336]/95 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full border border-sky-300/60 bg-sky-600/40 text-xs font-bold text-amber-300">
              อ
            </span>
            <h2 className="text-sm font-bold text-white sm:text-base">เมนูระบบหลัก (อสุราออนไลน์)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างเมนู"
            className="rounded border border-rose-400/50 bg-rose-600/80 p-1 text-white hover:bg-rose-500"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
          {ratingOpen && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-400/50 bg-amber-950/35 px-3 py-2 text-xs">
              <span className="font-bold text-amber-200">ให้คะแนนความสนุกของเกม:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      setRatingDone(star)
                      say('system', `ขอบคุณที่ให้คะแนน ${star} ดาว!`)
                    }}
                    className="p-0.5 transition-transform hover:scale-110"
                    aria-label={`ให้ ${star} ดาว`}
                  >
                    <Star
                      className={cn(
                        'size-5',
                        star <= ratingDone ? 'fill-amber-400 text-amber-300' : 'text-slate-400',
                      )}
                    />
                  </button>
                ))}
                {ratingDone > 0 && <span className="ml-2 font-bold text-emerald-300">ขอบคุณครับ!</span>}
              </div>
            </div>
          )}

          <section className="space-y-2 rounded-lg border border-[#26446e]/80 bg-[#0d1522]/85 p-3">
            <h3 className="border-b border-[#26446e]/60 pb-1 text-xs font-bold tracking-wide text-sky-300">
              หมวดตัวละคร
            </h3>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-9">
              {charEntries.map((entry) => (
                <MenuCircleButton key={entry.id} entry={entry} />
              ))}
            </div>
          </section>

          <section className="space-y-2 rounded-lg border border-[#26446e]/80 bg-[#0d1522]/85 p-3">
            <h3 className="border-b border-[#26446e]/60 pb-1 text-xs font-bold tracking-wide text-amber-300">
              หมวดส่งเสริมการเล่น
            </h3>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-11">
              {playEntries.map((entry) => (
                <MenuCircleButton key={entry.id} entry={entry} />
              ))}
            </div>
          </section>

          <section className="space-y-2 rounded-lg border border-[#26446e]/80 bg-[#0d1522]/85 p-3">
            <h3 className="border-b border-[#26446e]/60 pb-1 text-xs font-bold tracking-wide text-emerald-300">
              หมวดตัวช่วย
            </h3>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-10">
              {helperEntries.map((entry) => (
                <MenuCircleButton key={entry.id} entry={entry} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
