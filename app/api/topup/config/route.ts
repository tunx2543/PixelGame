import { NextResponse } from 'next/server'
import { getTopupGatewayPublicConfig } from '@/lib/server/topup-gateway'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      ...getTopupGatewayPublicConfig(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    },
  )
}
