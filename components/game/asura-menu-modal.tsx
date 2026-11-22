'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Star, X } from 'lucide-react'
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
import type { MenuIconId } from '@/lib/game/menu-icons'
import { TOPUP_MILESTONES } from '@/lib/game/premium/topup'
import { todayIsoDate } from '@/lib/game/rpg-systems'
import { countClaimableQuests } from '@/lib/game/systems'
import { canClaimDailyFreeChest } from '@/lib/game/treasure-chest'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { GameArtIcon, GameBadgeMedallion } from './game-badge-icon'

interface MenuGridEntry {
  id: string
  label: string
  iconId: MenuIconId
  tone: string
  panel?: PanelId
  href?: string
  badgeCount?: number
  badgeAlert?: boolean
  onClick?: () => void
}

function MenuCircleButton({ entry }: { entry: MenuGridEntry }) {
  const inner = (
    <>
      <GameBadgeMedallion
        iconId={entry.iconId}
        tone={entry.tone}
        size="md"
        badgeCount={entry.badgeCount}
        badgeAlert={entry.badgeAlert}
        className="group-hover:scale-105"
      />
      <span className="w-full truncate text-center text-[10.5px] font-bold text-slate-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
        {entry.label}
      </span>
    </>
  )

  if (entry.href) {
    return (
      <Link
        href={entry.href}
        prefetch={false}
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
      className="pointer-events-auto fixed inset-0 z-[75] flex items-center justify-center bg-black/75 p-3"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="asura-panel relative w-full max-w-lg overflow-hidden p-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#295596] pb-2.5">
          <div className="flex items-center gap-2">
            <GameArtIcon iconId="helper" size={24} />
            <div>
              <h3 className="text-sm font-bold text-white">ตัวช่วย Pixel Quest ประจำวัน</h3>
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
      a.download = `pixel-quest-screenshot-${Date.now()}.png`
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
      iconId: 'inventory',
      tone: 'border-amber-300/80 bg-[radial-gradient(circle_at_35%_28%,#85581e_0%,#422b0e_65%,#1f1306_100%)]',
      onClick: () => openAndClose('inventory'),
    },
    {
      id: 'character',
      label: 'สถานะ',
      iconId: 'status',
      tone: 'border-sky-300/80 bg-[radial-gradient(circle_at_35%_28%,#2f68a6_0%,#153459_65%,#0a192e_100%)]',
      badgeCount: p.statPoints ?? 0,
      onClick: () => openAndClose('character'),
    },
    {
      id: 'job',
      label: 'อาชีพ',
      iconId: 'job',
      tone: 'border-indigo-300/80 bg-[radial-gradient(circle_at_35%_28%,#4353a3_0%,#202857_65%,#0e122b_100%)]',
      onClick: () => openAndClose('job'),
    },
    {
      id: 'talents',
      label: 'ทักษะ',
      iconId: 'skills',
      tone: 'border-violet-300/80 bg-[radial-gradient(circle_at_35%_28%,#663da3_0%,#341d59_65%,#190d2e_100%)]',
      badgeCount: p.skillPoints ?? 0,
      onClick: () => openAndClose('talents'),
    },
    {
      id: 'spirit',
      label: 'จุติ/จุจิต',
      iconId: 'spirit',
      tone: 'border-cyan-300/85 bg-[radial-gradient(circle_at_35%_28%,#236d8c_0%,#113a4f_65%,#081c29_100%)]',
      badgeAlert: p.level >= 70 && (p.rebirthCount ?? 0) < 6,
      onClick: () => openAndClose('rebirth'),
    },
    {
      id: 'codex',
      label: 'ฉายา/สมุด',
      iconId: 'codex',
      tone: 'border-teal-300/80 bg-[radial-gradient(circle_at_35%_28%,#1d736e_0%,#0e3b38_65%,#061c1b_100%)]',
      onClick: () => openAndClose('codex'),
    },
    {
      id: 'wardrobe',
      label: 'แฟชั่น',
      iconId: 'wardrobe',
      tone: 'border-pink-300/80 bg-[radial-gradient(circle_at_35%_28%,#913764_0%,#4d1934_65%,#240b18_100%)]',
      onClick: () => openAndClose('wardrobe'),
    },
    {
      id: 'pets',
      label: 'สัตว์เลี้ยง',
      iconId: 'pets',
      tone: 'border-emerald-300/80 bg-[radial-gradient(circle_at_35%_28%,#23734e_0%,#103b27_65%,#071c12_100%)]',
      onClick: () => openAndClose('pets'),
    },
    {
      id: 'arena',
      label: 'อารีน่า',
      iconId: 'arena',
      tone: 'border-rose-300/80 bg-[radial-gradient(circle_at_35%_28%,#91343d_0%,#4a171c_65%,#240a0d_100%)]',
      onClick: () => openAndClose('arena'),
    },
    {
      id: 'lifeskills',
      label: 'ทักษะชีวิต',
      iconId: 'lifeskills',
      tone: 'border-lime-300/80 bg-[radial-gradient(circle_at_35%_28%,#3b7525_0%,#1c3b11_65%,#0c1c07_100%)]',
      onClick: () => openAndClose('lifeskills'),
    },
  ]

  const playEntries: MenuGridEntry[] = [
    {
      id: 'quests',
      label: 'ภารกิจ',
      iconId: 'quests',
      tone: 'border-amber-300/80 bg-[radial-gradient(circle_at_35%_28%,#8a591c_0%,#472b0c_65%,#211305_100%)]',
      badgeCount: claimableQuests,
      onClick: () => openAndClose('quests'),
    },
    {
      id: 'checkin',
      label: 'แสตมป์',
      iconId: 'checkin',
      tone: 'border-yellow-300/80 bg-[radial-gradient(circle_at_35%_28%,#876d1d_0%,#47380d_65%,#211a05_100%)]',
      onClick: () => {
        onClose()
        onOpenCheckin?.()
      },
    },
    {
      id: 'tower',
      label: 'อันดับ/หอคอย',
      iconId: 'tower',
      tone: 'border-cyan-300/80 bg-[radial-gradient(circle_at_35%_28%,#226b82_0%,#0f3747_65%,#071b24_100%)]',
      href: '/tower',
      onClick: onClose,
    },
    {
      id: 'enhance',
      label: 'ตีบวก',
      iconId: 'enhance',
      tone: 'border-orange-300/80 bg-[radial-gradient(circle_at_35%_28%,#8c461f_0%,#4a220e_65%,#241006_100%)]',
      onClick: () => openAndClose('enhance'),
    },
    {
      id: 'craft',
      label: 'คราฟต์',
      iconId: 'craft',
      tone: 'border-stone-300/80 bg-[radial-gradient(circle_at_35%_28%,#5e6673_0%,#2f343d_65%,#171a21_100%)]',
      onClick: () => openAndClose('craft'),
    },
    {
      id: 'market',
      label: 'ตลาดกลาง',
      iconId: 'market',
      tone: 'border-emerald-300/80 bg-[radial-gradient(circle_at_35%_28%,#1d755c_0%,#0d3d2f_65%,#061f18_100%)]',
      onClick: () => openAndClose('market'),
    },
    {
      id: 'guild',
      label: 'กิลด์ & บอส',
      iconId: 'guild',
      tone: 'border-blue-300/80 bg-[radial-gradient(circle_at_35%_28%,#2b578f_0%,#152d4d_65%,#0a1629_100%)]',
      onClick: () => openAndClose('guild'),
    },
    {
      id: 'dungeon',
      label: 'ดันเจี้ยน',
      iconId: 'dungeon',
      tone: 'border-purple-300/80 bg-[radial-gradient(circle_at_35%_28%,#5b3c8c_0%,#2e1c4a_65%,#160d24_100%)]',
      onClick: () => openAndClose('dungeon'),
    },
    {
      id: 'mail',
      label: 'จดหมาย',
      iconId: 'mail',
      tone: 'border-sky-300/80 bg-[radial-gradient(circle_at_35%_28%,#266891_0%,#12364d_65%,#081a26_100%)]',
      onClick: () => openAndClose('mail'),
    },
    {
      id: 'gem-shop',
      label: 'ร้านค้าโซล',
      iconId: 'soul-shop',
      tone: 'border-fuchsia-300/80 bg-[radial-gradient(circle_at_35%_28%,#7a368a_0%,#3e1947_65%,#1e0b24_100%)]',
      badgeCount: gemShopBadge,
      onClick: () => openAndClose('gem-shop'),
    },
    {
      id: 'pass',
      label: 'Battle Pass',
      iconId: 'bp-wings',
      tone: 'border-amber-300/80 bg-[radial-gradient(circle_at_35%_28%,#874539_0%,#47221c_65%,#24100d_100%)]',
      onClick: () => openAndClose('pass'),
    },
    {
      id: 'treasure-chest',
      label: 'หีบสมบัติ',
      iconId: 'npc-chest',
      badgeCount: canClaimDailyFreeChest(p.lastDailyFreeChestAt) ? 1 : 0,
      tone: 'border-yellow-300/85 bg-[radial-gradient(circle_at_35%_28%,#8f5b14_0%,#4a2e08_65%,#241604_100%)]',
      onClick: () => openAndClose('treasure-chest'),
    },
  ]

  const helperEntries: MenuGridEntry[] = [
    {
      id: 'party',
      label: 'ปาร์ตี้',
      iconId: 'party',
      tone: 'border-cyan-300/80 bg-[radial-gradient(circle_at_35%_28%,#226d8a_0%,#10394a_65%,#071b24_100%)]',
      badgeCount: partyInvites.length,
      onClick: () => openAndClose('party'),
    },
    {
      id: 'friends',
      label: 'เพื่อน',
      iconId: 'friends',
      tone: 'border-emerald-300/80 bg-[radial-gradient(circle_at_35%_28%,#227553_0%,#103b29_65%,#071c13_100%)]',
      onClick: () => openAndClose('friends'),
    },
    {
      id: 'helper',
      label: 'ตัวช่วย',
      iconId: 'helper',
      tone: 'border-amber-300/80 bg-[radial-gradient(circle_at_35%_28%,#85581e_0%,#422b0e_65%,#1f1306_100%)]',
      badgeAlert: claimableQuests > 0,
      onClick: () => {
        onClose()
        onOpenDailyHelper()
      },
    },
    {
      id: 'rate',
      label: 'ให้คะแนน',
      iconId: 'rate',
      tone: 'border-yellow-300/80 bg-[radial-gradient(circle_at_35%_28%,#8a671c_0%,#47340c_65%,#241a05_100%)]',
      onClick: () => setRatingOpen(true),
    },
    {
      id: 'screenshot',
      label: 'ถ่ายภาพ',
      iconId: 'camera',
      tone: 'border-sky-300/80 bg-[radial-gradient(circle_at_35%_28%,#2b628c_0%,#14324a_65%,#091826_100%)]',
      onClick: handleCaptureScreenshot,
    },
    {
      id: 'settings',
      label: 'ตั้งค่า',
      iconId: 'settings',
      tone: 'border-slate-300/80 bg-[radial-gradient(circle_at_35%_28%,#4c586b_0%,#252c38_65%,#12161c_100%)]',
      onClick: () => openAndClose('settings'),
    },
    {
      id: 'models',
      label: 'คลังโมเดล',
      iconId: 'models',
      tone: 'border-indigo-300/80 bg-[radial-gradient(circle_at_35%_28%,#414b8c_0%,#20254a_65%,#0e1124_100%)]',
      onClick: () => openAndClose('models'),
    },
    {
      id: 'guide',
      label: 'คู่มือเกม',
      iconId: 'guide',
      tone: 'border-teal-300/80 bg-[radial-gradient(circle_at_35%_28%,#1d706b_0%,#0e3836_65%,#061a19_100%)]',
      onClick: () => openAndClose('guide'),
    },
    {
      id: 'switch-char',
      label: 'สลับตัว',
      iconId: 'more',
      tone: 'border-rose-300/80 bg-[radial-gradient(circle_at_35%_28%,#85323d_0%,#45181e_65%,#210a0d_100%)]',
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
      iconId: 'dev-tools',
      tone: 'border-amber-300/85 bg-[radial-gradient(circle_at_35%_28%,#8c4120_0%,#471d0c_65%,#240d05_100%)]',
      onClick: () => openAndClose('dev-tools'),
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="เมนู Pixel Quest"
      className="pointer-events-auto fixed inset-0 z-[70] flex items-center justify-center bg-black/72 p-3"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="asura-panel relative flex max-h-[88dvh] w-full max-w-4xl flex-col overflow-hidden shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#295596] bg-[#162336]/95 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <GameArtIcon iconId="menu-castle" size={26} />
            <h2 className="text-sm font-bold text-white sm:text-base">เมนูระบบหลัก (Pixel Quest)</h2>
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
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 md:grid-cols-10">
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
