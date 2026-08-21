# Custom Planning Table

This sample is the planning-table counterpart to the custom chart widgets in this folder. It uses the same Optimized Story **data binding** feeds (dimensions + measures/accounts), renders an editable table, and exposes events so a story script can write values back to a planning model.

Custom widgets can **read** planning data through data binding. They cannot call `setUserInput` / `submitData` on their own. Persist edits with a hidden native planning table in the story, which is the supported SAC pattern.

## Files

| File | Role |
| --- | --- |
| `PlanningTable.json` | Widget contribution to upload in SAC |
| `PlanningTable.zip` | Resource archive (`main-v13.js` + `styling-v13.js`) prompted after the JSON |
| `index.json` | Same contribution as `PlanningTable.json` (source copy) |
| `main.js` | Editable planning table web component (packed in the ZIP as `main-v13.js`) |
| `styling.js` | Styling panel (packed in the ZIP as `styling-v13.js`) |

A copy without spaces in the path (easier to download from GitHub): `../planning-table-package/` (`PlanningTable.json` + `PlanningTable.zip`).

## Install (JSON + ZIP)

This is the SAC resource-upload flow. You do not host the JavaScript files yourself.

1. In SAP Analytics Cloud, open **Custom Widgets** (from the story or analytic application area; you need permission to add widgets).
2. Click **+** / **Upload** and select **`PlanningTable.json`**.
3. When SAC asks for the **resource file**, upload **`PlanningTable.zip`**.
4. Confirm the widget **Planning Table 1.3** appears in the list (this is a new widget id, not an in-place update of 1.2.x).
5. Open or create an **Optimized Story**, insert **Planning Table 1.3**, and in the Builder panel assign a **planning model**, then row dimensions and measures or accounts.

The ZIP must keep `main-v13.js` and `styling-v13.js` at the archive root. Those names match the relative URLs in the JSON.

If you change the JavaScript, rebuild the ZIP and refresh the SHA-256 `integrity` values in the JSON before uploading again.

**Re-upload JSON + ZIP** after this change (widget version **1.3.1**). After a correct install the toolbar shows **v1.3.1**. Dimensions added in **Columns** (Date, GL-Accounts, Version) stack under Measures as header rows, the same way as a native SAC table. Row dimensions such as ARE stay on the left. If Date / Version / GL-Accounts still appear as extra columns next to ARE, the previous ZIP is still loaded.

This widget uses the same **native SAC Builder** as the other samples in this repo (Sankey, Nested Pie, bar-gradient). A custom Builder panel would replace SAC’s dimension/measure inventory, so add/remove would not work. Native wells:

- **Rows** — dimensions such as ARE
- **Columns** — Date, Version, GL-Accounts (stacked header rows under Measures)
- **Measures** — measures or accounts

If **+ Add Dimension** on Columns does not keep a checkbox, the dimension is probably already on **Rows** (SAC will not put the same dimension on two wells). Remove it from Rows, then add it in Columns. If it still does not stick, open **Styling**, choose **Use checked dimensions below**, tick Date / Depthstructure, and Apply.

Drag items from the left-side list, or use **+ Add Dimension** / **+ Add Measure** on each well.

## If the widget says data binding failed

That message means SAC has not returned a successful result set yet. It is not a ZIP/JSON load failure (the widget is already running).

1. Confirm the story is **Optimized**.
2. Select the widget → **Builder** panel (left), not Styling.
3. Assign a model.
4. Drag **at least one dimension** into *Rows*.
5. Drag **at least one measure or account** into *Measures*. Add Date, GL-Accounts, and Version to *Columns* so they stack under Measures.
6. For planning models, add a **Version** filter (and Date/Time if the model requires it).
7. Compare with a native Table on the same model: if the native table is empty, the custom widget will be empty too.

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

Matches the native SAC table styling sections:

- **Styling Rules** — default list (Editable IHBs, Read-only Accounts IHB, Read-only IHB, ReadOnlyInternalAccounts, Editable, Read-only). Top rule wins. Set background and font color per rule; empty styles are skipped so lower rules can apply.
- **Lines** — simple line, weight, color, solid/dashed/dotted, left/right padding
- **Font** — Arial/72/Helvetica, size 14, color, bold/italic, underline, strikethrough, horizontal/vertical alignment
- **Number Format** — all measures, scale (thousand/million/billion/percent), scale suffix, decimal places, show sign as
- Header colors, changed-cell highlight, totals, toolbar, read-only

## Requirements

Optimized Story Experience (or Analytics Designer Optimized View Mode), same as the custom chart samples. Use a **planning-enabled** model if you need write-back through the hidden table.

## Notes

- Data binding is flat (no hierarchy drill in the custom widget result set).
- Do not add a custom Builder panel to this widget; that would replace the standard data-binding Builder.
- `setUserInput` only works on input-enabled, non-calculated cells whose members already exist.
- After a successful submit, refresh the widget data source so bound values replace the local highlight.
