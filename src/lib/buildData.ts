import {
  type CaseRecord,
  type Complaint,
  type DashboardData,
  type DashboardSource,
  type DataIssues,
  type DpwhComplianceRecord,
  type ExclusionAudit,
  type DuplicateCaseIssue,
  type DuplicateIisIssue,
  type ErfPayment,
  type InvalidDateIssue,
  type LbcTrackRecord,
  type MissingFieldCase,
  type NoNovTc,
  type OrderRecord,
  type PabNovRecord,
  type PabOrderRecord,
  type PabPenalty,
  type Ra6969Penalty,
  type Snapshot,
  type SourceSnapshot,
  type ViolationItem,
  type YearScope,
  STAGE_META,
} from './types'
import {
  cleanText,
  dayDiff,
  deriveProvince,
  displayLocation,
  hasAmbiguousLocation,
  hasIdentifiableLocation,
  isExcludedLocation,
  isExcludedProvince,
  isPaid,
  isPending,
  normalizeCaseNo,
  normalizeIis,
  normalizeName,
  normalizePab,
  parseAw,
  parseDate,
  parseMoney,
  SOURCE_NOT_RECORDED,
  uniqueBy,
} from './utils'

const SOURCE_NOT_STATED = 'Not stated in source'

const VIOLATION_COLUMNS_2026: {
  index: number
  law: string
  stage: 'Monitoring' | 'Permitting'
  label?: string
}[] = [
  { index: 13, law: 'PD 1586', stage: 'Monitoring' },
  { index: 14, law: 'PD 1586', stage: 'Permitting' },
  { index: 15, law: 'PD 1586', stage: 'Monitoring', label: 'Non-submission of CMR' },
  { index: 16, law: 'RA 6969', stage: 'Monitoring' },
  { index: 17, law: 'RA 6969', stage: 'Permitting' },
  { index: 18, law: 'RA 9275', stage: 'Monitoring' },
  { index: 19, law: 'RA 9275', stage: 'Permitting' },
  { index: 20, law: 'RA 8749', stage: 'Monitoring' },
  { index: 21, law: 'RA 8749', stage: 'Permitting' },
]

const VIOLATION_COLUMNS_2025: {
  index: number
  law: string
  stage?: 'Monitoring' | 'Permitting'
  label?: string
}[] = [
  { index: 6, law: 'PD 1586' },
  { index: 7, law: 'RA 6969', stage: 'Monitoring' },
  { index: 8, law: 'RA 8749' },
  { index: 9, law: 'RA 9275' },
  { index: 10, law: 'RA 8749', stage: 'Monitoring' },
  { index: 11, law: 'PD 1586', stage: 'Monitoring', label: 'Non-submission of CMR' },
  { index: 12, law: 'RA 9275', stage: 'Monitoring', label: 'No SMR submission' },
  { index: 13, law: 'PD 1586', stage: 'Monitoring', label: 'Cease and desist order' },
  { index: 14, law: 'PD 1586', stage: 'Monitoring', label: 'Stoppage order' },
]

// 2023/2024 master layout: violations at I–N and P–U.
const VIOLATION_COLUMNS_2023: {
  index: number
  law: string
  stage: 'Monitoring' | 'Permitting'
}[] = [
  { index: 8, law: 'PD 1586', stage: 'Monitoring' },
  { index: 9, law: 'RA 9275', stage: 'Monitoring' },
  { index: 10, law: 'RA 8749', stage: 'Monitoring' },
  { index: 11, law: 'RA 6969', stage: 'Monitoring' },
  { index: 15, law: 'PD 1586', stage: 'Permitting' },
  { index: 16, law: 'RA 9275', stage: 'Permitting' },
  { index: 17, law: 'RA 8749', stage: 'Permitting' },
  { index: 18, law: 'RA 6969', stage: 'Permitting' },
]

// 2024 master layout: violations at H–M and O–T.
const VIOLATION_COLUMNS_2024: {
  index: number
  law: string
  stage: 'Monitoring' | 'Permitting'
}[] = [
  { index: 7, law: 'PD 1586', stage: 'Monitoring' },
  { index: 8, law: 'RA 9275', stage: 'Monitoring' },
  { index: 9, law: 'RA 8749', stage: 'Monitoring' },
  { index: 10, law: 'RA 6969', stage: 'Monitoring' },
  { index: 14, law: 'PD 1586', stage: 'Permitting' },
  { index: 15, law: 'RA 9275', stage: 'Permitting' },
  { index: 16, law: 'RA 8749', stage: 'Permitting' },
  { index: 17, law: 'RA 6969', stage: 'Permitting' },
]

function isBlankStatus(value: string): boolean {
  const status = cleanText(value).toUpperCase()
  return !status || status === 'FALSE' || status === 'N/A' || status === '-'
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s/(])([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`)
}

export function violationFlag(item: ViolationItem): string {
  const value = item.value.toUpperCase()
  if (value.includes('CMR')) return 'CMR non-submission'
  if (value.includes('WITHOUT ECC')) return 'Without ECC'
  if (value.includes('ECC CONDITION')) return 'ECC conditions'
  if (value.includes('WITHOUT HWID')) return 'Without HWID'
  if (value.includes('WITHOUT DP')) return 'Without DP'
  if (value.includes('WITHOUT PO')) return 'Without PO'
  if (value.includes('EXCEEDANCE')) return 'Exceedance'
  if (value.includes('SECTION 27')) return 'Section 27 (RA 9275)'
  if (value.includes('NO PCO')) return 'No PCO accreditation'
  if (value.includes('NO SMR')) return 'No SMR submission'
  if (value.includes('CEASE AND DESIST')) return 'Cease and desist'
  if (value.includes('STOPPAGE')) return 'Stoppage order'
  return titleCase(item.value)
}

function noteFlags(notes: string): string[] {
  const upper = notes.toUpperCase()
  const flags: string[] = []
  if (upper.includes('NON-PERFORMANCE') || upper.includes('NON PERFORMANCE')) {
    flags.push('Non-performance')
  }
  if (upper.includes('COMPLAINT')) flags.push('Complaint noted')
  if (upper.includes('PCO')) flags.push('PCO concern')
  return flags
}

function addViolation(
  items: ViolationItem[],
  raw: string,
  law: string,
  stage: 'Monitoring' | 'Permitting',
  label?: string,
) {
  const value = cleanText(raw)
  if (!value || value.toUpperCase() === 'FALSE' || value.toUpperCase() === 'N/A') return
  const display =
    label && value.toUpperCase() === 'TRUE'
      ? label
      : label
        ? `${label} (${value})`
        : value
  items.push({
    law,
    stage,
    value: display,
    key: `${law}|${stage}|${display}`,
  })
}

function makeMasterViolations2026(row: string[]): ViolationItem[] {
  const items: ViolationItem[] = []
  for (const column of VIOLATION_COLUMNS_2026) {
    addViolation(items, row[column.index], column.law, column.stage, column.label)
  }
  return uniqueBy(items, (item) => item.key)
}

function stageFromValue(value: string): 'Monitoring' | 'Permitting' {
  return cleanText(value).toUpperCase().includes('(PER)') ? 'Permitting' : 'Monitoring'
}

function makeMasterViolations2025(row: string[]): ViolationItem[] {
  const items: ViolationItem[] = []
  for (const column of VIOLATION_COLUMNS_2025) {
    const raw = cleanText(row[column.index])
    if (!raw || raw.toUpperCase() === 'FALSE' || raw.toUpperCase() === 'N/A') continue
    const stage = column.stage ?? stageFromValue(raw)
    addViolation(items, raw, column.law, stage, column.label)
  }
  return uniqueBy(items, (item) => item.key)
}

function makeMasterViolations2021(row: string[]): ViolationItem[] {
  const items: ViolationItem[] = []
  addViolation(items, row[10], 'PD 1586', 'Monitoring')
  addViolation(items, row[11], 'RA 9275', 'Monitoring')
  addViolation(items, row[12], 'RA 8749', 'Monitoring')
  addViolation(items, row[13], 'RA 6969', 'Monitoring')
  if (cleanText(row[14]).toUpperCase() === 'TRUE') items.push({ law: 'PD 1586', stage: 'Monitoring', value: 'No PCO accreditation', key: 'PD 1586|Monitoring|No PCO accreditation' })
  if (cleanText(row[15]).toUpperCase() === 'TRUE') items.push({ law: 'PD 1586', stage: 'Monitoring', value: 'Non-performance', key: 'PD 1586|Monitoring|Non-performance' })
  return uniqueBy(items, (item) => item.key)
}

function makeMasterViolations2022(row: string[]): ViolationItem[] {
  const items: ViolationItem[] = []
  addViolation(items, row[8], 'PD 1586', 'Monitoring');
  addViolation(items, row[9], 'RA 9275', 'Monitoring');
  addViolation(items, row[10], 'RA 8749', 'Monitoring');
  addViolation(items, row[11], 'RA 6969', 'Monitoring');
  if (cleanText(row[12]).toUpperCase() === 'TRUE') items.push({ law: 'PD 1586', stage: 'Monitoring', value: 'Non-submission of CMR', key: 'PD 1586 Monitoring Non-submission of CMR' });
  if (cleanText(row[13]).toUpperCase() === 'TRUE') items.push({ law: 'PD 1586', stage: 'Monitoring', value: 'No PCO accreditation', key: 'PD 1586 Monitoring No PCO accreditation' });
  if (cleanText(row[14]).toUpperCase() === 'TRUE') items.push({ law: 'RA 9275', stage: 'Monitoring', value: 'No SMR submission', key: 'RA 9275 Monitoring No SMR submission' });
  addViolation(items, row[15], 'PD 1586', 'Permitting');
  addViolation(items, row[16], 'RA 9275', 'Permitting');
  addViolation(items, row[17], 'RA 8749', 'Permitting');
  addViolation(items, row[18], 'RA 6969', 'Permitting');
  if (cleanText(row[19]).toUpperCase() === 'TRUE') items.push({ law: 'PD 1586', stage: 'Monitoring', value: 'Cease and desist order', key: 'PD 1586 Monitoring Cease and desist order' });
  if (cleanText(row[20]).toUpperCase() === 'TRUE') items.push({ law: 'PD 1586', stage: 'Monitoring', value: 'Stoppage order', key: 'PD 1586 Monitoring Stoppage order' });
  return uniqueBy(items, (item) => item.key);
}

function makeMasterViolations2023(row: string[]): ViolationItem[] {
  const items: ViolationItem[] = []
  for (const column of VIOLATION_COLUMNS_2023) {
    addViolation(items, row[column.index], column.law, column.stage)
  }
  return uniqueBy(items, (item) => item.key)
}

function makeMasterViolations2024(row: string[]): ViolationItem[] {
  const items: ViolationItem[] = []
  for (const column of VIOLATION_COLUMNS_2024) {
    addViolation(items, row[column.index], column.law, column.stage)
  }
  return uniqueBy(items, (item) => item.key)
}

function makePabViolations2026(row: string[]): string[] {
  const values: string[] = []
  const add = (value: string, label: string) => {
    const raw = cleanText(value)
    if (!raw || raw.toUpperCase() === 'FALSE' || raw.toUpperCase() === 'N/A') return
    values.push(label ? label : raw)
  }
  add(row[14], `RA 9275 · Monitoring: ${cleanText(row[14])}`)
  add(row[15], `RA 9275 · Permitting: ${cleanText(row[15])}`)
  if (cleanText(row[16]).toUpperCase() === 'TRUE') values.push('No PCO accreditation')
  add(row[17], `RA 8749 · Monitoring: ${cleanText(row[17])}`)
  add(row[18], `RA 8749 · Permitting: ${cleanText(row[18])}`)
  if (cleanText(row[19]).toUpperCase() === 'TRUE') values.push('No SMR submission')
  return [...new Set(values)]
}

function makePabViolations2025(row: string[]): string[] {
  const values: string[] = []
  const add = (value: string, label: string) => {
    const raw = cleanText(value)
    if (!raw || raw.toUpperCase() === 'FALSE' || raw.toUpperCase() === 'N/A') return
    values.push(`${label}: ${raw}`)
  }
  add(row[6], 'RA 8749')
  add(row[7], 'RA 9275')
  add(row[8], 'PCO accreditation')
  if (cleanText(row[9]).toUpperCase() === 'TRUE') {
    values.push('No SMR submission')
  } else {
    add(row[9], 'No SMR submission')
  }
  return [...new Set(values)]
}

function makePabViolationsHistorical(
  row: string[],
  columns: { index: number; law: string; stage: 'Monitoring' | 'Permitting' }[],
): string[] {
  const values: string[] = []
  for (const column of columns) {
    const raw = cleanText(row[column.index])
    if (!raw || raw.toUpperCase() === 'FALSE' || raw.toUpperCase() === 'N/A') continue
    values.push(`${column.law} · ${column.stage}: ${raw}`)
  }
  return [...new Set(values)]
}

function statusHas(status: string, needle: string): boolean {
  return cleanText(status).toUpperCase().includes(needle)
}

function pushMap<T>(map: Map<string, T[]>, key: string, value: T) {
  if (!key) return
  const list = map.get(key) ?? []
  list.push(value)
  map.set(key, list)
}

function buildCasesForSource(source: SourceSnapshot): CaseRecord[] {
  const master = source.tabs.master
  if (!master) return []
  const cases: CaseRecord[] = []
  const is2021 = source.year === '2021'
  const is2022 = source.year === '2022'
  const is2023 = source.year === '2023'
  const is2024 = source.year === '2024'
  const is2025 = source.year === '2025'
  const isHistorical = is2021 || is2022 || is2023 || is2024

  master.rows.forEach((row, index) => {
    // 2023: case number lives in column B (index 1); 2024+ in column A.
    const rawCaseNo = cleanText(is2021 ? row[0] : is2022 || is2023 ? row[1] : row[0])
    if (rawCaseNo.toUpperCase() === 'CASE NO.' || rawCaseNo.toUpperCase() === 'CASE NUMBER') {
      return
    }

    const iisRef = cleanText(is2021 ? row[1] : is2022 || is2023 ? row[2] : row[1])
    const establishment = cleanText(is2021 ? row[5] : is2022 || is2023 ? row[4] : row[3])
    const dateDocketed = cleanText(is2021 ? row[2] : is2022 || is2023 ? row[3] : row[2])
    const normalizedCaseNo = normalizeCaseNo(rawCaseNo)
    const isNumbered = /^20\d{2}-\d{4}$/.test(normalizedCaseNo)
    if (source.year === '2022' && index < 3) (globalThis as any).__dbg2022 = { index, rawCaseNo, normalizedCaseNo, isNumbered, iisRef, establishment }
    if (!isNumbered && !(iisRef && establishment)) return
    // Skip pre-numbered placeholder rows that contain no actual case data.
    if (isHistorical && isNumbered && !establishment) return

    const dateIso = parseDate(dateDocketed)

    let address = ''
    let province = ''
    let city = ''
    let municipality = ''
    let barangay = ''
    let handler = ''
    let documentType = SOURCE_NOT_RECORDED
    let notes = ''
    let proponent = ''
    let violations: ViolationItem[] = []

    if (is2021) {
      address = cleanText(row[6])
      province = deriveProvince(address)
      proponent = cleanText(row[7])
      handler = cleanText(row[16])
      documentType = cleanText(row[4])
      notes = cleanText([row[18], row[19], row[20]].filter(Boolean).join(' | '))
      violations = makeMasterViolations2021(row)
    } else if (is2022) {
      address = cleanText(row[5])
      province = deriveProvince(address)
      proponent = cleanText(row[6])
      handler = cleanText(row[21])
      notes = cleanText([row[23], row[24]].filter(Boolean).join(' | '))
      violations = makeMasterViolations2022(row)
    } else if (is2023) {
      address = cleanText(row[5])
      province = deriveProvince(address)
      proponent = cleanText(row[6])
      handler = cleanText(row[21])
      violations = makeMasterViolations2023(row)
    } else if (is2024) {
      address = cleanText(row[4])
      province = deriveProvince(address)
      proponent = cleanText(row[5])
      handler = cleanText(row[20])
      notes = cleanText(row[21])
      violations = makeMasterViolations2024(row)
    } else if (is2025) {
      address = cleanText(row[4])
      province = deriveProvince(address)
      proponent = cleanText(row[5])
      handler = cleanText(row[15])
      violations = makeMasterViolations2025(row)
    } else {
      address = cleanText(row[11])
      province = cleanText(row[7])
      city = cleanText(row[8])
      municipality = cleanText(row[9])
      barangay = cleanText(row[10])
      proponent = cleanText(row[4])
      handler = cleanText(row[22])
      documentType = cleanText(row[12])
      notes = cleanText(row[23])
      violations = makeMasterViolations2026(row)
    }

    const dataIssues: string[] = []
    if (!isNumbered) dataIssues.push('Missing case number')
    if (!dateIso) {
      dataIssues.push(dateDocketed ? `Invalid docket date: ${dateDocketed}` : 'Missing docket date')
    }
    if (!handler) dataIssues.push('Missing case handler')
    // 2023/2024/2025 master registers do not carry province/city/document-type
    // columns; absence is a source schema limitation, not a data-quality failure.
    if (source.year === '2026') {
      if (!province) dataIssues.push('Missing province')
      if (!city && !municipality) dataIssues.push('Missing city / municipality')
      if (!documentType) dataIssues.push('Missing document type')
    }

    const caseRecord: CaseRecord = {
      id: `case-${source.year}-${index + 1}`,
      caseNo: isNumbered ? normalizedCaseNo : 'UNNUMBERED',
      displayCaseNo: isNumbered ? normalizedCaseNo : 'UNNUMBERED',
      rawCaseNo,
      isUnnumbered: !isNumbered,
      iisRef,
      dateDocketed,
      dateIso,
      establishment,
      proponent,
      email: source.year === '2026' ? cleanText(row[5]) : '',
      contact: source.year === '2026' ? cleanText(row[6]) : '',
      province,
      provinceDerived: (isHistorical || is2025) && Boolean(province),
      city,
      municipality,
      barangay,
      address,
      location:
        isHistorical && !province
          ? cleanText(address) || SOURCE_NOT_RECORDED
          : is2025 || isHistorical
            ? displayLocation(province)
            : city || municipality || SOURCE_NOT_RECORDED,
      documentType,
      handler,
      notes,
      violations,
      pabNov: [],
      orders: [],
      pabOrders: [],
      erf: [],
      pabPenalties: [],
      ra6969: [],
      complaints: [],
      lbc: [],
      dpwh: [],
      stage: 'nov',
      stageLabel: STAGE_META.nov.label,
      flags: [],
      pendingPayment: false,
      paidAmount: 0,
      assessedAmount: 0,
      lastActionDate: dateIso,
      ageDays: dayDiff(dateIso, source.dataDate),
      linkCount: 0,
      matchBasis: [],
      dataIssues,
      sourceYear: source.year,
      docketYear: source.year,
    }

    cases.push(caseRecord)
  })

  return cases
}

function buildPabNovForSource(source: SourceSnapshot): PabNovRecord[] {
  const tab = source.tabs.pabNov
  if (!tab) return []
  const records: PabNovRecord[] = []
  const is2023 = source.year === '2023'
  const is2024 = source.year === '2024'
  const is2025 = source.year === '2025'

  tab.rows.forEach((row, index) => {
    // 2023 has a leading slash column; 2024+ starts at column A.
    const pabCaseNo = cleanText(is2023 ? row[1] : row[0])
    if (!/^07-/i.test(pabCaseNo)) return

    let address = ''
    let province = ''
    let city = ''
    let municipality = ''
    let barangay = ''
    let documentType = ''
    let establishment = ''
    let proponent = ''
    let dateDocketed = ''
    let iisRef = ''
    let aw = ''

    if (is2023 || is2024) {
      const offset = is2023 ? 2 : 1
      iisRef = cleanText(row[offset])
      dateDocketed = cleanText(row[offset + 1])
      establishment = cleanText(row[offset + 2])
      address = cleanText(row[offset + 3])
      proponent = cleanText(row[offset + 4])
      province = deriveProvince(address)
      documentType = SOURCE_NOT_RECORDED
      aw = parseAw(pabCaseNo)
    } else if (is2025) {
      iisRef = cleanText(row[1])
      dateDocketed = cleanText(row[2])
      establishment = cleanText(row[3])
      address = cleanText(row[4])
      province = deriveProvince(address)
      proponent = cleanText(row[5])
      documentType = SOURCE_NOT_RECORDED
      aw = parseAw(pabCaseNo)
    } else {
      aw = cleanText(row[1])
      iisRef = cleanText(row[2])
      dateDocketed = cleanText(row[3])
      establishment = cleanText(row[4])
      proponent = cleanText(row[5])
      province = cleanText(row[8])
      city = cleanText(row[9])
      municipality = cleanText(row[10])
      barangay = cleanText(row[11])
      address = cleanText(row[12])
      documentType = cleanText(row[13])
    }

    records.push({
      id: `pab-${source.year}-${index + 1}`,
      pabCaseNo,
      aw,
      iisRef,
      dateDocketed,
      dateIso: parseDate(dateDocketed),
      establishment,
      proponent,
      province,
      city,
      municipality,
      barangay,
      address,
      documentType,
      violations: is2023
        ? makePabViolationsHistorical(row, VIOLATION_COLUMNS_2023)
        : is2024
          ? makePabViolationsHistorical(row, VIOLATION_COLUMNS_2024)
          : is2025
            ? makePabViolations2025(row)
            : makePabViolations2026(row),
      linkedCaseNo: null,
      matchBasis: '',
      sourceYear: source.year,
      docketYear: source.year,
    })
  })

  return records
}

function buildOrdersForSource(source: SourceSnapshot): OrderRecord[] {
  const tab = source.tabs.orders
  if (!tab) return []
  const records: OrderRecord[] = []
  const is2023 = source.year === '2023'
  const is2024 = source.year === '2024'
  const isHistorical = is2023 || is2024
  const is2025 = source.year === '2025'
  let last: OrderRecord | null = null
  let lastWasPab = false

  tab.rows.forEach((row, index) => {
    let company = ''
    let caseNo = ''
    let iisRef = ''
    let dateIssued = ''
    let dateReleased = ''
    let documentType = ''
    let violation = ''
    let status = ''
    let amount = 0
    let province = ''
    let city = ''
    let municipality = ''
    let barangay = ''
    let address = ''

    if (isHistorical) {
      const category = cleanText(row[5]).toUpperCase()
      if (category === 'PAB') {
        lastWasPab = true
        return
      }
      if (category) lastWasPab = false
      if (lastWasPab) return

      company = cleanText(row[0])
      caseNo = cleanText(row[1])
      dateReleased = cleanText(row[2])
      iisRef = cleanText(row[3])
      address = cleanText(row[4])
      status = cleanText(row[6])
      amount = parseMoney(row[7])
      documentType = cleanText(row[8])
      violation = cleanText(row[9])
      province = deriveProvince(address)
    } else if (is2025) {
      company = cleanText(row[0])
      iisRef = cleanText(row[1])
      caseNo = cleanText(row[2])
      dateReleased = cleanText(row[3])
      address = cleanText(row[4])
      documentType = cleanText(row[5])
      violation = cleanText(row[6])
      status = cleanText(row[7])
      amount = parseMoney(row[8])
      province = deriveProvince(address)
    } else {
      company = cleanText(row[0])
      caseNo = cleanText(row[1])
      dateIssued = cleanText(row[2])
      iisRef = cleanText(row[3])
      province = cleanText(row[4])
      city = cleanText(row[5])
      municipality = cleanText(row[6])
      barangay = cleanText(row[7])
      address = cleanText(row[8])
      dateReleased = cleanText(row[9])
      documentType = cleanText(row[10])
      violation = cleanText(row[11])
      status = cleanText(row[12])
      amount = parseMoney(row[13])
    }

    const hasIdentity = Boolean(company || caseNo || iisRef)
    if (!hasIdentity && !violation && !status && !amount) return
    if (!hasIdentity && last) {
      company = last.company
      caseNo = last.caseNo
      iisRef = last.iisRef
      dateIssued = last.dateIssued
      dateReleased = last.dateReleased
      documentType = documentType || last.documentType
      status = status || last.status
      province = last.province
      city = last.city
      municipality = last.municipality
      barangay = last.barangay
      address = last.address
    }

    const actionDate = dateReleased || dateIssued
    const record: OrderRecord = {
      id: `order-${source.year}-${index + 1}`,
      company,
      caseNo,
      iisRef,
      dateIssued,
      dateReleased,
      date: actionDate,
      dateIso: parseDate(actionDate),
      documentType,
      violation,
      status,
      amount,
      province,
      city,
      municipality,
      barangay,
      address,
      linkedCaseNo: null,
      matchBasis: '',
      sourceYear: source.year,
      docketYear: source.year,
    }
    records.push(record)
    last = record
  })

  return records
}

function buildPabOrdersForSource(source: SourceSnapshot): PabOrderRecord[] {
  const is2023 = source.year === '2023'
  const is2024 = source.year === '2024'
  const isHistorical = is2023 || is2024
  const tab = isHistorical ? source.tabs.orders : source.tabs.pabOrders
  if (!tab) return []
  const records: PabOrderRecord[] = []
  const is2025 = source.year === '2025'
  let last: PabOrderRecord | null = null
  let lastWasPab = false

  tab.rows.forEach((row, index) => {
    let company = ''
    let pabCaseNo = ''
    let iisRef = ''
    let dateIssued = ''
    let documentType = ''
    let violation = ''
    let status = ''
    let amount = 0
    let province = ''
    let city = ''
    let municipality = ''
    let barangay = ''
    let address = ''

    if (isHistorical) {
      const category = cleanText(row[5]).toUpperCase()
      if (category === 'PAB') {
        lastWasPab = true
      } else if (category) {
        lastWasPab = false
        return
      }
      if (!lastWasPab) return

      company = cleanText(row[0])
      pabCaseNo = cleanText(row[1])
      dateIssued = cleanText(row[2])
      iisRef = cleanText(row[3])
      address = cleanText(row[4])
      status = cleanText(row[6])
      amount = parseMoney(row[7])
      documentType = cleanText(row[8])
      violation = cleanText(row[9])
      province = deriveProvince(address)
    } else if (is2025) {
      company = cleanText(row[0])
      iisRef = cleanText(row[1])
      pabCaseNo = cleanText(row[2])
      dateIssued = cleanText(row[3])
      address = cleanText(row[4])
      documentType = cleanText(row[5])
      violation = cleanText(row[6])
      status = cleanText(row[7])
      amount = parseMoney(row[8])
      province = deriveProvince(address)
    } else {
      company = cleanText(row[0])
      pabCaseNo = cleanText(row[1])
      dateIssued = cleanText(row[2])
      iisRef = cleanText(row[3])
      province = cleanText(row[4])
      city = cleanText(row[5])
      municipality = cleanText(row[6])
      barangay = cleanText(row[7])
      address = cleanText(row[8])
      documentType = cleanText(row[9])
      violation = cleanText(row[10])
      status = cleanText(row[11])
      amount = parseMoney(row[12])
    }

    const hasIdentity = Boolean(company || pabCaseNo || iisRef)
    if (!hasIdentity && !violation && !status && !amount) return
    if (!hasIdentity && last) {
      company = last.company
      pabCaseNo = last.pabCaseNo
      iisRef = last.iisRef
      dateIssued = last.dateIssued
      documentType = documentType || last.documentType
      status = status || last.status
      province = last.province
      city = last.city
      municipality = last.municipality
      barangay = last.barangay
      address = last.address
    }

    const record: PabOrderRecord = {
      id: `pab-order-${source.year}-${index + 1}`,
      company,
      pabCaseNo,
      iisRef,
      dateIssued,
      dateIso: parseDate(dateIssued),
      documentType,
      violation,
      status,
      amount,
      province,
      city,
      municipality,
      barangay,
      address,
      linkedCaseNo: null,
      matchBasis: '',
      sourceYear: source.year,
      docketYear: source.year,
    }
    records.push(record)
    last = record
  })

  return records
}

function buildErfForSource(source: SourceSnapshot): ErfPayment[] {
  const tab = source.tabs.erf
  if (!tab) return []
  const records: ErfPayment[] = []
  const is2023 = source.year === '2023'
  const is2024 = source.year === '2024'
  const isHistorical = is2023 || is2024
  const is2025 = source.year === '2025'

  tab.rows.forEach((row, index) => {
    let company = ''
    let caseNo = ''
    let amount = 0
    let orNumber = ''
    let date = ''
    let status = ''
    let province = ''

    if (isHistorical) {
      company = cleanText(row[0])
      caseNo = cleanText(row[1])
      status = cleanText(row[5])
      amount = parseMoney(row[6])
      orNumber = cleanText(row[7])
      date = cleanText(row[9])
      province = cleanText(row[11])
    } else if (is2025) {
      company = cleanText(row[0])
      caseNo = cleanText(row[1])
      amount = parseMoney(row[2])
      orNumber = cleanText(row[3])
      date = cleanText(row[4])
      status = cleanText(row[5])
    } else {
      company = cleanText(row[1])
      caseNo = cleanText(row[2])
      amount = parseMoney(row[3])
      orNumber = cleanText(row[4])
      date = cleanText(row[5])
      status = cleanText(row[6])
    }

    if (!company && !caseNo) return
    records.push({
      id: `erf-${source.year}-${index + 1}`,
      company,
      caseNo,
      amount,
      orNumber,
      date,
      dateIso: parseDate(date),
      status,
      province,
      linkedCaseNo: null,
      matchBasis: '',
      sourceYear: source.year,
      docketYear: source.year,
    })
  })

  return records
}

function buildPabPenaltiesForSource(source: SourceSnapshot): PabPenalty[] {
  const is2023 = source.year === '2023'
  const is2024 = source.year === '2024'
  const is2025 = source.year === '2025'
  const tab = is2023 ? source.tabs.pabNov : source.tabs.pabPenalty
  if (!tab) return []
  const records: PabPenalty[] = []
  let lastCompany = ''
  let lastPabCase = ''

  tab.rows.forEach((row, index) => {
    let company = ''
    let pabCaseNo = ''
    let amount = 0
    let orNumber = ''
    let date = ''
    let status = ''
    let subtype = ''

    if (is2023) {
      // PAB NOV 2023 embeds the penalty payment columns (W–Z).
      pabCaseNo = cleanText(row[1])
      company = cleanText(row[4])
      amount = parseMoney(row[22])
      orNumber = cleanText(row[23])
      date = cleanText(row[25])
      status = orNumber ? 'PAID' : amount > 0 ? 'PENDING' : ''
      subtype = 'PAB penalty'
      if (!/^07-/i.test(pabCaseNo)) return
      if (!amount && !orNumber) return
    } else if (is2024) {
      // PAB PENALTY 2024 omits company/case on continuation rows; carry them.
      company = cleanText(row[0])
      pabCaseNo = cleanText(row[1])
      if (company) lastCompany = company
      if (pabCaseNo) lastPabCase = pabCaseNo
      if (!company && !pabCaseNo) {
        company = lastCompany
        pabCaseNo = lastPabCase
      }
      amount = parseMoney(row[6])
      orNumber = cleanText(row[7])
      date = cleanText(row[9])
      status = cleanText(row[5])
      subtype = [cleanText(row[3]), cleanText(row[4])].filter(Boolean).join(' · ')
      if (!company && !pabCaseNo) return
      if (!amount && !orNumber && !status) return
    } else if (is2025) {
      company = cleanText(row[0])
      pabCaseNo = cleanText(row[1])
      amount = parseMoney(row[2])
      orNumber = cleanText(row[3])
      date = cleanText(row[4])
      status = cleanText(row[5])
      subtype = cleanText(row[6])
    } else {
      company = cleanText(row[1])
      pabCaseNo = cleanText(row[2])
      amount = parseMoney(row[3])
      orNumber = cleanText(row[4])
      date = cleanText(row[5])
      status = cleanText(row[6])
      subtype = cleanText(row[7])
    }

    if (
      company.toUpperCase() === 'COMPANY NAME' ||
      pabCaseNo.toUpperCase() === 'CASE NUMBER' ||
      company.toUpperCase() === 'PROPONENT NAME'
    ) {
      return
    }
    if (!company && !pabCaseNo) return
    records.push({
      id: `pab-penalty-${source.year}-${index + 1}`,
      company,
      pabCaseNo,
      amount,
      orNumber,
      date,
      dateIso: parseDate(date),
      status,
      subtype,
      linkedCaseNo: null,
      matchBasis: '',
      sourceYear: source.year,
      docketYear: source.year,
    })
  })

  return records
}

function buildRa6969ForSource(source: SourceSnapshot): Ra6969Penalty[] {
  const tab = source.tabs.ra6969
  if (!tab) return []
  const records: Ra6969Penalty[] = []
  const is2025 = source.year === '2025'

  tab.rows.forEach((row, index) => {
    const company = cleanText(is2025 ? row[0] : row[1])
    const caseNo = cleanText(is2025 ? row[1] : row[2])
    if (!company && !caseNo) return
    const amount = parseMoney(is2025 ? row[2] : row[3])
    const orNumber = cleanText(is2025 ? row[3] : row[4])
    const date = cleanText(is2025 ? row[4] : row[5])
    const status = cleanText(is2025 ? row[5] : row[6])
    const subtype = cleanText(is2025 ? row[6] : row[7])
    records.push({
      id: `ra6969-${source.year}-${index + 1}`,
      company,
      caseNo,
      amount,
      orNumber,
      date,
      dateIso: parseDate(date),
      status,
      subtype,
      linkedCaseNo: null,
      matchBasis: '',
      sourceYear: source.year,
      docketYear: source.year,
    })
  })

  return records
}

function buildComplaintsForSource(source: SourceSnapshot): Complaint[] {
  const tab = source.tabs.complaints
  if (!tab) return []
  const records: Complaint[] = []
  const is2023 = source.year === '2023'

  tab.rows.forEach((row, index) => {
    const date = cleanText(row[0])
    const iisRef = cleanText(row[1])
    const subject = cleanText(is2023 ? row[6] : row[3])
    if (!date && !iisRef && !subject) return

    let complainant = ''
    let complainantContact = ''
    let respondent = ''
    let address = ''
    let province = ''
    let status = ''
    let handler = ''
    let remarks = ''
    let actions = ''

    if (is2023) {
      complainant = cleanText(row[4])
      complainantContact = cleanText(row[5])
      respondent = cleanText(row[7])
      address = cleanText(row[8])
      province = deriveProvince(address)
      status = cleanText(row[9])
      handler = cleanText(row[10])
      remarks = cleanText(row[11])
      actions = remarks
    } else {
      complainant = cleanText(row[4])
      respondent = cleanText(row[5])
      actions = cleanText(row[6])
    }

    records.push({
      id: `complaint-${source.year}-${index + 1}`,
      date,
      dateIso: parseDate(date),
      iisRef,
      mode: cleanText(row[2]),
      subject,
      complainant,
      complainantContact,
      respondent,
      address,
      province,
      status,
      handler,
      remarks,
      actions,
      linkedCaseNo: null,
      matchBasis: '',
      sourceYear: source.year,
      docketYear: source.year,
    })
  })

  return records
}

function buildNoNovTcForSource(source: SourceSnapshot): NoNovTc[] {
  const tab = source.tabs.noNovTc
  if (!tab) return []
  const records: NoNovTc[] = []

  tab.rows.forEach((row, index) => {
    const iisRef = cleanText(row[0])
    const name = cleanText(row[1])
    if (!iisRef && !name) return
    records.push({
      id: `tc-${source.year}-${index + 1}`,
      iisRef,
      name,
      address: cleanText(row[2]),
      date: cleanText(row[3]),
      dateIso: parseDate(row[3]),
      type: cleanText(row[4]),
      linkedCaseNo: null,
      matchBasis: '',
      sourceYear: source.year,
      docketYear: source.year,
    })
  })

  return records
}

function buildLbcForSource(source: SourceSnapshot): LbcTrackRecord[] {
  const tab = source.tabs.lbc
  if (!tab) return []
  const records: LbcTrackRecord[] = []

  tab.rows.forEach((row, index) => {
    const iisRef = cleanText(row[0])
    const documentType = cleanText(row[1])
    const caseNo = cleanText(row[2])
    const respondent = cleanText(row[3])
    if (!iisRef && !caseNo && !respondent) return

    const dateOutbound = cleanText(row[4])
    const dateReturned = cleanText(row[6])
    const dateClosed = cleanText(row[8])
    const replyDate = cleanText(row[11])
    records.push({
      id: `lbc-${source.year}-${index + 1}`,
      iisRef,
      documentType,
      caseNo,
      respondent,
      dateOutbound,
      dateOutboundIso: parseDate(dateOutbound),
      status: cleanText(row[5]),
      dateReturned,
      dateReturnedIso: parseDate(dateReturned),
      trackingNo: cleanText(row[7]),
      dateClosed,
      dateClosedIso: parseDate(dateClosed),
      statusAfterLbc: cleanText(row[9]),
      actionsIfReturned: cleanText(row[10]),
      replyDate,
      replyDateIso: parseDate(replyDate),
      update: cleanText(row[12]),
      withResolution: cleanText(row[13]),
      linkedCaseNo: null,
      matchBasis: '',
      sourceYear: source.year,
      docketYear: source.year,
    })
  })

  return records
}

function buildDpwhForSource(source: SourceSnapshot): DpwhComplianceRecord[] {
  const tab = source.tabs.dpwh
  if (!tab) return []
  const records: DpwhComplianceRecord[] = []
  let project = ''

  tab.rows.forEach((row, index) => {
    const projectCell = cleanText(row[0])
    if (projectCell) project = projectCell
    const commitment = cleanText(row[1])
    const dueDate = cleanText(row[2])
    const status = cleanText(row[3]).replace(/^STATUS\s+/i, '')
    const remarks = cleanText(row[4])
    if (!project && !commitment && !dueDate && !status && !remarks) return

    const iisMatch = project.match(/R7-\d{4}-\d+/i)
    const iisRef = iisMatch?.[0]?.toUpperCase() ?? ''
    const projectName = project
      .replace(/^PROJECT\s+NAME\s*/i, '')
      .replace(/\s*\(R7-[^)]*\)\s*/i, ' ')
      .trim()
    const cleanedCommitment = commitment.replace(/^COMMITMENTS?\/?AGREEMENTS?\s*/i, '').trim()
    const cleanedDueDate = dueDate.toUpperCase() === 'DUE DATE' ? '' : dueDate
    const cleanedRemarks = remarks.toUpperCase() === 'REMARKS' ? '' : remarks
    records.push({
      id: `dpwh-${source.year}-${index + 1}`,
      project: projectName || project,
      iisRef,
      commitment: cleanedCommitment,
      dueDate: cleanedDueDate,
      dueDateIso: parseDate(cleanedDueDate),
      status,
      remarks: cleanedRemarks,
      linkedCaseNo: null,
      matchBasis: '',
      sourceYear: source.year,
      docketYear: source.year,
    })
  })

  return records
}

interface DuplicateData {
  duplicateIis: DuplicateIisIssue[]
  duplicateCaseNumbers: DuplicateCaseIssue[]
  duplicateIisCaseIds: Set<string>
  duplicateCaseIds: Set<string>
}

function computeDuplicateData(cases: CaseRecord[]): DuplicateData {
  const iisGroups = new Map<string, CaseRecord[]>()
  const caseGroups = new Map<string, CaseRecord[]>()

  for (const caseRecord of cases) {
    const iisKey = normalizeIis(caseRecord.iisRef)
    if (iisKey) pushMap(iisGroups, `${caseRecord.sourceYear}|${iisKey}`, caseRecord)
    if (caseRecord.caseNo !== 'UNNUMBERED') {
      pushMap(caseGroups, `${caseRecord.sourceYear}|${caseRecord.caseNo}`, caseRecord)
    }
  }

  const duplicateIisCaseIds = new Set<string>()
  const duplicateIis: DuplicateIisIssue[] = [...iisGroups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => {
      for (const caseRecord of group) duplicateIisCaseIds.add(caseRecord.id)
      return {
        iisRef: key.split('|').slice(1).join('|'),
        cases: group.map((caseRecord) => ({
          caseNo: caseRecord.displayCaseNo,
          establishment: caseRecord.establishment,
        })),
      }
    })

  const duplicateCaseIds = new Set<string>()
  const duplicateCaseNumbers: DuplicateCaseIssue[] = [...caseGroups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => {
      for (const caseRecord of group) duplicateCaseIds.add(caseRecord.id)
      return {
        caseNo: key.split('|').slice(1).join('|'),
        cases: group.map((caseRecord) => ({
          caseNo: caseRecord.displayCaseNo,
          establishment: caseRecord.establishment,
          year: caseRecord.sourceYear,
        })),
      }
    })

  return { duplicateIis, duplicateCaseNumbers, duplicateIisCaseIds, duplicateCaseIds }
}

function buildDataIssues(
  cases: CaseRecord[],
  records: {
    pabNov: PabNovRecord[]
    orders: OrderRecord[]
    pabOrders: PabOrderRecord[]
    erf: ErfPayment[]
    pabPenalties: PabPenalty[]
    ra6969: Ra6969Penalty[]
    complaints: Complaint[]
    lbc: LbcTrackRecord[]
    dpwh: DpwhComplianceRecord[]
  },
  duplicateData: DuplicateData,
): DataIssues {
  const invalidDates: InvalidDateIssue[] = cases
    .filter((caseRecord) => !caseRecord.dateIso)
    .map((caseRecord) => ({
      caseNo: caseRecord.displayCaseNo,
      establishment: caseRecord.establishment,
      rawDate: caseRecord.dateDocketed || '(blank)',
    }))

  const missingFields: MissingFieldCase[] = cases
    .filter((caseRecord) => caseRecord.dataIssues.some((issue) => issue.startsWith('Missing')))
    .map((caseRecord) => ({
      caseNo: caseRecord.displayCaseNo,
      establishment: caseRecord.establishment,
      missing: caseRecord.dataIssues.filter((issue) => issue.startsWith('Missing')),
    }))

  return {
    invalidDates,
    unnumbered: cases.filter((caseRecord) => caseRecord.isUnnumbered),
    duplicateIis: duplicateData.duplicateIis,
    duplicateCaseNumbers: duplicateData.duplicateCaseNumbers,
    missingFields,
    unlinked: {
      pabNov: records.pabNov.filter((record) => !record.linkedCaseNo),
      orders: records.orders.filter((record) => !record.linkedCaseNo),
      pabOrders: records.pabOrders.filter((record) => !record.linkedCaseNo),
      erf: records.erf.filter((record) => !record.linkedCaseNo),
      pabPenalties: records.pabPenalties.filter((record) => !record.linkedCaseNo),
      ra6969: records.ra6969.filter((record) => !record.linkedCaseNo),
      complaints: records.complaints.filter((record) => !record.linkedCaseNo),
      lbc: records.lbc.filter((record) => !record.linkedCaseNo),
      dpwh: records.dpwh.filter((record) => !record.linkedCaseNo),
    },
  }
}

function latestDate(values: (string | null | undefined)[], fallback: string): string {
  const dates = values
    .filter((value): value is string => Boolean(value))
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort()
  const latest = dates[dates.length - 1]
  if (!latest) return fallback
  return latest > fallback ? latest : fallback
}

function collectDates(
  cases: CaseRecord[],
  records: {
    pabNov: PabNovRecord[]
    orders: OrderRecord[]
    pabOrders: PabOrderRecord[]
    erf: ErfPayment[]
    pabPenalties: PabPenalty[]
    ra6969: Ra6969Penalty[]
    complaints: Complaint[]
    lbc: LbcTrackRecord[]
    dpwh: DpwhComplianceRecord[]
    noNovTc: NoNovTc[]
  },
): (string | null)[] {
  return [
    ...cases.map((caseRecord) => caseRecord.dateIso),
    ...records.pabNov.map((record) => record.dateIso),
    ...records.orders.map((record) => record.dateIso),
    ...records.pabOrders.map((record) => record.dateIso),
    ...records.erf.map((record) => record.dateIso),
    ...records.pabPenalties.map((record) => record.dateIso),
    ...records.ra6969.map((record) => record.dateIso),
    ...records.complaints.map((record) => record.dateIso),
    ...records.lbc.map((record) => record.dateOutboundIso),
    ...records.lbc.map((record) => record.dateClosedIso),
    ...records.dpwh.map((record) => record.dueDateIso),
    ...records.noNovTc.map((record) => record.dateIso),
  ]
}

function sourceMeta(source: SourceSnapshot): DashboardSource {
  const tabCounts: Record<string, number> = {}
  for (const [key, tab] of Object.entries(source.tabs)) tabCounts[key] = tab.rows.length
  return {
    year: source.year,
    label: source.label,
    sheetId: source.sheetId,
    sourceUrl: source.sourceUrl,
    dataDate: source.dataDate,
    coverage: source.coverage ?? [],
    tabCounts,
  }
}

/** Pre-numbered rows with no respondent are placeholders, not cases. */
function countPlaceholders(source: SourceSnapshot): number {
  if (source.year !== '2023' && source.year !== '2024') return 0
  const master = source.tabs.master
  if (!master) return 0
  const caseIndex = source.year === '2023' ? 1 : 0
  const establishmentIndex = source.year === '2023' ? 4 : 3
  return master.rows.filter((row) => {
    const caseNo = normalizeCaseNo(row[caseIndex])
    return /^20\d{2}-\d{4}$/.test(caseNo) && !cleanText(row[establishmentIndex])
  }).length
}

export function buildDashboardData(snapshot: Snapshot): DashboardData {
  if (!snapshot.sources?.length) {
    throw new Error('Snapshot v2 is required: expected a sources[] array.')
  }

  const cases: CaseRecord[] = []
  let pabNov: PabNovRecord[] = []
  let orders: OrderRecord[] = []
  let pabOrders: PabOrderRecord[] = []
  let erf: ErfPayment[] = []
  let pabPenalties: PabPenalty[] = []
  let ra6969: Ra6969Penalty[] = []
  let complaints: Complaint[] = []
  let noNovTc: NoNovTc[] = []
  let lbc: LbcTrackRecord[] = []
  let dpwh: DpwhComplianceRecord[] = []

  for (const source of snapshot.sources) {
    cases.push(...buildCasesForSource(source))
    pabNov.push(...buildPabNovForSource(source))
    orders.push(...buildOrdersForSource(source))
    pabOrders.push(...buildPabOrdersForSource(source))
    erf.push(...buildErfForSource(source))
    pabPenalties.push(...buildPabPenaltiesForSource(source))
    ra6969.push(...buildRa6969ForSource(source))
    complaints.push(...buildComplaintsForSource(source))
    noNovTc.push(...buildNoNovTcForSource(source))
    lbc.push(...buildLbcForSource(source))
    dpwh.push(...buildDpwhForSource(source))
  }

  const masterByIis = new Map<string, CaseRecord[]>()
  const masterByIisYear = new Map<string, CaseRecord[]>()
  const masterByCase = new Map<string, CaseRecord[]>()
  const nameEntries: { name: string; caseRecord: CaseRecord }[] = []

  for (const caseRecord of cases) {
    const iis = normalizeIis(caseRecord.iisRef)
    if (iis) {
      pushMap(masterByIis, iis, caseRecord)
      pushMap(masterByIisYear, `${caseRecord.sourceYear}|${iis}`, caseRecord)
    }
    if (caseRecord.caseNo !== 'UNNUMBERED') {
      pushMap(masterByCase, caseRecord.caseNo, caseRecord)
    }
    for (const name of [caseRecord.establishment, caseRecord.proponent]) {
      const normalized = normalizeName(name)
      if (!normalized || normalized === 'N/A' || normalized === '-') continue
      nameEntries.push({ name: normalized, caseRecord })
    }
  }

  const pabByDocket = new Map<string, PabNovRecord[]>()
  for (const record of pabNov) {
    const docket = normalizePab(record.pabCaseNo)
    if (docket) pushMap(pabByDocket, docket, record)
  }

  const findIisMatches = (iisRef: string, sourceYear: string): CaseRecord[] => {
    const normalized = normalizeIis(iisRef)
    if (!normalized) return []
    const sameYear = masterByIisYear.get(`${sourceYear}|${normalized}`) ?? []
    if (sameYear.length) return sameYear
    return masterByIis.get(normalized) ?? []
  }

  const findCaseMatches = (caseNo: string): CaseRecord[] => {
    const normalized = normalizeCaseNo(caseNo)
    if (!normalized) return []
    return masterByCase.get(normalized) ?? []
  }

  const findPabRecord = (pabCaseNo: string, sourceYear: string): PabNovRecord | undefined => {
    const normalized = normalizePab(pabCaseNo)
    if (!normalized) return undefined
    const candidates = pabByDocket.get(normalized) ?? []
    return (
      candidates.find((candidate) => candidate.sourceYear === sourceYear) ??
      candidates[0]
    )
  }

  type Linkable = {
    linkedCaseNo: string | null
    matchBasis: string
    sourceYear: string
    docketYear: string | null
  }

  const attach = <T extends Linkable>(
    record: T,
    matches: CaseRecord[],
    basis: string,
    addToCase: (caseRecord: CaseRecord, item: T) => void,
  ): boolean => {
    if (!matches.length) {
      record.docketYear = record.sourceYear
      return false
    }
    const sameYear = matches.filter((caseRecord) => caseRecord.docketYear === record.sourceYear)
    const chosen = sameYear.length ? sameYear : matches
    record.linkedCaseNo = chosen[0].caseNo
    record.matchBasis = basis
    record.docketYear = chosen[0].docketYear ?? record.sourceYear
    for (const caseRecord of chosen) addToCase(caseRecord, record)
    return true
  }

  const linkByPab = <T extends Linkable & { pabCaseNo: string }>(
    record: T,
    addToCase: (caseRecord: CaseRecord, item: T) => void,
  ): boolean => {
    const pabRecord = findPabRecord(record.pabCaseNo, record.sourceYear)
    if (!pabRecord) return false
    const matches = findIisMatches(pabRecord.iisRef, pabRecord.sourceYear)
    return attach(record, matches, 'PAB docket → IIS', addToCase)
  }

  for (const record of pabNov) {
    attach(record, findIisMatches(record.iisRef, record.sourceYear), 'IIS reference', (caseRecord, item) => {
      caseRecord.pabNov.push(item)
    })
  }

  for (const record of orders) {
    if (attach(record, findIisMatches(record.iisRef, record.sourceYear), 'IIS reference', (caseRecord, item) => {
      caseRecord.orders.push(item)
    })) {
      continue
    }
    attach(record, findCaseMatches(record.caseNo), 'Case number', (caseRecord, item) => {
      caseRecord.orders.push(item)
    })
  }

  for (const record of pabOrders) {
    if (linkByPab(record, (caseRecord, item) => {
      caseRecord.pabOrders.push(item)
    })) {
      continue
    }
    attach(record, findIisMatches(record.iisRef, record.sourceYear), 'IIS reference', (caseRecord, item) => {
      caseRecord.pabOrders.push(item)
    })
  }

  for (const record of erf) {
    attach(record, findCaseMatches(record.caseNo), 'Case number', (caseRecord, item) => {
      caseRecord.erf.push(item)
    })
  }

  for (const record of pabPenalties) {
    linkByPab(record, (caseRecord, item) => {
      caseRecord.pabPenalties.push(item)
    })
  }

  for (const record of ra6969) {
    attach(record, findCaseMatches(record.caseNo), 'Case number', (caseRecord, item) => {
      caseRecord.ra6969.push(item)
    })
  }

  for (const record of complaints) {
    if (attach(record, findIisMatches(record.iisRef, record.sourceYear), 'IIS reference', (caseRecord, item) => {
      caseRecord.complaints.push(item)
    })) {
      continue
    }

    const sameYearEntries = nameEntries.filter(
      (entry) => entry.caseRecord.sourceYear === record.sourceYear,
    )
    const respondent = normalizeName(record.respondent)
    if (respondent) {
      const exact = sameYearEntries.find((entry) => entry.name === respondent)
      if (exact) {
        attach(record, [exact.caseRecord], 'Respondent name', (caseRecord, item) => {
          caseRecord.complaints.push(item)
        })
        continue
      }
      if (respondent.length >= 10) {
        const partial = sameYearEntries
          .filter(
            ({ name }) =>
              name.length >= 10 && (name.includes(respondent) || respondent.includes(name)),
          )
          .sort((a, b) => b.name.length - a.name.length)[0]
        if (partial) {
          attach(record, [partial.caseRecord], 'Respondent name (partial)', (caseRecord, item) => {
            caseRecord.complaints.push(item)
          })
          continue
        }
      }
    }

    const text = `${record.subject} ${record.actions}`.toUpperCase()
    if (text.length >= 12) {
      const textMatch = sameYearEntries
        .filter(({ name }) => name.length >= 12 && text.includes(name))
        .sort((a, b) => b.name.length - a.name.length)[0]
      if (textMatch) {
        attach(record, [textMatch.caseRecord], 'Complaint text name match', (caseRecord, item) => {
          caseRecord.complaints.push(item)
        })
      }
    }
  }

  for (const record of noNovTc) {
    attach(record, findIisMatches(record.iisRef, record.sourceYear), 'IIS reference', () => {
      // This watchlist is linked for display but does not alter enforcement stage.
    })
  }

  for (const record of lbc) {
    let matches: CaseRecord[] = []
    let basis = ''
    const normalizedCase = normalizeCaseNo(record.caseNo)
    if (/^20\d{2}-\d{4}$/.test(normalizedCase)) {
      matches = findCaseMatches(record.caseNo)
      basis = 'Case number'
    }
    if (!matches.length && /^07-/i.test(record.caseNo)) {
      const pabRecord = findPabRecord(record.caseNo, record.sourceYear)
      if (pabRecord) {
        matches = findIisMatches(pabRecord.iisRef, pabRecord.sourceYear)
        basis = 'PAB docket → IIS'
      }
    }
    if (!matches.length) {
      matches = findIisMatches(record.iisRef, record.sourceYear)
      basis = 'IIS reference'
    }
    if (!matches.length) {
      const respondent = normalizeName(record.respondent)
      if (respondent) {
        const exact = nameEntries.find(
          (entry) =>
            entry.caseRecord.sourceYear === record.sourceYear && entry.name === respondent,
        )
        if (exact) {
          matches = [exact.caseRecord]
          basis = 'Respondent name'
        }
      }
    }
    attach(record, matches, basis, (caseRecord, item) => {
      caseRecord.lbc.push(item)
    })
  }

  for (const record of dpwh) {
    attach(record, findIisMatches(record.iisRef, record.sourceYear), 'IIS reference', (caseRecord, item) => {
      caseRecord.dpwh.push(item)
    })
  }

  // Dashboard-wide exclusion of identifiable Negros Oriental / Siquijor cases.
  const excludedCaseIdSet = new Set(
    cases
      .filter((caseRecord) =>
        isExcludedLocation(
          caseRecord.province,
          caseRecord.address,
          caseRecord.city,
          caseRecord.municipality,
          caseRecord.establishment,
        ),
      )
      .map((caseRecord) => caseRecord.id),
  )
  const keptCaseNoSet = new Set(
    cases
      .filter((caseRecord) => !excludedCaseIdSet.has(caseRecord.id))
      .map((caseRecord) => caseRecord.caseNo),
  )
  const excludedCaseNos = new Set(
    cases
      .filter((caseRecord) => excludedCaseIdSet.has(caseRecord.id))
      .map((caseRecord) => caseRecord.caseNo),
  )

  const recordOwnExcluded: Record<string, (record: any) => boolean> = {
    pabNov: (record) =>
      isExcludedLocation(record.province, record.address),
    orders: (record) =>
      isExcludedLocation(record.province, record.address),
    pabOrders: (record) =>
      isExcludedLocation(record.province, record.address),
    erf: (record) => isExcludedProvince(record.province),
    complaints: (record) =>
      isExcludedLocation(record.province, record.address),
    noNovTc: (record) => isExcludedLocation('', record.address),
  }
  const isLinkedExcluded = (record: { linkedCaseNo: string | null }) =>
    Boolean(record.linkedCaseNo && excludedCaseNos.has(record.linkedCaseNo) && !keptCaseNoSet.has(record.linkedCaseNo))

  const droppedIds = new Set<string>()
  const countBefore: Record<string, number> = {
    pabNov: pabNov.length,
    orders: orders.length,
    pabOrders: pabOrders.length,
    erf: erf.length,
    pabPenalties: pabPenalties.length,
    ra6969: ra6969.length,
    complaints: complaints.length,
    lbc: lbc.length,
    dpwh: dpwh.length,
    noNovTc: noNovTc.length,
  }

  const dropRecord = (type: string, record: any) => {
    droppedIds.add(record.id)
  }

  const filterRecordList = <T extends { id: string; linkedCaseNo: string | null }>(
    type: string,
    rows: T[],
    ownExcluded: (row: T) => boolean,
  ): T[] => {
    return rows.filter((row) => {
      if (isLinkedExcluded(row) || ownExcluded(row)) {
        droppedIds.add(row.id)
        return false
      }
      return true
    })
  }

  pabNov = filterRecordList('pabNov', pabNov, recordOwnExcluded.pabNov)
  orders = filterRecordList('orders', orders, recordOwnExcluded.orders)
  pabOrders = filterRecordList('pabOrders', pabOrders, recordOwnExcluded.pabOrders)
  erf = filterRecordList('erf', erf, recordOwnExcluded.erf)
  complaints = filterRecordList('complaints', complaints, recordOwnExcluded.complaints)
  noNovTc = filterRecordList('noNovTc', noNovTc, recordOwnExcluded.noNovTc)
  // Linked-only records: drop when their linked case is excluded.
  pabPenalties = pabPenalties.filter((row) => {
    if (isLinkedExcluded(row)) {
      droppedIds.add(row.id)
      return false
    }
    return true
  })
  ra6969 = ra6969.filter((row) => {
    if (isLinkedExcluded(row)) {
      droppedIds.add(row.id)
      return false
    }
    return true
  })
  lbc = lbc.filter((row) => {
    if (isLinkedExcluded(row)) {
      droppedIds.add(row.id)
      return false
    }
    return true
  })
  dpwh = dpwh.filter((row) => {
    if (isLinkedExcluded(row)) {
      droppedIds.add(row.id)
      return false
    }
    return true
  })

  // Remove filtered records from their attached cases.
  const keptCases = cases.filter((caseRecord) => !excludedCaseIdSet.has(caseRecord.id))
  for (const caseRecord of keptCases) {
    caseRecord.pabNov = caseRecord.pabNov.filter((item) => !droppedIds.has(item.id))
    caseRecord.orders = caseRecord.orders.filter((item) => !droppedIds.has(item.id))
    caseRecord.pabOrders = caseRecord.pabOrders.filter((item) => !droppedIds.has(item.id))
    caseRecord.erf = caseRecord.erf.filter((item) => !droppedIds.has(item.id))
    caseRecord.pabPenalties = caseRecord.pabPenalties.filter((item) => !droppedIds.has(item.id))
    caseRecord.ra6969 = caseRecord.ra6969.filter((item) => !droppedIds.has(item.id))
    caseRecord.complaints = caseRecord.complaints.filter((item) => !droppedIds.has(item.id))
    caseRecord.lbc = caseRecord.lbc.filter((item) => !droppedIds.has(item.id))
    caseRecord.dpwh = caseRecord.dpwh.filter((item) => !droppedIds.has(item.id))
  }

  const excludedRecordsByType: Record<string, number> = {}
  for (const type of Object.keys(countBefore)) {
    const after =
      type === 'pabNov'
        ? pabNov.length
        : type === 'orders'
          ? orders.length
          : type === 'pabOrders'
            ? pabOrders.length
            : type === 'erf'
              ? erf.length
              : type === 'pabPenalties'
                ? pabPenalties.length
                : type === 'ra6969'
                  ? ra6969.length
                  : type === 'complaints'
                    ? complaints.length
                    : type === 'lbc'
                      ? lbc.length
                      : type === 'dpwh'
                        ? dpwh.length
                        : noNovTc.length
    excludedRecordsByType[type] = countBefore[type] - after
  }

  // Audit counts computed from the pre-exclusion case list.
  const excludedCaseList = [...cases].filter((caseRecord) =>
    excludedCaseIdSet.has(caseRecord.id),
  )
  const excludedCasesByYear: Record<string, number> = {}
  const ambiguousByYear: Record<string, number> = {}
  for (const source of snapshot.sources) {
    excludedCasesByYear[source.year] = excludedCaseList.filter(
      (caseRecord) => caseRecord.sourceYear === source.year,
    ).length
    const keptForYear = cases.filter(
      (caseRecord) =>
        caseRecord.sourceYear === source.year && !excludedCaseIdSet.has(caseRecord.id),
    )
    ambiguousByYear[source.year] = keptForYear.filter(
      (caseRecord) =>
        !isExcludedLocation(
          caseRecord.province,
          caseRecord.address,
          caseRecord.city,
          caseRecord.municipality,
          caseRecord.establishment,
        ) &&
        !hasIdentifiableLocation(
          caseRecord.province,
          caseRecord.address,
          caseRecord.city,
          caseRecord.municipality,
        ),
    ).length
  }

  const placeholdersByYear: Record<string, number> = {}
  for (const source of snapshot.sources) {
    placeholdersByYear[source.year] = countPlaceholders(source)
  }

  // Replace cases array contents with kept cases.
  cases.length = 0
  cases.push(...keptCases)

  const exclusions: ExclusionAudit = {
    provinces: ['Negros Oriental', 'Siquijor'],
    excludedCases: excludedCaseList.length,
    casesByYear: excludedCasesByYear,
    excludedRecords: Object.values(excludedRecordsByType).reduce((sum, value) => sum + value, 0),
    recordsByType: excludedRecordsByType,
    ambiguousCases: keptCases.filter(
      (caseRecord) =>
        !isExcludedLocation(
          caseRecord.province,
          caseRecord.address,
          caseRecord.city,
          caseRecord.municipality,
          caseRecord.establishment,
        ) &&
        !hasIdentifiableLocation(
          caseRecord.province,
          caseRecord.address,
          caseRecord.city,
          caseRecord.municipality,
        ),
    ).length,
    ambiguousByYear,
    placeholdersSkipped: Object.values(placeholdersByYear).reduce((sum, value) => sum + value, 0),
    placeholdersByYear,
    retainedCases: keptCases.length,
  }

  const duplicateData = computeDuplicateData(cases)

  for (const caseRecord of cases) {
    if (duplicateData.duplicateIisCaseIds.has(caseRecord.id)) {
      if (!caseRecord.dataIssues.includes('Duplicate IIS reference')) {
        caseRecord.dataIssues.push('Duplicate IIS reference')
      }
    }
    if (duplicateData.duplicateCaseIds.has(caseRecord.id)) {
      if (!caseRecord.dataIssues.includes('Duplicate case number')) {
        caseRecord.dataIssues.push('Duplicate case number')
      }
    }

    const flags = new Set<string>()
    for (const violation of caseRecord.violations) flags.add(violationFlag(violation))
    for (const flag of noteFlags(caseRecord.notes)) flags.add(flag)
    for (const issue of caseRecord.dataIssues) {
      if (issue.startsWith('Missing case number')) flags.add('Unnumbered case')
      if (issue.startsWith('Invalid docket') || issue.startsWith('Missing docket')) {
        flags.add('Invalid date')
      }
      if (issue === 'Duplicate IIS reference') flags.add('Duplicate IIS')
      if (issue === 'Duplicate case number') flags.add('Duplicate case no.')
    }

    caseRecord.pabNov = uniqueBy(caseRecord.pabNov, (item) => item.id)
    caseRecord.orders = uniqueBy(caseRecord.orders, (item) => item.id)
    caseRecord.pabOrders = uniqueBy(caseRecord.pabOrders, (item) => item.id)
    caseRecord.erf = uniqueBy(caseRecord.erf, (item) => item.id)
    caseRecord.pabPenalties = uniqueBy(caseRecord.pabPenalties, (item) => item.id)
    caseRecord.ra6969 = uniqueBy(caseRecord.ra6969, (item) => item.id)
    caseRecord.complaints = uniqueBy(caseRecord.complaints, (item) => item.id)
    caseRecord.lbc = uniqueBy(caseRecord.lbc, (item) => item.id)
    caseRecord.dpwh = uniqueBy(caseRecord.dpwh, (item) => item.id)

    const allPayments = [
      ...caseRecord.erf,
      ...caseRecord.pabPenalties,
      ...caseRecord.ra6969,
    ]
    caseRecord.paidAmount = allPayments
      .filter((payment) => isPaid(payment.status))
      .reduce((sum, payment) => sum + payment.amount, 0)
    caseRecord.assessedAmount =
      caseRecord.orders.reduce((sum, order) => sum + order.amount, 0) +
      caseRecord.pabOrders.reduce((sum, order) => sum + order.amount, 0)
    caseRecord.pendingPayment =
      caseRecord.orders.some((order) => isPending(order.status)) ||
      allPayments.some((payment) => isPending(payment.status))

    const hasPaidPayment = allPayments.some((payment) => isPaid(payment.status))
    if (hasPaidPayment) caseRecord.stage = 'payment'
    else if (caseRecord.pabOrders.length) caseRecord.stage = 'pabOrder'
    else if (caseRecord.orders.length) caseRecord.stage = 'order'
    else if (caseRecord.pabNov.length) caseRecord.stage = 'pabNov'
    else caseRecord.stage = 'nov'
    caseRecord.stageLabel = STAGE_META[caseRecord.stage].label

    if (caseRecord.pendingPayment) flags.add('Payment pending')
    if (caseRecord.orders.some((order) => statusHas(order.status, 'SET ASIDE'))) {
      flags.add('Order set aside')
    }
    if (caseRecord.orders.some((order) => cleanText(order.status).toUpperCase() === 'DENIED')) {
      flags.add('Order denied')
    }
    if (caseRecord.orders.some((order) => cleanText(order.status).toUpperCase() === 'REDUCE')) {
      flags.add('Penalty reduced')
    }
    if (
      caseRecord.pabOrders.some((order) => cleanText(order.status).toUpperCase() === 'WITH PENALTY') &&
      !hasPaidPayment
    ) {
      flags.add('PAB penalty unpaid')
    }
    if (!caseRecord.pabNov.length && (caseRecord.orders.length || caseRecord.pabOrders.length)) {
      flags.add('No PAB NOV link')
    }
    if (caseRecord.orders.length && !caseRecord.pabNov.length && !caseRecord.pabOrders.length) {
      flags.add('Order without PAB NOV')
    }
    if (
      caseRecord.lbc.some(
        (record) =>
          statusHas(record.statusAfterLbc, 'RETURNED') ||
          statusHas(record.status, 'RETURNED'),
      )
    ) {
      flags.add('LBC returned')
    }
    if (
      caseRecord.dpwh.some(
        (record) => !statusHas(record.status, 'COMPLIED') && !statusHas(record.status, 'CLOSED'),
      )
    ) {
      flags.add('DPWH commitment pending')
    }

    const dates = [
      caseRecord.dateIso,
      ...caseRecord.pabNov.map((item) => item.dateIso),
      ...caseRecord.orders.map((item) => item.dateIso),
      ...caseRecord.pabOrders.map((item) => item.dateIso),
      ...allPayments.map((item) => item.dateIso),
      ...caseRecord.complaints.map((item) => item.dateIso),
      ...caseRecord.lbc.map((item) => item.dateOutboundIso),
      ...caseRecord.lbc.map((item) => item.dateClosedIso),
    ].filter((value): value is string => Boolean(value))
    caseRecord.lastActionDate = dates.length ? dates.sort()[dates.length - 1] ?? null : null

    const basis = new Set<string>()
    for (const record of [
      ...caseRecord.pabNov,
      ...caseRecord.orders,
      ...caseRecord.pabOrders,
      ...caseRecord.erf,
      ...caseRecord.pabPenalties,
      ...caseRecord.ra6969,
      ...caseRecord.complaints,
      ...caseRecord.lbc,
      ...caseRecord.dpwh,
    ]) {
      if (record.matchBasis) basis.add(record.matchBasis)
    }
    caseRecord.matchBasis = [...basis]
    caseRecord.flags = [...flags]
    caseRecord.linkCount =
      caseRecord.pabNov.length +
      caseRecord.orders.length +
      caseRecord.pabOrders.length +
      caseRecord.erf.length +
      caseRecord.pabPenalties.length +
      caseRecord.ra6969.length +
      caseRecord.complaints.length +
      caseRecord.lbc.length +
      caseRecord.dpwh.length
  }

  const records = {
    pabNov,
    orders,
    pabOrders,
    erf,
    pabPenalties,
    ra6969,
    complaints,
    lbc,
    dpwh,
    noNovTc,
  }
  const dataIssues = buildDataIssues(cases, records, duplicateData)
  const docketYears = [...new Set(cases.map((caseRecord) => caseRecord.docketYear))]
    .filter((year): year is string => Boolean(year))
    .sort()
  const dataDate = latestDate(collectDates(cases, records), snapshot.dataDate)
  const timelineStart = docketYears.length ? `${docketYears[0]}-01` : `${dataDate.slice(0, 4)}-01`
  const sources = snapshot.sources.map(sourceMeta)

  return {
    fetchedAt: snapshot.fetchedAt,
    dataDate,
    sourceUrl: sources[0]?.sourceUrl ?? '',
    scope: 'all',
    scopeLabel: 'All years',
    timelineStart,
    docketYears,
    sources,
    cases: [...cases].sort(
      (a, b) =>
        (a.docketYear ?? '').localeCompare(b.docketYear ?? '') ||
        a.caseNo.localeCompare(b.caseNo) ||
        a.id.localeCompare(b.id),
    ),
    pabNov,
    orders,
    pabOrders,
    erf,
    pabPenalties,
    ra6969,
    complaints,
    noNovTc,
    lbc,
    dpwh,
    dataIssues,
    exclusions,
  }
}

export function scopeDashboardData(data: DashboardData, scope: YearScope): DashboardData {
  if (scope === 'all') {
    const projectKey = (record: DpwhComplianceRecord) =>
      `${record.project.toUpperCase().replace(/\\s+/g, '')}|${record.iisRef.toUpperCase()}`
    const projects2025 = new Set(
      data.dpwh.filter((record) => record.sourceYear === '2025').map(projectKey),
    )
    const keptDpwh = data.dpwh.filter(
      (record) => !(record.sourceYear === '2024' && projects2025.has(projectKey(record))),
    )
    const keptDpwhIds = new Set(keptDpwh.map((record) => record.id))
    const cases = data.cases.map((caseRecord) => {
      const dpwh = caseRecord.dpwh.filter((record) => keptDpwhIds.has(record.id))
      return {
        ...caseRecord,
        dpwh,
        linkCount:
          caseRecord.pabNov.length +
          caseRecord.orders.length +
          caseRecord.pabOrders.length +
          caseRecord.erf.length +
          caseRecord.pabPenalties.length +
          caseRecord.ra6969.length +
          caseRecord.complaints.length +
          caseRecord.lbc.length +
          dpwh.length,
      }
    })
    const records = {
      pabNov: data.pabNov,
      orders: data.orders,
      pabOrders: data.pabOrders,
      erf: data.erf,
      pabPenalties: data.pabPenalties,
      ra6969: data.ra6969,
      complaints: data.complaints,
      lbc: data.lbc,
      dpwh: keptDpwh,
      noNovTc: data.noNovTc,
    }
    const duplicateData = computeDuplicateData(cases)
    const dataIssues = buildDataIssues(cases, records, duplicateData)
    return {
      ...data,
      scope: 'all',
      scopeLabel: 'All years',
      dpwh: keptDpwh,
      cases,
      dataIssues,
      exclusions: data.exclusions,
    }
  }

  const cases = data.cases.filter((caseRecord) => caseRecord.docketYear === scope)
  const filterRecords = <T extends { docketYear: string | null }>(rows: T[]): T[] =>
    rows.filter((record) => record.docketYear === scope)

  const pabNov = filterRecords(data.pabNov)
  const orders = filterRecords(data.orders)
  const pabOrders = filterRecords(data.pabOrders)
  const erf = filterRecords(data.erf)
  const pabPenalties = filterRecords(data.pabPenalties)
  const ra6969 = filterRecords(data.ra6969)
  const complaints = filterRecords(data.complaints)
  const noNovTc = filterRecords(data.noNovTc)
  const lbc = filterRecords(data.lbc)
  const dpwh = filterRecords(data.dpwh)

  const records = {
    pabNov,
    orders,
    pabOrders,
    erf,
    pabPenalties,
    ra6969,
    complaints,
    lbc,
    dpwh,
    noNovTc,
  }
  const source = data.sources.find((item) => item.year === scope)
  const scopedDates = collectDates(cases, records).filter((value): value is string =>
    Boolean(value && value <= (source?.dataDate ?? data.dataDate)),
  )
  const dataDate = latestDate(scopedDates, source?.dataDate ?? data.dataDate)
  const timelineStart = `${scope}-01`
  const scopedCases = cases.map((caseRecord) => ({
    ...caseRecord,
    ageDays: dayDiff(caseRecord.dateIso, dataDate),
  }))
  const duplicateData = computeDuplicateData(scopedCases)
  const dataIssues = buildDataIssues(scopedCases, records, duplicateData)

  return {
    ...data,
    scope,
    scopeLabel: `${scope} docket`,
    timelineStart,
    dataDate,
    sourceUrl: source?.sourceUrl ?? data.sourceUrl,
    cases: scopedCases,
    pabNov,
    orders,
    pabOrders,
    erf,
    pabPenalties,
    ra6969,
    complaints,
    noNovTc,
    lbc,
    dpwh,
    dataIssues,
    exclusions: data.exclusions,
  }
}

export function statusLabel(status: string): string {
  return isBlankStatus(status) ? 'No status' : status
}

export const NOT_RECORDED = SOURCE_NOT_RECORDED
export const NOT_STATED = SOURCE_NOT_STATED
