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
        position: relative;
        min-height: 280px;
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
      .chevron { width: 18px; color: #6a6d70; font-size: 10px; }
      .spacer { flex: 1; }
      .menu {
        color: #0854a0;
        font-weight: 700;
        letter-spacing: 2px;
        padding: 0 4px;
        border: 0;
        background: none;
        cursor: pointer;
        font: inherit;
      }
      .body { padding: 0 4px 8px; }
      .chip, .filter-card {
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
      .filter-card { cursor: pointer; }
      .filter-text { flex: 1; min-width: 0; }
      .filter-title { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .filter-sub { color: #6a6d70; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .chip.dragging { opacity: .45; }
      .chip.drag-over, .zone.drag-over { outline: 2px dashed #0854a0; }
      .grip {
        width: 10px;
        height: 16px;
        background-image: radial-gradient(#9ca0a3 1.1px, transparent 1.2px);
        background-size: 5px 5px;
        cursor: grab;
        flex: 0 0 10px;
      }
      .chip .label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
      .hint { color: #6a6d70; font-size: 11px; padding: 2px 4px 6px; }
      .popover-back {
        display: none;
        position: absolute;
        inset: 0;
        background: transparent;
        z-index: 20;
      }
      .popover-back.open { display: block; }
      .popover, .ctx, .ctx-sub {
        display: none;
        position: absolute;
        background: #fff;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        box-shadow: 0 4px 16px rgba(0,0,0,.18);
        z-index: 21;
      }
      .popover {
        left: 8px;
        right: 8px;
        top: 48px;
        max-height: 70%;
        overflow: auto;
        padding: 8px;
      }
      .popover.open, .ctx.open, .ctx-sub.open { display: block; }
      .ctx, .ctx-sub {
        min-width: 210px;
        padding: 4px 0;
      }
      .ctx-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 12px;
        cursor: pointer;
        font-size: 13px;
        border: 0;
        background: none;
        width: 100%;
        text-align: left;
        color: #32363a;
        font-family: inherit;
      }
      .ctx-item:hover { background: #e8f3ff; }
      .ctx-item .grow { flex: 1; }
      .ctx-item.on { font-weight: 700; }
      .arrow { color: #6a6d70; }
      .search {
        display: flex;
        align-items: center;
        border: 1px dashed #0854a0;
        border-radius: 2px;
        padding: 4px 8px;
        margin-bottom: 8px;
      }
      .search input, .rename-input {
        flex: 1;
        border: 0;
        outline: none;
        font: inherit;
        background: transparent;
      }
      .rename-input {
        border: 1px solid #0854a0;
        padding: 6px 8px;
        width: calc(100% - 16px);
        margin: 4px 0 8px;
      }
      .group-h { font-weight: 700; margin: 10px 0 4px; }
      .row-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 4px;
      }
      .row-item:hover { background: #e8f3ff; }
      .empty { color: #556b82; font-size: 12px; padding: 8px 4px; }
      .apply-row {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 8px;
      }
      .apply-row button {
        border: 1px solid #0854a0;
        background: #0854a0;
        color: #fff;
        border-radius: 4px;
        padding: 6px 10px;
        cursor: pointer;
        font: inherit;
      }
      .apply-row button.secondary { background: #fff; color: #0854a0; }
      svg.ic { width: 16px; height: 16px; flex: 0 0 16px; fill: #6a6d70; }
    </style>
    <div id="root">
      <div class="section">
        <div class="section-h" data-toggle="rows-body"><span class="chevron">▼</span> Rows<span class="spacer"></span><span class="menu">···</span></div>
        <div class="body zone" id="rows-body" data-zone="rows"></div>
      </div>
      <div class="section">
        <div class="section-h" data-toggle="columns-body"><span class="chevron">▼</span> Columns<span class="spacer"></span><span class="menu">···</span></div>
        <div class="body zone" id="columns-body" data-zone="columns"></div>
      </div>
      <div class="section">
        <div class="section-h" data-toggle="filters-body"><span class="chevron">▼</span> Filters<span class="spacer"></span><span class="menu">···</span></div>
        <div class="body" id="filters-body"></div>
      </div>
      <div class="popover-back" id="pop-back"></div>
      <div class="popover" id="popover">
        <div class="search" id="search-wrap"><input id="pop-search" placeholder="Search" /><span>🔍</span></div>
        <div id="pop-body"></div>
      </div>
      <div class="ctx" id="ctx-menu"></div>
      <div class="ctx-sub" id="ctx-sub"></div>
    </div>
  `

  const clover = '<svg class="ic" viewBox="0 0 16 16"><path d="M8 1.5c1.4 0 2.5 1.3 2.5 2.8 0 .4-.1.8-.2 1.1 1 .3 1.8 1.2 1.8 2.3 0 1.4-1.1 2.6-2.5 2.6-.4 0-.8-.1-1.1-.3.3 1 .3 2.1-.5 3.2-.4.6-1.1.8-1.6.3-.4-.4-.3-1 .1-1.5.5-.7.7-1.5.6-2.3-.4.2-.8.3-1.3.3C5.4 10.3 4 9.1 4 7.7c0-1.1.8-2 1.8-2.3-.1-.3-.2-.7-.2-1.1C5.6 2.8 6.7 1.5 8 1.5z"/></svg>'
  const ruler = '<svg class="ic" viewBox="0 0 16 16"><path d="M1.5 6.5h13v3h-13v-3zm1.5.8v1.4h1V7.3H3zm2.2 0v1.4h.8V7.3h-.8zm2.2 0v1.4h1V7.3H7.4zm2.3 0v1.4h.8V7.3h-.8zm2.2 0v1.4h1V7.3H11.9z"/></svg>'
  const plus = '<svg class="ic" viewBox="0 0 16 16" style="fill:#0854a0"><path d="M7.2 3h1.6v10H7.2V3zM3 7.2h10v1.6H3V7.2z"/></svg>'
  const funnel = '<svg class="ic" viewBox="0 0 16 16" style="fill:#0854a0"><path d="M2.5 3h11l-4 5.2V13L7 11.5V8.2L2.5 3z"/></svg>'
  const cube = '<svg class="ic" viewBox="0 0 16 16" style="fill:#0854a0"><path d="M8 1.2l6.2 3.2v7.2L8 14.8 1.8 11.6V4.4L8 1.2zm0 1.8L3.4 5.2 8 7.6l4.6-2.4L8 3zm5.2 3.3L8.7 8.7v4.6l4.5-2.3V6.3zM7.3 13.3V8.7L2.8 6.3v4.7l4.5 2.3z"/></svg>'
  const tree = '<svg class="ic" viewBox="0 0 16 16"><path d="M7 1h2v3H7V1zM3 12h2v3H3v-3zm8 0h2v3h-2v-3zM8 5v3H4v3h1v-2h6v2h1V8H8V5z"/></svg>'
  const gear = '<svg class="ic" viewBox="0 0 16 16"><path d="M6.4 1h3.2l.4 2.1c.5.2 1 .5 1.4.9l2.1-.6 1.6 2.8-1.7 1.3v1l1.7 1.3-1.6 2.8-2.1-.6c-.4.4-.9.7-1.4.9L9.6 15H6.4l-.4-2.1c-.5-.2-1-.5-1.4-.9l-2.1.6L.9 9.8l1.7-1.3v-1L.9 6.2l1.6-2.8 2.1.6c.4-.4.9-.7 1.4-.9L6.4 1zM8 6.2A1.8 1.8 0 108 9.8 1.8 1.8 0 008 6.2z"/></svg>'
  const pencil = '<svg class="ic" viewBox="0 0 16 16"><path d="M11.6 1.6l2.8 2.8-8.5 8.5H3.1v-2.8l8.5-8.5zm1.2 1.2l-.8-.8-8.5 8.5v.8h.8l8.5-8.5z"/></svg>'
  const eye = '<svg class="ic" viewBox="0 0 16 16"><path d="M8 3c3.5 0 6.4 2.2 7.5 5-1.1 2.8-4 5-7.5 5S1.6 10.8.5 8C1.6 5.2 4.5 3 8 3zm0 2.2A2.8 2.8 0 108 10.8 2.8 2.8 0 008 5.2z"/></svg>'
  const tag = '<svg class="ic" viewBox="0 0 16 16"><path d="M2 2h6.4L14 7.6 8.4 13.2 2.8 7.6V2zm3 2.2A1.2 1.2 0 103 6.4 1.2 1.2 0 005 4.2z"/></svg>'

  const emptyLayout = () => ({
    active: false,
    rows: [],
    columns: [],
    measures: [],
    filters: {},
    dimOptions: {}
  })

  const defaultDimOption = () => ({
    hierarchy: '',
    display: 'Description',
    rename: '',
    unbooked: false,
    totals: false,
    visibility: 'All Data'
  })

  class Builder extends HTMLElement {
    constructor () {
      super()
      this._shadowRoot = this.attachShadow({ mode: 'open' })
      this._shadowRoot.appendChild(template.content.cloneNode(true))
      this._layout = emptyLayout()
      this._allDimensions = []
      this._allMeasures = []
      this._pickerFeed = 'dimensions'
      this._pickerKind = 'dimension'
      this._filterItem = null
      this._filterMembers = []
      this._hierarchies = []
      this._drag = null
      this._ctxItem = null
      this._shadowRoot.getElementById('pop-back').addEventListener('click', () => {
        this._closePicker()
        this._closeCtx()
      })
      this._shadowRoot.getElementById('pop-search').addEventListener('input', () => this._fillPicker())
      this._shadowRoot.querySelectorAll('[data-toggle]').forEach(el => {
        el.addEventListener('click', event => {
          if (event.target.closest('.menu')) {
            return
          }
          const body = this._shadowRoot.getElementById(el.getAttribute('data-toggle'))
          const hidden = body.style.display === 'none'
          body.style.display = hidden ? '' : 'none'
          el.querySelector('.chevron').textContent = hidden ? '▼' : '▶'
        })
      })
    }

    onCustomWidgetAfterUpdate (changedProps) {
      const incoming = (changedProps && changedProps.builderLayoutJson) || this.builderLayoutJson
      if (incoming) {
        const previous = this._layout
        this._readLayout(incoming)
        if (previous && previous.active && !this._layout.active) {
          this._layout = previous
        }
      }
      if (!this._layout.active) {
        const binding = (changedProps && changedProps.dataBinding) || this.dataBinding
        this._seedFromBinding(binding)
      }
      const dimJson = (changedProps && changedProps.availableDimensionsJson) || this.availableDimensionsJson
      const measJson = (changedProps && changedProps.availableMeasuresJson) || this.availableMeasuresJson
      this._applyCatalog(dimJson, measJson)
      if (changedProps && changedProps.filterMembersJson) {
        this._applyFilterMembers(changedProps.filterMembersJson)
      }
      if (changedProps && changedProps.dimensionHierarchiesJson) {
        this._applyHierarchies(changedProps.dimensionHierarchiesJson)
      }
      this._render()
    }

    _readLayout (json) {
      try {
        const parsed = JSON.parse(json || '{}')
        if (parsed && typeof parsed === 'object') {
          this._layout = {
            active: !!parsed.active,
            rows: Array.isArray(parsed.rows) ? parsed.rows : [],
            columns: Array.isArray(parsed.columns) ? parsed.columns : [],
            measures: Array.isArray(parsed.measures) ? parsed.measures : [],
            filters: this._normalizeFilters(parsed.filters),
            dimOptions: parsed.dimOptions && typeof parsed.dimOptions === 'object' ? parsed.dimOptions : {}
          }
        }
      } catch (ignore) {}
    }

    _normalizeFilters (raw) {
      const out = {}
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return out
      }
      Object.keys(raw).forEach(key => {
        const val = raw[key]
        if (!val) {
          return
        }
        let members = []
        let name = key
        let kind = String(key).toLowerCase() === 'measures' ? 'measures' : 'dimension'
        if (Array.isArray(val)) {
          members = val.map(item => typeof item === 'string' ? { id: item, name: item } : { id: item.id || item.key, name: item.name || item.id || item.key })
        } else if (Array.isArray(val.members)) {
          members = val.members.map(item => typeof item === 'string' ? { id: item, name: item } : { id: item.id || item.key, name: item.name || item.id || item.key })
          name = val.name || key
          kind = val.kind || kind
        }
        if (members.length) {
          out[key] = { id: (val && val.id) || key, name, kind, members }
        }
      })
      return out
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

    _applyFilterMembers (json) {
      try {
        const parsed = JSON.parse(json || '{}')
        if (parsed && parsed.dimId && Array.isArray(parsed.members)) {
          if (this._filterItem && String(this._filterItem.id || this._filterItem.key) === String(parsed.dimId)) {
            this._filterMembers = parsed.members
          } else if (!this._filterItem) {
            this._filterMembers = parsed.members
          }
          if (this._pickerKind === 'filter') {
            this._fillPicker()
          }
        }
      } catch (ignore) {}
    }

    _applyHierarchies (json) {
      try {
        const parsed = JSON.parse(json || '{}')
        if (parsed && Array.isArray(parsed.hierarchies)) {
          this._hierarchies = parsed.hierarchies
          if (this._ctxItem && this._shadowRoot.getElementById('ctx-sub').classList.contains('open')) {
            this._showHierarchySub()
          }
        }
      } catch (ignore) {}
    }

    _seedFromBinding (binding) {
      const metadata = binding && binding.metadata
      if (!metadata) {
        return
      }
      const dims = metadata.dimensions || {}
      const measures = metadata.mainStructureMembers || metadata.measures || metadata.accounts || {}
      const feeds = metadata.feeds || {}
      const keys = feed => (feeds[feed] && feeds[feed].values) || []
      const dimItem = key => ({
        key,
        id: (dims[key] && dims[key].id) || key,
        name: (dims[key] && (dims[key].description || dims[key].label || dims[key].id)) || key
      })
      this._layout.rows = keys('dimensions').concat(keys('rows')).map(dimItem)
      this._layout.columns = keys('columns').map(dimItem)
      this._layout.measures = keys('measures').map(key => ({
        key,
        id: (measures[key] && measures[key].id) || key,
        name: (measures[key] && (measures[key].label || measures[key].description || measures[key].id)) || key
      }))
      if (!this._allDimensions.length) {
        this._allDimensions = Object.keys(dims).map(dimItem)
      }
    }

    _list (kind) {
      return this._layout[kind] || []
    }

    _same (a, b) {
      const ids = [a && a.id, a && a.key, a && a.name].filter(Boolean).map(v => String(v).toLowerCase())
      const other = [b, b && b.id, b && b.key, b && b.name].filter(Boolean).map(v => String(v).toLowerCase())
      return ids.some(id => other.indexOf(id) !== -1)
    }

    _removeFromLists (item) {
      ;['rows', 'columns', 'measures'].forEach(kind => {
        this._layout[kind] = this._list(kind).filter(existing => !this._same(existing, item))
      })
    }

    _cloneItem (item) {
      return {
        id: item.id || item.key || item.name,
        key: item.key || item.id || item.name,
        name: item.name || item.label || item.id || item.key
      }
    }

    _itemId (item) {
      return item && (item.id || item.key || item.name) || ''
    }

    _dimOption (item) {
      if (!this._layout.dimOptions) {
        this._layout.dimOptions = {}
      }
      const id = this._itemId(item)
      if (!this._layout.dimOptions[id]) {
        this._layout.dimOptions[id] = defaultDimOption()
      }
      return this._layout.dimOptions[id]
    }

    _displayName (item) {
      const option = this._dimOption(item)
      return option.rename || item.name || item.id || item.key
    }

    _activeFilters () {
      const filters = this._layout.filters || {}
      return Object.keys(filters).map(key => filters[key]).filter(entry => entry && entry.members && entry.members.length)
    }

    _filterFor (item) {
      const filters = this._layout.filters || {}
      const keys = [item.id, item.key, item.name]
      for (let i = 0; i < keys.length; i++) {
        if (keys[i] && filters[keys[i]] && filters[keys[i]].members && filters[keys[i]].members.length) {
          return filters[keys[i]]
        }
      }
      return null
    }

    _emit (op, extra) {
      this._layout.active = true
      const payload = Object.assign({
        op,
        t: Date.now(),
        layout: this._layout
      }, extra || {})
      this.dispatchEvent(new CustomEvent('propertiesChanged', {
        detail: {
          properties: {
            builderLayoutJson: JSON.stringify(this._layout),
            builderCommand: JSON.stringify(payload)
          }
        }
      }))
      if (op !== 'loadMembers' && op !== 'loadHierarchies') {
        this._render()
      }
    }

    _addItem (kind, item) {
      const clone = this._cloneItem(item)
      this._removeFromLists(clone)
      this._layout[kind].push(clone)
      const feed = kind === 'rows' ? 'dimensions' : kind
      this._emit(kind === 'measures' ? 'addMeasure' : 'addDimension', {
        feed,
        id: clone.id,
        key: clone.key,
        name: clone.name
      })
    }

    _removeItem (kind, item) {
      this._layout[kind] = this._list(kind).filter(existing => !this._same(existing, item))
      const feed = kind === 'rows' ? 'dimensions' : kind
      this._emit('remove', {
        feed,
        id: item.id,
        key: item.key,
        name: item.name
      })
    }

    _clearMeasures () {
      const removed = this._layout.measures.slice()
      this._layout.measures = []
      this._emit('clearMeasures', {
        feed: 'measures',
        ids: removed.map(item => item.id || item.key)
      })
    }

    _setFilter (item, members) {
      const id = this._itemId(item)
      if (!this._layout.filters) {
        this._layout.filters = {}
      }
      if (!members.length) {
        delete this._layout.filters[id]
        if (item.key) {
          delete this._layout.filters[item.key]
        }
      } else {
        this._layout.filters[id] = {
          id,
          name: item.name || id,
          kind: item.kind || (id === 'measures' ? 'measures' : 'dimension'),
          members
        }
      }
      this._emit('setFilter', {
        feed: 'filters',
        id,
        dimId: id,
        members: members.map(entry => entry.id),
        name: item.name || id
      })
    }

    _removeFilter (entry) {
      this._setFilter({ id: entry.id, key: entry.id, name: entry.name, kind: entry.kind }, [])
    }

    _moveItem (fromKind, fromIndex, toKind, toIndex) {
      const from = this._list(fromKind)
      const item = from[fromIndex]
      if (!item) {
        return
      }
      const measureMismatch = (fromKind === 'measures') !== (toKind === 'measures')
      if (fromKind !== toKind && measureMismatch) {
        return
      }
      const target = this._list(toKind)[toIndex]
      from.splice(fromIndex, 1)
      const dest = this._list(toKind)
      let idx = dest.length
      if (target) {
        const found = dest.findIndex(entry => this._same(entry, target))
        if (found !== -1) {
          idx = found
        }
      }
      dest.splice(idx, 0, item)
      this._emit('reorder', {
        feed: toKind === 'rows' ? 'dimensions' : toKind,
        id: item.id,
        key: item.key,
        name: item.name
      })
    }

    _usedDimensionIds () {
      return this._list('rows').concat(this._list('columns')).map(item => item.id || item.name || item.key)
    }

    _availableDimensions () {
      const used = this._usedDimensionIds().map(id => String(id).toLowerCase())
      const list = this._allDimensions.filter(item => {
        const id = String(item.id || '').toLowerCase()
        const name = String(item.name || '').toLowerCase()
        const key = String(item.key || '').toLowerCase()
        return used.indexOf(id) === -1 && used.indexOf(name) === -1 && used.indexOf(key) === -1
      })
      return list.length ? list : this._allDimensions
    }

    _closePicker () {
      this._shadowRoot.getElementById('popover').classList.remove('open')
      this._shadowRoot.getElementById('pop-back').classList.remove('open')
      this._pickerKind = 'dimension'
    }

    _closeCtx () {
      this._shadowRoot.getElementById('ctx-menu').classList.remove('open')
      this._shadowRoot.getElementById('ctx-sub').classList.remove('open')
    }

    _openModelPicker (kind, feedId) {
      this._pickerKind = kind
      this._pickerFeed = feedId
      this._shadowRoot.getElementById('pop-search').value = ''
      this._shadowRoot.getElementById('search-wrap').style.display = ''
      this._fillPicker()
      this._shadowRoot.getElementById('pop-back').classList.add('open')
      this._shadowRoot.getElementById('popover').classList.add('open')
      this._shadowRoot.getElementById('pop-search').focus()
    }

    _openFilterPicker (item) {
      this._filterItem = this._cloneItem(item)
      this._filterItem.kind = item.kind || (this._itemId(item) === 'measures' ? 'measures' : 'dimension')
      this._filterMembers = this._filterItem.kind === 'measures' ? this._allMeasures.slice() : []
      this._pickerKind = 'filter'
      this._pickerFeed = this._itemId(this._filterItem)
      this._shadowRoot.getElementById('pop-search').value = ''
      this._shadowRoot.getElementById('search-wrap').style.display = ''
      this._shadowRoot.getElementById('pop-back').classList.add('open')
      this._shadowRoot.getElementById('popover').classList.add('open')
      this._fillPicker()
      if (this._filterItem.kind !== 'measures') {
        this._emit('loadMembers', { id: this._itemId(this._filterItem), dimId: this._itemId(this._filterItem), feed: 'filters' })
      }
    }

    _openAddFilter () {
      this._openModelPicker('filter-source', 'filters')
    }

    _fillPicker () {
      const q = (this._shadowRoot.getElementById('pop-search').value || '').toLowerCase()
      const body = this._shadowRoot.getElementById('pop-body')
      if (this._pickerKind === 'filter-source') {
        const dims = this._allDimensions.filter(item => {
          const name = (item.name || item.id || '').toLowerCase()
          return !q || name.indexOf(q) !== -1
        })
        body.innerHTML =
          '<div class="group-h">▼ Dimensions</div>' +
          (dims.length ? dims.map(item => '<div class="row-item filter-source" data-id="' + this._esc(item.id) + '">' + clover + '<span>' + this._esc(item.name) + '</span></div>').join('') : '<div class="empty">No dimensions found.</div>') +
          '<div class="group-h">▼ Measures</div>' +
          '<div class="row-item filter-source" data-id="measures" data-kind="measures">' + ruler + '<span>Measures</span></div>'
        body.querySelectorAll('.filter-source').forEach(row => {
          row.addEventListener('click', () => {
            const id = row.getAttribute('data-id')
            if (id === 'measures') {
              this._openFilterPicker({ id: 'measures', key: 'measures', name: 'Measures', kind: 'measures' })
              return
            }
            const item = this._allDimensions.find(entry => String(entry.id) === id || String(entry.key) === id) || { id, key: id, name: id }
            this._openFilterPicker(item)
          })
        })
        return
      }
      if (this._pickerKind === 'filter') {
        const current = this._filterFor(this._filterItem) || { members: [] }
        const selected = current.members.map(item => String(item.id).toLowerCase())
        const source = this._filterItem && this._filterItem.kind === 'measures' ? this._allMeasures : this._filterMembers
        const filtered = source.filter(item => {
          const name = (item.name || item.id || '').toLowerCase()
          return !q || name.indexOf(q) !== -1
        })
        body.innerHTML =
          '<div class="group-h">Filter: ' + this._esc((this._filterItem && this._filterItem.name) || this._pickerFeed) + '</div>' +
          (filtered.length
            ? filtered.map(item => {
              const id = item.id || item.key
              const checked = selected.indexOf(String(id).toLowerCase()) !== -1 ? ' checked' : ''
              return '<label class="row-item"><input type="checkbox" data-member="' + this._esc(id) + '" data-name="' + this._esc(item.name || id) + '"' + checked + ' /><span>' + this._esc(item.name || id) + '</span></label>'
            }).join('')
            : '<div class="empty">Loading members… If this stays empty, the model has not returned members yet.</div>') +
          '<div class="apply-row"><button class="secondary" id="filter-clear">Clear</button><button id="filter-apply">Apply Filter</button></div>'
        const apply = this._shadowRoot.getElementById('filter-apply')
        if (apply) {
          apply.addEventListener('click', () => {
            const members = Array.from(body.querySelectorAll('input[data-member]:checked')).map(box => ({
              id: box.getAttribute('data-member'),
              name: box.getAttribute('data-name')
            }))
            this._setFilter(this._filterItem, members)
            this._closePicker()
          })
        }
        const clear = this._shadowRoot.getElementById('filter-clear')
        if (clear) {
          clear.addEventListener('click', () => {
            this._setFilter(this._filterItem, [])
            this._closePicker()
          })
        }
        return
      }
      if (this._pickerKind === 'rename') {
        const option = this._dimOption(this._ctxItem)
        body.innerHTML =
          '<div class="group-h">Rename</div>' +
          '<input class="rename-input" id="rename-input" value="' + this._esc(option.rename || (this._ctxItem && this._ctxItem.name) || '') + '" />' +
          '<div class="apply-row"><button id="rename-apply">OK</button></div>'
        const input = this._shadowRoot.getElementById('rename-input')
        const apply = this._shadowRoot.getElementById('rename-apply')
        if (apply) {
          apply.addEventListener('click', () => {
            option.rename = (input.value || '').trim()
            this._emit('setDimOptions', { id: this._itemId(this._ctxItem), dimId: this._itemId(this._ctxItem), option })
            this._closePicker()
          })
        }
        return
      }
      const used = this._pickerKind === 'measure'
        ? this._list('measures').map(item => (item.id || item.name || item.key || '').toLowerCase())
        : this._usedDimensionIds().map(id => String(id).toLowerCase())
      const source = this._pickerKind === 'measure' ? this._allMeasures : this._availableDimensions()
      const filtered = source.filter(item => {
        const name = (item.name || item.id || item.key || '').toLowerCase()
        return !q || name.indexOf(q) !== -1
      })
      if (this._pickerKind === 'measure') {
        body.innerHTML =
          '<div class="group-h">▼ Measures</div>' +
          (filtered.length ? filtered.map(item => this._pickerRow(item, used, 'measure')).join('') : '<div class="empty">No measures found. Assign a model, then try again.</div>')
      } else {
        body.innerHTML =
          '<div class="group-h">▼ Dimensions</div>' +
          (filtered.length ? filtered.map(item => this._pickerRow(item, used, 'dimension')).join('') : '<div class="empty">No dimensions found. Assign a model, then try again.</div>')
      }
      body.querySelectorAll('input[data-id]').forEach(box => {
        box.addEventListener('change', () => {
          if (!box.checked) {
            return
          }
          const id = box.getAttribute('data-id')
          const sourceList = this._pickerKind === 'measure' ? this._allMeasures : this._allDimensions
          const item = sourceList.find(entry => String(entry.id) === id || String(entry.key) === id) || { id, key: id, name: id }
          const kind = this._pickerFeed === 'columns' ? 'columns' : (this._pickerKind === 'measure' ? 'measures' : 'rows')
          this._addItem(kind, item)
          this._closePicker()
        })
      })
    }

    _pickerRow (item, used, kind) {
      const id = item.id || item.key
      const name = item.name || id
      const checked = used.indexOf(String(id).toLowerCase()) !== -1 || used.indexOf(String(name).toLowerCase()) !== -1 ? ' checked' : ''
      const icon = kind === 'measure' ? ruler : clover
      return '<label class="row-item"><input type="checkbox" data-id="' + this._esc(id) + '"' + checked + ' />' + icon + '<span>' + this._esc(name) + '</span></label>'
    }

    _openCtx (event, item, kind) {
      event.preventDefault()
      event.stopPropagation()
      this._ctxItem = item
      this._ctxKind = kind
      const option = this._dimOption(item)
      const menu = this._shadowRoot.getElementById('ctx-menu')
      menu.innerHTML =
        this._ctxRow('hierarchy', tree, 'Hierarchy', true) +
        this._ctxRow('display', gear, 'Display Options', true) +
        this._ctxRow('rename', pencil, 'Rename', false) +
        this._ctxRow('unbooked', '', 'Show Unbooked Data', false, option.unbooked) +
        this._ctxRow('totals', '', 'Show Totals', false, option.totals) +
        this._ctxRow('visibility', eye, 'Data Visibility...', true) +
        this._ctxRow('properties', tag, 'Properties', false)
      const rect = event.currentTarget.getBoundingClientRect()
      const root = this._shadowRoot.getElementById('root').getBoundingClientRect()
      menu.style.top = Math.max(8, rect.bottom - root.top + 4) + 'px'
      menu.style.left = Math.max(8, rect.left - root.left - 40) + 'px'
      menu.classList.add('open')
      this._shadowRoot.getElementById('pop-back').classList.add('open')
      this._shadowRoot.getElementById('ctx-sub').classList.remove('open')
      menu.querySelectorAll('.ctx-item').forEach(btn => {
        btn.addEventListener('click', ev => {
          ev.stopPropagation()
          this._onCtx(btn.getAttribute('data-act'), btn)
        })
      })
    }

    _ctxRow (act, icon, label, hasSub, on) {
      return '<button class="ctx-item' + (on ? ' on' : '') + '" data-act="' + act + '">' +
        (icon || '<span class="ic"></span>') +
        '<span class="grow">' + label + (on ? ' ✓' : '') + '</span>' +
        (hasSub ? '<span class="arrow">›</span>' : '') +
        '</button>'
    }

    _placeSub (fromBtn) {
      const sub = this._shadowRoot.getElementById('ctx-sub')
      const menu = this._shadowRoot.getElementById('ctx-menu')
      const root = this._shadowRoot.getElementById('root').getBoundingClientRect()
      const btn = fromBtn.getBoundingClientRect()
      sub.style.top = (btn.top - root.top) + 'px'
      sub.style.left = (menu.getBoundingClientRect().right - root.left - 4) + 'px'
      sub.classList.add('open')
    }

    _onCtx (act, btn) {
      const item = this._ctxItem
      const option = this._dimOption(item)
      if (act === 'unbooked') {
        option.unbooked = !option.unbooked
        this._emit('setDimOptions', { id: this._itemId(item), dimId: this._itemId(item), option })
        this._closeCtx()
        this._shadowRoot.getElementById('pop-back').classList.remove('open')
        return
      }
      if (act === 'totals') {
        option.totals = !option.totals
        this._emit('setDimOptions', { id: this._itemId(item), dimId: this._itemId(item), option })
        this._closeCtx()
        this._shadowRoot.getElementById('pop-back').classList.remove('open')
        return
      }
      if (act === 'rename') {
        this._closeCtx()
        this._pickerKind = 'rename'
        this._shadowRoot.getElementById('search-wrap').style.display = 'none'
        this._fillPicker()
        this._shadowRoot.getElementById('popover').classList.add('open')
        return
      }
      if (act === 'properties') {
        this._showSub(btn, ['No additional properties for this dimension.'].map(text => ({ id: '', name: text })), 'properties')
        return
      }
      if (act === 'display') {
        this._showSub(btn, [
          { id: 'Description', name: 'Description' },
          { id: 'ID', name: 'ID' },
          { id: 'ID and Description', name: 'ID and Description' }
        ], 'display')
        return
      }
      if (act === 'visibility') {
        this._showSub(btn, [
          { id: 'All Data', name: 'All Data' },
          { id: 'Hide Parent Nodes', name: 'Hide Parent Nodes' },
          { id: 'Show Booked Data Only', name: 'Show Booked Data Only' }
        ], 'visibility')
        return
      }
      if (act === 'hierarchy') {
        this._hierarchies = [{ id: '', name: 'Flat presentation' }]
        this._showHierarchySub(btn)
        this._emit('loadHierarchies', { id: this._itemId(item), dimId: this._itemId(item) })
      }
    }

    _showHierarchySub (btn) {
      const from = btn || this._shadowRoot.querySelector('[data-act="hierarchy"]')
      if (from) {
        this._showSub(from, this._hierarchies.length ? this._hierarchies : [{ id: '', name: 'Flat presentation' }], 'hierarchy')
      }
    }

    _showSub (fromBtn, items, kind) {
      const sub = this._shadowRoot.getElementById('ctx-sub')
      const option = this._dimOption(this._ctxItem)
      const current = kind === 'hierarchy' ? (option.hierarchy || '') : option[kind]
      sub.innerHTML = items.map(item => {
        const on = String(item.id) === String(current) ? ' on' : ''
        return '<button class="ctx-item' + on + '" data-id="' + this._esc(item.id) + '"><span class="grow">' + this._esc(item.name) + (on ? ' ✓' : '') + '</span></button>'
      }).join('')
      this._placeSub(fromBtn)
      sub.querySelectorAll('.ctx-item').forEach(row => {
        row.addEventListener('click', ev => {
          ev.stopPropagation()
          if (kind === 'properties') {
            return
          }
          const id = row.getAttribute('data-id')
          option[kind] = id
          const extra = { id: this._itemId(this._ctxItem), dimId: this._itemId(this._ctxItem), option }
          if (kind === 'hierarchy') {
            extra.hierarchyId = id
            this._emit('setHierarchy', extra)
          } else {
            this._emit('setDimOptions', extra)
          }
          this._closeCtx()
          this._shadowRoot.getElementById('pop-back').classList.remove('open')
        })
      })
    }

    _chip (item, kind, icon) {
      const more = kind === 'measures' ? '' :
        `<button class="menu dim-menu" title="More">···</button>` +
        `<button class="tool filter-dim" data-kind="${kind}" title="Filter">${funnel}</button>`
      return `<div class="chip" draggable="true" data-kind="${kind}" data-id="${this._esc(item.id || item.key)}">
        <span class="grip" title="Drag to reorder"></span>${icon}<span class="label">${this._esc(this._displayName(item))}</span>
        ${more}
        <button class="x" data-kind="${kind}" title="Remove">×</button>
      </div>`
    }

    _bindDrag (root) {
      root.querySelectorAll('.chip[draggable]').forEach(chip => {
        chip.addEventListener('dragstart', event => {
          this._drag = {
            kind: chip.getAttribute('data-kind'),
            id: chip.getAttribute('data-id')
          }
          chip.classList.add('dragging')
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', this._drag.id)
        })
        chip.addEventListener('dragend', () => {
          chip.classList.remove('dragging')
          this._shadowRoot.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'))
        })
        chip.addEventListener('dragover', event => {
          event.preventDefault()
          chip.classList.add('drag-over')
        })
        chip.addEventListener('dragleave', () => chip.classList.remove('drag-over'))
        chip.addEventListener('drop', event => {
          event.preventDefault()
          event.stopPropagation()
          chip.classList.remove('drag-over')
          if (!this._drag) {
            return
          }
          const toKind = chip.getAttribute('data-kind')
          const fromList = this._list(this._drag.kind)
          const fromIndex = fromList.findIndex(item => String(item.id || item.key) === this._drag.id)
          const toList = this._list(toKind)
          const toIndex = toList.findIndex(item => String(item.id || item.key) === chip.getAttribute('data-id'))
          if (fromIndex === -1 || toIndex === -1) {
            return
          }
          this._moveItem(this._drag.kind, fromIndex, toKind, toIndex)
          this._drag = null
        })
      })
      root.querySelectorAll('.zone').forEach(zone => {
        zone.addEventListener('dragover', event => {
          event.preventDefault()
          zone.classList.add('drag-over')
        })
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'))
        zone.addEventListener('drop', event => {
          event.preventDefault()
          zone.classList.remove('drag-over')
          if (!this._drag) {
            return
          }
          const target = event.target.closest('.chip')
          if (target) {
            return
          }
          const toKind = zone.getAttribute('data-zone')
          const fromList = this._list(this._drag.kind)
          const fromIndex = fromList.findIndex(item => String(item.id || item.key) === this._drag.id)
          if (fromIndex === -1) {
            return
          }
          this._moveItem(this._drag.kind, fromIndex, toKind, this._list(toKind).length)
          this._drag = null
        })
      })
    }

    _render () {
      const rows = this._shadowRoot.getElementById('rows-body')
      const rowChips = this._list('rows').map(item => this._chip(item, 'rows', clover)).join('')
      rows.innerHTML = (rowChips || '<div class="hint">No row dimensions. Add only what you need.</div>') +
        '<button class="link" id="add-row-dim">' + plus + ' Add Dimension</button>'

      const col = this._shadowRoot.getElementById('columns-body')
      const measureChips = this._list('measures').map(item => this._chip(item, 'measures', ruler)).join('')
      const columnChips = this._list('columns').map(item => this._chip(item, 'columns', clover)).join('')
      col.innerHTML =
        '<div class="measures-box zone" data-zone="measures">' +
          '<div class="measures-h">' + ruler + '<span class="label">Measures</span>' +
          '<button class="tool" id="filter-measures" title="Filter">' + funnel + '</button>' +
          '<button class="x" id="remove-measures" title="Remove all measures">×</button></div>' +
          (measureChips || '<div class="hint">No measures. Nothing is kept by default.</div>') +
          '<button class="link" id="add-measure">' + plus + ' Add Measure</button>' +
        '</div>' +
        columnChips +
        '<button class="link" id="add-col-dim">' + plus + ' Add Dimension</button>'

      const filters = this._shadowRoot.getElementById('filters-body')
      const active = this._activeFilters()
      filters.innerHTML = (active.length
        ? active.map(entry => {
          const names = entry.members.map(item => item.name || item.id).join(', ')
          return `<div class="filter-card" data-id="${this._esc(entry.id)}">
            ${cube}
            <div class="filter-text"><div class="filter-title">${this._esc(entry.name)}</div><div class="filter-sub">${this._esc(names)}</div></div>
            <button class="x remove-filter" title="Remove filter">×</button>
          </div>`
        }).join('')
        : '<div class="hint">No filters yet. Use the funnel on a dimension, or + Add Filter, then pick members.</div>') +
        '<button class="link" id="add-filter">' + plus + ' Add Filter</button>'

      const on = (id, fn) => {
        const el = this._shadowRoot.getElementById(id)
        if (el) {
          el.addEventListener('click', event => {
            event.preventDefault()
            fn()
          })
        }
      }
      on('add-row-dim', () => this._openModelPicker('dimension', 'dimensions'))
      on('add-col-dim', () => this._openModelPicker('dimension', 'columns'))
      on('add-measure', () => this._openModelPicker('measure', 'measures'))
      on('add-filter', () => this._openAddFilter())
      on('filter-measures', () => this._openFilterPicker({ id: 'measures', key: 'measures', name: 'Measures', kind: 'measures' }))
      on('remove-measures', () => this._clearMeasures())
      this._shadowRoot.querySelectorAll('.x[data-kind]').forEach(btn => {
        btn.addEventListener('click', event => {
          event.preventDefault()
          event.stopPropagation()
          const kind = btn.getAttribute('data-kind')
          const chip = btn.closest('.chip')
          const id = chip && chip.getAttribute('data-id')
          const item = this._list(kind).find(entry => String(entry.id || entry.key) === id)
          if (item) {
            this._removeItem(kind, item)
          }
        })
      })
      this._shadowRoot.querySelectorAll('.filter-dim').forEach(btn => {
        btn.addEventListener('click', event => {
          event.preventDefault()
          event.stopPropagation()
          const chip = btn.closest('.chip')
          const id = chip && chip.getAttribute('data-id')
          const item = this._list('rows').concat(this._list('columns')).find(entry => String(entry.id || entry.key) === id) || { id, key: id, name: id }
          this._openFilterPicker(item)
        })
      })
      this._shadowRoot.querySelectorAll('.dim-menu').forEach(btn => {
        btn.addEventListener('click', event => {
          const chip = btn.closest('.chip')
          const id = chip && chip.getAttribute('data-id')
          const kind = chip && chip.getAttribute('data-kind')
          const item = this._list(kind).find(entry => String(entry.id || entry.key) === id)
          if (item) {
            this._openCtx(event, item, kind)
          }
        })
      })
      this._shadowRoot.querySelectorAll('.filter-card').forEach(card => {
        card.addEventListener('click', event => {
          if (event.target.closest('.remove-filter')) {
            return
          }
          const id = card.getAttribute('data-id')
          const entry = (this._layout.filters || {})[id]
          this._openFilterPicker(entry || { id, key: id, name: id })
        })
      })
      this._shadowRoot.querySelectorAll('.remove-filter').forEach(btn => {
        btn.addEventListener('click', event => {
          event.preventDefault()
          event.stopPropagation()
          const id = btn.closest('.filter-card').getAttribute('data-id')
          const entry = (this._layout.filters || {})[id]
          if (entry) {
            this._removeFilter(entry)
          }
        })
      })
      this._bindDrag(this._shadowRoot)
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
