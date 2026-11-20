import { NextResponse } from 'next/server'
import { getVersionPayload } from '@/lib/game/version'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(getVersionPayload(), {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    },
  })
}
