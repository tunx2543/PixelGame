import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { POST as sandboxGrantPost } from '@/app/api/premium/sandbox-grant/route'
import { POST as purchasePost } from '@/app/api/premium/purchase/route'
import { POST as claimPost } from '@/app/api/premium/claim/route'
import {
  isPersistentPremiumSecretConfigured,
  signPremiumTx,
  verifyBattlePassUnlockOrClaim,
  verifyCatalogPurchase,
  verifyPremiumTxSignature,
  verifyVipRewardClaim,
} from './premium-security'

const ORIGINAL_SECRET = process.env.PREMIUM_TX_SECRET

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.PREMIUM_TX_SECRET
  } else {
    process.env.PREMIUM_TX_SECRET = ORIGINAL_SECRET
  }
})

describe('Phase 1 Security Hardening — Premium & Sandbox', () => {
  it('uses an unpredictable CSPRNG fallback secret instead of projectId-derived secret', () => {
    delete process.env.PREMIUM_TX_SECRET
    assert.equal(isPersistentPremiumSecretConfigured(), false)

    const payload = {
      txId: 'TX-TEST-1',
      requestId: 'REQ-TEST-1',
      actorUid: 'user-1',
      characterId: 'slot_1',
      amount: 500,
      type: 'earn',
      source: 'vip_daily_reward',
      timestampMs: 1700000000000,
    }
    const sig = signPremiumTx(payload)
    assert.match(sig, /^[a-f0-9]{32}$/)
    assert.equal(verifyPremiumTxSignature(payload, sig), true)
    assert.equal(verifyPremiumTxSignature({ ...payload, amount: 50000 }, sig), false)

    process.env.PREMIUM_TX_SECRET = 'test-secret-key-for-unit-check'
    assert.equal(isPersistentPremiumSecretConfigured(), true)
  })

  it('rejects unauthenticated guest and malformed-token requests on /api/premium/sandbox-grant', async () => {
    const guestReq = new Request('http://localhost:3000/api/premium/sandbox-grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 50000, mode: 'sandbox', characterId: 'slot_1' }),
    })
    const guestRes = await sandboxGrantPost(guestReq)
    assert.equal(guestRes.status, 401)
    const guestJson = (await guestRes.json()) as { ok: boolean }
    assert.equal(guestJson.ok, false)

    const badBearerReq = new Request('http://localhost:3000/api/premium/sandbox-grant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer forged.jwt.token',
      },
      body: JSON.stringify({ amount: 1000, mode: 'gm' }),
    })
    const badRes = await sandboxGrantPost(badBearerReq)
    assert.equal(badRes.status, 401)
  })

  it('withholds serverVerified/serverSignature from guest purchases and rejects forged bearer on /api/premium/purchase', async () => {
    const guestPurchase = new Request('http://localhost:3000/api/premium/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'prod_vip_card_7d',
        qty: 1,
        currentDiamonds: 50000,
        previousPurchaseCount: 0,
        characterId: 'slot_1',
      }),
    })
    const res = await purchasePost(guestPurchase)
    assert.equal(res.status, 200)
    const json = (await res.json()) as {
      ok: boolean
      serverVerified: boolean
      serverSignature: string | null
    }
    assert.equal(json.ok, true)
    assert.equal(json.serverVerified, false)
    assert.equal(json.serverSignature, null)

    const forgedReq = new Request('http://localhost:3000/api/premium/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid.token.here',
      },
      body: JSON.stringify({ productId: 'prod_vip_card_7d', qty: 1, currentDiamonds: 99999 }),
    })
    const forgedRes = await purchasePost(forgedReq)
    assert.equal(forgedRes.status, 401)
  })

  it('blocks arbitrary claim_pass_archive and guest topup_milestone / daily_topup claims on /api/premium/claim', async () => {
    const archiveReq = new Request('http://localhost:3000/api/premium/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claimType: 'claim_pass_archive',
        archiveDiamonds: 500,
      }),
    })
    const archiveRes = await claimPost(archiveReq)
    assert.equal(archiveRes.status, 400)

    const milestoneReq = new Request('http://localhost:3000/api/premium/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claimType: 'topup_milestone',
        milestoneId: 'ms_29',
        totalTopupThb: 999999,
        claimedMilestones: [],
      }),
    })
    const milestoneRes = await claimPost(milestoneReq)
    assert.equal(milestoneRes.status, 401)

    const dailyTopupReq = new Request('http://localhost:3000/api/premium/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claimType: 'daily_topup',
        todayIso: new Date().toISOString().slice(0, 10),
        lastDailyTopupDate: new Date().toISOString().slice(0, 10),
        claimedDailyTopupDate: '',
      }),
    })
    const dailyTopupRes = await claimPost(dailyTopupReq)
    assert.equal(dailyTopupRes.status, 401)
  })

  it('validates pure purchase, VIP, and Battle Pass rules deterministically', () => {
    const insufficient = verifyCatalogPurchase({
      productId: 'prod_vip_card_7d',
      qty: 1,
      currentDiamonds: 0,
      previousPurchaseCount: 0,
    })
    assert.equal(insufficient.ok, false)
    assert.equal(insufficient.status, 400)

    const inactiveVip = verifyVipRewardClaim({
      claimType: 'vip_daily',
      vip: undefined,
      todayIso: '2026-11-27',
    })
    assert.equal(inactiveVip.ok, false)

    const bpLocked = verifyBattlePassUnlockOrClaim({
      action: 'claim_tier',
      level: 5,
      track: 'prem',
      bpLevel: 10,
      premiumUnlocked: false,
      claimedFree: [],
      claimedPrem: [],
      currentDiamonds: 0,
    })
    assert.equal(bpLocked.ok, false)
    assert.equal(bpLocked.status, 403)
  })

  it('gates Sandbox Test Console UI & client action cleanly to verified GM accounts', () => {
    const shopPanel = fs.readFileSync(
      path.join(process.cwd(), 'components/game/panels/premium-shop-panel.tsx'),
      'utf8',
    )
    assert.ok(shopPanel.includes('canUseGmSandbox'))
    assert.ok(shopPanel.includes('{canUseGmSandbox && ('))

    const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8')
    assert.ok(rules.includes("data.type != 'sandbox_grant'"))
    assert.ok(rules.includes("data.action != 'SANDBOX_GRANT'"))
    assert.ok(rules.includes('data.saveData.diamonds == data.diamonds'))
  })
})
