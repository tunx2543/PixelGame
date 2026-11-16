import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  aggregateEquipmentAffixes,
  computePartyRoleSynergy,
  computeSupportSkillEffect,
  createDuelFighter,
  filterBlockedMessages,
  getFieldBossForMap,
  getJobRole,
  getWorldBossScheduleList,
  reforgeCost,
  resolveDuelTurn,
  rollEquipmentAffixes,
  rollEquipmentRarity,
  type DuelMatchState,
} from '../lib/game/mmo-systems'
import type { PartyRecord } from '../lib/firebase/party-helpers'
import type { RemotePlayerSnapshot } from '../lib/firebase/presence-helpers'

describe('MMORPG Systems Pure Logic', () => {
  it('rolls rarity and matching affix count without duplicate stats', () => {
    const leg = rollEquipmentRarity(4, () => 0.9)
    assert.equal(leg, 'legendary')

    const affixes = rollEquipmentAffixes(3, 'epic', () => 0.25)
    assert.equal(affixes.length, 3)
    const stats = new Set(affixes.map((a) => a.stat))
    assert.equal(stats.size, 3)
    for (const af of affixes) {
      assert.ok(af.value > 0)
    }

    const agg = aggregateEquipmentAffixes({
      weapon: { affixes: [{ stat: 'atk_flat', value: 12 }, { stat: 'crit_pct', value: 5 }] },
      armor: { affixes: [{ stat: 'hp_flat', value: 50 }, { stat: 'gold_pct', value: 10 }] },
    })
    assert.equal(agg.atkFlat, 12)
    assert.equal(agg.hpFlat, 50)
    assert.equal(agg.critBonus, 0.05)
    assert.equal(agg.goldPct, 10)

    const cost = reforgeCost(2, 'epic')
    assert.ok(cost.gold > 0 && cost.stones >= 1)
  })

  it('computes Party Role Synergy Trinity when Tank, Healer, DPS are on the same map', () => {
    assert.equal(getJobRole('paladin'), 'tank')
    assert.equal(getJobRole('templar'), 'tank')
    assert.equal(getJobRole('iron_fist'), 'tank')
    assert.equal(getJobRole('cleric'), 'healer')
    assert.equal(getJobRole('wizard'), 'dps')
    assert.equal(getJobRole('the_king'), 'dps')
    assert.equal(getJobRole('nekobaku'), 'dps')

    const party: PartyRecord = {
      partyId: 'pty_1',
      name: 'Trinity Squad',
      leaderId: 'u1',
      memberIds: ['u1', 'u2', 'u3'],
      members: {
        u1: { userId: 'u1', uid: 1, gameUid: '0001', name: 'Tanker', jobId: 'paladin', level: 20, hp: 500, maxHp: 500, mapId: 'cave', isGm: false },
        u2: { userId: 'u2', uid: 2, gameUid: '0002', name: 'Healer', jobId: 'cleric', level: 20, hp: 400, maxHp: 400, mapId: 'cave', isGm: false },
        u3: { userId: 'u3', uid: 3, gameUid: '0003', name: 'Mage', jobId: 'wizard', level: 20, hp: 350, maxHp: 350, mapId: 'cave', isGm: false },
      },
    }

    const online: RemotePlayerSnapshot[] = [
      { userId: 'u2', uid: 2, gameUid: '0002', displayName: 'Healer', classId: 'cleric', jobId: 'cleric', mapId: 'cave', x: 100, y: 100, level: 20, gm: false, facing: 'down', moving: false, status: 'combat', attackAnim: 0, invisible: false, lastSeen: Date.now() },
      { userId: 'u3', uid: 3, gameUid: '0003', displayName: 'Mage', classId: 'wizard', jobId: 'wizard', mapId: 'cave', x: 120, y: 100, level: 20, gm: false, facing: 'down', moving: false, status: 'combat', attackAnim: 0, invisible: false, lastSeen: Date.now() },
    ]

    const syn = computePartyRoleSynergy(party, online, 'u1', 'paladin', 'cave')
    assert.equal(syn.hasTrinity, true)
    assert.equal(syn.tanks, 1)
    assert.equal(syn.healers, 1)
    assert.equal(syn.dps, 1)
    assert.equal(syn.atkPct, 20)
    assert.equal(syn.defPct, 20)
    assert.equal(syn.critBonus, 0.08)
    assert.equal(syn.hpRegenPct, 2)

    const healSkill = computeSupportSkillEffect('cleric', 600, 80)
    assert.equal(healSkill.kind, 'heal')
    assert.ok(healSkill.healAmount > 100)
  })

  it('provides Field Bosses for combat maps and upcoming World Boss schedule', () => {
    assert.equal(getFieldBossForMap('town'), null)
    const volcanoBoss = getFieldBossForMap('volcano')
    assert.ok(volcanoBoss)
    assert.equal(volcanoBoss.element, 'fire')

    const schedule = getWorldBossScheduleList(1_760_000_000_000, 4)
    assert.equal(schedule.length, 4)
    assert.equal(schedule[0].isCurrent, true)
    assert.equal(schedule[1].isCurrent, false)
    assert.ok(schedule[1].startsAtMs > schedule[0].startsAtMs)
  })

  it('resolves Live 1v1 PvP Duel turns accurately including Guard, Potion, and Victory', () => {
    const f1 = createDuelFighter({ uid: 'u1', name: 'HeroA', jobId: 'knight', level: 20, maxHp: 400, atk: 120, def: 30, crit: 0.2 })
    const f2 = createDuelFighter({ uid: 'u2', name: 'HeroB', jobId: 'wizard', level: 20, maxHp: 200, atk: 110, def: 15, crit: 0.25 })
    let match: DuelMatchState = {
      duelId: 'duel_1',
      status: 'active',
      challengerUid: 'u1',
      opponentUid: 'u2',
      turnNumber: 1,
      activeTurnUid: 'u1',
      fighters: { u1: f1, u2: f2 },
      logs: [],
      winnerUid: null,
    }

    // Wrong turn actor is rejected
    const wrongTurn = resolveDuelTurn(match, 'u2', 'attack', () => 0.5)
    assert.equal(wrongTurn.ok, false)

    // HeroA attacks HeroB
    const r1 = resolveDuelTurn(match, 'u1', 'attack', () => 0.5)
    assert.equal(r1.ok, true)
    match = r1.next
    assert.ok(match.fighters.u2.hp < 200)
    assert.equal(match.activeTurnUid, 'u2')

    // HeroB uses potion
    const r2 = resolveDuelTurn(match, 'u2', 'potion', () => 0.5)
    assert.equal(r2.ok, true)
    assert.equal(r2.next.fighters.u2.potionUsed, true)
    match = r2.next

    // Second potion rejected
    const r3 = resolveDuelTurn({ ...match, activeTurnUid: 'u2' }, 'u2', 'potion', () => 0.5)
    assert.equal(r3.ok, false)

    // HeroA finishes off HeroB with skill
    match = { ...match, fighters: { ...match.fighters, u2: { ...match.fighters.u2, hp: 10 } } }
    const r4 = resolveDuelTurn(match, 'u1', 'skill', () => 0.1)
    assert.equal(r4.ok, true)
    assert.equal(r4.next.status, 'completed')
    assert.equal(r4.next.winnerUid, 'u1')
  })

  it('filters messages from blocked players cleanly', () => {
    const msgs = [
      { id: 1, senderUid: 'u1', text: 'hello' },
      { id: 2, senderUid: 'bad_u', text: 'spam' },
      { id: 3, text: 'system notice' },
    ]
    const filtered = filterBlockedMessages(msgs, ['bad_u'])
    assert.equal(filtered.length, 2)
    assert.deepEqual(filtered.map((m) => m.id), [1, 3])
  })
})
