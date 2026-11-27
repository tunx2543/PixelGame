import { NextResponse } from 'next/server'
import firebaseConfig from '@/firebase-applet-config.json'
import { getGmEventsStorePersistenceMode } from '@/lib/server/gm-events-store'
import { getPatchNotesStorePersistenceMode } from '@/lib/server/patch-notes-store'
import { isPersistentPremiumSecretConfigured, resolveActorFromRequest } from '@/lib/server/premium-security'
import { getRedeemStorePersistenceMode } from '@/lib/server/redeem-codes-store'
import { isCloudflareWorkersRuntime } from '@/lib/server/runtime-store'
import { getServerTopupDiagnostics } from '@/lib/server/topup-gateway'
import { getTopupStorePersistenceMode } from '@/lib/server/topup-store'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
}

export async function GET(req: Request) {
  const auth = await resolveActorFromRequest(req)
  if (!('actor' in auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status, headers: NO_STORE_HEADERS })
  }
  if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified || !auth.actor.isGm) {
    return NextResponse.json(
      { ok: false, message: 'สงวนสิทธิ์เฉพาะ GM เท่านั้น' },
      { status: 403, headers: NO_STORE_HEADERS },
    )
  }

  const isCloudflareWorkers = isCloudflareWorkersRuntime()
  const premiumTxSecretConfigured = isPersistentPremiumSecretConfigured()
  const persistence = {
    topupStore: getTopupStorePersistenceMode(),
    gmEventsStore: getGmEventsStorePersistenceMode(),
    redeemCodesStore: getRedeemStorePersistenceMode(),
    patchNotesStore: getPatchNotesStorePersistenceMode(),
  }

  const warnings: string[] = []
  if (!premiumTxSecretConfigured) {
    warnings.push('PREMIUM_TX_SECRET is not configured — premium actions that require server signatures are disabled on Cloudflare until this secret is set; no isolate-local fallback is used.')
  }
  if (isCloudflareWorkers) {
    warnings.push(
      'Running on Cloudflare Workers stateless isolates — legacy server-side stores for GM events, redeem-code management, merchant QR settings, and Stripe webhook fulfillment remain isolate-local. Manual slip requests and GM review use the Firestore client persistence path.',
    )
  }

  return NextResponse.json(
    {
      ok: true,
      firebaseProjectId: firebaseConfig.projectId,
      firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
      runtime: {
        isCloudflareWorkers,
        premiumTxSecretConfigured,
        persistence,
        warnings,
      },
      topup: getServerTopupDiagnostics(),
      serverTimeMs: Date.now(),
    },
    { headers: NO_STORE_HEADERS },
  )
}
