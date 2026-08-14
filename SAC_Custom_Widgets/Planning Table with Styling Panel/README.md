# Custom Planning Table

This sample is the planning-table counterpart to the custom chart widgets in this folder. It uses the same Optimized Story **data binding** feeds (dimensions + measures/accounts), renders an editable table, and exposes events so a story script can write values back to a planning model.

Custom widgets can **read** planning data through data binding. They cannot call `setUserInput` / `submitData` on their own. Persist edits with a hidden native planning table in the story, which is the supported SAC pattern.

## Files

| File | Role |
| --- | --- |
| `index.json` | Widget contribution (data binding, properties, methods, events) |
| `main.js` | Editable planning table web component |
| `styling.js` | Styling panel (colors, decimals, totals, read-only) |

## Install

1. Host `main.js` and `styling.js` (GitHub Pages, SAP BTP, or another HTTPS host).
2. In `index.json`, set each `webcomponents.url` to the hosted path (for example `https://your-host/.../main.js`).
3. In SAP Analytics Cloud, go to **Stories → Custom Widgets** (or **Analytic Applications → Custom Widgets**) and upload `index.json`.
4. Add **Planning Table** to an Optimized Story. In the Builder panel, assign a **planning model**, then add row dimensions and measures or accounts.

See [hosting custom widget resources](https://community.sap.com/t5/technology-blogs-by-sap/hosting-and-uploading-custom-widgets-resource-files-into-sap-analytics/ba-p/13563064).

## Story setup for write-back

1. Add this custom widget and bind it to the planning model.
2. Add a native **Table** on the same model, with the same dimensions in the drill (unbooked members as needed). Hide that table if you only need it as a technical write-back target.
3. Use the widget events below.

### Write one cell as soon as it is edited

`PlanningTable_1.onCellChange`:

```javascript
var change = PlanningTable_1.getLastChange();
var ok = Table_1.getPlanning().setUserInput({}, change.newValue);
if (ok) {
    Table_1.getPlanning().submitData();
}
```

Replace `{}` with a selection that matches a visible, input-enabled cell in `Table_1`. `change.selectionJson` is a JSON object of `dimensionId → memberId` (and the measure/account id). `change.dimensionMemberIds` is the same mapping as `DimensionId=MemberId;DimensionId=MemberId` if you need to build the selection without `JSON.parse`.

Example when the hidden table already shows the edited intersection (the empty selection updates the current cell context only if the table has a single matching cell):

```javascript
var change = PlanningTable_1.getLastChange();
Table_1.getPlanning().setUserInput({"Account": change.measureId}, change.newValue);
Table_1.getPlanning().submitData();
```

### Submit all unpublished edits at once

Use the widget **Submit** button (or `PlanningTable_1.submitChanges()`), then in `PlanningTable_1.onSubmit` loop `getPendingChanges()` / apply `setUserInput` for each cell / call `submitData()` once.

**Revert** discards local edits only. Call `Table_1.getPlanning().revertData()` in `onRevert` if the native table already has unpublished input.

## Methods and events

| Method / event | Purpose |
| --- | --- |
| `getLastChange()` | Last cell edit (`measureId`, `newValue`, `selectionJson`, …) |
| `getPendingChanges()` | JSON string of unpublished edits |
| `getPendingChangeCount()` | Number of unpublished edits |
| `submitChanges()` / `onSubmit` | Ask the story to persist edits |
| `revertChanges()` / `onRevert` | Drop local edits |
| `setReadOnly(value)` | Lock or unlock cells |
| `getDataSource()` | Data source of the widget binding (filters, variables) |

## Styling panel

- Header background and text color
- Changed-cell highlight (default planning yellow `#FFF3B8`)
- Font size and decimal places
- Totals row, toolbar, and read-only

## Requirements

Optimized Story Experience (or Analytics Designer Optimized View Mode), same as the custom chart samples. Use a **planning-enabled** model if you need write-back through the hidden table.

## Notes

- Data binding is flat (no hierarchy drill in the custom widget result set).
- Do not add a custom Builder panel to this widget; that would replace the standard data-binding Builder.
- `setUserInput` only works on input-enabled, non-calculated cells whose members already exist.
- After a successful submit, refresh the widget data source so bound values replace the local highlight.
