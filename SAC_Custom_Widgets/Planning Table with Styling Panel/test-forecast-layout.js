const fs = require('fs')
const path = require('path')
const src = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8')
const start = src.indexOf('  const FISCAL_START_MONTH')
const end = src.indexOf('  const setupMessage')
if (start < 0 || end < 0) {
  throw new Error('Could not locate forecast helpers in main.js')
}
const api = new Function(src.slice(start, end) + '\nreturn { parseLooseDate, memberDate, lastBookedActualDate, resolveCutOver, pickForecastDateMembers, formatForecastDateLabel, isForecastLookBack, fiscalYearOf, fiscalPeriodOf, synthesizeForecastAxis, mergeForecastAxis, isForecastTableType, versionMatches, sameForecastDate }\n')()

const p01 = api.parseLooseDate('P01 (2026)')
if (!p01 || p01.getFullYear() !== 2025 || p01.getMonth() !== 9) {
  throw new Error('FY starts October: P01 (2026) must be Oct 2025, got ' + (p01 && p01.toISOString()))
}
const p11 = api.parseLooseDate('P11 (2026)')
if (!p11 || p11.getFullYear() !== 2026 || p11.getMonth() !== 7) {
  throw new Error('P11 (2026) must be Aug 2026, got ' + (p11 && p11.toISOString()))
}
const p12 = api.parseLooseDate('P12 (2026)')
if (!p12 || p12.getFullYear() !== 2026 || p12.getMonth() !== 8) {
  throw new Error('P12 (2026) must be Sep 2026, got ' + (p12 && p12.toISOString()))
}

const today = api.resolveCutOver('Today', { mode: 'Today' })
if (!(today instanceof Date) || Number.isNaN(today.getTime())) {
  throw new Error('Today should resolve to the current date')
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
  { date: { id: 'P01 (2026)', label: 'P01 (2026)' }, version: { id: 'Actual', label: 'Actual' } },
  { date: { id: 'P11 (2026)', label: 'P11 (2026)' }, version: { id: 'Actual', label: 'Actual' } },
  { date: { id: 'P12 (2026)', label: 'P12 (2026)' }, version: { id: 'FC', label: 'FC' } }
]
const last = api.lastBookedActualDate(data, dateDim, versionDim, 'Actual')
if (!last || last.getFullYear() !== 2026 || last.getMonth() !== 7) {
  throw new Error('Last booked actual should be P11 Aug 2026, got ' + (last && last.toISOString()))
}

const fyMembers = [
  { id: '2025', label: '2025' },
  { id: 'P01 (2026)', label: 'P01 (2026)' },
  { id: 'P11 (2026)', label: 'P11 (2026)' },
  { id: 'P12 (2026)', label: 'P12 (2026)' },
  { id: '2027', label: '2027' }
]
const axis = api.pickForecastDateMembers(fyMembers, last, {
  granularity: 'Month',
  range: 'Year',
  lookBackAdditional: 1,
  lookBackAdditionalUnit: 'Year',
  lookAheadAdditional: 1,
  lookAheadAdditionalUnit: 'Year'
})
const ids = axis.map(item => item.id)
if (!ids.includes('2025')) {
  throw new Error('Look back additional 1 year should include 2025 under Actual, got ' + ids.join(','))
}
if (!ids.includes('P01 (2026)') || !ids.includes('P11 (2026)') || !ids.includes('P12 (2026)')) {
  throw new Error('FY 2026 months P01-P12 should be in range, got ' + ids.join(','))
}
if (!ids.includes('2027')) {
  throw new Error('Look ahead additional 1 year should include 2027 under Forecast, got ' + ids.join(','))
}

if (!api.isForecastLookBack({ id: '2025', label: '2025' }, last)) {
  throw new Error('2025 extra year must be look-back Actual')
}
if (!api.isForecastLookBack({ id: 'P01 (2026)', label: 'P01 (2026)' }, last)) {
  throw new Error('P01 (2026) October must be look-back Actual')
}
if (!api.isForecastLookBack({ id: 'P11 (2026)', label: 'P11 (2026)' }, last)) {
  throw new Error('Last booked P11 August must stay on Actual')
}
if (api.isForecastLookBack({ id: 'P12 (2026)', label: 'P12 (2026)' }, last)) {
  throw new Error('P12 (2026) must be look-ahead Forecast')
}
if (api.isForecastLookBack({ id: '2027', label: '2027' }, last)) {
  throw new Error('2027 extra year must be look-ahead Forecast')
}

const kept = api.formatForecastDateLabel({ id: 'P01 (2026)', label: 'P01 (2026)' }, 'Month')
if (kept !== 'P01 (2026)') {
  throw new Error('Period labels should stay P01 (2026), got ' + kept)
}
const yearLabel = api.formatForecastDateLabel({ id: '2025', label: '2025' }, 'Year')
if (yearLabel !== '2025') {
  throw new Error('Extra look-back year should label 2025, got ' + yearLabel)
}

if (!api.isForecastTableType('Forecast') || !api.isForecastTableType('Forecast Layout')) {
  throw new Error('Forecast table type should be recognized')
}
if (api.isForecastTableType('Cross-Tab')) {
  throw new Error('Cross-Tab must not be treated as forecast')
}

const synth = api.synthesizeForecastAxis(new Date(2026, 7, 25), {
  granularity: 'Month',
  range: 'Year',
  lookBackAdditional: 1,
  lookBackAdditionalUnit: 'Year',
  lookAheadAdditional: 1,
  lookAheadAdditionalUnit: 'Year'
})
const synthIds = synth.map(item => item.id)
if (synthIds.join(',') !== '2025,P01 (2026),P02 (2026),P03 (2026),P04 (2026),P05 (2026),P06 (2026),P07 (2026),P08 (2026),P09 (2026),P10 (2026),P11 (2026),P12 (2026),2027') {
  throw new Error('Synthetic axis should be 2025, P01-P12 (2026), 2027, got ' + synthIds.join(','))
}
const mergedEmpty = api.mergeForecastAxis([], synth)
if (mergedEmpty.map(item => item.id).join(',') !== synthIds.join(',')) {
  throw new Error('Empty result set must still use the synthetic forecast axis')
}

const sacDate = api.parseLooseDate('[Date].[YQM].&[202510]')
if (!sacDate || sacDate.getFullYear() !== 2025 || sacDate.getMonth() !== 9) {
  throw new Error('SAC calendar member 202510 should be Oct 2025, got ' + (sacDate && sacDate.toISOString()))
}
const fiscalMember = api.parseLooseDate('[Date].[FISCALYEAR].[2026].[FISCALPERIOD].[001]')
if (!fiscalMember || api.fiscalYearOf(fiscalMember) !== 2026 || api.fiscalPeriodOf(fiscalMember) !== 1) {
  throw new Error('SAC fiscal P01 2026 should parse as Oct-start P01')
}
if (!api.versionMatches({ id: '[Version].[public.Actual]', label: 'Actual' }, 'Actual')) {
  throw new Error('Version Actual should match public.Actual member ids')
}
if (!api.sameForecastDate({ id: '[Date].&[202510]', label: 'Oct 2025' }, { id: 'P01 (2026)', label: 'P01 (2026)' })) {
  throw new Error('Oct 2025 actuals should land in P01 (2026)')
}

console.log('forecast layout tests passed')
