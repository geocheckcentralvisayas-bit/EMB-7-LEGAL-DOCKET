import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Gavel,
  Layers3,
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
import {
  getEnforcementSummary,
  getKpis,
  getMonthlyRecordCounts,
} from '../lib/metrics'
import {
  exportOrders,
  exportPabNov,
  exportPabOrders,
} from '../lib/export'
import {
  classNames,
  formatCompactMoney,
  formatDate,
  formatMoney,
  formatNumber,
  monthLabel,
  pabAwLabel,
  truncate,
} from '../lib/utils'
import { ChartCard, ChartEmpty, ChartLegend, ChartNote, ChartTooltip } from '../components/charts'
import { KpiCard, RecordStatusPill, SectionHeader } from '../components/ui'

type EnforcementTab = 'pabNov' | 'orders' | 'pabOrders' | 'unlinked'

const AW_COLORS: Record<string, string> = {
  W: '#c47a12',
  A: '#0e7490',
  'A/W': '#4d7c0f',
  'Not coded': '#7c9a8c',
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
      onClick={() => onOpenCase(caseRecord)}
      className="whitespace-nowrap font-mono text-[10px] font-semibold text-brand-700 underline-offset-2 hover:underline"
    >
      {caseRecord.displayCaseNo}
    </button>
  )
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="input py-1.5 pl-8 text-xs"
      />
    </div>
  )
}

export function EnforcementPage({
  data,
  onOpenCase,
}: {
  data: DashboardData
  onOpenCase: (caseRecord: CaseRecord) => void
}) {
  const [activeTab, setActiveTab] = useState<EnforcementTab>('pabNov')
  const [search, setSearch] = useState('')

  const summary = useMemo(() => getEnforcementSummary(data), [data])
  const kpis = useMemo(() => getKpis(data), [data])
  const caseMap = useMemo(
    () => new Map(data.cases.map((caseRecord) => [caseRecord.caseNo, caseRecord])),
    [data.cases],
  )

  const pabNovRows = data.pabNov
  const orderRows = data.orders
  const pabOrderRows = data.pabOrders

  const duplicateOrderRows = useMemo(() => {
    const seen = new Set<string>()
    let duplicates = 0
    for (const record of data.orders) {
      const key = [
        record.company,
        record.caseNo,
        record.date,
        record.documentType,
        record.violation,
        record.status,
        record.amount,
      ].join('|')
      if (seen.has(key)) {
        duplicates += 1
      } else {
        seen.add(key)
      }
    }
    return duplicates
  }, [data.orders])

  const awCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const record of pabNovRows) {
      const code = record.aw || 'Not coded'
      map.set(code, (map.get(code) ?? 0) + 1)
    }
    return [...map.entries()]
      .map(([code, count]) => ({
        key: code,
        label: pabAwLabel(code),
        count,
        color: AW_COLORS[code] ?? '#7c9a8c',
      }))
      .sort((a, b) => b.count - a.count)
  }, [pabNovRows])

  const orderStatus = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>()
    for (const record of orderRows) {
      const label = record.status || 'No status'
      const current = map.get(label) ?? { count: 0, amount: 0 }
      current.count += 1
      current.amount += record.amount
      map.set(label, current)
    }
    return [...map.entries()]
      .map(([label, values]) => ({ label, ...values }))
      .sort((a, b) => b.count - a.count)
  }, [orderRows])

  const monthly = useMemo(() => {
    const pab = getMonthlyRecordCounts(pabNovRows, data.dataDate, data.timelineStart)
    const orders = getMonthlyRecordCounts(orderRows, data.dataDate, data.timelineStart)
    const rows = pab.map((item, index) => ({
      key: item.key,
      label: item.label,
      pabNov: item.count,
      orders: orders[index]?.count ?? 0,
    }))
    if (data.scope !== 'all') return rows
    const pabTotals = new Map<string, number>()
    const orderTotals = new Map<string, number>()
    for (const row of rows) {
      const month = row.key.slice(5, 7)
      pabTotals.set(month, (pabTotals.get(month) ?? 0) + row.pabNov)
      orderTotals.set(month, (orderTotals.get(month) ?? 0) + row.orders)
    }
    return Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, '0')
      return {
        key: `all-${month}`,
        label: monthLabel(`2000-${month}`).split(' ')[0],
        pabNov: pabTotals.get(month) ?? 0,
        orders: orderTotals.get(month) ?? 0,
      }
    })
  }, [pabNovRows, orderRows, data.dataDate, data.timelineStart, data.scope])

  const pabDated = monthly.reduce((sum, item) => sum + item.pabNov, 0)
  const orderDated = monthly.reduce((sum, item) => sum + item.orders, 0)
  const pabOmitted = pabNovRows.length - pabDated
  const orderOmitted = orderRows.length - orderDated

  const unlinkedRows = useMemo(() => {
    const rows: {
      type: string
      reference: string
      name: string
      date: string | null
      status: string
      amount: number
    }[] = []
    for (const record of data.dataIssues.unlinked.pabNov) {
      rows.push({
        type: 'PAB NOV',
        reference: record.pabCaseNo,
        name: record.establishment,
        date: record.dateIso,
        status: record.aw ? pabAwLabel(record.aw) : 'PAB notice',
        amount: 0,
      })
    }
    for (const record of data.dataIssues.unlinked.orders) {
      rows.push({
        type: 'Order / resolution',
        reference: record.caseNo || record.iisRef,
        name: record.company,
        date: record.dateIso,
        status: record.status || 'No status',
        amount: record.amount,
      })
    }
    for (const record of data.dataIssues.unlinked.pabOrders) {
      rows.push({
        type: 'PAB order',
        reference: record.pabCaseNo,
        name: record.company,
        date: record.dateIso,
        status: record.status || 'No status',
        amount: record.amount,
      })
    }
    return rows.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  }, [data.dataIssues.unlinked])

  const unlinkedCount =
    data.dataIssues.unlinked.pabNov.length +
    data.dataIssues.unlinked.orders.length +
    data.dataIssues.unlinked.pabOrders.length

  const filteredPabNov = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return pabNovRows
    return pabNovRows.filter((record) =>
      [record.pabCaseNo, record.iisRef, record.establishment, record.proponent, record.documentType, record.linkedCaseNo, record.violations.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [pabNovRows, search])

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return orderRows
    return orderRows.filter((record) =>
      [record.company, record.caseNo, record.iisRef, record.documentType, record.violation, record.status, record.linkedCaseNo]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [orderRows, search])

  const filteredPabOrders = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return pabOrderRows
    return pabOrderRows.filter((record) =>
      [record.company, record.pabCaseNo, record.iisRef, record.documentType, record.violation, record.status, record.linkedCaseNo]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [pabOrderRows, search])

  const filteredUnlinked = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return unlinkedRows
    return unlinkedRows.filter((record) =>
      [record.type, record.reference, record.name, record.status].join(' ').toLowerCase().includes(query),
    )
  }, [unlinkedRows, search])

  const tabs: { key: EnforcementTab; label: string; count: number }[] = [
    { key: 'pabNov', label: 'PAB NOV', count: pabNovRows.length },
    { key: 'orders', label: 'Orders / resolutions', count: orderRows.length },
    { key: 'pabOrders', label: 'PAB orders', count: pabOrderRows.length },
    { key: 'unlinked', label: 'Unlinked records', count: unlinkedCount },
  ]

  const searchPlaceholders: Record<EnforcementTab, string> = {
    pabNov: 'Search PAB NOV records…',
    orders: 'Search orders / resolutions…',
    pabOrders: 'Search PAB orders…',
    unlinked: 'Search unlinked records…',
  }

  const activeRows =
    activeTab === 'pabNov'
      ? filteredPabNov.length
      : activeTab === 'orders'
        ? filteredOrders.length
        : activeTab === 'pabOrders'
          ? filteredPabOrders.length
          : filteredUnlinked.length

  const exportActive = () => {
    if (activeTab === 'pabNov') exportPabNov(filteredPabNov, data.scope)
    else if (activeTab === 'orders') exportOrders(filteredOrders, data.scope)
    else if (activeTab === 'pabOrders') exportPabOrders(filteredPabOrders, data.scope)
  }

  return (
    <div className="space-y-4">
      <div className="glass-bar flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Layers3 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-navy-900">Enforcement register scope</p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              {data.scopeLabel}: all PAB notices, orders, resolutions, and unlinked references in
              this scope. Records linked to a docket follow the docket year.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          <span className="rounded-lg bg-white/55 px-2.5 py-1.5 ring-1 ring-white/70">
            {formatNumber(summary.pabNovTotal)} PAB notices
          </span>
          <span className="rounded-lg bg-white/55 px-2.5 py-1.5 ring-1 ring-white/70">
            {formatNumber(summary.orderTotal)} orders
          </span>
          <span className="rounded-lg bg-white/55 px-2.5 py-1.5 ring-1 ring-white/70">
            {formatNumber(summary.pabOrderTotal)} PAB orders
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Gavel}
          label="PAB NOV records"
          value={formatNumber(summary.pabNovTotal)}
          subtext={`${formatNumber(summary.pabNovTotal - summary.pabNovUnlinked)} linked · ${formatNumber(summary.pabNovUnlinked)} unlinked`}
          tone="amber"
        />
        <KpiCard
          icon={FileText}
          label="Orders / resolutions"
          value={formatNumber(summary.orderTotal)}
          subtext={`${formatNumber(summary.orderTotal - summary.orderUnlinked)} linked · ${formatNumber(summary.orderUnlinked)} unlinked · ${formatNumber(kpis.orderCases)} cases`}
          tone="blue"
        />
        <KpiCard
          icon={Gavel}
          label="PAB orders"
          value={formatNumber(summary.pabOrderTotal)}
          subtext={`${formatNumber(summary.pabOrderTotal - summary.pabOrderUnlinked)} linked · ${formatCompactMoney(summary.pabPenaltyAssessedAll)} assessed`}
          tone="violet"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Pending orders"
          value={formatNumber(summary.pendingOrdersAll)}
          subtext={`${formatCompactMoney(summary.pendingOrdersAmountAll)} · ${formatNumber(kpis.pendingOrdersLinked)} linked · rows, not cases`}
          tone="red"
        />
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Monthly enforcement activity"
          subtitle={`${data.scopeLabel} · PAB notices and orders dated in the selected scope`}
        >
          <div className="h-[250px]">
            {monthly.some((item) => item.pabNov || item.orders) ? (
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
                  <Tooltip content={<ChartTooltip valueFormatter={(value) => `${formatNumber(Number(value))} records`} />} cursor={{ fill: '#eef8f2' }} />
                  <Bar dataKey="pabNov" name="PAB NOV" fill="#c47a12" radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                  <Bar dataKey="orders" name="Orders / resolutions" fill="#0e7490" radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty />
            )}
          </div>
          <ChartLegend
            className="mt-2"
            items={[
              { label: 'PAB NOV', color: '#c47a12', value: formatNumber(pabDated) },
              { label: 'Orders / resolutions', color: '#0e7490', value: formatNumber(orderDated) },
            ]}
          />
          <ChartNote>
            {pabOmitted || orderOmitted
              ? `${formatNumber(pabOmitted)} PAB notices and ${formatNumber(orderOmitted)} orders have no usable date and are not plotted. `
              : ''}
            Register totals: {formatNumber(pabNovRows.length)} PAB notices and {formatNumber(orderRows.length)} orders.
          </ChartNote>
        </ChartCard>

        <ChartCard
          title="PAB NOV decision coding"
          subtitle="Preserved exactly as recorded in the source"
        >
          <div className="flex h-[250px] flex-col">
            <div className="relative mx-auto h-[172px] w-full max-w-[240px]">
              {awCounts.length ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={awCounts}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="#fff"
                        strokeWidth={2}
                        isAnimationActive={false}
                      >
                        {awCounts.map((entry) => (
                          <Cell key={entry.label} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip valueFormatter={(value) => `${formatNumber(Number(value))} notices`} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[22px] font-semibold tracking-tight text-navy-900">
                      {formatNumber(pabNovRows.length)}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      notices
                    </span>
                  </div>
                </>
              ) : (
                <ChartEmpty />
              )}
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {awCounts.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                  <span className="font-semibold text-slate-700">{formatNumber(item.count)}</span>
                </div>
              ))}
            </div>
          </div>
          <ChartNote>
            A/W codes are kept as recorded. No inference is made about whether a case is “with” or
            “without” a permit.
          </ChartNote>
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <ChartCard
            className="xl:col-span-2"
            title="Order status distribution"
            subtitle={`All order rows in ${data.scopeLabel} · row counts, not distinct cases`}
          >
          <div className="h-[225px]">
            {orderStatus.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderStatus} layout="vertical" margin={{ top: 2, right: 18, left: 4, bottom: 2 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d7e8df" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#7c9a8c' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={150}
                    tick={{ fontSize: 10, fill: '#4f6f63' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: string) => truncate(value, 24)}
                  />
                  <Tooltip content={<ChartTooltip valueFormatter={(value) => `${formatNumber(Number(value))} orders`} />} cursor={{ fill: '#eef8f2' }} />
                  <Bar dataKey="count" name="Orders" radius={[0, 5, 5, 0]} barSize={18} isAnimationActive={false}>
                    {orderStatus.map((item) => (
                      <Cell
                        key={item.label}
                        fill={
                          item.label.includes('PENDING')
                            ? '#c47a12'
                            : item.label.includes('SET ASIDE')
                              ? '#4d7c0f'
                              : item.label.includes('DENIED')
                                ? '#be123c'
                                : item.label.includes('PAID')
                                  ? '#15803d'
                                  : '#1b6856'
                        }
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
            Counts are register rows, not distinct cases. A single case can carry several pending order
            rows.
          </ChartNote>
        </ChartCard>

        <div className="card card-pad">
          <SectionHeader
            title="Unlinked register"
            subtitle="Records that could not be tied to a case in the selected scope"
            action={
              <button
                type="button"
                onClick={() => setActiveTab('unlinked')}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
              >
                View
                <ArrowRight className="h-3 w-3" />
              </button>
            }
          />
          <div className="mt-4 space-y-3">
            {[
              { label: 'PAB NOV', value: summary.pabNovUnlinked, color: '#c47a12' },
              { label: 'Orders / resolutions', value: summary.orderUnlinked, color: '#0e7490' },
              { label: 'PAB orders', value: summary.pabOrderUnlinked, color: '#4d7c0f' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-800">{formatNumber(item.value)}</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/40 ring-1 ring-white/50">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (item.value / Math.max(1, unlinkedCount)) * 100)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
            <p className="rounded-xl bg-white/40 px-3 py-2.5 text-[11px] leading-5 text-emerald-950/55 ring-1 ring-white/60 backdrop-blur-sm">
              Unlinked rows usually belong to prior-year cases or use an IIS reference that is not
              present in the selected scope. They are kept visible rather than discarded.
            </p>
          </div>
        </div>
      </section>

      <div className="card overflow-hidden">
        <div className="border-b border-white/50 px-4 pt-3 sm:px-5">
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key)
                  setSearch('')
                }}
                className={classNames(
                  'relative flex shrink-0 items-center gap-1.5 px-3 py-3 text-xs font-semibold transition',
                  activeTab === tab.key
                    ? 'text-navy-900'
                    : 'text-emerald-900/45 hover:text-navy-700',
                )}
              >
                {tab.label}
                <span
                  className={classNames(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                    activeTab === tab.key ? 'bg-emerald-100/70 text-navy-800' : 'bg-white/50 text-slate-500',
                  )}
                >
                  {formatNumber(tab.count)}
                </span>
                {activeTab === tab.key ? (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t-full bg-brand-500" />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-white/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <span>
              <span className="font-semibold text-slate-700">{formatNumber(activeRows)}</span> rows shown
            </span>
            <span className="text-slate-300">·</span>
            <span>{data.scopeLabel}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder={searchPlaceholders[activeTab]}
            />
            {activeTab !== 'unlinked' ? (
              <button type="button" onClick={exportActive} className="btn-secondary whitespace-nowrap text-xs">
                Export CSV
              </button>
            ) : null}
          </div>
        </div>

        <div className="border-b border-amber-100 bg-amber-50/60 px-4 py-2.5 text-[11px] leading-5 text-amber-900/80 sm:px-5">
          <span className="font-semibold text-amber-900">Counting notes.</span> Status and pending
          figures count register rows, not distinct cases; one case can carry several pending orders.
          {duplicateOrderRows
            ? ` ${formatNumber(duplicateOrderRows)} order rows duplicate an earlier row exactly (same company, case, date, document, violation, status, and amount) and are preserved as separate rows so totals stay traceable to the sheet.`
            : ' Duplicate order rows are preserved as separate rows so totals stay traceable to the sheet.'}
        </div>

        <div className="table-wrap max-h-[62vh] overflow-auto scrollbar-thin">
          {activeTab === 'pabNov' ? (
            <table className="data-table min-w-[1040px]">
              <thead>
                <tr>
                  <th>PAB case no.</th>
                  <th>A/W</th>
                  <th>IIS reference</th>
                  <th>Date docketed</th>
                  <th>Establishment</th>
                  <th>Location</th>
                  <th>Document</th>
                  <th>Violations</th>
                  <th>Linked case</th>
                </tr>
              </thead>
              <tbody>
                {filteredPabNov.map((record) => (
                  <tr key={record.id}>
                    <td className="whitespace-nowrap font-mono text-[11px] font-semibold text-amber-700">
                      {record.pabCaseNo}
                      <span className="ml-1.5 rounded bg-white/60 px-1 py-0.5 text-[9px] font-bold text-slate-500 ring-1 ring-white/70">
                        {record.docketYear ?? record.sourceYear}
                      </span>
                    </td>
                    <td>
                      <span
                        className={classNames(
                          'pill',
                          record.aw === 'W'
                            ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                            : record.aw === 'A'
                              ? 'bg-sky-100/70 text-sky-800 ring-1 ring-white/60'
                              : record.aw === 'A/W'
                                ? 'bg-lime-100/70 text-lime-900 ring-1 ring-white/60'
                                : 'bg-white/50 text-slate-500 ring-1 ring-white/60',
                        )}
                      >
                        {pabAwLabel(record.aw)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap font-mono text-[10px] text-slate-500">{record.iisRef}</td>
                    <td className="whitespace-nowrap text-xs">{formatDate(record.dateIso)}</td>
                    <td className="min-w-[200px] max-w-[260px]">
                      <p className="line-clamp-2 text-xs font-medium text-slate-800">{record.establishment}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{record.proponent || '—'}</p>
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {[record.city || record.municipality, record.province].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="max-w-[130px] text-xs text-slate-600">{record.documentType || '-'}</td>
                    <td className="max-w-[190px]">
                      <p className="line-clamp-2 text-[11px] leading-5 text-slate-500" title={record.violations.join('; ')}>
                        {record.violations.join(' · ') || '—'}
                      </p>
                    </td>
                    <td>
                      <LinkedCase caseNo={record.linkedCaseNo} caseMap={caseMap} onOpenCase={onOpenCase} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {activeTab === 'orders' ? (
            <table className="data-table min-w-[1040px]">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Case no.</th>
                  <th>IIS reference</th>
                  <th>Action date</th>
                  <th>Document</th>
                  <th>Violation</th>
                  <th>Status</th>
                  <th className="text-right">Amount</th>
                  <th>Linked case</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((record) => (
                  <tr key={record.id}>
                    <td className="min-w-[180px] max-w-[240px]">
                      <p className="line-clamp-2 text-xs font-medium text-slate-800">{record.company}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {[record.city || record.municipality, record.province].filter(Boolean).join(', ') || '—'}
                      </p>
                    </td>
                    <td className="whitespace-nowrap font-mono text-[10px] text-slate-500">
                      {record.caseNo || '—'}
                      <span className="ml-1.5 rounded bg-white/60 px-1 py-0.5 text-[8px] font-bold text-slate-400 ring-1 ring-white/70">
                        {record.docketYear ?? record.sourceYear}
                      </span>
                    </td>
                    <td className="whitespace-nowrap font-mono text-[10px] text-slate-500">{record.iisRef || '—'}</td>
                    <td className="whitespace-nowrap text-xs">{formatDate(record.dateIso)}</td>
                    <td className="max-w-[140px] text-xs text-slate-600">{record.documentType || '-'}</td>
                    <td className="max-w-[180px]">
                      <p className="line-clamp-2 text-[11px] leading-5 text-slate-500" title={record.violation}>
                        {record.violation || '—'}
                      </p>
                    </td>
                    <td>
                      <RecordStatusPill status={record.status} />
                    </td>
                    <td className="whitespace-nowrap text-right text-xs font-semibold tabular-nums text-slate-700">
                      {record.amount ? formatMoney(record.amount) : '—'}
                    </td>
                    <td>
                      <LinkedCase caseNo={record.linkedCaseNo} caseMap={caseMap} onOpenCase={onOpenCase} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {activeTab === 'pabOrders' ? (
            <table className="data-table min-w-[1040px]">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>PAB case no.</th>
                  <th>IIS reference</th>
                  <th>Date issued</th>
                  <th>Document</th>
                  <th>Violation</th>
                  <th>Status</th>
                  <th className="text-right">Amount</th>
                  <th>Linked case</th>
                </tr>
              </thead>
              <tbody>
                {filteredPabOrders.map((record) => (
                  <tr key={record.id}>
                    <td className="min-w-[200px] max-w-[260px]">
                      <p className="line-clamp-2 text-xs font-medium text-slate-800">{record.company}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {[record.city || record.municipality, record.province].filter(Boolean).join(', ') || '—'}
                      </p>
                    </td>
                    <td className="whitespace-nowrap font-mono text-[10px] font-semibold text-lime-900">
                      {record.pabCaseNo || '—'}
                      <span className="ml-1.5 rounded bg-white/60 px-1 py-0.5 text-[8px] font-bold text-slate-400 ring-1 ring-white/70">
                        {record.docketYear ?? record.sourceYear}
                      </span>
                    </td>
                    <td className="whitespace-nowrap font-mono text-[10px] text-slate-500">{record.iisRef || '—'}</td>
                    <td className="whitespace-nowrap text-xs">{formatDate(record.dateIso)}</td>
                    <td className="max-w-[140px] text-xs text-slate-600">{record.documentType || '—'}</td>
                    <td className="max-w-[180px]">
                      <p className="line-clamp-2 text-[11px] leading-5 text-slate-500" title={record.violation}>
                        {record.violation || '—'}
                      </p>
                    </td>
                    <td>
                      <RecordStatusPill status={record.status} />
                    </td>
                    <td className="whitespace-nowrap text-right text-xs font-semibold tabular-nums text-slate-700">
                      {record.amount ? formatMoney(record.amount) : '—'}
                    </td>
                    <td>
                      <LinkedCase caseNo={record.linkedCaseNo} caseMap={caseMap} onOpenCase={onOpenCase} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {activeTab === 'unlinked' ? (
            <table className="data-table min-w-[860px]">
              <thead>
                <tr>
                  <th>Record type</th>
                  <th>Reference</th>
                  <th>Company / establishment</th>
                  <th>Date</th>
                  <th>Status / coding</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnlinked.map((record, index) => (
                  <tr key={`${record.type}-${record.reference}-${index}`}>
                    <td className="whitespace-nowrap text-xs font-medium text-slate-700">{record.type}</td>
                    <td className="whitespace-nowrap font-mono text-[10px] text-slate-500">{record.reference || '—'}</td>
                    <td className="min-w-[200px] text-xs text-slate-700">{record.name || '-'}</td>
                    <td className="whitespace-nowrap text-xs">{formatDate(record.date)}</td>
                    <td className="text-xs text-slate-600">{record.status || '—'}</td>
                    <td className="whitespace-nowrap text-right text-xs font-semibold tabular-nums text-slate-700">
                      {record.amount ? formatMoney(record.amount) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {activeRows === 0 ? (
            <div className="px-5 py-12 text-center text-xs text-slate-400">
              No records match the current scope and search.
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/50 px-4 py-2.5 text-[10px] leading-4 text-emerald-950/40 sm:px-5">
          {activeTab === 'unlinked'
            ? 'Unlinked records include references that do not match a case in the selected scope.'
            : 'Rows are linked by IIS reference, case number, or PAB docket. PAB orders and penalties use the PAB docket → IIS chain.'}
        </div>
      </div>
    </div>
  )
}
