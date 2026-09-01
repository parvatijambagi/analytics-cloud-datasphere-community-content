(function () {
  const template = document.createElement('template')
  template.innerHTML = `
    <style>
      #root {
        font-family: "72", "72full", Arial, Helvetica, sans-serif;
        font-size: 13px;
        color: #32363a;
        background: #f7f7f7;
        padding: 0 0 8px;
      }
      .section + .section {
        border-top: 1px solid #e5e5e5;
        margin-top: 4px;
        padding-top: 4px;
      }
      .section-h {
        display: flex;
        align-items: center;
        font-weight: 700;
        cursor: pointer;
        padding: 8px 4px;
        user-select: none;
      }
      .chevron {
        width: 18px;
        color: #6a6d70;
        font-size: 10px;
      }
      .spacer { flex: 1; }
      .menu {
        color: #0854a0;
        font-weight: 700;
        letter-spacing: 2px;
        padding: 0 4px;
      }
      .body { padding: 0 4px 8px; }
      .chip {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #fff;
        border: 1px solid #d9d9d9;
        border-radius: 8px;
        padding: 8px 10px;
        margin: 6px 0;
        box-shadow: 0 1px 0 rgba(0,0,0,.04);
      }
      .grip {
        width: 10px;
        height: 16px;
        background-image: radial-gradient(#9ca0a3 1.1px, transparent 1.2px);
        background-size: 5px 5px;
        background-position: 0 0;
        opacity: .85;
        cursor: grab;
        flex: 0 0 10px;
      }
      .chip .label { flex: 1; overflow: hidden; text-overflow: ellipsis; }
      .x, .tool {
        border: 0;
        background: none;
        color: #0854a0;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        padding: 0 2px;
      }
      .link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border: 0;
        background: none;
        color: #0854a0;
        cursor: pointer;
        font: inherit;
        font-weight: 600;
        padding: 8px 2px;
      }
      .measures-box {
        border: 1px solid #d9d9d9;
        border-radius: 8px;
        background: #fff;
        padding: 6px 8px 8px;
        margin: 6px 0 8px;
      }
      .measures-h {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 700;
        padding: 4px 2px 6px;
      }
      .measures-h .label { flex: 1; }
      select {
        width: 100%;
        height: 28px;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        font: inherit;
        background: #fff;
        margin: 0 0 8px;
      }
      svg.ic {
        width: 16px;
        height: 16px;
        flex: 0 0 16px;
        fill: #6a6d70;
      }
    </style>
    <div id="root">
      <div class="section">
        <div class="section-h" data-toggle="rows-body"><span class="chevron">▼</span> Rows<span class="spacer"></span><span class="menu">···</span></div>
        <div class="body" id="rows-body"></div>
      </div>
      <div class="section">
        <div class="section-h" data-toggle="columns-body"><span class="chevron">▼</span> Columns<span class="spacer"></span><span class="menu">···</span></div>
        <div class="body" id="columns-body"></div>
      </div>
    </div>
  `

  const clover = '<svg class="ic" viewBox="0 0 16 16"><path d="M8 1.5c1.4 0 2.5 1.3 2.5 2.8 0 .4-.1.8-.2 1.1 1 .3 1.8 1.2 1.8 2.3 0 1.4-1.1 2.6-2.5 2.6-.4 0-.8-.1-1.1-.3.3 1 .3 2.1-.5 3.2-.4.6-1.1.8-1.6.3-.4-.4-.3-1 .1-1.5.5-.7.7-1.5.6-2.3-.4.2-.8.3-1.3.3C5.4 10.3 4 9.1 4 7.7c0-1.1.8-2 1.8-2.3-.1-.3-.2-.7-.2-1.1C5.6 2.8 6.7 1.5 8 1.5z"/></svg>'
  const ruler = '<svg class="ic" viewBox="0 0 16 16"><path d="M1.5 6.5h13v3h-13v-3zm1.5.8v1.4h1V7.3H3zm2.2 0v1.4h.8V7.3h-.8zm2.2 0v1.4h1V7.3H7.4zm2.3 0v1.4h.8V7.3h-.8zm2.2 0v1.4h1V7.3H11.9z"/></svg>'
  const plus = '<svg class="ic" viewBox="0 0 16 16" style="fill:#0854a0"><path d="M7.2 3h1.6v10H7.2V3zM3 7.2h10v1.6H3V7.2z"/></svg>'
  const funnel = '<svg class="ic" viewBox="0 0 16 16" style="fill:#0854a0"><path d="M2.5 3h11l-4 5.2V13L7 11.5V8.2L2.5 3z"/></svg>'

  class Builder extends HTMLElement {
    constructor () {
      super()
      this._shadowRoot = this.attachShadow({ mode: 'open' })
      this._shadowRoot.appendChild(template.content.cloneNode(true))
      this._rows = []
      this._columns = []
      this._measures = []
      this._allDimensions = []
      this._allMeasures = []
      this._requestedCatalog = false
      this._shadowRoot.querySelectorAll('[data-toggle]').forEach(el => {
        el.addEventListener('click', () => {
          const body = this._shadowRoot.getElementById(el.getAttribute('data-toggle'))
          const hidden = body.style.display === 'none'
          body.style.display = hidden ? '' : 'none'
          el.querySelector('.chevron').textContent = hidden ? '▼' : '▶'
        })
      })
    }

    onCustomWidgetAfterUpdate (changedProps) {
      const binding = (changedProps && changedProps.dataBinding) || this.dataBinding
      this._syncFromBinding(binding)
      this._mergeCatalog(
        (changedProps && changedProps.availableDimensionsJson) || this.availableDimensionsJson,
        (changedProps && changedProps.availableMeasuresJson) || this.availableMeasuresJson
      )
      this._loadCatalog()
      if (changedProps && changedProps.dataBinding && !this._requestedCatalog) {
        this._requestedCatalog = true
        this._send('requestCatalog', '', 'catalog')
      }
      this._render()
    }

    _item (raw) {
      if (raw == null) {
        return null
      }
      if (typeof raw === 'string') {
        return { key: raw, id: raw, name: raw }
      }
      const id = String(raw.id || raw.key || raw.dimensionId || raw.name || '').trim()
      if (!id) {
        return null
      }
      return {
        key: id,
        id,
        name: String(raw.description || raw.label || raw.name || id)
      }
    }

    _mergeItems (target, list) {
      const seen = new Set(target.map(item => item.id))
      ;(list || []).forEach(raw => {
        const item = this._item(raw)
        if (item && !seen.has(item.id)) {
          seen.add(item.id)
          target.push(item)
        }
      })
    }

    _parseJsonList (text) {
      try {
        const parsed = JSON.parse(text || '[]')
        return Array.isArray(parsed) ? parsed : []
      } catch (ignore) {
        return []
      }
    }

    _mergeCatalog (dimJson, measJson) {
      this._mergeItems(this._allDimensions, this._parseJsonList(dimJson))
      this._mergeItems(this._allMeasures, this._parseJsonList(measJson))
    }

    _syncFromBinding (binding) {
      const metadata = binding && binding.metadata
      if (!metadata) {
        return
      }
      const dims = metadata.dimensions || {}
      const measures = metadata.mainStructureMembers || metadata.measures || metadata.accounts || {}
      const feeds = metadata.feeds || {}
      const keys = (feed) => (feeds[feed] && feeds[feed].values) || []
      const dimItem = key => this._item({
        key,
        id: (dims[key] && dims[key].id) || key,
        name: (dims[key] && (dims[key].description || dims[key].label || dims[key].id)) || key
      })
      const colKeys = keys('columns')
      const rowKeys = keys('dimensions').concat(keys('rows')).filter(key => colKeys.indexOf(key) === -1)
      this._rows = rowKeys.map(dimItem).filter(Boolean)
      this._columns = colKeys.map(dimItem).filter(Boolean)
      this._measures = keys('measures').map(key => this._item({
        key,
        id: (measures[key] && measures[key].id) || key,
        name: (measures[key] && (measures[key].label || measures[key].description || measures[key].id)) || key
      })).filter(Boolean)
      this._mergeItems(this._allDimensions, Object.keys(dims).map(dimItem))
      this._mergeItems(this._allMeasures, Object.keys(measures).map(key => this._item({
        key,
        id: (measures[key] && measures[key].id) || key,
        name: (measures[key] && (measures[key].label || measures[key].description || measures[key].id)) || key
      })))
    }

    _binding () {
      try {
        if (this.dataBindings && this.dataBindings.getDataBinding) {
          return this.dataBindings.getDataBinding('dataBinding')
        }
      } catch (ignore) {}
      return this.dataBinding || null
    }

    _toArray (value) {
      if (!value) {
        return []
      }
      if (Array.isArray(value)) {
        return value
      }
      if (typeof value === 'object' && typeof value.then !== 'function') {
        return Object.keys(value).map(key => Object.assign({ id: key, key }, value[key]))
      }
      return []
    }

    _loadCatalog () {
      try {
        const binding = this._binding()
        const ds = binding && binding.getDataSource && binding.getDataSource()
        const take = (target, result) => {
          if (result && typeof result.then === 'function') {
            result.then(resolved => {
              this._mergeItems(target, this._toArray(resolved))
              this._render()
            }).catch(() => {})
          } else {
            this._mergeItems(target, this._toArray(result))
          }
        }
        if (ds) {
          if (ds.getDimensions) take(this._allDimensions, ds.getDimensions())
          if (ds.getDimensionIds) take(this._allDimensions, ds.getDimensionIds())
          if (ds.getMeasures) take(this._allMeasures, ds.getMeasures())
          if (ds.getMeasureIds) take(this._allMeasures, ds.getMeasureIds())
          if (ds.getMainStructureMembers) take(this._allMeasures, ds.getMainStructureMembers())
          if (ds.getAccounts) take(this._allMeasures, ds.getAccounts())
        }
        if (binding && binding.getMembers) {
          take(this._allMeasures, binding.getMembers())
        }
      } catch (ignore) {}
    }

    _usedDimensionIds () {
      return this._rows.concat(this._columns).map(item => item.id)
    }

    _usedMeasureIds () {
      return this._measures.map(item => item.id)
    }

    _availableDimensions () {
      const used = this._usedDimensionIds()
      return this._allDimensions.filter(item => used.indexOf(item.id) === -1)
    }

    _availableMeasures () {
      const used = this._usedMeasureIds()
      return this._allMeasures.filter(item => used.indexOf(item.id) === -1)
    }

    _send (op, feed, id) {
      this.dispatchEvent(new CustomEvent('propertiesChanged', {
        detail: {
          properties: {
            builderCommand: JSON.stringify({ op, feed, id: id || '', t: Date.now() })
          }
        }
      }))
    }

    _assign (kind, feedId, id) {
      if (!id) {
        return
      }
      if (kind === 'measure') {
        this._send('addMeasure', 'measures', id)
      } else {
        this._send('addDimension', feedId, id)
      }
    }

    _fillSelect (select, items, placeholder) {
      select.innerHTML = ''
      const first = document.createElement('option')
      first.value = ''
      first.textContent = placeholder
      select.appendChild(first)
      items.forEach(item => {
        const opt = document.createElement('option')
        opt.value = item.id || item.key
        opt.textContent = item.name || item.id || item.key
        select.appendChild(opt)
      })
    }

    _chip (item, feedId, icon, extras) {
      const extra = extras
        ? '<span class="menu">···</span><button class="tool" title="Filter">' + funnel + '</button>'
        : ''
      return `<div class="chip"><span class="grip" title="Drag"></span>${icon}<span class="label">${this._esc(item.name)}</span>${extra}<button class="x" data-feed="${feedId}" data-id="${this._esc(item.id || item.key)}" title="Remove">×</button></div>`
    }

    _render () {
      const rows = this._shadowRoot.getElementById('rows-body')
      const rowChips = this._rows.map(item => this._chip(item, 'dimensions', clover, true)).join('')
      rows.innerHTML = rowChips +
        '<button class="link" id="add-row-dim">' + plus + ' Add Dimension</button>' +
        '<select id="select-row-dim"></select>'

      const col = this._shadowRoot.getElementById('columns-body')
      const measureChips = this._measures.map(item => this._chip(item, 'measures', ruler, false)).join('')
      const columnChips = this._columns.map(item => this._chip(item, 'columns', clover, true)).join('')
      col.innerHTML =
        '<div class="measures-box">' +
          '<div class="measures-h">' + ruler + '<span class="label">Measures</span><span class="menu">···</span>' +
          '<button class="tool" id="filter-measures" title="Filter">' + funnel + '</button>' +
          '<button class="x" id="remove-measures" title="Remove Measures">×</button></div>' +
          measureChips +
          '<button class="link" id="add-measure">' + plus + ' Add Measure</button>' +
          '<select id="select-measure"></select>' +
        '</div>' +
        columnChips +
        '<button class="link" id="add-col-dim">' + plus + ' Add Dimension</button>' +
        '<select id="select-col-dim"></select>'

      this._fillSelect(this._shadowRoot.getElementById('select-row-dim'), this._availableDimensions(), 'Select dimension')
      this._fillSelect(this._shadowRoot.getElementById('select-col-dim'), this._availableDimensions(), 'Select dimension')
      this._fillSelect(this._shadowRoot.getElementById('select-measure'), this._availableMeasures(), 'Select measure')

      const on = (id, fn) => {
        const el = this._shadowRoot.getElementById(id)
        if (el) {
          el.addEventListener('click', event => {
            event.preventDefault()
            fn(el)
          })
        }
      }
      const bindSelect = (id, kind, feed) => {
        const select = this._shadowRoot.getElementById(id)
        select.addEventListener('change', () => {
          const value = select.value
          select.value = ''
          this._assign(kind, feed, value)
        })
      }
      on('add-row-dim', () => this._shadowRoot.getElementById('select-row-dim').focus())
      on('add-col-dim', () => this._shadowRoot.getElementById('select-col-dim').focus())
      on('add-measure', () => this._shadowRoot.getElementById('select-measure').focus())
      on('remove-measures', () => {
        this._measures.forEach(item => this._send('remove', 'measures', item.key || item.id))
      })
      bindSelect('select-row-dim', 'dimension', 'dimensions')
      bindSelect('select-col-dim', 'dimension', 'columns')
      bindSelect('select-measure', 'measure', 'measures')
      this._shadowRoot.querySelectorAll('.x[data-feed]').forEach(btn => {
        btn.addEventListener('click', event => {
          event.preventDefault()
          this._send('remove', btn.getAttribute('data-feed'), btn.getAttribute('data-id'))
        })
      })
    }

    _esc (value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }
  }

  if (!customElements.get('com-sap-sac-sample-planning-table-builder')) {
    customElements.define('com-sap-sac-sample-planning-table-builder', Builder)
  }
})()
