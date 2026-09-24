'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { UserRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function AuthHeader() {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!open) return
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  const signOut = async () => {
    setOpen(false)
    await supabase.auth.signOut()
  }

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Account'
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part: string) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return <div ref={menuRef} className="relative">
    <button
      type="button"
      onClick={() => setOpen((current) => !current)}
      className={`grid size-10 place-items-center rounded-full border text-xs font-black uppercase tracking-wider transition-colors ${user ? 'border-[#ffb627] bg-[#ffb627] text-[#1e1f1c]' : 'border-white/20 text-white/80 hover:border-[#ffb627] hover:text-[#ffb627]'}`}
      aria-label={user ? `Open account menu for ${fullName}` : 'Open account menu'}
      aria-expanded={open}
      aria-haspopup="menu"
    >
      {user ? initials : <UserRound aria-hidden="true" className="size-4" />}
    </button>
    {open && <div className="absolute right-0 top-12 z-50 min-w-44 origin-top-right animate-in rounded-2xl bg-[#1e1f1c] p-2 text-[#ffb627] shadow-2xl ring-1 ring-white/10 fade-in-0 zoom-in-95" role="menu">
      {user ? <>
        <div className="border-b border-white/10 px-3 py-2.5" role="presentation">
          <p className="truncate text-sm font-black text-white">{fullName}</p>
          {user.email && <p className="mt-0.5 truncate text-[10px] text-white/45">{user.email}</p>}
        </div>
        <button type="button" onClick={signOut} className="mt-1 flex w-full rounded-xl px-3 py-2.5 text-left text-xs font-black uppercase tracking-wider transition-colors hover:bg-white/10 hover:text-[#ff5a36]" role="menuitem">Sign out</button>
      </> : <>
        <Link href="/sign-in" onClick={() => setOpen(false)} className="flex rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider transition-colors hover:bg-white/10 hover:text-[#ff5a36]" role="menuitem">Sign in</Link>
        <Link href="/sign-up" onClick={() => setOpen(false)} className="flex rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider transition-colors hover:bg-white/10 hover:text-[#ff5a36]" role="menuitem">Sign up</Link>
      </>}
    </div>}
  </div>
}
