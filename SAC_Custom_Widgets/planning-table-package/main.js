(function () {
  const WIDGET_VERSION = '1.3.8'
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
    return { dimensions, measures }
  }

  const feedToken = item => {
    if (item == null || item === '') {
      return null
    }
    if (typeof item === 'string' || typeof item === 'number') {
      return String(item)
    }
    if (typeof item !== 'object') {
      return null
    }
    return item.id || item.key || item.dimensionId || item.name || item.description || item.label || null
  }

  const collectFeedValues = (feeds, names) => {
    const values = []
    const push = item => {
      const token = feedToken(item)
      if (token != null && values.indexOf(token) === -1) {
        values.push(token)
      }
    }
    ;(names || []).forEach(name => {
      const feed = feeds && feeds[name]
      if (feed == null) {
        return
      }
      if (Array.isArray(feed)) {
        feed.forEach(push)
        return
      }
      if (typeof feed !== 'object') {
        push(feed)
        return
      }
      ;['values', 'members', 'ids', 'dimensions', 'value'].forEach(field => {
        const list = feed[field]
        if (Array.isArray(list)) {
          list.forEach(push)
        } else if (list != null && field === 'value') {
          push(list)
        }
      })
    })
    return values
  }

  const resolveFeeds = (dataBinding, metadata) => {
    return Object.assign(
      {},
      (dataBinding && dataBinding.feeds) || {},
      (metadata && metadata.feeds) || {}
    )
  }

  const identList = dimension => {
    return [dimension.key, dimension.id, dimension.description, dimension.label]
      .filter(value => value != null && value !== '')
      .map(value => String(value))
  }

  const matchDimension = (dimensions, token) => {
    const value = String(feedToken(token) || '')
    if (!value) {
      return null
    }
    const n = value.trim().toLowerCase()
    return dimensions.find(dimension => {
      return identList(dimension).some(id => {
        const nid = id.trim().toLowerCase()
        return nid === n ||
          nid.endsWith('.' + n) ||
          nid.endsWith(':' + n) ||
          nid.indexOf('[' + n + ']') !== -1 ||
          nid.indexOf('&[' + n + ']') !== -1
      })
    }) || null
  }

  const dimName = dimension => String(dimension.description || dimension.label || dimension.id || dimension.key || '')
  const dimSearch = dimension => identList(dimension).join(' ').toLowerCase()

  const isVersionDim = dimension => /version/.test(dimSearch(dimension))
  const isDateDim = dimension => /date|time|month|period|year|calmonth|fiscal/.test(dimSearch(dimension))
  const isGlDim = dimension => /g[\s\/._-]*l[\s\/._-]*accounts?|glaccounts/.test(dimSearch(dimension))
  const isSelectorDim = dimension => isVersionDim(dimension) || isDateDim(dimension) || isGlDim(dimension) || /depth|structure/.test(dimSearch(dimension))

  const selectorRank = dimension => {
    if (isDateDim(dimension)) return 0
    if (isGlDim(dimension)) return 1
    if (isVersionDim(dimension)) return 2
    return 3
  }

  const sortSelectors = list => list.slice().sort((a, b) => selectorRank(a) - selectorRank(b))

  const uniqueDims = list => {
    const seen = new Set()
    const out = []
    ;(list || []).forEach(item => {
      if (item && !seen.has(item.key)) {
        seen.add(item.key)
        out.push(item)
      }
    })
    return out
  }

  const COLUMN_FEED_NAMES = ['dimensions2', 'columns', 'series', 'column', 'columnDimensions', 'color', 'categoryAxis2']
  const ROW_FEED_NAMES = ['dimensions', 'rows']

  const pickColumnDimensions = (dimensions, metadata, columnDimension, dataBinding) => {
    if (!dimensions || !dimensions.length) {
      return []
    }
    const feeds = resolveFeeds(dataBinding, metadata)
    const rowMatched = uniqueDims(collectFeedValues(feeds, ROW_FEED_NAMES).map(token => matchDimension(dimensions, token)))
    const rowKeys = new Set(rowMatched.map(dimension => dimension.key))
    let tokens = collectFeedValues(feeds, COLUMN_FEED_NAMES)
    Object.keys(feeds).forEach(name => {
      const lower = String(name || '').toLowerCase()
      if (ROW_FEED_NAMES.indexOf(lower) !== -1 || lower === 'measures' || lower === 'mainstructuremember') {
        return
      }
      collectFeedValues(feeds, [name]).forEach(item => {
        if (tokens.indexOf(item) === -1) {
          tokens.push(item)
        }
      })
    })
    let fromFeed = uniqueDims(tokens.map(token => matchDimension(dimensions, token)))
    const columnsFeedPopulated = fromFeed.length > 0
    if (!columnsFeedPopulated && rowMatched.length) {
      dimensions.forEach(dimension => {
        if (!rowKeys.has(dimension.key)) {
          fromFeed.push(dimension)
        }
      })
    }
    const requested = String(columnDimension == null ? 'Auto' : columnDimension).trim()
    if (requested === 'None') {
      return sortSelectors(fromFeed)
    }
    let list = fromFeed.slice()
    if (requested === 'Auto' || requested === '') {
      dimensions.filter(isSelectorDim).forEach(dimension => {
        if (columnsFeedPopulated && rowKeys.has(dimension.key)) {
          return
        }
        if (list.every(item => item.key !== dimension.key)) {
          list.push(dimension)
        }
      })
    } else if (requested !== 'Checked') {
      requested.split(',').forEach(part => {
        const item = matchDimension(dimensions, part.trim())
        if (item && list.every(existing => existing.key !== item.key)) {
          list.push(item)
        }
      })
    }
    return sortSelectors(list)
  }

  const pickRowDimensions = (dimensions, metadata, colDims, dataBinding) => {
    const feeds = resolveFeeds(dataBinding, metadata)
    const tokens = collectFeedValues(feeds, ROW_FEED_NAMES)
    const mapped = uniqueDims(tokens.map(token => matchDimension(dimensions, token)))
    const colKeys = new Set((colDims || []).map(dimension => dimension.key))
    if (mapped.length) {
      return mapped.filter(dimension => !colKeys.has(dimension.key))
    }
    return dimensions.filter(dimension => !colKeys.has(dimension.key))
  }

  const parseLooseDate = value => {
    const text = String(value || '').trim()
    if (!text) {
      return null
    }
    const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (iso) {
      return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    }
    const ymd = text.match(/\b(\d{4})(\d{2})(\d{2})\b/)
    if (ymd) {
      return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    }
    const yq = text.match(/(\d{4})\D*Q(\d)/i)
    if (yq) {
      return new Date(Number(yq[1]), (Number(yq[2]) - 1) * 3, 1)
    }
    const ym = text.match(/(\d{4})[.\/-](\d{1,2})\b/)
    if (ym) {
      return new Date(Number(ym[1]), Number(ym[2]) - 1, 1)
    }
    const year = text.match(/\b(20\d{2}|19\d{2})\b/)
    if (year) {
      return new Date(Number(year[1]), 0, 1)
    }
    const parsed = new Date(text)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const memberDate = member => parseLooseDate((member && member.id) || '') || parseLooseDate((member && member.label) || '')

  const versionMatches = (cell, token) => {
    if (!token) {
      return true
    }
    const id = String((cell && cell.id) || '')
    const label = String((cell && cell.label) || (cell && cell.name) || '')
    const want = String(token)
    if (!id && !label) {
      return false
    }
    return id === want || label === want ||
      id.toLowerCase() === want.toLowerCase() ||
      label.toLowerCase() === want.toLowerCase()
  }

  const lastBookedActualDate = (data, dateDim, versionDim, actualToken) => {
    let best = null
    ;(data || []).forEach(row => {
      if (versionDim) {
        const cell = row[versionDim.key] || {}
        const looksActual = /actual/i.test(String(cell.id || '')) || /actual/i.test(String(cell.label || ''))
        const tokenLooksActual = /actual/i.test(String(actualToken || ''))
        if (actualToken && !versionMatches(cell, actualToken) && !(tokenLooksActual && looksActual)) {
          return
        }
        if (!actualToken && !looksActual) {
          return
        }
      }
      if (!dateDim) {
        return
      }
      const date = memberDate(row[dateDim.key] || {})
      if (date && (!best || date.getTime() > best.getTime())) {
        best = date
      }
    })
    return best
  }

  const resolveCutOver = (setting, options) => {
    const opts = options || {}
    const mode = String(opts.mode || setting || 'Today')
    if (/last booked/i.test(mode) || mode === 'LastBooked') {
      return lastBookedActualDate(opts.data, opts.dateDim, opts.versionDim, opts.actualToken) || new Date()
    }
    if (/specific/i.test(mode) || mode === 'SpecificDate') {
      const token = opts.specificDate || setting
      const fromMember = (opts.dateMembers || []).find(item =>
        String(item.id) === String(token) || String(item.label) === String(token) || String(item.name) === String(token)
      )
      return (fromMember && memberDate(fromMember)) || parseLooseDate(token) || new Date()
    }
    const text = String(setting || mode || 'Today')
    if (!text || /^today/i.test(text) || /^current period/i.test(text)) {
      return new Date()
    }
    return parseLooseDate(text) || new Date()
  }

  const isForecastLookBack = (member, cutover) => {
    const date = memberDate(member)
    if (!date) {
      return true
    }
    return date.getTime() < cutover.getTime()
  }

  const versionNameOf = (list, token) => {
    const item = (list || []).find(entry => String(entry.id) === String(token) || String(entry.label) === String(token) || String(entry.name) === String(token))
    return item ? (item.label || item.name || item.id) : (token || '')
  }

  const setupMessage = extra => {
    return `
      <div class="placeholder">
        <strong>Connect data in the Builder panel</strong>
        <ol>
          <li>Use an <em>Optimized Story</em> (not Classic).</li>
          <li>Select this widget, open <em>Builder</em> (not Styling).</li>
          <li>Choose a model.</li>
          <li>Add ARE and Cost Center to <em>Rows</em>. Their names appear as row headers under the stacked column dimensions.</li>
          <li>Add Date, GL-Accounts, and Version to <em>Columns</em>. They stack under Measures as header rows (Date → (all), GL-Accounts → H1_Top, Version → Actual) across each measure column, not as extra row columns next to ARE.</li>
          <li>Add measures such as Global Currency and Local Currency to <em>Measures</em>.</li>
          <li>For a planning model, set a <em>Version</em> (and Date if required).</li>
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
      .toolbar .version {
        font-size: 11px;
        font-weight: 700;
        color: #0854a0;
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
        position: static;
        z-index: 1;
        font-weight: 600;
      }
      td.measure, th.measure {
        text-align: right;
      }
      td.dim {
        background: #f8f9fa;
      }
      thead tr.axis th.axis-label,
      thead tr.selector th.axis-label {
        text-align: right;
        font-weight: 700;
        background: #fff;
        color: #32363a;
      }
      tr.selector th, tr.selector td {
        position: static;
        background: #fff;
        color: #32363a;
        font-weight: 700;
        text-align: right;
        border-bottom: 1px solid #d9d9d9;
      }
      thead tr.row-headers th.row-dim-name {
        position: static;
        text-align: left;
        font-weight: 700;
        background: #fff;
        color: #32363a;
        border-bottom: 1px solid #1d2d3e;
      }
      thead tr.row-headers th.measure-bar {
        position: static;
        background: #fff;
        border-bottom: 4px solid #4a5a6a;
      }
      select.member-link,
      span.member-link {
        max-width: 100%;
        border: 0;
        background: transparent;
        color: #0854a0;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
      }
      .chev {
        color: #0854a0;
        font-size: 11px;
        margin-left: 4px;
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
      this._dimFilters = {}
    }

    onCustomWidgetResize () {
      // Layout is CSS flex; no extra work required.
    }

    onCustomWidgetAfterUpdate (changedProps) {
      Object.assign(this._props, changedProps || {})
      if (changedProps && changedProps.dataBinding) {
        this._bindingFromUpdate = changedProps.dataBinding
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
      const state = dataBinding && dataBinding.state
      const data = dataBinding && dataBinding.data
      const metadata = dataBinding && dataBinding.metadata
      const { dimensions, measures } = parseMetadata(metadata)
      const selectorDims = pickColumnDimensions(dimensions, metadata, this.columnDimension, dataBinding)
      const rowDims = pickRowDimensions(dimensions, metadata, selectorDims, dataBinding)
      const hasFeeds = (rowDims.length > 0 || selectorDims.length > 0) && measures.length > 0

      if (!dataBinding || state === 'loading' || !state) {
        this._tableWrap.innerHTML = setupMessage('Waiting for the data binding to finish loading.')
        this._renderToolbar()
        return
      }

      if (state !== 'success' && !(data && metadata && hasFeeds)) {
        this._tableWrap.innerHTML = setupMessage(
          state === 'error'
            ? 'SAC reported a data-binding error. This usually means the model, Version, or feeds are not set yet.'
            : `Binding state: ${this._escape(state)}.`
        )
        this._renderToolbar()
        return
      }

      if (!hasFeeds) {
        this._tableWrap.innerHTML = setupMessage('The model is selected, but the dimension and measure feeds are still empty.')
        this._renderToolbar()
        return
      }

      if (!data || !data.length) {
        this._tableWrap.innerHTML = setupMessage('Feeds are set, but no rows were returned. Check Version, filters, and booked data (or enable unbooked members on a native table first).')
        this._renderToolbar()
        return
      }

      this._measures = measures
      if (!this._dimFilters) {
        this._dimFilters = {}
      }

      const membersOf = dimension => {
        const seen = new Map()
        data.forEach(row => {
          const cell = row[dimension.key] || {}
          const id = cell.id || ''
          if (!seen.has(id)) {
            seen.set(id, cell.label || cell.id || '(all)')
          }
        })
        return Array.from(seen.keys()).map(id => ({ id, label: seen.get(id) }))
      }
      const selectedMember = dimension => {
        if (this._dimFilters[dimension.key]) {
          return this._dimFilters[dimension.key]
        }
        const members = membersOf(dimension)
        if (members.length === 1) {
          return members[0].id
        }
        const ids = members.map(item => item.id).filter((id, index, list) => list.indexOf(id) === index)
        return ids.length === 1 ? ids[0] : ''
      }
      let view = data
      selectorDims.forEach(dimension => {
        const selected = this._dimFilters[dimension.key]
        if (!selected) {
          return
        }
        view = view.filter(row => ((row[dimension.key] && row[dimension.key].id) || '') === selected)
      })

      const forecastMode = String(this.tableType || 'Cross-Tab') === 'Forecast'
      const dateDim = selectorDims.concat(rowDims).find(isDateDim) || null
      const versionDim = selectorDims.concat(rowDims).find(isVersionDim) || null
      let extraVersions = []
      try {
        const parsed = JSON.parse(this.additionalVersionsJson || '[]')
        extraVersions = Array.isArray(parsed)
          ? parsed.map(item => {
            if (item && typeof item === 'object') {
              return String(item.version || item.id || '')
            }
            return String(item || '')
          }).filter(Boolean)
          : []
      } catch (ignore) {
        extraVersions = []
      }
      let stackedDims = selectorDims.slice()
      let leafColumns = measures.map(measure => ({ measure, date: null, versionId: '', versionLabel: '', key: measure.key }))
      if (forecastMode && dateDim) {
        stackedDims = selectorDims.filter(dimension => dimension.key !== dateDim.key && (!versionDim || dimension.key !== versionDim.key))
        rowDims = rowDims.filter(dimension => dimension.key !== dateDim.key && (!versionDim || dimension.key !== versionDim.key))
        const dateMembers = membersOf(dateDim).filter(item => item.id)
        const versionMembers = versionDim ? membersOf(versionDim) : []
        const lookBackId = this.lookBackOn || (versionMembers.find(item => /actual/i.test(String(item.label || item.id))) || { id: 'Actual' }).id
        const lookAheadId = this.lookAheadOn || (versionMembers.find(item => /epmplusa|forecast/i.test(String(item.label || item.id))) || { id: 'EPMplusA' }).id
        const cutover = resolveCutOver(this.cutOverDate, {
          mode: this.cutOverMode || this.cutOverDate,
          specificDate: this.cutOverDate,
          data: view,
          dateDim,
          versionDim,
          dateMembers,
          actualToken: lookBackId
        })
        leafColumns = []
        dateMembers.forEach(date => {
          const primaryId = isForecastLookBack(date, cutover) ? lookBackId : lookAheadId
          const versionIds = [primaryId].concat(extraVersions).filter((id, index, list) => id && list.indexOf(id) === index)
          ;(versionIds.length ? versionIds : ['']).forEach(versionId => {
            measures.forEach(measure => {
              leafColumns.push({
                measure,
                date,
                versionId,
                versionLabel: versionNameOf(versionMembers, versionId) || versionId || '(all)',
                key: [date.id, versionId, measure.key].join('|')
              })
            })
          })
        })
        if (!leafColumns.length) {
          leafColumns = measures.map(measure => ({ measure, date: null, versionId: '', versionLabel: '', key: measure.key }))
        }
      }
      this._dimensions = rowDims.concat(stackedDims)

      const headerBg = this.headerBackground || '#0854A0'
      const headerFg = this.headerTextColor || '#FFFFFF'
      const changedBg = this.changedCellColor || '#FFF3B8'
      const formatOpts = {
        scale: this.numberScale || 'Default',
        scaleFormat: this.numberScaleFormat || 'Default',
        decimalPlaces: this.numberDecimalPlaces || (Number.isInteger(this.decimalPlaces) ? String(this.decimalPlaces) : 'Default'),
        showSignAs: this.showSignAs || 'Default'
      }
      const numericDecimals = formatOpts.decimalPlaces === 'Default' ? 2 : Number(formatOpts.decimalPlaces)
      const decimalPlaces = Number.isFinite(numericDecimals) ? numericDecimals : 2
      const editable = !this.readOnly
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

      const seenRows = new Set()
      const rowTuples = []
      view.forEach(row => {
        const key = rowKey(row, rowDims)
        if (!seenRows.has(key)) {
          seenRows.add(key)
          rowTuples.push(row)
        }
      })

      const totals = leafColumns.map(() => 0)
      const rowHeaderCount = Math.max(rowDims.length, 1)
      const axisLabel = (label, extraClass, extraStyle) => {
        return `<th class="${extraClass || 'axis-label'}" colspan="${rowHeaderCount}" style="${cellChrome};text-align:right;${extraStyle || ''}">${label}</th>`
      }
      let table = `<table style="font-family:${fontFamily};font-size:${fontSizePx}px;color:${fontColor}"><thead>`
      if (forecastMode && dateDim && leafColumns.some(column => column.date)) {
        table += '<tr class="selector">'
        table += axisLabel(this._escape(dimName(dateDim)) + '<span class="chev">›</span>', 'axis-label selector')
        leafColumns.forEach(column => {
          table += `<td class="selector"><span class="member-link">${this._escape(column.date.label || column.date.id)}</span><span class="chev">›</span></td>`
        })
        table += '</tr>'
        if (versionDim) {
          table += '<tr class="selector">'
          table += axisLabel(this._escape(dimName(versionDim)), 'axis-label selector')
          leafColumns.forEach(column => {
            table += `<td class="selector"><span class="member-link">${this._escape(column.versionLabel)}</span></td>`
          })
          table += '</tr>'
        }
      }
      table += '<tr class="axis">'
      table += axisLabel('Measures')
      leafColumns.forEach(column => {
        table += `<th class="measure" style="${cellChrome};text-align:right">${this._escape(column.measure.label || column.measure.description || column.measure.id || column.measure.key)}</th>`
      })
      table += '</tr>'
      stackedDims.forEach(dimension => {
        const members = membersOf(dimension)
        const selected = selectedMember(dimension)
        const showChevron = !isVersionDim(dimension) || members.length > 1
        const chev = showChevron ? '<span class="chev">›</span>' : ''
        table += '<tr class="selector">'
        table += axisLabel(`${this._escape(dimName(dimension))}${chev}`, 'axis-label selector')
        leafColumns.forEach(() => {
          table += '<td class="selector">'
          table += `<select class="member-link" data-dim="${this._escape(dimension.key)}" aria-label="${this._escape(dimName(dimension))}">`
          table += '<option value="">(all)</option>'
          members.forEach(item => {
            if (!item.id) {
              return
            }
            const isSel = item.id === selected ? ' selected' : ''
            table += `<option value="${this._escape(item.id)}"${isSel}>${this._escape(item.label || item.id || '(all)')}</option>`
          })
          table += `</select>${chev}`
          table += '</td>'
        })
        table += '</tr>'
      })
      table += '<tr class="row-headers">'
      if (rowDims.length) {
        rowDims.forEach(dimension => {
          table += `<th class="row-dim-name" style="${cellChrome};text-align:${hAlign}">${this._escape(dimName(dimension))}</th>`
        })
      } else {
        table += `<th class="row-dim-name" style="${cellChrome}"></th>`
      }
      leafColumns.forEach(() => {
        table += `<th class="measure-bar" style="${cellChrome}"></th>`
      })
      table += '</tr>'
      table += '</thead><tbody>'

      const findBound = (row, column) => {
        if (!column.date) {
          return row[column.measure.key] || {}
        }
        const rKey = rowKey(row, rowDims)
        const match = view.find(item => {
          if (rowKey(item, rowDims) !== rKey) {
            return false
          }
          const dateId = (item[dateDim.key] && item[dateDim.key].id) || ''
          if (dateId !== column.date.id) {
            return false
          }
          if (!versionDim || !column.versionId) {
            return true
          }
          const cell = item[versionDim.key] || {}
          return cell.id === column.versionId || cell.label === column.versionId
        })
        return (match && match[column.measure.key]) || {}
      }

      rowTuples.forEach((row, rowIndex) => {
        table += '<tr>'
        rowDims.forEach(dimension => {
          const cell = row[dimension.key] || {}
          const dimRule = firstMatchingRule(rules, 'dimension')
          table += `<td class="dim" title="${this._escape(cell.id || '')}" style="${ruleStyle(dimRule, cellChrome + ';text-align:' + hAlign)}">${this._escape(cell.label || '')}</td>`
        })
        if (!rowDims.length) {
          table += `<td class="dim" style="${cellChrome}"></td>`
        }
        leafColumns.forEach((column, columnIndex) => {
          const bound = findBound(row, column)
          const original = bound.raw
          const key = changeKey(row, rowDims, column.measure.key) + '||' + column.key
          const pending = this._pending.get(key)
          const current = pending ? pending.value : original
          if (typeof current === 'number' && !Number.isNaN(current)) {
            totals[columnIndex] += current
          }
          const isChanged = !!pending
          const display = formatNumber(current, formatOpts, bound.formatted)
          const unit = bound.unit ? ` title="${this._escape(bound.unit)}"` : ''
          const measureKind = editable ? 'editable' : 'readonly-account'
          const measureRule = firstMatchingRule(rules, measureKind)
          const extra = (isChanged ? 'background:' + changedBg + ';' : '') + cellChrome + ';text-align:right'
          if (editable) {
            table += `<td class="measure${isChanged ? ' changed' : ''}" data-row="${rowIndex}" data-measure="${this._escape(column.measure.key)}" data-col="${this._escape(column.key)}"${unit} style="${ruleStyle(measureRule, extra)}">`
            table += `<input class="cell-input" inputmode="decimal" value="${this._escape(display)}" data-row="${rowIndex}" data-measure="${this._escape(column.measure.key)}" data-col="${this._escape(column.key)}" />`
            table += '</td>'
          } else {
            table += `<td class="measure"${unit} style="${ruleStyle(measureRule, extra)}">${this._escape(display)}</td>`
          }
        })
        table += '</tr>'
      })
      table += '</tbody>'

      if (this.showTotals !== false) {
        table += '<tfoot><tr>'
        table += `<td colspan="${rowHeaderCount}" style="${cellChrome};text-align:${hAlign}">Total</td>`
        totals.forEach(total => {
          table += `<td class="measure" style="${cellChrome};text-align:right">${this._escape(formatNumber(total, formatOpts))}</td>`
        })
        table += '</tr></tfoot>'
      }
      table += '</table>'

      this._tableWrap.innerHTML = table
      this._tableWrap.querySelectorAll('thead tr.axis th.measure').forEach(cell => {
        cell.style.background = headerBg
        cell.style.color = headerFg
      })

      this._tableWrap.querySelectorAll('select.member-link').forEach(select => {
        select.addEventListener('change', () => {
          const dimKey = select.getAttribute('data-dim')
          this._dimFilters[dimKey] = select.value
          const dimension = stackedDims.find(item => item.key === dimKey)
          this._applyDimensionFilter(dimension, select.value)
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
          this._commitInput(input, rowTuples, rowDims.concat(stackedDims), measures, decimalPlaces, view, [dateDim, versionDim].filter(Boolean))
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

      this._renderToolbar()
    }

    async _applyDimensionFilter (dimension, memberId) {
      if (!dimension) {
        return
      }
      try {
        const binding = this.dataBindings && this.dataBindings.getDataBinding && this.dataBindings.getDataBinding('dataBinding')
        const ds = binding && binding.getDataSource && binding.getDataSource()
        if (ds && ds.setDimensionFilter) {
          if (memberId) {
            await ds.setDimensionFilter(dimension.id || dimension.key, memberId)
          } else if (ds.removeDimensionFilter) {
            await ds.removeDimensionFilter(dimension.id || dimension.key)
          } else {
            await ds.setDimensionFilter(dimension.id || dimension.key, [])
          }
        }
      } catch (ignore) {}
    }

    _commitInput (input, rowTuples, rowDims, measures, decimalPlaces, data, colDims) {
      const rowIndex = Number(input.getAttribute('data-row'))
      const measureKey = input.getAttribute('data-measure')
      const colKey = input.getAttribute('data-col') || ''
      const row = rowTuples[rowIndex]
      const measure = measures.find(item => item.key === measureKey)
      if (!row || !measure) {
        return
      }
      let source = row
      if (colDims && colDims.length) {
        const rKey = rowKey(row, rowDims)
        source = data.find(item => rowKey(item, rowDims) === rKey && colDims.map(dimension => (item[dimension.key] && item[dimension.key].id) || '').join('|') === colKey) || row
      }
      const bound = source[measure.key] || {}
      const original = bound.raw
      const parsed = parseInputNumber(input.value)
      const key = changeKey(row, rowDims, measure.key) + '||' + colKey

      if (parsed === null) {
        this._pending.delete(key)
        this.render()
        return
      }

      const originalNumber = typeof original === 'number' ? original : parseInputNumber(original)
      if (originalNumber !== null && Math.abs(parsed - originalNumber) < Math.pow(10, -Math.max(decimalPlaces, 6))) {
        this._pending.delete(key)
        this.render()
        return
      }

      const change = toPlanningChange(source, rowDims.concat(colDims || []), measure, original, parsed)
      this._pending.set(key, { value: parsed, change })
      this._lastChange = change
      this.render()
      this.dispatchEvent(new Event('onCellChange'))
    }

    _renderToolbar () {
      const count = this._pending.size
      const locked = !!this.readOnly
      this._toolbar.innerHTML = `
        <span class="version">v${WIDGET_VERSION}</span>
        <button id="btn-submit" ${count && !locked ? '' : 'disabled'}>Submit</button>
        <button id="btn-revert" class="secondary" ${count ? '' : 'disabled'}>Revert</button>
        <span class="status">${locked ? 'Read only' : (count ? count + ' unpublished change' + (count === 1 ? '' : 's') : 'No unpublished changes')}</span>
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

  if (!customElements.get('com-sap-sac-sample-planning-table-v13')) {
    customElements.define('com-sap-sac-sample-planning-table-v13', PlanningTable)
  }
})()
