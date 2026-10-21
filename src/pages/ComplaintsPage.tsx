import { Fragment, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Link2,
  Mail,
  MessageSquareWarning,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CaseRecord, DashboardData } from '../lib/types'
import { getComplaintSummary, getMonthlyRecordCounts } from '../lib/metrics'
import { exportComplaints } from '../lib/export'
import {
  classNames,
  formatDate,
  formatNumber,
  formatPercent,
  monthKey,
  monthLabel,
  truncate,
} from '../lib/utils'
import { ChartCard, ChartEmpty, ChartNote, ChartTooltip } from '../components/charts'
import { KpiCard, Card, EmptyState, SectionHeader } from '../components/ui'

const MODE_COLORS: Record<string, string> = {
  EMAIL: '#0e7490',
  FB: '#4d7c0f',
  'Not stated': '#7c9a8c',
}

function LinkedCase({
  caseNo,
  caseMap,
  onOpenCase,
}: {
  caseNo: string | null
  caseMap: Map<string, CaseRecord>
  onOpenCase: (caseRecord: CaseRecord) => void
}) {
  const caseRecord = caseNo ? caseMap.get(caseNo) : undefined
  if (!caseRecord) return <span className="text-xs text-slate-300">—</span>
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onOpenCase(caseRecord)
      }}
      className="whitespace-nowrap font-mono text-[10px] font-semibold text-brand-700 underline-offset-2 hover:underline"
    >
      {caseRecord.displayCaseNo}
    </button>
  )
}

export function ComplaintsPage({
  data,
  onOpenCase,
}: {
  data: DashboardData
  onOpenCase: (caseRecord: CaseRecord) => void
}) {
  const summary = useMemo(() => getComplaintSummary(data), [data])
  const monthly = useMemo(() => {
    const rows = getMonthlyRecordCounts(data.complaints, data.dataDate, data.timelineStart)
    if (data.scope !== 'all') return rows
    const totals = new Map<string, number>()
    for (const row of rows) {
      const month = row.key.slice(5, 7)
      totals.set(month, (totals.get(month) ?? 0) + row.count)
    }
    return Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, '0')
      return {
        key: `all-${month}`,
        label: monthLabel(`2000-${month}`).split(' ')[0],
        count: totals.get(month) ?? 0,
        isCurrent: false,
      }
    })
  }, [data.complaints, data.dataDate, data.timelineStart, data.scope])
  const unplottedComplaints = useMemo(
    () => data.complaints.length - monthly.reduce((sum, item) => sum + item.count, 0),
    [data.complaints.length, monthly],
  )
  const caseMap = useMemo(
    () => new Map(data.cases.map((caseRecord) => [caseRecord.caseNo, caseRecord])),
    [data.cases],
  )
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState('')
  const [month, setMonth] = useState('')
  const [linkedOnly, setLinkedOnly] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const modes = useMemo(() => [...new Set(data.complaints.map((item) => item.mode || 'Not stated'))].sort(), [data])
  const months = useMemo(
    () =>
      [...new Set(data.complaints.map((item) => monthKey(item.dateIso)).filter((key): key is string => Boolean(key)))]
        .sort()
        .map((key) => ({ key, label: monthLabel(key) })),
    [data],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return data.complaints.filter((complaint) => {
      if (mode && (complaint.mode || 'Not stated') !== mode) return false
      if (month && monthKey(complaint.dateIso) !== month) return false
      if (linkedOnly && !complaint.linkedCaseNo) return false
      if (!query) return true
      return [
        complaint.date,
        complaint.iisRef,
        complaint.mode,
        complaint.subject,
        complaint.complainant,
        complaint.respondent,
        complaint.actions,
        complaint.linkedCaseNo,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [data.complaints, mode, month, linkedOnly, search])

  const topMode = summary.modes[0]
  const linkedPercent = summary.total ? summary.linked / summary.total : 0

  if (!data.complaints.length) {
    return (
      <Card className="card-pad">
        <SectionHeader
          title="Complaints"
          subtitle={`Public complaints for ${data.scopeLabel}`}
        />
        <div className="mt-6">
          <EmptyState
            title="No complaints in this scope"
            description="Complaints are recorded in the 2023 and 2026 workbooks. Switch to All years, 2023, or 2026 to view them."
          />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="glass-bar flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
            <MessageSquareWarning className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-navy-900">
              Complaints received · {data.scopeLabel}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              Complaints have no reliable case reference. Links are tentative and use IIS references, exact
              respondent names, or a labelled partial-name match.
            </p>
          </div>
        </div>
        <span className="pill shrink-0 bg-orange-50 text-orange-700 ring-1 ring-orange-100">
          {formatNumber(summary.total)} complaints
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={MessageSquareWarning}
          label="Complaints received"
          value={formatNumber(summary.total)}
          subtext={`${formatNumber(summary.thisMonth)} this month · ${formatNumber(summary.lastMonth)} last month`}
          tone="violet"
        />
        <KpiCard
          icon={Mail}
          label="Top channel"
          value={topMode?.label ?? '—'}
          subtext={`${formatNumber(topMode?.count ?? 0)} complaints · ${formatPercent(topMode ? topMode.count / summary.total : 0)}`}
          tone="blue"
        />
        <KpiCard
          icon={Link2}
          label="Linked to a case"
          value={formatNumber(summary.linked)}
          subtext={`${formatPercent(linkedPercent)} of complaints · ${formatNumber(summary.unlinked)} unlinked`}
          tone="teal"
        />
        <KpiCard
          icon={CalendarDays}
          label="Current month"
          value={formatNumber(summary.thisMonth)}
          subtext="Complaints received in the snapshot month"
          tone="amber"
        />
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Complaints received by month"
          subtitle={`${data.scopeLabel} · based on the date received in the complaints tab`}
        >
          <div className="h-[240px]">
            {monthly.some((item) => item.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7e8df" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#4f6f63' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    tickFormatter={(value: string) => value.split(' ')[0]}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#7c9a8c' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip valueFormatter={(value) => `${formatNumber(Number(value))} complaints`} />} cursor={{ fill: '#eef8f2' }} />
                  <Bar
                    dataKey="count"
                    name="Complaints"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={34}
                    isAnimationActive={false}
                    onClick={(entry: any) => {
                      const key = entry?.payload?.key ?? entry?.key
                      if (key) {
                        setMonth(key)
                      }
                    }}
                  >
                    {monthly.map((item) => (
                      <Cell key={item.key} cursor="pointer" fill={item.isCurrent ? '#c2410c' : '#ea8a4b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty />
            )}
          </div>
          <ChartNote>
            Click a bar to filter the table to that month.
            {unplottedComplaints
              ? ` ${formatNumber(unplottedComplaints)} complaint${unplottedComplaints === 1 ? '' : 's'} without a usable date ${unplottedComplaints === 1 ? 'is' : 'are'} not plotted.`
              : ''}
          </ChartNote>
        </ChartCard>

        <ChartCard title="Complaint channel" subtitle="Receipt mode recorded in the source.">
          <div className="flex min-h-[240px] flex-col">
            <div className="relative mx-auto h-[160px] w-full max-w-[230px]">
              {summary.modes.length ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.modes}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={48}
                        outerRadius={75}
                        paddingAngle={2}
                        stroke="#fff"
                        strokeWidth={2}
                        isAnimationActive={false}
                        onClick={(entry: any) => {
                          const label = entry?.payload?.label ?? entry?.label
                          if (label) setMode(label)
                        }}
                      >
                        {summary.modes.map((entry, index) => (
                          <Cell
                            key={entry.key}
                            cursor="pointer"
                            fill={MODE_COLORS[entry.label] ?? ['#0f766e', '#c47a12', '#be123c', '#4f6f63'][index % 4]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip valueFormatter={(value) => `${formatNumber(Number(value))} complaints`} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[22px] font-semibold tracking-tight text-navy-900">
                      {formatNumber(summary.total)}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      complaints
                    </span>
                  </div>
                </>
              ) : (
                <ChartEmpty />
              )}
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {summary.modes.map((item, index) => (
                <div key={item.key} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        MODE_COLORS[item.label] ?? ['#0f766e', '#c47a12', '#be123c', '#4f6f63'][index % 4],
                    }}
                  />
                  {item.label}
                  <span className="font-semibold text-slate-700">{formatNumber(item.count)}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </section>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <SectionHeader
            title="Complaint register"
            subtitle="Click a row to expand the complaint narrative and action taken."
          />
          <button type="button" onClick={() => exportComplaints(filtered, data.scope)} className="btn-secondary self-start text-xs sm:self-auto">
            Export CSV
          </button>
        </div>

        <div className="flex flex-col gap-2.5 border-b border-white/50 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subject, complainant, respondent, action…"
              className="input py-1.5 pl-8 text-xs"
            />
          </div>
          <select value={mode} onChange={(event) => setMode(event.target.value)} className="select w-auto py-1.5 text-xs">
            <option value="">All channels</option>
            {modes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={month} onChange={(event) => setMonth(event.target.value)} className="select w-auto py-1.5 text-xs">
            <option value="">All months</option>
            {months.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
          <label className="glass-chip flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-navy-700">
            <input
              type="checkbox"
              checked={linkedOnly}
              onChange={(event) => setLinkedOnly(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Linked only
          </label>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {formatNumber(filtered.length)} shown
          </div>
        </div>

        <div className="table-wrap max-h-[64vh] overflow-auto scrollbar-thin">
          <table className="data-table min-w-[1040px]">
            <thead>
              <tr>
                <th>Date received</th>
                <th>IIS reference</th>
                <th>Linked case</th>
                <th>Channel</th>
                <th>Subject</th>
                <th>Complainant</th>
                <th>Respondent</th>
                <th>Actions taken</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((complaint) => {
                const expanded = expandedId === complaint.id
                return (
                  <Fragment key={complaint.id}>
                    <tr
                      className="cursor-pointer"
                      onClick={() => setExpandedId(expanded ? null : complaint.id)}
                    >
                      <td className="whitespace-nowrap text-xs">{formatDate(complaint.dateIso)}</td>
                      <td className="max-w-[160px] truncate font-mono text-[10px] text-slate-500" title={complaint.iisRef}>
                        {complaint.iisRef || '—'}
                      </td>
                      <td>
                        <LinkedCase caseNo={complaint.linkedCaseNo} caseMap={caseMap} onOpenCase={onOpenCase} />
                      </td>
                      <td>
                        <span
                          className={classNames(
                            'pill',
                            complaint.mode === 'EMAIL'
                              ? 'bg-sky-100/70 text-sky-800 ring-1 ring-white/60'
                              : complaint.mode === 'FB'
                                ? 'bg-lime-100/70 text-lime-900 ring-1 ring-white/60'
                                : 'bg-white/50 text-slate-500 ring-1 ring-white/60',
                          )}
                        >
                          {complaint.mode || 'Not stated'}
                        </span>
                      </td>
                      <td className="max-w-[200px]">
                        <p className="line-clamp-2 text-xs font-medium leading-5 text-slate-800" title={complaint.subject}>
                          {complaint.subject || '—'}
                        </p>
                      </td>
                      <td className="max-w-[120px]">
                        <p className="line-clamp-2 text-[11px] leading-5 text-slate-600" title={complaint.complainant}>
                          {complaint.complainant || '—'}
                        </p>
                      </td>
                      <td className="max-w-[150px]">
                        <p className="line-clamp-2 text-[11px] leading-5 text-slate-600" title={complaint.respondent}>
                          {complaint.respondent || '—'}
                        </p>
                      </td>
                      <td className="max-w-[150px]">
                        <p className="line-clamp-2 text-[11px] leading-5 text-slate-500" title={complaint.actions}>
                          {complaint.actions || '—'}
                        </p>
                      </td>
                      <td>
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-300" />
                        )}
                      </td>
                    </tr>
                    {expanded ? (
                      <tr key={`${complaint.id}-detail`} className="bg-emerald-50/40">
                        <td colSpan={9} className="px-5 py-4">
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Subject of complaint
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-700">{complaint.subject || '—'}</p>
                              <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Complainant
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-700">{complaint.complainant || '—'}</p>
                              <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Respondent
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-700">{complaint.respondent || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Actions taken
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-700">{complaint.actions || '—'}</p>
                              <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Linkage
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-700">
                                {complaint.linkedCaseNo
                                  ? `Linked to ${complaint.linkedCaseNo} via ${complaint.matchBasis}.`
                                  : 'No case link could be established from the available fields.'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-xs text-slate-400">
              No complaints match the current search and filters.
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/50 px-4 py-2.5 text-[10px] leading-4 text-emerald-950/40 sm:px-5">
          Complaint linkage is intentionally conservative. Rows without a reliable case reference remain
          unlinked rather than being forced onto a case.
        </div>
      </div>
    </div>
  )
}
