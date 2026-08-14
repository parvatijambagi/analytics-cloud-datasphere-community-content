(function () {
  const template = document.createElement('template')
  template.innerHTML = `
    <style>
      #root {
        font-family: "72", "72full", Arial, Helvetica, sans-serif;
        font-size: 13px;
        color: #1d2d3e;
        padding: 4px 0 12px;
      }
      .section {
        margin-bottom: 12px;
      }
      .section-h {
        display: flex;
        align-items: center;
        font-weight: 600;
        cursor: pointer;
        padding: 4px 0;
      }
      .chevron {
        display: inline-block;
        width: 16px;
        color: #556b82;
      }
      .spacer { flex: 1; }
      .menu {
        color: #0854a0;
        letter-spacing: 1px;
        cursor: default;
      }
      .chip {
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid #d9d9d9;
        background: #fff;
        border-radius: 4px;
        padding: 6px 8px;
        margin: 6px 0;
      }
      .chip .label { flex: 1; }
      .icon {
        width: 16px;
        text-align: center;
        color: #6a6d70;
        font-size: 12px;
      }
      .x {
        border: 0;
        background: none;
        color: #0854a0;
        cursor: pointer;
        font-size: 14px;
        padding: 0 2px;
      }
      .link {
        border: 0;
        background: none;
        color: #0854a0;
        cursor: pointer;
        font: inherit;
        padding: 4px 0;
      }
      .measures-box {
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        background: #fbfbfb;
        padding: 6px 8px 8px;
        margin: 6px 0 8px;
      }
      .measures-h {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .measures-h .label { flex: 1; }
      .tool {
        border: 0;
        background: none;
        color: #0854a0;
        cursor: pointer;
        padding: 0 3px;
      }
      .picker {
        display: none;
        margin: 6px 0;
      }
      .picker.open { display: block; }
      select {
        width: 100%;
        height: 26px;
        font: inherit;
      }
      .hint {
        color: #556b82;
        font-size: 11px;
        margin: 8px 0 0;
      }
    </style>
    <div id="root">
      <div class="section" id="rows-section">
        <div class="section-h" data-toggle="rows-body"><span class="chevron">v</span> Rows<span class="spacer"></span><span class="menu">...</span></div>
        <div id="rows-body"></div>
      </div>
      <div class="section" id="columns-section">
        <div class="section-h" data-toggle="columns-body"><span class="chevron">v</span> Columns<span class="spacer"></span><span class="menu">...</span></div>
        <div id="columns-body"></div>
      </div>
      <div class="section" id="filters-section">
        <div class="section-h" data-toggle="filters-body"><span class="chevron">v</span> Filters<span class="spacer"></span><span class="menu">...</span></div>
        <div id="filters-body"></div>
      </div>
      <p class="hint">Columns keep Measures in a nested group. Use + Add Dimension under Columns to put Version or Date above Measures. Use Rows for ARE, Cost Center, and other row dimensions.</p>
    </div>
  `

  const dimIcon = '✤'
  const measureIcon = '☰'

  class Builder extends HTMLElement {
    constructor () {
      super()
      this._shadowRoot = this.attachShadow({ mode: 'open' })
      this._shadowRoot.appendChild(template.content.cloneNode(true))
      this._rows = []
      this._columns = []
      this._measures = []
      this._filters = []
      this._picker = null
      this._shadowRoot.querySelectorAll('[data-toggle]').forEach(el => {
        el.addEventListener('click', () => {
          const body = this._shadowRoot.getElementById(el.getAttribute('data-toggle'))
          body.style.display = body.style.display === 'none' ? '' : 'none'
        })
      })
    }

    onCustomWidgetAfterUpdate (changedProps) {
      const binding = (changedProps && changedProps.dataBinding) || this.dataBinding
      this._syncFromBinding(binding)
      this._render()
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
      this._rows = keys('dimensions').concat(keys('rows')).map(key => ({ key, name: (dims[key] && (dims[key].description || dims[key].id)) || key }))
      this._columns = keys('columns').map(key => ({ key, name: (dims[key] && (dims[key].description || dims[key].id)) || key }))
      this._measures = keys('measures').map(key => ({ key, name: (measures[key] && (measures[key].label || measures[key].description || measures[key].id)) || key }))
    }

    _binding () {
      try {
        if (this.dataBindings && this.dataBindings.getDataBinding) {
          return this.dataBindings.getDataBinding('dataBinding')
        }
      } catch (ignore) {}
      return null
    }

    async _addDimension (feedId) {
      const id = await this._pick('dimension', feedId)
      if (!id) {
        return
      }
      const binding = this._binding()
      if (binding && binding.addDimensionToFeed) {
        await binding.addDimensionToFeed(feedId, id)
      }
    }

    async _addMeasure () {
      const id = await this._pick('measure', 'measures')
      if (!id) {
        return
      }
      const binding = this._binding()
      if (binding && binding.addMemberToFeed) {
        await binding.addMemberToFeed('measures', id)
      }
    }

    async _remove (feedId, memberId) {
      const binding = this._binding()
      if (binding && binding.removeMember) {
        await binding.removeMember(feedId, memberId)
      }
    }

    async _clearMeasures () {
      const list = this._measures.slice()
      for (const item of list) {
        await this._remove('measures', item.key)
      }
    }

    async _fillSelect (selectId, kind) {
      const select = this._shadowRoot.getElementById(selectId)
      if (!select) {
        return
      }
      let options = []
      try {
        const binding = this._binding()
        const ds = binding && binding.getDataSource && binding.getDataSource()
        if (kind === 'dimension' && ds && ds.getDimensions) {
          options = [].concat(ds.getDimensions() || [])
        } else if (kind === 'measure' && ds && ds.getMeasures) {
          options = [].concat(ds.getMeasures() || [])
        }
      } catch (ignore) {}
      const current = kind === 'measure'
        ? this._measures.map(item => item.name)
        : this._rows.concat(this._columns).map(item => item.name)
      select.innerHTML = '<option value="">Select ' + kind + '</option>'
      options.forEach(id => {
        if (current.indexOf(id) !== -1) {
          return
        }
        const opt = document.createElement('option')
        opt.value = id
        opt.textContent = id
        select.appendChild(opt)
      })
      if (!options.length) {
        const opt = document.createElement('option')
        opt.value = ''
        opt.textContent = 'No list from the model — type an ID in the prompt'
        select.appendChild(opt)
      }
    }

    async _openPicker (pickerId, selectId, kind, feedId) {
      const picker = this._shadowRoot.getElementById(pickerId)
      picker.classList.add('open')
      await this._fillSelect(selectId, kind)
      const select = this._shadowRoot.getElementById(selectId)
      select.onchange = async () => {
        const id = select.value
        picker.classList.remove('open')
        if (!id) {
          return
        }
        const binding = this._binding()
        if (kind === 'measure' && binding && binding.addMemberToFeed) {
          await binding.addMemberToFeed('measures', id)
        } else if (binding && binding.addDimensionToFeed) {
          await binding.addDimensionToFeed(feedId, id)
        }
      }
    }

    _chip (item, feedId) {
      return `<div class="chip"><span class="icon">${dimIcon}</span><span class="label">${this._esc(item.name)}</span><button class="x" data-feed="${feedId}" data-id="${this._esc(item.key)}" title="Remove">×</button></div>`
    }

    _render () {
      const rows = this._shadowRoot.getElementById('rows-body')
      rows.innerHTML = this._rows.map(item => this._chip(item, 'dimensions')).join('') +
        '<button class="link" id="add-row-dim">+ Add Dimension</button>' +
        '<div class="picker" id="pick-row-dim"><select id="select-row-dim"><option value="">Select a dimension</option></select></div>'

      const col = this._shadowRoot.getElementById('columns-body')
      const measureChips = this._measures.map(item =>
        `<div class="chip"><span class="icon">${measureIcon}</span><span class="label">${this._esc(item.name)}</span><button class="x" data-feed="measures" data-id="${this._esc(item.key)}" title="Remove">×</button></div>`
      ).join('')
      const columnChips = this._columns.map(item => this._chip(item, 'columns')).join('')
      col.innerHTML = `
        <div class="measures-box">
          <div class="measures-h">
            <span class="icon">${measureIcon}</span>
            <span class="label">Measures</span>
            <span class="menu">...</span>
            <button class="tool" id="filter-measures" title="Filter">⚙</button>
            <button class="x" id="remove-measures" title="Remove Measures">×</button>
          </div>
          ${measureChips}
          <button class="link" id="add-measure">+ Add Measure</button>
          <div class="picker" id="pick-measure"><select id="select-measure"><option value="">Select a measure</option></select></div>
        </div>
        ${columnChips}
        <button class="link" id="add-col-dim">+ Add Dimension</button>
        <div class="picker" id="pick-col-dim"><select id="select-col-dim"><option value="">Select a dimension</option></select></div>
      `

      const filters = this._shadowRoot.getElementById('filters-body')
      filters.innerHTML = this._filters.length
        ? this._filters.map(item => this._chip(item, 'filters')).join('')
        : '<div class="hint">Set Version and other filters in the story filter bar or the default data-binding panel. Version as a filter does not appear as a column.</div>'

      const on = (id, fn) => {
        const el = this._shadowRoot.getElementById(id)
        if (el) {
          el.addEventListener('click', fn)
        }
      }
      on('add-row-dim', () => this._openPicker('pick-row-dim', 'select-row-dim', 'dimension', 'dimensions'))
      on('add-col-dim', () => this._openPicker('pick-col-dim', 'select-col-dim', 'dimension', 'columns'))
      on('add-measure', () => this._openPicker('pick-measure', 'select-measure', 'measure', 'measures'))
      on('remove-measures', () => this._clearMeasures())
      this._shadowRoot.querySelectorAll('.x[data-feed]').forEach(btn => {
        btn.addEventListener('click', () => this._remove(btn.getAttribute('data-feed'), btn.getAttribute('data-id')))
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

  customElements.define('com-sap-sac-sample-planning-table-builder', Builder)
})()
