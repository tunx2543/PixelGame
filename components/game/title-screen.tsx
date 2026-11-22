'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  AlertTriangle,
  Check,
  Copy,
  Plus,
  RefreshCw,
  RotateCw,
  Sparkles,
  Trash2,
  UploadCloud,
  UserCheck,
  UserCog,
  X,
} from 'lucide-react'
import { auth } from '@/lib/firebase/client'
import {
  CHARACTER_SLOTS,
  ensureUserProfile,
  importGuestSaveToSlot,
  type CharacterSlotId,
  type CloudCharacterRecord,
  type UserAccountIdentity,
} from '@/lib/firebase/characters'
import { syncLatestMonsterAssetsAndFirestore } from '@/lib/firebase/monster-sync'
import { PERMANENT_GM_UID } from '@/lib/game/permissions'
import { JOBS, normalizeJobId } from '@/lib/game/data'
import { MODEL_DIRS, type ModelDir } from '@/lib/game/models-2d'
import {
  SAVE_KEY,
  deleteAccountCharacter,
  deleteSave,
  flushCloudSave,
  game,
  getPlayerAttributeBreakdown,
  getStats,
  listAccountCharacters,
  listRecoverableLocalSaves,
  loadCloudGame,
  loadGame,
  newGame,
  notify,
  readSave,
  setActiveCharacterSlot,
  setGameAccountIdentity,
  type RecoverableLocalSave,
  type SaveData,
} from '@/lib/game/engine'
import { useGame } from '@/lib/game/use-game'
import { openChangelogModal, useVersionUpdate } from '@/lib/game/use-version-update'
import { resolveFashionLoadoutFromSave } from '@/lib/game/fashion-renderer'
import { MAPS } from '@/lib/game/maps'
import { cn } from '@/lib/utils'
import { AccountPanel } from './account-panel'
import { formatNum } from './format'
import { GameArtIcon } from './game-badge-icon'
import { PWAInstallButton } from './pwa-controls'
import { SpriteModelCanvas, type PreviewAction } from './sprite-model-canvas'

function CelestialBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden select-none">
      {/* Bright celestial sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#7cc9ea] via-[#bfe9f8] to-[#eef8fd]" />

      {/* Distant mountain peak */}
      <svg
        viewBox="0 0 1200 320"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-[8%] h-52 w-full opacity-55"
      >
        <polygon points="360,300 540,70 620,175 680,105 840,300" fill="#6f95ab" />
        <polygon points="540,70 620,175 565,200" fill="#92b5c8" />
        <polygon points="680,105 840,300 715,260" fill="#52788f" />
      </svg>

      {/* Left & Right Marble Temple Pillars */}
      <div className="absolute left-[14%] top-[6%] hidden h-44 w-10 rounded-t bg-gradient-to-r from-slate-300 via-slate-100 to-slate-400 opacity-75 shadow-lg md:block">
        <div className="-mx-2 h-4 rounded bg-gradient-to-b from-slate-200 to-slate-400" />
      </div>
      <div className="absolute right-[14%] top-[6%] hidden h-44 w-10 rounded-t bg-gradient-to-r from-slate-300 via-slate-100 to-slate-400 opacity-75 shadow-lg md:block">
        <div className="-mx-2 h-4 rounded bg-gradient-to-b from-slate-200 to-slate-400" />
      </div>

      {/* Marble guardian wing silhouettes on side pillars */}
      <svg viewBox="0 0 220 420" className="absolute -left-6 top-6 hidden h-[78%] w-56 opacity-45 lg:block">
        <path d="M20,380 L40,170 C10,120 8,40 45,15 C70,40 92,90 95,150 C125,115 168,85 200,90 C180,145 145,195 110,225 L118,380 Z" fill="#dbe6ee" stroke="#9fb4c4" strokeWidth="3" />
      </svg>
      <svg viewBox="0 0 220 420" className="absolute -right-6 top-6 hidden h-[78%] w-56 -scale-x-100 opacity-45 lg:block">
        <path d="M20,380 L40,170 C10,120 8,40 45,15 C70,40 92,90 95,150 C125,115 168,85 200,90 C180,145 145,195 110,225 L118,380 Z" fill="#dbe6ee" stroke="#9fb4c4" strokeWidth="3" />
      </svg>

      {/* Soft celestial cloud veil */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_20%_60%,rgba(255,255,255,0.85),transparent_55%),radial-gradient(ellipse_at_80%_65%,rgba(255,255,255,0.85),transparent_55%),radial-gradient(ellipse_at_50%_95%,rgba(220,242,252,0.92),transparent_70%)]" />
    </div>
  )
}

function WindChimeSelectionAura() {
  return (
    <div aria-hidden className="pointer-events-none absolute -top-14 left-1/2 flex -translate-x-1/2 flex-col items-center">
      <div className="h-24 w-16 rounded-full bg-gradient-to-b from-cyan-300/35 via-sky-200/20 to-amber-300/30 blur-md" />
      <svg viewBox="0 0 44 64" className="absolute -top-2 h-14 w-10 drop-shadow-[0_0_8px_rgba(56,189,248,0.75)]">
        <circle cx="22" cy="14" r="11" fill="#38bdf8" fillOpacity="0.65" stroke="#e0f2fe" strokeWidth="2" />
        <path d="M12,15 Q22,20 32,15" fill="none" stroke="#bae6fd" strokeWidth="1.5" />
        <line x1="22" y1="25" x2="22" y2="33" stroke="#e0f2fe" strokeWidth="1.5" />
        <rect x="15" y="33" width="14" height="24" rx="2" fill="#0ea5e9" fillOpacity="0.85" stroke="#fde68a" strokeWidth="1.5" />
        <circle cx="22" cy="43" r="3" fill="#fef08a" />
      </svg>
    </div>
  )
}

export function TitleScreen() {
  const { kickedNotice } = useGame()
  const versionInfo = useVersionUpdate()
  const [user, setUser] = useState<User | null>(null)
  const [accountIdentity, setAccountIdentity] = useState<UserAccountIdentity | null>(null)
  const [cloudChars, setCloudChars] = useState<CloudCharacterRecord[]>([])
  const [guestSave, setGuestSave] = useState<SaveData | null>(null)
  const [recoverableSaves, setRecoverableSaves] = useState<RecoverableLocalSave[]>([])
  const [selectedSlotId, setSelectedSlotId] = useState<CharacterSlotId>('slot_1')
  const [createOpen, setCreateOpen] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [noviceAction, setNoviceAction] = useState<PreviewAction>('auto')
  const [noviceDir, setNoviceDir] = useState<ModelDir>('down')
  const [selectedSlotForNew, setSelectedSlotForNew] = useState<CharacterSlotId>('slot_1')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [copiedCid, setCopiedCid] = useState(false)
  const [isLoadingSave, setIsLoadingSave] = useState(true)
  const [importingKey, setImportingKey] = useState<string | null>(null)
  const [cloudError, setCloudError] = useState('')

  const computeRecoverables = (currentUserId: string, cloudList: CloudCharacterRecord[]) => {
    const cloudSignatures = new Set(
      cloudList.map((c) => `${c.name}:${c.level}:${Math.floor(c.playTime)}`),
    )
    return listRecoverableLocalSaves(currentUserId).filter((entry) => {
      const sig = `${entry.saveData.name}:${entry.saveData.level}:${Math.floor(entry.saveData.playTime || 0)}`
      return !cloudSignatures.has(sig)
    })
  }

  const refreshCharacters = useCallback(async (currentUser: User | null) => {
    setIsLoadingSave(true)
    setConfirmDeleteId(null)
    setCloudError('')
    try {
      await Promise.all([flushCloudSave(), syncLatestMonsterAssetsAndFirestore()])
      if (currentUser) {
        const identity = await ensureUserProfile(currentUser)
        setAccountIdentity(identity)
        const parsedUid = Number(identity.gameUid)
        const numericUid = identity.isGm
          ? PERMANENT_GM_UID
          : Number.isSafeInteger(parsedUid)
            ? parsedUid
            : undefined
        setGameAccountIdentity(currentUser.uid, numericUid, identity.gameUid, identity.isGm)
        const list = await listAccountCharacters()
        if (list.length === 0) {
          const migrated = await loadCloudGame()
          if (migrated) {
            const updatedList = await listAccountCharacters()
            setCloudChars(updatedList)
            setRecoverableSaves(computeRecoverables(currentUser.uid, updatedList))
            if (updatedList[0]) setSelectedSlotId(updatedList[0].id as CharacterSlotId)
            setCreateOpen(updatedList.length === 0)
          } else {
            setCloudChars([])
            setRecoverableSaves(computeRecoverables(currentUser.uid, []))
            setSelectedSlotForNew('slot_1')
            setCreateOpen(false)
          }
        } else {
          setCloudChars(list)
          setRecoverableSaves(computeRecoverables(currentUser.uid, list))
          setSelectedSlotId((prev) =>
            list.some((c) => c.id === prev) ? prev : (list[0].id as CharacterSlotId),
          )
          setCreateOpen(false)
        }
      } else {
        setAccountIdentity(null)
        setGameAccountIdentity(null)
        setActiveCharacterSlot('slot_1')
        setCloudChars([])
        setRecoverableSaves([])
        const local = await loadCloudGame()
        setGuestSave(local)
        setSelectedSlotId('slot_1')
        setCreateOpen(false)
      }
    } catch (error) {
      console.error('Failed to load cloud characters:', error)
      if (currentUser) {
        const reason = error instanceof Error && !error.message.startsWith('{') ? error.message : ''
        setCloudError(reason || 'ไม่สามารถโหลดข้อมูลตัวละครจากคลาวด์ได้ กรุณาลองใหม่อีกครั้ง')
      }
      const fallback = readSave()
      setGuestSave(fallback)
      setSelectedSlotId('slot_1')
    } finally {
      setIsLoadingSave(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    let resolvedAuth = false
    const authFallbackTimer = window.setTimeout(() => {
      if (!active || resolvedAuth) return
      const fallback = readSave()
      setGuestSave(fallback)
      setIsLoadingSave(false)
    }, 3500)

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!active) return
      resolvedAuth = true
      window.clearTimeout(authFallbackTimer)
      setUser(nextUser)
      void refreshCharacters(nextUser)
    })
    return () => {
      active = false
      window.clearTimeout(authFallbackTimer)
      unsubscribe()
    }
  }, [refreshCharacters])

  const hasAutoStartedRef = useRef(false)

  const handleAuthSuccess = useCallback(
    (signedInUser: User) => {
      setAccountModalOpen(false)
      void refreshCharacters(signedInUser)
    },
    [refreshCharacters],
  )

  const applyAccountIdentityToEngine = useCallback(
    (targetUser: User) => {
      if (accountIdentity && accountIdentity.uid === targetUser.uid) {
        const parsedUid = Number(accountIdentity.gameUid)
        const numericUid = accountIdentity.isGm
          ? PERMANENT_GM_UID
          : Number.isSafeInteger(parsedUid)
            ? parsedUid
            : undefined
        setGameAccountIdentity(targetUser.uid, numericUid, accountIdentity.gameUid, accountIdentity.isGm)
      } else {
        setGameAccountIdentity(targetUser.uid)
      }
    },
    [accountIdentity],
  )

  const startNewCharacter = () => {
    if (isLoadingSave) return
    if (user) {
      applyAccountIdentityToEngine(user)
      setActiveCharacterSlot(selectedSlotForNew)
    } else {
      setGameAccountIdentity(null)
      setActiveCharacterSlot('slot_1')
      if (guestSave) deleteSave()
    }
    newGame(name, 'novice')
    setName('')
  }

  const loginWithCloudCharacter = useCallback(
    (char: CloudCharacterRecord) => {
      if (!user || isLoadingSave) return
      applyAccountIdentityToEngine(user)
      setActiveCharacterSlot(char.id)
      loadGame(char.saveData)
    },
    [applyAccountIdentityToEngine, isLoadingSave, user],
  )

  useEffect(() => {
    if (isLoadingSave || hasAutoStartedRef.current || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('autostart') !== '1') return
    hasAutoStartedRef.current = true
    if (user && cloudChars.length > 0) {
      loginWithCloudCharacter(cloudChars[0])
      return
    }
    if (!user && guestSave) {
      setGameAccountIdentity(null)
      setActiveCharacterSlot('slot_1')
      loadGame(guestSave)
      return
    }
    if (!user && !guestSave) {
      setGameAccountIdentity(null)
      setActiveCharacterSlot('slot_1')
      newGame('นักผจญภัย')
    }
  }, [cloudChars, guestSave, isLoadingSave, loginWithCloudCharacter, user])

  const handleImportRecoverableSave = async (entry: RecoverableLocalSave) => {
    if (!user || importingKey || cloudChars.length >= CHARACTER_SLOTS.length) return
    const used = new Set(cloudChars.map((c) => c.id))
    const targetSlot = CHARACTER_SLOTS.find((slot) => !used.has(slot)) ?? 'slot_1'
    setImportingKey(entry.storageKey)
    setCloudError('')
    try {
      await importGuestSaveToSlot(user.uid, targetSlot, entry.saveData)
      if (entry.storageKey === SAVE_KEY) {
        localStorage.setItem(`${SAVE_KEY}:legacy-claimed-by`, user.uid)
      }
      await refreshCharacters(user)
    } catch (error) {
      console.error('Failed to import local character:', error)
      setCloudError('นำเข้าตัวละครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setImportingKey(null)
    }
  }

  const handleDeleteCloudCharacter = async (slotId: string) => {
    if (!user) return
    setIsLoadingSave(true)
    setCloudError('')
    try {
      await deleteAccountCharacter(slotId)
      await refreshCharacters(user)
    } catch (error) {
      console.error('Failed to delete cloud character:', error)
      setCloudError('ไม่สามารถลบตัวละครบนคลาวด์ได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setConfirmDeleteId(null)
      setIsLoadingSave(false)
    }
  }

  const handleDeleteGuestSave = () => {
    deleteSave()
    setGuestSave(null)
    setConfirmDeleteId(null)
  }

  // Active selected character summary for Left Asura Info Card
  const activeCloudChar = user
    ? cloudChars.find((c) => c.id === selectedSlotId) ?? cloudChars[0] ?? null
    : null
  const activeSave: SaveData | null = user ? activeCloudChar?.saveData ?? null : guestSave

  const activeStats = useMemo(() => (activeSave ? getStats(activeSave) : null), [activeSave])
  const activeAttrs = useMemo(
    () => (activeSave ? getPlayerAttributeBreakdown(activeSave).total : null),
    [activeSave],
  )

  const charCount = user ? cloudChars.length : guestSave ? 1 : 0
  const displayAccountUid = accountIdentity?.gameUid ?? activeSave?.gameUid ?? 'Guest'
  const activeCid = activeSave?.gameUid ?? String(activeSave?.uid ?? '100001')

  const handleEnterSelectedGame = () => {
    if (isLoadingSave) return
    if (user) {
      if (activeCloudChar) {
        loginWithCloudCharacter(activeCloudChar)
      } else {
        setSelectedSlotForNew('slot_1')
        setCreateOpen(true)
      }
      return
    }
    if (guestSave) {
      setGameAccountIdentity(null)
      setActiveCharacterSlot('slot_1')
      loadGame(guestSave)
      return
    }
    setSelectedSlotForNew('slot_1')
    setCreateOpen(true)
  }

  const handleCopyCid = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(activeCid)
    }
    setCopiedCid(true)
    window.setTimeout(() => setCopiedCid(false), 1500)
  }

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-y-auto p-3 sm:p-5">
      <CelestialBackdrop />

      {/* Top Row: Version / Quick Navigation Strip */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-[#3a68a8]/80 bg-[#152030]/90 px-3 py-1 font-[family-name:var(--font-display)] text-sm font-extrabold tracking-wide text-amber-300 shadow">
            LUMIVARA
          </span>
          <button
            type="button"
            onClick={() => openChangelogModal()}
            data-testid="title-version-badge"
            className="flex items-center gap-1.5 rounded-lg border border-[#3a68a8]/70 bg-[#152030]/85 px-2.5 py-1 text-[11px] font-semibold text-sky-100 shadow hover:brightness-110"
          >
            <span className="font-mono font-bold text-amber-300">v{versionInfo.currentVersion}</span>
            <span>บันทึกอัปเดต</span>
            {versionInfo.updateAvailable && (
              <span className="rounded bg-emerald-500/25 px-1 text-[10px] font-bold text-emerald-300">
                ใหม่!
              </span>
            )}
          </button>
          <PWAInstallButton variant="title" />
        </div>

        <nav aria-label="เมนูลัดโหมดฝึกฝน" className="hidden flex-wrap items-center gap-1.5 md:flex">
          {(
            [
              ['/inventory', 'คลังไอเทม'],
              ['/treasure-chest', 'หีบสมบัติ'],
              ['/tower', 'หอคอย'],
              ['/encounter', 'ล่ามอนสเตอร์'],
              ['/class-selector', 'สายอาชีพ'],
              ['/models', 'คลังโมเดล'],
            ] as const
          ).map(([href, lbl]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-[#325b94]/70 bg-[#141f2e]/85 px-2.5 py-1 text-[11px] font-semibold text-slate-200 shadow hover:border-sky-400 hover:text-white"
            >
              {lbl}
            </Link>
          ))}
        </nav>
      </div>

      {/* Kicked / Cloud Notices */}
      {(kickedNotice || (user && cloudError) || (user && recoverableSaves.length > 0)) && (
        <div className="relative z-10 mx-auto my-2 flex w-full max-w-xl flex-col gap-2">
          {kickedNotice && (
            <div className="flex items-start justify-between gap-2 rounded-lg border border-rose-400 bg-rose-950/90 p-2.5 text-xs text-rose-100 shadow-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-300" aria-hidden />
                <div>
                  <p className="font-bold">คุณถูก GM ตัดการเชื่อมต่อออกจากเกม</p>
                  <p className="text-[11px] opacity-90">{kickedNotice}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  game.kickedNotice = null
                  notify()
                }}
                aria-label="ปิดแจ้งเตือน"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          )}

          {user && cloudError && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-400 bg-rose-950/90 p-2.5 text-xs text-rose-100">
              <span>{cloudError}</span>
              <button
                type="button"
                onClick={() => void refreshCharacters(user)}
                className="asura-tab-active px-2.5 py-1 text-[11px] font-bold"
              >
                ลองใหม่
              </button>
            </div>
          )}

          {user &&
            cloudChars.length < CHARACTER_SLOTS.length &&
            recoverableSaves.slice(0, 2).map((entry) => (
              <div
                key={entry.storageKey}
                className="flex items-center justify-between gap-2 rounded-lg border border-sky-400/60 bg-[#152234]/95 p-2.5 text-[11px] text-sky-100 shadow"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-amber-300">
                    พบ{entry.sourceLabel}: {entry.saveData.name} (Lv.{entry.saveData.level})
                  </p>
                  <p className="text-[10px] text-slate-300">
                    {JOBS[normalizeJobId(entry.saveData.jobId)].name} • นำเข้าขึ้นบัญชีของคุณได้ทันที
                  </p>
                </div>
                <button
                  type="button"
                  disabled={importingKey !== null}
                  onClick={() => void handleImportRecoverableSave(entry)}
                  className="asura-tab-active flex shrink-0 items-center gap-1 px-2.5 py-1 font-bold disabled:opacity-50"
                >
                  <UploadCloud className="size-3.5" aria-hidden />
                  {importingKey === entry.storageKey ? 'กำลังนำเข้า...' : 'นำเข้า'}
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Main Middle Area: Left Character Info Card + Center 3 Pedestals */}
      <div className="relative z-10 my-auto grid items-center gap-5 py-2 lg:grid-cols-[17.5rem_1fr]">
        {/* Left Character Card + Bottom-Left Actions */}
        <div className="flex flex-col gap-2.5">
          <div className="rounded-xl border-2 border-[#325d99]/90 bg-[#151e2c]/95 p-3 text-slate-100 shadow-2xl">
            {isLoadingSave ? (
              <p role="status" className="py-12 text-center text-xs text-slate-300">
                กำลังโหลดข้อมูลตัวละคร...
              </p>
            ) : activeSave && activeStats && activeAttrs ? (
              <div className="space-y-2.5 text-xs">
                {/* Level + Name + cid + copy */}
                <div className="flex items-start justify-between gap-2 border-b border-[#2a4a78] pb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0 font-[family-name:var(--font-display)] text-2xl font-extrabold text-amber-400 drop-shadow tabular-nums">
                      L{activeSave.level}
                    </span>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-bold text-white">{activeSave.name}</p>
                      <p className="font-mono text-[11px] text-slate-300 tabular-nums">cid:{activeCid}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCid}
                    className="flex shrink-0 items-center gap-1 rounded border border-sky-400/50 bg-[#1d2e47] px-2 py-0.5 text-[10px] font-bold text-sky-300 hover:brightness-115"
                  >
                    {copiedCid ? <Check className="size-3 text-emerald-300" aria-hidden /> : <Copy className="size-3" aria-hidden />}
                    {copiedCid ? 'copied' : 'copy'}
                  </button>
                </div>

                {/* Race & Class */}
                <div className="space-y-1.5 border-b border-[#2a4a78] pb-2">
                  <div className="flex items-center gap-2.5">
                    <GameArtIcon iconId="race-human" size={22} />
                    <span className="font-semibold text-slate-100">เผ่ามนุษย์</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <GameArtIcon iconId="class-star" size={22} />
                    <span className="font-semibold text-amber-300">
                      {JOBS[normalizeJobId(activeSave.jobId)].name}
                    </span>
                  </div>
                </div>

                {/* 2-col 8-cell Attributes Table */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-b border-[#2a4a78] pb-2 text-xs tabular-nums">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-300">HP</span>
                    <b className="text-white">{formatNum(activeStats.maxHp)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-300">MP</span>
                    <b className="text-white">{formatNum(activeStats.maxMp)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-300">STR</span>
                    <b className="text-white">{activeAttrs.str}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-300">VIT</span>
                    <b className="text-white">{activeAttrs.vit}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-300">DEX</span>
                    <b className="text-white">{activeAttrs.dex}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-300">AGI</span>
                    <b className="text-white">{activeAttrs.agi}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-300">INT</span>
                    <b className="text-white">{activeAttrs.int}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-300">LUK</span>
                    <b className="text-white">{activeAttrs.luk}</b>
                  </div>
                </div>

                {/* Gold + Map Name */}
                <div className="flex items-center justify-between pt-0.5 tabular-nums">
                  <span className="flex items-center gap-2 font-bold text-white">
                    <GameArtIcon iconId="gold-coin" size={16} />
                    {formatNum(activeSave.gold)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {MAPS[activeSave.mapId]?.name ?? 'เมืองเริ่มต้น'}
                  </span>
                </div>

                <div className="pt-1 text-center">
                  {confirmDeleteId === (user ? activeCloudChar?.id : 'guest') ? (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (user && activeCloudChar) void handleDeleteCloudCharacter(activeCloudChar.id)
                          else handleDeleteGuestSave()
                        }}
                        className="rounded bg-rose-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-rose-500"
                      >
                        ยืนยันลบ
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="asura-tab px-3 py-1 text-[11px]"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(user ? activeCloudChar?.id ?? null : 'guest')}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-300/90 hover:text-rose-300"
                    >
                      <Trash2 className="size-3" aria-hidden />
                      ลบตัวละคร
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2 py-8 text-center text-xs">
                <p className="font-bold text-sky-200">ยังไม่มีตัวละครในช่องนี้</p>
                <p className="text-[11px] text-slate-300">
                  กดแท่น <span className="font-bold text-amber-300">+</span> ด้านขวาหรือปุ่มเริ่มผจญภัยเพื่อสร้างตัวละครใหม่
                </p>
              </div>
            )}
          </div>

          {/* Left-Bottom 3 Asura Stacked Buttons */}
          <div className="grid grid-cols-3 gap-1.5 lg:grid-cols-1 lg:gap-1.5">
            <button
              type="button"
              onClick={() => openChangelogModal()}
              className="rounded-lg border border-[#3a68a8] bg-[#162436]/90 px-3 py-2 text-xs font-bold text-white shadow hover:brightness-115"
            >
              แจ้งปัญหา / อัปเดต
            </button>
            <button
              type="button"
              onClick={() => setAccountModalOpen((v) => !v)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[#3a68a8] bg-[#162436]/90 px-3 py-2 text-xs font-bold text-white shadow hover:brightness-115"
            >
              <UserCog className="size-3.5 text-sky-300" aria-hidden />
              <span>{user ? 'บัญชี (Google)' : 'จัดการบัญชี'}</span>
            </button>
            <button
              type="button"
              onClick={() => void refreshCharacters(user)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[#3a68a8] bg-[#162436]/90 px-3 py-2 text-xs font-bold text-white shadow hover:brightness-115"
            >
              <RefreshCw className="size-3.5 text-amber-300" aria-hidden />
              <span>รีเฟรชเซฟ</span>
            </button>
          </div>
        </div>

        {/* Center 3 Celestial Stone Pedestals */}
        <div className="flex flex-col items-center justify-center py-6">
          <div className="grid w-full max-w-2xl grid-cols-3 items-end gap-4 sm:gap-8">
            {CHARACTER_SLOTS.map((slotId, index) => {
              const cloudEntry = user ? cloudChars.find((c) => c.id === slotId) ?? null : null
              const slotSave: SaveData | null = user
                ? cloudEntry?.saveData ?? null
                : index === 0
                  ? guestSave
                  : null
              const isSelected = slotSave
                ? user
                  ? (activeCloudChar?.id ?? selectedSlotId) === slotId
                  : index === 0
                : false
              const canUseSlot = user || index === 0

              return (
                <div
                  key={slotId}
                  className={cn(
                    'flex flex-col items-center',
                    index === 1 ? '-translate-y-4 sm:-translate-y-8' : 'translate-y-2',
                  )}
                >
                  {slotSave ? (
                    <button
                      type="button"
                      onClick={() => setSelectedSlotId(slotId)}
                      className="group relative flex flex-col items-center focus:outline-none"
                    >
                      {isSelected && <WindChimeSelectionAura />}

                      <div className="relative z-10 -mb-4 transition-transform group-hover:scale-105">
                        <SpriteModelCanvas
                          mode="job"
                          id={slotSave.jobId}
                          action={isSelected ? 'auto' : 'idle'}
                          dir="down"
                          size={isSelected ? 88 : 76}
                          fashion={resolveFashionLoadoutFromSave(slotSave)}
                          isGm={slotSave.gm}
                          rebirthCount={slotSave.rebirthCount ?? 0}
                          spiritStage={slotSave.extV2?.spiritAwakening?.awakeningStage ?? 0}
                          showAura={isSelected && ((slotSave.extV2?.spiritAwakening?.awakeningStage ?? 0) > 0 || (slotSave.rebirthCount ?? 0) > 0)}
                          showShadow={false}
                          label={slotSave.name}
                        />
                      </div>

                      {/* Stone Pedestal */}
                      <div
                        className={cn(
                          'flex h-16 w-24 flex-col items-center justify-start rounded-b-xl border-2 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-500 pt-3 shadow-xl sm:w-28',
                          isSelected ? 'border-amber-300 ring-4 ring-sky-300/40' : 'border-slate-400',
                        )}
                      >
                        <div className="-mt-6 mb-1 h-5 w-20 rounded-full border border-amber-200/80 bg-gradient-to-b from-amber-100 via-amber-200/80 to-slate-300 shadow-inner sm:w-24" />
                        <span className="max-w-[90%] truncate text-[11px] font-extrabold text-slate-900">
                          {slotSave.name}
                        </span>
                        <span className="text-[9.5px] font-bold text-slate-700 tabular-nums">
                          Lv.{slotSave.level}
                        </span>
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canUseSlot}
                      onClick={() => {
                        setSelectedSlotForNew(slotId)
                        setName('')
                        setCreateOpen(true)
                      }}
                      title={canUseSlot ? 'สร้างตัวละครใหม่' : 'เข้าสู่ระบบ Google เพื่อปลดล็อกสล็อตเพิ่ม'}
                      className="group flex flex-col items-center disabled:opacity-55"
                    >
                      <div className="flex h-16 w-24 flex-col items-center justify-center rounded-b-xl border-2 border-slate-400 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-600 shadow-xl transition-transform group-hover:-translate-y-1 sm:w-28">
                        <div className="-mt-8 mb-1 grid size-12 place-items-center rounded-full border-2 border-slate-300 bg-gradient-to-b from-slate-200 to-slate-400 text-slate-700 shadow-inner">
                          <Plus className="size-7 stroke-[3]" aria-hidden />
                        </div>
                        <span className="text-[10px] font-bold text-slate-900">
                          {canUseSlot ? 'สร้างตัวละคร' : 'ล็อกอิน Google'}
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Bar: uid pill + Right currency/slots + "เริ่มผจญภัย" */}
      <div className="relative z-10 flex flex-col items-center justify-between gap-2.5 sm:flex-row">
        <div className="hidden w-40 sm:block" />

        <div className="rounded-md bg-[#2c3442]/90 px-6 py-1 font-mono text-xs font-bold text-slate-100 shadow tabular-nums">
          uid:{displayAccountUid}
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-3 rounded-lg border border-[#325d99] bg-[#152030]/92 px-3 py-1.5 text-xs font-bold text-white shadow tabular-nums">
            <span className="flex items-center gap-1.5 text-amber-300">
              <GameArtIcon iconId="gold-coin" size={16} />
              {formatNum(activeSave?.gold ?? 0)}
            </span>
            <span className="flex items-center gap-1.5 text-sky-300">
              <GameArtIcon iconId="soul-gem" size={16} />
              {formatNum(activeSave?.diamonds ?? 0)}
            </span>
            <span className="border-l border-slate-600 pl-2.5 text-slate-200">
              ตัวละคร {charCount}/{user ? CHARACTER_SLOTS.length : 1}
            </span>
          </div>

          <button
            type="button"
            data-start="true"
            disabled={isLoadingSave}
            onClick={handleEnterSelectedGame}
            className="flex min-w-[12rem] items-center justify-center gap-2 rounded-lg border-2 border-sky-300/80 bg-gradient-to-b from-[#2563eb] to-[#173d82] px-6 py-2.5 text-sm font-extrabold text-white shadow-xl transition-transform hover:scale-[1.02] hover:brightness-110 disabled:opacity-50"
          >
            <UserCheck className="size-4 text-amber-300" aria-hidden />
            {activeSave ? 'เริ่มผจญภัย' : 'สร้างตัวละครใหม่'}
          </button>
        </div>
      </div>

      {/* Account Management Modal Overlay */}
      {accountModalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setAccountModalOpen(false)
          }}
        >
          <div className="asura-panel relative w-full max-w-md p-4">
            <div className="mb-3 flex items-center justify-between border-b border-[#295596] pb-2">
              <h3 className="text-sm font-bold text-white">จัดการบัญชีผู้เล่น</h3>
              <button
                type="button"
                onClick={() => setAccountModalOpen(false)}
                aria-label="ปิดหน้าต่างบัญชี"
                className="rounded border border-rose-400/50 bg-rose-600/80 p-1 text-white"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <AccountPanel onAuthSuccess={handleAuthSuccess} />
          </div>
        </div>
      )}

      {/* Character Creation Modal Overlay */}
      {createOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setCreateOpen(false)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              startNewCharacter()
            }}
            className="asura-panel relative flex w-full max-w-md flex-col gap-3 p-4 text-slate-100"
          >
            <div className="flex items-center justify-between border-b border-[#295596] pb-2">
              <h3 className="text-sm font-bold text-white">
                {user ? `สร้างตัวละครใหม่ (${selectedSlotForNew})` : 'สร้างตัวละครใหม่ (Guest)'}
              </h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="ปิด"
                className="rounded border border-rose-400/50 bg-rose-600/80 p-1 text-white"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-[#294c7e] bg-[#0f1724] p-3">
              <div className="flex flex-col items-center gap-1.5">
                <div className="grid size-20 place-items-center rounded-lg border border-[#2c4e80] bg-[#162336]">
                  <SpriteModelCanvas
                    mode="job"
                    id="novice"
                    action={noviceAction}
                    dir={noviceDir}
                    size={72}
                    showAura={false}
                    label={JOBS.novice.name}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const idx = MODEL_DIRS.indexOf(noviceDir)
                    setNoviceDir(MODEL_DIRS[(idx + 1) % MODEL_DIRS.length])
                  }}
                  className="asura-tab flex items-center gap-1 px-2 py-0.5 text-[10px]"
                >
                  <RotateCw className="size-2.5" aria-hidden /> หมุน
                </button>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5 text-xs">
                <p className="font-bold text-amber-300">คลาสเริ่มต้น: {JOBS.novice.name}</p>
                <p className="text-[11px] text-slate-300">
                  เริ่มต้นที่เมืองหลัก พร้อมสกิล 4 ท่าและอัปเกรดเปลี่ยนอาชีพเป็น 6 คลาสหลักได้เมื่อเลเวลถึงกำหนด
                </p>
                <div className="flex flex-wrap gap-1">
                  {(['auto', 'idle', 'walk', 'attack', 'skill'] as const).map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setNoviceAction(act)}
                      className={cn(
                        'px-2 py-0.5 text-[10px]',
                        noviceAction === act ? 'asura-tab-active font-bold' : 'asura-tab',
                      )}
                    >
                      {act}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="hero-name" className="text-xs font-semibold text-slate-200">
                ชื่อตัวละคร (สูงสุด 16 ตัวอักษร)
              </label>
              <input
                id="hero-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={16}
                placeholder="นักผจญภัย"
                autoFocus
                className="w-full rounded-lg border border-[#35629e] bg-[#0f1724] px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
              />
            </div>

            {!user && guestSave && (
              <p className="rounded border border-rose-400/50 bg-rose-950/60 p-2 text-[11px] text-rose-200">
                การสร้างตัวละครใหม่แบบ Guest จะเขียนทับเซฟ {guestSave.name} (Lv.{guestSave.level})
              </p>
            )}

            <button
              type="submit"
              data-start="true"
              className="asura-tab-active flex items-center justify-center gap-2 py-2.5 text-sm font-extrabold"
            >
              <Sparkles className="size-4 text-amber-300" aria-hidden />
              สร้างตัวละครและเริ่มผจญภัย
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
