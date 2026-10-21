import { useState, type FormEvent } from 'react'
import { AlertCircle, ExternalLink, Loader2, LockKeyhole, ShieldCheck, UserRound, X } from 'lucide-react'
import { verifyCredentials } from '../lib/auth'

export function SourceAccessGate({
  open,
  url,
  onClose,
  onGranted,
}: {
  open: boolean
  url: string
  onClose: () => void
  onGranted: (url: string) => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await verifyCredentials(username, password)
      if (!user || user.username !== 'source.viewer') {
        setError('Source access requires the Source Viewer account.')
        setSubmitting(false)
        return
      }
      onGranted(url)
    } catch {
      setError('Source access could not be verified. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-glass-lg backdrop-blur-xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-900/60">
              <ShieldCheck className="h-3 w-3" />
              Source access
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-navy-950">
              Verify source access
            </h2>
            <p className="mt-1 text-sm leading-6 text-emerald-950/55">
              Enter the Source Viewer credentials to open this workbook.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost p-2" aria-label="Close source access">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-950/50">
              Username
            </label>
            <div className="relative mt-1.5">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-800/45" />
              <input
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value)
                  if (error) setError('')
                }}
                placeholder="source.viewer"
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-950/50">
              Password
            </label>
            <div className="relative mt-1.5">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-800/45" />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (error) setError('')
                }}
                placeholder="Enter source password"
                className="input pl-10"
              />
            </div>
          </div>

          {error ? (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200/80 bg-rose-50/75 px-3 py-2.5 text-[11px] leading-5 text-rose-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !username.trim() || !password} className="btn-primary flex-1">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              {submitting ? 'Verifying...' : 'Open source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
