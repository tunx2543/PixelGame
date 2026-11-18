'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { AlertTriangle, Plus, RotateCw, Sparkles, Sprout, Trash2, UploadCloud, UserCheck, X } from 'lucide-react'
import { auth } from '@/lib/firebase/client'
import {
  CHARACTER_SLOTS,
  ensureUserProfile,
  importGuestSaveToSlot,
  type CharacterSlotId,
  type CloudCharacterRecord,
  type UserAccountIdentity,
} from '@/lib/firebase/characters'
import { PERMANENT_GM_UID } from '@/lib/game/permissions'
import { JOBS, normalizeJobId } from '@/lib/game/data'
import { MODEL_DIRS, type ModelDir } from '@/lib/game/models-2d'
import {
  SAVE_KEY,
  deleteAccountCharacter,
  deleteSave,
  flushCloudSave,
  game,
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
import { MAPS } from '@/lib/game/maps'
import { AccountPanel } from './account-panel'
import { formatNum, formatPlayTime } from './format'
import { PWAInstallButton } from './pwa-controls'
import { SpriteModelCanvas, type PreviewAction } from './sprite-model-canvas'

export function TitleScreen() {
  const { kickedNotice } = useGame()
  const [user, setUser] = useState<User | null>(null)
  const [accountIdentity, setAccountIdentity] = useState<UserAccountIdentity | null>(null)
  const [cloudChars, setCloudChars] = useState<CloudCharacterRecord[]>([])
  const [guestSave, setGuestSave] = useState<SaveData | null>(null)
  const [recoverableSaves, setRecoverableSaves] = useState<RecoverableLocalSave[]>([])
  const [mode, setMode] = useState<'list' | 'new'>('list')
  const [name, setName] = useState('')
  const [noviceAction, setNoviceAction] = useState<PreviewAction>('auto')
  const [noviceDir, setNoviceDir] = useState<ModelDir>('down')
  const [selectedSlotForNew, setSelectedSlotForNew] = useState<CharacterSlotId>('slot_1')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
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
      await flushCloudSave()
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
          // Migrate any legacy/local save into slot_1 on first login if present
          const migrated = await loadCloudGame()
          if (migrated) {
            const updatedList = await listAccountCharacters()
            setCloudChars(updatedList)
            setRecoverableSaves(computeRecoverables(currentUser.uid, updatedList))
            setMode(updatedList.length > 0 ? 'list' : 'new')
          } else {
            setCloudChars([])
            setRecoverableSaves(computeRecoverables(currentUser.uid, []))
            setSelectedSlotForNew('slot_1')
            setMode('new')
          }
        } else {
          setCloudChars(list)
          setRecoverableSaves(computeRecoverables(currentUser.uid, list))
          setMode('list')
        }
      } else {
        setAccountIdentity(null)
        setGameAccountIdentity(null)
        setActiveCharacterSlot('slot_1')
        setCloudChars([])
        setRecoverableSaves([])
        const local = await loadCloudGame()
        setGuestSave(local)
        setMode(local ? 'list' : 'new')
      }
    } catch (error) {
      console.error('Failed to load cloud characters:', error)
      if (currentUser) {
        const reason = error instanceof Error && !error.message.startsWith('{') ? error.message : ''
        setCloudError(reason || 'ไม่สามารถโหลดข้อมูลตัวละครจากคลาวด์ได้ กรุณาลองใหม่อีกครั้ง')
      }
      const fallback = readSave()
      setGuestSave(fallback)
      setMode(fallback ? 'list' : 'new')
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
      setMode(fallback ? 'list' : 'new')
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
      void refreshCharacters(signedInUser)
    },
    [refreshCharacters],
  )

  const nextAvailableSlot = (): CharacterSlotId => {
    const used = new Set(cloudChars.map((c) => c.id))
    return CHARACTER_SLOTS.find((slot) => !used.has(slot)) ?? 'slot_1'
  }

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
    const targetSlot = nextAvailableSlot()
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

  const canCreateMoreSlots = user ? cloudChars.length < CHARACTER_SLOTS.length : true
  const visibleRecoverables =
    user && cloudChars.length < CHARACTER_SLOTS.length ? recoverableSaves.slice(0, 2) : []

  const recoveryBanner = visibleRecoverables.length > 0 && (
    <div className="flex flex-col gap-2">
      {visibleRecoverables.map((entry) => (
        <div
          key={entry.storageKey}
          className="flex items-center justify-between gap-2 border border-accent/40 bg-accent/10 p-2.5 text-[11px]"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold text-accent">
              พบ{entry.sourceLabel}: {entry.saveData.name} (Lv.{entry.saveData.level})
            </p>
            <p className="text-[10px] text-muted-foreground">
              {JOBS[normalizeJobId(entry.saveData.jobId)].name} • กดนำเข้าเพื่อบันทึกขึ้นคลาวด์ในบัญชีนี้
            </p>
          </div>
          <button
            type="button"
            disabled={importingKey !== null}
            onClick={() => void handleImportRecoverableSave(entry)}
            className="pixel-btn flex shrink-0 items-center gap-1 bg-accent px-2.5 py-1.5 text-[11px] font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50"
          >
            <UploadCloud className="size-3.5" aria-hidden />
            {importingKey === entry.storageKey ? 'กำลังนำเข้า...' : 'นำเข้า'}
          </button>
        </div>
      ))}
    </div>
  )

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-y-auto p-4">
      <img
        src="/images/title-bg.png"
        alt=""
        className="fixed inset-0 h-full w-full scale-[1.02] object-cover blur-[1px]"
      />
      <div className="fixed inset-0 bg-gradient-to-b from-[#170f16]/70 via-[#1b1218]/60 to-[#120b10]/85" />

      <div className="relative flex w-full max-w-md flex-col items-center gap-4 py-4">
        <div className="flex flex-col items-center text-center">
          <div className="mb-2 flex items-center gap-3">
            <img
              src="/assets/hd/landmarks/angel_fountain.png"
              alt=""
              className="hidden h-12 w-14 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.65)] sm:block"
            />
            <img
              src="/assets/hd/ui/portrait_frame.png"
              alt=""
              className="size-14 rounded-xl object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.75)]"
            />
            <img
              src="/assets/hd/buildings/guild_inn.png"
              alt=""
              className="hidden h-12 w-14 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.65)] sm:block"
            />
          </div>
          <p className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-wider text-amber-300 drop-shadow-[0_3px_0_#2c1810] md:text-5xl">
            PIXEL QUEST
          </p>
          <p className="mt-1 text-sm font-medium text-amber-100/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
            HD Hand-Drawn Fantasy RPG • ผจญภัยโลกแฟนตาซี 2D
          </p>
        </div>

        {kickedNotice && (
          <div className="pixel-panel flex w-full items-start justify-between gap-2 border-destructive/70 bg-destructive/15 p-3 text-xs text-destructive">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div>
                <p className="font-bold">คุณถูก GM ตัดการเชื่อมต่อออกจากเกม</p>
                <p className="mt-0.5 text-[11px] text-foreground/90">{kickedNotice}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                game.kickedNotice = null
                notify()
              }}
              aria-label="ปิดการแจ้งเตือน"
              className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}

        <AccountPanel onAuthSuccess={handleAuthSuccess} />

        <div className="pixel-panel w-full p-5">
          {isLoadingSave ? (
            <p role="status" className="py-8 text-center text-sm text-muted-foreground">
              กำลังโหลดข้อมูลตัวละคร...
            </p>
          ) : user && cloudError ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-xs text-destructive">{cloudError}</p>
              <button
                type="button"
                onClick={() => void refreshCharacters(user)}
                className="pixel-btn bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110"
              >
                ลองโหลดข้อมูลใหม่
              </button>
            </div>
          ) : user && mode === 'list' && cloudChars.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-primary">
                  เลือกตัวละครเพื่อเข้าสู่เกม ({cloudChars.length}/{CHARACTER_SLOTS.length})
                </p>
                {canCreateMoreSlots && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlotForNew(nextAvailableSlot())
                      setName('')
                      setMode('new')
                    }}
                    className="pixel-btn flex items-center gap-1 bg-secondary px-2 py-1 text-[11px] text-foreground hover:brightness-110"
                  >
                    <Plus className="size-3" aria-hidden />
                    สร้างตัวใหม่
                  </button>
                )}
              </div>

              {recoveryBanner}

              <div className="flex flex-col gap-2.5">
                {cloudChars.map((char) => (
                  <div
                    key={char.id}
                    className="rounded-lg border-2 border-[#c9963b]/65 bg-[#1b1416]/85 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border-2 border-[#d4a348] bg-[#2a1d1a]">
                          <SpriteModelCanvas
                            mode="job"
                            id={char.jobId}
                            action="idle"
                            dir="down"
                            size={42}
                            isGm={char.saveData?.gm}
                            showAura={false}
                            label={`ตัวละคร ${char.name}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-primary">{char.name}</p>
                          <p className="text-xs text-foreground">
                            Lv.{char.level} {JOBS[normalizeJobId(char.jobId)].name} •{' '}
                            {MAPS[char.mapId]?.name ?? 'เมือง'}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] text-gold">{formatNum(char.gold)} G</span>
                    </div>

                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      เวลาเล่น {formatPlayTime(char.playTime)} • บันทึกล่าสุด{' '}
                      {new Date(char.saveData.savedAt || Date.now()).toLocaleString('th-TH')}
                    </p>

                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        data-start="true"
                        onClick={() => loginWithCloudCharacter(char)}
                        className="pixel-btn flex flex-1 items-center justify-center gap-1.5 bg-gradient-to-b from-amber-400 to-amber-600 px-3 py-2 text-xs font-bold text-[#241409] hover:brightness-110"
                      >
                        <UserCheck className="size-3.5" aria-hidden />
                        เข้าเล่นตัวละครนี้
                      </button>

                      {confirmDeleteId === char.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleDeleteCloudCharacter(char.id)}
                            className="pixel-btn bg-destructive px-2 py-2 text-[11px] text-white"
                          >
                            ยืนยัน
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="pixel-btn bg-secondary px-2 py-2 text-[11px] text-foreground"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label={`ลบตัวละคร ${char.name}`}
                          onClick={() => setConfirmDeleteId(char.id)}
                          className="pixel-btn grid place-items-center bg-secondary p-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !user && mode === 'list' && guestSave ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-lg border-2 border-[#c9963b]/65 bg-[#1b1416]/85 p-3">
                <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border-2 border-[#d4a348] bg-[#2a1d1a]">
                  <SpriteModelCanvas
                    mode="job"
                    id={guestSave.jobId}
                    action="auto"
                    dir="down"
                    size={52}
                    isGm={guestSave.gm}
                    label={`ตัวละคร ${guestSave.name}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">ตัวละคร Guest ในเครื่องนี้</p>
                  <p className="mt-0.5 truncate text-lg text-primary">{guestSave.name}</p>
                  <p className="text-sm text-foreground">
                    Lv.{guestSave.level} {JOBS[normalizeJobId(guestSave.jobId)].name} •{' '}
                    {MAPS[guestSave.mapId]?.name ?? 'เมือง'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    เวลาเล่น {formatPlayTime(guestSave.playTime)} • บันทึกล่าสุด{' '}
                    {new Date(guestSave.savedAt).toLocaleString('th-TH')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-start="true"
                onClick={() => loadGame(guestSave)}
                className="pixel-btn bg-gradient-to-b from-amber-400 to-amber-600 px-4 py-3 text-lg font-bold text-[#241409] hover:brightness-110"
              >
                เล่นต่อ (Guest)
              </button>
              <button
                type="button"
                onClick={() => setMode('new')}
                className="pixel-btn bg-secondary px-4 py-2 text-secondary-foreground hover:brightness-110"
              >
                เริ่มเกมใหม่
              </button>
            </div>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                startNewCharacter()
              }}
            >
              {recoveryBanner}

              <label htmlFor="hero-name" className="text-sm text-muted-foreground">
                {user ? 'สร้างตัวละครใหม่บนบัญชีของคุณ' : 'ตั้งชื่อตัวละครของคุณ (โหมด Guest)'}
              </label>
              <input
                id="hero-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={16}
                placeholder="นักผจญภัย"
                autoFocus
                className="rounded-lg border-2 border-[#c9963b]/60 bg-[#1a1314] px-3 py-2 text-foreground outline-none focus:border-amber-400"
              />
              <div className="rounded-lg border-2 border-[#c9963b]/60 bg-[#1a1314]/90 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Sprout className="size-3.5 text-emerald-400" aria-hidden />
                    คลาสเริ่มต้น: {JOBS.novice.name}
                  </span>
                  <span className="border border-emerald-400/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                    Tier 0 • Lv.1
                  </span>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="grid size-24 place-items-center rounded-lg border-2 border-[#d4a348]/80 bg-[#0b0f21]/90 shadow-inner">
                      <SpriteModelCanvas
                        mode="job"
                        id="novice"
                        action={noviceAction}
                        dir={noviceDir}
                        size={86}
                        showAura={false}
                        label="โมเดลตัวละคร Novice"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const idx = MODEL_DIRS.indexOf(noviceDir)
                        setNoviceDir(MODEL_DIRS[(idx + 1) % MODEL_DIRS.length])
                      }}
                      className="pixel-btn inline-flex items-center gap-1 bg-secondary px-2 py-0.5 text-[10px] text-foreground hover:brightness-110"
                    >
                      <RotateCw className="size-2.5" aria-hidden />
                      หมุนตัวละคร
                    </button>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-[11px] leading-relaxed text-foreground/90">
                      เริ่มต้นการผจญภัยด้วยตัวละคร <span className="font-semibold text-amber-200">Novice</span>{' '}
                      เสื้อคลุมฮู้ดสีขาว สายสะพายหนัง กระเป๋าคาดเอว และไม้พลอง พร้อมสกิล{' '}
                      <span className="text-sky-300">ฟาดพลังมือใหม่</span> &amp;{' '}
                      <span className="text-pink-300">ปฐมพยาบาล</span>
                    </p>
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Sparkles className="size-3 shrink-0 text-amber-300" aria-hidden />
                      เปลี่ยนเป็น 6 อาชีพหลักได้ที่หอปรมาจารย์อาร์คในเมือง (500 G)
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(
                        [
                          ['auto', 'วนลูป'],
                          ['idle', 'ยืน'],
                          ['walk', 'เดิน'],
                          ['attack', 'ตี'],
                          ['skill', 'สกิล'],
                        ] as Array<[PreviewAction, string]>
                      ).map(([act, lbl]) => (
                        <button
                          key={act}
                          type="button"
                          onClick={() => setNoviceAction(act)}
                          aria-pressed={noviceAction === act}
                          className={`pixel-btn px-2 py-0.5 text-[10px] ${
                            noviceAction === act
                              ? 'bg-amber-400 font-bold text-[#241409]'
                              : 'bg-secondary text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {!user && guestSave && (
                <p className="rounded-md border-2 border-destructive/60 bg-destructive/10 p-2 text-xs text-destructive">
                  การเริ่มเกมใหม่จะลบความคืบหน้าของ {guestSave.name} (Lv.{guestSave.level})
                </p>
              )}
              <button
                type="submit"
                data-start="true"
                className="pixel-btn bg-gradient-to-b from-amber-400 to-amber-600 px-4 py-3 text-lg font-bold text-[#241409] hover:brightness-110"
              >
                สร้างตัวละครและเข้าสู่เกม
              </button>
              {((user && cloudChars.length > 0) || (!user && guestSave)) && (
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  ย้อนกลับไปเลือกตัวละคร
                </button>
              )}
            </form>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/inventory"
            className="pixel-btn bg-primary/25 px-3 py-1.5 text-xs font-semibold text-primary hover:brightness-110"
          >
            คลังไอเทม & อุปกรณ์
          </Link>
          <Link
            href="/tower"
            className="pixel-btn bg-primary/25 px-3 py-1.5 text-xs font-semibold text-primary hover:brightness-110"
          >
            หอคอยไต่ชั้น
          </Link>
          <Link
            href="/encounter"
            className="pixel-btn bg-accent/20 px-3 py-1.5 text-xs font-semibold text-accent hover:brightness-110"
          >
            สนามล่ามอนสเตอร์
          </Link>
          <Link
            href="/class-selector"
            className="pixel-btn bg-secondary px-3 py-1.5 text-xs text-foreground hover:brightness-110"
          >
            เลือกสายอาชีพ
          </Link>
          <Link
            href="/models"
            className="pixel-btn bg-secondary px-3 py-1.5 text-xs font-semibold text-gold hover:brightness-110"
          >
            คลังโมเดล 2D
          </Link>
          <Link
            href="/character-status"
            className="pixel-btn bg-secondary px-3 py-1.5 text-xs text-foreground hover:brightness-110"
          >
            ดูสถานะตัวละคร
          </Link>
          <PWAInstallButton variant="title" />
        </div>

        <p className="text-center text-xs text-foreground/80 drop-shadow-[1px_1px_0_#1a1423]">
          เซฟ Guest แยกตามเครื่อง ส่วนตัวละครที่ล็อคอินด้วย Google จะซิงค์ข้ามเครื่องได้สูงสุด 3 ตัวละคร
        </p>
      </div>
    </div>
  )
}
