import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  Link2Off,
  Search,
} from 'lucide-react'
import type { CaseRecord, DashboardData } from '../lib/types'
import { exportDpwh } from '../lib/export'
import { classNames, formatDate, formatNumber, formatPercent, truncate } from '../lib/utils'
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

function complianceTone(status: string): string {
  const value = status.toUpperCase()
  if (value.includes('COMPLIED') || value.includes('CLOSED')) {
    return 'bg-emerald-100/70 text-emerald-800 ring-1 ring-white/60'
  }
  if (value.includes('PENDING') || value.includes('ONGOING')) {
    return 'bg-amber-100/70 text-amber-800 ring-1 ring-white/60'
  }
  if (value.includes('NOT')) return 'bg-rose-100/70 text-rose-800 ring-1 ring-white/60'
  return 'bg-white/50 text-slate-600 ring-1 ring-white/70'
}

export function CompliancePage({
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
    () => [...new Set(data.dpwh.map((record) => record.status).filter(Boolean))].sort(),
    [data.dpwh],
  )

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return data.dpwh.filter((record) => {
      if (status && record.status !== status) return false
      if (!query) return true
      return [record.project, record.commitment, record.status, record.remarks, record.iisRef]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [data.dpwh, search, status])

  const summary = useMemo(() => {
    const total = data.dpwh.length
    const complied = data.dpwh.filter((record) =>
      record.status.toUpperCase().includes('COMPLIED'),
    ).length
    const pending = data.dpwh.filter((record) =>
      record.status.toUpperCase().includes('PENDING'),
    ).length
    const overdue = data.dpwh.filter(
      (record) =>
        Boolean(record.dueDateIso) &&
        (record.dueDateIso ?? '') < data.dataDate &&
        !record.status.toUpperCase().includes('COMPLIED') &&
        !record.status.toUpperCase().includes('CLOSED'),
    ).length
    const linked = data.dpwh.filter((record) => record.linkedCaseNo).length
    return { total, complied, pending, overdue, linked }
  }, [data.dpwh, data.dataDate])

  const projects = useMemo(() => {
    const map = new Map<
      string,
      {
        project: string
        iisRef: string
        total: number
        complied: number
        linkedCaseNo: string | null
      }
    >()
    for (const record of data.dpwh) {
      const key = record.project || record.iisRef
      const current = map.get(key) ?? {
        project: record.project || 'DPWH project',
        iisRef: record.iisRef,
        total: 0,
        complied: 0,
        linkedCaseNo: record.linkedCaseNo,
      }
      current.total += 1
      if (record.status.toUpperCase().includes('COMPLIED')) current.complied += 1
      if (!current.linkedCaseNo && record.linkedCaseNo) current.linkedCaseNo = record.linkedCaseNo
      map.set(key, current)
    }
    return [...map.values()]
  }, [data.dpwh])

  if (!data.dpwh.length) {
    return (
      <Card className="card-pad">
        <SectionHeader
          title="Compliance watchlist"
          subtitle={`DPWH CDO commitments for ${data.scopeLabel}`}
        />
        <div className="mt-6">
          <EmptyState
            title="No DPWH compliance records in this scope"
            description="DPWH compliance is recorded in the 2024 and 2025 workbooks. Switch to All years, 2024, or 2025 to view the commitments."
          />
        </div>
      </Card>
    )
  }

  const compliedRate = summary.total ? summary.complied / summary.total : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          icon={ClipboardCheck}
          label="Commitments"
          value={formatNumber(summary.total)}
          subtext="Rows in the DPWH Compliance (CDO) tab"
          tone="navy"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Complied"
          value={formatNumber(summary.complied)}
          subtext={`${formatPercent(compliedRate)} of commitments`}
          tone="green"
        />
        <KpiCard
          icon={Clock3}
          label="Pending"
          value={formatNumber(summary.pending)}
          subtext="Status explicitly says PENDING"
          tone="amber"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Past due"
          value={formatNumber(summary.overdue)}
          subtext="Due before the data-through date and not complied"
          tone="red"
        />
        <KpiCard
          icon={Link2Off}
          label="Linked to a case"
          value={formatNumber(summary.linked)}
          subtext={`${formatNumber(summary.total - summary.linked)} commitments remain unlinked`}
          tone="violet"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {projects.map((item) => {
          const rate = item.total ? item.complied / item.total : 0
          return (
            <Card key={`${item.project}-${item.iisRef}`} className="card-pad">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 ring-1 ring-white/60">
                    <ClipboardCheck className="h-[20px] w-[20px]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      DPWH CDO compliance · 2025 source
                    </p>
                    <h2 className="mt-1 text-base font-semibold tracking-tight text-navy-900">
                      {item.project}
                    </h2>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      IIS reference{' '}
                      <span className="font-mono font-semibold text-slate-700">
                        {item.iisRef || 'not recorded'}
                      </span>
                      {' · '}
                      linked case{' '}
                      {item.linkedCaseNo ? (
                        <LinkedCase
                          caseRecord={caseByNo.get(item.linkedCaseNo)}
                          onOpenCase={onOpenCase}
                        />
                      ) : (
                        <span className="text-slate-400">not linked</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-600">Compliance progress</span>
                  <span className="tabular-nums text-slate-500">
                    {formatNumber(item.complied)} / {formatNumber(item.total)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-brand-500"
                    style={{ width: `${rate * 100}%` }}
                  />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <SectionHeader
            title="Commitments and status"
            subtitle={`${formatNumber(rows.length)} of ${formatNumber(data.dpwh.length)} rows · source status and remarks`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[220px] flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search commitment or remarks…"
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
              onClick={() => exportDpwh(rows, data.scope)}
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
                <th className="w-[22%]">Project</th>
                <th className="w-[38%]">Commitment / agreement</th>
                <th>Due date</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Linked case</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((record) => {
                const overdue =
                  Boolean(record.dueDateIso) &&
                  (record.dueDateIso ?? '') < data.dataDate &&
                  !record.status.toUpperCase().includes('COMPLIED') &&
                  !record.status.toUpperCase().includes('CLOSED')
                return (
                  <tr key={record.id}>
                    <td>
                      <p className="line-clamp-2 text-[11px] font-medium leading-5 text-slate-700" title={record.project}>
                        {record.project || '—'}
                      </p>
                      <p className="font-mono text-[9px] text-slate-400">{record.iisRef || '—'}</p>
                    </td>
                    <td>
                      <p className="text-xs leading-5 text-slate-700" title={record.commitment}>
                        {truncate(record.commitment, 240) || '—'}
                      </p>
                    </td>
                    <td className="whitespace-nowrap">
                      <span
                        className={classNames(
                          'text-xs',
                          overdue ? 'font-semibold text-rose-600' : 'text-slate-600',
                        )}
                      >
                        {formatDate(record.dueDateIso ?? record.dueDate, '—')}
                      </span>
                      {overdue ? (
                        <p className="text-[10px] font-semibold text-rose-500">Past due</p>
                      ) : null}
                    </td>
                    <td>
                      <span className={classNames('pill whitespace-nowrap', complianceTone(record.status))}>
                        {record.status || 'No status'}
                      </span>
                    </td>
                    <td className="max-w-[300px]">
                      <p className="line-clamp-3 text-[11px] leading-5 text-slate-500">
                        {record.remarks || '—'}
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
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-white/50 px-4 py-2.5 text-[10px] leading-4 text-emerald-950/40 sm:px-5">
          Source: 2025 DPWH COMPLIANCE (CDO). The first workbook row combines commitments 1–3;
          subsequent rows carry one commitment each. Due-date and status text are reproduced from
          the source.
        </div>
      </Card>
    </div>
  )
}
