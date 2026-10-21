/**
 * Pulls the legal-database tabs from Google Sheets and writes
 * a normalized multi-source snapshot to src/data/snapshot.json.
 *
 * Run: npm run refresh
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const configPath = resolve(root, 'src', 'data', 'sources.json')
const target = resolve(root, 'src', 'data', 'snapshot.json')

const config = JSON.parse(await readFile(configPath, 'utf8'))

function cleanText(value) {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cellText(cell) {
  if (!cell) return ''
  if (cell.f !== null && cell.f !== undefined && cell.f !== '') return cleanText(cell.f)
  if (typeof cell.v === 'boolean') return cell.v ? 'TRUE' : 'FALSE'
  if (cell.v === null || cell.v === undefined) return ''
  return cleanText(cell.v)
}

function columnLetter(index) {
  let n = index + 1
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

function parseTable(payload, key, title, hasHeader = true) {
  if (!payload || payload.status !== 'ok') {
    throw new Error(payload?.errors?.[0]?.detailed_message || 'Google Sheets query failed')
  }

  const rawHeaders = (payload.table.cols ?? []).map((col) =>
    cleanText(col?.label),
  )

  let rows = []
  let headers = []

  if (hasHeader) {
    headers = rawHeaders.map((label, index) => label || `Column ${columnLetter(index)}`)

    let lastHeaderIndex = -1
    rawHeaders.forEach((label, index) => {
      if (label) lastHeaderIndex = index
    })

    let lastDataIndex = -1
    for (const row of payload.table.rows ?? []) {
      const values = (row.c ?? []).map(cellText)
      while (values.length < headers.length) values.push('')
      const meaningful = values
        .slice(0, 14)
        .some((value) => value !== '' && value.toUpperCase() !== 'FALSE')
      if (!meaningful) continue

      let lastIndex = -1
      values.forEach((value, index) => {
        if (value !== '') lastIndex = index
      })
      lastDataIndex = Math.max(lastDataIndex, lastIndex)
      rows.push(values)
    }

    const width = Math.max(0, lastHeaderIndex + 1, lastDataIndex + 1)
    const trimmedHeaders = headers.slice(0, width).map((label, index) => {
      return label || `Column ${columnLetter(index)}`
    })
    const trimmedRows = rows.map((row) => {
      const next = row.slice(0, width)
      while (next.length < width) next.push('')
      return next
    })

    return { key, title, headers: trimmedHeaders, rows: trimmedRows }
  } else {
    // No header row: first row is data, generate generic headers
    const firstRow = (payload.table.rows ?? [])[0]?.c ?? []
    const numCols = firstRow.length
    headers = Array.from({ length: numCols }, (_, i) => `Column ${columnLetter(i)}`)

    let lastDataIndex = -1
    for (const row of payload.table.rows ?? []) {
      const values = (row.c ?? []).map(cellText)
      while (values.length < headers.length) values.push('')
      const meaningful = values
        .slice(0, 14)
        .some((value) => value !== '' && value.toUpperCase() !== 'FALSE')
      if (!meaningful) continue

      let lastIndex = -1
      values.forEach((value, index) => {
        if (value !== '') lastIndex = index
      })
      lastDataIndex = Math.max(lastDataIndex, lastIndex)
      rows.push(values)
    }

    const width = Math.max(0, lastDataIndex + 1, numCols)
    const trimmedHeaders = headers.slice(0, width)
    const trimmedRows = rows.map((row) => {
      const next = row.slice(0, width)
      while (next.length < width) next.push('')
      return next
    })

    return { key, title, headers: trimmedHeaders, rows: trimmedRows }
  }
}

function urlFor(source, tab) {
  const params = new URLSearchParams({ tqx: 'out:json' })
  if (tab.gid !== undefined) params.set('gid', String(tab.gid))
  if (tab.sheet !== undefined) params.set('sheet', tab.sheet)
  params.set('range', tab.range)
  return `https://docs.google.com/spreadsheets/d/${source.sheetId}/gviz/tq?${params.toString()}`
}

async function fetchTab(source, tab) {
  const response = await fetch(urlFor(source, tab), {
    headers: { accept: 'application/json,text/plain,*/*' },
  })
  if (!response.ok) {
    throw new Error(`${source.year} ${tab.title}: HTTP ${response.status}`)
  }
  const text = await response.text()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error(`${source.year} ${tab.title}: unexpected response`)
  }
  const payload = JSON.parse(text.slice(start, end + 1))
  return parseTable(payload, tab.key, tab.title, tab.hasHeader !== false)
}

function masterCount(tab, year, yearColIndex = 0) {
  if (!tab) return 0
  const pattern = new RegExp(`${year}\\D*\\d{3,5}\\s*$`)
  return tab.rows.filter((row) => pattern.test(cleanText(row[yearColIndex]))).length
}

const fetchedAt = new Date().toISOString()
const sources = []
const countsByYear = {}
const tabCountsByYear = {}

for (const source of config.sources) {
  console.log(`\nFetching ${source.label}…`)
  const tabs = {}
  for (const tab of source.tabs) {
    process.stdout.write(`  ${tab.title}… `)
    const parsed = await fetchTab(source, tab)
    tabs[tab.key] = parsed
    console.log(`${parsed.rows.length} rows`)
  }

  // Use source.dataThrough if present, otherwise use fetch date
  const sourceDataDate = source.dataThrough ?? fetchedAt.slice(0, 10)

  sources.push({
    year: source.year,
    label: source.label,
    sheetId: source.sheetId,
    sourceUrl: source.sourceUrl,
    dataDate: sourceDataDate,
    coverage: source.coverage ?? [],
    tabs,
  })

  const tabCounts = {}
  for (const [key, tab] of Object.entries(tabs)) tabCounts[key] = tab.rows.length
  tabCountsByYear[source.year] = tabCounts

  // Master case count uses different column indices per source
  let masterCountResult = 0
  if (source.year === '2022' || source.year === '2023') {
    // 2022/2023 master: case number is in column 1 (index 1)
    masterCountResult = masterCount(tabs.master, source.year, 1)
  } else if (source.year === '2024') {
    // 2024 master: case number is in column 0 (index 0), no header row
    masterCountResult = masterCount(tabs.master, '2024', 0)
  } else {
    // 2025/2026: case number in column 0
    masterCountResult = masterCount(tabs.master, source.year, 0)
  }
  countsByYear[source.year] = masterCountResult
}

const snapshot = {
  fetchedAt,
  dataDate: fetchedAt.slice(0, 10),
  sources,
  counts: {
    masterCases: Object.values(countsByYear).reduce((sum, value) => sum + value, 0),
    byYear: countsByYear,
    tabs: tabCountsByYear,
  },
}

await mkdir(dirname(target), { recursive: true })
await writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
console.log(`\nSnapshot written to ${target}`)
console.log(`  ${snapshot.counts.masterCases} master cases across ${sources.length} source years`)
for (const [year, count] of Object.entries(countsByYear)) {
  console.log(`  ${year}: ${count} master cases`)
}