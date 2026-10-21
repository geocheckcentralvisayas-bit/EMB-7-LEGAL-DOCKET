import { useMemo } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  Clock3,
  FolderSearch,
  Gavel,
  Landmark,
  MessageSquareWarning,
  ReceiptText,
  Scale,
  Users,
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
import type { CaseFilters } from '../lib/metrics'
import {
  getAgingBuckets,
  getCoverageCounts,
  getHandlerCounts,
  getKpis,
  getMonthlyCaseCounts,
  getProvinceCounts,
  getStageCounts,
  getViolationCounts,
} from '../lib/metrics'
import type { CaseRecord, DashboardData, Page, StageKey } from '../lib/types'
import { STAGE_META } from '../lib/types'
import {
  formatCompactMoney,
  formatDate,
  formatNumber,
  formatPercent,
  monthLabel,
  truncate,
} from '../lib/utils'
import { ChartCard, ChartEmpty, ChartLegend, ChartNote, ChartTooltip } from '../components/charts'
import {
  Card,
  FlagChip,
  KpiCard,
  ProgressBar,
  SectionHeader,
  StagePill,
} from '../components/ui'

const PROVINCE_COLORS = ['#0f766e', '#0e7490', '#7c9a8c', '#c47a12', '#4d7c0f', '#9f1239']

export function OverviewPage({
  data,
  onOpenCase,
  onJumpToTracker,
  onNavigate,
}: {
  data: DashboardData
  onOpenCase: (caseRecord: CaseRecord) => void
  onJumpToTracker: (partial: Partial<CaseFilters>) => void
  onNavigate: (page: Page) => void
}) {
  const kpis = useMemo(() => getKpis(data), [data])
  const monthly = useMemo(() => {
    const rows = getMonthlyCaseCounts(data)
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
  }, [data])
  const provinces = useMemo(() => getProvinceCounts(data), [data])
  const stageCounts = useMemo(() => getStageCounts(data), [data])
  const coverage = useMemo(() => getCoverageCounts(data), [data])
  const handlers = useMemo(() => getHandlerCounts(data, 8), [data])
  const violations = useMemo(() => getViolationCounts(data).slice(0, 8), [data])
  const aging = useMemo(() => getAgingBuckets(data), [data])
  const recent = useMemo(
    () =>
      [...data.cases]
        .sort((a, b) => (b.dateIso ?? '').localeCompare(a.dateIso ?? ''))
        .slice(0, 6),
    [data.cases],
  )

  const pabCoverage = kpis.totalCases ? kpis.pabCases / kpis.totalCases : 0
  const totalProvince = provinces.reduce((sum, item) => sum + item.count, 0)
  const yearCounts = useMemo(
    () =>
      data.docketYears.map((year) => ({
        year,
        count: data.cases.filter((caseRecord) => caseRecord.docketYear === year).length,
      })),
    [data.cases, data.docketYears],
  )

  const coverageTarget = (key: string) => {
    if (key === 'nov') onJumpToTracker({})
    else if (key === 'payment') onNavigate('payments')
    else onNavigate('enforcement')
  }

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          icon={FolderSearch}
          label="Total records"
          value={formatNumber(kpis.totalCases)}
          subtext={`${formatNumber(kpis.numberedCases)} numbered + ${formatNumber(kpis.unnumberedCases)} unnumbered`}
          tone="navy"
          onClick={() => onJumpToTracker({})}
          actionLabel="Tracker"
        />
        <KpiCard
          icon={CalendarPlus}
          label="New this month"
          value={formatNumber(kpis.newThisMonth)}
          subtext={`${formatNumber(kpis.newLastMonth)} in the previous month`}
          tone="teal"
          onClick={() => onJumpToTracker({ month: data.dataDate.slice(0, 7) })}
          actionLabel="View month"
        />
        <KpiCard
          icon={Gavel}
          label="PAB NOV coverage"
          value={formatNumber(kpis.pabCases)}
          subtext={`${formatPercent(pabCoverage)} of all records · ${formatNumber(kpis.pabNumberedCases)} numbered + ${formatNumber(kpis.pabUnnumberedCases)} unnumbered`}
          tone="amber"
          onClick={() => onNavigate('enforcement')}
          actionLabel="Pipeline"
        />
        <KpiCard
          icon={ReceiptText}
          label="Collections recorded"
          value={formatCompactMoney(kpis.collectionsAll)}
          subtext={`${formatCompactMoney(kpis.collectionsLinked)} linked to a docket`}
          tone="green"
          onClick={() => onNavigate('payments')}
          actionLabel="Payments"
        />
        <KpiCard
          icon={Clock3}
          label="Pending orders"
          value={formatNumber(kpis.pendingOrdersAll)}
          subtext={`${formatCompactMoney(kpis.pendingOrdersAmountAll)} · ${formatNumber(kpis.pendingOrdersLinked)} linked · rows, not cases`}
          tone="red"
          onClick={() => onNavigate('enforcement')}
          actionLabel="Review"
        />
        <KpiCard
          icon={MessageSquareWarning}
          label="Complaints"
          value={formatNumber(kpis.complaintsTotal)}
          subtext={`${kpis.complaintsThisMonth} this month · ${kpis.complaintsLinked} linked`}
          tone="violet"
          onClick={() => onNavigate('complaints')}
          actionLabel="Complaints"
        />
      </section>

      {data.scope === 'all' && yearCounts.length > 1 ? (
        <div className="glass-bar flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <CalendarDays className="h-3.5 w-3.5 text-brand-600" />
            Year coverage
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {yearCounts.map((item) => (
              <button
                key={item.year}
                type="button"
                onClick={() => onJumpToTracker({})}
                className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/45 px-3 py-1.5 text-left transition hover:bg-white/65"
                title={`${item.count} cases in ${item.year}`}
              >
                <span className="rounded-md bg-brand-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {item.year}
                </span>
                <span className="text-sm font-semibold tabular-nums text-navy-800">
                  {formatNumber(item.count)}
                </span>
                <span className="text-[10px] text-slate-400">cases</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {kpis.dataIssueCount ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50/80 via-white/60 to-white/35 p-4 shadow-glass backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {formatNumber(kpis.dataIssueCount)} data-quality items need review
              </p>
              <p className="mt-0.5 text-xs leading-5 text-amber-800/70">
                Invalid dates, duplicate case numbers, duplicate IIS references, missing fields,
                and unnumbered entries. These are flagged, not silently corrected.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('quality')}
            className="btn-secondary shrink-0 border-amber-200/70 text-amber-900"
          >
            Review data quality
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Cases docketed by month"
          subtitle={`${data.scopeLabel} · invalid or blank dates are excluded`}
          action={
            <button
              type="button"
              onClick={() => onJumpToTracker({})}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </button>
          }
        >
          <div className="h-[252px] w-full">
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
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#7c9a8c' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<ChartTooltip valueFormatter={(value) => `${formatNumber(Number(value))} cases`} />}
                    cursor={{ fill: '#e7f5ee' }}
                  />
                  <Bar
                    dataKey="count"
                    name="Cases docketed"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                    isAnimationActive={false}
                    onClick={(entry: any) => {
                      if (data.scope === 'all') return
                      const key = entry?.payload?.key ?? entry?.key
                      if (key) onJumpToTracker({ month: key })
                    }}
                  >
                    {monthly.map((item) => (
                      <Cell
                        key={item.key}
                        cursor="pointer"
                        fill={item.isCurrent ? '#0f766e' : '#1b6856'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty />
            )}
          </div>
          <ChartNote>
            {formatNumber(monthly.reduce((sum, item) => sum + item.count, 0))} cases with a valid docket
            date · click a bar to open that month in the tracker.
          </ChartNote>
        </ChartCard>

        <ChartCard
          title="Province distribution"
          subtitle="Master register · unknown province shown separately"
          action={
            <button
              type="button"
              onClick={() => onJumpToTracker({})}
              className="text-[11px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Open
            </button>
          }
        >
          <div className="flex h-[252px] flex-col">
            <div className="relative mx-auto h-[176px] w-full max-w-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={provinces}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={54}
                    isAnimationActive={false}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="#fff"
                    strokeWidth={2}
                    onClick={(entry: any) => {
                      const label = entry?.payload?.label ?? entry?.label
                      if (label) onJumpToTracker({ province: label })
                    }}
                  >
                    {provinces.map((entry, index) => (
                      <Cell
                        key={entry.key}
                        cursor="pointer"
                        fill={PROVINCE_COLORS[index % PROVINCE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip valueFormatter={(value) => `${formatNumber(Number(value))} cases`} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[22px] font-semibold tracking-tight text-navy-900">
                  {formatNumber(totalProvince)}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  records
                </span>
              </div>
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {provinces.map((item, index) => (
                <div key={item.key} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: PROVINCE_COLORS[index % PROVINCE_COLORS.length] }}
                  />
                  <span>{item.label}</span>
                  <span className="font-semibold text-slate-700">{formatNumber(item.count)}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Highest linked milestone"
          subtitle="Each case appears once, at its furthest linked stage"
          action={
            <button
              type="button"
              onClick={() => onNavigate('enforcement')}
              className="text-[11px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Pipeline
            </button>
          }
        >
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stageCounts}
                layout="vertical"
                margin={{ top: 2, right: 18, left: 4, bottom: 2 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d7e8df" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#7c9a8c' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={108}
                  tick={{ fontSize: 10, fill: '#4f6f63' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: string) => truncate(value, 18)}
                />
                <Tooltip content={<ChartTooltip valueFormatter={(value) => `${formatNumber(Number(value))} cases`} />} cursor={{ fill: '#eef8f2' }} />
                <Bar
                  dataKey="count"
                  name="Cases"
                  radius={[0, 5, 5, 0]}
                  barSize={18}
                  isAnimationActive={false}
                  onClick={(entry: any) => {
                    const stage = entry?.payload?.stage ?? entry?.stage
                    if (stage) onJumpToTracker({ stage })
                  }}
                >
                  {stageCounts.map((item) => (
                    <Cell key={item.key} cursor="pointer" fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {stageCounts.map((item) => (
              <span key={item.key} className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                {STAGE_META[item.stage as StageKey].short}
                <span className="font-semibold text-slate-700">{formatNumber(item.count)}</span>
              </span>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Case handler workload"
          subtitle="Top handlers by open records in the selected scope"
          action={
            <button
              type="button"
              onClick={() => onJumpToTracker({})}
              className="text-[11px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Filter
            </button>
          }
        >
          <div className="h-[230px]">
            {handlers.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={handlers}
                  layout="vertical"
                  margin={{ top: 2, right: 18, left: 4, bottom: 2 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d7e8df" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#7c9a8c' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={112}
                    tick={{ fontSize: 10, fill: '#4f6f63' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: string) => truncate(value, 19)}
                  />
                  <Tooltip content={<ChartTooltip valueFormatter={(value) => `${formatNumber(Number(value))} cases`} />} cursor={{ fill: '#eef8f2' }} />
                  <Bar
                    dataKey="count"
                    name="Cases"
                    fill="#1b6856"
                    radius={[0, 5, 5, 0]}
                    barSize={16}
                    isAnimationActive={false}
                    onClick={(entry: any) => {
                      const label = entry?.payload?.label ?? entry?.label
                      if (label) onJumpToTracker({ handler: label })
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty />
            )}
          </div>
          <ChartNote>Click a handler to filter the case tracker.</ChartNote>
        </ChartCard>

        <ChartCard
          title="Violation mix"
          subtitle="Cases with each violation flag · multiple flags per case"
          action={
            <button
              type="button"
              onClick={() => onJumpToTracker({})}
              className="text-[11px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Filter
            </button>
          }
        >
          <div className="h-[230px]">
            {violations.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={violations}
                  layout="vertical"
                  margin={{ top: 2, right: 18, left: 4, bottom: 2 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d7e8df" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#7c9a8c' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={112}
                    tick={{ fontSize: 10, fill: '#4f6f63' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: string) => truncate(value, 19)}
                  />
                  <Tooltip content={<ChartTooltip valueFormatter={(value) => `${formatNumber(Number(value))} cases`} />} cursor={{ fill: '#eef8f2' }} />
                  <Bar
                    dataKey="count"
                    name="Cases"
                    fill="#b8891f"
                    radius={[0, 5, 5, 0]}
                    barSize={16}
                    isAnimationActive={false}
                    onClick={(entry: any) => {
                      const label = entry?.payload?.label ?? entry?.label
                      if (label) onJumpToTracker({ flag: label })
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty />
            )}
          </div>
          <ChartNote>Click a violation to filter the tracker.</ChartNote>
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="card-pad xl:col-span-2">
          <SectionHeader
            title="Enforcement coverage"
            subtitle="Non-exclusive counts · a case can appear in more than one stage"
            action={
              <button
                type="button"
                onClick={() => onNavigate('enforcement')}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
              >
                Open pipeline
                <ChevronRight className="h-3 w-3" />
              </button>
            }
          />
          <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-1">
            {coverage.map((item) => {
              const percent = kpis.totalCases ? item.count / kpis.totalCases : 0
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => coverageTarget(item.key)}
                  className="group text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-xs font-medium text-slate-600 group-hover:text-brand-800">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.label}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500 group-hover:text-slate-700">
                      <span className="font-semibold text-slate-800">{formatNumber(item.count)}</span>{' '}
                      <span className="text-slate-400">/ {formatNumber(kpis.totalCases)}</span>
                      <span className="ml-2 text-[10px] font-semibold text-slate-400">
                        {formatPercent(percent)}
                      </span>
                    </span>
                  </div>
                  <ProgressBar value={item.count} max={kpis.totalCases} color={item.color} className="mt-2" />
                </button>
              )
            })}
          </div>
        </Card>

        <Card className="card-pad">
          <SectionHeader
            title="Case age profile"
            subtitle="Days since docketing as of the snapshot date"
          />
          <div className="mt-4 h-[225px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aging} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7e8df" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: '#4f6f63' }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#7c9a8c' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip valueFormatter={(value) => `${formatNumber(Number(value))} cases`} />} cursor={{ fill: '#eef8f2' }} />
                <Bar dataKey="count" name="Cases" radius={[5, 5, 0, 0]} maxBarSize={38} isAnimationActive={false}>
                  {aging.map((item, index) => (
                    <Cell
                      key={item.key}
                      fill={['#0f766e', '#1b6856', '#c47a12', '#a16207', '#9a3412'][index]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ChartNote>
            Invalid dates ({formatNumber(data.dataIssues.invalidDates.length)}) are excluded from
            this profile.
          </ChartNote>
        </Card>
      </section>

      <Card>
        <div className="flex flex-col gap-3 border-b border-white/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <SectionHeader
            title="Recently docketed cases"
            subtitle="Newest records in the selected scope"
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => onJumpToTracker({})}
            className="btn-secondary self-start text-xs sm:self-auto"
          >
            Open tracker
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Case no.</th>
                <th>Establishment</th>
                <th>Location</th>
                <th>Stage</th>
                <th>Docketed</th>
                <th>Flags</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {recent.map((caseRecord) => (
                <tr
                  key={caseRecord.id}
                  className="cursor-pointer"
                  onClick={() => onOpenCase(caseRecord)}
                >
                  <td className="whitespace-nowrap font-mono text-[11px] font-semibold text-navy-700">
                    {caseRecord.displayCaseNo}
                    <span className="ml-1.5 rounded bg-white/60 px-1 py-0.5 text-[9px] font-bold text-slate-500 ring-1 ring-white/70">
                      {caseRecord.docketYear ?? caseRecord.sourceYear}
                    </span>
                  </td>
                  <td className="min-w-[220px]">
                    <p className="line-clamp-2 text-[13px] font-medium text-slate-800">
                      {caseRecord.establishment}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{caseRecord.documentType || '—'}</p>
                  </td>
                  <td className="whitespace-nowrap text-xs">
                    {[caseRecord.city || caseRecord.location, caseRecord.province]
                      .filter(Boolean)
                      .filter((value, index, all) => all.indexOf(value) === index)
                      .join(', ') || 'Not recorded'}
                  </td>
                  <td>
                    <StagePill stage={caseRecord.stage} />
                  </td>
                  <td className="whitespace-nowrap text-xs">{formatDate(caseRecord.dateIso)}</td>
                  <td>
                    <div className="flex max-w-[220px] flex-wrap gap-1">
                      {caseRecord.flags.slice(0, 2).map((flag) => (
                        <FlagChip key={flag} flag={flag} />
                      ))}
                      {caseRecord.flags.length > 2 ? (
                        <span className="pill bg-white/50 text-slate-500 ring-1 ring-white/60">
                          +{caseRecord.flags.length - 2}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="card-pad">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            <Landmark className="h-3.5 w-3.5" />
            Master register
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-navy-900">
            {formatNumber(kpis.totalCases)}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {formatNumber(kpis.numberedCases)} numbered cases plus one unnumbered entry flagged for review.
          </p>
        </Card>
        <Card className="card-pad">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            <Users className="h-3.5 w-3.5" />
            Enforcement linkage
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-navy-900">
            {formatNumber(kpis.pabCases)}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Cases with a linked PAB NOV · {formatNumber(kpis.orderCases)} with an order and{' '}
            {formatNumber(kpis.pabOrderCases)} with a PAB order.
          </p>
        </Card>
        <Card className="card-pad">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            <Scale className="h-3.5 w-3.5" />
            Payment footprint
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-navy-900">
            {formatNumber(kpis.paidCases)}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Cases with a paid payment record · {formatCompactMoney(kpis.collectionsAll)} across all tabs.
          </p>
        </Card>
      </div>
    </div>
  )
}
