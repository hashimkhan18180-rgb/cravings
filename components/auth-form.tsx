'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type AuthMode = 'sign-in' | 'sign-up'

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const isSignUp = mode === 'sign-up'
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') || '').trim()
    const password = String(form.get('password') || '')
    setPending(true)

    if (isSignUp) {
      const name = String(form.get('name') || '').trim()
      const phone = String(form.get('phone') || '').trim()
      const confirm = String(form.get('confirm-password') || '')
      if (password.length < 6) { setError('Password must be at least 6 characters.'); setPending(false); return }
      if (password !== confirm) { setError('Passwords do not match.'); setPending(false); return }
      const { error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, phone }, emailRedirectTo: `${window.location.origin}/auth/callback` } })
      if (signUpError) setError(signUpError.message.toLowerCase().includes('password') ? 'Please choose a stronger password.' : 'We could not create your account. Please check your details and try again.')
      else setMessage('Check your email to confirm your account, then come back to sign in.')
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) setError(signInError.message.toLowerCase().includes('confirm') ? 'Please confirm your email before signing in.' : 'Invalid email or password.')
      else router.push('/')
    }
    setPending(false)
  }

  return <form onSubmit={submit} className="grid gap-4">
    {isSignUp && <label className="grid gap-2 text-xs font-black uppercase tracking-wider">Full name<input name="name" required className="rounded-xl border-0 bg-white px-4 py-3 text-sm normal-case outline-none focus:ring-2 focus:ring-[#ff5a36]" placeholder="Your name" /></label>}
    <label className="grid gap-2 text-xs font-black uppercase tracking-wider">Email<input name="email" type="email" required className="rounded-xl border-0 bg-white px-4 py-3 text-sm normal-case outline-none focus:ring-2 focus:ring-[#ff5a36]" placeholder="you@example.com" /></label>
    {isSignUp && <label className="grid gap-2 text-xs font-black uppercase tracking-wider">Phone number<input name="phone" type="tel" required className="rounded-xl border-0 bg-white px-4 py-3 text-sm normal-case outline-none focus:ring-2 focus:ring-[#ff5a36]" placeholder="03XX XXXXXXX" /></label>}
    <label className="grid gap-2 text-xs font-black uppercase tracking-wider">Password<input name="password" type="password" required minLength={6} className="rounded-xl border-0 bg-white px-4 py-3 text-sm normal-case outline-none focus:ring-2 focus:ring-[#ff5a36]" placeholder="At least 6 characters" /></label>
    {isSignUp && <label className="grid gap-2 text-xs font-black uppercase tracking-wider">Confirm password<input name="confirm-password" type="password" required className="rounded-xl border-0 bg-white px-4 py-3 text-sm normal-case outline-none focus:ring-2 focus:ring-[#ff5a36]" placeholder="Repeat your password" /></label>}
    {!isSignUp && <Link href="/forgot-password" className="text-right text-xs font-bold text-[#ff5a36] hover:underline">Forgot password?</Link>}
    {error && <p role="alert" className="rounded-xl bg-[#ff5a36]/10 px-4 py-3 text-sm font-bold text-[#c4381d]">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-[#ffb627]/20 px-4 py-3 text-sm font-bold">{message}</p>}
    <button disabled={pending} className="mt-2 rounded-full bg-[#ff5a36] px-6 py-4 text-sm font-black uppercase tracking-wider text-white disabled:opacity-60">{pending ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}</button>
    <p className="text-center text-sm text-black/55">{isSignUp ? 'Already have an account?' : 'New to Cravings?'} <Link href={isSignUp ? '/sign-in' : '/sign-up'} className="font-black text-[#ff5a36] hover:underline">{isSignUp ? 'Sign in' : 'Sign up'}</Link></p>
  </form>
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const isSignUp = mode === 'sign-up'
  return <main className="grid min-h-screen place-items-center bg-[#1e1f1c] px-5 py-12 text-[#1e1f1c]"><section className="w-full max-w-md rounded-[2rem] bg-[#f5f1e9] p-7 shadow-2xl md:p-10"><Link href="/" className="text-xs font-black uppercase tracking-[0.2em] text-[#ff5a36]">← Back to Cravings</Link><h1 className="mt-8 text-4xl font-black uppercase leading-none tracking-[-0.06em]">{isSignUp ? <>Join the<br /><span className="text-[#ff5a36]">good stuff.</span></> : <>Welcome<br /><span className="text-[#ff5a36]">back.</span></>}</h1><p className="mt-4 text-sm leading-relaxed text-black/55">{isSignUp ? 'Create your Cravings account for faster ordering.' : 'Sign in to pick up where you left off.'}</p><div className="mt-8"><AuthForm mode={mode} /></div></section></main>
}
