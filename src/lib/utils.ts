import {
  differenceInCalendarDays,
  format,
  isValid,
  parse,
  parseISO,
} from 'date-fns'

export const SOURCE_NOT_RECORDED = 'Not recorded in source'

export function cleanText(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeIis(value: string | null | undefined): string {
  return cleanText(value).toUpperCase().replace(/\s+/g, '')
}

export function normalizeCaseNo(value: string | null | undefined): string {
  const raw = cleanText(value).toUpperCase()
  if (!raw) return ''
  // 2025 uses "DENR EMB 7 CASE NO. 2025 0001"; 2026 uses "2026-0001".
  // Keep a stable year + four-digit sequence while accepting both formats
  // and older records such as "2024 0566" / "2024-0114".
  const match = raw.match(/(20\d{2})\D*?(\d{3,5})\s*$/)
  if (match) return `${match[1]}-${match[2].padStart(4, '0')}`
  return raw.replace(/\s+/g, '')
}

export function normalizePab(value: string | null | undefined): string {
  return cleanText(value)
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/^PABCASE/, '')
    .replace(/-(A\/W|AW|A|W)$/, '')
}

export function parseAw(pabCaseNo: string | null | undefined): string {
  const match = cleanText(pabCaseNo)
    .toUpperCase()
    .match(/-\s*([AW](?:\s*\/\s*[AW])?)\s*$/)
  return match ? match[1].replace(/\s+/g, '') : ''
}

const PROVINCES: { name: string; pattern: RegExp }[] = [
  { name: 'Negros Oriental', pattern: /\bNEGROS(?:\s+ORIENTAL)?\b/ },
  { name: 'Siquijor', pattern: /\bSIQUIJOR\b/ },
  { name: 'Bohol', pattern: /\bBOHOL\b/ },
  { name: 'Cebu', pattern: /\bCEBU\b/ },
]

export function deriveProvince(address: string | null | undefined): string {
  const value = cleanText(address).toUpperCase()
  if (!value) return ''
  return PROVINCES.find((item) => item.pattern.test(value))?.name ?? ''
}

/**
 * Provinces excluded across the entire dashboard.
 * Matches bare "NEGROS" as well as "NEGROS ORIENTAL" and "SIQUIJOR".
 */
export const EXCLUDED_PROVINCES = ['Negros Oriental', 'Siquijor'] as const

export function isExcludedProvince(value: string | null | undefined): boolean {
  const raw = cleanText(value).toUpperCase()
  if (!raw) return false
  return /\bNEGROS\b/.test(raw) || /\bSIQUIJOR\b/.test(raw)
}

/**
 * Unambiguous Negros Oriental municipalities. Ambiguous names shared with
 * Cebu/Bohol (San Jose, Valencia, Pamplona, La Libertad, Santa Catalina,
 * Maria, San Juan) are deliberately omitted to avoid false positives.
 */
const NEGROS_ORIENTAL_TOWNS = [
  'AMLAN',
  'AYUNGON',
  'BACONG',
  'BAIS',
  'BASAY',
  'BAYAWAN',
  'BINDOY',
  'CANLAON',
  'DAUIN',
  'DUMAGUETE',
  'GUIHULNGAN',
  'JIMALALUD',
  'MABINAY',
  'MANJUYOD',
  'SIATON',
  'SIBULAN',
  'TANJAY',
  'TAYASAN',
  'ZAMBOANGUITA',
]

/** Unambiguous Siquijor municipalities. */
const SIQUIJOR_TOWNS = ['ENRIQUE VILLANUEVA', 'LARENA', 'LAZI']

function matchesTown(value: string, town: string): boolean {
  return new RegExp(`\\b${town.replace(/\s+/g, '\\s+')}\\b`).test(value)
}

/**
 * Returns true when a case/record can be identified as belonging to an
 * excluded province. Explicit Cebu/Bohol wins over vague town-name matches.
 * Rows with no identifiable location return false and are kept as ambiguous.
 */
export function isExcludedLocation(
  province: string | null | undefined,
  address: string | null | undefined,
  city?: string | null,
  municipality?: string | null,
  extraText?: string | null,
): boolean {
  const rawProvince = cleanText(province).toUpperCase()
  if (rawProvince) {
    if (isExcludedProvince(rawProvince)) return true
    if (/\bCEBU\b/.test(rawProvince) || /\bBOHOL\b/.test(rawProvince)) return false
  }

  const text = cleanText(
    [address, city, municipality, extraText].filter(Boolean).join(' '),
  ).toUpperCase()
  if (!text) return false
  if (/\bNEGROS\b/.test(text) || /\bSIQUIJOR\b/.test(text)) return true
  if (NEGROS_ORIENTAL_TOWNS.some((town) => matchesTown(text, town))) return true
  if (SIQUIJOR_TOWNS.some((town) => matchesTown(text, town))) return true
  return false
}

/** True when a record names Cebu, Bohol, Negros, or Siquijor explicitly. */
export function hasIdentifiableLocation(
  province: string | null | undefined,
  address: string | null | undefined,
  city?: string | null,
  municipality?: string | null,
): boolean {
  const rawProvince = cleanText(province).toUpperCase()
  if (/\b(CEBU|BOHOL|NEGROS|SIQUIJOR)\b/.test(rawProvince)) return true
  const text = cleanText([address, city, municipality].filter(Boolean).join(' '))
  return Boolean(deriveProvince(text))
}

/** True when a location is absent/ambiguous and exclusion cannot be applied. */
export function hasAmbiguousLocation(
  province: string | null | undefined,
  address: string | null | undefined,
  city?: string | null,
  municipality?: string | null,
): boolean {
  if (isExcludedLocation(province, address, city, municipality)) return false
  const rawProvince = cleanText(province).toUpperCase()
  if (/\bCEBU\b/.test(rawProvince) || /\bBOHOL\b/.test(rawProvince)) return false
  const text = cleanText([address, city, municipality].filter(Boolean).join(' '))
  return !text
}

export function displayLocation(value: string | null | undefined): string {
  return cleanText(value) || SOURCE_NOT_RECORDED
}

export function normalizeName(value: string | null | undefined): string {
  return cleanText(value)
    .toUpperCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const DATE_FORMATS = [
  'M/d/yyyy',
  'M/d/yy',
  'MM/dd/yyyy',
  'yyyy-MM-dd',
  'MMMM d, yyyy',
  'MMM d, yyyy',
  'MMMM d yyyy',
  'MMM d yyyy',
  'd MMMM yyyy',
  'd MMM yyyy',
  'M-d-yyyy',
  'M.d.yyyy',
]

export function parseDate(value: string | null | undefined): string | null {
  const raw = cleanText(value)
  if (!raw) return null

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const iso = parseISO(raw)
    if (isValid(iso) && iso.getFullYear() >= 1900 && iso.getFullYear() <= 2100) {
      return format(iso, 'yyyy-MM-dd')
    }
  }

  // Excel/Google Sheets serial dates occasionally arrive without a display value.
  if (/^\d{5}(?:\.\d+)?$/.test(raw)) {
    const serial = Number(raw)
    if (serial >= 20_000 && serial <= 80_000) {
      const date = new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000)
      if (isValid(date)) return format(date, 'yyyy-MM-dd')
    }
  }

  const normalized = raw
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b([A-Za-z]{3,9})\b/g, (word) => {
      const lower = word.toLowerCase()
      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`
    })

  for (const candidate of [raw, normalized, normalized.replace(/\./g, '')]) {
    for (const pattern of DATE_FORMATS) {
      const parsed = parse(candidate, pattern, new Date())
      if (isValid(parsed) && parsed.getFullYear() >= 1900 && parsed.getFullYear() <= 2100) {
        return format(parsed, 'yyyy-MM-dd')
      }
    }
  }
  return null
}

export function formatDate(value: string | null | undefined, fallback = '—'): string {
  if (!value) return fallback
  const raw = cleanText(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T12:00:00`)
    if (isValid(date)) return format(date, 'MMM d, yyyy')
  }
  const iso = parseDate(raw)
  if (iso) {
    const date = new Date(`${iso}T12:00:00`)
    if (isValid(date)) return format(date, 'MMM d, yyyy')
  }
  return raw
}

export function formatDateShort(value: string | null | undefined, fallback = '—'): string {
  if (!value) return fallback
  const raw = cleanText(value)
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : parseDate(raw)
  if (!iso) return raw
  const date = new Date(`${iso}T12:00:00`)
  if (!isValid(date)) return raw
  return format(date, 'MMM d, yyyy')
}

export function monthKey(value: string | null | undefined): string | null {
  if (!value) return null
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : parseDate(value)
  return iso ? iso.slice(0, 7) : null
}

export function monthLabel(key: string): string {
  if (!/^\d{4}-\d{2}$/.test(key)) return key
  const date = new Date(`${key}-01T12:00:00`)
  return isValid(date) ? format(date, 'MMM yyyy') : key
}

export function dayDiff(fromIso: string | null, toIso: string): number | null {
  if (!fromIso) return null
  const from = new Date(`${fromIso}T12:00:00`)
  const to = new Date(`${toIso}T12:00:00`)
  if (!isValid(from) || !isValid(to)) return null
  return differenceInCalendarDays(to, from)
}

export function parseMoney(value: string | null | undefined): number {
  const raw = cleanText(value)
  if (!raw) return 0
  const match = raw.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

export function formatMoney(value: number, options?: { compact?: boolean }): string {
  if (!Number.isFinite(value)) return '₱0'
  if (options?.compact) return formatCompactMoney(value)
  return `₱${new Intl.NumberFormat('en-PH', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))}`
}

export function formatCompactMoney(value: number): string {
  if (!Number.isFinite(value)) return '₱0'
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `₱${(value / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `₱${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `₱${(value / 1_000).toFixed(1)}K`
  return `₱${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(value)}`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-PH').format(value)
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`
}

export function isPaid(status: string | null | undefined): boolean {
  return cleanText(status).toUpperCase() === 'PAID'
}

export function isPending(status: string | null | undefined): boolean {
  return cleanText(status).toUpperCase().includes('PENDING')
}

export function statusLabel(status: string | null | undefined): string {
  return cleanText(status) || 'No status'
}

export function statusTone(status: string | null | undefined): 'green' | 'amber' | 'red' | 'blue' | 'slate' | 'violet' {
  const value = cleanText(status).toUpperCase()
  if (value.includes('PAID') || value.includes('CLOSED')) return 'green'
  if (value.includes('PENDING')) return 'amber'
  if (value.includes('DENIED')) return 'red'
  if (value.includes('SET ASIDE') || value.includes('RECONSIDERED')) return 'violet'
  if (value.includes('REDUCE')) return 'blue'
  if (value.includes('WITH PENALTY')) return 'amber'
  return 'slate'
}

export function pabAwLabel(code: string | null | undefined): string {
  const normalized = cleanText(code).toUpperCase().replace(/\s+/g, '')
  if (normalized === 'W') return 'With penalty'
  if (normalized === 'A') return 'Appealed'
  if (normalized === 'A/W' || normalized === 'AW' || normalized === 'W/A') {
    return 'Appealed with penalty'
  }
  if (!normalized) return 'Not coded'
  return normalized
}

export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const value = key(item)
    if (!value || seen.has(value)) return false
    seen.add(value)
    return true
  })
}

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export function initials(value: string): string {
  return cleanText(value)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function truncate(value: string, length: number): string {
  if (value.length <= length) return value
  return `${value.slice(0, length - 1)}…`
}
