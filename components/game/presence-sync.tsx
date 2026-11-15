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
import {
  subscribeIncomingPartyInvites,
  subscribeMyPartyState,
  syncMyPartyMemberSnapshot,
} from '@/lib/firebase/parties'
import { createClient } from '@/lib/supabase/client'
import { isGmAccountUser, PERMANENT_GM_GAME_UID, PERMANENT_GM_UID } from '@/lib/game/permissions'
import { game, getStats, notify, resolveGameUid, saveGame, say, setGameAccountIdentity, subscribe } from '@/lib/game/engine'

let lastPrivateMessageId = 0

export function PresenceSync() {
  useEffect(() => {
    let stopped = false
    let activeFbUser: User | null = firebaseAuth.currentUser
    let readyProfileUid: string | null = null
    let subscribedFbUid: string | null = null
    let lastKnownLocalMapId = game.p?.mapId ?? ''
    let unsubFbPresence: (() => void) | null = null
    let unsubFbParty: (() => void) | null = null
    let unsubFbPartyInvites: (() => void) | null = null
    let subscribedPartyUid: string | null = null
    let fbPublishInFlight = false
    let lastFbPublishAt = 0
    let lastFbPruneAt = 0
    let hasPublishedFbPresence = false
    let partySyncInFlight = false
    let lastPartySyncAt = 0
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
    }

    const fbRemotePlayers = new Map<string, RemotePlayerSnapshot>()

    const refreshPartySynergy = () => {
      const synergy = computePartySynergyBonus(
        game.party,
        game.onlinePlayers,
        activeFbUser?.uid ?? null,
        game.p?.mapId ?? null,
      )
      const changed =
        game.partySameMapCount !== synergy.sameMapMates ||
        game.partyExpMul !== synergy.expMul ||
        game.partyGoldMul !== synergy.goldMul
      game.partySameMapCount = synergy.sameMapMates
      game.partyExpMul = synergy.expMul
      game.partyGoldMul = synergy.goldMul
      return changed
    }

    const syncRemoteLists = (players: RemotePlayerSnapshot[]) => {
      game.onlinePlayers = players
      game.remotePlayers = filterPlayersForMap(players, game.p?.mapId)
      refreshPartySynergy()
      notify()
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
      if (game.party !== null || game.partyInvites.length > 0 || game.partySameMapCount > 0) {
        game.party = null
        game.partyInvites = []
        game.partySameMapCount = 0
        game.partyExpMul = 1
        game.partyGoldMul = 1
        notify()
      }
    }

    const stopFbPresence = (deleteDocForUid?: string | null) => {
      if (unsubFbPresence) {
        unsubFbPresence()
        unsubFbPresence = null
      }
      subscribedFbUid = null
      fbRemotePlayers.clear()
      stopFbParty()
      if (deleteDocForUid && hasPublishedFbPresence) {
        hasPublishedFbPresence = false
        void removeWorldPresence(deleteDocForUid)
      } else {
        hasPublishedFbPresence = false
      }
      if (game.onlinePlayers.length > 0 || game.remotePlayers.length > 0) {
        game.onlinePlayers = []
        game.remotePlayers = []
        notify()
      }
    }

    const ensureFbWorldSubscription = (user: User) => {
      if (stopped || !user.emailVerified) return
      if (subscribedFbUid !== user.uid || !unsubFbPresence) {
        if (unsubFbPresence) {
          unsubFbPresence()
          unsubFbPresence = null
        }
        fbRemotePlayers.clear()
        game.onlinePlayers = []
        game.remotePlayers = []
        notify()

        subscribedFbUid = user.uid
        unsubFbPresence = subscribeWorldPresence(
          user.uid,
          fbRemotePlayers,
          (players) => {
            if (stopped) return
            syncRemoteLists(players)
          },
          () => {
            // Errors logged by subscribeWorldPresence; keep game loop non-blocking.
          },
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

      const criticalChange =
        lastSentState.mapId !== player.mapId ||
        lastSentState.facing !== game.facing ||
        lastSentState.moving !== game.moving ||
        lastSentState.status !== nextStatus ||
        lastSentState.jobId !== player.jobId ||
        lastSentState.level !== player.level ||
        lastSentState.name !== player.name ||
        lastSentState.invisible !== Boolean(player.invisible) ||
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
        })
        if (ok) {
          hasPublishedFbPresence = true
        }
      } catch {
        // Keep game loop running; next heartbeat or move retries automatically.
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
        stopFbPresence(prevUid)
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
        if (changed) {
          saveGame()
          notify()
        }
        ensureFbWorldSubscription(fbUser)
        void publishFbPresenceIfNeeded(true)
      } catch {
        // Keep cached identity if Firestore sync temporarily fails.
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
        game.remotePlayers = filterPlayersForMap([...fbRemotePlayers.values()], player.mapId)
        refreshPartySynergy()
        notify()
      }

      if (readyProfileUid === user.uid) {
        ensureFbWorldSubscription(user)
        void publishFbPresenceIfNeeded(false)
        void syncPartySnapshotIfNeeded()
      }

      const now = Date.now()
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
      game.onlinePlayers = all
      game.remotePlayers = all.filter((other) => !other.invisible && other.mapId === game.p?.mapId)
      notify()
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
      game.onlinePlayers = []
      game.remotePlayers = []
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
