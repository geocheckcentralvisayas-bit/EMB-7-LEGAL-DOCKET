export type Page =
  | 'overview'
  | 'tracker'
  | 'enforcement'
  | 'payments'
  | 'complaints'
  | 'tracking'
  | 'compliance'
  | 'quality'

export type YearScope = 'all' | string

export interface TabData {
  key: string
  title: string
  headers: string[]
  rows: string[][]
}

export interface SourceTabConfig {
  key: string
  title: string
  gid?: string
  sheet?: string
  range: string
  hasHeader?: boolean
}

export interface SourceConfig {
  year: string
  label: string
  sheetId: string
  sourceUrl: string
  dataThrough?: string
  live?: boolean
  coverage?: string[]
  tabs: SourceTabConfig[]
}

export interface SourceSnapshot {
  year: string
  label: string
  sheetId: string
  sourceUrl: string
  dataDate: string
  coverage?: string[]
  tabs: Record<string, TabData>
}

export interface Snapshot {
  fetchedAt: string
  dataDate: string
  sources: SourceSnapshot[]
  counts?: {
    masterCases: number
    byYear?: Record<string, number>
    tabs?: Record<string, Record<string, number>>
  }
  warnings?: string[]
}

export interface DashboardSource {
  year: string
  label: string
  sheetId: string
  sourceUrl: string
  dataDate: string
  coverage: string[]
  tabCounts: Record<string, number>
}

export type StageKey = 'nov' | 'pabNov' | 'order' | 'pabOrder' | 'payment'

export const STAGE_META: Record<
  StageKey,
  { label: string; short: string; order: number; color: string; text: string; bg: string }
> = {
  nov: {
    label: 'NOV issued',
    short: 'NOV',
    order: 0,
    color: '#64748b',
    text: 'text-slate-600',
    bg: 'bg-white/50',
  },
  pabNov: {
    label: 'PAB NOV issued',
    short: 'PAB NOV',
    order: 1,
    color: '#c47a12',
    text: 'text-amber-800',
    bg: 'bg-amber-100/70',
  },
  order: {
    label: 'Order / Resolution',
    short: 'Order',
    order: 2,
    color: '#0e7490',
    text: 'text-sky-800',
    bg: 'bg-sky-100/70',
  },
  pabOrder: {
    label: 'PAB Order / Resolution',
    short: 'PAB Order',
    order: 3,
    color: '#4d7c0f',
    text: 'text-lime-900',
    bg: 'bg-lime-100/70',
  },
  payment: {
    label: 'Payment recorded',
    short: 'Paid',
    order: 4,
    color: '#15803d',
    text: 'text-emerald-800',
    bg: 'bg-emerald-100/70',
  },
}

export interface ViolationItem {
  law: string
  stage: 'Monitoring' | 'Permitting'
  value: string
  key: string
}

export interface YearFields {
  sourceYear: string
  docketYear: string | null
}

export interface PabNovRecord extends YearFields {
  id: string
  pabCaseNo: string
  aw: string
  iisRef: string
  dateDocketed: string
  dateIso: string | null
  establishment: string
  proponent: string
  province: string
  city: string
  municipality: string
  barangay: string
  address: string
  documentType: string
  violations: string[]
  linkedCaseNo: string | null
  matchBasis: string
}

export interface OrderRecord extends YearFields {
  id: string
  company: string
  caseNo: string
  iisRef: string
  dateIssued: string
  dateReleased: string
  date: string
  dateIso: string | null
  documentType: string
  violation: string
  status: string
  amount: number
  province: string
  city: string
  municipality: string
  barangay: string
  address: string
  linkedCaseNo: string | null
  matchBasis: string
}

export interface PabOrderRecord extends YearFields {
  id: string
  company: string
  pabCaseNo: string
  iisRef: string
  dateIssued: string
  dateIso: string | null
  documentType: string
  violation: string
  status: string
  amount: number
  province: string
  city: string
  municipality: string
  barangay: string
  address: string
  linkedCaseNo: string | null
  matchBasis: string
}

export interface ErfPayment extends YearFields {
  id: string
  company: string
  caseNo: string
  amount: number
  orNumber: string
  date: string
  dateIso: string | null
  status: string
  province: string
  linkedCaseNo: string | null
  matchBasis: string
}

export interface PabPenalty extends YearFields {
  id: string
  company: string
  pabCaseNo: string
  amount: number
  orNumber: string
  date: string
  dateIso: string | null
  status: string
  subtype: string
  linkedCaseNo: string | null
  matchBasis: string
}

export interface Ra6969Penalty extends YearFields {
  id: string
  company: string
  caseNo: string
  amount: number
  orNumber: string
  date: string
  dateIso: string | null
  status: string
  subtype: string
  linkedCaseNo: string | null
  matchBasis: string
}

export interface Complaint extends YearFields {
  id: string
  date: string
  dateIso: string | null
  iisRef: string
  mode: string
  subject: string
  complainant: string
  complainantContact: string
  respondent: string
  address: string
  province: string
  status: string
  handler: string
  remarks: string
  actions: string
  linkedCaseNo: string | null
  matchBasis: string
}

export interface NoNovTc extends YearFields {
  id: string
  iisRef: string
  name: string
  address: string
  date: string
  dateIso: string | null
  type: string
  linkedCaseNo: string | null
  matchBasis: string
}

export interface LbcTrackRecord extends YearFields {
  id: string
  iisRef: string
  documentType: string
  caseNo: string
  respondent: string
  dateOutbound: string
  dateOutboundIso: string | null
  status: string
  dateReturned: string
  dateReturnedIso: string | null
  trackingNo: string
  dateClosed: string
  dateClosedIso: string | null
  statusAfterLbc: string
  actionsIfReturned: string
  replyDate: string
  replyDateIso: string | null
  update: string
  withResolution: string
  linkedCaseNo: string | null
  matchBasis: string
}

export interface DpwhComplianceRecord extends YearFields {
  id: string
  project: string
  iisRef: string
  commitment: string
  dueDate: string
  dueDateIso: string | null
  status: string
  remarks: string
  linkedCaseNo: string | null
  matchBasis: string
}

export interface CaseRecord extends YearFields {
  id: string
  caseNo: string
  displayCaseNo: string
  rawCaseNo: string
  isUnnumbered: boolean
  iisRef: string
  dateDocketed: string
  dateIso: string | null
  establishment: string
  proponent: string
  email: string
  contact: string
  province: string
  provinceDerived: boolean
  city: string
  municipality: string
  barangay: string
  address: string
  location: string
  documentType: string
  handler: string
  notes: string
  violations: ViolationItem[]
  pabNov: PabNovRecord[]
  orders: OrderRecord[]
  pabOrders: PabOrderRecord[]
  erf: ErfPayment[]
  pabPenalties: PabPenalty[]
  ra6969: Ra6969Penalty[]
  complaints: Complaint[]
  lbc: LbcTrackRecord[]
  dpwh: DpwhComplianceRecord[]
  stage: StageKey
  stageLabel: string
  flags: string[]
  pendingPayment: boolean
  paidAmount: number
  assessedAmount: number
  lastActionDate: string | null
  ageDays: number | null
  linkCount: number
  matchBasis: string[]
  dataIssues: string[]
}

export interface InvalidDateIssue {
  caseNo: string
  establishment: string
  rawDate: string
}

export interface DuplicateIisIssue {
  iisRef: string
  cases: { caseNo: string; establishment: string }[]
}

export interface DuplicateCaseIssue {
  caseNo: string
  cases: { caseNo: string; establishment: string; year: string }[]
}

export interface MissingFieldCase {
  caseNo: string
  establishment: string
  missing: string[]
}

export interface UnlinkedGroups {
  pabNov: PabNovRecord[]
  orders: OrderRecord[]
  pabOrders: PabOrderRecord[]
  erf: ErfPayment[]
  pabPenalties: PabPenalty[]
  ra6969: Ra6969Penalty[]
  complaints: Complaint[]
  lbc: LbcTrackRecord[]
  dpwh: DpwhComplianceRecord[]
}

export interface DataIssues {
  invalidDates: InvalidDateIssue[]
  unnumbered: CaseRecord[]
  duplicateIis: DuplicateIisIssue[]
  duplicateCaseNumbers: DuplicateCaseIssue[]
  missingFields: MissingFieldCase[]
  unlinked: UnlinkedGroups
}

/**
 * Audit of the dashboard-wide Negros Oriental / Siquijor exclusion.
 * Counts are measured before the exclusion pass and shown on Data Quality.
 */
export interface ExclusionAudit {
  provinces: string[]
  excludedCases: number
  casesByYear: Record<string, number>
  excludedRecords: number
  recordsByType: Record<string, number>
  ambiguousCases: number
  ambiguousByYear: Record<string, number>
  placeholdersSkipped: number
  placeholdersByYear: Record<string, number>
  retainedCases: number
}

export interface DashboardData {
  fetchedAt: string
  dataDate: string
  sourceUrl: string
  scope: YearScope
  scopeLabel: string
  timelineStart: string
  docketYears: string[]
  sources: DashboardSource[]
  cases: CaseRecord[]
  pabNov: PabNovRecord[]
  orders: OrderRecord[]
  pabOrders: PabOrderRecord[]
  erf: ErfPayment[]
  pabPenalties: PabPenalty[]
  ra6969: Ra6969Penalty[]
  complaints: Complaint[]
  noNovTc: NoNovTc[]
  lbc: LbcTrackRecord[]
  dpwh: DpwhComplianceRecord[]
  dataIssues: DataIssues
  exclusions: ExclusionAudit
}
