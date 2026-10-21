import { useState } from 'react'
import {
  ChevronDown,
  Download,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import type { CaseFilters } from '../lib/metrics'
import { STAGE_META, type StageKey } from '../lib/types'
import { classNames } from '../lib/utils'

export interface FilterOptions {
  provinces: string[]
  locations: string[]
  handlers: string[]
  documentTypes: string[]
  flags: string[]
  months: { key: string; label: string }[]
}

function FilterChip({ label, value, onClear }: { label: string; value: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 py-1 pl-2.5 pr-1 text-[11px] font-medium text-brand-800">
      <span className="text-brand-600">{label}:</span>
      <span className="max-w-[180px] truncate">{value}</span>
      <button
        type="button"
        onClick={onClear}
        className="rounded-full p-0.5 text-brand-500 transition hover:bg-brand-100 hover:text-brand-800"
        aria-label={`Clear ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

export function FilterBar({
  filters,
  options,
  onChange,
  onReset,
  resultCount,
  totalCount,
  onExport,
}: {
  filters: CaseFilters
  options: FilterOptions
  onChange: (key: keyof CaseFilters, value: string) => void
  onReset: () => void
  resultCount: number
  totalCount: number
  onExport: () => void
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const stageOptions = Object.entries(STAGE_META) as [StageKey, (typeof STAGE_META)[StageKey]][]
  const hasFilters =
    filters.search ||
    filters.province ||
    filters.location ||
    filters.handler ||
    filters.documentType ||
    filters.stage ||
    filters.flag ||
    filters.month ||
    filters.dateFrom ||
    filters.dateTo
  const advancedActive = Boolean(filters.dateFrom || filters.dateTo)

  const activeChips: { key: keyof CaseFilters; label: string; value: string }[] = []
  if (filters.province) activeChips.push({ key: 'province', label: 'Province', value: filters.province })
  if (filters.location) activeChips.push({ key: 'location', label: 'Location', value: filters.location })
  if (filters.handler) activeChips.push({ key: 'handler', label: 'Handler', value: filters.handler })
  if (filters.documentType)
    activeChips.push({ key: 'documentType', label: 'Document', value: filters.documentType })
  if (filters.stage)
    activeChips.push({
      key: 'stage',
      label: 'Stage',
      value: STAGE_META[filters.stage as StageKey]?.label ?? filters.stage,
    })
  if (filters.flag) activeChips.push({ key: 'flag', label: 'Flag', value: filters.flag })
  if (filters.month) {
    const month = options.months.find((item) => item.key === filters.month)
    activeChips.push({ key: 'month', label: 'Month', value: month?.label ?? filters.month })
  }
  if (filters.dateFrom) activeChips.push({ key: 'dateFrom', label: 'From', value: filters.dateFrom })
  if (filters.dateTo) activeChips.push({ key: 'dateTo', label: 'To', value: filters.dateTo })

  return (
    <div className="card card-pad">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-navy-900">Filter the case register</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{resultCount}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalCount}</span> records
            {filters.search ? ` matching “${filters.search}”` : ''}.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className={classNames(
              'btn-secondary text-xs',
              advancedActive && 'border-brand-200 bg-brand-50 text-brand-800',
            )}
          >
            <ChevronDown
              className={classNames('h-3.5 w-3.5 transition', showAdvanced && 'rotate-180')}
            />
            Advanced
            {advancedActive ? (
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            ) : null}
          </button>
          <button type="button" onClick={onExport} className="btn-primary text-xs">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <div className="relative sm:col-span-2 lg:col-span-2 xl:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(event) => onChange('search', event.target.value)}
            placeholder="Search case no., IIS ref, establishment, handler…"
            className="input pl-9 pr-9"
            aria-label="Search cases"
          />
          {filters.search ? (
            <button
              type="button"
              onClick={() => onChange('search', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-white/70 hover:text-navy-700"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <select
          value={filters.province}
          onChange={(event) => onChange('province', event.target.value)}
          className="select"
          aria-label="Filter by province"
        >
          <option value="">All provinces</option>
          {options.provinces.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>

        <select
          value={filters.location}
          onChange={(event) => onChange('location', event.target.value)}
          className="select"
          aria-label="Filter by city or municipality"
        >
          <option value="">All cities / municipalities</option>
          {options.locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>

        <select
          value={filters.stage}
          onChange={(event) => onChange('stage', event.target.value)}
          className="select"
          aria-label="Filter by stage"
        >
          <option value="">All stages</option>
          {stageOptions.map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>

        <select
          value={filters.handler}
          onChange={(event) => onChange('handler', event.target.value)}
          className="select"
          aria-label="Filter by handler"
        >
          <option value="">All handlers</option>
          {options.handlers.map((handler) => (
            <option key={handler} value={handler}>
              {handler}
            </option>
          ))}
        </select>

        <select
          value={filters.documentType}
          onChange={(event) => onChange('documentType', event.target.value)}
          className="select"
          aria-label="Filter by document type"
        >
          <option value="">All document types</option>
          {options.documentTypes.map((documentType) => (
            <option key={documentType} value={documentType}>
              {documentType}
            </option>
          ))}
        </select>

        <select
          value={filters.flag}
          onChange={(event) => onChange('flag', event.target.value)}
          className="select"
          aria-label="Filter by compliance flag"
        >
          <option value="">All compliance flags</option>
          {options.flags.map((flag) => (
            <option key={flag} value={flag}>
              {flag}
            </option>
          ))}
        </select>

        <select
          value={filters.month}
          onChange={(event) => onChange('month', event.target.value)}
          className="select"
          aria-label="Filter by month docketed"
        >
          <option value="">All months</option>
          {options.months.map((month) => (
            <option key={month.key} value={month.key}>
              {month.label}
            </option>
          ))}
        </select>

        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <button
            type="button"
            onClick={onReset}
            disabled={!hasFilters}
            className="btn-secondary w-full text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      {showAdvanced ? (
        <div className="glass-inset mt-3 grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Docketed from
            </span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => onChange('dateFrom', event.target.value)}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Docketed to
            </span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => onChange('dateTo', event.target.value)}
              className="input"
            />
          </label>
          <div className="flex items-end sm:col-span-2">
            <p className="text-[11px] leading-5 text-slate-500">
              Date range uses the master <span className="font-medium text-slate-700">Date Docketed</span>{' '}
              field. Invalid source dates are excluded when a date filter is active.
            </p>
          </div>
        </div>
      ) : null}

      {activeChips.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/50 pt-3">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Active
          </span>
          {activeChips.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              value={chip.value}
              onClear={() => onChange(chip.key, '')}
            />
          ))}
          <button
            type="button"
            onClick={onReset}
            className="ml-1 text-[11px] font-semibold text-slate-500 underline-offset-2 hover:text-brand-700 hover:underline"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  )
}
