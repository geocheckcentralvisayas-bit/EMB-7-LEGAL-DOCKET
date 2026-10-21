import sourceConfigJson from '../data/sources.json'
import type {
  Snapshot,
  SourceConfig,
  SourceSnapshot,
  SourceTabConfig,
  TabData,
} from './types'

const sourceConfig = sourceConfigJson as { sources: SourceConfig[] }

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cellText(cell: { v?: unknown; f?: unknown } | null | undefined): string {
  if (!cell) return ''
  if (cell.f !== null && cell.f !== undefined && cell.f !== '') return cleanText(cell.f)
  if (typeof cell.v === 'boolean') return cell.v ? 'TRUE' : 'FALSE'
  if (cell.v === null || cell.v === undefined) return ''
  return cleanText(cell.v)
}

function columnLetter(index: number): string {
  let n = index + 1
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

function parseTable(payload: any, key: string, title: string): TabData {
  if (!payload || payload.status !== 'ok') {
    throw new Error(payload?.errors?.[0]?.detailed_message || 'Google Sheets query failed')
  }

  const rawHeaders: string[] = (payload.table.cols ?? []).map((col: any) =>
    cleanText(col?.label),
  )
  const headers = rawHeaders.map(
    (label, index) => label || `Column ${columnLetter(index)}`,
  )

  let lastHeaderIndex = -1
  rawHeaders.forEach((label, index) => {
    if (label) lastHeaderIndex = index
  })

  const rows: string[][] = []
  let lastDataIndex = -1
  for (const row of payload.table.rows ?? []) {
    const values: string[] = (row.c ?? []).map((cell: any) => cellText(cell))
    while (values.length < headers.length) values.push('')
    const meaningful = values
      .slice(0, 14)
      .some((value: string) => value !== '' && value.toUpperCase() !== 'FALSE')
    if (!meaningful) continue

    let lastIndex = -1
    values.forEach((value, index) => {
      if (value !== '') lastIndex = index
    })
    lastDataIndex = Math.max(lastDataIndex, lastIndex)
    rows.push(values)
  }

  // DPWH Compliance has no header row: the first row is the project name plus
  // commitments 1–3. gviz treats it as the column header, so restore it as data.
  let normalizedHeaders = headers
  if (key === 'dpwh' && rawHeaders[0]?.toUpperCase().startsWith('PROJECT NAME')) {
    rows.unshift([...rawHeaders])
    normalizedHeaders = ['Project', 'Commitment / agreement', 'Due date', 'Status', 'Remarks']
    lastHeaderIndex = normalizedHeaders.length - 1
    lastDataIndex = Math.max(lastDataIndex, normalizedHeaders.length - 1)
  }

  const width = Math.max(0, lastHeaderIndex + 1, lastDataIndex + 1)
  const trimmedHeaders = normalizedHeaders.slice(0, width).map(
    (label, index) => label || `Column ${columnLetter(index)}`,
  )
  const trimmedRows = rows.map((row) => {
    const next = row.slice(0, width)
    while (next.length < width) next.push('')
    return next
  })

  return { key, title, headers: trimmedHeaders, rows: trimmedRows }
}

function urlFor(source: SourceConfig, tab: SourceTabConfig): string {
  const params = new URLSearchParams({ tqx: 'out:json' })
  if (tab.gid !== undefined) params.set('gid', String(tab.gid))
  if (tab.sheet !== undefined) params.set('sheet', tab.sheet)
  params.set('range', tab.range)
  return `https://docs.google.com/spreadsheets/d/${source.sheetId}/gviz/tq?${params.toString()}`
}

let activeResolver: ((payload: any) => void) | null = null

function ensureJsonpCallback(): void {
  const globalWindow = window as unknown as {
    google?: {
      visualization?: {
        Query?: {
          setResponse?: (payload: any) => void
        }
      }
    }
  }
  globalWindow.google = globalWindow.google ?? {}
  globalWindow.google.visualization = globalWindow.google.visualization ?? {}
  globalWindow.google.visualization.Query = globalWindow.google.visualization.Query ?? {}
  globalWindow.google.visualization.Query.setResponse = (payload: any) => {
    const resolver = activeResolver
    activeResolver = null
    resolver?.(payload)
  }
}

function loadJsonp(url: string, timeoutMs = 30_000): Promise<any> {
  return new Promise((resolve, reject) => {
    ensureJsonpCallback()
    const script = document.createElement('script')
    let settled = false

    const cleanup = () => {
      window.clearTimeout(timer)
      activeResolver = null
      script.remove()
    }

    const finish = (payload: any) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(payload)
    }

    const fail = (error: Error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }

    const timer = window.setTimeout(() => {
      fail(new Error('Google Sheets request timed out'))
    }, timeoutMs)

    activeResolver = finish
    script.async = true
    script.src = url
    script.onerror = () => fail(new Error('Could not reach Google Sheets'))
    document.head.appendChild(script)
  })
}

function masterCount(tab: TabData | undefined, year: string): number {
  if (!tab) return 0
  const pattern = new RegExp(`${year}\\D*\\d{3,5}\\s*$`)
  const index = year === '2022' || year === '2023' ? 1 : 0
  return tab.rows.filter((row) => pattern.test(cleanText(row[index]))).length
}

export interface LiveRefreshResult {
  snapshot: Snapshot
  warnings: string[]
}

export async function refreshSnapshotLive(
  fallback: Snapshot,
  onProgress?: (message: string) => void,
): Promise<LiveRefreshResult> {
  const warnings: string[] = []
  const sources: SourceSnapshot[] = []
  const countsByYear: Record<string, number> = {}
  const tabCountsByYear: Record<string, Record<string, number>> = {}
  const totalTabs = sourceConfig.sources.reduce((sum, source) => sum + source.tabs.length, 0)
  let fetchedTabs = 0

  for (const source of sourceConfig.sources) {
    // Historical workbooks (2023/2024) are loaded from the bundled snapshot only.
    if (source.live === false) {
      const cached = fallback.sources.find((item) => item.year === source.year)
      if (cached) {
        sources.push(cached)
        countsByYear[source.year] = masterCount(cached.tabs.master, source.year)
        const tabCounts: Record<string, number> = {}
        for (const [key, tab] of Object.entries(cached.tabs)) tabCounts[key] = tab.rows.length
        tabCountsByYear[source.year] = tabCounts
        warnings.push(`${source.label} is loaded from the saved snapshot (live refresh disabled).`)
      } else {
        warnings.push(`${source.label} has no saved copy; skipped.`)
      }
      continue
    }
    try {
      const tabs: Record<string, TabData> = {}
      for (const tab of source.tabs) {
        onProgress?.(
          `Fetching ${source.label} · ${tab.title} (${fetchedTabs + 1}/${totalTabs})…`,
        )
        const payload = await loadJsonp(urlFor(source, tab))
        tabs[tab.key] = parseTable(payload, tab.key, tab.title)
        fetchedTabs += 1
      }

      const tabCounts: Record<string, number> = {}
      for (const [key, tab] of Object.entries(tabs)) tabCounts[key] = tab.rows.length
      tabCountsByYear[source.year] = tabCounts
      countsByYear[source.year] = masterCount(tabs.master, source.year)

      sources.push({
        year: source.year,
        label: source.label,
        sheetId: source.sheetId,
        sourceUrl: source.sourceUrl,
        dataDate: new Date().toLocaleDateString('en-CA'),
        coverage: source.coverage ?? [],
        tabs,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const cached = fallback.sources.find((item) => item.year === source.year)
      if (cached) {
        sources.push(cached)
        countsByYear[source.year] = masterCount(cached.tabs.master, source.year)
        const tabCounts: Record<string, number> = {}
        for (const [key, tab] of Object.entries(cached.tabs)) tabCounts[key] = tab.rows.length
        tabCountsByYear[source.year] = tabCounts
        warnings.push(`${source.label} could not be refreshed (${message}); using the saved snapshot.`)
      } else {
        warnings.push(`${source.label} could not be refreshed (${message}) and no saved copy exists.`)
      }
    }
  }

  if (!sources.length) {
    throw new Error('No source workbook could be loaded. Keeping the bundled snapshot.')
  }

  const fetchedAt = new Date().toISOString()
  return {
    snapshot: {
      fetchedAt,
      dataDate: fetchedAt.slice(0, 10),
      sources,
      counts: {
        masterCases: Object.values(countsByYear).reduce((sum, value) => sum + value, 0),
        byYear: countsByYear,
        tabs: tabCountsByYear,
      },
    },
    warnings,
  }
}

export { sourceConfig as LIVE_SOURCES }
