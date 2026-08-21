(function () {
  const TIMEFRAME_TYPES = ['Forecast', 'Rolling Forecast', 'Calendar']
  const GRANULARITIES = ['Day', 'Week', 'Month', 'Quarter', 'Year']
  const RANGES = ['Month', 'Quarter', 'Year']
  const SUM_FOR = ['None', 'Cut-Over Period', 'Cut-Over Quarter', 'Cut-Over Year']
  const UNIT = ['Day', 'Week', 'Month', 'Quarter', 'Year']

  const clover = '<svg class="ic" viewBox="0 0 16 16"><path d="M8 1.5c1.4 0 2.5 1.3 2.5 2.8 0 .4-.1.8-.2 1.1 1 .3 1.8 1.2 1.8 2.3 0 1.4-1.1 2.6-2.5 2.6-.4 0-.8-.1-1.1-.3.3 1 .3 2.1-.5 3.2-.4.6-1.1.8-1.6.3-.4-.4-.3-1 .1-1.5.5-.7.7-1.5.6-2.3-.4.2-.8.3-1.3.3C5.4 10.3 4 9.1 4 7.7c0-1.1.8-2 1.8-2.3-.1-.3-.2-.7-.2-1.1C5.6 2.8 6.7 1.5 8 1.5z"/></svg>'
  const ruler = '<svg class="ic" viewBox="0 0 16 16"><path d="M1.5 6.5h13v3h-13v-3zm1.5.8v1.4h1V7.3H3zm2.2 0v1.4h.8V7.3h-.8zm2.2 0v1.4h1V7.3H7.4zm2.3 0v1.4h.8V7.3h-.8zm2.2 0v1.4h1V7.3H11.9z"/></svg>'
  const calendar = '<svg class="ic" viewBox="0 0 16 16"><path d="M4 2h1.2v1.2H4V2zm6.8 0H12v1.2h-1.2V2zM2.5 3.5h11v11h-11v-11zm1.2 1.2v8.6h8.6V4.7H3.7zM5 7h1.5v1.5H5V7zm2.8 0H9.2v1.5H7.8V7zm2.7 0H12v1.5h-1.5V7zM5 9.8h1.5V11H5V9.8zm2.8 0H9.2V11H7.8V9.8z"/></svg>'
  const plus = '<svg class="ic" viewBox="0 0 16 16" style="fill:#0854a0"><path d="M7.2 3h1.6v10H7.2V3zM3 7.2h10v1.6H3V7.2z"/></svg>'

  const template = document.createElement('template')
  template.innerHTML = `
    <style>
      #root {
        font-family: "72", "72full", Arial, Helvetica, sans-serif;
        font-size: 13px;
        color: #32363a;
        background: #f7f7f7;
        padding: 0 0 12px;
      }
      .section {
        padding: 8px 10px 4px;
      }
      .section + .section {
        border-top: 1px solid #e5e5e5;
      }
      .section-h {
        display: flex;
        align-items: center;
        font-weight: 700;
        padding: 6px 0;
        cursor: pointer;
        user-select: none;
      }
      .section-h .icon, .forecast-head .icon {
        width: 18px;
        height: 18px;
        margin-right: 8px;
        fill: #0854a0;
      }
      .chevron {
        width: 18px;
        color: #6a6d70;
        font-size: 10px;
      }
      .label, .sub-label {
        display: block;
        margin: 8px 0 4px;
        color: #6a6d70;
        font-size: 11px;
      }
      .type-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      select, input[type="text"] {
        width: 100%;
        height: 28px;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        font: inherit;
        background: #fff;
        box-sizing: border-box;
      }
      .type-dd {
        position: relative;
        flex: 1;
      }
      .type-btn, .type-opt {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        height: 32px;
        border: 1px solid #d9d9d9;
        background: #fff;
        font: inherit;
        text-align: left;
        cursor: pointer;
        padding: 0 8px;
        box-sizing: border-box;
      }
      .type-btn { border-radius: 4px; }
      .type-caret { margin-left: auto; color: #6a6d70; }
      .type-menu {
        position: absolute;
        left: 0;
        right: 0;
        top: 34px;
        background: #fff;
        border: 1px solid #d9d9d9;
        box-shadow: 0 4px 12px rgba(0,0,0,.12);
        z-index: 5;
      }
      .type-opt { border: 0; height: 36px; }
      .type-opt:hover, .type-opt.active { background: #e8f2fe; outline: 1px dotted #0854a0; outline-offset: -2px; }
      .type-ic { width: 16px; height: 16px; fill: #6a6d70; flex: 0 0 16px; }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
      }
      .forecast-head {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        padding: 4px 0 8px;
      }
      button.swap, button.step {
        border: 1px solid #d9d9d9;
        background: #fff;
        border-radius: 4px;
        height: 28px;
        min-width: 28px;
        cursor: pointer;
        color: #0854a0;
      }
      .stepper {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .stepper input {
        width: 48px;
        text-align: center;
        flex: 0 0 48px;
      }
      .stepper select { flex: 1; }
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
        padding: 8px 0;
      }
      .footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 12px 10px 4px;
      }
      .apply {
        background: #0854a0;
        color: #fff;
        border: 0;
        border-radius: 4px;
        padding: 6px 16px;
        font: inherit;
        cursor: pointer;
      }
      .cancel {
        border: 0;
        background: none;
        color: #32363a;
        font: inherit;
        cursor: pointer;
      }
      .extra-version, .chip {
        margin-bottom: 6px;
        display: flex;
        gap: 6px;
      }
      .extra-version select { flex: 1; }
      .chip {
        align-items: center;
        background: #fff;
        border: 1px solid #d9d9d9;
        border-radius: 8px;
        padding: 8px 10px;
      }
      .grip {
        width: 10px;
        height: 16px;
        background-image: radial-gradient(#9ca0a3 1.1px, transparent 1.2px);
        background-size: 5px 5px;
        opacity: .85;
        cursor: grab;
        flex: 0 0 10px;
      }
      .chip .name { flex: 1; overflow: hidden; text-overflow: ellipsis; }
      .x {
        border: 0;
        background: none;
        color: #6a6d70;
        cursor: pointer;
        font-size: 16px;
      }
      svg.ic {
        width: 16px;
        height: 16px;
        flex: 0 0 16px;
        fill: #6a6d70;
      }
      .ds { font-weight: 700; padding: 4px 0 8px; }
      .hidden { display: none; }
      .hint { color: #6a6d70; font-size: 11px; margin: 0 0 8px; }
      .body { padding: 0 0 8px; }
    </style>
    <div id="root">
      <div class="section">
        <div class="label">Data Source</div>
        <div class="ds" id="data-source-name">Not bound</div>
      </div>
      <div class="section">
        <div class="label">Table Type</div>
        <div class="type-row">
          <div class="type-dd">
            <button type="button" class="type-btn" id="tableTypeBtn" aria-haspopup="listbox">
              <svg class="type-ic" id="tableTypeIcon" viewBox="0 0 16 16"><path d="M2 2h12v12H2V2zm1.2 1.2v2.4h9.6V3.2H3.2zm0 3.6v2.4h9.6V6.8H3.2zm0 3.6V12h9.6v-1.6H3.2z"/></svg>
              <span id="tableTypeLabel">Cross-Tab</span>
              <span class="type-caret">▾</span>
            </button>
            <div class="type-menu hidden" id="tableTypeMenu">
              <button type="button" class="type-opt active" data-value="Cross-Tab">
                <svg class="type-ic" viewBox="0 0 16 16"><path d="M2 2h12v12H2V2zm1.2 1.2v2.4h9.6V3.2H3.2zm0 3.6v2.4h9.6V6.8H3.2zm0 3.6V12h9.6v-1.6H3.2z"/></svg>
                Cross-Tab
              </button>
              <button type="button" class="type-opt" data-value="Forecast">
                <svg class="type-ic" viewBox="0 0 16 16"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm.75 3v2.7l1.9 1.9-.75.75L7.5 8.2V4.5h1.25z"/></svg>
                Forecast Layout
              </button>
            </div>
            <select id="tableType" class="sr-only">
              <option value="Cross-Tab">Cross-Tab</option>
              <option value="Forecast">Forecast Layout</option>
            </select>
          </div>
          <button class="swap" id="swap-axes" title="Swap axes">⇅</button>
        </div>
      </div>
      <div id="forecast-panel" class="hidden">
        <div class="section">
          <div class="forecast-head">
            <svg class="icon" viewBox="0 0 16 16"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm.75 3v2.7l1.9 1.9-.75.75L7.5 8.2V4.5h1.25z"/></svg>
            Forecast Layout
          </div>
        </div>
        <div class="section">
          <div class="section-h">Layout</div>
          <label class="label" for="lookBackOn">Look Back On</label>
          <select id="lookBackOn"></select>
          <label class="label" for="lookAheadOn">Look Ahead On</label>
          <select id="lookAheadOn"></select>
          <label class="label" for="cutOverDate">Cut-Over Date</label>
          <select id="cutOverDate"></select>
        </div>
        <div class="section">
          <div class="section-h">Timeframe</div>
          <label class="label" for="timeframeType">Type</label>
          <select id="timeframeType"></select>
          <label class="label" for="timeframeGranularity">Granularity</label>
          <select id="timeframeGranularity"></select>
          <label class="label" for="timeframeRange">Range</label>
          <select id="timeframeRange"></select>
          <label class="label">Look Back Additional</label>
          <div class="stepper">
            <button class="step" id="lookBackMinus" type="button">−</button>
            <input id="lookBackAdditional" type="text" value="0" />
            <button class="step" id="lookBackPlus" type="button">+</button>
            <select id="lookBackAdditionalUnit"></select>
          </div>
          <label class="label">Look Ahead Additional</label>
          <div class="stepper">
            <button class="step" id="lookAheadMinus" type="button">−</button>
            <input id="lookAheadAdditional" type="text" value="0" />
            <button class="step" id="lookAheadPlus" type="button">+</button>
            <select id="lookAheadAdditionalUnit"></select>
          </div>
        </div>
        <div class="section">
          <div class="section-h">Calculation</div>
          <label class="label" for="sumFor">Sum For:</label>
          <select id="sumFor"></select>
          <div class="section-h">Additional Versions</div>
          <div id="extra-versions"></div>
          <button class="link" id="add-version" type="button">+ Add Version</button>
        </div>
        <div class="footer">
          <button class="apply" id="apply" type="button">Apply</button>
          <button class="cancel" id="cancel" type="button">Cancel</button>
        </div>
      </div>
      <div class="section">
        <div class="section-h" data-toggle="measures-body"><span class="chevron">▼</span> Measures</div>
        <div class="body" id="measures-body"></div>
      </div>
      <div class="section">
        <div class="section-h" data-toggle="dims-body"><span class="chevron">▼</span> Dimensions</div>
        <div class="body" id="dims-body">
          <div class="sub-label">Rows</div>
          <div id="rows-body"></div>
          <div class="sub-label">Columns</div>
          <div id="columns-body"></div>
        </div>
      </div>
      <div class="section">
        <div class="section-h" data-toggle="filters-body"><span class="chevron">▼</span> Filters</div>
        <div class="body" id="filters-body"></div>
      </div>
    </div>
  `

  const fillStatic = (select, values, current) => {
    select.innerHTML = ''
    values.forEach(value => {
      const opt = document.createElement('option')
      opt.value = value
      opt.textContent = value
      if (String(current) === value) {
        opt.selected = true
      }
      select.appendChild(opt)
    })
  }

  class Builder extends HTMLElement {
    constructor () {
      super()
      this._shadowRoot = this.attachShadow({ mode: 'open' })
      this._shadowRoot.appendChild(template.content.cloneNode(true))
      this._versions = []
      this._dates = []
      this._draftExtra = []
      this._rows = []
      this._columns = []
      this._measures = []
      this._filters = []
      this._allDimensions = []
      this._allMeasures = []
      this._suppressLive = false
      this._bound = this._bindUi()
    }

    _bindUi () {
      const byId = id => this._shadowRoot.getElementById(id)
      this._shadowRoot.querySelectorAll('[data-toggle]').forEach(el => {
        el.addEventListener('click', () => {
          const body = this._shadowRoot.getElementById(el.getAttribute('data-toggle'))
          if (!body) {
            return
          }
          const hidden = body.style.display === 'none'
          body.style.display = hidden ? '' : 'none'
          el.querySelector('.chevron').textContent = hidden ? '▼' : '▶'
        })
      })
      byId('tableTypeBtn').addEventListener('click', event => {
        event.stopPropagation()
        this._shadowRoot.getElementById('tableTypeMenu').classList.toggle('hidden')
      })
      this._shadowRoot.getElementById('tableTypeMenu').querySelectorAll('.type-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          this._setTableType(btn.getAttribute('data-value'))
          this._shadowRoot.getElementById('tableTypeMenu').classList.add('hidden')
          this._toggleForecast()
          this._apply()
        })
      })
      this._shadowRoot.addEventListener('click', () => {
        this._shadowRoot.getElementById('tableTypeMenu').classList.add('hidden')
      })
      ;['lookBackOn', 'lookAheadOn', 'cutOverDate', 'timeframeType', 'timeframeGranularity', 'timeframeRange', 'lookBackAdditionalUnit', 'lookAheadAdditionalUnit', 'sumFor'].forEach(id => {
        byId(id).addEventListener('change', () => {
          if (!this._suppressLive && byId('tableType').value === 'Forecast') {
            this._apply()
          }
        })
      })
      byId('swap-axes').addEventListener('click', () => {
        const next = !(this.swapAxes === true || this.swapAxes === 'true')
        this._send('swapAxes', '', '')
        this._emit({ swapAxes: next })
      })
      const step = (id, delta) => {
        const input = byId(id)
        const value = Math.max(0, (Number(input.value) || 0) + delta)
        input.value = String(value)
        if (!this._suppressLive && byId('tableType').value === 'Forecast') {
          this._apply()
        }
      }
      byId('lookBackMinus').addEventListener('click', () => step('lookBackAdditional', -1))
      byId('lookBackPlus').addEventListener('click', () => step('lookBackAdditional', 1))
      byId('lookAheadMinus').addEventListener('click', () => step('lookAheadAdditional', -1))
      byId('lookAheadPlus').addEventListener('click', () => step('lookAheadAdditional', 1))
      byId('add-version').addEventListener('click', () => {
        this._draftExtra.push(this._versions[0] ? this._versions[0].id : '')
        this._renderExtra()
      })
      byId('apply').addEventListener('click', () => this._apply())
      byId('cancel').addEventListener('click', () => this._loadFromProps())
      return true
    }

    onCustomWidgetAfterUpdate (changedProps) {
      this._syncFromBinding((changedProps && changedProps.dataBinding) || this.dataBinding)
      this._merge(this._allDimensions, this._parseJson(this.availableDimensionsJson))
      this._merge(this._allMeasures, this._parseJson(this.availableMeasuresJson))
      this._filters = this._parseJson(this.filtersJson).map(item => this._item(item)).filter(Boolean)
      this._loadCatalog()
      if (changedProps) {
        this._loadFromProps()
      }
      this._renderFeeds()
    }

    _setTableType (value) {
      const type = value === 'Forecast' ? 'Forecast' : 'Cross-Tab'
      this._shadowRoot.getElementById('tableType').value = type
      this._shadowRoot.getElementById('tableTypeLabel').textContent = type === 'Forecast' ? 'Forecast Layout' : 'Cross-Tab'
      this._shadowRoot.getElementById('tableTypeMenu').querySelectorAll('.type-opt').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-value') === type)
      })
      const icon = this._shadowRoot.getElementById('tableTypeIcon')
      if (type === 'Forecast') {
        icon.innerHTML = '<path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm.75 3v2.7l1.9 1.9-.75.75L7.5 8.2V4.5h1.25z"/>'
      } else {
        icon.innerHTML = '<path d="M2 2h12v12H2V2zm1.2 1.2v2.4h9.6V3.2H3.2zm0 3.6v2.4h9.6V6.8H3.2zm0 3.6V12h9.6v-1.6H3.2z"/>'
      }
    }

    _toggleForecast () {
      const panel = this._shadowRoot.getElementById('forecast-panel')
      const isForecast = this._shadowRoot.getElementById('tableType').value === 'Forecast'
      panel.classList.toggle('hidden', !isForecast)
    }

    _parseExtra (text) {
      try {
        const parsed = JSON.parse(text || '[]')
        return Array.isArray(parsed) ? parsed.map(String) : []
      } catch (ignore) {
        return []
      }
    }

    _parseJson (text) {
      try {
        const parsed = JSON.parse(text || '[]')
        return Array.isArray(parsed) ? parsed : []
      } catch (ignore) {
        return []
      }
    }

    _todayLabel () {
      const now = new Date()
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return 'Today (' + months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear() + ')'
    }

    _item (raw) {
      if (raw == null) {
        return null
      }
      if (typeof raw === 'string' || typeof raw === 'number') {
        const id = String(raw)
        return { id, key: id, name: id }
      }
      const id = String(raw.id || raw.key || raw.dimensionId || raw.name || '').trim()
      if (!id) {
        return null
      }
      return { id, key: String(raw.key || id), name: String(raw.description || raw.label || raw.name || id) }
    }

    _merge (target, list) {
      const seen = new Set(target.map(item => item.id))
      ;(list || []).forEach(raw => {
        const item = this._item(raw)
        if (item && !seen.has(item.id)) {
          seen.add(item.id)
          target.push(item)
        }
      })
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

    _binding () {
      try {
        if (this.dataBindings && this.dataBindings.getDataBinding) {
          return this.dataBindings.getDataBinding('dataBinding')
        }
      } catch (ignore) {}
      return this.dataBinding || null
    }

    _feedKeys (feeds, name) {
      const feed = feeds && feeds[name]
      if (!feed) {
        return []
      }
      if (Array.isArray(feed)) {
        return feed
      }
      return (feed.values || feed.ids || []).slice()
    }

    _syncFromBinding (binding) {
      const metadata = binding && binding.metadata
      if (!metadata) {
        return
      }
      const dims = metadata.dimensions || {}
      const measures = metadata.mainStructureMembers || metadata.measures || metadata.accounts || {}
      const feeds = metadata.feeds || {}
      const dimItem = key => this._item({
        key,
        id: (dims[key] && dims[key].id) || key,
        name: (dims[key] && (dims[key].description || dims[key].label || dims[key].id)) || key
      })
      const colKeys = this._feedKeys(feeds, 'dimensions2').concat(this._feedKeys(feeds, 'columns'))
      const rowKeys = this._feedKeys(feeds, 'dimensions').concat(this._feedKeys(feeds, 'rows')).filter(key => colKeys.indexOf(key) === -1)
      this._rows = rowKeys.map(dimItem).filter(Boolean)
      this._columns = colKeys.map(dimItem).filter(Boolean)
      this._measures = this._feedKeys(feeds, 'measures').map(key => this._item({
        key,
        id: (measures[key] && measures[key].id) || key,
        name: (measures[key] && (measures[key].label || measures[key].description || measures[key].id)) || key
      })).filter(Boolean)
      this._merge(this._allDimensions, Object.keys(dims).map(dimItem))
      this._merge(this._allMeasures, Object.keys(measures).map(key => this._item({
        key,
        id: (measures[key] && measures[key].id) || key,
        name: (measures[key] && (measures[key].label || measures[key].description || measures[key].id)) || key
      })))
    }

    _loadCatalog () {
      const binding = this._binding()
      const metadata = (binding && binding.metadata) || (this.dataBinding && this.dataBinding.metadata) || {}
      const dims = metadata.dimensions || {}
      const data = (binding && binding.data) || []
      const dsName = metadata.modelId || metadata.modelName || metadata.dataSourceName ||
        (binding && binding.dataSourceName) || 'PAR_FC'
      this._shadowRoot.getElementById('data-source-name').textContent = String(dsName)

      const versionDim = Object.keys(dims).map(key => Object.assign({ key }, dims[key])).find(dim => /version/i.test(String(dim.description || dim.label || dim.id || dim.key)))
      const dateDim = Object.keys(dims).map(key => Object.assign({ key }, dims[key])).find(dim => /date|time|month|period|year|calmonth|fiscal/i.test(String(dim.description || dim.label || dim.id || dim.key)))

      this._versions = [
        { id: 'Actual', name: 'Actual' },
        { id: 'EPMplusA', name: 'EPMplusA' },
        { id: 'Budget', name: 'Budget' },
        { id: 'Forecast', name: 'Forecast' }
      ]
      this._dates = [{ id: 'Today', name: this._todayLabel() }, { id: 'Current Period', name: 'Current Period' }]
      if (versionDim) {
        data.forEach(row => this._merge(this._versions, [row[versionDim.key] || row[versionDim.id]]))
      }
      if (dateDim) {
        data.forEach(row => this._merge(this._dates, [row[dateDim.key] || row[dateDim.id]]))
      }

      try {
        const ds = binding && binding.getDataSource && binding.getDataSource()
        const take = (target, result) => {
          if (result && typeof result.then === 'function') {
            result.then(resolved => {
              this._merge(target, this._toArray(resolved))
              this._loadFromProps()
              this._renderFeeds()
            }).catch(() => {})
          } else {
            this._merge(target, this._toArray(result))
          }
        }
        const takeMembers = (dim, target) => {
          if (!ds || !dim || !ds.getMembers) {
            return
          }
          take(target, ds.getMembers(dim.id || dim.key))
        }
        if (ds) {
          if (ds.getDimensions) take(this._allDimensions, ds.getDimensions())
          if (ds.getMeasures) take(this._allMeasures, ds.getMeasures())
          if (ds.getMainStructureMembers) take(this._allMeasures, ds.getMainStructureMembers())
        }
        takeMembers(versionDim, this._versions)
        takeMembers(dateDim, this._dates)
      } catch (ignore) {}
    }

    _usedIds (list) {
      return list.map(item => item.id)
    }

    _available (all, used) {
      const usedIds = this._usedIds(used)
      return all.filter(item => usedIds.indexOf(item.id) === -1)
    }

    _iconFor (item, kind) {
      if (kind === 'measure') {
        return ruler
      }
      const name = String((item && item.name) || '')
      if (/date|time|month|period|year/i.test(name)) {
        return calendar
      }
      return clover
    }

    _chip (item, feed, kind) {
      return '<div class="chip"><span class="grip"></span>' + this._iconFor(item, kind) +
        '<span class="name">' + this._esc(item.name) + '</span>' +
        '<button class="x" data-feed="' + feed + '" data-id="' + this._esc(item.id || item.key) + '" title="Remove">×</button></div>'
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

    _renderFeeds () {
      const usedDims = this._rows.concat(this._columns)
      const dimChoices = this._available(this._allDimensions, usedDims)
      const measureChoices = this._available(this._allMeasures, this._measures)

      const measures = this._shadowRoot.getElementById('measures-body')
      measures.innerHTML = this._measures.map(item => this._chip(item, 'measures', 'measure')).join('') +
        '<button class="link" id="add-measure" type="button">' + plus + ' Add Measures</button>' +
        '<select id="select-measure"></select>'

      const rows = this._shadowRoot.getElementById('rows-body')
      rows.innerHTML = this._rows.map(item => this._chip(item, 'dimensions', 'dimension')).join('') +
        '<button class="link" id="add-row" type="button">' + plus + ' Add Dimensions</button>' +
        '<select id="select-row"></select>'

      const cols = this._shadowRoot.getElementById('columns-body')
      cols.innerHTML = this._columns.map(item => this._chip(item, 'dimensions2', 'dimension')).join('') +
        '<button class="link" id="add-col" type="button">' + plus + ' Add Dimensions</button>' +
        '<select id="select-col"></select>'

      const filters = this._shadowRoot.getElementById('filters-body')
      filters.innerHTML = this._filters.map(item => this._chip(item, 'filter', 'dimension')).join('') +
        '<button class="link" id="add-filter" type="button">' + plus + ' Add Filter</button>' +
        '<select id="select-filter"></select>'

      this._fillSelect(this._shadowRoot.getElementById('select-measure'), measureChoices, 'Select measure')
      this._fillSelect(this._shadowRoot.getElementById('select-row'), dimChoices, 'Select dimension')
      this._fillSelect(this._shadowRoot.getElementById('select-col'), dimChoices, 'Select dimension')
      this._fillSelect(this._shadowRoot.getElementById('select-filter'), this._allDimensions, 'Select dimension')

      const bindSelect = (id, kind, feed) => {
        const select = this._shadowRoot.getElementById(id)
        select.addEventListener('change', () => {
          const value = select.value
          select.value = ''
          if (!value) {
            return
          }
          if (kind === 'filter') {
            const item = this._allDimensions.find(entry => entry.id === value) || { id: value, name: value }
            if (this._filters.every(entry => entry.id !== item.id)) {
              this._filters.push(item)
              this._emit({ filtersJson: JSON.stringify(this._filters) })
              this._send('setFilter', value, '')
              this._renderFeeds()
            }
            return
          }
          this._send(kind === 'measure' ? 'addMeasure' : 'addDimension', feed, value)
        })
      }
      const focus = id => {
        const el = this._shadowRoot.getElementById(id)
        if (el) {
          el.focus()
        }
      }
      this._shadowRoot.getElementById('add-measure').addEventListener('click', () => focus('select-measure'))
      this._shadowRoot.getElementById('add-row').addEventListener('click', () => focus('select-row'))
      this._shadowRoot.getElementById('add-col').addEventListener('click', () => focus('select-col'))
      this._shadowRoot.getElementById('add-filter').addEventListener('click', () => focus('select-filter'))
      bindSelect('select-measure', 'measure', 'measures')
      bindSelect('select-row', 'dimension', 'dimensions')
      bindSelect('select-col', 'dimension', 'dimensions2')
      bindSelect('select-filter', 'filter', 'filter')
      this._shadowRoot.querySelectorAll('.x[data-feed]').forEach(btn => {
        btn.addEventListener('click', event => {
          event.preventDefault()
          const feed = btn.getAttribute('data-feed')
          const id = btn.getAttribute('data-id')
          if (feed === 'filter') {
            this._filters = this._filters.filter(item => item.id !== id)
            this._emit({ filtersJson: JSON.stringify(this._filters) })
            this._send('removeFilter', id, id)
            this._renderFeeds()
            return
          }
          this._send('remove', feed, id)
        })
      })
    }

    _send (op, feed, id) {
      this._emit({
        builderCommand: JSON.stringify({ op, feed, id: id || '', t: Date.now() })
      })
    }

    _fillMemberSelect (select, items, current, placeholder) {
      select.innerHTML = ''
      if (placeholder) {
        const first = document.createElement('option')
        first.value = ''
        first.textContent = placeholder
        select.appendChild(first)
      }
      const seen = new Set()
      items.forEach(item => {
        if (!item || seen.has(item.id)) {
          return
        }
        seen.add(item.id)
        const opt = document.createElement('option')
        opt.value = item.id
        opt.textContent = item.name || item.id
        if (String(current) === String(item.id) || String(current) === String(item.name)) {
          opt.selected = true
        }
        select.appendChild(opt)
      })
      if (current && !seen.has(String(current))) {
        const opt = document.createElement('option')
        opt.value = current
        opt.textContent = current
        opt.selected = true
        select.appendChild(opt)
      }
    }

    _renderExtra () {
      const host = this._shadowRoot.getElementById('extra-versions')
      host.innerHTML = ''
      this._draftExtra.forEach((value, index) => {
        const wrap = document.createElement('div')
        wrap.className = 'extra-version'
        const select = document.createElement('select')
        this._fillMemberSelect(select, this._versions, value, 'Select version')
        select.addEventListener('change', () => {
          this._draftExtra[index] = select.value
          if (!this._suppressLive && this._val('tableType') === 'Forecast') {
            this._apply()
          }
        })
        const remove = document.createElement('button')
        remove.type = 'button'
        remove.textContent = '×'
        remove.addEventListener('click', () => {
          this._draftExtra.splice(index, 1)
          this._renderExtra()
        })
        wrap.appendChild(select)
        wrap.appendChild(remove)
        host.appendChild(wrap)
      })
    }

    _val (id) {
      const el = this._shadowRoot.getElementById(id)
      return el ? el.value : ''
    }

    _set (id, value) {
      const el = this._shadowRoot.getElementById(id)
      if (el && value != null) {
        el.value = String(value)
      }
    }

    _loadFromProps () {
      this._suppressLive = true
      const tableType = this.tableType === 'Forecast' ? 'Forecast' : 'Cross-Tab'
      this._setTableType(tableType)
      this._fillMemberSelect(this._shadowRoot.getElementById('lookBackOn'), this._versions, this.lookBackOn || 'Actual')
      this._fillMemberSelect(this._shadowRoot.getElementById('lookAheadOn'), this._versions, this.lookAheadOn || 'EPMplusA')
      this._fillMemberSelect(this._shadowRoot.getElementById('cutOverDate'), this._dates, this.cutOverDate || 'Today')
      fillStatic(this._shadowRoot.getElementById('timeframeType'), TIMEFRAME_TYPES, this.timeframeType || 'Forecast')
      fillStatic(this._shadowRoot.getElementById('timeframeGranularity'), GRANULARITIES, this.timeframeGranularity || 'Quarter')
      fillStatic(this._shadowRoot.getElementById('timeframeRange'), RANGES, this.timeframeRange || 'Year')
      fillStatic(this._shadowRoot.getElementById('lookBackAdditionalUnit'), UNIT, this.lookBackAdditionalUnit || 'Year')
      fillStatic(this._shadowRoot.getElementById('lookAheadAdditionalUnit'), UNIT, this.lookAheadAdditionalUnit || 'Year')
      fillStatic(this._shadowRoot.getElementById('sumFor'), SUM_FOR, this.sumFor || 'Cut-Over Year')
      this._set('lookBackAdditional', this.lookBackAdditional == null ? 0 : this.lookBackAdditional)
      this._set('lookAheadAdditional', this.lookAheadAdditional == null ? 0 : this.lookAheadAdditional)
      this._draftExtra = this._parseExtra(this.additionalVersionsJson)
      this._renderExtra()
      this._toggleForecast()
      this._suppressLive = false
    }

    _emit (properties) {
      this.dispatchEvent(new CustomEvent('propertiesChanged', { detail: { properties } }))
    }

    _apply () {
      this._emit({
        tableType: this._val('tableType'),
        lookBackOn: this._val('lookBackOn'),
        lookAheadOn: this._val('lookAheadOn'),
        cutOverDate: this._val('cutOverDate'),
        timeframeType: this._val('timeframeType'),
        timeframeGranularity: this._val('timeframeGranularity'),
        timeframeRange: this._val('timeframeRange'),
        lookBackAdditional: Number(this._val('lookBackAdditional') || 0),
        lookBackAdditionalUnit: this._val('lookBackAdditionalUnit'),
        lookAheadAdditional: Number(this._val('lookAheadAdditional') || 0),
        lookAheadAdditionalUnit: this._val('lookAheadAdditionalUnit'),
        sumFor: this._val('sumFor'),
        additionalVersionsJson: JSON.stringify(this._draftExtra.filter(Boolean))
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

  if (!customElements.get('com-sap-sac-sample-planning-table-builder-v13')) {
    customElements.define('com-sap-sac-sample-planning-table-builder-v13', Builder)
  }
})()
