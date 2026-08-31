# How to download the Planning Table widget (v1.3.40)

Do **not** use branch URLs that contain `cursor/stacked-column-headers-abca`.
GitHub and many browsers treat `cursor` as the branch name and then look for a file
`stacked-column-headers-abca/PlanningTable.json`, which returns **404**.

Use **commit** links below (no slash in the ref). Right-click → **Save link as**.

Pinned commit: `3dd92721aa07ad4d300047016118bd8d93c0ee02`

## Files for SAC Custom Widgets

1. Widget JSON  
   https://raw.githubusercontent.com/parvatijambagi/analytics-cloud-datasphere-community-content/3dd92721aa07ad4d300047016118bd8d93c0ee02/PlanningTable.json

2. Resource ZIP (`main-v13.js` + `styling-v13.js` at the zip root)  
   https://raw.githubusercontent.com/parvatijambagi/analytics-cloud-datasphere-community-content/3dd92721aa07ad4d300047016118bd8d93c0ee02/PlanningTable-resources.zip

jsDelivr mirrors (same commit):

- https://cdn.jsdelivr.net/gh/parvatijambagi/analytics-cloud-datasphere-community-content@3dd92721aa07ad4d300047016118bd8d93c0ee02/PlanningTable.json
- https://cdn.jsdelivr.net/gh/parvatijambagi/analytics-cloud-datasphere-community-content@3dd92721aa07ad4d300047016118bd8d93c0ee02/PlanningTable-resources.zip

## If GitHub/jsDelivr are blocked on your network

The same files are also attached directly in the chat as artifacts:
`PlanningTable_v1340.json` and `PlanningTable_v1340_resources.zip` (plus the
individual `main-v13_v1340.js` / `styling-v13_v1340.js` sources).

## If the ZIP still will not save

Download these two text files, then zip them **at the zip root** (no folder):

- https://raw.githubusercontent.com/parvatijambagi/analytics-cloud-datasphere-community-content/3dd92721aa07ad4d300047016118bd8d93c0ee02/main-v13.js
- https://raw.githubusercontent.com/parvatijambagi/analytics-cloud-datasphere-community-content/3dd92721aa07ad4d300047016118bd8d93c0ee02/styling-v13.js

```bash
zip PlanningTable-resources.zip main-v13.js styling-v13.js
```

## Whole-repo archive (always works on GitHub)

https://github.com/parvatijambagi/analytics-cloud-datasphere-community-content/archive/3dd92721aa07ad4d300047016118bd8d93c0ee02.zip

Then take `PlanningTable.json` and `PlanningTable-resources.zip` from the extracted folder.

## SAC install

In SAC go to **Custom Widgets** → **Add** → upload **JSON and ZIP as files from your computer**.
Do not paste a GitHub URL into SAC. The JSON uses `/main-v13.js` and `/styling-v13.js`,
which SAC resolves from the ZIP. Uploading JSON alone causes a **404** for those scripts.

Delete any older **Planning Table** widget first. After install the toolbar must show **v1.3.40**.
