import { readFileSync } from 'node:fs'
import { buildDashboardData, scopeDashboardData } from './src/lib/buildData.ts'
import type { Snapshot } from './src/lib/types.ts'

const snapshot = JSON.parse(
  readFileSync('./src/data/snapshot.json', 'utf8'),
) as Snapshot

const all = buildDashboardData(snapshot)
console.log('ALL cases', all.cases.length)
console.log('exclusions', JSON.stringify(all.exclusions, null, 2))
for (const year of ['2023','2024','2025','2026']) {
  const scoped = scopeDashboardData(all, year)
  console.log(year, 'cases', scoped.cases.length, 'dpwh', scoped.dpwh.length, 'complaints', scoped.complaints.length, 'lbc', scoped.lbc.length)
}
console.log('orders', all.orders.length, 'pabOrders', all.pabOrders.length)
console.log('pabNov', all.pabNov.length, 'erf', all.erf.length, 'pabPen', all.pabPenalties.length)
console.log('unlinked pabNov', all.dataIssues.unlinked.pabNov.length)
console.log('unlinked orders', all.dataIssues.unlinked.orders.length)
console.log('unlinked pabOrders', all.dataIssues.unlinked.pabOrders.length)
console.log('unlinked erf', all.dataIssues.unlinked.erf.length)
console.log('unlinked pabPen', all.dataIssues.unlinked.pabPenalties.length)
console.log('unlinked complaints', all.dataIssues.unlinked.complaints.length)
console.log('unlinked lbc', all.dataIssues.unlinked.lbc.length)
console.log('unlinked dpwh', all.dataIssues.unlinked.dpwh.length)
console.log('duplicate case numbers', all.dataIssues.duplicateCaseNumbers.length)
console.log('duplicate iis', all.dataIssues.duplicateIis.length)
console.log('invalid dates', all.dataIssues.invalidDates.length)
console.log('unnumbered', all.dataIssues.unnumbered.length)
console.log('missing fields', all.dataIssues.missingFields.length)
const bad = all.cases.filter(c => /negros|siquijor/i.test(c.province+c.address+c.city+c.municipality))
console.log('negros/siquijor cases remaining:', bad.length)
const ambiguousTowns = ['SAN JOSE','VALENCIA','PAMPLONA','LA LIBERTAD','MARIA','SAN JUAN']
const amb = all.cases.filter(c => ambiguousTowns.some(t => (c.address+c.city+c.municipality).toUpperCase().includes(t)) && !/CEBU|BOHOL|NEGROS|SIQUIJOR/.test(c.province.toUpperCase()))
console.log('ambiguous town cases (no explicit province):', amb.length)