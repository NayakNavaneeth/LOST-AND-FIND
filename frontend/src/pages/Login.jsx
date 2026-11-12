import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [msg, setMsg] = useState('')

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setMsg('')
    const { email, password, full_name } = form
    const { error } = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name } } })
    if (error) setMsg(error.message)
    else if (mode === 'signup') setMsg('Account created. Check your email if confirmation is on, then sign in.')
  }

  const input = 'w-full rounded-md border border-line bg-white px-3 py-2'
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <section className="flex flex-col justify-center bg-ink p-10 text-white">
        <h1 className="text-5xl font-extrabold leading-tight">
          Don’t search for your lost things.
        </h1>
        <p className="mt-4 max-w-md text-lg text-white/80">
          Report what you lost or found. We compare descriptions, places and dates to pair them up.
        </p>
      </section>
      <form onSubmit={submit} className="flex flex-col justify-center gap-4 p-10">
        <h2 className="text-2xl font-bold">{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
        {mode === 'signup' && (
          <input className={input} placeholder="Full name" required value={form.full_name} onChange={set('full_name')} />
        )}
        <input className={input} type="email" placeholder="College email" required value={form.email} onChange={set('email')} />
        <input className={input} type="password" placeholder="Password" minLength={6} required value={form.password} onChange={set('password')} />
        <button className="rounded-md bg-tag px-4 py-2 font-semibold hover:brightness-95">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        {msg && <p role="alert" className="text-sm text-lost">{msg}</p>}
        <button type="button" className="text-left text-sm underline"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
