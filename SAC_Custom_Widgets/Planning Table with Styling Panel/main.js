(function () {
  const parseMetadata = metadata => {
    const dimensionsMap = (metadata && metadata.dimensions) || {}
    const measuresMap = (metadata && (metadata.mainStructureMembers || metadata.measures || metadata.accounts)) || {}
    const dimensions = []
    for (const key in dimensionsMap) {
      dimensions.push({ key, ...dimensionsMap[key] })
    }
    const measures = []
    for (const key in measuresMap) {
      measures.push({ key, ...measuresMap[key] })
    }
    const feeds = (metadata && metadata.feeds) || {}
    const rowFeedKeys = (feeds.dimensions && feeds.dimensions.values) || (feeds.rows && feeds.rows.values) || []
    const colFeedKeys = (feeds.columns && feeds.columns.values) || []
    return { dimensions, measures, rowFeedKeys, colFeedKeys }
  }

  const setupMessage = extra => {
    return `
      <div class="placeholder">
        <strong>Connect data in the Builder panel</strong>
        <ol>
          <li>Use an <em>Optimized Story</em> (not Classic).</li>
          <li>Select this widget, open <em>Builder</em> (not Styling).</li>
          <li>Choose a model.</li>
          <li>Add row dimensions to <em>Rows</em> only if you need them. Nothing is kept by default.</li>
          <li>Add column dimensions under <em>Columns</em> (they appear above Measures). Use × to remove.</li>
          <li>Add measures with <em>+ Add Measure</em>. Remove Local/Global Currency with × if you do not need them.</li>
          <li>Use the funnel on a dimension or the <em>Filters</em> section to filter members.</li>
          <li>For a planning model, set a <em>Version</em> filter if Version is not on an axis.</li>
        </ol>
        ${extra ? `<p>${extra}</p>` : ''}
      </div>
    `
  }

  const rowKey = (row, dimensions) => {
    return dimensions.map(dimension => {
      const cell = row[dimension.key]
      return cell && cell.id ? cell.id : ''
    }).join('|')
  }

  const changeKey = (row, dimensions, measureKey) => {
    return rowKey(row, dimensions) + '||' + measureKey
  }

  const formatNumber = (value, options, boundFormatted) => {
    if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) {
      return ''
    }
    const opts = options || {}
    if ((opts.decimalPlaces === 'Default' || opts.decimalPlaces === '' || opts.decimalPlaces === undefined) &&
        opts.scale === 'Default' && boundFormatted) {
      return boundFormatted
    }
    let numeric = Number(value)
    const scale = opts.scale
    if (scale === 'Thousand') numeric = numeric / 1000
    if (scale === 'Million') numeric = numeric / 1000000
    if (scale === 'Billion') numeric = numeric / 1000000000
    if (scale === 'Percent') numeric = numeric * 100
    const digits = (opts.decimalPlaces === 'Default' || opts.decimalPlaces === '' || opts.decimalPlaces === undefined)
      ? 2
      : Number(opts.decimalPlaces)
    const safeDigits = Number.isFinite(digits) ? Math.max(0, Math.min(9, digits)) : 2
    let text = Math.abs(numeric).toLocaleString(undefined, {
      minimumFractionDigits: safeDigits,
      maximumFractionDigits: safeDigits
    })
    if (scale === 'Thousand' && opts.scaleFormat !== 'Default') text += 'k'
    if (scale === 'Million' && opts.scaleFormat !== 'Default') text += 'M'
    if (scale === 'Billion' && opts.scaleFormat !== 'Default') text += 'Bn'
    if (scale === 'Percent') text += '%'
    const negative = numeric < 0
    if (opts.showSignAs === 'Parentheses' && negative) {
      return '(' + text + ')'
    }
    if (opts.showSignAs === 'PlusMinus') {
      return (negative ? '-' : '+') + text
    }
    return (negative ? '-' : '') + text
  }

  const DEFAULT_RULES = [
    { name: 'Editable IHBs', target: 'editable', background: '', color: '' },
    { name: 'Read-only Accounts IHB', target: 'readonly-account', background: '', color: '' },
    { name: 'Read-only IHB', target: 'readonly', background: '', color: '' },
    { name: 'ReadOnlyInternalAccounts', target: 'readonly-account', background: '', color: '' },
    { name: 'Editable', target: 'editable', background: '', color: '' },
    { name: 'Read-only', target: 'readonly', background: '', color: '' }
  ]

  const parseRules = json => {
    try {
      const parsed = JSON.parse(json || '[]')
      if (Array.isArray(parsed) && parsed.length) {
        return parsed
      }
    } catch (ignore) {}
    return DEFAULT_RULES.map(rule => Object.assign({}, rule))
  }

  const ruleHasStyle = rule => !!(rule && (rule.background || rule.color))

  const firstMatchingRule = (rules, kind) => {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]
      if (!ruleHasStyle(rule)) {
        continue
      }
      const target = rule.target || 'all'
      if (target === 'all' || target === kind) {
        return rule
      }
      if (kind === 'readonly-account' && target === 'readonly') {
        return rule
      }
      if (kind === 'dimension' && (target === 'readonly' || target === 'readonly-account')) {
        return rule
      }
    }
    return null
  }

  const ruleStyle = (rule, extra) => {
    const parts = []
    if (rule && rule.background) {
      parts.push('background:' + rule.background)
    }
    if (rule && rule.color) {
      parts.push('color:' + rule.color)
    }
    if (extra) {
      parts.push(extra)
    }
    return parts.join(';')
  }

  const dimName = (dimension, layout) => {
    const option = dimOption(layout, dimension)
    if (option && option.rename) {
      return option.rename
    }
    return (dimension && (dimension.description || dimension.label || dimension.id || dimension.key)) || ''
  }

  const dimOption = (layout, dimension) => {
    const options = (layout && layout.dimOptions) || {}
    const keys = [dimension && dimension.id, dimension && dimension.key, dimension && dimension.description, dimension && dimension.label]
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] && options[keys[i]]) {
        return options[keys[i]]
      }
    }
    const names = Object.keys(options)
    for (let i = 0; i < names.length; i++) {
      const option = options[names[i]]
      if (option && dimension && String(names[i]).toLowerCase() === String(dimension.description || dimension.label || '').toLowerCase()) {
        return option
      }
    }
    return null
  }

  const cellId = (row, dimension) => {
    const cell = row[dimension.key]
    return (cell && (cell.id || cell.key || cell.label)) || ''
  }

  const cellLabel = (row, dimension, layout) => {
    const cell = row[dimension.key] || {}
    const id = String(cell.id || cell.key || '')
    const label = String(cell.label || cell.description || cell.text || '')
    const option = dimOption(layout, dimension)
    const display = (option && option.display) || 'Description'
    if (display === 'ID') {
      return id || label
    }
    if (display === 'ID and Description') {
      if (id && label && id !== label) {
        return id + ' (' + label + ')'
      }
      if (id && !label) {
        return id
      }
      if (label && !id) {
        return label
      }
      return label || id
    }
    return label || id
  }

  const filterMembersOf = entry => {
    if (!entry) {
      return []
    }
    if (Array.isArray(entry)) {
      return entry.map(item => typeof item === 'string' ? { id: item, name: item } : { id: item.id || item.key, name: item.name || item.id || item.key })
    }
    if (Array.isArray(entry.members)) {
      return entry.members.map(item => typeof item === 'string' ? { id: item, name: item } : { id: item.id || item.key, name: item.name || item.id || item.key })
    }
    return []
  }

  const matchesName = (dimension, requested) => {
    const name = dimName(dimension).toLowerCase()
    const req = requested.toLowerCase()
    return name === req || (dimension.id || '').toLowerCase() === req || dimension.key.toLowerCase() === req || name.indexOf(req) !== -1
  }

  const isVersionDim = dimension => /version/.test(dimName(dimension).toLowerCase())
  const isDateDim = dimension => /date|time|month|period|year|calmonth|fiscal/.test(dimName(dimension).toLowerCase())

  const parseLayout = json => {
    try {
      const parsed = JSON.parse(json || '{}')
      if (parsed && typeof parsed === 'object') {
        return {
          active: !!parsed.active,
          rows: Array.isArray(parsed.rows) ? parsed.rows : [],
          columns: Array.isArray(parsed.columns) ? parsed.columns : [],
          measures: Array.isArray(parsed.measures) ? parsed.measures : [],
          filters: parsed.filters && typeof parsed.filters === 'object' && !Array.isArray(parsed.filters) ? parsed.filters : {},
          dimOptions: parsed.dimOptions && typeof parsed.dimOptions === 'object' ? parsed.dimOptions : {}
        }
      }
    } catch (ignore) {}
    return { active: false, rows: [], columns: [], measures: [], filters: {}, dimOptions: {} }
  }

  const matchLayoutItem = (item, candidate) => {
    const ids = [item && item.id, item && item.key, item && item.name].filter(Boolean).map(v => String(v).toLowerCase())
    const other = [candidate && candidate.id, candidate && candidate.key, candidate && candidate.label, candidate && candidate.description, candidate && candidate.name].filter(Boolean).map(v => String(v).toLowerCase())
    return ids.some(id => other.indexOf(id) !== -1)
  }

  const orderByLayout = (items, layoutItems) => {
    if (!layoutItems || !layoutItems.length) {
      return []
    }
    return layoutItems.map(entry => items.find(item => matchLayoutItem(entry, item))).filter(Boolean)
  }

  const pickColumnDimensions = (dimensions, metadata, tableType, columnDimension, layout) => {
    if (!dimensions || !dimensions.length) {
      return []
    }
    if (layout && layout.active) {
      return orderByLayout(dimensions, layout.columns)
    }
    const feeds = (metadata && metadata.feeds) || {}
    const colFeedKeys = (feeds.columns && feeds.columns.values) || []
    if (colFeedKeys.length) {
      return colFeedKeys.map(key => dimensions.find(dimension => dimension.key === key)).filter(Boolean)
    }
    const requested = (columnDimension || 'Auto').trim()
    if (requested && requested !== 'Auto') {
      return requested.split(',').map(part => part.trim()).filter(Boolean).map(part => {
        return dimensions.find(dimension => matchesName(dimension, part))
      }).filter(Boolean)
    }
    if (tableType === 'Forecast Layout') {
      const dates = dimensions.filter(isDateDim)
      return dates.length ? dates : []
    }
    return []
  }

  const pickRowDimensions = (dimensions, colDims, layout) => {
    if (layout && layout.active) {
      return orderByLayout(dimensions, layout.rows)
    }
    const colDimKeys = new Set(colDims.map(dimension => dimension.key))
    return dimensions.filter(dimension => !colDimKeys.has(dimension.key))
  }

  const pickMeasures = (measures, layout) => {
    if (layout && layout.active) {
      return orderByLayout(measures, layout.measures)
    }
    return measures
  }

  const memberLevel = cell => {
    if (!cell) {
      return 1
    }
    if (cell.level !== undefined && cell.level !== null && cell.level !== '') {
      const numeric = Number(cell.level)
      if (Number.isFinite(numeric)) {
        return numeric
      }
    }
    if (cell.hierarchyLevel !== undefined && cell.hierarchyLevel !== null && cell.hierarchyLevel !== '') {
      const numeric = Number(cell.hierarchyLevel)
      if (Number.isFinite(numeric)) {
        return numeric
      }
    }
    const id = String(cell.id || '')
    if (id.indexOf('/') !== -1) {
      return Math.max(1, id.split('/').filter(Boolean).length)
    }
    let depth = 1
    let parent = cell.parentId
    const seen = new Set()
    while (parent && !seen.has(parent)) {
      seen.add(parent)
      depth += 1
      parent = null
    }
    return depth
  }

  const applyHierarchyLevels = (data, dimensions, layout) => {
    if (!layout || !layout.dimOptions) {
      return data
    }
    return data.filter(row => {
      return dimensions.every(dimension => {
        const option = dimOption(layout, dimension)
        if (!option || option.hierarchyLevel === '' || option.hierarchyLevel == null) {
          return true
        }
        const max = Number(option.hierarchyLevel)
        if (!Number.isFinite(max) || max <= 0) {
          return true
        }
        return memberLevel(row[dimension.key]) <= max
      })
    })
  }

  const applyLayoutFilters = (data, dimensions, layout) => {
    if (!layout || !layout.active || !layout.filters) {
      return data
    }
    const entries = Object.keys(layout.filters).map(dimId => {
      const members = filterMembersOf(layout.filters[dimId])
      const kind = (layout.filters[dimId] && layout.filters[dimId].kind) || (String(dimId).toLowerCase() === 'measures' ? 'measures' : 'dimension')
      return { dimId, kind, allowed: members.map(item => String(item.id)) }
    }).filter(entry => entry.kind !== 'measures' && entry.allowed.length)
    if (!entries.length) {
      return data
    }
    return data.filter(row => {
      return entries.every(entry => {
        const dimension = dimensions.find(item => matchLayoutItem({ id: entry.dimId }, item))
        if (!dimension) {
          return true
        }
        const id = cellId(row, dimension)
        return entry.allowed.indexOf(String(id)) !== -1
      })
    })
  }

  const columnTuples = (data, colDims, layout) => {
    if (!colDims.length) {
      return [{ key: '', cells: [] }]
    }
    const seen = new Set()
    const list = []
    data.forEach(row => {
      const key = colDims.map(dimension => cellId(row, dimension)).join('|')
      if (!seen.has(key)) {
        seen.add(key)
        list.push({
          key,
          cells: colDims.map(dimension => ({ id: cellId(row, dimension), label: cellLabel(row, dimension, layout) }))
        })
      }
    })
    return list
  }

  const headerGroups = (tuples, dimIndex) => {
    const groups = []
    tuples.forEach(tuple => {
      const prefix = tuple.cells.slice(0, dimIndex + 1).map(cell => cell.id).join('|')
      const last = groups[groups.length - 1]
      if (last && last.prefix === prefix) {
        last.span += 1
      } else {
        groups.push({ prefix, span: 1, label: (tuple.cells[dimIndex] && tuple.cells[dimIndex].label) || '' })
      }
    })
    return groups
  }

  const parseInputNumber = value => {
    if (value === null || value === undefined) {
      return null
    }
    const normalized = String(value).replace(/,/g, '').trim()
    if (!normalized) {
      return null
    }
    const parsed = Number(normalized)
    return Number.isNaN(parsed) ? null : parsed
  }

  const buildSelection = (row, dimensions, measure) => {
    const selection = {}
    dimensions.forEach(dimension => {
      const cell = row[dimension.key]
      if (cell && cell.id && dimension.id) {
        selection[dimension.id] = cell.id
      }
    })
    if (measure && measure.id) {
      selection[measure.id] = measure.id
    }
    return selection
  }

  const toPlanningChange = (row, dimensions, measure, oldValue, newValue) => {
    const selection = buildSelection(row, dimensions, measure)
    const dimensionMemberIds = dimensions.map(dimension => {
      const cell = row[dimension.key]
      return (dimension.id || dimension.key) + '=' + ((cell && cell.id) || '')
    }).join(';')
    const dimensionLabels = dimensions.map(dimension => {
      const cell = row[dimension.key]
      return (dimension.description || dimension.id || dimension.key) + '=' + ((cell && cell.label) || '')
    }).join(';')
    return {
      measureId: measure.id || measure.key,
      measureDescription: measure.label || measure.description || measure.id || measure.key,
      oldValue: oldValue === null || oldValue === undefined ? '' : String(oldValue),
      newValue: newValue === null || newValue === undefined ? '' : String(newValue),
      selectionJson: JSON.stringify(selection),
      dimensionMemberIds,
      dimensionLabels
    }
  }

  const template = document.createElement('template')
  template.innerHTML = `
    <style>
      :host {
        display: block;
        width: 100%;
        height: 100%;
        font-family: "72", "72full", Arial, Helvetica, sans-serif;
        color: #1d2d3e;
      }
      #root {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        background: #fff;
        border: 1px solid #d9d9d9;
      }
      .toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-bottom: 1px solid #e5e5e5;
        background: #f5f6f7;
        flex: 0 0 auto;
      }
      .toolbar .status {
        margin-left: auto;
        font-size: 12px;
        color: #556b82;
      }
      button {
        font: inherit;
        font-size: 12px;
        padding: 4px 10px;
        border: 1px solid #0854a0;
        background: #0854a0;
        color: #fff;
        border-radius: 4px;
        cursor: pointer;
      }
      button.secondary {
        background: #fff;
        color: #0854a0;
      }
      button:disabled {
        opacity: 0.45;
        cursor: default;
      }
      .table-wrap {
        overflow: auto;
        flex: 1 1 auto;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        min-width: 100%;
      }
      th, td {
        border: 1px solid #d9d9d9;
        padding: 6px 8px;
        white-space: nowrap;
        text-align: left;
        vertical-align: middle;
      }
      th {
        position: sticky;
        top: 0;
        z-index: 1;
        font-weight: 600;
      }
      td.measure, th.measure {
        text-align: right;
      }
      td.dim.child {
        padding-left: 22px;
      }
      .widget-title {
        font-size: 13px;
        font-weight: 600;
        padding: 8px 10px 0;
      }
      .widget-title .unit {
        font-weight: 400;
        color: #556b82;
        margin-left: 8px;
      }
      tfoot td {
        font-weight: 600;
        background: #f5f6f7;
      }
      input.cell-input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid transparent;
        background: transparent;
        text-align: right;
        font: inherit;
        color: inherit;
        padding: 2px 0;
      }
      input.cell-input:focus {
        outline: 2px solid #0854a0;
        background: #fff;
      }
      .changed input.cell-input {
        font-weight: 600;
      }
      td.null-cell {
        background-image: linear-gradient(to top right, transparent calc(50% - 1px), #c6c6c6 50%, transparent calc(50% + 1px));
      }
      .expand {
        display: inline-block;
        width: 14px;
        cursor: pointer;
        color: #0854a0;
        font-weight: 700;
      }
      th.group {
        text-align: center;
      }
      .placeholder, .error {
        padding: 16px;
        color: #556b82;
        font-size: 13px;
        line-height: 1.45;
      }
      .placeholder ol {
        margin: 8px 0 0 18px;
        padding: 0;
      }
      .placeholder p {
        margin: 12px 0 0;
      }
      .error {
        color: #aa0808;
      }
    </style>
    <div id="root">
      <div id="title" class="widget-title"></div>
      <div id="toolbar" class="toolbar"></div>
      <div id="table-wrap" class="table-wrap"></div>
    </div>
  `

  class PlanningTable extends HTMLElement {
    constructor () {
      super()
      this._shadowRoot = this.attachShadow({ mode: 'open' })
      this._shadowRoot.appendChild(template.content.cloneNode(true))
      this._root = this._shadowRoot.getElementById('root')
      this._toolbar = this._shadowRoot.getElementById('toolbar')
      this._title = this._shadowRoot.getElementById('title')
      this._tableWrap = this._shadowRoot.getElementById('table-wrap')
      this._pending = new Map()
      this._lastChange = {
        measureId: '',
        measureDescription: '',
        oldValue: '',
        newValue: '',
        selectionJson: '{}',
        dimensionMemberIds: '',
        dimensionLabels: ''
      }
      this._editing = false
      this._props = {}
      this._collapsed = new Set()
      this._comments = new Map()
      this._cellIndex = new Map()
      this._layout = { active: false, rows: [], columns: [], measures: [], filters: {}, dimOptions: {} }
    }

    onCustomWidgetResize () {
      // Layout is CSS flex; no extra work required.
    }

    onCustomWidgetAfterUpdate (changedProps) {
      Object.assign(this._props, changedProps || {})
      if (changedProps && changedProps.dataBinding) {
        this._bindingFromUpdate = changedProps.dataBinding
      }
      if (changedProps && changedProps.builderLayoutJson) {
        this._layout = parseLayout(changedProps.builderLayoutJson)
      }
      if (changedProps && changedProps.builderCommand) {
        try {
          const cmd = JSON.parse(changedProps.builderCommand)
          if (cmd && cmd.layout && !(changedProps.builderLayoutJson)) {
            this._layout = parseLayout(JSON.stringify(cmd.layout))
          }
        } catch (ignore) {}
        this._runBuilderCommand(changedProps.builderCommand)
      }
      this._publishCatalog()
      const pause = this.dataRefresh === 'Always Pause'
      const onlyBinding = changedProps && Object.keys(changedProps).every(key => key === 'dataBinding')
      if (pause && onlyBinding) {
        return
      }
      if (!this._editing) {
        this.render()
      }
    }

    getLastChange () {
      return this._lastChange
    }

    getPendingChanges () {
      return JSON.stringify(Array.from(this._pending.values()).map(entry => entry.change))
    }

    getPendingChangeCount () {
      return this._pending.size
    }

    submitChanges () {
      this.dispatchEvent(new Event('onSubmit'))
    }

    revertChanges () {
      this._pending.clear()
      this._editing = false
      this.render()
      this.dispatchEvent(new Event('onRevert'))
    }

    setReadOnly (value) {
      this.readOnly = !!value
      this.dispatchEvent(new CustomEvent('propertiesChanged', {
        detail: { properties: { readOnly: this.readOnly } }
      }))
    }

    _resolveDataBinding () {
      if (this.dataBinding && typeof this.dataBinding === 'object') {
        return this.dataBinding
      }
      if (this._bindingFromUpdate && typeof this._bindingFromUpdate === 'object') {
        return this._bindingFromUpdate
      }
      try {
        if (this.dataBindings && typeof this.dataBindings.getDataBinding === 'function') {
          const binding = this.dataBindings.getDataBinding('dataBinding')
          if (binding && binding.state) {
            return binding
          }
        }
      } catch (ignore) {}
      return this._props && this._props.dataBinding
    }

    _feedBinding () {
      try {
        if (this.dataBindings && this.dataBindings.getDataBinding) {
          return this.dataBindings.getDataBinding('dataBinding')
        }
      } catch (ignore) {}
      return null
    }

    _asList (value) {
      if (!value) {
        return []
      }
      if (Array.isArray(value)) {
        return value
      }
      try {
        return Array.from(value)
      } catch (ignore) {}
      if (typeof value.size === 'number' && typeof value.get === 'function') {
        const out = []
        for (let i = 0; i < value.size; i++) {
          out.push(value.get(i))
        }
        return out
      }
      return []
    }

    _itemId (item) {
      if (item === null || item === undefined) {
        return ''
      }
      if (typeof item === 'string' || typeof item === 'number') {
        return String(item)
      }
      return String(item.id || item.key || item.name || item.description || '')
    }

    _itemName (item, ds, kind) {
      const id = this._itemId(item)
      if (item && typeof item === 'object') {
        const named = item.description || item.label || item.name || item.displayName
        if (named) {
          return String(named)
        }
      }
      try {
        if (kind !== 'measure' && ds && ds.getDimensionDisplayName) {
          return ds.getDimensionDisplayName(id) || id
        }
        if (kind === 'measure' && ds && ds.getMeasureDisplayName) {
          return ds.getMeasureDisplayName(id) || id
        }
      } catch (ignore) {}
      return id
    }

    async _collectCatalog () {
      const binding = this._feedBinding()
      const ds = binding && binding.getDataSource && binding.getDataSource()
      const dims = []
      const measures = []
      const read = async (fn) => this._asList(await Promise.resolve().then(() => fn && fn()).catch(() => []))
      if (ds) {
        const dimRaw = await read(ds.getDimensions && ds.getDimensions.bind(ds))
        dimRaw.forEach(item => {
          const id = this._itemId(item)
          if (id) {
            dims.push({ id, name: this._itemName(item, ds, 'dimension') })
          }
        })
        const measureRaw = (await read(ds.getMeasures && ds.getMeasures.bind(ds)))
          .concat(await read(ds.getAccount && ds.getAccount.bind(ds)))
        measureRaw.forEach(item => {
          const id = this._itemId(item)
          if (id) {
            measures.push({ id, name: this._itemName(item, ds, 'measure') })
          }
        })
      }
      return { dims, measures }
    }

    _publishCatalog () {
      if (this._publishingCatalog) {
        return
      }
      this._publishingCatalog = true
      Promise.resolve(this._collectCatalog()).then(catalog => {
        const dimJson = JSON.stringify(catalog.dims || [])
        const measJson = JSON.stringify(catalog.measures || [])
        this._publishingCatalog = false
        if (dimJson === this.availableDimensionsJson && measJson === this.availableMeasuresJson) {
          return
        }
        this.dispatchEvent(new CustomEvent('propertiesChanged', {
          detail: { properties: { availableDimensionsJson: dimJson, availableMeasuresJson: measJson } }
        }))
      }).catch(() => {
        this._publishingCatalog = false
      })
    }

    _idsFor (cmd) {
      const out = []
      ;[cmd.key, cmd.id, cmd.name].forEach(value => {
        if (value && out.indexOf(value) === -1) {
          out.push(value)
        }
      })
      if (Array.isArray(cmd.ids)) {
        cmd.ids.forEach(value => {
          if (value && out.indexOf(value) === -1) {
            out.push(value)
          }
        })
      }
      return out
    }

    async _tryCall (fn) {
      try {
        if (fn) {
          await fn()
          return true
        }
      } catch (ignore) {}
      return false
    }

    async _addDimension (binding, feed, id) {
      if (!binding || !id) {
        return
      }
      if (binding.addDimensionToFeed) {
        await this._tryCall(() => binding.addDimensionToFeed(feed, id))
        if (feed === 'columns') {
          await this._tryCall(() => binding.addDimensionToFeed('dimensions', id))
        }
      } else if (binding.addDimension) {
        await this._tryCall(() => binding.addDimension(id))
      }
    }

    async _removeFeedItem (binding, feed, ids) {
      if (!binding) {
        return
      }
      for (const id of ids) {
        if (feed === 'measures') {
          if (await this._tryCall(() => binding.removeMember && binding.removeMember('measures', id))) {
            continue
          }
          await this._tryCall(() => binding.removeMemberFromFeed && binding.removeMemberFromFeed('measures', id))
        } else {
          if (await this._tryCall(() => binding.removeDimensionFromFeed && binding.removeDimensionFromFeed(feed, id))) {
            continue
          }
          if (feed === 'columns') {
            await this._tryCall(() => binding.removeDimensionFromFeed && binding.removeDimensionFromFeed('dimensions', id))
          }
          if (feed === 'dimensions') {
            await this._tryCall(() => binding.removeDimensionFromFeed && binding.removeDimensionFromFeed('columns', id))
          }
          await this._tryCall(() => binding.removeDimension && binding.removeDimension(id))
          await this._tryCall(() => binding.removeMember && binding.removeMember(feed, id))
        }
      }
    }

    async _setDimensionFilter (dimId, members) {
      const binding = this._feedBinding()
      const ds = binding && binding.getDataSource && binding.getDataSource()
      if (!ds || !dimId) {
        return
      }
      try {
        if (!members || !members.length) {
          if (ds.removeDimensionFilter) {
            await ds.removeDimensionFilter(dimId)
          }
          return
        }
        if (ds.setDimensionFilter) {
          await ds.setDimensionFilter(dimId, members)
        }
      } catch (err) {
        console.error('Planning table filter failed', dimId, err)
      }
    }

    async _loadFilterMembers (dimId) {
      const binding = this._feedBinding()
      const ds = binding && binding.getDataSource && binding.getDataSource()
      const members = []
      if (ds && dimId && ds.getMembers) {
        try {
          const raw = this._asList(await ds.getMembers(dimId))
          raw.slice(0, 500).forEach(item => {
            const id = this._itemId(item)
            if (id) {
              members.push({ id, name: this._itemName(item, ds, 'dimension') })
            }
          })
        } catch (err) {
          console.error('Planning table getMembers failed', dimId, err)
        }
      }
      const json = JSON.stringify({ dimId, members })
      if (json !== this.filterMembersJson) {
        this.dispatchEvent(new CustomEvent('propertiesChanged', {
          detail: { properties: { filterMembersJson: json } }
        }))
      }
    }

    async _loadHierarchies (dimId) {
      const binding = this._feedBinding()
      const ds = binding && binding.getDataSource && binding.getDataSource()
      const hierarchies = [{ id: '', name: 'Flat presentation' }]
      if (ds && dimId && ds.getHierarchies) {
        try {
          const raw = this._asList(await ds.getHierarchies(dimId))
          raw.forEach(item => {
            const id = typeof item === 'string' ? item : this._itemId(item)
            const name = typeof item === 'string' ? item : this._itemName(item, ds, 'dimension')
            if (id) {
              hierarchies.push({ id, name: name || id })
            }
          })
        } catch (err) {
          console.error('Planning table getHierarchies failed', dimId, err)
        }
      }
      const json = JSON.stringify({ dimId, hierarchies })
      if (json !== this.dimensionHierarchiesJson) {
        this.dispatchEvent(new CustomEvent('propertiesChanged', {
          detail: { properties: { dimensionHierarchiesJson: json } }
        }))
      }
    }

    async _setHierarchy (dimId, hierarchyId) {
      const binding = this._feedBinding()
      const ds = binding && binding.getDataSource && binding.getDataSource()
      if (!ds || !dimId) {
        return
      }
      await this._tryCall(() => ds.setHierarchy && ds.setHierarchy(dimId, hierarchyId || null))
    }

    async _runBuilderCommand (raw) {
      if (!raw || this._runningCommand) {
        return
      }
      let cmd
      try {
        cmd = JSON.parse(raw)
      } catch (ignore) {
        return
      }
      if (!cmd || !cmd.op || cmd.op === 'noop') {
        return
      }
      if (cmd.layout) {
        this._layout = parseLayout(JSON.stringify(cmd.layout))
        const layoutJson = JSON.stringify(this._layout)
        if (layoutJson !== this.builderLayoutJson) {
          this.dispatchEvent(new CustomEvent('propertiesChanged', {
            detail: { properties: { builderLayoutJson: layoutJson } }
          }))
        }
      }
      this._runningCommand = true
      const binding = this._feedBinding()
      const feed = cmd.feed || 'dimensions'
      const ids = this._idsFor(cmd)
      try {
        if (cmd.op === 'addDimension') {
          for (const id of ids) {
            await this._addDimension(binding, feed, id)
          }
        } else if (cmd.op === 'addMeasure') {
          for (const id of ids) {
            await this._tryCall(() => binding && binding.addMemberToFeed && binding.addMemberToFeed('measures', id))
            await this._tryCall(() => binding && binding.addMember && binding.addMember('measures', id))
          }
        } else if (cmd.op === 'remove') {
          await this._removeFeedItem(binding, feed === 'rows' ? 'dimensions' : feed, ids)
        } else if (cmd.op === 'clearMeasures') {
          await this._removeFeedItem(binding, 'measures', ids.length ? ids : (this._layout.measures || []).map(item => item.id || item.key))
        } else if (cmd.op === 'setFilter') {
          const dimId = cmd.dimId || cmd.id
          if (dimId && String(dimId).toLowerCase() !== 'measures') {
            await this._setDimensionFilter(dimId, cmd.members || [])
          }
        } else if (cmd.op === 'loadMembers') {
          await this._loadFilterMembers(cmd.dimId || cmd.id)
        } else if (cmd.op === 'loadHierarchies') {
          await this._loadHierarchies(cmd.dimId || cmd.id)
        } else if (cmd.op === 'setHierarchy') {
          await this._setHierarchy(cmd.dimId || cmd.id, cmd.hierarchyId || cmd.hierarchy || '')
        } else if (cmd.op === 'setDimOptions') {
          // Display, rename, totals, and visibility are applied from builderLayoutJson.
        } else if (cmd.op === 'reorder') {
          if (feed === 'columns' || feed === 'dimensions') {
            for (const id of ids) {
              await this._addDimension(binding, feed === 'rows' ? 'dimensions' : feed, id)
            }
          }
        }
      } catch (err) {
        console.error('Planning table builder command failed', cmd, err)
      }
      this._runningCommand = false
      this.dispatchEvent(new CustomEvent('propertiesChanged', {
        detail: { properties: { builderCommand: '{"op":"noop"}' } }
      }))
    }

    render () {
      const dataBinding = this._resolveDataBinding()
      this._root.style.fontSize = (this.fontSize || 14) + 'px'
      this._root.style.fontFamily = this.fontFamily || 'Arial'
      this._toolbar.style.display = this.showToolbar === false ? 'none' : 'flex'

      try {
        this._renderTable(dataBinding)
      } catch (err) {
        this._tableWrap.innerHTML = `<div class="error">The table could not be rendered. ${this._escape(err && err.message ? err.message : err)}</div>`
        this._renderToolbar()
      }
    }

    _renderTable (dataBinding) {
      const stored = parseLayout(this.builderLayoutJson)
      const layout = (this._layout && this._layout.active) ? this._layout : stored
      if (stored && stored.dimOptions) {
        layout.dimOptions = Object.assign({}, stored.dimOptions, layout.dimOptions || {})
      }
      const state = dataBinding && dataBinding.state
      let data = dataBinding && dataBinding.data
      let metadata = dataBinding && dataBinding.metadata
      if (state === 'success' && data && data.length && metadata) {
        this._lastGoodBinding = { data: data, metadata: metadata }
      } else if (state === 'error' && this._lastGoodBinding) {
        data = this._lastGoodBinding.data
        metadata = this._lastGoodBinding.metadata
      }
      const parsed = parseMetadata(metadata)
      const dimensions = parsed.dimensions
      const boundMeasures = parsed.measures
      const hasFeeds = dimensions.length > 0 && boundMeasures.length > 0
      const layoutActive = !!(layout && layout.active)
      const layoutEmpty = layoutActive && !layout.rows.length && !layout.columns.length && !layout.measures.length
      const recovered = state === 'error' && !!(data && data.length)

      if (!dataBinding || state === 'loading' || !state) {
        this._tableWrap.innerHTML = setupMessage('Waiting for the data binding to finish loading.')
        this._renderToolbar()
        return
      }

      if (layoutEmpty && !recovered) {
        this._tableWrap.innerHTML = setupMessage('Nothing is assigned. Use Builder to add dimensions and measures. Remove with × to drop them from the table.')
        this._renderToolbar()
        return
      }

      if (state !== 'success' && !recovered && !(data && metadata && (hasFeeds || layoutActive))) {
        this._tableWrap.innerHTML = setupMessage(
          state === 'error'
            ? 'SAC reported a data-binding error. Check that a model is assigned and that Version is filtered if it is not on Rows or Columns. Then re-add dimensions and measures in Builder.'
            : `Binding state: ${this._escape(state)}.`
        )
        this._renderToolbar()
        return
      }

      if (!layoutActive && !hasFeeds) {
        this._tableWrap.innerHTML = setupMessage('The model is selected, but no dimensions or measures are assigned yet. Add them in Builder.')
        this._renderToolbar()
        return
      }

      if (!data || !data.length) {
        this._tableWrap.innerHTML = setupMessage('Feeds are set, but no rows were returned. Check Version, filters, and booked data (or enable unbooked members on a native table first).')
        this._renderToolbar()
        return
      }

      const tableType = this.tableType || 'Cross-Tab'
      const colDims = pickColumnDimensions(dimensions, metadata, tableType, this.columnDimension, layout)
      const rowDims = pickRowDimensions(dimensions, colDims, layout)
      const measureList = pickMeasures(boundMeasures, layout)
      data = applyLayoutFilters(data, dimensions, layout)
      data = applyHierarchyLevels(data, dimensions, layout)

      if (!data.length) {
        this._tableWrap.innerHTML = setupMessage('The current dimension filters exclude every row. Clear a filter in the Builder Filters section.')
        this._renderToolbar()
        return
      }

      this._dimensions = dimensions
      this._measures = measureList

      const headerBg = this.headerBackground || '#F5F6F7'
      const headerFg = this.headerTextColor || '#32363A'
      const changedBg = this.changedCellColor || '#FFF3B8'
      const formatOpts = {
        scale: this.numberScale || 'Default',
        scaleFormat: this.numberScaleFormat || 'Default',
        decimalPlaces: this.numberDecimalPlaces || (Number.isInteger(this.decimalPlaces) ? String(this.decimalPlaces) : 'Default'),
        showSignAs: this.showSignAs || 'Default'
      }
      const numericDecimals = formatOpts.decimalPlaces === 'Default' ? 2 : Number(formatOpts.decimalPlaces)
      const decimalPlaces = Number.isFinite(numericDecimals) ? numericDecimals : 2
      const planningOn = this.planningEnabled !== false
      const editable = planningOn && !this.readOnly && !this.disableInteraction
      const rules = parseRules(this.stylingRulesJson)
      const lineColor = this.lineColor || '#d9d9d9'
      const lineWidth = this.lineType === 'None' ? 0 : Number(this.lineWidth || 1)
      const lineStyle = this.lineStyle === 'Dashed' ? 'dashed' : (this.lineStyle === 'Dotted' ? 'dotted' : 'solid')
      const padL = Number(this.leftPadding || 4)
      const padR = Number(this.rightPadding || 4)
      const fontFamily = this.fontFamily || 'Arial'
      const fontSizePx = Number(this.fontSize || 14)
      const fontColor = this.fontColor || '#32363A'
      const fontStyle = this.fontStyle || 'Default'
      const fontWeight = fontStyle === 'Bold' ? 'bold' : 'normal'
      const fontItalic = fontStyle === 'Italic' ? 'italic' : 'normal'
      const textDecor = [this.underline ? 'underline' : '', this.strikethrough ? 'line-through' : ''].filter(Boolean).join(' ') || 'none'
      const hAlign = this.hAlign || 'left'
      const vAlign = this.vAlign || 'middle'
      const cellChrome = `border:${lineWidth}px ${lineStyle} ${lineColor};padding:6px ${padR}px 6px ${padL}px;vertical-align:${vAlign};font-family:${fontFamily};font-size:${fontSizePx}px;color:${fontColor};font-weight:${fontWeight};font-style:${fontItalic};text-decoration:${textDecor}`

      const colMembers = columnTuples(data, colDims, layout)
      const hasColDims = colDims.length > 0
      const rowTuples = []
      const seenRows = new Set()
      data.forEach(row => {
        const key = rowKey(row, rowDims)
        if (!seenRows.has(key)) {
          seenRows.add(key)
          rowTuples.push({ key, row })
        }
      })
      this._cellIndex = new Map()
      data.forEach(row => {
        const rKey = rowKey(row, rowDims)
        const cId = colDims.length ? colDims.map(dimension => cellId(row, dimension)).join('|') : ''
        measureList.forEach(measure => {
          this._cellIndex.set(rKey + '||' + cId + '||' + measure.key, row)
        })
      })

      const prefixKey = (tuple, dimIndex) => {
        return rowDims.slice(0, dimIndex + 1).map(dimension => cellId(tuple.row, dimension)).join('|')
      }
      const hasChildren = (tuple, dimIndex) => {
        const prefix = prefixKey(tuple, dimIndex)
        return rowTuples.some(other => other.key !== tuple.key && prefixKey(other, dimIndex) === prefix)
      }
      const isHidden = tuple => {
        const hideParents = rowDims.some(dimension => {
          const option = dimOption(layout, dimension)
          return option && option.visibility === 'Hide Parent Nodes'
        })
        if (hideParents && rowDims.length) {
          const dimension = rowDims[rowDims.length - 1]
          const id = cellId(tuple.row, dimension)
          const isParent = rowTuples.some(other => {
            const otherCell = other.row[dimension.key] || {}
            const otherId = cellId(other.row, dimension)
            return other.key !== tuple.key && ((otherCell.parentId && otherCell.parentId === id) || (id && otherId !== id && otherId.indexOf(id) !== -1))
          })
          if (isParent) {
            return true
          }
        }
        if (rowDims.length === 1) {
          const id = cellId(tuple.row, rowDims[0])
          for (const collapsedId of this._collapsed) {
            if (collapsedId && id !== collapsedId && id.indexOf(collapsedId) !== -1) {
              return true
            }
          }
        }
        for (let dimIndex = 0; dimIndex < rowDims.length - 1; dimIndex++) {
          if (!this._collapsed.has(prefixKey(tuple, dimIndex))) {
            continue
          }
          const prefix = prefixKey(tuple, dimIndex)
          const first = rowTuples.find(item => prefixKey(item, dimIndex) === prefix)
          if (first && first.key !== tuple.key) {
            return true
          }
        }
        return false
      }

      const headerStyle = cellChrome + ';background:' + headerBg + ';color:' + headerFg
      const rowDimCount = Math.max(rowDims.length, 1)
      const measureCount = measureList.length
      const measureSpan = Math.max(measureCount, 1)
      const colHeaderRows = hasColDims ? colDims.length + 1 : 1
      const unit = (measureList[0] && data[0] && data[0][measureList[0].key] && data[0][measureList[0].key].unit) || ''
      if (this._title) {
        this._title.innerHTML = unit ? `Planning table <span class="unit">in ${this._escape(unit)}</span>` : 'Planning table'
      }
      let table = `<table style="font-family:${fontFamily};font-size:${fontSizePx}px;color:${fontColor}"><thead>`
      if (hasColDims) {
        colDims.forEach((dimension, dimIndex) => {
          table += '<tr>'
          if (dimIndex === 0) {
            table += `<th class="group" colspan="${rowDimCount}" rowspan="${colHeaderRows}" style="${headerStyle};text-align:${hAlign}">Measures</th>`
          }
          table += `<th class="group" style="${headerStyle}">${this._escape(dimName(dimension, layout))}</th>`
          headerGroups(colMembers, dimIndex).forEach(group => {
            table += `<th class="group" colspan="${group.span * measureSpan}" style="${headerStyle}">${this._escape(group.label)}</th>`
          })
          table += '</tr>'
        })
        table += '<tr>'
        table += `<th class="group" style="${headerStyle}"></th>`
        colMembers.forEach(() => {
          if (!measureCount) {
            table += `<th class="measure" style="${headerStyle};text-align:right">—</th>`
          }
          measureList.forEach(measure => {
            table += `<th class="measure" style="${headerStyle};text-align:right">${this._escape(measure.label || measure.description || measure.id || measure.key)}</th>`
          })
        })
        table += '</tr>'
      } else {
        table += '<tr>'
        if (rowDims.length <= 1) {
          table += `<th class="group" style="${headerStyle};text-align:${hAlign}">Measures</th>`
        } else {
          rowDims.forEach(dimension => {
            table += `<th style="${headerStyle};text-align:${hAlign}">${this._escape(dimName(dimension, layout))}</th>`
          })
        }
        measureList.forEach(measure => {
          table += `<th class="measure" style="${headerStyle};text-align:right">${this._escape(measure.label || measure.description || measure.id || measure.key)}</th>`
        })
        if (!measureCount) {
          table += `<th class="measure" style="${headerStyle};text-align:right">—</th>`
        }
        table += '</tr>'
      }
      table += '</thead><tbody>'

      const visibleTuples = rowTuples.filter(tuple => !isHidden(tuple))
      const colTotals = colMembers.map(() => measureList.map(() => 0))

      visibleTuples.forEach(tuple => {
        table += '<tr>'
        rowDims.forEach((dimension, dimIndex) => {
          const label = cellLabel(tuple.row, dimension, layout)
          const cell = tuple.row[dimension.key] || {}
          const id = cellId(tuple.row, dimension)
          const children = dimIndex < rowDims.length - 1
            ? hasChildren(tuple, dimIndex)
            : rowDims.length === 1 && rowTuples.some(other => {
              const otherCell = other.row[dimension.key] || {}
              const otherId = cellId(other.row, dimension)
              return other.key !== tuple.key && ((otherCell.parentId && otherCell.parentId === id) || (id && otherId !== id && otherId.indexOf(id) !== -1))
            })
          const prefix = prefixKey(tuple, dimIndex)
          const collapsed = this._collapsed.has(prefix)
          const toggle = children
            ? `<span class="expand" data-prefix="${this._escape(prefix)}">${collapsed ? '>' : 'v'}</span>`
            : ''
          const nested = rowDims.length === 1 && (cell.parentId || rowTuples.some(other => {
            const otherId = cellId(other.row, dimension)
            return otherId && otherId !== id && id.indexOf(otherId) !== -1
          }))
          const dimRule = firstMatchingRule(rules, 'dimension')
          table += `<td class="dim${nested ? ' child' : ''}" title="${this._escape(id)}" style="${ruleStyle(dimRule, cellChrome + ';text-align:' + hAlign)}">${toggle}${this._escape(label)}</td>`
        })
        if (!rowDims.length) {
          table += `<td class="dim" style="${cellChrome}"></td>`
        }
        if (hasColDims) {
          table += `<td class="dim" style="${cellChrome}"></td>`
        }
        colMembers.forEach((member, colIndex) => {
          if (!measureCount) {
            table += `<td class="measure" style="${cellChrome}"></td>`
          }
          measureList.forEach((measure, measureIndex) => {
            const source = this._cellIndex.get(tuple.key + '||' + member.key + '||' + measure.key)
            const bound = (source && source[measure.key]) || {}
            const original = bound.raw
            const pKey = tuple.key + '||' + member.key + '||' + measure.key
            const pending = this._pending.get(pKey)
            const current = pending ? pending.value : original
            const isNull = current === null || current === undefined || current === ''
            if (typeof current === 'number' && !Number.isNaN(current)) {
              colTotals[colIndex][measureIndex] += current
            }
            const isChanged = !!pending
            const display = isNull ? '' : formatNumber(current, formatOpts, bound.formatted)
            const comment = this._comments.get(pKey)
            const tip = [bound.unit, comment].filter(Boolean).join(' | ')
            const unit = tip ? ` title="${this._escape(tip)}"` : ''
            const measureKind = editable ? 'editable' : 'readonly-account'
            const measureRule = firstMatchingRule(rules, measureKind)
            const extra = (isChanged ? 'background:' + changedBg + ';' : '') + cellChrome + ';text-align:right'
            const nullClass = isNull ? ' null-cell' : ''
            if (editable && !isNull) {
              table += `<td class="measure${isChanged ? ' changed' : ''}${nullClass}" data-key="${this._escape(pKey)}" data-measure="${this._escape(measure.key)}"${unit} style="${ruleStyle(measureRule, extra)}">`
              table += `<input class="cell-input" inputmode="decimal" value="${this._escape(display)}" data-key="${this._escape(pKey)}" data-measure="${this._escape(measure.key)}" />`
              table += '</td>'
            } else if (isNull) {
              table += `<td class="measure null-cell" data-key="${this._escape(pKey)}" style="${ruleStyle(measureRule, extra)}"></td>`
            } else {
              table += `<td class="measure${nullClass}" data-key="${this._escape(pKey)}"${unit} style="${ruleStyle(measureRule, extra)}">${this._escape(display)}</td>`
            }
          })
        })
        table += '</tr>'
      })
      table += '</tbody>'

      const anyDimTotals = !!(layout && layout.dimOptions && Object.keys(layout.dimOptions).some(key => layout.dimOptions[key] && layout.dimOptions[key].totals))
      if (this.showTotals !== false || anyDimTotals) {
        table += '<tfoot><tr>'
        table += `<td colspan="${rowDimCount}" style="${cellChrome};text-align:${hAlign}">Total</td>`
        if (hasColDims) {
          table += `<td style="${cellChrome}"></td>`
        }
        colMembers.forEach((member, colIndex) => {
          measureList.forEach((measure, measureIndex) => {
            table += `<td class="measure" style="${cellChrome};text-align:right">${this._escape(formatNumber(colTotals[colIndex][measureIndex], formatOpts))}</td>`
          })
        })
        table += '</tr></tfoot>'
      }
      table += '</table>'

      this._tableWrap.innerHTML = table
      this._tableWrap.querySelectorAll('th').forEach(cell => {
        cell.style.background = headerBg
        cell.style.color = headerFg
      })
      this._tableWrap.querySelectorAll('.expand').forEach(btn => {
        btn.addEventListener('click', event => {
          event.stopPropagation()
          const prefix = btn.getAttribute('data-prefix')
          if (this._collapsed.has(prefix)) {
            this._collapsed.delete(prefix)
          } else {
            this._collapsed.add(prefix)
          }
          this.render()
        })
      })
      this._tableWrap.querySelectorAll('input.cell-input').forEach(input => {
        input.addEventListener('focus', () => {
          this._editing = true
          input.select()
        })
        input.addEventListener('blur', () => {
          this._editing = false
          this._commitInput(input, measureList, decimalPlaces)
        })
        input.addEventListener('keydown', event => {
          if (event.key === 'Enter') {
            event.preventDefault()
            input.blur()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            this._editing = false
            this.render()
          }
        })
      })
      if (this.allowComments) {
        this._tableWrap.querySelectorAll('td.measure').forEach(cell => {
          cell.addEventListener('contextmenu', event => {
            event.preventDefault()
            const key = cell.getAttribute('data-key')
            if (!key) {
              return
            }
            const next = window.prompt('Data point comment', this._comments.get(key) || '')
            if (next === null) {
              return
            }
            if (next) {
              this._comments.set(key, next)
            } else {
              this._comments.delete(key)
            }
            this.render()
          })
        })
      }

      this._renderToolbar()
    }

    _commitInput (input, measures, decimalPlaces) {
      const pKey = input.getAttribute('data-key')
      const measureKey = input.getAttribute('data-measure')
      const source = this._cellIndex.get(pKey)
      const measure = measures.find(item => item.key === measureKey)
      if (!source || !measure) {
        return
      }
      const bound = source[measure.key] || {}
      const original = bound.raw
      const parsed = parseInputNumber(input.value)

      if (parsed === null) {
        this._pending.delete(pKey)
        this.render()
        return
      }

      const originalNumber = typeof original === 'number' ? original : parseInputNumber(original)
      if (originalNumber !== null && Math.abs(parsed - originalNumber) < Math.pow(10, -Math.max(decimalPlaces, 6))) {
        this._pending.delete(pKey)
        this.render()
        return
      }

      const change = toPlanningChange(source, this._dimensions, measure, original, parsed)
      this._pending.set(pKey, { value: parsed, change })
      this._lastChange = change
      this.render()
      this.dispatchEvent(new Event('onCellChange'))
      if ((this.dataEntryMode || 'Fluid Data Entry Mode') === 'Fluid Data Entry Mode') {
        this.submitChanges()
      }
    }

    _renderToolbar () {
      const count = this._pending.size
      const locked = !!this.readOnly || !!this.disableInteraction || this.planningEnabled === false
      const type = this.tableType || 'Cross-Tab'
      this._toolbar.innerHTML = `
        <button id="btn-submit" ${count && !locked ? '' : 'disabled'}>Submit</button>
        <button id="btn-revert" class="secondary" ${count ? '' : 'disabled'}>Revert</button>
        <span class="status">${this._escape(type)}${this.dataLocking ? ' · Locking' : ''}${this.dataAccessControl ? ' · DAC' : ''} · ${locked ? 'Read only' : (count ? count + ' unpublished change' + (count === 1 ? '' : 's') : 'No unpublished changes')}</span>
      `
      const submit = this._shadowRoot.getElementById('btn-submit')
      const revert = this._shadowRoot.getElementById('btn-revert')
      if (submit) {
        submit.addEventListener('click', () => this.submitChanges())
      }
      if (revert) {
        revert.addEventListener('click', () => this.revertChanges())
      }
    }

    _escape (value) {
      return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }
  }

  if (!customElements.get('com-sap-sac-sample-planning-table')) {
    customElements.define('com-sap-sac-sample-planning-table', PlanningTable)
  }
})()
