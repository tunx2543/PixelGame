import type { ChatChannel } from './mmo-systems'

export type BotDir = 'down' | 'up' | 'left' | 'right'

export interface PlayerBotDef {
  userId: string
  uid: number
  gameUid: string
  displayName: string
  jobId: 'swordsman' | 'mage' | 'archer'
  level: number
  rebirthCount: number
  vipLevel: number
  guildTag: string
  activeTitle: string
  weaponType: 'sword' | 'staff' | 'bow'
  weaponColor: string
  weaponSkinId: string
  fashionCostume: string
  fashionHair: string
  fashionWings?: string
  petId?: string
  mountId?: string
  combatPower: number
  arenaRating: number
  arenaWins: number
  highestTowerFloor: number
  homeMapId: string
  roamMaps: readonly string[]
  startTile: { tx: number; ty: number }
  ranged: boolean
  attackRange: number
  attackCooldown: number
  moveSpeed: number
  baseDamage: number
  personalityPrompt: string
  ambientLines: {
    town: readonly string[]
    combat: readonly string[]
    kill: readonly string[]
  }
}

export interface BotEntityState {
  def: PlayerBotDef
  mapId: string
  x: number
  y: number
  vx: number
  vy: number
  facing: BotDir
  moving: boolean
  status: 'town' | 'idle' | 'moving' | 'combat'
  attackAnim: number
  attackCd: number
  wanderT: number
  pauseT: number
  mapTravelT: number
  ambientChatT: number
  targetMonsterUid: string | null
  bubble: { text: string; until: number } | null
  lastSeen: number
}

export interface BotMonsterTarget {
  uid: string
  defId: string
  name: string
  x: number
  y: number
  hp: number
  maxHp: number
  dead: boolean
  boss?: boolean
}

export interface BotRemoteSnapshot {
  userId: string
  uid: number
  gameUid: string
  displayName: string
  classId: string
  jobId: string
  mapId: string
  x: number
  y: number
  level: number
  gm: boolean
  facing: BotDir
  moving: boolean
  status: 'town' | 'idle' | 'moving' | 'combat'
  attackAnim: number
  invisible: boolean
  lastSeen: number
  rebirthCount: number
  vipLevel: number
  activeTitle: string
  guildTag: string
  weaponType: 'sword' | 'staff' | 'bow'
  weaponColor: string
  petId?: string
  mountId?: string
  fashionCostume?: string
  fashionHair?: string
  fashionWings?: string
  weaponSkinId?: string
  bubble?: { text: string; until: number } | null
}

export interface BotStepContext {
  dt: number
  nowMs: number
  timeSec: number
  currentMapId: string
  mapSafe: boolean
  mapWidthPx: number
  mapHeightPx: number
  tileSize: number
  playerX: number
  playerY: number
  monsters: readonly BotMonsterTarget[]
  isBlocked: (x: number, y: number) => boolean
  onAttackMonster: (bot: BotEntityState, monster: BotMonsterTarget, damage: number, isCrit: boolean) => void
  onSpawnVisualEffect: (effect: {
    kind: 'slash' | 'arrow' | 'magic'
    fromX: number
    fromY: number
    toX: number
    toY: number
    color: string
  }) => void
  onBotChat: (bot: BotEntityState, text: string, channel: Exclude<ChatChannel, 'all'>) => void
}

const TILE_PX = 16

export const PLAYER_BOT_DEFS: readonly PlayerBotDef[] = [
  {
    userId: 'bot_kaito',
    uid: 9001,
    gameUid: '9001',
    displayName: 'ไคโตะ',
    jobId: 'swordsman',
    level: 18,
    rebirthCount: 1,
    vipLevel: 2,
    guildTag: 'ASURA',
    activeTitle: 'goblin_slayer',
    weaponType: 'sword',
    weaponColor: '#38bdf8',
    weaponSkinId: 'wskin_starlight',
    fashionCostume: 'costume_royal_knight',
    fashionHair: 'hair_crimson_spike',
    petId: 'phao_silver_wolf',
    mountId: 'dog',
    combatPower: 1480,
    arenaRating: 1185,
    arenaWins: 9,
    highestTowerFloor: 14,
    homeMapId: 'town',
    roamMaps: ['town', 'meadow'],
    startTile: { tx: 19, ty: 18 },
    ranged: false,
    attackRange: 25,
    attackCooldown: 0.95,
    moveSpeed: 76,
    baseDamage: 24,
    personalityPrompt:
      'ชื่อ ไคโตะ (สายดาบ/แทงค์ กิลด์ ASURA) นิสัยห้าวๆ ใจถึง พูดจาเป็นกันเอง ชอบชวนตีบอสหรือลงดันเจี้ยน พิมพ์ภาษาแชทเกมไทยสั้นๆ มีอิโมจิบ้างเช่น ⚔️🔥💪',
    ambientLines: {
      town: [
        'แวะเช็กของในเมืองแป๊บ เดี๋ยวออกไปฟาร์มทุ่งหญ้าต่อ ⚔️',
        'ใครจะไปตีมอนทุ่งหญ้าหรือป่าลึก ทักมาได้นะ!',
        'ตีบวกดาบติดแล้ววว แรงขึ้นเยอะเลย 🔥',
      ],
      combat: [
        'เข้ามาเลยเจ้ามอน! 💪',
        'รับดาบแสงดาราไปกินซะ ⚔️',
      ],
      kill: [
        'เรียบร้อย! ตัวต่อไปอยู่ไหน 🔥',
        'ฟาร์มเพลินเลยแมพนี้',
      ],
    },
  },
  {
    userId: 'bot_mina',
    uid: 9002,
    gameUid: '9002',
    displayName: 'มีน่าจัง',
    jobId: 'mage',
    level: 15,
    rebirthCount: 0,
    vipLevel: 1,
    guildTag: 'STAR',
    activeTitle: 'slime_hunter',
    weaponType: 'staff',
    weaponColor: '#f472b6',
    weaponSkinId: 'wskin_sakura',
    fashionCostume: 'costume_sakura_kimono',
    fashionHair: 'hair_celestial_twintail',
    petId: 'phao_ribbon_bunny',
    combatPower: 1210,
    arenaRating: 1090,
    arenaWins: 4,
    highestTowerFloor: 11,
    homeMapId: 'town',
    roamMaps: ['town', 'meadow'],
    startTile: { tx: 25, ty: 17 },
    ranged: true,
    attackRange: 72,
    attackCooldown: 1.1,
    moveSpeed: 70,
    baseDamage: 22,
    personalityPrompt:
      'ชื่อ มีน่าจัง (สายเวท กิลด์ STAR) นิสัยสดใสร่าเริง ขี้เล่น ชอบทักทายเพื่อนในเมืองและชวนเก็บเลเวล พิมพ์ภาษาไทยน่ารักๆ สั้นๆ ใช้อิโมจิบ้างเช่น ✨🪄😀🫶',
    ambientLines: {
      town: [
        'วันนี้คนคึกคักจังเลย สู้ๆ นะทุกคน ✨',
        'กำลังเก็บตังค์เปิดตู้สุ่มปีกอยู่ ใครได้ปีกแรร์แล้วบ้าง 🫶',
        'แวะเติมโพชั่นแป๊บ เดี๋ยวไปยิงสไลม์ต่อ 🪄',
      ],
      combat: [
        'เวทซากุระ! ✨',
        'อย่ายืนนิ่งสิ ยิงไม่โดนนะ 🪄',
      ],
      kill: [
        'เย้! หลบเก่งแค่ไหนก็โดนเวทอยู่ดี 😀',
        'ขอให้ดรอปหินตีบวกทีเถอะ 🍀',
      ],
    },
  },
  {
    userId: 'bot_zex',
    uid: 9003,
    gameUid: '9003',
    displayName: 'เซ็กซ์',
    jobId: 'archer',
    level: 24,
    rebirthCount: 2,
    vipLevel: 3,
    guildTag: 'PHANTOM',
    activeTitle: 'boss_breaker',
    weaponType: 'bow',
    weaponColor: '#34d399',
    weaponSkinId: 'wskin_event_aurora',
    fashionCostume: 'costume_shadow_phantom',
    fashionHair: 'hair_silver_lunar',
    fashionWings: 'wing_drv_a7582c8d',
    petId: 'crystal_owl',
    combatPower: 2290,
    arenaRating: 1340,
    arenaWins: 16,
    highestTowerFloor: 21,
    homeMapId: 'meadow',
    roamMaps: ['meadow', 'forest', 'town'],
    startTile: { tx: 10, ty: 17 },
    ranged: true,
    attackRange: 84,
    attackCooldown: 0.88,
    moveSpeed: 84,
    baseDamage: 30,
    personalityPrompt:
      'ชื่อ เซ็กซ์ (สายธนู กิลด์ PHANTOM) นิสัยสุขุม มีความรู้เรื่องมอนสเตอร์ บอส และการฟาร์ม ชอบแนะนำทริคสั้นๆ แบบเกมเมอร์มือโปร ใช้อิโมจิบ้างเช่น 🏹💎😎👍',
    ambientLines: {
      town: [
        'ช่วงนี้ฟาร์มป่าลึกดรอปของคุ้มมาก แนะนำเลย 🏹',
        'อย่าลืมกดทำเควสรายวันเอาเพชรฟรีด้วยนะ 💎',
      ],
      combat: [
        'ล็อกเป้าเรียบร้อย 🏹',
        'คริติคอลเข้าเต็มๆ 🎯',
      ],
      kill: [
        'เก็บ EXP ไปเรื่อยๆ เดี๋ยวก็ถึงเวล 30 แล้ว 😎',
        'เคลียร์กองนี้เสร็จเดี๋ยวย้ายโซนต่อ 👍',
      ],
    },
  },
] as const

const MAP_SAFE_ANCHORS: Record<string, { tx: number; ty: number }> = {
  town: { tx: 22, ty: 18 },
  meadow: { tx: 7, ty: 17 },
  forest: { tx: 42, ty: 18 },
}

export function isBotPlayerId(targetUidOrGameUid: string | null | undefined): boolean {
  if (!targetUidOrGameUid) return false
  const clean = targetUidOrGameUid.trim()
  return PLAYER_BOT_DEFS.some((b) => b.userId === clean || b.gameUid === clean)
}

export function getBotDef(targetUidOrGameUid: string | null | undefined): PlayerBotDef | null {
  if (!targetUidOrGameUid) return null
  const clean = targetUidOrGameUid.trim()
  return PLAYER_BOT_DEFS.find((b) => b.userId === clean || b.gameUid === clean) ?? null
}

export function createInitialBotStates(nowMs = Date.now()): BotEntityState[] {
  return PLAYER_BOT_DEFS.map((def, idx) => ({
    def,
    mapId: def.homeMapId,
    x: (def.startTile.tx + 0.5) * TILE_PX,
    y: (def.startTile.ty + 0.5) * TILE_PX,
    vx: 0,
    vy: 0,
    facing: idx === 0 ? 'right' : idx === 1 ? 'left' : 'down',
    moving: false,
    status: def.homeMapId === 'town' ? 'town' : 'idle',
    attackAnim: 0,
    attackCd: 0.4 + idx * 0.25,
    wanderT: 1.2 + idx * 0.9,
    pauseT: 0.6 + idx * 0.5,
    mapTravelT: 38 + idx * 19,
    ambientChatT: 10 + idx * 11,
    targetMonsterUid: null,
    bubble: null,
    lastSeen: nowMs,
  }))
}

export function setBotSpeechBubble(
  states: BotEntityState[],
  userIdOrGameUid: string,
  text: string,
  untilTimeSec: number,
) {
  const bot = states.find((b) => b.def.userId === userIdOrGameUid || b.def.gameUid === userIdOrGameUid)
  if (!bot) return
  bot.bubble = { text: text.slice(0, 120), until: untilTimeSec }
}

function resolveFacing(dx: number, dy: number, fallback: BotDir): BotDir {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return fallback
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx < 0 ? 'left' : 'right'
  }
  return dy < 0 ? 'up' : 'down'
}

function pickRandom<T>(items: readonly T[]): T | null {
  if (!items.length) return null
  return items[Math.floor(Math.random() * items.length)] ?? null
}

function moveBotWithSlide(
  bot: BotEntityState,
  dx: number,
  dy: number,
  mapWidthPx: number,
  mapHeightPx: number,
  isBlocked: (x: number, y: number) => boolean,
): boolean {
  const clampX = (x: number) => Math.max(TILE_PX * 1.5, Math.min(mapWidthPx - TILE_PX * 1.5, x))
  const clampY = (y: number) => Math.max(TILE_PX * 1.5, Math.min(mapHeightPx - TILE_PX * 1.5, y))

  const nextX = clampX(bot.x + dx)
  const nextY = clampY(bot.y + dy)
  if (!isBlocked(nextX, nextY)) {
    const moved = Math.hypot(nextX - bot.x, nextY - bot.y) > 0.02
    bot.x = nextX
    bot.y = nextY
    return moved
  }

  let moved = false
  if (Math.abs(dx) > 0.001 && !isBlocked(nextX, bot.y)) {
    bot.x = nextX
    moved = true
  }
  if (Math.abs(dy) > 0.001 && !isBlocked(bot.x, nextY)) {
    bot.y = nextY
    moved = true
  }
  return moved
}

function ensureBotUnstuckOnCurrentMap(
  bot: BotEntityState,
  tileSize: number,
  isBlocked: (x: number, y: number) => boolean,
) {
  if (!isBlocked(bot.x, bot.y)) return
  const anchor = MAP_SAFE_ANCHORS[bot.mapId] ?? { tx: 22, ty: 18 }
  for (let r = 0; r <= 6; r++) {
    for (let oy = -r; oy <= r; oy++) {
      for (let ox = -r; ox <= r; ox++) {
        const cx = (anchor.tx + ox + 0.5) * tileSize
        const cy = (anchor.ty + oy + 0.5) * tileSize
        if (!isBlocked(cx, cy)) {
          bot.x = cx
          bot.y = cy
          return
        }
      }
    }
  }
}

export function stepPlayerBots(states: BotEntityState[], ctx: BotStepContext) {
  const dt = Math.min(0.05, Math.max(0.001, ctx.dt))

  for (const bot of states) {
    bot.lastSeen = ctx.nowMs
    if (bot.attackAnim > 0) bot.attackAnim = Math.max(0, bot.attackAnim - dt)
    if (bot.attackCd > 0) bot.attackCd = Math.max(0, bot.attackCd - dt)
    if (bot.bubble && ctx.timeSec > bot.bubble.until) {
      bot.bubble = null
    }

    // Periodic realistic map travel between town and hunting zones
    bot.mapTravelT -= dt
    if (bot.mapTravelT <= 0) {
      bot.mapTravelT = 40 + Math.random() * 35
      const candidates = bot.def.roamMaps.filter((m) => m !== bot.mapId)
      const nextMap = pickRandom(candidates)
      if (nextMap) {
        bot.mapId = nextMap
        const anchor = MAP_SAFE_ANCHORS[nextMap] ?? { tx: 22, ty: 18 }
        bot.x = (anchor.tx + (Math.random() - 0.5) * 3 + 0.5) * ctx.tileSize
        bot.y = (anchor.ty + (Math.random() - 0.5) * 3 + 0.5) * ctx.tileSize
        bot.targetMonsterUid = null
        bot.moving = false
        bot.status = nextMap === 'town' ? 'town' : 'idle'
        if (nextMap === ctx.currentMapId) {
          ensureBotUnstuckOnCurrentMap(bot, ctx.tileSize, ctx.isBlocked)
        }
      }
    }

    // Ambient chatter timer (low frequency so it feels natural)
    bot.ambientChatT -= dt
    if (bot.ambientChatT <= 0) {
      bot.ambientChatT = 32 + Math.random() * 28
      const pool =
        bot.status === 'combat'
          ? bot.def.ambientLines.combat
          : bot.mapId === 'town'
            ? bot.def.ambientLines.town
            : bot.def.ambientLines.combat
      const line = pickRandom(pool)
      if (line && bot.mapId === ctx.currentMapId) {
        bot.bubble = { text: line, until: ctx.timeSec + 4 }
        ctx.onBotChat(bot, line, 'map')
      }
    }

    // Bots on other maps do lightweight virtual roaming/status transitions
    if (bot.mapId !== ctx.currentMapId) {
      bot.wanderT -= dt
      if (bot.wanderT <= 0) {
        bot.wanderT = 3 + Math.random() * 4
        if (bot.mapId === 'town') {
          bot.moving = Math.random() < 0.45
          bot.status = bot.moving ? 'moving' : 'town'
        } else {
          const combatRoll = Math.random()
          bot.status = combatRoll < 0.55 ? 'combat' : combatRoll < 0.85 ? 'moving' : 'idle'
          bot.moving = bot.status === 'moving'
          if (bot.status === 'combat') bot.attackAnim = 0.25
        }
      }
      continue
    }

    ensureBotUnstuckOnCurrentMap(bot, ctx.tileSize, ctx.isBlocked)

    // Active map: hunt alive non-boss monsters if not in safe town
    let targetMonster: BotMonsterTarget | null = null
    if (!ctx.mapSafe) {
      if (bot.targetMonsterUid) {
        const current = ctx.monsters.find((m) => m.uid === bot.targetMonsterUid && !m.dead && !m.boss)
        if (current && Math.hypot(current.x - bot.x, current.y - bot.y) < 260) {
          targetMonster = current
        } else {
          bot.targetMonsterUid = null
        }
      }
      if (!targetMonster) {
        let bestDist = 210
        for (const m of ctx.monsters) {
          if (m.dead || m.boss) continue
          const d = Math.hypot(m.x - bot.x, m.y - bot.y)
          if (d < bestDist) {
            bestDist = d
            targetMonster = m
          }
        }
        bot.targetMonsterUid = targetMonster?.uid ?? null
      }
    } else {
      bot.targetMonsterUid = null
    }

    if (targetMonster) {
      const dx = targetMonster.x - bot.x
      const dy = targetMonster.y - bot.y
      const dist = Math.hypot(dx, dy)
      bot.facing = resolveFacing(dx, dy, bot.facing)

      if (dist > bot.def.attackRange) {
        const nx = (dx / Math.max(1, dist)) * bot.def.moveSpeed * dt
        const ny = (dy / Math.max(1, dist)) * bot.def.moveSpeed * dt
        bot.moving = moveBotWithSlide(bot, nx, ny, ctx.mapWidthPx, ctx.mapHeightPx, ctx.isBlocked)
        bot.status = 'combat'
      } else if (bot.def.ranged && dist < 34) {
        // Ranged kiting step back
        const nx = (-dx / Math.max(1, dist)) * bot.def.moveSpeed * 0.72 * dt
        const ny = (-dy / Math.max(1, dist)) * bot.def.moveSpeed * 0.72 * dt
        bot.moving = moveBotWithSlide(bot, nx, ny, ctx.mapWidthPx, ctx.mapHeightPx, ctx.isBlocked)
        bot.status = 'combat'
      } else {
        bot.moving = false
        bot.status = 'combat'
      }

      if (dist <= bot.def.attackRange + 8 && bot.attackCd <= 0) {
        bot.attackCd = bot.def.attackCooldown * (0.9 + Math.random() * 0.25)
        bot.attackAnim = 0.3
        const isCrit = Math.random() < 0.2
        const dmg = Math.max(4, Math.round(bot.def.baseDamage * (0.88 + Math.random() * 0.24) * (isCrit ? 1.55 : 1)))
        ctx.onSpawnVisualEffect({
          kind: bot.def.jobId === 'mage' ? 'magic' : bot.def.jobId === 'archer' ? 'arrow' : 'slash',
          fromX: bot.x,
          fromY: bot.y - 8,
          toX: targetMonster.x,
          toY: targetMonster.y - 8,
          color: bot.def.weaponColor,
        })
        ctx.onAttackMonster(bot, targetMonster, dmg, isCrit)
      }
      continue
    }

    // Roam naturally on the map (pause near plaza/player, then walk a short segment)
    if (bot.pauseT > 0) {
      bot.pauseT -= dt
      bot.moving = false
      bot.status = ctx.mapSafe ? 'town' : 'idle'
      // Occasionally glance toward player when standing nearby in town
      const pdx = ctx.playerX - bot.x
      const pdy = ctx.playerY - bot.y
      if (Math.hypot(pdx, pdy) < 95 && bot.pauseT < 0.8) {
        bot.facing = resolveFacing(pdx, pdy, bot.facing)
      }
      continue
    }

    bot.wanderT -= dt
    if (bot.wanderT <= 0) {
      if (Math.random() < 0.42) {
        bot.pauseT = 1.4 + Math.random() * 2.4
        bot.vx = 0
        bot.vy = 0
        bot.moving = false
        bot.status = ctx.mapSafe ? 'town' : 'idle'
        bot.wanderT = 1.8 + Math.random() * 2.5
        continue
      }
      const anchor = MAP_SAFE_ANCHORS[bot.mapId] ?? { tx: 22, ty: 18 }
      const anchorX = (anchor.tx + 0.5) * ctx.tileSize
      const anchorY = (anchor.ty + 0.5) * ctx.tileSize
      const distHome = Math.hypot(anchorX - bot.x, anchorY - bot.y)
      if (distHome > 130) {
        bot.vx = (anchorX - bot.x) / distHome
        bot.vy = (anchorY - bot.y) / distHome
      } else {
        const angle = Math.random() * Math.PI * 2
        bot.vx = Math.cos(angle)
        bot.vy = Math.sin(angle)
      }
      bot.wanderT = 1.6 + Math.random() * 2.2
    }

    const stepX = bot.vx * bot.def.moveSpeed * 0.72 * dt
    const stepY = bot.vy * bot.def.moveSpeed * 0.72 * dt
    const moved = moveBotWithSlide(bot, stepX, stepY, ctx.mapWidthPx, ctx.mapHeightPx, ctx.isBlocked)
    if (!moved) {
      // Pick a fresh direction on next frame if blocked
      bot.wanderT = 0
      bot.moving = false
      bot.status = ctx.mapSafe ? 'town' : 'idle'
    } else {
      bot.facing = resolveFacing(stepX, stepY, bot.facing)
      bot.moving = true
      bot.status = 'moving'
    }
  }
}

export function botsToRemotePlayers(states: readonly BotEntityState[], nowMs = Date.now()): BotRemoteSnapshot[] {
  return states.map((bot) => ({
    userId: bot.def.userId,
    uid: bot.def.uid,
    gameUid: bot.def.gameUid,
    displayName: bot.def.displayName,
    classId: bot.def.jobId,
    jobId: bot.def.jobId,
    mapId: bot.mapId,
    x: bot.x,
    y: bot.y,
    level: bot.def.level,
    gm: false,
    facing: bot.facing,
    moving: bot.moving,
    status: bot.status,
    attackAnim: bot.attackAnim,
    invisible: false,
    lastSeen: nowMs,
    rebirthCount: bot.def.rebirthCount,
    vipLevel: bot.def.vipLevel,
    activeTitle: bot.def.activeTitle,
    guildTag: bot.def.guildTag,
    weaponType: bot.def.weaponType,
    weaponColor: bot.def.weaponColor,
    petId: bot.def.petId,
    mountId: bot.mapId === 'town' ? undefined : bot.def.mountId,
    fashionCostume: bot.def.fashionCostume,
    fashionHair: bot.def.fashionHair,
    fashionWings: bot.def.fashionWings,
    weaponSkinId: bot.def.weaponSkinId,
    bubble: bot.bubble,
  }))
}

export function buildBotInspectProfile(targetUidOrGameUid: string, states?: readonly BotEntityState[]) {
  const def = getBotDef(targetUidOrGameUid)
  if (!def) return null
  const live = states?.find((b) => b.def.userId === def.userId)
  return {
    userId: def.userId,
    gameUid: def.gameUid,
    name: def.displayName,
    jobId: def.jobId,
    level: def.level,
    rebirthCount: def.rebirthCount,
    combatPower: def.combatPower,
    arenaRating: def.arenaRating,
    arenaWins: def.arenaWins,
    highestTowerFloor: def.highestTowerFloor,
    activeTitle: def.activeTitle,
    guildName: `[${def.guildTag}]`,
    mapId: live?.mapId ?? def.homeMapId,
    status: live?.status ?? (def.homeMapId === 'town' ? 'town' : 'idle'),
    isOnline: true,
  }
}
