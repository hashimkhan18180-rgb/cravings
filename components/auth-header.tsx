'use client'

import Link from 'next/link'
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
    return <><Link href="/sign-in" className="rounded-full border border-white/20 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-white/80 hover:border-[#ffb627] hover:text-[#ffb627]">Sign in</Link><Link href="/sign-up" className="hidden rounded-full border border-[#ff5a36] px-3 py-2.5 text-xs font-black uppercase tracking-wider text-[#ffb627] sm:inline-flex">Sign up</Link></>
  }

  const name = user.user_metadata?.full_name?.split(' ')[0] || 'Account'
  return <div className="flex items-center gap-2"><span className="hidden max-w-24 truncate text-xs font-black uppercase tracking-wider text-[#ffb627] sm:inline">{name}</span><button onClick={signOut} className="rounded-full border border-white/20 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-white/80 hover:border-[#ff5a36] hover:text-[#ff5a36]">Sign out</button></div>
}
