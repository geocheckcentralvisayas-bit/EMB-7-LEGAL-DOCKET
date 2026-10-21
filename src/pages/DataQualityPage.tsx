import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarX,
  Copy,
  Download,
  FileWarning,
  Link2Off,
  Search,
  ShieldAlert,
} from 'lucide-react'
import type { CaseRecord, DashboardData } from '../lib/types'
import { getDataQualitySummary } from '../lib/metrics'
import { downloadCsv } from '../lib/export'
import {
  classNames,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  pabAwLabel,
} from '../lib/utils'
import { FlagChip, KpiCard, ProgressBar, SectionHeader } from '../components/ui'

type UnlinkedGroup = 'all' | 'pabNov' | 'orders' | 'pabOrders' | 'payments' | 'complaints' | 'tracking'

const SOURCE_TAB_LABELS: Record<string, string> = {
  master: 'Master register',
  pabNov: 'PAB NOV',
  orders: 'Orders / resolutions',
  pabOrders: 'PAB orders',
  erf: 'ERF payments',
  ra6969: 'RA 6969 penalties',
  pabPenalty: 'PAB penalties',
  pabPenalties: 'PAB penalties',
  complaints: 'Complaints',
  lbc: 'LBC Track',
  dpwh: 'DPWH Compliance',
  noNovTc: 'No NOV - TC only',
}

interface UnlinkedRow {
  id: string
  group: UnlinkedGroup
  type: string
  reference: string
  name: string
  date: string | null
  status: string
  amount: number
  reason: string
}

function CaseLink({
  caseRecord,
  onOpenCase,
}: {
  caseRecord: CaseRecord | undefined
  onOpenCase: (caseRecord: CaseRecord) => void
}) {
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

export function DataQualityPage({
  data,
  onOpenCase,
  onOpenSource,
}: {
  data: DashboardData
  onOpenCase: (caseRecord: CaseRecord) => void
  onOpenSource?: (url: string) => void
}) {
  const summary = useMemo(() => getDataQualitySummary(data), [data])
  const caseMap = useMemo(
    () => new Map(data.cases.map((caseRecord) => [caseRecord.caseNo, caseRecord])),
    [data.cases],
  )
  const caseByDisplay = useMemo(
    () => new Map(data.cases.map((caseRecord) => [caseRecord.displayCaseNo, caseRecord])),
    [data.cases],
  )

  const [unlinkedGroup, setUnlinkedGroup] = useState<UnlinkedGroup>('all')
  const [search, setSearch] = useState('')

  const unlinkedRows = useMemo<UnlinkedRow[]>(() => {
    const rows: UnlinkedRow[] = []
    for (const record of data.dataIssues.unlinked.pabNov) {
      rows.push({
        id: record.id,
        group: 'pabNov',
        type: 'PAB NOV',
        reference: record.pabCaseNo,
        name: record.establishment,
        date: record.dateIso,
        status: record.aw ? pabAwLabel(record.aw) : 'PAB notice',
        amount: 0,
        reason: 'IIS reference is not in the selected scope',
      })
    }
    for (const record of data.dataIssues.unlinked.orders) {
      rows.push({
        id: record.id,
        group: 'orders',
        type: 'Order / resolution',
        reference: record.caseNo || record.iisRef,
        name: record.company,
        date: record.dateIso,
        status: record.status || 'No status',
        amount: record.amount,
        reason: 'No matching IIS reference or case number in scope',
      })
    }
    for (const record of data.dataIssues.unlinked.pabOrders) {
      rows.push({
        id: record.id,
        group: 'pabOrders',
        type: 'PAB order',
        reference: record.pabCaseNo,
        name: record.company,
        date: record.dateIso,
        status: record.status || 'No status',
        amount: record.amount,
        reason: 'PAB docket does not link to a case in scope',
      })
    }
    for (const record of data.dataIssues.unlinked.erf) {
      rows.push({
        id: record.id,
        group: 'payments',
        type: 'ERF payment',
        reference: record.caseNo,
        name: record.company,
        date: record.dateIso,
        status: record.status || 'No status',
        amount: record.amount,
        reason: 'Case number is not in the selected scope',
      })
    }
    for (const record of data.dataIssues.unlinked.pabPenalties) {
      rows.push({
        id: record.id,
        group: 'payments',
        type: 'PAB penalty',
        reference: record.pabCaseNo,
        name: record.company,
        date: record.dateIso,
        status: record.status || 'No status',
        amount: record.amount,
        reason: 'PAB docket does not link to a case in scope',
      })
    }
    for (const record of data.dataIssues.unlinked.ra6969) {
      rows.push({
        id: record.id,
        group: 'payments',
        type: 'RA 6969 penalty',
        reference: record.caseNo,
        name: record.company,
        date: record.dateIso,
        status: record.status || 'No status',
        amount: record.amount,
        reason: 'Case number is not in the selected scope',
      })
    }
    for (const record of data.dataIssues.unlinked.complaints) {
      rows.push({
        id: record.id,
        group: 'complaints',
        type: 'Complaint',
        reference: record.iisRef,
        name: record.respondent || record.complainant,
        date: record.dateIso,
        status: record.mode || 'No channel',
        amount: 0,
        reason: 'No reliable case reference or name match',
      })
    }
    for (const record of data.dataIssues.unlinked.lbc) {
      rows.push({
        id: record.id,
        group: 'tracking',
        type: 'LBC document',
        reference: record.trackingNo || record.caseNo || record.iisRef,
        name: record.respondent,
        date: record.dateOutboundIso ?? record.dateOutbound,
        status: record.status || 'No LBC status',
        amount: 0,
        reason: 'No case number, PAB docket, or IIS reference match in scope',
      })
    }
    for (const record of data.dataIssues.unlinked.dpwh) {
      rows.push({
        id: record.id,
        group: 'tracking',
        type: 'DPWH commitment',
        reference: record.iisRef,
        name: record.project,
        date: record.dueDateIso ?? record.dueDate,
        status: record.status || 'No status',
        amount: 0,
        reason: 'IIS reference is not in the selected scope',
      })
    }
    return rows.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  }, [data.dataIssues.unlinked])

  const filteredUnlinked = useMemo(() => {
    const query = search.trim().toLowerCase()
    return unlinkedRows.filter((row) => {
      if (unlinkedGroup !== 'all' && row.group !== unlinkedGroup) return false
      if (!query) return true
      return [row.type, row.reference, row.name, row.status, row.reason].join(' ').toLowerCase().includes(query)
    })
  }, [unlinkedRows, unlinkedGroup, search])

  const unlinkedTabs: { key: UnlinkedGroup; label: string; count: number }[] = [
    { key: 'all', label: 'All unlinked', count: unlinkedRows.length },
    { key: 'pabNov', label: 'PAB NOV', count: data.dataIssues.unlinked.pabNov.length },
    { key: 'orders', label: 'Orders', count: data.dataIssues.unlinked.orders.length },
    { key: 'pabOrders', label: 'PAB orders', count: data.dataIssues.unlinked.pabOrders.length },
    {
      key: 'payments',
      label: 'Payments',
      count:
        data.dataIssues.unlinked.erf.length +
        data.dataIssues.unlinked.pabPenalties.length +
        data.dataIssues.unlinked.ra6969.length,
    },
    { key: 'complaints', label: 'Complaints', count: data.dataIssues.unlinked.complaints.length },
    {
      key: 'tracking',
      label: 'LBC / DPWH',
      count: data.dataIssues.unlinked.lbc.length + data.dataIssues.unlinked.dpwh.length,
    },
  ]

  const enforcementUnlinked =
    data.dataIssues.unlinked.pabNov.length +
    data.dataIssues.unlinked.orders.length +
    data.dataIssues.unlinked.pabOrders.length
  const paymentUnlinked =
    data.dataIssues.unlinked.erf.length +
    data.dataIssues.unlinked.pabPenalties.length +
    data.dataIssues.unlinked.ra6969.length
  const complaintUnlinked = data.dataIssues.unlinked.complaints.length
  const trackingUnlinked =
    data.dataIssues.unlinked.lbc.length + data.dataIssues.unlinked.dpwh.length

  const exportUnlinked = () => {
    downloadCsv(
      'emb7-unlinked-records-' + data.scope + '.csv',
      ['Record type', 'Reference', 'Name', 'Date', 'Status / coding', 'Amount', 'Reason'],
      filteredUnlinked.map((row) => [
        row.type,
        row.reference,
        row.name,
        row.date ?? '',
        row.status,
        row.amount,
        row.reason,
      ]),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-rose-200/60 bg-gradient-to-r from-rose-50/80 via-white/60 to-white/35 px-4 py-3.5 shadow-glass backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-rose-950">Read-only reconciliation view</p>
            <p className="mt-0.5 text-xs leading-5 text-rose-900/60">
              The dashboard never edits the source workbook. Every exception below is derived from a
              snapshot and kept visible for manual review.
            </p>
          </div>
        </div>
        <span className="pill shrink-0 bg-white/60 text-rose-800 ring-1 ring-white/70">
          {formatNumber(unlinkedRows.length)} unlinked · {formatNumber(summary.masterIssueCount)} master issues
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          icon={CalendarX}
          label="Invalid docket dates"
          value={formatNumber(summary.invalidDates)}
          subtext="Blank or malformed dates in the master list"
          tone="red"
        />
        <KpiCard
          icon={Copy}
          label="Duplicate IIS references"
          value={formatNumber(summary.duplicateIisGroups)}
          subtext={`${formatNumber(summary.duplicateIisCases)} cases across duplicate groups`}
          tone="amber"
        />
        <KpiCard
          icon={Copy}
          label="Duplicate case numbers"
          value={formatNumber(summary.duplicateCaseNumbers)}
          subtext={`${formatNumber(summary.duplicateCaseCases)} retained rows · stable IDs, not merged`}
          tone="red"
        />
        <KpiCard
          icon={FileWarning}
          label="Cases with missing fields"
          value={formatNumber(data.dataIssues.missingFields.length)}
          subtext={`${summary.casesMissingProvince} province · ${summary.casesMissingLocation} city/municipality · ${summary.casesMissingHandler} handler`}
          tone="violet"
        />
        <KpiCard
          icon={Link2Off}
          label="Unlinked records"
          value={formatNumber(unlinkedRows.length)}
          subtext={`${formatNumber(enforcementUnlinked)} enforcement · ${formatNumber(paymentUnlinked)} payments · ${formatNumber(complaintUnlinked)} complaints · ${formatNumber(trackingUnlinked)} tracking`}
          tone="blue"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.sources.map((source) => (
          <div key={source.year} className="card card-pad">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-brand-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {source.year}
                  </span>
                  <p className="text-sm font-semibold text-navy-900">{source.label}</p>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Data through {formatDate(source.dataDate)} ·{' '}
                  {formatNumber(source.tabCounts.master ?? 0)} raw master rows
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenSource?.(source.sourceUrl)}
                className="btn-secondary text-[11px]"
              >
                Open source
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(source.tabCounts)
                .filter(([key]) => key !== 'master')
                .map(([key, count]) => (
                  <span
                    key={key}
                    className="rounded-lg bg-white/50 px-2 py-1 text-[10px] text-slate-600 ring-1 ring-white/70"
                  >
                    {SOURCE_TAB_LABELS[key] ?? key}{' '}
                    <span className="font-semibold tabular-nums text-slate-800">
                      {formatNumber(count)}
                    </span>
                  </span>
                ))}
            </div>
            <p className="mt-2 text-[10px] leading-4 text-slate-400">
              Raw tab rows. In-sheet header and carried continuation rows are parsed or skipped before
              reconciliation.
            </p>
            {source.coverage.length ? (
              <p className="mt-3 text-[11px] leading-5 text-slate-500">
                {source.coverage.join(' · ')}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {summary.duplicateCaseNumbers ? (
        <div className="card overflow-hidden">
          <div className="border-b border-white/50 px-5 py-4 sm:px-6">
            <SectionHeader
              title="Duplicate case numbers"
              subtitle="Retained as separate rows with stable year-prefixed IDs; not merged"
            />
          </div>
          <div className="table-wrap">
            <table className="data-table min-w-[640px]">
              <thead>
                <tr>
                  <th>Case number</th>
                  <th>Source year</th>
                  <th>Case row</th>
                  <th>Establishment</th>
                </tr>
              </thead>
              <tbody>
                {data.dataIssues.duplicateCaseNumbers.map((group) =>
                  group.cases.map((item, index) => {
                    const record = data.cases.find(
                      (caseRecord) =>
                        caseRecord.caseNo === item.caseNo &&
                        caseRecord.establishment === item.establishment &&
                        caseRecord.sourceYear === item.year,
                    )
                    return (
                      <tr key={`${group.caseNo}-${item.year}-${index}`}>
                        <td className="font-mono text-[10px] font-semibold text-rose-700">
                          {index === 0 ? group.caseNo : ''}
                        </td>
                        <td className="text-xs tabular-nums text-slate-600">{item.year}</td>
                        <td>
                          <CaseLink caseRecord={record} onOpenCase={onOpenCase} />
                        </td>
                        <td className="max-w-[320px] text-xs text-slate-700">{item.establishment}</td>
                      </tr>
                    )
                  }),
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="card overflow-hidden">
        <div className="border-b border-white/50 px-5 py-4 sm:px-6">
          <SectionHeader
            title="Source tab reconciliation"
            subtitle={`How many rows in each source tab can be tied to a case in ${data.scopeLabel}`}
          />
        </div>
        <div className="table-wrap">
          <table className="data-table min-w-[850px]">
            <thead>
              <tr>
                <th>Source tab</th>
                <th className="text-right">Total rows</th>
                <th className="text-right">Linked</th>
                <th className="text-right">Unlinked</th>
                <th className="w-[260px]">Link rate</th>
              </tr>
            </thead>
            <tbody>
              {summary.reconciliation.map((row) => {
                const rate = row.total ? row.linked / row.total : 0
                return (
                  <tr key={row.key}>
                    <td className="text-xs font-medium text-slate-700">{row.label}</td>
                    <td className="text-right text-xs tabular-nums text-slate-600">{formatNumber(row.total)}</td>
                    <td className="text-right text-xs tabular-nums font-semibold text-emerald-700">{formatNumber(row.linked)}</td>
                    <td className="text-right text-xs tabular-nums font-semibold text-amber-700">{formatNumber(row.unlinked)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <ProgressBar value={row.linked} max={row.total} color={row.unlinked ? '#c47a12' : '#15803d'} />
                        <span className="w-11 shrink-0 text-right text-[10px] font-semibold tabular-nums text-slate-500">
                          {formatPercent(rate)}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-white/50 px-5 py-2.5 text-[10px] leading-4 text-emerald-950/40 sm:px-6">
          Unlinked rows are not errors by definition: the enforcement and document tabs are rolling
          and include references outside the selected docket scope. The count is a coverage signal,
          not a data-loss count. Incomplete rows without a company, case/reference, or amount are
          excluded from tab totals.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-white/50 px-5 py-4">
            <SectionHeader
              title="Invalid or missing docket dates"
              subtitle="These records are excluded from monthly and aging calculations"
            />
          </div>
          <div className="table-wrap max-h-[320px] overflow-auto scrollbar-thin">
            <table className="data-table min-w-[520px]">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Establishment</th>
                  <th>Raw date</th>
                </tr>
              </thead>
              <tbody>
                {data.dataIssues.invalidDates.map((issue) => (
                  <tr key={`${issue.caseNo}-${issue.rawDate}`}>
                    <td>
                      <CaseLink caseRecord={caseByDisplay.get(issue.caseNo)} onOpenCase={onOpenCase} />
                    </td>
                    <td className="max-w-[230px] text-xs text-slate-700">{issue.establishment}</td>
                    <td className="font-mono text-[10px] text-rose-600">{issue.rawDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-white/50 px-5 py-4">
            <SectionHeader
              title="Duplicate IIS references"
              subtitle="First match is the displayed link; shared rows can appear on duplicate cases"
            />
          </div>
          <div className="table-wrap max-h-[320px] overflow-auto scrollbar-thin">
            <table className="data-table min-w-[520px]">
              <thead>
                <tr>
                  <th>IIS reference</th>
                  <th>Case</th>
                  <th>Establishment</th>
                </tr>
              </thead>
              <tbody>
                {data.dataIssues.duplicateIis.map((group) =>
                  group.cases.map((item, index) => (
                    <tr key={`${group.iisRef}-${item.caseNo}-${index}`}>
                      <td className="font-mono text-[10px] text-amber-700">
                        {index === 0 ? group.iisRef : ''}
                      </td>
                      <td>
                        <CaseLink caseRecord={caseByDisplay.get(item.caseNo)} onOpenCase={onOpenCase} />
                      </td>
                      <td className="max-w-[260px] text-xs text-slate-700">{item.establishment}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-white/50 px-5 py-4">
            <SectionHeader
              title="Missing master fields"
              subtitle="Province, city/municipality, or handler · 2025 schema gaps are not flagged"
            />
          </div>
          <div className="table-wrap max-h-[280px] overflow-auto scrollbar-thin">
            <table className="data-table min-w-[560px]">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Establishment</th>
                  <th>Missing fields</th>
                </tr>
              </thead>
              <tbody>
                {data.dataIssues.missingFields.map((item) => (
                  <tr key={`${item.caseNo}-${item.establishment}`}>
                    <td>
                      <CaseLink caseRecord={caseByDisplay.get(item.caseNo)} onOpenCase={onOpenCase} />
                    </td>
                    <td className="max-w-[220px] text-xs text-slate-700">{item.establishment}</td>
                    <td>
                      <div className="flex max-w-[230px] flex-wrap gap-1">
                        {item.missing.map((field) => (
                          <FlagChip key={field} flag={field.replace('Missing ', '')} />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          {data.dataIssues.unnumbered.map((caseRecord) => (
            <div key={caseRecord.id} className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div>
                  <p className="text-sm font-semibold text-rose-950">Unnumbered master entry</p>
                  <p className="mt-1 text-xs leading-5 text-rose-900/70">
                    {caseRecord.establishment} has IIS reference{' '}
                    <span className="font-mono font-semibold">{caseRecord.iisRef}</span> but no case number.
                    It sits between 2026-0224 and 2026-0226, so it is likely the missing 2026-0225. The
                    dashboard leaves it as <span className="font-mono font-semibold">UNNUMBERED</span>{' '}
                    rather than inventing an official number.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenCase(caseRecord)}
                    className="mt-2 text-[11px] font-semibold text-rose-800 underline underline-offset-2"
                  >
                    Open the unnumbered record
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="card card-pad">
            <SectionHeader
              title="Negros Oriental & Siquijor exclusion"
              subtitle="Applied dashboard-wide after linkage; identifiable rows only"
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700/70">
                  Cases excluded
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-rose-800">
                  {formatNumber(data.exclusions.excludedCases)}
                </p>
                <p className="mt-1 text-[10px] text-rose-700/70">
                  {Object.entries(data.exclusions.casesByYear)
                    .map(([year, count]) => `${year}: ${count}`)
                    .join(' · ')}
                </p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700/70">
                  Linked records excluded
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-rose-800">
                  {formatNumber(data.exclusions.excludedRecords)}
                </p>
                <p className="mt-1 text-[10px] text-rose-700/70">
                  {Object.entries(data.exclusions.recordsByType)
                    .filter(([, count]) => count > 0)
                    .map(([type, count]) => `${type}: ${count}`)
                    .join(' · ')}
                </p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700/70">
                  Ambiguous retained
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-amber-800">
                  {formatNumber(data.exclusions.ambiguousCases)}
                </p>
                <p className="mt-1 text-[10px] text-amber-700/70">
                  Rows without an identifiable province are kept and flagged for review
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Placeholders skipped
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-700">
                  {formatNumber(data.exclusions.placeholdersSkipped)}
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  {Object.entries(data.exclusions.placeholdersByYear)
                    .filter(([, count]) => count > 0)
                    .map(([year, count]) => `${year}: ${count}`)
                    .join(' · ')}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              Exclusion applies to identifiable Negros Oriental and Siquijor rows only. Ambiguous towns
              (San Jose, Valencia, Pamplona, La Libertad, Maria, San Juan, Santa Catalina) are retained
              unless the province is explicit. Records linked to an excluded case are removed; unlinked
              records are removed only when their own location is identifiable.
            </p>
          </div>

          <div className="card card-pad">
            <SectionHeader
              title="Method notes"
              subtitle="How the snapshot handles known source limitations"
            />
            <ul className="mt-3 space-y-2.5 text-[11px] leading-5 text-slate-500">
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                Dates are parsed as <span className="font-mono text-slate-600">M/d/yyyy</span>. Malformed
                and blank dates stay in the register but are excluded from monthly and aging charts.
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                Linkage uses IIS reference first, then case number, then the PAB docket → IIS chain.
                Duplicate IIS references are flagged. The first matching case is the displayed link, while
                shared rows may also appear on duplicate cases.
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                Complaint links are conservative and labelled. Name-only links are shown as partial
                matches and should be verified manually.
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                Duplicate case numbers are retained as separate rows with stable year-prefixed IDs and
                flagged here. They are never silently merged.
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                The 2025 workbook has no email, contact, province, city, barangay, or document-type
                columns. Province is derived from the full address when it names Cebu, Bohol, Negros
                Oriental, or Siquijor; other locations stay “Not recorded in source.” Missing 2025
                schema fields are not treated as data-quality failures.
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                The 2025 workstreams add LBC document tracking and DPWH compliance. Their rows follow
                the same docket-year scope filter as enforcement and payments.
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                Paid totals count only rows with status{' '}
                <span className="font-mono text-slate-600">PAID</span>; pending and blank-status rows are
                shown but excluded from collections.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-white/50 px-4 pt-3 sm:px-5">
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {unlinkedTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setUnlinkedGroup(tab.key)
                  setSearch('')
                }}
                className={classNames(
                  'relative flex shrink-0 items-center gap-1.5 px-3 py-3 text-xs font-semibold transition',
                  unlinkedGroup === tab.key ? 'text-navy-900' : 'text-emerald-900/45 hover:text-navy-700',
                )}
              >
                {tab.label}
                <span
                  className={classNames(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                    unlinkedGroup === tab.key ? 'bg-emerald-100/70 text-navy-800' : 'bg-white/50 text-slate-500',
                  )}
                >
                  {formatNumber(tab.count)}
                </span>
                {unlinkedGroup === tab.key ? (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t-full bg-brand-500" />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-white/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Link2Off className="h-3.5 w-3.5 text-slate-400" />
            <span>
              <span className="font-semibold text-slate-700">{formatNumber(filteredUnlinked.length)}</span>{' '}
              unlinked rows shown
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reference, name, type…"
                className="input py-1.5 pl-8 text-xs"
              />
            </div>
            <button type="button" onClick={exportUnlinked} className="btn-secondary whitespace-nowrap text-xs">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="table-wrap max-h-[56vh] overflow-auto scrollbar-thin">
          <table className="data-table min-w-[980px]">
            <thead>
              <tr>
                <th>Type</th>
                <th>Reference</th>
                <th>Name / establishment</th>
                <th>Date</th>
                <th>Status / coding</th>
                <th className="text-right">Amount</th>
                <th>Why unlinked</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnlinked.map((row) => (
                <tr key={`${row.type}-${row.id}`}>
                  <td className="whitespace-nowrap text-xs font-medium text-slate-700">{row.type}</td>
                  <td className="whitespace-nowrap font-mono text-[10px] text-slate-500">{row.reference || '—'}</td>
                  <td className="min-w-[240px] max-w-[320px]">
                    <p className="line-clamp-2 text-xs text-slate-700">{row.name || '—'}</p>
                  </td>
                  <td className="whitespace-nowrap text-xs">{formatDate(row.date)}</td>
                  <td className="text-xs text-slate-600">{row.status || '—'}</td>
                  <td className="whitespace-nowrap text-right text-xs font-semibold tabular-nums text-slate-700">
                    {row.amount ? formatMoney(row.amount) : '—'}
                  </td>
                  <td className="max-w-[250px] text-[11px] leading-5 text-slate-500">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUnlinked.length === 0 ? (
            <div className="px-5 py-12 text-center text-xs text-slate-400">
              No unlinked records match the current tab and search.
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/50 px-4 py-2.5 text-[10px] leading-4 text-emerald-950/40 sm:px-5">
          Unlinked records are retained in the dashboard. They may belong to cases outside the
          selected scope, use a superseded reference, or have a name that cannot be matched reliably.
        </div>
      </div>
    </div>
  )
}
