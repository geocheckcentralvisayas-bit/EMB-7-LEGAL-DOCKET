import {
  type CaseRecord,
  type DashboardData,
  type StageKey,
  STAGE_META,
} from './types'
import {
  isPaid,
  isPending,
  monthKey,
  monthLabel,
  parseDate,
  uniqueBy,
} from './utils'
import { violationFlag } from './buildData'

export interface KpiMetrics {
  totalCases: number
  numberedCases: number
  unnumberedCases: number
  newThisMonth: number
  newLastMonth: number
  pabCases: number
  pabNumberedCases: number
  pabUnnumberedCases: number
  orderCases: number
  pabOrderCases: number
  paymentCases: number
  erfCases: number
  pabPenaltyCases: number
  ra6969Cases: number
  complaintLinkedCases: number
  collectionsAll: number
  collections2026: number
  collectionsLinked: number
  pendingOrdersAll: number
  pendingOrders2026: number
  pendingOrdersLinked: number
  pendingOrdersAmountAll: number
  pendingOrdersAmount2026: number
  pendingOrdersAmountLinked: number
  assessedOrdersAll: number
  assessedOrders2026: number
  assessedOrdersLinked: number
  pabPenaltyAssessedAll: number
  pabPenaltyAssessed2026: number
  pabPenaltyAssessedLinked: number
  pendingPaymentsAll: number
  pendingPayments2026: number
  pendingPaymentsLinked: number
  pendingPaymentsAmountAll: number
  pendingPaymentsAmount2026: number
  pendingPaymentsAmountLinked: number
  complaintsTotal: number
  complaintsThisMonth: number
  complaintsLinked: number
  paidCases: number
  pendingPaymentCases: number
  dataIssueCount: number
}

function sum(items: number[]): number {
  return items.reduce((total, value) => total + value, 0)
}

function shiftMonth(key: string, offset: number): string {
  const [year, month] = key.split('-').map(Number)
  const date = new Date(year, month - 1 + offset, 1, 12)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthKeys(dataDate: string, startDate?: string): string[] {
  const end = dataDate.slice(0, 7)
  const start = startDate?.slice(0, 7) || `${dataDate.slice(0, 4)}-01`
  if (!/^\d{4}-\d{2}$/.test(start) || !/^\d{4}-\d{2}$/.test(end)) {
    return []
  }
  const keys: string[] = []
  let [year, month] = start.split('-').map(Number)
  const [endYear, endMonth] = end.split('-').map(Number)
  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
    if (keys.length > 120) break
  }
  return keys
}

export function getKpis(data: DashboardData): KpiMetrics {
  const currentMonth = data.dataDate.slice(0, 7)
  const previousMonth = shiftMonth(currentMonth, -1)
  const allPayments = [...data.erf, ...data.pabPenalties, ...data.ra6969]
  const paidPayments = allPayments.filter((payment) => isPaid(payment.status))
  const pendingPayments = allPayments.filter((payment) => isPending(payment.status))
  const pendingOrders = data.orders.filter((order) => isPending(order.status))

  const casesWithPab = data.cases.filter((caseRecord) => caseRecord.pabNov.length > 0)
  const casesWithOrder = data.cases.filter((caseRecord) => caseRecord.orders.length > 0)
  const casesWithPabOrder = data.cases.filter((caseRecord) => caseRecord.pabOrders.length > 0)
  const casesWithPayment = data.cases.filter(
    (caseRecord) =>
      caseRecord.erf.length || caseRecord.pabPenalties.length || caseRecord.ra6969.length,
  )
  const casesWithErf = data.cases.filter((caseRecord) => caseRecord.erf.length > 0)
  const casesWithPabPenalty = data.cases.filter((caseRecord) => caseRecord.pabPenalties.length > 0)
  const casesWithRa6969 = data.cases.filter((caseRecord) => caseRecord.ra6969.length > 0)
  const paidCases = data.cases.filter((caseRecord) => caseRecord.paidAmount > 0)
  const pendingPaymentCases = data.cases.filter((caseRecord) => caseRecord.pendingPayment)

  return {
    totalCases: data.cases.length,
    numberedCases: data.cases.filter((caseRecord) => !caseRecord.isUnnumbered).length,
    unnumberedCases: data.cases.filter((caseRecord) => caseRecord.isUnnumbered).length,
    newThisMonth: data.cases.filter(
      (caseRecord) => monthKey(caseRecord.dateIso) === currentMonth,
    ).length,
    newLastMonth: data.cases.filter(
      (caseRecord) => monthKey(caseRecord.dateIso) === previousMonth,
    ).length,
    pabCases: casesWithPab.length,
    pabNumberedCases: casesWithPab.filter((caseRecord) => !caseRecord.isUnnumbered).length,
    pabUnnumberedCases: casesWithPab.filter((caseRecord) => caseRecord.isUnnumbered).length,
    orderCases: casesWithOrder.length,
    pabOrderCases: casesWithPabOrder.length,
    paymentCases: casesWithPayment.length,
    erfCases: casesWithErf.length,
    pabPenaltyCases: casesWithPabPenalty.length,
    ra6969Cases: casesWithRa6969.length,
    complaintLinkedCases: data.cases.filter((caseRecord) => caseRecord.complaints.length > 0).length,
    collectionsAll: sum(paidPayments.map((payment) => payment.amount)),
    collections2026: sum(
      paidPayments
        .filter((payment) => payment.linkedCaseNo)
        .map((payment) => payment.amount),
    ),
    collectionsLinked: sum(
      paidPayments
        .filter((payment) => payment.linkedCaseNo)
        .map((payment) => payment.amount),
    ),
    pendingOrdersAll: pendingOrders.length,
    pendingOrders2026: pendingOrders.filter((order) => order.linkedCaseNo).length,
    pendingOrdersLinked: pendingOrders.filter((order) => order.linkedCaseNo).length,
    pendingOrdersAmountAll: sum(pendingOrders.map((order) => order.amount)),
    pendingOrdersAmount2026: sum(
      pendingOrders.filter((order) => order.linkedCaseNo).map((order) => order.amount),
    ),
    pendingOrdersAmountLinked: sum(
      pendingOrders.filter((order) => order.linkedCaseNo).map((order) => order.amount),
    ),
    assessedOrdersAll: sum(data.orders.map((order) => order.amount)),
    assessedOrders2026: sum(
      data.orders.filter((order) => order.linkedCaseNo).map((order) => order.amount),
    ),
    assessedOrdersLinked: sum(
      data.orders.filter((order) => order.linkedCaseNo).map((order) => order.amount),
    ),
    pabPenaltyAssessedAll: sum(data.pabOrders.map((order) => order.amount)),
    pabPenaltyAssessed2026: sum(
      data.pabOrders.filter((order) => order.linkedCaseNo).map((order) => order.amount),
    ),
    pabPenaltyAssessedLinked: sum(
      data.pabOrders.filter((order) => order.linkedCaseNo).map((order) => order.amount),
    ),
    pendingPaymentsAll: pendingPayments.length,
    pendingPayments2026: pendingPayments.filter((payment) => payment.linkedCaseNo).length,
    pendingPaymentsLinked: pendingPayments.filter((payment) => payment.linkedCaseNo).length,
    pendingPaymentsAmountAll: sum(pendingPayments.map((payment) => payment.amount)),
    pendingPaymentsAmount2026: sum(
      pendingPayments.filter((payment) => payment.linkedCaseNo).map((payment) => payment.amount),
    ),
    pendingPaymentsAmountLinked: sum(
      pendingPayments.filter((payment) => payment.linkedCaseNo).map((payment) => payment.amount),
    ),
    complaintsTotal: data.complaints.length,
    complaintsThisMonth: data.complaints.filter(
      (complaint) => monthKey(complaint.dateIso) === currentMonth,
    ).length,
    complaintsLinked: data.complaints.filter((complaint) => complaint.linkedCaseNo).length,
    paidCases: paidCases.length,
    pendingPaymentCases: pendingPaymentCases.length,
    dataIssueCount:
      data.dataIssues.invalidDates.length +
      data.dataIssues.duplicateIis.length +
      data.dataIssues.duplicateCaseNumbers.length +
      data.dataIssues.missingFields.length +
      data.dataIssues.unnumbered.length,
  }
}

export interface MonthlyCount {
  key: string
  label: string
  count: number
  isCurrent: boolean
}

export function getMonthlyCaseCounts(data: DashboardData): MonthlyCount[] {
  const keys = monthKeys(data.dataDate, data.timelineStart)
  const counts = new Map<string, number>()
  for (const caseRecord of data.cases) {
    const key = monthKey(caseRecord.dateIso)
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const currentMonth = data.dataDate.slice(0, 7)
  return keys.map((key) => ({
    key,
    label: monthLabel(key),
    count: counts.get(key) ?? 0,
    isCurrent: key === currentMonth,
  }))
}

export function getMonthlyRecordCounts(
  records: { dateIso: string | null }[],
  dataDate: string,
  timelineStart?: string,
): MonthlyCount[] {
  const keys = monthKeys(dataDate, timelineStart)
  const counts = new Map<string, number>()
  for (const record of records) {
    const key = monthKey(record.dateIso)
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const currentMonth = dataDate.slice(0, 7)
  return keys.map((key) => ({
    key,
    label: monthLabel(key),
    count: counts.get(key) ?? 0,
    isCurrent: key === currentMonth,
  }))
}

export interface CategoryCount {
  key: string
  label: string
  count: number
  color?: string
}

export function getProvinceCounts(data: DashboardData): CategoryCount[] {
  const counts = new Map<string, number>()
  for (const caseRecord of data.cases) {
    const province = caseRecord.province || 'Unknown'
    counts.set(province, (counts.get(province) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count)
}

export function getStageCounts(data: DashboardData): (CategoryCount & { stage: StageKey })[] {
  const counts = new Map<StageKey, number>()
  for (const caseRecord of data.cases) {
    counts.set(caseRecord.stage, (counts.get(caseRecord.stage) ?? 0) + 1)
  }
  return (Object.keys(STAGE_META) as StageKey[])
    .sort((a, b) => STAGE_META[a].order - STAGE_META[b].order)
    .map((stage) => ({
      key: stage,
      label: STAGE_META[stage].label,
      count: counts.get(stage) ?? 0,
      color: STAGE_META[stage].color,
      stage,
    }))
}

export function getCoverageCounts(data: DashboardData): CategoryCount[] {
  return [
    {
      key: 'nov',
      label: 'NOV / master records',
      count: data.cases.length,
      color: '#64748b',
    },
    {
      key: 'pabNov',
      label: 'PAB NOV linked',
      count: data.cases.filter((caseRecord) => caseRecord.pabNov.length > 0).length,
      color: '#d97706',
    },
    {
      key: 'order',
      label: 'Order / resolution linked',
      count: data.cases.filter((caseRecord) => caseRecord.orders.length > 0).length,
      color: '#2563eb',
    },
    {
      key: 'pabOrder',
      label: 'PAB order linked',
      count: data.cases.filter((caseRecord) => caseRecord.pabOrders.length > 0).length,
      color: '#7c3aed',
    },
    {
      key: 'payment',
      label: 'Payment recorded',
      count: data.cases.filter((caseRecord) => caseRecord.paidAmount > 0).length,
      color: '#059669',
    },
  ]
}

export function getHandlerCounts(data: DashboardData, limit = 10): CategoryCount[] {
  const counts = new Map<string, number>()
  for (const caseRecord of data.cases) {
    const handler = caseRecord.handler || 'Unassigned'
    counts.set(handler, (counts.get(handler) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function getViolationCounts(data: DashboardData): CategoryCount[] {
  const counts = new Map<string, number>()
  for (const caseRecord of data.cases) {
    const flags = new Set(caseRecord.violations.map((violation) => violationFlag(violation)))
    for (const flag of flags) counts.set(flag, (counts.get(flag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count)
}

export function getFlagCounts(data: DashboardData): CategoryCount[] {
  const counts = new Map<string, number>()
  for (const caseRecord of data.cases) {
    for (const flag of caseRecord.flags) counts.set(flag, (counts.get(flag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count)
}

export interface AgingBucket {
  key: string
  label: string
  count: number
  min: number
  max: number | null
}

export function getAgingBuckets(data: DashboardData): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { key: '0-30', label: '0–30 days', count: 0, min: 0, max: 30 },
    { key: '31-60', label: '31–60 days', count: 0, min: 31, max: 60 },
    { key: '61-90', label: '61–90 days', count: 0, min: 61, max: 90 },
    { key: '91-180', label: '91–180 days', count: 0, min: 91, max: 180 },
    { key: '181+', label: 'Over 180 days', count: 0, min: 181, max: null },
  ]
  for (const caseRecord of data.cases) {
    if (caseRecord.ageDays === null) continue
    const bucket = buckets.find(
      (item) => caseRecord.ageDays! >= item.min && (item.max === null || caseRecord.ageDays! <= item.max),
    )
    if (bucket) bucket.count += 1
  }
  return buckets
}

export function getMonthlyCollections(
  data: DashboardData,
  linkedOnly: boolean,
): { key: string; label: string; erf: number; pab: number; ra6969: number; total: number }[] {
  const keys = monthKeys(data.dataDate, data.timelineStart)
  const totals = new Map<string, { erf: number; pab: number; ra6969: number }>()
  for (const key of keys) totals.set(key, { erf: 0, pab: 0, ra6969: 0 })

  const add = (
    rows: { dateIso: string | null; amount: number; status: string; linkedCaseNo: string | null }[],
    bucket: 'erf' | 'pab' | 'ra6969',
  ) => {
    for (const row of rows) {
      if (!isPaid(row.status)) continue
      if (linkedOnly && !row.linkedCaseNo) continue
      const key = monthKey(row.dateIso)
      const total = key ? totals.get(key) : undefined
      if (!total) continue
      total[bucket] += row.amount
    }
  }
  add(data.erf, 'erf')
  add(data.pabPenalties, 'pab')
  add(data.ra6969, 'ra6969')

  return keys.map((key) => {
    const total = totals.get(key) ?? { erf: 0, pab: 0, ra6969: 0 }
    return {
      key,
      label: monthLabel(key),
      ...total,
      total: total.erf + total.pab + total.ra6969,
    }
  })
}

export interface PaymentSlice {
  key: 'erf' | 'pab' | 'ra6969'
  label: string
  totalRows: number
  linkedRows: number
  paidRows: number
  pendingRows: number
  noStatusRows: number
  linkedPaidRows: number
  linkedPendingRows: number
  linkedNoStatusRows: number
  paidAmount: number
  pendingAmount: number
  linkedPaidAmount: number
  linkedPendingAmount: number
}

export function getPaymentSummary(data: DashboardData): PaymentSlice[] {
  const make = (
    key: 'erf' | 'pab' | 'ra6969',
    label: string,
    rows: { status: string; amount: number; linkedCaseNo: string | null }[],
  ): PaymentSlice => {
    const paid = rows.filter((row) => isPaid(row.status))
    const pending = rows.filter((row) => isPending(row.status))
    const linked = rows.filter((row) => row.linkedCaseNo)
    return {
      key,
      label,
      totalRows: rows.length,
      linkedRows: linked.length,
      paidRows: paid.length,
      pendingRows: pending.length,
      noStatusRows: rows.filter((row) => !row.status).length,
      linkedPaidRows: paid.filter((row) => row.linkedCaseNo).length,
      linkedPendingRows: pending.filter((row) => row.linkedCaseNo).length,
      linkedNoStatusRows: rows.filter((row) => !row.status && row.linkedCaseNo).length,
      paidAmount: sum(paid.map((row) => row.amount)),
      pendingAmount: sum(pending.map((row) => row.amount)),
      linkedPaidAmount: sum(paid.filter((row) => row.linkedCaseNo).map((row) => row.amount)),
      linkedPendingAmount: sum(pending.filter((row) => row.linkedCaseNo).map((row) => row.amount)),
    }
  }
  return [
    make('erf', 'ERF — PD 1586', data.erf),
    make('pab', 'PAB penalty', data.pabPenalties),
    make('ra6969', 'RA 6969 penalty', data.ra6969),
  ]
}

export interface EnforcementSummary {
  pabNovTotal: number
  pabNovLinked: number
  pabNovUnlinked: number
  orderTotal: number
  orderLinked: number
  orderUnlinked: number
  pabOrderTotal: number
  pabOrderLinked: number
  pabOrderUnlinked: number
  erfTotal: number
  erfLinked: number
  erfUnlinked: number
  pabPenaltyTotal: number
  pabPenaltyLinked: number
  pabPenaltyUnlinked: number
  ra6969Total: number
  ra6969Linked: number
  ra6969Unlinked: number
  pendingOrdersAll: number
  pendingOrders2026: number
  pendingOrdersAmountAll: number
  pendingOrdersAmount2026: number
  pabPenaltyAssessedAll: number
  pabPenaltyAssessed2026: number
  awCounts: { key: string; label: string; count: number; linked: number }[]
  orderStatus: { key: string; label: string; count: number; amount: number; linked: number }[]
  pabOrderStatus: { key: string; label: string; count: number; amount: number; linked: number }[]
}

function statusCounts(
  rows: { status: string; amount: number; linkedCaseNo: string | null }[],
): { key: string; label: string; count: number; amount: number; linked: number }[] {
  const map = new Map<string, { count: number; amount: number; linked: number }>()
  for (const row of rows) {
    const label = row.status || 'No status'
    const entry = map.get(label) ?? { count: 0, amount: 0, linked: 0 }
    entry.count += 1
    entry.amount += row.amount
    if (row.linkedCaseNo) entry.linked += 1
    map.set(label, entry)
  }
  return [...map.entries()]
    .map(([label, values]) => ({ key: label, label, ...values }))
    .sort((a, b) => b.count - a.count)
}

export function getEnforcementSummary(data: DashboardData): EnforcementSummary {
  const pendingOrders = data.orders.filter((order) => isPending(order.status))
  const awMap = new Map<string, { count: number; linked: number }>()
  for (const record of data.pabNov) {
    const label = record.aw || 'Not coded'
    const entry = awMap.get(label) ?? { count: 0, linked: 0 }
    entry.count += 1
    if (record.linkedCaseNo) entry.linked += 1
    awMap.set(label, entry)
  }

  return {
    pabNovTotal: data.pabNov.length,
    pabNovLinked: data.pabNov.filter((record) => record.linkedCaseNo).length,
    pabNovUnlinked: data.pabNov.filter((record) => !record.linkedCaseNo).length,
    orderTotal: data.orders.length,
    orderLinked: data.orders.filter((record) => record.linkedCaseNo).length,
    orderUnlinked: data.orders.filter((record) => !record.linkedCaseNo).length,
    pabOrderTotal: data.pabOrders.length,
    pabOrderLinked: data.pabOrders.filter((record) => record.linkedCaseNo).length,
    pabOrderUnlinked: data.pabOrders.filter((record) => !record.linkedCaseNo).length,
    erfTotal: data.erf.length,
    erfLinked: data.erf.filter((record) => record.linkedCaseNo).length,
    erfUnlinked: data.erf.filter((record) => !record.linkedCaseNo).length,
    pabPenaltyTotal: data.pabPenalties.length,
    pabPenaltyLinked: data.pabPenalties.filter((record) => record.linkedCaseNo).length,
    pabPenaltyUnlinked: data.pabPenalties.filter((record) => !record.linkedCaseNo).length,
    ra6969Total: data.ra6969.length,
    ra6969Linked: data.ra6969.filter((record) => record.linkedCaseNo).length,
    ra6969Unlinked: data.ra6969.filter((record) => !record.linkedCaseNo).length,
    pendingOrdersAll: pendingOrders.length,
    pendingOrders2026: pendingOrders.filter((order) => order.linkedCaseNo).length,
    pendingOrdersAmountAll: sum(pendingOrders.map((order) => order.amount)),
    pendingOrdersAmount2026: sum(
      pendingOrders.filter((order) => order.linkedCaseNo).map((order) => order.amount),
    ),
    pabPenaltyAssessedAll: sum(data.pabOrders.map((order) => order.amount)),
    pabPenaltyAssessed2026: sum(
      data.pabOrders.filter((order) => order.linkedCaseNo).map((order) => order.amount),
    ),
    awCounts: [...awMap.entries()]
      .map(([label, values]) => ({ key: label, label, ...values }))
      .sort((a, b) => b.count - a.count),
    orderStatus: statusCounts(data.orders),
    pabOrderStatus: statusCounts(data.pabOrders),
  }
}

export interface ComplaintSummary {
  total: number
  thisMonth: number
  lastMonth: number
  linked: number
  unlinked: number
  modes: CategoryCount[]
  monthly: MonthlyCount[]
}

export function getComplaintSummary(data: DashboardData): ComplaintSummary {
  const currentMonth = data.dataDate.slice(0, 7)
  const previousMonth = shiftMonth(currentMonth, -1)
  const modeMap = new Map<string, number>()
  for (const complaint of data.complaints) {
    const mode = complaint.mode || 'Not stated'
    modeMap.set(mode, (modeMap.get(mode) ?? 0) + 1)
  }
  return {
    total: data.complaints.length,
    thisMonth: data.complaints.filter((complaint) => monthKey(complaint.dateIso) === currentMonth)
      .length,
    lastMonth: data.complaints.filter((complaint) => monthKey(complaint.dateIso) === previousMonth)
      .length,
    linked: data.complaints.filter((complaint) => complaint.linkedCaseNo).length,
    unlinked: data.complaints.filter((complaint) => !complaint.linkedCaseNo).length,
    modes: [...modeMap.entries()]
      .map(([label, count]) => ({ key: label, label, count }))
      .sort((a, b) => b.count - a.count),
    monthly: getMonthlyRecordCounts(data.complaints, data.dataDate, data.timelineStart),
  }
}

export interface ReconciliationRow {
  key: string
  label: string
  total: number
  linked: number
  unlinked: number
}

export interface DataQualitySummary {
  totalCases: number
  numberedCases: number
  unnumberedCases: number
  invalidDates: number
  duplicateIisGroups: number
  duplicateIisCases: number
  duplicateCaseNumbers: number
  duplicateCaseCases: number
  masterIssueCount: number
  casesMissingProvince: number
  casesMissingLocation: number
  casesMissingHandler: number
  casesMissingDocumentType: number
  casesMissingIis: number
  recordsNoStatus: number
  reconciliation: ReconciliationRow[]
}

export function getDataQualitySummary(data: DashboardData): DataQualitySummary {
  const reconciliation: ReconciliationRow[] = [
    {
      key: 'pabNov',
      label: 'PAB NOV',
      total: data.pabNov.length,
      linked: data.pabNov.filter((record) => record.linkedCaseNo).length,
      unlinked: data.pabNov.filter((record) => !record.linkedCaseNo).length,
    },
    {
      key: 'orders',
      label: 'Orders / resolutions',
      total: data.orders.length,
      linked: data.orders.filter((record) => record.linkedCaseNo).length,
      unlinked: data.orders.filter((record) => !record.linkedCaseNo).length,
    },
    {
      key: 'pabOrders',
      label: 'PAB orders',
      total: data.pabOrders.length,
      linked: data.pabOrders.filter((record) => record.linkedCaseNo).length,
      unlinked: data.pabOrders.filter((record) => !record.linkedCaseNo).length,
    },
    {
      key: 'erf',
      label: 'ERF payments',
      total: data.erf.length,
      linked: data.erf.filter((record) => record.linkedCaseNo).length,
      unlinked: data.erf.filter((record) => !record.linkedCaseNo).length,
    },
    {
      key: 'pabPenalty',
      label: 'PAB penalties',
      total: data.pabPenalties.length,
      linked: data.pabPenalties.filter((record) => record.linkedCaseNo).length,
      unlinked: data.pabPenalties.filter((record) => !record.linkedCaseNo).length,
    },
    {
      key: 'ra6969',
      label: 'RA 6969 penalties',
      total: data.ra6969.length,
      linked: data.ra6969.filter((record) => record.linkedCaseNo).length,
      unlinked: data.ra6969.filter((record) => !record.linkedCaseNo).length,
    },
    {
      key: 'complaints',
      label: 'Complaints',
      total: data.complaints.length,
      linked: data.complaints.filter((record) => record.linkedCaseNo).length,
      unlinked: data.complaints.filter((record) => !record.linkedCaseNo).length,
    },
    {
      key: 'lbc',
      label: 'Document tracking (LBC)',
      total: data.lbc.length,
      linked: data.lbc.filter((record) => record.linkedCaseNo).length,
      unlinked: data.lbc.filter((record) => !record.linkedCaseNo).length,
    },
    {
      key: 'dpwh',
      label: 'DPWH compliance',
      total: data.dpwh.length,
      linked: data.dpwh.filter((record) => record.linkedCaseNo).length,
      unlinked: data.dpwh.filter((record) => !record.linkedCaseNo).length,
    },
  ]

  const recordsNoStatus =
    data.orders.filter((record) => !record.status).length +
    data.pabOrders.filter((record) => !record.status).length +
    data.erf.filter((record) => !record.status).length +
    data.pabPenalties.filter((record) => !record.status).length +
    data.ra6969.filter((record) => !record.status).length +
    data.lbc.filter((record) => !record.status).length +
    data.dpwh.filter((record) => !record.status).length

  return {
    totalCases: data.cases.length,
    numberedCases: data.cases.filter((caseRecord) => !caseRecord.isUnnumbered).length,
    unnumberedCases: data.cases.filter((caseRecord) => caseRecord.isUnnumbered).length,
    invalidDates: data.dataIssues.invalidDates.length,
    duplicateIisGroups: data.dataIssues.duplicateIis.length,
    duplicateIisCases: data.dataIssues.duplicateIis.reduce(
      (total, group) => total + group.cases.length,
      0,
    ),
    duplicateCaseNumbers: data.dataIssues.duplicateCaseNumbers.length,
    duplicateCaseCases: data.dataIssues.duplicateCaseNumbers.reduce(
      (total, group) => total + group.cases.length,
      0,
    ),
    masterIssueCount:
      data.dataIssues.invalidDates.length +
      data.dataIssues.duplicateIis.length +
      data.dataIssues.duplicateCaseNumbers.length +
      data.dataIssues.missingFields.length +
      data.dataIssues.unnumbered.length,
    casesMissingProvince: data.cases.filter((caseRecord) =>
      caseRecord.dataIssues.includes('Missing province'),
    ).length,
    casesMissingLocation: data.cases.filter((caseRecord) =>
      caseRecord.dataIssues.includes('Missing city / municipality'),
    ).length,
    casesMissingHandler: data.cases.filter((caseRecord) =>
      caseRecord.dataIssues.includes('Missing case handler'),
    ).length,
    casesMissingDocumentType: data.cases.filter((caseRecord) =>
      caseRecord.dataIssues.includes('Missing document type'),
    ).length,
    casesMissingIis: data.cases.filter((caseRecord) => !caseRecord.iisRef).length,
    recordsNoStatus,
    reconciliation,
  }
}

export function filterCases(cases: CaseRecord[], filters: CaseFilters): CaseRecord[] {
  const search = filters.search.trim().toLowerCase()
  return cases.filter((caseRecord) => {
    if (filters.province && (caseRecord.province || 'Unknown') !== filters.province) return false
    if (filters.location && caseRecord.location !== filters.location) return false
    if (filters.handler && (caseRecord.handler || 'Unassigned') !== filters.handler) return false
    if (filters.documentType && caseRecord.documentType !== filters.documentType) return false
    if (filters.stage && caseRecord.stage !== filters.stage) return false
    if (filters.flag && !caseRecord.flags.includes(filters.flag)) return false
    if (filters.month && monthKey(caseRecord.dateIso) !== filters.month) return false
    if (filters.dateFrom && (!caseRecord.dateIso || caseRecord.dateIso < filters.dateFrom)) return false
    if (filters.dateTo && (!caseRecord.dateIso || caseRecord.dateIso > filters.dateTo)) return false
    if (!search) return true
    return [
      caseRecord.caseNo,
      caseRecord.iisRef,
      caseRecord.establishment,
      caseRecord.proponent,
      caseRecord.location,
      caseRecord.province,
      caseRecord.handler,
      caseRecord.documentType,
      caseRecord.notes,
      caseRecord.flags.join(' '),
      caseRecord.violations.map((item) => item.value).join(' '),
    ]
      .join(' ')
      .toLowerCase()
      .includes(search)
  })
}

export interface CaseFilters {
  search: string
  province: string
  location: string
  handler: string
  documentType: string
  stage: string
  flag: string
  month: string
  dateFrom: string
  dateTo: string
}

export const EMPTY_FILTERS: CaseFilters = {
  search: '',
  province: '',
  location: '',
  handler: '',
  documentType: '',
  stage: '',
  flag: '',
  month: '',
  dateFrom: '',
  dateTo: '',
}

export function getFilterOptions(cases: CaseRecord[]) {
  const provinces = [...new Set(cases.map((caseRecord) => caseRecord.province || 'Unknown'))].sort()
  const locations = [...new Set(cases.map((caseRecord) => caseRecord.location).filter(Boolean))].sort()
  const handlers = [...new Set(cases.map((caseRecord) => caseRecord.handler || 'Unassigned'))].sort()
  const documentTypes = [...new Set(cases.map((caseRecord) => caseRecord.documentType).filter(Boolean))].sort()
  const flags = [...new Set(cases.flatMap((caseRecord) => caseRecord.flags))].sort()
  const months = uniqueBy(
    cases
      .map((caseRecord) => monthKey(caseRecord.dateIso))
      .filter((key): key is string => Boolean(key))
      .sort()
      .map((key) => ({ key, label: monthLabel(key) })),
    (item) => item.key,
  )
  return { provinces, locations, handlers, documentTypes, flags, months }
}
