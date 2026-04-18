import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function LoginScreen() {
  const [mode, setMode]         = useState<'signin' | 'signup'>('signin')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  function clearError() { setError('') }

  async function handleGoogleSignIn() {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // On success the page redirects — no need to setLoading(false)
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name.trim() } },
      })
      if (error) {
        setError(error.message)
        setLoading(false)
      }
      // On success, onAuthStateChange in App.tsx handles the transition
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      }
    }
  }

  const canSubmit = mode === 'signup'
    ? name.trim() && email && password
    : email && password

  return (
    <div className="flex flex-col min-h-dvh bg-[#0a0a0a] p-6 animate-fade-in">
      <div className="flex-1 flex flex-col justify-center">
        {/* Logo */}
        <div className="mb-10 text-center">
          <p className="text-5xl mb-4">🦀</p>
          <h1 className="text-3xl font-bold text-white mb-2">Crab Hunt</h1>
          <p className="text-white/35 text-sm">Sign in to join your crew</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-4 rounded-2xl border border-white/25 bg-white/[0.04] text-white font-semibold text-sm
                       flex items-center justify-center gap-3
                       active:scale-[0.98] transition-all hover:bg-white/8
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <GoogleLogo />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs font-mono text-white/25 tracking-widest uppercase">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Email/password form */}
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

          {/* Mode toggle */}
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

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}
