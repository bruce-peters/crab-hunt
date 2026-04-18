import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function LoginScreen() {
  const [mode, setMode]           = useState<'signin' | 'signup'>('signin')
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  function clearError() { setError('') }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name.trim() } },
      })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else if (!data.session) {
        // Email confirmation required
        setCheckEmail(true)
        setLoading(false)
      }
      // If session exists, onAuthStateChange in App.tsx handles the transition
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      }
    }
  }

  const canSubmit = mode === 'signup'
    ? name.trim() && email && password.length >= 6
    : email && password

  if (checkEmail) {
    return (
      <div className="flex flex-col min-h-dvh bg-[#0a0a0a] p-6 animate-fade-in">
        <div className="flex-1 flex flex-col justify-center gap-6 text-center">
          <p className="text-5xl">📬</p>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-white/40 text-sm leading-relaxed">
              We sent a confirmation link to<br />
              <span className="text-white/70 font-medium">{email}</span>
            </p>
          </div>
          <p className="text-white/25 text-xs">
            Click the link in the email, then come back and sign in.
          </p>
          <button
            type="button"
            onClick={() => { setCheckEmail(false); setMode('signin') }}
            className="w-full py-4 rounded-2xl border border-white text-white font-semibold text-base
                       active:scale-[0.98] transition-all hover:bg-white/5"
          >
            Back to sign in
          </button>
        </div>
        <p className="text-center text-white/15 text-xs font-mono mt-6">Powered by Supabase</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#0a0a0a] p-6 animate-fade-in">
      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-10 text-center">
          <p className="text-5xl mb-4">🦀</p>
          <h1 className="text-3xl font-bold text-white mb-2">Crab Hunt</h1>
          <p className="text-white/35 text-sm">Sign in to join your crew</p>
        </div>

        <div className="flex flex-col gap-4">
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <div className="flex flex-col gap-2 animate-slide-up">
                <label className="text-xs font-mono text-white/40 tracking-widest uppercase">
                  Display name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); clearError() }}
                  placeholder="Your name"
                  autoCapitalize="words"
                  className="w-full bg-white/[0.04] border border-white/15 rounded-2xl py-4 px-4
                             text-white placeholder-white/20 text-sm font-medium
                             focus:outline-none focus:border-white/40 transition-colors"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono text-white/40 tracking-widest uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); clearError() }}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-white/[0.04] border border-white/15 rounded-2xl py-4 px-4
                           text-white placeholder-white/20 text-sm font-medium
                           focus:outline-none focus:border-white/40 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono text-white/40 tracking-widest uppercase">
                Password
                {mode === 'signup' && (
                  <span className="ml-2 normal-case tracking-normal text-white/20">min 6 characters</span>
                )}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); clearError() }}
                placeholder="••••••••"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full bg-white/[0.04] border border-white/15 rounded-2xl py-4 px-4
                           text-white placeholder-white/20 text-sm font-medium
                           focus:outline-none focus:border-white/40 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400/80 text-xs text-center animate-fade-in px-1">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="mt-1 w-full py-4 rounded-2xl border border-white text-white font-semibold text-base
                         active:scale-[0.98] transition-all hover:bg-white/5
                         disabled:border-white/15 disabled:text-white/20 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
                </span>
              ) : (
                mode === 'signup' ? 'Create account →' : 'Sign in →'
              )}
            </button>
          </form>

          <p className="text-center text-white/30 text-xs mt-1">
            {mode === 'signin' ? (
              <>
                No account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError('') }}
                  className="text-white/60 underline underline-offset-2 hover:text-white/80 transition-colors"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError('') }}
                  className="text-white/60 underline underline-offset-2 hover:text-white/80 transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      <p className="text-center text-white/15 text-xs font-mono mt-6">
        Powered by Supabase
      </p>
    </div>
  )
}
