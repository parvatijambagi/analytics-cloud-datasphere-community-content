const fs = require('fs')
const path = require('path')
const src = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8')
const start = src.indexOf('  const parseMetadata')
const end = src.indexOf('  const setupMessage')
if (start < 0 || end < 0) {
  throw new Error('Could not locate layout helpers in main.js')
}
const api = new Function(src.slice(start, end) + '\nreturn { parseMetadata, pickColumnDimensions, pickRowDimensions, expandVersionLeafColumns, sortVersionMembers }\n')()

const metadata = {
  dimensions: {
    dimensions0: { id: 'ARE', description: 'ARE' },
    dimensions4: { id: 'CostCenter', description: 'Cost Center' },
    dimensions1: { id: '[t.MODEL].[parentId].&[Date]', description: 'Date' },
    dimensions2: { id: 'Version', description: 'Version' },
    dimensions3: { id: 'GL_ACCOUNT', description: 'GL-Accounts' }
  },
  mainStructureMembers: {
    measures0: { id: 'GC', label: 'Global Currency' },
    measures1: { id: 'LC', label: 'Local Currency' }
  },
  feeds: {
    dimensions: { values: ['dimensions0', 'dimensions4'] },
    dimensions2: { values: ['dimensions1', { id: 'Version' }, 'GL-Accounts'] },
    measures: { values: ['measures0', 'measures1'] }
  }
}

const { dimensions } = api.parseMetadata(metadata)
const cols = api.pickColumnDimensions(dimensions, metadata, 'Auto')
const rows = api.pickRowDimensions(dimensions, metadata, cols)
const colNames = cols.map(d => d.description).join(',')
const rowNames = rows.map(d => d.description).join(',')

if (rowNames !== 'ARE,Cost Center') {
  throw new Error('Rows should stay ARE and Cost Center, got ' + rowNames)
}
if (colNames !== 'Date,GL-Accounts,Version') {
  throw new Error('Columns should stack Date, GL-Accounts, Version, got ' + colNames)
}

const merged = {
  dimensions: metadata.dimensions,
  mainStructureMembers: metadata.mainStructureMembers,
  feeds: {
    dimensions: { values: ['dimensions0', 'dimensions4', 'dimensions1', 'dimensions2', 'dimensions3'] },
    measures: { values: ['measures0'] }
  }
}
const all = api.parseMetadata(merged).dimensions
const autoCols = api.pickColumnDimensions(all, merged, 'Auto')
const autoRows = api.pickRowDimensions(all, merged, autoCols)
if (autoRows.map(d => d.description).join(',') !== 'ARE,Cost Center') {
  throw new Error('Auto should still keep ARE and Cost Center on rows when Columns feed is empty, got ' + autoRows.map(d => d.description).join(','))
}
if (autoCols.map(d => d.description).join(',') !== 'Date,GL-Accounts,Version') {
  throw new Error('Auto should stack Date/GL/Version, got ' + autoCols.map(d => d.description).join(','))
}

const versions = api.sortVersionMembers([
  { id: 'BDG', label: 'BDG' },
  { id: 'FC', label: 'FC' },
  { id: 'Actual', label: 'Actual' }
])
if (versions.map(item => item.label).join(',') !== 'Actual,FC,BDG') {
  throw new Error('Versions should order Actual, FC, BDG, got ' + versions.map(item => item.label).join(','))
}
const leaves = api.expandVersionLeafColumns([{ key: 'LC', label: 'Local Currency' }], versions)
if (leaves.map(item => item.versionLabel).join(',') !== 'Actual,FC,BDG') {
  throw new Error('Each version should be its own column group, got ' + leaves.map(item => item.versionLabel).join(','))
}
if (leaves.some(item => !item.versionId)) {
  throw new Error('Version columns must not collapse to (all)')
}

console.log('column layout tests passed')
