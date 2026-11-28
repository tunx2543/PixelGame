import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { POST as sandboxGrantPost } from '@/app/api/premium/sandbox-grant/route'
import { POST as purchasePost } from '@/app/api/premium/purchase/route'
import { POST as claimPost } from '@/app/api/premium/claim/route'
import { POST as redeemPost } from '@/app/api/redeem/route'
import {
  checkServerRateLimit,
  deriveGuestFingerprint,
  fetchAuthoritativeCharacterState,
  isPersistentPremiumSecretConfigured,
  isValidCharacterIdFormat,
  signPremiumTx,
  verifyBattlePassUnlockOrClaim,
  verifyCatalogPurchase,
  verifyPremiumTxSignature,
  verifyVipRewardClaim,
} from './premium-security'

const ORIGINAL_SECRET = process.env.PREMIUM_TX_SECRET
const ORIGINAL_FETCH = globalThis.fetch

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
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

describe('Phase 2 Security Hardening — Diamond Economy, Top-Up, Redeem & Firestore Rules', () => {
  it('validates characterId format strictly and derives IP-bound guest fingerprints', () => {
    assert.equal(isValidCharacterIdFormat('slot_1'), true)
    assert.equal(isValidCharacterIdFormat('char-abc_99'), true)
    assert.equal(isValidCharacterIdFormat('slot_1/../admin'), false)
    assert.equal(isValidCharacterIdFormat(''), false)
    assert.equal(isValidCharacterIdFormat('x'.repeat(65)), false)

    process.env.PREMIUM_TX_SECRET = 'phase2-test-secret-key'
    const reqA = new Request('http://localhost:3000/api/redeem', {
      headers: {
        'cf-connecting-ip': '203.0.113.10',
        'user-agent': 'PixelBrowser/1.0',
      },
    })
    const reqB = new Request('http://localhost:3000/api/redeem', {
      headers: {
        'cf-connecting-ip': '203.0.113.10',
        'user-agent': 'PixelBrowser/1.0',
      },
    })
    // Rotating guestClientId from the same IP+UA produces the exact same claim key
    assert.equal(deriveGuestFingerprint(reqA, 'hint_1'), deriveGuestFingerprint(reqB, 'hint_2'))
  })

  it('enforces per-actor server rate limits and returns 429 on /api/redeem spam', async () => {
    process.env.PREMIUM_TX_SECRET = 'phase2-rate-secret'
    const testKey = `unit-rate-${Date.now()}`
    assert.equal(checkServerRateLimit(testKey, 2, 60_000), true)
    assert.equal(checkServerRateLimit(testKey, 2, 60_000), true)
    assert.equal(checkServerRateLimit(testKey, 2, 60_000), false)

    const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`
    let lastStatus = 0
    for (let i = 0; i < 13; i++) {
      const req = new Request('http://localhost:3000/api/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': ip,
          'user-agent': 'SpamTest/1.0',
        },
        body: JSON.stringify({
          action: 'claim',
          code: 'NO_SUCH_CODE',
          guestClientId: `rotated_${i}`,
        }),
      })
      const res = await redeemPost(req)
      lastStatus = res.status
    }
    assert.equal(lastStatus, 429)
  })

  it('validates /api/premium/sandbox-grant strict mode and characterId rules', () => {
    const routeSrc = fs.readFileSync(
      path.join(process.cwd(), 'app/api/premium/sandbox-grant/route.ts'),
      'utf8',
    )
    assert.ok(routeSrc.includes("body.mode !== undefined && body.mode !== 'sandbox' && body.mode !== 'gm'"))
    assert.ok(routeSrc.includes('!isValidCharacterIdFormat(body.characterId)'))
  })

  it('cross-checks totalTopupThb and lastDailyTopupDate against authoritative Firestore topupOrders', async () => {
    const nowMs = Date.now()
    const staleMs = nowMs - 10 * 24 * 60 * 60 * 1000
    const todayIso = new Date(nowMs).toISOString().slice(0, 10)

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/topupOrders')) {
        return new Response(
          JSON.stringify({
            documents: [
              {
                fields: {
                  status: { stringValue: 'credited' },
                  amountThb: { integerValue: '29' },
                  createdAtMs: { integerValue: String(staleMs) },
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response(
        JSON.stringify({
          fields: {
            diamonds: { integerValue: '100' },
            saveData: {
              mapValue: {
                fields: {
                  diamonds: { integerValue: '100' },
                  premium: {
                    mapValue: {
                      fields: {
                        totalTopupThb: { integerValue: '99999' },
                        lastDailyTopupDate: { stringValue: todayIso },
                        claimedDailyTopupDate: { stringValue: '' },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }) as typeof fetch

    const snapshot = await fetchAuthoritativeCharacterState('uid-1', 'slot_1', 'fake-bearer')
    assert.ok(snapshot)
    assert.equal(snapshot.exists, true)
    // Clamped to real order total (29 THB) rather than forged 99999 THB
    assert.equal(snapshot.totalTopupThb, 29)
    // Stale order (10 days ago) cannot satisfy today's daily topup bonus
    assert.equal(snapshot.lastDailyTopupDate, '')
  })

  it('enforces diamond cooldown, topup/vip/redeem locks, mailbox zero-diamond limit, and pure CEL syntax in firestore.rules', () => {
    const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8')
    // Must not use unsupported CEL constructs (let bindings or ternary ? :)
    assert.equal(/\blet\s+[a-zA-Z_]/.test(rules), false)
    assert.equal(/\?[^?\n]*:/.test(rules), false)

    assert.ok(rules.includes('incoming().diamonds <= existing().diamonds + 250'))
    assert.ok(rules.includes("duration.value(5, 's')"))
    assert.ok(rules.includes('function isAtomicNewTopupOrder(userId, characterId)'))
    assert.ok(rules.includes('function isValidNonGmVipExpGrowth(userId, characterId)'))
    assert.ok(rules.includes('function isValidNonGmVipExpiry()'))
    assert.ok(rules.includes('function isNewlyClaimedRedeemCode(characterId)'))
    assert.ok(rules.includes("(isGmAccount() || (incoming().diamonds == 0 && incoming().senderGameUid != '0000'))"))
    assert.ok(rules.includes("getAfter(/databases/$(database)/documents/topupSlipRequests/$(data.gatewayRef)).data.claimed == true"))
  })

  it('routes all client diamond mutations, check-in, wing gacha, battle pass, and topup commits through hardened guards', () => {
    const engineSrc = fs.readFileSync(path.join(process.cwd(), 'lib/game/engine.ts'), 'utf8')
    const checkinSrc = fs.readFileSync(path.join(process.cwd(), 'components/game/checkin-modal.tsx'), 'utf8')
    const charactersSrc = fs.readFileSync(path.join(process.cwd(), 'lib/firebase/characters.ts'), 'utf8')
    const ledgerSrc = fs.readFileSync(path.join(process.cwd(), 'lib/firebase/premium-ledger.ts'), 'utf8')

    assert.ok(engineSrc.includes('const GM_ONLY_DIAMOND_SOURCES = new Set(['))
    assert.ok(engineSrc.includes("!verifiedGm && (txType === 'sandbox_grant' || GM_ONLY_DIAMOND_SOURCES.has(meta.source))"))
    assert.ok(engineSrc.includes("source: 'wing_gacha'"))
    assert.ok(engineSrc.includes('export async function unlockBattlePassPremiumAction('))
    assert.ok(engineSrc.includes('export async function claimBattlePassTierAction('))
    assert.ok(engineSrc.includes('await commitAtomicTopupToCloud({'))
    assert.ok(engineSrc.includes('redeemPrem.claimedRedeemCodes = ['))

    assert.ok(checkinSrc.includes('commitDiamondDelta(game.p'))
    assert.equal(checkinSrc.includes('game.p.diamonds = (game.p.diamonds'), false)

    assert.ok(charactersSrc.includes('export async function commitAtomicTopupToCloud('))
    assert.ok(charactersSrc.includes('writeBatch(db)'))
    assert.ok(charactersSrc.includes('lastDiamondGainAt: serverTimestamp()'))
    assert.ok(ledgerSrc.includes('GM_ONLY_TX_SOURCES.has(tx.source)'))
  })
})
