import Link from 'next/link'

export default function ForgotPasswordPage() {
  return <main className="grid min-h-screen place-items-center bg-[#1e1f1c] px-5 py-12"><section className="w-full max-w-md rounded-[2rem] bg-[#f5f1e9] p-8 text-center"><h1 className="text-3xl font-black uppercase">Forgot password?</h1><p className="mt-4 text-sm text-black/60">Password recovery is coming soon. Please contact us and we&apos;ll help you get back in.</p><Link href="/sign-in" className="mt-7 inline-flex rounded-full bg-[#ff5a36] px-6 py-3 text-xs font-black uppercase tracking-wider text-white">Back to sign in</Link></section></main>
}
