import { NextResponse } from 'next/server'
import firebaseConfig from '@/firebase-applet-config.json'
import { resolveActorFromRequest } from '@/lib/server/premium-security'
import { getServerTopupDiagnostics } from '@/lib/server/topup-gateway'

export async function GET(req: Request) {
  const auth = await resolveActorFromRequest(req)
  if (!('actor' in auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }
  if (auth.actor.authMode !== 'firebase' || !auth.actor.emailVerified || !auth.actor.isGm) {
    return NextResponse.json({ ok: false, message: 'สงวนสิทธิ์เฉพาะ GM เท่านั้น' }, { status: 403 })
  }

  return NextResponse.json({
    ok: true,
    firebaseProjectId: firebaseConfig.projectId,
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
    topup: getServerTopupDiagnostics(),
    serverTimeMs: Date.now(),
  })
}
