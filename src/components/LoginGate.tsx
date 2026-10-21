import { useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  AlertCircle,
  Database,
  Eye,
  EyeOff,
  Info,
  Leaf,
  Loader2,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { authenticate, type AuthUser } from '../lib/auth'
import { DenrLogo } from './DenrLogo'

export function LoginGate({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [capsLock, setCapsLock] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    setError('')
    setSubmitting(true)
    try {
      const user = await authenticate(username, password)
      if (!user) {
        setError('Invalid username or password. Check your credentials and try again.')
        setSubmitting(false)
        return
      }
      onAuthenticated(user)
    } catch {
      setError('Sign-in could not be completed in this browser. Please try again or contact IT Support.')
      setSubmitting(false)
    }
  }

  const updateCapsLock = (event: KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(event.getModifierState('CapsLock'))
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-brand-300/20 blur-3xl" />
        <div className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-sky-300/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-300/10 blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/70 bg-white/55 shadow-glass-lg backdrop-blur-2xl lg:grid-cols-[1.05fr_1fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-emerald-950 p-9 text-white lg:flex lg:flex-col">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gold-400/10 blur-3xl" />

          <div className="relative flex items-center gap-3.5">
            <DenrLogo size="xl" />
            <div>
              <p className="text-[13px] font-semibold tracking-tight text-white">EMB Region 7</p>
              <p className="text-[11px] text-slate-400">Legal Docket</p>
            </div>
          </div>

          <div className="relative my-auto py-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">
              2025–2026 Legal Docket
            </p>
            <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-tight text-white">
              Clear oversight for
              <br />
              every environmental docket.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
              Read-only monitoring for case tracking, enforcement, payments, complaints, LBC
              document tracking, and DPWH compliance across the region.
            </p>

            <div className="mt-7 space-y-3 text-[11px] leading-5 text-slate-300">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                <span>Role-based accounts for authorized staff</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                <span>Snapshot-backed and read-only by design</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                <span>Internal monitoring for EMB Region 7</span>
              </div>
            </div>
          </div>

          <p className="relative text-[10px] leading-4 text-slate-500">
            Authorized personnel only. This dashboard contains internal case and contact
            information.
          </p>
        </section>

        <section className="relative flex flex-col justify-center bg-white/40 px-6 py-8 sm:px-10 sm:py-12">
          <div className="mb-8 flex items-center gap-3.5 lg:hidden">
            <DenrLogo size="lg" />
            <div>
              <p className="text-[13px] font-semibold tracking-tight text-navy-900">EMB Region 7</p>
              <p className="text-[11px] text-emerald-950/50">2025–2026 Legal Docket</p>
            </div>
          </div>

          <div className="mb-7">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-900/60">
              <ShieldCheck className="h-3 w-3" />
              Authorized access
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-navy-950">
              Sign in to continue
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-950/55">
              Use the username and password issued by your dashboard administrator.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="login-username"
                className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-950/50"
              >
                Username
              </label>
              <div className="relative mt-1.5">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-800/45" />
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                  required
                  maxLength={64}
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value)
                    if (error) setError('')
                  }}
                  placeholder="Enter your username"
                  className="input pl-10"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-950/50"
              >
                Password
              </label>
              <div className="relative mt-1.5">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-800/45" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (error) setError('')
                  }}
                  onKeyDown={updateCapsLock}
                  onKeyUp={updateCapsLock}
                  placeholder="Enter your password"
                  className="input pl-10 pr-11"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-emerald-800/45 transition hover:bg-white/70 hover:text-navy-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {capsLock ? (
                <p className="mt-1.5 text-[11px] font-medium text-amber-800">Caps Lock is on.</p>
              ) : null}
            </div>

            {error ? (
              <div
                id="login-error"
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 rounded-xl border border-rose-200/80 bg-rose-50/75 px-3 py-2.5 text-[11px] leading-5 text-rose-800"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !username.trim() || !password}
              className="btn-primary mt-1 w-full py-2.5"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {submitting ? 'Verifying credentials…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 flex items-start gap-2 rounded-xl border border-white/70 bg-white/35 px-3 py-2.5 text-[11px] leading-5 text-emerald-950/55">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>Accounts are issued by IT Support. Do not share your credentials.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
