import type {
  CaseRecord,
  Complaint,
  DpwhComplianceRecord,
  ErfPayment,
  LbcTrackRecord,
  OrderRecord,
  PabNovRecord,
  PabOrderRecord,
  PabPenalty,
  Ra6969Penalty,
  YearScope,
} from './types'

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const content = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => row.map(csvEscape).join(',')),
  ].join('\r\n')
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function scopeFilePart(scope?: YearScope): string {
  return scope && scope !== 'all' ? scope : 'all-years'
}

export function exportCases(cases: CaseRecord[], scope?: YearScope): void {
  downloadCsv(
    `emb7-${scopeFilePart(scope)}-cases-${today()}.csv`,
    [
      'Case No.',
      'Docket Year',
      'Source Year',
      'Raw Case No.',
      'IIS Reference',
      'Date Docketed',
      'Establishment',
      'Proponent',
      'Province',
      'Province Derived',
      'City / Municipality',
      'Barangay',
      'Address',
      'Document Type',
      'Handler',
      'Stage',
      'Flags',
      'PAB NOV Count',
      'Order Count',
      'PAB Order Count',
      'ERF Count',
      'PAB Penalty Count',
      'RA 6969 Count',
      'Complaint Count',
      'LBC Count',
      'DPWH Count',
      'Payment Pending',
      'Paid Amount',
      'Assessed Amount',
      'Last Action',
      'Notes',
      'Data Issues',
      'Match Basis',
    ],
    cases.map((caseRecord) => [
      caseRecord.displayCaseNo,
      caseRecord.docketYear ?? '',
      caseRecord.sourceYear,
      caseRecord.rawCaseNo,
      caseRecord.iisRef,
      caseRecord.dateIso ?? caseRecord.dateDocketed,
      caseRecord.establishment,
      caseRecord.proponent,
      caseRecord.province,
      caseRecord.provinceDerived ? 'Yes' : 'No',
      caseRecord.city || caseRecord.municipality,
      caseRecord.barangay,
      caseRecord.address,
      caseRecord.documentType,
      caseRecord.handler,
      caseRecord.stageLabel,
      caseRecord.flags.join('; '),
      caseRecord.pabNov.length,
      caseRecord.orders.length,
      caseRecord.pabOrders.length,
      caseRecord.erf.length,
      caseRecord.pabPenalties.length,
      caseRecord.ra6969.length,
      caseRecord.complaints.length,
      caseRecord.lbc.length,
      caseRecord.dpwh.length,
      caseRecord.pendingPayment ? 'Yes' : 'No',
      caseRecord.paidAmount,
      caseRecord.assessedAmount,
      caseRecord.lastActionDate ?? '',
      caseRecord.notes,
      caseRecord.dataIssues.join('; '),
      caseRecord.matchBasis.join('; '),
    ]),
  )
}

export function exportPabNov(records: PabNovRecord[], scope?: YearScope): void {
  downloadCsv(
    `emb7-${scopeFilePart(scope)}-pab-nov-${today()}.csv`,
    [
      'PAB Case No.',
      'A/W',
      'IIS Reference',
      'Date Docketed',
      'Establishment',
      'Proponent',
      'Province',
      'City / Municipality',
      'Barangay',
      'Document Type',
      'Violations',
      'Source Year',
      'Docket Year',
      'Linked Case',
      'Match Basis',
    ],
    records.map((record) => [
      record.pabCaseNo,
      record.aw,
      record.iisRef,
      record.dateIso ?? record.dateDocketed,
      record.establishment,
      record.proponent,
      record.province,
      record.city || record.municipality,
      record.barangay,
      record.documentType,
      record.violations.join('; '),
      record.sourceYear,
      record.docketYear ?? '',
      record.linkedCaseNo ?? '',
      record.matchBasis,
    ]),
  )
}

export function exportOrders(records: OrderRecord[], scope?: YearScope): void {
  downloadCsv(
    `emb7-${scopeFilePart(scope)}-orders-resolutions-${today()}.csv`,
    [
      'Company',
      'Case No.',
      'IIS Reference',
      'Action Date',
      'Document Type',
      'Violation',
      'Status',
      'Amount',
      'Province',
      'City / Municipality',
      'Source Year',
      'Docket Year',
      'Linked Case',
      'Match Basis',
    ],
    records.map((record) => [
      record.company,
      record.caseNo,
      record.iisRef,
      record.dateIso ?? record.date,
      record.documentType,
      record.violation,
      record.status,
      record.amount,
      record.province,
      record.city || record.municipality,
      record.sourceYear,
      record.docketYear ?? '',
      record.linkedCaseNo ?? '',
      record.matchBasis,
    ]),
  )
}

export function exportPabOrders(records: PabOrderRecord[], scope?: YearScope): void {
  downloadCsv(
    `emb7-${scopeFilePart(scope)}-pab-orders-resolutions-${today()}.csv`,
    [
      'Company',
      'PAB Case No.',
      'IIS Reference',
      'Date Issued',
      'Document Type',
      'Violation',
      'Status',
      'Amount',
      'Province',
      'City / Municipality',
      'Source Year',
      'Docket Year',
      'Linked Case',
      'Match Basis',
    ],
    records.map((record) => [
      record.company,
      record.pabCaseNo,
      record.iisRef,
      record.dateIso ?? record.dateIssued,
      record.documentType,
      record.violation,
      record.status,
      record.amount,
      record.province,
      record.city || record.municipality,
      record.sourceYear,
      record.docketYear ?? '',
      record.linkedCaseNo ?? '',
      record.matchBasis,
    ]),
  )
}

export function exportErf(records: ErfPayment[], scope?: YearScope): void {
  downloadCsv(
    `emb7-${scopeFilePart(scope)}-erf-payments-${today()}.csv`,
    [
      'Company',
      'Case No.',
      'Amount',
      'OR Number',
      'Date of Payment',
      'Status',
      'Source Year',
      'Docket Year',
      'Linked Case',
      'Match Basis',
    ],
    records.map((record) => [
      record.company,
      record.caseNo,
      record.amount,
      record.orNumber,
      record.dateIso ?? record.date,
      record.status,
      record.sourceYear,
      record.docketYear ?? '',
      record.linkedCaseNo ?? '',
      record.matchBasis,
    ]),
  )
}

export function exportPabPenalties(records: PabPenalty[], scope?: YearScope): void {
  downloadCsv(
    `emb7-${scopeFilePart(scope)}-pab-penalties-${today()}.csv`,
    [
      'Company',
      'PAB Case No.',
      'Amount',
      'OR Number',
      'Date of Payment',
      'Status',
      'Subtype',
      'Source Year',
      'Docket Year',
      'Linked Case',
      'Match Basis',
    ],
    records.map((record) => [
      record.company,
      record.pabCaseNo,
      record.amount,
      record.orNumber,
      record.dateIso ?? record.date,
      record.status,
      record.subtype,
      record.sourceYear,
      record.docketYear ?? '',
      record.linkedCaseNo ?? '',
      record.matchBasis,
    ]),
  )
}

export function exportRa6969(records: Ra6969Penalty[], scope?: YearScope): void {
  downloadCsv(
    `emb7-${scopeFilePart(scope)}-ra6969-penalties-${today()}.csv`,
    [
      'Company',
      'Case No.',
      'Amount',
      'OR Number',
      'Date of Payment',
      'Status',
      'Subtype',
      'Source Year',
      'Docket Year',
      'Linked Case',
      'Match Basis',
    ],
    records.map((record) => [
      record.company,
      record.caseNo,
      record.amount,
      record.orNumber,
      record.dateIso ?? record.date,
      record.status,
      record.subtype,
      record.sourceYear,
      record.docketYear ?? '',
      record.linkedCaseNo ?? '',
      record.matchBasis,
    ]),
  )
}

export function exportComplaints(records: Complaint[], scope?: YearScope): void {
  downloadCsv(
    `emb7-${scopeFilePart(scope)}-complaints-${today()}.csv`,
    [
      'Date Received',
      'IIS Reference',
      'Mode',
      'Subject',
      'Complainant',
      'Respondent',
      'Actions Taken',
      'Source Year',
      'Docket Year',
      'Linked Case',
      'Match Basis',
    ],
    records.map((record) => [
      record.dateIso ?? record.date,
      record.iisRef,
      record.mode,
      record.subject,
      record.complainant,
      record.respondent,
      record.actions,
      record.sourceYear,
      record.docketYear ?? '',
      record.linkedCaseNo ?? '',
      record.matchBasis,
    ]),
  )
}

export function exportLbc(records: LbcTrackRecord[], scope?: YearScope): void {
  downloadCsv(
    `emb7-${scopeFilePart(scope)}-lbc-tracking-${today()}.csv`,
    [
      'IIS Reference',
      'Document Type',
      'DENR Case / PAB Docket',
      'Respondent',
      'Date Outbound',
      'LBC Status',
      'Date Returned',
      'LBC Tracking No.',
      'Date Closed',
      'Status After LBC',
      'Actions If Returned',
      'Reply Date',
      'Update',
      'With Resolution',
      'Source Year',
      'Linked Case',
      'Match Basis',
    ],
    records.map((record) => [
      record.iisRef,
      record.documentType,
      record.caseNo,
      record.respondent,
      record.dateOutboundIso ?? record.dateOutbound,
      record.status,
      record.dateReturnedIso ?? record.dateReturned,
      record.trackingNo,
      record.dateClosedIso ?? record.dateClosed,
      record.statusAfterLbc,
      record.actionsIfReturned,
      record.replyDateIso ?? record.replyDate,
      record.update,
      record.withResolution,
      record.sourceYear,
      record.linkedCaseNo ?? '',
      record.matchBasis,
    ]),
  )
}

export function exportDpwh(records: DpwhComplianceRecord[], scope?: YearScope): void {
  downloadCsv(
    `emb7-${scopeFilePart(scope)}-dpwh-compliance-${today()}.csv`,
    [
      'Project',
      'IIS Reference',
      'Commitment / Agreement',
      'Due Date',
      'Status',
      'Remarks',
      'Source Year',
      'Linked Case',
      'Match Basis',
    ],
    records.map((record) => [
      record.project,
      record.iisRef,
      record.commitment,
      record.dueDateIso ?? record.dueDate,
      record.status,
      record.remarks,
      record.sourceYear,
      record.linkedCaseNo ?? '',
      record.matchBasis,
    ]),
  )
}
