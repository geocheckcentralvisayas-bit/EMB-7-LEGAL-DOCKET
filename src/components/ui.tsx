import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'
import { ArrowUpRight, Inbox } from 'lucide-react'
import { STAGE_META, type StageKey } from '../lib/types'
import { classNames, statusLabel, statusTone } from '../lib/utils'

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={classNames('card', className)}>{children}</div>
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={classNames('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-navy-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs leading-5 text-emerald-950/55">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

const KPI_TONES: Record<
  string,
  { tile: string; ring: string; value: string; icon: string }
> = {
  navy: {
    tile: 'bg-emerald-100/70',
    ring: 'ring-white/70',
    value: 'text-navy-900',
    icon: 'text-emerald-700',
  },
  teal: {
    tile: 'bg-teal-100/70',
    ring: 'ring-white/70',
    value: 'text-teal-900',
    icon: 'text-teal-700',
  },
  amber: {
    tile: 'bg-amber-100/70',
    ring: 'ring-white/70',
    value: 'text-amber-900',
    icon: 'text-amber-700',
  },
  blue: {
    tile: 'bg-sky-100/70',
    ring: 'ring-white/70',
    value: 'text-sky-900',
    icon: 'text-sky-700',
  },
  violet: {
    tile: 'bg-lime-100/70',
    ring: 'ring-white/70',
    value: 'text-emerald-900',
    icon: 'text-lime-700',
  },
  green: {
    tile: 'bg-emerald-100/70',
    ring: 'ring-white/70',
    value: 'text-emerald-900',
    icon: 'text-emerald-700',
  },
  red: {
    tile: 'bg-rose-100/70',
    ring: 'ring-white/70',
    value: 'text-rose-900',
    icon: 'text-rose-700',
  },
  slate: {
    tile: 'bg-white/55',
    ring: 'ring-white/70',
    value: 'text-navy-900',
    icon: 'text-slate-600',
  },
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  subtext,
  tone = 'navy',
  onClick,
  actionLabel,
}: {
  icon: ComponentType<LucideProps>
  label: string
  value: ReactNode
  subtext?: ReactNode
  tone?: keyof typeof KPI_TONES
  onClick?: () => void
  actionLabel?: string
}) {
  const styles = KPI_TONES[tone] ?? KPI_TONES.navy
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-950/50">
            {label}
          </p>
          <p className={classNames('mt-2 text-[26px] font-semibold tracking-tight', styles.value)}>
            {value}
          </p>
        </div>
        <div
          className={classNames(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
            styles.tile,
            styles.ring,
          )}
        >
          <Icon className={classNames('h-[18px] w-[18px]', styles.icon)} strokeWidth={2} />
        </div>
      </div>
      <div className="mt-3 flex min-h-[18px] items-center justify-between gap-2">
        <div className="text-xs leading-5 text-emerald-950/50">{subtext}</div>
        {onClick ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand-700">
            {actionLabel ?? 'Open'}
            <ArrowUpRight className="h-3 w-3" />
          </span>
        ) : null}
      </div>
    </>
  )

  if (!onClick) {
    return <div className="card card-pad">{content}</div>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="card card-pad group text-left transition hover:-translate-y-0.5 hover:border-white hover:shadow-glass-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
    >
      {content}
    </button>
  )
}

export function StagePill({
  stage,
  showDot = true,
  className,
}: {
  stage: StageKey
  showDot?: boolean
  className?: string
}) {
  const meta = STAGE_META[stage]
  return (
    <span
      className={classNames(
        'pill whitespace-nowrap',
        meta.bg,
        meta.text,
        className,
      )}
    >
      {showDot ? (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
      ) : null}
      {meta.label}
    </span>
  )
}

const STATUS_TONE_STYLES: Record<string, string> = {
  green: 'bg-emerald-100/70 text-emerald-800 ring-1 ring-white/60',
  amber: 'bg-amber-100/70 text-amber-800 ring-1 ring-white/60',
  red: 'bg-rose-100/70 text-rose-800 ring-1 ring-white/60',
  blue: 'bg-sky-100/70 text-sky-800 ring-1 ring-white/60',
  violet: 'bg-lime-100/70 text-lime-900 ring-1 ring-white/60',
  slate: 'bg-white/50 text-slate-600 ring-1 ring-white/70',
}

export function RecordStatusPill({ status }: { status: string }) {
  const tone = statusTone(status)
  return (
    <span className={classNames('pill whitespace-nowrap', STATUS_TONE_STYLES[tone])}>
      {statusLabel(status)}
    </span>
  )
}

export function FlagChip({
  flag,
  onClick,
  active = false,
  className,
}: {
  flag: string
  onClick?: () => void
  active?: boolean
  className?: string
}) {
  const upper = flag.toUpperCase()
  let tone = 'bg-white/50 text-slate-600 ring-1 ring-white/70'
  if (
    upper.includes('WITHOUT') ||
    upper.includes('EXCEEDANCE') ||
    upper.includes('NON-SUBMISSION') ||
    upper.includes('NO PCO') ||
    upper.includes('NO SMR')
  ) {
    tone = 'bg-rose-100/70 text-rose-800 ring-1 ring-white/60'
  } else if (upper.includes('ECC CONDITION')) {
    tone = 'bg-amber-100/70 text-amber-800 ring-1 ring-white/60'
  } else if (upper.includes('PENDING') || upper.includes('UNPAID')) {
    tone = 'bg-amber-100/70 text-amber-800 ring-1 ring-white/60'
  } else if (upper.includes('SET ASIDE') || upper.includes('REDUCED')) {
    tone = 'bg-lime-100/70 text-lime-900 ring-1 ring-white/60'
  } else if (upper.includes('DENIED')) {
    tone = 'bg-rose-100/70 text-rose-800 ring-1 ring-white/60'
  } else if (upper.includes('COMPLAINT') || upper.includes('NON-PERFORMANCE')) {
    tone = 'bg-orange-100/70 text-orange-800 ring-1 ring-white/60'
  } else if (upper.includes('DUPLICATE') || upper.includes('INVALID') || upper.includes('UNNUMBERED')) {
    tone = 'bg-rose-100/70 text-rose-800 ring-1 ring-white/60'
  } else if (upper.includes('NO PAB') || upper.includes('ORDER WITHOUT')) {
    tone = 'bg-white/50 text-slate-600 ring-1 ring-white/70'
  }

  const classes = classNames(
    'pill max-w-full truncate',
    tone,
    active && 'ring-2 ring-brand-500/50',
    onClick && 'cursor-pointer transition hover:brightness-95',
    className,
  )

  if (!onClick) return <span className={classes}>{flag}</span>
  return (
    <button type="button" onClick={onClick} className={classes}>
      {flag}
    </button>
  )
}

export function CountBadge({ value, tone = 'slate' }: { value: number | string; tone?: string }) {
  const tones: Record<string, string> = {
    slate: 'bg-white/50 text-slate-600',
    teal: 'bg-teal-100/70 text-teal-800',
    amber: 'bg-amber-100/70 text-amber-800',
    blue: 'bg-sky-100/70 text-sky-800',
    violet: 'bg-lime-100/70 text-lime-900',
    green: 'bg-emerald-100/70 text-emerald-800',
    red: 'bg-rose-100/70 text-rose-800',
  }
  return (
    <span
      className={classNames(
        'inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
        tones[tone] ?? tones.slate,
      )}
    >
      {value}
    </span>
  )
}

export function ProgressBar({
  value,
  max,
  color = '#14a557',
  className,
}: {
  value: number
  max: number
  color?: string
  className?: string
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className={classNames('h-1.5 overflow-hidden rounded-full bg-white/45 ring-1 ring-white/50', className)}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
  )
}

export function EmptyState({
  title = 'No records match',
  description = 'Try clearing one or more filters, or search for a different case.',
  action,
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/45 text-emerald-700/60 ring-1 ring-white/60">
        <Inbox className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function InfoRow({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={classNames('min-w-0', className)}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-950/40">{label}</dt>
      <dd className="mt-1 break-words text-sm leading-5 text-slate-700">{value || '—'}</dd>
    </div>
  )
}
