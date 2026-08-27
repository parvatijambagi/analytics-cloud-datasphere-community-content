# Planning Table — download package

Download these two files and upload them in SAP Analytics Cloud **Custom Widgets**:

1. [PlanningTable.json](PlanningTable.json) — widget definition  
2. [PlanningTable.zip](PlanningTable.zip) — resource file (`main-v13.js` + `styling-v13.js` only)

Delete any older **Planning Table** widget first, then upload JSON + ZIP. After install the toolbar must show **v1.3.36**. Table Type lives in **Styling** (not a custom Builder). `main.js` and `styling.js` in this folder are source copies for inspection.

This package uses the native SAC Builder (same pattern as the other widgets in this repo). Builder wells: **Rows**, **Columns**, **Measures**.

Source and write-back notes: `../Planning Table with Styling Panel/README.md`
