# How to download the Planning Table widget (v1.3.8)

GitHub’s file preview page often shows **“Sorry, something went wrong. Reload?”** or **“not available”** for `.zip` files. That is a GitHub viewer limitation, not a missing file.

Use **Raw** links (these return HTTP 200), or download the two JavaScript files and zip them yourself.

## Option A — two files for SAC (recommended)

Right-click → **Save link as**:

1. Widget JSON  
   https://raw.githubusercontent.com/parvatijambagi/analytics-cloud-datasphere-community-content/cursor/stacked-column-headers-abca/PlanningTable.json

2. Resource ZIP (`main-v13.js` + `styling-v13.js` only)  
   https://raw.githubusercontent.com/parvatijambagi/analytics-cloud-datasphere-community-content/cursor/stacked-column-headers-abca/PlanningTable-resources.zip

If the ZIP still fails in the browser, use the gzip copy instead, then unzip it and re-zip the two JS files:

https://raw.githubusercontent.com/parvatijambagi/analytics-cloud-datasphere-community-content/cursor/stacked-column-headers-abca/PlanningTable-resources.tar.gz

## Option B — skip ZIP; download JS, then zip locally

1. Save these two files (GitHub **Raw** works for text):

   - https://raw.githubusercontent.com/parvatijambagi/analytics-cloud-datasphere-community-content/cursor/stacked-column-headers-abca/main-v13.js
   - https://raw.githubusercontent.com/parvatijambagi/analytics-cloud-datasphere-community-content/cursor/stacked-column-headers-abca/styling-v13.js

2. On your computer, put both files in one folder and create a zip **with those two names at the zip root** (not inside a subfolder):

   ```bash
   zip PlanningTable-resources.zip main-v13.js styling-v13.js
   ```

   Windows: select both files → right-click → **Compress to ZIP**. Then open the zip and confirm you see `main-v13.js` and `styling-v13.js` at the top level.

3. Upload `PlanningTable.json` + that ZIP in SAC **Custom Widgets**.

## Option C — whole-repo ZIP from GitHub

On the branch page click **Code → Download ZIP**. Then use:

- `PlanningTable.json` at the repo root
- `PlanningTable-resources.zip` at the repo root

## SAC install

Delete any older **Planning Table** custom widget, then upload JSON + resource ZIP. The widget toolbar should show **v1.3.8**.
