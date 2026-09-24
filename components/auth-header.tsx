'use client'

import Link from 'next/link'
import { UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function AuthHeader() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  if (!user) {
    return <Link href="/sign-in" aria-label="Sign in" title="Sign in" className="grid size-10 place-items-center rounded-full border border-white/20 text-white/80 transition hover:border-[#ffb627] hover:text-[#ffb627]"><UserRound className="size-4" /></Link>
  }

  const name = user.user_metadata?.full_name?.split(' ')[0] || 'Account'
  return <button onClick={signOut} aria-label={`Sign out ${name}`} title={`Sign out ${name}`} className="grid size-10 place-items-center rounded-full border border-white/20 text-[#ffb627] transition hover:border-[#ff5a36] hover:text-[#ff5a36]"><UserRound className="size-4" /></button>
}
