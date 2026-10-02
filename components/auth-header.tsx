'use client'

import Link from 'next/link'
import { UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function AuthHeader() {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setOpen(false)
  }

  const fullName = user?.user_metadata?.full_name || user?.email || 'Account'
  const initials = fullName.split(/\\s+/).filter(Boolean).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase() || 'A'

  return <div ref={containerRef} className="relative">
    <button
      onClick={() => setOpen((current) => !current)}
      aria-expanded={open}
      aria-haspopup="menu"
      aria-label={user ? `Open account menu for ${fullName}` : 'Open account menu'}
      title={user ? fullName : 'Account menu'}
      className={user ? 'grid size-10 place-items-center rounded-full bg-[#ffb627] text-sm font-black text-[#1e1f1c] transition hover:bg-[#ff5a36]' : 'grid size-10 place-items-center rounded-full border border-white/20 text-white/80 transition hover:border-[#ffb627] hover:text-[#ffb627]'}
    >
      {user ? initials : <UserRound className="size-4" />}
    </button>
    {open && <div role="menu" className="absolute right-0 top-12 z-50 min-w-44 rounded-xl border border-white/10 bg-[#1e1f1c] p-2 shadow-xl">
      {user ? <>
        <div className="border-b border-white/10 px-3 py-2 text-sm font-bold text-white">{fullName}</div>
        <button role="menuitem" onClick={signOut} className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-[#ffb627] transition hover:bg-white/10">Sign out</button>
      </> : <>
        <Link role="menuitem" href="/sign-in" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-bold text-[#ffb627] transition hover:bg-white/10">Sign in</Link>
        <Link role="menuitem" href="/sign-up" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-bold text-[#ffb627] transition hover:bg-white/10">Sign up</Link>
      </>}
    </div>}
  </div>
}
