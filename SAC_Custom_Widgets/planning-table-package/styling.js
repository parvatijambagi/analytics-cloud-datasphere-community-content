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
    </style>
    <div id="root">
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
        <option value="Auto">Auto (Version and Date)</option>
        <option value="None">None (all dimensions on rows)</option>
      </select>
      <p class="hint">If the Builder Columns well does not keep a dimension, add Version and Date in Rows. Auto still places them on columns, like the native table.</p>
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
      return this._shadowRoot.getElementById(id).value
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
            columnDimension: this._val('columnDimension'),
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
      assign('columnDimension', changedProps.columnDimension)
      assign('showTotals', changedProps.showTotals)
      assign('showToolbar', changedProps.showToolbar)
      assign('readOnly', changedProps.readOnly)
    }
  }

  customElements.define('com-sap-sac-sample-planning-table-styling', Styling)
})()
