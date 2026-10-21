import type { ReactNode } from 'react'
import { BarChart3 } from 'lucide-react'
import { classNames } from '../lib/utils'

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={classNames('card card-pad print:break-inside-avoid', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-navy-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-emerald-950/55">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={classNames('mt-4', bodyClassName)}>{children}</div>
    </section>
  )
}

export function ChartEmpty({ message = 'No data to display' }: { message?: string }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-800/15 bg-white/30 text-emerald-900/45 backdrop-blur-sm">
      <BarChart3 className="h-5 w-5" />
      <p className="text-xs">{message}</p>
    </div>
  )
}

type TooltipEntry = {
  name?: string | number
  value?: string | number
  color?: string
  dataKey?: string | number
  payload?: Record<string, unknown>
}

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  valueFormatter?: (value: string | number, name: string, entry: TooltipEntry) => string
  labelFormatter?: (label: string | number) => string
}) {
  if (!active || !payload?.length) return null
  const heading =
    label ??
    (payload[0]?.payload?.label as string | undefined) ??
    payload[0]?.name ??
    ''
  return (
    <div className="min-w-[150px] rounded-xl border border-white/70 bg-white/75 px-3 py-2.5 shadow-glass-lg backdrop-blur-xl">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-900/55">
        {labelFormatter && label !== undefined ? labelFormatter(label) : heading}
      </p>
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const name = String(entry.name ?? entry.dataKey ?? '')
          const value = entry.value ?? 0
          return (
            <div key={`${name}-${index}`} className="flex items-center justify-between gap-5 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 text-emerald-950/60">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color ?? '#7c9a8c' }}
                />
                <span className="truncate">{name}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-navy-900">
                {valueFormatter
                  ? valueFormatter(value, name, entry)
                  : new Intl.NumberFormat('en-PH').format(Number(value) || 0)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string; value?: string }[]
  className?: string
}) {
  return (
    <div className={classNames('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-[11px] text-emerald-950/55">
          <span className="h-2 w-2 rounded-full ring-2 ring-white/60" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
          {item.value ? <span className="font-semibold text-navy-800">{item.value}</span> : null}
        </div>
      ))}
    </div>
  )
}

export function ChartNote({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[11px] leading-5 text-emerald-950/45">{children}</p>
}
