'use client'

import { useEffect } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth as firebaseAuth } from '@/lib/firebase/client'
import { ensureUserProfile } from '@/lib/firebase/characters'
import {
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_MOVE_THROTTLE_MS,
  PRESENCE_STALE_MS,
  type RemotePlayerSnapshot,
  filterPlayersForMap,
  pruneStaleRemotePlayers,
  resolvePresenceStatus,
} from '@/lib/firebase/presence-helpers'
import {
  removeWorldPresence,
  subscribeWorldPresence,
  upsertWorldPresence,
} from '@/lib/firebase/presence'
import { computePartySynergyBonus } from '@/lib/firebase/party-helpers'
import { computePartyRoleSynergy } from '@/lib/game/mmo-systems'
import {
  subscribeIncomingPartyInvites,
  subscribeMyPartyState,
  syncMyPartyMemberSnapshot,
} from '@/lib/firebase/parties'
import {
  ackGmDirective,
  pollPublicWorldEvents,
  pollServerGmEvents,
  subscribeIncomingGmDirectives,
  subscribeWorldAnnouncements,
  type GmDirectiveRecord,
  type WorldAnnouncementRecord,
} from '@/lib/firebase/gm-events'
import { createClient } from '@/lib/supabase/client'
import { isGmAccountUser, PERMANENT_GM_GAME_UID, PERMANENT_GM_UID } from '@/lib/game/permissions'
import { ITEMS, JOBS, normalizeJobId } from '@/lib/game/data'
import { getCosmeticDef, sanitizeExtV2 } from '@/lib/game/extended-systems'
import { getActiveMountBonuses } from '@/lib/game/mounts'
import { getEffectiveVipBonuses } from '@/lib/game/premium/vip'
import { sanitizePremiumState } from '@/lib/game/premium/wallet'
import { getActivePetBonuses } from '@/lib/game/systems'
import {
  applyClosedWorldBossCyclesUpdate,
  applyFestivalOverrideUpdate,
  applyGmKickDirective,
  applyGmMuteDirective,
  applyGmSummonWarp,
  applyGmUnmuteDirective,
  applyServerRatesUpdate,
  applyWorldBossTestUpdate,
  game,
  getStats,
  notify,
  receiveRemoteAnnouncement,
  resolveGameUid,
  saveGame,
  say,
  setGameAccountIdentity,
  setNetworkOnlinePlayers,
  subscribe,
  type SaveData,
} from '@/lib/game/engine'

function resolveLocalAppearance(player: SaveData) {
  const job = JOBS[normalizeJobId(player.jobId)]
  const weaponDef = player.equipment.weapon ? ITEMS[player.equipment.weapon.itemId] : null
  const extV2 = sanitizeExtV2(player.extV2)
  const prem = sanitizePremiumState(player.premium, {
    characterId: 'slot_1',
    diamonds: player.diamonds ?? 0,
    ownedGemItems: player.ownedGemItems,
    equippedGemFashion: player.equippedGemFashion,
    unlockedCosmetics: extV2.unlockedCosmetics,
    equippedWing: extV2.equippedWing,
  })
  const vipBonus = getEffectiveVipBonuses(prem.vip)
  const activePet = getActivePetBonuses(player.petState, player.equippedGemCompanion, player.ownedGemItems)
  const activeMount = getActiveMountBonuses(player.mountState, player.ownedGemItems)
  const equippedWeaponSkin = getCosmeticDef(extV2.equippedWeaponSkin)

  const rebirthCount = Math.max(0, Math.min(6, Math.floor(player.rebirthCount ?? 0)))
  const vipLevel = vipBonus.active ? vipBonus.level : 0
  const activeTitle = player.rpgExt?.activeTitle ?? ''
  const guildTag = player.rpgExt?.guildTag ?? ''
  const weaponType = weaponDef?.weaponType ?? job.weaponTypes[0] ?? 'stick'
  const weaponColor = equippedWeaponSkin?.primaryColor ?? weaponDef?.color ?? job.colors.accent ?? ''
  const petId = activePet?.petId ?? ''
  const mountId = activeMount?.mounted ? activeMount.mountId : ''
  const mountSkinId = prem.fashion.equipped.mountAppearance ?? ''
  const fashionCostume = prem.fashion.equipped.costume ?? ''
  const fashionHair = prem.fashion.equipped.hair ?? ''
  const fashionAura = prem.fashion.equipped.aura ?? ''
  const fashionWings = prem.fashion.equipped.wings ?? ''
  const cosmeticWing = extV2.equippedWing ?? ''
  const weaponSkinId = extV2.equippedWeaponSkin ?? ''
  const gemFashionId = player.equippedGemFashion ?? ''
  const nameColor = extV2.nameColor ?? ''

  const appearanceKey = [
    rebirthCount,
    vipLevel,
    activeTitle,
    guildTag,
    weaponType,
    weaponColor,
    petId,
    mountId,
    mountSkinId,
    fashionCostume,
    fashionHair,
    fashionAura,
    fashionWings,
    cosmeticWing,
    weaponSkinId,
    gemFashionId,
    nameColor,
  ].join('|')

  return {
    rebirthCount,
    vipLevel,
    activeTitle,
    guildTag,
    weaponType,
    weaponColor,
    petId,
    mountId,
    mountSkinId,
    fashionCostume,
    fashionHair,
    fashionAura,
    fashionWings,
    cosmeticWing,
    weaponSkinId,
    gemFashionId,
    nameColor,
    appearanceKey,
  }
}

let lastPrivateMessageId = 0

export function PresenceSync() {
  useEffect(() => {
    let stopped = false
    let activeFbUser: User | null = firebaseAuth.currentUser
    let readyProfileUid: string | null = null
    let subscribedFbUid: string | null = null
    let subscribedMapId: string = ''
    let lastKnownLocalMapId = game.p?.mapId ?? ''
    let unsubFbPresence: (() => void) | null = null
    let unsubFbParty: (() => void) | null = null
    let unsubFbPartyInvites: (() => void) | null = null
    let unsubFbAnnouncements: (() => void) | null = null
    let unsubFbDirectives: (() => void) | null = null
    let subscribedPartyUid: string | null = null
    let subscribedGmEventsUid: string | null = null
    let fbPublishInFlight = false
    let lastFbPublishAt = 0
    let lastFbPruneAt = 0
    let lastGmRelayPollAt = 0
    let lastGmRelaySinceMs = Math.max(0, Date.now() - 15_000)
    let gmRelayPollInFlight = false
    let hasPublishedFbPresence = false
    let profileSyncInFlight = false
    let lastProfileRetryAt = 0
    let partySyncInFlight = false
    let lastPartySyncAt = 0
    const handledDirectiveIds = new Set<string>()
    const seenGiftDropIds = new Set<string>()
    let lastPartySent = {
      partyId: '',
      mapId: '',
      level: 0,
      jobId: '',
      name: '',
      hp: -1,
      maxHp: -1,
    }
    let lastSentState = {
      mapId: '',
      x: Number.NaN,
      y: Number.NaN,
      facing: '',
      moving: false,
      status: '',
      jobId: '',
      level: 0,
      name: '',
      attacking: false,
      invisible: false,
      appearanceKey: '',
    }

    const fbRemotePlayers = new Map<string, RemotePlayerSnapshot>()

    const refreshPartySynergy = () => {
      const synergy = computePartySynergyBonus(
        game.party,
        game.onlinePlayers,
        activeFbUser?.uid ?? null,
        game.p?.mapId ?? null,
      )
      const roleSyn = computePartyRoleSynergy(
        game.party,
        game.onlinePlayers,
        activeFbUser?.uid ?? null,
        game.p?.jobId ?? 'novice',
        game.p?.mapId ?? null,
      )
      const roleChanged =
        game.partyRoleBuffs.atkPct !== roleSyn.atkPct ||
        game.partyRoleBuffs.defPct !== roleSyn.defPct ||
        game.partyRoleBuffs.critBonus !== roleSyn.critBonus ||
        game.partyRoleBuffs.hpRegenPct !== roleSyn.hpRegenPct ||
        game.partyRoleBuffs.hasTrinity !== roleSyn.hasTrinity ||
        game.partyRoleBuffs.labels.length !== roleSyn.labels.length
      const changed =
        roleChanged ||
        game.partySameMapCount !== synergy.sameMapMates ||
        game.partyExpMul !== synergy.expMul ||
        game.partyGoldMul !== synergy.goldMul
      game.partySameMapCount = synergy.sameMapMates
      game.partyExpMul = synergy.expMul
      game.partyGoldMul = synergy.goldMul
      game.partyRoleBuffs = {
        tanks: roleSyn.tanks,
        healers: roleSyn.healers,
        dps: roleSyn.dps,
        hasTrinity: roleSyn.hasTrinity,
        atkPct: roleSyn.atkPct,
        defPct: roleSyn.defPct,
        critBonus: roleSyn.critBonus,
        hpRegenPct: roleSyn.hpRegenPct,
        labels: roleSyn.labels,
      }
      return changed
    }

    const syncRemoteLists = (players: RemotePlayerSnapshot[]) => {
      setNetworkOnlinePlayers(players)
      refreshPartySynergy()
    }

    const stopFbParty = () => {
      if (unsubFbParty) {
        unsubFbParty()
        unsubFbParty = null
      }
      if (unsubFbPartyInvites) {
        unsubFbPartyInvites()
        unsubFbPartyInvites = null
      }
      subscribedPartyUid = null
      lastPartySent = { partyId: '', mapId: '', level: 0, jobId: '', name: '', hp: -1, maxHp: -1 }
      if (
        game.party !== null ||
        game.partyInvites.length > 0 ||
        game.partySameMapCount > 0 ||
        game.partyRoleBuffs.labels.length > 0
      ) {
        game.party = null
        game.partyInvites = []
        game.partySameMapCount = 0
        game.partyExpMul = 1
        game.partyGoldMul = 1
        game.partyRoleBuffs = {
          tanks: 0,
          healers: 0,
          dps: 0,
          hasTrinity: false,
          atkPct: 0,
          defPct: 0,
          critBonus: 0,
          hpRegenPct: 0,
          labels: [],
        }
        notify()
      }
    }

    const stopFbGmEvents = () => {
      if (unsubFbAnnouncements) {
        unsubFbAnnouncements()
        unsubFbAnnouncements = null
      }
      if (unsubFbDirectives) {
        unsubFbDirectives()
        unsubFbDirectives = null
      }
      subscribedGmEventsUid = null
    }

    const handleIncomingAnnouncement = (ann: WorldAnnouncementRecord) => {
      if (stopped || !game.p) return
      receiveRemoteAnnouncement({
        id: ann.announcementId,
        body: ann.body,
        authorId: ann.authorUid,
        authorName: ann.authorName,
        expiresAtMs: ann.expiresAtMs,
        variant: ann.variant,
        category: ann.category,
      })
    }

    const handleIncomingDirective = (directive: GmDirectiveRecord) => {
      if (stopped || !game.p || handledDirectiveIds.has(directive.directiveId)) return
      handledDirectiveIds.add(directive.directiveId)
      if (handledDirectiveIds.size > 100) {
        const oldest = handledDirectiveIds.values().next().value
        if (oldest) handledDirectiveIds.delete(oldest)
      }
      if (directive.action === 'summon') {
        applyGmSummonWarp(directive.mapId, directive.x, directive.y, directive.fromName)
        void publishFbPresenceIfNeeded(true)
      } else if (directive.action === 'mute') {
        applyGmMuteDirective(directive.durationMin ?? 15, directive.reason ?? '', directive.fromName)
      } else if (directive.action === 'unmute') {
        applyGmUnmuteDirective(directive.fromName)
      } else if (directive.action === 'kick') {
        void ackGmDirective(directive.directiveId)
        const uid = activeFbUser?.uid
        if (uid && hasPublishedFbPresence) {
          hasPublishedFbPresence = false
          void removeWorldPresence(uid)
        }
        applyGmKickDirective(directive.reason ?? '', directive.fromName)
        return
      }
      void ackGmDirective(directive.directiveId)
    }

    const stopFbPresence = (deleteDocForUid?: string | null) => {
      if (unsubFbPresence) {
        unsubFbPresence()
        unsubFbPresence = null
      }
      subscribedFbUid = null
      fbRemotePlayers.clear()
      stopFbParty()
      stopFbGmEvents()
      if (deleteDocForUid && hasPublishedFbPresence) {
        hasPublishedFbPresence = false
        void removeWorldPresence(deleteDocForUid)
      } else {
        hasPublishedFbPresence = false
      }
      setNetworkOnlinePlayers([])
    }

    const ensureFbWorldSubscription = (user: User) => {
      if (stopped || !user.emailVerified) return
      const activeMapId = game.p?.mapId || 'town'
      if (subscribedFbUid !== user.uid || subscribedMapId !== activeMapId || !unsubFbPresence) {
        if (unsubFbPresence) {
          unsubFbPresence()
          unsubFbPresence = null
        }
        fbRemotePlayers.clear()
        setNetworkOnlinePlayers([])

        subscribedFbUid = user.uid
        subscribedMapId = activeMapId
        unsubFbPresence = subscribeWorldPresence(
          user.uid,
          fbRemotePlayers,
          (players) => {
            if (stopped) return
            if (game.presenceError) {
              game.presenceError = null
            }
            syncRemoteLists(players)
          },
          (error) => {
            if (stopped) return
            const raw = error instanceof Error ? error.message : String(error ?? '')
            if (raw.includes('permission-denied') || raw.includes('Missing or insufficient permissions')) {
              game.presenceError = 'สิทธิ์การอ่านรายชื่อผู้เล่นออนไลน์ถูกปฏิเสธ (permission-denied)'
            } else if (raw.includes('failed-precondition')) {
              game.presenceError = 'ต้องอัปเดตดัชนี Firestore สำหรับระบบผู้เล่นออนไลน์'
            } else {
              game.presenceError = 'เชื่อมต่อรายชื่อผู้เล่นออนไลน์ไม่สำเร็จ กรุณารอสักครู่'
            }
            notify()
          },
          activeMapId,
        )
      }

      if (subscribedPartyUid !== user.uid || !unsubFbParty || !unsubFbPartyInvites) {
        if (unsubFbParty) unsubFbParty()
        if (unsubFbPartyInvites) unsubFbPartyInvites()
        subscribedPartyUid = user.uid
        unsubFbParty = subscribeMyPartyState(user.uid, (party) => {
          if (stopped) return
          game.party = party
          refreshPartySynergy()
          notify()
        })
        unsubFbPartyInvites = subscribeIncomingPartyInvites(user.uid, (invites) => {
          if (stopped) return
          game.partyInvites = invites
          notify()
        })
      }

      if (subscribedGmEventsUid !== user.uid || !unsubFbAnnouncements || !unsubFbDirectives) {
        if (unsubFbAnnouncements) unsubFbAnnouncements()
        if (unsubFbDirectives) unsubFbDirectives()
        subscribedGmEventsUid = user.uid
        unsubFbAnnouncements = subscribeWorldAnnouncements((ann) => {
          handleIncomingAnnouncement(ann)
        })
        unsubFbDirectives = subscribeIncomingGmDirectives(user.uid, (directive) => {
          handleIncomingDirective(directive)
        })
      }
    }

    const syncPartySnapshotIfNeeded = async () => {
      const user = activeFbUser
      const player = game.p
      const party = game.party
      if (stopped || !user || !user.emailVerified || readyProfileUid !== user.uid || !player || !party) {
        return
      }
      if (!party.memberIds.includes(user.uid)) return

      const now = Date.now()
      const stats = getStats(player)
      const hp = Math.max(0, Math.min(stats.maxHp, Math.floor(player.hp)))
      const maxHp = Math.max(1, Math.floor(stats.maxHp))
      const critical =
        lastPartySent.partyId !== party.partyId ||
        lastPartySent.mapId !== player.mapId ||
        lastPartySent.level !== player.level ||
        lastPartySent.jobId !== player.jobId ||
        lastPartySent.name !== player.name
      const hpChangedEnough =
        lastPartySent.maxHp !== maxHp ||
        Math.abs(lastPartySent.hp - hp) >= Math.max(10, Math.round(maxHp * 0.08))
      const periodicDue = now - lastPartySyncAt >= 2_500

      if (!critical && !(hpChangedEnough && periodicDue) && now - lastPartySyncAt < 6_000) {
        return
      }
      if (partySyncInFlight) return

      partySyncInFlight = true
      lastPartySyncAt = now
      lastPartySent = {
        partyId: party.partyId,
        mapId: player.mapId,
        level: player.level,
        jobId: player.jobId,
        name: player.name,
        hp,
        maxHp,
      }

      try {
        await syncMyPartyMemberSnapshot(party.partyId, {
          gameUid: player.gameUid,
          uid: player.uid,
          name: player.name,
          jobId: player.jobId,
          level: player.level,
          hp,
          maxHp,
          mapId: player.mapId,
        })
      } catch {
        // Non-blocking; next sync interval retries cleanly.
      } finally {
        partySyncInFlight = false
      }
    }

    const publishFbPresenceIfNeeded = async (force = false) => {
      const user = activeFbUser
      const player = game.p
      if (stopped || !user || !user.emailVerified || readyProfileUid !== user.uid || !player) {
        return
      }

      if (player.invisible) {
        if (hasPublishedFbPresence) {
          hasPublishedFbPresence = false
          lastSentState.invisible = true
          void removeWorldPresence(user.uid)
        }
        return
      }

      const now = Date.now()
      const attacking = game.attackAnim > 0
      const inCombat = game.combatT < 4
      const nextStatus = resolvePresenceStatus({
        mapId: player.mapId,
        moving: game.moving,
        attackAnim: game.attackAnim,
        inCombat,
      })
      const dist = Number.isFinite(lastSentState.x)
        ? Math.hypot(player.x - lastSentState.x, player.y - lastSentState.y)
        : Number.POSITIVE_INFINITY

      const appearance = resolveLocalAppearance(player)
      const criticalChange =
        lastSentState.mapId !== player.mapId ||
        lastSentState.facing !== game.facing ||
        lastSentState.moving !== game.moving ||
        lastSentState.status !== nextStatus ||
        lastSentState.jobId !== player.jobId ||
        lastSentState.level !== player.level ||
        lastSentState.name !== player.name ||
        lastSentState.invisible !== Boolean(player.invisible) ||
        lastSentState.appearanceKey !== appearance.appearanceKey ||
        (!lastSentState.attacking && attacking)

      const movedEnough = dist >= 2
      const heartbeatDue = now - lastFbPublishAt >= PRESENCE_HEARTBEAT_MS

      if (!force && !criticalChange && !movedEnough && !heartbeatDue) {
        return
      }
      if (!force && !criticalChange && now - lastFbPublishAt < PRESENCE_MOVE_THROTTLE_MS) {
        return
      }
      if (fbPublishInFlight) return

      fbPublishInFlight = true
      lastFbPublishAt = now
      lastSentState = {
        mapId: player.mapId,
        x: player.x,
        y: player.y,
        facing: game.facing,
        moving: game.moving,
        status: nextStatus,
        jobId: player.jobId,
        level: player.level,
        name: player.name,
        attacking,
        invisible: Boolean(player.invisible),
        appearanceKey: appearance.appearanceKey,
      }

      try {
        const ok = await upsertWorldPresence({
          userId: user.uid,
          isGm: Boolean(player.gm && isGmAccountUser(user)),
          gameUid: player.gameUid,
          uid: player.uid,
          name: player.name,
          jobId: player.jobId,
          mapId: player.mapId,
          x: player.x,
          y: player.y,
          level: player.level,
          facing: game.facing,
          moving: game.moving,
          attackAnim: game.attackAnim,
          inCombat,
          invisible: Boolean(player.invisible),
          nowMs: now,
          rebirthCount: appearance.rebirthCount,
          vipLevel: appearance.vipLevel,
          activeTitle: appearance.activeTitle,
          guildTag: appearance.guildTag,
          weaponType: appearance.weaponType,
          weaponColor: appearance.weaponColor,
          petId: appearance.petId,
          mountId: appearance.mountId,
          mountSkinId: appearance.mountSkinId,
          fashionCostume: appearance.fashionCostume,
          fashionHair: appearance.fashionHair,
          fashionAura: appearance.fashionAura,
          fashionWings: appearance.fashionWings,
          cosmeticWing: appearance.cosmeticWing,
          weaponSkinId: appearance.weaponSkinId,
          gemFashionId: appearance.gemFashionId,
          nameColor: appearance.nameColor,
        })
        if (ok) {
          hasPublishedFbPresence = true
          if (game.presenceError) {
            game.presenceError = null
            notify()
          }
        }
      } catch (error) {
        const raw = error instanceof Error ? error.message : String(error ?? '')
        if (raw.includes('permission-denied') || raw.includes('Missing or insufficient permissions')) {
          game.presenceError = 'ไม่สามารถอัปเดตพิกัดออนไลน์ได้ (permission-denied)'
          notify()
        }
      } finally {
        fbPublishInFlight = false
      }
    }

    const syncFirebaseIdentity = async (fbUser: User | null) => {
      const prevUid = activeFbUser?.uid ?? null
      activeFbUser = fbUser
      const player = game.p
      if (stopped || !player) return

      if (!fbUser) {
        readyProfileUid = null
        game.presenceError = null
        stopFbPresence(prevUid)
        return
      }

      if (!fbUser.emailVerified) {
        readyProfileUid = null
        game.presenceError = 'บัญชีนี้ยังไม่ได้ยืนยันอีเมล จึงยังไม่สามารถเชื่อมออนไลน์ได้'
        stopFbPresence(prevUid)
        notify()
        return
      }

      if (prevUid && prevUid !== fbUser.uid) {
        readyProfileUid = null
        stopFbPresence(prevUid)
      }

      const isGm = isGmAccountUser(fbUser)
      if (isGm) {
        const changed =
          !player.gm ||
          player.gameUid !== PERMANENT_GM_GAME_UID ||
          player.uid !== PERMANENT_GM_UID
        player.gm = true
        player.gameUid = PERMANENT_GM_GAME_UID
        player.uid = PERMANENT_GM_UID
        setGameAccountIdentity(fbUser.uid, PERMANENT_GM_UID, PERMANENT_GM_GAME_UID, true)
        if (changed) notify()
      }

      if (profileSyncInFlight) return
      profileSyncInFlight = true
      try {
        const identity = await ensureUserProfile(fbUser)
        if (stopped || !game.p || activeFbUser?.uid !== fbUser.uid) return
        const p = game.p
        const numUid = identity.isGm ? PERMANENT_GM_UID : Number(identity.gameUid)
        const changed =
          p.gm !== identity.isGm ||
          p.gameUid !== identity.gameUid ||
          p.uid !== numUid

        setGameAccountIdentity(fbUser.uid, numUid, identity.gameUid, identity.isGm)
        p.gameUid = identity.gameUid
        p.uid = numUid
        p.gm = identity.isGm
        if (!identity.isGm) {
          p.god = false
          p.invisible = false
          p.speed = 1
          if (p.jobId === 'gm') p.jobId = 'novice'
        }
        readyProfileUid = fbUser.uid
        lastKnownLocalMapId = p.mapId
        game.presenceError = null
        if (changed) {
          saveGame()
        }
        notify()
        ensureFbWorldSubscription(fbUser)
        void publishFbPresenceIfNeeded(true)
      } catch (error) {
        const raw = error instanceof Error ? error.message : String(error ?? '')
        if (raw.includes('permission-denied') || raw.includes('Missing or insufficient permissions')) {
          game.presenceError = 'ซิงค์บัญชีกับ Firestore ไม่ผ่าน (permission-denied)'
        } else {
          game.presenceError = 'กำลังเชื่อมต่อเซิร์ฟเวอร์ออนไลน์ใหม่...'
        }
        notify()
      } finally {
        profileSyncInFlight = false
      }
    }

    const unsubFbAuth = onAuthStateChanged(firebaseAuth, (fbUser) => {
      void syncFirebaseIdentity(fbUser)
    })
    void syncFirebaseIdentity(firebaseAuth.currentUser)

    const fbTickTimer = window.setInterval(() => {
      const user = activeFbUser
      const player = game.p
      if (stopped || !user || !user.emailVerified || !player) return

      if (lastKnownLocalMapId !== player.mapId) {
        lastKnownLocalMapId = player.mapId
        setNetworkOnlinePlayers([...fbRemotePlayers.values()])
        refreshPartySynergy()
      }

      if (readyProfileUid === user.uid) {
        ensureFbWorldSubscription(user)
        void publishFbPresenceIfNeeded(false)
        void syncPartySnapshotIfNeeded()
      } else if (!profileSyncInFlight && Date.now() - lastProfileRetryAt >= 4_000) {
        lastProfileRetryAt = Date.now()
        void syncFirebaseIdentity(user)
      }

      const now = Date.now()
      if (!gmRelayPollInFlight && now - lastGmRelayPollAt >= 2_500) {
        gmRelayPollInFlight = true
        lastGmRelayPollAt = now
        void pollServerGmEvents(lastGmRelaySinceMs)
          .then((res) => {
            if (!res || stopped || !game.p) return
            applyServerRatesUpdate(res.serverRates)
            applyClosedWorldBossCyclesUpdate(res.closedWorldBossCycles)
            applyWorldBossTestUpdate(res.worldBossTest)
            applyFestivalOverrideUpdate(res.festivalOverride)
            for (const ann of res.announcements) handleIncomingAnnouncement(ann)
            for (const dir of res.directives) handleIncomingDirective(dir)
            const claimedSet = new Set(game.p.claimedGiftDropIds ?? [])
            const nowCheck = Date.now()
            for (const drop of res.giftDrops) {
              if (!drop?.dropId || seenGiftDropIds.has(drop.dropId)) continue
              seenGiftDropIds.add(drop.dropId)
              if (drop.expiresAtMs > nowCheck && !claimedSet.has(drop.dropId)) {
                say('system', `🎁 มีของขวัญทั้งเซิร์ฟ "${drop.subject}" รอให้กดรับในกล่องจดหมาย!`)
                notify()
              }
            }
            lastGmRelaySinceMs = Math.max(0, res.serverTimeMs - 14_000)
          })
          .finally(() => {
            gmRelayPollInFlight = false
          })
      }
      if (fbRemotePlayers.size > 0 && now - lastFbPruneAt >= 1000) {
        lastFbPruneAt = now
        const before = fbRemotePlayers.size
        const nextList = pruneStaleRemotePlayers(fbRemotePlayers, now, PRESENCE_STALE_MS)
        if (nextList.length !== before) {
          syncRemoteLists(nextList)
        }
      }
    }, 100)

    const onPageHide = () => {
      const uid = activeFbUser?.uid
      if (uid && hasPublishedFbPresence) {
        hasPublishedFbPresence = false
        void removeWorldPresence(uid)
      }
    }
    window.addEventListener('pagehide', onPageHide)

    const syncPublicWorldEvents = () => {
      if (stopped || !game.p) return
      if (activeFbUser?.emailVerified) return
      void pollPublicWorldEvents(lastGmRelaySinceMs).then((res) => {
        if (!res || stopped || !game.p) return
        applyServerRatesUpdate(res.serverRates)
        applyClosedWorldBossCyclesUpdate(res.closedWorldBossCycles)
        applyWorldBossTestUpdate(res.worldBossTest)
        applyFestivalOverrideUpdate(res.festivalOverride)
        for (const ann of res.announcements) handleIncomingAnnouncement(ann)
        lastGmRelaySinceMs = Math.max(0, res.serverTimeMs - 14_000)
      })
    }
    syncPublicWorldEvents()
    const publicWorldTimer = window.setInterval(syncPublicWorldEvents, 4_000)

    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch {
      supabase = null
    }

    if (!supabase) {
      return () => {
        stopped = true
        window.removeEventListener('pagehide', onPageHide)
        window.clearInterval(fbTickTimer)
        window.clearInterval(publicWorldTimer)
        unsubFbAuth()
        stopFbPresence(activeFbUser?.uid ?? null)
      }
    }

    let syncing = false
    let channelReady = false
    let lastSync = 0
    let lastBroadcast = 0
    let lastPlayerPrune = 0
    let boundUserId: string | null = null
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null
    const remotePlayers = new Map<string, NonNullable<typeof game.remotePlayers>[number]>()

    const publishRemotePlayers = () => {
      const cutoff = Date.now() - 15_000
      for (const [userId, player] of remotePlayers) if (player.lastSeen < cutoff) remotePlayers.delete(userId)
      const all = [...remotePlayers.values()]
      setNetworkOnlinePlayers(all)
    }

    const receiveSnapshot = (value: unknown) => {
      if (!value || typeof value !== 'object') return
      const snapshot = value as NonNullable<typeof game.remotePlayers>[number]
      if (
        !snapshot.userId || snapshot.userId === boundUserId ||
        typeof snapshot.displayName !== 'string' || typeof snapshot.mapId !== 'string' ||
        !Number.isFinite(snapshot.x) || !Number.isFinite(snapshot.y) ||
        !Number.isFinite(snapshot.lastSeen) || !snapshot.facing || snapshot.lastSeen < Date.now() - 15_000
      ) return
      const current = remotePlayers.get(snapshot.userId)
      if (current && current.lastSeen > snapshot.lastSeen) return
      if (snapshot.invisible) {
        if (current) {
          remotePlayers.delete(snapshot.userId)
          publishRemotePlayers()
        }
        return
      }
      remotePlayers.set(snapshot.userId, {
        ...snapshot,
        previousX: current?.mapId === snapshot.mapId ? current.x : snapshot.x,
        previousY: current?.mapId === snapshot.mapId ? current.y : snapshot.y,
        receivedAt: Date.now(),
      })
      publishRemotePlayers()
    }

    const stopChannel = () => {
      channelReady = false
      if (channel && supabase) void supabase.removeChannel(channel)
      channel = null
      remotePlayers.clear()
      setNetworkOnlinePlayers([])
    }

    const startChannel = (userId: string) => {
      if (!supabase) return
      if (channel) void supabase.removeChannel(channel)
      channelReady = false
      channel = supabase
        .channel('pixel-quest-world', { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'player-state' }, ({ payload }) => receiveSnapshot(payload))
        .subscribe((status) => { channelReady = status === 'SUBSCRIBED' })
      boundUserId = userId
      lastPrivateMessageId = 0
    }

    const currentSnapshot = (userId: string, uid: number) => {
      const player = game.p
      if (!player) return null
      const appearance = resolveLocalAppearance(player)
      return {
        userId,
        displayName: player.name,
        classId: player.jobId,
        jobId: player.jobId,
        mapId: player.mapId,
        x: player.x,
        y: player.y,
        level: player.level,
        uid,
        gm: Boolean(player.gm),
        facing: game.facing,
        moving: game.moving,
        attackAnim: game.attackAnim,
        invisible: Boolean(player.invisible),
        lastSeen: Date.now(),
        rebirthCount: appearance.rebirthCount,
        vipLevel: appearance.vipLevel,
        activeTitle: appearance.activeTitle,
        guildTag: appearance.guildTag,
        weaponType: appearance.weaponType,
        weaponColor: appearance.weaponColor,
        petId: appearance.petId,
        mountId: appearance.mountId,
        mountSkinId: appearance.mountSkinId,
        fashionCostume: appearance.fashionCostume,
        fashionHair: appearance.fashionHair,
        fashionAura: appearance.fashionAura,
        fashionWings: appearance.fashionWings,
        cosmeticWing: appearance.cosmeticWing,
        weaponSkinId: appearance.weaponSkinId,
        gemFashionId: appearance.gemFashionId,
        nameColor: appearance.nameColor,
      }
    }

    const loadPrivateMessages = async () => {
      const userId = boundUserId
      if (!userId || stopped || !supabase) return
      const { data: whispers, error } = await supabase
        .from('private_messages')
        .select('id, sender_id, body')
        .gt('id', lastPrivateMessageId)
        .order('id', { ascending: true })
        .limit(20)
      if (error) return
      for (const whisper of whispers ?? []) {
        lastPrivateMessageId = Math.max(lastPrivateMessageId, Number(whisper.id))
        say('player', `[กระซิบ] ${whisper.body}`, whisper.sender_id === userId ? 'ถึงผู้เล่น' : `จาก ${whisper.sender_id.slice(0, 8)}`)
      }
      if (whispers?.length) notify()
    }

    const sync = async (force = false) => {
      if (syncing || (!force && Date.now() - lastSync < 5000) || !supabase) return
      if (firebaseAuth.currentUser) {
        if (boundUserId) {
          stopChannel()
          boundUserId = null
        }
        await syncFirebaseIdentity(firebaseAuth.currentUser)
        lastSync = Date.now()
        return
      }
      syncing = true
      try {
        const { data } = await supabase.auth.getUser()
        let player = game.p
        if (stopped || !player) return
        if (!data.user) {
          if (boundUserId) stopChannel()
          boundUserId = null
          const hadPrivileges = player.gm || player.uid !== undefined || player.god || player.invisible || player.speed !== 1 || player.jobId === 'gm'
          player.uid = undefined
          player.gameUid = undefined
          player.gm = false
          player.god = false
          player.invisible = false
          player.speed = 1
          if (player.jobId === 'gm') player.jobId = 'novice'
          if (hadPrivileges) notify()
          lastSync = Date.now()
          return
        }
        if (boundUserId && boundUserId !== data.user.id) {
          stopChannel()
          player.uid = undefined
          player.gameUid = undefined
          player.gm = false
          player.god = false
          player.invisible = false
          player.speed = 1
          if (player.jobId === 'gm') player.jobId = 'novice'
          notify()
          boundUserId = null
          return
        }
        if (!boundUserId) startChannel(data.user.id)
        setGameAccountIdentity(data.user.id)
        const uid = await resolveGameUid(data.user.id)
        if (stopped || boundUserId !== data.user.id) return
        player = game.p
        if (!player) return
        if (uid === undefined) {
          lastSync = Date.now()
          return
        }
        const isGm = isGmAccountUser(firebaseAuth.currentUser)
        const identityChanged = player.uid !== uid || player.gm !== isGm
        player.uid = uid
        player.gm = isGm
        if (!isGm) {
          player.god = false
          player.invisible = false
          player.speed = 1
          if (player.jobId === 'gm') player.jobId = 'novice'
        }
        if (identityChanged) saveGame()
        const snapshot = currentSnapshot(data.user.id, uid)
        const now = new Date().toISOString()
        if (snapshot) {
          await supabase.from('game_rooms').upsert({
            room_id: `global:${data.user.id}`,
            host_id: data.user.id,
            snapshot,
            updated_at: now,
          })
        }
        const { data: rows } = await supabase
          .from('game_rooms')
          .select('host_id, snapshot, updated_at')
          .like('room_id', 'global:%')
        for (const row of rows ?? []) {
          if (row.host_id === data.user.id || Date.parse(row.updated_at) <= Date.now() - 15_000) continue
          receiveSnapshot({ ...(row.snapshot as object), userId: row.host_id, lastSeen: Date.parse(row.updated_at) })
        }
        const { data: announcements } = await supabase
          .from('world_announcements')
          .select('author_id, body, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
        const latest = announcements?.[0]
        if (latest) {
          const createdAt = Date.parse(latest.created_at)
          if (Date.now() - createdAt < 12_000) game.announcement = { body: latest.body, authorId: latest.author_id, until: createdAt + 12_000 }
        }
        lastSync = Date.now()
        await loadPrivateMessages()
        notify()
      } catch {
        lastSync = Date.now()
      } finally {
        syncing = false
      }
    }

    void sync(true)
    const unsubscribe = subscribe(sync)
    const syncTimer = window.setInterval(() => void sync(true), 5000)
    const whisperTimer = window.setInterval(() => void loadPrivateMessages(), 2000)
    const broadcastTimer = window.setInterval(() => {
      if (firebaseAuth.currentUser) return
      const now = Date.now()
      if (remotePlayers.size && now - lastPlayerPrune >= 1000) {
        lastPlayerPrune = now
        publishRemotePlayers()
      }
      const userId = boundUserId
      const player = game.p
      if (!channelReady || !userId || !player || player.uid === undefined) return
      const interval = game.moving ? 100 : 1500
      if (now - lastBroadcast < interval) return
      lastBroadcast = now
      const snapshot = currentSnapshot(userId, player.uid)
      if (snapshot) void channel?.send({ type: 'broadcast', event: 'player-state', payload: snapshot })
    }, 100)

    return () => {
      stopped = true
      window.removeEventListener('pagehide', onPageHide)
      window.clearInterval(fbTickTimer)
      window.clearInterval(publicWorldTimer)
      unsubFbAuth()
      stopFbPresence(activeFbUser?.uid ?? null)
      unsubscribe()
      window.clearInterval(syncTimer)
      window.clearInterval(whisperTimer)
      window.clearInterval(broadcastTimer)
      stopChannel()
    }
  }, [])

  return null
}
