import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Gavel,
  MessageSquareWarning,
  ReceiptText,
  Scale,
  Truck,
} from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import type { CaseRecord } from '../lib/types'
import { classNames, formatDate, formatNumber } from '../lib/utils'
import { EmptyState, FlagChip, StagePill } from './ui'

function LinkedCount({
  icon: Icon,
  count,
  label,
  tone,
}: {
  icon: typeof Scale
  count: number
  label: string
  tone: string
}) {
  if (!count) return null
  return (
    <span
      className={classNames('inline-flex items-center gap-0.5 text-[10px] font-semibold', tone)}
      title={`${count} ${label}`}
    >
      <Icon className="h-3 w-3" />
      {count}
    </span>
  )
}

export function CaseTable({
  cases,
  onOpenCase,
}: {
  cases: CaseRecord[]
  onOpenCase: (caseRecord: CaseRecord) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'dateDocketed', desc: true }])

  const columns = useMemo<ColumnDef<CaseRecord>[]>(
    () => [
      {
        accessorKey: 'displayCaseNo',
        header: 'Case no.',
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className={classNames(
                  'whitespace-nowrap font-mono text-[11px] font-semibold',
                  row.original.isUnnumbered ? 'text-rose-700' : 'text-navy-700',
                )}
                title={row.original.rawCaseNo}
              >
                {row.original.displayCaseNo}
              </span>
              <span className="rounded bg-white/60 px-1 py-0.5 text-[9px] font-bold tabular-nums text-slate-500 ring-1 ring-white/70">
                {row.original.docketYear ?? row.original.sourceYear}
              </span>
              {row.original.dataIssues.length ? (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500"
                  title={row.original.dataIssues.join('; ')}
                />
              ) : null}
            </div>
            {row.original.sourceYear !== row.original.docketYear ? (
              <span className="text-[9px] text-slate-400">
                Source year {row.original.sourceYear}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'establishment',
        header: 'Establishment / project',
        cell: ({ row }) => (
          <div className="min-w-[160px] max-w-[260px]">
            <p className="line-clamp-2 text-[13px] font-medium leading-5 text-slate-800">
              {row.original.establishment}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {row.original.documentType || 'Document type not stated'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'location',
        header: 'Location',
        cell: ({ row }) => (
          <div className="max-w-[130px] text-xs leading-5 text-slate-600">
            <p className="truncate">{row.original.location || '—'}</p>
            <p className="truncate text-[10px] text-slate-400">{row.original.province || 'Unknown'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'handler',
        header: 'Handler',
        cell: ({ row }) => (
          <span className="block max-w-[100px] truncate text-xs text-slate-600">
            {row.original.handler || 'Unassigned'}
          </span>
        ),
      },
      {
        accessorKey: 'stage',
        header: 'Stage',
        cell: ({ row }) => (
          <div className="space-y-1">
            <StagePill stage={row.original.stage} />
            {row.original.pendingPayment ? (
              <p className="text-[10px] font-semibold text-amber-600">Payment pending</p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'flags',
        header: 'Flags',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex max-w-[180px] flex-wrap gap-1">
            {row.original.flags.slice(0, 2).map((flag) => (
              <FlagChip key={flag} flag={flag} />
            ))}
            {row.original.flags.length > 2 ? (
              <span className="pill bg-white/50 text-slate-500 ring-1 ring-white/60">+{row.original.flags.length - 2}</span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'dateDocketed',
        header: 'Docketed',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-slate-600">
            {formatDate(row.original.dateDocketed)}
          </span>
        ),
      },
      {
        accessorKey: 'ageDays',
        header: 'Age',
        cell: ({ row }) => {
          const age = row.original.ageDays
          if (age === null) return <span className="text-xs text-slate-400">—</span>
          return (
            <span
              className={classNames(
                'whitespace-nowrap text-xs font-medium tabular-nums',
                age > 180 ? 'text-rose-600' : age > 90 ? 'text-amber-600' : 'text-slate-600',
              )}
            >
              {age}d
            </span>
          )
        },
      },
      {
        accessorKey: 'linkCount',
        header: 'Linked records',
        cell: ({ row }) => {
          const caseRecord = row.original
          const hasAny =
            caseRecord.pabNov.length ||
            caseRecord.orders.length ||
            caseRecord.pabOrders.length ||
            caseRecord.erf.length ||
            caseRecord.pabPenalties.length ||
            caseRecord.ra6969.length ||
            caseRecord.complaints.length ||
            caseRecord.lbc.length ||
            caseRecord.dpwh.length
          if (!hasAny) return <span className="text-xs text-slate-300">—</span>
          return (
            <div className="flex max-w-[120px] flex-wrap gap-x-2 gap-y-1">
              <LinkedCount icon={Scale} count={caseRecord.pabNov.length} label="PAB notices" tone="text-amber-700" />
              <LinkedCount icon={FileText} count={caseRecord.orders.length} label="orders" tone="text-sky-800" />
              <LinkedCount icon={Gavel} count={caseRecord.pabOrders.length} label="PAB orders" tone="text-lime-900" />
              <LinkedCount
                icon={ReceiptText}
                count={caseRecord.erf.length + caseRecord.pabPenalties.length + caseRecord.ra6969.length}
                label="payments"
                tone="text-emerald-700"
              />
              <LinkedCount
                icon={MessageSquareWarning}
                count={caseRecord.complaints.length}
                label="complaints"
                tone="text-orange-700"
              />
              <LinkedCount
                icon={Truck}
                count={caseRecord.lbc.length}
                label="LBC documents"
                tone="text-cyan-700"
              />
              <LinkedCount
                icon={ClipboardCheck}
                count={caseRecord.dpwh.length}
                label="DPWH commitments"
                tone="text-violet-700"
              />
            </div>
          )
        },
      },
      {
        id: 'open',
        header: '',
        enableSorting: false,
        cell: () => <ChevronRight className="h-4 w-4 text-slate-300" />,
      },
    ],
    [],
  )

  const table = useReactTable({
    data: cases,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  })

  if (!cases.length) {
    return (
      <EmptyState
        title="No cases match these filters"
        description="Try removing a province, stage, or flag filter, or search for a different case number or establishment."
      />
    )
  }

  const pageCount = table.getPageCount()
  const pageIndex = table.getState().pagination.pageIndex
  const first = pageIndex * table.getState().pagination.pageSize + 1
  const last = Math.min((pageIndex + 1) * table.getState().pagination.pageSize, cases.length)

  return (
    <div>
      <div className="table-wrap max-h-[68vh] overflow-auto scrollbar-thin">
        <table className="data-table min-w-[1040px]">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 uppercase tracking-wider transition hover:text-slate-800"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-300" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer"
                onClick={() => onOpenCase(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span>
            Showing <span className="font-semibold text-slate-700">{formatNumber(first)}</span>–
            <span className="font-semibold text-slate-700">{formatNumber(last)}</span> of{' '}
            <span className="font-semibold text-slate-700">{formatNumber(cases.length)}</span>
          </span>
          <span className="hidden text-slate-300 sm:inline">·</span>
          <label className="hidden items-center gap-1.5 sm:flex">
            <span>Rows</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
              className="rounded-lg border border-white/70 bg-white/55 px-1.5 py-1 text-[11px] text-slate-600 outline-none backdrop-blur-md focus:border-brand-500"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="btn-secondary px-2.5 py-1.5 text-[11px]"
          >
            First
          </button>
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="btn-secondary px-2.5 py-1.5 text-[11px]"
          >
            Previous
          </button>
          <span className="px-2 text-[11px] tabular-nums text-slate-500">
            {pageIndex + 1} / {Math.max(1, pageCount)}
          </span>
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="btn-secondary px-2.5 py-1.5 text-[11px]"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            className="btn-secondary px-2.5 py-1.5 text-[11px]"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  )
}
