import { ChevronDown, ExternalLink, LogOut, Printer, RefreshCw } from 'lucide-react'
import type { AuthUser } from '../lib/auth'
import type { DashboardSource, Page, YearScope } from '../lib/types'
import { classNames, formatDate } from '../lib/utils'
import { DenrLogo } from './DenrLogo'

const PAGE_META: Record<Page, { title: string; subtitle: string }> = {
  overview: {
    title: 'EMB Region 7 Legal Docket',
    subtitle: '2023–2026 Environmental Case Monitoring',
  },
  tracker: {
    title: 'Case Tracker',
    subtitle: 'Search, filter, and inspect every docket in the selected scope',
  },
  enforcement: {
    title: 'Enforcement Pipeline',
    subtitle: 'PAB notices, orders, resolutions, and penalties',
  },
  payments: {
    title: 'Payments & Collections',
    subtitle: 'ERF and penalty payments recorded in the selected scope',
  },
  complaints: {
    title: 'Complaints',
    subtitle: 'Public complaints received, routed, and linked to cases',
  },
  tracking: {
    title: 'Document Tracking',
    subtitle: 'LBC dispatch, return, and closure tracking',
  },
  compliance: {
    title: 'Compliance Watchlist',
    subtitle: 'DPWH CDO commitments, due dates, and status',
  },
  quality: {
    title: 'Data Quality',
    subtitle: 'Source coverage, reconciliation, missing fields, and unlinked records',
  },
}

export function Header({
  page,
  dataDate,
  fetchedAt,
  sources,
  scope,
  years,
  onScopeChange,
  refreshing,
  refreshProgress,
  onRefresh,
  user,
  onSignOut,
  onOpenSource,
}: {
  page: Page
  dataDate: string
  fetchedAt: string
  sources: DashboardSource[]
  scope: YearScope
  years: string[]
  onScopeChange: (scope: YearScope) => void
  refreshing: boolean
  refreshProgress: string
  onRefresh: () => void
  user: AuthUser
  onSignOut: () => void
  onOpenSource?: (url: string) => void
}) {
  const meta = PAGE_META[page]
  return (
    <header className="no-print sticky top-0 z-30 border-b border-white/60 bg-white/90 shadow-sm shadow-emerald-900/5 backdrop-blur-2xl after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-brand-400/50 after:to-transparent">
      <div className="flex flex-col gap-3 px-4 py-3.5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <DenrLogo size="sm" className="lg:hidden" glow={false} />
          <div className="min-w-0">
            <h1 className="truncate text-[19px] font-semibold tracking-tight text-navy-900 sm:text-[22px]">
              {meta.title}
            </h1>
            <p className="mt-0.5 truncate text-[11px] text-emerald-950/55 sm:text-xs">{meta.subtitle}</p>
          </div>
        </div>

        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-0.5 lg:pb-0">
          <div className="flex shrink-0 items-center rounded-xl border border-white/70 bg-white/40 p-0.5 backdrop-blur-md">
            <button
              type="button"
              onClick={() => onScopeChange('all')}
              className={classNames(
                'whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition',
                scope === 'all'
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white/70 hover:text-navy-800',
              )}
            >
              All years
            </button>
            {years.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => onScopeChange(year)}
                className={classNames(
                  'whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition',
                  scope === year
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white/70 hover:text-navy-800',
                )}
              >
                {year}
              </button>
            ))}
          </div>

          <div
            className="flex shrink-0 items-center gap-2 rounded-xl border border-white/70 bg-white/40 px-3 py-2 backdrop-blur-md"
            title={`Data through ${formatDate(dataDate)} · snapshot fetched ${new Date(fetchedAt).toLocaleString('en-PH')}`}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="whitespace-nowrap text-[11px] font-semibold text-navy-700">
              <span className="hidden sm:inline">Data through </span>
              {formatDate(dataDate)}
            </span>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="btn-secondary shrink-0"
            title="Fetch the latest values from both Google Sheets (JSONP)"
          >
            <RefreshCw className={classNames('h-4 w-4', refreshing && 'animate-spin')} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Live refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn-secondary shrink-0"
            title="Print or save as PDF"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <details className="relative shrink-0">
            <summary className="btn-ghost flex cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden">
              <ExternalLink className="h-4 w-4" />
              <span className="hidden xl:inline">Sources</span>
              <ChevronDown className="h-3 w-3" />
            </summary>
            <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/70 bg-white/95 p-1.5 shadow-glass-lg backdrop-blur-xl">
              {sources.map((source) => (
                <button
                  key={source.year}
                  type="button"
                  onClick={() => onOpenSource?.(source.sourceUrl)}
                  className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-brand-50/70"
                >
                  <span className="mt-0.5 flex h-6 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand-600 to-emerald-700 text-[10px] font-bold text-white">
                    {source.year}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-semibold text-navy-800">
                      {source.label}
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      Open Google Sheet · data through {formatDate(source.dataDate)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </details>

          <div
            className="hidden shrink-0 items-center gap-2 rounded-xl border border-white/70 bg-white/40 px-2.5 py-1.5 backdrop-blur-md md:flex"
            title={`${user.displayName} · ${user.roleLabel}`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-emerald-700 text-[10px] font-bold text-white ring-1 ring-white/60">
              {user.initials}
            </span>
            <div className="min-w-0">
              <p className="max-w-[110px] truncate text-[11px] font-semibold leading-4 text-navy-800">
                {user.displayName}
              </p>
              <p className="text-[9px] font-semibold uppercase leading-3 tracking-[0.1em] text-emerald-950/45">
                {user.roleLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="btn-ghost shrink-0"
            title={`Sign out ${user.displayName}`}
            aria-label={`Sign out ${user.displayName}`}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden 2xl:inline">Sign out</span>
          </button>
        </div>
      </div>
      {refreshing && refreshProgress ? (
        <div className="border-t border-brand-100 bg-brand-50/70 px-4 py-1.5 text-[11px] font-medium text-brand-800 sm:px-6 lg:px-8">
          {refreshProgress}
        </div>
      ) : null}
    </header>
  )
}
