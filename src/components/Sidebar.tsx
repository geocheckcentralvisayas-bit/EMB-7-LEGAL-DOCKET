import {
  ClipboardCheck,
  Database,
  FolderSearch,
  Gavel,
  LayoutDashboard,
  MessageSquareWarning,
  ReceiptText,
  ShieldAlert,
  Truck,
} from 'lucide-react'
import type { Page } from '../lib/types'
import { classNames } from '../lib/utils'
import { DenrLogo } from './DenrLogo'

const NAV_ITEMS: {
  page: Page
  label: string
  description: string
  icon: typeof LayoutDashboard
  tone: string
}[] = [
  {
    page: 'overview',
    label: 'Overview',
    description: 'Portfolio health',
    icon: LayoutDashboard,
    tone: 'text-brand-300',
  },
  {
    page: 'tracker',
    label: 'Case Tracker',
    description: 'All dockets',
    icon: FolderSearch,
    tone: 'text-sky-300',
  },
  {
    page: 'enforcement',
    label: 'Enforcement',
    description: 'PAB stages & orders',
    icon: Gavel,
    tone: 'text-amber-300',
  },
  {
    page: 'payments',
    label: 'Payments',
    description: 'Collections & penalties',
    icon: ReceiptText,
    tone: 'text-emerald-300',
  },
  {
    page: 'tracking',
    label: 'Document Tracking',
    description: 'LBC dispatch log',
    icon: Truck,
    tone: 'text-cyan-300',
  },
  {
    page: 'compliance',
    label: 'Compliance',
    description: 'DPWH commitments',
    icon: ClipboardCheck,
    tone: 'text-violet-300',
  },
  {
    page: 'complaints',
    label: 'Complaints',
    description: 'Public complaints',
    icon: MessageSquareWarning,
    tone: 'text-orange-300',
  },
  {
    page: 'quality',
    label: 'Data Quality',
    description: 'Reconciliation',
    icon: ShieldAlert,
    tone: 'text-rose-300',
  },
]

export function Sidebar({
  page,
  onNavigate,
  dataDate,
  sourceUrl,
  scopeLabel,
  onOpenSource,
}: {
  page: Page
  onNavigate: (page: Page) => void
  dataDate: string
  sourceUrl: string
  scopeLabel: string
  onOpenSource?: (url: string) => void
}) {
  return (
    <aside className="no-print sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-navy-950 via-navy-900 to-emerald-950 text-white shadow-2xl shadow-emerald-950/30 backdrop-blur-2xl lg:flex xl:w-[268px]">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <DenrLogo size="md" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-tight text-white">EMB Region 7</p>
          <p className="truncate text-[11px] text-slate-400">Legal Docket</p>
        </div>
      </div>

      <div className="mx-5 mb-6 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-3 shadow-inner shadow-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
          Active workspace
        </div>
        <p className="mt-1.5 text-[13px] font-semibold text-slate-100">{scopeLabel}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">2025–2026 case monitoring</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Workspace
        </p>
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = page === item.page
            return (
              <button
                key={item.page}
                type="button"
                onClick={() => onNavigate(item.page)}
                className={classNames(
                  'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                  active
                    ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200',
                )}
              >
                {active ? (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-gold-400" />
                ) : null}
                <span
                  className={classNames(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition',
                    active ? 'bg-white/10' : 'bg-white/[0.035] group-hover:bg-white/[0.06]',
                  )}
                >
                  <Icon
                    className={classNames('h-[17px] w-[17px]', active ? item.tone : 'text-slate-500')}
                    strokeWidth={1.9}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{item.label}</span>
                  <span
                    className={classNames(
                      'block truncate text-[10px]',
                      active ? 'text-slate-400' : 'text-slate-600',
                    )}
                  >
                    {item.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      <div className="mt-6 border-t border-white/[0.08] px-5 py-5">
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Database className="h-3.5 w-3.5 text-slate-500" />
          <span>Snapshot data</span>
        </div>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          Data through {dataDate}. Source workbooks are read-only.
        </p>
        <button
          type="button"
          onClick={() => onOpenSource?.(sourceUrl)}
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-300 transition hover:text-brand-200"
        >
          Open source workbook
          <span aria-hidden="true">↗</span>
        </button>
        <p className="mt-4 text-[10px] leading-4 text-slate-600">
          Internal use only · contains personal contact information
        </p>
      </div>
    </aside>
  )
}

export function MobileNav({
  page,
  onNavigate,
}: {
  page: Page
  onNavigate: (page: Page) => void
}) {
  return (
    <nav className="no-print no-scrollbar flex gap-1 overflow-x-auto border-b border-white/60 bg-white/70 px-3 py-2 backdrop-blur-xl lg:hidden">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const active = page === item.page
        return (
          <button
            key={item.page}
            type="button"
            onClick={() => onNavigate(item.page)}
            className={classNames(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition',
              active
                ? 'bg-gradient-to-r from-brand-700 to-emerald-600 text-white shadow-md shadow-brand-900/20'
                : 'text-navy-700 hover:bg-white/55 hover:text-navy-900',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
