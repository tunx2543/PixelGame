import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_TUNX2543_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? process.env.NEXT_PUBLIC_TUNX2543_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_TUNX2543_SUPABASE_ANON_KEY
  return { url, key }
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseEnv()
  return Boolean(url && key)
}

export function getOptionalClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (!client) {
    const { url, key } = getSupabaseEnv()
    client = createBrowserClient(url!, key!)
  }
  return client
}

export function createClient() {
  const optional = getOptionalClient()
  if (!optional) {
    throw new Error('Supabase configuration is missing')
  }
  return optional
}
