import { NextResponse } from 'next/server'
import { getTopupGatewayPublicConfig } from '@/lib/server/topup-gateway'

export async function GET() {
  return NextResponse.json({
    ok: true,
    ...getTopupGatewayPublicConfig(),
  })
}
