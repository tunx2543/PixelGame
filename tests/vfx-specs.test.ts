import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JOBS } from '../lib/game/data'
import {
  getSkillIconPath,
  getSkillVfxSpec,
  resolveRebirthAuraSpec,
} from '../lib/game/vfx-specs'

describe('Rebirth aura visual tier resolution', () => {
  it('returns no aura at rebirth 0 or negative counts', () => {
    const zero = resolveRebirthAuraSpec(0)
    assert.equal(zero.style, 'none')
    assert.equal(zero.ringCount, 0)
    assert.equal(zero.hasWings, false)
    assert.equal(zero.hasHaloCrown, false)
    assert.equal(zero.hasAstralPillar, false)
    assert.equal(resolveRebirthAuraSpec(-2).style, 'none')
  })

  it('uses an identical sigil_ring style across rebirth 1 through 4', () => {
    const tiers = [1, 2, 3, 4].map((n) => resolveRebirthAuraSpec(n))
    for (const spec of tiers) {
      assert.equal(spec.style, 'sigil_ring')
      assert.equal(spec.primaryColor, tiers[0].primaryColor)
      assert.equal(spec.secondaryColor, tiers[0].secondaryColor)
      assert.equal(spec.glowColor, tiers[0].glowColor)
      assert.equal(spec.ringCount, 2)
      assert.equal(spec.runeCount, 4)
      assert.equal(spec.hasWings, false)
      assert.equal(spec.hasHaloCrown, false)
      assert.equal(spec.hasAstralPillar, false)
    }
  })

  it('transforms to crimson_wings at rebirth 5', () => {
    const r4 = resolveRebirthAuraSpec(4)
    const r5 = resolveRebirthAuraSpec(5)
    assert.equal(r5.style, 'crimson_wings')
    assert.notEqual(r5.style, r4.style)
    assert.notEqual(r5.primaryColor, r4.primaryColor)
    assert.equal(r5.hasWings, true)
    assert.equal(r5.hasHaloCrown, false)
    assert.equal(r5.hasAstralPillar, false)
    assert.equal(r5.runeCount, 6)
    assert.equal(r5.orbitShardCount, 2)
  })

  it('transforms to a distinct celestial_crown mythic aura at rebirth 6+', () => {
    const r5 = resolveRebirthAuraSpec(5)
    const r6 = resolveRebirthAuraSpec(6)
    const r9 = resolveRebirthAuraSpec(9)
    assert.equal(r6.style, 'celestial_crown')
    assert.notEqual(r6.style, r5.style)
    assert.notEqual(r6.primaryColor, r5.primaryColor)
    assert.equal(r6.hasWings, true)
    assert.equal(r6.hasHaloCrown, true)
    assert.equal(r6.hasAstralPillar, true)
    assert.equal(r6.ringCount, 3)
    assert.equal(r6.runeCount, 8)
    assert.equal(r6.orbitShardCount, 4)
    assert.equal(r9.style, 'celestial_crown')
  })
})

describe('Per-class skill definitions and VFX mapping', () => {
  it('ensures every combat job has complete skills (Tier 2 has 3 each) while preserving GM empty skills', () => {
    assert.equal(JOBS.gm.skills.length, 0)
    assert.equal(JOBS.novice.skills.length, 2)
    assert.ok(JOBS.novice.skills.some((s) => s.id === 'first-aid' && s.kind === 'heal'))

    const tier2Combat = [
      'knight',
      'paladin',
      'wizard',
      'cleric',
      'high_priest',
      'berserker',
      'hunter',
      'assassin',
      'templar',
      'kensei',
      'iron_fist',
      'the_king',
      'wicked_necromancer',
      'mamushi',
      'nekobaku',
      'sinister',
    ]
    for (const jobId of tier2Combat) {
      assert.equal(JOBS[jobId].skills.length, 3, `Expected 3 skills on Tier 2 job ${jobId}`)
    }
    assert.equal(JOBS.priest.skills.length, 2)
    assert.ok(JOBS.priest.skills.some((s) => s.id === 'grace-heal' && s.kind === 'heal'))
    assert.ok(JOBS.paladin.skills.some((s) => s.id === 'sacred-aegis' && s.kind === 'heal'))
    assert.equal(JOBS.merchant.from, 'novice')
    assert.equal(JOBS.merchant.goldBonus, 0.15)
    assert.ok(JOBS.the_king.from === 'merchant' && JOBS.the_king.alsoFrom?.includes('mage'))
    assert.ok(JOBS.kensei.from === 'swordsman' && JOBS.kensei.alsoFrom?.includes('thief'))
  })

  it('maps every skill across all 23 combat classes to a distinct VFX spec and valid icon path', () => {
    const combatJobs = Object.values(JOBS).filter((j) => j.id !== 'gm')
    assert.equal(combatJobs.length, 23)

    for (const job of combatJobs) {
      assert.ok(job.skills.length >= 2, `${job.id} should have at least 2 skills`)
      for (const skill of job.skills) {
        const spec = getSkillVfxSpec(skill.id, skill.color, skill.kind, job.weaponTypes[0])
        assert.equal(spec.skillId, skill.id)
        assert.ok(spec.style.length > 0, `Missing style for ${skill.id}`)
        assert.ok(spec.effectLabel.length > 0, `Missing effectLabel for ${skill.id}`)
        assert.match(spec.primaryColor, /^#[0-9a-fA-F]{6}$/, `Invalid color for ${skill.id}`)
        assert.match(getSkillIconPath(skill.id), /^\/images\/skills\/.+\.png$/)
      }
    }
  })
})
