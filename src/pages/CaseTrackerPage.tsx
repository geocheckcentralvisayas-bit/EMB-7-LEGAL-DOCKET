import { useMemo } from 'react'
import { FolderSearch, Gavel, ReceiptText, TriangleAlert } from 'lucide-react'
import type { CaseFilters } from '../lib/metrics'
import { exportCases } from '../lib/export'
import type { CaseRecord, DashboardData } from '../lib/types'
import { formatCompactMoney, formatNumber } from '../lib/utils'
import { CaseTable } from '../components/CaseTable'
import { FilterBar, type FilterOptions } from '../components/FilterBar'
import { Card, FlagChip, SectionHeader } from '../components/ui'

export function CaseTrackerPage({
  data,
  cases,
  filters,
  options,
  onFilterChange,
  onResetFilters,
  onOpenCase,
}: {
  data: DashboardData
  cases: CaseRecord[]
  filters: CaseFilters
  options: FilterOptions
  onFilterChange: (key: keyof CaseFilters, value: string) => void
  onResetFilters: () => void
  onOpenCase: (caseRecord: CaseRecord) => void
}) {
  const summary = useMemo(() => {
    const pab = cases.filter((caseRecord) => caseRecord.pabNov.length > 0).length
    const pending = cases.filter((caseRecord) => caseRecord.pendingPayment).length
    const paid = cases.reduce((sum, caseRecord) => sum + caseRecord.paidAmount, 0)
    return { pab, pending, paid }
  }, [cases])

  const topFlags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const caseRecord of cases) {
      for (const flag of caseRecord.flags) counts.set(flag, (counts.get(flag) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([flag, count]) => ({ flag, count }))
  }, [cases])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <div className="card flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100/70 text-emerald-800 ring-1 ring-white/60">
            <FolderSearch className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Filtered records
            </p>
            <p className="text-lg font-semibold tabular-nums text-navy-900">
              {formatNumber(cases.length)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100/70 text-amber-800 ring-1 ring-white/60">
            <Gavel className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              PAB NOV linked
            </p>
            <p className="text-lg font-semibold tabular-nums text-navy-900">
              {formatNumber(summary.pab)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100/70 text-rose-800 ring-1 ring-white/60">
            <TriangleAlert className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Pending payment
            </p>
            <p className="text-lg font-semibold tabular-nums text-navy-900">
              {formatNumber(summary.pending)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100/70 text-emerald-800 ring-1 ring-white/60">
            <ReceiptText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Paid amount
            </p>
            <p className="text-lg font-semibold tabular-nums text-navy-900">
              {formatCompactMoney(summary.paid)}
            </p>
          </div>
        </div>
      </div>

      <FilterBar
        filters={filters}
        options={options}
        onChange={onFilterChange}
        onReset={onResetFilters}
        resultCount={cases.length}
        totalCount={data.cases.length}
        onExport={() => exportCases(cases, data.scope)}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/50 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <SectionHeader
            title={`${data.scopeLabel} case register`}
            subtitle="Click any row to open the full enforcement, payment, document-tracking, and complaint history."
            className="flex-1"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {topFlags.map((item) => (
              <FlagChip
                key={item.flag}
                flag={`${item.flag} · ${item.count}`}
                onClick={() => onFilterChange('flag', item.flag)}
              />
            ))}
          </div>
        </div>
        <CaseTable cases={cases} onOpenCase={onOpenCase} />
      </Card>

      <div className="flex flex-col gap-1.5 px-1 text-[10px] leading-4 text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Scope: {data.scopeLabel}. Linked enforcement, payment, LBC, and compliance records follow
          the docket year; unlinked rows follow their source workbook year.
        </p>
        <p>
          Flag chips are clickable filters. Derived stage is a monitoring view, not an official legal
          status.
        </p>
      </div>
    </div>
  )
}
