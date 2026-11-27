import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, test } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Timestamp,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'

const projectId = 'demo-pixelgame-firestore-rules'
const uid = 'player1234'
const requestId = 'SLIP1234'
const characterId = 'char_01'
const orderId = `ORD-${requestId}`

let testEnv

const slipRecord = () => ({
  requestId,
  ownerId: uid,
  ownerEmail: 'player@example.com',
  playerName: 'Test Player',
  gameUid: '1234',
  characterId,
  packageId: 'topup_starter',
  packageName: 'Starter',
  amountThb: 29,
  baseDiamonds: 100,
  bonusDiamonds: 0,
  totalDiamonds: 100,
  vipExpGranted: 0,
  slipDataUrl: 'data:image/png;base64,AAAAAAAAAAAAAAAA',
  slipNote: '',
  status: 'approved',
  claimed: false,
  claimedAtMs: null,
  reviewedByUid: 'gm1234',
  reviewNote: null,
  slipHash: null,
  createdAtMs: 1700000000000,
  createdAt: Timestamp.fromMillis(1700000000000),
  updatedAt: Timestamp.fromMillis(1700000000000),
})

const orderRecord = (overrides = {}) => ({
  orderId,
  ownerId: uid,
  characterId,
  packageId: 'topup_starter',
  packageName: 'Starter',
  provider: 'promptpay_manual_gm',
  gatewayRef: requestId,
  amountThb: 29,
  baseDiamonds: 100,
  bonusDiamonds: 0,
  totalDiamonds: 100,
  vipExpGranted: 0,
  status: 'credited',
  txId: `TX-${requestId}`,
  serverVerified: true,
  serverSignature: 'test-signature-1234567890',
  createdAtMs: 1700000000000,
  createdAt: serverTimestamp(),
  ...overrides,
})

async function seedSlip() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'users', uid), { uid })
    await setDoc(doc(db, 'topupSlipRequests', requestId), slipRecord())
  })
}

function playerDb() {
  return testEnv.authenticatedContext(uid, {
    email: 'player@example.com',
    email_verified: true,
  }).firestore()
}

async function claimSlip(db) {
  await updateDoc(doc(db, 'topupSlipRequests', requestId), {
    claimed: true,
    claimedAtMs: 1700000001000,
    updatedAt: serverTimestamp(),
  })
}

before(async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8')
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await seedSlip()
})

after(async () => {
  await testEnv?.cleanup()
})

test('rejects claiming an approved slip before its durable order exists', async () => {
  await assertFails(claimSlip(playerDb()))
})

test('allows a matching durable manual-GM order, then allows the slip to be claimed', async () => {
  const db = playerDb()
  await assertSucceeds(
    setDoc(
      doc(db, 'users', uid, 'characters', characterId, 'topupOrders', orderId),
      orderRecord(),
    ),
  )
  await assertSucceeds(claimSlip(db))
})

test('rejects a manual-GM order whose diamond amount differs from the approved slip', async () => {
  const db = playerDb()
  await assertFails(
    setDoc(
      doc(db, 'users', uid, 'characters', characterId, 'topupOrders', orderId),
      orderRecord({ totalDiamonds: 999 }),
    ),
  )
  await assertFails(claimSlip(db))
})

test('rejects another account from claiming the approved slip', async () => {
  const otherDb = testEnv.authenticatedContext('otheruser123', {
    email: 'other@example.com',
    email_verified: true,
  }).firestore()
  await assertFails(claimSlip(otherDb))
})

test('rejects a second claim after the slip has already been claimed', async () => {
  const db = playerDb()
  await assertSucceeds(
    setDoc(
      doc(db, 'users', uid, 'characters', characterId, 'topupOrders', orderId),
      orderRecord(),
    ),
  )
  await assertSucceeds(claimSlip(db))
  await assertFails(claimSlip(db))
})

test('allows only one of two simultaneous claim attempts', async () => {
  const db = playerDb()
  await assertSucceeds(
    setDoc(
      doc(db, 'users', uid, 'characters', characterId, 'topupOrders', orderId),
      orderRecord(),
    ),
  )
  const results = await Promise.allSettled([claimSlip(db), claimSlip(db)])
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1)
})

test('allows the matching order and slip claim in one atomic Firestore batch', async () => {
  const db = playerDb()
  const batch = writeBatch(db)
  batch.set(
    doc(db, 'users', uid, 'characters', characterId, 'topupOrders', orderId),
    orderRecord(),
  )
  batch.update(doc(db, 'topupSlipRequests', requestId), {
    claimed: true,
    claimedAtMs: 1700000001000,
    updatedAt: serverTimestamp(),
  })
  await assertSucceeds(batch.commit())
})

test('allows an atomic character save, diamond ledger, order, and slip claim', async () => {
  const db = playerDb()
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore()
    await setDoc(doc(adminDb, 'users', uid, 'characters', characterId), {
      id: characterId,
      ownerId: uid,
      name: 'Test Player',
      jobId: 'swordsman',
      level: 1,
      exp: 0,
      hp: 100,
      mp: 20,
      gold: 0,
      diamonds: 50,
      mapId: 'town',
      playTime: 0,
      saveData: {
        diamonds: 50,
        premium: { wallet: { processedRequestIds: [] }, topupOrders: [] },
      },
      createdAt: Timestamp.fromMillis(1700000000000),
      updatedAt: Timestamp.fromMillis(1700000000000),
    })
  })

  const txId = `TX-${requestId}`
  const signature = 'test-signature-1234567890'
  const batch = writeBatch(db)
  batch.set(
    doc(db, 'users', uid, 'characters', characterId, 'topupOrders', orderId),
    orderRecord({ serverSignature: signature }),
  )
  batch.set(doc(db, 'users', uid, 'characters', characterId, 'diamondTransactions', txId), {
    txId,
    requestId: orderId,
    ownerId: uid,
    characterId,
    type: 'earn',
    source: 'promptpay_manual_gm',
    amount: 100,
    balanceBefore: 50,
    balanceAfter: 150,
    productId: 'topup_starter',
    itemId: null,
    note: 'Manual GM top-up',
    actorUid: uid,
    isGm: false,
    serverVerified: true,
    serverSignature: signature,
    createdAtMs: 1700000000000,
    createdAt: serverTimestamp(),
  })
  batch.update(doc(db, 'users', uid, 'characters', characterId), {
    diamonds: 150,
    saveData: {
      diamonds: 150,
      premium: {
        wallet: { processedRequestIds: [orderId] },
        topupOrders: [{ orderId }],
      },
    },
    updatedAt: serverTimestamp(),
  })
  batch.update(doc(db, 'topupSlipRequests', requestId), {
    claimed: true,
    claimedAtMs: 1700000001000,
    updatedAt: serverTimestamp(),
  })
  await assertSucceeds(batch.commit())
})
