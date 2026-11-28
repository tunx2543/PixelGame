'use client'

import type { User } from '@supabase/supabase-js'
import { createClient } from './client'

export type PixelQuestAuthUser = User

export function subscribeToAuthState(
  callback: (user: PixelQuestAuthUser | null) => void,
) {
  const supabase = createClient()
  let active = true

  void supabase.auth.getUser().then(({ data, error }) => {
    if (active) callback(error ? null : data.user)
  })

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (active) callback(session?.user ?? null)
  })

  return () => {
    active = false
    subscription.unsubscribe()
  }
}

export async function signInWithGoogle() {
  if (typeof window === 'undefined') {
    throw new Error('Google sign-in can only start in the browser')
  }

  const supabase = createClient()
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: { prompt: 'select_account' },
    },
  })
}

export async function signOutSupabase() {
  const supabase = createClient()
  return supabase.auth.signOut()
}

export async function getCurrentSupabaseUser() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}
