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
      label {
        display: block;
        margin-top: 14px;
        margin-bottom: 4px;
        color: #556b82;
        font-size: 12px;
      }
      label:first-child {
        margin-top: 0;
      }
      input[type="text"], input[type="number"] {
        width: 70%;
        height: 24px;
        box-sizing: border-box;
        font: inherit;
      }
      .checks {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 14px;
      }
      .checks label {
        margin: 0;
        color: #1d2d3e;
      }
      button {
        display: block;
        margin-top: 16px;
        font: inherit;
        padding: 4px 12px;
      }
    </style>
    <div id="root">
      <label for="headerBackground">Header background</label>
      <input id="headerBackground" type="text" placeholder="#0854A0" />

      <label for="headerTextColor">Header text color</label>
      <input id="headerTextColor" type="text" placeholder="#FFFFFF" />

      <label for="changedCellColor">Changed cell color</label>
      <input id="changedCellColor" type="text" placeholder="#FFF3B8" />

      <label for="fontSize">Font size (px)</label>
      <input id="fontSize" type="number" min="10" max="20" />

      <label for="decimalPlaces">Decimal places</label>
      <input id="decimalPlaces" type="number" min="0" max="6" />

      <div class="checks">
        <label><input id="showTotals" type="checkbox" /> Show totals row</label>
        <label><input id="showToolbar" type="checkbox" /> Show Submit / Revert toolbar</label>
        <label><input id="readOnly" type="checkbox" /> Read only</label>
      </div>

      <button id="apply">Apply</button>
    </div>
  `

  class Styling extends HTMLElement {
    constructor () {
      super()
      this._shadowRoot = this.attachShadow({ mode: 'open' })
      this._shadowRoot.appendChild(template.content.cloneNode(true))
      this._shadowRoot.getElementById('apply').addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('propertiesChanged', {
          detail: {
            properties: {
              headerBackground: this._shadowRoot.getElementById('headerBackground').value,
              headerTextColor: this._shadowRoot.getElementById('headerTextColor').value,
              changedCellColor: this._shadowRoot.getElementById('changedCellColor').value,
              fontSize: Number(this._shadowRoot.getElementById('fontSize').value),
              decimalPlaces: Number(this._shadowRoot.getElementById('decimalPlaces').value),
              showTotals: this._shadowRoot.getElementById('showTotals').checked,
              showToolbar: this._shadowRoot.getElementById('showToolbar').checked,
              readOnly: this._shadowRoot.getElementById('readOnly').checked
            }
          }
        }))
      })
    }

    onCustomWidgetAfterUpdate (changedProps) {
      const assign = (id, value) => {
        if (value === undefined) {
          return
        }
        const el = this._shadowRoot.getElementById(id)
        if (el.type === 'checkbox') {
          el.checked = !!value
        } else {
          el.value = value
        }
      }
      assign('headerBackground', changedProps.headerBackground)
      assign('headerTextColor', changedProps.headerTextColor)
      assign('changedCellColor', changedProps.changedCellColor)
      assign('fontSize', changedProps.fontSize)
      assign('decimalPlaces', changedProps.decimalPlaces)
      assign('showTotals', changedProps.showTotals)
      assign('showToolbar', changedProps.showToolbar)
      assign('readOnly', changedProps.readOnly)
    }
  }

  customElements.define('com-sap-sac-sample-planning-table-styling', Styling)
})()
