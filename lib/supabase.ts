import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'build-placeholder-key'

type SupabaseGlobal = typeof globalThis & {
  __cravingsSupabase?: SupabaseClient
}

const browserGlobal = globalThis as SupabaseGlobal

// Keep one browser client across Fast Refresh and every component import. A second
// client can compete for the same auth storage and invalidate the active session.
const liveFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: 'no-store' })

export const supabase = browserGlobal.__cravingsSupabase ?? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: liveFetch,
  },
})

if (process.env.NODE_ENV !== 'production') {
  browserGlobal.__cravingsSupabase = supabase
}
