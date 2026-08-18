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
      .picker {
        display: none;
        margin: 4px 0 8px;
      }
      .picker.open { display: block; }
      input[type="text"] {
        width: 100%;
        height: 28px;
        box-sizing: border-box;
        margin-top: 6px;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        font: inherit;
        padding: 0 8px;
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
      const dimJson = (changedProps && changedProps.availableDimensionsJson) || this.availableDimensionsJson
      const measJson = (changedProps && changedProps.availableMeasuresJson) || this.availableMeasuresJson
      this._applyCatalog(dimJson, measJson)
      this._render()
    }

    _applyCatalog (dimJson, measJson) {
      try {
        const dims = JSON.parse(dimJson || '[]')
        if (Array.isArray(dims) && dims.length) {
          this._allDimensions = dims.map(id => typeof id === 'string' ? { key: id, id, name: id } : { key: id.id || id.key, id: id.id || id.key, name: id.name || id.description || id.id || id.key })
        }
      } catch (ignore) {}
      try {
        const measures = JSON.parse(measJson || '[]')
        if (Array.isArray(measures) && measures.length) {
          this._allMeasures = measures.map(id => typeof id === 'string' ? { key: id, id, name: id } : { key: id.id || id.key, id: id.id || id.key, name: id.label || id.name || id.id || id.key })
        }
      } catch (ignore) {}
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
      const dimItem = key => ({
        key,
        id: (dims[key] && dims[key].id) || key,
        name: (dims[key] && (dims[key].description || dims[key].label || dims[key].id)) || key
      })
      this._rows = keys('dimensions').concat(keys('rows')).map(dimItem)
      this._columns = keys('columns').map(dimItem)
      this._measures = keys('measures').map(key => ({
        key,
        id: (measures[key] && measures[key].id) || key,
        name: (measures[key] && (measures[key].label || measures[key].description || measures[key].id)) || key
      }))
      this._allDimensions = Object.keys(dims).map(dimItem)
    }

    _binding () {
      try {
        if (this.dataBindings && this.dataBindings.getDataBinding) {
          return this.dataBindings.getDataBinding('dataBinding')
        }
      } catch (ignore) {}
      return null
    }

    _send (op, feed, id) {
      const value = (id || '').trim()
      if (!value) {
        return
      }
      this.dispatchEvent(new CustomEvent('propertiesChanged', {
        detail: {
          properties: {
            builderCommand: JSON.stringify({ op, feed, id: value, t: Date.now() })
          }
        }
      }))
    }

    async _remove (feedId, memberId) {
      this._send('remove', feedId, memberId)
    }

    async _clearMeasures () {
      this._measures.forEach(item => this._send('remove', 'measures', item.key))
    }

    async _assign (kind, feedId, id) {
      if (kind === 'measure') {
        this._send('addMeasure', 'measures', id)
      } else {
        this._send('addDimension', feedId, id)
      }
    }

    _usedDimensionIds () {
      return this._rows.concat(this._columns).map(item => item.id || item.name || item.key)
    }

    _availableDimensions () {
      const used = this._usedDimensionIds()
      const list = this._allDimensions.filter(item => used.indexOf(item.id) === -1 && used.indexOf(item.name) === -1 && used.indexOf(item.key) === -1)
      return list.length ? list : this._allDimensions
    }

    _openPicker (pickerId, selectId, inputId, kind, feedId) {
      const picker = this._shadowRoot.getElementById(pickerId)
      const select = this._shadowRoot.getElementById(selectId)
      const input = this._shadowRoot.getElementById(inputId)
      const options = kind === 'measure' ? this._allMeasures : this._availableDimensions()
      select.innerHTML = '<option value="">Select ' + (kind === 'measure' ? 'measure' : 'dimension') + '</option>'
      options.forEach(item => {
        const opt = document.createElement('option')
        opt.value = item.id || item.key
        opt.textContent = item.name || item.id || item.key
        select.appendChild(opt)
      })
      picker.classList.add('open')
      select.onchange = () => {
        const id = select.value
        if (!id) {
          return
        }
        picker.classList.remove('open')
        this._assign(kind, feedId, id)
      }
      if (input) {
        input.value = ''
        input.onkeydown = event => {
          if (event.key === 'Enter') {
            event.preventDefault()
            picker.classList.remove('open')
            this._assign(kind, feedId, input.value)
          }
        }
      }
    }

    _chip (item, feedId, icon) {
      return `<div class="chip"><span class="grip" title="Drag"></span>${icon}<span class="label">${this._esc(item.name)}</span><button class="x" data-feed="${feedId}" data-id="${this._esc(item.id || item.key)}" title="Remove">×</button></div>`
    }

    _render () {
      const rows = this._shadowRoot.getElementById('rows-body')
      const rowChips = this._rows.length
        ? this._rows.map(item => this._chip(item, 'dimensions', clover)).join('')
        : ''
      rows.innerHTML = rowChips +
        '<button class="link" id="add-row-dim">' + plus + ' Add Dimension</button>' +
        '<div class="picker" id="pick-row-dim"><select id="select-row-dim"></select><input id="type-row-dim" placeholder="Or type a dimension ID and press Enter" /></div>'

      const col = this._shadowRoot.getElementById('columns-body')
      const measureChips = this._measures.map(item => this._chip(item, 'measures', ruler)).join('')
      const columnChips = this._columns.map(item => this._chip(item, 'columns', clover)).join('')
      col.innerHTML =
        '<div class="measures-box">' +
          '<div class="measures-h">' + ruler + '<span class="label">Measures</span><span class="menu">···</span>' +
          '<button class="tool" id="filter-measures" title="Filter">' + funnel + '</button>' +
          '<button class="x" id="remove-measures" title="Remove Measures">×</button></div>' +
          measureChips +
          '<button class="link" id="add-measure">' + plus + ' Add Measure</button>' +
          '<div class="picker" id="pick-measure"><select id="select-measure"></select><input id="type-measure" placeholder="Or type a measure ID and press Enter" /></div>' +
        '</div>' +
        columnChips +
        '<button class="link" id="add-col-dim">' + plus + ' Add Dimension</button>' +
        '<div class="picker" id="pick-col-dim"><select id="select-col-dim"></select><input id="type-col-dim" placeholder="Or type a dimension ID and press Enter" /></div>'

      const on = (id, fn) => {
        const el = this._shadowRoot.getElementById(id)
        if (el) {
          el.addEventListener('click', event => {
            event.preventDefault()
            fn()
          })
        }
      }
      on('add-row-dim', () => this._openPicker('pick-row-dim', 'select-row-dim', 'type-row-dim', 'dimension', 'dimensions'))
      on('add-col-dim', () => this._openPicker('pick-col-dim', 'select-col-dim', 'type-col-dim', 'dimension', 'columns'))
      on('add-measure', () => this._openPicker('pick-measure', 'select-measure', 'type-measure', 'measure', 'measures'))
      on('remove-measures', () => this._clearMeasures())
      this._shadowRoot.querySelectorAll('.x[data-feed]').forEach(btn => {
        btn.addEventListener('click', event => {
          event.preventDefault()
          this._remove(btn.getAttribute('data-feed'), btn.getAttribute('data-id'))
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

  customElements.define('com-sap-sac-sample-planning-table-builder', Builder)
})()
