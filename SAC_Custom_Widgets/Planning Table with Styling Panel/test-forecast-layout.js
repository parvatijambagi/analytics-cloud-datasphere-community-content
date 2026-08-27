const fs = require('fs')
const path = require('path')
const src = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8')
const start = src.indexOf('  const identList = dimension => {')
const end = src.indexOf('  const setupMessage')
if (start < 0 || end < 0) {
  throw new Error('Could not locate forecast helpers in main.js')
}
const api = new Function(src.slice(start, end) + '\nreturn { parseLooseDate, memberDate, lastBookedActualDate, resolveCutOver, pickForecastDateMembers, formatForecastDateLabel, isForecastLookBack, fiscalYearOf, fiscalPeriodOf, synthesizeForecastAxis, mergeForecastAxis, isForecastTableType, isTableTypeEcho, versionMatches, sameForecastDate, isAggregateDateMember, forecastDateCandidates, forecastPeriodKey, dateAncestorKey, filterDateMembersForDisplay, memberHierarchyDepth }\n')()

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
if (api.sameForecastDate({ id: '2026', label: '2026' }, { id: 'P01 (2026)', label: 'P01 (2026)' })) {
  throw new Error('Year aggregate 2026 must not fill P01')
}
if (api.sameForecastDate({ id: '(all)', label: '(all)' }, { id: 'P01 (2026)', label: 'P01 (2026)' })) {
  throw new Error('(all) must not fill a month column')
}

const yearOnlyRows = [
  { date: { id: '2026', label: '2026' }, version: { id: 'Actual', label: 'Actual' }, LC: { raw: -18827401.19 } }
]
if (api.lastBookedActualDate(yearOnlyRows, dateDim, versionDim, 'Actual')) {
  throw new Error('Year-level Actual must not be treated as a booked month')
}
const todayFallback = api.resolveCutOver('LastBooked', {
  mode: 'LastBooked',
  data: yearOnlyRows,
  dateDim,
  versionDim,
  actualToken: 'Actual'
})
const now = new Date()
if (todayFallback.getFullYear() !== now.getFullYear() || todayFallback.getMonth() !== now.getMonth()) {
  throw new Error('Last booked with only year data should fall back to today')
}
const todayCut = new Date(2026, 7, 26)
if (!api.isForecastLookBack({ id: 'P11 (2026)', label: 'P11 (2026)' }, todayCut)) {
  throw new Error('With current period Aug 2026, P11 must stay Actual')
}
if (api.isForecastLookBack({ id: 'P12 (2026)', label: 'P12 (2026)' }, todayCut)) {
  throw new Error('With current period Aug 2026, P12 must be FC')
}
if (!api.isAggregateDateMember({ id: '2026', label: '2026' }) || api.isAggregateDateMember({ id: 'P11 (2026)', label: 'P11 (2026)' })) {
  throw new Error('Year 2026 is aggregate; P11 is a booked period')
}
const p01Ids = api.forecastDateCandidates(2026, 1)
if (p01Ids.indexOf('202510') === -1) {
  throw new Error('P01 FY2026 candidates must include calendar 202510, got ' + p01Ids.join(','))
}
if (api.forecastPeriodKey({ id: 'P11 (2026)', label: 'P11 (2026)' }) !== 'P2026-11') {
  throw new Error('P11 period key should be P2026-11')
}

const altDateDim = { key: 'dimensions1', id: 'Date' }
const altRows = [
  { Date: { id: 'P11 (2026)', label: 'P11 (2026)' }, version: { id: 'Actual', label: 'Actual' } }
]
const lastFromId = api.lastBookedActualDate(altRows, altDateDim, versionDim, 'Actual')
if (!lastFromId || lastFromId.getFullYear() !== 2026 || lastFromId.getMonth() !== 7) {
  throw new Error('Last booked should read Date by id as well as key')
}

if (!api.isTableTypeEcho({ tableType: 'Cross-Tab', dataBinding: {} }, 'Forecast')) {
  throw new Error('Default Cross-Tab echoed with dataBinding after Forecast Apply must be ignored')
}
if (api.isTableTypeEcho({ tableType: 'Cross-Tab', lookBackOn: 'Actual' }, 'Forecast')) {
  throw new Error('Selecting Cross-Tab sends lookBackOn and must switch the table back')
}
if (api.isTableTypeEcho({ tableType: 'Cross-Tab' }, 'Forecast')) {
  throw new Error('A Cross-Tab-only update must switch the table back')
}
if (api.isTableTypeEcho({ tableType: 'Forecast', dataBinding: {} }, 'Cross-Tab')) {
  throw new Error('Applying Forecast must not be treated as an echo')
}

const hierMembers = [
  { id: '(all)', label: '(all)' },
  { id: '2025', label: '2025' },
  { id: '2026', label: '2026' },
  { id: 'Q1 (2026)', label: 'Q1 (2026)' },
  { id: 'Q2 (2026)', label: 'Q2 (2026)' },
  { id: 'P01 (2026)', label: 'P01 (2026)' },
  { id: 'P02 (2026)', label: 'P02 (2026)' },
  { id: 'P04 (2026)', label: 'P04 (2026)' }
]
if (api.memberHierarchyDepth({ id: 'Q1 (2026)', label: 'Q1 (2026)' }) !== 2) {
  throw new Error('Q1 (2026) should be a quarter-depth member')
}
if (api.dateAncestorKey({ id: 'P01 (2026)', label: 'P01 (2026)' }, hierMembers) !== 'Q1 (2026)') {
  throw new Error('P01 (2026) should resolve its parent to the real Q1 (2026) member')
}
if (api.dateAncestorKey({ id: 'Q1 (2026)', label: 'Q1 (2026)' }, hierMembers) !== '2026') {
  throw new Error('Q1 (2026) should resolve its parent to the real 2026 member')
}
if (api.dateAncestorKey({ id: '2026', label: '2026' }, hierMembers) !== '(all)') {
  throw new Error('A year member should resolve its parent to (all)')
}

const sameIds = (list, expected) => {
  const a = list.map(m => m.id).slice().sort()
  const b = expected.slice().sort()
  return a.length === b.length && a.every((v, i) => v === b[i])
}

const nothingExpanded = api.filterDateMembersForDisplay(hierMembers, new Set())
if (!sameIds(nothingExpanded, ['(all)'])) {
  throw new Error('With nothing expanded, only (all) should show by default, got ' + nothingExpanded.map(m => m.id).join(','))
}
const rootExpanded = api.filterDateMembersForDisplay(hierMembers, new Set(['(all)']))
if (!sameIds(rootExpanded, ['(all)', '2025', '2026'])) {
  throw new Error('Expanding (all) should reveal the years alongside (all) itself, got ' + rootExpanded.map(m => m.id).join(','))
}
const yearExpanded = api.filterDateMembersForDisplay(hierMembers, new Set(['(all)', '2026']))
if (!sameIds(yearExpanded, ['(all)', '2025', '2026', 'Q1 (2026)', 'Q2 (2026)'])) {
  throw new Error('Expanding 2026 should reveal its quarters while 2026 and 2025 stay visible, got ' + yearExpanded.map(m => m.id).join(','))
}
const quarterExpanded = api.filterDateMembersForDisplay(hierMembers, new Set(['(all)', '2026', 'Q1 (2026)']))
if (!sameIds(quarterExpanded, ['(all)', '2025', '2026', 'Q1 (2026)', 'Q2 (2026)', 'P01 (2026)', 'P02 (2026)'])) {
  throw new Error('Expanding Q1 (2026) should reveal its periods while everything else stays visible, got ' + quarterExpanded.map(m => m.id).join(','))
}
const collapsedBackDown = api.filterDateMembersForDisplay(hierMembers, new Set(['(all)']))
if (!sameIds(collapsedBackDown, ['(all)', '2025', '2026'])) {
  throw new Error('Collapsing 2026 again should hide only its quarters, not (all) or 2025, got ' + collapsedBackDown.map(m => m.id).join(','))
}

const twoLevelMembers = [
  { id: '(all)', label: '(all)' },
  { id: '2026', label: '2026' },
  { id: 'P01 (2026)', label: 'P01 (2026)' },
  { id: 'P02 (2026)', label: 'P02 (2026)' }
]
if (api.dateAncestorKey({ id: 'P01 (2026)', label: 'P01 (2026)' }, twoLevelMembers) !== '2026') {
  throw new Error('With no Quarter level in the data, a Period should attach directly to its Year')
}
const twoLevelExpanded = api.filterDateMembersForDisplay(twoLevelMembers, new Set(['(all)', '2026']))
if (!sameIds(twoLevelExpanded, ['(all)', '2026', 'P01 (2026)', 'P02 (2026)'])) {
  throw new Error('Fiscal Year, Period (no Quarter) should reveal periods directly when the year is expanded, got ' + twoLevelExpanded.map(m => m.id).join(','))
}

// Real member labels sometimes carry no year at all ("Q1", not "Q1 (2025)"),
// so memberDate() cannot resolve a fiscal year/quarter for them. The parent
// must then be inferred from list order: SAC returns parent immediately
// followed by its own children.
const bareLabelMembers = [
  { id: '(all)', label: '(all)' },
  { id: '2025', label: '2025' },
  { id: 'Q1', label: 'Q1' },
  { id: 'Q2', label: 'Q2' },
  { id: 'Q3', label: 'Q3' },
  { id: 'Q4', label: 'Q4' },
  { id: '2026', label: '2026' },
  { id: 'Q1', label: 'Q1' },
  { id: 'Q2', label: 'Q2' },
  { id: 'Q3', label: 'Q3' },
  { id: 'Q4', label: 'Q4' }
]
if (api.dateAncestorKey(bareLabelMembers[2], bareLabelMembers) !== '2025') {
  throw new Error('The first bare "Q1" should attach to the preceding 2025, not (all)')
}
if (api.dateAncestorKey(bareLabelMembers[7], bareLabelMembers) !== '2026') {
  throw new Error('The second bare "Q1" (after 2026) should attach to 2026, not 2025 or (all)')
}
const rootOnlyBareLabels = api.filterDateMembersForDisplay(bareLabelMembers, new Set())
if (!sameIds(rootOnlyBareLabels, ['(all)'])) {
  throw new Error('Bare-label quarters must not leak into view before (all) is expanded, got ' + rootOnlyBareLabels.map(m => m.id).join(','))
}
const rootExpandedBareLabels = api.filterDateMembersForDisplay(bareLabelMembers, new Set(['(all)']))
if (!sameIds(rootExpandedBareLabels, ['(all)', '2025', '2026'])) {
  throw new Error('Expanding (all) must reveal only the years, not every bare-label quarter at once, got ' + rootExpandedBareLabels.map(m => m.id).join(','))
}
const year2025ExpandedBareLabels = api.filterDateMembersForDisplay(bareLabelMembers, new Set(['(all)', '2025']))
if (year2025ExpandedBareLabels.length !== 7) {
  throw new Error('Expanding 2025 should reveal exactly its own 4 quarters (plus (all)/2025/2026), got ' + year2025ExpandedBareLabels.map(m => m.id).join(','))
}
if (year2025ExpandedBareLabels.indexOf(bareLabelMembers[2]) === -1 || year2025ExpandedBareLabels.indexOf(bareLabelMembers[7]) !== -1) {
  throw new Error("Expanding 2025 must reveal its own Q1 instance, not 2026's Q1 instance")
}

console.log('forecast layout tests passed')
