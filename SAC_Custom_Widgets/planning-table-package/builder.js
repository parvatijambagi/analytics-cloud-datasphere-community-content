(function () {
  const TIMEFRAME_TYPES = ['Forecast', 'Rolling Forecast', 'Calendar']
  const GRANULARITIES = ['Day', 'Week', 'Month', 'Quarter', 'Year']
  const RANGES = ['Month', 'Quarter', 'Year']
  const SUM_FOR = ['None', 'Cut-Over Period', 'Cut-Over Quarter', 'Cut-Over Year']
  const UNIT = ['Day', 'Week', 'Month', 'Quarter', 'Year']

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
      }
      .section-h .icon {
        width: 18px;
        height: 18px;
        margin-right: 8px;
        fill: #0854a0;
      }
      .label {
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
      .type-row select { flex: 1; }
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
      .extra-version {
        margin-bottom: 6px;
        display: flex;
        gap: 6px;
      }
      .extra-version select { flex: 1; }
      .extra-version button {
        border: 0;
        background: none;
        color: #0854a0;
        cursor: pointer;
      }
      .ds {
        font-weight: 700;
        padding: 4px 0 8px;
      }
      .hidden { display: none; }
      .hint { color: #6a6d70; font-size: 11px; margin: 0 0 8px; }
    </style>
    <div id="root">
      <div class="section">
        <div class="label">Data Source</div>
        <div class="ds" id="data-source-name">Not bound</div>
        <p class="hint">Assign the model, Rows, Columns, and Measures in the data-binding wells. Table Type below switches this same table between Cross-Tab and Forecast Layout.</p>
      </div>
      <div class="section">
        <div class="label">Table Type</div>
        <div class="type-row">
          <select id="tableType">
            <option value="Cross-Tab">Cross-Tab</option>
            <option value="Forecast">Forecast Layout</option>
          </select>
          <button class="swap" id="swap-axes" title="Swap axes">⇅</button>
        </div>
      </div>
      <div id="forecast-panel" class="hidden">
        <div class="section">
          <div class="section-h">
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
      this._bound = this._bindUi()
    }

    _bindUi () {
      const byId = id => this._shadowRoot.getElementById(id)
      byId('tableType').addEventListener('change', () => {
        this._toggleForecast()
        this._emit({ tableType: byId('tableType').value })
      })
      byId('swap-axes').addEventListener('click', () => {
        const next = !(this.swapAxes === true || this.swapAxes === 'true')
        this._emit({ swapAxes: next })
      })
      const step = (id, delta) => {
        const input = byId(id)
        const value = Math.max(0, (Number(input.value) || 0) + delta)
        input.value = String(value)
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
      this._loadCatalog()
      if (changedProps) {
        this._loadFromProps()
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
        return { id, name: id }
      }
      const id = String(raw.id || raw.key || raw.dimensionId || raw.name || '').trim()
      if (!id) {
        return null
      }
      return { id, name: String(raw.description || raw.label || raw.name || id) }
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

      this._versions = []
      this._dates = [{ id: 'Today', name: this._todayLabel() }, { id: 'Current Period', name: 'Current Period' }]
      if (versionDim) {
        data.forEach(row => {
          this._merge(this._versions, [row[versionDim.key] || row[versionDim.id]])
        })
      }
      if (dateDim) {
        data.forEach(row => {
          this._merge(this._dates, [row[dateDim.key] || row[dateDim.id]])
        })
      }

      try {
        const ds = binding && binding.getDataSource && binding.getDataSource()
        const takeMembers = (dim, target) => {
          if (!ds || !dim || !ds.getMembers) {
            return
          }
          const result = ds.getMembers(dim.id || dim.key)
          const apply = list => this._merge(target, this._toArray(list))
          if (result && typeof result.then === 'function') {
            result.then(list => {
              apply(list)
              this._loadFromProps()
            }).catch(() => {})
          } else {
            apply(result)
          }
        }
        takeMembers(versionDim, this._versions)
        takeMembers(dateDim, this._dates)
        if (ds && ds.getDimensions) {
          const dimsResult = ds.getDimensions()
          const inspect = list => {
            this._toArray(list).forEach(item => {
              const name = String(item.description || item.label || item.id || '')
              if (/version/i.test(name)) {
                takeMembers(item, this._versions)
              }
              if (/date|time|month|period|year/i.test(name)) {
                takeMembers(item, this._dates)
              }
            })
          }
          if (dimsResult && typeof dimsResult.then === 'function') {
            dimsResult.then(inspect).catch(() => {})
          } else {
            inspect(dimsResult)
          }
        }
      } catch (ignore) {}
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
      const tableType = this.tableType === 'Forecast' ? 'Forecast' : 'Cross-Tab'
      this._shadowRoot.getElementById('tableType').value = tableType
      this._fillMemberSelect(this._shadowRoot.getElementById('lookBackOn'), this._versions, this.lookBackOn || 'Actual')
      this._fillMemberSelect(this._shadowRoot.getElementById('lookAheadOn'), this._versions, this.lookAheadOn)
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
  }

  if (!customElements.get('com-sap-sac-sample-planning-table-builder-v13')) {
    customElements.define('com-sap-sac-sample-planning-table-builder-v13', Builder)
  }
})()
