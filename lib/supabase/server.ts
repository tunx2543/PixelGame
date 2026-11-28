import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?? process.env.NEXT_PUBLIC_TUNX2543_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? process.env.NEXT_PUBLIC_TUNX2543_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_TUNX2543_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase URL or publishable key is missing')
  return { url, key }
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  const { url, key } = getSupabaseEnv()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot write cookies. The root proxy refreshes sessions.
        }
      },
    },
  })
}
