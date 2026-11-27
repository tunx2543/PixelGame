import test from 'node:test'
import assert from 'node:assert/strict'
import { JOBS, JOB_CLASS_META, type JobId } from './data'
import {
  CLASS_COMBAT_VFX_PROFILES,
  CombatVfxParticlePool,
  MAX_COMBAT_PARTICLES,
  evaluateCombatVfxPhase,
  getClassCombatVfxProfile,
  getCombatVfxDurationMs,
  resolveSkillCombatTier,
} from './combat-vfx-system'
import { getBasicAttackVfxSpec, getSkillVfxSpec } from './vfx-specs'

const ALL_JOB_IDS: JobId[] = Object.keys(JOB_CLASS_META) as JobId[]

test('all 15 classes have unique Basic, Special, and Ultimate VFX patterns and strictly scoped durations', () => {
  assert.equal(ALL_JOB_IDS.length, 15)
  assert.deepEqual(Object.keys(CLASS_COMBAT_VFX_PROFILES).sort(), [...ALL_JOB_IDS].sort())

  const basicPatterns = new Set<string>()
  const specialPatterns = new Set<string>()
  const ultimatePatterns = new Set<string>()

  for (const jobId of ALL_JOB_IDS) {
    const profile = getClassCombatVfxProfile(jobId)
    assert.equal(profile.jobId, jobId)

    assert.ok(profile.basic.durationSec >= 0.25 && profile.basic.durationSec <= 0.55, `${jobId} basic durationSec=${profile.basic.durationSec}`)
    assert.ok(profile.special.durationSec >= 0.6 && profile.special.durationSec <= 1.2, `${jobId} special durationSec=${profile.special.durationSec}`)
    assert.ok(profile.ultimate.durationSec >= 1.5 && profile.ultimate.durationSec <= 2.8, `${jobId} ultimate durationSec=${profile.ultimate.durationSec}`)

    assert.ok(!basicPatterns.has(profile.basic.pattern), `duplicate basic pattern for ${jobId}: ${profile.basic.pattern}`)
    assert.ok(!specialPatterns.has(profile.special.pattern), `duplicate special pattern for ${jobId}: ${profile.special.pattern}`)
    assert.ok(!ultimatePatterns.has(profile.ultimate.pattern), `duplicate ultimate pattern for ${jobId}: ${profile.ultimate.pattern}`)

    basicPatterns.add(profile.basic.pattern)
    specialPatterns.add(profile.special.pattern)
    ultimatePatterns.add(profile.ultimate.pattern)
  }

  assert.equal(basicPatterns.size, 15)
  assert.equal(specialPatterns.size, 15)
  assert.equal(ultimatePatterns.size, 15)
})

test('all 15 class palettes follow the art-directed class color specifications', () => {
  const expectedPaletteChecks: Record<JobId, string[]> = {
    novice: ['#e2e8f0', '#38bdf8', '#ffffff'],
    swordsman: ['#cbd5e1', '#38bdf8', '#2563eb'],
    mage: ['#a855f7', '#3b82f6', '#22d3ee'],
    archer: ['#10b981', '#86efac'],
    cleric: ['#ffffff', '#f59e0b', '#fde047'],
    merchant: ['#fbbf24', '#fef08a', '#f97316'],
    thief: ['#18181b', '#a855f7', '#581c87'],
    kensei: ['#ef4444', '#ffffff', '#f9a8d4'],
    iron_fist: ['#f97316', '#dc2626', '#fbbf24'],
    wicked_necromancer: ['#9333ea', '#0f0b1a', '#1e3a8a'],
    the_king: ['#fbbf24', '#ffffff', '#dc2626'],
    sinister: ['#09090b', '#dc2626', '#9f1239'],
    templar: ['#ffffff', '#cbd5e1', '#fbbf24'],
    nekobaku: ['#f472b6', '#38bdf8', '#a855f7'],
    mamushi: ['#22c55e', '#9333ea', '#09090b'],
  }

  for (const jobId of ALL_JOB_IDS) {
    const pal = CLASS_COMBAT_VFX_PROFILES[jobId].palette
    const palColors = new Set([pal.primary, pal.secondary, pal.tertiary, pal.dark, pal.glow].map((c) => c.toLowerCase()))
    for (const req of expectedPaletteChecks[jobId]) {
      assert.ok(palColors.has(req.toLowerCase()), `${jobId} palette missing expected color ${req}`)
    }
  }
})

test('all 60 class skills resolve VFX specs cleanly and every class exposes basic, special, and ultimate tiers', () => {
  let totalSkills = 0
  for (const jobId of ALL_JOB_IDS) {
    const job = JOBS[jobId]
    assert.ok(job, `missing JOBS entry for ${jobId}`)
    assert.ok(job.skills.length >= 4, `${jobId} should have at least 4 skills`)

    const basicSpec = getBasicAttackVfxSpec(jobId)
    assert.equal(basicSpec.tier, 'basic')
    assert.equal(basicSpec.jobId, jobId)
    assert.equal(getCombatVfxDurationMs(jobId, null), Math.round(CLASS_COMBAT_VFX_PROFILES[jobId].basic.durationSec * 1000))

    const tiersSeen = new Set<string>()
    for (const skill of job.skills) {
      totalSkills += 1
      assert.ok(skill.mp > 0, `${jobId}.${skill.id} mp preserved`)
      assert.ok(skill.mult > 0, `${jobId}.${skill.id} mult preserved`)
      assert.ok(skill.cooldown > 0, `${jobId}.${skill.id} cooldown preserved`)

      const tier = resolveSkillCombatTier(skill.id)
      assert.ok(tier === 'special' || tier === 'ultimate', `${jobId}.${skill.id} invalid tier ${tier}`)
      tiersSeen.add(tier)

      const spec = getSkillVfxSpec(skill.id, skill.color, skill.kind, job.weaponTypes[0])
      assert.equal(spec.jobId, jobId, `${jobId}.${skill.id} owner mismatch`)
      assert.equal(spec.tier, tier)
      assert.ok(spec.iconPath.startsWith('data:image/'), `${jobId}.${skill.id} missing icon`)
    }

    assert.ok(tiersSeen.has('special'), `${jobId} missing special tier skill`)
    assert.ok(tiersSeen.has('ultimate'), `${jobId} missing ultimate tier skill`)
  }
  assert.equal(totalSkills, 60)
})

test('evaluateCombatVfxPhase steps cleanly through all 6 animation phases', () => {
  assert.equal(evaluateCombatVfxPhase(0.05).phase, 'preparation')
  assert.equal(evaluateCombatVfxPhase(0.2).phase, 'casting')
  assert.equal(evaluateCombatVfxPhase(0.42).phase, 'attack')
  assert.equal(evaluateCombatVfxPhase(0.64).phase, 'impact')
  assert.equal(evaluateCombatVfxPhase(0.8).phase, 'explosion')
  assert.equal(evaluateCombatVfxPhase(0.95).phase, 'fadeout')

  assert.equal(evaluateCombatVfxPhase(0).fadeAlpha, 1)
  assert.equal(evaluateCombatVfxPhase(1).fadeAlpha, 0)
  assert.equal(evaluateCombatVfxPhase(Number.NaN).progress, 0)
})

test('CombatVfxParticlePool enforces bounded cap and expires completed particles cleanly', () => {
  const pool = new CombatVfxParticlePool(MAX_COMBAT_PARTICLES)
  assert.equal(pool.maxParticles, 180)
  assert.equal(pool.count(), 0)

  // Spawn more than MAX_COMBAT_PARTICLES across ultimate bursts
  for (let i = 0; i < 15; i++) {
    pool.spawnClassBurst({
      jobId: ALL_JOB_IDS[i],
      tier: 'ultimate',
      x: 100 + i * 5,
      y: 80,
      radius: 48,
      count: 22,
    })
  }
  assert.equal(pool.count(), MAX_COMBAT_PARTICLES)

  // Advance slightly — particles remain alive and move
  const prevX = pool.getParticles()[0].x
  pool.update(0.1)
  assert.ok(pool.count() > 0 && pool.count() <= MAX_COMBAT_PARTICLES)
  assert.notEqual(pool.getParticles()[0].x, prevX)

  // Advance past max particle lifetime — pool drains completely
  pool.update(2.5)
  assert.equal(pool.count(), 0)
})
