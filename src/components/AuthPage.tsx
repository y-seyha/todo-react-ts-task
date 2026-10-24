import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/auth-context.ts'
import { CheckIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon, UserIcon, XIcon } from './icons.tsx'

export const AuthPage = () => {
  const { login, signup, isLoading, error, clearError } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const switchMode = (nextMode: 'login' | 'signup') => {
    setMode(nextMode)
    setValidationError(null)
    clearError()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (mode === 'signup') {
      if (!firstName.trim() || !lastName.trim()) {
        setValidationError('First name and last name are required.')
        return
      }
      if (password.length < 8) {
        setValidationError('Password must be at least 8 characters.')
        return
      }
      try {
        await signup({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
        })
      } catch {
        // Error state handled in context
      }
    } else {
      if (!email.trim() || !password) {
        setValidationError('Please enter your email and password.')
        return
      }
      try {
        await login({ email: email.trim(), password })
      } catch {
        // Error state handled in context
      }
    }
  }

  const activeError = validationError ?? error

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 via-indigo-50/30 to-slate-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/25">
            <CheckIcon className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            TaskFlow
          </h1>
          <p className="mt-1 text-sm text-slate-500">Plan it. Track it. Finish it.</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-7 shadow-xl shadow-slate-200/50 backdrop-blur-md sm:p-8">
          {/* Mode Tabs */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          {activeError && (
            <div
              role="alert"
              className="mb-5 flex items-start justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700"
            >
              <span>{activeError}</span>
              <button
                type="button"
                onClick={() => {
                  setValidationError(null)
                  clearError()
                }}
                className="shrink-0 text-rose-500 hover:text-rose-700"
                aria-label="Dismiss error"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    First Name
                  </label>
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <UserIcon className="h-4 w-4" />
                    </span>
                    <input
                      id="firstName"
                      type="text"
                      required
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-3 pl-9 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Last Name
                  </label>
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <UserIcon className="h-4 w-4" />
                    </span>
                    <input
                      id="lastName"
                      type="text"
                      required
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-3 pl-9 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="authEmail"
                className="block text-xs font-semibold text-slate-700"
              >
                Email Address
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <MailIcon className="h-4 w-4" />
                </span>
                <input
                  id="authEmail"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-3 pl-9 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="authPassword"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Password
                </label>
                {mode === 'signup' && (
                  <span className="text-[11px] text-slate-500">Min 8 characters</span>
                )}
              </div>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <LockIcon className="h-4 w-4" />
                </span>
                <input
                  id="authPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder={mode === 'signup' ? '••••••••' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-10 pl-9 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Processing…</span>
                </>
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Toggle footer link */}
          <div className="mt-6 text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <p>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
