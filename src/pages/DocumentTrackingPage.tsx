import { useMemo, useState } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  Download,
  Link2Off,
  Search,
  Truck,
  Undo2,
} from 'lucide-react'
import type { CaseRecord, DashboardData } from '../lib/types'
import { getMonthlyRecordCounts } from '../lib/metrics'
import { exportLbc } from '../lib/export'
import {
  classNames,
  formatDate,
  formatNumber,
  formatPercent,
  truncate,
} from '../lib/utils'
import { Card, EmptyState, KpiCard, SectionHeader } from '../components/ui'

function LinkedCase({
  caseRecord,
  onOpenCase,
}: {
  caseRecord: CaseRecord | undefined
  onOpenCase: (caseRecord: CaseRecord) => void
}) {
  if (!caseRecord) return <span className="text-[11px] text-slate-400">Unlinked</span>
  return (
    <button
      type="button"
      onClick={() => onOpenCase(caseRecord)}
      className="font-mono text-[11px] font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-900"
    >
      {caseRecord.displayCaseNo}
    </button>
  )
}

export function DocumentTrackingPage({
  data,
  onOpenCase,
}: {
  data: DashboardData
  onOpenCase: (caseRecord: CaseRecord) => void
}) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const caseByNo = useMemo(() => {
    const map = new Map<string, CaseRecord>()
    for (const caseRecord of data.cases) {
      if (!map.has(caseRecord.caseNo)) map.set(caseRecord.caseNo, caseRecord)
    }
    return map
  }, [data.cases])

  const statuses = useMemo(
    () => [...new Set(data.lbc.map((record) => record.status).filter(Boolean))].sort(),
    [data.lbc],
  )

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return data.lbc.filter((record) => {
      if (status && record.status !== status) return false
      if (!query) return true
      return [
        record.iisRef,
        record.documentType,
        record.caseNo,
        record.respondent,
        record.trackingNo,
        record.status,
        record.statusAfterLbc,
        record.actionsIfReturned,
        record.update,
        record.linkedCaseNo ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [data.lbc, search, status])

  const monthly = useMemo(
    () =>
      getMonthlyRecordCounts(
        data.lbc.map((record) => ({ dateIso: record.dateOutboundIso })),
        data.dataDate,
        data.timelineStart,
      ),
    [data.lbc, data.dataDate, data.timelineStart],
  )

  const summary = useMemo(() => {
    const total = data.lbc.length
    const released = data.lbc.filter((record) =>
      record.status.toUpperCase().includes('RELEASED'),
    ).length
    const returned = data.lbc.filter(
      (record) =>
        record.statusAfterLbc.toUpperCase().includes('RETURNED') ||
        record.status.toUpperCase().includes('RETURNED'),
    ).length
    const closed = data.lbc.filter(
      (record) =>
        Boolean(record.dateClosedIso) || record.status.toUpperCase().includes('CLOSED'),
    ).length
    const linked = data.lbc.filter((record) => record.linkedCaseNo).length
    return { total, released, returned, closed, linked }
  }, [data.lbc])

  const maxMonth = Math.max(...monthly.map((item) => item.count), 1)
  const maxStatus = Math.max(
    ...[...new Set(data.lbc.map((record) => record.status || 'No status'))].map(
      (label) => data.lbc.filter((record) => (record.status || 'No status') === label).length,
    ),
    1,
  )

  if (!data.lbc.length) {
    return (
      <Card className="card-pad">
        <SectionHeader
          title="Document tracking"
          subtitle={`LBC dispatch and return tracking for ${data.scopeLabel}`}
        />
        <div className="mt-6">
          <EmptyState
            title="No document tracking in this scope"
            description="The 2026 workbook does not include an LBC Track tab. Switch to All years or 2025 to view the 2025 tracking records."
          />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          icon={Truck}
          label="Documents dispatched"
          value={formatNumber(summary.total)}
          subtext="Rows in the 2025 LBC Track tab"
          tone="navy"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Released"
          value={formatNumber(summary.released)}
          subtext={`${formatPercent(summary.total ? summary.released / summary.total : 0)} of rows`}
          tone="green"
        />
        <KpiCard
          icon={Undo2}
          label="Returned mail"
          value={formatNumber(summary.returned)}
          subtext="Status after LBC includes RETURNED"
          tone="red"
        />
        <KpiCard
          icon={CalendarClock}
          label="Closed at IIS"
          value={formatNumber(summary.closed)}
          subtext="Date closed or status contains CLOSED"
          tone="teal"
        />
        <KpiCard
          icon={Link2Off}
          label="Linked to a case"
          value={formatNumber(summary.linked)}
          subtext={`${formatNumber(summary.total - summary.linked)} rows remain unlinked`}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="card-pad xl:col-span-2">
          <SectionHeader
            title="Outbound volume by month"
            subtitle={`${data.scopeLabel} · LBC dispatch date, blank dates excluded`}
          />
          <div className="mt-5 flex h-[190px] items-end gap-1.5 overflow-x-auto pb-1">
            {monthly.map((item) => (
              <div key={item.key} className="flex min-w-[28px] flex-1 flex-col items-center gap-1">
                <span className="text-[9px] font-semibold tabular-nums text-slate-500">
                  {item.count || ''}
                </span>
                <div className="flex h-[130px] w-full items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-brand-700 to-brand-400"
                    style={{ height: `${Math.max(2, (item.count / maxMonth) * 100)}%` }}
                    title={`${item.label}: ${item.count} documents`}
                  />
                </div>
                <span className="whitespace-nowrap text-[9px] text-slate-400">
                  {item.label.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="card-pad">
          <SectionHeader title="LBC status mix" subtitle="Current dispatch status" />
          <div className="mt-4 space-y-3">
            {[...new Set(data.lbc.map((record) => record.status || 'No status'))]
              .sort()
              .map((label) => {
                const count = data.lbc.filter(
                  (record) => (record.status || 'No status') === label,
                ).length
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="truncate font-medium text-slate-600">{label}</span>
                      <span className="tabular-nums text-slate-500">{formatNumber(count)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${(count / maxStatus) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <SectionHeader
            title="LBC dispatch register"
            subtitle={`${formatNumber(rows.length)} of ${formatNumber(data.lbc.length)} rows · click a linked case number to open it`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[220px] flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search respondent, case, tracking no.…"
                className="w-full rounded-lg border border-white/70 bg-white/60 py-2 pl-8 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/20"
              />
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-white/70 bg-white/60 px-2.5 py-2 text-xs text-slate-600 outline-none focus:border-brand-300"
            >
              <option value="">All statuses</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => exportLbc(rows, data.scope)}
              className="btn-secondary text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>

        <div className="table-wrap max-h-[62vh] overflow-auto scrollbar-thin">
          <table className="data-table min-w-[1120px]">
            <thead>
              <tr>
                <th>Outbound</th>
                <th>Document</th>
                <th>DENR case / PAB docket</th>
                <th>Respondent</th>
                <th>LBC tracking</th>
                <th>Status</th>
                <th>Returned</th>
                <th>Closed</th>
                <th>Status after LBC</th>
                <th>Linked case</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((record) => (
                <tr key={record.id}>
                  <td className="whitespace-nowrap text-xs text-slate-600">
                    {formatDate(record.dateOutboundIso ?? record.dateOutbound)}
                  </td>
                  <td>
                    <span className="pill bg-sky-100/70 text-sky-800 ring-1 ring-white/60">
                      {record.documentType || 'Not stated'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap font-mono text-[11px] text-navy-700">
                    {record.caseNo || record.iisRef || '—'}
                  </td>
                  <td className="max-w-[250px]">
                    <p className="line-clamp-2 text-xs text-slate-700" title={record.respondent}>
                      {truncate(record.respondent, 80) || '—'}
                    </p>
                  </td>
                  <td className="whitespace-nowrap font-mono text-[10px] text-slate-500">
                    {record.trackingNo || '—'}
                  </td>
                  <td>
                    <span
                      className={classNames(
                        'pill whitespace-nowrap',
                        record.status.toUpperCase().includes('RELEASED')
                          ? 'bg-emerald-100/70 text-emerald-800 ring-1 ring-white/60'
                          : 'bg-white/50 text-slate-600 ring-1 ring-white/70',
                      )}
                    >
                      {record.status || 'No status'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-xs text-slate-600">
                    {formatDate(record.dateReturnedIso ?? record.dateReturned, '—')}
                  </td>
                  <td className="whitespace-nowrap text-xs text-slate-600">
                    {formatDate(record.dateClosedIso ?? record.dateClosed, '—')}
                  </td>
                  <td className="max-w-[180px]">
                    <p className="line-clamp-2 text-[11px] leading-5 text-slate-600">
                      {record.statusAfterLbc || record.actionsIfReturned || '—'}
                    </p>
                  </td>
                  <td>
                    <LinkedCase
                      caseRecord={
                        record.linkedCaseNo ? caseByNo.get(record.linkedCaseNo) : undefined
                      }
                      onOpenCase={onOpenCase}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-white/50 px-4 py-2.5 text-[10px] leading-4 text-emerald-950/40 sm:px-5">
          Source: 2025 LBC TRACK. “Status after LBC” is free text from the workbook; returned-mail
          detection is a keyword match, not an official disposition.
        </div>
      </Card>
    </div>
  )
}
