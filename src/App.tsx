import { useEffect, useMemo, useState } from 'react'
import snapshotJson from './data/snapshot.json'
import { buildDashboardData, scopeDashboardData } from './lib/buildData'
import {
  EMPTY_FILTERS,
  filterCases,
  getFilterOptions,
  type CaseFilters,
} from './lib/metrics'
import { refreshSnapshotLive } from './lib/liveRefresh'
import { clearSession, loadSession, type AuthUser } from './lib/auth'
import type { CaseRecord, Page, Snapshot, YearScope } from './lib/types'
import { CaseDrawer } from './components/CaseDrawer'
import { SourceAccessGate } from './components/SourceAccessGate'
import { LoginGate } from './components/LoginGate'
import { Header } from './components/Header'
import { MobileNav, Sidebar } from './components/Sidebar'
import { Toast, type ToastTone } from './components/Toast'
import { OverviewPage } from './pages/OverviewPage'
import { CaseTrackerPage } from './pages/CaseTrackerPage'
import { EnforcementPage } from './pages/EnforcementPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { ComplaintsPage } from './pages/ComplaintsPage'
import { DocumentTrackingPage } from './pages/DocumentTrackingPage'
import { CompliancePage } from './pages/CompliancePage'
import { DataQualityPage } from './pages/DataQualityPage'
import { formatDate } from './lib/utils'

const INITIAL_SNAPSHOT = snapshotJson as unknown as Snapshot
const PAGES: Page[] = [
  'overview',
  'tracker',
  'enforcement',
  'payments',
  'complaints',
  'tracking',
  'compliance',
  'quality',
]

function pageFromHash(): Page {
  const value = window.location.hash.replace(/^#\/?/, '') as Page
  return PAGES.includes(value) ? value : 'overview'
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(() => loadSession())
  const [snapshot, setSnapshot] = useState<Snapshot>(INITIAL_SNAPSHOT)
  const [page, setPageState] = useState<Page>(pageFromHash)
  const [scope, setScope] = useState<YearScope>('all')
  const [filters, setFilters] = useState<CaseFilters>(EMPTY_FILTERS)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingSourceUrl, setPendingSourceUrl] = useState<string | null>(null)
  const [refreshProgress, setRefreshProgress] = useState('')

  const allData = useMemo(() => buildDashboardData(snapshot), [snapshot])
  const data = useMemo(() => scopeDashboardData(allData, scope), [allData, scope])
  const filteredCases = useMemo(() => filterCases(data.cases, filters), [data.cases, filters])
  const filterOptions = useMemo(() => getFilterOptions(data.cases), [data.cases])
  const selectedCase = useMemo(
    () => (selectedCaseId ? data.cases.find((caseRecord) => caseRecord.id === selectedCaseId) ?? null : null),
    [data.cases, selectedCaseId],
  )

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page, scope])

  useEffect(() => {
    const onHashChange = () => setPageState(pageFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (selectedCaseId && !data.cases.some((caseRecord) => caseRecord.id === selectedCaseId)) {
      setSelectedCaseId(null)
    }
  }, [data.cases, selectedCaseId])

  const navigate = (nextPage: Page) => {
    setPageState(nextPage)
    if (window.location.hash !== `#${nextPage}`) window.location.hash = nextPage
  }

  const openCase = (caseRecord: CaseRecord) => {
    setSelectedCaseId(caseRecord.id)
  }

  const jumpToTracker = (partial: Partial<CaseFilters>) => {
    setFilters({ ...EMPTY_FILTERS, ...partial })
    navigate('tracker')
  }

  const updateFilter = (key: keyof CaseFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const resetFilters = () => setFilters(EMPTY_FILTERS)

  const changeScope = (nextScope: YearScope) => {
    setScope(nextScope)
    setFilters(EMPTY_FILTERS)
    setSelectedCaseId(null)
  }

  const openSource = (url: string) => setPendingSourceUrl(url)

  const handleAuthenticated = (nextUser: AuthUser) => {
    setUser(nextUser)
    setToast({
      message: `Signed in as ${nextUser.displayName}.`,
      tone: 'success',
    })
  }

  const signOut = () => {
    clearSession()
    setUser(null)
    setSelectedCaseId(null)
    setToast(null)
  }

  const refresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    setRefreshProgress('Connecting to the source workbooks…')
    try {
      const result = await refreshSnapshotLive(snapshot, (message) => setRefreshProgress(message))
      setSnapshot(result.snapshot)
      const warningText = result.warnings.length
        ? ` ${result.warnings.join(' ')}`
        : ''
      setToast({
        message: `Live snapshot refreshed from ${result.snapshot.counts?.masterCases ?? 0} master cases.${warningText}`,
        tone: result.warnings.length ? 'info' : 'success',
      })
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? `Live refresh failed: ${error.message}. The bundled snapshot is still available.`
            : 'Live refresh failed. The bundled snapshot is still available.',
        tone: 'error',
      })
    } finally {
      setRefreshing(false)
      setRefreshProgress('')
    }
  }

  if (!user) {
    return <LoginGate onAuthenticated={handleAuthenticated} />
  }

  const selectedSource =
    data.sources.find((source) => source.year === selectedCase?.sourceYear)?.sourceUrl ??
    data.sourceUrl

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar
        page={page}
        onNavigate={navigate}
        dataDate={formatDate(data.dataDate)}
        sourceUrl={data.sourceUrl}
        scopeLabel={data.scopeLabel}
        onOpenSource={openSource}
      />
      <div className="min-w-0 flex-1">
        <Header
          page={page}
          dataDate={data.dataDate}
          fetchedAt={data.fetchedAt}
          sources={data.sources}
          scope={scope}
          onOpenSource={openSource}
          years={data.docketYears}
          onScopeChange={changeScope}
          refreshing={refreshing}
          refreshProgress={refreshProgress}
          onRefresh={refresh}
          user={user}
          onSignOut={signOut}
        />
        <MobileNav page={page} onNavigate={navigate} />
        <main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          {page === 'overview' ? (
            <OverviewPage
              data={data}
              onOpenCase={openCase}
              onJumpToTracker={jumpToTracker}
              onNavigate={navigate}
            />
          ) : null}
          {page === 'tracker' ? (
            <CaseTrackerPage
              data={data}
              cases={filteredCases}
              filters={filters}
              options={filterOptions}
              onFilterChange={updateFilter}
              onResetFilters={resetFilters}
              onOpenCase={openCase}
            />
          ) : null}
          {page === 'enforcement' ? <EnforcementPage data={data} onOpenCase={openCase} /> : null}
          {page === 'payments' ? <PaymentsPage data={data} onOpenCase={openCase} /> : null}
          {page === 'complaints' ? <ComplaintsPage data={data} onOpenCase={openCase} /> : null}
          {page === 'tracking' ? (
            <DocumentTrackingPage data={data} onOpenCase={openCase} />
          ) : null}
          {page === 'compliance' ? <CompliancePage data={data} onOpenCase={openCase} /> : null}
          {page === 'quality' ? <DataQualityPage data={data} onOpenCase={openCase} /> : null}
        </main>
        <footer className="no-print mx-auto flex w-full max-w-[1600px] flex-col gap-2 border-t border-white/50 px-4 py-5 text-[10px] leading-4 text-emerald-950/40 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            EMB Region 7 Legal Docket · 2022–2026 Environmental Case Monitoring · Data through{' '}
            {formatDate(data.dataDate)} · Internal use only.
          </p>
          <p>
            Read-only dashboard. Derived stages are a monitoring view, not an official legal status.
          </p>
        </footer>
      </div>

      {selectedCase ? (
        <CaseDrawer
          caseRecord={selectedCase}
          sourceUrl={selectedSource}
          onOpenSource={openSource}
          onClose={() => setSelectedCaseId(null)}
        />
      ) : null}

      {pendingSourceUrl ? (
        <SourceAccessGate
          open
          url={pendingSourceUrl}
          onClose={() => setPendingSourceUrl(null)}
          onGranted={(url) => {
            const opened = window.open(url, '_blank', 'noopener,noreferrer')
            if (!opened) window.location.href = url
            setPendingSourceUrl(null)
          }}
        />
      ) : null}

      {toast ? (
        <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
      ) : null}
    </div>
  )
}
