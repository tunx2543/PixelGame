'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { motion } from 'motion/react'
import {
  AlertTriangle,
  Check,
  Copy,
  Crown,
  Loader2,
  LogIn,
  LogOut,
  Play,
  Plus,
  RefreshCw,
  RotateCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import {
  auth,
  formatFirebaseAuthError,
  signInWithGoogle,
  signOutFirebase,
} from '@/lib/firebase/client'
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
import {
  applyGameUpdateReload,
  claimAutoReloadTarget,
  openChangelogModal,
  useVersionUpdate,
} from '@/lib/game/use-version-update'
import { resolveFashionLoadoutFromSave } from '@/lib/game/fashion-renderer'
import { syncBgmContext } from '@/lib/game/bgm'
import { MAPS } from '@/lib/game/maps'
import { cn } from '@/lib/utils'
import { AccountPanel } from './account-panel'
import { BgmQuickControl } from './bgm-quick-control'
import { formatNum } from './format'
import { GameArtIcon } from './game-badge-icon'
import { SettingsPanel } from './panels/settings-panel'
import { PWAInstallButton } from './pwa-controls'
import { SpriteModelCanvas, type PreviewAction } from './sprite-model-canvas'

const KEY_ART_SRC = '/assets/aistudio/file_00000000bb9c82119bd394ecb0bb0ae8_68fc9e57.png'

function WindChimeSelectionAura() {
  return (
    <div aria-hidden className="pointer-events-none absolute -top-12 left-1/2 flex -translate-x-1/2 flex-col items-center">
      <div className="h-20 w-14 rounded-full bg-gradient-to-b from-cyan-300/40 via-sky-200/20 to-amber-300/30 blur-md" />
      <Sparkles className="relative -top-2 size-6 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
    </div>
  )
}

export function TitleScreen() {
  const { kickedNotice } = useGame()
  const versionInfo = useVersionUpdate()
  const [user, setUser] = useState<User | null>(() => auth.currentUser)
  const [accountIdentity, setAccountIdentity] = useState<UserAccountIdentity | null>(null)
  const [cloudChars, setCloudChars] = useState<CloudCharacterRecord[]>([])
  const [guestSave, setGuestSave] = useState<SaveData | null>(() =>
    typeof window !== 'undefined' && !auth.currentUser ? readSave() : null,
  )
  const [recoverableSaves, setRecoverableSaves] = useState<RecoverableLocalSave[]>([])
  const [selectedSlotId, setSelectedSlotId] = useState<CharacterSlotId>('slot_1')

  const [continueOpen, setContinueOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
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
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')

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
    setConfirmDeleteId(null)
    setCloudError('')
    void syncLatestMonsterAssetsAndFirestore()
    if (!currentUser) {
      setIsLoadingSave(false)
    } else {
      setIsLoadingSave(true)
    }
    try {
      await flushCloudSave()
      if (currentUser) {
        const [identity, list] = currentUser.emailVerified
          ? await Promise.all([
              ensureUserProfile(currentUser),
              listAccountCharacters({ skipProfileSync: true }),
            ])
          : [await ensureUserProfile(currentUser), []]
        setAccountIdentity(identity)
        const parsedUid = Number(identity.gameUid)
        const numericUid = identity.isGm
          ? PERMANENT_GM_UID
          : Number.isSafeInteger(parsedUid)
            ? parsedUid
            : undefined
        setGameAccountIdentity(currentUser.uid, numericUid, identity.gameUid, identity.isGm)
        if (list.length === 0) {
          const migrated = await loadCloudGame()
          if (migrated) {
            const updatedList = await listAccountCharacters({ skipProfileSync: true })
            setCloudChars(updatedList)
            setRecoverableSaves(computeRecoverables(currentUser.uid, updatedList))
            if (updatedList[0]) setSelectedSlotId(updatedList[0].id as CharacterSlotId)
          } else {
            setCloudChars([])
            setRecoverableSaves(computeRecoverables(currentUser.uid, []))
            setSelectedSlotForNew('slot_1')
          }
        } else {
          setCloudChars(list)
          setRecoverableSaves(computeRecoverables(currentUser.uid, list))
          setSelectedSlotId((prev) =>
            list.some((c) => c.id === prev) ? prev : (list[0].id as CharacterSlotId),
          )
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
    }, 1800)

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!active) return
      resolvedAuth = true
      window.clearTimeout(authFallbackTimer)
      setUser(nextUser)
      setAuthError('')
      void refreshCharacters(nextUser)
    })
    return () => {
      active = false
      window.clearTimeout(authFallbackTimer)
      unsubscribe()
    }
  }, [refreshCharacters])

  // Escape key closes topmost open Title Screen modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (accountModalOpen) {
        setAccountModalOpen(false)
        return
      }
      if (settingsOpen) {
        setSettingsOpen(false)
        return
      }
      if (createOpen) {
        setCreateOpen(false)
        return
      }
      if (continueOpen) {
        setContinueOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [accountModalOpen, continueOpen, createOpen, settingsOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('autostart') === '1') return
    syncBgmContext({ screen: 'login' })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !versionInfo.updateAvailable) return
    if (continueOpen || createOpen || settingsOpen || accountModalOpen || authBusy) return
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') return
    const signature = [
      versionInfo.remoteVersion ?? versionInfo.currentVersion,
      versionInfo.remoteBuildId ?? '',
      versionInfo.remoteDeployVersionId ?? '',
    ].join(':')
    if (claimAutoReloadTarget(signature)) {
      void applyGameUpdateReload()
    }
  }, [
    accountModalOpen,
    authBusy,
    continueOpen,
    createOpen,
    settingsOpen,
    versionInfo.currentVersion,
    versionInfo.remoteBuildId,
    versionInfo.remoteDeployVersionId,
    versionInfo.remoteVersion,
    versionInfo.updateAvailable,
  ])

  const hasAutoStartedRef = useRef(false)

  const handleAuthSuccess = useCallback(
    (signedInUser: User) => {
      setAccountModalOpen(false)
      setAuthError('')
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
    setCreateOpen(false)
  }

  const loginWithCloudCharacter = useCallback(
    (char: CloudCharacterRecord) => {
      if (!user || isLoadingSave) return
      applyAccountIdentityToEngine(user)
      setActiveCharacterSlot(char.id)
      loadGame(char.saveData)
      setContinueOpen(false)
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

  const handleQuickGoogleSignIn = async () => {
    setAuthBusy(true)
    setAuthError('')
    try {
      await signInWithGoogle()
    } catch (error) {
      setAuthError(formatFirebaseAuthError(error))
    } finally {
      setAuthBusy(false)
    }
  }

  const handleQuickSignOut = async () => {
    setAuthBusy(true)
    setAuthError('')
    try {
      await signOutFirebase()
    } catch {
      setAuthError('ออกจากระบบไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setAuthBusy(false)
    }
  }

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

  const openNewCharacterFlow = () => {
    if (user) {
      const used = new Set(cloudChars.map((c) => c.id))
      const firstFree = CHARACTER_SLOTS.find((s) => !used.has(s)) ?? 'slot_1'
      setSelectedSlotForNew(firstFree)
    } else {
      setSelectedSlotForNew('slot_1')
    }
    setName('')
    setCreateOpen(true)
  }

  const handleEnterSelectedGame = () => {
    if (isLoadingSave) return
    if (user) {
      if (activeCloudChar) {
        loginWithCloudCharacter(activeCloudChar)
      } else {
        openNewCharacterFlow()
      }
      return
    }
    if (guestSave) {
      setGameAccountIdentity(null)
      setActiveCharacterSlot('slot_1')
      loadGame(guestSave)
      setContinueOpen(false)
      return
    }
    openNewCharacterFlow()
  }

  const handleCopyCid = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(activeCid)
    }
    setCopiedCid(true)
    window.setTimeout(() => setCopiedCid(false), 1500)
  }

  const slotBeingOverwritten = user
    ? cloudChars.find((c) => c.id === selectedSlotForNew) ?? null
    : null

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-x-hidden overflow-y-auto bg-[#071122] select-none">
      {/* Full-bleed Key Art Backdrop (full-width uncropped top showcase on portrait mobile, full-viewport cover on sm+/desktop) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-gradient-to-b from-[#0b2b74] via-[#07152e] to-[#050d1c]">
        <div className="relative w-full aspect-[16/9] sm:h-full sm:w-full sm:aspect-auto">
          <img
            src={KEY_ART_SRC}
            alt="Pixel Quest Key Art"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-center"
          />
          {/* Mobile seamless blend from artwork bottom edge into dark navy dock background */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#07152e] via-[#07152e]/65 to-transparent sm:hidden" />
        </div>
        {/* Subtle bottom-edge vignette keeping footer legibility crisp while leaving heroes, crest & castle bright */}
        <div className="hidden sm:block sm:absolute sm:inset-x-0 sm:bottom-0 sm:h-32 sm:bg-gradient-to-t sm:from-[#040a16]/85 sm:via-[#040a16]/40 sm:to-transparent" />
      </div>

      {/* Top-Right Quick BGM Control on Login Screen (Android & Desktop) */}
      <div className="absolute right-3 top-3 z-30 sm:right-5 sm:top-4">
        <BgmQuickControl context={{ screen: 'login' }} variant="title" />
      </div>

      {/* Floating Kicked / Cloud Error Notice (only rendered when active) */}
      {(kickedNotice || (user && cloudError)) && (
        <div className="relative z-20 mx-auto mt-3 flex w-full max-w-xl flex-col gap-2 px-4">
          {kickedNotice && (
            <div className="flex items-start justify-between gap-2 rounded-lg border border-rose-400 bg-rose-950/95 p-2.5 text-xs text-rose-100 shadow-lg">
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
            <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-400 bg-rose-950/95 p-2.5 text-xs text-rose-100 shadow-lg">
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
        </div>
      )}

      {/* Main Entry Layout: Centered lower dock underneath the artwork's Pixel Quest crest so left heroes & right castle/village stay clear */}
      <main className="relative z-10 flex flex-1 items-end justify-center px-4 pt-48 pb-3 sm:px-6 sm:pt-[42vh] md:pb-3">
        <h1 className="sr-only">Pixel Quest 2D</h1>
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          aria-label="เมนูหลักเข้าสู่เกม Pixel Quest 2D"
          className="flex w-full max-w-[22.5rem] flex-col items-center gap-2 rounded-xl border border-sky-200/20 bg-[#061124]/82 p-3 shadow-[0_18px_40px_rgba(2,6,23,0.75)]"
        >
          <p className="w-full truncate rounded border border-[#2a4d82]/70 bg-[#0b1933]/90 px-2.5 py-1 text-center text-[11.5px] font-semibold text-sky-100">
            {isLoadingSave
              ? 'กำลังโหลดข้อมูลตัวละคร...'
              : activeSave
                ? `พร้อมผจญภัย · ${activeSave.name} (Lv.${activeSave.level})`
                : 'ผู้เล่นใหม่ · กดเริ่มเกมใหม่เพื่อสร้างตัวละคร'}
          </p>

          {/* 3-Button Command Stack + Login Frame */}
          <div className="flex w-full flex-col gap-2">
            {/* Button 1: เริ่มเกมใหม่ (Gold Pixel Bevel) */}
            <button
              type="button"
              disabled={isLoadingSave}
              onClick={openNewCharacterFlow}
              className="group relative flex w-full items-center justify-center gap-2.5 rounded-lg border-2 border-[#3f2003] bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#b45309] px-4 py-2 text-base font-extrabold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.55),inset_0_-3px_0_rgba(120,53,15,0.75),0_6px_14px_rgba(0,0,0,0.45)] transition-all hover:brightness-110 active:translate-y-[1px] disabled:opacity-60"
            >
              <Play className="size-5 shrink-0 fill-white text-white drop-shadow-[0_2px_0_rgba(120,53,15,0.85)]" aria-hidden />
              <span className="drop-shadow-[0_2px_0_rgba(92,38,7,0.9)]">เริ่มเกมใหม่</span>
            </button>

            {/* Button 2: เล่นต่อ (Royal Sky-Blue Pixel Bevel) */}
            <button
              type="button"
              disabled={isLoadingSave}
              onClick={() => setContinueOpen(true)}
              className="group relative flex w-full items-center justify-center gap-2.5 rounded-lg border-2 border-[#0b1f48] bg-gradient-to-b from-[#60a5fa] via-[#2563eb] to-[#1e40af] px-4 py-2 text-base font-extrabold text-white shadow-[inset_0_2px_0_rgba(219,234,254,0.45),inset_0_-3px_0_rgba(15,23,42,0.7),0_6px_14px_rgba(0,0,0,0.45)] transition-all hover:brightness-110 active:translate-y-[1px] disabled:opacity-60"
            >
              <Users className="size-5 shrink-0 text-white drop-shadow-[0_2px_0_rgba(15,23,42,0.8)]" aria-hidden />
              <span className="drop-shadow-[0_2px_0_rgba(15,23,42,0.85)]">เล่นต่อ</span>
              {activeSave && (
                <span className="ml-1 truncate rounded bg-[#0c1a36]/55 px-2 py-0.5 text-[11px] font-semibold text-sky-100">
                  {activeSave.name} Lv.{activeSave.level}
                </span>
              )}
            </button>

            {/* Button 3: ตั้งค่า (Bronze/Warm Wood Pixel Bevel) */}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="group relative flex w-full items-center justify-center gap-2.5 rounded-lg border-2 border-[#261205] bg-gradient-to-b from-[#a56b43] via-[#7c4d2b] to-[#522f18] px-4 py-1.5 text-base font-extrabold text-white shadow-[inset_0_2px_0_rgba(255,237,213,0.3),inset_0_-3px_0_rgba(28,12,4,0.75),0_6px_14px_rgba(0,0,0,0.42)] transition-all hover:brightness-110 active:translate-y-[1px]"
            >
              <Settings className="size-5 shrink-0 text-white drop-shadow-[0_2px_0_rgba(28,12,4,0.85)]" aria-hidden />
              <span className="drop-shadow-[0_2px_0_rgba(28,12,4,0.85)]">ตั้งค่า</span>
            </button>

            {/* Box 4: Charcoal Metallic Login Card (matching screenshot frame & real Google Auth) */}
            <div className="rounded-lg border-2 border-[#161a22] bg-gradient-to-b from-[#4c5360]/96 via-[#373d47]/96 to-[#242830]/96 p-2.5 text-xs text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_rgba(0,0,0,0.5)]">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-extrabold tracking-wide text-white drop-shadow">
                    Login
                  </span>
                  {user ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                      {accountIdentity?.isGm ? (
                        <Crown className="size-3.5 text-amber-300" aria-hidden />
                      ) : (
                        <ShieldCheck className="size-3.5" aria-hidden />
                      )}
                      {accountIdentity?.isGm ? 'GM · Cloud Save' : 'Google Cloud'}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-300">Guest Mode</span>
                  )}
                </div>

                {user && (
                  <span className="font-mono text-[11px] font-bold text-amber-300 tabular-nums">
                    UID #{displayAccountUid}
                  </span>
                )}
              </div>

              {/* ID / Status Readout Rows echoing the charcoal box bars */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-11 shrink-0 whitespace-nowrap text-[10.5px] font-bold text-slate-200">ID</span>
                  <div className="min-w-0 flex-1 truncate rounded border border-[#1a1e26] bg-[#1e232c] px-2 py-0.5 text-[11px] font-medium text-slate-100">
                    {user
                      ? user.displayName || user.email || 'ผู้เล่น Google'
                      : guestSave
                        ? `Guest · ${guestSave.name} (Lv.${guestSave.level})`
                        : 'Guest (เซฟบนเบราว์เซอร์นี้)'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-11 shrink-0 whitespace-nowrap text-[10.5px] font-bold text-slate-200">ช่องเซฟ</span>
                  <div className="min-w-0 flex-1 truncate rounded border border-[#1a1e26] bg-[#1e232c] px-2 py-0.5 text-[11px] text-slate-300 tabular-nums">
                    {user
                      ? `ตัวละครคลาวด์ ${cloudChars.length}/${CHARACTER_SLOTS.length} สล็อต`
                      : 'ล็อกอิน Google เพื่อใช้ 3 สล็อต & ซิงค์คลาวด์'}
                  </div>
                </div>
              </div>

              {authError && (
                <p className="mt-1.5 rounded border border-rose-400/50 bg-rose-950/70 px-2 py-1 text-[11px] text-rose-200">
                  {authError}
                </p>
              )}

              {/* Auth Actions */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-1.5">
                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setAccountModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded border border-sky-400/50 bg-[#1f3454] px-2.5 py-1 text-[11px] font-bold text-sky-100 hover:brightness-115"
                    >
                      <Users className="size-3.5" aria-hidden />
                      จัดการบัญชี
                    </button>
                    <button
                      type="button"
                      disabled={authBusy}
                      onClick={() => void handleQuickSignOut()}
                      className="inline-flex items-center gap-1 rounded border border-slate-500/60 bg-[#2b303b] px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:text-white disabled:opacity-50"
                    >
                      {authBusy ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <LogOut className="size-3" aria-hidden />}
                      ออกจากระบบ
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={authBusy}
                      onClick={() => void handleQuickGoogleSignIn()}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded border border-sky-400/70 bg-gradient-to-b from-[#2f6fe4] to-[#1e4bb0] px-3 py-1 text-[11px] font-bold text-white shadow hover:brightness-110 disabled:opacity-50"
                    >
                      {authBusy ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        <LogIn className="size-3.5" aria-hidden />
                      )}
                      {authBusy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ Google'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountModalOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-200 underline-offset-2 hover:text-amber-300 hover:underline"
                    >
                      <UserPlus className="size-3.5" aria-hidden />
                      สมัครสมาชิก
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      {/* Bottom Corner Strip: Bottom-Left Version/Install & Bottom-Right Tagline */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openChangelogModal()}
            data-testid="title-version-badge"
            className="flex flex-col items-start rounded-md bg-black/35 px-2.5 py-1 text-left transition-colors hover:bg-black/55"
          >
            <span className="font-[family-name:var(--font-display)] text-xs font-extrabold tracking-wide text-white drop-shadow">
              PIXEL QUEST 2D
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-amber-300">
              v{versionInfo.currentVersion}
              <span className="font-sans text-[10px] font-medium text-sky-200">· บันทึกอัปเดต</span>
              {versionInfo.updateAvailable && (
                <span className="rounded bg-emerald-500/30 px-1 text-[9px] font-bold text-emerald-200">
                  ใหม่!
                </span>
              )}
            </span>
          </button>
          <PWAInstallButton variant="title" />
        </div>

        <p className="text-xs font-bold tracking-wide text-white/95 drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] sm:text-sm">
          --- ผจญภัยไปในโลกพิกเซลอันยิ่งใหญ่ ---
        </p>
      </footer>

      {/* Continue / Character Selection Modal */}
      {continueOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-5"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setContinueOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="เลือกตัวละครเพื่อเล่นต่อ"
            className="asura-panel relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden text-slate-100"
          >
            <header className="flex items-center justify-between gap-2 border-b border-[#295596] bg-[#121c2c] px-4 py-3">
              <div>
                <h2 className="text-base font-extrabold text-amber-300">เลือกตัวละครเพื่อเล่นต่อ</h2>
                <p className="text-[11px] text-slate-300">
                  {user
                    ? `บัญชี Google #${displayAccountUid} · ${cloudChars.length}/${CHARACTER_SLOTS.length} สล็อต`
                    : 'โหมด Guest (บันทึกในเบราว์เซอร์) · ล็อกอิน Google เพื่อปลดล็อก 3 สล็อต'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void refreshCharacters(user)}
                  className="asura-tab flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold"
                >
                  <RefreshCw className={cn('size-3.5 text-amber-300', isLoadingSave && 'animate-spin')} aria-hidden />
                  รีเฟรชเซฟ
                </button>
                <button
                  type="button"
                  onClick={() => setContinueOpen(false)}
                  aria-label="ปิดหน้าต่างเลือกตัวละคร"
                  className="rounded border border-rose-400/50 bg-rose-600/80 p-1.5 text-white hover:bg-rose-500"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {/* Recoverable Guest Saves Import Banner */}
              {user &&
                cloudChars.length < CHARACTER_SLOTS.length &&
                recoverableSaves.slice(0, 2).map((entry) => (
                  <div
                    key={entry.storageKey}
                    className="flex items-center justify-between gap-2 rounded-lg border border-sky-400/60 bg-[#152234] p-2.5 text-[11px] text-sky-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-amber-300">
                        พบ{entry.sourceLabel}: {entry.saveData.name} (Lv.{entry.saveData.level})
                      </p>
                      <p className="text-[10px] text-slate-300">
                        {JOBS[normalizeJobId(entry.saveData.jobId)].name} · นำเข้าขึ้นบัญชีของคุณได้ทันที
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

              <div className="grid gap-4 lg:grid-cols-[17.5rem_1fr]">
                {/* Left Character Stat Summary */}
                <div className="rounded-xl border-2 border-[#325d99]/90 bg-[#151e2c] p-3 text-slate-100 shadow-lg">
                  {isLoadingSave ? (
                    <p role="status" className="py-12 text-center text-xs text-slate-300">
                      กำลังโหลดข้อมูลตัวละคร...
                    </p>
                  ) : activeSave && activeStats && activeAttrs ? (
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-start justify-between gap-2 border-b border-[#2a4a78] pb-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="shrink-0 font-[family-name:var(--font-display)] text-2xl font-extrabold text-amber-400 tabular-nums">
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

                      <div className="flex items-center justify-between pt-0.5 tabular-nums">
                        <span className="flex items-center gap-1.5 font-bold text-amber-300">
                          <GameArtIcon iconId="gold-coin" size={16} />
                          {formatNum(activeSave.gold)}
                        </span>
                        <span className="flex items-center gap-1.5 font-bold text-sky-300">
                          <GameArtIcon iconId="soul-gem" size={16} />
                          {formatNum(activeSave.diamonds ?? 0)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>แผนที่ปัจจุบัน</span>
                        <span className="text-slate-200">{MAPS[activeSave.mapId]?.name ?? 'เมืองเริ่มต้น'}</span>
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
                      <p className="font-bold text-sky-200">ยังไม่มีตัวละครในสล็อต</p>
                      <p className="text-[11px] text-slate-300">
                        กดแท่น <span className="font-bold text-amber-300">+</span> ด้านขวาหรือปุ่มสร้างตัวละครใหม่เพื่อเริ่มต้น
                      </p>
                    </div>
                  )}
                </div>

                {/* Right 3 Character Pedestals + Modes + Launch */}
                <div className="flex flex-col justify-between gap-4">
                  <div className="grid grid-cols-3 items-end gap-3 rounded-xl border border-[#2a4d82] bg-gradient-to-b from-[#172844]/70 via-[#132037]/80 to-[#0e1726]/95 px-3 pt-10 pb-5 sm:gap-5 sm:px-6">
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
                            index === 1 ? '-translate-y-3 sm:-translate-y-5' : '',
                          )}
                        >
                          {slotSave ? (
                            <button
                              type="button"
                              onClick={() => setSelectedSlotId(slotId)}
                              className="group relative flex flex-col items-center focus:outline-none"
                            >
                              {isSelected && <WindChimeSelectionAura />}

                              <div className="relative z-10 -mb-3 transition-transform group-hover:scale-105">
                                <SpriteModelCanvas
                                  mode="job"
                                  id={slotSave.jobId}
                                  action={isSelected ? 'auto' : 'idle'}
                                  dir="down"
                                  size={isSelected ? 80 : 68}
                                  fashion={resolveFashionLoadoutFromSave(slotSave)}
                                  isGm={slotSave.gm}
                                  rebirthCount={slotSave.rebirthCount ?? 0}
                                  spiritStage={slotSave.extV2?.spiritAwakening?.awakeningStage ?? 0}
                                  showAura={isSelected && ((slotSave.extV2?.spiritAwakening?.awakeningStage ?? 0) > 0 || (slotSave.rebirthCount ?? 0) > 0)}
                                  showShadow={false}
                                  label={slotSave.name}
                                />
                              </div>

                              <div
                                className={cn(
                                  'flex h-14 w-full max-w-[6.5rem] flex-col items-center justify-center rounded-b-xl border-2 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-500 px-1.5 pt-2 shadow-xl',
                                  isSelected ? 'border-amber-300 ring-4 ring-sky-300/40' : 'border-slate-400',
                                )}
                              >
                                <span className="max-w-full truncate text-[11px] font-extrabold text-slate-900">
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
                                setContinueOpen(false)
                                setCreateOpen(true)
                              }}
                              title={canUseSlot ? 'สร้างตัวละครใหม่' : 'เข้าสู่ระบบ Google เพื่อปลดล็อกสล็อตเพิ่ม'}
                              className="group flex w-full max-w-[6.5rem] flex-col items-center disabled:opacity-55"
                            >
                              <div className="flex h-14 w-full flex-col items-center justify-center rounded-b-xl border-2 border-slate-400 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-600 px-1 shadow-xl transition-transform group-hover:-translate-y-1">
                                <div className="-mt-6 mb-0.5 grid size-10 place-items-center rounded-full border-2 border-slate-300 bg-gradient-to-b from-slate-200 to-slate-400 text-slate-700 shadow-inner">
                                  <Plus className="size-5 stroke-[3]" aria-hidden />
                                </div>
                                <span className="text-[10px] font-bold text-slate-900">
                                  {canUseSlot ? 'สร้างใหม่' : 'ล็อกอิน Google'}
                                </span>
                              </div>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Training Mode Quick Links */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-300">โหมดทดลองและคลังข้อมูล</p>
                    <nav aria-label="เมนูลัดโหมดฝึกฝน" className="flex flex-wrap gap-1.5">
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
                          className="rounded-md border border-[#325b94]/70 bg-[#141f2e] px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-sky-400 hover:text-white"
                        >
                          {lbl}
                        </Link>
                      ))}
                    </nav>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#295596]/70 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setContinueOpen(false)
                        openNewCharacterFlow()
                      }}
                      className="asura-tab px-4 py-2 text-xs font-bold"
                    >
                      + สร้างตัวละครใหม่
                    </button>
                    <button
                      type="button"
                      data-start="true"
                      disabled={isLoadingSave}
                      onClick={handleEnterSelectedGame}
                      className="flex min-w-[12rem] items-center justify-center gap-2 rounded-lg border-2 border-sky-300/80 bg-gradient-to-b from-[#2563eb] to-[#173d82] px-6 py-2.5 text-sm font-extrabold text-white shadow-xl transition-transform hover:scale-[1.02] hover:brightness-110 disabled:opacity-50"
                    >
                      <UserCheck className="size-4 text-amber-300" aria-hidden />
                      {activeSave ? 'เข้าเล่นต่อทันที' : 'สร้างตัวละครใหม่'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Account Management Modal Overlay */}
      {accountModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setAccountModalOpen(false)
          }}
        >
          <div className="asura-panel relative w-full max-w-md p-4">
            <div className="mb-3 flex items-center justify-between border-b border-[#295596] pb-2">
              <div>
                <h3 className="text-sm font-bold text-white">สมัครสมาชิก / จัดการบัญชีผู้เล่น</h3>
                <p className="text-[11px] text-slate-300">
                  ใช้บัญชี Google เพื่อสร้างบัญชีถาวร รับ UID แอดเพื่อน 4 หลัก และซิงค์เซฟข้ามเครื่อง
                </p>
              </div>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
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

            {user && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-300">เลือกสล็อตบันทึกตัวละคร</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {CHARACTER_SLOTS.map((slot, i) => {
                    const existing = cloudChars.find((c) => c.id === slot)
                    const active = selectedSlotForNew === slot
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlotForNew(slot)}
                        className={cn(
                          'rounded border px-2 py-1.5 text-left text-[11px]',
                          active
                            ? 'border-sky-400 bg-[#1f4277] text-white'
                            : 'border-[#2d4e7d] bg-[#111c2c] text-slate-300 hover:border-sky-400/60',
                        )}
                      >
                        <p className="font-bold">ช่อง {i + 1}</p>
                        <p className="truncate text-[10px] opacity-85">
                          {existing ? `${existing.name} Lv.${existing.level}` : 'ว่าง'}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

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

            {slotBeingOverwritten && (
              <p className="rounded border border-rose-400/50 bg-rose-950/60 p-2 text-[11px] text-rose-200">
                สล็อตนี้มีตัวละคร {slotBeingOverwritten.name} (Lv.{slotBeingOverwritten.level}) อยู่แล้ว การสร้างใหม่จะเขียนทับทันที
              </p>
            )}

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

      {/* Settings Modal Overlay */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50">
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        </div>
      )}
    </div>
  )
}
