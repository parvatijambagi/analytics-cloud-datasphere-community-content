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
    return { dimensions, measures }
  }

  const pickColumnDimensions = (dimensions, metadata) => {
    const feeds = (metadata && metadata.feeds) || {}
    const keys = (feeds.columns && feeds.columns.values) || []
    return keys.map(key => dimensions.find(dimension => dimension.key === key)).filter(Boolean)
  }

  const setupMessage = extra => {
    return `
      <div class="placeholder">
        <strong>Connect data in the Builder panel</strong>
        <ol>
          <li>Use an <em>Optimized Story</em> (not Classic).</li>
          <li>Select this widget, open <em>Builder</em> (not Styling).</li>
          <li>Choose a model.</li>
          <li>Add dimensions to <em>Rows</em>.</li>
          <li>Add measures under <em>Columns → Measures</em>. Add column dimensions under <em>Columns</em> if needed.</li>
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
      td.dim {
        background: #f8f9fa;
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
    }

    onCustomWidgetResize () {
      // Layout is CSS flex; no extra work required.
    }

    onCustomWidgetAfterUpdate (changedProps) {
      Object.assign(this._props, changedProps || {})
      if (changedProps && changedProps.dataBinding) {
        this._bindingFromUpdate = changedProps.dataBinding
      }
      if (changedProps && changedProps.builderCommand) {
        this._runBuilderCommand(changedProps.builderCommand)
      }
      this._publishCatalog()
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

    _publishCatalog () {
      const binding = this._feedBinding()
      let dims = []
      let measures = []
      try {
        const ds = binding && binding.getDataSource && binding.getDataSource()
        if (ds && ds.getDimensions) {
          dims = [].concat(ds.getDimensions() || [])
        }
        if (ds && ds.getMeasures) {
          measures = [].concat(ds.getMeasures() || [])
        }
      } catch (ignore) {}
      const dimJson = JSON.stringify(dims)
      const measJson = JSON.stringify(measures)
      if (dimJson === this.availableDimensionsJson && measJson === this.availableMeasuresJson) {
        return
      }
      this.dispatchEvent(new CustomEvent('propertiesChanged', {
        detail: { properties: { availableDimensionsJson: dimJson, availableMeasuresJson: measJson } }
      }))
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
      if (!cmd || !cmd.op || cmd.op === 'noop' || !cmd.id) {
        return
      }
      const binding = this._feedBinding()
      if (!binding) {
        return
      }
      this._runningCommand = true
      const feed = cmd.feed || 'dimensions'
      const id = cmd.id
      try {
        if (cmd.op === 'addDimension' && binding.addDimensionToFeed) {
          await binding.addDimensionToFeed(feed, id)
          if (feed === 'columns') {
            try {
              await binding.addDimensionToFeed('dimensions', id)
            } catch (ignore) {}
          }
        } else if (cmd.op === 'addMeasure') {
          if (binding.addMemberToFeed) {
            await binding.addMemberToFeed('measures', id)
          }
        } else if (cmd.op === 'remove') {
          if (feed === 'measures') {
            if (binding.removeMember) {
              await binding.removeMember('measures', id)
            } else if (binding.removeMemberFromFeed) {
              await binding.removeMemberFromFeed('measures', id)
            }
          } else if (binding.removeDimensionFromFeed) {
            await binding.removeDimensionFromFeed(feed, id)
            if (feed === 'columns') {
              try {
                await binding.removeDimensionFromFeed('dimensions', id)
              } catch (ignore) {}
            }
          } else if (binding.removeDimension) {
            await binding.removeDimension(id)
          } else if (binding.removeMember) {
            await binding.removeMember(feed, id)
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
      const state = dataBinding && dataBinding.state
      const data = dataBinding && dataBinding.data
      const metadata = dataBinding && dataBinding.metadata
      const { dimensions, measures } = parseMetadata(metadata)
      const colDims = pickColumnDimensions(dimensions, metadata)
      const colKeys = new Set(colDims.map(dimension => dimension.key))
      const rowDims = dimensions.filter(dimension => !colKeys.has(dimension.key))
      const hasFeeds = (rowDims.length > 0 || colDims.length > 0) && measures.length > 0

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

      this._dimensions = rowDims.concat(colDims)
      this._measures = measures

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

      const colMembers = []
      if (colDims.length) {
        const seenCols = new Set()
        data.forEach(row => {
          const key = colDims.map(dimension => (row[dimension.key] && row[dimension.key].id) || '').join('|')
          if (!seenCols.has(key)) {
            seenCols.add(key)
            colMembers.push({
              key,
              label: colDims.map(dimension => {
                const cell = row[dimension.key] || {}
                return cell.label || cell.id || ''
              }).join(' / ')
            })
          }
        })
      } else {
        colMembers.push({ key: '', label: '' })
      }
      const seenRows = new Set()
      const rowTuples = []
      data.forEach(row => {
        const key = rowKey(row, rowDims)
        if (!seenRows.has(key)) {
          seenRows.add(key)
          rowTuples.push(row)
        }
      })
      const findCellRow = (rowTuple, colKey) => {
        if (!colDims.length) {
          return rowTuple
        }
        const rKey = rowKey(rowTuple, rowDims)
        return data.find(row => rowKey(row, rowDims) === rKey && colDims.map(dimension => (row[dimension.key] && row[dimension.key].id) || '').join('|') === colKey) || {}
      }

      const totals = colMembers.map(() => measures.map(() => 0))
      let table = `<table style="font-family:${fontFamily};font-size:${fontSizePx}px;color:${fontColor}"><thead>`
      if (colDims.length) {
        table += '<tr>'
        rowDims.forEach(dimension => {
          table += `<th rowspan="2" style="${cellChrome};text-align:${hAlign}">${this._escape(dimension.description || dimension.id || dimension.key)}</th>`
        })
        if (!rowDims.length) {
          table += `<th rowspan="2" style="${cellChrome}"></th>`
        }
        colMembers.forEach(member => {
          table += `<th class="group" colspan="${measures.length}" style="${cellChrome};text-align:center">${this._escape(member.label)}</th>`
        })
        table += '</tr><tr>'
        colMembers.forEach(() => {
          measures.forEach(measure => {
            table += `<th class="measure" style="${cellChrome};text-align:right">${this._escape(measure.label || measure.description || measure.id || measure.key)}</th>`
          })
        })
        table += '</tr>'
      } else {
        table += '<tr>'
        rowDims.forEach(dimension => {
          table += `<th style="${cellChrome};text-align:${hAlign}">${this._escape(dimension.description || dimension.id || dimension.key)}</th>`
        })
        measures.forEach(measure => {
          table += `<th class="measure" style="${cellChrome};text-align:right">${this._escape(measure.label || measure.description || measure.id || measure.key)}</th>`
        })
        table += '</tr>'
      }
      table += '</thead><tbody>'

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
        colMembers.forEach((member, colIndex) => {
          const source = findCellRow(row, member.key)
          measures.forEach((measure, measureIndex) => {
            const bound = source[measure.key] || {}
            const original = bound.raw
            const key = changeKey(row, rowDims, measure.key) + '||' + member.key
            const pending = this._pending.get(key)
            const current = pending ? pending.value : original
            if (typeof current === 'number' && !Number.isNaN(current)) {
              totals[colIndex][measureIndex] += current
            }
            const isChanged = !!pending
            const display = formatNumber(current, formatOpts, bound.formatted)
            const unit = bound.unit ? ` title="${this._escape(bound.unit)}"` : ''
            const measureKind = editable ? 'editable' : 'readonly-account'
            const measureRule = firstMatchingRule(rules, measureKind)
            const extra = (isChanged ? 'background:' + changedBg + ';' : '') + cellChrome + ';text-align:right'
            if (editable) {
              table += `<td class="measure${isChanged ? ' changed' : ''}" data-row="${rowIndex}" data-measure="${this._escape(measure.key)}" data-col="${this._escape(member.key)}"${unit} style="${ruleStyle(measureRule, extra)}">`
              table += `<input class="cell-input" inputmode="decimal" value="${this._escape(display)}" data-row="${rowIndex}" data-measure="${this._escape(measure.key)}" data-col="${this._escape(member.key)}" />`
              table += '</td>'
            } else {
              table += `<td class="measure"${unit} style="${ruleStyle(measureRule, extra)}">${this._escape(display)}</td>`
            }
          })
        })
        table += '</tr>'
      })
      table += '</tbody>'

      if (this.showTotals !== false) {
        table += '<tfoot><tr>'
        table += `<td colspan="${Math.max(rowDims.length, 1)}" style="${cellChrome};text-align:${hAlign}">Total</td>`
        colMembers.forEach((member, colIndex) => {
          totals[colIndex].forEach(total => {
            table += `<td class="measure" style="${cellChrome};text-align:right">${this._escape(formatNumber(total, formatOpts))}</td>`
          })
        })
        table += '</tr></tfoot>'
      }
      table += '</table>'

      this._tableWrap.innerHTML = table
      const headerCells = this._tableWrap.querySelectorAll('th')
      headerCells.forEach(cell => {
        cell.style.background = headerBg
        cell.style.color = headerFg
      })

      this._tableWrap.querySelectorAll('input.cell-input').forEach(input => {
        input.addEventListener('focus', () => {
          this._editing = true
          input.select()
        })
        input.addEventListener('blur', () => {
          this._editing = false
          this._commitInput(input, rowTuples, rowDims, measures, decimalPlaces, data, colDims)
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

  if (!customElements.get('com-sap-sac-sample-planning-table')) {
    customElements.define('com-sap-sac-sample-planning-table', PlanningTable)
  }
})()
