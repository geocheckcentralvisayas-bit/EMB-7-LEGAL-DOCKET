import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Check,
  ClipboardCheck,
  ClipboardCopy,
  ExternalLink,
  FileText,
  Gavel,
  Hash,
  MapPin,
  MessageSquareWarning,
  ReceiptText,
  Scale,
  Truck,
  User,
  X,
} from 'lucide-react'
import type { CaseRecord } from '../lib/types'
import { STAGE_META } from '../lib/types'
import {
  classNames,
  formatDate,
  formatMoney,
  isPaid,
  pabAwLabel,
} from '../lib/utils'
import { FlagChip, InfoRow, RecordStatusPill, StagePill } from './ui'

function RecordCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={classNames(
        'rounded-xl border border-white/60 bg-white/45 p-3.5 shadow-sm backdrop-blur-md',
        className,
      )}
    >
      {children}
    </div>
  )
}

function TimelineHeading({
  icon: Icon,
  title,
  count,
  tone = 'slate',
}: {
  icon: typeof Gavel
  title: string
  count: number
  tone?: string
}) {
  const tones: Record<string, string> = {
    slate: 'bg-white/50 text-slate-600',
    amber: 'bg-amber-100/70 text-amber-800',
    blue: 'bg-sky-100/70 text-sky-800',
    lime: 'bg-lime-100/70 text-lime-900',
    green: 'bg-emerald-100/70 text-emerald-800',
    orange: 'bg-orange-100/70 text-orange-800',
    cyan: 'bg-cyan-100/70 text-cyan-800',
    violet: 'bg-violet-100/70 text-violet-800',
  }
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <div className={classNames('flex h-7 w-7 items-center justify-center rounded-lg', tones[tone])}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {title}
      </h4>
      <span className="rounded-full bg-white/55 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900/55 ring-1 ring-white/60">
        {count}
      </span>
    </div>
  )
}

function PaymentLine({
  label,
  amount,
  status,
  date,
  orNumber,
  subtype,
}: {
  label: string
  amount: number
  status: string
  date: string | null
  orNumber: string
  subtype?: string
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {formatDate(date)}
          {orNumber ? ` · OR ${orNumber}` : ''}
          {subtype ? ` · ${subtype}` : ''}
        </p>
      </div>
      <div className="text-right">
        <p
          className={classNames(
            'text-sm font-semibold tabular-nums',
            isPaid(status) ? 'text-emerald-700' : 'text-slate-700',
          )}
        >
          {formatMoney(amount)}
        </p>
        <RecordStatusPill status={status} />
      </div>
    </div>
  )
}

export function CaseDrawer({
  caseRecord,
  sourceUrl,
  onOpenSource,
  onClose,
}: {
  caseRecord: CaseRecord
  sourceUrl: string
  onOpenSource?: (url: string) => void
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const meta = STAGE_META[caseRecord.stage]

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const violationGroups = useMemo(() => {
    const groups = new Map<string, string[]>()
    for (const item of caseRecord.violations) {
      const label = `${item.law} · ${item.stage}`
      const values = groups.get(label) ?? []
      values.push(item.value)
      groups.set(label, values)
    }
    return [...groups.entries()]
  }, [caseRecord.violations])

  const copySummary = async () => {
    const lines = [
      `${caseRecord.displayCaseNo} — ${caseRecord.establishment}`,
      `Docket year: ${caseRecord.docketYear ?? caseRecord.sourceYear} (source year ${caseRecord.sourceYear})`,
      `Stage: ${caseRecord.stageLabel}`,
      `Docketed: ${formatDate(caseRecord.dateDocketed)}`,
      `IIS reference: ${caseRecord.iisRef || '—'}`,
      `Location: ${[caseRecord.city || caseRecord.municipality || caseRecord.location, caseRecord.province].filter(Boolean).join(', ') || 'Not recorded in source'}`,
      `Full address: ${caseRecord.address || '—'}`,
      `Handler: ${caseRecord.handler || '—'}`,
      `Document: ${caseRecord.documentType || '—'}`,
      `PAB NOV records: ${caseRecord.pabNov.length}`,
      `Orders / resolutions: ${caseRecord.orders.length}`,
      `PAB orders: ${caseRecord.pabOrders.length}`,
      `LBC documents: ${caseRecord.lbc.length}`,
      `DPWH commitments: ${caseRecord.dpwh.length}`,
      `Payments recorded: ${formatMoney(caseRecord.paidAmount)}`,
      '',
      `Source: EMB Region 7 ${caseRecord.sourceYear} Legal Database (read-only).`,
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className="no-print fixed inset-0 z-50 flex justify-end bg-navy-950/30 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Case details for ${caseRecord.displayCaseNo}`}
      onMouseDown={onClose}
    >
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-gradient-to-b from-white/85 via-white/65 to-white/45 shadow-drawer backdrop-blur-2xl animate-slide-in"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-white/60 bg-white/55 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-emerald-100/70 px-2 py-1 font-mono text-[11px] font-semibold text-navy-800 ring-1 ring-white/60">
                  {caseRecord.displayCaseNo}
                </span>
                <span className="rounded-lg bg-white/55 px-2 py-1 text-[10px] font-bold tabular-nums text-slate-600 ring-1 ring-white/70">
                  {caseRecord.docketYear ?? caseRecord.sourceYear}
                </span>
                <StagePill stage={caseRecord.stage} />
                {caseRecord.isUnnumbered ? (
                  <span className="pill bg-rose-50 text-rose-700 ring-1 ring-rose-100">
                    Unnumbered
                  </span>
                ) : null}
              </div>
              <h2 className="mt-2 text-lg font-semibold leading-6 tracking-tight text-navy-900">
                {caseRecord.establishment}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                {[
                  caseRecord.city || caseRecord.municipality || caseRecord.location,
                  caseRecord.province,
                ]
                  .filter(Boolean)
                  .filter((value, index, all) => all.indexOf(value) === index)
                  .join(', ') || 'Location not recorded in source'}
              </p>
              {caseRecord.sourceYear !== caseRecord.docketYear ? (
                <p className="mt-1 text-[10px] text-slate-400">
                  Source workbook year {caseRecord.sourceYear}; records grouped under docket year{' '}
                  {caseRecord.docketYear}.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-white/70 hover:text-navy-700"
              aria-label="Close case details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-white/50 px-5 py-3 sm:px-6">

            <button type="button" onClick={copySummary} className="btn-secondary text-xs">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy summary'}
            </button>
            <button type="button" onClick={() => onOpenSource?.(sourceUrl)} className="btn-secondary text-xs">
              <ExternalLink className="h-3.5 w-3.5" />
              Source sheet
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/45 px-3 py-2 text-[11px] text-emerald-950/55 ring-1 ring-white/60">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
              {caseRecord.lastActionDate
                ? `Last action ${formatDate(caseRecord.lastActionDate)}`
                : 'No linked action date'}
            </span>
          </div>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <section className="glass-inset p-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              <InfoRow label="IIS reference" value={caseRecord.iisRef || '—'} />
              <InfoRow label="Docket year" value={caseRecord.docketYear ?? caseRecord.sourceYear} />
              <InfoRow label="Source year" value={caseRecord.sourceYear} />
              <InfoRow
                label="Source case number"
                value={caseRecord.rawCaseNo || caseRecord.displayCaseNo}
                className="col-span-2 sm:col-span-1"
              />
              <InfoRow label="Date docketed" value={formatDate(caseRecord.dateDocketed)} />
              <InfoRow
                label="Case age"
                value={caseRecord.ageDays !== null ? `${caseRecord.ageDays} days` : '—'}
              />
              <InfoRow label="Document type" value={caseRecord.documentType || '—'} />
              <InfoRow label="Case handler" value={caseRecord.handler || 'Unassigned'} />
              <InfoRow label="Proponent / respondent" value={caseRecord.proponent || '—'} />
              <InfoRow label="Email" value={caseRecord.email || '—'} />
              <InfoRow label="Contact number" value={caseRecord.contact || '—'} />
              <InfoRow
                label="Full address"
                value={caseRecord.address || '—'}
                className="col-span-2 sm:col-span-3"
              />
            </dl>
          </section>

          <section className="glass-inset mt-4 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Compliance flags
              </h3>
              {caseRecord.pendingPayment ? (
                <span className="pill bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                  Payment pending
                </span>
              ) : null}
            </div>
            {caseRecord.flags.length ? (
              <div className="flex flex-wrap gap-1.5">
                {caseRecord.flags.map((flag) => (
                  <FlagChip key={flag} flag={flag} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No compliance or coverage flags recorded.</p>
            )}
            {violationGroups.length ? (
              <div className="mt-4 space-y-2 border-t border-white/50 pt-3">
                {violationGroups.map(([label, values]) => (
                  <div key={label} className="flex flex-wrap items-start gap-2">
                    <span className="mt-0.5 w-36 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {label}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {values.map((value) => (
                        <span
                          key={value}
                          className="rounded-md bg-white/45 px-2 py-1 text-[11px] text-slate-600 ring-1 ring-white/60"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="mt-5 space-y-5">
            <div>
              <TimelineHeading icon={Scale} title="PAB notices" count={caseRecord.pabNov.length} tone="amber" />
              {caseRecord.pabNov.length ? (
                <div className="space-y-2">
                  {caseRecord.pabNov.map((record) => (
                    <RecordCard key={record.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-xs font-semibold text-amber-700">{record.pabCaseNo}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {formatDate(record.dateDocketed)} · {record.documentType || 'Document type not stated'}
                          </p>
                        </div>
                        <span className="pill bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                          PAB code: {pabAwLabel(record.aw)}
                        </span>
                      </div>
                      {record.violations.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {record.violations.map((violation) => (
                            <span
                              key={violation}
                              className="rounded-md bg-white/45 px-2 py-1 text-[10px] text-slate-600 ring-1 ring-white/60"
                            >
                              {violation}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-2 text-[10px] text-slate-400">
                        Linked via {record.matchBasis || 'source record'}
                      </p>
                    </RecordCard>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-emerald-800/15 bg-white/30 px-3 py-3 text-xs text-emerald-900/50 backdrop-blur-sm">
                  No PAB notice linked to this case in the current snapshot.
                </p>
              )}
            </div>

            <div>
              <TimelineHeading icon={FileText} title="Orders & resolutions" count={caseRecord.orders.length} tone="blue" />
              {caseRecord.orders.length ? (
                <div className="space-y-2">
                  {caseRecord.orders.map((order) => (
                    <RecordCard key={order.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {order.documentType || 'Order / resolution'}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {formatDate(order.date)} · {order.caseNo || 'No case number'}
                          </p>
                        </div>
                        <RecordStatusPill status={order.status} />
                      </div>
                      {order.violation ? (
                        <p className="mt-2 text-[11px] leading-5 text-slate-600">{order.violation}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/50 pt-2">
                        <span className="text-[10px] text-slate-400">Linked via {order.matchBasis}</span>
                        <span className="text-xs font-semibold tabular-nums text-slate-700">
                          {order.amount ? formatMoney(order.amount) : 'No amount recorded'}
                        </span>
                      </div>
                    </RecordCard>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-emerald-800/15 bg-white/30 px-3 py-3 text-xs text-emerald-900/50 backdrop-blur-sm">
                  No order or resolution linked to this case.
                </p>
              )}
            </div>

            <div>
              <TimelineHeading icon={Gavel} title="PAB orders" count={caseRecord.pabOrders.length} tone="violet" />
              {caseRecord.pabOrders.length ? (
                <div className="space-y-2">
                  {caseRecord.pabOrders.map((order) => (
                    <RecordCard key={order.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {order.documentType || 'PAB order / resolution'}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                            {order.pabCaseNo} · {formatDate(order.dateIssued)}
                          </p>
                        </div>
                        <RecordStatusPill status={order.status} />
                      </div>
                      {order.violation ? (
                        <p className="mt-2 text-[11px] leading-5 text-slate-600">{order.violation}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/50 pt-2">
                        <span className="text-[10px] text-slate-400">Linked via {order.matchBasis}</span>
                        <span className="text-xs font-semibold tabular-nums text-slate-700">
                          {order.amount ? formatMoney(order.amount) : 'No amount recorded'}
                        </span>
                      </div>
                    </RecordCard>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-emerald-800/15 bg-white/30 px-3 py-3 text-xs text-emerald-900/50 backdrop-blur-sm">
                  No PAB order linked to this case.
                </p>
              )}
            </div>

            <div>
              <TimelineHeading icon={ReceiptText} title="Payments" count={caseRecord.erf.length + caseRecord.pabPenalties.length + caseRecord.ra6969.length} tone="green" />
              {caseRecord.erf.length || caseRecord.pabPenalties.length || caseRecord.ra6969.length ? (
                <div className="space-y-2">
                  {caseRecord.erf.map((payment) => (
                    <RecordCard key={payment.id}>
                      <PaymentLine
                        label={`ERF · ${payment.company}`}
                        amount={payment.amount}
                        status={payment.status}
                        date={payment.dateIso}
                        orNumber={payment.orNumber}
                      />
                      <p className="mt-2 text-[10px] text-slate-400">
                        Case {payment.caseNo} · linked via {payment.matchBasis}
                      </p>
                    </RecordCard>
                  ))}
                  {caseRecord.pabPenalties.map((payment) => (
                    <RecordCard key={payment.id}>
                      <PaymentLine
                        label={`PAB penalty · ${payment.company}`}
                        amount={payment.amount}
                        status={payment.status}
                        date={payment.dateIso}
                        orNumber={payment.orNumber}
                        subtype={payment.subtype}
                      />
                      <p className="mt-2 text-[10px] text-slate-400">
                        {payment.pabCaseNo} · linked via {payment.matchBasis}
                      </p>
                    </RecordCard>
                  ))}
                  {caseRecord.ra6969.map((payment) => (
                    <RecordCard key={payment.id}>
                      <PaymentLine
                        label={`RA 6969 penalty · ${payment.company}`}
                        amount={payment.amount}
                        status={payment.status}
                        date={payment.dateIso}
                        orNumber={payment.orNumber}
                        subtype={payment.subtype}
                      />
                      <p className="mt-2 text-[10px] text-slate-400">
                        Case {payment.caseNo} · linked via {payment.matchBasis}
                      </p>
                    </RecordCard>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-emerald-800/15 bg-white/30 px-3 py-3 text-xs text-emerald-900/50 backdrop-blur-sm">
                  No payment record linked to this case.
                </p>
              )}
            </div>

            <div>
              <TimelineHeading icon={Truck} title="LBC documents" count={caseRecord.lbc.length} tone="cyan" />
              {caseRecord.lbc.length ? (
                <div className="space-y-2">
                  {caseRecord.lbc.map((record) => (
                    <RecordCard key={record.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {record.documentType || 'Document'}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Outbound {formatDate(record.dateOutboundIso ?? record.dateOutbound)}
                            {record.trackingNo ? ` · ${record.trackingNo}` : ''}
                          </p>
                        </div>
                        <span className="pill bg-cyan-50 text-cyan-800 ring-1 ring-cyan-100">
                          {record.status || 'No LBC status'}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-slate-500 sm:grid-cols-2">
                        <p>Returned: {formatDate(record.dateReturnedIso ?? record.dateReturned, '—')}</p>
                        <p>Closed: {formatDate(record.dateClosedIso ?? record.dateClosed, '—')}</p>
                      </div>
                      {record.statusAfterLbc || record.actionsIfReturned ? (
                        <p className="mt-2 rounded-lg bg-white/45 px-2.5 py-2 text-[11px] leading-5 text-slate-600 ring-1 ring-white/60">
                          {record.statusAfterLbc || record.actionsIfReturned}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[10px] text-slate-400">
                        {record.caseNo ? `Case ${record.caseNo} · ` : ''}
                        linked via {record.matchBasis || 'source record'}
                      </p>
                    </RecordCard>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-emerald-800/15 bg-white/30 px-3 py-3 text-xs text-emerald-900/50 backdrop-blur-sm">
                  No LBC tracking row linked to this case.
                </p>
              )}
            </div>

            <div>
              <TimelineHeading
                icon={ClipboardCheck}
                title="DPWH commitments"
                count={caseRecord.dpwh.length}
                tone="violet"
              />
              {caseRecord.dpwh.length ? (
                <div className="space-y-2">
                  {caseRecord.dpwh.map((record) => (
                    <RecordCard key={record.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{record.project}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Due {formatDate(record.dueDateIso ?? record.dueDate, 'not stated')}
                          </p>
                        </div>
                        <span className="pill bg-violet-50 text-violet-800 ring-1 ring-violet-100">
                          {record.status || 'No status'}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] leading-5 text-slate-600">{record.commitment}</p>
                      {record.remarks ? (
                        <p className="mt-2 rounded-lg bg-white/45 px-2.5 py-2 text-[11px] leading-5 text-slate-500 ring-1 ring-white/60">
                          {record.remarks}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[10px] text-slate-400">
                        Linked via {record.matchBasis || 'IIS reference'}
                      </p>
                    </RecordCard>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-emerald-800/15 bg-white/30 px-3 py-3 text-xs text-emerald-900/50 backdrop-blur-sm">
                  No DPWH compliance row linked to this case.
                </p>
              )}
            </div>

            <div>
              <TimelineHeading icon={MessageSquareWarning} title="Complaints" count={caseRecord.complaints.length} tone="orange" />
              {caseRecord.complaints.length ? (
                <div className="space-y-2">
                  {caseRecord.complaints.map((complaint) => (
                    <RecordCard key={complaint.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-5 text-slate-800">
                          {complaint.subject || 'Complaint'}
                        </p>
                        <span className="pill bg-orange-50 text-orange-700 ring-1 ring-orange-100">
                          {complaint.mode || 'Mode not stated'}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {formatDate(complaint.dateIso)}
                        {complaint.complainant ? ` · ${complaint.complainant}` : ''}
                      </p>
                      {complaint.respondent ? (
                        <p className="mt-1 text-[11px] text-slate-500">Respondent: {complaint.respondent}</p>
                      ) : null}
                      {complaint.actions ? (
                        <p className="mt-2 rounded-lg bg-white/45 px-2.5 py-2 text-[11px] leading-5 text-slate-600 ring-1 ring-white/60">
                          {complaint.actions}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[10px] text-slate-400">Linked via {complaint.matchBasis}</p>
                    </RecordCard>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-emerald-800/15 bg-white/30 px-3 py-3 text-xs text-emerald-900/50 backdrop-blur-sm">
                  No complaint linked to this case.
                </p>
              )}
            </div>
          </section>

          {caseRecord.notes ? (
            <section className="mt-5 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                  Case notes
                </h3>
              </div>
              <p className="mt-2 text-xs leading-5 text-amber-900/80">{caseRecord.notes}</p>
            </section>
          ) : null}

          {caseRecord.dataIssues.length ? (
            <section className="mt-4 rounded-2xl border border-rose-200/70 bg-rose-50/50 p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700">
                Data quality notes
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-rose-900/75">
                {caseRecord.dataIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="glass-inset mt-4 flex flex-wrap items-center gap-3 p-4 text-[11px] text-emerald-950/55">
            <span className="inline-flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-slate-400" />
              {caseRecord.iisRef || 'No IIS reference'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              {caseRecord.documentType || 'No document type'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              {caseRecord.handler || 'No handler'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
              {formatDate(caseRecord.dateDocketed)}
            </span>
          </section>
          <p className="mt-4 pb-2 text-[10px] leading-4 text-slate-400">
            Derived stage is a monitoring view, not an official legal status. “Payment recorded” means a paid
            payment row is linked; it does not by itself mean the case is closed or terminated.
          </p>
        </div>
      </div>
    </div>
  )
}
