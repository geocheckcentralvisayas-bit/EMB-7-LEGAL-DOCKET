import { useMemo, useState } from 'react'
import {
  Banknote,
  CircleDollarSign,
  ReceiptText,
  Search,
  SlidersHorizontal,
  Wallet,
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
  getKpis,
  getMonthlyCollections,
  getPaymentSummary,
} from '../lib/metrics'
import {
  exportErf,
  exportPabPenalties,
  exportRa6969,
} from '../lib/export'
import {
  classNames,
  formatCompactMoney,
  formatDate,
  formatMoney,
  formatNumber,
  monthLabel,
  isPaid,
  isPending,
} from '../lib/utils'
import { ChartCard, ChartEmpty, ChartLegend, ChartNote, ChartTooltip } from '../components/charts'
import { KpiCard, RecordStatusPill, SectionHeader } from '../components/ui'

type PaymentTab = 'erf' | 'pab' | 'ra6969'

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

export function PaymentsPage({
  data,
  onOpenCase,
}: {
  data: DashboardData
  onOpenCase: (caseRecord: CaseRecord) => void
}) {
  const [activeTab, setActiveTab] = useState<PaymentTab>('erf')
  const [search, setSearch] = useState('')

  const kpis = useMemo(() => getKpis(data), [data])
  const paymentSummary = useMemo(() => getPaymentSummary(data), [data])
  const monthly = useMemo(() => {
    const rows = getMonthlyCollections(data, false)
    if (data.scope !== 'all') return rows
    const totals = new Map<string, { erf: number; pab: number; ra6969: number; total: number }>()
    for (const row of rows) {
      const month = row.key.slice(5, 7)
      const current = totals.get(month) ?? { erf: 0, pab: 0, ra6969: 0, total: 0 }
      current.erf += row.erf
      current.pab += row.pab
      current.ra6969 += row.ra6969
      current.total += row.total
      totals.set(month, current)
    }
    return Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, '0')
      const total = totals.get(month) ?? { erf: 0, pab: 0, ra6969: 0, total: 0 }
      return {
        key: `all-${month}`,
        label: monthLabel(`2000-${month}`).split(' ')[0],
        erf: total.erf,
        pab: total.pab,
        ra6969: total.ra6969,
        total: total.total,
      }
    })
  }, [data])
  const caseMap = useMemo(
    () => new Map(data.cases.map((caseRecord) => [caseRecord.caseNo, caseRecord])),
    [data.cases],
  )

  const erfRows = data.erf
  const pabRows = data.pabPenalties
  const raRows = data.ra6969

  const query = search.trim().toLowerCase()
  const filteredErf = useMemo(
    () =>
      !query
        ? erfRows
        : erfRows.filter((record) =>
            [record.company, record.caseNo, record.orNumber, record.status, record.linkedCaseNo]
              .join(' ')
              .toLowerCase()
              .includes(query),
          ),
    [erfRows, query],
  )
  const filteredPab = useMemo(
    () =>
      !query
        ? pabRows
        : pabRows.filter((record) =>
            [record.company, record.pabCaseNo, record.orNumber, record.status, record.subtype, record.linkedCaseNo]
              .join(' ')
              .toLowerCase()
              .includes(query),
          ),
    [pabRows, query],
  )
  const filteredRa = useMemo(
    () =>
      !query
        ? raRows
        : raRows.filter((record) =>
            [record.company, record.caseNo, record.orNumber, record.status, record.subtype, record.linkedCaseNo]
              .join(' ')
              .toLowerCase()
              .includes(query),
          ),
    [raRows, query],
  )

  const statusData = useMemo(() => {
    const rows = activeTab === 'erf' ? erfRows : activeTab === 'pab' ? pabRows : raRows
    return [
      { label: 'Paid', count: rows.filter((record) => isPaid(record.status)).length, color: '#15803d' },
      { label: 'Pending', count: rows.filter((record) => isPending(record.status)).length, color: '#c47a12' },
      { label: 'No status', count: rows.filter((record) => !record.status).length, color: '#7c9a8c' },
    ].filter((item) => item.count > 0)
  }, [activeTab, erfRows, pabRows, raRows])

  const activeRows =
    activeTab === 'erf' ? filteredErf.length : activeTab === 'pab' ? filteredPab.length : filteredRa.length
  const activeRowsAll = activeTab === 'erf' ? erfRows.length : activeTab === 'pab' ? pabRows.length : raRows.length
  const activePaid = (activeTab === 'erf' ? erfRows : activeTab === 'pab' ? pabRows : raRows).filter((record) =>
    isPaid(record.status),
  ).length
  const activePending = (activeTab === 'erf' ? erfRows : activeTab === 'pab' ? pabRows : raRows).filter((record) =>
    isPending(record.status),
  ).length
  const activeNoStatus = (activeTab === 'erf' ? erfRows : activeTab === 'pab' ? pabRows : raRows).filter(
    (record) => !record.status,
  ).length

  const erf = paymentSummary.find((item) => item.key === 'erf')!
  const pab = paymentSummary.find((item) => item.key === 'pab')!
  const ra = paymentSummary.find((item) => item.key === 'ra6969')!

  const tabs: { key: PaymentTab; label: string; count: number }[] = [
    { key: 'erf', label: 'ERF — PD 1586', count: erfRows.length },
    { key: 'pab', label: 'PAB penalty', count: pabRows.length },
    { key: 'ra6969', label: 'RA 6969 penalty', count: raRows.length },
  ]

  const exportActive = () => {
    if (activeTab === 'erf') exportErf(filteredErf, data.scope)
    else if (activeTab === 'pab') exportPabPenalties(filteredPab, data.scope)
    else exportRa6969(filteredRa, data.scope)
  }

  const totalPaid = kpis.collectionsAll
  const totalPendingAmount = kpis.pendingPaymentsAmountAll
  const totalPendingRows = kpis.pendingPaymentsAll

  return (
    <div className="space-y-4">
      <div className="glass-bar flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-navy-900">Payment register scope</p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              {data.scopeLabel}: all ERF, PAB penalty, and RA 6969 payment rows in this scope.
              Linked rows follow the docket year; unlinked rows follow their source year.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          <span className="rounded-lg bg-white/55 px-2.5 py-1.5 ring-1 ring-white/70">
            {formatNumber(erfRows.length)} ERF
          </span>
          <span className="rounded-lg bg-white/55 px-2.5 py-1.5 ring-1 ring-white/70">
            {formatNumber(pabRows.length)} PAB
          </span>
          <span className="rounded-lg bg-white/55 px-2.5 py-1.5 ring-1 ring-white/70">
            {formatNumber(raRows.length)} RA 6969
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={CircleDollarSign}
          label="Collections"
          value={formatCompactMoney(totalPaid)}
          subtext="Paid rows only, within the selected scope"
          tone="green"
        />
        <KpiCard
          icon={Banknote}
          label="ERF — PD 1586"
          value={formatCompactMoney(erf.paidAmount)}
          subtext={`${formatNumber(erf.paidRows)} paid · ${formatNumber(erf.pendingRows)} pending · ${formatNumber(erf.noStatusRows)} no status`}
          tone="teal"
        />
        <KpiCard
          icon={ReceiptText}
          label="PAB penalties"
          value={formatCompactMoney(pab.paidAmount)}
          subtext={`${formatNumber(pab.paidRows)} paid · ${formatNumber(pab.pendingRows)} pending · ${formatNumber(pab.noStatusRows)} no status`}
          tone="violet"
        />
        <KpiCard
          icon={ReceiptText}
          label="Pending payments"
          value={formatCompactMoney(totalPendingAmount)}
          subtext={`${formatNumber(totalPendingRows)} rows with PENDING status · row count, not cases`}
          tone="amber"
        />
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Monthly collections"
          subtitle={`${data.scopeLabel} · paid amounts by payment date`}
        >
          <div className="h-[255px]">
            {monthly.some((item) => item.total > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
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
                    tick={{ fontSize: 10, fill: '#7c9a8c' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: number) => formatCompactMoney(value)}
                  />
                  <Tooltip content={<ChartTooltip valueFormatter={(value) => formatMoney(Number(value))} />} cursor={{ fill: '#eef8f2' }} />
                  <Bar dataKey="erf" name="ERF" stackId="a" fill="#0f766e" maxBarSize={38} isAnimationActive={false} />
                  <Bar dataKey="pab" name="PAB penalty" stackId="a" fill="#4d7c0f" maxBarSize={38} isAnimationActive={false} />
                  <Bar dataKey="ra6969" name="RA 6969" stackId="a" fill="#c47a12" radius={[5, 5, 0, 0]} maxBarSize={38} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty />
            )}
          </div>
          <ChartLegend
            className="mt-2"
            items={[
              { label: 'ERF', color: '#0f766e' },
              { label: 'PAB penalty', color: '#4d7c0f' },
              { label: 'RA 6969', color: '#c47a12' },
            ]}
          />
          <ChartNote>
            Bars plot paid rows dated in the selected scope. Register and KPI totals include paid
            rows regardless of whether a payment date is present.
          </ChartNote>
        </ChartCard>

        <div className="card card-pad">
          <SectionHeader
            title="Collections by source"
            subtitle={`All payment rows in ${data.scopeLabel}`}
          />
          <div className="mt-5 space-y-4">
            {[
              { item: erf, color: '#0f766e', label: 'ERF — PD 1586' },
              { item: pab, color: '#4d7c0f', label: 'PAB penalty' },
              { item: ra, color: '#c47a12', label: 'RA 6969 penalty' },
            ].map(({ item, color, label }) => {
              const paid = item.paidAmount
              const pending = item.pendingAmount
              const paidRows = item.paidRows
              const pendingRows = item.pendingRows
              const noStatusRows = item.noStatusRows
              const max = Math.max(1, totalPaid + totalPendingAmount)
              return (
                <div key={item.key}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                        {label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {formatNumber(paidRows)} paid · {formatNumber(pendingRows)} pending · {formatNumber(noStatusRows)} no status
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-slate-800">{formatCompactMoney(paid)}</p>
                      {pending > 0 ? (
                        <p className="text-[10px] font-medium text-amber-600">
                          +{formatCompactMoney(pending)} pending
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/40 ring-1 ring-white/50">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, (paid / max) * 100)}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-5 rounded-xl bg-white/40 px-3 py-2.5 text-[11px] leading-5 text-emerald-950/55 ring-1 ring-white/60 backdrop-blur-sm">
            <span className="font-semibold text-slate-700">
              {formatNumber(erf.noStatusRows + pab.noStatusRows + ra.noStatusRows)}
            </span>{' '}
            payment rows have no status in the source and are excluded from paid and pending
            totals.
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Payment status"
          subtitle={`${tabs.find((tab) => tab.key === activeTab)?.label} · ${data.scopeLabel}`}
        >
          <div className="flex h-[240px] flex-col">
            <div className="relative mx-auto h-[160px] w-full max-w-[230px]">
              {statusData.length ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={48}
                        outerRadius={75}
                        paddingAngle={2}
                        stroke="#fff"
                        strokeWidth={2}
                        isAnimationActive={false}
                      >
                        {statusData.map((entry) => (
                          <Cell key={entry.label} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip valueFormatter={(value) => `${formatNumber(Number(value))} rows`} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[22px] font-semibold tracking-tight text-navy-900">
                      {formatNumber(activeRowsAll)}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      rows
                    </span>
                  </div>
                </>
              ) : (
                <ChartEmpty />
              )}
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {statusData.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                  <span className="font-semibold text-slate-700">{formatNumber(item.count)}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <div className="card card-pad xl:col-span-2">
          <SectionHeader
            title="What the numbers include"
            subtitle={`All payment rows in ${data.scopeLabel}, including unlinked rows`}
          />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="glass-inset p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Paid rows</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800">
                {formatNumber(erf.paidRows + pab.paidRows + ra.paidRows)}
              </p>
              <p className="mt-1 text-[10px] leading-4 text-slate-400">Status exactly PAID</p>
            </div>
            <div className="glass-inset p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pending rows</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800">
                {formatNumber(erf.pendingRows + pab.pendingRows + ra.pendingRows)}
              </p>
              <p className="mt-1 text-[10px] leading-4 text-slate-400">Not counted as collections</p>
            </div>
            <div className="glass-inset p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">No-status rows</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800">
                {formatNumber(erf.noStatusRows + pab.noStatusRows + ra.noStatusRows)}
              </p>
              <p className="mt-1 text-[10px] leading-4 text-slate-400">Flagged for review</p>
            </div>
          </div>
          <ChartNote>
            Payments are linked to cases by case number (ERF and RA 6969) or through the PAB docket
            chain (PAB penalties). Figures exclude amounts from rows with a blank status; unlinked
            rows remain in the register and totals.
          </ChartNote>
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
                  activeTab === tab.key ? 'text-navy-900' : 'text-emerald-900/45 hover:text-navy-700',
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
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <span>
              <span className="font-semibold text-slate-700">{formatNumber(activeRows)}</span> rows shown
            </span>
            <span className="text-slate-300">·</span>
            <span>{formatNumber(activePaid)} paid</span>
            <span className="text-slate-300">·</span>
            <span>{formatNumber(activePending)} pending</span>
            <span className="text-slate-300">·</span>
            <span>{formatNumber(activeNoStatus)} no status</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search company, case, OR number…"
                className="input py-1.5 pl-8 text-xs"
              />
            </div>
            <button type="button" onClick={exportActive} className="btn-secondary whitespace-nowrap text-xs">
              Export CSV
            </button>
          </div>
        </div>

        <div className="table-wrap max-h-[62vh] overflow-auto scrollbar-thin">
          <table className="data-table min-w-[1000px]">
            <thead>
              <tr>
                <th>Company</th>
                <th>{activeTab === 'erf' ? 'Case no.' : activeTab === 'pab' ? 'PAB case no.' : 'Case no.'}</th>
                <th>OR number</th>
                <th>Payment date</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
                {activeTab !== 'erf' ? <th>Subtype</th> : null}
                <th>Linked case</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'erf'
                ? filteredErf.map((record) => (
                    <tr key={record.id}>
                      <td className="min-w-[240px] max-w-[320px]">
                        <p className="line-clamp-2 text-xs font-medium text-slate-800">{record.company}</p>
                      </td>
                      <td className="whitespace-nowrap font-mono text-[10px] text-slate-500">
                        {record.caseNo || '—'}
                        <span className="ml-1.5 rounded bg-white/60 px-1 py-0.5 text-[8px] font-bold text-slate-400 ring-1 ring-white/70">
                          {record.docketYear ?? record.sourceYear}
                        </span>
                      </td>
                      <td className="whitespace-nowrap font-mono text-[10px] text-slate-500">{record.orNumber || '—'}</td>
                      <td className="whitespace-nowrap text-xs">{formatDate(record.dateIso)}</td>
                      <td className="whitespace-nowrap text-right text-xs font-semibold tabular-nums text-slate-700">
                        {formatMoney(record.amount)}
                      </td>
                      <td>
                        <RecordStatusPill status={record.status} />
                      </td>
                      <td>
                        <LinkedCase caseNo={record.linkedCaseNo} caseMap={caseMap} onOpenCase={onOpenCase} />
                      </td>
                    </tr>
                  ))
                : null}
              {activeTab === 'pab'
                ? filteredPab.map((record) => (
                    <tr key={record.id}>
                      <td className="min-w-[240px] max-w-[320px]">
                        <p className="line-clamp-2 text-xs font-medium text-slate-800">{record.company}</p>
                      </td>
                      <td className="whitespace-nowrap font-mono text-[10px] text-slate-500">
                        {record.pabCaseNo || '—'}
                        <span className="ml-1.5 rounded bg-white/60 px-1 py-0.5 text-[8px] font-bold text-slate-400 ring-1 ring-white/70">
                          {record.docketYear ?? record.sourceYear}
                        </span>
                      </td>
                      <td className="whitespace-nowrap font-mono text-[10px] text-slate-500">{record.orNumber || '—'}</td>
                      <td className="whitespace-nowrap text-xs">{formatDate(record.dateIso)}</td>
                      <td className="whitespace-nowrap text-right text-xs font-semibold tabular-nums text-slate-700">
                        {formatMoney(record.amount)}
                      </td>
                      <td>
                        <RecordStatusPill status={record.status} />
                      </td>
                      <td className="text-xs text-slate-500">{record.subtype || '—'}</td>
                      <td>
                        <LinkedCase caseNo={record.linkedCaseNo} caseMap={caseMap} onOpenCase={onOpenCase} />
                      </td>
                    </tr>
                  ))
                : null}
              {activeTab === 'ra6969'
                ? filteredRa.map((record) => (
                    <tr key={record.id}>
                      <td className="min-w-[240px] max-w-[320px]">
                        <p className="line-clamp-2 text-xs font-medium text-slate-800">{record.company}</p>
                      </td>
                      <td className="whitespace-nowrap font-mono text-[10px] text-slate-500">
                        {record.caseNo || '—'}
                        <span className="ml-1.5 rounded bg-white/60 px-1 py-0.5 text-[8px] font-bold text-slate-400 ring-1 ring-white/70">
                          {record.docketYear ?? record.sourceYear}
                        </span>
                      </td>
                      <td className="whitespace-nowrap font-mono text-[10px] text-slate-500">{record.orNumber || '—'}</td>
                      <td className="whitespace-nowrap text-xs">{formatDate(record.dateIso)}</td>
                      <td className="whitespace-nowrap text-right text-xs font-semibold tabular-nums text-slate-700">
                        {formatMoney(record.amount)}
                      </td>
                      <td>
                        <RecordStatusPill status={record.status} />
                      </td>
                      <td className="text-xs text-slate-500">{record.subtype || '—'}</td>
                      <td>
                        <LinkedCase caseNo={record.linkedCaseNo} caseMap={caseMap} onOpenCase={onOpenCase} />
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
          {activeRows === 0 ? (
            <div className="px-5 py-12 text-center text-xs text-slate-400">
              No payment rows match the current scope and search.
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/50 px-4 py-2.5 text-[10px] leading-4 text-emerald-950/40 sm:px-5">
          Paid totals count only rows with status PAID. PENDING and blank-status rows are shown but not
          included in collections. Pending figures are row counts, not distinct cases.
        </div>
      </div>
    </div>
  )
}
