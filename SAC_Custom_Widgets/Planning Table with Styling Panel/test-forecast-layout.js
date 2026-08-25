const fs = require('fs')
const path = require('path')
const src = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8')
const start = src.indexOf('  const parseLooseDate')
const end = src.indexOf('  const setupMessage')
if (start < 0 || end < 0) {
  throw new Error('Could not locate forecast helpers in main.js')
}
const api = new Function(src.slice(start, end) + '\nreturn { parseLooseDate, memberDate, lastBookedActualDate, resolveCutOver, pickForecastDateMembers, formatForecastDateLabel }\n')()

const today = api.resolveCutOver('Today', { mode: 'Today' })
if (!(today instanceof Date) || Number.isNaN(today.getTime())) {
  throw new Error('Today should resolve to the current date')
}
const delta = Math.abs(today.getTime() - Date.now())
if (delta > 5000) {
  throw new Error('Today should be approximately now, delta=' + delta)
}

const dateMembers = [
  { id: '2025-03-01', label: 'Mar 2025' },
  { id: '2026-08-01', label: 'Aug 2026' }
]
const specific = api.resolveCutOver('2025-03-01', { mode: 'SpecificDate', specificDate: '2025-03-01', dateMembers })
if (specific.getFullYear() !== 2025 || specific.getMonth() !== 2) {
  throw new Error('Specific Date should use the Date dimension member, got ' + specific.toISOString())
}

const dateDim = { key: 'date' }
const versionDim = { key: 'version' }
const data = [
  { date: { id: '2026-01-01', label: '2026-01-01' }, version: { id: 'Actual', label: 'Actual' } },
  { date: { id: '2026-06-01', label: '2026-06-01' }, version: { id: 'Actual', label: 'Actual' } },
  { date: { id: '2026-12-01', label: '2026-12-01' }, version: { id: 'EPMplusA', label: 'EPMplusA' } }
]
const last = api.lastBookedActualDate(data, dateDim, versionDim, 'Actual')
if (!last || last.getFullYear() !== 2026 || last.getMonth() !== 5) {
  throw new Error('Last booked actual should be Jun 2026, got ' + (last && last.toISOString()))
}
const viaMode = api.resolveCutOver('LastBooked', {
  mode: 'LastBooked',
  data,
  dateDim,
  versionDim,
  actualToken: 'Actual'
})
if (viaMode.getTime() !== last.getTime()) {
  throw new Error('LastBooked mode should match last booked actual date')
}

const axis = api.pickForecastDateMembers([
  { id: '2025', label: '2025' },
  { id: '2026-01', label: 'Jan 2026' },
  { id: '2026-07', label: 'Jul 2026' },
  { id: '2026-12', label: 'Dec 2026' },
  { id: '2027-01', label: 'Jan 2027' }
], new Date(2026, 6, 31), {
  granularity: 'Month',
  range: 'Year',
  lookBackAdditional: 1,
  lookBackAdditionalUnit: 'Year',
  lookAheadAdditional: 1,
  lookAheadAdditionalUnit: 'Year'
})
if (!axis.some(item => item.id === '2025')) {
  throw new Error('Look back additional 1 year should include 2025, got ' + axis.map(item => item.id).join(','))
}
if (!axis.some(item => item.id === '2026-01') || !axis.some(item => item.id === '2026-12')) {
  throw new Error('Range year at month grain should include 2026 months')
}
const period = api.formatForecastDateLabel({ id: '2026-01', label: 'Jan 2026' }, 'Month')
if (period !== 'P01 (2026)') {
  throw new Error('Month grain should format as P01 (2026), got ' + period)
}

console.log('forecast layout tests passed')
