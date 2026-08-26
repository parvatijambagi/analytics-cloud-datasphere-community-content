(function () {
  const DEFAULT_RULES = [
    { name: 'Editable IHBs', target: 'editable', background: '', color: '' },
    { name: 'Read-only Accounts IHB', target: 'readonly-account', background: '', color: '' },
    { name: 'Read-only IHB', target: 'readonly', background: '', color: '' },
    { name: 'ReadOnlyInternalAccounts', target: 'readonly-account', background: '', color: '' },
    { name: 'Editable', target: 'editable', background: '', color: '' },
    { name: 'Read-only', target: 'readonly', background: '', color: '' }
  ]

  const template = document.createElement('template')
  template.innerHTML = `
    <style>
      #root {
        font-family: "72", "72full", Arial, Helvetica, sans-serif;
        font-size: 12px;
        color: #1d2d3e;
        padding: 0 0 16px;
        position: relative;
      }
      h3 {
        margin: 16px 0 8px;
        font-size: 13px;
        font-weight: 600;
      }
      h3:first-child { margin-top: 0; }
      .hint {
        color: #556b82;
        font-size: 11px;
        margin: 0 0 8px;
      }
      label {
        display: block;
        margin-top: 8px;
        margin-bottom: 2px;
        color: #556b82;
        font-size: 11px;
      }
      input[type="text"], input[type="number"], select {
        width: 100%;
        height: 24px;
        box-sizing: border-box;
        font: inherit;
      }
      .row {
        display: flex;
        gap: 8px;
      }
      .row > div { flex: 1; }
      .checks label {
        margin-top: 8px;
        color: #1d2d3e;
      }
      .rule {
        border: 1px solid #d9d9d9;
        padding: 6px;
        margin-bottom: 6px;
        background: #fff;
      }
      .rule-head {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .rule-head input.name { flex: 1; }
      .rule button {
        margin: 0;
        padding: 2px 6px;
        font: inherit;
      }
      button.apply {
        display: block;
        margin-top: 16px;
        font: inherit;
        padding: 4px 12px;
      }
      button.apply.applied {
        background: #107e3e;
        border-color: #0b5c2d;
        color: #fff;
      }
      .tabs {
        display: flex;
        border-bottom: 1px solid #d9d9d9;
        margin: 0 0 12px;
      }
      .tab {
        flex: 1;
        height: 32px;
        border: 0;
        border-bottom: 2px solid transparent;
        background: none;
        font: inherit;
        font-weight: 700;
        color: #6a6d70;
        cursor: pointer;
      }
      .tab.active {
        color: #0854a0;
        border-bottom-color: #0854a0;
      }
      .hidden { display: none; }
      .type-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .type-row select { flex: 1; }
      button.swap, button.step {
        border: 1px solid #d9d9d9;
        background: #fff;
        height: 24px;
        min-width: 28px;
        cursor: pointer;
      }
      .stepper { display: flex; align-items: center; gap: 6px; }
      .stepper input { width: 48px; text-align: center; flex: 0 0 48px; }
      .stepper select { flex: 1; }
      .footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 12px; }
      .cancel { border: 0; background: none; font: inherit; cursor: pointer; }
      button.link {
        display: block;
        margin-top: 6px;
        border: 0;
        background: none;
        padding: 0;
        color: #0854a0;
        font: inherit;
        cursor: pointer;
        text-align: left;
      }
      .forecast-head {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        margin: 12px 0 8px;
      }
      .forecast-head svg { width: 16px; height: 16px; fill: #0854a0; }
      .tf-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .extra-head, .extra-row {
        display: grid;
        grid-template-columns: 1fr 1fr 24px;
        gap: 8px;
        align-items: center;
      }
      .extra-head {
        color: #6a6d70;
        font-size: 11px;
        margin-top: 8px;
      }
      .extra-row select { width: 100%; }
      .x {
        border: 0;
        background: none;
        color: #0854a0;
        cursor: pointer;
        font-size: 16px;
      }
      .menu-sep {
        border-top: 1px solid #d9d9d9;
        margin-top: 4px;
        padding-top: 4px;
        color: #0854a0;
      }
    </style>
    <div id="root">
      <div class="tabs">
        <button type="button" class="tab active" data-tab="table-type">Table Type</button>
        <button type="button" class="tab" data-tab="styling">Styling</button>
      </div>
      <div id="pane-table-type">
        <h3>Table Type</h3>
        <div class="type-row">
          <select id="tableType">
            <option value="Cross-Tab">Cross-Tab</option>
            <option value="Forecast">Forecast Layout</option>
          </select>
          <button type="button" class="swap" id="swap-axes" title="Swap axes">⇅</button>
        </div>
        <div id="forecast-panel" class="hidden">
          <div class="forecast-head">
            <svg viewBox="0 0 16 16"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm.75 3v2.7l1.9 1.9-.75.75L7.5 8.2V4.5h1.25z"/></svg>
            Forecast Layout
          </div>
          <h3>Layout</h3>
          <label for="lookBackOn">Look Back On:</label>
          <select id="lookBackOn"></select>
          <label for="lookAheadOn">Look Ahead On:</label>
          <select id="lookAheadOn"></select>
          <label for="cutOverMode">Cut-Over Date:</label>
          <select id="cutOverMode">
            <option value="Today">Today</option>
            <option value="SpecificDate">Specific Date...</option>
            <option value="LastBooked">Last Booked (Actuals)</option>
          </select>
          <div id="specific-date-wrap" class="hidden">
            <label for="specificDate">Date dimension</label>
            <select id="specificDate"></select>
          </div>
          <button type="button" class="link" id="new-input-control">New Calculation Input Control...</button>
          <p class="hint" id="cutover-hint"></p>
          <h3 class="tf-head">Timeframe</h3>
          <label for="timeframeType">Type:</label>
          <select id="timeframeType">
            <option>Forecast</option>
            <option>Rolling Forecast</option>
            <option>Calendar</option>
          </select>
          <label for="timeframeGranularity">Granularity:</label>
          <select id="timeframeGranularity">
            <option>Day</option>
            <option>Week</option>
            <option selected>Month</option>
            <option>Quarter</option>
            <option>Year</option>
          </select>
          <label for="timeframeRange">Range:</label>
          <select id="timeframeRange">
            <option>Month</option>
            <option>Quarter</option>
            <option selected>Year</option>
          </select>
          <label>Look Back Additional:</label>
          <div class="stepper">
            <button type="button" class="step" id="lookBackMinus">−</button>
            <input id="lookBackAdditional" type="text" value="0" />
            <button type="button" class="step" id="lookBackPlus">+</button>
            <select id="lookBackAdditionalUnit">
              <option>Day</option><option>Week</option><option>Month</option><option>Quarter</option><option selected>Year</option>
            </select>
          </div>
          <label>Look Ahead Additional:</label>
          <div class="stepper">
            <button type="button" class="step" id="lookAheadMinus">−</button>
            <input id="lookAheadAdditional" type="text" value="0" />
            <button type="button" class="step" id="lookAheadPlus">+</button>
            <select id="lookAheadAdditionalUnit">
              <option>Day</option><option>Week</option><option>Month</option><option>Quarter</option><option selected>Year</option>
            </select>
          </div>
          <h3>Calculation</h3>
          <label for="sumFor">Sum For:</label>
          <select id="sumFor">
            <option selected>Cut-Over Year</option>
            <option>All</option>
            <option>Look Ahead</option>
            <option>None</option>
          </select>
          <h3>Additional Versions</h3>
          <div class="extra-head"><span>Version</span><span>Delta Based On</span><span></span></div>
          <div id="extra-versions"></div>
          <button type="button" class="link" id="add-version">+ Add Version</button>
          <div class="footer">
            <button type="button" class="apply" id="apply-forecast">Apply</button>
            <button type="button" class="cancel" id="cancel-forecast">Cancel</button>
          </div>
        </div>
      </div>
      <div id="pane-styling" class="hidden">
      <h3>Styling Rules</h3>
      <p class="hint">Styling rule which is listed at the top overrules the ones listed below.</p>
      <div id="rules"></div>
      <button id="add-rule" type="button">+ Add Rule</button>

      <h3>Lines</h3>
      <div class="row">
        <div>
          <label for="lineType">Line</label>
          <select id="lineType">
            <option value="Simple Line">Simple Line</option>
            <option value="None">None</option>
          </select>
        </div>
        <div>
          <label for="lineWidth">Weight</label>
          <select id="lineWidth">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>
      </div>
      <div class="row">
        <div>
          <label for="lineColor">Color</label>
          <input id="lineColor" type="text" placeholder="#d9d9d9" />
        </div>
        <div>
          <label for="lineStyle">Style</label>
          <select id="lineStyle">
            <option value="Solid">Solid</option>
            <option value="Dashed">Dashed</option>
            <option value="Dotted">Dotted</option>
          </select>
        </div>
      </div>
      <div class="row">
        <div>
          <label for="leftPadding">Left Padding</label>
          <input id="leftPadding" type="number" min="0" max="32" />
        </div>
        <div>
          <label for="rightPadding">Right Padding</label>
          <input id="rightPadding" type="number" min="0" max="32" />
        </div>
      </div>

      <h3>Font</h3>
      <div class="row">
        <div>
          <label for="fontFamily">Font</label>
          <select id="fontFamily">
            <option value="Arial">Arial</option>
            <option value="72">72</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
          </select>
        </div>
        <div>
          <label for="fontSize">Size</label>
          <input id="fontSize" type="number" min="8" max="24" />
        </div>
      </div>
      <div class="row">
        <div>
          <label for="fontColor">Color</label>
          <input id="fontColor" type="text" placeholder="#32363A" />
        </div>
        <div>
          <label for="fontStyle">Font Style</label>
          <select id="fontStyle">
            <option value="Default">Default</option>
            <option value="Bold">Bold</option>
            <option value="Italic">Italic</option>
          </select>
        </div>
      </div>
      <div class="checks">
        <label><input id="underline" type="checkbox" /> Underline</label>
        <label><input id="strikethrough" type="checkbox" /> Strikethrough</label>
      </div>
      <div class="row">
        <div>
          <label for="hAlign">Horizontal</label>
          <select id="hAlign">
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div>
          <label for="vAlign">Vertical</label>
          <select id="vAlign">
            <option value="top">Top</option>
            <option value="middle">Middle</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>
      </div>

      <h3>Number Format</h3>
      <label for="numberMeasureSelection">Measure Selection</label>
      <select id="numberMeasureSelection">
        <option value="All">All</option>
      </select>
      <label for="numberScale">Scale</label>
      <select id="numberScale">
        <option value="Default">Default</option>
        <option value="Thousand">Thousand</option>
        <option value="Million">Million</option>
        <option value="Billion">Billion</option>
        <option value="Percent">Percent</option>
      </select>
      <label for="numberScaleFormat">Scale Format</label>
      <select id="numberScaleFormat">
        <option value="Default">Default</option>
        <option value="Suffix">k / M / Bn suffix</option>
      </select>
      <div class="row">
        <div>
          <label for="numberDecimalPlaces">Decimal Places</label>
          <select id="numberDecimalPlaces">
            <option value="Default">Default</option>
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>
        <div>
          <label for="showSignAs">Show Sign As</label>
          <select id="showSignAs">
            <option value="Default">Default</option>
            <option value="Minus">-123</option>
            <option value="Parentheses">(123)</option>
            <option value="PlusMinus">+123</option>
          </select>
        </div>
      </div>

      <h3>Table</h3>
      <label for="columnDimension">Column dimensions</label>
      <select id="columnDimension">
        <option value="Auto">Auto (Date, GL-Accounts, Version)</option>
        <option value="Checked">Use checked dimensions below</option>
        <option value="None">None (all dimensions on rows)</option>
      </select>
      <p class="hint">A dimension cannot be on Rows and Columns at once. Remove it from Rows, then add it in Columns. If the Columns picker still does not keep the checkbox, tick the dimension below and click Apply.</p>
      <div id="column-dim-list" class="checks"></div>
      <label for="headerBackground">Header background</label>
      <input id="headerBackground" type="text" placeholder="#0854A0" />
      <label for="headerTextColor">Header text color</label>
      <input id="headerTextColor" type="text" placeholder="#FFFFFF" />
      <label for="changedCellColor">Changed cell color</label>
      <input id="changedCellColor" type="text" placeholder="#FFF3B8" />
      <div class="checks">
        <label><input id="showTotals" type="checkbox" /> Show totals row</label>
        <label><input id="showToolbar" type="checkbox" /> Show Submit / Revert toolbar</label>
        <label><input id="readOnly" type="checkbox" /> Read only</label>
      </div>

      <button class="apply" id="apply">Apply</button>
      </div>
    </div>
  `

  class Styling extends HTMLElement {
    constructor () {
      super()
      this._shadowRoot = this.attachShadow({ mode: 'open' })
      this._shadowRoot.appendChild(template.content.cloneNode(true))
      this._rules = DEFAULT_RULES.map(rule => Object.assign({}, rule))
      this._shadowRoot.getElementById('add-rule').addEventListener('click', () => {
        this._rules.push({ name: 'New rule', target: 'editable', background: '', color: '' })
        this._renderRules()
      })
      this._shadowRoot.getElementById('apply').addEventListener('click', () => this._apply())
      this._shadowRoot.getElementById('apply-forecast').addEventListener('click', () => {
        this._forecastDirty = false
        this._applyTableType()
        const applyBtn = this._shadowRoot.getElementById('apply-forecast')
        applyBtn.classList.add('applied')
        clearTimeout(this._applyHighlightTimer)
        this._applyHighlightTimer = setTimeout(() => {
          applyBtn.classList.remove('applied')
        }, 2000)
      })
      this._shadowRoot.getElementById('cancel-forecast').addEventListener('click', () => {
        this._forecastDirty = false
        this._loadTableType()
      })
      this._draftExtra = []
      this._forecastDirty = false
      this._uiTableType = null
      this._versions = [{ id: 'Actual', name: 'Actual' }, { id: 'EPMplusA', name: 'EPMplusA' }, { id: 'Budget', name: 'Budget' }, { id: 'Forecast', name: 'Forecast' }]
      this._dates = [{ id: 'Today', name: 'Today' }, { id: 'Current Period', name: 'Current Period' }]
      this._shadowRoot.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
          this._shadowRoot.querySelectorAll('.tab').forEach(item => item.classList.toggle('active', item === tab))
          const name = tab.getAttribute('data-tab')
          this._shadowRoot.getElementById('pane-table-type').classList.toggle('hidden', name !== 'table-type')
          this._shadowRoot.getElementById('pane-styling').classList.toggle('hidden', name !== 'styling')
        })
      })
      const byId = id => this._shadowRoot.getElementById(id)
      const clearApplyHighlight = () => {
        const applyBtn = this._shadowRoot.getElementById('apply-forecast')
        if (applyBtn) {
          applyBtn.classList.remove('applied')
        }
        clearTimeout(this._applyHighlightTimer)
      }
      byId('tableType').addEventListener('change', () => {
        const type = this._val('tableType')
        this._uiTableType = type
        this.tableType = type
        this.dispatchEvent(new CustomEvent('propertiesChanged', {
          detail: { properties: { tableType: type } }
        }))
        if (type === 'Cross-Tab') {
          this._forecastDirty = false
          this._applyTableType()
        } else {
          this._forecastDirty = true
          clearApplyHighlight()
        }
        this._toggleForecast()
      })
      byId('swap-axes').addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('propertiesChanged', {
          detail: { properties: { swapAxes: !(this.swapAxes === true || this.swapAxes === 'true') } }
        }))
      })
      ;['lookBackOn', 'lookAheadOn', 'cutOverMode', 'specificDate', 'timeframeType', 'timeframeGranularity', 'timeframeRange', 'lookBackAdditionalUnit', 'lookAheadAdditionalUnit', 'sumFor'].forEach(id => {
        byId(id).addEventListener('change', () => {
          if (id === 'cutOverMode') {
            this._syncCutOverUi()
          }
          this._forecastDirty = true
          clearApplyHighlight()
        })
      })
      const step = (id, delta) => {
        const input = byId(id)
        input.value = String(Math.max(0, (Number(input.value) || 0) + delta))
        this._forecastDirty = true
        clearApplyHighlight()
      }
      byId('lookBackMinus').addEventListener('click', () => step('lookBackAdditional', -1))
      byId('lookBackPlus').addEventListener('click', () => step('lookBackAdditional', 1))
      byId('lookAheadMinus').addEventListener('click', () => step('lookAheadAdditional', -1))
      byId('lookAheadPlus').addEventListener('click', () => step('lookAheadAdditional', 1))
      byId('add-version').addEventListener('click', () => {
        this._draftExtra.push({
          version: this._versions[0] ? this._versions[0].id : '',
          deltaBasedOn: 'Forecast Layout'
        })
        this._renderExtra()
        this._forecastDirty = true
      })
      byId('new-input-control').addEventListener('click', () => {
        this._shadowRoot.getElementById('cutover-hint').textContent =
          'Custom widgets cannot create SAC Calculation Input Controls. Create one in the story, or use Specific Date to pick a Date dimension member.'
      })
      this._renderRules()
    }

    _renderRules () {
      const host = this._shadowRoot.getElementById('rules')
      host.innerHTML = ''
      this._rules.forEach((rule, index) => {
        const wrap = document.createElement('div')
        wrap.className = 'rule'
        wrap.innerHTML = `
          <div class="rule-head">
            <button type="button" data-act="up" data-i="${index}">↑</button>
            <button type="button" data-act="down" data-i="${index}">↓</button>
            <input class="name" data-field="name" data-i="${index}" value="" />
            <button type="button" data-act="del" data-i="${index}">✕</button>
          </div>
          <label>Applies to</label>
          <select data-field="target" data-i="${index}">
            <option value="editable">Editable</option>
            <option value="readonly">Read-only</option>
            <option value="readonly-account">Read-only accounts</option>
            <option value="dimension">Dimension cells</option>
            <option value="all">All cells</option>
          </select>
          <div class="row">
            <div>
              <label>Background</label>
              <input data-field="background" data-i="${index}" type="text" placeholder="#ffffff" />
            </div>
            <div>
              <label>Font color</label>
              <input data-field="color" data-i="${index}" type="text" placeholder="#32363A" />
            </div>
          </div>
        `
        wrap.querySelector('[data-field="name"]').value = rule.name || ''
        wrap.querySelector('[data-field="target"]').value = rule.target || 'editable'
        wrap.querySelector('[data-field="background"]').value = rule.background || ''
        wrap.querySelector('[data-field="color"]').value = rule.color || ''
        wrap.addEventListener('click', event => {
          const btn = event.target.closest('button')
          if (!btn) {
            return
          }
          const i = Number(btn.getAttribute('data-i'))
          const act = btn.getAttribute('data-act')
          if (act === 'del') {
            this._rules.splice(i, 1)
            this._renderRules()
          } else if (act === 'up' && i > 0) {
            const swap = this._rules[i - 1]
            this._rules[i - 1] = this._rules[i]
            this._rules[i] = swap
            this._renderRules()
          } else if (act === 'down' && i < this._rules.length - 1) {
            const swap = this._rules[i + 1]
            this._rules[i + 1] = this._rules[i]
            this._rules[i] = swap
            this._renderRules()
          }
        })
        wrap.addEventListener('change', event => {
          const field = event.target.getAttribute('data-field')
          const i = Number(event.target.getAttribute('data-i'))
          if (field && this._rules[i]) {
            this._rules[i][field] = event.target.value
          }
        })
        host.appendChild(wrap)
      })
    }

    _val (id) {
      const el = this._shadowRoot.getElementById(id)
      return el ? el.value : ''
    }

    _toggleForecast () {
      const isForecast = this._val('tableType') === 'Forecast'
      this._shadowRoot.getElementById('forecast-panel').classList.toggle('hidden', !isForecast)
    }

    _fillMemberSelect (select, items, current) {
      if (!select) {
        return
      }
      select.innerHTML = ''
      const seen = new Set()
      ;(items || []).forEach(item => {
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
    }

    _renderExtra () {
      const host = this._shadowRoot.getElementById('extra-versions')
      if (!host) {
        return
      }
      host.innerHTML = ''
      const deltaItems = [{ id: 'Forecast Layout', name: 'Forecast Layout' }].concat(this._versions || [])
      this._draftExtra.forEach((row, index) => {
        const item = row && typeof row === 'object' ? row : { version: String(row || ''), deltaBasedOn: 'Forecast Layout' }
        const wrap = document.createElement('div')
        wrap.className = 'extra-row'
        const versionSelect = document.createElement('select')
        this._fillMemberSelect(versionSelect, this._versions, item.version)
        versionSelect.addEventListener('change', () => {
          this._draftExtra[index].version = versionSelect.value
          this._forecastDirty = true
        })
        const deltaSelect = document.createElement('select')
        this._fillMemberSelect(deltaSelect, deltaItems, item.deltaBasedOn || 'Forecast Layout')
        deltaSelect.addEventListener('change', () => {
          this._draftExtra[index].deltaBasedOn = deltaSelect.value
          this._forecastDirty = true
        })
        const del = document.createElement('button')
        del.type = 'button'
        del.className = 'x'
        del.textContent = '×'
        del.title = 'Remove version'
        del.addEventListener('click', () => {
          this._draftExtra.splice(index, 1)
          this._renderExtra()
          this._forecastDirty = true
        })
        wrap.appendChild(versionSelect)
        wrap.appendChild(deltaSelect)
        wrap.appendChild(del)
        host.appendChild(wrap)
      })
    }

    _todayLabel () {
      const now = new Date()
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return 'Today (' + months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear() + ')'
    }

    _resolvedCutOverMode () {
      const stored = String(this.cutOverMode || '')
      if (stored === 'Today' || stored === 'SpecificDate' || stored === 'LastBooked') {
        return stored
      }
      const date = String(this.cutOverDate || '')
      if (/last booked/i.test(date)) {
        return 'LastBooked'
      }
      if (date && !/^today/i.test(date) && !/^current period/i.test(date)) {
        return 'SpecificDate'
      }
      return 'Today'
    }

    _syncCutOverUi () {
      const modeEl = this._shadowRoot.getElementById('cutOverMode')
      if (!modeEl) {
        return
      }
      const todayOpt = modeEl.querySelector('option[value="Today"]')
      if (todayOpt) {
        todayOpt.textContent = this._todayLabel()
      }
      const wrap = this._shadowRoot.getElementById('specific-date-wrap')
      if (wrap) {
        wrap.classList.toggle('hidden', modeEl.value !== 'SpecificDate')
      }
      const hint = this._shadowRoot.getElementById('cutover-hint')
      if (!hint) {
        return
      }
      if (modeEl.value === 'LastBooked') {
        hint.textContent = 'Uses the latest Date member in the bound result set for the Look Back (Actuals) version.'
      } else if (modeEl.value === 'SpecificDate') {
        hint.textContent = (this._dates || []).length
          ? 'Choose a member from the Date dimension of the selected model.'
          : 'Bind a Date dimension in Builder so members appear here.'
      } else {
        hint.textContent = ''
      }
    }

    _dimSearch (dim) {
      return [dim && dim.id, dim && dim.description, dim && dim.label, dim && dim.key].filter(Boolean).join(' ').toLowerCase()
    }

    _bindingDims () {
      const binding = this.dataBinding || {}
      const dims = ((binding.metadata || {}).dimensions) || {}
      return Object.keys(dims).map(key => Object.assign({ key, id: dims[key] && dims[key].id ? dims[key].id : key }, dims[key]))
    }

    _normalizeMember (item) {
      if (!item) {
        return null
      }
      if (typeof item === 'string') {
        return { id: item, name: item }
      }
      const id = item.id || item.Id || item.memberId
      if (id == null || id === '') {
        return null
      }
      return { id: String(id), name: String(item.description || item.label || item.name || id) }
    }

    _mergeMembers (base, extra) {
      const seen = new Map()
      ;(base || []).concat(extra || []).forEach(item => {
        const normalized = this._normalizeMember(item)
        if (!normalized) {
          return
        }
        if (!seen.has(normalized.id)) {
          seen.set(normalized.id, normalized)
        }
      })
      return Array.from(seen.values())
    }

    _membersFromData (dim) {
      const data = (this.dataBinding && this.dataBinding.data) || []
      const seen = new Map()
      data.forEach(row => {
        const cell = (row && (row[dim.key] || row[dim.id])) || {}
        const id = cell.id != null ? cell.id : (typeof cell === 'string' ? cell : '')
        if (!id) {
          return
        }
        const name = cell.label || cell.description || String(id)
        if (!seen.has(String(id))) {
          seen.set(String(id), { id: String(id), name: String(name) })
        }
      })
      return Array.from(seen.values())
    }

    _loadMembersFromDataSource (dimensionId) {
      try {
        const getBinding = this.dataBindings && this.dataBindings.getDataBinding
        const binding = getBinding ? this.dataBindings.getDataBinding('dataBinding') : null
        const ds = binding && binding.getDataSource && binding.getDataSource()
        if (!ds || typeof ds.getMembers !== 'function') {
          return Promise.resolve([])
        }
        return Promise.resolve(ds.getMembers(dimensionId)).then(members => {
          return (members || []).map(item => this._normalizeMember(item)).filter(Boolean)
        }).catch(() => [])
      } catch (ignore) {
        return Promise.resolve([])
      }
    }

    _refreshForecastSelects () {
      this._fillMemberSelect(this._shadowRoot.getElementById('lookBackOn'), this._versions, this.lookBackOn || this._val('lookBackOn') || 'Actual')
      this._fillMemberSelect(this._shadowRoot.getElementById('lookAheadOn'), this._versions, this.lookAheadOn || this._val('lookAheadOn') || 'EPMplusA')
      this._fillMemberSelect(this._shadowRoot.getElementById('specificDate'), this._dates, this.cutOverDate || this._val('specificDate'))
      this._renderExtra()
      this._syncCutOverUi()
    }

    _loadModelCatalog () {
      const fallbackVersions = [
        { id: 'Actual', name: 'Actual' },
        { id: 'EPMplusA', name: 'EPMplusA' },
        { id: 'Budget', name: 'Budget' },
        { id: 'Forecast', name: 'Forecast' },
        { id: 'BDG', name: 'BDG' }
      ]
      const dims = this._bindingDims()
      const versionDim = dims.find(dim => /version/.test(this._dimSearch(dim)))
      const dateDim = dims.find(dim => /date|time|month|period|year|calmonth|fiscal/.test(this._dimSearch(dim)))
      this._versions = this._mergeMembers(fallbackVersions, versionDim ? this._membersFromData(versionDim) : [])
      this._dates = dateDim ? this._membersFromData(dateDim) : (this._dates || [])
      this._refreshForecastSelects()
      const versionId = versionDim && (versionDim.id || versionDim.key)
      const dateId = dateDim && (dateDim.id || dateDim.key)
      Promise.all([
        versionId ? this._loadMembersFromDataSource(versionId) : Promise.resolve([]),
        dateId ? this._loadMembersFromDataSource(dateId) : Promise.resolve([])
      ]).then(results => {
        const versions = results[0]
        const dates = results[1]
        if (versions && versions.length) {
          this._versions = this._mergeMembers(this._versions, versions)
        }
        if (dates && dates.length) {
          this._dates = this._mergeMembers(this._dates, dates)
        }
        this._refreshForecastSelects()
      })
    }

    _parseExtra (json) {
      try {
        const parsed = JSON.parse(json || '[]')
        if (!Array.isArray(parsed)) {
          return []
        }
        return parsed.map(item => {
          if (item && typeof item === 'object') {
            return {
              version: String(item.version || item.id || ''),
              deltaBasedOn: String(item.deltaBasedOn || 'Forecast Layout')
            }
          }
          return { version: String(item || ''), deltaBasedOn: 'Forecast Layout' }
        }).filter(item => item.version)
      } catch (ignore) {
        return []
      }
    }

    _resolvedUiTableType () {
      const raw = this._uiTableType || this.tableType || this._val('tableType') || 'Cross-Tab'
      return /forecast/i.test(String(raw)) && !/cross[- ]?tab/i.test(String(raw)) ? 'Forecast' : 'Cross-Tab'
    }

    _loadTableType () {
      const type = this._resolvedUiTableType()
      const select = this._shadowRoot.getElementById('tableType')
      if (select) {
        select.value = type
      }
      this._uiTableType = type
      if (this._forecastDirty && type === 'Forecast') {
        this._toggleForecast()
        return
      }
      const setIf = (id, value) => {
        if (value != null && this._shadowRoot.getElementById(id)) {
          this._shadowRoot.getElementById(id).value = String(value)
        }
      }
      setIf('cutOverMode', this._resolvedCutOverMode())
      setIf('timeframeType', this.timeframeType || 'Forecast')
      setIf('timeframeGranularity', this.timeframeGranularity || 'Month')
      setIf('timeframeRange', this.timeframeRange || 'Year')
      setIf('lookBackAdditional', this.lookBackAdditional == null ? 0 : this.lookBackAdditional)
      setIf('lookBackAdditionalUnit', this.lookBackAdditionalUnit || 'Year')
      setIf('lookAheadAdditional', this.lookAheadAdditional == null ? 0 : this.lookAheadAdditional)
      setIf('lookAheadAdditionalUnit', this.lookAheadAdditionalUnit || 'Year')
      setIf('sumFor', this.sumFor || 'Cut-Over Year')
      this._draftExtra = this._parseExtra(this.additionalVersionsJson || '[]')
      this._loadModelCatalog()
      this._toggleForecast()
    }

    _applyTableType () {
      const mode = this._val('cutOverMode') || 'Today'
      const cutOverDate = mode === 'SpecificDate'
        ? (this._val('specificDate') || this.cutOverDate || '')
        : (mode === 'LastBooked' ? 'LastBooked' : 'Today')
      this.dispatchEvent(new CustomEvent('propertiesChanged', {
        detail: {
          properties: {
            tableType: this._uiTableType || this._val('tableType'),
            lookBackOn: this._val('lookBackOn'),
            lookAheadOn: this._val('lookAheadOn'),
            cutOverMode: mode,
            cutOverDate: cutOverDate,
            timeframeType: this._val('timeframeType'),
            timeframeGranularity: this._val('timeframeGranularity'),
            timeframeRange: this._val('timeframeRange'),
            lookBackAdditional: Number(this._val('lookBackAdditional') || 0),
            lookBackAdditionalUnit: this._val('lookBackAdditionalUnit'),
            lookAheadAdditional: Number(this._val('lookAheadAdditional') || 0),
            lookAheadAdditionalUnit: this._val('lookAheadAdditionalUnit'),
            sumFor: this._val('sumFor'),
            additionalVersionsJson: JSON.stringify((this._draftExtra || []).filter(item => item && item.version))
          }
        }
      }))
    }

    _columnDimensionValue () {
      const mode = this._val('columnDimension')
      if (mode !== 'Checked') {
        return mode
      }
      const checked = []
      this._shadowRoot.querySelectorAll('#column-dim-list input[data-col-dim]:checked').forEach(input => {
        checked.push(input.getAttribute('data-col-dim'))
      })
      return checked.length ? checked.join(',') : 'None'
    }

    _renderColumnDimList (binding, selected) {
      const host = this._shadowRoot.getElementById('column-dim-list')
      if (!host) {
        return
      }
      const dims = (((binding || {}).metadata || {}).dimensions) || {}
      const keys = Object.keys(dims)
      if (!keys.length) {
        host.innerHTML = '<p class="hint">Bind dimensions in Builder first, then they appear here.</p>'
        return
      }
      const selectedParts = String(selected || '').split(',').map(part => part.trim().toLowerCase()).filter(Boolean)
      host.innerHTML = keys.map(key => {
        const dim = Object.assign({ key, id: key }, dims[key])
        const id = String(dim.id || key)
        const name = String(dim.description || dim.label || id)
        const isOn = selectedParts.indexOf(id.toLowerCase()) !== -1 ||
          selectedParts.indexOf(name.toLowerCase()) !== -1 ||
          selectedParts.indexOf(String(key).toLowerCase()) !== -1
        return '<label><input type="checkbox" data-col-dim="' + id.replace(/"/g, '&quot;') + '"' + (isOn ? ' checked' : '') + ' /> ' + name.replace(/</g, '&lt;') + '</label>'
      }).join('')
    }

    _apply () {
      const decimal = this._val('numberDecimalPlaces')
      this.dispatchEvent(new CustomEvent('propertiesChanged', {
        detail: {
          properties: {
            stylingRulesJson: JSON.stringify(this._rules),
            lineType: this._val('lineType'),
            lineWidth: Number(this._val('lineWidth')),
            lineColor: this._val('lineColor'),
            lineStyle: this._val('lineStyle'),
            leftPadding: Number(this._val('leftPadding')),
            rightPadding: Number(this._val('rightPadding')),
            fontFamily: this._val('fontFamily'),
            fontSize: Number(this._val('fontSize')),
            fontColor: this._val('fontColor'),
            fontStyle: this._val('fontStyle'),
            underline: this._shadowRoot.getElementById('underline').checked,
            strikethrough: this._shadowRoot.getElementById('strikethrough').checked,
            hAlign: this._val('hAlign'),
            vAlign: this._val('vAlign'),
            numberMeasureSelection: this._val('numberMeasureSelection'),
            numberScale: this._val('numberScale'),
            numberScaleFormat: this._val('numberScaleFormat'),
            numberDecimalPlaces: decimal,
            decimalPlaces: decimal === 'Default' ? 2 : Number(decimal),
            showSignAs: this._val('showSignAs'),
            headerBackground: this._val('headerBackground'),
            headerTextColor: this._val('headerTextColor'),
            changedCellColor: this._val('changedCellColor'),
            columnDimension: this._columnDimensionValue(),
            showTotals: this._shadowRoot.getElementById('showTotals').checked,
            showToolbar: this._shadowRoot.getElementById('showToolbar').checked,
            readOnly: this._shadowRoot.getElementById('readOnly').checked
          }
        }
      }))
    }

    onCustomWidgetAfterUpdate (changedProps) {
      const assign = (id, value) => {
        if (value === undefined) {
          return
        }
        const el = this._shadowRoot.getElementById(id)
        if (!el) {
          return
        }
        if (el.type === 'checkbox') {
          el.checked = !!value
        } else {
          el.value = value
        }
      }
      if (changedProps.stylingRulesJson) {
        try {
          const parsed = JSON.parse(changedProps.stylingRulesJson)
          if (Array.isArray(parsed) && parsed.length) {
            this._rules = parsed
            this._renderRules()
          }
        } catch (ignore) {}
      }
      assign('lineType', changedProps.lineType)
      assign('lineWidth', changedProps.lineWidth)
      assign('lineColor', changedProps.lineColor)
      assign('lineStyle', changedProps.lineStyle)
      assign('leftPadding', changedProps.leftPadding)
      assign('rightPadding', changedProps.rightPadding)
      assign('fontFamily', changedProps.fontFamily)
      assign('fontSize', changedProps.fontSize)
      assign('fontColor', changedProps.fontColor)
      assign('fontStyle', changedProps.fontStyle)
      assign('underline', changedProps.underline)
      assign('strikethrough', changedProps.strikethrough)
      assign('hAlign', changedProps.hAlign)
      assign('vAlign', changedProps.vAlign)
      assign('numberMeasureSelection', changedProps.numberMeasureSelection)
      assign('numberScale', changedProps.numberScale)
      assign('numberScaleFormat', changedProps.numberScaleFormat)
      assign('numberDecimalPlaces', changedProps.numberDecimalPlaces)
      assign('showSignAs', changedProps.showSignAs)
      assign('headerBackground', changedProps.headerBackground)
      assign('headerTextColor', changedProps.headerTextColor)
      assign('changedCellColor', changedProps.changedCellColor)
      const colMode = changedProps.columnDimension
      if (colMode && colMode !== 'Auto' && colMode !== 'None' && colMode !== 'Checked') {
        assign('columnDimension', 'Checked')
      } else {
        assign('columnDimension', colMode)
      }
      assign('showTotals', changedProps.showTotals)
      assign('showToolbar', changedProps.showToolbar)
      assign('readOnly', changedProps.readOnly)
      ;['tableType', 'lookBackOn', 'lookAheadOn', 'cutOverMode', 'cutOverDate', 'timeframeType', 'timeframeGranularity', 'timeframeRange', 'lookBackAdditional', 'lookBackAdditionalUnit', 'lookAheadAdditional', 'lookAheadAdditionalUnit', 'sumFor', 'additionalVersionsJson'].forEach(key => {
        if (changedProps && changedProps[key] !== undefined) {
          if (key === 'tableType') {
            const incoming = /forecast/i.test(String(changedProps.tableType)) && !/cross[- ]?tab/i.test(String(changedProps.tableType))
              ? 'Forecast'
              : 'Cross-Tab'
            if (this._uiTableType === 'Forecast' && incoming === 'Cross-Tab' && this._val('tableType') === 'Forecast') {
              return
            }
            this._uiTableType = incoming
            this.tableType = incoming
            return
          }
          this[key] = changedProps[key]
        }
      })
      const binding = (changedProps && changedProps.dataBinding) || this.dataBinding
      this._renderColumnDimList(binding, this.columnDimension || colMode)
      const keys = Object.keys(changedProps || {})
      const bindingOnly = keys.length > 0 && keys.every(key => key === 'dataBinding')
      if (bindingOnly) {
        this._loadModelCatalog()
        const select = this._shadowRoot.getElementById('tableType')
        if (select) {
          select.value = this._resolvedUiTableType()
        }
        this._toggleForecast()
        return
      }
      this._loadTableType()
    }
  }

  if (!customElements.get('com-sap-sac-sample-planning-table-styling-v13')) {
    customElements.define('com-sap-sac-sample-planning-table-styling-v13', Styling)
  }
})()
