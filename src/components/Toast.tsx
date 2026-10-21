import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { classNames } from '../lib/utils'

export type ToastTone = 'success' | 'error' | 'info'

const TONES: Record<ToastTone, { wrapper: string; icon: string; Icon: typeof CheckCircle2 }> = {
  success: {
    wrapper: 'border-emerald-200/80 bg-white/65',
    icon: 'text-emerald-600',
    Icon: CheckCircle2,
  },
  error: {
    wrapper: 'border-rose-200/80 bg-white/65',
    icon: 'text-rose-600',
    Icon: AlertCircle,
  },
  info: {
    wrapper: 'border-white/80 bg-white/65',
    icon: 'text-navy-700',
    Icon: Info,
  },
}

export function Toast({
  message,
  tone = 'info',
  onClose,
}: {
  message: string
  tone?: ToastTone
  onClose: () => void
}) {
  const styles = TONES[tone]
  const Icon = styles.Icon
  return (
    <div
      role="status"
      className={classNames(
        'no-print fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-glass-lg backdrop-blur-xl',
        styles.wrapper,
      )}
    >
      <Icon className={classNames('mt-0.5 h-4 w-4 shrink-0', styles.icon)} />
      <p className="text-xs font-medium leading-5 text-slate-700">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="ml-1 rounded p-0.5 text-slate-400 transition hover:bg-white/70 hover:text-navy-700"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
